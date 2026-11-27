#!/usr/bin/env node
/* tools/analysis-truth.js (L2, Lab Crew): labelled ground-truth renders for app/analysis/.
 * Renders the engine's own instruments (Synths, which falls back to Drums and Classics) on app/index.html in headless
 * Chromium, on an OfflineAudioContext (stereo, 44.1 kHz, Math.random seeded, Worklets.load awaited so tb303, modeld and
 * juno run their AudioWorklet engines), and writes float32 WAVs with a labels sidecar to tools/out/analysis-truth/<set>/.
 *
 * Usage: node tools/analysis-truth.js [--sets identity,reverb,poly,fm,drums,classics] [--only <name substring>]
 *        node tools/analysis-truth.js --list
 * Exit 0 when every job rendered sound, 1 when any job failed or was silent, 2 on a harness error.
 *
 * A job: {type, opts, events: [[t, ev]], secs, sample: {type, opts, ev, secs} | null, reverb: {rt, mix, pre} | null,
 *         labels: {...}}. `sample` first renders one hit of an instrument into a buffer and plays it through the
 * sampler (truth "sample"); `reverb` adds an element-specific stereo exponential-noise reverb through a ConvolverNode.
 * Labels (the field render.js gains in the spec in log-L2.md section 12): element, family, source, polyphony, notes,
 * synthesis, machine, reverb, params.
 */
'use strict';
var fs = require('fs'), path = require('path'), http = require('http');
var REPO = path.resolve(__dirname, '..'), OUT = path.join(REPO, 'tools', 'out', 'analysis-truth');
var CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
var ISO = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' };
var MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

