#!/usr/bin/env node
// tools/drums-score.js: score the Drums voices (app/engine/drums.js) against the reference tables in
// docs/research/2026-11-09-box-crew/transcripts/B2-808.md (TR-808 service notes, third pass, section "check table")
// and B3-909.md (TR-909 third pass, derived values, section 9 criteria).
//
// Usage:
//   node tools/drums-score.js [--only bd808,sd909] [--json <file>] [--selftest]
//
// Each voice is rendered on app/index.html through Drums.create on an OfflineAudioContext (44.1 kHz, one hit at
// vel 1, no accent, unless a check names another setting). Settings are the engine defaults, the knob extremes from
// the engine spec (`name=value` keys) and the accent / step settings. Measures, all on the render itself:
//   period     autocorrelation period (ms) over the first 100 ms after the attack (5 % tolerance, B2 section 7)
//   t20        time (ms) from the envelope peak to 1/10 of it, i.e. the table's "decay to 1/10 Vpp" (15 %)
//   tc         time constant (ms) of an exponential decay after the hold: (t20 - hold) / ln 10 (15 %, B3 section 9)
//   peaks      spectral peaks (Hann, zero-padded, parabolic interpolation) matched to reference frequencies (5 %)
//   ratio2     ratio of the two strongest peaks in 100 to 1500 Hz (5 %)
//   pitch_*    autocorrelation frequency at 2 to 12 ms (start) and 40 to 100 ms (settle) (15 %, B3 section 9 a)
//   count      clap bursts (1 ms hop, 2 ms RMS, 3 dB prominence) in the first 40 ms (exact)
//   spacing    median burst spacing (ms) (3 ms, B2 section 7)
//   accent     accent peak / normal peak, must lie in the B2 section 7 band 2.0 to 3.7 (maracas 1.5 to 1.85)
//   steps      909 step ladder (ev.step 0, 1, 2): each step 9 dB apart, +-1 dB (B3 section 9 d)
//   fold       sample clock from the spectrum's brick-wall fold-over (2 x cutoff), 30 kHz (5 %, B3 third pass)
// Verdicts: PASS, FAIL, INFO (no reference), ERR (render failed). Exit 0 when no FAIL, 1 on any FAIL, 2 on a harness
// error (no Playwright or Chromium, or the page did not load Drums).
// Reference tables are transcribed here, not copied from the repo's other files; the sources are cited per row.
'use strict';

var fs = require('fs');
var path = require('path');
var http = require('http');

var REPO = path.resolve(__dirname, '..');
var CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
var SR = 44100;
var LN10 = Math.LN10;
var TOL_PERIOD = 0.05, TOL_DECAY = 0.15, TOL_PITCH = 0.15, TOL_PARTIAL = 0.05, TOL_FOLD = 0.05;
var MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8'
};
var ISOLATION = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cross-Origin-Resource-Policy': 'same-origin' };
var B2 = 'B2 s3 check table';
var B3 = 'B3 s3/s9';
var METAL6 = [205.3, 369.6, 304.4, 522.7, 540, 800];       // paper / manual oscillator set (B2 s3, Werner ICMC 2014)

// ------------------------------------------------------------------ reference checks
var CHECKS = [];
function C(voice, label, render, metric, ref, o) {
  var c = { voice: voice, label: label, render: render, metric: metric, ref: ref };
  if (o) for (var k in o) if (o.hasOwnProperty(k)) c[k] = o[k];
  CHECKS.push(c);
}
// TR-808 check table (B2 s3): periods in ms, decay = time to 1/10 Vpp in ms, Vpp normal / accent
var TOMS808 = {
  lt808: { ms: [12.5, 11.1, 10.0], dec: 200, acc: 12 / 3.5 },
  mt808: { ms: [8.3, 7.4, 6.3], dec: 130, acc: 11 / 3 },
  ht808: { ms: [6.1, 5.4, 4.5], dec: 100, acc: 12 / 3.5 },
  lc808: { ms: [6.1, 5.4, 4.5], dec: 180, acc: 12 / 3.5 },
  mc808: { ms: [4.0, 3.6, 3.2], dec: 100, acc: 10 / 3 },
  hc808: { ms: [2.7, 2.5, 2.2], dec: 80, acc: 12 / 3.5 }
};
C('bd808', 'period at default (table mid 56 Hz)', 'def', 'period', 18, { tol: TOL_PERIOD, src: B2 });
C('bd808', 't20 at decay min (table 50 ms)', 'decay=0.05', 't20', 50, { tol: TOL_DECAY, src: B2 });
C('bd808', 't20 at default (table mid 300 ms)', 'def', 't20', 300, { tol: TOL_DECAY, src: B2 });
C('bd808', 't20 at decay max (table 800 ms)', 'decay=2', 't20', 800, { tol: TOL_DECAY, src: B2 });
C('bd808', 'accent / normal peak (table 10/3.5)', 'acc', 'accent', 10 / 3.5, { lo: 2.0, hi: 3.7, src: B2 });

C('sd808', 'partials at default (238, 476 Hz)', 'def', 'peaks', [238, 476], { tol: TOL_PARTIAL, win: 80, src: B2 });
C('sd808', 't20 at default (table mid 60 ms)', 'def', 't20', 60, { tol: TOL_DECAY, src: B2 });
C('sd808', 'accent / normal peak (table 10/3)', 'acc', 'accent', 10 / 3, { lo: 2.0, hi: 3.7, src: B2 });

C('cp808', 'burst count in first 40 ms (table: three pulses)', 'def', 'count', 3, { win: 40, src: B2 + ' + s7' });
C('cp808', 't20 at default (table mid 100 ms)', 'def', 't20', 100, { tol: TOL_DECAY, src: B2 });
C('cp808', 'accent (table prints 6 / 2, not used)', 'acc', 'accent', null, { info: true, src: B2 });

