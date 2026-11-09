/* Havantechno engine - programs.js
 * Global `Programs`: sampler programs as plain data (Kontakt-class zones). Pure: no AudioContext, runs in Node.
 *
 *   Programs.normalize(program)                         -> program with every region field filled in
 *   Programs.parseSfz(text, {resolve, include})          -> {program, samples, warnings}
 *   Programs.toSfz(program, {src, defaultPath})         -> SFZ text (round trips through parseSfz)
 *   Programs.parseName(name)                            -> {key, keyGuess, drumKey, vel, rr, name}
 *   Programs.autoMap(entries, {mode, keys})             -> program  (entries: {id, name, analysis, meta})
 *   Programs.slice(id, samples, sampleRate, opts)       -> regions  ('grid' | 'transient')
 *   Programs.detectPitch(samples, sampleRate, opts)     -> {hz, clarity, midi, root, cents}  (YIN)
 *   Programs.readWavMeta(arrayBuffer)                   -> {rate, channels, root, fraction, loops, loopType}  (never throws)
 *
 * Positions (offset, end, loopStart, loopEnd) are frames of the original file. The engine converts them with the file's
 * rate (doc.audio[id].meta.rate). Units: gain in dB, pan -1..1, veltrack 0..1, env times in seconds, sustain 0..1.
 * SFZ uses dB, -100..100, percent and cents; the conversions are in toSfz and parseSfz.
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  // ------------------------------------------------------------ region fields and defaults
  var REGION = {
    buffer: '', lokey: 0, hikey: 127, root: 60, lovel: 1, hivel: 127, tune: 0, transpose: 0, keytrack: 100,
    gain: 0, pan: 0, veltrack: 1, offset: 0, end: 0, loop: 'none', loopStart: 0, loopEnd: 0, xfade: 0, xfCurve: 'power',
    seq: 1, seqLen: 1, lorand: 0, hirand: 1, group: '', offBy: '', offMode: 'fast', notePoly: 0, rootFile: false,
    env: null, filter: null, fenv: null, vib: null, lfo: null, reverse: 0, extra: {}
  };
  var LOOPS = ['none', 'oneshot', 'continuous', 'sustain'];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  function normRegion(r) {
    var out = clone(REGION), k;
    r = r || {};
    for (k in r) if (has(r, k) && r[k] !== undefined) out[k] = clone(r[k]);
    if (LOOPS.indexOf(out.loop) < 0) out.loop = 'none';
    out.root = clamp(out.root | 0, 0, 127); out.lokey = clamp(out.lokey | 0, -1, 127); out.hikey = clamp(out.hikey | 0, 0, 127);
    out.lovel = clamp(out.lovel | 0, 1, 127); out.hivel = clamp(out.hivel | 0, 1, 127);
    out.seqLen = Math.max(1, out.seqLen | 0); out.seq = clamp(out.seq | 0, 1, out.seqLen);
    return out;
  }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }

  // a program: {name, kind, source, global, regions}. Every region gets its defaults; the program's global holds
  // the values the Host copies into the track params (env, filter, fenv, vib, lfo, gate)
  function normalize(p) {
    p = p || {};
    var out = { name: String(p.name || 'Program'), kind: p.kind === 'drums' ? 'drums' : 'pitched',
                source: p.source ? clone(p.source) : { format: 'native' }, global: p.global ? clone(p.global) : {},
                regions: [] };
    var list = p.regions || [];
    for (var i = 0; i < list.length && i < 2048; i++) out.regions.push(normRegion(list[i]));
    return out;
  }

  // ------------------------------------------------------------ note names
  var PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  function noteValue(v) {
    if (typeof v === 'number') return v === v ? clamp(Math.round(v), 0, 127) : null;
    var s = String(v == null ? '' : v).trim().toLowerCase();
    if (/^-?\d+$/.test(s)) return clamp(parseInt(s, 10), -1, 127);   // -1 is kept for lokey (never plays from keys)
    var m = /^([a-g])(#|b)?(-?\d+)$/.exec(s);
    if (!m) return null;
    var midi = (parseInt(m[3], 10) + 1) * 12 + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return clamp(midi, 0, 127);
  }

  // ------------------------------------------------------------ SFZ parsing
  var T1_NOTE = { lokey: 'lokey', hikey: 'hikey', key: 'key', pitch_keycenter: 'root', lovel: 'lovel', hivel: 'hivel',
                  tune: 'tune', transpose: 'transpose', pitch_keytrack: 'keytrack', volume: 'gain', pan: 'pan',
                  amp_veltrack: 'veltrack', offset: 'offset', end: 'end', group: 'group', off_by: 'offBy',
                  off_mode: 'offMode', note_polyphony: 'notePoly', seq_length: 'seqLen', seq_position: 'seq',
                  lorand: 'lorand', hirand: 'hirand', loop_start: 'loopStart', loop_end: 'loopEnd',
                  loop_crossfade: 'xfade', loop_mode: 'loop' };
  var ENV_OPS = { ampeg_delay: 'delay', ampeg_attack: 'attack', ampeg_hold: 'hold', ampeg_decay: 'decay',
                  ampeg_sustain: 'sustain', ampeg_release: 'release' };
  var FENV_OPS = { fileg_delay: 'delay', fileg_attack: 'attack', fileg_hold: 'hold', fileg_decay: 'decay',
                   fileg_sustain: 'sustain', fileg_release: 'release', fileg_depth: 'depth' };
  var FIL_TYPE = { lpf_1p: 'lowpass', lpf_2p: 'lowpass', hpf_1p: 'highpass', hpf_2p: 'highpass', bpf_2p: 'bandpass',
                   brf_2p: 'notch', lpf_4p: 'lp24', hpf_4p: 'hp24' };
  var FIL_BACK = { lowpass: 'lpf_2p', highpass: 'hpf_2p', bandpass: 'bpf_2p', notch: 'brf_2p', lp24: 'lpf_4p', hp24: 'hpf_4p' };
  var TIER2 = ['trigger', 'xfin_lovel', 'xfin_hivel', 'xfout_lovel', 'xfout_hivel', 'amp_velcurve_', 'pitcheg_', 'sw_', 'locc', 'hicc',
               'on_locc', 'effect', 'eq', 'lfo', 'polyphony', 'count', 'label_cc', 'sample_quality'];

  function tierTwo(op) {
    for (var i = 0; i < TIER2.length; i++) if (op.indexOf(TIER2[i]) === 0) return true;
    return false;
  }

  // SFZ text -> tokens: {h: 'region'} for headers, {op, value} for opcodes, with the line of each
  function tokens(text) {
    var out = [], re = /<(\w+)>|(?:^|\s)([A-Za-z_][A-Za-z0-9_]*)=/g, m, list = [];
    while ((m = re.exec(text))) list.push({ m: m, index: m.index, end: re.lastIndex });
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (it.m[1]) { out.push({ h: it.m[1].toLowerCase(), line: lineOf(text, it.index) }); continue; }
      var next = (i + 1 < list.length) ? list[i + 1].index : text.length;
      out.push({ op: it.m[2], value: text.slice(it.end, next).trim(), line: lineOf(text, it.index) });
    }
    return out;
  }
  function lineOf(text, index) { var n = 1, i; for (i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) n++; return n; }

  // comments out, #define and #include expanded (depth-limited)
  function preprocess(text, opts, depth, defs, warnings) {
    text = String(text || '').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    var lines = text.split(/\r?\n/), out = [], i;
    for (i = 0; i < lines.length; i++) {
      var ln = lines[i], d = /^\s*#define\s+(\$\w+)\s+(.*)$/.exec(ln);
      if (d) { defs[d[1]] = d[2].trim(); continue; }
      var inc = /^\s*#include\s+"([^"]+)"/.exec(ln);
      if (inc) {
        var body = (opts && opts.include) ? opts.include(inc[1]) : null;
        if (body == null || depth > 5) warnings.push({ line: i + 1, opcode: '#include', why: 'include not found: ' + inc[1] });
        else out.push(preprocess(body, opts, depth + 1, defs, warnings));
        continue;
      }
      out.push(ln);
    }
    text = out.join('\n');
    Object.keys(defs).sort(function (a, b) { return b.length - a.length; }).forEach(function (k) { text = text.split(k).join(defs[k]); });
    return text;
  }

  function parseSfz(text, opts) {
    opts = opts || {};
    var warnings = [], defs = {};
    var src = preprocess(text, opts, 0, defs, warnings);
    var toks = tokens(src);
    var samples = [], defaultPath = '';
    var ctlAll = tokens(src).filter(function (t) { return t.op === 'default_path'; });
    if (ctlAll.length) defaultPath = ctlAll[0].value;
    var prog = { name: '', kind: 'pitched', source: { format: 'sfz' }, global: { gate: 1 }, regions: [] };
    var regions = [];
    regions = parseRegions(src, opts, warnings, defaultPath, samples);
    prog.regions = regions.map(normRegion);
    hoist(prog);
    return { program: normalize(prog), samples: samples, warnings: warnings };
  }

  // second pass: walk the tokens again, merging each region with the tiers above it
  function parseRegions(src, opts, warnings, defaultPath, samples) {
    var toks = tokens(src), ctl = {}, glob = {}, mast = {}, grp = {}, sec = null, out = [], cur = null;
    function flush() { if (cur) out.push(buildRegion(merge(glob, mast, grp, cur), opts, warnings, defaultPath, samples)); cur = null; }
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (t.h) {
        if (t.h === 'region') { flush(); cur = {}; sec = 'region'; continue; }
        flush();
        sec = t.h;
        if (sec === 'control') ctl = {};
        if (sec === 'global') { glob = {}; mast = {}; grp = {}; }
        if (sec === 'master') { mast = {}; grp = {}; }
        if (sec === 'group') grp = {};
        continue;
      }
      if (sec === 'control') ctl[t.op] = t.value;
      else if (sec === 'global') glob[t.op] = { value: t.value, line: t.line };
      else if (sec === 'master') mast[t.op] = { value: t.value, line: t.line };
      else if (sec === 'group') grp[t.op] = { value: t.value, line: t.line };
      else if (sec === 'region' && cur) cur[t.op] = { value: t.value, line: t.line };
    }
    flush();
    return out;
  }
  function merge() {
    var out = {}, i, k;
    for (i = 0; i < arguments.length; i++) {
      var tier = arguments[i];
      if (!tier || typeof tier !== 'object') continue;
      for (k in tier) if (has(tier, k)) out[k] = (typeof tier[k] === 'string') ? { value: tier[k], line: 0 } : tier[k];
    }
    return out;
  }

  function noteOrNum(v) { var n = noteValue(v); return n == null ? 0 : n; }

  function buildRegion(ops, opts, warnings, defaultPath, samples) {
    var r = clone(REGION), k;
    r.extra = {};
    var env = {}, fenv = {}, fil = {}, vib = {}, lfo = {}, has_env = false, has_fenv = false, has_fil = false, has_vib = false, has_lfo = false;
    for (k in ops) {
      if (!has(ops, k)) continue;
      var op = k, v = String(ops[k].value), line = ops[k].line || 0;
      if (op === 'sample') {
        var p = v.replace(/\\/g, '/');
        if (defaultPath && p.charAt(0) !== '/' && !/^[A-Za-z]:/.test(p)) p = defaultPath.replace(/\\/g, '/').replace(/\/?$/, '/') + p;
        var id = opts.resolve ? opts.resolve(p) : null;
        r.buffer = id || p;
        if (samples.indexOf(p) < 0) samples.push(p);
        if (!id) warnings.push({ line: line, opcode: op, why: 'sample not resolved: ' + p });
      } else if (op === 'key') { r.lokey = r.hikey = r.root = noteOrNum(v); }
      else if (op === 'pitch_keycenter' || op === 'lokey' || op === 'hikey' || op === 'lovel' || op === 'hivel' || op === 'group' ||
               op === 'off_by' || op === 'seq_length' || op === 'seq_position' || op === 'note_polyphony') {
        var f = T1_NOTE[op];
        if (op === 'pitch_keycenter' && v.trim().toLowerCase() === 'sample') r.rootFile = true;
        else if (op === 'pitch_keycenter' || op === 'lokey' || op === 'hikey') r[f] = noteOrNum(v);
        else if (op === 'group' || op === 'off_by') r[f] = v;
        else if (op === 'off_mode') r.offMode = v;
        else r[f] = parseFloat(v) || 0;
      } else if (op === 'off_mode') { r.offMode = v === 'normal' ? 'normal' : 'fast'; }
      else if (op === 'tune') r.tune = parseFloat(v) || 0;
      else if (op === 'transpose') r.transpose = parseFloat(v) || 0;
      else if (op === 'pitch_keytrack') r.keytrack = parseFloat(v);
      else if (op === 'volume') r.gain = parseFloat(v) || 0;
      else if (op === 'pan') r.pan = (parseFloat(v) || 0) / 100;
      else if (op === 'amp_veltrack') r.veltrack = (parseFloat(v) || 0) / 100;
      else if (op === 'offset') r.offset = parseFloat(v) || 0;
      else if (op === 'end') r.end = parseFloat(v) || 0;
      else if (op === 'loop_mode') r.loop = ({ no_loop: 'none', one_shot: 'oneshot', loop_continuous: 'continuous', loop_sustain: 'sustain' })[v] || 'none';
      else if (op === 'loop_start') r.loopStart = parseFloat(v) || 0;
      else if (op === 'loop_end') r.loopEnd = parseFloat(v) || 0;
      else if (op === 'loop_crossfade') r.xfade = parseFloat(v) || 0;
      else if (op === 'lorand') r.lorand = parseFloat(v) || 0;
      else if (op === 'hirand') r.hirand = parseFloat(v);
      else if (op === 'note_polyphony') r.notePoly = parseInt(v, 10) || 0;
      else if (op === 'direction') r.reverse = v === 'reverse' ? 1 : 0;
      else if (ENV_OPS[op]) { has_env = true; env[ENV_OPS[op]] = op === 'ampeg_sustain' ? (parseFloat(v) || 0) / 100 : (parseFloat(v) || 0); }
      else if (FENV_OPS[op]) { has_fenv = true; fenv[FENV_OPS[op]] = op === 'fileg_sustain' ? (parseFloat(v) || 0) / 100 : (parseFloat(v) || 0); }
      else if (op === 'fil_type') { has_fil = true; fil.type = FIL_TYPE[v] || v; if (!FIL_TYPE[v]) warnings.push({ line: line, opcode: op, why: 'unknown filter type, kept as ' + v }); }
      else if (op === 'cutoff') { has_fil = true; fil.cutoff = parseFloat(v) || 0; }
      else if (op === 'resonance') { has_fil = true; fil.reso = parseFloat(v) || 0; }
      else if (op === 'fil_keytrack') { has_fil = true; fil.key = parseFloat(v) || 0; }
      else if (op === 'fil_keycenter') { has_fil = true; fil.keyCenter = noteOrNum(v); }
      else if (op === 'fil_veltrack') { has_fil = true; fil.vel = parseFloat(v) || 0; }
      else if (op === 'pitchlfo_freq') { has_vib = true; vib.rate = parseFloat(v) || 0; }
      else if (op === 'pitchlfo_depth') { has_vib = true; vib.depth = parseFloat(v) || 0; }
      else if (op === 'pitchlfo_delay') { has_vib = true; vib.delay = parseFloat(v) || 0; }
      else if (op === 'pitchlfo_fade') { has_vib = true; vib.fade = parseFloat(v) || 0; }
      else if (op === 'fillfo_freq') { has_lfo = true; lfo.rate = parseFloat(v) || 0; }
      else if (op === 'fillfo_depth') { has_lfo = true; lfo.cutoff = parseFloat(v) || 0; }
      else if (op === 'fillfo_delay') { has_lfo = true; lfo.delay = parseFloat(v) || 0; }
      else if (op === 'fillfo_fade') { has_lfo = true; lfo.fade = parseFloat(v) || 0; }
      else if (op === 'amplfo_depth') { has_lfo = true; lfo.amp = parseFloat(v) || 0; }
      else if (op === 'amplfo_freq') { has_lfo = true; if (lfo.rate !== undefined && lfo.rate !== parseFloat(v)) warnings.push({ line: line, opcode: op, why: 'amplfo_freq differs from fillfo_freq; the filter rate is kept' }); }
      else if (op === 'polyphony') r.extra.polyphony = v;
      else if (tierTwo(op)) { r.extra[op] = v; warnings.push({ line: line, opcode: op, why: 'kept verbatim, not played' }); }
      else { r.extra[op] = v; warnings.push({ line: line, opcode: op, why: 'unknown opcode, kept verbatim' }); }
    }
    if (has_fil && fil.type === undefined) fil.type = 'lowpass';      // fil_type absent: lpf_2p (SFZ default)
    if (r.rootFile) {
      // pitch_keycenter=sample: the root is the file's own (WAV smpl or acid), 0 with a warning when the file has none
      var mt = opts.meta ? opts.meta(r.buffer) : null;
      if (mt && typeof mt.root === 'number') r.root = mt.root;
      else { r.root = 0; warnings.push({ line: 0, opcode: 'pitch_keycenter', why: 'sample has no root; using 0' }); }
    }
    if (r.loop === 'continuous' && !r.loopEnd) {
      // loop_continuous without loop points: the file's first loop when it has one (one_shot ignores file loops)
      var lm = opts.meta ? opts.meta(r.buffer) : null;
      if (lm && lm.loops && lm.loops.length) { r.loopStart = lm.loops[0][0]; r.loopEnd = lm.loops[0][1]; }
    }
    if (has_env) r.env = env;
    if (has_fenv) r.fenv = fenv;
    if (has_fil) r.filter = fil;
    if (has_vib) r.vib = vib;
    if (has_lfo) r.lfo = lfo;
    return r;
  }

  // hoist: an envelope, filter or LFO that is identical in every region moves to program.global
  function hoist(prog) {
    var keys = ['env', 'filter', 'fenv', 'vib', 'lfo'], k, i, same, first;
    for (k = 0; k < keys.length; k++) {
      var key = keys[k];
      if (!prog.regions.length) break;
      first = JSON.stringify(prog.regions[0][key]);
      same = prog.regions.every(function (r) { return JSON.stringify(r[key]) === first; });
      if (same && prog.regions[0][key] !== null) {
        prog.global[key] = clone(prog.regions[0][key]);
        for (i = 0; i < prog.regions.length; i++) prog.regions[i][key] = null;
      }
    }
  }

  // ------------------------------------------------------------ SFZ writing (every field, so parse(toSfz(p)) is the same)
  function fmtNum(x) { return String(+x); }
  function regionOps(r, srcOf) {
    var o = [], d = REGION;
    o.push(['sample', srcOf(r.buffer)]);
    o.push(['lokey', fmtNum(r.lokey)], ['hikey', fmtNum(r.hikey)], ['pitch_keycenter', r.rootFile ? 'sample' : fmtNum(r.root)]);
    o.push(['lovel', fmtNum(r.lovel)], ['hivel', fmtNum(r.hivel)]);
    o.push(['tune', fmtNum(r.tune)], ['transpose', fmtNum(r.transpose)], ['pitch_keytrack', fmtNum(r.keytrack)]);
    o.push(['volume', fmtNum(r.gain)], ['pan', fmtNum(r.pan * 100)], ['amp_veltrack', fmtNum(r.veltrack * 100)]);
    o.push(['offset', fmtNum(r.offset)], ['end', fmtNum(r.end)]);
    o.push(['loop_mode', ({ none: 'no_loop', oneshot: 'one_shot', continuous: 'loop_continuous', sustain: 'loop_sustain' })[r.loop]]);
    o.push(['loop_start', fmtNum(r.loopStart)], ['loop_end', fmtNum(r.loopEnd)], ['loop_crossfade', fmtNum(r.xfade)]);
    o.push(['group', String(r.group)], ['off_by', String(r.offBy)], ['off_mode', r.offMode], ['note_polyphony', fmtNum(r.notePoly)]);
    o.push(['seq_length', fmtNum(r.seqLen)], ['seq_position', fmtNum(r.seq)], ['lorand', fmtNum(r.lorand)], ['hirand', fmtNum(r.hirand)]);
    if (r.reverse) o.push(['direction', 'reverse']);
    if (r.env) {
      var e = r.env;
      if (e.delay !== undefined) o.push(['ampeg_delay', fmtNum(e.delay)]);
      if (e.attack !== undefined) o.push(['ampeg_attack', fmtNum(e.attack)]);
      if (e.hold !== undefined) o.push(['ampeg_hold', fmtNum(e.hold)]);
      if (e.decay !== undefined) o.push(['ampeg_decay', fmtNum(e.decay)]);
      if (e.sustain !== undefined) o.push(['ampeg_sustain', fmtNum(e.sustain * 100)]);
      if (e.release !== undefined) o.push(['ampeg_release', fmtNum(e.release)]);
    }
    if (r.filter) {
      var f = r.filter;
      if (f.type !== undefined) o.push(['fil_type', FIL_BACK[f.type] || 'lpf_2p']);
      if (f.cutoff !== undefined) o.push(['cutoff', fmtNum(f.cutoff)]);
      if (f.reso !== undefined) o.push(['resonance', fmtNum(f.reso)]);
      if (f.key !== undefined) o.push(['fil_keytrack', fmtNum(f.key)]);
      if (f.keyCenter !== undefined) o.push(['fil_keycenter', fmtNum(f.keyCenter)]);
      if (f.vel !== undefined) o.push(['fil_veltrack', fmtNum(f.vel)]);
    }
    if (r.fenv) {
      var fe = r.fenv;
      var fk = { delay: 'fileg_delay', attack: 'fileg_attack', hold: 'fileg_hold', decay: 'fileg_decay', sustain: 'fileg_sustain', release: 'fileg_release', depth: 'fileg_depth' };
      Object.keys(fk).forEach(function (k) { if (fe[k] !== undefined) o.push([fk[k], fmtNum(k === 'sustain' ? fe[k] * 100 : fe[k])]); });
    }
    if (r.vib) {
      var vb = r.vib;
      var vk = { rate: 'pitchlfo_freq', depth: 'pitchlfo_depth', delay: 'pitchlfo_delay', fade: 'pitchlfo_fade' };
      Object.keys(vk).forEach(function (k) { if (vb[k] !== undefined) o.push([vk[k], fmtNum(vb[k])]); });
    }
    if (r.lfo) {
      var lf = r.lfo;
      var lk = { rate: 'fillfo_freq', cutoff: 'fillfo_depth', delay: 'fillfo_delay', fade: 'fillfo_fade', amp: 'amplfo_depth' };
      Object.keys(lk).forEach(function (k) { if (lf[k] !== undefined) o.push([lk[k], fmtNum(lf[k])]); });
    }
    var ek = Object.keys(r.extra || {});
    for (var i = 0; i < ek.length; i++) o.push([ek[i], String(r.extra[ek[i]])]);
    return o;
  }
  function opsText(list) { return list.map(function (p) { return p[0] + '=' + p[1]; }).join(' '); }

  function toSfz(program, opts) {
    opts = opts || {};
    var p = normalize(program), srcOf = opts.src || function (id) { return id; };
    var out = [];
    out.push('// ' + p.name);
    if (opts.defaultPath) out.push('<control>\ndefault_path=' + opts.defaultPath);
    var g = p.global, gops = [];
    if (g.env) gops = gops.concat(regionOps({ buffer: '', env: g.env, extra: {} }, srcOf).filter(function (x) { return /^ampeg_/.test(x[0]); }));
    if (g.filter) gops = gops.concat(regionOps({ buffer: '', filter: g.filter, extra: {} }, srcOf).filter(function (x) { return /^(fil_|cutoff|resonance)/.test(x[0]); }));
    if (g.fenv) gops = gops.concat(regionOps({ buffer: '', fenv: g.fenv, extra: {} }, srcOf).filter(function (x) { return /^fileg_/.test(x[0]); }));
    if (g.vib) gops = gops.concat(regionOps({ buffer: '', vib: g.vib, extra: {} }, srcOf).filter(function (x) { return /^pitchlfo_/.test(x[0]); }));
    if (g.lfo) gops = gops.concat(regionOps({ buffer: '', lfo: g.lfo, extra: {} }, srcOf).filter(function (x) { return /^(fillfo_|amplfo_)/.test(x[0]); }));
    if (gops.length) out.push('<global>\n' + opsText(gops));
    p.regions.forEach(function (r) { out.push('<region> ' + opsText(regionOps(r, srcOf))); });
    return out.join('\n') + '\n';
  }

  // ------------------------------------------------------------ names and auto-map
  var DYN = { ppp: 16, pp: 32, p: 48, mp: 64, mf: 80, f: 96, ff: 112, fff: 127 };
  var DRUM = [['kick', 36], ['bd', 36], ['rim', 37], ['rs', 37], ['snare', 38], ['sd', 38], ['clap', 39], ['cp', 39],
              ['closed', 42], ['ch', 42], ['hh', 42], ['open', 46], ['oh', 46], ['lowtom', 41], ['midtom', 45], ['hightom', 48],
              ['crash', 49], ['ride', 51], ['cowbell', 56], ['cb', 56], ['clave', 75], ['cl', 75], ['maracas', 70], ['shaker', 70],
              ['conga', 62]];

  function parseName(name) {
    var base = String(name || '').replace(/\.[A-Za-z0-9]{2,4}$/, '');
    var out = { name: String(name || ''), key: null, keyGuess: null, drumKey: null, vel: null, rr: null };
    var nm = /(^|[^A-Za-z0-9])([A-Ga-g])(#|b|s)?(-?[0-9])(?![A-Za-z0-9])/.exec(base);
    if (nm) {
      var acc = nm[3] === '#' || nm[3] === 's' ? 1 : nm[3] === 'b' ? -1 : 0;
      out.key = clamp((parseInt(nm[4], 10) + 1) * 12 + PC[nm[2].toLowerCase()] + acc, 0, 127);
    }
    var vm = /(?:^|[^A-Za-z])v(?:el)?(\d{1,3})(?![0-9])/i.exec(base);
    if (vm) out.vel = clamp(parseInt(vm[1], 10), 1, 127);
    else {
      var dm = /(?:^|[^A-Za-z])(pppp?|ffff?|pp|ff|mp|mf|p|f)(?![A-Za-z])/i.exec(base);
      if (dm && DYN[dm[1].toLowerCase()]) out.vel = DYN[dm[1].toLowerCase()];
    }
    var rm = /rr(\d+)/i.exec(base);
    if (rm) out.rr = parseInt(rm[1], 10);
    var bare = base.replace(/(?:^|[^A-Za-z])v(?:el)?\d{1,3}(?![0-9])/ig, ' ').replace(/rr\d+/ig, ' ');
    var bm = /(?:^|[^0-9A-Za-z])(\d{2,3})(?![0-9])/.exec(bare);
    if (bm && parseInt(bm[1], 10) <= 127) out.keyGuess = parseInt(bm[1], 10);
    var low = base.toLowerCase();
    for (var i = 0; i < DRUM.length; i++) {
      var w = DRUM[i][0];
      if (new RegExp('(^|[^a-z])' + w + '([^a-z]|$)').test(low)) { out.drumKey = DRUM[i][1]; break; }
    }
    return out;
  }

  function autoMap(entries, opts) {
    opts = opts || {};
    var mode = opts.mode || 'auto', keys = opts.keys || 'mid', i;
    var parsed = entries.map(function (e) { return { e: e, p: parseName(e.name), a: e.analysis || null }; });
    var pitched = 0, drumLike = 0;
    parsed.forEach(function (x) {
      var pitchedX = x.p.key != null || (x.a && x.a.hz > 0);
      if (pitchedX) pitched++;
      if (x.p.drumKey != null || !pitchedX) drumLike++;
    });
    var kind = mode === 'drums' ? 'drums' : mode === 'pitched' ? 'pitched' : (drumLike * 2 > parsed.length ? 'drums' : 'pitched');
    var nextPad = 36;
    var items = parsed.map(function (x) {
      var key = x.p.key;
      if (key == null && x.a && x.a.hz > 0 && x.a.root != null) key = x.a.root;
      if (key == null && x.p.drumKey != null) key = x.p.drumKey;
      if (key == null && x.p.keyGuess != null) key = x.p.keyGuess;
      if (key == null) key = Math.min(51, nextPad++);
      return { id: x.e.id, name: x.e.name, root: key, vel: x.p.vel, rr: x.p.rr, cents: (x.a && x.a.hz > 0 && x.p.key == null) ? x.a.cents : 0,
               loops: (x.e.meta && x.e.meta.loops) ? x.e.meta.loops : [] };
    });
    var regions = [], roots = [], byRoot = {};
    items.forEach(function (it) { if (roots.indexOf(it.root) < 0) roots.push(it.root); byRoot[it.root] = (byRoot[it.root] || []).concat([it]); });
    roots.sort(function (a, b) { return a - b; });
    for (i = 0; i < roots.length; i++) {
      var r0 = roots[i], list = byRoot[r0];
      var lo, hi;
      if (kind === 'drums') { lo = hi = r0; }
      else if (keys === 'below') { lo = i === 0 ? 0 : roots[i - 1] + 1; hi = r0; }
      else { lo = i === 0 ? 0 : Math.floor((roots[i - 1] + r0) / 2) + 1; hi = i === roots.length - 1 ? 127 : Math.floor((r0 + roots[i + 1]) / 2); }
      // velocity layers within this root
      var vels = [], vi;
      list.forEach(function (it) { var v = it.vel == null ? 127 : it.vel; if (vels.indexOf(v) < 0) vels.push(v); });
      vels.sort(function (a, b) { return a - b; });
      for (vi = 0; vi < vels.length; vi++) {
        var v = vels[vi];
        var lov = vi === 0 ? 1 : vels[vi - 1] + 1, hiv = vi === vels.length - 1 ? 127 : v;
        var group = list.filter(function (it) { return (it.vel == null ? 127 : it.vel) === v; });
        group.sort(function (a, b) { return (a.rr || 0) - (b.rr || 0) || (a.name < b.name ? -1 : 1); });
        group.forEach(function (it, gi) {
          var reg = { buffer: it.id, lokey: lo, hikey: hi, root: r0, lovel: lov, hivel: hiv, seq: gi + 1, seqLen: group.length,
                      tune: it.cents ? -it.cents : 0 };
          if (kind === 'pitched') reg.loop = it.loops.length ? 'sustain' : 'none';
          else reg.loop = it.loops.length ? 'oneshot' : 'oneshot';
          regions.push(reg);
        });
      }
    }
    return normalize({ name: opts.name || 'Auto-mapped', kind: kind, source: { format: 'auto' },
                       global: { gate: kind === 'drums' ? 0 : 1 }, regions: regions });
  }

  // ------------------------------------------------------------ slicing
  function slice(id, samples, sampleRate, opts) {
    opts = opts || {};
    var N = samples.length, out = [], i, sr = sampleRate || 44100;
    if (opts.mode === 'grid') {
      var n = Math.max(1, opts.n | 0 || 16), step = Math.floor(N / n);
      for (i = 0; i < n; i++) out.push(normRegion({ buffer: id, lokey: 36 + i, hikey: 36 + i, root: 36 + i, offset: i * step, end: i === n - 1 ? 0 : (i + 1) * step }));
      return out;
    }
    // transient: an energy-rise novelty on 1024-sample hops, a median-adaptive threshold, 50 ms minimum gap
    var hop = 1024, nH = Math.floor(N / hop), rms = [], nov = [];
    for (i = 0; i < nH; i++) { var s = 0, j; for (j = 0; j < hop; j++) s += samples[i * hop + j] * samples[i * hop + j]; rms.push(Math.sqrt(s / hop)); }
    for (i = 1; i < nH; i++) nov.push(Math.max(0, rms[i] - rms[i - 1]));
    var sorted = nov.slice().sort(function (a, b) { return a - b; });
    var med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    var thr = med * (opts.threshold || 4) + 1e-4, onsets = [0], last = -1e9, gap = Math.round(0.05 * sr / hop);
    for (i = 0; i < nov.length; i++) if (nov[i] > thr && i + 1 - last >= gap) { onsets.push((i + 1) * hop); last = i + 1; }
    if (opts.n) onsets = onsets.slice(0, opts.n);
    for (i = 0; i < onsets.length && i < 16; i++) {
      var endF = i + 1 < onsets.length ? onsets[i + 1] : 0;
      out.push(normRegion({ buffer: id, lokey: 36 + i, hikey: 36 + i, root: 36 + i, offset: onsets[i], end: endF }));
    }
    return out;
  }

  // ------------------------------------------------------------ pitch detection (YIN, de Cheveigne and Kawahara 2002)
  function toMono(samples) {
    if (!samples || !samples.length) return new Float32Array(0);
    if (typeof samples[0] === 'number') return samples;
    var n = samples[0].length, out = new Float32Array(n), c, i;
    for (c = 0; c < samples.length; c++) for (i = 0; i < n; i++) out[i] += samples[c][i] / samples.length;
    return out;
  }
  // returns {lag, clarity} for the window x[start .. start+W)
  function yinWindow(x, start, W, sr, fmin, fmax, thr) {
    var tauMin = Math.max(2, Math.floor(sr / fmax)), tauMax = Math.min(Math.floor(sr / fmin), Math.floor(W / 2));
    var d = new Float64Array(tauMax + 1), tau, j;
    for (tau = 1; tau <= tauMax; tau++) {
      var s = 0;
      for (j = 0; j < W; j++) { var df = x[start + j] - x[start + j + tau]; s += df * df; }
      d[tau] = s;
    }
    var cmnd = new Float64Array(tauMax + 1), run = 0;
    cmnd[0] = 1;
    for (tau = 1; tau <= tauMax; tau++) { run += d[tau]; cmnd[tau] = run > 0 ? d[tau] * tau / run : 1; }
    var best = -1;
    for (tau = tauMin; tau < tauMax; tau++) {
      if (cmnd[tau] < thr) {
        while (tau + 1 < tauMax && cmnd[tau + 1] < cmnd[tau]) tau++;
        best = tau; break;
      }
    }
    if (best < 0) {
      var mn = Infinity;
      for (tau = tauMin; tau < tauMax; tau++) if (cmnd[tau] < mn) { mn = cmnd[tau]; best = tau; }
    }
    if (best < 0) return { lag: 0, clarity: 0 };
    var refined = best;
    if (best > 0 && best < tauMax) {
      var a = cmnd[best - 1], b = cmnd[best], c = cmnd[best + 1], den = a - 2 * b + c;
      if (den !== 0) refined = best + 0.5 * (a - c) / den;
    }
    return { lag: refined, clarity: 1 - cmnd[best] };
  }
  function detectPitch(samples, sampleRate, opts) {
    opts = opts || {};
    var sr = sampleRate || 44100, x = toMono(samples), N = x.length;
    var fmin = opts.fmin || 30, fmax = opts.fmax || 2000, thr = opts.threshold || 0.12, W = opts.window || 8192;
    var empty = { hz: 0, clarity: 0, midi: null, root: null, cents: 0 };
    if (N < W * 2) return empty;
    var peak = 0, pi = 0, k;
    for (k = 0; k < N; k++) { var a = Math.abs(x[k]); if (a > peak) { peak = a; } }
    if (peak <= 0) return empty;
    // the onset is the first sample above half the peak (not the loudest one: a steady tone can peak late in a segment)
    for (k = 0; k < N; k++) if (Math.abs(x[k]) >= 0.5 * peak) { pi = k; break; }
    // skip the onset: the first point after the peak where the 10 ms RMS is under 80 % of the peak RMS, plus 30 ms
    var w10 = Math.round(0.01 * sr), s0 = pi, rmsPk = 0;
    for (k = pi; k < pi + w10 && k < N; k++) rmsPk += x[k] * x[k];
    rmsPk = Math.sqrt(rmsPk / w10);
    for (k = pi; k + w10 < N; k++) {
      var q = 0, m;
      for (m = 0; m < w10; m++) q += x[k + m] * x[k + m];
      if (Math.sqrt(q / w10) < 0.8 * rmsPk) { s0 = k; break; }
    }
    var from = Math.max(0, Math.min(N - W, s0 + Math.round(0.03 * sr))), rem = Math.min(N - from, Math.round(1.5 * sr));
    var starts = [0, 0.25, 0.5].map(function (f) { return from + Math.floor(f * Math.max(0, rem - W)); });
    var hz = [], cl = [];
    starts.forEach(function (st) {
      if (st + W >= N) return;
      var r = yinWindow(x, st, W, sr, fmin, fmax, thr);
      if (r.lag > 0) { hz.push(sr / r.lag); cl.push(r.clarity); }
    });
    if (!hz.length) return empty;
    var sortedHz = hz.slice().sort(function (a, b) { return a - b; }), sortedCl = cl.slice().sort(function (a, b) { return a - b; });
    var medHz = sortedHz[Math.floor(sortedHz.length / 2)], medCl = sortedCl[Math.floor(sortedCl.length / 2)];
    if (medCl < (opts.minClarity || 0.8)) return { hz: 0, clarity: medCl, midi: null, root: null, cents: 0 };
    var midi = 69 + 12 * Math.log(medHz / 440) / Math.LN2, rt = Math.round(midi);
    return { hz: medHz, clarity: medCl, midi: midi, root: rt, cents: (midi - rt) * 100 };
  }

  // ------------------------------------------------------------ WAV header (RIFF): rate, smpl loops, acid root
  // Chunk layout constants (byte offsets inside each chunk's data). UNVERIFIED: written from the common WAV smpl and acid
  // descriptions, not yet checked against a file a sampler wrote. Change here only.
  var SMPL = { UNITY: 12, FRACTION: 16, NLOOPS: 28, LOOPS: 36, LOOP_REC: 24, LOOP_TYPE: 4, LOOP_START: 8, LOOP_END: 12 };
  var ACID_ROOT = 4;
  function readWavMeta(buf) {
    var out = { rate: 0, channels: 0, root: null, fraction: 0, loops: [], loopType: [] };
    try {
      var dv = new DataView(buf), n = dv.byteLength, p = 12;
      if (n < 12 || String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'RIFF') return out;
      while (p + 8 <= n) {
        var id = String.fromCharCode(dv.getUint8(p), dv.getUint8(p + 1), dv.getUint8(p + 2), dv.getUint8(p + 3));
        var size = dv.getUint32(p + 4, true), d = p + 8, avail = Math.min(size, n - d);
        if (id === 'fmt ' && avail >= 8) { out.channels = dv.getUint16(d + 2, true); out.rate = dv.getUint32(d + 4, true); }
        if (id === 'smpl' && avail >= 36) {
          out.root = dv.getUint32(d + SMPL.UNITY, true);
          out.fraction = dv.getUint32(d + SMPL.FRACTION, true) / 4294967296;
          var nl = dv.getUint32(d + SMPL.NLOOPS, true), lp = d + SMPL.LOOPS;
          for (var i = 0; i < nl && lp + SMPL.LOOP_REC <= d + avail; i++, lp += SMPL.LOOP_REC) {
            out.loops.push([dv.getUint32(lp + SMPL.LOOP_START, true), dv.getUint32(lp + SMPL.LOOP_END, true)]);
            out.loopType.push(dv.getUint32(lp + SMPL.LOOP_TYPE, true));
          }
        }
        if (id === 'acid' && avail >= 6 && out.root == null) out.root = dv.getUint16(d + ACID_ROOT, true);
        p = d + size + (size & 1);
      }
    } catch (e) { /* a truncated chunk: keep what was read */ }
    return out;
  }

  root.Programs = {
    normalize: normalize, normRegion: normRegion, parseSfz: parseSfz, toSfz: toSfz, parseName: parseName, autoMap: autoMap,
    slice: slice, detectPitch: detectPitch, readWavMeta: readWavMeta, noteValue: noteValue, REGION: REGION
  };
})();
