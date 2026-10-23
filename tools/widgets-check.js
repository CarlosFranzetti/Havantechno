#!/usr/bin/env node
/* Smoke test for app/ui/widgets.js with a minimal fake DOM (A2).
 * Run: node tools/widgets-check.js   -> prints "OK: N checks passed", exit 0. */
'use strict';
var path = require('path');
var fails = [], count = 0;
function check(cond, msg) { count++; if (!cond) fails.push(msg); }
function show(x) { return (x && typeof x === 'object') ? '<' + (x.tagName || 'object') + '>' : JSON.stringify(x); }
function eq(a, b, msg) { check(a === b, msg + ' (got ' + show(a) + ', want ' + show(b) + ')'); }
function near(a, b, tol, msg) { check(Math.abs(a - b) <= tol, msg + ' (got ' + a + ', want ' + b + ')'); }

// ---------- fake DOM ----------
function FakeEl(tag, ns) {
  this.tagName = tag; this.namespaceURI = ns || null; this.attrs = {}; this.children = []; this.parentNode = null;
  this.listeners = {}; this.style = { _p: {}, setProperty: function (k, v) { this._p[k] = v; } };
  this.textContent = ''; this.value = ''; this.width = 0; this.height = 0;
  var self = this; var cls = [];
  this.classList = { add: function (c) { if (cls.indexOf(c) < 0) cls.push(c); self.attrs['class'] = cls.join(' '); },
    remove: function (c) { cls = cls.filter(function (x) { return x !== c; }); self.attrs['class'] = cls.join(' '); },
    contains: function (c) { return (self.attrs['class'] || '').split(' ').indexOf(c) >= 0; } };
}
FakeEl.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); };
FakeEl.prototype.getAttribute = function (k) { return k in this.attrs ? this.attrs[k] : null; };
FakeEl.prototype.removeAttribute = function (k) { delete this.attrs[k]; };
FakeEl.prototype.addEventListener = function (t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); };
FakeEl.prototype.removeEventListener = function () {};
FakeEl.prototype.appendChild = function (c) { c.parentNode = this; this.children.push(c); return c; };
FakeEl.prototype.removeChild = function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; };
Object.defineProperty(FakeEl.prototype, 'firstChild', { get: function () { return this.children[0] || null; } });
FakeEl.prototype.focus = function () { doc.activeElement = this; };
FakeEl.prototype.select = function () {};
FakeEl.prototype.closest = function () { return null; };
FakeEl.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 100, height: 28 }; };
FakeEl.prototype.setPointerCapture = function () {};
FakeEl.prototype.releasePointerCapture = function () {};
FakeEl.prototype.getContext = function () {
  var ops = this._ops = this._ops || [];
  var ctx = { _ops: ops, canvas: this };
  ['clearRect', 'fillRect', 'strokeRect', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'fill', 'arc', 'save', 'restore',
   'setTransform', 'setLineDash', 'fillText', 'closePath', 'quadraticCurveTo', 'rect', 'clip']
    .forEach(function (n) { ctx[n] = function () { ops.push(n); }; });
  return ctx;
};
function fire(el, type, ev) {
  ev = ev || {}; ev.type = type; ev.target = el; ev.preventDefault = ev.preventDefault || function () { ev.defaultPrevented = true; };
  ev.stopPropagation = ev.stopPropagation || function () {};
  (el.listeners[type] || []).forEach(function (fn) { fn(ev); });
  return ev;
}
function all(el, fn, out) { out = out || []; if (fn(el)) out.push(el); el.children.forEach(function (c) { all(c, fn, out); }); return out; }
var doc = {
  activeElement: null,
  createElement: function (t) { return new FakeEl(t); },
  createElementNS: function (ns, t) { return new FakeEl(t, ns); }
};
global.document = doc;
global.window = global;
global.devicePixelRatio = 1;

require(path.join(__dirname, '..', 'app', 'ui', 'widgets.js'));
var W = global.Widgets;
check(!!W, 'Widgets global published');
['knob', 'slider', 'toggle', 'select', 'steps', 'meter', 'curve', 'grMeter', 'correlation'].forEach(function (n) {
  eq(typeof W[n], 'function', 'Widgets.' + n + ' is a function');
});

// ---------- knob ----------
var log = [];
var k = W.knob({ label: 'Cutoff', min: 20, max: 20000, value: 1000, unit: 'Hz', log: true, size: 'face',
  onInput: function (v) { log.push(['in', v]); }, onHold: function () { log.push(['hold']); }, onRelease: function () { log.push(['rel']); } });
