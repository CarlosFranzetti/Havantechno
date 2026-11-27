/* ClipView (global ClipView), Pressing Crew V2: the arrangement's sections seen as a grid of clips.
 *
 *   var view = ClipView.mount(el, host);   // el = the view area below the control bar
 *   view.update();                         // every animation frame: the playing section and the looped one
 *   view.select('bass');  view.dispose();
 *
 * Tracks down the side, the song's sections across the top (the engine's sections are the scenes). A cell shows the
 * pattern variant the track plays in that section, or that it is silent there. Choosing a cell's variant (click or
 * Enter: a menu of the track's variants and "silent"; or type the letter; Delete = silent) is one
 * host.editor().setPlay(section, track, variant|null) followed by host.commit(): one undo entry. Each section header has
 * a launch button: host.transport.jump(section) + loop(section), playing if stopped; launching the looped section again
 * ends the loop. This is not free clip launching: nothing is recorded and every track follows the same section.
 * Keys in the grid: arrows move, Home/End go to the row's ends, Enter opens the menu, letters pick a variant.
 * Design notes: docs/research/2026-11-26-pressing-crew/transcripts/log-V2.md.
 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : this;
  var doc = root.document;

  function isFn(f) { return typeof f === 'function'; }
  function has(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function safe(fn, d) { try { return fn(); } catch (e) { return d; } }
  function el(tag, cls, text, attrs) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = String(text);
    if (attrs) for (var k in attrs) if (has(attrs, k)) e.setAttribute(k, String(attrs[k]));
    return e;
  }
  function on(e, t, fn) { if (e && isFn(e.addEventListener)) e.addEventListener(t, fn); }
  function btn(cls, text, label) {
    var b = el('button', 'ap-btn' + (cls ? ' ' + cls : ''), text);
    b.type = 'button'; b.setAttribute('type', 'button');
    if (label) { b.title = label; b.setAttribute('aria-label', label); }
    return b;
  }

  var NOTE = 'The arrangement’s sections seen as a grid: each cell is the pattern variant a track plays in that section. ' +
             'Changing a cell changes the song in that section (one undo step). The launch button jumps to a section and loops it. ' +
             'This is not free clip launching: nothing is recorded, and every track follows the same section.';

  function playOf(sec, track) {
    var p = sec && sec.play ? sec.play[track] : undefined;
    if (p === true) return 'A';
    return typeof p === 'string' && p ? p : null;
  }

  function mount(container, host) {
    var S = { disposed: false, focus: null, menu: null, selected: null, playing: null, loop: null, cells: {}, heads: {} };
    var rootEl = el('section', 'cv-view', null, { role: 'region', 'aria-label': 'Clips' });
    var head = el('div', 'cv-head');
    head.appendChild(el('h2', 'cv-title', 'Clips'));
    head.appendChild(el('p', 'cv-note', NOTE, { role: 'note' }));
    var loopBtn = btn('cv-loopoff', 'Loop: off', 'End the section loop');
    loopBtn.setAttribute('aria-pressed', 'false');
    on(loopBtn, 'click', function () { safe(function () { host.transport.loop(null); }); paintPlay(true); });
    head.appendChild(loopBtn);
    var live = el('p', 'cv-live', '', { role: 'status', 'aria-live': 'polite' });
    var wrap = el('div', 'cv-scroll');
    rootEl.appendChild(head); rootEl.appendChild(wrap); rootEl.appendChild(live);
    container.appendChild(rootEl);
    function say(t) { live.textContent = t || ''; }

    function docNow() { return isFn(host.document) ? safe(function () { return host.document(); }, null) : null; }
    function families() {
      var out = {};
      if (isFn(host.tracks)) (safe(function () { return host.tracks(); }, []) || []).forEach(function (t) { out[t.name] = t.family; });
      return out;
    }
    function canEdit() { return isFn(host.editor) && isFn(host.commit) && !!safe(function () { return isFn(host.editor().setPlay); }, false); }
    function variantsOf(d, track) {
      var t = null; (d.tracks || []).forEach(function (x) { if (x.name === track) t = x; });
      return t && t.variants ? Object.keys(t.variants).sort() : [];
    }

    // ---- writes
    function setCell(section, track, variant) {
      var d = docNow(); if (!d) return false;
      var sec = null; (d.sections || []).forEach(function (s) { if (s.name === section) sec = s; });
      if (!sec) return false;
      if (playOf(sec, track) === variant) return false;              // unchanged: no undo entry
      if (!canEdit()) { say('This engine cannot edit sections (host.editor().setPlay is missing).'); return false; }
      var ok = safe(function () { return host.editor().setPlay(section, track, variant); }, false);
      if (!ok) { say('The engine refused that change.'); return false; }
      safe(function () { host.commit(); });
      say(track + ' in ' + section + ': ' + (variant ? 'variant ' + variant : 'silent'));
      return true;
    }
    function launch(section) {
      var tr = host.transport;
      if (!tr || !isFn(tr.jump) || !isFn(tr.loop)) { say('This engine has no transport to launch sections with.'); return false; }
      var looped = safe(function () { return tr.loopSection; }, null);
      if (looped === section && tr.playing) { safe(function () { tr.loop(null); }); say('Loop ended; the song plays on from ' + section + '.'); paintPlay(true); return true; }
      safe(function () { tr.jump(section); });
      safe(function () { tr.loop(section); });
      if (!tr.playing && isFn(tr.play)) safe(function () { tr.play(); });
      say('Launched ' + section + ', looping.');
      paintPlay(true);
      return true;
    }

    // ---- the menu of variants for one cell
    function closeMenu(refocus) {
      if (!S.menu) return;
      var m = S.menu; S.menu = null;
      if (m.el.parentNode) m.el.parentNode.removeChild(m.el);
      if (refocus && m.cell && isFn(m.cell.focus)) safe(function () { m.cell.focus(); });
    }
    function openMenu(cell, section, track) {
      closeMenu(false);
      var d = docNow(); if (!d) return;
      var list = variantsOf(d, track), cur = null;
      (d.sections || []).forEach(function (s) { if (s.name === section) cur = playOf(s, track); });
      var ed = isFn(host.editor) ? safe(function () { return host.editor(); }, null) : null;
      var m = el('div', 'ap-menu cv-menu', null, { role: 'menu', 'aria-label': track + ' in ' + section });
      m.appendChild(el('div', 'ap-mh', track + ' · ' + section));
      var items = [];
      function item(label, value) {
        var b = el('button', 'ap-mi', label, { role: 'menuitemradio', 'aria-checked': value === cur ? 'true' : 'false', type: 'button' });
        b.type = 'button';
        on(b, 'click', function () { closeMenu(true); setCell(section, track, value); });
        m.appendChild(b); items.push(b);
      }
      list.forEach(function (v) {
        var used = ed && isFn(ed.variantUsage) ? safe(function () { return ed.variantUsage(track, v).length; }, 0) : 0;
        item('Variant ' + v + (used ? ' · in ' + used + ' section' + (used === 1 ? '' : 's') : ' · unused'), v);
      });
      item('Silent in this section', null);
      on(m, 'keydown', function (ev) {
        var i = items.indexOf(doc.activeElement);
        if (ev.key === 'Escape') { ev.preventDefault(); if (ev.stopPropagation) ev.stopPropagation(); closeMenu(true); }
        else if (ev.key === 'ArrowDown') { ev.preventDefault(); items[(i + 1) % items.length].focus(); }
        else if (ev.key === 'ArrowUp') { ev.preventDefault(); items[(i + items.length - 1) % items.length].focus(); }
        else if (ev.key === 'Tab') { ev.preventDefault(); closeMenu(true); }
        if (ev.stopPropagation) ev.stopPropagation();
      });
      (doc.body || doc.documentElement).appendChild(m);
      var r = safe(function () { return cell.getBoundingClientRect(); }, { left: 0, bottom: 0, right: 0 });
      var vw = root.innerWidth || 1280, vh = root.innerHeight || 800, mh = 36 + items.length * 30;
      m.style.left = Math.max(4, Math.min(Math.round(r.left), vw - 230)) + 'px';
      m.style.top = Math.round(r.bottom + mh + 4 > vh ? Math.max(4, r.top - mh - 4) : r.bottom + 4) + 'px';
      S.menu = { el: m, cell: cell };
      var start = items[0]; items.forEach(function (b) { if (b.getAttribute('aria-checked') === 'true') start = b; });
      safe(function () { start.focus(); });
    }
    function outside(ev) { if (S.menu && !S.menu.el.contains(ev.target)) closeMenu(false); }
    on(doc, 'pointerdown', outside);

    // ---- the grid
    var grid = null, rows = [], cols = [];
    function cellKey(r, c) { return r + '\u0001' + c; }
    function build() {
      var d = docNow();
      var keepFocus = S.focus;
      var hadFocus = grid && grid.contains && doc.activeElement && grid.contains(doc.activeElement);
      while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
      S.cells = {}; S.heads = {};
      rows = []; cols = [];
      if (!d || !(d.tracks || []).length || !(d.sections || []).length) { wrap.appendChild(el('p', 'cv-empty', 'This song has no tracks or no sections yet.')); grid = null; return; }
      var fam = families(), editable = canEdit();
      // rows grouped by family as in the System Editor (drums, bass, keys, fx, then the rest), song order inside a group
      var FO = ['drums', 'bass', 'keys', 'fx'];
      var list = d.tracks.map(function (t, i) { var f = t.family || fam[t.name] || 'utility', k = FO.indexOf(f); return { t: t, i: i, k: k < 0 ? 9 : k }; });
      list.sort(function (a, b) { return a.k - b.k || a.i - b.i; });
      var tracksSorted = list.map(function (x) { return x.t; });
      rows = tracksSorted.map(function (t) { return t.name; });
      cols = d.sections.map(function (s) { return s.name; });
      grid = el('div', 'cv-grid', null, { role: 'grid', 'aria-label': 'Variant played by each track in each section', 'aria-rowcount': String(rows.length + 1), 'aria-colcount': String(cols.length + 1) });
      grid.style.gridTemplateColumns = 'minmax(120px, 160px) repeat(' + cols.length + ', minmax(72px, 1fr))';
      var hr = el('div', 'cv-row cv-hrow', null, { role: 'row' });
      hr.appendChild(el('div', 'cv-corner', 'Track \\ Section', { role: 'columnheader' }));
      var bar = 0;
      d.sections.forEach(function (s) {
        var h = el('div', 'cv-sh', null, { role: 'columnheader', 'data-section': s.name });
        var lb = btn('cv-launch', '▶', 'Launch ' + s.name + ': jump there and loop it');
        on(lb, 'click', function () { launch(s.name); });
        var nm = el('span', 'cv-sn', s.name);
        nm.title = s.name + ' · bars ' + (bar + 1) + '–' + (bar + (s.bars || 0));
        h.appendChild(lb); h.appendChild(nm); h.appendChild(el('span', 'cv-sb', (s.bars || 0) + ' bars'));
        bar += s.bars || 0;
        hr.appendChild(h);
        S.heads[s.name] = h;
      });
      grid.appendChild(hr);
      tracksSorted.forEach(function (t, ri) {
        var row = el('div', 'cv-row', null, { role: 'row', 'data-fam': t.family || fam[t.name] || 'utility' });
        var th = el('div', 'cv-th', null, { role: 'rowheader' });
        th.appendChild(el('span', 'cv-rail', null, { 'aria-hidden': 'true' }));
        th.appendChild(el('span', 'cv-tn', t.name));
        row.appendChild(th);
        var vs = t.variants ? Object.keys(t.variants).length : 0;
        d.sections.forEach(function (s, ci) {
          var v = playOf(s, t.name);
          var c = el('button', 'cv-cell', v || '·', { role: 'gridcell', type: 'button', tabindex: '-1', 'data-section': s.name, 'data-track': t.name, 'data-empty': v ? 'false' : 'true',
            'aria-label': t.name + ' in ' + s.name + ': ' + (v ? 'variant ' + v : 'silent') + (editable ? '. Enter to change; ' + vs + ' variant' + (vs === 1 ? '' : 's') : '') });
          c.type = 'button';
          if (!editable) c.setAttribute('aria-disabled', 'true');
          on(c, 'click', function () { S.focus = cellKey(ri, ci); roving(c); if (editable) openMenu(c, s.name, t.name); else say('This engine cannot edit sections.'); });
          on(c, 'focus', function () { S.focus = cellKey(ri, ci); roving(c); });
          on(c, 'keydown', function (ev) { cellKey_(ev, ri, ci, c, s.name, t.name); });
          row.appendChild(c);
          S.cells[cellKey(ri, ci)] = c;
        });
        grid.appendChild(row);
      });
      wrap.appendChild(grid);
      var first = S.cells[keepFocus] || S.cells[cellKey(0, 0)];
      if (first) { first.setAttribute('tabindex', '0'); if (hadFocus) safe(function () { first.focus(); }); }
      if (S.selected) mark(S.selected);
      paintPlay(true);
    }
    function roving(c) {
      for (var k in S.cells) if (has(S.cells, k)) { var x = S.cells[k]; var ti = x === c ? '0' : '-1'; if (x.getAttribute('tabindex') !== ti) x.setAttribute('tabindex', ti); }
    }
    function move(ri, ci) {
      ri = Math.max(0, Math.min(rows.length - 1, ri)); ci = Math.max(0, Math.min(cols.length - 1, ci));
      var c = S.cells[cellKey(ri, ci)]; if (c) { roving(c); safe(function () { c.focus(); }); }
    }
    function cellKey_(ev, ri, ci, c, section, track) {
      var k = ev.key, handled = true;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (k === 'ArrowRight') move(ri, ci + 1);
      else if (k === 'ArrowLeft') move(ri, ci - 1);
      else if (k === 'ArrowDown') move(ri + 1, ci);
      else if (k === 'ArrowUp') move(ri - 1, ci);
      else if (k === 'Home') move(ri, 0);
      else if (k === 'End') move(ri, cols.length - 1);
      else if (k === 'Enter') { if (canEdit()) openMenu(c, section, track); }
      else if (k === 'Delete' || k === 'Backspace') setCell(section, track, null);
      else if (/^[a-z]$/i.test(k) && !ev.shiftKey) {
        var L = k.toUpperCase(), d = docNow();
        if (d && variantsOf(d, track).indexOf(L) >= 0) setCell(section, track, L);
        else { say(track + ' has no variant ' + L + '.'); }
      } else handled = false;
      if (handled) { ev.preventDefault(); if (ev.stopPropagation) ev.stopPropagation(); }
    }

    function mark(name) {
      if (!grid) return;
      for (var k in S.cells) if (has(S.cells, k)) { var c = S.cells[k]; var sel = c.getAttribute('data-track') === name ? 'true' : 'false'; if (c.getAttribute('data-selected') !== sel) c.setAttribute('data-selected', sel); }
    }

    // ---- the playing section and the loop
    function paintPlay(force) {
      var p = host.transport && isFn(host.transport.pos) ? safe(function () { return host.transport.pos(); }, null) : null;
      var playing = p ? (p.sectionName || null) : null;
      var loop = host.transport ? safe(function () { return host.transport.loopSection; }, null) : null;
      if (loop === undefined && p) loop = p.loop || null;
      var isPlaying = !!(host.transport && host.transport.playing);
      if (!force && playing === S.playing && loop === S.loop && isPlaying === S.isPlaying) return;
      S.playing = playing; S.loop = loop; S.isPlaying = isPlaying;
      for (var n in S.heads) if (has(S.heads, n)) {
        var h = S.heads[n];
        h.setAttribute('data-playing', n === playing ? (isPlaying ? 'true' : 'cue') : 'false');
        h.setAttribute('data-loop', n === loop ? 'true' : 'false');
        var lb = h.firstChild;
        if (lb) { var pressed = n === loop ? 'true' : 'false'; lb.setAttribute('aria-pressed', pressed); lb.title = n === loop ? 'Looping ' + n + ': click to end the loop' : 'Launch ' + n + ': jump there and loop it'; lb.setAttribute('aria-label', lb.title); }
      }
      for (var k in S.cells) if (has(S.cells, k)) {
        var c = S.cells[k], pl = c.getAttribute('data-section') === playing ? (isPlaying ? 'true' : 'cue') : 'false';
        if (c.getAttribute('data-playing') !== pl) c.setAttribute('data-playing', pl);
      }
      loopBtn.textContent = loop ? 'Loop: ' + loop + ' (end)' : 'Loop: off';
      loopBtn.setAttribute('aria-pressed', loop ? 'true' : 'false');
      if (loop) loopBtn.removeAttribute('aria-disabled'); else loopBtn.setAttribute('aria-disabled', 'true');
    }

    function onDocument() { if (!S.disposed) build(); }
    build();
    if (isFn(host.on)) host.on('document', onDocument);
    return {
      el: rootEl,
      update: function () { if (!S.disposed) paintPlay(false); },
      select: function (name) { S.selected = name; mark(name); },
      launch: launch,
      setCell: setCell,
      cell: function (track, section) { var ri = rows.indexOf(track), ci = cols.indexOf(section); return S.cells[cellKey(ri, ci)] || null; },
      dispose: function () {
        S.disposed = true;
        closeMenu(false);
        if (isFn(doc.removeEventListener)) doc.removeEventListener('pointerdown', outside);
        if (isFn(host.off)) safe(function () { host.off('document', onDocument); });
        if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
      }
    };
  }

  root.ClipView = { mount: mount, NOTE: NOTE };
})();