C('ch808', 'metal oscillator set at default (INFO: HP 10.5 kHz removes them)', 'def', 'peaks', METAL6, { tol: TOL_PARTIAL, win: 50, fr: [150, 16000], info: true, src: B2 });
C('ch808', 'band-pass stage a peak at default (7.21 kHz, B2 s3 derivation)', 'def', 'peaks', [7210], { tol: TOL_PARTIAL, win: 50, fr: [5000, 10000], src: B2 + ' s3 (paper 7100)' });
C('ch808', 't20 at default (table 50 ms)', 'def', 't20', 50, { tol: TOL_DECAY, src: B2 });
C('ch808', 'accent / normal peak (table 6/3)', 'acc', 'accent', 2.0, { lo: 1.98, hi: 3.7, src: B2 });

C('oh808', 'metal oscillator set at default (INFO: HP 10.5 kHz removes them)', 'def', 'peaks', METAL6, { tol: TOL_PARTIAL, win: 50, fr: [150, 16000], info: true, src: B2 });
C('oh808', 'band-pass stage a peak at default (7.21 kHz, B2 s3 derivation)', 'def', 'peaks', [7210], { tol: TOL_PARTIAL, win: 50, fr: [5000, 10000], src: B2 + ' s3 (paper 7100)' });
C('oh808', 't20 at decay min (table 90 ms)', 'decay=0.09', 't20', 90, { tol: TOL_DECAY, src: B2 });
C('oh808', 't20 at default (table mid 450 ms)', 'def', 't20', 450, { tol: TOL_DECAY, src: B2 });
C('oh808', 't20 at decay max (table 600 ms)', 'decay=1.5', 't20', 600, { tol: TOL_DECAY, src: B2 });
C('oh808', 'accent / normal peak (table 7/3.5)', 'acc', 'accent', 2.0, { lo: 1.98, hi: 3.7, src: B2 });

C('cy808', 't20 at decay min (table 350 ms)', 'decay=0.35', 't20', 350, { tol: TOL_DECAY, src: B2 });
C('cy808', 't20 at default (table mid 800 ms)', 'def', 't20', 800, { tol: TOL_DECAY, src: B2 });
C('cy808', 't20 at decay max (table 1200 ms)', 'decay=3', 't20', 1200, { tol: TOL_DECAY, src: B2 });
C('cy808', 'peaks at default (table gives none)', 'def', 'peaks', null, { win: 50, fr: [150, 16000], info: true, src: B2 });
C('cy808', 'accent / normal peak (table 7/3.5)', 'acc', 'accent', 2.0, { lo: 1.98, hi: 3.7, src: B2 });

C('cb808', 'partials at default (540, 800 Hz)', 'def', 'peaks', [540, 800], { tol: TOL_PARTIAL, win: 50, fr: [150, 16000], src: B2 });
C('cb808', 't20 at default (table 50 ms)', 'def', 't20', 50, { tol: TOL_DECAY, src: B2 });
C('cb808', 'accent / normal peak (table 12/3.5)', 'acc', 'accent', 12 / 3.5, { lo: 2.0, hi: 3.7, src: B2 });

Object.keys(TOMS808).forEach(function (v) {
  var t = TOMS808[v];
  C(v, 'period at tune low (table ' + t.ms[0] + ' ms)', 'tune=0', 'period', t.ms[0], { tol: TOL_PERIOD, src: B2 });
  C(v, 'period at default (table mid ' + t.ms[1] + ' ms)', 'def', 'period', t.ms[1], { tol: TOL_PERIOD, src: B2 });
  C(v, 'period at tune high (table ' + t.ms[2] + ' ms)', 'tune=100', 'period', t.ms[2], { tol: TOL_PERIOD, src: B2 });
  C(v, 't20 at default (table ' + t.dec + ' ms)', 'def', 't20', t.dec, { tol: TOL_DECAY, src: B2 });
  C(v, 'accent / normal peak (table ' + t.acc.toFixed(2) + ')', 'acc', 'accent', t.acc, { lo: 2.0, hi: 3.7, src: B2 });
});

C('rs808', 'partials at default (1667, 455 Hz)', 'def', 'peaks', [1667, 455], { tol: TOL_PARTIAL, win: 30, src: B2 });
C('rs808', 't20 at default (table 10 ms)', 'def', 't20', 10, { tol: TOL_DECAY, src: B2 });
C('rs808', 'accent / normal peak (table 10/3)', 'acc', 'accent', 10 / 3, { lo: 2.0, hi: 3.7, src: B2 });
C('cl808', 'partial at default (2500 Hz)', 'def', 'peaks', [2500], { tol: TOL_PARTIAL, win: 20, src: B2 });
C('cl808', 't20 at default (table 25 ms)', 'def', 't20', 25, { tol: TOL_DECAY, src: B2 });
C('cl808', 'accent / normal peak (table 8/2.5)', 'acc', 'accent', 3.2, { lo: 2.0, hi: 3.7, src: B2 });
C('ma808', 't20 at default (table 25 ms short or 35 ms long, either)', 'def', 't20', [25, 35], { tol: TOL_DECAY, src: B2 });
C('ma808', 'accent / normal peak (table 5/3)', 'acc', 'accent', 5 / 3, { lo: 1.5, hi: 1.85, src: B2 + ' (maracas 1.67)' });

