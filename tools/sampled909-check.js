#!/usr/bin/env node
/* tools/sampled909-check.js - check of app/engine/sampled909.js (Pressing Crew, K1).
 *
 *   node tools/sampled909-check.js             Node checks on a fake context: manifest against the folder, the naming
 *                                               rule, nearest-recording selection over every knob range, spec parity with
 *                                               drums.js, accent and velocity files, choke, loading, absence, user files.
 *   node tools/sampled909-check.js --browser   the same, then measurements in headless Chromium (tools/serve.js on a free
 *                                               port, killed after): one hit of every voice at three knob settings, a
 *                                               16-step groove on the sampled and on the synthesized kit, the hat choke.
 * Prints "OK: N checks passed" and exits 0 on success, 1 on a failed check, 2 when the browser part cannot run.
 * The recordings in app/assets/tr909-robroy/ are only listed and read, never written.
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');

var ROOT = path.join(__dirname, '..'), ENGINE = path.join(ROOT, 'app', 'engine'), DIR = path.join(ROOT, 'app', 'assets', 'tr909-robroy');
var fails = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; console.log('  FAIL ' + msg); } }

// ------------------------------------------------------------------ fake context from selfcheck.js
var sc = fs.readFileSync(path.join(ENGINE, 'selfcheck.js'), 'utf8');
var from = sc.indexOf('function Param(v)'), to = sc.indexOf('function load(sandbox)');
if (from < 0 || to < 0) { console.log('FAIL cannot find the fake context in selfcheck.js'); process.exit(1); }
var F = (new Function(sc.slice(from, to) + '; return {Param: Param, Node: Node, Src: Src, FakeContext: FakeContext};'))();
var origStop = F.Src.prototype.stop;
F.Src.prototype.stop = function (t) { (this._stops || (this._stops = [])).push(t); return origStop.apply(this, arguments); };
function Rec(sr) { F.FakeContext.call(this, sr || 44100); this.srcs = []; }
Rec.prototype = Object.create(F.FakeContext.prototype);
Rec.prototype.createBufferSource = function () { var n = F.FakeContext.prototype.createBufferSource.call(this); this.srcs.push(n); return n; };

function sandbox(extra) {
  var sb = { console: { log: console.log, warn: function () {} }, Promise: Promise, Float32Array: Float32Array, Uint8Array: Uint8Array, WeakMap: WeakMap, Math: Math };
  if (extra) for (var k in extra) sb[k] = extra[k];
  sb.window = sb; sb.globalThis = sb;
  return vm.createContext(sb);
}
function load(files, extra) {
  var sb = sandbox(extra);
  files.forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(ENGINE, f + '.js'), 'utf8'), sb, { filename: f + '.js' }); });
  return sb;
}
function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

var TYPES = ['bd909s', 'sd909s', 'lt909s', 'mt909s', 'ht909s', 'rs909s', 'cp909s', 'ch909s', 'oh909s', 'cr909s', 'rd909s'];
var SYNTH = { bd909s: 'bd909', sd909s: 'sd909', lt909s: 'lt909', mt909s: 'mt909', ht909s: 'ht909', rs909s: 'rs909', cp909s: 'cp909', ch909s: 'ch909', oh909s: 'oh909', cr909s: 'cr909', rd909s: 'rd909' };
// counts from TR909SET.TXT's "Sample set specifications"
var COUNT = { bd909s: 24, sd909s: 52, lt909s: 16, mt909s: 16, ht909s: 16, rs909s: 2, cp909s: 2, ch909s: 6, oh909s: 6, cr909s: 6, rd909s: 6 };

async function nodeChecks() {
  var sb = load(['core', 'drums', 'sampled909']), S = sb.Sampled909, D = sb.Drums;

  // ---------------------------------------------------------------- 1. manifest and naming rule
  console.log('1. manifest against the folder and the naming rule');
  var folder = fs.readdirSync(DIR).filter(function (f) { return fs.statSync(path.join(DIR, f)).isFile(); }).sort();
  var man = S.manifest();
  ok(JSON.stringify(man) === JSON.stringify(folder), 'the module\'s manifest is the folder listing (' + man.length + ' / ' + folder.length + ')');
  var r = cp.spawnSync(process.execPath, [path.join(__dirname, 'robroy-manifest.js'), '--check'], { encoding: 'utf8' });
  ok(r.status === 0, 'tools/robroy-manifest.js --check exits 0 (' + (r.stdout || '').trim() + ')');
  ok(folder.length === 161 && folder.filter(function (f) { return /\.WAV$/i.test(f); }).length === 160, '160 WAV files and the text file');
  var per = {}, unknown = [], combos = 0, text = 0;
  folder.forEach(function (f) {
    var p = S.parse(f);
    if (!p) unknown.push(f);
    else if (p.voice) (per[p.voice] = per[p.voice] || []).push(p);
    else if (p.combo) combos++;
    else if (p.text) text++;
  });
  ok(unknown.length === 0, 'every file is accounted for by the naming rule (unknown: ' + (unknown.join(', ') || 'none') + ')');
  ok(combos === 8 && text === 1, '4 closed->open + 4 open->closed combinations and TR909SET.TXT');
  TYPES.forEach(function (t) { ok(per[t] && per[t].length === COUNT[t], t + ': ' + COUNT[t] + ' recordings (' + (per[t] ? per[t].length : 0) + ')'); });
  // grid completeness: bd 4 tunes x (attack 0: 4 decays, attack 10: decay 0 and 10); sd 4 tunes x (tone 0: 4 snappy, tone 3/7/10: snappy 3/7/10)
  function keyOf(p) { return Object.keys(p.knobs).sort().map(function (k) { return k + p.knobs[k]; }).join(' '); }
  function want(type, axes, allow) {
    var out = [];
    (function rec(i, acc) {
      if (i === axes.length) { if (!allow || allow(acc)) out.push(Object.keys(acc).sort().map(function (k) { return k + acc[k]; }).join(' ')); return; }
      axes[i][1].forEach(function (v) { var a = Object.assign({}, acc); a[axes[i][0]] = v; rec(i + 1, a); });
    })(0, {});
    var have = (per[type] || []).map(keyOf).sort();
    ok(JSON.stringify(have) === JSON.stringify(out.sort()), type + ': the recorded combinations are the grid TR909SET.TXT describes');
  }
  var S4 = [0, 3, 7, 10], S6 = [0, 2, 4, 6, 8, 10];
  want('bd909s', [['tune', S4], ['attack', [0, 10]], ['decay', S4]], function (a) { return a.attack === 0 || a.decay === 0 || a.decay === 10; });
  want('sd909s', [['tune', S4], ['tone', S4], ['snappy', S4]], function (a) { return a.tone === 0 || a.snappy !== 0; });
  ['lt909s', 'mt909s', 'ht909s'].forEach(function (t) { want(t, [['tune', S4], ['decay', S4]]); });
  want('ch909s', [['decay', S6]]); want('oh909s', [['decay', S6]]); want('cr909s', [['tune', S6]]); want('rd909s', [['tune', S6]]);
  ok(S.parse('BT0A0A7.WAV').alias === 'BT0A0D7.WAV' && S.parse('BT0A0A7.WAV').knobs.decay === 7, 'the misnamed BT0A0A7.WAV reads as tune 0, attack 0, decay 7');
  ok(S.parse('rim127.wav').vel === 'high' && S.parse('RIM63.WAV').vel === 'low' && S.parse('HANDCLP2.WAV').vel === 'high', 'velocity files, names case-insensitive');
  ok(S.parse('BT0A3D0.WAV') === null && S.parse('KICK.WAV') === null, 'names outside the rule are unknown');
  var a4 = fs.readFileSync(path.join(DIR, 'RIDED4.WAV')), a6 = fs.readFileSync(path.join(DIR, 'RIDED6.WAV'));
  ok(a4.equals(a6), 'RIDED4.WAV and RIDED6.WAV are the same recording in the set (noted in the spec label)');

  // ---------------------------------------------------------------- 2. specs and parity with drums.js
  console.log('2. specs: names and ranges of drums.js, basis and labels');
  ok(JSON.stringify(S.types()) === JSON.stringify(TYPES), 'types() lists the 11 voices');
  ok(S.has('bd909s') && !S.has('bd909') && S.spec('nope') === null, 'has() and spec(unknown)');
  ok(TYPES.every(function (t) { return !D.has(t); }), 'no sampled name collides with a drums.js type');
  TYPES.forEach(function (t) {
    var s = S.spec(t), d = D.spec(SYNTH[t]), bad = [];
    for (var k in s) {
      if (k === 'between') { if (s[k].basis !== 'prior' || s[k].value !== 0) bad.push('between not prior/off'); continue; }
      if (!d || !d[k]) { bad.push(k + ' not in ' + SYNTH[t]); continue; }
      if (s[k].min !== d[k].min || s[k].max !== d[k].max || s[k].value !== d[k].value || s[k].unit !== d[k].unit) bad.push(k + ' range');
      if (s[k].basis !== 'sample' || String(s[k].label).indexOf('Rob Roy') < 0) bad.push(k + ' basis/label');
    }
    ok(bad.length === 0, t + ': every row matches ' + SYNTH[t] + ' (' + Object.keys(s).join(', ') + ')' + (bad.length ? ': ' + bad.join('; ') : ''));
  });
  // the knobs the 909 panel shows (panels.js GRP909) are all present on the sampled voices
  var PANEL = { bd909s: ['tune', 'level', 'attack', 'decay'], sd909s: ['tune', 'level', 'tone', 'snappy'], lt909s: ['tune', 'level', 'decay'], mt909s: ['tune', 'level', 'decay'],
                ht909s: ['tune', 'level', 'decay'], rs909s: ['level'], cp909s: ['level'], ch909s: ['level', 'decay'], oh909s: ['level', 'decay'], cr909s: ['level', 'tune'], rd909s: ['level', 'tune'] };
  ok(TYPES.every(function (t) { return PANEL[t].every(function (k) { return !!S.spec(t)[k]; }); }), 'every HVT-909 panel knob exists on the sampled voice');
  ok(S.GAIN_BASIS === 'prior' && TYPES.every(function (t) { return S.GAIN[t] > 0; }), 'per-voice gain table, marked prior');

  // ---------------------------------------------------------------- 3. nearest recording across the knob ranges
  console.log('3. nearest-recording selection');
  TYPES.forEach(function (t) {
    var list = per[t], s = S.spec(t), knobs = list[0].knobs ? Object.keys(list[0].knobs) : [], bad = 0, n = 0;
    // every recording is reached at its own knob settings
    list.forEach(function (p) {
      if (p.vel) return;
      var params = {};
      knobs.forEach(function (k) { params[k] = s[k].min + p.knobs[k] / 10 * (s[k].max - s[k].min); });
      var got = S.pick(t, params);
      if (!got || got.file !== p.file) bad++;
    });
    ok(bad === 0, t + ': each recording is chosen at its own knob settings');
    if (!knobs.length) return;
    // sweep: 41 positions per knob (all combinations), brute-force nearest with ties to the higher settings
    bad = 0;
    var steps = 41;
    (function rec(i, params, pos) {
      if (i === knobs.length) {
        n++;
        var best = null, bd = Infinity, bs = -1;
        list.forEach(function (p) {
          var d = 0, sum = 0;
          knobs.forEach(function (k) { var e = pos[k] - p.knobs[k]; d += e * e; sum += p.knobs[k]; });
          if (d < bd - 1e-9 || (Math.abs(d - bd) <= 1e-9 && sum > bs)) { bd = d; bs = sum; best = p; }
        });
        if (S.pick(t, params).file !== best.file) bad++;
        return;
      }
      for (var j = 0; j < steps; j++) {
        var k = knobs[i], v = s[k].min + j / (steps - 1) * (s[k].max - s[k].min), p2 = Object.assign({}, params), q2 = Object.assign({}, pos);
        p2[k] = v; q2[k] = j / (steps - 1) * 10; rec(i + 1, p2, q2);
      }
    })(0, {}, {});
    ok(bad === 0, t + ': nearest recording over ' + n + ' knob positions');
  });
  // separable voices: the choice is the per-knob nearest step
  var p = S.pick('lt909s', { tune: -0.5 + 0.44, decay: 0.038 + 0.86 * 0.342 });   // knobs 4.4, 8.6
  ok(p.file === 'LT3DA.WAV', 'lt909s at knobs 4.4 / 8.6 plays LT3DA.WAV (' + p.file + ')');
  p = S.pick('sd909s', { tune: 0.5, tone: 0.34 * 0 + 0.10 + 0.24 * 0.6, snappy: -18 });   // tune 10, tone 6, snappy 0: snappy 0 exists only at tone 0
  ok(p.file === 'STAT7S3.WAV', 'sd909s at tune 10, tone 6, snappy 0 plays STAT7S3.WAV (nearest of the recorded set; ' + p.file + ')');
  p = S.pick('bd909s', { tune: 0.007, attack: 6, decay: 0.0155 + 0.7 * 0.3345 });   // attack 10, decay 7: attack 10 has decay 0 / 10 only
  ok(p.file === 'BT0AADA.WAV', 'bd909s at attack 10, decay 7 plays BT0AADA.WAV (' + p.file + ')');
  ok(S.pick('cr909s', {}).file === 'CSHD6.WAV' && S.pick('sd909s', {}).file === 'ST7T3S7.WAV', 'defaults: knob 5 ties go to the higher setting (crash 6, snare tune 7)');
  var defs = TYPES.map(function (t) { return t + ' ' + (S.pick(t, {}, { level909: 1 }) || {}).file; });
  console.log('   defaults play: ' + defs.join(', '));
  // the tune residual for `between`
  p = S.pick('lt909s', { tune: -0.5 + 0.45, decay: 0.15 });                       // knob 4.5 -> step 3 (tune -0.2), residual +0.15 oct
  ok(Math.abs(p.residual - 0.15) < 1e-9, 'between: the tune left over is 0.15 octave at knob 4.5 (' + p.residual + ')');
  ok(S.pick('rs909s', {}, { level909: 2 }).file === 'RIM127.WAV' && S.pick('rs909s', {}, { level909: 1 }).file === 'RIM63.WAV' && S.pick('rs909s', {}, { level909: 0 }).file === 'RIM63.WAV', 'rim shot: step 2 plays RIM127, steps 0 and 1 RIM63');
  ok(S.pick('cp909s', {}, { accent: true }).file === 'HANDCLP2.WAV' && S.pick('cp909s', {}, {}).file === 'HANDCLP1.WAV', 'hand clap: accent plays HANDCLP2, else HANDCLP1');

  // ---------------------------------------------------------------- 4. absence: no fetch, a 404, nothing throws
  console.log('4. absence (a release without the folder)');
  var ctx = new Rec(), threw = false, res;
  try {
    res = await S.load(ctx);
    var inst = S.create(ctx, 'bd909s'); inst.out.connect(ctx.destination);
    for (var i = 0; i < 4; i++) inst.trigger(i * 0.1, { level909: 2 });
    inst.set('decay', 0.3); inst.panic(); inst.dispose();
  } catch (e) { threw = e; }
  ok(!threw, 'load, create, trigger, panic and dispose without the files do not throw' + (threw ? ': ' + threw.message : ''));
  ok(res && res.loaded.length === 0 && res.missing.length === 152, 'load resolves with all 152 voice files missing (' + (res && res.missing.length) + ')');
  ok(S.available() === false && S.ready(ctx) === false, 'available() and ready() are false');
  ok(ctx.srcs.length === 0, 'no source started by a voice without its recording');
  var sbn = load(['core', 'synths', 'drums', 'sampled909']), ctx404 = new Rec(), asked = [];
  sbn.fetch = function (u) { asked.push(u); return Promise.resolve({ ok: false, status: 404 }); };
  res = await sbn.Sampled909.load(ctx404, { types: ['ch909s'], base: 'http://x/kit/' });
  ok(res.missing.length === 6 && res.loaded.length === 0 && asked.length === 6 && asked[0] === 'http://x/kit/HHCD0.WAV', 'a 404 folder: the 6 closed-hat files are missing, nothing else is asked');
  var viaSynths = sbn.Synths.create(ctx404, 'oh909s');
  ok(viaSynths && viaSynths.sampled === true && viaSynths.type === 'oh909s', 'Synths.create(ctx, "oh909s") reaches Sampled909 (the synths.js fallback)');
  ok(sbn.Synths.create(null, 'bd909s').type === 'bd909s' && sbn.Synths.create(null, 'bd909').type === 'bd909', 'a null context gives a silent instrument; bd909 is still drums.js');
  var noS9 = load(['core', 'synths', 'drums']);
  ok(noS9.Synths.create(new Rec(), 'bd909s').type === 'unknown', 'without sampled909.js the app is unchanged (bd909s is an unknown type)');

  // ---------------------------------------------------------------- 5. loading, catch-up, user files, accent, choke
  console.log('5. loading, catch-up, user files, levels, choke');
  var sbl = load(['core', 'drums', 'sampled909']), SL = sbl.Sampled909, fetched = [];
  function fakeWav() { var ab = new ArrayBuffer(4410); new Uint8Array(ab)[0] = 1; return ab; }   // the fake decoder: 4410 frames = 0.1 s
  sbl.fetch = function (u) { fetched.push(u); return Promise.resolve({ ok: true, arrayBuffer: function () { return Promise.resolve(fakeWav()); } }); };
  var c2 = new Rec();
  var early = SL.create(c2, 'sd909s'); early.out.connect(c2.destination);
  early.trigger(0, { level909: 2 });
  ok(c2.srcs.length === 0 && early._missed === 1, 'a hit before the recordings arrive plays nothing');
  ok(fetched.length === 52, 'create() asks for its own voice\'s 52 files only (' + fetched.length + ')');
  for (i = 0; i < 5; i++) await tick();
  ok(SL.ready(c2, ['sd909s']) && !SL.ready(c2, ['bd909s']), 'ready(ctx, [sd909s]) once decoded; the bass drum is not loaded');
  early.trigger(0.5, { level909: 2 });
  ok(c2.srcs.length === 1 && c2.srcs[0]._started, 'the same instrument plays once they arrive (catch-up)');
  ok(SL.available() === true, 'available() is true once a recording decoded');
  res = await SL.load(c2, { types: ['sd909s'] });
  ok(res.loaded.length === 52 && fetched.length === 52, 'a second load reuses the decoded buffers (no new fetch)');
  // levels: step 0 / 1 / 2 = -18 / -9 / 0 dB, accent flag 6 dB over half scale, times GAIN
  var c3 = new Rec(), g = [];
  await SL.loadFiles(c3, { 'BT0A0D0.WAV': fakeWav(), 'bt0aad0.wav': fakeWav() });
  var bd = SL.create(c3, 'bd909s'); bd.out.connect(c3.destination);
  [{ level909: 0, vel: 1 }, { level909: 1, vel: 1 }, { level909: 2, vel: 1 }, { vel: 1 }, { vel: 1, accent: true }, { vel: 0.4 }, { vel: 0.85, step: 2 }, { vel: 0.85, step: 37 }, { vel: 0.85, step: 0 }].forEach(function (ev, j) {
    bd.trigger(j, ev);
    var src = c3.srcs[c3.srcs.length - 1], gn = src.connections[0];
    g.push(gn.gain.calls.filter(function (c) { return c[0] === 'setValueAtTime'; })[0][1] / SL.GAIN.bd909s);
  });
  function near(a, b) { return Math.abs(a - b) < 1e-6; }
  ok(near(g[0], Math.pow(10, -18 / 20)) && near(g[1], Math.pow(10, -9 / 20)) && near(g[2], 1) && near(g[3], Math.pow(10, -9 / 20)) && near(g[4], 1), 'level909 0 / 1 / 2 = -18 / -9 / 0 dB; a plain hit -9 dB, an accent 0 dB, as drums.js ampOf9 (' + g.map(function (x) { return x.toFixed(3); }).join(', ') + ')');
  ok(near(g[5], Math.pow(10, -18 / 20)), 'velocity under 0.5 plays the weak level, -18 dB (' + g[5].toFixed(3) + ')');
  ok(near(g[6], g[7]) && near(g[7], g[8]) && near(g[6], Math.pow(10, -9 / 20)), 'ev.step (the absolute step: 2, 37, 0) does not change the level (' + [g[6], g[7], g[8]].map(function (x) { return x.toFixed(3); }).join(', ') + ')');
  // user files: names with folders, case, unknown names, a single File-like object
  var c4 = new Rec();
  res = await SL.loadFiles(c4, [{ name: 'kit/HHOD2.WAV', arrayBuffer: function () { return Promise.resolve(fakeWav()); } },
                                 { webkitRelativePath: 'TR909/hhcd0.wav', name: 'hhcd0.wav', data: fakeWav() },
                                 { name: 'snare.wav', data: fakeWav() }, { name: 'CLOP1.WAV', data: fakeWav() }]);
  ok(res.loaded.length === 2 && res.loaded.indexOf('HHOD2.WAV') >= 0 && res.loaded.indexOf('HHCD0.WAV') >= 0, 'loadFiles: File-like objects and {name, data}, folders and case ignored');
  ok(res.unknown.length === 1 && res.unknown[0] === 'snare.wav' && res.missing.length === 150, 'loadFiles reports unknown names and the files still missing');
  res = await SL.loadFiles(c4, { name: 'RIM63.WAV', arrayBuffer: function () { return Promise.resolve(fakeWav()); } });
  ok(res.loaded[0] === 'RIM63.WAV', 'loadFiles takes a single File');
  var c4b = new Rec(); res = await SL.load(c4b, { types: ['oh909s'] });
  ok(res.loaded.indexOf('HHOD2.WAV') >= 0, 'user files are also decoded on a later context (an offline render)');
  // choke: oh at 0, ch at 0.1 -> the oh fades over 5 ms and stops; a new oh chokes the ch; the synthesized hats are not touched
  var c5 = new Rec();
  await SL.loadFiles(c5, { 'HHOD4.WAV': fakeWav(), 'HHCD0.WAV': fakeWav() });   // the defaults: oh knob 3.0 (a tie, goes to 4), ch knob 0
  var oh = SL.create(c5, 'oh909s'), ch = SL.create(c5, 'ch909s'), synOh = sbl.Drums.create(c5, 'oh909');
  oh.out.connect(c5.destination); ch.out.connect(c5.destination); synOh.out.connect(c5.destination);
  synOh.trigger(0, { level909: 2 }); var synSrc = c5.srcs[c5.srcs.length - 1];
  oh.trigger(0, { level909: 2 }); var ohSrc = c5.srcs[c5.srcs.length - 1];
  ch.trigger(0.05, { level909: 2 }); var chSrc = c5.srcs[c5.srcs.length - 1];
  var ohG = ohSrc.connections[0], ramp = ohG.gain.calls.filter(function (c) { return c[0] === 'linearRampToValueAtTime'; });
  var stops = ohSrc._stops || [];
  ok(ramp.length === 1 && near(ramp[0][2], 0.055) && Math.min.apply(null, stops) <= 0.0561, 'ch909s at 50 ms chokes the open hat: 5 ms fade to 50.5 ms + stop (' + JSON.stringify(ramp) + ' stops ' + JSON.stringify(stops) + ')');
  ok(!(synSrc._stops && synSrc._stops.some(function (t) { return t < 0.5; })), 'the synthesized oh909 is not choked by the sampled hats');
  oh.trigger(0.08, { level909: 1 });
  ok(chSrc._stops && chSrc._stops.some(function (t) { return t < 0.09; }), 'a new open hat chokes the closed hat (one hat channel)');
  // between: rate change only when asked, on a tom
  var c6 = new Rec(); await SL.loadFiles(c6, { 'LT3D3.WAV': fakeWav() });
  var lt = SL.create(c6, 'lt909s', { tune: -0.05, decay: 0.15 }); lt.out.connect(c6.destination);   // knob 4.5 -> LT3D3, +0.15 oct
  lt.trigger(0, { level909: 1 }); var r0 = c6.srcs[c6.srcs.length - 1].playbackRate.calls.length;
  lt.set('between', 1); lt.trigger(0.2, { level909: 1 }); var rc = c6.srcs[c6.srcs.length - 1].playbackRate.calls;
  ok(r0 === 0 && rc.length === 1 && near(rc[0][1], Math.pow(2, 0.15)), 'between = 0 plays at the recorded rate; 1 bends by the left-over 0.15 octave (' + (rc[0] && rc[0][1]) + ')');
  // typesIn: a sequencer and a SongDoc
  ok(JSON.stringify(SL.typesIn({ tracks: { k: { inst: { type: 'bd909s' } }, s: { inst: { type: 'sd909' } }, h: { inst: { type: 'ch909s' } } } })) === '["bd909s","ch909s"]', 'typesIn(sequencer)');
  ok(JSON.stringify(SL.typesIn({ tracks: [{ name: 'a', type: 'oh909s' }, { name: 'b', inst: 'rd909s' }, { name: 'c', type: 'bd808' }] })) === '["oh909s","rd909s"]', 'typesIn(SongDoc)');
  ok(SL.sampledOf('bd909') === 'bd909s' && SL.synthOf('cp909s') === 'cp909', 'sampledOf / synthOf map the two 909s');
  // the two-velocity choice follows the same rule as the level: accent (or level909 2), never ev.step
  ok(SL.pick('rs909s', {}, { step: 37 }).file === 'RIM63.WAV' && SL.pick('rs909s', {}, { step: 5, accent: true }).file === 'RIM127.WAV' &&
     SL.pick('cp909s', {}, { step: 2 }).file === 'HANDCLP1.WAV' && SL.pick('rs909s', {}, { level909: 1, accent: true }).file === 'RIM63.WAV',
     'rim shot and clap: the high recording on an accent or level909 2; ev.step is ignored; level909 overrides accent');

  // ---------------------------------------------------------------- 5b. accent through the real Host and Sequencer
  console.log('5b. sampled 909 accent through the Sequencer (G1)');
  var sbq = load(['core', 'synths', 'drums', 'sampled909', 'assets', 'worklets', 'classics', 'processors', 'songdoc', 'sequencer', 'song', 'host']);
  async function seqLevels(type, accSteps) {
    var rc = new Rec(), files = {};
    sbq.Sampled909.files(type).forEach(function (f) { files[f] = fakeWav(); });
    await sbq.Sampled909.loadFiles(rc, files);
    var host = sbq.Host.create({ context: rc }), ed = host.editor(), cells = [], q;
    await host.start();
    for (q = 0; q < 16; q++) cells.push(q % 4 === 0 ? { vel: 0.85, acc: accSteps.indexOf(q + 1) >= 0 || undefined } : null);
    ed.addTrack({ name: 'k9', inst: type, kind: 'drum', variants: { A: { bars: 1, cells: cells } } });
    ed.doc.sections.forEach(function (sec) { ed.setPlay(sec.name, 'k9', 'A'); });
    host.commit();
    var seq = host.engine(), tr = seq.tracks.k9, out = {}, orig = tr.inst.trigger;
    tr.inst.trigger = function (t, e) {
      var n0 = rc.srcs.length; orig(t, e);
      var src = rc.srcs.length > n0 ? rc.srcs[rc.srcs.length - 1] : null, gn = src && src.connections[0];
      var c = gn ? gn.gain.calls.filter(function (x) { return x[0] === 'setValueAtTime'; })[0] : null;
      out[(e.step % 16) + 1] = { amp: c ? c[1] : 0, step: e.step, file: tr.inst._lastHit && tr.inst._lastHit.file };
    };
    seq.scheduleAll(0, 2, 0);
    return out;
  }
  var pl = await seqLevels('bd909s', []), ac = await seqLevels('bd909s', [5, 9]);
  var d5 = 20 * Math.log10(ac[5].amp / pl[5].amp), d9 = 20 * Math.log10(ac[9].amp / pl[9].amp), d1 = 20 * Math.log10(pl[1].amp / pl[13].amp);
  ok(pl[1] && pl[1].amp > 0 && pl[13] && pl[13].amp > 0, 'bd909s on a drum track plays steps 1, 5, 9 and 13 through Host and Sequencer');
  ok(Math.abs(d5 - 9) < 1e-6 && Math.abs(d9 - 9) < 1e-6, 'cell.acc on steps 5 and 9 raises the sampled kick by 9 dB (' + d5.toFixed(2) + ', ' + d9.toFixed(2) + ' dB)');
  ok(Math.abs(d1) < 1e-9 && Math.abs(ac[1].amp - pl[1].amp) < 1e-12, 'unaccented hits are level at every absolute step (step 1 against 13: ' + d1.toFixed(2) + ' dB)');
  var rp = await seqLevels('rs909s', []), ra = await seqLevels('rs909s', [5, 9]);
  ok(rp[5].file === 'RIM63.WAV' && rp[13].file === 'RIM63.WAV' && ra[5].file === 'RIM127.WAV' && ra[9].file === 'RIM127.WAV' && ra[13].file === 'RIM63.WAV',
     'rim shot through the Sequencer: RIM127 only on the accented steps 5 and 9 (' + [ra[1].file, ra[5].file, ra[9].file, ra[13].file].join(' ') + ')');

  // ---------------------------------------------------------------- 5c. Assets: manifest gating, what is fetched
  console.log('5c. Assets.ready (G1)');
  async function assetsRun(manifest, doc, shellRoms) {
    var asked = [], sba = load(['core', 'drums', 'sampled909', 'assets'], shellRoms ? { RecutShell: { readRoms: function () { asked.push('shell:readRoms'); return Promise.resolve(shellRoms); } } } : null);
    sba.fetch = function (u) {
      asked.push(u);
      if (/manifest\.json$/.test(u)) return Promise.resolve(manifest ? { ok: true, json: function () { return Promise.resolve(manifest); } } : { ok: false });
      return Promise.resolve({ ok: true, arrayBuffer: function () { return Promise.resolve(fakeWav()); } });
    };
    var r = await sba.Assets.ready(new Rec(), doc);
    return { r: r, asked: asked, A: sba.Assets };
  }
  var kitDoc = { tracks: [{ name: 'k', type: 'bd909s' }, { name: 'h', type: 'ch909', params: { rom: 1 } }] };
  var a1 = await assetsRun({ 'tr909-rom': false, 'tr909-robroy': true }, kitDoc);
  ok(a1.asked[0] === 'assets/manifest.json' && a1.asked.filter(function (u) { return /tr909-rom/.test(u); }).length === 0 && a1.r.rom === null,
     'manifest with the ROMs false: no ROM file is asked for (' + a1.asked.length + ' requests)');
  ok(a1.r.robroy && a1.r.robroy.loaded === 24 && a1.asked.filter(function (u) { return /tr909-robroy\/BT/.test(u); }).length === 24, 'the Rob Roy files of the voices the document uses (24 for bd909s), from <assets>/tr909-robroy/');
  var a2 = await assetsRun({ 'tr909-rom': false, 'tr909-robroy': false }, kitDoc);
  ok(a2.asked.length === 1 && a2.r.robroy === null, 'both entries false: the manifest is the only request');
  var a3 = await assetsRun({ 'tr909-rom': true, 'tr909-robroy': true }, { tracks: [{ name: 'k', type: 'bd909' }] });
  ok(a3.asked.length === 1 && a3.r.rom === null && a3.r.robroy === null, 'a document with neither sampled voices nor ROM voices fetches nothing but the manifest');
  var a4 = await assetsRun({ 'tr909-rom': true, 'tr909-robroy': true }, { tracks: [{ name: 'h', type: 'oh909' }] });
  ok(a4.asked.filter(function (u) { return /tr909-rom\/hn61256p__c4[234]/.test(u); }).length === 3, 'ROMs true and an oh909 with rom on: the three chips are asked for from <assets>/tr909-rom/');
  var a5 = await assetsRun({ 'tr909-rom': true, 'tr909-robroy': true }, { tracks: [{ name: 'h', type: 'oh909', params: { rom: 0 } }] });
  ok(a5.asked.length === 1, 'the rom row off: no ROM request');
  var a6 = await assetsRun({ 'tr909-rom': true, 'tr909-robroy': true }, undefined);
  ok(a6.r.robroy && a6.r.robroy.types.length === 11 && a6.asked.filter(function (u) { return /tr909-rom\//.test(u); }).length === 3, 'no document (an instrument page): every sampled voice and the ROMs');
  var a7 = await assetsRun(null, kitDoc);
  ok(a7.r.manifest === null && a7.r.robroy && a7.asked.filter(function (u) { return /tr909-rom/.test(u); }).length === 0, 'no manifest: the Rob Roy set is still asked for (as before), the ROMs never');
  var a8 = await assetsRun({ 'tr909-rom': false, 'tr909-robroy': false }, kitDoc, [new ArrayBuffer(16)]);
  ok(a8.asked.indexOf('shell:readRoms') >= 0 && a8.r.rom && a8.r.rom.source === 'shell' && a8.r.rom.chips.length === 0, 'in the shell with the ROMs false: RecutShell.readRoms is asked; a wrong image loads nothing and nothing throws');
  ok(a1.A.romWanted({ tracks: { a: { inst: { type: 'cr909', params: { rom: 1 } } } } }) && !a1.A.romWanted({ tracks: { a: { inst: { type: 'cr909', params: { rom: 0 } } } } }), 'romWanted reads a Sequencer\'s instruments too');
  var tracked = JSON.parse(fs.readFileSync(path.join(ROOT, 'app', 'assets', 'manifest.json'), 'utf8'));
  ok(tracked['tr909-rom'] === false && tracked['tr909-robroy'] === true, 'the tracked app/assets/manifest.json says ROMs false, Rob Roy true');
}

// ==================================================================== browser measurements
async function browser() {
  console.log('6. headless Chromium measurements');
  var pw;
  try { pw = require('playwright'); } catch (e) { console.log('  cannot load playwright: ' + e.message); return 2; }
  var net = require('net');
  var port = await new Promise(function (res) { var s = net.createServer(); s.listen(0, function () { var p = s.address().port; s.close(function () { res(p); }); }); });
  var srv = cp.spawn(process.execPath, [path.join(__dirname, 'serve.js'), String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  var origin = 'http://127.0.0.1:' + port;
  var br = null;
  try {
    for (var w = 0; w < 50; w++) { try { await new Promise(function (res, rej) { require('http').get(origin + '/app/', function (r) { r.resume(); res(); }).on('error', rej); }); break; } catch (e) { await new Promise(function (r) { setTimeout(r, 100); }); } }
    br = await pw.chromium.launch();
    var page = await br.newPage(), errs = [];
    page.on('pageerror', function (e) { errs.push(String(e)); });
    // from /app/solo/ (the solo pages' ../engine/ path) and from /app/
    await page.goto(origin + '/app/solo/909.html');
    var soloBase = await page.evaluate(async function () {
      await new Promise(function (res, rej) { var s = document.createElement('script'); s.src = '../engine/sampled909.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      return window.Sampled909.base;
    });
    ok(soloBase === origin + '/app/assets/tr909-robroy/', 'base from /app/solo/: ' + soloBase);
    page = await br.newPage();
    page.on('pageerror', function (e) { errs.push(String(e)); });
    await page.goto(origin + '/app/assets/README.md');
    for (var f of ['core', 'drums', 'sampled909']) await page.addScriptTag({ url: '/app/engine/' + f + '.js' });
    var base = await page.evaluate(function () { return window.Sampled909.base; });
    ok(base === origin + '/app/assets/tr909-robroy/', 'base from /app/engine/: ' + base);
    var out = await page.evaluate(measure);
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
    report(out);
    return 0;
  } catch (e) {
    console.log('  browser part failed: ' + (e && e.stack || e)); return 2;
  } finally {
    if (br) await br.close();
    srv.kill();
  }
}

// runs in the page
async function measure() {
  var S = window.Sampled909, D = window.Drums, SR = 44100, out = { load: null, hits: [], groove: {}, choke: {}, ref: {}, synthPeaks: {}, rawPeaks: {} };
  function stats(buf, from, to) {
    var d = buf.getChannelData(0), a = Math.round((from || 0) * SR), b = Math.min(d.length, Math.round((to == null ? buf.duration : to) * SR)), pk = 0, ss = 0, last = 0, i;
    for (i = a; i < b; i++) { var x = Math.abs(d[i]); if (x > pk) pk = x; ss += d[i] * d[i]; }
    for (i = b - 1; i >= a; i--) if (Math.abs(d[i]) > pk * 0.001) { last = i; break; }     // -60 dB of the peak
    return { peak: pk, rms: Math.sqrt(ss / Math.max(1, b - a)), len: Math.max(0, (last - a) / SR) };
  }
  async function render(seconds, fn) {
    var ctx = new OfflineAudioContext(1, Math.ceil(SR * seconds), SR);
    var info = await fn(ctx);
    var buf = await ctx.startRendering();
    return { buf: buf, info: info };
  }
  var t0 = performance.now();
  var lc = new OfflineAudioContext(1, SR, SR), L = await S.load(lc);
  out.load = { loaded: L.loaded.length, missing: L.missing.length, ms: Math.round(performance.now() - t0), available: S.available() };
  // raw peaks of the decoded recordings (normalised per file: about 1.0)
  S.types().forEach(function (t) { var b = S.buffer(lc, S.pick(t, {}, { level909: 2 }).file), d = b.getChannelData(0), pk = 0; for (var i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i])); out.rawPeaks[t] = pk; });
  // one hit of every voice at three knob settings (all knobs at min, at the defaults, at max); rs / cp at steps 0, 1, 2
  for (var t of S.types()) {
    var spec = S.spec(t), knobs = Object.keys(spec).filter(function (k) { return k !== 'level' && k !== 'between'; });
    var settings = knobs.length ? ['min', 'default', 'max'] : ['step 0', 'step 1', 'step 2'];
    for (var s of settings) {
      var params = {}, ev = { level909: 2, vel: 1 };
      knobs.forEach(function (k) { params[k] = s === 'min' ? spec[k].min : s === 'max' ? spec[k].max : spec[k].value; });
      if (!knobs.length) ev.level909 = Number(s.slice(-1));
      var expect = S.pick(t, params, ev).file, chosen = null;
      var r = await render(3, async function (ctx) {
        await S.load(ctx, { types: [t] });
        var inst = S.create(ctx, t, params); inst.out.connect(ctx.destination);
        inst.trigger(0.01, ev); chosen = inst._lastHit && inst._lastHit.played ? inst._lastHit.file : null;
      });
      var st = stats(r.buf);
      out.hits.push({ type: t, setting: s, file: chosen, expect: expect, peak: st.peak, len: st.len });
    }
  }
  // the synthesized kit's peaks at the defaults, step 2 (the guide for GAIN)
  for (var t2 of S.types()) {
    var syn = S.synthOf(t2);
    var r2 = await render(3, async function (ctx) { var i = D.create(ctx, syn); i.out.connect(ctx.destination); i.trigger(0.01, { level909: 2, vel: 1 }); });
    out.synthPeaks[t2] = stats(r2.buf).peak;
  }
  // a 16-step groove at 125 BPM, step levels 2 on the beats, 1 elsewhere
  var BPM = 125, SD = 60 / BPM / 4, G = {
    bd: [0, 4, 8, 12], sd: [4, 12], ch: [0, 1, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15], oh: [2, 6, 10, 14], cp: [12], rs: [7], lt: [13], mt: [14], ht: [15], cr: [0], rd: [3, 11]
  };
  function lvl(s) { return s % 4 === 0 ? 2 : 1; }
  async function groove(kit, only) {
    var r = await render(16 * SD + 2.5, async function (ctx) {
      var names = Object.keys(G).filter(function (k) { return !only || only.indexOf(k) >= 0; });
      if (kit === 's') await S.load(ctx, { types: names.map(function (k) { return k + '909s'; }) });
      names.forEach(function (k) {
        var inst = kit === 's' ? S.create(ctx, k + '909s') : D.create(ctx, k + '909');
        inst.out.connect(ctx.destination);
        G[k].forEach(function (s) { inst.trigger(0.05 + s * SD, { level909: lvl(s), vel: 1 }); });
      });
    });
    return stats(r.buf, 0, 16 * SD + 2.5);
  }
  out.groove.mix = { s: await groove('s'), y: await groove('y') };
  for (var k of ['bd', 'sd', 'lt', 'mt', 'ht', 'rs', 'cp', 'cr', 'rd']) out.groove[k] = { s: await groove('s', [k]), y: await groove('y', [k]) };
  out.groove['ch+oh'] = { s: await groove('s', ['ch', 'oh']), y: await groove('y', ['ch', 'oh']) };
  // the choke: oh (decay max, HHODA, 0.52 s) at 50 ms, ch at 150 ms; window 160..400 ms
  async function hats(o, c) {
    var r = await render(1, async function (ctx) {
      await S.load(ctx, { types: ['ch909s', 'oh909s'] });
      if (o) { var oh = S.create(ctx, 'oh909s', { decay: 0.16 }); oh.out.connect(ctx.destination); oh.trigger(0.05, { level909: 2 }); }
      if (c) { var ch = S.create(ctx, 'ch909s'); ch.out.connect(ctx.destination); ch.trigger(0.15, { level909: 2 }); }
    });
    return { win: stats(r.buf, 0.16, 0.4), pre: stats(r.buf, 0.10, 0.149) };
  }
  out.choke = { ohAlone: await hats(1, 0), chAlone: await hats(0, 1), both: await hats(1, 1) };
  // the set's own reference: OPCL3 (open hat, closed hat about 150 ms later) - level 60..140 ms after the closed onset,
  // against the closed hat alone (HHCD0) in the same window after its onset
  async function rec(name) { var ab = await (await fetch(S.base + name)).arrayBuffer(); return await new OfflineAudioContext(1, SR, SR).decodeAudioData(ab); }
  var op = await rec('OPCL3.WAV'), ho = await rec('HHODA.WAV'), hcs = {};
  for (var hn of ['HHCD0.WAV', 'HHCD4.WAV', 'HHCD8.WAV', 'HHCDA.WAV']) hcs[hn] = await rec(hn);
  function onsetAfter(buf, t) { var d = buf.getChannelData(0), pk = 0, i; for (i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i])); for (i = Math.round(t * SR); i < d.length; i++) if (Math.abs(d[i]) > pk * 0.9) return i / SR; return null; }
  var on = onsetAfter(op, 0.1);
  out.ref = { opclOnset: on, opcl: stats(op, on + 0.06, on + 0.14).rms, chAlone: Object.keys(hcs).map(function (n) { return n + ' ' + (20 * Math.log10(stats(hcs[n], 0.06, 0.14).rms + 1e-12)).toFixed(1); }).join(', '), ohSame: stats(ho, on + 0.06, on + 0.14).rms, opclBefore: stats(op, on - 0.03, on - 0.005).rms };
  return out;
}

function report(o) {
  var db = function (x) { return x > 0 ? (20 * Math.log10(x)).toFixed(1) : '-inf'; };
  console.log('   load: ' + o.load.loaded + ' decoded, ' + o.load.missing + ' missing, ' + o.load.ms + ' ms, available ' + o.load.available);
  ok(o.load.loaded === 152 && o.load.missing === 0 && o.load.available, 'all 152 voice recordings load and decode in Chromium');
  console.log('   hits (step 2 unless named; peak dBFS, length to -60 dB of the peak):');
  o.hits.forEach(function (h) {
    console.log('     ' + (h.type + ' ' + h.setting).padEnd(18) + (h.file || '(silent)').padEnd(14) + ' peak ' + db(h.peak).padStart(6) + '  len ' + h.len.toFixed(3) + ' s');
  });
  ok(o.hits.every(function (h) { return h.file && h.file === h.expect; }), 'every rendered hit played the expected recording');
  ok(o.hits.every(function (h) { return h.peak > 0.01 && h.peak < 1.2 && h.len > 0.02; }), 'every hit sounds (peak above -40 dBFS, under +1.6 dBFS)');
  console.log('   gain guide (default knobs, step 2): voice  synth peak  raw recording peak  GAIN  sampled peak');
  Object.keys(o.synthPeaks).forEach(function (t) {
    var h = o.hits.filter(function (x) { return x.type === t && (x.setting === 'default' || x.setting === 'step 2'); })[0];
    console.log('     ' + t.padEnd(7) + db(o.synthPeaks[t]).padStart(7) + '  ' + db(o.rawPeaks[t]).padStart(7) + '  ' + (o.synthPeaks[t] / o.rawPeaks[t]).toFixed(2) + '  ' + db(h.peak).padStart(7));
  });
  console.log('   16-step groove at 125 BPM (sampled | synthesized; peak / RMS dBFS):');
  Object.keys(o.groove).forEach(function (k) {
    var g = o.groove[k];
    console.log('     ' + k.padEnd(6) + db(g.s.peak).padStart(6) + ' / ' + db(g.s.rms).padStart(6) + '  |  ' + db(g.y.peak).padStart(6) + ' / ' + db(g.y.rms).padStart(6));
  });
  ok(Math.abs(20 * Math.log10(o.groove.mix.s.rms / o.groove.mix.y.rms)) < 6, 'the sampled groove sits within 6 dB RMS of the synthesized one');
  var c = o.choke;
  console.log('   choke, 160..400 ms (oh at 50 ms, ch at 150 ms): oh alone ' + db(c.ohAlone.win.rms) + ', ch alone ' + db(c.chAlone.win.rms) + ', both ' + db(c.both.win.rms) + ' dBFS RMS; before the ch: oh ' + db(c.ohAlone.pre.rms) + ', both ' + db(c.both.pre.rms));
  ok(Math.abs(20 * Math.log10(c.both.win.rms / c.chAlone.win.rms)) < 1 && c.ohAlone.win.rms > c.chAlone.win.rms * 1.5, 'measured: after the closed hat only the closed hat sounds (the open hat is choked)');
  ok(Math.abs(20 * Math.log10(c.both.pre.rms / c.ohAlone.pre.rms)) < 0.5, 'measured: before the closed hat the open hat is untouched');
  var r = o.ref;
  console.log('   the set\'s OPCL3 (closed onset ' + (r.opclOnset || 0).toFixed(3) + ' s): 60..140 ms after it ' + db(r.opcl) + ' dBFS RMS; closed hats alone in that window: ' + r.chAlone + '; HHODA unchoked at that time ' + db(r.ohSame) + '; open hat just before ' + db(r.opclBefore));
}

(async function main() {
  await nodeChecks();
  var code = 0;
  if (process.argv.indexOf('--browser') >= 0) code = await browser();
  if (fails) { console.log('FAIL: ' + fails + ' of ' + checks + ' checks failed'); process.exit(1); }
  if (code) { console.log('browser part could not run (' + checks + ' Node checks passed)'); process.exit(code); }
  console.log('OK: ' + checks + ' checks passed');
  process.exit(0);
})().catch(function (e) { console.log('FAIL: ' + (e && e.stack || e)); process.exit(1); });
