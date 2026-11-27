#!/usr/bin/env node
/* tools/separate-check.js (A1, Selector Crew T1, 2026-11-27): the separator's output.
 *
 * Default (fast, no weights, no network): runs tools/separate.py --model stub (a band split that leaves exactly 0.1 of
 * the mix out) on synthetic files and checks what any model path writes: four stems named drums, bass, other, vocals,
 * 32-bit float WAVs, values above 1.0 kept (no clip, no rescale), a residual file under its own sidecar key and never
 * among the stems, stems + residual = the mix to float rounding (read back here, in JavaScript, from the files), the
 * residual's level (-20.00 dB for the stub), the licence and weights fields, resampled and int16 input, the error path,
 * --check, and app/shell/separation.js reading the real sidecar (residual on its own key, four stems).
 *
 * --full (needs demucs, torch and the HT-Demucs weights, about a minute of CPU): the Lab Crew's measurement (log-L2.md 5.3)
 * repeated. Renders 16 bars of mainA3 of the V3 song and its twelve solos into tools/out/sepcheck/ when missing
 * (tools/render.js), sums the solos into a linear mix, separates it with --model htdemucs and scores per stem against the
 * summed solos: SDR = 10 log10(sum s^2 / sum (s - s_hat)^2) over both channels, and SI-SDR. Fails when a stem is more than
 * TOL_DB under the 11 November figures (24.0 / 17.7 / 19.4 dB), when stems + residual miss the mix by more than float
 * rounding, or when the sidecar lacks the weights' hash. The render is the app's own song: synthetic, clean, sparse
 * material; the scores say the wiring is right, not how real records separate.
 *
 * Python: $RECUT_PYTHON, else python3. It needs numpy and scipy; without them the check fails and says so.
 * Exit 0 when all pass, 1 on a failure. */
'use strict';
var fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
var S = require('../app/shell/separation.js');

var ROOT = path.resolve(__dirname, '..'), SCRIPT = path.join(__dirname, 'separate.py');
var FULL = process.argv.indexOf('--full') >= 0;
var BASE = { drums: 24.0, bass: 17.7, other: 19.4 };   // HT-Demucs, linear mix, L2 2026-11-11 (log-L2.md section 5.3)
var TOL_DB = 1.0;                                       // set before the run: a drop of more than 1 dB fails
var TRUTH = { drums: ['kick', 'clap', 'hat_open', 'shaker', 'shaker_on', 'tick', 'burst', 'burst_r'], bass: ['sub', 'bass'], other: ['stab', 'pad'] };
var SR = 44100;

var n = 0, bad = 0;
function ok(cond, name, extra) { n++; if (!cond) { bad++; console.log('FAIL ' + name + (extra ? ': ' + extra : '')); } }