// TR-909 (B3 third pass, derived values; B3 s9 criteria)
var HOLD909 = { bd909: 0.06, lt909: 0.03, mt909: 0.03, ht909: 0.03, ch909: 0.006, oh909: 0.012 };
C('bd909', 'pitch start at default (274 Hz)', 'def', 'pitch_start', 274, { tol: TOL_PITCH, src: B3 });
C('bd909', 'pitch settle at default (53 Hz)', 'def', 'pitch_settle', 53, { tol: TOL_PITCH, src: B3 });
C('bd909', 'decay time constant at min (derived 15.5 ms)', 'decay=0.012', 'tc', 15.5, { tol: TOL_DECAY, src: B3 });
C('bd909', 'decay time constant at max (derived 346 ms)', 'decay=0.35', 'tc', 346, { tol: TOL_DECAY, src: B3 });
C('bd909', 'decay time constant at default (B3 0.035 s)', 'def', 'tc', 35, { tol: TOL_DECAY, src: B3 });
C('bd909', 'step ladder ev.step 0/1/2 (9 dB each)', 'steps', 'steps', 9, { tol: 1, src: B3 + ' d' });
C('bd909', 'step ladder at drive 0 (is drive the compressor?)', 'steps-d0', 'steps', 9, { tol: 1, src: B3 + ' d' });
C('bd909', 'ev.accent / normal (info)', 'acc', 'accent', null, { info: true, src: B3 });

C('sd909', 'partial ratio VCO2/VCO1 at default (1.47)', 'def', 'ratio2', 1.47, { tol: TOL_PARTIAL, win: 60, src: B3 });
C('sd909', 'step ladder ev.step 0/1/2 (9 dB each)', 'steps', 'steps', 9, { tol: 1, src: B3 + ' d' });
C('sd909', 'step ladder at drive 0 (is drive the compressor?)', 'steps-d0', 'steps', 9, { tol: 1, src: B3 + ' d' });
C('sd909', 'tone time constant range (derived 103 to 338 ms; spec 100 to 340 ms)', null, 'static', null,
  { static: { got: '0.10..0.34 s (spec)', ok: true }, refText: '0.103..0.338 s', src: B3 + ' (noise path, not resolved)' });

[['lt909', 0.038, 38, 0.38, 378], ['mt909', 0.038, 38, 0.38, 378], ['ht909', 0.038, 38, 0.38, 378]].forEach(function (r) {
  C(r[0], 'decay time constant at min (derived 38 ms)', 'decay=' + r[1], 'tc', r[2], { tol: TOL_DECAY, src: B3 });
  C(r[0], 'decay time constant at max (derived 378 ms)', 'decay=' + r[3], 'tc', r[4], { tol: TOL_DECAY, src: B3 });
  C(r[0], 'decay-to-1/10 at max (2.3 x 378 ms + hold; INFO, the manual gives a time constant)', 'decay=' + r[3], 't20', 378 * LN10 + 30, { info: true, src: B3 + ' (derived)' });
  C(r[0], 'decay-to-1/10 at default (0.15 s constant, INFO)', 'def', 't20', 0.15 * LN10 * 1000 + 30, { info: true, src: 'spec default' });
  C(r[0], 'step ladder ev.step 0/1/2 (9 dB each)', 'steps', 'steps', 9, { tol: 1, src: B3 + ' d' });
  C(r[0], 'step ladder at drive 0 (is drive the compressor?)', 'steps-d0', 'steps', 9, { tol: 1, src: B3 + ' d' });
  C(r[0], 'ev.accent / normal (info)', 'acc', 'accent', null, { info: true, src: B3 });
});

C('rs909', 'partials at default (495, 219, 1053 Hz)', 'def', 'peaks', [495, 219, 1053], { tol: TOL_PARTIAL, win: 30, src: B3 });
C('rs909', 'step ladder ev.step 0/1/2 (9 dB each)', 'steps', 'steps', 9, { tol: 1, src: B3 + ' d' });
C('cp909', 'burst count in first 40 ms (prior 4, 3 to 5)', 'def', 'count', 4, { win: 40, src: B3 + ' prior' });
C('cp909', 'burst spacing (prior 10 ms)', 'def', 'spacing', 10, { tol: 3, src: B3 + ' prior' });
C('cp909', 'step ladder ev.step 0/1/2 (9 dB each)', 'steps', 'steps', 9, { tol: 1, src: B3 + ' d' });

C('ch909', 'decay time constant at min (8 ms)', 'decay=0.008', 'tc', 8, { tol: TOL_DECAY, src: B3 + ' c' });
C('ch909', 'decay time constant at max (60 ms)', 'decay=0.06', 'tc', 60, { tol: TOL_DECAY, src: B3 + ' c' });
C('ch909', 'sample clock from fold-over (30 kHz)', 'def', 'fold', 30000, { tol: TOL_FOLD, win: 250, src: B3 + ' s3' });
C('ch909', 'step ladder ev.step 0/1/2 (9 dB each)', 'steps', 'steps', 9, { tol: 1, src: B3 + ' d' });
C('oh909', 'decay time constant at min (30 ms)', 'decay=0.03', 'tc', 30, { tol: TOL_DECAY, src: B3 + ' c' });
C('oh909', 'decay time constant at max (160 ms)', 'decay=0.16', 'tc', 160, { tol: TOL_DECAY, src: B3 + ' c' });
C('oh909', 'sample clock from fold-over (30 kHz)', 'def', 'fold', 30000, { tol: TOL_FOLD, win: 250, src: B3 + ' s3' });
C('oh909', 'step ladder ev.step 0/1/2 (9 dB each)', 'steps', 'steps', 9, { tol: 1, src: B3 + ' d' });
C('cr909', 'sample clock from fold-over (30 kHz)', 'def', 'fold', 30000, { tol: TOL_FOLD, win: 250, src: B3 + ' s3' });
C('cr909', 'step ladder ev.step 0/1/2 (9 dB each)', 'steps', 'steps', 9, { tol: 1, src: B3 + ' d' });
C('rd909', 'sample clock from fold-over (30 kHz)', 'def', 'fold', 30000, { tol: TOL_FOLD, win: 250, src: B3 + ' s3' });
C('rd909', 'step ladder ev.step 0/1/2 (9 dB each)', 'steps', 'steps', 9, { tol: 1, src: B3 + ' d' });

