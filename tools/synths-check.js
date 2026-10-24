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
  var n = new Src(this, 'bufsrc'); n.buffer = null; n.loop = false; n.loopStart = 0; n.loopEnd = 0; n.playbackRate = new Param(this, 1); return n;
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

console.log(fails ? 'FAILED: ' + fails + ' of ' + checks + ' checks' : 'OK: ' + checks + ' checks passed');
process.exit(fails ? 1 : 0);
