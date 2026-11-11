/* Havantechno app engine - host.js
 * Global `Host`: the one object the UI talks to. The UI never touches the Sequencer or the AudioContext directly,
 * so a native engine can replace this file later. Contract: app/CONTRACT.md, "Host (A1)".
 *
 *   var host = Host.create();                  // builds the song on a context-less engine: devices, params, editor work
 *   host.start().then(function (audio) {});    // on a user gesture: AudioContext, live rebuild; resolves true / false
 *   host.editor().setStepInSection('mainB', 'bass', 2, {vel: 0.6}); host.commit();
 *   host.setParam('stab.cutoff', 900); host.hold('stab.cutoff'); host.release('stab.cutoff');
 *   host.devices(); host.meter('track:kick'); host.meter('master');
 *   host.transport.play(); host.on('step', function (e) { e.step, e.bar, e.section });
 *
 * Device ids: track:<name> (instrument), track:<name>:<unit> (insert), track:<name>:sc, track:<name>:channel,
 * send:<name>, master:<unit>. meter('master') reads the final output.
 * Events: 'step' {step, bar, section, name, time}, 'section' {section, name}, 'play', 'stop',
 *         'document' {reason: 'start'|'load'|'commit', rebuilt}, 'param' {path, value, source: 'ui'|'arrangement'},
 *         'audio' {id, status: 'loaded'|'missing'|'unloaded'}, 'bypass' {id, on}.
 * Undo: every host.hold(path) (the start of a knob gesture) and host.bypass take one undo snapshot of the document.
 * Audio (sampler, CONTRACT "Sampler"): host.loadAudio(File|Blob|URL|ArrayBuffer, {id, name, src}) -> Promise<bufferId>,
 *   host.audio(), host.buffer(id), host.unloadAudio(id), host.reloadAudio({shell, base}), host.audioReady(),
 *   host.addSampler(source, {name, family, pattern}) -> Promise<trackName>. doc.audio holds references, never bytes.
 * Nothing throws without an AudioContext.
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var STEPS = 16;

  var FAMILY = {
    kick: 'drums', clap: 'drums', hat_closed: 'drums', hat_open: 'drums', shaker: 'drums', perc: 'drums',
    sub: 'bass', bass: 'bass', tb303: 'bass', modeld: 'bass', juno: 'keys', stab: 'keys', lead: 'keys', pad: 'keys', riser: 'fx', impact: 'fx', sampler: 'drums',
    compressor: 'dynamics', limiter: 'dynamics', sidechain: 'dynamics', delay: 'time', reverb: 'time', chorus: 'time',
    filter: 'tone', eq3: 'tone', saturator: 'tone', widener: 'utility', channel: 'utility'
  };
  var SEQ_EVENTS = ['step', 'section', 'play', 'stop', 'param'];
  var SILENT = { level: 0, peak: 0, reduction: null, correlation: null };

  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function isArr(a) { return Object.prototype.toString.call(a) === '[object Array]'; }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  var FAMILIES = { drums: 1, bass: 1, keys: 1, fx: 1, dynamics: 1, time: 1, tone: 1, utility: 1 };
  function family(type) { return FAMILY[type] || 'utility'; }
  function isSamplerDef(t) { return !!t && (t.type === 'sampler' || t.inst === 'sampler'); }
  function isBuf(x) { return Object.prototype.toString.call(x) === '[object ArrayBuffer]'; }
  function isView(x) { return typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' && ArrayBuffer.isView(x); }
  var URLISH = /^(https?:|blob:|data:)/i;
  function warn(msg) { try { if (typeof console !== 'undefined' && console.warn) console.warn('[Host] ' + msg); } catch (e) {} }

  // the document minus what commit() can apply in place (variants, sections, progression, name, key)
  function structKey(doc) {
    var tr = [], i, k;
    for (i = 0; i < (doc.tracks || []).length; i++) {
      var t = doc.tracks[i], o = {};
      for (k in t) if (has(t, k) && k !== 'variants') o[k] = t[k];
      tr.push(o);
    }
    return JSON.stringify({ bpm: doc.bpm, swing: doc.swing, sends: doc.sends, master: doc.master || null, tracks: tr });
  }
  // a doc chain entry -> its unit name, as Processors.chain names it (null for entries the chain skips)
  function entryName(s) {
    if (typeof s === 'string') return s;
    if (isArr(s)) return (s[1] && s[1].name) || s[0];
    if (s && s.input !== undefined && s.set) return s.name || s.type;
    if (s && s.type) return s.name || s.type;
    return null;
  }
  function entryObject(t, j) {
    var s = t.chain[j], o, k;
    if (typeof s === 'string') o = { type: s };
    else if (isArr(s)) { o = { type: s[0] }; if (s[1]) for (k in s[1]) if (has(s[1], k)) o[k] = s[1][k]; }
    else return s;
    t.chain[j] = o;
    return o;
  }
  function docTrack(doc, name) {
    for (var i = 0; i < (doc.tracks || []).length; i++) if (doc.tracks[i].name === name) return doc.tracks[i];
    return null;
  }
  function applyMaster(seq, doc) {
    var m = doc && doc.master;
    if (!m || typeof m !== 'object') return;
    for (var u in m) if (has(m, u) && m[u] && typeof m[u] === 'object') for (var p in m[u]) if (has(m[u], p) && p !== 'bypass') seq.setParam('master.' + u + '.' + p, m[u][p]);
  }

  // Editor operations the views asked for (A5) that songdoc.js does not have yet. They live here, on the editor the
  // Host hands out, until songdoc.js takes them over; each takes one undo snapshot like the built-in operations.
  function snapshot(ed) {
    ed._undo.push(JSON.stringify(ed.doc));
    if (ed._undo.length > ed.limit) ed._undo.shift();
    ed._redo.length = 0;
  }
  function extendEditor(ed) {
    // run several operations as one undo step: ed.group(function (ed) { ed.forkVariant(...); ed.setPlay(...); })
    ed.group = function (fn) {
      var n = ed._undo.length, limit = ed.limit, r;
      ed.limit = Infinity;
      try { r = fn(ed); }
      finally {
        ed.limit = limit;
        if (ed._undo.length > n + 1) ed._undo.splice(n + 1);
        while (ed._undo.length > limit) ed._undo.shift();
      }
      return r;
    };
    // section fx hits {bar, step, track, bars, vel}: index null adds one, patch null removes one, else merges the patch.
    // Returns the index of the hit, or -1.
    ed.setFx = function (section, index, patch) {
      var sec = ed.section(section); if (!sec) return -1;
      sec.fx = sec.fx || [];
      if (index == null) {
        if (!patch || !patch.track) return -1;
        snapshot(ed); sec.fx.push(clone(patch)); return sec.fx.length - 1;
      }
      if (index < 0 || index >= sec.fx.length) return -1;
      snapshot(ed);
      if (patch === null) { sec.fx.splice(index, 1); return index; }
      for (var k in patch) if (has(patch, k)) { if (patch[k] == null) delete sec.fx[index][k]; else sec.fx[index][k] = patch[k]; }
      return index;
    };
    // change a variant's length in bars. fill 'repeat' (default) loops the existing bars into the new ones, 'empty' leaves rests.
    ed.setVariantBars = function (track, variant, bars, fill) {
      var tr = ed.track(track); bars = bars | 0;
      if (!tr || bars < 1 || bars > 64) return false;
      snapshot(ed);
      var v = tr.variants[variant] || (tr.variants[variant] = SongDoc.emptyVariant(1)), old = v.bars, cells = [], i;
      for (i = 0; i < bars * STEPS; i++) {
        if (i < old * STEPS) cells.push(v.cells[i]);
        else cells.push(fill === 'empty' ? null : clone(v.cells[i % (old * STEPS)]));
      }
      v.bars = bars; v.cells = cells;
      return true;
    };
    return ed;
  }

  // bypass flags stored in the document: `bypass: true` on a chain entry, a track's sidechain, a send, a master unit
  function applyBypass(seq, doc) {
    var i, j, k, t, tr, n;
    for (i = 0; i < doc.tracks.length; i++) {
      t = doc.tracks[i]; tr = seq.tracks[t.name];
      if (!tr) continue;
      if (t.chain) for (j = 0, k = 0; j < t.chain.length; j++) {
        if (entryName(t.chain[j]) == null) continue;
        var pr = tr.chain.procs[k++], e = t.chain[j];
        if (pr && e && typeof e === 'object' && !isArr(e) && e.bypass) pr.bypass(true);
      }
      if (t.sidechain && t.sidechain.bypass && tr.sc) tr.sc.bypass(true);
    }
    for (n in (doc.sends || {})) if (has(doc.sends, n) && doc.sends[n] && doc.sends[n].bypass && seq.sends[n]) seq.sends[n].bypass(true);
    for (n in (doc.master || {})) if (has(doc.master, n) && doc.master[n] && doc.master[n].bypass && seq.master.get(n)) seq.master.get(n).bypass(true);
  }

  function create(opts) {
    opts = opts || {};
    var Sequencer = root.Sequencer, Song = root.Song, SongDoc = root.SongDoc;
    var host = { version: 1 };
    var ctx = null, live = false, startPromise = null;
    var seq = null, rawSet = null, ed = null, builtKey = null, devCache = null, devById = {};
    var listeners = {}, forwarders = {}, meters = {}, sendNow = {};
    var buffers = {}, decCtx = null, audioPromise = null, gen = 0, lastAudioOpts = opts;

    // ---------------------------------------------------------- events
    function emit(type, e) {
      var l = listeners[type]; if (!l) return;
      l = l.slice();
      for (var i = 0; i < l.length; i++) { try { l[i](e); } catch (x) { warn('listener for ' + type + ' threw: ' + (x && x.message)); } }
    }
    host.on = function (type, fn) { if (typeof fn === 'function') (listeners[type] = listeners[type] || []).push(fn); return host; };
    host.off = function (type, fn) {
      var l = listeners[type]; if (!l) return host;
      if (fn == null) { listeners[type] = []; return host; }
      var i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); return host;
    };
    forwarders.step = function (e) {
      var sec = seq && seq.sections[e.section];
      emit('step', { step: e.step, bar: e.bar, section: e.section, name: sec ? sec.name : '', time: e.time });
    };
    forwarders.section = function (e) { emit('section', { section: e.section, name: e.name, time: e.time }); };
    forwarders.play = function (e) { emit('play', { step: e && e.step }); };
    forwarders.stop = function (e) { emit('stop', { step: e && e.step }); };
    forwarders.param = function (e) { emit('param', { path: e.path, value: e.value, source: e.source || 'arrangement', time: e.time }); };
    function attach(s) { for (var i = 0; i < SEQ_EVENTS.length; i++) s.on(SEQ_EVENTS[i], forwarders[SEQ_EVENTS[i]]); }
    function detach(s) { for (var i = 0; i < SEQ_EVENTS.length; i++) s.off(SEQ_EVENTS[i], forwarders[SEQ_EVENTS[i]]); }

    // arrangement writes (section set / ramp) reach seq.setParam with {at}; report them at their audio time
    function wrap(s) {
      var raw = s.setParam;
      s.setParam = function (path, v, o) {
        var r = raw(path, v, o);
        if (r && o && typeof o.at === 'number') {
          var parts = String(path).split('.');
          if (parts.length === 3 && parts[1] === 'send' && s.tracks[parts[0]]) sendNow[path] = clamp(Number(v), 0, 1.5);
          var e = { time: o.at, type: 'param', path: String(path), value: v, source: 'arrangement' };
          if (live && s.playing) s._events.push(e); else forwarders.param(e);
        }
        return r;
      };
      return raw;
    }

    // ---------------------------------------------------------- building
    function getBuffer(id) { var e = buffers[id]; return e ? e.buffer : null; }
    // Song.build with every sampler track's instrument made here, so it gets the Host's buffer resolver
    function buildSong(s, doc) {
      var def = doc, i, k;
      for (i = 0; i < doc.tracks.length; i++) if (isSamplerDef(doc.tracks[i])) break;
      if (i < doc.tracks.length) {
        def = {};
        for (k in doc) if (has(doc, k)) def[k] = doc[k];
        def.tracks = doc.tracks.map(function (t) {
          if (!isSamplerDef(t)) return t;
          var t2 = {}, o = {}, q;
          for (q in t) if (has(t, q)) t2[q] = t[q];
          if (t.params) for (q in t.params) if (has(t.params, q)) o[q] = t.params[q];
          o.getBuffer = getBuffer;
          o.getProgram = getProgram;
          t2.inst = root.Synths.create(s.ctx, 'sampler', o);
          return t2;
        });
      }
      Song.build(s, def);
      applyMaster(s, doc);
      applyBypass(s, doc);
    }
    function capture(s) {
      var st = { step: s._step, playing: !!s.playing, loop: s.loopSection, held: {}, mute: {}, solo: {}, seed: s.seed }, k;
      for (k in s.held) if (has(s.held, k)) st.held[k] = true;
      for (k in s.tracks) if (has(s.tracks, k)) { if (s.tracks[k].muted) st.mute[k] = true; if (s.tracks[k].solo) st.solo[k] = true; }
      return st;
    }
    function restore(s, st, keepTransport) {
      var k;
      s.seed = st.seed;
      for (k in st.held) if (has(st.held, k)) s.hold(k);
      for (k in st.mute) if (has(st.mute, k) && s.tracks[k]) s.mute(k, true);
      for (k in st.solo) if (has(st.solo, k) && s.tracks[k]) s.solo(k, true);
      if (!keepTransport) return;
      var max = s.totalBars * STEPS;
      s._step = (st.step >= 0 && st.step < max) ? st.step : 0;
      if (st.loop != null && s.section(st.loop)) s.loop(st.loop);
      if (st.playing && live) s.play();
    }
    function clearMeters() {
      for (var id in meters) if (has(meters, id)) {
        var m = meters[id];
        try { if (m.an) m.an.disconnect(); if (m.split) m.split.disconnect(); if (m.aL) m.aL.disconnect(); if (m.aR) m.aR.disconnect(); } catch (e) {}
      }
      meters = {};
    }
    // dispose the running sequencer and build the editor's document again. state: null (fresh) or {..., transport}
    function rebuild(keepTransport) {
      var doc = ed.doc, old = seq, st = old ? capture(old) : null;
      if (old) { detach(old); try { old.dispose(); } catch (e) {} }
      clearMeters();
      sendNow = {};
      var s = Sequencer.create(live ? ctx : null, { bpm: doc.bpm, swing: doc.swing, seed: st ? st.seed : (opts.seed || 1) });
      rawSet = wrap(s);
      buildSong(s, doc);
      seq = s;
      if (st && keepTransport !== null) restore(s, st, keepTransport);
      attach(s);
      builtKey = structKey(doc);
      devCache = null;
    }
    // step, variant, section and progression edits: apply to the running sequencer, no rebuild, no gap
    function applyInPlace() {
      var doc = ed.doc, i, k;
      for (i = 0; i < doc.tracks.length; i++) {
        var t = doc.tracks[i], tr = seq.tracks[t.name];
        if (!tr) continue;
        var vs = {};
        for (k in t.variants) if (has(t.variants, k)) vs[k] = SongDoc.parseVariant(t.variants[k], tr.kind);
        tr.variants = vs;
      }
      seq.progression = (doc.progression || []).slice();
      seq.setArrangement(doc.sections);
      if (seq._step >= seq.totalBars * STEPS) seq._step = 0;
      if (seq.loopSection != null && !seq.section(seq.loopSection)) seq.loop(null);
    }

    // ---------------------------------------------------------- document
    function setDoc(d) {
      var doc = SongDoc.load(typeof d === 'string' ? d : (d || Song.document()));
      ed = extendEditor(SongDoc.createEditor(doc));
      normalizeDocPrograms();
      progSeen = programsJson();
    }
    host.document = function () { return ed.doc; };
    host.editor = function () { return ed; };
    // o: {shell, base} for reloading the document's audio (base: the folder of the project file, for relative paths)
    host.loadDocument = function (d, o) {
      setDoc(d);                                    // throws on a bad document, before anything is torn down
      gen++;
      keepBuffers();
      if (seq) { try { seq.stop(); } catch (e) {} }
      rebuild(null);                                // fresh: stopped, bar 0, nothing held, no mute or solo
      emit('document', { reason: 'load', rebuilt: true });
      lastAudioOpts = o || opts;
      if (missingIds().length) host.reloadAudio(lastAudioOpts);
      else audioPromise = null;
      return ed.doc;
    };
    host.commit = function () {
      var rebuilt = false;
      if (structKey(ed.doc) === builtKey) applyInPlace();
      else { rebuild(true); rebuilt = true; }
      emit('document', { reason: 'commit', rebuilt: rebuilt });
      programEvents();
      return rebuilt;
    };

    // ---------------------------------------------------------- audio
    host.start = function () {
      if (startPromise) return startPromise;
      startPromise = new Promise(function (resolve) {
        try {
          if (!ctx) {
            var AC = opts.AudioContext || root.AudioContext || root.webkitAudioContext;
            ctx = opts.context || (AC ? new AC({ latencyHint: 'interactive' }) : null);
          }
          if (!ctx) { startPromise = null; resolve(false); return; }
          // resume inside the user gesture; build only after the worklet modules resolved on ctx (worklets.js)
          var r = (ctx.state !== 'running' && ctx.resume) ? ctx.resume() : null;
          if (r && r.catch) r.catch(function () {});
          var W = root.Worklets, wl = (W && typeof W.load === 'function') ? W.load(ctx) : null;
          var go = function () {
            try {
              live = true;
              rebuild(true);
              emit('document', { reason: 'start', rebuilt: true });
              if (missingIds().length) host.reloadAudio(lastAudioOpts);
              if (r && r.then) r.then(function () { resolve(true); }, function () { resolve(true); });
              else resolve(true);
            } catch (e2) { fail(e2); }
          };
          if (wl && wl.then) wl.then(go, go); else go();
        } catch (e) { fail(e); }
        function fail(e) {
          warn('start failed: ' + (e && e.message));
          ctx = null; live = false; startPromise = null;
          try { rebuild(true); } catch (e3) {}
          resolve(false);
        }
      });
      return startPromise;
    };
    host.started = function () { return live; };
    host.context = function () { return ctx; };
    host.analyser = function () { return seq.analyser || null; };
    host.dispose = function () {
      clearMeters();
      if (seq) { detach(seq); try { seq.dispose(); } catch (e) {} }
      if (ctx && ctx.close && !opts.context) { try { var p = ctx.close(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
      ctx = null; live = false; startPromise = null;
    };

    // ---------------------------------------------------------- transport
    var transport = {
      play: function () { return seq.play(); },
      pause: function () { return seq.pause(); },
      stop: function () { return seq.stop(); },
      toggle: function () { return seq.toggle(); },
      jump: function (ref) { return seq.jump(ref); },
      loop: function (ref) { return seq.loop(ref == null ? null : ref); },
      rewind: function () { return seq.rewind(); },
      pos: function () { var p = seq.pos(); p.playing = !!seq.playing; p.loop = seq.loopSection; return p; }
    };
    Object.defineProperty(transport, 'playing', { enumerable: true, get: function () { return !!(seq && seq.playing); } });
    Object.defineProperty(transport, 'loopSection', { enumerable: true, get: function () { return seq ? seq.loopSection : null; } });
    host.transport = transport;

    // ---------------------------------------------------------- parameters
    function sendPath(parts) { return parts.length === 3 && parts[1] === 'send' && seq.tracks[parts[0]]; }
    function mutePath(parts) {
      var tr = parts.length === 2 && seq.tracks[parts[0]];
      return !!tr && parts[1] === 'mute' && !(tr.inst.spec && has(tr.inst.spec, 'mute'));
    }
    host.getParam = function (path) {
      path = String(path);
      if (path === 'bpm') return seq.bpm;
      if (path === 'swing') return seq.swing;
      var parts = path.split('.');
      if (mutePath(parts)) return !!seq.tracks[parts[0]].muted;
      if (sendPath(parts)) return has(sendNow, path) ? sendNow[path] : seq.sendLevel(parts[0], parts[2]);
      return seq.getParam(path);
    };
    // write a UI value into the document too, so a rebuild keeps it and Save stores it
    function persist(path, parts, v) {
      var doc = ed.doc, clean = structKey(doc) === builtKey, t, i, j, k;
      if (parts.length === 1) { if (path === 'bpm') doc.bpm = seq.bpm; else if (path === 'swing') doc.swing = seq.swing; }
      else if (parts[0] === 'master') {
        if (parts.length < 3) return;
        doc.master = doc.master || {};
        (doc.master[parts[1]] = doc.master[parts[1]] || {})[parts[2]] = v;
      } else if (parts[0] === 'send') {
        var s = doc.sends && doc.sends[parts[1]];
        if (s == null) return;
        if (typeof s === 'string') s = doc.sends[parts[1]] = { type: s };
        s[parts[2]] = v;
      } else {
        t = docTrack(doc, parts[0]); var tr = seq.tracks[parts[0]];
        if (!t || !tr) return;
        if (parts.length === 2) {
          var p = parts[1];
          if (tr.inst.spec && has(tr.inst.spec, p)) { t.params = t.params || {}; t.params[p] = v; }
          else if (p === 'mute') return;
          else if (has(tr.channel.spec, p)) t[p] = v;
          else if (t.chain) {                              // a bare insert param goes to every unit that has it
            for (j = 0, k = 0; j < t.chain.length; j++) {
              if (entryName(t.chain[j]) == null) continue;
              var pr = tr.chain.procs[k++];
              if (pr && pr.spec && has(pr.spec, p)) entryObject(t, j)[p] = v;
            }
          }
        } else if (parts[1] === 'sc') { t.sidechain = t.sidechain || {}; t.sidechain[parts[2]] = v; }
        else if (parts[1] === 'send') { t.sends = t.sends || {}; t.sends[parts[2]] = v; }
        else if (t.chain) {
          for (i = 0; i < t.chain.length; i++) if (entryName(t.chain[i]) === parts[1]) { entryObject(t, i)[parts[2]] = v; break; }
        }
      }
      if (clean) builtKey = structKey(doc);          // the engine already has it; a pending structural edit still rebuilds
    }
    host.setParam = function (path, v) {
      try {
        path = String(path);
        var parts = path.split('.'), ok;
        if (mutePath(parts)) { seq.mute(parts[0], !!v); ok = true; }
        else if (sendPath(parts)) {
          var n = Number(v); if (n !== n) return false;
          n = clamp(n, 0, 1.5);
          ok = seq.setSend(parts[0], parts[2], n);
          if (!ok && !live && seq.sends[parts[2]]) ok = true;      // no context: the document holds the level
          if (ok) sendNow[path] = n;
        } else ok = rawSet(path, v);
        if (!ok) return false;
        var value = host.getParam(path);
        if (!mutePath(parts)) persist(path, parts, value === undefined ? v : value);
        if (has(seq._base, path)) seq._base[path] = value === undefined ? v : value;   // the pre-arrangement value is now this
        emit('param', { path: path, value: value === undefined ? v : value, source: 'ui' });
        return true;
      } catch (e) { return false; }
    };
    // the arranged value of a path at the current position: the latest section `set` at or before it
    // the arranged value of a path at the current position (section sets and ramps, see seq.arranged)
    function arrangedValue(path) {
      var a = seq.arranged(seq._step);
      return has(a.values, path) ? { value: a.values[path] } : null;
    }
    // a knob gesture starts with hold(path) (A11's audit: once per drag, before the first value): one undo step each
    host.hold = function (path) { snapshot(ed); seq.hold(path); return host; };
    // re-enable arranged: the path follows the arrangement again, from now (ramps resume on the next step)
    host.release = function (path) {
      path = String(path);
      if (!seq.held[path]) return host;
      seq.release(path);
      var a = arrangedValue(path);
      if (a && rawSet(path, a.value)) emit('param', { path: path, value: host.getParam(path), source: 'arrangement' });
      return host;
    };
    host.releaseAll = function () {
      var paths = Object.keys(seq.held);
      for (var i = 0; i < paths.length; i++) host.release(paths[i]);
      seq.releaseAll();
      return host;
    };
    host.heldCount = function () { return seq.heldCount(); };
    host.isHeld = function (path) { return !!seq.held[String(path)]; };

    // ---------------------------------------------------------- bypass (inserts, sidechains, sends, master units)
    function bypassEntry(d) {
      var doc = ed.doc, t, j;
      if (d.kind === 'insert') {
        t = docTrack(doc, d.track); if (!t || !t.chain) return null;
        for (j = 0; j < t.chain.length; j++) if (entryName(t.chain[j]) === d.name) return entryObject(t, j);
        return null;
      }
      if (d.kind === 'sidechain') { t = docTrack(doc, d.track); if (!t) return null; return (t.sidechain = t.sidechain || {}); }
      if (d.kind === 'send') {
        if (!doc.sends || doc.sends[d.name] == null) return null;
        if (typeof doc.sends[d.name] === 'string') doc.sends[d.name] = { type: doc.sends[d.name] };
        return doc.sends[d.name];
      }
      if (d.kind === 'master') { doc.master = doc.master || {}; return (doc.master[d.name] = doc.master[d.name] || {}); }
      return null;
    }
    // bypass a processor device: live, stored in the document (rebuild, save, export keep it), one undo step
    host.bypass = function (id, on) {
      var d = host.device(id);
      if (!d || !d.ref || typeof d.ref.bypass !== 'function' || d.kind === 'instrument' || d.kind === 'channel') return false;
      on = !!on;
      var clean = structKey(ed.doc) === builtKey;
      snapshot(ed);
      d.ref.bypass(on);
      var e = bypassEntry(d);
      if (e) { if (on) e.bypass = true; else delete e.bypass; }
      if (clean) builtKey = structKey(ed.doc);
      emit('bypass', { id: id, on: on });
      return true;
    };
    host.isBypassed = function (id) { var d = host.device(id); return !!(d && d.ref && d.ref._bypassed); };
    host.mute = function (track, b) { var r = seq.mute(track, b); if (r !== undefined) emit('param', { path: track + '.mute', value: r, source: 'ui' }); return r; };
    host.solo = function (track, b) { var r = seq.solo(track, b); if (r !== undefined) emit('param', { path: track + '.solo', value: r, source: 'ui' }); return r; };
    // play one note on a track's live instrument now (a panel keyboard): no document change, no undo entry.
    // o: {midi, vel, dur}. False when audio has not started or the track is unknown.
    host.audition = function (track, o) {
      var tr = seq && seq.tracks ? seq.tracks[track] : null;
      if (!live || !ctx || !tr || !tr.inst || typeof tr.inst.trigger !== 'function') return false;
      o = o || {};
      var ev = { midi: typeof o.midi === 'number' ? o.midi : 48, vel: typeof o.vel === 'number' ? o.vel : 0.85, dur: typeof o.dur === 'number' && o.dur > 0 ? o.dur : 0.25 };
      try { tr.inst.trigger(ctx.currentTime, ev); } catch (e) { return false; }
      return true;
    };


    // ---------------------------------------------------------- audio files (sampler)
    function audioMap() { return ed.doc.audio || {}; }
    function missingIds() { var a = audioMap(), out = []; for (var id in a) if (has(a, id) && !buffers[id]) out.push(id); return out; }
    // who uses an audio file: sampler tracks by name, programs as 'program:<id>' (a program region keeps it alive)
    function usedBy(id) {
      var out = [], t = ed.doc.tracks, m = ed.doc.programs, pid, j;
      for (var i = 0; i < t.length; i++) if (isSamplerDef(t[i]) && t[i].params && t[i].params.buffer === id) out.push(t[i].name);
      if (m) for (pid in m) if (has(m, pid) && m[pid] && m[pid].regions) {
        for (j = 0; j < m[pid].regions.length; j++) if (m[pid].regions[j] && m[pid].regions[j].buffer === id) { out.push('program:' + pid); break; }
      }
      return out;
    }
    // after a load: keep decoded buffers the new document names with the same file, drop the rest
    function keepBuffers() {
      var a = audioMap(), id, keep = {};
      for (id in buffers) if (has(buffers, id) && has(a, id) && a[id].name === buffers[id].name && (a[id].src || '') === (buffers[id].src || '')) keep[id] = buffers[id];
      buffers = keep;
    }
    function decoder() {
      if (live && ctx) return ctx;
      if (opts.context) return opts.context;
      if (decCtx) return decCtx;
      var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
      if (OAC) { try { decCtx = new OAC(2, 1, 44100); } catch (e) { decCtx = null; } }
      return decCtx;
    }
    function baseName(s) { s = String(s || ''); s = s.split(/[?#]/)[0]; var n = s.split(/[\\/]/).pop(); try { n = decodeURIComponent(n); } catch (e) {} return n || 'audio'; }
    function sourceInfo(src, o) {
      var name = null, path = null, sh = (o && o.shell) || root.HavantechnoShell || null;
      if (typeof src === 'string') { name = baseName(src); path = src; }
      else if (src && !isBuf(src) && !isView(src) && src.bytes != null) { name = src.name || baseName(src.path); path = src.path || null; }
      else if (src && !isBuf(src) && !isView(src) && typeof src === 'object') {
        name = src.name || null;
        try { path = (sh && typeof sh.pathForFile === 'function' && sh.pathForFile(src)) || src.path || null; } catch (e) { path = src.path || null; }
      }
      name = String((o && o.name) || name || 'audio');
      return { name: name, src: String((o && o.src) || path || name) };
    }
    function readBytes(src) {
      if (isBuf(src)) return Promise.resolve(src.slice(0));                     // decodeAudioData detaches its input
      if (isView(src)) return Promise.resolve(src.buffer.slice(src.byteOffset, src.byteOffset + src.byteLength));
      if (src && typeof src === 'object' && src.bytes != null) return readBytes(src.bytes);
      if (src && typeof src.arrayBuffer === 'function') return Promise.resolve(src.arrayBuffer());
      if (src && typeof root.FileReader === 'function' && typeof root.Blob === 'function' && src instanceof root.Blob) {
        return new Promise(function (resolve, reject) {
          var r = new root.FileReader();
          r.onload = function () { resolve(r.result); };
          r.onerror = function () { reject(r.error || new Error('Host.loadAudio: could not read the file')); };
          r.readAsArrayBuffer(src);
        });
      }
      if (typeof src === 'string') {
        if (typeof root.fetch !== 'function') return Promise.reject(new Error('Host.loadAudio: no fetch to load ' + src));
        return Promise.resolve(root.fetch(src)).then(function (r) {
          if (!r || (r.ok === false)) throw new Error('Host.loadAudio: could not load ' + src + (r ? ' (' + r.status + ')' : ''));
          return r.arrayBuffer();
        });
      }
      return Promise.reject(new Error('Host.loadAudio: unsupported source'));
    }
    function decode(dec, ab) {
      return new Promise(function (resolve, reject) {
        var done = false;
        function ok(b) { if (done) return; done = true; if (b) resolve(b); else reject(new Error('Host.loadAudio: the decoder returned nothing')); }
        function bad(e) { if (done) return; done = true; reject(new Error('Host.loadAudio: could not decode the audio' + (e && e.message ? ' (' + e.message + ')' : ''))); }
        try { var p = dec.decodeAudioData(ab, ok, bad); if (p && typeof p.then === 'function') p.then(ok, bad); } catch (e) { bad(e); }
      });
    }
    function slug(name) {
      var b = String(name || 'audio').replace(/\.[A-Za-z0-9]{1,5}$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
      return b || 'audio';
    }
    function newId(name) {
      var a = audioMap(), b = slug(name), id = b, n = 2;
      while (has(a, id) || has(buffers, id)) id = b + '_' + (n++);
      return id;
    }
    // a missing entry with the same file name: re-adding the file on the web relinks it
    function relinkId(name) { var a = audioMap(); for (var id in a) if (has(a, id) && !buffers[id] && a[id].name === name) return id; return null; }
    var ID_RE = /^[A-Za-z0-9_.-]{1,64}$/;
    function programUses(pid, bufId) {
      var p = getProgram(pid);
      if (!p || !p.regions) return false;
      for (var j = 0; j < p.regions.length; j++) if (p.regions[j] && p.regions[j].buffer === bufId) return true;
      return false;
    }
    // a file arrived or went: samplers that play it (directly or through a program region) re-read it
    function refreshSamplers(id) {
      for (var n in seq.tracks) if (has(seq.tracks, n)) {
        var inst = seq.tracks[n].inst;
        if (!inst || inst.type !== 'sampler' || !inst.params) continue;
        try {
          if (inst.params.buffer === id) inst.set('buffer', id);
          if (inst.params.program && programUses(inst.params.program, id) && inst.spec && has(inst.spec, 'program')) inst.set('program', inst.params.program);
        } catch (e) {}
      }
    }
    // WAV header metadata (B1 §7.4), read before decodeAudioData detaches the bytes. Programs.readWavMeta when
    // programs.js is loaded; until then this fallback reads fmt (rate), smpl (unity note, fraction, loops) and acid (root).
    function wavMeta(ab) {
      var M = root.Programs;
      if (M && typeof M.readWavMeta === 'function') {
        try {
          var r = M.readWavMeta(ab);                         // always an object; empty (rate 0) when it is not a WAV
          if (!r || (!(r.rate > 0) && r.root == null && !(r.loops && r.loops.length))) return null;
          var o = {};
          for (var k in r) if (has(r, k) && r[k] != null && !(isArr(r[k]) && !r[k].length)) o[k] = r[k];
          return o;
        } catch (e) { return null; }
      }
      try {
        if (!isBuf(ab) || ab.byteLength < 12) return null;
        var dv = new DataView(ab), len = ab.byteLength;
        var tag = function (o) { return String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3)); };
        if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;
        var m = {}, any = false, p = 12, acidRoot = null;
        while (p + 8 <= len) {
          var id = tag(p), size = dv.getUint32(p + 4, true), b = p + 8, end = Math.min(len, b + size);
          if (id === 'fmt ' && end - b >= 8) { m.rate = dv.getUint32(b + 4, true); any = true; }
          else if (id === 'smpl' && end - b >= 36) {
            m.root = dv.getUint32(b + 12, true); m.fraction = dv.getUint32(b + 16, true) / 4294967296;
            var n = dv.getUint32(b + 28, true), loops = [];
            for (var i = 0; i < n && b + 36 + 24 * (i + 1) <= end; i++) { var q = b + 36 + 24 * i; loops.push([dv.getUint32(q + 8, true), dv.getUint32(q + 12, true)]); }
            m.loops = loops; any = true;
          } else if (id === 'acid' && end - b >= 6) { acidRoot = dv.getUint16(b + 4, true); any = true; }
          p = b + size + (size & 1);
        }
        if (m.root == null && acidRoot != null) m.root = acidRoot;
        return any ? m : null;
      } catch (e) { return null; }
    }
    // pitch analysis (Programs.detectPitch) after decoding; null without programs.js or for a failed run
    function analyze(buf) {
      var M = root.Programs;
      if (!M || typeof M.detectPitch !== 'function' || !buf || typeof buf.getChannelData !== 'function') return null;
      try {
        var r = M.detectPitch(buf.getChannelData(0), buf.sampleRate) || {};
        var hz = r.hz > 0 ? r.hz : 0;                        // Programs.autoMap reads analysis.hz and analysis.root
        return { pitch: hz || null, hz: hz, root: hz ? (r.root == null ? null : r.root) : null, midi: hz ? r.midi : null, cents: hz ? (r.cents || 0) : 0, clarity: r.clarity || 0 };
      } catch (e) { return null; }
    }
    function clone2(o) { var c = {}; for (var k in o) if (has(o, k)) c[k] = o[k]; return c; }
    // re-run pitch detection on a loaded file (the face's "Re-detect pitch"); writes doc.audio[id].analysis, emits 'audio'
    host.detectPitch = function (id) {
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          try {
            needP('detectPitch');
            var buf = getBuffer(id), a = audioMap()[id];
            if (!buf || !a) throw new Error('Host.detectPitch: ' + id + ' is not loaded');
            var an = analyze(buf);
            if (!an) throw new Error('Host.detectPitch: the analysis failed');
            a.analysis = an;
            emit('audio', { id: id, status: 'analysed' });
            resolve({ hz: an.hz, midi: an.midi, cents: an.cents, confidence: an.clarity });
          } catch (e) { reject(e); }
        }, 0);
      });
    };
    function store(buf, info, o, g, meta) {
      var id = (o.id && ID_RE.test(String(o.id))) ? String(o.id) : (relinkId(info.name) || newId(info.name));
      if (g !== gen) return id;                                // the document changed while this was decoding
      var dur = typeof buf.duration === 'number' ? buf.duration : buf.length / buf.sampleRate;
      buffers[id] = { buffer: buf, name: info.name, src: info.src };
      var doc = ed.doc;
      doc.audio = doc.audio || {};
      var entry = { name: info.name, src: info.src, duration: dur, sampleRate: buf.sampleRate, channels: buf.numberOfChannels };
      if (meta) entry.meta = meta;
      var an = o.analyze === false ? null : analyze(buf);
      if (an) entry.analysis = an;
      doc.audio[id] = entry;
      refreshSamplers(id);
      emit('audio', { id: id, status: 'loaded' });
      return id;
    }
    host.loadAudio = function (source, o) {
      o = o || {};
      var g = gen;
      return new Promise(function (resolve) {
        var dec = decoder();
        if (!dec) throw new Error('Host.loadAudio: no AudioContext to decode with');
        var info = sourceInfo(source, o);
        var meta = null;
        resolve(readBytes(source).then(function (ab) { meta = wavMeta(ab); return decode(dec, ab); }).then(function (buf) { return store(buf, info, o, g, meta); }));
      });
    };
    host.buffer = function (id) { return getBuffer(id); };
    host.audio = function () {
      var a = audioMap(), out = [], id;
      for (id in a) if (has(a, id)) {
        var e = a[id];
        out.push({ id: id, name: e.name, src: e.src, duration: e.duration, sampleRate: e.sampleRate, channels: e.channels, loaded: !!buffers[id], missing: !buffers[id], usedBy: usedBy(id) });
      }
      for (id in buffers) if (has(buffers, id) && !has(a, id)) {
        var b = buffers[id], bf = b.buffer;
        out.push({ id: id, name: b.name, src: b.src, duration: bf.duration, sampleRate: bf.sampleRate, channels: bf.numberOfChannels, loaded: true, missing: false, usedBy: usedBy(id) });
      }
      return out;
    };
    // drop a decoded buffer; the document keeps the reference while a track still uses it (then it lists as missing)
    host.unloadAudio = function (id) {
      var a = audioMap();
      if (!has(buffers, id) && !has(a, id)) return false;
      delete buffers[id];
      if (!usedBy(id).length && ed.doc.audio) delete ed.doc.audio[id];
      refreshSamplers(id);
      emit('audio', { id: id, status: 'unloaded' });
      return true;
    };
    // load every audio entry of the document that has no buffer: URLs through fetch, file paths through
    // HavantechnoShell.readFile(path, {base}) (Electron). Anything else is missing: the track stays silent. Never rejects.
    host.reloadAudio = function (o) {
      o = o || lastAudioOpts || {};
      var a = audioMap(), ids = missingIds(), sh = o.shell || root.HavantechnoShell || null, res = { loaded: [], missing: [] }, g = gen;
      var page = root.location && /^https?:$/.test(root.location.protocol || '');
      var jobs = ids.map(function (id) {
        var e = a[id], src = e.src || '', p, lo = { id: id, name: e.name, src: src };
        if (URLISH.test(src) || (page && !sh && src.indexOf('/') >= 0)) p = host.loadAudio(src, lo);
        else if (sh && typeof sh.readFile === 'function' && src) {
          p = Promise.resolve(sh.readFile(src, o.base ? { base: o.base } : {})).then(function (bytes) {
            if (!bytes) throw new Error('unreadable');
            return host.loadAudio(bytes, lo);
          });
        } else p = Promise.reject(new Error('no readable source'));
        return p.then(function () { res.loaded.push(id); }, function () {
          res.missing.push(id);
          if (g === gen) emit('audio', { id: id, status: 'missing' });
        });
      });
      audioPromise = Promise.all(jobs).then(function () { return res; });
      return audioPromise;
    };
    host.audioReady = function () { return audioPromise || Promise.resolve({ loaded: [], missing: missingIds() }); };
    // load a file and add a sampler track that plays it (pattern default: one hit at the start of each bar). Commits.
    // a new sampler track: one file (single-sample path), or o.program (an id in doc.programs), or an array of files /
    // a {relativePath: File} folder map (auto-mapped into a program first). Resolves the track name. Commits.
    function addSamplerTrack(base, params, o) {
      var name = String(base).replace(/[^A-Za-z0-9_-]+/g, '_') || 'sample', b = name, n = 2;
      while (ed.track(name) || name === 'send' || name === 'master') name = b + '_' + (n++);
      var t = { name: name, type: 'sampler', inst: 'sampler', gain: o.gain == null ? 0.8 : o.gain, params: params, variants: { A: o.pattern || 'x...............' } };
      if (o.family && has(FAMILIES, o.family)) t.family = o.family;
      ed.addTrack(t);
      host.commit();
      return name;
    }
    function programParams(id) {
      var g = (getProgram(id) || {}).global || {}, spec = root.Synths && root.Synths.spec ? root.Synths.spec('sampler') : null, out = { buffer: '', program: id };
      for (var k in g) if (has(g, k) && k !== 'program' && k !== 'buffer' && (!spec || has(spec, k))) out[k] = g[k];
      return out;
    }
    host.addSampler = function (source, o) {
      o = o || {};
      if (o.program) {
        if (!getProgram(o.program)) return Promise.reject(new Error('Host.addSampler: no program ' + o.program));
        return Promise.resolve(addSamplerTrack(o.name || getProgram(o.program).name || o.program, programParams(o.program), o));
      }
      if (isArr(source) || (source && typeof source === 'object' && !isBuf(source) && !isView(source) && source.bytes == null && typeof source.arrayBuffer !== 'function' && !(typeof root.Blob === 'function' && source instanceof root.Blob))) {
        return host.mapFiles(source, o).then(function (pid) { return addSamplerTrack(o.name || getProgram(pid).name || pid, programParams(pid), o); });
      }
      return host.loadAudio(source, o.id ? { id: o.id, name: o.fileName, src: o.src } : { name: o.fileName, src: o.src }).then(function (id) {
        return addSamplerTrack(o.name || id, { buffer: id }, o);
      });
    };


    // ---------------------------------------------------------- programs (batch 1, B1 §6 and §7)
    var progSeen = {};
    function getProgram(id) { var m = ed && ed.doc.programs; return (m && id && has(m, id)) ? m[id] : null; }
    function needP(fn) {
      var M = root.Programs;
      if (!M || typeof M[fn] !== 'function') throw new Error('Host: Programs is not loaded (Programs.' + fn + ')');
      return M;
    }
    function normProg(p) {
      var M = root.Programs;
      if (M && typeof M.normalize === 'function') { try { var n = M.normalize(p); if (n) return n; } catch (e) {} }
      return p;
    }
    function normalizeDocPrograms() {
      var m = ed.doc.programs, M = root.Programs;
      if (!m || !M || typeof M.normalize !== 'function') return;
      for (var id in m) if (has(m, id)) { try { var n = M.normalize(m[id]); if (n) m[id] = n; } catch (e) {} }
    }
    function programsJson() {
      var m = ed.doc.programs, out = {};
      if (m) for (var id in m) if (has(m, id)) out[id] = JSON.stringify(m[id]);
      return out;
    }
    // after a commit: 'program' events for programs added, changed or removed by editor operations (or undo)
    function programEvents() {
      var now = programsJson(), id;
      for (id in now) if (has(now, id)) { if (!has(progSeen, id)) emit('program', { id: id, status: 'added' }); else if (progSeen[id] !== now[id]) emit('program', { id: id, status: 'changed' }); }
      for (id in progSeen) if (has(progSeen, id) && !has(now, id)) emit('program', { id: id, status: 'removed' });
      progSeen = now;
    }
    function programTracks(id) {
      var out = [], t = ed.doc.tracks;
      for (var i = 0; i < t.length; i++) if (isSamplerDef(t[i]) && t[i].params && t[i].params.program === id) out.push(t[i].name);
      return out;
    }
    function newProgramId(name) {
      var m = ed.doc.programs || {}, b = slug(name || 'program'), id = b, n = 2;
      while (has(m, id)) id = b + '_' + (n++);
      return id;
    }
    host.programs = function () {
      var m = ed.doc.programs || {}, out = [], id, i;
      for (id in m) if (has(m, id)) {
        var p = m[id], miss = 0;
        for (i = 0; i < p.regions.length; i++) if (!buffers[p.regions[i].buffer]) miss++;
        out.push({ id: id, name: p.name, kind: p.kind || null, regions: p.regions.length, missing: miss, usedBy: programTracks(id) });
      }
      return out;
    };
    host.program = function (id) { var p = getProgram(id); return p ? clone(p) : null; };
    // store a program in doc.programs (normalised by Programs.normalize when loaded); one undo step. Returns the id or null.
    host.addProgram = function (program, o) {
      o = o || {};
      if (!program || typeof program !== 'object') return null;
      var id = (o.id && ID_RE.test(String(o.id)) && !getProgram(o.id)) ? String(o.id) : newProgramId(program.name);
      var r = ed.addProgram(id, normProg(program));
      if (r) { progSeen[id] = JSON.stringify(getProgram(id)); emit('program', { id: id, status: 'added' }); }
      return r;
    };
    // refused while a track plays it
    host.removeProgram = function (id) {
      if (!ed.removeProgram(id)) return false;
      delete progSeen[id];
      emit('program', { id: id, status: 'removed' });
      return true;
    };
    // a sampler track plays a program: params.program = id and program.global copied into its params (one undo step), commit
    host.assignProgram = function (track, id) {
      var t = ed.track(track);
      if (!t || !isSamplerDef(t) || (id && !getProgram(id))) return false;
      var g = id ? (getProgram(id).global || {}) : {}, spec = root.Synths && root.Synths.spec ? root.Synths.spec('sampler') : null;
      ed.group(function () {
        ed.setTrackParam(track, 'program', id || '');
        for (var k in g) if (has(g, k) && k !== 'program' && k !== 'buffer' && (!spec || has(spec, k))) ed.setTrackParam(track, k, g[k]);
      });
      host.commit();
      return true;
    };
    // ---- import: SFZ text, a File, the shell's {name, path, text|bytes}, or a URL; samples from o.files, the shell or URLs
    function dirOf(p) { p = String(p || '').replace(/\\/g, '/'); var i = p.lastIndexOf('/'); return i >= 0 ? p.slice(0, i) : ''; }
    function joinPath(dir, p) {
      p = String(p || '').replace(/\\/g, '/');
      if (!dir || /^([a-z][a-z0-9+.-]*:|\/)/i.test(p)) return p;
      var parts = (dir + '/' + p).split('/'), out = [];
      for (var i = 0; i < parts.length; i++) { if (parts[i] === '..' && out.length && out[out.length - 1] !== '..') out.pop(); else if (parts[i] !== '.' && parts[i] !== '') out.push(parts[i]); else if (i === 0 && parts[i] === '') out.push(''); }
      return out.join('/');
    }
    // a key of a {relativePath: File|bytes} map: exact, then case-insensitive (SFZ libraries made on Windows)
    function fileKey(files, p) {
      if (!files) return null;
      p = String(p).replace(/\\/g, '/');
      if (has(files, p)) return p;
      var lp = p.toLowerCase();
      for (var k in files) if (has(files, k) && String(k).replace(/\\/g, '/').toLowerCase() === lp) return k;
      return null;
    }
    function textOf(x) {
      if (typeof x === 'string') return Promise.resolve(x);
      if (x && typeof x.text === 'string') return Promise.resolve(x.text);
      if (x && typeof x.text === 'function') return Promise.resolve(x.text());
      if (x && x.bytes != null) x = x.bytes;
      if (isBuf(x) || isView(x)) {
        var u = isBuf(x) ? new Uint8Array(x) : new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
        if (typeof root.TextDecoder === 'function') return Promise.resolve(new root.TextDecoder('utf-8').decode(u));
        var s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return Promise.resolve(s);
      }
      return Promise.reject(new Error('Host.importProgram: cannot read the .sfz source'));
    }
    function sfzSource(source, o) {
      var path = o.path || null, name = o.name || null;
      if (typeof source === 'string' && /[\n<]/.test(source)) return Promise.resolve({ text: source, name: name || 'program.sfz', path: path, url: null });
      if (typeof source === 'string') {
        if (typeof root.fetch !== 'function') return Promise.reject(new Error('Host.importProgram: no fetch for ' + source));
        return Promise.resolve(root.fetch(source)).then(function (r) {
          if (!r || r.ok === false) throw new Error('Host.importProgram: could not load ' + source);
          return r.text();
        }).then(function (t) { return { text: t, name: name || baseName(source), path: path || source, url: source }; });
      }
      return textOf(source).then(function (t) {
        var rp = source && (source.webkitRelativePath || source.relativePath);
        return { text: t, name: name || (source && source.name) || 'program.sfz', path: path || rp || (source && source.path) || (source && source.name) || null, url: null };
      });
    }
    function isAbs(p) { return /^(\/|[A-Za-z]:[\\/])/.test(String(p || '')); }
    // read one file the .sfz names (a sample: bytes or File; an #include: text); resolves null when it cannot be found
    function readRel(rel, src, o, sh, asText) {
      var files = o.files, sfzDir = dirOf(src.path), full = joinPath(sfzDir, rel), k = fileKey(files, full) || fileKey(files, rel);
      if (k != null) return Promise.resolve(asText ? textOf(files[k]) : files[k]).then(function (x) { return { data: x, src: o.base ? joinPath(o.base, k) : k }; });
      if (src.url && typeof root.fetch === 'function') {
        var u; try { u = new root.URL(rel, src.url).href; } catch (e) { u = null; }
        if (u) return Promise.resolve(root.fetch(u)).then(function (r) {
          if (!r || r.ok === false) return null;
          return (asText ? r.text() : Promise.resolve(u)).then(function (x) { return { data: x, src: u }; });
        }, function () { return null; });
      }
      var abs = isAbs(full) ? full : (o.base ? joinPath(o.base, full) : null);
      if (!asText && sh && typeof sh.readFile === 'function' && abs) {
        return Promise.resolve(sh.readFile(abs, {})).then(function (b) { return b ? { data: b, src: abs } : null; }, function () { return null; });
      }
      if (asText && sh && typeof sh.readText === 'function' && abs) {
        // HavantechnoShell.readText(path, {base}): .sfz .txt .json, 4 MiB, null when missing or refused (A6)
        return Promise.resolve(sh.readText(abs, {})).then(function (t) { return t == null ? null : { data: t, src: abs }; }, function () { return null; });
      }
      return Promise.resolve(null);
    }
    function prefetchIncludes(text, src, o, sh, map, depth) {
      if (depth > 8) return Promise.resolve();
      var re = /#include\s+"([^"]+)"/g, m, jobs = [];
      while ((m = re.exec(text))) {
        var p = m[1];
        if (has(map, p)) continue;
        map[p] = null;
        jobs.push((function (p) {
          return readRel(p, src, o, sh, true).then(function (r) {
            if (r && typeof r.data === 'string') { map[p] = r.data; return prefetchIncludes(r.data, src, o, sh, map, depth + 1); }
          });
        })(p));
      }
      return Promise.all(jobs);
    }
    // a placeholder entry for a sample that could not be read: the region keeps its id and plays when the file is re-added
    function missingAudio(name, src) {
      var a = ed.doc.audio = ed.doc.audio || {}, id = relinkId(name) || newId(name);
      if (!has(a, id)) a[id] = { name: name, src: src };
      return id;
    }
    // a dropped or picked file list ([File] with webkitRelativePath, or the shell's [{name, path, bytes}]) -> {relativePath: file}
    function filesMap(list) {
      if (!isArr(list)) return list || null;
      var m = {};
      list.forEach(function (f) { if (f) m[String(f.webkitRelativePath || f.relativePath || f.path || f.name).replace(/\\/g, '/')] = f; });
      return m;
    }
    host.importProgram = function (source, o) {
      o = o || {};
      if (o.files) { var fm = filesMap(o.files); o = clone2(o); o.files = fm; }
      var M;
      try { M = needP('parseSfz'); } catch (e) { return Promise.reject(e); }
      var sh = o.shell || root.HavantechnoShell || null, g = gen;
      return sfzSource(source, o).then(function (src) {
        var incs = {};
        return prefetchIncludes(src.text, src, o, sh, incs, 0).then(function () {
          var unresolved = Object.keys(incs).filter(function (k) { return incs[k] == null; });
          var include = function (p) { var k = fileKey(incs, p); return k == null ? null : incs[k]; };
          var first = M.parseSfz(src.text, { resolve: function () { return null; }, include: include }) || {};
          var paths = [], seen = {}, ids = {}, missing = [];
          (first.samples || []).forEach(function (p) { if (!seen[p]) { seen[p] = 1; paths.push(p); } });
          return Promise.all(paths.map(function (p) {
            var name = baseName(p);
            return readRel(p, src, o, sh, false).then(function (r) {
              if (!r) throw new Error('missing');
              return host.loadAudio(r.data, { name: name, src: r.src, shell: sh });
            }).then(function (id) { ids[p] = id; }, function () {
              var fullSrc = isAbs(p) ? p : joinPath(o.base || dirOf(src.path), p);
              ids[p] = missingAudio(name, fullSrc); missing.push(ids[p]);
            });
          })).then(function () {
            if (g !== gen) throw new Error('Host.importProgram: the document changed during the import');
            var res = M.parseSfz(src.text, { resolve: function (p) { return has(ids, p) ? ids[p] : null; }, include: include }) || {};
            var program = res.program || { regions: [] };
            if (!program.name) program.name = String(src.name || 'program').replace(/\.sfz$/i, '');
            if (!program.source) program.source = { format: 'sfz', path: src.path || src.name };
            var id = host.addProgram(program, { id: o.id });
            missing.forEach(function (m) { emit('audio', { id: m, status: 'missing' }); });
            var warnings = (res.warnings || []).slice();
            unresolved.forEach(function (p) {
              if (!warnings.some(function (w) { return w && w.opcode === '#include' && String(w.why || '').indexOf(p) >= 0; })) warnings.push({ line: 0, opcode: '#include', why: 'include not found: ' + p });
            });
            return { id: id, warnings: warnings, missing: missing, unresolvedIncludes: unresolved };
          });
        });
      });
    };
    // auto-map files (B1 §4.3): sources = [File|bytes|{name, path, bytes}|URL] or {relativePath: File}; resolves the id
    host.mapFiles = function (sources, o) {
      o = o || {};
      var M;
      try { M = needP('autoMap'); } catch (e) { return Promise.reject(e); }
      var list = [];
      if (isArr(sources)) list = sources.map(function (s) { return { src: s, name: null }; });
      else if (sources && typeof sources === 'object') for (var k in sources) if (has(sources, k)) list.push({ src: sources[k], name: baseName(k), path: k });
      return Promise.all(list.map(function (x) {
        var lo = { shell: o.shell }; if (x.name) lo.name = x.name; if (x.path) lo.src = o.base ? joinPath(o.base, x.path) : x.path;
        return host.loadAudio(x.src, lo).then(function (id) { return id; }, function () { return null; });
      })).then(function (ids) {
        var a = audioMap(), entries = [];
        ids.forEach(function (id) { if (id && a[id]) entries.push({ id: id, name: a[id].name, analysis: a[id].analysis || null, meta: a[id].meta || null }); });
        if (!entries.length) throw new Error('Host.mapFiles: no file could be loaded');
        var program = M.autoMap(entries, { mode: o.mode || 'auto', keys: o.keys || 'mid' });
        if (o.name) program.name = o.name;
        return host.addProgram(program, { id: o.id });
      });
    };
    // one file into slices (B1 §4.3): regions on keys from 36, all on the same buffer
    host.sliceToProgram = function (bufferId, o) {
      o = o || {};
      var M = needP('slice'), buf = getBuffer(bufferId);
      if (!buf) throw new Error('Host.sliceToProgram: ' + bufferId + ' is not loaded');
      var regions = M.slice(bufferId, buf.getChannelData(0), buf.sampleRate, o) || [];
      regions.forEach(function (r) { r.buffer = bufferId; });
      var a = audioMap()[bufferId];
      return host.addProgram({ name: o.name || ((a && a.name) || bufferId).replace(/\.[A-Za-z0-9]{1,5}$/, '') + ' slices', kind: 'drums', global: { gate: 0 }, regions: regions }, { id: o.id });
    };
    // SFZ text for a program (or a track's program, with that track's params as <global>); Electron writes it when it can
    host.exportProgram = function (ref, o) {
      o = o || {};
      return new Promise(function (resolve) {
        var M = needP('toSfz'), id = ref, params = {};
        var t = ed.track(ref);
        if (t && isSamplerDef(t)) { id = t.params && t.params.program; params = clone(t.params || {}); }
        else { var users = programTracks(ref); if (users.length) params = clone(ed.track(users[0]).params || {}); }
        var p = getProgram(id);
        if (!p) throw new Error('Host.exportProgram: no program ' + ref);
        var aud = ed.doc.audio || {};
        var text = M.toSfz(p, { src: function (bid) { return (aud[bid] && aud[bid].src) || bid; }, defaultPath: o.defaultPath, params: params }), seen = {}, files = [];
        p.regions.forEach(function (r) { if (r.buffer && !seen[r.buffer]) { seen[r.buffer] = 1; files.push({ id: r.buffer, src: (audioMap()[r.buffer] || {}).src || null }); } });
        var sh = o.shell || root.HavantechnoShell || null, out = { text: text, files: files, id: id };
        if (o.save !== false && sh && typeof sh.saveFile === 'function') {
          Promise.resolve(sh.saveFile({ name: String(p.name || id) + '.sfz', text: text, filters: [{ name: 'SFZ', extensions: ['sfz'] }] })).then(function (r) {
            if (r && r.path) out.path = r.path;
            resolve(out);
          }, function () { resolve(out); });
        } else resolve(out);
      });
    };

    // ---------------------------------------------------------- devices
    function device(id, type, kind, track, name, spec, prefix, ref, fam) {
      return { id: id, type: type, kind: kind, track: track, name: name, family: fam || family(type), spec: spec, pathPrefix: prefix, ref: ref };
    }
    // a track's family: the document's `family` when it names one, else the instrument's (samplers default to drums)
    function trackFamily(tr) {
      if (tr.def && has(FAMILIES, tr.def.family)) return tr.def.family;
      return isSamplerDef(tr.def) ? 'drums' : family(tr.inst.type);
    }
    function channelSpec(tr) {
      var out = {}, k, sp = tr.channel.spec;
      for (k in sp) if (has(sp, k)) out[k] = sp[k];
      for (var i = 0; i < seq.sendOrder.length; i++) {
        var n = seq.sendOrder[i];
        out['send.' + n] = { min: 0, max: 1.5, value: seq.sendLevel(tr.name, n) };
      }
      return out;
    }
    function buildDevices() {
      var list = [], i, j, name, tr, p;
      for (i = 0; i < seq.order.length; i++) {
        name = seq.order[i]; tr = seq.tracks[name];
        list.push(device('track:' + name, tr.inst.type, 'instrument', name, name, tr.inst.spec, name, tr.inst, trackFamily(tr)));
        for (j = 0; j < tr.chain.procs.length; j++) {
          p = tr.chain.procs[j];
          if (tr.chain.byName[p.name] !== p) continue;      // a duplicate unit name has no path of its own
          list.push(device('track:' + name + ':' + p.name, p.type, 'insert', name, p.name, p.spec, name + '.' + p.name, p));
        }
        list.push(device('track:' + name + ':sc', 'sidechain', 'sidechain', name, 'sidechain', tr.sc.spec, name + '.sc', tr.sc));
        list.push(device('track:' + name + ':channel', 'channel', 'channel', name, 'channel', channelSpec(tr), name, tr.channel));
      }
      for (i = 0; i < seq.sendOrder.length; i++) {
        name = seq.sendOrder[i]; p = seq.sends[name];
        list.push(device('send:' + name, p.type, 'send', null, name, p.spec, 'send.' + name, p));
      }
      for (i = 0; i < seq.master.procs.length; i++) {
        p = seq.master.procs[i];
        list.push(device('master:' + p.name, p.type, 'master', null, p.name, p.spec, 'master.' + p.name, p));
      }
      devById = {};
      for (i = 0; i < list.length; i++) devById[list[i].id] = list[i];
      devCache = list;
    }
    host.devices = function () { if (!devCache) buildDevices(); return devCache.slice(); };
    host.device = function (id) { if (!devCache) buildDevices(); return devById[id] || null; };

    // ---------------------------------------------------------- meters
    function outputOf(id) {
      if (id === 'master') return { out: seq.out, dev: null, corr: true };
      var d = host.device(id); if (!d) return null;
      return { out: d.kind === 'instrument' ? d.ref.out : d.ref.output, dev: d, corr: d.kind === 'master' };
    }
    function makeMeter(id) {
      var o = outputOf(id); if (!o || !o.out) return null;
      var m = { dev: o.dev, an: null, buf: null, split: null, aL: null, aR: null };
      try {
        m.an = ctx.createAnalyser(); m.an.fftSize = 1024;
        o.out.connect(m.an);
        m.buf = new Float32Array(m.an.fftSize);
        if (o.corr && typeof ctx.createChannelSplitter === 'function') {
          m.split = ctx.createChannelSplitter(2);
          m.aL = ctx.createAnalyser(); m.aR = ctx.createAnalyser(); m.aL.fftSize = m.aR.fftSize = 1024;
          o.out.connect(m.split); m.split.connect(m.aL, 0); m.split.connect(m.aR, 1);
          m.bufL = new Float32Array(1024); m.bufR = new Float32Array(1024);
        }
      } catch (e) { return null; }
      return m;
    }
    function readTime(an, buf) {
      if (typeof an.getFloatTimeDomainData === 'function') { an.getFloatTimeDomainData(buf); return buf; }
      var b = buf._bytes || (buf._bytes = new Uint8Array(buf.length)), i;
      for (i = 0; i < b.length; i++) b[i] = 128;
      if (typeof an.getByteTimeDomainData === 'function') an.getByteTimeDomainData(b);
      for (i = 0; i < b.length; i++) buf[i] = (b[i] - 128) / 128;
      return buf;
    }
    function reductionOf(d) {
      if (!d || !d.ref || !d.ref.node) return null;
      if (d.type === 'compressor' || d.type === 'limiter') {
        var r = d.ref.node.reduction;
        if (typeof r === 'number') return r;
        if (r && typeof r.value === 'number') return r.value;
        return null;
      }
      if (d.type === 'sidechain') {
        var g = d.ref.node.gain && d.ref.node.gain.value;
        return typeof g === 'number' ? 20 * Math.log(Math.max(g, 1e-5)) / Math.LN10 : null;
      }
      return null;
    }
    host.meter = function (id) {
      try {
        if (!live || !ctx) return { level: 0, peak: 0, reduction: null, correlation: null };
        var m = meters[id];
        if (m === undefined) m = meters[id] = makeMeter(id);
        if (!m) return { level: 0, peak: 0, reduction: null, correlation: null };
        var b = readTime(m.an, m.buf), pk = 0, i;
        for (i = 0; i < b.length; i++) { var a = b[i] < 0 ? -b[i] : b[i]; if (a > pk) pk = a; }
        var corr = null;
        if (m.aL) {
          var l = readTime(m.aL, m.bufL), r = readTime(m.aR, m.bufR), sl = 0, sr = 0, x = 0;
          for (i = 0; i < l.length; i++) { x += l[i] * r[i]; sl += l[i] * l[i]; sr += r[i] * r[i]; }
          corr = (sl > 1e-9 && sr > 1e-9) ? clamp(x / Math.sqrt(sl * sr), -1, 1) : 0;
        }
        return { level: Math.min(1, pk), peak: pk, reduction: reductionOf(m.dev), correlation: corr };
      } catch (e) { return { level: 0, peak: 0, reduction: null, correlation: null }; }
    };

    // ---------------------------------------------------------- song facts
    host.sections = function () {
      var out = [];
      for (var i = 0; i < seq.sections.length; i++) {
        var s = seq.sections[i];
        out.push({ index: i, name: s.name, start: s.start, bars: s.bars, play: clone(s.play), set: clone(s.set), ramp: clone(s.ramp), fx: clone(s.fx), progression: s.progression ? s.progression.slice() : null });
      }
      return out;
    };
    host.tracks = function () {
      var out = [];
      for (var i = 0; i < seq.order.length; i++) {
        var tr = seq.tracks[seq.order[i]], sends = {};
        for (var j = 0; j < seq.sendOrder.length; j++) sends[seq.sendOrder[j]] = host.getParam(tr.name + '.send.' + seq.sendOrder[j]);
        out.push({ name: tr.name, type: tr.inst.type, kind: tr.kind, family: trackFamily(tr), muted: !!tr.muted, solo: !!tr.solo, sampler: isSamplerDef(tr.def),
                   gate: tr.gate, sends: sends, inserts: tr.chain.procs.map(function (p) { return p.name; }), device: 'track:' + tr.name });
      }
      return out;
    };
    host.sends = function () {
      return seq.sendOrder.map(function (n) { return { name: n, type: seq.sends[n].type, family: family(seq.sends[n].type), device: 'send:' + n }; });
    };
    host.bpm = function (v) { if (arguments.length) host.setParam('bpm', v); return seq.bpm; };
    host.swing = function (v) { if (arguments.length) host.setParam('swing', v); return seq.swing; };
    host.totalBars = function () { return seq.totalBars; };
    host.describe = function () { return seq.describe(); };
    // the running Sequencer, for tools and the self-check only: UI code must not use it (CONTRACT: Host)
    host.engine = function () { return seq; };

    // ---------------------------------------------------------- export
    function barOf(ref, end) {
      if (ref == null) return undefined;
      if (typeof ref === 'number') return ref;
      var s = seq.section(ref);
      if (!s) return NaN;
      return end ? s.start + s.bars : s.start;
    }
    host.render = function (o) {
      o = o || {};
      var from = barOf(o.from, false), to = barOf(o.to, true);
      if (from !== from || to !== to) return Promise.reject(new Error('Host.render: unknown section'));
      var doc = clone(ed.doc), st = capture(seq);
      return Sequencer.render(function (s) {
        buildSong(s, doc);
        var k;
        for (k in st.mute) if (has(st.mute, k) && s.tracks[k]) s.mute(k, true);
        for (k in st.solo) if (has(st.solo, k) && s.tracks[k]) s.solo(k, true);
        for (k in st.held) if (has(st.held, k)) s.hold(k);     // export keeps what the user is holding, like playback
        s.seed = st.seed;
      }, { from: from || 0, to: to, sampleRate: o.sampleRate || (ctx && ctx.sampleRate) || 44100, tail: o.tail });
    };
    host.wav = function (buffer) { return Sequencer.wav(buffer); };

    // ---------------------------------------------------------- go
    setDoc(opts.doc || null);
    rebuild(null);
    if (missingIds().length) host.reloadAudio(opts);
    return host;
  }

  root.Host = { create: create, FAMILY: FAMILY, family: family };
})();
