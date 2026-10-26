#!/usr/bin/env node
/* Havantechno - processors-check.js (A8)
 * Node check for app/engine/processors.js with a fake AudioContext. Run: node tools/processors-check.js
 *
 * The fake context is not copied: the section "fake Web Audio" of app/engine/selfcheck.js is read and run here.
 * Regression: for every processor, the automation calls of the parameters that existed before (the spec of the archived
 * olde Havantechno dub studio/processors.js, which is byte-identical to the first app file) must match the new file.
 * Only connected nodes are compared, so helper nodes that a default build leaves unused do not count.
 * Checks of the new parameters: loop and modulation topology, the Freeverb network (node count, lengths at 44.1 and 48 kHz,
 * comb gains from size), seeded impulse, chorus base and invert, widener monoBelow, sidechain curve and retrigger.
 * What it cannot check: the sound. Filters, the Freeverb tail, the impulse shape and the ducking curve are not rendered here.
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');

var ROOT = path.join(__dirname, '..');
var ENGINE = path.join(ROOT, 'app', 'engine');
var ARCHIVE = path.join(ROOT, 'olde Havantechno dub studio');

var fails = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; console.log('  FAIL ' + msg); } else console.log('  ok   ' + msg); }

// ------------------------------------------------------------------ fake Web Audio, from selfcheck.js
var sc = fs.readFileSync(path.join(ENGINE, 'selfcheck.js'), 'utf8');
var fakeStart = sc.indexOf('// ------------------------------------------------------------------ fake Web Audio');
var fakeEnd = sc.indexOf('function load(sandbox)');
if (fakeStart < 0 || fakeEnd < 0) { console.log('FAILED: the fake Web Audio section was not found in selfcheck.js'); process.exit(1); }
var fake = vm.runInNewContext(sc.slice(fakeStart, fakeEnd) + '\n;({ FakeContext: FakeContext, Param: Param });', {});
var Fake = fake.FakeContext;

// ------------------------------------------------------------------ engine loading
function loadProcessors(file) {
  var sb = { console: console, Float32Array: Float32Array, Uint8Array: Uint8Array, ArrayBuffer: ArrayBuffer };
  sb.window = sb; sb.globalThis = sb;
  var ctx = vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ENGINE, 'core.js'), 'utf8'), ctx, { filename: 'core.js' });
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: path.basename(file) });
  return sb.Processors;
}
var P = loadProcessors(path.join(ENGINE, 'processors.js'));           // the file under test
var B = loadProcessors(path.join(ARCHIVE, 'processors.js'));          // the archived baseline

// ------------------------------------------------------------------ helpers
function nodesOf(proc, type) { return proc.nodes.filter(function (n) { return n.type_ === type; }); }
// is there a path from `from` to `to`? noDelay: the path may not pass a DelayNode
function reaches(from, to, opts) {
  var stack = [from], seen = [from];
  while (stack.length) {
    var n = stack.pop();
    if (n === to) return true;
    var outs = n.connections || [];
    for (var i = 0; i < outs.length; i++) {
      var c = outs[i];
      if (!c || seen.indexOf(c) >= 0) continue;
      if (opts && opts.noDelay && c.type_ === 'delay') continue;
      seen.push(c); stack.push(c);
    }
  }
  return false;
}
function callsOf(param, method) { return (param.calls || []).filter(function (c) { return c[0] === method; }); }
function sameBuffer(a, b) {
  if (!a || !b || a.numberOfChannels !== b.numberOfChannels || a.length !== b.length) return false;
  for (var c = 0; c < a.numberOfChannels; c++) {
    var x = a.getChannelData(c), y = b.getChannelData(c);
    for (var i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  }
  return true;
}
// every automation call of every connected node's parameters, as a sorted list (order-free comparison)
function signature(proc) {
  var out = [];
  proc.nodes.forEach(function (n) {
    if (!n.connections || n.connections.length === 0) return;
    Object.keys(n).forEach(function (k) {
      var v = n[k];
      if (v && typeof v === 'object' && Array.isArray(v.calls) && v.calls.length) out.push(n.type_ + '.' + k + ' ' + JSON.stringify(v.calls));
    });
  });
  return out.sort();
}
function near(a, b, eps) { return Math.abs(a - b) <= (eps || 1e-9); }

// ------------------------------------------------------------------ 1. regression against the archived processors
console.log('1. defaults and existing parameters match the archived processors.js');
(function () {
  var TYPES = ['filter', 'saturator', 'delay', 'reverb', 'eq3', 'compressor', 'limiter', 'widener', 'chorus', 'sidechain'];
  TYPES.forEach(function (t) {
    var spec = B.spec(t), ops = [], k;
    for (k in spec) if (spec.hasOwnProperty(k)) {
      var s = spec[k];
      if (typeof s.value === 'number') { ops.push([k, s.max]); ops.push([k, s.min, { at: 2, ramp: 1 }]); ops.push([k, s.value]); }
      else if (typeof s.value === 'boolean') { ops.push([k, !s.value]); ops.push([k, s.value]); }
      else if (k === 'mode') { ops.push([k, 'highpass']); ops.push([k, 'lowpass']); }
    }
    function run(mod) {
      var c = new Fake(44100), proc = mod.create(c, t);
      ops.forEach(function (o) { proc.set(o[0], o[1], o[2]); });
      if (t === 'sidechain') { proc.trigger(100); proc.trigger(110); proc.trigger(120); }   // spaced past any release: no retrigger
      return proc;
    }
    var a = signature(run(P)), b = signature(run(B));
    ok(JSON.stringify(a) === JSON.stringify(b), t + ': ' + ops.length + ' existing-parameter operations, ' + a.length + ' automation lists identical');
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      var i = 0; while (i < a.length && a[i] === b[i]) i++;
      console.log('     first difference: new ' + a[i] + ' | old ' + b[i]);
    }
  });
})();

// ------------------------------------------------------------------ 2. delay: loop and modulation
console.log('2. delay: loop (filters in the feedback path) and modRate / modDepth');
(function () {
  var c1 = new Fake(44100), d = P.create(c1, 'delay');
  var dL = nodesOf(d, 'delay')[0], bq = nodesOf(d, 'biquad'), lp = bq[0], hp = bq[1];
  var fbL = dL.connections.filter(function (n) { return n.type_ === 'gain'; })[0];
  ok(reaches(d.input, lp, { noDelay: true }) && !reaches(fbL, lp, { noDelay: true }), 'loop off: the input is filtered on the way in, the feedback is not');

  var c2 = new Fake(44100), dl = P.create(c2, 'delay', { loop: true });
  var dL2 = nodesOf(dl, 'delay')[0], dR2 = nodesOf(dl, 'delay')[1], bq2 = nodesOf(dl, 'biquad');
  var lp2 = bq2[0], hp2 = bq2[1], lpR2 = bq2[2], hpR2 = bq2[3];
  var fbL2 = dL2.connections.filter(function (n) { return n.type_ === 'gain'; })[0];
  var fbR2 = dR2.connections.filter(function (n) { return n.type_ === 'gain'; })[0];
  ok(!reaches(dl.input, lp2, { noDelay: true }), 'loop on: the input does not reach the tone filter without a delay');
  ok(reaches(fbL2, hp2, { noDelay: true }) && reaches(fbL2, lp2, { noDelay: true }), 'loop on: left feedback goes through hp then the tone filter');
  ok(reaches(fbR2, hpR2, { noDelay: true }) && reaches(fbR2, lpR2, { noDelay: true }) && !reaches(fbR2, lp2, { noDelay: true }), 'loop on: right feedback uses its own pair of filters');
  dl.set('loop', false);
  ok(reaches(dl.input, lp2, { noDelay: true }), 'loop switched off again: the input path is restored');

  var c3 = new Fake(44100), dm = P.create(c3, 'delay', { modRate: 3, modDepth: 0.004 });
  var osc = nodesOf(dm, 'osc')[0], dmL = nodesOf(dm, 'delay')[0], dmR = nodesOf(dm, 'delay')[1];
  var lfoG = nodesOf(dm, 'gain').filter(function (n) { return n.connections.indexOf(dmL.delayTime) >= 0; })[0];
  ok(callsOf(osc.frequency, 'setTargetAtTime').some(function (x) { return x[1] === 3; }), 'modRate 3 Hz drives the oscillator frequency');
  ok(lfoG && callsOf(lfoG.gain, 'setTargetAtTime').some(function (x) { return x[1] === 0.004; }), 'modDepth 4 ms sets the LFO gain');
  ok(reaches(osc, dmL.delayTime) && reaches(osc, dmR.delayTime), 'the oscillator reaches both delay-time parameters through the gain');
  var c4 = new Fake(44100), d0 = P.create(c4, 'delay');
  ok(d0.params.modRate === 0 && d0.params.modDepth === 0 && d0.params.loop === false, 'defaults: modRate 0, modDepth 0, loop off');
})();

// ------------------------------------------------------------------ 3. reverb: Freeverb network
console.log('3. reverb: algo freeverb on native nodes');
var FV_LEFT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617, 556, 441, 341, 225];
var FV_RIGHT = [1139, 1211, 1300, 1379, 1445, 1514, 1580, 1640, 579, 464, 364, 248];   // 44.1 kHz, spread 23
var FV_LEFT_48 = [1215, 1293, 1390, 1476, 1548, 1623, 1695, 1760, 605, 480, 371, 245];
var FV_RIGHT_48 = [1240, 1318, 1415, 1501, 1573, 1648, 1720, 1785, 630, 505, 396, 270]; // 48 kHz, spread 25
(function () {
  [[44100, FV_LEFT.concat(FV_RIGHT)], [48000, FV_LEFT_48.concat(FV_RIGHT_48)]].forEach(function (cfg) {
    var sr = cfg[0], want = cfg[1];
    var c = new Fake(sr), r = P.create(c, 'reverb', { algo: 'freeverb' });
    var delays = nodesOf(r, 'delay');
    var lens = delays.slice(1).map(function (d) { return Math.round(d.delayTime.value * sr); });   // [0] is the predelay
    ok(delays.length === 25, 'freeverb at ' + sr + ' Hz: ' + delays.length + ' delay nodes = 1 predelay + 12 per channel x 2');
    ok(nodesOf(r, 'convolver').length === 0, 'freeverb at ' + sr + ' Hz: no convolver');
    ok(JSON.stringify(lens) === JSON.stringify(want), 'freeverb at ' + sr + ' Hz: line lengths ' + lens.join(' ') + (JSON.stringify(lens) === JSON.stringify(want) ? '' : ' (want ' + want.join(' ') + ')'));
    ok(reaches(r.input, r._wet), 'freeverb at ' + sr + ' Hz: input reaches the output');
    ok(nodesOf(r, 'merger').length === 1 && nodesOf(r, 'splitter').length === 1, 'freeverb at ' + sr + ' Hz: one splitter and one merger for the stereo sum');
  });
  // comb feedback from RT60: g = 10^(-3 * T / RT60), T = length / sampleRate
  var c2 = new Fake(44100), r2 = P.create(c2, 'reverb', { algo: 'freeverb', size: 2 });
  var want2 = Math.pow(10, -3 * (1116 / 44100) / 2);
  ok(nodesOf(r2, 'gain').some(function (n) { return callsOf(n.gain, 'setTargetAtTime').some(function (x) { return near(x[1], want2, 1e-12); }); }),
     'size 2 s sets comb 1 feedback to ' + want2.toFixed(6) + ' (RT60 relation)');
  r2.set('size', 0.5);
  var want3 = Math.pow(10, -3 * (1116 / 44100) / 0.5);
  ok(nodesOf(r2, 'gain').some(function (n) { return callsOf(n.gain, 'setTargetAtTime').some(function (x) { return near(x[1], want3, 1e-12); }); }), 'size is automatable: 0.5 s gives ' + want3.toFixed(6));
  // switching back to the impulse drops the network
  r2.set('algo', 'ir');
  ok(nodesOf(r2, 'delay').length === 1 && nodesOf(r2, 'convolver').length === 1, 'algo back to ir: network removed, one convolver');
  ok(P.create(new Fake(44100), 'reverb').params.algo === 'ir', 'default algo is ir');
})();

// ------------------------------------------------------------------ 4. reverb: seeded impulse
console.log('4. reverb: seed');
(function () {
  var c = new Fake(44100);
  var a = nodesOf(P.create(c, 'reverb', { seed: 7 }), 'convolver')[0].buffer;
  var b = nodesOf(P.create(c, 'reverb', { seed: 7 }), 'convolver')[0].buffer;
  var e = nodesOf(P.create(c, 'reverb', { seed: 8 }), 'convolver')[0].buffer;
  var u = nodesOf(P.create(c, 'reverb'), 'convolver')[0].buffer, v = nodesOf(P.create(c, 'reverb'), 'convolver')[0].buffer;
  ok(a && sameBuffer(a, b), 'seed 7 twice: the two impulse buffers are identical');
  ok(a && !sameBuffer(a, e), 'seed 8 differs from seed 7');
  ok(u && v && !sameBuffer(u, v), 'seed 0 (default) keeps Math.random: two builds differ');
})();

// ------------------------------------------------------------------ 5. chorus: base and invert
console.log('5. chorus: base and invert');
(function () {
  var c = new Fake(44100);
  var d0 = P.create(c, 'chorus'), dl0 = nodesOf(d0, 'delay');
  ok(near(dl0[0].delayTime.value, 0.014) && near(dl0[1].delayTime.value, 0.021), 'default lines are 14 ms and 21 ms, as before');
  var inv0 = nodesOf(d0, 'gain').filter(function (n) { return n.connections.some(function (x) { return x.type_ === 'merger'; }); });
  ok(inv0.length === 1 && inv0[0].gain.value === 1, 'default: the right wet is not inverted (gain 1)');
  var di = P.create(c, 'chorus', { invert: true }), invI = nodesOf(di, 'gain').filter(function (n) { return n.connections.some(function (x) { return x.type_ === 'merger'; }); })[0];
  ok(callsOf(invI.gain, 'setTargetAtTime').some(function (x) { return x[1] === -1; }), 'invert: the right wet gain goes to -1');
  var db = P.create(c, 'chorus', { base: 3.5 }), dbl = nodesOf(db, 'delay');
  ok(callsOf(dbl[0].delayTime, 'setTargetAtTime').some(function (x) { return near(x[1], 0.0035); }) && callsOf(dbl[1].delayTime, 'setTargetAtTime').some(function (x) { return near(x[1], 0.00525); }),
     'base 3.5 ms: left line 3.5 ms, right line 5.25 ms (1.5 x base)');
})();

// ------------------------------------------------------------------ 6. widener: monoBelow
console.log('6. widener: monoBelow');
(function () {
  var c = new Fake(44100);
  var w0 = P.create(c, 'widener'), hp0 = nodesOf(w0, 'biquad')[0];
  var side0 = nodesOf(w0, 'gain').filter(function (n) { return n.connections.indexOf(hp0) >= 0; })[0];
  var sA0 = side0.connections.filter(function (n) { return n.type_ === 'gain'; })[0];
  var sB0 = hp0.connections[0];
  ok(sA0.gain.value === 1 && sB0.gain.value === 0, 'default: the side goes through unfiltered (direct gate 1, high-pass gate 0)');
  var w1 = P.create(c, 'widener', { monoBelow: 150 }), hp1 = nodesOf(w1, 'biquad')[0];
  var side1 = nodesOf(w1, 'gain').filter(function (n) { return n.connections.indexOf(hp1) >= 0; })[0];
  var sA1 = side1.connections.filter(function (n) { return n.type_ === 'gain'; })[0], sB1 = hp1.connections[0];
  ok(hp1.type === 'highpass' && callsOf(hp1.frequency, 'setTargetAtTime').some(function (x) { return x[1] === 150; }), 'monoBelow 150: side high-passed at 150 Hz');
  ok(callsOf(sA1.gain, 'setTargetAtTime').some(function (x) { return x[1] === 0; }) && callsOf(sB1.gain, 'setTargetAtTime').some(function (x) { return x[1] === 1; }),
     'monoBelow 150: the filtered side replaces the direct side');
  ok(near(hp1.Q.value, -3), 'high-pass Q is -3 (dB, Butterworth)');
  ok(P.create(c, 'widener').params.monoBelow === 0, 'default monoBelow 0 (off)');
})();

// ------------------------------------------------------------------ 7. sidechain: curve and retrigger
console.log('7. sidechain: curve and retrigger from the current level');
function duck(opts, t1, t2) {
  var c = new Fake(44100), s = P.create(c, 'sidechain', opts);
  s.trigger(t1); s.trigger(t2);
  return s.node.gain.calls;
}
function hasCall(calls, method, v, t) {
  return calls.some(function (x) { return x[0] === method && (v === null || near(x[1], v, 1e-9)) && (t === null || near(x[2], t, 1e-9)); });
}
(function () {
  // 1 s spacing: no retrigger, as before
  var calm = duck({}, 1, 2);
  ok(hasCall(calm, 'linearRampToValueAtTime', 0.4, 1.004), 'default: dip to 1 - depth at the attack end (unchanged)');
  // 10 ms apart, default timing: the second kick lands in the hold, so the level is the dip
  var def10 = duck({ curve: 'db' }, 1, 1.010);
  ok(hasCall(def10, 'setValueAtTime', 0.4, 1.010), 'retrigger 10 ms apart in the hold: starts from the dip level 0.4');
  // 10 ms apart, release already running: the level must be read from the curve, not stepped to 0.4
  var lo = 0.4, f = (1.010 - 1.006) / 0.22;
  var expDb = lo * Math.pow(1 / lo, f), expLin = lo + (1 - lo) * f;
  var db10 = duck({ curve: 'db', hold: 0.002 }, 1, 1.010);
  ok(hasCall(db10, 'setValueAtTime', expDb, 1.010), 'curve db, retrigger in the release: starts from ' + expDb.toFixed(5) + ' (not the step 0.4)');
  ok(hasCall(db10, 'cancelScheduledValues', 1.010, null), 'the old schedule from the retrigger on is cancelled');
  ok(hasCall(db10, 'exponentialRampToValueAtTime', 1, 1.236), 'curve db: the new recovery is exponentialRampToValueAtTime(1) at t + len');
  ok(!hasCall(db10, 'linearRampToValueAtTime', 1, 1.236), 'curve db: no linear recovery is scheduled');
  var lin10 = duck({ curve: 'lin', hold: 0.002 }, 1, 1.010);
  ok(hasCall(lin10, 'setValueAtTime', expLin, 1.010) && hasCall(lin10, 'linearRampToValueAtTime', 1, 1.236), 'curve lin, same retrigger: ramps from ' + expLin.toFixed(5) + ' linearly');
  ok(Math.abs(expDb - 0.4) > 0.005, 'the dB curve differs from the old step by ' + (expDb - 0.4).toFixed(4));
  var dd = P.create(new Fake(44100), 'sidechain');
  ok(dd.params.curve === 'lin', 'default curve lin');
})();

// ------------------------------------------------------------------ 8. limiter: safety clip and the master chain
console.log('8. limiter: safety clip (clipOn, clip) and the master output stage');
(function () {
  var c = new Fake(44100), l = P.create(c, 'limiter');
  var sh0 = nodesOf(l, 'shaper')[0];
  ok(sh0 && sh0.curve === null && sh0.oversample === 'none', 'limiter default: clipper is an identity (no curve, no oversampling)');
  var l1 = P.create(c, 'limiter', { clipOn: true, clip: -0.5 }), sh1 = nodesOf(l1, 'shaper')[0];
  var lvl = Math.pow(10, -0.5 / 20);
  ok(sh1.curve && sh1.curve.length === 4096 && near(sh1.curve[4095], lvl, 1e-6) && near(sh1.curve[0], -lvl, 1e-6), 'clipOn at -0.5 dBFS: curve runs to +/-' + lvl.toFixed(4));
  ok(near(sh1.curve[2048], 0, 1e-3) && sh1.oversample === '4x', 'clipOn: linear through zero, 4x oversampled');
  var mid = sh1.curve[3072];   // x = 0.5 is below the clip level: passes unchanged
  ok(near(mid, 0.5, 1e-3), 'clipOn: a sample of 0.5 passes unchanged (below the clip level)');
  l1.set('clipOn', false);
  ok(sh1.curve === null && sh1.oversample === 'none', 'clipOn switched off: identity again');
  l1.set('clip', -3); var lvl3 = Math.pow(10, -3 / 20);
  l1.set('clipOn', true);
  ok(near(sh1.curve[4095], lvl3, 1e-6), 'clip -3 dBFS sets the curve level');
  var m = P.master(new Fake(44100)), lim = m.get('limiter');
  ok(m.procs.length === 6 && lim.params.clipOn === true && lim.params.clip === -0.5, 'master: six units, limiter clipper on at -0.5 dBFS');
  ok(lim.params.threshold === -6 && lim.params.ceiling === -4.2, 'master: limiter threshold -6 dB, output trim -4.2 dB (see log-A8)');
})();

// ------------------------------------------------------------------ 9. V3 master, bypass, lc insert, decorrelate, end tail
console.log('9. V3: master from song data, bypass without makeup, lc insert, stereo decorrelate, 6.5 s tail');
(function () {
  var c = new Fake(44100);
  // bypass at construction: the wet path is at 0 at once, the dry path at 1, so no makeup reaches the output
  var gb = P.create(c, 'compressor', { bypass: true }), g0 = P.create(c, 'compressor');
  ok(gb._bypassed === true && gb._wet.gain.value === 0 && gb._dryBypass.gain.value === 1, 'compressor created bypassed: wet gain 0, dry 1 (no makeup from the unit)');
  ok(g0._bypassed === false && g0._wet.gain.value === 1 && g0._dryBypass.gain.value === 0, 'compressor default: wet 1, dry 0 (unchanged)');
  // a chain spec carries the flag per unit; parameters still apply
  var ch = P.chain(c, [{ type: 'compressor', name: 'glue', bypass: true, threshold: -14, ratio: 2.5 }]);
  ok(ch.get('glue')._bypassed === true && ch.get('glue').params.threshold === -14, 'chain entry bypass: true, threshold kept');
  // the V3 master set from song data: hp 24, lp 20000, eq unchanged, glue and sat bypassed, limiter -1.5 / 0 / 0.08 / clip -0.55
  var m = P.master(c);
  m.get('limiter').set('threshold', -1.5); m.get('limiter').set('ceiling', 0); m.get('limiter').set('release', 0.08);
  m.get('limiter').set('clipOn', true); m.get('limiter').set('clip', -0.55);
  m.get('glue').bypass(true); m.get('sat').bypass(true);
  var lim = m.get('limiter').params;
  ok(m.get('hp').params.cutoff === 24 && m.get('lp').params.cutoff === 20000, 'V3 master: hp 24 Hz, lp 20000 Hz (already the defaults)');
  ok(m.get('eq').params.low === 1.5 && m.get('eq').params.mid === -1 && m.get('eq').params.high === 1, 'V3 master: eq unchanged');
  ok(lim.threshold === -1.5 && lim.ceiling === 0 && lim.release === 0.08 && lim.clipOn === true && lim.clip === -0.55, 'V3 master: limiter -1.5 / ceiling 0 / release 0.08 / clipOn / clip -0.55');
  ok(m.get('glue')._bypassed === true && m.get('sat')._bypassed === true, 'V3 master: glue and sat bypassed');
  ok(m.get('glue')._wet.gain.value === 1 || callsOf(m.get('glue')._wet.gain, 'setTargetAtTime').some(function (x) { return x[1] === 0; }), 'V3 master: glue wet path driven to 0 (the bypass fade)');
  // lc: a per-track eq3 insert named lc, low shelf at 90 Hz, flat until its low gain is set (per section, ramp or set)
  var lc = P.chain(new Fake(44100), [{ type: 'eq3', name: 'lc', low: 0, lowFreq: 90, mid: 0, high: 0 }]);
  var eq = lc.get('lc'), shelf = nodesOf(eq, 'biquad').filter(function (n) { return n.type === 'lowshelf'; })[0];
  ok(shelf && callsOf(shelf.frequency, 'setTargetAtTime').some(function (x) { return near(x[1], 90); }) && eq.params.low === 0, 'lc: low shelf at 90 Hz (lowFreq option, applied on the shelf), 0 dB (transparent)');
  lc.set('lc.low', -7);
  ok(callsOf(shelf.gain, 'setTargetAtTime').some(function (x) { return x[1] === -7; }) && eq.params.low === -7, 'lc: kick.lc.low-style path sets -7 dB (set)');
  lc.set('lc.low', -4.5, { at: 2, ramp: 1 });
  ok(callsOf(shelf.gain, 'linearRampToValueAtTime').some(function (x) { return x[1] === -4.5; }), 'lc: a ramp to -4.5 dB is a linear ramp on the shelf gain');
  // decorrelate: mono in, stereo out (left = input, right = input delayed 11 ms)
  var d = P.create(new Fake(44100), 'decorrelate');
  var dR = nodesOf(d, 'delay')[0], mgD = nodesOf(d, 'merger')[0];
  ok(dR && near(dR.delayTime.value, 0.011) && d.params.time === 0.011, 'decorrelate: right line delayed 11 ms by default');
  ok(mgD && mgD.connections.indexOf(d._wet) >= 0 && reaches(d.input, mgD, { noDelay: true }), 'decorrelate: input reaches the stereo merger directly (left) and through the delay (right)');
  ok(reaches(d.input, dR) && !reaches(d.input, mgD, { noDelay: true }) === false, 'decorrelate: the input reaches the delay line');
  var dSet = P.create(new Fake(44100), 'decorrelate', { time: 0.02 });
  ok(callsOf(nodesOf(dSet, 'delay')[0].delayTime, 'setTargetAtTime').some(function (x) { return near(x[1], 0.02); }), 'decorrelate: time 0.02 s is automatable');
  // 6.5 s end tail: Freeverb comb loop gain for RT60 = size, and the damped decay at a few frequencies (model)
  var rv = P.create(new Fake(44100), 'reverb', { algo: 'freeverb', size: 6.5, damp: 5000 });
  var T0 = 1116 / 44100, gExp = Math.pow(10, -3 * T0 / 6.5);
  ok(nodesOf(rv, 'gain').some(function (n) { return callsOf(n.gain, 'setTargetAtTime').some(function (x) { return near(x[1], gExp, 1e-12); }); }),
     'size 6.5 s: comb loop gain ' + gExp.toFixed(6) + ' (RT60 6.5 s for the undamped loop)');
  ok(near(Math.pow(gExp, 6.5 / T0), 1e-3, 1e-9), 'size 6.5 s: after 6.5 s the comb has fallen 60 dB');
  function lpMag(f, fc, Q, fs) {
    var w0 = 2 * Math.PI * fc / fs, cw = Math.cos(w0), al = Math.sin(w0) / (2 * Q);
    var b0 = (1 - cw) / 2, b1 = 1 - cw, b2 = b0, a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
    var w = 2 * Math.PI * f / fs, c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
    var nr = b0 + b1 * c1 + b2 * c2, ni = -(b1 * s1 + b2 * s2), dr = a0 + a1 * c1 + a2 * c2, di = -(a1 * s1 + a2 * s2);
    return Math.sqrt(nr * nr + ni * ni) / Math.sqrt(dr * dr + di * di);
  }
  // RT60(f) = 60 / (60/size + loss per second); loss per loop from the comb lowpass (damp 5000 Hz, Q -3 dB = 0.708)
  function rt60At(f) { var loss = -20 * Math.log(lpMag(f, 5000, 0.708, 44100)) / Math.LN10; return 60 / (60 / 6.5 + loss / T0); }
  var r313 = rt60At(313), r2k = rt60At(2000), r4k = rt60At(4000);
  ok(r313 > 6.2, 'model: RT60 at 313 Hz ' + r313.toFixed(2) + ' s (spec 6.5 s)');
  ok(r2k > 4.2 && r2k < 4.9, 'model: RT60 at 2 kHz ' + r2k.toFixed(2) + ' s (spec 4.6 s at 1 to 2.5 kHz)');
  console.log('  info model RT60 at 4 kHz ' + r4k.toFixed(2) + ' s (spec 5.1 s at 2.5 to 6 kHz; not asserted)');
  // informational: small-signal gain of the saturator at the master's setting (drive 0.12, mix 0.5), model only
  var sat = P.create(new Fake(44100), 'saturator', { drive: 0.12, mix: 0.5 });
  var shN = nodesOf(sat, 'shaper')[0], cv = shN.curve, n = cv.length, idx = Math.round((0.01 + 1) / 2 * (n - 1));
  var slope = (cv[idx] - cv[Math.round((-0.01 + 1) / 2 * (n - 1))]) / 0.02;
  console.log('  info saturator small-signal gain (model): wet slope ' + slope.toFixed(2) + ', with mix 0.5 total ' + (0.5 * slope + 0.5).toFixed(2) + ' (' + (20 * Math.log(0.5 * slope + 0.5) / Math.LN10).toFixed(1) + ' dB); not asserted');
})();

// ------------------------------------------------------------------ 10. clip overshoot clamp, makeup trim
console.log('10. limiter: sample-rate clamp after the oversampled clip; compressor autoTrim (makeup cancel)');
(function () {
  // emulate a WaveShaperNode with oversample 'none': input clamped to [-1, 1], linear interpolation over the curve
  function shapeNone(curve, x) {
    var n = curve.length, xc = Math.max(-1, Math.min(1, x)), pos = (xc + 1) / 2 * (n - 1), i = Math.floor(pos), f = pos - i;
    if (i >= n - 1) return curve[n - 1];
    return curve[i] + (curve[i + 1] - curve[i]) * f;
  }
  var c = new Fake(44100), l = P.create(c, 'limiter', { clipOn: true, clip: -0.55 });
  var shs = nodesOf(l, 'shaper'), sh = shs[0], cl = shs[1];
  var level = Math.pow(10, -0.55 / 20);
  ok(shs.length === 2 && sh.oversample === '4x' && cl.oversample === 'none', 'clipOn: oversampled clip (4x), then a sample-rate clamp (none)');
  ok(reaches(sh, cl) && cl.connections.indexOf(l._wet) >= 0, 'clipOn: the clip feeds the clamp, the clamp feeds the wet path');
  ok(near(cl.curve[cl.curve.length - 1], level, 1e-6) && near(cl.curve[0], -level, 1e-6), 'clamp curve runs to +/-' + level.toFixed(4) + ' (-0.55 dBFS)');
  // the overshoot A9 measured: 0.9973 and -1.0025 after the oversampled stage (clip level 0.9386); the clamp must hold them
  var steps = [0, 0.5, 0.9386, 0.9973, 1.0025, 1.01, -0.9973, -1.0025, -1.2];
  var worst = 0, i;
  for (i = 0; i < steps.length; i++) worst = Math.max(worst, Math.abs(shapeNone(cl.curve, steps[i])));
  ok(worst <= level + 1e-9, 'a step that overshoots (0.9973, -1.0025, beyond 1): every output at or below the clip level (worst ' + worst.toFixed(6) + ' <= ' + level.toFixed(6) + ')');
  var raw = Math.max.apply(null, steps.map(Math.abs));
  ok(raw > level + 1e-3, 'the step overshoots the clip level before the clamp (raw worst ' + raw.toFixed(4) + ' > ' + level.toFixed(4) + ')');
  ok(near(shapeNone(cl.curve, 1.0025), level, 1e-6) && near(shapeNone(cl.curve, -1.0025), -level, 1e-6), 'the clamp returns exactly +/- the clip level for an overshoot');
  var sweepMax = 0; for (i = -1000; i <= 1000; i++) sweepMax = Math.max(sweepMax, Math.abs(shapeNone(cl.curve, i / 900)));
  ok(sweepMax <= level + 1e-9 && near(shapeNone(cl.curve, 0.5), 0.5, 1e-3), 'the clamp over a sweep of inputs: never above the clip level, identity below it');
  // default: both shapers are identities, no curve
  var l0 = P.create(new Fake(44100), 'limiter'), sh0 = nodesOf(l0, 'shaper');
  ok(sh0.length === 2 && sh0[0].curve === null && sh0[1].curve === null && sh0[1].oversample === 'none', 'limiter default: both shapers identity (no curve)');
  // compressor autoTrim: default unity, and cancels the node's own makeup when set (dB, negative)
  var cz = new Fake(44100), comp0 = P.create(cz, 'compressor');
  var tr0 = nodesOf(comp0, 'gain').filter(function (n) { return n.connections.indexOf(comp0._wet) >= 0; })[0];
  ok(tr0 && tr0.gain.value === 1 && comp0.params.autoTrim === 0, 'compressor default: autoTrim 0 dB, unity (output unchanged)');
  var comp1 = P.create(cz, 'compressor', { autoTrim: -3.68 });
  var tr1 = nodesOf(comp1, 'gain').filter(function (n) { return n.connections.indexOf(comp1._wet) >= 0; })[0];
  ok(callsOf(tr1.gain, 'setTargetAtTime').some(function (x) { return near(x[1], Math.pow(10, -3.68 / 20), 1e-9); }), 'compressor autoTrim -3.68 dB sets the trim gain to ' + Math.pow(10, -3.68 / 20).toFixed(4));
  ok(comp1.node === nodesOf(comp1, 'comp')[0] || comp1.node.type_ === 'comp', 'compressor still exposes p.node (the DynamicsCompressorNode)');
})();

// ------------------------------------------------------------------ result
console.log(fails ? 'FAILED: ' + fails + ' of ' + checks + ' checks' : 'OK: ' + checks + ' checks passed');
process.exit(fails ? 1 : 0);
