#!/usr/bin/env node
/* tools/fit.js (Selector Crew T3, strategy step C1): fitting by synthesis on the app's own instruments, in headless
 * Chromium. Loads app/index.html (the engine and app/analysis/), adds app/analysis/fit.js, and either fits one excerpt
 * or builds a labelled set of the app's own solo renders, fits every item and scores the result against its labels.
 *
 * Usage:
 *   node tools/fit.js --set solo|lines|all [--only <type,...>] [--limit N] [--out tools/out/fit/results-<set>.json]
 *   node tools/fit.js --wav <mono or stereo WAV> --events <events.json> [--only <type,...>]
 *        events.json: [{"t": seconds, "midi": 45, "dur": 0.1, "vel": 0.85, "step": 0}, ...] (drums: no midi)
 * Options: --sr 22050 (render rate), --seed 1, --gens 12 (CMA-ES generations), --rows 8 (rows searched), --quiet.
 * Exit: 0 done (the scores are judged by tools/fit-check.js), 2 harness error (no Playwright, no Chromium, page error).
 *
 * The labelled set ("solo"): every instrument the engine creates without a buffer (found at run time), pitched ones at
 * their default patch and at three perturbed patches (three continuous rows of the spec drawn uniformly in [0.1, 0.9]
 * of the search coordinates, and with probability 0.5 one switch set to a random option), unpitched ones at one
 * perturbed patch; one bar at 125 BPM. "lines": the Dubplate Crew's tb303 line (tools/importer-check.js L303, two bars
 * at 128 BPM, 5 slides and 4 accents per two bars) at the default patch and three perturbed ones (20 slides). Truth and
 * fit are rendered by the same function (Analysis.fit.pageEnv: mono OfflineAudioContext, Math.random reseeded, the
 * instrument straight to the destination). The fitter is given the events without slide and accent flags and without
 * the instrument or patch. Everything here is the app's own material: no real instrument is involved.
 */
'use strict';
var fs = require('fs'), path = require('path'), http = require('http');
var REPO = path.resolve(__dirname, '..'), OUTDIR = path.join(REPO, 'tools', 'out', 'fit');
var CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
var ISO = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' };
var MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.wav': 'audio/wav' };

function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ------------------------------------------------------------------ labelled sets (built from the specs read in the page)
var L303 = [[0, 33, 1, 0, 1], [2, 33, 1, 0, 0], [3, 45, 1, 1, 0], [4, 40, 2, 0, 0], [7, 36, 1, 0, 1], [8, 38, 1, 1, 0], [9, 43, 1, 0, 0], [11, 33, 3, 0, 0], [14, 45, 1, 0, 1],
            [16, 31, 1, 0, 0], [18, 31, 1, 1, 0], [19, 43, 2, 0, 1], [22, 38, 1, 0, 0], [24, 36, 1, 1, 0], [25, 41, 1, 0, 0], [27, 33, 2, 0, 1], [30, 40, 1, 1, 0], [31, 45, 1, 0, 0]];
