#!/usr/bin/env node
/* Check for the HVT-303 solo page (app/solo/303.html, solo.js) in Node: a fake DOM, the real engine, Host and panel.
 *   node tools/solo-check.js        prints "OK: N checks passed" and exits 0, else names the failing check and exits 1.
 * Covers: every script the page names exists (relative to app/solo/), the worklet module is where worklets.js resolves it,
 * nothing comes from another host; solo.js builds a Host with one tb303 (six 16-step patterns, a bypassed 'drive'
 * saturator) and a muted bd909; the HVT-303 panel renders in both arrangements; a pattern button switches the section;
 * the kick toggle unmutes; the drive slider bypasses at 0 and writes tb303.drive.drive above 0. */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var APP = path.join(__dirname, '..', 'app'), SOLO = path.join(APP, 'solo');
var passed = 0;
function ok(c, m) { if (!c) { console.log('FAIL: ' + m); process.exit(1); } passed++; }

// ---- the page's files
var html = fs.readFileSync(path.join(SOLO, '303.html'), 'utf8');
var refs = [];
html.replace(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g, function (m, u) { refs.push(u); return m; });
ok(refs.length >= 14, 'the page names its scripts and stylesheets (' + refs.length + ')');
ok(refs.every(function (u) { return !/^(https?:)?\/\//.test(u) && u.charAt(0) !== '/'; }), 'every URL is relative (no CDN, no absolute path)');
ok(refs.every(function (u) { return fs.existsSync(path.join(SOLO, u)); }), 'every file exists next to the page: ' + refs.filter(function (u) { return !fs.existsSync(path.join(SOLO, u)); }).join(', '));
ok(fs.existsSync(path.join(APP, 'engine', 'worklets', 'classics-processor.js')), 'the worklet module ../engine/worklets/classics-processor.js exists');
ok(/<title>HVT-303<\/title>/.test(html) && !/Roland|TB-303/i.test(html + fs.readFileSync(path.join(SOLO, 'solo.js'), 'utf8')), 'title HVT-303, no maker marks');
ok(refs.indexOf('../ui/panels.js') >= 0 && refs.indexOf('../engine/classics.js') >= 0 && refs.indexOf('../engine/host.js') >= 0, 'the real engine, Host and panel are loaded, not copies');

// ---- fake DOM
function N(tag) { this.tagName = String(tag).toUpperCase(); this.children = []; this.parentNode = null; this.style = {}; this.attrs = {}; this.className = ''; this._text = ''; this.listeners = {}; this.hidden = false; this.value = ''; var s = this; this.style.setProperty = function (k, v) { s.style[k] = v; }; }
N.prototype.appendChild = function (c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; };
N.prototype.insertBefore = function (c, r) { if (c.parentNode) c.parentNode.removeChild(c); var i = this.children.indexOf(r); c.parentNode = this; if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); return c; };
N.prototype.removeChild = function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; };
Object.defineProperty(N.prototype, 'firstChild', { get: function () { return this.children[0] || null; } });
Object.defineProperty(N.prototype, 'lastChild', { get: function () { return this.children[this.children.length - 1] || null; } });
Object.defineProperty(N.prototype, 'textContent', { get: function () { return this._text + this.children.map(function (c) { return c.textContent; }).join(''); }, set: function (v) { this.children = []; this._text = String(v); } });
Object.defineProperty(N.prototype, 'clientWidth', { get: function () { return this._cw || 900; } });
N.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = String(v); };
N.prototype.getAttribute = function (k) { return k === 'class' ? this.className : (k in this.attrs ? this.attrs[k] : null); };
N.prototype.addEventListener = function (t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); };
N.prototype.removeEventListener = function (t, f) { var l = this.listeners[t] || [], i = l.indexOf(f); if (i >= 0) l.splice(i, 1); };
N.prototype.getBoundingClientRect = function () { return { left: 0, top: 120, width: 900, height: 20 }; };
N.prototype.focus = function () {};
N.prototype.fire = function (t, ev) { ev = ev || {}; ev.preventDefault = function () {}; ev.stopPropagation = function () {}; (this.listeners[t] || []).slice().forEach(function (f) { f(ev); }); };
N.prototype.walk = function (fn) { fn(this); this.children.forEach(function (c) { c.walk(fn); }); };
N.prototype.find = function (p) { var o = []; this.walk(function (n) { if (p(n)) o.push(n); }); return o; };
var ids = {};
['so-status', 'so-play', 'so-patterns', 'so-bpm', 'so-drum', 'so-drive', 'so-panel', 'so-gate', 'so-gate-note', 'so-slower', 'so-faster', 'so-start'].forEach(function (id) { ids[id] = new N(id === 'so-bpm' || id === 'so-drive' ? 'input' : 'div'); });
var fdoc = { createElement: function (t) { return new N(t); }, createElementNS: function (n, t) { return new N(t); }, getElementById: function (id) { return ids[id] || null; }, activeElement: null, body: new N('body'), head: new N('head') };
var sb = { console: console, Math: Math, JSON: JSON, Date: Date, Float32Array: Float32Array, Uint8Array: Uint8Array, Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout,
  requestAnimationFrame: function () { return 0; }, cancelAnimationFrame: function () {}, innerWidth: 1280, innerHeight: 800, scrollY: 0, addEventListener: function () {} };
