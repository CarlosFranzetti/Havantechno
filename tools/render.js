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
//   --labels-only  write the sidecar (with its labels) and no WAV: no render, no latency probe. Cheap, for checking.
//   --sampler-from <track>[:rr3|:pitched]  (app page only) capture that track's first hit (rr3: its first three hits,
//               played back as round robins; pitched: one note, transposed to each event's MIDI), then render the
//               song with the track replaced by a sampler track playing the capture on the same events. Files get a
//               -smp-<track>[-rr3|-pitched] suffix and the track's labels say source 'sample' and sampleOf.
//   --seed      seed for Math.random in the page (default 1). The archived engine draws its noise and
//               jitter from Math.random (core.js, synths.js), so each job re-seeds it: the same bars with
//               the same seed render to identical bytes.
//
// Output: tools/out/<name>.wav (16-bit PCM, via Sequencer.wav or Host.wav) and tools/out/<name>.json
// (sidecar: bar range, sample rate, bpm, swing and the sample position of bar `from`, which score.py
// uses to line the render up with the reference, plus `labels`: per-track truth, tools/README.md).
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
  var o = { page: 'studio', song: 'baseline', solo: null, sections: null, bars: null, sr: 44100, tail: 2.5, seed: 1, out: DEFAULT_OUT,
            labelsOnly: false, samplerFrom: null };
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
    else if (a === '--labels-only') o.labelsOnly = true;
    else if (a === '--sampler-from') {
      var sv = next(), sp = sv.split(':');
      if (!sp[0] || sp.length > 2 || (sp[1] !== undefined && ['rr3', 'pitched'].indexOf(sp[1]) < 0)) fail('--sampler-from needs <track>[:rr3|:pitched], got ' + sv);
      o.samplerFrom = { track: sp[0], mode: sp[1] || 'first' };
    }
    else if (a === '-h' || a === '--help') {
      var hl = fs.readFileSync(__filename, 'utf8').split('\n').slice(1), hn = 0;
      while (hn < hl.length && hl[hn].indexOf('//') === 0) hn++;
      process.stdout.write(hl.slice(0, hn).join('\n') + '\n'); process.exit(0);
    }
    else fail('unknown argument ' + a);
  }
  if (!(o.sr > 0)) fail('bad --sr');
  if (['baseline', 'v2', 'v3'].indexOf(o.song) < 0) fail('--song must be baseline, v2 or v3');
  if (o.solo && o.page !== 'app') fail('--solo needs --page app (Host.solo)');
  if (o.samplerFrom && o.page !== 'app') fail('--sampler-from needs --page app (the Host owns the sampler buffers)');
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
    window.__baseHost = window.__host;                                  // --sampler-from swaps window.__host per job
    window.__baseDoc = JSON.parse(JSON.stringify(window.__host.document()));
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