var CHORDY = { juno: 1, pad: 1, stab: 1 };   // test material: these play chords in two of their four items
var LONG = { cy808: 1, cr909: 1, rd909: 1, oh909: 1, oh808: 1, impact: 1, riser: 1 };
function space(spec) {   // the same rule as Analysis.fit.space (kept in step by fit-check.js)
  var S = { cont: [], disc: [] };
  Object.keys(spec || {}).forEach(function (n) {
    var r = spec[n]; if (!r || typeof r !== 'object' || n === 'level' || n === 'seed') return;
    if (r.options && r.options.length > 1) S.disc.push({ name: n, options: r.options.slice(), def: r.value });
    else if (typeof r.value === 'boolean') S.disc.push({ name: n, options: [false, true], def: r.value });
    else if (typeof r.value === 'number' && typeof r.min === 'number' && typeof r.max === 'number' && r.max > r.min) S.cont.push({ name: n, min: r.min, max: r.max, log: r.min > 0 && r.max / r.min >= 10, def: r.value });
  });
  return S;
}
function fromU(r, u) { return r.log ? r.min * Math.pow(r.max / r.min, u) : r.min + u * (r.max - r.min); }
function toU(r, v) { v = Math.min(r.max, Math.max(r.min, v)); return r.log ? Math.log(v / r.min) / Math.log(r.max / r.min) : (v - r.min) / (r.max - r.min); }
function perturb(spec, R) {
  var S = space(spec), p = {}, rows = S.cont.slice(), pick = [];
  while (pick.length < 3 && rows.length) pick.push(rows.splice(Math.floor(R() * rows.length), 1)[0]);
  pick.forEach(function (r) { p[r.name] = Math.round(fromU(r, 0.1 + 0.8 * R()) * 10000) / 10000; });
  if (S.disc.length && R() < 0.5) { var d = S.disc[Math.floor(R() * S.disc.length)], alts = d.options.filter(function (v) { return v !== d.def; }); p[d.name] = alts[Math.floor(R() * alts.length)]; }
  return p;
}
function lineEvents(R, sd, chords) {
  var ev = [], steps = chords ? [0, 4, 8, 12] : [0, 2, 3, 6, 8, 10, 11, 14], scale = [0, 3, 5, 7, 10, 12, 15];
  steps.forEach(function (s, k) {
    var len = chords ? 3 : (s === 3 || s === 11 ? 1 : 1 + Math.floor(R() * 2)), root = 40 + scale[Math.floor(R() * scale.length)];
    var e = { t: 0.05 + s * sd, dur: Math.round((len * sd * 0.95 - 0.01) * 10000) / 10000, vel: Math.round((0.7 + 0.3 * R()) * 1000) / 1000, step: s };
    if (chords) e.notes = [root + 12, root + 15, root + 19]; else e.midi = root;
    ev.push(e);
  });
  return ev;
}
function drumEvents(R, sd, long) {
  var steps = long ? [0, 4, 8, 12] : [0, 2, 4, 7, 8, 10, 12, 14];
  return steps.map(function (s) { return { t: 0.05 + s * sd, vel: Math.round((0.7 + 0.3 * R()) * 1000) / 1000, step: s }; });
}
function buildSet(name, cands, specs, seed) {
  var R = rng(seed || 5), jobs = [];
  if (name === 'solo' || name === 'all') {
    var sd = 15 / 125;
    cands.forEach(function (c) {
      var spec = specs[c.type];
      if (c.family === 'pitched') {
        for (var v = 0; v < 4; v++) jobs.push({ set: 'solo', name: c.type + '-' + v, type: c.type, family: c.family, params: v === 0 ? {} : perturb(spec, R),
                                                 events: lineEvents(R, sd, CHORDY[c.type] && (v % 2 === 1)), secs: 0.05 + 16 * sd + 0.4 });
      } else {
        jobs.push({ set: 'solo', name: c.type + '-1', type: c.type, family: c.family, params: perturb(spec, R), events: drumEvents(R, sd, LONG[c.type]), secs: 0.05 + 16 * sd + (LONG[c.type] ? 0.8 : 0.4) });
      }
    });
  }
  if (name === 'lines' || name === 'all') {
    var sd3 = 15 / 128, ev = L303.map(function (q) { return { t: 0.05 + q[0] * sd3, midi: q[1], dur: Math.round((q[2] * sd3 * 0.95 - 0.01) * 10000) / 10000, vel: 0.85, step: q[0], slide: !!q[3], accent: !!q[4] }; });
    if (cands.some(function (c) { return c.type === 'tb303'; })) for (var k = 0; k < 4; k++) jobs.push({ set: 'lines', name: 'tb303-L303-' + k, type: 'tb303', family: 'pitched', params: k === 0 ? {} : perturb(specs.tb303, R), events: ev, secs: 0.05 + 32 * sd3 + 0.4 });
  }
  return jobs;
}

