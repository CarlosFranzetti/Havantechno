/* Havantechno analysis - dsp.js
 * Global `Analysis.dsp`: signal helpers for the element classifier (Lab Crew, L1). Plain ES5, no imports;
 * loads in the browser (window) and in Node (globalThis). Pure functions on Float32Array/Float64Array/arrays;
 * nothing here touches Web Audio. Load order: dsp.js -> features.js -> decide.js.
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var A = root.Analysis = root.Analysis || {};

  function f64(n) { return new Float64Array(n); }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function db(x) { return 10 * Math.log10(x + 1e-30); }

  // ------------------------------------------------------------ channels
  function mono(L, R) { var n = L.length, y = f64(n), i; if (!R) { y.set(L); return y; } for (i = 0; i < n; i++) y[i] = 0.5 * (L[i] + R[i]); return y; }
  function side(L, R) { var n = L.length, y = f64(n), i; for (i = 0; i < n; i++) y[i] = 0.5 * (L[i] - R[i]); return y; }

  // ------------------------------------------------------------ Butterworth biquads (RBJ cookbook, Q per section)
  // 4th order = two biquads with Q 0.5412 and 1.3066; 2nd order = one with Q 0.7071.
  var BQ = { 2: [0.70710678], 4: [0.54119610, 1.30656296] };
  function biquad(type, f, q, sr) {
    var w = 2 * Math.PI * clamp(f, 1, sr * 0.49) / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q), b0, b1, b2;
    if (type === 'lowpass') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (type === 'highpass') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = al; b1 = 0; b2 = -al; }                       // bandpass, 0 dB peak
    var a0 = 1 + al;
    return [b0 / a0, b1 / a0, b2 / a0, -2 * c / a0, (1 - al) / a0];
  }
  function runBiquad(x, k) {
    var n = x.length, y = f64(n), x1 = 0, x2 = 0, y1 = 0, y2 = 0, i, v;
    for (i = 0; i < n; i++) { v = k[0] * x[i] + k[1] * x1 + k[2] * x2 - k[3] * y1 - k[4] * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
    return y;
  }
  function reverse(x) { var n = x.length, y = f64(n), i; for (i = 0; i < n; i++) y[i] = x[n - 1 - i]; return y; }
  // zero-phase band filter: lo <= 0 -> lowpass at hi; hi >= sr/2 -> highpass at lo; else highpass(lo) then lowpass(hi)
  function band(x, lo, hi, sr, order) {
    var qs = BQ[order || 4] || BQ[4], secs = [], i, y = x;
    if (lo > 0) for (i = 0; i < qs.length; i++) secs.push(biquad('highpass', lo, qs[i], sr));
    if (hi < sr / 2) for (i = 0; i < qs.length; i++) secs.push(biquad('lowpass', hi, qs[i], sr));
    for (i = 0; i < secs.length; i++) y = runBiquad(y, secs[i]);
    y = reverse(y);
    for (i = 0; i < secs.length; i++) y = runBiquad(y, secs[i]);
    return reverse(y);
  }

  // ------------------------------------------------------------ envelopes
  // centred moving RMS over `ms`
  function env(x, ms, sr) {
    var n = x.length, w = Math.max(1, Math.round(sr * ms / 1000)), h = w >> 1, y = f64(n), c = f64(n + 1), i, a, b;
    for (i = 0; i < n; i++) c[i + 1] = c[i] + x[i] * x[i];
    for (i = 0; i < n; i++) { a = Math.max(0, i - h); b = Math.min(n, a + w); y[i] = Math.sqrt((c[b] - c[a]) / (b - a) + 1e-20); }
    return y;
  }
  function toDb(e) { var y = f64(e.length), i; for (i = 0; i < e.length; i++) y[i] = 20 * Math.log10(e[i] + 1e-10); return y; }

  // hysteresis onsets (L1 transcript 3.1): a 3 ms envelope fires `on` dB under the file's peak and re-arms when it falls
  // `off` dB under that peak or `rearm` dB under the peak since the last onset (off by default; pass it for wet, dense
  // material where tails never fall 45 dB between hits); each onset is refined back to the last sample 50 dB under the following 50 ms maximum of a
  // 1 ms envelope.
  function onsets(x, sr, o) {
    o = o || {};
    var on = o.on == null ? -30 : o.on, off = o.off == null ? -45 : o.off, rearm = o.rearm == null ? Infinity : o.rearm, lp = -Infinity, gap = Math.round((o.minGap || 0.08) * sr);
    var e = toDb(env(x, 3, sr)), e1 = toDb(env(x, 1, sr)), pk = -Infinity, i, j, out = [], armed = true, last = -1e12;
    for (i = 0; i < e.length; i++) if (e[i] > pk) pk = e[i];
    var w50 = Math.round(0.05 * sr), w30 = Math.round(0.03 * sr);
    for (i = 0; i < e.length; i += 8) {
      if (armed && e[i] > pk + on && i - last > gap) {
        var loc = -Infinity, a = Math.max(1, i - w30), k = a;
        for (j = i; j < Math.min(e1.length, i + w50); j++) if (e1[j] > loc) loc = e1[j];
        for (j = i; j >= a; j--) if (e1[j] < loc - 50) { k = j + 1; break; }
        out.push(k); last = i; armed = false; lp = e[i];
      } else if (!armed) { if (e[i] > lp) lp = e[i]; if (e[i] < pk + off || e[i] < lp - rearm) armed = true; }
    }
    return out;
  }

  // ------------------------------------------------------------ FFT (radix 2, in place) and correlation
  function fft(re, im, inv) {
    var n = re.length, i, j = 0, k, len, t;
    for (i = 1; i < n; i++) { k = n >> 1; while (j & k) { j ^= k; k >>= 1; } j |= k; if (i < j) { t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (len = 2; len <= n; len <<= 1) {
      var ang = (inv ? 2 : -2) * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), h = len >> 1;
      for (i = 0; i < n; i += len) {
        var cr = 1, ci = 0;
        for (j = 0; j < h; j++) {
          var ar = re[i + j + h] * cr - im[i + j + h] * ci, ai = re[i + j + h] * ci + im[i + j + h] * cr;
          re[i + j + h] = re[i + j] - ar; im[i + j + h] = im[i + j] - ai; re[i + j] += ar; im[i + j] += ai;
          t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
    if (inv) for (i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }
  function nextPow2(n) { var p = 1; while (p < n) p <<= 1; return p; }
  // spectrum of a zero-padded segment, for repeated correlation: {re, im, energy, n}
  function prep(a, size) {
    var re = f64(size), im = f64(size), e = 0, i;
    for (i = 0; i < a.length && i < size; i++) { re[i] = a[i]; e += a[i] * a[i]; }
    fft(re, im, false);
    return { re: re, im: im, energy: e, n: size };
  }
  // max normalised cross-correlation within +-maxLag samples of two prepared segments
  function nccPrep(P, Q, maxLag) {
    var n = P.n, re = f64(n), im = f64(n), i, best = -1, v;
    for (i = 0; i < n; i++) { re[i] = P.re[i] * Q.re[i] + P.im[i] * Q.im[i]; im[i] = P.im[i] * Q.re[i] - P.re[i] * Q.im[i]; }
    fft(re, im, true);
    for (i = 0; i <= maxLag; i++) { v = re[i]; if (v > best) best = v; v = re[(n - i) % n]; if (v > best) best = v; }
    return best / Math.sqrt(P.energy * Q.energy + 1e-30);
  }
  function ncc(a, b, maxLag) {
    var size = nextPow2(a.length + b.length);
    return nccPrep(prep(a, size), prep(b, size), maxLag == null ? 441 : maxLag);
  }
  // best lag (Q delayed relative to P, signed) and the correlation value there, unnormalised
  function bestLag(P, Q) {
    var n = P.n, re = f64(n), im = f64(n), i, bi = 0, bv = -Infinity;
    for (i = 0; i < n; i++) { re[i] = P.re[i] * Q.re[i] + P.im[i] * Q.im[i]; im[i] = P.im[i] * Q.re[i] - P.re[i] * Q.im[i]; }
    fft(re, im, true);
    for (i = 0; i < n; i++) if (re[i] > bv) { bv = re[i]; bi = i; }
    return bi > n / 2 ? bi - n : bi;
  }

  // linear-interpolation resampling by `r` (a sampler's transposition: r > 1 plays faster)
  function resample(x, r) {
    var m = Math.max(1, Math.floor((x.length - 1) / r)), y = f64(m), i, p, k;
    for (i = 0; i < m; i++) { p = i * r; k = Math.floor(p); y[i] = x[k] + (x[Math.min(k + 1, x.length - 1)] - x[k]) * (p - k); }
    return y;
  }

  // magnitude spectrum of a Hann-windowed segment, zero-padded to `size`
  function magSpec(x, size) {
    var n = x.length, re = f64(size), im = f64(size), i, out = f64(size / 2 + 1);
    for (i = 0; i < n && i < size; i++) re[i] = x[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)));
    fft(re, im, false);
    for (i = 0; i <= size / 2; i++) out[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
    return out;
  }

  // ------------------------------------------------------------ decay analysis
  // Schroeder backward integration of an energy sequence, in dB re the total
  function schroeder(e2) {
    var n = e2.length, y = f64(n), s = 0, i, tot;
    for (i = n - 1; i >= 0; i--) { s += e2[i]; y[i] = s; }
    tot = y[0] || 1e-30;
    for (i = 0; i < n; i++) y[i] = 10 * Math.log10(y[i] / tot + 1e-30);
    return y;
  }
  // least-squares slope of y over x for the indices where lo >= y >= hi; returns -60/slope (an RT in seconds) or NaN
  function rtFit(edc, sr, lo, hi) {
    var sx = 0, sy = 0, sxx = 0, sxy = 0, n = 0, i, t;
    for (i = 0; i < edc.length; i++) if (edc[i] <= lo && edc[i] >= hi) { t = i / sr; sx += t; sy += edc[i]; sxx += t * t; sxy += t * edc[i]; n++; }
    if (n < 10) return NaN;
    var s = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    return s < 0 ? -60 / s : NaN;
  }
  function corr(a, b) {
    var n = Math.min(a.length, b.length), ma = 0, mb = 0, i, sab = 0, saa = 0, sbb = 0;
    for (i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n;
    for (i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) * (a[i] - ma); sbb += (b[i] - mb) * (b[i] - mb); }
    return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : NaN;
  }
  function median(v) { var a = Array.prototype.slice.call(v).filter(function (x) { return x === x; }).sort(function (p, q) { return p - q; }); var n = a.length; return n ? (n % 2 ? a[(n - 1) / 2] : 0.5 * (a[n / 2 - 1] + a[n / 2])) : NaN; }
  function energy(x, a, b) { var s = 0, i; for (i = Math.max(0, a); i < Math.min(x.length, b); i++) s += x[i] * x[i]; return s; }
  // deterministic PRNG (mulberry32) for pair sampling
  function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  A.dsp = {
    mono: mono, side: side, band: band, biquad: biquad, env: env, toDb: toDb, onsets: onsets,
    fft: fft, nextPow2: nextPow2, prep: prep, nccPrep: nccPrep, ncc: ncc, bestLag: bestLag, resample: resample, magSpec: magSpec,
    schroeder: schroeder, rtFit: rtFit, corr: corr, median: median, energy: energy, db: db, rng: rng
  };
})();
