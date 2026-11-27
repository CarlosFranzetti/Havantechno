#!/usr/bin/env node
/* Check for the Pressing Crew V2 interface files in Node with a small fake DOM:
 *   app/ui/settings.js (Settings), mixer-view.js (MixerView), clip-view.js (ClipView), export-dialog.js (ExportDialog).
 *   node tools/views-check.js
 * Part 1 drives every control against a stub host that implements the BRIEF's frozen calls (exportAudio, addAudioTrack,
 * audioOptions, setAudioOptions, outputDevices; Project.exportAudio; HavantechnoShell.pickDirectory, writeFile, joinPath,
 * appVersion, readAppData, writeAppData) and against a bare host without them (every such control must disable itself
 * with a visible reason and never throw). Part 2 mounts the Mixer and the Clips on the real Host (app/engine, no
 * AudioContext) and checks that a fader move and a cell change each write the document and add exactly one undo entry.
 * Prints "OK: N checks passed" and exits 0, else prints each failure and exits 1.
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var APP = path.join(__dirname, '..', 'app');

var passed = 0, failed = 0;
function ok(cond, what) { if (cond) passed++; else { failed++; console.log('FAIL: ' + what); } }

// ------------------------------------------------------------------ fake DOM (as in tools/import-view-check.js)
function FakeNode(tag) {
  this.tagName = String(tag).toUpperCase(); this.children = []; this.parentNode = null; this.style = {}; this.attrs = {};
  this.className = ''; this._text = ''; this.listeners = {}; this.hidden = false; this.id = ''; this.value = ''; this.disabled = false; this.title = '';
  this.checked = false; this.scrollLeft = 0;
  if (this.tagName === 'CANVAS') {
    this.width = 300; this.height = 150;
    this.getContext = function () { return { setTransform: function () {}, clearRect: function () {}, fillRect: function () {}, beginPath: function () {}, moveTo: function () {}, lineTo: function () {}, stroke: function () {}, fill: function () {}, arc: function () {}, save: function () {}, restore: function () {} }; };
  }
}
FakeNode.prototype.appendChild = function (c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; };
FakeNode.prototype.insertBefore = function (c, ref) { if (c.parentNode) c.parentNode.removeChild(c); var i = this.children.indexOf(ref); c.parentNode = this; if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); return c; };
FakeNode.prototype.removeChild = function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; };
Object.defineProperty(FakeNode.prototype, 'firstChild', { get: function () { return this.children[0] || null; } });
Object.defineProperty(FakeNode.prototype, 'textContent', {
  get: function () { return this._text + this.children.map(function (c) { return c.textContent; }).join(''); },
  set: function (v) { this.children.forEach(function (c) { c.parentNode = null; }); this.children = []; this._text = String(v); }
});
FakeNode.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); if (k === 'class') this.className = String(v); };
FakeNode.prototype.getAttribute = function (k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; };
FakeNode.prototype.removeAttribute = function (k) { delete this.attrs[k]; };
FakeNode.prototype.addEventListener = function (t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); };
FakeNode.prototype.removeEventListener = function (t, fn) { var l = this.listeners[t] || [], i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); };
FakeNode.prototype.getBoundingClientRect = function () { return { left: 10, top: 10, width: 80, height: 30, bottom: 40, right: 90 }; };
FakeNode.prototype.focus = function () { fakeDoc.activeElement = this; };
FakeNode.prototype.blur = function () { if (fakeDoc.activeElement === this) fakeDoc.activeElement = fakeDoc.body; };
FakeNode.prototype.contains = function (n) { for (; n; n = n.parentNode) if (n === this) return true; return false; };
FakeNode.prototype.fire = function (t, ev) {
  ev = ev || {}; ev.type = t; ev.target = ev.target || this;
  ev.preventDefault = function () { ev.defaultPrevented = true; }; ev.stopPropagation = function () { ev.stopped = true; };
  for (var n = this; n && !ev.stopped; n = n.parentNode) (n.listeners[t] || []).slice().forEach(function (f) { f(ev); });
  return ev;
};
FakeNode.prototype.click = function () { return this.fire('click', { button: 0 }); };
FakeNode.prototype.key = function (k, mods) { var e = { key: k }; for (var m in (mods || {})) e[m] = mods[m]; return this.fire('keydown', e); };
FakeNode.prototype.walk = function (fn) { fn(this); this.children.forEach(function (c) { c.walk(fn); }); };
FakeNode.prototype.find = function (pred) { var out = []; this.walk(function (n) { if (pred(n)) out.push(n); }); return out; };
function hasClass(n, c) { return String(n.className).split(/\s+/).indexOf(c) >= 0; }
function byClass(n, c) { return n.find(function (x) { return hasClass(x, c); }); }
function byText(n, tag, re) { return n.find(function (x) { return x.tagName === tag && re.test(x.textContent); }); }
function byAttr(n, k, v) { return n.find(function (x) { return x.getAttribute(k) === v; }); }
function selectByLabel(n, label) {
  var lab = n.find(function (x) { return x.tagName === 'LABEL' && x.textContent === label && x.getAttribute('for'); })[0];
  return lab ? n.find(function (x) { return x.id === lab.getAttribute('for'); })[0] : null;
}
function choose(sel, re) {
  var ops = sel.children, i;
  for (i = 0; i < ops.length; i++) if (re.test(ops[i].textContent)) { sel.value = ops[i].getAttribute('value'); sel.fire('change'); return true; }
  return false;
}

var head = new FakeNode('head'), body = new FakeNode('body'), html = new FakeNode('html');
var docListeners = {};
var fakeDoc = {
  head: head, body: body, documentElement: html, activeElement: null,
  createElement: function (t) { return new FakeNode(t); },
  createElementNS: function (ns, t) { return new FakeNode(t); },
  getElementById: function (id) { var r = null; body.walk(function (n) { if (!r && n.id === id) r = n; }); return r; },
  addEventListener: function (t, fn) { (docListeners[t] = docListeners[t] || []).push(fn); },
  removeEventListener: function (t, fn) { var l = docListeners[t] || [], i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }
};
fakeDoc.activeElement = body;

var store = {};
var sb = {
  console: console, Math: Math, JSON: JSON, Date: Date, setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: setInterval, clearInterval: clearInterval,
  Float32Array: Float32Array, Uint8Array: Uint8Array, Promise: Promise, Object: Object, Array: Array, devicePixelRatio: 1, innerWidth: 1440, innerHeight: 900,
  localStorage: { getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; } },
  getComputedStyle: function () { return { getPropertyValue: function () { return ''; } }; },
  AbortController: AbortController,
  Blob: function (parts, o) { this.parts = parts; this.type = o && o.type; },
  URL: { created: 0, createObjectURL: function () { sb.URL.created++; return 'blob:x'; }, revokeObjectURL: function () {} }
};
sb.window = sb; sb.document = fakeDoc; sb.globalThis = sb;
// the shell (Electron): app data for Settings, a folder for exports, a version for About
var shellLog = { written: [], appData: [], pick: 0 };
sb.HavantechnoShell = {
  readAppData: function (name) { return Promise.resolve(name === 'settings.json' ? JSON.stringify({ 'view.meterDecay': 48, 'bogus.key': 1 }) : null); },
  writeAppData: function (name, text) { shellLog.appData.push([name, text]); return Promise.resolve(true); },
  pickDirectory: function () { shellLog.pick++; return Promise.resolve('/tmp/out'); },
  joinPath: function (d, n) { return d + '/' + n; },
  writeFile: function (p, bytes) { shellLog.written.push([p, bytes && bytes.byteLength]); return Promise.resolve(true); },
  appVersion: function () { return '0.2.0-test'; }
};
var winLog = [];
sb.Windows = { open: function (id) { winLog.push(id); return {}; }, onSelect: function () {} };
vm.createContext(sb);
function load(rel) { vm.runInContext(fs.readFileSync(path.join(APP, rel), 'utf8'), sb, { filename: rel }); }
function tick() { return new Promise(function (r) { setImmediate(r); }); }
function ticks(n) { var p = Promise.resolve(); for (var i = 0; i < (n || 6); i++) p = p.then(tick); return p; }
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

load('ui/widgets.js');
load('ui/settings.js');
load('ui/mixer-view.js');
load('ui/clip-view.js');
load('ui/export-dialog.js');
var Settings = sb.Settings, MixerView = sb.MixerView, ClipView = sb.ClipView, ExportDialog = sb.ExportDialog;

// ------------------------------------------------------------------ stub host (frozen interface)
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function stubHost(o) {
  o = o || {};
  var listeners = {};
  var L = { hold: [], set: [], mute: [], solo: [], bypass: [], setPlay: [], commit: 0, jump: [], loop: [], play: 0, exp: [], add: [], opts: [], devs: [], tone: 0 };
  var doc_ = {
    name: 'Test song', bpm: 120,
    tracks: [
      { name: 'kick', family: 'drums', variants: { A: { bars: 1, cells: [] }, B: { bars: 1, cells: [] } } },
      { name: 'bass', family: 'bass', variants: { A: { bars: 1, cells: [] } } },
      { name: 'pad', family: 'keys', variants: { A: { bars: 1, cells: [] }, B: { bars: 1, cells: [] }, C: { bars: 1, cells: [] } } }
    ],
    sections: [{ name: 'intro', bars: 4, play: { kick: 'A', bass: 'A' } }, { name: 'main', bars: 8, play: { kick: 'B', bass: 'A', pad: true } }]
  };
  var undo = [];
  var params = { 'kick.gain': 1, 'kick.pan': 0, 'kick.send.delay': 0, 'kick.send.reverb': 0.2, 'bass.gain': 0.5, 'bass.pan': 0, 'bass.send.delay': 0, 'bass.send.reverb': 0,
                 'pad.gain': 0.8, 'pad.pan': 0.3, 'pad.send.delay': 0.1, 'pad.send.reverb': 0.4, 'send.delay.mix': 1, 'send.reverb.mix': 0.5 };
  var muted = {}, solo = {}, byp = {};
  var tr = { playing: false, loopSection: null, bar: 1, section: 'intro' };
  function emit(t, e) { (listeners[t] || []).slice().forEach(function (f) { f(e); }); }
  var h = {
    L: L, undo: undo,
    on: function (t, fn) { (listeners[t] = listeners[t] || []).push(fn); }, off: function (t, fn) { var l = listeners[t] || [], i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); },
    listeners: listeners, emit: emit,
    document: function () { return doc_; },
    commit: function () { L.commit++; emit('document', { reason: 'commit', rebuilt: false }); return false; },
    editor: function () {
      return {
        setPlay: function (s, t, v) { var sec = doc_.sections.filter(function (x) { return x.name === s; })[0]; if (!sec) return false; undo.push(clone(doc_)); L.setPlay.push([s, t, v]); if (v == null) delete sec.play[t]; else sec.play[t] = v; return true; },
        variantUsage: function (t, v) { return doc_.sections.filter(function (x) { var p = x.play[t]; return p === v || (p === true && v === 'A'); }).map(function (x) { return x.name; }); },
        canUndo: function () { return undo.length > 0; }
      };
    },
    tracks: function () { return doc_.tracks.map(function (t) { return { name: t.name, family: t.family, type: t.name === 'kick' ? 'bd909' : t.name, muted: !!muted[t.name], solo: !!solo[t.name], sends: {} }; }); },
    sends: function () { return [{ name: 'delay', type: 'delay', family: 'time' }, { name: 'reverb', type: 'reverb', family: 'time' }]; },
    sections: function () { var s = 0; return doc_.sections.map(function (x, i) { var r = { index: i, name: x.name, start: s, bars: x.bars, play: clone(x.play) }; s += x.bars; return r; }); },
    totalBars: function () { return 12; },
    device: function (id) {
      if (/^send:/.test(id)) return { id: id, type: id.slice(5), kind: 'send', spec: { mix: { min: 0, max: 1, value: 0.25 } } };
      if (/^track:[a-z]+(:channel)?$/.test(id)) return { id: id, kind: /channel/.test(id) ? 'channel' : 'instrument', spec: {} };
      return null;
    },
    getParam: function (p) { return params[p]; },
    setParam: function (p, v) { if (!(p in params)) return false; params[p] = v; L.set.push([p, v]); emit('param', { path: p, value: v, source: 'ui' }); return true; },
    hold: function (p) { L.hold.push(p); undo.push(clone(doc_)); return h; },
    mute: function (t, b) { muted[t] = !!b; L.mute.push([t, b]); return !!b; },
    meter: function (id) {
      if (id === 'master') return { level: 1, peak: 1.2, reduction: null, correlation: 0.8 };
      if (id === 'master:limiter') return { level: 1, peak: 1, reduction: -3, correlation: 0.8 };
      if (id === 'master:glue') return { level: 1, peak: 1, reduction: -1.25, correlation: 0.8 };
      return { level: 0.5, peak: 0.5, reduction: null, correlation: null };
    },
    transport: {
      jump: function (s) { L.jump.push(s); tr.section = s; }, loop: function (s) { L.loop.push(s); tr.loopSection = s; return s; },
      play: function () { L.play++; tr.playing = true; }, stop: function () { tr.playing = false; },
      pos: function () { return { bar: tr.bar, step: 0, section: 0, sectionName: tr.section, playing: tr.playing, loop: tr.loopSection }; }
    }
  };
  Object.defineProperty(h.transport, 'playing', { get: function () { return tr.playing; } });
  Object.defineProperty(h.transport, 'loopSection', { get: function () { return tr.loopSection; } });
  h.params = params; h.tr = tr; h.muted = muted;
  if (!o.bare) {
    h.solo = function (t, b) { solo[t] = !!b; L.solo.push([t, b]); return !!b; };
    h.bypass = function (id, b) { byp[id] = !!b; L.bypass.push([id, b]); return true; };
    h.isBypassed = function (id) { return !!byp[id]; };
    h.audioOptions = function () { return { sinkId: '', latencyHint: 'interactive', sampleRate: 48000, baseLatency: 0.01, outputLatency: 0.032, state: 'running' }; };
    h.setAudioOptions = function (x) { L.opts.push(x); return Promise.resolve(true); };
    h.outputDevices = function (x) {
      L.devs.push(x || null);
      if (x && x.ask) return Promise.resolve([{ id: '', label: 'System default', named: true }, { id: 'dev-2', label: 'Studio interface', named: true }]);
      return Promise.resolve([{ id: '', label: 'System default', named: true }, { id: 'dev-2', label: 'Output 1', named: false }]);
    };
    h.context = function () {
      return { sampleRate: 48000, state: 'running', currentTime: 1, destination: {},
        createOscillator: function () { L.tone++; return { frequency: { value: 0 }, connect: function () {}, start: function () {}, stop: function () {}, disconnect: function () {} }; },
        createGain: function () { return { gain: { setValueAtTime: function () {}, linearRampToValueAtTime: function () {} }, connect: function () {}, disconnect: function () {} }; } };
    };
    h.exportAudio = function (x) {
      L.exp.push(x);
      var names = x.what === 'mix' ? ['mix'] : x.what === 'stems' ? ['kick', 'bass', 'pad', 'return-delay'] : x.what;
      var files = names.map(function (n, i) { return { name: 'Test song - ' + n + '.wav', part: n, bytes: new ArrayBuffer(64 + i), seconds: 4, peak: 0.5, peakDb: -6.02, lufs: -15.23 }; });
      if (h.gate) return h.gate.then(function () { return files; });
      var p = Promise.resolve();
      files.forEach(function (f, i) {
        p = p.then(function () {
          if (x.onProgress) x.onProgress({ index: i, total: files.length, name: f.name, part: f.part, stage: 'render', fraction: 0.5 });
          return x.onFile ? x.onFile(f) : null;
        });
      });
      return p.then(function () { return files; });
    };
    h.addAudioTrack = function (src, x) { L.add.push([src, x]); return Promise.resolve('aud_' + L.add.length); };
  }
  return h;
}

// ------------------------------------------------------------------ 1. Settings
function partSettings() {
  ok(Settings && typeof Settings.get === 'function' && typeof Settings.set === 'function' && typeof Settings.open === 'function' && typeof Settings.on === 'function', 'Settings exposes get, set, open, on (frozen)');
  ok(Settings.get('view.density') === 'normal' && Settings.get('audio.latencyHint') === 'interactive' && Settings.get('export.bitDepth') === 24, 'defaults: density normal, latency interactive, 24-bit');
  return ticks(4).then(function () {
    ok(Settings.get('view.meterDecay') === 48, 'the shell app-data file is read at load and wins (meterDecay 48)');
    ok(Settings.get('bogus.key') === undefined, 'unknown keys in the file are ignored');
    var events = [];
    Settings.on('change', function (e) { events.push(e); });
    ok(Settings.set('view.density', 'huge') === false && Settings.get('view.density') === 'normal', 'an invalid value is refused and nothing changes');
    ok(Settings.set('view.density', 'large') === true && Settings.get('view.density') === 'large', 'density set to large');
    ok(events.length === 1 && events[0].key === 'view.density' && events[0].value === 'large' && events[0].old === 'normal', "'change' carries key, value and old");
    ok(html.getAttribute('data-density') === 'large', 'density applied to <html data-density>');
    Settings.set('view.zoom', 125);
    ok(html.style.zoom === '1.25', 'zoom 125 % applied as CSS zoom 1.25');
    Settings.set('view.zoom', 400);
    ok(Settings.get('view.zoom') === 150, 'zoom clamped to 150 %');
    Settings.set('view.zoom', 100);
    ok(html.style.zoom === '', 'zoom 100 % clears the CSS zoom');
    ok(/"view.density":"large"/.test(store['hv.settings'] || ''), 'stored in localStorage hv.settings');
    Settings.set('view.density', 'normal');
    return wait(350);
  }).then(function () {
    var last = shellLog.appData[shellLog.appData.length - 1];
    ok(last && last[0] === 'settings.json' && /"view.density": "normal"/.test(last[1]), 'written to the shell app-data file settings.json (debounced)');

    // the dialog on the full stub
    var h = stubHost();
    Settings.attach(h, { shell: sb.HavantechnoShell });
    var opener = new FakeNode('button'); body.appendChild(opener); opener.focus();
    Settings.open('audio');
    var dlg = byAttr(body, 'role', 'dialog')[0];
    ok(dlg && dlg.getAttribute('aria-modal') === 'true' && dlg.getAttribute('aria-labelledby') === 'hvs-title', 'Settings.open shows a modal dialog labelled by its title');
    var tabs = byAttr(body, 'role', 'tab');
    ok(tabs.length === 3 && tabs.map(function (t) { return t.textContent; }).join() === 'Audio,View,About', 'three tabs: Audio, View, About');
    ok(tabs[0].getAttribute('aria-selected') === 'true' && fakeDoc.activeElement === tabs[0], 'Audio tab selected and focused');
    return ticks(4).then(function () {
      var dev = selectByLabel(dlg, 'Output device');
      ok(dev && dev.children.length === 1 && /Default output/.test(dev.children[0].textContent), 'unnamed outputs: only the default is offered');
      ok(byClass(dlg, 'hvs-hint').some(function (x) { return /hides the names of 1 output device/.test(x.textContent); }), 'unnamed outputs: the reason is shown');
      var ask = byText(dlg, 'BUTTON', /Show device names/)[0];
      ok(ask && !ask.hidden, 'a button offers to ask for device names');
      ask.click();
      return ticks(4).then(function () {
        ok(h.L.devs.some(function (x) { return x && x.ask === true; }), 'asking calls host.outputDevices({ask: true})');
        ok(dev.children.length === 2 && /Studio interface/.test(dev.children[1].textContent), 'named outputs listed after asking');
        choose(dev, /Studio interface/);
        ok(Settings.get('audio.sinkId') === 'dev-2', 'choosing a device stores audio.sinkId');
        ok(h.L.opts.length === 1 && h.L.opts[0].sinkId === 'dev-2', 'and calls host.setAudioOptions with it');
        var lat = selectByLabel(dlg, 'Latency');
        choose(lat, /Playback/);
        ok(Settings.get('audio.latencyHint') === 'playback' && h.L.opts[h.L.opts.length - 1].latencyHint === 'playback', 'latency hint: stored and applied through setAudioOptions');
        var rate = selectByLabel(dlg, 'Sample rate');
        choose(rate, /^48 kHz/);
        ok(Settings.get('audio.sampleRate') === 48000 && h.L.opts[h.L.opts.length - 1].sampleRate === 48000, 'sample rate: stored and applied');
        return ticks(3);
      }).then(function () {
        var rep = dlg.textContent;
        ok(/cannot set the device buffer/.test(rep), 'no buffer-size control; one line says why');
        ok(/48000 Hz/.test(rep) && /10\.0 ms/.test(rep) && /32\.0 ms/.test(rep) && /running/.test(rep), 'engine report: sample rate, base and output latency, state');
        ok(/Applied\./.test(rep), 'status says the options were applied');
        byText(dlg, 'BUTTON', /Play test tone/)[0].click();
        return ticks(3);
      }).then(function () {
        ok(h.L.tone === 1 && /1 kHz at -18 dBFS/.test(dlg.textContent), 'test tone plays on the host context and says what it played');
        var bits = selectByLabel(dlg, 'Bit depth');
        choose(bits, /16-bit/);
        ok(Settings.get('export.bitDepth') === 16, 'export default bit depth stored');
        // tabs by keyboard
        tabs[0].key('ArrowRight');
        ok(tabs[1].getAttribute('aria-selected') === 'true' && fakeDoc.activeElement === tabs[1], 'ArrowRight moves to the View tab');
        var vp = fakeDoc.getElementById('hvs-panel-view');
        ok(vp && !vp.hidden && fakeDoc.getElementById('hvs-panel-audio').hidden, 'View panel shown, Audio hidden');
        choose(selectByLabel(vp, 'Density'), /Compact/);
        ok(Settings.get('view.density') === 'compact' && html.getAttribute('data-density') === 'compact', 'density from the View tab');
        choose(selectByLabel(vp, 'Interface zoom'), /^110/);
        ok(html.style.zoom === '1.1', 'zoom from the View tab');
        choose(selectByLabel(vp, 'View on start'), /Mixer/);
        ok(Settings.get('view.default') === 'mixer', 'default view stored');
        ok(byText(vp, 'OPTION', /^Sections$/).length === 1 && !byText(vp, 'OPTION', /^Clips$/).length, 'the grid view is named Sections, not Clips');
        choose(selectByLabel(vp, 'Peak hold'), /Until clicked/);
        ok(Settings.get('view.peakHold') === -1, 'peak hold: until clicked');
        choose(selectByLabel(vp, 'Open on'), /controls/);
        ok(Settings.get('view.deviceOpen') === 'controls', 'device windows open on: controls');
        tabs[1].key('End');
        return ticks(4);
      }).then(function () {
        ok(tabs[2].getAttribute('aria-selected') === 'true', 'End moves to the About tab');
        var ap = fakeDoc.getElementById('hvs-panel-about');
        ok(/0\.2\.0-test/.test(ap.textContent) && /AGPL-3\.0-or-later/.test(ap.textContent) && /THIRD_PARTY\.md/.test(ap.textContent), 'About: version from the shell, the licence, the third-party file');
        // focus trap
        var overlay = dlg.parentNode;
        var done = byText(dlg, 'BUTTON', /^Done$/)[0];
        done.focus();
        var ev = done.fire('keydown', { key: 'Tab' });
        ok(ev.defaultPrevented && fakeDoc.activeElement !== done && dlg.contains(fakeDoc.activeElement), 'Tab on the last control wraps inside the dialog');
        ok(ev.stopped, 'keys do not reach the app behind the dialog');
        overlay.fire('keydown', { key: 'Escape' });
        ok(!Settings.isOpen() && !overlay.parentNode, 'Escape closes the dialog');
        ok(fakeDoc.activeElement === opener, 'focus returns to the control that opened it');
        // missing calls
        var bare = stubHost({ bare: true });
        Settings.attach(bare, { shell: null });
        Settings.open('audio');
        var d2 = byAttr(body, 'role', 'dialog')[0];
        var dev2 = selectByLabel(d2, 'Output device');
        ok(dev2 && dev2.disabled && dev2.getAttribute('aria-disabled') === 'true' && /outputDevices is missing/.test(d2.textContent), 'without host.outputDevices: device select disabled with the reason');
        ok(/setAudioOptions is missing/.test(d2.textContent), 'without host.setAudioOptions: the reason is shown');
        choose(selectByLabel(d2, 'Latency'), /Balanced/);
        ok(Settings.get('audio.latencyHint') === 'balanced', 'the value is still remembered for later');
        ok(/not started|default/.test(d2.textContent), 'engine report degrades without audioOptions or a context');
        Settings.close();
        Settings.set('view.peakHold', 1.5); Settings.set('view.density', 'normal'); Settings.set('view.zoom', 100); Settings.set('view.meterDecay', 20);
      });
    });
  });
}

// ------------------------------------------------------------------ 2. Mixer on the stub
function partMixer() {
  var h = stubHost();
  var host_ = new FakeNode('div'); body.appendChild(host_);
  var v = MixerView.mount(host_, h);
  var strips = byClass(host_, 'mx-strip');
  ok(strips.length === 3 + 2 + 1, 'one strip per track, one per return, the master (6)');
  ok(byClass(host_, 'mx-ghead').map(function (g) { return g.textContent; }).join('|') === 'DRUMS (1)|BASS (1)|KEYS (1)|RETURNS (2)|MASTER', 'strips grouped by family, returns and master last');
  ok(strips[0].getAttribute('data-fam') === 'drums' && strips[0].getAttribute('data-track') === 'kick', 'strip carries the family colour and the track name');
  var fader = byAttr(host_, 'aria-label', 'kick level')[0];
  ok(fader && fader.getAttribute('role') === 'slider' && fader.getAttribute('tabindex') === '0', 'kick fader is a focusable slider');
  ok(Math.abs(Number(fader.getAttribute('aria-valuenow'))) < 0.05, 'fader shows gain 1 as 0 dB');
  fader.focus();
  fader.key('ArrowDown');
  ok(h.L.hold.length === 1 && h.L.hold[0] === 'kick.gain', 'a fader move calls host.hold(kick.gain) once');
  ok(h.undo.length === 1, 'one undo entry for the move');
  ok(h.params['kick.gain'] < 1 && h.params['kick.gain'] > 0.9, 'gain written through setParam in linear (' + h.params['kick.gain'].toFixed(3) + ')');
  fader.key('End');
  ok(Math.abs(h.params['kick.gain'] - 2) < 0.01, 'top of the fader is +6 dB (gain 2)');
  fader.key('Home');
  ok(h.params['kick.gain'] === 0, 'bottom of the fader is -inf (gain 0)');
  fader.fire('dblclick', {});
  ok(Math.abs(h.params['kick.gain'] - 1) < 1e-9, 'double-click returns to unity (0 dB)');
  var pan = byAttr(host_, 'aria-label', 'kick pan')[0];
  pan.focus(); pan.key('ArrowRight');
  ok(h.L.hold.indexOf('kick.pan') >= 0 && h.params['kick.pan'] > 0, 'pan knob: hold then setParam(kick.pan)');
  var send = byAttr(host_, 'aria-label', 'kick send to delay')[0];
  send.focus(); send.key('ArrowUp');
  ok(h.params['kick.send.delay'] > 0, 'send knob writes kick.send.delay');
  var m = byAttr(host_, 'aria-label', 'Mute kick')[0], s = byAttr(host_, 'aria-label', 'Solo bass')[0];
  m.click();
  ok(h.L.mute.length === 1 && h.L.mute[0][1] === true && m.getAttribute('aria-pressed') === 'true', 'M mutes through host.mute');
  s.click();
  ok(h.L.solo.length === 1 && s.getAttribute('aria-pressed') === 'true', 'S solos through host.solo');
  ok(strips[2].getAttribute('data-silent') === 'true' && strips[1].getAttribute('data-silent') === 'false', 'a track silenced by another solo is marked');
  ok(h.undo.length === 3, 'mute and solo add no undo entries (session state)');
  byText(strips[0], 'BUTTON', /^kick$/)[0].click();
  ok(winLog[winLog.length - 1] === 'track:kick', 'the name opens the track’s device window');
  var byp = byAttr(host_, 'aria-label', 'Bypass the delay return')[0];
  byp.click();
  ok(h.L.bypass.length === 1 && h.L.bypass[0][0] === 'send:delay' && h.L.bypass[0][1] === true, 'return bypass through host.bypass');
  var ret = byAttr(host_, 'aria-label', 'delay return level (wet mix)')[0];
  ok(ret && Math.abs(Number(ret.getAttribute('aria-valuenow'))) < 0.05, 'return level fader on send.delay.mix (mix 1 = 0 dB)');
  for (var i = 0; i < 6; i++) v.update();
  var peaks = byClass(host_, 'mx-peak');
  ok(peaks[0].textContent === '-6.0', 'peak readout in dBFS (0.5 -> -6.0)');
  var mp = peaks[peaks.length - 1];
  ok(mp.textContent === '+1.6' && mp.getAttribute('data-over') === 'true', 'master over 0 dBFS shows +1.6 and is marked');
  ok(/-1\.3 dB/.test(host_.textContent) && /-3\.0 dB/.test(host_.textContent) && /0\.80/.test(host_.textContent), 'master: glue and limiter reduction, correlation');
  peaks[0].click();
  ok(peaks[0].textContent === '-inf', 'click clears the held peak');
  // a value changed elsewhere follows on the next pull (unfocused)
  fakeDoc.activeElement = body;
  h.params['bass.gain'] = 1;
  for (i = 0; i < 6; i++) v.update();
  ok(Math.abs(Number(byAttr(host_, 'aria-label', 'bass level')[0].getAttribute('aria-valuenow'))) < 0.05, 'fader follows a value changed elsewhere');
  // a new track rebuilds
  h.document().tracks.push({ name: 'lead', family: 'keys', variants: { A: { bars: 1, cells: [] } } });
  h.params['lead.gain'] = 1; h.params['lead.pan'] = 0;
  h.emit('document', { reason: 'commit', rebuilt: true });
  ok(byClass(host_, 'mx-strip').length === 7 && byAttr(host_, 'data-track', 'lead').length === 1, 'a new track adds a strip');
  v.select('pad');
  ok(byAttr(host_, 'data-track', 'pad')[0].getAttribute('data-selected') === 'true', 'select marks the strip');
  v.dispose();
  ok(host_.children.length === 0 && (h.listeners.document || []).length === 0, 'dispose removes the view and its listeners');

  // missing calls
  var b = stubHost({ bare: true });
  var host2 = new FakeNode('div'); body.appendChild(host2);
  var v2 = MixerView.mount(host2, b);
  var s2 = byAttr(host2, 'aria-label', 'Solo kick')[0];
  ok(s2.getAttribute('aria-disabled') === 'true' && /host\.solo is missing/.test(s2.title), 'without host.solo: S disabled with the reason');
  s2.click();
  ok(/host\.solo is missing/.test(byClass(host2, 'mx-live')[0].textContent), 'activating it says why');
  var bp2 = byAttr(host2, 'aria-label', 'Bypass the delay return')[0];
  ok(bp2.getAttribute('aria-disabled') === 'true', 'without host.bypass: Bypass disabled');
  v2.update();
  v2.dispose();
}

// ------------------------------------------------------------------ 3. Clips on the stub
function partClips() {
  var h = stubHost();
  var host_ = new FakeNode('div'); body.appendChild(host_);
  var v = ClipView.mount(host_, h);
  ok(/not free clip launching/.test(host_.textContent) && /sections seen as a grid/.test(host_.textContent), 'the view says what it is and is not');
  var c = v.cell('kick', 'intro');
  ok(c && c.textContent === 'A' && c.getAttribute('role') === 'gridcell', 'kick in intro plays A');
  ok(v.cell('pad', 'intro').getAttribute('data-empty') === 'true', 'pad is silent in intro');
  ok(v.cell('pad', 'main').textContent === 'A', 'play: true reads as variant A');
  ok(byAttr(host_, 'role', 'grid')[0].getAttribute('aria-rowcount') === '4', 'grid: 3 tracks + header row');
  c.click();
  var menu = byClass(body, 'cv-menu')[0];
  ok(menu && menu.getAttribute('role') === 'menu', 'a click opens the variant menu');
  var items = byClass(menu, 'ap-mi');
  ok(items.length === 3 && /Variant A/.test(items[0].textContent) && /Silent/.test(items[2].textContent), 'menu: the track’s variants and silent');
  ok(items[0].getAttribute('aria-checked') === 'true' && fakeDoc.activeElement === items[0], 'the current variant is checked and focused');
  items[0].key('ArrowDown');
  ok(fakeDoc.activeElement === items[1], 'arrow keys move in the menu');
  items[1].click();
  ok(h.L.setPlay.length === 1 && h.L.setPlay[0].join() === 'intro,kick,B' && h.L.commit === 1, 'choosing B: one setPlay and a commit');
  ok(h.undo.length === 1, 'one undo entry');
  ok(v.cell('kick', 'intro').textContent === 'B', 'the cell shows B after the commit');
  ok(!byClass(body, 'cv-menu').length && fakeDoc.activeElement === v.cell('kick', 'intro'), 'menu closed, focus back on the cell');
  v.cell('kick', 'intro').click();
  byClass(byClass(body, 'cv-menu')[0], 'ap-mi')[1].click();
  ok(h.L.setPlay.length === 1 && h.undo.length === 1, 'choosing the same variant writes nothing');
  var cell = v.cell('kick', 'intro'); cell.focus();
  cell.key('ArrowDown');
  ok(fakeDoc.activeElement === v.cell('bass', 'intro'), 'ArrowDown moves to the next track (rows grouped by family)');
  fakeDoc.activeElement.key('ArrowDown'); fakeDoc.activeElement.key('ArrowRight');
  ok(fakeDoc.activeElement === v.cell('pad', 'main') && fakeDoc.activeElement.getAttribute('tabindex') === '0', 'roving focus with arrow keys');
  var e = fakeDoc.activeElement.key('c');
  ok(h.L.setPlay[h.L.setPlay.length - 1].join() === 'main,pad,C' && e.defaultPrevented, 'typing a letter picks that variant (and the app’s A key does not fire)');
  v.cell('pad', 'main').key('Delete');
  ok(h.L.setPlay[h.L.setPlay.length - 1][2] === null && v.cell('pad', 'main').getAttribute('data-empty') === 'true', 'Delete makes the track silent there');
  v.cell('pad', 'main').key('z');
  ok(/has no variant Z/.test(host_.textContent), 'an unknown letter says so and writes nothing');
  var launch = byAttr(host_, 'aria-label', 'Launch main: jump there and loop it')[0];
  launch.click();
  ok(h.L.jump.join() === 'main' && h.L.loop.join() === 'main' && h.L.play === 1, 'launch: jump, loop, play');
  v.update();
  var hd = byAttr(host_, 'data-section', 'main').filter(function (x) { return hasClass(x, 'cv-sh'); })[0];
  ok(hd.getAttribute('data-playing') === 'true' && hd.getAttribute('data-loop') === 'true', 'the playing and looped section is highlighted');
  ok(v.cell('kick', 'main').getAttribute('data-playing') === 'true', 'and its cells');
  ok(/Loop: main/.test(byClass(host_, 'cv-loopoff')[0].textContent), 'the loop button names the loop');
  byAttr(host_, 'data-section', 'main').filter(function (x) { return hasClass(x, 'cv-sh'); })[0].firstChild.click();
  ok(h.L.loop[h.L.loop.length - 1] === null, 'launching the looped section again ends the loop');
  v.dispose();
  ok(!host_.children.length, 'dispose removes the view');
  // missing editor
  var b = stubHost({ bare: true });
  b.editor = function () { return {}; };
  var host2 = new FakeNode('div'); body.appendChild(host2);
  var v2 = ClipView.mount(host2, b);
  var c2 = v2.cell('kick', 'intro');
  ok(c2.getAttribute('aria-disabled') === 'true', 'without editor.setPlay: cells disabled');
  c2.click();
  ok(!byClass(body, 'cv-menu').length && /cannot edit sections/.test(host2.textContent), 'and a click says why instead of opening the menu');
  v2.dispose();
}

// ------------------------------------------------------------------ 4. Export and import
function partExport() {
  var h = stubHost();
  ok(ExportDialog.available(h).ok === true, 'available with host.exportAudio');
  var b = stubHost({ bare: true });
  var av = ExportDialog.available(b);
  ok(av.ok === false && /host\.exportAudio is missing/.test(av.why), 'not available without it, with the reason (the toolbar keeps the 16-bit path)');
  var toasts = [];
  return ExportDialog.open(b, { toast: function (t) { toasts.push(t); } }).then(function (r) {
    ok(r === null && /host\.exportAudio is missing/.test(toasts[0]), 'open on a bare host only says why');
    Settings.set('export.bitDepth', 16); Settings.set('export.tail', 1.5);
    var p = ExportDialog.open(h, { shell: sb.HavantechnoShell, toast: function (t) { toasts.push(t); } });
    var dlg = byClass(body, 'xd-dlg')[0];
    ok(dlg && dlg.getAttribute('role') === 'dialog', 'the export dialog opens');
    ok(/Bit depth/.test(dlg.textContent) && dlg.find(function (x) { return x.tagName === 'SELECT' && x.getAttribute('aria-label') === 'Bit depth'; })[0].value === '0', 'bit depth defaults from Settings (16-bit)');
    var radios = dlg.find(function (x) { return x.tagName === 'INPUT' && x.getAttribute('type') === 'radio'; });
    var stems = radios.filter(function (x) { return x.getAttribute('value') === 'stems'; })[0], bars = radios.filter(function (x) { return x.getAttribute('value') === 'bars'; })[0];
    stems.checked = true; radios[0].checked = false; stems.fire('change');
    var master = fakeDoc.getElementById('xd-master') || dlg.find(function (x) { return x.id === 'xd-master'; })[0];
    ok(master && !master.disabled, 'master-chain option enabled for stems');
    bars.checked = true; radios.filter(function (x) { return x.getAttribute('value') === 'song'; })[0].checked = false; bars.fire('change');
    var from = dlg.find(function (x) { return x.getAttribute('aria-label') === 'First bar'; })[0], to = dlg.find(function (x) { return x.getAttribute('aria-label') === 'Last bar (included)'; })[0];
    from.value = '1'; to.value = '2';
    byText(dlg, 'BUTTON', /^Export$/)[0].click();
    return ticks(12).then(function () {
      var x = h.L.exp[0];
      ok(x && x.what === 'stems' && x.scope.from === 0 && x.scope.to === 2 && x.bitDepth === 16 && x.tailSeconds === 1.5 && x.master === false, 'host.exportAudio gets stems, bars 1-2 as {from 0, to 2}, 16-bit, tail 1.5, master off');
      ok(typeof x.onProgress === 'function' && typeof x.onFile === 'function' && x.signal, 'with onProgress, onFile and an AbortSignal');
      ok(shellLog.pick === 1 && shellLog.written.length === 4 && shellLog.written[0][0] === '/tmp/out/Test song - kick.wav', 'Electron: one folder chosen, each file written there as it arrives');
      var rows = dlg.find(function (n) { return n.tagName === 'TR'; });
      ok(rows.length === 5 && /-6\.0 dBFS/.test(rows[1].textContent) && /4\.00 s/.test(rows[1].textContent), 'result: one row per file with length and peak');
      ok(/-15\.2 LUFS/.test(rows[1].textContent), 'loudness shown when the engine reports it');
      ok(/same length and starts at the span/.test(dlg.textContent) && /Dither \(TPDF\) applies at 16-bit only/.test(dlg.textContent), 'the dialog states stem alignment and that dither is 16-bit only');
      ok(/Exported 4 files/.test(toasts[toasts.length - 1]), 'toast names the count');
      byText(dlg, 'BUTTON', /^Close$/)[0].click();
      return p;
    }).then(function (res) {
      ok(res && res.length === 4 && res[0].path === '/tmp/out/Test song - kick.wav', 'open resolves the files with their paths');
      // chosen tracks, web download
      var p2 = ExportDialog.open(h, { shell: null });
      var dlg2 = byClass(body, 'xd-dlg')[0];
      var r2 = dlg2.find(function (x) { return x.tagName === 'INPUT' && x.getAttribute('type') === 'radio'; });
      r2[0].checked = false; r2[2].checked = true; r2[2].fire('change');
      var go = byText(dlg2, 'BUTTON', /^Export$/)[0];
      go.click();
      ok(/at least one track/.test(dlg2.textContent) && h.L.exp.length === 1, 'chosen tracks with none ticked: says so, nothing runs');
      var kick = dlg2.find(function (x) { return x.tagName === 'INPUT' && x.getAttribute('value') === 'kick'; })[0];
      kick.checked = true;
      go.click();
      return ticks(10).then(function () {
        ok(h.L.exp[1] && h.L.exp[1].what.join() === 'kick' && h.L.exp[1].scope === 'song', 'chosen tracks: what [kick], the whole song');
        ok(sb.URL.created === 1, 'web: the file is downloaded');
        dlg2.parentNode.fire('keydown', { key: 'Escape' });
        return p2;
      });
    }).then(function (r2) {
      ok(r2 && r2.length === 1 && !byClass(body, 'xd-dlg').length, 'Escape after the result closes and resolves it');
      // cancel while running
      var release; h.gate = new Promise(function (r) { release = r; });
      var p3 = ExportDialog.open(h, { shell: null });
      var dlg3 = byClass(body, 'xd-dlg')[0];
      byText(dlg3, 'BUTTON', /^Export$/)[0].click();
      return ticks(4).then(function () {
        ok(h.L.exp[2] && h.L.exp[2].what === 'mix' && h.L.exp[2].master === true, 'the mix goes with master on');
        ok(dlg3.find(function (n) { return n.getAttribute('role') === 'progressbar'; }).length === 1, 'a progress bar while it runs');
        byText(dlg3, 'BUTTON', /^Cancel$/)[0].click();
        ok(h.L.exp[2].signal.aborted === true && /Cancelled/.test(dlg3.textContent), 'Cancel aborts the signal and says so');
        release(); delete h.gate;
        return ticks(4);
      }).then(function () {
        ok(sb.URL.created === 1, 'nothing is saved after a cancel');
        byText(dlg3, 'BUTTON', /^Close$/)[0].click();
        return p3;
      });
    }).then(function (r3) {
      ok(r3 === null, 'a cancelled export resolves null');
      // Project.exportAudio wins when present
      var called = null;
      sb.Project = { exportAudio: function (o) { called = o; return Promise.resolve([{ name: 'a.wav', path: '/x/a.wav' }]); } };
      var p4 = ExportDialog.open(h, { shell: sb.HavantechnoShell });
      var dlg4 = byClass(body, 'xd-dlg')[0];
      byText(dlg4, 'BUTTON', /^Export$/)[0].click();
      return ticks(6).then(function () {
        ok(called && called.host === h && called.shell === sb.HavantechnoShell && called.what === 'mix' && h.L.exp.length === 3, 'Project.exportAudio({host, shell, ...}) is used when present');
        byText(dlg4, 'BUTTON', /^Close$/)[0].click();
        return p4;
      });
    }).then(function () {
      // import audio
      var picked = [{ name: 'vox.wav' }, { name: 'notes.txt' }, { name: 'gtr.flac' }];
      sb.Project = { pickFiles: function (o) { sb.Project.lastPick = o; return Promise.resolve(picked); } };
      h.tr.bar = 6;
      var t2 = [];
      return ExportDialog.importAudio(h, { toast: function (t) { t2.push(t); } }).then(function (names) {
        ok(sb.Project.lastPick.multiple === true && sb.Project.lastPick.accept === 'audio/*', 'import: picks several audio files');
        ok(h.L.add.length === 2 && h.L.add[0][1].bar === 6 && h.L.add[0][1].name === 'vox' && h.L.add[1][1].name === 'gtr', 'each audio file goes to host.addAudioTrack at the playhead bar');
        ok(names.join() === 'aud_1,aud_2' && /Added 2 audio tracks at bar 7/.test(t2[0]), 'and the toast names them');
        return ExportDialog.importAudio(b, { toast: function (t) { t2.push(t); } });
      }).then(function (n2) {
        ok(n2.length === 0 && /addAudioTrack is missing/.test(t2[t2.length - 1]), 'without host.addAudioTrack: the reason, no picker');
        delete sb.Project;
      });
    });
  });
}

// ------------------------------------------------------------------ 5. the real Host (no AudioContext)
function partReal() {
  ['engine/core.js', 'engine/programs.js', 'engine/synths.js', 'engine/drums.js', 'engine/worklets.js', 'engine/classics.js', 'engine/processors.js',
   'engine/songdoc.js', 'engine/sequencer.js', 'engine/song.js'].forEach(load);
  if (fs.existsSync(path.join(APP, 'engine/audiotrack.js'))) load('engine/audiotrack.js');
  load('engine/host.js');
  var h = sb.Host.create();
  var ed = h.editor();
  var el = new FakeNode('div'); body.appendChild(el);
  var mv = MixerView.mount(el, h);
  var n = h.tracks().length;
  ok(byClass(el, 'mx-strip').length === n + h.sends().length + 1, 'real Host: a strip per track (' + n + '), per return, and the master');
  var g0 = h.getParam('bass.gain'), u0 = ed._undo.length;
  var f = byAttr(el, 'aria-label', 'bass level')[0];
  f.focus(); f.key('ArrowDown');
  var t = ed.track('bass');
  ok(h.getParam('bass.gain') < g0 && Math.abs(t.gain - h.getParam('bass.gain')) < 1e-9, 'real Host: the fader changes the gain and the document stores it');
  ok(ed._undo.length === u0 + 1, 'real Host: one undo entry for the fader move');
  ok(ed.undo() && (h.commit(), Math.abs(h.getParam('bass.gain') - g0) < 1e-9), 'real Host: undo restores the gain');
  byAttr(el, 'aria-label', 'Mute bass')[0].click();
  ok(h.tracks().filter(function (x) { return x.name === 'bass'; })[0].muted === true && ed._undo.length === u0, 'real Host: mute from the mixer, no undo entry');
  byAttr(el, 'aria-label', 'Solo kick')[0].click();
  ok(h.tracks().filter(function (x) { return x.name === 'kick'; })[0].solo === true, 'real Host: solo from the mixer');
  mv.update();
  mv.dispose();
  var cv = ClipView.mount(el, h);
  var sec = h.sections()[1], tn = 'bass', cur = (function () { var p = ed.section(sec.name).play[tn]; return p === true ? 'A' : p; })();
  var other = Object.keys(ed.track(tn).variants).filter(function (k) { return k !== cur; })[0];
  var u1 = ed._undo.length;
  var c = cv.cell(tn, sec.name);
  c.click();
  var item = byText(byClass(body, 'cv-menu')[0], 'BUTTON', new RegExp('^Variant ' + other + '\\b'))[0];
  item.click();
  ok(ed.section(sec.name).play[tn] === other && ed._undo.length === u1 + 1, 'real Host: a cell change sets the section’s variant with one undo entry (' + sec.name + ' ' + tn + ' ' + cur + ' -> ' + other + ')');
  ok(cv.cell(tn, sec.name).textContent === other, 'real Host: the cell shows it after the commit');
  byAttr(el, 'aria-label', 'Launch ' + sec.name + ': jump there and loop it')[0].click();
  ok(h.transport.loopSection === sec.name && h.transport.pos().sectionName === sec.name, 'real Host: launch jumps to the section and loops it');
  cv.dispose();
  if (typeof h.exportAudio === 'function') ok(ExportDialog.available(h).ok, 'real Host: the export dialog is available (V1’s host.exportAudio is on disk)');
  else console.log('  (V1’s host.exportAudio is not on disk: export rows ran on the stub only)');
}

Promise.resolve()
  .then(partSettings)
  .then(partMixer)
  .then(partClips)
  .then(partExport)
  .then(partReal)
  .then(function () {
    if (failed) { console.log(failed + ' failed, ' + passed + ' passed'); process.exit(1); }
    console.log('OK: ' + passed + ' checks passed');
    process.exit(0);
  }, function (e) { console.log('FAIL: harness: ' + (e && e.stack ? e.stack : e)); process.exit(1); });