// ------------------------------------------------------------------ scoring one item against its labels
function score(job, res, spec) {
  var S = space(spec), out = { name: job.name, set: job.set, truth: job.type, got: res.instrument, right: res.instrument === job.type, distanceDb: res.distanceDb,
                              runnerUp: res.runnerUp, renders: res.renders, ms: res.ms, rows: [], slides: null, accents: null, truthParams: job.params };
  if (out.right) {
    S.cont.forEach(function (r) {
      var tv = job.params.hasOwnProperty(r.name) ? job.params[r.name] : r.def, iv = res.params[r.name];
      if (!iv) return;
      var e = Math.abs(toU(r, iv.value) - toU(r, tv));
      out.rows.push({ row: r.name, truth: tv, fit: iv.value, lo: iv.lo, hi: iv.hi, searched: !!iv.searched, perturbed: job.params.hasOwnProperty(r.name),
                      errU: Math.round(e * 10000) / 10000, covered: tv >= iv.lo - 1e-9 && tv <= iv.hi + 1e-9, widthU: Math.round((toU(r, iv.hi) - toU(r, iv.lo)) * 10000) / 10000 });
    });
    S.disc.forEach(function (r) { var tv = job.params.hasOwnProperty(r.name) ? job.params[r.name] : r.def, iv = res.params[r.name]; if (iv) out.rows.push({ row: r.name, discrete: true, truth: tv, fit: iv.value, right: iv.value === tv, perturbed: job.params.hasOwnProperty(r.name) }); });
  }
  if (job.events.some(function (e) { return e.slide || e.accent; }) && out.right) {
    var sl = { truth: 0, found: 0, falsePos: 0, rightSteps: 0, steps: job.events.length }, ac = { truth: 0, found: 0, falsePos: 0, rightSteps: 0, steps: job.events.length };
    job.events.forEach(function (e, i) {
      var f = res.flags[i] || {};
      if (e.slide) { sl.truth++; if (f.slide) sl.found++; } else if (f.slide) sl.falsePos++;
      if (!!e.slide === !!f.slide) sl.rightSteps++;
      if (e.accent) { ac.truth++; if (f.accent) ac.found++; } else if (f.accent) ac.falsePos++;
      if (!!e.accent === !!f.accent) ac.rightSteps++;
    });
    out.slides = sl; out.accents = ac;
  }
  return out;
}

// ------------------------------------------------------------------ browser
function serve() {
  return new Promise(function (res, rej) {
    var s = http.createServer(function (q, r) {
      var p; try { p = decodeURIComponent(q.url.split('?')[0]); } catch (e) { r.writeHead(400); return r.end(); }
      if (p.endsWith('/')) p += 'index.html';
      var f = path.normalize(path.join(REPO, p));
      if (f.indexOf(REPO + path.sep) !== 0 || f.indexOf(path.join(REPO, 'local') + path.sep) === 0) { r.writeHead(403); return r.end(); }
      fs.readFile(f, function (e, d) { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, Object.assign({ 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }, ISO)); r.end(d); });
    });
    s.on('error', rej); s.listen(0, '127.0.0.1', function () { res(s); });
  });
}
async function open(o) {
  var pw = null;
  ['playwright', '/opt/node22/lib/node_modules/playwright'].some(function (m) { try { pw = require(m); return true; } catch (e) { return false; } });
  if (!pw || !fs.existsSync(CHROMIUM)) throw new Error('Playwright or Chromium not found');
  var srv = await serve(), br = await pw.chromium.launch({ executablePath: CHROMIUM, headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  var page = await br.newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); });
  await page.goto('http://127.0.0.1:' + srv.address().port + '/app/index.html', { waitUntil: 'load' });
  await page.addScriptTag({ url: '/app/analysis/fit.js' });
  var info = await page.evaluate(function (o) {
    window.__fitEnv = Analysis.fit.pageEnv({ sr: o.sr, seed: o.seed });
    return window.__fitEnv.ready().then(function (env) {
      var c = env.candidates(), specs = {};
      c.forEach(function (x) { specs[x.type] = JSON.parse(JSON.stringify(env.spec(x.type))); });
      return { candidates: c, specs: specs };
    });
  }, { sr: o.sr, seed: o.seed });
  return { page: page, close: async function () { await br.close(); srv.close(); }, errors: errs, candidates: info.candidates, specs: info.specs };
}
// render the truth and fit it, in the page
function pageJob(a) {
  var env = window.__fitEnv;
  var t = a.job;
  return env.render(t.type, t.params, t.events, t.secs).then(function (x) {
    var events = t.events.map(function (e) { var c = {}; for (var k in e) if (k !== 'slide' && k !== 'accent') c[k] = e[k]; return c; });
    return Analysis.fit.fit(env, x, events, a.opts).then(function (r) { var pk = 0; for (var i = 0; i < x.length; i++) pk = Math.max(pk, Math.abs(x[i])); r.truthPeak = pk; return r; });
  });
}
function pageWav(a) {
  var env = window.__fitEnv, b = Uint8Array.from(atob(a.b64), function (c) { return c.charCodeAt(0); }), f = new Float32Array(b.buffer);
  // resample linearly to the env rate (mono input at a.sr)
  var r = a.sr / env.sr, n = Math.floor(f.length / r), x = new Float32Array(n), i;
  for (i = 0; i < n; i++) { var p = i * r, k = Math.floor(p), q = p - k; x[i] = f[k] * (1 - q) + (f[Math.min(f.length - 1, k + 1)] || 0) * q; }
  return Analysis.fit.fit(env, x, a.events, a.opts);
}
function readWav(file) {
  var b = fs.readFileSync(file), fmt = -1, data = -1, i = 12, len = 0;
  while (i + 8 <= b.length) { var id = b.toString('ascii', i, i + 4), sz = b.readUInt32LE(i + 4); if (id === 'fmt ') fmt = i + 8; if (id === 'data') { data = i + 8; len = sz; break; } i += 8 + sz + (sz & 1); }
  var tag = b.readUInt16LE(fmt), ch = b.readUInt16LE(fmt + 2), sr = b.readUInt32LE(fmt + 4), bits = b.readUInt16LE(fmt + 14), n = Math.floor(len / (ch * bits / 8)), x = new Float32Array(n);
  for (var k = 0; k < n; k++) { var s = 0; for (var c = 0; c < ch; c++) { var o = data + (k * ch + c) * bits / 8; s += tag === 3 ? b.readFloatLE(o) : bits === 16 ? b.readInt16LE(o) / 32768 : bits === 24 ? (b.readIntLE(o, 3) / 8388608) : b.readInt32LE(o) / 2147483648; } x[k] = s / ch; }
  return { x: x, sr: sr };
}

