/* HVT-D solo page (d.html): one modeld through the real Host and Classics engine and the real HVT-D panel with its step
 * sequencer, booted by the shared framework (solo.js). Six original lines written for this page (no record's line):
 * '!' accent, '~' glide into the next note, '*n' ratchet, '-' tie, '.' rest. */
(function () {
  'use strict';
  var PATTERNS = [
    ['Drive',   'C2 C2 C3! C2 . C2 D#2~ F2 C2 C2*2 C3! . A#1~ C2 G2 F2'],
    ['Tied',    'G1 - - G2! . G1 A#1~ C2 - D#2 . G1*3 G1 . F2~ G2'],
    ['Ratchet', 'D2*2 . D2 . F2! D2*3 . A2~ G2 D2*4 . C3! . A#2~ A2 .'],
    ['Climb',   'E1 E2 E1 G1! E1 A1 E1 B1~ C2 - E1 D2! E1 E2 B1~ G1 ' +
                'E1 E2 E1 G1! E1 A1 E1 B1~ D2 - E1 F#2! E2*3 . D2~ B1'],
    ['Glider',  'A1~ C2~ E2 . A1~ G2 - . A1 A1*2 C2~ D2 . E2! - .'],
    ['Pulse',   'F1 F1 F2! F1 F1 G#1 F1 C2~ F1 F1 F2*2 F1 D#2! F1 C2 G#1 ' +
                'F1 F1 F2! F1 F1 G#1 F1 C2~ A#1 A#1 A#2*3 A#1 G#2! G2~ F2 D#2']
  ];
  Solo.boot({
    title: 'HVT-D', label: 'mono synthesizer', device: 'modeld', key: 'C', bpm: 124, bars: 2, kick: 'bd909', drive: true, global: 'HVTD',
    tracks: [{ name: 'modeld', type: 'modeld', inst: 'modeld', kind: 'melody', family: 'bass', gain: 0.85, params: {} }],
    patterns: PATTERNS.map(function (p) {        // the modeld reads velocity, not the accent flag: an accent is vel 1, as the panel writes it
      var cells = Solo.parse(p[1]).map(function (c) { if (c && c.acc) c.vel = 1; return c; });
      return { name: p[0], variant: { bars: cells.length / 16, cells: cells } };
    }),
    presets: { patch: 'modeld', pattern: 'modeld' },
    help: 'Tap a step key, then play a key on the keyboard: with REC lit the note goes into the step and the next step is selected. REST and TIE also move on; ACCENT, GLIDE and RATCHET (2, 3, 4 repeats) act on the selected step. LENGTH switches 16 and 32 steps, PAGE shows the other 16. Drag a knob up or down; double-tap returns it to the pattern\'s value. Ctrl+Z undoes an edit.'
  });
})();
