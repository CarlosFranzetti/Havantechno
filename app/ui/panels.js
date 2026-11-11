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
          if (o.numbers) o.numbers.forEach(function (t, i) {
            var q = pt(0, 0, r + (st.numR || 17), a0 + sw * i / (o.numbers.length - 1));
            P.text(art, q[0], q[1] + 3, t, { fill: st.tick || '#d8d8d0', 'font-size': st.numSize || 8 });
          });
          sv('circle', { r: r, fill: st.skirt || '#1b1b1b', stroke: st.edge || '#000', 'stroke-width': 1 }, art);  // skirt
          if (st.flutes) for (var fi = 0; fi < st.flutes; fi++) {
            var fa = 360 * fi / st.flutes, f0 = pt(0, 0, r * (st.fluteIn || 0.74), fa), f1 = pt(0, 0, r - 1, fa);
            sv('line', { x1: f2(f0[0]), y1: f2(f0[1]), x2: f2(f1[0]), y2: f2(f1[1]), stroke: st.flute || 'rgba(255,255,255,.12)', 'stroke-width': 1.6 }, art);
          }
          if (st.cap) sv('circle', { r: r * (st.capR || 0.72), fill: st.cap, stroke: st.capEdge || 'rgba(0,0,0,.35)', 'stroke-width': 1 }, art);
          if (st.capShine) sv('circle', { r: r * (st.capR || 0.72) * 0.6, cx: -r * 0.08, cy: -r * 0.1, fill: st.capShine }, art);
          if (st.shine !== false) sv('ellipse', { rx: r * 0.42, ry: r * 0.22, cx: -r * 0.2, cy: -r * 0.42, fill: 'rgba(255,255,255,.16)' }, art);
          c.rot = sv('g', null, art);
          if (st.wedge) {                 // a wedge pointer knob (range and waveform selectors): pointing along +x, rotated
            sv('path', { d: 'M' + f2(r * 1.18) + ' 0 L' + f2(-r * 0.55) + ' ' + f2(-r * 0.62) + ' Q' + f2(-r * 0.9) + ' 0 ' + f2(-r * 0.55) + ' ' + f2(r * 0.62) + ' Z', fill: st.wedge, stroke: '#000', 'stroke-width': 1 }, c.rot);
            sv('line', { x1: 0, y1: 0, x2: f2(r * 1.05), y2: 0, stroke: st.pointer || '#efe6c8', 'stroke-width': st.pointerW || 2.4, 'stroke-linecap': 'round' }, c.rot);
          } else if (st.dot) sv('circle', { cx: f2(r * (st.dotR || 0.62)), cy: 0, r: st.dotSize || 2.2, fill: st.pointer || '#fff' }, c.rot);
          else sv('line', { x1: f2(st.slot ? -r * 0.8 : r * 0.12), y1: 0, x2: f2(r * (st.slot ? 0.8 : 0.92)), y2: 0, stroke: st.pointer || '#f4f1e8', 'stroke-width': st.pointerW || 2.4, 'stroke-linecap': 'round' }, c.rot);
        }
        c.rot.setAttribute('transform', 'rotate(' + f2(a0 + sw * pos) + ')');
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
      var two = o.values || null;            // a string param with two settings: [off, on]
      if (!two) { var e0 = voice(o.voice || null).entry(o.param); if (e0 && typeof e0.value === 'string') two = optionsOf(o.voice || null, o.param, ['off', 'on']).slice(0, 2); }
      function isOn(v) { if (two) return same(v, two[1]); return v === true || (isNum(v) && v >= 0.5) || v === 'on'; }
      function flip() {
        var vo = voice(o.voice || null), e = vo.entry(o.param);
        if (!vo.dev || !e) return;
        var on = !isOn(pval(o.voice || null, o.param));
        pwrite(o.voice || null, o.param, two ? two[on ? 1 : 0] : typeof e.value === 'boolean' ? on : (on ? 1 : 0), true);
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

  // ==================================================================== synth panels (HVT-303, HVT-D, HVT-106)
  var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function noteName(m) { return isNum(m) ? NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1) : '—'; }
  function rocker(colour) {          // a two-position rocker in a black opening; the pressed half is darker
    return function (art, on, b) {
      var w = b.w, h = b.h;
      sv('rect', { x: -w / 2 - 2, y: -h / 2 - 2, width: w + 4, height: h + 4, rx: 3, fill: '#050505' }, art);
      sv('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 2, fill: colour, stroke: '#000', 'stroke-width': 0.8 }, art);
      sv('rect', { x: -w / 2, y: on ? 0 : -h / 2, width: w, height: h / 2, rx: 2, fill: 'rgba(0,0,0,.38)' }, art);
      sv('line', { x1: -w / 2 + 3, x2: w / 2 - 3, y1: on ? -h / 2 + 4 : h / 2 - 4, y2: on ? -h / 2 + 4 : h / 2 - 4, stroke: 'rgba(255,255,255,.55)', 'stroke-width': 1.4 }, art);
    };
  }
  function lampButton(fill, ink, label, led) {   // a push button with a lamp, lit when on
    return function (art, on, b) {
      sv('rect', { x: -b.w / 2, y: -b.h / 2, width: b.w, height: b.h, rx: 2, fill: fill, stroke: '#111' }, art);
      var t = sv('text', { x: 0, y: 4, 'text-anchor': 'middle', fill: ink, 'font-size': 10, 'font-weight': 700 }, art); t.textContent = label;
      sv('circle', { cx: 0, cy: -b.h / 2 - 7, r: 3.4, fill: on ? (led || '#ff3b22') : '#3a1510' }, art);
    };
  }

  // ------------------------------------------------------------------ HVT-303
  var C303 = { cheek: '#121212', panel: '#c7cace', panelLo: '#b4b7bc', ink: '#161616', orange: '#e8671a', led: '#ff4a1a', ledOff: '#55301c',
    key: '#2a2a2c', keyInk: '#ecebe6', white: '#e9e9e4', black: '#1c1c1e', btn: '#3a3a3d' };
  Panels.define('hvt303', {
    label: 'HVT-303 bass line synthesizer', size: { w: 1200, h: 640 }, win: { w: 1040 },
    match: function (d) { return d.kind === 'instrument' && d.type === 'tb303'; },
    build: function (P) {
      var svg = P.svg, C = C303, host = P.host;
      P.el('rect', { x: 0, y: 0, width: 1200, height: 640, rx: 14, fill: C.cheek }, svg);
      P.el('rect', { x: 34, y: 12, width: 1132, height: 616, rx: 4, fill: C.panel }, svg);
      P.el('rect', { x: 34, y: 262, width: 1132, height: 366, fill: C.panelLo }, svg);
      for (var gy = 20; gy < 628; gy += 4) P.el('line', { x1: 34, x2: 1166, y1: gy, y2: gy, stroke: 'rgba(255,255,255,.07)', 'stroke-width': 1 }, svg);   // brushed metal
      P.text(svg, 60, 58, 'HVT-303', { 'text-anchor': 'start', fill: C.ink, 'font-size': 32, 'font-weight': 800, 'font-style': 'italic' });
      P.text(svg, 1140, 56, 'HAVANTECHNO', { 'text-anchor': 'end', fill: '#c8336f', 'font-size': 22, 'font-weight': 800, 'letter-spacing': 4 });
      P.el('rect', { x: 210, y: 42, width: 560, height: 4, fill: C.orange }, svg);

      // knob band: waveform switch, the six knobs, slide time trimmer, volume
      var ks = { skirt: '#161616', cap: '#2e2e30', capR: 0.7, pointer: '#f4f4f0', pointerW: 2.8, ticks: 11, tick: C.ink, label: C.ink, edge: '#000', numSize: 8.5 };
      var N10 = ['0', '2', '4', '6', '8', '10'];
      P.text(svg, 100, 120, 'WAVEFORM', { fill: C.ink, 'font-size': 10.5, 'font-weight': 700 });
      var waves = P.options(null, 'wave', ['saw', 'square']);
      P.text(svg, 82, 152, 'SAW', { 'text-anchor': 'end', fill: C.ink, 'font-size': 9.5, 'font-weight': 600 });
      P.text(svg, 82, 186, 'SQR', { 'text-anchor': 'end', fill: C.ink, 'font-size': 9.5, 'font-weight': 600 });
      P.toggle(svg, { x: 104, y: 168, w: 14, h: 40, param: 'wave', values: [waves[0], waves[1]], label: 'Waveform saw / square',
        draw: function (art, on, b) {
          sv('rect', { x: -9, y: -24, width: 18, height: 48, rx: 3, fill: '#0b0b0b', stroke: '#555' }, art);
          sv('rect', { x: -7, y: on ? 2 : -22, width: 14, height: 20, rx: 2, fill: '#d9d9d4', stroke: '#222' }, art);
        } });
      var row = [['TUNING', 'tune'], ['CUT OFF FREQ', 'cutoff'], ['RESONANCE', 'resonance'], ['ENV MOD', 'envMod'], ['DECAY', 'decay'], ['ACCENT', 'accent']];
      row.forEach(function (k, i) {
        P.knob(svg, { x: 210 + i * 125, y: 170, r: 30, param: k[1], label: k[0].charAt(0) + k[0].slice(1).toLowerCase(), caption: k[0], captionY: -58, captionSize: 11, style: ks, numbers: N10 });
      });
      P.knob(svg, { x: 960, y: 170, r: 16, param: 'slideTime', label: 'Slide time', caption: 'SLIDE TIME', captionY: -40, captionSize: 9.5, kind: 'trim',
        style: { skirt: '#9a9a96', edge: '#3a3a38', ticks: 0, slot: true, pointer: '#2a2a28', label: C.ink } });
      P.knob(svg, { x: 1080, y: 170, r: 30, param: 'level', label: 'Volume', caption: 'VOLUME', captionY: -58, captionSize: 11, style: ks, numbers: N10 });
      P.el('line', { x1: 50, x2: 1150, y1: 258, y2: 258, stroke: C.ink, 'stroke-width': 1.2 }, svg);

      // step band
      var st = { sel: 0, oct: 36, sig: '', vw: null, cur: -2, playing: null };
      P.el('rect', { x: 60, y: 272, width: 1080, height: 30, rx: 2, fill: '#2b2b2d' }, svg);
      var info = P.text(svg, 72, 292, '', { 'text-anchor': 'start', fill: '#f0efe9', 'font-size': 12.5, 'font-weight': 600, 'class': 'pn-info' });
      var ss = P.button(svg, { x: 60, y: 344, w: 84, h: 46, rx: 4, label: 'RUN / STOP', size: 10.5, fill: C.btn, ink: C.keyInk, aria: 'Start or stop the song', onClick: P.transportToggle });
      ss.setDisabled(!P.canTransport());
      var runLed = P.el('circle', { cx: 102, cy: 330, r: 4.5, fill: C.ledOff }, svg);
      var kw = 980 / 16, keys = [];
      for (var i = 0; i < STEPS; i++) (function (i) {
        var kx = 160 + kw * i + (kw - 50) / 2;
        var nm = P.text(svg, kx + 25, 318, '', { fill: C.ink, 'font-size': 10.5, 'font-weight': 700 });
        var led = P.el('circle', { cx: kx + 25, cy: 332, r: 4, fill: C.ledOff }, svg);
        var b = P.button(svg, { x: kx, y: 342, w: 50, h: 48, rx: 4, fill: C.key, cls: 'pn-key', label: String(i + 1), size: 12, ink: C.keyInk, aria: 'Step ' + (i + 1),
          onClick: function (e) {
            st.sel = i; st.sig = '';
            if (e && e.shiftKey) cmd('accent'); else if (e && e.altKey) cmd('slide');
          } });
        var sel = P.el('rect', { x: kx - 3, y: 339, width: 56, height: 54, rx: 6, fill: 'none', stroke: C.orange, 'stroke-width': 2.6, display: 'none', 'pointer-events': 'none' }, svg);
        var cur = P.el('rect', { x: kx + 4, y: 394, width: 42, height: 3, fill: '#ffffff', display: 'none' }, svg);
        var ma = P.text(svg, kx + 15, 410, 'A', { fill: '#7a7c80', 'font-size': 10, 'font-weight': 800 });
        var ms = P.text(svg, kx + 35, 410, 'S', { fill: '#7a7c80', 'font-size': 10, 'font-weight': 800 });
        keys.push({ b: b, nm: nm, led: led, sel: sel, cur: cur, ma: ma, ms: ms });
      })(i);

      // lower band: the one-octave note keys, octave and step functions, tempo
      var lowY = 432, wk = 56, wx0 = 160, whites = [0, 2, 4, 5, 7, 9, 11, 12], blacks = [[1, 0], [3, 1], [6, 3], [8, 4], [10, 5]];
      var noteKeys = [];
      P.text(svg, wx0 - 14, lowY + 70, 'NOTE', { 'text-anchor': 'end', fill: C.ink, 'font-size': 10, 'font-weight': 700 });
      whites.forEach(function (semi, j) {
        var b = P.button(svg, { x: wx0 + j * wk, y: lowY, w: wk - 4, h: 150, rx: 3, fill: C.white, aria: 'Note ' + NOTE_NAMES[semi % 12] + (semi === 12 ? ' (octave up)' : ''), cls: 'pn-note',
          onClick: function () { setNote(semi); } });
        P.text(b.g, (wk - 4) / 2, 140, NOTE_NAMES[semi % 12], { fill: C.ink, 'font-size': 11, 'font-weight': 700 });
        noteKeys.push({ semi: semi, b: b, fill: C.white });
      });
      blacks.forEach(function (bk) {
        var b = P.button(svg, { x: wx0 + (bk[1] + 1) * wk - 19, y: lowY, w: 34, h: 92, rx: 3, fill: C.black, aria: 'Note ' + NOTE_NAMES[bk[0]], cls: 'pn-note',
          onClick: function () { setNote(bk[0]); } });
        noteKeys.push({ semi: bk[0], b: b, fill: C.black });
      });
      var fx = 640, fns = [['DOWN', 'down', 'Octave down'], ['UP', 'up', 'Octave up'], ['ACCENT', 'accent', 'Accent on the selected step'], ['SLIDE', 'slide', 'Slide from the selected step'], ['REST', 'rest', 'Make the selected step a rest']];
      var fbtn = {};
      fns.forEach(function (f, j) {
        var b = P.button(svg, { x: fx + j * 82, y: lowY + 40, w: 70, h: 46, rx: 4, label: f[0], size: 11, fill: C.btn, ink: C.keyInk, aria: f[2], onClick: function () { cmd(f[1]); } });
        b.led = P.el('circle', { cx: fx + j * 82 + 35, cy: lowY + 26, r: 4, fill: C.ledOff }, svg);
        fbtn[f[1]] = b;
      });
      var octTxt = P.text(svg, fx + 76, lowY + 112, '', { fill: C.ink, 'font-size': 11, 'font-weight': 700 });
      P.text(svg, fx + 205, lowY + 112, 'shift-click a step: accent  ·  alt-click: slide', { fill: '#3c3e42', 'font-size': 10 });
      P.text(svg, 1080, lowY + 6, 'TEMPO', { fill: C.ink, 'font-size': 10.5, 'font-weight': 700 });
      var tempo = P.knob(svg, { x: 1080, y: lowY + 58, r: 26, label: 'Tempo', value: P.tempoValue([40, 300]), kind: 'tempo', style: ks });
      var bpm = P.text(svg, 1080, lowY + 118, '', { fill: C.ink, 'font-size': 12, 'font-weight': 700, 'class': 'pn-bpm' });

      function cellAt(i) { return st.vw ? st.vw.cells[i] : null; }
      function setNote(semi) {
        var c = cellAt(st.sel), base = c && isNum(c.note) ? Math.floor(c.note / 12) * 12 : st.oct, n = clamp(base + semi, 0, 127);
        st.oct = base;
        P.editCell(null, st.sel, function (cell) { return cell ? { note: n } : { note: n, vel: DEFAULT_VEL, len: 1 }; });
        st.sig = '';
      }
      function cmd(k) {
        var c = cellAt(st.sel);
        if (k === 'down' || k === 'up') {
          var d = k === 'up' ? 12 : -12;
          if (c && isNum(c.note)) P.editCell(null, st.sel, function (cell) { return cell && isNum(cell.note) ? { note: clamp(cell.note + d, 0, 127) } : undefined; });
          else st.oct = clamp(st.oct + d, 0, 120);
        } else if (k === 'accent' || k === 'slide') {
          var f = k === 'accent' ? 'acc' : 'slide';
          P.editCell(null, st.sel, function (cell) { if (!cell) return undefined; var o = {}; o[f] = cell[f] ? null : true; return o; });
        } else if (k === 'rest') P.editCell(null, st.sel, function (cell) { return cell ? null : undefined; });
        st.sig = '';
      }
      P.onUpdate(function () {
        if (P.state.frame % 4 === 0 || st.sig === '') st.vw = P.stepView(null);
        var vw = st.vw, edit = P.canEdit() && !!vw;
        var sig = (vw ? vw.si + ':' + vw.variant + ':' + vw.bar + ':' + JSON.stringify(vw.cells) : 'none') + '|' + st.sel + '|' + st.oct + '|' + edit;
        if (sig !== st.sig) {
          st.sig = sig;
          keys.forEach(function (k, i) {
            var c = vw ? vw.cells[i] : null, note = c && isNum(c.note) ? c.note : null;
            k.nm.textContent = c ? noteName(note != null ? note : st.oct) : '';
            k.led.setAttribute('fill', c ? C.led : C.ledOff);
            k.sel.setAttribute('display', i === st.sel ? 'inline' : 'none');
            k.ma.setAttribute('fill', c && c.acc ? C.orange : '#8a8c90');
            k.ms.setAttribute('fill', c && c.slide ? C.orange : '#8a8c90');
            k.b.g.setAttribute('aria-pressed', i === st.sel ? 'true' : 'false');
            k.b.g.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + (c ? noteName(note) + (c.acc ? ', accent' : '') + (c.slide ? ', slide' : '') : 'rest') + (i === st.sel ? ' (selected)' : ''));
          });
          var c = cellAt(st.sel), selNote = c && isNum(c.note) ? c.note : null;
          noteKeys.forEach(function (nk) {
            var lit = selNote != null && ((selNote % 12) === (nk.semi % 12)) && (nk.semi === 12 ? false : true);
            nk.b.rect.setAttribute('fill', lit ? '#f09a5c' : nk.fill);
            nk.b.setDisabled(!edit);
          });
          fbtn.accent.led.setAttribute('fill', c && c.acc ? C.led : C.ledOff);
          fbtn.slide.led.setAttribute('fill', c && c.slide ? C.led : C.ledOff);
          ['down', 'up', 'accent', 'slide', 'rest'].forEach(function (k) { fbtn[k].setDisabled(!edit); });
          octTxt.textContent = 'OCTAVE ' + (Math.floor((selNote != null ? selNote : st.oct) / 12) - 1);
          var t = 'STEP ' + (st.sel + 1) + '  ·  ' + (c ? noteName(selNote) + (c.acc ? '  ·  accent' : '') + (c.slide ? '  ·  slide' : '') : 'rest') + '   —   ';
          if (!vw) t += P.canEdit() ? 'no pattern' : 'step editing is in the main window';
          else t += 'section ' + vw.section + (vw.variant ? '  ·  pattern ' + vw.variant + (vw.bars > 1 ? '  ·  bar ' + (vw.bar + 1) + '/' + vw.bars : '') : '  ·  not playing here yet');
          info.textContent = t;
        }
        var step = P.playStep();
        if (step !== st.cur) { st.cur = step; keys.forEach(function (k, i) { k.cur.setAttribute('display', i === step ? 'inline' : 'none'); k.led.setAttribute('stroke', i === step ? '#fff' : 'none'); }); }
        var pl = step >= 0 || !!safe(function () { return host.transport.playing; }, false);
        if (pl !== st.playing) { st.playing = pl; runLed.setAttribute('fill', pl ? C.led : C.ledOff); }
        var bt = isNum(tempo.v) ? (Math.round(tempo.v * 10) / 10).toFixed(1) + ' BPM' : '';
        if (bpm.textContent !== bt) bpm.textContent = bt;
      });
      return {};
    }
  });

  // ------------------------------------------------------------------ HVT-D
  var CD = { wood: '#5a3520', woodHi: '#7a4a2c', woodLo: '#3e2414', face: '#141414', ink: '#ecebe4', line: '#bdbbb2', blue: '#3a6fc4', orange: '#e2742a', ivory: '#e9e1c8' };
  Panels.define('hvtd', {
    label: 'HVT-D mono synthesizer', size: { w: 1400, h: 700 }, win: { w: 1120 },
    match: function (d) { return d.kind === 'instrument' && d.type === 'modeld'; },
    build: function (P) {
      var svg = P.svg, C = CD, host = P.host;
      function cheek(x) {
        P.el('rect', { x: x, y: 0, width: 56, height: 700, rx: 8, fill: C.wood }, svg);
        for (var k = 0; k < 9; k++) P.el('path', { d: 'M' + (x + 6 + k * 5.5) + ' 0 Q' + (x + 12 + k * 5) + ' 350 ' + (x + 4 + k * 6) + ' 700', stroke: k % 2 ? C.woodHi : C.woodLo, 'stroke-width': 1.4, fill: 'none', opacity: 0.7 }, svg);
      }
      P.el('rect', { x: 40, y: 0, width: 1320, height: 700, fill: '#0c0a09' }, svg);
      cheek(0); cheek(1344);
      var defs = P.el('defs', null, svg), pat = P.el('pattern', { id: 'pn-tex-' + Math.floor(Math.random() * 1e9), width: 6, height: 6, patternUnits: 'userSpaceOnUse' }, defs);
      P.el('rect', { width: 6, height: 6, fill: C.face }, pat);
      P.el('circle', { cx: 1.5, cy: 1.5, r: 0.7, fill: '#1e1e1e' }, pat); P.el('circle', { cx: 4.5, cy: 4, r: 0.6, fill: '#0a0a0a' }, pat);
      P.el('rect', { x: 62, y: 14, width: 1276, height: 452, rx: 3, fill: 'url(#' + pat.getAttribute('id') + ')', stroke: '#2a2a2a' }, svg);
      P.el('rect', { x: 62, y: 430, width: 1276, height: 36, fill: 'rgba(255,255,255,.03)' }, svg);
      var ks = { skirt: '#1a1a1a', cap: '#c3c6ca', capR: 0.5, capShine: 'rgba(255,255,255,.35)', flutes: 18, dot: true, dotR: 0.38, dotSize: 2.1, pointer: '#ffffff', sweep: 300, ticks: 11, tick: C.line, label: C.ink, numSize: 8, numR: 16 };
      var big = Object.assign({}, ks, { capR: 0.58 }), N10 = ['0', '2', '4', '6', '8', '10'], N5 = ['-5', '-3', '-1', '+1', '+3', '+5'];
      var wedgeSt = { skirt: '#151515', wedge: '#1d1d1d', pointer: C.ivory, ticks: 6, tick: C.line, label: C.ink, shine: false };
      var K = function (x, y, p, cap, o) { o = o || {}; return P.knob(svg, Object.assign({ x: x, y: y, r: o.r || 22, param: p, label: cap.toLowerCase(), caption: cap, captionY: -(o.r || 22) - 24, captionSize: 9.5, style: o.st || ks, numbers: o.numbers || N10 }, o.extra || {})); };
      var R = function (x, y, p, cap, colour, values) {
        var t = P.toggle(svg, { x: x, y: y, w: 18, h: 30, param: p, label: cap.toLowerCase(), values: values, draw: rocker(colour) });
        P.text(svg, x, y + 30, cap, { fill: C.ink, 'font-size': 8.5, 'font-weight': 700 });
        return t;
      };
      function section(x0, x1, title) {
        P.el('line', { x1: x0 + 8, x2: x1 - 8, y1: 444, y2: 444, stroke: C.line, 'stroke-width': 1 }, svg);
        P.el('line', { x1: x0 + 8, x2: x0 + 8, y1: 436, y2: 444, stroke: C.line, 'stroke-width': 1 }, svg);
        P.el('line', { x1: x1 - 8, x2: x1 - 8, y1: 436, y2: 444, stroke: C.line, 'stroke-width': 1 }, svg);
        var t = P.text(svg, (x0 + x1) / 2, 448, title, { fill: C.ink, 'font-size': 10.5, 'font-weight': 700, 'letter-spacing': 2 });
        P.el('rect', { x: (x0 + x1) / 2 - title.length * 4.6 - 8, y: 436, width: title.length * 9.2 + 16, height: 18, fill: C.face }, svg);
        svg.appendChild(t);
        if (x0 > 62) P.el('line', { x1: x0, x2: x0, y1: 28, y2: 420, stroke: '#3a3a3a', 'stroke-width': 1 }, svg);
      }
      // CONTROLLERS
      section(62, 236, 'CONTROLLERS');
      K(120, 92, 'tune', 'TUNE', { numbers: N5 });
      K(120, 212, 'glide', 'GLIDE');
      K(120, 332, 'modMix', 'MOD MIX', { numbers: ['OSC3', '', '', '', '', 'NOISE'] });
      R(198, 120, 'oscMod', 'OSC MOD', C.orange);
      R(198, 240, 'filterMod', 'FILT MOD', C.orange);
      // OSCILLATOR BANK
      section(236, 600, 'OSCILLATOR BANK');
      var RL = { lo: 'LO', 32: "32'", 16: "16'", 8: "8'", 4: "4'", 2: "2'" };
      var WL = { tri: 'TRI', shark: 'SHK', revsaw: 'RSAW', saw: 'SAW', square: 'SQR', wide: 'WIDE', narrow: 'NAR' };
      [1, 2, 3].forEach(function (n, j) {
        var y = 96 + j * 118;
        P.text(svg, 248, y - 44, 'OSC ' + n, { 'text-anchor': 'start', fill: C.ink, 'font-size': 9.5, 'font-weight': 700 });
        P.choice(svg, { x: 300, y: y, r: 20, param: 'osc' + n + 'Range', options: ['lo', '32', '16', '8', '4', '2'], labels: RL, label: 'oscillator ' + n + ' range', style: wedgeSt, sweep: 200, legendR: 15, legendSize: 8 });
        if (n > 1) K(418, y, 'osc' + n + 'Detune', 'FREQUENCY', { r: 25, st: big, numbers: ['-7', '', '', '0', '', '', '+7'], extra: { label: 'oscillator ' + n + ' frequency' } });
        else R(418, y, 'osc3Keys', 'OSC 3 CTRL', C.blue);
        P.choice(svg, { x: 536, y: y, r: 20, param: 'osc' + n + 'Wave', options: n === 3 ? ['tri', 'revsaw', 'saw', 'square', 'wide', 'narrow'] : ['tri', 'shark', 'saw', 'square', 'wide', 'narrow'], labels: WL, label: 'oscillator ' + n + ' waveform', style: wedgeSt, sweep: 200, legendR: 15, legendSize: 8 });
      });
      // MIXER
      section(600, 850, 'MIXER');
      [['mixOsc1', 'OSC 1'], ['mixFeedback', 'EXT IN'], ['mixOsc2', 'OSC 2'], ['mixNoise', 'NOISE'], ['mixOsc3', 'OSC 3']].forEach(function (m, j) {
        var y = 62 + j * 78;
        K(680, y + 8, m[0], '', { r: 18, numbers: [] });
        P.text(svg, 725, y + 12, m[1], { 'text-anchor': 'start', fill: C.ink, 'font-size': 9.5, 'font-weight': 700 });
      });
      R(806, 296, 'noiseType', 'WHITE/PINK', C.ivory, P.options(null, 'noiseType', ['white', 'pink']).slice(0, 2));
      // MODIFIERS
      section(850, 1214, 'MODIFIERS');
      P.text(svg, 1032, 40, 'FILTER', { fill: C.ink, 'font-size': 10, 'font-weight': 700, 'letter-spacing': 1 });
      K(930, 104, 'cutoff', 'CUTOFF', { r: 26, st: big, numbers: N5 });
      K(1040, 104, 'emphasis', 'EMPHASIS', { r: 22 });
      K(1150, 104, 'contour', 'CONTOUR AMT', { r: 22 });
      R(868, 186, 'keyTrack1', 'KBD 1', C.blue); R(902, 186, 'keyTrack2', 'KBD 2', C.blue);
      P.text(svg, 1032, 196, 'FILTER CONTOUR', { fill: C.ink, 'font-size': 9.5, 'font-weight': 700, 'letter-spacing': 1 });
      K(960, 252, 'fAttack', 'ATTACK'); K(1060, 252, 'fDecay', 'DECAY'); K(1160, 252, 'fSustain', 'SUSTAIN');
      P.text(svg, 1032, 316, 'LOUDNESS CONTOUR', { fill: C.ink, 'font-size': 9.5, 'font-weight': 700, 'letter-spacing': 1 });
      K(960, 372, 'attack', 'ATTACK'); K(1060, 372, 'decay', 'DECAY'); K(1160, 372, 'sustain', 'SUSTAIN');
      // OUTPUT
      section(1214, 1338, 'OUTPUT');
      K(1276, 104, 'level', 'VOLUME', { r: 26, st: big });
      P.text(svg, 1276, 300, 'HVT-D', { fill: C.ink, 'font-size': 30, 'font-weight': 300, 'letter-spacing': 2 });

      // keyboard bed: wheels block (decay and glide rockers, mod wheel = modAmount), the 44 keys
      P.el('rect', { x: 56, y: 476, width: 1288, height: 224, fill: '#0f0d0c' }, svg);
      P.el('rect', { x: 62, y: 478, width: 1276, height: 26, fill: '#1a1715' }, svg);
      P.text(svg, 80, 497, 'HAVANTECHNO', { 'text-anchor': 'start', fill: '#ff5fa2', 'font-size': 15, 'font-weight': 800, 'letter-spacing': 3 });
      R(98, 548, 'decaySwitch', 'DECAY', C.ivory); R(150, 548, 'glideOn', 'GLIDE', C.ivory);
      P.el('rect', { x: 78, y: 596, width: 34, height: 96, rx: 4, fill: '#050505' }, svg);
      P.el('rect', { x: 84, y: 602, width: 22, height: 84, rx: 6, fill: '#2a2a2a' }, svg);
      for (var wl = 0; wl < 8; wl++) P.el('line', { x1: 86, x2: 104, y1: 610 + wl * 10, y2: 610 + wl * 10, stroke: '#444', 'stroke-width': 1.2 }, svg);
      P.text(svg, 95, 600, '', { fill: C.ink });
      P.text(svg, 95, 592, 'PITCH', { fill: '#8a8880', 'font-size': 8 });
      var modWheel = P.control(svg, { x: 152, y: 644, r: 42, hit: { w: 34, h: 96 }, param: 'modAmount', label: 'Mod wheel (modulation amount)', kind: 'wheel',
        draw: function (art, pos, c) {
          if (!c.built) {
            c.built = true;
            sv('rect', { x: -17, y: -48, width: 34, height: 96, rx: 4, fill: '#050505' }, art);
            sv('rect', { x: -11, y: -42, width: 22, height: 84, rx: 6, fill: '#2f2f2f' }, art);
            c.ridges = sv('g', null, art);
          }
          while (c.ridges.firstChild) c.ridges.removeChild(c.ridges.firstChild);
          for (var k = 0; k < 9; k++) { var yy = -40 + ((k * 10 + (1 - pos) * 40) % 80); sv('line', { x1: -9, x2: 9, y1: f2(yy), y2: f2(yy), stroke: '#555', 'stroke-width': 1.2 }, c.ridges); }
          sv('rect', { x: -11, y: f2(-42 + 84 * (1 - pos) - 2), width: 22, height: 4, fill: '#e8e3d0' }, c.ridges);
        } });
      P.text(svg, 152, 592, 'MOD', { fill: C.ink, 'font-size': 8, 'font-weight': 700 });
      var aud = typeof host.audition === 'function';
      var kx0 = 200, kx1 = 1330, whitesN = 26, ww = (kx1 - kx0) / whitesN, kb = P.g(svg, { 'class': 'pn-keys', 'aria-hidden': aud ? 'false' : 'true' });
      var WHITE = [0, 2, 4, 5, 7, 9, 11], m = 41, wi = 0, blacksD = [];
      for (; m <= 84; m++) {
        var pc = m % 12, isW = WHITE.indexOf(pc) >= 0;
        if (isW) {
          (function (mm, x) {
            var r = P.el('rect', { x: f2(x), y: 512, width: f2(ww - 1.5), height: 180, rx: 2, fill: '#ece8dc', stroke: '#222' }, kb);
            if (aud) P.listen(r, 'pointerdown', function () { safe(function () { host.audition(P.device.track, { midi: mm, vel: 0.85, dur: 0.3 }); }); });
          })(m, kx0 + wi * ww);
          wi++;
        } else blacksD.push([m, kx0 + wi * ww - ww * 0.3]);
      }
      blacksD.forEach(function (bk) {
        var r = P.el('rect', { x: f2(bk[1]), y: 512, width: f2(ww * 0.6), height: 112, rx: 2, fill: '#151515', stroke: '#000' }, kb);
        if (aud) P.listen(r, 'pointerdown', function () { safe(function () { host.audition(P.device.track, { midi: bk[0], vel: 0.85, dur: 0.3 }); }); });
      });
      if (!aud) kb.setAttribute('opacity', '0.92');
      return {};
    }
  });

  // ------------------------------------------------------------------ HVT-106
  var CJ = { body: '#29292b', strip: '#d9d6cc', ink: '#ecebe6', dark: '#151515', blue: '#3b7bd6', orange: '#e8781e', yellow: '#e2c21c', red: '#d63a2c', green: '#3aa35b',
    teal: '#2aa7a0', purple: '#8f62c8', btn: '#c9c7c0' };
  Panels.define('hvt106', {
    label: 'HVT-106 polyphonic synthesizer', size: { w: 1600, h: 470 }, win: { w: 1200 },
    match: function (d) { return d.kind === 'instrument' && d.type === 'juno'; },
    build: function (P) {
      var svg = P.svg, C = CJ;
      P.el('rect', { x: 0, y: 0, width: 1600, height: 470, rx: 10, fill: '#111' }, svg);
      P.el('rect', { x: 10, y: 10, width: 1580, height: 368, rx: 4, fill: C.body }, svg);
      P.el('rect', { x: 10, y: 386, width: 1580, height: 74, rx: 4, fill: '#1c1c1e' }, svg);
      P.text(svg, 40, 434, 'HAVANTECHNO', { 'text-anchor': 'start', fill: '#ff5fa2', 'font-size': 22, 'font-weight': 800, 'letter-spacing': 4 });
      P.text(svg, 1560, 438, 'HVT-106', { 'text-anchor': 'end', fill: C.ink, 'font-size': 30, 'font-weight': 300, 'letter-spacing': 2 });
      P.text(svg, 800, 432, 'POLYPHONIC SYNTHESIZER', { fill: '#8a8a8a', 'font-size': 11, 'letter-spacing': 6 });
      function section(x0, x1, title, colour) {
        P.el('rect', { x: x0 + 4, y: 20, width: x1 - x0 - 8, height: 20, fill: C.strip }, svg);
        P.text(svg, (x0 + x1) / 2, 35, title, { fill: C.dark, 'font-size': 11, 'font-weight': 800, 'letter-spacing': 2 });
        P.el('rect', { x: x0 + 4, y: 42, width: x1 - x0 - 8, height: 5, fill: colour }, svg);
      }
      var FL = 150, FY = 190;
      function F(x, p, cap, o) { o = o || {}; return P.fader(svg, Object.assign({ x: x, y: FY, len: FL, param: p, label: cap.toLowerCase(), caption: cap, captionSize: 9.5, cap: o.cap || '#c4c3bd', labelInk: C.ink, tick: '#8a8a8a' }, o)); }
      function radio(x, y, p, opts, labels, o) { o = o || {}; return P.radio(svg, Object.assign({ x: x, y: y, w: 46, h: 22, gap: 16, vertical: true, param: p, options: opts, labels: labels, size: 9.5, fill: C.btn, ink: C.dark, ledY: -6 }, o)); }
      function lamp(x, y, p, lbl) {
        return P.toggle(svg, { x: x, y: y, w: 46, h: 22, param: p, label: lbl.toLowerCase(), draw: lampButton(C.btn, C.dark, lbl) });
      }
      // performance
      section(10, 250, 'CONTROL', C.purple);
      P.knob(svg, { x: 60, y: 110, r: 20, param: 'tune', label: 'tune', caption: 'TUNE', captionY: -34, captionSize: 9.5, style: { skirt: '#111', cap: '#3a3a3c', pointer: '#fff', ticks: 11, tick: '#8a8a8a', label: C.ink } });
      F(130, 'bend', 'BEND'); F(190, 'portamento', 'PORTA');
      radio(36, 196, 'voiceMode', ['poly', 'unison'], { poly: 'POLY', poly1: 'POLY 1', poly2: 'POLY 2', unison: 'UNI' }, { gap: 18 });
      // LFO
      section(250, 380, 'LFO', C.blue);
      F(285, 'lfoRate', 'RATE'); F(345, 'lfoDelay', 'DELAY');
      lamp(315, 330, 'lfoAuto', 'AUTO');
      // DCO
      section(380, 770, 'DCO', C.orange);
      F(410, 'dcoLfo', 'LFO'); F(460, 'pwm', 'PWM');
      P.text(svg, 520, 90, 'PWM', { fill: C.ink, 'font-size': 9.5, 'font-weight': 700 });
      radio(497, 112, 'pwmMode', ['lfo', 'manual', 'env'], { lfo: 'LFO', man: 'MAN', manual: 'MAN', env: 'ENV' });
      P.text(svg, 582, 90, 'RANGE', { fill: C.ink, 'font-size': 9.5, 'font-weight': 700 });
      radio(559, 112, 'range', [16, 8, 4], { 16: "16'", 8: "8'", 4: "4'" });
      lamp(645, 136, 'pulse', 'PULSE'); lamp(645, 196, 'saw', 'SAW');
      F(700, 'sub', 'SUB'); F(745, 'noise', 'NOISE');
      // HPF
      section(770, 850, 'HPF', C.yellow);
      F(810, 'hpf', 'FREQ', { step: 1 });
      // VCF
      section(850, 1120, 'VCF', C.red);
      F(880, 'cutoff', 'FREQ'); F(930, 'resonance', 'RES'); F(980, 'envAmt', 'ENV'); F(1030, 'vcfLfo', 'LFO'); F(1080, 'vcfKey', 'KYBD');
      // VCA
      section(1120, 1230, 'VCA', C.green);
      radio(1132, 112, 'vcaMode', ['env', 'gate'], { env: 'ENV', gate: 'GATE' });
      F(1205, 'level', 'LEVEL');
      // ENV
      section(1230, 1440, 'ENV', C.teal);
      F(1265, 'attack', 'A'); F(1312, 'decay', 'D'); F(1359, 'sustain', 'S'); F(1406, 'release', 'R');
      // CHORUS
      section(1440, 1590, 'CHORUS', C.blue);
      radio(1468, 112, 'chorus', [0, 1, 2], { 0: 'OFF', 1: 'I', 2: 'II' }, { w: 56, h: 26 });
      if (P.voice(null).entry('chorusNoise')) P.knob(svg, { x: 1560, y: 290, r: 13, param: 'chorusNoise', label: 'chorus noise', caption: 'HISS', captionY: -22, captionSize: 8.5, kind: 'trim',
        style: { skirt: '#9a9a96', edge: '#3a3a38', ticks: 0, slot: true, pointer: '#2a2a28', label: C.ink } });
      return {};
    }
  });

  root.Panels = Panels;
})();