async function runSet(o) {
  var h = await open(o), results = [], t0 = Date.now();
  try {
    var cands = h.candidates.filter(function (c) { return !o.only || o.only.indexOf(c.type) >= 0; });
    var jobs = buildSet(o.set, cands, h.specs, o.setSeed);
    if (o.limit) jobs = jobs.slice(0, o.limit);
    var fo = { generations: o.gens, maxRows: o.rows, seed: o.seed };
    if (o.only && o.restrictCandidates) fo.only = o.only;
    for (var j = 0; j < jobs.length; j++) {
      var r = await h.page.evaluate(pageJob, { job: jobs[j], opts: fo }), s = score(jobs[j], r, h.specs[jobs[j].type]);
      s.result = r; results.push(s);
      if (!o.quiet) console.log((s.right ? 'right ' : 'WRONG ') + jobs[j].name + ' -> ' + r.instrument + ' ' + r.distanceDb + ' dB; runner-up ' + (r.runnerUp ? r.runnerUp.instrument + ' ' + r.runnerUp.distanceDb + ' dB' : 'none') +
                              '; ' + r.renders + ' renders, ' + (r.ms / 1000).toFixed(1) + ' s' + (s.slides ? '; slides ' + s.slides.found + '/' + s.slides.truth + ' (+' + s.slides.falsePos + '), accents ' + s.accents.found + '/' + s.accents.truth + ' (+' + s.accents.falsePos + ')' : ''));
    }
  } finally { await h.close(); }
  return { set: o.set, sr: o.sr, seed: o.seed, gens: o.gens, rows: o.rows, candidates: h.candidates, items: results, wallMs: Date.now() - t0, pageErrors: h.errors };
}

