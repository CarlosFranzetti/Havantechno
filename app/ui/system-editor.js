/* Havantechno app - ui/system-editor.js
 * Global `SystemEditor`: the voted "Strip Bench" layout (REPORT.md section 3, amended).
 *
 *   var view = SystemEditor.mount(el, host);   // el = the area below the control bar (app.js owns the bar and view switch)
 *   view.update();                             // called every animation frame: playhead, meters, step rows, open faces
 *   view.select('bass');                       // selected track -> rebuilds the device row
 *   view.dispose();
 *
 * Bands, top to bottom: overview strip, proportional section ruler (loop brace, playhead), thirteen compact rows under
 * four collapsible stem-group headers, then one device row for the selected track (PATTERN, instrument, inserts,
 * sidechain, channel) with RETURNS and MASTER chips pinned at the right.
 *
 * Reads: host.document(), host.devices(), host.transport.pos(), host.meter(id).
 * Writes: host.editor().setStepInSection / setPlay + host.commit(); host.setParam for mute; host.transport.jump / loop.
 * The DOM is rebuilt only on the host's 'document' event; update() only touches text, classes and styles that changed.
 * Everything optional (Widgets, Faces, Windows, host.mute, host.solo) is used defensively.
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var doc = root.document;

  var GROUPS = [
    { id: 'drums', label: 'DRUMS', tracks: ['kick', 'clap', 'hat_closed', 'hat_open', 'shaker', 'perc'] },
    { id: 'bass', label: 'BASS', tracks: ['sub', 'bass'] },
    { id: 'other', label: 'OTHER', tracks: ['stab', 'lead', 'pad'] },
    { id: 'fx', label: 'FX', tracks: ['riser', 'impact'] }
  ];
  var FAMILY = { kick: 'drums', clap: 'drums', hat_closed: 'drums', hat_open: 'drums', shaker: 'drums', perc: 'drums',
                 sub: 'bass', bass: 'bass', stab: 'keys', lead: 'keys', pad: 'keys', riser: 'fx', impact: 'fx' };
  var STEPS = 16;
  var DEFAULT_VEL = 0.85;

  // ------------------------------------------------------------------ small helpers
  function isFn(f) { return typeof f === 'function'; }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function make(tag, cls, text) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = String(text);
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function attr(e, k, v) { try { e.setAttribute(k, String(v)); } catch (x) { /* ignore */ } }
  function on(e, type, fn) { if (e && e.addEventListener) e.addEventListener(type, fn); }
  function safe(fn, dflt) { try { return fn(); } catch (e) { return dflt; } }
  function pct(x) { return (Math.round(x * 10000) / 100) + '%'; }
  function toggleClass(e, cls, on_) {
    if (e.classList && isFn(e.classList.toggle)) { e.classList.toggle(cls, !!on_); return; }
    var parts = String(e.className || '').split(/\s+/).filter(Boolean), i = parts.indexOf(cls);
    if (on_ && i < 0) parts.push(cls); else if (!on_ && i >= 0) parts.splice(i, 1);
    e.className = parts.join(' ');
  }

  var CSS = [
    '.se{--se-left:520px;display:block;box-sizing:border-box;width:100%;height:100%;overflow:auto;background:var(--bg,#0e0f12);color:var(--fg,#e6e8ec);font:12px/1.3 system-ui,sans-serif;padding:0 0 8px}',
    '.se *{box-sizing:border-box}',
    '.se-inner{min-width:880px;display:flex;flex-direction:column;gap:2px}',
    '.se-band{display:grid;grid-template-columns:var(--se-left) minmax(0,1fr);align-items:stretch}',
    '.se-bandl{display:flex;align-items:center;gap:6px;padding:0 8px;color:var(--dim,#8a8f99);font-size:10px;letter-spacing:.08em;min-height:20px}',
    '.se-area{position:relative;display:grid;min-height:20px}',
    '.se-ov{background:var(--panel,#16181d);border-bottom:1px solid var(--line,#262a32)}',
    '.se-ov .se-area{cursor:pointer;height:18px;align-self:center;margin:2px 0}',
    '.se-seg{border-left:1px solid var(--line,#262a32);background:var(--panel-raised,#1d2027);min-width:0}',
    '.se-seg.now{background:var(--line,#262a32)}',
    '.se-win{position:absolute;top:0;bottom:0;border:1px solid var(--fg,#e6e8ec);pointer-events:none}',
    '.se-ph{position:absolute;top:0;bottom:0;width:0;border-left:1px solid var(--on,#e6e8ec);pointer-events:none;z-index:3}',
    '.se-ruler{background:var(--panel,#16181d);border-bottom:1px solid var(--line,#262a32)}',
    '.se-ruler .se-area{height:34px}',
    '.se-blk{position:relative;min-width:0;border-left:1px solid var(--line,#262a32);padding:14px 3px 0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:pointer;background:transparent;color:var(--fg,#e6e8ec);text-align:left;font:inherit;font-size:11px;border-top:0;border-right:0;border-bottom:0}',
    '.se-blk:hover{background:var(--panel-raised,#1d2027)}',
    '.se-blk.now{background:var(--panel-raised,#1d2027)}',
    '.se-blk small{color:var(--dim,#8a8f99);margin-left:4px}',
    '.se-brace{position:absolute;top:2px;height:8px;border:2px solid var(--on,#e6e8ec);border-bottom:0;pointer-events:none;z-index:2;display:none}',
    '.se-btn{min-width:24px;height:24px;padding:0 6px;border:1px solid var(--line,#262a32);border-radius:3px;background:var(--panel-raised,#1d2027);color:var(--fg,#e6e8ec);font:inherit;font-size:11px;cursor:pointer}',
    '.se-btn[aria-pressed="true"]{background:var(--on,#e6e8ec);color:var(--bg,#0e0f12)}',
    '.se-btn.solo[aria-pressed="true"]{background:var(--solo,#e6c84a);color:var(--bg,#0e0f12)}',
    '.se-btn.mute[aria-pressed="true"]{background:var(--dim,#8a8f99);color:var(--bg,#0e0f12)}',
    '.se-body{position:relative;display:flex;flex-direction:column;gap:1px}',
    '.se-phwrap{position:absolute;top:0;bottom:0;left:var(--se-left);right:0;pointer-events:none;z-index:3}',
    '.se-ghead{display:grid;grid-template-columns:var(--se-left) minmax(0,1fr);background:var(--panel,#16181d);border-top:1px solid var(--line,#262a32)}',
    '.se-gtoggle{display:flex;align-items:center;gap:6px;height:22px;padding:0 8px;border:0;background:transparent;color:var(--dim,#8a8f99);font:inherit;font-size:10px;letter-spacing:.1em;cursor:pointer;text-align:left}',
    '.se-gstem{display:flex;align-items:center;padding:0 8px;color:var(--dim,#8a8f99);font-size:10px;opacity:.6;border-left:1px dashed var(--line,#262a32)}',
    '.se-row{display:grid;grid-template-columns:var(--se-left) minmax(0,1fr);height:26px;background:var(--panel,#16181d);cursor:pointer}',
    '.se-row.sel{background:var(--panel-raised,#1d2027);outline:1px solid var(--fam-ink,var(--fg,#e6e8ec));outline-offset:-1px}',
    '.se-row.idle .se-l .se-steps{opacity:.35}',
    '.se-row[hidden]{display:none}',
    '.se-l{display:grid;grid-template-columns:4px 28px 84px 24px 24px 56px minmax(0,1fr);align-items:center;gap:4px;min-width:0}',
    '.se-rail{align-self:stretch;background:var(--fam-ink,#888)}',
    '.se-chip{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:22px;color:var(--fam-ink,var(--fg,#e6e8ec));font-size:11px;overflow:hidden}',
    '.se-name{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
    '.se-meter{position:relative;height:6px;background:var(--line,#262a32);overflow:hidden}',
    '.se-meter i{position:absolute;left:0;top:0;bottom:0;width:0;background:var(--fam-ink,var(--on,#e6e8ec))}',
    '.se-steps{min-width:0;display:flex;align-items:center}',
    '.se-steps>*{flex:1 1 auto;min-width:0}',
    '.se-sc{display:grid;min-width:0}',
    '.se-cell{position:relative;min-width:0;border-left:1px solid var(--line,#262a32);display:flex;align-items:center;justify-content:center;color:var(--fam-ink,var(--fg,#e6e8ec));font-size:11px;font-weight:600}',
    '.se-cell.none{color:var(--dim,#8a8f99);font-weight:400;opacity:.5}',
    '.se-cell.now{background:var(--line,#262a32)}',
    '.se-cell.ramp::after{content:"~";position:absolute;right:2px;top:0;color:var(--dim,#8a8f99);font-size:10px}',
    '.se-devrow{display:flex;align-items:stretch;gap:6px;margin-top:4px;padding:6px 8px;background:var(--panel,#16181d);border-top:1px solid var(--line,#262a32);overflow-x:auto;min-height:150px}',
    '.se-chain{display:flex;align-items:stretch;gap:6px;flex:1 1 auto;min-width:0;overflow-x:auto}',
    '.se-dev{display:flex;flex-direction:column;flex:0 0 auto;border:1px solid var(--line,#262a32);border-radius:4px;background:var(--panel-raised,#1d2027);min-width:0}',
    '.se-dev[data-fam]{border-top:3px solid var(--fam-ink,var(--line,#262a32))}',
    '.se-dtitle{display:flex;align-items:center;gap:6px;height:22px;padding:0 8px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim,#8a8f99);cursor:default;user-select:none}',
    '.se-dbody{padding:4px 6px 6px}',
    '.se-pin{display:flex;align-items:stretch;gap:6px;flex:0 0 auto;padding-left:8px;border-left:1px solid var(--line,#262a32)}',
    '.se-pgroup{display:flex;flex-direction:column;gap:4px;min-width:0}',
    '.se-pchips{display:flex;flex-wrap:wrap;gap:4px}',
    '.se-pchip{display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 8px;border:1px solid var(--line,#262a32);border-radius:3px;background:var(--panel-raised,#1d2027);color:var(--fam-ink,var(--fg,#e6e8ec));font:inherit;font-size:11px;cursor:pointer}',
    '.se-pchip[aria-pressed="true"]{outline:1px solid var(--fam-ink,var(--fg,#e6e8ec))}',
    '.se-popen{display:flex;flex-direction:column;gap:4px}',
    '.se-vars{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}',
    '.se-prog{display:flex;gap:4px;margin-top:6px;flex-wrap:wrap}',
    '.se-prog span{padding:2px 6px;border:1px solid var(--line,#262a32);border-radius:3px;color:var(--dim,#8a8f99)}',
    '.se-prog span.now{color:var(--fg,#e6e8ec);border-color:var(--fam-ink,var(--fg,#e6e8ec))}',
    '.se-roll{display:grid;grid-template-columns:repeat(16,1fr);gap:1px;height:48px;min-width:240px;margin-top:6px}',
    '.se-roll>div{position:relative;background:var(--panel,#16181d)}',
    '.se-roll>div>i{position:absolute;left:0;right:0;height:4px;background:var(--fam-ink,var(--on,#e6e8ec))}',
    '.se-empty{color:var(--dim,#8a8f99);padding:6px}',
    '.se-fallback-steps{display:grid;grid-template-columns:repeat(16,minmax(10px,1fr));gap:2px;width:100%}',
    '.se-fallback-steps button{height:20px;min-width:10px;padding:0;border:1px solid var(--line,#262a32);background:var(--panel,#16181d);cursor:pointer}',
    '.se-fallback-steps button.on{background:var(--fam-ink,var(--on,#e6e8ec))}'
  ].join('\n');

  function injectStyle() {
    try {
      if (!doc || !doc.head || !doc.getElementById) return;
      if (doc.getElementById('se-style')) return;
      var s = doc.createElement('style');
      s.id = 'se-style';
      s.textContent = CSS;
      doc.head.appendChild(s);
    } catch (e) { /* styling is optional in non-browser checks */ }
  }

  // ------------------------------------------------------------------ document helpers
  function sectionStarts(secs) {
    var out = [], bar = 0, i;
    for (i = 0; i < secs.length; i++) { out.push(bar); bar += secs[i].bars | 0; }
    return { starts: out, total: bar };
  }
  function findTrack(d, name) {
    for (var i = 0; i < d.tracks.length; i++) if (d.tracks[i].name === name) return d.tracks[i];
    return null;
  }
  function variantName(sec, name) {
    var p = sec && sec.play && sec.play[name];
    if (p === true) return 'A';
    return p || null;
  }
  function famOf(name) { return FAMILY[name] || 'keys'; }
  function groupsFor(d) {
    // the four fixed groups, filtered to tracks the document has; any extra track lands in OTHER
    var known = {}, out = [], g, i, j, tn;
    for (i = 0; i < GROUPS.length; i++) {
      g = { id: GROUPS[i].id, label: GROUPS[i].label, tracks: [] };
      for (j = 0; j < GROUPS[i].tracks.length; j++) {
        tn = GROUPS[i].tracks[j];
        if (findTrack(d, tn)) { g.tracks.push(tn); known[tn] = true; }
      }
      out.push(g);
    }
    for (i = 0; i < d.tracks.length; i++) if (!known[d.tracks[i].name]) out[2].tracks.push(d.tracks[i].name);
    return out;
  }

  // ------------------------------------------------------------------ mount
  function mount(el, host) {
    injectStyle();
    var disposed = false;
    var S = {
      sel: null, collapsed: {}, openChips: {}, loopName: null,
      muted: {}, soloed: {},
      rows: {}, rowOrder: [], cells: [], secCount: 0,
      starts: [], total: 0, curSec: -1, lastPh: '', lastBodyPh: '',
      ovSegs: [], ovWin: null, ovPh: null, ruPh: null, bodyPh: null, blocks: [], brace: null, loopBtn: null,
      dev: null, devices: [], docRev: 0, drag: null
    };

    var rootEl = make('div', 'se');
    var inner = make('div', 'se-inner');
    rootEl.appendChild(inner);
    el.appendChild(rootEl);

    // ---------------------------------------------------------------- host access
    function document_() { return host.document(); }
    function pos_() { return safe(function () { return host.transport.pos(); }, null) || { step: 0, bar: 0, section: 0, barInSection: 0 }; }
    function isPlaying() {
      var p = host.transport && host.transport.playing;
      return isFn(p) ? !!safe(p, false) : !!p;
    }
    function curIndex(p, secs) {
      var i = p && p.section;
      if (typeof i === 'number' && i >= 0 && i < secs.length) return i;
      if (p && p.sectionName) for (var k = 0; k < secs.length; k++) if (secs[k].name === p.sectionName) return k;
      return 0;
    }
    function barInSec(p, si) {
      if (p && typeof p.barInSection === 'number') return p.barInSection;
      return Math.max(0, ((p && p.bar) || 0) - (S.starts[si] || 0));
    }
    // cheap signature of what viewOf would return, so update() builds cell arrays only when something changed
    function viewSig(d, name, si, p) {
      var vn = variantName(d.sections[si], name), tr = findTrack(d, name), v = tr && vn ? tr.variants[vn] : null;
      if (!v) return si + ':' + vn + ':none';
      return si + ':' + vn + ':' + (barInSec(p, si) % Math.max(1, v.bars)) + ':' + S.docRev;
    }
    // cells (16) of the track's variant for the bar of the current section; null variant when the section does not play it
    function viewOf(d, name, si, p) {
      var sec = d.sections[si], tr = findTrack(d, name), vn = variantName(sec, name), v = tr && vn ? tr.variants[vn] : null, cells = [], i;
      if (!v) { for (i = 0; i < STEPS; i++) cells.push(null); return { variant: vn, v: null, bar: 0, cells: cells, sig: si + ':' + vn + ':none' }; }
      var bar = barInSec(p, si) % Math.max(1, v.bars);
      for (i = 0; i < STEPS; i++) cells.push(v.cells[bar * STEPS + i] || null);
      return { variant: vn, v: v, bar: bar, cells: cells, sig: si + ':' + vn + ':' + bar + ':' + S.docRev };
    }

    // ---------------------------------------------------------------- edits
    function editStep(name, i, patchFn) {
      var d = document_(), p = pos_(), si = curIndex(p, d.sections), vw = viewOf(d, name, si, p);
      if (!vw.v) return;
      var cell = vw.cells[i], patch = patchFn(cell);
      var ed = host.editor();
      if (!ed) return;
      ed.setStepInSection(d.sections[si].name, name, vw.bar * STEPS + i, patch);
      host.commit();
    }
    function toggleStep(name, i) {
      editStep(name, i, function (cell) { return cell ? null : { vel: DEFAULT_VEL }; });
    }
    // A velocity drag is previewed locally (the step widget redraws, the document is untouched) and committed once at the
    // end, inside ed.group, so one gesture is one undo entry and one 'document' event. The gesture's section and bar are
    // fixed when it starts. The end signal is the widget's phase argument ('start' | 'move' | 'end') when it passes one,
    // else a pointerup / pointercancel on the widget element. A keyboard edit (no pointer down, no phase) commits at once.
    function dragStep(name, i, vel, phase, w) {
      var v = Math.max(0.05, Math.min(1, +vel || DEFAULT_VEL));
      var g = S.drag;
      if (g && (g.name !== name || g.i !== i)) endDrag(true);     // a stale gesture on another step: finish it first
      if (phase === 'end') {
        if (S.drag) { S.drag.vel = v; endDrag(true); } else commitVel(name, i, v, null);
        return;
      }
      var pointer = phase === 'start' || phase === 'move' || (w && w.down);
      if (!pointer) { commitVel(name, i, v, null); return; }
      if (!S.drag) {
        var d = document_(), p = pos_(), si = curIndex(p, d.sections), vw = viewOf(d, name, si, p);
        if (!vw.v) return;
        S.drag = { name: name, i: i, vel: v, sec: d.sections[si].name, bar: vw.bar, cells: vw.cells.slice(), widget: w || null };
      }
      S.drag.vel = v;
      var base = S.drag.cells[i], pv = S.drag.cells.slice(), k;
      pv[i] = {}; if (base) for (k in base) if (has(base, k)) pv[i][k] = base[k];
      pv[i].vel = v;
      if (S.drag.widget && isFn(S.drag.widget.set)) S.drag.widget.set(pv);
      var row = S.rows[name]; if (row && row.steps !== S.drag.widget && row.steps && isFn(row.steps.set)) row.steps.set(pv);
      if (S.dev && S.dev.pat && S.dev.pat.name === name && S.dev.pat.steps && S.dev.pat.steps !== S.drag.widget) S.dev.pat.steps.set(pv);
    }
    function endDrag(commit) {
      var g = S.drag; S.drag = null;
      if (!g) return;
      if (commit) commitVel(g.name, g.i, g.vel, g);
      else { var row = S.rows[g.name]; if (row) row.sig = ''; if (S.dev && S.dev.pat) S.dev.pat.sig = ''; }
    }
    function commitVel(name, i, v, g) {
      var d = document_(), p = pos_(), si = curIndex(p, d.sections), secName = g ? g.sec : d.sections[si].name, bar = g ? g.bar : null;
      if (bar == null) { var vw = viewOf(d, name, si, p); if (!vw.v) return; bar = vw.bar; }
      var ed = host.editor();
      if (!ed) return;
      var run = function (e) { return e.setStepInSection(secName, name, bar * STEPS + i, { vel: v }); };
      if (isFn(ed.group)) ed.group(run); else run(ed);
      host.commit();
    }
    function setPlay(name, letter) {
      var d = document_(), p = pos_(), si = curIndex(p, d.sections), ed = host.editor();
      if (!ed) return;
      ed.setPlay(d.sections[si].name, name, letter);
      host.commit();
    }

    // step widget with a plain-button fallback when Widgets.steps is missing
    function stepsWidget(name, ink) {
      var api = { el: null, set: null };
      if (root.Widgets && isFn(root.Widgets.steps)) {
        var tracker = { down: false }, wref = { w: null };
        var w = safe(function () {
          return root.Widgets.steps({ count: STEPS, cells: [], ink: ink,
            onToggle: function (i) { toggleStep(name, i); },
            onDrag: function (i, vel, phase) { dragStep(name, i, vel, phase, wref.w); } });
        }, null);
        if (w && w.el) {
          wref.w = tracker; tracker.set = w.set;
          // pointer state for widgets that give no phase: down on pointerdown, the gesture ends on pointerup / cancel
          on(w.el, 'pointerdown', function () { tracker.down = true; });
          var up = function () { tracker.down = false; if (S.drag && S.drag.widget === tracker) endDrag(true); };
          on(w.el, 'pointerup', up); on(w.el, 'pointercancel', up);
          return w;
        }
      }
      var wrap = make('div', 'se-fallback-steps'), btns = [], i;
      for (i = 0; i < STEPS; i++) (function (k) {
        var b = make('button'); attr(b, 'aria-label', 'step ' + (k + 1));
        on(b, 'click', function (e) { if (e && e.stopPropagation) e.stopPropagation(); toggleStep(name, k); });
        btns.push(b); wrap.appendChild(b);
      })(i);
      api.el = wrap;
      api.set = function (cells) { for (var k = 0; k < STEPS; k++) toggleClass(btns[k], 'on', !!(cells && cells[k])); };
      return api;
    }

    // ---------------------------------------------------------------- mute / solo (defensive: host.mute / host.solo may be missing)
    function applyEmulatedMutes() {
      var any = false, n;
      for (n in S.soloed) if (has(S.soloed, n) && S.soloed[n]) any = true;
      for (var i = 0; i < S.rowOrder.length; i++) {
        n = S.rowOrder[i];
        safe(function () { host.setParam(n + '.mute', (S.muted[n] || (any && !S.soloed[n])) ? 1 : 0); });
      }
    }
    function doMute(name) {
      S.muted[name] = !S.muted[name];
      if (isFn(host.mute)) safe(function () { host.mute(name, S.muted[name]); });
      else applyEmulatedMutes();
      syncMS();
    }
    function doSolo(name) {
      S.soloed[name] = !S.soloed[name];
      if (isFn(host.solo)) safe(function () { host.solo(name, S.soloed[name]); });
      else applyEmulatedMutes();
      syncMS();
    }
    function syncMS() {
      for (var n in S.rows) if (has(S.rows, n)) {
        attr(S.rows[n].mBtn, 'aria-pressed', !!S.muted[n]);
        attr(S.rows[n].sBtn, 'aria-pressed', !!S.soloed[n]);
      }
    }

    // ---------------------------------------------------------------- build: overview, ruler, rows
    function glyphChip(name) {
      var holder = make('span', 'se-chip'), dev = safe(function () { return host.device('track:' + name); }, null), f = null;
      if (dev && root.Faces && isFn(root.Faces.render)) f = safe(function () { return root.Faces.render(dev, 'chip', host); }, null);
      if (f && f.el) { holder.appendChild(f.el); return { el: holder, face: f }; }
      holder.textContent = name.charAt(0).toUpperCase();
      return { el: holder, face: null };
    }
    function meterWidget() {
      if (root.Widgets && isFn(root.Widgets.meter)) {
        var w = safe(function () { return root.Widgets.meter({ orientation: 'h', size: 'chip' }); }, null);
        if (w && w.el && isFn(w.set)) return { el: w.el, set: function (v) { w.set(v); } };
      }
      var box = make('div', 'se-meter'), fill = make('i');
      box.appendChild(fill);
      return { el: box, set: function (v) { fill.style.width = pct(Math.max(0, Math.min(1, v || 0))); } };
    }
    function areaCols(secs) {
      var cols = [];
      for (var i = 0; i < secs.length; i++) cols.push('minmax(0,' + Math.max(1, secs[i].bars | 0) + 'fr)');
      return cols.join(' ');
    }
    function secRamps(sec, trackName) {
      var out = [], r = sec.ramp || [];
      for (var i = 0; i < r.length; i++) if (r[i].param && (trackName == null ? r[i].param.indexOf('.') < 0 || !findTrack(S.doc, r[i].param.split('.')[0]) : r[i].param.split('.')[0] === trackName)) out.push(r[i].param);
      return out;
    }

    function jumpTo(ref) { safe(function () { host.transport.jump(ref); }); }
    function loopTo(ref) { safe(function () { host.transport.loop(ref); }); }

    function buildOverview(d) {
      var band = make('div', 'se-band se-ov'), l = make('div', 'se-bandl', 'OVERVIEW'), area = make('div', 'se-area');
      area.style.gridTemplateColumns = areaCols(d.sections);
      S.ovSegs = [];
      d.sections.forEach(function (sec, i) {
        var seg = make('div', 'se-seg'); attr(seg, 'title', sec.name + ' ' + sec.bars + ' bars');
        area.appendChild(seg); S.ovSegs.push(seg);
      });
      S.ovWin = make('div', 'se-win'); area.appendChild(S.ovWin);
      S.ovPh = make('div', 'se-ph'); area.appendChild(S.ovPh);
      on(area, 'click', function (e) {
        var r = area.getBoundingClientRect ? area.getBoundingClientRect() : null;
        if (!r || !r.width || !e) return;
        var bar = ((e.clientX - r.left) / r.width) * S.total, i;
        for (i = S.starts.length - 1; i >= 0; i--) if (bar >= S.starts[i]) break;
        if (i >= 0) jumpTo(d.sections[i].name);
      });
      band.appendChild(l); band.appendChild(area);
      return band;
    }
    function buildRuler(d) {
      var band = make('div', 'se-band se-ruler'), l = make('div', 'se-bandl'), area = make('div', 'se-area');
      var lb = make('button', 'se-btn', 'Loop'); attr(lb, 'aria-pressed', !!S.loopName); attr(lb, 'aria-label', 'Loop the current section');
      on(lb, 'click', function () {
        var dd = document_(), si = curIndex(pos_(), dd.sections);
        S.loopName = S.loopName ? null : dd.sections[si].name;
        loopTo(S.loopName);
        syncLoop();
      });
      S.loopBtn = lb;
      l.appendChild(make('span', null, 'SECTIONS')); l.appendChild(lb);
      area.style.gridTemplateColumns = areaCols(d.sections);
      S.blocks = [];
      d.sections.forEach(function (sec, i) {
        var ramps = secRamps(sec, null);
        var b = make('button', 'se-blk'); attr(b, 'type', 'button');
        b.appendChild(doc.createTextNode(sec.name + (ramps.length ? ' ~' : '')));
        b.appendChild(make('small', null, String(sec.bars)));
        attr(b, 'title', sec.name + ', ' + sec.bars + ' bars, from bar ' + (S.starts[i] + 1) + (ramps.length ? ', ramps: ' + ramps.join(', ') : '') + '. Click to jump, double-click to loop.');
        on(b, 'click', function () { jumpTo(sec.name); });
        on(b, 'dblclick', function () { S.loopName = (S.loopName === sec.name) ? null : sec.name; loopTo(S.loopName); syncLoop(); });
        area.appendChild(b); S.blocks.push(b);
      });
      S.brace = make('div', 'se-brace'); area.appendChild(S.brace);
      S.ruPh = make('div', 'se-ph'); area.appendChild(S.ruPh);
      band.appendChild(l); band.appendChild(area);
      return band;
    }
    function syncLoop() {
      if (S.loopBtn) attr(S.loopBtn, 'aria-pressed', !!S.loopName);
      if (!S.brace) return;
      var i = -1, d = S.doc;
      if (S.loopName) for (var k = 0; k < d.sections.length; k++) if (d.sections[k].name === S.loopName) i = k;
      if (i < 0 || !S.total) { S.brace.style.display = 'none'; return; }
      S.brace.style.display = 'block';
      S.brace.style.left = pct(S.starts[i] / S.total);
      S.brace.style.width = pct((d.sections[i].bars | 0) / S.total);
    }

    function buildRow(d, name) {
      var fam = (S.devices.filter(function (x) { return x.id === 'track:' + name; })[0] || {}).family || famOf(name);
      var row = make('div', 'se-row'); attr(row, 'data-fam', fam); attr(row, 'data-track', name); attr(row, 'tabindex', 0);
      attr(row, 'role', 'button'); attr(row, 'aria-label', 'Select track ' + name);
      var l = make('div', 'se-l');
      l.appendChild(make('div', 'se-rail'));
      var chip = glyphChip(name); l.appendChild(chip.el);
      if (chip.face) chip.el.style.gridColumn = 'span 2';   // the face chip already shows glyph + name
      else l.appendChild(make('span', 'se-name', name));
      var mBtn = make('button', 'se-btn mute', 'M'), sBtn = make('button', 'se-btn solo', 'S');
      attr(mBtn, 'aria-label', 'Mute ' + name); attr(sBtn, 'aria-label', 'Solo ' + name);
      attr(mBtn, 'aria-pressed', !!S.muted[name]); attr(sBtn, 'aria-pressed', !!S.soloed[name]);
      on(mBtn, 'click', function (e) { if (e && e.stopPropagation) e.stopPropagation(); doMute(name); });
      on(sBtn, 'click', function (e) { if (e && e.stopPropagation) e.stopPropagation(); doSolo(name); });
      l.appendChild(mBtn); l.appendChild(sBtn);
      var m = meterWidget(); l.appendChild(m.el);
      var sw = stepsWidget(name, 'var(--fam-ink)');
      var stepsHost = make('div', 'se-steps'); stepsHost.appendChild(sw.el); l.appendChild(stepsHost);
      row.appendChild(l);

      var sc = make('div', 'se-sc'); sc.style.gridTemplateColumns = areaCols(d.sections);
      var cells = [];
      d.sections.forEach(function (sec, i) {
        var vn = variantName(sec, name), c = make('div', 'se-cell' + (vn ? '' : ' none'), vn || '·');
        var rp = secRamps(sec, name);
        if (rp.length) { toggleClass(c, 'ramp', true); attr(c, 'title', 'ramps: ' + rp.join(', ')); }
        on(c, 'click', function (e) { if (e && e.stopPropagation) e.stopPropagation(); select(name); jumpTo(sec.name); });
        sc.appendChild(c); cells.push(c);
      });
      row.appendChild(sc);

      on(row, 'click', function () { select(name); });
      on(row, 'keydown', function (e) {
        if (!e) return;
        if (e.key === 'Enter' || e.key === ' ') { select(name); if (e.preventDefault) e.preventDefault(); }
        else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          var i = S.rowOrder.indexOf(name) + (e.key === 'ArrowDown' ? 1 : -1);
          if (i >= 0 && i < S.rowOrder.length) { select(S.rowOrder[i]); if (e.preventDefault) e.preventDefault(); }
        }
      });
      S.rows[name] = { el: row, name: name, steps: sw, meter: m, cells: cells, mBtn: mBtn, sBtn: sBtn, sig: '', lastLevel: -1, chip: chip.face };
      S.rowOrder.push(name);
      return row;
    }

    function buildBody(d) {
      var body = make('div', 'se-body'), groups = groupsFor(d);
      S.rows = {}; S.rowOrder = [];
      groups.forEach(function (g) {
        if (!g.tracks.length) return;
        var head = make('div', 'se-ghead'), tg = make('button', 'se-gtoggle');
        attr(tg, 'aria-expanded', !S.collapsed[g.id]); attr(tg, 'aria-label', g.label + ' group');
        tg.textContent = (S.collapsed[g.id] ? '▸ ' : '▾ ') + g.label + '  (' + g.tracks.length + ')';
        head.appendChild(tg); head.appendChild(make('div', 'se-gstem', 'stem lane: empty'));
        body.appendChild(head);
        var rowEls = [];
        g.tracks.forEach(function (tn) {
          var r = buildRow(d, tn); body.appendChild(r); rowEls.push(r);
          if (S.collapsed[g.id]) { r.hidden = true; attr(r, 'hidden', ''); }
        });
        on(tg, 'click', function () {
          S.collapsed[g.id] = !S.collapsed[g.id];
          attr(tg, 'aria-expanded', !S.collapsed[g.id]);
          tg.textContent = (S.collapsed[g.id] ? '▸ ' : '▾ ') + g.label + '  (' + g.tracks.length + ')';
          rowEls.forEach(function (r) {
            if (S.collapsed[g.id]) { r.hidden = true; attr(r, 'hidden', ''); }
            else { r.hidden = false; if (r.removeAttribute) r.removeAttribute('hidden'); }
          });
        });
      });
      var phw = make('div', 'se-phwrap'); S.bodyPh = make('div', 'se-ph'); phw.appendChild(S.bodyPh); body.appendChild(phw);
      return body;
    }

    // ---------------------------------------------------------------- device row
    function disposeDev() {
      if (!S.dev) return;
      for (var i = 0; i < S.dev.faces.length; i++) safe(function () { if (S.dev.faces[i] && isFn(S.dev.faces[i].dispose)) S.dev.faces[i].dispose(); });
      S.dev = null;
    }
    function openWindow(id) { if (root.Windows && isFn(root.Windows.open)) safe(function () { root.Windows.open(id, host); }); }
    // The face draws its own head (glyph + name); a double-click on that head opens the device window. If the face
    // could not render, a small title bar of ours stands in so the device is still reachable.
    function inHead(e, stop) {
      var n = e && e.target, k = 0;
      while (n && n !== stop && k++ < 8) {
        if (/(^|\s)(hv-head|hv-title|face-head|face-title)(\s|$)/.test(String(n.className || ''))) return true;
        n = n.parentNode;
      }
      return false;
    }
    function deviceBox(d, fam) {
      var box = make('div', 'se-dev'); attr(box, 'data-fam', fam || d.family || 'utility');
      var b = make('div', 'se-dbody');
      box.appendChild(b);
      on(box, 'dblclick', function (e) { if (inHead(e, box)) openWindow(d.id); });
      return { box: box, body: b };
    }
    function renderFace(d, density, into, faces) {
      var f = null;
      if (root.Faces && isFn(root.Faces.render)) f = safe(function () { return root.Faces.render(d, density, host); }, null);
      if (f && f.el) { into.appendChild(f.el); faces.push(f); return f; }
      var t = make('div', 'se-dtitle', d.name || d.id); attr(t, 'title', 'Double-click to open in a window');
      on(t, 'dblclick', function () { openWindow(d.id); });
      into.appendChild(t);
      return null;
    }
    function orderedDevices(name) {
      var mine = S.devices.filter(function (x) { return x.track === name; }), out = [];
      var rank = { instrument: 0, insert: 1, sidechain: 2, channel: 3 };
      mine.forEach(function (x, i) { x._i = i; });
      mine.sort(function (a, b) { var ra = has(rank, a.kind) ? rank[a.kind] : 1, rb = has(rank, b.kind) ? rank[b.kind] : 1; return ra - rb || a._i - b._i; });
      for (var i = 0; i < mine.length; i++) if (has(rank, mine[i].kind)) out.push(mine[i]);
      return out;
    }

    function buildPattern(d, name, faces) {
      var tr = findTrack(d, name), fam = (S.devices.filter(function (x) { return x.id === 'track:' + name; })[0] || {}).family || famOf(name);
      var box = make('div', 'se-dev'); attr(box, 'data-fam', fam);
      var t = make('div', 'se-dtitle', 'PATTERN · ' + name); box.appendChild(t);
      var b = make('div', 'se-dbody'); box.appendChild(b);
      var pat = { box: box, name: name, kind: tr ? tr.kind : 'drum', steps: null, vars: make('div', 'se-vars'), varBtns: {}, prog: null, progEls: [], roll: null, rollEls: [], sig: '' };
      if (pat.kind !== 'melody') { pat.steps = stepsWidget(name, 'var(--fam-ink)'); b.appendChild(pat.steps.el); }
      else {
        pat.roll = make('div', 'se-roll');
        for (var i = 0; i < STEPS; i++) { var c = make('div'); pat.rollEls.push(c); pat.roll.appendChild(c); }
        b.appendChild(pat.roll);
      }
      if (pat.kind === 'chord') {
        pat.prog = make('div', 'se-prog');
        b.appendChild(pat.prog);
      }
      b.appendChild(pat.vars);
      var letters = tr ? Object.keys(tr.variants).sort() : [];
      letters.forEach(function (L) {
        var vb = make('button', 'se-btn', L); attr(vb, 'aria-label', 'Variant ' + L); attr(vb, 'aria-pressed', false);
        attr(vb, 'title', 'Play variant ' + L + ' in this section');
        on(vb, 'click', function () { setPlay(name, L); });
        pat.vars.appendChild(vb); pat.varBtns[L] = vb;
      });
      faces.push({ el: box, update: function () {}, dispose: function () {} });
      return pat;
    }

    function buildDeviceRow(d) {
      disposeDev();
      clear(S.devRowEl);
      if (!S.sel) return;
      var faces = [], chain = make('div', 'se-chain');
      var pat = buildPattern(d, S.sel, faces);
      chain.appendChild(pat.box);
      orderedDevices(S.sel).forEach(function (dev) {
        var db = deviceBox(dev, dev.family);
        renderFace(dev, 'face', db.body, faces);
        chain.appendChild(db.box);
      });
      S.devRowEl.appendChild(chain);

      var pin = make('div', 'se-pin');
      [{ label: 'RETURNS', kind: 'send' }, { label: 'MASTER', kind: 'master' }].forEach(function (grp) {
        var g = make('div', 'se-pgroup'); g.appendChild(make('div', 'se-dtitle', grp.label));
        var chips = make('div', 'se-pchips'), opened = make('div', 'se-popen');
        S.devices.filter(function (x) { return x.kind === grp.kind; }).forEach(function (dev) {
          var c = make('button', 'se-pchip'); attr(c, 'data-fam', dev.family || 'utility'); attr(c, 'aria-pressed', !!S.openChips[dev.id]);
          attr(c, 'title', 'Click to expand, double-click to open in a window');
          var f = null;
          if (root.Faces && isFn(root.Faces.render)) f = safe(function () { return root.Faces.render(dev, 'chip', host); }, null);
          if (f && f.el) { c.appendChild(f.el); faces.push(f); }      // the face chip already shows glyph + name
          else c.appendChild(doc.createTextNode(dev.name || dev.id));
          on(c, 'click', function () { S.openChips[dev.id] = !S.openChips[dev.id]; buildDeviceRow(document_()); });
          on(c, 'dblclick', function () { openWindow(dev.id); });
          chips.appendChild(c);
          if (S.openChips[dev.id]) {
            var ob = deviceBox(dev, dev.family);
            renderFace(dev, 'strip', ob.body, faces);
            opened.appendChild(ob.box);
          }
        });
        g.appendChild(chips); g.appendChild(opened); pin.appendChild(g);
      });
      S.devRowEl.appendChild(pin);
      S.dev = { faces: faces, pat: pat };
    }

    // ---------------------------------------------------------------- full build (only on mount and 'document')
    function build() {
      var d = document_();
      S.drag = null;
      S.doc = d; S.structure = structureKey(d);
      S.devices = safe(function () { return host.devices(); }, []) || [];
      var ss = sectionStarts(d.sections); S.starts = ss.starts; S.total = ss.total || 1;
      S.secCount = d.sections.length; S.curSec = -1; S.lastPh = ''; S.lastBodyPh = ''; S.docRev++;
      // dispose chip faces of old rows
      for (var n in S.rows) if (has(S.rows, n) && S.rows[n].chip && isFn(S.rows[n].chip.dispose)) safe(function () { S.rows[n].chip.dispose(); });
      disposeDev();
      clear(inner);
      inner.appendChild(buildOverview(d));
      inner.appendChild(buildRuler(d));
      inner.appendChild(buildBody(d));
      S.devRowEl = make('div', 'se-devrow'); attr(S.devRowEl, 'aria-label', 'Device row');
      inner.appendChild(S.devRowEl);
      if (!S.sel || !findTrack(d, S.sel)) S.sel = S.rowOrder[0] || (d.tracks[0] && d.tracks[0].name) || null;
      markSel();
      syncLoop();
      buildDeviceRow(d);
      update();
    }
    function markSel() {
      for (var n in S.rows) if (has(S.rows, n)) {
        toggleClass(S.rows[n].el, 'sel', n === S.sel);
        attr(S.rows[n].el, 'aria-pressed', n === S.sel);
      }
    }

    // ---------------------------------------------------------------- update (per frame; cheap)
    function setCells(widget, cells) { if (widget && isFn(widget.set)) widget.set(cells); }
    function updateRoll(pat, vw) {
      var lo = 1e9, hi = -1e9, i, c;
      for (i = 0; i < STEPS; i++) { c = vw.cells[i]; if (c && typeof c.note === 'number') { lo = Math.min(lo, c.note); hi = Math.max(hi, c.note); } }
      for (i = 0; i < STEPS; i++) {
        c = vw.cells[i]; var slot = pat.rollEls[i]; clear(slot);
        if (c && typeof c.note === 'number') {
          var mark = make('i'), u = hi > lo ? (c.note - lo) / (hi - lo) : 0.5;
          mark.style.bottom = pct(u * 0.9); slot.appendChild(mark);
        }
      }
    }
    function update() {
      if (disposed || !S.doc) return;
      var d = S.doc, p = pos_(), si = curIndex(p, d.sections), i, n;
      var absBar = (typeof p.bar === 'number' ? p.bar : 0) + (p.step || 0) / STEPS;
      var f = Math.max(0, Math.min(1, absBar / S.total)), fs = pct(f);

      if (fs !== S.lastPh) {
        S.lastPh = fs;
        if (S.ovPh) S.ovPh.style.left = fs;
        if (S.ruPh) S.ruPh.style.left = fs;
        if (S.bodyPh) S.bodyPh.style.left = fs;
      }
      if (si !== S.curSec) {
        S.curSec = si;
        for (i = 0; i < S.ovSegs.length; i++) toggleClass(S.ovSegs[i], 'now', i === si);
        for (i = 0; i < S.blocks.length; i++) toggleClass(S.blocks[i], 'now', i === si);
        if (S.ovWin) { S.ovWin.style.left = pct(S.starts[si] / S.total); S.ovWin.style.width = pct((d.sections[si].bars | 0) / S.total); }
        for (n in S.rows) if (has(S.rows, n)) for (i = 0; i < S.rows[n].cells.length; i++) toggleClass(S.rows[n].cells[i], 'now', i === si);
      }
      for (n in S.rows) if (has(S.rows, n)) {
        var r = S.rows[n], rsig = viewSig(d, n, si, p);
        if (rsig !== r.sig) { var vw = viewOf(d, n, si, p); r.sig = rsig; setCells(r.steps, vw.cells); toggleClass(r.el, 'idle', !vw.v); }
        var m = safe(function () { return host.meter('track:' + n + ':channel'); }, null), lv = m && typeof m.level === 'number' ? m.level : 0;
        if (Math.abs(lv - r.lastLevel) > 0.004) { r.lastLevel = lv; r.meter.set(lv); }
      }
      if (S.dev) {
        var pat = S.dev.pat, psig = viewSig(d, pat.name, si, p) + ':' + (pat.kind === 'chord' ? barInSec(p, si) : '');
        if (psig !== pat.sig) {
          var pv = viewOf(d, pat.name, si, p);
          pat.sig = psig;
          if (pat.steps) setCells(pat.steps, pv.cells);
          if (pat.roll) updateRoll(pat, pv);
          for (var L in pat.varBtns) if (has(pat.varBtns, L)) attr(pat.varBtns[L], 'aria-pressed', L === pv.variant);
          if (pat.prog) {
            var prog = (d.sections[si] && d.sections[si].progression) || d.progression || [], cur = barInSec(p, si) % Math.max(1, prog.length);
            if (pat.progEls.length !== prog.length) {
              clear(pat.prog); pat.progEls = [];
              for (var k = 0; k < prog.length; k++) { var ch = make('span', null, String(prog[k])); pat.prog.appendChild(ch); pat.progEls.push(ch); }
            }
            for (var q = 0; q < pat.progEls.length; q++) { toggleClass(pat.progEls[q], 'now', q === cur); pat.progEls[q].textContent = String(prog[q]); }
          }
        }
        for (i = 0; i < S.dev.faces.length; i++) { var fc = S.dev.faces[i]; if (fc && isFn(fc.update)) safe(function () { fc.update(); }); }
      }
    }

    // ---------------------------------------------------------------- select
    function select(name) {
      if (disposed || !S.doc || !findTrack(S.doc, name)) return;
      var changed = name !== S.sel;
      S.sel = name;
      markSel();
      if (changed) buildDeviceRow(S.doc);
      if (root.Windows && isFn(root.Windows.onSelect)) safe(function () { root.Windows.onSelect('track:' + name); });
      update();
    }

    // ---------------------------------------------------------------- wiring
    // Same tracks, sections and devices and no engine rebuild (a step edit, a fork, setPlay): refresh in place so
    // keyboard focus stays on the step the user just toggled. Anything else rebuilds.
    function structureKey(d) {
      return d.tracks.map(function (t) { return t.name; }).join(',') + '|' + d.sections.map(function (x) { return x.name + ':' + x.bars; }).join(',');
    }
    function softRefresh(d) {
      S.doc = d; S.docRev++;
      var n, i, vn, sec;
      for (n in S.rows) if (has(S.rows, n)) {
        S.rows[n].sig = '';
        for (i = 0; i < d.sections.length; i++) {
          sec = d.sections[i]; vn = variantName(sec, n);
          S.rows[n].cells[i].textContent = vn || '\u00b7';
          toggleClass(S.rows[n].cells[i], 'none', !vn);
        }
      }
      if (S.dev) {
        var pat = S.dev.pat, tr = findTrack(d, pat.name), letters = tr ? Object.keys(tr.variants).sort() : [];
        pat.sig = '';
        letters.forEach(function (L) {
          if (has(pat.varBtns, L)) return;
          var vb = make('button', 'se-btn', L); attr(vb, 'aria-label', 'Variant ' + L); attr(vb, 'aria-pressed', false);
          on(vb, 'click', function () { setPlay(pat.name, L); });
          pat.vars.appendChild(vb); pat.varBtns[L] = vb;
        });
      }
      S.curSec = -1;
      update();
    }
    var onDocument = function (e) {
      if (disposed) return;
      var d = document_();
      if (S.doc && e && e.rebuilt === false && structureKey(d) === S.structure) softRefresh(d);
      else build();
    };
    if (isFn(host.on)) host.on('document', onDocument);
    build();

    return {
      update: update,
      select: select,
      dispose: function () {
        if (disposed) return;
        disposed = true;
        if (isFn(host.off)) safe(function () { host.off('document', onDocument); });
        for (var n in S.rows) if (has(S.rows, n) && S.rows[n].chip && isFn(S.rows[n].chip.dispose)) safe(function () { S.rows[n].chip.dispose(); });
        disposeDev();
        try { if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl); } catch (e) { /* ignore */ }
        S.rows = {}; S.rowOrder = [];
      }
    };
  }

  root.SystemEditor = { mount: mount, GROUPS: GROUPS };
})();
