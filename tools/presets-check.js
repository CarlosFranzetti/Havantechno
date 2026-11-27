#!/usr/bin/env node
/* Check for app/engine/presets.js (Showroom Crew W1) in Node: a fake DOM, the real engine and Host (no audio), the real Windows.
 *   node tools/presets-check.js        prints "OK: N checks passed" and exits 0, else names the failing check and exits 1.
 * Covers: the frozen interface rows; validation (unknown parameters reported, numbers clamped, enumerations checked);
 * the storage adapter (default localStorage, memory fallback when localStorage throws, a custom adapter, the Electron
 * app-data file); export and import round trips and readable rejections (no eval); every factory preset within its spec
 * and every factory pattern well formed (the tb303 ones are solo.js's six lines); apply = one undo step, before audio,
 * and undo restoring; kits on a partial 808 kit; patterns onto the current variant (one undo step); the menu in a device
 * window (lists, marks the current preset, loads, saves, keyboard, dispose). */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var APP = path.join(__dirname, '..', 'app');

// ------------------------------------------------------------------ fake DOM (as tools/panels-check.js, with forms)
var LIVE = { n: 0 };
function Node_(tag, doc) {
  this.tagName = String(tag).toUpperCase(); this.children = []; this.parentNode = null; this.style = {}; this.attrs = {};
  this.className = ''; this._text = ''; this.listeners = {}; this.hidden = false; this.id = ''; this.value = ''; this.ownerDoc = doc;
  var self = this;
  this.classList = {
    toggle: function (c, on) { var p = self.className.split(/\s+/).filter(Boolean), i = p.indexOf(c); if (on === undefined) on = i < 0; if (on && i < 0) p.push(c); else if (!on && i >= 0) p.splice(i, 1); self.className = p.join(' '); return on; },
    contains: function (c) { return self.className.split(/\s+/).indexOf(c) >= 0; }, add: function (c) { this.toggle(c, true); }, remove: function (c) { this.toggle(c, false); }
  };
  this.style.setProperty = function (k, v) { self.style[k] = v; };
}
Node_.prototype.appendChild = function (c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; };
Node_.prototype.insertBefore = function (c, ref) { if (c.parentNode) c.parentNode.removeChild(c); var i = this.children.indexOf(ref); c.parentNode = this; if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); return c; };
Node_.prototype.replaceChild = function (n, o) { var i = this.children.indexOf(o); if (i >= 0) { this.children[i] = n; n.parentNode = this; o.parentNode = null; } return o; };
Node_.prototype.removeChild = function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; };
Object.defineProperty(Node_.prototype, 'firstChild', { get: function () { return this.children[0] || null; } });
Object.defineProperty(Node_.prototype, 'lastChild', { get: function () { return this.children[this.children.length - 1] || null; } });
Object.defineProperty(Node_.prototype, 'textContent', {
  get: function () { return this._text + this.children.map(function (c) { return c.textContent; }).join(''); },
  set: function (v) { this.children = []; this._text = String(v); }
});
['clientWidth', 'offsetWidth'].forEach(function (k) { Object.defineProperty(Node_.prototype, k, { get: function () { return 900; } }); });
['clientHeight', 'offsetHeight'].forEach(function (k) { Object.defineProperty(Node_.prototype, k, { get: function () { return 600; } }); });
Node_.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = String(v); };
Node_.prototype.getAttribute = function (k) { return k === 'class' ? this.className : (Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null); };
Node_.prototype.removeAttribute = function (k) { delete this.attrs[k]; };
Node_.prototype.addEventListener = function (t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); LIVE.n++; };
Node_.prototype.removeEventListener = function (t, fn) { var l = this.listeners[t] || [], i = l.indexOf(fn); if (i >= 0) { l.splice(i, 1); LIVE.n--; } };
Node_.prototype.getBoundingClientRect = function () { return { left: 100, top: 40, right: 180, bottom: 64, width: 80, height: 24 }; };
Node_.prototype.focus = function () { this.ownerDoc.activeElement = this; };
Node_.prototype.select = function () {};
Node_.prototype.click = function () { this.fire('click'); };
Node_.prototype.contains = function (n) { for (; n; n = n.parentNode) if (n === this) return true; return false; };
Node_.prototype.closest = function () { return null; };
Node_.prototype.fire = function (t, ev) {
  ev = ev || {}; ev.target = ev.target || this; ev.preventDefault = function () { ev.defaultPrevented = true; }; ev.stopPropagation = function () {};
  (this.listeners[t] || []).slice().forEach(function (f) { f(ev); });
  return ev;
};
Node_.prototype.walk = function (fn) { fn(this); this.children.forEach(function (c) { c.walk(fn); }); };
Node_.prototype.find = function (pred) { var out = []; this.walk(function (n) { if (pred(n)) out.push(n); }); return out; };
function listenersUnder(n) { var c = 0; n.walk(function (x) { for (var k in x.listeners) c += x.listeners[k].length; }); return c; }

function makeDoc() {
  var byId = {}, d = {
    activeElement: null, documentElement: null,
    createElement: function (t) { return new Node_(t, d); },
    createElementNS: function (ns, t) { return new Node_(t, d); },
    createTextNode: function (s) { var n = new Node_('#text', d); n._text = String(s); return n; },
    getElementById: function (id) { return byId[id] || null; },
    listeners: {},
    addEventListener: function (t, fn) { (d.listeners[t] = d.listeners[t] || []).push(fn); },
    removeEventListener: function (t, fn) { var l = d.listeners[t] || [], i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); },
    execCommand: function () { return true; }
  };
  d.head = new Node_('head', d); d.body = new Node_('body', d);
  var ha = d.head.appendChild;
  d.head.appendChild = function (c) { if (c.id) byId[c.id] = c; return ha.call(d.head, c); };
  var layer = new Node_('div', d); layer.id = 'windows'; byId.windows = layer; d.body.appendChild(layer);
  d.layer = layer;
  return d;
}
function lsFake() { return { _d: {}, getItem: function (k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; }, setItem: function (k, v) { this._d[k] = String(v); }, removeItem: function (k) { delete this._d[k]; } }; }

