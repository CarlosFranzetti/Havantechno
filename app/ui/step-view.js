/* Havantechno app - ui/step-view.js
 * Global `StepView`: the Step View, the second view of the main frame (Tab switches from the System Editor).
 *
 *   var view = StepView.mount(el, host);   // host = Host.create(); el = the area below the control bar and ruler
 *   view.update();                          // called every animation frame: playhead column, follow, cheap change check
 *   view.select('bass');                    // selected track (the Step Editor band shows it)
 *   view.selectSection('mainA2');           // extra: the viewed section (name or index); app.js may share it with the System Editor
 *   view.dispose();
 *
 * Shape (design: docs/research/2026-10-23-faceplate-layout/transcripts/round5-FS5-step-view.md, REPORT.md section 11):
 *   toolbar (section, bar selector, longest pattern, follow, undo, redo)
 *   column header (step numbers 1..16 | section numbers)
 *   13 track rows under 4 group headers: rail, name, M, S, variant chip menu | 16 cells of the viewed bar | letters of the
 *     nine sections (current one highlighted) and "used n"
 *   bottom band: the Step Editor of the selected track (lanes VEL GATE NOTE PROB NUDGE REP + lanes added from "+ lane";
 *     chord tracks show the progression strip) and the variant panel (chips, + new, usage, scope radio)
 *
 * Every write goes host.editor().setStepInSection / setPlay / forkVariant / setProgression, then host.commit().
 * Cell index = (bar-in-variant) * 16 + step, bar-in-variant = viewedBar % variant.bars.
 * The view reads host.document() fresh on every build, because undo replaces the editor's document object.
 * It needs no Widgets: the controls here are plain DOM (the grid, lanes and menus are specific to this view).
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var K = root.Kit;
  var STEPS = 16;

  var GROUPS = [
    { id: 'drums', label: 'DRUMS', tracks: ['kick', 'clap', 'hat_closed', 'hat_open', 'shaker', 'perc'] },
    { id: 'bass', label: 'BASS', tracks: ['sub', 'bass'] },
    { id: 'other', label: 'OTHER', tracks: ['stab', 'lead', 'pad'] },
    { id: 'fx', label: 'FX', tracks: ['riser', 'impact'] }
  ];
  var FAM = { kick: 'drums', clap: 'drums', hat_closed: 'drums', hat_open: 'drums', shaker: 'drums', perc: 'drums',
              sub: 'bass', bass: 'bass', stab: 'keys', lead: 'keys', pad: 'keys', riser: 'fx', impact: 'fx' };
  // voice parameters that act through a callback, not inside trigger(), so a per-step lock cannot reach them
  var NOT_LOCKABLE = { level: 1, drive: 1 };
  var COND_CYCLE = [null, '1:2', '2:2', '1:4', '2:4', '3:4', '4:4', '!1:4', '!2:4', '!3:4', '!4:4'];
  var VEL_PRESETS = [0.5, 0.85, 1];
  var DBL_MS = 320;
  var mountCount = 0;

  // ------------------------------------------------------------ small helpers
  function isArr(a) { return Object.prototype.toString.call(a) === '[object Array]'; }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function round(v, q) { return Math.round(v / q) * q; }
  function fixed(v) { return parseFloat(Number(v).toFixed(4)); }
  function keys(o) { var r = [], k; for (k in o) if (has(o, k)) r.push(k); return r; }
  function noteName(m) { return (K && K.mton) ? K.mton(m) : String(m); }
  function toMidi(n, dflt) {
    if (typeof n === 'number') return n;
    if (typeof n === 'string' && K && K.ntom) { var m = K.ntom(n); if (m != null) return m; }
    return dflt;
  }
  function fmtNum(v) {
    if (v == null) return '--';
    var a = Math.abs(v);
    if (a >= 10000) return Math.round(v / 1000) + 'k';
    if (a >= 1000) return (v / 1000).toFixed(1) + 'k';
    if (a >= 100) return String(Math.round(v));
    if (a >= 10) return v.toFixed(1);
    return String(parseFloat(v.toFixed(2)));
  }
  function fmtPct(v) { return v == null ? '--' : String(Math.round(v * 100)); }
  function fmtProb(v) { return v == null ? '--' : Math.round(v * 100) + '%'; }
  function fmtNudge(v) { if (v == null) return '--'; var n = Math.round(v * 24); return (n > 0 ? '+' : '') + n; }
  function setCls(e, c, on) {
    var parts = String(e.className || '').split(' ').filter(function (x) { return x; });
    var i = parts.indexOf(c);
    if (on && i < 0) parts.push(c);
    if (!on && i >= 0) parts.splice(i, 1);
    e.className = parts.join(' ');
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  // ------------------------------------------------------------ styles (fallbacks when theme.css lacks a custom property)
  var CSS = [
    '.sv-root{--svl:236px;--svr:292px;position:relative;display:flex;flex-direction:column;min-height:0;overflow:auto;',
    ' background:var(--bg,#14161a);color:var(--fg,#e6e8ec);font:12px/1.3 system-ui,sans-serif;}',
    '.sv-root button{font:inherit;color:inherit;background:var(--panel-raised,#262a31);border:1px solid var(--line,#3a3f48);border-radius:3px;padding:0 6px;min-height:22px;cursor:pointer;}',
    '.sv-root button:disabled{opacity:.4;cursor:default;}',
    '.sv-root button.on,.sv-root button[aria-pressed=true]{outline:1px solid var(--on,#9ad);background:var(--panel,#1c1f24);}',
    '.sv-root [data-fam=drums]{--sv-ink:var(--fam-ink,#e8a04c);--sv-wash:var(--fam-wash,#3a2c1a);}',
    '.sv-root [data-fam=bass]{--sv-ink:var(--fam-ink,#e0605a);--sv-wash:var(--fam-wash,#3a1f1e);}',
    '.sv-root [data-fam=keys]{--sv-ink:var(--fam-ink,#5fb3d9);--sv-wash:var(--fam-wash,#1b2f3a);}',
    '.sv-root [data-fam=fx]{--sv-ink:var(--fam-ink,#b58be0);--sv-wash:var(--fam-wash,#2c2238);}',
    '.sv-bar{display:flex;align-items:center;gap:8px;padding:4px 8px;border-bottom:1px solid var(--line,#3a3f48);flex-wrap:wrap;}',
    '.sv-bar .sv-grow{flex:1;}',
    '.sv-bar select{font:inherit;background:var(--panel-raised,#262a31);color:inherit;border:1px solid var(--line,#3a3f48);min-height:22px;}',
    '.sv-dim{color:var(--dim,#8b919c);}',
    '.sv-hdr,.sv-row,.sv-group{display:grid;grid-template-columns:var(--svl) minmax(0,1fr) var(--svr);align-items:stretch;}',
    '.sv-hdr{border-bottom:1px solid var(--line,#3a3f48);padding:2px 0;}',
    '.sv-hdr .sv-steps{display:grid;grid-template-columns:repeat(16,minmax(0,1fr));gap:2px;padding:0 4px;}',
    '.sv-hdr .sv-steps span{text-align:center;color:var(--dim,#8b919c);}',
    '.sv-hdr .sv-steps span.beat{color:var(--fg,#e6e8ec);font-weight:600;}',
    '.sv-group{background:var(--panel,#1c1f24);border-top:1px solid var(--line,#3a3f48);min-height:20px;}',
    '.sv-group button{border:0;background:none;text-align:left;font-weight:600;letter-spacing:.06em;}',
    '.sv-row{min-height:26px;border-top:1px solid transparent;}',
    '.sv-row.sel{background:var(--sv-wash,#222);}',
    '.sv-row .sv-lhs{display:flex;align-items:center;gap:4px;padding-right:4px;min-width:0;}',
    '.sv-rail{width:4px;align-self:stretch;background:var(--sv-ink,#888);flex:none;}',
    '.sv-name{flex:1;min-width:0;text-align:left;border:0;background:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.sv-chip{min-width:40px;}',
    '.sv-chip.warn{outline:2px solid var(--arm,#e0605a);}',
    '.sv-cells{display:grid;grid-template-columns:repeat(16,minmax(0,1fr));gap:2px;padding:2px 4px;}',
    '.sv-cell{position:relative;min-height:22px;border:1px solid var(--line,#3a3f48);background:var(--panel,#1c1f24);cursor:pointer;overflow:hidden;user-select:none;touch-action:none;}',
    '.sv-cell:nth-child(4n+1){margin-left:4px;}',
    '.sv-cell:focus{outline:1px solid var(--on,#9ad);}',
    '.sv-fill{position:absolute;left:0;right:0;bottom:0;background:var(--sv-ink,#888);pointer-events:none;}',
    '.sv-cell.soft .sv-fill{opacity:.55;}',
    '.sv-cell.acc{border:2px solid var(--fg,#e6e8ec);}',
    '.sv-cell.acc::after{content:"!";position:absolute;left:2px;top:0;font-weight:700;color:var(--bg,#14161a);pointer-events:none;}',
    '.sv-cell.span .sv-fill{height:35%!important;opacity:.35;}',
    '.sv-cell.inert{cursor:default;opacity:.55;}',
    '.sv-cell.ghost{opacity:.4;}',
    '.sv-cell.ph{box-shadow:inset 0 0 0 2px var(--on,#9ad);}',
    '.sv-cell .sv-mark{position:absolute;right:2px;top:0;font-size:10px;font-weight:700;color:var(--fg,#e6e8ec);text-shadow:0 0 2px var(--bg,#14161a);pointer-events:none;}',
    '.sv-cell .sv-nm{position:absolute;left:0;right:0;bottom:1px;text-align:center;font-size:10px;font-weight:600;color:var(--bg,#14161a);pointer-events:none;mix-blend-mode:normal;}',
    '.sv-secs{display:grid;gap:2px;align-items:center;padding:0 4px;}',
    '.sv-secs button{padding:0;min-height:20px;text-align:center;}',
    '.sv-secs button.cur{outline:2px solid var(--on,#9ad);font-weight:700;}',
    '.sv-secs .sv-used{text-align:right;color:var(--dim,#8b919c);}',
    '.sv-band{border-top:2px solid var(--line,#3a3f48);display:grid;grid-template-columns:var(--svl) minmax(0,1fr) var(--svr);}',
    '.sv-band .sv-bhead{grid-column:1 / 4;padding:4px 8px;font-weight:600;background:var(--panel,#1c1f24);}',
    '.sv-lanes{grid-column:1 / 3;}',
    '.sv-lane{display:grid;grid-template-columns:var(--svl) minmax(0,1fr);min-height:26px;border-top:1px solid var(--line,#3a3f48);}',
    '.sv-llab{display:flex;align-items:center;gap:6px;padding:0 8px;}',
    '.sv-llab b{min-width:52px;}',
    '.sv-llab button{min-height:16px;padding:0 4px;}',
    '.sv-lcells{display:grid;grid-template-columns:repeat(16,minmax(0,1fr));gap:2px;padding:2px 4px;}',
    '.sv-lcell{position:relative;min-height:22px;border:1px solid var(--line,#3a3f48);background:var(--panel,#1c1f24);overflow:hidden;user-select:none;touch-action:none;}',
    '.sv-lcell:nth-child(4n+1){margin-left:4px;}',
    '.sv-lcell.off{opacity:.35;}',
    '.sv-lcell.unset .sv-lfill{opacity:.35;}',
    '.sv-lfill{position:absolute;left:0;right:0;bottom:0;background:var(--sv-ink,#888);pointer-events:none;}',
    '.sv-lval{position:absolute;left:0;right:0;top:2px;text-align:center;font-size:10px;font-weight:600;pointer-events:none;text-shadow:0 0 2px var(--bg,#14161a);}',
    '.sv-vp{grid-column:3;grid-row:2 / span 12;padding:6px 8px;border-left:1px solid var(--line,#3a3f48);display:flex;flex-direction:column;gap:6px;}',
    '.sv-vp .sv-chips{display:flex;gap:4px;flex-wrap:wrap;}',
    '.sv-vp label{display:flex;gap:6px;align-items:flex-start;}',
    '.sv-prog{display:grid;grid-template-columns:var(--svl) minmax(0,1fr);border-top:1px solid var(--line,#3a3f48);min-height:28px;}',
    '.sv-prog .sv-slots{display:flex;gap:4px;padding:2px 4px;}',
    '.sv-prog .sv-slot{flex:1;text-align:center;}',
    '.sv-prog .sv-slot.cur{outline:2px solid var(--on,#9ad);}',
    '.sv-msg{grid-column:1 / 3;padding:4px 8px;min-height:24px;display:flex;gap:8px;align-items:center;border-top:1px solid var(--line,#3a3f48);}',
    '.sv-menu{position:absolute;z-index:20;min-width:180px;max-height:320px;overflow:auto;background:var(--panel-raised,#262a31);border:1px solid var(--fg,#e6e8ec);border-radius:4px;padding:3px;box-shadow:0 4px 14px rgba(0,0,0,.5);}',
    '.sv-menu button{display:block;width:100%;text-align:left;border:0;background:none;padding:3px 8px;}',
    '.sv-menu button:hover:not(:disabled),.sv-menu button:focus{background:var(--panel,#1c1f24);}',
    '.sv-menu .sv-mp{font-family:monospace;letter-spacing:.5px;color:var(--dim,#8b919c);margin-left:6px;}',
    '.sv-help{padding:4px 8px;border-top:1px solid var(--line,#3a3f48);color:var(--dim,#8b919c);}'
  ].join('\n');

  function ensureStyle(D) {
    try {
      if (D.getElementById && D.getElementById('sv-style')) return;
      var s = D.createElement('style');
      s.id = 'sv-style';
      s.textContent = CSS;
      (D.head || D.body).appendChild(s);
    } catch (e) { /* styling is optional */ }
  }

  // ------------------------------------------------------------ mount
  function mount(el, host) {
    var D = el.ownerDocument || root.document;
    ensureStyle(D);
    var uid = ++mountCount;
    var rootEl = D.createElement('div');
    rootEl.className = 'sv-root';
    rootEl.setAttribute('data-view', 'step');
    el.appendChild(rootEl);

    var st = {
      sec: 0, bar: 0, track: null, scope: 'section', follow: false,
      lanes: {},          // track -> ['cond', 'lock:cutoff', ...]
      collapsed: {},      // group id -> true
      mute: {}, solo: {}, // local M/S state; applied through host.setParam('<track>.mute')
      msg: null, dragging: false, pending: false, menu: null
    };
    var disposed = false, lastDoc = null, phCol = -1, frame = 0, lastSig = '', lastClick = null;
    var flagsNow = {};    // track -> {muted, solo} read once per build
    var cellEls = {};     // track -> [16 cell elements]
    var listeners = [];   // [type, fn] pairs registered on host
    var docListeners = [];// [type, fn] pairs registered on the document

    // ---------------------------------------------------------- document access
    function doc() { return host.document(); }
    function ed() { return host.editor(); }
    function curSec() { var d = doc(); return d && d.sections ? d.sections[st.sec] || null : null; }
    function trackDoc(name) {
      var d = doc(), i;
      for (i = 0; i < d.tracks.length; i++) if (d.tracks[i].name === name) return d.tracks[i];
      return null;
    }
    function playLetter(sec, name) {
      var p = sec && sec.play && sec.play[name];
      return p === true ? 'A' : (p || null);
    }
    function variantFor(name) {
      var sec = curSec(), tr = trackDoc(name);
      if (!sec || !tr) return null;
      var l = playLetter(sec, name);
      if (!l || !tr.variants || !tr.variants[l]) return null;
      return { letter: l, variant: tr.variants[l], track: tr };
    }
    function isFx(name, tr) { return FAM[name] === 'fx' && tr && keys(tr.variants || {}).length === 0; }
    function sectionStart(idx) {
      var d = doc(), s = 0, i;
      for (i = 0; i < idx && i < d.sections.length; i++) s += d.sections[i].bars | 0;
      return s;
    }
    function longest() {
      var d = doc(), best = 0, who = null, i;
      for (i = 0; i < d.tracks.length; i++) {
        var g = variantFor(d.tracks[i].name);
        if (g && g.variant.bars > best) { best = g.variant.bars; who = d.tracks[i].name; }
      }
      return { bars: best || 1, track: who };
    }
    function orderedTracks() {
      var d = doc(), seen = {}, out = [], gi, ti;
      for (gi = 0; gi < GROUPS.length; gi++) {
        var g = { id: GROUPS[gi].id, label: GROUPS[gi].label, tracks: [] };
        for (ti = 0; ti < GROUPS[gi].tracks.length; ti++) {
          var n = GROUPS[gi].tracks[ti];
          if (trackDoc(n)) { g.tracks.push(n); seen[n] = true; }
        }
        out.push(g);
      }
      for (ti = 0; ti < d.tracks.length; ti++) if (!seen[d.tracks[ti].name]) out[2].tracks.push(d.tracks[ti].name); // OTHER
      return out;
    }
    function famOf(name) { return FAM[name] || 'keys'; }
    function cellAt(name, step) {
      var g = variantFor(name);
      if (!g) return null;
      return g.variant.cells[(st.bar % g.variant.bars) * STEPS + step] || null;
    }
    function cellIndex(variant, step) { return (st.bar % variant.bars) * STEPS + step; }

    // ---------------------------------------------------------- the write path
    // Runs fn (several editor calls), then collapses their undo snapshots into one so one gesture is one undo, then commits.
    function group(fn) {
      var e = ed(), n0 = isArr(e._undo) ? e._undo.length : -1;
      var r = fn(e);
      if (n0 >= 0 && e._undo.length - n0 > 1) e._undo.length = n0 + 1;
      host.commit();
      return r;
    }
    function write(name, step, patch, scopeOverride) {
      var g = variantFor(name), sec = curSec();
      if (!g || !sec) return false;
      var idx = cellIndex(g.variant, step), scope = scopeOverride || st.scope;
      var r = group(function (e) { return e.setStepInSection(sec.name, name, idx, patch, scope); });
      if (!r) return false;
      if (r.forked) {
        var others = ed().variantUsage(name, g.letter);
        st.msg = { text: name + ' ' + g.letter + ' to ' + r.variant + ' for ' + sec.name + '; ' + g.letter + ' is still used by ' + others.join(', '),
                   name: name, step: step, patch: patch, count: others.length + 1 };
      } else if (st.msg && st.msg.name === name) { st.msg = null; }
      refresh();
      return true;
    }
    function setVariant(name, letter) {
      var sec = curSec(); if (!sec) return;
      group(function (e) { e.setPlay(sec.name, name, letter); });
      st.msg = null;
      refresh();
    }
    function freeLetter(tr) {
      var L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', i;
      for (i = 0; i < L.length; i++) if (!has(tr.variants, L.charAt(i))) return L.charAt(i);
      return null;
    }
    function newEmpty(name) {
      var sec = curSec(), tr = trackDoc(name); if (!sec || !tr) return;
      var letter = freeLetter(tr); if (!letter) return;
      group(function (e) { e.setStep(name, letter, 0, null); e.setPlay(sec.name, name, letter); });
      st.msg = null;
      refresh();
    }
    function copyOf(name) {
      var sec = curSec(), g = variantFor(name); if (!sec || !g) return;
      group(function (e) { var l = e.forkVariant(name, g.letter); if (l) e.setPlay(sec.name, name, l); });
      st.msg = null;
      refresh();
    }
    function doUndo() { var e = ed(); if (e.undo()) { host.commit(); st.msg = null; refresh(); } }
    function doRedo() { var e = ed(); if (e.redo()) { host.commit(); st.msg = null; refresh(); } }

    // ---------------------------------------------------------- mute / solo (host.mute / host.solo; fallback: <track>.mute params)
    function trackFlags() {
      var map = {}, list = null;
      try { list = host.tracks ? host.tracks() : null; } catch (e) { list = null; }
      if (isArr(list)) list.forEach(function (t) { if (t && t.name) map[t.name] = t; });
      return map;
    }
    function setMute(name, b) {
      st.mute[name] = b;
      try { if (host.mute) host.mute(name, b); else host.setParam(name + '.mute', b ? 1 : 0); } catch (e) { /* not fatal */ }
    }
    function setSolo(name, b) {
      st.solo[name] = b;
      try {
        if (host.solo) { host.solo(name, b); return; }
        var any = false, k; for (k in st.solo) if (has(st.solo, k) && st.solo[k]) any = true;   // emulate: mute everything else
        doc().tracks.forEach(function (t) { host.setParam(t.name + '.mute', (st.mute[t.name] || (any && !st.solo[t.name])) ? 1 : 0); });
      } catch (e) { /* not fatal */ }
    }

    // ---------------------------------------------------------- menus
    function closeMenu() {
      if (st.menu && st.menu.parentNode) st.menu.parentNode.removeChild(st.menu);
      st.menu = null;
    }
    function openMenu(anchor, items) {
      closeMenu();
      var m = D.createElement('div');
      m.className = 'sv-menu';
      m.setAttribute('role', 'menu');
      items.forEach(function (it) {
        if (it.sep) { var s = D.createElement('div'); s.className = 'sv-dim'; s.textContent = it.label; m.appendChild(s); return; }
        var b = D.createElement('button');
        b.setAttribute('role', 'menuitem');
        b.textContent = it.label;
        if (it.preview) { var p = D.createElement('span'); p.className = 'sv-mp'; p.textContent = it.preview; b.appendChild(p); }
        if (it.disabled) b.disabled = true;
        b.addEventListener('click', function (ev) { if (ev.stopPropagation) ev.stopPropagation(); closeMenu(); it.run(); });
        m.appendChild(b);
      });
      var ar = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: 0, bottom: 0 };
      var rr = rootEl.getBoundingClientRect ? rootEl.getBoundingClientRect() : { left: 0, top: 0 };
      m.style.left = Math.max(0, ar.left - rr.left + (rootEl.scrollLeft || 0)) + 'px';
      m.style.top = Math.max(0, ar.bottom - rr.top + (rootEl.scrollTop || 0)) + 'px';
      rootEl.appendChild(m);
      st.menu = m;
    }
    function onDocDown(ev) {
      if (st.menu && !(st.menu.contains && st.menu.contains(ev.target))) closeMenu();
    }
    function onDocKey(ev) { if (ev.key === 'Escape') closeMenu(); }
    function listenDoc(type, fn) { D.addEventListener(type, fn); docListeners.push([type, fn]); }
    listenDoc('pointerdown', onDocDown);
    listenDoc('keydown', onDocKey);

    function variantMenu(name, anchor) {
      var tr = trackDoc(name), sec = curSec(), e = ed();
      if (!tr || !sec) return;
      var cur = playLetter(sec, name), items = [];
      keys(tr.variants).sort().forEach(function (l) {
        var v = tr.variants[l], used = e.variantUsage(name, l).length, pv = '', i;
        if (tr.kind === 'melody') pv = v.bars + ' bars';
        else for (i = 0; i < STEPS; i++) { var c = v.cells[i]; pv += !c ? '.' : c.acc ? 'X' : (c.vel != null && c.vel < 0.7) ? 'o' : 'x'; }
        items.push({ label: (l === cur ? '> ' : '  ') + l + '   used ' + used, preview: pv, run: function () { setVariant(name, l); } });
      });
      items.push({ label: '+ new empty', run: function () { newEmpty(name); } });
      items.push({ label: '+ copy of this', disabled: !cur || !tr.variants[cur], run: function () { copyOf(name); } });
      openMenu(anchor, items);
    }

    // ---------------------------------------------------------- cell gestures
    function newHitPatch(name, g, step) {
      if (g.track.kind !== 'melody') return { vel: 0.85 };
      var cells = g.variant.cells, base = cellIndex(g.variant, step), i, n = null;
      for (i = base; i >= 0 && n == null; i--) if (cells[i] && cells[i].note != null) n = cells[i].note;
      for (i = base; i < cells.length && n == null; i++) if (cells[i] && cells[i].note != null) n = cells[i].note;
      return { vel: 0.85, len: 1, note: n != null ? n : toMidi('C#5', 73) };
    }
    function toggleCell(name, step) {
      var g = variantFor(name); if (!g) return;
      if (cellAt(name, step)) write(name, step, null);
      else write(name, step, newHitPatch(name, g, step));
    }
    function accentCell(name, step) {
      var g = variantFor(name); if (!g) return;
      var c = cellAt(name, step), mel = g.track.kind === 'melody';
      if (mel) {
        if (!c) { var p = newHitPatch(name, g, step); p.vel = 1; write(name, step, p); }
        else write(name, step, { vel: (c.vel != null && c.vel >= 1) ? 0.85 : 1 });
      } else if (c && c.acc) write(name, step, { acc: null, vel: 0.85 });
      else write(name, step, { acc: true, vel: 1 });
    }
    function softCell(name, step) {
      var g = variantFor(name); if (!g) return;
      var c = cellAt(name, step);
      if (c) write(name, step, { acc: null, vel: 0.5 });
      else { var p = newHitPatch(name, g, step); p.vel = 0.5; write(name, step, p); }
    }
    function bindCell(cellEl, name, step) {
      var key = name + ':' + step;
      cellEl.addEventListener('keydown', function (ev) {
        if (ev.key === ' ' || ev.key === 'Enter') { if (ev.preventDefault) ev.preventDefault(); if (ev.shiftKey) accentCell(name, step); else toggleCell(name, step); }
      });
      cellEl.addEventListener('pointerdown', function (ev) {
        if (ev.button) return;
        var g = variantFor(name); if (!g) return;
        var selChanged = select(name, true);
        var c0 = cellAt(name, step), mel = g.track.kind === 'melody';
        var gs = { y: ev.clientY, moved: false, vel0: c0 && c0.vel != null ? c0.vel : 0.85, note0: c0 && c0.note != null ? c0.note : null };
        function mv(e2) {
          var dy = gs.y - e2.clientY;
          if (!gs.moved && Math.abs(dy) < 4) return;
          if (!c0) return;
          gs.moved = true; st.dragging = true;
          if (mel) {
            if (gs.note0 == null) return;
            gs.note = clamp(gs.note0 + Math.round(dy / 8), 24, 96);
            var nm = cellEl.querySelector && cellEl.querySelector('.sv-nm'); if (nm) nm.textContent = noteName(gs.note);
          } else {
            gs.vel = clamp(fixed(gs.vel0 + dy / 40), 0.05, 1);
            var f = cellEl.querySelector && cellEl.querySelector('.sv-fill'); if (f) f.style.height = Math.round(gs.vel * 100) + '%';
          }
        }
        function up(e2) {
          D.removeEventListener('pointermove', mv);
          D.removeEventListener('pointerup', up);
          D.removeEventListener('pointercancel', up);
          var wasDrag = gs.moved;
          st.dragging = false;
          if (selChanged) pending_ = true;
          if (wasDrag) {
            if (mel) { if (gs.note != null && gs.note !== gs.note0) write(name, step, { note: gs.note }); else refresh(); }
            else {
              var v = gs.vel;
              if (e2 && e2.altKey) { var best = VEL_PRESETS[0], i; for (i = 0; i < VEL_PRESETS.length; i++) if (Math.abs(VEL_PRESETS[i] - v) < Math.abs(best - v)) best = VEL_PRESETS[i]; v = best; }
              if (v !== gs.vel0) write(name, step, { vel: fixed(v) }); else refresh();
            }
            return;
          }
          var now = Date.now();
          if (lastClick && lastClick.key === key && now - lastClick.t < DBL_MS) {   // double-click: clear the step
            lastClick = null;
            if (cellAt(name, step)) write(name, step, null);
            return;
          }
          lastClick = { key: key, t: now };
          if (e2 && e2.shiftKey) accentCell(name, step);
          else if (e2 && e2.altKey) softCell(name, step);
          else toggleCell(name, step);
        }
        D.addEventListener('pointermove', mv);
        D.addEventListener('pointerup', up);
        D.addEventListener('pointercancel', up);
      });
    }

    // ---------------------------------------------------------- lanes
    function specFor(name) {
      var tr = trackDoc(name), sp = null;
      try { var dev = host.device && host.device('track:' + name); if (dev && dev.spec) sp = dev.spec; } catch (e) { sp = null; }
      if (!sp && tr && root.Synths && root.Synths.spec) { try { sp = root.Synths.spec(tr.inst || name); } catch (e2) { sp = null; } }
      return sp || {};
    }
    function lockable(name) {
      var tr = trackDoc(name), sp = specFor(name), out = [], k;
      for (k in sp) if (has(sp, k) && !NOT_LOCKABLE[k] && !(tr && tr.inst === 'stab' && k === 'hp') && sp[k] && typeof sp[k].min === 'number') out.push(k);
      return out;
    }
    function laneDefs(name) {
      var tr = trackDoc(name), kind = tr.kind, defs = [], sp = specFor(name);
      defs.push({ id: 'vel', label: 'VEL', hint: 'drag', field: 'vel', min: 0.05, max: 1, q: 0.01, def: 0.85, fmt: fmtPct });
      var gdef = kind === 'melody' ? 1 : (tr.gate != null ? tr.gate : 0.6);
      defs.push({ id: 'len', label: 'GATE', hint: 'steps', field: 'len', min: 0.1, max: Math.max(4, gdef * 2), q: 0.05, def: gdef, fmt: fmtNum });
      if (kind === 'note') {
        var base = toMidi(tr.note, 36);
        defs.push({ id: 'note', label: 'NOTE', hint: '+-12', field: 'note', min: base - 12, max: base + 12, q: 1, def: base, fmt: noteName });
      } else if (kind === 'melody') {
        defs.push({ id: 'note', label: 'NOTE', hint: 'drag', field: 'note', min: 48, max: 84, q: 1, def: null, fmt: noteName });
      }
      defs.push({ id: 'prob', label: 'PROB', hint: '%', field: 'prob', min: 0, max: 1, q: 0.05, def: 1, fmt: fmtProb });
      defs.push({ id: 'nudge', label: 'NUDGE', hint: '1/24 step', field: 'nudge', min: -0.5, max: 0.5, q: 1 / 24, def: 0, bipolar: true, fmt: fmtNudge });
      defs.push({ id: 'rep', label: 'REP', hint: 'retrigs', field: 'rep', min: 1, max: 8, q: 1, def: 1, fmt: function (v) { return v == null ? '--' : String(v); } });
      var extra = st.lanes[name] || [];
      extra.forEach(function (id) {
        if (id === 'cond') defs.push({ id: 'cond', label: 'COND', hint: 'click', field: 'cond', cycle: COND_CYCLE, def: null, fmt: function (v) { return v == null ? '--' : v; } });
        else if (id.indexOf('lock:') === 0) {
          var p = id.slice(5), s = sp[p]; if (!s) return;
          var isLog = s.min > 0 && s.max / s.min >= 50;
          defs.push({ id: id, label: 'LOCK', sub: p + (s.unit ? ' ' + s.unit : ''), lock: p, min: s.min, max: s.max, q: 0, log: isLog, def: s.value, fmt: fmtNum, removable: true });
        }
      });
      return defs;
    }
    function laneValue(def, cell) {
      if (!cell) return null;
      return def.lock ? (cell.locks ? cell.locks[def.lock] : null) : cell[def.field];
    }
    function lanePatch(def, v) {
      if (def.lock) { var l = {}; l[def.lock] = v; return { locks: l }; }
      var p = {}; p[def.field] = v; return p;
    }
    function frac(def, v) {
      if (v == null || def.cycle) return 0;
      if (def.log) return clamp((Math.log(v) - Math.log(def.min)) / (Math.log(def.max) - Math.log(def.min)), 0, 1);
      return clamp((v - def.min) / (def.max - def.min), 0, 1);
    }
    function fromFrac(def, f) {
      f = clamp(f, 0, 1);
      var v = def.log ? Math.exp(Math.log(def.min) + f * (Math.log(def.max) - Math.log(def.min))) : def.min + f * (def.max - def.min);
      if (def.q) v = round(v, def.q);
      return fixed(clamp(v, def.min, def.max));
    }
    function paintLane(cellEl, def, cell) {
      var raw = laneValue(def, cell), eff = raw != null ? raw : def.def;
      var fill = cellEl.querySelector('.sv-lfill'), lab = cellEl.querySelector('.sv-lval');
      var f = frac(def, eff);
      if (def.bipolar) { fill.style.bottom = (Math.min(f, 0.5) * 100) + '%'; fill.style.height = (Math.abs(f - 0.5) * 100) + '%'; }
      else { fill.style.bottom = '0'; fill.style.height = Math.round(f * 100) + '%'; }
      lab.textContent = eff == null ? '--' : def.fmt(eff);
      setCls(cellEl, 'unset', raw == null);
    }
    function bindLane(cellEl, def, name, step) {
      var key = 'L' + def.id + ':' + name + ':' + step;
      cellEl.addEventListener('pointerdown', function (ev) {
        if (ev.button) return;
        var cell = cellAt(name, step); if (!cell) return;
        var now = Date.now();
        if (lastClick && lastClick.key === key && now - lastClick.t < DBL_MS) {   // double-click clears the lane value
          lastClick = null;
          if (laneValue(def, cell) != null) write(name, step, lanePatch(def, null));
          return;
        }
        lastClick = { key: key, t: now };
        if (def.cycle) {
          var cur = laneValue(def, cell), i = def.cycle.indexOf(cur == null ? null : cur), nx = def.cycle[(i + 1) % def.cycle.length];
          write(name, step, lanePatch(def, nx));
          return;
        }
        var rect = cellEl.getBoundingClientRect ? cellEl.getBoundingClientRect() : { top: 0, height: 24 };
        var h = rect.height || 24, y0 = ev.clientY, v0 = laneValue(def, cell), start = v0 != null ? v0 : def.def, value = null, shiftStart = null;
        if (start == null) start = def.min;
        function setFrom(e2) {
          var v;
          if (e2.shiftKey) {                                   // Shift = fine: relative, one fifth of the travel
            if (shiftStart == null) shiftStart = { y: e2.clientY, v: value != null ? value : start };
            var f0 = frac(def, shiftStart.v) + ((shiftStart.y - e2.clientY) / h) * 0.2;
            v = fromFrac(def, f0);
          } else { shiftStart = null; v = fromFrac(def, 1 - (e2.clientY - rect.top) / h); }
          value = v;
          var fake = {}; fake.locks = {}; // preview through a throwaway cell
          if (def.lock) fake.locks[def.lock] = v; else fake[def.field] = v;
          paintLane(cellEl, def, fake);
          setCls(cellEl, 'unset', false);
        }
        st.dragging = true;
        setFrom(ev);
        function mv(e2) { setFrom(e2); }
        function up() {
          D.removeEventListener('pointermove', mv);
          D.removeEventListener('pointerup', up);
          D.removeEventListener('pointercancel', up);
          st.dragging = false;
          if (value != null && value !== v0) write(name, step, lanePatch(def, value)); else refresh();
        }
        D.addEventListener('pointermove', mv);
        D.addEventListener('pointerup', up);
        D.addEventListener('pointercancel', up);
      });
    }
    function addLane(name, id) {
      var l = st.lanes[name] = st.lanes[name] || [];
      if (l.indexOf(id) < 0) l.push(id);
      refresh();
    }
    function removeLane(name, id) {
      var l = st.lanes[name] || [], i = l.indexOf(id);
      if (i >= 0) l.splice(i, 1);
      refresh();
    }
    function laneMenu(name, anchor) {
      var have = st.lanes[name] || [], items = [], sp = specFor(name);
      items.push({ label: 'COND  play on bar a of every b', disabled: have.indexOf('cond') >= 0, run: function () { addLane(name, 'cond'); } });
      items.push({ sep: true, label: 'lock a voice parameter' });
      lockable(name).forEach(function (p) {
        var s = sp[p], id = 'lock:' + p;
        items.push({ label: p + '   ' + fmtNum(s.min) + ' to ' + fmtNum(s.max) + (s.unit ? ' ' + s.unit : ''), disabled: have.indexOf(id) >= 0, run: function () { addLane(name, id); } });
      });
      openMenu(anchor, items);
    }

    // ---------------------------------------------------------- building the view
    function el_(tag, cls, text) {
      var e = D.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    }
    function btn(label, fn, cls, title) {
      var b = el_('button', cls, label);
      b.setAttribute('type', 'button');
      if (title) b.title = title;
      b.addEventListener('click', fn);
      return b;
    }
    function cellTitle(cell, name) {
      if (!cell) return 'rest';
      var parts = [], k;
      parts.push('vel ' + Math.round((cell.vel != null ? cell.vel : 0.85) * 100));
      if (cell.acc) parts.push('accent');
      if (cell.len != null) parts.push('len ' + fmtNum(cell.len));
      if (cell.note != null) parts.push('note ' + noteName(cell.note));
      if (cell.prob != null) parts.push('prob ' + fmtProb(cell.prob));
      if (cell.nudge) parts.push('nudge ' + fmtNudge(cell.nudge));
      if (cell.cond) parts.push('cond ' + cell.cond);
      if (cell.rep != null && cell.rep > 1) parts.push('rep ' + cell.rep);
      if (cell.locks) for (k in cell.locks) if (has(cell.locks, k)) parts.push(k + ' ' + fmtNum(cell.locks[k]));
      return parts.join(', ');
    }
    function markOf(cell) {
      if (!cell) return '';
      if (cell.locks && keys(cell.locks).length) return '*';
      if (cell.prob != null && cell.prob < 1) return '%';
      if (cell.nudge) return '~';
      return '';
    }
    function fxHits(name) {
      var sec = curSec(), out = [], i;
      var fx = (sec && sec.fx) || [];
      for (i = 0; i < fx.length; i++) {
        var f = fx[i];
        if (f.track !== name) continue;
        var len = f.bars || 1, from = f.bar | 0;
        if (st.bar === from) out.push({ step: clamp(f.step | 0, 0, STEPS - 1), start: true, hit: f });
        else if (st.bar > from && st.bar < from + len) out.push({ step: 0, start: false, hit: f });
      }
      return out;
    }

    function buildToolbar(parent) {
      var d = doc(), sec = curSec(), bar = el_('div', 'sv-bar');
      var start = sectionStart(st.sec);
      bar.appendChild(el_('b', null, sec ? sec.name : '-'));
      bar.appendChild(el_('span', 'sv-dim', sec ? '(bars ' + (start + 1) + '-' + (start + sec.bars) + ')' : ''));
      var prev = btn('<', function () { st.follow = false; gotoBar(st.bar - 1); }, null, 'previous bar');
      var next = btn('>', function () { st.follow = false; gotoBar(st.bar + 1); }, null, 'next bar');
      prev.setAttribute('aria-label', 'previous bar'); next.setAttribute('aria-label', 'next bar');
      var sel = el_('select');
      sel.setAttribute('aria-label', 'bar within the section');
      var n = sec ? sec.bars : 1, i;
      for (i = 1; i <= n; i++) { var o = el_('option', null, 'bar ' + i + '/' + n); o.value = String(i - 1); if (i - 1 === st.bar) o.selected = true; sel.appendChild(o); }
      sel.value = String(st.bar);
      sel.addEventListener('change', function () { st.follow = false; gotoBar(parseInt(sel.value, 10) || 0); });
      bar.appendChild(prev); bar.appendChild(sel); bar.appendChild(next);
      var lg = longest();
      bar.appendChild(el_('span', 'sv-dim', 'longest pattern: ' + lg.bars + (lg.bars === 1 ? ' bar' : ' bars') + (lg.track ? ' (' + lg.track + ')' : '')));
      var fol = btn('follow', function () { st.follow = !st.follow; fol.setAttribute('aria-pressed', st.follow ? 'true' : 'false'); setCls(fol, 'on', st.follow); }, null, 'follow the playhead');
      fol.setAttribute('aria-pressed', st.follow ? 'true' : 'false'); setCls(fol, 'on', st.follow);
      bar.appendChild(fol);
      bar.appendChild(el_('span', 'sv-grow'));
      var e = ed();
      var u = btn('Undo', doUndo, 'sv-undo'); u.disabled = !e.canUndo();
      var r = btn('Redo', doRedo, 'sv-redo'); r.disabled = !e.canRedo();
      bar.appendChild(u); bar.appendChild(r);
      parent.appendChild(bar);
    }
    function gotoBar(b) {
      var sec = curSec(); if (!sec) return;
      st.bar = clamp(b, 0, sec.bars - 1);
      st.msg = null;
      refresh();
    }
    function gotoSection(i) {
      var d = doc();
      st.sec = clamp(i, 0, d.sections.length - 1);
      st.bar = clamp(st.bar, 0, d.sections[st.sec].bars - 1);
      st.msg = null;
      refresh();
    }

    function buildHeader(parent) {
      var d = doc(), hdr = el_('div', 'sv-hdr'), i;
      hdr.appendChild(el_('div', 'sv-dim', 'track   variant')).style.padding = '0 8px';
      var steps = el_('div', 'sv-steps');
      for (i = 0; i < STEPS; i++) steps.appendChild(el_('span', i % 4 === 0 ? 'beat' : '', String(i + 1)));
      hdr.appendChild(steps);
      var right = el_('div', 'sv-secs');
      right.style.gridTemplateColumns = 'repeat(' + d.sections.length + ',minmax(0,1fr)) 38px';
      d.sections.forEach(function (s, si) {
        var b = btn(String(si + 1), function () { st.follow = false; gotoSection(si); }, si === st.sec ? 'cur' : '', s.name + ' (' + s.bars + ' bars)');
        b.setAttribute('aria-label', 'section ' + s.name);
        right.appendChild(b);
      });
      right.appendChild(el_('span', 'sv-used', 'used'));
      hdr.appendChild(right);
      parent.appendChild(hdr);
    }

    function buildRow(parent, name) {
      var d = doc(), tr = trackDoc(name), sec = curSec(), e = ed();
      var fam = famOf(name), g = variantFor(name), fx = isFx(name, tr), kind = tr.kind;
      var row = el_('div', 'sv-row' + (st.track === name ? ' sel' : ''));
      row.setAttribute('data-fam', fam);
      row.setAttribute('data-track', name);
      // left: rail, name, M, S, variant chip
      var lhs = el_('div', 'sv-lhs');
      lhs.appendChild(el_('span', 'sv-rail'));
      var nm = btn(name, function () { select(name); }, 'sv-name', 'select ' + name);
      nm.setAttribute('aria-pressed', st.track === name ? 'true' : 'false');
      lhs.appendChild(nm);
      var flags = (tr && flagsNow[name]) || {};
      if (flags.muted != null) st.mute[name] = !!flags.muted;
      if (flags.solo != null) st.solo[name] = !!flags.solo;
      var m = btn('M', function () { setMute(name, !st.mute[name]); m.setAttribute('aria-pressed', st.mute[name] ? 'true' : 'false'); setCls(m, 'on', !!st.mute[name]); }, 'btn btn-mute sv-m', 'mute ' + name);
      var s = btn('S', function () { setSolo(name, !st.solo[name]); s.setAttribute('aria-pressed', st.solo[name] ? 'true' : 'false'); setCls(s, 'on', !!st.solo[name]); }, 'btn btn-solo sv-s', 'solo ' + name);
      m.setAttribute('aria-pressed', st.mute[name] ? 'true' : 'false'); setCls(m, 'on', !!st.mute[name]);
      s.setAttribute('aria-pressed', st.solo[name] ? 'true' : 'false'); setCls(s, 'on', !!st.solo[name]);
      lhs.appendChild(m); lhs.appendChild(s);
      if (!fx) {
        var letter = playLetter(sec, name), used = letter ? e.variantUsage(name, letter).length : 0;
        var chip = btn((letter || '-') + (used > 1 ? '*' : '') + ' ▾', function () { variantMenu(name, chip); }, 'sv-chip' + (used > 1 && st.scope === 'all' ? ' warn' : ''), 'variant of ' + name + ' in ' + sec.name);
        chip.setAttribute('aria-haspopup', 'menu');
        lhs.appendChild(chip);
      } else lhs.appendChild(el_('span', 'sv-dim', 'fx'));
      row.appendChild(lhs);
      // middle: the one-bar grid
      var cells = el_('div', 'sv-cells step-grid'), list = [], i;
      var ghost = !!(g && g.variant.bars < longest().bars && st.bar >= g.variant.bars);
      var hits = fx ? fxHits(name) : null;
      for (i = 0; i < STEPS; i++) {
        var cell = null, spanOnly = false;
        if (fx) {
          var h = null, j;
          for (j = 0; j < hits.length; j++) if (hits[j].step === i) { h = hits[j]; break; }
          if (h) { cell = { vel: h.hit.vel != null ? h.hit.vel : 0.85 }; spanOnly = !h.start; }
        } else if (g) cell = g.variant.cells[(st.bar % g.variant.bars) * STEPS + i] || null;
        var c = el_('div', 'sv-cell');
        var state = !cell ? 'rest' : (kind === 'melody' ? (cell.vel >= 1 ? 'acc' : 'hit') : cell.acc ? 'acc' : (cell.vel != null && cell.vel < 0.7) ? 'soft' : 'hit');
        var cls = 'sv-cell ' + state + (ghost ? ' ghost' : '') + ((fx || !g) ? ' inert' : '') + (spanOnly ? ' span' : '');
        c.className = cls;
        c.setAttribute('role', 'button');
        c.setAttribute('tabindex', '0');
        c.setAttribute('aria-pressed', cell ? 'true' : 'false');
        c.setAttribute('aria-label', name + ' step ' + (i + 1));
        c.title = fx ? (cell ? (spanOnly ? 'riser/impact continues from an earlier bar' : 'fx hit') : 'fx hits are set in the section (read-only here)') : cellTitle(cell, name);
        c.setAttribute('data-step', String(i));
        var fill = el_('span', 'sv-fill'); fill.style.height = cell ? Math.round((cell.vel != null ? cell.vel : 0.85) * 100) + '%' : '0%';
        c.appendChild(fill);
        if (cell && kind === 'melody' && cell.note != null) c.appendChild(el_('span', 'sv-nm', noteName(cell.note)));
        var mk = markOf(cell);
        if (mk) c.appendChild(el_('span', 'sv-mark', mk));
        if (!fx && g) bindCell(c, name, i);
        cells.appendChild(c); list.push(c);
      }
      cellEls[name] = list;
      row.appendChild(cells);
      // right: letters of every section, used n
      var right = el_('div', 'sv-secs');
      right.style.gridTemplateColumns = 'repeat(' + d.sections.length + ',minmax(0,1fr)) 38px';
      d.sections.forEach(function (sc, si) {
        var l = fx ? '' : playLetter(sc, name);
        var b = btn(fx ? '·' : (l || '.'), function () { st.follow = false; gotoSection(si); }, si === st.sec ? 'cur' : '', sc.name + (l ? ': ' + l : ''));
        right.appendChild(b);
      });
      var cur = playLetter(sec, name);
      right.appendChild(el_('span', 'sv-used', (!fx && cur) ? String(e.variantUsage(name, cur).length) : ''));
      row.appendChild(right);
      parent.appendChild(row);
    }

    function buildBand(parent) {
      var name = st.track, tr = name && trackDoc(name);
      var band = el_('div', 'sv-band');
      if (!tr) { band.appendChild(el_('div', 'sv-bhead', 'STEP EDITOR: select a track')); parent.appendChild(band); return; }
      band.setAttribute('data-fam', famOf(name));
      var sec = curSec(), e = ed(), g = variantFor(name), fx = isFx(name, tr), i;
      band.appendChild(el_('div', 'sv-bhead', 'STEP EDITOR: ' + name + '   ' + sec.name + ', bar ' + (st.bar + 1) + (g ? '   variant ' + g.letter + (g.variant.bars > 1 ? ' (bar ' + ((st.bar % g.variant.bars) + 1) + ' of ' + g.variant.bars + ')' : '') : '')));
      var lanes = el_('div', 'sv-lanes');
      if (fx) {
        lanes.appendChild(el_('div', 'sv-msg sv-dim', name + ' plays from the section fx list; its hits cannot be edited here yet.'));
      } else if (!g) {
        lanes.appendChild(el_('div', 'sv-msg sv-dim', name + ' has no variant in ' + sec.name + '. Choose one in the variant chip, or press + new.'));
      } else {
        if (tr.kind === 'chord') lanes.appendChild(buildProgression(name, sec));
        laneDefs(name).forEach(function (def) {
          var lane = el_('div', 'sv-lane');
          lane.setAttribute('data-lane', def.id);
          var lab = el_('div', 'sv-llab');
          lab.appendChild(el_('b', null, def.label));
          lab.appendChild(el_('span', 'sv-dim', def.sub || def.hint || ''));
          if (def.removable || def.id === 'cond') {
            var rm = btn('x', function () { removeLane(name, def.id); }, null, 'remove lane');
            rm.setAttribute('aria-label', 'remove lane');
            lab.appendChild(rm);
          }
          lane.appendChild(lab);
          var lc = el_('div', 'sv-lcells'), j;
          for (j = 0; j < STEPS; j++) {
            var cell = g.variant.cells[(st.bar % g.variant.bars) * STEPS + j] || null;
            var c = el_('div', 'sv-lcell' + (cell ? '' : ' off'));
            c.setAttribute('data-step', String(j));
            c.appendChild(el_('span', 'sv-lfill'));
            c.appendChild(el_('span', 'sv-lval', '--'));
            if (cell) { paintLane(c, def, cell); bindLane(c, def, name, j); } else { c.querySelector('.sv-lfill').style.height = '0%'; }
            lc.appendChild(c);
          }
          lane.appendChild(lc);
          lanes.appendChild(lane);
        });
      }
      // status line (fork message with undo)
      var msg = el_('div', 'sv-msg');
      if (st.msg) {
        msg.appendChild(el_('span', null, st.msg.text));
        var m = st.msg;
        msg.appendChild(btn('Undo', function () { doUndo(); }));
        msg.appendChild(btn('Apply to all ' + m.count + ' instead', function () {
          var e2 = ed(); if (e2.undo()) { host.commit(); st.msg = null; write(m.name, m.step, m.patch, 'all'); }
        }));
      } else msg.appendChild(el_('span', 'sv-dim', 'cell: click on/off | drag = level (melody: pitch) | Shift+click accent | Alt+click soft | double-click clear || lane: drag value | double-click clear | Shift fine'));
      lanes.appendChild(msg);
      band.appendChild(lanes);
      // variant panel
      var vp = el_('div', 'sv-vp');
      vp.appendChild(el_('b', null, 'VARIANT FOR THIS SECTION'));
      if (!fx) {
        var chips = el_('div', 'sv-chips');
        var cur = playLetter(sec, name);
        keys(tr.variants).sort().forEach(function (l) {
          var used = e.variantUsage(name, l).length;
          var b = btn(l + (used > 1 ? '*' : ''), function () { setVariant(name, l); }, l === cur ? 'on' : '', 'play ' + l + ' in ' + sec.name + ' (used ' + used + ')');
          b.setAttribute('aria-pressed', l === cur ? 'true' : 'false');
          chips.appendChild(b);
        });
        chips.appendChild(btn('+ new', function () { newEmpty(name); }, null, 'new empty variant for this section'));
        if (cur) chips.appendChild(btn('+ copy', function () { copyOf(name); }, null, 'copy of ' + cur + ' for this section'));
        vp.appendChild(chips);
        var users = cur ? e.variantUsage(name, cur) : [];
        var nextL = freeLetter(tr);
        vp.appendChild(el_('div', 'sv-dim', !cur ? 'No variant in this section.' :
          users.length > 1 ? cur + ' is used in ' + users.length + ' sections: ' + users.join(', ') : cur + ' is used in this section only.'));
        var gname = 'sv-scope-' + uid;
        var r1 = D.createElement('input'); r1.type = 'radio'; r1.name = gname; r1.checked = st.scope !== 'all';
        var r2 = D.createElement('input'); r2.type = 'radio'; r2.name = gname; r2.checked = st.scope === 'all';
        r1.addEventListener('change', function () { if (r1.checked) { st.scope = 'section'; refresh(); } });
        r2.addEventListener('change', function () { if (r2.checked) { st.scope = 'all'; refresh(); } });
        var l1 = el_('label'); l1.appendChild(r1); l1.appendChild(el_('span', null, 'this section only' + (users.length > 1 && nextL ? ' (forks ' + cur + ' to ' + nextL + ' on first edit)' : '')));
        var l2 = el_('label'); l2.appendChild(r2); l2.appendChild(el_('span', null, 'all ' + (users.length || 1) + ' sections'));
        vp.appendChild(el_('span', 'sv-dim', 'Edit scope:'));
        vp.appendChild(l1); vp.appendChild(l2);
        var add = btn('+ lane ▾', function () { laneMenu(name, add); }, null, 'add a lane: COND or a lock on a voice parameter');
        add.setAttribute('aria-haspopup', 'menu');
        vp.appendChild(add);
      }
      band.appendChild(vp);
      parent.appendChild(band);
    }

    // the chord progression strip (chord tracks): one slot per bar of the section's progression
    function buildProgression(name, sec) {
      var d = doc(), prog = sec.progression || d.progression || [];
      var wrap = el_('div', 'sv-prog');
      var shared = name === 'stab' ? 'pad' : name === 'pad' ? 'stab' : null;
      wrap.appendChild(el_('div', 'sv-llab', 'CHORD ' + (shared && trackDoc(shared) ? '(shared with ' + shared + ')' : '')));
      var slots = el_('div', 'sv-slots'), cur = prog.length ? st.bar % prog.length : -1;
      prog.forEach(function (ch, idx) {
        var b = btn(String(ch), function () {
          var inp = D.createElement('input'); inp.type = 'text'; inp.value = String(ch); inp.className = 'sv-slot';
          inp.setAttribute('aria-label', 'chord for bar ' + (idx + 1));
          slots.replaceChild(inp, b);
          if (inp.focus) inp.focus();
          var done = false;
          function commit(ok) {
            if (done) return; done = true;
            var v = String(inp.value || '').trim();
            if (ok && v && v !== ch) { group(function (e) { e.setProgression(sec.name, idx, v); }); }
            refresh();
          }
          inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') commit(true); else if (ev.key === 'Escape') commit(false); });
          inp.addEventListener('blur', function () { commit(true); });
        }, 'sv-slot' + (idx === cur ? ' cur' : ''), 'bar ' + (idx + 1) + ' of the progression: click to edit');
        slots.appendChild(b);
      });
      wrap.appendChild(slots);
      return wrap;
    }

    function build() {
      closeMenu();
      clear(rootEl);
      cellEls = {};
      flagsNow = trackFlags();
      var d = doc();
      lastDoc = d;
      st.sec = clamp(st.sec, 0, Math.max(0, d.sections.length - 1));
      var sec = curSec();
      if (sec) st.bar = clamp(st.bar, 0, Math.max(0, sec.bars - 1));
      if (!st.track || !trackDoc(st.track)) st.track = d.tracks.length ? (trackDoc('kick') ? 'kick' : d.tracks[0].name) : null;
      buildToolbar(rootEl);
      buildHeader(rootEl);
      orderedTracks().forEach(function (grp) {
        if (!grp.tracks.length) return;
        var gh = el_('div', 'sv-group');
        var tg = btn((st.collapsed[grp.id] ? '▸ ' : '▾ ') + grp.label + '  (' + grp.tracks.length + ')', function () { st.collapsed[grp.id] = !st.collapsed[grp.id]; refresh(); });
        tg.setAttribute('aria-expanded', st.collapsed[grp.id] ? 'false' : 'true');
        gh.appendChild(tg);
        rootEl.appendChild(gh);
        if (!st.collapsed[grp.id]) grp.tracks.forEach(function (n) { buildRow(rootEl, n); });
      });
      buildBand(rootEl);
      phCol = -1;
      lastSig = signature();
      applyPlayhead(playInfo());
      pending_ = false;
    }
    var pending_ = false;
    function refresh() {
      if (disposed) return;
      if (st.dragging) { pending_ = true; return; }
      build();
    }

    // ---------------------------------------------------------- selection
    function select(name, quiet) {
      if (!name || !trackDoc(name)) return;
      var changed = st.track !== name;
      st.track = name;
      if (changed) {
        try { if (root.Windows && root.Windows.onSelect) root.Windows.onSelect('track:' + name); } catch (e) { /* windows are optional */ }
        if (!quiet) refresh();
      }
      return changed;
    }
    function selectSection(ref) {
      var d = doc(), i;
      if (typeof ref === 'number') return gotoSection(ref);
      for (i = 0; i < d.sections.length; i++) if (d.sections[i].name === ref) return gotoSection(i);
    }

    // ---------------------------------------------------------- playhead and cheap change detection
    function playing() {
      var t = host.transport; if (!t) return false;
      return typeof t.playing === 'function' ? !!t.playing() : !!t.playing;
    }
    function playInfo() {
      var t = host.transport, p = null, d = doc();
      try { p = t && t.pos ? t.pos() : null; } catch (e) { p = null; }
      if (!p || p.step == null) return null;
      var si = -1, i;
      var sname = p.sectionName || (typeof p.section === 'string' ? p.section : (p.section && p.section.name) || null);
      if (sname) { for (i = 0; i < d.sections.length; i++) { if (d.sections[i].name === sname) si = i; } }
      else if (typeof p.section === 'number') si = p.section;
      else if (p.sectionIndex != null) si = p.sectionIndex;
      if (si < 0 && p.bar != null) { var acc = 0; for (i = 0; i < d.sections.length; i++) { if (p.bar < acc + d.sections[i].bars) { si = i; break; } acc += d.sections[i].bars; } }
      if (si < 0 || si >= d.sections.length) return null;
      var bars = d.sections[si].bars, b;
      if (p.barInSection != null) b = p.barInSection;
      else if (p.bar != null) { b = p.bar - sectionStart(si); if (b < 0 || b >= bars) b = ((p.bar % bars) + bars) % bars; }
      else b = 0;
      return { sec: si, bar: b, step: ((p.step % STEPS) + STEPS) % STEPS };
    }
    function applyPlayhead(info) {
      var col = (info && info.sec === st.sec && info.bar === st.bar) ? info.step : -1;
      if (col === phCol) return;
      var k, list;
      for (k in cellEls) if (has(cellEls, k)) {
        list = cellEls[k];
        if (phCol >= 0 && list[phCol]) setCls(list[phCol], 'ph', false);
        if (col >= 0 && list[col]) setCls(list[col], 'ph', true);
      }
      phCol = col;
    }
    // a compact signature of what the grid and band show, so edits from elsewhere (System Editor, undo) are noticed
    function signature() {
      var d = doc(), s = '', i;
      for (i = 0; i < d.tracks.length; i++) {
        var g = variantFor(d.tracks[i].name);
        s += d.tracks[i].name + ':' + (g ? g.letter + JSON.stringify(g.variant.cells.slice((st.bar % g.variant.bars) * STEPS, (st.bar % g.variant.bars) * STEPS + STEPS)) : '-') + '|';
      }
      var sec = curSec(); if (sec) s += JSON.stringify(sec.play || {}) + JSON.stringify(sec.fx || []) + JSON.stringify(sec.progression || d.progression || []);
      s += d.sections.length + '/' + d.tracks.length;
      return s;
    }

    function update() {
      if (disposed) return;
      var d = doc();
      if (d !== lastDoc) { refresh(); return; }
      var info = playInfo();
      if (st.follow && info && playing() && !st.dragging && (info.sec !== st.sec || info.bar !== st.bar)) {
        st.sec = info.sec; st.bar = info.bar; st.msg = null; refresh(); return;
      }
      applyPlayhead(info);
      if ((++frame % 10) === 0 && !st.dragging) {
        var sig = signature();
        if (sig !== lastSig) { refresh(); return; }
      }
      if (pending_ && !st.dragging) refresh();
    }

    function onDocument() { refresh(); }
    function listenHost(type, fn) { if (host.on) { host.on(type, fn); listeners.push([type, fn]); } }
    listenHost('document', onDocument);

    function dispose() {
      if (disposed) return;
      disposed = true;
      closeMenu();
      listeners.forEach(function (p) { try { if (host.off) host.off(p[0], p[1]); } catch (e) { /* ignore */ } });
      docListeners.forEach(function (p) { try { D.removeEventListener(p[0], p[1]); } catch (e) { /* ignore */ } });
      listeners = []; docListeners = [];
      if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
      cellEls = {};
    }

    // first view: the section the playhead is in, else the first
    (function init() {
      var info = playInfo();
      if (info) { st.sec = info.sec; st.bar = info.bar; }
      build();
    })();

    return {
      el: rootEl,
      update: update,
      dispose: dispose,
      select: function (name) { select(name); },
      selectSection: selectSection,
      state: st
    };
  }

  root.StepView = { mount: mount };
})();
