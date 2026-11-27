/* Recut app engine - presets.js
 * Global `Presets`: a preset and pattern bank for the instruments (Showroom Crew, W1; frozen interface in
 * docs/research/2026-11-26-showroom-crew/BRIEF.md). Load after host.js (it uses only the Host's public calls) and before
 * ui/windows.js. Nothing throws without a DOM, an AudioContext or storage.
 *
 *   Presets.list(type) -> [{id, name, factory, kind: 'patch', machine?}]   type: an instrument ('tb303', 'bd808', ...) or a machine ('hvt808', 'hvt909')
 *   Presets.get(type, id) -> {id, name, type, factory, params: {name: value}} | null   (a machine kit also has voices: {voiceType: params})
 *   Presets.save(type, name, params, {id}) -> id        user presets only; factory ids are read-only (save under one returns null)
 *   Presets.rename(type, id, name) -> bool;  Presets.remove(type, id) -> bool
 *   Presets.capture(host, track) -> params;  Presets.apply(host, track, id) -> bool     through host.setParam, one undo step
 *   Presets.exportText(type, id) -> string;  Presets.importText(text) -> {type, id, problems}   (throws an Error with a readable message)
 *   Presets.patterns.list / get / save / rename / remove / exportText / importText (same shapes); pattern for a synth {bars, cells},
 *     for a machine {voices: {'<voice type>': {bars, cells}}, bpm, swing}
 *   Presets.storage(adapter)    {get(key) -> string|null, set(key, string), remove(key)}; default localStorage in try/catch, else memory;
 *                               in Electron (RecutShell.readAppData/writeAppData) one JSON file, presets.json in the app data folder
 *   Presets.on('change', fn) / Presets.off('change', fn)    fn({what: 'preset'|'pattern'|'storage', action, type, id})
 * Additions (outside the frozen interface): Presets.patterns.apply(host, track, id, {tempo}) and .capture(host, track),
 *   Presets.applyData(host, track, params), Presets.current(host, track), Presets.patterns.current(host, track), Presets.machineOf(type),
 *   Presets.validate(type, params), Presets.patterns.validate(type, pattern), Presets.spec(type), Presets.ready(), Presets.problems(),
 *   Presets.menu(button, {host, device, track, type, kits, patterns, tempo, container, onApply}) -> {el, button, open, close, toggle, isOpen, refresh, dispose}.
 *
 * Validation (on load from storage, on save and on import): unknown parameters are ignored and reported, numbers are clamped
 * to the spec row's range, enumerations are checked (a string not offered is dropped, a number snaps to the nearest option),
 * booleans accept 0/1. A patch sets every spec parameter: a row the preset leaves out goes to the spec's value, except
 * `level`, which stays where the mix has it. Factory presets and patterns below are original work written for this project.
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var STEPS = 16, VERSION = 1, KEY = 'hv.presets.v1', FILE = 'presets.json', MAX_TEXT = 1 << 20, MAX_NAME = 80;
  var CELL_KEYS = { vel: 1, acc: 1, len: 1, nudge: 1, note: 1, prob: 1, cond: 1, rep: 1, locks: 1, slide: 1, notes: 1 };

  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function isArr(a) { return Object.prototype.toString.call(a) === '[object Array]'; }
  function isObj(o) { return !!o && typeof o === 'object' && !isArr(o); }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function isFn(f) { return typeof f === 'function'; }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function safe(fn, d) { try { var v = fn(); return v === undefined ? d : v; } catch (e) { return d; } }
  function warn(msg) { try { if (root.console && root.console.warn) root.console.warn('[Presets] ' + msg); } catch (e) { /* ignore */ } }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x'; }
  function cleanName(n) { n = String(n == null ? '' : n).replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim(); return (n || 'Untitled').slice(0, MAX_NAME); }
  var idCounter = 0;
  function newId(type) { idCounter = (idCounter + 1) % 1296; return type + '/u-' + Date.now().toString(36) + (idCounter + 1296).toString(36).slice(-2) + Math.floor(Math.random() * 1296).toString(36); }
  function typeOfId(id) { var s = String(id || ''), i = s.indexOf('/'); return i > 0 ? s.slice(0, i) : null; }

  // ------------------------------------------------------------------ machines and specs
  var MACHINES = { hvt808: '808', hvt909: '909' };
  var MACHINE_LABEL = { hvt808: 'HVT-808 kit', hvt909: 'HVT-909 kit' };
  function machineOf(type) {
    if (has(MACHINES, type)) return type;
    var m = /^[a-z]{2}(808|909)$/.exec(String(type || ''));
    return m ? 'hvt' + m[1] : null;
  }
  function isMachine(type) { return has(MACHINES, type); }
  function machineVoices(machine) {
    var D = root.Drums, suf = MACHINES[machine], all = D && isFn(D.types) ? D.types() : [];
    return all.filter(function (t) { return t.slice(-3) === suf; });
  }
  var seenSpecs = {};          // specs of types the engine files do not publish (synths.js), learnt from host devices
  function specOf(type) {
    var C = root.Classics, D = root.Drums, s = null;
    if (C && isFn(C.spec)) s = safe(function () { return C.spec(type); }, null);
    if (!s && D && isFn(D.spec)) s = safe(function () { return D.spec(type); }, null);
    return s || seenSpecs[type] || null;
  }
  function learn(dev) { if (dev && dev.type && dev.spec && !specOf(dev.type)) seenSpecs[dev.type] = dev.spec; }
  function knownType(type) { return isMachine(type) || !!specOf(type); }

  // ------------------------------------------------------------------ validation
  function nearest(opts, v) { var b = opts[0], d = Infinity; for (var i = 0; i < opts.length; i++) { var x = Math.abs(Number(opts[i]) - v); if (x < d) { d = x; b = opts[i]; } } return b; }
  // one value against one spec row -> {ok, value, note}
  function checkValue(row, v, name) {
    if (row.options && row.options.length) {
      var strOpts = typeof row.options[0] === 'string';
      if (strOpts) {
        if (row.options.indexOf(String(v)) >= 0 && (typeof v === 'string' || typeof v === 'number')) return { ok: true, value: String(v) };
        return { ok: false, note: name + ': "' + v + '" is not one of ' + row.options.join(', ') };
      }
      var n = Number(v);
      if (typeof v === 'boolean' || v === null || v === '' || n !== n) return { ok: false, note: name + ': ' + JSON.stringify(v) + ' is not a number' };
      var s = nearest(row.options, n);
      return { ok: true, value: s, note: Number(s) !== n ? name + ': ' + n + ' snapped to ' + s : null };
    }
    if (typeof row.value === 'boolean') {
      if (typeof v === 'boolean') return { ok: true, value: v };
      if (v === 0 || v === 1) return { ok: true, value: v === 1 };
      return { ok: false, note: name + ': ' + JSON.stringify(v) + ' is not on or off' };
    }
    if (typeof row.value === 'string') {
      if (typeof v === 'string') return { ok: true, value: v };
      return { ok: false, note: name + ': ' + JSON.stringify(v) + ' is not text' };
    }
    var x = (typeof v === 'number' || typeof v === 'string') && v !== '' ? Number(v) : NaN;
    if (!isFinite(x)) return { ok: false, note: name + ': ' + JSON.stringify(v) + ' is not a number' };
    var lo = isNum(row.min) ? row.min : -Infinity, hi = isNum(row.max) ? row.max : Infinity, c = clamp(x, lo, hi);
    return { ok: true, value: c, note: c !== x ? name + ': ' + x + ' clamped to ' + c : null };
  }
  // params of one instrument type -> {params, problems}
  function validateParams(type, params) {
    var spec = specOf(type), out = {}, problems = [], k;
    if (!isObj(params)) return { params: out, problems: ['params is not an object'] };
    if (!spec) {
      for (k in params) if (has(params, k)) {
        var p = params[k];
        if ((typeof p === 'number' && isFinite(p)) || typeof p === 'string' || typeof p === 'boolean') out[k] = p;
        else problems.push(k + ': ' + JSON.stringify(p) + ' ignored');
      }
      problems.unshift('no spec for type ' + type + ': values kept unchecked');
      return { params: out, problems: problems };
    }
    for (k in params) if (has(params, k)) {
      if (!has(spec, k)) { problems.push(k + ': not a parameter of ' + type + ', ignored'); continue; }
      var r = checkValue(spec[k], params[k], k);
      if (r.ok) out[k] = r.value;
      if (r.note) problems.push(r.note);
    }
    return { params: out, problems: problems };
  }
  // a preset body for a type: {params} for an instrument, {voices} for a machine
  function validateBody(type, body) {
    var problems = [];
    if (isMachine(type)) {
      var voices = {}, vs = isObj(body.voices) ? body.voices : (isObj(body.params) ? body.params : null), suf = MACHINES[type];
      if (!vs) return { voices: voices, problems: ['a kit needs voices: {type: params}'] };
      for (var t in vs) if (has(vs, t)) {
        if (t.slice(-3) !== suf || !specOf(t)) { problems.push(t + ': not a voice of ' + type + ', ignored'); continue; }
        var r = validateParams(t, vs[t]);
        voices[t] = r.params;
        r.problems.forEach(function (p) { problems.push(t + '.' + p); });
      }
      return { voices: voices, problems: problems };
    }
    var v = validateParams(type, body.params);
    return { params: v.params, problems: v.problems };
  }
  // every spec row: the preset's value, else the spec value (level stays as the mix has it: left out)
  function fullParams(type, params) {
    var spec = specOf(type), out = {}, k;
    if (!spec) return clone(params || {});
    for (k in spec) if (has(spec, k)) {
      if (has(params, k)) out[k] = params[k];
      else if (k !== 'level') out[k] = spec[k].value;
    }
    return out;
  }

  // ---- patterns
  function validateCell(c, problems, where) {
    if (c == null) return null;
    if (!isObj(c)) { problems.push(where + ': not a cell'); return null; }
    var o = {}, k, n;
    for (k in c) if (has(c, k)) {
      var v = c[k];
      if (v == null) continue;
      if (!has(CELL_KEYS, k)) { problems.push(where + '.' + k + ': unknown, ignored'); continue; }
      if (k === 'acc' || k === 'slide') { o[k] = !!v; continue; }
      if (k === 'cond') { if (typeof v === 'string' && v.length < 16) o.cond = v; else problems.push(where + '.cond ignored'); continue; }
      if (k === 'locks') { if (isObj(v)) { var lk = {}, any = false; for (var q in v) if (has(v, q) && isNum(v[q])) { lk[q] = v[q]; any = true; } if (any) o.locks = lk; } continue; }
      if (k === 'notes') {
        if (!isArr(v)) { problems.push(where + '.notes ignored'); continue; }
        var ns = v.filter(isNum).map(function (x) { return clamp(Math.round(x), 0, 127); }).slice(0, 8);
        if (ns.length) o.notes = ns;
        continue;
      }
      n = Number(v);
      if (typeof v === 'boolean' || !isFinite(n)) { problems.push(where + '.' + k + ': not a number'); continue; }
      if (k === 'vel' || k === 'prob') o[k] = clamp(n, 0, 1);
      else if (k === 'len') o.len = clamp(n, 0.05, 64);
      else if (k === 'nudge') o.nudge = clamp(n, -0.5, 0.5);
      else if (k === 'note') o.note = clamp(Math.round(n), 0, 127);
      else if (k === 'rep') o.rep = clamp(Math.round(n), 1, 8);
    }
    for (k in o) if (has(o, k)) return o;
    return null;
  }
  function validateVariant(v, problems, where) {
    if (!isObj(v) || !isArr(v.cells)) { problems.push(where + ': needs {bars, cells}'); return null; }
    var bars = isNum(v.bars) ? Math.round(v.bars) : Math.ceil(v.cells.length / STEPS);
    if (!(bars >= 1 && bars <= 64)) { problems.push(where + ': bars must be 1 to 64'); return null; }
    if (v.cells.length > bars * STEPS) problems.push(where + ': ' + (v.cells.length - bars * STEPS) + ' cells past the last bar ignored');
    var out = { bars: bars, cells: [] };
    for (var i = 0; i < bars * STEPS; i++) out.cells.push(validateCell(v.cells[i], problems, where + '[' + i + ']'));
    return out;
  }
  function validatePattern(type, p) {
    var problems = [];
    if (!isObj(p)) return { pattern: null, problems: ['a pattern is an object'] };
    if (isMachine(type)) {
      if (!isObj(p.voices)) return { pattern: null, problems: ['a machine pattern needs voices: {type: {bars, cells}}'] };
      var out = { voices: {} }, suf = MACHINES[type], any = false;
      for (var t in p.voices) if (has(p.voices, t)) {
        if (t.slice(-3) !== suf) { problems.push(t + ': not a voice of ' + type + ', ignored'); continue; }
        var v = validateVariant(p.voices[t], problems, t);
        if (v) { out.voices[t] = v; any = true; }
      }
      if (!any) return { pattern: null, problems: problems.concat(['no usable voice']) };
      if (p.bpm != null) { if (isNum(p.bpm)) out.bpm = clamp(p.bpm, 40, 300); else problems.push('bpm ignored'); }
      if (p.swing != null) { if (isNum(p.swing)) out.swing = clamp(p.swing, 0, 1); else problems.push('swing ignored'); }
      return { pattern: out, problems: problems };
    }
    var sv = validateVariant(p, problems, 'pattern');
    return { pattern: sv, problems: problems };
  }

  // ------------------------------------------------------------------ factory patches (original; values within each spec)
  // instrument patches: [slug name, name, params]
  var F = {};
  F.tb303 = [
    ['Round bass', { wave: 'saw', cutoff: 600, resonance: 0.35, envMod: 0.3, decay: 300, accent: 0.5, slideTime: 60, level: 0.9 }],
    ['Rubber bass', { wave: 'saw', cutoff: 480, resonance: 0.7, envMod: 0.55, decay: 450, accent: 0.7, slideTime: 70, level: 0.9 }],
    ['Squelch lead', { wave: 'saw', cutoff: 1100, resonance: 0.88, envMod: 0.75, decay: 600, accent: 0.85, slideTime: 60, level: 0.75 }],
    ['Hollow square', { wave: 'square', cutoff: 800, resonance: 0.5, envMod: 0.4, decay: 350, accent: 0.5, slideTime: 60, level: 0.85 }],
    ['Short pluck', { wave: 'saw', cutoff: 700, resonance: 0.6, envMod: 0.85, decay: 200, accent: 0.6, slideTime: 40, level: 0.85 }],
    ['Open sweep', { wave: 'saw', cutoff: 1800, resonance: 0.65, envMod: 0.25, decay: 1500, accent: 0.4, slideTime: 90, level: 0.7 }],
    ['Dark square sub', { wave: 'square', cutoff: 350, resonance: 0.2, envMod: 0.15, decay: 250, accent: 0.3, slideTime: 60, level: 1 }],
    ['Screaming acid', { wave: 'saw', cutoff: 1400, resonance: 0.95, envMod: 0.9, decay: 900, accent: 1, slideTime: 80, level: 0.6 }]
  ];
  F.modeld = [
    ['Fat saw bass', { osc1Range: '16', osc1Wave: 'saw', osc2Range: '16', osc2Wave: 'saw', osc2Detune: 0.08, osc3Range: '32', osc3Wave: 'square', osc3Detune: -0.05,
      mixOsc1: 8, mixOsc2: 7, mixOsc3: 5, cutoff: -1, emphasis: 3, contour: 5, fAttack: 0, fDecay: 3.5, fSustain: 2, attack: 0, decay: 4, sustain: 8, level: 0.8 }],
    ['Plucked square bass', { osc1Range: '16', osc1Wave: 'square', osc2Range: '16', osc2Wave: 'narrow', osc2Detune: 0.05, mixOsc1: 8, mixOsc2: 6, mixOsc3: 0,
      cutoff: -2, emphasis: 4, contour: 6, fAttack: 0, fDecay: 2.5, fSustain: 0, attack: 0, decay: 3.5, sustain: 0, level: 0.9 }],
    ['Hollow square lead', { osc1Range: '8', osc1Wave: 'square', osc2Range: '4', osc2Wave: 'square', osc2Detune: 0.1, mixOsc1: 8, mixOsc2: 5, mixOsc3: 0,
      cutoff: 1, emphasis: 2, contour: 3, fDecay: 4, fSustain: 5, attack: 0.3, decay: 5, sustain: 9, glide: 2.5, glideOn: 1, level: 0.7 }],
    ['Brassy saws', { osc1Range: '8', osc1Wave: 'saw', osc2Range: '8', osc2Wave: 'saw', osc2Detune: 0.15, osc3Range: '16', osc3Wave: 'saw', osc3Detune: -0.1,
      mixOsc1: 7, mixOsc2: 7, mixOsc3: 4, cutoff: -0.5, emphasis: 2, contour: 6, fAttack: 2.5, fDecay: 5, fSustain: 4, attack: 1, decay: 5, sustain: 9, level: 0.7 }],
    ['Whistle lead', { osc1Range: '4', osc1Wave: 'tri', mixOsc1: 8, mixOsc2: 0, mixOsc3: 0, cutoff: 2, emphasis: 7, contour: 1, keyTrack1: 1, keyTrack2: 1,
      fDecay: 4, fSustain: 6, attack: 0.5, decay: 5, sustain: 9, glide: 3, glideOn: 1, level: 1.1 }],
    ['Noise snap', { osc1Range: '16', osc1Wave: 'saw', mixOsc1: 6, mixOsc2: 0, mixOsc3: 0, mixNoise: 6, noiseType: 'white', cutoff: -2, emphasis: 5, contour: 8,
      fAttack: 0, fDecay: 1.5, fSustain: 0, attack: 0, decay: 2, sustain: 0, level: 0.9 }],
    ['Slow filter pad', { osc1Range: '8', osc1Wave: 'saw', osc2Range: '8', osc2Wave: 'saw', osc2Detune: 0.12, osc3Range: '8', osc3Wave: 'saw', osc3Detune: -0.14,
      mixOsc1: 6, mixOsc2: 6, mixOsc3: 6, cutoff: -1, emphasis: 3, contour: 4, fAttack: 6, fDecay: 6, fSustain: 5, attack: 5, decay: 6, sustain: 9, level: 0.6 }],
    ['Wobble bass', { osc1Range: '16', osc1Wave: 'saw', osc2Range: '16', osc2Wave: 'square', osc2Detune: 0.04, mixOsc1: 8, mixOsc2: 6, mixOsc3: 0,
      osc3Keys: 0, osc3Range: 'lo', osc3Wave: 'tri', osc3Detune: 2, modMix: 0, modAmount: 0.5, filterMod: 1, oscMod: 0,
      cutoff: -1.5, emphasis: 5, contour: 2, fDecay: 4, fSustain: 6, attack: 0, decay: 5, sustain: 9, level: 0.8 }]
  ];
  F.juno = [
    ['Slow pad', { saw: true, pulse: false, sub: 0.2, noise: 0, cutoff: 0.5, resonance: 0.15, envAmt: 0.2, vcfKey: 0.4, attack: 0.62, decay: 0.6, sustain: 0.8,
      release: 0.6, chorus: 2, lfoRate: 0.3, dcoLfo: 0.02, vcaMode: 'env', voiceMode: 'poly', range: 8, level: 0.7 }],
    ['Warm strings', { saw: true, pulse: true, pwm: 0.4, pwmMode: 'lfo', lfoRate: 0.4, sub: 0, cutoff: 0.58, resonance: 0.1, envAmt: 0.15, attack: 0.45, decay: 0.5,
      sustain: 0.85, release: 0.5, chorus: 1, vcaMode: 'env', voiceMode: 'poly', range: 8, level: 0.7 }],
    ['Glass keys', { saw: false, pulse: true, pwm: 0.2, pwmMode: 'manual', sub: 0, cutoff: 0.7, resonance: 0.3, envAmt: 0.3, vcfKey: 0.7, attack: 0, decay: 0.45,
      sustain: 0.3, release: 0.35, chorus: 1, vcaMode: 'env', voiceMode: 'poly', range: 8, level: 0.8 }],
    ['Unison bass', { voiceMode: 'unison', range: 16, saw: true, pulse: false, sub: 0.6, cutoff: 0.42, resonance: 0.25, envAmt: 0.45, attack: 0, decay: 0.35,
      sustain: 0.4, release: 0.15, chorus: 0, vcaMode: 'env', level: 0.9 }],
    ['Pulse brass', { saw: false, pulse: true, pwm: 0.7, pwmMode: 'env', sub: 0.1, cutoff: 0.45, resonance: 0.1, envAmt: 0.5, attack: 0.3, decay: 0.5, sustain: 0.7,
      release: 0.3, chorus: 1, vcaMode: 'env', voiceMode: 'poly', range: 8, level: 0.75 }],
    ['Chord stab', { saw: true, pulse: false, sub: 0, cutoff: 0.5, resonance: 0.2, envAmt: 0.6, attack: 0, decay: 0.38, sustain: 0, release: 0.3, chorus: 2, hpf: 2,
      vcaMode: 'env', voiceMode: 'poly', range: 8, level: 0.8 }],
    ['Noise wash', { saw: true, pulse: false, noise: 0.5, sub: 0, cutoff: 0.55, resonance: 0.5, vcfLfo: 0.3, lfoRate: 0.2, envAmt: 0, attack: 0.7, decay: 0.6,
      sustain: 0.9, release: 0.7, chorus: 2, vcaMode: 'env', voiceMode: 'poly', range: 8, level: 0.6 }],
    ['Square organ', { saw: false, pulse: true, pwm: 0, pwmMode: 'manual', sub: 0.5, cutoff: 0.65, resonance: 0, envAmt: 0, vcaMode: 'gate', chorus: 1,
      voiceMode: 'poly', range: 8, level: 0.6 }]
  ];
  // drum voices: kicks, snares, hats, toms (3 to 5 each)
  F.bd808 = [
    ['Short punch', { decay: 0.18, tone: 1800, click: 0.5, tune: 58, drive: 0.2 }],
    ['Long boom', { decay: 0.75, tone: 900, click: 0.15, tune: 50, droop: 0.25, drive: 0.15 }],
    ['Deep sub', { decay: 0.55, tune: 46, tone: 600, click: 0.05, shift: 2.2, drive: 0.1 }],
    ['Hard click', { decay: 0.28, tune: 62, tone: 3200, click: 0.9, drive: 0.35 }]
  ];
  F.bd909 = [
    ['Tight thump', { decay: 0.03, hold: 0.04, attack: 2, start: 300, end: 55, tune: 0.008 }],
    ['Long tail', { decay: 0.2, hold: 0.08, attack: 0, end: 48, tune: 0.012 }],
    ['Soft round', { attack: -8, clickLp: 1500, decay: 0.06, start: 220, end: 50 }],
    ['Driven', { drive: 0.7, attack: 4, decay: 0.08, start: 340, end: 58 }]
  ];
  F.sd808 = [
    ['Crisp', { snappy: 0.8, tone: 0.7, noiseDecay: 0.15, decay: 0.05 }],
    ['Fat body', { snappy: 0.3, tone: 0.3, tune: 180, decay: 0.12, noiseDecay: 0.1 }],
    ['Tight and high', { tune: 320, decay: 0.035, snappy: 0.6, noiseDecay: 0.05, tone: 0.8 }],
    ['Long wash', { noiseDecay: 0.45, snappy: 0.9, tone: 0.5, decay: 0.08 }]
  ];
  F.sd909 = [
    ['Bright crack', { snappy: 4, tone: 0.15, tune: 0.2, hpf: 3000 }],
    ['Heavy', { snappy: -4, bodyDecay: 0.2, tune: -0.2, tone: 0.25 }],
    ['Short tick', { snappy: 0, tone: 0.1, bodyDecay: 0.05, tune: 0.35 }],
    ['Noisy long', { snappy: 6, tone: 0.34, hpf: 1500, bodyDecay: 0.1 }]
  ];
  F.ch808 = [['Tight', { decay: 0.035, hp: 12000 }], ['Bright', { tune: 1.2, hp: 9000, decay: 0.06 }], ['Dull', { tune: 0.85, hp: 6000, decay: 0.05, spread: 0.3 }]];
  F.oh808 = [['Short open', { decay: 0.15 }], ['Long open', { decay: 0.55 }], ['Dark open', { hp: 5500, decay: 0.35, tune: 0.9 }]];
  F.ch909 = [['Tight', { decay: 0.008, hold: 0.004 }], ['Loose', { decay: 0.03, hold: 0.012 }], ['Clean', { crush: 0, decay: 0.015 }]];
  F.oh909 = [['Short', { decay: 0.04, hold: 0.008 }], ['Long', { decay: 0.14, hold: 0.03 }], ['Clean long', { crush: 0, decay: 0.12 }]];
  // 808 toms and congas: tune %, decay within each voice's own range
  function toms808(short, long, up) {
    return [['Short', { tune: 50, decay: short, noise: 0.5 }], ['Long and low', { tune: 25, decay: long, sweep: 0.4 }], ['Pitched up', { tune: 80, decay: up, sweep: 0.6 }]];
  }
  F.lt808 = toms808(0.12, 0.6, 0.25); F.mt808 = toms808(0.08, 0.4, 0.2); F.ht808 = toms808(0.06, 0.3, 0.15);
  F.lc808 = toms808(0.1, 0.55, 0.25); F.mc808 = toms808(0.06, 0.3, 0.15); F.hc808 = toms808(0.05, 0.25, 0.12);
  var TOMS909 = [['Short', { decay: 0.06, hold: 0.02 }], ['Deep and long', { tune: -0.3, decay: 0.3, depth: 1.5 }], ['Zap', { depth: 2.8, pitchDecay: 0.03, decay: 0.12 }]];
  F.lt909 = TOMS909; F.mt909 = TOMS909; F.ht909 = TOMS909;
  // kits: {voiceType: params}; a voice left out keeps its values, an empty object is the voice's defaults
  F.hvt808 = [
    ['Electro boom', { bd808: { decay: 0.7, tone: 1000, click: 0.25, tune: 52 }, sd808: { snappy: 0.75, tone: 0.65 }, ch808: { decay: 0.04 }, oh808: { decay: 0.3 }, cp808: { tail: 0.6 } }],
    ['Tight and dry', { bd808: { decay: 0.2, click: 0.5 }, sd808: { decay: 0.04, noiseDecay: 0.08 }, ch808: { decay: 0.03 }, oh808: { decay: 0.15 }, cy808: { decay: 0.5 },
      lt808: { decay: 0.12 }, mt808: { decay: 0.08 }, ht808: { decay: 0.06 } }],
    ['Deep and long', { bd808: { decay: 0.8, tune: 47, tone: 700 }, sd808: { noiseDecay: 0.3 }, lt808: { decay: 0.6, tune: 30 }, oh808: { decay: 0.5 }, cy808: { decay: 1.1 } }],
    ['Default kit', { bd808: {}, sd808: {}, cp808: {}, ch808: {}, oh808: {}, cy808: {}, cb808: {}, lt808: {}, mt808: {}, ht808: {}, lc808: {}, mc808: {}, hc808: {}, rs808: {}, cl808: {}, ma808: {} }]
  ];
  F.hvt909 = [
    ['Techno punch', { bd909: { decay: 0.06, attack: 3, drive: 0.4 }, sd909: { snappy: 2 }, ch909: { decay: 0.01 }, oh909: { decay: 0.08 }, cp909: { tail: 0.5 } }],
    ['House soft', { bd909: { decay: 0.1, attack: -4, clickLp: 2000 }, cp909: { decay: 0.3, tail: 0.7 }, oh909: { decay: 0.1 }, ch909: { decay: 0.02 } }],
    ['Hard and long', { bd909: { decay: 0.25, hold: 0.08, drive: 0.6 }, sd909: { bodyDecay: 0.2, snappy: 4 }, oh909: { decay: 0.15 }, rd909: { tune: 0.1 } }],
    ['Default kit', { bd909: {}, sd909: {}, lt909: {}, mt909: {}, ht909: {}, rs909: {}, cp909: {}, ch909: {}, oh909: {}, cr909: {}, rd909: {} }]
  ];

  // ------------------------------------------------------------------ factory patterns (original)
  // Note lines: 'A1' a note (octave numbers as SongDoc: C4 = 60), '!' accent, '~' slide into the next, ':3' ratchet,
  // 'C3+E3+G3' a chord (cell.notes, cell.note = the lowest), '-' tie (lengthens the previous note), '.' rest, '|' next bar.
  var NAMES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function noteNum(t) { var m = /^([A-G]#?)(-?\d)$/.exec(t); return m ? (parseInt(m[2], 10) + 1) * 12 + NAMES[m[1]] : null; }
  function noteLine(src) {
    var bars = String(src).split('|'), cells = [], last = null;
    bars.forEach(function (b) {
      var tk = b.trim().split(/\s+/).filter(Boolean);
      for (var i = 0; i < STEPS; i++) {
        var t = tk[i] || '.';
        if (t === '-') { if (last) last.len += 1; cells.push(null); continue; }
        last = null;
        if (t === '.') { cells.push(null); continue; }
        var m = /^([A-G#0-9+\-]+?)((?:[!~]|:\d)*)$/.exec(t);
        var ns = m ? m[1].split('+').map(noteNum) : [null];
        if (ns.some(function (n) { return n == null; })) { cells.push(null); continue; }
        var c = { note: Math.min.apply(null, ns), vel: 0.85, len: 1 };
        if (ns.length > 1) c.notes = ns;
        if (m[2].indexOf('!') >= 0) c.acc = true;
        if (m[2].indexOf('~') >= 0) c.slide = true;
        var r = /:(\d)/.exec(m[2]); if (r && +r[1] > 1) c.rep = +r[1];
        cells.push(c); last = c;
      }
    });
    return { bars: bars.length, cells: cells };
  }
  // drum lines: 'x' hit 0.85, 'X' accent (vel 1, acc), 'o' soft 0.5, '.' rest, '|' next bar
  function drumLine(src) {
    var bars = String(src).split('|'), cells = [];
    bars.forEach(function (b) {
      var s = b.replace(/\s+/g, '');
      for (var i = 0; i < STEPS; i++) {
        var ch = s.charAt(i);
        cells.push(ch === 'x' ? { vel: 0.85 } : ch === 'X' ? { vel: 1, acc: true } : ch === 'o' ? { vel: 0.5 } : null);
      }
    });
    return { bars: bars.length, cells: cells };
  }
  var FP = {};
  // the six HVT-303 lines written for app/solo/solo.js (kept as the tb303 factory patterns)
  FP.tb303 = [
    ['Pump', 'A1 . A1 A2! . A1 G1~ A1 A1 . C2 A1 . A2! E2~ D2'],
    ['Squelch', 'A1~ A1 A1! . C2~ D2 . A1 A1 A2! G2~ E2 . A1 C2! .'],
    ['Climb', 'E1 E1 E2! E1 G1 E1 A1~ B1 E1 . E2! D2~ B1 G1 A1! .'],
    ['Hop', 'C2 C3! C2 . C2~ C3 . A#1 C2 C3! . G2~ F2 D#2 C2 .'],
    ['Space', 'A1! . . A1 . . D2~ C2 . A1! . . G1~ A1 . .'],
    ['Run', 'D2 D2 F2 D2! A2~ D2 C3! D2 D2 F2 D2 A#1~ C2 D2! F2 E2~']
  ];
  FP.modeld = [
    ['Octave pump', 'C2 C3 C2 C3! C2 C3 C2~ D#2 C2 C3 C2 C3! G1 A#1 C2~ C2'],
    ['Long glide', 'C2 - - - G2~ - F2~ - D#2 - - . C2~ D#2 G1 .'],
    ['Ratchet run', 'F1 . F1:2 . F2! . F1 D#2 F1 . F1:3 . G#1~ A#1 C2 .'],
    ['Minor lead', 'A3 - C4 - E4! - D4 C4 A3 - G3 - E3~ G3 A3 -'],
    ['Bounce', 'D2 . D2 D3! . D2 . C3~ D2 . F2 . D2 A2! . G2'],
    ['Slow walk', 'E1 - - - E1 - G1 - A1 - - - B1~ C2 - - | E1 - - - E1 - D2 - B1 - - - G1~ A1 - -']
  ];
  FP.juno = [
    ['Two-chord pad', 'A3+C4+E4+G4 - - - - - - - - - - - - - - - | F3+A3+C4+E4 - - - - - - - - - - - - - - -'],
    ['Offbeat stabs', '. . C4+D#4+G4 . . . C4+D#4+G4 . . . C4+D#4+G4 . . . C4+D#4+G4 .'],
    ['Chord push', 'D4+F4+A4+C5 . . D4+F4+A4+C5 . . D4+F4+A4+C5 - . . . . . . . . .'],
    ['Up and down', 'C3 E3 G3 B3 C4 B3 G3 E3 A2 C3 E3 G3 A3 G3 E3 C3'],
    ['Four chords', 'A3+C4+E4+G4 - - - - - - - - - - - - - - - | F3+A3+C4+E4 - - - - - - - - - - - - - - - | C4+E4+G4+B4 - - - - - - - - - - - - - - - | G3+B3+D4+E4 - - - - - - - - - - - - - - -'],
    ['Bass and chord', 'C2 - . C4+E4+G4 . . C2 . . . C4+E4+G4 - C2 . A#1 .']
  ];
  // machine patterns: [name, {voiceType: drum line}, bpm, swing]
  FP.hvt808 = [
    ['Electro break', { bd808: 'X.....x...x..x..', sd808: '....X.......X...', ch808: 'x.x.x.x.x.x.x.x.', cp808: '............x...' }, 120, 0],
    ['Electro roll', { bd808: 'X..x..x...X.....|X..x..x...x..x..', sd808: '....X..x....X...|....X..x....X.xx', ch808: 'xoxoxoxoxoxoxoxo|xoxoxoxoxoxo....',
      ht808: '................|............x...', mt808: '................|.............x..', lt808: '................|..............x.' }, 124, 0],
    ['Electro sparse', { bd808: 'X.......x.x.....', sd808: '....X.......X..x', rs808: '..x....x..x.....', ch808: '..x...x...x...x.', cb808: '.......x......x.' }, 118, 0.1],
    ['House on the 808', { bd808: 'X...x...X...x...', cp808: '....x.......x...', ch808: 'x...x...x...x...', oh808: '..x...x...x...x.', cl808: '...x..x....x..x.' }, 122, 0.15],
    ['Techno on the 808', { bd808: 'X...X...X...X...', ch808: 'xoxXxoxXxoxXxoxX', cp808: '....x.......x...', lt808: '..........x..x..', cy808: 'x...............' }, 130, 0],
    ['Conga groove', { bd808: 'X.....x.X.......', lc808: '..x..x.....x.x..', mc808: 'x.....x...x....x', hc808: '...x.....x....x.', ch808: '..x...x...x...x.', ma808: 'x.x.x.x.x.x.x.x.' }, 116, 0.2]
  ];
  FP.hvt909 = [
    ['Four to the floor', { bd909: 'X...x...X...x...', ch909: 'x...x...x...x...', oh909: '..x...x...x...x.', cp909: '....x.......x...' }, 124, 0],
    ['Pounding techno', { bd909: 'X...X...X...X...', ch909: 'x.xx.xXx.xx.xXxx', rd909: '..x...x...x...x.', cp909: '....x.......x...', sd909: '............x..x' }, 132, 0],
    ['Rolling techno', { bd909: 'X...X...X...X...|X...X...X...X...', ch909: '.xx..xx..xx..xx.|.xx..xx..xx.....', oh909: '..x...x...x...x.|..x...x...x.....',
      sd909: '................|..........x.xxXX', lt909: '................|............x...', mt909: '................|.............x..', ht909: '................|..............x.' }, 134, 0],
    ['Jack house', { bd909: 'X...X...X...X...', cp909: '....X.......X...', oh909: '..x...x...x...x.', ch909: 'x..x...x...x...x', rs909: '......x.......x.' }, 123, 0.25],
    ['Broken shuffle', { bd909: 'X..x....X.x.....', sd909: '....X.......X...', ch909: 'x.x.x.x.x.x.x.x.', oh909: '...............x' }, 120, 0.3],
    ['Tom groove', { bd909: 'X...X...X...X...', lt909: '..x.......x.....', mt909: '.....x.......x..', ht909: '.......x.......x', ch909: 'x.x.x.x.x.x.x.x.', cr909: 'X...............' }, 128, 0]
  ];

  // ------------------------------------------------------------------ the bank (factory + user)
  var factory = { presets: {}, patterns: {} };     // type -> [entry]
  var user = { presets: {}, patterns: {} };        // type -> [entry]
  var loadProblems = [];
  function buildFactory() {
    var t, list, problems = [];
    for (t in F) if (has(F, t)) {
      list = [];
      F[t].forEach(function (row) {
        var id = t + '/' + slug(row[0]), body = isMachine(t) ? { voices: row[1] } : { params: row[1] };
        var v = specOf(t) || isMachine(t) ? validateBody(t, body) : { params: clone(row[1]), problems: [] };
        v.problems.forEach(function (p) { problems.push(id + ': ' + p); });
        var e = { id: id, name: row[0], type: t, factory: true };
        if (isMachine(t)) e.voices = v.voices; else e.params = v.params;
        list.push(e);
      });
      factory.presets[t] = list;
    }
    for (t in FP) if (has(FP, t)) {
      list = [];
      FP[t].forEach(function (row) {
        var id = t + '/' + slug(row[0]), p;
        if (isMachine(t)) {
          p = { voices: {}, bpm: row[2], swing: row[3] };
          for (var vt in row[1]) if (has(row[1], vt)) p.voices[vt] = drumLine(row[1][vt]);
        } else p = noteLine(row[1]);
        var v = validatePattern(t, p);
        v.problems.forEach(function (q) { problems.push(id + ': ' + q); });
        list.push({ id: id, name: row[0], type: t, factory: true, pattern: v.pattern });
      });
      factory.patterns[t] = list;
    }
    return problems;
  }
  var factoryProblems = [];
  var factoryBuilt = false;
  function ensureFactory() { if (!factoryBuilt) { factoryBuilt = true; factoryProblems = buildFactory(); if (factoryProblems.length) warn('factory: ' + factoryProblems.join('; ')); } }

  // ------------------------------------------------------------------ storage adapters
  function memoryAdapter() {
    var m = {};
    return { kind: 'memory', get: function (k) { return has(m, k) ? m[k] : null; }, set: function (k, v) { m[k] = String(v); }, remove: function (k) { delete m[k]; } };
  }
  // localStorage, each call in try/catch; the first failure switches to memory for good (the data so far is kept)
  function localAdapter() {
    var mem = memoryAdapter(), broken = false;
    function ls() { try { return root.localStorage || null; } catch (e) { return null; } }
    if (!ls()) broken = true;
    return {
      kind: 'local',
      get: function (k) {
        if (!broken) { try { return ls().getItem(k); } catch (e) { broken = true; } }
        return mem.get(k);
      },
      set: function (k, v) {
        mem.set(k, v);
        if (!broken) { try { ls().setItem(k, String(v)); } catch (e) { broken = true; warn('localStorage refused the write: kept in memory for this session'); } }
      },
      remove: function (k) { mem.remove(k); if (!broken) { try { ls().removeItem(k); } catch (e) { broken = true; } } },
      broken: function () { return broken; }
    };
  }
  // Electron: one JSON file in the app data folder ({key: text}); reads come from a cache filled at start
  function shellAdapter(shell) {
    var cache = {}, loaded = false, writing = null, again = false;
    function flush() {
      if (writing) { again = true; return; }
      var text = JSON.stringify({ app: 'recut', format: 'presets-store', version: VERSION, data: cache });
      writing = Promise.resolve().then(function () { return shell.writeAppData(FILE, text); })
        .catch(function (e) { warn('could not write ' + FILE + ': ' + (e && e.message ? e.message : e)); })
        .then(function () { writing = null; if (again) { again = false; flush(); } });
    }
    var a = {
      kind: 'shell',
      get: function (k) { return has(cache, k) ? cache[k] : null; },
      set: function (k, v) { cache[k] = String(v); if (loaded) flush(); },
      remove: function (k) { delete cache[k]; if (loaded) flush(); },
      load: function () {
        return Promise.resolve().then(function () { return shell.readAppData(FILE); }).then(function (text) {
          if (text) {
            try {
              var o = JSON.parse(text);
              if (o && isObj(o.data)) for (var k in o.data) if (has(o.data, k) && typeof o.data[k] === 'string') cache[k] = o.data[k];
            } catch (e) { warn(FILE + ' is not JSON; starting empty (the file is kept until the next save)'); }
          } else {
            // first run under the shell: bring over what the web build kept in localStorage
            var old = safe(function () { return root.localStorage.getItem(KEY); }, null);
            if (old) cache[KEY] = old;
          }
          loaded = true;
          if (!text && has(cache, KEY)) flush();
        }).catch(function (e) { loaded = true; warn('could not read ' + FILE + ': ' + (e && e.message ? e.message : e)); });
      }
    };
    return a;
  }
  var store = null, readyP = null;
  function defaultAdapter() {
    var sh = root.RecutShell;
    if (sh && isFn(sh.readAppData) && isFn(sh.writeAppData)) return shellAdapter(sh);
    return localAdapter();
  }

  // ---- reading and writing the user bank
  function readUser() {
    user = { presets: {}, patterns: {} };
    loadProblems = [];
    var text = safe(function () { return store.get(KEY); }, null);
    if (!text) return;
    var o;
    try { o = JSON.parse(text); } catch (e) { loadProblems.push('stored bank is not JSON: ignored'); warn(loadProblems[0]); return; }
    if (!isObj(o) || o.version > VERSION) { loadProblems.push('stored bank has an unknown version: ignored'); warn(loadProblems[0]); return; }
    ['presets', 'patterns'].forEach(function (what) {
      var m = isObj(o[what]) ? o[what] : {};
      for (var t in m) if (has(m, t) && isArr(m[t])) {
        m[t].forEach(function (e) {
          if (!isObj(e) || typeof e.id !== 'string' || typeof e.name !== 'string') { loadProblems.push(what + '.' + t + ': an entry without id or name was dropped'); return; }
          var entry = { id: e.id, name: cleanName(e.name), type: t, factory: false };
          if (what === 'presets') {
            var v = validateBody(t, isMachine(t) ? { voices: e.voices } : { params: e.params });
            v.problems.forEach(function (p) { loadProblems.push(e.id + ': ' + p); });
            if (isMachine(t)) entry.voices = v.voices; else entry.params = v.params;
          } else {
            var pv = validatePattern(t, e.pattern);
            pv.problems.forEach(function (p) { loadProblems.push(e.id + ': ' + p); });
            if (!pv.pattern) return;
            entry.pattern = pv.pattern;
          }
          (user[what][t] = user[what][t] || []).push(entry);
        });
      }
    });
    if (loadProblems.length) warn('stored bank: ' + loadProblems.join('; '));
  }
  function writeUser() {
    var o = { app: 'recut', version: VERSION, presets: {}, patterns: {} };
    ['presets', 'patterns'].forEach(function (what) {
      for (var t in user[what]) if (has(user[what], t) && user[what][t].length) {
        o[what][t] = user[what][t].map(function (e) {
          var r = { id: e.id, name: e.name };
          if (what === 'patterns') r.pattern = e.pattern; else if (e.voices) r.voices = e.voices; else r.params = e.params;
          return r;
        });
      }
    });
    try { store.set(KEY, JSON.stringify(o)); return true; } catch (e) { warn('could not store the bank: ' + (e && e.message ? e.message : e)); return false; }
  }
  function useStore(adapter) {
    store = adapter;
    readUser();
    if (isFn(adapter.load)) {
      readyP = adapter.load().then(function () { readUser(); emit({ what: 'storage', action: 'load' }); });
    } else readyP = Promise.resolve();
    return readyP;
  }

  // ------------------------------------------------------------------ events
  var handlers = { change: [] };
  function emit(ev) {
    var l = handlers.change.slice();
    for (var i = 0; i < l.length; i++) { try { l[i](ev); } catch (e) { warn('a change handler threw: ' + (e && e.message ? e.message : e)); } }
  }
  if (root.addEventListener) {
    try { root.addEventListener('storage', function (e) { if (e && e.key === KEY && store && store.kind === 'local') { readUser(); emit({ what: 'storage', action: 'external' }); } }); } catch (e) { /* ignore */ }
  }

  // ------------------------------------------------------------------ bank operations (shared by presets and patterns)
  function bank(what) {
    function all(type) { ensureFactory(); return (factory[what][type] || []).concat(user[what][type] || []); }
    function find(type, id) { var l = all(type); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
    function userIndex(type, id) { var l = user[what][type] || []; for (var i = 0; i < l.length; i++) if (l[i].id === id) return i; return -1; }
    return {
      all: all, find: find,
      list: function (type) {
        return all(type).map(function (e) {
          var r = { id: e.id, name: e.name, factory: !!e.factory, kind: what === 'presets' ? 'patch' : 'pattern' };
          if (what === 'presets' && isMachine(type)) r.machine = true;
          return r;
        });
      },
      put: function (type, entry, id) {
        ensureFactory();
        if (id != null) {
          id = String(id);
          if ((factory[what][type] || []).some(function (e) { return e.id === id; })) return null;     // factory: read-only
          if (typeOfId(id) !== type) return null;
        } else id = newId(type);
        entry.id = id; entry.type = type; entry.factory = false;
        var l = user[what][type] = user[what][type] || [], i = userIndex(type, id);
        if (i >= 0) l[i] = entry; else l.push(entry);
        writeUser();
        emit({ what: what === 'presets' ? 'preset' : 'pattern', action: i >= 0 ? 'replace' : 'save', type: type, id: id });
        return id;
      },
      rename: function (type, id, name) {
        var i = userIndex(type, id); if (i < 0) return false;
        user[what][type][i].name = cleanName(name);
        writeUser();
        emit({ what: what === 'presets' ? 'preset' : 'pattern', action: 'rename', type: type, id: id });
        return true;
      },
      remove: function (type, id) {
        var i = userIndex(type, id); if (i < 0) return false;
        user[what][type].splice(i, 1);
        writeUser();
        emit({ what: what === 'presets' ? 'preset' : 'pattern', action: 'remove', type: type, id: id });
        return true;
      }
    };
  }
  var PB = bank('presets'), TB = bank('patterns');

  // ------------------------------------------------------------------ host helpers (public Host calls only)
  function devOfTrack(host, track) { return safe(function () { return host.device('track:' + track); }, null); }
  function trackType(host, track) { var d = devOfTrack(host, track); if (d) learn(d); return d ? d.type : null; }
  // the tracks of the host whose instrument is this voice type
  function tracksOfType(host, type) {
    var out = [], l = safe(function () { return host.devices(); }, []) || [];
    for (var i = 0; i < l.length; i++) if (l[i].kind === 'instrument' && l[i].type === type) out.push(l[i].track);
    return out;
  }
  function machineTracks(host, machine) {
    var out = {}, l = safe(function () { return host.devices(); }, []) || [], suf = MACHINES[machine];
    for (var i = 0; i < l.length; i++) {
      var d = l[i];
      if (d.kind === 'instrument' && typeof d.type === 'string' && d.type.slice(-3) === suf && /^[a-z]{2}(808|909)$/.test(d.type)) (out[d.type] = out[d.type] || []).push(d.track);
    }
    return out;
  }
  // [[path, value], ...] -> one undo step: host.hold takes the snapshot (released again unless the path was already held)
  function setMany(host, writes) {
    if (!host || !isFn(host.setParam) || !writes.length) return false;
    var p0 = writes[0][0], wasHeld = isFn(host.isHeld) ? !!safe(function () { return host.isHeld(p0); }, false) : false;
    if (isFn(host.hold)) {
      safe(function () { host.hold(p0); });
      if (!wasHeld && isFn(host.release)) safe(function () { host.release(p0); });
    }
    var ok = 0;
    for (var i = 0; i < writes.length; i++) { var w = writes[i]; if (safe(function () { return host.setParam(w[0], w[1]); }, false)) ok++; }
    return ok > 0;
  }
  function patchWrites(track, type, params) {
    var full = fullParams(type, params), out = [];
    for (var k in full) if (has(full, k)) out.push([track + '.' + k, full[k]]);
    return out;
  }
  function capture(host, track) {
    var d = devOfTrack(host, track); if (!d) return {};
    learn(d);
    var spec = specOf(d.type) || d.spec || {}, out = {};
    for (var k in spec) if (has(spec, k)) {
      var v = safe(function () { return host.getParam(track + '.' + k); }, undefined);
      if (v !== undefined && v !== null) out[k] = v;
    }
    return out;
  }
  function near(a, b, row) {
    if (typeof a === 'number' && typeof b === 'number') { var span = row && isNum(row.max) && isNum(row.min) ? row.max - row.min : 1; return Math.abs(a - b) <= Math.max(1e-9, Math.abs(span) * 1e-4); }
    return String(a) === String(b);
  }
  function matches(type, cur, params) {
    var full = fullParams(type, params), spec = specOf(type) || {};
    for (var k in full) if (has(full, k) && has(cur, k) && !near(cur[k], full[k], spec[k])) return false;
    return true;
  }

  // ---- variants (the document through host.editor())
  function canEdit(host) { return !!host && isFn(host.document) && isFn(host.editor) && isFn(host.commit); }
  function curSection(host) {
    var d = safe(function () { return host.document(); }, null);
    if (!d || !isArr(d.sections) || !d.sections.length) return null;
    var p = safe(function () { return host.transport.pos(); }, null), i = p && p.section;
    if (!(typeof i === 'number' && i >= 0 && i < d.sections.length)) {
      i = 0;
      if (p && p.sectionName) for (var k = 0; k < d.sections.length; k++) if (d.sections[k].name === p.sectionName) i = k;
    }
    return d.sections[i];
  }
  function findTrack(host, name) { var d = safe(function () { return host.document(); }, null), t = (d && d.tracks) || []; for (var i = 0; i < t.length; i++) if (t[i].name === name) return t[i]; return null; }
  // the variant letter the current section plays for a track (else A, else the first), and whether the section names it
  function curVariant(host, track) {
    var tr = findTrack(host, track); if (!tr) return null;
    var sec = curSection(host), p = sec && sec.play ? sec.play[track] : null;
    if (p === true) p = 'A';
    if (p) return { letter: p, section: sec ? sec.name : null, named: true, tr: tr };
    var ks = tr.variants ? Object.keys(tr.variants).sort() : [];
    return { letter: ks.indexOf('A') >= 0 || !ks.length ? 'A' : ks[0], section: sec ? sec.name : null, named: false, tr: tr };
  }
  function variantOf(host, track) {
    var cv = curVariant(host, track); if (!cv) return null;
    var v = cv.tr.variants && cv.tr.variants[cv.letter];
    if (!v || !isArr(v.cells)) return { bars: 1, cells: emptyCells(1) };
    var out = { bars: v.bars || Math.max(1, Math.ceil(v.cells.length / STEPS)), cells: [] };
    for (var i = 0; i < out.bars * STEPS; i++) out.cells.push(v.cells[i] ? clone(v.cells[i]) : null);
    return out;
  }
  function emptyCells(bars) { var c = []; for (var i = 0; i < bars * STEPS; i++) c.push(null); return c; }
  // replace a track's current variant inside an editor group (the caller groups and commits)
  function writeVariant(ed, host, track, pat) {
    var cv = curVariant(host, track); if (!cv) return false;
    var letter = cv.letter;
    if (cv.section && !cv.named && isFn(ed.setPlay)) ed.setPlay(cv.section, track, letter);
    if (isFn(ed.setVariantBars) && ed.setVariantBars(track, letter, pat.bars, 'empty')) {
      var t = ed.track(track), v = t && t.variants[letter];      // the snapshot is taken: fill the cells in place
      if (!v) return false;
      for (var i = 0; i < pat.bars * STEPS; i++) v.cells[i] = pat.cells[i] ? clone(pat.cells[i]) : null;
      v.cells.length = pat.bars * STEPS;
      delete v.from;
      return true;
    }
    if (!isFn(ed.setStep)) return false;                              // a plain SongDoc editor: one setStep per cell
    var tv = ed.track(track) && ed.track(track).variants[letter], n = Math.max(pat.bars * STEPS, tv ? tv.cells.length : 0);
    for (var j = 0; j < n; j++) { ed.setStep(track, letter, j, null); if (pat.cells[j]) ed.setStep(track, letter, j, pat.cells[j]); }
    return true;
  }
  function group(ed, fn) { if (isFn(ed.group)) return ed.group(fn); return fn(ed); }

  // ------------------------------------------------------------------ export / import
  function parseText(text, format) {
    if (typeof text !== 'string') throw new Error('Nothing to import: expected the text of a Recut ' + format + '.');
    if (text.length > MAX_TEXT) throw new Error('That text is too long to be a ' + format + ' (more than 1 MB).');
    var o;
    try { o = JSON.parse(text.replace(/^﻿/, '').trim()); } catch (e) { throw new Error('That is not valid JSON, so it is not a Recut ' + format + ' (' + (e && e.message ? e.message : e) + ').'); }
    // 'havantechno' was the app's name until 27 November 2026: text copied from it still imports
    if (!isObj(o) || (o.app !== 'recut' && o.app !== 'havantechno')) throw new Error('That JSON is not from Recut (it has no "app": "recut").');
    if (o.format !== format) {
      if (o.format === 'preset' || o.format === 'pattern') { var err = new Error('That is a ' + o.format + ', not a ' + format + ': import it as a ' + o.format + '.'); err.format = o.format; throw err; }
      throw new Error('Unknown format "' + o.format + '": expected a ' + format + '.');
    }
    if (!isNum(o.version) || o.version < 1) throw new Error('The ' + format + ' has no version number.');
    if (o.version > VERSION) throw new Error('The ' + format + ' was made by a newer version of Recut (format version ' + o.version + ').');
    if (typeof o.type !== 'string' || !o.type) throw new Error('The ' + format + ' does not say which instrument it is for.');
    if (!knownType(o.type)) throw new Error('Unknown instrument type "' + o.type + '".');
    return o;
  }

  // ------------------------------------------------------------------ public API
  var Presets = {
    version: VERSION,
    list: function (type) { return PB.list(String(type)); },
    get: function (type, id) {
      var e = PB.find(String(type), String(id)); if (!e) return null;
      var r = { id: e.id, name: e.name, type: e.type, factory: !!e.factory };
      if (e.voices) { r.voices = clone(e.voices); r.params = clone(e.voices); } else r.params = clone(e.params);
      return r;
    },
    save: function (type, name, params, o) {
      type = String(type);
      if (!knownType(type)) { warn('save: unknown type ' + type); return null; }
      var v = validateBody(type, isMachine(type) ? { voices: params && params.voices ? params.voices : params } : { params: params });
      if (v.problems.length) warn('save ' + type + ': ' + v.problems.join('; '));
      var e = { name: cleanName(name) };
      if (isMachine(type)) e.voices = v.voices; else e.params = v.params;
      return PB.put(type, e, o && o.id != null ? o.id : null);
    },
    rename: function (type, id, name) { return PB.rename(String(type), String(id), name); },
    remove: function (type, id) { return PB.remove(String(type), String(id)); },

    // a track's parameters (every spec row the host reads)
    capture: function (host, track) { return capture(host, track); },
    // a machine kit from the host: {voices: {type: params}} for each machine voice that has a track (the first such track)
    captureKit: function (host, machine) {
      var mt = machineTracks(host, machine), out = { voices: {} };
      for (var t in mt) if (has(mt, t)) out.voices[t] = capture(host, mt[t][0]);
      return out;
    },
    // load a preset onto a track (a kit onto every track of its voices); one undo step; works before audio starts
    apply: function (host, track, id) {
      if (!host) return false;
      var type = typeOfId(id) || trackType(host, track);
      var e = PB.find(type, String(id));
      if (!e) { var tt = trackType(host, track); if (tt && tt !== type) { e = PB.find(tt, String(id)); type = tt; } }
      if (!e) return false;
      var writes = [];
      if (e.voices) {
        var mt = machineTracks(host, type);
        for (var vt in e.voices) if (has(e.voices, vt) && mt[vt]) mt[vt].forEach(function (tr) { writes = writes.concat(patchWrites(tr, vt, e.voices[vt])); });
      } else {
        var ty = trackType(host, track);
        if (ty && ty !== type) { warn('apply: ' + id + ' is for ' + type + ', the track plays ' + ty); return false; }
        writes = patchWrites(track, type, e.params);
      }
      var ok = setMany(host, writes);
      if (ok) { lastApplied[track] = e.id; emit({ what: 'preset', action: 'apply', type: type, id: e.id, track: track }); }
      return ok;
    },
    // set a params object (validated against the track's type) in one undo step
    applyData: function (host, track, params) {
      var type = trackType(host, track); if (!type) return false;
      var v = validateParams(type, params);
      return setMany(host, patchWrites(track, type, v.params));
    },
    // the id of the preset the track's values match (the last one applied first), or null
    current: function (host, track, type) {
      var d = devOfTrack(host, track); if (!d) return null;
      learn(d);
      type = type || d.type;
      var cands = PB.all(type), cur, i;
      if (isMachine(type)) {
        var mt = machineTracks(host, type), caps = {};
        var kitMatch = function (e) {
          var any = false;
          for (var vt in e.voices) if (has(e.voices, vt) && mt[vt]) { any = true; if (!caps[vt]) caps[vt] = capture(host, mt[vt][0]); if (!matches(vt, caps[vt], e.voices[vt])) return false; }
          return any;
        };
        cands.sort(function (a, b) { return (b.id === lastApplied[track]) - (a.id === lastApplied[track]); });
        for (i = 0; i < cands.length; i++) if (kitMatch(cands[i])) return cands[i].id;
        return null;
      }
      cur = capture(host, track);
      if (lastApplied[track]) { var la = PB.find(type, lastApplied[track]); if (la && matches(type, cur, la.params)) return la.id; }
      for (i = 0; i < cands.length; i++) if (matches(type, cur, cands[i].params)) return cands[i].id;
      return null;
    },

    exportText: function (type, id) {
      var e = PB.find(String(type), String(id)); if (!e) return null;
      var o = { app: 'recut', format: 'preset', version: VERSION, type: e.type, name: e.name };
      if (e.voices) o.voices = clone(e.voices); else o.params = clone(e.params);
      return JSON.stringify(o, null, 2);
    },
    importText: function (text) {
      var o = parseText(text, 'preset');
      var v = validateBody(o.type, isMachine(o.type) ? { voices: o.voices || o.params } : { params: o.params });
      var n = 0, k;
      if (isMachine(o.type)) { for (k in v.voices) if (has(v.voices, k)) n++; } else for (k in v.params) if (has(v.params, k)) n++;
      if (!n) throw new Error('The preset has no parameter that ' + o.type + ' knows' + (v.problems.length ? ': ' + v.problems.slice(0, 3).join('; ') : '.'));
      var e = { name: cleanName(o.name) };
      if (isMachine(o.type)) e.voices = v.voices; else e.params = v.params;
      var id = PB.put(o.type, e, null);
      return { type: o.type, id: id, problems: v.problems };
    },

    storage: function (adapter) {
      if (adapter == null) return store;
      if (!isObj(adapter) && !isFn(adapter)) throw new Error('Presets.storage: an adapter is {get, set, remove}');
      if (!isFn(adapter.get) || !isFn(adapter.set) || !isFn(adapter.remove)) throw new Error('Presets.storage: the adapter needs get, set and remove');
      useStore(adapter);
      emit({ what: 'storage', action: 'adapter' });
      return store;
    },
    adapters: { memory: memoryAdapter, local: localAdapter, shell: shellAdapter },
    ready: function () { return readyP || Promise.resolve(); },
    // read the stored bank again (another window may have written it); the file adapter re-reads its file, then emits 'change'
    reload: function () {
      if (store && isFn(store.load)) { readyP = store.load().then(function () { readUser(); emit({ what: 'storage', action: 'load' }); }); return readyP; }
      readUser();
      return Promise.resolve();
    },
    on: function (type, fn) { if (type === 'change' && isFn(fn)) handlers.change.push(fn); return Presets; },
    off: function (type, fn) { if (type === 'change') { var i = handlers.change.indexOf(fn); if (i >= 0) handlers.change.splice(i, 1); } return Presets; },

    validate: function (type, params) { return isMachine(type) ? validateBody(type, { voices: params }) : validateParams(type, params); },
    spec: function (type) { return specOf(type); },
    machineOf: machineOf,
    isMachine: isMachine,
    machineVoices: machineVoices,
    problems: function () { ensureFactory(); return factoryProblems.concat(loadProblems); },
    types: function () { ensureFactory(); var o = {}, t; for (t in factory.presets) o[t] = 1; for (t in factory.patterns) o[t] = 1; for (t in user.presets) o[t] = 1; for (t in user.patterns) o[t] = 1; return Object.keys(o); },
    parseNotes: noteLine,
    parseDrums: drumLine
  };
  var lastApplied = {};

  Presets.patterns = {
    list: function (type) { return TB.list(String(type)); },
    get: function (type, id) {
      var e = TB.find(String(type), String(id)); if (!e) return null;
      return { id: e.id, name: e.name, type: e.type, factory: !!e.factory, pattern: clone(e.pattern) };
    },
    save: function (type, name, pattern, o) {
      type = String(type);
      var v = validatePattern(type, pattern);
      if (!v.pattern) { warn('patterns.save ' + type + ': ' + v.problems.join('; ')); return null; }
      return TB.put(type, { name: cleanName(name), pattern: v.pattern }, o && o.id != null ? o.id : null);
    },
    rename: function (type, id, name) { return TB.rename(String(type), String(id), name); },
    remove: function (type, id) { return TB.remove(String(type), String(id)); },
    validate: function (type, p) { return validatePattern(type, p); },
    // the track's current variant ({bars, cells}); for a drum voice, the machine pattern from every voice track
    capture: function (host, track, type) {
      var ty = type || trackType(host, track); if (!ty) return null;
      if (isMachine(ty) || (machineOf(ty) && !type)) {
        var m = isMachine(ty) ? ty : machineOf(ty), mt = machineTracks(host, m), out = { voices: {} };
        for (var t in mt) if (has(mt, t)) out.voices[t] = variantOf(host, mt[t][0]);
        out.bpm = safe(function () { return host.bpm(); }, undefined);
        out.swing = safe(function () { return host.swing(); }, undefined);
        if (out.bpm === undefined) delete out.bpm;
        if (out.swing === undefined) delete out.swing;
        return out;
      }
      return variantOf(host, track);
    },
    // load a pattern onto the track's current variant (a machine pattern onto each voice track's current variant; voices the
    // pattern leaves out are cleared); one undo step, then commit. o.tempo: a machine pattern also sets bpm and swing.
    apply: function (host, track, id, o) {
      o = o || {};
      if (!canEdit(host)) return false;
      var type = typeOfId(id), e = type ? TB.find(type, String(id)) : null;
      if (!e) return false;
      var ed = safe(function () { return host.editor(); }, null); if (!ed) return false;
      var done = false;
      if (isMachine(type)) {
        var mt = machineTracks(host, type), names = [];
        for (var vt in mt) if (has(mt, vt)) names.push(vt);
        if (!names.length) return false;
        group(ed, function () {
          names.forEach(function (vt2) {
            var pat = e.pattern.voices[vt2] || { bars: 1, cells: emptyCells(1) };
            mt[vt2].forEach(function (tr) { if (writeVariant(ed, host, tr, pat)) done = true; });
          });
        });
        if (done && o.tempo) {
          if (isNum(e.pattern.bpm)) safe(function () { host.setParam('bpm', e.pattern.bpm); });
          if (isNum(e.pattern.swing)) safe(function () { host.setParam('swing', e.pattern.swing); });
        }
      } else {
        var ty = trackType(host, track);
        if (ty && ty !== type && machineOf(ty) !== type) { warn('patterns.apply: ' + id + ' is for ' + type + ', the track plays ' + ty); return false; }
        group(ed, function () { done = writeVariant(ed, host, track, e.pattern); });
      }
      if (done) { safe(function () { host.commit(); }); lastPattern[track] = e.id; emit({ what: 'pattern', action: 'apply', type: type, id: e.id, track: track }); }
      return done;
    },
    // the id of the pattern the track's current variant equals (the machine pattern for a drum voice), or null
    current: function (host, track, type) {
      var ty = type || trackType(host, track); if (!ty) return null;
      var m = isMachine(ty) ? ty : (machineOf(ty) && !type ? machineOf(ty) : null), cands, i;
      var norm = function (p) { return JSON.stringify(validatePattern(m || ty, p).pattern); };
      if (m) {
        var cap = Presets.patterns.capture(host, track, m); if (!cap) return null;
        var mvoices = Object.keys(cap.voices);
        cands = TB.all(m);
        for (i = 0; i < cands.length; i++) {
          var ok = mvoices.length > 0 && mvoices.every(function (vt) {
            var want = cands[i].pattern.voices[vt] || { bars: 1, cells: emptyCells(1) };
            return JSON.stringify(validateVariant(cap.voices[vt], [], vt)) === JSON.stringify(validateVariant(want, [], vt));
          });
          if (ok) return cands[i].id;
        }
        return null;
      }
      var cur = variantOf(host, track); if (!cur) return null;
      var c = norm(cur);
      cands = TB.all(ty);
      if (lastPattern[track]) for (i = 0; i < cands.length; i++) if (cands[i].id === lastPattern[track] && norm(cands[i].pattern) === c) return cands[i].id;
      for (i = 0; i < cands.length; i++) if (norm(cands[i].pattern) === c) return cands[i].id;
      return null;
    },
    exportText: function (type, id) {
      var e = TB.find(String(type), String(id)); if (!e) return null;
      return JSON.stringify({ app: 'recut', format: 'pattern', version: VERSION, type: e.type, name: e.name, pattern: e.pattern });
    },
    importText: function (text) {
      var o = parseText(text, 'pattern');
      var v = validatePattern(o.type, o.pattern);
      if (!v.pattern) throw new Error('The pattern could not be read: ' + v.problems.slice(0, 3).join('; ') + '.');
      var id = TB.put(o.type, { name: cleanName(o.name), pattern: v.pattern }, null);
      return { type: o.type, id: id, problems: v.problems };
    }
  };
  var lastPattern = {};

  // ==================================================================== the Preset menu (windows.js and the solo pages)
  var CSS = [
    '.pm-pop{position:fixed;z-index:2000;box-sizing:border-box;min-width:220px;max-width:min(340px,calc(100vw - 16px));max-height:min(70vh,560px);overflow:auto;',
    ' background:var(--panel-raised,#24242b);color:var(--fg,#e8e8ec);border:1px solid var(--line,#34343c);border-radius:6px;box-shadow:0 12px 32px rgba(0,0,0,.6);',
    ' padding:4px 0;font:12px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
    '.pm-pop[hidden]{display:none}',
    '.pm-h{padding:6px 10px 2px;color:var(--dim,#8a8a96);font-size:10.5px;text-transform:uppercase;letter-spacing:.06em}',
    '.pm-i{display:flex;align-items:center;gap:6px;width:100%;box-sizing:border-box;text-align:left;font:inherit;color:inherit;background:none;border:0;padding:5px 10px 5px 22px;min-height:28px;cursor:pointer;position:relative}',
    '.pm-i:hover,.pm-i:focus{background:var(--fam-wash,#2c2c36);outline:none}',
    '.pm-i:focus-visible{box-shadow:inset 0 0 0 2px var(--fam-ink,#8cf)}',
    '.pm-i[aria-checked=true]::before{content:"\\2022";position:absolute;left:9px;color:var(--fam-ink,#8cf);font-size:16px;line-height:1}',
    '.pm-i[aria-disabled=true]{opacity:.45;cursor:default}',
    '.pm-i small{color:var(--dim,#8a8a96);margin-left:auto}',
    '.pm-sep{height:1px;background:var(--line,#34343c);margin:4px 0}',
    '.pm-f{padding:8px 10px;display:flex;flex-direction:column;gap:6px}',
    '.pm-f label{display:flex;flex-direction:column;gap:3px;color:var(--dim,#8a8a96)}',
    '.pm-f input[type=text],.pm-f select,.pm-f textarea{font:inherit;color:var(--fg,#e8e8ec);background:var(--panel,#1a1a1f);border:1px solid var(--line,#34343c);border-radius:4px;padding:4px 6px;min-height:26px;box-sizing:border-box;width:100%}',
    '.pm-f textarea{min-height:110px;font:11px/1.3 ui-monospace,Menlo,Consolas,monospace;resize:vertical}',
    '.pm-row{display:flex;gap:6px;flex-wrap:wrap}',
    '.pm-b{font:inherit;color:var(--fg,#e8e8ec);background:var(--panel,#1a1a1f);border:1px solid var(--line,#34343c);border-radius:4px;min-height:28px;padding:2px 10px;cursor:pointer}',
    '.pm-b:hover{border-color:var(--fam-ink,#888)}',
    '.pm-b:focus-visible{outline:2px solid var(--fam-ink,#8cf);outline-offset:1px}',
    '.pm-msg{color:var(--dim,#8a8a96);min-height:1em;white-space:pre-wrap}',
    '.pm-msg[data-kind=error]{color:#ff8a80}'
  ].join('\n');
  function injectCss(d) {
    if (!d || d.getElementById && d.getElementById('hv-presets-style')) return;
    var s = d.createElement('style'); s.id = 'hv-presets-style'; s.textContent = CSS;
    (d.head || d.documentElement || d.body).appendChild(s);
  }

  function menu(button, o) {
    o = o || {};
    var d = root.document;
    if (!d) return null;
    injectCss(d);
    var host = o.host, dev = o.device || null;
    var track = o.track || (dev && dev.track) || null;
    if (!dev && host && track) dev = devOfTrack(host, track);
    if (dev) learn(dev);
    var type = o.type || (dev && dev.type) || null;
    var machine = machineOf(type);
    var wantKits = o.kits !== false && machine && !isMachine(type);
    var wantPatterns = o.patterns !== false;
    var made = false;
    if (!button) { button = d.createElement('button'); button.type = 'button'; button.textContent = 'Preset ▾'; made = true; }
    var pop = d.createElement('div');
    pop.className = 'pm-pop'; pop.hidden = true; pop.setAttribute('role', 'menu');
    pop.setAttribute('aria-label', 'Presets' + (type ? ' for ' + type : ''));
    var popId = 'pm-' + Math.floor(Math.random() * 1e9).toString(36);
    pop.id = popId;
    var container = o.container || d.body;
    container.appendChild(pop);
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', popId);
    button.disabled = false;
    if (!button.title || /not available/.test(button.title)) { button.title = 'Presets and patterns'; button.setAttribute('aria-label', 'Presets and patterns'); }
    var view = 'list', listeners = [];
    function on(node, ev, fn, cap) { node.addEventListener(ev, fn, cap); listeners.push([node, ev, fn, cap]); }
    function el(tag, cls, text) { var e = d.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    function item(text, run, opts) {
      opts = opts || {};
      var b = el('button', 'pm-i');
      b.type = 'button';
      b.setAttribute('role', opts.radio ? 'menuitemradio' : 'menuitem');
      if (opts.radio) b.setAttribute('aria-checked', opts.checked ? 'true' : 'false');
      b.tabIndex = -1;
      b.textContent = text;
      if (opts.hint) b.appendChild(el('small', '', opts.hint));
      if (opts.disabled) b.setAttribute('aria-disabled', 'true');
      b.addEventListener('click', function (ev) { ev.preventDefault(); if (opts.disabled) return; run(); });
      pop.appendChild(b);
      return b;
    }
    function heading(text) { var h = el('div', 'pm-h', text); h.setAttribute('role', 'presentation'); pop.appendChild(h); }
    function sep() { var s = el('div', 'pm-sep'); s.setAttribute('role', 'separator'); pop.appendChild(s); }
    function items() { return Array.prototype.slice.call(pop.children || []).filter(function (x) { return / ?pm-i\b/.test(x.className || '') && x.getAttribute('aria-disabled') !== 'true'; }); }
    function focusFirst(which) {
      var l = items(); if (!l.length) return;
      var t = which === 'last' ? l[l.length - 1] : (which === 'checked' ? (l.filter(function (x) { return x.getAttribute('aria-checked') === 'true'; })[0] || l[0]) : l[0]);
      try { t.focus(); } catch (e) { /* ignore */ }
    }
    function say(msgEl, text, kind) { msgEl.textContent = text || ''; msgEl.setAttribute('data-kind', kind || ''); }
    function editable() { return canEdit(host); }

    // ---- what the groups operate on
    function patchType() { return type; }
    function patternType() { return machine || type; }
    function patternsUsable() { return wantPatterns && editable() && track && !!(machine ? true : findTrack(host, track)); }
    function presetBank(kind) { return kind === 'kit' ? { list: function () { return Presets.list(machine); }, t: machine } : { list: function () { return Presets.list(type); }, t: type }; }

    function load(kind, id) {
      var ok = false;
      if (kind === 'pattern') ok = Presets.patterns.apply(host, track, id, { tempo: !!o.tempo });
      else ok = Presets.apply(host, track, id);
      if (ok && isFn(o.onApply)) safe(function () { o.onApply(kind, id); });
      return ok;
    }

    function renderList() {
      view = 'list';
      pop.textContent = '';
      if (!type) { heading('No device'); return; }
      var cur = safe(function () { return Presets.current(host, track, type); }, null);
      var plist = Presets.list(type), fac = plist.filter(function (p) { return p.factory; }), usr = plist.filter(function (p) { return !p.factory; });
      heading('Presets');
      if (!plist.length) item('No presets for ' + type, function () {}, { disabled: true });
      fac.forEach(function (p) { item(p.name, function () { load('patch', p.id); close(true); }, { radio: true, checked: p.id === cur }); });
      if (usr.length) { heading('Your presets'); usr.forEach(function (p) { item(p.name, function () { load('patch', p.id); close(true); }, { radio: true, checked: p.id === cur }); }); }
      if (wantKits) {
        var kcur = safe(function () { return Presets.current(host, track, machine); }, null), kl = Presets.list(machine);
        heading(MACHINE_LABEL[machine] || 'Kits');
        kl.forEach(function (p) { item(p.name, function () { load('kit', p.id); close(true); }, { radio: true, checked: p.id === kcur, hint: p.factory ? '' : 'yours' }); });
      }
      sep();
      item('Save as…', function () { renderForm('save', 'patch'); });
      item('Rename…', function () { renderForm('rename', 'patch'); }, { disabled: !usr.length && !(wantKits && Presets.list(machine).some(function (p) { return !p.factory; })) });
      item('Delete…', function () { renderForm('delete', 'patch'); }, { disabled: !usr.length && !(wantKits && Presets.list(machine).some(function (p) { return !p.factory; })) });
      item('Import…', function () { renderForm('import', 'patch'); });
      item('Export…', function () { renderForm('export', 'patch'); });
      if (patternsUsable()) {
        var pt = patternType(), tl = Presets.patterns.list(pt), pcur = safe(function () { return Presets.patterns.current(host, track); }, null);
        sep();
        heading(machine ? 'Patterns (' + (MACHINE_LABEL[machine] || machine).replace(/ kit$/, '') + ')' : 'Patterns');
        if (!tl.length) item('No patterns yet', function () {}, { disabled: true });
        tl.forEach(function (p) { item(p.name, function () { load('pattern', p.id); close(true); }, { radio: true, checked: p.id === pcur, hint: p.factory ? '' : 'yours' }); });
        var anyUser = tl.some(function (p) { return !p.factory; });
        item('Save pattern as…', function () { renderForm('save', 'pattern'); });
        item('Rename pattern…', function () { renderForm('rename', 'pattern'); }, { disabled: !anyUser });
        item('Delete pattern…', function () { renderForm('delete', 'pattern'); }, { disabled: !anyUser });
        item('Import pattern…', function () { renderForm('import', 'pattern'); });
        item('Export pattern…', function () { renderForm('export', 'pattern'); });
      }
    }

    // the entries a form can act on: [{id, name, type, factory}]
    function entriesFor(kind, userOnly) {
      var out = [];
      if (kind === 'pattern') {
        var pt = patternType();
        Presets.patterns.list(pt).forEach(function (p) { if (!userOnly || !p.factory) out.push({ id: p.id, name: p.name, type: pt, factory: p.factory }); });
        return out;
      }
      Presets.list(type).forEach(function (p) { if (!userOnly || !p.factory) out.push({ id: p.id, name: p.name, type: type, factory: p.factory }); });
      if (wantKits) Presets.list(machine).forEach(function (p) { if (!userOnly || !p.factory) out.push({ id: p.id, name: p.name + ' (kit)', type: machine, factory: p.factory }); });
      return out;
    }
    function picker(list, selected) {
      var s = el('select');
      list.forEach(function (e) { var op = el('option', '', e.name + (e.factory ? '' : ' · yours')); op.value = e.id; if (e.id === selected) op.selected = true; s.appendChild(op); });
      var pick = null; list.forEach(function (e) { if (e.id === selected) pick = e.id; });
      s.value = pick || (list[0] ? list[0].id : '');
      return s;
    }
    function field(form, label, control) { var l = el('label'); l.appendChild(el('span', '', label)); l.appendChild(control); form.appendChild(l); return control; }
    function button_(row, text, fn) { var b = el('button', 'pm-b', text); b.type = 'button'; b.addEventListener('click', function (ev) { ev.preventDefault(); fn(); }); row.appendChild(b); return b; }
    function download(name, text) {
      var sh = root.RecutShell;
      if (sh && isFn(sh.saveFile)) return Promise.resolve(sh.saveFile({ name: name, text: text, filters: [{ name: 'Recut', extensions: ['json'] }] })).then(function (r) { return r ? 'Saved.' : 'Not saved.'; });
      try {
        var blob = new root.Blob([text], { type: 'application/json' }), url = root.URL.createObjectURL(blob), a = d.createElement('a');
        a.href = url; a.download = name; a.rel = 'noopener'; d.body.appendChild(a); a.click(); d.body.removeChild(a);
        root.setTimeout(function () { try { root.URL.revokeObjectURL(url); } catch (e) { /* ignore */ } }, 4000);
        return Promise.resolve('Download started (some viewers block downloads: use Copy as text).');
      } catch (e) { return Promise.resolve('Download is not available here: use Copy as text.'); }
    }
    function copyText(ta) {
      var text = ta.value;
      var fallback = function () {
        try { ta.focus(); ta.select(); return d.execCommand && d.execCommand('copy') ? 'Copied.' : 'Selected: press Ctrl+C (Cmd+C) to copy.'; } catch (e) { return 'Selected: press Ctrl+C (Cmd+C) to copy.'; }
      };
      try {
        if (root.navigator && root.navigator.clipboard && isFn(root.navigator.clipboard.writeText)) {
          return root.navigator.clipboard.writeText(text).then(function () { return 'Copied.'; }, function () { return fallback(); });
        }
      } catch (e) { /* fall through */ }
      return Promise.resolve(fallback());
    }

    function renderForm(action, kind) {
      view = action;
      pop.textContent = '';
      var isPat = kind === 'pattern', noun = isPat ? 'pattern' : 'preset';
      heading((action === 'save' ? 'Save ' + noun + ' as' : action.charAt(0).toUpperCase() + action.slice(1) + ' ' + noun));
      var form = el('form', 'pm-f'); form.setAttribute('role', 'presentation');
      pop.appendChild(form);
      var msg = el('div', 'pm-msg'); msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
      var row = el('div', 'pm-row'), first = null, submit = null;
      if (action === 'save') {
        var target = null;
        if (!isPat && wantKits) {
          target = field(form, 'Save', el('select'));
          [['patch', 'This voice (' + type + ')'], ['kit', 'The whole kit (' + (MACHINE_LABEL[machine] || machine) + ')']].forEach(function (x) { var op = el('option', '', x[1]); op.value = x[0]; target.appendChild(op); });
        }
        var name = field(form, 'Name', el('input')); name.type = 'text'; name.maxLength = MAX_NAME; name.value = '';
        name.placeholder = isPat ? 'My pattern' : 'My sound';
        first = name;
        submit = function () {
          var id;
          if (isPat) id = Presets.patterns.save(patternType(), name.value, Presets.patterns.capture(host, track));
          else if (target && target.value === 'kit') id = Presets.save(machine, name.value, Presets.captureKit(host, machine));
          else id = Presets.save(type, name.value, capture(host, track));
          if (id) { if (isPat) lastPattern[track] = id; else lastApplied[track] = id; renderList(); focusFirst('checked'); }
          else say(msg, 'Could not save.', 'error');
        };
        button_(row, 'Save', submit);
      } else if (action === 'rename' || action === 'delete') {
        var list = entriesFor(kind, true);
        var curId = isPat ? safe(function () { return Presets.patterns.current(host, track); }, null) : safe(function () { return Presets.current(host, track, type); }, null);
        var sel = field(form, isPat ? 'Pattern' : 'Preset', picker(list, curId));
        first = sel;
        var find = function () { for (var i = 0; i < list.length; i++) if (list[i].id === sel.value) return list[i]; return null; };
        if (action === 'rename') {
          var nn = field(form, 'New name', el('input')); nn.type = 'text'; nn.maxLength = MAX_NAME;
          var fill = function () { var e = find(); nn.value = e ? e.name.replace(/ \(kit\)$/, '') : ''; };
          fill(); sel.addEventListener('change', fill);
          submit = function () {
            var e = find(); if (!e) return;
            var ok = isPat ? Presets.patterns.rename(e.type, e.id, nn.value) : Presets.rename(e.type, e.id, nn.value);
            if (ok) { renderList(); focusFirst('checked'); } else say(msg, 'Could not rename.', 'error');
          };
          button_(row, 'Rename', submit);
        } else {
          submit = function () {
            var e = find(); if (!e) return;
            var ok = isPat ? Presets.patterns.remove(e.type, e.id) : Presets.remove(e.type, e.id);
            if (ok) { renderList(); focusFirst(); } else say(msg, 'Could not delete.', 'error');
          };
          button_(row, 'Delete', submit);
        }
      } else if (action === 'import') {
        var file = field(form, 'From a file', el('input')); file.type = 'file'; file.accept = '.json,.txt,application/json,text/plain';
        var ta = field(form, 'Or paste the text', el('textarea')); ta.spellcheck = false;
        first = file;
        file.addEventListener('change', function () {
          var f = file.files && file.files[0]; if (!f) return;
          if (f.size > MAX_TEXT) { say(msg, 'That file is too large to be a ' + noun + '.', 'error'); return; }
          var rd = new root.FileReader();
          rd.onload = function () { ta.value = String(rd.result || ''); say(msg, f.name + ' read: press Import.'); };
          rd.onerror = function () { say(msg, 'Could not read ' + f.name + '.', 'error'); };
          rd.readAsText(f);
        });
        submit = function () {
          var r = null, other = null;
          try { r = isPat ? Presets.patterns.importText(ta.value) : Presets.importText(ta.value); }
          catch (e) {
            if (e && e.format) { try { r = e.format === 'pattern' ? Presets.patterns.importText(ta.value) : Presets.importText(ta.value); other = e.format; } catch (e2) { say(msg, e2.message, 'error'); return; } }
            else { say(msg, e && e.message ? e.message : String(e), 'error'); return; }
          }
          var forHere = (other || noun) === 'pattern' ? r.type === patternType() : (r.type === type || r.type === machine);
          say(msg, 'Imported as ' + (other || noun) + ' for ' + r.type + (forHere ? '' : ' (not this device: find it on a ' + r.type + ')') +
            (r.problems.length ? '.\nNotes: ' + r.problems.slice(0, 4).join('; ') + (r.problems.length > 4 ? '; …' : '') : '.'));
          ta.value = '';
        };
        button_(row, 'Import', submit);
      } else if (action === 'export') {
        var all = entriesFor(kind, false);
        var cid = isPat ? safe(function () { return Presets.patterns.current(host, track); }, null) : safe(function () { return Presets.current(host, track, type); }, null);
        var es = field(form, isPat ? 'Pattern' : 'Preset', picker(all, cid || (all[0] && all[0].id)));
        var out = field(form, 'Text', el('textarea')); out.readOnly = true; out.spellcheck = false;
        var cur = function () { for (var i = 0; i < all.length; i++) if (all[i].id === es.value) return all[i]; return null; };
        var fillOut = function () { var e = cur(); out.value = e ? ((isPat ? Presets.patterns.exportText(e.type, e.id) : Presets.exportText(e.type, e.id)) || '') : ''; };
        fillOut(); es.addEventListener('change', fillOut);
        first = es;
        button_(row, 'Copy as text', function () { copyText(out).then(function (m) { say(msg, m); }); });
        button_(row, root.RecutShell && isFn(root.RecutShell.saveFile) ? 'Save file…' : 'Download', function () {
          var e = cur(); if (!e) return;
          download(slug(e.name) + '.' + noun + '.json', out.value).then(function (m) { say(msg, m); });
        });
      }
      button_(row, 'Back', function () { renderList(); focusFirst('checked'); });
      form.appendChild(row);
      form.appendChild(msg);
      form.addEventListener('submit', function (ev) { ev.preventDefault(); if (submit) submit(); });
      form.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' && submit && ev.target && ev.target.tagName === 'INPUT' && ev.target.type === 'text') { ev.preventDefault(); submit(); }
      });
      if (first) root.setTimeout(function () { try { first.focus(); } catch (e) { /* ignore */ } }, 0);
    }

    function place() {
      var r = safe(function () { return button.getBoundingClientRect(); }, null); if (!r) return;
      // the visible width: on a phone the layout viewport can be wider than the screen
      var de = d.documentElement, vv = root.visualViewport;
      var vw = Math.min(root.innerWidth || 1024, (de && de.clientWidth) || Infinity, (vv && vv.width) || Infinity), vh = Math.min(root.innerHeight || 768, (vv && vv.height) || Infinity);
      pop.style.maxWidth = Math.max(200, Math.min(340, vw - 16)) + 'px';
      pop.style.left = Math.max(8, Math.min(Math.round(r.left), vw - Math.max(pop.offsetWidth || 240, 200) - 8)) + 'px';
      var below = vh - r.bottom - 8, above = r.top - 8;
      if (below < 200 && above > below) { pop.style.top = ''; pop.style.bottom = Math.round(vh - r.top + 4) + 'px'; pop.style.maxHeight = Math.round(above) + 'px'; }
      else { pop.style.bottom = ''; pop.style.top = Math.round(r.bottom + 4) + 'px'; pop.style.maxHeight = Math.round(Math.max(160, below)) + 'px'; }
    }
    function open(focusWhich) {
      if (!pop.hidden) return;
      Presets.reload();
      renderList();
      pop.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      place();
      focusFirst(focusWhich || 'checked');
    }
    function close(refocus) {
      if (pop.hidden) return;
      pop.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      if (refocus) { try { button.focus(); } catch (e) { /* ignore */ } }
    }
    function toggle() { if (pop.hidden) open(); else close(true); }

    on(button, 'click', function (ev) { ev.preventDefault(); toggle(); });
    on(button, 'keydown', function (ev) {
      if (ev.key === 'ArrowDown' || ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open('checked'); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); open('last'); }
    });
    on(pop, 'keydown', function (ev) {
      var k = ev.key;
      if (k === 'Escape') { ev.preventDefault(); ev.stopPropagation(); if (view !== 'list') { renderList(); focusFirst('checked'); } else close(true); return; }
      if (view !== 'list') return;
      if (k === 'Tab') { close(false); return; }
      var l = items(), i = l.indexOf(d.activeElement);
      if (k === 'ArrowDown') { ev.preventDefault(); if (l.length) l[(i + 1) % l.length].focus(); }
      else if (k === 'ArrowUp') { ev.preventDefault(); if (l.length) l[(i - 1 + l.length) % l.length].focus(); }
      else if (k === 'Home') { ev.preventDefault(); focusFirst(); }
      else if (k === 'End') { ev.preventDefault(); focusFirst('last'); }
      else if (k.length === 1 && /\S/.test(k)) {                     // type-ahead: the next item starting with the letter
        var lk = k.toLowerCase();
        for (var j = 1; j <= l.length; j++) { var c = l[(i + j + l.length) % l.length]; if ((c.textContent || '').trim().toLowerCase().charAt(0) === lk) { c.focus(); break; } }
      }
    });
    on(d, 'pointerdown', function (ev) { if (pop.hidden) return; var t = ev.target; if (pop.contains(t) || button.contains(t)) return; close(false); }, true);
    var onChange = function () { if (!pop.hidden && view === 'list') { var a = d.activeElement, idx = items().indexOf(a); renderList(); var l = items(); if (idx >= 0 && l.length) l[Math.min(idx, l.length - 1)].focus(); } };
    Presets.on('change', onChange);

    return {
      el: pop, button: button,
      open: open, close: close, toggle: toggle,
      isOpen: function () { return !pop.hidden; },
      refresh: function () { if (!pop.hidden) { if (view === 'list') renderList(); place(); } },
      dispose: function () {
        Presets.off('change', onChange);
        for (var i = 0; i < listeners.length; i++) { var l = listeners[i]; try { l[0].removeEventListener(l[1], l[2], l[3]); } catch (e) { /* ignore */ } }
        listeners.length = 0;
        if (pop.parentNode) pop.parentNode.removeChild(pop);
        if (made && button.parentNode) button.parentNode.removeChild(button);
        button.setAttribute('aria-expanded', 'false');
      }
    };
  }
  Presets.menu = menu;

  useStore(defaultAdapter());
  root.Presets = Presets;
})();
