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
    return res;
  }

  // formant movement across notes: notes = [{x: segment, f0: Hz}]; log-log slope of the envelope peak against f0.
  // 1 = the envelope moves with pitch (a transposed sample), 0 = a fixed filter (a synth). Needs 3 or more pitches.
  function formantSlope(notes, sr) {
    if (!notes || notes.length < 3) return NaN;
    var X = [], Y = [], size = 1 << 16, i, k;
    for (i = 0; i < notes.length; i++) {
      var f0 = notes[i].f0, ms = D.magSpec(notes[i].x, size), best = -1, bk = 1;
      for (k = 1; k * f0 < Math.min(8000, sr / 2); k++) { var a = ms[Math.round(k * f0 / sr * size)] * k; if (a > best) { best = a; bk = k; } }
      X.push(Math.log(f0)); Y.push(Math.log(bk * f0));
    }
    var mx = 0, my = 0, sxy = 0, sxx = 0;
    for (i = 0; i < X.length; i++) { mx += X[i]; my += Y[i]; } mx /= X.length; my /= Y.length;
    for (i = 0; i < X.length; i++) { sxy += (X[i] - mx) * (Y[i] - my); sxx += (X[i] - mx) * (X[i] - mx); }
    return sxx > 0 ? sxy / sxx : NaN;
  }

  // ------------------------------------------------------------ reverb (decision D)
  function energySeq(L, R, a) { var n = L.length - a, e = new Float64Array(Math.max(0, n)), i; for (i = 0; i < n; i++) e[i] = L[a + i] * L[a + i] + (R ? R[a + i] * R[a + i] : L[a + i] * L[a + i]); return e; }
  // free decay after the last hit: early slope (EDC -1..-11 dB), late slope (-25..-45 dB), time to -60 dB, and the late RT
  // in three bands. A reverb shows as a late slope far longer than the early one; dry hits end with a short late slope.
  function freeDecay(L, R, sr, o) {
    o = o || {};
    var m = D.mono(L, R), on = D.onsets(m, sr), res = { lastOnset: NaN, early: NaN, late: NaN, to60: NaN, reached45: false, bands: [] };
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
    return res;
  }

  // pre-delay: lag of the first 6 dB rise of the side channel (wet) behind the mid-channel (dry) onset, from aligned
  // averages of all hits. Valid only for a centred dry source: if the dry side/mid in the first 3 ms is above -30 dB
  // (a panned or wide source) the value is null with that reason (L1 transcript 6.2.3: the panned hat read 0.8 ms).
  function predelay(L, R, sr) {
    if (!R) return { ms: null, reason: 'mono file: no side channel' };
    var M = D.mono(L, R), S = D.side(L, R), on = D.onsets(M, sr, { rearm: 20 }), n = Math.round(0.06 * sr), pre = 200, i, k;
    var em = new Float64Array(n), es = new Float64Array(n), dm = 0, ds = 0, w3 = Math.round(0.003 * sr), c = 0;
    for (i = 0; i < on.length - 1; i++) {
      var a = on[i] - pre; if (a < 0 || a + n > M.length) continue;
      for (k = 0; k < n; k++) { em[k] += M[a + k] * M[a + k]; es[k] += S[a + k] * S[a + k]; }
      dm += D.energy(M, on[i], on[i] + w3); ds += Math.max(0, D.energy(S, on[i], on[i] + w3) - D.energy(S, on[i] - w3, on[i])); c++;   // side added by the hit, not earlier tails
    }
    if (c < 2) return { ms: null, reason: 'fewer than 3 hits' };
    var dryRatio = D.db(ds / (dm + 1e-30));
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
    var fd = freeDecay(L, R, sr), a = Math.round(fd.lastOnset * sr), sig = { rt: fd.bands.map(function (b) { return b.late; }), colour: [], headDb: [], lrCorr: NaN, late: fd.late };
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

  A.features = { BANDS: BANDS, hits: hits, identity: identity, formantSlope: formantSlope, freeDecay: freeDecay, predelay: predelay, tailSignature: tailSignature };
})();