// ------------------------------------------------------------------ WAV in and out
function readWav(p) {
  var b = fs.readFileSync(p), o = 12, fmt = null, data = null;
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error(p + ': not a WAV');
  while (o + 8 <= b.length) {
    var id = b.toString('ascii', o, o + 4), len = b.readUInt32LE(o + 4);
    if (id === 'fmt ') {
      var tag = b.readUInt16LE(o + 8);
      if (tag === 0xFFFE) tag = b.readUInt16LE(o + 8 + 24);   // WAVE_FORMAT_EXTENSIBLE: the sub-format's first two bytes
      fmt = { tag: tag, channels: b.readUInt16LE(o + 10), rate: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22) };
    } else if (id === 'data') data = { off: o + 8, len: Math.min(len, b.length - o - 8) };
    o += 8 + len + (len & 1);
  }
  if (!fmt || !data) throw new Error(p + ': no fmt or data chunk');
  var bps = fmt.bits / 8, frames = Math.floor(data.len / (bps * fmt.channels)), ch = [], c, i;
  for (c = 0; c < fmt.channels; c++) ch.push(new Float64Array(frames));
  for (i = 0; i < frames; i++) for (c = 0; c < fmt.channels; c++) {
    var at = data.off + (i * fmt.channels + c) * bps, v;
    if (fmt.tag === 3 && fmt.bits === 32) v = b.readFloatLE(at);
    else if (fmt.tag === 3 && fmt.bits === 64) v = b.readDoubleLE(at);
    else if (fmt.tag === 1 && fmt.bits === 16) v = b.readInt16LE(at) / 32768;
    else if (fmt.tag === 1 && fmt.bits === 24) v = (b.readIntLE(at, 3)) / 8388608;
    else if (fmt.tag === 1 && fmt.bits === 32) v = b.readInt32LE(at) / 2147483648;
    else throw new Error(p + ': format ' + fmt.tag + '/' + fmt.bits + ' not read here');
    ch[c][i] = v;
  }
  return { fmt: fmt, ch: ch, frames: frames };
}
function writeWav(p, chans, rate, kind) {   // kind: 'f32' or 'i16'
  var nc = chans.length, frames = chans[0].length, bps = kind === 'f32' ? 4 : 2, len = frames * nc * bps, b = Buffer.alloc(44 + len), i, c;
  b.write('RIFF', 0); b.writeUInt32LE(36 + len, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(kind === 'f32' ? 3 : 1, 20); b.writeUInt16LE(nc, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * nc * bps, 28);
  b.writeUInt16LE(nc * bps, 32); b.writeUInt16LE(bps * 8, 34); b.write('data', 36); b.writeUInt32LE(len, 40);
  for (i = 0; i < frames; i++) for (c = 0; c < nc; c++) {
    var at = 44 + (i * nc + c) * bps, v = chans[c][i];
    if (kind === 'f32') b.writeFloatLE(v, at); else b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32768))), at);
  }
  fs.writeFileSync(p, b);
}
function energy(chs) { var e = 0; chs.forEach(function (x) { for (var i = 0; i < x.length; i++) e += x[i] * x[i]; }); return e; }
function peak(chs) { var m = 0; chs.forEach(function (x) { for (var i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i])); }); return m; }
function db(r) { return 10 * Math.log10(r); }
function sdr(ref, est) {   // global SDR and SI-SDR over both channels
  var es = 0, ee = 0, dot = 0, rr = 0, c, i, L = Math.min(ref[0].length, est[0].length);
  for (c = 0; c < 2; c++) for (i = 0; i < L; i++) { var s = ref[c][i], h = est[c][i]; es += s * s; ee += (s - h) * (s - h); dot += s * h; rr += s * s; }
  var a = dot / rr, num = 0, den = 0;
  for (c = 0; c < 2; c++) for (i = 0; i < L; i++) { var t = a * ref[c][i], d = est[c][i] - t; num += t * t; den += d * d; }
  return { sdr: db(es / ee), si: db(num / den) };
}

// ------------------------------------------------------------------ Python
function pickPython() {
  var cands = (process.env.RECUT_PYTHON ? [process.env.RECUT_PYTHON] : []).concat(['python3']);
  for (var i = 0; i < cands.length; i++) {
    var r = cp.spawnSync(cands[i], ['-c', 'import numpy, scipy'], { encoding: 'utf8' });
    if (r.status === 0) return cands[i];
  }
  return null;
}
function sep(py, args) {
  var r = cp.spawnSync(py, [SCRIPT].concat(args), { encoding: 'utf8', maxBuffer: 64 << 20 });
  return { code: r.status, out: r.stdout || '', err: r.stderr || '' };
}

// a deterministic pseudo-random sequence for the synthetic inputs
var seed = 12345;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; }

