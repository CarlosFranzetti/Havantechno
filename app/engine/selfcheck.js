#!/usr/bin/env node
/* Havantechno app engine - selfcheck.js
 * Smoke test with a fake AudioContext. Run: node app/engine/selfcheck.js
 * Checks: every module loads without a window, instruments and processors build on a fake context and on no
 * context, the song builds, all 200 bars schedule with every track playing, ducking fires, params clamp,
 * chord / melody / pattern parsing, section math, WAV encoding.
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');

var fails = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; console.log('  FAIL ' + msg); } }

// ------------------------------------------------------------------ fake Web Audio
function Param(v) { this.value = v; this.calls = []; }
['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'cancelScheduledValues'].forEach(function (m) {
  Param.prototype[m] = function (v, t) { this.calls.push([m, v, t]); if (m === 'setValueAtTime') this.value = v; if (m === 'exponentialRampToValueAtTime' && !(v > 0)) throw new Error('expo ramp to <= 0'); };
});
var stats = { nodes: 0, started: 0, byType: {} };
function Node(ctx, type) {
  this.ctx = ctx; this.type_ = type; this.connections = []; this.numberOfInputs = 1; this.numberOfOutputs = 1;
  stats.nodes++; stats.byType[type] = (stats.byType[type] || 0) + 1;
}
Node.prototype.connect = function (dest) { if (!dest) throw new Error('connect to undefined from ' + this.type_); this.connections.push(dest); return dest; };
Node.prototype.disconnect = function () { this.connections.length = 0; };
function Src(ctx, type) { Node.call(this, ctx, type); this.onended = null; this._started = false; }
Src.prototype = Object.create(Node.prototype);
Src.prototype.start = function (t) { if (this._started) throw new Error('start twice'); this._started = true; stats.started++; this.ctx._srcs.push(this); if (t != null && !(t >= 0)) throw new Error('bad start time ' + t); };
Src.prototype.stop = function (t) { if (t != null && !(t >= 0)) throw new Error('bad stop time ' + t); this._stopped = true; };
function FakeContext(sr) {
  this.sampleRate = sr || 44100; this.currentTime = 0; this.state = 'running'; this._srcs = [];
  this.destination = new Node(this, 'destination');
}
FakeContext.prototype.resume = function () { this.state = 'running'; return Promise.resolve(); };
FakeContext.prototype.createGain = function () { var n = new Node(this, 'gain'); n.gain = new Param(1); return n; };
FakeContext.prototype.createOscillator = function () { var n = new Src(this, 'osc'); n.frequency = new Param(440); n.detune = new Param(0); n.type = 'sine'; return n; };
FakeContext.prototype.createBufferSource = function () { var n = new Src(this, 'bufsrc'); n.buffer = null; n.loop = false; n.loopStart = 0; n.loopEnd = 0; n.playbackRate = new Param(1); n.detune = new Param(0); return n; };
// decodeAudioData: one frame per input byte, two channels at the context rate; a first byte of 255 is undecodable
FakeContext.prototype.decodeAudioData = function (ab, ok, err) {
  var self = this;
  return new Promise(function (resolve, reject) {
    var good = Object.prototype.toString.call(ab) === '[object ArrayBuffer]' && ab.byteLength > 0 && new Uint8Array(ab)[0] !== 255;
    if (!good) { var e = new Error('EncodingError'); if (err) err(e); reject(e); return; }
    var b = self.createBuffer(2, ab.byteLength, self.sampleRate);
    if (ok) ok(b); resolve(b);
  });
};
FakeContext.prototype.createConstantSource = function () { var n = new Src(this, 'const'); n.offset = new Param(1); return n; };
FakeContext.prototype.createBuffer = function (ch, len, sr) {
  var data = []; for (var i = 0; i < ch; i++) data.push(new Float32Array(len));
  return { numberOfChannels: ch, length: len, sampleRate: sr, duration: len / sr, getChannelData: function (c) { return data[c]; } };
};
FakeContext.prototype.createBiquadFilter = function () { var n = new Node(this, 'biquad'); n.frequency = new Param(350); n.Q = new Param(1); n.gain = new Param(0); n.detune = new Param(0); n.type = 'lowpass'; return n; };
FakeContext.prototype.createWaveShaper = function () { var n = new Node(this, 'shaper'); n.curve = null; n.oversample = 'none'; return n; };
FakeContext.prototype.createDelay = function (max) { var n = new Node(this, 'delay'); n.delayTime = new Param(0); n.max = max; return n; };
FakeContext.prototype.createConvolver = function () { var n = new Node(this, 'convolver'); n.buffer = null; return n; };
FakeContext.prototype.createDynamicsCompressor = function () { var n = new Node(this, 'comp'); ['threshold', 'knee', 'ratio', 'attack', 'release'].forEach(function (k) { n[k] = new Param(0); }); return n; };
FakeContext.prototype.createStereoPanner = function () { var n = new Node(this, 'panner'); n.pan = new Param(0); return n; };
FakeContext.prototype.createChannelSplitter = function (c) { var n = new Node(this, 'splitter'); n.numberOfOutputs = c; return n; };
FakeContext.prototype.createChannelMerger = function (c) { var n = new Node(this, 'merger'); n.numberOfInputs = c; return n; };
FakeContext.prototype.createAnalyser = function () { var n = new Node(this, 'analyser'); n.fftSize = 2048; n.getByteTimeDomainData = function () {}; return n; };
// "play" the fake clock: fire onended for sources whose stop time passed is not tracked, so just fire all
FakeContext.prototype.flush = function () { var s = this._srcs.splice(0); for (var i = 0; i < s.length; i++) if (s[i].onended) s[i].onended(); };

function load(sandbox) {
  ['core', 'synths', 'processors', 'songdoc', 'sequencer', 'song'].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, f + '.js'), 'utf8'), sandbox, { filename: f + '.js' });
  });
}
// the archived engine, the regression baseline for schedule equivalence
var ARCHIVE = path.join(__dirname, '..', '..', 'olde Havantechno dub studio');
function loadArchive(sandbox) {
  ['core', 'synths', 'processors', 'sequencer', 'song'].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(ARCHIVE, f + '.js'), 'utf8'), sandbox, { filename: 'archive/' + f + '.js' });
  });
}
// record every trigger of every track: [track, time, vel, accent, midi, dur, notes]
function recordSchedule(sb, seq, from, to) {
  var log = [];
  seq.order.forEach(function (name) {
    var tr = seq.tracks[name], orig = tr.inst.trigger;
    tr.inst.trigger = function (t, e) { log.push([name, +t.toFixed(9), e.vel, !!e.accent, e.midi == null ? null : e.midi, +(e.dur).toFixed(9), (e.notes || []).join('/')]); return orig(t, e); };
  });
  seq.scheduleAll(from, to, 0);
  return log;
}
function sandbox() {
  var sb = { console: console, setInterval: setInterval, clearInterval: clearInterval, setTimeout: setTimeout, Promise: Promise, Float32Array: Float32Array, Uint8Array: Uint8Array, ArrayBuffer: ArrayBuffer, DataView: DataView, WeakMap: WeakMap };
  sb.window = sb; sb.globalThis = sb;
  return vm.createContext(sb);
}

// ------------------------------------------------------------------ 1. no AudioContext at all
console.log('1. modules without any AudioContext');
(function () {
  var sb = sandbox(); load(sb);
  ok(sb.Kit && sb.Synths && sb.Processors && sb.SongDoc && sb.Sequencer && sb.Song, 'globals defined');
  sb.Synths.types().forEach(function (t) { var i = sb.Synths.create(null, t); i.trigger(0, { midi: 60 }); i.set('level', 0.5); i.panic(); i.dispose(); ok(i.params.level === 0.5, t + ' params without ctx'); });
  sb.Processors.types().forEach(function (t) { var p = sb.Processors.create(null, t); p.set('mix', 0.1); p.trigger(0); p.bypass(true); p.dispose(); ok(p.type === t, t + ' builds without ctx'); });
  var seq = sb.Sequencer.create(null); sb.Song.build(seq);
  ok(seq.totalBars === 200, 'song is 200 bars (' + seq.totalBars + ')');
  ok(Math.abs(seq.totalBars * seq.barSec() - 380.95) < 0.1, 'song length 6:21 (' + (seq.totalBars * seq.barSec()).toFixed(1) + ' s)');
  ok(seq.play() === false && !seq.playing, 'play() is a no-op without ctx');
  var n = seq.scheduleAll(0, null, 0);
  ok(n === 3200, 'scheduled 3200 steps dry (' + n + ')');
  var h = seq.hits();
  seq.order.forEach(function (t) { ok(h[t] > 0, 'track ' + t + ' plays (' + h[t] + ' hits)'); });
  ok(h.kick === 800, 'kick: 4 per bar for 200 bars (' + h.kick + ')');
  ok(h.clap === 392, 'clap on 2 and 4 where present (' + h.clap + ')');
})();

// ------------------------------------------------------------------ 2. parsing
console.log('2. parsing');
(function () {
  var sb = sandbox(); load(sb);
  var K = sb.Kit, S = sb.Sequencer;
  ok(K.ntom('B1') === 35 && K.ntom('C#5') === 73 && K.ntom('Bb1') === 34 && K.ntom('nope') === null, 'note names');
  ok(Math.abs(K.mtof(35) - 61.735) < 0.01, 'B1 = 61.7 Hz');
  var c = K.chordNotes('Bmaj9', 4); ok(c.join() === '71,75,78,82,85', 'Bmaj9 voicing ' + c.map(K.mton).join(' '));
  ok(K.chordNotes('G#m7', 3).map(K.mton).join(' ') === 'G#3 B3 D#4 F#4', 'G#m7 voicing');
  ok(K.chordNotes('Xyz', 4).length === 0 && K.chordNotes('Cq', 4).length === 0, 'bad chords -> no notes');
  var p = S.parsePattern('x.Xo'); ok(p.length === 1 && p[0].length === 16 && p[0][0] === 0.85 && p[0][1] === null && p[0][2] === 1 && p[0][3] === 0.5 && p[0][15] === null, 'pattern velocities, padded to 16');
  ok(S.parsePattern(['x...', '..x.']).length === 2, 'multi-bar patterns');
  var m = S.parseMelody(['C4 - D4 . E4! - - -', 'G4 . . . . . . . . . . . . . . .']);
  ok(m.bars === 2 && m.ev[0].midi === 60 && m.ev[0].len === 4 && m.ev[4].midi === 62 && m.ev[4].len === 2 && m.ev[8].vel === 1 && m.ev[8].len === 8 && m.ev[16].midi === 67 && m.ev[16].len === 1, 'melody 8-token and 16-token bars');
  ok(Math.abs(sb.Processors.divSeconds('3/16', 126) - 0.35714) < 0.001 && Math.abs(sb.Processors.divSeconds('1/8d', 120) - 0.375) < 1e-9 && sb.Processors.divSeconds('x', 120) === null, 'delay divisions');
  var inst = sb.Synths.create(null, 'bass');
  ok(inst.set('cutoff', 99999) && inst.params.cutoff === 8000 && inst.set('nope', 1) === false && inst.set('cutoff', 'abc') === false && inst.params.cutoff === 8000, 'param clamping and rejection');
  ok(sb.Synths.create(null, 'bogus').type === 'unknown' && sb.Processors.create(null, 'bogus').type === 'unknown', 'unknown types warn and no-op');
})();

// ------------------------------------------------------------------ 3. fake context: graphs and scheduling
console.log('3. fake AudioContext graph');
(function () {
  var sb = sandbox(); load(sb);
  var ctx = new FakeContext(44100);
  stats.nodes = 0; stats.started = 0; stats.byType = {};
  sb.Synths.types().forEach(function (t) {
    var i = sb.Synths.create(ctx, t);
    ok(i.out && i.pre, t + ' has out');
    var before = stats.started;
    i.trigger(1, { midi: 47, notes: [63, 66, 70], vel: 0.9, dur: 0.2 });
    ok(stats.started > before, t + ' trigger starts sources (' + (stats.started - before) + ')');
    i.trigger(null, {});
    ok(i._live.length >= 1, t + ' tracks live voices');
    i.panic();
    ctx.flush();
    ok(i._live.length === 0, t + ' voices released on end');
    i.set('level', 0.3); ok(i.out.gain.calls.length > 0, t + ' level drives the out gain');
    i.dispose();
  });
  sb.Processors.types().forEach(function (t) {
    var p = sb.Processors.create(ctx, t, {});
    ok(p.input && p.output, t + ' has input/output');
    ok(p.input.connections.length > 0, t + ' input is wired');
    for (var k in p.spec) if (p.spec.hasOwnProperty(k) && typeof p.spec[k].value === 'number') { p.set(k, p.spec[k].max); p.set(k, p.spec[k].min, { at: 2, ramp: 1 }); }
    p.bypass(true); p.bypass(false); p.trigger(1); p.trigger(1.1); p.dispose();
  });
  var sc = sb.Processors.create(ctx, 'sidechain', { depth: 0.6 });
  sc.trigger(1); var g = sc.node.gain.calls;
  ok(g.some(function (c) { return c[0] === 'linearRampToValueAtTime' && Math.abs(c[1] - 0.4) < 1e-9; }), 'sidechain dips to 1 - depth');
  var ch = sb.Processors.chain(ctx, ['filter', { type: 'delay', name: 'echo', mix: 0.3 }, ['reverb', { size: 1 }]]);
  ok(ch.procs.length === 3 && ch.get('echo').params.mix === 0.3 && ch.set('echo.mix', 0.5) && ch.get('echo').params.mix === 0.5 && ch.set('cutoff', 500), 'chain building and paths');
  var m = sb.Processors.master(ctx); ok(m.procs.length === 6 && m.get('hp').params.mode === 'highpass', 'master chain');

  // the song on the fake context
  var seq = sb.Sequencer.create(ctx, { bpm: 126, swing: 0.06 });
  sb.Song.build(seq);
  ok(seq.master && seq.out && seq.out.connections[0] === ctx.destination || seq.out.connections.indexOf(ctx.destination) >= 0, 'master reaches destination');
  ok(seq.tracks.stab.chain.procs.length === 1 && seq.tracks.stab.sendGains.delay && seq.tracks.stab.sendGains.reverb, 'stab inserts and sends wired');
  ok(Math.abs(seq.sends.delay.params.time - 0.357) < 0.01 || seq.sends.delay.params.division === '3/16', 'delay synced to 3/16');
  var before = stats.started;
  var n = seq.scheduleAll(0, 2, 0);                   // intro: kick, sub, bass only
  ok(n === 32 && stats.started > before, 'scheduled 2 bars on the fake graph');
  var duckCalls = seq.tracks.bass.sc.node.gain.calls.length;
  ok(duckCalls >= 8, 'kick ducks the bass (' + duckCalls + ' automation calls)');
  ok(!seq.tracks.sub.sc.node.gain.calls.some(function (c) { return c[0] === 'linearRampToValueAtTime'; }), 'the sub is not ducked in the archived song (sidechain depth 0)');
  var bassTimes = []; var origTrig = seq.tracks.bass.inst.trigger;
  seq.tracks.bass.inst.trigger = function (t, e) { bassTimes.push(t); return origTrig(t, e); };
  seq.swing = 0; seq.scheduleAll(0, 1, 10);
  var sd = 60 / 126 / 4;
  ok(bassTimes.length === 4 && Math.abs(bassTimes[0] - (10 + 3 * sd)) < 1e-9 && Math.abs(bassTimes[1] - (10 + 7 * sd)) < 1e-9, 'bass hits land on steps 3 and 7 at 126 BPM');
  seq.swing = 0.5; bassTimes.length = 0; seq.scheduleAll(0, 1, 20);
  ok(bassTimes[0] > 20 + 3 * sd && bassTimes[0] < 20 + 3.4 * sd, 'swing delays odd 16ths');
  // section automation: breakEnd ramps master.hp.cutoff 24 -> 500
  var hp = seq.master.get('hp'); var calls0 = hp.nodes.length;
  seq.scheduleAll(128, 136, 30);
  ok(hp.params.cutoff > 400, 'breakEnd ramp drives master.hp.cutoff (' + hp.params.cutoff.toFixed(0) + ' Hz)');
  seq.scheduleAll(136, 137, 40);
  ok(hp.params.cutoff === 24, 'mainB resets master.hp.cutoff');
  ok(seq.setParam('kick.decay', 0.5) && seq.getParam('kick.decay') === 0.5 && seq.setParam('stab.width.width', 1.2) && seq.getParam('stab.width.width') === 1.2 && seq.setParam('send.reverb.mix', 0.7) && seq.setParam('master.glue.ratio', 4) && seq.setParam('bass.gain', 0.3) && seq.setParam('nope.x', 1) === false, 'parameter paths');
  seq.mute('kick', true); ok(seq.tracks.kick.channel.params.mute === true, 'mute');
  seq.solo('sub', true); ok(seq.tracks.bass.channel.params.mute === true && seq.tracks.sub.channel.params.mute === false, 'solo mutes the others');
  seq.solo('sub', false); seq.mute('kick', false); ok(seq.tracks.bass.channel.params.mute === false, 'solo off restores');
  // transport on the fake clock
  var stepEvents = 0; seq.on('step', function () { stepEvents++; });
  ok(seq.play() === true && seq.playing, 'play starts');
  ok(seq.jump('mainA') && seq.pos().bar === 40, 'jump to mainA (bar ' + seq.pos().bar + ')');
  seq.loop('mainA'); ok(seq.loopSection === 'mainA', 'loop section');
  seq.stop(); ok(!seq.playing && seq.pos().bar === 40, 'stop returns to the section start');
  seq.dispose();
  var buf = ctx.createBuffer(2, 100, 44100); buf.getChannelData(0)[0] = 1; buf.getChannelData(1)[1] = -1;
  var w = sb.Sequencer.wav(buf); var dv = new DataView(w);
  ok(w.byteLength === 44 + 400 && dv.getUint32(0, false) === 0x52494646 && dv.getInt16(44, true) === 32767 && dv.getInt16(50, true) === -32768, 'WAV encoding');
  console.log('   fake graph: ' + stats.nodes + ' nodes, ' + stats.started + ' sources');
})();

// ------------------------------------------------------------------ 4. song document and step record
console.log('4. song document, step record, equivalence with the archived engine');
(function () {
  var sb = sandbox(); load(sb);
  var ar = sandbox(); loadArchive(ar);
  var SDoc = sb.SongDoc, G = sb.Song.GUIDANCE;
  // 4a. the archived engine, the new engine on the legacy data, and the new engine on the document schedule identically
  var base = recordSchedule(ar, (function () { var s = ar.Sequencer.create(null); ar.Song.build(s); return s; })(), 0, null);
  var legacy = recordSchedule(sb, (function () { var s = sb.Sequencer.create(null); sb.Song.build(s); return s; })(), 0, null);
  var doc = sb.Song.document();
  var fromDoc = recordSchedule(sb, (function () { var s = sb.Sequencer.create(null); sb.Song.build(s, doc); return s; })(), 0, null);
  var reloaded = SDoc.load(SDoc.save(doc));
  var fromJson = recordSchedule(sb, (function () { var s = sb.Sequencer.create(null); sb.Song.build(s, reloaded); return s; })(), 0, null);
  ok(base.length > 3000, 'baseline recorded ' + base.length + ' triggers');
  ok(JSON.stringify(legacy) === JSON.stringify(base), 'new engine on legacy strings == archived engine (' + legacy.length + ' triggers)');
  ok(JSON.stringify(fromDoc) === JSON.stringify(base), 'new engine on the document == archived engine');
  ok(JSON.stringify(fromJson) === JSON.stringify(base), 'new engine on save/load round trip == archived engine');
  // 4b. string round trips
  var rt = 0, rtAll = 0;
  G.tracks.forEach(function (t) {
    if (t.patterns) for (var k in t.patterns) if (t.patterns.hasOwnProperty(k)) { rtAll++; if (SDoc.formatVariant(SDoc.parseVariant(t.patterns[k], 'drum'), 'drum') === t.patterns[k]) rt++; }
  });
  ok(rt === rtAll && rtAll > 20, 'pattern strings round-trip (' + rt + '/' + rtAll + ')');
  var mel = SDoc.parseVariant(sb.Song.LEAD_HOOK, 'melody'), melTxt = SDoc.formatVariant(mel, 'melody');
  ok(typeof melTxt !== 'object' || Array.isArray(melTxt), 'plain melody formats as text (' + (Array.isArray(melTxt) ? melTxt.length + ' bars' : '1 bar') + ')');
  ok(JSON.stringify(SDoc.parseVariant(melTxt, 'melody')) === JSON.stringify(mel), 'melody text round-trips to the same cells');
  var odd = SDoc.parseVariant('x...', 'drum'); odd.cells[0].nudge = 0.1;
  ok(typeof SDoc.formatVariant(odd, 'drum') === 'object' && SDoc.formatVariant(odd, 'drum').cells[0].nudge === 0.1, 'a variant with per-step data formats as cells');
  // 4c. nudge, probability, condition, repeats, locks on a small song (fake context, swing 0)
  var ctx = new FakeContext(44100), sd = 60 / 126 / 4;
  function tiny(cells, extra) {
    var s = sb.Sequencer.create(ctx, { bpm: 126, swing: 0 });
    var def = { bpm: 126, swing: 0, progression: ['Bmaj9'], sends: {}, tracks: [
      { name: 'kick', inst: 'kick', duck: ['bass'], variants: { A: { bars: 1, cells: cells } } },
      { name: 'bass', inst: 'bass', note: 'B2', sidechain: { depth: 0.5 }, variants: { A: 'x.x.x.x.x.x.x.x.' } } ],
      sections: [{ name: 'a', bars: 4, play: { kick: 'A', bass: 'A' }, set: { 'kick.level': 1 } }] };
    if (extra) extra(def);
    sb.Song.build(s, def);
    return s;
  }
  var cells = []; for (var i = 0; i < 16; i++) cells.push(null);
  cells[0] = { vel: 1, nudge: 0.25 }; cells[4] = { vel: 0.7, nudge: -0.25 }; cells[8] = { vel: 0.85, len: 2 };
  var s1 = tiny(cells), log = recordSchedule(sb, s1, 0, 1);
  var kicks = log.filter(function (r) { return r[0] === 'kick'; });
  ok(kicks.length === 3 && Math.abs(kicks[0][1] - 0.25 * sd) < 1e-9 && Math.abs(kicks[1][1] - 3.75 * sd) < 1e-9, 'nudge moves a step by a fraction of a step');
  ok(Math.abs(kicks[2][5] - 2 * sd) < 1e-9 && kicks[0][2] === 1 && kicks[1][2] === 0.7, 'per-step length and velocity');
  cells = []; for (i = 0; i < 16; i++) cells.push({ vel: 1, prob: 0.5 });
  var s2 = tiny(cells), a = recordSchedule(sb, s2, 0, 4).filter(function (r) { return r[0] === 'kick'; }).map(function (r) { return r[1]; });
  var s3 = tiny(cells), b = recordSchedule(sb, s3, 0, 4).filter(function (r) { return r[0] === 'kick'; }).map(function (r) { return r[1]; });
  ok(a.length > 10 && a.length < 54 && JSON.stringify(a) === JSON.stringify(b), 'probability is deterministic (' + a.length + ' of 64 kicks, same twice)');
  s3.seed = 2; var c = recordSchedule(sb, s3, 0, 4).filter(function (r) { return r[0] === 'kick'; }).map(function (r) { return r[1]; });
  ok(JSON.stringify(a) !== JSON.stringify(c), 'a different seed gives different hits');
  cells = []; for (i = 0; i < 16; i++) cells.push(null); cells[0] = { vel: 1, prob: 0 };
  var s4 = tiny(cells); recordSchedule(sb, s4, 0, 2);
  ok(s4.hits().kick === 0 && s4.tracks.bass.sc.node.gain.calls.length === 0, 'a probability-0 step neither plays nor ducks');
  cells = []; for (i = 0; i < 16; i++) cells.push(null); cells[0] = { vel: 1, cond: '1:4' }; cells[8] = { vel: 1, cond: '!1:4' };
  var s5 = tiny(cells), l5 = recordSchedule(sb, s5, 0, 4).filter(function (r) { return r[0] === 'kick'; });
  ok(l5.length === 4 && Math.abs(l5[0][1]) < 1e-9 && l5[1][1] > 16 * sd, 'conditions a:b and !a:b select bars');
  cells = []; for (i = 0; i < 16; i++) cells.push(null); cells[0] = { vel: 1, rep: 4 };
  var s6 = tiny(cells), l6 = recordSchedule(sb, s6, 0, 1).filter(function (r) { return r[0] === 'kick'; });
  ok(l6.length === 4 && Math.abs(l6[3][1] - 0.75 * sd) < 1e-9 && l6[0][5] <= sd / 4, 'repeats retrigger inside the step');
  cells = []; for (i = 0; i < 16; i++) cells.push(null); cells[0] = { vel: 1, locks: { decay: 0.9, tune: 9999, level: 0.1, nope: 3 } };
  var s7 = tiny(cells), seen = null, kinst = s7.tracks.kick.inst, orig = kinst.trigger;
  kinst.trigger = function (t, e) { seen = { decay: kinst.params.decay, tune: kinst.params.tune, level: kinst.params.level }; return orig(t, e); };
  s7.scheduleAll(0, 1, 0);
  ok(seen && seen.decay === 0.9 && seen.tune === 90 && seen.level === 1, 'locks reach the trigger, clamped to the spec, level excluded');
  ok(kinst.params.decay === 0.34 && kinst.params.tune === 45, 'locks are restored after the trigger');
  // 4d. held parameters
  var s8 = tiny(cells);
  s8.setParam('kick.level', 0.3); s8.hold('kick.level'); s8.scheduleAll(0, 1, 0);
  ok(s8.getParam('kick.level') === 0.3 && s8.heldCount() === 1, 'a held path is not overwritten by the section set');
  s8.releaseAll(); s8.scheduleAll(0, 1, 0);
  ok(s8.getParam('kick.level') === 1 && s8.heldCount() === 0, 'releasing lets the arrangement write again');
  // 4e. save / load and the editor
  var json = SDoc.save(doc), doc2 = SDoc.load(json);
  ok(JSON.stringify(SDoc.load(SDoc.save(doc2))) === JSON.stringify(doc2) && doc2.tracks.length === 13 && doc2.sections.length === 9, 'save/load is stable (' + (json.length / 1024).toFixed(0) + ' KB)');
  var threw = false; try { SDoc.load('{"v":2}'); } catch (e) { threw = true; } ok(threw, 'load rejects an unknown version');
  var ed = SDoc.createEditor(SDoc.load(json));
  ok(ed.variantUsage('bass', 'B').join() === 'mainA2,mainB' && ed.variantUsage('kick', 'A').length === 9, 'variant usage across sections');
  var r1 = ed.setStepInSection('mainB', 'bass', 2, { vel: 0.6, locks: { cutoff: 900 } });
  ok(r1 && r1.forked && r1.variant === 'D' && ed.section('mainB').play.bass === 'D' && ed.section('mainA2').play.bass === 'B', 'copy-on-write forks a shared variant (B -> D for mainB only)');
  ok(ed.track('bass').variants.D.cells[2].vel === 0.6 && ed.track('bass').variants.D.cells[2].locks.cutoff === 900 && ed.track('bass').variants.B.cells[2].vel === 0.85, 'the edit lands on the fork, the original is untouched');
  var r2 = ed.setStepInSection('mainB', 'bass', 2, { vel: 0.4 });
  ok(r2 && !r2.forked && r2.variant === 'D', 'a second edit does not fork again');
  ed.setStep('bass', 'D', 2, { locks: { cutoff: null } }); ok(!ed.track('bass').variants.D.cells[2].locks, 'a null lock removes the lock');
  ed.setStep('bass', 'D', 2, null); ok(ed.track('bass').variants.D.cells[2] === null, 'a null patch clears the cell');
  var r3 = ed.setStepInSection('mainA2', 'bass', 0, { vel: 1 }, 'all');
  ok(r3 && !r3.forked && ed.track('bass').variants.B.cells[0].vel === 1, "scope 'all' edits the shared variant in place");
  var n0 = ed._undo.length; ok(n0 >= 6 && ed.undo() && ed.track('bass').variants.B.cells[0] === null && ed.redo() && ed.track('bass').variants.B.cells[0].vel === 1, 'undo and redo');
  ok(ed.setSectionParam('intro', 'kick.level', 0.5) && ed.section('intro').set['kick.level'] === 0.5 && ed.setProgression(null, 2, 'C#m9') && ed.doc.progression[2] === 'C#m9' && ed.rename('Guidance edit') && ed.doc.name === 'Guidance edit', 'section params, progression and name edits');
  var s9 = sb.Sequencer.create(null); sb.Song.build(s9, ed.doc); s9.scheduleAll(0, null, 0);
  ok(s9.hits().bass > 0 && s9.hits().kick === 800, 'an edited document still builds and plays');
  var leg = SDoc.toLegacy(ed.doc);
  ok(typeof leg.tracks[0].patterns.A === 'string' && typeof leg.tracks[2].patterns.D === 'string' && typeof leg.tracks[2].patterns.B === 'object' && leg.tracks[2].patterns.B.cells[0].vel === 1, 'toLegacy keeps plain variants readable (D, cleared back to plain) and per-step data as cells (B)');
})();

// ------------------------------------------------------------------ 5. Host and Project (A1, Build Crew)
// Host with no AudioContext: devices, editor + commit, hold / release, events; Project round trips; then a Host on
// the fake context: start, transport events, meters. Async parts (start, save, open) finish before the summary.
console.log('5. Host and Project');
function loadHost(sb) {
  ['host', 'project'].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, f + '.js'), 'utf8'), sb, { filename: f + '.js' });
  });
}
var section5 = (function () {
  var sb = sandbox(); load(sb); loadHost(sb);
  var H = sb.Host, P = sb.Project, SDoc = sb.SongDoc, G = sb.Song.GUIDANCE;
  ok(H && P && typeof H.create === 'function' && typeof P.serialize === 'function', 'Host and Project globals defined');
  var host = H.create();
  var events = { step: [], section: [], play: [], stop: [], document: [], param: [] };
  Object.keys(events).forEach(function (t) { host.on(t, function (e) { events[t].push(e); }); });
  ok(host.started() === false && host.context() === null && host.meter('track:kick').level === 0 && host.meter('track:kick').reduction === null, 'a new Host has no audio and silent meters');

  // 5a. devices: every instrument, insert, sidechain, channel, send and master unit of the Guidance song
  var devs = host.devices(), byId = {};
  devs.forEach(function (d) { byId[d.id] = d; });
  var FAM = { kick: 'drums', clap: 'drums', hat_closed: 'drums', hat_open: 'drums', shaker: 'drums', perc: 'drums', sub: 'bass', bass: 'bass',
              stab: 'keys', lead: 'keys', pad: 'keys', riser: 'fx', impact: 'fx', compressor: 'dynamics', limiter: 'dynamics', sidechain: 'dynamics',
              delay: 'time', reverb: 'time', chorus: 'time', filter: 'tone', eq3: 'tone', saturator: 'tone', widener: 'utility', channel: 'utility' };
  var want = [];
  G.tracks.forEach(function (t) {
    want.push(['track:' + t.name, t.inst, 'instrument', t.name, t.name]);
    (t.chain || []).forEach(function (c) { want.push(['track:' + t.name + ':' + (c.name || c.type), c.type, 'insert', t.name, t.name + '.' + (c.name || c.type)]); });
    want.push(['track:' + t.name + ':sc', 'sidechain', 'sidechain', t.name, t.name + '.sc']);
    want.push(['track:' + t.name + ':channel', 'channel', 'channel', t.name, t.name]);
  });
  Object.keys(G.sends).forEach(function (n) { want.push(['send:' + n, G.sends[n].type, 'send', null, 'send.' + n]); });
  [['eq', 'eq3'], ['hp', 'filter'], ['lp', 'filter'], ['glue', 'compressor'], ['sat', 'saturator'], ['limiter', 'limiter']].forEach(function (m) { want.push(['master:' + m[0], m[1], 'master', null, 'master.' + m[0]]); });
  ok(devs.length === want.length && want.length === 49, 'devices() lists ' + devs.length + ' devices (want ' + want.length + ': 13 instruments, 2 inserts, 13 sidechains, 13 channels, 2 sends, 6 master units)');
  var bad = want.filter(function (w) { var d = byId[w[0]]; return !d || d.type !== w[1] || d.kind !== w[2] || d.track !== w[3] || d.pathPrefix !== w[4] || d.family !== FAM[w[1]] || !d.ref || !d.spec; });
  ok(bad.length === 0, 'device ids, types, kinds, tracks, path prefixes and families match' + (bad.length ? ' (bad: ' + bad.map(function (w) { return w[0]; }).join(', ') + ')' : ''));
  ok(sb.Synths.types().every(function (t) { return devs.some(function (d) { return d.kind === 'instrument' && d.type === t; }); }), 'every instrument type has a device');
  ok(host.device('track:kick').ref.type === 'kick' && host.device('master:glue').ref.node === undefined && host.device('track:bass:eq').ref.type === 'eq3' && host.device('nope') === null, 'device(id) returns the live engine object');
  var unreachable = [];
  devs.forEach(function (d) {
    Object.keys(d.spec).forEach(function (k) {
      var v = host.getParam(d.pathPrefix + '.' + k), home = d.spec[k].value;
      if (v === undefined || (typeof home !== 'string' && typeof v !== typeof home)) unreachable.push(d.id + ' ' + k);
    });
  });
  ok(unreachable.length === 0, 'every spec param of every device reads through pathPrefix.param' + (unreachable.length ? ' (' + unreachable.slice(0, 6).join('; ') + ')' : ''));
  ok(byId['track:stab:channel'].spec['send.delay'].value === 0.15 && host.getParam('stab.send.delay') === 0.15 && host.getParam('kick.send.reverb') === 0, 'the channel device carries the send levels');
  ok(host.tracks().length === 13 && host.sends().map(function (s) { return s.name; }).join() === 'delay,reverb' && host.sections().length === 9 && host.sections()[3].start === 40 && host.bpm() === 126 && host.swing() === 0.06, 'tracks, sends, sections, bpm, swing');

  // 5b. parameters: live value, document value, 'param' events
  events.param.length = 0;
  ok(host.setParam('kick.decay', 0.5) && host.getParam('kick.decay') === 0.5 && host.document().tracks[0].params.decay === 0.5, 'setParam reaches the engine and the document (kick.decay)');
  ok(events.param.length === 1 && events.param[0].path === 'kick.decay' && events.param[0].value === 0.5 && events.param[0].source === 'ui', "'param' event with source 'ui'");
  ok(host.setParam('stab.width.width', 1.4) && host.getParam('stab.width.width') === 1.4 && host.document().tracks[3].chain[0].width === 1.4, 'insert param in the engine and the document');
  ok(host.setParam('bass.sc.depth', 0.7) && host.document().tracks[2].sidechain.depth === 0.7 && host.setParam('kick.gain', 0.9) && host.document().tracks[0].gain === 0.9, 'sidechain and channel params in the document');
  ok(host.setParam('send.reverb.mix', 0.8) && host.document().sends.reverb.mix === 0.8 && host.setParam('master.hp.cutoff', 40) && host.document().master.hp.cutoff === 40, 'send and master params in the document');
  ok(host.setParam('kick.send.reverb', 0.2) && host.getParam('kick.send.reverb') === 0.2 && host.document().tracks[0].sends.reverb === 0.2, 'track send level without a context');
  var dmax = host.device('track:kick').spec.decay.max;
  ok(host.setParam('kick.decay', 99) && host.getParam('kick.decay') === dmax && host.document().tracks[0].params.decay === dmax && host.setParam('kick.decay', 0.5), 'values clamp to the spec before they reach the document');
  ok(host.setParam('nope.x', 1) === false && host.setParam('kick.nope', 1) === false && host.setParam('kick.send.reverb', 'abc') === false, 'bad paths and values are refused');
  ok(host.setParam('clap.mute', true) && host.getParam('clap.mute') === true && host.tracks()[4].muted === true && host.setParam('clap.mute', false) && host.getParam('clap.mute') === false, 'track mute through setParam');
  ok(host.setParam('bpm', 128) && host.bpm() === 128 && host.document().bpm === 128 && host.setParam('bpm', 126), 'bpm through setParam');

  // 5c. editor + commit: an in-place schedule change (fork a bass variant, add a step)
  var seq0 = host.engine();
  function hits(track) { var s = host.engine(), h0 = s.hits()[track]; s.scheduleAll(0, null, 0); return s.hits()[track] - h0; }
  var bassBefore = hits('bass'), kickBefore = hits('kick');
  var ed = host.editor();
  var letter = ed.forkVariant('bass', 'B');
  ok(letter === 'D' && ed.setPlay('mainB', 'bass', letter), 'fork bass B -> ' + letter + ' and play it in mainB');
  ed.setStep('bass', letter, 0, { vel: 1 });
  events.document.length = 0;
  var rebuilt = host.commit();
  ok(rebuilt === false && host.engine() === seq0 && events.document.length === 1 && events.document[0].reason === 'commit' && events.document[0].rebuilt === false, "a step edit commits in place and emits 'document'");
  var bassAfter = hits('bass');
  ok(bassAfter === bassBefore + 48 && hits('kick') === kickBefore, 'the schedule changed: bass ' + bassBefore + ' -> ' + bassAfter + ' hits (+1 per bar of mainB), kick unchanged');
  ok(host.engine().tracks.bass.variants.D.cells[0].vel === 1 && host.sections()[7].play.bass === 'D', 'the running engine plays the fork in mainB');
  ok(ed.undo() && ed.undo() && ed.undo() && host.commit() === false && hits('bass') === bassBefore && !host.engine().tracks.bass.variants.D, 'undo + commit restores the schedule');
  // editor additions on the Host's editor: group (one undo step), setFx, setVariantBars
  var u0 = ed._undo.length;
  var gl = ed.group(function (e) { var l = e.forkVariant('kick', 'A'); e.setPlay('intro', 'kick', l); e.setStep('kick', l, 2, { vel: 1 }); return l; });
  ok(gl && ed._undo.length === u0 + 1 && ed.section('intro').play.kick === gl && ed.undo() && ed.section('intro').play.kick === 'A' && !ed.track('kick').variants[gl], 'ed.group() makes several operations one undo step');
  var fi = ed.setFx('mainA', null, { bar: 8, track: 'impact' });
  ok(fi === 1 && ed.section('mainA').fx[1].track === 'impact' && ed.setFx('mainA', fi, { vel: 0.5 }) === fi && ed.section('mainA').fx[1].vel === 0.5 && ed.setFx('mainA', fi, null) === fi && ed.section('mainA').fx.length === 1 && ed.setFx('nope', null, { track: 'x' }) === -1, 'ed.setFx adds, edits and removes section fx hits');
  host.commit(); var impacts = hits('impact');
  ed.setFx('mainA', null, { bar: 8, track: 'impact' }); host.commit();
  ok(hits('impact') === impacts + 1, 'an added fx hit reaches the schedule (impact ' + impacts + ' -> ' + (impacts + 1) + ')');
  ed.undo(); host.commit();
  ok(ed.setVariantBars('bass', 'C', 2) && ed.track('bass').variants.C.bars === 2 && ed.track('bass').variants.C.cells.length === 32 && ed.track('bass').variants.C.cells[19].vel === 0.85 && ed.setVariantBars('bass', 'C', 3, 'empty') && ed.track('bass').variants.C.cells[35] === null && ed.setVariantBars('bass', 'C', 1) && ed.track('bass').variants.C.cells.length === 16 && ed.setVariantBars('bass', 'C', 0) === false, 'ed.setVariantBars grows (repeat or empty) and shrinks a variant');
  ed.undo(); ed.undo(); ed.undo(); host.commit();
  ok(hits('bass') === bassBefore, 'undo of the bar changes restores the schedule');
  // a structural edit rebuilds, keeping position, held paths, mute and solo
  host.transport.jump('mainA'); host.hold('stab.cutoff'); host.mute('clap', true); host.solo('kick', false);
  ok(ed.setTrackParam('kick', 'decay', 0.6), 'setTrackParam');
  rebuilt = host.commit();
  ok(rebuilt === true && host.engine() !== seq0 && events.document[events.document.length - 1].rebuilt === true, 'a track param edit rebuilds the engine');
  ok(host.getParam('kick.decay') === 0.6 && host.transport.pos().bar === 40 && host.isHeld('stab.cutoff') && host.heldCount() === 1 && host.tracks()[4].muted === true, 'the rebuild keeps the position, held paths and mute');
  ok(host.getParam('stab.width.width') === 1.4 && host.getParam('master.hp.cutoff') === 40 && host.getParam('send.reverb.mix') === 0.8 && host.getParam('kick.send.reverb') === 0.2, 'the rebuild keeps the knob values (stored in the document)');
  ok(host.device('track:kick').ref === host.engine().tracks.kick.inst, 'devices() follow the rebuilt engine');
  host.mute('clap', false);

  // 5d. hold / release round trip
  host.setParam('stab.cutoff', 3000);
  host.engine().scheduleAll(40, 41, 0);              // mainA's section start sets stab.cutoff 1500, skipped while held
  ok(host.getParam('stab.cutoff') === 3000, 'a held path ignores the section set');
  events.param.length = 0;
  host.release('stab.cutoff');
  ok(host.heldCount() === 0 && !host.isHeld('stab.cutoff') && host.getParam('stab.cutoff') === 1500, 'release returns the path to the arranged value (1500 at mainA)');
  ok(events.param.length === 1 && events.param[0].source === 'arrangement' && events.param[0].value === 1500, "release emits 'param' with source 'arrangement'");
  host.hold('kick.level'); host.hold('stab.cutoff'); host.releaseAll();
  ok(host.heldCount() === 0, 'releaseAll');
  events.param.length = 0;
  host.engine().scheduleAll(16, 17, 0);              // intro2 ramps stab.cutoff
  ok(events.param.some(function (e) { return e.path === 'stab.cutoff' && e.source === 'arrangement'; }), "section ramps emit 'param' with source 'arrangement'");

  // 5e. events without a context: stop emits a step; listeners can be removed
  events.step.length = 0;
  host.transport.stop();
  ok(events.step.length === 1 && events.step[0].bar === 40 && events.step[0].name === 'mainA' && host.transport.playing === false, "transport.stop() emits 'step' at the section start");
  var n0 = 0, f = function () { n0++; }; host.on('step', f); host.off('step', f); host.transport.stop();
  ok(n0 === 0 && host.transport.play() === false, 'off() removes a listener; play() is a no-op without audio');

  // 5f. Project: serialize / parse round trips; autosave / restore; loadDocument
  var doc = host.document(), json = P.serialize(doc), env = JSON.parse(json);
  ok(env.app === 'havantechno' && env.format === 1 && typeof env.savedAt === 'string' && env.song && env.song.v === 1 && P.savedAt(json) === env.savedAt, 'serialize wraps the SongDoc as {app, format, savedAt, song}');
  var back = P.parse(json);
  ok(SDoc.save(back) === SDoc.save(doc), 'parse(serialize(doc)) gives back the same document');
  ok(SDoc.save(P.parse(SDoc.save(doc))) === SDoc.save(doc), 'parse accepts a bare SongDoc');
  var threw = 0; ['{"app":"other"}', '{"app":"havantechno","format":9,"song":{}}', 'not json', '{"v":2,"tracks":[]}'].forEach(function (j) { try { P.parse(j); } catch (e) { threw++; } });
  ok(threw === 4, 'parse rejects other files, unknown formats and bad JSON');
  ok(P.fileName('Guidance edit / v2') === 'Guidance edit - v2.havantechno.json' && P.fileName('') === 'song.havantechno.json', 'file names are safe');
  ok(P.restore() === null && P.autosave(doc) === false, 'no localStorage: autosave and restore do nothing');
  var store = {}; sb.localStorage = { getItem: function (k) { return store.hasOwnProperty(k) ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; } };
  ok(P.autosave(doc) === true && SDoc.save(P.restore()) === SDoc.save(doc), 'autosave / restore through localStorage');
  P.clearAutosave(); ok(P.restore() === null, 'clearAutosave');
  events.document.length = 0;
  host.transport.jump('break'); host.hold('kick.level'); host.solo('kick', true);
  host.loadDocument(back);
  ok(events.document.length === 1 && events.document[0].reason === 'load' && host.transport.pos().bar === 0 && host.heldCount() === 0 && !host.tracks()[0].solo, "loadDocument rebuilds stopped at bar 0, nothing held, emits 'document'");
  ok(host.devices().length === 49 && host.getParam('master.hp.cutoff') === 40 && host.getParam('kick.decay') === 0.6 && host.document().tracks[2].variants.D === undefined, 'a saved and loaded project keeps its knob values');
  host.loadDocument(sb.Song.document());
  ok(host.getParam('master.hp.cutoff') === 24 && host.getParam('kick.decay') === 0.3, 'loadDocument(Song.document()) is the stock song again');
  threw = false; try { host.loadDocument({ v: 1 }); } catch (e) { threw = true; }
  ok(threw && host.devices().length === 49, 'a bad document throws and leaves the current song running');

  // 5g. async: the shell hooks, render without OfflineAudioContext, and a Host on the fake context
  var shellCalls = [];
  var shell = {
    saveFile: function (o) { shellCalls.push(['save', o.name, o.text.length]); return Promise.resolve({ path: '/songs/' + o.name }); },
    openFile: function () { shellCalls.push(['open']); return Promise.resolve({ path: '/songs/x.havantechno.json', text: json }); }
  };
  var cancel = { saveFile: function () { return Promise.resolve(null); }, openFile: function () { return Promise.resolve({ canceled: true }); } };
  var ctx = new FakeContext(48000);
  ctx.createAnalyser = function () {                  // a steady 0.5 / -0.5 signal, identical on both channels
    var n = FakeContext.prototype.createAnalyser.call(this);
    n.getFloatTimeDomainData = function (b) { for (var i = 0; i < b.length; i++) b[i] = (i % 2) ? -0.5 : 0.5; };
    return n;
  };
  var live = H.create({ context: ctx }), lev = { play: 0, stop: 0, document: [] };
  live.on('play', function () { lev.play++; }); live.on('stop', function () { lev.stop++; }); live.on('document', function (e) { lev.document.push(e.reason); });
  return Promise.all([
    P.save(doc, { shell: shell, name: 'My song' }),
    P.open({ shell: shell }),
    P.save(doc, { shell: cancel }),
    P.open({ shell: cancel }),
    P.save(doc, {}).then(function () { return 'saved'; }, function (e) { return 'rejected'; }),
    host.render({ from: 'intro', to: 'intro' }).then(function () { return 'rendered'; }, function (e) { return e.message; }),
    host.render({ from: 'nope' }).then(function () { return 'rendered'; }, function (e) { return e.message; }),
    live.start()
  ]).then(function (r) {
    ok(r[0] && r[0].path === '/songs/My song.havantechno.json' && r[0].name === 'My song.havantechno.json' && shellCalls[0][0] === 'save', 'save goes through HavantechnoShell.saveFile');
    ok(r[1] && SDoc.save(r[1]) === SDoc.save(back) && shellCalls[1][0] === 'open', 'open goes through HavantechnoShell.openFile and parses the file');
    ok(r[2] === null && r[3] === null, 'a cancelled dialog resolves null');
    ok(r[4] === 'rejected', 'save without a shell or a document rejects');
    ok(r[5] === 'OfflineAudioContext unavailable' && /unknown section/.test(r[6]), 'render rejects cleanly without OfflineAudioContext and for an unknown section');
    ok(r[7] === true && live.started() && live.context() === ctx && lev.document[0] === 'start', "start() on a context resolves true, rebuilds live, emits 'document'");
    ok(live.engine().ctx === ctx && live.device('track:kick').ref.out && live.analyser(), 'the live engine runs on the context');
    var m = live.meter('track:kick');
    ok(Math.abs(m.level - 0.5) < 1e-9 && m.reduction === null && m.correlation === null, 'meter(): peak level of the device output (' + m.level + ')');
    var mm = live.meter('master');
    ok(Math.abs(mm.level - 0.5) < 1e-9 && Math.abs(mm.correlation - 1) < 1e-9, 'master meter: level and L/R correlation (' + mm.correlation + ')');
    live.device('master:glue').ref.node.reduction = -4.5;
    live.device('track:bass:sc').ref.node.gain.value = 0.5;
    ok(live.meter('master:glue').reduction === -4.5 && live.meter('master:limiter').reduction === null && live.meter('master:limiter').correlation === 1, 'compressor reduction from p.node.reduction');
    ok(Math.abs(live.meter('track:bass:sc').reduction + 6.0206) < 1e-3, 'sidechain reduction from its gain (' + live.meter('track:bass:sc').reduction.toFixed(2) + ' dB)');
    ok(live.meter('nope').level === 0 && live.meter('nope').reduction === null, 'an unknown meter id is silent');
    ok(live.transport.play() === true && live.transport.playing && lev.play === 1, "transport.play() emits 'play'");
    var s0 = live.engine();
    live.editor().setTrackParam('bass', 'cutoff', 300);
    ok(live.commit() === true && live.engine() !== s0 && live.transport.playing && lev.stop === 0 && lev.play === 1, 'a rebuild while playing keeps playing without stop / play events');
    ok(live.getParam('bass.cutoff') === 300 && live.meter('track:kick').level > 0, 'meters reattach after a rebuild');
    live.transport.pause();
    ok(!live.transport.playing && lev.stop === 1, "transport.pause() emits 'stop'");
    live.dispose();
    var st = 0; s0 = H.create(); s0.start().then(function (v) { st = v; });
    return Promise.resolve().then(function () { ok(s0.started() === false, 'start() without any AudioContext resolves false and stays dry'); });
  });
})();

// ------------------------------------------------------------------ 6. sampler: audio map, sampler tracks, Host audio (A1, wave 2)
// SongDoc carries doc.audio (references, never bytes) and sampler tracks; the Host builds samplers with its getBuffer,
// loads audio (fake decodeAudioData), relinks missing files, and Project.open reloads what the shell can read.
function section6() {
  console.log('6. sampler: audio map, sampler tracks, Host audio');
  var sb = sandbox(); load(sb); loadHost(sb);
  var H = sb.Host, P = sb.Project, SDoc = sb.SongDoc;
  var made = [], origCreate = sb.Synths.create;
  sb.Synths.create = function (ctx, type, opts) { if (type === 'sampler') made.push(opts); return origCreate.apply(this, arguments); };
  var hasSampler = origCreate(null, 'sampler').type === 'sampler';
  function lastGetBuffer() { for (var i = made.length - 1; i >= 0; i--) if (made[i] && typeof made[i].getBuffer === 'function') return made[i].getBuffer; return null; }

  // 6a. the document
  var json0 = SDoc.save(sb.Song.document());
  ok(json0.indexOf('"audio"') < 0, 'a song without samples saves no audio map (files stay as before)');
  var ed = SDoc.createEditor(SDoc.load(json0));
  var t = ed.addTrack({ name: 'chop', type: 'sampler', gain: 0.7, params: { buffer: 'vox_chop', pitch: 2 }, variants: { A: 'x...x...' } });
  ok(t && t.type === 'sampler' && t.inst === 'sampler' && t.kind === 'drum' && t.params.buffer === 'vox_chop' && t.variants.A.cells[4].vel === 0.85 && ed.doc.tracks.length === 14, 'ed.addTrack adds a sampler track (type and inst sampler, variants parsed)');
  ok(ed.addTrack({ name: 'chop', inst: 'kick' }) === null && ed.addTrack({}) === null, 'addTrack refuses a duplicate or unnamed track');
  ed.setPlay('mainA', 'chop', 'A');
  ed.doc.audio = {
    vox_chop: { name: 'Vox Chop.wav', src: '/samples/Vox Chop.wav', duration: 1.5, sampleRate: 48000, channels: 2, bytes: [1, 2, 3], data: 'AAAA' },
    kick_loop: { name: 'kick loop.wav', src: 'kick loop.wav', duration: 2, sampleRate: 44100, channels: 1 }
  };
  var js = SDoc.save(ed.doc), d2 = SDoc.load(js);
  ok(js.indexOf('bytes') < 0 && js.indexOf('AAAA') < 0, 'save keeps audio references only, never bytes');
  ok(JSON.stringify(d2.audio.vox_chop) === JSON.stringify({ name: 'Vox Chop.wav', src: '/samples/Vox Chop.wav', duration: 1.5, sampleRate: 48000, channels: 2 }) && d2.audio.kick_loop.channels === 1, 'the audio map round-trips {name, src, duration, sampleRate, channels}');
  var ct = d2.tracks[13];
  ok(ct.name === 'chop' && ct.type === 'sampler' && ct.inst === 'sampler' && ct.params.buffer === 'vox_chop' && ct.params.pitch === 2 && ct.gain === 0.7 && d2.sections[3].play.chop === 'A', 'the sampler track round-trips');
  ok(SDoc.save(d2) === js && SDoc.save(P.parse(P.serialize(d2))) === js, 'save/load and Project serialize/parse are stable with an audio map and a sampler track');
  var leg = SDoc.toLegacy(d2), d3 = SDoc.fromLegacy(leg);
  ok(leg.audio.vox_chop.name === 'Vox Chop.wav' && leg.tracks[13].type === 'sampler' && JSON.stringify(d3.audio) === JSON.stringify(d2.audio) && d3.tracks[13].type === 'sampler' && JSON.stringify(d3.tracks[13].variants) === JSON.stringify(d2.tracks[13].variants), 'toLegacy / fromLegacy keep the audio map and the sampler');
  var d4 = SDoc.load({ v: 1, tracks: [{ name: 's', inst: 'sampler', variants: {} }], sections: [], audio: 'nonsense' });
  ok(d4.tracks[0].type === 'sampler' && d4.tracks[0].params.buffer === '' && JSON.stringify(d4.audio) === '{}', "inst 'sampler' alone marks a sampler (buffer ''); a bad audio map loads empty");
  ok(ed.removeTrack('chop') && !ed.track('chop') && ed.section('mainA').play.chop === undefined && ed.removeTrack('chop') === false && ed.undo() && ed.track('chop') && ed.section('mainA').play.chop === 'A', 'ed.removeTrack removes the track and its references; undo brings it back');
  var e5 = SDoc.createEditor(SDoc.load(json0));
  e5.setSectionParam('intro', 'clap.level', 0.5); e5.removeTrack('clap');
  ok(!e5.section('intro').set['clap.level'] && !e5.section('build').ramp.some(function (r) { return r.param.indexOf('clap.') === 0; }) && e5.section('mainA').play.clap === undefined, 'removeTrack also clears its section set / ramp paths');

  // 6b. a Host with no AudioContext (Node) on a document with samples
  var host = H.create({ doc: d2 }), aev = [];
  host.on('audio', function (e) { aev.push(e.id + ':' + e.status); });
  var dv = host.device('track:chop');
  ok(host.devices().length === 52 && dv && dv.kind === 'instrument' && dv.family === 'drums' && dv.pathPrefix === 'chop' && host.device('track:chop:sc') && host.device('track:chop:channel'), 'a sampler track is a device like any other (52 devices, family drums)');
  ok(dv.type === (hasSampler ? 'sampler' : 'unknown') && (!hasSampler || (dv.spec.buffer && dv.spec.pitch && host.getParam('chop.buffer') === 'vox_chop' && host.getParam('chop.pitch') === 2)), 'the sampler instrument and its params (' + dv.type + ')');
  var gb = lastGetBuffer();
  ok(made.length >= 1 && typeof gb === 'function' && gb('vox_chop') === null && host.buffer('vox_chop') === null, 'every sampler the Host builds gets getBuffer; nothing is loaded without audio');
  var au = host.audio();
  ok(au.length === 2 && au.every(function (a) { return a.missing && !a.loaded; }) && au[0].usedBy.join() === 'chop' && au[1].usedBy.length === 0, 'host.audio() lists the document entries as missing, with the tracks that use them');
  var hs = host.engine(), h0 = hs.hits().chop; hs.scheduleAll(0, null, 0);
  ok(hs.hits().chop - h0 === 64, 'the sampler track schedules like any track (64 hits in mainA), silent while its file is missing');
  return host.audioReady().then(function (r) {
    ok(r.missing.join() === 'vox_chop,kick_loop' && r.loaded.length === 0 && aev.join() === 'vox_chop:missing,kick_loop:missing', "without a decoder every entry is missing and an 'audio' event says so; nothing throws");
    return host.loadAudio(new ArrayBuffer(8)).then(function () { return 'loaded'; }, function (e) { return e.message; });
  }).then(function (msg) {
    ok(/no AudioContext/.test(msg), 'loadAudio rejects cleanly without any AudioContext');
    ok(H.create().devices().length === 49 && H.create({ doc: d2 }).tracks().length === 14, 'Host.create still works with no audio in Node');

    // 6c. a Host on the fake context: load, relink, URLs, blobs, bad data, unload, addSampler
    var ctx = new FakeContext(48000), decoded = [], srcs = [];
    var od = ctx.decodeAudioData; ctx.decodeAudioData = function (ab, a, b) { decoded.push(ab); return od.call(this, ab, a, b); };
    var ocb = ctx.createBufferSource; ctx.createBufferSource = function () { var n = ocb.call(this); srcs.push(n); return n; };
    var lh = H.create({ context: ctx, doc: d2 }), lev = [];
    lh.on('audio', function (e) { lev.push(e.id + ':' + e.status); });
    sb.fetch = function (url) {
      if (/missing/.test(url)) return Promise.resolve({ ok: false, status: 404 });
      return Promise.resolve({ ok: true, status: 200, arrayBuffer: function () { return Promise.resolve(new ArrayBuffer(960)); } });
    };
    var view = new Uint8Array(4800), raw = new ArrayBuffer(480);
    return lh.start().then(function (started) {
      ok(started === true && lh.started(), 'the fake-context Host starts');
      return lh.loadAudio(view.subarray(0, 4800), { name: 'Vox Chop.wav', src: '/samples/Vox Chop.wav' });
    }).then(function (id) {
      var a = lh.document().audio[id], g = lastGetBuffer();
      ok(id === 'vox_chop' && Math.abs(a.duration - 0.1) < 1e-9 && a.sampleRate === 48000 && a.channels === 2 && a.src === '/samples/Vox Chop.wav', 'loadAudio decodes, relinks the missing entry with the same file name, writes doc.audio (' + id + ')');
      ok(g && g('vox_chop') === lh.buffer('vox_chop') && lh.buffer('vox_chop').length === 4800 && lev.indexOf('vox_chop:loaded') >= 0, "getBuffer resolves the decoded buffer; 'audio' loaded event");
      var before = srcs.length; lh.engine().scheduleAll(40, 41, 0);
      var vox = srcs.slice(before).filter(function (n) { return n.buffer === lh.buffer('vox_chop'); }).length;
      ok(!hasSampler || vox === 2, 'the sampler plays the loaded buffer (' + (hasSampler ? vox + ' voices in one bar of mainA' : 'no sampler instrument yet') + ')');
      return Promise.all([
        lh.loadAudio({ name: 'Snare.wav', arrayBuffer: function () { return Promise.resolve(new ArrayBuffer(96)); } }),
        lh.loadAudio({ name: 'Snare.wav', arrayBuffer: function () { return Promise.resolve(new ArrayBuffer(96)); } }),
        lh.loadAudio('https://samples.test/a/Hat%20One.wav'),
        lh.loadAudio(raw),
        lh.loadAudio(new Uint8Array([255, 0, 0, 0])).then(function () { return 'ok'; }, function (e) { return e.message; }),
        lh.loadAudio('https://samples.test/missing.wav').then(function () { return 'ok'; }, function (e) { return e.message; }),
        lh.loadAudio(42).then(function () { return 'ok'; }, function (e) { return e.message; })
      ]);
    }).then(function (r) {
      var A = lh.document().audio;
      ok(r[0] === 'snare' && r[1] === 'snare_2' && r[2] === 'hat_one' && A.hat_one.src === 'https://samples.test/a/Hat%20One.wav' && A.hat_one.name === 'Hat One.wav', 'Blob-like and URL sources; ids from file names, unique (' + r.slice(0, 4).join(', ') + ')');
      ok(r[3] === 'audio' && decoded.indexOf(raw) < 0 && raw.byteLength === 480, 'an ArrayBuffer is copied before decoding (the caller keeps it)');
      ok(/could not decode/.test(r[4]) && /could not load/.test(r[5]) && /unsupported/.test(r[6]) && Object.keys(A).length === 6, 'bad data, a 404 and an unsupported source reject without touching the document');
      ok(lh.unloadAudio('snare_2') && !A.snare_2 && lh.buffer('snare_2') === null && lh.unloadAudio('snare_2') === false, 'unloadAudio drops an unused file from the table and the document');
      ok(lh.unloadAudio('vox_chop') && A.vox_chop && lh.buffer('vox_chop') === null && lh.audio().filter(function (x) { return x.id === 'vox_chop'; })[0].missing === true, 'a file a track still uses stays in the document as missing');
      return lh.addSampler({ name: 'Clap Stack.wav', arrayBuffer: function () { return Promise.resolve(new ArrayBuffer(48)); } }, { family: 'fx' });
    }).then(function (name) {
      var d = lh.device('track:' + name);
      ok(name === 'clap_stack' && d && d.family === 'fx' && lh.editor().track(name).params.buffer === 'clap_stack' && lh.editor().track(name).type === 'sampler' && lastGetBuffer()('clap_stack') === lh.buffer('clap_stack'), 'addSampler loads a file, adds a sampler track and rebuilds with getBuffer (' + name + ')');
      return lh.loadAudio(view, { name: 'Vox Chop.wav', src: '/samples/Vox Chop.wav' });
    }).then(function () {
      // 6d. Project.open with a shell and a host: readable files reload, the rest are missing; nothing throws
      var json = P.serialize(lh.document()), reads = [];
      var shell = {
        openFile: function () { return Promise.resolve({ name: 'p.havantechno.json', path: '/songs/p.havantechno.json', text: json }); },
        readFile: function (p, o) { reads.push(p + '|' + (o && o.base)); return Promise.resolve(p === '/samples/Vox Chop.wav' ? new ArrayBuffer(4800) : null); }
      };
      var h3 = H.create({ context: new FakeContext(48000) }), ev3 = [];
      h3.on('audio', function (e) { ev3.push(e.id + ':' + e.status); });
      return h3.start().then(function () { return P.open({ shell: shell, host: h3 }); }).then(function (doc) {
        var st = {}; h3.audio().forEach(function (a) { st[a.id] = a.loaded ? 'loaded' : 'missing'; });
        ok(doc === h3.document() && doc.tracks.length === 15 && Object.keys(doc.audio).length === 6, 'Project.open({shell, host}) loads the song into the Host');
        ok(st.vox_chop === 'loaded' && st.hat_one === 'loaded' && st.kick_loop === 'missing' && st.snare === 'missing' && st.clap_stack === 'missing', 'readable paths and URLs reload, the rest are missing (' + JSON.stringify(st) + ')');
        ok(reads.indexOf('/samples/Vox Chop.wav|/songs') >= 0 && reads.indexOf('kick loop.wav|/songs') >= 0 && reads.every(function (x) { return x.indexOf('https:') < 0; }), 'paths go through HavantechnoShell.readFile with the project folder as base; URLs do not');
        ok(ev3.indexOf('kick_loop:missing') >= 0 && ev3.indexOf('vox_chop:loaded') >= 0 && h3.buffer('clap_stack') === null && h3.devices().length === 55, "'audio' events report each file; the missing ones leave their tracks silent");
        return P.open({ shell: shell }).then(function (bare) {
          ok(bare && bare.tracks.length === 15 && bare !== h3.document(), 'Project.open without a host still resolves the parsed document');
          lh.dispose(); h3.dispose();
        });
      });
    });
  });
}

section5.then(section6).then(function () {
  console.log(fails ? 'FAILED: ' + fails + ' of ' + checks + ' checks' : 'OK: ' + checks + ' checks passed');
  process.exit(fails ? 1 : 0);
}, function (e) {
  console.log('  FAIL section 5 threw: ' + (e && e.stack));
  process.exit(1);
});
