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
 * Added by Selector Crew T2 (A2 and A3, 2026-11-27):
 * (6) aliasing: one held note, chorus off, filter open (the cap, 0.4 fs), resonance 0, the A3 variance rows 0; a 65536-point
 *     Blackman-Harris spectrum from 0.4 s; every bin from 20 Hz to 20 kHz is a line of the signal when it lies within 3 Hz
 *     of a multiple of the grid g (the note's frequency; for PWM the LFO rate, set to f0 / M so the whole signal is
 *     periodic in 1 / g), and an alias when it lies more than 4 Hz from one. Reported: alias power over line power (dB),
 *     the same for aliases under 5 kHz, and the strongest alias bin under the strongest line bin (dB). Cases: saw at MIDI
 *     72 / 84 / 96 / 103 / 108, a narrow fixed pulse (duty 0.05) at 96, and bright PWM (pulse, LFO mode, depth 1: duty
 *     0.05 to 0.5) at 84 and 96 with the LFO near 21.8 Hz.
 * (7) CPU on a LIVE AudioContext (Chromium with --autoplay-policy=no-user-gesture-required): the served processor's
 *     registerProcessor('hvt-juno', ...) is wrapped by a subclass that adds Date.now() around every process() call (whole
 *     milliseconds; summed over thousands of blocks whose start phase against the millisecond tick is spread, the mean is
 *     the time per block); n instances play the PAD progression with chorus I for 6 s; also the context's
 *     playbackStats underrun events and the context clock against the wall clock. Best (lowest) of three runs per n.
 * (8) seeds and changed behaviour (A3, A2): the PAD progression (4 bars, chorus II) with the defaults and opts._seed 7 twice
 *     and 8 once (identical to the sample? largest difference, level difference); and three engines in one run: the old
 *     loop (_os 1, A3 rows 0, which is the engine before 2026-11-27 sample for sample), 4x with the rows 0, and 4x with
 *     the defaults: RMS and the level in four bands (Welch) of each, in dB re the old loop.
 * --only a,b   run only these sections: filters, sweep, corr, noise, cpu, alias, live, seed (default: all)
 * --os 1|4     pass opts._os to the juno (the processor's oversampling factor; ignored by a processor without it)
 */
'use strict';
var http = require('http'), fs = require('fs'), path = require('path');

var ROOT = path.resolve(__dirname, '..');
var SR = 44100;
var args = process.argv.slice(2), arg = function (k) { var i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
var OUT = path.resolve(arg('--out') || path.join(ROOT, 'tools', 'out', 'juno-bench.json'));
var CMP = arg('--compare'), DEMOS = args.indexOf('--demos') >= 0, SUFFIX = arg('--suffix') || '', PROC = arg('--proc');
var ONLY = arg('--only') ? arg('--only').split(',') : null, OSF = arg('--os') ? Number(arg('--os')) : 0;
function want(k) { return !ONLY || ONLY.indexOf(k) >= 0; }
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
// (6) power spectrum with a 4-term Blackman-Harris window; lines within 3 Hz of a multiple of g, aliases beyond 4 Hz
function aliasOf(x, from, n, g) {
  var re = new Float64Array(n), im = new Float64Array(n), i, a0 = 0.35875, a1 = 0.48829, a2 = 0.14128, a3 = 0.01168;
  for (i = 0; i < n; i++) { var p = 2 * Math.PI * i / (n - 1); re[i] = (x[from + i] || 0) * (a0 - a1 * Math.cos(p) + a2 * Math.cos(2 * p) - a3 * Math.cos(3 * p)); }
  fft(re, im);
  var df = SR / n, line = 0, al = 0, al5 = 0, maxL = 0, maxA = 0, maxAf = 0;
  for (i = Math.ceil(20 / df); i <= Math.floor(20000 / df); i++) {
    var f = i * df, d = Math.abs(f - g * Math.round(f / g)), pw = re[i] * re[i] + im[i] * im[i];
    if (d <= 3) { line += pw; if (pw > maxL) maxL = pw; }
    else if (d > 4) { al += pw; if (f < 5000) al5 += pw; if (pw > maxA) { maxA = pw; maxAf = f; } }
  }
  return { aliasDb: r1(10 * Math.log10(al / line + 1e-30)), alias5kDb: r1(10 * Math.log10(al5 / line + 1e-30)), worstLineDb: r1(10 * Math.log10(maxA / maxL + 1e-30)), worstAtHz: Math.round(maxAf), gridHz: r3(g) };
}
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
      if (p === PROC_URL && want('live')) d = Buffer.from(timed(String(d)));
      res.writeHead(200, h); res.end(d);
    });
  });
}