// check the files a run wrote against the mix the check itself wrote (float input: exact)
function checkRun(label, dir, name, mix, expectRelDb) {
  var info = JSON.parse(fs.readFileSync(path.join(dir, name + '-stems.json'), 'utf8'));
  var names = Object.keys(info.stems || {});
  ok(JSON.stringify(names) === JSON.stringify(['drums', 'bass', 'other', 'vocals']), label + ': four stems in order', JSON.stringify(names));
  ok(names.indexOf('residual') < 0 && !names.some(function (k) { return /residual/.test(info.stems[k]); }), label + ': residual not among the stems');
  ok(info.residual && typeof info.residual.path === 'string' && fs.existsSync(info.residual.path), label + ': residual file on its own key');
  ok(info.format && info.format.sampleFormat === 'float32' && info.format.rescaled === false && info.format.clipped === false, label + ': format fields');
  ok(info.licence && typeof info.licence.code === 'string' && typeof info.licence.weights === 'string' && Array.isArray(info.weights), label + ': licence and weights fields');
  var sum = [new Float64Array(mix[0].length), new Float64Array(mix[0].length)], maxStem = 0, okFmt = true;
  names.concat(['residual']).forEach(function (k) {
    var w = readWav(k === 'residual' ? info.residual.path : info.stems[k]);
    if (!(w.fmt.tag === 3 && w.fmt.bits === 32 && w.fmt.rate === SR && w.fmt.channels === 2 && w.frames === mix[0].length)) okFmt = false;
    if (k !== 'residual') maxStem = Math.max(maxStem, peak(w.ch));
    for (var c = 0; c < 2; c++) for (var i = 0; i < w.frames; i++) sum[c][i] += w.ch[c][i];
  });
  ok(okFmt, label + ': every file is 32-bit float, 44.1 kHz, stereo, full length');
  var err = 0, i, c;
  for (c = 0; c < 2; c++) for (i = 0; i < mix[0].length; i++) err = Math.max(err, Math.abs(sum[c][i] - mix[c][i]));
  var mp = peak(mix);
  ok(err <= 1e-6 * Math.max(1, mp), label + ': stems + residual = mix (read here)', 'max error ' + err + ', mix peak ' + mp);
  ok(info.sumCheck && info.sumCheck.maxAbs <= 1e-6 * Math.max(1, mp), label + ': sidecar sumCheck', JSON.stringify(info.sumCheck));
  var res = readWav(info.residual.path), rel = db(energy(res.ch) / energy(mix));
  ok(Math.abs(rel - info.residual.relativeDb) < 0.01, label + ': residual level in the sidecar matches the file', rel.toFixed(3) + ' vs ' + info.residual.relativeDb);
  if (expectRelDb != null) ok(Math.abs(rel - expectRelDb) < 0.01, label + ': residual level ' + expectRelDb + ' dB', rel.toFixed(4));
  return { info: info, maxStem: maxStem, err: err, rel: rel };
}