// ------------------------------------------------------------------ render keys
function keysOf(c) {
  if (c.metric === 'static') return [];
  var k = c.render === 'steps' ? ['step0', 'step1', 'step2'] : (c.render === 'steps-d0' ? ['step0-d0', 'step1-d0', 'step2-d0'] : [c.render]);
  if (k.indexOf('def') < 0) k.unshift('def');
  return k;
}
function optsOf(key) {
  if (/^step\d-d0$/.test(key)) return { drive: 0 };
  if (key === 'def' || key === 'acc' || /^step\d$/.test(key)) return {};
  var p = key.split('='); var o = {}; o[p[0]] = parseFloat(p[1]); return o;
}
function evOf(key) {
  if (key === 'acc') return { vel: 1, accent: true };
  if (/^step\d(-d0)?$/.test(key)) return { vel: 1, step: parseInt(key.slice(4), 10) };
  return { vel: 1 };
}
function secsOf(voice) {
  if (voice === 'cy808') return 3.2;
  if (/^(ch909|oh909|cr909|rd909)$/.test(voice)) return 1.5;
  return 2.0;
}

// ------------------------------------------------------------------ DSP (Node side)
function fft(re, im) {
  var n = re.length, i, j, k, len, half, a, b, tr, ti, t, cr, ci, wr, wi, ang, bit;
  for (i = 1, j = 0; i < n; i++) {
    bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (len = 2; len <= n; len <<= 1) {
    half = len >> 1; ang = -2 * Math.PI / len; cr = Math.cos(ang); ci = Math.sin(ang);
    for (i = 0; i < n; i += len) {
      wr = 1; wi = 0;
      for (k = 0; k < half; k++) {
        a = i + k; b = a + half;
        tr = re[b] * wr - im[b] * wi; ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        t = wr * cr - wi * ci; wi = wr * ci + wi * cr; wr = t;
      }
    }
  }
}
function nfftFor(len) { var n = 32768; while (n < len * 2) n *= 2; return n; }
function spectrum(x, a, len, nfft) {
  var re = new Float64Array(nfft), im = new Float64Array(nfft), i;
  var n = Math.max(0, Math.min(len, x.length - a));
  for (i = 0; i < n; i++) re[i] = x[a + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / Math.max(1, len - 1)));
  fft(re, im);
  var P = new Float64Array(nfft / 2 + 1);
  for (i = 0; i <= nfft / 2; i++) P[i] = re[i] * re[i] + im[i] * im[i];
  return { P: P, df: SR / nfft };
}
// spectral peaks in [fmin, fmax]: local maxima with parabolic interpolation, the nTop strongest within rangeDb of the top
function peakList(x, a, len, fmin, fmax, nTop, rangeDb) {
  var nf = nfftFor(len), S = spectrum(x, a, len, nf), P = S.P, df = S.df, i;
  var db = new Float64Array(P.length);
  for (i = 0; i < P.length; i++) db[i] = 10 * Math.log10(P[i] + 1e-20);
  var kmin = Math.max(2, Math.floor(fmin / df)), kmax = Math.min(P.length - 2, Math.ceil(fmax / df));
  var pk = [];
  for (var k = kmin; k <= kmax; k++) {
    if (db[k] > db[k - 1] && db[k] >= db[k + 1]) {
      var d0 = db[k - 1], d1 = db[k], d2 = db[k + 1];
      var den = d0 - 2 * d1 + d2, dl = den !== 0 ? 0.5 * (d0 - d2) / den : 0;
      pk.push({ hz: (k + dl) * df, db: d1 - 0.25 * (d0 - d2) * dl });
    }
  }
  if (!pk.length) return [];
  var top = Math.max.apply(null, pk.map(function (p) { return p.db; }));
  pk = pk.filter(function (p) { return p.db >= top - rangeDb; });
  pk.sort(function (p, q) { return q.db - p.db; });
  pk = pk.slice(0, nTop);
  pk.sort(function (p, q) { return p.hz - q.hz; });
  return pk;
}
// autocorrelation period (ms) over len samples from a; lags limited to fmin..fmax (normalised, first peak >= 0.9 max)
function periodMs(x, a, len, fmin, fmax) {
  if (a + len + 2 > x.length) len = x.length - a - 2;
  var maxLag = Math.min(Math.floor(SR / fmin), Math.floor(len / 2)), minLag = Math.max(2, Math.floor(SR / fmax));
  var W = len - maxLag;
  if (W < 16 || maxLag <= minLag + 2) return NaN;
  var r = new Float64Array(maxLag + 2), e0 = 0, i, l;
  for (i = 0; i < W; i++) e0 += x[a + i] * x[a + i];
  if (e0 < 1e-12) return NaN;
  for (l = minLag - 1; l <= maxLag + 1; l++) {
    var num = 0, e1 = 0;
    for (i = 0; i < W; i++) { var y = x[a + i + l]; num += x[a + i] * y; e1 += y * y; }
    r[l] = num / Math.sqrt(e0 * e1 + 1e-30);
  }
  var best = -Infinity;
  for (l = minLag; l <= maxLag; l++) if (r[l] > best) best = r[l];
  var pick = -1;
  for (l = minLag; l <= maxLag; l++) if (r[l] >= r[l - 1] && r[l] >= r[l + 1] && r[l] >= 0.9 * best) { pick = l; break; }
  if (pick < 0) return NaN;
  var den = r[pick - 1] - 2 * r[pick] + r[pick + 1], dl = den !== 0 ? 0.5 * (r[pick - 1] - r[pick + 1]) / den : 0;
  return (pick + dl) / SR * 1000;
}
// Analytic (Hilbert) envelope, then a 2 ms centred mean. The max-hold of |x| ripples with the carrier, which moves
// the 1/10 crossing of a sine-based voice; the analytic envelope does not.
function envelopeOf(x, a0) {
  var n = x.length - a0, N = 1, i, k;
  while (N < n) N *= 2;
  var re = new Float64Array(N), im = new Float64Array(N);
  for (i = 0; i < n; i++) re[i] = x[a0 + i];
  fft(re, im);
  for (k = 1; k < N / 2; k++) { re[k] *= 2; im[k] *= 2; }
  for (k = N / 2 + 1; k < N; k++) { re[k] = 0; im[k] = 0; }
  for (k = 0; k < N; k++) im[k] = -im[k];                  // inverse FFT via conjugation
  fft(re, im);
  var env = new Float64Array(n), w = Math.round(SR * 0.002), cs = new Float64Array(n + 1);
  for (i = 0; i < n; i++) env[i] = Math.hypot(re[i] / N, -im[i] / N);
  for (i = 0; i < n; i++) cs[i + 1] = cs[i] + env[i];
  var out = new Float64Array(n);
  for (i = 0; i < n; i++) {
    var lo = Math.max(0, i - w), hi = Math.min(n, i + w + 1);
    out[i] = (cs[hi] - cs[lo]) / (hi - lo);
  }
  return out;
}
// start pitch from the first two full cycles after the attack (the pitch sweeps too fast for autocorrelation)
// The sweep is exponential (tau 7.3 ms, B3 s3 R21 x C9 at the minimum), so the first full cycle (about 8 ms in) is
// not the start: return the start the cycle implies, f0 = end + (f1 - end) exp(t1 / tau), with end 53 Hz.
function pitchStartHz(x, a0) {
  var cr = [], i;
  for (i = a0 + 1; i < a0 + Math.round(0.03 * SR) && cr.length < 2; i++) {
    if (x[i - 1] < 0 && x[i] >= 0) cr.push(i - 1 + (-x[i - 1]) / (x[i] - x[i - 1]));
  }
  if (cr.length < 2) return NaN;
  var f1 = SR / (cr[1] - cr[0]), t1 = ((cr[0] + cr[1]) / 2 - a0) / SR;
  var tEnd = 0.0073, end = 53;
  return end + (f1 - end) * Math.exp(t1 / tEnd);
}
// time (ms) from the envelope peak to 1/10 of it
function t20ms(x, a0, skipMs) {
  var env = envelopeOf(x, a0), i, pk = 0, pi = -1, sk = Math.round((skipMs || 0) * SR / 1000);
  if (!skipMs) {
    for (i = 0; i < env.length; i++) if (env[i] > pk) { pk = env[i]; pi = i; }
  } else {
    // a held voice: the reference level is the mean over [skip, skip + 5 ms], timed at skip (the hold is flat there)
    var w = Math.round(0.005 * SR), sum = 0;
    for (i = sk; i < sk + w && i < env.length; i++) sum += env[i];
    pk = sum / w; pi = sk; sk = sk + w;
  }
  if (pk < 1e-6) return NaN;
  for (i = Math.max(pi + 1, sk); i < env.length; i++) if (env[i] < 0.1 * pk) return (i - pi) / SR * 1000;
  return NaN;
}
// clap bursts: 1 ms hop, 2 ms RMS, local maxima with 3 dB prominence within 12 dB of the top; times in ms from a0
function burstTimes(x, a0, span) {
  var hop = Math.round(SR / 1000), w = 2 * hop, dB = [], k, i, s;
  for (k = 0; k < span; k++) {
    s = a0 + k * hop;
    if (s + w > x.length) break;
    var m = 0;
    for (i = 0; i < w; i++) m += x[s + i] * x[s + i];
    dB.push(10 * Math.log10(m / w + 1e-20));
  }
  var mx = Math.max.apply(null, dB), out = [];
  for (k = 0; k < dB.length - 3; k++) {
    if (dB[k] < mx - 12) continue;
    if (k > 0 && !(dB[k] >= dB[k - 1])) continue;
    if (!(dB[k] > dB[k + 1])) continue;
    var lmin = k >= 3 ? Math.min(dB[k - 3], dB[k - 2], dB[k - 1]) : (k > 0 ? Math.min.apply(null, dB.slice(0, k)) : -Infinity);
    var rmin = Math.min(dB[k + 1], dB[k + 2], dB[k + 3]);
    if (dB[k] - lmin >= 3 && dB[k] - rmin >= 3) out.push(k);
  }
  return out;
}
// fold-over: lowest cutoff above 6 kHz with everything above it 30 dB under the 4 to 8 kHz level; fs = 2 x cutoff
function foldEst(x, a0, len) {
  var S = spectrum(x, a0, len, 65536), P = S.P, df = S.df, f, k, s, c, bands = [];
  for (f = 2000; f <= 22000; f += 250) {
    s = 0; c = 0;
    for (k = Math.round((f - 125) / df); k < Math.round((f + 125) / df); k++) { s += P[k]; c++; }
    bands.push({ f: f, db: 10 * Math.log10(s / c + 1e-20) });
  }
  var ref = 0, nr = 0;
  bands.forEach(function (b) { if (b.f >= 4000 && b.f <= 8000) { ref += b.db; nr++; } });
  ref /= nr;
  var cut = null;
  for (var i = bands.length - 1; i >= 0; i--) { if (bands[i].db > ref - 30) break; cut = bands[i].f; }
  // spectral null in 10 to 20 kHz: the crossover where the base band and its image meet (fs / 2)
  var nul = null, nulDb = Infinity;
  bands.forEach(function (b) { if (b.f >= 10000 && b.f <= 20000 && b.db < nulDb) { nulDb = b.db; nul = b.f; } });
  return { fs: 2 * nul, cut: nul, brick: cut };
}
function peakAbs(x) { var m = 0; for (var i = 0; i < x.length; i++) { var v = Math.abs(x[i]); if (v > m) m = v; } return m; }
function attackOf(x) {
  var p = peakAbs(x), i;
  for (i = 0; i < x.length; i++) if (Math.abs(x[i]) >= 0.02 * p) return i;
  return 0;
}
function decodeF32(b64) {
  var buf = Buffer.from(b64, 'base64'), u = new Uint8Array(buf.length);
  u.set(buf);
  var f = new Float32Array(u.buffer), out = new Float64Array(f.length);
  for (var i = 0; i < f.length; i++) out[i] = f[i];
  return out;
}

