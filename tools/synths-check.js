#!/usr/bin/env node
// tools/synths-check.js: A7 checks for app/engine/synths.js and Song.GUIDANCE_V2 (song.js), on a fake AudioContext.
//
// Usage:  node tools/synths-check.js
// Exit:   0 every check passed; 1 a failed check.
//
// The fake Web Audio nodes follow the pattern in app/engine/selfcheck.js (copied here, because selfcheck.js belongs
// to A1). Every AudioParam call and source start/stop is written to a per-context log, so two engines can be
// compared call by call.
//   1. kick with tau: the body frequency approaches `tune` with setTargetAtTime; tau 0 keeps the old ramp.
//   2. kick with hold: full level for `hold`, then the exponential decay.
//   3. sub in drone mode: one sine per trigger that sustains for ev.dur, released after it; glide from the last note.
//   4. hat metalHp: 0 keeps tone * 0.5; a value sets the metal-path highpass.
//   5. defaults: every synth's trigger log equals the archived engine's (olde Havantechno dub studio/synths.js).
//   6. Song.GUIDANCE_V2 builds and schedules on the fake context; GUIDANCE is unchanged; documentV2 round-trips.
'use strict';

var fs = require('fs'), path = require('path'), vm = require('vm');

var ROOT = path.join(__dirname, '..');
var ENGINE = path.join(ROOT, 'app', 'engine');
var ARCHIVE = path.join(ROOT, 'olde Havantechno dub studio');

var fails = 0, checks = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) { fails++; console.log('  FAIL ' + msg); } else console.log('  ok   ' + msg);
}
function near(a, b, eps) { return typeof a === 'number' && Math.abs(a - b) <= (eps == null ? 1e-9 : eps); }
function hasCall(param, name, v, t, tc) {
  return param.calls.some(function (c) {
    return c[0] === name && near(c[1], v, 1e-6) && (t == null || near(c[2], t, 1e-6)) && (tc == null || near(c[3], tc, 1e-6));
  });
}

