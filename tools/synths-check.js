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
  this.startArgs = Array.prototype.slice.call(arguments);
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
// flush: fire onended for every started source (as the clock would when the sources end)
FakeContext.prototype.flush = function () { var s = this.srcs.splice(0); for (var i = 0; i < s.length; i++) if (s[i].onended) s[i].onended(); };
FakeContext.prototype.createGain = function () { var n = new Node(this, 'gain'); n.gain = new Param(this, 1); return n; };
FakeContext.prototype.createOscillator = function () { var n = new Src(this, 'osc'); n.frequency = new Param(this, 440); n.detune = new Param(this, 0); n.type = 'sine'; return n; };
FakeContext.prototype.createBufferSource = function () {
  var n = new Src(this, 'bufsrc'); n.buffer = null; n.loop = false; n.loopStart = 0; n.loopEnd = 0; n.playbackRate = new Param(this, 1); n.detune = new Param(this, 0); return n;
};
// a fake AudioBuffer: what a decoded file looks like to the instrument (duration, sampleRate, numberOfChannels)
function fakeBuffer(seconds, sampleRate, channels) {
  var sr = sampleRate || 48000, ch = channels || 2;
  return { duration: seconds, sampleRate: sr, numberOfChannels: ch, length: Math.round(seconds * sr), id: 'fake' };
}
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

// ------------------------------------------------------------------ 7. sampler (CONTRACT "Sampler")
console.log('7. sampler: one buffer slice per hit, choke groups, locks');
(function () {
  var sb = appSandbox(), ctx = new FakeContext(44100);
  var srcs = recordCreated(ctx, 'createBufferSource'), gains = recordCreated(ctx, 'createGain');
  var calls = [], b2 = fakeBuffer(2, 44100, 2), map = { b1: b2, b2: b2 };
  function resolve(id) { calls.push(id); return map[id] || null; }
  function make(c, opts) {
    var o = { getBuffer: resolve }; for (var k in opts) if (opts.hasOwnProperty(k)) o[k] = opts[k];
    return sb.Synths.create(c, 'sampler', o);
  }
  ok(sb.Synths.types().indexOf('sampler') < 0 && typeof sb.Synths.chokeGroups === 'function', "'sampler' is created by name and kept out of types() (selfcheck relies on it)");

  // one source per hit; playbackRate = 2^((pitch + offset) / 12)
  var a = make(ctx, { buffer: 'b1', pitch: 12 });
  var n0 = srcs.length; a.trigger(1, { vel: 1 });
  ok(srcs.length === n0 + 1, 'one AudioBufferSourceNode per hit (' + (srcs.length - n0) + ')');
  var s = srcs[srcs.length - 1];
  ok(s.buffer === b2 && near(s.playbackRate.value, 2, 1e-9), 'pitch 12 plays the buffer at playbackRate 2');
  ok(calls.indexOf('b1') >= 0, 'the buffer comes from opts.getBuffer(id)');
  var r1 = make(ctx, { buffer: 'b1', pitch: 0 }); r1.trigger(1, { vel: 1, note: 7 });
  ok(near(srcs[srcs.length - 1].playbackRate.value, Math.pow(2, 7 / 12), 1e-9), 'ev.note 7 offsets the pitch from C3 (rate 2^(7/12))');
  var r2 = make(ctx, { buffer: 'b1', pitch: -12 }); r2.trigger(1, { vel: 1, midi: 60 });
  ok(near(srcs[srcs.length - 1].playbackRate.value, 1, 1e-9), 'ev.midi 60 is 12 semitones above C3, so pitch -12 gives rate 1');

  // start / end map to the buffer offset and duration (buffer seconds)
  var sl = make(ctx, { buffer: 'b1', start: 0.25, end: 0.75 }); sl.trigger(1, { vel: 1 });
  var sa = srcs[srcs.length - 1].startArgs;
  ok(sa && near(sa[0], 1) && near(sa[1], 0.5) && near(sa[2], 1.0), 'start 0.25 / end 0.75 of a 2 s buffer: offset 0.5 s, duration 1.0 s (' + JSON.stringify(sa) + ')');
  var sp = make(ctx, { buffer: 'b1', start: 0.25, end: 0.75, pitch: 12 }); sp.trigger(1, { vel: 1 });
  var spa = srcs[srcs.length - 1];
  ok(near(spa.startArgs[2], 1.0) && near(spa.stopAt, 1 + 0.5 + 0.03, 1e-6), 'pitch 12 halves the real length (duration stays in buffer seconds, stop at the gate end + 30 ms)');
  var wh = make(ctx, { buffer: 'b1', start: 0, end: 0 }); wh.trigger(1, { vel: 1 });
  var wa = srcs[srcs.length - 1].startArgs;
  ok(near(wa[1], 0) && near(wa[2], 2), 'end 0 means the whole buffer (duration 2.0 s)');
  var bad = make(ctx, { buffer: 'b1', start: 0.6, end: 0.5 }); var nb = srcs.length; bad.trigger(1, { vel: 1 });
  ok(srcs.length === nb, 'end before start plays nothing');

  // attack and release shape the gain: amplitude = vel * gain
  var at = make(ctx, { buffer: 'b1', attack: 0.01, release: 0.02 }); at.trigger(1, { vel: 0.5 });
  var env = gainWith(gains, 'linearRampToValueAtTime', 0.5, 1.01);
  ok(env && hasCall(env.gain, 'setValueAtTime', 0.0001, 1) && hasCall(env.gain, 'setValueAtTime', 0.5, 3 - 0.02) &&
     hasCall(env.gain, 'linearRampToValueAtTime', 0.0001, 3), 'envelope: 0 at the hit, attack to the hit velocity (0.5) by 10 ms, release over the last 20 ms of the 2 s buffer (whole buffer, end 0)');
  ok(!sb.Synths.spec('sampler').gain && !!sb.Synths.spec('sampler').level, "the sampler has no own gain: the common instrument 'level' scales it (<track>.gain is the channel's)");
  var lp = make(ctx, { buffer: 'b1', start: 0.25, end: 0.75 }); lp.trigger(1, { vel: 1 });
  var ls = srcs[srcs.length - 1];
  ok(!ls.loop, 'a one-shot does not loop');
  var lo = make(ctx, { buffer: 'b1', start: 0.25, end: 0.75, loop: 1 }); lo.trigger(1, { vel: 1, dur: 0.5 });
  var lps = srcs[srcs.length - 1];
  ok(lps.loop === true && near(lps.loopStart, 0.5) && near(lps.loopEnd, 1.5) && lps.startArgs.length === 2, 'loop 1 loops the slice (loopStart 0.5 s, loopEnd 1.5 s) and starts without a duration');
  ok(near(lps.stopAt, 1 + 0.5 + 0.03, 1e-6), 'a loop is gated by ev.dur (stop at the gate end + 30 ms)');

  // unresolved buffers: nothing plays, nothing throws
  var threw = false, n1 = srcs.length;
  try {
    make(ctx, { buffer: 'missing' }).trigger(1, { vel: 1 });
    make(ctx, { buffer: '' }).trigger(1, { vel: 1 });
    make(ctx, { buffer: 'b1', getBuffer: function () { throw new Error('boom'); } }).trigger(1, { vel: 1 });
    sb.Synths.create(ctx, 'sampler', { buffer: 'b1' }).trigger(1, { vel: 1 });
    sb.Synths.create(null, 'sampler', { buffer: 'b1', getBuffer: resolve }).trigger(1, { vel: 1 });
  } catch (e) { threw = true; }
  ok(!threw && srcs.length === n1, 'a null buffer, an empty id, a throwing resolver, no resolver and no context play nothing and throw nothing');

  // choke: a hit stops the live voice of the same group in another sampler, and only that group
  var cc = new FakeContext(44100), ca = make(cc, { buffer: 'b1', choke: 'hat' }), cb = make(cc, { buffer: 'b1', choke: 'hat' });
  ca.trigger(1, { vel: 1 });
  var voiceA = ca._live[0], srcA = voiceA.srcs[0];
  ok(srcA.stopAt > 1.5, 'before the choke, the long slice plays on (stop at ' + srcA.stopAt.toFixed(3) + ' s)');
  cb.trigger(1.2, { vel: 1 });
  ok(near(srcA.stopAt, 1.2 + 0.006, 1e-6), 'a hit in the same group in another instance stops the voice 6 ms later (' + srcA.stopAt.toFixed(3) + ' s)');
  ok(sb.Synths.chokeGroups(cc).hat.length === 1 && sb.Synths.chokeGroups(cc).hat[0] !== voiceA, 'the registry keeps only the new voice in the group');
  var cn = make(cc, { buffer: 'b1', choke: '' }), keep = cb._live[0].srcs[0].stopAt;
  cn.trigger(1.3, { vel: 1 });
  ok(near(cb._live[0].srcs[0].stopAt, keep, 1e-9), 'a hit with no group does not choke');
  var other = make(cc, { buffer: 'b1', choke: 'kick' }); other.trigger(1.4, { vel: 1 });
  ok(near(cb._live[0].srcs[0].stopAt, keep, 1e-9), 'a hit in another group does not choke');

  // every voice is in _live; panic stops them; a flush releases them
  var pa = make(ctx, { buffer: 'b1' }); pa.trigger(1, { vel: 1 }); pa.trigger(1.5, { vel: 1 });
  ok(pa._live.length === 2, 'two hits give two live voices (' + pa._live.length + ')');
  pa.panic();
  var stopped = pa._live.every(function (v) { return v.srcs.every(function (x) { return x.stopAt != null && x.stopAt <= 0.031; }); });
  ok(stopped, 'panic() stops every sampler source');
  ctx.flush();
  ok(pa._live.length === 0, 'voices are released when their sources end');
  var pd = make(ctx, { buffer: 'b1' }); pd.trigger(2, { vel: 1 }); var pv = pd._live[0];
  pd.dispose();
  ok(pv.srcs[0].stopAt <= 0.031, 'dispose() stops the voice now (stop at ' + pv.srcs[0].stopAt + ' s, clock at 0)');

  // locks: applied for one trigger, restored after, through the real sequencer
  var lctx = new FakeContext(44100), linst = make(lctx, { buffer: 'b1', pitch: 0, attack: 0.002 });
  var cells = []; for (var i = 0; i < 16; i++) cells.push(null);
  cells[0] = { vel: 1, locks: { pitch: 12, attack: 0.05 } }; cells[8] = { vel: 1 };
  var seq = sb.Sequencer.create(lctx, { bpm: 126, swing: 0 });
  sb.Song.build(seq, { bpm: 126, swing: 0, progression: ['Bmaj9'], sends: {}, tracks: [
    { name: 'smp', inst: linst, variants: { A: { bars: 1, cells: cells } } } ],
    sections: [{ name: 'a', bars: 1, play: { smp: 'A' } }] });
  var seen = [], orig = linst.trigger;
  linst.trigger = function (t, e) { seen.push([linst.params.pitch, linst.params.attack]); return orig(t, e); };
  seq.scheduleAll(0, 1, 0);
  ok(seen.length === 2 && seen[0][0] === 12 && near(seen[0][1], 0.05), 'a lock on pitch and attack applies to its hit (' + JSON.stringify(seen) + ')');
  ok(seen[1][0] === 0 && near(seen[1][1], 0.002), 'the next hit sees the restored values');
  ok(linst.params.pitch === 0 && near(linst.params.attack, 0.002), 'locks are restored after the trigger');
  ok(sb.Synths.spec('sampler').buffer.value === '' && sb.Synths.spec('sampler').choke.value === '', 'buffer and choke are string parameters');
  var sl2 = make(ctx, { buffer: 'b1' }); sl2.set('level', 0.4, { at: 7 });
  ok(hasCall(sl2.out.gain, 'setTargetAtTime', 0.4, 7, 0.01), 'a sampler level written for a future time is scheduled at that time');
})();

