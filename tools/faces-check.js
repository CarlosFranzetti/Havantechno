#!/usr/bin/env node
/* Smoke test for app/ui/faces.js + facedefs.js (A3). Fake DOM, real engine, real Host, real Widgets (A2).
 * Run: node tools/faces-check.js   -> prints a report and "OK: N checks passed" (exit 0), or the failures (exit 1).
 * What it does: loads engine + Host (context-less, as Host.create() builds the song at once), Widgets, Faces, facedefs;
 * renders all 23 device types at chip / strip / face / window (devices from host.devices(), plus synthetic ones for
 * types the Guidance song does not use, e.g. chorus), runs update(), checks that every hero drew without an error and
 * painted the canvas, that every spec param is reachable as exactly one control, that controls write the right path and
 * hold it, that set / ramp / held markers follow host data, the generic fallback, resize, dispose, and Faces.lint. */
'use strict';
var path = require('path');
var fails = [], count = 0;
function check(cond, msg) { count++; if (!cond) fails.push(msg); }
function eq(a, b, msg) { check(a === b, msg + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }

// ---------------------------------------------------------------- fake DOM
function FakeEl(tag, ns) {
  this.tagName = tag; this.namespaceURI = ns || null; this.attrs = {}; this.children = []; this.parentNode = null;
  this.listeners = {}; this.style = { _p: {}, setProperty: function (k, v) { this._p[k] = v; } };
  this._text = ''; this.value = ''; this.width = 0; this.height = 0; this.innerHTML = '';
  var self = this, cls = [];
  this.classList = { add: function (c) { if (cls.indexOf(c) < 0) cls.push(c); self.attrs['class'] = cls.join(' '); },
    remove: function (c) { cls = cls.filter(function (x) { return x !== c; }); self.attrs['class'] = cls.join(' '); },
    contains: function (c) { return (self.attrs['class'] || '').split(' ').indexOf(c) >= 0; } };
}
Object.defineProperty(FakeEl.prototype, 'className', { get: function () { return this.attrs['class'] || ''; }, set: function (v) { this.attrs['class'] = String(v); } });
Object.defineProperty(FakeEl.prototype, 'textContent', { get: function () { return this._text; }, set: function (v) { this._text = String(v); this.children = []; } });
FakeEl.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); };
FakeEl.prototype.getAttribute = function (k) { return k in this.attrs ? this.attrs[k] : null; };
FakeEl.prototype.removeAttribute = function (k) { delete this.attrs[k]; };
FakeEl.prototype.addEventListener = function (t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); };
FakeEl.prototype.removeEventListener = function () {};
FakeEl.prototype.appendChild = function (c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; };
FakeEl.prototype.removeChild = function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; };
FakeEl.prototype.replaceChild = function (n, o) { var i = this.children.indexOf(o); if (i >= 0) { this.children[i] = n; n.parentNode = this; o.parentNode = null; } return o; };
FakeEl.prototype.focus = function () { doc.activeElement = this; };
FakeEl.prototype.select = function () {};
FakeEl.prototype.closest = function () { return null; };
FakeEl.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 100, height: 28 }; };
FakeEl.prototype.setPointerCapture = function () {};
FakeEl.prototype.releasePointerCapture = function () {};
// a canvas context that accepts any call and counts them; property writes are stored, reads of unknown names are no-ops
FakeEl.prototype.getContext = function () {
  var self = this, ops = this._ops = this._ops || [], store = {};
  return new Proxy(store, {
    get: function (t, k) {
      if (k === 'canvas') return self;
      if (k === 'measureText') return function () { return { width: 5 }; };
      if (k in t) return t[k];
      return function () { ops.push(String(k)); };
    },
    set: function (t, k, v) { t[k] = v; return true; }
  });
};
function fire(el, type, ev) {
  ev = ev || {}; ev.type = type; ev.target = el; ev.preventDefault = ev.preventDefault || function () {}; ev.stopPropagation = ev.stopPropagation || function () {};
  (el.listeners[type] || []).forEach(function (fn) { fn(ev); });
  return ev;
}
function all(el, fn, out) { out = out || []; if (fn(el)) out.push(el); el.children.forEach(function (c) { all(c, fn, out); }); return out; }
var doc = {
  activeElement: null, head: new FakeEl('head'), body: new FakeEl('body'),
  createElement: function (t) { return new FakeEl(t); },
  createElementNS: function (ns, t) { return new FakeEl(t, ns); }
};
global.document = doc; global.window = global; global.devicePixelRatio = 1;
global.getComputedStyle = undefined;

