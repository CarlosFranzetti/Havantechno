#!/usr/bin/env node
// tools/render.js: render song sections offline through the page's own engine.
//
// Usage:
//   node tools/render.js [--page studio|app|/path/index.html] [--sections a,b,...] [--bars a:b | --bars N]
//                        [--sr 44100] [--tail 2.5] [--out tools/out]
//
//   --page      studio (default): the archived page "olde Havantechno dub studio/index.html", which
//               renders with Sequencer.render(function (s) { Song.build(s); }, opts).
//               app: app/index.html, which renders with Host.create().render({from, to}) (CONTRACT A1).
//               Any other value is a repo-relative path to a page that exposes one of the two.
//   --sections  comma-separated section names from the page's own arrangement (default: all).
//   --bars      a:b renders bars a..b-1 relative to each selected section's start (absolute song bars
//               when no --sections is given). A single integer N means 0:N.
//   --song      baseline (default: Song.GUIDANCE on the archived page, Song.document() in the app), v2
//               (Song.GUIDANCE_V2 on the archived page if it exists, Song.documentV2() in the app) or v3
//               (Song.documentV3() in the app only; the Ear Crew's GUIDANCE_V3). Non-baseline renders get a
//               -v2 / -v3 file suffix.
//   --tail      seconds of ringing tail rendered after the last bar (default 2.5, the archived default).
//   --seed      seed for Math.random in the page (default 1). The archived engine draws its noise and
//               jitter from Math.random (core.js, synths.js), so each job re-seeds it: the same bars with
//               the same seed render to identical bytes.
//
// Output: tools/out/<name>.wav (16-bit PCM, via Sequencer.wav or Host.wav) and tools/out/<name>.json
// (sidecar: bar range, sample rate, bpm, swing and the sample position of bar `from`, which score.py
// uses to line the render up with the reference).
'use strict';

var fs = require('fs');
var path = require('path');
var http = require('http');

var REPO = path.resolve(__dirname, '..');
var DEFAULT_OUT = path.join(__dirname, 'out');
var CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
var PAGES = {
  studio: '/olde Havantechno dub studio/index.html',
  app: '/app/index.html'
};
// The archived engine starts scheduling at t0 = 0.05 s (sequencer.js, render()).
var SCHEDULE_T0 = 0.05;
var MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8'
};
var ISOLATION = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin'
};

function fail(msg) { process.stderr.write('render.js: ' + msg + '\n'); process.exit(2); }

function parseArgs(argv) {
  var o = { page: 'studio', song: 'baseline', solo: null, sections: null, bars: null, sr: 44100, tail: 2.5, seed: 1, out: DEFAULT_OUT };
  for (var i = 0; i < argv.length; i++) {
    var a = argv[i];
    var next = function () { if (i + 1 >= argv.length) fail(a + ' needs a value'); return argv[++i]; };
    if (a === '--page') o.page = next();
    else if (a === '--sections') o.sections = next().split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    else if (a === '--bars') {
      var v = next();
      if (v.indexOf(':') >= 0) {
        var p = v.split(':');
        o.bars = { a: parseInt(p[0], 10), b: parseInt(p[1], 10) };
      } else {
        o.bars = { a: 0, b: parseInt(v, 10) };
      }
      if (!(o.bars.a >= 0 && o.bars.b > o.bars.a)) fail('bad --bars ' + v);
    }
    else if (a === '--sr') o.sr = parseInt(next(), 10);
    else if (a === '--tail') o.tail = parseFloat(next());
    else if (a === '--seed') o.seed = parseInt(next(), 10);
    else if (a === '--song') o.song = next();
    else if (a === '--solo') o.solo = next().split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    else if (a === '--out') o.out = path.resolve(next());
    else if (a === '-h' || a === '--help') { process.stdout.write(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 17).join('\n') + '\n'); process.exit(0); }
    else fail('unknown argument ' + a);
  }
  if (!(o.sr > 0)) fail('bad --sr');
  if (['baseline', 'v2', 'v3'].indexOf(o.song) < 0) fail('--song must be baseline, v2 or v3');
  if (o.solo && o.page !== 'app') fail('--solo needs --page app (Host.solo)');
  return o;
}

function pagePath(name) {
  var p = PAGES[name] || name;
  if (p.charAt(0) !== '/') p = '/' + p;
  return p;
}

