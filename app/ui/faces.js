/* Havantechno app - ui/faces.js
 * Global `Faces`: the face registry and renderer. A face is DATA (facedefs.js): sections of parameter names in signal
 * order, one hero graph drawn from the parameters, a glyph, a few size hints. Min, max, unit and default are always read
 * from device.spec, never restated by a face, so a changed range in the engine reaches every face with no edit.
 *
 *   Faces.define(type, layout)
 *   Faces.render(device, density, host) -> {el, update(), dispose(), resize(w,h)}     density: chip | strip | face | window
 *   Faces.has(type)   Faces.fallback(device, density, host)   Faces.glyph(typeOrDevice, px)   Faces.lint(host)
 *   Faces.param(device, host, name)      value of one parameter for hero code (host.getParam, else the spec default)
 *   Faces.palette                        colours for the hero being drawn: {ink, dim, wash, fg, line, bg, on, dashed}
 *
 * layout: {
 *   glyph: '<svg-inner-markup for a 16x16 viewBox, stroke currentColor>',
 *   hero: function (ctx2d, w, h, device, host) {},  live: true to redraw every update() (meters), else only on change
 *   sections: [{title, params: ['cutoff', {p:'wave', widget:'select', label:'wave', options:[...]}], widget:'knob'|'slider'}],
 *   strip: [param names for the strip density], width: {strip, face, window}, height: {strip, face, window},
 *   heroH: {strip, face, window}, labels: {param: 'text'}, options: {param: [choices]}
 * }
 * Every control writes host.setParam(device.pathPrefix + '.' + param, v) and calls host.hold(path) when a drag starts.
 * Hold is released only by the host's "re-enable arranged", not here. Spec params that no section names go to a "more"
 * drawer, so no parameter is ever unreachable. A section may give `match: '^send\\.'` (a regexp source) instead of
 * `params`, to take every spec param whose name matches (used by the channel strip for its per-send levels).
 * Markup uses theme.css (A2) classes: .face[data-density] > .face-head (.face-glyph .face-title .face-sub) + .face-body
 * (.face-hero, .face-section > .face-section-title + .face-controls, details.face-more); head and title also carry
 * hv-head / hv-title (A4 hooks a double-click on them). The chip density is inline glyph + name with no border
 * (wrap it in button.chip for a slot). No stylesheet is injected from here.
 * Works in Node with a fake document; nothing throws on a missing host method.
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  var defs = {};
  var DENSITIES = ['chip', 'strip', 'face', 'window'];
  var FAM = {
    drums: { ink: '#fc9b6f', dim: '#9a5d40', wash: '#31180c' }, fx: { ink: '#d8b349', dim: '#836c28', wash: '#281e02' },
    time: { ink: '#21d1ca', dim: '#0c7f7a', wash: '#002624' }, keys: { ink: '#55c4fe', dim: '#30779c', wash: '#042232' },
    tone: { ink: '#9cb4fe', dim: '#5a6ca4', wash: '#171e35' }, bass: { ink: '#c4a4fe', dim: '#77629c', wash: '#231a32' },
    dynamics: { ink: '#ea97d8', dim: '#8f5a84', wash: '#2c1628' }, utility: { ink: '#b0b8c5', dim: '#6a6f77', wash: '#1d1f23' }
  };
  var FAMILY = {
    kick: 'drums', clap: 'drums', hat_closed: 'drums', hat_open: 'drums', shaker: 'drums', perc: 'drums', sub: 'bass', bass: 'bass',
    stab: 'keys', lead: 'keys', pad: 'keys', riser: 'fx', impact: 'fx', compressor: 'dynamics', limiter: 'dynamics', sidechain: 'dynamics',
    delay: 'time', reverb: 'time', chorus: 'time', filter: 'tone', eq3: 'tone', saturator: 'tone', widener: 'utility', channel: 'utility'
  };
  var DEFAULT_W = { strip: 176, face: 380, window: 560 };
  var HERO_H = { strip: 40, face: 76, window: 170 };
  // choices for string params; a layout's `options` wins. Names are the engine's own.
  var OPTIONS = {
    wave: ['sine', 'square', 'sawtooth', 'triangle'],
    mode: ['lowpass', 'highpass', 'bandpass', 'notch', 'peaking', 'lowshelf', 'highshelf', 'allpass'],
    division: [{ value: '', label: 'free' }, '1/32', '1/16', '1/16d', '1/16t', '1/8', '3/16', '1/8d', '1/8t', '1/4', '1/4d', '1/4t', '1/2', '1/1'],
    algo: ['ir', 'freeverb'], curve: ['lin', 'db']
  };

  // ------------------------------------------------------------------ small helpers
  function h(tag, cls, text) {
    var e = root.document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function add(parent, child) { if (parent && child) parent.appendChild(child); return parent; }
  function setAttr(e, k, v) { try { e.setAttribute(k, v); } catch (x) {} }
  function safe(fn, dflt) { try { var v = fn(); return v === undefined ? dflt : v; } catch (e) { return dflt; } }
  function keys(o) { var a = []; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) a.push(k); return a; }

  function kindOf(entry) {
    if (!entry) return null;
    if (typeof entry.min === 'number' && typeof entry.max === 'number') return 'num';
    if (typeof entry.value === 'boolean') return 'bool';
    if (typeof entry.value === 'string') return 'str';
    return null;
  }
  function isLog(e) { return e.min > 0 && e.max / e.min > 50; }
  function itemOf(it) { return (typeof it === 'string') ? { p: it } : it; }
  function familyOf(device) { return device.family || FAMILY[device.type] || 'utility'; }

  // ------------------------------------------------------------------ native fallbacks, used only if Widgets is absent
  var NATIVE = {
    knob: function (o) { return nativeRange(o); },
    slider: function (o) { return nativeRange(o); },
    toggle: function (o) {
      var el = h('label', 'hv-nat'), cb = h('input'); cb.type = 'checkbox'; cb.checked = !!o.value;
      cb.addEventListener('change', function () { if (o.onInput) o.onInput(!!cb.checked); });
      add(el, h('span', null, o.label || '')); add(el, cb);
      return { el: el, set: function (v) { cb.checked = !!v; }, setState: function () {} };
    },
    select: function (o) {
      var el = h('label', 'hv-nat'), sel = h('select'), i;
      for (i = 0; i < (o.options || []).length; i++) { var op = h('option', null, String(o.options[i])); op.value = o.options[i]; add(sel, op); }
      sel.value = o.value;
      sel.addEventListener('change', function () { if (o.onInput) o.onInput(sel.value); });
      add(el, h('span', null, o.label || '')); add(el, sel);
      return { el: el, set: function (v) { sel.value = v; }, setState: function () {} };
    },
    curve: function (o) {
      var cv = h('canvas', 'hv-curve'), dpr = Math.max(1, safe(function () { return root.devicePixelRatio; }, 1) || 1);
      cv.width = Math.round(o.width * dpr); cv.height = Math.round(o.height * dpr);
      cv.style.width = o.width + 'px'; cv.style.height = o.height + 'px';
      var api = { el: cv, redraw: function () {
        var c = cv.getContext && cv.getContext('2d'); if (!c) return;
        if (c.setTransform) c.setTransform(dpr, 0, 0, dpr, 0, 0);
        o.draw(c, o.width, o.height);
      } };
      api.redraw();
      return api;
    }
  };
  function nativeRange(o) {
    var el = h('label', 'hv-nat'), inp = h('input'), val = h('span', 'hv-nat-val');
    inp.type = 'range'; inp.min = o.min; inp.max = o.max; inp.step = (o.max - o.min) / 1000; inp.value = o.value;
    inp.addEventListener('pointerdown', function () { if (o.onHold) o.onHold(); });
    inp.addEventListener('input', function () { var v = parseFloat(inp.value); val.textContent = fmt(v, o.unit); if (o.onInput) o.onInput(v); });
    val.textContent = fmt(o.value, o.unit);
    add(el, h('span', null, o.label || '')); add(el, inp); add(el, val);
    return { el: el, set: function (v) { inp.value = v; val.textContent = fmt(v, o.unit); }, setState: function (s) { setAttr(el, 'data-state', s || ''); } };
  }
  function fmt(v, unit) { return (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 1000) / 1000) + (unit ? ' ' + unit : ''); }
  function widget(name) { var W = root.Widgets; return (W && typeof W[name] === 'function') ? W[name] : NATIVE[name]; }

  // ------------------------------------------------------------------ palette for hero code
  function readPalette(R) {
    var fam = familyOf(R.device), f = FAM[fam] || FAM.utility, cs = null, el = R.root;
    if (el && root.getComputedStyle) cs = safe(function () { return root.getComputedStyle(el); }, null);
    function v(name, fb) { var x = cs && cs.getPropertyValue ? String(cs.getPropertyValue(name) || '').trim() : ''; return x || fb; }
    return {
      ink: v('--fam-ink', f.ink), dim: v('--fam-dim', f.dim), wash: v('--fam-wash', f.wash), fg: v('--fg', '#d8d8e6'), line: v('--line', '#2a2a3a'),
      bg: v('--panel', '#15151e'), on: v('--on', '#75f97f'), dashed: !!(R.device.ref && R.device.ref._bypassed)
    };
  }

  function paramOf(device, host, name) {
    var v;
    if (host && host.getParam) v = safe(function () { return host.getParam(device.pathPrefix + '.' + name); }, undefined);
    if (v === undefined || v === null) { var e = device.spec && device.spec[name]; v = e ? e.value : undefined; }
    return v;
  }

  // ------------------------------------------------------------------ section state markers (shape only: set / ramp / held)
  function currentSection(host) {
    var secs = safe(function () { return host.sections(); }, null);
    if (!secs || !secs.length) return null;
    var pos = safe(function () { return host.transport.pos(); }, null), sec = null, i;
    if (pos && typeof pos.section === 'number' && secs[pos.section]) sec = secs[pos.section];
    else if (pos && pos.sectionName) for (i = 0; i < secs.length; i++) if (secs[i].name === pos.sectionName) { sec = secs[i]; break; }
    sec = sec || secs[0];
    var p = pos ? (pos.barInSection || 0) + (pos.step || 0) / 16 : 0;
    return { sec: sec, pos: p };
  }
  function markerFor(R, cs, path) {
    var held = (typeof R.host.isHeld === 'function') ? safe(function () { return R.host.isHeld(path); }, false) : !!R.held[path];
    if (held) return 'held';
    if (!cs || !cs.sec) return null;
    var ramps = cs.sec.ramp || [], i;
    for (i = 0; i < ramps.length; i++) {
      var r = ramps[i];
      if ((r.param || r.path) !== path) continue;
      var a = r.bars ? r.bars[0] : 0, b = r.bars ? r.bars[1] : (cs.sec.bars || 0);
      if (cs.pos >= a && cs.pos <= b) return 'ramp';
    }
    if (cs.sec.set && Object.prototype.hasOwnProperty.call(cs.sec.set, path)) return 'set';
    return null;
  }

  // ------------------------------------------------------------------ controls
  function labelFor(R, p, item) {
    if (item.label) return item.label;
    if (R.layout.labels && R.layout.labels[p]) return R.layout.labels[p];
    if (p === 'level' && R.device.kind === 'instrument') return 'trim';
    return p;
  }
  function optionsFor(R, p, item) {
    if (item.options) return item.options;
    if (R.layout.options && R.layout.options[p]) return R.layout.options[p];
    return OPTIONS[p] || null;
  }
  function widgetFor(kind, item, section, dflt) {
    if (kind === 'bool') return 'toggle';
    if (kind === 'str') return 'select';
    var w = item.widget || (section && section.widget) || dflt || 'knob';
    return (w === 'knob' || w === 'slider') ? w : 'knob';
  }

  function makeControl(R, p, item, section, dflt) {
    var entry = R.device.spec && R.device.spec[p], kind = kindOf(entry);
    if (!kind) return null;
    var host = R.host, path = R.device.pathPrefix + '.' + p, wname = widgetFor(kind, item, section, dflt);
    var cur = safe(function () { return host.getParam(path); }, undefined);
    if (cur === undefined || cur === null) cur = entry.value;
    var c = { p: p, path: path, kind: kind, widget: wname, last: cur, state: null, dragging: false, w: null };
    function hold() { c.dragging = true; R.held[path] = true; if (typeof host.hold === 'function') safe(function () { host.hold(path); }); }
    function write(v) { c.last = v; if (typeof host.setParam === 'function') safe(function () { host.setParam(path, v); }); }
    var label = labelFor(R, p, item), size = R.density;
    if (wname === 'toggle') {
      c.w = widget('toggle')({ label: label, value: !!cur, onInput: function (v) { hold(); c.dragging = false; write(!!v); } });
    } else if (wname === 'select') {
      var opts = optionsFor(R, p, item) || [String(cur)];
      c.w = widget('select')({ label: label, options: opts.slice(), value: cur, onInput: function (v) { hold(); c.dragging = false; write(v); } });
    } else {
      var o = { label: label, min: entry.min, max: entry.max, value: cur, unit: entry.unit || '', log: isLog(entry), size: size,
                onInput: function (v) { write(v); }, onHold: hold, onRelease: function () { c.dragging = false; } };
      if (wname === 'slider') o.orientation = item.orientation || 'h';
      c.w = widget(wname)(o);
    }
    c.el = c.w && c.w.el;
    R.controls.push(c);
    return c;
  }

  // ------------------------------------------------------------------ glyph
  function glyphMarkup(type) {
    var d = defs[type];
    return '<svg viewBox="0 0 16 16" aria-hidden="true">' + ((d && d.glyph) || '<circle cx="8" cy="8" r="5"/>') + '</svg>';
  }
  function glyph(typeOrDevice, px) {
    var type = typeof typeOrDevice === 'string' ? typeOrDevice : typeOrDevice.type;
    var el = h('span', 'hv-glyph');
    if (px) { el.style.width = px + 'px'; el.style.height = px + 'px'; }
    el.innerHTML = glyphMarkup(type);
    setAttr(el, 'data-fam', typeof typeOrDevice === 'string' ? (FAMILY[type] || 'utility') : familyOf(typeOrDevice));
    return el;
  }

  // ------------------------------------------------------------------ hero
  function heroSize(R) {
    var L = R.layout, d = R.density;
    var w = (L.width && L.width[d]) || DEFAULT_W[d] || 380, hh = (L.heroH && L.heroH[d]) || HERO_H[d] || 76;
    return { w: Math.max(60, w - 14), h: hh };
  }
  function buildHero(R, w, hh) {
    var curve = widget('curve')({ width: w, height: hh, draw: function (c, cw, ch) { drawHero(R, c, cw, ch); } });
    R.hero = curve;
    return curve;
  }
  function drawHero(R, c, w, hh) {
    var pal = readPalette(R);
    try { c.save(); } catch (e) {}
    try { c.fillStyle = pal.wash; c.fillRect(0, 0, w, hh); } catch (e) {}
    Faces.palette = pal;
    try { R.layout.hero(c, w, hh, R.device, R.host); }
    catch (e) { R.heroError = e; if (Faces.strict) throw e; }
    try { c.restore(); } catch (e) {}
  }
  function heroSig(R) {
    var spec = R.device.spec || {}, s = '', k;
    for (k in spec) if (Object.prototype.hasOwnProperty.call(spec, k)) s += paramOf(R.device, R.host, k) + '|';
    return s + (R.device.ref && R.device.ref._bypassed ? 'b' : '');
  }

  // ------------------------------------------------------------------ render
  function stateOf(device, host, layout, density) {
    return { device: device, host: host, layout: layout, density: density, controls: [], held: {}, root: null, hero: null, heroWrap: null,
             sig: null, heroError: null, disposed: false };
  }

  function renderChip(R) {
    var el = h('div', 'hv-face hv-chip'), head = h('span', 'hv-head');
    add(head, glyph(R.device)); add(head, h('span', 'hv-title', R.device.name || R.device.type));
    add(el, head);
    R.root = el;
    setAttr(el, 'data-fam', familyOf(R.device)); setAttr(el, 'data-type', R.device.type); setAttr(el, 'data-device', R.device.id || '');
    setAttr(el, 'title', (R.device.name || R.device.type) + (R.device.name !== R.device.type ? ' (' + R.device.type + ')' : ''));
    return el;
  }

  function sectionNode(R, sec) {
    var node = h('div', 'hv-sec'), ctls = h('div', 'hv-ctls'), i, any = false;
    if (sec.title) add(node, h('h4', null, sec.title));
    for (i = 0; i < (sec.params || []).length; i++) {
      var it = itemOf(sec.params[i]), c = makeControl(R, it.p, it, sec);
      if (c) { add(ctls, c.el); any = true; }
    }
    add(node, ctls);
    return any ? node : null;
  }

  function placedSet(layout) {
    var placed = {}, i, j;
    for (i = 0; i < (layout.sections || []).length; i++) for (j = 0; j < (layout.sections[i].params || []).length; j++) placed[itemOf(layout.sections[i].params[j]).p] = true;
    return placed;
  }
  function unplaced(device, layout) {
    var placed = placedSet(layout), out = [], k, spec = device.spec || {};
    for (k in spec) if (Object.prototype.hasOwnProperty.call(spec, k) && !placed[k] && kindOf(spec[k])) out.push(k);
    return out;
  }

  function renderBody(R, generic) {
    var L = R.layout, d = R.density, el = h('div', 'hv-face hv-' + d + (generic ? ' hv-generic' : ''));
    R.root = el;
    setAttr(el, 'data-fam', familyOf(R.device)); setAttr(el, 'data-type', R.device.type); setAttr(el, 'data-device', R.device.id || '');
    if (d !== 'window' && L.width && L.width[d]) el.style.width = L.width[d] + 'px';
    if (L.height && L.height[d]) el.style.minHeight = L.height[d] + 'px';
    var head = h('div', 'hv-head');
    add(head, glyph(R.device)); add(head, h('span', 'hv-title', R.device.name || R.device.type));
    if (R.device.name && R.device.name !== R.device.type) add(head, h('span', 'hv-type', R.device.type));
    add(el, head);

    if (L.hero && !generic) {
      var hs = heroSize(R), wrap = h('div', 'hv-hero');
      R.heroWrap = wrap;
      add(wrap, buildHero(R, hs.w, hs.h).el);
      add(el, wrap);
    }
    var i, more;
    if (generic) {
      var list = h('div', 'hv-list'), all = unplaced(R.device, L);
      for (i = 0; i < all.length; i++) add(list, makeControl(R, all[i], { p: all[i] }, null, 'slider').el);
      add(el, list);
    } else if (d === 'strip') {
      var sc = h('div', 'hv-strip-ctls'), names = L.strip || firstParams(L, 4);
      for (i = 0; i < names.length; i++) { var itm = itemOf(names[i]), cc = makeControl(R, itm.p, itm, null); if (cc) add(sc, cc.el); }
      add(el, sc);
    } else {
      var secs = h('div', 'hv-secs');
      for (i = 0; i < (L.sections || []).length; i++) add(secs, sectionNode(R, L.sections[i]));
      add(el, secs);
      var rest = unplaced(R.device, L);
      if (rest.length) {
        more = h('details', 'hv-more');
        if (d === 'window') setAttr(more, 'open', 'open');
        add(more, h('summary', null, 'more (' + rest.length + ')'));
        var mc = h('div', 'hv-ctls');
        for (i = 0; i < rest.length; i++) add(mc, makeControl(R, rest[i], { p: rest[i] }, null, 'slider').el);
        add(more, mc); add(el, more);
      }
    }
    return el;
  }
  function firstParams(L, n) {
    var out = [], i, j;
    for (i = 0; i < (L.sections || []).length && out.length < n; i++) for (j = 0; j < L.sections[i].params.length && out.length < n; j++) out.push(itemOf(L.sections[i].params[j]).p);
    return out;
  }

  function make(device, density, host, layout, generic) {
    if (DENSITIES.indexOf(density) < 0) density = 'face';
    var R = stateOf(device, host || {}, layout, density);
    var el = density === 'chip' ? renderChip(R) : renderBody(R, generic);

    function update() {
      if (R.disposed) return;
      var h0 = R.host, cs = (density === 'chip') ? null : currentSection(h0), i;
      if (typeof h0.isHeld !== 'function' && typeof h0.heldCount === 'function' && safe(function () { return h0.heldCount(); }, 0) === 0) R.held = {};
      // bypass / mute marker on the frame
      var bypassed = !!(R.device.ref && R.device.ref._bypassed), muted = false;
      if (R.device.kind === 'instrument' || R.device.kind === 'channel') muted = !!safe(function () { return h0.getParam(R.device.track + '.mute'); }, false);
      else if (R.device.kind === 'insert' || R.device.kind === 'send' || R.device.kind === 'master') muted = false;
      setAttr(el, 'data-bypassed', bypassed ? '1' : '0'); setAttr(el, 'data-muted', muted ? '1' : '0');
      for (i = 0; i < R.controls.length; i++) {
        var c = R.controls[i], v = safe(function () { return h0.getParam(c.path); }, undefined);
        if (v !== undefined && v !== null && v !== c.last && !c.dragging) { c.last = v; if (c.w && c.w.set) c.w.set(v); }
        var m = markerFor(R, cs, c.path);
        if (m !== c.state) { c.state = m; if (c.w && c.w.setState) c.w.setState(m); }
      }
      if (R.hero && R.hero.redraw) {
        var sig = R.layout.live ? null : heroSig(R);
        if (R.layout.live || sig !== R.sig) { R.sig = sig; R.hero.redraw(); }
      }
    }
    function resize(w, hh) {
      if (R.disposed || !R.heroWrap || !R.layout.hero) return;
      var old = R.hero && R.hero.el;
      var nh = buildHero(R, Math.max(60, w | 0), Math.max(24, hh | 0));
      if (old && R.heroWrap.replaceChild) R.heroWrap.replaceChild(nh.el, old); else add(R.heroWrap, nh.el);
      R.sig = null;
    }
    function dispose() {
      if (R.disposed) return;
      R.disposed = true;
      if (el.parentNode && el.parentNode.removeChild) el.parentNode.removeChild(el);
      R.controls.length = 0; R.hero = null;
    }
    var api = { el: el, update: update, dispose: dispose, resize: resize, device: device, density: density };
    api.error = function () { return R.heroError; };
    update();
    return api;
  }

  // ------------------------------------------------------------------ lint
  function checkLayout(type, L, spec, out, notes) {
    var placed = {}, i, j, name;
    function bad(msg) { out.push(type + ': ' + msg); }
    if (!L.glyph) bad('no glyph');
    if (typeof L.hero !== 'function') bad('no hero graph');
    if (!L.sections || !L.sections.length) bad('no sections');
    if (!L.width || !L.width.strip || !L.width.face || !L.width.window) bad('width needs strip, face and window');
    for (i = 0; i < (L.sections || []).length; i++) {
      var s = L.sections[i];
      if (!s.title) bad('section ' + i + ' has no title');
      for (j = 0; j < (s.params || []).length; j++) {
        var it = itemOf(s.params[j]), e = spec && spec[it.p];
        name = type + '.' + it.p;
        if (!e) { out.push(name + ': named in the layout but not in the spec'); continue; }
        if (placed[it.p]) out.push(name + ': placed twice');
        placed[it.p] = true;
        var kind = kindOf(e), w = it.widget || s.widget;
        if (!kind) out.push(name + ': spec entry has no min/max and is neither a string nor a boolean');
        if (kind === 'num' && (w === 'toggle' || w === 'select')) out.push(name + ': ' + w + ' used for a numeric param');
        if (kind === 'bool' && (w === 'knob' || w === 'slider' || w === 'select')) out.push(name + ': ' + w + ' used for a boolean (auto-mapped to a toggle)');
        if (kind === 'str' && (w === 'knob' || w === 'slider' || w === 'toggle')) out.push(name + ': ' + w + ' used for a string (auto-mapped to a select)');
        if (kind === 'str' && !(it.options || (L.options && L.options[it.p]) || OPTIONS[it.p])) out.push(name + ': string param has no option list (add layout.options.' + it.p + ')');
        if (kind === 'str') {
          var opts = it.options || (L.options && L.options[it.p]) || OPTIONS[it.p] || [];
          if (opts.length && opts.indexOf(e.value) < 0) out.push(name + ': default "' + e.value + '" is not in the option list');
        }
      }
    }
    for (i = 0; i < (L.strip || []).length; i++) { name = itemOf(L.strip[i]).p; if (!spec || !spec[name]) out.push(type + '.' + name + ': named in strip but not in the spec'); }
    for (name in (L.labels || {})) if (spec && !spec[name]) out.push(type + '.' + name + ': label for a param not in the spec');
    if (spec) for (name in spec) if (Object.prototype.hasOwnProperty.call(spec, name)) {
      if (!kindOf(spec[name])) out.push(type + '.' + name + ': spec param cannot be shown (no min/max, not a string or boolean): unreachable');
      else if (!placed[name]) notes.push(type + '.' + name + ': not placed in a section, shown in the "more" drawer');
    }
  }

  function lint(host) {
    var out = [], notes = [], specs = {}, devs = safe(function () { return host.devices(); }, []) || [], i, t;
    for (i = 0; i < devs.length; i++) if (devs[i].spec && !specs[devs[i].type]) specs[devs[i].type] = devs[i].spec;
    var S = root.Synths, P = root.Processors;
    if (S && S.types) { var ts = S.types(); for (i = 0; i < ts.length; i++) if (!specs[ts[i]]) specs[ts[i]] = S.spec(ts[i]); }
    if (P && P.types) { var tp = P.types(); for (i = 0; i < tp.length; i++) if (!specs[tp[i]]) specs[tp[i]] = P.spec(tp[i]); }
    for (t in defs) {
      if (!Object.prototype.hasOwnProperty.call(defs, t)) continue;
      if (!specs[t]) { notes.push(t + ': layout defined but no device of this type to check against'); continue; }
      checkLayout(t, defs[t], specs[t], out, notes);
    }
    for (i = 0; i < devs.length; i++) if (!defs[devs[i].type]) out.push((devs[i].id || devs[i].type) + ': no face definition for type "' + devs[i].type + '" (generic fallback used)');
    for (t in specs) if (Object.prototype.hasOwnProperty.call(specs, t) && !defs[t]) {
      var m = t + ': no face definition (generic fallback used)';
      if (out.indexOf(m) < 0 && !devs.some(function (d) { return d.type === t; })) out.push(m);
    }
    out.notes = notes;
    return out;
  }

  // ------------------------------------------------------------------ public API
  var Faces = {
    strict: false, palette: null, densities: DENSITIES.slice(), families: FAM, familyOf: FAMILY, options: OPTIONS,
    define: function (type, layout) { defs[type] = layout; return Faces; },
    has: function (type) { return Object.prototype.hasOwnProperty.call(defs, type); },
    layout: function (type) { return defs[type] || null; },
    types: function () { return keys(defs); },
    render: function (device, density, host) {
      if (!device) throw new Error('Faces.render: no device');
      var L = defs[device.type];
      return L ? make(device, density, host, L, false) : Faces.fallback(device, density, host);
    },
    fallback: function (device, density, host) {
      var L = { glyph: (defs[device.type] && defs[device.type].glyph) || null, sections: [], width: { strip: 200, face: 260, window: 320 } };
      return make(device, density, host, L, true);
    },
    glyph: glyph,
    param: paramOf,
    lint: lint
  };
  root.Faces = Faces;
})();
