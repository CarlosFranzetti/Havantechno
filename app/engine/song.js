/* Havantechno studio - song.js
 * Global `Song`: a Guidance-style electro track (126 BPM, B) written for the studio sequencer.
 * The numbers come from an analysis of the reference mix (see docs/superpowers/specs/2026-10-21-guidance-studio-design.md):
 * four-on-the-floor kick with a long sub, a syncopated mid bass on B1, off-beat open hats, claps on 2 and 4,
 * short wide chord stabs, a pentatonic 8th-note lead in the breakdown.
 *
 *   Song.build(seq)              adds sends, tracks and the arrangement to a Sequencer
 *   Song.GUIDANCE                the plain data (edit patterns / sections here)
 *   Song.GUIDANCE_V2             the re-measured preset (kick tau/hold, drone sub, break split); documentV2() for SongDoc
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  var LEAD_BREAK = [
    'F#4 .   C#5 G#4 C#5 G#4 C#5 C#5',
    'C#5 -   C#5 -   G#4 -   C#5 -',
    'F#4 C#5 -   -   C#5 -   D#5 G#4',
    'F#4 .   G#4 C#5 G#4 F#4 C#5 -',
    'G#4 -   G#4 F#4 G#4 -   C#5 -',
    'F#4 C#5 -   -   G#4 F#4 G#4 -',
    'G#4 C#5 G#4 C#5 .   C#5 G#4 -',
    'G#4 D#5 G#4 C#5 G#4 -   C#5 -'
  ];
  var LEAD_HOOK = [
    'F#4 .   C#5 G#4 C#5 .   .   .',
    '.   .   .   .   .   .   .   .',
    'F#4 .   C#5 .   D#5 -   G#4 .',
    '.   .   .   .   .   .   .   .'
  ];

  var GUIDANCE = {
    name: 'Guidance-style', bpm: 126, swing: 0.06, key: 'B',
    progression: ['Bmaj9', 'Bmaj9', 'G#m7', 'Emaj7'],
    sends: {
      delay: { type: 'delay', division: '3/16', feedback: 0.42, mix: 1, tone: 2800, hp: 300, pingpong: true },
      reverb: { type: 'reverb', size: 2.4, decay: 0.55, damp: 4500, predelay: 0.015, mix: 1, hp: 220 }
    },
    tracks: [
      { name: 'kick', inst: 'kick', gain: 1.0, params: { tune: 44, punch: 190, sweep: 0.07, decay: 0.3, click: 0.12, drive: 0.45 },
        duck: ['bass', 'stab', 'pad', 'lead'],
        patterns: { A: 'x...x...x...x...', F: 'x...x...x...x.xx', H: 'x.......x.......' } },
      { name: 'sub', inst: 'sub', note: 'B1', gain: 0.55, params: { decay: 0.4, harmonic: 0.15 }, gate: 8, sidechain: { depth: 0 },
        patterns: { A: 'x...x...x...x...', B: 'x...x.x.x...x.x.', O: 'x.............x.' } },
      { name: 'bass', inst: 'bass', note: 'B2', gain: 0.9, gate: 0.8, params: { cutoff: 220, env: 300, res: 3, decay: 0.15, drive: 0.15, sub: 0 },
        chain: [{ type: 'eq3', name: 'eq', low: 2, lowFreq: 200, mid: 0, midFreq: 250, midQ: 1.2, high: -8, highFreq: 1500 }], sidechain: { depth: 0.5, release: 0.2 },
        patterns: { A: '...x...x..x...x.', B: '..x...x.x...x.x.', C: '...x......x...x.' } },
      { name: 'stab', inst: 'stab', chords: true, octave: 4, gain: 0.4, gate: 0.55, pan: 0,
        params: { cutoff: 1500, env: 2400, decay: 0.17, release: 0.09, detune: 11, spread: 0.5, hp: 180 },
        chain: [{ type: 'widener', name: 'width', width: 1.1 }], sends: { delay: 0.15, reverb: 0.1 }, sidechain: { depth: 0.5, release: 0.2 },
        patterns: { A: '..x...xx..x...xx', B: '..x...x...x...x.', C: '..x.......x.....' } },
      { name: 'clap', inst: 'clap', gain: 0.7, params: { tone: 1900, decay: 0.16, tail: 0.3 }, sends: { reverb: 0.25 },
        patterns: { A: '....x.......x...', F: '....x.......x.xx', R: '....x...x.x.xxxx' } },
      { name: 'hat_open', inst: 'hat_open', gain: 0.45, pan: 0.08, params: { decay: 0.26, tone: 7000, ring: 1500, metal: 0.5 }, sends: { reverb: 0.06 },
        patterns: { A: '..x...x...x...x.' } },
      { name: 'hat_closed', inst: 'hat_closed', gain: 0.4, pan: -0.08, params: { decay: 0.055, tone: 7500, metal: 0.4 },
        patterns: { A: '.......x.......x', B: '...x...x...x...x', C: 'x.x..xx...xx..x.', D: 'XxXxXxXxXxXxXxXx', E: 'x.x.x.x.x.x.x.x.' } },
      { name: 'shaker', inst: 'shaker', gain: 0.3, pan: 0.3, params: { tone: 6500, decay: 0.07 },
        patterns: { A: 'XoxoXoxoXoxoXoxo' } },
      { name: 'perc', inst: 'perc', gain: 0.4, pan: -0.3, params: { pitch: 380, drop: 0.5, decay: 0.12 }, sends: { delay: 0.3 },
        patterns: { A: 'x.x..xx.x.xx.xx.', B: 'x.x..x..x.x..x..' } },
      { name: 'lead', inst: 'lead', gain: 0.35, params: { cutoff: 1300, env: 2600, res: 3, decay: 0.22, release: 0.14, detune: 9, glide: 0.035 },
        sends: { delay: 0.35, reverb: 0.18 }, sidechain: { depth: 0.3, release: 0.2 },
        melody: { A: LEAD_BREAK, B: LEAD_HOOK } },
      { name: 'pad', inst: 'pad', chords: true, octave: 3, gain: 0.25, gate: 16, params: { attack: 0.6, release: 1.2, cutoff: 1000, detune: 12 },
        sends: { reverb: 0.4 }, sidechain: { depth: 0.45, release: 0.25 },
        patterns: { A: 'x...............' } },
      { name: 'riser', inst: 'riser', gain: 0.5, params: { from: 300, to: 7000, tone: 0.25 }, sends: { reverb: 0.3 }, patterns: {} },
      { name: 'impact', inst: 'impact', gain: 0.8, params: { tune: 38, decay: 1.4, wash: 0.5 }, sends: { reverb: 0.3 }, patterns: {} }
    ],
    // 200 bars = 6:20 at 126 BPM
    sections: [
      { name: 'intro', bars: 16, play: { kick: 'A', sub: 'A', bass: 'A' },
        set: { 'stab.cutoff': 500, 'kick.level': 1, 'master.hp.cutoff': 24, 'master.lp.cutoff': 20000 } },
      { name: 'intro2', bars: 8, play: { kick: 'A', sub: 'A', bass: 'A', stab: 'C', hat_closed: 'A' },
        ramp: [{ param: 'stab.cutoff', from: 400, to: 900, curve: 'expo' }] },
      { name: 'build', bars: 16, play: { kick: 'A', sub: 'A', bass: 'A', stab: 'B', hat_open: 'A', hat_closed: 'B', clap: 'A' },
        set: { 'clap.level': 0.7 },
        ramp: [{ param: 'stab.cutoff', from: 900, to: 2400, curve: 'expo' }, { param: 'master.hp.cutoff', from: 24, to: 180, bars: [8, 16], curve: 'expo' }],
        fx: [{ bar: 12, track: 'riser', bars: 4 }] },
      { name: 'mainA', bars: 32, play: { kick: 'A', sub: 'A', bass: 'A', stab: 'A', clap: 'A', hat_open: 'A', hat_closed: 'A' },
        set: { 'stab.cutoff': 1500, 'master.hp.cutoff': 24, 'clap.level': 1 },
        fx: [{ bar: 0, track: 'impact' }] },
      { name: 'mainA2', bars: 32, play: { kick: 'A', sub: 'A', bass: 'B', stab: 'A', clap: 'A', hat_open: 'A', hat_closed: 'C', lead: 'B' },
        fx: [{ bar: 28, track: 'riser', bars: 4 }] },
      { name: 'break', bars: 24, play: { kick: 'A', sub: 'A', bass: 'C', stab: 'B', clap: 'A', shaker: 'A', perc: 'A', pad: 'A', lead: 'A' },
        set: { 'kick.level': 0.6, 'stab.cutoff': 900, 'clap.level': 0.6 } },
      { name: 'breakEnd', bars: 8, play: { kick: 'A', sub: 'A', bass: 'C', stab: 'B', clap: 'R', shaker: 'A', perc: 'B', pad: 'A', lead: 'A', hat_closed: 'D' },
        ramp: [{ param: 'master.hp.cutoff', from: 24, to: 500, curve: 'expo' }, { param: 'stab.cutoff', from: 900, to: 3000, curve: 'expo' }],
        fx: [{ bar: 0, track: 'riser', bars: 8 }] },
      { name: 'mainB', bars: 48, play: { kick: 'A', sub: 'A', bass: 'B', stab: 'A', clap: 'A', hat_open: 'A', hat_closed: 'C', lead: 'B' },
        set: { 'kick.level': 1, 'stab.cutoff': 1500, 'master.hp.cutoff': 24, 'clap.level': 1 },
        fx: [{ bar: 0, track: 'impact' }, { bar: 44, track: 'riser', bars: 4 }] },
      { name: 'outro', bars: 16, play: { kick: 'A', sub: 'A', bass: 'A', clap: 'A', stab: 'C' },
        ramp: [{ param: 'stab.cutoff', from: 1500, to: 300, curve: 'expo' }, { param: 'master.lp.cutoff', from: 20000, to: 1200, bars: [8, 16], curve: 'expo' }] }
    ]
  };

  // ------------------------------------------------------------ GUIDANCE_V2 (A7)
  // The re-measured preset (docs/research/2026-10-23-plugin-gear/transcripts/round4-O1.md, sections 1 and 2).
  // GUIDANCE above is the frozen baseline and is not changed. V2 is built as a deep copy and then edited.
  function copy(o) {
    if (o === null || typeof o !== 'object') return o;
    var out = Array.isArray(o) ? [] : {}, k;
    for (k in o) if (o.hasOwnProperty(k)) out[k] = copy(o[k]);
    return out;
  }
  function findTrack(def, name) {
    for (var i = 0; i < def.tracks.length; i++) if (def.tracks[i].name === name) return def.tracks[i];
    return null;
  }
  function findSectionIndex(def, name) {
    for (var i = 0; i < def.sections.length; i++) if (def.sections[i].name === name) return i;
    return -1;
  }

  var GUIDANCE_V2 = copy(GUIDANCE);
  GUIDANCE_V2.name = 'Guidance-style v2';

  // kick: first-order pitch approach 264 -> 51 Hz, tau 0.024 s (O1: f = 51 + 213 e^(-t/24 ms)); no click (measured
  // -45 dB); a 60 ms hold at full level, then decay. decay = 0.36 s is the time from the end of the hold to -80 dB.
  // Fit to the body levels (O1 M2, dB re peak): -6.3 at 100 ms, -17.8 at 150, -33.6 at 200. The model
  // dB(t) = -80 (t - 0.06) / decay gives -8.9, -20.0, -31.1 dB for decay 0.36 (model minus reference: -2.6, -2.2,
  // +2.5 dB; the least-squares value is 0.357 s). The brief's 0.12 would give -60 dB at 150 ms, so it is not used.
  // drive 0.45 is kept until a render test with drive 0 is done (S3's order: envelope and drive first).
  var kick = findTrack(GUIDANCE_V2, 'kick');
  kick.params = { tune: 51, punch: 264, tau: 0.024, hold: 0.06, click: 0, decay: 0.36, drive: 0.45 };
  kick.duck = ['sub', 'bass', 'stab', 'pad', 'lead'];

  // sub: a continuous sine drone (not a pluck), one trigger per bar (gate 16 = whole bar), ducked on every kick.
  // TODO (A7): the reference has B0 (31.0 Hz) in 1 bar of 8. A note track's `notes` list cycles per hit, so a
  // one-hit-per-bar pattern could carry a per-bar list. The bar placement is not measured, so the track stays on C#1.
  // The pattern is one hit per bar: four hits per bar at gate 16 would stack four overlapping drone voices.
  // The four sidechain values are the O1 interim proposal (section 2): depth -15 dB, attack, hold, release.
  var sub = findTrack(GUIDANCE_V2, 'sub');
  sub.note = 'C#1';
  sub.gate = 16;
  sub.params = { mode: 'drone', decay: 0.4, harmonic: 0.15 };
  sub.sidechain = { depth: 0.82, attack: 0.03, hold: 0.08, release: 0.12 };
  sub.patterns = { A: 'x...............' };

  // bass: first guess (S3's order of levers: envelope and drive before slope). Measured pitch is still unknown.
  var bass = findTrack(GUIDANCE_V2, 'bass');
  bass.params = { cutoff: 220, env: 100, res: 3, decay: 0.15, drive: 0, sub: 0 };

  // arrangement: the highs drop at bar 120 inside the break. break (16 bars) keeps bars 104-119, breakLate (8 bars)
  // takes 120-127 with master.lp.cutoff 6000, then breakEnd as before. mainB (bar 136) restores the lowpass, so the
  // highs do not stay down after the break. Section sets persist, so breakLate repeats the break's sets.
  var brkIndex = findSectionIndex(GUIDANCE_V2, 'break');
  var brk = GUIDANCE_V2.sections[brkIndex];
  var late = copy(brk);
  late.name = 'breakLate';
  late.bars = 8;
  late.set = copy(brk.set || {});
  late.set['master.lp.cutoff'] = 6000;
  brk.bars = 16;
  GUIDANCE_V2.sections.splice(brkIndex + 1, 0, late);
  var mainB = GUIDANCE_V2.sections[findSectionIndex(GUIDANCE_V2, 'mainB')];
  mainB.set = mainB.set || {};
  mainB.set['master.lp.cutoff'] = 20000;

  // ------------------------------------------------------------ GUIDANCE_V3 (Ear Crew, round 3)
  // Built from docs/research/2026-10-24-ear-crew/V3-SPEC.md (E1 to E5, the coordinator's rulings of 01:10 and 01:18
  // EDT). A new constant: GUIDANCE and GUIDANCE_V2 are not changed. The track gains are starting values to be
  // re-set from the level table (see the log); A9 scores them.
  var BAR = 4 * 60 / 126;                  // one bar at 126 BPM (1.9047619 s)
  var HIT = { x: { vel: 0.85 }, X: { vel: 1, acc: true }, o: { vel: 0.5 } };

  // a variant from bar strings: each character maps to a cell (map), '.' is an empty step
  function grid(bars, map) {
    var cells = [], b, i;
    for (b = 0; b < bars.length; b++) for (i = 0; i < 16; i++) {
      var m = map[bars[b].charAt(i)];
      cells.push(m ? copy(m) : null);
    }
    return { bars: bars.length, cells: cells };
  }
  // the V3 stab: bars 1 and 2 of each four-bar group hold 12 steps, bars 3 and 4 hold 6 (E2; one gate per track is not enough)
  function stabVariant() {
    var v = grid(['x..........x....', '.x.........x....', '....x..x........', '....x..x........'], HIT);
    for (var i = 0; i < v.cells.length; i++) if (v.cells[i]) {
      v.cells[i].len = (i < 32) ? 12 : 6;
      if (i < 32) v.cells[i].vel = 0.207;   // bars 1 and 2 against bars 3 and 4 (E5 -10 against -3.8), measured three times
    }
    return v;
  }
  // the bass's two-bar variant D (E2 final, LOG 01:10): bar 1 steps 1, 6, 11, 14 soft; bar 2 steps 1, 8, 14 soft and
  // step 11 loud. Step 6 of bar 1 carries a +2/24 step nudge (the ruled late step 6)
  function bassVariant() {
    var v = grid(['.o....o....o..o.', '.o......o..X..o.'], HIT);
    v.cells[6].nudge = 2 / 24;
    return v;
  }
  // the on-beat hat layer (E3 on-beat section, LOG 01:12): X at steps 0 and 8 at 0.85, o at steps 5 and 13 at -3 dB
  function onBeatVariant() { return grid(['X....o..X....o..'], { X: { vel: 0.85 }, o: { vel: 0.6 } }); }

  var GUIDANCE_V3 = {
    name: 'Guidance-style v3', bpm: 126, swing: 0.40, key: 'B',
    progression: ['G#m11f'],
    sends: copy(GUIDANCE.sends),
    tracks: [
      { name: 'kick', inst: 'kick', gain: 0.58,
        params: { tune: 53, punch: 265, tau: 0.022, attack: 0.02, swell: 2, hold: 0.045, decay: 0.45, length: 0.197, harmonic: 0.1,
                  click: 0.05, clickDecay: 0.0015, drive: 0.1 },
        chain: [{ type: 'eq3', name: 'lc', low: 0, lowFreq: 90 }],
        duck: ['sub', 'bass', 'stab', 'pad'],
        patterns: { A: 'x...x...x...x...', G: 'x...x...x.......' } },
      { name: 'sub', inst: 'sub', note: 'C#1', gain: 0.088, gate: 16,
        params: { mode: 'drone', run: 1, attack: 0.005, release: 0.03, harmonic: 0.1, beat: 1.2027, beatLevel: -2.6, beat3: 3.608, beat3Level: -5.8 },
        sidechain: { depth: 0.78, attack: 0.01, hold: 0.08, release: 0.12, curve: 'db' },
        patterns: { A: 'x...............' } },
      { name: 'bass', inst: 'bass', note: 'G#1', gain: 0.305, gate: 0.9,
        params: { wave: 'sawtooth', detune: 4, sub: 0, cutoff: 450, env: 2600, res: 2.5, attack: 0.008, decay: 0.07, release: 0.03, drive: 0.5, glide: 0 },
        chain: [{ type: 'eq3', name: 'eq', low: 2, lowFreq: 200, mid: 0, midFreq: 250, midQ: 1.2, high: -4, highFreq: 1500 }],
        sidechain: { depth: 0.5, release: 0.2 },
        variants: { D: bassVariant() } },
      { name: 'stab', inst: 'stab', chords: true, octave: 3, gain: 0.41, gate: 0.55,
        params: { cutoff: 450, env: 700, res: 1.5, attack: 0.008, decay: 0.07, release: 0.08, detune: 4, spread: 0.8, hp: 150 },
        chain: [{ type: 'widener', name: 'width', width: 1.4 }],
        sends: { delay: 0.15, reverb: 0.1 }, sidechain: { depth: 0.9, release: 0.12 },
        variants: { S: stabVariant() } },
      { name: 'pad', inst: 'pad', chords: true, octave: 3, gain: 0.68, gate: 16,
        params: { attack: 0.3, release: 1.2, cutoff: 2500, detune: 4 },
        sends: { reverb: 0.4 }, sidechain: { depth: 0 },
        patterns: { A: 'x...............' } },
      { name: 'clap', inst: 'clap', gain: 0.296,
        params: { tone: 1500, q: 0.4, decay: 0.12, tail: 0.3, tailDecay: 0.25, flams: 3, flam: 0.011, first: 1 },
        sends: { reverb: 0.25 }, patterns: { A: '....x.......x...' } },
      { name: 'hat_open', inst: 'hat_open', gain: 0.154, pan: 0.08,
        params: { decay: 0.26, tone: 2000, ring: 1500, metal: 0.15, metalHp: 4000 },
        chain: [{ type: 'filter', name: 'lp', mode: 'lowpass', cutoff: 11000, q: 0.7 }],
        sends: { reverb: 0.12 }, patterns: { A: '..x...x...x...x.' } },
      { name: 'shaker', inst: 'shaker', gain: 0.042, pan: 0.3,
        params: { tone: 6500, q: 0.35, attack: 0.028, decay: 0.07 },
        patterns: { G: '...x...x...x...x' } },
      { name: 'shaker_on', inst: 'shaker', gain: 0.083,
        params: { tone: 6000, q: 0.25, attack: 0.035, decay: 0.06, hold: 0.03 },
        variants: { X: onBeatVariant() } },
      { name: 'tick', inst: 'shaker', gain: 0.053,
        params: { tone: 3500, q: 0.3, attack: 0.002, decay: 0.10, hold: 0 },
        patterns: { T: 'x...x...x...x...' } },
      { name: 'burst', inst: 'shaker', gain: 0.035, pan: -1,
        params: { tone: 1400, q: 0.35, attack: 0.004, hold: 0.30, decay: 0.30 }, chain: [{ type: 'decorrelate', name: 'dec' }],
        sends: { reverb: 0.35 }, patterns: { P: ['................', '................', '................', '............x...'] } },
      { name: 'burst_r', inst: 'shaker', gain: 0.035, pan: 1,
        params: { tone: 1400, q: 0.35, attack: 0.004, hold: 0.30, decay: 0.30 }, chain: [{ type: 'decorrelate', name: 'dec' }],
        sends: { reverb: 0.35 }, patterns: { P: ['................', '................', '................', '............x...'] } },
      { name: 'bed', inst: 'riser', gain: 0.9,
        params: { tone: 0, from: 5000, to: 16000, q: 0.3, floor: 0.04, hold: 15 * BAR },   // the rise is the fx (16 bars); the plateau runs to bar 139
        patterns: {} }
    ],
    // 15 sections, 200 bars (E4's table, amended by the rulings; see V3-SPEC section 3.2)
    sections: [
      { name: 'intro', bars: 16, play: { kick: 'A', sub: 'A', hat_open: 'A', burst: 'P', burst_r: 'P' },
        set: { 'kick.lc.low': 0, 'sub.level': 1, 'hat_open.level': 0.002, 'hat_open.lp.cutoff': 3500, 'hat_open.decay': 0.26, 'burst.level': 1, 'burst_r.level': 1 },
        ramp: [{ param: 'hat_open.level', from: 0.002, to: 0.0136, curve: 'expo' }] },
      { name: 'intro2', bars: 8, play: { kick: 'A', sub: 'A', hat_open: 'A', burst: 'P', burst_r: 'P' },
        ramp: [{ param: 'hat_open.level', from: 0.0136, to: 0.035, curve: 'expo' },
               { param: 'hat_open.lp.cutoff', from: 3500, to: 11000, curve: 'expo' },
               { param: 'burst.level', from: 1, to: 2.5, curve: 'expo', bars: [7, 8] },
               { param: 'burst_r.level', from: 1, to: 2.5, curve: 'expo', bars: [7, 8] }] },
      { name: 'build', bars: 16, play: { kick: 'A', sub: 'A', hat_open: 'A', stab: 'S', tick: 'T', burst: 'P', burst_r: 'P' },
        set: { 'kick.lc.low': -2, 'hat_open.level': 0.2, 'hat_open.lp.cutoff': 11000, 'stab.cutoff': 450, 'tick.level': 0.0001, 'burst.level': 1, 'burst_r.level': 1 },
        ramp: [{ param: 'kick.lc.low', from: -2, to: -7, curve: 'lin' },
               { param: 'hat_open.level', from: 0.2, to: 1, curve: 'expo', bars: [0, 15] },
               { param: 'stab.cutoff', from: 450, to: 2400, curve: 'expo', bars: [4, 16] },
               { param: 'tick.level', from: 0.16, to: 1, curve: 'expo', bars: [2, 16] }] },
      { name: 'mainA', bars: 16, play: { kick: 'A', sub: 'A', stab: 'S', clap: 'A', hat_open: 'A', shaker: 'G', tick: 'T', burst: 'P', burst_r: 'P' },
        set: { 'kick.lc.low': 0, 'stab.cutoff': 700, 'hat_open.level': 1, 'hat_open.lp.cutoff': 11000, 'hat_open.decay': 0.26, 'sub.level': 1,
               'clap.level': 1, 'shaker.level': 1, 'tick.level': 1, 'burst.level': 1, 'burst_r.level': 1 } },
      { name: 'mainA_b', bars: 20, play: { kick: 'A', sub: 'A', stab: 'S', clap: 'A', hat_open: 'A', shaker: 'G', shaker_on: 'X', tick: 'T', burst: 'P', burst_r: 'P' } },
      { name: 'mainA2', bars: 12, play: { kick: 'A', sub: 'A', stab: 'S', clap: 'A', hat_open: 'A', shaker: 'G', shaker_on: 'X', tick: 'T', burst: 'P', burst_r: 'P', pad: 'A' } },
      { name: 'mainA3', bars: 16, play: { kick: 'A', sub: 'A', bass: 'D', stab: 'S', clap: 'A', hat_open: 'A', shaker: 'G', shaker_on: 'X', tick: 'T', burst: 'P', burst_r: 'P', pad: 'A' },
        set: { 'bass.level': 0.25, 'hat_open.level': 1, 'sub.level': 1, 'shaker.level': 1 },
        ramp: [{ param: 'bass.level', from: 0.25, to: 1, curve: 'expo' },
               { param: 'hat_open.level', from: 1, to: 0.5, curve: 'expo', bars: [2, 16] },
               { param: 'sub.level', from: 1, to: 0.03, curve: 'expo', bars: [5, 16] },
               { param: 'shaker.level', from: 1, to: 0.22, curve: 'expo', bars: [2, 16] }] },
      { name: 'break', bars: 16, play: { kick: 'A', sub: 'A', bass: 'D', stab: 'S', pad: 'A', clap: 'A', hat_open: 'A', shaker_on: 'X', burst: 'P', burst_r: 'P' },
        set: { 'kick.lc.low': -9, 'sub.level': 0, 'clap.level': 0.2, 'hat_open.level': 0.45, 'hat_open.decay': 0.05, 'burst.level': 1, 'burst_r.level': 1 },
        fx: [{ bar: 4, track: 'bed', bars: 16 }] },
      { name: 'breakLate', bars: 8, play: { kick: 'A', sub: 'A', bass: 'D', stab: 'S', pad: 'A' } },
      { name: 'breakEnd', bars: 7, play: { kick: 'A', sub: 'A', bass: 'D', stab: 'S', pad: 'A', hat_open: 'A' },
        set: { 'sub.level': 0, 'hat_open.level': 0.12, 'hat_open.decay': 0.26, 'stab.cutoff': 700 },
        ramp: [{ param: 'sub.level', from: 0.03, to: 1, curve: 'expo', bars: [2, 7] },
               { param: 'hat_open.level', from: 0.12, to: 0.6, curve: 'expo', bars: [0, 7] },
               { param: 'stab.cutoff', from: 700, to: 1000, curve: 'expo', bars: [0, 7] }] },
      { name: 'gap', bars: 1, play: { kick: 'G', sub: 'A', bass: 'D', stab: 'S', pad: 'A' }, set: { 'sub.level': 1 } },
      { name: 'mainB', bars: 16, play: { kick: 'A', sub: 'A', bass: 'D', stab: 'S', pad: 'A', clap: 'A', hat_open: 'A', shaker: 'G', tick: 'T', burst: 'P', burst_r: 'P' },
        set: { 'kick.lc.low': 0, 'sub.level': 1, 'hat_open.level': 1, 'hat_open.decay': 0.26, 'clap.level': 1, 'shaker.level': 1, 'tick.level': 1,
               'burst.level': 1, 'burst_r.level': 1, 'stab.cutoff': 700, 'bed.level': 1 },
        ramp: [{ param: 'bed.level', from: 1, to: 0.5, curve: 'expo', bars: [0, 3] }] },
      { name: 'mainB_b', bars: 28, play: { kick: 'A', sub: 'A', bass: 'D', stab: 'S', pad: 'A', clap: 'A', hat_open: 'A', shaker: 'G', shaker_on: 'X', tick: 'T', burst: 'P', burst_r: 'P' } },
      { name: 'mainB_c', bars: 4, play: { kick: 'A', sub: 'A', bass: 'D', stab: 'S', clap: 'A', hat_open: 'A', shaker: 'G', shaker_on: 'X', tick: 'T', burst: 'P', burst_r: 'P' },
        set: { 'burst.level': 0.5, 'burst_r.level': 0.5 } },
      { name: 'outro', bars: 16, play: { kick: 'A', sub: 'A', bass: 'D', stab: 'S', clap: 'A', burst: 'P', burst_r: 'P' },
        set: { 'burst.level': 1, 'burst_r.level': 1, 'stab.level': 0.58 },
        ramp: [{ param: 'bass.level', from: 1, to: 0.7, curve: 'expo' }] }
    ],
    // the record's master (V3-SPEC section 4.1, E5): no filter moves, glue and saturator bypassed, the limiter takes the
    // peaks (threshold -1.5, ceiling 0, clip -0.55). Applied by Song.build and by the Host (doc.master).
    master: { hp: { cutoff: 24 }, lp: { cutoff: 20000 }, glue: { bypass: true }, sat: { bypass: true },
              limiter: { threshold: -1.5, release: 0.08, ceiling: 0, clipOn: true, clip: -0.55 } }
  };

  function build(seq, def) {
    def = def || GUIDANCE;
    seq.bpm = def.bpm;
    seq.swing = def.swing || 0;
    seq.progression = def.progression.slice();
    var k, i;
    for (k in def.sends) if (def.sends.hasOwnProperty(k)) seq.addSend(k, def.sends[k]);
    for (i = 0; i < def.tracks.length; i++) seq.addTrack(def.tracks[i].name, def.tracks[i]);
    seq.setArrangement(def.sections);
    // a document's (or a V3) master: the unit's bypass, then its parameters (the Host does the same for documents)
    if (def.master) for (var u in def.master) if (def.master.hasOwnProperty(u) && seq.master.get(u)) {
      var mu = def.master[u];
      if (mu.bypass) seq.master.get(u).bypass(true);
      for (var mp in mu) if (mu.hasOwnProperty(mp) && mp !== 'bypass') seq.setParam('master.' + u + '.' + mp, mu[mp]);
    }
    return seq;
  }

  // the song as an editable document (SongDoc); build(seq, doc) accepts it directly
  function document() { return root.SongDoc.fromLegacy(GUIDANCE); }

  // the V2 preset as an editable document
  function documentV2() { return root.SongDoc.fromLegacy(GUIDANCE_V2); }

  // the V3 song as an editable document (the master settings ride in doc.master, as the Host reads them)
  function documentV3() {
    var d = root.SongDoc.fromLegacy(GUIDANCE_V3);
    d.master = copy(GUIDANCE_V3.master);
    return d;
  }

  root.Song = { GUIDANCE: GUIDANCE, GUIDANCE_V2: GUIDANCE_V2, GUIDANCE_V3: GUIDANCE_V3, build: build, document: document, documentV2: documentV2,
                documentV3: documentV3,
                LEAD_BREAK: LEAD_BREAK, LEAD_HOOK: LEAD_HOOK };
})();
