/* Havantechno solo pages (app/solo/*.html): the shared framework. Global `Solo`.
 *
 *   Solo.boot(opts) -> api        one call per page, after the engine and panel scripts
 *   Solo.parse(line) -> cells     note tokens for stored patterns (below)
 *
 * opts: {title, label, device (track name whose panel is shown), tracks (SongDoc track defs), patterns [{name, variant: {bars,
 *   cells}} | {name, voices: {track: {bars, cells}}}], section ('loop'), bars (section length; default the longest pattern),
 *   bpm, swing, kick ('bd909' | false), drive (bool), presets ({patch: type, pattern: type} | false), help, global, onStart(api),
 *   onFrame(api), panelOpts (extra Panels.render options; {rec: true} is passed so a sequencer's keyboard writes steps)}
 * api: {host(), panel(), engine, started(), layout(), pattern(i), patterns, letters, el}
 *
 * Behaviour (as the first HVT-303 page): audio starts on a tap (host.start makes and resumes the context in the gesture and
 * awaits the worklet module); the status line names the engine and warns in amber on the approximate fallback; the panel is
 * the real one from ui/panels.js in its portrait arrangement under 720 px wide, else landscape, fitted to the width (and on a
 * desk to the height left under the bar); play and stop, pattern slots, tempo, the optional kick and drive, undo and redo, and
 * W1's Presets menus when that global exists (hidden otherwise). The page's markup is optional: missing nodes are built.
 *
 * Pattern tokens (Solo.parse): 'A1' note, '.' rest, '-' tie (the note before lasts one more step), suffixes '!' accent,
 * '~' slide (glide) into the next note, '*2'..'*4' ratchet (cell.rep); 'C3+D#3+G3' a chord (cell.notes, cell.note = lowest).
 */