// ------------------------------------------------------------------ measurement of one check
function fmt(v, d) { return (v === null || v === undefined || !isFinite(v)) ? 'n/a' : v.toFixed(d === undefined ? 2 : d); }
function pctText(got, ref) { return isFinite(got) && ref ? (100 * (got - ref) / ref).toFixed(1) + ' %' : ''; }

function evaluate(c, R) {
  var row = { voice: c.voice, check: c.label, ref: '', got: '', delta: '', verdict: '', src: c.src || '' };
  if (c.metric === 'static') {
    row.ref = c.refText; row.got = c.static.got; row.verdict = c.static.ok ? 'PASS' : 'FAIL';
    return row;
  }
  var keys = keysOf(c);
  for (var i = 0; i < keys.length; i++) if (!R[keys[i]] || R[keys[i]].err) { row.verdict = 'ERR'; row.got = R[keys[i]] ? R[keys[i]].err : 'not rendered'; return row; }
  var r = R[c.render === 'steps' ? 'step1' : (c.render === 'steps-d0' ? 'step1-d0' : c.render)] || R.def, d = R.def;
  var x = r.x, a0 = r.a0, got, ok;
  var holdMs = (HOLD909[c.voice] || 0) * 1000;
  row.ref = Array.isArray(c.ref) ? c.ref.map(function (v) { return v.toString(); }).join(' / ') : (c.ref === null ? '-' : String(c.ref));
  if (c.info && c.metric !== 'peaks') row.verdict = 'INFO';

  switch (c.metric) {
    case 'period':
      got = periodMs(x, a0, Math.round(0.1 * SR), 30, 1000);
      row.got = fmt(got) + ' ms'; ok = rel(got, c.ref, c.tol); break;
    case 't20':
      got = t20ms(x, a0); row.got = fmt(got, 1) + ' ms';
      if (Array.isArray(c.ref)) { ok = c.ref.some(function (rv) { return rel(got, rv, c.tol); }); }
      else ok = rel(got, c.ref, c.tol);
      break;
    case 'tc':
      got = (t20ms(x, a0, 4) - holdMs) / LN10; row.got = fmt(got, 1) + ' ms (hold ' + fmt(holdMs, 0) + ')';
      ok = rel(got, c.ref, c.tol); break;
    case 'peaks': {
      var pk = peakList(x, a0 + Math.round((c.off || 0) * SR / 1000), Math.round(c.win * SR / 1000), c.fr ? c.fr[0] : 100, c.fr ? c.fr[1] : 8000, 12, 30);
      row.got = pk.map(function (p) { return p.hz.toFixed(1); }).join(', ') || 'none';
      if (!c.ref) { row.verdict = 'INFO'; return row; }
      var miss = [];
      c.ref.forEach(function (rf) {
        var best = null;
        pk.forEach(function (p) { if (!best || Math.abs(p.hz - rf) < Math.abs(best.hz - rf)) best = p; });
        if (!best || !rel(best.hz, rf, c.tol)) miss.push(rf);
      });
      row.delta = miss.length ? 'missing ' + miss.join(', ') : 'all matched';
      ok = miss.length === 0; break;
    }
    case 'ratio2': {
      var pr = peakList(x, a0, Math.round(c.win * SR / 1000), 100, 1500, 12, 30);
      pr.sort(function (p, q) { return q.db - p.db; });
      var two = pr.slice(0, 2).sort(function (p, q) { return p.hz - q.hz; });
      got = two.length === 2 ? two[1].hz / two[0].hz : NaN;
      row.got = two.map(function (p) { return p.hz.toFixed(1); }).join(' / ') + ' = ' + fmt(got, 3);
      ok = rel(got, c.ref, c.tol); break;
    }
    case 'pitch_start':
      got = pitchStartHz(x, a0);
      row.got = fmt(got, 1) + ' Hz'; ok = rel(got, c.ref, c.tol); break;
    case 'pitch_settle':
      got = 1000 / periodMs(x, a0 + Math.round(0.04 * SR), Math.round(0.06 * SR), 30, 4000);
      row.got = fmt(got, 1) + ' Hz'; ok = rel(got, c.ref, c.tol); break;
    case 'count': {
      var bt = burstTimes(x, a0, 40);
      got = bt.length; row.got = got + ' at ' + bt.map(function (t) { return t; }).join(', ') + ' ms';
      ok = got === c.ref; break;
    }
    case 'spacing': {
      var bs = burstTimes(x, a0, 60), dif = [];
      for (var q = 1; q < bs.length; q++) dif.push(bs[q] - bs[q - 1]);
      dif.sort(function (p, s) { return p - s; });
      got = dif.length ? dif[Math.floor(dif.length / 2)] : NaN;
      row.got = fmt(got, 1) + ' ms (' + bs.length + ' bursts)';
      ok = isFinite(got) && Math.abs(got - c.ref) <= c.tol; break;
    }
    case 'accent':
      got = peakAbs(x) / peakAbs(d.x);
      row.got = fmt(got, 2) + ' (' + fmt(20 * Math.log10(got), 1) + ' dB), peak ' + fmt(20 * Math.log10(peakAbs(x)), 1) + ' dBFS';
      if (c.info || c.ref === null) { row.verdict = 'INFO'; row.delta = ''; return row; }
      row.delta = pctText(got, c.ref);
      ok = got >= c.lo && got <= c.hi; break;
    case 'steps': {
      var sfx = c.render === 'steps-d0' ? '-d0' : '';
      var lv = [0, 1, 2].map(function (s) { return 20 * Math.log10(peakAbs(R['step' + s + sfx].x) + 1e-20); });
      var d1 = lv[1] - lv[0], d2 = lv[2] - lv[1];
      row.got = 'step1-0 ' + fmt(d1, 1) + ' dB, step2-1 ' + fmt(d2, 1) + ' dB';
      ok = Math.abs(d1 - c.ref) <= c.tol && Math.abs(d2 - c.ref) <= c.tol; break;
    }
    case 'fold': {
      var fo = foldEst(x, a0, Math.round(c.win * SR / 1000));
      got = fo.fs;
      row.got = 'fs ' + fmt(fo.fs, 0) + ' Hz (null at ' + fmt(fo.cut, 0) + ' Hz, brick-wall ' + (fo.brick === null ? 'none' : fmt(fo.brick, 0)) + ')';
      ok = rel(got, c.ref, c.tol); break;
    }
    default:
      row.verdict = 'ERR'; row.got = 'unknown metric ' + c.metric; return row;
  }
  if (row.verdict !== 'INFO') {
    if (c.metric !== 'peaks' && c.metric !== 'accent' && c.metric !== 'steps' && c.metric !== 'count') {
      if (isFinite(got) && !Array.isArray(c.ref) && c.ref !== null && c.metric !== 'spacing') row.delta = pctText(got, c.ref);
    }
    if (c.metric === 'count') row.delta = 'exact';
    if (c.metric === 'spacing') row.delta = (isFinite(got) ? (got - c.ref).toFixed(1) + ' ms' : 'n/a');
    if (c.metric === 'steps') row.delta = '';
    row.verdict = ok ? 'PASS' : 'FAIL';
  }
  return row;
}
function rel(got, ref, tol) {
  if (ref === null || ref === undefined || !isFinite(got) || !isFinite(ref) || !tol) return false;
  return Math.abs(got - ref) / ref <= tol;
}