sb.window = sb; sb.document = fdoc; sb.globalThis = sb;
vm.createContext(sb);
refs.filter(function (u) { return /\.js$/.test(u); }).forEach(function (u) { vm.runInContext(fs.readFileSync(path.join(SOLO, u), 'utf8'), sb, { filename: u }); });

var H = sb.HVT303;
ok(H && typeof H.host === 'function', 'solo.js exposes HVT303.host()');
var host = H.host(), d = host.document();
ok(d.tracks.length === 2 && d.tracks[0].type === 'tb303' && d.tracks[0].kind === 'melody' && d.tracks[1].type === 'bd909', 'one tb303 melody track and one bd909');
var vs = d.tracks[0].variants;
ok(Object.keys(vs).join() === 'A,B,C,D,E,F' && Object.keys(vs).every(function (k) { return vs[k].cells.length === 16; }), 'six 16-step patterns A..F');
ok(Object.keys(vs).every(function (k) { return vs[k].cells.some(function (c) { return c && c.acc; }) && vs[k].cells.some(function (c) { return c && c.slide; }); }), 'every pattern has accents and slides');
ok(Object.keys(vs).filter(function (k) { return vs[k].cells.some(function (c) { return c === null; }); }).length >= 5, 'all but the running line have rests');
ok(Object.keys(vs).every(function (k) { return vs[k].cells.every(function (c) { return c === null || (c.note >= 24 && c.note <= 60); }); }), 'notes in the bass range (C1..C4)');
ok(d.sections.length === 1 && d.sections[0].name === 'loop' && d.sections[0].bars === 1, 'one looping one-bar section');
ok(!!host.getParam('bd909.mute'), 'the kick starts muted');
ok(host.isBypassed('track:tb303:drive') === true, 'the drive saturator starts bypassed');
var panelBox = ids['so-panel'];
ok(panelBox.find(function (n) { return n.className === 'pn-root'; }).length === 1 && H.panel().key === 'hvt303', 'the real HVT-303 panel is mounted (landscape at 1280 px)');
ok(panelBox.find(function (n) { return n.tagName === 'SVG'; })[0].attrs.viewBox === '0 0 1200 640', 'landscape arrangement');
var pr = sb.Panels.render(host.device('track:tb303'), host, { layout: 'portrait' });
ok(pr.el.children[0].attrs.viewBox === '0 0 560 1090' && pr.el.find(function (n) { return /^Step \d+/.test(n.attrs['aria-label'] || ''); }).length === 16, 'portrait arrangement: 560 x 1090, sixteen steps');
var have = {}; pr.el.walk(function (n) { if (n.attrs['data-param']) have[n.attrs['data-param']] = 1; });
ok(Object.keys(host.device('track:tb303').spec).every(function (p) { return have[p]; }), 'portrait arrangement carries every tb303 spec row');
pr.dispose();
var pats = ids['so-patterns'].children;
ok(pats.length === 6, 'six pattern buttons');
var u0 = host.editor()._undo.length;
pats[3].fire('click');
ok(host.document().sections[0].play.tb303 === 'D' && pats[3].attrs['aria-checked'] === 'true', 'pattern 4 makes the loop play variant D');
ids['so-drum'].fire('click');
ok(!host.getParam('bd909.mute') && ids['so-drum'].attrs['aria-pressed'] === 'true', 'the kick button unmutes the bd909');
ids['so-drive'].value = '0.6'; ids['so-drive'].fire('input');
ok(host.isBypassed('track:tb303:drive') === false && Math.abs(host.getParam('tb303.drive.drive') - 0.6) < 1e-9, 'drive above 0 enables the saturator and writes tb303.drive.drive');
ids['so-drive'].value = '0'; ids['so-drive'].fire('input');
ok(host.isBypassed('track:tb303:drive') === true, 'drive at 0 bypasses it');
ids['so-bpm'].value = '138'; ids['so-bpm'].fire('change');
ok(host.bpm() === 138, 'the BPM field sets the tempo');
console.log('OK: ' + passed + ' checks passed');
process.exit(0);
