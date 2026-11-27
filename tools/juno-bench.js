#!/usr/bin/env node
/* tools/juno-bench.js - the HVT-106 (`juno`) chorus on the worklet path in headless Chromium (E1, Pressing Crew).
 *
 * Usage:   node tools/juno-bench.js [--proc <classics-processor.js>] [--out tools/out/juno-bench.json] [--compare <older.json>]
 *          node tools/juno-bench.js --demos [--proc <file>] [--suffix -before]
 * --proc   serve another copy of app/engine/worklets/classics-processor.js in its place (a "before" snapshot), so the same
 *          bench measures the old and the new chorus; the engine scripts are the working tree's either way.
 * Exit:    0 measured and written; 2 the harness could not run (no Playwright, no Chromium, no worklet).
 *
 * Every render is a stereo OfflineAudioContext at 44.1 kHz with one Classics juno at level 1 (no channel strip, no master).
 * Signals reach the chorus through the processor's bench input (Classics.create opts `_probe: true`: one node input summed
 * into the voice bus before the HPF; not a parameter, used only here). With no notes the voices are silent, so the left
 * output is 0.44 x + 0.56 wetL and the wet part is (L - 0.44 x) / 0.56, x the input.
 * Measured: (1) the chorus filters' magnitude response: analytic from the processor's own tables, and measured wet / input
 * with white noise per mode (Welch, 4096-point Hann); (2) the delay sweep per mode and side: an impulse every 25 ms, the
 * lag of the wet peak (parabolic), its minimum, maximum and the sweep rate; (3) left/right correlation per mode on a held
 * A3 (as P5) and on the chord progression; (4) the noise floor with no signal at chorusNoise 0, the default and 1, in
 * dBFS and in dB re one voice's dry RMS (A2 held, chorus off); (5) CPU: render time of 16 s of the chord progression,
 * best of three, chorus off / I / II.
 */
'use strict';
var http = require('http'), fs = require('fs'), path = require('path');

var ROOT = path.resolve(__dirname, '..');
var SR = 44100;
var args = process.argv.slice(2), arg = function (k) { var i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
var OUT = path.resolve(arg('--out') || path.join(ROOT, 'tools', 'out', 'juno-bench.json'));
var CMP = arg('--compare'), DEMOS = args.indexOf('--demos') >= 0, SUFFIX = arg('--suffix') || '', PROC = arg('--proc');
var PROC_URL = '/app/engine/worklets/classics-processor.js';

// ------------------------------------------------------------------ analysis
function fft(re, im) {
  var n = re.length, i, j, k, l;
  for (i = 1, j = 0; i < n; i++) { var bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (l = 2; l <= n; l <<= 1) {
    var ang = -2 * Math.PI / l, wr = Math.cos(ang), wi = Math.sin(ang);
    for (i = 0; i < n; i += l) { var cr = 1, ci = 0; for (k = 0; k < l / 2; k++) {
      var a = i + k, b = a + l / 2, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
      re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
      var nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } }
  }
}
function psd(x, n) {                                     // Welch, Hann, 50 % overlap
  var acc = new Float64Array(n / 2), cnt = 0, re = new Float64Array(n), im = new Float64Array(n), i;
  for (var s = 0; s + n <= x.length; s += n / 2) {
    for (i = 0; i < n; i++) { re[i] = x[s + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1))); im[i] = 0; }
    fft(re, im);
    for (i = 0; i < n / 2; i++) acc[i] += re[i] * re[i] + im[i] * im[i];
    cnt++;
  }
  for (i = 0; i < n / 2; i++) acc[i] /= Math.max(1, cnt);
  return acc;
}
function db(v) { return 20 * Math.log10(Math.abs(v) + 1e-30); }
function rms(x, a, b) { var s = 0, n = 0; a = a || 0; b = b == null ? x.length : b; for (var i = a; i < b; i++) { s += x[i] * x[i]; n++; } return Math.sqrt(s / Math.max(1, n)); }
function corr(a, b, from) { var sa = 0, sb = 0, sab = 0, ma = 0, mb = 0, n = 0, i; from = from || 0; for (i = from; i < a.length; i++) { ma += a[i]; mb += b[i]; n++; } ma /= n; mb /= n; for (i = from; i < a.length; i++) { var x = a[i] - ma, y = b[i] - mb; sa += x * x; sb += y * y; sab += x * y; } return sab / Math.sqrt(sa * sb + 1e-30); }
function r1(v) { return Math.round(v * 10) / 10; }
function r2(v) { return Math.round(v * 100) / 100; }
function r3(v) { return Math.round(v * 1000) / 1000; }