// ------------------------------------------------------------------ 8. scheduled writes keep their time (A11 E2)
console.log('8. level and stab hp: a write with {at: t} lands at t, not at currentTime');
(function () {
  var sb = appSandbox(), ctx = new FakeContext(44100);
  // direct: a future time reaches the AudioParam event
  var kick = sb.Synths.create(ctx, 'kick', {});
  kick.set('level', 0.6, { at: 5 });
  ok(hasCall(kick.out.gain, 'setTargetAtTime', 0.6, 5, 0.01), 'kick.set(level, 0.6, {at: 5}) schedules setTargetAtTime(0.6, 5, 0.01)');
  ok(!kick.out.gain.calls.some(function (c) { return c[0] === 'setTargetAtTime' && near(c[1], 0.6) && near(c[2], 0); }), 'the write is not applied at t = 0 (currentTime)');
  kick.set('level', 0.7);
  ok(hasCall(kick.out.gain, 'setTargetAtTime', 0.7, 0, 0.01), 'a live write (no opts) still applies at currentTime');
  var stab = sb.Synths.create(ctx, 'stab', {});
  stab.set('hp', 500, { at: 3 });
  ok(hasCall(stab._hp.frequency, 'setTargetAtTime', 500, 3, 0.02), 'stab.set(hp, 500, {at: 3}) schedules the highpass at t = 3');
  // through the sequencer: a section set lands at the bar's time, in both sections
  var seq = sb.Sequencer.create(ctx, { bpm: 126, swing: 0 });
  sb.Song.build(seq, { bpm: 126, swing: 0, progression: ['Bmaj9'], sends: {}, tracks: [
    { name: 'kick', inst: 'kick', patterns: { A: 'x...............' } },
    { name: 'stab', inst: 'stab', chords: true, octave: 4, patterns: { A: 'x...............' } } ],
    sections: [
      { name: 'loud', bars: 1, play: { kick: 'A', stab: 'A' }, set: { 'kick.level': 1, 'stab.hp': 180 } },
      { name: 'quiet', bars: 1, play: { kick: 'A', stab: 'A' }, set: { 'kick.level': 0.6, 'stab.hp': 900 } } ] });
  seq.scheduleAll(0, 2, 0);
  var bar = seq.barSec(), kcalls = seq.tracks.kick.inst.out.gain.calls, scalls = seq.tracks.stab.inst._hp.frequency.calls;
  ok(hasCall(seq.tracks.kick.inst.out.gain, 'setTargetAtTime', 0.6, bar, 0.01), 'the break-like kick level 0.6 lands at bar 2 (' + bar.toFixed(4) + ' s), not at 0');
  ok(!kcalls.some(function (c) { return c[0] === 'setTargetAtTime' && near(c[1], 0.6) && near(c[2], 0); }), 'the 0.6 write is not at t = 0');
  ok(hasCall(seq.tracks.stab.inst._hp.frequency, 'setTargetAtTime', 900, bar, 0.02), 'the stab highpass 900 Hz lands at bar 2');
  ok(scalls.length >= 2, 'the stab highpass has a scheduled write per section (' + scalls.length + ')');
})();