// ------------------------------------------------------------------ job sets
function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
var R = rng(3);
function vel() { return Math.round((0.7 + 0.3 * R()) * 1000) / 1000; }
function seq(n, ioi, mk) { var e = [], k; for (k = 0; k < n; k++) e.push([0.05 + k * ioi, mk(k)]); return e; }
var D808 = ['bd808', 'sd808', 'cp808', 'ch808', 'oh808', 'cy808', 'cb808', 'lt808', 'mt808', 'ht808', 'lc808', 'mc808', 'hc808', 'rs808', 'cl808', 'ma808'];
var D909 = ['bd909', 'sd909', 'lt909', 'mt909', 'ht909', 'rs909', 'cp909', 'ch909', 'oh909', 'cr909', 'rd909'];
var S909 = { ch909: 1, oh909: 1, cr909: 1, rd909: 1 };   // the 909's hats and cymbals are 6-bit samples
var LONG = { cy808: 1, cr909: 1, rd909: 1, oh909: 1, oh808: 1 };
var CLASSIC = ['tb303', 'modeld', 'juno'];
var MONO = { bass: 1, tb303: 1, modeld: 1, kick: 1, sub: 1 };
var SUBTRACTIVE = { bass: 1, lead: 1, stab: 1, pad: 1, tb303: 1, modeld: 1, juno: 1 };
function drumLabels(t, extra) {
  var m = t.slice(-3);
  return Object.assign({ element: t, family: 'drums', machine: m === '808' ? 'tr808' : 'tr909', source: S909[t] ? 'sample' : 'synth',
                         noise: 'per-hit offset into one seeded buffer (drums.js, 2026-11-11)', polyphony: 1 }, extra || {});
}
function sets() {
  var S = { identity: {}, reverb: {}, poly: {}, fm: {}, drums: {}, classics: {} }, t, i;
  // identity: every Drums voice, sampler replays, the synths at one and five pitches
  D808.concat(D909).forEach(function (t) {
    var ioi = LONG[t] ? 0.6 : 0.3;
    S.identity['dr-' + t] = { type: t, events: seq(20, ioi, function () { return { vel: vel() }; }), secs: 20 * ioi + 2.5, labels: drumLabels(t) };
  });
  ['bd808', 'sd808', 'cp808', 'oh808', 'sd909', 'bd909', 'ch909'].forEach(function (t) {
    S.identity['smp-' + t] = { type: 'sampler', sample: { type: t, ev: { vel: 1 }, secs: 1.0 }, events: seq(20, 0.3, function () { return { vel: vel() }; }), secs: 8.5,
      labels: { element: t, family: 'sampler', source: 'sample', sampleOf: t, machine: t.slice(-3) === '808' ? 'tr808' : 'tr909', polyphony: 1 } };
  });
  [['fm', { ratio: 1, index: 3 }, { midi: 48, dur: 0.3, vel: 1 }], ['stab', {}, { notes: [56, 59, 63], dur: 0.2, vel: 1 }], ['tb303', {}, { midi: 48, dur: 0.2, vel: 1 }]].forEach(function (s) {
    S.identity['smp-' + s[0] + '-pitched'] = { type: 'sampler', sample: { type: s[0], opts: s[1], ev: s[2], secs: 0.8 },
      events: seq(20, 0.4, function (k) { return { note: [0, 2, -3, 5, 7][k % 5], vel: vel() }; }), secs: 10.5,
      labels: { element: s[0] + ' note', family: 'sampler', source: 'sample', sampleOf: s[0], transposed: [0, 2, -3, 5, 7], polyphony: s[2].notes ? 3 : 1 } };
  });
  [['kick', {}], ['clap', {}], ['hat_closed', {}], ['shaker', {}], ['perc', {}], ['bass', { midi: 32, dur: 0.15 }], ['fm', { midi: 48, dur: 0.2 }],
   ['lead', { midi: 60, dur: 0.2 }], ['stab', { notes: [56, 59, 63], dur: 0.2 }], ['tb303', { midi: 45, dur: 0.15 }], ['modeld', { midi: 45, dur: 0.2 }], ['juno', { notes: [57, 60, 64], dur: 0.25 }]].forEach(function (s) {
    S.identity['syn-' + s[0]] = { type: s[0], events: seq(20, 0.4, function () { return Object.assign({}, s[1], { vel: vel() }); }), secs: 10.5,
      labels: { element: s[0], family: CLASSIC.indexOf(s[0]) >= 0 ? 'classic' : 'synth', source: 'synth', polyphony: s[1].notes ? s[1].notes.length : 1 } };
  });
  ['bass', 'fm', 'lead', 'tb303', 'modeld', 'juno'].forEach(function (t) {
    S.identity['synp-' + t] = { type: t, events: seq(20, 0.4, function (k) { return { midi: 48 + [0, 2, -3, 5, 7][k % 5], dur: 0.2, vel: vel() }; }), secs: 10.5,
      labels: { element: t, family: CLASSIC.indexOf(t) >= 0 ? 'classic' : 'synth', source: 'synth', polyphony: 1, pitches: [48, 50, 45, 53, 55] } };
  });
  // reverb: element-specific reverbs of known RT60 and pre-delay, and dry controls
  function sq(ev) { return seq(8, 0.5, function () { return Object.assign({}, ev, { vel: 0.9 }); }); }
  [['perc', {}, 1.2, 0.025], ['sd909', {}, 0.8, 0.005], ['cp808', {}, 2.5, 0.010], ['fm', { midi: 57, dur: 0.15 }, 2.5, 0.010], ['ch808', {}, 1.6, 0.040], ['juno', { notes: [57, 60, 64], dur: 0.2 }, 3.0, 0.020]].forEach(function (s) {
    S.reverb['rv-' + s[0] + '-' + s[2] + '-' + Math.round(s[3] * 1000)] = { type: s[0], events: sq(s[1]), secs: 4 + s[2] * 1.6 + 0.5, reverb: { rt: s[2], mix: 1.0, pre: s[3] },
      labels: { element: s[0], reverb: { present: true, kind: 'element-specific', rt60: s[2], predelayMs: s[3] * 1000 } } };
  });
  ['cp808', 'bd808', 'perc'].forEach(function (t) { S.reverb['dry-' + t] = { type: t, events: sq({}), secs: 6.5, labels: { element: t, reverb: { present: false } } }; });
  // poly: chords of 1 to 6 notes on poly instruments; lines on mono ones (overlapping notes, slides)
  var CH = [57, 60, 64, 67, 71, 74];
  ['stab', 'pad', 'juno', 'fm'].forEach(function (t) {
    for (var n = 1; n <= 6; n++) {
      S.poly['ch-' + t + '-' + n] = { type: t, events: seq(8, 0.8, function (k) { var root = [0, 5, -2, 3][k % 4]; return { notes: CH.slice(0, n).map(function (m) { return m + root; }), dur: 0.6, vel: vel() }; }), secs: 9.5,
        labels: { element: t, polyphony: n, notesPerChord: n, chordRoots: [57, 62, 55, 60] } };
    }
  });
  var LINE = [45, 48, 52, 45, 50, 43, 47, 52];
  ['bass', 'tb303', 'modeld', 'lead', 'juno'].forEach(function (t) {
    S.poly['line-' + t] = { type: t, events: seq(32, 0.25, function (k) { return { midi: LINE[k % 8], dur: 0.3, vel: vel(), slide: k % 4 === 3 }; }), secs: 10.5,
      labels: { element: t, polyphony: 1, line: true, overlaps: 'dur 0.30 s on a 0.25 s step', slides: 'every 4th note', instrumentVoices: MONO[t] ? 1 : 'poly' } };
  });
  // fm against subtractive: fm over ratios and indices; subtractive instruments at three pitches
  [[1, 1], [1, 4], [2, 2], [3, 2], [0.5, 3], [1.41, 2], [3.5, 3], [1, 8]].forEach(function (ri) {
    [0, 0.8].forEach(function (ie) {
      S.fm['fm-r' + ri[0] + '-i' + ri[1] + '-e' + ie] = { type: 'fm', opts: { ratio: ri[0], index: ri[1], indexEnv: ie }, events: seq(12, 0.5, function (k) { return { midi: [45, 52, 57][k % 3], dur: 0.35, vel: vel() }; }), secs: 7,
        labels: { element: 'fm', synthesis: 'fm', ratio: ri[0], index: ri[1], indexEnv: ie, polyphony: 1 } };
    });
  });
  ['bass', 'lead', 'stab', 'pad', 'tb303', 'modeld', 'juno'].forEach(function (t) {
    S.fm['sub-' + t] = { type: t, events: seq(12, 0.5, function (k) { return { midi: [45, 52, 57][k % 3], dur: 0.35, vel: vel() }; }), secs: 7,
      labels: { element: t, synthesis: 'subtractive', polyphony: 1 } };
  });
  // drums: every Drums voice at its defaults and three random settings of its knobs; sampler replays; other synth drums
  return S;
}
function drumJobs(specs) {
  var S = {}, r = rng(11);
  D808.concat(D909).forEach(function (t) {
    var sp = specs[t] || {}, ioi = LONG[t] ? 0.6 : 0.3;
    for (var v = 0; v < 4; v++) {
      var opts = {};
      if (v > 0) for (var k in sp) if (sp.hasOwnProperty(k) && k !== 'level' && typeof sp[k].min === 'number' && typeof sp[k].max === 'number' && !sp[k].options) opts[k] = Math.round((sp[k].min + (sp[k].max - sp[k].min) * r()) * 10000) / 10000;
      S['dk-' + t + '-' + v] = { type: t, opts: opts, events: seq(12, ioi, function () { return { vel: Math.round((0.7 + 0.3 * r()) * 1000) / 1000 }; }), secs: 12 * ioi + 2.5, labels: drumLabels(t, { params: opts }) };
    }
    S['dk-smp-' + t] = { type: 'sampler', sample: { type: t, ev: { vel: 1 }, secs: 1.2 }, events: seq(12, ioi, function () { return { vel: Math.round((0.7 + 0.3 * r()) * 1000) / 1000 }; }), secs: 12 * ioi + 2.5,
      labels: { element: t, family: 'sampler', source: 'sample', sampleOf: t, machine: 'sample', polyphony: 1 } };
  });
  ['kick', 'clap', 'hat_closed', 'hat_open', 'shaker', 'perc'].forEach(function (t) {
    S['dk-eng-' + t] = { type: t, events: seq(12, 0.3, function () { return { vel: Math.round((0.7 + 0.3 * r()) * 1000) / 1000 }; }), secs: 6.5,
      labels: { element: t, family: 'synth', machine: 'other', source: 'synth', polyphony: 1 } };
  });
  return S;
}

