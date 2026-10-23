/* Havantechno widgets (A2). Global: Widgets.
 * Hand-written SVG knobs and sliders, Canvas for meters and curves. No dependencies, no CSS injected:
 * the look lives in ui/theme.css (class names hv-*). Every control is one focusable element with
 * role="slider" (or a native button / select) and works with keyboard, pointer, wheel and touch.
 *
 *   Widgets.knob({label, min, max, value, unit, log, step, size, home, factory, bipolar, format,
 *                 onInput(v), onHold(), onRelease()})  -> {el, set(v), get(), setState(s), setRamp(a,b),
 *                                                          setStock(v), setHome(v|fn), setFactory(v),
 *                                                          setDisabled(b), dispose()}
 *   Widgets.slider({... same, orientation:'h'|'v', length})  -> same
 *   Widgets.toggle({label, value, size, onInput(bool)})       -> {el, set(b), get()}
 *   Widgets.select({label, options, value, onInput(v)})       -> {el, set(v), get(), setOptions(list)}
 *   Widgets.steps({count, cells, onToggle(i, mods), onDrag(i, vel), ink}) -> {el, set(cells), setCursor(i)}
 *   Widgets.meter({orientation, size}) -> {el, set(level, peakHold?)}
 *   Widgets.curve({width, height, draw(ctx, w, h, colors)}) -> {el, redraw()}
 *   Widgets.grMeter({size}) -> {el, set(dB)};  Widgets.correlation({size}) -> {el, set(-1..1)}
 *   Widgets.scale(min, max, log, step, unit) -> {toPos, fromPos, snap, format};  Widgets.colors(el)
 */