// ------------------------------------------------------------------ server (COOP/COEP like tools/serve.js); --proc swaps the processor
var MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
function serve() {
  return http.createServer(function (req, res) {
    var p = decodeURIComponent(req.url.split('?')[0]), file = path.normalize(path.join(ROOT, p));
    var h = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cross-Origin-Resource-Policy': 'same-origin', 'Cache-Control': 'no-store' };
    if (PROC && p === PROC_URL) file = path.resolve(PROC);
    else if (file.indexOf(ROOT) !== 0) { res.writeHead(403, h); return res.end(); }
    fs.readFile(file, function (e, d) {
      if (e) { res.writeHead(p === '/favicon.ico' ? 204 : 404, h); return res.end(); }
      h['Content-Type'] = MIME[path.extname(file)] || 'application/octet-stream';
      res.writeHead(200, h); res.end(d);
    });
  });
}

// in the page: one juno, notes, an optional input signal; returns base64 Float32 L and R and the render time
function pageHelper() {
  window.__b64 = function (f) { var u = new Uint8Array(f.buffer, f.byteOffset, f.byteLength), s = '', i; for (i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  window.__sig = function (kind, n) {
    var x = new Float32Array(n), i, s = 12345;
    if (kind === 'noise') for (i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; x[i] = 0.25 * (s / 2147483648 - 1); }
    else if (kind === 'clicks') for (i = 2205; i < n; i += 1102) x[i] = 0.5;     // an impulse every 25 ms (1102.5 samples, kept integral)
    return x;
  };
  window.__ju = async function (a) {
    var n = Math.ceil(44100 * a.seconds), octx = new OfflineAudioContext(2, n, 44100);
    if (!(await Worklets.load(octx))) throw new Error('worklet did not load');
    var o = {}, k; for (k in a.opts) o[k] = a.opts[k]; o._probe = true;
    var inst = Classics.create(octx, 'juno', o);
    if (inst.engine !== 'worklet') throw new Error('not on the worklet path');
    inst.out.connect(octx.destination);
    var x = null;
    if (a.sig) {
      x = window.__sig(a.sig, n);
      var b = octx.createBuffer(1, n, 44100); b.getChannelData(0).set(x);
      var src = octx.createBufferSource(); src.buffer = b; src.connect(inst._node); src.start(0);
    }
    (a.notes || []).forEach(function (e) { inst.trigger(e.t, e); });
    var t0 = performance.now(), buf = await octx.startRendering(), ms = performance.now() - t0;
    var r = { L: window.__b64(buf.getChannelData(0)), R: window.__b64(buf.getChannelData(1)), ms: ms };
    if (a.wantX && x) r.X = window.__b64(x);
    if (a.wav) {
      var wav = new Uint8Array(Sequencer.wav(buf)), str = '';
      for (k = 0; k < wav.length; k += 0x8000) str += String.fromCharCode.apply(null, wav.subarray(k, k + 0x8000));
      r.wav = btoa(str);
    }
    return r;
  };
}
function decode(b64) { var buf = Buffer.from(b64, 'base64'); return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4); }

// the chord progression (P5's demo shape): Am, F, G, Em, one bar each, twice, 100 bpm; a PWM pad
var BAR = 4 * 60 / 100;
var CHORDS = [[57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67], [52, 55, 59, 64]];
function progression(bars) {
  var ev = [];
  for (var b = 0; b < bars; b++) ev.push({ t: 0.05 + b * BAR, notes: CHORDS[b % 4], dur: BAR - 0.12, step: b * 16 });
  return ev;
}
var PAD = { pulse: true, saw: true, pwm: 0.6, pwmMode: 'lfo', lfoRate: 0.3, cutoff: 0.62, resonance: 0.15, envAmt: 0.2, attack: 0.35, decay: 0.6, sustain: 0.8, release: 0.45 };
function mix(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }

// the analytic filter responses from the processor source itself (both versions)
function analytic(src) {
  var stub = function () {}, res = null;
  try {
    res = (new Function('sampleRate', 'registerProcessor', 'AudioWorkletProcessor', src + '\n;return { H: typeof bbdH === "function" ? bbdH : null, F: typeof BBDF === "object" ? BBDF : null, JU: JU };'))(SR, stub, function () {});
  } catch (e) { return null; }
  var F = [100, 1000, 2000, 5000, 7000, 8000, 10000, 12000, 15000, 18000], rows = [];
  F.forEach(function (f) {
    var r = { f: f };
    if (res.H) {
      var a = res.H(res.F.inR, res.F.inP, f), b = res.H(res.F.outR, res.F.outP, f), a0 = res.H(res.F.inR, res.F.inP, 0), b0 = res.H(res.F.outR, res.F.outP, 0);
      r.input = r2(db(Math.hypot(a[0], a[1]) / Math.hypot(a0[0], a0[1]))); r.output = r2(db(Math.hypot(b[0], b[1]) / Math.hypot(b0[0], b0[1]))); r.pair = r2(r.input + r.output);
    } else if (res.JU.chorusPre) {
      var one = function (fc) { return db(1 / Math.sqrt(1 + (f / fc) * (f / fc))); };
      r.input = r2(one(res.JU.chorusPre)); r.output = r2(one(res.JU.chorusPost)); r.pair = r2(r.input + r.output);
    }
    rows.push(r);
  });
  return { kind: res.H ? 'Holters-Parker BBD filters (Juno-60 residues and poles), normalised to DC' : 'two one-pole low-passes ' + res.JU.chorusPre + ' / ' + res.JU.chorusPost + ' Hz', rows: rows };
}

async function main() {
  var playwright;
  try { playwright = require('playwright'); } catch (e) { try { playwright = require('/opt/node22/lib/node_modules/playwright'); } catch (e2) { console.error('juno-bench: cannot load Playwright'); return 2; } }
  var server = serve();
  await new Promise(function (r) { server.listen(0, '127.0.0.1', r); });
  var browser;
  try { browser = await playwright.chromium.launch(); }
  catch (e) { server.close(); console.error('juno-bench: Chromium did not launch: ' + String(e).split('\n')[0]); return 2; }
  var finish = async function (code) { try { await browser.close(); } catch (e) {} server.close(); return code; };
  var page = await browser.newPage(), errors = [];
  page.on('pageerror', function (e) { errors.push(String(e)); });
  await page.goto('http://127.0.0.1:' + server.address().port + '/app/index.html');
  await page.waitForFunction(function () { return !!(window.Classics && window.Worklets && window.Sequencer); });
  await page.evaluate(pageHelper);
  var R = async function (a) {
    var r = await page.evaluate(function (q) { return window.__ju(q); }, a);
    return { L: decode(r.L), R: decode(r.R), X: r.X ? decode(r.X) : null, ms: r.ms, wav: r.wav };
  };
  var defNoise = null;
  try { defNoise = await page.evaluate(function () { return Classics.spec('juno').chorusNoise.value; }); } catch (e) {}

  if (DEMOS) {
    var dir = path.join(ROOT, 'tools', 'out'); try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    var rows = [];
    // the main demo at the version's own default (a --proc snapshot is the old engine: chorusNoise 0 then), and one at hiss 1
    var dset = [['', PROC ? 0 : defNoise], ['-hiss1', 1]];
    for (var dm = 0; dm < dset.length; dm++) {
      var dd = await R({ opts: mix(PAD, { chorus: 2, chorusNoise: dset[dm][1] }), notes: progression(8), seconds: 8 * BAR + 1.5, wav: true });
      var name = 'juno-chorus-demo' + dset[dm][0] + SUFFIX + '.wav';
      fs.writeFileSync(path.join(dir, name), Buffer.from(dd.wav, 'base64'));
      rows.push({ file: 'tools/out/' + name, chorusNoise: dset[dm][1], rmsL: r3(rms(dd.L)), peakL: r3(dd.L.reduce(function (m, v) { return Math.max(m, Math.abs(v)); }, 0)), corr: r3(corr(dd.L, dd.R)) });
    }
    console.log(JSON.stringify(rows));
    return finish(0);
  }

  var res = { when: new Date().toISOString(), processor: PROC ? path.relative(ROOT, path.resolve(PROC)) : PROC_URL.slice(1), chorusNoiseDefault: defNoise, errors: errors };
  var procSrc = fs.readFileSync(PROC ? path.resolve(PROC) : path.join(ROOT, PROC_URL.slice(1)), 'utf8');
  res.filtersAnalytic = analytic(procSrc);

  // (1) measured wet response with white noise
  res.filtersMeasured = {};
  for (var mode = 1; mode <= 2; mode++) {
    var w = await R({ opts: { chorus: mode, chorusNoise: 0, hpf: 1 }, sig: 'noise', seconds: 6, wantX: true });
    var x = w.X.subarray(SR), wl = new Float32Array(x.length), i;
    for (i = 0; i < x.length; i++) wl[i] = (w.L[SR + i] - 0.44 * x[i]) / 0.56;
    var Px = psd(x, 4096), Pw = psd(wl, 4096), df = SR / 4096, ref = 0, nref = 0, k;
    for (k = Math.round(200 / df); k <= Math.round(1000 / df); k++) { ref += Pw[k] / Px[k]; nref++; }
    ref /= nref;
    var row = {};
    [1000, 2000, 5000, 7000, 8000, 10000, 12000, 15000, 18000].forEach(function (f) {
      var a = 0, c = 0; for (k = Math.round(f * 0.97 / df); k <= Math.round(f * 1.03 / df); k++) { a += Pw[k] / Px[k]; c++; }
      row[f] = r1(10 * Math.log10(a / c / ref));
    });
    row.passbandGainDb = r2(10 * Math.log10(ref));
    res.filtersMeasured[mode === 1 ? 'I' : 'II'] = row;
  }

  // (2) delay sweep per mode and side
  res.sweep = {};
  for (mode = 1; mode <= 2; mode++) {
    var c = await R({ opts: { chorus: mode, chorusNoise: 0, hpf: 1 }, sig: 'clicks', seconds: 6.2, wantX: true });
    var side = {};
    ['L', 'R'].forEach(function (sd) {
      var Y = c[sd], lags = [], times = [];
      for (var s0 = 2205; s0 + 600 < Y.length; s0 += 1102) {
        var best = -1, bi = 0;
        for (var q = s0 + 20; q < s0 + 500; q++) { var v = (Y[q] - 0.44 * c.X[q]) / 0.56; if (Math.abs(v) > best) { best = Math.abs(v); bi = q; } }
        var ym = (Y[bi - 1] - 0.44 * c.X[bi - 1]), y0 = (Y[bi] - 0.44 * c.X[bi]), yp = (Y[bi + 1] - 0.44 * c.X[bi + 1]);
        var den = ym - 2 * y0 + yp, off = den !== 0 ? 0.5 * (ym - yp) / den : 0;
        lags.push((bi + off - s0) / SR * 1000); times.push(s0 / SR);
      }
      var lo = Infinity, hi = -Infinity, mean = 0;
      lags.forEach(function (l) { lo = Math.min(lo, l); hi = Math.max(hi, l); mean += l; }); mean /= lags.length;
      var ups = [];
      for (var j = 1; j < lags.length; j++) if (lags[j - 1] < mean && lags[j] >= mean) ups.push(times[j]);
      var rate = ups.length > 1 ? (ups.length - 1) / (ups[ups.length - 1] - ups[0]) : null;
      side[sd] = { minMs: r3(lo), maxMs: r3(hi), rateHz: rate ? r3(rate) : null, first: r3(lags[0]) };
      side[sd + 'lags'] = lags;
    });
    var lc = corr(side.Llags, side.Rlags);
    delete side.Llags; delete side.Rlags;
    side.lagCorrelation = r3(lc);                          // -1: the lines move in antiphase
    res.sweep[mode === 1 ? 'I' : 'II'] = side;
  }

  // (3) stereo correlation: held A3 (P5's figure) and the chord progression
  res.correlation = {};
  for (mode = 0; mode <= 2; mode++) {
    var h = await R({ opts: { chorus: mode, chorusNoise: 0 }, notes: [{ t: 0.05, midi: 57, dur: 2.4 }], seconds: 2.6 });
    var pg = await R({ opts: mix(PAD, { chorus: mode, chorusNoise: 0 }), notes: progression(4), seconds: 4 * BAR + 1 });
    res.correlation[['off', 'I', 'II'][mode]] = { heldA3: r3(corr(h.L, h.R, SR / 2)), progression: r3(corr(pg.L, pg.R)) };
  }

  // (4) noise floor: no notes, no input
  var one = await R({ opts: { chorus: 0 }, notes: [{ t: 0.05, midi: 45, dur: 2.4 }], seconds: 2.6 });
  var vRms = rms(one.L, SR / 2, 2.4 * SR);
  res.noise = { oneVoiceRms: r3(vRms), oneVoiceDbfs: r1(db(vRms)) };
  var lv = [0, defNoise == null ? 0.5 : defNoise, 1];
  for (var li = 0; li < lv.length; li++) {
    var nz = await R({ opts: { chorus: 1, chorusNoise: lv[li] }, seconds: 3 }), nzr = Math.max(rms(nz.L, SR), rms(nz.R, SR));
    var nz2 = await R({ opts: { chorus: 2, chorusNoise: lv[li] }, seconds: 3 }), nzr2 = Math.max(rms(nz2.L, SR), rms(nz2.R, SR));
    // the hiss level per 50 ms frame, left against right: negative when it swaps sides with the sweep
    var fl = [], fr = [];
    for (var fq = SR; fq + 2205 <= nz.L.length; fq += 2205) { fl.push(rms(nz.L, fq, fq + 2205)); fr.push(rms(nz.R, fq, fq + 2205)); }
    res.noise['chorusNoise ' + lv[li] + (li === 1 ? ' (default)' : '')] = { dbfsI: r1(db(nzr)), dbfsII: r1(db(nzr2)), reOneVoiceDbI: r1(db(nzr / vRms)), reOneVoiceDbII: r1(db(nzr2 / vRms)), lrCorrelation: r3(corr(nz.L, nz.R, SR)), lrLevelCorrelation: lv[li] > 0 ? r3(corr(fl, fr)) : null };
  }

  // (5) CPU: render time, best of three, 16 s of the progression
  res.cpu = {};
  for (mode = 0; mode <= 2; mode++) {
    var best2 = Infinity;
    for (var rep = 0; rep < 3; rep++) { var cp = await R({ opts: mix(PAD, { chorus: mode }), notes: progression(6), seconds: 16 }); best2 = Math.min(best2, cp.ms); }
    res.cpu[['off', 'I', 'II'][mode]] = { renderMs: Math.round(best2), realtimeFraction: r3(best2 / 16000) };
  }
  res.cpu.chorusCostMs = res.cpu.I.renderMs - res.cpu.off.renderMs;
  res.errors = errors;
  await finish(0);

  try { fs.mkdirSync(path.dirname(OUT), { recursive: true }); } catch (e) {}
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  print(res);
  if (CMP) compare(JSON.parse(fs.readFileSync(CMP, 'utf8')), res);
  console.log('juno-bench: written ' + path.relative(ROOT, OUT) + (errors.length ? ' (page errors: ' + errors.length + ')' : ''));
  return 0;
}

function print(r) {
  console.log('Processor: ' + r.processor + '   chorusNoise default: ' + r.chorusNoiseDefault);
  console.log('Filters (analytic, ' + (r.filtersAnalytic ? r.filtersAnalytic.kind : 'n/a') + '), dB:');
  if (r.filtersAnalytic) r.filtersAnalytic.rows.forEach(function (x) { console.log('  ' + x.f + ' Hz  in ' + x.input + '  out ' + x.output + '  pair ' + x.pair); });
  ['I', 'II'].forEach(function (m) { console.log('Measured wet / input, mode ' + m + ' (dB re 200-1000 Hz): ' + JSON.stringify(r.filtersMeasured[m])); });
  ['I', 'II'].forEach(function (m) { var s = r.sweep[m]; console.log('Sweep ' + m + ': L ' + s.L.minMs + '..' + s.L.maxMs + ' ms at ' + s.L.rateHz + ' Hz; R ' + s.R.minMs + '..' + s.R.maxMs + ' ms at ' + s.R.rateHz + ' Hz; lag correlation ' + s.lagCorrelation); });
  ['off', 'I', 'II'].forEach(function (m) { console.log('Correlation ' + m + ': held A3 ' + r.correlation[m].heldA3 + ', progression ' + r.correlation[m].progression); });
  console.log('Noise: ' + JSON.stringify(r.noise));
  console.log('CPU (16 s of the progression): ' + JSON.stringify(r.cpu));
}
function compare(old, now) {
  console.log('--- compare with ' + old.processor + ' (' + old.when + ')');
  ['I', 'II'].forEach(function (m) { console.log('Sweep ' + m + ' L: ' + old.sweep[m].L.minMs + '..' + old.sweep[m].L.maxMs + ' -> ' + now.sweep[m].L.minMs + '..' + now.sweep[m].L.maxMs + ' ms; rate ' + old.sweep[m].L.rateHz + ' -> ' + now.sweep[m].L.rateHz); });
  ['off', 'I', 'II'].forEach(function (m) { console.log('Correlation ' + m + ' held A3: ' + old.correlation[m].heldA3 + ' -> ' + now.correlation[m].heldA3 + '; progression ' + old.correlation[m].progression + ' -> ' + now.correlation[m].progression); });
  ['I', 'II'].forEach(function (m) { console.log('Wet at 10 / 15 kHz, ' + m + ': ' + old.filtersMeasured[m][10000] + ' / ' + old.filtersMeasured[m][15000] + ' -> ' + now.filtersMeasured[m][10000] + ' / ' + now.filtersMeasured[m][15000] + ' dB'); });
  ['off', 'I', 'II'].forEach(function (m) { console.log('CPU ' + m + ': ' + old.cpu[m].renderMs + ' -> ' + now.cpu[m].renderMs + ' ms'); });
}

main().then(function (c) { process.exitCode = c; }, function (e) { console.error('juno-bench: ' + (e && e.stack)); process.exitCode = 2; });