// Installs window.__rt = {labels(job), swap(job)} in one call (page.evaluate serialises a single function, so the
// helpers live inside it). labels: the per-track truth of log-L2.md section 10 item 1. swap: --sampler-from.
function installTools() {
  var STEPS = 16;
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function dryBuild(doc, song) {
    var dry = window.Sequencer.create(null, {});
    if (doc) window.Song.build(dry, doc);
    else window.Song.build(dry, song === 'v2' ? window.Song.GUIDANCE_V2 : undefined);
    return dry;
  }
  // Every trigger of every track over bars [from, to), recorded from a dry Sequencer (no audio context): the events
  // the render schedules. t is seconds from the start of bar `from`. params0 is each instrument's params at `from`.
  function record(dry, from, to, keep) {
    var events = {}, params0 = {};
    dry.order.forEach(function (n) {
      var tr = dry.tracks[n];
      events[n] = [];
      tr.inst.trigger = function (t, ev) {
        var e = { t: t, step: ev.step, vel: ev.vel, dur: ev.dur, hit: ev.hit };
        if (typeof ev.midi === 'number') e.midi = ev.midi;
        if (ev.notes) e.notes = ev.notes.slice();
        if (ev.accent) e.accent = true;
        if (ev.slide) e.slide = true;
        if (events[n].length < (keep || 0)) e.params = clone(tr.inst.params);   // with this hit's locks applied
        events[n].push(e);
      };
    });
    if (from > 0) dry.chase(from * STEPS, 0);
    dry.order.forEach(function (n) { params0[n] = clone(dry.tracks[n].inst.params); });
    var sends0 = {};
    dry.order.forEach(function (n) { sends0[n] = { reverb: dry.sendLevel(n, 'reverb'), delay: dry.sendLevel(n, 'delay') }; });
    dry.scheduleAll(from, to, 0);
    return { events: events, params0: params0, sends0: sends0 };
  }
  function polyphony(evs, rel) {
    var pts = [], cur = 0, max = 0, i;
    evs.forEach(function (e) {
      var k = e.notes && e.notes.length ? e.notes.length : 1, d = Math.max((e.dur || 0) + rel, 1e-6);
      pts.push([e.t, k]); pts.push([e.t + d, -k]);
    });
    pts.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });   // an end before a start at the same instant
    for (i = 0; i < pts.length; i++) { cur += pts[i][1]; if (cur > max) max = cur; }
    return max;
  }
  function sendLabel(dry, name, level, keys) {
    var p = dry.sends[name];
    if (!p || !(level > 0)) return { present: false };
    var P = p.params || {}, o = { send: level }, i;
    for (i = 0; i < keys.length; i++) o[keys[i][0]] = keys[i][2] ? keys[i][2](P[keys[i][1]]) : P[keys[i][1]];
    o.kind = 'shared (send or bus)';
    return o;
  }
  function labels(job) {
    var doc = window.__host ? window.__host.document() : null;
    var dry = dryBuild(doc, job.song), rec = record(dry, job.from, job.to, 0), out = {}, solo = job.solo || [];
    var D = window.Drums, C = window.Classics;
    dry.order.forEach(function (n) {
      var tr = dry.tracks[n], evs = rec.events[n];
      if (!evs.length) return;
      var type = tr.inst.type && tr.inst.type !== 'unknown' ? tr.inst.type : (typeof tr.def.inst === 'string' ? tr.def.inst : n);
      var fam = type === 'sampler' ? 'sampler' : (D && D.has && D.has(type)) ? 'drums' : (C && C.has && C.has(type)) ? 'classic' : 'synth';
      var machine = fam === 'drums' ? (/808$/.test(type) ? 'tr808' : /909$/.test(type) ? 'tr909' : 'other') : 'other';
      // the TR-909 hats and cymbals are 6-bit samples (tools/analysis-truth.js says so); every other voice is synthesised
      var sampled = type === 'sampler' || (machine === 'tr909' && /^(ch|oh|cr|rd)909$/.test(type));
      var P = rec.params0[n] || {}, notes = {}, i, e;
      for (i = 0; i < evs.length; i++) {
        e = evs[i];
        if (typeof e.midi === 'number') notes[e.midi] = 1;
        if (e.notes) e.notes.forEach(function (m) { notes[m] = 1; });
      }
      var sl = rec.sends0[n];
      out[n] = {
        element: n, type: type, family: fam, machine: machine, source: sampled ? 'sample' : 'synth',
        params: P,
        polyphony: polyphony(evs, typeof P.release === 'number' ? P.release : 0),
        notes: Object.keys(notes).map(Number).sort(function (a, b) { return a - b; }),
        reverb: sendLabel(dry, 'reverb', sl.reverb, [['rt60', 'size'], ['decay', 'decay'], ['predelayMs', 'predelay', function (v) { return typeof v === 'number' ? Math.round(v * 10000) / 10 : v; }]]),
        delay: sendLabel(dry, 'delay', sl.delay, [['division', 'division'], ['time', 'time'], ['feedback', 'feedback'], ['pingpong', 'pingpong']]),
        soloed: solo.indexOf(n) >= 0,
        events: evs.length
      };
    });
    out._master = dry.master && dry.master.procs ? dry.master.procs.map(function (p) { return p.type; }) : [];
    if (job.swap) {
      var sw = out[job.swap.track];
      if (sw) { sw.source = 'sample'; for (var k in job.swap.labels) if (Object.prototype.hasOwnProperty.call(job.swap.labels, k)) sw[k] = job.swap.labels[k]; }
    }
    return out;
  }

  // ---- --sampler-from ----------------------------------------------------------------------------
  function wavF32(chans, sr) {                       // 32-bit float WAV (format 3): lossless into decodeAudioData
    var n = chans[0].length, nc = chans.length, ab = new ArrayBuffer(44 + n * nc * 4), dv = new DataView(ab), p = 0, c, i;
    function str(t) { for (var k = 0; k < t.length; k++) dv.setUint8(p++, t.charCodeAt(k)); }
    function u32(v) { dv.setUint32(p, v, true); p += 4; }
    function u16(v) { dv.setUint16(p, v, true); p += 2; }
    str('RIFF'); u32(36 + n * nc * 4); str('WAVE'); str('fmt '); u32(16); u16(3); u16(nc); u32(sr); u32(sr * nc * 4); u16(nc * 4); u16(32);
    str('data'); u32(n * nc * 4);
    for (i = 0; i < n; i++) for (c = 0; c < nc; c++) { dv.setFloat32(p, chans[c][i], true); p += 4; }
    return ab;
  }
  // Renders the hits with ONE instance of the instrument in one context (so a per-hit noise counter advances as it does
  // in the song), spaced w seconds apart; returns one stereo float buffer per hit, leading pre-roll and trailing silence cut.
  async function captureHits(type, params, hits, sr) {
    var PRE = 0.02, ws = hits.map(function (h) { return Math.min(6, Math.max(2, (h.dur || 0) + 1.5)); });
    var total = ws.reduce(function (a, b) { return a + b; }, 0);
    var octx = new OfflineAudioContext(2, Math.ceil(total * sr), sr);
    if (window.Worklets && typeof window.Worklets.load === 'function') await window.Worklets.load(octx);
    var inst = window.Synths.create(octx, type, params), off = [], o = 0;
    inst.out.connect(octx.destination);
    hits.forEach(function (h, i) {
      off.push(o);
      var ev = { vel: h.vel, dur: h.dur, hit: h.hit, step: h.step };   // the hit's own velocity: the capture is the song's first hit
      if (typeof h.midi === 'number') ev.midi = h.midi;
      if (h.notes) ev.notes = h.notes.slice();
      if (h.accent) ev.accent = true;
      if (h.slide) ev.slide = true;
      inst.trigger(PRE + o, ev);
      o += ws[i];
    });
    var buf = await octx.startRendering(), res = [];
    hits.forEach(function (h, i) {
      var a = Math.round((off[i] + PRE) * sr), b = Math.min(buf.length, Math.round((off[i] + ws[i]) * sr)), L = buf.getChannelData(0).subarray(a, b), R = buf.getChannelData(1).subarray(a, b), last = 0, j;
      for (j = L.length - 1; j >= 0; j--) if (Math.abs(L[j]) > 1e-4 || Math.abs(R[j]) > 1e-4) { last = j; break; }
      var len = Math.min(L.length, Math.max(Math.round(0.05 * sr), last + 1 + Math.round(0.01 * sr)));
      res.push([new Float32Array(L.subarray(0, len)), new Float32Array(R.subarray(0, len))]);
    });
    return res;
  }
  async function swap(job) {
    var base = window.__baseDoc, doc = clone(base), name = job.track, mode = job.mode, def = null, i;
    for (i = 0; i < doc.tracks.length; i++) if (doc.tracks[i].name === name) def = doc.tracks[i];
    if (!def) throw new Error('--sampler-from: no track "' + name + '". Tracks: ' + doc.tracks.map(function (t) { return t.name; }).join(', '));
    if (def.type === 'sampler' || def.inst === 'sampler') throw new Error('--sampler-from: "' + name + '" is already a sampler track');
    var dry = dryBuild(base, job.song), rec = record(dry, job.from, dry.totalBars, 3), evs = rec.events[name];
    var need = mode === 'rr3' ? 3 : 1;
    if (evs.length < need) throw new Error('--sampler-from: track "' + name + '" has ' + evs.length + ' hit(s) from bar ' + job.from + ' on; ' + (mode === 'rr3' ? ':rr3 needs 3' : 'needs 1'));
    var type = dry.tracks[name].inst.type, hits = evs.slice(0, need), midi0 = null;
    if (mode === 'pitched') {
      var h0 = hits[0];
      midi0 = typeof h0.midi === 'number' ? h0.midi : (h0.notes && h0.notes.length === 1 ? h0.notes[0] : null);
      if (midi0 == null) throw new Error('--sampler-from: ":pitched" needs a track whose events carry one MIDI note; "' + name + '" does not');
      if (Math.abs(48 - midi0) > 24) throw new Error('--sampler-from: the captured note ' + midi0 + ' is more than 24 semitones from 48; the sampler pitch range cannot transpose it back');
    }
    if (typeof Math.random.reset === 'function') Math.random.reset(job.seed);
    var bufs = await captureHits(type, hits[0].params || rec.params0[name], hits, job.sr);
    // the track keeps its channel strip, sends, sidechain and cells; only the instrument becomes a sampler
    var ids = bufs.map(function (b, k) { return ('smp_' + name + '_' + (k + 1)).replace(/[^A-Za-z0-9_.-]/g, '_'); });
    var t2 = def;
    t2.inst = 'sampler'; t2.type = 'sampler';
    ['note', 'notes', 'chords', 'melody'].forEach(function (k) { if (mode !== 'pitched') delete t2[k]; });
    if (mode !== 'pitched') t2.kind = 'drum';          // no MIDI on the events: the capture plays at its own pitch
    if (mode === 'rr3') {
      var pid = 'smp_' + name + '_rr3';
      if (!window.Programs || typeof window.Programs.normalize !== 'function') throw new Error('--sampler-from :rr3 needs Programs (app/engine/programs.js)');
      doc.programs = doc.programs || {};
      doc.programs[pid] = window.Programs.normalize({ name: pid, kind: 'drums', global: {}, regions: ids.map(function (id, k) {
        // gain (dB) undoes the sampler's velocity scaling at the captured hit's own velocity, so that hit replays as heard
        return { buffer: id, lokey: 0, hikey: 127, root: 60, seq: k + 1, seqLen: 3, loop: 'none', gain: -20 * Math.log(hits[k].vel) / Math.LN10 };
      }) });
      t2.params = { buffer: '', program: pid };
    } else {
      t2.params = { buffer: ids[0], level: Math.min(1.5, 1 / hits[0].vel), attack: 0.0005 };   // level undoes the velocity scaling at the captured velocity
      if (mode === 'pitched') t2.params.pitch = 48 - midi0;
    }
    var host = window.Host.create({ doc: doc });
    for (i = 0; i < ids.length; i++) {
      var got = await host.loadAudio(wavF32(bufs[i], job.sr), { id: ids[i], name: ids[i] + '.wav', analyze: false });
      if (got !== ids[i]) throw new Error('--sampler-from: the host stored the capture as ' + got + ', expected ' + ids[i]);
    }
    window.__host = host;
    // how different the three round-robin captures really are (mean absolute difference of the common length / mean level)
    var rrDiff = null;
    if (mode === 'rr3') {
      var n = Math.min(bufs[0][0].length, bufs[1][0].length, bufs[2][0].length), d = 0, m = 0, q;
      for (q = 0; q < n; q++) { d += Math.abs(bufs[0][0][q] - bufs[1][0][q]) + Math.abs(bufs[1][0][q] - bufs[2][0][q]); m += Math.abs(bufs[0][0][q]) + Math.abs(bufs[1][0][q]); }
      rrDiff = m > 0 ? Math.round(d / m * 1e4) / 1e4 : 0;
    }
    return { track: name, labels: {
      sampleOf: type, sampleMode: mode, sampleHits: hits.map(function (h) { return { step: h.step, bar: Math.floor(h.step / STEPS), stepInBar: h.step % STEPS, midi: h.midi == null ? null : h.midi, vel: h.vel }; }),
      sampleSeconds: bufs.map(function (b) { return Math.round(b[0].length / job.sr * 1000) / 1000; }),
      sampleBuffers: ids, samplePitch: mode === 'pitched' ? { capturedMidi: midi0, transposeFrom: 48 - midi0 } : null,
      roundRobin: mode === 'rr3' ? { length: 3, order: 'hit index modulo 3', meanAbsDiffRatio: rrDiff } : null,
      sampleNote: 'captured at the hit\'s own velocity; the sampler then scales other velocities linearly (the synth\'s own velocity curve is not copied). Parameter locks, if any, are not applied to the capture.'
    } };
  }
  window.__rt = { labels: labels, swap: swap };
  return true;
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
    await page.evaluate(installTools);
    var lat = opts.labelsOnly ? null : await page.evaluate(pageLatency);
    var latency = lat && lat.first >= 0 ? lat.first - SCHEDULED_GRID : 0;
    if (opts.labelsOnly) console.log('latency: not measured (--labels-only)');
    else if (!lat || lat.first < 0) console.log('latency: not measured (no sub or kick track); assuming 0 samples');
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
      var swapInfo = null;
      if (opts.samplerFrom) {
        job.name += '-smp-' + opts.samplerFrom.track + (opts.samplerFrom.mode === 'first' ? '' : '-' + opts.samplerFrom.mode);
        swapInfo = await page.evaluate(function (a) { return window.__rt.swap(a); },
          { track: opts.samplerFrom.track, mode: opts.samplerFrom.mode, from: job.from, to: job.to, sr: opts.sr, seed: opts.seed, song: opts.song });
      } else {
        await page.evaluate(function () { if (window.__baseHost) window.__host = window.__baseHost; });
      }
      var r = null, wavPath = null, tRender = performance.now();
      if (opts.labelsOnly) {
        var barSec0 = 4 * 60 / layout.bpm;
        r = { sampleRate: opts.sr, channels: 2, length: Math.ceil(opts.sr * ((job.to - job.from) * barSec0 + opts.tail + 0.1)), ms: 0 };
      } else {
        r = await page.evaluate(pageRender, job);
        var nBytes = r.bytes, parts = [], CH = 4 * 1024 * 1024;
        for (var o = 0; o < nBytes; o += CH) {
          parts.push(Buffer.from(await page.evaluate(pageChunk, [o, Math.min(CH, nBytes - o)]), 'base64'));
        }
        wavPath = path.join(opts.out, job.name + '.wav');
        fs.writeFileSync(wavPath, Buffer.concat(parts));
      }
      var tLabels = performance.now();
      var labels = await page.evaluate(function (a) { return window.__rt.labels(a); },
        { song: opts.song, from: job.from, to: job.to, solo: opts.solo || [], swap: swapInfo });
      var labelsMs = performance.now() - tLabels;
      var barSec = 4 * 60 / layout.bpm;
      var side = {
        name: job.name, page: opts.page, kind: layout.kind, section: job.section, song: opts.song,
        from: job.from, to: job.to, bars: job.to - job.from,
        sampleRate: r.sampleRate, channels: r.channels, lengthSamples: r.length,
        bpm: layout.bpm, swing: layout.swing, tailSeconds: opts.tail,
        // gridStartSample is where bar `from` (step 0) sits in the WAV: the scheduled start (0.05 s, sample 2205)
        // plus the chain latency. scheduledGridSample and latencySamples are kept for transparency.
        gridStartSample: opts.labelsOnly ? null : gridStart,
        scheduledGridSample: SCHEDULED_GRID,
        latencySamples: opts.labelsOnly ? null : latency,
        latencyMeasuredOn: lat ? lat.track : null,
        barSeconds: barSec,
        wav: wavPath ? path.relative(REPO, wavPath) : null,
        labels: labels
      };
      if (opts.labelsOnly) side.labelsOnly = true;
      if (opts.samplerFrom) side.samplerFrom = opts.samplerFrom.track + (opts.samplerFrom.mode === 'first' ? '' : ':' + opts.samplerFrom.mode);
      fs.writeFileSync(path.join(opts.out, job.name + '.json'), JSON.stringify(side, null, 2) + '\n');
      if (opts.labelsOnly) {
        console.log('labels ' + job.name + ': bars ' + job.from + '..' + (job.to - 1) + ', ' + (Object.keys(labels).length - 1) + ' tracks in ' +
          (labelsMs / 1000).toFixed(2) + ' s (no render) -> ' + path.relative(REPO, path.join(opts.out, job.name + '.json')));
        continue;
      }
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
