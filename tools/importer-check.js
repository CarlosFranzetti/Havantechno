#!/usr/bin/env node
/* tools/importer-check.js (D1, Dubplate Crew): checks for app/engine/importer.js.
 *
 *   node tools/importer-check.js            Node checks on synthetic audio with known answers (tempo at several tempos and
 *                                           offsets, steps with velocity, notes with len, slide and accent, folding,
 *                                           BS.1770-4 loudness, build). Prints "OK: N checks passed", exit 0, or exit 1.
 *   node tools/importer-check.js --truth    Measurement against the engine's own renders in headless Chromium: drum voices
 *                                           with known 16-step patterns, a tb303 and a modeld line with known notes,
 *                                           accents and slides, and a short multi-track song imported through
 *                                           Project.importTrack with its solo renders as stems. Prints the tempo error and
 *                                           the fraction of steps and notes recovered, writes tools/out/importer-truth/
 *                                           results.json. Exit 0 when it ran (the numbers are measurements, not a pass
 *                                           line), 2 on a harness error.
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http');
var REPO = path.resolve(__dirname, '..');

// ------------------------------------------------------------------ synthetic material (Node)
function rng(s) { return function () { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; }; }
function synthDrums(bpm, off, bars, sr, o) {
  o = o || {};
  var R = rng(o.seed || 3), sd = 15 / bpm, n = Math.round((off + bars * 16 * sd + 0.5) * sr), L = new Float32Array(n), truth = {}, s, i, swing = o.swing || 0;
  function add(t, len, f, g) { var a = Math.round(t * sr); for (i = 0; i < len && a + i < n; i++) L[a + i] += g * f(i / sr); }
  var ph = 0, p = 0, pat = o.pattern || { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.' };
  for (s = 0; s < bars * 16; s++) {
    var t = off + s * sd + ((s % 2) ? swing * sd * 0.33 : 0), k = s % 16;
    if (pat.kick[k] !== '.') { ph = 0; add(t, Math.round(0.25 * sr), function (u) { ph += 2 * Math.PI * (50 + 150 * Math.exp(-u / 0.03)) / sr; return Math.sin(ph) * Math.exp(-u / 0.1); }, pat.kick[k] === 'X' ? 1 : 0.6); truth[s] = (truth[s] || 0) + 1; }
    if (pat.snare[k] !== '.') { add(t, Math.round(0.15 * sr), function (u) { return ((R() * 2 - 1) * 0.6 + 0.4 * Math.sin(2 * Math.PI * 190 * u)) * Math.exp(-u / 0.05); }, 0.6); truth[s] = (truth[s] || 0) + 1; }
    if (pat.hat[k] !== '.') { add(t, Math.round(0.05 * sr), function (u) { var w = R() * 2 - 1, d = w - p; p = w; return d * 0.5 * Math.exp(-u / 0.012); }, pat.hat[k] === 'X' ? 0.5 : 0.25); truth[s] = (truth[s] || 0) + 1; }
  }
  return { L: L, truth: truth };
}
var LINE = [[0, 36, 1, 0, 1], [2, 36, 1, 0, 0], [3, 48, 2, 0, 0], [6, 43, 1, 1, 0], [7, 46, 1, 0, 0], [10, 39, 2, 0, 1], [14, 41, 1, 0, 0]];
function synthLine(bpm, off, bars, sr, glide) {
  var sd = 15 / bpm, n = Math.round((off + bars * 16 * sd + 0.5) * sr), y = new Float32Array(n), ev = [], j = 0, f = 0, tf = 0, ph = 0, amp = 0, env = 0, gateOff = -1;
  for (var b = 0; b < bars; b++) LINE.forEach(function (q) { ev.push({ t: off + (b * 16 + q[0]) * sd, step: b * 16 + q[0], note: q[1], len: q[2], slide: q[3], acc: q[4] }); });
  for (var i = 0; i < n; i++) {
    var t = i / sr;
    while (j < ev.length && ev[j].t <= t) {
      var e = ev[j], pr = ev[j - 1], leg = pr && pr.slide && Math.abs(pr.t + pr.len * sd - e.t) < 1e-6;
      tf = 440 * Math.pow(2, (e.note - 69) / 12); if (!leg) { f = tf; env = e.acc ? 1 : 0.45; }
      gateOff = e.slide ? e.t + e.len * sd + 0.02 : e.t + (e.len - 0.5) * sd; j++;
    }
    f += (tf - f) * (1 - Math.exp(-1 / ((glide || 0.012) * sr)));
    var on = t < gateOff; amp += ((on ? env : 0) - amp) * (1 - Math.exp(-1 / (0.003 * sr))); if (on) env *= Math.exp(-1 / (0.5 * sr));
    ph += f / sr; ph -= Math.floor(ph); y[i] = amp * (2 * ph - 1) * 0.5;
  }
  return { L: y, ev: ev };
}

function nodeChecks() {
  vm.runInThisContext(fs.readFileSync(path.join(REPO, 'app', 'engine', 'importer.js'), 'utf8'), { filename: 'importer.js' });
  var I = globalThis.Importer, SR = 44100, passed = 0, failed = [];
  function check(name, ok, info) { if (ok) passed++; else failed.push(name); console.log((ok ? 'pass ' : 'FAIL ') + name + (info ? '  ' + info : '')); }
  // tempo across tempos and offsets (174 is read as 87: a half-tempo reading, reported, not hidden)
  [[120, 0.05], [126, 0.31], [93.5, 0.05], [137, 1.1], [100, 0.0], [128, 2.0]].forEach(function (c) {
    var d = synthDrums(c[0], c[1], 16, SR), t = I.tempo({ data: d.L, sampleRate: SR });
    var offErr = Math.abs(t.offset - c[1]);
    check('tempo ' + c[0] + ' BPM, offset ' + c[1] + ' s', Math.abs(t.bpm - c[0]) < 0.01 && offErr < 0.002, t.bpm + ' BPM, offset ' + t.offset + ' (error ' + Math.round(offErr * 10000) / 10 + ' ms), confidence ' + t.confidence + ', downbeat confidence ' + t.downbeatConfidence);
  });
  var dnb = I.tempo({ data: synthDrums(174, 0.05, 16, SR, { pattern: { kick: 'x.........x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' } }).L, sampleRate: SR });
  check('a 174 BPM break reads 174 or 87 (a half-tempo reading is a known octave ambiguity)', dnb.bpm === 174 || dnb.bpm === 87, dnb.bpm + ' BPM');
  // swing: odd sixteenths late by swing * step * 0.33 (the engine's swing)
  var sw = synthDrums(124, 0.05, 8, SR, { swing: 0.6, pattern: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx' } }), ts = I.tempo({ data: sw.L, sampleRate: SR });
  var ss = I.steps({ data: sw.L, sampleRate: SR }, { bpm: ts.bpm, offset: ts.offset, bars: 8 }), got = ss.cells.filter(Boolean).length;
  check('swing 0.6: tempo and every hat step', ts.bpm === 124 && got === 128, ts.bpm + ' BPM, ' + got + ' of 128 steps');
  // steps with accents
  var ac = synthDrums(125, 0.05, 8, SR, { pattern: { kick: 'X..x..X...x.x...', snare: '....x.......x..x', hat: 'X.x.X.x.X.x.X.x.' } }), tp = I.tempo({ data: ac.L, sampleRate: SR });
  var sa = I.steps({ data: ac.L, sampleRate: SR }, { bpm: tp.bpm, offset: tp.offset, bars: 8 }), hit = 0, extra = 0;
  sa.cells.forEach(function (c, i) { if (c && ac.truth[i]) hit++; else if (c) extra++; });
  check('steps of a syncopated loop', hit === Object.keys(ac.truth).length && extra === 0, hit + ' of ' + Object.keys(ac.truth).length + ', ' + extra + ' extra (tempo ' + tp.bpm + ')');
  check('velocity: an accented kick reads louder than a plain one', sa.cells[0].vel > sa.cells[3].vel, sa.cells[0].vel + ' > ' + sa.cells[3].vel);
  // notes
  [[0.012, 'fast glide'], [0.025, 'slow glide']].forEach(function (g) {
    var ln = synthLine(128, 0.05, 4, SR, g[0]), nt = I.notes({ data: ln.L, sampleRate: SR }, { bpm: 128, offset: 0.05, bars: 4 }), n = 0, l = 0, s = 0, a = 0;
    ln.ev.forEach(function (e) { var c = nt.cells[e.step]; if (c && c.note === e.note) { n++; if (c.len === e.len) l++; if (!!c.slide === !!e.slide) s++; if (!!c.acc === !!e.acc) a++; } });
    check('notes, ' + g[1], n >= 0.85 * ln.ev.length, n + ' of ' + ln.ev.length + ' notes, len ' + l + ', slide ' + s + ', accent ' + a + ' (of those found)');
  });
  // loudness
  var sine = new Float32Array(SR * 2); for (var i = 0; i < sine.length; i++) sine[i] = 0.1 * Math.sin(2 * Math.PI * 997 * i / SR);
  check('BS.1770-4: 997 Hz at -20 dBFS on two channels reads -20.00 LUFS', I.loudness({ L: sine, R: sine, sr: SR }).lufs === -20);
  var quiet = new Float32Array(SR * 4); for (i = 0; i < SR * 2; i++) quiet[i] = sine[i];
  var lq = I.loudness({ L: quiet, R: quiet, sr: SR }).lufs;
  check('BS.1770-4: two seconds of silence are gated out (blocks across the edge still count)', Math.abs(lq + 20.34) <= 0.02, lq + ' LUFS (17 full blocks and 3 part blocks above the relative gate: -20.34 by hand)');
  var s48 = new Float32Array(48000 * 2); for (i = 0; i < s48.length; i++) s48[i] = 0.1 * Math.sin(2 * Math.PI * 997 * i / 48000);
  check('BS.1770-4 at 48 kHz', Math.abs(I.loudness({ L: s48, R: s48, sr: 48000 }).lufs + 20) <= 0.01);
  // fold
  var v = { bars: 8, cells: [] }; for (i = 0; i < 128; i++) v.cells.push((i % 32 === 0 || i % 32 === 20) ? { vel: 1 } : null);
  var fo = I.fold(v, {});
  check('fold: a two-bar pattern folds to two bars', fo && fo.bars === 2 && fo.cells[0] && fo.cells[20] && !fo.cells[4]);
  v.cells[100] = { vel: 1 }; v.cells[101] = { vel: 1 }; v.cells[102] = { vel: 1 };
  fo = I.fold(v, { agree: 0.95 });
  check('fold: a pattern with a fill does not fold at 95 % agreement', fo === null);
  // build: element reports -> tracks
  var drums = synthDrums(125, 0.05, 8, SR), line = synthLine(125, 0.05, 8, SR);
  var an = { version: 1, source: { name: 'x', duration: drums.L.length / SR, sampleRate: SR }, bpm: { value: 125, confidence: 0.9, offset: 0.05 },
             elements: [{ id: 'drums-kick', name: 'drums: kick band', stem: 'drums', band: [0, 150], bandKey: 'kick', role: 'drums', decisions: { drumMachine: { value: { machine: 'tr909' }, confidence: 'high', p: 0.9 } }, recreation: { type: 'bd909', params: { decay: 0.5, bogus: 3 }, confidence: 'high' }, source: { audio: 'd' } },
                        { id: 'bass', name: 'bass', stem: 'bass', role: 'bass', decisions: { monoPoly: { value: 'mono', confidence: 'medium', p: 0.75 } }, recreation: { type: 'tb303', params: { wave: 'saw' }, confidence: 'low' }, source: { audio: 'b' } },
                        { id: 'other', name: 'other', stem: 'other', role: 'other', decisions: {}, recreation: null, source: { audio: 'o' } }] };
  var b = I.build(an, { buffers: { 'drums-kick': { data: drums.L, sampleRate: SR }, bass: { data: line.L, sampleRate: SR }, other: { data: line.L, sampleRate: SR } } });
  check('build: one track per element and one section playing them', b.tracks.length === 3 && b.sections.length === 1 && b.sections[0].bars === 8 && Object.keys(b.sections[0].play).length === 3, b.tracks.map(function (t) { return t.name + ':' + t.inst; }).join(', '));
  check('build: drum voice with steps, bass with notes, no recreation -> sampler playing the stem', b.tracks[0].kind === 'drum' && b.tracks[1].kind === 'melody' && b.tracks[2].type === 'sampler' && b.tracks[2].analysis.pattern.method === 'stem playback' && b.tracks[2].variants.A.cells[0]);
  check('build: confidences and the analysis decisions ride on the track', b.tracks[0].analysis.recreation.confidence === 'high' && b.tracks[0].analysis.decisions.drumMachine.confidence === 'high' && typeof b.tracks[1].analysis.pattern.p === 'number');
  console.log(failed.length ? 'FAILED: ' + failed.length + ' of ' + (passed + failed.length) + ' checks' : 'OK: ' + passed + ' checks passed');
  process.exit(failed.length ? 1 : 0);
}

// ------------------------------------------------------------------ truth in headless Chromium
var ENGINE = ['core', 'programs', 'synths', 'drums', 'worklets', 'classics', 'processors', 'songdoc', 'sequencer', 'song', 'host', 'project', 'importer'];
var ANALYSIS = ['dsp', 'features', 'decide', 'drumlib', 'report'];
var MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
function serve() {
  var page = '<!doctype html><meta charset="utf-8"><title>importer truth</title>' + ENGINE.map(function (f) { return '<script src="/app/engine/' + f + '.js"></script>'; }).join('') +
             ANALYSIS.map(function (f) { return '<script src="/app/analysis/' + f + '.js"></script>'; }).join('');
  return new Promise(function (res, rej) {
    var s = http.createServer(function (q, r) {
      var p = decodeURIComponent(q.url.split('?')[0]), H = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' };
      if (p === '/__importer__.html') { r.writeHead(200, Object.assign({ 'Content-Type': 'text/html' }, H)); return r.end(page); }
      var f = path.normalize(path.join(REPO, p));
      if (f.indexOf(REPO + path.sep) !== 0) { r.writeHead(403); return r.end(); }
      fs.readFile(f, function (e, d) { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, Object.assign({ 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }, H)); r.end(d); });
    });
    s.on('error', rej); s.listen(0, '127.0.0.1', function () { res(s); });
  });
}

// runs in the page. Every case is a SongDoc rendered by Sequencer.render (bar 1 at 0.05 s of the buffer)
function pageTruth() {
  var OFF = 0.05, SR = 44100;
  function cells(bars, list) { var c = []; for (var i = 0; i < bars * 16; i++) c.push(null); list.forEach(function (x) { c[x[0]] = x[1]; }); return c; }
  function pat(str, bars, velOf) { var out = []; for (var b = 0; b < bars; b++) for (var i = 0; i < 16; i++) { var ch = str[i]; if (ch !== '.') out.push([b * 16 + i, { vel: velOf ? velOf(ch, b, i) : (ch === 'X' ? 1 : ch === 'o' ? 0.5 : 0.85) }]); } return out; }
  function doc(bpm, swing, tracks, bars) {
    var play = {}; tracks.forEach(function (t) { play[t.name] = 'A'; });
    return { v: 1, name: 'truth', bpm: bpm, swing: swing || 0, key: null, progression: ['Am'], sends: {}, tracks: tracks, sections: [{ name: 's', bars: bars, play: play }] };
  }
  function render(d, bars) { return Sequencer.render(function (s) { Song.build(s, SongDoc.load(d)); }, { from: 0, to: bars, sampleRate: SR, tail: 1 }); }
  function only(d, names) { var c = JSON.parse(JSON.stringify(d)); c.tracks = c.tracks.filter(function (t) { return names.indexOf(t.name) >= 0; }); return c; }
  function stepScore(truthCells, gotCells) {
    var tp = 0, fp = 0, fn = 0, velErr = [], tmax = 0, gmax = 0;
    truthCells.forEach(function (c) { if (c && (c.vel || 0.85) > tmax) tmax = c.vel || 0.85; });
    gotCells.forEach(function (c) { if (c && c.vel > gmax) gmax = c.vel; });
    for (var i = 0; i < truthCells.length; i++) {
      var t = truthCells[i], g = gotCells[i];
      if (t && g) { tp++; velErr.push(Math.abs((t.vel || 0.85) / tmax - g.vel / gmax)); } else if (t) fn++; else if (g) fp++;
    }
    velErr.sort(function (a, b) { return a - b; });
    return { truth: tp + fn, found: tp, extra: fp, recall: tp / Math.max(1, tp + fn), precision: tp / Math.max(1, tp + fp), velErrMedian: velErr.length ? Math.round(velErr[velErr.length >> 1] * 100) / 100 : null };
  }
  function noteScore(truthCells, gotCells) {
    var n = 0, tot = 0, len = 0, slT = 0, slTP = 0, slFP = 0, accOk = 0, extra = 0, wrongPitch = 0, near = 0;
    for (var i = 0; i < truthCells.length; i++) {
      var t = truthCells[i], g = gotCells[i];
      if (t) {
        tot++; if (t.slide) slT++;
        if (g && g.note === t.note) { n++; if ((g.len || 1) === (t.len || 1)) len++; if (t.slide && g.slide) slTP++; if (!t.slide && g.slide) slFP++; if (!!t.acc === !!g.acc) accOk++; }
        else if (g) { wrongPitch++; if (Math.abs(g.note - t.note) === 12) near++; }
      } else if (g) extra++;
    }
    return { truth: tot, found: n, recall: n / Math.max(1, tot), lenRight: len, slides: slT, slidesFound: slTP, slideFalse: slFP, accentRight: accOk, wrongPitch: wrongPitch, octaveOff: near, extra: extra };
  }
  function expand(v, bars) { var out = []; for (var i = 0; i < bars * 16; i++) out.push(v.cells[i % v.cells.length]); return out; }
  function union(list, bars) { var out = []; for (var i = 0; i < bars * 16; i++) { var best = null; list.forEach(function (c) { var x = c[i]; if (x && (!best || (x.vel || 0.85) > (best.vel || 0.85))) best = x; }); out.push(best); } return out; }

  var results = { cases: [], wavs: {} };
  function keep(name, buf) { var u = new Uint8Array(Sequencer.wav(buf)), str = ''; for (var j = 0; j < u.length; j += 0x8000) str += String.fromCharCode.apply(null, u.subarray(j, j + 0x8000)); results.wavs[name] = btoa(str); }
  // where the audio of bar 1 really starts: the master chain delays the scheduled time (0.05 s) by its own latency
  function audibleStart(b) { var x = b.getChannelData(0), pk = 0, i; for (i = 0; i < x.length; i++) pk = Math.max(pk, Math.abs(x[i])); for (i = 0; i < x.length; i++) if (Math.abs(x[i]) > 0.01 * pk) return i / b.sampleRate; return null; }
  // ---- 1. TR-909 voices at 126 BPM, 8 bars, accents on the hats and the kick
  var B1 = 8, d1 = doc(126, 0, [
    { name: 'bd', inst: 'bd909', kind: 'drum', gain: 0.9, variants: { A: { bars: B1, cells: cells(B1, pat('X...x...X...x..x', B1)) } } },
    { name: 'sd', inst: 'sd909', kind: 'drum', gain: 0.7, variants: { A: { bars: B1, cells: cells(B1, pat('....x.......x.o.', B1)) } } },
    { name: 'ch', inst: 'ch909', kind: 'drum', gain: 0.5, variants: { A: { bars: B1, cells: cells(B1, pat('x.X.x.X.x.X.x.XX', B1)) } } },
    { name: 'cp', inst: 'cp909', kind: 'drum', gain: 0.6, variants: { A: { bars: B1, cells: cells(B1, pat('....x.......x...', B1)) } } }], B1);
  // ---- 2. TR-808 voices at 98 BPM with swing 0.4
  var d2 = doc(98, 0.4, [
    { name: 'bd', inst: 'bd808', kind: 'drum', gain: 0.9, variants: { A: { bars: B1, cells: cells(B1, pat('x..x..x...x..x..', B1)) } } },
    { name: 'sd', inst: 'sd808', kind: 'drum', gain: 0.7, variants: { A: { bars: B1, cells: cells(B1, pat('....x.......x..x', B1)) } } },
    { name: 'ch', inst: 'ch808', kind: 'drum', gain: 0.5, variants: { A: { bars: B1, cells: cells(B1, pat('xxXxxxXxxxXxxxXx', B1)) } } },
    { name: 'cb', inst: 'cb808', kind: 'drum', gain: 0.4, variants: { A: { bars: B1, cells: cells(B1, pat('..x.....x.....x.', B1)) } } }], B1);
  // ---- 3. tb303 and modeld lines: two bars, repeated (notes, lengths, accents, slides)
  var L303 = [[0, 33, 1, 0, 1], [2, 33, 1, 0, 0], [3, 45, 1, 1, 0], [4, 40, 2, 0, 0], [7, 36, 1, 0, 1], [8, 38, 1, 1, 0], [9, 43, 1, 0, 0], [11, 33, 3, 0, 0], [14, 45, 1, 0, 1],
              [16, 31, 1, 0, 0], [18, 31, 1, 1, 0], [19, 43, 2, 0, 1], [22, 38, 1, 0, 0], [24, 36, 1, 1, 0], [25, 41, 1, 0, 0], [27, 33, 2, 0, 1], [30, 40, 1, 1, 0], [31, 45, 1, 0, 0]];
  function lineCells(bars) { var c = []; for (var i = 0; i < bars * 16; i++) c.push(null); for (var b = 0; b < bars; b += 2) L303.forEach(function (q) { var x = { note: q[1], len: q[2], vel: 0.85 }; if (q[3]) x.slide = true; if (q[4]) x.acc = true; c[b * 16 + q[0]] = x; }); return c; }
  var d3 = doc(128, 0, [{ name: 'acid', inst: 'tb303', kind: 'melody', gain: 0.8, gate: 1, variants: { A: { bars: B1, cells: lineCells(B1) } } }], B1);
  var d4 = doc(122, 0, [{ name: 'md', inst: 'modeld', kind: 'melody', gain: 0.8, gate: 1, variants: { A: { bars: B1, cells: lineCells(B1).map(function (c) { if (!c) return c; var x = JSON.parse(JSON.stringify(c)); x.note += 12; return x; }) } } }], B1);
  var work = Promise.resolve();
  function drumCase(name, d) {
    work = work.then(function () {
      var bars = d.sections[0].bars, mix;
      return render(d, bars).then(function (m) {
        mix = m; keep(name.split(',')[0].replace(/[^a-z0-9]+/gi, '-'), m); var t0 = performance.now(), tp = Importer.tempo(m), ms = performance.now() - t0, aud = audibleStart(m);
        var c = { name: name, bpm: d.bpm, swing: d.swing, tempo: tp, tempoError: Math.round((tp.bpm - d.bpm) * 1000) / 1000, offsetErrorMs: Math.round((tp.offset - OFF) * 10000) / 10, audibleStart: aud, offsetVsAudibleMs: Math.round((tp.offset - aud) * 10000) / 10, tempoMs: Math.round(ms), voices: [] };
        var chain = Promise.resolve();
        d.tracks.forEach(function (t) {
          chain = chain.then(function () { return render(only(d, [t.name]), bars); }).then(function (solo) {
            var st = Importer.steps(solo, { bpm: d.bpm, offset: aud, bars: bars }), stE = Importer.steps(solo, { bpm: tp.bpm, offset: tp.offset, bars: bars });
            c.voices.push({ voice: t.inst, withTrueGrid: stepScore(t.variants.A.cells, st.cells), withReadGrid: stepScore(t.variants.A.cells, stE.cells), stats: stE.stats });
          });
        });
        return chain.then(function () {
          var all = union(d.tracks.map(function (t) { return t.variants.A.cells; }), bars), sm = Importer.steps(mix, { bpm: tp.bpm, offset: tp.offset, bars: bars });
          c.mixSteps = stepScore(all, sm.cells);
          results.cases.push(c);
        });
      });
    });
  }
  function lineCase(name, d) {
    work = work.then(function () {
      var bars = d.sections[0].bars, t = d.tracks[0];
      return render(d, bars).then(function (m) {
        keep(name.split(',')[0].replace(/[^a-z0-9]+/gi, '-'), m);
        var tp = Importer.tempo(m), aud = audibleStart(m), nt = Importer.notes(m, { bpm: d.bpm, offset: aud, bars: bars }), ntE = Importer.notes(m, { bpm: tp.bpm, offset: tp.offset, bars: bars });
        results.cases.push({ name: name, bpm: d.bpm, tempo: tp, tempoError: Math.round((tp.bpm - d.bpm) * 1000) / 1000, offsetErrorMs: Math.round((tp.offset - OFF) * 10000) / 10,
                             withTrueGrid: noteScore(t.variants.A.cells, nt.cells), withReadGrid: noteScore(t.variants.A.cells, ntE.cells), stats: nt.stats,
                             sample: nt.cells.slice(0, 32).map(function (x) { return x ? x.note + (x.slide ? 's' : '') + (x.acc ? '!' : '') + (x.len > 1 ? '/' + x.len : '') : '.'; }).join(' ') });
      });
    });
  }
  drumCase('909 kit, 126 BPM', d1);
  drumCase('808 kit, 98 BPM, swing 0.4', d2);
  lineCase('tb303 line, 128 BPM', d3);
  lineCase('modeld line, 122 BPM', d4);

  // ---- 5. a short song imported through Project.importTrack with its solo renders as stems
  var B5 = 16, chordCells = cells(B5, [[0, { note: 57, len: 8, vel: 0.8 }], [16, { note: 60, len: 8, vel: 0.8 }], [32, { note: 55, len: 8, vel: 0.8 }], [48, { note: 53, len: 8, vel: 0.8 }]].concat(
    [[64, { note: 57, len: 8, vel: 0.8 }], [80, { note: 60, len: 8, vel: 0.8 }], [96, { note: 55, len: 8, vel: 0.8 }], [112, { note: 53, len: 8, vel: 0.8 }], [128, { note: 57, len: 8, vel: 0.8 }], [144, { note: 60, len: 8, vel: 0.8 }], [160, { note: 55, len: 8, vel: 0.8 }], [176, { note: 53, len: 8, vel: 0.8 }], [192, { note: 57, len: 8, vel: 0.8 }], [208, { note: 60, len: 8, vel: 0.8 }], [224, { note: 55, len: 8, vel: 0.8 }], [240, { note: 53, len: 8, vel: 0.8 }]]));
  var d5 = doc(124, 0, [
    { name: 'kick', inst: 'bd909', kind: 'drum', gain: 0.9, variants: { A: { bars: B5, cells: cells(B5, pat('x...x...x...x...', B5)) } } },
    { name: 'clap', inst: 'cp909', kind: 'drum', gain: 0.6, variants: { A: { bars: B5, cells: cells(B5, pat('....x.......x...', B5)) } } },
    { name: 'hat', inst: 'ch909', kind: 'drum', gain: 0.45, variants: { A: { bars: B5, cells: cells(B5, pat('..x...x...x...xx', B5)) } } },
    { name: 'acid', inst: 'tb303', kind: 'melody', gain: 0.7, gate: 1, variants: { A: { bars: B5, cells: lineCells(B5) } } },
    { name: 'lead', inst: 'fm', kind: 'melody', gain: 0.35, gate: 1, params: {}, variants: { A: { bars: B5, cells: chordCells } } }], B5);
  work = work.then(function () {
    var stems = { drums: ['kick', 'clap', 'hat'], bass: ['acid'], other: ['lead'] }, bufs = {};
    var chain = render(d5, B5).then(function (m) { bufs.mix = m; keep('song-mix', m); });
    Object.keys(stems).forEach(function (k) { chain = chain.then(function () { return render(only(d5, stems[k]), B5); }).then(function (b) { bufs[k] = b; }); });
    return chain.then(function () {
      var host = Host.create(), saved = [], stages = [], t0 = performance.now();
      var shell = { saveFile: function (o) { saved.push(o.text.length); return Promise.resolve({ path: '/tmp/' + o.name }); } };
      return Project.importTrack({ host: host, shell: shell, file: { name: 'song.wav', bytes: Sequencer.wav(bufs.mix) },
        stems: ['drums', 'bass', 'other'].map(function (k) { return { name: k, source: { name: k + '.wav', bytes: Sequencer.wav(bufs[k]) } }; }),
        onProgress: function (e) { stages.push(e.stage + (e.note ? ': ' + e.note : '')); } }).then(function (r) {
        var dd = host.document(), an = r.analysis, out = { name: 'song import (16 bars, 124 BPM, stems drums/bass/other)', seconds: Math.round((performance.now() - t0) / 100) / 10, saved: saved.length, savedName: r.saved && r.saved.name,
          bpm: an.bpm, tempoError: Math.round((an.bpm.value - 124) * 1000) / 1000, offsetErrorMs: Math.round((an.bpm.offset - OFF) * 10000) / 10, audibleStart: audibleStart(bufs.mix), offsetVsAudibleMs: Math.round((an.bpm.offset - audibleStart(bufs.mix)) * 10000) / 10, reference: host.reference(), level: r.level, stages: stages.filter(function (s, i, a) { return a.indexOf(s) === i; }).slice(0, 40), elements: [] };
        var truthFor = { 'drums-kick': ['kick'], 'drums-snare': ['clap'], 'drums-hats': ['hat'], bass: ['acid'], other: ['lead'] };
        an.elements.forEach(function (el) {
          var tr = dd.tracks.filter(function (t) { return t.name === el.track; })[0], row = { element: el.id, track: el.track, type: tr ? tr.inst : null, recreation: el.recreation ? el.recreation.type + ' [' + el.recreation.confidence + ']' : null,
            decisions: Object.keys(el.decisions || {}).map(function (k) { var x = el.decisions[k]; var v = x.value; return k + '=' + (v && typeof v === 'object' ? (v.machine ? v.machine + ' ' + (v.voice || '') : JSON.stringify(v).slice(0, 40)) : v) + ' [' + x.confidence + ']'; }),
            pattern: tr ? tr.analysis.pattern : null, variantBars: tr ? tr.variants.A.bars : null };
          var tn = truthFor[el.id];
          if (tr && tn) {
            var T = union(d5.tracks.filter(function (t) { return tn.indexOf(t.name) >= 0; }).map(function (t) { return t.variants.A.cells; }), B5), G = expand(tr.variants.A, B5);
            row.score = tr.kind === 'melody' ? noteScore(T, G) : stepScore(T, G);
            row.scoreKind = tr.kind === 'melody' ? 'notes' : 'steps';
          }
          out.elements.push(row);
        });
        out.tracks = dd.tracks.map(function (t) { return t.name + ':' + t.inst; });
        out.sections = dd.sections.map(function (s) { return s.name + ' ' + s.bars + ' bars'; });
        out.unverified = an.unverified;
        // A/B and export: the reference is outside the render
        return host.render({ from: 0, to: 2 }).then(function (b) { out.exportChannels = b.numberOfChannels; results.cases.push(out); });
      });
    });
  });
  return work.then(function () { return results; });
}

(async function truth() {
  if (process.argv.indexOf('--truth') < 0) return nodeChecks();
  var pw;
  try { pw = require('playwright'); } catch (e) { console.error('importer-check: Playwright not found'); process.exit(2); }
  var srv = await serve(), br = await pw.chromium.launch(), errs = [];
  try {
    var page = await br.newPage();
    page.on('pageerror', function (e) { errs.push(e.message); });
    page.on('console', function (m) { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto('http://127.0.0.1:' + srv.address().port + '/__importer__.html', { waitUntil: 'load' });
    page.setDefaultTimeout(0);
    var res = await page.evaluate(pageTruth);
    var dir = path.join(REPO, 'tools', 'out', 'importer-truth'); fs.mkdirSync(dir, { recursive: true });
    Object.keys(res.wavs || {}).forEach(function (k) { fs.writeFileSync(path.join(dir, k + '.wav'), Buffer.from(res.wavs[k], 'base64')); });
    delete res.wavs;
    fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify(res, null, 1));
    res.cases.forEach(function (c) {
      console.log('\n== ' + c.name);
      console.log('tempo ' + (c.tempo ? c.tempo.bpm : c.bpm.value) + ' (error ' + c.tempoError + ' BPM), offset ' + (c.offsetVsAudibleMs == null ? '' : c.offsetVsAudibleMs + ' ms from the audible start of bar 1 (' + Math.round(c.audibleStart * 10000) / 10 + ' ms; scheduled 50 ms), ') + c.offsetErrorMs + ' ms from the scheduled time' + (c.tempo ? ', confidence ' + c.tempo.confidence + ', downbeat confidence ' + c.tempo.downbeatConfidence + ', grid rms ' + c.tempo.gridRmsMs + ' ms' : ''));
      (c.voices || []).forEach(function (v) { console.log('  ' + v.voice + ': steps recall ' + v.withReadGrid.recall.toFixed(2) + ' precision ' + v.withReadGrid.precision.toFixed(2) + ' (' + v.withReadGrid.found + '/' + v.withReadGrid.truth + ', ' + v.withReadGrid.extra + ' extra), vel error median ' + v.withReadGrid.velErrMedian + '; true grid recall ' + v.withTrueGrid.recall.toFixed(2)); });
      if (c.mixSteps) console.log('  full mix steps (any voice): recall ' + c.mixSteps.recall.toFixed(2) + ' precision ' + c.mixSteps.precision.toFixed(2));
      if (c.withReadGrid) { var s = c.withReadGrid; console.log('  notes ' + s.found + '/' + s.truth + ' (' + s.recall.toFixed(2) + '), len right ' + s.lenRight + ', slides ' + s.slidesFound + '/' + s.slides + ' (+' + s.slideFalse + ' false), accent right ' + s.accentRight + ', wrong pitch ' + s.wrongPitch + ' (octave ' + s.octaveOff + '), extra ' + s.extra + '; true grid ' + c.withTrueGrid.found + '/' + c.withTrueGrid.truth); console.log('  first 2 bars read: ' + c.sample); }
      if (c.elements) {
        console.log('  ' + c.seconds + ' s, saved ' + c.saved + ' (' + c.savedName + '), reference ' + JSON.stringify(c.reference) + ', level ' + JSON.stringify(c.level));
        console.log('  tracks: ' + c.tracks.join(', ') + '; sections: ' + c.sections.join(', '));
        c.elements.forEach(function (e) {
          var s = e.score, sc = !s ? '' : e.scoreKind === 'notes' ? 'notes ' + s.found + '/' + s.truth + ', slides ' + s.slidesFound + '/' + s.slides + ', extra ' + s.extra : 'steps recall ' + s.recall.toFixed(2) + ' precision ' + s.precision.toFixed(2);
          console.log('  ' + e.element + ' -> ' + e.track + ' (' + e.type + '; suggested ' + e.recreation + '; pattern ' + (e.pattern ? e.pattern.method + ' [' + e.pattern.confidence + '], ' + e.variantBars + ' bars' : '-') + '): ' + sc);
          console.log('     ' + e.decisions.join('; '));
        });
      }
    });
    console.log('\npage errors: ' + (errs.length ? errs.slice(0, 5).join(' | ') : 'none'));
    console.log('written: tools/out/importer-truth/results.json');
  } catch (e) { console.error('importer-check --truth: harness error: ' + (e && e.stack || e)); await br.close(); srv.close(); process.exit(2); }
  await br.close(); srv.close();
  process.exit(0);
})();
