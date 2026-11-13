#!/usr/bin/env node
/* tools/tb303-bench.js - repeatable characterisation of `tb303` on the worklet path in headless Chromium (P5, Patch Crew).
 *
 * Usage:   node tools/tb303-bench.js [--compare tools/out/older.json] [--out tools/out/tb303-bench.json]
 *          node tools/tb303-bench.js --demos     (the owner's demo WAVs instead, see demos() below)
 * Env:     PLAYWRIGHT_PATH (default /opt/node22/lib/node_modules/playwright), CHROMIUM_PATH (default /opt/pw-browsers/chromium)
 * Exit:    0 measured and written; 2 the harness could not run (no Playwright, no Chromium, no worklet).
 *
 * Every render is an OfflineAudioContext at 44.1 kHz with one Classics tb303 at level 1 (no channel strip, no master).
 * Excitation: the instrument's own saw harmonics (note 24, 32.7 Hz, so a harmonic every 32.7 Hz). Time traces of the
 * cutoff, oscillator frequency and VCA gain come from the processor's internal test probe (Classics.create opts
 * `_probe: true`: a second node output; not a parameter, not in the spec, used only here).
 * Measured: magnitude response at cutoff low / mid / high x resonance 0 / 0.5 / 0.9 / 1 (harmonic n level + 20 log n,
 * relative to the passband harmonics), resonance peak height and frequency, self-oscillation (a non-harmonic line),
 * envelope decay against the decay knob (accent off and on), accent level against the accent knob, the cutoff sweep over
 * 1, 2 and 4 consecutive accents at resonance 0.2 / 0.6 / 0.95, the slide curve, gate length, saw against square, and
 * the output peak over a grid of settings. Writes tools/out/tb303-bench.json and prints a table.
 */
'use strict';
var http = require('http'), fs = require('fs'), path = require('path');

var ROOT = path.resolve(__dirname, '..');
var PLAYWRIGHT_PATH = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright';
var CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
var SR = 44100, F24 = 440 * Math.pow(2, (24 - 69) / 12);
var args = process.argv.slice(2), arg = function (k) { var i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
var OUT = path.resolve(arg('--out') || path.join(ROOT, 'tools', 'out', 'tb303-bench.json'));
var CMP = arg('--compare'), DEMOS = args.indexOf('--demos') >= 0;

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
function spectrum(x, from, n) {
  var re = new Float64Array(n), im = new Float64Array(n), i;
  for (i = 0; i < n; i++) re[i] = (x[from + i] || 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)));
  fft(re, im);
  var mag = new Float64Array(n / 2);
  for (i = 0; i < n / 2; i++) mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
  return { mag: mag, df: SR / n };
}
function db(v) { return 20 * Math.log10(v + 1e-30); }
function bandMax(sp, f0, f1) { var m = 0; for (var i = Math.max(1, Math.floor(f0 / sp.df)); i <= Math.min(sp.mag.length - 1, Math.ceil(f1 / sp.df)); i++) m = Math.max(m, sp.mag[i]); return m; }
function peak(x, a, b) { var m = 0; for (var i = Math.max(0, a); i < Math.min(x.length, b); i++) m = Math.max(m, Math.abs(x[i])); return m; }
function rms(x, a, b) { var s = 0, n = 0; for (var i = Math.max(0, a); i < Math.min(x.length, b); i++) { s += x[i] * x[i]; n++; } return Math.sqrt(s / Math.max(1, n)); }
function S(t) { return Math.round(t * SR); }
function r1(v) { return Math.round(v * 10) / 10; }
function r3(v) { return Math.round(v * 1000) / 1000; }
function mean(a, b, arr) { var s = 0, n = 0; for (var i = a; i < b && i < arr.length; i++) { s += arr[i]; n++; } return s / Math.max(1, n); }

// ------------------------------------------------------------------ server (COOP/COEP like tools/serve.js)
var MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
function serve() {
  return http.createServer(function (req, res) {
    var p = decodeURIComponent(req.url.split('?')[0]), file = path.normalize(path.join(ROOT, p));
    var h = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cross-Origin-Resource-Policy': 'same-origin' };
    if (file.indexOf(ROOT) !== 0) { res.writeHead(403, h); return res.end(); }
    fs.readFile(file, function (e, d) {
      if (e) { res.writeHead(p === '/favicon.ico' ? 204 : 404, h); return res.end(); }
      h['Content-Type'] = MIME[path.extname(file)] || 'application/octet-stream';
      res.writeHead(200, h); res.end(d);
    });
  });
}

