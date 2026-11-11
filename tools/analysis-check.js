#!/usr/bin/env node
/* Node check for app/analysis/ (L1, Lab Crew). Loads dsp.js, features.js and decide.js as the browser would
 * (globals, no imports) and runs labelled tests:
 *   1. synthetic material with known answers (always run, seeded);
 *   2. the V3 mainA3 solo renders in tools/out/ with the engine's own labels (run when the renders exist;
 *      make them with: node tools/render.js --page app --sections mainA3 --bars 16 --song v3 --solo <track>).
 * Prints "OK: N checks passed" and exits 0, or lists the failures and exits 1.
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var ROOT = path.join(__dirname, '..');
['dsp.js', 'features.js', 'decide.js'].forEach(function (f) {
  var p = path.join(ROOT, 'app', 'analysis', f);
  vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: p });
});
var A = globalThis.Analysis, D = A.dsp, F = A.features, X = A.decide;
var passed = 0, failed = [], skipped = [];
function check(name, ok, info) { if (ok) passed++; else failed.push(name + (info ? ' (' + info + ')' : '')); console.log((ok ? 'pass ' : 'FAIL ') + name + (info ? '  ' + info : '')); }

// ------------------------------------------------------------ synthetic material
var SR = 22050, rnd = D.rng(7);
function noise(n) { var y = new Float64Array(n); for (var i = 0; i < n; i++) y[i] = rnd() * 2 - 1; return y; }
function decayNoise(n, tau) { var y = noise(n); for (var i = 0; i < n; i++) y[i] *= Math.exp(-i / (tau * SR)) * Math.min(1, i / 20); return y; }
function sweptSine(n) { var y = new Float64Array(n), ph = 0; for (var i = 0; i < n; i++) { var t = i / SR, f = 50 + 200 * Math.exp(-t / 0.02); ph += 2 * Math.PI * f / SR; y[i] = Math.sin(ph) * Math.exp(-t / 0.08) * Math.min(1, i / 20); } return y; }
function track(hitFn, count, ioi, len) {
  var y = new Float64Array(Math.round((count * ioi + 2.5) * SR)), on = [];
  for (var k = 0; k < count; k++) { var s = Math.round((0.05 + k * ioi) * SR), h = hitFn(k), g = 0.7 + 0.3 * rnd(); for (var i = 0; i < h.length && s + i < y.length; i++) y[s + i] += g * h[i]; on.push(s); }
  return y;
}
var HIT = Math.round(0.2 * SR);
var fixedNoise = decayNoise(HIT, 0.04), rr = [decayNoise(HIT, 0.04), decayNoise(HIT, 0.04), decayNoise(HIT, 0.04)], tone = sweptSine(HIT);
var cases = [
  ['fresh noise each hit', track(function () { return decayNoise(HIT, 0.04); }, 32, 0.25), 'synth', 'high'],
  ['one noise hit replayed (a sampled hat, or a restarted noise table)', track(function () { return fixedNoise; }, 32, 0.25), 'sample', 'medium'],
  ['three round-robin noise hits', track(function (k) { return rr[k % 3]; }, 32, 0.25), 'sample', 'high'],
  ['noise hit transposed by a sampler', track(function (k) { return D.resample(fixedNoise, [1, 1.1225, 0.8409, 1.3348][k % 4]); }, 32, 0.25), 'sample', 'medium'],
  ['deterministic swept sine (synth kick, no noise): capped', track(function () { return tone; }, 32, 0.25), 'sample', 'low']
];
cases.forEach(function (c) {
  var id = F.identity(c[1], null, SR), d = X.synthOrSample(id);
  check('A synth/sample: ' + c[0] + ' -> ' + c[2] + ' (' + c[3] + ')', d.value === c[2] && d.confidence === c[3], d.value + ' ' + d.confidence + ', twin ' + id.twin.toFixed(2) + ', pitch twin ' + id.pitchTwin.toFixed(2) + ', hits ' + id.nHits);
});
// formant slope: a saw through a fixed resonance at several pitches, against one note transposed
function sawRes(f0, fc, n) { var y = new Float64Array(n), k, i; for (k = 1; k * f0 < SR / 2; k++) { var w = k * f0 / fc, g = (1 / k) / Math.sqrt((1 - w * w) * (1 - w * w) + (w / 6) * (w / 6)); for (i = 0; i < n; i++) y[i] += g * Math.sin(2 * Math.PI * k * f0 * i / SR); } return y; }
var notesSynth = [110, 131, 147, 165, 220].map(function (f) { return { x: sawRes(f, 1200, 8192), f0: f }; });
var base = sawRes(110, 1200, 16384), notesSmp = [1, 1.1892, 1.3348, 1.4983, 2].map(function (r) { return { x: D.resample(base, r).subarray(0, 8192), f0: 110 * r }; });
var sS = F.formantSlope(notesSynth, SR), sM = F.formantSlope(notesSmp, SR);
check('A formant slope: fixed filter ~ 0', Math.abs(sS) < 0.3, 'slope ' + sS.toFixed(2));
check('A formant slope: transposed sample ~ 1', Math.abs(sM - 1) < 0.2, 'slope ' + sM.toFixed(2));
var dTone = X.synthOrSample(F.identity(cases[4][1], null, SR), { formantSlope: sS });
check('A cap lifted toward synth by a fixed formant', dTone.value === 'synth' && dTone.confidence === 'medium', dTone.value + ' ' + dTone.confidence);

// reverb: stereo exponential-noise impulse of known RT and pre-delay, centred dry source
function ir(rt, pre, lp) {
  var n = Math.round((rt * 1.3 + pre) * SR), L = new Float64Array(n), R = new Float64Array(n), p = Math.round(pre * SR), i, a = Math.exp(-2 * Math.PI * lp / SR), yl = 0, yr = 0;
  for (i = p; i < n; i++) { var e = Math.pow(10, -3 * ((i - p) / SR) / rt); yl = (1 - a) * (rnd() * 2 - 1) * e + a * yl; yr = (1 - a) * (rnd() * 2 - 1) * e + a * yr; L[i] = yl; R[i] = yr; }
  var en = 0; for (i = 0; i < n; i++) en += L[i] * L[i] + R[i] * R[i];
  en = Math.sqrt(en / 2); for (i = 0; i < n; i++) { L[i] /= en; R[i] /= en; }   // unit energy: mix is the wet/dry energy ratio
  return [L, R];
}
function conv(x, h) {
  var n = D.nextPow2(x.length + h.length), xr = new Float64Array(n), xi = new Float64Array(n), hr = new Float64Array(n), hi = new Float64Array(n), i;
  xr.set(x); hr.set(h); D.fft(xr, xi, false); D.fft(hr, hi, false);
  for (i = 0; i < n; i++) { var r = xr[i] * hr[i] - xi[i] * hi[i], im = xr[i] * hi[i] + xi[i] * hr[i]; xr[i] = r; xi[i] = im; }
  D.fft(xr, xi, true); return xr.subarray(0, x.length);
}
function wetStereo(dry, I, mix) { var l = conv(dry, I[0]), r = conv(dry, I[1]), L = new Float64Array(dry.length), R = new Float64Array(dry.length); for (var i = 0; i < dry.length; i++) { L[i] = dry[i] + mix * l[i]; R[i] = dry[i] + mix * r[i]; } return [L, R]; }
var IR1 = ir(1.5, 0.020, 6000), IR2 = ir(0.6, 0.005, 2500);
function sawHit(n) { var y = new Float64Array(n), i; for (i = 0; i < n; i++) y[i] = (2 * ((i * 220 / SR) % 1) - 1) * Math.exp(-i / (0.06 * SR)); return y; }
var sawOne = sawHit(HIT);
var dryNoise = track(function () { return decayNoise(HIT, 0.03); }, 8, 0.6), dryTone = track(function () { return sawOne; }, 8, 0.6);
var wetA = wetStereo(dryNoise, IR1, 0.3), wetB = wetStereo(dryTone, IR1, 0.3), wetC = wetStereo(track(function () { return decayNoise(HIT, 0.02); }, 8, 0.6), IR2, 0.4);
var rDry = X.reverb(F.freeDecay(dryNoise, dryNoise, SR)), rWet = X.reverb(F.freeDecay(wetA[0], wetA[1], SR), F.predelay(wetA[0], wetA[1], SR));
check('D dry hits: no reverb', rDry.value.present === false, 'late ' + (rDry.value.rt60 || 'none') + ', ' + rDry.confidence);
check('D wet hits: reverb present', rWet.value.present === true, rWet.confidence);
check('D RT60 within 10 % of 1.5 s', Math.abs(rWet.value.rt60 / 1.5 - 1) < 0.1, 'rt60 ' + (rWet.value.rt60 || NaN).toFixed(2));
var pdA = F.predelay(wetA[0], wetA[1], SR);
check('D pre-delay within 2 ms of 20 ms', rWet.value.predelayMs != null && Math.abs(rWet.value.predelayMs - 20) < 2, 'pre-delay ' + rWet.value.predelayMs + (pdA.reason ? ', ' + pdA.reason : ''));
var sh = X.sharedOrSpecific([{ name: 'noise', sig: F.tailSignature(wetA[0], wetA[1], SR) }, { name: 'tone', sig: F.tailSignature(wetB[0], wetB[1], SR) }, { name: 'other', sig: F.tailSignature(wetC[0], wetC[1], SR) }]);
check('D two sources on one reverb: shared', sh.elements.noise && sh.elements.noise.value === 'shared (send or bus)' && sh.elements.tone.value === 'shared (send or bus)', JSON.stringify(sh.groups));
check('D a source on its own reverb: element-specific', sh.elements.other && sh.elements.other.value === 'element-specific', sh.pairs.map(function (p) { return p.a + '~' + p.b + ' ' + (p.colourDb === p.colourDb ? p.colourDb.toFixed(1) : 'n/a') + ' dB/' + p.rtLogRatio.toFixed(2); }).join('; '));
var panned = [new Float64Array(wetA[0].length), new Float64Array(wetA[0].length)];
for (var i = 0; i < panned[0].length; i++) { panned[0][i] = 0.8 * dryNoise[i] + 0.05 * (wetA[0][i] - dryNoise[i]); panned[1][i] = 0.4 * dryNoise[i] + 0.05 * (wetA[1][i] - dryNoise[i]); }
var pp = F.predelay(panned[0], panned[1], SR);
check('D pre-delay refused on a panned dry source', pp.ms === null, pp.reason);

// ------------------------------------------------------------ the engine's renders (labels from GUIDANCE_V3)
function readWav(p) {
  var b = fs.readFileSync(p), off = 12, fmt = null, data = null;
  while (off < b.length - 8) { var id = b.toString('ascii', off, off + 4), sz = b.readUInt32LE(off + 4); if (id === 'fmt ') fmt = { tag: b.readUInt16LE(off + 8), ch: b.readUInt16LE(off + 10), sr: b.readUInt32LE(off + 12), bits: b.readUInt16LE(off + 22) }; else if (id === 'data') data = [off + 8, sz]; off += 8 + sz + (sz & 1); }
  var n = Math.floor(data[1] / (fmt.bits / 8) / fmt.ch), L = new Float64Array(n), R = new Float64Array(n), k;
  for (k = 0; k < n; k++) {
    var o = data[0] + k * fmt.ch * fmt.bits / 8, l, r;
    if (fmt.bits === 16) { l = b.readInt16LE(o) / 32768; r = fmt.ch > 1 ? b.readInt16LE(o + 2) / 32768 : l; }
    else { l = b.readFloatLE(o); r = fmt.ch > 1 ? b.readFloatLE(o + 4) : l; }
    L[k] = l; R[k] = r;
  }
  return { L: L, R: R, sr: fmt.sr };
}
var OUT = path.join(ROOT, 'tools', 'out'), solo = function (t) { return path.join(OUT, 'app-mainA3-0-16-v3-solo-' + t + '.wav'); };
var TRUTH = {   // GUIDANCE_V3 (app/engine/song.js): synthesis everywhere; reverb send per track
  kick: { id: ['sample', 'low'], reverb: false }, bass: { id: ['sample', 'low'], reverb: false }, stab: { id: ['sample', 'low'] },
  clap: { id: ['synth', 'high'], reverb: true, predelay: 15 }, hat_open: { id: ['synth', 'high'], reverb: true, predelay: null },
  shaker: { id: ['synth', 'high'], reverb: false }, tick: { id: ['synth', 'high'], reverb: false }, burst: { reverb: true }, pad: { reverb: true }
};
var have = Object.keys(TRUTH).filter(function (t) { return fs.existsSync(solo(t)); });
if (have.length < Object.keys(TRUTH).length) skipped.push('renders: ' + (Object.keys(TRUTH).length - have.length) + ' mainA3 V3 solos absent in tools/out/');
var sigs = [];
have.forEach(function (t) {
  var w = readWav(solo(t)), tr = TRUTH[t];
  if (tr.id) {
    var id = F.identity(w.L, w.R, w.sr), d = X.synthOrSample(id);
    check('render ' + t + ': synth/sample -> ' + tr.id.join(' ') + (tr.id[1] === 'low' ? ' (deterministic synth, capped)' : ''), d.value === tr.id[0] && d.confidence === tr.id[1], d.value + ' ' + d.confidence + ', twin ' + id.twin.toFixed(2));
  }
  if (tr.reverb != null) {
    var fd = F.freeDecay(w.L, w.R, w.sr), pd = F.predelay(w.L, w.R, w.sr), r = X.reverb(fd, pd);
    check('render ' + t + ': reverb ' + (tr.reverb ? 'present' : 'absent'), r.value.present === tr.reverb, 'late slope ' + (fd.late === fd.late ? fd.late.toFixed(2) : 'n/a') + ' s');
    if (tr.reverb && t !== 'pad') check('render ' + t + ': RT60 in 1.7-2.5 s (engine IR: T30 2.0, T20 2.2)', r.value.rt60 > 1.7 && r.value.rt60 < 2.5, 'rt60 ' + (r.value.rt60 || NaN).toFixed(2));
    if (tr.predelay != null) check('render ' + t + ': pre-delay within 3 ms of 15', pd.ms != null && Math.abs(pd.ms - 15) < 3, 'pre-delay ' + pd.ms);
    if (tr.predelay === null && 'predelay' in tr) check('render ' + t + ': pre-delay refused (panned dry)', pd.ms === null, pd.reason);
    if (tr.reverb && t !== 'pad' && t !== 'stab') sigs.push({ name: t, sig: F.tailSignature(w.L, w.R, w.sr) });
  }
});
if (sigs.length >= 2) {
  var s2 = X.sharedOrSpecific(sigs);
  check('render: ' + sigs.map(function (s) { return s.name; }).join(', ') + ' share one reverb send', s2.groups.length === 1, JSON.stringify(s2.groups));
}

skipped.forEach(function (s) { console.log('skip ' + s); });
if (failed.length) { console.log('FAILED: ' + failed.length + ' of ' + (passed + failed.length) + ' checks'); process.exit(1); }
console.log('OK: ' + passed + ' checks passed');
