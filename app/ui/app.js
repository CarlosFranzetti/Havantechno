/* App: the frame (global App). Builds the control bar, mounts the System Editor or the Step View, runs the one
 * requestAnimationFrame loop, keyboard, autosave, the start gate, and (Electron) the device-window bridge.
 *
 * Main window: App.boot() -> control bar in #frame, view in #view, floating windows via Windows (ui/windows.js).
 * Device window (Electron child, index.html?device=<id>): renders only that device's window, bound to
 * window.opener.HavantechnoBridge, which this file defines on the main window.
 *
 * Design sources: CONTRACT.md "App (A6)" and "Shell (A6)"; round5-FO1 (one frame, two modes; Tab, V, Esc);
 * round5-FH2 (window rules); round5-FO2 (same-origin child windows share the process). */
(function (root) {
  'use strict';
  var doc = root.document;
  var shell = root.HavantechnoShell || null;

  var LS_VIEW = 'hv.view';
  var VIEWS = [
    { id: 'system', label: 'System Editor', global: 'SystemEditor' },
    { id: 'step', label: 'Step View', global: 'StepView' },
    { id: 'mixer', label: 'Mixer', global: null }
  ];

  // ------------------------------------------------------------------ helpers
  function el(tag, cls, text, attrs) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (attrs) for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    return e;
  }
  function button(cls, text, label) {
    var b = el('button', 'ap-btn' + (cls ? ' ' + cls : ''), text);
    b.type = 'button';
    if (label) { b.title = label; b.setAttribute('aria-label', label); }
    return b;
  }
  function lsGet(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, v); } catch (e) { /* blocked */ } }
  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
  function isTextField(t) {
    if (!t || !t.tagName) return false;
    var n = t.tagName;
    return n === 'TEXTAREA' || n === 'SELECT' || t.isContentEditable || (n === 'INPUT' && !/^(button|checkbox|radio|range|submit|reset|color)$/i.test(t.type || 'text'));
  }
  var reported = {};
  function report(where, e) {
    var msg = where + ': ' + (e && e.message ? e.message : e);
    if (reported[msg]) return;
    reported[msg] = true;
    try { if (root.console && root.console.error) root.console.error('[App] ' + msg, e && e.stack ? e.stack : ''); } catch (x) { /* ignore */ }
  }
  function download(name, bytes, type) {
    var blob = new root.Blob([bytes], { type: type || 'application/octet-stream' });
    var url = root.URL.createObjectURL(blob);
    var a = el('a');
    a.href = url; a.download = name; a.style.display = 'none';
    doc.body.appendChild(a); a.click();
    setTimeout(function () { try { doc.body.removeChild(a); root.URL.revokeObjectURL(url); } catch (e) { /* ignore */ } }, 1500);
  }

  // ------------------------------------------------------------------ styles
  var CSS = [
    '#frame{background:var(--panel,#15151e);border-bottom:1px solid var(--line,#2a2a3a);color:var(--fg,#d8d8e6)}',
    '.ap-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 10px;min-height:40px;box-sizing:border-box;font-size:12px}',
    '.ap-grp{display:inline-flex;align-items:center;gap:4px}',
    '.ap-sep{width:1px;align-self:stretch;background:var(--line,#2a2a3a);margin:2px 2px}',
    '.ap-mark{font-weight:800;letter-spacing:.1em;color:var(--brand,#ff5fa2);font-size:13px;margin-right:2px;user-select:none}',
    '.ap-btn{font:inherit;color:var(--fg,#d8d8e6);background:var(--panel-raised,#1b1b26);border:1px solid var(--line,#2a2a3a);border-radius:4px;min-height:28px;min-width:28px;padding:3px 8px;cursor:pointer;white-space:nowrap}',
    '.ap-btn:hover:not(:disabled){border-color:var(--dim,#8a8aa0)}',
    '.ap-btn:focus-visible,.ap-in:focus-visible,.ap-mi:focus-visible{outline:2px solid var(--fg,#d8d8e6);outline-offset:1px}',
    '.ap-btn:disabled{opacity:.4;cursor:default}',
    '.ap-btn[aria-pressed=true],.ap-btn[aria-checked=true]{background:var(--panel,#15151e);border-color:var(--fg,#d8d8e6)}',
    '.ap-seg{display:inline-flex}',
    '.ap-seg .ap-btn{border-radius:0}',
    '.ap-seg .ap-btn:first-child{border-radius:4px 0 0 4px}',
    '.ap-seg .ap-btn:last-child{border-radius:0 4px 4px 0}',
    '.ap-seg .ap-btn+.ap-btn{border-left-width:0}',
    '.ap-play[aria-pressed=true]{background:var(--brand,#ff5fa2);border-color:var(--brand,#ff5fa2);color:#16060d;font-weight:700}',
    '.ap-lbl{color:var(--dim,#8a8aa0);font-size:11px;text-transform:uppercase;letter-spacing:.06em}',
    '.ap-in{font:inherit;color:var(--fg,#d8d8e6);background:var(--bg,#0b0b10);border:1px solid var(--line,#2a2a3a);border-radius:4px;min-height:28px;box-sizing:border-box;padding:2px 4px;width:54px;font-variant-numeric:tabular-nums}',
    '.ap-pos{font-variant-numeric:tabular-nums;min-width:8em;color:var(--fg,#d8d8e6)}',
    '.ap-pos b{font-weight:600}',
    '.ap-pos i{font-style:normal;color:var(--dim,#8a8aa0);margin:0 .35em}',
    '.ap-meter{display:inline-flex;align-items:center;min-width:80px}',
    '.ap-meter-fb{width:120px;height:8px;background:var(--line,#2a2a3a);position:relative}',
    '.ap-meter-fb>i{position:absolute;left:0;top:0;bottom:0;background:var(--on,#75f97f);width:0}',
    '.ap-spacer{flex:1 1 0}',
    '.ap-view{height:100%;position:relative;overflow:auto}',
    '.ap-note{padding:24px;color:var(--dim,#8a8aa0)}',
    '.ap-menu{position:fixed;z-index:900;min-width:200px;background:var(--panel-raised,#1b1b26);border:1px solid var(--line,#2a2a3a);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.6);padding:4px;color:var(--fg,#d8d8e6)}',
    '.ap-mi{display:block;width:100%;text-align:left;font:inherit;color:inherit;background:none;border:0;border-radius:4px;padding:6px 10px;min-height:28px;cursor:pointer}',
    '.ap-mi:hover,.ap-mi:focus{background:var(--panel,#15151e)}',
    '.ap-mi[aria-checked=true]::before{content:"\\25CF  "}',
    '.ap-mi[aria-checked=false]::before{content:"\\25CB  ";color:var(--dim,#8a8aa0)}',
    '.ap-mh{padding:4px 10px;color:var(--dim,#8a8aa0);font-size:11px;text-transform:uppercase;letter-spacing:.06em}',
    '.ap-toast{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:950;background:var(--panel-raised,#1b1b26);border:1px solid var(--line,#2a2a3a);border-radius:6px;padding:8px 14px;color:var(--fg,#d8d8e6);max-width:80vw;box-shadow:0 8px 24px rgba(0,0,0,.6)}',
    '.ap-toast[hidden]{display:none}',
    '.hv-start-card{background:var(--panel,#15151e);border:1px solid var(--line,#2a2a3a);border-radius:10px;padding:32px 40px;text-align:center;max-width:90vw}',
    '.hv-start-mark{font-weight:800;letter-spacing:.2em;color:var(--brand,#ff5fa2);font-size:20px}',
    '.hv-start-note{color:var(--dim,#8a8aa0);margin:12px 0 20px}',
    '.hv-start-btn{font:inherit;font-size:16px;font-weight:700;color:#16060d;background:var(--brand,#ff5fa2);border:0;border-radius:6px;padding:12px 28px;min-height:44px;cursor:pointer}',
    '.hv-start-btn:disabled{opacity:.6;cursor:default}',
    '.hv-start-btn:focus-visible{outline:2px solid var(--fg,#d8d8e6);outline-offset:3px}',
    '.hv-start-status{min-height:1.3em;margin:14px 0 0;color:var(--dim,#8a8aa0)}',
    'body.device-window{background:var(--panel,#15151e)}',
    '@media (max-width:760px){.ap-pos{min-width:0}.ap-meter{min-width:60px}}'
  ].join('\n');

  function injectStyles() {
    if (doc.getElementById('ap-style')) return;
    var s = doc.createElement('style');
    s.id = 'ap-style';
    s.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }

  // ------------------------------------------------------------------ main window
  var S = { host: null, bar: {}, view: null, viewId: null, viewHost: null, rafId: 0, lastTs: 0, frame: 0,
            dirtyTimer: 0, canAutosave: false, started: false, busy: false, toastTimer: 0 };

  var App = {
    host: function () { return S.host; },
    viewId: function () { return S.viewId; },
    showView: showView,
    toggleView: toggleView,
    handleKey: handleKey,
    save: doSave,
    open: doOpen,
    exportWav: doExport,
    undo: function () { return doUndo(false); },
    redo: function () { return doUndo(true); },
    toast: toast,
    boot: boot
  };

  function toast(msg, ms) {
    var t = S.toastEl;
    if (!t) return;
    t.textContent = msg; t.hidden = false;
    if (S.toastTimer) clearTimeout(S.toastTimer);
    S.toastTimer = setTimeout(function () { t.hidden = true; }, ms || 4000);
  }

  // ---- bridge for Electron device windows (defined on the main window)
  function makeBridge(host) {
    var b = {
      version: 1,
      setParam: function (p, v) { return host.setParam(p, v); },
      getParam: function (p) { return host.getParam(p); },
      hold: function (p) { return host.hold(p); },
      release: function (p) { return host.release(p); },
      releaseAll: function () { return host.releaseAll(); },
      heldCount: function () { return host.heldCount(); },
      isHeld: function (p) { return typeof host.isHeld === 'function' ? host.isHeld(p) : false; },
      device: function (id) { return host.device(id); },
      devices: function () { return host.devices(); },
      meter: function (id) { return host.meter(id); },
      sections: function () { return host.sections(); },
      tracks: function () { return host.tracks(); },
      sends: function () { return host.sends(); },
      bpm: function () { return host.bpm(); },
      swing: function () { return host.swing(); },
      totalBars: function () { return typeof host.totalBars === 'function' ? host.totalBars() : 0; },
      mute: function (t, v) { return host.mute(t, v); },
      solo: function (t, v) { return host.solo(t, v); },
      transportPos: function () { return host.transport.pos(); },
      playing: function () { return !!host.transport.playing; },
      on: function (type, fn) { return host.on(type, fn); },
      off: function (type, fn) { return host.off(type, fn); },
      key: function (k) { return handleKey(k); },
      select: function (id) { if (root.Windows) root.Windows.onSelect(id); }
    };
    return b;
  }

  // ---- transport and project actions
  function doUndo(redo) {
    var h = S.host; if (!h) return false;
    try {
      var ed = h.editor();
      var ok = redo ? ed.redo() : ed.undo();
      if (ok) { h.commit(); toast(redo ? 'Redo' : 'Undo', 1200); }
      return !!ok;
    } catch (e) { report('undo', e); return false; }
  }

  function doSave() {
    var h = S.host; if (!h || !root.Project) { toast('Saving is not available.'); return Promise.resolve(null); }
    return root.Project.save(h.document(), { shell: shell }).then(function (r) {
      if (r) toast('Saved ' + (r.name || 'project'));
      return r;
    }, function (e) { report('save', e); toast('Could not save: ' + (e && e.message ? e.message : e)); return null; });
  }

  function doOpen() {
    var h = S.host; if (!h || !root.Project) { toast('Opening is not available.'); return Promise.resolve(null); }
    return root.Project.open({ shell: shell }).then(function (d) {
      if (!d) return null;
      h.loadDocument(d);
      toast('Opened song');
      return d;
    }, function (e) { report('open', e); toast('Could not open: ' + (e && e.message ? e.message : e)); return null; });
  }

  function doExport() {
    var h = S.host; if (!h || S.busy) return Promise.resolve(null);
    S.busy = true;
    var b = S.bar.export;
    if (b) { b.disabled = true; b.textContent = 'Rendering…'; }
    toast('Rendering the whole song…', 60000);
    var name = ((h.document() && h.document().name) || 'havantechno').replace(/[\\\/:*?"<>|]+/g, ' ').trim() || 'havantechno';
    return Promise.resolve(h.render({})).then(function (buf) {
      var ab = h.wav(buf);
      if (shell && typeof shell.saveFile === 'function') {
        return shell.saveFile({ name: name + '.wav', data: ab, filters: [{ name: 'WAV audio', extensions: ['wav'] }] }).then(function (r) {
          toast(r ? 'Exported ' + (r.name || 'WAV') : 'Export cancelled');
          return r;
        });
      }
      download(name + '.wav', ab, 'audio/wav');
      toast('Exported ' + name + '.wav');
      return { name: name + '.wav' };
    }).then(function (r) { finish(); return r; }, function (e) { report('export', e); toast('Export failed: ' + (e && e.message ? e.message : e)); finish(); return null; });
    function finish() { S.busy = false; if (b) { b.disabled = false; b.textContent = 'Export WAV'; } }
  }

  // ---- views
  function viewAvailable(id) {
    for (var i = 0; i < VIEWS.length; i++) if (VIEWS[i].id === id) return !!(VIEWS[i].global && root[VIEWS[i].global] && typeof root[VIEWS[i].global].mount === 'function');
    return false;
  }
  function showView(id) {
    var h = S.host; if (!h) return false;
    if (id === 'mixer') { toast('The Mixer drawer is not built yet.', 2500); return false; }
    var spec = null, i;
    for (i = 0; i < VIEWS.length; i++) if (VIEWS[i].id === id) spec = VIEWS[i];
    if (!spec) return false;
    var sel = (root.Windows && root.Windows.selectedTrack) ? root.Windows.selectedTrack() : null;
    if (S.view && typeof S.view.dispose === 'function') { try { S.view.dispose(); } catch (e) { report('dispose ' + S.viewId, e); } }
    S.view = null;
    var vh = S.viewHost;
    vh.textContent = '';
    S.viewId = id;
    vh.setAttribute('data-view', id);
    lsSet(LS_VIEW, id);
    refreshSwitch();
    if (!viewAvailable(id)) {
      vh.appendChild(el('div', 'ap-note', spec.label + ' is not loaded.'));
      return false;
    }
    try {
      S.view = root[spec.global].mount(vh, h);
      if (sel && S.view && typeof S.view.select === 'function') { try { S.view.select(sel); } catch (e2) { report('select ' + id, e2); } }
      // carry the section under the playhead into the new view (Step View edits one section at a time)
      if (S.view && typeof S.view.selectSection === 'function') {
        try { var pp = h.transport.pos(); if (pp && pp.sectionName) S.view.selectSection(pp.sectionName); } catch (e3) { report('selectSection ' + id, e3); }
      }
    } catch (e) {
      report('mount ' + id, e);
      vh.textContent = '';
      vh.appendChild(el('div', 'ap-note', spec.label + ' could not start: ' + (e && e.message ? e.message : e)));
    }
    return true;
  }
  function toggleView() {
    var next = S.viewId === 'system' ? 'step' : 'system';
    if (!viewAvailable(next)) return false;
    return showView(next);
  }
  function refreshSwitch() {
    var btns = S.bar.viewBtns || {};
    for (var id in btns) if (btns.hasOwnProperty(id)) btns[id].setAttribute('aria-pressed', id === S.viewId ? 'true' : 'false');
  }

  // ---- keyboard. k: {key, code, ctrl, meta, shift, alt, inField, repeat}. Returns true when handled.
  function handleKey(k) {
    var h = S.host;
    if (!h || !S.started) return false;
    var mod = k.ctrl || k.meta;
    var key = (k.key || '').toLowerCase();
    if (mod && !k.alt) {
      if (key === 's') { doSave(); return true; }
      if (key === 'o') { doOpen(); return true; }
      if (key === 'z' && !k.inField) { doUndo(!!k.shift); return true; }
      if (key === 'y' && !k.inField) { doUndo(true); return true; }
      if (key === '1') { showView('system'); return true; }
      if (key === '2') { showView('step'); return true; }
      return false;
    }
    if (k.alt && !mod && !k.shift) {
      if (k.code === 'Digit1') { showView('system'); return true; }
      if (k.code === 'Digit2') { showView('step'); return true; }
      return false;
    }
    if (mod || k.alt || k.inField) return false;
    if (k.key === ' ' || k.code === 'Space') { if (!k.repeat) { try { h.transport.toggle(); } catch (e) { report('toggle', e); } } return true; }
    if (k.key === 'Tab' && !k.shift) { if (!k.repeat) toggleView(); return true; }
    if (key === 'v' && !k.shift) { if (!k.repeat && root.Windows) root.Windows.toggleAll(); return true; }
    return false;
  }
  function installKeys() {
    doc.addEventListener('keydown', function (ev) {
      if (ev.defaultPrevented) return;
      var ok = handleKey({ key: ev.key, code: ev.code, ctrl: ev.ctrlKey, meta: ev.metaKey, shift: ev.shiftKey, alt: ev.altKey, repeat: ev.repeat, inField: isTextField(ev.target) });
      if (ok) ev.preventDefault();
    });
    // Space on a focused button would click it on keyup; the transport already took the key.
    doc.addEventListener('keyup', function (ev) {
      if ((ev.key === ' ' || ev.code === 'Space') && S.started && !isTextField(ev.target) && !ev.ctrlKey && !ev.metaKey && !ev.altKey) ev.preventDefault();
    });
  }

  // ---- control bar
  function buildBar(host) {
    var frame = doc.getElementById('frame');
    frame.textContent = '';
    var bar = el('div', 'ap-bar');
    var B = S.bar = {};

    bar.appendChild(el('span', 'ap-mark', 'HAVANTECHNO'));

    var seg = el('div', 'ap-seg');
    seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'View');
    B.viewBtns = {};
    VIEWS.forEach(function (v) {
      var b = button('', v.label, v.id === 'mixer' ? 'Mixer drawer (placeholder)' : v.label + ' (Tab switches System Editor and Step View)');
      b.setAttribute('aria-pressed', 'false');
      if (v.id === 'mixer') { b.disabled = true; b.title = 'Mixer drawer: not built yet'; }
      b.addEventListener('click', function () { showView(v.id); });
      B.viewBtns[v.id] = b;
      seg.appendChild(b);
    });
    bar.appendChild(seg);

    var tr = el('div', 'ap-grp');
    tr.setAttribute('role', 'group'); tr.setAttribute('aria-label', 'Transport');
    B.rew = button('', '⏮', 'Rewind to the start');
    B.play = button('ap-play', 'Play', 'Play');
    B.play.title = 'Play (Space)';
    B.play.setAttribute('aria-pressed', 'false');
    B.stop = button('', '■', 'Stop');
    B.rew.addEventListener('click', function () { try { host.transport.rewind(); } catch (e) { report('rewind', e); } });
    B.play.addEventListener('click', function () { try { host.transport.toggle(); } catch (e) { report('play', e); } });
    B.stop.addEventListener('click', function () { try { host.transport.stop(); } catch (e) { report('stop', e); } });
    tr.appendChild(B.rew); tr.appendChild(B.play); tr.appendChild(B.stop);
    bar.appendChild(tr);

    function numField(label, id, min, max, step, param, digits) {
      var g = el('label', 'ap-grp');
      g.appendChild(el('span', 'ap-lbl', label));
      var inp = el('input', 'ap-in', null, { type: 'number', min: String(min), max: String(max), step: String(step), id: id });
      inp.setAttribute('aria-label', label);
      function push() {
        var v = parseFloat(inp.value);
        if (!isFinite(v)) return;
        v = Math.min(max, Math.max(min, v));
        try { host.setParam(param, v); } catch (e) { report(param, e); }
      }
      inp.addEventListener('input', push);
      inp.addEventListener('change', function () { push(); inp.dataset.dirty = ''; });
      inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { push(); inp.blur(); } });
      g.appendChild(inp);
      inp._digits = digits;
      return { wrap: g, input: inp };
    }
    var bpm = numField('BPM', 'ap-bpm', 40, 240, 1, 'bpm', 0);
    var sw = numField('Swing', 'ap-swing', 0, 0.6, 0.01, 'swing', 2);
    B.bpm = bpm.input; B.swing = sw.input;
    bar.appendChild(bpm.wrap); bar.appendChild(sw.wrap);

    B.pos = el('span', 'ap-pos', '');
    B.pos.setAttribute('role', 'timer'); B.pos.setAttribute('aria-label', 'Position: bar, step, section');
    B.pos.title = 'bar · step · section';
    bar.appendChild(B.pos);

    B.ab = button('', 'A/B', 'Compare with the reference (not available yet)');
    B.ab.disabled = true;
    bar.appendChild(B.ab);

    var mw = el('span', 'ap-meter');
    mw.title = 'Master level';
    if (root.Widgets && typeof root.Widgets.meter === 'function') {
      try { B.meter = root.Widgets.meter({ orientation: 'h', size: 'strip', label: 'Master level' }); mw.appendChild(B.meter.el); } catch (e) { report('meter', e); B.meter = null; }
    }
    if (!B.meter) {
      var fb = el('span', 'ap-meter-fb'); var fi = el('i'); fb.appendChild(fi); mw.appendChild(fb);
      B.meter = { el: fb, set: function (l) { fi.style.width = Math.round(Math.min(1, Math.max(0, l)) * 100) + '%'; } };
    }
    bar.appendChild(mw);

    bar.appendChild(el('span', 'ap-spacer'));

    B.rel = button('', 'Re-enable arranged (0)', 'Hand held parameters back to the arrangement');
    B.rel.disabled = true;
    B.rel.addEventListener('click', function () { try { host.releaseAll(); } catch (e) { report('releaseAll', e); } });
    bar.appendChild(B.rel);

    var ur = el('div', 'ap-seg');
    B.undo = button('', '\u21B6', 'Undo (Ctrl/Cmd+Z)');
    B.redo = button('', '\u21B7', 'Redo (Ctrl/Cmd+Shift+Z)');
    B.undo.disabled = true; B.redo.disabled = true;
    B.undo.addEventListener('click', function () { doUndo(false); });
    B.redo.addEventListener('click', function () { doUndo(true); });
    ur.appendChild(B.undo); ur.appendChild(B.redo);
    bar.appendChild(ur);

    var sv = el('div', 'ap-seg');
    B.save = button('', 'Save', 'Save the song (Ctrl/Cmd+S)');
    B.open = button('', 'Open', 'Open a song (Ctrl/Cmd+O)');
    B.save.addEventListener('click', doSave);
    B.open.addEventListener('click', doOpen);
    sv.appendChild(B.save); sv.appendChild(B.open);
    bar.appendChild(sv);

    B.export = button('', 'Export WAV', 'Render the whole song to a WAV file');
    B.export.addEventListener('click', doExport);
    bar.appendChild(B.export);

    B.win = button('', 'Windows', 'Device windows: hide all, tile, cascade, link');
    B.win.setAttribute('aria-haspopup', 'menu'); B.win.setAttribute('aria-expanded', 'false');
    B.win.addEventListener('click', function () { toggleWinMenu(); });
    bar.appendChild(B.win);

    frame.appendChild(bar);
  }

  // ---- Windows menu
  function closeWinMenu() {
    if (S.menu) { if (S.menu.parentNode) S.menu.parentNode.removeChild(S.menu); S.menu = null; S.bar.win.setAttribute('aria-expanded', 'false'); }
  }
  function toggleWinMenu() {
    if (S.menu) { closeWinMenu(); return; }
    var W = root.Windows; if (!W) return;
    var m = el('div', 'ap-menu');
    m.setAttribute('role', 'menu');
    function item(text, fn, checked) {
      var b = el('button', 'ap-mi', text);
      b.type = 'button';
      b.setAttribute('role', checked == null ? 'menuitem' : 'menuitemradio');
      if (checked != null) b.setAttribute('aria-checked', checked ? 'true' : 'false');
      b.addEventListener('click', function () { closeWinMenu(); fn(); });
      m.appendChild(b);
      return b;
    }
    var first = item(W.isHidden() ? 'Show all windows (V)' : 'Hide all windows (V)', function () { W.toggleAll(); });
    item('Tile', function () { W.tile(); });
    item('Cascade', function () { W.cascade(); });
    item('Close all', function () { W.closeAll(); });
    m.appendChild(el('div', 'ap-mh', 'Link'));
    ['off', 'single', 'multi'].forEach(function (mode) {
      item(mode.charAt(0).toUpperCase() + mode.slice(1), function () { W.link = mode; }, W.link === mode);
    });
    doc.body.appendChild(m);
    var r = S.bar.win.getBoundingClientRect();
    m.style.top = Math.round(r.bottom + 4) + 'px';
    m.style.left = Math.max(4, Math.round(Math.min(r.right - 200, (root.innerWidth || 800) - 210))) + 'px';
    S.menu = m;
    S.bar.win.setAttribute('aria-expanded', 'true');
    first.focus();
    m.addEventListener('keydown', function (ev) {
      var items = Array.prototype.slice.call(m.querySelectorAll('.ap-mi')), i = items.indexOf(doc.activeElement);
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); closeWinMenu(); S.bar.win.focus(); }
      else if (ev.key === 'ArrowDown') { ev.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); items[(i + items.length - 1) % items.length].focus(); }
      else if (ev.key === 'Tab') { closeWinMenu(); }
    });
  }

  // ---- per-frame bar refresh
  function updateBar() {
    var h = S.host, B = S.bar;
    var playing = false, p = null;
    try { playing = !!h.transport.playing; p = h.transport.pos(); } catch (e) { /* engine mid-rebuild */ }
    if (B._playing !== playing) {
      B._playing = playing;
      B.play.setAttribute('aria-pressed', playing ? 'true' : 'false');
      B.play.textContent = playing ? 'Pause' : 'Play';
      B.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      B.play.title = (playing ? 'Pause' : 'Play') + ' (Space)';
    }
    if (p) {
      var name = p.sectionName || '';
      if (!name && p.section >= 0) { try { var ss = h.sections(); if (ss[p.section]) name = ss[p.section].name; } catch (e2) { name = ''; } }
      var key = p.bar + ':' + p.step + ':' + name;
      if (B._pos !== key) {
        B._pos = key;
        B.pos.innerHTML = '';
        var a = el('b', '', pad(p.bar + 1, 3)), s1 = el('i', '', '·'), c = el('b', '', pad(p.step + 1, 2)), s2 = el('i', '', '·'), d = el('span', '', name || '—');
        B.pos.appendChild(a); B.pos.appendChild(s1); B.pos.appendChild(c); B.pos.appendChild(s2); B.pos.appendChild(d);
      }
    }
    if (doc.activeElement !== B.bpm) { var bv = h.bpm(); var bs = String(Math.round(bv * 100) / 100); if (B.bpm.value !== bs) B.bpm.value = bs; }
    if (doc.activeElement !== B.swing) { var sv = h.swing(); var ssv = (Math.round(sv * 100) / 100).toFixed(2); if (B.swing.value !== ssv) B.swing.value = ssv; }
    try { var m = h.meter('master'); B.meter.set(m && m.level ? m.level : 0); } catch (e3) { /* no meter yet */ }
    if (S.frame % 4 === 0) {
      var n = 0; try { n = h.heldCount(); } catch (e4) { n = 0; }
      if (B._held !== n) { B._held = n; B.rel.textContent = 'Re-enable arranged (' + n + ')'; B.rel.disabled = n === 0; }
    }
    if (S.frame % 8 === 0) {
      var cu = false, cr = false;
      try { var ed = h.editor(); cu = !!ed.canUndo(); cr = !!ed.canRedo(); } catch (e5) { /* ignore */ }
      if (B.undo.disabled === cu) B.undo.disabled = !cu;
      if (B.redo.disabled === cr) B.redo.disabled = !cr;
      var wc = root.Windows ? root.Windows.count() : 0;
      var wt = 'Windows' + (wc ? ' (' + wc + ')' : '') + (wc && root.Windows.isHidden() ? ' hidden' : '');
      if (B.win.textContent !== wt) B.win.textContent = wt;
    }
  }

  // ---- animation loop
  function tick() {
    S.frame++;
    try { updateBar(); } catch (e) { report('bar', e); }
    if (S.view && typeof S.view.update === 'function') { try { S.view.update(); } catch (e2) { report('view.update ' + S.viewId, e2); } }
    if (root.Windows) { try { root.Windows.update(); } catch (e3) { report('Windows.update', e3); } }
  }
  function loop(ts) {
    S.rafId = root.requestAnimationFrame(loop);
    if (ts - S.lastTs < 15) return;
    S.lastTs = ts;
    tick();
  }

  // ---- autosave
  function scheduleAutosave() {
    if (!S.canAutosave) return;
    if (S.dirtyTimer) clearTimeout(S.dirtyTimer);
    S.dirtyTimer = setTimeout(flushAutosave, 1500);
  }
  function flushAutosave() {
    if (S.dirtyTimer) { clearTimeout(S.dirtyTimer); S.dirtyTimer = 0; }
    if (!S.canAutosave || !S.host || !root.Project) return;
    try { root.Project.autosave(S.host.document(), { shell: shell }); } catch (e) { report('autosave', e); }
  }

  // ---- start gate
  function setupGate(host) {
    var overlay = doc.getElementById('start-overlay');
    var btn = doc.getElementById('start-audio');
    var status = doc.getElementById('start-status');
    if (!overlay || !btn) { S.started = true; afterStart(host, true); return; }
    var starting = false, failed = false;
    btn.focus();
    btn.addEventListener('click', function () {
      if (starting) return;
      if (failed) { overlay.hidden = true; S.started = true; afterStart(host, false); return; }
      starting = true; btn.disabled = true;
      status.textContent = 'Starting audio…';
      var done = false;
      function finish(ok) {
        if (done) return; done = true;
        if (ok === false) {
          failed = true; starting = false; btn.disabled = false;
          btn.textContent = 'Continue without audio';
          status.textContent = 'Audio could not start here. You can still edit the song.';
          btn.focus();
          return;
        }
        overlay.hidden = true; S.started = true;
        afterStart(host, true);
      }
      var p;
      try { p = host.start(); } catch (e) { report('start', e); finish(false); return; }
      Promise.resolve(p).then(finish, function (e) { report('start', e); finish(false); });
    });
  }
  function afterStart(host, audio) {
    function go(d) {
      if (d) {
        try { host.loadDocument(d); toast('Restored your last session', 3000); } catch (e) { report('restore', e); }
      }
      S.canAutosave = true;
    }
    var P = root.Project;
    if (!P) { S.canAutosave = true; return; }
    try {
      if (typeof P.restoreAsync === 'function') P.restoreAsync({ shell: shell }).then(go, function () { go(null); });
      else go(P.restore());
    } catch (e) { report('restore', e); S.canAutosave = true; }
  }

  // ---- boot (main window)
  function bootMain() {
    var viewEl = doc.getElementById('view');
    if (!root.Host || typeof root.Host.create !== 'function') {
      viewEl.appendChild(el('div', 'ap-note', 'The engine (engine/host.js) did not load, so the app cannot start.'));
      var ov = doc.getElementById('start-overlay'); if (ov) ov.hidden = true;
      return;
    }
    var host;
    var opts = {};
    try {
      if (new root.URLSearchParams(root.location.search).get('song') === 'v2' && root.Song && typeof root.Song.documentV2 === 'function') opts.doc = root.Song.documentV2();
    } catch (e0) { report('song param', e0); }
    try { host = root.Host.create(opts); } catch (e) {
      report('Host.create', e);
      viewEl.appendChild(el('div', 'ap-note', 'The engine could not start: ' + (e && e.message ? e.message : e)));
      var ov2 = doc.getElementById('start-overlay'); if (ov2) ov2.hidden = true;
      return;
    }
    S.host = host;
    root.HavantechnoBridge = makeBridge(host);
    root.HavantechnoApp = { host: host, app: App };

    S.toastEl = el('div', 'ap-toast');
    S.toastEl.setAttribute('role', 'status'); S.toastEl.setAttribute('aria-live', 'polite'); S.toastEl.hidden = true;
    doc.body.appendChild(S.toastEl);

    if (root.Windows) root.Windows.init({ host: host, layer: doc.getElementById('windows') });
    buildBar(host);
    S.viewHost = el('div', 'ap-view');
    viewEl.appendChild(S.viewHost);

    var first = lsGet(LS_VIEW);
    if (first !== 'step' || !viewAvailable('step')) first = 'system';
    showView(first);

    try {
      host.on('document', function (e) {
        if (e && e.reason === 'load') { showView(S.viewId); }
        if (e && e.reason === 'start') return;
        scheduleAutosave();
      });
      host.on('section', function (e) {
        if (!S.view || typeof S.view.selectSection !== 'function' || !e) return;
        try { S.view.selectSection(e.name != null ? e.name : e.section); } catch (e4) { report('selectSection', e4); }
      });
      host.on('param', function (e) { if (e && e.source === 'ui') scheduleAutosave(); });
    } catch (e2) { report('subscribe', e2); }

    installKeys();
    doc.addEventListener('pointerdown', function (ev) { if (S.menu && !S.menu.contains(ev.target) && ev.target !== S.bar.win) closeWinMenu(); }, true);
    root.addEventListener('pagehide', flushAutosave);
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) flushAutosave(); });
    root.addEventListener('beforeunload', function () { try { if (root.Windows) root.Windows.closeAll(); } catch (e3) { /* ignore */ } });

    setupGate(host);
    S.rafId = root.requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------------ device window (Electron child)
  function bootDevice(id) {
    doc.body.classList.add('device-window');
    var ov = doc.getElementById('start-overlay'); if (ov) ov.hidden = true;
    var wl = doc.getElementById('windows');
    var holder = el('div');
    holder.style.cssText = 'position:fixed;inset:0';
    doc.body.appendChild(holder);
    function message(t) { holder.textContent = ''; holder.appendChild(el('div', 'ap-note', t)); }

    var op = null, bridge = null;
    try { op = root.opener; bridge = op && op.HavantechnoBridge; } catch (e) { bridge = null; }
    if (!bridge) { message('This window shows one device of a running Havantechno. Open it from the main window.'); return; }

    var subs = [];
    var h = {};
    ['setParam', 'getParam', 'hold', 'release', 'releaseAll', 'heldCount', 'isHeld', 'device', 'devices', 'meter', 'sections', 'tracks', 'sends', 'bpm', 'swing', 'totalBars', 'mute', 'solo'].forEach(function (n) {
      if (typeof bridge[n] === 'function') h[n] = function () { return bridge[n].apply(bridge, arguments); };
    });
    h.on = function (type, fn) { subs.push([type, fn]); bridge.on(type, fn); return h; };
    h.off = function (type, fn) { bridge.off(type, fn); return h; };
    h.transport = { pos: function () { return bridge.transportPos(); } };
    Object.defineProperty(h.transport, 'playing', { enumerable: true, get: function () { return bridge.playing(); } });

    var emb;
    try { emb = root.Windows.embed(holder, id, h, op.Windows); } catch (e2) { report('embed', e2); message('Could not open this device window: ' + (e2 && e2.message ? e2.message : e2)); return; }

    var last = 0, raf = 0;
    function frame(ts) {
      raf = root.requestAnimationFrame(frame);
      if (ts - last < 15) return;
      last = ts;
      try { if (!op || op.closed) { root.close(); return; } emb.update(); } catch (e) { report('device.update', e); }
    }
    raf = root.requestAnimationFrame(frame);

    doc.addEventListener('keydown', function (ev) {
      if (ev.defaultPrevented) return;
      var k = { key: ev.key, code: ev.code, ctrl: ev.ctrlKey, meta: ev.metaKey, shift: ev.shiftKey, alt: ev.altKey, repeat: ev.repeat, inField: isTextField(ev.target) };
      var ok = false;
      try { ok = !!bridge.key(k); } catch (e) { ok = false; }
      if (ok) ev.preventDefault();
    });
    root.addEventListener('pagehide', function () {
      root.cancelAnimationFrame(raf);
      subs.forEach(function (s) { try { bridge.off(s[0], s[1]); } catch (e) { /* opener gone */ } });
      try { emb.dispose(); } catch (e) { /* ignore */ }
    });
    if (wl) wl.hidden = true;
  }

  // ------------------------------------------------------------------ boot
  function boot() {
    injectStyles();
    var id = null;
    try { id = new root.URLSearchParams(root.location.search).get('device'); } catch (e) { id = null; }
    if (id) bootDevice(id); else bootMain();
  }

  root.App = App;
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
