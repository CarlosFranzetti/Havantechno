/* Recut analysis - fit.js
 * Global `Analysis.fit`: fitting by synthesis (strategy step C1, Selector Crew T3, 27 November 2026). Given a short,
 * clean, solo excerpt and its events (onsets, pitches, lengths, velocities: from the truth on the app's own renders
 * here, from the Importer's notes later), it shortlists the app's instruments, renders each candidate on the same
 * events, searches its parameters to match the excerpt, decides per-step event flags (the 303's slide and accent) by
 * rendering both ways, and reports the best instrument with every fitted parameter as an interval, plus the runner-up
 * instrument and its distance.
 *
 * Plain ES5, no imports; loads in the browser (window) and in Node (globalThis). Needs Analysis.dsp. Rendering is not
 * done here: the caller passes an environment `env` with
 *   env.candidates()                  -> [{type, family: 'pitched' | 'unpitched', flags: ['slide', 'accent', ...]}]
 *   env.spec(type)                    -> the instrument's spec object, read at run time ({min, max, value, options})
 *   env.render(type, params, events, secs) -> Promise of a Float32Array (mono, env.sr)
 * `Analysis.fit.pageEnv(o)` builds that environment in a page that loaded the engine (Synths, Drums, Classics,
 * Worklets): every render is an OfflineAudioContext with Math.random reseeded, the instrument straight to the
 * destination (no channel strip, no master).
 *
 * Search (S3 P5, docs/research/2026-11-21-stem-crew/transcripts/S3-detection.md): discrete rows (spec rows with
 * `options`, or boolean values) are enumerated one row at a time; continuous rows are screened by one render each and
 * the most sensitive (up to `maxRows`) are searched with a separable CMA-ES in [0, 1] coordinates (log for wide
 * positive ranges) on a render budget; event flags are decided per note by rendering each combination and comparing a
 * local loss around the note. Loss: multi-resolution STFT log-magnitude distance (dB, mean absolute) plus a 5 ms
 * loudness-envelope distance (dB), after matching RMS levels, so the `level` row is not fitted (reported as a gain).
 * Intervals: every value of a row, over all renders with the final switches and flags, whose loss is within `tol` of
 * the best, widened by a one-row bisection from the best point on each side. A row that was not searched reports its
 * whole range ("not identified"). Nothing here has been compared with a real instrument: in-domain only.
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var A = root.Analysis = root.Analysis || {};
  var D = A.dsp;
  if (!D) throw new Error('Analysis.fit: load dsp.js first');

  var DEFAULTS = {
    sizes: [512, 2048],       // STFT sizes (hop = size / 2)
    envMs: 5,                 // loudness envelope window
    floorDb: 80,              // magnitudes floored this far under the excerpt's loudest bin
    envWeight: 1,             // weight of the envelope distance against the mean of the STFT distances
    maxRows: 8,               // continuous rows searched per candidate
    generations: 12,          // CMA-ES generations per candidate
    polishGenerations: 5,     // after switches or flags changed
    sigma: 0.25,              // CMA-ES initial step in [0, 1] coordinates
    shortlist: 3,             // candidates fitted
    tol: 0.25,                // interval threshold: loss within best + tol (dB) ...
    tolRel: 0.10,             // ... or best x (1 + tolRel), whichever is larger
    bisect: 6,                // points per side for each row's interval
    seed: 1
  };
  function opt(o, k) { return o && o[k] != null ? o[k] : DEFAULTS[k]; }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function keys(o) { var k = [], p; for (p in o) if (o.hasOwnProperty(p)) k.push(p); return k; }
  function copy(o) { var r = {}, p; for (p in o) if (o.hasOwnProperty(p)) r[p] = o[p]; return r; }
  function round(v, d) { var m = Math.pow(10, d == null ? 4 : d); return Math.round(v * m) / m; }

  // ------------------------------------------------------------------ parameter space, read from the spec at run time
  // continuous: numeric value with numeric min < max and no options; discrete: `options`, or a boolean value; held:
  // everything else (strings without options, `level`, which the level match replaces, and a `seed` row if any).
  function space(spec) {
    var S = { cont: [], disc: [], held: [] };
    keys(spec || {}).forEach(function (name) {
      var r = spec[name];
      if (!r || typeof r !== 'object') return;
      if (name === 'level' || name === 'seed') { S.held.push({ name: name, value: r.value, why: name === 'level' ? 'levels are matched, not fitted' : 'a seed, not a sound' }); return; }
      if (r.options && r.options.length > 1) { S.disc.push({ name: name, options: r.options.slice(), def: r.value }); return; }
      if (typeof r.value === 'boolean') { S.disc.push({ name: name, options: [false, true], def: r.value }); return; }
      if (typeof r.value === 'number' && typeof r.min === 'number' && typeof r.max === 'number' && r.max > r.min) {
        var lg = r.min > 0 && r.max / r.min >= 10;
        S.cont.push({ name: name, min: r.min, max: r.max, log: lg, def: r.value, unit: r.unit || '' });
        return;
      }
      S.held.push({ name: name, value: r.value, why: 'no options to enumerate' });
    });
    return S;
  }
  function toU(row, v) { v = clamp(v, row.min, row.max); return row.log ? Math.log(v / row.min) / Math.log(row.max / row.min) : (v - row.min) / (row.max - row.min); }
  function fromU(row, u) { u = clamp(u, 0, 1); return row.log ? row.min * Math.pow(row.max / row.min, u) : row.min + u * (row.max - row.min); }

  // ------------------------------------------------------------------ loss
  var WIN = {};
  function hann(n) { if (WIN[n]) return WIN[n]; var w = new Float64Array(n), i; for (i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n); WIN[n] = w; return w; }
  // dB magnitudes, frames x (size/2) bins, frame k centred at k * hop
  function stft(x, size) {
    var hop = size >> 1, nb = size >> 1, nf = Math.max(1, Math.ceil(x.length / hop) + 1), out = new Float32Array(nf * nb), w = hann(size), re = new Float64Array(size), im = new Float64Array(size), k, i, a;
    for (k = 0; k < nf; k++) {
      a = k * hop - (size >> 1);
      for (i = 0; i < size; i++) { var j = a + i; re[i] = (j >= 0 && j < x.length) ? x[j] * w[i] : 0; im[i] = 0; }
      D.fft(re, im, false);
      for (i = 0; i < nb; i++) out[k * nb + i] = 10 * Math.log10(re[i] * re[i] + im[i] * im[i] + 1e-20);
    }
    return { db: out, nf: nf, nb: nb, hop: hop, size: size };
  }
  function envDb(x, sr, ms) { return D.toDb(D.env(x, ms, sr)); }
  function rms(x) { var s = 0, i; for (i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, x.length)); }
  function scaled(x, g) { var y = new Float64Array(x.length), i; for (i = 0; i < x.length; i++) y[i] = x[i] * g; return y; }
  // prepared target: its spectra, envelope, level and floors
  function target(x, sr, o) {
    var r = rms(x) || 1e-12, y = scaled(x, 1 / r), T = { sr: sr, n: x.length, rms: r, specs: [], env: null, o: o || {} };
    opt(o, 'sizes').forEach(function (s) {
      var S = stft(y, s), mx = -Infinity, i;
      for (i = 0; i < S.db.length; i++) if (S.db[i] > mx) mx = S.db[i];
      S.floor = mx - opt(o, 'floorDb');
      for (i = 0; i < S.db.length; i++) if (S.db[i] < S.floor) S.db[i] = S.floor;
      T.specs.push(S);
    });
    var e = envDb(y, sr, opt(o, 'envMs')), emx = -Infinity, k;
    for (k = 0; k < e.length; k++) if (e[k] > emx) emx = e[k];
    T.envFloor = emx - 60;
    for (k = 0; k < e.length; k++) if (e[k] < T.envFloor) e[k] = T.envFloor;
    T.env = e;
    return T;
  }
  // the distance of a candidate render y to target T, over the whole excerpt or the window [t0, t1] seconds
  function lossParts(T, y, t0, t1) {
    var r = rms(y), g = r > 0 ? 1 / r : 1, z = new Float64Array(T.n), i, k, b;
    for (i = 0; i < T.n && i < y.length; i++) z[i] = y[i] * g;
    var a0 = t0 == null ? 0 : Math.max(0, Math.floor(t0 * T.sr)), a1 = t1 == null ? T.n : Math.min(T.n, Math.ceil(t1 * T.sr)), parts = [];
    T.specs.forEach(function (S) {
      var Y = stft(z, S.size), s = 0, c = 0, k0 = Math.max(0, Math.floor(a0 / S.hop)), k1 = Math.min(S.nf, Math.ceil(a1 / S.hop) + 1);
      for (k = k0; k < k1; k++) for (b = 0; b < S.nb; b++) { var v = Y.db[k * S.nb + b]; if (v < S.floor) v = S.floor; s += Math.abs(v - S.db[k * S.nb + b]); c++; }
      parts.push(c ? s / c : 0);
    });
    var e = envDb(z, T.sr, opt(T.o, 'envMs')), se = 0, ce = 0, step = Math.max(1, Math.round(T.sr * 0.001));
    for (i = a0; i < a1; i += step) { var v2 = e[i] < T.envFloor ? T.envFloor : e[i]; se += Math.abs(v2 - T.env[i]); ce++; }
    var spec = 0; parts.forEach(function (p) { spec += p; }); spec /= parts.length || 1;
    var envD = ce ? se / ce : 0, w = opt(T.o, 'envWeight');
    return { loss: (spec + w * envD) / (1 + w), spec: parts, env: envD, gainDb: 20 * Math.log10((T.rms + 1e-30) / (r + 1e-30)) };
  }
  function loss(T, y, t0, t1) { return lossParts(T, y, t0, t1).loss; }

  // ------------------------------------------------------------------ separable CMA-ES on [0,1]^n (repair by clamping)
  // f(xs) -> Promise of losses for a whole population (rendered in parallel by the caller)
  function gauss(rnd) { var u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function cmaes(f, x0, o) {
    var n = x0.length, rnd = D.rng((o && o.seed) || 1), lam = (o && o.lambda) || (4 + Math.floor(3 * Math.log(n))), mu = Math.floor(lam / 2), i, j, g;
    var w = [], ws = 0; for (i = 0; i < mu; i++) { w.push(Math.log(mu + 0.5) - Math.log(i + 1)); ws += w[i]; }
    var w2 = 0; for (i = 0; i < mu; i++) { w[i] /= ws; w2 += w[i] * w[i]; }
    var meff = 1 / w2, cs = (meff + 2) / (n + meff + 5), ds = 1 + 2 * Math.max(0, Math.sqrt((meff - 1) / (n + 1)) - 1) + cs;
    var cc = (4 + meff / n) / (n + 4 + 2 * meff / n), c1 = 2 / ((n + 1.3) * (n + 1.3) + meff), cmu = Math.min(1 - c1, 2 * (meff - 2 + 1 / meff) / ((n + 2) * (n + 2) + meff));
    var sep = (n + 2) / 3; c1 = Math.min(1, c1 * sep); cmu = Math.min(1 - c1, cmu * sep);
    var chiN = Math.sqrt(n) * (1 - 1 / (4 * n) + 1 / (21 * n * n));
    var m = x0.slice(), sigma = (o && o.sigma) || DEFAULTS.sigma, C = [], ps = [], pc = [];
    for (i = 0; i < n; i++) { C.push(1); ps.push(0); pc.push(0); }
    var best = { x: x0.slice(), f: (o && o.f0 != null) ? o.f0 : Infinity }, gens = (o && o.generations) || DEFAULTS.generations, evals = 0;
    function gen(gi) {
      if (gi >= gens) return Promise.resolve();
      var Z = [], X = [];
      for (j = 0; j < lam; j++) {
        var z = [], x = [];
        for (i = 0; i < n; i++) { z.push(gauss(rnd)); x.push(clamp(m[i] + sigma * Math.sqrt(C[i]) * z[i], 0, 1)); }
        Z.push(z); X.push(x);
      }
      return f(X).then(function (F) {
        evals += F.length;
        var idx = F.map(function (v, k) { return k; }).sort(function (a, b) { return F[a] - F[b]; });
        if (F[idx[0]] < best.f) best = { x: X[idx[0]].slice(), f: F[idx[0]] };
        var old = m.slice(), yw = [], k2;
        for (i = 0; i < n; i++) { var s = 0; for (k2 = 0; k2 < mu; k2++) s += w[k2] * X[idx[k2]][i]; m[i] = s; yw.push((m[i] - old[i]) / sigma); }
        var nps = 0;
        for (i = 0; i < n; i++) { ps[i] = (1 - cs) * ps[i] + Math.sqrt(cs * (2 - cs) * meff) * yw[i] / Math.sqrt(C[i]); nps += ps[i] * ps[i]; }
        nps = Math.sqrt(nps);
        var hs = nps / Math.sqrt(1 - Math.pow(1 - cs, 2 * (gi + 1))) < (1.4 + 2 / (n + 1)) * chiN ? 1 : 0;
        for (i = 0; i < n; i++) {
          pc[i] = (1 - cc) * pc[i] + hs * Math.sqrt(cc * (2 - cc) * meff) * yw[i];
          var r = 0; for (k2 = 0; k2 < mu; k2++) { var yi = (X[idx[k2]][i] - old[i]) / sigma; r += w[k2] * yi * yi; }
          C[i] = (1 - c1 - cmu) * C[i] + c1 * (pc[i] * pc[i] + (1 - hs) * cc * (2 - cc) * C[i]) + cmu * r;
          C[i] = clamp(C[i], 1e-8, 4);
        }
        sigma = clamp(sigma * Math.exp((cs / ds) * (nps / chiN - 1)), 1e-4, 0.6);
        return gen(gi + 1);
      });
    }
    return gen(0).then(function () { return { x: best.x, f: best.f, evals: evals, sigma: sigma, mean: m }; });
  }

  // ------------------------------------------------------------------ one candidate
  // state: {disc: {name: value}, u: {name: [0,1]}, flags: [{slide, accent} per event]}
  function paramsOf(S, st) {
    var p = {};
    S.cont.forEach(function (r) { p[r.name] = fromU(r, st.u[r.name]); });
    S.disc.forEach(function (r) { p[r.name] = st.disc[r.name]; });
    return p;
  }
  function eventsOf(events, flags) {
    return events.map(function (e, i) { var x = copy(e); delete x.slide; delete x.accent; if (flags && flags[i]) { if (flags[i].slide) x.slide = true; if (flags[i].accent) x.accent = true; } return x; });
  }
  function sig(st) { return JSON.stringify(st.disc) + '|' + JSON.stringify(st.flags); }
  function evEnd(e) { return e.t + (e.dur || 0.1); }

  function fitCandidate(env, T, cand, events, secs, o) {
    var S = space(env.spec(cand.type)), st = { disc: {}, u: {}, flags: events.map(function () { return {}; }) }, log = [], renders = 0, t0 = Date.now();
    S.cont.forEach(function (r) { st.u[r.name] = toU(r, r.def); });
    S.disc.forEach(function (r) { st.disc[r.name] = r.def; });
    var flagNames = (cand.flags || []).slice();
    // evaluate a list of states; renders in parallel; every result kept for the intervals
    // win [t0, t1]: a local loss; the render stops at t1 and leaves out the events after it (earlier ones stay: the
    // instrument's state, such as the 303's accent memory, depends on them)
    function evalStates(list, win) {
      renders += list.length;
      return Promise.all(list.map(function (s) {
        var ev = eventsOf(events, s.flags), len = secs;
        if (win) { ev = ev.filter(function (e) { return e.t < win[1]; }); len = Math.min(secs, win[1] + 0.02); }
        return env.render(cand.type, paramsOf(S, s), ev, len);
      })).then(function (ys) {
        return ys.map(function (y, i) {
          var L = win ? loss(T, y, win[0], win[1]) : loss(T, y);
          if (!win) log.push({ sig: sig(list[i]), u: copy(list[i].u), f: L });
          return L;
        });
      });
    }
    function clone(s) { return { disc: copy(s.disc), u: copy(s.u), flags: s.flags.map(copy) }; }
    var cur = Infinity;
    function discretePass() {
      var chain = Promise.resolve();
      S.disc.forEach(function (r) {
        chain = chain.then(function () {
          var alts = r.options.filter(function (v) { return v !== st.disc[r.name]; }).map(function (v) { var s = clone(st); s.disc[r.name] = v; return s; });
          return evalStates(alts).then(function (F) { F.forEach(function (f, i) { if (f < cur - 1e-9) { cur = f; st = alts[i]; } }); });
        });
      });
      return chain;
    }
    // per-note flags: every combination of the instrument's flags on note i, judged on a window from the note's onset to
    // the end of the next note (a slide changes the next note), with the other notes' flags held. Notes are taken in two
    // halves (even, then odd positions), each half in parallel, so that no two notes decided together are neighbours;
    // two sweeps.
    function flagPass() {
      if (!flagNames.length) return Promise.resolve();
      var combos = [{}];
      flagNames.forEach(function (fn) { var more = []; combos.forEach(function (c) { var d = copy(c); d[fn] = true; more.push(d); }); combos = combos.concat(more); });
      function half(parity) {
        var jobs = [];
        events.forEach(function (e, i) {
          if (i % 2 !== parity) return;
          var nx = events[i + 1], w = [e.t, nx ? evEnd(nx) + 0.05 : Math.min(secs, evEnd(e) + 0.3)];
          var list = combos.map(function (c) { var s = clone(st); s.flags[i] = copy(c); return s; });
          // a slide only matters when the next note follows within the note's length plus one step: otherwise skip it
          if (!nx || nx.t > evEnd(e) + (e.stepDur || 0.15) + 1e-6) list = list.filter(function (s) { return !s.flags[i].slide; });
          jobs.push(evalStates(list, w).then(function (F) { var bi = 0; F.forEach(function (f, k) { if (f < F[bi] - 1e-9) bi = k; }); return { i: i, f: list[bi].flags[i] }; }));
        });
        return Promise.all(jobs).then(function (res) { var s = clone(st); res.forEach(function (r) { s.flags[r.i] = copy(r.f); }); st = s; });
      }
      return half(0).then(function () { return half(1); }).then(function () { return half(0); }).then(function () { return half(1); })
        .then(function () { return evalStates([st]).then(function (F) { cur = F[0]; }); });
    }
    function screen() {
      if (!S.cont.length) return Promise.resolve([]);
      var list = S.cont.map(function (r) { var s = clone(st), u = s.u[r.name]; s.u[r.name] = u > 0.5 ? u - 0.3 : u + 0.3; return s; });
      return evalStates(list).then(function (F) {
        var sens = S.cont.map(function (r, i) { return { name: r.name, d: Math.abs(F[i] - cur) }; }).sort(function (a, b) { return b.d - a.d; });
        F.forEach(function (f, i) { if (f < cur - 1e-9) { cur = f; st = list[i]; } });
        return sens;
      });
    }
    function search(rows, gens, sigma, seed) {
      if (!rows.length) return Promise.resolve();
      var x0 = rows.map(function (n) { return st.u[n]; });
      return cmaes(function (X) {
        var list = X.map(function (x) { var s = clone(st); rows.forEach(function (n, k) { s.u[n] = x[k]; }); return s; });
        return evalStates(list);
      }, x0, { generations: gens, sigma: sigma, seed: seed, f0: cur }).then(function (r) {
        if (r.f < cur) { cur = r.f; rows.forEach(function (n, k) { st.u[n] = r.x[k]; }); }
      });
    }
    var rows = [], sens = [];
    return evalStates([st]).then(function (F) { cur = F[0]; return discretePass(); })
      .then(flagPass)
      .then(screen).then(function (s) {
        sens = s;
        rows = s.filter(function (x) { return x.d > 1e-3; }).slice(0, opt(o, 'maxRows')).map(function (x) { return x.name; });
        return search(rows, opt(o, 'generations'), opt(o, 'sigma'), opt(o, 'seed'));
      })
      .then(function () { var before = sig(st); return discretePass().then(flagPass).then(function () { return sig(st) !== before ? search(rows, opt(o, 'polishGenerations'), 0.1, opt(o, 'seed') + 7) : null; }); })
      .then(function () {
        return { type: cand.type, family: cand.family, loss: cur, state: st, space: S, rows: rows, sensitivity: sens, log: log, renders: renders, ms: Date.now() - t0,
                 evalStates: evalStates, clone: clone };
      });
  }

  // intervals for the best candidate: rows searched get [lo, hi] in their own units; others their whole range
  function intervals(fitc, o) {
    var S = fitc.space, st = fitc.state, best = fitc.loss, thr = Math.max(best + opt(o, 'tol'), best * (1 + opt(o, 'tolRel'))), key = sig(st), out = {};
    var near = fitc.log.filter(function (e) { return e.sig === key && e.f <= thr; });
    var chain = Promise.resolve();
    S.cont.forEach(function (r) {
      var searched = fitc.rows.indexOf(r.name) >= 0, ub = st.u[r.name], lo = ub, hi = ub;
      near.forEach(function (e) { var v = e.u[r.name]; if (v < lo) lo = v; if (v > hi) hi = v; });
      if (!searched) { out[r.name] = { value: fromU(r, ub), lo: r.min, hi: r.max, unit: r.unit, searched: false, note: 'not searched: insensitive on this excerpt or outside the ' + opt(o, 'maxRows') + ' most sensitive rows; whole range' }; return; }
      // outward from the best point on each side (other rows held at the fit): `bisect` points per side at even
      // fractions of the way to the range's end, rendered together; the interval reaches the farthest point before the
      // first one over the threshold
      function side(dir) {
        var inside = dir < 0 ? lo : hi, edge = dir < 0 ? 0 : 1, n = opt(o, 'bisect'), list = [], us = [], k;
        if (Math.abs(edge - inside) < 1e-6) return Promise.resolve(inside);
        for (k = 1; k <= n; k++) { var u = inside + (edge - inside) * k / n, s = fitc.clone(st); s.u[r.name] = u; us.push(u); list.push(s); }
        return fitc.evalStates(list).then(function (F) { var reach = inside; for (var q = 0; q < F.length; q++) { if (F[q] > thr) break; reach = us[q]; } return reach; });
      }
      chain = chain.then(function () { return Promise.all([side(-1), side(1)]); }).then(function (lh) {
        lo = Math.min(lo, lh[0]); hi = Math.max(hi, lh[1]);
        out[r.name] = { value: fromU(r, ub), lo: fromU(r, lo), hi: fromU(r, hi), unit: r.unit, searched: true };
      });
    });
    return chain.then(function () {
      S.disc.forEach(function (r) { out[r.name] = { value: st.disc[r.name], options: r.options.slice(), enumerated: true }; });
      return { rows: out, threshold: thr };
    });
  }

  // ------------------------------------------------------------------ shortlist with today's features
  function shortlist(env, T, x, events, secs, o) {
    var pitched = events.some(function (e) { return typeof e.midi === 'number' || (e.notes && e.notes.length); });
    var fam = pitched ? 'pitched' : 'unpitched', cands = env.candidates().filter(function (c) { return c.family === fam; }), ev = [], forced = [];
    ev.push('events ' + (pitched ? 'carry pitches' : 'carry no pitches') + ': ' + cands.length + ' ' + fam + ' instruments');
    try {
      if (pitched && A.features && A.decide) {
        var poly = A.decide.monoPoly(A.features.polyphony(x, null, T.sr));
        ev.push('mono or poly: ' + poly.value + ' (' + poly.confidence + ')');
        var fmd = A.decide.fmOrSubtractive(A.features.fmFit(x, null, T.sr), poly.value);
        ev.push('FM or subtractive: ' + fmd.value + ' (' + fmd.confidence + ')');
        if (fmd.value === 'fm' && fmd.confidence !== 'low') cands.forEach(function (c) { if (c.synthesis === 'fm' || c.type === 'fm') forced.push(c.type); });
      }
      if (!pitched && A.features && A.decide && A.drumlib) {
        var vec = A.features.drumVector(x, null, T.sr), nb = vec ? A.decide.drumNeighbours(vec, A.drumlib) : [], seen = {};
        nb.forEach(function (n) { if (forced.length < 3 && !seen[n.item.type] && cands.some(function (c) { return c.type === n.item.type; })) { seen[n.item.type] = 1; forced.push(n.item.type); } });
        ev.push('drum library nearest voices: ' + forced.join(', '));
      }
    } catch (e) { ev.push('feature error: ' + (e && e.message)); }
    // one render per candidate at its defaults, all flags off
    return Promise.all(cands.map(function (c) { return env.render(c.type, {}, eventsOf(events, null), secs); })).then(function (ys) {
      var ranked = cands.map(function (c, i) { return { type: c.type, d: loss(T, ys[i]) }; }).sort(function (a, b) { return a.d - b.d; });
      var k = opt(o, 'shortlist'), pick = ranked.slice(0, k).map(function (r) { return r.type; });
      forced.forEach(function (t) { if (pick.indexOf(t) < 0 && pick.length < k + 2) pick.push(t); });
      ev.push('default-patch distances: ' + ranked.slice(0, 6).map(function (r) { return r.type + ' ' + r.d.toFixed(2); }).join(', '));
      return { family: fam, picked: cands.filter(function (c) { return pick.indexOf(c.type) >= 0; }), ranked: ranked, evidence: ev, renders: cands.length };
    });
  }

  // ------------------------------------------------------------------ the fit
  // x: Float32Array/Float64Array mono excerpt at env.sr; events: [{t, midi | notes, dur, vel, step}] (flags ignored)
  function fit(env, x, events, o) {
    o = o || {};
    var t0 = Date.now(), sr = env.sr, secs = x.length / sr, T = target(x, sr, o), renders = 0;
    // a step length per event for the flag pass (the median spacing of onsets)
    var gaps = []; for (var i = 1; i < events.length; i++) if (events[i].t - events[i - 1].t > 0.02) gaps.push(events[i].t - events[i - 1].t);
    var sd = gaps.length ? D.median(gaps) : 0.15;
    events = events.map(function (e) { var c = copy(e); c.stepDur = Math.min(sd, 0.25); return c; });
    var restrict = o.only ? function (c) { return o.only.indexOf(c.type) >= 0; } : null;
    var envR = restrict ? { sr: env.sr, spec: env.spec, render: env.render, candidates: function () { return env.candidates().filter(restrict); } } : env;
    return shortlist(envR, T, x, events, secs, o).then(function (sl) {
      renders += sl.renders;
      var chain = Promise.resolve(), fits = [];
      sl.picked.forEach(function (c, k) { chain = chain.then(function () { return fitCandidate(env, T, c, events, secs, o).then(function (f) { renders += f.renders; fits.push(f); }); }); });
      return chain.then(function () {
        fits.sort(function (a, b) { return a.loss - b.loss; });
        var best = fits[0], second = fits[1] || null, n0 = best.renders;
        return intervals(best, o).then(function (iv) {
          renders += best.renders - n0;
          var last = best.log.filter(function (e) { return e.sig === sig(best.state); }), params = paramsOf(best.space, best.state);
          var lp = null;
          return env.render(best.type, params, eventsOf(events, best.state.flags), secs).then(function (y) {
            renders++; lp = lossParts(T, y);
            return {
              instrument: best.type, family: best.family, distanceDb: round(best.loss, 3), parts: { spec: lp.spec.map(function (v) { return round(v, 3); }), env: round(lp.env, 3), gainDb: round(lp.gainDb, 2) },
              params: iv.rows, held: best.space.held, threshold: round(iv.threshold, 3),
              flags: best.state.flags.map(function (f, k) { return { t: round(events[k].t, 4), slide: !!f.slide, accent: !!f.accent }; }),
              runnerUp: second ? { instrument: second.type, distanceDb: round(second.loss, 3), marginDb: round(second.loss - best.loss, 3) } : null,
              candidates: fits.map(function (f) { return { instrument: f.type, distanceDb: round(f.loss, 3), renders: f.renders, ms: f.ms, rows: f.rows, flags: f.state.flags.filter(function (q) { return q.slide || q.accent; }).length }; }),
              shortlist: { evidence: sl.evidence, ranked: sl.ranked.map(function (r) { return { type: r.type, d: round(r.d, 3) }; }) },
              renders: renders, ms: Date.now() - t0, sr: sr, secs: round(secs, 3),
              note: 'fitted on the app\'s own instruments by rendering; in-domain only, not compared with any real instrument'
            };
          });
        });
      });
    });
  }

  // ------------------------------------------------------------------ the page environment
  // o: {sr (22050), seed (1), types (filter)}. Needs Synths (and Drums, Classics, Worklets when present).
  function pageEnv(o) {
    o = o || {};
    var sr = o.sr || 22050, seed = o.seed == null ? 1 : o.seed, cache = null;
    function reseed(s) { var a = s | 0; Math.random = function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    function render(type, params, events, secs) {
      var c = new OfflineAudioContext(1, Math.max(1, Math.round(secs * sr)), sr);
      var ready = (root.Worklets && typeof root.Worklets.load === 'function') ? Promise.resolve(root.Worklets.load(c)) : Promise.resolve(false);
      return ready.then(function () {
        reseed(seed);
        var p = copy(params || {}); if (p.seed == null) p.seed = seed;
        var inst = root.Synths.create(c, type, p);
        inst.out.connect(c.destination);
        events.forEach(function (e) { var ev = copy(e); delete ev.t; delete ev.stepDur; inst.trigger(e.t, ev); });
        return c.startRendering();
      }).then(function (b) { return b.getChannelData(0); });
    }
    function spec(type) {
      if (root.Classics && root.Classics.has && root.Classics.has(type)) return root.Classics.spec(type);
      if (root.Drums && root.Drums.has && root.Drums.has(type)) return root.Drums.spec(type);
      return root.Synths.spec(type);
    }
    function diff(a, b) { var m = 0, d = 0, i; for (i = 0; i < a.length; i++) { m = Math.max(m, Math.abs(a[i])); d = Math.max(d, Math.abs(a[i] - b[i])); } return m > 0 ? d / m : 0; }
    // every instrument the engine can create without a buffer, with its family and its active event flags, found by
    // rendering (pitched: two notes an octave apart differ; a flag: a two-note pair with and without it differs)
    function probe() {
      var types = [];
      function add(list) { (list || []).forEach(function (t) { if (types.indexOf(t) < 0) types.push(t); }); }
      add(root.Synths.types()); if (root.Drums && root.Drums.types) add(root.Drums.types()); if (root.Classics && root.Classics.types) add(root.Classics.types());
      if (o.types) types = types.filter(function (t) { return o.types.indexOf(t) >= 0; });
      var pair = function (f) { var a = { t: 0.05, midi: 45, dur: 0.1, vel: 0.85, step: 0 }, b = { t: 0.17, midi: 50, dur: 0.1, vel: 0.85, step: 1 }; if (f) a[f] = true; return [a, b]; };
      return Promise.all(types.map(function (t) {
        return Promise.all([render(t, {}, [{ t: 0.05, midi: 45, dur: 0.3, vel: 0.85 }], 0.6), render(t, {}, [{ t: 0.05, midi: 57, dur: 0.3, vel: 0.85 }], 0.6),
                            render(t, {}, pair(null), 0.6), render(t, {}, pair('slide'), 0.6), render(t, {}, pair('accent'), 0.6)]).then(function (r) {
          var flags = [];
          if (diff(r[2], r[3]) > 1e-3) flags.push('slide');
          if (diff(r[2], r[4]) > 1e-3) flags.push('accent');
          var silent = !r[0].some(function (v) { return Math.abs(v) > 1e-5; });
          return { type: t, family: diff(r[0], r[1]) > 1e-3 ? 'pitched' : 'unpitched', flags: flags, silent: silent };
        });
      })).then(function (list) { cache = list.filter(function (c) { return !c.silent; }); return cache; });
    }
    var env = { sr: sr, render: render, spec: spec, candidates: function () { return cache ? cache.slice() : []; }, probe: probe };
    env.ready = function () { return cache ? Promise.resolve(env) : probe().then(function () { return env; }); };
    return env;
  }

  A.fit = { DEFAULTS: DEFAULTS, space: space, toU: toU, fromU: fromU, stft: stft, target: target, loss: loss, lossParts: lossParts,
            cmaes: cmaes, fitCandidate: fitCandidate, intervals: intervals, shortlist: shortlist, fit: fit, pageEnv: pageEnv, eventsOf: eventsOf };
})();
