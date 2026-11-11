/* Havantechno app engine - drums.js
 * Global `Drums`: TR-808 and TR-909 voice recreations (Box Crew batch 2, A12).
 *
 *   var inst = Drums.create(ctx, 'bd808', {decay: 0.5});
 *   inst.out.connect(ctx.destination);
 *   inst.trigger(ctx.currentTime, {vel: 1});          // accent: ev.vel (and ev.accent = x1.2, like Synths)
 *   Drums.types(); Drums.spec('sd909'); Drums.has('cp808');
 *
 * Same instrument API as synths.js: create(ctx, type, opts) -> {trigger(t, ev), set/get, params, spec, panic,
 * dispose, out, _live}. Every sounding voice is registered in inst._live; panic() cuts them. Nothing throws, and a
 * null context gives a silent instrument with the same API. Load after core.js (needs Kit).
 *
 * 808 types: bd808 sd808 cp808 ch808 oh808 cy808 cb808 lt808 mt808 ht808 lc808 mc808 hc808 rs808 cl808 ma808.
 * 909 types: bd909 sd909 lt909 mt909 ht909 rs909 cp909 ch909 oh909 cr909 rd909.
 *
 * Sources (docs/research/2026-11-09-box-crew/transcripts/B2-808.md and B3-909.md, third passes). Each spec entry carries
 * `basis`: 'manual' (Roland TR-808 / TR-909 service notes: check table values or values derived from the schematics),
 * 'paper' (Werner DAFx-14 / Werner-Abel-Smith ICMC|SMC 2014), 'source' (andremichelle/tr-909 constants), or
 * 'prior' (io-808 or ER-99 by-ear constants, memory notes, or a design choice: NOT circuit values, to be fitted by A9).
 *
 * Conventions: 808 `decay` is seconds to 1/10 of the peak (the service notes' "checking voices" table); the 909 bd/sd/tom/hat
 * `decay`/`tune`/`tone` are TIME CONSTANTS (andremichelle's panel mappings and the manual's RC values), their spec unit says so. The 909 hats are sampled in the original; here the sampled voices are
 * rendered once per context into AudioBuffers by plain JS DSP (no OfflineAudioContext needed) and played through
 * a hold + exponential decay. Hat groups: 'hat808' (ch808 chokes oh808) and 'hat909' (one channel, any new
 * hat voice stops the previous one).
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var K = root.Kit;
  var setV = K.setV, lin = K.lin, val = K.val, disc = K.disc, clamp = K.clamp, target = K.target, dbToGain = K.dbToGain;

  // Envelope stretch factors from A9's scoring (the measure is peak -> 1/10 of peak on the rendered sum of bands/stages):
  // the multi-band voices decay to 1/10 sooner than their slowest band's own constant, so the bands are lengthened to land on the table.
  var STRETCH = { hat: 1.48, cy: 1.36, cb: 2.2, cp: 2.2 };
  var LN10 = 2.302585;                         // ln(10): seconds-to-1/10 (the manual's decay definition) -> exponential time constant
  function tcOf(t10) { return Math.max(t10, 0.0005) / LN10; }

  // ------------------------------------------------------------ constants from the papers
  // Werner, Abel, Smith, "The TR-808 Cymbal: a Physically-Informed, Circuit-Bendable, Digital Model", ICMC|SMC 2014
  // (CC BY 3.0), section 3: six Schmitt-trigger oscillators, nominal 205.3, 369.6, 304.4, 522.7 Hz and two trimmed
  // to 800 and 540 Hz, duty 47.98 %, 5 V. Section 4: band-pass centres 3440 and 7100 Hz. Section 9: high-pass #3
  // corner about 10500 Hz with resonance. Cowbell: just the 800 and 540 Hz pair (Sound on Sound, Synth Secrets).
  var METAL = {
    freqs: [205.3, 369.6, 304.4, 522.7, 800, 540],
    duty: 0.4798,
    bp: [3440, 7210],                 // stage b 3440 (paper; the manual's values give 2620, unreconciled), stage a 7210 (manual; paper 7100)
    bpPaper: [3440, 7100],
    hp: 14400,                        // cymbal high-pass IC5a, manual (calculated natural frequency; the paper's measured corner is about 10500)
    hpPaper: 10500,
    hpOpen: 7800, hpClosed: 11700,    // hat Sallen-Key high-passes, manual (OH 7.8 kHz, CH 11.7 kHz)
    cowbell: [800, 540]
  };
  // Werner, "A Physically-Informed, Circuit-Bendable, Digital Model of the Roland TR-808 Bass Drum Circuit",
  // DAFx-14: 1 ms trigger pulse, centre frequency shift of more than an octave for about 6 ms, model centre
  // frequency 49.5 Hz (Roland's chart 56 Hz).
  // Service notes: 56 Hz typical at 12 o'clock (p. 14), stem 53.8k -> 6.8k gives a ratio of 2.81 (p. 9), accent doubling for the
  // 4 ms ON period of Q43 (p. 5).
  var BD808 = { tune: 56, shift: 2.8, shiftTime: 0.006, pulseMs: 1, accentRatio: 2.0, accentTime: 0.004 };
  // accent / normal peak ratios from the service notes' check table (CP is printed 6 / 2, a probable misprint: 2 is a prior)
  var ACC808 = { bd808: 2.86, sd808: 3.33, lc808: 3.43, lt808: 3.43, mc808: 3.33, mt808: 3.67, hc808: 3.43, ht808: 3.43, cl808: 3.2, rs808: 3.33,
                 ma808: 1.67, cp808: 2.0, cb808: 3.43, cy808: 2.0, oh808: 2.0, ch808: 2.0 };
  // andremichelle/tr-909 (AGPL-3.0-or-later): bassdrum.ts 7-9 hold 0.060 s, FreqStart 274, FreqEnd 53;
  // preset.ts 70-77 mappings; processor.ts 17 step levels -18 / -9 / 0 dB.
  var BD909 = { start: 274, end: 53, hold: 0.06 };
  // TR-909 service notes p. 5: sample clock about 30 kHz (60 kHz / 2), 6-bit, ROM lengths from the address counters
  var ROM909 = { rate: 30000, bits: 6, ch: 8192, oh: 24576, cr: 32768, rd: 32768 };
  var STEP_DB = [-18, -9, 0];

  // ------------------------------------------------------------ small helpers
  function velOf(ev) { return clamp(ev && typeof ev.vel === 'number' ? ev.vel : 0.8, 0, 1.5); }
  // 808: the accent hit is the full-scale hit; an unaccented hit is 1/ratio of it (ratios from the check table, ACC808)
  // OUT808: per-voice output scale so the accent peaks sit near the manual's proportions (the noisy hats, cymbal, cowbell and clap are lifted to about 0.8 because their crest factor is high and the RMS is what the ear balances) (check table accent Vpp 10..12 for
  // BD/SD/toms/congas/CB, 8 claves, 7 CY/OH, 6 CH, 5 maracas, scaled so the loudest accent is about 0.9 of full scale)
  var OUT808 = { bd808: 0.75, sd808: 0.74, cp808: 2.75, cb808: 3.4, ch808: 4.5, oh808: 2.1, cy808: 1.25, lt808: 0.77, mt808: 0.8, ht808: 0.76,
                 lc808: 0.75, mc808: 0.70, hc808: 0.76, rs808: 0.75, cl808: 0.6, ma808: 0.57 };
  function ampOf(ev, inst) {
    var r = (inst && ACC808[inst.type]) || 1, g = (inst && OUT808[inst.type]) || 1;
    return velOf(ev) * g * (ev && ev.accent ? 1 : 1 / r);
  }
  // 909: ev.step 0 / 1 / 2 = weak / normal / accent as absolute dB gains (-18 / -9 / 0). Without ev.step the accent
  // flag is 6 dB (manual, scope p. 9) over an unaccented hit at half scale.
  function ampOf9(ev) {
    if (ev && typeof ev.step === 'number' && ev.step === ev.step) return velOf(ev) * dbToGain(STEP_DB[clamp(Math.round(ev.step), 0, 2)]);
    return velOf(ev) * (ev && ev.accent ? 1 : 0.5);
  }
  function P(min, max, value, unit, basis, label) {
    var o = { min: min, max: max, value: value, unit: unit || '' };
    if (basis) o.basis = basis;
    if (label) o.label = label;
    return o;
  }
  function con(a, b) { try { if (a && b) a.connect(b); } catch (e) {} return b; }
  function chain(nodes) {
    var last = null;
    for (var i = 0; i < nodes.length; i++) { if (!nodes[i]) continue; if (last) con(last, nodes[i]); last = nodes[i]; }
    return last;
  }
  // exponential-decay envelope from `amp`, optional hold, time constant tc; returns the time it is inaudible (-78 dB)
  function expEnv(g, t, amp, hold, tc) {
    setV(g, 0, t);
    lin(g, amp, t + 0.0003);
    if (hold > 0) setV(g, amp, t + 0.0003 + hold);
    target(g, 0, t + 0.0003 + hold, tc);
    return t + 0.0003 + hold + tc * 9 + 0.01;
  }
  // soft clip with a gentle drive range (own curve: the engine's Kit.shaperCurve is too hard for the default drives).
  // drive 0 is a straight line, so a voice is transparent until the knob is turned.
  function driveCurve(drive) {
    var n = 1024, c = new Float32Array(n), k = clamp(drive, 0, 1) * 6, d = Math.tanh(k), i;
    for (i = 0; i < n; i++) { var x = i * 2 / (n - 1) - 1; c[i] = k < 0.01 ? x : Math.tanh(x * k) / d; }
    return c;
  }

  // ------------------------------------------------------------ per-context caches (WeakMap)
  var CACHE = (typeof WeakMap === 'function') ? new WeakMap() : null;
  function cacheOf(ctx) {
    var c = CACHE ? CACHE.get(ctx) : null;
    if (!c) { c = { bank: null, pulse: {}, bufs: {}, groups: {} }; if (CACHE) CACHE.set(ctx, c); }
    return c;
  }

  // Fourier coefficients of a pulse wave of duty d with its DC removed, for PeriodicWave(real=cos, imag=sin)
  function pulseCoeffs(duty, n) {
    var real = new Float32Array(n + 1), imag = new Float32Array(n + 1);
    for (var k = 1; k <= n; k++) {
      real[k] = Math.sin(2 * Math.PI * k * duty) / (k * Math.PI);
      imag[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (k * Math.PI);
    }
    return { real: real, imag: imag };
  }

  // The shared metal-oscillator bank of a context: the frequency table and the 47.98 % pulse wave are created
  // once per context; each hit instantiates its own oscillators from them (fresh nodes per hit, so panic works).
  function bankOf(ctx) {
    var c = cacheOf(ctx);
    if (c.bank) return c.bank;
    var b = { freqs: METAL.freqs.slice(), duty: METAL.duty, bp: METAL.bp.slice(), bpPaper: METAL.bpPaper.slice(), hp: METAL.hp, hpPaper: METAL.hpPaper,
             hpOpen: METAL.hpOpen, hpClosed: METAL.hpClosed, cowbell: METAL.cowbell.slice(), wave: null };
    try {
      if (typeof ctx.createPeriodicWave === 'function') {
        var co = pulseCoeffs(METAL.duty, 96);
        b.wave = ctx.createPeriodicWave(co.real, co.imag);
      }
    } catch (e) { b.wave = null; }
    c.bank = b;
    return b;
  }

  // white noise, seeded: every context gets the same 2 s buffer, so a hit renders the same twice (the scoring tool compares levels
  // across renders on fresh contexts)
  function noiseBuf(ctx) {
    var c = cacheOf(ctx);
    if (c.noise) return c.noise;
    try {
      var sr = ctx.sampleRate || 44100, n = Math.floor(sr * 2), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0), r = mulberry(9);
      for (var i = 0; i < n; i++) d[i] = r() * 2 - 1;
      c.noise = b;
      return b;
    } catch (e) { return null; }
  }

  // a 1 ms (or `ms`) DC pulse: the trigger edge of the analogue voices
  function pulseBuf(ctx, ms) {
    var c = cacheOf(ctx), key = String(ms);
    if (c.pulse[key]) return c.pulse[key];
    try {
      var sr = ctx.sampleRate || 44100, n = Math.max(2, Math.round(sr * ms / 1000)), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = 1;
      c.pulse[key] = b;
      return b;
    } catch (e) { return null; }
  }

  // ------------------------------------------------------------ choke groups per context
  function groupList(ctx, name) { var g = cacheOf(ctx).groups; return g[name] || (g[name] = []); }
  function chokeVoice(w, t) {
    var list = groupList(w.ctx, w.group), i = list.indexOf(w);
    if (i >= 0) list.splice(i, 1);
    if (w.chokeG) { setV(w.chokeG.gain, 1, t); lin(w.chokeG.gain, 0.0001, t + 0.005); }
    w.cut(t + 0.006);
  }
  // a new voice of `name` stops every live voice of the group (one hat channel), then joins it
  function joinGroup(v, name, t) {
    v.group = name;
    var list = groupList(v.ctx, name), old = list.slice();
    for (var i = 0; i < old.length; i++) chokeVoice(old[i], t);
    list.push(v);
  }

  // ------------------------------------------------------------ voice: node bag with auto cleanup (as synths.js)
  function voice(ctx, inst) {
    var v = { ctx: ctx, nodes: [], pending: 0, done: false, srcs: [], group: null, chokeG: null };
    if (inst && inst._live) inst._live.push(v);
    v.track = function (n) { if (n) v.nodes.push(n); return n; };
    v.src = function (src, t0, t1) {
      v.pending++;
      src.onended = function () { v.pending--; if (v.pending <= 0) v.dispose(); };
      v.nodes.push(src); v.srcs.push(src);
      try { src.start(t0); } catch (e) {}
      if (t1 != null) { try { src.stop(t1); } catch (e) {} }
      return src;
    };
    v.osc = function (type, f, t0, t1) {
      var o = ctx.createOscillator();
      try { o.type = type; } catch (e) {}
      setV(o.frequency, f, t0);
      return v.src(o, t0, t1);
    };
    // metal-bank oscillator: the 47.98 % pulse wave when the context has PeriodicWave, else a plain square
    v.pulseOsc = function (bank, f, t0, t1) {
      var o = ctx.createOscillator(), done = false;
      try { if (bank.wave && typeof o.setPeriodicWave === 'function') { o.setPeriodicWave(bank.wave); done = true; } } catch (e) {}
      if (!done) { try { o.type = 'square'; } catch (e2) {} }
      setV(o.frequency, f, t0);
      return v.src(o, t0, t1);
    };
    v.noise = function (t0, t1) {
      var buf = noiseBuf(ctx);
      if (!buf) return null;
      var s = ctx.createBufferSource();
      s.buffer = buf; s.loop = true;
      return v.src(s, t0, t1);
    };
    v.buf = function (buf, t0, t1, rate) {
      if (!buf) return null;
      var s = ctx.createBufferSource();
      s.buffer = buf;
      if (rate != null) setV(s.playbackRate, rate, t0);
      return v.src(s, t0, t1);
    };
    v.gain = function (g0) { var g = ctx.createGain(); val(g.gain, g0 == null ? 1 : g0); return v.track(g); };
    v.filter = function (type, f, q) {
      var b = ctx.createBiquadFilter();
      try { b.type = type; } catch (e) {}
      val(b.frequency, f); val(b.Q, q == null ? 1 : q);
      return v.track(b);
    };
    v.cut = function (t) { for (var i = 0; i < v.srcs.length; i++) { try { v.srcs[i].stop(t); } catch (e) {} } };
    v.dispose = function () {
      if (v.done) return;
      v.done = true;
      for (var i = 0; i < v.nodes.length; i++) disc(v.nodes[i]);
      v.nodes.length = 0;
      if (v.group) { var list = groupList(ctx, v.group), k = list.indexOf(v); if (k >= 0) list.splice(k, 1); }
      if (inst && inst._live) { var j = inst._live.indexOf(v); if (j >= 0) inst._live.splice(j, 1); }
    };
    return v;
  }
  // the voice's output node: a gain into inst.pre; hats join their group here (the gain is the choke fade)
  function outOf(v, inst, group, t) {
    var g = v.gain(1);
    v.chokeG = g;
    con(g, inst.pre);
    if (group) joinGroup(v, group, t);
    return g;
  }

  // ------------------------------------------------------------ instrument base
  function makeInst(ctx, type, spec, opts, build) {
    var inst = { type: type, ctx: ctx, out: null, pre: null, _shaper: null, _live: [] };
    K.defineParams(inst, spec, function (name, v, o) {
      if (!ctx) return;
      var at = (o && typeof o.at === 'number') ? o.at : ctx.currentTime;
      if (name === 'level' && inst.out) K.target(inst.out.gain, v, at, 0.01);
      if (name === 'drive' && inst._shaper) { try { inst._shaper.curve = driveCurve(v); } catch (e) {} }
      if (inst.onParam) inst.onParam(name, v, o);
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
      } catch (e) {}
    };
    inst.dispose = function () { inst.panic(); disc(inst.pre); disc(inst.out); disc(inst._shaper); };
    if (!ctx) return inst;
    try {
      inst.out = ctx.createGain();
      val(inst.out.gain, inst.params.level == null ? 1 : inst.params.level);
      inst.pre = ctx.createGain();
      inst._shaper = ctx.createWaveShaper();
      try { inst._shaper.oversample = '2x'; } catch (e) {}
      try { inst._shaper.curve = driveCurve(inst.params.drive || 0); } catch (e) {}
      inst.pre.connect(inst._shaper);
      inst._shaper.connect(inst.out);
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

  var BUILD = {};
  function base(extra, drive) {
    var s = { level: P(0, 1.5, 1, ''), drive: P(0, 1, drive || 0, '') };
    for (var k in extra) if (extra.hasOwnProperty(k)) s[k] = extra[k];
    return s;
  }

  // ================================================================ TR-808
  // Values: Roland TR-808 service notes (manual) unless the spec row's basis says otherwise.
  // ---- bd808: 1 ms pulse into a bridged-T ringing near `tune` (56 Hz typical, p. 14). The stem is shortened for ~6 ms
  // after every trigger (centre-frequency ratio 2.81, Werner's "more than an octave"); on accent, Q43 doubles the
  // frequency for its 4 ms ON period (p. 5), built here as a 2x window right after the shift. A slow "sigh" (droop)
  // follows. Accent also raises the peak 2.86x over an unaccented hit (check table).
  BUILD.bd808 = {
    spec: base({
      tune: P(45, 70, BD808.tune, 'Hz', 'manual', 'p. 14: 18 ms period (56 Hz) at 12 o\'clock; bare RC 45.7 Hz, Werner model 49.5 Hz'),
      decay: P(0.05, 0.8, 0.3, 's', 'manual', 'p. 14: 50 / 300 / 800 ms, time to 1/10 of the peak'),
      tone: P(400, 5000, 1200, 'Hz', 'prior', 'low-pass after the resonator (TONE pot)'),
      shift: P(1, 3, BD808.shift, 'x', 'paper', 'attack centre-frequency ratio on every hit; manual stem 53.8k -> 6.8k = 2.81'),
      shiftTime: P(0.003, 0.012, BD808.shiftTime, 's', 'paper', 'duration of the attack shift, 5 to 6 ms'),
      droop: P(0, 1, 0.1, '', 'prior', 'pitch sigh over the decay (x 0.3 = fraction)'),
      click: P(0, 1, 0.3, '', 'paper', 'level of the 1 ms trigger edge')
    }, 0.15),
    build: function (inst) {
      var ctx = inst.ctx;
      inst.trigger = function (t, ev) {
        var p = inst.params, a = ampOf(ev, inst), v = voice(ctx, inst);
        var tc = tcOf(p.decay), st = p.shiftTime, f0 = p.tune * p.shift;
        var end = t + 0.002 + tc * 9 + 0.03 + (ev.accent ? BD808.accentTime : 0);
        var o = v.osc('sine', f0, t, end), tEnd = t + st;
        if (ev.accent) {                                   // Q43 ON period: twice the frequency for 4 ms after the shift
          setV(o.frequency, p.tune * BD808.accentRatio, t + st);
          tEnd = t + st + BD808.accentTime;
        }
        target(o.frequency, p.tune, tEnd, 0.0015);
        target(o.frequency, p.tune * (1 - 0.3 * p.droop), tEnd + 0.008, p.decay / 3);
        var g = v.gain(0);
        setV(g.gain, 0, t); lin(g.gain, a * 0.9, t + 0.001); target(g.gain, 0, t + 0.001, tc);
        con(o, g);
        var lpC = v.filter('lowpass', 5000, 0.7), cg = v.gain(a * 0.8 * p.click);
        var s1 = v.buf(pulseBuf(ctx, BD808.pulseMs), t, t + 0.01);
        con(s1, cg); con(cg, lpC);
        // the retriggering pulse (C39, R161, D52) when the shift ends
        var cg2 = v.gain(a * 0.4 * p.click), s2 = v.buf(pulseBuf(ctx, BD808.pulseMs), t + st, t + st + 0.01);
        con(s2, cg2); con(cg2, lpC);
        var lp = v.filter('lowpass', p.tone, 0.7);
        con(g, lp); con(lpC, lp);
        con(lp, outOf(v, inst, null, t));
      };
    }
  };

  // ---- sd808: two bridged-T oscillators at 238 and 476 Hz (table; schematic 249.6 / 499 before loading) plus
  // contour-gated high-passed noise. TONE (VR8) is the output balance between the two resonators (p. 6), not a
  // noise filter. SNAPPY (VR9) sets the snappy contour, which is added to the trigger so it also kicks the oscillators.
  BUILD.sd808 = {
    spec: base({
      tune: P(120, 400, 238, 'Hz', 'manual', 'p. 14: 4.2 ms period; the second resonator is tune x ratio'),
      ratio: P(1.5, 3, 2.0, 'x', 'manual', 'p. 14: 2.1 ms (476 Hz) over 4.2 ms (238 Hz)'),
      tone: P(0, 1, 0.5, '', 'manual', 'balance 238 Hz (0) to 476 Hz (1) resonator, p. 6; centre = equal'),
      snappy: P(0, 1, 0.5, '', 'manual', 'noise and snappy contour amplitude (VR9)'),
      decay: P(0.03, 0.5, 0.06, 's', 'manual', 'p. 14: 60 ms at mid, time to 1/10 of the peak'),
      noiseDecay: P(0.03, 0.6, 0.11, 's', 'manual', 'noise gate tau 48 ms (Q48, C56 x R194) = 0.11 s to 1/10')
    }, 0.1),
    build: function (inst) {
      var ctx = inst.ctx;
      inst.trigger = function (t, ev) {
        var p = inst.params, a = ampOf(ev, inst), v = voice(ctx, inst), sn = p.snappy;
        var tcB = tcOf(p.decay), tcN = tcOf(p.noiseDecay), end = t + Math.max(p.decay, p.noiseDecay, 0.06) * 4 + 0.05;
        var bus = v.gain(1), o1 = v.osc('sine', p.tune, t, end), o2 = v.osc('sine', p.tune * p.ratio, t, end);
        var g1 = v.gain(Math.min(1, 2 * (1 - p.tone))), g2 = v.gain(Math.min(1, 2 * p.tone));
        var gA = v.gain(0), gB = v.gain(0);
        expEnv(gA.gain, t, a * 0.3, 0, tcB);
        expEnv(gB.gain, t, a * 0.15 * sn, 0, tcOf(0.05));
        con(o1, g1); con(o2, g2); con(g1, gA); con(g2, gA); con(g1, gB); con(g2, gB); con(gA, bus); con(gB, bus);
        var n = v.noise(t, end);
        if (n) {
          var hp = v.filter('highpass', 1200, 0.7), gN = v.gain(0);       // corner 589 Hz first-order in the schematic; 800 to 1800 Hz prior
          expEnv(gN.gain, t, a * 0.7 * sn, 0, tcN);
          con(n, hp); con(hp, gN); con(gN, bus);
        }
        con(bus, outOf(v, inst, null, t));
      };
    }
  };

  // ---- claps (shared by cp808 and cp909): bandpassed noise, a few narrow pulses, then the main decay.
  // 808 (p. 6): three pulses gated by a 30 ms pulse, envelope tau 38.5 ms (R365 x C144), main decay after the third pulse.
  function clapVoice(inst, t, ev, o) {
    var ctx = inst.ctx, p = inst.params, a = o.nine ? ampOf9(ev) : ampOf(ev, inst), v = voice(ctx, inst);
    var sp = p[o.spacingKey], nb = Math.max(1, Math.round(p.bursts)), btc = p.burstDecay;
    if (o.gate) nb = Math.min(nb, Math.floor(o.gate / sp + 1e-9) + 1);       // the pulse generator only runs while the gate is on
    var tcT = tcOf(p.decay * (o.nine ? 1 : STRETCH.cp)), tLast = t + (nb - 1) * sp, end = tLast + Math.max(btc * 9, p.decay * 5.5) + 0.05;
    var n = v.noise(t, end);
    if (!n) return;
    var bp = v.filter('bandpass', p.tone, p.q), gB = v.gain(0), gT = v.gain(0), out = v.gain(1);
    if (o.hp) { var hp = v.filter('highpass', o.hp, 0.7); con(n, hp); con(hp, bp); } else con(n, bp);
    setV(gB.gain, 0, t);
    for (var i = 0; i < nb; i++) {
      var ti = t + i * sp, lv = (o.tau ? Math.exp(-i * sp / o.tau) : (i === 0 ? 1 : 0.5)) * a * 1.4;
      setV(gB.gain, lv, ti);
      target(gB.gain, 0, ti, btc);
    }
    setV(gT.gain, 0, t); lin(gT.gain, a * p.tail * 1.1, t + 0.002); target(gT.gain, 0, t + 0.002, tcT);   // the long-decay (reverb) envelope runs from the trigger, under the pulses
    con(bp, gB); con(bp, gT); con(gB, out); con(gT, out);
    con(out, outOf(v, inst, null, t));
  }
  BUILD.cp808 = {
    spec: base({
      tone: P(500, 3000, 1000, 'Hz', 'manual', 'band-pass 1000 Hz, block diagram p. 7'),
      q: P(0.5, 8, 2, '', 'prior', 'band-pass Q, no source'),
      bursts: P(1, 6, 3, '', 'manual', 'three pulses (Fig. 13-5), limited by the 30 ms gate'),
      spacing: P(0.004, 0.03, 0.01, 's', 'prior', 'tooth spacing, comparator-timed in the original, not derivable'),
      burstDecay: P(0.003, 0.02, 0.008, 's', 'prior', 'time constant of each narrow pulse, no source'),
      decay: P(0.05, 0.6, 0.1, 's', 'manual', 'p. 14: 100 ms main decay after the third pulse, to 1/10'),
      tail: P(0, 1, 0.5, '', 'prior', 'level of the main decay against the pulses')
    }, 0),
    build: function (inst) { inst.trigger = function (t, ev) { clapVoice(inst, t, ev, { spacingKey: 'spacing', hp: 0, nine: false, gate: 0.03, tau: 0.0385 }); }; }
  };

  // ---- the metal bank voices: ch808, oh808, cy808, cb808
  // sum of the six pulse oscillators (frequencies x tune ratio, optional per-unit tolerance spread)
  function metalSum(v, t0, t1, ratio, spread, freqs) {
    var bank = bankOf(v.ctx), sum = v.gain(0.16), list = freqs || bank.freqs;
    for (var i = 0; i < list.length; i++) {
      var j = spread > 0 ? 1 + (Math.random() * 2 - 1) * 0.05 * spread : 1;
      con(v.pulseOsc(bank, list[i] * ratio * j, t0, t1), sum);
    }
    return sum;
  }
  function hat808(open) {
    return {
      spec: base({
        tune: P(0.7, 1.4, 1, 'x', 'prior', 'ratio on the six oscillator frequencies'),
        spread: P(0, 1, 0, '', 'paper', 'per-oscillator tolerance jitter, +/-5 % at 1 (component tolerance, paper section 3)'),
        hp: open ? P(5000, 14000, METAL.hpOpen, 'Hz', 'manual', 'Sallen-Key high-pass C66 R147 R146 = 7.8 kHz (calculated)')
                 : P(5000, 14000, METAL.hpClosed, 'Hz', 'manual', 'Sallen-Key high-pass C72 R153 R155 = 11.7 kHz (calculated)'),
        decay: open ? P(0.09, 0.6, 0.45, 's', 'manual', 'p. 14: 90 / 450 / 600 ms, time to 1/10 of the peak')
                    : P(0.03, 0.1, 0.05, 's', 'manual', 'p. 14: 50 ms, fixed on the machine, to 1/10')
      }, 0),
      build: function (inst) {
        var ctx = inst.ctx;
        inst.trigger = function (t, ev) {
          var p = inst.params, a = ampOf(ev, inst), v = voice(ctx, inst), end = t + p.decay * STRETCH.hat * 4 + 0.1;
          var sum = metalSum(v, t, end, p.tune, p.spread);
          var bp1 = v.filter('bandpass', METAL.bp[0], 1), bp2 = v.filter('bandpass', METAL.bp[1], 1);
          var gA = v.gain(0), gB = v.gain(0), hp = v.filter('highpass', p.hp, 1.5), mix = v.gain(1);
          // two bands with separate decays (the cymbal paper's idea; 0.6 for the upper band is a prior)
          expEnv(gA.gain, t, a * 1.6, 0, tcOf(p.decay * STRETCH.hat));
          expEnv(gB.gain, t, a * 1.6, 0, tcOf(p.decay * 0.6 * STRETCH.hat));
          con(sum, bp1); con(sum, bp2); con(bp1, gA); con(bp2, gB); con(gA, mix); con(gB, mix);
          con(mix, hp);
          con(hp, outOf(v, inst, 'hat808', t));
        };
      }
    };
  }
  BUILD.ch808 = hat808(false);
  BUILD.oh808 = hat808(true);

  // ---- cy808: three bands (BPF a, BPF b, high-pass 14.4 kHz), each with its own decay; tone scales the third band
  BUILD.cy808 = {
    spec: base({
      tune: P(0.7, 1.4, 1, 'x', 'prior', 'ratio on the six oscillator frequencies'),
      spread: P(0, 1, 0, '', 'paper', 'per-oscillator tolerance jitter'),
      tone: P(0, 1, 0.5, '', 'manual', 'divider VR4 over the band outputs: mainly the third band (paper section 10)'),
      decay: P(0.35, 1.2, 0.8, 's', 'manual', 'p. 14: 350 / 800 / 1200 ms, time to 1/10; mid and high bands 0.57x and 0.21x are priors')
    }, 0),
    build: function (inst) {
      var ctx = inst.ctx;
      inst.trigger = function (t, ev) {
        var p = inst.params, a = ampOf(ev, inst), v = voice(ctx, inst), end = t + p.decay * STRETCH.cy * 4 + 0.1;
        var sum = metalSum(v, t, end, p.tune, p.spread), mix = v.gain(1);
        var bands = [[v.filter('bandpass', METAL.bp[0], 1), 1, 1], [v.filter('bandpass', METAL.bp[1], 1), 0.57, 1],
                     [v.filter('highpass', METAL.hp, 1.5), 0.21, 0.15 + 0.85 * p.tone]];
        for (var i = 0; i < bands.length; i++) {
          var g = v.gain(0);
          expEnv(g.gain, t, a * 0.95 * bands[i][2], 0, tcOf(p.decay * bands[i][1] * STRETCH.cy));
          con(sum, bands[i][0]); con(bands[i][0], g); con(g, mix);
        }
        con(mix, outOf(v, inst, null, t));
      };
    }
  };

  // ---- cb808: only the 800 and 540 Hz oscillators, band-pass, two-stage envelope (one contour generator)
  BUILD.cb808 = {
    spec: base({
      tune: P(0.7, 1.4, 1, 'x', 'manual', 'ratio on 540 and 800 Hz (1.85 ms and 1.25 ms periods, p. 14)'),
      tone: P(1000, 5000, 2640, 'Hz', 'prior', 'band-pass centre; 2.64 kHz is Reid\'s CR8000 figure and io-808\'s, the manual\'s values give 1.0 kHz'),
      decay: P(0.02, 1, 0.05, 's', 'manual', 'p. 14: 50 ms, time to 1/10; long stage of the envelope'),
      fast: P(0.005, 0.05, 0.015, 's', 'prior', 'short stage (R82 C34 in parallel with C9), io-808 15 ms')
    }, 0),
    build: function (inst) {
      var ctx = inst.ctx;
      inst.trigger = function (t, ev) {
        var p = inst.params, a = ampOf(ev, inst), v = voice(ctx, inst), end = t + Math.max(p.decay * STRETCH.cb, p.fast) * 4 + 0.1;
        var sum = metalSum(v, t, end, p.tune, 0, bankOf(ctx).cowbell);
        var bp = v.filter('bandpass', p.tone, 1), gF = v.gain(0), gL = v.gain(0), mix = v.gain(1);
        expEnv(gF.gain, t, a * 2.0 * 0.75, 0, tcOf(p.fast));
        expEnv(gL.gain, t, a * 2.0 * 0.25, 0, tcOf(p.decay * STRETCH.cb));
        con(sum, bp); con(bp, gF); con(bp, gL); con(gF, mix); con(gL, mix);
        con(mix, outOf(v, inst, null, t));
      };
    }
  };

  // ---- toms and congas: bridged-T resonator like the kick, higher pitch, short pitch drop, a little noise and a click
  // hz = [pitch at tuning 100, at tuning 0] and dec = [osc decay, noise decay] seconds. Pitch ends and the oscillator
  // decay are from the service notes' check table (p. 14); the noise decay is an io-808 prior.
  var TOMS = {
    lt808: { hz: [100, 80], dec: [0.2, 0.2] }, mt808: { hz: [160, 120], dec: [0.13, 0.155] }, ht808: { hz: [220, 165], dec: [0.1, 0.125] },
    lc808: { hz: [220, 165], dec: [0.18, 0.2] }, mc808: { hz: [310, 250], dec: [0.1, 0.155] }, hc808: { hz: [455, 370], dec: [0.08, 0.125] }
  };
  function tom808(name) {
    var d = TOMS[name];
    return {
      spec: base({
        tune: P(0, 100, 50, '%', 'manual', 'panel TUNING: pitch = low + tune/100 x (high - low), p. 14 end points'),
        decay: P(d.dec[0] * 0.4, d.dec[0] * 4, d.dec[0], 's', 'manual', 'p. 14 mid decay, time to 1/10 of the peak'),
        noiseDecay: P(0.03, 0.5, d.dec[1], 's', 'prior', 'noise decay (io-808)'),
        sweep: P(0, 1, 0.3, '', 'manual', 'germanium diodes: first few ms 1.2 to 1.4x higher in pitch (p. 6)'),
        noise: P(0, 1, 1, '', 'prior', 'noise level (io-808 gain 0.2)'),
        click: P(0, 1, 1, '', 'prior', 'trigger edge (io-808 1 ms, gain 0.3)')
      }, 0),
      build: function (inst) {
        var ctx = inst.ctx;
        inst.trigger = function (t, ev) {
          var p = inst.params, a = ampOf(ev, inst), v = voice(ctx, inst), f = d.hz[1] + p.tune / 100 * (d.hz[0] - d.hz[1]);
          var end = t + Math.max(p.decay, p.noiseDecay) * 4 + 0.05, mix = v.gain(1);
          var o = v.osc('sine', f * (1 + p.sweep), t, end);
          target(o.frequency, f, t, 0.005);
          var g = v.gain(0);
          expEnv(g.gain, t, a * 0.65, 0, tcOf(p.decay));
          con(o, g); con(g, mix);
          var n = v.noise(t, end);
          if (n) {
            var lp = v.filter('lowpass', 10000, 0.7), gN = v.gain(0);
            expEnv(gN.gain, t, a * 0.2 * 2 * p.noise, 0, tcOf(p.noiseDecay));
            con(n, lp); con(lp, gN); con(gN, mix);
          }
          var cg = v.gain(a * 0.3 * p.click), s = v.buf(pulseBuf(ctx, 1), t, t + 0.01);
          con(s, cg); con(cg, mix);
          con(mix, outOf(v, inst, null, t));
        };
      }
    };
  }
  for (var tn in TOMS) if (TOMS.hasOwnProperty(tn)) BUILD[tn] = tom808(tn);

  // ---- cl808: IC20a bridged-T, R312 R308 C117 give 2526 Hz (table 2500 Hz), 25 ms
  BUILD.cl808 = {
    spec: base({
      tune: P(1500, 4000, 2526, 'Hz', 'manual', 'schematic 2526 Hz, check table 2500 Hz (0.4 ms)'),
      decay: P(0.01, 0.1, 0.025, 's', 'manual', 'p. 14: 25 ms, time to 1/10'),
      q: P(0.5, 12, 3, '', 'prior', 'band-pass Q')
    }, 0),
    build: function (inst) {
      var ctx = inst.ctx;
      inst.trigger = function (t, ev) {
        var p = inst.params, a = ampOf(ev, inst), v = voice(ctx, inst), tc = tcOf(p.decay), end = t + p.decay * 4 + 0.03;
        var o = v.osc('triangle', p.tune, t, end), bp = v.filter('bandpass', p.tune, p.q), g = v.gain(0);
        expEnv(g.gain, t, a * 1.6, 0, tc);
        con(o, bp); con(bp, g); con(g, outOf(v, inst, null, t));
      };
    }
  };

  // ---- rs808: IC21 bridged-T at 452.5 Hz (table 455 Hz) and the table's 1667 Hz element, plus a click; decay 10 ms
  BUILD.rs808 = {
    spec: base({
      tune: P(0.5, 2, 1, 'x', 'prior', 'ratio on every frequency'),
      decay: P(0.005, 0.08, 0.01, 's', 'manual', 'p. 14: 10 ms, time to 1/10'),
      click: P(0, 1, 0.5, '', 'prior', '2 ms trigger edge')
    }, 0.2),
    build: function (inst) {
      var ctx = inst.ctx;
      inst.trigger = function (t, ev) {
        var p = inst.params, a = ampOf(ev, inst), v = voice(ctx, inst), tc = tcOf(p.decay), end = t + p.decay * 4 + 0.03, r = p.tune;
        var mix = v.gain(1);
        var o1 = v.osc('sine', 452.5 * r, t, end), bp = v.filter('bandpass', 452.5 * r, 2), g1 = v.gain(0);
        expEnv(g1.gain, t, a * 1.4, 0, tc);
        con(o1, bp); con(bp, g1); con(g1, mix);
        var o2 = v.osc('triangle', 1667 * r, t, end), hp = v.filter('highpass', 1667 * r, 0.7), g2 = v.gain(0);
        expEnv(g2.gain, t, a * 0.6, 0, tc);
        con(o2, hp); con(hp, g2); con(g2, mix);
        var cg = v.gain(a * 0.5 * p.click), s = v.buf(pulseBuf(ctx, 2), t, t + 0.02);
        con(s, cg); con(cg, mix);
        con(mix, outOf(v, inst, null, t));
      };
    }
  };

  // ---- ma808: noise through the Q68 high-pass (RC corners 2.34 to 10.6 kHz), linear decay 25 ms (short) or 35 ms (long)
  BUILD.ma808 = {
    spec: base({
      tone: P(1500, 9000, 2340, 'Hz', 'manual', 'high-pass lower corner 1/(2 pi 68k 1n) = 2.34 kHz; a 10.6 kHz low-pass follows'),
      decay: P(0.01, 0.1, 0.025, 's', 'manual', 'p. 14: 25 ms (short) or 35 ms (long)')
    }, 0),
    build: function (inst) {
      var ctx = inst.ctx;
      inst.trigger = function (t, ev) {
        var p = inst.params, a = ampOf(ev, inst), v = voice(ctx, inst), end = t + p.decay + 0.03;
        var n = v.noise(t, end);
        if (!n) return;
        var hp = v.filter('highpass', p.tone, 0.7), lp = v.filter('lowpass', 10600, 0.7), g = v.gain(0);
        setV(g.gain, 0, t); lin(g.gain, a * 0.5, t + 0.0002); lin(g.gain, 0, t + 0.0002 + p.decay);
        con(n, hp); con(hp, lp); con(lp, g); con(g, outOf(v, inst, null, t));
      };
    }
  };

  // ================================================================ TR-909
  // ---- bd909: sine body with an exponential pitch fall from `start` to `end` (time constant = panel Tune), flat for
  // `hold` then a time-constant decay, plus a click (panel Attack). andremichelle/tr-909 bassdrum.ts / preset.ts.
  BUILD.bd909 = {
    spec: base({
      start: P(150, 400, BD909.start, 'Hz', 'source', 'bassdrum.ts FreqStart 274; the VCO frequency is not resolved in the manual'),
      end: P(40, 70, BD909.end, 'Hz', 'source', 'bassdrum.ts FreqEnd 53'),
      tune: P(0.007, 0.04, 0.007, 's (time constant)', 'manual', 'pitch envelope R57 22k x C9 0.33u = 7.3 ms, with VR2 100k = 40 ms; source default 7 ms (7 to 29.4)'),
      decay: P(0.0155, 0.35, 0.035, 's (time constant)', 'manual', 'R58 47k x C8 0.33u = 15.5 ms up to 346 ms with VR5 1M; source default 35 ms (12 to 100)'),
      hold: P(0, 0.1, BD909.hold, 's', 'source', 'ReleaseStartTime 0.060'),
      attack: P(-12, 6, 0, 'dB', 'source', 'panel Attack = click gain in dB (bassdrum.ts 36); the range is a choice'),
      clickDecay: P(0.0003, 0.003, 0.0007, 's', 'manual', 'ENV2: R41 22k x C12 0.033u = 0.73 ms'),
      clickLp: P(500, 8000, 3000, 'Hz', 'prior', 'ER-99 3 kHz')
    }, 0.1),
    build: function (inst) {
      var ctx = inst.ctx;
      inst.trigger = function (t, ev) {
        var p = inst.params, a = ampOf9(ev), v = voice(ctx, inst);
        var end = t + 0.0003 + p.hold + p.decay * 9 + 0.03;
        var o = v.osc('sine', p.start, t, end);
        target(o.frequency, p.end, t, p.tune);
        var g = v.gain(0), mix = v.gain(1);
        expEnv(g.gain, t, a * 0.65, p.hold, p.decay);
        con(o, g); con(g, mix);
        var n = v.noise(t, t + p.clickDecay * 9 + 0.02);
        if (n) {
          var lp = v.filter('lowpass', p.clickLp, 0.7), gc = v.gain(0);
          expEnv(gc.gain, t, a * 0.4 * dbToGain(p.attack), 0, p.clickDecay);
          con(n, lp); con(lp, gc); con(gc, mix);
        }
        con(mix, outOf(v, inst, null, t));
      };
    }
  };

  // ---- sd909: two sine body oscillators with a short downward glide + high-passed noise. Tune = octaves on the body
  // (snaredrum.ts 22), Tone = noise decay time constant 40 to 200 ms (preset.ts 73), Snappy = noise gain in dB.
  BUILD.sd909 = {
    spec: base({
      tune: P(-0.5, 0.5, 0, 'oct', 'source', 'preset.ts 76 TuneMapping, applied to the tone part only'),
      tone: P(0.10, 0.34, 0.2, 's (time constant)', 'source', 'noise decay, preset.ts 73 default 200 ms (range 40 to 200); the manual\'s RC gives 103 to 338 ms, unreconciled'),
      snappy: P(-18, 6, 0, 'dB', 'source', 'noise gain, snaredrum.ts 24; the range is a choice'),
      base: P(120, 300, 190, 'Hz', 'prior', 'body oscillator 1; absolute pitch not resolved in the manual (VR6 tune pot)'),
      ratio: P(1.2, 1.8, 1.47, 'x', 'manual', 'VCO-2 over VCO-1 = C69 0.01u / C71 0.0068u'),
      bodyDecay: P(0.04, 0.3, 0.1, 's', 'prior', 'seconds to 1/10, ER-99 100 ms'),
      glide: P(0, 4, 1, 'x', 'prior', 'extra pitch at the start = f x (1 + glide); ER-99 4x'),
      glideTime: P(0.01, 0.03, 0.02, 's', 'manual', 'pitch bend "about 20 ms" (p. 6)'),
      hpf: P(800, 6000, 2000, 'Hz', 'prior', 'noise high-pass, no source')
    }, 0.04),
    build: function (inst) {
      var ctx = inst.ctx;
      inst.trigger = function (t, ev) {
        var p = inst.params, a = ampOf9(ev), v = voice(ctx, inst), ng = dbToGain(p.snappy);
        var f1 = p.base * Math.pow(2, p.tune), tcB = tcOf(p.bodyDecay), end = t + Math.max(p.bodyDecay * 4, p.tone * 7) + 0.05;
        var bus = v.gain(1), gB = v.gain(0);
        expEnv(gB.gain, t, a * 0.4, 0, tcB);
        for (var i = 0; i < 2; i++) {
          var f = f1 * (i ? p.ratio : 1), o = v.osc('sine', f * (1 + p.glide), t, end);
          target(o.frequency, f, t, p.glideTime / 3);
          con(o, gB);
        }
        con(gB, bus);
        var n = v.noise(t, end);
        if (n) {
          var hp = v.filter('highpass', p.hpf, 0.7), gN = v.gain(0);
          expEnv(gN.gain, t, a * 0.35 * ng, 0, p.tone);
          con(n, hp); con(hp, gN); con(gN, bus);
        }
        con(bus, outOf(v, inst, null, t));
      };
    }
  };

  // ---- toms: pitched sine with a pitch envelope and a little noise; hold 30 ms then time-constant decay
  // (processor.ts 139-143, preset.ts 72). Base pitches and pitch envelope are priors (ER-99).
  var TOMS909 = { lt909: 100, mt909: 160, ht909: 240 };
  function tom909(name) {
    var f0 = TOMS909[name];
    return {
      spec: base({
        tune: P(-0.5, 0.5, 0, 'oct', 'source', 'preset.ts 76 TuneMapping around the tom base'),
        decay: P(0.038, 0.38, 0.15, 's (time constant)', 'manual', 'ENV2 R111 56k x C21 0.68u = 38 ms up to 378 ms with VR11 500k; source default 150 ms (40 to 150)'),
        hold: P(0.01, 0.1, 0.03, 's', 'source', 'processor.ts 139-143 release start 30 ms'),
        base: P(f0 * 0.6, f0 * 1.6, f0, 'Hz', 'prior', 'ER-99 100/200/300 adjusted, memory'),
        depth: P(0, 3, 1, 'x', 'prior', 'pitch envelope extra = f x depth; ER-99 2x'),
        pitchDecay: P(0.02, 0.25, 0.1, 's (time constant)', 'prior', 'ER-99 100 ms'),
        noise: P(0, 0.3, 0.05, '', 'prior', 'ER-99 0.05')
      }, 0.1),
      build: function (inst) {
        var ctx = inst.ctx;
        inst.trigger = function (t, ev) {
          var p = inst.params, a = ampOf9(ev), v = voice(ctx, inst), f = p.base * Math.pow(2, p.tune);
          var end = t + p.hold + p.decay * 9 + 0.05, mix = v.gain(1);
          var o = v.osc('sine', f * (1 + p.depth), t, end);
          target(o.frequency, f, t, p.pitchDecay);
          var g = v.gain(0);
          expEnv(g.gain, t, a * 0.65, p.hold, p.decay);
          con(o, g); con(g, mix);
          var n = v.noise(t, t + 0.06);
          if (n) { var gN = v.gain(0); expEnv(gN.gain, t, a * p.noise, 0, 0.008); con(n, gN); con(gN, mix); }
          con(mix, outOf(v, inst, null, t));
        };
      }
    };
  }
  for (var t9 in TOMS909) if (TOMS909.hasOwnProperty(t9)) BUILD[t9] = tom909(t9);

  // ---- rs909: click into three parallel band-passes F1 495, F2 219, F3 1053 Hz (manual, from C and R; ER-99 had 500/220/950
  // with Q 10.5 and gains 10:20:30, kept as priors), high-pass 100
  BUILD.rs909 = {
    spec: base({
      tune: P(0.5, 2, 1, 'x', 'manual', 'ratio on the three resonances 495, 219, 1053 Hz'),
      decay: P(0.003, 0.01, 0.005, 's', 'manual', 'scope: ringing about 5 ms; seconds to 1/10'),
      q: P(2, 20, 10.5, '', 'prior', 'ER-99 10.5')
    }, 0.6),
    build: function (inst) {
      var ctx = inst.ctx;
      inst.trigger = function (t, ev) {
        var p = inst.params, a = ampOf9(ev), v = voice(ctx, inst), end = t + p.decay * 4 + 0.05;
        var s = v.buf(pulseBuf(ctx, 1), t, t + 0.02), sum = v.gain(1), hp = v.filter('highpass', 100, 0.7), g = v.gain(0);
        var fs = [219, 495, 1053], gs = [10, 20, 30];
        for (var i = 0; i < 3; i++) {
          var bp = v.filter('bandpass', fs[i] * p.tune, p.q), gi = v.gain(gs[i] / 60 * 2.2);
          con(s, bp); con(bp, gi); con(gi, sum);
        }
        expEnv(g.gain, t, a * 1.0, 0, tcOf(p.decay));
        con(sum, hp); con(hp, g); con(g, outOf(v, inst, null, t));
      };
    }
  };

  // ---- cp909: the clap circuit (SOS: generated by a circuit, not a sample). Noise through a band-pass and a 185 Hz high-pass
  // (R202 39k, C56 0.022u, manual); burst count, spacing and band-pass centre are unresolved in the scan (ER-99: 1200 Hz, 10 ms).
  BUILD.cp909 = {
    spec: base({
      tone: P(700, 2500, 1200, 'Hz', 'prior', 'ER-99 band-pass 1200'),
      q: P(0.5, 4, 1, '', 'prior', 'band-pass Q'),
      spread: P(0.004, 0.02, 0.01, 's', 'prior', 'burst spacing, by eye on the scope, ER-99 10 ms'),
      bursts: P(3, 5, 4, '', 'prior', 'scope by eye, about 4 to 5'),
      burstDecay: P(0.003, 0.02, 0.008, 's', 'prior', 'time constant of each burst'),
      decay: P(0.1, 0.6, 0.1, 's', 'prior', 'tail, seconds to 1/10; the scope shows a tail of roughly 0.1 s'),
      tail: P(0, 1, 0.4, '', 'prior', 'tail amount')
    }, 0),
    build: function (inst) { inst.trigger = function (t, ev) { clapVoice(inst, t, ev, { spacingKey: 'spread', hp: 185, nine: true, gate: 0, tau: 0 }); }; }
  };

  // ---- the sampled 909 voices, synthesised once per context into buffers (plain JS DSP)
  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function biquad(type, fc, q, sr) {
    var w = 2 * Math.PI * Math.min(fc, sr * 0.45) / sr, c = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al, b0, b1, b2;
    if (type === 'lowpass') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
    return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: -2 * c / a0, a2: (1 - al) / a0 };
  }
  function runBiquad(co, x) {
    var x1 = 0, x2 = 0, y1 = 0, y2 = 0, y;
    for (var i = 0; i < x.length; i++) {
      y = co.b0 * x[i] + co.b1 * x1 + co.b2 * x2 - co.a1 * y1 - co.a2 * y2;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y;
    }
  }
  // kind: 'ch' | 'oh' (flat, the voice applies hold + decay), 'cr' | 'rd' (envelope baked in, plays through).
  // Lengths are the ROM address ranges at the 30 kHz sample clock (manual p. 5): closed 0x2000, open 0x6000, crash/ride 0x8000 samples.
  var HAT_KINDS = {
    ch: { n: ROM909.ch, hp: 6000, lp: 9000, noise: 0.6, env: null, seed: 909001 },
    oh: { n: ROM909.oh, hp: 6000, lp: 9000, noise: 0.5, env: null, seed: 909002 },
    cr: { n: ROM909.cr, hp: 3000, lp: 12000, noise: 0.7, env: [[0.22, 0.6], [0.55, 0.4]], seed: 909003 },
    rd: { n: ROM909.rd, hp: 2500, lp: 12000, noise: 0.35, env: [[0.25, 0.7], [0.6, 0.3]], seed: 909004 }
  };
  // crush 0: a clean buffer at the context rate; crush > 0: the 6-bit, 30 kHz ROM character (bits 8 - 2 x crush, 6 at 1)
  function renderHat(ctx, kind, crush) {
    var cfg = HAT_KINDS[kind], rom = crush > 0, sr = rom ? ROM909.rate : (ctx.sampleRate || 44100);
    var n = rom ? cfg.n : Math.round(cfg.n / ROM909.rate * sr), x = new Float32Array(n), rnd = mulberry(cfg.seed);
    var i, j, fr = METAL.freqs, ph = [];
    for (j = 0; j < fr.length; j++) ph.push(rnd());
    var mul = (kind === 'rd') ? 3 : (kind === 'cr' ? 5 : 7);          // oscillator ratios are priors; shifted up so the band-limit keeps metal
    for (i = 0; i < n; i++) {
      var s = 0, tt = i / sr;
      for (j = 0; j < fr.length; j++) { var q = (tt * fr[j] * mul + ph[j]) % 1; s += q < METAL.duty ? 1 : -1; }
      x[i] = s / fr.length * (1 - cfg.noise) + (rnd() * 2 - 1) * cfg.noise;
    }
    runBiquad(biquad('highpass', cfg.hp, 0.7, sr), x);
    runBiquad(biquad('lowpass', cfg.lp, 0.7, sr), x);
    runBiquad(biquad('lowpass', cfg.lp, 0.7, sr), x);
    var fade = Math.round(0.01 * sr);
    for (i = 0; i < n; i++) {
      var te = i / sr, e = 1;
      if (cfg.env) { e = 0; for (j = 0; j < cfg.env.length; j++) e += cfg.env[j][1] * Math.exp(-te / cfg.env[j][0]); e *= Math.min(1, te / 0.002); }
      if (n - i < fade) e *= (n - i) / fade;                           // no click when the ROM run ends
      x[i] *= e;
    }
    var pk = 0;
    for (i = 0; i < n; i++) if (Math.abs(x[i]) > pk) pk = Math.abs(x[i]);
    var sc = pk > 0 ? 0.9 / pk : 1;
    if (rom) {                                                          // 6-bit DAC (hex latch + resistor ladder)
      var lv = Math.pow(2, 8 - 2 * crush - 1);
      for (i = 0; i < n; i++) x[i] = Math.round(x[i] * sc * lv) / lv;
      sc = 1;
    }
    var b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    for (i = 0; i < n; i++) d[i] = x[i] * sc;
    return b;
  }
  function hatBuf(ctx, kind, crush) {
    var c = cacheOf(ctx), key = kind + ':' + Math.round(crush * 100);
    if (!c.bufs[key]) { try { c.bufs[key] = renderHat(ctx, kind, crush); } catch (e) { c.bufs[key] = null; } }
    return c.bufs[key];
  }
  function hat909(open) {
    var kind = open ? 'oh' : 'ch';
    return {
      spec: base({
        decay: open ? P(0.03, 0.16, 0.069, 's (time constant)', 'source', 'preset.ts 74 OpenedHihatMapping, default about 69 ms')
                    : P(0.008, 0.06, 0.008, 's (time constant)', 'source', 'preset.ts 75 ClosedHihatMapping, default 8 ms; the manual puts the closed path at 1/10 of the open one for the same pot position'),
        hold: open ? P(0.004, 0.05, 0.012, 's', 'source', 'processor.ts 150 release start 0.012') : P(0.002, 0.05, 0.006, 's', 'source', 'processor.ts 151 release start 0.006'),
        crush: P(0, 1, 1, '', 'manual', '1 = the ROM: 6-bit (hex latch IC68 + RA9), 30 kHz clock (60 kHz / 2); 0 = a clean buffer')
      }, 0),
      build: function (inst) {
        var ctx = inst.ctx;
        inst.trigger = function (t, ev) {
          var p = inst.params, a = ampOf9(ev), v = voice(ctx, inst), b = hatBuf(ctx, kind, p.crush);
          if (!b) return;
          var end = Math.min(t + p.hold + p.decay * 9 + 0.02, t + b.duration), g = v.gain(0);
          expEnv(g.gain, t, a, p.hold, p.decay);
          con(v.buf(b, t, end, 1), g);
          con(g, outOf(v, inst, 'hat909', t));
        };
      }
    };
  }
  BUILD.ch909 = hat909(false);
  BUILD.oh909 = hat909(true);
  function cym909(kind) {
    return {
      spec: base({
        tune: P(-0.5, 0.5, 0, 'oct', 'source', 'preset.ts 76 TuneMapping (crash, ride); the Tune pot (VR25 10k) wiring may allow only about +-2 st, unresolved. Pitch and length move together'),
        crush: P(0, 1, 1, '', 'manual', '1 = the ROM: 6-bit, 30 kHz; 0 = a clean buffer')
      }, 0),
      build: function (inst) {
        var ctx = inst.ctx;
        inst.trigger = function (t, ev) {
          var p = inst.params, a = ampOf9(ev), v = voice(ctx, inst), b = hatBuf(ctx, kind, p.crush);
          if (!b) return;
          var rate = Math.pow(2, p.tune), g = v.gain(a);
          con(v.buf(b, t, t + b.duration / rate + 0.02, rate), g);
          con(g, outOf(v, inst, null, t));
        };
      }
    };
  }
  BUILD.cr909 = cym909('cr');
  BUILD.rd909 = cym909('rd');

  // ------------------------------------------------------------ API
  var TYPES = [
    'bd808', 'sd808', 'cp808', 'ch808', 'oh808', 'cy808', 'cb808', 'lt808', 'mt808', 'ht808', 'lc808', 'mc808', 'hc808', 'rs808', 'cl808', 'ma808',
    'bd909', 'sd909', 'lt909', 'mt909', 'ht909', 'rs909', 'cp909', 'ch909', 'oh909', 'cr909', 'rd909'
  ];

  function has(type) { return BUILD.hasOwnProperty(type); }
  function create(ctx, type, opts) {
    var def = BUILD[type];
    if (!def) {
      try { if (typeof console !== 'undefined' && console.warn) console.warn('[Drums] unknown instrument "' + type + '"'); } catch (e) {}
      def = { spec: { level: { min: 0, max: 1.5, value: 1 } }, build: function () {} };
      type = 'unknown';
    }
    var spec = {};
    for (var p in def.spec) if (def.spec.hasOwnProperty(p)) {
      spec[p] = {};
      for (var q in def.spec[p]) if (def.spec[p].hasOwnProperty(q)) spec[p][q] = def.spec[p][q];
    }
    return makeInst(ctx || null, type, spec, opts, def.build);
  }

  root.Drums = {
    create: create, has: has,
    types: function () { return TYPES.slice(); },
    spec: function (t) { return BUILD[t] ? BUILD[t].spec : null; },
    bank: bankOf,                       // the shared metal bank of a context: {freqs, duty, bp, bpPaper, hp, hpPaper, hpOpen, hpClosed, cowbell, wave}
    ACC808: ACC808, ROM909: ROM909,
    METAL: METAL, STEP_DB: STEP_DB.slice(),
    pulseCoeffs: pulseCoeffs
  };
})();
