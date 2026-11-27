#!/usr/bin/env node
/* Check for the solo pages (app/solo/303.html, d.html, 106.html on the shared framework solo.js) in Node: a fake DOM, the real
 * engine, Host and panels.
 *   node tools/solo-check.js        prints "OK: N checks passed" and exits 0, else names the failing check and exits 1.
 * Each page: every script and stylesheet it names exists relative to app/solo/ and nothing comes from another host; the title and
 * no maker marks; Solo.boot builds a Host with the page's device track (its stored patterns as variants A..), the muted kick and
 * the bypassed drive where the page has them, one looping section; the real panel mounts (landscape at 1280 px) and renders in
 * portrait with every spec row; a pattern button switches the section; kick, drive, BPM, undo. The 303 keeps its first page's
 * behaviour. HVT-D: the sequencer's keyboard writes the selected step and moves on, accent, glide, ratchet (cell.rep, which the
 * sequencer plays as repeats), tie, rest, length 16/32, transpose, clear, one undo entry each. HVT-106: keys toggle chord notes
 * (cell.notes), COPY, and a chord step reaches the juno as one trigger with several notes (ev.notes).
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var APP = path.join(__dirname, '..', 'app'), SOLO = path.join(APP, 'solo');
var passed = 0;
function ok(c, m) { if (!c) { console.log('FAIL: ' + m); process.exit(1); } passed++; }
var MARKS = /Roland|TB-303|TR-?808|TR-?909|Moog|Minimoog|Behringer|Juno-?106|\bJuno\b|Poly ?D\b/;

// ---- fake DOM
var reg = null;
function N(tag) { this.tagName = String(tag).toUpperCase(); this.children = []; this.parentNode = null; this.style = {}; this.attrs = {}; this.className = ''; this._text = ''; this.listeners = {}; this.hidden = false; this.value = ''; this.disabled = false; var s = this; this.style.setProperty = function (k, v) { s.style[k] = v; }; }
N.prototype.appendChild = function (c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; };
N.prototype.insertBefore = function (c, r) { if (c.parentNode) c.parentNode.removeChild(c); var i = this.children.indexOf(r); c.parentNode = this; if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); return c; };
N.prototype.removeChild = function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; };
Object.defineProperty(N.prototype, 'firstChild', { get: function () { return this.children[0] || null; } });
Object.defineProperty(N.prototype, 'lastChild', { get: function () { return this.children[this.children.length - 1] || null; } });
Object.defineProperty(N.prototype, 'textContent', { get: function () { return this._text + this.children.map(function (c) { return c.textContent; }).join(''); }, set: function (v) { this.children = []; this._text = String(v); } });
Object.defineProperty(N.prototype, 'clientWidth', { get: function () { return this._cw || 900; } });
N.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = String(v); if (k === 'id') reg[String(v)] = this; };
N.prototype.getAttribute = function (k) { return k === 'class' ? this.className : (k in this.attrs ? this.attrs[k] : null); };
N.prototype.removeAttribute = function (k) { delete this.attrs[k]; };
N.prototype.addEventListener = function (t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); };
N.prototype.removeEventListener = function (t, f) { var l = this.listeners[t] || [], i = l.indexOf(f); if (i >= 0) l.splice(i, 1); };
N.prototype.getBoundingClientRect = function () { return { left: 0, top: 120, width: 900, height: 20 }; };
N.prototype.focus = function () {}; N.prototype.select = function () {};
N.prototype.fire = function (t, ev) { ev = ev || {}; ev.preventDefault = function () {}; ev.stopPropagation = function () {}; (this.listeners[t] || []).slice().forEach(function (f) { f(ev); }); };
N.prototype.walk = function (fn) { fn(this); this.children.forEach(function (c) { c.walk(fn); }); };
N.prototype.find = function (p) { var o = []; this.walk(function (n) { if (p(n)) o.push(n); }); return o; };

function boot(file, width, premade) {
  reg = {};
  var html = fs.readFileSync(path.join(SOLO, file), 'utf8'), refs = [];
  html.replace(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g, function (m, u) { refs.push(u); return m; });
  var body = new N('body');
  var fdoc = { createElement: function (t) { return new N(t); }, createElementNS: function (n, t) { return new N(t); }, getElementById: function (id) { return reg[id] || null; },
    activeElement: null, body: body, head: new N('head'), listeners: {},
    addEventListener: function (t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    querySelector: function (sel) { var c = sel.replace(/^\./, ''); return body.find(function (n) { return n.className.split(/\s+/).indexOf(c) >= 0; })[0] || null; } };
  if (premade) {                                   // the markup a page ships (303.html): the framework finds it by id
    var nav = new N('nav'); nav.className = 'so-bar'; body.appendChild(nav);
    premade.forEach(function (id) { var n = new N(id === 'so-bpm' || id === 'so-drive' ? 'input' : 'div'); n.setAttribute('id', id); (/^so-(play|patterns|bpm|drum|drive|slower|faster)$/.test(id) ? nav : body).appendChild(n); });
  }
  var sb = { console: console, Math: Math, JSON: JSON, Date: Date, Float32Array: Float32Array, Uint8Array: Uint8Array, Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout,
    requestAnimationFrame: function () { return 0; }, cancelAnimationFrame: function () {}, innerWidth: width || 1280, innerHeight: 800, scrollY: 0, addEventListener: function () {} };
  sb.window = sb; sb.document = fdoc; sb.globalThis = sb;
  vm.createContext(sb);
  refs.filter(function (u) { return /\.js$/.test(u); }).forEach(function (u) { vm.runInContext(fs.readFileSync(path.join(SOLO, u), 'utf8'), sb, { filename: u }); });
  return { html: html, refs: refs, sb: sb, body: body, reg: reg };
}
function files(file, page) {
  var P = boot.cache = boot.cache || {};
  var html = fs.readFileSync(path.join(SOLO, file), 'utf8'), refs = [];
  html.replace(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g, function (m, u) { refs.push(u); return m; });
  ok(refs.length >= 14, file + ': names its scripts and stylesheets (' + refs.length + ')');
  ok(refs.every(function (u) { return !/^(https?:)?\/\//.test(u) && u.charAt(0) !== '/'; }), file + ': every URL is relative (no CDN, no absolute path)');
  ok(refs.every(function (u) { return fs.existsSync(path.join(SOLO, u)); }), file + ': every file exists next to the page: ' + refs.filter(function (u) { return !fs.existsSync(path.join(SOLO, u)); }).join(', '));
  ok(['../ui/panels.js', '../engine/classics.js', '../engine/host.js', '../engine/worklets.js', 'solo.js', page.js].every(function (u) { return refs.indexOf(u) >= 0; }), file + ': the real engine, Host, panel and framework are loaded, not copies');
  var text = html + refs.filter(function (u) { return /^[^.].*\.js$/.test(u); }).map(function (u) { return fs.readFileSync(path.join(SOLO, u), 'utf8'); }).join('');
  ok(new RegExp('<title>' + page.title + '</title>').test(html) && !MARKS.test(text), file + ': title ' + page.title + ', no maker marks');
}
ok(fs.existsSync(path.join(APP, 'engine', 'worklets', 'classics-processor.js')), 'the worklet module ../engine/worklets/classics-processor.js exists');

// a panel's controls by aria label
function lab(root, re) { return root.find(function (n) { return re.test(n.attrs['aria-label'] || ''); }); }
function common(pg, page) {
  var A = pg.sb[page.global], host = A.host(), d = host.document();
  ok(A && typeof A.host === 'function' && pg.sb.Solo && typeof pg.sb.Solo.boot === 'function', page.title + ': Solo.boot exposes ' + page.global + '.host()');
  var dev = d.tracks.filter(function (t) { return t.name === page.device; })[0];
  ok(dev && dev.kind === 'melody' && dev.type === page.device, page.title + ': one ' + page.device + ' melody track');
  var vs = dev.variants, letters = 'ABCDEFGHIJ'.slice(0, page.patterns).split('');
  ok(Object.keys(vs).join() === letters.join(), page.title + ': ' + page.patterns + ' stored patterns as variants ' + letters.join(''));
  ok(d.sections.length === 1 && d.sections[0].name === 'loop' && d.sections[0].bars === page.bars, page.title + ': one looping section of ' + page.bars + ' bar(s)');
  ok(!!host.getParam('bd909.mute') && d.tracks[d.tracks.length - 1].type === 'bd909', page.title + ': the kick track starts muted');
  if (page.drive) ok(host.isBypassed('track:' + page.device + ':drive') === true, page.title + ': the drive saturator starts bypassed');
  var box = pg.reg['so-panel'];
  ok(box.find(function (n) { return n.className === 'pn-root'; }).length === 1 && A.panel().key === page.panel, page.title + ': the real ' + page.panel + ' panel is mounted');
  ok(box.find(function (n) { return n.tagName === 'SVG'; })[0].attrs.viewBox === page.land, page.title + ': landscape arrangement at 1280 px (' + page.land + ')');
  var pr = pg.sb.Panels.render(host.device('track:' + page.device), host, { layout: 'portrait', rec: true });
  ok(pr.el.children[0].attrs.viewBox === page.port, page.title + ': portrait arrangement ' + page.port);
  var have = {}; pr.el.walk(function (n) { if (n.attrs['data-param']) have[n.attrs['data-param']] = 1; });
  var miss = Object.keys(host.device('track:' + page.device).spec).filter(function (p) { return !have[p]; });
  ok(!miss.length, page.title + ': portrait carries every spec row (missing: ' + miss.join(', ') + ')');
  ok(lab(pr.el, /^Step \d+/).length === 16, page.title + ': portrait shows sixteen step keys');
  pr.dispose();
  var pats = pg.reg['so-patterns'].children;
  ok(pats.length === page.patterns, page.title + ': ' + page.patterns + ' pattern buttons');
  pats[2].fire('click');
  ok(host.document().sections[0].play[page.device] === 'C' && pats[2].attrs['aria-checked'] === 'true', page.title + ': pattern 3 makes the loop play variant C');
  pats[0].fire('click');
  pg.reg['so-drum'].fire('click');
  ok(!host.getParam('bd909.mute') && pg.reg['so-drum'].attrs['aria-pressed'] === 'true', page.title + ': the kick button unmutes the bd909');
  if (page.drive) {
    pg.reg['so-drive'].value = '0.6'; pg.reg['so-drive'].fire('input');
    ok(host.isBypassed('track:' + page.device + ':drive') === false && Math.abs(host.getParam(page.device + '.drive.drive') - 0.6) < 1e-9, page.title + ': drive above 0 enables the saturator');
    pg.reg['so-drive'].value = '0'; pg.reg['so-drive'].fire('input');
    ok(host.isBypassed('track:' + page.device + ':drive') === true, page.title + ': drive at 0 bypasses it');
  } else ok(!pg.reg['so-drive'], page.title + ': no drive control');
  pg.reg['so-bpm'].value = '138'; pg.reg['so-bpm'].fire('change');
  ok(host.bpm() === 138, page.title + ': the BPM field sets the tempo');
  ok(pg.reg['so-undo'] && pg.reg['so-redo'], page.title + ': undo and redo buttons');
  ok(pg.sb.Presets === undefined ? A.presets && !A.presets.patch && !A.presets.pattern && !pg.body.find(function (n) { return n.className === 'so-group so-menu'; }).length
    : A.presets.patch && A.presets.pattern && pg.body.find(function (n) { return n.className === 'so-group so-menu'; }).length === 2,
    page.title + ': the patch and pattern menus follow the Presets global (' + (pg.sb.Presets ? 'present' : 'absent: hidden') + ')');
  return { A: A, host: host, panel: A.panel() };
}
function cellsOf(host, name) { var d = host.document(), L = d.sections[0].play[name], t = d.tracks.filter(function (x) { return x.name === name; })[0]; return t.variants[L].cells; }
function undoN(host) { return host.editor()._undo.length; }

// ================================================================= HVT-303 (its own markup)
var P303 = { title: 'HVT-303', global: 'HVT303', device: 'tb303', panel: 'hvt303', patterns: 6, bars: 1, drive: true, js: '303.js', land: '0 0 1200 640', port: '0 0 560 1188' };
files('303.html', P303);
var g3 = boot('303.html', 1280, ['so-status', 'so-play', 'so-patterns', 'so-bpm', 'so-drum', 'so-drive', 'so-panel', 'so-gate', 'so-gate-note', 'so-slower', 'so-faster', 'so-start']);
var r3 = common(g3, P303), vs3 = r3.host.document().tracks[0].variants;
ok(Object.keys(vs3).every(function (k) { return vs3[k].cells.length === 16 && vs3[k].cells.some(function (c) { return c && c.acc; }) && vs3[k].cells.some(function (c) { return c && c.slide; }); }), 'HVT-303: six 16-step patterns, each with accents and slides');
ok(Object.keys(vs3).every(function (k) { return vs3[k].cells.every(function (c) { return c === null || (c.note >= 24 && c.note <= 60); }); }), 'HVT-303: notes in the bass range (C1..C4)');
var u3 = undoN(r3.host);
lab(r3.panel.el, /^Step 1:/)[0].fire('click', { shiftKey: true });
ok(undoN(r3.host) === u3 + 1, 'HVT-303: a panel step edit is one undo entry');
g3.reg['so-undo'].fire('click');
ok(undoN(r3.host) === u3, 'HVT-303: the Undo button takes it back');

// ================================================================= HVT-D (chrome built by the framework)
var PD = { title: 'HVT-D', global: 'HVTD', device: 'modeld', panel: 'hvtd', patterns: 6, bars: 2, drive: true, js: 'd.js', land: '0 0 1400 908', port: '0 0 560 2082' };
files('d.html', PD);
var gD = boot('d.html', 1280);
ok(gD.reg['so-panel'] && gD.reg['so-start'] && gD.reg['so-status'] && /HVT-D/.test(gD.body.textContent), 'HVT-D: the framework builds the header, bar, panel box and start gate');
var rD = common(gD, PD), hD = rD.host, pD = rD.panel;
var vD = hD.document().tracks[0].variants;
ok(Object.keys(vD).some(function (k) { return vD[k].bars === 2; }) && Object.keys(vD).some(function (k) { return vD[k].cells.some(function (c) { return c && c.rep > 1; }); }) &&
   Object.keys(vD).some(function (k) { return vD[k].cells.some(function (c) { return c && c.len > 1; }); }), 'HVT-D: stored patterns use 32 steps, ratchets and ties');
ok(Object.keys(vD).every(function (k) { return vD[k].cells.every(function (c) { return !c || !c.acc || c.vel === 1; }); }), 'HVT-D: accented steps carry vel 1 (the modeld reads velocity, not the accent flag)');
pD.update();
var kD = function (re) { return lab(pD.el, re)[0]; };
var sk = lab(pD.el, /^Step \d+/);
ok(sk.length === 16 && /Step 1: C2/.test(sk[0].attrs['aria-label']), 'HVT-D: sixteen step keys on the panel, step 1 reads C2 (' + sk[0].attrs['aria-label'] + ')');
sk[3].fire('click', {}); pD.update();
var u = undoN(hD);
ok(/selected/.test(sk[3].attrs['aria-label']) && u === undoN(hD), 'HVT-D: a step key selects (no edit)');
var keyE3 = pD.el.find(function (n) { return n.attrs['data-midi'] === '52'; })[0];
keyE3.fire('pointerdown', {}); keyE3.fire('pointerup', {}); pD.update();
ok(cellsOf(hD, 'modeld')[3].note === 52 && undoN(hD) === u + 1 && /selected/.test(sk[4].attrs['aria-label']), 'HVT-D: with REC the keyboard writes E3 into step 4 in one undo entry and selects step 5');
sk[3].fire('click', {});
kD(/^Accent on the selected/).fire('click', {});
ok(cellsOf(hD, 'modeld')[3].acc === true && cellsOf(hD, 'modeld')[3].vel === 1 && undoN(hD) === u + 2, 'HVT-D: ACCENT sets acc and vel 1, one undo entry');
kD(/^Glide from/).fire('click', {});
ok(cellsOf(hD, 'modeld')[3].slide === true && undoN(hD) === u + 3, 'HVT-D: GLIDE sets the cell\'s slide');
kD(/^Ratchet/).fire('click', {}); kD(/^Ratchet/).fire('click', {});
ok(cellsOf(hD, 'modeld')[3].rep === 3 && undoN(hD) === u + 5, 'HVT-D: RATCHET twice gives rep 3, one undo entry each');
kD(/^Ratchet/).fire('click', {}); kD(/^Ratchet/).fire('click', {});
ok(cellsOf(hD, 'modeld')[3].rep == null, 'HVT-D: RATCHET cycles 2, 3, 4, off');
pD.update();
ok(/Step 4: E3, accent, glide/.test(sk[3].attrs['aria-label']), 'HVT-D: the key reads note, accent, glide (' + sk[3].attrs['aria-label'] + ')');
// ratchet is played: rep 3 on a step -> three triggers inside it
kD(/^Ratchet/).fire('click', {}); kD(/^Ratchet/).fire('click', {});
var seqD = hD.engine(), trigs = [];
seqD.tracks.modeld.inst.trigger = function (t, ev) { trigs.push([t, ev]); };
seqD.scheduleStep(3, 0, true);
ok(trigs.length === 3 && trigs[0][1].midi === 52 && trigs[1][0] > trigs[0][0], 'HVT-D: the sequencer plays the ratchet step as three triggers of E3 (' + trigs.length + ')');
u = undoN(hD);
sk[4].fire('click', {}); kD(/^Tie the selected step/).fire('click', {});
ok(cellsOf(hD, 'modeld')[3].len === 2 && cellsOf(hD, 'modeld')[4] === null && undoN(hD) === u + 1, 'HVT-D: TIE on step 5 lengthens step 4 to 2 steps, one undo entry');
var len0 = cellsOf(hD, 'modeld').length;
kD(/^Pattern length/).fire('click', {});
ok(cellsOf(hD, 'modeld').length === (len0 === 16 ? 32 : 16) && undoN(hD) === u + 2, 'HVT-D: LENGTH switches the variant between 16 and 32 steps (' + len0 + ' -> ' + cellsOf(hD, 'modeld').length + ')');
if (cellsOf(hD, 'modeld').length === 16) kD(/^Pattern length/).fire('click', {});
pD.update();
kD(/^Show steps/).fire('click', {}); pD.update();
ok(/^Step 17/.test(sk[0].attrs['aria-label']), 'HVT-D: PAGE shows steps 17 to 32');
kD(/^Show steps/).fire('click', {}); pD.update();
var before = cellsOf(hD, 'modeld').map(function (c) { return c && c.note; });
kD(/semitone up/).fire('click', {});
ok(cellsOf(hD, 'modeld').every(function (c, i) { return !c || c.note === before[i] + 1; }), 'HVT-D: transpose +1 moves every note');
sk[0].fire('click', {}); kD(/^Make the selected step a rest/).fire('click', {});
ok(cellsOf(hD, 'modeld')[0] === null, 'HVT-D: REST empties the selected step');
u = undoN(hD);
kD(/^Clear the whole pattern/).fire('click', {});
ok(cellsOf(hD, 'modeld').every(function (c) { return c === null; }) && undoN(hD) === u + 1, 'HVT-D: CLEAR empties the pattern in one undo entry');
gD.reg['so-undo'].fire('click');
ok(cellsOf(hD, 'modeld').some(function (c) { return c; }), 'HVT-D: Undo restores it');
ok(pD.el.find(function (n) { return n.attrs['data-midi'] != null; }).length === 44, 'HVT-D landscape: the 44-key keyboard');

// ---- HVT-D: W1's Presets on the page (patch and pattern menus, save, load, copy as text, paste text)
if (gD.sb.Presets) {
  var menus = gD.body.find(function (n) { return n.className === 'so-group so-menu'; });
  var patMenu = menus.filter(function (m) { return m.attrs['aria-label'] === 'Pattern bank'; })[0], patchMenu = menus.filter(function (m) { return m.attrs['aria-label'] === 'Patch presets'; })[0];
  var btnIn = function (root, t) { return root.find(function (n) { return n.tagName === 'BUTTON' && n.textContent === t; })[0]; };
  var dlg = function () { return gD.body.find(function (n) { return n.className === 'so-dlg-back'; }).pop(); };
  ok(patMenu && patchMenu && patMenu.find(function (n) { return n.tagName === 'SELECT'; }).length === 1, 'HVT-D: patch and pattern menus with a select each');
  var factoryPats = gD.sb.Presets.patterns.list('modeld').length;
  var cellsSaved = JSON.stringify(cellsOf(hD, 'modeld'));
  btnIn(patMenu, 'Save').fire('click');
  var dl = dlg(); dl.find(function (n) { return n.tagName === 'INPUT'; })[0].value = 'Check line';
  btnIn(dl, 'Save').fire('click');
  var mine = gD.sb.Presets.patterns.list('modeld').filter(function (x) { return x.name === 'Check line'; })[0];
  ok(mine && gD.sb.Presets.patterns.list('modeld').length === factoryPats + 1 && !dl.parentNode, 'HVT-D: Save stores the pattern under its name and closes the dialog');
  kD(/^Clear the whole pattern/).fire('click', {});
  var selP = patMenu.find(function (n) { return n.tagName === 'SELECT'; })[0];
  selP.value = mine.id; selP.fire('change');
  ok(JSON.stringify(cellsOf(hD, 'modeld')) === cellsSaved, 'HVT-D: choosing the stored pattern loads it back (one undo entry)');
  btnIn(patMenu, 'Copy as text').fire('click');
  var dl2 = dlg(), txt = dl2.find(function (n) { return n.tagName === 'TEXTAREA'; })[0].value;
  ok(/"format":"pattern"/.test(txt) && /Downloads are blocked/.test(dl2.textContent), 'HVT-D: Copy as text shows the pattern as JSON text and says why (' + txt.length + ' chars)');
  btnIn(dl2, 'Close').fire('click');
  kD(/^Clear the whole pattern/).fire('click', {});
  btnIn(patMenu, 'Paste text').fire('click');
  var dl3 = dlg(); dl3.find(function (n) { return n.tagName === 'TEXTAREA'; })[0].value = txt;
  btnIn(dl3, 'Load').fire('click');
  ok(JSON.stringify(cellsOf(hD, 'modeld')) === cellsSaved && !dl3.parentNode, 'HVT-D: Paste text imports the pattern and loads it');
  btnIn(patMenu, 'Paste text').fire('click');
  var dl4 = dlg(); dl4.find(function (n) { return n.tagName === 'TEXTAREA'; })[0].value = 'not a pattern';
  btnIn(dl4, 'Load').fire('click');
  ok(dl4.parentNode && /Not understood/.test(dl4.textContent), 'HVT-D: Paste text refuses text it does not understand, and says so');
  btnIn(dl4, 'Close').fire('click');
  var cut0 = hD.getParam('modeld.cutoff');
  btnIn(patchMenu, 'Save').fire('click');
  var dl5 = dlg(); dl5.find(function (n) { return n.tagName === 'INPUT'; })[0].value = 'Check patch'; btnIn(dl5, 'Save').fire('click');
  var myPatch = gD.sb.Presets.list('modeld').filter(function (x) { return x.name === 'Check patch'; })[0];
  hD.setParam('modeld.cutoff', cut0 > 0 ? cut0 * 0.5 : 1);
  var selQ = patchMenu.find(function (n) { return n.tagName === 'SELECT'; })[0];
  selQ.value = myPatch.id; selQ.fire('change');
  ok(myPatch && Math.abs(hD.getParam('modeld.cutoff') - cut0) < 1e-9, 'HVT-D: a saved patch applies back through the Host (cutoff ' + cut0 + ')');
}

// ================================================================= HVT-106
var PJ = { title: 'HVT-106', global: 'HVT106', device: 'juno', panel: 'hvt106', patterns: 5, bars: 2, drive: false, js: '106.js', land: '0 0 1600 800', port: '0 0 560 1824' };
files('106.html', PJ);
var gJ = boot('106.html', 1280);
var rJ = common(gJ, PJ), hJ = rJ.host, pJ = rJ.panel;
var vJ = hJ.document().tracks[0].variants;
ok(Object.keys(vJ).every(function (k) { return vJ[k].cells.some(function (c) { return c && c.notes && c.notes.length >= 3 && c.notes.length <= 6 && c.note === c.notes[0]; }); }), 'HVT-106: every stored pattern holds chords (3 to 6 notes, note = the lowest)');
pJ.update();
var skJ = lab(pJ.el, /^Step \d+/), kJ = function (re) { return lab(pJ.el, re)[0]; };
ok(skJ.length === 16 && /Step 3: Cm7/.test(skJ[2].attrs['aria-label']), 'HVT-106: step keys name the chord (' + skJ[2].attrs['aria-label'] + ')');
skJ[0].fire('click', {});
var uj = undoN(hJ);
[57, 60, 64].forEach(function (m) { var k = pJ.el.find(function (n) { return n.attrs['data-midi'] === String(m); })[0]; k.fire('pointerdown', {}); k.fire('pointerup', {}); });
var c0 = cellsOf(hJ, 'juno')[0];
ok(c0 && c0.notes && c0.notes.join() === '57,60,64' && c0.note === 57 && undoN(hJ) === uj + 3, 'HVT-106: three key taps build A minor on step 1, one undo entry each');
pJ.update();
ok(/Step 1: Am \(A3 C4 E4\)/.test(skJ[0].attrs['aria-label']), 'HVT-106: the key reads Am (' + skJ[0].attrs['aria-label'] + ')');
var k60 = pJ.el.find(function (n) { return n.attrs['data-midi'] === '60'; })[0]; k60.fire('pointerdown', {}); k60.fire('pointerup', {});
ok(cellsOf(hJ, 'juno')[0].notes.join() === '57,64', 'HVT-106: a second tap removes a note from the chord');
k60.fire('pointerdown', {}); k60.fire('pointerup', {});
kJ(/^Copy the selected chord/).fire('click', {});
ok(cellsOf(hJ, 'juno')[1] && cellsOf(hJ, 'juno')[1].notes.join() === '57,60,64' && undoN(hJ) === uj + 6, 'HVT-106: COPY puts the chord on step 2 in one undo entry');
pJ.update();
ok(/selected/.test(skJ[1].attrs['aria-label']), 'HVT-106: COPY selects the next step');
var c2 = pJ.el.find(function (n) { return n.attrs['data-midi'] === '48'; })[0]; c2.fire('pointerdown', { shiftKey: true }); c2.fire('pointerup', {});
ok(cellsOf(hJ, 'juno')[1].notes.join() === '48,52,55,57,60,64', 'HVT-106: Shift on a key adds a major triad (six notes)');
var c7 = pJ.el.find(function (n) { return n.attrs['data-midi'] === '70'; })[0]; c7.fire('pointerdown', {}); c7.fire('pointerup', {});
ok(cellsOf(hJ, 'juno')[1].notes.length === 6, 'HVT-106: a step holds at most six notes');
kJ(/^Tie the selected step/).fire('click', {});
ok(cellsOf(hJ, 'juno')[0].len === 2 && cellsOf(hJ, 'juno')[1] === null, 'HVT-106: TIE on step 2 holds the chord of step 1 over it');
kJ(/semitone up/).fire('click', {});
ok(cellsOf(hJ, 'juno')[0].notes.join() === '58,61,65' && cellsOf(hJ, 'juno')[0].note === 58, 'HVT-106: transpose moves every chord note');
// the chord reaches the instrument as one trigger with several notes
var seqJ = hJ.engine(), tj = [];
seqJ.tracks.juno.inst.trigger = function (t, ev) { tj.push(ev); };
seqJ.scheduleStep(0, 0, true);
ok(tj.length === 1 && tj[0].notes && tj[0].notes.join() === '58,61,65' && tj[0].dur > seqJ.stepSec() * 1.5, 'HVT-106: the sequencer triggers the juno once with ev.notes = the chord, held over the tie');
ok(pJ.el.find(function (n) { return n.attrs['data-midi'] != null; }).length === 49, 'HVT-106 landscape: the 49-key keyboard');

// ================================================================= HVT-808 and HVT-909 (Showroom Crew W3: 808.html, 909.html, drums-solo.js)
// The whole kit as tracks; the song is the pattern bank (variants A..P, sections A and B); the real machine panel.
[['808', ['bd', 'sd', 'lt', 'mt', 'ht', 'lc', 'mc', 'hc', 'rs', 'cl', 'cp', 'ma', 'cb', 'cy', 'oh', 'ch']], ['909', ['bd', 'sd', 'lt', 'mt', 'ht', 'rs', 'cp', 'ch', 'oh', 'cr', 'rd']]].forEach(function (mk) {
  var m = mk[0], kit = mk[1].map(function (v) { return v + m; }), T = 'HVT-' + m, file = m + '.html';
  var html = fs.readFileSync(path.join(SOLO, file), 'utf8'), refs = [];
  html.replace(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g, function (x, u) { refs.push(u); return x; });
  ok(refs.every(function (u) { return !/^(https?:)?\/\//.test(u) && u.charAt(0) !== '/' && fs.existsSync(path.join(SOLO, u)); }), T + ': every file the page names is relative and exists (' + refs.join(' ') + ')');
  ok(['../engine/drums.js', '../engine/host.js', '../ui/panels.js', 'solo.js', 'drums-solo.js'].every(function (u) { return refs.indexOf(u) >= 0; }) && new RegExp('data-machine="' + m + '"').test(html), T + ': the real engine, Host, panel and framework; body data-machine=' + m);
  ok(new RegExp('<title>' + T + '</title>').test(html) && !MARKS.test(html + fs.readFileSync(path.join(SOLO, 'drums-solo.js'), 'utf8')), T + ': title ' + T + ', no maker marks');
  var ga = N.prototype.getAttribute;
  N.prototype.getAttribute = function (k) { return k === 'data-machine' && this.tagName === 'BODY' ? m : ga.call(this, k); };
  var g = boot(file, 1280);
  N.prototype.getAttribute = ga;
  var A = g.sb['HVT' + m], host = A.host(), d = host.document();
  ok(d.tracks.map(function (t) { return t.name; }).join() === kit.join() && d.tracks.every(function (t) { return t.type === t.name && t.kind === 'drum'; }), T + ': the whole kit as tracks (' + kit.length + ')');
  ok(d.sections.length === 2 && d.sections[0].name === 'A' && d.sections[1].name === 'B' && kit.every(function (t) { return d.sections[0].play[t] === 'A' && d.sections[1].play[t] === 'B'; }), T + ': sections A and B play pattern 1\'s A and B on every voice');
  ok(d.tracks.every(function (t) { return Object.keys(t.variants).join('') === 'ABCDEFGHIJKL'; }), T + ': six stored grooves as variants A..L (slot k = 2k-1, 2k)');
  ok(A.grooves.length === 6 && A.grooves.every(function (gr, i) {
    var a = d.tracks.map(function (t) { return JSON.stringify(t.variants['ABCDEFGHIJKL'.charAt(i * 2)]); }).join(), b = d.tracks.map(function (t) { return JSON.stringify(t.variants['ABCDEFGHIJKL'.charAt(i * 2 + 1)]); }).join();
    return a !== b && d.tracks.some(function (t) { return t.variants['ABCDEFGHIJKL'.charAt(i * 2)].cells.some(Boolean); });
  }), T + ': every groove has hits, and its A and B differ');
  var box = g.reg['so-panel'], pn = A.panel();
  ok(pn && pn.key === 'hvt' + m && box.find(function (n) { return n.tagName === 'SVG'; })[0].attrs.viewBox === (m === '808' ? '0 0 1200 760' : '0 0 1200 720'), T + ': the real hvt' + m + ' panel, landscape at 1280 px');
  var M = A.machine();
  ok(M && M.bank() && M.slot() === 0, T + ': the panel\'s machine sees the bank, pattern 1');
  ok(!g.reg['so-patterns'] || !g.reg['so-patterns'].parentNode, T + ': the bar\'s pattern buttons are removed (the slots are on the panel)');
  ok(!!g.sb.Presets === !!g.reg['so-presets'], T + ': the Kits & patterns button follows the Presets global (' + (g.sb.Presets ? 'present' : 'absent') + ')');
  var u0 = host.editor()._undo.length, keys = lab(pn.el, /^Step \d+/);
  M.setMode('A'); M.select(kit[2]); pn.update();
  keys[7].fire('click', {});
  var lt = host.document().tracks[2].variants.A.cells;
  ok(lt[7] && host.editor()._undo.length === u0 + 1, T + ': a step key on the page adds a ' + kit[2] + ' hit to pattern 1 A, one undo entry');
  g.reg['so-undo'].fire('click');
  ok(!host.document().tracks[2].variants.A.cells[7], T + ': the bar\'s Undo takes it back');
  var pp = g.sb.Panels.render(host.device('track:' + kit[0]), host, { layout: 'portrait' });
  ok(pp.el.children[0].attrs.viewBox.split(' ')[2] === '560' && lab(pp.el, /^Step \d+/).length === 16 && lab(pp.el, /^Pattern \d$/).length === 8, T + ': portrait for phones: 560 wide, sixteen keys, eight slots');
  pp.dispose();
});

console.log('OK: ' + passed + ' checks passed');
process.exit(0);