// in the page: render one tb303 with notes and scheduled sets; returns base64 Float32 arrays (out, fc, freq, amp)
function pageHelper() {
  window.__b64 = function (f) { var u = new Uint8Array(f.buffer, f.byteOffset, f.byteLength), s = '', i; for (i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  window.__tb = async function (a) {
    var octx = new OfflineAudioContext(4, Math.ceil(44100 * a.seconds), 44100);
    if (!(await Worklets.load(octx))) throw new Error('worklet did not load');
    var o = {}, k; for (k in a.opts) o[k] = a.opts[k]; o._probe = true;
    var inst = Classics.create(octx, 'tb303', o);
    if (inst.engine !== 'worklet') throw new Error('not on the worklet path');
    // channel 0: the instrument output; 1..3: the probe's cutoff, frequency and VCA gain
    var sp = octx.createChannelSplitter(3); inst._node.connect(sp, 1);
    var m2 = octx.createChannelMerger(4); inst.out.connect(m2, 0, 0); sp.connect(m2, 0, 1); sp.connect(m2, 1, 2); sp.connect(m2, 2, 3);
    m2.connect(octx.destination);
    (a.sets || []).forEach(function (s) { inst.set(s[1], s[2], { at: s[0] }); });
    a.notes.forEach(function (n) { inst.trigger(n.t, n); });
    var b = await octx.startRendering();
    return [0, 1, 2, 3].map(function (c) { return window.__b64(b.getChannelData(c)); });
  };
}
function decode(b64) { var buf = Buffer.from(b64, 'base64'); return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4); }

async function main() {
  var t0 = Date.now(), playwright;
  try { playwright = require(PLAYWRIGHT_PATH); } catch (e) { console.error('tb303-bench: cannot load Playwright from ' + PLAYWRIGHT_PATH); return 2; }
  var server = serve();
  await new Promise(function (r) { server.listen(0, '127.0.0.1', r); });
  var browser;
  try { browser = await playwright.chromium.launch({ executablePath: CHROMIUM_PATH, headless: true }); }
  catch (e) { server.close(); console.error('tb303-bench: Chromium did not launch: ' + String(e).split('\n')[0]); return 2; }
  var page = await browser.newPage(), errors = [];
  page.on('pageerror', function (e) { errors.push(String(e)); });
  await page.goto('http://127.0.0.1:' + server.address().port + '/app/index.html');
  await page.waitForFunction(function () { return !!(window.Classics && window.Worklets); });
  await page.evaluate(pageHelper);
  if (DEMOS) { var dc = await demos(page); await browser.close(); server.close(); return dc; }
  var R = async function (opts, notes, seconds, sets) {
    var r = await page.evaluate(function (a) { return window.__tb(a); }, { opts: opts, notes: notes, seconds: seconds, sets: sets || [] });
    return { out: decode(r[0]), fc: decode(r[1]), f: decode(r[2]), a: decode(r[3]) };
  };
  var STEP = 60 / 126 / 4, D1 = STEP * 0.95 - 0.01;
  // a long note: a priming step at 0.02 s teaches the planner the step, then the note at step 1 is gated for `len` s
  var longNote = function (midi, len, extra) {
    var n = [{ t: 0.02, midi: 0, dur: D1, step: 0 }, { t: 0.02 + STEP, midi: midi, dur: len + STEP / 2, step: 1 }];
    for (var k in (extra || {})) n[1][k] = extra[k];
    return n;
  };
  var res = { meta: { date: new Date().toISOString(), sampleRate: SR, bpm: 126, step: STEP, excitation: 'own saw harmonics, note 24 (32.7 Hz); traces from the processor probe' } };

  // 1. magnitude response, resonance peak, self-oscillation
  res.response = {};
  for (var cut of [314, 1000, 2394]) for (var rz of [0, 0.5, 0.9, 1]) {
    var x = await R({ cutoff: cut, resonance: rz, envMod: 0, decay: 200 }, longNote(24, 1.8), 2.1);
    var w0 = S(1.0), N = 32768, sp = spectrum(x.out, w0, N), fc = mean(w0, w0 + N, x.fc), c = [];
    for (var h = 1; h * F24 < 15000; h++) c.push({ f: h * F24, v: db(bandMax(sp, h * F24 - 6, h * F24 + 6)) + db(h) });
    var pb = c.filter(function (q) { return q.f >= 60 && q.f <= Math.max(70, 0.3 * fc); }), ref = pb.reduce(function (s, q) { return s + q.v; }, 0) / pb.length;
    var at = function (r) { var f = r * fc, b = c[0]; c.forEach(function (q) { if (Math.abs(q.f - f) < Math.abs(b.f - f)) b = q; }); return r1(b.v - ref); };
    var pk = c.slice(1).reduce(function (a, q) { return q.v > a.v ? q : a; }, c[1]);
    // self-oscillation: the strongest line between harmonics near fc, against the strongest harmonic there
    var inter = 0, harm = 0;
    for (var f = fc * 0.5; f < fc * 2; f += sp.df) {
      var near = Math.abs(f / F24 - Math.round(f / F24)) * F24, m = sp.mag[Math.round(f / sp.df)];
      if (near > 10) inter = Math.max(inter, m); else harm = Math.max(harm, m);
    }
    res.response['c' + cut + '_r' + rz] = { cutoffKnob: cut, resonance: rz, fcHz: Math.round(fc), at0_5: at(0.5), at1: at(1), at2: at(2), at4: at(4),
      peakDb: r1(pk.v - ref), peakHz: Math.round(pk.f), peakOverFc: r3(pk.f / fc), interHarmonicDb: r1(db(inter) - db(harm)) };
  }
  // after release with resonance 1: does anything keep sounding
  var xr = await R({ resonance: 1, cutoff: 1000 }, longNote(36, 0.3), 1.5);
  res.selfOscillation = { tailRmsAfterRelease: rms(xr.out, S(0.9), S(1.5)), note: 'the VCA closes after the gate; the inter-harmonic line above tests for a free oscillation while the gate is open' };

  // 2. envelope decay against the decay knob, accent off and on (log2 cutoff excess falls to 1/e)
  res.decay = {};
  for (var acc of [false, true]) for (var dk of [200, 400, 800, 1400, 2000]) {
    var xd = await R({ cutoff: 600, envMod: 0.5, resonance: 0.5, decay: dk }, longNote(36, 3.5, { accent: acc }), 4);
    var st = S(0.02 + STEP), L = function (i) { return Math.log2(Math.max(1, xd.fc[i])); }, pkI = st, i;
    for (i = st; i < st + S(0.05); i++) if (L(i) > L(pkI)) pkI = i;
    // three equally spaced points on log2(cutoff) fit an exponential approach without knowing the end value:
    // tau = dt / ln((L1 - L0) / (L2 - L1)); dt scales with the knob so the points stay inside the decay
    var dtF = Math.min(0.8, Math.max(0.05, (acc ? 200 : dk) / 1000 * 0.6)), i0 = pkI + S(0.03), L0 = L(i0), L1 = L(i0 + S(dtF)), L2 = L(i0 + S(2 * dtF));
    var tE = (L1 - L0) !== 0 && (L2 - L1) / (L1 - L0) > 0 ? dtF / Math.log((L1 - L0) / (L2 - L1)) : null;
    res.decay[(acc ? 'accent_' : 'normal_') + dk] = { knobMs: dk, accent: acc, peakHz: Math.round(xd.fc[pkI]), endHz: Math.round(xd.fc[S(3.7)]), tauMs: tE == null ? null : Math.round(tE * 1000) };
  }

  // 3. accent level against the accent knob (an unaccented then an accented step)
  res.accentLevel = {};
  for (var ak of [0, 0.25, 0.5, 0.75, 1]) {
    var xa = await R({ accent: ak }, [{ t: 0.02, midi: 36, dur: D1, step: 0 }, { t: 0.02 + STEP, midi: 36, dur: D1, step: 1, accent: true }], 0.6);
    res.accentLevel['k' + ak] = { knob: ak, peakDb: r1(db(peak(xa.out, S(0.02 + STEP), S(0.02 + 2 * STEP)) / peak(xa.out, S(0.02), S(0.02 + STEP)))),
      rmsDb: r1(db(rms(xa.out, S(0.02 + STEP), S(0.02 + 2 * STEP)) / rms(xa.out, S(0.02), S(0.02 + STEP)))) };
  }

  // 4. cutoff sweep over 1, 2, 4 consecutive accents (after two plain steps), resonance 0.2 / 0.6 / 0.95
  res.accentSweep = {};
  for (var rs of [0.2, 0.6, 0.95]) for (var na of [1, 2, 4]) {
    var ns = [], q;
    for (q = 0; q < 2 + na + 2; q++) ns.push({ t: 0.02 + q * STEP, midi: 36, dur: D1, step: q, accent: q >= 2 && q < 2 + na });
    var xs = await R({ resonance: rs, cutoff: 500, envMod: 0.5, decay: 400, accent: 1 }, ns, 0.02 + (ns.length + 1) * STEP);
    var plain = 0; for (i = S(0.02); i < S(0.02 + STEP); i++) plain = Math.max(plain, xs.fc[i]);
    var per = [];
    for (q = 2; q < 2 + na; q++) {
      var a0 = S(0.02 + q * STEP), pmax = 0, pi = a0;
      for (i = a0; i < a0 + S(STEP); i++) if (xs.fc[i] > pmax) { pmax = xs.fc[i]; pi = i; }
      per.push({ peakHz: Math.round(pmax), toPeakMs: r1((pi - a0) / SR * 1000) });
    }
    res.accentSweep['r' + rs + '_n' + na] = { resonance: rs, accents: na, plainPeakHz: Math.round(plain), perAccent: per, lastPeakHz: per[per.length - 1].peakHz, lastToPeakMs: per[per.length - 1].toPeakMs,
      lastOverPlainOct: r3(Math.log2(per[per.length - 1].peakHz / plain)) };
  }

  // 5. slide curve: 36 (slide) -> 48, time to 50 % and 90 % of the Hz distance
  res.slide = {};
  for (var stv of [0, 30, 60, 120, 200]) {
    var xl = await R({ slideTime: stv }, [{ t: 0.02, midi: 36, dur: D1, step: 0, slide: true }, { t: 0.02 + STEP, midi: 48, dur: D1, step: 1 }], 0.5);
    var s0 = S(0.02 + STEP), fa = 65.406, fb = 130.813, t50 = null, t90 = null;
    for (i = s0; i < S(0.5); i++) { var fr = (xl.f[i] - fa) / (fb - fa); if (t50 == null && fr >= 0.5) t50 = (i - s0) / SR; if (t90 == null && fr >= 0.9) { t90 = (i - s0) / SR; break; } }
    res.slide['ms' + stv] = { slideTimeMs: stv, t50Ms: t50 == null ? null : r1(t50 * 1000), t90Ms: t90 == null ? null : r1(t90 * 1000), gateHeld: mean(s0 - S(0.004), s0, xl.a) > 0.1 };
  }

  // 6. gate length as a fraction of the step: VCA gain falls under 10 % of its value 5 ms before
  var xg = await R({}, [{ t: 0.02, midi: 36, dur: D1, step: 0 }, { t: 0.02 + STEP, midi: 36, dur: 2 * STEP * 0.95 - 0.01, step: 1 }, { t: 0.02 + 3 * STEP, midi: 36, dur: D1, step: 3, slide: true }, { t: 0.02 + 4 * STEP, midi: 38, dur: D1, step: 4 }], 0.02 + 6 * STEP);
  var gateEnd = function (a0, maxSteps) { var ref2 = 0, j; for (j = a0 + S(0.003); j < a0 + S(maxSteps * STEP); j++) { ref2 = Math.max(ref2 * 0.9995, xg.a[j]); if (xg.a[j] < 0.1 * ref2 && j > a0 + S(0.005)) return (j - a0) / SR / STEP; } return null; };
  res.gate = { oneStep: r3(gateEnd(S(0.02), 1)), tieTwoSteps: r3(gateEnd(S(0.02 + STEP), 2)), slidPairFromFirst: r3(gateEnd(S(0.02 + 3 * STEP), 3)), note: 'fractions of a step (0.119 s); the VCA falls at the gate within the 1 ms release and the 200 Hz de-click' };

  // 7. saw against square, defaults, held note 36
  var xw = await R({ wave: 'saw' }, longNote(36, 1), 1.3), xq = await R({ wave: 'square' }, longNote(36, 1), 1.3);
  res.wave = { sawRms: r3(rms(xw.out, S(0.3), S(1.1))), squareRms: r3(rms(xq.out, S(0.3), S(1.1))), squareOverSawDb: r1(db(rms(xq.out, S(0.3), S(1.1)) / rms(xw.out, S(0.3), S(1.1)))),
    sawPeak: r3(peak(xw.out, 0, xw.out.length)), squarePeak: r3(peak(xq.out, 0, xq.out.length)) };

  // 8. output peak over a grid, on a sixteen-step pattern with accents and slides (two bars)
  var pat = [], NOTES = [36, 36, 48, 36, 39, 36, 43, 48, 36, 36, 46, 36, 41, 36, 48, 51], ACC = [2, 5, 6, 10, 13, 14], SLD = [3, 7, 11];
  for (q = 0; q < 32; q++) pat.push({ t: 0.02 + q * STEP, midi: NOTES[q % 16], dur: D1, step: q, accent: ACC.indexOf(q % 16) >= 0, slide: SLD.indexOf(q % 16) >= 0 });
  res.outputPeak = { grid: [], max: 0, maxAt: null };
  for (var gc of [314, 1000, 2394]) for (var gr of [0, 0.5, 1]) for (var ge of [0.5, 1]) {
    var xo = await R({ cutoff: gc, resonance: gr, envMod: ge, accent: 1 }, pat, 0.02 + 33 * STEP), pv = r3(peak(xo.out, 0, xo.out.length));
    res.outputPeak.grid.push({ cutoff: gc, resonance: gr, envMod: ge, accent: 1, peak: pv });
    if (pv > res.outputPeak.max) { res.outputPeak.max = pv; res.outputPeak.maxAt = { cutoff: gc, resonance: gr, envMod: ge }; }
  }
  var xdflt = await R({}, pat, 0.02 + 33 * STEP);
  res.outputPeak.defaultsPattern = r3(peak(xdflt.out, 0, xdflt.out.length));

  res.meta.seconds = r1((Date.now() - t0) / 1000);
  res.meta.pageErrors = errors.length;
  await browser.close(); server.close();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  printTable(res);
  if (CMP) compare(JSON.parse(fs.readFileSync(CMP, 'utf8')), res);
  console.log('wrote ' + path.relative(ROOT, OUT) + ' in ' + res.meta.seconds + ' s' + (errors.length ? '; page errors: ' + errors.join(' | ') : ''));
  return 0;
}

function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
function printTable(r) {
  var k;
  console.log('tb303 bench (worklet path, Chromium, 44.1 kHz, ' + r.meta.excitation + ')');
  console.log('\nResponse re passband (dB) at 0.5/1/2/4 x fc; resonance peak dB @ Hz (x fc); inter-harmonic line dB');
  for (k in r.response) { var v = r.response[k]; console.log('  cutoff ' + pad(v.cutoffKnob, 5) + 'res ' + pad(v.resonance, 4) + 'fc ' + pad(v.fcHz, 6) + pad([v.at0_5, v.at1, v.at2, v.at4].join(' / '), 26) + 'peak ' + pad(v.peakDb, 6) + '@ ' + pad(v.peakHz, 6) + '(' + v.peakOverFc + ')  inter ' + v.interHarmonicDb); }
  console.log('  after release at resonance 1: tail rms ' + r.selfOscillation.tailRmsAfterRelease.toExponential(2));
  console.log('\nFilter envelope: time constant of log2(cutoff) (ms, three-point fit) against the decay knob');
  for (k in r.decay) { var d = r.decay[k]; console.log('  ' + pad(d.accent ? 'accent' : 'normal', 7) + 'knob ' + pad(d.knobMs, 5) + 'ms -> ' + pad(d.tauMs, 6) + 'ms (peak ' + d.peakHz + ' Hz, end ' + d.endHz + ' Hz)'); }
  console.log('\nAccent level against the knob (peak dB / rms dB over an unaccented step)');
  for (k in r.accentLevel) { var a = r.accentLevel[k]; console.log('  knob ' + pad(a.knob, 5) + pad(a.peakDb, 6) + '/ ' + a.rmsDb); }
  console.log('\nAccent sweep (cutoff 500, envMod 0.5, decay 400, accent 1): peak cutoff Hz (time to peak ms) per consecutive accent');
  for (k in r.accentSweep) { var s = r.accentSweep[k]; console.log('  res ' + pad(s.resonance, 5) + pad(s.accents + ' acc', 7) + 'plain ' + pad(s.plainPeakHz, 6) + s.perAccent.map(function (p) { return p.peakHz + ' (' + p.toPeakMs + ')'; }).join('  ') + '   last/plain ' + s.lastOverPlainOct + ' oct'); }
  console.log('\nSlide 36 -> 48: time to 50 % / 90 % of the Hz distance (ms)');
  for (k in r.slide) { var l = r.slide[k]; console.log('  slideTime ' + pad(l.slideTimeMs, 5) + pad(l.t50Ms, 7) + '/ ' + pad(l.t90Ms, 7) + 'gate held ' + l.gateHeld); }
  console.log('\nGate (fraction of the step): one step ' + r.gate.oneStep + ', tie of two ' + r.gate.tieTwoSteps + ', slid pair ' + r.gate.slidPairFromFirst);
  console.log('Saw / square: rms ' + r.wave.sawRms + ' / ' + r.wave.squareRms + ' (' + r.wave.squareOverSawDb + ' dB), peak ' + r.wave.sawPeak + ' / ' + r.wave.squarePeak);
  console.log('Output peak, 2-bar accent/slide pattern: defaults ' + r.outputPeak.defaultsPattern + ', grid max ' + r.outputPeak.max + ' at ' + JSON.stringify(r.outputPeak.maxAt));
}
function flat(o, pre, out) {
  out = out || {};
  for (var k in o) if (o.hasOwnProperty(k)) {
    var v = o[k], p = pre ? pre + '.' + k : k;
    if (v && typeof v === 'object') flat(v, p, out); else if (typeof v === 'number') out[p] = v;
  }
  return out;
}
function compare(old, now) {
  var a = flat(old), b = flat(now), k, n = 0;
  console.log('\nCompared with the older run (' + (old.meta && old.meta.date) + '): values that moved');
  for (k in b) if (k.indexOf('meta.') !== 0) {
    if (!(k in a)) { console.log('  new      ' + k + ' = ' + b[k]); n++; continue; }
    var d = b[k] - a[k], tol = Math.max(1e-6, Math.abs(a[k]) * 0.02, /Db$|Oct$|at\d/.test(k) ? 0.2 : 0);
    if (Math.abs(d) > tol) { console.log('  ' + pad(k, 44) + a[k] + ' -> ' + b[k]); n++; }
  }
  for (k in a) if (!(k in b) && k.indexOf('meta.') !== 0) { console.log('  gone     ' + k); n++; }
  if (!n) console.log('  nothing moved beyond 2 % (0.2 dB)');
}

// ------------------------------------------------------------------ demos (Host.render, section automation)
// One document per demo: a tb303 track `acid` on one sixteen-step pattern (accents on 3, 6, 7, 11, 14, 15; slides on 4,
// 8, 12; 1-based), 126 BPM, 8 bars. The moves are section `ramp`s and `set`s (the engine's arrangement automation,
// applied by the sequencer at each step's time through inst.set(name, v, {at})). The master chain is bypassed, so the
// dry file is the instrument through its channel strip only; the driven file adds a saturator insert on the track
// (drive 0.06, tone 9 kHz, trim 0.8: Processors' saturator, a tanh curve with k = 1 + 40 drive = 3.4).
function demoDoc(d, drive) {
  var NOTES = [36, 36, 48, 36, 39, 36, 43, 48, 36, 36, 46, 36, 41, 36, 48, 51], ACC = [2, 5, 6, 10, 13, 14], SLD = [3, 7, 11], A = [], B = [], i;
  for (i = 0; i < 16; i++) {
    A.push({ note: NOTES[i], vel: 0.85, acc: ACC.indexOf(i) >= 0 || undefined, slide: SLD.indexOf(i) >= 0 || undefined });
    B.push({ note: NOTES[i], vel: 0.85 });
  }
  var tr = { name: 'acid', inst: 'tb303', kind: 'melody', gain: 1, params: d.params, variants: { A: { bars: 1, cells: A }, B: { bars: 1, cells: B } } };
  if (drive) tr.chain = [{ type: 'saturator', name: 'drive', drive: 0.06, mix: 1, tone: 9000, trim: 0.8 }];
  var master = {}; ['eq', 'hp', 'lp', 'glue', 'sat', 'limiter'].forEach(function (u) { master[u] = { bypass: true }; });
  return { v: 1, name: 'tb303 ' + d.name, bpm: 126, swing: 0, progression: ['C'], sends: {}, master: master, tracks: [tr], sections: d.sections };
}
var DEMOS_LIST = [
  { name: 'cutoff-sweep', params: { resonance: 0.7, envMod: 0.5, decay: 400 }, sections: [{ name: 'a', bars: 8, play: { acid: 'A' }, ramp: [{ param: 'acid.cutoff', from: 314, to: 2394, curve: 'expo' }] }] },
  { name: 'resonance-up', params: { cutoff: 1000, envMod: 0.5, decay: 400 }, sections: [{ name: 'a', bars: 8, play: { acid: 'A' }, ramp: [{ param: 'acid.resonance', from: 0.3, to: 0.95, curve: 'lin' }] }] },
  { name: 'envmod-up', params: { cutoff: 500, resonance: 0.7, decay: 400 }, sections: [{ name: 'a', bars: 8, play: { acid: 'A' }, ramp: [{ param: 'acid.envMod', from: 0, to: 1, curve: 'lin' }] }] },
  { name: 'decay-up', params: { cutoff: 500, resonance: 0.7, envMod: 0.7 }, sections: [{ name: 'a', bars: 8, play: { acid: 'A' }, ramp: [{ param: 'acid.decay', from: 200, to: 2000, curve: 'expo' }] }] },
  { name: 'accents-slides-off-on', params: { cutoff: 700, resonance: 0.75, envMod: 0.6, decay: 400 }, sections: [{ name: 'off', bars: 4, play: { acid: 'B' } }, { name: 'on', bars: 4, play: { acid: 'A' } }] },
  { name: 'saw-then-square', params: { cutoff: 700, resonance: 0.75, envMod: 0.6, decay: 400 }, sections: [{ name: 'saw', bars: 4, play: { acid: 'A' }, set: { 'acid.wave': 'saw' } }, { name: 'square', bars: 4, play: { acid: 'A' }, set: { 'acid.wave': 'square' } }] }
];
async function demos(page) {
  var dir = path.join(ROOT, 'tools', 'out'), rows = [];
  fs.mkdirSync(dir, { recursive: true });
  for (var i = 0; i < DEMOS_LIST.length; i++) for (var drive of [false, true]) {
    var d = DEMOS_LIST[i], doc = demoDoc(d, drive);
    var r = await page.evaluate(async function (doc) {
      var host = Host.create({ doc: doc }), buf = await host.render({ tail: 1 });
      var L = buf.getChannelData(0), R = buf.getChannelData(1), pk = 0, s = 0, j;
      for (j = 0; j < L.length; j++) { pk = Math.max(pk, Math.abs(L[j]), Math.abs(R[j])); s += L[j] * L[j]; }
      var wav = new Uint8Array(Sequencer.wav(buf)), str = '';
      for (j = 0; j < wav.length; j += 0x8000) str += String.fromCharCode.apply(null, wav.subarray(j, j + 0x8000));
      return { peak: pk, rms: Math.sqrt(s / L.length), seconds: buf.duration, wav: btoa(str) };
    }, doc);
    var file = 'tb303-demo-' + d.name + (drive ? '-driven' : '') + '.wav';
    fs.writeFileSync(path.join(dir, file), Buffer.from(r.wav, 'base64'));
    rows.push({ file: file, peak: r3(r.peak), peakDbfs: r1(db(r.peak)), rmsDbfs: r1(db(r.rms)), seconds: r1(r.seconds) });
    console.log('  ' + pad(file, 48) + 'peak ' + pad(r3(r.peak), 7) + '(' + r1(db(r.peak)) + ' dBFS)  rms ' + r1(db(r.rms)) + ' dBFS  ' + r1(r.seconds) + ' s');
  }
  fs.writeFileSync(path.join(dir, 'tb303-demos.json'), JSON.stringify(rows, null, 1));
  return 0;
}

main().then(function (c) { process.exit(c); }, function (e) { console.error('tb303-bench: ' + (e && e.stack || e)); process.exit(2); });
