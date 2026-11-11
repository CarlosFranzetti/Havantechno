#!/usr/bin/env node
/* Check for app/ui/panels.js (Patch Crew P4) in Node: a fake DOM, the real engine and Host (no audio), the real Windows.
 *   node tools/panels-check.js        prints "OK: N checks passed" and exits 0, else names the failing check and exits 1.
 * Covers: the registry; an HVT-808 with some voices present and some absent; a knob gesture = one host.hold and the right
 * setParam path; keys, wheel, double-click home; step keys toggling the document with one undo entry each (accent too); the
 * add affordance adding a track; the HVT-909; a bridge-like host (no document/editor); the windows.js Panel view; dispose
 * leaving no listeners.
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var APP = path.join(__dirname, '..', 'app');

// ------------------------------------------------------------------ fake DOM (with listener accounting)
var LIVE = { n: 0 };
function Node_(tag) {
  this.tagName = String(tag).toUpperCase(); this.children = []; this.parentNode = null; this.style = {}; this.attrs = {};
  this.className = ''; this._text = ''; this.listeners = {}; this.hidden = false; this.id = '';
  var self = this;
  this.classList = {
    toggle: function (c, on) { var p = self.className.split(/\s+/).filter(Boolean), i = p.indexOf(c); if (on === undefined) on = i < 0; if (on && i < 0) p.push(c); else if (!on && i >= 0) p.splice(i, 1); self.className = p.join(' '); return on; },
    contains: function (c) { return self.className.split(/\s+/).indexOf(c) >= 0; }, add: function (c) { this.toggle(c, true); }, remove: function (c) { this.toggle(c, false); }
  };
  this.style.setProperty = function (k, v) { self.style[k] = v; };
}
Node_.prototype.appendChild = function (c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; };
Node_.prototype.insertBefore = function (c, ref) { if (c.parentNode) c.parentNode.removeChild(c); var i = this.children.indexOf(ref); c.parentNode = this; if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); return c; };
Node_.prototype.removeChild = function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; };
Node_.prototype.replaceChild = function (n, o) { var i = this.children.indexOf(o); if (i >= 0) { this.children[i] = n; n.parentNode = this; o.parentNode = null; } return o; };
Object.defineProperty(Node_.prototype, 'firstChild', { get: function () { return this.children[0] || null; } });
Object.defineProperty(Node_.prototype, 'lastChild', { get: function () { return this.children[this.children.length - 1] || null; } });
Object.defineProperty(Node_.prototype, 'textContent', {
  get: function () { return this._text + this.children.map(function (c) { return c.textContent; }).join(''); },
  set: function (v) { this.children = []; this._text = String(v); }
});
Object.defineProperty(Node_.prototype, 'clientWidth', { get: function () { return 900; } });
Object.defineProperty(Node_.prototype, 'clientHeight', { get: function () { return 600; } });
Object.defineProperty(Node_.prototype, 'offsetWidth', { get: function () { return 900; } });
Object.defineProperty(Node_.prototype, 'offsetHeight', { get: function () { return 600; } });
Node_.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = String(v); };
Node_.prototype.getAttribute = function (k) { return k === 'class' ? this.className : (Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null); };
Node_.prototype.removeAttribute = function (k) { delete this.attrs[k]; };
Node_.prototype.addEventListener = function (t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); LIVE.n++; };
Node_.prototype.removeEventListener = function (t, fn) { var l = this.listeners[t] || [], i = l.indexOf(fn); if (i >= 0) { l.splice(i, 1); LIVE.n--; } };
Node_.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, right: 900, bottom: 20, width: 900, height: 20 }; };
Node_.prototype.focus = function () { if (fakeDoc.activeElement && fakeDoc.activeElement !== this) fakeDoc.activeElement.fire('blur'); fakeDoc.activeElement = this; this.fire('focus'); };
Node_.prototype.contains = function (n) { for (; n; n = n.parentNode) if (n === this) return true; return false; };
Node_.prototype.closest = function () { return null; };
Node_.prototype.fire = function (t, ev) {
  ev = ev || {}; ev.target = ev.target || this; ev.preventDefault = ev.preventDefault || function () { ev.defaultPrevented = true; }; ev.stopPropagation = ev.stopPropagation || function () {};
  (this.listeners[t] || []).slice().forEach(function (f) { f(ev); });
  return ev;
};
Node_.prototype.walk = function (fn) { fn(this); this.children.forEach(function (c) { c.walk(fn); }); };
Node_.prototype.find = function (pred) { var out = []; this.walk(function (n) { if (pred(n)) out.push(n); }); return out; };
function listenersUnder(n) { var c = 0; n.walk(function (x) { for (var k in x.listeners) c += x.listeners[k].length; }); return c; }

var head = new Node_('head'), byId = {};
var fakeDoc = {
  head: head, body: new Node_('body'), activeElement: null, documentElement: null,
  createElement: function (t) { return new Node_(t); },
  createElementNS: function (ns, t) { return new Node_(t); },
  createTextNode: function (s) { var n = new Node_('#text'); n._text = String(s); return n; },
  getElementById: function (id) { return byId[id] || null; },
  addEventListener: function () {}, removeEventListener: function () {}
};
var winLayer = new Node_('div'); winLayer.id = 'windows'; byId.windows = winLayer; fakeDoc.body.appendChild(winLayer);
var origAppend = head.appendChild;
head.appendChild = function (c) { if (c.id) byId[c.id] = c; return origAppend.call(head, c); };

var timers = [];
var sb = { console: console, Math: Math, JSON: JSON, Date: Date, Float32Array: Float32Array, Uint8Array: Uint8Array, Promise: Promise,
  setTimeout: function (fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }, clearTimeout: clearTimeout,
  requestAnimationFrame: function () { return 0; }, cancelAnimationFrame: function () {}, innerWidth: 1280, innerHeight: 860,
  location: { search: '' }, localStorage: { _d: {}, getItem: function (k) { return this._d[k] || null; }, setItem: function (k, v) { this._d[k] = String(v); }, removeItem: function (k) { delete this._d[k]; } } };
sb.window = sb; sb.document = fakeDoc; sb.globalThis = sb; sb.URLSearchParams = URLSearchParams;
vm.createContext(sb);
function load(rel) { vm.runInContext(fs.readFileSync(path.join(APP, rel), 'utf8'), sb, { filename: rel }); }
['engine/core.js', 'engine/programs.js', 'engine/synths.js', 'engine/drums.js', 'engine/processors.js', 'engine/songdoc.js', 'engine/sequencer.js', 'engine/song.js', 'engine/host.js',
 'ui/widgets.js', 'ui/faces.js', 'ui/facedefs.js', 'ui/panels.js', 'ui/windows.js'].forEach(load);

var passed = 0;
function ok(cond, msg) { if (!cond) { console.log('FAIL: ' + msg); process.exit(1); } passed++; }
var P = sb.Panels, host = sb.Host.create();
ok(P && typeof P.define === 'function' && typeof P.for === 'function' && typeof P.render === 'function', 'Panels.define, Panels.for, Panels.render exist');
ok(P.keys().indexOf('hvt808') >= 0 && P.keys().indexOf('hvt909') >= 0, 'hvt808 and hvt909 are registered (' + P.keys().join(',') + ')');

// spy on the host's hold / setParam
var calls = { hold: [], set: [] };
var realHold = host.hold, realSet = host.setParam;
host.hold = function (p) { calls.hold.push(p); return realHold.apply(host, arguments); };
host.setParam = function (p, v) { calls.set.push([p, v]); return realSet.apply(host, arguments); };
function undoN() { return host.editor()._undo.length; }

// a partial 808 kit: bd sd ch and lt; the rest absent
var ed = host.editor();
ed.group(function (e) { ['bd808', 'sd808', 'ch808', 'lt808'].forEach(function (t) { e.addTrack({ name: t, type: t, inst: t, family: 'drums', gain: 0.8, variants: { A: '................' } }); }); });
host.commit();
var bd = host.device('track:bd808'), kick = host.device('track:kick');
ok(bd && bd.type === 'bd808' && bd.spec && bd.spec.level, 'the Host lists the bd808 track as an instrument device with a spec');
ok(P.for(bd, host) === 'hvt808', 'Panels.for(bd808) = hvt808');
ok(P.for(host.device('track:ch808'), host) === 'hvt808', 'every 808 voice opens the HVT-808');
ok(P.for(kick, host) === null, 'a synth kick has no panel');
ok(P.for(host.device('track:bd808:channel'), host) === null, 'a channel device has no panel');

// a single-device panel is a define() and a knob
P.define('test-single', { label: 'test', size: { w: 200, h: 100 }, match: function (d) { return d.test === true; },
  build: function (K) { K.knob(K.svg, { x: 50, y: 50, r: 16, param: 'decay', label: 'decay' }); } });
var kd = Object.assign({}, kick, { test: true });
ok(P.for(kd, host) === 'test-single', 'a single-device panel matches its device');
var single = P.render(kd, host);
var sk = single.el.find(function (n) { return n.attrs.role === 'slider'; })[0];
ok(sk && sk.attrs['aria-label'] === 'decay' && sk.attrs['aria-disabled'] === 'false', 'single-device knob bound to its own device');
single.dispose();

// ---- render the HVT-808
var r = P.render(bd, host);
ok(r && r.el && typeof r.update === 'function' && typeof r.resize === 'function' && typeof r.dispose === 'function', 'render returns {el, update, resize, dispose}');
var svg = r.el.children[0];
ok(svg.tagName === 'SVG' && svg.attrs.viewBox === '0 0 1200 760' && svg.attrs.preserveAspectRatio === 'xMidYMid meet', 'one scalable SVG with a fixed aspect');
ok(/HVT-808/.test(r.el.textContent) && /HAVANTECHNO/.test(r.el.textContent), 'model name HVT-808 and the Havantechno wordmark are drawn');
ok(!/Roland|TR-808|Rhythm Composer/i.test(r.el.textContent), 'no maker logo, TR-808 badge or "Rhythm Composer"');
function sliders() { return r.el.find(function (n) { return n.attrs.role === 'slider'; }); }
function byLabel(re) { return sliders().filter(function (n) { return re.test(n.attrs['aria-label'] || ''); })[0]; }
var bdLevel = byLabel(/^BD level \(bd808\)/), cyLevel = byLabel(/^CY level \(cy808\)/), sdSnappy = byLabel(/^SD snappy/);
ok(bdLevel && bdLevel.attrs['aria-disabled'] === 'false' && bdLevel.attrs.tabindex === '0', 'BD level is live');
ok(sdSnappy && sdSnappy.attrs['aria-disabled'] === 'false', 'SD snappy is live');
ok(cyLevel && cyLevel.attrs['aria-disabled'] === 'true' && cyLevel.attrs.tabindex === '-1', 'CY (no track) is disabled');
ok(bdLevel.attrs['aria-valuemin'] === '0' && bdLevel.attrs['aria-valuemax'] === '1.5' && bdLevel.attrs['aria-valuetext'] != null, 'aria-valuemin/max/valuetext from the spec');
var cyGroup = r.el.find(function (n) { return n.attrs['data-voice'] === 'cy808'; })[0];
ok(cyGroup && cyGroup.attrs.opacity === '0.32', 'absent voice drawn dimmed');
var addCy = r.el.find(function (n) { return /Add a CYmbal track/.test(n.attrs['aria-label'] || ''); })[0];
ok(addCy && addCy.attrs.display === 'inline', 'absent voice shows its add affordance');
var addBd = r.el.find(function (n) { return /Add a Bass Drum track/.test(n.attrs['aria-label'] || ''); })[0];
ok(addBd && addBd.attrs.display === 'none', 'present voice hides its add affordance');
var tone = byLabel(/^BD tone/);
ok(tone && tone.find(function (n) { return n.attrs['data-basis'] === 'prior'; }).length === 1, 'bd808 tone (basis prior) carries the dotted ring');
ok(bdLevel.find(function (n) { return n.attrs['data-basis'] === 'prior'; }).length === 0, 'a manual/untagged param has no ring');

// ---- knob gesture: drag = one hold, setParam on bd808.level
calls.hold = []; calls.set = [];
var v0 = host.getParam('bd808.level');
bdLevel.fire('pointerdown', { button: 0, clientY: 300, pointerId: 1 });
bdLevel.fire('pointermove', { clientY: 290 }); bdLevel.fire('pointermove', { clientY: 280 }); bdLevel.fire('pointermove', { clientY: 270, shiftKey: true });
bdLevel.fire('pointerup', {});
ok(calls.hold.length === 1 && calls.hold[0] === 'bd808.level', 'one drag = one host.hold("bd808.level") (' + JSON.stringify(calls.hold) + ')');
ok(calls.set.length === 3 && calls.set.every(function (c) { return c[0] === 'bd808.level'; }), 'three moves = three setParam on bd808.level');
var v1 = host.getParam('bd808.level');
ok(Math.abs(v1 - (v0 + 1.5 * (20 / 200 + 10 / 200 * 0.1))) < 1e-6, 'drag: 200 px = whole range, Shift = x0.1 (' + v0 + ' -> ' + v1 + ')');
ok(Math.abs(parseFloat(bdLevel.attrs['aria-valuenow']) - v1) < 1e-3, 'aria-valuenow follows');
var tip = r.el.find(function (n) { return n.className === 'pn-tip'; })[0];
ok(tip && /level/.test(tip.textContent), 'a value readout shows while adjusting');
// keyboard: one press = one gesture
calls.hold = []; calls.set = [];
bdLevel.focus();
bdLevel.fire('keydown', { key: 'ArrowUp' }); bdLevel.fire('keyup', {});
bdLevel.fire('keydown', { key: 'Home' }); bdLevel.fire('keyup', {});
ok(calls.hold.length === 2 && host.getParam('bd808.level') === 0, 'arrow and Home each hold once; Home = min');
bdLevel.fire('keydown', { key: 'End' }); bdLevel.fire('keyup', {});
ok(host.getParam('bd808.level') === 1.5, 'End = max');
// wheel on the focused control: a burst holds once
calls.hold = [];
bdLevel.fire('wheel', { deltaY: -100 }); bdLevel.fire('wheel', { deltaY: 100 }); bdLevel.fire('wheel', { deltaY: 100 });
ok(calls.hold.length === 1, 'a wheel burst = one hold');
// double-click: back to the song's value
bdLevel.fire('dblclick', {});
ok(host.getParam('bd808.level') === 1, 'double-click returns to the song value (1)');
// a disabled knob ignores gestures
calls.set = [];
cyLevel.fire('pointerdown', { button: 0, clientY: 100 }); cyLevel.fire('pointermove', { clientY: 50 }); cyLevel.fire('pointerup', {});
ok(calls.set.length === 0, 'a voice with no track writes nothing');

// ---- step keys
function keys() { return r.el.find(function (n) { return /^Step \d+/.test(n.attrs['aria-label'] || ''); }); }
r.update();
ok(keys().length === 16, 'sixteen step keys');
ok(keys()[0].attrs['aria-disabled'] === 'false', 'step keys are live with a full host');
function cellsOf(name) {
  var d = host.document(), p = host.transport.pos(), sec = d.sections[sb.Panels.util.curIndex(p, d.sections)], tr = sb.Panels.util.findTrack(d, name);
  var vn = sb.Panels.util.variantName(sec, name); return vn ? tr.variants[vn].cells.slice(0, 16) : null;
}
ok(cellsOf('bd808') === null, 'the new bd808 track does not play in the current section yet');
var u0 = undoN();
keys()[2].fire('click', {});
ok(cellsOf('bd808') && cellsOf('bd808')[2] && cellsOf('bd808')[2].vel === 0.85, 'click on key 3 sets step 3 (and makes the section play the track)');
ok(undoN() === u0 + 1, 'one undo entry (+' + (undoN() - u0) + ')');
r.update();
ok(keys()[2].attrs['aria-pressed'] === 'true' && /on/.test(keys()[2].attrs['aria-label']), 'key 3 shows on');
keys()[2].fire('click', { shiftKey: true });
ok(cellsOf('bd808')[2].acc === true && undoN() === u0 + 2, 'Shift-click accents, one undo entry');
r.update();
ok(/accent/.test(keys()[2].attrs['aria-label']), 'key 3 shows the accent');
keys()[2].fire('click', {});
ok(cellsOf('bd808')[2] === null && undoN() === u0 + 3, 'click again clears the step, one undo entry');
ed.undo(); host.commit();
ok(cellsOf('bd808')[2] && cellsOf('bd808')[2].acc === true, 'undo brings the accented step back');

// instrument selection: clicking a tile moves the steps to that voice
var sdTile = r.el.find(function (n) { return n.className === 'pn-tile' && /SNARE/.test(n.textContent); })[0];
sdTile.fire('click', {}); r.update();
ok(/SD/.test(r.el.find(function (n) { return n.attrs['class'] === 'pn-info'; })[0].textContent), 'selecting SD shows its steps');
keys()[4].fire('click', {});
ok(cellsOf('sd808') && cellsOf('sd808')[4] && !cellsOf('bd808')[4], 'step key edits the selected voice');
// trims follow the selection: every SD spec param is reachable (column knobs + trims)
var sdLabels = sliders().map(function (n) { return n.attrs['aria-label']; }).filter(function (l) { return /^SD /.test(l); });
ok(Object.keys(host.device('track:sd808').spec).every(function (p) { var t = { noiseDecay: 'N.DECAY', level: 'level', tone: 'tone', snappy: 'snappy' }[p] || p; return sdLabels.some(function (l) { return l.toLowerCase().indexOf(String(t).toLowerCase()) >= 0; }); }), 'every sd808 param is on the panel (' + sdLabels.join(', ') + ')');

// paired column switch
var ltSw = r.el.find(function (n) { return n.attrs.role === 'switch' && /Low Tom/.test(n.attrs['aria-label']); })[0];
ok(ltSw && ltSw.attrs['aria-checked'] === 'false', 'LT/LC switch on LT');
ltSw.fire('click', {}); r.update();
ok(ltSw.attrs['aria-checked'] === 'true' && /LC/.test(r.el.find(function (n) { return n.attrs['class'] === 'pn-info'; })[0].textContent), 'the switch shows LC and selects it');

// ---- add affordance
var n0 = host.document().tracks.length, u1 = undoN();
addCy.fire('click', {});
ok(host.document().tracks.length === n0 + 1 && sb.Panels.util.findTrack(host.document(), 'cy808') && undoN() === u1 + 1, 'add affordance adds a cy808 track in one undo entry');
var cyT = sb.Panels.util.findTrack(host.document(), 'cy808');
ok(cyT.type === 'cy808' && cyT.inst === 'cy808' && cyT.family === 'drums', 'the added track looks like a kit-menu track');
r.update();
cyLevel = byLabel(/^CY level \(cy808\)/);
ok(cyLevel.attrs['aria-disabled'] === 'false' && addCy.attrs.display === 'none', 'after adding, the CY knobs are live and the add button hides');

// ---- update is cheap and stable; resize keeps the aspect
for (var f = 0; f < 200; f++) r.update();
r.resize(600, 600);
ok(svg.attrs.width === '600' && svg.attrs.height === String(Math.floor(760 * 600 / 1200)), 'resize fits the width and keeps the aspect (' + svg.attrs.width + 'x' + svg.attrs.height + ')');
r.resize(2000, 380);
ok(svg.attrs.height === '380' && svg.attrs.width === String(Math.floor(1200 * 380 / 760)), 'resize fits the height when that is tighter');

// ---- dispose leaves no listeners
var L0 = LIVE.n;
r.dispose();
ok(r.listenerCount() === 0 && listenersUnder(r.el) === 0, 'dispose removes every listener the panel added');
ok(LIVE.n < L0, 'the global listener count dropped');

// ---- HVT-909 with some voices absent
ed.group(function (e) { ['bd909', 'sd909', 'ch909'].forEach(function (t) { e.addTrack({ name: t, type: t, inst: t, family: 'drums', gain: 0.8, variants: { A: 'x...x...x...x...' } }); }); });
host.commit();
var r9 = P.render(host.device('track:ch909'), host);
ok(/HVT-909/.test(r9.el.textContent) && !/Roland|TR-909/.test(r9.el.textContent), 'HVT-909 drawn, no maker marks');
var s9 = r9.el.find(function (n) { return n.attrs.role === 'slider'; });
function l9(re) { return s9.filter(function (n) { return re.test(n.attrs['aria-label'] || ''); })[0]; }
ok(l9(/^CH decay \(ch909\)/).attrs['aria-disabled'] === 'false' && l9(/^OH decay \(oh909\)/).attrs['aria-disabled'] === 'true', 'CH live, OH (absent) disabled');
ok(/CH/.test(r9.el.find(function (n) { return n.attrs['class'] === 'pn-info'; })[0].textContent), 'the window\'s own voice (CH) is selected first');
calls.hold = []; calls.set = [];
var bdTune = l9(/^BD tune \(bd909\)/);
bdTune.fire('pointerdown', { button: 0, clientY: 100, pointerId: 2 }); bdTune.fire('pointermove', { clientY: 80 }); bdTune.fire('pointerup', {});
ok(calls.hold.length === 1 && calls.hold[0] === 'bd909.tune' && calls.set[0][0] === 'bd909.tune', '909 knob: one hold, path bd909.tune');
var tempo = l9(/^Tempo/);
ok(tempo && tempo.attrs['aria-valuemin'] === '37' && tempo.attrs['aria-valuemax'] === '290', 'tempo knob range 37..290 (service notes)');
calls.hold = [];
tempo.focus(); tempo.fire('keydown', { key: 'ArrowUp' }); tempo.fire('keyup', {});
ok(calls.hold[0] === 'bpm' && host.getParam('bpm') > 126, 'tempo knob holds and writes bpm');
var L9 = LIVE.n; r9.dispose();
ok(r9.listenerCount() === 0 && listenersUnder(r9.el) === 0 && LIVE.n < L9, '909 dispose removes its listeners');

// ---- a bridge-like host (Electron child window): no document/editor/commit, no transport.play
var bh = {};
['setParam', 'getParam', 'hold', 'release', 'heldCount', 'isHeld', 'device', 'devices', 'meter', 'sections', 'tracks', 'bpm'].forEach(function (n) { bh[n] = function () { return host[n].apply(host, arguments); }; });
bh.on = function () {}; bh.off = function () {};
bh.transport = { pos: function () { return host.transport.pos(); }, playing: false };
var rb = P.render(host.device('track:bd808'), bh);
var kb = rb.el.find(function (n) { return /^Step \d+/.test(n.attrs['aria-label'] || ''); });
ok(kb.length === 16 && kb[0].attrs['aria-disabled'] === 'true', 'bridge host: step keys drawn disabled');
var lvB = rb.el.find(function (n) { return /^BD level/.test(n.attrs['aria-label'] || ''); })[0];
calls.set = [];
lvB.fire('pointerdown', { button: 0, clientY: 100 }); lvB.fire('pointermove', { clientY: 90 }); lvB.fire('pointerup', {});
ok(calls.set.length === 1 && calls.set[0][0] === 'bd808.level', 'bridge host: knobs still write');
rb.dispose();

// ---- windows.js: the Panel view
sb.Windows.init({ host: host, layer: winLayer });
sb.Windows.open('track:bd808', host);
var win = winLayer.children[winLayer.children.length - 1];
var pbtn = win.find(function (n) { return n.tagName === 'BUTTON' && n.textContent === 'Panel'; })[0];
ok(pbtn && !pbtn.hidden && pbtn.attrs['aria-pressed'] === 'true', 'a drum window shows the Panel button, pressed');
ok(win.find(function (n) { return n.className === 'pn-root'; }).length === 1, 'the window body holds the panel');
var seg = pbtn.parentNode;
ok(seg.children[0] === pbtn, 'Panel comes first in the view segment');
var edBtn = seg.children[1];
var Lw = LIVE.n;
edBtn.fire('click', {});
ok(win.find(function (n) { return n.className === 'pn-root'; }).length === 0 && LIVE.n < Lw, 'Editor view disposes the panel (listeners removed)');
pbtn.fire('click', {});
ok(win.find(function (n) { return n.className === 'pn-root'; }).length === 1, 'back to the Panel view');
sb.Windows.close('track:bd808');
sb.Windows.open('track:kick', host);
win = winLayer.children[winLayer.children.length - 1];
pbtn = win.find(function (n) { return n.tagName === 'BUTTON' && n.textContent === 'Panel'; })[0];
ok(pbtn && pbtn.hidden && win.find(function (n) { return n.className === 'pn-root'; }).length === 0, 'a synth window has no Panel button (editor face as before)');
sb.Windows.close('track:kick');

timers.forEach(clearTimeout);
console.log('OK: ' + passed + ' checks passed');
