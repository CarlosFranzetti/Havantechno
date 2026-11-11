/* Havantechno app engine - classics.js
 * Global `Classics`: classic mono synths on the AudioWorklet infrastructure (Patch Crew, P5).
 *
 *   var inst = Classics.create(ctx, 'tb303', {cutoff: 600});      // or Synths.create(ctx, 'tb303') (fallback line)
 *   inst.trigger(t, {midi: 36, dur: 0.11, vel: 0.85, accent: true, slide: true, step: 4});
 *   Classics.types(); Classics.spec('modeld'); Classics.has('tb303'); inst.engine -> 'worklet' | 'fallback'
 *
 * Same instrument API as synths.js and drums.js: create(ctx, type, opts) -> {trigger, set/get, params, spec, panic,
 * dispose, out, _live}. Nothing throws, and a null context gives a silent instrument with the same API.
 * Load order: core.js, synths.js, drums.js, worklets.js, classics.js.
 *
 * Architecture (docs/research/2026-11-11-patch-crew/transcripts/log-P5.md section 1): each instrument owns one
 * AudioWorkletNode running the whole mono voice (app/engine/worklets/classics-processor.js). A note is AudioParam
 * automation at the event time on pitch, gate, trig (a counter: each note writes the next value), slide (1 = legato,
 * no envelope retrigger), acc and vel; the knobs are AudioParams. Offline renders are therefore deterministic.
 * When the context has no loaded worklet module (Worklets.ready(ctx) false: the Node checks' fake context, a failed
 * load) the instrument is built from plain nodes instead: the FALLBACK, an approximation (native oscillators, two
 * cascaded biquads for the 24 dB slope, envelopes as AudioParam ramps). Both paths share the event planner below.
 *
 * Every spec row carries `basis`: 'manual' | 'paper' | 'source' | 'prior' and a `label` naming it. 303 rows: P1
 * (transcripts/P1-303.md section 4, Open303 constants, MIT). Model D rows: P2 (transcripts/P2-modeld.md section 9).
 * Enumerated rows carry `options` (the string values a panel offers).
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var K = root.Kit;
  var setV = K.setV, lin = K.lin, val = K.val, disc = K.disc, clamp = K.clamp, target = K.target, mtof = K.mtof;

  function warn(msg) { try { if (typeof console !== 'undefined' && console.warn) console.warn('[Classics] ' + msg); } catch (e) {} }
  function P(min, max, value, unit, basis, label) {
    var o = { min: min, max: max, value: value, unit: unit || '' };
    if (basis) o.basis = basis;
    if (label) o.label = label;
    return o;
  }
  function E(value, options, basis, label) { return { value: value, options: options.slice(), basis: basis, label: label }; }
  function cancel(p, t) { try { p.cancelScheduledValues(t); } catch (e) {} }

  // ------------------------------------------------------------------ specs
  var SPEC = {};
  SPEC.tb303 = {
    tune: P(-165, 147, 0, 'ct', 'source', 'Open303VST.cpp 224: A4 400 to 480 Hz (P1)'),
    wave: E('saw', ['saw', 'square'], 'source', 'falling saw, or the tanh-shaped saw (53 % / 47 %), rosic_MipMappedWaveTable.cpp 245-289 (P1)'),
    cutoff: P(314, 2394, 1000, 'Hz', 'source', 'nominal cutoff; Open303 measured end points 313.8 and 2394.4 Hz (rosic_Open303.cpp 297-312)'),
    resonance: P(0, 1, 0.5, '', 'source', 'r = (1 - e^-3x) / (1 - e^-3), k = r kpoly (about 17 r), TeeBeeFilter.h (P1)'),
    envMod: P(0, 1, 0.5, '', 'source', 'Open303 measured env-mod scaler and offset (rosic_Open303.cpp 291-313)'),
    decay: P(200, 2000, 400, 'ms', 'source', 'time constant of the filter envelope on normal notes; accented notes use 200 ms (Open303VST.cpp 236, P1)'),
    accent: P(0, 1, 0.6, '', 'source', 'accent gain: up to +1 oct of cutoff sweep and +4 x envelope on the VCA (rosic_Open303.h 372, 380)'),
    slideTime: P(0, 200, 60, 'ms', 'source', 'glide tau = 0.2 x slideTime, exponential in Hz (Open303; the 60 ms default is prior)'),
    level: P(0, 1.5, 1, '', 'prior', 'output gain')
  };
  var RANGES = ['lo', '32', '16', '8', '4', '2'];
  var WAVES = ['tri', 'shark', 'saw', 'square', 'wide', 'narrow'];
  var WAVES3 = ['tri', 'revsaw', 'saw', 'square', 'wide', 'narrow'];
  // Model D: P2 second pass (transcripts/P2-modeld.md section 14.7, laws measured on a hardware reference by the CA-72
  // project, GPL-3.0-or-later, data only). cutoff is in panel marks -5..+5; glide, emphasis, contour, the contour knobs
  // and the five mixer rows are panel marks 0..10 (BRIEF amendment); MAP below turns marks into the processor's values.
  SPEC.modeld = {
    tune: P(-100, 100, 0, 'ct', 'prior', 'master tune, all oscillators (P2 14.3: not measured)'),
    glide: P(0, 10, 3, 'mark', 'source', 'constant-rate slide: 58 / 29 / 3.9 / 1.65 oct/s up, 23 / 13 / 2.05 / 0.86 down at 2.5 / 5 / 7.5 / 10 (CA-72)'),
    glideOn: P(0, 1, 0, '', 'source', 'glide switch; glide acts between held (overlapping or slid) notes only (CA-72)'),
    modMix: P(0, 1, 0, '', 'source', 'osc 3 (0) to noise (1): pot with a grounded wiper, gains min(1, 2(1-m)) and min(1, 2m), x 0.838 (CA-72 board4)'),
    modAmount: P(0, 1, 0.5, '', 'source', 'mod wheel: at 1 a full square swings osc 1 and 2 by 13.5 st and the cutoff by 4 oct peak to peak (CA-72)'),
    oscMod: P(0, 1, 0, '', 'source', 'modulation to oscillators 1 and 2 (CA-72)'),
    filterMod: P(0, 1, 0, '', 'source', 'modulation to the cutoff (CA-72)'),
    osc1Range: E('8', RANGES, 'source', 'lo, 32, 16, 8, 4, 2: octave steps, 8 = concert pitch, lo 4.74 oct under 32 (CA-72)'),
    osc1Wave: E('saw', WAVES, 'source', 'triangle (0.895), shark-fin (tri-saw mix, prior), saw, square 50 %, wide 30 %, narrow 18 % (1.057) (CA-72 light.rs)'),
    osc2Range: E('8', RANGES, 'source', 'as oscillator 1'),
    osc2Wave: E('saw', WAVES, 'source', 'as oscillator 1'),
    osc2Detune: P(-8.35, 8.35, 0.06, 'st', 'source', 'frequency knob, 16.7 st of travel (service manual 5.35 via CA-72)'),
    osc3Range: E('8', RANGES, 'source', 'as oscillator 1; with osc3Keys off, lo is the LFO band'),
    osc3Wave: E('saw', WAVES3, 'source', 'reverse saw replaces the shark-fin (CA-72 board1)'),
    osc3Detune: P(-8.35, 8.35, -0.06, 'st', 'source', 'keys off: 198.8 Hz x 2^(range oct) x 2^(4.12 d / 12), lo about 0.25 to 13.6 Hz (CA-72)'),
    osc3Keys: P(0, 1, 1, '', 'source', '1 = follows the keyboard, 0 = free-running (CA-72)'),
    mixOsc1: P(0, 10, 7, 'mark', 'source', 'volume law -16.51 / -9.42 / -5.19 / -2.10 / 0 dB at 2 / 4 / 6 / 8 / 10 (CA-72)'),
    mixOsc2: P(0, 10, 7, 'mark', 'source', 'as mixOsc1'),
    mixOsc3: P(0, 10, 5, 'mark', 'source', 'as mixOsc1'),
    mixNoise: P(0, 10, 0, 'mark', 'source', 'as mixOsc1; noise at -6 dB re the triangle (service manual 5.8 via CA-72)'),
    noiseType: E('white', ['white', 'pink'], 'source', 'white or pink to the mixer; the modulation gets pink or red (CA-72)'),
    mixFeedback: P(0, 10, 0, 'mark', 'source', 'external input row fed from the output: -39.5 / -33.1 / -29.9 / -16.9 / 0 dB at 2 / 4 / 6 / 8 / 10 (CA-72)'),
    cutoff: P(-5, 5, 0, 'mark', 'source', 'corner at C2: 70 / 131 / 299 / 680 / 1485 / 3288 Hz at -3..+2, 19 kHz at +5; sings at 1.578 x (CA-72)'),
    emphasis: P(0, 10, 2, 'mark', 'source', 'k through 0 / 0.30 / 2.0 / 2.3 / 2.9 / 3.2 / 4.0 / 4.4 at 0 / 2.5 / 5 / 6 / 7 / 7.5 / 8 / 10; sings from 8 (CA-72, derived)'),
    contour: P(0, 10, 4, 'mark', 'source', 'filter contour amount: 9.7 oct x 0 / 0.197 / 0.489 / 0.775 / 1 at 0 / 2.5 / 5 / 7.5 / 10 (CA-72, derived)'),
    keyTrack1: P(0, 1, 1, '', 'source', 'keyboard control 1: 1/3 oct per oct about C2 (CA-72)'),
    keyTrack2: P(0, 1, 0, '', 'source', 'keyboard control 2: 2/3; both 0.967 (CA-72)'),
    fAttack: P(0, 10, 0.5, 'mark', 'source', 'filter attack, 10-90 %: 294 ms / 4.18 s / 5.92 s at 6 / 8.5 / 10; lower marks from the dial labels (prior)'),
    fDecay: P(0, 10, 4, 'mark', 'source', 'filter decay, 90-50 %: 343 ms / 4.33 s / 5.82 s at 6 / 8.5 / 10; also the release with decaySwitch'),
    fSustain: P(0, 10, 3, 'mark', 'source', 'filter sustain, level (v / 10)^1.5 (one point, CA-72)'),
    attack: P(0, 10, 0.3, 'mark', 'source', 'loudness attack, 10-90 %: 457 ms / 6.78 s / 9.47 s at 6 / 8.5 / 10; lower marks from the dial labels (prior)'),
    decay: P(0, 10, 5, 'mark', 'source', 'loudness decay, 90-50 %: 293 ms / 4.02 s / 5.53 s at 6 / 8.5 / 10; also the release with decaySwitch'),
    sustain: P(0, 10, 7, 'mark', 'source', 'loudness sustain, level (v / 10)^1.5'),
    decaySwitch: P(0, 1, 1, '', 'source', 'one switch, both contours: release = decay, or a 10 ms dump (CA-72)'),
    level: P(0, 1.5, 1, '', 'prior', 'output gain')
  };
  // panel marks -> processor values (P2 14.2 to 14.5; points are CA-72 measurements unless marked)
  function lerp(pts, x) {
    if (x <= pts[0][0]) return pts[0][1];
    for (var i = 1; i < pts.length; i++) if (x <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); }
    return pts[pts.length - 1][1];
  }
  function loglerp(pts, x) { return Math.exp(lerp(pts.map(function (p) { return [p[0], Math.log(p[1])]; }), x)); }
  // the dial's printed labels (0.1: 10 ms, 0.2: 200 ms, 0.4: 600 ms of travel) scaled to the measured time at the 1 s mark
  function timePts(m6, m85, m10) { return [[0, 0.00075], [1, 0.010 * m6], [2, 0.2 * m6], [4, 0.6 * m6], [6, m6], [8.5, m85], [10, m10]]; }
  var LAW = {
    corner: [[-5, 18.6], [-4, 35], [-3, 70], [-2, 131], [-1, 299], [0, 680], [1, 1485], [2, 3288], [3, 7000], [4, 13000], [5, 19000]],
    sing: 1.578,
    k: [[0, 0], [2.5, 0.30], [5, 2.0], [6, 2.3], [7, 2.9], [7.5, 3.2], [8, 4.0], [10, 4.4]],
    kCal: 1.025,                    // P5: the ported ladder needs k 4.1 to sing reliably, so mark 8 maps to 4.1
    contour: [[0, 0], [2.5, 0.197], [5, 0.489], [7.5, 0.775], [10, 1]], contourOct: 9.7,
    glideUp: [[0, 116], [2.5, 58], [5, 29], [7.5, 3.9], [10, 1.65]], glideDown: [[0, 46], [2.5, 23], [5, 13], [7.5, 2.05], [10, 0.86]],
    vol: [[2, -16.51], [4, -9.42], [6, -5.19], [8, -2.10], [10, 0]], ext: [[2, -39.5], [4, -33.1], [5, -31.3], [6, -29.9], [8, -16.9], [10, 0]],
    fA: timePts(0.294, 4.18, 5.92), fD: timePts(0.343, 4.33, 5.82), lA: timePts(0.457, 6.78, 9.47), lD: timePts(0.293, 4.02, 5.53),
    rFilter: 9.3 / 4.49, rLoud: 9.3 / 5.28
  };
  function volGain(pts, v) { if (!(v > 0)) return 0; if (v < 2) return Math.pow(10, pts[0][1] / 20) * v / 2; return Math.pow(10, lerp(pts, v) / 20); }
  function attackTau(t1090, R) { return t1090 / Math.log((R - 0.1) / (R - 0.9)); }
  var MAP = { modeld: {
    cutoff: function (v) { return [['cutoff', loglerp(LAW.corner, v) * LAW.sing]]; },
    emphasis: function (v) { return [['emphasis', lerp(LAW.k, v) * LAW.kCal]]; },
    contour: function (v) { return [['contour', LAW.contourOct * lerp(LAW.contour, v)]]; },
    glide: function (v) { return v <= 0.05 ? [['glide', 1e4], ['glideDown', 1e4]] : [['glide', loglerp(LAW.glideUp, v)], ['glideDown', loglerp(LAW.glideDown, v)]]; },
    mixOsc1: function (v) { return [['mixOsc1', volGain(LAW.vol, v)]]; },
    mixOsc2: function (v) { return [['mixOsc2', volGain(LAW.vol, v)]]; },
    mixOsc3: function (v) { return [['mixOsc3', volGain(LAW.vol, v)]]; },
    mixNoise: function (v) { return [['mixNoise', volGain(LAW.vol, v)]]; },
    mixFeedback: function (v) { return [['mixFeedback', volGain(LAW.ext, v)]]; },
    fAttack: function (v) { return [['fAttack', attackTau(loglerp(LAW.fA, v), LAW.rFilter)]]; },
    attack: function (v) { return [['attack', attackTau(loglerp(LAW.lA, v), LAW.rLoud)]]; },
    fDecay: function (v) { return [['fDecay', loglerp(LAW.fD, v) / Math.log(1.8)]]; },
    decay: function (v) { return [['decay', loglerp(LAW.lD, v) / Math.log(1.8)]]; },
    fSustain: function (v) { return [['fSustain', Math.pow(clamp(v, 0, 10) / 10, 1.5)]]; },
    sustain: function (v) { return [['sustain', Math.pow(clamp(v, 0, 10) / 10, 1.5)]]; }
  }, tb303: {}, juno: {} };

  // Juno: P3 section 9 (Juno-60 measurements from pendragon-andyh/Juno60, MIT; Junox constants, GPL-3.0-or-later,
  // numbers only). Sliders are 0..1 as in P3's table; booleans and the numeric selectors carry `options`.
  function B(value, basis, label) { return { value: value, min: 0, max: 1, unit: '', basis: basis, label: label }; }
  SPEC.juno = {
    tune: P(-100, 100, 0, 'ct', 'prior', 'master tune (P3)'),
    bend: P(0, 12, 2, 'st', 'source', 'bender range; stored, the engine has no bend input yet (KR-106 / Youth106 via P3)'),
    portamento: P(0, 1, 0, '', 'source', 'glide time constant s^3 x 3 s, per voice (KR-106 via P3)'),
    voiceMode: E('poly', ['poly', 'unison'], 'paper', 'poly: six voices, oldest released then oldest held is stolen; unison: all six on one note (Youth106 via P3)'),
    lfoRate: P(0, 1, 0.35, '', 'paper', 'triangle 0.3 / 0.85 / 3.39 / 11.49 / 22.22 Hz at 0 / .25 / .5 / .75 / 1, linear between (Juno60 measurement via Junox junox.js 284)'),
    lfoDelay: P(0, 1, 0, '', 'paper', 'delay 0 / 0.064 / 0.85 / 1.2 / 2.79 s, then a fade of 0 / 0.053 / 0.188 / 0.348 / 1.0 s (Juno60 LFO/Delay README)'),
    lfoAuto: B(true, 'source', 'auto: the delay restarts on the first note after all are released; off: on every note (Junox, Youth106)'),
    dcoLfo: P(0, 1, 0, '', 'paper', 'vibrato depth s x 400 ct (106 service notes via Youth106; Junox has 300: conflict)'),
    pwm: P(0, 1, 0.5, '', 'source', 'duty 0.5 - 0.45 w (Junox dco.js 45)'),
    pwmMode: E('lfo', ['lfo', 'manual', 'env'], 'source', 'w = s (manual), s (lfo + 1) / 2 (lfo), s x envelope (env, the Juno-60\'s) (Junox voice.js 168-170)'),
    pulse: B(false, 'manual', 'pulse switch'),
    saw: B(true, 'manual', 'saw switch'),
    sub: P(0, 1, 0, '', 'source', 'sub square one octave down, level s x 0.195 against the saw 0.2, 4.2 kHz RC (Junox, KR-106)'),
    noise: P(0, 1, 0, '', 'source', 'noise s x 0.21, low-passed at 5 kHz; the mix compresses above 0.26 (Junox junox.js 239-252)'),
    range: { min: 4, max: 16, value: 8, options: [16, 8, 4], unit: 'ft', basis: 'manual', label: '16, 8, 4 feet: x 0.5, 1, 2' },
    hpf: P(0, 3, 1, '', 'paper', '0: low shelf +6 dB under 65 Hz, 1: flat, 2: 225 Hz, 3: 720 Hz, first order (P3; sources disagree)'),
    cutoff: P(0, 1, 0.6, '', 'source', '7.8 Hz x 2^(200 s / 12) (Junox voice.js 180-192)'),
    resonance: P(0, 1, 0.15, '', 'source', 'ladder k = 4 s (self-oscillates at 1), cutoff raised 0.5 s oct (Junox)'),
    envAmt: P(-1, 1, 0.4, '', 'source', 'bipolar, 12 oct at full (Junox; service notes 14 via Youth106)'),
    vcfLfo: P(0, 1, 0, '', 'paper', 'LFO to cutoff, 3.5 oct at full (service notes via Youth106; Junox 3)'),
    vcfKey: P(0, 1, 0.5, '', 'source', 'key follow 5 s (note - 60) / 60 oct (Junox voice.js 209)'),
    vcaMode: E('env', ['env', 'gate'], 'paper', 'gate: attack 3 ms, release 6 ms, sustain 1 (Juno60 Gate README)'),
    attack: P(0, 1, 0.1, '', 'paper', '0.001 / 0.03 / 0.24 / 0.65 / 3.25 s at 0 / .25 / .5 / .75 / 1; RC (1 - e^-x) / 0.632 (Juno60 Envelope README)'),
    decay: P(0, 1, 0.5, '', 'paper', '0.002 / 0.096 / 0.984 / 4.449 / 19.783 s; RC e^(-3.5 x) (Juno60 Envelope README)'),
    sustain: P(0, 1, 0.7, '', 'manual', 'sustain level'),
    release: P(0, 1, 0.35, '', 'paper', 'as decay; 10 ms when sustain <= 0.02 (Junox juno60Envelope.js 214)'),
    chorus: { min: 0, max: 2, value: 1, options: [0, 1, 2], unit: '', basis: 'paper', label: 'off, I (0.513 Hz), II (0.863 Hz): triangle, lines 1.66 to 5.35 ms in antiphase, dry 0.44 wet 0.56 (Juno60 Chorus README, Junox chorus.js)' },
    chorusNoise: P(0, 1, 0, '', 'paper', 'BBD hiss swapping slowly left and right (Youth106; level prior)'),
    level: P(0, 1.5, 1, '', 'prior', 'output gain')
  };
  LAW.juno = {
    rate: [[0, 0.3], [0.25, 0.85], [0.5, 3.39], [0.75, 11.49], [1, 22.22]],
    delay: [[0, 0], [0.25, 0.0639], [0.5, 0.85], [0.75, 1.2], [1, 2.786]], fade: [[0, 0], [0.25, 0.053], [0.5, 0.188], [0.75, 0.348], [1, 1]],
    attack: [[0, 0.001], [0.25, 0.03], [0.5, 0.24], [0.75, 0.65], [1, 3.25]], decay: [[0, 0.002], [0.25, 0.096], [0.5, 0.984], [0.75, 4.449], [1, 19.783]],
    range: { 16: 0.5, 8: 1, 4: 2 }, vib: 400, env: 12, lfo: 3.5, k: 4.08
  };
  var J = LAW.juno;
  MAP.juno = {
    bend: function () { return []; }, portamento: function () { return []; },
    voiceMode: function (v) { return [['unison', v === 'unison' ? 1 : 0]]; },
    lfoRate: function (v) { return [['lfoRate', lerp(J.rate, v)]]; },
    lfoDelay: function (v) { return [['lfoDelay', lerp(J.delay, v)], ['lfoFade', lerp(J.fade, v)]]; },
    lfoAuto: function (v) { return [['lfoAuto', v ? 1 : 0]]; },
    dcoLfo: function (v) { return [['dcoLfo', J.vib * v]]; },
    pulse: function (v) { return [['pulse', v ? 1 : 0]]; },
    saw: function (v) { return [['saw', v ? 1 : 0]]; },
    range: function (v) { return [['range', J.range[v] || (v > 12 ? 0.5 : (v < 6 ? 2 : 1))]]; },
    hpf: function (v) { return [['hpf', Math.round(clamp(v, 0, 3))]]; },
    cutoff: function (v) { return [['cutoff', 7.8 * Math.pow(2, v * 200 / 12)]]; },
    resonance: function (v) { return [['resonance', J.k * v]]; },
    envAmt: function (v) { return [['envAmt', J.env * v]]; },
    vcfLfo: function (v) { return [['vcfLfo', J.lfo * v]]; },
    attack: function (v) { return [['attack', loglerp(J.attack, v)]]; },
    decay: function (v) { return [['decay', loglerp(J.decay, v)]]; },
    release: function (v) { return [['release', loglerp(J.decay, v)]]; },
    chorus: function (v) { return [['chorus', Math.round(clamp(v, 0, 2))]]; }
  };
  var ENUMS = {
    tb303: { wave: ['saw', 'square'] },
    modeld: { osc1Range: RANGES, osc2Range: RANGES, osc3Range: RANGES, osc1Wave: WAVES, osc2Wave: WAVES, osc3Wave: WAVES3,
              noiseType: ['white', 'pink'] },
    juno: { voiceMode: ['poly', 'unison'], pwmMode: ['lfo', 'manual', 'env'], vcaMode: ['env', 'gate'] }
  };
  var PROC = { tb303: 'hvt-tb303', modeld: 'hvt-modeld', juno: 'hvt-juno' };
  var TYPES = ['tb303', 'modeld', 'juno'];

  // a parameter value as the processor reads it (enumerations by index; an unknown string falls back to the default)
  function numeric(type, name, v) {
    var en = ENUMS[type][name];
    if (!en) return Number(v);
    var i = en.indexOf(String(v));
    return i >= 0 ? i : en.indexOf(SPEC[type][name].value);
  }
  // the processor writes for a spec value: [[param, value], ...] (panel marks mapped by MAP)
  function wvals(type, name, v) { var f = MAP[type] && MAP[type][name]; return f ? f(typeof v === 'string' || typeof v === 'boolean' ? v : Number(v)) : [[name, numeric(type, name, v)]]; }
  function phys(type, name, v) { return wvals(type, name, v)[0][1]; }

  // ------------------------------------------------------------------ instrument base (as drums.js, no drive stage)
  function makeInst(ctx, type, spec, opts, build) {
    var inst = { type: type, ctx: ctx, out: null, pre: null, _live: [], engine: ctx ? 'fallback' : 'none' };
    K.defineParams(inst, spec, function (name, v, o) {
      if (!ctx) return;
      var at = (o && typeof o.at === 'number') ? o.at : ctx.currentTime;
      if (name === 'level' && inst.out) K.target(inst.out.gain, v, at, 0.01);
      if (inst.onParam) inst.onParam(name, v, o, at);
    });
    if (opts) for (var k in opts) if (opts.hasOwnProperty(k) && spec.hasOwnProperty(k)) inst.set(k, opts[k]);
    inst.trigger = function () {};
    inst.panic = function () {
      try {
        if (!ctx || !inst.out) return;
        var now = ctx.currentTime, lv = inst.params.level == null ? 1 : inst.params.level;
        K.cancel(inst.out.gain, now); setV(inst.out.gain, lv, now); lin(inst.out.gain, 0.0001, now + 0.02); setV(inst.out.gain, lv, now + 0.05);
        var live = inst._live.slice();
        for (var i = 0; i < live.length; i++) live[i].cut(now + 0.03);
        inst._live.length = 0;
        if (inst.onPanic) inst.onPanic(now);
      } catch (e) {}
    };
    inst.dispose = function () { inst.panic(); if (inst.onDispose) inst.onDispose(); disc(inst.pre); disc(inst.out); };
    if (!ctx) return inst;
    try {
      inst.out = ctx.createGain();
      val(inst.out.gain, inst.params.level == null ? 1 : inst.params.level);
      inst.pre = ctx.createGain();
      inst.pre.connect(inst.out);
      build(inst);
    } catch (e) {
      inst.out = inst.out || null;
    }
    var raw = inst.trigger;
    inst.trigger = function (t, ev) {
      try { if (!inst.out) return; raw(t == null ? ctx.currentTime : t, ev || {}); } catch (e) {}
    };
    return inst;
  }

  // ------------------------------------------------------------------ the event planner (both paths)
  // Step length: learned from ev.step and the trigger times; before two notes, from ev.dur (a one-step melody note is
  // 0.95 x step - 0.01 s in the sequencer).
  function planner() { return { sd: 0, lastStep: null, lastT: 0, n: 0, prev: null, held: [], locked: {}, fv: null }; }
  function learnStep(pl, t, ev) {
    if (typeof ev.step === 'number' && pl.lastStep != null && ev.step > pl.lastStep) {
      var est = (t - pl.lastT) / (ev.step - pl.lastStep);
      if (est > 0.01 && est < 2) pl.sd = pl.sd ? 0.5 * (pl.sd + est) : est;
    }
    if (!pl.sd) pl.sd = clamp(((ev.dur || 0.11) + 0.01) / 0.95, 0.03, 1);
    if (typeof ev.step === 'number') { pl.lastStep = ev.step; pl.lastT = t; }
    return pl.sd;
  }
  function noteOf(ev, def) {
    if (ev && typeof ev.midi === 'number') return ev.midi;
    if (ev && ev.notes && ev.notes.length) return ev.notes[0];
    return def;
  }
  function velOf(ev) { return clamp(ev && typeof ev.vel === 'number' ? ev.vel : 0.85, 0, 1.5); }
  // a record in inst._live for each sounding note (panic clears it); pruned when its end has passed
  function liveNote(inst, t, end, cut) {
    var L = inst._live;
    for (var i = L.length - 1; i >= 0; i--) if (L[i].end < t) L.splice(i, 1);
    var r = { t: t, end: end, cut: cut || function () {}, dispose: function () { var j = L.indexOf(r); if (j >= 0) L.splice(j, 1); } };
    L.push(r);
    return r;
  }

  // ------------------------------------------------------------------ worklet path helpers
  function wparams(node) {
    var m = {};
    try { node.parameters.forEach(function (p, k) { m[k] = p; }); } catch (e) {}
    return m;
  }
  // write the knobs that a lock changed for this trigger (and restore the ones locked last time)
  function applyLocks(inst, pl, W, t) {
    var P = inst.params, base = inst._base, k;
    var put = function (name, v) { wvals(inst.type, name, v).forEach(function (pv) { if (W[pv[0]]) setV(W[pv[0]], pv[1], t); }); };
    for (k in pl.locked) if (pl.locked.hasOwnProperty(k) && P[k] === base[k]) put(k, base[k]);
    pl.locked = {};
    for (k in base) if (base.hasOwnProperty(k) && k !== 'level' && P[k] !== base[k]) { put(k, P[k]); pl.locked[k] = true; }
  }
  function buildWorklet(inst, node) {
    var ctx = inst.ctx, W = wparams(node), type = inst.type, k;
    inst.engine = 'worklet';
    inst._node = node;
    inst._base = {};
    for (k in inst.params) if (inst.params.hasOwnProperty(k)) {
      inst._base[k] = inst.params[k];
      if (k !== 'level') wvals(type, k, inst.params[k]).forEach(function (pv) { if (W[pv[0]]) val(W[pv[0]], pv[1]); });
    }
    node.connect(inst.pre);
    inst.onParam = function (name, v, o, at) {
      inst._base[name] = v;
      if (name === 'level') return;
      wvals(type, name, v).forEach(function (pv) {
        var p = W[pv[0]];
        if (!p) return;
        if (ENUMS[type][name] || (inst.spec[name] && inst.spec[name].options) || typeof v === 'boolean' || (o && typeof o.at === 'number')) setV(p, pv[1], at);
        else target(p, pv[1], at, 0.01);
      });
    };
    inst.onDispose = function () { try { node.port.postMessage('stop'); } catch (e) {} disc(node); };
    return W;
  }

  // ------------------------------------------------------------------ TB-303
  // Gate (P1 ruling): a normal note holds its gate for its length less half a step; a note with ev.slide holds the gate
  // until the next trigger, with a safety release one step after its own length (two steps for a one-step note); the
  // next note then glides from it and retriggers nothing.
  function plan303(pl, t, ev) {
    var sd = learnStep(pl, t, ev), dur = ev.dur || sd * 0.95 - 0.01;
    var n = Math.max(1, Math.round((dur + 0.01) / (0.95 * sd)));
    var prev = pl.prev, legato = !!(prev && prev.slide && t <= prev.off + 1e-6 && t >= prev.t);
    var off = ev.slide ? t + (n + 1) * sd : t + Math.max(0.005, (n - 0.5) * sd);
    pl.prev = { t: t, slide: !!ev.slide, off: off, midi: noteOf(ev, 36), acc: !!ev.accent };
    pl.n++;
    return { legato: legato, off: off, midi: pl.prev.midi, acc: !!ev.accent, vel: velOf(ev), trig: pl.n };
  }

  var BUILD = {};
  BUILD.tb303 = function (inst) {
    var ctx = inst.ctx, pl = planner(), node = root.Worklets ? root.Worklets.node(ctx, PROC.tb303) : null;
    inst._plan = pl;
    if (node) {
      var W = buildWorklet(inst, node);
      inst.trigger = function (t, ev) {
        var e = plan303(pl, t, ev);
        applyLocks(inst, pl, W, t);
        cancel(W.gate, t);
        setV(W.pitch, e.midi, t); setV(W.slide, e.legato ? 1 : 0, t); setV(W.acc, e.acc ? 1 : 0, t); setV(W.vel, e.vel, t);
        setV(W.trig, e.trig, t); setV(W.gate, 1, t); setV(W.gate, 0, e.off);
        liveNote(inst, t, e.off + 0.1);
      };
      inst.onPanic = function (now) { cancel(W.gate, now); setV(W.gate, 0, now); pl.prev = null; };
      return;
    }
    // FALLBACK (no worklet): one voice per gate; a slide keeps the voice and glides its oscillator
    inst.trigger = function (t, ev) {
      var e = plan303(pl, t, ev), P = inst.params, v = pl.fv;
      var f = mtof(e.midi + P.tune / 100), accG = e.acc ? P.accent : 0;
      var res = P.resonance, rr = (1 - Math.exp(-3 * res)) / (1 - Math.exp(-3));
      var c = Math.log(P.cutoff / 313.8152786059267) / Math.log(2394.411986817546 / 313.8152786059267), em = P.envMod;
      var sc = (1 - c) * (3.773996325111173 * em + 0.736965594166206) + c * (4.194548788411135 * em + 0.864344900642434);
      var off0 = 0.048292930943553 * c + 0.294391201442418;
      var lo = clamp(P.cutoff * Math.pow(2, -sc * off0), 200, 18000), hi = clamp(P.cutoff * Math.pow(2, sc * (1 - off0) + accG), 200, 18000);
      var amp = 0.25 * e.vel * (1 + 0.45 + 4 * accG) / (1 + 0.45) * (1 / (1 + 3 * rr));
      var relT = e.acc ? 0.05 : 0.001, decT = e.acc ? 0.2 : P.decay / 1000;
      if (e.legato && v && !v.done) {                         // slide: glide the running voice, extend its gate
        target(v.o.frequency, f, t, Math.max(0.0002, 0.2 * P.slideTime / 1000));
        K.cancel(v.g.gain, t); target(v.g.gain, amp, t, 0.005); target(v.g.gain, 0, e.off, relT);
        try { v.o.stop(e.off + relT * 8 + 0.05); } catch (x) {}
        v.rec.end = e.off + 0.1;
        return;
      }
      var o = ctx.createOscillator(), b1 = ctx.createBiquadFilter(), b2 = ctx.createBiquadFilter(), g = ctx.createGain();
      try { o.type = P.wave === 'square' ? 'square' : 'sawtooth'; } catch (x) {}
      setV(o.frequency, f, t);
      [b1, b2].forEach(function (b, i) {
        try { b.type = 'lowpass'; } catch (x) {}
        val(b.Q, i ? 0.7 + 14 * rr : 0.5);
        setV(b.frequency, hi, t); target(b.frequency, lo, t + 0.003, decT);
      });
      setV(g.gain, 0, t); lin(g.gain, amp, t + 0.002); target(g.gain, 0.0001, t + 0.002, 1.23); target(g.gain, 0, e.off, relT);
      o.connect(b1); b1.connect(b2); b2.connect(g); g.connect(inst.pre);
      var nv = { o: o, g: g, done: false };
      nv.rec = liveNote(inst, t, e.off + 0.1, function (tc) { try { o.stop(tc); } catch (x) {} });
      o.onended = function () { nv.done = true; disc(o); disc(b1); disc(b2); disc(g); nv.rec.dispose(); };
      try { o.start(t); o.stop(e.off + relT * 8 + 0.05); } catch (x) {}
      pl.fv = nv;
    };
    inst.onPanic = function () { pl.prev = null; pl.fv = null; };
  };

  // ------------------------------------------------------------------ Model D
  // Single triggering, last-note priority (the brief; P2 notes the original is low-note priority): a note that starts
  // while another is held (the sequencer's dur decides), or after a note flagged ev.slide, is legato: the contours do
  // not restart and the pitch moves (glides when glideOn). When the newest note ends while an older one is still held,
  // the pitch returns to the most recent of those. The gate falls when the last held note ends.
  function planD(pl, t, ev) {
    var sd = learnStep(pl, t, ev), dur = Math.max(0.005, ev.dur || 0.2), end = t + dur, i;
    for (i = pl.held.length - 1; i >= 0; i--) if (pl.held[i].end <= t + 1e-6) pl.held.splice(i, 1);
    var prev = pl.prev, slid = !!(prev && prev.slide && t <= prev.off + 1e-6 && t >= prev.t);
    var legato = pl.held.length > 0 || slid;
    var midi = noteOf(ev, 48);
    if (ev.slide) end = Math.max(end, t + Math.round((dur + 0.01) / (0.95 * sd) + 1) * sd);
    pl.held.push({ midi: midi, end: end });
    // the pitch timeline after this note: return to the latest still-held note whenever the current one ends
    var steps = [], cur = pl.held[pl.held.length - 1], tt = cur.end, gateOff = 0;
    for (i = 0; i < pl.held.length; i++) gateOff = Math.max(gateOff, pl.held[i].end);
    for (var guard = 0; guard < 16 && tt < gateOff - 1e-6; guard++) {
      var back = null;
      for (i = pl.held.length - 1; i >= 0; i--) if (pl.held[i].end > tt + 1e-6) { back = pl.held[i]; break; }
      if (!back) break;
      steps.push([tt, back.midi]);
      tt = back.end;
    }
    pl.prev = { t: t, slide: !!ev.slide, off: gateOff };
    pl.n++;
    return { legato: legato, midi: midi, off: gateOff, returns: steps, vel: velOf(ev), trig: pl.n };
  }

  var FWAVE = { tri: 'triangle', shark: 'sawtooth', saw: 'sawtooth', revsaw: 'sawtooth', square: 'square', wide: 'square', narrow: 'square' };
  var ROCT = { lo: -6.74, '32': -2, '16': -1, '8': 0, '4': 1, '2': 2 };

  BUILD.modeld = function (inst) {
    var ctx = inst.ctx, pl = planner(), node = root.Worklets ? root.Worklets.node(ctx, PROC.modeld, { processorOptions: { seed: 22051 } }) : null;
    inst._plan = pl;
    if (node) {
      var W = buildWorklet(inst, node);
      inst.trigger = function (t, ev) {
        var e = planD(pl, t, ev);
        applyLocks(inst, pl, W, t);
        cancel(W.gate, t); cancel(W.pitch, t);
        setV(W.pitch, e.midi, t); setV(W.slide, e.legato ? 1 : 0, t); setV(W.vel, e.vel, t);
        setV(W.trig, e.trig, t); setV(W.gate, 1, t);
        for (var i = 0; i < e.returns.length; i++) setV(W.pitch, e.returns[i][1], e.returns[i][0]);
        setV(W.gate, 0, e.off);
        var P = inst.params;
        liveNote(inst, t, e.off + (P.decaySwitch >= 0.5 ? 8 * Math.max(phys('modeld', 'decay', P.decay), phys('modeld', 'fDecay', P.fDecay)) : 0.03) + 0.05);
      };
      inst.onPanic = function (now) { cancel(W.gate, now); cancel(W.pitch, now); setV(W.gate, 0, now); pl.prev = null; pl.held = []; };
      return;
    }
    // FALLBACK (no worklet): three native oscillators, two biquads, contours as ramps; legato glides the running voice.
    // Marks are mapped as for the worklet (phys), but the shapes are approximate.
    inst.trigger = function (t, ev) {
      var e = planD(pl, t, ev), P = inst.params, v = pl.fv, i;
      var X = function (n) { return phys('modeld', n, P[n]); };
      var tun = P.tune / 100, gl = P.glideOn >= 0.5 ? Math.max(0.001, 1 / X('glide')) : 0.001;
      var fr = function (m) {
        return [mtof(m + tun + 12 * (ROCT[P.osc1Range] || 0)), mtof(m + tun + 12 * (ROCT[P.osc2Range] || 0) + P.osc2Detune),
                P.osc3Keys >= 0.5 ? mtof(m + tun + 12 * (ROCT[P.osc3Range] || 0) + P.osc3Detune) : 198.8 * Math.pow(2, (ROCT[P.osc3Range] || 0) + 4.12 * P.osc3Detune / 12)];
      };
      var relT = P.decaySwitch >= 0.5 ? X('decay') : 0.00243;
      if (e.legato && v && !v.done) {
        var fs = fr(e.midi);
        for (i = 0; i < 3; i++) target(v.os[i].frequency, fs[i], t, gl);
        for (i = 0; i < e.returns.length; i++) { var fb = fr(e.returns[i][1]); for (var j = 0; j < 3; j++) target(v.os[j].frequency, fb[j], e.returns[i][0], gl); }
        K.cancel(v.g.gain, e.off); target(v.g.gain, 0, e.off, relT);
        for (i = 0; i < 3; i++) { try { v.os[i].stop(e.off + relT * 8 + 0.05); } catch (x) {} }
        v.rec.end = e.off + relT * 8;
        return;
      }
      var f = fr(e.midi), os = [], mix = [X('mixOsc1'), X('mixOsc2'), X('mixOsc3')], wv = [P.osc1Wave, P.osc2Wave, P.osc3Wave];
      var b1 = ctx.createBiquadFilter(), b2 = ctx.createBiquadFilter(), g = ctx.createGain(), stop = e.off + relT * 8 + 0.05;
      var kt = P.keyTrack1 >= 0.5 && P.keyTrack2 >= 0.5 ? 0.967 : (P.keyTrack1 >= 0.5 ? 1 / 3 : 0) + (P.keyTrack2 >= 0.5 ? 2 / 3 : 0);
      var corner = X('cutoff') / LAW.sing, oct = X('contour'), fsus = X('fSustain'), fa = X('fAttack'), fd = X('fDecay');
      var base = clamp(corner * Math.pow(2, kt * (e.midi - 36) / 12), 10, 18000), peak = clamp(base * Math.pow(2, oct), 10, 18000);
      var sus = clamp(base * Math.pow(2, oct * fsus), 10, 18000);
      [b1, b2].forEach(function (b, k) {
        try { b.type = 'lowpass'; } catch (x) {}
        val(b.Q, k ? 0.5 + 3 * X('emphasis') : 0.5);
        setV(b.frequency, base, t); lin(b.frequency, peak, t + fa); target(b.frequency, sus, t + fa, fd);
        target(b.frequency, base, e.off, P.decaySwitch >= 0.5 ? fd : 0.00243);
      });
      for (i = 0; i < 3; i++) {
        var o = ctx.createOscillator(), og = ctx.createGain();
        try { o.type = FWAVE[wv[i]] || 'sawtooth'; } catch (x) {}
        setV(o.frequency, f[i], t);
        val(og.gain, mix[i] * 0.3);
        o.connect(og); og.connect(b1);
        os.push(o);
      }
      var amp = e.vel * 0.6;
      setV(g.gain, 0, t); lin(g.gain, amp, t + X('attack')); target(g.gain, amp * X('sustain'), t + X('attack'), X('decay'));
      target(g.gain, 0, e.off, relT);
      b1.connect(b2); b2.connect(g); g.connect(inst.pre);
      var nv = { os: os, g: g, done: false, left: 3 };
      nv.rec = liveNote(inst, t, stop, function (tc) { for (var q = 0; q < 3; q++) { try { os[q].stop(tc); } catch (x) {} } });
      os.forEach(function (o) {
        o.onended = function () { if (--nv.left > 0) return; nv.done = true; os.forEach(disc); disc(b1); disc(b2); disc(g); nv.rec.dispose(); };
        try { o.start(t); o.stop(stop); } catch (x) {}
      });
      pl.fv = nv;
    };
    inst.onPanic = function () { pl.prev = null; pl.held = []; pl.fv = null; };
  };

  // ------------------------------------------------------------------ Juno (six voices)
  // Voice allocation (P3 section 6): poly takes the free voice released longest ago, else steals the oldest held one;
  // a note after one flagged ev.slide reuses that note's voice and glides (at least 60 ms, prior); portamento glides
  // every voice from its own last pitch (tau s^3 x 3 s). Unison puts all six voices on each note. ev.notes (chord tracks)
  // allocates one voice per note. Velocity is ignored, as on the instrument.
  function planJ(pl, t, ev, P) {
    var notes = ev && ev.notes && ev.notes.length ? ev.notes : [noteOf(ev, 60)], dur = Math.max(0.005, (ev && ev.dur) || 0.25);
    var porta = Math.pow(clamp(P.portamento, 0, 1), 3) * 3, used = [], i, k, slot;
    if (!pl.vo) { pl.vo = []; for (i = 0; i < 6; i++) pl.vo.push({ on: -1, off: -1, n: 0, fv: null }); }
    var prev = pl.prev, slid = !!(prev && prev.slide && t <= prev.off + 0.25 && t >= prev.t);
    if (P.voiceMode === 'unison') {
      for (i = 0; i < 6; i++) used.push({ slot: i, midi: notes[notes.length - 1], glide: slid ? Math.max(porta, 0.06) : porta });
    } else {
      for (k = 0; k < notes.length && k < 6; k++) {
        slot = -1;
        if (slid && k === 0 && prev.slots && prev.slots.length) slot = prev.slots[0];
        if (slot < 0) {
          var best = -1, bestOff = Infinity;
          for (i = 0; i < 6; i++) if (pl.vo[i].off <= t + 1e-9 && used.every(function (u) { return u.slot !== i; }) && pl.vo[i].off < bestOff) { best = i; bestOff = pl.vo[i].off; }
          if (best < 0) { var oldest = Infinity; for (i = 0; i < 6; i++) if (used.every(function (u) { return u.slot !== i; }) && pl.vo[i].on < oldest) { best = i; oldest = pl.vo[i].on; } }
          slot = best;
        }
        used.push({ slot: slot, midi: notes[k], glide: (slid && k === 0) ? Math.max(porta, 0.06) : porta });
      }
    }
    for (i = 0; i < used.length; i++) { var vo = pl.vo[used[i].slot]; vo.stolen = vo.off > t + 1e-9; vo.on = t; vo.off = t + dur; vo.n++; used[i].trig = vo.n; used[i].stolen = vo.stolen; }
    pl.prev = { t: t, off: t + dur, slide: !!(ev && ev.slide), slots: used.map(function (u) { return u.slot; }) };
    return { used: used, off: t + dur };
  }
  BUILD.juno = function (inst) {
    var ctx = inst.ctx, pl = planner(), i;
    var node = root.Worklets ? root.Worklets.node(ctx, PROC.juno, { outputChannelCount: [2], processorOptions: { seed: 106 } }) : null;
    inst._plan = pl;
    if (node) {
      var W = buildWorklet(inst, node);
      inst.trigger = function (t, ev) {
        var e = planJ(pl, t, ev, inst.params);
        applyLocks(inst, pl, W, t);
        for (var k = 0; k < e.used.length; k++) {
          var u = e.used[k], j = u.slot;
          cancel(W['gate' + j], t);
          setV(W['pitch' + j], u.midi, t); setV(W['glide' + j], u.glide, t); setV(W['trig' + j], u.trig, t);
          setV(W['gate' + j], 1, t); setV(W['gate' + j], 0, e.off);
        }
        var P = inst.params;
        liveNote(inst, t, e.off + (P.vcaMode === 'gate' ? 0.05 : loglerp(J.decay, P.release) * 2.5) + 0.05);
      };
      inst.onPanic = function (now) { for (var j = 0; j < 6; j++) { cancel(W['gate' + j], now); setV(W['gate' + j], 0, now); } pl.prev = null; pl.vo = null; };
      return;
    }
    // FALLBACK (no worklet): one native voice per note in its slot (a stolen slot's voice is cut), saw or 45 % pulse,
    // two biquads, ADSR as ramps, mono, no chorus
    inst.trigger = function (t, ev) {
      var P = inst.params, e = planJ(pl, t, ev, P);
      var aT = loglerp(J.attack, P.attack), dT = loglerp(J.decay, P.decay) / 3.5, rT = loglerp(J.decay, P.release) / 3.5;
      if (P.vcaMode === 'gate') { aT = 0.003; dT = 1; rT = 0.002; }
      var sus = P.vcaMode === 'gate' ? 1 : P.sustain, range = J.range[P.range] || 1, uni = P.voiceMode === 'unison';
      for (var k = 0; k < e.used.length; k++) {
        var u = e.used[k], slotV = pl.vo[u.slot];
        if (slotV.fv && !slotV.fv.done) { try { K.cancel(slotV.fv.g.gain, t); target(slotV.fv.g.gain, 0, t, 0.003); slotV.fv.o.stop(t + 0.03); } catch (x) {} }
        var o = ctx.createOscillator(), b1 = ctx.createBiquadFilter(), b2 = ctx.createBiquadFilter(), g = ctx.createGain();
        try { o.type = P.saw || !P.pulse ? 'sawtooth' : 'square'; } catch (x) {}
        setV(o.frequency, mtof(u.midi + P.tune / 100) * range, t);
        var base = clamp(7.8 * Math.pow(2, P.cutoff * 200 / 12 + P.vcfKey * 5 * (u.midi - 60) / 60), 20, 18000);
        var peak = clamp(base * Math.pow(2, J.env * P.envAmt), 20, 18000), fs2 = clamp(base * Math.pow(2, J.env * P.envAmt * sus), 20, 18000);
        [b1, b2].forEach(function (b, q) {
          try { b.type = 'lowpass'; } catch (x) {}
          val(b.Q, q ? 0.5 + 10 * P.resonance : 0.5);
          setV(b.frequency, base, t); lin(b.frequency, peak, t + aT); target(b.frequency, fs2, t + aT, dT); target(b.frequency, base, e.off, rT);
        });
        var amp = 0.12 * (uni ? 0.6 / 6 * 6 / Math.sqrt(6) : 1), stop = e.off + rT * 8 + 0.05;
        setV(g.gain, 0, t); lin(g.gain, amp, t + aT); target(g.gain, amp * sus, t + aT, dT); target(g.gain, 0, e.off, rT);
        o.connect(b1); b1.connect(b2); b2.connect(g); g.connect(inst.pre);
        var nv = { o: o, g: g, done: false };
        nv.rec = liveNote(inst, t, stop, (function (oo) { return function (tc) { try { oo.stop(tc); } catch (x) {} }; })(o));
        o.onended = (function (nv2, b1_, b2_) { return function () { nv2.done = true; disc(nv2.o); disc(b1_); disc(b2_); disc(nv2.g); nv2.rec.dispose(); }; })(nv, b1, b2);
        try { o.start(t); o.stop(stop); } catch (x) {}
        slotV.fv = nv;
      }
    };
    inst.onPanic = function () { pl.prev = null; pl.vo = null; };
  };

  // ------------------------------------------------------------------ API
  var fallbackSaid = false;
  function has(type) { return SPEC.hasOwnProperty(type); }
  function create(ctx, type, opts) {
    if (!has(type)) {
      warn('unknown instrument "' + type + '"');
      return makeInst(ctx || null, 'unknown', { level: P(0, 1.5, 1, '') }, opts, function () {});
    }
    var spec = {}, src = SPEC[type];
    for (var p in src) if (src.hasOwnProperty(p)) {
      spec[p] = {};
      for (var q in src[p]) if (src[p].hasOwnProperty(q)) spec[p][q] = (q === 'options') ? src[p][q].slice() : src[p][q];
    }
    var inst = makeInst(ctx || null, type, spec, opts, BUILD[type]);
    if (ctx && inst.engine === 'fallback' && !fallbackSaid) {
      fallbackSaid = true;
      warn('no AudioWorklet on this context: ' + type + ' (and later classics) use the approximate plain-node fallback');
    }
    return inst;
  }

  root.Classics = {
    create: create, has: has,
    types: function () { return TYPES.slice(); },
    spec: function (t) { return SPEC[t] || null; },
    processor: function (t) { return PROC[t] || null; },
    numeric: numeric, values: wvals, LAW: LAW
  };
})();