(function (root) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var SIZES = ['chip', 'strip', 'face', 'window'];
  var KNOB_PX = { chip: 24, strip: 36, face: 52, window: 64 };
  var SLIDER_LEN = { chip: 56, strip: 80, face: 112, window: 160 };
  var SLIDER_THICK = { chip: 24, strip: 24, face: 28, window: 44 };
  var METER_LEN = { chip: 40, strip: 64, face: 96, window: 140 };
  var METER_THICK = { chip: 6, strip: 8, face: 10, window: 12 };
  var DRAG_PX = 200;          // full knob range by vertical drag (F-S5 round 2 table)
  var FINE = 0.1;             // Shift multiplier
  var COARSE_KEY = 0.01;      // arrow key = 1% of the range (position space)
  var TIP_MS = 800;
  var A0 = 135, SWEEP = 270;  // knob arc: degrees, clockwise from +x, y down

  function doc() { return root.document; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function sizeOf(s) { return SIZES.indexOf(s) >= 0 ? s : 'face'; }
  function noop() {}
  function call(fn, a, b) { if (typeof fn === 'function') { try { return fn(a, b); } catch (e) { if (root.console) root.console.error(e); } } }

  // ---------- DOM helpers (only createElement / createElementNS / setAttribute / appendChild / listeners) ----------
  function h(tag, cls, attrs) {
    var e = doc().createElement(tag);
    if (cls) e.setAttribute('class', cls);
    if (attrs) for (var k in attrs) e.setAttribute(k, String(attrs[k]));
    return e;
  }
  function s(tag, attrs) {
    var e = doc().createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, String(attrs[k]));
    return e;
  }
  function put(parent) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]); return parent; }
  function attr(e, k, v) { e.setAttribute(k, String(v)); }
  function show(e, on) { e.setAttribute('display', on ? 'inline' : 'none'); }
  function setStyle(e, k, v) { try { if (e.style && e.style.setProperty) e.style.setProperty(k, v); else if (e.style) e.style[k] = v; } catch (x) {} }
  function listen(e, type, fn, opt) { e.addEventListener(type, fn, opt); }
  function now() { return Date.now(); }

  // ---------- value scale ----------
  function decimals(range, step) {
    if (step && step >= 1 && Math.floor(step) === step) return 0;
    if (range >= 100) return range >= 1000 ? 0 : 1;
    if (range >= 10) return 1;
    if (range >= 1) return 2;
    return 3;
  }
  function makeScale(min, max, log, step, unit, fmt) {
    var lg = !!log && min > 0 && max > min;
    var span = max - min;
    var dec = decimals(span, step);
    var lmin = lg ? Math.log(min) : 0, lspan = lg ? Math.log(max) - lmin : 0;
    function toPos(v) {
      if (!(span > 0)) return 0;
      return clamp(lg ? (Math.log(Math.max(v, min)) - lmin) / lspan : (v - min) / span, 0, 1);
    }
    function fromPos(p) {
      p = clamp(p, 0, 1);
      return lg ? Math.exp(lmin + p * lspan) : min + p * span;
    }
    function snap(v) {
      v = clamp(v, min, max);
      if (step > 0 && !lg) {
        v = min + Math.round((v - min) / step) * step;
        v = clamp(Number(v.toFixed(8)), min, max);
      }
      return v;
    }
    function format(v) {
      if (typeof fmt === 'function') return fmt(v);
      var t = v.toFixed(dec);
      if (t.indexOf('.') >= 0 && !(step >= 1)) t = t.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
      if (t === '-0') t = '0';
      return unit ? t + (unit === '%' ? '' : ' ') + unit : t;
    }
    return { toPos: toPos, fromPos: fromPos, snap: snap, format: format, log: lg };
  }
  function parseValue(str) {
    var t = String(str).trim().toLowerCase().replace(',', '.');
    var m = /^(-?\d*\.?\d+(?:e-?\d+)?)\s*(k?)/.exec(t);
    if (!m) return NaN;
    var n = parseFloat(m[1]);
    return m[2] === 'k' ? n * 1000 : n;
  }

  // ---------- theme colours for canvas drawing ----------
  var themeVersion = 0;
  var COLOR_VARS = { bg: '--bg', panel: '--panel', raised: '--panel-raised', line: '--line', fg: '--fg', dim: '--dim',
    on: '--on', arm: '--arm', solo: '--solo', ink: '--fam-ink', famDim: '--fam-dim', wash: '--fam-wash' };
  var FALLBACK = { bg: '#0b0b10', panel: '#15151e', raised: '#1b1b26', line: '#2a2a3a', fg: '#d8d8e6', dim: '#8a8aa0',
    on: '#75f97f', arm: '#ff4c4d', solo: '#eeeeee', ink: '#b0b8c5', famDim: '#6a6f77', wash: '#1d1f23' };
  function colors(el) {
    var out = {}, k, cs = null;
    try { if (el && root.getComputedStyle) cs = root.getComputedStyle(el); } catch (e) { cs = null; }
    for (k in COLOR_VARS) {
      var v = '';
      try { v = cs ? String(cs.getPropertyValue(COLOR_VARS[k]) || '').trim() : ''; } catch (e2) { v = ''; }
      out[k] = v || FALLBACK[k];
    }
    return out;
  }
  function famKey(el) {
    var f = '';
    try { var a = el.closest && el.closest('[data-fam]'); f = a ? a.getAttribute('data-fam') : ''; } catch (e) {}
    return f + '|' + themeVersion;
  }
  function colorCache() {
    var key = null, val = null, tick = 0;
    return function (el) {
      var k = famKey(el);
      if (!val || k !== key || (++tick % 120) === 0) { val = colors(el); key = k; }
      return val;
    };
  }

  // ---------- canvas helpers ----------
  function makeCanvas(w, h2) {
    var c = h('canvas', 'hv-canvas');
    c.setAttribute('width', String(w)); c.setAttribute('height', String(h2));
    setStyle(c, 'width', w + 'px'); setStyle(c, 'height', h2 + 'px');
    return c;
  }
  function ctxOf(canvas, w, h2) {
    var ctx = null;
    try { ctx = canvas.getContext ? canvas.getContext('2d') : null; } catch (e) { ctx = null; }
    if (!ctx) return null;
    var dpr = Math.max(1, Math.min(3, (root.devicePixelRatio || 1)));
    var pw = Math.round(w * dpr), ph = Math.round(h2 * dpr);
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;
    if (ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  // ---------- state markers: shapes only (F-S4 / F-S5 round 2) ----------
  function buildMarker() {
    var m = s('svg', { 'class': 'hv-mark', width: 14, height: 14, viewBox: '0 0 14 14', 'aria-hidden': 'true', focusable: 'false' });
    var hit = s('rect', { x: 0, y: 0, width: 14, height: 14, fill: 'transparent' });
    var dot = s('circle', { 'class': 'hv-mark-dot', cx: 6, cy: 6, r: 3.2 });
    var ring = s('circle', { 'class': 'hv-mark-ring', cx: 6, cy: 6, r: 3.6 });
    var slant = s('line', { 'class': 'hv-mark-slant', x1: 2.5, y1: 9.5, x2: 9.5, y2: 2.5 });
    put(m, hit, dot, ring, slant);
    show(dot, false); show(ring, false); show(slant, false);
    return { root: m, dot: dot, ring: ring, slant: slant };
  }
  function applyMarker(mk, st) {
    show(mk.dot, st === 'set' || st === 'ramp');
    show(mk.slant, st === 'ramp');
    show(mk.ring, st === 'held');
  }
  function normState(x) { return (x === 'set' || x === 'ramp' || x === 'held') ? x : null; }

  // ---------- SVG arc helpers ----------
  function pt(cx, cy, r, deg) { var a = deg * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function arcD(cx, cy, r, d0, d1) {
    if (d1 < d0) { var t = d0; d0 = d1; d1 = t; }
    if (d1 - d0 < 0.05) d1 = d0 + 0.05;
    var p0 = pt(cx, cy, r, d0), p1 = pt(cx, cy, r, d1);
    return 'M' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + ' A' + r + ' ' + r + ' 0 ' + ((d1 - d0) > 180 ? 1 : 0) +
      ' 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2);
  }

  // ---------- shared slider-role control (knob and slider) ----------
  function control(opts, kind) {
    opts = opts || {};
    var min = isNum(opts.min) ? opts.min : 0;
    var max = isNum(opts.max) ? opts.max : 1;
    if (max < min) { var tmp = min; min = max; max = tmp; }
    var size = sizeOf(opts.size);
    var vertical = kind === 'slider' && opts.orientation === 'v';
    var sc = makeScale(min, max, opts.log, opts.step, opts.unit || '', opts.format);
    var bipolar = opts.bipolar != null ? !!opts.bipolar : (min < 0 && max > 0);
    var onInput = opts.onInput, onHold = opts.onHold, onRelease = opts.onRelease;
    var label = opts.label == null ? '' : String(opts.label);

    var v = sc.snap(isNum(opts.value) ? opts.value : min);
    var pos = sc.toPos(v);
    var home = isNum(opts.home) || typeof opts.home === 'function' ? opts.home : v;
    var factory = isNum(opts.factory) ? opts.factory : null;
    var stock = isNum(opts.stock) ? opts.stock : null;
    var state = null;
    var ramp = null;
    var disabled = false;
    var dragging = false, raw = 0, lastX = 0, lastY = 0, pid = null, dragMoved = false;
    var touched = false;                 // onHold fired for this gesture
    var lastTap = 0, tapX = 0, tapY = 0, lastReset = 0;
    var tipTimer = null, wheelTimer = null, pressTimer = null;
    var field = null;

    // elements
    var el = h('div', 'hv-ctl hv-' + kind, {
      role: 'slider', tabindex: '0', 'data-size': size, 'data-kind': kind,
      'aria-valuemin': min, 'aria-valuemax': max, 'aria-valuenow': v
    });
    if (label) attr(el, 'aria-label', label);
    if (kind === 'slider') attr(el, 'aria-orientation', vertical ? 'vertical' : 'horizontal');
    attr(el, 'data-orientation', kind === 'slider' ? (vertical ? 'v' : 'h') : 'knob');

    var mk = buildMarker();
    var labelEl = h('span', 'hv-label'); labelEl.textContent = label;
    var valEl = h('span', 'hv-val'); valEl.textContent = '';
    var tipEl = h('span', 'hv-tip', { 'aria-hidden': 'true' }); tipEl.textContent = '';
    var body;                             // the svg
    var draw;                             // function rendering pos/state into the svg

    var px, len, thick, pad;
    if (kind === 'knob') {
      px = KNOB_PX[size];
      body = s('svg', { 'class': 'hv-svg', width: px, height: px, viewBox: '0 0 48 48', 'aria-hidden': 'true', focusable: 'false' });
      var trackArc = s('path', { 'class': 'hv-track', d: arcD(24, 24, 19, A0, A0 + SWEEP) });
      var ghostArc = s('path', { 'class': 'hv-ghost', d: arcD(24, 24, 22.5, A0, A0 + SWEEP) });
      var valArc = s('path', { 'class': 'hv-arc', d: arcD(24, 24, 19, A0, A0 + 1) });
      var knobBody = s('circle', { 'class': 'hv-body', cx: 24, cy: 24, r: 13 });
      var pointer = s('line', { 'class': 'hv-pointer', x1: 24, y1: 24, x2: 24, y2: 24 });
      var stockTick = s('line', { 'class': 'hv-stock', x1: 0, y1: 0, x2: 0, y2: 0 });
      put(body, trackArc, ghostArc, valArc, knobBody, pointer, stockTick);
      show(ghostArc, false); show(stockTick, false);
      draw = function () {
        var a = A0 + SWEEP * pos;
        if (bipolar) valArc.setAttribute('d', arcD(24, 24, 19, A0 + SWEEP * 0.5, a));
        else valArc.setAttribute('d', arcD(24, 24, 19, A0, a));
        var p0 = pt(24, 24, 5, a), p1 = pt(24, 24, 12, a);
        pointer.setAttribute('x1', p0[0].toFixed(2)); pointer.setAttribute('y1', p0[1].toFixed(2));
        pointer.setAttribute('x2', p1[0].toFixed(2)); pointer.setAttribute('y2', p1[1].toFixed(2));
        if (ramp) { ghostArc.setAttribute('d', arcD(24, 24, 22.5, A0 + SWEEP * ramp[0], A0 + SWEEP * ramp[1])); show(ghostArc, true); }
        else show(ghostArc, false);
        if (stock != null) {
          var sa = A0 + SWEEP * sc.toPos(stock), q0 = pt(24, 24, 15.5, sa), q1 = pt(24, 24, 22, sa);
          stockTick.setAttribute('x1', q0[0].toFixed(2)); stockTick.setAttribute('y1', q0[1].toFixed(2));
          stockTick.setAttribute('x2', q1[0].toFixed(2)); stockTick.setAttribute('y2', q1[1].toFixed(2));
          show(stockTick, true);
        } else show(stockTick, false);
      };
    } else {
      len = isNum(opts.length) ? opts.length : SLIDER_LEN[size];
      thick = SLIDER_THICK[size];
      pad = Math.round(thick / 2);
      var W = vertical ? thick : len, H = vertical ? len : thick;
      body = s('svg', { 'class': 'hv-svg', width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true', focusable: 'false' });
      var sTrack = s('line', { 'class': 'hv-track' });
      var sGhost = s('line', { 'class': 'hv-ghost' });
      var sFill = s('line', { 'class': 'hv-arc' });
      var sStock = s('line', { 'class': 'hv-stock' });
      var thumb = s('circle', { 'class': 'hv-body', r: Math.max(5, pad - 3) });
      put(body, sTrack, sGhost, sFill, sStock, thumb);
      show(sGhost, false); show(sStock, false);
      var trackLen = (vertical ? H : W) - 2 * pad;
      // position p (0..1) -> coordinates along the axis
      var at = function (p) { return vertical ? [thick / 2, pad + trackLen * (1 - p)] : [pad + trackLen * p, thick / 2]; };
      var setLine = function (ln, p0, p1, off) {
        var a = at(p0), b = at(p1), o = off || 0;
        ln.setAttribute('x1', (a[0] + (vertical ? o : 0)).toFixed(1)); ln.setAttribute('y1', (a[1] + (vertical ? 0 : o)).toFixed(1));
        ln.setAttribute('x2', (b[0] + (vertical ? o : 0)).toFixed(1)); ln.setAttribute('y2', (b[1] + (vertical ? 0 : o)).toFixed(1));
      };
      setLine(sTrack, 0, 1);
      draw = function () {
        setLine(sFill, bipolar ? 0.5 : 0, pos);
        var c = at(pos);
        thumb.setAttribute('cx', c[0].toFixed(1)); thumb.setAttribute('cy', c[1].toFixed(1));
        if (ramp) { setLine(sGhost, ramp[0], ramp[1], vertical ? -6 : -6); show(sGhost, true); } else show(sGhost, false);
        if (stock != null) { var sp = sc.toPos(stock); setLine(sStock, sp, sp); var a1 = at(sp); 
          // tick across the track
          if (vertical) { sStock.setAttribute('x1', String(a1[0] - 7)); sStock.setAttribute('x2', String(a1[0] + 7)); }
          else { sStock.setAttribute('y1', String(a1[1] - 7)); sStock.setAttribute('y2', String(a1[1] + 7)); }
          show(sStock, true); } else show(sStock, false);
      };
    }

    // assemble in the order the CSS lays out: marker, (value), svg, label
    if (kind === 'knob') put(el, mk.root, body, valEl, labelEl, tipEl);
    else if (vertical) put(el, mk.root, valEl, body, labelEl, tipEl);
    else put(el, mk.root, labelEl, body, valEl, tipEl);

    // ---- rendering ----
    function text() { return sc.format(v); }
    function ariaText() { return text() + (state === 'held' ? ', held' : state === 'ramp' ? ', ramping' : state === 'set' ? ', set by arrangement' : ''); }
    var shownText = null;
    function render() {
      draw();
      var t = text();
      if (t !== shownText) { shownText = t; valEl.textContent = t; }
      attr(el, 'aria-valuenow', Number(v.toFixed(6)));
      attr(el, 'aria-valuetext', ariaText());
      if (field) { /* number field open: leave */ }
    }
    function showTip() {
      tipEl.textContent = text();
      attr(tipEl, 'data-show', 'true');
      if (tipTimer) clearTimeout(tipTimer);
      tipTimer = setTimeout(function () { attr(tipEl, 'data-show', 'false'); tipTimer = null; }, TIP_MS);
    }

    // ---- value changes ----
    function homeValue() { var hv = typeof home === 'function' ? home() : home; return isNum(hv) ? hv : v; }
    function ensureHold() { if (!touched) { touched = true; call(onHold); } }
    function endGesture() { touched = false; }
    function userSetPos(p) {
      var nv = sc.snap(sc.fromPos(clamp(p, 0, 1)));
      userSetValue(nv);
    }
    function userSetValue(nv) {
      nv = sc.snap(nv);
      if (nv === v) { return; }
      ensureHold();
      v = nv; pos = sc.toPos(v);
      render(); showTip();
      call(onInput, v);
    }
    function reset(useFactory, fromTouch) {
      var target = useFactory && factory != null ? factory : homeValue();
      if (fromTouch) lastReset = now();       // some browsers also fire dblclick after a touch double-tap
      ensureHold();
      var nv = sc.snap(target);
      pos = sc.toPos(nv);
      if (nv !== v) { v = nv; render(); call(onInput, v); } else render();
      showTip();
      endGesture();
    }
    function stepSize() { return opts.step > 0 && !sc.log ? opts.step : 0; }
    function nudge(dir, fine, big) {
      var st = stepSize();
      if (st) { userSetValue(v + dir * st * (big ? 10 : 1)); return; }
      var d = big ? 0.1 : fine ? COARSE_KEY * FINE : COARSE_KEY;
      userSetPos(pos + dir * d);
    }

    // ---- number field (Enter / long press) ----
    function closeField(commit) {
      if (!field) return;
      var f = field; field = null;
      var txt = f.value;
      try { if (f.parentNode) f.parentNode.removeChild(f); } catch (e) {}
      if (commit) {
        var n = parseValue(txt);
        if (isFinite(n)) userSetValue(n);
        endGesture();
      }
      try { el.focus(); } catch (e2) {}
    }
    function openField() {
      if (field || disabled) return;
      field = h('input', 'hv-field', { type: 'text', 'aria-label': (label || 'value') + ' value', inputmode: 'decimal' });
      field.value = String(Number(v.toFixed(sc.log ? 3 : 4)));
      listen(field, 'keydown', function (e) {
        if (e.stopPropagation) e.stopPropagation();
        if (e.key === 'Enter') { if (e.preventDefault) e.preventDefault(); closeField(true); }
        else if (e.key === 'Escape') { if (e.preventDefault) e.preventDefault(); closeField(false); }
      });
      listen(field, 'pointerdown', function (e) { if (e.stopPropagation) e.stopPropagation(); });
      listen(field, 'blur', function () { closeField(false); });
      el.appendChild(field);
      try { field.focus(); if (field.select) field.select(); } catch (e) {}
    }

    // ---- pointer ----
    function axisDelta(e) {
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      if (kind === 'slider' && !vertical) return dx;
      return -dy;
    }
    function travel() { return kind === 'knob' ? DRAG_PX : Math.max(24, (vertical ? len : len) - 2 * pad); }
    function clearPress() { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }
    function onDown(e) {
      if (disabled || field) return;
      if (e.button != null && e.button !== 0) return;
      try { el.focus(); } catch (x) {}
      if (e.altKey) { reset(true); if (e.preventDefault) e.preventDefault(); return; }
      var touchLike = e.pointerType === 'touch' || e.pointerType === 'pen';
      var t = now();
      if (touchLike) {
        if (t - lastTap < 320 && Math.abs(e.clientX - tapX) < 24 && Math.abs(e.clientY - tapY) < 24) {
          lastTap = 0; reset(false, true); return;
        }
        lastTap = t; tapX = e.clientX; tapY = e.clientY;
        clearPress();
        pressTimer = setTimeout(function () { pressTimer = null; if (dragging && !dragMoved) { dragging = false; openField(); } }, 550);
      }
      dragging = true; dragMoved = false; lastX = e.clientX; lastY = e.clientY;
      pid = e.pointerId;
      try { if (el.setPointerCapture && pid != null) el.setPointerCapture(pid); } catch (y) {}
      raw = pos;
      if (kind === 'slider' && !e.shiftKey && body.getBoundingClientRect) {
        // click on the track jumps there; a press on the thumb itself drags relatively
        var r = null; try { r = body.getBoundingClientRect(); } catch (z) {}
        if (r && r.width > 0 && r.height > 0) {
          var span = vertical ? r.height : r.width;
          var off = vertical ? (e.clientY - r.top) : (e.clientX - r.left);
          var scale = span / (vertical ? parseFloat(body.getAttribute('height')) : parseFloat(body.getAttribute('width')));
          var along = off / (scale || 1);
          var q = vertical ? 1 - (along - pad) / (trackLen) : (along - pad) / (trackLen);
          if (Math.abs(q - pos) * trackLen > pad) { raw = clamp(q, 0, 1); userSetPos(raw); dragMoved = true; }
        }
      }
      showTip();
    }
    function onMove(e) {
      if (!dragging) return;
      var d = axisDelta(e);
      if (d === 0) return;
      if (!dragMoved && Math.abs(e.clientX - tapX) + Math.abs(e.clientY - tapY) > 4) clearPress();
      dragMoved = true;
      raw = raw + (d / travel()) * (e.shiftKey ? FINE : 1);
      raw = clamp(raw, 0, 1);
      userSetPos(raw);
    }
    function onUp(e) {
      clearPress();
      if (!dragging) return;
      dragging = false;
      try { if (el.releasePointerCapture && pid != null) el.releasePointerCapture(pid); } catch (x) {}
      pid = null;
      endGesture();
    }
    listen(el, 'pointerdown', onDown);
    listen(el, 'pointermove', onMove);
    listen(el, 'pointerup', onUp);
    listen(el, 'pointercancel', onUp);
    listen(el, 'dblclick', function (e) {
      if (disabled || now() - lastReset < 400) return;
      reset(!!e.shiftKey);
    });
    listen(el, 'contextmenu', function (e) { if (e.pointerType === 'touch' && e.preventDefault) e.preventDefault(); });

    // ---- wheel: acts on the focused control (a click focuses it), so scrolling a panel never moves knobs ----
    listen(el, 'wheel', function (e) {
      if (disabled || field) return;
      var d = doc();
      if (d && d.activeElement !== el) return;
      var dy = e.deltaY || (e.shiftKey ? e.deltaX : 0) || 0;
      if (!dy) return;
      if (e.deltaMode === 1) dy *= 33;
      if (e.preventDefault) e.preventDefault();
      var st = stepSize();
      if (st) userSetValue(v + (dy < 0 ? st : -st));
      else userSetPos(pos + clamp(-dy / 100, -3, 3) * COARSE_KEY * (e.shiftKey ? FINE : 1));
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function () { wheelTimer = null; endGesture(); }, 300);
    }, { passive: false });

    // ---- keyboard ----
    listen(el, 'keydown', function (e) {
      if (disabled || field) return;
      var k = e.key, used = true;
      if (k === 'ArrowUp' || k === 'ArrowRight') nudge(1, e.shiftKey, false);
      else if (k === 'ArrowDown' || k === 'ArrowLeft') nudge(-1, e.shiftKey, false);
      else if (k === 'PageUp') nudge(1, false, true);
      else if (k === 'PageDown') nudge(-1, false, true);
      else if (k === 'Home') userSetValue(min);
      else if (k === 'End') userSetValue(max);
      else if (k === 'Delete' || k === 'Backspace') reset(!!e.shiftKey);
      else if (k === 'Enter') openField();
      else used = false;
      if (used && e.preventDefault) e.preventDefault();
    });
    listen(el, 'keyup', endGesture);
    listen(el, 'blur', function () { endGesture(); });

    // marker: only the held ring is clickable (clears that one hold)
    listen(mk.root, 'pointerdown', function (e) { if (state === 'held' && e.stopPropagation) e.stopPropagation(); });
    listen(mk.root, 'click', function (e) {
      if (state === 'held') { if (e.stopPropagation) e.stopPropagation(); call(onRelease); }
    });

    render();
    applyMarker(mk, null);
    attr(el, 'data-state', 'none');

    var api = {
      el: el,
      set: function (nv) {
        if (!isNum(nv) || dragging) return;
        nv = sc.snap(nv);
        if (nv === v) return;
        v = nv; pos = sc.toPos(v); render();
      },
      get: function () { return v; },
      setState: function (st) {
        st = normState(st);
        if (st === state) return;
        state = st;
        applyMarker(mk, st);
        attr(el, 'data-state', st || 'none');
        render();
      },
      setRamp: function (from, to) {
        ramp = isNum(from) && isNum(to) ? [sc.toPos(from), sc.toPos(to)] : null;
        draw();
      },
      setStock: function (sv) { stock = isNum(sv) ? sv : null; draw(); },
      setHome: function (hv) { home = hv; },
      setFactory: function (fv) { factory = isNum(fv) ? fv : null; },
      setDisabled: function (b) {
        disabled = !!b;
        attr(el, 'aria-disabled', disabled ? 'true' : 'false');
        attr(el, 'tabindex', disabled ? '-1' : '0');
      },
      setLabel: function (t) { label = String(t); labelEl.textContent = label; attr(el, 'aria-label', label); },
      dispose: function () { clearPress(); if (tipTimer) clearTimeout(tipTimer); if (wheelTimer) clearTimeout(wheelTimer); dragging = false; }
    };
    return api;
  }

  function knob(opts) { return control(opts, 'knob'); }
  function slider(opts) { return control(opts, 'slider'); }

  // ---------- toggle ----------
  function toggle(opts) {
    opts = opts || {};
    var on = !!opts.value;
    var label = opts.label == null ? '' : String(opts.label);
    var size = sizeOf(opts.size);
    var el = h('button', 'hv-ctl hv-toggle', { type: 'button', 'data-size': size, 'aria-pressed': on ? 'true' : 'false', 'data-on': on ? 'true' : 'false' });
    if (label) attr(el, 'aria-label', label);
    var lamp = h('span', 'hv-lamp', { 'aria-hidden': 'true' });
    var txt = h('span', 'hv-label'); txt.textContent = label;
    put(el, lamp, txt);
    function paint() { attr(el, 'aria-pressed', on ? 'true' : 'false'); attr(el, 'data-on', on ? 'true' : 'false'); }
    listen(el, 'click', function () { on = !on; paint(); call(opts.onInput, on); });
    return {
      el: el,
      set: function (b) { b = !!b; if (b !== on) { on = b; paint(); } },
      get: function () { return on; },
      setDisabled: function (b) { if (b) attr(el, 'disabled', 'true'); else if (el.removeAttribute) el.removeAttribute('disabled'); }
    };
  }

  // ---------- select ----------
  function normOptions(list) {
    var out = [];
    for (var i = 0; i < (list || []).length; i++) {
      var o = list[i];
      if (o && typeof o === 'object') out.push({ value: o.value, label: o.label != null ? String(o.label) : String(o.value) });
      else out.push({ value: o, label: String(o) });
    }
    return out;
  }
  function select(opts) {
    opts = opts || {};
    var size = sizeOf(opts.size);
    var options = normOptions(opts.options);
    var label = opts.label == null ? '' : String(opts.label);
    var el = h('label', 'hv-ctl hv-select', { 'data-size': size });
    var txt = h('span', 'hv-label'); txt.textContent = label;
    var sel = h('select', 'hv-selectbox');
    if (label) attr(sel, 'aria-label', label);
    put(el, txt, sel);
    var cur = opts.value;
    function fill() {
      for (var i = 0; i < options.length; i++) {
        var op = h('option', null, { value: String(i) });
        op.textContent = options[i].label;
        sel.appendChild(op);
      }
    }
    function indexOf(val) { for (var i = 0; i < options.length; i++) if (options[i].value === val || String(options[i].value) === String(val)) return i; return -1; }
    function paint() { var i = indexOf(cur); if (i >= 0) sel.value = String(i); }
    fill(); paint();
    listen(sel, 'change', function () {
      var i = parseInt(sel.value, 10);
      if (options[i]) { cur = options[i].value; call(opts.onInput, cur); }
    });
    return {
      el: el,
      set: function (val) { if (val !== cur) { cur = val; paint(); } },
      get: function () { return cur; },
      setOptions: function (list) {
        options = normOptions(list);
        try { while (sel.firstChild) sel.removeChild(sel.firstChild); } catch (e) {}
        fill(); paint();
      }
    };
  }

  // ---------- 16-step row ----------
  function levelOf(c) {
    if (c == null || c === false || c === 0) return 0;
    if (c === true) return 2;
    var vel = 0.85, acc = false;
    if (typeof c === 'number') vel = c;
    else if (typeof c === 'object') { vel = c.vel == null ? 0.85 : c.vel; acc = !!c.acc; }
    if (!(vel > 0)) return 0;
    if (acc || vel >= 0.95) return 3;
    return vel <= 0.6 ? 1 : 2;
  }
  function velOf(c) {
    if (c == null || c === false) return 0;
    if (c === true) return 0.85;
    if (typeof c === 'number') return c;
    return c.vel == null ? 0.85 : c.vel;
  }
  function steps(opts) {
    opts = opts || {};
    var count = opts.count > 0 ? opts.count | 0 : 16;
    var onToggle = opts.onToggle, onDrag = opts.onDrag;
    var el = h('div', 'hv-steps', { role: 'group', 'aria-label': opts.label || 'Steps', 'data-count': count });
    if (opts.ink) setStyle(el, '--step-ink', opts.ink);
    var cells = [], vels = [], lv = [], cursor = -1, rov = 0;
    var drag = null, suppress = false;
    var i;
    function mk(idx) {
      var b = h('button', 'hv-step' + (idx % 4 === 0 && idx > 0 ? ' hv-beat' : ''), { type: 'button', 'aria-pressed': 'false', 'data-lv': '0', 'data-i': idx, 'aria-label': 'Step ' + (idx + 1), tabindex: idx === 0 ? '0' : '-1' });
      var fill = h('i', 'hv-step-fill', { 'aria-hidden': 'true' });
      b.appendChild(fill);
      listen(b, 'click', function (e) {
        if (suppress) { suppress = false; return; }
        call(onToggle, idx, { shift: !!e.shiftKey, alt: !!e.altKey });
      });
      listen(b, 'pointerdown', function (e) {
        if (e.button != null && e.button !== 0) return;
        drag = { i: idx, y: e.clientY, vel: vels[idx] || 0, moved: false, id: e.pointerId };
        try { if (b.setPointerCapture && e.pointerId != null) b.setPointerCapture(e.pointerId); } catch (x) {}
      });
      listen(b, 'pointermove', function (e) {
        if (!drag || drag.i !== idx || !(lv[idx] > 0)) return;
        var dy = drag.y - e.clientY;
        if (!drag.moved && Math.abs(dy) < 4) return;
        drag.moved = true;
        var vel = clamp(drag.vel + dy / 60, 0.05, 1);
        vel = Math.round(vel * 20) / 20;
        call(onDrag, idx, vel);
      });
      function end() { if (drag && drag.moved) suppress = true; drag = null; }
      listen(b, 'pointerup', end); listen(b, 'pointercancel', end);
      listen(b, 'keydown', function (e) {
        var k = e.key, to = -1;
        if (k === 'ArrowRight') to = Math.min(count - 1, idx + 1);
        else if (k === 'ArrowLeft') to = Math.max(0, idx - 1);
        else if (k === 'Home') to = 0;
        else if (k === 'End') to = count - 1;
        else if ((k === 'ArrowUp' || k === 'ArrowDown') && lv[idx] > 0) {
          if (e.preventDefault) e.preventDefault();
          var vel = clamp((vels[idx] || 0.85) + (k === 'ArrowUp' ? 0.15 : -0.15), 0.05, 1);
          call(onDrag, idx, Math.round(vel * 20) / 20);
          return;
        }
        if (to >= 0) {
          if (e.preventDefault) e.preventDefault();
          focusCell(to);
        }
      });
      return b;
    }
    function focusCell(idx) {
      cells[rov].setAttribute('tabindex', '-1');
      rov = idx; cells[idx].setAttribute('tabindex', '0');
      try { cells[idx].focus(); } catch (e) {}
    }
    for (i = 0; i < count; i++) { var c = mk(i); cells.push(c); vels.push(0); lv.push(0); el.appendChild(c); }
    function setCells(list) {
      list = list || [];
      for (var j = 0; j < count; j++) {
        var c2 = list[j], l = levelOf(c2);
        vels[j] = velOf(c2);
        if (l !== lv[j]) {
          lv[j] = l;
          attr(cells[j], 'data-lv', l);
          attr(cells[j], 'aria-pressed', l > 0 ? 'true' : 'false');
          attr(cells[j], 'aria-label', 'Step ' + (j + 1) + (l === 3 ? ', accent' : l === 1 ? ', soft' : l === 2 ? ', on' : ', off'));
        }
      }
    }
    setCells(opts.cells);
    return {
      el: el,
      set: setCells,
      setCursor: function (idx) {
        if (idx === cursor) return;
        if (cursor >= 0 && cells[cursor]) attr(cells[cursor], 'data-cursor', 'false');
        cursor = idx;
        if (cursor >= 0 && cells[cursor]) attr(cells[cursor], 'data-cursor', 'true');
      }
    };
  }

  // ---------- canvas displays ----------
  function meter(opts) {
    opts = opts || {};
    var size = sizeOf(opts.size || 'strip');
    var vert = opts.orientation === 'v';
    var L = isNum(opts.length) ? opts.length : METER_LEN[size], T = METER_THICK[size];
    var W = vert ? T : L, H = vert ? L : T;
    var el = h('div', 'hv-ctl hv-meter', { role: 'meter', 'data-size': size, 'data-orientation': vert ? 'v' : 'h', 'aria-valuemin': 0, 'aria-valuemax': 1, 'aria-valuenow': 0 });
    if (opts.label) attr(el, 'aria-label', opts.label);
    var cv = makeCanvas(W, H);
    el.appendChild(cv);
    var cc = colorCache();
    var disp = 0, peak = 0, hold = 0, lastKey = '';
    function dbPos(l) { return l <= 0 ? 0 : clamp((20 * Math.log(l) / Math.LN10 + 60) / 60, 0, 1); }
    function paint() {
      var ctx = ctxOf(cv, W, H);
      if (!ctx) return;
      var c = cc(el), run = vert ? H : W, p = Math.round(dbPos(disp) * run), pk = Math.round(dbPos(peak) * run);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = c.line; ctx.fillRect(0, 0, W, H);
      var warn = Math.round(0.983 * run);          // above about -1 dB
      function bar(a, b, col) {
        if (b <= a) return;
        ctx.fillStyle = col;
        if (vert) ctx.fillRect(0, H - b, W, b - a); else ctx.fillRect(a, 0, b - a, H);
      }
      bar(0, Math.min(p, warn), c.on);
      bar(warn, p, c.arm);
      if (pk > 1) { ctx.fillStyle = pk >= warn ? c.arm : c.fg; if (vert) ctx.fillRect(0, H - pk - 1, W, 2); else ctx.fillRect(pk - 1, 0, 2, H); }
    }
    paint();
    return {
      el: el,
      set: function (level, peakHold) {
        var l = isNum(level) ? clamp(level, 0, 4) : 0;
        disp = l > disp ? l : disp - (disp - l) * 0.18;     // instant attack, smoothed fall
        if (disp < 0.0005) disp = 0;
        if (isNum(peakHold)) { peak = peakHold; hold = 0; }
        else if (l >= peak) { peak = l; hold = 40; }
        else if (hold > 0) hold--;
        else peak = Math.max(0, peak - 0.01);
        var key = Math.round(dbPos(disp) * 400) + ':' + Math.round(dbPos(peak) * 400);
        if (key === lastKey) return;
        lastKey = key;
        attr(el, 'aria-valuenow', Number(clamp(disp, 0, 1).toFixed(3)));
        paint();
      }
    };
  }

  function curve(opts) {
    opts = opts || {};
    var W = opts.width > 0 ? opts.width : 160, H = opts.height > 0 ? opts.height : 80;
    var el = h('div', 'hv-curve', { 'data-size': opts.size || '' });
    if (opts.label) { attr(el, 'role', 'img'); attr(el, 'aria-label', opts.label); } else attr(el, 'aria-hidden', 'true');
    var cv = makeCanvas(W, H);
    el.appendChild(cv);
    var cc = colorCache();
    var api = {
      el: el,
      redraw: function () {
        var ctx = ctxOf(cv, W, H);
        if (!ctx) return;
        var c = cc(el);
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = c.wash; ctx.fillRect(0, 0, W, H);
        if (typeof opts.draw === 'function') {
          if (ctx.save) ctx.save();
          try { opts.draw(ctx, W, H, c); } catch (e) { if (root.console) root.console.error(e); }
          if (ctx.restore) ctx.restore();
        }
      },
      resize: function (w, h2) {
        if (w > 0) W = w; if (h2 > 0) H = h2;
        cv.setAttribute('width', String(W)); cv.setAttribute('height', String(H));
        setStyle(cv, 'width', W + 'px'); setStyle(cv, 'height', H + 'px');
        api.redraw();
      }
    };
    api.redraw();
    return api;
  }

  function grMeter(opts) {
    opts = opts || {};
    var size = sizeOf(opts.size || 'strip');
    var range = opts.range > 0 ? opts.range : 24;
    var L = isNum(opts.length) ? opts.length : METER_LEN[size], T = METER_THICK[size];
    var el = h('div', 'hv-ctl hv-gr', { role: 'meter', 'data-size': size, 'aria-label': opts.label || 'Gain reduction', 'aria-valuemin': 0, 'aria-valuemax': range, 'aria-valuenow': 0, 'aria-valuetext': '0 dB' });
    var cv = makeCanvas(L, T); el.appendChild(cv);
    var cc = colorCache(), cur = 0, shown = -1;
    function paint() {
      var ctx = ctxOf(cv, L, T); if (!ctx) return;
      var c = cc(el), w = Math.round(clamp(cur / range, 0, 1) * L);
      ctx.clearRect(0, 0, L, T);
      ctx.fillStyle = c.line; ctx.fillRect(0, 0, L, T);
      ctx.fillStyle = c.ink; ctx.fillRect(L - w, 0, w, T);          // grows from the right end, as hardware GR meters hang
    }
    paint();
    return {
      el: el,
      set: function (db) {
        var g = isNum(db) ? Math.abs(db) : 0;
        cur = g > cur ? g : cur - (cur - g) * 0.25;                 // fast attack, smoothed release
        if (cur < 0.02) cur = 0;
        var key = Math.round(cur * 10);
        if (key === shown) return;
        shown = key;
        attr(el, 'aria-valuenow', Number(cur.toFixed(1)));
        attr(el, 'aria-valuetext', cur.toFixed(1) + ' dB');
        paint();
      }
    };
  }

  function correlation(opts) {
    opts = opts || {};
    var size = sizeOf(opts.size || 'strip');
    var L = isNum(opts.length) ? opts.length : METER_LEN[size], T = METER_THICK[size];
    var el = h('div', 'hv-ctl hv-corr', { role: 'meter', 'data-size': size, 'aria-label': opts.label || 'Stereo correlation', 'aria-valuemin': -1, 'aria-valuemax': 1, 'aria-valuenow': 0 });
    var cv = makeCanvas(L, T); el.appendChild(cv);
    var cc = colorCache(), cur = 0, shown = null;
    function paint() {
      var ctx = ctxOf(cv, L, T); if (!ctx) return;
      var c = cc(el), mid = L / 2, x = mid + clamp(cur, -1, 1) * mid;
      ctx.clearRect(0, 0, L, T);
      ctx.fillStyle = c.line; ctx.fillRect(0, 0, L, T);
      ctx.fillStyle = cur < 0 ? c.arm : c.ink;
      ctx.fillRect(Math.min(mid, x), 0, Math.max(1, Math.abs(x - mid)), T);
      ctx.fillStyle = c.fg; ctx.fillRect(Math.round(mid) - 1, 0, 1, T);
    }
    paint();
    return {
      el: el,
      set: function (cor) {
        var c = isNum(cor) ? clamp(cor, -1, 1) : 0;
        cur = cur + (c - cur) * 0.35;
        var key = Math.round(cur * 100);
        if (key === shown) return;
        shown = key;
        attr(el, 'aria-valuenow', Number(cur.toFixed(2)));
        paint();
      }
    };
  }

  root.Widgets = {
    version: 1,
    knob: knob, slider: slider, toggle: toggle, select: select, steps: steps,
    meter: meter, curve: curve, grMeter: grMeter, correlation: correlation,
    scale: makeScale, colors: colors,
    refreshTheme: function () { themeVersion++; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