// ------------------------------------------------------------------ browser
function serve() {
  return new Promise(function (res, rej) {
    var s = http.createServer(function (q, r) {
      var p; try { p = decodeURIComponent(q.url.split('?')[0]); } catch (e) { r.writeHead(400); return r.end(); }
      if (p.endsWith('/')) p += 'index.html';
      var f = path.normalize(path.join(REPO, p));
      if (f.indexOf(REPO + path.sep) !== 0) { r.writeHead(403); return r.end(); }
      fs.readFile(f, function (e, d) { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, Object.assign({ 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }, ISO)); r.end(d); });
    });
    s.on('error', rej); s.listen(0, '127.0.0.1', function () { res(s); });
  });
}
var SEED = 'Math.random = (function(){var a=1;return function(){a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};})();';
function pageRender(job) {
  function ready(c) { return (window.Worklets && typeof Worklets.load === 'function') ? Promise.resolve(Worklets.load(c)) : Promise.resolve(false); }
  function hit(spec, sr) {
    var c = new OfflineAudioContext(2, Math.round(spec.secs * sr), sr);
    return ready(c).then(function () { var i = Synths.create(c, spec.type, spec.opts || {}); i.out.connect(c.destination); i.trigger(0.0, spec.ev || {}); return c.startRendering(); });
  }
  var engine = null;
  return (job.sample ? hit(job.sample, job.sr) : Promise.resolve(null)).then(function (sbuf) {
    var ctx = new OfflineAudioContext(2, Math.round(job.secs * job.sr), job.sr);
    return ready(ctx).then(function () {
      var opts = Object.assign({}, job.opts || {});
      if (sbuf) { opts.buffer = 'b1'; opts.getBuffer = function () { return sbuf; }; }
      var inst = Synths.create(ctx, job.type, opts);
      engine = inst.engine || null;
      inst.out.connect(ctx.destination);
      if (job.reverb) {
        var n = Math.round((job.reverb.rt * 1.2 + job.reverb.pre) * job.sr), ir = ctx.createBuffer(2, n, job.sr), p0 = Math.round(job.reverb.pre * job.sr);
        for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (var k = p0; k < n; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(10, -3 * (k - p0) / job.sr / job.reverb.rt) * 0.05; }
        var cv = ctx.createConvolver(); cv.normalize = false; cv.buffer = ir; var g = ctx.createGain(); g.gain.value = job.reverb.mix;
        inst.out.connect(cv); cv.connect(g); g.connect(ctx.destination);
      }
      job.events.forEach(function (e) { inst.trigger(e[0], e[1]); });
      return ctx.startRendering();
    });
  }).then(function (buf) {
    var n = buf.length, f = new Float32Array(2 * n), L = buf.getChannelData(0), Rr = buf.getChannelData(1);
    for (var i = 0; i < n; i++) { f[2 * i] = L[i]; f[2 * i + 1] = Rr[i]; }
    var b = new Uint8Array(f.buffer), s = '';
    for (var j = 0; j < b.length; j += 0x8000) s += String.fromCharCode.apply(null, b.subarray(j, j + 0x8000));
    return { b64: btoa(s), engine: engine };
  });
}
function wav(file, f32, sr) {
  var data = Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength), h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