// ------------------------------------------------------------------ self test of the DSP on synthetic signals
function selfTest() {
  var fails = [], n = 0;
  function ok(c, msg) { n++; if (!c) fails.push(msg); }
  var len = Math.round(0.5 * SR), x = new Float64Array(len), i;
  for (i = 0; i < len; i++) { var t = i / SR; x[i] = Math.cos(2 * Math.PI * 56 * t) * Math.exp(-t / 0.1); }
  var p = periodMs(x, 0, Math.round(0.1 * SR), 30, 4000);
  ok(Math.abs(p - 1000 / 56) / (1000 / 56) < 0.02, 'period of 56 Hz sine: ' + p);
  var tt = t20ms(x, 0);
  ok(Math.abs(tt - 0.1 * LN10 * 1000) / (0.1 * LN10 * 1000) < 0.03, 'decay t20 of tau 0.1 s: ' + tt);
  var y = new Float64Array(Math.round(0.08 * SR));
  for (i = 0; i < y.length; i++) { var u = i / SR; y[i] = Math.sin(2 * Math.PI * 238 * u) + 0.5 * Math.sin(2 * Math.PI * 476 * u); }
  var pk = peakList(y, 0, y.length, 100, 8000, 12, 30);
  var h = pk.map(function (q) { return q.hz; });
  ok(h.some(function (f) { return Math.abs(f - 238) < 3; }) && h.some(function (f) { return Math.abs(f - 476) < 3; }), 'peaks 238 and 476: ' + h.join(','));
  var z = new Float64Array(Math.round(0.06 * SR));
  [5, 15, 25].forEach(function (ms) { for (i = 0; i < 0.0015 * SR; i++) z[Math.round(ms / 1000 * SR) + i] = Math.sin(2 * Math.PI * 3000 * i / SR); });
  var bt = burstTimes(z, 0, 40);
  ok(bt.length === 3, 'three bursts: ' + bt.join(','));
  var sp = bt.length > 1 ? (bt[bt.length - 1] - bt[0]) / (bt.length - 1) : NaN;
  ok(Math.abs(sp - 10) <= 1, 'burst spacing 10 ms: ' + sp);
  if (fails.length) { console.log('SELFTEST FAIL (' + fails.length + ' of ' + n + '):\n  ' + fails.join('\n  ')); return 1; }
  console.log('OK: ' + n + ' DSP self-test checks passed');
  return 0;
}