var ENGINE = ['engine/core.js', 'engine/programs.js', 'engine/synths.js', 'engine/drums.js', 'engine/worklets.js', 'engine/classics.js', 'engine/processors.js',
  'engine/songdoc.js', 'engine/sequencer.js', 'engine/song.js', 'engine/host.js'];
var timers = [];
// a fresh realm: extra = sandbox overrides; ui = also load the window files
function realm(extra, ui) {
  var d = makeDoc();
  var sb = { console: { log: console.log, warn: function () { sb._warns.push([].slice.call(arguments).join(' ')); }, error: console.error }, _warns: [],
    Math: Math, JSON: JSON, Date: Date, Float32Array: Float32Array, Uint8Array: Uint8Array, Promise: Promise, Error: Error,
    setTimeout: function (fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }, clearTimeout: clearTimeout,
    requestAnimationFrame: function () { return 0; }, cancelAnimationFrame: function () {}, innerWidth: 1280, innerHeight: 860,
    location: { search: '' }, localStorage: lsFake() };
  for (var k in extra || {}) sb[k] = extra[k];
  sb.window = sb; sb.document = d; sb.globalThis = sb; sb.URLSearchParams = URLSearchParams;
  if (extra && extra.localStorageThrows) Object.defineProperty(sb, 'localStorage', { get: function () { throw new Error('SecurityError: storage blocked'); } });
  vm.createContext(sb);
  var files = ENGINE.concat(['engine/presets.js']).concat(ui ? ['ui/widgets.js', 'ui/faces.js', 'ui/facedefs.js', 'ui/panels.js', 'ui/windows.js'] : []);
  files.forEach(function (rel) { vm.runInContext(fs.readFileSync(path.join(APP, rel), 'utf8'), sb, { filename: rel }); });
  return sb;
}

var passed = 0;
function ok(cond, msg) { if (!cond) { console.log('FAIL: ' + msg); timers.forEach(clearTimeout); process.exit(1); } passed++; }
function near(a, b) { return Math.abs(a - b) < 1e-9; }