// ------------------------------------------------------------------ fake Web Audio (selfcheck.js pattern + logs)
function Param(ctx, v) { this.id = ctx._nid++; this.ctx = ctx; this.value = v; this.calls = []; }
['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'cancelScheduledValues'].forEach(function (m) {
  Param.prototype[m] = function (v, t, tc) {
    var c = [m, v, t]; if (tc !== undefined) c.push(tc);
    this.calls.push(c);
    this.ctx.log.push([this.id, c]);
    if (m === 'setValueAtTime') this.value = v;
    if (m === 'exponentialRampToValueAtTime' && !(v > 0)) throw new Error('expo ramp to <= 0');
  };
});
function Node(ctx, type) { this.ctx = ctx; this.id = ctx._nid++; this.type_ = type; this.connections = []; }
Node.prototype.connect = function (dest) {
  if (!dest) throw new Error('connect to undefined from ' + this.type_);
  this.connections.push(dest); this.ctx.log.push([this.id, 'connect', dest.id]); return dest;
};
Node.prototype.disconnect = function () { this.connections.length = 0; };
function Src(ctx, type) { Node.call(this, ctx, type); this.onended = null; this._started = false; this.stopAt = null; }
Src.prototype = Object.create(Node.prototype);
Src.prototype.start = function (t) {
  if (this._started) throw new Error('start twice');
  this._started = true; this.ctx.srcs.push(this); this.ctx.log.push([this.id, 'start', t]);
  if (t != null && !(t >= 0)) throw new Error('bad start time ' + t);
};
Src.prototype.stop = function (t) {
  if (t != null && !(t >= 0)) throw new Error('bad stop time ' + t);
  this.stopAt = t; this.ctx.log.push([this.id, 'stop', t]);
};
function FakeContext(sr) {
  this.sampleRate = sr || 44100; this.currentTime = 0; this.state = 'running';
  this._nid = 1; this.log = []; this.srcs = [];
  this.destination = new Node(this, 'destination');
}
FakeContext.prototype.createGain = function () { var n = new Node(this, 'gain'); n.gain = new Param(this, 1); return n; };
FakeContext.prototype.createOscillator = function () { var n = new Src(this, 'osc'); n.frequency = new Param(this, 440); n.detune = new Param(this, 0); n.type = 'sine'; return n; };
FakeContext.prototype.createBufferSource = function () { var n = new Src(this, 'bufsrc'); n.buffer = null; n.loop = false; return n; };
FakeContext.prototype.createBuffer = function (ch, len, sr) {
  var data = []; for (var i = 0; i < ch; i++) data.push(new Float32Array(len));
  return { numberOfChannels: ch, length: len, sampleRate: sr, duration: len / sr, getChannelData: function (c) { return data[c]; } };
};
FakeContext.prototype.createBiquadFilter = function () {
  var n = new Node(this, 'biquad'); n.frequency = new Param(this, 350); n.Q = new Param(this, 1); n.gain = new Param(this, 0);
  n.detune = new Param(this, 0); n.type = 'lowpass'; return n;
};
FakeContext.prototype.createWaveShaper = function () { var n = new Node(this, 'shaper'); n.curve = null; n.oversample = 'none'; return n; };
FakeContext.prototype.createDelay = function (max) { var n = new Node(this, 'delay'); n.delayTime = new Param(this, 0); n.max = max; return n; };
FakeContext.prototype.createConvolver = function () { var n = new Node(this, 'convolver'); n.buffer = null; return n; };
FakeContext.prototype.createDynamicsCompressor = function () {
  var n = new Node(this, 'comp'); var self = this;
  ['threshold', 'knee', 'ratio', 'attack', 'release'].forEach(function (k) { n[k] = new Param(self, 0); }); return n;
};
FakeContext.prototype.createStereoPanner = function () { var n = new Node(this, 'panner'); n.pan = new Param(this, 0); return n; };
FakeContext.prototype.createChannelSplitter = function (c) { var n = new Node(this, 'splitter'); n.numberOfOutputs = c; return n; };
FakeContext.prototype.createChannelMerger = function (c) { var n = new Node(this, 'merger'); n.numberOfInputs = c; return n; };
FakeContext.prototype.createAnalyser = function () { var n = new Node(this, 'analyser'); n.fftSize = 2048; n.getByteTimeDomainData = function () {}; return n; };

// load one engine into a fresh vm context; Math.random is seeded so noise is identical in both engines
function sandbox(dir, files) {
  var sb = { console: console, setInterval: setInterval, clearInterval: clearInterval, setTimeout: setTimeout, Promise: Promise,
             Float32Array: Float32Array, Uint8Array: Uint8Array, ArrayBuffer: ArrayBuffer, DataView: DataView, WeakMap: WeakMap, Map: Map };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext('(function () { var s = 12345; Math.random = function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; })()', sb);
  files.forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(dir, f + '.js'), 'utf8'), sb, { filename: f + '.js' });
  });
  return sb;
}
var APP_FILES = ['core', 'synths', 'processors', 'songdoc', 'sequencer', 'song'];
function appSandbox() { return sandbox(ENGINE, APP_FILES); }
// wrap a factory so every node it makes is kept, in creation order
function recordCreated(ctx, name) {
  var made = [], orig = ctx[name];
  ctx[name] = function () { var n = orig.apply(ctx, arguments); made.push(n); return n; };
  return made;
}
function gainWith(list, name, v, t) {
  for (var i = 0; i < list.length; i++) if (list[i].gain && hasCall(list[i].gain, name, v, t)) return list[i];
  return null;
}

