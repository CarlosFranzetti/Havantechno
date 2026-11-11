/* Havantechno app engine - classics.js
 * Global `Classics`: classic mono synths on the AudioWorklet infrastructure (Patch Crew, P5).
 *
 *   var inst = Classics.create(ctx, 'tb303', {cutoff: 600});      // or Synths.create(ctx, 'tb303') (fallback line)
 *   inst.trigger(t, {midi: 36, dur: 0.11, vel: 0.85, accent: true, slide: true, step: 4});
 *   Classics.types(); Classics.spec('modeld'); Classics.has('tb303'); inst.engine -> 'worklet' | 'fallback'
 *
 * Same instrument API as synths.js and drums.js: create(ctx, type, opts) -> {trigger, set/get, params, spec, panic,
 * dispose, out, _live}. Nothing throws, and a null context gives a silent instrument with the same API.
 * Load order: core.js, synths.js, drums.js, worklets.js, classics.js.
 *
 * Architecture (docs/research/2026-11-11-patch-crew/transcripts/log-P5.md section 1): each instrument owns one
 * AudioWorkletNode running the whole mono voice (app/engine/worklets/classics-processor.js). A note is AudioParam
 * automation at the event time on pitch, gate, trig (a counter: each note writes the next value), slide (1 = legato,
 * no envelope retrigger), acc and vel; the knobs are AudioParams. Offline renders are therefore deterministic.
 * When the context has no loaded worklet module (Worklets.ready(ctx) false: the Node checks' fake context, a failed
 * load) the instrument is built from plain nodes instead: the FALLBACK, an approximation (native oscillators, two
 * cascaded biquads for the 24 dB slope, envelopes as AudioParam ramps). Both paths share the event planner below.
 *
 * Every spec row carries `basis`: 'manual' | 'paper' | 'source' | 'prior' and a `label` naming it. 303 rows: P1
 * (transcripts/P1-303.md section 4, Open303 constants, MIT). Model D rows: P2 (transcripts/P2-modeld.md section 9).
 * Enumerated rows carry `options` (the string values a panel offers).
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var K = root.Kit;
  var setV = K.setV, lin = K.lin, val = K.val, disc = K.disc, clamp = K.clamp, target = K.target, mtof = K.mtof;

  function warn(msg) { try { if (typeof console !== 'undefined' && console.warn) console.warn('[Classics] ' + msg); } catch (e) {} }
  function P(min, max, value, unit, basis, label) {
    var o = { min: min, max: max, value: value, unit: unit || '' };
    if (basis) o.basis = basis;
    if (label) o.label = label;
    return o;
  }
  function E(value, options, basis, label) { return { value: value, options: options.slice(), basis: basis, label: label }; }
  function cancel(p, t) { try { p.cancelScheduledValues(t); } catch (e) {} }

  // ------------------------------------------------------------------ specs
  var SPEC = {};
  SPEC.tb303 = {
    tune: P(-165, 147, 0, 'ct', 'source', 'Open303VST.cpp 224: A4 400 to 480 Hz (P1)'),
    wave: E('saw', ['saw', 'square'], 'source', 'falling saw, or the tanh-shaped saw (53 % / 47 %), rosic_MipMappedWaveTable.cpp 245-289 (P1)'),
    cutoff: P(314, 2394, 1000, 'Hz', 'source', 'nominal cutoff; Open303 measured end points 313.8 and 2394.4 Hz (rosic_Open303.cpp 297-312)'),
    resonance: P(0, 1, 0.5, '', 'source', 'r = (1 - e^-3x) / (1 - e^-3), k = r kpoly (about 17 r), TeeBeeFilter.h (P1)'),
    envMod: P(0, 1, 0.5, '', 'source', 'Open303 measured env-mod scaler and offset (rosic_Open303.cpp 291-313)'),
    decay: P(200, 2000, 400, 'ms', 'source', 'time constant of the filter envelope on normal notes; accented notes use 200 ms (Open303VST.cpp 236, P1)'),
    accent: P(0, 1, 0.6, '', 'source', 'accent gain: up to +1 oct of cutoff sweep and +4 x envelope on the VCA (rosic_Open303.h 372, 380)'),
    slideTime: P(0, 200, 60, 'ms', 'source', 'glide tau = 0.2 x slideTime, exponential in Hz (Open303; the 60 ms default is prior)'),
    level: P(0, 1.5, 1, '', 'prior', 'output gain')
  };
  var RANGES = ['lo', '32', '16', '8', '4', '2'];
  var WAVES = ['tri', 'shark', 'saw', 'square', 'wide', 'narrow'];
  var WAVES3 = ['tri', 'revsaw', 'saw', 'square', 'wide', 'narrow'];
  SPEC.modeld = {
    tune: P(-100, 100, 0, 'ct', 'prior', 'master tune, all oscillators (P2)'),
    glide: P(0, 2, 0.08, 's', 'prior', 'glide RC time constant on the pitch CV (P2)'),
    glideOn: P(0, 1, 0, '', 'prior', 'glide switch (P2)'),
    modMix: P(0, 1, 0, '', 'prior', 'modulation source: 0 = oscillator 3, 1 = noise (P2)'),
    oscMod: P(0, 1, 0, '', 'prior', 'modulation to oscillators 1 and 2 pitch; fixed depth 1 st peak, no wheel (P5)'),
    filterMod: P(0, 1, 0, '', 'prior', 'modulation to the cutoff; fixed depth 1 oct peak, no wheel (P5)'),
    osc1Range: E('8', RANGES, 'prior', 'footage: lo, 32, 16, 8, 4, 2 (one octave per step; lo = -7 oct) (P2)'),
    osc1Wave: E('saw', WAVES, 'prior', 'triangle, shark-fin, saw, square, wide 33 %, narrow 20 % (P2)'),
    osc2Range: E('8', RANGES, 'prior', 'as oscillator 1 (P2)'),
    osc2Wave: E('saw', WAVES, 'prior', 'as oscillator 1 (P2)'),
    osc2Detune: P(-7, 7, 0.06, 'st', 'prior', 'frequency knob around the key (P2)'),
    osc3Range: E('8', RANGES, 'prior', 'with osc3Keys off, lo is the LFO band (P2)'),
    osc3Wave: E('saw', WAVES3, 'prior', 'reverse saw replaces the shark-fin (P2)'),
    osc3Detune: P(-7, 7, -0.06, 'st', 'prior', 'with osc3Keys off in lo: 3 x 2^(5 d / 7) Hz (P2)'),
    osc3Keys: P(0, 1, 1, '', 'prior', '1 = follows the keyboard, 0 = free-running (P2)'),
    mixOsc1: P(0, 1, 0.7, '', 'prior', 'mixer, gain v^1.5 (P2)'),
    mixOsc2: P(0, 1, 0.7, '', 'prior', 'mixer, gain v^1.5 (P2)'),
    mixOsc3: P(0, 1, 0.5, '', 'prior', 'mixer, gain v^1.5 (P2)'),
    mixNoise: P(0, 1, 0, '', 'prior', 'mixer, gain v^1.5 (P2)'),
    noiseType: E('white', ['white', 'pink'], 'prior', 'pink: three-pole filtered white (P2)'),
    mixFeedback: P(0, 1.5, 0, '', 'prior', 'output fed back into the mixer through a 4 kHz low-pass, gain 1.2 v (P2)'),
    cutoff: P(10, 20000, 1200, 'Hz', 'prior', 'cutoff at the pivot key C4 (reissue range 10 Hz to 20 kHz, P2)'),
    emphasis: P(0, 1, 0.15, '', 'prior', 'ladder feedback k = 4 e; self-oscillation at 1 (P2)'),
    contour: P(0, 1, 0.5, '', 'prior', 'filter contour amount, 4 oct x v (reissue 0 to 4 oct, P2)'),
    keyTrack1: P(0, 1, 1, '', 'prior', 'keyboard control 1: 1/3 oct per oct (P2)'),
    keyTrack2: P(0, 1, 0, '', 'prior', 'keyboard control 2: another 1/3 (P2)'),
    fAttack: P(0.001, 10, 0.005, 's', 'prior', 'filter contour attack (reissue range, P2)'),
    fDecay: P(0.004, 35, 0.35, 's', 'prior', 'filter contour decay, time to -60 dB (P2)'),
    fSustain: P(0, 1, 0.25, '', 'prior', 'filter contour sustain (P2)'),
    attack: P(0.001, 10, 0.003, 's', 'prior', 'loudness contour attack (P2)'),
    decay: P(0.004, 35, 0.5, 's', 'prior', 'loudness contour decay, time to -60 dB (P2)'),
    sustain: P(0, 1, 0.8, '', 'prior', 'loudness contour sustain (P2)'),
    decaySwitch: P(0, 1, 1, '', 'prior', '1: release = the decay times; 0: release 4 ms (P2)'),
    level: P(0, 1.5, 1, '', 'prior', 'output gain')
  };
  var ENUMS = {
    tb303: { wave: ['saw', 'square'] },
    modeld: { osc1Range: RANGES, osc2Range: RANGES, osc3Range: RANGES, osc1Wave: WAVES, osc2Wave: WAVES, osc3Wave: WAVES3,
              noiseType: ['white', 'pink'] }
  };
  var PROC = { tb303: 'hvt-tb303', modeld: 'hvt-modeld' };
  var TYPES = ['tb303', 'modeld'];

  // a parameter value as the processor reads it (enumerations by index; an unknown string falls back to the default)
  function numeric(type, name, v) {
    var en = ENUMS[type][name];
    if (!en) return Number(v);
    var i = en.indexOf(String(v));
    return i >= 0 ? i : en.indexOf(SPEC[type][name].value);
  }

  // ------------------------------------------------------------------ instrument base (as drums.js, no drive stage)
  function makeInst(ctx, type, spec, opts, build) {
    var inst = { type: type, ctx: ctx, out: null, pre: null, _live: [], engine: ctx ? 'fallback' : 'none' };
    K.defineParams(inst, spec, function (name, v, o) {
      if (!ctx) return;
      var at = (o && typeof o.at === 'number') ? o.at : ctx.currentTime;
      if (name === 'level' && inst.out) K.target(inst.out.gain, v, at, 0.01);
      if (inst.onParam) inst.onParam(name, v, o, at);
    });
    if (opts) for (var k in opts) if (opts.hasOwnProperty(k) && spec.hasOwnProperty(k)) inst.set(k, opts[k]);
    inst.trigger = function () {};
    inst.panic = function () {
      try {
        if (!ctx || !inst.out) return;
        var now = ctx.currentTime, lv = inst.params.level == null ? 1 : inst.params.level;
        K.cancel(inst.out.gain, now); setV(inst.out.gain, lv, now); lin(inst.out.gain, 0.0001, now + 0.02); setV(inst.out.gain, lv, now + 0.05);
        var live = inst._live.slice();
        for (var i = 0; i < live.length; i++) live[i].cut(now + 0.03);
        inst._live.length = 0;
        if (inst.onPanic) inst.onPanic(now);
      } catch (e) {}
    };
    inst.dispose = function () { inst.panic(); if (inst.onDispose) inst.onDispose(); disc(inst.pre); disc(inst.out); };
    if (!ctx) return inst;
    try {
      inst.out = ctx.createGain();
      val(inst.out.gain, inst.params.level == null ? 1 : inst.params.level);
      inst.pre = ctx.createGain();
      inst.pre.connect(inst.out);
      build(inst);
    } catch (e) {
      inst.out = inst.out || null;
    }
    var raw = inst.trigger;
    inst.trigger = function (t, ev) {
      try { if (!inst.out) return; raw(t == null ? ctx.currentTime : t, ev || {}); } catch (e) {}
    };
    return inst;
  }

  // ------------------------------------------------------------------ the event planner (both paths)
  // Step length: learned from ev.step and the trigger times; before two notes, from ev.dur (a one-step melody note is
  // 0.95 x step - 0.01 s in the sequencer).
  function planner() { return { sd: 0, lastStep: null, lastT: 0, n: 0, prev: null, held: [], locked: {}, fv: null }; }
  function learnStep(pl, t, ev) {
    if (typeof ev.step === 'number' && pl.lastStep != null && ev.step > pl.lastStep) {
      var est = (t - pl.lastT) / (ev.step - pl.lastStep);
      if (est > 0.01 && est < 2) pl.sd = pl.sd ? 0.5 * (pl.sd + est) : est;
    }
    if (!pl.sd) pl.sd = clamp(((ev.dur || 0.11) + 0.01) / 0.95, 0.03, 1);
    if (typeof ev.step === 'number') { pl.lastStep = ev.step; pl.lastT = t; }
    return pl.sd;
  }
  function noteOf(ev, def) {
    if (ev && typeof ev.midi === 'number') return ev.midi;
    if (ev && ev.notes && ev.notes.length) return ev.notes[0];
    return def;
  }
  function velOf(ev) { return clamp(ev && typeof ev.vel === 'number' ? ev.vel : 0.85, 0, 1.5); }
  // a record in inst._live for each sounding note (panic clears it); pruned when its end has passed
  function liveNote(inst, t, end, cut) {
    var L = inst._live;
    for (var i = L.length - 1; i >= 0; i--) if (L[i].end < t) L.splice(i, 1);
    var r = { t: t, end: end, cut: cut || function () {}, dispose: function () { var j = L.indexOf(r); if (j >= 0) L.splice(j, 1); } };
    L.push(r);
    return r;
  }

  // ------------------------------------------------------------------ worklet path helpers
  function wparams(node) {
    var m = {};
    try { node.parameters.forEach(function (p, k) { m[k] = p; }); } catch (e) {}
    return m;
  }
  // write the knobs that a lock changed for this trigger (and restore the ones locked last time)
  function applyLocks(inst, pl, W, t) {
    var P = inst.params, base = inst._base, k;
    for (k in pl.locked) if (pl.locked.hasOwnProperty(k) && P[k] === base[k] && W[k]) setV(W[k], numeric(inst.type, k, base[k]), t);
    pl.locked = {};
    for (k in base) if (base.hasOwnProperty(k) && k !== 'level' && P[k] !== base[k] && W[k]) { setV(W[k], numeric(inst.type, k, P[k]), t); pl.locked[k] = true; }
  }
  function buildWorklet(inst, node) {
    var ctx = inst.ctx, W = wparams(node), type = inst.type, k;
    inst.engine = 'worklet';
    inst._node = node;
    inst._base = {};
    for (k in inst.params) if (inst.params.hasOwnProperty(k)) {
      inst._base[k] = inst.params[k];
      if (W[k]) val(W[k], numeric(type, k, inst.params[k]));
    }
    node.connect(inst.pre);
    inst.onParam = function (name, v, o, at) {
      inst._base[name] = v;
      var p = W[name];
      if (!p) return;
      var x = numeric(type, name, v);
      if (ENUMS[type][name] || (o && typeof o.at === 'number')) setV(p, x, at);
      else target(p, x, at, 0.01);
    };
    inst.onDispose = function () { try { node.port.postMessage('stop'); } catch (e) {} disc(node); };
    return W;
  }

  // ------------------------------------------------------------------ TB-303
  // Gate (P1 ruling): a normal note holds its gate for its length less half a step; a note with ev.slide holds the gate
  // until the next trigger, with a safety release one step after its own length (two steps for a one-step note); the
  // next note then glides from it and retriggers nothing.
  function plan303(pl, t, ev) {
    var sd = learnStep(pl, t, ev), dur = ev.dur || sd * 0.95 - 0.01;
    var n = Math.max(1, Math.round((dur + 0.01) / (0.95 * sd)));
    var prev = pl.prev, legato = !!(prev && prev.slide && t <= prev.off + 1e-6 && t >= prev.t);
    var off = ev.slide ? t + (n + 1) * sd : t + Math.max(0.005, (n - 0.5) * sd);
    pl.prev = { t: t, slide: !!ev.slide, off: off, midi: noteOf(ev, 36), acc: !!ev.accent };
    pl.n++;
    return { legato: legato, off: off, midi: pl.prev.midi, acc: !!ev.accent, vel: velOf(ev), trig: pl.n };
  }

  var BUILD = {};
  BUILD.tb303 = function (inst) {
    var ctx = inst.ctx, pl = planner(), node = root.Worklets ? root.Worklets.node(ctx, PROC.tb303) : null;
    inst._plan = pl;
    if (node) {
      var W = buildWorklet(inst, node);
      inst.trigger = function (t, ev) {
        var e = plan303(pl, t, ev);
        applyLocks(inst, pl, W, t);
        cancel(W.gate, t);
        setV(W.pitch, e.midi, t); setV(W.slide, e.legato ? 1 : 0, t); setV(W.acc, e.acc ? 1 : 0, t); setV(W.vel, e.vel, t);
        setV(W.trig, e.trig, t); setV(W.gate, 1, t); setV(W.gate, 0, e.off);
        liveNote(inst, t, e.off + 0.1);
      };
      inst.onPanic = function (now) { cancel(W.gate, now); setV(W.gate, 0, now); pl.prev = null; };
      return;
    }
    // FALLBACK (no worklet): one voice per gate; a slide keeps the voice and glides its oscillator
    inst.trigger = function (t, ev) {
      var e = plan303(pl, t, ev), P = inst.params, v = pl.fv;
      var f = mtof(e.midi + P.tune / 100), accG = e.acc ? P.accent : 0;
      var res = P.resonance, rr = (1 - Math.exp(-3 * res)) / (1 - Math.exp(-3));
      var c = Math.log(P.cutoff / 313.8152786059267) / Math.log(2394.411986817546 / 313.8152786059267), em = P.envMod;
      var sc = (1 - c) * (3.773996325111173 * em + 0.736965594166206) + c * (4.194548788411135 * em + 0.864344900642434);
      var off0 = 0.048292930943553 * c + 0.294391201442418;
      var lo = clamp(P.cutoff * Math.pow(2, -sc * off0), 200, 18000), hi = clamp(P.cutoff * Math.pow(2, sc * (1 - off0) + accG), 200, 18000);
      var amp = 0.25 * e.vel * (1 + 0.45 + 4 * accG) / (1 + 0.45) * (1 / (1 + 3 * rr));
      var relT = e.acc ? 0.05 : 0.001, decT = e.acc ? 0.2 : P.decay / 1000;
      if (e.legato && v && !v.done) {                         // slide: glide the running voice, extend its gate
        target(v.o.frequency, f, t, Math.max(0.0002, 0.2 * P.slideTime / 1000));
        K.cancel(v.g.gain, t); target(v.g.gain, amp, t, 0.005); target(v.g.gain, 0, e.off, relT);
        try { v.o.stop(e.off + relT * 8 + 0.05); } catch (x) {}
        v.rec.end = e.off + 0.1;
        return;
      }
      var o = ctx.createOscillator(), b1 = ctx.createBiquadFilter(), b2 = ctx.createBiquadFilter(), g = ctx.createGain();
      try { o.type = P.wave === 'square' ? 'square' : 'sawtooth'; } catch (x) {}
      setV(o.frequency, f, t);
      [b1, b2].forEach(function (b, i) {
        try { b.type = 'lowpass'; } catch (x) {}
        val(b.Q, i ? 0.7 + 14 * rr : 0.5);
        setV(b.frequency, hi, t); target(b.frequency, lo, t + 0.003, decT);
      });
      setV(g.gain, 0, t); lin(g.gain, amp, t + 0.002); target(g.gain, 0.0001, t + 0.002, 1.23); target(g.gain, 0, e.off, relT);
      o.connect(b1); b1.connect(b2); b2.connect(g); g.connect(inst.pre);
      var nv = { o: o, g: g, done: false };
      nv.rec = liveNote(inst, t, e.off + 0.1, function (tc) { try { o.stop(tc); } catch (x) {} });
      o.onended = function () { nv.done = true; disc(o); disc(b1); disc(b2); disc(g); nv.rec.dispose(); };
      try { o.start(t); o.stop(e.off + relT * 8 + 0.05); } catch (x) {}
      pl.fv = nv;
    };
    inst.onPanic = function () { pl.prev = null; pl.fv = null; };
  };

  // ------------------------------------------------------------------ Model D
  // Single triggering, last-note priority (the brief; P2 notes the original is low-note priority): a note that starts
  // while another is held (the sequencer's dur decides), or after a note flagged ev.slide, is legato: the contours do
  // not restart and the pitch moves (glides when glideOn). When the newest note ends while an older one is still held,
  // the pitch returns to the most recent of those. The gate falls when the last held note ends.
  function planD(pl, t, ev) {
    var sd = learnStep(pl, t, ev), dur = Math.max(0.005, ev.dur || 0.2), end = t + dur, i;
    for (i = pl.held.length - 1; i >= 0; i--) if (pl.held[i].end <= t + 1e-6) pl.held.splice(i, 1);
    var prev = pl.prev, slid = !!(prev && prev.slide && t <= prev.off + 1e-6 && t >= prev.t);
    var legato = pl.held.length > 0 || slid;
    var midi = noteOf(ev, 48);
    if (ev.slide) end = Math.max(end, t + Math.round((dur + 0.01) / (0.95 * sd) + 1) * sd);
    pl.held.push({ midi: midi, end: end });
    // the pitch timeline after this note: return to the latest still-held note whenever the current one ends
    var steps = [], cur = pl.held[pl.held.length - 1], tt = cur.end, gateOff = 0;
    for (i = 0; i < pl.held.length; i++) gateOff = Math.max(gateOff, pl.held[i].end);
    for (var guard = 0; guard < 16 && tt < gateOff - 1e-6; guard++) {
      var back = null;
      for (i = pl.held.length - 1; i >= 0; i--) if (pl.held[i].end > tt + 1e-6) { back = pl.held[i]; break; }
      if (!back) break;
      steps.push([tt, back.midi]);
      tt = back.end;
    }
    pl.prev = { t: t, slide: !!ev.slide, off: gateOff };
    pl.n++;
    return { legato: legato, midi: midi, off: gateOff, returns: steps, vel: velOf(ev), trig: pl.n };
  }

  var FWAVE = { tri: 'triangle', shark: 'sawtooth', saw: 'sawtooth', revsaw: 'sawtooth', square: 'square', wide: 'square', narrow: 'square' };
  var ROCT = { lo: -7, '32': -2, '16': -1, '8': 0, '4': 1, '2': 2 };

  BUILD.modeld = function (inst) {
    var ctx = inst.ctx, pl = planner(), node = root.Worklets ? root.Worklets.node(ctx, PROC.modeld, { processorOptions: { seed: 22051 } }) : null;
    inst._plan = pl;
    if (node) {
      var W = buildWorklet(inst, node);
      inst.trigger = function (t, ev) {
        var e = planD(pl, t, ev);
        applyLocks(inst, pl, W, t);
        cancel(W.gate, t); cancel(W.pitch, t);
        setV(W.pitch, e.midi, t); setV(W.slide, e.legato ? 1 : 0, t); setV(W.vel, e.vel, t);
        setV(W.trig, e.trig, t); setV(W.gate, 1, t);
        for (var i = 0; i < e.returns.length; i++) setV(W.pitch, e.returns[i][1], e.returns[i][0]);
        setV(W.gate, 0, e.off);
        var P = inst.params;
        liveNote(inst, t, e.off + (P.decaySwitch >= 0.5 ? Math.max(P.decay, P.fDecay) : 0.01) + 0.05);
      };
      inst.onPanic = function (now) { cancel(W.gate, now); cancel(W.pitch, now); setV(W.gate, 0, now); pl.prev = null; pl.held = []; };
      return;
    }
    // FALLBACK (no worklet): three native oscillators, two biquads, contours as ramps; legato glides the running voice
    inst.trigger = function (t, ev) {
      var e = planD(pl, t, ev), P = inst.params, v = pl.fv, i;
      var tun = P.tune / 100, gl = P.glideOn >= 0.5 ? Math.max(0.001, P.glide) : 0.001;
      var fr = function (m) {
        return [mtof(m + tun + 12 * (ROCT[P.osc1Range] || 0)), mtof(m + tun + 12 * (ROCT[P.osc2Range] || 0) + P.osc2Detune),
                P.osc3Keys >= 0.5 ? mtof(m + tun + 12 * (ROCT[P.osc3Range] || 0) + P.osc3Detune) : 3 * Math.pow(2, 5 * P.osc3Detune / 7)];
      };
      var relT = P.decaySwitch >= 0.5 ? P.decay / 6.9 : 0.004 / 6.9;
      if (e.legato && v && !v.done) {
        var fs = fr(e.midi);
        for (i = 0; i < 3; i++) target(v.os[i].frequency, fs[i], t, gl);
        for (i = 0; i < e.returns.length; i++) { var fb = fr(e.returns[i][1]); for (var j = 0; j < 3; j++) target(v.os[j].frequency, fb[j], e.returns[i][0], gl); }
        K.cancel(v.g.gain, e.off); target(v.g.gain, 0, e.off, relT);
        for (i = 0; i < 3; i++) { try { v.os[i].stop(e.off + relT * 8 + 0.05); } catch (x) {} }
        v.rec.end = e.off + relT * 8;
        return;
      }
      var f = fr(e.midi), os = [], mix = [P.mixOsc1, P.mixOsc2, P.mixOsc3], wv = [P.osc1Wave, P.osc2Wave, P.osc3Wave];
      var b1 = ctx.createBiquadFilter(), b2 = ctx.createBiquadFilter(), g = ctx.createGain(), stop = e.off + relT * 8 + 0.05;
      var kt = (P.keyTrack1 >= 0.5 ? 1 / 3 : 0) + (P.keyTrack2 >= 0.5 ? 1 / 3 : 0);
      var base = clamp(P.cutoff * Math.pow(2, kt * (e.midi - 60) / 12), 10, 18000), peak = clamp(base * Math.pow(2, 4 * P.contour), 10, 18000);
      var sus = clamp(base * Math.pow(2, 4 * P.contour * P.fSustain), 10, 18000);
      [b1, b2].forEach(function (b, k) {
        try { b.type = 'lowpass'; } catch (x) {}
        val(b.Q, k ? 0.5 + 12 * P.emphasis : 0.5);
        setV(b.frequency, base, t); lin(b.frequency, peak, t + P.fAttack); target(b.frequency, sus, t + P.fAttack, P.fDecay / 6.9);
        target(b.frequency, base, e.off, relT);
      });
      for (i = 0; i < 3; i++) {
        var o = ctx.createOscillator(), og = ctx.createGain();
        try { o.type = FWAVE[wv[i]] || 'sawtooth'; } catch (x) {}
        setV(o.frequency, f[i], t);
        val(og.gain, Math.pow(mix[i], 1.5) * 0.35);
        o.connect(og); og.connect(b1);
        os.push(o);
      }
      var amp = e.vel * 0.6;
      setV(g.gain, 0, t); lin(g.gain, amp, t + P.attack); target(g.gain, amp * P.sustain, t + P.attack, P.decay / 6.9);
      target(g.gain, 0, e.off, relT);
      b1.connect(b2); b2.connect(g); g.connect(inst.pre);
      var nv = { os: os, g: g, done: false, left: 3 };
      nv.rec = liveNote(inst, t, stop, function (tc) { for (var q = 0; q < 3; q++) { try { os[q].stop(tc); } catch (x) {} } });
      os.forEach(function (o) {
        o.onended = function () { if (--nv.left > 0) return; nv.done = true; os.forEach(disc); disc(b1); disc(b2); disc(g); nv.rec.dispose(); };
        try { o.start(t); o.stop(stop); } catch (x) {}
      });
      pl.fv = nv;
    };
    inst.onPanic = function () { pl.prev = null; pl.held = []; pl.fv = null; };
  };

  // ------------------------------------------------------------------ API
  var fallbackSaid = false;
  function has(type) { return SPEC.hasOwnProperty(type); }
  function create(ctx, type, opts) {
    if (!has(type)) {
      warn('unknown instrument "' + type + '"');
      return makeInst(ctx || null, 'unknown', { level: P(0, 1.5, 1, '') }, opts, function () {});
    }
    var spec = {}, src = SPEC[type];
    for (var p in src) if (src.hasOwnProperty(p)) {
      spec[p] = {};
      for (var q in src[p]) if (src[p].hasOwnProperty(q)) spec[p][q] = (q === 'options') ? src[p][q].slice() : src[p][q];
    }
    var inst = makeInst(ctx || null, type, spec, opts, BUILD[type]);
    if (ctx && inst.engine === 'fallback' && !fallbackSaid) {
      fallbackSaid = true;
      warn('no AudioWorklet on this context: ' + type + ' (and later classics) use the approximate plain-node fallback');
    }
    return inst;
  }

  root.Classics = {
    create: create, has: has,
    types: function () { return TYPES.slice(); },
    spec: function (t) { return SPEC[t] || null; },
    processor: function (t) { return PROC[t] || null; },
    numeric: numeric
  };
})();
