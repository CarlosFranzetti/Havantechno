/* Havantechno app engine - audiotrack.js
 * Global `AudioTrack`: the player behind a track of type 'audio' (Pressing Crew, V1). Contract: app/CONTRACT.md, "Host".
 *
 *   var inst = AudioTrack.create(ctx, {getBuffer: fn(id) -> AudioBuffer|null, clips: [{audio, bar, offset, length, gain}]});
 *   seq.addTrack('vox', {type: 'audio', inst: inst, gain: 1});      // the track's normal strip: inserts, sidechain, channel
 *
 * The sequencer calls inst.onStep(absStep, t, seq) at every scheduled step (live lookahead and offline render alike).
 * A step that follows the previous one starts the clips whose start falls inside it, at their exact time. Any other
 * step (play, jump, loop wrap, a render from mid-song, a throttled tab, a clip edit) fades what plays out over 4 ms at
 * that step's time and starts every clip covering it mid-clip, at file position offset + (step - clipStep) * stepSec.
 * Clips are not time-stretched: a clip plays at its file's own rate. When the song tempo is not the clip's own, the
 * clip keeps its speed and drifts from the grid after its start; a tempo change while a clip plays does not move it
 * (it is placed again at the next jump or loop wrap).
 * clip: audio (a doc.audio id), bar (0-based, fractions allowed), offset (s into the file), length (s; 0 = to the end
 * of the file), gain (linear, default 1). A clip whose file is not loaded is silent.
 * Same instrument shape as Synths: type 'audio', spec {level}, params, set/get, trigger (no-op), panic, dispose, out.
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var STEPS = 16, FADE = 0.004;

  function num(v, d) { v = Number(v); return v === v && isFinite(v) ? v : d; }
  function isArr(a) { return Object.prototype.toString.call(a) === '[object Array]'; }

  // a clip as the document stores it (SongDoc normalises the same way); null when it has no audio id
  function normClip(c) {
    if (!c || typeof c !== 'object' || c.audio == null || c.audio === '') return null;
    return { audio: String(c.audio), bar: Math.max(0, num(c.bar, 0)), offset: Math.max(0, num(c.offset, 0)),
             length: Math.max(0, num(c.length, 0)), gain: Math.max(0, num(c.gain, 1)) };
  }
  function normClips(list) {
    var out = [];
    if (isArr(list)) for (var i = 0; i < list.length; i++) { var c = normClip(list[i]); if (c) out.push(c); }
    return out;
  }

  function create(ctx, opts) {
    opts = opts || {};
    var getBuffer = typeof opts.getBuffer === 'function' ? opts.getBuffer : function () { return null; };
    var inst = { type: 'audio', ctx: ctx || null, spec: { level: { min: 0, max: 1.5, value: 1, unit: '' } }, params: { level: 1 },
                 out: null, pre: null, clips: normClips(opts.clips), _live: [], _last: -2, _lastT: 0, _lastSd: 0 };
    if (ctx) { try { inst.out = ctx.createGain(); inst.pre = inst.out; } catch (e) { inst.out = null; } }

    inst.set = function (name, v) {
      if (name !== 'level') return false;
      v = Number(v); if (v !== v) return false;
      v = Math.min(1.5, Math.max(0, v));
      inst.params.level = v;
      if (inst.out && ctx) { try { if (root.Kit && root.Kit.target) root.Kit.target(inst.out.gain, v, ctx.currentTime, 0.01); else inst.out.gain.value = v; } catch (e) {} }
      return true;
    };
    inst.get = function (name) { return inst.params[name]; };
    inst.trigger = function () {};                      // clips follow the transport (onStep), not step cells
    inst.setClips = function (clips) { inst.clips = normClips(clips); inst.resync(); };
    // the next step places every clip again (a clip edit, a file that arrived)
    inst.resync = function () { inst._last = -2; };

    function clipLen(c, buf) {
      var dur = typeof buf.duration === 'number' ? buf.duration : buf.length / buf.sampleRate, avail = dur - c.offset;
      if (!(avail > 0)) return 0;
      return c.length > 0 ? Math.min(c.length, avail) : avail;
    }
    function voice(c, buf, when, filePos, dur, fadeIn) {
      if (!(dur > 0) || !inst.out) return;
      try {
        var src = ctx.createBufferSource(), g = ctx.createGain();
        src.buffer = buf; src.connect(g); g.connect(inst.out);
        if (fadeIn) { g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(c.gain, when + FADE); }
        else g.gain.value = c.gain;
        src.start(when, filePos, dur);
        var v = { src: src, g: g, on: when, end: when + dur, gain: c.gain };
        inst._live.push(v);
        src.onended = function () { try { g.disconnect(); } catch (e) {} var i = inst._live.indexOf(v); if (i >= 0) inst._live.splice(i, 1); };
      } catch (e) {}
    }
    function fadeAll(t) {
      for (var i = 0; i < inst._live.length; i++) {
        var v = inst._live[i];
        try {
          if (v.on >= t) { v.src.stop(t); continue; }              // not started yet: never plays
          v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.gain, t); v.g.gain.linearRampToValueAtTime(0, t + FADE);
          v.src.stop(t + FADE + 0.001);
        } catch (e) { try { v.src.stop(); } catch (e2) {} }
      }
      inst._live = [];
    }
    inst.onStep = function (absStep, t, seq) {
      if (!ctx || !inst.out) return;
      var sd = seq && typeof seq.stepSec === 'function' ? seq.stepSec() : 0.125;
      var cont = absStep === inst._last + 1 && Math.abs(t - (inst._lastT + inst._lastSd)) < 1e-4;
      if (!cont) fadeAll(t);
      for (var i = 0; i < inst.clips.length; i++) {
        var c = inst.clips[i], buf = getBuffer(c.audio);
        if (!buf) continue;
        var cs = c.bar * STEPS, len = clipLen(c, buf);
        if (!(len > 0)) continue;
        if (cs >= absStep && cs < absStep + 1) voice(c, buf, t + (cs - absStep) * sd, c.offset, len, false);
        else if (!cont && cs < absStep) {
          var pos = (absStep - cs) * sd;
          if (pos < len) voice(c, buf, t, c.offset + pos, len - pos, true);
        }
      }
      inst._last = absStep; inst._lastT = t; inst._lastSd = sd;
    };
    inst.panic = function () { fadeAll(ctx ? ctx.currentTime : 0); inst._last = -2; };
    inst.dispose = function () { inst.panic(); try { if (inst.out) inst.out.disconnect(); } catch (e) {} };
    return inst;
  }

  root.AudioTrack = { create: create, normClip: normClip, normClips: normClips, STEPS: STEPS };
})();
