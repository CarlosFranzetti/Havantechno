#!/usr/bin/env node
/* Smoke test for app/ui/system-editor.js in Node with a tiny fake DOM.
 *   node tools/system-editor-check.js
 * Uses the real Host (app/engine/host.js) when it exists and loads, else a minimal fake host with the CONTRACT's shape.
 * Uses the real Widgets / Faces / Windows when their files exist and load, else small fakes.
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var APP = path.join(__dirname, '..', 'app');

// ------------------------------------------------------------------ fake DOM
function FakeNode(tag) {
  this.tagName = String(tag).toUpperCase(); this.children = []; this.parentNode = null; this.style = {}; this.attrs = {};
  this.className = ''; this._text = ''; this.listeners = {}; this.hidden = false; this.id = '';
  var self = this;
  this.classList = {
    toggle: function (c, on) {
      var p = self.className.split(/\s+/).filter(Boolean), i = p.indexOf(c);
      if (on === undefined) on = i < 0;
      if (on && i < 0) p.push(c); else if (!on && i >= 0) p.splice(i, 1);
      self.className = p.join(' '); return on;
    },
    contains: function (c) { return self.className.split(/\s+/).indexOf(c) >= 0; }
  };
}
FakeNode.prototype.appendChild = function (c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; };
FakeNode.prototype.removeChild = function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; };
Object.defineProperty(FakeNode.prototype, 'firstChild', { get: function () { return this.children[0] || null; } });
Object.defineProperty(FakeNode.prototype, 'textContent', {
  get: function () { return this._text + this.children.map(function (c) { return c.textContent; }).join(''); },
  set: function (v) { this.children = []; this._text = String(v); }
});
FakeNode.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); };
FakeNode.prototype.removeAttribute = function (k) { delete this.attrs[k]; };
FakeNode.prototype.addEventListener = function (t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); };
FakeNode.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 800, height: 20 }; };
FakeNode.prototype.fire = function (t, ev) { (this.listeners[t] || []).slice().forEach(function (f) { f(ev || { stopPropagation: function () {}, preventDefault: function () {} }); }); };
FakeNode.prototype.walk = function (fn) { fn(this); this.children.forEach(function (c) { c.walk(fn); }); };
FakeNode.prototype.find = function (pred) { var out = []; this.walk(function (n) { if (pred(n)) out.push(n); }); return out; };
function hasClass(n, c) { return n.className.split(/\s+/).indexOf(c) >= 0; }

var head = new FakeNode('head'), byId = {};
var fakeDoc = {
  head: head, body: new FakeNode('body'),
  createElement: function (t) { return new FakeNode(t); },
  createElementNS: function (ns, t) { return new FakeNode(t); },
  createTextNode: function (s) { var n = new FakeNode('#text'); n._text = String(s); return n; },
  getElementById: function (id) { return byId[id] || null; }
};
var winLayer = new FakeNode('div'); winLayer.id = 'windows'; byId.windows = winLayer; fakeDoc.body.appendChild(winLayer);   // app.js provides #windows in the real page
var origAppend = head.appendChild;
head.appendChild = function (c) { if (c.id) byId[c.id] = c; return origAppend.call(head, c); };

// ------------------------------------------------------------------ sandbox
var sb = { console: console, Math: Math, JSON: JSON, Date: Date, setTimeout: setTimeout, clearTimeout: clearTimeout, Float32Array: Float32Array, Uint8Array: Uint8Array };
sb.window = sb; sb.document = fakeDoc; sb.globalThis = sb;
vm.createContext(sb);
function load(rel) { vm.runInContext(fs.readFileSync(path.join(APP, rel), 'utf8'), sb, { filename: rel }); }
function exists(rel) { return fs.existsSync(path.join(APP, rel)); }

var used = {};
['engine/core.js', 'engine/synths.js', 'engine/processors.js', 'engine/songdoc.js', 'engine/sequencer.js', 'engine/song.js'].forEach(load);

// UI parts: real if present and loadable, fake otherwise
function tryLoad(rel, global_) {
  if (!exists(rel)) return false;
  try { load(rel); return !global_ || !!sb[global_]; } catch (e) { console.log('  (could not load ' + rel + ': ' + e.message + ')'); return false; }
}
used.widgets = tryLoad('ui/widgets.js', 'Widgets');
if (used.widgets) {
  // the real widgets need a fuller DOM (createElementNS, canvas); use them only if they survive the fake document
  try { sb.Widgets.steps({ count: 16 }); sb.Widgets.meter({ size: 'chip' }); } catch (e) { console.log('  (real Widgets need a real DOM: ' + e.message + '; using fake Widgets)'); used.widgets = false; }
}
used.faces = tryLoad('ui/faces.js', 'Faces') && tryLoad('ui/facedefs.js');
used.windows = tryLoad('ui/windows.js', 'Windows');
var fakeCalls = { faceRender: 0, faceDispose: 0, faceUpdate: 0, winOpen: [], onSelect: [], stepsToggles: 0 };
if (!used.widgets) {
  sb.Widgets = {
    steps: function (o) {
      var el = new FakeNode('div'); el.opts = o; el.cells = o.cells || [];
      return { el: el, set: function (c) { el.cells = c; fakeCalls.stepsSet = (fakeCalls.stepsSet || 0) + 1; } };
    },
    meter: function () { var el = new FakeNode('div'); return { el: el, set: function (v) { el.level = v; } }; }
  };
}
if (!used.faces) {
  sb.Faces = {
    render: function (d, density) {
      fakeCalls.faceRender++;
      var el = new FakeNode('div'); el.className = 'hv-face ' + density;
      var hd = new FakeNode('div'); hd.className = 'hv-head'; hd.textContent = d.id; el.appendChild(hd); el.headNode = hd;
      return { el: el, update: function () { fakeCalls.faceUpdate++; }, dispose: function () { fakeCalls.faceDispose++; } };
    }
  };
}
if (!used.windows) {
  sb.Windows = { open: function (id) { fakeCalls.winOpen.push(id); }, onSelect: function (id) { fakeCalls.onSelect.push(id); } };
}

// spy on Windows.open / onSelect whether real or fake (real call goes through, errors are recorded)
(function () {
  var realOpen = sb.Windows.open, realSel = sb.Windows.onSelect;
  sb.Windows.open = function (id, h) { fakeCalls.winOpen.push([id, h]); var r; try { r = realOpen.apply(this, arguments); } catch (e) { fakeCalls.winErr = e.message; } return r; };
  sb.Windows.onSelect = function (id) { fakeCalls.onSelect.push(id); try { return realSel && realSel.apply(this, arguments); } catch (e) { fakeCalls.winErr = e.message; } };
})();

// ------------------------------------------------------------------ host: real if host.js exists, else fake
var host, hostKind = 'fake';
function fakeHost() {
  var h = { _l: {}, _doc: sb.Song.document(), _step: 0, playing: false, params: {}, calls: { commit: 0, jump: [], loop: [], mute: [] } };
  h._ed = sb.SongDoc.createEditor(h._doc);
  h.document = function () { return h._ed.doc; };
  h.editor = function () { return h._ed; };
  h.commit = function () { h.calls.commit++; h.emit('document', { reason: 'commit', rebuilt: !!h.forceRebuild }); };
  h.on = function (t, f) { (h._l[t] = h._l[t] || []).push(f); };
  h.off = function (t, f) { h._l[t] = (h._l[t] || []).filter(function (x) { return x !== f; }); };
  h.emit = function (t, e) { (h._l[t] || []).slice().forEach(function (f) { f(e); }); };
  var secs = h._doc.sections;
  h.transport = {
    playing: false,
    pos: function () {
      var bar = Math.floor(h._step / 16), s = 0, i, start = 0;
      for (i = 0; i < secs.length; i++) { if (bar < start + secs[i].bars) { s = i; break; } start += secs[i].bars; }
      return { step: h._step % 16, bar: bar, section: s, sectionName: secs[s].name, barInSection: bar - start };
    },
    jump: function (r) { h.calls.jump.push(r); }, loop: function (r) { h.calls.loop.push(r); },
    play: function () {}, pause: function () {}, stop: function () {}, toggle: function () {}, rewind: function () {}
  };
  h.mute = function (n, b) { h.calls.mute.push([n, b]); };
  h.solo = function () {};
  h.setParam = function (p, v) { h.params[p] = v; return true; };
  h.getParam = function (p) { return h.params[p]; };
  h.meter = function () { return { level: Math.random(), reduction: null, correlation: null }; };
  var fam = { kick: 'drums', clap: 'drums', hat_closed: 'drums', hat_open: 'drums', shaker: 'drums', perc: 'drums', sub: 'bass', bass: 'bass', stab: 'keys', lead: 'keys', pad: 'keys', riser: 'fx', impact: 'fx' };
  var devs = [];
  h._doc.tracks.forEach(function (t) {
    devs.push({ id: 'track:' + t.name, type: t.inst, kind: 'instrument', track: t.name, name: t.name, family: fam[t.name], pathPrefix: t.name, spec: {} });
    (t.chain || []).forEach(function (c) { devs.push({ id: 'track:' + t.name + ':' + c.name, type: c.type, kind: 'insert', track: t.name, name: c.name, family: 'tone', pathPrefix: t.name + '.' + c.name, spec: {} }); });
    devs.push({ id: 'track:' + t.name + ':sc', type: 'sidechain', kind: 'sidechain', track: t.name, name: 'duck', family: 'dynamics', pathPrefix: t.name + '.sc', spec: {} });
    devs.push({ id: 'track:' + t.name + ':channel', type: 'channel', kind: 'channel', track: t.name, name: 'channel', family: 'utility', pathPrefix: t.name, spec: {} });
  });
  ['delay', 'reverb'].forEach(function (s) { devs.push({ id: 'send:' + s, type: s, kind: 'send', track: null, name: s, family: 'time', pathPrefix: 'send.' + s, spec: {} }); });
  ['eq', 'hp', 'lp', 'glue', 'sat', 'limiter'].forEach(function (m) { devs.push({ id: 'master:' + m, type: m, kind: 'master', track: null, name: m, family: 'dynamics', pathPrefix: 'master.' + m, spec: {} }); });
  h.devices = function () { return devs; };
  h.device = function (id) { return devs.filter(function (d) { return d.id === id; })[0] || null; };
  return h;
}
if (exists('engine/host.js')) {
  try {
    load('engine/host.js');
    host = sb.Host.create();
    if (!host.transport || !host.document) throw new Error('Host.create() lacks the contract shape');
    hostKind = 'real Host.create()';
  } catch (e) { console.log('  (real host.js not usable: ' + e.message + '; using the fake host)'); host = null; }
}
if (!host) host = fakeHost();
used.host = hostKind;

// ------------------------------------------------------------------ checks
var passed = 0;
function ok(cond, msg) { if (!cond) { console.log('FAIL: ' + msg); process.exitCode = 1; throw new Error(msg); } passed++; }
load('ui/system-editor.js');
ok(sb.SystemEditor && typeof sb.SystemEditor.mount === 'function', 'SystemEditor.mount exists');

var mountEl = new FakeNode('div');
var view = sb.SystemEditor.mount(mountEl, host);
ok(view && typeof view.update === 'function' && typeof view.dispose === 'function' && typeof view.select === 'function', 'mount returns {update, dispose, select}');
ok(byId['se-style'], 'style injected once');

var rows = mountEl.find(function (n) { return n.attrs['data-track']; });
ok(rows.length === 13, 'thirteen track rows (got ' + rows.length + ')');
var heads = mountEl.find(function (n) { return hasClass(n, 'se-gtoggle'); });
ok(heads.length === 4, 'four stem group headers (got ' + heads.length + ')');
ok(/DRUMS/.test(heads[0].textContent) && /BASS/.test(heads[1].textContent) && /OTHER/.test(heads[2].textContent) && /FX/.test(heads[3].textContent), 'group order DRUMS BASS OTHER FX');
var secs = host.document().sections;
var blocks = mountEl.find(function (n) { return hasClass(n, 'se-blk'); });
ok(blocks.length === secs.length, 'one ruler block per section (' + blocks.length + ')');
var ruler = mountEl.find(function (n) { return hasClass(n, 'se-ruler'); })[0].children[1];
ok(/16fr.*8fr.*16fr.*32fr.*32fr.*24fr.*8fr.*48fr.*16fr/.test(ruler.style.gridTemplateColumns), 'ruler columns weighted by bars: ' + ruler.style.gridTemplateColumns);
ok(rows[0].find(function (n) { return hasClass(n, 'se-cell'); }).length === secs.length, 'nine section cells per row');
var kickCells = rows[0].find(function (n) { return hasClass(n, 'se-cell'); });
ok(kickCells[0].textContent === 'A', 'kick intro cell shows variant A');

ok(mountEl.find(function (n) { return hasClass(n, 'se-devrow'); }).length === 1, 'device row present');
ok(mountEl.find(function (n) { return hasClass(n, 'se-pchip'); }).length >= 5, 'RETURNS and MASTER chips present');
ok(/PATTERN/.test(mountEl.find(function (n) { return hasClass(n, 'se-devrow'); })[0].textContent), 'PATTERN face is the first device');

// select two tracks
function patternTitle() { return mountEl.find(function (n) { return hasClass(n, 'se-dtitle') && /^PATTERN/.test(n.textContent); })[0].textContent; }
ok(/kick/.test(patternTitle()), 'default selection is the first track');
view.select('bass'); ok(/bass/.test(patternTitle()), 'select(bass) rebuilds the device row');
var devTitles = mountEl.find(function (n) { return hasClass(n, 'se-dev') && n.attrs['data-fam']; }).length;
ok(devTitles >= 3, 'bass device row shows pattern + instrument + insert + channel (' + devTitles + ' boxes)');
view.select('lead'); ok(/lead/.test(patternTitle()), 'select(lead) works');
ok(mountEl.find(function (n) { return hasClass(n, 'se-roll'); }).length === 1, 'lead (melody) gets the compact roll');
view.select('pad'); ok(mountEl.find(function (n) { return hasClass(n, 'se-prog'); }).length === 1, 'pad (chord) gets the progression strip');
view.select('nope'); ok(/pad/.test(patternTitle()), 'select(unknown) is ignored');
view.select('kick');

// double-click on a device face's head opens its window (the face draws the head; we listen on the box)
var devBoxes = mountEl.find(function (n) { return hasClass(n, 'se-dev') && n.listeners.dblclick; });
ok(devBoxes.length >= 3, 'device boxes listen for dblclick on the face head (' + devBoxes.length + ')');
var headNode = devBoxes[0].find(function (n) { return hasClass(n, 'hv-head'); })[0];
ok(headNode, 'device face draws a head element');
if (headNode) {
  devBoxes[0].fire('dblclick', { target: headNode });
  ok(fakeCalls.winOpen.length === 1 && typeof fakeCalls.winOpen[0][0] === 'string' && fakeCalls.winOpen[0][1] === host, 'Windows.open(deviceId, host) called on head double-click');
  ok(!fakeCalls.winErr, 'Windows.open did not throw: ' + fakeCalls.winErr);
  if (used.windows) ok(winLayer.children.length >= 1, 'real Windows.open put a window into #windows');
  devBoxes[0].fire('dblclick', { target: devBoxes[0] });
  ok(fakeCalls.winOpen.length === 1, 'double-click outside the head does not open a window');
}

// ruler: click = jump, loop button = loop
blocks[3].fire('click'); ok(host.calls ? host.calls.jump[0] === secs[3].name : true, 'ruler block click jumps');
var loopBtn = mountEl.find(function (n) { return hasClass(n, 'se-btn') && n.textContent === 'Loop'; })[0];
loopBtn.fire('click'); if (host.calls) ok(host.calls.loop[0] === secs[0].name, 'Loop button loops the current section');
loopBtn.fire('click'); if (host.calls) ok(host.calls.loop[1] === null, 'Loop button toggles off');

// mute
var mBtn = rows[0].find(function (n) { return hasClass(n, 'mute'); })[0];
mBtn.fire('click'); if (host.calls) ok(host.calls.mute.length === 1 && host.calls.mute[0][0] === 'kick', 'M calls host.mute');
ok(mBtn.attrs['aria-pressed'] === 'true', 'M shows pressed');

// group collapse
heads[0].fire('click'); ok(rows[0].hidden === true, 'collapsing DRUMS hides its rows');
heads[0].fire('click'); ok(rows[0].hidden === false, 'expanding shows them again');

// step edit goes through the editor and commit; document event rebuilds
var stepsEl = rows[0].find(function (n) { return n.opts && n.opts.onToggle; })[0];
var commits = host.calls ? host.calls.commit : 0;
var editSec = host.transport.pos().section;   // the section the transport is in now (the ruler click above moved it)
var kickBefore = host.document().sections[editSec].play.kick;
if (used.widgets) {
  var realStep = rows[0].find(function (n) { return n.attrs['data-i'] === '1'; })[0];
  ok(realStep, 'real Widgets.steps renders step buttons'); realStep.fire('click');
} else if (stepsEl) { stepsEl.opts.onToggle(1); } else { rows[0].find(function (n) { return n.tagName === 'BUTTON' && n.attrs['aria-label'] === 'step 2'; })[0].fire('click'); }
if (host.calls) ok(host.calls.commit === commits + 1, 'toggling a step calls host.commit()');
var d1 = host.document(), forked = d1.sections[editSec].play.kick;
ok(forked !== kickBefore && d1.tracks[0].variants[forked].cells[1], 'step edit forked kick ' + kickBefore + ' for section ' + d1.sections[editSec].name + ' and set step 2 (variant ' + forked + ')');
var rowsAfter = mountEl.find(function (n) { return n.attrs['data-track']; });
ok(rowsAfter.length === 13, 'still thirteen rows after the document event');
{
  ok(rowsAfter[0] === rows[0], 'incremental commit refreshes in place (same row nodes, focus survives)');
  ok(rows[0].find(function (n) { return hasClass(n, 'se-cell'); })[editSec].textContent === forked, 'section cell shows the forked variant letter');
  if (host.calls) { host.forceRebuild = true; host.commit(); host.forceRebuild = false; }
  else host.loadDocument(host.document());      // real Host: a rebuild emits 'document' with rebuilt: true
  var rowsRebuilt = mountEl.find(function (n) { return n.attrs['data-track']; });
  ok(rowsRebuilt.length === 13 && rowsRebuilt[0] !== rows[0], 'rebuilt:true commit rebuilds the view');
  rows = rowsRebuilt;
}

// update() x100 with the playhead moving, no DOM rebuild
var nodesBefore = mountEl.find(function () { return true; }).length;
var t0 = Date.now();
for (var i = 0; i < 100; i++) {
  if (host.calls) { host._step += 13; host.playing = true; }
  view.update();
}
var nodesAfter = mountEl.find(function () { return true; }).length;
ok(nodesBefore === nodesAfter, 'update() x100 did not rebuild the DOM (' + nodesBefore + ' nodes)');
var phs = mountEl.find(function (n) { return hasClass(n, 'se-ph'); });
ok(phs.length === 3 && phs[0].style.left, 'playhead moves in overview, ruler and rows (' + phs[0].style.left + ')');
console.log('  update() x100: ' + (Date.now() - t0) + ' ms, ' + nodesAfter + ' DOM nodes');

// dispose
var faceDisposeBefore = fakeCalls.faceDispose;
view.dispose();
ok(mountEl.children.length === 0, 'dispose removes the view');
if (!used.faces) ok(fakeCalls.faceDispose > faceDisposeBefore, 'dispose disposes the faces');
if (host._l) ok((host._l.document || []).length === 0, 'dispose unsubscribes from host events');
view.update(); view.dispose(); passed += 1;

console.log('using: host=' + hostKind + ', widgets=' + (used.widgets ? 'real' : 'fake') + ', faces=' + (used.faces ? 'real' : 'fake') + ', windows=' + (used.windows ? 'real' : 'fake'));
console.log('OK: ' + passed + ' checks passed');