function summarize(R) {
  var items = R.items, right = items.filter(function (i) { return i.right; }), s = { items: items.length, right: right.length };
  s.wrong = items.filter(function (i) { return !i.right; }).map(function (i) { return i.name + ' -> ' + i.got; });
  var ms = items.map(function (i) { return i.ms; }).sort(function (a, b) { return a - b; });
  s.msMedian = ms.length ? ms[ms.length >> 1] : null; s.msMax = ms.length ? ms[ms.length - 1] : null;
  var rows = []; right.forEach(function (i) { i.rows.forEach(function (r) { rows.push(r); }); });
  var c = rows.filter(function (r) { return !r.discrete; }), sr = c.filter(function (r) { return r.searched; }), pt = c.filter(function (r) { return r.perturbed; }), pts = pt.filter(function (r) { return r.searched; });
  function cov(a) { return { n: a.length, covered: a.filter(function (r) { return r.covered; }).length, errUMedian: med(a.map(function (r) { return r.errU; })), widthUMedian: med(a.map(function (r) { return r.widthU; })) }; }
  function med(a) { a = a.slice().sort(function (x, y) { return x - y; }); return a.length ? a[a.length >> 1] : null; }
  s.searchedRows = cov(sr); s.perturbedRows = cov(pt); s.perturbedSearched = cov(pts);
  s.perturbedNotSearched = pt.length - pts.length;
  var d = rows.filter(function (r) { return r.discrete; }), dp = d.filter(function (r) { return r.perturbed; });
  s.discrete = { n: d.length, right: d.filter(function (r) { return r.right; }).length, perturbed: dp.length, perturbedRight: dp.filter(function (r) { return r.right; }).length };
  var sl = { truth: 0, found: 0, falsePos: 0, rightSteps: 0, steps: 0 }, ac = { truth: 0, found: 0, falsePos: 0, rightSteps: 0, steps: 0 };
  items.forEach(function (i) { if (i.slides) { ['truth', 'found', 'falsePos', 'rightSteps', 'steps'].forEach(function (k) { sl[k] += i.slides[k]; ac[k] += i.accents[k]; }); } });
  s.slides = sl; s.accents = ac;
  return s;
}

function args(a) {
  var o = { set: null, sr: 22050, seed: 1, gens: 12, rows: 8, setSeed: 5, only: null, limit: 0, out: null, wav: null, events: null, quiet: false };
  for (var i = 0; i < a.length; i++) {
    var k = a[i];
    if (k === '--set') o.set = a[++i]; else if (k === '--sr') o.sr = +a[++i]; else if (k === '--seed') o.seed = +a[++i]; else if (k === '--gens') o.gens = +a[++i];
    else if (k === '--rows') o.rows = +a[++i]; else if (k === '--set-seed') o.setSeed = +a[++i]; else if (k === '--only') o.only = a[++i].split(','); else if (k === '--limit') o.limit = +a[++i];
    else if (k === '--out') o.out = a[++i]; else if (k === '--wav') o.wav = a[++i]; else if (k === '--events') o.events = a[++i]; else if (k === '--quiet') o.quiet = true;
    else if (k === '--restrict') o.restrictCandidates = true;
    else throw new Error('unknown argument ' + k);
  }
  return o;
}

module.exports = { buildSet: buildSet, score: score, summarize: summarize, runSet: runSet, space: space, L303: L303, args: args };

if (require.main === module) (async function () {
  var o;
  try { o = args(process.argv.slice(2)); } catch (e) { console.error('fit.js: ' + e.message); process.exit(2); }
  try {
    if (o.wav) {
      var w = readWav(o.wav), ev = JSON.parse(fs.readFileSync(o.events, 'utf8')), h = await open(o), b = Buffer.from(w.x.buffer, w.x.byteOffset, w.x.byteLength);
      try {
        var r = await h.page.evaluate(pageWav, { b64: b.toString('base64'), sr: w.sr, events: ev, opts: { generations: o.gens, maxRows: o.rows, seed: o.seed, only: o.only } });
        console.log(JSON.stringify(r, null, 1));
      } finally { await h.close(); }
      process.exit(0);
    }
    if (!o.set) { console.error('fit.js: give --set solo|lines|all or --wav with --events'); process.exit(2); }
    var R = await runSet(o), S = summarize(R);
    fs.mkdirSync(OUTDIR, { recursive: true });
    var file = o.out || path.join(OUTDIR, 'results-' + o.set + '.json');
    fs.writeFileSync(file, JSON.stringify({ run: R, summary: S }, null, 1));
    console.log(JSON.stringify(S, null, 1));
    console.log('written ' + path.relative(REPO, file) + '; wall ' + (R.wallMs / 1000).toFixed(1) + ' s; page errors: ' + (R.pageErrors.length ? R.pageErrors.join(' | ') : 'none'));
    process.exit(R.pageErrors.length ? 2 : 0);
  } catch (e) { console.error('fit.js: harness error: ' + (e && e.stack || e)); process.exit(2); }
})();
