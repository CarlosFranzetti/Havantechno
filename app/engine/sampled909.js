/* Havantechno app engine - sampled909.js
 * Global `Sampled909`: a second TR-909 beside the synthesized one in drums.js, playing Rob Roy Recordings' free
 * TR-909 sample set (1995) from app/assets/tr909-robroy/ (or from files the user supplies). Pressing Crew, K1.
 *
 *   Sampled909.load(ctx, {types: ['bd909s'], base: url}).then(function (r) {});   // r = {loaded: [...], missing: [...]}
 *   var inst = Sampled909.create(ctx, 'bd909s', {decay: 0.2});   // also Synths.create(ctx, 'bd909s')
 *   inst.out.connect(ctx.destination); inst.trigger(ctx.currentTime, {accent: true});
 *   Sampled909.loadFiles(ctx, fileList)   // user-picked files named as in the set (File, Blob with a name, {name, data})
 *   Sampled909.available()                // true once any recording of the set has been decoded (false when the folder is absent)
 *   Sampled909.ready(ctx, types)          // every recording of those voices is decoded on ctx (synchronous)
 *   Sampled909.pick(type, params)         // the recording a hit would play: {file, knobs, dist, residual}
 *   Sampled909.typesIn(seqOrDoc)          // the sampled types a Sequencer or a SongDoc uses (for load before a render)
 *
 * The set (TR909SET.TXT): each knob was recorded at the settings 0, 3, 7 and 10 ("a"), the hats and cymbals at 0, 2, 4,
 * 6, 8 and 10. A voice's parameters keep the SAME names and ranges as the synthesized voice in drums.js (bd909 tune,
 * attack, decay; sd909 tune, tone, snappy; toms tune, decay; hats decay; cymbals tune; level), so a preset or a panel
 * carries over. Each parameter's range is mapped linearly onto the panel's 0 to 10 scale and a hit plays the recorded
 * combination nearest to the current knob positions (Euclidean distance on the 0..10 scale over the knobs the voice
 * has; on a tie the higher setting wins). The knob therefore moves in the recorded steps: there is no interpolation
 * between recordings, no time-stretch and no pitch-shift. One exception, off by default and marked 'prior': `between`
 * = 1 bends the playback rate by the remaining tune difference (the synthesized voice's octave scale; the recordings
 * span about 0.9 octave over the tom Tune knob, 0.83 on the snare, 1.04 on the crash by their lengths) on the voices
 * whose Tune is a pitch (sd, toms, crash, ride; on the 909 the cymbal Tune is the ROM clock, so a rate change is what
 * the machine does there). The bass drum's Tune is the pitch-envelope depth, so it has no `between`.
 *
 * Level and accent follow drums.js's 909 voices (ampOf9): ev.accent 0 dB; else velocity under 0.5 the weak level -18 dB;
 * else the normal level -9 dB, trimmed by vel / 0.85 below the sequencer's default 0.85. ev.level909 0 / 1 / 2
 * (-18 / -9 / 0 dB, times ev.vel) overrides that for direct callers. ev.step is NOT read: the sequencer puts the song's
 * absolute step number there. The rim shot and hand clap also choose between the set's two velocity recordings
 * (RIM63 / RIM127, HANDCLP1 / HANDCLP2): level909 2, or (without level909) ev.accent, plays the high one. The set was
 * normalised per file, so GAIN (below, 'prior') puts the voices back into a balance taken from the synthesized kit's
 * measured peaks. Hats: one channel as in drums.js (any new ch909s or oh909s hit chokes the live ones, 5 ms fade); the
 * group is this module's own ('hat909s'), so the sampled and the synthesized hats do not choke each other.
 * The set's four closed->open and four open->closed combination recordings (CLOP1-4, OPCL1-4) are two hits at a fixed
 * spacing (CLOP: about 250, 80, 410 and 40 ms; OPCL: about 310, 220, 150 and 480 ms) and are NOT voices: as a voice they
 * would play a second hat the pattern did not ask for, at the recording's tempo. The manifest lists them, they are never
 * decoded by a kit, and tools/sampled909-check.js uses them as the reference for the choke.
 * Set quirks found by the manifest: the bass drum at tune 0, attack 0, decay 7 is named BT0A0A7.WAV (read here as
 * BT0A0D7, the only missing cell of the grid); RIDED4.WAV and RIDED6.WAV are byte-identical (both kept and used as named).
 *
 * Files: fetched by relative URL from `base` (default: ../assets/tr909-robroy/ next to this script's own URL, as
 * worklets.js resolves its modules, so /app/, /app/solo/ and the Electron scheme all work), fetched once per page and
 * decoded per context, lazily by voice (create() asks for its voice's files; load() for the voices it is given). A hit
 * whose recording is not decoded yet plays nothing; later hits play once it arrives. An OfflineAudioContext render must
 * await load(ctx, {types}) before it starts. When the folder is absent (a commercial release leaves it out), load
 * resolves with everything missing, the voices stay silent, available() is false and nothing throws.
 * Licence: the recordings are under the set's own terms (THIRD_PARTY.md, app/assets/README.md): free, not for profit,
 * never modified. This file only reads them.
 * Load order: after core.js (Kit); before synths.js is not needed (Synths.create looks Sampled909 up when called).
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var K = root.Kit;
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function isLvl(x) { return typeof x === 'number' && x === x; }
  function dbToGain(db) { return Math.pow(10, db / 20); }
  function setV(p, v, t) { if (K) K.setV(p, v, t); else { try { p.setValueAtTime(v, t); } catch (e) {} } }
  function lin(p, v, t) { if (K) K.lin(p, v, t); else { try { p.linearRampToValueAtTime(v, t); } catch (e) {} } }
  function disc(n) { try { if (n) n.disconnect(); } catch (e) {} }

  // ---- MANIFEST (generated by tools/robroy-manifest.js from app/assets/tr909-robroy/; do not edit by hand)
  var MANIFEST = [
    'BT0A0A7.WAV', 'BT0A0D0.WAV', 'BT0A0D3.WAV', 'BT0A0DA.WAV', 'BT0AAD0.WAV', 'BT0AADA.WAV', 'BT3A0D0.WAV', 'BT3A0D3.WAV',
    'BT3A0D7.WAV', 'BT3A0DA.WAV', 'BT3AAD0.WAV', 'BT3AADA.WAV', 'BT7A0D0.WAV', 'BT7A0D3.WAV', 'BT7A0D7.WAV', 'BT7A0DA.WAV',
    'BT7AAD0.WAV', 'BT7AADA.WAV', 'BTAA0D0.WAV', 'BTAA0D3.WAV', 'BTAA0D7.WAV', 'BTAA0DA.WAV', 'BTAAAD0.WAV', 'BTAAADA.WAV',
    'CLOP1.WAV', 'CLOP2.WAV', 'CLOP3.WAV', 'CLOP4.WAV', 'CSHD0.WAV', 'CSHD2.WAV', 'CSHD4.WAV', 'CSHD6.WAV',
    'CSHD8.WAV', 'CSHDA.WAV', 'HANDCLP1.WAV', 'HANDCLP2.WAV', 'HHCD0.WAV', 'HHCD2.WAV', 'HHCD4.WAV', 'HHCD6.WAV',
    'HHCD8.WAV', 'HHCDA.WAV', 'HHOD0.WAV', 'HHOD2.WAV', 'HHOD4.WAV', 'HHOD6.WAV', 'HHOD8.WAV', 'HHODA.WAV',
    'HT0D0.WAV', 'HT0D3.WAV', 'HT0D7.WAV', 'HT0DA.WAV', 'HT3D0.WAV', 'HT3D3.WAV', 'HT3D7.WAV', 'HT3DA.WAV',
    'HT7D0.WAV', 'HT7D3.WAV', 'HT7D7.WAV', 'HT7DA.WAV', 'HTAD0.WAV', 'HTAD3.WAV', 'HTAD7.WAV', 'HTADA.WAV',
    'LT0D0.WAV', 'LT0D3.WAV', 'LT0D7.WAV', 'LT0DA.WAV', 'LT3D0.WAV', 'LT3D3.WAV', 'LT3D7.WAV', 'LT3DA.WAV',
    'LT7D0.WAV', 'LT7D3.WAV', 'LT7D7.WAV', 'LT7DA.WAV', 'LTAD0.WAV', 'LTAD3.WAV', 'LTAD7.WAV', 'LTADA.WAV',
    'MT0D0.WAV', 'MT0D3.WAV', 'MT0D7.WAV', 'MT0DA.WAV', 'MT3D0.WAV', 'MT3D3.WAV', 'MT3D7.WAV', 'MT3DA.WAV',
    'MT7D0.WAV', 'MT7D3.WAV', 'MT7D7.WAV', 'MT7DA.WAV', 'MTAD0.WAV', 'MTAD3.WAV', 'MTAD7.WAV', 'MTADA.WAV',
    'OPCL1.WAV', 'OPCL2.WAV', 'OPCL3.WAV', 'OPCL4.WAV', 'RIDED0.WAV', 'RIDED2.WAV', 'RIDED4.WAV', 'RIDED6.WAV',
    'RIDED8.WAV', 'RIDEDA.WAV', 'RIM127.WAV', 'RIM63.WAV', 'ST0T0S0.WAV', 'ST0T0S3.WAV', 'ST0T0S7.WAV', 'ST0T0SA.WAV',
    'ST0T3S3.WAV', 'ST0T3S7.WAV', 'ST0T3SA.WAV', 'ST0T7S3.WAV', 'ST0T7S7.WAV', 'ST0T7SA.WAV', 'ST0TAS3.WAV', 'ST0TAS7.WAV',
    'ST0TASA.WAV', 'ST3T0S0.WAV', 'ST3T0S3.WAV', 'ST3T0S7.WAV', 'ST3T0SA.WAV', 'ST3T3S3.WAV', 'ST3T3S7.WAV', 'ST3T3SA.WAV',
    'ST3T7S3.WAV', 'ST3T7S7.WAV', 'ST3T7SA.WAV', 'ST3TAS3.WAV', 'ST3TAS7.WAV', 'ST3TASA.WAV', 'ST7T0S0.WAV', 'ST7T0S3.WAV',
    'ST7T0S7.WAV', 'ST7T0SA.WAV', 'ST7T3S3.WAV', 'ST7T3S7.WAV', 'ST7T3SA.WAV', 'ST7T7S3.WAV', 'ST7T7S7.WAV', 'ST7T7SA.WAV',
    'ST7TAS3.WAV', 'ST7TAS7.WAV', 'ST7TASA.WAV', 'STAT0S0.WAV', 'STAT0S3.WAV', 'STAT0S7.WAV', 'STAT0SA.WAV', 'STAT3S3.WAV',
    'STAT3S7.WAV', 'STAT3SA.WAV', 'STAT7S3.WAV', 'STAT7S7.WAV', 'STAT7SA.WAV', 'STATAS3.WAV', 'STATAS7.WAV', 'STATASA.WAV',
    'TR909SET.TXT'
  ];
  // ---- END MANIFEST

  var SET = 'Rob Roy TR-909 set (1995)';
  // the one file whose name breaks the set's own rule (an A for the D of decay); read as the grid cell it fills
  var ALIASES = { 'BT0A0A7.WAV': 'BT0A0D7.WAV' };
  function kv(c) { return c === 'A' ? 10 : Number(c); }

  // the naming rule of TR909SET.TXT -> {voice, knobs} | {combo} | {text} | null (unknown)
  var RULES = [
    [/^BT([037A])A([0A])D([037A])\.WAV$/, 'bd909s', ['tune', 'attack', 'decay']],
    [/^ST([037A])T([037A])S([037A])\.WAV$/, 'sd909s', ['tune', 'tone', 'snappy']],
    [/^LT([037A])D([037A])\.WAV$/, 'lt909s', ['tune', 'decay']],
    [/^MT([037A])D([037A])\.WAV$/, 'mt909s', ['tune', 'decay']],
    [/^HT([037A])D([037A])\.WAV$/, 'ht909s', ['tune', 'decay']],
    [/^HHCD([02468A])\.WAV$/, 'ch909s', ['decay']],
    [/^HHOD([02468A])\.WAV$/, 'oh909s', ['decay']],
    [/^CSHD([02468A])\.WAV$/, 'cr909s', ['tune']],         // named D, but the set's table says t = tune (and the lengths agree)
    [/^RIDED([02468A])\.WAV$/, 'rd909s', ['tune']]
  ];
  function parse(name) {
    var n = String(name || '').toUpperCase(), a = ALIASES[n] || n, i, m;
    for (i = 0; i < RULES.length; i++) {
      m = RULES[i][0].exec(a);
      if (m) {
        var k = {}, j;
        for (j = 0; j < RULES[i][2].length; j++) k[RULES[i][2][j]] = kv(m[j + 1]);
        return { file: n, voice: RULES[i][1], knobs: k, alias: a !== n ? a : null };
      }
    }
    if ((m = /^RIM(63|127)\.WAV$/.exec(n))) return { file: n, voice: 'rs909s', vel: Number(m[1]) === 127 ? 'high' : 'low', knobs: {} };
    if ((m = /^HANDCLP([12])\.WAV$/.exec(n))) return { file: n, voice: 'cp909s', vel: m[1] === '2' ? 'high' : 'low', knobs: {} };
    if ((m = /^(CLOP|OPCL)([1-4])\.WAV$/.exec(n))) return { file: n, combo: m[1] === 'CLOP' ? 'closed->open' : 'open->closed', number: Number(m[2]) };
    if (n === 'TR909SET.TXT') return { file: n, text: true };
    return null;
  }

  // ------------------------------------------------------------ voices and specs
  function P(min, max, value, unit, basis, label) { return { min: min, max: max, value: value, unit: unit || '', basis: basis, label: label }; }
  function knobLabel(knob, steps, extra) {
    return SET + ': the ' + knob + ' knob, recorded at ' + steps.join(', ') + ' of 10; this range maps linearly onto 0 to 10 and the knob moves in the recorded steps (nearest recording, no interpolation)' + (extra ? '; ' + extra : '');
  }
  var S4 = [0, 3, 7, 10], S6 = [0, 2, 4, 6, 8, 10];
  function lvl() { return P(0, 1.5, 1, '', 'sample', SET + ': output level after the recording (the set was recorded with every 909 level at maximum)'); }
  function betw() { return P(0, 1, 0, '', 'prior', SET + ': 1 = bend the playback rate by the tune left over between recorded steps (octave scale of the synthesized voice); 0 = recorded steps only'); }
  // names and ranges copied from drums.js (bd909, sd909, lt/mt/ht909, ch909, oh909, cr909, rd909); tools/sampled909-check.js compares them
  var VOICES = {
    bd909s: { synth: 'bd909', name: 'bass drum', spec: {
      level: lvl(),
      tune: P(0.007, 0.04, 0.007, 's (time constant)', 'sample', knobLabel('Tune', S4, 'on the 909 Tune sets the pitch-envelope depth (the recordings start at about 109 Hz at 0 and 172 Hz at 10, ending near 55 to 61 Hz)')),
      attack: P(-12, 6, 0, 'dB', 'sample', knobLabel('Attack', [0, 10], 'the set has attack 10 only at decay 0 and 10')),
      decay: P(0.0155, 0.35, 0.035, 's (time constant)', 'sample', knobLabel('Decay', S4))
    } },
    sd909s: { synth: 'sd909', name: 'snare drum', bend: true, spec: {
      level: lvl(),
      tune: P(-0.5, 0.5, 0, 'oct', 'sample', knobLabel('Tune', S4)),
      tone: P(0.10, 0.34, 0.2, 's (time constant)', 'sample', knobLabel('Tone', S4, 'the set has tone 0 only at snappy 0 ... 10 and snappy 0 only at tone 0')),
      snappy: P(-18, 6, 0, 'dB', 'sample', knobLabel('Snappy', S4)),
      between: betw()
    } },
    rs909s: { synth: 'rs909', name: 'rim shot', vel: true, spec: {
      level: lvl()
    } },
    cp909s: { synth: 'cp909', name: 'hand clap', vel: true, spec: {
      level: lvl()
    } },
    ch909s: { synth: 'ch909', name: 'closed hat', hat: true, spec: {
      level: lvl(),
      decay: P(0.008, 0.06, 0.008, 's (time constant)', 'sample', knobLabel('CH Decay', S6))
    } },
    oh909s: { synth: 'oh909', name: 'open hat', hat: true, spec: {
      level: lvl(),
      decay: P(0.03, 0.16, 0.069, 's (time constant)', 'sample', knobLabel('OH Decay', S6))
    } },
    cr909s: { synth: 'cr909', name: 'crash cymbal', bend: true, spec: {
      level: lvl(),
      tune: P(-0.5, 0.5, 0, 'oct', 'sample', knobLabel('Crash Tune', S6, 'pitch and length move together, as on the machine')),
      between: betw()
    } },
    rd909s: { synth: 'rd909', name: 'ride cymbal', bend: true, spec: {
      level: lvl(),
      tune: P(-0.5, 0.5, 0, 'oct', 'sample', knobLabel('Ride Tune', S6, 'the set\'s RIDED4 and RIDED6 are the same recording')),
      between: betw()
    } }
  };
  ['lt', 'mt', 'ht'].forEach(function (k) {
    var nm = { lt: 'low tom', mt: 'mid tom', ht: 'high tom' }[k];
    VOICES[k + '909s'] = { synth: k + '909', name: nm, bend: true, spec: {
      level: lvl(),
      tune: P(-0.5, 0.5, 0, 'oct', 'sample', knobLabel('Tune', S4)),
      decay: P(0.038, 0.38, 0.15, 's (time constant)', 'sample', knobLabel('Decay', S4)),
      between: betw()
    } };
  });
  var TYPES = ['bd909s', 'sd909s', 'lt909s', 'mt909s', 'ht909s', 'rs909s', 'cp909s', 'ch909s', 'oh909s', 'cr909s', 'rd909s'];

  // Per-voice output gain over the normalised recordings, 'prior': set so a step-2 (accent) hit at the default knobs peaks
  // where the synthesized voice's step-2 hit at its defaults peaks (measured in headless Chromium by tools/sampled909-check.js
  // --browser, 27 November 2026; log-K1.md has the table). The set's own relative levels were lost to per-file normalising.
  var GAIN = { bd909s: 0.69, sd909s: 1.0, lt909s: 0.72, mt909s: 0.72, ht909s: 0.72, rs909s: 0.44, cp909s: 0.53,
               ch909s: 0.66, oh909s: 0.62, cr909s: 0.78, rd909s: 0.76 };
  var GAIN_BASIS = 'prior';

  // the recorded combinations of each voice, from the manifest
  var COMBOS = {};
  (function () {
    for (var t in VOICES) if (VOICES.hasOwnProperty(t)) COMBOS[t] = [];
    for (var i = 0; i < MANIFEST.length; i++) {
      var p = parse(MANIFEST[i]);
      if (p && p.voice) COMBOS[p.voice].push(p);
    }
  })();

  // a parameter value -> the 0..10 knob position (linear over the spec range)
  function knobOf(type, name, value) {
    var s = VOICES[type] && VOICES[type].spec[name];
    if (!s) return 0;
    var v = typeof value === 'number' && value === value ? value : s.value;
    return clamp((v - s.min) / (s.max - s.min) * 10, 0, 10);
  }
  function valueOf(type, name, knob) { var s = VOICES[type].spec[name]; return s.min + knob / 10 * (s.max - s.min); }

  // the recording a hit plays: nearest recorded combination on the 0..10 scale; ties go to the higher settings
  function pick(type, params, ev) {
    var V = VOICES[type];
    if (!V) return null;
    params = params || {};
    var list = COMBOS[type], best = null, bd = Infinity, bs = -1, i, k;
    if (V.vel) {
      var hi = !!(ev && (isLvl(ev.level909) ? Math.round(ev.level909) >= 2 : ev.accent));   // ev.step is the song's absolute step: never read
      for (i = 0; i < list.length; i++) if (list[i].vel === (hi ? 'high' : 'low')) return { file: list[i].file, knobs: {}, dist: 0, residual: 0, vel: list[i].vel };
      return null;
    }
    var pos = {};
    for (k in list[0].knobs) if (list[0].knobs.hasOwnProperty(k)) pos[k] = knobOf(type, k, params[k]);
    for (i = 0; i < list.length; i++) {
      var d = 0, s = 0;
      for (k in pos) if (pos.hasOwnProperty(k)) { var e = pos[k] - list[i].knobs[k]; d += e * e; s += list[i].knobs[k]; }
      if (d < bd - 1e-9 || (Math.abs(d - bd) <= 1e-9 && s > bs)) { bd = d; bs = s; best = list[i]; }
    }
    var res = 0;
    if (V.bend && pos.hasOwnProperty('tune')) {
      var tv = typeof params.tune === 'number' ? clamp(params.tune, V.spec.tune.min, V.spec.tune.max) : V.spec.tune.value;
      res = tv - valueOf(type, 'tune', best.knobs.tune);        // octaves left over
    }
    var kn = {};
    for (k in best.knobs) if (best.knobs.hasOwnProperty(k)) kn[k] = best.knobs[k];
    return { file: best.file, knobs: kn, dist: Math.sqrt(bd), residual: res, pos: pos };
  }
  function filesOf(type) { return (COMBOS[type] || []).map(function (p) { return p.file; }); }

  // ------------------------------------------------------------ base URL (as worklets.js)
  var baseUrl = 'assets/tr909-robroy/';
  try {
    var cs = root.document && root.document.currentScript;
    if (cs && cs.src) {
      var dir = cs.src.replace(/[^\/]*([?#].*)?$/, '');                       // .../app/engine/
      baseUrl = (typeof root.URL === 'function') ? new root.URL('../assets/tr909-robroy/', dir).href : dir.replace(/[^\/]+\/$/, '') + 'assets/tr909-robroy/';
    }
  } catch (e) {}
  function setBase(url) { if (typeof url === 'string' && url) baseUrl = url.replace(/\/?$/, '/'); }

  // ------------------------------------------------------------ fetching (once per page) and decoding (per context)
  var BYTES = {};       // url -> Promise<ArrayBuffer|null>
  var USER = {};        // FILE NAME -> ArrayBuffer (loadFiles); preferred over the URL for every context
  var STATE = (typeof WeakMap === 'function') ? new WeakMap() : null;
  var seenOk = false;
  function stateOf(ctx) {
    if (!ctx || typeof ctx !== 'object' || !STATE) return null;
    var s = STATE.get(ctx);
    if (!s) { s = { bufs: {}, pend: {}, miss: {}, base: null }; STATE.set(ctx, s); }
    return s;
  }
  function fetchBytes(url) {
    if (BYTES[url]) return BYTES[url];
    var p;
    try {
      if (typeof root.fetch !== 'function') p = Promise.resolve(null);
      else p = root.fetch(url).then(function (r) { return r && r.ok ? r.arrayBuffer() : null; }).then(null, function () { return null; });
    } catch (e) { p = Promise.resolve(null); }
    BYTES[url] = p;
    p.then(function (ab) { if (!ab) delete BYTES[url]; });      // a missing file is asked again by a later load (the user may add the folder)
    return p;
  }
  function decode(ctx, ab) {
    return new Promise(function (resolve) {
      if (!ab || !ctx || typeof ctx.decodeAudioData !== 'function') { resolve(null); return; }
      var done = false, fin = function (b) { if (!done) { done = true; resolve(b || null); } };
      try {
        var r = ctx.decodeAudioData(ab.slice(0), fin, function () { fin(null); });   // a copy: decoding detaches the buffer
        if (r && r.then) r.then(fin, function () { fin(null); });
      } catch (e) { fin(null); }
    });
  }
  // one file on one context -> Promise<bool>
  function ensureFile(ctx, name, base) {
    var st = stateOf(ctx);
    if (!st) return Promise.resolve(false);
    if (st.bufs[name]) return Promise.resolve(true);
    if (st.pend[name]) return st.pend[name];
    var src = USER[name] ? Promise.resolve(USER[name]) : fetchBytes((base || st.base || baseUrl) + name);
    var p = src.then(function (ab) { return decode(ctx, ab); }).then(function (b) {
      delete st.pend[name];
      if (b) { st.bufs[name] = b; delete st.miss[name]; seenOk = true; return true; }
      st.miss[name] = true;
      return false;
    }, function () { delete st.pend[name]; st.miss[name] = true; return false; });
    st.pend[name] = p;
    return p;
  }
  function typesArg(t) {
    if (!t) return TYPES.slice();
    if (typeof t === 'string') t = [t];
    return t.filter(function (x) { return VOICES.hasOwnProperty(x); });
  }
  function load(ctx, opts) {
    opts = opts || {};
    var st = stateOf(ctx);
    if (!st) return Promise.resolve({ loaded: [], missing: allFiles(typesArg(opts.types)) });
    if (opts.base) st.base = String(opts.base).replace(/\/?$/, '/');
    var files = allFiles(typesArg(opts.types));
    return Promise.all(files.map(function (f) { return ensureFile(ctx, f, st.base); })).then(function (oks) {
      var r = { loaded: [], missing: [] };
      for (var i = 0; i < files.length; i++) (oks[i] ? r.loaded : r.missing).push(files[i]);
      return r;
    });
  }
  function allFiles(types) { var out = []; types.forEach(function (t) { out = out.concat(filesOf(t)); }); return out; }
  function ready(ctx, types) {
    var st = STATE && ctx && typeof ctx === 'object' ? STATE.get(ctx) : null;
    if (!st) return false;
    var f = allFiles(typesArg(types));
    for (var i = 0; i < f.length; i++) if (!st.bufs[f[i]]) return false;
    return f.length > 0;
  }
  function bufferOf(ctx, name) { var st = STATE && ctx && typeof ctx === 'object' ? STATE.get(ctx) : null; return st ? st.bufs[name] || null : null; }

  // user-supplied files: File / Blob with a name, {name, data|buffer|arrayBuffer: ArrayBuffer}, or a map {name: ArrayBuffer}.
  // Names are matched case-insensitively on the last path part. -> Promise<{loaded, missing, unknown}> (missing: of the
  // kit's 152 voice files, those still not decoded on ctx after this call).
  function isAB(x) { return Object.prototype.toString.call(x) === '[object ArrayBuffer]'; }
  function loadFiles(ctx, files) {
    var items = [], unknown = [], i;
    if (files && typeof files === 'object' && typeof files.length !== 'number' && !files.name) {
      for (var k in files) if (files.hasOwnProperty(k)) items.push({ name: k, data: files[k] });
    } else if (files && typeof files.length !== 'number') items.push(files);   // one File
    else if (files) {
      for (i = 0; i < files.length; i++) items.push(files[i]);
    }
    var jobs = items.map(function (it) {
      var raw = it && (it.webkitRelativePath || it.name), name = String(raw || '').split(/[\/\\]/).pop().toUpperCase();
      var p = parse(name);
      if (!p || !p.voice) { if (!p) unknown.push(String(raw || '(unnamed)')); return Promise.resolve(null); }
      var get;
      if (isAB(it.data)) get = Promise.resolve(it.data);
      else if (isAB(it.buffer)) get = Promise.resolve(it.buffer);
      else if (isAB(it.arrayBuffer)) get = Promise.resolve(it.arrayBuffer);
      else if (typeof it.arrayBuffer === 'function') { try { get = Promise.resolve(it.arrayBuffer()); } catch (e) { get = Promise.resolve(null); } }
      else get = Promise.resolve(null);
      return get.then(function (ab) {
        if (!isAB(ab)) return null;
        USER[name] = ab;
        var st = stateOf(ctx);
        if (st) { delete st.bufs[name]; delete st.miss[name]; }
        return name;
      }, function () { return null; });
    });
    return Promise.all(jobs).then(function (names) {
      names = names.filter(Boolean);
      return Promise.all(names.map(function (n) { return ensureFile(ctx, n); })).then(function (oks) {
        var loaded = [], miss = [];
        for (var j = 0; j < names.length; j++) if (oks[j]) loaded.push(names[j]); else unknown.push(names[j] + ' (undecodable)');
        var st = STATE && ctx && typeof ctx === 'object' ? STATE.get(ctx) : null, all = allFiles(TYPES);
        for (j = 0; j < all.length; j++) if (!st || !st.bufs[all[j]]) miss.push(all[j]);
        return { loaded: loaded, missing: miss, unknown: unknown };
      });
    });
  }

  // the sampled types a Sequencer (tracks[n].inst.type), a SongDoc (tracks[i].type|inst) or a list of names uses
  function typesIn(x) {
    var out = [], seen = {};
    function add(t) { if (typeof t === 'string' && VOICES.hasOwnProperty(t) && !seen[t]) { seen[t] = 1; out.push(t); } }
    try {
      if (!x) return out;
      if (typeof x === 'string') { add(x); return out; }
      var tr = x.tracks || x, k;
      for (k in tr) if (Object.prototype.hasOwnProperty.call(tr, k)) {
        var t = tr[k];
        if (typeof t === 'string') add(t);
        else if (t) { add(t.type); add(typeof t.inst === 'string' ? t.inst : t.inst && t.inst.type); }
      }
    } catch (e) {}
    return out;
  }

  // ------------------------------------------------------------ instruments
  var GROUPS = (typeof WeakMap === 'function') ? new WeakMap() : null;   // ctx -> live hat voices ('hat909s')
  function hatGroup(ctx) { if (!GROUPS) return []; var g = GROUPS.get(ctx); if (!g) { g = []; GROUPS.set(ctx, g); } return g; }
  function velOf(ev) { return clamp(ev && typeof ev.vel === 'number' ? ev.vel : 0.8, 0, 1.5); }
  var STEP_DB = [-18, -9, 0], WEAK909 = 0.5, VREF909 = 0.85;
  // as drums.js ampOf9: ev.level909 0/1/2 for direct callers; else accent 0 dB, velocity under 0.5 -18 dB, else -9 dB
  // trimmed by vel / 0.85 below the sequencer's default velocity. ev.step (the absolute step) is not read.
  function ampOf(ev) {
    if (ev && isLvl(ev.level909)) return velOf(ev) * dbToGain(STEP_DB[clamp(Math.round(ev.level909), 0, 2)]);
    if (ev && ev.accent) return dbToGain(STEP_DB[2]);
    var v = velOf(ev);
    if (v < WEAK909) return dbToGain(STEP_DB[0]);
    return dbToGain(STEP_DB[1]) * Math.min(1, v / VREF909);
  }

  function defineParams(inst, spec, onSet) {
    if (K && K.defineParams) return K.defineParams(inst, spec, onSet);
    inst.params = {}; inst.spec = spec;
    for (var k in spec) if (spec.hasOwnProperty(k)) inst.params[k] = spec[k].value;
    inst.set = function (n, v, o) { if (!spec.hasOwnProperty(n)) return false; var x = Number(v); if (x !== x) return false; inst.params[n] = clamp(x, spec[n].min, spec[n].max); if (onSet) onSet(n, inst.params[n], o || {}); return true; };
    inst.get = function (n) { return inst.params[n]; };
    return inst;
  }

  function create(ctx, type, opts) {
    var V = VOICES[type];
    if (!V) {
      try { if (typeof console !== 'undefined' && console.warn) console.warn('[Sampled909] unknown instrument "' + type + '"'); } catch (e) {}
      V = { spec: { level: lvl() } }; type = 'unknown';
    }
    var spec = {}, p, q;
    for (p in V.spec) if (V.spec.hasOwnProperty(p)) { spec[p] = {}; for (q in V.spec[p]) if (V.spec[p].hasOwnProperty(q)) spec[p][q] = V.spec[p][q]; }
    ctx = ctx || null;
    var inst = { type: type, ctx: ctx, out: null, _live: [], _lastHit: null, _missed: 0, sampled: true };
    defineParams(inst, spec, function (name, v, o) {
      if (!ctx || !inst.out) return;
      var at = (o && typeof o.at === 'number') ? o.at : ctx.currentTime;
      if (name === 'level') { if (K) K.target(inst.out.gain, v, at, 0.01); else setV(inst.out.gain, v, at); }
    });
    if (opts) for (var k in opts) if (opts.hasOwnProperty(k) && spec.hasOwnProperty(k)) inst.set(k, opts[k]);
    inst.files = filesOf(type);
    inst.trigger = function () {};
    inst.panic = function () {
      try {
        if (!ctx || !inst.out) return;
        var now = ctx.currentTime, live = inst._live.slice();
        for (var i = 0; i < live.length; i++) live[i].cut(now + 0.03, now);
      } catch (e) {}
    };
    inst.dispose = function () { inst.panic(); disc(inst.out); };
    if (!ctx || type === 'unknown') return inst;
    try {
      inst.out = ctx.createGain();
      setV(inst.out.gain, inst.params.level, 0);
      try { inst.out.gain.value = inst.params.level; } catch (e) {}
    } catch (e) { inst.out = null; return inst; }
    if (create.autoload !== false) ensureVoice(ctx, type);        // lazy: this voice's files only
    inst.trigger = function (t, ev) {
      try {
        if (!inst.out) return;
        t = (t == null) ? ctx.currentTime : t;
        ev = ev || {};
        var sel = pick(type, inst.params, ev);
        if (!sel) return;
        var b = bufferOf(ctx, sel.file);
        inst._lastHit = { file: sel.file, t0: t, knobs: sel.knobs, played: !!b };
        if (!b) { inst._missed++; ensureVoice(ctx, type); return; }      // not decoded yet (or absent): silent, catches up later
        var rate = (V.bend && inst.params.between >= 0.5 && sel.residual) ? Math.pow(2, sel.residual) : 1;
        var src = ctx.createBufferSource(), g = ctx.createGain();
        src.buffer = b;
        if (rate !== 1) setV(src.playbackRate, rate, t);
        var amp = ampOf(ev) * (GAIN[type] || 1);
        setV(g.gain, amp, t);
        src.connect(g); g.connect(inst.out);
        var v = { src: src, g: g, done: false, ctx: ctx };
        v.cut = function (at, from) {                                  // 5 ms fade from `from` (never before the hit starts)
          from = Math.max(t, from == null ? at - 0.005 : from);
          try { if (K && K.cancel) K.cancel(g.gain, from); } catch (e) {}
          setV(g.gain, amp, from);
          lin(g.gain, 0.0001, Math.max(at, from + 0.001));
          try { src.stop(at + 0.001); } catch (e) {}
        };
        v.dispose = function () {
          if (v.done) return;
          v.done = true; disc(src); disc(g);
          var i = inst._live.indexOf(v); if (i >= 0) inst._live.splice(i, 1);
          if (V.hat) { var hg = hatGroup(ctx), j = hg.indexOf(v); if (j >= 0) hg.splice(j, 1); }
        };
        src.onended = v.dispose;
        if (V.hat) {                                                     // one hat channel: a new hit chokes the live ones
          var hg = hatGroup(ctx), old = hg.slice();
          for (var i = 0; i < old.length; i++) { old[i].cut(t + 0.005, t); var j = hg.indexOf(old[i]); if (j >= 0) hg.splice(j, 1); }
          hg.push(v);
        }
        inst._live.push(v);
        src.start(t);
        src.stop(t + b.duration / rate + 0.01);
      } catch (e) {}
    };
    return inst;
  }
  function ensureVoice(ctx, type) {
    var f = filesOf(type), st = stateOf(ctx);
    for (var i = 0; i < f.length; i++) if (!(st && (st.bufs[f[i]] || st.pend[f[i]] || st.miss[f[i]]))) ensureFile(ctx, f[i]);
  }

  function spec(type) { return VOICES[type] ? VOICES[type].spec : null; }

  root.Sampled909 = {
    types: function () { return TYPES.slice(); },
    has: function (t) { return VOICES.hasOwnProperty(t); },
    spec: spec, create: create, load: load, ready: ready, loadFiles: loadFiles,
    available: function () { return seenOk; },
    pick: pick, parse: parse, knobOf: knobOf, files: filesOf, typesIn: typesIn, buffer: bufferOf,
    synthOf: function (t) { return VOICES[t] ? VOICES[t].synth : null; },
    sampledOf: function (synthType) { for (var t in VOICES) if (VOICES.hasOwnProperty(t) && VOICES[t].synth === synthType) return t; return null; },
    nameOf: function (t) { return VOICES[t] ? VOICES[t].name : null; },
    setBase: setBase, get base() { return baseUrl; },
    manifest: function () { return MANIFEST.slice(); },
    ALIASES: ALIASES, GAIN: GAIN, GAIN_BASIS: GAIN_BASIS, STEP_DB: STEP_DB.slice(), SET: SET
  };
})();