// ---------------------------------------------------------------- load
var base = path.join(__dirname, '..', 'app');
['core', 'synths', 'processors', 'songdoc', 'sequencer', 'song', 'host'].forEach(function (f) { require(path.join(base, 'engine', f + '.js')); });
['widgets', 'faces', 'facedefs'].forEach(function (f) { require(path.join(base, 'ui', f + '.js')); });
var Faces = global.Faces, Widgets = global.Widgets;
check(!!Faces && !!Widgets && !!global.Host, 'Faces, Widgets and Host are loaded');
Faces.strict = true;

// count every control a face creates (wrap the widget factories), keyed by the label they were given
var created = [];
['knob', 'slider', 'toggle', 'select'].forEach(function (n) {
  var orig = Widgets[n];
  Widgets[n] = function (o) { created.push({ kind: n, opts: o }); return orig.apply(Widgets, arguments); };
});

var TYPES = ['kick', 'sub', 'bass', 'stab', 'clap', 'hat_closed', 'hat_open', 'shaker', 'perc', 'lead', 'pad', 'riser', 'impact',
  'filter', 'saturator', 'delay', 'reverb', 'eq3', 'compressor', 'limiter', 'sidechain', 'widener', 'chorus', 'channel'];
var DENS = ['chip', 'strip', 'face', 'window'];
eq(TYPES.length, 24, 'type list is 13 instruments + 10 processors + channel');
TYPES.forEach(function (t) { check(Faces.has(t), 'Faces.has(' + t + ')'); });
check(!Faces.has('nonesuch'), 'Faces.has is false for an unknown type');
eq(Faces.types().length, 24, 'exactly 24 definitions (13 instruments, 10 processor types, channel)');

// ---------------------------------------------------------------- host, with a spy on the writes
var host = global.Host.create();
var writes = [], holds = [];
var rawSet = host.setParam, rawHold = host.hold;
host.setParam = function (p, v) { writes.push([p, v]); return rawSet.apply(host, arguments); };
host.hold = function (p) { holds.push(p); return rawHold.apply(host, arguments); };
var devices = host.devices();
check(devices.length >= 40, 'host has devices (' + devices.length + ')');

// one device per type: prefer a real one from the song, else a synthetic one (so chorus etc. are exercised)
var byType = {};
devices.forEach(function (d) { if (!byType[d.type]) byType[d.type] = d; });
TYPES.forEach(function (t) {
  if (byType[t]) return;
  var spec = (global.Synths.spec(t) || global.Processors.spec(t));
  byType[t] = { id: 'synthetic:' + t, type: t, kind: 'insert', track: 'zz', name: t, family: null, spec: spec, pathPrefix: 'zz.' + t, ref: null, synthetic: true };
});
check(byType.channel && byType.channel.kind === 'channel', 'a channel device exists');

function renderable(spec) { return Object.keys(spec).filter(function (k) { var e = spec[k]; return (typeof e.min === 'number' && typeof e.max === 'number') || typeof e.value === 'boolean' || typeof e.value === 'string'; }); }
function heroOps(el) { var n = 0; all(el, function (x) { return x.tagName === 'canvas'; }).forEach(function (c) { n += (c._ops || []).length; }); return n; }