// ------------------------------------------------------------------ 9. Ear Crew (V3): new spec entries and GUIDANCE_V3
console.log('9. Ear Crew V3: kick attack, swell, length, harmonic, clickDecay; sub partials and the running drone; clap first; shaker hold; riser floor and hold; m11f; GUIDANCE_V3');
(function () {
  var sb = appSandbox(), ctx, oscs, gains, bufs, pars;
  function fresh() { ctx = new FakeContext(44100); oscs = recordCreated(ctx, 'createOscillator'); gains = recordCreated(ctx, 'createGain'); return ctx; }
  var BAR = 4 * 60 / 126;
  // kick: the envelope with swell and attack
  fresh();
  var k1 = sb.Synths.create(ctx, 'kick', { attack: 0.02, swell: 2, click: 0, length: 0, decay: 0.45, hold: 0.045, tau: 0.022, tune: 53, punch: 265 });
  k1.trigger(2, { vel: 1 });
  var env = gainWith(gains, 'linearRampToValueAtTime', Math.pow(10, -2 / 20), 2.0015);
  ok(env && hasCall(env.gain, 'linearRampToValueAtTime', 1, 2.02), 'kick swell 2 dB: a jump to -2 dB within 1.5 ms, then the rise to full at attack 20 ms');
  ok(env && hasCall(env.gain, 'setValueAtTime', 1, 2.02 + 0.045) && hasCall(env.gain, 'exponentialRampToValueAtTime', 0.0001, 2.02 + 0.045 + 0.45), 'kick: full level to attack + hold, then decay (0.45 s) to -80 dB');
  // length: a 3 ms fade ends the body at length
  fresh();
  var k2 = sb.Synths.create(ctx, 'kick', { length: 0.197, click: 0, harmonic: 0 }); k2.trigger(2, { vel: 1 });
  var lg = gainWith(gains, 'linearRampToValueAtTime', 0.0001, 2 + 0.197);
  ok(lg && hasCall(lg.gain, 'setValueAtTime', 1, 2 + 0.197 - 0.003), 'kick length 0.197 s: a 3 ms fade to 0 that ends at 197 ms');
  fresh(); sb.Synths.create(ctx, 'kick', { click: 0 }).trigger(2, { vel: 1 });
  ok(!gains.some(function (g) { return g.gain.calls.some(function (c) { return c[0] === 'linearRampToValueAtTime' && near(c[2], 2 + 0.197, 1e-6); }); }), 'length 0 (default) adds no fade');
  // harmonic: a second sine at 2f on the same pitch curve
  fresh();
  var k3 = sb.Synths.create(ctx, 'kick', { harmonic: 0.1, click: 0, tune: 53, punch: 265, tau: 0.022 }); k3.trigger(2, { vel: 1 });
  var h2 = oscs.filter(function (o) { return hasCall(o.frequency, 'setValueAtTime', 530, 2); });
  ok(oscs.length === 2 && h2.length === 1 && hasCall(h2[0].frequency, 'setTargetAtTime', 106, 2, 0.022), 'kick harmonic 0.1: a second sine starts at 2 x punch and approaches 2 x tune (' + oscs.length + ' oscillators)');
  fresh(); sb.Synths.create(ctx, 'kick', { click: 0 }).trigger(2, { vel: 1 });
  ok(oscs.length === 1, 'harmonic 0 (default) adds no second oscillator');
  // clickDecay: the noise click decays in clickDecay, the knock scales with it
  fresh();
  var k4 = sb.Synths.create(ctx, 'kick', { click: 0.4, clickDecay: 0.0015 }); k4.trigger(2, { vel: 1 });
  var cg = gainWith(gains, 'linearRampToValueAtTime', 0.4 * 0.5, 2.0005);
  ok(cg && hasCall(cg.gain, 'exponentialRampToValueAtTime', 0.0001, 2 + 0.0005 + 0.0015), 'clickDecay 1.5 ms: the noise click is -80 dB within 2 ms');
  ok(gains.some(function (g) { return hasCall(g.gain, 'exponentialRampToValueAtTime', 0.0001, 2 + 0.0005 + 0.022 * (0.0015 / 0.012)); }), 'the knock decays with clickDecay (22 ms x 0.125)');
  // sub partials: beat lines below the carrier at the carrier's envelope level
  fresh();
  var sp = sb.Synths.create(ctx, 'sub', { mode: 'drone', beat: 1.2027, beatLevel: -2.6, beat3: 3.608, beat3Level: -5.8, harmonic: 0 });
  sp.trigger(1, { midi: 25, vel: 0.8, dur: BAR * 16 / 4 * 4 });
  var f0 = sb.Kit.mtof(25);
  ok(oscs.some(function (o) { return hasCall(o.frequency, 'setValueAtTime', f0 - 1.2027, 1); }), 'the first partial line sits 1.2027 Hz under the carrier');
  ok(oscs.some(function (o) { return hasCall(o.frequency, 'setValueAtTime', f0 - 3.608, 1); }), 'the second partial line sits 3.608 Hz under the carrier');
  ok(gains.some(function (g) { return near(g.gain.value, Math.pow(10, -2.6 / 20), 1e-9); }), 'the first line is at -2.6 dB re the carrier (its gain node holds 0.741)');
  fresh(); sb.Synths.create(ctx, 'sub', { mode: 'drone', harmonic: 0 }).trigger(1, { midi: 25, vel: 0.8, dur: 1.9 });
  ok(oscs.length === 1, 'beat 0 (default): no partial lines');
  // sub run: one voice across triggers; pitch changes glide; panic ends it
  fresh();
  var run = sb.Synths.create(ctx, 'sub', { mode: 'drone', run: 1, harmonic: 0, glide: 0.03 });
  run.trigger(1, { midi: 25, vel: 0.8, dur: 1.9 });
  var n1 = oscs.length, s1 = ctx.srcs.length;
  run.trigger(1 + 1.9, { midi: 25, vel: 0.8, dur: 1.9 });
  run.trigger(1 + 3.8, { midi: 25, vel: 0.8, dur: 1.9 });
  ok(oscs.length === n1 && ctx.srcs.length === s1 && run._live.length === 1, 'run 1: later triggers reuse the one running voice (oscillators ' + oscs.length + ', voices ' + run._live.length + ')');
  ok(run._live[0].srcs[0].stopAt == null, 'the running voice has no stop time (it runs until panic)');
  ok(run._run.og.connections.indexOf(run.pre) >= 0, 'the running voice reaches the instrument output (its envelope is connected to inst.pre)');
  run.trigger(1 + 5.7, { midi: 35, vel: 0.8, dur: 1.9 });
  var carrier = oscs[0];
  ok(hasCall(carrier.frequency, 'exponentialRampToValueAtTime', sb.Kit.mtof(35), 1 + 5.7 + 0.03), 'a new note glides to B1 over glide (0.03 s) without a new voice');
  run.panic();
  ok(run._run === null, 'panic() ends the running voice');
  run.trigger(20, { midi: 25, vel: 0.8, dur: 1.9 });
  ok(oscs.length === n1 + 1 || oscs.length > n1, 'the next trigger after panic starts a new running voice');
  // clap first
  fresh();
  var c1 = sb.Synths.create(ctx, 'clap', { first: 1, flams: 3, flam: 0.011, decay: 0.12 }); c1.trigger(4, { vel: 0.85 });
  var cg1 = gainWith(gains, 'setValueAtTime', 0.85, 4);
  ok(cg1 && hasCall(cg1.gain, 'setValueAtTime', 0.85 * 1, 4) && hasCall(cg1.gain, 'setValueAtTime', 0.85 * 0.33, 4 + 0.011) && hasCall(cg1.gain, 'setValueAtTime', 0.85 * 0.33, 4 + 3 * 0.011),
     'clap first 1: burst 0 at g x 1, the later bursts and the main burst at g x 0.33 (-9.5 dB)');
  fresh(); sb.Synths.create(ctx, 'clap', { flams: 3, flam: 0.011 }).trigger(4, { vel: 0.85 });
  var cg2 = gainWith(gains, 'setValueAtTime', 0.85 * 0.7, 4 + 0.011 * 0 + 0);
  ok(cg2 && hasCall(cg2.gain, 'setValueAtTime', 0.85 * 0.7, 4) && hasCall(cg2.gain, 'setValueAtTime', 0.85, 4 + 3 * 0.011), 'clap first 0 (default): burst 0 at 0.7 g, main burst at g (today)');
  // shaker hold
  fresh();
  var sh = sb.Synths.create(ctx, 'shaker', { hold: 0.1, attack: 0.028, decay: 0.07 }); sh.trigger(3, { vel: 1 });
  var shg = gainWith(gains, 'linearRampToValueAtTime', 0.5, 3 + 0.028);
  ok(shg && hasCall(shg.gain, 'setValueAtTime', 0.5, 3 + 0.028 + 0.1) && hasCall(shg.gain, 'exponentialRampToValueAtTime', 0.0001, 3 + 0.028 + 0.1 + 0.07), 'shaker hold 0.1 s: flat at the peak, then the decay');
  // riser: floor and plateau hold
  fresh();
  var rs = sb.Synths.create(ctx, 'riser', { tone: 0, from: 5000, to: 16000, q: 0.3, floor: 0.04, hold: 2 });
  rs.trigger(10, { vel: 1, dur: 4 });
  var rg = gainWith(gains, 'expo', 0, 0); 
  var rgain = gains.filter(function (g) { return hasCall(g.gain, 'setValueAtTime', 0.024, 10); })[0];
  ok(rgain && hasCall(rgain.gain, 'exponentialRampToValueAtTime', 0.6, 14) && hasCall(rgain.gain, 'setValueAtTime', 0.6, 16) && hasCall(rgain.gain, 'linearRampToValueAtTime', 0.0001, 16.03),
     'riser floor 0.04 starts at 0.024 (28 dB under the plateau 0.6), rises over the dur, holds 2 s, ends 30 ms later');
  fresh(); sb.Synths.create(ctx, 'riser', { tone: 0 }).trigger(10, { vel: 1, dur: 4 });
  ok(gains.some(function (g) { return hasCall(g.gain, 'setValueAtTime', 0.0001, 10) && hasCall(g.gain, 'exponentialRampToValueAtTime', 0.6, 14); }), 'riser floor 0.0001 (default): the rise starts at 0.0001, as before');
  // chord and song
  ok(sb.Kit.chordNotes('G#m11f', 3).map(sb.Kit.mton).join(' ') === 'G#3 B3 D#4 F#4 A#4 C#5', "chord 'G#m11f' at octave 3 is G#3 B3 D#4 F#4 A#4 C#5 (" + sb.Kit.chordNotes('G#m11f', 3).map(sb.Kit.mton).join(' ') + ')');
  var V = sb.Song.GUIDANCE_V3, nb = 0;
  V.sections.forEach(function (s) { nb += s.bars; });
  ok(V.sections.length === 15 && nb === 200, 'GUIDANCE_V3: 15 sections, 200 bars');
  ok(V.sections.map(function (s) { return s.name; }).join() === 'intro,intro2,build,mainA,mainA_b,mainA2,mainA3,break,breakLate,breakEnd,gap,mainB,mainB_b,mainB_c,outro', 'GUIDANCE_V3 section order (E4 table, amended)');
  ok(V.swing === 0.40 && V.progression.join() === 'G#m11f' && V.tracks.every(function (t) { return t.name !== 'lead' && t.name !== 'riser' && t.name !== 'impact' && t.name !== 'perc'; }), 'swing 0.40, one chord, no lead, riser, impact or perc');
  ok(V.sections.every(function (s) { return !s.fx || s.fx.every(function (f) { return f.track !== 'impact' && f.track !== 'riser'; }); }), 'no riser or impact fx in V3');
  var G0 = sb.Song.GUIDANCE;
  ok(G0.sections.length === 9 && G0.sections[5].bars === 24 && G0.tracks[0].duck.length === 4 && G0.tracks[1].note === 'B1' && G0.tracks[1].sidechain.depth === 0,
     'GUIDANCE is unchanged (9 sections, break 24 bars, kick duck 4, sub not ducked, B1 pluck)');
  var seqV = sb.Sequencer.create(null); sb.Song.build(seqV, V); seqV.scheduleAll(0, null, 0); var hv = seqV.hits();
  ok(seqV.totalBars === 200 && hv.kick === 799 && hv.sub === 200 && hv.bass > 0 && hv.bed === 1, 'GUIDANCE_V3 schedules 200 bars (kick ' + hv.kick + ', sub ' + hv.sub + ', bed ' + hv.bed + ')');
  var doc = sb.Song.documentV3(), seqD = sb.Sequencer.create(null); sb.Song.build(seqD, doc); seqD.scheduleAll(0, null, 0);
  ok(JSON.stringify(seqD.hits()) === JSON.stringify(hv), 'documentV3 schedules the same hits as GUIDANCE_V3');
  var bassD = doc.tracks.filter(function (t) { return t.name === 'bass'; })[0];
  ok(bassD.variants.D.bars === 2 && near(bassD.variants.D.cells[6].nudge, -1.4 / 24, 1e-9) && bassD.variants.D.cells[1].vel === 0.5 && bassD.variants.D.cells[27].acc === true, 'bass D is a two-bar variant: step 6 at -1.4/24 (timing fit, A9 iteration 4), the accent on bar 2 step 11');
  ok(doc.swing === 0.40 && doc.master.limiter.clip === -0.55 && doc.master.glue.bypass === true, 'documentV3 carries swing 0.40 and the master (limiter -1.5 / 0 / clip -0.55, glue and saturator bypassed)');
  // the Host opens the document (Node, no audio)
  var hostFile = path.join(ENGINE, 'host.js');
  if (fs.existsSync(hostFile)) {
    vm.runInContext(fs.readFileSync(hostFile, 'utf8'), sb, { filename: 'host.js' });
    var H = sb.Host.create({ doc: sb.Song.documentV3() });
    var ids = H.devices().filter(function (d) { return d.kind === 'instrument'; }).map(function (d) { return d.track; });
    ok(ids.indexOf('bed') >= 0 && ids.indexOf('tick') >= 0 && ids.indexOf('burst_r') >= 0 && H.sections().length === 15, 'Host.create({doc: Song.documentV3()}) opens the 15-section V3 with its tracks (' + ids.length + ' instruments)');
    ok(H.getParam('master.limiter.clipOn') === true && H.isBypassed('master:glue') === true, 'the Host applies the V3 master (clipOn, glue bypassed)');
  }
})();

