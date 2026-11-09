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
['core', 'synths', 'processors', 'drums', 'songdoc', 'sequencer', 'song', 'host'].forEach(function (f) { require(path.join(base, 'engine', f + '.js')); });
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

var TYPES = ['kick', 'sub', 'bass', 'fm', 'stab', 'clap', 'hat_closed', 'hat_open', 'shaker', 'perc', 'lead', 'pad', 'riser', 'impact',
  'filter', 'saturator', 'delay', 'reverb', 'eq3', 'compressor', 'limiter', 'sidechain', 'widener', 'chorus', 'channel', 'sampler', 'decorrelate'].concat(global.Drums.types());
var DENS = ['chip', 'strip', 'face', 'window'];
eq(TYPES.length, 54, 'type list is 15 instruments + 11 processor types + channel + 27 drum voices');
TYPES.forEach(function (t) { check(Faces.has(t), 'Faces.has(' + t + ')'); });
check(!Faces.has('nonesuch'), 'Faces.has is false for an unknown type');
eq(Faces.types().length, 54, 'exactly 54 definitions (15 instruments, 11 processor types, channel, 27 drum voices)');

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
  var spec = (global.Synths.spec(t) || global.Processors.spec(t) || global.Drums.spec(t));
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
    eq(all(f.el, function (x) { return x.tagName === 'canvas'; }).length, (t === 'sampler' && dens === 'window') ? 2 : 1, id + ' hero canvas count (the sampler window adds the zone map)');
    check(heroOps(f.el) > 8, id + ' hero painted (' + heroOps(f.el) + ' canvas ops)');
    heroCount++;
    eq(all(f.el, function (x) { return /hv-head/.test(x.className); }).length, dens === 'window' ? 0 : 1, id + (dens === 'window' ? ' has no head (the window owns the title bar)' : ' has one .hv-head'));
    if (dens === 'window') {
      var kids = all(f.el, function (x) { return /face-body/.test(x.className); })[0].children;
      check(/face-hero/.test(kids[0].className), id + ' hero comes first');
      check(all(f.el, function (x) { return /face-section/.test(x.className) && x.tagName === 'section'; }).length >= 1, id + ' has its section controls below the hero');
      f.resize(700, 600);
      var cv = all(f.el, function (x) { return x.tagName === 'canvas'; })[0];
      eq(cv.getAttribute('width'), '668', id + ' hero takes the window width after resize');
      check(Number(cv.getAttribute('height')) <= 340 && Number(cv.getAttribute('height')) >= 96, id + ' hero keeps room for the controls (height ' + cv.getAttribute('height') + ')');
      f.update();
      eq(f.error(), null, id + ' hero draws after resize');
    }
    eq(f.el.getAttribute('data-density'), dens, id + ' data-density');
    var want = dens === 'strip' ? layout.strip.length : (dens === 'face' && layout.quick) ? layout.quick.length : renderable(d.spec).length + ((t === 'sampler' && dens === 'window') ? 2 : 0);   // the region panel adds loop and reverse
    if (dens === 'strip') want = layout.strip.filter(function (p) { return d.spec[p]; }).length;
    eq(created.length, want, id + ' control count');
    if (dens !== 'strip' && t !== 'sampler') {
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

// ---------------------------------------------------------------- mute is not held; home is the song's value; hero share of the height
(function () {
  host.releaseAll(); holds.length = 0; writes.length = 0;
  var ch = Faces.render(host.device('track:kick:channel'), 'face', host);
  var mute = all(ch.el, function (x) { return x.tagName === 'button' && /mute/i.test((x.getAttribute('aria-label') || '') + (x.textContent || '')); })[0] || all(ch.el, function (x) { return /mute/i.test(x.getAttribute('aria-label') || ''); })[0];
  check(!!mute, 'channel face has a mute toggle');
  if (mute) {
    fire(mute, 'click', {});
    check(writes.some(function (w) { return w[0] === 'kick.mute' && w[1] === true; }), 'mute toggle writes kick.mute (' + JSON.stringify(writes) + ')');
    eq(holds.length, 0, 'mute never calls host.hold');
    eq(host.heldCount(), 0, 'mute does not count as held');
    fire(mute, 'click', {});
  }
  ch.dispose(); host.setParam('kick.mute', false);
  // a select or an ordinary toggle still holds
  writes.length = 0; holds.length = 0;
  var dl = Faces.render(byType.delay, 'face', host);
  var pp = all(dl.el, function (x) { return x.getAttribute('aria-label') === 'pingpong'; })[0];
  if (pp) { fire(pp, 'click', {}); eq(holds.length, 1, 'a pingpong toggle holds its path'); }
  dl.dispose(); host.releaseAll();

  // home: document value (kick.tune is in the song's kick params), not the spec default
  var doc = host.document(), kt = doc.tracks.filter(function (t) { return t.name === 'kick'; })[0].params.tune;
  host.transport.jump('intro');
  var f = Faces.render(byType.kick, 'face', host);
  var tune = all(f.el, function (x) { return x.getAttribute('aria-label') === 'tune'; })[0];
  host.setParam('kick.tune', 70); f.update();
  writes.length = 0;
  fire(tune, 'keydown', { key: 'Delete' });
  check(writes.length === 1 && writes[0][0] === 'kick.tune' && writes[0][1] === kt, 'Delete returns kick.tune to the song value ' + kt + ' (spec default is ' + byType.kick.spec.tune.value + '): ' + JSON.stringify(writes));
  host.setParam('kick.tune', kt); host.releaseAll();
  f.dispose();
  // a section's set value wins over the document value
  var st = Faces.render(byType.stab, 'face', host), cut = all(st.el, function (x) { return x.getAttribute('aria-label') === 'cutoff'; })[0];
  host.setParam('kick.mute', false); host.setParam('stab.cutoff', 900); st.update();   // a jump already applies the section's 500, so move the knob off it first
  writes.length = 0; fire(cut, 'keydown', { key: 'Delete' });
  eq(writes.length === 1 ? writes[0][1] : null, 500, 'Delete returns stab.cutoff to the intro section value (500)');
  host.releaseAll(); st.dispose();
  // resize: the hero is at most ~45% of the face area
  [['window', 700, 537], ['window', 900, 900], ['face', 400, 300]].forEach(function (a) {
    var g = Faces.render(byType.bass, a[0], host); g.resize(a[1], a[2]);
    var cv = all(g.el, function (x) { return x.tagName === 'canvas'; })[0], hgt = Number(cv.getAttribute('height'));
    check(hgt <= Math.max(60, Math.round(a[2] * 0.45)), a[0] + ' ' + a[1] + 'x' + a[2] + ': hero height ' + hgt + ' is at most 45% of the area');
    check(Number(cv.getAttribute('width')) < a[1], a[0] + ': hero narrower than the area');
    g.dispose();
  });
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

// ---------------------------------------------------------------- sampler: waveform hero, drag handles, flags, buffer list
(function () {
  var d = byType.sampler, ov = { 'zz.sampler.buffer': 'b1', 'zz.sampler.start': 0.2, 'zz.sampler.end': 0 };
  var sh = Object.create(host), sw = [], sholds = [];
  sh.getParam = function (p) { return Object.prototype.hasOwnProperty.call(ov, p) ? ov[p] : host.getParam(p); };
  sh.setParam = function (p, v) { sw.push([p, v]); ov[p] = v; return true; };
  sh.hold = function (p) { sholds.push(p); };
  sh.audio = function () { return [{ id: 'b1', name: 'loop.wav', duration: 2 }, { id: 'b2', name: 'hit.wav', duration: 0.4 }]; };
  var data = new Float32Array(48000); for (var i = 0; i < data.length; i++) data[i] = Math.sin(i / 40) * (1 - i / data.length);
  sh.buffer = function (id) { return id === 'b1' ? { duration: 2, getChannelData: function () { return data; } } : null; };
  created.length = 0;
  var f = Faces.render(d, 'window', sh); f.update(); f.resize(700, 600);
  eq(f.error(), null, 'sampler hero draws a waveform');
  check(heroOps(f.el) > 400, 'sampler hero painted the peaks (' + heroOps(f.el) + ' ops)');
  var flags = created.filter(function (c) { return c.opts.label === 'loop' || c.opts.label === 'reverse'; });
  flags = [flags.filter(function (c) { return c.opts.label === 'loop'; }).pop(), flags.filter(function (c) { return c.opts.label === 'reverse'; }).pop()];
  check(flags.length === 2 && flags.every(function (c) { return c.kind === 'toggle'; }), 'loop and reverse are toggles');
  var sel = created.filter(function (c) { return c.kind === 'select'; }).map(function (c) { return c.opts.label + ':' + c.opts.options.length; });
  check(sel.indexOf('buffer:3') >= 0 && sel.indexOf('choke:5') >= 0, 'buffer select lists none + the 2 loaded sources, choke has its groups (' + sel.join(' ') + ')');
  var loop = flags.filter(function (c) { return c.opts.label === 'loop'; })[0];
  sw.length = 0; loop.opts.onInput(true);
  check(sw.length === 1 && sw[0][0] === 'zz.sampler.loop' && sw[0][1] === 1, 'loop toggle writes 1 (' + JSON.stringify(sw) + ')');
  // drag the start handle
  var wrap = all(f.el, function (x) { return /face-hero/.test(x.className); })[0], cv = all(f.el, function (x) { return x.tagName === 'canvas'; })[0];
  var W0 = Number(cv.getAttribute('width')), gx = 6, gw = W0 - 12;
  sw.length = 0; sholds.length = 0;
  fire(wrap, 'pointerdown', { button: 0, clientX: gx + 0.2 * gw + 3, clientY: 20, pointerId: 1 });
  fire(wrap, 'pointermove', { clientX: gx + 0.45 * gw, clientY: 20, pointerId: 1 });
  fire(wrap, 'pointermove', { clientX: gx + 0.5 * gw, clientY: 20, pointerId: 1 });
  fire(wrap, 'pointerup', { clientX: gx + 0.5 * gw, clientY: 20, pointerId: 1 });
  check(sw.length === 2 && sw[0][0] === 'zz.sampler.start' && Math.abs(sw[1][1] - 0.5) < 0.01, 'dragging the start handle writes start (' + JSON.stringify(sw) + ')');
  eq(sholds.length, 1, 'one hold per hero gesture');
  // a press far from both handles does nothing
  sw.length = 0; fire(wrap, 'pointerdown', { button: 0, clientX: gx + 0.8 * gw, clientY: 20, pointerId: 1 }); fire(wrap, 'pointermove', { clientX: gx + 0.9 * gw, clientY: 20 });
  eq(sw.length, 0, 'a press away from the handles writes nothing');
  // end handle: end 0 means the whole buffer, so its handle sits at the right edge
  sw.length = 0; fire(wrap, 'pointerdown', { button: 0, clientX: gx + gw - 2, clientY: 20, pointerId: 1 }); fire(wrap, 'pointermove', { clientX: gx + 0.8 * gw, clientY: 20 });
  check(sw.length === 1 && sw[0][0] === 'zz.sampler.end' && Math.abs(sw[0][1] - 0.8) < 0.01, 'dragging the end handle writes end');
  fire(wrap, 'pointerup', { clientX: gx + 0.8 * gw, clientY: 20 });
  // options follow the host's audio list
  var more = [{ id: 'b1', name: 'loop.wav' }, { id: 'b2', name: 'hit.wav' }, { id: 'b3', name: 'new.wav' }];
  sh.audio = function () { return more; };
  var setOpt = null; f.update();
  eq(f.error(), null, 'sampler update with a longer audio list');
  f.dispose();
  // no buffer available: placeholder, no error
  var g2 = Faces.render(d, 'face', host); g2.update();
  eq(g2.error(), null, 'sampler hero with no sample');
  g2.dispose();
})();

// ---------------------------------------------------------------- sampler, program path: zone map, region panel, handles, buttons
(function () {
  var id = host.addProgram({ name: 'kit', kind: 'drums', regions: [
    { buffer: 'b1', lokey: 36, hikey: 36, root: 36, lovel: 1, hivel: 127 },
    { buffer: 'b1', lokey: 38, hikey: 40, root: 39, lovel: 1, hivel: 80, loop: 'continuous', loopStart: 1000, loopEnd: 60000, xfade: 0.01 },
    { buffer: 'gone', lokey: 42, hikey: 42, root: 42, lovel: 1, hivel: 127 }] }, { id: 'kit' });
  eq(id, 'kit', 'host.addProgram stores the program');
  var d = { id: 'track:zz', type: 'sampler', kind: 'instrument', track: 'zz', name: 'zz', family: 'drums', spec: global.Synths.spec('sampler'), pathPrefix: 'zz', ref: null };
  var ov = { 'zz.program': 'kit' }, sh = Object.create(host), calls = [];
  sh.getParam = function (p) { return Object.prototype.hasOwnProperty.call(ov, p) ? ov[p] : host.getParam(p); };
  sh.setParam = function (p, v) { ov[p] = v; calls.push(['set', p, v]); return true; };
  sh.hold = function (p) { calls.push(['hold', p]); };
  var data = new Float32Array(96000); for (var i = 0; i < data.length; i++) data[i] = Math.sin(i / 50) * (1 - i / data.length);
  sh.buffer = function (b) { return b === 'b1' ? { duration: 2, sampleRate: 48000, length: 96000, getChannelData: function () { return data; } } : null; };
  sh.audio = function () { return [{ id: 'b1', name: 'loop.wav', duration: 2 }]; };
  sh.assignProgram = function (t, p) { calls.push(['assign', t, p]); return true; };
  sh.exportProgram = function (t) { calls.push(['export', t]); return Promise.resolve({ text: 'x', id: 'kit', path: 'p' }); };
  Faces.layout('sampler');
  created.length = 0;
  var f = Faces.render(d, 'window', sh); f.update(); f.resize(700, 700);
  eq(f.error(), null, 'program hero draws');
  check(heroOps(f.el) > 100, 'program hero and zone map painted');
  var zone = all(f.el, function (x) { return /hv-zone/.test(x.className); })[0], zcv = all(zone, function (x) { return x.tagName === 'canvas'; })[0];
  check(!!zone && !!zcv, 'zone map panel exists in the window');
  var region = all(f.el, function (x) { return /hv-region/.test(x.className); })[0];
  var input = function (n) { return all(region, function (x) { return x.tagName === 'input' && x.getAttribute('aria-label') === n; })[0]; };
  eq(input('lokey').value, 36, 'region panel shows region 1 (lokey 36)');
  var buttons = all(f.el, function (x) { return x.tagName === 'button' && /hv-prog|btn/.test(x.className) && /…|SFZ|pitch/.test(x.textContent); }).map(function (b) { return b.textContent; });
  check(buttons.length === 5, 'five buttons (' + buttons.join(' | ') + ')');
  // select a region by clicking it in the zone map (region 2: keys 38..40, velocities 1..80)
  var ZW = Number(zcv.getAttribute('width')), gh = 150 - 14, zp = zone.children[1];
  function zfire(t, kx, vy, extra) { fire(zp, t, Object.assign({ button: 0, clientX: kx / 128 * ZW, clientY: vy, pointerId: 1 }, extra || {})); }
  zfire('pointerdown', 39.5, (127 - 40) / 127 * gh); zfire('pointerup', 39.5, 0);
  f.update();
  eq(input('lokey').value, 38, 'clicking a zone selects region 2');
  check(/region 2 of 3/.test(all(region, function (x) { return /face-section-title/.test(x.className); })[0].textContent), 'region panel title follows the selection');
  zfire('pointerdown', 36.5, (127 - 100) / 127 * gh, { shiftKey: true }); zfire('pointerup', 36.5, 0);
  f.update();
  check(/2 selected/.test(all(region, function (x) { return /face-section-title/.test(x.className); })[0].textContent), 'shift-click adds a region to the selection');
  zfire('pointerdown', 36.5, (127 - 100) / 127 * gh, { shiftKey: true }); zfire('pointerup', 36.5, 0);   // shift again removes it
  // drag the hikey edge of the selected region from key 41 to key 50: one undo step
  var ed = host.editor(), before = JSON.stringify(host.program('kit').regions[1]);
  zfire('pointerdown', 41, (127 - 40) / 127 * gh);
  fire(zp, 'pointermove', { clientX: 50.5 / 128 * ZW, clientY: (127 - 40) / 127 * gh });
  fire(zp, 'pointerup', { clientX: 50.5 / 128 * ZW, clientY: 0 });
  eq(host.program('kit').regions[1].hikey, 50, 'dragging the zone edge sets hikey through setRegion');
  ed.undo(); eq(JSON.stringify(host.program('kit').regions[1]), before, 'the edge drag was one undo step');
  ed.redo();
  // region panel edit and overrides clear
  input('tune').value = '12'; fire(input('tune'), 'change', {});
  eq(host.program('kit').regions[1].tune, 12, 'typing a region field edits the document');
  f.update();
  // drag the end handle of the selected region (region 2, buffer b1, 96000 frames): hero handle at the right edge
  var hero = all(f.el, function (x) { return /face-hero/.test(x.className); })[0], hcv = all(hero, function (x) { return x.tagName === 'canvas'; })[0], HW = Number(hcv.getAttribute('width'));
  var g0 = 6, gw = HW - 12;
  fire(hero, 'pointerdown', { button: 0, clientX: g0 + gw - 1, clientY: 10, pointerId: 1 });
  fire(hero, 'pointermove', { clientX: g0 + 0.5 * gw, clientY: 10 });
  check(!host.program('kit').regions[1].end, 'the document is not touched while dragging');
  fire(hero, 'pointerup', { clientX: g0 + 0.5 * gw, clientY: 10 });
  var en = host.program('kit').regions[1].end;
  check(Math.abs(en - 48000) < 400, 'releasing the end handle writes region.end in frames (' + en + ')');
  eq(f.error(), null, 'hero redraws after the edits');
  // program select writes through assignProgram, not setParam, and is not held
  calls.length = 0;
  var psel = created.filter(function (c) { return c.opts.label === 'program'; })[0];
  check(!!psel && psel.opts.options.length === 2, 'program select lists (single sample) and kit');
  psel.opts.onInput('kit');
  check(calls.length === 1 && calls[0][0] === 'assign' && calls[0][1] === 'zz' && calls[0][2] === 'kit', 'program select calls host.assignProgram (' + JSON.stringify(calls) + ')');
  // export button
  calls.length = 0;
  var ex = all(f.el, function (x) { return x.tagName === 'button' && /Export/.test(x.textContent); })[0]; fire(ex, 'click', {});
  check(calls.length === 1 && calls[0][0] === 'export' && calls[0][1] === 'zz', 'Export SFZ calls host.exportProgram for the track');
  var rd = all(f.el, function (x) { return x.tagName === 'button' && /Re-detect/.test(x.textContent); })[0];
  eq(rd.disabled === true, typeof sh.detectPitch !== 'function', 'Re-detect pitch is enabled exactly when the host has detectPitch');
  f.dispose();
  // face and strip density: quick view only, no panels
  created.length = 0;
  var q = Faces.render(d, 'face', sh); q.update();
  eq(created.map(function (c) { return c.opts.label; }).join(','), 'pitch,attack,release,trim,cutoff,key', 'face density shows the Sitala-style quick view');
  eq(all(q.el, function (x) { return /hv-zone|hv-region/.test(x.className); }).length, 0, 'no zone map or region panel at face density');
  eq(q.error(), null, 'program hero at face density');
  q.dispose();
  // single-sample path still works when the program id is unknown
  ov['zz.program'] = 'nope'; var u = Faces.render(d, 'window', sh); u.update(); eq(u.error(), null, 'unknown program id falls back to the single-sample hero'); u.dispose();
  ov['zz.program'] = ''; 
})();

// ---------------------------------------------------------------- drum voices: skins, prior rings, one definition per voice
(function () {
  var Dr = global.Drums, n808 = 0, n909 = 0;
  Dr.types().forEach(function (t) {
    var d = byType[t], spec = Dr.spec(t), priors = Object.keys(spec).filter(function (k) { return spec[k].basis === 'prior'; }).length;
    var f = Faces.render(d, 'window', host); f.update();
    var rings = all(f.el, function (x) { return /hv-prior/.test(x.className); });
    eq(rings.length, priors, t + ': one dotted ring per prior control (' + priors + ')');
    check(rings.every(function (r) { return r.getAttribute('aria-hidden') === 'true' && r.textContent === ''; }), t + ': rings carry no words');
    var ink = f.el.style._p['--fam-ink'];
    eq(ink, /808$/.test(t) ? '#ff5a36' : '#cfd3da', t + ': skin (808 orange-red, 909 grey-black)');
    if (/808$/.test(t)) n808++; else n909++;
    eq(f.error(), null, t + ' hero');
    f.dispose();
  });
  eq(n808, 16, '16 voices of 808'); eq(n909, 11, '11 voices of 909');
  check(Faces.has('lt808') && Faces.has('hc808') && Faces.has('rd909'), 'toms, congas and cymbals have faces');
  var ctl = Faces.render(byType.bd808, 'face', host), lvl = all(ctl.el, function (x) { return x.getAttribute('aria-label') === 'level'; });
  eq(all(lvl[0] || ctl.el, function (x) { return /hv-prior/.test(x.className); }).length, 0, 'a fitted control (level) has no ring');
  ctl.dispose();
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
