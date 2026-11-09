#!/usr/bin/env node
/* tools/drums-check.js - Node check for app/engine/drums.js (A12, Box Crew batch 2).
 * Run: node tools/drums-check.js     Prints "OK: N checks passed" and exits 0 on success.
 * The fake AudioContext is taken from the top section of app/engine/selfcheck.js (one source of truth); it is
 * extended here with recording of nodes and with createPeriodicWave.
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');

var ENGINE = path.join(__dirname, '..', 'app', 'engine');
var fails = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; console.log('  FAIL ' + msg); } }
function near(a, b, tol) { return Math.abs(a - b) <= tol; }

// ------------------------------------------------------------------ fake context from selfcheck.js
var sc = fs.readFileSync(path.join(ENGINE, 'selfcheck.js'), 'utf8');
var from = sc.indexOf('function Param(v)'), to = sc.indexOf('function load(sandbox)');
if (from < 0 || to < 0) { console.log('FAIL cannot find the fake context in selfcheck.js'); process.exit(1); }
var F = (new Function(sc.slice(from, to) + '; return {Param: Param, Node: Node, Src: Src, FakeContext: FakeContext, stats: stats};'))();
var bad = [];                                   // non-finite times or values handed to an AudioParam
['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime'].forEach(function (m) {
  var orig = F.Param.prototype[m];
  F.Param.prototype[m] = function (v, t, tc) {
    if (!isFinite(v) || !isFinite(t) || (m === 'setTargetAtTime' && !(tc > 0))) bad.push(m + '(' + v + ',' + t + ',' + tc + ')');
    var r = orig.apply(this, arguments);
    if (m === 'setTargetAtTime') this.calls[this.calls.length - 1][3] = tc;     // the fake drops the time constant
    return r;
  };
});
// the fake only flags _stopped; keep every stop time
var origStop = F.Src.prototype.stop;
F.Src.prototype.stop = function (t) { (this._stops || (this._stops = [])).push(t); return origStop.apply(this, arguments); };
function lastStop(s) { return s._stops && s._stops.length ? s._stops[s._stops.length - 1] : Infinity; }

// recording context: remembers every node, optional PeriodicWave support
function RecCtx(sr, wave) {
  F.FakeContext.call(this, sr || 44100);
  this.nodes = []; this.bufs = []; this.waves = [];
  if (wave) {
    this.createPeriodicWave = function (re, im) { var w = { real: re, imag: im }; this.waves.push(w); return w; };
  }
  this._wave = !!wave;
}
RecCtx.prototype = Object.create(F.FakeContext.prototype);
['createGain', 'createOscillator', 'createBufferSource', 'createBiquadFilter', 'createWaveShaper'].forEach(function (m) {
  RecCtx.prototype[m] = function () {
    var n = F.FakeContext.prototype[m].call(this);
    this.nodes.push(n);
    if (m === 'createOscillator' && this._wave) n.setPeriodicWave = function (w) { n.wave = w; };
    return n;
  };
});
RecCtx.prototype.createBuffer = function (c, l, s) { var b = F.FakeContext.prototype.createBuffer.call(this, c, l, s); this.bufs.push(b); return b; };

function sandbox() {
  var sb = { console: console, Promise: Promise, Float32Array: Float32Array, WeakMap: WeakMap, Math: Math };
  sb.window = sb; sb.globalThis = sb;
  return vm.createContext(sb);
}
function load() {
  var sb = sandbox();
  ['core', 'drums'].forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(ENGINE, f + '.js'), 'utf8'), sb, { filename: f + '.js' }); });
  return sb;
}

var EXPECT808 = ['bd808', 'sd808', 'cp808', 'ch808', 'oh808', 'cy808', 'cb808', 'lt808', 'mt808', 'ht808', 'lc808', 'mc808', 'hc808', 'rs808', 'cl808', 'ma808'];
var EXPECT909 = ['bd909', 'sd909', 'lt909', 'mt909', 'ht909', 'rs909', 'cp909', 'ch909', 'oh909', 'cr909', 'rd909'];
var BASES = { manual: 1, paper: 1, source: 1, prior: 1 };

// ------------------------------------------------------------------ 1. module, types, specs
console.log('1. module, types and specs');
var sb = load(), D = sb.Drums;
ok(D && typeof D.create === 'function' && typeof D.types === 'function' && typeof D.spec === 'function', 'global Drums with create, types, spec');
var types = D.types();
ok(JSON.stringify(types) === JSON.stringify(EXPECT808.concat(EXPECT909)), 'types() lists the 16 + 11 voices in order (' + types.length + ')');
ok(D.spec('nope') === null && !D.has('nope') && D.has('bd808'), 'spec(unknown) is null, has()');
types.forEach(function (t) {
  var s = D.spec(t), good = !!s && !!s.level && !!s.drive;
  for (var k in s) {
    var e = s[k];
    if (!(typeof e.min === 'number' && typeof e.max === 'number' && typeof e.value === 'number' && e.min < e.max && e.value >= e.min && e.value <= e.max && typeof e.unit === 'string')) { good = false; console.log('   bad spec ' + t + '.' + k); }
    if (k !== 'level' && k !== 'drive' && !BASES[e.basis]) { good = false; console.log('   no basis ' + t + '.' + k); }
  }
  ok(good, t + ' spec rows {min, max, value, unit} in range, basis marked');
});

// ------------------------------------------------------------------ 2. no AudioContext
console.log('2. without an AudioContext');
types.forEach(function (t) {
  var i = D.create(null, t);
  i.trigger(0, { vel: 1 }); i.set('level', 0.5); i.panic(); i.dispose();
  ok(i.params.level === 0.5 && i.out === null && i.type === t, t + ' silent instrument, same API');
});
var unk = D.create(null, 'nonesuch'); ok(unk.type === 'unknown', 'unknown type gives a silent instrument');

// ------------------------------------------------------------------ 3. every voice triggers, lands in _live, panic clears
console.log('3. fake context: trigger, _live, panic');
types.forEach(function (t) {
  var ctx = new RecCtx(44100, false), i = D.create(ctx, t, { level: 0.8 });
  ok(!!i.out && !!i.pre, t + ' builds nodes');
  i.out.connect(ctx.destination);
  var s0 = F.stats.started;
  i.trigger(0.5, { vel: 1 });
  ok(F.stats.started > s0 && i._live.length === 1, t + ' trigger starts sources and registers one voice in _live');
  var v = i._live[0];
  ok(v && v.srcs.length > 0 && v.srcs.every(function (s) { return s._started; }), t + ' voice sources started');
  i.panic();
  ok(v.srcs.every(function (s) { return near(lastStop(s), ctx.currentTime + 0.03, 1e-9); }), t + ' panic stops every source of the live voice 30 ms from now');
  ctx.flush();
  ok(i._live.length === 0, t + ' voice leaves _live when its sources end');
  i.trigger(1.0, { vel: 0.3, accent: true }); i.trigger(1.0, {}); i.trigger(1.0, null);
  ok(i._live.length === 3, t + ' three overlapping hits, three voices');
  i.dispose();
  ctx.flush();
  ok(i._live.length === 0, t + ' dispose clears');
});
ok(bad.length === 0, 'no non-finite time, value or time constant handed to an AudioParam (' + bad.slice(0, 3).join(' ') + ')');

// ------------------------------------------------------------------ 4. choke
console.log('4. hat choke');
(function () {
  function chokedBy(a, b, t0, t1) {
    var ctx = new RecCtx(44100, false), ia = D.create(ctx, a), ib = D.create(ctx, b);
    ia.out.connect(ctx.destination); ib.out.connect(ctx.destination);
    ia.trigger(t0, { vel: 1 });
    var va = ia._live[0];
    ib.trigger(t1, { vel: 1 });
    var g = va.chokeG.gain.calls, ramp = g.filter(function (c) { return c[0] === 'linearRampToValueAtTime' && c[1] === 0.0001; });
    var stopped = va.srcs.every(function (s) { return near(lastStop(s), t1 + 0.006, 1e-9); });
    return ramp.length === 1 && near(ramp[0][2], t1 + 0.005, 1e-9) && stopped;
  }
  ok(chokedBy('oh808', 'ch808', 0.2, 0.5), 'ch808 chokes a sounding oh808 (5 ms fade at the closed hat)');
  ok(chokedBy('oh808', 'oh808', 0.2, 0.5), 'a new oh808 retriggers the single hat source');
  ok(!chokedBy('ch808', 'cp808', 0.2, 0.5) && !chokedBy('oh808', 'cb808', 0.2, 0.5) && !chokedBy('oh808', 'cy808', 0.2, 0.5), 'other 808 voices do not choke the open hat');
  ok(chokedBy('oh909', 'ch909', 0.2, 0.5), 'ch909 chokes oh909');
  ok(chokedBy('oh909', 'oh909', 0.2, 0.5) && chokedBy('ch909', 'oh909', 0.2, 0.5), 'the 909 hats are one channel: any new hat stops the previous');
  ok(!chokedBy('oh909', 'cr909', 0.2, 0.5) && !chokedBy('oh909', 'rd909', 0.2, 0.5) && !chokedBy('oh909', 'cp909', 0.2, 0.5), 'crash, ride and clap do not choke the 909 hat');
  ok(!chokedBy('oh808', 'ch909', 0.2, 0.5) && !chokedBy('oh909', 'ch808', 0.2, 0.5), '808 and 909 hats are separate channels');
  // another context is independent
  var c1 = new RecCtx(), c2 = new RecCtx(), a = D.create(c1, 'oh808'), b = D.create(c2, 'ch808');
  a.trigger(0, {}); b.trigger(0.3, {});
  ok(a._live[0].srcs.every(function (s) { return lastStop(s) > 0.4; }), 'choke groups are per context');
  // the choked voice leaves the group registry once it is gone: a later closed hat has nothing to choke
  var cx = new RecCtx(), oh = D.create(cx, 'oh808'), ch = D.create(cx, 'ch808');
  oh.trigger(0, {}); var vo = oh._live[0]; cx.flush();
  ch.trigger(1, {});
  ok(!vo.chokeG.gain.calls.some(function (c) { return c[0] === 'linearRampToValueAtTime' && c[1] === 0.0001 && c[2] > 0.9; }), 'a finished open hat is not choked');
})();

// ------------------------------------------------------------------ 5. parameter clamping
console.log('5. parameter ranges clamp');
types.forEach(function (t) {
  var i = D.create(new RecCtx(), t), s = D.spec(t), good = true, k;
  for (k in s) {
    i.set(k, s[k].max + 1000); if (i.get(k) !== s[k].max) good = false;
    i.set(k, s[k].min - 1000); if (i.get(k) !== s[k].min) good = false;
    i.set(k, s[k].value); if (i.get(k) !== s[k].value) good = false;
  }
  ok(good && i.set('nonesuch', 1) === false && i.set('level', NaN) === false, t + ' every parameter clamps to [min, max]');
});
(function () {
  var ctx = new RecCtx(), i = D.create(ctx, 'bd808', { decay: 99, tune: 1, bogus: 5 });
  ok(i.get('decay') === 0.8 && i.get('tune') === 45 && i.get('bogus') === undefined, 'create() options go through the clamp, unknown options are ignored');
  var c0 = i.out.gain.calls.length; i.set('level', 0.4);
  ok(i.out.gain.calls.length > c0 && i.out.gain.calls[i.out.gain.calls.length - 1][1] === 0.4, 'level writes the output gain');
  var cv = i._shaper.curve; i.set('drive', 1);
  ok(i._shaper.curve !== cv && i._shaper.curve.length > 0, 'drive rebuilds the shaper curve');
})();

// ------------------------------------------------------------------ 6. the metal bank and filters (Werner, Abel, Smith 2014)
console.log('6. metal bank and filter centres');
(function () {
  var plain = new RecCtx(44100, false), wave = new RecCtx(44100, true);
  var b = D.bank(wave);
  ok(JSON.stringify(b.freqs) === JSON.stringify([205.3, 369.6, 304.4, 522.7, 800, 540]), 'bank frequencies 205.3, 369.6, 304.4, 522.7, 800, 540 Hz');
  ok(b.duty === 0.4798 && JSON.stringify(b.bp) === JSON.stringify([3440, 7210]) && JSON.stringify(b.bpPaper) === JSON.stringify([3440, 7100]) && b.hp === 14400 && b.hpOpen === 7800 && b.hpClosed === 11700 && JSON.stringify(b.cowbell) === JSON.stringify([800, 540]), 'duty 47.98 %, band-passes 3440 (paper) and 7210 Hz (manual), high-passes 14400 (cymbal), 7800 (OH), 11700 Hz (CH), cowbell pair 800 and 540');
  ok(D.bank(wave) === b && wave.waves.length === 1 && b.wave === wave.waves[0], 'one bank and one PeriodicWave per context');
  ok(D.bank(plain).wave === null, 'no createPeriodicWave: the bank has no wave (voices fall back to square)');
  // the pulse wave really has the duty: fraction of the cycle above the mean
  var co = D.pulseCoeffs(0.4798, 200), up = 0, N = 2000, i, k;
  for (i = 0; i < N; i++) {
    var ph = 2 * Math.PI * i / N, s = 0;
    for (k = 1; k <= 200; k++) s += co.real[k] * Math.cos(k * ph) + co.imag[k] * Math.sin(k * ph);
    if (s > 0) up++;
  }
  ok(near(up / N, 0.4798, 0.01), 'PeriodicWave coefficients give a 47.98 % pulse (' + (up / N).toFixed(4) + ')');

  function freqsOf(ctx) {
    return ctx.nodes.filter(function (n) { return n.type_ === 'osc'; }).map(function (n) { return n.frequency.calls.filter(function (c) { return c[0] === 'setValueAtTime'; })[0][1]; });
  }
  function filtersOf(ctx) {
    return ctx.nodes.filter(function (n) { return n.type_ === 'biquad'; }).map(function (n) { return n.type + ':' + n.frequency.value; });
  }
  var c = new RecCtx(44100, true), h = D.create(c, 'ch808');
  h.trigger(0, { vel: 1 });
  var f = freqsOf(c).sort(function (x, y) { return x - y; });
  ok(JSON.stringify(f) === JSON.stringify([205.3, 304.4, 369.6, 522.7, 540, 800]), 'ch808 starts the six oscillators at the paper\'s frequencies');
  ok(c.nodes.filter(function (n) { return n.type_ === 'osc'; }).every(function (n) { return n.wave === b0(c); }), 'ch808 oscillators use the shared pulse wave');
  function b0(ctx) { return D.bank(ctx).wave; }
  var fl = filtersOf(c);
  ok(fl.indexOf('bandpass:3440') >= 0 && fl.indexOf('bandpass:7210') >= 0 && fl.indexOf('highpass:11700') >= 0, 'ch808 filters: band-pass 3440 and 7210, high-pass 11700 (' + fl.join(' ') + ')');
  // tune ratio and spread
  var c2 = new RecCtx(), h2 = D.create(c2, 'oh808', { tune: 1.25 }); h2.trigger(0, {});
  ok(near(freqsOf(c2).sort(function (x, y) { return x - y; })[0], 205.3 * 1.25, 1e-9), 'tune scales the bank');
  var c3 = new RecCtx(), h3 = D.create(c3, 'oh808', { spread: 1 }); h3.trigger(0, {});
  var f3 = freqsOf(c3).sort(function (x, y) { return x - y; }), ex = [205.3, 304.4, 369.6, 522.7, 540, 800];
  ok(f3.every(function (x, j) { return Math.abs(x / ex[j] - 1) <= 0.05 + 1e-9; }) && f3.some(function (x, j) { return x !== ex[j]; }), 'spread 1 jitters each oscillator by at most 5 %');
  // cowbell: exactly two oscillators at 800 and 540, band-pass 2640
  var c4 = new RecCtx(), h4 = D.create(c4, 'cb808'); h4.trigger(0, {});
  ok(JSON.stringify(freqsOf(c4).sort(function (x, y) { return x - y; })) === JSON.stringify([540, 800]) && filtersOf(c4).indexOf('bandpass:2640') >= 0, 'cb808 uses only the 540 and 800 Hz oscillators and a band-pass at 2640 Hz (prior)');
  // cymbal: three bands
  var c5 = new RecCtx(), h5 = D.create(c5, 'cy808'); h5.trigger(0, {});
  var f5 = filtersOf(c5);
  ok(f5.indexOf('bandpass:3440') >= 0 && f5.indexOf('bandpass:7210') >= 0 && f5.indexOf('highpass:14400') >= 0, 'cy808 has the three bands (3440, 7210, high-pass 14400)');
  // plain square fallback
  var c6 = new RecCtx(44100, false), h6 = D.create(c6, 'ch808'); h6.trigger(0, {});
  ok(c6.nodes.filter(function (n) { return n.type_ === 'osc'; }).every(function (n) { return n.type === 'square'; }), 'without PeriodicWave the oscillators are plain squares');
  // the open hat's bands decay with different time constants; the closed hat is shorter than the open one
  function tcs(type) {
    var cx = new RecCtx(), ins = D.create(cx, type); ins.trigger(0, {});
    var out = []; cx.nodes.forEach(function (n) { if (n.type_ === 'gain') n.gain.calls.forEach(function (cl) { if (cl[0] === 'setTargetAtTime' && cl[1] === 0) out.push(cl[3]); }); });
    return out;
  }
  var tc = tcs('ch808'), to = tcs('oh808');
  ok(Math.max.apply(null, to) > Math.max.apply(null, tc) * 4, 'oh808 rings several times longer than ch808 at default settings');
})();

// ------------------------------------------------------------------ 7. bd808 and bd909 pitch tracks
console.log('7. kick pitch tracks, hold and step levels');
(function () {
  function osc0(ctx) { return ctx.nodes.filter(function (n) { return n.type_ === 'osc'; })[0]; }
  function peakRamp(ctx) { var m = 0; ctx.nodes.forEach(function (n) { if (n.type_ === 'gain') n.gain.calls.forEach(function (c) { if (c[0] === 'linearRampToValueAtTime' && c[1] > m) m = c[1]; }); }); return m; }
  // bd909
  var c = new RecCtx(), k = D.create(c, 'bd909'); k.trigger(2, { vel: 1 });
  var fq = osc0(c).frequency.calls, set = fq.filter(function (x) { return x[0] === 'setValueAtTime'; })[0], tg = fq.filter(function (x) { return x[0] === 'setTargetAtTime'; })[0];
  ok(set[1] === 274 && set[2] === 2 && tg[1] === 53 && tg[2] === 2 && tg[3] === 0.007, 'bd909 pitch: starts at 274 Hz, falls to 53 Hz with the 7 ms Tune time constant');
  function fAt(t) { return tg[1] + (set[1] - tg[1]) * Math.exp(-t / tg[3]); }
  ok(near(fAt(0), 274, 1e-9) && near(fAt(0.2), 53, 1e-6) && fAt(0.007) < 274 && fAt(0.007) > 53, 'bd909 analytic pitch track: 274 Hz at the hit, 53 Hz settled');
  var g1 = c.nodes.filter(function (n) { return n.type_ === 'gain' && n.gain.calls.some(function (x) { return x[0] === 'setTargetAtTime'; }); })[0].gain.calls;
  var tgh = g1.filter(function (x) { return x[0] === 'setTargetAtTime'; })[0], hold = g1.filter(function (x) { return x[0] === 'setValueAtTime' && x[2] > 2.05; })[0];
  ok(tgh && hold && near(tgh[2] - 2, 0.0003 + 0.06, 1e-9) && tgh[3] === 0.035 && near(hold[2], tgh[2], 1e-9), 'bd909 amplitude is flat for 60 ms, then decays with the 35 ms time constant');
  var c1 = new RecCtx(), k1 = D.create(c1, 'bd909', { tune: 1, decay: 1, start: 1, end: 1 }); k1.trigger(0, {});
  var tg1 = osc0(c1).frequency.calls.filter(function (x) { return x[0] === 'setTargetAtTime'; })[0];
  ok(tg1[3] === 0.04 && tg1[1] === 40 && osc0(c1).frequency.calls[0][1] === 150, 'bd909 Tune maxes at 40 ms (manual); start and end clamp to 150 and 40 Hz');
  var lo = D.create(new RecCtx(), 'bd909'); lo.set('tune', 0); lo.set('decay', 0);
  ok(lo.get('tune') === 0.007 && lo.get('decay') === 0.012, 'bd909 Tune and Decay clamp at 7 ms and 12 ms');
  // step levels
  var amps = [0, 1, 2].map(function (s) { var cx = new RecCtx(), q = D.create(cx, 'bd909'); q.trigger(0, { vel: 1, step: s }); return peakRamp(cx); });
  ok(near(amps[1] / amps[0], Math.pow(10, 9 / 20), 1e-6) && near(amps[2] / amps[1], Math.pow(10, 9 / 20), 1e-6) && JSON.stringify(D.STEP_DB) === '[-18,-9,0]', '909 step levels weak / normal / accent are -18 / -9 / 0 dB');
  // bd808
  var c8 = new RecCtx(), b8 = D.create(c8, 'bd808'); b8.trigger(1, { vel: 1 });
  var f8 = osc0(c8).frequency.calls, s8 = f8.filter(function (x) { return x[0] === 'setValueAtTime'; })[0], t8 = f8.filter(function (x) { return x[0] === 'setTargetAtTime'; });
  ok(near(s8[1], 56 * 2.8, 1e-9) && near(t8[0][2], 1.006, 1e-9) && t8[0][1] === 56 && t8[1][1] < 56 && t8[1][1] > 50 && D.spec('bd808').tune.value === 56, 'bd808: 56 Hz default; starts 2.8x up for 6 ms on every hit, returns to 56 Hz, then a slow droop');
  ok(near(1 / 56, 0.018, 0.0005), 'the 56 Hz default has the manual\'s 18 ms period');
  function peakAny(cx) { var m = 0; cx.nodes.forEach(function (n) { if (n.type_ === 'gain') n.gain.calls.forEach(function (c) { if ((c[0] === 'linearRampToValueAtTime' || c[0] === 'setValueAtTime') && c[1] > m && c[2] > 0) m = c[1]; }); }); return m; }
  function accRatio(type) { var r = [false, true].map(function (acc) { var cx = new RecCtx(), q = D.create(cx, type, { click: 0 }); q.trigger(0, { vel: 0.5, accent: acc }); return peakAny(cx); }); return r[1] / r[0]; }
  var tbl = D.ACC808, allAcc = true;
  Object.keys(tbl).forEach(function (k) { if (!near(accRatio(k), tbl[k], 1e-6)) { allAcc = false; console.log('   accent ratio ' + k + ' ' + accRatio(k) + ' vs ' + tbl[k]); } });
  ok(allAcc && tbl.bd808 === 2.86 && tbl.ma808 === 1.67 && tbl.mt808 === 3.67 && Object.keys(tbl).length === 16, 'accent peak ratios follow the service notes table (1.67 to 3.67) on all 16 808 voices');
  var cq = new RecCtx(), bq = D.create(cq, 'bd808'); bq.trigger(0, { vel: 1, accent: true });
  var fq8 = osc0(cq).frequency.calls, dbl = fq8.filter(function (x) { return x[0] === 'setValueAtTime'; })[1], tq = fq8.filter(function (x) { return x[0] === 'setTargetAtTime'; });
  ok(dbl && near(dbl[1], 112, 1e-9) && near(dbl[2], 0.006, 1e-9) && near(tq[0][2], 0.010, 1e-9) && tq[0][1] === 56, 'bd808 accent: frequency doubled (112 Hz) for 4 ms after the 6 ms shift, then 56 Hz');
  var cn = new RecCtx(), bn = D.create(cn, 'bd808'); bn.trigger(0, { vel: 1 });
  ok(osc0(cn).frequency.calls.filter(function (x) { return x[0] === 'setValueAtTime'; }).length === 1, 'bd808 unaccented: no doubling window');
  function bodyTau(type, dec) { var cx = new RecCtx(), q = D.create(cx, type, { decay: dec }); q.trigger(0, { vel: 1, accent: true }); var best = 0; cx.nodes.forEach(function (n) { if (n.type_ === 'gain') n.gain.calls.forEach(function (c) { if (c[0] === 'setTargetAtTime' && c[3] > best) best = c[3]; }); }); return best; }
  var LN10 = Math.LN10;
  ok(near(bodyTau('bd808', 0.05) * LN10, 0.05, 1e-6) && near(bodyTau('bd808', 0.8) * LN10, 0.8, 1e-6) && D.spec('bd808').decay.min === 0.05 && D.spec('bd808').decay.max === 0.8 && D.spec('bd808').decay.value === 0.3, 'bd808 decay 50 ms to 800 ms, 300 ms at mid (to 1/10)');
  ok(D.spec('cy808').decay.min === 0.35 && D.spec('cy808').decay.max === 1.2 && D.spec('cy808').decay.value === 0.8 && near(bodyTau('cy808', 1.2) * LN10, 1.2, 1e-6), 'cy808 decay 350 / 800 / 1200 ms');
  ok(D.spec('oh808').decay.min === 0.09 && D.spec('oh808').decay.max === 0.6 && D.spec('oh808').decay.value === 0.45 && near(bodyTau('oh808', 0.09) * LN10, 0.09, 1e-6) && D.spec('ch808').decay.value === 0.05, 'oh808 decay 90 / 450 / 600 ms, ch808 50 ms');
  function clapPulses(opts) { var cx = new RecCtx(), q = D.create(cx, 'cp808', opts); q.trigger(0, { vel: 1, accent: true }); var best = null; cx.nodes.forEach(function (n) { if (n.type_ === 'gain') { var sv = n.gain.calls.filter(function (c) { return c[0] === 'setValueAtTime' && c[1] > 0; }); var tg = n.gain.calls.filter(function (c) { return c[0] === 'setTargetAtTime'; }); if (sv.length > 1 && tg.length === sv.length) best = sv; } }); return best; }
  var pu = clapPulses({}), pu2 = clapPulses({ bursts: 6, spacing: 0.03 }), pu3 = clapPulses({ bursts: 6, spacing: 0.01 });
  ok(pu && pu.length === 3 && near(pu[1][2] - pu[0][2], 0.01, 1e-9) && near(pu[1][1] / pu[0][1], Math.exp(-0.01 / 0.0385), 1e-6), 'cp808 plays three pulses 10 ms apart with the 38.5 ms envelope');
  ok(pu2 && pu2.length === 2 && pu3 && pu3.length === 4, 'the 30 ms gate limits the pulse count (spacing 30 ms: 2, 10 ms: 4)');
  ok(near(bodyTau('cp808', 0.1) * LN10, 0.1, 1e-6) && D.spec('cp808').decay.value === 0.1 && D.spec('cp808').bursts.value === 3, 'cp808 main decay 100 ms after the third pulse');
  function freqsOfType(type, o) { var cx = new RecCtx(), q = D.create(cx, type, o); q.trigger(0, { vel: 1 }); return cx.nodes.filter(function (n) { return n.type_ === 'osc'; }).map(function (n) { return n.frequency.calls[0][1]; }).sort(function (x, y) { return x - y; }); }
  function filtersOfType(type, o) { var cx = new RecCtx(), q = D.create(cx, type, o); q.trigger(0, { vel: 1 }); return cx.nodes.filter(function (n) { return n.type_ === 'biquad'; }).map(function (n) { return n.type + ':' + n.frequency.value; }); }
  ok(JSON.stringify(freqsOfType('sd808')) === '[238,476]' && filtersOfType('sd808', { tone: 0 }).join() === filtersOfType('sd808', { tone: 1 }).join(), 'sd808: resonators at 238 and 476 Hz, TONE does not touch the noise filter (it is a balance)');
  ok(JSON.stringify(freqsOfType('cl808')) === '[2526]' && freqsOfType('rs808').join() === '452.5,1667' && filtersOfType('ma808')[0] === 'highpass:2340', 'cl808 2526 Hz, rs808 452.5 and 1667 Hz, ma808 high-pass 2340 Hz');
  ok(D.spec('cl808').decay.value === 0.025 && D.spec('rs808').decay.value === 0.01 && D.spec('ma808').decay.value === 0.025 && D.spec('cb808').decay.value === 0.05, 'claves 25 ms, rim 10 ms, maracas 25 ms, cowbell 50 ms');
  ok(['lt808', 'mt808', 'ht808', 'lc808', 'mc808', 'hc808'].map(function (k) { return D.spec(k).decay.value; }).join() === '0.2,0.13,0.1,0.18,0.1,0.08', 'tom and conga decays 200 / 130 / 100 and 180 / 100 / 80 ms');
  ok(oscHz('mt808', 0) === 120 && oscHz('mt808', 100) === 160 && oscHz('ht808', 0) === 165 && oscHz('ht808', 100) === 220 && oscHz('lc808', 0) === 165 && oscHz('mc808', 100) === 310 && oscHz('hc808', 0) === 370, 'tom and conga tuning ends match the check table');
  // 909 manual values
  var fs9 = freqsOfType('sd909', { glide: 0 });
  ok(near(fs9[1] / fs9[0], 1.47, 1e-9) && D.spec('sd909').ratio.value === 1.47 && D.spec('sd909').glideTime.value === 0.02, 'sd909: second oscillator at 1.47x, pitch bend about 20 ms');
  ok(filtersOfType('rs909').filter(function (x) { return /bandpass/.test(x); }).join() === 'bandpass:219,bandpass:495,bandpass:1053'.split(',').sort(function (a, b) { return 0; }).join() || ['bandpass:495', 'bandpass:219', 'bandpass:1053'].every(function (x) { return filtersOfType('rs909').indexOf(x) >= 0; }), 'rs909 band-passes at 495, 219 and 1053 Hz');
  ok(filtersOfType('cp909').indexOf('highpass:185') >= 0 && D.spec('rs909').decay.value === 0.005, 'cp909 high-pass 185 Hz, rs909 ringing 5 ms');
  ok(D.spec('bd909').clickDecay.value === 0.0007 && D.spec('bd909').tune.value === 0.007 && D.spec('bd909').decay.max === 0.35 && D.spec('bd909').tune.max === 0.04 && D.spec('lt909').decay.min === 0.038 && D.spec('lt909').decay.max === 0.38, 'bd909 click 0.7 ms, Tune up to 40 ms, Decay up to 350 ms; tom decay 38 to 380 ms');
  var a9 = [false, true].map(function (acc) { var cx = new RecCtx(), q = D.create(cx, 'bd909'); q.trigger(0, { vel: 1, accent: acc }); return peakAny(cx); });
  ok(near(a9[1] / a9[0], 2, 1e-6), '909 accent is 6 dB (x2)');
  // toms: the 909 hold and tune endpoints
  var ct = new RecCtx(), tm = D.create(ct, 'lt909', { decay: 0.15 }); tm.trigger(0, {});
  var tg9 = ct.nodes.filter(function (n) { return n.type_ === 'gain'; }).map(function (n) { return n.gain.calls.filter(function (x) { return x[0] === 'setTargetAtTime' && x[3] === 0.15; })[0]; }).filter(Boolean)[0];
  ok(tg9 && near(tg9[2], 0.0003 + 0.03, 1e-9), 'lt909 holds 30 ms then decays with the 150 ms time constant');
  // 808 tom tune end points
  function oscHz(type, tune) { var cx = new RecCtx(), q = D.create(cx, type, { tune: tune, sweep: 0 }); q.trigger(0, {}); return osc0(cx).frequency.calls[0][1]; }
  ok(oscHz('lt808', 100) === 100 && oscHz('lt808', 0) === 80 && oscHz('hc808', 100) === 455 && oscHz('hc808', 0) === 370 && oscHz('mt808', 50) === 140, '808 tom and conga tuning runs between the io-808 end points (priors)');
})();

// ------------------------------------------------------------------ 8. 909 hat buffers are rendered once per context
console.log('8. 909 sampled-voice fallbacks');
(function () {
  var c = new RecCtx(), h = D.create(c, 'ch909'), o = D.create(c, 'oh909');
  h.trigger(0, {}); var n1 = c.bufs.length; h.trigger(1, {}); o.trigger(2, {}); var n2 = c.bufs.length; o.trigger(3, {});
  ok(n1 === 1 && n2 === 2 && c.bufs.length === 2, 'each hat buffer is rendered once per context and reused (' + c.bufs.length + ' buffers)');
  var b = c.bufs[0], d = b.getChannelData(0), pk = 0, e = 0, i;
  for (i = 0; i < d.length; i++) { if (!isFinite(d[i])) pk = Infinity; pk = Math.max(pk, Math.abs(d[i])); e += d[i] * d[i]; }
  var sixbit = true; for (i = 0; i < d.length; i++) if (Math.abs(d[i] * 32 - Math.round(d[i] * 32)) > 1e-5) sixbit = false;
  ok(isFinite(pk) && pk > 0.85 && pk <= 0.92 && e > 0, 'closed-hat buffer is finite, peaks at 0.9, not silent');
  ok(b.sampleRate === 30000 && b.length === 8192 && near(b.duration, 0.2731, 1e-4) && c.bufs[1].sampleRate === 30000 && c.bufs[1].length === 24576 && near(c.bufs[1].duration, 0.8192, 1e-4), '909 sample clock 30 kHz: closed hat 8192 samples (0.273 s), open hat 24576 samples (0.819 s)');
  ok(sixbit, 'the ROM buffers are 6-bit (every sample a multiple of 1/32 at the default crush)');
  var cr = new RecCtx(), x = D.create(cr, 'cr909', { crush: 0 }), y = D.create(cr, 'rd909', { crush: 1 });
  x.trigger(0, {}); y.trigger(0, {});
  ok(cr.bufs.length === 2 && near(cr.bufs[0].duration, 1.0923, 2e-3) && cr.bufs[1].sampleRate === 30000 && cr.bufs[1].length === 32768 && near(cr.bufs[1].duration, 1.0923, 1e-3), 'crash and ride are 32768 samples (1.09 s); crush 0 is a clean buffer at the context rate');
  var rate = x._live[0].srcs[0].playbackRate.calls[0][1];
  ok(rate === 1, 'crash plays at rate 1 with Tune 0');
  x.set('tune', 0.5); x.trigger(1, {});
  ok(near(x._live[1].srcs[0].playbackRate.calls[0][1], Math.SQRT2, 1e-9), 'crash Tune +0.5 octave = rate sqrt(2)');
  var hc = D.create(new RecCtx(), 'ch909'), ho = D.create(new RecCtx(), 'oh909');
  ok(hc.get('decay') === 0.008 && ho.get('decay') === 0.069 && D.spec('ch909').hold.value === 0.006 && D.spec('oh909').hold.value === 0.012, '909 hat defaults: 8 ms and 69 ms time constants, 6 ms and 12 ms hold');
  hc.set('decay', 9); ho.set('decay', 0); ok(hc.get('decay') === 0.06 && ho.get('decay') === 0.03, '909 hat decay clamps at 60 ms (closed max) and 30 ms (open min)');
  ok(D.spec('oh909').decay.max === 0.16 && D.spec('ch909').decay.min === 0.008, 'hat decay ranges 8 to 60 ms closed, 30 to 160 ms open');
  ok(D.spec('sd909').tone.min === 0.04 && D.spec('sd909').tone.max === 0.34 && D.spec('bd909').decay.min === 0.012 && D.spec('bd909').decay.max === 0.35 && D.spec('bd909').tune.min === 0.007 && D.spec('bd909').tune.max === 0.04, 'snare Tone 40 to 340 ms, bass drum Decay 12 to 350 ms, Tune 7 to 40 ms');
})();

console.log(fails ? 'FAILED: ' + fails + ' of ' + checks + ' checks failed' : 'OK: ' + checks + ' checks passed');
process.exit(fails ? 1 : 0);
