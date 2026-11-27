#!/usr/bin/env node
/* Havantechno - tools/export-check.js (Pressing Crew, V1)
 * Audio export, audio tracks, bundles and audio options.
 *
 *   node tools/export-check.js            Node checks (no browser): WAV writers read back, clip editing and undo,
 *                                         the audio-track player on a fake context, the stem routing plan, the
 *                                         Project export and bundle calls against a fake shell.
 *   node tools/export-check.js --measure  also headless Chromium (Playwright): real renders, measured. Prints a JSON
 *                                         report. --long adds the whole song (200 bars), mix and all stems, timed,
 *                                         with the peak resident memory of the browser's processes.
 * Exit 0 when every check passes. The measured figures are printed, not asserted, except where the brief sets a bound
 * (export = render to the sample, 16-bit within the dither's bound, stems sum with the master off near zero, the clip
 * onset on the grid to the sample, exact lengths).
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process'), http = require('http');

var ROOT = path.resolve(__dirname, '..'), ENGINE = path.join(ROOT, 'app', 'engine');
var argv = process.argv.slice(2), MEASURE = argv.indexOf('--measure') >= 0 || argv.indexOf('--long') >= 0, LONG = argv.indexOf('--long') >= 0;
var fails = 0, checks = 0;
function ok(c, msg) { checks++; if (!c) { fails++; console.log('  FAIL ' + msg); } }

// ------------------------------------------------------------------ WAV reader (16, 24 PCM and 32 float)
function readWav(ab) {
  var dv = new DataView(ab), tag = function (o) { return String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3)); };
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('not a WAV');
  var p = 12, fmt = null, data = null, fact = null;
  while (p + 8 <= ab.byteLength) {
    var id = tag(p), size = dv.getUint32(p + 4, true), b = p + 8;
    if (id === 'fmt ') fmt = { format: dv.getUint16(b, true), ch: dv.getUint16(b + 2, true), sr: dv.getUint32(b + 4, true), bits: dv.getUint16(b + 14, true), size: size };
    else if (id === 'fact') fact = dv.getUint32(b, true);
    else if (id === 'data') data = { off: b, len: size };
    p = b + size + (size & 1);
  }
  var bps = fmt.bits / 8, n = data.len / (bps * fmt.ch), out = [], c, i;
  for (c = 0; c < fmt.ch; c++) out.push(new Float64Array(n));
  for (i = 0; i < n; i++) for (c = 0; c < fmt.ch; c++) {
    var q = data.off + (i * fmt.ch + c) * bps, v;
    if (fmt.format === 3) v = dv.getFloat32(q, true);
    else if (fmt.bits === 16) v = dv.getInt16(q, true);
    else { v = dv.getUint8(q) | (dv.getUint8(q + 1) << 8) | (dv.getUint8(q + 2) << 16); if (v & 0x800000) v -= 0x1000000; }
    out[c][i] = v;
  }
  return { fmt: fmt, fact: fact, frames: n, ch: out };
}

// ------------------------------------------------------------------ Node part: the engine in a vm with a fake context
function Param(v) { this.value = v; this.calls = []; }
['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'cancelScheduledValues'].forEach(function (m) {
  Param.prototype[m] = function (v, t) { this.calls.push([m, v, t]); if (m === 'setValueAtTime') this.value = v; };
});
function Node(ctx, type) { this.ctx = ctx; this.type_ = type; this.connections = []; }
Node.prototype.connect = function (d) { this.connections.push(d); return d; };
Node.prototype.disconnect = function (d) { if (d == null) this.connections.length = 0; else { var i = this.connections.indexOf(d); if (i >= 0) this.connections.splice(i, 1); } };
function Src(ctx, type) { Node.call(this, ctx, type); this.starts = []; this.stops = []; }
Src.prototype = Object.create(Node.prototype);
Src.prototype.start = function (t, off, dur) { this.starts.push([t, off, dur]); this.ctx._srcs.push(this); };
Src.prototype.stop = function (t) { this.stops.push(t); };
function Ctx(sr) { this.sampleRate = sr || 44100; this.currentTime = 0; this.state = 'running'; this._srcs = []; this.destination = new Node(this, 'dest'); }
Ctx.prototype.resume = function () { return Promise.resolve(); };
Ctx.prototype.close = function () { this.state = 'closed'; return Promise.resolve(); };
Ctx.prototype.createGain = function () { var n = new Node(this, 'gain'); n.gain = new Param(1); return n; };
Ctx.prototype.createOscillator = function () { var n = new Src(this, 'osc'); n.frequency = new Param(440); n.detune = new Param(0); return n; };
Ctx.prototype.createBufferSource = function () { var n = new Src(this, 'bufsrc'); n.buffer = null; n.playbackRate = new Param(1); n.detune = new Param(0); return n; };
Ctx.prototype.createConstantSource = function () { var n = new Src(this, 'const'); n.offset = new Param(1); return n; };
Ctx.prototype.createBuffer = function (ch, len, sr) { var d = []; for (var i = 0; i < ch; i++) d.push(new Float32Array(len)); return { numberOfChannels: ch, length: len, sampleRate: sr, duration: len / sr, getChannelData: function (c) { return d[c]; } }; };
Ctx.prototype.decodeAudioData = function (ab, okf) { var b = this.createBuffer(2, ab.byteLength, this.sampleRate); if (okf) okf(b); return Promise.resolve(b); };
Ctx.prototype.createBiquadFilter = function () { var n = new Node(this, 'biquad'); n.frequency = new Param(350); n.Q = new Param(1); n.gain = new Param(0); n.detune = new Param(0); return n; };
Ctx.prototype.createWaveShaper = function () { return new Node(this, 'shaper'); };
Ctx.prototype.createDelay = function () { var n = new Node(this, 'delay'); n.delayTime = new Param(0); return n; };
Ctx.prototype.createConvolver = function () { return new Node(this, 'convolver'); };
Ctx.prototype.createDynamicsCompressor = function () { var n = new Node(this, 'comp'); ['threshold', 'knee', 'ratio', 'attack', 'release'].forEach(function (k) { n[k] = new Param(0); }); return n; };
Ctx.prototype.createStereoPanner = function () { var n = new Node(this, 'panner'); n.pan = new Param(0); return n; };
Ctx.prototype.createChannelSplitter = function () { return new Node(this, 'split'); };
Ctx.prototype.createChannelMerger = function () { return new Node(this, 'merge'); };
Ctx.prototype.createAnalyser = function () { var n = new Node(this, 'an'); n.getByteTimeDomainData = function () {}; return n; };
function sandbox() {
  var sb = { console: { log: function () {}, warn: function () {} }, setTimeout: setTimeout, setInterval: setInterval, clearInterval: clearInterval, Promise: Promise,
             Float32Array: Float32Array, Uint8Array: Uint8Array, ArrayBuffer: ArrayBuffer, DataView: DataView, WeakMap: WeakMap };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  ['core', 'programs', 'synths', 'drums', 'worklets', 'classics', 'processors', 'songdoc', 'sequencer', 'song', 'audiotrack', 'host', 'project'].forEach(function (f) {
    var p = path.join(ENGINE, f + '.js'); if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), sb, { filename: f + '.js' });
  });
  return sb;
}
function fakeBuffer(ch, n, sr, fill) {
  var d = []; for (var c = 0; c < ch; c++) { var a = new Float32Array(n); for (var i = 0; i < n; i++) a[i] = fill(c, i); d.push(a); }
  return { numberOfChannels: ch, length: n, sampleRate: sr, duration: n / sr, getChannelData: function (c) { return d[c]; } };
}

function nodePart() {
  console.log('1. WAV writers (Sequencer.wav with options), read back');
  var sb = sandbox(), S = sb.Sequencer;
  var buf = fakeBuffer(2, 1000, 48000, function (c, i) { return Math.sin(i * 0.05 + c) * 0.9 + (i === 7 ? 0.5 : 0); });
  var w16 = readWav(S.wav(buf, { bitDepth: 16, dither: false })), w16d = readWav(S.wav(buf, { bitDepth: 16 })), w24 = readWav(S.wav(buf, { bitDepth: 24 })), w32 = readWav(S.wav(buf, { bitDepth: 32 }));
  ok(w16.fmt.format === 1 && w16.fmt.bits === 16 && w16.fmt.sr === 48000 && w16.frames === 1000, '16-bit PCM header (format 1, 48000 Hz, 1000 frames)');
  ok(w24.fmt.format === 1 && w24.fmt.bits === 24 && w24.frames === 1000, '24-bit PCM header');
  ok(w32.fmt.format === 3 && w32.fmt.bits === 32 && w32.fmt.size === 18 && w32.fact === 1000 && w32.frames === 1000, '32-bit float header (format 3, 18-byte fmt, fact chunk = frames)');
  var e16 = 0, e16d = 0, e24 = 0, e32 = 0, i, c;
  for (c = 0; c < 2; c++) for (i = 0; i < 1000; i++) {
    var x = buf.getChannelData(c)[i];
    e16 = Math.max(e16, Math.abs(w16.ch[c][i] - x * 32768));
    e16d = Math.max(e16d, Math.abs(w16d.ch[c][i] - x * 32768));
    e24 = Math.max(e24, Math.abs(w24.ch[c][i] - x * 8388608));
    e32 = Math.max(e32, Math.abs(w32.ch[c][i] - x));
  }
  ok(e16 <= 0.5 && e24 <= 0.5 && e32 === 0, 'without dither: 16 and 24-bit within half an LSB, float exact (' + e16.toFixed(3) + ', ' + e24.toFixed(3) + ', ' + e32 + ')');
  ok(e16d > 0.5 && e16d <= 1.5, 'TPDF dither at 16 bits: error within 1.5 LSB and not plain rounding (' + e16d.toFixed(3) + ' LSB)');
  var again = new Uint8Array(S.wav(buf, { bitDepth: 16 })), first = new Uint8Array(S.wav(buf, { bitDepth: 16 })), same = again.length === first.length;
  for (i = 0; same && i < again.length; i++) same = again[i] === first[i];
  ok(same, 'dither is seeded: the same buffer gives the same file');
  var hot = fakeBuffer(1, 4, 44100, function (c, i) { return [1.5, -1.5, 1, -1][i]; }), h16 = readWav(S.wav(hot, { bitDepth: 16, dither: false })), h32 = readWav(S.wav(hot, { bitDepth: 32 }));
  ok(h16.ch[0][0] === 32767 && h16.ch[0][1] === -32768 && S.wav.info === undefined || (h16.ch[0][0] === 32767 && h16.ch[0][1] === -32768), 'integer formats clamp');
  ok(h32.ch[0][0] === 1.5 && h32.ch[0][1] === -1.5, 'float keeps values over full scale');
  var old = new Uint8Array(S.wav(buf)), dvo = new DataView(old.buffer);
  ok(old.length === 44 + 4000 && dvo.getUint16(34, true) === 16 && dvo.getInt16(44, true) === Math.round(buf.getChannelData(0)[0] * 32767) || dvo.getInt16(44, true) === (buf.getChannelData(0)[0] * 32767 | 0), 'Sequencer.wav(buffer) without options is the old 16-bit writer');

  console.log('2. audio tracks in the document, clip editing, undo');
  var SD = sb.SongDoc, doc = sb.Song.document();
  doc.tracks.push({ name: 'vox', type: 'audio', clips: [{ audio: 'a1', bar: 2, offset: 0.5, length: 3 }, { bar: 1 }, { audio: 'a2', bar: -4, gain: 'x' }] });
  var d2 = SD.load(SD.save(doc)), vox = d2.tracks[d2.tracks.length - 1];
  ok(vox.type === 'audio' && vox.inst === 'audio' && vox.clips.length === 2 && vox.clips[0].gain === 1 && vox.clips[1].bar === 0 && vox.clips[1].gain === 1, 'save and load: clips normalised, a clip without audio dropped (' + JSON.stringify(vox.clips) + ')');
  var ed = SD.createEditor(d2), u0 = ed._undo.length;
  ok(ed.addClip('vox', { audio: 'a3', bar: 8 }) === 2 && ed._undo.length === u0 + 1, 'addClip: index, one undo step');
  ok(ed.moveClip('vox', 2, 9.5) && ed.track('vox').clips[2].bar === 9.5 && ed._undo.length === u0 + 2, 'moveClip (fractional bar), one undo step');
  ok(ed.trimClip('vox', 0, { bar: 3, offset: 2.4, length: 1.1 }) && ed.track('vox').clips[0].offset === 2.4 && ed.track('vox').clips[0].bar === 3 && ed._undo.length === u0 + 3, 'trimClip (left edge: bar and offset together), one undo step');
  ok(ed.setClip('vox', 0, { gain: 0.5 }) && ed.track('vox').clips[0].gain === 0.5, 'setClip gain');
  ok(ed.removeClip('vox', 1) && ed.track('vox').clips.length === 2, 'removeClip');
  var n = ed._undo.length;
  ok(!ed.moveClip('vox', 9, 1) && !ed.trimClip('vox', 0, { length: -1 }) && !ed.removeClip('kick', 0) && ed.addClip('kick', { audio: 'a' }) === -1 && ed._undo.length === n, 'refused clip operations take no undo step');
  ed.undo(); ed.undo();
  ok(ed.track('vox').clips.length === 3 && ed.track('vox').clips[0].gain === 1, 'undo restores');

  console.log('3. the audio-track player on a fake context');
  var ctx = new Ctx(44100), A = sb.AudioTrack, clipBuf = fakeBuffer(2, 44100 * 4, 44100, function () { return 0; });
  var inst = A.create(ctx, { getBuffer: function (id) { return id === 'c' ? clipBuf : null; }, clips: [{ audio: 'c', bar: 3, offset: 0, length: 0 }, { audio: 'missing', bar: 0 }] });
  var fseq = { stepSec: function () { return 60 / 126 / 4; } }, sd = fseq.stepSec(), t = 0.05;
  for (var s = 0; s < 64; s++) inst.onStep(s, t + s * sd, fseq);
  var started = ctx._srcs.filter(function (x) { return x.starts.length; });
  ok(started.length === 1 && Math.abs(started[0].starts[0][0] - (t + 48 * sd)) < 1e-9 && started[0].starts[0][1] === 0 && Math.abs(started[0].starts[0][2] - 4) < 1e-9, 'a clip on bar 3 starts at step 48, file position 0, for the whole file; a missing file is silent');
  ctx._srcs.length = 0;
  inst.onStep(56, 10, fseq);                                   // a jump into the clip (step 56 = 8 steps in)
  ok(ctx._srcs.length === 1 && Math.abs(ctx._srcs[0].starts[0][1] - 8 * sd) < 1e-9 && Math.abs(ctx._srcs[0].starts[0][2] - (4 - 8 * sd)) < 1e-9 && started[0].stops.length === 1, 'a jump inside the clip: the old voice fades out, the clip restarts 8 steps in');
  ctx._srcs.length = 0;
  inst.onStep(57, 10 + sd, fseq);
  ok(ctx._srcs.length === 0, 'the next step follows on: nothing restarts');
  inst.onStep(48, 10 + 2 * sd, fseq);                          // a loop wrap back to the clip's bar
  ok(ctx._srcs.length === 1 && ctx._srcs[0].starts[0][1] === 0, 'a loop wrap to the clip start plays it from the top once');
  inst.setClips([{ audio: 'c', bar: 0.5, offset: 1, length: 0.25 }]); ctx._srcs.length = 0;
  inst.onStep(8, 20, fseq);
  ok(ctx._srcs.length === 1 && ctx._srcs[0].starts[0][1] === 1 && ctx._srcs[0].starts[0][2] === 0.25, 'setClips (an edit applied in place): placed again at the next step; offset and length honoured');
  inst.panic();
  ok(inst._live.length === 0, 'panic stops every voice');

  console.log('4. Host: addAudioTrack, in-place clip edits, export plan, audio options; Project bundle with a fake shell');
  var H = sb.Host, P = sb.Project, host = H.create({ AudioContext: Ctx });
  return host.start().then(function (live) {
    ok(live === true && host.audioOptions().state === 'running' && host.audioOptions().sampleRate === 44100 && host.audioOptions().latencyHint === 'interactive', 'start on a context; audioOptions reports it');
    return host.addAudioTrack(new Uint8Array(4410 * 2).buffer, { name: 'vox', bar: 3, fileName: 'vox take 1.wav' });
  }).then(function (name) {
    var t = host.document().tracks.filter(function (x) { return x.name === name; })[0];
    ok(name === 'vox' && t && t.type === 'audio' && t.clips.length === 1 && t.clips[0].bar === 3 && t.clips[0].audio === 'vox_take_1' && Math.abs(t.clips[0].length - 0.2) < 1e-9, 'addAudioTrack: one clip on bar 3, length = the file\'s');
    var tr = host.tracks().filter(function (x) { return x.name === 'vox'; })[0];
    ok(tr.audio === true && tr.clips.length === 1 && host.audio().filter(function (a) { return a.id === 'vox_take_1'; })[0].usedBy.indexOf('vox') >= 0, 'host.tracks() marks it audio with its clips; host.audio() names it as a user');
    var inst2 = host.engine().tracks.vox.inst, u = host.editor()._undo.length;
    host.editor().moveClip('vox', 0, 5);
    var rebuilt = host.commit();
    ok(!rebuilt && host.engine().tracks.vox.inst === inst2 && inst2.clips[0].bar === 5, 'a clip move commits in place (no rebuild)');
    host.editor().undo(); host.commit();
    ok(host.engine().tracks.vox.inst.clips[0].bar === 3 && host.editor()._undo.length === u, 'undo of the move');
    ok(host.devices().some(function (d) { return d.id === 'track:vox' && d.type === 'audio'; }), 'the audio track is a device');
    host.mute('vox', true);
    ok(host.engine().tracks.vox.muted, 'mute through the channel strip');
    host.mute('vox', false);
    // audio options: a new rate makes a new context, keeping the document and the (stopped) position
    var before = sb.SongDoc.save(host.document()), oldCtx = host.context();
    host.transport.jump('mainA');
    var evs = []; host.on('audiooptions', function (e) { evs.push(e); });
    return host.setAudioOptions({ sampleRate: 48000, latencyHint: 'playback' }).then(function (r) {
      ok(r === true && host.context() !== oldCtx && oldCtx.state === 'closed' && host.context().sampleRate === 48000 && host.audioOptions().latencyHint === 'playback', 'setAudioOptions: a new context at 48000, latency hint playback, the old one closed');
      ok(sb.SongDoc.save(host.document()) === before && host.transport.pos().bar === 40 && !host.transport.playing && evs.length === 1, 'the document and the stopped position (mainA, bar 40) are kept');
      return host.setAudioOptions({ sinkId: 'abc' });
    }).then(function (r) {
      ok(r === false, 'setSinkId missing on the context: resolves false');
      return host.setAudioOptions({ sampleRate: 5 });
    }).then(function (r) {
      ok(r === false && host.context().sampleRate === 48000, 'a rate out of range is refused');
      return host.outputDevices();
    }).then(function (list) {
      ok(list.length === 1 && list[0].id === '', 'no mediaDevices: the default output only');
      // the export plan on a fake offline context: check the wiring each render gets
      var made = [];
      function FO(ch, len, sr) { Ctx.call(this, sr); this.length = len; made.push(this); }
      FO.prototype = Object.create(Ctx.prototype);
      FO.prototype.startRendering = function () { return Promise.resolve(this.createBuffer(2, this.length, this.sampleRate)); };
      sb.OfflineAudioContext = FO;
      return host.exportAudio({ scope: { from: 40, to: 42 }, what: ['vox', 'kick'], bitDepth: 32, tailSeconds: 1 }).then(function (files) {
        var bs = 240 / 126;
        ok(files.length === 2 && files[0].part === 'vox' && files[1].part === 'kick', 'stems [vox, kick]: two files (the silent returns are dropped)');
        ok(files[0].frames === Math.round((2 * bs + 1) * 44100) && readWav(files[0].bytes).frames === files[0].frames && files[0].sampleRate === 44100, 'length = span + tail to the sample (' + files[0].frames + ' frames)');
        ok(made.length === 4, 'one render per file, the returns included (' + made.length + ')');
        return host.exportAudio({ scope: { section: 'mainA' }, what: 'mix', bitDepth: 16 });
      }).then(function (files) {
        ok(files.length === 1 && files[0].name === 'Guidance - mainA - mix.wav' && files[0].bitDepth === 16 && files[0].master === true, 'mix of a section: named after the song and the section; master on (' + files[0].name + ')');
        return host.exportAudio({ scope: { section: 'nope' } }).then(function () { return 'ok'; }, function (e) { return e.message; });
      }).then(function (m) {
        ok(/unknown section/.test(m), 'an unknown section rejects');
        // Project.exportAudio and saveBundle with a fake Electron shell
        var written = {}, dirs = [], copied = [];
        var shell = { pickDirectory: function () { return Promise.resolve('/out'); }, joinPath: function (a, b) { return a + '/' + b; },
                      writeFile: function (p, b) { written[p] = b; return Promise.resolve(true); }, makeDirectory: function (p) { dirs.push(p); return Promise.resolve(true); },
                      copyFile: function (s, d) { copied.push([s, d]); return Promise.resolve(true); },
                      readText: function (p) { return Promise.resolve(written[p] || null); }, readFile: function () { return Promise.resolve(new Uint8Array(10).buffer); } };
        return P.exportAudio({ host: host, shell: shell, scope: { from: 0, to: 1 }, what: ['kick'], sends: false }).then(function (list) {
          ok(list.length === 1 && list[0].path === '/out/Guidance - bars 1-1 - kick.wav' && written[list[0].path] && written[list[0].path].byteLength > 44, 'Project.exportAudio (Electron): the folder, then one file written per stem');
          host.document().audio.vox_take_1.src = '/home/me/vox take 1.wav';
          return P.saveBundle({ host: host, shell: shell });
        }).then(function (r) {
          var doc = P.parse(written['/out/project.havantechno.json']);
          ok(r.path === '/out/project.havantechno.json' && dirs[0] === '/out/audio' && copied[0][0] === '/home/me/vox take 1.wav' && copied[0][1] === '/out/audio/vox take 1.wav' && doc.audio.vox_take_1.src === 'audio/vox take 1.wav', 'saveBundle: audio/ made, the file copied, the bundle document points at audio/<file>');
          ok(host.document().audio.vox_take_1.src === '/home/me/vox take 1.wav', 'the live document is not changed');
          var h2 = H.create({ AudioContext: Ctx });
          return P.openBundle({ host: h2, shell: shell }).then(function (d) {
            ok(d && d.tracks.some(function (x) { return x.name === 'vox' && x.type === 'audio'; }) && h2.audio().filter(function (a) { return a.id === 'vox_take_1'; })[0].loaded === false, 'openBundle reads the folder\'s document (audio reloads when the host has started)');
          });
        });
      });
    });
  });
}

// ------------------------------------------------------------------ headless Chromium measurements
function freePort() { return new Promise(function (res) { var s = require('net').createServer(); s.listen(0, function () { var p = s.address().port; s.close(function () { res(p); }); }); }); }
function rssKb() {
  try {
    var out = cp.execSync("ps -eo rss,comm | grep -i -E 'chrom|headless' | awk '{s+=$1} END {print s+0}'", { encoding: 'utf8' });
    return parseInt(out, 10) || 0;
  } catch (e) { return 0; }
}
function measure() {
  var pw;
  try { pw = require('playwright'); } catch (e) { try { pw = require('/opt/node22/lib/node_modules/playwright'); } catch (e2) { console.log('  SKIP measure: playwright not found'); return Promise.resolve(); } }
  var server, browser, peak = 0, timer;
  return freePort().then(function (port) {
    server = cp.spawn(process.execPath, [path.join(ROOT, 'tools', 'serve.js'), String(port)], { stdio: 'ignore' });
    return new Promise(function (r) { setTimeout(r, 600); }).then(function () { return pw.chromium.launch(); }).then(function (b) {
      browser = b;
      timer = setInterval(function () { peak = Math.max(peak, rssKb()); }, 500);
      return b.newPage();
    }).then(function (page) {
      var errors = [];
      page.on('pageerror', function (e) { errors.push(String(e)); });
      page.on('console', function (m) { if (m.type() === 'error') errors.push(m.text()); });
      return page.goto('http://127.0.0.1:' + port + '/app/engine/blank-for-export-check').then(function () {
        var files = ['core', 'programs', 'synths', 'drums', 'worklets', 'classics', 'processors', 'songdoc', 'sequencer', 'song', 'audiotrack', 'host', 'project'];
        return files.reduce(function (p, f) { return p.then(function () { return page.addScriptTag({ url: '/app/engine/' + f + '.js' }); }); }, Promise.resolve());
      }).then(function () {
        page.setDefaultTimeout(0);
        return page.evaluate(inPage, { long: LONG });
      }).then(function (rep) {
        rep.peakRssMB = Math.round(peak / 1024);
        rep.pageErrors = errors.slice(0, 5);
        console.log(JSON.stringify(rep, null, 1));
        var c = rep.checks || [];
        c.forEach(function (x) { ok(x[0], x[1]); });
        ok(!errors.length, 'no page errors (' + errors.length + ')');
      });
    });
  }).then(function () { clearInterval(timer); return browser && browser.close(); }, function (e) { clearInterval(timer); console.log('  FAIL measure threw: ' + (e && e.stack || e)); fails++; return browser && browser.close(); }).then(function () { if (server) server.kill(); });
}

// runs in the page; returns the report
function inPage(o) {
  var rep = { checks: [] }, H = window.Host, S = window.Sequencer;
  function chk(c, m) { rep.checks.push([!!c, m]); }
  function now() { return performance.now(); }
  function rd(ab) {
    var dv = new DataView(ab), tag = function (q) { return String.fromCharCode(dv.getUint8(q), dv.getUint8(q + 1), dv.getUint8(q + 2), dv.getUint8(q + 3)); }, p = 12, fmt, data;
    while (p + 8 <= ab.byteLength) { var id = tag(p), size = dv.getUint32(p + 4, true), b = p + 8; if (id === 'fmt ') fmt = { format: dv.getUint16(b, true), ch: dv.getUint16(b + 2, true), sr: dv.getUint32(b + 4, true), bits: dv.getUint16(b + 14, true) }; else if (id === 'data') data = { off: b, len: size }; p = b + size + (size & 1); }
    var bps = fmt.bits / 8, n = data.len / (bps * fmt.ch), ch = [], c, i;
    for (c = 0; c < fmt.ch; c++) ch.push(new Float64Array(n));
    for (i = 0; i < n; i++) for (c = 0; c < fmt.ch; c++) {
      var q = data.off + (i * fmt.ch + c) * bps, v;
      if (fmt.format === 3) v = dv.getFloat32(q, true); else if (fmt.bits === 16) v = dv.getInt16(q, true) / 32768;
      else { v = dv.getUint8(q) | (dv.getUint8(q + 1) << 8) | (dv.getUint8(q + 2) << 16); if (v & 0x800000) v -= 0x1000000; v /= 8388608; }
      ch[c][i] = v;
    }
    return { fmt: fmt, frames: n, ch: ch };
  }
  function db(x) { return x > 0 ? Math.round(2000 * Math.log(x) / Math.LN10) / 100 : -Infinity; }
  function stats(a, b, from, to) {             // a, b: [ch][i]; max |a-b|, rms(a-b), rms(b), peak(b)
    var mx = 0, se = 0, sb = 0, pk = 0, n = 0;
    for (var c = 0; c < a.length; c++) for (var i = from || 0; i < (to || a[c].length); i++) { var d = a[c][i] - b[c][i]; if (Math.abs(d) > mx) mx = Math.abs(d); se += d * d; sb += b[c][i] * b[c][i]; pk = Math.max(pk, Math.abs(b[c][i])); n++; }
    return { maxAbs: mx, maxDbFS: db(mx), residualDbRelRms: db(Math.sqrt(se / n) / Math.sqrt(sb / n)), refPeakDbFS: db(pk) };
  }
  var host = H.create(), sr = 44100, bs = 240 / 126, lead = Math.round(0.05 * sr), out = {};
  function render(from, to, tail) { return host.render({ from: from, to: to, tail: tail, seed: 1 }); }
  var t0;
  return Promise.resolve().then(function () {
    // ---- 1. export vs host.render, 16 bars (16..32), each format
    t0 = now();
    return host.exportAudio({ scope: { from: 16, to: 32 }, what: 'mix', bitDepth: 32, tailSeconds: 2 });
  }).then(function (f) {
    out.mix16barsFloatSeconds = Math.round(now() - t0) / 1000;
    var w = rd(f[0].bytes), frames = Math.round((16 * bs + 2) * sr);
    chk(w.frames === frames && f[0].frames === frames && w.fmt.format === 3, 'float export length = 16 bars + 2 s to the sample (' + w.frames + ' = ' + frames + ')');
    out.mixFile = { frames: w.frames, peakDbFS: f[0].peakDb, seconds: f[0].seconds };
    return render(16, 32, 2).then(function (buf) {
      var r = [buf.getChannelData(0).subarray(lead, lead + frames), buf.getChannelData(1).subarray(lead, lead + frames)];
      var st = stats(w.ch, r);
      out.floatVsRender = st;
      chk(st.maxAbs === 0, 'float export equals host.render of the same span, sample for sample (max diff ' + st.maxAbs + ')');
      // tail: the frames after the 16 bars hold the release (non-zero)
      var tailPeak = 0; for (var i = Math.round(16 * bs * sr); i < frames; i++) tailPeak = Math.max(tailPeak, Math.abs(r[0][i]));
      out.tailPeakDbFS = db(tailPeak);
      return Promise.all([host.exportAudio({ scope: { from: 16, to: 32 }, bitDepth: 16, dither: false }), host.exportAudio({ scope: { from: 16, to: 32 }, bitDepth: 16 }), host.exportAudio({ scope: { from: 16, to: 32 }, bitDepth: 24 })]).then(function (fs3) {
        var q = function (x, s) { var v = Math.round(x * s); return Math.max(-s, Math.min(s - 1, v)) / s; };
        var a = rd(fs3[0][0].bytes), d = rd(fs3[1][0].bytes), b24 = rd(fs3[2][0].bytes), m16 = 0, md = 0, m24 = 0, sd = 0, n = 0;
        for (var c = 0; c < 2; c++) for (var i = 0; i < frames; i++) {
          m16 = Math.max(m16, Math.abs(a.ch[c][i] - q(r[c][i], 32768)));
          var e = (d.ch[c][i] - r[c][i]) * 32768; md = Math.max(md, Math.abs(e)); sd += e * e; n++;
          m24 = Math.max(m24, Math.abs(b24.ch[c][i] - q(r[c][i], 8388608)));
        }
        out.pcm16 = { undithered_maxDiffFromQuantisedRender: m16, dithered_maxErrorLSB: md, dithered_rmsErrorLSB: Math.sqrt(sd / n) };
        out.pcm24_maxDiffFromQuantisedRender = m24;
        chk(m16 === 0, '16-bit without dither = the render rounded to 16 bits, every sample');
        chk(md <= 1.5 && md > 0.5, '16-bit with TPDF dither within 1.5 LSB of the render (' + md.toFixed(3) + ' LSB peak, ' + Math.sqrt(sd / n).toFixed(3) + ' LSB rms)');
        chk(m24 === 0, '24-bit read back = the render rounded to 24 bits');
      });
    });
  }).then(function () {
    // ---- 2. stems against the mix, master off and on (16 bars)
    t0 = now();
    var sum = null, names = [];
    function add(f) { var w = rd(f.bytes); names.push(f.part); if (!sum) sum = [new Float64Array(w.frames), new Float64Array(w.frames)]; for (var c = 0; c < 2; c++) for (var i = 0; i < w.frames; i++) sum[c][i] += w.ch[c][i]; f.bytes = null; }
    return host.exportAudio({ scope: { from: 16, to: 32 }, what: 'stems', bitDepth: 32, onFile: add }).then(function (files) {
      out.stems16barsSeconds = Math.round(now() - t0) / 1000;
      out.stemFiles = names;
      return host.exportAudio({ scope: { from: 16, to: 32 }, what: 'mix', bitDepth: 32, master: false }).then(function (m) {
        var st = stats(sum, rd(m[0].bytes).ch);
        out.stemsSumVsMix_masterOff = st;
        chk(st.maxAbs < 1e-5, 'stems (master off) sum to the mix with the master off: max residual ' + st.maxAbs.toExponential(2) + ' (' + st.maxDbFS + ' dBFS)');
        return host.exportAudio({ scope: { from: 16, to: 32 }, what: 'mix', bitDepth: 32 });
      }).then(function (m) {
        out.stemsMasterOffSumVsMix_masterOn = stats(sum, rd(m[0].bytes).ch);
        var sum2 = null;
        return host.exportAudio({ scope: { from: 16, to: 32 }, what: 'stems', bitDepth: 32, master: true, onFile: function (f) { var w = rd(f.bytes); if (!sum2) sum2 = [new Float64Array(w.frames), new Float64Array(w.frames)]; for (var c = 0; c < 2; c++) for (var i = 0; i < w.frames; i++) sum2[c][i] += w.ch[c][i]; f.bytes = null; } }).then(function () {
          out.stemsMasterOnSumVsMix_masterOn = stats(sum2, rd(m[0].bytes).ch);
        });
      });
    });
  }).then(function () {
    // ---- 3. an audio clip on bar 3: the onset on the grid, and a start from inside the clip
    var n = sr * 6, clip = { numberOfChannels: 2, length: n, sampleRate: sr, getChannelData: null }, L = new Float32Array(n), R = new Float32Array(n), i;
    for (i = 0; i < n; i++) { L[i] = 0.5 * Math.sin(2 * Math.PI * 220 * i / sr); R[i] = 0.25 * Math.sin(2 * Math.PI * 330 * i / sr); }
    L[0] = 0.9; R[0] = 0.9;                                                  // a click on the first sample
    clip.getChannelData = function (c) { return c ? R : L; };
    var bytes = S.wav(clip, { bitDepth: 32 });
    return host.addAudioTrack(bytes, { name: 'clip', bar: 3, fileName: 'clip.wav' }).then(function (name) {
      return host.exportAudio({ scope: { from: 0, to: 8 }, what: [name], sends: false, bitDepth: 32, tailSeconds: 0 }).then(function (f) {
        var w = rd(f[0].bytes), first = -1, want = Math.round(3 * bs * sr);
        for (var k = 0; k < w.frames; k++) if (Math.abs(w.ch[0][k]) > 1e-6) { first = k; break; }
        // the track's channel: gain 1, pan 0 -> equal-power pan gives cos(pi/4) per side
        var g = w.ch[0][want] / 0.9;
        var mx = 0; for (k = 0; k < sr * 2; k++) mx = Math.max(mx, Math.abs(w.ch[0][want + k] - g * L[k]), Math.abs(w.ch[1][want + k] - g * R[k]));
        out.clipBar3 = { firstNonZeroFrame: first, expectedFrame: want, channelGain: g, maxDiffFirst2s: mx };
        chk(first === want, 'a clip on bar 3 lands on the grid to the sample (frame ' + first + ', expected ' + want + ')');
        chk(mx < 1e-6, 'the clip plays its file unchanged through the strip (max diff ' + mx.toExponential(2) + ' after the strip gain ' + g.toFixed(5) + ')');
        return host.exportAudio({ scope: { from: 4, to: 8 }, what: [name], sends: false, bitDepth: 32, tailSeconds: 0 });
      }).then(function (f) {
        var w = rd(f[0].bytes), off = Math.round(1 * bs * sr), g = out.clipBar3.channelGain, mx = 0, fade = Math.round(0.004 * sr) + 2;
        for (var k = fade; k < sr; k++) mx = Math.max(mx, Math.abs(w.ch[0][k] - g * L[off + k]), Math.abs(w.ch[1][k] - g * R[off + k]));
        out.clipStartInside = { fileOffsetFrames: off, maxDiffAfter4msFade: mx, firstSample: w.ch[0][0] };
        chk(mx < 1e-6, 'an export from bar 4 starts the clip mid-file at the right position (1 bar in), exact after the 4 ms fade-in (' + mx.toExponential(2) + ')');
        // the same clip in a song export, bars 4..8 cut out, against the export from bar 4
        host.editor().removeTrack(name); host.commit();
      });
    });
  }).then(function () {
    // ---- 4. a section export against the same bars cut from the song export (master off and on)
    var sec = host.sections().filter(function (s) { return s.name === 'intro2'; })[0];
    var res = {};
    return [false, true].reduce(function (p, m) {
      return p.then(function () {
        return host.exportAudio({ scope: { from: 0, to: sec.start + sec.bars }, bitDepth: 32, tailSeconds: 0, master: m }).then(function (song) {
          var a = rd(song[0].bytes);
          return host.exportAudio({ scope: { section: sec.name }, bitDepth: 32, tailSeconds: 0, master: m }).then(function (s) {
            var b = rd(s[0].bytes), st0 = Math.round(sec.start * bs * sr), cutA = [a.ch[0].subarray(st0), a.ch[1].subarray(st0)];
            var whole = stats(b.ch, cutA, 0, b.frames), later = stats(b.ch, cutA, Math.round(4 * bs * sr), b.frames);
            res[m ? 'masterOn' : 'masterOff'] = { wholeSection: whole, afterFirst4Bars: later, frames: b.frames };
          });
        });
      });
    }, Promise.resolve()).then(function () { out.sectionVsSongCut = res; });
  }).then(function () {
    // ---- 5. sample rates: lengths, level, a tempo-synced delay's echo time, a worklet synth's pitch
    var rates = [44100, 48000, 96000], r = {};
    var doc = { v: 1, name: 'rates', bpm: 126, swing: 0, progression: [], sends: { delay: { type: 'delay', division: '3/16', feedback: 0.3, mix: 1 } },
                tracks: [{ name: 'click', type: 'audio', clips: [], sends: { delay: 1 }, gain: 1 }, { name: 'acid', inst: 'tb303', kind: 'melody', variants: { A: 'A2 - - - - - - - . . . . . . . .' }, gain: 1 }],
                sections: [{ name: 's', bars: 2, play: { acid: 'A' } }] };
    var h2 = H.create({ doc: doc }), n = 2205, clip = { numberOfChannels: 1, length: n, sampleRate: 44100, getChannelData: function () { var d = new Float32Array(n); d[0] = 1; return d; } };
    return h2.loadAudio(S.wav(clip, { bitDepth: 32 }), { id: 'clk', name: 'clk.wav' }).then(function () {
      h2.editor().addClip('click', { audio: 'clk', bar: 0 }); h2.commit();
      return rates.reduce(function (p, rate) {
        return p.then(function () {
          var tt = now();
          return h2.exportAudio({ what: 'stems', bitDepth: 32, sampleRate: rate, tailSeconds: 0.5 }).then(function (files) {
            var e = { seconds: Math.round(now() - tt) / 1000 }, ret = files.filter(function (f) { return f.part === 'send:delay'; })[0], acid = files.filter(function (f) { return f.part === 'acid'; })[0];
            var w = rd(ret.bytes), pk = 0, at = -1, k;
            for (k = 0; k < w.frames; k++) if (Math.abs(w.ch[0][k]) > pk) { pk = Math.abs(w.ch[0][k]); at = k; }
            e.frames = w.frames; e.expectedFrames = Math.round((2 * bs + 0.5) * rate);
            e.delayFirstEchoMs = Math.round(at / rate * 1e5) / 100; e.delayExpectedMs = Math.round(3 / 16 * bs * 1e5) / 100;
            var a = rd(acid.bytes), x = a.ch[0], zc = 0, s0 = Math.round(0.1 * rate), s1 = Math.round(0.6 * rate), ss = 0;
            for (k = s0 + 1; k < s1; k++) { if (x[k - 1] < 0 && x[k] >= 0) zc++; ss += x[k] * x[k]; }
            e.tb303HzByZeroCrossings = Math.round(zc / ((s1 - s0) / rate) * 10) / 10; e.tb303RmsDbFS = db(Math.sqrt(ss / (s1 - s0))); e.worklet = window.Worklets && window.Worklets.ready ? 'see engine' : null;
            r[rate] = e;
          });
        });
      }, Promise.resolve()).then(function () {
        out.sampleRates = r;
        rates.forEach(function (rate) { chk(r[rate].frames === r[rate].expectedFrames, 'export at ' + rate + ' Hz: length exact (' + r[rate].frames + ')'); });
      });
    });
  }).then(function () {
    // ---- 6. audio options in headless Chromium
    return host.start().then(function (st) {
      out.audioOptions = host.audioOptions();
      return host.outputDevices().then(function (list) {
        out.outputDevices = list;
        return navigator.mediaDevices && navigator.mediaDevices.enumerateDevices ? navigator.mediaDevices.enumerateDevices() : [];
      }).then(function (raw) {
        out.enumerateDevicesRaw = raw.map(function (d) { return { kind: d.kind, deviceId: d.deviceId, label: d.label }; });
        var before = SongDoc.save(host.document()); host.transport.jump('mainA');
        return host.setAudioOptions({ sampleRate: 48000 }).then(function (ok2) {
          out.afterRateChange = { ok: ok2, options: host.audioOptions(), workletReady: window.Worklets.ready(host.context()), bar: host.transport.pos().bar, sameDoc: SongDoc.save(host.document()) === before };
          chk(ok2 && host.context().sampleRate === 48000 && out.afterRateChange.workletReady && out.afterRateChange.bar === 40 && out.afterRateChange.sameDoc, 'setAudioOptions({sampleRate: 48000}): a new context at 48000, the worklet module loaded on it, position and document kept');
          return host.setAudioOptions({ latencyHint: 'playback' });
        }).then(function (ok3) {
          out.afterLatencyChange = { ok: ok3, options: host.audioOptions() };
          return host.setAudioOptions({ sinkId: '' });
        }).then(function (ok4) { out.sinkDefault = ok4; });
      });
    });
  }).then(function () {
    if (!o.long) return;
    // ---- 7. the whole song: mix and all stems, 24-bit, timed; bytes dropped after each file
    t0 = now();
    return host.exportAudio({ what: 'mix', bitDepth: 24, onFile: function (f) { f.bytes = null; } }).then(function (f) {
      out.song200 = { mixSeconds: Math.round(now() - t0) / 1000, mixFrames: f[0].frames, mixPeakDbFS: f[0].peakDb };
      t0 = now();
      var per = [];
      var tt = now();
      return host.exportAudio({ what: 'stems', bitDepth: 24, onFile: function (f) { per.push([f.part, Math.round(now() - tt) / 1000]); tt = now(); f.bytes = null; } }).then(function (fl) {
        out.song200.stemsSeconds = Math.round(now() - t0) / 1000; out.song200.stemFiles = fl.length; out.song200.perStem = per;
      });
    });
  }).then(function () { rep.out = out; return rep; });
}

var p = nodePart().then(function () { if (MEASURE) { console.log('5. headless Chromium measurements' + (LONG ? ' (with the whole song)' : '')); return measure(); } });
p.then(function () {
  console.log(fails ? 'FAILED: ' + fails + ' of ' + checks + ' checks' : 'OK: ' + checks + ' checks passed');
  process.exit(fails ? 1 : 0);
}, function (e) { console.log('  FAIL threw: ' + (e && e.stack)); process.exit(1); });