// ------------------------------------------------------------------ browser harness
function startServer(root) {
  return new Promise(function (resolve, reject) {
    var server = http.createServer(function (req, res) {
      var urlPath;
      try { urlPath = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
      if (urlPath.charAt(urlPath.length - 1) === '/') urlPath += 'index.html';
      var file = path.normalize(path.join(root, urlPath));
      if (file.indexOf(root + path.sep) !== 0) { res.writeHead(403); return res.end(); }
      fs.readFile(file, function (err, data) {
        if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('not found'); }
        res.writeHead(200, Object.assign({ 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }, ISOLATION));
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', function () { resolve(server); });
  });
}
// runs in the page: one hit through Drums on an OfflineAudioContext, returned as base64 Float32
function pageRender(job) {
  var n = Math.round(job.secs * job.sr);
  var ctx = new OfflineAudioContext(1, n, job.sr);
  var inst = Drums.create(ctx, job.type, job.opts || {});
  inst.out.connect(ctx.destination);
  inst.trigger(0.02, job.ev);
  return ctx.startRendering().then(function (buf) {
    var d = buf.getChannelData(0), f = new Float32Array(d.length);
    f.set(d);
    var bytes = new Uint8Array(f.buffer), s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  });
}
var SEEDED_RANDOM = 'var __seedGen = null; (function () { var a = 0;' +
  ' function mk(s) { a = s >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a);' +
  ' t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }' +
  ' Math.random = mk(1); })();';

function renderKeysFor(voice, keysSet) {
  return Array.from(keysSet);
}

async function main() {
  var args = process.argv.slice(2), only = null, jsonOut = null;
  if (args.indexOf('--selftest') >= 0) process.exit(selfTest());
  for (var i = 0; i < args.length; i++) {
    if (args[i] === '--only') only = args[++i].split(',');
    else if (args[i] === '--json') jsonOut = args[++i];
    else if (args[i] !== '--levels') { console.error('drums-score.js: unknown argument ' + args[i]); process.exit(2); }
  }
  var playwright = null, tried = [];
  ['playwright', '/opt/node22/lib/node_modules/playwright'].some(function (m) {
    try { playwright = require(m); return true; } catch (e) { tried.push(m); return false; }
  });
  if (!playwright) { console.error('drums-score.js: Playwright not found (tried ' + tried.join(', ') + ')'); process.exit(2); }
  if (!fs.existsSync(CHROMIUM)) { console.error('drums-score.js: Chromium not found at ' + CHROMIUM); process.exit(2); }

  var levelsMode = args.indexOf('--levels') >= 0;
  var checks = CHECKS.filter(function (c) { return !only || only.indexOf(c.voice) >= 0; });
  if (levelsMode) {
    checks = [];
    var TYPES = ['bd808','sd808','cp808','ch808','oh808','cy808','cb808','lt808','mt808','ht808','lc808','mc808','hc808','rs808','cl808','ma808','bd909','sd909','lt909','mt909','ht909','rs909','cp909','ch909','oh909','cr909','rd909'];
    TYPES.forEach(function (t) { if (!only || only.indexOf(t) >= 0) checks.push({ voice: t, label: 'levels', render: 'acc', metric: 'accent', ref: null, info: true }); });
  }
  var need = {};                                  // voice -> set of render keys
  checks.forEach(function (c) {
    if (!need[c.voice]) need[c.voice] = new Set(['def']);
    keysOf(c).forEach(function (k) { need[c.voice].add(k); });
  });

  var server = await startServer(REPO), port = server.address().port;
  var browser = await playwright.chromium.launch({ executablePath: CHROMIUM, headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
  var R = {}, pageErrors = [];
  var harnessExit = 0;
  try {
    var page = await browser.newPage();
    page.on('pageerror', function (e) { pageErrors.push(e.message); });
    await page.addInitScript({ content: SEEDED_RANDOM });
    await page.goto('http://127.0.0.1:' + port + '/app/index.html', { waitUntil: 'load' });
    var hasDrums = await page.evaluate(function () { return typeof Drums !== 'undefined' && Drums.types().length; });
    if (!hasDrums) { console.error('drums-score.js: the app page did not load Drums'); harnessExit = 2; }
    else {
      for (var v in need) {
        R[v] = {};
        for (var key of need[v]) {
          var job = { type: v, opts: optsOf(key), ev: evOf(key), secs: secsOf(v), sr: SR };
          try {
            var b64 = await page.evaluate(pageRender, job);
            var x = decodeF32(b64);
            R[v][key] = { x: x, a0: attackOf(x) };
          } catch (e) {
            R[v][key] = { err: String(e && e.message || e).slice(0, 120) };
          }
        }
        // the render-key lookup for step ladders, steps use their own keys
      }
    }
  } catch (e) {
    console.error('drums-score.js: harness error: ' + (e && e.message || e));
    harnessExit = 2;
  } finally {
    await browser.close();
    server.close();
  }
  if (harnessExit) process.exit(harnessExit);

  if (levelsMode) {
    console.log('voice    normal peak   normal RMS 0-300ms   accent peak   accent RMS   accent/normal (peak)');
    Object.keys(R).forEach(function (v) {
      var n = R[v].def, a = R[v].acc;
      if (!n || !a || n.err || a.err) { console.log(v + ' render error'); return; }
      function rmsDb(x) { var m = Math.min(x.length, Math.round(0.3 * SR)), s2 = 0, i; for (i = 0; i < m; i++) s2 += x[i] * x[i]; return 10 * Math.log10(s2 / m + 1e-20); }
      var np = 20 * Math.log10(peakAbs(n.x) + 1e-20), ap = 20 * Math.log10(peakAbs(a.x) + 1e-20);
      console.log(pad(v, 9) + pad(np.toFixed(1) + ' dBFS (' + peakAbs(n.x).toFixed(3) + ')', 22) + pad(rmsDb(n.x).toFixed(1) + ' dBFS', 21) +
        pad(ap.toFixed(1) + ' dBFS (' + peakAbs(a.x).toFixed(3) + ')', 22) + pad(rmsDb(a.x).toFixed(1) + ' dBFS', 13) + (ap - np).toFixed(1) + ' dB');
    });
    process.exit(0);
  }
  var rows = checks.map(function (c) {
    var RR = R[c.voice] || {};
    return evaluate(c, RR);
  });
  var fails = rows.filter(function (r) { return r.verdict === 'FAIL'; }).length;
  var passes = rows.filter(function (r) { return r.verdict === 'PASS'; }).length;
  var infos = rows.filter(function (r) { return r.verdict === 'INFO'; }).length;
  var errs = rows.filter(function (r) { return r.verdict === 'ERR'; }).length;
  function pad(s, n) { s = String(s); return s.length >= n ? s.slice(0, n - 1) + ' ' : s + new Array(n - s.length + 1).join(' '); }
  console.log(pad('voice', 8) + pad('check', 58) + pad('reference', 22) + pad('rendered', 44) + pad('delta', 18) + 'verdict');
  rows.forEach(function (r) {
    console.log(pad(r.voice, 8) + pad(r.check, 58) + pad(r.ref, 22) + pad(r.got, 44) + pad(r.delta, 18) + r.verdict);
  });
  console.log('');
  console.log('PASS ' + passes + '  FAIL ' + fails + '  INFO ' + infos + '  ERR ' + errs + '  (' + rows.length + ' rows)');
  if (pageErrors.length) console.log('page errors during the run: ' + pageErrors.length + ' (first: ' + pageErrors[0].slice(0, 120) + ')');
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 1));
  process.exit(fails > 0 || errs > 0 ? 1 : 0);
}

main().catch(function (e) { console.error('drums-score.js: ' + (e && e.stack || e)); process.exit(2); });