// (7) the timing wrapper: the same processor class, registered under the same name, with Date.now() around process()
function timed(src) {
  var reg = "registerProcessor('hvt-juno', JunoProcessor);";
  if (src.indexOf(reg) < 0) return src;
  return src.replace(reg, "class TimedJuno extends JunoProcessor {\n" +
    "  constructor(o) { super(o); this.__ms = 0; this.__n = 0; var h = this.port.onmessage, self = this;\n" +
    "    this.port.onmessage = function (e) { if (e.data === '__stats') self.port.postMessage({ ms: self.__ms, n: self.__n }); else if (h) h(e); }; }\n" +
    "  process(i, o, p) { var t = Date.now(), r = super.process(i, o, p); this.__ms += Date.now() - t; this.__n++; return r; }\n" +
    "}\nregisterProcessor('hvt-juno', TimedJuno);");
}

// in the page: one juno, notes, an optional input signal; returns base64 Float32 L and R and the render time
function pageHelper() {
  // A3 rows (classics.js hides them on a page with panels.js until the panels draw them, log-T2): on for the bench
  if (window.Panels && window.Panels.a3 !== true) window.Panels.a3 = true;
  window.__b64 = function (f) { var u = new Uint8Array(f.buffer, f.byteOffset, f.byteLength), s = '', i; for (i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  window.__sig = function (kind, n) {
    var x = new Float32Array(n), i, s = 12345;
    if (kind === 'noise') for (i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; x[i] = 0.25 * (s / 2147483648 - 1); }
    else if (kind === 'clicks') for (i = 2205; i < n; i += 1102) x[i] = 0.5;     // an impulse every 25 ms (1102.5 samples, kept integral)
    return x;
  };
  window.__live = async function (a) {
    var ctx = new AudioContext({ sampleRate: 44100 });
    if (!(await Worklets.load(ctx))) throw new Error('worklet did not load (live)');
    await ctx.resume();
    var g = ctx.createGain(); g.gain.value = 0.02; g.connect(ctx.destination);
    var insts = [], k, t0 = ctx.currentTime + 0.3;
    for (k = 0; k < a.n; k++) {
      var o = {}, q; for (q in a.opts) o[q] = a.opts[q];
      if (a.os) o._os = a.os;
      var inst = Classics.create(ctx, 'juno', o);
      if (inst.engine !== 'worklet') throw new Error('not on the worklet path (live)');
      inst.out.connect(g); insts.push(inst);
      a.notes.forEach(function (e) { var e2 = {}, z; for (z in e) e2[z] = e[z]; inst.trigger(t0 + e.t, e2); });
    }
    var ps = ctx.playbackStats || null, u0 = ps ? ps.underrunEvents : null, w0 = performance.now(), c0 = ctx.currentTime;
    await new Promise(function (r) { setTimeout(r, a.seconds * 1000 + 300); });
    var u1 = ps ? ps.underrunEvents : null, wall = (performance.now() - w0) / 1000, adv = ctx.currentTime - c0;
    var stats = await Promise.all(insts.map(function (inst) { return new Promise(function (res) {
      var port = inst._node.port, done = false;
      port.onmessage = function (e) { if (!done && e.data && e.data.n != null) { done = true; res(e.data); } };
      port.postMessage('__stats'); setTimeout(function () { if (!done) { done = true; res(null); } }, 1000);
    }); }));
    insts.forEach(function (i) { i.dispose(); });
    await ctx.close();
    return { stats: stats, underruns: u0 == null ? null : u1 - u0, clockOverWall: adv / wall };
  };
  window.__ju = async function (a) {
    var n = Math.ceil(44100 * a.seconds), octx = new OfflineAudioContext(2, n, 44100);
    if (!(await Worklets.load(octx))) throw new Error('worklet did not load');
    var o = {}, k; for (k in a.opts) o[k] = a.opts[k]; o._probe = true;
    if (a.os) o._os = a.os;
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
  try { browser = await playwright.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); }
  catch (e) { server.close(); console.error('juno-bench: Chromium did not launch: ' + String(e).split('\n')[0]); return 2; }
  var finish = async function (code) { try { await browser.close(); } catch (e) {} server.close(); return code; };
  var page = await browser.newPage(), errors = [];
  page.on('pageerror', function (e) { errors.push(String(e)); });
  await page.goto('http://127.0.0.1:' + server.address().port + '/app/index.html');
  await page.waitForFunction(function () { return !!(window.Classics && window.Worklets && window.Sequencer); });
  await page.evaluate(pageHelper);
  var R = async function (a) {
    if (OSF && a.os == null) a.os = OSF;
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
  var mode;
  if (want('filters')) { res.filtersMeasured = {};
  for (mode = 1; mode <= 2; mode++) {
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
  } }

  // (2) delay sweep per mode and side
  if (want('sweep')) { res.sweep = {};
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
  } }

  // (3) stereo correlation: held A3 (P5's figure) and the chord progression
  if (want('corr')) { res.correlation = {};
  for (mode = 0; mode <= 2; mode++) {
    var h = await R({ opts: { chorus: mode, chorusNoise: 0 }, notes: [{ t: 0.05, midi: 57, dur: 2.4 }], seconds: 2.6 });
    var pg = await R({ opts: mix(PAD, { chorus: mode, chorusNoise: 0 }), notes: progression(4), seconds: 4 * BAR + 1 });
    res.correlation[['off', 'I', 'II'][mode]] = { heldA3: r3(corr(h.L, h.R, SR / 2)), progression: r3(corr(pg.L, pg.R)) };
  } }

  // (4) noise floor: no notes, no input
  if (want('noise')) {
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
  } }

  // (5) CPU: render time, best of three, 16 s of the progression
  if (want('cpu')) { res.cpu = {};
  for (mode = 0; mode <= 2; mode++) {
    var best2 = Infinity;
    for (var rep = 0; rep < 3; rep++) { var cp = await R({ opts: mix(PAD, { chorus: mode }), notes: progression(6), seconds: 16 }); best2 = Math.min(best2, cp.ms); }
    res.cpu[['off', 'I', 'II'][mode]] = { renderMs: Math.round(best2), realtimeFraction: r3(best2 / 16000) };
  }
  res.cpu.chorusCostMs = res.cpu.I.renderMs - res.cpu.off.renderMs; }

  // (6) aliasing (A2): one held note, chorus off, filter at its cap, variance rows 0
  if (want('alias')) {
    res.alias = {};
    var AB = { saw: true, pulse: false, sub: 0, noise: 0, hpf: 1, cutoff: 1, resonance: 0, envAmt: 0, vcfKey: 0, vcfLfo: 0, dcoLfo: 0, attack: 0, decay: 0.5, sustain: 1,
               release: 0.2, chorus: 0, chorusNoise: 0, voiceTune: 0, voiceCutoff: 0, voiceEnv: 0, driftTune: 0, driftCutoff: 0 };
    var f0of = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
    var lfoV = function (hz) { return 0.75 + 0.25 * (hz - 11.49) / (22.22 - 11.49); };   // the LFO table's top segment (LAW.juno.rate)
    var cases = [];
    [72, 84, 96, 103, 108].forEach(function (m) { cases.push({ name: 'saw ' + m, midi: m, g: f0of(m), opts: {} }); });
    cases.push({ name: 'pulse 0.05 96', midi: 96, g: f0of(96), opts: { saw: false, pulse: true, pwmMode: 'manual', pwm: 1 } });
    [[84, 48], [96, 96]].forEach(function (c) {
      var fl = f0of(c[0]) / c[1];
      cases.push({ name: 'PWM ' + c[0], midi: c[0], g: fl, opts: { saw: false, pulse: true, pwmMode: 'lfo', pwm: 1, lfoRate: lfoV(fl), lfoDelay: 0 } });
    });
    for (var ci = 0; ci < cases.length; ci++) {
      var cs = cases[ci], ra = await R({ opts: mix(AB, cs.opts), notes: [{ t: 0.05, midi: cs.midi, dur: 2.2 }], seconds: 2.0 });
      res.alias[cs.name] = aliasOf(ra.L, Math.round(0.4 * SR), 65536, cs.g);
    }
  }

  // (7) CPU on a live AudioContext: n instances of the PAD progression, chorus I, 6 s; best of three per n
  if (want('live')) {
    res.live = {};
    var BLOCK_MS = 128 / SR * 1000;
    for (var nI of [1, 4]) {
      var bestL = null;
      for (var lr = 0; lr < 3; lr++) {
        var lv2 = await page.evaluate(function (q) { return window.__live(q); }, { n: nI, seconds: 6, opts: mix(PAD, { chorus: 1 }), notes: progression(3), os: OSF || 0 });
        var tot = 0, blk = 0; lv2.stats.forEach(function (st) { if (st) { tot += st.ms; blk += st.n; } });
        var per = blk ? tot / blk * nI : null;                 // ms of processing per render quantum, all instances together
        var row2 = { msPerBlockAll: per == null ? null : r3(per), usPerBlockPerInstance: per == null ? null : Math.round(per / nI * 1000), budgetFraction: per == null ? null : r3(per / BLOCK_MS),
                     blocks: blk / nI, underruns: lv2.underruns, clockOverWall: r3(lv2.clockOverWall) };
        if (!bestL || (row2.msPerBlockAll != null && row2.msPerBlockAll < bestL.msPerBlockAll)) bestL = row2;
        (res.live['n' + nI + 'runs'] = res.live['n' + nI + 'runs'] || []).push(row2.usPerBlockPerInstance);
      }
      res.live['n' + nI] = bestL;
    }
  }
  // (8) seeds and changed behaviour
  if (want('seed')) {
    res.seed = {};
    var PADII = mix(PAD, { chorus: 2 }), pr4 = progression(4), secs = 4 * BAR + 1;
    var s7 = await R({ opts: mix(PADII, { _seed: 7 }), notes: pr4, seconds: secs }), s7b = await R({ opts: mix(PADII, { _seed: 7 }), notes: pr4, seconds: secs }), s8 = await R({ opts: mix(PADII, { _seed: 8 }), notes: pr4, seconds: secs });
    var mx = function (a, b) { var m = 0; for (var z = 0; z < a.length; z++) m = Math.max(m, Math.abs(a[z] - b[z])); return m; };
    res.seed.sameSeedMaxDiff = Math.max(mx(s7.L, s7b.L), mx(s7.R, s7b.R));
    res.seed.otherSeedMaxDiff = r3(Math.max(mx(s7.L, s8.L), mx(s7.R, s8.R)));
    res.seed.otherSeedLevelDb = r2(db(rms(s8.L) / rms(s7.L)));
    var ZR = { voiceTune: 0, voiceCutoff: 0, voiceEnv: 0, driftTune: 0, driftCutoff: 0 };
    var eOld = await R({ opts: mix(PADII, ZR), notes: pr4, seconds: secs, os: 1 }), e4 = await R({ opts: mix(PADII, ZR), notes: pr4, seconds: secs }), eD = await R({ opts: PADII, notes: pr4, seconds: secs });
    var bands = function (x) { var Pp = psd(x, 4096), df2 = SR / 4096, out = {}, B = [[20, 5000], [5000, 10000], [10000, 15000], [15000, 20000]];
      B.forEach(function (b) { var e = 0; for (var z = Math.round(b[0] / df2); z < Math.round(b[1] / df2); z++) e += Pp[z]; out[b[0] + '-' + b[1]] = e; }); return out; };
    var bO = bands(eOld.L), row3 = function (e) { var b = bands(e.L), o = { rmsDb: r2(db(rms(e.L) / rms(eOld.L))) }; Object.keys(b).forEach(function (k) { o[k] = r2(10 * Math.log10(b[k] / bO[k])); }); return o; };
    res.seed.oldLoopRms = r3(rms(eOld.L));
    res.seed.os4RowsZero = row3(e4); res.seed.os4Defaults = row3(eD);
  }
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
  if (r.alias) { console.log('Aliasing (alias / line power dB; under 5 kHz; strongest alias bin re strongest line, at Hz):'); Object.keys(r.alias).forEach(function (k) { var a = r.alias[k]; console.log('  ' + k + ': ' + a.aliasDb + '  ' + a.alias5kDb + '  ' + a.worstLineDb + ' @ ' + a.worstAtHz); }); }
  if (r.live) console.log('Live CPU: ' + JSON.stringify(r.live));
  if (r.seed) console.log('Seeds and changed behaviour: ' + JSON.stringify(r.seed));
  if (!r.sweep || !r.filtersMeasured || !r.correlation || !r.noise || !r.cpu || !r.filtersAnalytic) { if (r.cpu) console.log('CPU (16 s of the progression): ' + JSON.stringify(r.cpu)); return; }
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
  if (old.alias && now.alias) Object.keys(now.alias).forEach(function (k) { if (old.alias[k]) console.log('Alias ' + k + ': ' + old.alias[k].aliasDb + ' -> ' + now.alias[k].aliasDb + ' dB; under 5 kHz ' + old.alias[k].alias5kDb + ' -> ' + now.alias[k].alias5kDb + '; worst ' + old.alias[k].worstLineDb + ' -> ' + now.alias[k].worstLineDb); });
  if (old.live && now.live) ['n1', 'n4'].forEach(function (k) { if (old.live[k] && now.live[k]) console.log('Live ' + k + ': ' + old.live[k].usPerBlockPerInstance + ' -> ' + now.live[k].usPerBlockPerInstance + ' us per block per instance; underruns ' + old.live[k].underruns + ' -> ' + now.live[k].underruns); });
  if (!old.sweep || !now.sweep || !old.cpu || !now.cpu) return;
  console.log('--- compare with ' + old.processor + ' (' + old.when + ')');
  ['I', 'II'].forEach(function (m) { console.log('Sweep ' + m + ' L: ' + old.sweep[m].L.minMs + '..' + old.sweep[m].L.maxMs + ' -> ' + now.sweep[m].L.minMs + '..' + now.sweep[m].L.maxMs + ' ms; rate ' + old.sweep[m].L.rateHz + ' -> ' + now.sweep[m].L.rateHz); });
  ['off', 'I', 'II'].forEach(function (m) { console.log('Correlation ' + m + ' held A3: ' + old.correlation[m].heldA3 + ' -> ' + now.correlation[m].heldA3 + '; progression ' + old.correlation[m].progression + ' -> ' + now.correlation[m].progression); });
  ['I', 'II'].forEach(function (m) { console.log('Wet at 10 / 15 kHz, ' + m + ': ' + old.filtersMeasured[m][10000] + ' / ' + old.filtersMeasured[m][15000] + ' -> ' + now.filtersMeasured[m][10000] + ' / ' + now.filtersMeasured[m][15000] + ' dB'); });
  ['off', 'I', 'II'].forEach(function (m) { console.log('CPU ' + m + ': ' + old.cpu[m].renderMs + ' -> ' + now.cpu[m].renderMs + ' ms'); });
}

main().then(function (c) { process.exitCode = c; }, function (e) { console.error('juno-bench: ' + (e && e.stack)); process.exitCode = 2; });