// ------------------------------------------------------------------ 10. sampler programs (B1 5.x, checks 1-34 of 9.1)
console.log('10. sampler programs: keys, layers, round robin, pitch, frames, envelopes, filter, polyphony, choke, programs.js');
(function () {
  var sb = appSandbox();
  vm.runInContext(fs.readFileSync(path.join(ENGINE, 'programs.js'), 'utf8'), sb, { filename: 'programs.js' });
  var PR = sb.Programs;
  var meta = {};
  function fillBuf(ctx, v, secs, sr) {
    var b = ctx.createBuffer(1, Math.round(secs * (sr || ctx.sampleRate)), sr || ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = v;
    return b;
  }
  // one sampler with a program 'p'; bufs maps ids to AudioBuffers
  function make(ctx, bufs, regions, popts, opts) {
    var prog = PR.normalize({ name: 't', regions: regions, global: (popts && popts.global) || {} });
    var o = { getBuffer: function (id) { return bufs[id] || null; }, getProgram: function (id) { return id === 'p' ? prog : null; },
              getMeta: function (id) { return meta[id] || null; }, program: 'p' };
    if (opts) for (var k in opts) o[k] = opts[k];
    return sb.Synths.create(ctx, 'sampler', o);
  }
  function reg(buf, lokey, hikey, extra) {
    var r = { buffer: buf, lokey: lokey, hikey: hikey, root: lokey };
    if (extra) for (var k in extra) r[k] = extra[k];
    return r;
  }
  function srcsOf(ctx) { return ctx.srcs.slice(); }
  function fillOf(src) { return src.buffer.getChannelData(0)[0]; }

  // region by key (9.1 check 2) and params.key (check 3)
  var ctx = new FakeContext(44100), bufs = { A: fillBuf(ctx, 0.1, 0.5), B: fillBuf(ctx, 0.2, 0.5), C: fillBuf(ctx, 0.3, 0.5) };
  var rs = [reg('A', 36, 36), reg('B', 38, 38), reg('C', 42, 42)];
  var s1 = make(ctx, bufs, rs);
  s1.trigger(1, { midi: 38, vel: 0.8 });
  ok(ctx.srcs.length === 1 && near(fillOf(ctx.srcs[0]), 0.2, 1e-6), 'a hit on key 38 starts one source, region B');
  s1.set('key', 42); s1.trigger(2, {vel: 0.8});
  ok(ctx.srcs.length === 2 && near(fillOf(ctx.srcs[1]), 0.3, 1e-6), 'no midi uses params.key (42): region C');
  ok(!s1.trigger(3, { midi: 50, vel: 0.8 }) && ctx.srcs.length === 2, 'a key with no region plays nothing');

  // velocity layers (check 4): vel 0.3 -> lower layer, 0.9 and accent -> upper layer
  ctx = new FakeContext(44100); bufs = { L1: fillBuf(ctx, 0.1, 0.5), L2: fillBuf(ctx, 0.9, 0.5) };
  var sv = make(ctx, bufs, [reg('L1', 60, 60, { lovel: 1, hivel: 63 }), reg('L2', 60, 60, { lovel: 64, hivel: 127 })]);
  sv.trigger(1, { midi: 60, vel: 0.3 }); sv.trigger(2, { midi: 60, vel: 0.9 }); sv.trigger(3, { midi: 60, vel: 1.2, accent: true });
  var lay = ctx.srcs.map(fillOf);
  ok(near(lay[0], 0.1, 1e-6) && near(lay[1], 0.9, 1e-6) && near(lay[2], 0.9, 1e-6), 'velocity 0.3 picks the lower layer; 0.9 and an accent pick the upper');

  // ev.notes chord and pitch formula (checks 5 and 6)
  ctx = new FakeContext(44100); bufs = { A: fillBuf(ctx, 0.1, 0.5) };
  var sc = make(ctx, bufs, [reg('A', 48, 72, { root: 60 })]);
  sc.trigger(1, { notes: [60, 64, 67], vel: 0.8 });
  var rates = ctx.srcs.map(function (s) { return s.playbackRate.value; });
  ok(rates.length === 3 && near(rates[1], Math.pow(2, 4 / 12), 1e-9) && near(rates[2], Math.pow(2, 7 / 12), 1e-9), 'ev.notes [60,64,67] start three sources at 2^((n-root)/12)');
  ctx = new FakeContext(44100); bufs = { A: fillBuf(ctx, 0.1, 0.5) };
  var sp = make(ctx, bufs, [reg('A', 36, 84, { root: 60, tune: -50 })], null, { fine: 25 });
  sp.trigger(1, { midi: 72, vel: 0.8 });
  ok(near(ctx.srcs[0].playbackRate.value, Math.pow(2, (12 + (-50 + 25) / 100) / 12), 1e-9), 'pitch: key 72 on root 60, tune -50 and fine +25 ct gives 2^((12 - 0.25)/12)');

  // frame positions use meta.rate (check 7): 22050 frames at rate 22050 in a 44100 buffer -> 1.0 s
  ctx = new FakeContext(44100); bufs = { F: fillBuf(ctx, 0.5, 2) };
  meta.F = { rate: 22050, root: null, loops: [] };
  var sf = make(ctx, bufs, [reg('F', 0, 127, { root: 60, offset: 22050 })]);
  sf.trigger(1, { midi: 60, vel: 0.8 });
  ok(near(ctx.srcs[0].startArgs[1], 1.0, 1e-9), 'offset 22050 frames at meta.rate 22050 starts at 1.0 s in a 44100 Hz buffer');
  delete meta.F;

  // round robin (check 8): six hits A B C A B C; panic restarts at A
  ctx = new FakeContext(44100); bufs = { A: fillBuf(ctx, 0.1, 0.2), B: fillBuf(ctx, 0.2, 0.2), C: fillBuf(ctx, 0.3, 0.2) };
  var rr = make(ctx, bufs, [reg('A', 0, 127, { root: 60, seq: 1, seqLen: 3 }), reg('B', 0, 127, { root: 60, seq: 2, seqLen: 3 }), reg('C', 0, 127, { root: 60, seq: 3, seqLen: 3 })]);
  for (var h = 0; h < 6; h++) rr.trigger(1 + h * 0.5, { midi: 60, vel: 0.8 });
  var seq = ctx.srcs.map(fillOf).map(function (x) { return Math.round(x * 10); }).join(',');
  ok(seq === '1,2,3,1,2,3', 'round robin over three regions plays A B C A B C (' + seq + ')');
  rr.panic(); ctx.flush(); rr.trigger(5, { midi: 60, vel: 0.8 });
  ok(near(fillOf(ctx.srcs[ctx.srcs.length - 1]), 0.1, 1e-6), 'panic() restarts the round robin at A');

  // random round robin (check 9): two fresh instruments give the same 20 picks; both halves are used
  function picks(seedless) {
    var c = new FakeContext(44100), b = { A: fillBuf(c, 0.1, 0.2), B: fillBuf(c, 0.2, 0.2) };
    var s = make(c, b, [reg('A', 0, 127, { root: 60, lorand: 0, hirand: 0.5 }), reg('B', 0, 127, { root: 60, lorand: 0.5, hirand: 1 })]);
    for (var i = 0; i < 20; i++) s.trigger(i * 0.1, { midi: 60, vel: 0.8 });
    return c.srcs.map(fillOf).map(function (x) { return Math.round(x * 10); }).join('');
  }
  var pa = picks(), pb = picks();
  ok(pa === pb && /1/.test(pa) && /2/.test(pa), 'lorand/hirand picks repeat between fresh instruments and use both halves');

  // gate and loop stop times (checks 17-19)
  ctx = new FakeContext(44100); bufs = { A: fillBuf(ctx, 0.1, 2) };
  var g0 = make(ctx, bufs, [reg('A', 0, 127, { root: 60, loop: 'none' })], null, { gate: 0 });
  g0.trigger(1, { midi: 60, vel: 0.8, dur: 0.5 });
  ok(near(ctx.srcs[0].stopAt, 1 + 2 + 0.03, 1e-6), 'gate 0, no loop: the release ends at the slice end (stop 3.03 s), whatever dur says');
  var g1 = make(ctx, bufs, [reg('A', 0, 127, { root: 60, loop: 'none' })], null, { gate: 1 });
  g1.trigger(10, { midi: 60, vel: 0.8, dur: 0.5 });
  var rel1 = ctx.srcs[1].stopAt;
  ok(near(rel1, 10 + 0.5 + 0.02 + 0.03, 1e-6), 'gate 1: release starts at t + dur (stop ' + rel1.toFixed(3) + ')');
  var o1 = make(ctx, bufs, [reg('A', 0, 127, { root: 60, loop: 'oneshot' })], null, { gate: 1 });
  o1.trigger(20, { midi: 60, vel: 0.8, dur: 0.1 });
  ok(near(ctx.srcs[2].stopAt, 20 + 2 + 0.03, 1e-6), 'loop oneshot ignores dur even with gate 1');
  ctx = new FakeContext(44100); bufs = { A: fillBuf(ctx, 0.1, 2) };
  var lc = make(ctx, bufs, [reg('A', 0, 127, { root: 60, loop: 'continuous', loopStart: 22050, loopEnd: 44100 })], null, { gate: 1 });
  lc.trigger(1, { midi: 60, vel: 0.8, dur: 0.3 });
  var sl = ctx.srcs[0];
  ok(sl.loop === true && near(sl.loopStart, 0.5, 1e-9) && near(sl.loopEnd, 1.0, 1e-9) && near(sl.stopAt, 1 + 0.3 + 0.02 + 0.03, 1e-6), 'loop continuous: loopStart/loopEnd in seconds, stop = t + dur + release + 0.03');

  // envelope levels (check 22): attack linear, decay in dB stops at sustain, never <= 0
  var e22 = { attack: 0.1, hold: 0, decay: 1, sustain: 0.5 };
  var lv = [0.05, 0.1, 0.5, 2].map(function (dt) { return sb.Synths.adsrLevel(e22, dt, 0.0001, 1); });
  ok(near(lv[0], 0.0001 + (1 - 0.0001) * 0.5, 1e-6) && near(lv[1], 1, 1e-9) && near(sb.Synths.adsrLevel(e22, 2, 0.0001, 1), 0.5, 1e-6), 'envelope: linear attack to the peak, decay stops at sustain 0.5');
  var mono = true, prev = 2;
  for (var di = 0; di <= 40; di++) { var lvl = sb.Synths.adsrLevel(e22, 0.1 + di * 0.02, 0.0001, 1); if (lvl > prev + 1e-12 || lvl <= 0) mono = false; prev = lvl; }
  ok(mono, 'decay is monotone and never <= 0');

  // filter (check 23): off makes no biquad; lowpass with Q = reso; the cutoff tracks the key and velocity in cents
  ctx = new FakeContext(44100); bufs = { A: fillBuf(ctx, 0.1, 1) };
  var biq = recordCreated(ctx, 'createBiquadFilter');
  var sfl = make(ctx, bufs, [reg('A', 0, 127, { root: 60, filter: { type: 'lowpass', cutoff: 800, reso: 3, key: 100, keyCenter: 60, vel: 0 } })]);
  sfl.trigger(1, { midi: 72, vel: 0.8 });
  ok(biq.length === 1 && biq[0].Q.value === 3, 'lowpass biquad created with Q = reso (' + biq.length + ' biquad, Q ' + (biq[0] && biq[0].Q.value) + ')');
  ok(biq.length === 1 && near(biq[0].frequency.value, 800 * Math.pow(2, 100 * 12 / 1200), 1e-6), 'fKey 100 ct per key: key 72 is 12 keys above the centre, +1200 ct (cutoff 1600 Hz)');
  ctx = new FakeContext(44100); bufs = { A: fillBuf(ctx, 0.1, 1) }; biq = recordCreated(ctx, 'createBiquadFilter');
  var soff = make(ctx, bufs, [reg('A', 0, 127, { root: 60 })]);
  soff.trigger(1, { midi: 60, vel: 0.8 });
  ok(biq.length === 0, "filter 'off' creates no biquad");

  // a free-running lfo and vibrato only when the depth is set (check 24)
  ctx = new FakeContext(44100); bufs = { A: fillBuf(ctx, 0.1, 1) }; var oscs = recordCreated(ctx, 'createOscillator');
  var sv0 = make(ctx, bufs, [reg('A', 0, 127, { root: 60 })]); sv0.trigger(1, { midi: 60, vel: 0.8 });
  ok(oscs.length === 0, 'vibrato and LFO depth 0 create no oscillator');
  var sv1 = make(ctx, bufs, [reg('A', 0, 127, { root: 60, vib: { rate: 5, depth: 30, delay: 0 } })]); sv1.trigger(2, { midi: 60, vel: 0.8, dur: 0.5 });
  ok(oscs.length === 1 && ctx.srcs[ctx.srcs.length - 1].detune && oscs[0].connections.length > 0, 'vibrato depth 30: one oscillator, connected to the source detune');

  // reverse (check 25): the reversed copy starts with the original's last sample; offsets mirror
  ctx = new FakeContext(44100); var ramp = ctx.createBuffer(1, 1000, 44100), rd = ramp.getChannelData(0);
  for (var ri = 0; ri < 1000; ri++) rd[ri] = ri / 1000;
  var srev = make(ctx, { R: ramp }, [reg('R', 0, 127, { root: 60, reverse: 1 })]);
  srev.trigger(1, { midi: 60, vel: 0.8 });
  ok(near(fillOf(ctx.srcs[0]), 999 / 1000, 1e-6), 'reverse 1 plays the reversed copy (first sample = the original last)');

  // missing buffer silent, others play; throwing or null program silent; no context silent (checks 26, 27)
  ctx = new FakeContext(44100); bufs = { B: fillBuf(ctx, 0.2, 1) };
  var sm = make(ctx, bufs, [reg('MISSING', 60, 60, { root: 60 }), reg('B', 60, 60, { root: 60 })]);
  var threw = false; try { sm.trigger(1, { midi: 60, vel: 0.8 }); } catch (e) { threw = true; }
  ok(!threw && ctx.srcs.length === 1 && near(fillOf(ctx.srcs[0]), 0.2, 1e-6), 'a missing region buffer is silent; the other region plays');
  ctx = new FakeContext(44100);
  var sthrow = sb.Synths.create(ctx, 'sampler', { program: 'p', getProgram: function () { throw new Error('boom'); }, getBuffer: function () { return null; } });
  threw = false; try { sthrow.trigger(1, { midi: 60, vel: 0.8 }); } catch (e) { threw = true; }
  ok(!threw && ctx.srcs.length === 0, 'a throwing getProgram is silent and does not throw');
  threw = false; try { sb.Synths.create(null, 'sampler', { program: 'p' }).trigger(1, { midi: 60 }); } catch (e) { threw = true; }
  ok(!threw, 'no context: the program sampler is silent and throws nothing');

  // polyphony (check 14): poly 4, the fifth hit steals the oldest voice (scheduled ahead of currentTime)
  ctx = new FakeContext(44100); bufs = { A: fillBuf(ctx, 0.1, 10) };
  var spo = make(ctx, bufs, [reg('A', 0, 127, { root: 60 })], null, { poly: 4 });
  for (var pi = 0; pi < 5; pi++) spo.trigger(10 + pi * 0.05, { midi: 60, vel: 0.8, dur: 3 });
  var voices = spo._live.filter(function (x) { return x.model; });
  var alive = voices.filter(function (x) { return x.model.tEnd > 10.2 + 1e-9; }).length;
  ok(voices[0].model.tEnd === 10.2 && alive === 4, 'poly 4: the fifth hit steals exactly the oldest voice (alive ' + alive + ')');

  // note polyphony (check 13): a second hit on the same key steals; another key does not
  ctx = new FakeContext(44100); bufs = { A: fillBuf(ctx, 0.1, 10) };
  var snp = make(ctx, bufs, [reg('A', 36, 84, { root: 60, notePoly: 1 })]);
  snp.trigger(1, { midi: 60, vel: 0.8, dur: 3 }); snp.trigger(1.5, { midi: 60, vel: 0.8, dur: 3 }); snp.trigger(1.6, { midi: 64, vel: 0.8, dur: 3 });
  var nv = snp._live.filter(function (x) { return x.model; });
  ok(nv[0].model.tEnd === 1.5 && nv[1].model.tEnd > 2 && nv[2].model.tEnd > 2, 'note_polyphony 1: a second hit on the same key steals; key 64 leaves it alone');

  // choke (check 11): off_by voices are faded by the group hit; the fade starts at t
  ctx = new FakeContext(44100); bufs = { O: fillBuf(ctx, 0.1, 2), C: fillBuf(ctx, 0.1, 0.2) };
  var sch = make(ctx, bufs, [reg('O', 0, 127, { root: 60, offBy: 'ch', offMode: 'fast' }), reg('C', 0, 127, { root: 60, group: 'ch' })]);
  sch.trigger(1, { midi: 60, vel: 0.8, dur: 2 });
  var opn = sch._live[0].model;
  sch.trigger(1.5, { midi: 60, vel: 0.8 });
  ok(near(opn.tEnd, 1.5 + 0.006, 1e-9), 'a closed hit (group ch) fades the open voice (off_by ch) in 6 ms');
  ok(hasCall(opn.p, 'linearRampToValueAtTime', 0.0001, 1.5 + 0.006), 'the fade ramps the open voice to -80 dB, not from gain.value');

  // programs.js (checks 30-34)
  var sfz = [
    '#define $K 36', '// a comment', '<control>', 'default_path=samples/',
    '<global>', 'ampeg_release=0.3', '<group>', 'group=1 off_by=2 off_mode=fast',
    '<region> sample=kick.wav key=$K volume=-3 pan=50 amp_veltrack=-50 loop_mode=loop_continuous',
    '<region> sample=sn nare.wav lokey=38 hikey=38 pitch_keycenter=sample /* block */',
    '<region> sample=hat.wav lokey=42 hikey=42 unknownop=7 fil_type=lpf_2p cutoff=900'
  ].join('\n');
  var meta2 = { 'samples/kick.wav': { root: null, loops: [[100, 200]] }, 'samples/sn nare.wav': { root: 50, loops: [] } };
  var pr = PR.parseSfz(sfz, { resolve: function (p) { return p; }, meta: function (id) { return meta2[id] || null; } });
  var R = pr.program.regions;
  ok(R.length === 3 && near(R[0].gain, -3, 1e-9) && near(R[0].pan, 0.5, 1e-9) && near(R[0].veltrack, -0.5, 1e-9), 'SFZ: volume, pan and amp_veltrack (-50 is -0.5) are mapped; #define and default_path work');
  ok(R[0].loop === 'continuous' && R[0].loopStart === 100 && R[0].loopEnd === 200 && R[0].lokey === 36, 'loop_continuous takes the first loop of the file when it has no loop points');
  ok(R[1].rootFile === true && R[1].root === 50 && R[1].buffer === 'samples/sn nare.wav', 'pitch_keycenter=sample takes the root from the file (50)');
  ok(pr.program.global.gate === 1 && pr.program.global.env && pr.program.global.env.release === 0.3 && R[0].env === null && R[0].group === '1' && R[0].offBy === '2', 'gate 1 on import; ampeg_release hoisted to global env; group and off_by parsed');
  ok(R[2].extra.unknownop === '7' && pr.warnings.some(function (w) { return w.opcode === 'unknownop'; }) && R[2].filter.type === 'lowpass' && R[2].filter.cutoff === 900, 'unknown opcode kept in extra with a warning; fil_type default lpf_2p');
  var nomd = PR.parseSfz('<region> sample=x.wav key=60 pitch_keycenter=sample', { resolve: function (p) { return p; } });
  ok(nomd.program.regions[0].root === 0 && nomd.warnings.some(function (w) { return w.opcode === 'pitch_keycenter'; }), 'pitch_keycenter=sample with no file root uses 0 and warns');
  var lokeyNeg = PR.normalize({ regions: [{ buffer: 'x', lokey: -1, hikey: 127 }] });
  ok(lokeyNeg.regions[0].lokey === -1, 'lokey -1 is kept (never plays from keys)');
  var rt = PR.parseSfz(PR.toSfz(pr.program, { src: function (id) { return id; } }), { resolve: function (p) { return p; }, meta: function (id) { return meta2[id] || null; } });
  ok(JSON.stringify(rt.program.regions) === JSON.stringify(PR.normalize(pr.program).regions), 'round trip: parseSfz(toSfz(p)) gives the same regions');
  // WAV header (check 32): hand-built smpl and acid chunks
  function chunk(id, body) { var b = Buffer.alloc(8 + body.length + (body.length & 1)); b.write(id, 0, 'ascii'); b.writeUInt32LE(body.length, 4); body.copy(b, 8); return b; }
  var fmt = Buffer.alloc(16); fmt.writeUInt16LE(1, 0); fmt.writeUInt16LE(2, 2); fmt.writeUInt32LE(22050, 4);
  var smpl = Buffer.alloc(36 + 24); smpl.writeUInt32LE(60, 12); smpl.writeUInt32LE(0, 16); smpl.writeUInt32LE(1, 28);
  smpl.writeUInt32LE(0, 36 + 4); smpl.writeUInt32LE(100, 36 + 8); smpl.writeUInt32LE(200, 36 + 12);
  var acid = Buffer.alloc(24); acid.writeUInt16LE(62, 4);
  function riff(parts) { var body = Buffer.concat(parts); var h = Buffer.alloc(12); h.write('RIFF', 0, 'ascii'); h.writeUInt32LE(body.length + 4, 4); h.write('WAVE', 8, 'ascii'); return Buffer.concat([h, body]); }
  var wavS = riff([chunk('fmt ', fmt), chunk('smpl', smpl)]);
  var mS = PR.readWavMeta(wavS.buffer.slice(wavS.byteOffset, wavS.byteOffset + wavS.length));
  ok(mS.rate === 22050 && mS.channels === 2 && mS.root === 60 && mS.loops.length === 1 && mS.loops[0][0] === 100 && mS.loops[0][1] === 200, 'readWavMeta: rate 22050, unity 60, one loop 100..200 from smpl');
  var wavA = riff([chunk('fmt ', fmt), chunk('acid', acid)]);
  var mA = PR.readWavMeta(wavA.buffer.slice(wavA.byteOffset, wavA.byteOffset + wavA.length));
  ok(mA.root === 62, 'readWavMeta: acid root 62 when there is no smpl');
  var trunc = wavS.slice(0, 50);
  var mT = PR.readWavMeta(trunc.buffer.slice(trunc.byteOffset, trunc.byteOffset + trunc.length));
  ok(mT.rate === 22050, 'a truncated file returns what it could read and does not throw');
  // ffmpeg-written file (the rate of a file another tool wrote)
  var ff = require('child_process').spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.1', '-ar', '32000', '-f', 'wav', path.join(require('os').tmpdir(), 'a7-ffmpeg-check.wav')]);
  if (ff.status === 0) {
    var fb = fs.readFileSync(path.join(require('os').tmpdir(), 'a7-ffmpeg-check.wav'));
    var mF = PR.readWavMeta(fb.buffer.slice(fb.byteOffset, fb.byteOffset + fb.length));
    ok(mF.rate === 32000 && mF.channels === 1, 'readWavMeta reads the rate of a WAV ffmpeg wrote (' + mF.rate + ' Hz, ' + mF.channels + ' ch)');
  } else ok(true, 'ffmpeg not available: the ffmpeg WAV check is skipped');
  // pitch detection (check 33) and names and auto-map (check 34)
  function sine(f, secs, sr) { var n = Math.round(secs * sr), a = new Float32Array(n); for (var i = 0; i < n; i++) a[i] = 0.5 * Math.sin(2 * Math.PI * f * i / sr); return a; }
  var cents = function (hz, f) { return 1200 * Math.log(hz / f) / Math.LN2; };
  [41.2, 110, 440, 1046.5].forEach(function (f) {
    var d = PR.detectPitch(sine(f, 1.5, 44100), 44100);
    ok(Math.abs(cents(d.hz, f)) <= 5 && d.clarity >= 0.9, 'detectPitch ' + f + ' Hz within 5 ct (read ' + d.hz.toFixed(2) + ', clarity ' + d.clarity.toFixed(2) + ')');
  });
  var nz = new Float32Array(66150), sd = 7; for (var ni = 0; ni < nz.length; ni++) { sd = (sd * 16807) % 2147483647; nz[ni] = sd / 2147483647 - 0.5; }
  ok(PR.detectPitch(nz, 44100).hz === 0, 'white noise is unpitched');
  var pn = PR.parseName('Snare rr3.wav'), pv = PR.parseName('Piano C4 v100.wav'), pk = PR.parseName('bass_A#2_mf.wav'), pd = PR.parseName('kick_v127_rr2.wav');
  ok(pn.drumKey === 38 && pn.rr === 3 && pn.key === null, "parseName 'Snare rr3.wav': snare 38, rr 3");
  ok(pv.key === 60 && pv.vel === 100, "parseName 'Piano C4 v100.wav': key 60, vel 100");
  ok(pk.key === 46 && pk.vel === 80, "parseName 'bass_A#2_mf.wav': key 46, mf 80");
  ok(pd.drumKey === 36 && pd.vel === 127 && pd.rr === 2, "parseName 'kick_v127_rr2.wav': kick 36, vel 127, rr 2");
  var ents = [];
  ['C2', 'C3', 'C4'].forEach(function (n) { [64, 127].forEach(function (v) { [1, 2].forEach(function (r) { ents.push({ id: n + v + r, name: n + ' v' + v + ' rr' + r + '.wav' }); }); }); });
  var am = PR.autoMap(ents, { mode: 'pitched', keys: 'mid' });
  ok(am.regions.length === 12 && am.regions.every(function (x) { return x.seqLen === 2; }) && am.regions.some(function (x) { return x.root === 36; }) && am.regions.some(function (x) { return x.root === 60; }), 'autoMap: 12 regions, two velocity layers and two round-robin members per root (36, 48, 60)');
})();

console.log(fails ? 'FAILED: ' + fails + ' of ' + checks + ' checks' : 'OK: ' + checks + ' checks passed');
process.exit(fails ? 1 : 0);