var e = k.el;
eq(e.getAttribute('role'), 'slider', 'knob role');
eq(e.getAttribute('tabindex'), '0', 'knob focusable');
eq(e.getAttribute('aria-valuemin'), '20', 'knob valuemin');
eq(e.getAttribute('aria-valuemax'), '20000', 'knob valuemax');
eq(e.getAttribute('aria-valuenow'), '1000', 'knob valuenow');
eq(e.getAttribute('aria-label'), 'Cutoff', 'knob aria-label');
check(/1000 Hz/.test(e.getAttribute('aria-valuetext')), 'knob valuetext carries unit');
// log scale: geometric mean of 20 and 20000 is ~632 and sits at 0.5 position
var sc = W.scale(20, 20000, true);
near(sc.toPos(Math.sqrt(20 * 20000)), 0.5, 1e-9, 'log scale midpoint');
near(sc.fromPos(sc.toPos(1000)), 1000, 1e-6, 'log scale roundtrip');
k.set(5000); eq(e.getAttribute('aria-valuenow'), '5000', 'set updates valuenow');
k.set(1e9); eq(k.get(), 20000, 'set clamps to max');
k.set(-5); eq(k.get(), 20, 'set clamps to min');
k.set(1000);
eq(log.length, 0, 'set() does not call onInput');
// state markers
['set', 'ramp', 'held', null].forEach(function (st) {
  k.setState(st);
  eq(e.getAttribute('data-state'), st || 'none', 'setState ' + st);
});
k.setState('held'); check(/held/.test(e.getAttribute('aria-valuetext')), 'held shows in valuetext');
var mark = all(e, function (x) { return x.getAttribute('class') === 'hv-mark'; })[0];
check(!!mark, 'marker svg exists');
fire(mark, 'click', {}); eq(log[log.length - 1][0], 'rel', 'clicking the held ring calls onRelease');
k.setState('ramp'); k.setRamp(200, 8000); k.setStock(1000); k.setState(null);
// keyboard
log = [];
fire(e, 'keydown', { key: 'ArrowUp' });
check(log.length === 2 && log[0][0] === 'hold' && log[1][0] === 'in', 'ArrowUp: hold then input');
var v1 = k.get(); check(v1 > 1000, 'ArrowUp increases');
fire(e, 'keydown', { key: 'ArrowUp', shiftKey: true });
var v2 = k.get(); check(v2 > v1 && (v2 / v1) < (v1 / 1000), 'Shift+ArrowUp is finer than ArrowUp');
fire(e, 'keydown', { key: 'Home' }); eq(k.get(), 20, 'Home -> min');
fire(e, 'keydown', { key: 'End' }); eq(k.get(), 20000, 'End -> max');
fire(e, 'keydown', { key: 'Delete' }); eq(k.get(), 1000, 'Delete -> home value (initial value)');
// drag (vertical, 200 px full range in position space)
k.set(632.455532); var p0 = sc.toPos(k.get());
log = [];
fire(e, 'pointerdown', { button: 0, clientX: 10, clientY: 100, pointerId: 1, pointerType: 'mouse' });
eq(e.getAttribute('aria-valuenow'), String(Number(k.get().toFixed(6))), 'pointerdown alone does not change');
check(log.length === 0, 'pointerdown alone does not hold');
fire(e, 'pointermove', { clientX: 10, clientY: 50, pointerId: 1 });
near(sc.toPos(k.get()), p0 + 0.25, 0.01, 'dragging up 50 px adds 0.25');
check(log[0][0] === 'hold', 'drag start calls onHold once');
var holds = log.filter(function (x) { return x[0] === 'hold'; }).length;
fire(e, 'pointermove', { clientX: 10, clientY: 40, pointerId: 1 });
eq(log.filter(function (x) { return x[0] === 'hold'; }).length, holds, 'onHold only once per gesture');
var pBefore = sc.toPos(k.get());
fire(e, 'pointermove', { clientX: 10, clientY: 30, pointerId: 1, shiftKey: true });
near(sc.toPos(k.get()) - pBefore, 0.1 * 10 / 200, 0.005, 'Shift drag is 10x finer');
k.set(20); // ignored while dragging
check(k.get() > 20, 'external set ignored mid-drag');
fire(e, 'pointerup', { pointerId: 1 });
fire(e, 'keydown', { key: 'Delete' });
// double click returns home, shift+dblclick returns factory
var kh = W.knob({ label: 'Tune', min: 30, max: 90, value: 50, home: 55, factory: 51, step: 1, unit: 'Hz', size: 'strip', onInput: function () {} });
kh.set(80); fire(kh.el, 'dblclick', {}); eq(kh.get(), 55, 'double-click -> home');
kh.set(80); fire(kh.el, 'dblclick', { shiftKey: true }); eq(kh.get(), 51, 'shift+double-click -> factory');
kh.setHome(function () { return 60; }); kh.set(80);
// reset recently happened -> dblclick guard; wait via manual clock not needed: use Delete key
fire(kh.el, 'keydown', { key: 'Delete' }); eq(kh.get(), 60, 'home may be a function');
fire(kh.el, 'keydown', { key: 'ArrowUp' }); eq(kh.get(), 61, 'stepped knob moves by one step');
fire(kh.el, 'keydown', { key: 'PageUp' }); eq(kh.get(), 71, 'PageUp moves ten steps');
// alt-click -> factory
kh.set(80); fire(kh.el, 'pointerdown', { button: 0, altKey: true, clientX: 0, clientY: 0, pointerId: 2 }); eq(kh.get(), 51, 'Alt-click -> factory');
// touch double-tap resets (dblclick is not reliable on touch), and the following dblclick does not reset twice
var kt = W.knob({ label: 'Tap', min: 0, max: 10, value: 5, home: 5, onInput: function () {} });
kt.set(8); fire(kt.el, 'pointerdown', { button: 0, pointerType: 'touch', clientX: 5, clientY: 5, pointerId: 9 }); fire(kt.el, 'pointerup', { pointerId: 9 });
eq(kt.get(), 8, 'single tap does not reset');
fire(kt.el, 'pointerdown', { button: 0, pointerType: 'touch', clientX: 6, clientY: 6, pointerId: 9 }); fire(kt.el, 'pointerup', { pointerId: 9 });
eq(kt.get(), 5, 'touch double-tap -> home');
// wheel only when focused
var kw = W.knob({ label: 'Wheel', min: 0, max: 1, value: 0.5, size: 'face', onInput: function () {} });
doc.activeElement = null; fire(kw.el, 'wheel', { deltaY: -100 }); eq(kw.get(), 0.5, 'wheel ignored when not focused');
kw.el.focus(); var wev = fire(kw.el, 'wheel', { deltaY: -100 });
check(kw.get() > 0.5, 'wheel up increases when focused'); check(wev.defaultPrevented === true, 'wheel preventDefault');
fire(kw.el, 'wheel', { deltaY: 100, deltaMode: 0 }); near(kw.get(), 0.5, 1e-6, 'wheel down reverses');
// bipolar auto and size window
var kp = W.knob({ label: 'Pan', min: -1, max: 1, value: 0, size: 'window', onInput: function () {} });
eq(kp.el.getAttribute('data-size'), 'window', 'size window attribute');
eq(kp.el.getAttribute('aria-valuenow'), '0', 'pan valuenow');
var svgs = all(kp.el, function (x) { return x.getAttribute('class') === 'hv-svg'; });
eq(svgs[0].getAttribute('width'), '64', 'window knob svg is 64 px');
var kc = W.knob({ label: 'x', min: 0, max: 1, value: 0, size: 'chip' });
eq(all(kc.el, function (x) { return x.getAttribute('class') === 'hv-svg'; })[0].getAttribute('width'), '24', 'chip knob svg is 24 px (min target)');
// number field via Enter
var kf = W.knob({ label: 'Typed', min: 0, max: 100, value: 10, unit: '%', size: 'face', onInput: function () {} });
fire(kf.el, 'keydown', { key: 'Enter' });
var fld = all(kf.el, function (x) { return x.tagName === 'input'; })[0];
check(!!fld, 'Enter opens a number field');
fld.value = '42.5'; fire(fld, 'keydown', { key: 'Enter' });
eq(kf.get(), 42.5, 'typed value commits'); check(all(kf.el, function (x) { return x.tagName === 'input'; }).length === 0, 'field closes');
eq(W.scale(0, 100, false, 0, '%').format(42.5), '42.5%', 'percent format');
eq(W.scale(20, 20000, true, 0, 'Hz').format(2400), '2400 Hz', 'Hz format');
// no onInput supplied must not throw
var kn = W.knob({ min: 0, max: 1, value: 0.2 }); fire(kn.el, 'keydown', { key: 'ArrowUp' }); check(kn.get() > 0.2, 'works without callbacks');
kn.setDisabled(true); eq(kn.el.getAttribute('aria-disabled'), 'true', 'setDisabled');
['chip', 'strip', 'face', 'window'].forEach(function (sz) {
  var kk = W.knob({ label: 'S', min: 0, max: 1, value: 0.3, size: sz }); kk.set(0.6); kk.setState('set'); eq(kk.el.getAttribute('data-size'), sz, 'knob size ' + sz);
});