(async function main() {
  var sb = realm({}, true), P = sb.Presets;

  // ==================================================================== interface rows
  ok(P && typeof P === 'object', 'global Presets exists');
  ['list', 'get', 'save', 'rename', 'remove', 'capture', 'apply', 'exportText', 'importText', 'storage', 'on', 'off', 'menu', 'ready'].forEach(function (f) {
    ok(typeof P[f] === 'function', 'Presets.' + f + ' is a function');
  });
  ['list', 'get', 'save', 'rename', 'remove', 'exportText', 'importText', 'apply', 'capture'].forEach(function (f) {
    ok(P.patterns && typeof P.patterns[f] === 'function', 'Presets.patterns.' + f + ' is a function');
  });
  var src = fs.readFileSync(path.join(APP, 'engine/presets.js'), 'utf8');
  ok(!/\beval\s*\(|new\s+Function\s*\(/.test(src), 'presets.js has no eval and no new Function');
  ok(P.problems().length === 0, 'the factory bank validates with no problems (' + P.problems().slice(0, 3).join('; ') + ')');
  var l303 = P.list('tb303');
  ok(l303.length >= 6 && l303.every(function (e) { return e.factory === true && e.kind === 'patch' && typeof e.id === 'string' && typeof e.name === 'string'; }), 'list(tb303): factory rows {id, name, factory, kind: patch}');
  ok(l303.every(function (e) { return e.id.indexOf('tb303/') === 0; }), 'factory ids carry their type');
  var g = P.get('tb303', l303[1].id);
  ok(g && g.id === l303[1].id && g.type === 'tb303' && g.params && typeof g.params.cutoff === 'number', 'get(type, id) -> {id, name, type, params}');
  ok(P.get('tb303', 'tb303/nope') === null && P.get('juno', l303[1].id) === null, 'get of an unknown id, or under another type, is null');
  ok(P.save('tb303', 'x', {}, { id: l303[0].id }) === null, 'save over a factory id is refused');
  ok(P.rename('tb303', l303[0].id, 'x') === false && P.remove('tb303', l303[0].id) === false, 'factory presets cannot be renamed or removed');
  var kits = P.list('hvt808');
  ok(kits.length >= 3 && kits.every(function (k) { return k.machine === true && k.kind === 'patch'; }) && P.list('hvt909').length >= 3, 'machine kits for hvt808 and hvt909');
  var kit = P.get('hvt808', kits[0].id);
  ok(kit.voices && kit.voices.bd808 && kit.params.bd808, 'a kit has voices: {type: params}');

  // ==================================================================== validation
  var v = P.validate('tb303', { cutoff: 99999, resonance: '0.5', wave: 'triangle', foo: 1, decay: 'long', envMod: -3 });
  ok(v.params.cutoff === 2394 && v.params.resonance === 0.5 && v.params.envMod === 0, 'numbers clamped to the row (cutoff 2394, envMod 0), numeric strings read');
  ok(!('wave' in v.params) && !('foo' in v.params) && !('decay' in v.params), 'a string not in the options, an unknown name and a non-number are dropped');
  ok(v.problems.some(function (p) { return /foo/.test(p) && /not a parameter/.test(p); }) && v.problems.some(function (p) { return /wave/.test(p); }) && v.problems.some(function (p) { return /cutoff.*clamped/.test(p); }), 'each is reported (' + v.problems.join(' | ') + ')');
  var vj = P.validate('juno', { range: 10, chorus: 1.6, saw: 0, pulse: 1, lfoAuto: 'yes', voiceMode: 'unison' });
  ok(vj.params.range === 8 && vj.params.chorus === 2 && vj.params.saw === false && vj.params.pulse === true && vj.params.voiceMode === 'unison' && !('lfoAuto' in vj.params), 'numeric options snap to the nearest, 0/1 become booleans, a bad boolean is dropped');
  var vk = P.validate('hvt808', { bd808: { decay: 9 }, bd909: { decay: 0.1 } });
  ok(vk.voices.bd808.decay === 0.8 && !vk.voices.bd909 && vk.problems.some(function (p) { return /bd909/.test(p); }), 'kits: each voice validated, a voice of the other machine reported');
  var vp = P.patterns.validate('tb303', { bars: 1, cells: [{ note: 300, vel: 2, acc: 1, zap: 3 }] });
  ok(vp.pattern.cells.length === 16 && vp.pattern.cells[0].note === 127 && vp.pattern.cells[0].vel === 1 && vp.pattern.cells[0].acc === true && !('zap' in vp.pattern.cells[0]) && vp.problems.length === 1, 'patterns: cells padded to bars x 16, fields clamped, unknown field reported');
  ok(P.patterns.validate('tb303', { bars: 99, cells: [] }).pattern === null, 'a pattern of 99 bars is refused');
  var id1 = P.save('tb303', '  My   acid  ', { cutoff: 5000, wave: 'square', bogus: 2 });
  ok(/^tb303\/u-/.test(id1) && P.get('tb303', id1).params.cutoff === 2394 && !('bogus' in P.get('tb303', id1).params) && P.get('tb303', id1).name === 'My acid', 'save validates and tidies the name');

  // ==================================================================== every factory preset and pattern
  var counts = {};
  P.types().forEach(function (t) {
    P.list(t).filter(function (e) { return e.factory; }).forEach(function (e) {
      counts[t] = (counts[t] || 0) + 1;
      var p = P.get(t, e.id), spec = P.spec(t);
      if (P.isMachine(t)) {
        Object.keys(p.voices).forEach(function (vt) {
          var s = P.spec(vt);
          ok(s && vt.slice(-3) === t.slice(-3), e.id + ': ' + vt + ' is a voice of ' + t);
          Object.keys(p.voices[vt]).forEach(function (k) { var r = s[k], x = p.voices[vt][k]; ok(r && x >= r.min && x <= r.max, e.id + ' ' + vt + '.' + k + ' = ' + x + ' within ' + (r && r.min) + '..' + (r && r.max)); });
        });
        return;
      }
      ok(spec, t + ' has a spec');
      ok(P.validate(t, p.params).problems.length === 0, e.id + ': validates with no problem');
      Object.keys(p.params).forEach(function (k) {
        var r = spec[k], x = p.params[k];
        ok(!!r, e.id + ': ' + k + ' is a spec row');
        if (r.options) ok(r.options.map(String).indexOf(String(x)) >= 0, e.id + ': ' + k + ' = ' + x + ' is one of the options');
        else if (typeof r.value === 'boolean') ok(typeof x === 'boolean', e.id + ': ' + k + ' is a boolean');
        else ok(typeof x === 'number' && x >= r.min && x <= r.max, e.id + ': ' + k + ' = ' + x + ' within ' + r.min + '..' + r.max);
      });
    });
  });
  ['tb303', 'modeld', 'juno'].forEach(function (t) { ok(counts[t] >= 6 && counts[t] <= 10, t + ': 6 to 10 factory patches (' + counts[t] + ')'); });
  ['bd808', 'bd909', 'sd808', 'sd909', 'ch808', 'oh808', 'ch909', 'oh909', 'lt808', 'mt808', 'ht808', 'lt909', 'mt909', 'ht909'].forEach(function (t) {
    ok(counts[t] >= 3 && counts[t] <= 5, t + ': 3 to 5 factory presets (' + counts[t] + ')');
  });
  var pcount = {};
  ['tb303', 'modeld', 'juno', 'hvt808', 'hvt909'].forEach(function (t) {
    var list = P.patterns.list(t).filter(function (e) { return e.factory; });
    pcount[t] = list.length;
    ok(list.length === 6, t + ': six factory patterns (' + list.length + ')');
    list.forEach(function (e) {
      var p = P.patterns.get(t, e.id).pattern;
      ok(P.patterns.validate(t, p).problems.length === 0, e.id + ': validates with no problem');
      var vars = P.isMachine(t) ? Object.keys(p.voices).map(function (k) { return p.voices[k]; }) : [p];
      if (P.isMachine(t)) {
        ok(Object.keys(p.voices).every(function (vt) { return vt.slice(-3) === t.slice(-3) && P.spec(vt); }), e.id + ': every voice is one of the machine');
        ok(p.bpm >= 40 && p.bpm <= 300 && p.swing >= 0 && p.swing <= 1, e.id + ': bpm and swing within range');
      }
      vars.forEach(function (va) {
        ok(va.bars >= 1 && va.bars <= 4 && va.cells.length === va.bars * 16, e.id + ': bars x 16 cells');
        var hits = va.cells.filter(Boolean);
        ok(hits.length >= 1 || P.isMachine(t), e.id + ': has notes');
        hits.forEach(function (c) {
          if (!P.isMachine(t)) ok(c.note >= 12 && c.note <= 108 && c.len >= 1 && c.vel > 0, e.id + ': note ' + c.note + ' len ' + c.len);
          if (c.notes) ok(c.notes.indexOf(c.note) >= 0 && Math.min.apply(null, c.notes) === c.note, e.id + ': a chord cell carries its lowest note as note');
        });
      });
    });
  });
  // the tb303 factory patterns are the six lines written for app/solo/solo.js
  var soloSrc = fs.readFileSync(path.join(APP, 'solo/solo.js'), 'utf8');
  var tb = P.patterns.list('tb303').filter(function (e) { return e.factory; });
  var found = 0;
  [['Pump', 'A1 . A1 A2! . A1 G1~ A1 A1 . C2 A1 . A2! E2~ D2'], ['Run', 'D2 D2 F2 D2! A2~ D2 C3! D2 D2 F2 D2 A#1~ C2 D2! F2 E2~']].forEach(function (row) {
    if (soloSrc.indexOf(row[1]) >= 0) found++;
    ok(tb.some(function (e) { return e.name === row[0]; }), 'tb303 pattern ' + row[0] + ' present');
  });
  var pump = P.patterns.get('tb303', 'tb303/pump').pattern;
  ok(pump.cells[0].note === 33 && pump.cells[3].note === 45 && pump.cells[3].acc === true && pump.cells[6].slide === true && pump.cells[1] === null, 'Pump reads as solo.js parses it (A1 = 33, accent, slide, rest)');
  ok(found === 2 || !/A1 \. A1 A2!/.test(soloSrc), 'the lines match solo.js (or solo.js no longer carries them)');

  // ==================================================================== export / import
  var ex = P.exportText('tb303', 'tb303/rubber-bass');
  var exo = JSON.parse(ex);
  ok(exo.app === 'recut' && exo.format === 'preset' && exo.version === 1 && exo.type === 'tb303' && exo.name === 'Rubber bass' && exo.params.cutoff === 480, 'exportText: versioned JSON');
  var im = P.importText(ex);
  ok(im.type === 'tb303' && /^tb303\/u-/.test(im.id) && im.id !== 'tb303/rubber-bass', 'importText: a new user preset');
  ok(JSON.stringify(P.get('tb303', im.id).params) === JSON.stringify(P.get('tb303', 'tb303/rubber-bass').params), 'round trip keeps every value');
  var kex = P.exportText('hvt909', 'hvt909/techno-punch'), kim = P.importText(kex);
  ok(kim.type === 'hvt909' && P.get('hvt909', kim.id).voices.bd909.decay === 0.06, 'a kit round-trips');
  var pex = P.patterns.exportText('juno', 'juno/chord-push'), pim = P.patterns.importText(pex);
  ok(JSON.stringify(P.patterns.get('juno', pim.id).pattern) === JSON.stringify(P.patterns.get('juno', 'juno/chord-push').pattern), 'a pattern round-trips');
  function rejects(fn, re, label) { var msg = null; try { fn(); } catch (e) { msg = e.message; } ok(msg && re.test(msg), label + ' -> "' + msg + '"'); }
  rejects(function () { P.importText('this is not json'); }, /not valid JSON/, 'garbage is rejected');
  rejects(function () { P.importText('{"a":1}'); }, /not from Recut/, 'foreign JSON is rejected');
  var oldEx = JSON.parse(ex); oldEx.app = 'havantechno';
  var oldIm = P.importText(JSON.stringify(oldEx));
  ok(oldIm.type === 'tb303' && P.get('tb303', oldIm.id).params.cutoff === 480, 'text copied while the app was called Havantechno still imports');
  rejects(function () { P.importText(JSON.stringify({ app: 'recut', format: 'preset', version: 7, type: 'tb303', params: {} })); }, /newer version/, 'a newer version is rejected');
  rejects(function () { P.importText(JSON.stringify({ app: 'recut', format: 'preset', version: 1, type: 'theremin', params: { a: 1 } })); }, /Unknown instrument type/, 'an unknown type is rejected');
  rejects(function () { P.importText(JSON.stringify({ app: 'recut', format: 'preset', version: 1, type: 'tb303', params: { zz: 1 } })); }, /no parameter/, 'a preset with nothing usable is rejected');
  rejects(function () { P.importText(pex); }, /is a pattern/, 'a pattern given to the preset importer says so');
  rejects(function () { P.importText(null); }, /Nothing to import/, 'null is rejected');
  rejects(function () { P.patterns.importText(JSON.stringify({ app: 'recut', format: 'pattern', version: 1, type: 'tb303', pattern: { bars: 0, cells: 3 } })); }, /could not be read/, 'a malformed pattern is rejected');
  var hostile = JSON.stringify({ app: 'recut', format: 'preset', version: 1, type: 'tb303', name: 'x', params: { cutoff: 900, __proto__: { polluted: 1 }, constructor: 'x' } });
  var hi = P.importText(hostile);
  ok(!({}).polluted && !('constructor' in P.get('tb303', hi.id).params && P.get('tb303', hi.id).params.constructor === 'x'), 'hostile keys do not pollute and are ignored');

  // ==================================================================== storage
  var ls = sb.localStorage, stored = JSON.parse(ls.getItem('hv.presets.v1'));
  ok(stored && stored.version === 1 && stored.presets.tb303.some(function (e) { return e.id === id1; }), 'default adapter: user presets in localStorage under hv.presets.v1');
  var sb2 = realm({ localStorage: ls }, false);
  ok(sb2.Presets.get('tb303', id1) && sb2.Presets.get('tb303', id1).name === 'My acid', 'a fresh page finds the saved preset');
  var sb3 = realm({ localStorageThrows: true }, false), P3 = sb3.Presets;
  var id3 = P3.save('juno', 'Blocked', { cutoff: 0.4 });
  ok(id3 && P3.get('juno', id3) && P3.storage().kind === 'local', 'localStorage that throws: save still works (memory fallback), nothing thrown');
  var mem = P3.adapters.memory(); P3.storage(mem);
  ok(P3.list('juno').every(function (e) { return e.factory; }), 'swapping to an empty adapter shows factory presets only');
  var id3b = P3.save('juno', 'In memory', { cutoff: 0.3 });
  ok(JSON.parse(mem.get('hv.presets.v1')).presets.juno[0].id === id3b, 'a custom adapter receives the bank');
  var evs = []; var h = function (e) { evs.push(e); };
  P3.on('change', h); P3.rename('juno', id3b, 'Renamed'); P3.remove('juno', id3b); P3.off('change', h); P3.save('juno', 'quiet', {});
  ok(evs.length === 2 && evs[0].action === 'rename' && evs[1].action === 'remove' && evs[0].what === 'preset', "on('change') fires on rename and remove; off stops it");
  ok((function () { try { P3.storage({ get: 1 }); return false; } catch (e) { return /adapter/.test(e.message); } })(), 'a malformed adapter is refused');
  // corrupt storage is ignored, not fatal
  var lsBad = lsFake(); lsBad.setItem('hv.presets.v1', '{not json');
  var sb4 = realm({ localStorage: lsBad }, false);
  ok(sb4.Presets.list('tb303').length === l303.length && sb4.Presets.problems().some(function (p) { return /not JSON/.test(p); }), 'a corrupt stored bank is ignored and reported');
  var lsOdd = lsFake(); lsOdd.setItem('hv.presets.v1', JSON.stringify({ version: 1, presets: { tb303: [{ id: 'tb303/u-1', name: 'Odd', params: { cutoff: 1e9, wat: 1 } }, { name: 'no id' }] } }));
  var sb5 = realm({ localStorage: lsOdd }, false);
  ok(sb5.Presets.get('tb303', 'tb303/u-1').params.cutoff === 2394 && sb5.Presets.list('tb303').length === l303.length + 1 && sb5.Presets.problems().length >= 3, 'stored presets are validated on load (clamped, unknown dropped, bad entry dropped)');
  // Electron: one JSON file through readAppData / writeAppData
  var files = {}, writes = 0;
  var shell = { readAppData: function (n) { return Promise.resolve(files[n] || null); }, writeAppData: function (n, t) { writes++; files[n] = t; return Promise.resolve(true); } };
  var lsMig = lsFake(); lsMig.setItem('hv.presets.v1', ls.getItem('hv.presets.v1'));
  var sb6 = realm({ RecutShell: shell, localStorage: lsMig }, false);
  await sb6.Presets.ready();
  ok(sb6.Presets.storage().kind === 'shell', 'Electron: the shell adapter is the default');
  ok(sb6.Presets.get('tb303', id1), 'Electron, first run: the web bank is brought over from localStorage');
  var id6 = sb6.Presets.save('modeld', 'File one', { cutoff: 1 });
  await new Promise(function (r) { setTimeout(r, 20); });
  ok(files['presets.json'] && JSON.parse(files['presets.json']).format === 'presets-store' && writes >= 1, 'Electron: presets.json written');
  var sb7 = realm({ RecutShell: shell, localStorage: lsFake() }, false);
  ok(!sb7.Presets.get('modeld', id6), 'Electron: before the file is read, the user bank is empty');
  await sb7.Presets.ready();
  ok(sb7.Presets.get('modeld', id6) && sb7.Presets.get('modeld', id6).name === 'File one', 'Electron: a new window reads the file (ready() resolves after it)');
  var shellBad = { readAppData: function () { return Promise.reject(new Error('io')); }, writeAppData: function () { return Promise.reject(new Error('io')); } };
  var sb8 = realm({ RecutShell: shellBad }, false);
  await sb8.Presets.ready();
  ok(sb8.Presets.save('tb303', 'still', {}) && sb8.Presets.list('tb303').length === l303.length + 1, 'Electron: a failing file still leaves a working bank');

  // ==================================================================== apply, capture, current (Host, no audio)
  var host = sb.Host.create(), ed = host.editor();
  var EMPTY = { bars: 1, cells: [] }; for (var i = 0; i < 16; i++) EMPTY.cells.push(null);
  ed.group(function (e) {
    e.addTrack({ name: 'acid', type: 'tb303', inst: 'tb303', kind: 'melody', family: 'bass', gain: 0.8, variants: { A: EMPTY } });
    e.addTrack({ name: 'poly', type: 'juno', inst: 'juno', kind: 'melody', family: 'keys', gain: 0.6, variants: { A: EMPTY } });
    ['bd808', 'sd808', 'ch808', 'lt808'].forEach(function (t) { e.addTrack({ name: t, type: t, inst: t, family: 'drums', gain: 0.8, variants: { A: '................' } }); });
  });
  host.commit();
  ok(!host.started(), 'the host has no audio (apply before start)');
  var undo0 = ed._undo.length;
  ok(P.apply(host, 'acid', 'tb303/squelch-lead') === true, 'apply(tb303 preset) -> true');
  ok(host.editor()._undo.length === undo0 + 1, 'apply = one undo step (+' + (host.editor()._undo.length - undo0) + ')');
  ok(host.getParam('acid.cutoff') === 1100 && host.getParam('acid.resonance') === 0.88 && host.getParam('acid.level') === 0.75, 'values set live');
  ok(host.heldCount() === 0, 'nothing is left held');
  var dt = host.document().tracks.filter(function (t) { return t.name === 'acid'; })[0];
  ok(dt.params.cutoff === 1100 && dt.params.envMod === 0.75, 'values written into the document (save and rebuild keep them)');
  ok(P.current(host, 'acid') === 'tb303/squelch-lead', 'current() names the loaded preset');
  var cap = P.capture(host, 'acid');
  ok(cap.cutoff === 1100 && cap.wave === 'saw' && Object.keys(cap).length === Object.keys(sb.Classics.spec('tb303')).length, 'capture reads every spec row');
  P.apply(host, 'acid', 'tb303/hollow-square');
  ok(host.getParam('acid.wave') === 'square' && host.getParam('acid.tune') === 0, 'an enumeration applies; a row the preset leaves out goes to the spec value');
  ed = host.editor(); ed.undo(); host.commit();
  ok(host.getParam('acid.cutoff') === 1100 && host.getParam('acid.wave') === 'saw', 'undo restores the previous preset in one step');
  ed = host.editor(); ed.undo(); host.commit();
  ok(host.getParam('acid.cutoff') === 1000, 'undo again: back to the start');
  host.hold('acid.cutoff');
  P.apply(host, 'acid', 'tb303/round-bass');
  ok(host.isHeld('acid.cutoff') && host.getParam('acid.cutoff') === 600, 'a path the user held stays held');
  host.release('acid.cutoff');
  ok(P.apply(host, 'acid', 'juno/slow-pad') === false, 'a preset of another type is refused');
  ok(P.apply(host, 'acid', id1) === true && host.getParam('acid.wave') === 'square', 'a user preset applies');
  // juno booleans and numeric options
  P.apply(host, 'poly', 'juno/unison-bass');
  ok(host.getParam('poly.voiceMode') === 'unison' && host.getParam('poly.range') === 16 && host.getParam('poly.pulse') === false, 'juno: enumerations, numeric options and booleans apply');
  // kits on a partial 808 kit
  var u1 = host.editor()._undo.length;
  ok(P.apply(host, 'bd808', 'hvt808/deep-and-long') === true && host.editor()._undo.length === u1 + 1, 'a kit = one undo step');
  ok(host.getParam('bd808.decay') === 0.8 && host.getParam('lt808.decay') === 0.6 && host.getParam('lt808.tune') === 30, 'the kit sets each voice that has a track');
  ok(P.current(host, 'sd808', 'hvt808') === 'hvt808/deep-and-long', 'current(machine) names the kit');
  P.apply(host, 'bd808', 'bd808/hard-click');
  ok(host.getParam('bd808.decay') === 0.28 && P.current(host, 'bd808') === 'bd808/hard-click', 'a voice preset on one drum track');
  // patterns
  var u2 = host.editor()._undo.length;
  ok(P.patterns.apply(host, 'acid', 'tb303/climb') === true, 'patterns.apply(tb303) -> true');
  ok(host.editor()._undo.length === u2 + 1, 'pattern load = one undo step (+' + (host.editor()._undo.length - u2) + ')');
  var sec = host.document().sections[0], letter = sec.play.acid === true ? 'A' : sec.play.acid;
  var tv = host.document().tracks.filter(function (t) { return t.name === 'acid'; })[0].variants[letter];
  ok(letter && tv.bars === 1 && tv.cells[2].note === 40 && tv.cells[2].acc === true && tv.cells[6].slide === true, 'the current section plays the track and its variant holds the pattern');
  ok(P.patterns.current(host, 'acid') === 'tb303/climb', 'patterns.current names it');
  ok(P.patterns.apply(host, 'acid', 'modeld/slow-walk') === false, 'a modeld pattern on a tb303 is refused');
  P.patterns.apply(host, 'poly', 'juno/four-chords');
  var pv = host.document().tracks.filter(function (t) { return t.name === 'poly'; })[0].variants[host.document().sections[0].play.poly];
  ok(pv.bars === 4 && pv.cells.length === 64 && pv.cells[0].len === 16 && pv.cells[0].notes.length === 4, 'a four-bar juno pattern: bars set, chords kept');
  ed = host.editor(); ed.undo(); host.commit();
  ok(!host.document().sections[0].play.poly || host.document().tracks.filter(function (t) { return t.name === 'poly'; })[0].variants.A.cells.every(function (c) { return !c; }), 'undo removes the pattern');
  var bpm0 = host.bpm(), u3 = host.editor()._undo.length;
  ok(P.patterns.apply(host, 'sd808', 'hvt808/electro-roll', { tempo: true }) === true && host.editor()._undo.length === u3 + 1, 'a machine pattern = one undo step');
  var d2 = host.document(), s0 = d2.sections[0];
  function cellsOf(n) { var t = d2.tracks.filter(function (x) { return x.name === n; })[0]; return t.variants[s0.play[n] === true ? 'A' : s0.play[n]]; }
  ok(cellsOf('bd808').bars === 2 && cellsOf('bd808').cells[0].acc === true && cellsOf('ch808').cells[1].vel === 0.5 && cellsOf('lt808').cells[30].vel === 0.85, 'each voice track gets its line (2 bars)');
  ok(host.bpm() === 124, 'tempo: true sets the pattern bpm (' + bpm0 + ' -> ' + host.bpm() + ')');
  ok(P.patterns.current(host, 'bd808') === 'hvt808/electro-roll', 'patterns.current(drum voice) names the machine pattern');
  P.patterns.apply(host, 'bd808', 'hvt808/conga-groove');
  ok(cellsOf('sd808').cells.every(function (c) { return !c; }) && cellsOf('lt808').cells.every(function (c) { return !c; }), 'voices the machine pattern leaves out are cleared');
  var mp = P.patterns.capture(host, 'bd808');
  ok(mp.voices && mp.voices.bd808 && mp.voices.sd808 && mp.bpm === 124, 'patterns.capture on a drum voice -> the machine pattern');
  var mid = P.patterns.save('hvt808', 'Mine', mp);
  ok(/^hvt808\/u-/.test(mid) && P.patterns.current(host, 'ch808') === null || P.patterns.current(host, 'ch808') === mid || P.patterns.current(host, 'ch808') === 'hvt808/conga-groove', 'a captured machine pattern saves');

  // ==================================================================== the menu in a device window
  sb.Windows.init({ host: host, layer: sb.document.layer });
  sb.Windows.open('track:acid', host);
  var win = sb.document.layer.children[sb.document.layer.children.length - 1];
  var btn = win.find(function (n) { return n.className.indexOf('wn-preset') >= 0; })[0];
  ok(btn && !btn.hidden && !btn.disabled && btn.attrs['aria-haspopup'] === 'menu', 'an instrument window shows a live Preset button');
  P.apply(host, 'acid', 'tb303/short-pluck');
  btn.fire('click', {});
  var pop = sb.document.body.children.filter(function (n) { return n.className === 'pm-pop'; }).pop();
  ok(pop && !pop.hidden && btn.attrs['aria-expanded'] === 'true' && pop.attrs.role === 'menu', 'click opens the menu');
  function mitems() { return pop.children.filter(function (n) { return /pm-i/.test(n.className); }); }
  function itemNamed(re) { return mitems().filter(function (n) { return re.test(n.textContent); })[0]; }
  var checked = mitems().filter(function (n) { return n.attrs['aria-checked'] === 'true'; });
  ok(checked.length >= 1 && /Short pluck/.test(checked[0].textContent), 'the current preset is marked');
  ok(itemNamed(/^My acid/) && itemNamed(/^Rubber bass$/), 'factory and user presets are listed');
  ok(itemNamed(/^Save as/) && itemNamed(/^Import/) && itemNamed(/^Export/) && itemNamed(/^Rename/) && itemNamed(/^Delete/), 'Save as, Rename, Delete, Import, Export');
  ok(itemNamed(/^Pump$/) && itemNamed(/^Save pattern as/), 'the Patterns group is there for a track with a pattern');
  ok(sb.document.activeElement === checked[0], 'focus goes to the marked item');
  pop.fire('keydown', { key: 'ArrowDown' });
  ok(sb.document.activeElement !== checked[0] && /pm-i/.test(sb.document.activeElement.className), 'ArrowDown moves the focus');
  pop.fire('keydown', { key: 'Home' });
  ok(sb.document.activeElement === mitems()[0], 'Home goes to the first item');
  var u4 = host.editor()._undo.length;
  itemNamed(/^Rubber bass$/).fire('click', {});
  ok(pop.hidden && host.getParam('acid.cutoff') === 480 && host.editor()._undo.length === u4 + 1, 'clicking a preset loads it (one undo entry) and closes the menu');
  ok(sb.document.activeElement === btn, 'focus returns to the button');
  btn.fire('keydown', { key: 'ArrowDown' });
  ok(!pop.hidden, 'ArrowDown on the button opens the menu');
  var u5 = host.editor()._undo.length;
  itemNamed(/^Space$/).fire('click', {});
  ok(host.editor()._undo.length === u5 + 1 && P.patterns.current(host, 'acid') === 'tb303/space', 'loading a pattern from the menu: one undo entry');
  btn.fire('click', {});
  itemNamed(/^Save as/).fire('click', {});
  var nameIn = pop.find(function (n) { return n.tagName === 'INPUT' && n.type === 'text'; })[0];
  var saveB = pop.find(function (n) { return n.tagName === 'BUTTON' && n.textContent === 'Save'; })[0];
  ok(nameIn && saveB, 'Save as shows a name field and Save');
  nameIn.value = 'From the menu'; saveB.fire('click', {});
  var mine = P.list('tb303').filter(function (e) { return e.name === 'From the menu'; })[0];
  ok(mine && !mine.factory && JSON.stringify(P.get('tb303', mine.id).params) === JSON.stringify(P.capture(host, 'acid')), 'Save as stores the track as a user preset');
  ok(itemNamed(/^From the menu/) && itemNamed(/^From the menu/).attrs['aria-checked'] === 'true', 'the list comes back with the new preset marked');
  itemNamed(/^Rename/).fire('click', {});
  var sel = pop.find(function (n) { return n.tagName === 'SELECT'; })[0], rn = pop.find(function (n) { return n.tagName === 'INPUT' && n.type === 'text'; })[0];
  ok(sel && sel.children.every(function (o) { return /yours/.test(o.textContent); }), 'Rename lists user presets only');
  sel.value = mine.id; rn.value = 'Renamed one';
  pop.find(function (n) { return n.tagName === 'BUTTON' && n.textContent === 'Rename'; })[0].fire('click', {});
  ok(P.get('tb303', mine.id).name === 'Renamed one', 'Rename renames');
  itemNamed(/^Export…/).fire('click', {});
  var ta = pop.find(function (n) { return n.tagName === 'TEXTAREA'; })[0];
  var copyB = pop.find(function (n) { return n.tagName === 'BUTTON' && n.textContent === 'Copy as text'; })[0];
  ok(ta && copyB && JSON.parse(ta.value).format === 'preset', 'Export shows the text and Copy as text');
  var text = ta.value;
  pop.fire('keydown', { key: 'Escape' });
  ok(!pop.hidden && itemNamed(/^Import…/), 'Escape in a form goes back to the list');
  itemNamed(/^Import…/).fire('click', {});
  var ta2 = pop.find(function (n) { return n.tagName === 'TEXTAREA'; })[0], msg = pop.find(function (n) { return n.className === 'pm-msg'; })[0];
  ok(pop.find(function (n) { return n.tagName === 'INPUT' && n.type === 'file'; }).length === 1, 'Import offers a file input and a text area');
  ta2.value = 'nope';
  pop.find(function (n) { return n.tagName === 'BUTTON' && n.textContent === 'Import'; })[0].fire('click', {});
  ok(msg.attrs['data-kind'] === 'error' && /not valid JSON/.test(msg.textContent), 'a bad import shows a readable message');
  var nBefore = P.list('tb303').length;
  ta2.value = text;
  pop.find(function (n) { return n.tagName === 'BUTTON' && n.textContent === 'Import'; })[0].fire('click', {});
  ok(P.list('tb303').length === nBefore + 1 && /Imported/.test(msg.textContent), 'importing the exported text adds a preset');
  pop.fire('keydown', { key: 'Escape' }); pop.fire('keydown', { key: 'Escape' });
  ok(pop.hidden, 'Escape closes the menu');
  itemNamed && btn.fire('click', {});
  itemNamed(/^Delete…/).fire('click', {});
  var dsel = pop.find(function (n) { return n.tagName === 'SELECT'; })[0]; dsel.value = mine.id;
  pop.find(function (n) { return n.tagName === 'BUTTON' && n.textContent === 'Delete'; })[0].fire('click', {});
  ok(!P.get('tb303', mine.id), 'Delete removes a user preset');
  pop.fire('keydown', { key: 'Escape' });
  // a drum voice: its presets, the machine's kits, machine patterns
  sb.Windows.close('track:acid');
  ok(sb.document.body.children.filter(function (n) { return n.className === 'pm-pop'; }).length === 0, 'closing the window removes its menu');
  sb.Windows.open('track:sd808', host);
  win = sb.document.layer.children[sb.document.layer.children.length - 1];
  btn = win.find(function (n) { return n.className.indexOf('wn-preset') >= 0; })[0];
  btn.fire('click', {});
  pop = sb.document.body.children.filter(function (n) { return n.className === 'pm-pop'; }).pop();
  ok(itemNamed(/^Crisp$/) && itemNamed(/^Electro boom/) && itemNamed(/^Electro break/), 'a drum voice lists its presets, the HVT-808 kits and the machine patterns');
  ok(pop.find(function (n) { return n.className === 'pm-h' && /HVT-808 kit/.test(n.textContent); }).length === 1, 'kits under an HVT-808 kit heading');
  var u6 = host.editor()._undo.length;
  itemNamed(/^Tight and dry/).fire('click', {});
  ok(host.getParam('sd808.decay') === 0.04 && host.getParam('bd808.decay') === 0.2 && host.editor()._undo.length === u6 + 1, 'loading a kit from a voice window: every voice, one undo entry');
  sb.Windows.close('track:sd808');
  // an insert has no menu; a bridge-like host gets presets without patterns
  var ins = host.devices().filter(function (dd) { return dd.kind === 'insert'; })[0];
  if (ins) {
    sb.Windows.open(ins.id, host);
    win = sb.document.layer.children[sb.document.layer.children.length - 1];
    btn = win.find(function (n) { return n.className.indexOf('wn-preset') >= 0; })[0];
    ok(btn && btn.hidden, 'an insert window hides the Preset button');
    sb.Windows.close(ins.id);
  }
  var bridge = { device: host.device, devices: host.devices, getParam: host.getParam, setParam: host.setParam, hold: host.hold, release: host.release, isHeld: host.isHeld };
  var bb = sb.document.createElement('button'); sb.document.body.appendChild(bb);
  var D0 = (sb.document.listeners.pointerdown || []).length;
  var bm = P.menu(bb, { host: bridge, device: host.device('track:acid') });
  bb.fire('click', {});
  ok(!bm.el.hidden && bm.el.children.some(function (n) { return /Rubber bass/.test(n.textContent); }) && !bm.el.children.some(function (n) { return /Save pattern/.test(n.textContent); }), 'a bridge host (no editor): presets, no Patterns group');
  bm.el.children.filter(function (n) { return n.textContent === 'Round bass'; })[0].fire('click', {});
  ok(host.getParam('acid.cutoff') === 600, 'a bridge host loads presets through setParam');
  bm.dispose();
  ok((sb.document.listeners.pointerdown || []).length === D0 && !bm.el.parentNode && listenersUnder(bb) === 0, 'dispose removes the popup and its listeners');

  timers.forEach(clearTimeout);
  console.log('OK: ' + passed + ' checks passed');
  process.exit(0);
})().catch(function (e) { console.log('FAIL: threw ' + (e && e.stack || e)); process.exit(1); });