// ---------------------------------------------------------------- every type x every density
var heroCount = 0, notes = [];
TYPES.forEach(function (t) {
  var d = byType[t], layout = Faces.layout(t);
  DENS.forEach(function (dens) {
    created.length = 0;
    var f = null, id = t + '/' + dens;
    try { f = Faces.render(d, dens, host); } catch (e) { check(false, 'render ' + id + ' threw: ' + (e && e.stack)); return; }
    check(f && f.el && typeof f.update === 'function' && typeof f.dispose === 'function', id + ' returns {el, update, dispose}');
    try { f.update(); f.update(); } catch (e) { check(false, 'update ' + id + ' threw: ' + (e && e.stack)); }
    eq(f.error(), null, id + ' hero drew without an error');
    eq(f.el.getAttribute('data-fam'), d.family || Faces.familyOf[t], id + ' data-fam');
    if (dens === 'chip') {
      check(created.length === 0, id + ' has no controls');
      check(all(f.el, function (x) { return /chip-glyph/.test(x.className); }).length === 1 && all(f.el, function (x) { return /chip-name/.test(x.className); }).length === 1, id + ' is glyph + name');
      check(heroOps(f.el) === 0, id + ' draws no hero');
      f.dispose(); return;
    }
    check(all(f.el, function (x) { return x.tagName === 'canvas'; }).length === 1, id + ' has one hero canvas');
    check(heroOps(f.el) > 8, id + ' hero painted (' + heroOps(f.el) + ' canvas ops)');
    heroCount++;
    check(all(f.el, function (x) { return /hv-head/.test(x.className); }).length === 1, id + ' has one .hv-head');
    eq(f.el.getAttribute('data-density'), dens, id + ' data-density');
    var want = dens === 'strip' ? layout.strip.length : renderable(d.spec).length;
    if (dens === 'strip') want = layout.strip.filter(function (p) { return d.spec[p]; }).length;
    eq(created.length, want, id + ' control count');
    if (dens !== 'strip') {
      var labels = created.map(function (c) { return c.opts.label; });
      eq(labels.filter(function (l, i) { return labels.indexOf(l) !== i; }).length, 0, id + ' no control twice');
    }
    var more = all(f.el, function (x) { return /face-more/.test(x.className); });
    if (dens !== 'strip' && !d.synthetic) notes.push(id + ' more=' + more.length);
    if (dens === 'window' && more.length) eq(more[0].getAttribute('open'), 'open', id + ' more drawer open in the window');
    f.dispose();
    eq(f.el.parentNode, null, id + ' dispose leaves no parent');
  });
});
check(heroCount === TYPES.length * 3, 'every type has a hero at strip, face and window (' + heroCount + ')');

// ---------------------------------------------------------------- hero with live meters
(function () {
  var m = { level: 0.5, peak: 0.5, reduction: -6, correlation: -0.2 };
  var real = host.meter; host.meter = function () { return m; };
  ['compressor', 'limiter', 'sidechain', 'widener', 'channel'].forEach(function (t) {
    var f = Faces.render(byType[t], 'window', host);
    f.update(); f.update();
    eq(f.error(), null, t + ' hero with meter data');
    check(heroOps(f.el) > 20, t + ' live hero painted more with meter data');
    f.dispose();
  });
  m.level = 0; m.reduction = null; m.correlation = null;
  ['compressor', 'limiter', 'sidechain', 'widener', 'channel'].forEach(function (t) {
    var f = Faces.render(byType[t], 'face', host); f.update();
    eq(f.error(), null, t + ' hero with an idle meter');
    f.dispose();
  });
  host.meter = real;
})();

// ---------------------------------------------------------------- every spec param reachable on every real device
devices.forEach(function (d) {
  created.length = 0;
  var f = Faces.render(d, 'face', host), keys = renderable(d.spec);
  eq(created.length, keys.length, d.id + ' reachable controls == renderable spec params (' + keys.length + ')');
  f.update(); f.dispose();
});