// ---------- slider ----------
var sl = W.slider({ label: 'Level', min: -60, max: 6, value: 0, unit: 'dB', orientation: 'h', size: 'strip', onInput: function (v) { log.push(['s', v]); } });
eq(sl.el.getAttribute('role'), 'slider', 'slider role');
eq(sl.el.getAttribute('aria-valuemin'), '-60', 'slider valuemin');
eq(sl.el.getAttribute('aria-valuemax'), '6', 'slider valuemax');
eq(sl.el.getAttribute('aria-valuenow'), '0', 'slider valuenow');
eq(sl.el.getAttribute('aria-orientation'), 'horizontal', 'slider aria-orientation h');
sl.set(-12); eq(sl.el.getAttribute('aria-valuenow'), '-12', 'slider set');
sl.setState('held'); eq(sl.el.getAttribute('data-state'), 'held', 'slider held');
sl.setRamp(-30, 0); sl.setStock(0);
log = []; fire(sl.el, 'keydown', { key: 'ArrowRight' }); check(sl.get() > -12, 'slider ArrowRight');
fire(sl.el, 'pointerdown', { button: 0, clientX: 10, clientY: 14, pointerId: 3, pointerType: 'mouse', shiftKey: true });
fire(sl.el, 'pointermove', { clientX: 30, clientY: 14, pointerId: 3, shiftKey: true });
check(log.some(function (x) { return x[0] === 's'; }), 'slider drag emits onInput'); fire(sl.el, 'pointerup', { pointerId: 3 });
var sv = W.slider({ label: 'Pan', min: 0, max: 1, value: 0.5, orientation: 'v', size: 'window', onInput: function () {} });
eq(sv.el.getAttribute('aria-orientation'), 'vertical', 'slider aria-orientation v');
fire(sv.el, 'pointerdown', { button: 0, clientX: 14, clientY: 50, pointerId: 4, pointerType: 'mouse', shiftKey: true });
fire(sv.el, 'pointermove', { clientX: 14, clientY: 20, pointerId: 4, shiftKey: true });
check(sv.get() > 0.5, 'vertical slider: dragging up increases'); fire(sv.el, 'pointerup', { pointerId: 4 });