(function () {
  'use strict';
  var root = window, doc = document;
  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  var NAMES = { C: 0, 'C#': 1, DB: 1, D: 2, 'D#': 3, EB: 3, E: 4, F: 5, 'F#': 6, GB: 6, G: 7, 'G#': 8, AB: 8, A: 9, 'A#': 10, BB: 10, B: 11 };

  function noteOf(tok) {
    var m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(tok);
    if (!m) return null;
    var k = m[1].toUpperCase() + (m[2] === '#' ? '#' : m[2] === 'b' ? 'B' : '');
    return NAMES[k] == null ? null : (parseInt(m[3], 10) + 1) * 12 + NAMES[k];
  }
  function parse(line) {
    var out = [], last = -1;
    String(line).trim().split(/\s+/).forEach(function (t) {
      if (t === '.') { out.push(null); last = -1; return; }
      if (t === '-') { out.push(null); if (last >= 0) out[last].len = (out[last].len || 1) + 1; return; }
      var m = /^([^!~*]+)([!~]*)(?:\*([2-4]))?([!~]*)$/.exec(t);
      if (!m) { out.push(null); last = -1; return; }
      var notes = m[1].split('+').map(noteOf).filter(function (n) { return n != null; });
      if (!notes.length) { out.push(null); last = -1; return; }
      notes.sort(function (a, b) { return a - b; });
      var fl = m[2] + m[4], c = { note: notes[0], vel: 0.85, len: 1 };
      if (notes.length > 1) c.notes = notes;
      if (fl.indexOf('!') >= 0) c.acc = true;
      if (fl.indexOf('~') >= 0) c.slide = true;
      if (m[3]) c.rep = +m[3];
      out.push(c); last = out.length - 1;
    });
    while (out.length % 16) out.push(null);
    return out;
  }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function variantOf(src) {
    if (typeof src === 'string') { var cells = parse(src); return { bars: cells.length / 16, cells: cells }; }
    var v = clone(src); v.bars = v.bars || Math.max(1, Math.ceil(v.cells.length / 16));
    while (v.cells.length < v.bars * 16) v.cells.push(null);
    return v;
  }

  // ---------------------------------------------------------------- page chrome (built when the page has none)
  function h(tag, attrs, parent, text) {
    var e = doc.createElement(tag), k;
    if (attrs) for (k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k) && attrs[k] != null) {
      if (k === 'className') e.className = attrs[k]; else e.setAttribute(k, attrs[k]);
    }
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function chrome(o) {
    var body = doc.body, el = function (id) { return doc.getElementById(id); };
    if (!el('so-panel')) {
      var head = h('header', { className: 'so-head' }, body);
      h('span', { className: 'so-mark' }, head, 'HAVANTECHNO');
      h('span', { className: 'so-model' }, head, o.title);
      if (o.label) h('span', { className: 'so-label' }, head, o.label);
      h('span', { className: 'so-status', id: 'so-status', role: 'status', 'aria-live': 'polite' }, head, 'not started');
      var bar = h('nav', { className: 'so-bar', 'aria-label': 'Playback' }, body);
      h('button', { type: 'button', id: 'so-play', className: 'so-btn so-play', 'aria-pressed': 'false', disabled: 'disabled' }, bar, 'Play');
      h('div', { className: 'so-group', role: 'radiogroup', 'aria-label': 'Pattern', id: 'so-patterns' }, bar);
      var tg = h('div', { className: 'so-group so-tempo', 'aria-label': 'Tempo' }, bar);
      h('button', { type: 'button', className: 'so-btn so-small', id: 'so-slower', 'aria-label': 'Slower' }, tg, '−');
      var lf = h('label', { className: 'so-field' }, tg); h('span', null, lf, 'BPM');
      h('input', { id: 'so-bpm', type: 'number', inputmode: 'decimal', min: '40', max: '300', step: '1', value: String(o.bpm || 120) }, lf);
      h('button', { type: 'button', className: 'so-btn so-small', id: 'so-faster', 'aria-label': 'Faster' }, tg, '+');
      if (o.kick) h('button', { type: 'button', id: 'so-drum', className: 'so-btn', 'aria-pressed': 'false' }, bar, 'Kick off');
      if (o.drive) { var dl = h('label', { className: 'so-field so-drive' }, bar); h('span', null, dl, 'Drive'); h('input', { id: 'so-drive', type: 'range', min: '0', max: '1', step: '0.01', value: '0', 'aria-label': 'Drive' }, dl); }
      h('main', { id: 'so-panel', className: 'so-panel', 'aria-label': o.title + ' panel' }, body);
      if (o.help) h('p', { className: 'so-help' }, body, o.help);
      var gate = h('div', { id: 'so-gate', className: 'so-gate', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Start audio' }, body);
      var sb = h('button', { type: 'button', id: 'so-start', className: 'so-start' }, gate);
      h('span', { className: 'so-start-mark' }, sb, 'HAVANTECHNO');
      h('span', { className: 'so-start-model' }, sb, o.title);
      h('span', { className: 'so-start-tap' }, sb, 'Tap to start');
      h('p', { className: 'so-gate-note', id: 'so-gate-note' }, gate, 'Browsers start audio only after a tap.');
    }
    var nav = doc.querySelector ? doc.querySelector('.so-bar') : null;
    if (nav && !el('so-undo')) {                    // undo and redo: every panel edit is one entry
      var ug = h('div', { className: 'so-group', 'aria-label': 'Undo' }, nav);
      h('button', { type: 'button', id: 'so-undo', className: 'so-btn', 'aria-label': 'Undo the last edit', title: 'Undo (Ctrl+Z)' }, ug, 'Undo');
      h('button', { type: 'button', id: 'so-redo', className: 'so-btn', 'aria-label': 'Redo', title: 'Redo (Ctrl+Shift+Z)' }, ug, 'Redo');
    }
    var ids = ['so-status', 'so-play', 'so-patterns', 'so-bpm', 'so-drum', 'so-drive', 'so-panel', 'so-gate', 'so-gate-note', 'so-slower', 'so-faster', 'so-start', 'so-undo', 'so-redo'], S = {};
    ids.forEach(function (id) { S[id.slice(3)] = el(id); });
    S.bar = nav;
    return S;
  }

  // ---------------------------------------------------------------- the text dialog (copy as text / paste text)
  function dialog(o) {
    var back = h('div', { className: 'so-dlg-back', role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title }, doc.body);
    var box = h('div', { className: 'so-dlg' }, back);
    h('h2', null, box, o.title);
    if (o.note) h('p', { className: 'so-dlg-note' }, box, o.note);
    var name = null, ta = null;
    if (o.name != null) { var nl = h('label', { className: 'so-field' }, box); h('span', null, nl, 'Name'); name = h('input', { type: 'text', value: o.name, maxlength: '40' }, nl); }
    if (o.text != null) { ta = h('textarea', { rows: '8', spellcheck: 'false', 'aria-label': o.title }, box); ta.value = o.text; if (o.readOnly) ta.setAttribute('readonly', 'readonly'); }
    var row = h('div', { className: 'so-dlg-row' }, box), msg = h('p', { className: 'so-dlg-msg', role: 'status' }, box);
    function close() { if (back.parentNode) back.parentNode.removeChild(back); }
    (o.buttons || []).concat([['Close', close]]).forEach(function (b) {
      var btn = h('button', { type: 'button', className: 'so-btn' }, row, b[0]);
      btn.addEventListener('click', function () { var r = b[1]({ name: name ? name.value : null, text: ta ? ta.value : null, ta: ta, close: close }); if (typeof r === 'string') msg.textContent = r; });
    });
    back.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    setTimeout(function () { try { (name || ta || row.firstChild).focus(); if (ta && o.readOnly) ta.select(); } catch (e) { /* ignore */ } }, 0);
    return { close: close, el: back };
  }
  function copyText(ta, text) {
    var done = false;
    try { if (ta) { ta.removeAttribute('readonly'); ta.select(); done = doc.execCommand && doc.execCommand('copy'); ta.setAttribute('readonly', 'readonly'); } } catch (e) { done = false; }
    try { if (root.navigator && navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).catch(function () {}); done = true; } } catch (e) { /* ignore */ }
    return done ? 'Copied. Paste it anywhere to keep it.' : 'Select the text and copy it.';
  }

  // ---------------------------------------------------------------- boot
  function boot(o) {
    o = o || {};
    var S = chrome(o), api = { patterns: o.patterns || [], letters: LETTERS, el: S, engine: null };
    var host = null, panel = null, layout = null, started = false, panelKey = null;
    var section = o.section || 'loop', dev = o.device, kick = o.kick || null;
    function status(t, kind) { if (!S.status) return; S.status.textContent = t; S.status.setAttribute('data-kind', kind || ''); }

    // ---- the song: the page's tracks, the stored patterns as variants A.., one looping section
    function song() {
      var tracks = clone(o.tracks || []), play = {}, maxBars = 1, byName = {};
      tracks.forEach(function (t) { byName[t.name] = t; t.variants = t.variants || {}; });
      api.patterns.forEach(function (p, i) {
        var L = LETTERS[i], map = p.voices || {};
        if (p.variant) { map = {}; map[dev] = p.variant; }
        Object.keys(map).forEach(function (tn) { if (!byName[tn]) return; var v = variantOf(map[tn]); byName[tn].variants[L] = v; maxBars = Math.max(maxBars, v.bars); });
      });
      tracks.forEach(function (t) { if (Object.keys(t.variants).length) play[t.name] = t.variants.A ? 'A' : Object.keys(t.variants).sort()[0]; });
      if (o.drive && byName[dev]) {
        byName[dev].chain = (byName[dev].chain || []).concat([{ type: 'saturator', name: 'drive', drive: 0.35, mix: 1, tone: 12000, trim: 0.8, bypass: true }]);
      }
      if (kick) { tracks.push({ name: kick, type: kick, inst: kick, kind: 'drum', family: 'drums', gain: 0.75, variants: { A: 'x...x...x...x...' } }); play[kick] = 'A'; }
      return { v: 1, name: o.title, bpm: o.bpm || 120, swing: o.swing || 0, key: o.key || 'C', progression: [], sends: {}, tracks: tracks,
        sections: [{ name: section, bars: o.bars || maxBars, play: play }] };
    }
    try { host = root.Host.create({ doc: song() }); } catch (e) { status('The engine could not load: ' + (e && e.message ? e.message : e), 'fallback'); return api; }
    api.host = function () { return host; };
    api.panel = function () { return panel; };
    api.started = function () { return started; };
    api.layout = function () { return layout; };
    if (o.global) root[o.global] = api;
    if (kick) { try { host.mute(kick, true); } catch (e) { /* ignore */ } }
    var machine = api.patterns.some(function (p) { return !!p.voices; });

    // ---- panel: the real one, arranged for the screen, fitted to the width
    function def() { return panelKey ? root.Panels.get(panelKey) : null; }
    function wantLayout() {
      var d = def(); if (!d || !d.layouts) return null;
      return (root.innerWidth || 1024) < 720 && d.layouts.portrait ? 'portrait' : (d.layouts.landscape ? 'landscape' : null);
    }
    function mount() {
      var device = host.device('track:' + dev);
      if (!device || !S.panel) return;
      panelKey = root.Panels.for(device, host);
      if (!panelKey) return;
      var lay = wantLayout();
      if (panel && lay === layout) { fit(); return; }
      if (panel) { try { panel.dispose(); } catch (e) { /* ignore */ } panel = null; }
      layout = lay;
      panel = root.Panels.render(device, host, Object.assign({ layout: lay || undefined, rec: true }, o.panelOpts || {}));
      S.panel.textContent = '';
      S.panel.appendChild(panel.el);
      fit();
    }
    function fit() {
      if (!panel) return;
      var d = def(), sz = (layout && d.layouts[layout]) || d.size, portrait = layout === 'portrait';
      var w = Math.max(200, S.panel.clientWidth - (portrait ? 8 : 16));
      var hh = Math.round(w * sz.h / sz.w);
      if (!portrait) {                                  // the desk: fit the width and the height left under the bar
        var top = S.panel.getBoundingClientRect().top + (root.scrollY || 0), room = Math.max(320, (root.innerHeight || 800) - top - 40);
        if (hh > room) { hh = room; w = Math.round(hh * sz.w / sz.h); }
      }
      panel.el.style.width = w + 'px'; panel.el.style.height = hh + 'px';
      panel.resize(w, hh);
      panel.el.style.width = w + 'px'; panel.el.style.height = hh + 'px';
    }
    var rzT = 0;
    root.addEventListener('resize', function () { if (rzT) clearTimeout(rzT); rzT = setTimeout(function () { rzT = 0; mount(); }, 120); });

    // ---- bar: play, patterns, tempo, kick, drive, undo
    function current() { var s = host.document().sections[0]; return (s.play && s.play[dev]) || 'A'; }
    function selectPattern(i) {
      var p = api.patterns[i]; if (!p) return;
      var ed = host.editor(), L = LETTERS[i], names = p.voices ? Object.keys(p.voices) : [dev];
      var run = function (e) { names.forEach(function (tn) { if (e.track(tn)) e.setPlay(section, tn, L); }); return true; };
      if (ed.group) ed.group(run); else run(ed);
      host.commit();
      paintBar();
    }
    api.pattern = selectPattern;
    var patBtns = api.patterns.map(function (p, i) {
      var b = doc.createElement('button');
      b.type = 'button'; b.className = 'so-btn so-pat'; b.textContent = String(i + 1);
      b.setAttribute('role', 'radio'); b.setAttribute('aria-label', 'Pattern ' + (i + 1) + ': ' + p.name); b.title = p.name;
      b.addEventListener('click', function () { selectPattern(i); });
      if (S.patterns) S.patterns.appendChild(b);
      return b;
    });
    function paintBar() {
      var cur = current(), playing = !!(host.transport && host.transport.playing);
      patBtns.forEach(function (b, i) { b.setAttribute('aria-checked', LETTERS[i] === cur ? 'true' : 'false'); });
      if (S.play) { S.play.setAttribute('aria-pressed', playing ? 'true' : 'false'); S.play.textContent = playing ? 'Stop' : 'Play'; }
      if (S.drum && kick) {
        var muted = false;
        try { muted = !!host.getParam(kick + '.mute'); } catch (e) { /* ignore */ }
        S.drum.setAttribute('aria-pressed', muted ? 'false' : 'true');
        S.drum.textContent = muted ? 'Kick off' : 'Kick on';
      }
      if (S.bpm) { var b = host.bpm(); if (doc.activeElement !== S.bpm && String(Math.round(b)) !== S.bpm.value) S.bpm.value = String(Math.round(b)); }
      var ed = host.editor();
      if (S.undo) S.undo.disabled = !ed.canUndo();
      if (S.redo) S.redo.disabled = !ed.canRedo();
    }
    if (S.play) S.play.addEventListener('click', function () {
      if (!started) return;
      if (host.transport.playing) host.transport.stop();
      else { host.transport.loop(section); host.transport.play(); }
      paintBar();
    });
    function setBpm(v) { v = Math.max(40, Math.min(300, Math.round(+v || o.bpm || 120))); host.setParam('bpm', v); paintBar(); }
    if (S.bpm) S.bpm.addEventListener('change', function () { setBpm(S.bpm.value); });
    if (S.slower) S.slower.addEventListener('click', function () { setBpm(host.bpm() - 1); });
    if (S.faster) S.faster.addEventListener('click', function () { setBpm(host.bpm() + 1); });
    if (S.drum && kick) S.drum.addEventListener('click', function () { var m = !!host.getParam(kick + '.mute'); host.mute(kick, !m); paintBar(); });
    if (S.drive && o.drive) S.drive.addEventListener('input', function () {
      var v = +S.drive.value;
      host.bypass('track:' + dev + ':drive', v <= 0);
      if (v > 0) host.setParam(dev + '.drive.drive', v);
    });
    function undo(redo) {
      var ed = host.editor();
      if (redo ? ed.redo() : ed.undo()) host.commit();
      paintBar();
    }
    if (S.undo) S.undo.addEventListener('click', function () { undo(false); });
    if (S.redo) S.redo.addEventListener('click', function () { undo(true); });
    if (doc.addEventListener) doc.addEventListener('keydown', function (e) {
      var t = e.target && e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); undo(!!e.shiftKey); }
    });

    // ---- presets and patterns through W1's Presets (feature-detected; absent: hidden, the stored patterns stay)
    var PR = root.Presets;
    var hasPatch = !!(o.presets && o.presets.patch && PR && typeof PR.list === 'function' && typeof PR.apply === 'function' && typeof PR.capture === 'function' && typeof PR.save === 'function');
    var hasPat = !!(o.presets && o.presets.pattern && PR && PR.patterns && typeof PR.patterns.list === 'function' && typeof PR.patterns.get === 'function' && typeof PR.patterns.save === 'function');
    api.presets = { patch: hasPatch, pattern: hasPat };
    function capturePattern() {
      var d = host.document(), sec = d.sections[0];
      function vOf(tn) { var t = null; d.tracks.forEach(function (x) { if (x.name === tn) t = x; }); var L = sec.play && sec.play[tn]; if (L === true) L = 'A'; return t && L && t.variants[L] ? clone(t.variants[L]) : null; }
      if (!machine) return vOf(dev);
      var voices = {};
      d.tracks.forEach(function (t) { if (t.name !== kick) { var v = vOf(t.name); if (v) voices[t.type] = v; } });
      return { voices: voices, bpm: host.bpm(), swing: host.swing() };
    }
    function applyPattern(p) {
      if (!p) return false;
      var ed = host.editor(), d = host.document(), sec = d.sections[0], list = [];
      if (machine) { d.tracks.forEach(function (t) { if (p.voices && p.voices[t.type]) list.push([t.name, p.voices[t.type]]); }); }
      else list.push([dev, p]);
      var run = function (e) {
        list.forEach(function (it) {
          var tn = it[0], v = variantOf(it[1]), L = sec.play[tn] === true ? 'A' : (sec.play[tn] || 'A');
          if (!sec.play[tn]) e.setPlay(section, tn, L);
          e.setVariantBars(tn, L, v.bars, 'empty');
          for (var i = 0; i < v.bars * 16; i++) { e.setStep(tn, L, i, null); if (v.cells[i]) e.setStep(tn, L, i, v.cells[i]); }
        });
        return true;
      };
      ed.group(run);
      if (machine && p.bpm) host.setParam('bpm', p.bpm);
      host.commit(); paintBar();
      return true;
    }
    api.capturePattern = capturePattern; api.applyPattern = applyPattern;
    function menu(kind) {
      var type = o.presets[kind], isPat = kind === 'pattern', store = isPat ? PR.patterns : PR;
      var g = h('div', { className: 'so-group so-menu', 'aria-label': isPat ? 'Pattern bank' : 'Patch presets' }, S.bar);
      var lab = h('label', { className: 'so-field' }, g); h('span', null, lab, isPat ? 'Bank' : 'Patch');
      var sel = h('select', { className: 'so-select', 'aria-label': isPat ? 'Stored pattern' : 'Patch preset' }, lab);
      function fill(keep) {
        sel.textContent = '';
        h('option', { value: '' }, sel, isPat ? 'Load a pattern…' : 'Load a patch…');
        var items = []; try { items = store.list(type) || []; } catch (e) { items = []; }
        items.forEach(function (it) { h('option', { value: it.id }, sel, (it.factory ? '' : '★ ') + it.name); });
        sel.value = keep || '';
      }
      fill();
      if (typeof PR.on === 'function') { try { PR.on('change', function () { fill(sel.value); }); } catch (e) { /* ignore */ } }
      sel.addEventListener('change', function () {
        var id = sel.value; if (!id) return;
        if (isPat) { var p = null; try { p = store.get(type, id); } catch (e) { p = null; } applyPattern(p && (p.pattern || p)); }
        else { try { PR.apply(host, dev, id); } catch (e) { /* ignore */ } paintBar(); }
      });
      var save = h('button', { type: 'button', className: 'so-btn', 'aria-label': isPat ? 'Save the pattern' : 'Save the patch' }, g, 'Save');
      save.addEventListener('click', function () {
        dialog({ title: isPat ? 'Save the pattern' : 'Save the patch', name: isPat ? 'My pattern' : 'My patch', buttons: [['Save', function (r) {
          var nm = (r.name || '').trim(); if (!nm) return 'Give it a name.';
          var id = null;
          try { id = isPat ? store.save(type, nm, capturePattern()) : PR.save(type, nm, PR.capture(host, dev)); } catch (e) { return 'Not saved: ' + (e && e.message ? e.message : e); }
          fill(id); r.close(); return '';
        }]] });
      });
      var cp = h('button', { type: 'button', className: 'so-btn', 'aria-label': isPat ? 'Copy the pattern as text' : 'Copy the patch as text' }, g, 'Copy as text');
      cp.addEventListener('click', function () {
        var text = '';
        try {
          var id = sel.value;
          if (!id) id = isPat ? store.save(type, 'Copied pattern', capturePattern()) : PR.save(type, 'Copied patch', PR.capture(host, dev));
          text = store.exportText(type, id);
          fill(id);
        } catch (e) { text = ''; }
        dialog({ title: isPat ? 'Pattern as text' : 'Patch as text', note: 'Downloads are blocked here: copy this text and keep it, then paste it back with Paste text.', text: text, readOnly: true,
          buttons: [['Copy', function (r) { return copyText(r.ta, text); }]] });
      });
      var ps = h('button', { type: 'button', className: 'so-btn', 'aria-label': isPat ? 'Paste a pattern as text' : 'Paste a patch as text' }, g, 'Paste text');
      ps.addEventListener('click', function () {
        dialog({ title: isPat ? 'Paste a pattern' : 'Paste a patch', note: 'Paste text copied from this page.', text: '', buttons: [['Load', function (r) {
          var got;
          try { got = store.importText(r.text || ''); } catch (e) { return 'Not understood: ' + (e && e.message ? e.message : e); }
          if (!got || !got.id) return 'Not understood.';
          if (got.type && got.type !== type) return 'That text is for ' + got.type + ', not this instrument.';
          fill(got.id);
          if (isPat) { var p = store.get(type, got.id); applyPattern(p && (p.pattern || p)); } else { PR.apply(host, dev, got.id); }
          r.close(); return '';
        }]] });
      });
      return g;
    }
    if (S.bar && hasPatch) menu('patch');
    if (S.bar && hasPat) menu('pattern');

    // ---- start on a tap
    function engineKind() {
      try { var t = host.engine().tracks[dev]; if (!t || !t.inst) return 'none'; return t.inst.engine || 'webaudio'; } catch (e) { return 'none'; }
    }
    function start() {
      if (started) return;
      if (S['gate-note']) S['gate-note'].textContent = 'Starting…';
      host.start().then(function (ok) {
        if (!ok) { if (S['gate-note']) S['gate-note'].textContent = 'This browser could not start audio. Try another browser, or tap again.'; return; }
        started = true;
        if (S.gate) S.gate.hidden = true;
        if (S.play) S.play.disabled = false;
        var kind = engineKind();
        if (kind === 'worklet') status('AudioWorklet engine', 'worklet');
        else if (kind === 'webaudio') status('Web Audio engine', 'worklet');
        else status('Approximate fallback engine: the AudioWorklet did not load, so this is not the accurate ' + o.title + ' sound', 'fallback');
        api.engine = kind;
        mount();
        host.transport.loop(section);
        host.transport.play();
        paintBar();
        if (o.onStart) { try { o.onStart(api); } catch (e) { if (root.console) console.error(e); } }
      });
    }
    if (S.start) S.start.addEventListener('click', start);

    // ---- frame loop
    var lastBar = 0;
    function frame(ts) {
      root.requestAnimationFrame(frame);
      if (panel) { try { panel.update(); } catch (e) { if (root.console) root.console.error(e); } }
      if (ts - lastBar > 250) { lastBar = ts; paintBar(); if (o.onFrame) { try { o.onFrame(api); } catch (e) { /* ignore */ } } }
    }
    mount();
    paintBar();
    root.requestAnimationFrame(frame);
    api.paint = paintBar;
    return api;
  }

  root.Solo = { boot: boot, parse: parse, note: noteOf, version: 1 };
})();