// ---------------------------------------------------------------- controls write the path and hold it
(function () {
  var f = Faces.render(byType.kick, 'face', host);
  var tune = all(f.el, function (x) { return x.getAttribute('aria-label') === 'tune'; })[0];
  check(!!tune, 'kick face has a "tune" slider');
  writes.length = 0; holds.length = 0;
  var before = host.getParam('kick.tune');
  fire(tune, 'keydown', { key: 'ArrowUp' });
  check(holds.indexOf('kick.tune') >= 0, 'drag start holds kick.tune (' + holds.join(',') + ')');
  check(writes.length === 1 && writes[0][0] === 'kick.tune' && writes[0][1] > before, 'ArrowUp writes kick.tune above ' + before + ' (' + JSON.stringify(writes) + ')');
  eq(host.getParam('kick.tune'), writes[0][1], 'host holds the written value');
  eq(host.heldCount() >= 1, true, 'heldCount counts the hold');
  f.update();
  eq(tune.getAttribute('data-state'), 'held', 'update() marks the held control with an open ring');
  eq(tune.getAttribute('aria-valuenow'), String(host.getParam('kick.tune')), 'valuenow follows the host');
  host.setParam('kick.tune', 61); f.update();
  eq(tune.getAttribute('aria-valuenow'), '61', 'update() pulls a changed value from host.getParam');
  var lvl = all(f.el, function (x) { return x.getAttribute('aria-label') === 'trim'; });
  eq(lvl.length, 1, 'instrument level is labelled "trim"');
  host.releaseAll(); f.update();
  check(tune.getAttribute('data-state') !== 'held', 'after releaseAll the held marker is gone');
  f.dispose();

  // toggle and select
  var dly = Faces.render(byType.delay, 'face', host);
  var pp = all(dly.el, function (x) { return x.getAttribute('aria-label') === 'pingpong'; })[0] || all(dly.el, function (x) { return x.tagName === 'button' && /pingpong/.test(x.getAttribute('aria-label') || x.textContent || ''); })[0];
  check(!!pp, 'delay face has a pingpong toggle');
  if (pp) {
    writes.length = 0; fire(pp, 'click', {});
    check(writes.length === 1 && writes[0][0] === 'send.delay.pingpong' && writes[0][1] === false, 'toggle writes send.delay.pingpong false (' + JSON.stringify(writes) + ')');
  }
  var sel = all(dly.el, function (x) { return x.tagName === 'select'; });
  eq(sel.length, 1, 'delay face has a division select');
  dly.dispose();
  var bs = Faces.render(byType.bass, 'face', host);
  eq(all(bs.el, function (x) { return x.tagName === 'select'; }).length, 1, 'bass face has a wave select');
  bs.dispose();
  var fl = Faces.render(byType.filter, 'window', host);
  eq(all(fl.el, function (x) { return x.tagName === 'select'; }).length, 1, 'filter window has a mode select');
  fl.dispose();
})();

// ---------------------------------------------------------------- section markers: set, ramp
(function () {
  host.releaseAll();
  var stab = byType.stab, f = Faces.render(stab, 'face', host);
  var cut = all(f.el, function (x) { return x.getAttribute('aria-label') === 'cutoff'; })[0];
  host.transport.jump('intro'); f.update();
  eq(cut.getAttribute('data-state'), 'set', 'intro sets stab.cutoff: filled dot');
  host.transport.jump('intro2'); f.update();
  eq(cut.getAttribute('data-state'), 'ramp', 'intro2 ramps stab.cutoff: ramp marker');
  var dec = all(f.el, function (x) { return x.getAttribute('aria-label') === 'decay'; })[0];
  eq(dec.getAttribute('data-state'), 'none', 'a param the section does not touch has no marker');
  host.hold('stab.cutoff'); f.update();
  eq(cut.getAttribute('data-state'), 'held', 'held beats ramp');
  host.releaseAll();
  var hp = Faces.render(host.device('master:hp'), 'window', host);
  host.transport.jump('intro'); hp.update();
  var mc = all(hp.el, function (x) { return x.getAttribute('aria-label') === 'cutoff'; })[0];
  eq(mc.getAttribute('data-state'), 'set', 'master hp cutoff is set by intro');
  hp.dispose(); f.dispose();
  host.transport.jump('intro');
})();