// ---------- toggle ----------
var tv = [];
var tg = W.toggle({ label: 'Bypass', value: false, onInput: function (b) { tv.push(b); } });
eq(tg.el.tagName, 'button', 'toggle is a native button');
eq(tg.el.getAttribute('aria-pressed'), 'false', 'toggle aria-pressed false');
fire(tg.el, 'click', {}); eq(tv[0], true, 'toggle click -> onInput(true)'); eq(tg.el.getAttribute('aria-pressed'), 'true', 'toggle pressed');
tg.set(false); eq(tg.el.getAttribute('aria-pressed'), 'false', 'toggle set(false)'); eq(tv.length, 1, 'toggle set() silent');

// ---------- select ----------
var sv2 = [];
var se = W.select({ label: 'Mode', options: ['lp', 'hp', { value: 'bp', label: 'Band' }], value: 'hp', onInput: function (v) { sv2.push(v); } });
var box = all(se.el, function (x) { return x.tagName === 'select'; })[0];
check(!!box, 'select has a native <select>'); eq(box.getAttribute('aria-label'), 'Mode', 'select aria-label');
eq(box.value, '1', 'select shows initial value');
box.value = '2'; fire(box, 'change', {}); eq(sv2[0], 'bp', 'select change -> original value');
se.set('lp'); eq(box.value, '0', 'select set'); eq(se.get(), 'lp', 'select get');

