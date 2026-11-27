/* HVT-303 solo page (303.html): one tb303 through the real Host, Sequencer, Classics engine and the real HVT-303 panel, booted
 * by the shared framework (solo.js). Six original acid-style lines written for this page (no record's line). */
(function () {
  'use strict';
  var PATTERNS = [
    ['Pump',    'A1 . A1 A2! . A1 G1~ A1 A1 . C2 A1 . A2! E2~ D2'],
    ['Squelch', 'A1~ A1 A1! . C2~ D2 . A1 A1 A2! G2~ E2 . A1 C2! .'],
    ['Climb',   'E1 E1 E2! E1 G1 E1 A1~ B1 E1 . E2! D2~ B1 G1 A1! .'],
    ['Hop',     'C2 C3! C2 . C2~ C3 . A#1 C2 C3! . G2~ F2 D#2 C2 .'],
    ['Space',   'A1! . . A1 . . D2~ C2 . A1! . . G1~ A1 . .'],
    ['Run',     'D2 D2 F2 D2! A2~ D2 C3! D2 D2 F2 D2 A#1~ C2 D2! F2 E2~']
  ];
  var api = Solo.boot({
    title: 'HVT-303', label: 'bass line', device: 'tb303', key: 'A', bpm: 126, kick: 'bd909', drive: true, global: 'HVT303',
    tracks: [{ name: 'tb303', type: 'tb303', inst: 'tb303', kind: 'melody', family: 'bass', gain: 0.9, params: {} }],
    patterns: PATTERNS.map(function (p) { return { name: p[0], variant: p[1] }; }),
    presets: { patch: 'tb303', pattern: 'tb303' },
    help: 'Tap a step, then a note key. ACCENT, SLIDE, REST, DOWN and UP act on the selected step. Drag a knob up or down; double-tap returns it to the pattern\'s value.'
  });
  api.lines = PATTERNS;
})();