// ---------------------------------------------------------------- bypass and mute markers, resize, generic fallback
(function () {
  var d = host.device('master:glue'), f = Faces.render(d, 'face', host);
  eq(f.el.getAttribute('data-bypass'), 'false', 'glue not bypassed');
  d.ref._bypassed = true; f.update();
  eq(f.el.getAttribute('data-bypass'), 'true', 'bypass shows on the frame');
  d.ref._bypassed = false;
  f.resize(300, 120); f.update();
  eq(f.error(), null, 'hero redraws after resize');
  f.dispose();
  host.setParam('kick.mute', true);
  var k = Faces.render(byType.kick, 'strip', host); k.update();
  eq(k.el.getAttribute('data-mute'), 'true', 'a muted track marks its instrument face');
  k.dispose(); host.setParam('kick.mute', false);

  DENS.forEach(function (dens) {
    created.length = 0;
    var g = Faces.fallback(byType.eq3, dens, host);
    g.update();
    if (dens === 'chip') eq(created.length, 0, 'fallback chip has no controls');
    else {
      eq(created.length, renderable(byType.eq3.spec).length, 'fallback ' + dens + ' lists every spec param');
      check(created.every(function (c) { return c.kind === 'slider' || c.kind === 'toggle' || c.kind === 'select'; }), 'fallback uses sliders, toggles and selects only');
      eq(all(g.el, function (x) { return x.tagName === 'canvas'; }).length, 0, 'fallback has no hero');
    }
    g.dispose();
  });
  var unknown = { id: 'x', type: 'newthing', kind: 'insert', name: 'newthing', family: 'tone', spec: { a: { min: 0, max: 1, value: 0.5 }, b: { value: true }, c: { value: 'x' } }, pathPrefix: 'zz.newthing', ref: null };
  created.length = 0;
  var u = Faces.render(unknown, 'face', host);
  eq(created.length, 3, 'a type with no face definition falls back to a generic list');
  u.dispose();
  eq(Faces.has('newthing'), false, 'fallback does not register a definition');
})();

// ---------------------------------------------------------------- lint
(function () {
  var problems = Faces.lint(host);
  console.log('lint: ' + problems.length + ' problem(s), ' + problems.notes.length + ' note(s)');
  problems.forEach(function (p) { console.log('  PROBLEM ' + p); });
  problems.notes.slice(0, 12).forEach(function (n) { console.log('  note ' + n); });
  eq(problems.length, 0, 'Faces.lint reports no problems on the current engine');
  // negative tests: a bad layout must be caught
  var good = Faces.layout('kick');
  Faces.define('kick', Object.assign({}, good, { sections: good.sections.concat([{ title: 'x', params: ['nonesuch'] }, { title: 'y', params: ['tune'] }]), strip: ['nope'] }));
  var bad = Faces.lint(host).join('\n');
  check(/kick\.nonesuch: named in the layout but not in the spec/.test(bad), 'lint catches a param that is not in the spec');
  check(/kick\.tune: placed twice/.test(bad), 'lint catches a param placed twice');
  check(/kick\.nope: named in strip/.test(bad), 'lint catches a bad strip name');
  Faces.define('kick', Object.assign({}, good, { sections: [{ title: 'p', params: [{ p: 'tune', widget: 'select' }] }] }));
  check(/kick\.tune: select used for a numeric param/.test(Faces.lint(host).join('\n')), 'lint catches a select on a number');
  var noHero = Object.assign({}, good); delete noHero.hero; Faces.define('kick', noHero);
  check(/kick: no hero graph/.test(Faces.lint(host).join('\n')), 'lint catches a missing hero');
  Faces.define('kick', good);
  eq(Faces.lint(host).length, 0, 'lint is clean again after restoring kick');
  // an unplaced engine param goes to the "more" drawer and is a note, not a problem
  var spec = byType.kick.spec; spec.future = { min: 0, max: 1, value: 0.2 };
  created.length = 0;
  var f = Faces.render(byType.kick, 'face', host);
  check(created.some(function (c) { return c.opts.label === 'future'; }), 'a new spec param appears in the "more" drawer');
  check(Faces.lint(host).notes.some(function (n) { return /kick\.future/.test(n); }), 'lint lists it as a note');
  eq(Faces.lint(host).length, 0, 'an unplaced param is not a lint problem');
  delete spec.future; f.dispose();
})();

// ---------------------------------------------------------------- cost
(function () {
  var f = Faces.render(byType.bass, 'window', host), t0 = Date.now(), i;
  for (i = 0; i < 200; i++) f.update();
  var ms = Date.now() - t0;
  check(ms < 2000, '200 x update() of the bass window in ' + ms + ' ms');
  console.log('update() x200 on the bass window: ' + ms + ' ms (fake DOM, no canvas cost)');
  f.dispose();
})();

console.log('devices rendered: ' + devices.length + ' real + ' + TYPES.filter(function (t) { return byType[t].synthetic; }).join(', ') + ' synthetic; heroes drawn: ' + heroCount);
if (fails.length) {
  console.log('FAILED (' + fails.length + ' of ' + count + '):');
  fails.forEach(function (m) { console.log('  FAIL ' + m); });
  process.exit(1);
}
console.log('OK: ' + count + ' checks passed');
