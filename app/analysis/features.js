/* Havantechno analysis - features.js
 * Global `Analysis.features`: measurements on one element (a solo, a stem or a separated source), given as
 * channel arrays L, R (R may be omitted for mono) at sample rate sr. Methods and their tests: docs/research/
 * 2026-11-09-lab-crew/transcripts/L1-methods.md sections 3 (identity) and 6 (reverb). Needs Analysis.dsp.
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var A = root.Analysis = root.Analysis || {};
  var D = A.dsp;
  if (!D) throw new Error('Analysis.features: load dsp.js first');

  var BANDS = [[20, 300], [300, 3000], [3000, 16000]];

  // cut hits of length win seconds starting 32 samples before each onset; `det` is the signal onsets are found on
  function cut(x, on, n) { var out = [], i; for (i = 0; i < on.length; i++) { var a = on[i] - 32; if (a > 0 && a + n <= x.length) out.push(x.subarray ? x.subarray(a, a + n) : x.slice(a, a + n)); } return out; }
  function hits(L, R, sr, o) {
    o = o || {};
    var m = D.mono(L, R), det = o.detect || m, on = D.onsets(det, sr, o.onsets), n = Math.round((o.win || 0.15) * sr);
    return { onsets: on, mono: m, n: n, segs: cut(m, on, n) };
  }

  // twin statistics over prepared segments: for each of the first nh segments, the best NCC against any other
  function twinOf(prepped, maxLag) {
    var best = [], i, j;
    for (i = 0; i < prepped.length; i++) {
      var b = -1;
      for (j = 0; j < prepped.length; j++) if (j !== i) b = Math.max(b, D.nccPrep(prepped[i], prepped[j], maxLag));
      best.push(b);
    }
    return D.median(best);
  }

  // Decision A's measurements. Returns per-band median pair NCC and twin, the overall twin (300 Hz - 16 kHz),
  // the pitch-normalised twin (partners resampled by 2^(n/12), n = -7..7), the residual after the best scaled,
  // aligned twin (dB re the hit), the hit count, and the spectral flatness of 3-16 kHz in the hits (noise ~ 0.3+).
  function identity(L, R, sr, o) {
    o = o || {};
    var h = hits(L, R, sr, o), on = h.onsets, n = h.n, maxLag = Math.round(0.010 * sr), nh = o.maxHits || 24;
    var res = { nHits: h.segs.length, bands: [], twin: NaN, pitchTwin: NaN, residualDb: NaN, hfFlatness: NaN };
    if (h.segs.length < 3) return res;
    var size = D.nextPow2(2 * n), rnd = D.rng(o.seed || 1), tot = 0, i, j, k;
    var bandSig = BANDS.map(function (b) { return D.band(h.mono, b[0], Math.min(b[1], sr * 0.49), sr, 4); });
    var eb = bandSig.map(function (x) { var s = 0; for (var q = 0; q < h.segs.length; q++) s += D.energy(x, on[q] - 32, on[q] - 32 + n); return s; });
    for (i = 0; i < eb.length; i++) tot += eb[i];
    for (k = 0; k < BANDS.length; k++) {
      var share = D.db(eb[k] / tot), entry = { lo: BANDS[k][0], hi: BANDS[k][1], shareDb: share, pairs: NaN, twin: NaN };
      if (share > -30) {
        var segs = cut(bandSig[k], on, n), P = segs.slice(0, Math.max(nh, 3)).map(function (s) { return D.prep(s, size); }), vals = [];
        for (i = 0; i < 40; i++) {
          var a = Math.floor(rnd() * P.length), b = Math.floor(rnd() * P.length);
          if (a === b) b = (b + 1) % P.length;
          vals.push(D.nccPrep(P[a], P[b], maxLag));
        }
        entry.pairs = D.median(vals); entry.twin = twinOf(P, maxLag);
      }
      res.bands.push(entry);
    }
    // overall twin and pitch twin, 300 Hz - 16 kHz
    var hiSig = D.band(h.mono, 300, Math.min(16000, sr * 0.49), sr, 4), hs = cut(hiSig, on, n);
    var Ph = hs.slice(0, nh).map(function (s) { return D.prep(s, size); });
    res.twin = twinOf(Ph, maxLag);
    var np = Math.min(10, hs.length), ratios = [], bestP = [];
    for (i = -7; i <= 7; i++) ratios.push(Math.pow(2, i / 12));
    var Pr = [];
    for (j = 0; j < np; j++) Pr.push(ratios.map(function (r) { var s = r === 1 ? hs[j] : D.resample(hs[j], r); return D.prep(s.length > n ? s.subarray(0, n) : s, size); }));
    for (i = 0; i < np; i++) {
      var bb = -1;
      for (j = 0; j < np; j++) if (j !== i) for (k = 0; k < ratios.length; k++) bb = Math.max(bb, D.nccPrep(Pr[i][7], Pr[j][k], maxLag));
      bestP.push(bb);
    }
    res.pitchTwin = D.median(bestP);
    // residual after the best scaled, aligned twin, full band, first 16 hits
    var F = h.segs.slice(0, 16), PF = F.map(function (s) { return D.prep(s, size); }), rr = [];
    for (i = 0; i < F.length; i++) {
      var best = 0;
      for (j = 0; j < F.length; j++) {
        if (i === j) continue;
        var lag = D.bestLag(PF[i], PF[j]), num = 0, den = 0, e = 0, t, v;
        for (t = 0; t < n; t++) { v = (t - lag >= 0 && t - lag < n) ? F[j][t - lag] : 0; num += F[i][t] * v; den += v * v; }
        var g = den > 0 ? num / den : 0, ea = 0;
        for (t = 0; t < n; t++) { v = (t - lag >= 0 && t - lag < n) ? F[j][t - lag] : 0; e += (F[i][t] - g * v) * (F[i][t] - g * v); ea += F[i][t] * F[i][t]; }
        best = Math.min(best, D.db(e / (ea + 1e-30)));
      }
      rr.push(best);
    }
    res.residualDb = D.median(rr);
    // spectral flatness of 3-16 kHz, averaged magnitude over the first 8 hits (fresh or frozen noise is flat; harmonics are not)
    var fs = 8192, acc = new Float64Array(fs / 2 + 1);
    for (i = 0; i < Math.min(8, h.segs.length); i++) { var ms = D.magSpec(h.segs[i], fs); for (k = 0; k < acc.length; k++) acc[k] += ms[k] * ms[k]; }
    var k0 = Math.round(3000 / sr * fs), k1 = Math.min(acc.length - 1, Math.round(16000 / sr * fs)), lg = 0, ar = 0, c = 0;
    for (k = k0; k <= k1; k++) { lg += Math.log(acc[k] + 1e-30); ar += acc[k]; c++; }
    res.hfFlatness = Math.exp(lg / c) / (ar / c + 1e-30);
    res.hfShareDb = res.bands[2].shareDb;
    // pitches per hit and the formant test (L2): only with 3 or more distinct semitones among clearly pitched hits
    if (o.formant !== false) {
      var hp = hitPitches(L, R, sr, { hits: h });
      res.pitchedHits = hp.notes.length; res.distinctPitches = hp.distinct;
      res.formantSlope = hp.distinct >= 3 ? formantSlope(hp.notes.slice(0, 16), sr) : NaN;
    }
    return res;
  }

  // fundamental frequency of one segment by YIN's cumulative-mean-normalised difference (de Cheveigne and Kawahara,
  // JASA 2002), threshold 0.15, parabolic refinement. Returns {f0, clarity (1 - d'), } or f0 NaN when unvoiced.
  function yin(x, sr, fmin, fmax) {
    fmin = fmin || 30; fmax = fmax || 1500;
    var W = Math.min(x.length >> 1, Math.round(sr / fmin) * 2), tmax = Math.min(W, Math.round(sr / fmin)), tmin = Math.max(2, Math.floor(sr / fmax));
    if (W < tmax || tmax <= tmin + 2) return { f0: NaN, clarity: 0 };
    var d = new Float64Array(tmax + 1), t, j, run = 0, best = -1;
    for (t = 1; t <= tmax; t++) { var s = 0; for (j = 0; j < W; j++) { var v = x[j] - x[j + t]; s += v * v; } d[t] = s; }
    var dn = new Float64Array(tmax + 1); dn[0] = 1;
    for (t = 1; t <= tmax; t++) { run += d[t]; dn[t] = run > 0 ? d[t] * t / run : 1; }
    for (t = tmin; t < tmax; t++) if (dn[t] < 0.15) { while (t + 1 < tmax && dn[t + 1] < dn[t]) t++; best = t; break; }
    if (best < 0) { var mv = Infinity; for (t = tmin; t < tmax; t++) if (dn[t] < mv) { mv = dn[t]; best = t; } if (mv > 0.35) return { f0: NaN, clarity: 1 - mv }; }
    var a = dn[best - 1], b = dn[best], c = dn[best + 1], den = a - 2 * b + c, sh = den > 0 ? 0.5 * (a - c) / den : 0;
    return { f0: sr / (best + sh), clarity: 1 - b };
  }

  // notes of a pitched element: per hit, YIN on 80 ms starting 20 ms after the onset. Returns
  // {notes: [{x, f0, at}], distinct: count of distinct semitones}. Used for the formant test (decision A).
  function hitPitches(L, R, sr, o) {
    var h = (o && o.hits) || hits(L, R, sr, o), n = Math.round(0.08 * sr), skip = Math.round(0.02 * sr), out = [], semis = {}, i;
    for (i = 0; i < h.onsets.length && out.length < 40; i++) {
      var a = h.onsets[i] + skip; if (a + 2 * n > h.mono.length) continue;
      var seg = h.mono.subarray ? h.mono.subarray(a, a + 2 * n) : h.mono.slice(a, a + 2 * n), y = yin(seg, sr);
      if (y.f0 === y.f0 && y.clarity > 0.8) {
        var o0 = h.onsets[i], o1 = Math.min(h.mono.length, o0 + Math.round(0.5 * sr));
        out.push({ x: seg.subarray ? seg.subarray(0, n) : seg.slice(0, n), f0: y.f0, at: o0 / sr, full: h.mono.subarray ? h.mono.subarray(o0, o1) : h.mono.slice(o0, o1) });
        semis[Math.round(12 * Math.log(y.f0 / 440) / Math.LN2)] = 1;
      }
    }
    return { notes: out, distinct: Object.keys(semis).length };
  }

  // formant movement across notes: notes = [{x: segment, f0: Hz}] at 3 or more pitches. L2 (2026-11-11) replaced
  // L1's peak-harmonic slope, which was fragile (an FM sample transposed over a fifth read 0.42): per note the harmonic
  // amplitudes (dB, harmonics 1..40 under 10 kHz) are compared pairwise two ways, aligned by harmonic number (a
  // transposed recording keeps its harmonic profile) and aligned in Hz (a fixed filter keeps its curve in Hz), each after
  // removing the level offset. Returns s = errHz / (errHz + errHarm): 1 = the profile moves with pitch (a transposed
  // sample, but also FM or a key-tracked filter), 0 = a fixed spectral envelope (a synth with a fixed filter, or a
  // multi-sampled instrument), 0.5 = no difference (an unfiltered oscillator: undecidable).
  function harmonicsDb(x, f0, sr) {
    var size = 1 << 15, ms = D.magSpec(x, size), out = [], k;
    for (k = 1; k <= 40 && k * f0 < Math.min(10000, sr * 0.45); k++) {
      var c = k * f0 / sr * size, lo = Math.floor(c * 0.97), hi = Math.ceil(c * 1.03), m = 0, j;
      for (j = lo; j <= hi; j++) if (ms[j] > m) m = ms[j];
      out.push(20 * Math.log10(m + 1e-12));
    }
    // harmonics more than 40 dB under the strongest are window leakage and noise: left out (NaN)
    var mx = -Infinity; for (k = 0; k < out.length; k++) if (out[k] > mx) mx = out[k];
    for (k = 0; k < out.length; k++) if (out[k] < mx - 40) out[k] = NaN;
    return out;
  }
  function interpLog(H, f0, f) { var p = f / f0 - 1, i = Math.floor(p); if (p < 0 || i + 1 >= H.length) return NaN; return H[i] + (H[i + 1] - H[i]) * (p - i); }   // NaN-propagating
  function offsetRms(a, b) {
    var n = 0, m = 0, i, e = 0; for (i = 0; i < a.length; i++) if (a[i] === a[i] && b[i] === b[i]) { m += a[i] - b[i]; n++; }
    if (n < 4) return NaN; m /= n;
    for (i = 0; i < a.length; i++) if (a[i] === a[i] && b[i] === b[i]) e += (a[i] - b[i] - m) * (a[i] - b[i] - m);
    return Math.sqrt(e / n);
  }
  function formantSlope(notes, sr) {
    if (!notes || notes.length < 3) return NaN;
    // Hz hypothesis: the same wall-clock window for every note (a synth's envelopes run in seconds). Harmonic hypothesis:
    // the same window in the recording's own time, which a sampler scales by the transposition (a note r times higher
    // plays its recording r times faster), so a decaying timbre is compared at the same point of the recording.
    var lf = 0; notes.forEach(function (n) { lf += Math.log(n.f0); }); var fref = Math.exp(lf / notes.length);
    function win(n, scale) {
      if (!n.full) return n.x;
      var a = Math.round(0.02 * sr * scale), b = a + Math.round(0.08 * sr * scale);
      return b <= n.full.length ? (n.full.subarray ? n.full.subarray(a, b) : n.full.slice(a, b)) : n.x;
    }
    var Hz = notes.map(function (n) { return harmonicsDb(win(n, 1), n.f0, sr); });
    var H = notes.map(function (n) { return harmonicsDb(win(n, fref / n.f0), n.f0, sr); }), eh = 0, ez = 0, c = 0, i, j, k;
    for (i = 0; i < notes.length; i++) for (j = i + 1; j < notes.length; j++) {
      var r = notes[i].f0 / notes[j].f0; if (Math.abs(Math.log(r)) < 0.04) continue;   // same pitch: no information
      var lo = Math.max(notes[i].f0, notes[j].f0), hi = Math.min(notes[i].f0 * Hz[i].length, notes[j].f0 * Hz[j].length), A = [], B = [];
      for (k = 0; k < 24; k++) { var f = lo * Math.pow(hi / lo, k / 23); A.push(interpLog(Hz[i], notes[i].f0, f)); B.push(interpLog(Hz[j], notes[j].f0, f)); }
      var dz = offsetRms(A, B), dh = offsetRms(H[i].slice(0, Math.min(H[i].length, H[j].length)), H[j].slice(0, Math.min(H[i].length, H[j].length)));
      if (dz === dz && dh === dh) { ez += dz; eh += dh; c++; }
    }
    return c ? ez / (ez + eh + 1e-9) : NaN;
  }

  // ------------------------------------------------------------ polyphony (decision B), L2
  // spectral peaks of a magnitude spectrum: [{f, a}] (linear amplitude, parabolic interpolation on dB), strongest first,
  // local maxima within `floorDb` of the strongest
  function specPeaks(ms, sr, size, floorDb, fmax) {
    var mx = 0, k, out = [], top = Math.min(ms.length - 2, Math.round((fmax || 5000) / sr * size));
    for (k = 2; k < top; k++) if (ms[k] > mx) mx = ms[k];
    var thr = mx * Math.pow(10, -(floorDb || 50) / 20);
    for (k = 2; k < top; k++) if (ms[k] > thr && ms[k] >= ms[k - 1] && ms[k] > ms[k + 1]) {
      var a = 20 * Math.log10(ms[k - 1] + 1e-12), b = 20 * Math.log10(ms[k] + 1e-12), c = 20 * Math.log10(ms[k + 1] + 1e-12), d = a - 2 * b + c, p = d < 0 ? 0.5 * (a - c) / d : 0;
      out.push({ f: (k + p) * sr / size, a: Math.pow(10, (b - 0.25 * (a - c) * p) / 20) });
    }
    out.sort(function (x, y) { return y.a - x.a; });
    return out;
  }
  // iterative multiple-F0 estimation on one frame (Klapuri 2003's estimate-and-cancel with spectral smoothness, as L1
  // tested it): candidates are each strong peak divided by 1..4 (30 to 2000 Hz); salience = sum of matched harmonic
  // amplitudes (tolerance 1.2 % or 1.5 bins) over sqrt(k); a candidate needs its fundamental, or its 2nd and 3rd
  // harmonics; the winner's harmonics are reduced by at most the mean of their neighbours (smoothness), so a partial
  // shared with another note keeps the rest; repeat until the salience falls under `stop` (0.25; L1's 0.12 over-counted every chord here) of the first. F0s within
  // 50 cents merge (a detuned pair is one note).
  function multiF0(ms, sr, size, o) {
    o = o || {};
    var P = specPeaks(ms, sr, size, o.floorDb || 45, o.fmax || 6000).slice(0, 60), out = [], first = 0, it, i, k;
    if (!P.length) return out;
    var bin = sr / size;
    function match(f, k) { var tol = Math.max(0.012 * k * f, 1.5 * bin), best = -1, bd = Infinity; for (var j = 0; j < P.length; j++) { var d = Math.abs(P[j].f - k * f); if (d < tol && d < bd) { bd = d; best = j; } } return best; }
    for (it = 0; it < (o.max || 8); it++) {
      var cands = [], seen = {};
      for (i = 0; i < Math.min(P.length, 20); i++) for (k = 1; k <= 4; k++) { var f = P[i].f / k; if (f >= 30 && f <= 2000 && P[i].a > 0) { var key = Math.round(48 * Math.log(f) / Math.LN2); if (!seen[key]) { seen[key] = 1; cands.push(f); } } }
      var bestF = 0, bestS = 0, bestM = null;
      cands.forEach(function (f) {
        var m = [], s = 0, kk;
        for (kk = 1; kk <= 12 && kk * f < (o.fmax || 6000); kk++) { var j = match(f, kk); m.push(j); if (j >= 0) s += P[j].a / Math.sqrt(kk); }
        if (!(m[0] >= 0 && P[m[0]].a > 0) && !(m[1] >= 0 && m[2] >= 0 && P[m[1]].a > 0 && P[m[2]].a > 0)) return;
        if (s > bestS) { bestS = s; bestF = f; bestM = m; }
      });
      if (!bestM || (first && bestS < (o.stop || 0.25) * first)) break;
      if (!first) first = bestS;
      // refine the F0 from the matched harmonics (amplitude-weighted)
      var num = 0, den = 0;
      bestM.forEach(function (j, q) { if (j >= 0) { num += P[j].a * P[j].f / (q + 1); den += P[j].a; } });
      var f0 = den ? num / den : bestF;
      var amps = bestM.map(function (j) { return j >= 0 ? P[j].a : 0; });
      bestM.forEach(function (j, q) { if (j < 0) return; var nb = [], v; if (q > 0) nb.push(amps[q - 1]); if (q + 1 < amps.length) nb.push(amps[q + 1]); v = nb.length ? nb.reduce(function (x, y) { return x + y; }, 0) / nb.length : amps[q]; P[j].a = Math.max(0, P[j].a - Math.min(P[j].a, Math.max(v, q === 0 ? P[j].a : 0))); });
      out.push({ f0: f0, salience: bestS });
    }
    out.sort(function (x, y) { return x.f0 - y.f0; });
    var merged = [];
    out.forEach(function (n) { var last = merged[merged.length - 1]; if (last && Math.abs(1200 * Math.log(n.f0 / last.f0) / Math.LN2) < 50) { if (n.salience > last.salience) merged[merged.length - 1] = n; } else merged.push(n); });
    return merged;
  }
  // polyphony of an element: multi-F0 on 93 ms Hann frames (zero-padded to 16384) every 46 ms (sweep on the truth set:
  // 186 ms frames scored 17 of 29 exact counts, 93 ms 21 of 29) where the frame is within
  // 30 dB of the loudest frame. Returns {frames: [[Hz]], counts, median, p90, maxCount, notes: {midi: frameCount},
  // frameCount, single (share of frames with one pitch class), multi (share with two or more), octaveLayered}.
  function polyphony(L, R, sr, o) {
    o = o || {};
    var m = D.mono(L, R), N = o.frame || 4096, hop = N >> 1, size = o.size || 16384, e = [], i, k, frames = [], counts = [], octs = [], notes = {};
    for (i = 0; i + N <= m.length; i += hop) e.push(D.energy(m, i, i + N));
    var mx = 0; e.forEach(function (v) { if (v > mx) mx = v; });
    var maxFrames = o.maxFrames || 160, idx = [];
    for (k = 0; k < e.length; k++) if (e[k] > mx * 1e-3) idx.push(k);
    var stepI = Math.max(1, Math.ceil(idx.length / maxFrames));
    for (k = 0; k < idx.length; k += stepI) {
      var a = idx[k] * hop, ms = D.magSpec(m.subarray ? m.subarray(a, a + N) : m.slice(a, a + N), size), f = multiF0(ms, sr, size, o).map(function (n) { return n.f0; });
      // count pitch classes, not F0s: a note with a sub-octave oscillator (the engine's bass, the juno's sub) or an octave
      // layer is one voice to this decision; the octave layering is reported separately
      var pcs = {}, oct = 0;
      f.forEach(function (hz) { var mi = Math.round(69 + 12 * Math.log(hz / 440) / Math.LN2), pc = ((mi % 12) + 12) % 12; if (pcs[pc]) oct++; pcs[pc] = 1; });
      frames.push(f); counts.push(Object.keys(pcs).length); octs.push(oct);
      f.forEach(function (hz) { var mi = Math.round(69 + 12 * Math.log(hz / 440) / Math.LN2); notes[mi] = (notes[mi] || 0) + 1; });
    }
    var sc = counts.slice().sort(function (x, y) { return x - y; });
    return { frames: frames, counts: counts, frameCount: counts.length, median: D.median(counts), p90: sc.length ? sc[Math.floor(0.9 * (sc.length - 1))] : NaN,
             maxCount: sc.length ? sc[sc.length - 1] : 0, notes: notes, single: counts.filter(function (c) { return c === 1; }).length / (counts.length || 1),
             octaveLayered: octs.filter(function (c) { return c > 0; }).length / (octs.length || 1),
             multi: counts.filter(function (c) { return c >= 2; }).length / (counts.length || 1) };
  }

  // ------------------------------------------------------------ FM against subtractive (decision C), L2
  // L1's model comparison (transcript 5.1): per note, harmonic-amplitude frames (40 ms Hann, every 10 ms, 10 to 400 ms
  // after the onset, within 30 dB of the note's loudest frame); per frame the best member of each family with one free
  // parameter (FM: the index 0..12 for a fixed carrier:modulator pair; subtractive: the cutoff of a 2-pole resonant
  // lowpass on a saw or a square, fixed Q); the family's error is the median over frames of the mean absolute dB error
  // over harmonics within 40 dB of the frame's strongest, level offset removed; the global choices (ratio pair, wave,
  // Q) are the ones with the lowest error. Before that, an inharmonicity check: the energy-weighted deviation of spectral
  // peaks (60 to 160 ms after the onset, after attack transients) from the harmonic series of the YIN pitch, in cents.
  var NH = 16, BES = null, IGRID = [];
  function besselTable() {
    if (BES) return BES;
    BES = []; var ii, n, j, M = 96;
    for (ii = 0; ii <= 120; ii++) IGRID.push(ii / 10);
    for (ii = 0; ii < IGRID.length; ii++) {
      var row = {}, x = IGRID[ii];
      for (n = -24; n <= 24; n++) { var sum = 0; for (j = 0; j <= M; j++) { var tau = Math.PI * j / M, w = (j === 0 || j === M) ? 0.5 : 1; sum += w * Math.cos(n * tau - x * Math.sin(tau)); } row[n] = sum / M; }
      BES.push(row);
    }
    return BES;
  }
  var FM_PAIRS = [[1, 1], [1, 2], [2, 1], [1, 3], [3, 1], [1, 4], [2, 3], [3, 2]];
  // harmonic amplitudes (linear) of a c:m FM pair at index row b, harmonics 1..NH of the fundamental gcd
  // The modulator's phase matters where sidebands fold over zero: frequency modulation by a sine starting at phase 0
  // (a Web Audio oscillator on a frequency AudioParam, a DX operator) is phase modulation by -cos, so sideband n carries
  // phase -n*pi/2 and a folded sideband the conjugate. Both phases (0 and pi/2) are tried; the better fit is kept.
  function fmHarm(c, m, b, phi) {
    var re = new Float64Array(NH + 1), im = new Float64Array(NH + 1), n;
    for (n = -24; n <= 24; n++) {
      var k = c + n * m, cr = Math.cos(n * phi), ci = -Math.sin(n * phi);
      if (k > 0 && k <= NH) { re[k] += b[n] * cr; im[k] += b[n] * ci; }
      else if (k < 0 && -k <= NH) { re[-k] -= b[n] * cr; im[-k] += b[n] * ci; }
    }
    var out = []; for (n = 1; n <= NH; n++) out.push(Math.sqrt(re[n] * re[n] + im[n] * im[n])); return out;
  }
  function subHarm(wave, q, w0) {   // w0 = f0 / cutoff
    var out = [], k;
    for (k = 1; k <= NH; k++) { var a = (wave === 'square' && k % 2 === 0) ? 0 : 1 / k, w = k * w0, H = 1 / Math.sqrt((1 - w * w) * (1 - w * w) + (w / q) * (w / q)); out.push(a * H); }
    return out;
  }
  function frameErr(obs, model) {   // obs, model: dB arrays (NaN = ignored); level offset removed; model clipped at -60 re its max
    var mx = -Infinity, i, d = [], n = 0, off = 0;
    for (i = 0; i < model.length; i++) if (model[i] > mx) mx = model[i];
    for (i = 0; i < obs.length; i++) if (obs[i] === obs[i]) { var mv = Math.max(model[i], mx - 60); d.push(obs[i] - mv); off += obs[i] - mv; n++; }
    if (n < 4) return NaN; off /= n; var e = 0;
    for (i = 0; i < d.length; i++) e += Math.abs(d[i] - off);
    return e / n;
  }
  function toDbArr(a) { return a.map(function (v) { return 20 * Math.log10(v + 1e-9); }); }
  function fmFit(L, R, sr, o) {
    o = o || {};
    var h = hits(L, R, sr, o), hp = hitPitches(L, R, sr, { hits: h }), res = { notes: 0, frames: 0, inharmonicCents: NaN, fm: null, sub: null };
    var notes = hp.notes.slice(0, o.maxNotes || 6);
    if (!notes.length) return res;
    var B = besselTable(), W = Math.round(0.04 * sr), hopF = Math.round(0.01 * sr), size = 8192, frames = [], dev = 0, devW = 0;
    notes.forEach(function (nt) {
      var x = nt.full, f0 = nt.f0, fr = [], mx = -Infinity, t;
      for (t = Math.round(0.01 * sr); t + W <= Math.min(x.length, Math.round(0.4 * sr)); t += hopF) {
        var ms = D.magSpec(x.subarray ? x.subarray(t, t + W) : x.slice(t, t + W), size), hd = [], e = 0, k;
        for (k = 1; k <= NH; k++) {
          var c = k * f0 / sr * size, lo = Math.max(1, Math.floor(c * 0.97)), hi = Math.min(ms.length - 1, Math.ceil(c * 1.03)), m = 0, j;
          for (j = lo; j <= hi; j++) if (ms[j] > m) m = ms[j];
          hd.push(k * f0 < sr * 0.45 ? 20 * Math.log10(m + 1e-12) : NaN); e += m * m;
        }
        fr.push({ h: hd, e: 10 * Math.log10(e + 1e-24) }); if (fr[fr.length - 1].e > mx) mx = fr[fr.length - 1].e;
      }
      fr.forEach(function (f) { if (f.e > mx - 30) { var top = Math.max.apply(null, f.h.filter(function (v) { return v === v; })), hh = f.h.map(function (v) { return v > top - 40 ? v : NaN; }); if (hh.filter(function (v) { return v === v; }).length >= 4) frames.push(hh); else res.sineFrames = (res.sineFrames || 0) + 1; } });
      // inharmonicity on the first 60 ms: spectral peaks against the harmonic series
      var seg = x.subarray ? x.subarray(Math.round(0.06 * sr), Math.min(x.length, Math.round(0.16 * sr))) : x.slice(Math.round(0.06 * sr), Math.round(0.16 * sr)), sp = specPeaks(D.magSpec(seg, 16384), sr, 16384, 30, Math.min(8000, 20 * f0));
      sp.slice(0, 12).forEach(function (pk) { var k = Math.max(1, Math.round(pk.f / f0)), cents = Math.abs(1200 * Math.log(pk.f / (k * f0)) / Math.LN2); dev += pk.a * pk.a * Math.min(cents, 100); devW += pk.a * pk.a; });
    });
    res.notes = notes.length; res.frames = frames.length; res.inharmonicCents = devW ? dev / devW : NaN; res.f0s = notes.map(function (n) { return Math.round(n.f0 * 10) / 10; });
    if (frames.length < 3) return res;
    // FM family
    var bestFm = null;
    FM_PAIRS.forEach(function (pr) { [0, Math.PI / 2].forEach(function (phi) {
      var models = B.map(function (b) { return toDbArr(fmHarm(pr[0], pr[1], b, phi)); }), errs = [], idx = [];
      frames.forEach(function (f) { var be = Infinity, bi = 0; models.forEach(function (m, i) { var e = frameErr(f, m); if (e < be) { be = e; bi = i; } }); if (be < Infinity) { errs.push(be); idx.push(IGRID[bi]); } });
      var med = D.median(errs);
      if (med === med && (!bestFm || med < bestFm.err)) bestFm = { err: med, pair: pr, ratio: pr[1] / pr[0], phase: phi, indexStart: D.median(idx.slice(0, 3)), indexEnd: D.median(idx.slice(-3)) };
    }); });
    // subtractive family
    var bestSub = null, W0 = []; for (var g = 0; g < 48; g++) W0.push(Math.pow(2, -5.5 + 8.5 * g / 47));   // f0/cutoff from 1/45 to 2
    ['saw', 'square'].forEach(function (wave) { [0.7, 1.5, 3, 6, 12].forEach(function (q) {
      var models = W0.map(function (w0) { return toDbArr(subHarm(wave, q, w0)); }), errs = [];
      frames.forEach(function (f) { var be = Infinity; models.forEach(function (m) { var e = frameErr(f, m); if (e < be) be = e; }); if (be < Infinity) errs.push(be); });
      var med = D.median(errs);
      if (med === med && (!bestSub || med < bestSub.err)) bestSub = { err: med, wave: wave, q: q };
    }); });
    res.fm = bestFm; res.sub = bestSub;
    return res;
  }

  // ------------------------------------------------------------ reverb (decision D)
  function energySeq(L, R, a) { var n = L.length - a, e = new Float64Array(Math.max(0, n)), i; for (i = 0; i < n; i++) e[i] = L[a + i] * L[a + i] + (R ? R[a + i] * R[a + i] : L[a + i] * L[a + i]); return e; }
  // free decay after the last hit: early slope (EDC -1..-11 dB), late slope (-25..-45 dB), time to -60 dB, and the late RT
  // in three bands. A reverb shows as a late slope far longer than the early one; dry hits end with a short late slope.
  function freeDecay(L, R, sr, o) {
    o = o || {};
    var m = D.mono(L, R), on = D.onsets(m, sr), res = { lastOnset: NaN, early: NaN, late: NaN, to60: NaN, reached45: false, bands: [], stereo: false, tailCorr: NaN, sideLate: NaN };
    if (!on.length) return res;
    var a = on[on.length - 1], edc = D.schroeder(energySeq(L, R, a)), i;
    res.lastOnset = a / sr; res.early = D.rtFit(edc, sr, -1, -11); res.late = D.rtFit(edc, sr, -25, -45);
    for (i = 0; i < edc.length; i++) if (edc[i] < -60) { res.to60 = i / sr; break; }
    for (i = 0; i < edc.length; i++) if (edc[i] < -45) { res.reached45 = true; break; }
    var B = o.bands || [[300, 1200], [1200, 4000], [4000, 10000]];
    for (i = 0; i < B.length; i++) {
      var bl = D.band(L.subarray ? L.subarray(a) : L.slice(a), B[i][0], B[i][1], sr, 4), br = R ? D.band(R.subarray ? R.subarray(a) : R.slice(a), B[i][0], B[i][1], sr, 4) : null;
      res.bands.push({ lo: B[i][0], hi: B[i][1], late: D.rtFit(D.schroeder(energySeq(bl, br, 0)), sr, -25, -45) });
    }
    // L2: stereo evidence. A reverb tail is decorrelated between channels; an element's own decay (an 808 kick's ring,
    // the 808 clap's built-in noise tail) stays mono. tailCorr = L/R correlation from the EDC's -25 dB point to its -45 dB
    // point (the late window of `late`; from -15 dB the engine's hat still carried its near-mono dry decay, corr 0.97). sideLate = the decay of the side channel alone (EDC -5..-35 dB), which for a centred dry source is the wet
    // signal only; when the element decays more slowly than the reverb, both read the element's decay.
    res.stereo = !!R && R !== L;
    if (res.stereo) {
      var same = true; for (i = a; i < Math.min(L.length, a + 4096); i++) if (L[i] !== R[i]) { same = false; break; }
      if (same) res.stereo = false;
    }
    if (res.stereo) {
      var i15 = -1, i45 = -1;
      for (i = 0; i < edc.length; i++) { if (i15 < 0 && edc[i] < -25) i15 = i; if (edc[i] < -45) { i45 = i; break; } }
      if (i15 >= 0 && i45 > i15 + Math.round(0.02 * sr)) res.tailCorr = D.corr(L.slice(a + i15, a + i45), R.slice(a + i15, a + i45));
      var S = D.side(L.subarray ? L.subarray(a) : L.slice(a), R.subarray ? R.subarray(a) : R.slice(a)), se = new Float64Array(S.length);
      for (i = 0; i < S.length; i++) se[i] = S[i] * S[i];
      res.sideLate = D.rtFit(D.schroeder(se), sr, -5, -35);
    }
    return res;
  }

  // pre-delay: lag of the first 6 dB rise of the side channel (wet) behind the mid-channel (dry) onset, from aligned
  // averages of all hits. Valid only for a centred dry source: if the dry hit's pan gain (side coherent with mid in
  // its first 3 ms) is above -30 dB (a panned source) the value is null with that reason (L1 transcript 6.2.3: the panned hat read 0.8 ms).
  function predelay(L, R, sr) {
    if (!R) return { ms: null, reason: 'mono file: no side channel' };
    var M = D.mono(L, R), S = D.side(L, R), on = D.onsets(M, sr), n = Math.round(0.06 * sr), pre = 200, i, k;
    var em = new Float64Array(n), es = new Float64Array(n), dm = 0, ds = 0, w3 = Math.round(0.003 * sr), c = 0;
    for (i = 0; i < on.length - 1; i++) {
      var a = on[i] - pre; if (a < 0 || a + n > M.length) continue;
      for (k = 0; k < n; k++) { em[k] += M[a + k] * M[a + k]; es[k] += S[a + k] * S[a + k]; }
      for (k = on[i]; k < on[i] + w3; k++) { dm += M[k] * M[k]; ds += S[k] * M[k]; } c++;   // pan gain of the dry hit: side coherent with mid
    }
    if (c < 2) return { ms: null, reason: 'fewer than 3 hits' };
    var dryRatio = 20 * Math.log10(Math.abs(ds) / (dm + 1e-30) + 1e-15);   // |<S,M>|/<M,M>: tails are incoherent with the new hit
    if (dryRatio > -30) return { ms: null, reason: 'dry source is panned or wide (dry side/mid ' + dryRatio.toFixed(1) + ' dB)', dryRatioDb: dryRatio };
    function smooth(v) { var y = new Float64Array(v.length), s, j, q; for (j = 0; j < v.length; j++) { s = 0; q = 0; for (var t = j - 5; t <= j + 5; t++) if (t >= 0 && t < v.length) { s += v[t]; q++; } y[j] = D.db(s / q); } return y; }
    var Lm = smooth(em), Ls = smooth(es), mx = -Infinity, im = 0, is = -1;
    for (k = 0; k < n; k++) if (Lm[k] > mx) mx = Lm[k];
    for (k = 0; k < n; k++) if (Lm[k] > mx - 20) { im = k; break; }
    // the reference is the side level at the dry onset (silence, or earlier hits' tails); the wet onset is the first
    // 3 dB rise above it (6 dB missed dense material where earlier tails fill the side channel)
    var ref = Ls[Math.min(n - 1, im + 5)];
    for (k = im + 5; k < n; k++) if (Ls[k] > ref + 3) { is = k; break; }
    return is < 0 ? { ms: null, reason: 'no wet onset within 60 ms', dryRatioDb: dryRatio } : { ms: 1000 * (is - im) / sr, dryRatioDb: dryRatio };
  }

  // late-tail signature for the shared/element-specific test: late RT in three bands, the tail/head colour over
  // sixteen 1/3-octave bands from 250 Hz with the head level per band (for a linear reverb tail/head is the reverb's
  // own colouring wherever the source has energy; decide.sameReverb compares only bands both sources excite),
  // and the tail's L/R correlation.
  function tailSignature(L, R, sr) {
    var fd = freeDecay(L, R, sr), a = Math.round(fd.lastOnset * sr), sig = { rt: fd.bands.map(function (b) { return b.late; }), colour: [], headDb: [], lrCorr: NaN, late: fd.late,
      stereo: fd.stereo, tailCorr: fd.tailCorr, wideBands: fd.bands.filter(function (b) { return b.late >= 0.3; }).length };
    if (!(a >= 0)) return sig;
    var end = Math.min(L.length, a + sr), Ls = L.slice(a, end), Rs = R ? R.slice(a, end) : null, i;
    var t4 = Math.round(0.4 * sr), h5 = Math.round(0.05 * sr);
    for (i = 0; i < 16; i++) {
      var fc = 250 * Math.pow(2, i / 3), lo = fc / Math.pow(2, 1 / 6), hi = Math.min(fc * Math.pow(2, 1 / 6), sr * 0.49);
      var bl = D.band(Ls, lo, hi, sr, 4), br = Rs ? D.band(Rs, lo, hi, sr, 4) : bl;
      var tail = D.energy(bl, t4, bl.length) + D.energy(br, t4, br.length), head = D.energy(bl, 0, h5) + D.energy(br, 0, h5);
      sig.colour.push(D.db(tail) - D.db(head)); sig.headDb.push(D.db(head));
    }
    if (Rs && Ls.length > t4) sig.lrCorr = D.corr(Ls.slice(t4), Rs.slice(t4));
    return sig;
  }

  A.features = { BANDS: BANDS, hits: hits, identity: identity, yin: yin, specPeaks: specPeaks, multiF0: multiF0, polyphony: polyphony, fmFit: fmFit, hitPitches: hitPitches, formantSlope: formantSlope, freeDecay: freeDecay, predelay: predelay, tailSignature: tailSignature };
})();
