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
 *         'document' {reason: 'start'|'load'|'commit', rebuilt}, 'param' {path, value, source: 'ui'|'arrangement'}.
 * Nothing throws without an AudioContext.
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var STEPS = 16;

  var FAMILY = {
    kick: 'drums', clap: 'drums', hat_closed: 'drums', hat_open: 'drums', shaker: 'drums', perc: 'drums',
    sub: 'bass', bass: 'bass', stab: 'keys', lead: 'keys', pad: 'keys', riser: 'fx', impact: 'fx',
    compressor: 'dynamics', limiter: 'dynamics', sidechain: 'dynamics', delay: 'time', reverb: 'time', chorus: 'time',
    filter: 'tone', eq3: 'tone', saturator: 'tone', widener: 'utility', channel: 'utility'
  };
  var SEQ_EVENTS = ['step', 'section', 'play', 'stop', 'param'];
  var SILENT = { level: 0, peak: 0, reduction: null, correlation: null };

  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function isArr(a) { return Object.prototype.toString.call(a) === '[object Array]'; }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function family(type) { return FAMILY[type] || 'utility'; }
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
    for (var u in m) if (has(m, u) && m[u] && typeof m[u] === 'object') for (var p in m[u]) if (has(m[u], p)) seq.setParam('master.' + u + '.' + p, m[u][p]);
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

  function create(opts) {
    opts = opts || {};
    var Sequencer = root.Sequencer, Song = root.Song, SongDoc = root.SongDoc;
    var host = { version: 1 };
    var ctx = null, live = false, startPromise = null;
    var seq = null, rawSet = null, ed = null, builtKey = null, devCache = null, devById = {};
    var listeners = {}, forwarders = {}, meters = {}, sendNow = {};

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
      Song.build(s, doc);
      applyMaster(s, doc);
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
    }
    host.document = function () { return ed.doc; };
    host.editor = function () { return ed; };
    host.loadDocument = function (d) {
      setDoc(d);                                    // throws on a bad document, before anything is torn down
      if (seq) { try { seq.stop(); } catch (e) {} }
      rebuild(null);                                // fresh: stopped, bar 0, nothing held, no mute or solo
      emit('document', { reason: 'load', rebuilt: true });
      return ed.doc;
    };
    host.commit = function () {
      var rebuilt = false;
      if (structKey(ed.doc) === builtKey) applyInPlace();
      else { rebuild(true); rebuilt = true; }
      emit('document', { reason: 'commit', rebuilt: rebuilt });
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
          live = true;
          rebuild(true);
          emit('document', { reason: 'start', rebuilt: true });
          var r = (ctx.state !== 'running' && ctx.resume) ? ctx.resume() : null;
          if (r && r.then) r.then(function () { resolve(true); }, function () { resolve(true); });
          else resolve(true);
        } catch (e) {
          warn('start failed: ' + (e && e.message));
          ctx = null; live = false; startPromise = null;
          try { rebuild(true); } catch (e2) {}
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
        emit('param', { path: path, value: value === undefined ? v : value, source: 'ui' });
        return true;
      } catch (e) { return false; }
    };
    // the arranged value of a path at the current position: the latest section `set` at or before it
    function arrangedValue(path) {
      var bar = Math.floor(seq._step / STEPS), sec = seq.sectionAt(bar);
      for (var i = sec ? sec.index : -1; i >= 0; i--) { var s = seq.sections[i]; if (s.set && has(s.set, path)) return { value: s.set[path] }; }
      return null;
    }
    host.hold = function (path) { seq.hold(path); return host; };
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
    host.mute = function (track, b) { var r = seq.mute(track, b); if (r !== undefined) emit('param', { path: track + '.mute', value: r, source: 'ui' }); return r; };
    host.solo = function (track, b) { var r = seq.solo(track, b); if (r !== undefined) emit('param', { path: track + '.solo', value: r, source: 'ui' }); return r; };

    // ---------------------------------------------------------- devices
    function device(id, type, kind, track, name, spec, prefix, ref) {
      return { id: id, type: type, kind: kind, track: track, name: name, family: family(type), spec: spec, pathPrefix: prefix, ref: ref };
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
        list.push(device('track:' + name, tr.inst.type, 'instrument', name, name, tr.inst.spec, name, tr.inst));
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
        out.push({ name: tr.name, type: tr.inst.type, kind: tr.kind, family: family(tr.inst.type), muted: !!tr.muted, solo: !!tr.solo,
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
        Song.build(s, doc);
        applyMaster(s, doc);
        var k;
        for (k in st.mute) if (has(st.mute, k) && s.tracks[k]) s.mute(k, true);
        for (k in st.solo) if (has(st.solo, k) && s.tracks[k]) s.solo(k, true);
        s.seed = st.seed;
      }, { from: from || 0, to: to, sampleRate: o.sampleRate || (ctx && ctx.sampleRate) || 44100, tail: o.tail });
    };
    host.wav = function (buffer) { return Sequencer.wav(buffer); };

    // ---------------------------------------------------------- go
    setDoc(opts.doc || null);
    rebuild(null);
    return host;
  }

  root.Host = { create: create, FAMILY: FAMILY, family: family };
})();