// ------------------------------------------------------------------ 1-2. kick: tau and hold
console.log('1. kick tau: first-order approach from punch to tune');
(function () {
  var sb = appSandbox(), ctx = new FakeContext(44100), oscs = recordCreated(ctx, 'createOscillator');
  var kick = sb.Synths.create(ctx, 'kick', { tune: 51, punch: 264, tau: 0.024, hold: 0, click: 0, decay: 0.36, drive: 0.45 });
  kick.trigger(3, { vel: 1 });
  var body = oscs[0];
  ok(ctx.srcs.length >= 1 && ctx.srcs[0].stopAt > 3, 'kick with tau starts its body sine (stop at ' + ctx.srcs[0].stopAt.toFixed(3) + ' s)');
  ok(hasCall(body.frequency, 'setValueAtTime', 264, 3), 'body starts at punch 264 Hz at the trigger time');
  ok(hasCall(body.frequency, 'setTargetAtTime', 51, 3, 0.024), 'body frequency uses setTargetAtTime(51, t, 0.024)');
  ok(!body.frequency.calls.some(function (c) { return c[0] === 'exponentialRampToValueAtTime'; }), 'no exponential sweep on the body when tau > 0');
  var ctx0 = new FakeContext(44100), oscs0 = recordCreated(ctx0, 'createOscillator');
  sb.Synths.create(ctx0, 'kick', {}).trigger(3, { vel: 1 });
  ok(hasCall(oscs0[0].frequency, 'exponentialRampToValueAtTime', 45, 3 + 0.06) && !oscs0[0].frequency.calls.some(function (c) { return c[0] === 'setTargetAtTime'; }),
     'default kick (tau 0) keeps the expo sweep over `sweep` to tune');
})();

console.log('2. kick hold: full level for hold, then decay');
(function () {
  var sb = appSandbox(), ctx = new FakeContext(44100), gains = recordCreated(ctx, 'createGain');
  var P = { tune: 51, punch: 264, tau: 0.024, hold: 0.06, click: 0, decay: 0.36, drive: 0.45 };
  var kick = sb.Synths.create(ctx, 'kick', P);
  kick.trigger(3, { vel: 1 });
  var env = gainWith(gains, 'linearRampToValueAtTime', 1, 3.0015);
  ok(env !== null, 'body envelope ramps up over the 1.5 ms attack');
  ok(env && hasCall(env.gain, 'setValueAtTime', 1, 3.0015 + 0.06), 'envelope holds at full level until attack + hold');
  ok(env && hasCall(env.gain, 'exponentialRampToValueAtTime', 0.0001, 3.0015 + 0.06 + 0.36), 'then decays to -80 dB over decay (0.36 s)');
  var ctx0 = new FakeContext(44100), gains0 = recordCreated(ctx0, 'createGain');
  sb.Synths.create(ctx0, 'kick', { hold: 0 }).trigger(3, { vel: 1 });
  var env0 = gainWith(gains0, 'linearRampToValueAtTime', 1, 3.0015);
  ok(env0 && !env0.gain.calls.some(function (c) { return c[0] === 'setValueAtTime' && near(c[1], 1, 1e-9) && near(c[2], 3.0615, 1e-6); }),
     'hold 0 has no plateau: the old single exponential');
})();