function startServer(root) {
  return new Promise(function (resolve, reject) {
    var server = http.createServer(function (req, res) {
      var urlPath;
      try { urlPath = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
      if (urlPath === '/favicon.ico') { res.writeHead(204); return res.end(); }
      if (urlPath.charAt(urlPath.length - 1) === '/') urlPath += 'index.html';
      var file = path.normalize(path.join(root, urlPath));
      if (file.indexOf(root + path.sep) !== 0) { res.writeHead(403); return res.end(); }
      fs.readFile(file, function (err, data) {
        if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('not found'); }
        var headers = Object.assign({ 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }, ISOLATION);
        res.writeHead(200, headers);
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', function () { resolve(server); });
  });
}

// ---- code that runs inside the page -------------------------------------------------------
// Returns the page's kind, its sections and song-level settings. Bar starts are cumulative.
function pageLayout(song) {
  var kind, sections, totalBars, bpm, swing;
  if (window.Host && typeof window.Host.create === 'function') {
    kind = 'app';
    if (song === 'v2') {
      if (!window.Song || typeof window.Song.documentV2 !== 'function') throw new Error('Song.documentV2 is missing');
      window.__host = window.Host.create({ doc: window.Song.documentV2() });
    } else if (song === 'v3') {
      if (!window.Song || typeof window.Song.documentV3 !== 'function') throw new Error('Song.documentV3 is not on this page (A7 has not landed GUIDANCE_V3 yet)');
      window.__host = window.Host.create({ doc: window.Song.documentV3() });
    } else {
      window.__host = window.Host.create();
    }
    if (typeof window.__host.render !== 'function') throw new Error('Host.render is missing');
    sections = window.__host.sections().map(function (s) { return { name: s.name, start: s.start, bars: s.bars }; });
    totalBars = window.__host.totalBars();
    bpm = window.__host.bpm();
    swing = window.__host.swing();
  } else if (window.Sequencer && window.Song) {
    kind = 'studio';
    if (song === 'v2' && !window.Song.GUIDANCE_V2) throw new Error('Song.GUIDANCE_V2 is not on this page');
    if (song === 'v3') throw new Error('--song v3 needs the app page (Song.documentV3 is not on the archived page)');
    var dry = window.Sequencer.create(null, {});
    window.Song.build(dry, song === 'v2' ? window.Song.GUIDANCE_V2 : undefined);
    sections = dry.sections.map(function (s) { return { name: s.name, start: s.start, bars: s.bars }; });
    totalBars = dry.totalBars;
    bpm = dry.bpm;
    swing = dry.swing;
  } else {
    throw new Error('neither Host nor Sequencer+Song is on this page');
  }
  return { kind: kind, sections: sections, totalBars: totalBars, bpm: bpm, swing: swing };
}

// Latency of the page's own chain: a one-bar solo render of the sub (or the kick if the song has no sub),
// master on. Returns the first sample above 1e-4 (channel 0) and the track used. The scheduled grid is
// sample 2205 (bar 0 at 0.05 s); the difference is the chain latency (E1: 722 samples, 16.4 ms, from the
// glue compressor and the limiter; measured in A9's scratch test, see tools/README.md).
async function pageLatency() {
  var name, buf;
  if (window.__host) {
    var names = (window.__host.tracks() || []).map(function (t) { return t.name; });
    name = names.indexOf('sub') >= 0 ? 'sub' : (names.indexOf('kick') >= 0 ? 'kick' : null);
    if (!name) return null;
    window.__host.solo(name, true);
    try { buf = await window.__host.render({ from: 0, to: 1, sampleRate: 44100, tail: 0.05 }); }
    finally { window.__host.solo(name, false); }
  } else {
    var dry = window.Sequencer.create(null, {});
    window.Song.build(dry);
    name = dry.tracks.sub ? 'sub' : (dry.tracks.kick ? 'kick' : null);
    if (!name) return null;
    buf = await window.Sequencer.render(function (s) { window.Song.build(s); s.solo(name, true); }, { from: 0, to: 1, sampleRate: 44100, tail: 0.05 });
  }
  var x = buf.getChannelData(0), first = -1;
  for (var i = 0; i < x.length; i++) if (Math.abs(x[i]) > 1e-4) { first = i; break; }
  return { track: name, first: first };
}

// Renders bars [from, to) through the page's own offline renderer; keeps the WAV bytes in the page.
async function pageRender(job) {
  var t0 = performance.now();
  if (typeof Math.random.reset === 'function') Math.random.reset(job.seed);
  var buf;
  if (window.__host) {
    (job.solo || []).forEach(function (name) { window.__host.solo(name, true); });
    buf = await window.__host.render({ from: job.from, to: job.to, sampleRate: job.sr, tail: job.tail });
  } else {
    buf = await window.Sequencer.render(function (s) {
      window.Song.build(s, job.song === 'v2' ? window.Song.GUIDANCE_V2 : undefined);
    }, { from: job.from, to: job.to, sampleRate: job.sr, tail: job.tail });
  }
  var ab = (window.__host && typeof window.__host.wav === 'function') ? window.__host.wav(buf) : window.Sequencer.wav(buf);
  window.__wav = new Uint8Array(ab);
  return { bytes: window.__wav.length, channels: buf.numberOfChannels, sampleRate: buf.sampleRate, length: buf.length, ms: performance.now() - t0 };
}

// Base64 of one slice of the stored WAV (keeps each transfer small).
function pageChunk(arg) {
  var o = arg[0], n = arg[1], u = window.__wav.subarray(o, o + n), s = '';
  for (var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, Math.min(i + 0x8000, u.length)));
  return btoa(s);
}
// ----------------------------------------------------------------------------------------------

function selectJobs(layout, opts) {
  var jobs = [];
  var names = opts.sections;
  if (!names && !opts.bars) names = layout.sections.map(function (s) { return s.name; });
  if (!names) {
    // --bars alone: absolute song bars
    jobs.push({ name: 'bars-' + opts.bars.a + '-' + opts.bars.b, section: null, from: opts.bars.a, to: Math.min(opts.bars.b, layout.totalBars) });
    return jobs;
  }
  names.forEach(function (n) {
    var sec = layout.sections.filter(function (s) { return s.name === n; })[0];
    if (!sec) fail('unknown section "' + n + '". Page sections: ' + layout.sections.map(function (s) { return s.name; }).join(', '));
    var a = 0, b = sec.bars;
    if (opts.bars) { a = Math.min(opts.bars.a, sec.bars); b = Math.min(opts.bars.b, sec.bars); }
    if (b <= a) fail('empty bar range for section ' + n);
    var partial = !!opts.bars;
    jobs.push({
      name: partial ? (n + '-' + a + '-' + b) : n,
      section: n, from: sec.start + a, to: sec.start + b
    });
  });
  return jobs;
}

async function main() {
  var opts = parseArgs(process.argv.slice(2));
  var playwright = null, tried = [];
  ['playwright', '/opt/node22/lib/node_modules/playwright'].some(function (m) {
    try { playwright = require(m); return true; } catch (e) { tried.push(m); return false; }
  });
  if (!playwright) fail('Playwright not found (tried ' + tried.join(', ') + ')');
  if (!fs.existsSync(CHROMIUM)) fail('Chromium not found at ' + CHROMIUM + ' (set CHROMIUM_PATH)');

  fs.mkdirSync(opts.out, { recursive: true });
  var server = await startServer(REPO);
  var port = server.address().port;
  var pageUrl = 'http://127.0.0.1:' + port + encodeURI(pagePath(opts.page));
  var browser = await playwright.chromium.launch({
    executablePath: CHROMIUM, headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox']
  });
  var pageErrors = [];
  // Test harness only: a seeded Math.random (mulberry32), installed before any page script runs.
  var SEEDED_RANDOM = 'var __seedGen = null; (function () { var a = 0;' +
    ' function mk(s) { a = s >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a);' +
    ' t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }' +
    ' var g = mk(' + (opts.seed | 0) + '); var r = function () { return g(); }; r.reset = function (v) { g = mk(v); };' +
    ' Math.random = r; })();';
  var exitCode = 0;
  try {
    var page = await browser.newPage();
    await page.addInitScript({ content: SEEDED_RANDOM });
    page.on('pageerror', function (e) { pageErrors.push('pageerror: ' + e.message); });
    page.on('console', function (m) { if (m.type() === 'error') pageErrors.push('console.error: ' + m.text()); });
    var tLoad = performance.now();
    await page.goto(pageUrl, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(function () { return !!(window.Sequencer || window.Host); }, null, { timeout: 30000 });
    var layout = await page.evaluate(pageLayout, opts.song);
    var SCHEDULED_GRID = Math.round(SCHEDULE_T0 * opts.sr);
    var lat = await page.evaluate(pageLatency);
    var latency = lat && lat.first >= 0 ? lat.first - SCHEDULED_GRID : 0;
    if (!lat || lat.first < 0) console.log('latency: not measured (no sub or kick track); assuming 0 samples');
    else console.log('latency: ' + latency + ' samples (' + (latency / opts.sr * 1000).toFixed(2) + ' ms), measured on a solo ' + lat.track + ' render');
    console.log('page: ' + pageUrl + ' (' + layout.kind + ', loaded in ' + ((performance.now() - tLoad) / 1000).toFixed(2) + ' s)');
    console.log('song: ' + layout.totalBars + ' bars at ' + layout.bpm + ' bpm, swing ' + layout.swing +
      ', sections: ' + layout.sections.map(function (s) { return s.name + ' ' + s.start + '+' + s.bars; }).join(', '));

    var jobs = selectJobs(layout, opts);
    var gridStart = SCHEDULED_GRID + latency;   // the grid as it appears in the WAV
    for (var j = 0; j < jobs.length; j++) {
      var job = jobs[j];
      job.sr = opts.sr; job.tail = opts.tail; job.seed = opts.seed; job.song = opts.song;
      // archived-page renders keep plain names; other pages get a prefix so the two never overwrite each other
      if (opts.page !== 'studio') job.name = (opts.page === 'app' ? 'app' : 'page') + '-' + job.name;
      if (opts.song !== 'baseline') job.name += '-' + opts.song;
      job.solo = opts.solo;
      if (opts.solo) job.name += '-solo-' + opts.solo.join('-');
      var r = await page.evaluate(pageRender, job);
      var nBytes = r.bytes, parts = [], CH = 4 * 1024 * 1024;
      for (var o = 0; o < nBytes; o += CH) {
        parts.push(Buffer.from(await page.evaluate(pageChunk, [o, Math.min(CH, nBytes - o)]), 'base64'));
      }
      var wavPath = path.join(opts.out, job.name + '.wav');
      fs.writeFileSync(wavPath, Buffer.concat(parts));
      var barSec = 4 * 60 / layout.bpm;
      var side = {
        name: job.name, page: opts.page, kind: layout.kind, section: job.section, song: opts.song,
        from: job.from, to: job.to, bars: job.to - job.from,
        sampleRate: r.sampleRate, channels: r.channels, lengthSamples: r.length,
        bpm: layout.bpm, swing: layout.swing, tailSeconds: opts.tail,
        // gridStartSample is where bar `from` (step 0) sits in the WAV: the scheduled start (0.05 s, sample 2205)
        // plus the chain latency. scheduledGridSample and latencySamples are kept for transparency.
        gridStartSample: gridStart,
        scheduledGridSample: SCHEDULED_GRID,
        latencySamples: latency,
        latencyMeasuredOn: lat ? lat.track : null,
        barSeconds: barSec,
        wav: path.relative(REPO, wavPath)
      };
      fs.writeFileSync(path.join(opts.out, job.name + '.json'), JSON.stringify(side, null, 2) + '\n');
      console.log('rendered ' + job.name + ': bars ' + job.from + '..' + (job.to - 1) + ' (' + (job.to - job.from) +
        ' bars, ' + (r.length / r.sampleRate).toFixed(2) + ' s incl. tail) in ' + (r.ms / 1000).toFixed(2) + ' s -> ' +
        path.relative(REPO, wavPath));
    }
    if (pageErrors.length) {
      console.log('page errors/console errors during the run:');
      pageErrors.slice(0, 20).forEach(function (e) { console.log('  ' + e); });
      if (pageErrors.some(function (e) { return e.indexOf('pageerror') === 0; })) exitCode = 1;
    } else {
      console.log('page errors: none');
    }
  } catch (e) {
    console.error('render.js: ' + (e && e.message ? e.message.split('\n')[0] : e));
    exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
  process.exitCode = exitCode;
}

main();
