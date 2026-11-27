#!/usr/bin/env node
/* tools/rom909-check.js - the owner's TR-909 sample ROMs against app/engine/drums.js (E1, Pressing Crew). OPTIONAL.
 *
 * Usage:   node tools/rom909-check.js [--no-browser]
 * Runs only when local/roms/tr909/ (git-ignored) holds the owner's files; otherwise it prints a note and exits 0.
 * Nothing it reads is written anywhere: the ROM images are Roland's copyright and never enter this repository, so this
 * script prints numbers only (no sample values, no audio, no files in tools/out).
 *
 * 1. identification: Drums.loadRom on each file (size, CRC32 and SHA-1 against MAME's values), the firmware refused by size
 * 2. the 6-bit decoding from the data: per data line, how often it is 1 and how often it toggles; the mean step between
 *    neighbouring samples under each candidate mapping (D0..D5 or D2..D7; offset binary or two's complement); the idle code
 * 3. where each sound starts and ends in its chip (first and last sample 2 codes or more from silence; RMS per 1 K block)
 * 4. (Chromium, worklet-free: plain Web Audio) the engine's ROM voices at their defaults, measured beside the two sample
 *    packs the owner supplied: app/assets/tr909-robroy/ (HHCD*, HHOD*, CSHD*, RIDED*) and local/samples/tr909-pack/
 *    (909 Hat_closed, Hat_open, Crash, Ride): spectral centroid, the strongest line above 1 kHz, the time from the peak to
 *    -20 dB, and the length to -60 dB. Recordings of one unit through one sampler are a reference, not the truth.
 * Exit: 0 (skipped, or every check passed); 1 a check failed; 2 the browser part could not run.
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http');

var ROOT = path.resolve(__dirname, '..'), ROMDIR = path.join(ROOT, 'local', 'roms', 'tr909');
var NOBROWSER = process.argv.indexOf('--no-browser') >= 0;
var fails = 0, checks = 0;
function ok(c, m) { checks++; if (!c) { fails++; console.log('  FAIL ' + m); } else console.log('  ok   ' + m); }
if (!fs.existsSync(ROMDIR)) { console.log('rom909-check: local/roms/tr909/ not found: skipped (the owner\'s ROM images are not on this machine)'); process.exit(0); }

var sb = { console: console, Math: Math, Float32Array: Float32Array, WeakMap: WeakMap, Promise: Promise };
sb.window = sb; vm.createContext(sb);
['core', 'drums'].forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(ROOT, 'app', 'engine', f + '.js'), 'utf8'), sb, { filename: f + '.js' }); });
var D = sb.Drums, CH = D.ROMCHIPS, bytes = {};

console.log('1. identification');
fs.readdirSync(ROMDIR).sort().forEach(function (f) {
  var u = new Uint8Array(fs.readFileSync(path.join(ROMDIR, f))), r = D.loadRom(u);
  if (r.ok) bytes[r.chip] = u;
  console.log('   ' + f + ': ' + u.length + ' bytes -> ' + (r.ok ? r.chip + (r.verified ? ' (verified ' + r.crc32 + ' ' + r.sha1.slice(0, 8) + '...)' : ' (UNVERIFIED)') : 'refused: ' + r.error));
});
['hat', 'crash', 'ride'].forEach(function (k) { ok(!!bytes[k] && D.romStatus().chips[k].verified && D.romStatus().chips[k].file === CH[k].file, k + ' chip (' + CH[k].part + ', ' + CH[k].ic + ') identified by checksum'); });
if (!bytes.hat || !bytes.crash || !bytes.ride) { console.log('FAILED: not all three chips present'); process.exit(1); }

console.log('2. the 6-bit decoding');
var maps = {
  'D2..D7 offset binary': function (v) { return (v >> 2) - 32; }, 'D2..D7 two\'s complement': function (v) { var c = v >> 2; return c >= 32 ? c - 64 : c; },
  'D0..D5 offset binary': function (v) { return (v & 63) - 32; }, 'D0..D5 two\'s complement': function (v) { var c = v & 63; return c >= 32 ? c - 64 : c; }
};
var verdict = {};
['hat', 'crash', 'ride'].forEach(function (k) {
  var u = bytes[k], ones = [], tog = [], b, i;
  for (b = 0; b < 8; b++) { ones.push(0); tog.push(0); }
  for (i = 0; i < u.length; i++) for (b = 0; b < 8; b++) { if (u[i] >> b & 1) ones[b]++; if (i && ((u[i] ^ u[i - 1]) >> b & 1)) tog[b]++; }
  console.log('   ' + k + ': bit D0..D7 is 1 in ' + ones.map(function (x) { return Math.round(100 * x / u.length) + '%'; }).join(' ') + '; toggles ' + tog.map(function (x) { return Math.round(100 * x / u.length) + '%'; }).join(' '));
  var steps = {};
  Object.keys(maps).forEach(function (m) { var s = 0; for (i = 1; i < u.length; i++) s += Math.abs(maps[m](u[i]) - maps[m](u[i - 1])); steps[m] = Math.round(100 * s / u.length) / 100; });
  console.log('      mean |step| in codes: ' + JSON.stringify(steps));
  var tail = {}; for (i = u.length - 256; i < u.length; i++) tail[u[i]] = (tail[u[i]] || 0) + 1;
  console.log('      the last 256 bytes: ' + JSON.stringify(tail) + ' (byte -> count)');
  var best = Object.keys(steps).sort(function (a, c) { return steps[a] - steps[c]; })[0];
  verdict[k] = { best: best, idle: Object.keys(tail).sort(function (a, c) { return tail[c] - tail[a]; })[0] | 0 };
  if (k === 'hat') { var lo = 0, loFrom = -1; for (i = 0; i < u.length; i++) if (u[i] & 3) { lo++; if (loFrom < 0) loFrom = i; } console.log('      bytes with D0 or D1 set: ' + lo + ', the first at 0x' + loFrom.toString(16)); }
});
ok(['hat', 'crash', 'ride'].every(function (k) { return verdict[k].best === 'D2..D7 offset binary'; }), 'the smoothest mapping on all three chips is D2..D7 offset binary (the engine\'s decoding)');
ok(['hat', 'crash', 'ride'].every(function (k) { return verdict[k].idle === 128; }), 'every chip idles at byte 0x80 = code 32 (silence), so zero is code 32');
ok(bytes.crash.every(function (v) { return (v & 3) === 0; }) && bytes.ride.every(function (v) { return (v & 3) === 0; }), 'D0 and D1 are always 0 on the crash and ride chips');
var dec = D.decodeRom(bytes.hat), exact = true;
for (var q = 0; q < dec.length; q++) if (dec[q] !== ((bytes.hat[q] >> 2) - 32) / 32) { exact = false; break; }
ok(exact, 'Drums.decodeRom is (byte >> 2) - 32, over 32, on every byte');

console.log('3. where the sounds are');
function region(u, a, e, name) {
  var first = -1, last = -1, i, blocks = [];
  for (i = a; i < e; i++) if (Math.abs((u[i] >> 2) - 32) >= 2) { if (first < 0) first = i; last = i; }
  for (i = a; i < e; i += 1024) { var s = 0; for (var j = i; j < Math.min(e, i + 1024); j++) { var x = (u[j] >> 2) - 32; s += x * x; } blocks.push(Math.round(10 * Math.sqrt(s / 1024)) / 10); }
  console.log('   ' + name + ' window 0x' + a.toString(16) + '-0x' + (e - 1).toString(16) + ': sound from 0x' + first.toString(16) + ' to 0x' + last.toString(16) + ' (' + (last - first + 1) + ' samples, ' + ((last - first + 1) / 30000).toFixed(3) + ' s at 30 kHz); RMS (codes) per 1 K: ' + blocks.join(' '));
  return { first: first, last: last, blocks: blocks };
}
var W = D.ROMWIN, rOh = region(bytes.hat, W.oh909.from, W.oh909.to, 'open hat '), rCh = region(bytes.hat, W.ch909.from, W.ch909.to, 'closed hat'), rCr = region(bytes.crash, 0, 0x8000, 'crash     '), rRd = region(bytes.ride, 0, 0x8000, 'ride      ');
ok(rOh.first < 16 && rOh.blocks[rOh.blocks.length - 1] < 0.3 * rOh.blocks[0], 'the open hat starts at 0x0000 and has decayed by 0x5FFF');
ok(rCh.first > 0x6000 && rCh.first < 0x6100 && rCh.blocks[0] > 2 * rOh.blocks[rOh.blocks.length - 1], 'the closed hat is a second recording: silence at 0x6000, a fresh attack a few samples later, louder than the open hat\'s tail');
ok(rCr.first < 16 && rRd.first < 16 && rCr.last > 0x7000 && rRd.last > 0x7000, 'crash and ride start at 0x0000 and run nearly to the end of their chips');

if (NOBROWSER) finish();
else browserPart().then(finish, function (e) { console.log('rom909-check: browser part failed: ' + (e && e.message)); process.exit(2); });

function finish() {
  console.log(fails ? 'FAILED: ' + fails + ' of ' + checks + ' checks failed' : 'OK: ' + checks + ' checks passed');
  process.exit(fails ? 1 : 0);
}

// ------------------------------------------------------------------ 4. the engine's ROM voices against the sample packs
function readWav(file) {
  var b = fs.readFileSync(file), i = 12, fmt = null, data = null;
  while (i + 8 <= b.length) {
    var id = b.toString('ascii', i, i + 4), n = b.readUInt32LE(i + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(i + 10), sr: b.readUInt32LE(i + 12), bits: b.readUInt16LE(i + 22) };
    if (id === 'data') { data = b.slice(i + 8, Math.min(b.length, i + 8 + n)); break; }
    i += 8 + n + (n & 1);
  }
  if (!fmt || !data || fmt.bits !== 16) return null;
  var N = Math.floor(data.length / 2 / fmt.ch), x = new Float32Array(N);
  for (var k = 0; k < N; k++) { var s = 0; for (var c = 0; c < fmt.ch; c++) s += data.readInt16LE((k * fmt.ch + c) * 2); x[k] = s / fmt.ch / 32768; }
  return { x: x, sr: fmt.sr };
}
function fft(re, im) {
  var n = re.length, i, j, k, l;
  for (i = 1, j = 0; i < n; i++) { var bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (l = 2; l <= n; l <<= 1) { var ang = -2 * Math.PI / l, wr = Math.cos(ang), wi = Math.sin(ang);
    for (i = 0; i < n; i += l) { var cr = 1, ci = 0; for (k = 0; k < l / 2; k++) { var a = i + k, b = a + l / 2, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr; re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi; var nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } }
}
function measure(x, sr) {
  var fr = Math.round(0.005 * sr), env = [], i, pk = 0, pi = 0;
  for (i = 0; i + fr <= x.length; i += fr) { var s = 0; for (var j = i; j < i + fr; j++) s += x[j] * x[j]; env.push(Math.sqrt(s / fr)); }
  env.forEach(function (e, k) { if (e > pk) { pk = e; pi = k; } });
  var on = 0; while (on < env.length && env[on] < pk * 0.01) on++;
  var d20 = pi; while (d20 < env.length && env[d20] > pk * 0.1) d20++;
  var l60 = env.length - 1; while (l60 > 0 && env[l60] < pk * 0.001) l60--;
  var a = on * fr, n = 2048, P = new Float64Array(n / 2), cnt = 0, re = new Float64Array(n), im = new Float64Array(n), end = Math.min(x.length, (l60 + 1) * fr);
  for (var st = a; cnt === 0 || st + n <= end; st += n / 2) {          // at least one frame (a short sound is zero-padded)
    for (i = 0; i < n; i++) { re[i] = (x[st + i] || 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1))); im[i] = 0; }
    fft(re, im); for (i = 0; i < n / 2; i++) P[i] += re[i] * re[i] + im[i] * im[i]; cnt++;
  }
  var sw = 0, sp = 0, best = 0, bf = 0;
  for (i = 1; i < n / 2; i++) { var f = i * sr / n; sw += f * P[i]; sp += P[i]; if (f > 1000 && P[i] > best) { best = P[i]; bf = f; } }
  return { centroidHz: Math.round(sp ? sw / sp : 0), lineHz: Math.round(bf), decay20ms: Math.round((d20 - pi) * 5), length60ms: Math.round((l60 - on + 1) * 5) };
}
function browserPart() {
  var playwright;
  try { playwright = require('playwright'); } catch (e) { try { playwright = require('/opt/node22/lib/node_modules/playwright'); } catch (e2) { return Promise.reject(new Error('no Playwright')); } }
  var server = http.createServer(function (req, res) {
    var p = decodeURIComponent(req.url.split('?')[0]), file = path.normalize(path.join(ROOT, p)), h = { 'Cache-Control': 'no-store' };
    if (file.indexOf(ROOT) !== 0) { res.writeHead(403, h); return res.end(); }
    fs.readFile(file, function (e, d) { if (e) { res.writeHead(p === '/favicon.ico' ? 204 : 404, h); return res.end(); } h['Content-Type'] = /\.js$/.test(file) ? 'application/javascript' : (/\.html$/.test(file) ? 'text/html' : 'application/octet-stream'); res.writeHead(200, h); res.end(d); });
  });
  var browser;
  return new Promise(function (r) { server.listen(0, '127.0.0.1', r); }).then(function () { return playwright.chromium.launch(); }).then(function (b) {
    browser = b; return b.newPage();
  }).then(function (page) {
    return page.goto('http://127.0.0.1:' + server.address().port + '/app/index.html').then(function () {
      return page.waitForFunction(function () { return !!(window.Drums && window.Drums.romReady); });
    }).then(function () {
      return page.evaluate(async function () {
        await Drums.romReady();
        var st = Drums.romStatus(), out = { auto: st.auto, loaded: st.loaded, verified: st.verified, v: {} };
        var types = ['ch909', 'oh909', 'cr909', 'rd909'];
        var runs = [];
        types.forEach(function (t) { runs.push([t, 1, null], [t, 0, null]); });
        runs.push(['cr909', 1, -0.5], ['cr909', 1, 0.5], ['rd909', 1, -0.5], ['rd909', 1, 0.5], ['ch909', 1, 'dmax'], ['oh909', 1, 'dmax']);
        for (var i = 0; i < runs.length; i++) {
          var rom = runs[i][1], o = { rom: rom };
          if (typeof runs[i][2] === 'number') o.tune = runs[i][2]; else if (runs[i][2] === 'dmax') o.decay = 1;
          var oc = new OfflineAudioContext(1, 44100 * 1.6, 44100), inst = Drums.create(oc, runs[i][0], o);
          inst.out.connect(oc.destination); inst.trigger(0.01, { vel: 1, step: 2 });
          var b = await oc.startRendering(), d = b.getChannelData(0), pk = 0;
          for (var k = 0; k < d.length; k++) pk = Math.max(pk, Math.abs(d[k]));
          out.v[runs[i][0] + (rom ? '' : ':synth') + (runs[i][2] == null ? '' : ':' + runs[i][2])] = { pk: pk, x: Array.prototype.slice.call(d) };
        }
        return out;
      });
    }).then(function (r) {
      console.log('4. the engine\'s voices (defaults, accent step, vel 1) beside the sample packs (Chromium)');
      ok(r.auto === 'loaded' && r.loaded.length === 3 && r.verified, 'the page picked the three ROMs up by itself from local/roms/tr909/ (Drums.romStatus().auto = ' + r.auto + ')');
      ok(['ch909', 'oh909', 'cr909', 'rd909'].every(function (t) { return r.v[t].pk > 0.05 && r.v[t].pk < 1; }), 'every ROM voice sounds and peaks under 1.0 (' + ['ch909', 'oh909', 'cr909', 'rd909'].map(function (t) { return t + ' ' + r.v[t].pk.toFixed(2); }).join(', ') + ')');
      var rows = [];
      var add = function (name, x, sr) { var m = measure(x, sr); m.name = name; rows.push(m); };
      ['ch909', 'oh909', 'cr909', 'rd909'].forEach(function (t) { add('engine ROM ' + t, Float32Array.from(r.v[t].x), 44100); add('engine synth ' + t, Float32Array.from(r.v[t + ':synth'].x), 44100); });
      ['ch909:dmax', 'oh909:dmax', 'cr909:-0.5', 'cr909:0.5', 'rd909:-0.5', 'rd909:0.5'].forEach(function (t) { add('engine ROM ' + t.replace('dmax', 'decay max').replace(':-0.5', ' tune min').replace(':0.5', ' tune max'), Float32Array.from(r.v[t].x), 44100); });
      var RR = path.join(ROOT, 'app', 'assets', 'tr909-robroy'), PK = path.join(ROOT, 'local', 'samples', 'tr909-pack');
      ['HHCD0', 'HHCD4', 'HHCDA', 'HHOD0', 'HHOD4', 'HHODA', 'CSHD0', 'CSHD4', 'CSHDA', 'RIDED0', 'RIDED4', 'RIDEDA'].forEach(function (f) { var w = readWav(path.join(RR, f + '.WAV')); if (w) add('robroy ' + f, w.x, w.sr); });
      ['909 Hat_closed', '909 Hat_open', '909 Crash', '909 Ride'].forEach(function (f) { var p = path.join(PK, f + '.WAV'); if (fs.existsSync(p)) { var w = readWav(p); if (w) add('pack ' + f, w.x, w.sr); } });
      console.log('   ' + ['name'.padEnd(26), 'centroid Hz', 'line Hz', 'peak->-20 dB ms', 'length to -60 dB ms'].join(' | '));
      rows.forEach(function (m) { console.log('   ' + [m.name.padEnd(26), String(m.centroidHz).padStart(11), String(m.lineHz).padStart(7), String(m.decay20ms).padStart(15), String(m.length60ms).padStart(19)].join(' | ')); });
      return browser.close();
    });
  }).then(function () { server.close(); }, function (e) { try { browser && browser.close(); } catch (x) {} server.close(); throw e; });
}