// ------------------------------------------------------------------ 3. sub drone
console.log('3. sub drone: one sustained sine per trigger, glide between notes');
(function () {
  var sb = appSandbox(), ctx = new FakeContext(44100), oscs = recordCreated(ctx, 'createOscillator'), gains = recordCreated(ctx, 'createGain');
  var sub = sb.Synths.create(ctx, 'sub', { mode: 'drone', glide: 0.03 });
  var dur = 16 * 60 / 126 / 4;                      // a whole bar on a gate-16 note track (1.905 s)
  sub.trigger(1, { midi: 25, vel: 0.8, dur: dur });
  ok(sub.params.mode === 'drone', "set via opts: mode 'drone'");
  ok(oscs.length === 2 && ctx.srcs.length === 2, 'drone trigger makes the fundamental and the harmonic (' + ctx.srcs.length + ' sources started)');
  var f1 = oscs[0];
  ok(f1.stopAt >= 1 + dur, 'the fundamental sustains past ev.dur (stop at ' + f1.stopAt.toFixed(3) + ' s, bar ends ' + (1 + dur).toFixed(3) + ' s)');
  ok(near(f1.frequency.calls[0][1], sb.Kit.mtof(25), 1e-9), 'C#1 (' + sb.Kit.mtof(25).toFixed(2) + ' Hz) on the first note');
  var env = gainWith(gains, 'linearRampToValueAtTime', 0.8, 1 + 0.005);
  ok(env && hasCall(env.gain, 'setValueAtTime', 0.8, 1 + 0.005 + dur) && hasCall(env.gain, 'exponentialRampToValueAtTime', 0.0001, 1 + 0.005 + dur + 0.03),
     'envelope: attack, hold to the end of ev.dur, short release (0.03 s)');
  ok(!env || !env.gain.calls.some(function (c) { return c[0] === 'exponentialRampToValueAtTime' && near(c[2], 1 + 0.005 + dur * 0.5, 0.2); }),
     'no pluck decay inside the drone');
  var before = oscs.length;
  sub.trigger(1 + dur, { midi: 35, vel: 0.8, dur: dur });
  var f2 = oscs[before];
  ok(f2 && hasCall(f2.frequency, 'exponentialRampToValueAtTime', sb.Kit.mtof(35), 1 + dur + 0.03), 'next note glides from 34.65 Hz to B1 (mtof 35) over glide (0.03 s)');
  var hangs = true; sub.panic(); ctx.srcs.forEach(function (s) { if (s.stopAt == null) hangs = false; });
  ok(hangs, 'panic stops every drone voice');
  var pl = sb.Synths.create(new FakeContext(44100), 'sub', {});
  ok(pl.params.mode === 'pluck' && pl.params.release === 0.03, 'default mode is pluck');
  var sub2 = sb.Synths.create(new FakeContext(44100), 'sub', { mode: 'nonsense' });
  ok(sub2.params.mode === 'nonsense', 'an unknown mode name is kept as text and falls back to pluck');
})();

// ------------------------------------------------------------------ 4. hat metal highpass
console.log('4. hat metalHp: the metal-path highpass');
(function () {
  function hpValues(opts, name) {
    var sb = appSandbox(), ctx = new FakeContext(44100), bq = recordCreated(ctx, 'createBiquadFilter');
    sb.Synths.create(ctx, name, opts).trigger(1, { vel: 1 });
    return bq.filter(function (b) { return b.type === 'highpass'; }).map(function (b) { return b.frequency.value; });
  }
  var d = hpValues({}, 'hat_open');
  ok(d.indexOf(3600) >= 0, 'default metal highpass is tone * 0.5 = 3600 Hz (today) on hat_open (' + d.join(', ') + ')');
  var p = hpValues({ metalHp: 1500 }, 'hat_open');
  ok(p.indexOf(1500) >= 0 && p.indexOf(3600) < 0, 'metalHp 1500 sets the metal highpass to 1500 Hz (' + p.join(', ') + ')');
  var c = hpValues({ metalHp: 0, tone: 7500 }, 'hat_closed');
  ok(c.indexOf(3750) >= 0, 'hat_closed with tone 7500 keeps 3750 Hz when metalHp is 0 (' + c.join(', ') + ')');
})();

// ------------------------------------------------------------------ 5. defaults equal the archived engine
console.log('5. defaults: every synth logs the same calls as the archived engine');
(function () {
  function run(sb, ctx) {
    sb.Synths.types().forEach(function (type) {
      var inst = sb.Synths.create(ctx, type);
      inst.trigger(0.5, { vel: 0.9, accent: true, midi: 47, dur: 0.2, notes: [63, 66, 70] });
      inst.trigger(0.8, { vel: 0.6, midi: 35, dur: 0.1 });
      inst.trigger(1.2, {});
      inst.panic(); inst.dispose();
    });
    return JSON.stringify(ctx.log);
  }
  var arCtx = new FakeContext(44100), appCtx = new FakeContext(44100);
  var ar = run(sandbox(ARCHIVE, ['core', 'synths']), arCtx);
  var app = run(appSandbox(), appCtx);
  ok(ar.length > 1000, 'archived engine logged ' + arCtx.log.length + ' calls');
  ok(ar === app, 'app synths with default parameters == archived synths (' + appCtx.log.length + ' calls, same order and values)');
})();

