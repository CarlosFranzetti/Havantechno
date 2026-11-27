/* HVT-106 solo page (106.html): one juno through the real Host and Classics engine and the real HVT-106 panel with its
 * polyphonic step sequencer, booted by the shared framework (solo.js). Five original chord patterns written for this page (no
 * record's part): a step holds a chord as cell.notes (cell.note = the lowest), which the sequencer passes to the juno as ev.notes. */
(function () {
  'use strict';
  var CH = {
    Cm7: 'C3+D#3+G3+A#3', Fm9: 'F2+G#2+D#3+G3', Abmaj7: 'G#2+C3+D#3+G3', Bb6: 'A#2+D3+F3+G3', Gm7: 'G2+A#2+D3+F3',
    Am9: 'A2+C3+E3+G3+B3', Fmaj7: 'F2+A2+C3+E3', Cmaj9: 'C3+E3+G3+B3+D4', G6: 'G2+B2+D3+E3', Em7: 'E2+G2+B2+D3', Dsus2: 'D3+E3+A3',
    Dm7: 'D3+F3+A3+C4', Am7: 'A2+C3+E3+G3', Gsus4: 'G2+C3+D3', Ebmaj7: 'D#3+G3+A#3+D4', Cm9: 'C3+D#3+G3+A#3+D4', Ab: 'G#2+C3+D#3',
    Bbsus4: 'A#2+D#3+F3', Fm7: 'F2+G#2+C3+D#3', Db: 'C#3+F3+G#3', Ebsus2: 'D#3+F3+A#3'
  };
  function line(s) { return s.replace(/[A-G]b?[a-z0-9]*/g, function (t) { return CH[t] || t; }); }
  var PATTERNS = [
    ['Offbeat', '. . Cm7 . . . Cm7 . . . Fm9 . . . Fm9 -'],
    ['Pads',    'Am9 - - - - - - - Fmaj7 - - - - - - - Cmaj9 - - - - - - - G6 - - - Em7 - - -'],
    ['Garage',  'Dm7 . . Dm7 . . Dm7 . . Am7 . . Am7 . Gsus4 .'],
    ['Pulse',   'Ebmaj7 . Ebmaj7 . Ebmaj7 . Cm9 . Cm9 . Cm9 . Bb6 . Ab .'],
    ['Rise',    'Fm7 . . Fm7 . . Db . . Db . . Ebsus2 . Ebsus2 . Cm7 . . Cm7 . . Abmaj7 . . Abmaj7 . . Bbsus4 - - -']
  ];
  Solo.boot({
    title: 'HVT-106', label: 'polyphonic synthesizer', device: 'juno', key: 'C', bpm: 122, bars: 2, kick: 'bd909', drive: false, global: 'HVT106',
    tracks: [{ name: 'juno', type: 'juno', inst: 'juno', kind: 'melody', family: 'keys', gain: 0.8, params: {} }],
    patterns: PATTERNS.map(function (p) { return { name: p[0], variant: line(p[1]) }; }),
    presets: { patch: 'juno', pattern: 'juno' },
    help: 'Tap a step key, then tap keys on the keyboard: with REC lit each key adds or removes a note of that step\'s chord (up to six; Shift adds a major triad). COPY puts the chord on the next step and selects it; REST and TIE act on the selected step; LENGTH switches 16 and 32 steps. Drag a fader; double-tap returns it to the pattern\'s value. Ctrl+Z undoes an edit.'
  });
})();