(async function main() {
  var a = process.argv.slice(2), want = ['identity', 'reverb', 'poly', 'fm', 'drums'], only = null;
  for (var i = 0; i < a.length; i++) {
    if (a[i] === '--sets') want = a[++i].split(',');
    else if (a[i] === '--only') only = a[++i];
    else if (a[i] === '--list') { var S0 = sets(); Object.keys(S0).forEach(function (k) { console.log(k + ': ' + Object.keys(S0[k]).length + ' jobs'); }); console.log('drums: 140 jobs (built in the page from Drums.spec)'); process.exit(0); }
    else { console.error('analysis-truth.js: unknown argument ' + a[i]); process.exit(2); }
  }
  var pw = null;
  ['playwright', '/opt/node22/lib/node_modules/playwright'].some(function (m) { try { pw = require(m); return true; } catch (e) { return false; } });
  if (!pw || !fs.existsSync(CHROMIUM)) { console.error('analysis-truth.js: Playwright or Chromium not found'); process.exit(2); }
  var srv = await serve(), br = await pw.chromium.launch({ executablePath: CHROMIUM, headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  var errs = [], bad = 0, done = 0;
  try {
    var page = await br.newPage(); page.on('pageerror', function (e) { errs.push(e.message); });
    await page.addInitScript({ content: SEED });
    await page.goto('http://127.0.0.1:' + srv.address().port + '/app/index.html', { waitUntil: 'load' });
    var S = sets();
    if (want.indexOf('drums') >= 0) {
      var specs = await page.evaluate(function () { var o = {}; Drums.types().forEach(function (t) { o[t] = JSON.parse(JSON.stringify(Drums.spec(t))); }); return o; });
      S.drums = drumJobs(specs);
    }
    for (var w = 0; w < want.length; w++) {
      var set = want[w], jobs = S[set];
      if (!jobs) { console.error('analysis-truth.js: unknown set ' + set); bad++; continue; }
      var dir = path.join(OUT, set); fs.mkdirSync(dir, { recursive: true });
      for (var name in jobs) {
        if (only && name.indexOf(only) < 0) continue;
        var j = Object.assign({ sr: 44100 }, jobs[name]);
        try {
          var r = await page.evaluate(pageRender, j), buf = Buffer.from(r.b64, 'base64');
          var f = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4), pk = 0;
          for (var q = 0; q < f.length; q++) if (Math.abs(f[q]) > pk) pk = Math.abs(f[q]);
          wav(path.join(dir, name + '.wav'), new Float32Array(f), j.sr);
          var lab = Object.assign({ type: j.type, opts: j.opts || {}, engine: r.engine, sample: j.sample || null }, j.labels || {});
          if (j.reverb && lab.reverb) lab.reverb.mix = j.reverb.mix;
          fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify({ labels: lab, events: j.events.length, secs: j.secs, peak: pk }, null, 1));
          done++;
          if (!(pk > 1e-4)) { console.log(set + '/' + name + ': SILENT'); bad++; }
        } catch (e) { console.log(set + '/' + name + ': ERR ' + (e && e.message)); bad++; }
      }
      console.log(set + ': written to ' + path.relative(REPO, dir));
    }
  } catch (e) { console.error('analysis-truth.js: harness error: ' + (e && e.message)); await br.close(); srv.close(); process.exit(2); }
  await br.close(); srv.close();
  console.log('page errors: ' + (errs.length ? errs.join(' | ') : 'none'));
  console.log(done + ' rendered, ' + bad + ' failed or silent');
  process.exit(bad ? 1 : 0);
})();
