/* Havantechno studio - sequencer.js
 * Global `Sequencer`: a 16-step pattern sequencer with an arrangement, a mixer and offline rendering.
 *
 *   var seq = Sequencer.create(ctx, {bpm: 126, swing: 0.08});
 *   seq.addSend('delay', {type: 'delay', division: '3/16', mix: 1});
 *   seq.addTrack('kick', {inst: 'kick', patterns: {A: 'x...x...x...x...'}, duck: ['sub', 'bass']});
 *   seq.addTrack('stab', {inst: 'stab', chords: true, octave: 4, patterns: {A: '..x...xx..x...xx'}, sends: {delay: 0.2}});
 *   seq.progression = ['Bmaj9', 'Bmaj9', 'G#m7', 'Emaj7'];
 *   seq.setArrangement([{name: 'intro', bars: 16, play: {kick: 'A'}}, {name: 'main', bars: 32, play: {kick: 'A', stab: 'A'}}]);
 *   seq.play(); seq.jump('main'); seq.loop('main'); seq.stop();
 *   seq.on('step', function (e) { e.step, e.bar, e.section, e.time });
 *   Sequencer.render(buildFn, {sampleRate: 44100}).then(function (audioBuffer) { ... });
 *
 * Pattern strings: 16 chars per bar, 'x' hit, 'X' accent, 'o' soft, '.' rest (arrays = several bars).
 * Melodies: 8 or 16 tokens per bar, note names ('C#5', 'C#5!' = accent), '-' sustain, '.' rest.
 * Section fields: name, bars, play {track: variation}, set {path: value}, ramp [{param, from, to, bars:[a,b], curve}],
 *                 fx [{bar, step, track, bars, vel}], progression [chords].
 * Parameter paths: 'kick.decay', 'stab.gain', 'stab.delay.mix' (an insert by name), 'send.reverb.mix', 'master.hp.cutoff'.
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var K = root.Kit, Synths = root.Synths, Processors = root.Processors, SD = root.SongDoc;
  var clamp = K.clamp, disc = K.disc;
  var VEL = { x: 0.85, X: 1.0, o: 0.5, 'x!': 1 };
  var STEPS = 16;

  function isArr(a) { return Object.prototype.toString.call(a) === '[object Array]'; }
  function warn(msg) { try { if (typeof console !== 'undefined' && console.warn) console.warn('[Sequencer] ' + msg); } catch (e) {} }

  // ------------------------------------------------------------ parsing
  // 'x...x...' | ['x...', '....'] -> [[vel|null x16], ...]
  function parsePattern(p) {
    var bars = isArr(p) ? p : [p], out = [], b, i, s, row;
    for (b = 0; b < bars.length; b++) {
      s = String(bars[b] || '').replace(/\s+/g, '');
      row = [];
      for (i = 0; i < STEPS; i++) { var c = s.charAt(i); row.push(VEL.hasOwnProperty(c) ? VEL[c] : null); }
      out.push(row);
    }
    return out;
  }
  // melody bars -> {bars, ev: {stepIndex: {midi, len (steps), vel}}}
  function parseMelody(lines) {
    var bars = isArr(lines) ? lines : [lines], ev = {}, last = null, b, i;
    for (b = 0; b < bars.length; b++) {
      var tk = String(bars[b] || '').trim().split(/\s+/), per = tk.length <= 8 ? 2 : 1;
      for (i = 0; i < tk.length && i * per < STEPS; i++) {
        var tok = tk[i], st = b * STEPS + i * per;
        if (tok === '-') { if (last) last.len += per; continue; }
        last = null;
        if (!tok || tok === '.') continue;
        var acc = /!$/.test(tok), m = K.ntom(tok.replace(/!$/, ''));
        if (m == null) continue;
        last = { midi: m, len: per, vel: acc ? 1 : 0.85 };
        ev[st] = last;
      }
    }
    return { bars: bars.length, ev: ev };
  }

  // ------------------------------------------------------------ WAV encoder (16-bit PCM)
  function wav(buffer) {
    var ch = buffer.numberOfChannels, n = buffer.length, sr = buffer.sampleRate, i, c;
    var bytes = 44 + n * ch * 2, ab = new ArrayBuffer(bytes), dv = new DataView(ab), p = 0;
    function str(s) { for (var k = 0; k < s.length; k++) dv.setUint8(p++, s.charCodeAt(k)); }
    function u32(v) { dv.setUint32(p, v, true); p += 4; }
    function u16(v) { dv.setUint16(p, v, true); p += 2; }
    str('RIFF'); u32(bytes - 8); str('WAVE'); str('fmt '); u32(16); u16(1); u16(ch); u32(sr); u32(sr * ch * 2); u16(ch * 2); u16(16);
    str('data'); u32(n * ch * 2);
    var data = [];
    for (c = 0; c < ch; c++) data.push(buffer.getChannelData(c));
    for (i = 0; i < n; i++) for (c = 0; c < ch; c++) {
      var x = clamp(data[c][i], -1, 1);
      dv.setInt16(p, x < 0 ? x * 32768 : x * 32767, true); p += 2;
    }
    return ab;
  }

  // ------------------------------------------------------------ sequencer
  function create(ctx, opts) {
    opts = opts || {};
    var seq = {
      ctx: ctx || null, tracks: {}, order: [], sends: {}, sendOrder: [], sections: [], totalBars: 0, progression: ['C'],
      playing: false, loopSection: null, loopAll: true, master: null, out: null, analyser: null,
      _bpm: opts.bpm || 120, _swing: clamp(opts.swing || 0, 0, 1), _lookahead: opts.lookahead || 0.12, _interval: opts.interval || 25,
      seed: opts.seed || 1, held: {},
      _step: 0, _next: 0, _timer: null, _events: [], _listeners: {}, _hitCount: {}, _pendingSet: [], _soloed: 0, _counted: 0
    };
    var live = !!ctx;

    // master + output
    if (live) {
      try {
        seq.master = Processors.master(ctx);
        seq.out = ctx.createGain();
        seq.master.output.connect(seq.out);
        if (typeof ctx.createAnalyser === 'function') {
          try { seq.analyser = ctx.createAnalyser(); seq.analyser.fftSize = 256; seq.out.connect(seq.analyser); } catch (e) { seq.analyser = null; }
        }
        seq.out.connect(ctx.destination);
      } catch (e) { live = false; seq.master = Processors.master(null); }
    } else {
      seq.master = Processors.master(null);
    }

    Object.defineProperty(seq, 'bpm', {
      enumerable: true, get: function () { return seq._bpm; },
      set: function (v) {
        v = Number(v); if (v !== v) return;
        seq._bpm = clamp(v, 40, 300);
        for (var k in seq.sends) if (seq.sends.hasOwnProperty(k) && seq.sends[k].spec && seq.sends[k].spec.bpm) seq.sends[k].set('bpm', seq._bpm);
        for (var t in seq.tracks) if (seq.tracks.hasOwnProperty(t) && seq.tracks[t].chain) {
          var pr = seq.tracks[t].chain.procs;
          for (var i = 0; i < pr.length; i++) if (pr[i].spec && pr[i].spec.bpm) pr[i].set('bpm', seq._bpm);
        }
      }
    });
    Object.defineProperty(seq, 'swing', { enumerable: true, get: function () { return seq._swing; }, set: function (v) { v = Number(v); if (v === v) seq._swing = clamp(v, 0, 1); } });
    seq.stepSec = function () { return 60 / seq._bpm / 4; };
    seq.barSec = function () { return 240 / seq._bpm; };

    // ---------------------------------------------------------- sends
    seq.addSend = function (name, spec) {
      var p = (spec && spec.input !== undefined) ? spec : null;
      if (!p) {
        var o = {}, type = typeof spec === 'string' ? spec : (spec && spec.type) || name;
        if (spec && typeof spec === 'object') for (var k in spec) if (spec.hasOwnProperty(k) && k !== 'type') o[k] = spec[k];
        p = Processors.create(seq.ctx, type, o);
      }
      p.name = name;
      if (p.spec && p.spec.bpm) p.set('bpm', seq._bpm);
      if (live && p.output) { try { p.output.connect(seq.master.input); } catch (e) {} }
      seq.sends[name] = p;
      seq.sendOrder.push(name);
      return p;
    };

    // ---------------------------------------------------------- tracks
    seq.addTrack = function (name, def) {
      def = def || {};
      var tr = { name: name, def: def, inst: null, chain: null, sc: null, channel: null, sendGains: {}, variants: {},
                 muted: false, solo: false, noteIdx: 0, kind: 'drum' };
      tr.inst = (def.inst && def.inst.trigger) ? def.inst : Synths.create(seq.ctx, def.inst || name, def.params);
      if (def.params && tr.inst.set) for (var pk in def.params) if (def.params.hasOwnProperty(pk)) tr.inst.set(pk, def.params[pk]);
      var k;
      if (def.kind) tr.kind = def.kind;
      else if (def.chords) tr.kind = 'chord';
      else if (def.melody) tr.kind = 'melody';
      else if (def.note != null || def.notes) tr.kind = 'note';
      // variants: {A: 'x...' | ['x...', ...] | melody tokens | {bars, cells}} (SongDoc), plus the old patterns / melody keys
      if (def.variants) for (k in def.variants) if (def.variants.hasOwnProperty(k)) tr.variants[k] = SD.parseVariant(def.variants[k], tr.kind);
      if (def.patterns) for (k in def.patterns) if (def.patterns.hasOwnProperty(k)) tr.variants[k] = SD.parsePattern(def.patterns[k]);
      if (def.pattern) tr.variants.A = SD.parsePattern(def.pattern);
      if (def.melody) {
        if (isArr(def.melody) || typeof def.melody === 'string') tr.variants.A = SD.parseMelody(def.melody);
        else for (k in def.melody) if (def.melody.hasOwnProperty(k)) tr.variants[k] = SD.parseMelody(def.melody[k]);
      }
      tr.note = def.note != null ? K.ntom(def.note) : null;
      tr.notes = def.notes ? (isArr(def.notes) ? def.notes : String(def.notes).trim().split(/\s+/)).map(K.ntom) : null;
      tr.octave = def.octave == null ? 4 : def.octave;
      tr.voicing = def.voicing || null;
      tr.gate = def.gate == null ? 0.6 : def.gate;          // in steps
      tr.duck = def.duck || null;
      tr.chain = Processors.chain(seq.ctx, def.chain || []);
      tr.sc = Processors.create(seq.ctx, 'sidechain', def.sidechain || {});
      tr.channel = Processors.channel(seq.ctx, { gain: def.gain == null ? 0.8 : def.gain, pan: def.pan || 0 });
      if (live) {
        try {
          tr.inst.out.connect(tr.chain.input);
          tr.chain.output.connect(tr.sc.input);
          tr.sc.output.connect(tr.channel.input);
          tr.channel.output.connect(seq.master.input);
          if (def.sends) for (k in def.sends) if (def.sends.hasOwnProperty(k) && seq.sends[k] && seq.sends[k].input) {
            var g = ctx.createGain(); K.val(g.gain, def.sends[k]);
            tr.channel.output.connect(g); g.connect(seq.sends[k].input); tr.sendGains[k] = g;
          }
        } catch (e) {}
      }
      seq.tracks[name] = tr;
      seq.order.push(name);
      seq._hitCount[name] = 0;
      return tr;
    };

    seq.setSend = function (track, send, level) {
      var tr = seq.tracks[track]; if (!tr) return false;
      if (tr.sendGains[send]) { K.target(tr.sendGains[send].gain, clamp(level, 0, 1.5), ctx.currentTime, 0.02); return true; }
      if (live && seq.sends[send] && seq.sends[send].input) {
        try { var g = ctx.createGain(); K.val(g.gain, clamp(level, 0, 1.5)); tr.channel.output.connect(g); g.connect(seq.sends[send].input); tr.sendGains[send] = g; return true; } catch (e) {}
      }
      return false;
    };
    seq.sendLevel = function (track, send) {
      var tr = seq.tracks[track]; if (!tr) return 0;
      if (tr.sendGains[send]) return tr.sendGains[send].gain.value;
      return (tr.def.sends && tr.def.sends[send]) || 0;
    };

    function applyMutes() {
      for (var n in seq.tracks) if (seq.tracks.hasOwnProperty(n)) {
        var tr = seq.tracks[n];
        tr.channel.set('mute', tr.muted || (seq._soloed > 0 && !tr.solo));
      }
    }
    seq.mute = function (name, b) { var tr = seq.tracks[name]; if (!tr) return; tr.muted = b == null ? !tr.muted : !!b; applyMutes(); return tr.muted; };
    seq.solo = function (name, b) {
      var tr = seq.tracks[name]; if (!tr) return;
      var was = tr.solo; tr.solo = b == null ? !tr.solo : !!b;
      if (tr.solo !== was) seq._soloed += tr.solo ? 1 : -1;
      applyMutes(); return tr.solo;
    };

    // ---------------------------------------------------------- held parameters
    // A path the user is holding is skipped by section `set` and `ramp` until released ("re-enable arranged").
    seq.hold = function (path) { seq.held[String(path)] = true; return seq; };
    seq.release = function (path) { delete seq.held[String(path)]; return seq; };
    seq.releaseAll = function () { seq.held = {}; return seq; };
    seq.heldCount = function () { var n = 0; for (var k in seq.held) if (seq.held.hasOwnProperty(k)) n++; return n; };

    // ---------------------------------------------------------- parameter paths
    // 'kick.decay' | 'stab.gain' | 'stab.delay.mix' | 'stab.sc.depth' | 'send.reverb.mix' | 'master.hp.cutoff' | 'bpm'
    seq.setParam = function (path, v, o) {
      try {
        var parts = String(path).split('.');
        if (parts.length === 1) { if (path === 'bpm') { seq.bpm = v; return true; } if (path === 'swing') { seq.swing = v; return true; } return false; }
        if (parts[0] === 'master') return parts.length >= 3 ? seq.master.set(parts[1] + '.' + parts[2], v, o) : seq.master.set(parts[1], v, o);
        if (parts[0] === 'send') { var s = seq.sends[parts[1]]; return s ? s.set(parts[2], v, o) : false; }
        var tr = seq.tracks[parts[0]];
        if (!tr) return false;
        if (parts.length === 2) {
          if (tr.inst.spec && tr.inst.spec.hasOwnProperty(parts[1])) return tr.inst.set(parts[1], v, o);
          if (tr.channel.spec.hasOwnProperty(parts[1])) return tr.channel.set(parts[1], v, o);
          return tr.chain.set(parts[1], v, o);
        }
        if (parts[1] === 'sc') return tr.sc.set(parts[2], v, o);
        if (parts[1] === 'send') return seq.setSend(parts[0], parts[2], v);
        return tr.chain.set(parts[1] + '.' + parts[2], v, o);
      } catch (e) { return false; }
    };
    seq.getParam = function (path) {
      try {
        var parts = String(path).split('.');
        if (parts[0] === 'master') { var p = seq.master.get(parts[1]); return p ? p.get(parts[2]) : undefined; }
        if (parts[0] === 'send') { var s = seq.sends[parts[1]]; return s ? s.get(parts[2]) : undefined; }
        var tr = seq.tracks[parts[0]]; if (!tr) return undefined;
        if (parts.length === 2) {
          if (tr.inst.spec && tr.inst.spec.hasOwnProperty(parts[1])) return tr.inst.get(parts[1]);
          return tr.channel.get(parts[1]);
        }
        if (parts[1] === 'sc') return tr.sc.get(parts[2]);
        var pr = tr.chain.get(parts[1]); return pr ? pr.get(parts[2]) : undefined;
      } catch (e) { return undefined; }
    };

    // ---------------------------------------------------------- arrangement
    seq.setArrangement = function (sections) {
      seq.sections = [];
      var bar = 0, i;
      for (i = 0; i < (sections || []).length; i++) {
        var s = sections[i], sec = {
          name: s.name || ('part' + i), bars: Math.max(1, s.bars | 0), start: bar, play: s.play || {}, set: s.set || {},
          ramp: s.ramp || [], fx: s.fx || [], progression: s.progression || null, index: i
        };
        bar += sec.bars;
        seq.sections.push(sec);
      }
      seq.totalBars = bar;
      return seq;
    };
    seq.sectionAt = function (bar) {
      for (var i = seq.sections.length - 1; i >= 0; i--) if (bar >= seq.sections[i].start) return seq.sections[i];
      return null;
    };
    seq.section = function (ref) {
      if (typeof ref === 'number') return seq.sections[ref] || null;
      for (var i = 0; i < seq.sections.length; i++) if (seq.sections[i].name === ref) return seq.sections[i];
      return null;
    };
    seq.pos = function () {
      var bar = Math.floor(seq._step / STEPS), sec = seq.sectionAt(bar);
      return { step: seq._step % STEPS, bar: bar, section: sec ? sec.index : -1, sectionName: sec ? sec.name : '', barInSection: sec ? bar - sec.start : bar };
    };

    // ---------------------------------------------------------- scheduling
    function chordFor(sec, bar) {
      var prog = (sec && sec.progression) || seq.progression;
      return prog[(bar - (sec ? sec.start : 0)) % prog.length];
    }
    function ramps(sec, bar, st, t) {
      for (var i = 0; i < sec.ramp.length; i++) {
        var r = sec.ramp[i], a = r.bars ? r.bars[0] : 0, b = r.bars ? r.bars[1] : sec.bars;
        if (seq.held[r.param]) continue;
        var pos = (bar - sec.start) + st / STEPS;
        if (pos < a || pos > b) continue;
        var u = b > a ? clamp((pos - a) / (b - a), 0, 1) : 1, v;
        if (r.curve === 'expo' && r.from > 0 && r.to > 0) v = r.from * Math.pow(r.to / r.from, u); else v = r.from + (r.to - r.from) * u;
        seq.setParam(r.param, v, { at: t });
      }
    }
    // deterministic per (track, absolute step, variant, seed): export equals playback
    function hash32(s) { var h = 2166136261 >>> 0; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
    function chance(name, absStep, variation) { return hash32(name + ':' + absStep + ':' + variation + ':' + seq.seed) / 4294967296; }
    // 'a:b' plays on bar a (1-based) of every b bars of the section; '!a:b' plays on the others
    function condOk(cond, bis) {
      var m = /^(!?)(\d+):(\d+)$/.exec(String(cond)); if (!m) return true;
      var a = +m[2], b = +m[3]; if (!(b > 0)) return true;
      var hit = (bis % b) === ((a - 1) % b);
      return m[1] ? !hit : hit;
    }
    // parameter locks: set the voice parameters for this trigger only, then restore (voices read inst.params at trigger
    // time). `level` and processor parameters act on shared nodes and are not lockable here.
    function trigger(tr, t, ev) {
      var saved = null, k;
      if (ev && ev.locks && tr.inst.params && tr.inst.spec) {
        saved = {};
        for (k in ev.locks) if (ev.locks.hasOwnProperty(k) && tr.inst.spec.hasOwnProperty(k) && k !== 'level') {
          var sp = tr.inst.spec[k], lv = ev.locks[k];
          if (typeof sp.value === 'number') { lv = Number(lv); if (lv !== lv) continue; lv = clamp(lv, sp.min, sp.max); }
          saved[k] = tr.inst.params[k]; tr.inst.params[k] = lv;
        }
      }
      try { tr.inst.trigger(t, ev); }
      finally { if (saved) for (k in saved) if (saved.hasOwnProperty(k)) tr.inst.params[k] = saved[k]; }
      seq._hitCount[tr.name]++;
      if (tr.duck) for (var i = 0; i < tr.duck.length; i++) { var d = seq.tracks[tr.duck[i]]; if (d && d.sc && d.sc.trigger) d.sc.trigger(t); }
    }
    // schedule one absolute step at audio time t. Returns false past the end of the arrangement.
    function schedule(absStep, t, quiet) {
      var bar = Math.floor(absStep / STEPS), st = absStep % STEPS, sec = seq.sectionAt(bar);
      if (!sec || bar >= seq.totalBars) return false;
      var sd = seq.stepSec(), ts = t + ((st % 2) ? seq._swing * sd * 0.33 : 0), i, n, tr;
      var tFloor = live ? ctx.currentTime : 0;      // a negative nudge cannot land in the past
      if (st === 0 && bar === sec.start) {
        for (var p in sec.set) if (sec.set.hasOwnProperty(p) && !seq.held[p]) seq.setParam(p, sec.set[p], { at: t });
        if (!quiet) seq._events.push({ time: t, type: 'section', section: sec.index, name: sec.name });
      }
      if (sec.ramp.length) ramps(sec, bar, st, t);
      for (i = 0; i < sec.fx.length; i++) {
        var fx = sec.fx[i];
        if ((fx.bar | 0) === bar - sec.start && ((fx.step | 0) === st)) {
          tr = seq.tracks[fx.track];
          if (tr) trigger(tr, ts, { vel: fx.vel == null ? 1 : fx.vel, dur: (fx.bars || 1) * seq.barSec(), notes: tr.kind === 'chord' ? K.chordNotes(chordFor(sec, bar), tr.octave, tr.voicing) : undefined });
        }
      }
      for (n = 0; n < seq.order.length; n++) {
        tr = seq.tracks[seq.order[n]];
        var variation = sec.play[tr.name];
        if (!variation) continue;
        if (variation === true) variation = 'A';
        var bis = bar - sec.start;
        var v = tr.variants[variation] || tr.variants.A;
        if (!v) continue;
        var cell = v.cells[(bis % v.bars) * STEPS + st];
        if (!cell) continue;
        if (cell.cond && !condOk(cell.cond, bis)) continue;
        if (cell.prob != null && cell.prob < 1 && chance(tr.name, absStep, variation) >= cell.prob) continue;
        var tc = ts + (cell.nudge ? cell.nudge * sd : 0);
        if (tc < tFloor) tc = tFloor;
        var e = { vel: cell.vel == null ? 0.85 : cell.vel, accent: !!cell.acc };
        if (tr.kind === 'melody') {
          if (cell.note == null) continue;
          e.midi = cell.note;
          e.dur = Math.max(0.03, (cell.len == null ? 1 : cell.len) * sd * 0.95 - 0.01);
        } else {
          e.dur = Math.max(0.02, (cell.len == null ? tr.gate : cell.len) * sd);
          if (tr.kind === 'chord') e.notes = K.chordNotes(chordFor(sec, bar), tr.octave, tr.voicing);
          else if (tr.kind === 'note') {
            if (cell.note != null) e.midi = cell.note;
            else if (tr.notes && tr.notes.length) { e.midi = tr.notes[tr.noteIdx % tr.notes.length]; tr.noteIdx++; }
            else e.midi = tr.note;
          }
        }
        if (cell.locks) e.locks = cell.locks;
        var rep = cell.rep > 1 ? (cell.rep | 0) : 1;
        if (rep === 1) trigger(tr, tc, e);
        else for (var r = 0; r < rep; r++) {
          var e2 = {}; for (var ek in e) if (e.hasOwnProperty(ek)) e2[ek] = e[ek];
          e2.dur = Math.min(e.dur, sd / rep * 0.9);
          trigger(tr, tc + r * sd / rep, e2);
        }
      }
      if (!quiet) seq._events.push({ time: t, type: 'step', step: st, bar: bar, section: sec.index });
      return true;
    }
    seq.scheduleStep = schedule;

    // schedule everything from bar a to bar b (exclusive) starting at audio time t0 (offline rendering)
    seq.scheduleAll = function (fromBar, toBar, t0) {
      var a = (fromBar | 0) * STEPS, b = (toBar == null ? seq.totalBars : toBar) * STEPS, t = t0 || 0, sd = seq.stepSec(), n = 0;
      for (var s = a; s < b; s++) { if (!schedule(s, t, true)) break; t += sd; n++; }
      return n;
    };

    // ---------------------------------------------------------- transport
    function emit(type, e) { var l = seq._listeners[type]; if (!l) return; for (var i = 0; i < l.length; i++) { try { l[i](e); } catch (x) {} } }
    seq.on = function (type, fn) { (seq._listeners[type] = seq._listeners[type] || []).push(fn); return seq; };
    seq.off = function (type, fn) { var l = seq._listeners[type]; if (!l) return seq; var i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); return seq; };

    function flushEvents(now) {
      while (seq._events.length && seq._events[0].time <= now) emit(seq._events[0].type, seq._events.shift());
    }
    function tick() {
      try {
        if (!live) return;
        var now = ctx.currentTime;
        flushEvents(now);
        if (!seq.playing) return;
        if (seq._next < now - 0.3) seq._next = now + 0.05;        // throttled tab: do not burst
        var sd = seq.stepSec();
        while (seq._next < now + seq._lookahead) {
          var bar = Math.floor(seq._step / STEPS), sec = seq.sectionAt(bar);
          if (seq.loopSection != null) {
            var ls = seq.section(seq.loopSection);
            if (ls && (bar < ls.start || bar >= ls.start + ls.bars)) seq._step = ls.start * STEPS;
          } else if (bar >= seq.totalBars || !sec) {
            if (seq.loopAll && seq.totalBars > 0) seq._step = 0; else { seq._stopAt = seq._next + 2; seq.playing = false; seq._events.push({ time: seq._next + 2, type: 'stop' }); return; }
          }
          schedule(seq._step, seq._next, false);
          seq._step++;
          seq._next += sd;
        }
      } catch (e) {}
    }
    seq.play = function () {
      if (!live) return false;
      try { if (ctx.state && ctx.state !== 'running' && ctx.resume) { var r = ctx.resume(); if (r && r.catch) r.catch(function () {}); } } catch (e) {}
      if (seq.playing) return true;
      seq.playing = true;
      seq._next = ctx.currentTime + 0.06;
      seq._events.length = 0;
      if (!seq._timer) seq._timer = setInterval(tick, seq._interval);
      emit('play', { step: seq._step });
      tick();
      return true;
    };
    function panicAll() { for (var n in seq.tracks) if (seq.tracks.hasOwnProperty(n) && seq.tracks[n].inst.panic) seq.tracks[n].inst.panic(); }
    seq.pause = function () { if (!seq.playing) return; seq.playing = false; seq._events.length = 0; panicAll(); emit('stop', { step: seq._step }); };
    seq.stop = function () {
      var sec = seq.sectionAt(Math.floor(seq._step / STEPS));
      seq.pause();
      seq._step = sec ? sec.start * STEPS : 0;
      emit('step', { type: 'step', step: 0, bar: Math.floor(seq._step / STEPS), section: sec ? sec.index : 0, time: live ? ctx.currentTime : 0 });
    };
    seq.rewind = function () { seq.pause(); seq._step = 0; };
    seq.toggle = function () { if (seq.playing) seq.pause(); else seq.play(); return seq.playing; };
    seq.jump = function (ref) {
      var sec = typeof ref === 'number' && ref >= seq.sections.length ? seq.sectionAt(ref) : seq.section(ref);
      if (!sec) return false;
      if (seq.playing) { panicAll(); seq._events.length = 0; seq._next = ctx.currentTime + 0.05; }
      seq._step = sec.start * STEPS;
      return true;
    };
    seq.loop = function (ref) { seq.loopSection = (ref == null) ? null : (seq.section(ref) ? seq.section(ref).name : null); return seq.loopSection; };
    seq.dispose = function () {
      seq.pause();
      if (seq._timer) { clearInterval(seq._timer); seq._timer = null; }
      var n;
      for (n in seq.tracks) if (seq.tracks.hasOwnProperty(n)) { var tr = seq.tracks[n]; tr.inst.dispose(); tr.chain.dispose(); tr.sc.dispose(); tr.channel.dispose(); for (var g in tr.sendGains) if (tr.sendGains.hasOwnProperty(g)) disc(tr.sendGains[g]); }
      for (n in seq.sends) if (seq.sends.hasOwnProperty(n)) seq.sends[n].dispose();
      seq.master.dispose(); disc(seq.out); disc(seq.analyser);
    };
    seq.describe = function () {
      var out = { bpm: seq._bpm, swing: seq._swing, totalBars: seq.totalBars, seconds: seq.totalBars * seq.barSec(), tracks: seq.order.slice(), sends: seq.sendOrder.slice(), sections: [] };
      for (var i = 0; i < seq.sections.length; i++) out.sections.push({ name: seq.sections[i].name, start: seq.sections[i].start, bars: seq.sections[i].bars });
      return out;
    };
    seq.hits = function () { var o = {}; for (var k in seq._hitCount) if (seq._hitCount.hasOwnProperty(k)) o[k] = seq._hitCount[k]; return o; };
    return seq;
  }

  // ---------------------------------------------------------- offline rendering
  // buildFn(seq) adds sends/tracks/arrangement. opts: {sampleRate, from (bar), to (bar), tail (s)}
  function render(buildFn, opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      try {
        var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
        if (!OAC) { reject(new Error('OfflineAudioContext unavailable')); return; }
        var dry = create(null, {});
        buildFn(dry);
        var from = opts.from | 0, to = opts.to == null ? dry.totalBars : Math.min(opts.to, dry.totalBars);
        if (to <= from) { reject(new Error('empty range')); return; }
        var sr = opts.sampleRate || 44100, seconds = (to - from) * dry.barSec() + (opts.tail == null ? 2.5 : opts.tail) + 0.1;
        var octx = new OAC(2, Math.ceil(sr * seconds), sr);
        var seq = create(octx, { bpm: dry.bpm, swing: dry.swing });
        buildFn(seq);
        seq.scheduleAll(from, to, 0.05);
        var p = octx.startRendering();
        if (p && p.then) p.then(resolve, reject);
        else { octx.oncomplete = function (e) { resolve(e.renderedBuffer); }; }
      } catch (e) { reject(e); }
    });
  }

  root.Sequencer = { create: create, render: render, wav: wav, parsePattern: parsePattern, parseMelody: parseMelody,
                     parseVariant: SD ? SD.parseVariant : null, STEPS: STEPS };
})();
