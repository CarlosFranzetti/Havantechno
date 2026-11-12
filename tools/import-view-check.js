#!/usr/bin/env node
/* Check for app/ui/import-view.js (ImportView, Dubplate Crew D2) in Node with a small fake DOM.
 *   node tools/import-view-check.js
 * Part 1 drives ImportView against a stub host that follows the BRIEF's frozen interface (reference, ab, matchLevel,
 * analysis, applyRecreation; Project.pickAudio / importTrack; HavantechnoShell.separate) and against an empty host
 * (every control must disable itself with a reason and never throw). Part 2 mounts the real System Editor on the real
 * Host (app/engine) and checks the reference lane and the "Import track..." entry; where D1's calls are not on the real
 * Host yet, the check adds stub methods to it and says so. Prints "OK: N checks passed" and exits 0, else exits 1.
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var APP = path.join(__dirname, '..', 'app');

var passed = 0, failed = 0;
function ok(cond, what) { if (cond) passed++; else { failed++; console.log('FAIL: ' + what); } }

// ------------------------------------------------------------------ fake DOM
function FakeNode(tag) {
  this.tagName = String(tag).toUpperCase(); this.children = []; this.parentNode = null; this.style = {}; this.attrs = {};
  this.className = ''; this._text = ''; this.listeners = {}; this.hidden = false; this.id = ''; this.value = ''; this.disabled = false; this.title = '';
  var self = this;
  this.classList = {
    toggle: function (c, on) { var p = self.className.split(/\s+/).filter(Boolean), i = p.indexOf(c); if (on === undefined) on = i < 0; if (on && i < 0) p.push(c); else if (!on && i >= 0) p.splice(i, 1); self.className = p.join(' '); return on; },
    add: function (c) { self.classList.toggle(c, true); }, remove: function (c) { self.classList.toggle(c, false); },
    contains: function (c) { return self.className.split(/\s+/).indexOf(c) >= 0; }
  };
  if (this.tagName === 'CANVAS') {
    this.width = 300; this.height = 150; this.ops = [];
    var ops = this.ops;
    this.getContext = function () {
      return { setTransform: function () {}, clearRect: function () { ops.length = 0; }, fillRect: function (x, y, w, h) { ops.push([x, y, w, h]); }, set fillStyle(v) { this._fs = v; }, get fillStyle() { return this._fs; } };
    };
  }
}
FakeNode.prototype.appendChild = function (c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; };
FakeNode.prototype.insertBefore = function (c, ref) { if (c.parentNode) c.parentNode.removeChild(c); var i = this.children.indexOf(ref); c.parentNode = this; if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); return c; };
FakeNode.prototype.removeChild = function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; };
Object.defineProperty(FakeNode.prototype, 'firstChild', { get: function () { return this.children[0] || null; } });
Object.defineProperty(FakeNode.prototype, 'textContent', {
  get: function () { return this._text + this.children.map(function (c) { return c.textContent; }).join(''); },
  set: function (v) { this.children = []; this._text = String(v); }
});
FakeNode.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); };
FakeNode.prototype.getAttribute = function (k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; };
FakeNode.prototype.removeAttribute = function (k) { delete this.attrs[k]; };
FakeNode.prototype.addEventListener = function (t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); };
FakeNode.prototype.removeEventListener = function (t, fn) { var l = this.listeners[t] || [], i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); };
FakeNode.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: this._w != null ? this._w : 800, height: this._h != null ? this._h : 44, bottom: 44, right: 800 }; };
FakeNode.prototype.focus = function () { fakeDoc.activeElement = this; };
FakeNode.prototype.blur = function () { if (fakeDoc.activeElement === this) fakeDoc.activeElement = fakeDoc.body; };
FakeNode.prototype.contains = function (n) { for (; n; n = n.parentNode) if (n === this) return true; return false; };
FakeNode.prototype.fire = function (t, ev) { ev = ev || {}; ev.target = ev.target || this; ev.preventDefault = ev.preventDefault || function () { ev.defaultPrevented = true; }; ev.stopPropagation = ev.stopPropagation || function () {}; (this.listeners[t] || []).slice().forEach(function (f) { f(ev); }); return ev; };
FakeNode.prototype.click = function () { return this.fire('click'); };
FakeNode.prototype.walk = function (fn) { fn(this); this.children.forEach(function (c) { c.walk(fn); }); };
FakeNode.prototype.find = function (pred) { var out = []; this.walk(function (n) { if (pred(n)) out.push(n); }); return out; };
function hasClass(n, c) { return String(n.className).split(/\s+/).indexOf(c) >= 0; }
function byClass(n, c) { return n.find(function (x) { return hasClass(x, c); }); }
function byText(n, tag, re) { return n.find(function (x) { return x.tagName === tag && re.test(x.textContent); }); }

var head = new FakeNode('head'), body = new FakeNode('body');
var fakeDoc = {
  head: head, body: body, documentElement: new FakeNode('html'), activeElement: null,
  createElement: function (t) { return new FakeNode(t); },
  createElementNS: function (ns, t) { return new FakeNode(t); },
  createTextNode: function (s) { var n = new FakeNode('#text'); n._text = String(s); return n; },
  getElementById: function (id) { var r = null; body.walk(function (n) { if (!r && n.id === id) r = n; }); head.walk(function (n) { if (!r && n.id === id) r = n; }); return r; },
  addEventListener: function () {}, removeEventListener: function () {}
};
fakeDoc.activeElement = body;

var sb = { console: console, Math: Math, JSON: JSON, Date: Date, setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: setInterval, clearInterval: clearInterval, Float32Array: Float32Array, Uint8Array: Uint8Array, Promise: Promise, devicePixelRatio: 1 };
sb.window = sb; sb.document = fakeDoc; sb.globalThis = sb;
sb.OfflineAudioContext = function () {
  this.decodeAudioData = function (ab) { var n = Math.max(1, ab.byteLength >> 2); return Promise.resolve({ duration: n / 48000, sampleRate: 48000, numberOfChannels: 2, length: n, getChannelData: function () { return new Float32Array(n); } }); };
};
vm.createContext(sb);
function load(rel) { vm.runInContext(fs.readFileSync(path.join(APP, rel), 'utf8'), sb, { filename: rel }); }
function tick() { return new Promise(function (r) { setImmediate(r); }); }
function ticks(n) { var p = Promise.resolve(); for (var i = 0; i < (n || 6); i++) p = p.then(tick); return p; }

['engine/core.js', 'engine/programs.js', 'engine/synths.js', 'engine/drums.js', 'engine/worklets.js', 'engine/classics.js'].forEach(load);
load('ui/import-view.js');
var IV = sb.ImportView;
ok(IV && typeof IV.importTrack === 'function' && typeof IV.mount === 'function' && typeof IV.abControl === 'function' && typeof IV.lane === 'function', 'ImportView exposes importTrack, mount, abControl, lane');

// ------------------------------------------------------------------ stub host (frozen interface)
function fakeBuffer(seconds, sr) {
  var n = Math.round(seconds * sr), d = new Float32Array(n);
  for (var i = 0; i < n; i++) d[i] = 0.5 * Math.sin(i * 0.05);
  return { duration: seconds, sampleRate: sr, numberOfChannels: 1, length: n, getChannelData: function () { return d; } };
}
function stubHost(o) {
  o = o || {};
  var listeners = {};
  var doc_ = { name: 'test', bpm: 120, tracks: [{ name: 'kick', type: 'bd909', inst: 'bd909' }, { name: 'bassline', type: 'tb303' }], sections: [{ name: 'intro', bars: 4 }, { name: 'mainA', bars: 4 }], audio: { ref1: { name: 'render.wav' } } };
  var h = {
    calls: { ab: [], match: [], setRef: [], apply: [], load: [], undo: 0 },
    state: 'song',
    ref: o.noRef ? null : { id: 'ref1', name: 'render.wav', duration: 4, gain: 1, offset: 0, ready: true },
    buf: fakeBuffer(4, 8000),
    an: o.noAnalysis ? null : {
      version: 1, source: { name: 'render.wav', duration: 4, sampleRate: 48000 }, bpm: { value: 126, confidence: 'medium' },
      elements: [
        { id: 'e1', name: 'drums: kick band', stem: 'drums', band: 'kick band (< 150 Hz)', track: 'kick',
          decisions: { synthOrSample: { value: 'synth', confidence: 'high', p: 0.9, evidence: ['residual -12 dB'], alternatives: [] },
                       drumMachine: { value: { machine: '909', voice: 'bd909' }, confidence: 'high', evidence: ['nearest bd909'], alternatives: [{ value: { machine: '808', voice: 'bd808' }, confidence: 'low' }] },
                       reverb: { value: { present: false }, confidence: 'low', evidence: ['mono tail'] } },
          recreation: { type: 'bd909', params: { tune: 0.4 }, confidence: 'high', why: ['nearest Drums voice'] },
          unverified: ['ELEMENT NOTE: a band of a drum stem can hold several voices; the band split is not a source separation'] },
        { id: 'e2', name: 'bass', stem: 'bass', band: [150, 5000], track: 'bassline', loaded: { type: 'tb303', params: {}, by: 'user' },
          decisions: { monoPoly: { value: 'mono', confidence: 'medium', evidence: [] }, fmOrSubtractive: { value: 'subtractive', confidence: 'low', evidence: [] }, odd: { value: null, confidence: 'none' } },
          recreation: { type: 'tb303', params: { wave: 'saw' }, confidence: 'low', why: ['rule'] } },
        { id: 'e3', name: 'other', stem: 'other', track: null, decisions: {}, recreation: null }
      ],
      separator: { model: 'htdemucs', stems: ['drums', 'bass', 'other', 'vocals'] },
      unverified: ['TOP NOTE 1: no decision has been checked on a separated stem with known truth; stems leak into each other and every confidence assumes a clean element, which is not true here.', 'TOP NOTE 2: the drum library is the engine’s own voices.']
    },
    document: function () { return doc_; },
    loadDocument: function (d) { h.calls.load.push(d); doc_ = d; emit('document', { reason: 'load' }); },
    on: function (t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    off: function (t, fn) { var l = listeners[t] || [], i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); },
    bpm: function () { return 120; },
    totalBars: function () { return 8; },
    buffer: function (id) { return id === 'ref1' ? h.buf : null; },
    transport: { pos: function () { return { bar: 0, step: 0, sectionName: 'mainA', section: 1 }; }, loopSection: null }
  };
  function emit(t, e) { (listeners[t] || []).slice().forEach(function (f) { f(e); }); }
  h.emit = emit;
  h.setDoc = function (d) { doc_ = d; };
  if (!o.bare) {
    h.reference = function () { return h.ref; };
    h.ab = function (s) { if (s === undefined) return h.state; h.calls.ab.push(s); h.state = s === 'toggle' ? (h.state === 'song' ? 'reference' : 'song') : s; emit('ab', { state: h.state }); return h.state; };
    h.matchLevel = function (x) { h.calls.match.push(x); if (o.matchNull) return Promise.resolve(null); h.ref.gain = Math.pow(10, -3.2 / 20); return Promise.resolve({ gainDb: -3.2, songLufs: -9.4, referenceLufs: -6.2 }); };
    h.setReferenceParam = function (k, v) { h.calls.setRef.push([k, v]); if (k === 'gain') h.ref.gain = v; };
    h.analysis = function () { return h.an; };
    h.applyRecreation = function (id, rec) {
      h.calls.apply.push([id, rec]);
      if (o.refuse) return false;
      h.calls.undo++;
      var e = h.an.elements.filter(function (x) { return x.id === id; })[0];
      var tr = doc_.tracks.filter(function (t) { return t.name === e.track; })[0];
      if (!rec) { doc_.tracks = doc_.tracks.filter(function (t) { return t !== tr; }); e.track = null; }
      else if (tr) { tr.type = rec.type; tr.inst = rec.type; e.recreation = rec; }
      else { doc_.tracks.push({ name: id + '_t', type: rec.type }); e.track = id + '_t'; e.recreation = rec; }
      emit('document', { reason: 'commit', rebuilt: true });
      return true;
    };
  }
  return h;
}

// ------------------------------------------------------------------ availability on an empty host
(function () {
  var av = IV.availability({});
  ['reference', 'ab', 'matchLevel', 'setReferenceParam', 'analysis', 'applyRecreation'].forEach(function (k) { ok(av[k] && !av[k].ok && av[k].why.length > 10, 'availability.' + k + ' gives a reason on an empty host'); });
  ok(IV.confWord(0.9) === 'high' && IV.confWord(0.6) === 'medium' && IV.confWord(0.2) === 'low' && IV.confWord('HIGH') === 'high' && IV.confWord(undefined) === 'none', 'confWord maps numbers and words');
  ok(IV._stemRole('song_Drums.wav') === 'drums' && IV._stemRole('x-vocals.flac') === 'vocals' && IV._stemRole('bass.wav') === 'bass' && IV._stemRole('pad.wav') === 'other', 'stem roles come from file names');
})();

var toasts = [];
function toast(t) { toasts.push(String(t)); }

// ------------------------------------------------------------------ A/B control
(function () {
  // a host without the calls: disabled with a reason, never throws
  var bare = stubHost({ bare: true });
  var c;
  try { c = IV.abControl(bare, { toast: toast }); ok(true, 'abControl on a bare host builds'); } catch (e) { ok(false, 'abControl on a bare host threw: ' + e.message); return; }
  var B = c.buttons;
  ok(B.song.getAttribute('aria-disabled') === 'true' && B.ref.getAttribute('aria-disabled') === 'true', 'A/B sides are aria-disabled without host.ab');
  ok(/host\.ab is missing/.test(B.ref.title), 'A/B title says why (' + B.ref.title + ')');
  ok(B.match.getAttribute('aria-disabled') === 'true' && B.gain.disabled === true, 'Match and gain are disabled without the calls');
  toasts.length = 0; B.ref.click(); c.toggle();
  ok(toasts.length === 2 && /host\.ab is missing/.test(toasts[0]), 'activating a disabled A/B shows the reason in a toast');
  B.match.click(); ok(/missing/.test(toasts[2] || ''), 'activating a disabled Match shows its reason');

  // a host with the calls but no reference
  var nr = stubHost({ noRef: true });
  var c2 = IV.abControl(nr, { toast: toast });
  ok(c2.buttons.ref.getAttribute('aria-disabled') === 'true' && /No reference/.test(c2.buttons.ref.title), 'A/B disabled with "No reference" when there is none');
  toasts.length = 0; c2.toggle(); ok(nr.calls.ab.length === 0 && /No reference/.test(toasts[0] || ''), 'toggle with no reference does not call host.ab and says why');

  // the full host
  var h = stubHost();
  var c3 = IV.abControl(h, { toast: toast }), B3 = c3.buttons;
  ok(B3.ref.getAttribute('aria-disabled') !== 'true' && B3.song.getAttribute('aria-pressed') === 'true' && B3.ref.getAttribute('aria-pressed') === 'false', 'A/B enabled, Song pressed at start');
  B3.ref.click();
  ok(h.calls.ab[0] === 'reference' && B3.ref.getAttribute('aria-pressed') === 'true' && B3.song.getAttribute('aria-pressed') === 'false', 'Ref click calls host.ab("reference") and shows Ref pressed');
  ok(c3.el.getAttribute('data-ab') === 'reference', 'group marks the side heard');
  c3.toggle();
  ok(h.calls.ab[1] === 'toggle' && B3.song.getAttribute('aria-pressed') === 'true', 'toggle calls host.ab("toggle") and Song is pressed again');
  ok(B3.gain.value === '0', 'gain field shows 0 dB for gain 1 (' + B3.gain.value + ')');
  B3.gain.value = '-6'; B3.gain.fire('change');
  ok(h.calls.setRef.length === 1 && h.calls.setRef[0][0] === 'gain' && Math.abs(h.calls.setRef[0][1] - Math.pow(10, -6 / 20)) < 1e-9, 'gain field writes linear gain through setReferenceParam');
  B3.gain.value = '40'; B3.gain.fire('change');
  ok(Math.abs(h.calls.setRef[1][1] - Math.pow(10, 12 / 20)) < 1e-9, 'gain is clamped to +12 dB');
  B3.match.click();
  return ticks().then(function () {
    ok(h.calls.match.length === 1 && h.calls.match[0].section === 'mainA', 'Match calls host.matchLevel({section}) with the current section');
    ok(/song \u22129\.4 \u00b7 ref \u22126\.2 LUFS/.test(B3.read.textContent), 'readout shows both measured loudnesses (' + B3.read.textContent + ')');
    ok(/over section mainA: song -9\.4 LUFS, reference -6\.2 LUFS/.test(B3.read.title) && /\u22123\.2 dB/.test(B3.read.title), 'readout title says what was measured, where, and the gain set');
    c3.update(true);
    ok(B3.gain.value === '-3.2', 'gain field follows the matched gain (' + B3.gain.value + ')');
    var hn = stubHost({ matchNull: true }), c4 = IV.abControl(hn, { toast: toast });
    c4.buttons.match.click();
    return ticks().then(function () { ok(c4.buttons.read.textContent === 'could not measure', 'a null match says it could not measure'); });
  });
})().then(function () {
  // ------------------------------------------------------------------ report view
  var view = new FakeNode('div'); body.appendChild(view);
  var bare = stubHost({ bare: true }), r0;
  try { r0 = IV.mount(view, bare, {}); ok(/host\.analysis is missing/.test(r0.el.textContent), 'report on a bare host says why it is empty'); r0.dispose(); } catch (e) { ok(false, 'report on a bare host threw: ' + e.message); }
  var na = stubHost({ noAnalysis: true }), r1 = IV.mount(view, na, {});
  ok(/no analysis/i.test(r1.el.textContent), 'report with no analysis says so'); r1.dispose();
  ok(view.children.length === 0, 'dispose removes the panel');

  var h = stubHost(), closed = 0;
  var r = IV.mount(view, h, { onClose: function () { closed++; } });
  var rows = byClass(r.el, 'iv-el');
  ok(rows.length === 3, 'one row per element (' + rows.length + ')');
  var txt = r.el.textContent;
  ok(txt.indexOf(h.an.unverified[0]) >= 0 && txt.indexOf(h.an.unverified[1]) >= 0, 'the report’s unverified notes are shown in full');
  ok(txt.indexOf(h.an.elements[0].unverified[0]) >= 0, 'an element’s own unverified note is shown in full');
  ok(/render\.wav/.test(txt) && /126 BPM/.test(txt) && /htdemucs/.test(txt), 'header shows source, tempo and separator');
  var chips = byClass(rows[0], 'iv-dc');
  ok(chips.length === 3, 'kick row has three decision chips');
  var conf = chips.map(function (c) { return c.getAttribute('data-conf'); });
  ok(conf.join(',') === 'high,high,low', 'chips carry their confidence (' + conf.join(',') + ')');
  ok(/HIGH|high/.test(chips[0].textContent) && /low/i.test(chips[2].textContent), 'each chip shows the confidence as a word');
  ok(/\?$/.test(byClass(chips[2], 'iv-dv')[0].textContent), 'a low-confidence value is marked with "?"');
  ok(/909 bd909/.test(chips[1].textContent), 'a drum machine decision shows machine and voice');
  ok(/low confidence/.test(chips[2].getAttribute('aria-label')), 'chip aria-label states the confidence');
  var pipsHigh = byClass(chips[0], 'iv-pips')[0].children.filter(function (i) { return i.className === 'on'; }).length;
  var pipsLow = byClass(chips[2], 'iv-pips')[0].children.filter(function (i) { return i.className === 'on'; }).length;
  ok(pipsHigh === 3 && pipsLow === 1, 'visual weight: 3 pips for high, 1 for low');
  var bassChips = byClass(rows[1], 'iv-dc');
  ok(bassChips.some(function (c) { return c.getAttribute('data-conf') === 'none' && /no call/.test(c.textContent); }), 'a decision with no call reads "no call"');
  ok(byClass(rows[0], 'iv-ev').length === 1 && /residual -12 dB/.test(byClass(rows[0], 'iv-ev')[0].textContent) && /alternative: 808 bd808/.test(rows[0].textContent), 'evidence and alternatives are in a details block');
  ok(/Track kick/.test(rows[0].textContent) && /bd909/.test(rows[0].textContent), 'row shows what was loaded');
  ok(/Nothing loaded/.test(rows[2].textContent), 'row without a track says nothing was loaded');
  ok(/150 Hz\u20135 kHz band/.test(rows[1].textContent), 'a band given as [lo, hi] reads in Hz and kHz');
  ok(/your choice/.test(rows[1].textContent), 'a recreation the owner chose is marked as such (element.loaded.by)');
  var sel = rows[0].find(function (n) { return n.tagName === 'SELECT'; })[0];
  var opts = sel.find(function (n) { return n.tagName === 'OPTION'; }).map(function (n) { return n.attrs.value; });
  ok(opts.indexOf('bd909') === 0 && opts.indexOf('tb303') > 0 && opts.indexOf('juno') > 0 && opts.indexOf('fm') > 0 && opts.indexOf('sampler') > 0 && opts.indexOf('__none') > 0 && opts.indexOf('bd808') > 0, 'recreation choices: suggested first, drum voices, classics, engine synths, sampler, none');
  ok(opts.filter(function (v) { return v === 'bd909'; }).length === 1, 'the suggested type is listed once');
  ok(sel.value === 'bd909', 'the select shows the loaded type');
  var sel2 = rows[1].find(function (n) { return n.tagName === 'SELECT'; })[0];
  ok(sel2.find(function (n) { return n.tagName === 'OPTION' && n.attrs.value === 'tb303'; })[0].textContent.indexOf('low confidence') >= 0, 'a low-confidence suggestion is labelled as such');
  sel.value = 'tb303'; sel.fire('change');
  return ticks().then(function () {
    ok(h.calls.apply.length === 1 && h.calls.apply[0][0] === 'e1' && h.calls.apply[0][1].type === 'tb303', 'changing the select calls host.applyRecreation once');
    ok(h.calls.undo === 1, 'one host call = one undo step');
    rows = byClass(r.el, 'iv-el');
    var s1 = rows[0].find(function (n) { return n.tagName === 'SELECT'; })[0];
    ok(s1.value === 'tb303', 'after the change the row shows the new type');
    s1.value = 'bd909'; s1.fire('change');
    return ticks();
  }).then(function () {
    var last = h.calls.apply[h.calls.apply.length - 1];
    ok(last[1] && last[1].type === 'bd909' && last[1].params && last[1].params.tune === 0.4, 'choosing the suggestion again passes its parameters');
    rows = byClass(r.el, 'iv-el');
    var s1 = rows[0].find(function (n) { return n.tagName === 'SELECT'; })[0];
    s1.value = '__none'; s1.fire('change');
    return ticks();
  }).then(function () {
    var last = h.calls.apply[h.calls.apply.length - 1];
    ok(last[0] === 'e1' && last[1] === null, '"None" calls applyRecreation(id, null)');
    rows = byClass(r.el, 'iv-el');
    ok(/Nothing loaded/.test(rows[0].textContent), 'after removal the row says nothing is loaded');
    // Esc closes
    r.el.fire('keydown', { key: 'Escape' });
    ok(closed === 1, 'Esc in the report calls onClose');
    r.dispose();
    // refused change reverts
    var hr = stubHost({ refuse: true }), rr = IV.mount(view, hr, {});
    var s = byClass(rr.el, 'iv-el')[0].find(function (n) { return n.tagName === 'SELECT'; })[0];
    s.value = 'juno'; s.fire('change');
    return ticks().then(function () {
      ok(s.value === 'bd909' && /refused/.test(rr.el.textContent), 'a refused change reverts the select and says so');
      rr.dispose();
      // no applyRecreation: the select is disabled with a reason
      var hp = stubHost(); delete hp.applyRecreation;
      var rp = IV.mount(view, hp, {});
      var sp = byClass(rp.el, 'iv-el')[0].find(function (n) { return n.tagName === 'SELECT'; })[0];
      ok(sp.disabled === true && /applyRecreation is missing/.test(sp.title) && /applyRecreation is missing/.test(rp.el.textContent), 'without applyRecreation the select is disabled with a visible reason');
      rp.dispose();
    });
  });
}).then(function () {
  // ------------------------------------------------------------------ reference lane
  var h = stubHost({ noRef: true });
  var L = IV.lane(h);
  L.update('0%');
  ok(L.el.style.display === 'none', 'lane hidden while there is no reference');
  h.ref = { id: 'ref1', name: 'render.wav', duration: 4, gain: 1, offset: 0, ready: true };
  var area = byClass(L.el, 'iv-lane-a')[0], cv = L.el.find(function (n) { return n.tagName === 'CANVAS'; })[0];
  area._w = 800; area._h = 44;
  L.update('25%');
  ok(L.el.style.display === '', 'lane shown when a reference exists');
  ok(/render\.wav/.test(L.el.textContent) && /0\.0 dB/.test(L.el.textContent), 'lane shows the file name and gain');
  var ph = byClass(L.el, 'se-ph')[0];
  ok(ph.style.left === '25%', 'lane playhead follows the ruler fraction');
  ok(cv.width === 800 && cv.height === 44, 'canvas sized to the area at dpr 1');
  // 8 bars at 120 BPM = 16 s across 800 px; a 4 s file covers bars 0..2 = columns 0..199
  function cols() { return cv.ops.filter(function (o) { return o[2] === 1; }).map(function (o) { return o[0]; }); }
  var c = cols();
  ok(c.length > 150 && Math.max.apply(null, c) <= 200 && Math.min.apply(null, c) === 0, 'waveform covers bars 1-2 only (columns ' + Math.min.apply(null, c) + '..' + Math.max.apply(null, c) + ')');
  h.ref.offset = 2;    // bar 1 at 2 s: the file's remaining 2 s cover columns 0..99
  L.update('25%'); c = cols();
  ok(Math.max.apply(null, c) <= 100 && Math.max.apply(null, c) >= 95, 'offset shifts the waveform (last column ' + Math.max.apply(null, c) + ')');
  ok(/bar 1 at 2 s/.test(L.el.textContent), 'lane states the offset');
  sb.devicePixelRatio = 2; L.update('25%');
  ok(cv.width === 1600 && cv.height === 88, 'canvas drawn at device pixel ratio 2');
  var n0 = cv.ops.length; L.update('30%');
  ok(cv.ops.length === n0, 'no redraw when nothing changed (playhead move only)');
  h.state = 'reference'; L.update('30%');
  ok(L.el.getAttribute('data-heard') === 'true' && /heard/.test(L.el.textContent), 'lane marks the reference as heard on Ref');
  sb.devicePixelRatio = 1;
  var hb = stubHost({ bare: true }), Lb = IV.lane(hb);
  try { Lb.update('0%'); ok(Lb.el.style.display === 'none', 'lane on a bare host stays hidden and does not throw'); } catch (e) { ok(false, 'lane on a bare host threw'); }
}).then(function () {
  // ------------------------------------------------------------------ import flow
  var file = { name: 'render.wav', size: 1000 };
  var imports = [];
  sb.Project = {
    pickAudio: function () { return Promise.resolve(file); },
    pickFiles: function () { return Promise.resolve([{ name: 'render_drums.wav' }, { name: 'render_bass.wav' }, { name: 'notes.txt' }]); },
    importTrack: function (o) {
      imports.push(o);
      var d = sb.Project._defer = {};
      return new Promise(function (res, rej) { d.res = res; d.rej = rej; });
    }
  };
  function dialog() { return byClass(body, 'iv-dlg')[0] || null; }
  function button(re) { var d = dialog(); return d ? byText(d, 'BUTTON', re)[0] : null; }
  var h = stubHost(), done = [];
  // missing importTrack: a toast with the reason, no dialog
  var keep = sb.Project.importTrack; delete sb.Project.importTrack;
  toasts.length = 0;
  return IV.importTrack(h, { toast: toast }).then(function (r) {
    ok(r === null && !dialog() && /importTrack is missing/.test(toasts[0] || ''), 'without Project.importTrack the import says why and opens nothing');
    sb.Project.importTrack = keep;
    // browser path: skip stems
    var p = IV.importTrack(h, { toast: toast, onDone: function (res) { done.push(res); } });
    return ticks().then(function () {
      ok(!!dialog(), 'the import dialog opens after a file is picked');
      ok(dialog().getAttribute('role') === 'dialog' && dialog().getAttribute('aria-modal') === 'true', 'dialog has role and aria-modal');
      ok(/Drop stem files/.test(dialog().textContent) && !!button(/^Skip/) && !!button(/^Pick stem files/), 'browser: a stems step with drop, pick and skip');
      button(/^Skip/).click();
      return ticks();
    }).then(function () {
      ok(imports.length === 1 && imports[0].file === file && imports[0].stems === undefined && imports[0].host === h, 'skip passes no stems (the engine reads the mix)');
      ok(typeof imports[0].onProgress === 'function', 'onProgress is passed');
      var li = dialog().find(function (n) { return n.tagName === 'LI'; });
      ok(li.length === 6, 'six stages listed');
      ok(li[1].getAttribute('data-state') === 'skip', 'separate stage marked skipped for the mix');
      imports[0].onProgress({ stage: 'decode', done: 0, total: 1 });
      ok(li[0].getAttribute('data-state') === 'run', 'decode stage running');
      imports[0].onProgress({ stage: 'analyse', done: 2, total: 5, note: 'bass' });
      ok(li[0].getAttribute('data-state') === 'done' && li[2].getAttribute('data-state') === 'done' && li[3].getAttribute('data-state') === 'run' && /2 of 5/.test(li[3].textContent) && /bass/.test(li[3].textContent), 'progress marks earlier stages done and shows done/total and the note');
      var bar = byClass(dialog(), 'iv-bar')[0];
      ok(+bar.getAttribute('aria-valuenow') > 50 && +bar.getAttribute('aria-valuenow') < 70, 'overall bar advances (' + bar.getAttribute('aria-valuenow') + '%)');
      sb.Project._defer.res({ doc: {}, saved: { name: 'render.havantechno.json' }, analysis: h.an });
      return p;
    }).then(function (res) {
      ok(res && res.saved && !dialog(), 'success closes the dialog and resolves the result');
      ok(done.length === 1, 'onDone is called once (the app opens the report there)');
      ok(toasts.some(function (t) { return /saved as render\.havantechno\.json/.test(t); }), 'toast names the saved project');
    });
  }).then(function () {
    // browser path: stems picked by file name
    imports.length = 0;
    var p = IV.importTrack(h, { toast: toast });
    return ticks().then(function () {
      button(/^Pick stem files/).click();
      return ticks();
    }).then(function () {
      var sels = dialog().find(function (n) { return n.tagName === 'SELECT'; });
      ok(sels.length === 2 && sels[0].value === 'drums' && sels[1].value === 'bass', 'picked stems get roles from their names; a non-audio file is skipped');
      ok(/Skipped 1/.test(dialog().textContent), 'skipped files are reported');
      sels[1].value = 'other'; sels[1].fire('change');
      button(/^Use these stems/).click();
      return ticks();
    }).then(function () {
      ok(imports.length === 1 && imports[0].stems.length === 2 && imports[0].stems[0].name === 'drums' && imports[0].stems[1].name === 'other' && imports[0].stems[0].source.name === 'render_drums.wav', 'Use these stems passes [{name, source}] with the chosen roles');
      ok(dialog().find(function (n) { return n.tagName === 'LI'; })[1].getAttribute('data-state') === 'skip', 'separate stage says stems were supplied');
      sb.Project._defer.rej(new Error('decode failed: not audio'));
      return ticks();
    }).then(function () {
      ok(!!dialog() && /The import failed: decode failed/.test(dialog().textContent), 'a failure stays in the dialog with the message');
      button(/^Close$/).click();
      return p;
    }).then(function (res) { ok(res === null && !dialog(), 'Close after a failure resolves null'); });
  }).then(function () {
    // cancel: the document is restored
    imports.length = 0;
    var before = JSON.stringify(h.document());
    var p = IV.importTrack(h, { toast: toast });
    return ticks().then(function () {
      button(/^Skip/).click();
      return ticks();
    }).then(function () {
      h.setDoc({ name: 'imported', tracks: [], sections: [] });      // the import has replaced the song already
      var d = dialog();
      d.parentNode.fire('keydown', { key: 'Escape' });
      ok(/Cancelling/.test(dialog().textContent), 'Esc during the run starts cancelling');
      var threw = false;
      try { imports[0].onProgress({ stage: 'build', done: 0, total: 1 }); } catch (e) { threw = e.name === 'AbortError'; }
      ok(threw, 'onProgress throws an AbortError after cancel');
      ok(imports[0].signal == null || imports[0].signal.aborted === true, 'the AbortSignal is aborted');
      sb.Project._defer.rej(Object.assign(new Error('cancelled'), { name: 'AbortError' }));
      return p;
    }).then(function (res) {
      ok(res === null && !dialog(), 'cancel resolves null and closes the dialog');
      ok(JSON.stringify(h.document()) === before && h.calls.load.length === 1, 'cancel restores the document as it was (one loadDocument)');
      ok(toasts.some(function (t) { return /cancelled; the project is restored/.test(t); }), 'toast says the project is restored');
    });
  }).then(function () {
    // cancel before the run: nothing happens
    imports.length = 0;
    var p = IV.importTrack(h, { toast: toast });
    return ticks().then(function () { button(/^Cancel$/).click(); return p; }).then(function (res) {
      ok(res === null && imports.length === 0 && !dialog(), 'cancel at the stems step imports nothing');
    });
  }).then(function () {
    // Electron path: importTrack separates (D1's Project.importTrack calls shell.separate when given no stems)
    var sepFn = null, cancels = 0, unsubs = 0;
    var shell = { separate: function () { return Promise.resolve({ stems: [] }); }, cancelSeparate: function () { cancels++; return Promise.resolve(); },
                  onSeparateProgress: function (fn) { sepFn = fn; return function () { unsubs++; sepFn = null; }; }, saveFile: function () {} };
    file = { name: 'song.wav', path: '/music/song.wav', bytes: new Uint8Array(4) };
    imports.length = 0;
    var p = IV.importTrack(h, { toast: toast, shell: shell });
    return ticks().then(function () {
      ok(!!button(/^Separate into stems/) && !!button(/^Analyse the mix/), 'Electron: separate or analyse the mix');
      button(/^Separate into stems/).click();
      return ticks();
    }).then(function () {
      ok(imports.length === 1 && imports[0].stems === undefined && imports[0].shell === shell && typeof imports[0].shell.separate === 'function', 'Separate: importTrack gets the shell with separate() and no stems');
      imports[0].onProgress({ stage: 'separate', done: 2, total: 5, note: 'htdemucs 40%' });
      var li = dialog().find(function (n) { return n.tagName === 'LI'; });
      ok(li[1].getAttribute('data-state') === 'run' && /2 of 5/.test(li[1].textContent) && /htdemucs/.test(li[1].textContent), 'separation progress shows in the separate stage');
      ok(typeof sepFn === 'function', 'the dialog listens to onSeparateProgress itself');
      sepFn({ stage: 'download', note: 'fetching the model weights', line: 'x' });
      ok(/download: fetching the model weights/.test(li[1].textContent), 'a download note from the shell shows with its stage');
      imports[0].onProgress({ stage: 'separate', done: 0, total: 1, note: 'separating song.wav' });
      ok(!/0 of 1/.test(li[1].textContent), 'no "0 of 1" counter for a one-step stage');
      ok(/^Elapsed \d+:\d\d/.test(byClass(dialog(), 'iv-elapsed')[0].textContent), 'the run shows an elapsed time');
      button(/^Cancel$/).click();
      ok(cancels === 1 && /separator is being stopped/.test(dialog().textContent), 'Cancel while separating calls cancelSeparate and says so');
      sb.Project._defer.rej(new Error('Separation cancelled'));
      return p;
    }).then(function (res) {
      ok(res === null && !dialog() && unsubs >= 1, 'after a cancelled separation the dialog closes and unsubscribes');
      imports.length = 0;
      p = IV.importTrack(h, { toast: toast, shell: shell });
      return ticks().then(function () { button(/^Separate into stems/).click(); return ticks(); });
    }).then(function () {
      sb.Project._defer.rej(new Error('Python 3 was not found. Install it, then run: pip install demucs'));
      return ticks();
    }).then(function () {
      ok(/The import failed: Python 3 was not found\. Install it, then run: pip install demucs/.test(dialog().textContent), 'a shell rejection message is shown as it is');
      button(/^Close$/).click();
      return p;
    }).then(function () {
      imports.length = 0;
      p = IV.importTrack(h, { toast: toast, shell: shell });
      return ticks().then(function () { button(/^Separate into stems/).click(); return ticks(); });
    }).then(function () {
      sb.Project._defer.res({ saved: { name: 'song.havantechno.json', path: '/music/song.havantechno.json' } });
      return p;
    }).then(function (res) {
      ok(res && !dialog(), 'Electron import completes');
      imports.length = 0;
      var p2 = IV.importTrack(h, { toast: toast, shell: shell });
      return ticks().then(function () { button(/^Analyse the mix/).click(); return ticks(); }).then(function () {
        ok(imports.length === 1 && imports[0].stems === undefined && imports[0].shell !== shell && typeof imports[0].shell.separate !== 'function' && typeof imports[0].shell.saveFile === 'function', 'Analyse the mix: a shell copy without separate(), saving kept');
        sb.Project._defer.res({ saved: { name: 'x' } });
        return p2;
      });
    });
  });
}).then(function () {
  // ------------------------------------------------------------------ System Editor with the real Host
  ['engine/processors.js', 'engine/songdoc.js', 'engine/sequencer.js', 'engine/song.js', 'engine/host.js', 'engine/project.js'].forEach(load);
  if (fs.existsSync(path.join(APP, 'engine/importer.js'))) { try { load('engine/importer.js'); } catch (e) { console.log('  (importer.js did not load: ' + e.message + ')'); } }
  sb.Widgets = { steps: function () { var e = new FakeNode('div'); return { el: e, set: function () {} }; }, meter: function () { var e = new FakeNode('div'); return { el: e, set: function () {} }; } };
  sb.Faces = { render: function () { return null; } };
  sb.Windows = { open: function () {}, onSelect: function () {} };
  load('ui/system-editor.js');
  var host;
  try { host = sb.Host.create(); } catch (e) { ok(false, 'the real Host.create() failed (engine/host.js): ' + e.message); return; }
  var real = ['reference', 'ab', 'matchLevel', 'analysis', 'applyRecreation', 'setReference', 'setReferenceParam'].filter(function (k) { return typeof host[k] === 'function'; });
  console.log('  real Host has: ' + (real.length ? real.join(', ') : 'none of the D1 reference calls') + (real.length < 7 ? ' (the rest stubbed for this part)' : ''));
  var stubRef = null;
  if (typeof host.reference !== 'function') host.reference = function () { return stubRef; };
  if (typeof host.buffer !== 'function' || real.indexOf('reference') < 0) { var ob = host.buffer; host.buffer = function (id) { return id === 'refX' ? fakeBuffer(8, 8000) : (ob ? ob.call(host, id) : null); }; }
  if (typeof host.ab !== 'function') host.ab = function () { return 'song'; };
  var el_ = new FakeNode('div'); body.appendChild(el_);
  var v = sb.SystemEditor.mount(el_, host);
  var lanes = byClass(el_, 'iv-lane');
  ok(lanes.length === 1, 'System Editor has one reference lane');
  var inner = byClass(el_, 'se-inner')[0], kids = inner.children;
  var iHead = kids.findIndex(function (n) { return hasClass(n, 'se-thead'); }), iLane = kids.indexOf(lanes[0]), iBody = kids.findIndex(function (n) { return hasClass(n, 'se-body'); });
  ok(iHead >= 0 && iLane === iHead + 1 && iBody === iLane + 1, 'the lane sits at the top of the track list (after TRACKS, before the rows)');
  ok(hasClass(lanes[0], 'se-band') && byClass(lanes[0], 'se-area').length === 1, 'the lane uses the ruler’s band and area columns');
  v.update();
  if (real.indexOf('reference') < 0) {
    ok(lanes[0].style.display === 'none', 'lane hidden with no reference (stub)');
    stubRef = { id: 'refX', name: 'mix.wav', duration: 8, gain: 1, offset: 0, ready: true };
    v.update();
    ok(lanes[0].style.display === '' && /mix\.wav/.test(lanes[0].textContent), 'lane appears with the reference name (stub)');
    ok(byClass(lanes[0], 'se-ph')[0].style.left != null, 'lane playhead is set by the editor update');
    return afterLane();
  }
  ok(lanes[0].style.display === 'none', 'lane hidden with no reference (real Host)');
  return Promise.resolve(host.setReference(new Uint8Array(32000).buffer, { name: 'mix.wav' })).then(function (r) {
    v.update();
    ok(r === true && lanes[0].style.display === '' && /mix\.wav/.test(lanes[0].textContent), 'real setReference: the lane appears with the file name (' + JSON.stringify(host.reference()) + ')');
    ok(byClass(lanes[0], 'se-ph')[0].style.left != null, 'lane playhead is set by the editor update');
    return afterLane();
  });
  function afterLane() {
  // the "+ track" menu has "Import track..."
  var add = byText(el_, 'BUTTON', /^\+ track$/)[0];
  add.fire('click', { stopPropagation: function () {} });
  var item = byText(el_, 'BUTTON', /^Import track/)[0];
  ok(!!item && !item.disabled, '"+ track" menu has an enabled "Import track…" entry');
  var calls = 0; sb.App = { importTrack: function () { calls++; } };
  if (item) item.fire('click', { stopPropagation: function () {} });
  ok(calls === 1, '"Import track…" calls App.importTrack');
  try { v.dispose(); ok(byClass(el_, 'iv-lane').length === 0, 'dispose removes the lane'); } catch (e) { ok(false, 'dispose threw: ' + e.message); }
  }
}).then(function () {
  if (failed) { console.log('FAILED: ' + failed + ' of ' + (passed + failed) + ' checks'); process.exit(1); }
  console.log('OK: ' + passed + ' checks passed');
  process.exit(0);
}, function (e) { console.log('ERROR: ' + (e && e.stack || e)); process.exit(1); });
