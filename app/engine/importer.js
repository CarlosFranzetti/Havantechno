/* Havantechno app engine - importer.js (D1, Dubplate Crew)
 * Global `Importer`: reads tempo, drum steps and mono note lines out of audio, and builds track definitions from an
 * analysis (BRIEF "Frozen interface"). Pure JavaScript: runs in Node and in the page, needs no AudioContext.
 *
 *   Importer.tempo(buffer) -> {bpm, confidence, offset, downbeatConfidence, peakRatio}
 *   Importer.steps(buffer, {bpm, offset, bars}) -> {bars, cells, stats}       // onsets to sixteenths with velocity
 *   Importer.notes(buffer, {bpm, offset, bars}) -> {bars, cells, stats}       // mono pitch track: note, len, slide, acc
 *   Importer.build(analysis, {buffers, existing}) -> {tracks, sections, bars}
 *   Importer.loudness(buffer, {start, end}) -> {lufs, measure, blocks}        // ITU-R BS.1770-4 integrated loudness
 *   Importer.fold(variant, {agree, maxBars, kind}) -> {bars, cells, agreement} | null
 *
 * A buffer is an AudioBuffer (getChannelData, sampleRate), or {L, R, sr}, or {data, sampleRate}.
 * Offsets are in seconds of the buffer: the time of bar 1 beat 1. Everything read here is a first pass from audio:
 * stats and confidences say how much of it held together, they are not a measure of correctness (see
 * tools/importer-check.js --truth for that).
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var STEPS = 16;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function isArr(a) { return Object.prototype.toString.call(a) === '[object Array]'; }
  function median(a) { var b = Array.prototype.slice.call(a).filter(function (x) { return x === x; }).sort(function (p, q) { return p - q; }), n = b.length; return n ? (n % 2 ? b[(n - 1) / 2] : 0.5 * (b[n / 2 - 1] + b[n / 2])) : NaN; }
  function pct(a, p) { var b = Array.prototype.slice.call(a).sort(function (x, y) { return x - y; }); return b.length ? b[Math.min(b.length - 1, Math.floor(p * b.length))] : 0; }
  function r2(x) { return Math.round(x * 100) / 100; }
  function r3(x) { return Math.round(x * 1000) / 1000; }

  // ------------------------------------------------------------------ input
  // -> {x: mono Float32Array, L, R, sr, duration}
  function input(b) {
    if (!b) throw new Error('Importer: no audio');
    var L, R = null, sr;
    if (typeof b.getChannelData === 'function') { L = b.getChannelData(0); R = b.numberOfChannels > 1 ? b.getChannelData(1) : null; sr = b.sampleRate; }
    else if (b.L) { L = b.L; R = b.R || null; sr = b.sr || b.sampleRate; }
    else if (b.data) { L = b.data; sr = b.sampleRate || b.sr; }
    else throw new Error('Importer: unsupported audio input');
    if (!(sr > 0)) throw new Error('Importer: no sample rate');
    var x = L;
    if (R) { x = new Float32Array(L.length); for (var i = 0; i < L.length; i++) x[i] = 0.5 * (L[i] + R[i]); }
    return { x: x, L: L, R: R, sr: sr, duration: L.length / sr };
  }
  function peakAbs(x) { var p = 0; for (var i = 0; i < x.length; i++) { var a = x[i] < 0 ? -x[i] : x[i]; if (a > p) p = a; } return p; }
  // halve the rate by averaging pairs (enough for onset envelopes, which only look below a few kHz in effect)
  function halve(x) { var n = x.length >> 1, y = new Float32Array(n); for (var i = 0; i < n; i++) y[i] = 0.5 * (x[2 * i] + x[2 * i + 1]); return y; }

  // ------------------------------------------------------------------ FFT (radix 2, in place)
  var TABLES = {};
  function tables(n) {
    if (TABLES[n]) return TABLES[n];
    var cos = new Float64Array(n / 2), sin = new Float64Array(n / 2), rev = new Uint32Array(n), bits = Math.round(Math.log(n) / Math.LN2), i;
    for (i = 0; i < n / 2; i++) { cos[i] = Math.cos(2 * Math.PI * i / n); sin[i] = -Math.sin(2 * Math.PI * i / n); }
    for (i = 0; i < n; i++) { var r = 0, v = i; for (var b = 0; b < bits; b++) { r = (r << 1) | (v & 1); v >>= 1; } rev[i] = r; }
    return (TABLES[n] = { cos: cos, sin: sin, rev: rev });
  }
  function fft(re, im) {
    var n = re.length, T = tables(n), i, j, k, size, half, step, t;
    for (i = 0; i < n; i++) { j = T.rev[i]; if (j > i) { t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (size = 2; size <= n; size <<= 1) {
      half = size >> 1; step = n / size;
      for (i = 0; i < n; i += size) for (j = i, k = 0; j < i + half; j++, k += step) {
        var tr = re[j + half] * T.cos[k] - im[j + half] * T.sin[k], ti = re[j + half] * T.sin[k] + im[j + half] * T.cos[k];
        re[j + half] = re[j] - tr; im[j + half] = im[j] - ti; re[j] += tr; im[j] += ti;
      }
    }
  }
  function hann(n) { var w = new Float64Array(n); for (var i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n); return w; }

  // spectral flux on log magnitudes (half-wave rectified). Frame f is centred at f*hop/sr seconds.
  // o.low: also a flux restricted to bins under o.low Hz. Input is normalised to its peak first.
  function flux(x, sr, N, hop, o) {
    o = o || {};
    var nF = x.length >= N ? Math.floor(x.length / hop) + 1 : 0, w = hann(N), half = N / 2 + 1, h2 = N / 2, len = x.length;
    var env = new Float32Array(nF), low = o.low ? new Float32Array(nF) : null, lowBin = o.low ? Math.max(1, Math.round(o.low * N / sr)) : 0;
    var re = new Float64Array(N), im = new Float64Array(N), prev = new Float64Array(half), cur = new Float64Array(half);
    var pk = peakAbs(x) || 1, g = 1 / pk, i, f;
    for (f = 0; f < nF; f++) {
      var s = f * hop - h2;                                   // frames are centred on f*hop (zeros before the start)
      for (i = 0; i < N; i++) { var j = s + i; re[i] = (j >= 0 && j < len ? x[j] : 0) * g * w[i]; im[i] = 0; }
      fft(re, im);
      var sum = 0, sl = 0;
      for (i = 0; i < half; i++) {
        var m = Math.log(1 + 100 * Math.sqrt(re[i] * re[i] + im[i] * im[i]));
        cur[i] = m;
        var d = m - prev[i];
        if (d > 0) { sum += d; if (i < lowBin) sl += d; }          // frame 0 against silence: a hit at the very start counts
      }
      env[f] = sum; if (low) low[f] = sl;
      var tmp = prev; prev = cur; cur = tmp;
    }
    return { env: env, low: low, hop: hop, N: N, sr: sr, t0: 0, dt: hop / sr };
  }
  function movingMean(e, half) {
    var n = e.length, out = new Float32Array(n), s = 0, a = 0, b = -1, i;
    for (i = 0; i < n; i++) {
      var lo = Math.max(0, i - half), hi = Math.min(n - 1, i + half);
      while (b < hi) s += e[++b];
      while (a < lo) s -= e[a++];
      out[i] = s / (hi - lo + 1);
    }
    return out;
  }

  // the rise of a hit near t (seconds): an rms envelope in 0.5 ms blocks over [t - before, t + after]; from the loudest
  // block, walk back while the envelope stays over 30 % of the way up from the level at the window's start. Walking
  // back from the peak keeps the noise of an earlier hit's tail from triggering it early.
  function refineOnset(x, sr, t, before, after) {
    var r1 = riseIn(x, sr, t, before, after, false), r2 = riseIn(x, sr, t, before, after, true);
    // the signal or its first difference, whichever rises more clearly (a hat over a kick's tail rises in the second)
    var r = !r1 ? r2 : !r2 ? r1 : (r2.ratio > r1.ratio * 1.5 ? r2 : r1);
    return r ? r.t : t;
  }
  function riseIn(x, sr, t, before, after, diff) {
    var a = Math.max(1, Math.round((t - before) * sr)), b = Math.min(x.length, Math.round((t + after) * sr)), w = Math.max(4, Math.round(0.0005 * sr));
    var nb = Math.floor((b - a) / w);
    if (nb < 4) return null;
    var e = new Float64Array(nb), k, i, kp = 0, v;
    for (k = 0; k < nb; k++) { var s2 = 0; for (i = a + k * w; i < a + (k + 1) * w; i++) { v = diff ? x[i] - x[i - 1] : x[i]; s2 += v * v; } e[k] = Math.sqrt(s2 / w); if (e[k] > e[kp]) kp = k; }
    var nb0 = Math.max(1, Math.min(kp, Math.round(0.004 * sr / w))), base = Infinity;
    for (k = 0; k < nb0; k++) base = Math.min(base, e[k]);
    if (!(e[kp] > base * 1.2)) return null;
    var th = base + 0.3 * (e[kp] - base);
    for (k = kp; k > 0 && e[k - 1] >= th; k--) {}
    var thA = th * 1.2, at = (a + k * w) / sr;
    for (i = a + Math.max(0, k - 1) * w; i < a + (k + 1) * w; i++) { v = diff ? x[i] - x[i - 1] : x[i]; if ((v < 0 ? -v : v) >= thA) { at = i / sr; break; } }
    return { t: at, ratio: e[kp] / Math.max(base, 1e-9) };
  }

  // onsets: flux peaks over an adaptive threshold, refined in time, with each hit's peak level.
  // -> [{t, strength, peak}] sorted by time
  function onsets(m, o) {
    o = o || {};
    var x = m.x, sr = m.sr, xs = sr > 32000 ? halve(x) : x, fsr = sr > 32000 ? sr / 2 : sr, N = 512, hop = 128, F = flux(xs, fsr, N, hop), e = F.env, n = e.length;
    if (!n) return [];
    var mean = movingMean(e, Math.max(2, Math.round(0.15 / F.dt))), pmax = 0, i;
    for (i = 0; i < n; i++) if (e[i] > pmax) pmax = e[i];
    var floor = (o.floor == null ? 0.08 : o.floor) * pmax, near = Math.max(1, Math.round(0.02 / F.dt)), out = [], minGap = o.minGap || 0.03;
    for (i = 0; i < n - 1; i++) {
      if (e[i] < floor || e[i] < mean[i] * 1.4) continue;
      var isMax = true;
      for (var k = Math.max(0, i - near); k <= Math.min(n - 1, i + near); k++) if (e[k] > e[i] || (e[k] === e[i] && k < i)) { isMax = false; break; }
      if (!isMax) continue;
      var tc = i * F.dt + F.t0, t = refineOnset(x, sr, tc, 0.008, 0.010);   // the flux peak of a centred frame sits within a few ms of the hit
      // a new hit raises the level: a flux peak inside a ringing hit (a kick's sweep) does not
      // (checked on the signal and on its first difference, which a hat over a kick's tail raises and a sweep does not)
      var after = rmsAt(x, sr, t, t + 0.012), before = rmsAt(x, sr, t - 0.014, t - 0.002);
      if (before > 1e-5 && after < 1.3 * before && diffRms(x, sr, t, t + 0.012) < 1.6 * diffRms(x, sr, t - 0.014, t - 0.002)) continue;
      if (out.length && t - out[out.length - 1].t < minGap) { if (e[i] > out[out.length - 1].strength) out.pop(); else continue; }
      out.push({ t: t, strength: e[i] });
    }
    var pkw = Math.round(0.04 * sr);
    out.forEach(function (h) {
      var a = Math.round(h.t * sr), p = 0;
      for (var j = a; j < Math.min(x.length, a + pkw); j++) { var v = x[j] < 0 ? -x[j] : x[j]; if (v > p) p = v; }
      h.peak = p;
    });
    var top = 0; out.forEach(function (h) { if (h.peak > top) top = h.peak; });
    var minPeak = (o.minPeak == null ? 0.06 : o.minPeak) * top;
    return out.filter(function (h) { return h.peak >= minPeak; });
  }

  // ------------------------------------------------------------------ tempo
  var MIN_BPM = 60, MAX_BPM = 200;
  function foldScore(e, dt, t0, P, bins) {
    var h = new Float64Array(bins), tot = 0, i;
    for (i = 0; i < e.length; i++) {
      var ph = ((i * dt + t0) / P) % 1, b = Math.floor(ph * bins);
      h[b] += e[i]; tot += e[i];
    }
    var best = -1, bi = 0;
    for (i = 0; i < bins; i++) {
      var v = h[i] + 0.5 * (h[(i + bins - 1) % bins] + h[(i + 1) % bins]);
      if (v > best) { best = v; bi = i; }
    }
    return { score: tot > 0 ? best / tot : 0, bin: bi, hist: h, total: tot };
  }
  function tempo(buffer, o) {
    o = o || {};
    var m = input(buffer), x = m.x, sr = m.sr;
    if (sr >= 32000) { x = halve(x); sr = sr / 2; }
    var F = flux(x, sr, 1024, 256, { low: 150 }), n = F.env.length, dt = F.dt, i;
    var none = { bpm: 120, confidence: 0, offset: 0, downbeatConfidence: 0, peakRatio: 0, why: 'too little audio to read a tempo' };
    if (n * dt < 4) return none;
    var mm = movingMean(F.env, Math.round(0.5 / dt)), e = new Float32Array(n), any = 0;
    for (i = 0; i < n; i++) { e[i] = Math.max(0, F.env[i] - mm[i]); any += e[i]; }
    if (!(any > 0)) { none.why = 'no onsets'; return none; }
    // autocorrelation over the beat lags, with support at two and four beats
    var maxLag = Math.min(n - 2, Math.ceil(4 * 60 / MIN_BPM / dt) + 2), ac = new Float64Array(maxLag + 1), L;
    for (L = 1; L <= maxLag; L++) { var s = 0; for (i = 0; i + L < n; i++) s += e[i] * e[i + L]; ac[L] = s / (n - L); }
    function acAt(l) { if (l >= maxLag) return 0; var a = Math.floor(l), f = l - a; return ac[a] * (1 - f) + ac[a + 1] * f; }
    var best = -1, b0 = 120;
    for (var bpm = MIN_BPM; bpm <= MAX_BPM; bpm += 0.25) {
      var l = 60 / bpm / dt, sc = acAt(l) + 0.5 * acAt(2 * l) + 0.25 * acAt(3 * l) + 0.25 * acAt(4 * l);
      var oc = Math.log(bpm / 120) / Math.LN2, prior = Math.exp(-0.5 * oc * oc);
      sc *= prior;
      if (sc > best) { best = sc; b0 = bpm; }
    }
    // refine by folding the whole envelope on the beat period (96 phase bins): the sharpest fold wins
    var BINS = 96;
    function search(lo, hi, stepB) {
      var bb = lo, bs = -1, bf = null;
      for (var b = lo; b <= hi + 1e-9; b += stepB) { var f = foldScore(e, dt, F.t0, 60 / b, BINS); if (f.score > bs) { bs = f.score; bb = b; bf = f; } }
      return { bpm: bb, fold: bf };
    }
    var r1 = search(b0 - 1.5, b0 + 1.5, 0.01), r2_ = search(r1.bpm - 0.012, r1.bpm + 0.012, 0.001), bpmF = r2_.bpm, fold = r2_.fold;
    var P = 60 / bpmF, sd = P / 4, meanBin = fold.total / BINS, peakRatio = meanBin > 0 ? (fold.score * fold.total) / (2 * meanBin) : 0;
    // phase from the fold, then tempo and phase fitted to the refined onset times (least squares of onset time
    // against its sixteenth index, twice), so the grid lands within a millisecond or two on clean material
    var phase = (fold.bin + 0.5) / BINS * P;                               // frame centres are already in F.t0
    var hits = onsets(m, { floor: 0.1 }), hitsT = hits, hitsTop = 0, latency = 0, fitN = 0, fitRms = null;
    hits.forEach(function (h) { if (h.peak > hitsTop) hitsTop = h.peak; });
    var strong = hits.filter(function (h) { return h.peak >= 0.15 * hitsTop; });
    // the fold's peak can be an off-beat (hats): the beat is the sixteenth of the four whose hits carry the most
    // low-frequency energy (kicks; under about 150 Hz, two one-pole lowpasses)
    var lp = lowpass2(m.x, m.sr, 150), lowAt = [0, 0, 0, 0], q;
    strong.forEach(function (h) { var u = Math.round((h.t - phase) / sd); h.low = rmsAt(lp, m.sr, h.t, h.t + 0.03); lowAt[((u % 4) + 4) % 4] += h.low; });
    var bestQ = 0; for (q = 1; q < 4; q++) if (lowAt[q] > lowAt[bestQ] * 1.02) bestQ = q;
    phase += bestQ * sd;
    function pairs(sdv, ph, tol) { var out = []; strong.forEach(function (h) { var u = (h.t - ph) / sdv, k = Math.round(u); if (Math.abs(u - k) < tol && k % 2 === 0) out.push([k, h.t]); }); return out; }   // even sixteenths: swing moves the odd ones
    function fit(pp, fixedSd) {
      var n2 = pp.length, sk = 0, st = 0, skk = 0, skt = 0, j;
      for (j = 0; j < n2; j++) { sk += pp[j][0]; st += pp[j][1]; skk += pp[j][0] * pp[j][0]; skt += pp[j][0] * pp[j][1]; }
      var slope = fixedSd || ((n2 * skt - sk * st) / (n2 * skk - sk * sk)), icp = (st - slope * sk) / n2, e2 = 0;
      for (j = 0; j < n2; j++) { var r = pp[j][1] - (icp + slope * pp[j][0]); e2 += r * r; }
      return { sd: slope, phase: icp, rms: Math.sqrt(e2 / n2) };
    }
    var phase0 = phase;
    for (var it = 0; it < 3; it++) {
      var pp = pairs(sd, phase, it ? 0.2 : 0.3), ks = {};
      pp.forEach(function (q) { ks[q[0]] = 1; });
      if (pp.length < 8 || Object.keys(ks).length < 4) break;
      var fr = fit(pp);
      if (!(fr.sd > 15 / MAX_BPM / 2 && fr.sd < 15 / MIN_BPM * 2) || Math.abs(fr.sd / sd - 1) > 0.02) break;
      sd = fr.sd; phase = fr.phase; fitN = pp.length; fitRms = fr.rms;
    }
    bpmF = 15 / sd;
    var near = Math.round(bpmF);
    if (Math.abs(near - bpmF) <= 0.05 && fitN) {
      var fi = fit(pairs(15 / near, phase, 0.2), 15 / near);
      if (fi.rms <= Math.max(0.002, 1.15 * fitRms)) { bpmF = near; sd = 15 / near; phase = fi.phase; fitRms = fi.rms; }
    } else if (Math.abs(near - bpmF) <= 0.05 && !fitN) bpmF = near;
    P = 4 * sd;
    phase = ((phase % P) + P) % P;
    latency = phase - phase0;
    // downbeat: the beat of four with the most low-band (kick) onset energy and the least mid-band (snare, clap)
    // energy above it; when two beats read alike, the one the music starts on
    var lowE = F.low, sums = [0, 0, 0, 0], mids = [0, 0, 0, 0], bar = 4 * P;
    for (i = 0; i < n; i++) {
      var t = i * dt + F.t0, u2 = (t - phase) / P, k2 = Math.round(u2);
      if (Math.abs(u2 - k2) > 0.12) continue;
      var bk = ((k2 % 4) + 4) % 4;
      sums[bk] += lowE[i]; mids[bk] += F.env[i] - lowE[i];
    }
    var lmax = Math.max.apply(null, sums) || 1, mmax = Math.max.apply(null, mids) || 1, score = [0, 1, 2, 3].map(function (k) { return sums[k] / lmax - 0.5 * mids[k] / mmax; });
    var first0 = 0; for (i = 0; i < hitsT.length; i++) if (hitsT[i].peak >= 0.3 * hitsTop) { first0 = hitsT[i].t; break; }
    var startBeat = ((Math.round((first0 - phase) / P) % 4) + 4) % 4;
    var order = [0, 1, 2, 3].sort(function (a, b) { return score[b] - score[a]; }), db = order[0], gap = score[order[0]] - score[order[1]];
    if (gap < 0.1 && (order[1] === startBeat)) db = startBeat;
    var dbConf = clamp(gap * 2, 0, 1);
    var off = phase + db * P;
    off = (((off + 0.25 * P) % bar) + bar) % bar - 0.25 * P;               // a hit right at the start is bar 1
    var first = hits.length ? hits[0].t : 0;
    while (off < first - 0.25 * P) off += bar;
    var conf = clamp((peakRatio - 1.5) / 6, 0, 1);
    return { bpm: Math.round(bpmF * 1000) / 1000, confidence: r2(conf), offset: Math.round(off * 10000) / 10000, downbeatConfidence: r2(dbConf), peakRatio: r2(peakRatio),
             beatPhase: r3(phase), latencyMs: Math.round(latency * 10000) / 10, firstOnset: r3(first), gridRmsMs: fitRms == null ? null : Math.round(fitRms * 10000) / 10, gridHits: fitN };
  }

  // ------------------------------------------------------------------ grid helpers
  // whole bars from the offset to the end; a last part bar counts when it holds more than 0.3 of a bar (not a tail)
  function barsFor(dur, off, bpm) { return Math.max(1, Math.ceil((dur - off) / (240 / bpm) - 0.3)); }
  function gridOf(m, o) {
    o = o || {};
    var bpm = o.bpm > 0 ? o.bpm : 120, off = typeof o.offset === 'number' ? o.offset : 0, sd = 15 / bpm;
    var bars = o.bars > 0 ? (o.bars | 0) : barsFor(m.duration, off, bpm);
    return { bpm: bpm, offset: off, sd: sd, bars: bars, n: bars * STEPS };
  }
  function emptyCells(n) { var c = []; for (var i = 0; i < n; i++) c.push(null); return c; }

  // ------------------------------------------------------------------ steps
  function steps(buffer, o) {
    o = o || {};
    var m = input(buffer), g = gridOf(m, o), cells = emptyCells(g.n), hits = onsets(m, o), top = 0, offGrid = 0, outside = 0, collisions = 0;
    hits.forEach(function (h) { if (h.peak > top) top = h.peak; });
    var tol = o.tolerance == null ? 0.4 : o.tolerance;
    hits.forEach(function (h) {
      var u = (h.t - g.offset) / g.sd, k = Math.round(u);
      if (k < 0 || k >= g.n) { outside++; return; }
      if (Math.abs(u - k) > tol) { offGrid++; return; }
      var vel = top > 0 ? clamp(Math.round(h.peak / top * 20) / 20, 0.05, 1) : 0.85;
      if (cells[k]) { collisions++; if (cells[k].vel >= vel) return; }
      cells[k] = { vel: vel };
    });
    var kept = cells.filter(Boolean).length;
    return { bars: g.bars, cells: cells, stats: { onsets: hits.length, kept: kept, offGrid: offGrid, outside: outside, collisions: collisions, onGrid: hits.length ? r2((hits.length - offGrid - outside) / Math.max(1, hits.length - outside)) : 0 } };
  }

  // ------------------------------------------------------------------ notes
  function lowpassDecimate(x, sr, target) {
    var d = Math.max(1, Math.round(sr / target));
    if (d === 1) return { y: x, sr: sr };
    var taps = 8 * d + 1, h = new Float64Array(taps), fc = 0.45 / d, s = 0, i, k;
    for (i = 0; i < taps; i++) { var u = i - (taps - 1) / 2, sinc = u === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * u) / (Math.PI * u); h[i] = sinc * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (taps - 1))); s += h[i]; }
    for (i = 0; i < taps; i++) h[i] /= s;
    var n = Math.floor(x.length / d), y = new Float32Array(n), half = (taps - 1) / 2;
    for (i = 0; i < n; i++) {
      var c = i * d, acc = 0;
      for (k = 0; k < taps; k++) { var j = c + k - half; if (j >= 0 && j < x.length) acc += h[k] * x[j]; }
      y[i] = acc;
    }
    return { y: y, sr: sr / d };
  }
  // YIN at sample c of y: {hz, clarity} or null
  function yin(y, sr, c, W, minHz, maxHz, th) {
    var maxT = Math.floor(sr / minHz), minT = Math.max(2, Math.floor(sr / maxHz)), a = Math.round(c - (W + maxT) / 2);
    if (a < 0 || a + W + maxT + 1 >= y.length) return null;
    var d = new Float64Array(maxT + 2), t, j, run = 0, best = -1, e0 = 0;
    for (j = 0; j < W; j++) e0 += y[a + j] * y[a + j];
    if (e0 < 1e-10) return null;
    var cm = new Float64Array(maxT + 2); cm[0] = 1;
    for (t = 1; t <= maxT + 1; t++) {
      var s = 0;
      for (j = 0; j < W; j++) { var q = y[a + j] - y[a + j + t]; s += q * q; }
      d[t] = s; run += s; cm[t] = run > 0 ? s * t / run : 1;
    }
    for (t = minT; t <= maxT; t++) if (cm[t] < th) { while (t + 1 <= maxT && cm[t + 1] < cm[t]) t++; best = t; break; }
    if (best < 0) {
      var mv = Infinity; for (t = minT; t <= maxT; t++) if (cm[t] < mv) { mv = cm[t]; best = t; }
      if (mv > 0.35) return null;
    }
    var x0 = cm[best - 1], x1 = cm[best], x2 = cm[best + 1], den = x0 - 2 * x1 + x2, sh = den !== 0 ? 0.5 * (x0 - x2) / den : 0;
    var tau = best + clamp(sh, -1, 1);
    return { hz: sr / tau, clarity: clamp(1 - x1, 0, 1) };
  }
  function lowpass2(x, sr, hz) {
    var a = 1 - Math.exp(-2 * Math.PI * hz / sr), y = new Float32Array(x.length), s1 = 0, s2 = 0;
    for (var i = 0; i < x.length; i++) { s1 += a * (x[i] - s1); s2 += a * (s1 - s2); y[i] = s2; }
    return y;
  }
  function diffRms(x, sr, t0, t1) { var a = Math.max(1, Math.round(t0 * sr)), b = Math.min(x.length, Math.round(t1 * sr)), s = 0; for (var i = a; i < b; i++) { var d = x[i] - x[i - 1]; s += d * d; } return b > a ? Math.sqrt(s / (b - a)) : 0; }
  function rmsAt(x, sr, t0, t1) { var a = Math.max(0, Math.round(t0 * sr)), b = Math.min(x.length, Math.round(t1 * sr)), s = 0; for (var i = a; i < b; i++) s += x[i] * x[i]; return b > a ? Math.sqrt(s / (b - a)) : 0; }
  function notes(buffer, o) {
    o = o || {};
    var m = input(buffer), g = gridOf(m, o), sd = g.sd, cells = emptyCells(g.n), i, s;
    var lp = lowpassDecimate(m.x, m.sr, 11025), y = lp.y, ysr = lp.sr, W = Math.round(0.046 * ysr), minHz = o.minHz || 30, maxHz = o.maxHz || 1500;
    var hits = onsets(m, { floor: 0.06, minPeak: 0.03 }), onsetAt = new Array(g.n), onsetStr = new Float32Array(g.n);
    hits.forEach(function (h) {
      var u = (h.t - g.offset) / sd, k = Math.round(u);
      if (k >= 0 && k < g.n && Math.abs(u - k) <= 0.35) { onsetAt[k] = true; onsetStr[k] = Math.max(onsetStr[k], h.strength); }
    });
    var info = [], lv = [];
    for (s = 0; s < g.n; s++) {
      var ts = g.offset + s * sd;
      var early = rmsAt(m.x, m.sr, ts + 0.05 * sd, ts + 0.45 * sd), late = rmsAt(m.x, m.sr, ts + 0.55 * sd, ts + 0.95 * sd);
      // pitch at 0.25, 0.45 and 0.75 of the step, each with the level around it
      var pts = [0.25, 0.45, 0.75].map(function (f) { var tc = ts + f * sd; return { p: yin(y, ysr, tc * ysr, W, minHz, maxHz, 0.15), lv: rmsAt(m.x, m.sr, tc - 0.1 * sd, tc + 0.1 * sd) }; });
      info.push({ early: early, late: late, pts: pts, p1: pts[0].p || pts[1].p }); lv.push(early);
    }
    var ref = pct(lv, 0.9), gate = (o.gate == null ? 0.1 : o.gate) * ref;
    function midiOf(p) { return p ? 69 + 12 * Math.log(p.hz / 440) / Math.LN2 : null; }
    var cur = null, noteLv = [], made = [], slides = 0;
    for (s = 0; s < g.n; s++) {
      var I = info[s], m1 = midiOf(I.p1), mp = null, q;
      // the pitch the note settles on: the latest reading in the step that still sounds (after a glide), else the first
      for (q = 2; q >= 0; q--) if (I.pts[q].p && I.pts[q].lv > 0.35 * I.early) { mp = midiOf(I.pts[q].p); break; }
      if (mp == null) mp = m1;
      var voiced = I.early > gate && mp != null;
      if (!voiced) { cur = null; continue; }
      var note = Math.round(mp), startPitch = m1 != null ? Math.round(m1) : note;
      var isNew = !cur || onsetAt[s] || note !== cur.note || startPitch !== cur.note;
      if (!isNew) { cur.cell.len++; continue; }
      var slide = !!cur && !onsetAt[s] && (note !== cur.note);
      if (slide) { cur.cell.slide = true; slides++; }
      var cell = { note: note, len: 1, vel: 0.85 };
      cells[s] = cell; made.push({ step: s, cell: cell, level: I.early });
      noteLv.push(I.early);
      cur = { note: note, cell: cell };
    }
    var med = median(noteLv), acc = 0;
    if (made.length >= 4) made.forEach(function (n) { if (n.level > 1.4 * med) { n.cell.acc = true; acc++; } });
    return { bars: g.bars, cells: cells, stats: { notes: made.length, slides: slides, accents: acc, onsets: hits.length, voicedSteps: info.filter(function (I) { return I.early > gate; }).length } };
  }

  // ------------------------------------------------------------------ fold a long pattern to its shortest repeat
  function cellKey(c, kind) { return c ? (kind === 'melody' ? 'n' + c.note : 'x') : '.'; }
  function fold(v, o) {
    o = o || {};
    var agree = o.agree == null ? 0.9 : o.agree, maxBars = o.maxBars || 16, kind = o.kind || 'drum', lens = [1, 2, 4, 8, 16];
    // bars after the last hit (the end of the file, a fade) do not count against a repeat
    var lastBar = -1; for (var z = v.cells.length - 1; z >= 0; z--) if (v.cells[z]) { lastBar = Math.floor(z / STEPS); break; }
    if (lastBar >= 0 && lastBar + 1 < v.bars) v = { bars: lastBar + 1, cells: v.cells.slice(0, (lastBar + 1) * STEPS) };
    for (var li = 0; li < lens.length; li++) {
      var Lb = lens[li];
      if (Lb > maxBars || v.bars < 2 * Lb) continue;
      var n = Lb * STEPS, cons = [], matches = 0, union = 0, j, k;
      for (j = 0; j < n; j++) {
        var count = {}, bestK = '.', bestN = -1, sample = {};
        for (k = j; k < v.cells.length; k += n) { var key = cellKey(v.cells[k], kind); count[key] = (count[key] || 0) + 1; if (v.cells[k] && !sample[key]) sample[key] = []; if (v.cells[k]) sample[key].push(v.cells[k]); }
        for (var q in count) if (has(count, q) && count[q] > bestN) { bestN = count[q]; bestK = q; }
        var c = null;
        if (bestK !== '.') {
          var list = sample[bestK]; c = {}; for (var f in list[0]) if (has(list[0], f)) c[f] = list[0][f];
          c.vel = r2(median(list.map(function (z) { return z.vel == null ? 0.85 : z.vel; })));
          if (kind === 'melody') { c.len = Math.round(median(list.map(function (z) { return z.len || 1; }))); var sl = list.filter(function (z) { return z.slide; }).length, ac = list.filter(function (z) { return z.acc; }).length; if (sl * 2 > list.length) c.slide = true; else delete c.slide; if (ac * 2 > list.length) c.acc = true; else delete c.acc; }
        }
        cons.push(c);
        for (k = j; k < v.cells.length; k += n) { var a = cellKey(v.cells[k], kind); if (a !== '.' || bestK !== '.') { union++; if (a === bestK) matches++; } }
      }
      var ag = union ? matches / union : 1;
      if (ag >= agree) return { bars: Lb, cells: cons, agreement: r3(ag) };
    }
    return null;
  }

  // ------------------------------------------------------------------ loudness (ITU-R BS.1770-4)
  // K-weighting: the standard's shelf and high-pass, recomputed for the sample rate (libebur128's formulas)
  function kFilters(sr) {
    var f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196, K = Math.tan(Math.PI * f0 / sr), Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416);
    var a0 = 1 + K / Q + K * K, s1 = { b0: (Vh + Vb * K / Q + K * K) / a0, b1: 2 * (K * K - Vh) / a0, b2: (Vh - Vb * K / Q + K * K) / a0, a1: 2 * (K * K - 1) / a0, a2: (1 - K / Q + K * K) / a0 };
    f0 = 38.13547087602444; Q = 0.5003270373238773; K = Math.tan(Math.PI * f0 / sr);
    var d = 1 + K / Q + K * K, s2 = { b0: 1, b1: -2, b2: 1, a1: 2 * (K * K - 1) / d, a2: (1 - K / Q + K * K) / d };
    return [s1, s2];
  }
  function biquadRun(x, a, b, c) {
    var y = new Float64Array(b - a), x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (var i = a; i < b; i++) { var v = x[i], o = c.b0 * v + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2; x2 = x1; x1 = v; y2 = y1; y1 = o; y[i - a] = o; }
    return y;
  }
  var MEASURE = 'ITU-R BS.1770-4 integrated loudness (K-weighted, 400 ms blocks with 75 % overlap, gated at -70 LUFS absolute and -10 LU relative)';
  function loudness(buffer, o) {
    o = o || {};
    var m = input(buffer), sr = m.sr, a = Math.max(0, Math.round((o.start || 0) * sr)), b = Math.min(m.L.length, Math.round((o.end == null ? m.duration : o.end) * sr));
    var chans = m.R ? [m.L, m.R] : [m.L], kf = kFilters(sr), z = [];
    if (b - a < Math.round(0.4 * sr)) return { lufs: -Infinity, measure: MEASURE, blocks: 0 };
    chans.forEach(function (ch) { var y = biquadRun(ch, a, b, kf[0]); y = biquadRun(y, 0, y.length, kf[1]); var q = new Float64Array(y.length); for (var i = 0; i < y.length; i++) q[i] = y[i] * y[i]; z.push(q); });
    var blk = Math.round(0.4 * sr), hop = Math.round(0.1 * sr), n = b - a, L = [], i, j;
    // prefix sums for each channel's squares
    var pre = z.map(function (q) { var p = new Float64Array(q.length + 1); for (var k = 0; k < q.length; k++) p[k + 1] = p[k] + q[k]; return p; });
    for (i = 0; i + blk <= n; i += hop) { var s = 0; for (j = 0; j < pre.length; j++) s += (pre[j][i + blk] - pre[j][i]) / blk; L.push(s); }
    function lk(ms) { return -0.691 + 10 * Math.log(ms) / Math.LN10; }
    var abs = L.filter(function (v) { return v > 0 && lk(v) > -70; });
    if (!abs.length) return { lufs: -Infinity, measure: MEASURE, blocks: L.length };
    var mean1 = abs.reduce(function (p, q) { return p + q; }, 0) / abs.length, rel = lk(mean1) - 10;
    var gated = abs.filter(function (v) { return lk(v) > rel; });
    var mean2 = gated.reduce(function (p, q) { return p + q; }, 0) / gated.length;
    return { lufs: Math.round(lk(mean2) * 100) / 100, measure: MEASURE, blocks: gated.length };
  }

  // ------------------------------------------------------------------ build
  var ENGINE_DRUMS = { kick: 1, clap: 1, hat_closed: 1, hat_open: 1, shaker: 1, perc: 1 };
  var PITCHED = { tb303: 1, modeld: 1, juno: 1, fm: 1, bass: 1, lead: 1, sub: 1, stab: 1, pad: 1 };
  function isDrumType(t) {
    if (ENGINE_DRUMS[t]) return true;
    var D = root.Drums;
    if (D && typeof D.has === 'function') return !!D.has(t);
    return /(808|909)$/.test(String(t));
  }
  function specOf(t) {
    var S = root.Synths, D = root.Drums, C = root.Classics;
    return (S && S.spec && S.spec(t)) || (D && D.spec && D.spec(t)) || (C && C.spec && C.spec(t)) || null;
  }
  function knownType(t) {
    if (t === 'sampler' || isDrumType(t) || PITCHED[t]) return true;
    var S = root.Synths; return !!(S && S.types && S.types().indexOf(t) >= 0);
  }
  // parameters the instrument has (the analysis also reports measurements that are not knobs)
  function paramsFor(type, p) {
    var sp = specOf(type), out = {};
    if (!p) return out;
    for (var k in p) if (has(p, k) && (sp ? has(sp, k) : typeof p[k] === 'number') && p[k] != null && (typeof p[k] !== 'number' || p[k] === p[k])) {
      var v = p[k];
      if (sp && sp[k] && typeof v === 'number' && typeof sp[k].min === 'number') v = clamp(v, sp[k].min, sp[k].max);
      if (sp && sp[k] && sp[k].options && sp[k].options.indexOf(v) < 0) continue;
      out[k] = v;
    }
    return out;
  }
  var STEM_NAMES = { kick: 'kick', snare: 'snare', hat: 'hats' };
  function baseNameFor(el) {
    var s = String(el.name || el.id || 'element').toLowerCase();
    if (el.bandKey) return el.bandKey;
    if (/kick band/.test(s)) return 'kick';
    if (/snare|clap/.test(s) && /band/.test(s)) return 'snare';
    if (/hat|cymbal/.test(s) && /band/.test(s)) return 'hats';
    var b = String(el.stem || s).replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
    return b || 'element';
  }
  function uniqueName(base, used) {
    var n = base.replace(/[^A-Za-z0-9_-]+/g, '_') || 'track', name = n, k = 2;
    if (name === 'send' || name === 'master') name = n + '_' + (k++);
    while (used[name]) name = n + '_' + (k++);
    used[name] = true;
    return name;
  }
  function word(p) { return p >= 0.8 ? 'high' : p >= 0.55 ? 'medium' : p > 0 ? 'low' : 'none'; }
  function decisionSummary(d) {
    var out = {};
    for (var k in d) if (has(d, k) && d[k]) {
      var v = d[k].value;
      out[k] = { value: v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v, confidence: d[k].confidence, p: d[k].p };
    }
    return out;
  }
  // a stretch of the stem for a sampler: the loudest hit with 80 ms or more to the next one (start and end as 0..1)
  function sliceOf(m, hits) {
    if (!hits.length) return { start: 0, end: 0, at: null };
    var best = null;
    for (var i = 0; i < hits.length; i++) {
      var next = i + 1 < hits.length ? hits[i + 1].t : m.duration, gap = next - hits[i].t;
      if (gap < 0.08) continue;
      if (!best || hits[i].peak > best.peak) best = { t: hits[i].t, end: Math.min(next, hits[i].t + 1.0), peak: hits[i].peak };
    }
    if (!best) best = { t: hits[0].t, end: Math.min(m.duration, hits[0].t + 0.25), peak: hits[0].peak };
    var a = Math.max(0, best.t - 0.002);
    return { start: r3(a / m.duration) || 0, end: Math.min(1, r3(best.end / m.duration)), at: r3(best.t) };
  }
  function midiMedian(v) {
    var ns = []; v.cells.forEach(function (c) { if (c && typeof c.note === 'number') ns.push(c.note); });
    return ns.length ? Math.round(median(ns)) : null;
  }
  function patternConfidence(kind, st, tempoConf) {
    var p;
    if (kind === 'melody') p = st.notes ? clamp(0.4 + 0.5 * Math.min(1, st.voicedSteps / Math.max(1, st.notes * 2)), 0, 0.9) : 0;
    else p = st.onsets ? clamp(st.onGrid, 0, 1) * 0.9 : 0;
    p = Math.round(p * clamp(tempoConf == null ? 0.5 : 0.4 + 0.6 * tempoConf, 0, 1) * 100) / 100;
    return { p: p, confidence: word(p) };
  }
  // one element -> a track definition (o: {buffer, bpm, offset, bars, tempoConf, used})
  function trackFor(el, o) {
    var rec = el.recreation && el.recreation.type && knownType(el.recreation.type) ? el.recreation : null, unver = [];
    var type = rec ? rec.type : 'sampler', percussive = !!(el.decisions && el.decisions.drumMachine) || el.role === 'drums';
    var buf = o.buffer, m = null;
    try { m = buf ? input(buf) : null; } catch (e) { m = null; }
    var go = { bpm: o.bpm, offset: o.offset, bars: o.bars }, def, pat = null, kind, method, params = {};
    if (!rec && el.recreation && el.recreation.type) unver.push('the suggested type ' + el.recreation.type + ' is not an engine instrument: a sampler holds the stem');
    if (type === 'sampler') {
      if (!m) { kind = 'drum'; method = 'none'; unver.push('no audio for the element: empty pattern'); }
      else if (!rec) {
        // no recreation: the stem itself, started on bar 1 and left to play (one hit spanning the section)
        kind = 'drum'; method = 'stem playback';
        var cells = emptyCells(o.bars * STEPS); cells[0] = { vel: 1 };
        pat = { bars: o.bars, cells: cells, stats: { onsets: 1, onGrid: 1, kept: 1 } };
        params = { buffer: el.source ? el.source.audio : '', start: r3(clamp(o.offset / m.duration, 0, 1)), gate: 0 };
        unver.push('no recreation was suggested: the track plays the stem from bar 1 (not a recreation)');
      } else if (percussive || el.recreation.params && el.recreation.params.slice) {
        kind = 'drum'; method = 'steps'; pat = steps(m, go);
        var sl = sliceOf(m, onsets(m));
        params = { buffer: el.source ? el.source.audio : '', start: sl.start, end: sl.end, gate: 0 };
        unver.push('the sampler plays one hit cut from the ' + (el.band ? 'whole stem (other bands sound in it too)' : 'stem') + ' at ' + sl.at + ' s');
      } else {
        kind = 'melody'; method = 'notes'; pat = notes(m, go);
        var root_ = (el.recreation.params && el.recreation.params.root) || midiMedian(pat) || 48;
        var sl2 = sliceOf(m, onsets(m));
        params = { buffer: el.source ? el.source.audio : '', start: sl2.start, end: sl2.end, pitch: clamp(48 - root_, -24, 24), gate: 1 };
        unver.push('the sampler plays one note cut from the stem at ' + sl2.at + ' s, taken as MIDI ' + root_);
      }
    } else if (isDrumType(type)) {
      kind = 'drum'; method = 'steps'; params = paramsFor(type, rec.params);
      if (m) pat = steps(m, go); else unver.push('no audio for the element: empty pattern');
    } else {
      kind = 'melody'; method = 'notes'; params = paramsFor(type, rec.params);
      if (m) pat = notes(m, go); else unver.push('no audio for the element: empty pattern');
      if (type === 'juno' || (el.decisions && el.decisions.monoPoly && el.decisions.monoPoly.value === 'poly')) unver.push('several pitches sound at once: the pattern is a mono line read from a poly part (chords are not transcribed)');
    }
    if (!pat) pat = { bars: o.bars, cells: emptyCells(o.bars * STEPS), stats: { onsets: 0, notes: 0 } };
    var variant = { bars: pat.bars, cells: pat.cells }, folded = null;
    if (method === 'steps' || method === 'notes') {
      var f = fold(variant, { kind: kind, agree: 0.9 });
      if (f) { folded = { bars: f.bars, agreement: f.agreement, from: pat.bars }; variant = { bars: f.bars, cells: f.cells }; }
    }
    var pc = method === 'stem playback' ? { p: 1, confidence: 'high' } : patternConfidence(kind, pat.stats || {}, o.tempoConf);
    var name = uniqueName(baseNameFor(el), o.used);
    def = { name: name, inst: type, kind: kind, gain: 0.8, params: params, variants: { A: variant } };
    if (type === 'sampler') { def.type = 'sampler'; def.family = percussive || method === 'stem playback' ? 'drums' : 'keys'; }
    if (kind === 'melody') def.gate = 1;
    def.analysis = {
      element: el.id, stem: el.stem || null, band: el.band || null,
      recreation: { type: type, suggested: el.recreation ? el.recreation.type : null, confidence: el.recreation ? el.recreation.confidence : 'none', why: el.recreation ? (el.recreation.why || []).slice() : [] },
      decisions: decisionSummary(el.decisions || {}),
      pattern: { method: method, confidence: pc.confidence, p: pc.p, stats: pat.stats || {}, folded: folded, bpm: o.bpm, offset: o.offset },
      unverified: unver
    };
    return def;
  }
  // analysis -> {tracks, sections, bars}. o.buffers: {elementId: audio} (the element's own audio: a stem or a band of
  // one); o.existing: track names already taken; o.bars overrides the section length.
  function build(analysis, o) {
    o = o || {};
    if (!analysis || !isArr(analysis.elements)) throw new Error('Importer.build: an analysis with elements is required');
    var bpmO = analysis.bpm || {}, bpm = bpmO.value > 0 ? bpmO.value : 120, off = typeof bpmO.offset === 'number' ? bpmO.offset : (analysis.offset || 0);
    var dur = analysis.source && analysis.source.duration > 0 ? analysis.source.duration : null, bars = o.bars;
    if (!(bars > 0)) {
      var bufs = o.buffers || {}, any = null;
      for (var k in bufs) if (has(bufs, k) && bufs[k]) { try { any = input(bufs[k]); } catch (e) { any = null; } if (any) break; }
      var d = dur || (any ? any.duration : 16 * 240 / bpm);
      bars = barsFor(d, off, bpm);
    }
    var used = {}; (o.existing || []).forEach(function (n) { used[n] = true; });
    var tracks = [], play = {};
    analysis.elements.forEach(function (el) {
      var t = trackFor(el, { buffer: (o.buffers || {})[el.id] || null, bpm: bpm, offset: off, bars: bars, tempoConf: bpmO.confidence, used: used });
      tracks.push(t); play[t.name] = 'A';
    });
    return { tracks: tracks, sections: [{ name: o.section || 'import', bars: bars, play: play }], bars: bars };
  }

  root.Importer = { version: 1, tempo: tempo, steps: steps, notes: notes, build: build, fold: fold, loudness: loudness, onsets: function (b, o) { return onsets(input(b), o); },
                    trackFor: trackFor, knownType: knownType, isDrumType: isDrumType, LOUDNESS_MEASURE: MEASURE, _kFilters: kFilters };
})();