// ---------- steps ----------
var tg2 = [], dr = [];
var cells = []; for (var i = 0; i < 16; i++) cells.push(i % 4 === 0 ? { vel: 0.85 } : null); cells[4] = { vel: 1, acc: true }; cells[8] = { vel: 0.5 };
var st = W.steps({ count: 16, cells: cells, ink: '#fc9b6f', onToggle: function (i, m) { tg2.push([i, m]); }, onDrag: function (i, v) { dr.push([i, v]); } });
var btns = all(st.el, function (x) { return x.tagName === 'button'; });
eq(btns.length, 16, '16 step buttons');
eq(btns[0].getAttribute('data-lv'), '2', 'normal step level 2'); eq(btns[4].getAttribute('data-lv'), '3', 'accent level 3');
eq(btns[8].getAttribute('data-lv'), '1', 'soft level 1'); eq(btns[1].getAttribute('data-lv'), '0', 'empty level 0');
eq(btns[0].getAttribute('aria-pressed'), 'true', 'on step aria-pressed'); eq(btns[1].getAttribute('aria-pressed'), 'false', 'off step aria-pressed');
fire(btns[1], 'click', { shiftKey: true }); eq(tg2[0][0], 1, 'click toggles step index'); eq(tg2[0][1].shift, true, 'shift passed in mods');
fire(btns[0], 'pointerdown', { button: 0, clientY: 100, pointerId: 5 }); fire(btns[0], 'pointermove', { clientY: 70, pointerId: 5 });
check(dr.length === 1 && dr[0][0] === 0 && dr[0][1] > 0.85, 'vertical drag on a lit step raises velocity');
fire(btns[0], 'pointerup', { pointerId: 5 }); fire(btns[0], 'click', {}); eq(tg2.length, 1, 'click after a drag is swallowed');
fire(btns[0], 'keydown', { key: 'ArrowRight' }); eq(doc.activeElement, btns[1], 'ArrowRight moves focus to next step');
st.set(new Array(16).fill(null)); eq(btns[0].getAttribute('data-lv'), '0', 'steps.set clears'); st.setCursor(3); eq(btns[3].getAttribute('data-cursor'), 'true', 'cursor');
st.set([true, 0.5, 1]); eq(btns[0].getAttribute('data-lv'), '2', 'boolean cell'); eq(btns[2].getAttribute('data-lv'), '3', 'numeric velocity 1');

// ---------- canvas displays ----------
var m = W.meter({ orientation: 'h', size: 'strip' });
eq(m.el.getAttribute('role'), 'meter', 'meter role'); m.set(0.5); m.set(1.2, 1.0); m.set(0);
check(m.el.getAttribute('aria-valuenow') !== null, 'meter aria-valuenow');
var cv = all(m.el, function (x) { return x.tagName === 'canvas'; })[0]; check(cv._ops.indexOf('fillRect') >= 0, 'meter draws on its canvas');
var mv = W.meter({ orientation: 'v', size: 'window' }); mv.set(0.3);
var drawn = 0;
var cu = W.curve({ width: 120, height: 60, draw: function (ctx, w, h, c) { drawn++; eq(w, 120, 'curve draw width'); eq(h, 60, 'curve draw height'); check(typeof c.ink === 'string', 'curve draw receives colours'); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.stroke(); } });
check(drawn >= 1, 'curve draws once on build'); cu.redraw(); check(drawn >= 2, 'curve redraw calls draw');
eq(typeof cu.el, 'object', 'curve el');
var origErr = console.error; console.error = function () {};
var cu2 = W.curve({ width: 10, height: 10, draw: function () { throw new Error('boom'); } }); cu2.redraw(); console.error = origErr; check(true, 'curve survives a throwing draw');
var gr = W.grMeter({ size: 'strip' }); gr.set(-6); gr.set(null); gr.set(12);
check(gr.el.getAttribute('aria-valuenow') !== null, 'grMeter valuenow'); eq(gr.el.getAttribute('role'), 'meter', 'grMeter role');
var co = W.correlation({ size: 'strip' }); co.set(-0.7); co.set(0.9); co.set(null);
eq(co.el.getAttribute('aria-valuemin'), '-1', 'correlation valuemin');

// ---------- no-canvas environments must not throw ----------
var saved = FakeEl.prototype.getContext; FakeEl.prototype.getContext = function () { return null; };
W.meter({}).set(0.4); W.curve({ draw: function () {} }).redraw(); W.grMeter({}).set(3); W.correlation({}).set(0.2);
FakeEl.prototype.getContext = saved;
// defaults: every widget accepts an empty option object
['knob', 'slider', 'toggle', 'select', 'steps', 'meter', 'curve', 'grMeter', 'correlation'].forEach(function (n) {
  var threw = false; try { W[n]({}); W[n](); } catch (x) { threw = x; }
  check(!threw, n + ' with empty options does not throw' + (threw ? ': ' + threw.message : ''));
});

if (fails.length) { console.log('FAIL: ' + fails.length + ' of ' + count + ' checks failed'); fails.forEach(function (f) { console.log('  - ' + f); }); process.exit(1); }
console.log('OK: ' + count + ' checks passed');
process.exit(0);