(async function main() {
  var py = pickPython();
  ok(!!py, 'a Python with numpy and scipy ($RECUT_PYTHON or python3)', 'none found; set RECUT_PYTHON');
  if (!py) return finish();
  var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'recut-sepchk-'));

  // 1. float input with peaks above 1.0 in every band: stub run, files read back here
  var N = SR * 2, L = new Float64Array(N), R = new Float64Array(N), i;
  for (i = 0; i < N; i++) {
    var t = i / SR;
    L[i] = 1.3 * Math.sin(2 * Math.PI * 55 * t) + 0.4 * rnd();
    R[i] = 1.2 * Math.sin(2 * Math.PI * 9000 * t) + 0.9 * Math.sin(2 * Math.PI * 700 * t) + 0.3 * rnd();
  }
  var f1 = path.join(tmp, 'mix float.wav'); writeWav(f1, [L, R], SR, 'f32');
  var mix1 = readWav(f1).ch, o1 = path.join(tmp, 'o1');
  var r = sep(py, [f1, '--model', 'stub', '--out', o1]);
  ok(r.code === 0, 'stub run exit 0', r.err.slice(-300));
  if (r.code === 0) {
    var c1 = checkRun('float input', o1, 'mix float', mix1, -20);
    ok(c1.maxStem > 1.0, 'a stem above 1.0 is kept (no clip, no rescale)', 'largest stem peak ' + c1.maxStem);
    ok(c1.info.model === 'stub' && c1.info.inputFormat === 'float32' && c1.info.resampled === false, 'sidecar model and input fields');
    ok(!/^(drums|bass|other|vocals): [\d.]+ s$/m.test(r.out), 'peak lines are not counted as stem progress by separation.js');
  }

  // 2. int16 mono at 48 kHz: loaded, resampled; the residual still closes the sum against the loaded mix
  var M = 48000, m = new Float64Array(M);
  for (i = 0; i < M; i++) m[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / M) + 0.2 * rnd();
  var f2 = path.join(tmp, 'mono48.wav'); writeWav(f2, [m], M, 'i16');
  r = sep(py, [f2, '--model', 'stub', '--out', path.join(tmp, 'o2')]);
  ok(r.code === 0, 'int16 mono 48 kHz exit 0', r.err.slice(-300));
  if (r.code === 0) {
    var i2 = JSON.parse(fs.readFileSync(path.join(tmp, 'o2', 'mono48-stems.json'), 'utf8'));
    ok(i2.resampled === true && i2.inputSampleRate === 48000 && i2.inputFormat === 'int16', 'resampled input recorded', JSON.stringify([i2.resampled, i2.inputSampleRate, i2.inputFormat]));
    ok(i2.sumCheck.maxAbs <= 1e-6 && Math.abs(i2.residual.relativeDb + 20) < 0.01, 'resampled input: sum and residual level', JSON.stringify([i2.sumCheck.maxAbs, i2.residual.relativeDb]));
    ok(readWav(i2.stems.drums).fmt.rate === SR, 'resampled stems at 44.1 kHz');
  }

  // 3. errors and --check
  r = sep(py, [path.join(tmp, 'nope.wav'), '--model', 'stub', '--out', tmp]);
  ok(r.code === 2 && /no such file/.test(r.err), 'missing input exits 2', r.code + ' ' + r.err);
  r = sep(py, ['--check']);
  var ck = null; try { ck = JSON.parse(r.out); } catch (e) { /* below */ }
  ok(r.code === 0 && ck && typeof ck.htdemucsCached === 'boolean' && Array.isArray(ck.missing), '--check reports htdemucsCached', r.out.slice(0, 200));
  r = sep(py, ['--check', '--model', 'stub']);
  try { ck = JSON.parse(r.out); } catch (e) { ck = null; }
  ok(ck && ck.missing.indexOf('demucs') < 0 && ck.missing.indexOf('torch') < 0, '--check --model stub needs no torch');

  // 4. app/shell/separation.js reads the real sidecar: four stems, the residual on its own key
  var ud = path.join(tmp, 'ud'), input = await S.validateInput(f1), od = S.outDirFor(ud, input, 'auto');
  r = sep(py, [f1, '--model', 'stub', '--out', od]);
  var runner = S.createRunner({ userData: ud, script: SCRIPT, spawn: function () { throw new Error('no spawn expected'); }, platform: 'linux', env: {} });
  var res = await runner.separate(f1, { model: 'auto' }, null);
  ok(res.cached === true && res.stems.map(function (s) { return s.name; }).join() === 'drums,bass,other,vocals', 'separation.js: four stems from the real sidecar', JSON.stringify(res.stems.map(function (s) { return s.name; })));
  ok(res.residual && res.residual.path === path.join(od, 'mix float-residual.wav') && Math.abs(res.residual.relativeDb + 20) < 0.01 && typeof res.residual.rmsDbfs === 'number', 'separation.js: residual path and level', JSON.stringify(res.residual));
  ok(res.format && res.format.sampleFormat === 'float32' && res.licence && Array.isArray(res.weights), 'separation.js: format, licence, weights');

  fs.rmSync(tmp, { recursive: true, force: true });
  if (FULL) await full(py);
  else console.log('(--full not given: the HT-Demucs scoring on the labelled render was not run)');
  finish();
})().catch(function (e) { console.log('ERROR ' + (e && e.stack || e)); process.exit(2); });