// ------------------------------------------------------------------ 6. Song.GUIDANCE_V2
console.log('6. Song.GUIDANCE_V2 on the fake graph');
(function () {
  var sb = appSandbox(), S = sb.Song, G = S.GUIDANCE, V = S.GUIDANCE_V2;
  function bars(def) { return def.sections.reduce(function (n, s) { return n + s.bars; }, 0); }
  ok(bars(V) === 200 && V.sections.length === 10, 'V2 is 200 bars in 10 sections (' + V.sections.map(function (s) { return s.name + ':' + s.bars; }).join(' ') + ')');
  var names = V.sections.map(function (s) { return s.name; });
  ok(names.join() === 'intro,intro2,build,mainA,mainA2,break,breakLate,breakEnd,mainB,outro', 'break splits into break (16) and breakLate (8) before breakEnd');
  var bl = V.sections[names.indexOf('breakLate')];
  ok(bl.set['master.lp.cutoff'] === 6000 && bl.set['kick.level'] === 0.6 && V.sections[names.indexOf('mainB')].set['master.lp.cutoff'] === 20000,
     'breakLate lowers master.lp.cutoff to 6000; mainB restores 20000');
  ok(V.tracks.filter(function (t) { return t.name === 'kick'; })[0].duck.indexOf('sub') >= 0, "kick ducks 'sub' in V2");
  var sub = V.tracks.filter(function (t) { return t.name === 'sub'; })[0];
  ok(sub.params.mode === 'drone' && sub.note === 'C#1' && sub.gate === 16 && sub.sidechain.depth === 0.82 && sub.sidechain.hold === 0.08, 'sub V2: drone, C#1, gate 16, sidechain 0.82 / 0.03 / 0.08 / 0.12');
  ok(G.sections.length === 9 && G.sections[5].bars === 24 && G.tracks[0].duck.length === 4 && G.tracks[1].sidechain.depth === 0 && G.tracks[1].note === 'B1',
     'GUIDANCE is unchanged (9 sections, break 24 bars, kick duck 4, sub not ducked, B1 pluck)');
  ok(V.tracks.every(function (t) { return t !== G.tracks.filter(function (u) { return u.name === t.name; })[0]; }), 'V2 is a deep copy, not shared with GUIDANCE');
  var seq = sb.Sequencer.create(null); S.build(seq, V); var n = seq.scheduleAll(0, null, 0), h = seq.hits();
  ok(n === 3200 && seq.totalBars === 200 && h.kick === 800 && h.sub === 200, 'V2 schedules 200 bars: kick ' + h.kick + ', sub ' + h.sub + ' (one hit per bar)');
  var seqG = sb.Sequencer.create(null); S.build(seqG, G); seqG.scheduleAll(0, null, 0); var hg = seqG.hits();
  var same = ['kick', 'bass', 'stab', 'clap', 'hat_open', 'hat_closed', 'shaker', 'perc', 'lead', 'pad', 'riser', 'impact'].every(function (k) { return hg[k] === h[k]; });
  ok(same, 'every other track plays the same number of hits as GUIDANCE');
  var doc = S.documentV2(), seqD = sb.Sequencer.create(null); S.build(seqD, doc); seqD.scheduleAll(0, null, 0);
  var hd = seqD.hits(), docSame = JSON.stringify(hd) === JSON.stringify(h);
  ok(docSame && doc.sections.length === 10, 'documentV2 builds the same hit counts as GUIDANCE_V2');
  var ctx = new FakeContext(44100), seqF = sb.Sequencer.create(ctx, { bpm: 126, swing: 0.06 });
  S.build(seqF, V);
  seqF.scheduleAll(0, 2, 0);
  var sc = seqF.tracks.sub.sc.node.gain.calls.filter(function (c) { return c[0] === 'linearRampToValueAtTime'; }).length;
  ok(sc >= 2, 'the kick ducks the drone on the fake graph (' + sc + ' gain ramps on sub)');
  ok(seqF.tracks.kick.inst.params.tau === 0.024 && seqF.tracks.kick.inst.params.hold === 0.06, 'V2 kick parameters reach the instrument');
})();

console.log(fails ? 'FAILED: ' + fails + ' of ' + checks + ' checks' : 'OK: ' + checks + ' checks passed');
process.exit(fails ? 1 : 0);
