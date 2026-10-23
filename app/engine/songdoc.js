/* Havantechno app engine - songdoc.js
 * Global `SongDoc`: the song as one editable, saveable document, with a record per step.
 *
 *   var doc = SongDoc.fromLegacy(Song.GUIDANCE);      // strings -> cells
 *   var json = SongDoc.save(doc); var doc2 = SongDoc.load(json);
 *   var ed = SongDoc.createEditor(doc); ed.setStepInSection('mainB', 'bass', 2, {vel: 0.6, locks: {cutoff: 900}}); ed.undo();
 *
 * A variant is {bars, cells}: cells has bars*16 entries, each null (rest) or a sparse step record
 *   {vel, acc, len, nudge, note, prob, cond, rep, locks}
 * vel 0..1 (default 0.85), acc accent flag, len gate in steps (default: the track gate; melodies: the note length),
 * nudge in steps (-0.5..0.5), note midi (default: the track note / the chord), prob 0..1 (default 1),
 * cond 'a:b' or '!a:b' (play on bar a of every b bars of the section), rep retriggers in the step (default 1),
 * locks {param: value} for this voice only.
 * The old string forms ('x.Xo' patterns, 'C4 - D4 .' melody tokens) parse to cells and format back whenever every
 * cell is plain, so song.js stays readable.
 * Samples (wave 2): doc.audio = {bufferId: {name, src, duration, sampleRate, channels}} holds references to audio
 * files, never their bytes; a track with type 'sampler' (inst 'sampler') plays params.buffer. ed.addTrack / removeTrack.
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var K = root.Kit;
  var STEPS = 16;
  var VEL = { x: 0.85, X: 1.0, o: 0.5 };
  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function isArr(a) { return Object.prototype.toString.call(a) === '[object Array]'; }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function emptyVariant(bars) {
    var v = { bars: Math.max(1, bars | 0), cells: [] };
    for (var i = 0; i < v.bars * STEPS; i++) v.cells.push(null);
    return v;
  }

  // ------------------------------------------------------------ parsing
  // 'x...x...' | ['x...', '....'] -> variant. x 0.85, X 1.0 + accent, o 0.5, . rest. Padded to 16 per bar.
  function parsePattern(p) {
    var bars = isArr(p) ? p : [p], v = emptyVariant(bars.length), b, i;
    for (b = 0; b < bars.length; b++) {
      var s = String(bars[b] || '').replace(/\s+/g, '');
      for (i = 0; i < STEPS; i++) {
        var c = s.charAt(i);
        if (!has(VEL, c)) continue;
        var cell = { vel: VEL[c] };
        if (c === 'X') cell.acc = true;
        v.cells[b * STEPS + i] = cell;
      }
    }
    return v;
  }
  // melody token lines (8 or 16 per bar, '-' sustain, '.' rest, 'C#5!' loud) -> variant with note and len per cell.
  // Same reading as the archived engine: a loud note is vel 1 with no accent flag.
  function parseMelody(lines) {
    var bars = isArr(lines) ? lines : [lines], v = emptyVariant(bars.length), last = null, b, i;
    for (b = 0; b < bars.length; b++) {
      var tk = String(bars[b] || '').trim().split(/\s+/), per = tk.length <= 8 ? 2 : 1;
      for (i = 0; i < tk.length && i * per < STEPS; i++) {
        var tok = tk[i], st = b * STEPS + i * per;
        if (tok === '-') { if (last) last.len += per; continue; }
        last = null;
        if (!tok || tok === '.') continue;
        var loud = /!$/.test(tok), m = K.ntom(tok.replace(/!$/, ''));
        if (m == null) continue;
        last = { note: m, len: per, vel: loud ? 1 : 0.85 };
        v.cells[st] = last;
      }
    }
    return v;
  }
  function normalizeCell(c) {
    if (!c || typeof c !== 'object') return null;
    var o = {}, k, any = false;
    for (k in c) if (has(c, k) && c[k] != null) { o[k] = (k === 'locks') ? clone(c[k]) : c[k]; any = true; }
    return any ? o : null;
  }
  // anything -> variant: a string or string array (pattern, or melody when kind is 'melody'), or {bars, cells}.
  function parseVariant(src, kind) {
    if (src && typeof src === 'object' && !isArr(src) && src.cells) {
      var n = src.bars ? (src.bars | 0) : Math.ceil(src.cells.length / STEPS), v = emptyVariant(n);
      for (var i = 0; i < v.cells.length; i++) v.cells[i] = normalizeCell(src.cells[i]);
      if (src.from) v.from = src.from;
      return v;
    }
    return kind === 'melody' ? parseMelody(src) : parsePattern(src);
  }

  // ------------------------------------------------------------ formatting
  var PLAIN_KEYS = { vel: 1, acc: 1 };
  function isPlainPatternCell(c) {
    if (c == null) return true;
    for (var k in c) if (has(c, k) && !PLAIN_KEYS[k]) return false;
    var vel = c.vel == null ? 0.85 : c.vel;
    if (vel !== 0.5 && vel !== 0.85 && vel !== 1) return false;
    return !!c.acc === (vel === 1);
  }
  function isPlainMelodyCell(c) {
    if (c == null) return true;
    for (var k in c) if (has(c, k) && k !== 'vel' && k !== 'note' && k !== 'len') return false;
    if (typeof c.note !== 'number') return false;
    var vel = c.vel == null ? 0.85 : c.vel;
    if (vel !== 0.85 && vel !== 1) return false;
    var len = c.len == null ? 1 : c.len;
    return len >= 1 && len === Math.floor(len);
  }
  function compact(v) {
    var out = { bars: v.bars, cells: [] };
    for (var i = 0; i < v.cells.length; i++) out.cells.push(normalizeCell(v.cells[i]));
    if (v.from) out.from = v.from;
    return out;
  }
  // variant -> readable string(s) when plain, else the {bars, cells} object.
  function formatVariant(v, kind) {
    var i, b, plain = true, lines = [];
    if (kind === 'melody') {
      for (i = 0; i < v.cells.length && plain; i++) plain = isPlainMelodyCell(v.cells[i]);
      if (!plain) return compact(v);
      for (b = 0; b < v.bars; b++) {
        var toks = [], hold = 0;
        for (i = 0; i < STEPS; i++) {
          var c = v.cells[b * STEPS + i];
          if (c) { toks.push(K.mton(c.note) + (c.vel === 1 ? '!' : '')); hold = (c.len == null ? 1 : c.len) - 1; }
          else if (hold > 0) { toks.push('-'); hold--; }
          else toks.push('.');
        }
        lines.push(toks.join(' '));
      }
    } else {
      for (i = 0; i < v.cells.length && plain; i++) plain = isPlainPatternCell(v.cells[i]);
      if (!plain) return compact(v);
      for (b = 0; b < v.bars; b++) {
        var s = '';
        for (i = 0; i < STEPS; i++) {
          var cc = v.cells[b * STEPS + i], vel = cc ? (cc.vel == null ? 0.85 : cc.vel) : null;
          s += vel == null ? '.' : vel === 1 ? 'X' : vel === 0.5 ? 'o' : 'x';
        }
        lines.push(s);
      }
    }
    return lines.length === 1 ? lines[0] : lines;
  }

  // ------------------------------------------------------------ documents
  // a sampler track: type 'sampler' and inst 'sampler' (either one marks it), params.buffer = an id of doc.audio
  function isSampler(t) { return !!t && (t.type === 'sampler' || t.inst === 'sampler'); }
  function normSampler(t) {
    if (!isSampler(t)) return t;
    t.type = 'sampler'; t.inst = 'sampler';
    t.params = t.params || {};
    if (t.params.buffer == null) t.params.buffer = '';
    else t.params.buffer = String(t.params.buffer);
    return t;
  }
  // doc.audio: {bufferId: {name, src, duration, sampleRate, channels}}, references to audio files, never their bytes
  var AUDIO_KEYS = { name: 'string', src: 'string', duration: 'number', sampleRate: 'number', channels: 'number' };
  function normAudio(a) {
    var out = {}, id, k;
    if (!a || typeof a !== 'object' || isArr(a)) return out;
    for (id in a) if (has(a, id) && a[id] && typeof a[id] === 'object') {
      var e = a[id], o = {};
      for (k in AUDIO_KEYS) if (has(AUDIO_KEYS, k) && typeof e[k] === AUDIO_KEYS[k] && (AUDIO_KEYS[k] !== 'number' || isFinite(e[k]))) o[k] = e[k];
      if (o.name == null) o.name = String(id);
      out[id] = o;
    }
    return out;
  }
  function kindOf(t) {
    if (t.kind) return t.kind;
    if (t.chords) return 'chord';
    if (t.melody) return 'melody';
    if (t.note != null || t.notes) return 'note';
    return 'drum';
  }
  // Song.GUIDANCE-style data -> document (v 1). Patterns and melodies become variants; everything else is copied.
  function fromLegacy(def) {
    var doc = { v: 1, name: def.name || 'song', bpm: def.bpm || 120, swing: def.swing || 0, key: def.key || null,
                progression: (def.progression || []).slice(), sends: clone(def.sends || {}), tracks: [], sections: clone(def.sections || []) };
    for (var i = 0; i < (def.tracks || []).length; i++) doc.tracks.push(trackFromLegacy(def.tracks[i]));
    if (def.audio) doc.audio = normAudio(def.audio);
    return doc;
  }
  // one legacy track (patterns / melody strings, or variants) -> a document track
  function trackFromLegacy(t) {
    var tr = {}, k;
    for (k in t) if (has(t, k) && k !== 'patterns' && k !== 'pattern' && k !== 'melody' && k !== 'variants') tr[k] = clone(t[k]);
    tr.kind = kindOf(t);
    tr.variants = {};
    if (t.variants) for (k in t.variants) if (has(t.variants, k)) tr.variants[k] = parseVariant(t.variants[k], tr.kind);
    if (t.patterns) for (k in t.patterns) if (has(t.patterns, k)) tr.variants[k] = parsePattern(t.patterns[k]);
    if (t.pattern) tr.variants.A = parsePattern(t.pattern);
    if (t.melody) {
      if (isArr(t.melody) || typeof t.melody === 'string') tr.variants.A = parseMelody(t.melody);
      else for (k in t.melody) if (has(t.melody, k)) tr.variants[k] = parseMelody(t.melody[k]);
    }
    return normSampler(tr);
  }
  // document -> Song.GUIDANCE-style data with readable strings where the variants are plain.
  function toLegacy(doc) {
    var def = { name: doc.name, bpm: doc.bpm, swing: doc.swing, key: doc.key, progression: doc.progression.slice(), sends: clone(doc.sends), tracks: [], sections: clone(doc.sections) };
    for (var i = 0; i < doc.tracks.length; i++) {
      var tr = doc.tracks[i], t = {}, k, out = {};
      for (k in tr) if (has(tr, k) && k !== 'variants') t[k] = clone(tr[k]);
      for (k in tr.variants) if (has(tr.variants, k)) out[k] = formatVariant(tr.variants[k], tr.kind);
      if (tr.kind === 'melody') t.melody = out; else t.patterns = out;
      def.tracks.push(t);
    }
    if (doc.audio) def.audio = normAudio(doc.audio);
    return def;
  }
  function save(doc) {
    var d = clone(doc);
    d.v = 1;
    for (var i = 0; i < d.tracks.length; i++) {
      normSampler(d.tracks[i]);
      for (var k in d.tracks[i].variants) if (has(d.tracks[i].variants, k)) d.tracks[i].variants[k] = compact(d.tracks[i].variants[k]);
    }
    if (d.audio != null) d.audio = normAudio(d.audio);
    return JSON.stringify(d);
  }
  function load(json) {
    var d = typeof json === 'string' ? JSON.parse(json) : clone(json);
    if (d.v !== 1) throw new Error('SongDoc: unsupported version ' + d.v);
    if (!isArr(d.tracks) || !isArr(d.sections)) throw new Error('SongDoc: tracks and sections are required');
    for (var i = 0; i < d.tracks.length; i++) {
      var tr = d.tracks[i], k;
      tr.kind = kindOf(tr);
      var vs = tr.variants || {};
      tr.variants = {};
      for (k in vs) if (has(vs, k)) tr.variants[k] = parseVariant(vs[k], tr.kind);
      normSampler(tr);
    }
    d.progression = d.progression || []; d.sends = d.sends || {};
    if (d.audio != null) d.audio = normAudio(d.audio);
    return d;
  }

  // ------------------------------------------------------------ editing (one write path, undo by snapshot)
  function createEditor(doc) {
    var ed = { doc: doc, _undo: [], _redo: [], limit: 200 };
    function snap() { ed._undo.push(JSON.stringify(ed.doc)); if (ed._undo.length > ed.limit) ed._undo.shift(); ed._redo.length = 0; }
    ed.track = function (name) { for (var i = 0; i < ed.doc.tracks.length; i++) if (ed.doc.tracks[i].name === name) return ed.doc.tracks[i]; return null; };
    ed.section = function (name) { for (var i = 0; i < ed.doc.sections.length; i++) if (ed.doc.sections[i].name === name) return ed.doc.sections[i]; return null; };
    // which sections play this variant of this track
    ed.variantUsage = function (track, variant) {
      var out = [];
      for (var i = 0; i < ed.doc.sections.length; i++) {
        var p = ed.doc.sections[i].play && ed.doc.sections[i].play[track];
        if (p === variant || (p === true && variant === 'A')) out.push(ed.doc.sections[i].name);
      }
      return out;
    };
    ed.setStep = function (track, variant, index, patch) {
      var tr = ed.track(track); if (!tr) return null;
      snap();
      var v = tr.variants[variant];
      if (!v) { v = tr.variants[variant] = emptyVariant(1); }
      if (index < 0 || index >= v.cells.length) return null;
      if (patch === null) { v.cells[index] = null; return null; }
      var cell = v.cells[index] ? clone(v.cells[index]) : {}, k;
      for (k in patch) if (has(patch, k)) {
        if (patch[k] == null) delete cell[k];
        else if (k === 'locks') { cell.locks = cell.locks || {}; for (var lk in patch.locks) if (has(patch.locks, lk)) { if (patch.locks[lk] == null) delete cell.locks[lk]; else cell.locks[lk] = patch.locks[lk]; } if (!Object.keys(cell.locks).length) delete cell.locks; }
        else cell[k] = patch[k];
      }
      v.cells[index] = normalizeCell(cell);
      return v.cells[index];
    };
    ed.forkVariant = function (track, from) {
      var tr = ed.track(track); if (!tr || !tr.variants[from]) return null;
      var letter = null;
      for (var i = 0; i < LETTERS.length; i++) if (!has(tr.variants, LETTERS.charAt(i))) { letter = LETTERS.charAt(i); break; }
      if (!letter) return null;
      snap();
      var copy = clone(tr.variants[from]); copy.from = from;
      tr.variants[letter] = copy;
      return letter;
    };
    ed.setPlay = function (section, track, variant) {
      var sec = ed.section(section); if (!sec) return false;
      snap();
      sec.play = sec.play || {};
      if (variant == null) delete sec.play[track]; else sec.play[track] = variant;
      return true;
    };
    // copy-on-write: edit the variant this section plays; fork it first when other sections share it (scope 'section'),
    // or edit it in place for all of them (scope 'all'). Returns {variant, forked}.
    ed.setStepInSection = function (section, track, index, patch, scope) {
      var sec = ed.section(section), tr = ed.track(track); if (!sec || !tr) return null;
      var variant = sec.play && sec.play[track]; if (variant === true) variant = 'A';
      if (!variant) return null;
      var forked = false;
      if (scope !== 'all' && ed.variantUsage(track, variant).length > 1) {
        var letter = ed.forkVariant(track, variant);
        if (!letter) return null;
        ed.setPlay(section, track, letter);
        variant = letter; forked = true;
      }
      ed.setStep(track, variant, index, patch);
      return { variant: variant, forked: forked };
    };
    ed.setSectionParam = function (section, path, value) {
      var sec = ed.section(section); if (!sec) return false;
      snap();
      sec.set = sec.set || {};
      if (value == null) delete sec.set[path]; else sec.set[path] = value;
      return true;
    };
    ed.setProgression = function (section, index, chord) {
      snap();
      var prog = section ? ((ed.section(section) || {}).progression) : ed.doc.progression;
      if (!prog) { var sec = ed.section(section); if (!sec) return false; prog = sec.progression = ed.doc.progression.slice(); }
      prog[index] = chord;
      return true;
    };
    ed.setTrackParam = function (track, key, value) { var tr = ed.track(track); if (!tr) return false; snap(); tr.params = tr.params || {}; tr.params[key] = value; return true; };
    ed.rename = function (name) { snap(); ed.doc.name = String(name); return true; };
    // add a track (legacy strings or variants; a sampler: {name, type: 'sampler', params: {buffer}}) at index (default: the end)
    ed.addTrack = function (def, index) {
      if (!def || !def.name || ed.track(def.name)) return null;
      var t = trackFromLegacy(def);
      snap();
      var n = ed.doc.tracks.length, at = (index == null || index < 0 || index > n) ? n : index | 0;
      ed.doc.tracks.splice(at, 0, t);
      return t;
    };
    // remove a track and every reference to it: section play and fx, duck lists, section set and ramp paths
    ed.removeTrack = function (name) {
      var i, j, idx = -1;
      for (i = 0; i < ed.doc.tracks.length; i++) if (ed.doc.tracks[i].name === name) idx = i;
      if (idx < 0) return false;
      snap();
      ed.doc.tracks.splice(idx, 1);
      var pre = name + '.';
      for (i = 0; i < ed.doc.tracks.length; i++) {
        var dk = ed.doc.tracks[i].duck;
        if (dk) ed.doc.tracks[i].duck = dk.filter(function (x) { return x !== name; });
      }
      for (i = 0; i < ed.doc.sections.length; i++) {
        var s = ed.doc.sections[i], k;
        if (s.play) delete s.play[name];
        if (s.fx) s.fx = s.fx.filter(function (f) { return f.track !== name; });
        if (s.set) for (k in s.set) if (has(s.set, k) && k.indexOf(pre) === 0) delete s.set[k];
        if (s.ramp) { var keep = []; for (j = 0; j < s.ramp.length; j++) if (String(s.ramp[j].param).indexOf(pre) !== 0) keep.push(s.ramp[j]); s.ramp = keep; }
      }
      return true;
    };
    ed.canUndo = function () { return ed._undo.length > 0; };
    ed.canRedo = function () { return ed._redo.length > 0; };
    ed.undo = function () { if (!ed._undo.length) return false; ed._redo.push(JSON.stringify(ed.doc)); ed.doc = JSON.parse(ed._undo.pop()); return true; };
    ed.redo = function () { if (!ed._redo.length) return false; ed._undo.push(JSON.stringify(ed.doc)); ed.doc = JSON.parse(ed._redo.pop()); return true; };
    return ed;
  }

  root.SongDoc = { STEPS: STEPS, parsePattern: parsePattern, parseMelody: parseMelody, parseVariant: parseVariant, formatVariant: formatVariant,
                   emptyVariant: emptyVariant, fromLegacy: fromLegacy,
                   isSampler: isSampler, normAudio: normAudio, toLegacy: toLegacy, save: save, load: load, createEditor: createEditor };
})();
