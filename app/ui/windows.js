/* Windows: floating device windows (global Windows).
 *
 * Web: draggable, resizable in-page panels inside #windows. Electron (window.HavantechnoShell present):
 * Windows.open asks the shell for a real child window; that window loads index.html?device=<id>, and
 * app.js calls Windows.embed(...) there, bound to the opener's host through HavantechnoBridge.
 *
 * API (CONTRACT):
 *   Windows.open(deviceId, host) -> win      Windows.close(id)       Windows.toggleAll()
 *   Windows.tile()   Windows.cascade()       Windows.link ('off'|'single'|'multi', default 'single')
 *   Windows.pin(id, bool)                    Windows.onSelect(deviceId)   Windows.update()
 * Also: init, count, ids, isPinned, isHidden, selected, selectedTrack, setLink, cycleLink,
 *       embed (child window), registerChild (called by a child window on the opener).
 *
 * Window rules: F-H2 round 5 (Logic Link Off/Single/Multi, V hides all, size and position per device id),
 * F-O1 round 5 (one window per device, Single link follows the selection, Pin freezes), REPORT.md section 11. */
(function (root) {
  'use strict';
  var doc = root.document;

  var LS_RECT = 'hv.win.';
  var LS_LINK = 'hv.link';
  var MIN_W = 240, MIN_H = 160;
  var GLYPH = { drums: '●', bass: '▼', keys: '◆', fx: '✦', dynamics: '▬', time: '◔', tone: '∿', utility: '▣' };

  var host = null;
  var layer = null;
  var shell = root.HavantechnoShell || null;
  var isChildPage = false;
  try { isChildPage = !!(new URLSearchParams(root.location.search).get('device')); } catch (e) { /* no URLSearchParams */ }
  var useShell = !!shell && !isChildPage;

  var wins = {};            // web: device id -> win
  var children = [];        // Electron: records of registered child windows
  var zCounter = 0;
  var linkMode = 'single';
  var hiddenAll = false;
  var lastSel = null;
  var headEvents = 0;       // bumped on host 'bypass' and 'audio' events; windows redraw their title bar
  var docEvents = 0;        // bumped on host 'document' events; windows re-check their device
  var subscribed = false;
  var pruneTick = 0;

  // ------------------------------------------------------------------ small helpers
  function el(tag, cls, text) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function btn(cls, text, label) {
    var b = el('button', 'wn-wb ' + (cls || ''), text);
    b.type = 'button';
    if (label) { b.setAttribute('aria-label', label); b.title = label; }
    return b;
  }
  function lsGet(k) { try { var s = root.localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function vw() { return root.innerWidth || 1024; }
  function vh() { return root.innerHeight || 768; }
  function topMin() {
    var f = doc.getElementById('frame');
    if (!f) return 0;
    var r = f.getBoundingClientRect();
    return Math.max(0, Math.round(r.bottom));
  }
  function roleOf(d) { return !d ? '' : (d.kind === 'insert' ? 'insert:' + d.type : d.kind); }
  function trackOf(d) { return d && (d.track || (d.kind === 'instrument' ? d.name : null)); }
  function isTextField(t) {
    if (!t || !t.tagName) return false;
    var n = t.tagName;
    return n === 'TEXTAREA' || n === 'SELECT' || t.isContentEditable || (n === 'INPUT' && !/^(button|checkbox|radio|range|submit|reset|color)$/i.test(t.type || 'text'));
  }
  function note(e) { try { if (root.console && root.console.error) root.console.error('[Windows]', e); } catch (x) { /* ignore */ } }

  // ------------------------------------------------------------------ styles
  var CSS = [
    '.wn-win{position:absolute;display:flex;flex-direction:column;box-sizing:border-box;max-width:calc(100vw - 8px);min-width:' + MIN_W + 'px;min-height:' + MIN_H + 'px;',
    ' background:var(--panel,#1a1a1f);color:var(--fg,#e8e8ec);border:1px solid var(--line,#34343c);border-top:2px solid var(--fam-ink,#888);',
    ' border-radius:6px;box-shadow:0 10px 30px rgba(0,0,0,.55);font:12px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
    '.wn-win[hidden]{display:none}',
    '.wn-win.wn-focus{box-shadow:0 12px 36px rgba(0,0,0,.7),0 0 0 1px var(--fam-ink,#888)}',
    '.wn-win.wn-embedded{position:fixed;inset:0;max-width:none;border:0;border-top:2px solid var(--fam-ink,#888);border-radius:0;box-shadow:none}',
    '.wn-wh{display:flex;align-items:center;gap:6px;padding:4px 6px;background:var(--panel-raised,#24242b);border-bottom:1px solid var(--line,#34343c);cursor:grab;user-select:none;touch-action:none;flex:0 0 auto;flex-wrap:wrap;min-height:28px}',
    '.wn-embedded .wn-wh{cursor:default}',
    '.wn-wh:active{cursor:grabbing}',
    '.wn-wg{color:var(--fam-ink,#aaa);font-size:14px;width:16px;text-align:center}',
    '.wn-wt{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:22em}',
    '.wn-wt small{font-weight:400;color:var(--dim,#8a8a96);margin-left:6px}',
    '.wn-sp{flex:1 1 8px}',
    '.wn-wb{font:inherit;color:var(--fg,#e8e8ec);background:var(--panel,#1a1a1f);border:1px solid var(--line,#34343c);border-radius:4px;min-height:24px;min-width:24px;padding:2px 8px;cursor:pointer;white-space:nowrap}',
    '.wn-wb:hover:not(:disabled){border-color:var(--fam-ink,#888)}',
    '.wn-wb:focus-visible{outline:2px solid var(--fam-ink,#8cf);outline-offset:1px}',
    '.wn-wb:disabled{opacity:.45;cursor:default}',
    '.wn-wb[aria-pressed=true]{background:var(--fam-wash,#2c2c36);border-color:var(--fam-ink,#888);color:var(--fg,#fff)}',
    '.wn-wseg{display:inline-flex}',
    '.wn-wseg .wn-wb{border-radius:0}',
    '.wn-wseg .wn-wb:first-child{border-radius:4px 0 0 4px}',
    '.wn-wseg .wn-wb:last-child{border-radius:0 4px 4px 0;border-left-width:0}',
    '.wn-wbody{flex:1 1 auto;min-height:0;overflow:auto;padding:0;position:relative;display:flex;flex-direction:column}',
    '.wn-wbody>*{box-sizing:border-box;flex:1 1 auto;min-width:0;min-height:0}',
    '.wn-wbody.wn-ctl>*{flex:0 0 auto;min-height:auto}',
    '.wn-wmsg{color:var(--dim,#8a8a96);padding:16px}',
    '.wn-wf{display:flex;gap:12px;align-items:center;padding:3px 8px;border-top:1px solid var(--line,#34343c);color:var(--dim,#8a8a96);font-size:11px;flex:0 0 auto;min-height:20px;white-space:nowrap;overflow:hidden}',
    '.wn-wf .wn-fv{color:var(--fg,#e8e8ec);flex:0 1 auto;overflow:hidden;text-overflow:ellipsis}',
    '.wn-wf .wn-fs{flex:1 1 auto;overflow:hidden;text-overflow:ellipsis}',
    '.wn-rz{position:absolute;z-index:2}',
    '.wn-rz-e{right:-3px;top:8px;bottom:8px;width:7px;cursor:ew-resize}',
    '.wn-rz-s{left:8px;right:8px;bottom:-3px;height:7px;cursor:ns-resize}',
    '.wn-rz-se{right:-3px;bottom:-3px;width:16px;height:16px;cursor:nwse-resize;',
    ' background:linear-gradient(135deg,transparent 0 55%,var(--dim,#888) 55% 62%,transparent 62% 74%,var(--dim,#888) 74% 81%,transparent 81%)}',
    '.wn-embedded .wn-rz{display:none}',
    '@media (max-width:700px){.wn-wt{max-width:10em}}'
  ].join('\n');

  function injectStyles() {
    if (doc.getElementById('hv-windows-style')) return;
    var s = doc.createElement('style');
    s.id = 'hv-windows-style';
    s.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }

  // ------------------------------------------------------------------ host-facing state helpers
  function isMuted(h, d) {
    var t = trackOf(d); if (!t) return false;
    try {
      if (typeof h.isMuted === 'function') return !!h.isMuted(t);
      return !!h.getParam(t + '.mute');
    } catch (e) { return false; }
  }
  function setMuted(h, d, b) {
    var t = trackOf(d); if (!t) return;
    if (typeof h.mute === 'function') h.mute(t, b); else h.setParam(t + '.mute', b);
  }
  // Bypass goes through the Host (stored in the document, kept over rebuilds and in exports).
  function canBypass(h, d) {
    return !!(d && typeof h.bypass === 'function' && d.kind !== 'instrument' && d.kind !== 'channel' && d.ref && typeof d.ref.bypass === 'function');
  }
  function isBypassed(h, d) {
    try { return !!h.isBypassed(d.id); } catch (e) { return false; }
  }
  function setBypassed(h, d, b) { h.bypass(d.id, b); }

  // A sampler device whose audio file is missing: the buffer id it names, else null.
  function missingBuffer(h, d) {
    if (!d || d.type !== 'sampler' || typeof h.audio !== 'function') return null;
    try {
      var id = h.getParam(d.pathPrefix + '.buffer');
      if (!id) return null;
      var list = h.audio();
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].missing ? id : null;
    } catch (e) { /* ignore */ }
    return null;
  }
  function relink(h, id) {
    var P = root.Project;
    if (!P || typeof P.pickAudio !== 'function' || typeof h.loadAudio !== 'function') return Promise.resolve(null);
    return P.pickAudio({ shell: root.HavantechnoShell || null }).then(function (src) {
      if (!src) return null;
      return h.loadAudio(src, { id: id });
    }).catch(function (e) { note(e); return null; });
  }

  // ------------------------------------------------------------------ chrome (shared by panels and child windows)
  // ctl: { getLink(), cycleLink(), isPinned(id), pin(id, b), close(id), touch(id), rectKey(id) }
  function Chrome(h, id, ctl, embedded) {
    var c = { id: id, host: h, view: 'editor', dev: null, face: null, el: null, embedded: !!embedded, _frame: 0, _seen: -1, _hover: null };
    var saved = lsGet(LS_RECT + id);
    if (saved && saved.v === 'controls') c.view = 'controls';

    var root_ = el('div', 'wn-win' + (embedded ? ' wn-embedded' : ''));
    root_.setAttribute('role', 'dialog');
    root_.tabIndex = -1;
    var head = el('div', 'wn-wh');
    head.setAttribute('role', 'toolbar');
    var glyph = el('span', 'wn-wg');
    glyph.setAttribute('aria-hidden', 'true');
    var title = el('span', 'wn-wt');
    var preset = btn('wn-preset', 'Preset ▾', 'Presets (not available yet)');
    preset.disabled = true;
    var sp = el('span', 'wn-sp');
    var bRelink = btn('wn-relink', 'Re-add sample\u2026', 'The audio file for this sampler is missing: choose it again');
    bRelink.hidden = true;
    var toggle = btn('wn-toggle', '', '');
    toggle.setAttribute('aria-pressed', 'false');
    var seg = el('span', 'wn-wseg');
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', 'View');
    var bEditor = btn('', 'Editor', 'Editor view: the designed face');
    var bCtrl = btn('', 'Controls', 'Controls view: every parameter as a plain control');
    seg.appendChild(bEditor); seg.appendChild(bCtrl);
    var bLink = btn('wn-link', 'Link', 'Link mode: click to cycle Off, Single, Multi');
    var bPin = btn('wn-pin', '⧉', 'Pin this window to its device');
    bPin.setAttribute('aria-pressed', 'false');
    var bClose = btn('wn-close', '×', 'Close window');
    head.appendChild(glyph); head.appendChild(title); head.appendChild(preset); head.appendChild(sp);
    head.appendChild(bRelink); head.appendChild(toggle); head.appendChild(seg); head.appendChild(bLink); head.appendChild(bPin); head.appendChild(bClose);

    var body = el('div', 'wn-wbody');
    var foot = el('div', 'wn-wf');
    var fv = el('span', 'wn-fv', ' ');
    var fs = el('span', 'wn-fs');
    var fk = el('span', 'wn-fk', 'V hide all · Esc close · Space play');
    foot.appendChild(fv); foot.appendChild(fs); foot.appendChild(fk);

    root_.appendChild(head); root_.appendChild(body); root_.appendChild(foot);
    c.el = root_; c.head = head; c.body = body;

    function setView(v) {
      if (c.view === v) return;
      c.view = v;
      var r = lsGet(LS_RECT + c.id) || {};
      r.v = v; lsSet(LS_RECT + c.id, r);
      c.build();
    }
    bEditor.addEventListener('click', function () { setView('editor'); });
    bCtrl.addEventListener('click', function () { setView('controls'); });
    bLink.addEventListener('click', function () { ctl.cycleLink(); c.refreshHead(true); });
    bPin.addEventListener('click', function () { ctl.pin(c.id, !ctl.isPinned(c.id)); c.refreshHead(true); });
    bClose.addEventListener('click', function () { ctl.close(c.id); });
    bRelink.addEventListener('click', function () {
      var mid = missingBuffer(h, c.dev);
      if (mid) relink(h, mid).then(function () { c.refreshHead(true); });
    });
    toggle.addEventListener('click', function () {
      var d = c.dev; if (!d) return;
      try {
        if (d.kind === 'instrument' || d.kind === 'channel') setMuted(h, d, !isMuted(h, d));
        else setBypassed(h, d, !isBypassed(h, d));
      } catch (e) { note(e); }
      c.refreshHead(true);
    });
    root_.addEventListener('pointerdown', function () { ctl.touch(c.id); }, true);
    root_.addEventListener('focusin', function () { ctl.touch(c.id); });
    root_.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !isTextField(ev.target) && !ev.defaultPrevented) { ev.preventDefault(); ctl.close(c.id); }
      else if ((ev.key === 'w' || ev.key === 'W') && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); ctl.close(c.id); }
    });
    // The footer shows the control under the pointer or focus.
    root_.addEventListener('pointerover', function (ev) { c._hover = ev.target && ev.target.closest ? ev.target.closest('[role=slider],[role=switch],[role=combobox],[role=spinbutton]') : null; });
    root_.addEventListener('pointerleave', function () { c._hover = null; });

    c.refreshHead = function (force) {
      var d = c.dev;
      if (!d) { title.textContent = 'Device not found'; glyph.textContent = ''; toggle.hidden = true; return; }
      var fam = d.family || '';
      root_.setAttribute('data-fam', fam);
      glyph.textContent = GLYPH[fam] || '■';
      var nm = d.name || d.id;
      var tail = (d.track && d.track !== d.name) ? d.track : '';
      var tx = nm + ' · ' + fam;
      if (force || title._tx !== tx + '|' + tail) {
        title._tx = tx + '|' + tail;
        title.textContent = tx;
        if (tail) { var sm = el('small', '', 'on ' + tail); title.appendChild(sm); }
        root_.setAttribute('aria-label', nm + ' ' + fam);
        if (root.document && c.embedded) doc.title = nm + ' · ' + fam + ' — Havantechno';
      }
      bRelink.hidden = !missingBuffer(h, d);
      // bypass or mute
      var mode = (d.kind === 'instrument' || d.kind === 'channel') ? 'mute' : (canBypass(h, d) ? 'bypass' : '');
      toggle.hidden = !mode;
      if (mode) {
        var on = mode === 'mute' ? isMuted(h, d) : isBypassed(h, d);
        toggle.textContent = mode === 'mute' ? 'Mute' : 'Bypass';
        toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
        var tl = mode === 'mute' ? 'Mute track ' + (trackOf(d) || '') : 'Bypass ' + nm;
        toggle.title = tl; toggle.setAttribute('aria-label', tl);
      }
      bEditor.setAttribute('aria-pressed', c.view === 'editor' ? 'true' : 'false');
      bCtrl.setAttribute('aria-pressed', c.view === 'controls' ? 'true' : 'false');
      var lm = ctl.getLink();
      bLink.textContent = 'Link: ' + lm.charAt(0).toUpperCase() + lm.slice(1);
      var pinned = ctl.isPinned(c.id);
      bPin.setAttribute('aria-pressed', pinned ? 'true' : 'false');
      var pl = pinned ? 'Pinned: ignores selection. Click to unpin' : 'Pin this window to its device';
      bPin.title = pl; bPin.setAttribute('aria-label', pl);
    };

    c.build = function () {
      if (c.face && typeof c.face.dispose === 'function') { try { c.face.dispose(); } catch (e) { note(e); } }
      c.face = null;
      body.textContent = '';
      body.className = 'wn-wbody' + (c.view === 'controls' ? ' wn-ctl' : '');
      var d = null;
      try { d = h.device(c.id); } catch (e) { d = null; }
      c.dev = d || null;
      if (!d) { body.appendChild(el('div', 'wn-wmsg', 'This device is not in the current song.')); c.refreshHead(true); return; }
      var F = root.Faces;
      var made = null;
      try {
        if (!F) throw new Error('Faces is not loaded');
        if (c.view === 'controls') made = F.fallback ? F.fallback(d, 'window', h) : F.render(d, 'window', h);
        else made = F.render(d, 'window', h);
      } catch (e) {
        note(e);
        body.appendChild(el('div', 'wn-wmsg', 'This face could not be drawn: ' + (e && e.message ? e.message : e)));
      }
      if (made) {
        if (made.nodeType === 1) made = { el: made };
        if (made.el) body.appendChild(made.el);
        c.face = made;
      }
      c.refreshHead(true);
      c._seen = docEvents;
      c._rw = c._rh = 0;
      c.resizeFace();
    };

    // Tell the face its drawing area (the whole body: the face owns everything below the title bar) so heroes can scale: face.resize(w, h).
    c.resizeFace = function () {
      if (!c.face || typeof c.face.resize !== 'function') return;
      var w = body.clientWidth, hh = body.clientHeight;
      if (w < 1 || hh < 1 || (c._rw === w && c._rh === hh)) return;
      c._rw = w; c._rh = hh;
      try { c.face.resize(w, hh); } catch (e) { note(e); }
    };
    if (typeof root.ResizeObserver === 'function') {
      try {
        c._ro = new root.ResizeObserver(function () {
          if (c._roPending) return;
          c._roPending = true;
          root.requestAnimationFrame(function () { c._roPending = false; c.resizeFace(); });
        });
        c._ro.observe(body);
      } catch (e) { c._ro = null; }
    }

    c.footer = function () {
      var t = null;
      var a = doc.activeElement;
      if (a && root_.contains(a)) t = a.closest ? a.closest('[role=slider],[role=switch],[role=combobox],[role=spinbutton]') : null;
      if (!t) t = c._hover && root_.contains(c._hover) ? c._hover : null;
      var txt = '';
      if (t) {
        var label = t.getAttribute('aria-label') || t.getAttribute('data-label') || t.title || '';
        var val = t.getAttribute('aria-valuetext') || t.getAttribute('aria-valuenow') || t.getAttribute('aria-checked') || '';
        txt = label + (val !== '' ? '  ' + val : '');
      }
      if (fv.textContent !== txt) fv.textContent = txt || ' ';
      var s = '';
      try {
        var p = h.transport && h.transport.pos ? h.transport.pos() : null;
        var held = typeof h.heldCount === 'function' ? h.heldCount() : 0;
        s = (p && p.sectionName ? 'section ' + p.sectionName : '') + (held ? '  ·  ' + held + ' held' : '');
      } catch (e) { s = ''; }
      if (fs.textContent !== s) fs.textContent = s;
    };

    // Called once per frame by the manager.
    c.update = function () {
      c._frame++;
      if (c._seen !== docEvents || c._frame % 45 === 0) {
        var d2 = null;
        try { d2 = h.device(c.id); } catch (e) { d2 = null; }
        if (!d2 !== !c.dev || (d2 && c.dev && d2.ref !== c.dev.ref)) { c.build(); }
        else { c._seen = docEvents; }
      }
      if (c.face && typeof c.face.update === 'function') { try { c.face.update(); } catch (e) { if (!c._warned) { c._warned = true; note(e); } } }
      if (c._hseen !== headEvents) { c._hseen = headEvents; c.refreshHead(true); }
      else if (c._frame % 6 === 0) c.refreshHead(false);
      if (c._frame % 3 === 0) c.footer();
    };

    c.setDevice = function (nid) { c.id = nid; var s = lsGet(LS_RECT + nid); c.view = (s && s.v === 'controls') ? 'controls' : 'editor'; c.build(); };
    c.dispose = function () {
      if (c._ro) { try { c._ro.disconnect(); } catch (e) { /* ignore */ } c._ro = null; }
      if (c.face && typeof c.face.dispose === 'function') { try { c.face.dispose(); } catch (e) { note(e); } }
      c.face = null;
      if (root_.parentNode) root_.parentNode.removeChild(root_);
    };
    c.build();
    return c;
  }

  // ------------------------------------------------------------------ web panels
  var webCtl = {
    getLink: function () { return linkMode; },
    cycleLink: function () { Windows.link = linkMode === 'off' ? 'single' : (linkMode === 'single' ? 'multi' : 'off'); },
    isPinned: function (id) { var w = wins[id]; return !!(w && w.pinned); },
    pin: function (id, b) { Windows.pin(id, b); },
    close: function (id) { Windows.close(id); },
    touch: function (id) { var w = wins[id]; if (w) focusWin(w, true); }
  };

  function saveRect(w) {
    var r = lsGet(LS_RECT + w.id) || {};
    r.x = Math.round(parseFloat(w.el.style.left) || 0); r.y = Math.round(parseFloat(w.el.style.top) || 0);
    r.w = Math.round(w.el.offsetWidth); r.h = Math.round(w.el.offsetHeight);
    r.v = w.chrome.view;
    lsSet(LS_RECT + w.id, r);
    w.chrome.resizeFace();
  }
  function placeRect(w, x, y, ww, hh) {
    var tmin = topMin();
    if (ww != null) w.el.style.width = Math.max(MIN_W, Math.min(ww, vw() - 8)) + 'px';
    if (hh != null) w.el.style.height = Math.max(MIN_H, Math.min(hh, vh() - tmin - 8)) + 'px';
    var cw = w.el.offsetWidth || MIN_W, ch = w.el.offsetHeight || MIN_H;
    w.el.style.left = clamp(Math.round(x), 4, Math.max(4, vw() - cw - 4)) + 'px';
    w.el.style.top = clamp(Math.round(y), tmin, Math.max(tmin, vh() - Math.min(ch, 60))) + 'px';
  }
  function autoFit(w) {
    w.el.style.width = 'auto'; w.el.style.height = 'auto';
    var ww = w.el.offsetWidth, hh = w.el.offsetHeight;
    if (!ww || !hh) { ww = 480; hh = 320; }
    w.el.style.width = Math.max(MIN_W, Math.min(ww, vw() - 16)) + 'px';
    w.el.style.height = Math.max(MIN_H, Math.min(hh, vh() - topMin() - 16)) + 'px';
  }
  function focusWin(w, quiet) {
    zCounter++;
    w.z = zCounter;
    w.el.style.zIndex = String(10 + zCounter);
    for (var k in wins) if (wins.hasOwnProperty(k)) wins[k].el.classList.toggle('wn-focus', wins[k] === w);
    if (!quiet) { try { w.el.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }

  function wire(w) {
    var el_ = w.el, head = w.chrome.head;
    // drag
    head.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0 || (ev.target.closest && ev.target.closest('button,select,input'))) return;
      focusWin(w, true);
      var r = el_.getBoundingClientRect();
      var dx = ev.clientX - r.left, dy = ev.clientY - r.top;
      try { head.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
      function mv(e) {
        var nx = clamp(e.clientX - dx, 8 - el_.offsetWidth + 80, vw() - 80);
        var ny = clamp(e.clientY - dy, topMin(), vh() - 28);
        el_.style.left = Math.round(nx) + 'px'; el_.style.top = Math.round(ny) + 'px';
      }
      function up(e) {
        head.removeEventListener('pointermove', mv); head.removeEventListener('pointerup', up); head.removeEventListener('pointercancel', up);
        try { head.releasePointerCapture(e.pointerId); } catch (x) { /* ignore */ }
        saveRect(w);
      }
      head.addEventListener('pointermove', mv); head.addEventListener('pointerup', up); head.addEventListener('pointercancel', up);
      ev.preventDefault();
    });
    // keyboard: Alt+arrows move, Alt+Shift+arrows resize (head must have focus)
    head.tabIndex = 0;
    head.addEventListener('keydown', function (ev) {
      if (!ev.altKey || ev.target !== head) return;
      var d = ev.shiftKey ? 20 : 20, dx = 0, dy = 0;
      if (ev.key === 'ArrowLeft') dx = -d; else if (ev.key === 'ArrowRight') dx = d; else if (ev.key === 'ArrowUp') dy = -d; else if (ev.key === 'ArrowDown') dy = d; else return;
      ev.preventDefault();
      if (ev.shiftKey) { placeRect(w, parseFloat(el_.style.left), parseFloat(el_.style.top), el_.offsetWidth + dx, el_.offsetHeight + dy); }
      else { placeRect(w, parseFloat(el_.style.left) + dx, parseFloat(el_.style.top) + dy, null, null); }
      saveRect(w);
    });
    // resize handles
    [['e', 1, 0], ['s', 0, 1], ['se', 1, 1]].forEach(function (spec) {
      var hd = el('div', 'wn-rz wn-rz-' + spec[0]);
      el_.appendChild(hd);
      hd.addEventListener('pointerdown', function (ev) {
        if (ev.button !== 0) return;
        focusWin(w, true);
        var sx = ev.clientX, sy = ev.clientY, sw = el_.offsetWidth, sh = el_.offsetHeight;
        try { hd.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
        function mv(e) {
          if (spec[1]) el_.style.width = Math.max(MIN_W, Math.min(sw + e.clientX - sx, vw() - parseFloat(el_.style.left) - 4)) + 'px';
          if (spec[2]) el_.style.height = Math.max(MIN_H, Math.min(sh + e.clientY - sy, vh() - parseFloat(el_.style.top) - 4)) + 'px';
        }
        function up(e) {
          hd.removeEventListener('pointermove', mv); hd.removeEventListener('pointerup', up); hd.removeEventListener('pointercancel', up);
          try { hd.releasePointerCapture(e.pointerId); } catch (x) { /* ignore */ }
          saveRect(w);
        }
        hd.addEventListener('pointermove', mv); hd.addEventListener('pointerup', up); hd.addEventListener('pointercancel', up);
        ev.preventDefault(); ev.stopPropagation();
      });
    });
  }

  function createWin(id) {
    if (!layer) layer = doc.getElementById('windows') || doc.body;
    var w = { id: id, pinned: false, z: 0 };
    w.chrome = Chrome(host, id, webCtl, false);
    w.el = w.chrome.el;
    layer.appendChild(w.el);
    wire(w);
    wins[id] = w;
    applyRect(w, true);
    focusWin(w);
    return w;
  }
  // Position and size from the remembered rect (per device id), else fit to content and cascade.
  function applyRect(w, cascadeIfNew) {
    var r = lsGet(LS_RECT + w.id);
    if (r && isFinite(r.x) && isFinite(r.y) && isFinite(r.w) && isFinite(r.h)) {
      placeRect(w, r.x, r.y, r.w, r.h);
    } else {
      autoFit(w);
      var n = Object.keys(wins).length - 1;
      var x = 96 + (n % 8) * 30, y = topMin() + 40 + (n % 8) * 30;
      placeRect(w, x, y, null, null);
    }
  }
  function retargetWin(w, nid) {
    if (wins[nid] || nid === w.id) return;
    delete wins[w.id];
    w.id = nid;
    wins[nid] = w;
    w.chrome.setDevice(nid);
    var r = lsGet(LS_RECT + nid);
    if (r && isFinite(r.w) && isFinite(r.h)) placeRect(w, parseFloat(w.el.style.left), parseFloat(w.el.style.top), r.w, r.h);
    else { var l = parseFloat(w.el.style.left), t = parseFloat(w.el.style.top); autoFit(w); placeRect(w, l, t, null, null); }
  }

  // ------------------------------------------------------------------ entries: panels and child windows alike
  function entries() {
    var out = [], k;
    if (useShell) {
      children = children.filter(function (rec) { try { return !rec.api.isClosed(); } catch (e) { return false; } });
      children.forEach(function (rec) {
        out.push({ id: rec.id, pinned: rec.pinned, z: rec.z, focus: function () { try { rec.api.focus(); } catch (e) { /* closed */ } },
          retarget: function (n) { rec.api.retarget(n); rec.id = n; } });
      });
    } else {
      for (k in wins) if (wins.hasOwnProperty(k)) (function (w) {
        out.push({ id: w.id, pinned: w.pinned, z: w.z, focus: function () { if (w.el.hidden) setHidden(false); focusWin(w); }, retarget: function (n) { retargetWin(w, n); } });
      })(wins[k]);
    }
    return out;
  }
  function topUnpinned() {
    var best = null, list = entries();
    for (var i = 0; i < list.length; i++) if (!list[i].pinned && (!best || list[i].z > best.z)) best = list[i];
    return best;
  }

  function setHidden(b) {
    hiddenAll = !!b;
    var k;
    if (useShell) { try { shell.setDeviceWindowsVisible(!hiddenAll); } catch (e) { note(e); } }
    else for (k in wins) if (wins.hasOwnProperty(k)) wins[k].el.hidden = hiddenAll;
  }

  function subscribe(h) {
    if (subscribed || !h || typeof h.on !== 'function') return;
    subscribed = true;
    try { h.on('document', function () { docEvents++; headEvents++; }); } catch (e) { /* ignore */ }
    try { h.on('bypass', function () { headEvents++; }); h.on('audio', function () { headEvents++; }); } catch (e2) { /* ignore */ }
  }

  // ------------------------------------------------------------------ public API
  var Windows = {
    init: function (opts) {
      opts = opts || {};
      if (opts.host) { host = opts.host; subscribe(host); }
      if (opts.layer) layer = opts.layer;
      injectStyles();
      var l = lsGet(LS_LINK);
      if (l === 'off' || l === 'single' || l === 'multi') linkMode = l;
      return Windows;
    },

    open: function (deviceId, h) {
      if (h) { host = h; subscribe(h); }
      if (!host || !deviceId) return null;
      injectStyles();
      deviceId = String(deviceId);
      var dev = null;
      try { dev = host.device(deviceId); } catch (e) { dev = null; }
      if (!dev) return null;
      if (hiddenAll) setHidden(false);
      var list = entries(), i;
      for (i = 0; i < list.length; i++) if (list[i].id === deviceId) { list[i].focus(); return list[i]; }
      if (linkMode === 'single') {
        var cand = topUnpinned();
        if (cand) { cand.retarget(deviceId); cand.focus(); return cand; }
      }
      if (useShell) {
        try { shell.openDeviceWindow(deviceId); } catch (e) { note(e); }
        return { id: deviceId, pending: true };
      }
      return createWin(deviceId);
    },

    close: function (id) {
      id = String(id);
      if (useShell) {
        children.forEach(function (rec) { if (rec.id === id) { try { rec.api.close(); } catch (e) { /* closed */ } } });
        return;
      }
      var w = wins[id];
      if (!w) return;
      var wasFocus = w.el.classList.contains('wn-focus');
      w.chrome.dispose();
      delete wins[id];
      if (wasFocus) {
        var best = null; for (var k in wins) if (wins.hasOwnProperty(k) && (!best || wins[k].z > best.z)) best = wins[k];
        if (best) focusWin(best, true);
      }
    },

    closeAll: function () { Object.keys(wins).forEach(function (k) { Windows.close(k); }); children.slice().forEach(function (r) { try { r.api.close(); } catch (e) { /* closed */ } }); },

    toggleAll: function () { setHidden(!hiddenAll); return hiddenAll; },
    isHidden: function () { return hiddenAll; },

    tile: function () {
      if (useShell) { try { if (shell.arrangeDeviceWindows) shell.arrangeDeviceWindows('tile'); } catch (e) { note(e); } return; }
      var list = Object.keys(wins).map(function (k) { return wins[k]; }).sort(function (a, b) { return a.z - b.z; });
      var n = list.length; if (!n) return;
      if (hiddenAll) setHidden(false);
      var tmin = topMin(), gap = 8;
      var cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
      var cw = Math.floor((vw() - gap * (cols + 1)) / cols), ch = Math.floor((vh() - tmin - gap * (rows + 1)) / rows);
      list.forEach(function (w, i) {
        var cx = i % cols, cy = Math.floor(i / cols);
        placeRect(w, gap + cx * (cw + gap), tmin + gap + cy * (ch + gap), Math.max(MIN_W, cw), Math.max(MIN_H, ch));
        saveRect(w);
      });
    },

    cascade: function () {
      if (useShell) { try { if (shell.arrangeDeviceWindows) shell.arrangeDeviceWindows('cascade'); } catch (e) { note(e); } return; }
      var list = Object.keys(wins).map(function (k) { return wins[k]; }).sort(function (a, b) { return a.z - b.z; });
      if (hiddenAll && list.length) setHidden(false);
      var tmin = topMin();
      list.forEach(function (w, i) {
        placeRect(w, 40 + i * 32, tmin + 24 + i * 32, null, null);
        saveRect(w);
        w.el.style.zIndex = String(10 + (++zCounter)); w.z = zCounter;
      });
    },

    pin: function (id, b) {
      id = String(id);
      if (useShell) { children.forEach(function (rec) { if (rec.id === id) rec.pinned = !!b; }); return; }
      if (wins[id]) wins[id].pinned = !!b;
    },
    isPinned: function (id) {
      id = String(id);
      if (useShell) { for (var i = 0; i < children.length; i++) if (children[i].id === id) return !!children[i].pinned; return false; }
      return !!(wins[id] && wins[id].pinned);
    },

    // Views call this when the selected track or device changes. A track-level selection (the instrument
    // device of a track) makes followers show their own role on that track; any other device is shown as is.
    onSelect: function (deviceId) {
      if (deviceId == null) return;
      deviceId = String(deviceId);
      lastSel = deviceId;
      if (linkMode === 'off' || !host) return;
      var sel = null;
      try { sel = host.device(deviceId); } catch (e) { sel = null; }
      if (!sel) return;
      var targets;
      if (linkMode === 'single') { var t = topUnpinned(); targets = t ? [t] : []; }
      else targets = entries().filter(function (e) { return !e.pinned; });
      if (!targets.length) return;
      var all = null;
      targets.forEach(function (e) {
        var cur = null;
        try { cur = host.device(e.id); } catch (x) { cur = null; }
        var nid = sel.id;
        if (sel.kind === 'instrument' && cur && roleOf(cur) !== 'instrument' && trackOf(cur) !== null) {
          // follow the role: same unit type on the newly selected track
          if (!all) { try { all = host.devices(); } catch (x2) { all = []; } }
          var want = roleOf(cur), found = null;
          for (var i = 0; i < all.length; i++) if (all[i].track === sel.track && roleOf(all[i]) === want) { found = all[i]; break; }
          if (found) nid = found.id; else if (linkMode === 'multi') return;
        } else if (linkMode === 'multi' && cur && sel.kind !== 'instrument' && roleOf(cur) !== roleOf(sel)) {
          return;
        }
        if (nid === e.id) return;
        var clash = entries().some(function (o) { return o.id === nid; });
        if (clash) return;
        e.retarget(nid);
      });
    },
    selected: function () { return lastSel; },
    selectedTrack: function () {
      if (!lastSel || !host) return null;
      try { var d = host.device(lastSel); return d ? trackOf(d) : null; } catch (e) { return null; }
    },

    // One call per animation frame (app.js loop).
    update: function () {
      if (useShell) {
        if (children.length && (pruneTick++ % 60) === 0) entries();     // prune closed child windows
        return;
      }
      for (var k in wins) if (wins.hasOwnProperty(k)) { var w = wins[k]; if (!w.el.hidden) w.chrome.update(); }
    },

    count: function () { return useShell ? entries().length : Object.keys(wins).length; },
    ids: function () { return entries().map(function (e) { return e.id; }); },
    setLink: function (m) { Windows.link = m; },
    cycleLink: function () { Windows.link = linkMode === 'off' ? 'single' : (linkMode === 'single' ? 'multi' : 'off'); },
    isShell: function () { return useShell; },

    // Electron child window: render one device window filling the page, bound to host (a bridge host).
    // opener: the main window's Windows object (for link and pin state). Returns {update, dispose, setDevice, id}.
    embed: function (container, deviceId, h, openerWindows) {
      injectStyles();
      var ow = openerWindows || null;
      var rec = null;
      var api;
      var ctl = {
        getLink: function () { try { return ow ? ow.link : 'single'; } catch (e) { return 'single'; } },
        cycleLink: function () { try { if (ow) ow.cycleLink(); } catch (e) { /* opener gone */ } },
        isPinned: function () { return !!(rec && rec.pinned); },
        pin: function (id, b) { if (rec) rec.pinned = !!b; },
        close: function () { try { root.close(); } catch (e) { /* ignore */ } },
        touch: function () { if (rec) rec.z = (ow && ow.nextZ) ? ow.nextZ() : (rec.z || 0) + 1; }
      };
      subscribe(h);                       // rebuild on the host's 'document' event instead of waiting for the poll
      var chrome = Chrome(h, deviceId, ctl, true);
      container.appendChild(chrome.el);
      api = {
        id: function () { return chrome.id; },
        retarget: function (nid) {
          chrome.setDevice(nid); if (rec) rec.id = nid;
          // keep the shell's id for this OS window current (see main.js retargetDeviceWindow)
          try { if (root.HavantechnoShell && root.HavantechnoShell.retargetDeviceWindow) root.HavantechnoShell.retargetDeviceWindow(nid); } catch (e) { /* ignore */ }
        },
        focus: function () { try { root.focus(); } catch (e) { /* ignore */ } },
        close: function () { try { root.close(); } catch (e) { /* ignore */ } },
        isClosed: function () { return !!root.closed; }
      };
      if (ow && typeof ow.registerChild === 'function') {
        try { rec = ow.registerChild(api); } catch (e) { rec = null; }
      }
      if (!rec) rec = { pinned: false, z: 0, id: deviceId };
      var out = {
        el: chrome.el,
        id: function () { return chrome.id; },
        update: function () { chrome.update(); },
        setDevice: function (nid) { api.retarget(nid); },
        dispose: function () {
          try { if (ow && typeof ow.unregisterChild === 'function') ow.unregisterChild(api); } catch (e) { /* opener gone */ }
          chrome.dispose();
        }
      };
      return out;
    },

    // Called (from the child's realm) on the main window's Windows.
    registerChild: function (api) {
      var rec = { api: api, id: api.id(), pinned: false, z: ++zCounter };
      children.push(rec);
      return rec;
    },
    unregisterChild: function (api) { children = children.filter(function (r) { return r.api !== api; }); },
    nextZ: function () { return ++zCounter; }
  };

  Object.defineProperty(Windows, 'link', {
    enumerable: true,
    get: function () { return linkMode; },
    set: function (m) {
      if (m !== 'off' && m !== 'single' && m !== 'multi') return;
      linkMode = m;
      lsSet(LS_LINK, m);
      if (m !== 'off' && lastSel) Windows.onSelect(lastSel);
    }
  });

  // Keep windows on screen when the browser window shrinks.
  if (root.addEventListener) {
    root.addEventListener('resize', function () {
      for (var k in wins) if (wins.hasOwnProperty(k)) { var w = wins[k]; placeRect(w, parseFloat(w.el.style.left) || 0, parseFloat(w.el.style.top) || 0, w.el.offsetWidth, w.el.offsetHeight); }
    });
  }

  root.Windows = Windows;
})(window);