async function full(py) {
  var dir = path.join(ROOT, 'tools', 'out', 'sepcheck'), base = 'app-mainA3-0-16-v3', solos = [].concat(TRUTH.drums, TRUTH.bass, TRUTH.other);
  solos.forEach(function (t) {
    var f = path.join(dir, base + '-solo-' + t + '.wav');
    if (fs.existsSync(f)) return;
    var rr = cp.spawnSync('node', [path.join(ROOT, 'tools', 'render.js'), '--page', 'app', '--sections', 'mainA3', '--bars', '16', '--song', 'v3', '--solo', t, '--out', dir], { encoding: 'utf8' });
    ok(rr.status === 0, 'render solo ' + t, (rr.stderr || '').slice(-300));
  });
  var truth = {}, lin = null;
  Object.keys(TRUTH).forEach(function (st) {
    TRUTH[st].forEach(function (t) {
      var w = readWav(path.join(dir, base + '-solo-' + t + '.wav')).ch;
      if (!truth[st]) truth[st] = [new Float64Array(w[0].length), new Float64Array(w[0].length)];
      if (!lin) lin = [new Float64Array(w[0].length), new Float64Array(w[0].length)];
      for (var c = 0; c < 2; c++) for (var i = 0; i < w[c].length; i++) { truth[st][c][i] += w[c][i]; lin[c][i] += w[c][i]; }
    });
  });
  var linp = path.join(dir, 'linmix.wav'), out = path.join(dir, 'htdemucs');
  writeWav(linp, lin, SR, 'f32');
  lin = readWav(linp).ch;   // the float32 values on disk are the mix the separator sees
  var t0 = Date.now(), r = sep(py, [linp, '--model', 'htdemucs', '--out', out]);
  var secs = (Date.now() - t0) / 1000;
  ok(r.code === 0, 'htdemucs on the linear mix exit 0', r.err.slice(-400));
  if (r.code !== 0) return;
  var c = checkRun('htdemucs', out, 'linmix', lin, null), info = c.info;
  ok(info.model === 'htdemucs' && info.weights.length >= 1 && info.weights.every(function (w) { return /^[0-9a-f]{64}$/.test(w.sha256) && w.bytes > 0; }), 'htdemucs: weights sha256 in the sidecar', JSON.stringify(info.weights));
  var rows = [];
  Object.keys(BASE).forEach(function (st) {
    var est = readWav(info.stems[st]).ch, s = sdr(truth[st], est);
    rows.push(st + ' SDR ' + s.sdr.toFixed(2) + ' (SI-SDR ' + s.si.toFixed(2) + ') vs ' + BASE[st].toFixed(1));
    ok(s.sdr >= BASE[st] - TOL_DB, 'htdemucs ' + st + ' SDR within ' + TOL_DB + ' dB of ' + BASE[st], s.sdr.toFixed(2));
  });
  console.log('htdemucs on ' + base + ' linear mix (' + secs.toFixed(1) + ' s wall): ' + rows.join('; '));
  console.log('residual ' + info.residual.relativeDb + ' dB against the mix (' + info.residual.rmsDbfs + ' dBFS rms); stems + residual max error ' + c.err.toExponential(2) +
              '; weights ' + info.weights.map(function (w) { return w.file + ' sha256 ' + w.sha256; }).join(', '));
}

function finish() {
  console.log(bad ? 'FAILED: ' + bad + ' of ' + n + ' checks' : 'OK: ' + n + ' checks passed');
  process.exit(bad ? 1 : 0);
}
