/* Node smoke test for app/ui/step-view.js: node tools/step-view-check.js
 * Fake document, a fake host over the real SongDoc editor (Host.create() when app/engine/host.js exists and works headless).
 * Mounts the Step View, toggles a cell in a shared variant (expects the fork), sets a lock, undoes, disposes. */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var appDir = path.join(__dirname, '..', 'app');
var passed = 0;
function ok(cond, msg) { if (!cond) { console.error('FAIL: ' + msg); process.exit(1); } passed++; }

// ---- fake DOM
function El(tag, doc) {
  this.tagName = String(tag).toUpperCase(); this.ownerDocument = doc; this.children = []; this.parentNode = null;
  this.className = ''; this.style = {}; this.attrs = {}; this.listeners = {}; this._text = ''; this.title = ''; this.value = '';
}
El.prototype = {
  get firstChild() { return this.children[0] || null; },
  get textContent() { return this._text + this.children.map(function (c) { return c.textContent; }).join(''); },
  set textContent(t) { this.children = []; this._text = String(t); },
  appendChild: function (c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; },
  removeChild: function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; },
  replaceChild: function (n, o) { var i = this.children.indexOf(o); n.parentNode = this; this.children[i] = n; o.parentNode = null; return o; },
  setAttribute: function (k, v) { this.attrs[k] = String(v); },
  getAttribute: function (k) { return this.attrs[k]; },
  addEventListener: function (t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
  removeEventListener: function (t, f) { var l = this.listeners[t] || [], i = l.indexOf(f); if (i >= 0) l.splice(i, 1); },
  dispatch: function (t, ev) { ev = ev || {}; ev.target = this; (this.listeners[t] || []).slice().forEach(function (f) { f(ev); }); },
  contains: function (o) { while (o) { if (o === this) return true; o = o.parentNode; } return false; },
  hasClass: function (c) { return (' ' + this.className + ' ').indexOf(' ' + c + ' ') >= 0; },
  all: function (sel, out) {   // '.a' or 'tag' or '.a.b'
    out = out || [];
    var parts = sel.split('.').filter(Boolean), isTag = sel.charAt(0) !== '.', me = this;
    var match = isTag ? this.tagName === sel.toUpperCase() : parts.every(function (p) { return me.hasClass(p); });
    if (match) out.push(this);
    this.children.forEach(function (c) { c.all(sel, out); });
    return out;
  },
  querySelector: function (sel) { var r = []; this.children.forEach(function (c) { c.all(sel, r); }); return r[0] || null; },
  getBoundingClientRect: function () { return { left: 0, top: 100, bottom: 124, height: 24, width: 20 }; },
  focus: function () {}
};
function Doc() { this.listeners = {}; this.body = new El('body', this); this.head = new El('head', this); }
Doc.prototype = {
  createElement: function (t) { return new El(t, this); },
  getElementById: function () { return null; },
  addEventListener: function (t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
  removeEventListener: function (t, f) { var l = this.listeners[t] || [], i = l.indexOf(f); if (i >= 0) l.splice(i, 1); },
  dispatch: function (t, ev) { ev = ev || {}; (this.listeners[t] || []).slice().forEach(function (f) { f(ev); }); },
  count: function () { var n = 0, k; for (k in this.listeners) n += this.listeners[k].length; return n; }
};
var document = new Doc();
global.window = global; global.document = document;

// ---- load the engine files the check needs, then the module
function load(rel) { vm.runInThisContext(fs.readFileSync(path.join(appDir, rel), 'utf8'), { filename: rel }); }
['engine/core.js', 'engine/synths.js', 'engine/processors.js', 'engine/songdoc.js', 'engine/sequencer.js', 'engine/song.js'].forEach(load);
ok(typeof SongDoc === 'object' && typeof Song === 'object', 'engine globals loaded');
load('ui/step-view.js');
ok(typeof StepView === 'object' && typeof StepView.mount === 'function', 'StepView global');

// ---- a host: the real one if it exists and builds without audio, else a minimal fake over the real editor
var host = null, usedReal = false;
var hostFile = path.join(appDir, 'engine', 'host.js');
if (fs.existsSync(hostFile) && !process.env.SV_FAKE_HOST) {
  try { load('engine/host.js'); var h = Host.create(); if (h && h.editor && h.document && h.commit) { host = h; usedReal = true; } } catch (e) { console.log('(host.js present but not usable headless: ' + e.message + ')'); }
}
var commits = 0, muted = {}, soloed = {};
if (!host) {
  var ed = SongDoc.createEditor(Song.document()), ls = {};
  host = {
    document: function () { return ed.doc; }, editor: function () { return ed; },
    commit: function () { commits++; (ls.document || []).slice().forEach(function (f) { f({}); }); },
    sections: function () { return ed.doc.sections; },
    transport: { playing: false, pos: function () { return { bar: 72 + 3, step: 5, section: 4, sectionName: 'mainA2', barInSection: 3 }; } },
    mute: function (t, b) { muted[t] = b; return b; }, solo: function (t, b) { soloed[t] = b; return b; },
    setParam: function () {}, getParam: function () { return 0; },
    on: function (t, f) { (ls[t] = ls[t] || []).push(f); }, off: function (t, f) { var l = ls[t] || [], i = l.indexOf(f); if (i >= 0) l.splice(i, 1); },
    _listeners: ls
  };
}
console.log('host: ' + (usedReal ? 'real Host.create()' : 'fake over SongDoc editor'));

// ---- mount
var holder = document.createElement('div'); document.body.appendChild(holder);
var view = StepView.mount(holder, host);
var rootEl = holder.children[0];
ok(rootEl && rootEl.hasClass('sv-root'), 'root element mounted');
var rows = rootEl.all('.sv-row');
ok(rows.length === 13, '13 track rows (got ' + rows.length + ')');
ok(rootEl.all('.sv-group').length === 4, 'four group headers');
ok(rows.every(function (r) { return r.all('.sv-cell').length === 16; }), '16 cells in every row');
ok(rootEl.all('.sv-hdr')[0].all('.sv-secs')[0].all('button').length === 9, 'nine section buttons in the header');

ok(view.state.follow === true, 'follow defaults on');
// ---- go to mainA2 (index 4), select bass (variant B is shared with mainB)
view.selectSection('mainA2');
view.select('bass');
var D = host.document(), E = host.editor();
var secA2 = E.section('mainA2'), secB = E.section('mainB');
ok(secA2.play.bass === 'B' && secB.play.bass === 'B', 'precondition: bass B shared by mainA2 and mainB');
ok(E.variantUsage('bass', 'B').length === 2, 'variantUsage bass B = 2');
function row(name) { return rootEl.all('.sv-row').filter(function (r) { return r.getAttribute('data-track') === name; })[0]; }
function cell(name, i) { return row(name).all('.sv-cell')[i]; }
function tap(c, extra) {  // pointerdown on the cell, pointerup on the document
  var down = { button: 0, clientX: 0, clientY: 50 }, up = { clientX: 0, clientY: 50 }, k;
  for (k in (extra || {})) { down[k] = extra[k]; up[k] = extra[k]; }
  c.dispatch('pointerdown', down); document.dispatch('pointerup', up);
}
ok(host.editor().track('bass').variants.B.cells[0] === null, 'bass B step 1 is a rest');
var undoBefore = E._undo.length, commitsBefore = commits;

// ---- 1. toggle a cell in the shared variant: fork B to D for mainA2 only
tap(cell('bass', 0));
D = host.document(); E = host.editor();
ok(E.section('mainA2').play.bass === 'D', 'mainA2 now plays the fork D (got ' + E.section('mainA2').play.bass + ')');
ok(E.section('mainB').play.bass === 'B', 'mainB still plays B');
ok(E.track('bass').variants.D && E.track('bass').variants.D.from === 'B', 'variant D exists and remembers from B');
ok(E.track('bass').variants.D.cells[0] && E.track('bass').variants.D.cells[0].vel === 0.85, 'D step 1 is a hit at 0.85');
ok(E.track('bass').variants.B.cells[0] === null, 'B is unchanged');
ok(E._undo.length - undoBefore === 1, 'fork + play + step collapsed into one undo (got ' + (E._undo.length - undoBefore) + ')');
if (!usedReal) ok(commits - commitsBefore === 1, 'one commit for the gesture');
ok(cell('bass', 0).hasClass('hit'), 'cell now shows a hit');
ok(rootEl.all('.sv-msg')[0].textContent.indexOf('bass B to D for mainA2') >= 0, 'fork message shown');

// ---- 2. a second toggle edits D in place (not shared any more)
tap(cell('bass', 1));
ok(host.editor().track('bass').variants.D.cells[1] && !host.editor().track('bass').variants.D.variants, 'second edit lands in D');
ok(!host.editor().track('bass').variants.E, 'no second fork');
tap(cell('bass', 1), {}); // within double-click time: clears (already a hit, so the clear applies)
ok(host.editor().track('bass').variants.D.cells[1] === null, 'double-click clears the step');

// ---- 3. a lock through the + lane menu and a lane drag
var add = rootEl.all('button').filter(function (b) { return b.textContent.indexOf('+ lane') === 0; })[0];
ok(!!add, '+ lane button');
add.dispatch('click', {});
var menu = rootEl.all('.sv-menu')[0];
ok(!!menu, 'lane menu opened');
var item = menu.all('button').filter(function (b) { return b.textContent.indexOf('cutoff') === 0; })[0];
ok(!!item, 'cutoff is listed (bass spec)');
ok(!menu.all('button').some(function (b) { return /^(level|drive)\b/.test(b.textContent); }), 'level and drive are not offered');
item.dispatch('click', { stopPropagation: function () {} });
var lane = rootEl.all('.sv-lane').filter(function (l) { return l.getAttribute('data-lane') === 'lock:cutoff'; })[0];
ok(!!lane, 'cutoff lock lane added');
var lc = lane.all('.sv-lcell')[0];
ok(!lc.hasClass('off'), 'lane cell for step 1 is live (step exists)');
lc.dispatch('pointerdown', { button: 0, clientY: 112 });       // rect top 100, height 24: mid = 0.5 of the log range
document.dispatch('pointerup', { clientY: 112 });
var lockv = host.editor().track('bass').variants.D.cells[0].locks;
ok(lockv && typeof lockv.cutoff === 'number' && lockv.cutoff > 100 && lockv.cutoff < 8000, 'lock cutoff written (' + (lockv && lockv.cutoff) + ')');
ok(cell('bass', 0).all('.sv-mark')[0] && cell('bass', 0).all('.sv-mark')[0].textContent === '*', 'cell carries the * lock mark');

// ---- 4. scope "all" edits in place without forking (kick A is played by all nine sections)
view.state.scope = 'all';
view.select('kick');
var kickBefore = Object.keys(host.editor().track('kick').variants).length;
tap(cell('kick', 1));
ok(Object.keys(host.editor().track('kick').variants).length === kickBefore, 'scope all: no fork');
ok(host.editor().track('kick').variants.A.cells[1] !== null, 'scope all: A edited in place');
view.state.scope = 'section';

// ---- 5. playhead column through update() (the viewed bar has to be the playing bar, 4 of mainA2)
view.state.bar = 3; view.selectSection('mainA2'); view.select('bass');
if (usedReal) host.transport.pos = function () { return { bar: 75, step: 5, section: 4, sectionName: 'mainA2', barInSection: 3 }; };
else host.transport.playing = true;
view.update();
var phs = rootEl.all('.ph');
ok(phs.length === 13 && phs.every(function (c) { return c.getAttribute('data-step') === '5'; }), 'playhead column on step 6 in every row (' + phs.length + ' cells)');
if (!usedReal) host.transport.playing = false;

// ---- 6. undo: lock gone, then the kick edit, then the fork
function press(label) { var b = rootEl.all('button').filter(function (x) { return x.textContent === label; })[0]; ok(!!b && !b.disabled, label + ' button enabled'); b.dispatch('click', {}); }
view.state.bar = 0; view.selectSection('mainA2');
press('Undo');   // kick A edit
ok(host.editor().track('kick').variants.A.cells[1] === null, 'undo reverts the kick edit');
press('Undo');   // the lock
ok(!host.editor().track('bass').variants.D.cells[0].locks, 'undo removes the lock');
press('Undo');   // double-click clear
press('Undo');   // second toggle
press('Undo');   // the fork
ok(host.editor().section('mainA2').play.bass === 'B' && !host.editor().track('bass').variants.D, 'undo of the first toggle removes the fork (play back to B, no D)');
ok(cell('bass', 0).hasClass('rest'), 'view shows the rest again');
press('Redo');
ok(host.editor().section('mainA2').play.bass === 'D', 'redo restores the fork');

// ---- 6b. M button, variant chip menu, + new empty, fx row, Apply-to-all message
var mbtn = row('hat_open').all('button').filter(function (b) { return b.textContent === 'M'; })[0];
mbtn.dispatch('click', {});
var flags = host.tracks ? host.tracks().filter(function (t) { return t.name === 'hat_open'; })[0] : null;
ok(usedReal ? (flags && flags.muted === true) : muted.hat_open === true, 'M calls host.mute (hat_open muted)');
view.selectSection('mainA2');
var chip = row('perc').all('.sv-chip')[0];
ok(chip && chip.textContent.indexOf('-') === 0, 'perc has no variant in mainA2 (chip shows -)');
chip.dispatch('click', {});
var vmenu = rootEl.all('.sv-menu')[0];
ok(vmenu && vmenu.all('button').some(function (b) { return b.textContent.indexOf('+ new empty') === 0; }), 'variant menu lists + new empty');
vmenu.all('button').filter(function (b) { return b.textContent.indexOf('+ new empty') === 0; })[0].dispatch('click', {});
var pv = host.editor().section('mainA2').play.perc;
ok(pv && host.editor().track('perc').variants[pv] && host.editor().track('perc').variants[pv].bars === 1, 'new empty variant created and played (' + pv + ')');
ok(row('perc').all('.sv-cell').every(function (c) { return c.hasClass('rest'); }), 'new variant is all rests');
view.selectSection('build');   // riser fx at bar 12 of 16 (bars index 12..15)
view.state.bar = 12; view.selectSection('build');
view.select('riser'); gotoCheck();
function gotoCheck() {
  var r = row('riser'); ok(r.all('.sv-cell')[0].hasClass('hit'), 'riser row shows the fx hit in bar 13 of build');
}
// Apply to all: edit shared kick A with scope section? kick A is played by all nine -> forks; the message offers "apply to all"
view.state.bar = 0; view.selectSection('mainA'); view.select('hat_closed');
tap(cell('hat_closed', 0));   // hat_closed A is shared by mainA only? check below
var msgEl = rootEl.all('.sv-msg')[0];
if (host.editor().variantUsage('hat_closed', 'A').length > 1 || /still used by/.test(msgEl.textContent)) {
  var applyAll = msgEl.all('button').filter(function (b) { return b.textContent.indexOf('Apply to all') === 0; })[0];
  console.log('(apply-to-all branch ran)');
  ok(!!applyAll, 'fork message offers Apply to all');
  applyAll.dispatch('click', {});
  ok(host.editor().track('hat_closed').variants.A.cells[0] !== null, 'Apply to all edits the shared variant in place');
}

// ---- 6c. fx editing through ed.setFx, pattern length through ed.setVariantBars, follow flag
if (host.editor().setFx) {
view.state.follow = true; view.state.bar = 12; view.selectSection('build'); view.select('riser');
var nfx0 = host.editor().section('build').fx.filter(function (f) { return f.track === 'riser'; }).length;
var rc = cell('riser', 5); ok(!rc.hasClass('hit'), 'riser step 6 of bar 13 is empty');
rc.dispatch('click', {});
var fxs = host.editor().section('build').fx.filter(function (f) { return f.track === 'riser'; });
ok(fxs.length === nfx0 + 1 && fxs.some(function (f) { return f.bar === 12 && f.step === 5; }), 'click on a riser cell adds an fx hit (ed.setFx)');
ok(cell('riser', 5).hasClass('hit'), 'riser cell shows the new hit');
cell('riser', 5).dispatch('click', {});
ok(host.editor().section('build').fx.filter(function (f) { return f.track === 'riser'; }).length === nfx0, 'second click removes it');
view.state.bar = 0; view.selectSection('mainA2'); view.select('bass');
var bsel = rootEl.all('select').filter(function (x) { return (x.getAttribute('aria-label') || '').indexOf('length of variant') === 0; })[0];
ok(!!bsel && !bsel.disabled, 'pattern length select present');
bsel.value = '2'; bsel.dispatch('change', {});
ok(host.editor().track('bass').variants[host.editor().section('mainA2').play.bass].bars === 2, 'pattern length 2 bars (ed.setVariantBars)');
ok(rootEl.all('select').some(function (x) { return x.getAttribute('aria-label') === 'bar within the section'; }), 'bar select present');
} else console.log('(editor has no setFx / setVariantBars: fx and length checks skipped)');
view.state.follow = false; var secBefore = view.state.sec; view.selectSection('intro');
ok(view.state.sec === secBefore, 'follow off: selectSection (section event) does not move the view');
var sb = rootEl.all('.sv-hdr')[0].all('.sv-secs')[0].all('button')[0];
sb.dispatch('click', {});
ok(view.state.sec === 0 && view.state.follow === false, 'a click on a section number still moves the view');
view.state.follow = true; view.selectSection('mainA2');
ok(view.state.sec === 4, 'follow on: selectSection moves the view');

// ---- 6d. a section event during a pointer gesture is deferred until the gesture ends (latest wins)
view.state.follow = true; view.selectSection('mainA2'); view.select('kick');
ok(view.state.sec === 4, 'precondition: viewing mainA2');
cell('kick', 3).dispatch('pointerdown', { button: 0, clientX: 0, clientY: 50 });
view.selectSection('intro'); view.selectSection('break');
ok(view.state.sec === 4, 'pointer down in a cell: a section event does not move the view');
ok(view.state.pendingSection === 'break', 'the latest section is kept pending');
document.dispatch('pointerup', { clientX: 0, clientY: 50 });
ok(view.state.sec === 5 && view.state.pendingSection === null, 'pointer up applies the pending section (break)');
view.selectSection('mainA2');
cell('kick', 4).dispatch('pointerdown', { button: 0, clientX: 0, clientY: 50 });
view.selectSection('build');
ok(view.state.sec === 4, 'second gesture: still deferred');
document.dispatch('pointercancel', {});
ok(view.state.sec === 2, 'pointercancel also applies the pending section (build)');
view.selectSection('mainA2');
var lcd = rootEl.all('.sv-lane')[0].all('.sv-lcell').filter(function (c) { return !c.hasClass('off'); })[0];
if (lcd) {
  lcd.dispatch('pointerdown', { button: 0, clientY: 112 });
  view.selectSection('outro');
  ok(view.state.sec === 4, 'pointer down in a lane cell: deferred');
  document.dispatch('pointerup', { clientY: 112 });
  ok(view.state.sec === 8, 'lane gesture end applies the pending section (outro)');
}
view.selectSection('mainA2');
// ---- 7. dispose
var nDoc = document.count();
view.dispose();
ok(holder.children.length === 0, 'dispose removes the root element');
ok(document.count() < nDoc && document.count() === 0, 'document listeners removed (' + document.count() + ' left)');
if (host._listeners) ok((host._listeners.document || []).length === 0, 'host listeners removed');
view.update();   // must not throw after dispose
console.log('OK: ' + passed + ' checks passed');
