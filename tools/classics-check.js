#!/usr/bin/env node
/* tools/classics-check.js - Node check for app/engine/worklets.js, app/engine/classics.js and
 * app/engine/worklets/classics-processor.js (Patch Crew, P5).
 * Run: node tools/classics-check.js     Prints "OK: N checks passed" and exits 0 on success.
 *
 * 1. module, types, specs (the frozen names, rows, basis)       2. no AudioContext
 * 3. Worklets.load on a context without audioWorklet (fallback) 4. the FALLBACK path on the fake context
 * 5. the worklet path with a stub AudioWorkletNode: the event planner's automation (gate, trig, slide, accent, legato,
 *    locks, scheduled sets, panic)                              6. the processors run in Node (stubbed global scope)
 * 7. hooks: Synths.create fallback line, Host.FAMILY
 * The fake AudioContext is taken from app/engine/selfcheck.js (one source of truth), as tools/drums-check.js does.
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
var bad = [];
['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime'].forEach(function (m) {
  var orig = F.Param.prototype[m];
  F.Param.prototype[m] = function (v, t, tc) {
    if (!isFinite(v) || !isFinite(t) || (m === 'setTargetAtTime' && !(tc > 0))) bad.push(m + '(' + v + ',' + t + ',' + tc + ')');
    var r = orig.apply(this, arguments);
    if (m === 'setTargetAtTime') this.calls[this.calls.length - 1][3] = tc;
    return r;
  };
});
// recording context
function RecCtx(sr) { F.FakeContext.call(this, sr || 44100); this.nodes = []; }
RecCtx.prototype = Object.create(F.FakeContext.prototype);
['createGain', 'createOscillator', 'createBiquadFilter'].forEach(function (m) {
  RecCtx.prototype[m] = function () { var n = F.FakeContext.prototype[m].call(this); this.nodes.push(n); return n; };
});
function count(ctx, type) { return ctx.nodes.filter(function (n) { return n.type_ === type; }).length; }

// ------------------------------------------------------------------ stub AudioWorklet (for the worklet path)
// An AudioParam that keeps a timeline of setValueAtTime events and honours cancelScheduledValues, so the check can read
// the value a parameter has at any time.
function TLParam(v) { this.value = v; this.ev = []; this.calls = []; }
TLParam.prototype.setValueAtTime = function (v, t) {
  if (!isFinite(v) || !isFinite(t)) bad.push('TL setValueAtTime(' + v + ',' + t + ')');
  this.calls.push(['set', v, t]); this.ev.push([t, v]); this.ev.sort(function (a, b) { return a[0] - b[0]; });
};
TLParam.prototype.setTargetAtTime = function (v, t, tc) { this.calls.push(['target', v, t, tc]); this.ev.push([t, v]); this.ev.sort(function (a, b) { return a[0] - b[0]; }); };
TLParam.prototype.linearRampToValueAtTime = function (v, t) { this.calls.push(['lin', v, t]); this.ev.push([t, v]); };
TLParam.prototype.exponentialRampToValueAtTime = function (v, t) { this.calls.push(['exp', v, t]); this.ev.push([t, v]); };
TLParam.prototype.cancelScheduledValues = function (t) { this.calls.push(['cancel', t]); this.ev = this.ev.filter(function (e) { return e[0] < t; }); };
TLParam.prototype.at = function (t) { var v = this.value; for (var i = 0; i < this.ev.length; i++) if (this.ev[i][0] <= t) v = this.ev[i][1]; return v; };
TLParam.prototype.sets = function () { return this.ev.slice(); };

function sandbox(withWorklet) {
  var sb = { console: { log: console.log, warn: function (m) { sb._warns.push(String(m)); } }, _warns: [], Promise: Promise, Float32Array: Float32Array, WeakMap: WeakMap, Math: Math };
  sb.window = sb; sb.globalThis = sb;
  if (withWorklet) {
    sb.AudioWorkletNode = function (ctx, name, opts) {
      F.Node.call(this, ctx, 'worklet:' + name);
      var self = this, desc = PROCS[name].parameterDescriptors;
      this.name = name; this.opts = opts; this.messages = [];
      this.port = { postMessage: function (m) { self.messages.push(m); } };
      var map = new Map();
      desc.forEach(function (d) { map.set(d.name, new TLParam(d.defaultValue)); });
      this.parameters = map;
      ctx.worklets.push(this);
    };
    sb.AudioWorkletNode.prototype = Object.create(F.Node.prototype);
  }
  return vm.createContext(sb);
}
function WCtx(sr) {
  RecCtx.call(this, sr); this.worklets = []; this.modules = [];
  var self = this;
  this.audioWorklet = { addModule: function (u) { self.modules.push(u); return Promise.resolve(); } };
}
WCtx.prototype = Object.create(RecCtx.prototype);

function load(sb, files) {
  (files || ['core', 'synths', 'drums', 'worklets', 'classics']).forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(ENGINE, f + '.js'), 'utf8'), sb, { filename: f + '.js' });
  });
  return sb;
}

// the processors, run in Node with a stubbed AudioWorkletGlobalScope (new Function keeps global lookups fast)
var PROC_SRC = fs.readFileSync(path.join(ENGINE, 'worklets', 'classics-processor.js'), 'utf8');
function loadProcs(sr) {
  var reg = {};
  var AWP = function () { this.port = { onmessage: null }; };
  (new Function('sampleRate', 'registerProcessor', 'AudioWorkletProcessor', PROC_SRC))(sr || 44100, function (n, c) { reg[n] = c; }, AWP);
  return reg;
}
var PROCS = loadProcs(44100);

var FROZEN = {
  tb303: ['tune', 'wave', 'cutoff', 'resonance', 'envMod', 'decay', 'accent', 'slideTime', 'level'],
  modeld: ['tune', 'glide', 'glideOn', 'modMix', 'oscMod', 'filterMod', 'osc1Range', 'osc1Wave', 'osc2Range', 'osc2Wave', 'osc2Detune',
           'osc3Range', 'osc3Wave', 'osc3Detune', 'osc3Keys', 'mixOsc1', 'mixOsc2', 'mixOsc3', 'mixNoise', 'noiseType', 'mixFeedback',
           'cutoff', 'emphasis', 'contour', 'keyTrack1', 'keyTrack2', 'fAttack', 'fDecay', 'fSustain', 'attack', 'decay', 'sustain',
           'decaySwitch', 'level']
};
var BASES = { manual: 1, paper: 1, source: 1, prior: 1 };

(async function main() {
  // ------------------------------------------------------------------ 1. module, types, specs
  console.log('1. module, types and specs');
  var sb = load(sandbox(false)), C = sb.Classics;
  ok(C && typeof C.create === 'function' && typeof C.has === 'function' && typeof C.types === 'function' && typeof C.spec === 'function', 'global Classics with create, has, types, spec');
  ok(JSON.stringify(C.types()) === '["tb303","modeld"]' && C.has('tb303') && C.has('modeld') && !C.has('juno') && C.spec('nope') === null, 'types tb303, modeld; has(); spec(unknown) null');
  ['tb303', 'modeld'].forEach(function (t) {
    var s = C.spec(t), names = Object.keys(s);
    ok(JSON.stringify(names.slice().sort()) === JSON.stringify(FROZEN[t].slice().sort()), t + ' parameter names are exactly the frozen list (' + names.length + ')');
    var good = true;
    names.forEach(function (k) {
      var e = s[k];
      if (typeof e.value === 'string') { if (!(e.options && e.options.indexOf(e.value) >= 0)) { good = false; console.log('   bad enum ' + t + '.' + k); } }
      else if (!(typeof e.min === 'number' && typeof e.max === 'number' && e.min < e.max && e.value >= e.min && e.value <= e.max && typeof e.unit === 'string')) { good = false; console.log('   bad row ' + t + '.' + k); }
      if (!BASES[e.basis] || !e.label) { good = false; console.log('   no basis/label ' + t + '.' + k); }
    });
    ok(good, t + ' rows {min, max, value, unit} in range (enumerations with options), every row has a basis and a label');
    var desc = PROCS[C.processor(t)].parameterDescriptors.map(function (d) { return d.name; });
    ok(names.every(function (k) { return k === 'level' || desc.indexOf(k) >= 0; }), t + ' every knob but level is a processor AudioParam');
    ok(['pitch', 'gate', 'trig', 'slide', 'vel'].every(function (k) { return desc.indexOf(k) >= 0; }), t + ' processor has the event params pitch, gate, trig, slide, vel');
  });
  ok(C.spec('tb303').cutoff.min === 314 && C.spec('tb303').cutoff.max === 2394 && C.spec('tb303').decay.unit === 'ms' && C.spec('tb303').slideTime.value === 60, '303 ranges from P1 (cutoff 314-2394 Hz, decay ms, slide 60 ms)');
  ok(C.numeric('modeld', 'osc1Range', '8') === 3 && C.numeric('modeld', 'osc3Wave', 'revsaw') === 1 && C.numeric('modeld', 'osc1Wave', 'bogus') === 2 && C.numeric('tb303', 'wave', 'square') === 1, 'enumerations map to the processor indexes; unknown strings fall back to the default');

  // ------------------------------------------------------------------ 2. no AudioContext
  console.log('2. without an AudioContext');
  ['tb303', 'modeld'].forEach(function (t) {
    var i = C.create(null, t), threw = false;
    try { i.trigger(0, { midi: 40, dur: 0.1, slide: true, accent: true }); i.set('level', 0.5); i.set('cutoff', 500); i.panic(); i.dispose(); } catch (e) { threw = true; }
    ok(!threw && i.params.level === 0.5 && i.out === null && i.engine === 'none', t + ' works without a context (silent, same API)');
  });
  var u = C.create(null, 'nope');
  ok(u.type === 'unknown' && sb._warns.some(function (w) { return /unknown instrument/.test(w); }), 'unknown type warns and gives a silent instrument');

  // ------------------------------------------------------------------ 3. Worklets on a context without audioWorklet
  console.log('3. Worklets without audioWorklet');
  var fctx = new RecCtx();
  var r = await sb.Worklets.load(fctx);
  ok(r === false && sb.Worklets.ready(fctx) === false && sb.Worklets.node(fctx, 'hvt-tb303') === null, 'load resolves false, ready false, node null');
  ok(sb.Worklets.load(fctx) === sb.Worklets.load(fctx), 'load is cached per context');
  ok(sb._warns.filter(function (w) { return /Worklets/.test(w); }).length === 1, 'the fallback is reported once in the console');
  var threwNull = false; try { await sb.Worklets.load(null); sb.Worklets.ready(null); sb.Worklets.node(null, 'x'); } catch (e) { threwNull = true; }
  ok(!threwNull, 'Worklets never throws on a null context');

  // ------------------------------------------------------------------ 4. FALLBACK path on the fake context
  console.log('4. fallback path (fake context, plain nodes)');
  (function () {
    var ctx = new RecCtx(), i303 = C.create(ctx, 'tb303', { cutoff: 600 });
    ok(i303.engine === 'fallback' && i303.out && i303.params.cutoff === 600, 'tb303 builds the fallback on a context without worklets');
    ok(sb._warns.some(function (w) { return /fallback/.test(w) && /Classics/.test(w); }), 'Classics reports the fallback in the console');
    ok(i303.set('cutoff', 99999) && i303.params.cutoff === 2394 && i303.set('resonance', -1) && i303.params.resonance === 0 && i303.set('nope', 1) === false && i303.set('cutoff', 'x') === false, 'clamping and rejection');
    ok(i303.set('wave', 'square') && i303.params.wave === 'square', 'wave takes a string');
    i303.set('cutoff', 600);
    var st = 0.125, d = st * 0.95 - 0.01;
    i303.trigger(1, { midi: 36, dur: d, step: 0 });
    var osc1 = count(ctx, 'osc');
    i303.trigger(1 + st, { midi: 38, dur: d, step: 1, slide: true });
    var osc2 = count(ctx, 'osc');
    i303.trigger(1 + 2 * st, { midi: 48, dur: d, step: 2, accent: true });
    var osc3 = count(ctx, 'osc'), o3 = ctx.nodes.filter(function (n) { return n.type_ === 'osc'; })[osc2 - 1];
    ok(osc1 === 1 && osc2 === 2 && osc3 === 2, 'a note slid into keeps the running voice (no new oscillator): ' + [osc1, osc2, osc3]);
    ok(o3.frequency.calls.some(function (c) { return c[0] === 'setTargetAtTime' && near(c[1], 130.81, 0.1) && near(c[2], 1 + 2 * st, 1e-9) && near(c[3], 0.012, 1e-9); }), 'the slide glides the oscillator to the new pitch with tau 0.2 x slideTime');
    var g1 = ctx.nodes.filter(function (n) { return n.type_ === 'gain'; });
    ok(i303._live.length >= 2, 'notes are registered in _live (' + i303._live.length + ')');
    // accent: the accented note's level ramp and filter peak are higher (fresh instrument: two single notes)
    var c2 = new RecCtx(), j = C.create(c2, 'tb303', {});
    j.trigger(1, { midi: 36, dur: d, step: 0 }); j.trigger(1 + st, { midi: 36, dur: d, step: 1, accent: true });
    var gs = c2.nodes.filter(function (n) { return n.type_ === 'gain'; }).slice(2), bq = c2.nodes.filter(function (n) { return n.type_ === 'biquad'; });
    var lv = gs.map(function (g) { return g.gain.calls.filter(function (c) { return c[0] === 'linearRampToValueAtTime'; })[0][1]; });
    var fpk = [bq[0], bq[2]].map(function (b) { return b.frequency.calls[0][1]; });
    ok(lv[1] > lv[0] * 1.5 && fpk[1] > fpk[0], 'accent raises the level and the filter peak (' + lv.map(function (x) { return x.toFixed(3); }) + ' / ' + fpk.map(Math.round) + ')');
    j.panic();
    ok(j._live.length === 0, 'panic clears _live');
    c2.flush();
    ok(j._live.length === 0, '_live stays empty after the sources end');
    // a normal note's gate: half a step; the slid note holds to the next trigger
    var c3 = new RecCtx(), k3 = C.create(c3, 'tb303', {});
    k3.trigger(1, { midi: 36, dur: d, step: 0 }); k3.trigger(1 + st, { midi: 36, dur: d, step: 1 });
    var g3 = c3.nodes.filter(function (n) { return n.type_ === 'gain'; })[2];
    var rel = g3.gain.calls.filter(function (c) { return c[0] === 'setTargetAtTime' && c[1] === 0; })[0];
    ok(rel && near(rel[2], 1 + 0.5 * st, 1e-6), 'a one-step note is gated for half a step (release at ' + (rel && (rel[2] - 1).toFixed(4)) + ' s)');

    var md = C.create(ctx, 'modeld', { osc1Wave: 'square', osc3Range: 'lo' });
    ok(md.engine === 'fallback' && md.params.osc1Wave === 'square' && md.params.osc3Range === 'lo', 'modeld builds the fallback; enumerations stored');
    var n0 = count(ctx, 'osc');
    md.trigger(2, { midi: 48, dur: 0.3, step: 0 });
    var n1 = count(ctx, 'osc');
    md.trigger(2.2, { midi: 50, dur: 0.3, step: 1 });                 // overlaps the first note: legato
    var n2 = count(ctx, 'osc');
    md.trigger(3, { midi: 52, dur: 0.1, step: 2 });                   // after a gap: retrigger
    var n3 = count(ctx, 'osc');
    ok(n1 - n0 === 3 && n2 === n1 && n3 - n2 === 3, 'Model D: three oscillators per voice; an overlapping note is legato (no new voice), a gap retriggers');
    md.panic();
    ok(md._live.length === 0, 'Model D panic clears _live');
    ok(bad.length === 0, 'no non-finite automation in the fallback (' + bad.slice(0, 3).join('; ') + ')');
  })();

  // ------------------------------------------------------------------ 5. worklet path with a stub AudioWorkletNode
  console.log('5. worklet path (stub AudioWorkletNode): the event planner');
  var sw = load(sandbox(true)), CW = sw.Classics, ctx = new WCtx();
  ok(CW.create(ctx, 'tb303').engine === 'fallback', 'before Worklets.load resolves, instruments use the fallback');
  var loaded = await sw.Worklets.load(ctx);
  ok(loaded === true && sw.Worklets.ready(ctx) && ctx.modules.length === 1 && /worklets\/classics-processor\.js$/.test(ctx.modules[0]), 'load adds engine/worklets/classics-processor.js once; ready true');
  var t = CW.create(ctx, 'tb303', { cutoff: 700, wave: 'square' }), node = ctx.worklets[ctx.worklets.length - 1], W = {};
  node.parameters.forEach(function (p, k) { W[k] = p; });
  ok(t.engine === 'worklet' && node.name === 'hvt-tb303' && node.connections.indexOf(t.pre) >= 0, 'tb303 runs on one AudioWorkletNode connected to the instrument');
  ok(W.cutoff.value === 700 && W.wave.value === 1, 'initial knob values reach the AudioParams (enumerations as indexes)');
  var st = 0.125, d = st * 0.95 - 0.01, T0 = 1;
  t.trigger(T0, { midi: 36, dur: d, step: 0 });
  t.trigger(T0 + st, { midi: 40, dur: d, step: 1, slide: true });
  t.trigger(T0 + 2 * st, { midi: 48, dur: d, step: 2, accent: true });
  t.trigger(T0 + 3 * st, { midi: 36, dur: 3 * st * 0.95 - 0.01, step: 3 });
  ok(W.trig.at(T0) === 1 && W.trig.at(T0 + st) === 2 && W.trig.at(T0 + 2 * st) === 3 && W.trig.at(T0 + 3 * st) === 4, 'every note writes the next trig value at its time');
  ok(W.pitch.at(T0) === 36 && W.pitch.at(T0 + st) === 40 && W.pitch.at(T0 + 2 * st) === 48, 'pitch written at the note times');
  ok(W.gate.at(T0) === 1 && W.gate.at(T0 + 0.5 * st - 1e-4) === 1 && W.gate.at(T0 + 0.5 * st + 1e-4) === 0, 'a normal note is gated for half a step');
  ok(W.gate.at(T0 + st + 0.5 * st + 1e-3) === 1 && W.gate.at(T0 + 2 * st - 1e-4) === 1, 'a slide note holds its gate into the next note');
  ok(W.slide.at(T0 + st) === 0 && W.slide.at(T0 + 2 * st) === 1 && W.slide.at(T0 + 3 * st) === 0, 'the note after a slide is written legato (slide 1); the others 0');
  ok(W.acc.at(T0 + 2 * st) === 1 && W.acc.at(T0 + st) === 0 && W.acc.at(T0 + 3 * st) === 0, 'accent latched per note');
  ok(W.gate.at(T0 + 3 * st + 2.5 * st - 1e-3) === 1 && W.gate.at(T0 + 3 * st + 2.5 * st + 1e-3) === 0, 'a three-step tie holds its gate for 2.5 steps');
  // safety release: a slide with no following note
  var t2 = CW.create(ctx, 'tb303'), n2 = ctx.worklets[ctx.worklets.length - 1], W2 = {};
  n2.parameters.forEach(function (p, k) { W2[k] = p; });
  t2.trigger(1, { midi: 36, dur: d, step: 0 }); t2.trigger(1 + st, { midi: 36, dur: d, step: 1, slide: true });
  ok(W2.gate.at(1 + 3 * st - 1e-4) === 1 && W2.gate.at(1 + 3 * st + 1e-4) === 0, 'a slide with no next note releases two steps after it starts (P1 ruling)');
  // scheduled knob writes, locks
  t.set('cutoff', 900, { at: 5 });
  ok(W.cutoff.calls.some(function (c) { return c[0] === 'set' && c[1] === 900 && c[2] === 5; }), 'set(name, v, {at}) is a setValueAtTime at that time');
  t.set('resonance', 0.3);
  ok(W.resonance.calls.some(function (c) { return c[0] === 'target' && c[1] === 0.3; }), 'a live knob write glides (setTargetAtTime)');
  t.params.cutoff = 400;                                            // a lock, as the sequencer applies it around trigger()
  t.trigger(6, { midi: 36, dur: d, step: 40 });
  t.params.cutoff = 900;
  t.trigger(6 + st, { midi: 36, dur: d, step: 41 });
  ok(W.cutoff.at(6) === 400 && W.cutoff.at(6 + st) === 900, 'a parameter lock is written at its note and restored at the next');
  ok(t.set('wave', 'saw') && W.wave.calls.some(function (c) { return c[0] === 'set' && c[1] === 0; }), 'an enumeration write is an immediate step');
  // panic
  ok(t._live.length > 0, 'notes are in _live');
  ctx.currentTime = 6.05;
  t.panic();
  ok(t._live.length === 0 && W.gate.at(6.06) === 0 && W.gate.calls.some(function (c) { return c[0] === 'cancel' && c[1] === 6.05; }), 'panic clears _live, cancels pending gates and closes the gate now');
  ctx.currentTime = 0;
  t.dispose();
  ok(node.messages.indexOf('stop') >= 0 && node.connections.length === 0, 'dispose stops the processor and disconnects the node');

  // Model D: single triggering, last-note priority, pitch return, slide
  var m = CW.create(ctx, 'modeld', { osc3Wave: 'revsaw', noiseType: 'pink' }), mn = ctx.worklets[ctx.worklets.length - 1], M = {};
  mn.parameters.forEach(function (p, k) { M[k] = p; });
  ok(m.engine === 'worklet' && mn.name === 'hvt-modeld' && M.osc3Wave.value === 1 && M.noiseType.value === 1 && mn.opts.processorOptions.seed > 0, 'modeld runs on its node; enumerations as indexes; a fixed noise seed');
  m.trigger(1, { midi: 48, dur: 0.5, step: 0 });
  m.trigger(1.25, { midi: 55, dur: 0.1, step: 2 });                  // inside the first note: legato, returns to 48 at 1.35
  m.trigger(2, { midi: 50, dur: 0.1, step: 8 });                     // after a gap: retrigger
  ok(M.slide.at(1) === 0 && M.slide.at(1.25) === 1 && M.slide.at(2) === 0, 'an overlapping note is legato (slide 1), a note after a gap retriggers (slide 0)');
  ok(M.pitch.at(1.3) === 55 && M.pitch.at(1.36) === 48, 'last-note priority: the newer note sounds, then the pitch returns to the held one');
  ok(M.gate.at(1.49) === 1 && M.gate.at(1.51) === 0 && M.gate.at(2.05) === 1 && M.gate.at(2.11) === 0, 'the gate falls when the last held note ends');
  ok(M.trig.at(1) === 1 && M.trig.at(1.25) === 2 && M.trig.at(2) === 3, 'trig counts every note');
  m.trigger(3, { midi: 48, dur: 0.1, step: 16, slide: true });
  m.trigger(3 + st, { midi: 52, dur: 0.1, step: 17 });
  ok(M.slide.at(3 + st) === 1 && M.gate.at(3 + st - 1e-3) === 1, 'ev.slide makes the next note legato with the gate held');
  m.panic();
  ok(m._live.length === 0, 'Model D panic clears _live');
  ok(bad.length === 0, 'no non-finite automation (' + bad.slice(0, 3).join('; ') + ')');

  // ------------------------------------------------------------------ 6. the processors in Node
  console.log('6. processors (stubbed AudioWorkletGlobalScope)');
  function run(name, seconds, events, consts) {
    var Pc = loadProcs(44100)[name], desc = Pc.parameterDescriptors, proc = new Pc({ processorOptions: { seed: 22051 } });
    var N = Math.ceil(seconds * 44100), out = new Float32Array(N), cur = {}, evs = {};
    desc.forEach(function (dd) { cur[dd.name] = (consts && dd.name in consts) ? consts[dd.name] : dd.defaultValue; evs[dd.name] = ((events || {})[dd.name] || []).slice(); });
    for (var b = 0; b < N; b += 128) {
      var P = {}, o = new Float32Array(128);
      desc.forEach(function (dd) {
        var e = evs[dd.name];
        if (!e.length || e[0][0] * 44100 >= b + 128 || dd.automationRate === 'k-rate') { while (dd.automationRate === 'k-rate' && e.length && e[0][0] * 44100 < b + 128) cur[dd.name] = e.shift()[1]; P[dd.name] = new Float32Array([cur[dd.name]]); return; }
        var a = new Float32Array(128);
        for (var q = 0; q < 128; q++) { while (e.length && e[0][0] * 44100 <= b + q) cur[dd.name] = e.shift()[1]; a[q] = cur[dd.name]; }
        P[dd.name] = a;
      });
      var alive = proc.process([], [[o]], P);
      out.set(o.subarray(0, Math.min(128, N - b)), b);
    }
    out.alive = alive; out.proc = proc;
    return out;
  }
  function peakOf(x, a, b) { var mm = 0; for (var q = a; q < b; q++) mm = Math.max(mm, Math.abs(x[q])); return mm; }
  var ev = { trig: [[0.1, 1], [0.225, 2]], gate: [[0.1, 1], [0.1625, 0], [0.225, 1], [0.2875, 0]], acc: [[0.225, 1]], pitch: [[0, 36]] };
  var a1 = run('hvt-tb303', 0.6, ev), a2 = run('hvt-tb303', 0.6, ev), same = true;
  for (var q = 0; q < a1.length; q++) if (a1[q] !== a2[q]) { same = false; break; }
  ok(a1.every(isFinite) && peakOf(a1, 0, 4410) === 0 && peakOf(a1, 4410, 9000) > 0.1, 'tb303 processor: silent before the first trig, sounds after it, finite');
  ok(same, 'tb303 processor output is identical on two runs');
  ok(peakOf(a1, 9922, 12600) > 1.8 * peakOf(a1, 4410, 9000), 'an accented note is louder (' + (peakOf(a1, 9922, 12600) / peakOf(a1, 4410, 9000)).toFixed(2) + 'x)');
  var mv = { trig: [[0.05, 1]], gate: [[0.05, 1], [0.4, 0]], pitch: [[0, 48]] };
  var b1 = run('hvt-modeld', 0.6, mv, { mixNoise: 0.4, noiseType: 1 }), b2 = run('hvt-modeld', 0.6, mv, { mixNoise: 0.4, noiseType: 1 }), same2 = true;
  for (q = 0; q < b1.length; q++) if (b1[q] !== b2[q]) { same2 = false; break; }
  ok(b1.every(isFinite) && peakOf(b1, 2205, 17000) > 0.05 && same2, 'modeld processor sounds, finite, identical on two runs (noise from a seeded generator)');
  var b3 = run('hvt-modeld', 0.6, mv, { decaySwitch: 0 });
  ok(peakOf(b3, 18500, 26460) < peakOf(b3, 2205, 17000) * 0.01 && peakOf(b1, 18500, 26460) > peakOf(b1, 2205, 17000) * 0.05, 'modeld: release 4 ms with the decay switch off, the decay time with it on');
  var s1 = run('hvt-modeld', 1.2, { trig: [[0.05, 1]], gate: [[0.05, 1]] }, { mixOsc1: 0, mixOsc2: 0, mixOsc3: 0, emphasis: 1, cutoff: 440, contour: 0, keyTrack1: 0, sustain: 1 });
  var s0 = run('hvt-modeld', 1.2, { trig: [[0.05, 1]], gate: [[0.05, 1]] }, { mixOsc1: 0, mixOsc2: 0, mixOsc3: 0, emphasis: 0.9, cutoff: 440, contour: 0, keyTrack1: 0, sustain: 1 });
  ok(peakOf(s1, 40000, 52000) > 0.05 && peakOf(s0, 40000, 52000) < 1e-4, 'the Model D ladder sings at emphasis 1 with no source and is quiet at 0.9');
  var sl = run('hvt-tb303', 0.5, { trig: [[0.05, 1], [0.175, 2]], gate: [[0.05, 1], [0.4, 0]], slide: [[0.175, 1]], pitch: [[0, 36], [0.175, 48]] }, { cutoff: 2394, envMod: 0 });
  ok(sl.proc.freq > 130 && sl.proc.freq < 131.7, 'tb303 processor glides to the slid note (' + sl.proc.freq.toFixed(2) + ' Hz)');
  var x = run('hvt-tb303', 0.05, {}); x.proc.port.onmessage({ data: 'stop' });
  ok(x.proc.process([], [[new Float32Array(128)]], (function () { var P = {}; PROCS['hvt-tb303'].parameterDescriptors.forEach(function (dd) { P[dd.name] = new Float32Array([dd.defaultValue]); }); return P; })()) === false, "the 'stop' message ends the processor");

  // ------------------------------------------------------------------ 7. hooks
  console.log('7. hooks');
  var sh = load(sandbox(false), ['core', 'synths', 'drums', 'worklets', 'classics', 'processors', 'songdoc', 'sequencer', 'song', 'host']);
  var viaSynths = sh.Synths.create(new RecCtx(), 'tb303');
  ok(viaSynths.type === 'tb303' && typeof viaSynths.trigger === 'function' && sh.Synths.create(null, 'modeld').type === 'modeld', 'Synths.create falls back to Classics for tb303 and modeld');
  ok(sh.Synths.types().indexOf('tb303') < 0, 'Synths.types() does not list the classics');
  ok(sh.Host.family('tb303') === 'bass' && sh.Host.family('modeld') === 'bass' && sh.Host.family('juno') === 'keys', 'Host.FAMILY: tb303 bass, modeld bass, juno keys');
  var host = sh.Host.create(), ed = host.editor();
  var cells = []; for (q = 0; q < 16; q++) cells.push({ note: 36 + (q % 4), acc: q === 2 || undefined, slide: q === 5 || undefined });
  ok(!!ed.addTrack({ name: 'acid', inst: 'tb303', kind: 'melody', params: { cutoff: 500 }, variants: { A: { bars: 1, cells: cells } } }), 'a tb303 track is added through the editor');
  ed.doc.sections.forEach(function (s) { ed.setPlay(s.name, 'acid', 'A'); });
  host.commit();
  var seq = host.engine(), seen = [];
  var orig = seq.tracks.acid.inst.trigger;
  seq.tracks.acid.inst.trigger = function (tt, e) { seen.push(e); return orig(tt, e); };
  seq.scheduleAll(0, 1, 0);
  ok(seen.length === 16 && seen[5].slide === true && seen[2].accent === true && seen[0].midi === 36, 'the sequencer hands the 303 midi, accent and slide (' + seen.length + ' notes)');

  console.log(fails ? 'FAILED: ' + fails + ' of ' + checks + ' checks failed' : 'OK: ' + checks + ' checks passed');
  process.exit(fails ? 1 : 0);
})().catch(function (e) { console.log('FAIL exception ' + (e && e.stack)); process.exit(1); });
