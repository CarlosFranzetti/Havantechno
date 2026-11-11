/* Havantechno app - ui/panels.js
 * Global `Panels`: hardware-style instrument panels for the floating device windows (Patch Crew, P4).
 * A panel is one SVG drawn after the original machine (looks, not marks: no maker's logo or model badge; Havantechno's
 * wordmark and a plain HVT model name), whose controls are live: they write the same parameters as the faces.
 *
 *   Panels.define(key, def)                 def: {label, size: {w, h} (viewBox units), win: {w} (default window width, px),
 *                                                 match(device, host) -> bool, build(P) -> {update?(), dispose?()}?}
 *   Panels.for(device, host) -> key|null    which panel, if any, a device belongs to (instrument devices only)
 *   Panels.render(device, host, opts) -> {el, update(), resize(w, h), dispose(), key}
 *   Panels.keys()  Panels.get(key)
 *
 * build(P) receives the panel kit: P.host, P.device, P.svg, P.g(parent, attrs), P.el(tag, attrs, parent), P.text(parent,
 * x, y, str, attrs), P.voice(type) -> {type, dev, path(param), entry(param)} (dev null when no track uses that voice; a
 * single-device panel uses P.voice(null) = the window's own device), P.knob(parent, o), P.button(parent, o), P.slide(parent, o),
 * P.onUpdate(fn), P.onDispose(fn), P.listen(node, type, fn), P.addVoice(type), P.steps (see machine panels), P.frame.
 * So a single-device panel (303, Model D, Juno) is a define() whose build draws its face and calls P.knob(g, {param: 'cutoff', ...}).
 *
 * Controls behave like Widgets (ui/widgets.js): role="slider", aria-valuenow/min/max/valuetext, vertical drag (200 px for the
 * whole range, Shift x0.1), wheel on the focused control, arrows 1 % (Shift 0.1 %), PageUp/Down 10 %, Home/End, double-click
 * returns to the song's value (the current section's `set`, else the document's value when the panel was built, else spec.value),
 * Delete too. One host.hold(path) per gesture (at its first change), then host.setParam(path, v). A spec entry with basis
 * 'prior' carries a dotted ring. A value readout shows while adjusting or focused. Everything goes through the host the window
 * was given (the Electron bridge host has no document/editor/commit/transport.play: step keys, add and start/stop are drawn
 * disabled there). update() runs every frame and only touches the DOM when something changed.
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var NS = 'http://www.w3.org/2000/svg';
  var DRAG_PX = 200, FINE = 0.1, KEY = 0.01, TIP_MS = 900;
  var A0 = 135, SWEEP = 270;              // knob travel: degrees clockwise from +x (y down), as Widgets
  var STEPS = 16, DEFAULT_VEL = 0.85, EMPTY = '................';

  var defs = {}, order = [];

  // ------------------------------------------------------------------ helpers
  function safe(fn, dflt) { try { var v = fn(); return v === undefined ? dflt : v; } catch (e) { return dflt; } }
  function has(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function isFn(f) { return typeof f === 'function'; }
  function doc() { return root.document; }
  function attrs(e, a) { if (a) for (var k in a) if (has(a, k) && a[k] != null) e.setAttribute(k, String(a[k])); return e; }
  function sv(tag, a, parent) { var e = attrs(doc().createElementNS(NS, tag), a); if (parent) parent.appendChild(e); return e; }
  function pt(cx, cy, r, deg) { var a = deg * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function f2(x) { return Math.round(x * 100) / 100; }
  function scaleOf(e) {
    var min = e && isNum(e.min) ? e.min : 0, max = e && isNum(e.max) ? e.max : 1;
    var lg = min > 0 && max / min > 50, lmin = lg ? Math.log(min) : 0, ls = lg ? Math.log(max) - lmin : 0, span = max - min;
    return {
      min: min, max: max,
      toPos: function (v) { if (!(span > 0)) return 0; return clamp(lg ? (Math.log(Math.max(v, min)) - lmin) / ls : (v - min) / span, 0, 1); },
      fromPos: function (p) { p = clamp(p, 0, 1); return lg ? Math.exp(lmin + p * ls) : min + p * span; }
    };
  }
  function fmt(v, unit) {
    var a = Math.abs(v), t = a >= 100 ? String(Math.round(v)) : a >= 10 ? v.toFixed(1) : a >= 1 ? v.toFixed(2) : v.toFixed(3);
    if (t.indexOf('.') >= 0) t = t.replace(/0+$/, '').replace(/\.$/, '');
    if (t === '-0') t = '0';
    return unit ? t + (unit === '%' ? '' : ' ') + unit : t;
  }

  // ------------------------------------------------------------------ document helpers (as the System Editor reads them)
  function findTrack(d, name) { var t = (d && d.tracks) || []; for (var i = 0; i < t.length; i++) if (t[i].name === name) return t[i]; return null; }
  function variantName(sec, name) { var p = sec && sec.play && sec.play[name]; return p === true ? 'A' : (p || null); }
  function curIndex(p, secs) {
    var i = p && p.section;
    if (typeof i === 'number' && i >= 0 && i < secs.length) return i;
    if (p && p.sectionName) for (var k = 0; k < secs.length; k++) if (secs[k].name === p.sectionName) return k;
    return 0;
  }
  function canEdit(h) { return !!h && isFn(h.document) && isFn(h.editor) && isFn(h.commit); }

  // ------------------------------------------------------------------ render
  function render(device, host, opts) {
    if (!device) throw new Error('Panels.render: no device');
    opts = opts || {};
    host = host || {};
    var key = Panels.for(device, host);
    if (!key) throw new Error('Panels.render: no panel for ' + device.type);
    var def = defs[key], W = def.size.w, H = def.size.h;
    var D = doc();
    var el = D.createElement('div');
    el.className = 'pn-root';
    el.setAttribute('data-panel', key);
    var natW = (def.win && def.win.w) || 960;
    el.style.width = natW + 'px';
    el.style.height = Math.round(natW * H / W) + 'px';
    var svg = sv('svg', { 'class': 'pn-svg', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMidYMid meet', width: natW, height: Math.round(natW * H / W),
      role: 'group', 'aria-label': def.label || key });
    el.appendChild(svg);

    var listeners = [], updaters = [], disposers = [], controls = [];
    var state = { disposed: false, frame: 0, docRev: 0, devs: null, devRev: 0, focus: null };

    function listen(node, type, fn, o) { var rec = [node, type, fn, o]; node.addEventListener(type, fn, o); listeners.push(rec); return rec; }
    function unlisten(rec) { var i = listeners.indexOf(rec); if (i >= 0) listeners.splice(i, 1); safe(function () { rec[0].removeEventListener(rec[1], rec[2], rec[3]); }); }

    // ---- devices: refetched on the host's 'document' event (refs change on a rebuild) and every 90 frames
    var listenAll = listen;
    function refreshDevices() {
      var list = safe(function () { return host.devices(); }, []) || [];
      state.devs = list.filter(function (d) { return d && d.kind === 'instrument'; });
      state.devRev++;
    }
    function onDoc() { state.docRev++; refreshDevices(); }
    if (isFn(host.on)) { safe(function () { host.on('document', onDoc); }); disposers.push(function () { if (isFn(host.off)) safe(function () { host.off('document', onDoc); }); }); }
    refreshDevices();

    function voice(type) {
      var dev = null, i;
      if (!type || type === device.type) {
        for (i = 0; i < state.devs.length; i++) if (state.devs[i].id === device.id) { dev = state.devs[i]; break; }
        if (!dev && (!type || type === device.type)) dev = type ? null : device;
        if (!dev && type) for (i = 0; i < state.devs.length; i++) if (state.devs[i].type === type) { dev = state.devs[i]; break; }
      } else {
        for (i = 0; i < state.devs.length; i++) if (state.devs[i].type === type) { dev = state.devs[i]; break; }
      }
      var spec = (dev && dev.spec) || safe(function () { return root.Drums && root.Drums.has && root.Drums.has(type) ? root.Drums.spec(type) : null; }, null) || {};
      return {
        type: type || device.type, dev: dev, spec: spec,
        path: function (p) { return dev ? dev.pathPrefix + '.' + p : null; },
        entry: function (p) { return spec[p] || null; }
      };
    }

    // the song document's value of an instrument param (the double-click home after the section's set)
    function docValue(dev, p) {
      if (!dev || !isFn(host.document)) return undefined;
      var tr = findTrack(safe(function () { return host.document(); }, null), dev.track);
      var v = tr && tr.params ? tr.params[p] : undefined;
      return isNum(v) ? v : undefined;
    }
    function sectionSet(path) {
      var secs = safe(function () { return host.sections(); }, null), pos = safe(function () { return host.transport.pos(); }, null);
      if (!secs || !secs.length) return undefined;
      var sec = secs[curIndex(pos, secs)];
      return sec && sec.set && has(sec.set, path) && isNum(sec.set[path]) ? sec.set[path] : undefined;
    }

    // ---- shared readout callout (drawn last, on top)
    var tipG = null, tipRect = null, tipText = null, tipTimer = null;
    function ensureTip() {
      if (tipG) return;
      tipG = sv('g', { 'class': 'pn-tip', 'aria-hidden': 'true', display: 'none', 'pointer-events': 'none' }, svg);
      tipRect = sv('rect', { rx: 4, ry: 4, height: 22 }, tipG);
      tipText = sv('text', { 'text-anchor': 'middle', y: 15 }, tipG);
    }
    function showTip(c, sticky) {
      ensureTip();
      if (tipG.parentNode === svg) svg.appendChild(tipG);       // keep on top
      var t = c.label + '  ' + c.text();
      tipText.textContent = t;
      var w = Math.max(60, t.length * 6.6 + 16);
      var x = clamp(c.x, w / 2 + 2, W - w / 2 - 2), y = c.y - c.r - 34;
      if (y < 2) y = c.y + c.r + 10;
      tipRect.setAttribute('width', f2(w)); tipRect.setAttribute('x', f2(-w / 2));
      tipG.setAttribute('transform', 'translate(' + f2(x) + ' ' + f2(y) + ')');
      tipG.setAttribute('display', 'inline');
      if (tipTimer) { clearTimeout(tipTimer); tipTimer = null; }
      if (!sticky) tipTimer = setTimeout(function () { tipTimer = null; if (state.focus !== c && tipG) tipG.setAttribute('display', 'none'); }, TIP_MS);
    }
    function hideTip() { if (tipG) tipG.setAttribute('display', 'none'); }
    disposers.push(function () { if (tipTimer) clearTimeout(tipTimer); });

    // ---- a slider-role control (knob, trimmer, rotary); o: {x, y, r, label, voice (type|null), param, draw(pos, c), kind,
    //      value: {get(), set(v), min, max, unit, label} for a non-device value (tempo)}
    function control(parent, o) {
      var c = { x: o.x, y: o.y, r: o.r || 16, label: o.label || o.param || '', o: o, v: null, pos: 0, sc: null, entry: null, path: null, dev: null,
                held: false, dragging: false, raw: 0, lastY: 0, pid: null, wheelT: null, rev: -1, home: undefined, disabled: false };
      var g = sv('g', { 'class': 'pn-ctl pn-' + (o.kind || 'knob'), role: 'slider', tabindex: 0, 'aria-label': c.label, transform: 'translate(' + f2(o.x) + ' ' + f2(o.y) + ')' }, parent);
      c.g = g;
      var own = [];
      function listen(node, type, fn, opt) { own.push(listenAll(node, type, fn, opt)); }
      if (o.hit) {
        sv('rect', { 'class': 'pn-hit', x: -o.hit.w / 2, y: -o.hit.h / 2, width: o.hit.w, height: o.hit.h, fill: 'transparent' }, g);
        sv('rect', { 'class': 'pn-focus', x: -o.hit.w / 2 - 3, y: -o.hit.h / 2 - 3, width: o.hit.w + 6, height: o.hit.h + 6, rx: 4 }, g);
      } else {
        sv('circle', { 'class': 'pn-hit', r: c.r + 7, fill: 'transparent' }, g);
        sv('circle', { 'class': 'pn-focus', r: c.r + 5 }, g);
      }
      c.art = sv('g', null, g);
      c.ring = null;

      function bind() {
        c.rev = state.devRev;
        if (o.value) {
          c.entry = { min: o.value.min, max: o.value.max, unit: o.value.unit || '', value: o.value.get(), basis: o.value.basis };
          c.path = o.value.path || null; c.dev = null; c.disabled = !o.value.set || !!o.value.disabled;
        } else {
          var vo = voice(o.voice || null);
          c.dev = vo.dev; c.path = vo.path(o.param); c.entry = vo.entry(o.param);
          c.disabled = !c.dev || !c.entry || !isFn(host.setParam);
          c.home = c.dev ? docValue(c.dev, o.param) : undefined;
        }
        c.sc = scaleOf(c.entry);
        var prior = !!(c.entry && c.entry.basis === 'prior');
        if (prior && !c.ring) { c.ring = sv('circle', { 'class': 'pn-prior', r: c.r + 3, 'data-basis': 'prior' }, g); if (g.firstChild) g.insertBefore(c.ring, c.art); }
        if (c.ring) c.ring.setAttribute('display', prior ? 'inline' : 'none');
        g.setAttribute('aria-disabled', c.disabled ? 'true' : 'false');
        g.setAttribute('tabindex', c.disabled ? '-1' : '0');
        if (c.entry) { g.setAttribute('aria-valuemin', c.sc.min); g.setAttribute('aria-valuemax', c.sc.max); }
        c.v = null;
        read();
      }
      function current() {
        if (o.value) return safe(function () { return o.value.get(); }, undefined);
        if (!c.path) return c.entry ? c.entry.value : undefined;
        var v = safe(function () { return host.getParam(c.path); }, undefined);
        return isNum(v) ? v : (c.entry ? c.entry.value : undefined);
      }
      function paint() {
        c.pos = c.sc.toPos(c.v);
        o.draw(c.art, c.pos, c);
        g.setAttribute('aria-valuenow', f2(c.v * 1000) / 1000);
        g.setAttribute('aria-valuetext', c.text());
      }
      function read() {
        var v = current();
        if (!isNum(v) || v === c.v) return;
        c.v = v; paint();
      }
      c.text = function () { return isNum(c.v) ? (o.format ? o.format(c.v) : fmt(c.v, c.entry && c.entry.unit)) : ''; };
      function write(v) {
        if (c.disabled) return;
        v = clamp(v, c.sc.min, c.sc.max);
        if (o.step) v = clamp(c.sc.min + Math.round((v - c.sc.min) / o.step) * o.step, c.sc.min, c.sc.max);
        if (v === c.v) return;
        if (!c.held) {
          c.held = true;
          if (o.value) { if (o.value.hold) safe(function () { o.value.hold(); }); }
          else if (isFn(host.hold)) safe(function () { host.hold(c.path); });
        }
        c.v = v; paint();
        if (o.value) safe(function () { o.value.set(v); });
        else safe(function () { host.setParam(c.path, v); });
        showTip(c, state.focus === c || c.dragging);
      }
      function setPos(p) { write(c.sc.fromPos(clamp(p, 0, 1))); }
      function homeValue() {
        if (o.value) return o.value.home != null ? o.value.home : undefined;
        var s = sectionSet(c.path);
        if (isNum(s)) return s;
        if (isNum(c.home)) return c.home;
        return c.entry ? c.entry.value : undefined;
      }
      function goHome() { var hv = homeValue(); if (isNum(hv)) { c.held = false; write(hv); c.held = false; } }

      listen(g, 'pointerdown', function (e) {
        if (c.disabled || (e.button != null && e.button !== 0)) return;
        safe(function () { g.focus(); });
        c.dragging = true; c.held = false; c.lastY = e.clientY; c.raw = c.pos; c.pid = e.pointerId;
        safe(function () { if (g.setPointerCapture && c.pid != null) g.setPointerCapture(c.pid); });
        showTip(c, true);
        if (e.preventDefault) e.preventDefault();
      });
      listen(g, 'pointermove', function (e) {
        if (!c.dragging) return;
        var dy = c.lastY - e.clientY; c.lastY = e.clientY;
        if (!dy) return;
        c.raw = clamp(c.raw + dy / DRAG_PX * (e.shiftKey ? FINE : 1), 0, 1);
        setPos(c.raw);
      });
      function up() {
        if (!c.dragging) return;
        c.dragging = false; c.held = false;
        safe(function () { if (g.releasePointerCapture && c.pid != null) g.releasePointerCapture(c.pid); });
        c.pid = null;
        showTip(c, state.focus === c);
      }
      listen(g, 'pointerup', up); listen(g, 'pointercancel', up);
      listen(g, 'dblclick', function () { if (!c.disabled) goHome(); });
      listen(g, 'wheel', function (e) {
        if (c.disabled || D.activeElement !== g) return;
        var dy = e.deltaY || 0; if (!dy) return;
        if (e.deltaMode === 1) dy *= 33;
        if (e.preventDefault) e.preventDefault();
        if (c.wheelT) clearTimeout(c.wheelT); else c.held = false;
        c.wheelT = setTimeout(function () { c.wheelT = null; c.held = false; }, 300);
        if (o.step) write(c.v + (dy < 0 ? o.step : -o.step));
        else setPos(c.pos + clamp(-dy / 100, -3, 3) * KEY * (e.shiftKey ? FINE : 1));
      }, { passive: false });
      listen(g, 'keydown', function (e) {
        if (c.disabled) return;
        var k = e.key, used = true;
        if (o.step && (k === 'ArrowUp' || k === 'ArrowRight')) write(c.v + o.step);
        else if (o.step && (k === 'ArrowDown' || k === 'ArrowLeft')) write(c.v - o.step);
        else if (k === 'ArrowUp' || k === 'ArrowRight') setPos(c.pos + (e.shiftKey ? KEY * FINE : KEY));
        else if (k === 'ArrowDown' || k === 'ArrowLeft') setPos(c.pos - (e.shiftKey ? KEY * FINE : KEY));
        else if (k === 'PageUp') setPos(c.pos + 0.1);
        else if (k === 'PageDown') setPos(c.pos - 0.1);
        else if (k === 'Home') write(c.sc.min);
        else if (k === 'End') write(c.sc.max);
        else if (k === 'Delete' || k === 'Backspace') goHome();
        else used = false;
        if (used && e.preventDefault) e.preventDefault();
      });
      listen(g, 'keyup', function () { c.held = false; });
      listen(g, 'focus', function () { state.focus = c; if (!c.disabled) showTip(c, true); });
      listen(g, 'blur', function () { c.held = false; if (state.focus === c) state.focus = null; hideTip(); });
      disposers.push(function () { if (c.wheelT) clearTimeout(c.wheelT); });
      c.destroy = function () {
        own.forEach(unlisten); own.length = 0;
        var i = controls.indexOf(c); if (i >= 0) controls.splice(i, 1);
        if (state.focus === c) { state.focus = null; hideTip(); }
        if (g.parentNode) g.parentNode.removeChild(g);
      };

      c.update = function () {
        if (c.rev !== state.devRev) bind();
        else if (!c.dragging) read();
      };
      bind();
      controls.push(c);
      return c;
    }

    // ---- knob art
    function knob(parent, o) {
      var st = o.style || {}, r = o.r || 16, sw = st.sweep || SWEEP, a0 = 270 - sw / 2;
      o.r = r;
      o.draw = o.draw || function (art, pos, c) {
        if (!c.built) {
          c.built = true;
          var ticks = st.ticks == null ? 11 : st.ticks, i;
          if (ticks) {
            var tg = sv('g', { 'class': 'pn-ticks', stroke: st.tick || '#d8d8d0', 'stroke-width': st.tickW || 1.4, 'stroke-linecap': 'round' }, art);
            for (i = 0; i < ticks; i++) {
              var a = a0 + sw * i / (ticks - 1), p0 = pt(0, 0, r + 4, a), p1 = pt(0, 0, r + ((i === 0 || i === ticks - 1 || i === (ticks - 1) / 2) ? 9 : 7), a);
              sv('line', { x1: f2(p0[0]), y1: f2(p0[1]), x2: f2(p1[0]), y2: f2(p1[1]) }, tg);
            }
          }
          sv('circle', { r: r + 1.5, fill: 'rgba(0,0,0,.45)', cy: 1.5 }, art);                                   // shadow
          sv('circle', { r: r, fill: st.skirt || '#1b1b1b', stroke: st.edge || '#000', 'stroke-width': 1 }, art);  // skirt
          if (st.cap) sv('circle', { r: r * (st.capR || 0.72), fill: st.cap, stroke: st.capEdge || 'rgba(0,0,0,.35)', 'stroke-width': 1 }, art);
          if (st.shine !== false) sv('ellipse', { rx: r * 0.42, ry: r * 0.22, cx: -r * 0.2, cy: -r * 0.42, fill: 'rgba(255,255,255,.16)' }, art);
          c.ptr = sv('line', { stroke: st.pointer || '#f4f1e8', 'stroke-width': st.pointerW || 2.4, 'stroke-linecap': 'round' }, art);
        }
        var a = a0 + sw * pos, q0 = pt(0, 0, st.slot ? -r * 0.8 : r * 0.12, a), q1 = pt(0, 0, r * (st.slot ? 0.8 : 0.92), a);
        c.ptr.setAttribute('x1', f2(q0[0])); c.ptr.setAttribute('y1', f2(q0[1])); c.ptr.setAttribute('x2', f2(q1[0])); c.ptr.setAttribute('y2', f2(q1[1]));
      };
      var c = control(parent, o);
      if (o.caption) {
        var cy = o.captionY != null ? o.captionY : -(r + 15);
        P.text(c.g, 0, cy, o.caption, { 'class': 'pn-cap', fill: st.label || '#e9e6dc', 'font-size': o.captionSize || 10.5 });
      }
      return c;
    }

    // ---- button: role=button (or switch with aria-pressed); o: {x, y, w, h, rx, label, aria, onClick(e), fill, ink}
    function button(parent, o) {
      var g = sv('g', { 'class': 'pn-btn ' + (o.cls || ''), role: o.role || 'button', tabindex: 0, 'aria-label': o.aria || o.label || '', transform: 'translate(' + f2(o.x) + ' ' + f2(o.y) + ')' }, parent);
      var b = { g: g, disabled: false };
      g.setAttribute('aria-disabled', 'false');
      b.rect = sv('rect', { x: 0, y: 0, width: o.w, height: o.h, rx: o.rx == null ? 3 : o.rx, fill: o.fill || '#ddd', stroke: o.stroke || 'rgba(0,0,0,.5)', 'stroke-width': 1 }, g);
      sv('rect', { 'class': 'pn-focus', x: -3, y: -3, width: o.w + 6, height: o.h + 6, rx: (o.rx == null ? 3 : o.rx) + 2, fill: 'none' }, g);
      if (o.label) b.txt = P.text(g, o.w / 2, o.h / 2 + (o.size || 10) * 0.36, o.label, { fill: o.ink || '#111', 'font-size': o.size || 10, 'font-weight': 700 });
      function act(e) { if (!b.disabled && o.onClick) o.onClick(e || {}); }
      listen(g, 'click', function (e) { act(e); });
      listen(g, 'keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { if (e.preventDefault) e.preventDefault(); act(e); } });
      listen(g, 'pointerdown', function (e) { if (e.stopPropagation) e.stopPropagation(); });
      b.setDisabled = function (d) {
        d = !!d; if (d === b.disabled) return; b.disabled = d;
        g.setAttribute('aria-disabled', d ? 'true' : 'false'); g.setAttribute('tabindex', d ? '-1' : '0');
        g.setAttribute('opacity', d ? '0.4' : '1');
      };
      return b;
    }

    // ---- two-position slide switch (vertical); o: {x, y, aria, labels: [up, down], get() -> 0|1, set(i)}
    function slide(parent, o) {
      var g = sv('g', { 'class': 'pn-slide', role: 'switch', tabindex: 0, 'aria-label': o.aria || '', transform: 'translate(' + f2(o.x) + ' ' + f2(o.y) + ')' }, parent);
      sv('rect', { 'class': 'pn-focus', x: -12, y: -17, width: 24, height: 34, rx: 4, fill: 'none' }, g);
      sv('rect', { x: -6, y: -14, width: 12, height: 28, rx: 2, fill: '#0b0b0b', stroke: '#555', 'stroke-width': 1 }, g);
      var thumb = sv('rect', { x: -5, width: 10, height: 13, rx: 1.5, fill: o.thumb || '#cfcac0', stroke: '#222', 'stroke-width': 0.8 }, g);
      sv('rect', { x: -12, y: -17, width: 24, height: 34, fill: 'transparent' }, g);
      var s = { g: g, last: -1 };
      s.update = function () {
        var i = o.get() ? 1 : 0;
        if (i === s.last) return;
        s.last = i;
        thumb.setAttribute('y', i ? 0 : -13);
        g.setAttribute('aria-checked', i ? 'true' : 'false');
        g.setAttribute('aria-valuetext', o.labels ? o.labels[i] : String(i));
      };
      function flip() { o.set(o.get() ? 0 : 1); s.update(); }
      listen(g, 'click', flip);
      listen(g, 'keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { if (e.preventDefault) e.preventDefault(); flip(); } });
      s.update();
      updaters.push(s.update);
      return s;
    }

    // ---- single-device helpers: read and write one param of a voice (null = the window's own device)
    function pval(type, p) {
      var vo = voice(type), path = vo.path(p), v;
      if (path) v = safe(function () { return host.getParam(path); }, undefined);
      if (v === undefined || v === null) { var e = vo.entry(p); v = e ? e.value : undefined; }
      return v;
    }
    function pwrite(type, p, v, holdIt) {
      var path = voice(type).path(p);
      if (!path || !isFn(host.setParam)) return false;
      if (holdIt && isFn(host.hold)) safe(function () { host.hold(path); });
      safe(function () { host.setParam(path, v); });
      return true;
    }
    function optionsOf(type, p, fallback) {
      var e = voice(type).entry(p);
      if (e && e.options && e.options.length) return e.options.slice();
      return fallback ? fallback.slice() : (e ? [e.value] : []);
    }
    function same(a, b) { return a === b || String(a) === String(b); }

    // ---- a stepped selector over a string (or listed) param: a knob whose positions are the options.
    //      o: {x, y, r, voice, param, options (fallback), labels {value: text}, style, caption, sweep}
    function choice(parent, o) {
      var opts = optionsOf(o.voice || null, o.param, o.options), n = Math.max(1, opts.length);
      var vo = voice(o.voice || null), path = vo.path(o.param), e = vo.entry(o.param);
      function idx(v) { for (var i = 0; i < opts.length; i++) if (same(opts[i], v)) return i; return 0; }
      function lab(i) { var v = opts[clamp(Math.round(i), 0, n - 1)]; return (o.labels && o.labels[v] != null) ? o.labels[v] : String(v); }
      var song = vo.dev ? docValue(vo.dev, o.param) : undefined;
      var kn = knob(parent, { x: o.x, y: o.y, r: o.r, label: o.label, caption: o.caption, captionY: o.captionY, captionSize: o.captionSize, kind: 'choice', step: 1,
        style: Object.assign({ sweep: o.sweep || Math.min(300, 40 * (n - 1)), ticks: n }, o.style || {}), format: lab,
        value: { min: 0, max: n - 1, basis: e && e.basis, disabled: !path || !e,
          get: function () { return idx(pval(o.voice || null, o.param)); },
          set: function (v) { pwrite(o.voice || null, o.param, opts[clamp(Math.round(v), 0, n - 1)], false); },
          hold: function () { if (path && isFn(host.hold)) safe(function () { host.hold(path); }); },
          home: idx(song !== undefined ? song : (e ? e.value : opts[0])) } });
      if (o.legends !== false) {
        var sw = (o.style && o.style.sweep) || o.sweep || Math.min(300, 40 * (n - 1)), a0 = 270 - sw / 2, rr = o.r + (o.legendR || 17);
        opts.forEach(function (v, i) {
          var a = n > 1 ? a0 + sw * i / (n - 1) : 270, q = pt(o.x, o.y, rr, a);
          P.text(parent, q[0], q[1] + 3.5, lab(i), { 'font-size': o.legendSize || 9, fill: (o.style && o.style.label) || '#eee', 'font-weight': 600 });
        });
      }
      return kn;
    }

    // ---- an on/off switch over a 0..1 flag or a boolean param; o: {x, y, w, h, voice, param, label, draw(art, on, b)}
    function toggle(parent, o) {
      var g = sv('g', { 'class': 'pn-sw ' + (o.cls || ''), role: 'switch', tabindex: 0, 'aria-label': o.label || o.param, transform: 'translate(' + f2(o.x) + ' ' + f2(o.y) + ')' }, parent);
      var w = o.w || 22, h = o.h || 34, t = { g: g, on: null, art: sv('g', null, g) };
      sv('rect', { 'class': 'pn-focus', x: -w / 2 - 4, y: -h / 2 - 4, width: w + 8, height: h + 8, rx: 4 }, g);
      sv('rect', { x: -w / 2 - 4, y: -h / 2 - 4, width: w + 8, height: h + 8, fill: 'transparent' }, g);
      function isOn(v) { return v === true || (isNum(v) && v >= 0.5) || v === 'on'; }
      function flip() {
        var vo = voice(o.voice || null), e = vo.entry(o.param);
        if (!vo.dev || !e) return;
        var on = !isOn(pval(o.voice || null, o.param));
        pwrite(o.voice || null, o.param, typeof e.value === 'boolean' ? on : (on ? 1 : 0), true);
        t.update();
      }
      listen(g, 'click', flip);
      listen(g, 'keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { if (ev.preventDefault) ev.preventDefault(); flip(); } });
      t.update = function () {
        var vo = voice(o.voice || null), e = vo.entry(o.param), on = isOn(pval(o.voice || null, o.param)), dis = !vo.dev || !e;
        if (on === t.on && dis === t.dis) return;
        t.on = on; t.dis = dis;
        g.setAttribute('aria-checked', on ? 'true' : 'false');
        g.setAttribute('aria-disabled', dis ? 'true' : 'false');
        g.setAttribute('tabindex', dis ? '-1' : '0');
        g.setAttribute('opacity', dis ? '0.35' : '1');
        while (t.art.firstChild) t.art.removeChild(t.art.firstChild);
        o.draw(t.art, on, { w: w, h: h });
      };
      t.update();
      updaters.push(t.update);
      return t;
    }

    // ---- one button per option of a param (chorus, range, modes); o: {x, y, w, h, gap, vertical, voice, param, options (fallback),
    //      labels, fill, ink, led, ledOff, caption}
    function radio(parent, o) {
      var opts = optionsOf(o.voice || null, o.param, o.options), btns = [], last = null;
      var grp = sv('g', { 'class': 'pn-radio', role: 'radiogroup', 'aria-label': o.label || o.param }, parent);
      opts.forEach(function (v, i) {
        var bx = o.vertical ? o.x : o.x + i * (o.w + (o.gap == null ? 6 : o.gap)), by = o.vertical ? o.y + i * (o.h + (o.gap == null ? 6 : o.gap)) : o.y;
        var lbl = (o.labels && o.labels[v] != null) ? o.labels[v] : String(v);
        var b = button(grp, { x: bx, y: by, w: o.w, h: o.h, rx: o.rx == null ? 2 : o.rx, label: lbl, size: o.size || 10, fill: o.fill || '#cfcfcb', ink: o.ink || '#151515',
          role: 'radio', aria: (o.label || o.param) + ' ' + lbl, onClick: function () { pwrite(o.voice || null, o.param, v, true); last = null; upd(); } });
        b.led = sv('circle', { cx: o.w / 2, cy: o.ledY == null ? -6 : o.ledY, r: 3.2, fill: o.ledOff || '#3a1510' }, b.g);
        btns.push(b);
      });
      function upd() {
        var cur = pval(o.voice || null, o.param), vo = voice(o.voice || null), dis = !vo.dev || !vo.entry(o.param), sig = String(cur) + dis;
        if (sig === last) return;
        last = sig;
        btns.forEach(function (b, i) {
          var on = same(opts[i], cur);
          b.g.setAttribute('aria-checked', on ? 'true' : 'false');
          b.led.setAttribute('fill', on ? (o.led || '#ff3b22') : (o.ledOff || '#3a1510'));
          b.setDisabled(dis);
        });
      }
      upd();
      updaters.push(upd);
      return { g: grp, buttons: btns, update: upd };
    }

    // ---- vertical fader; o: {x, y (centre), len, voice, param, label, caption, cap colour, step}
    function fader(parent, o) {
      var len = o.len || 120, half = len / 2;
      o.r = half; o.hit = { w: 30, h: len + 20 }; o.kind = 'fader';
      o.draw = function (art, pos, c) {
        if (!c.built) {
          c.built = true;
          for (var i = 0; i <= 10; i++) { var ty = half - len * i / 10; sv('line', { x1: -13, x2: i % 5 ? -9 : -15, y1: f2(ty), y2: f2(ty), stroke: o.tick || '#9a9a9a', 'stroke-width': 1 }, art); sv('line', { x1: 9, x2: i % 5 ? 13 : 15, y1: f2(ty), y2: f2(ty), stroke: o.tick || '#9a9a9a', 'stroke-width': 1 }, art); }
          sv('rect', { x: -2.5, y: -half - 4, width: 5, height: len + 8, rx: 2, fill: '#050505', stroke: '#2a2a2a' }, art);
          c.thumb = sv('g', null, art);
          sv('rect', { x: -9, y: -7, width: 18, height: 14, rx: 2, fill: o.cap || '#bdbdb8', stroke: '#111', 'stroke-width': 1 }, c.thumb);
          sv('line', { x1: -9, x2: 9, y1: 0, y2: 0, stroke: o.index || '#111', 'stroke-width': 2 }, c.thumb);
        }
        c.thumb.setAttribute('transform', 'translate(0 ' + f2(half - len * pos) + ')');
      };
      var c = control(parent, o);
      if (o.caption) P.text(c.g, 0, half + 22, o.caption, { fill: o.labelInk || '#e8e8e8', 'font-size': o.captionSize || 10, 'font-weight': 700 });
      return c;
    }

    // ---- tempo and transport for any panel
    function tempoValue(range) {
      return { min: range[0], max: range[1], unit: 'BPM', path: 'bpm',
        get: function () { var b = safe(function () { return host.getParam('bpm'); }, undefined); if (!isNum(b)) b = safe(function () { return host.bpm(); }, 120); return b; },
        set: isFn(host.setParam) ? function (v) { host.setParam('bpm', Math.round(v * 10) / 10); } : null,
        hold: isFn(host.hold) ? function () { host.hold('bpm'); } : null,
        home: safe(function () { var d = host.document(); return d && isNum(d.bpm) ? d.bpm : undefined; }, undefined) };
    }
    function transportToggle() {
      var tr = host.transport || {};
      if (isFn(tr.toggle)) safe(function () { tr.toggle(); });
      else if (tr.playing && isFn(tr.stop)) safe(function () { tr.stop(); });
      else if (isFn(tr.play)) safe(function () { tr.play(); });
    }
    function canTransport() { var tr = host.transport || {}; return isFn(tr.toggle) || isFn(tr.play); }
    function playStep() {
      if (!safe(function () { return host.transport.playing; }, false)) return -1;
      var p = safe(function () { return host.transport.pos(); }, null);
      return p && isNum(p.step) ? p.step % STEPS : -1;
    }

    // ---- add a track for a voice type, the way the System Editor's kit menu does (one undo entry)
    function addVoice(type) {
      if (!canEdit(host)) return null;
      var ed = safe(function () { return host.editor(); }, null);
      if (!ed || !isFn(ed.addTrack)) return null;
      var made = null;
      var run = function (e) {
        var name = type, n = 2;
        while (e.track(name) || name === 'send' || name === 'master') name = type + '_' + (n++);
        if (e.addTrack({ name: name, type: type, inst: type, family: 'drums', gain: 0.8, variants: { A: EMPTY } })) made = name;
        return made;
      };
      if (isFn(ed.group)) ed.group(run); else run(ed);
      if (made) { safe(function () { host.commit(); }); refreshDevices(); }
      return made;
    }

    // ---- steps of a voice in the section being viewed or played (System Editor semantics)
    function stepView(type) {
      var vo = voice(type), dev = vo.dev;
      if (!dev || !isFn(host.document)) return null;
      var d = safe(function () { return host.document(); }, null);
      if (!d || !d.sections || !d.sections.length) return null;
      var p = safe(function () { return host.transport.pos(); }, null) || { section: 0, barInSection: 0 };
      var si = curIndex(p, d.sections), sec = d.sections[si], tr = findTrack(d, dev.track);
      if (!tr) return null;
      var vn = variantName(sec, tr.name), v = vn && tr.variants ? tr.variants[vn] : null, cells = [], i, bar = 0;
      if (v) {
        bar = (p.barInSection || 0) % Math.max(1, v.bars || 1);
        for (i = 0; i < STEPS; i++) cells.push(v.cells[bar * STEPS + i] || null);
      } else for (i = 0; i < STEPS; i++) cells.push(null);
      return { dev: dev, track: tr.name, section: sec.name, si: si, variant: vn, bar: bar, bars: v ? v.bars : 0, cells: cells, tr: tr };
    }
    function editStep(type, i, accent) {
      return editCell(type, i, function (cell) {
        if (accent) return (cell && cell.acc) ? { acc: null, vel: DEFAULT_VEL } : { acc: true, vel: 1 };
        return cell ? null : { vel: DEFAULT_VEL };
      });
    }
    // patchFn(cell) -> patch (null clears the step, undefined does nothing); one ed.group = one undo entry, then host.commit
    function editCell(type, i, patchFn) {
      if (!canEdit(host)) return false;
      var vw = stepView(type); if (!vw) return false;
      var ed = safe(function () { return host.editor(); }, null); if (!ed) return false;
      var start = null, cell = vw.cells[i], bar = vw.bar;
      if (!vw.variant || !vw.tr.variants[vw.variant]) {
        var ks = vw.tr.variants ? Object.keys(vw.tr.variants).sort() : [];
        if (!ks.length) return false;
        start = has(vw.tr.variants, 'A') ? 'A' : ks[0];
        var v0 = vw.tr.variants[start]; cell = v0.cells[i] || null; bar = 0;
      }
      var patch = patchFn(cell);
      if (patch === undefined) return false;
      var run = function (e) {
        if (start) e.setPlay(vw.section, vw.track, start);
        return e.setStepInSection(vw.section, vw.track, bar * STEPS + i, patch);
      };
      if (isFn(ed.group)) ed.group(run); else run(ed);
      safe(function () { host.commit(); });
      return true;
    }

    var P = {
      host: host, device: device, svg: svg, W: W, H: H, key: key, opts: opts, state: state,
      el: function (tag, a, parent) { return sv(tag, a, parent); },
      g: function (parent, a) { return sv('g', a, parent || svg); },
      text: function (parent, x, y, str, a) {
        var t = sv('text', { x: f2(x), y: f2(y), 'text-anchor': 'middle' }, parent || svg);
        attrs(t, a); t.textContent = str; return t;
      },
      voice: voice, knob: knob, control: control, button: button, slide: slide, addVoice: addVoice,
      choice: choice, toggle: toggle, radio: radio, fader: fader, pval: pval, pwrite: pwrite, options: optionsOf,
      tempoValue: tempoValue, transportToggle: transportToggle, canTransport: canTransport, playStep: playStep,
      stepView: stepView, editStep: editStep, editCell: editCell, canEdit: function () { return canEdit(host); },
      listen: listen, onUpdate: function (fn) { updaters.push(fn); }, onDispose: function (fn) { disposers.push(fn); },
      refresh: refreshDevices
    };
    var built = def.build(P) || {};

    function update() {
      if (state.disposed) return;
      state.frame++;
      if (state.frame % 90 === 0) refreshDevices();
      var i;
      for (i = 0; i < controls.length; i++) controls[i].update();
      for (i = 0; i < updaters.length; i++) { var u = updaters[i]; safe(function () { u(state.frame); }); }
      if (built.update) safe(function () { built.update(state.frame); });
    }
    function resize(w, h) {
      if (state.disposed) return;
      w = Math.max(60, w | 0); h = Math.max(40, h | 0);
      var s = Math.min(w / W, h / H), pw = Math.floor(W * s), ph = Math.floor(H * s);
      el.style.width = '100%'; el.style.height = '100%';
      svg.setAttribute('width', pw); svg.setAttribute('height', ph);
    }
    function dispose() {
      if (state.disposed) return;
      state.disposed = true;
      var i;
      for (i = 0; i < disposers.length; i++) { var d = disposers[i]; safe(function () { d(); }); }
      if (built.dispose) safe(function () { built.dispose(); });
      for (i = 0; i < listeners.length; i++) { var l = listeners[i]; safe(function () { l[0].removeEventListener(l[1], l[2], l[3]); }); }
      listeners.length = 0; controls.length = 0; updaters.length = 0;
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    update();
    return { el: el, update: update, resize: resize, dispose: dispose, key: key, kit: P, listenerCount: function () { return listeners.length; }, controls: controls };
  }

  // ------------------------------------------------------------------ registry
  var Panels = {
    define: function (key, def) {
      if (!def || !isFn(def.build) || !def.size) throw new Error('Panels.define: def needs build and size');
      if (!has(defs, key)) order.push(key);
      defs[key] = def;
      return Panels;
    },
    get: function (key) { return defs[key] || null; },
    keys: function () { return order.slice(); },
    for: function (device, host) {
      if (!device) return null;
      for (var i = 0; i < order.length; i++) {
        var d = defs[order[i]];
        if (safe(function () { return !!d.match(device, host); }, false)) return order[i];
      }
      return null;
    },
    render: render,
    util: { findTrack: findTrack, variantName: variantName, curIndex: curIndex, fmt: fmt, scale: scaleOf, A0: A0, SWEEP: SWEEP, pt: pt }
  };

  // ==================================================================== drum machine panels (HVT-808, HVT-909)
  var V808 = ['bd808', 'sd808', 'cp808', 'ch808', 'oh808', 'cy808', 'cb808', 'lt808', 'mt808', 'ht808', 'lc808', 'mc808', 'hc808', 'rs808', 'cl808', 'ma808'];
  var V909 = ['bd909', 'sd909', 'lt909', 'mt909', 'ht909', 'rs909', 'cp909', 'ch909', 'oh909', 'cr909', 'rd909'];
  var VNAME = { bd: 'Bass Drum', sd: 'Snare Drum', lt: 'Low Tom', mt: 'Mid Tom', ht: 'Hi Tom', lc: 'Low Conga', mc: 'Mid Conga', hc: 'Hi Conga',
    rs: 'Rim Shot', cl: 'CLaves', cp: 'Hand ClaP', ma: 'MAracas', cb: 'Cow Bell', cy: 'CYmbal', oh: 'Open Hihat', ch: 'Closed Hihat', cr: 'Crash', rd: 'Ride' };
  // short legends for the engine-only trimmers
  var TRIM = { drive: 'DRIVE', tune: 'TUNE', shift: 'SHIFT', shiftTime: 'SHIFT T', droop: 'DROOP', click: 'CLICK', tone: 'TONE', ratio: 'RATIO',
    noiseDecay: 'N.DECAY', q: 'Q', bursts: 'BURSTS', spacing: 'SPACING', burstDecay: 'B.DECAY', tail: 'TAIL', spread: 'SPREAD', hp: 'HPF',
    fast: 'FAST', sweep: 'SWEEP', noise: 'NOISE', decay: 'DECAY', start: 'START', end: 'END', hold: 'HOLD', attack: 'ATTACK', clickDecay: 'CLK DEC',
    clickLp: 'CLK LPF', snappy: 'SNAPPY', base: 'BASE', bodyDecay: 'BODY DEC', glide: 'GLIDE', glideTime: 'GLIDE T', hpf: 'HPF', depth: 'DEPTH',
    pitchDecay: 'P.DECAY', crush: 'CRUSH', level: 'LEVEL' };
  function abbr(t) { return t.slice(0, 2).toUpperCase(); }

  // 808-style legend: capitals large, the rest small capitals
  function capsText(P, parent, x, y, str, a) {
    var t = P.text(parent, x, y, '', a);
    t.textContent = '';
    var run = '', big = null, i;
    function flush() { if (!run) return; var s = sv('tspan', { 'font-size': big ? 13 : 8.5 }, t); s.textContent = run.toUpperCase(); run = ''; }
    for (i = 0; i < str.length; i++) {
      var ch = str.charAt(i), b = ch !== ' ' && ch === ch.toUpperCase() && ch !== ch.toLowerCase();
      if (b !== big && run) flush();
      big = b; run += ch;
    }
    flush();
    return t;
  }

  // shared machine logic: selection, step keys, running light, transport, trims, add
  function machine(P, cfg) {
    var host = P.host, st = { sel: null, cellsSig: '', lastStep: -2, playing: null, bpm: null };
    var present = function (t) { return !!P.voice(t).dev; };
    st.sel = (cfg.voices.indexOf(P.device.type) >= 0) ? P.device.type : cfg.voices[0];
    var api = { st: st, onSelect: [] };
    api.select = function (t) {
      if (cfg.voices.indexOf(t) < 0 || st.sel === t) return;
      st.sel = t; st.cellsSig = ''; buildTrims();
      api.onSelect.forEach(function (f) { f(t); });
    };
    api.present = present;

    // ---- trims of the selected voice: every spec param the columns do not carry
    var trimG = null, trimLabel = null, trimCtl = [];
    function buildTrims() {
      if (!cfg.trimLayer) return;
      trimCtl.forEach(function (c) { c.destroy(); }); trimCtl = [];
      if (trimG && trimG.parentNode) trimG.parentNode.removeChild(trimG);
      trimG = P.g(cfg.trimLayer, { 'class': 'pn-trims' });
      var vo = P.voice(st.sel), spec = vo.spec || {}, shown = cfg.columnParams(st.sel), list = [], k;
      for (k in spec) if (has(spec, k) && isNum(spec[k].min) && shown.indexOf(k) < 0) list.push(k);
      if (trimLabel) trimLabel.textContent = 'VOICE TRIM · ' + abbr(st.sel) + (vo.dev ? '' : ' (no track)');
      var tb = cfg.trimBox, n = list.length, step = Math.min(tb.step, n > 1 ? tb.w / n : tb.step);
      list.forEach(function (p, i) {
        var c = P.knob(trimG, { x: tb.x + step * (i + 0.5), y: tb.y, r: 11, voice: st.sel, param: p, label: abbr(st.sel) + ' ' + (TRIM[p] || p), kind: 'trim',
          style: { skirt: '#9a9a96', edge: '#3a3a38', cap: null, ticks: 0, slot: true, pointer: '#2a2a28', pointerW: 2.2, shine: true },
          caption: TRIM[p] || p, captionY: 26, captionSize: 9.5 });
        c.g.setAttribute('class', c.g.getAttribute('class') + ' pn-trim');
        c.capEl = c.g.lastChild; c.capEl.setAttribute('fill', cfg.trimInk);
        trimCtl.push(c);
        if (!vo.dev) c.g.setAttribute('opacity', '0.4');
      });
    }
    api.trimTitle = function (parent, x, y, a) { trimLabel = P.text(parent, x, y, '', a); };
    api.buildTrimsInto = function (layer) { cfg.trimLayer = layer; buildTrims(); };

    // ---- step keys
    var keys = [];
    api.key = function (k) { keys.push(k); };
    function cellsSig(vw) { return !vw ? 'none' : vw.si + ':' + vw.variant + ':' + vw.bar + ':' + vw.cells.map(function (c) { return !c ? '.' : c.acc ? 'X' : 'x'; }).join(''); }
    api.stepInfo = null;
    api.clickKey = function (i, e) {
      if (!P.canEdit() || !present(st.sel)) return;
      P.editStep(st.sel, i, !!(e && e.shiftKey));
      st.cellsSig = '';
    };
    api.update = function () {
      var vw = (P.state.frame % 4 === 0 || st.cellsSig === '') ? P.stepView(st.sel) : st.vw;
      st.vw = vw;
      var sig = cellsSig(vw) + '|' + st.sel + '|' + P.canEdit() + '|' + present(st.sel);
      if (sig !== st.cellsSig) {
        st.cellsSig = sig;
        var editable = P.canEdit() && present(st.sel);
        keys.forEach(function (k, i) { k.set(vw ? vw.cells[i] : null, editable); });
        if (api.stepInfo) {
          var t = abbr(st.sel) + ' · ' + (VNAME[st.sel.slice(0, 2)] || st.sel) + '  —  ';
          if (!present(st.sel)) t += 'no track: press + to add';
          else if (!vw) t += P.canEdit() ? '' : 'step editing is in the main window';
          else t += 'section ' + vw.section + (vw.variant ? '  ·  pattern ' + vw.variant + (vw.bars > 1 ? '  ·  bar ' + (vw.bar + 1) + '/' + vw.bars : '') : '  ·  not playing here yet');
          api.stepInfo.textContent = t;
        }
      }
      var playing = !!safe(function () { return host.transport.playing; }, false);
      var step = -1;
      if (playing) { var p = safe(function () { return host.transport.pos(); }, null); step = p && isNum(p.step) ? p.step % STEPS : -1; }
      if (step !== st.lastStep) { keys.forEach(function (k, i) { k.cursor(i === step); }); st.lastStep = step; }
      if (playing !== st.playing) { st.playing = playing; if (api.onPlaying) api.onPlaying(playing); }
    };
    api.transport = function () {
      var tr = host.transport || {};
      if (isFn(tr.toggle)) safe(function () { tr.toggle(); });
      else if (tr.playing && isFn(tr.stop)) safe(function () { tr.stop(); });
      else if (isFn(tr.play)) safe(function () { tr.play(); });
    };
    api.canTransport = function () { var tr = host.transport || {}; return isFn(tr.toggle) || isFn(tr.play); };
    api.tempo = function () {
      return { min: cfg.tempo[0], max: cfg.tempo[1], unit: 'BPM', path: 'bpm',
        get: function () { var b = safe(function () { return host.getParam('bpm'); }, undefined); if (!isNum(b)) b = safe(function () { return host.bpm(); }, 120); return b; },
        set: isFn(host.setParam) ? function (v) { host.setParam('bpm', Math.round(v * 10) / 10); } : null,
        hold: isFn(host.hold) ? function () { host.hold('bpm'); } : null,
        home: safe(function () { var d = host.document(); return d && isNum(d.bpm) ? d.bpm : undefined; }, undefined) };
    };
    return api;
  }

  // a dimmed-voice "+" button; o: {x, y, type, w}
  function addButton(P, parent, x, y, type, M, w) {
    var b = P.button(parent, { x: x - (w || 44) / 2, y: y, w: w || 44, h: 18, rx: 9, label: '+ ' + abbr(type), size: 10, fill: '#ff5fa2', ink: '#16060d', stroke: '#16060d',
      cls: 'pn-add', aria: 'Add a ' + (VNAME[type.slice(0, 2)] || type) + ' track (' + type + ')',
      onClick: function () { var n = P.addVoice(type); if (n) M.select(type); } });
    return b;
  }

  // ------------------------------------------------------------------ HVT-808
  var COL808 = [
    { id: 'AC', voices: [], knobs: [] },
    { id: 'BD', voices: ['bd808'], knobs: [['LEVEL', 'level'], ['TONE', 'tone'], ['DECAY', 'decay']] },
    { id: 'SD', voices: ['sd808'], knobs: [['LEVEL', 'level'], ['TONE', 'tone'], ['SNAPPY', 'snappy']] },
    { id: 'LT', voices: ['lt808', 'lc808'], knobs: [['LEVEL', 'level'], ['TUNING', 'tune']] },
    { id: 'MT', voices: ['mt808', 'mc808'], knobs: [['LEVEL', 'level'], ['TUNING', 'tune']] },
    { id: 'HT', voices: ['ht808', 'hc808'], knobs: [['LEVEL', 'level'], ['TUNING', 'tune']] },
    { id: 'RS', voices: ['rs808', 'cl808'], knobs: [['LEVEL', 'level']] },
    { id: 'CP', voices: ['cp808', 'ma808'], knobs: [['LEVEL', 'level']] },
    { id: 'CB', voices: ['cb808'], knobs: [['LEVEL', 'level']] },
    { id: 'CY', voices: ['cy808'], knobs: [['LEVEL', 'level'], ['TONE', 'tone'], ['DECAY', 'decay']] },
    { id: 'OH', voices: ['oh808'], knobs: [['LEVEL', 'level'], null, ['DECAY', 'decay']] },
    { id: 'CH', voices: ['ch808'], knobs: [['LEVEL', 'level']] }
  ];
  var C808 = { face: '#1d1d1f', case: '#0c0c0d', line: '#e8e4d8', legend: '#ece8dc', tile: '#d8d4c8', tileInk: '#141414', lower: '#c9c7bf', lowerInk: '#1e1e1e',
    keys: ['#d8382c', '#ee8a1e', '#efd033', '#ebe5d2'], led: '#ff3b22', ledOff: '#3a1712', capLevel: '#e6672f', capTone: '#ece6d4', capDecay: '#f1c93a' };

  Panels.define('hvt808', {
    label: 'HVT-808 rhythm machine', size: { w: 1200, h: 760 }, win: { w: 1080 },
    match: function (d) { return d.kind === 'instrument' && V808.indexOf(d.type) >= 0; },
    build: function (P) {
      var svg = P.svg, C = C808;
      var colX0 = 236, colW = 78, ROW = [112, 200, 288];
      var colOf = {}, pairSel = {};
      COL808.forEach(function (col, i) { col.voices.forEach(function (v) { colOf[v] = i; }); });
      var M = machine(P, {
        voices: V808, tempo: [40, 300], trimInk: '#e3dfd3',
        columnParams: function (t) { var col = COL808[colOf[t]]; return col ? col.knobs.filter(Boolean).map(function (k) { return k[1]; }) : []; },
        trimLayer: null, trimBox: { x: 236, y: 446, w: 640, step: 80 }
      });
      // pairs: show the selected voice if it is in the pair, else the one that has a track, else the first
      COL808.forEach(function (col) {
        if (col.voices.length < 2) return;
        var s = col.voices.indexOf(M.st.sel);
        if (s < 0) s = (!M.present(col.voices[0]) && M.present(col.voices[1])) ? 1 : 0;
        pairSel[col.id] = s;
      });

      // ---- case and face
      P.el('rect', { x: 0, y: 0, width: 1200, height: 760, rx: 14, fill: C.case }, svg);
      P.el('rect', { x: 8, y: 6, width: 1184, height: 16, rx: 6, fill: '#3a3a3c' }, svg);                 // top rail
      for (var sx = 60; sx < 1200; sx += 270) P.el('circle', { cx: sx, cy: 14, r: 3.2, fill: '#8a8a8a' }, svg);
      P.el('rect', { x: 18, y: 30, width: 1164, height: 446, rx: 4, fill: C.face, stroke: '#000', 'stroke-width': 1 }, svg);
      // wordmark (Havantechno's own) top right; model name in the strip below the voices
      P.text(svg, 1166, 62, 'HAVANTECHNO', { 'text-anchor': 'end', fill: '#ff5fa2', 'font-size': 22, 'font-weight': 800, 'letter-spacing': 4 });

      // ---- left block: instrument select, tempo
      var lb = P.g(svg, { 'class': 'pn-left' });
      P.el('rect', { x: 30, y: 80, width: 192, height: 384, rx: 3, fill: 'none', stroke: C.line, 'stroke-width': 1, opacity: 0.6 }, lb);
      P.text(lb, 126, 98, 'INSTRUMENT SELECT', { fill: C.legend, 'font-size': 10, 'font-weight': 700, 'letter-spacing': 1 });
      var SEL = ['BD', 'SD', 'LT', 'MT', 'HT', 'RS', 'CP', 'CB', 'CY', 'OH', 'CH'];
      var scx = 126, scy = 178, selLbl = [];
      var selArc = function (i) { return 150 + i * (240 / (SEL.length - 1)); };
      var rot = P.g(lb, { 'class': 'pn-ctl pn-rotary', role: 'slider', tabindex: 0, 'aria-label': 'Instrument select', 'aria-valuemin': 0, 'aria-valuemax': SEL.length - 1 });
      P.el('circle', { 'class': 'pn-focus', cx: scx, cy: scy, r: 34 }, rot);
      P.el('circle', { cx: scx, cy: scy + 2, r: 29, fill: 'rgba(0,0,0,.5)' }, rot);
      P.el('circle', { cx: scx, cy: scy, r: 28, fill: '#1a1a1a', stroke: '#000' }, rot);
      P.el('circle', { cx: scx, cy: scy, r: 20, fill: '#e9e3d1' }, rot);
      var rptr = P.el('line', { stroke: '#151515', 'stroke-width': 3, 'stroke-linecap': 'round' }, rot);
      SEL.forEach(function (s, i) {
        var a = selArc(i), q = pt(scx, scy, 50, a), dot = pt(scx, scy, 34, a);
        P.el('circle', { cx: f2(dot[0]), cy: f2(dot[1]), r: 1.6, fill: C.legend }, lb);
        var t = P.text(lb, q[0], q[1] + 4, s, { fill: C.legend, 'font-size': 10.5, 'font-weight': 700, 'class': 'pn-sel', cursor: 'pointer' });
        P.listen(t, 'click', function () { selCol(i + 1); });
        selLbl.push(t);
      });
      function colVoice(ci) { var col = COL808[ci]; return col.voices.length > 1 ? col.voices[pairSel[col.id] || 0] : col.voices[0]; }
      function selCol(ci) { var v = colVoice(ci); if (v) M.select(v); }
      function selIndex() { var ci = colOf[M.st.sel]; return ci - 1; }
      function paintSel() {
        var i = selIndex(), a = selArc(i), q0 = pt(scx, scy, 4, a), q1 = pt(scx, scy, 26, a);
        rptr.setAttribute('x1', f2(q0[0])); rptr.setAttribute('y1', f2(q0[1])); rptr.setAttribute('x2', f2(q1[0])); rptr.setAttribute('y2', f2(q1[1]));
        selLbl.forEach(function (t, k) { t.setAttribute('fill', k === i ? '#ff8a3a' : C.legend); });
        rot.setAttribute('aria-valuenow', i); rot.setAttribute('aria-valuetext', SEL[i] + ' ' + (VNAME[M.st.sel.slice(0, 2)] || ''));
      }
      P.listen(rot, 'keydown', function (e) {
        var i = selIndex(), n = i;
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') n = i + 1; else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') n = i - 1;
        else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = SEL.length - 1; else return;
        if (e.preventDefault) e.preventDefault();
        selCol(clamp(n, 0, SEL.length - 1) + 1);
      });
      var rdrag = null;
      P.listen(rot, 'pointerdown', function (e) { rdrag = { y: e.clientY, i: selIndex() }; safe(function () { rot.focus(); rot.setPointerCapture(e.pointerId); }); });
      P.listen(rot, 'pointermove', function (e) { if (!rdrag) return; var n = clamp(rdrag.i + Math.round((rdrag.y - e.clientY) / 14), 0, SEL.length - 1); if (n !== selIndex()) selCol(n + 1); });
      P.listen(rot, 'pointerup', function () { rdrag = null; });
      P.listen(rot, 'pointercancel', function () { rdrag = null; });

      P.text(lb, 126, 272, 'TEMPO', { fill: C.legend, 'font-size': 11, 'font-weight': 700, 'letter-spacing': 2 });
      var tempo = P.knob(lb, { x: 126, y: 338, r: 40, label: 'Tempo', value: M.tempo(), kind: 'tempo',
        style: { skirt: '#151515', cap: '#d9d4c4', capR: 0.62, pointer: '#141414', pointerW: 3.4, ticks: 21, tick: C.legend } });
      P.el('rect', { x: 86, y: 404, width: 80, height: 26, rx: 3, fill: '#120404', stroke: '#444' }, lb);
      var bpmTxt = P.text(lb, 126, 423, '', { fill: '#ff3b22', 'font-size': 17, 'font-family': 'ui-monospace,Menlo,Consolas,monospace', 'font-weight': 700, 'class': 'pn-bpm' });
      P.text(lb, 126, 448, 'BPM', { fill: C.legend, 'font-size': 9, 'letter-spacing': 2 });

      // ---- voice columns
      var colG = P.g(svg, { 'class': 'pn-cols' });
      P.el('line', { x1: colX0, y1: 80, x2: colX0 + colW * 12, y2: 80, stroke: C.line, 'stroke-width': 1.2 }, colG);
      var colState = [];
      COL808.forEach(function (col, ci) {
        var x = colX0 + colW * ci, cx = x + colW / 2, g = P.g(colG, { 'class': 'pn-col', 'data-col': col.id });
        P.el('line', { x1: x, y1: 80, x2: x, y2: 400, stroke: C.line, 'stroke-width': 1, opacity: 0.7 }, g);
        if (ci === 11) P.el('line', { x1: x + colW, y1: 80, x2: x + colW, y2: 400, stroke: C.line, 'stroke-width': 1, opacity: 0.7 }, g);
        var hi = P.el('rect', { x: x + 2, y: 82, width: colW - 4, height: 316, rx: 2, fill: 'rgba(255,138,58,.10)', stroke: '#ff8a3a', 'stroke-width': 1.2, display: 'none' }, g);
        var cs = { col: col, g: g, hi: hi, groups: [], tiles: [], adds: [] };
        if (!col.voices.length) {                 // accent: the engine's accent ratios are fixed (drums.js), so no knob
          P.text(g, cx, 102, 'ACCENT', { fill: C.legend, 'font-size': 10.5, 'font-weight': 700 });
          P.text(g, cx, 200, 'shift-click', { fill: '#a8a59c', 'font-size': 9.5 });
          P.text(g, cx, 213, 'a step', { fill: '#a8a59c', 'font-size': 9.5 });
          P.el('rect', { x: x + 6, y: 372, width: colW - 12, height: 24, rx: 2, fill: C.tile }, g);
          capsText(P, g, cx, 389, 'ACcent', { fill: C.tileInk });
          colState.push(cs); return;
        }
        col.voices.forEach(function (v, vi) {
          var vg = P.g(g, { 'class': 'pn-voice', 'data-voice': v });
          col.knobs.forEach(function (k, ri) {
            if (!k) return;
            var cap = ri === 0 ? C.capLevel : ri === 1 ? C.capTone : C.capDecay;
            P.knob(vg, { x: cx, y: ROW[ri], r: 17, voice: v, param: k[1], label: col.id + ' ' + k[0].toLowerCase() + ' (' + v + ')', caption: k[0],
              style: { skirt: '#141414', cap: cap, pointer: '#111', ticks: 11, tick: C.legend, label: C.legend } });
          });
          var tile = P.g(g, { 'class': 'pn-tile', cursor: 'pointer' });
          P.el('rect', { x: x + 6, y: 372, width: colW - 12, height: 24, rx: 2, fill: C.tile }, tile);
          capsText(P, tile, cx, 389, VNAME[v.slice(0, 2)] || v, { fill: C.tileInk });
          P.listen(tile, 'click', function () { M.select(v); });
          var add = addButton(P, g, cx, 236, v, M, 52);
          cs.groups.push(vg); cs.tiles.push(tile); cs.adds.push(add);
        });
        if (col.voices.length > 1) {
          P.text(g, cx - 20, 326, abbr(col.voices[0]), { fill: C.legend, 'font-size': 9 });
          P.text(g, cx - 20, 352, abbr(col.voices[1]), { fill: C.legend, 'font-size': 9 });
          P.slide(g, { x: cx + 4, y: 339, aria: (VNAME[col.voices[0].slice(0, 2)]) + ' / ' + (VNAME[col.voices[1].slice(0, 2)]) + ' switch', labels: [col.voices[0], col.voices[1]],
            get: function () { return pairSel[col.id] || 0; }, set: function (i) { pairSel[col.id] = i; M.select(col.voices[i]); cs.sig = ''; } });
        }
        colState.push(cs);
      });

      // ---- model strip and trims
      P.el('line', { x1: colX0, y1: 400, x2: colX0 + colW * 12, y2: 400, stroke: C.line, 'stroke-width': 1.2 }, svg);
      P.text(svg, 1166, 462, 'HVT-808', { 'text-anchor': 'end', fill: C.legend, 'font-size': 30, 'font-style': 'italic', 'font-weight': 300, 'letter-spacing': 1 });
      var trimLayer = P.g(svg, { 'class': 'pn-trimrow' });
      M.trimTitle(trimLayer, 236, 418, { 'text-anchor': 'start', fill: '#bdb9ae', 'font-size': 10.5, 'font-weight': 700, 'letter-spacing': 1 });

      // ---- lower section
      var low = P.g(svg, { 'class': 'pn-lower' });
      P.el('rect', { x: 18, y: 486, width: 1164, height: 258, rx: 4, fill: C.lower, stroke: '#000' }, low);
      P.el('rect', { x: 18, y: 486, width: 1164, height: 5, fill: '#e6e3da' }, low);
      // pre-scale style band (decoration) carries the step-view info line
      P.el('rect', { x: 236, y: 504, width: 936, height: 34, rx: 2, fill: '#efece4', stroke: '#9c998f' }, low);
      M.stepInfo = P.text(low, 248, 526, '', { 'text-anchor': 'start', fill: C.lowerInk, 'font-size': 12, 'font-weight': 600, 'class': 'pn-info' });
      P.text(low, 220, 562, 'STEP NO', { 'text-anchor': 'end', fill: C.lowerInk, 'font-size': 9.5, 'font-weight': 700 });
      var ss = P.button(low, { x: 40, y: 590, w: 150, h: 84, rx: 3, label: 'START / STOP', size: 12, fill: '#e8e5dc', ink: '#1a1a1a', aria: 'Start or stop the song',
        onClick: function () { M.transport(); } });
      var ssLed = P.el('circle', { cx: 115, cy: 606, r: 4.5, fill: C.ledOff }, low);
      ss.setDisabled(!M.canTransport());
      M.onPlaying = function (on) { ssLed.setAttribute('fill', on ? C.led : C.ledOff); };
      var kw = 936 / 16;
      for (var i = 0; i < STEPS; i++) (function (i) {
        var kx = 236 + kw * i + (kw - 46) / 2, col = C.keys[Math.floor(i / 4)];
        P.text(low, kx + 23, 562, String(i + 1), { fill: C.lowerInk, 'font-size': 11, 'font-weight': 700 });
        var acc = P.el('circle', { cx: kx + 23, cy: 578, r: 3.2, fill: 'none', stroke: '#6a675f', 'stroke-width': 1 }, low);
        var b = P.button(low, { x: kx, y: 590, w: 46, h: 84, rx: 3, fill: col, cls: 'pn-key', aria: 'Step ' + (i + 1),
          onClick: function (e) { M.clickKey(i, e); } });
        b.g.setAttribute('aria-pressed', 'false');
        var led = P.el('rect', { x: 17, y: 10, width: 12, height: 7, rx: 1, fill: C.ledOff, stroke: 'rgba(0,0,0,.4)', 'stroke-width': 0.6 }, b.g);
        var cur = P.el('rect', { x: kx - 3, y: 587, width: 52, height: 90, rx: 5, fill: 'none', stroke: '#ffffff', 'stroke-width': 2.4, display: 'none', 'pointer-events': 'none' }, low);
        P.text(low, kx + 23, 698, String(i + 1), { fill: C.lowerInk, 'font-size': 13, 'font-weight': 500 });
        M.key({
          set: function (cell, editable) {
            led.setAttribute('fill', cell ? C.led : C.ledOff);
            acc.setAttribute('fill', cell && cell.acc ? C.led : 'none');
            b.g.setAttribute('aria-pressed', cell ? 'true' : 'false');
            b.g.setAttribute('aria-label', 'Step ' + (i + 1) + (cell ? (cell.acc ? ', on, accent' : ', on') : ', off') + ' (click toggles, Shift-click accent)');
            b.setDisabled(!editable);
          },
          cursor: function (on) { cur.setAttribute('display', on ? 'inline' : 'none'); }
        });
      })(i);
      P.el('rect', { x: 236, y: 710, width: 700, height: 18, rx: 2, fill: '#2a2a2a' }, low);
      P.text(low, 248, 723, 'click a key: step on / off   ·   shift-click: accent   ·   double-click a knob: song value', { 'text-anchor': 'start', fill: '#e8e5dc', 'font-size': 10 });

      M.buildTrimsInto(trimLayer);

      var sig = '';
      function paintCols() {
        var s = M.st.sel + '|' + COL808.map(function (col) { return col.voices.map(function (v) { return M.present(v) ? 1 : 0; }).join('') + (pairSel[col.id] || 0); }).join(',') + '|' + P.canEdit();
        if (s === sig) return;
        sig = s;
        colState.forEach(function (cs) {
          var col = cs.col; if (!col.voices.length) return;
          var showI = col.voices.length > 1 ? (pairSel[col.id] || 0) : 0;
          col.voices.forEach(function (v, vi) {
            var vis = vi === showI, pres = M.present(v);
            cs.groups[vi].setAttribute('display', vis ? 'inline' : 'none');
            cs.groups[vi].setAttribute('opacity', pres ? '1' : '0.32');
            cs.tiles[vi].setAttribute('display', vis ? 'inline' : 'none');
            cs.tiles[vi].setAttribute('opacity', pres ? '1' : '0.45');
            cs.adds[vi].g.setAttribute('display', vis && !pres ? 'inline' : 'none');
            cs.adds[vi].setDisabled(!P.canEdit());
          });
          cs.hi.setAttribute('display', col.voices.indexOf(M.st.sel) >= 0 ? 'inline' : 'none');
        });
        paintSel();
      }
      M.onSelect.push(function (t) { var ci = colOf[t], col = COL808[ci]; if (col && col.voices.length > 1) pairSel[col.id] = col.voices.indexOf(t); sig = ''; });
      P.onUpdate(function () {
        paintCols();
        M.update();
        var b = tempo.v;
        var t = isNum(b) ? (Math.round(b * 10) / 10).toFixed(1) : '--';
        if (bpmTxt.textContent !== t) bpmTxt.textContent = t;
      });
      return {};
    }
  });

  // ------------------------------------------------------------------ HVT-909
  // groups of knob columns, as on the hardware: [col, row, legend, voice, param]
  var GRP909 = [
    { title: 'ACCENT', cols: 1, voices: [], knobs: [] },
    { title: 'BASS DRUM', cols: 2, voices: ['bd909'], knobs: [[0, 0, 'TUNE', 'bd909', 'tune'], [1, 0, 'LEVEL', 'bd909', 'level'], [0, 1, 'ATTACK', 'bd909', 'attack'], [1, 1, 'DECAY', 'bd909', 'decay']] },
    { title: 'SNARE DRUM', cols: 2, voices: ['sd909'], knobs: [[0, 0, 'TUNE', 'sd909', 'tune'], [1, 0, 'LEVEL', 'sd909', 'level'], [0, 1, 'TONE', 'sd909', 'tone'], [1, 1, 'SNAPPY', 'sd909', 'snappy']] },
    { title: 'LOW TOM', cols: 2, voices: ['lt909'], knobs: [[0, 0, 'TUNE', 'lt909', 'tune'], [1, 0, 'LEVEL', 'lt909', 'level'], [0, 1, 'DECAY', 'lt909', 'decay']] },
    { title: 'MID TOM', cols: 2, voices: ['mt909'], knobs: [[0, 0, 'TUNE', 'mt909', 'tune'], [1, 0, 'LEVEL', 'mt909', 'level'], [0, 1, 'DECAY', 'mt909', 'decay']] },
    { title: 'HI TOM', cols: 2, voices: ['ht909'], knobs: [[0, 0, 'TUNE', 'ht909', 'tune'], [1, 0, 'LEVEL', 'ht909', 'level'], [0, 1, 'DECAY', 'ht909', 'decay']] },
    { title: 'RIM SHOT  ·  HAND CLAP', cols: 2, voices: ['rs909', 'cp909'], knobs: [[0, 0, 'RS LEVEL', 'rs909', 'level'], [1, 0, 'CP LEVEL', 'cp909', 'level']] },
    { title: 'HI HAT', cols: 2, voices: ['ch909', 'oh909'], knobs: [[0, 0, 'CH LEVEL', 'ch909', 'level'], [1, 0, 'OH LEVEL', 'oh909', 'level'], [0, 1, 'CH DECAY', 'ch909', 'decay'], [1, 1, 'OH DECAY', 'oh909', 'decay']] },
    { title: 'CYMBAL', cols: 2, voices: ['cr909', 'rd909'], knobs: [[0, 0, 'CRASH LVL', 'cr909', 'level'], [1, 0, 'RIDE LVL', 'rd909', 'level'], [0, 1, 'CRASH TUNE', 'cr909', 'tune'], [1, 1, 'RIDE TUNE', 'rd909', 'tune']] }
  ];
  var C909 = { face: '#d9d6cc', faceEdge: '#b9b5aa', ink: '#1c1c1c', orange: '#e8641e', lower: '#47474a', lowerEdge: '#2c2c2e', key: '#c9c7c0', keyIvory: '#ece6d4',
    led: '#ff3b22', ledOff: '#4a1d16', knob: '#1b1b1c', knobTop: '#3a3a3c' };

  Panels.define('hvt909', {
    label: 'HVT-909 rhythm machine', size: { w: 1200, h: 720 }, win: { w: 1080 },
    match: function (d) { return d.kind === 'instrument' && V909.indexOf(d.type) >= 0; },
    build: function (P) {
      var svg = P.svg, C = C909, colW = 64, x0 = 52, ROWY = [150, 238];
      var colParams = {};
      GRP909.forEach(function (g) { g.knobs.forEach(function (k) { (colParams[k[3]] = colParams[k[3]] || []).push(k[4]); }); });
      var M = machine(P, { voices: V909, tempo: [37, 290], trimInk: C.ink,
        columnParams: function (t) { return colParams[t] || []; }, trimBox: { x: 300, y: 352, w: 660, step: 82 } });

      P.el('rect', { x: 0, y: 0, width: 1200, height: 720, rx: 12, fill: '#2a2a2b' }, svg);
      P.el('rect', { x: 10, y: 10, width: 1180, height: 410, rx: 6, fill: C.face, stroke: C.faceEdge, 'stroke-width': 2 }, svg);
      // model name top left (plain), wordmark top right
      P.text(svg, 40, 56, 'HVT-909', { 'text-anchor': 'start', fill: C.ink, 'font-size': 34, 'font-weight': 800, 'letter-spacing': 1, 'font-style': 'italic' });
      P.el('rect', { x: 210, y: 36, width: 520, height: 6, fill: C.orange }, svg);
      P.el('rect', { x: 210, y: 46, width: 520, height: 2, fill: C.orange }, svg);
      P.text(svg, 1160, 54, 'HAVANTECHNO', { 'text-anchor': 'end', fill: '#d9407e', 'font-size': 22, 'font-weight': 800, 'letter-spacing': 4 });

      var gx = x0, grpState = [];
      var knobStyle = { skirt: C.knob, cap: C.knobTop, capR: 0.78, pointer: '#f2efe6', pointerW: 2.6, ticks: 11, tick: '#3a3a3a', label: C.ink, edge: '#000' };
      GRP909.forEach(function (grp) {
        var w = grp.cols * colW, g = P.g(svg, { 'class': 'pn-grp' });
        P.el('rect', { x: gx + 3, y: 76, width: w - 6, height: 20, fill: 'none', stroke: C.ink, 'stroke-width': 1 }, g);
        P.text(g, gx + w / 2, 90, grp.title, { fill: C.ink, 'font-size': grp.title.length > 14 ? 8.5 : 10, 'font-weight': 700, 'letter-spacing': 0.5 });
        var hi = P.el('rect', { x: gx + 2, y: 100, width: w - 4, height: 196, rx: 3, fill: 'rgba(232,100,30,.10)', stroke: C.orange, 'stroke-width': 1.4, display: 'none' }, g);
        var gs = { grp: grp, hi: hi, vg: {}, adds: {} };
        if (!grp.voices.length) {
          P.text(g, gx + w / 2, 196, 'shift-click', { fill: '#5a5850', 'font-size': 9.5 });
          P.text(g, gx + w / 2, 209, 'a step', { fill: '#5a5850', 'font-size': 9.5 });
        }
        grp.voices.forEach(function (v) {
          var vg = P.g(g, { 'class': 'pn-voice', 'data-voice': v }), colIdx = 0;
          grp.knobs.forEach(function (k) {
            if (k[3] !== v) return;
            if (k[4] === 'level') colIdx = k[0];
            P.knob(vg, { x: gx + colW * k[0] + colW / 2, y: ROWY[k[1]], r: 16, voice: v, param: k[4], label: abbr(v) + ' ' + k[2].replace(/^(RS|CP|CH|OH|CRASH|RIDE) /, '').replace(/ LVL$/, ' LEVEL').toLowerCase() + ' (' + v + ')', caption: k[2], captionSize: 9.5, style: knobStyle });
          });
          var hit = P.el('rect', { x: gx + colW * colIdx + 4, y: 100, width: grp.voices.length > 1 ? colW - 8 : w - 8, height: 14, fill: 'transparent', cursor: 'pointer' }, g);
          P.listen(hit, 'click', function () { M.select(v); });
          gs.vg[v] = vg;
          gs.adds[v] = addButton(P, g, gx + colW * colIdx + colW / 2, 272, v, M, 48);
        });
        grpState.push(gs);
        gx += w;
      });

      // middle band: tempo, display, trims
      var mid = P.g(svg, { 'class': 'pn-mid' });
      P.el('line', { x1: 30, y1: 306, x2: 1170, y2: 306, stroke: C.ink, 'stroke-width': 1 }, mid);
      P.text(mid, 70, 326, 'TEMPO', { fill: C.ink, 'font-size': 10, 'font-weight': 700 });
      var tempo = P.knob(mid, { x: 70, y: 370, r: 26, label: 'Tempo', value: M.tempo(), kind: 'tempo', style: { skirt: C.knob, cap: C.knobTop, capR: 0.8, pointer: '#f2efe6', pointerW: 3, ticks: 15, tick: '#3a3a3a' } });
      P.el('rect', { x: 128, y: 344, width: 120, height: 44, rx: 3, fill: '#1a0606', stroke: '#111', 'stroke-width': 2 }, mid);
      var bpmTxt = P.text(mid, 188, 376, '', { fill: '#ff3b22', 'font-size': 28, 'font-family': 'ui-monospace,Menlo,Consolas,monospace', 'font-weight': 700, 'class': 'pn-bpm' });
      P.text(mid, 188, 402, 'BPM', { fill: C.ink, 'font-size': 9, 'letter-spacing': 2 });
      var trimLayer = P.g(svg, { 'class': 'pn-trimrow' });
      M.trimTitle(trimLayer, 300, 326, { 'text-anchor': 'start', fill: C.ink, 'font-size': 9.5, 'font-weight': 700, 'letter-spacing': 1 });
      M.buildTrimsInto(trimLayer);

      // lower section
      var low = P.g(svg, { 'class': 'pn-lower' });
      P.el('rect', { x: 10, y: 428, width: 1180, height: 282, rx: 6, fill: C.lower, stroke: C.lowerEdge, 'stroke-width': 2 }, low);
      P.el('rect', { x: 200, y: 442, width: 970, height: 30, rx: 2, fill: '#2e2e30' }, low);
      M.stepInfo = P.text(low, 212, 462, '', { 'text-anchor': 'start', fill: '#ece6d4', 'font-size': 12, 'font-weight': 600, 'class': 'pn-info' });
      var ss = P.button(low, { x: 30, y: 520, w: 70, h: 64, rx: 3, label: 'START', size: 11, fill: C.keyIvory, ink: '#1a1a1a', aria: 'Start or stop the song', onClick: function () { M.transport(); } });
      var st2 = P.button(low, { x: 110, y: 520, w: 70, h: 64, rx: 3, label: 'STOP', size: 11, fill: C.key, ink: '#1a1a1a', aria: 'Stop the song',
        onClick: function () { var tr = P.host.transport || {}; if (isFn(tr.stop)) safe(function () { tr.stop(); }); else if (tr.playing) M.transport(); } });
      ss.setDisabled(!M.canTransport()); st2.setDisabled(!M.canTransport());
      var ssLed = P.el('circle', { cx: 65, cy: 508, r: 4.5, fill: C.ledOff }, low);
      M.onPlaying = function (on) { ssLed.setAttribute('fill', on ? C.led : C.ledOff); };
      var kw = 970 / 16;
      for (var i = 0; i < STEPS; i++) (function (i) {
        var kx = 200 + kw * i + (kw - 48) / 2;
        var led = P.el('circle', { cx: kx + 24, cy: 498, r: 4.5, fill: C.ledOff, stroke: 'rgba(0,0,0,.5)', 'stroke-width': 0.8 }, low);
        var acc = P.el('rect', { x: kx + 34, y: 494, width: 8, height: 8, rx: 1, fill: 'none', stroke: '#8a8880', 'stroke-width': 1 }, low);
        var b = P.button(low, { x: kx, y: 512, w: 48, h: 72, rx: 3, fill: i % 4 === 0 ? C.keyIvory : C.key, cls: 'pn-key', aria: 'Step ' + (i + 1), onClick: function (e) { M.clickKey(i, e); } });
        b.g.setAttribute('aria-pressed', 'false');
        var cur = P.el('rect', { x: kx - 3, y: 509, width: 54, height: 78, rx: 5, fill: 'none', stroke: '#ff8a3a', 'stroke-width': 2.6, display: 'none', 'pointer-events': 'none' }, low);
        P.text(low, kx + 24, 604, String(i + 1), { fill: '#ece6d4', 'font-size': 12, 'font-weight': 600 });
        M.key({
          set: function (cell, editable) {
            led.setAttribute('fill', cell ? C.led : C.ledOff);
            acc.setAttribute('fill', cell && cell.acc ? C.led : 'none');
            b.g.setAttribute('aria-pressed', cell ? 'true' : 'false');
            b.g.setAttribute('aria-label', 'Step ' + (i + 1) + (cell ? (cell.acc ? ', on, accent' : ', on') : ', off') + ' (click toggles, Shift-click accent)');
            b.setDisabled(!editable);
          },
          cursor: function (on) { cur.setAttribute('display', on ? 'inline' : 'none'); }
        });
      })(i);
      // instrument select: the hardware prints the voices under the step keys
      P.text(low, 190, 636, 'INST', { 'text-anchor': 'end', fill: '#ece6d4', 'font-size': 9.5, 'font-weight': 700 });
      var selBtns = {}, sw = 970 / V909.length;
      V909.forEach(function (v, k) {
        var b = P.button(low, { x: 200 + sw * k + 4, y: 622, w: sw - 8, h: 22, rx: 2, label: abbr(v), size: 10.5, fill: '#2e2e30', ink: '#ece6d4', stroke: '#1a1a1a',
          role: 'radio', aria: 'Select ' + (VNAME[v.slice(0, 2)] || v), onClick: function () { M.select(v); } });
        selBtns[v] = b;
      });
      P.el('rect', { x: 200, y: 656, width: 760, height: 18, rx: 2, fill: '#2e2e30' }, low);
      P.text(low, 212, 669, 'click a key: step on / off   ·   shift-click: accent   ·   double-click a knob: song value', { 'text-anchor': 'start', fill: '#ece6d4', 'font-size': 10 });

      var sig = '';
      function paint() {
        var s = M.st.sel + '|' + V909.map(function (v) { return M.present(v) ? 1 : 0; }).join('') + '|' + P.canEdit();
        if (s === sig) return;
        sig = s;
        grpState.forEach(function (gs) {
          gs.hi.setAttribute('display', gs.grp.voices.indexOf(M.st.sel) >= 0 ? 'inline' : 'none');
          gs.grp.voices.forEach(function (v) {
            var pres = M.present(v);
            gs.vg[v].setAttribute('opacity', pres ? '1' : '0.3');
            gs.adds[v].g.setAttribute('display', pres ? 'none' : 'inline');
            gs.adds[v].setDisabled(!P.canEdit());
          });
        });
        V909.forEach(function (v) {
          var b = selBtns[v], on = v === M.st.sel;
          b.rect.setAttribute('fill', on ? C.orange : '#2e2e30');
          b.txt.setAttribute('fill', on ? '#16060d' : (M.present(v) ? '#ece6d4' : '#8a8880'));
          b.g.setAttribute('aria-checked', on ? 'true' : 'false');
        });
      }
      M.onSelect.push(function () { sig = ''; });
      P.onUpdate(function () {
        paint();
        M.update();
        var b = tempo.v, t = isNum(b) ? String(Math.round(b)) : '--';
        if (bpmTxt.textContent !== t) bpmTxt.textContent = t;
      });
      return {};
    }
  });

  root.Panels = Panels;
})();
