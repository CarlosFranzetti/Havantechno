# W2 log: solo-page framework, HVT-D and HVT-106 pages

Times: Eastern Time (EST), UTC in parentheses.

## 2026-11-26 19:11 ET (2026-11-27 00:11 UTC): start, reading

Read CLAUDE.md, the brief, solo/303.html, solo.js, solo.css, ui/panels.js (all), tools/panels-check.js, tools/solo-check.js,
engine/classics.js, songdoc.js, sequencer.js, host.js (editor extensions, audition).

Findings from the engine:
- `rep` IS played: sequencer.js schedules `rep` retriggers evenly inside the step (dur min(dur, step/rep*0.9)). The HVT-D gets a ratchet (2, 3, 4).
- Variant length: `host.editor().setVariantBars(track, variant, bars, fill)` exists (host.js extendEditor), so 16 or 32 steps is honest.
- `slide` on a cell becomes `ev.slide`; modeld reads it (legato glide). Glide = slide.
- Chords: a cell cannot hold several notes in a way the sequencer plays. A melody track plays `cell.note` only; a chord-kind
  track takes `ev.notes` from the section's progression (one chord per bar), not from the cell. SongDoc's normalizeCell keeps any
  non-null field, so a `notes` array survives in the document, but sequencer.js ignores it. Asked the coordinator (19:20 ET) for a
  one-line change in sequencer.js's melody branch: `if (cell.notes && cell.notes.length) e.notes = cell.notes.slice(0, 6);`
  (juno already plays ev.notes, classics.js 506). Until then the 106 page stores `notes` on the cell plus `note` = the lowest
  note, so it plays the root only (stated on the page).

## Framework entry point (stable from 19:25 ET, 00:25 UTC)

app/solo/solo.js defines the global `Solo`. A page loads the engine and panel scripts, then solo.js, then calls:

```js
var api = Solo.boot({
  title: 'HVT-D',             // document <title> stays the page's; header model name and the start gate's model name
  label: 'mono synthesizer',  // optional, shown small after the model name
  device: 'modeld',           // track name whose panel is shown (host.device('track:' + device)); its track type picks the panel
  tracks: [ /* SongDoc track defs (name, type, inst, kind, family, gain, params, chain) without variants for the device */ ],
  patterns: [                 // the page's stored patterns, pattern i = variant letter A, B, ... (fallback bank when Presets is absent)
    { name: 'Pump', variant: { bars: 1, cells: [...] } },               // a synth: the device track's variant
    { name: 'Beat', voices: { bd808: { bars: 1, cells: [...] }, ... } } // a machine: one variant per track (each track named)
  ],
  section: 'loop',            // default 'loop'; one looping section, bars = the longest pattern
  bpm: 126, swing: 0,         // defaults 120, 0
  kick: 'bd909' | false,      // adds a muted four-on-the-floor track of that type and the Kick button (default false)
  drive: true | false,        // adds a bypassed saturator insert 'drive' on the device track and the Drive slider (default false)
  presets: { patch: 'modeld', pattern: 'modeld' } | false,   // W1's Presets types; feature-detected, controls hidden when absent
  help: 'text under the panel',
  global: 'HVTD',             // window[global] = api (tests)
  onStart: function (api) {}, onFrame: function (api) {}     // optional
});
// api: host(), panel(), engine (string after start: 'worklet' | 'fallback' | 'none'), started(), layout(),
//      pattern(i) selects pattern i, patterns (the list), letters, el (the page nodes by id)
```

The page markup is optional: solo.js builds the header, bar, panel box, help and start gate into <body> when the page has no
`#so-panel` (303.html keeps its markup, which uses the same ids). Layout: Panels.get(key).layouts.portrait under 720 px wide,
else landscape (or the panel's one size).

## 2026-11-26 19:40 to 21:10 ET (2026-11-27 00:40 to 02:10 UTC): build

- 19:45 ET: the coordinator added the chord line to sequencer.js (`if (cell.notes && cell.notes.length > 1) e.notes = cell.notes.slice(0, 6)`),
  so a melody cell `{note: lowest, notes: [...]}` plays the chord on the juno. The 106 is built on it; nothing of mine touches the engine.
- solo.js is now the framework (signature above, unchanged since 19:25 ET). Additions to the bar: Undo and Redo (and Ctrl+Z,
  Ctrl+Shift+Z), and, when `Presets` is loaded, a Patch menu and a Pattern menu (select = load, Save, Copy as text, Paste text; a
  text dialog, no downloads). Page configs: 303.js, d.js, 106.js. 303.html keeps its markup; d.html and 106.html have none (the
  framework builds it).
- panels.js (shared): `P.place(g, dx, dy, s)` (a placed group; the knob readout follows the placement), `keyboard()` now returns
  `{g, shift, offset, mark}` and takes `onNotes` (a sequencer's entry) and a lit colour; `synthSeq(P, cfg)` is the shared mono/poly
  step sequencer; `octaveKeys()` for the shorter portrait keyboards; `chordName()`.
- hvtd: landscape 1400 x 908 (face, sequencer strip, keyboard bed) is also the default size, so a DAW window shows the sequencer;
  portrait 560 x 2082 (three rows of sections, sequencer with 8 keys a row, 20-key keyboard with octave keys).
  Sequencer: REC, BACK, NEXT, REST, TIE, ACCENT (acc + vel 1: the modeld reads velocity), GLIDE (slide), RATCHET (rep 2, 3, 4, off),
  PAGE, LENGTH 16/32 (ed.setVariantBars, repeat-filled), -OCT, -1, +1, +OCT, CLEAR, RUN/STOP. With REC on a key writes the
  selected step and moves to the next; REST and TIE move on too. In a DAW window REC starts off (keys only audition).
- hvt106: landscape 1600 x 800 (default), portrait 560 x 1824 (control + LFO + chorus; DCO + HPF + VCA at 0.94; VCF + ENV).
  Poly sequencer: a key tap adds or removes a note of the selected step's chord (at most six; Shift adds a major triad); keys light
  the selected chord; steps show a chord name (Am, Cm7, Fm9, slash chords, a fifth may be omitted); COPY = chord memory to the next
  step; REST, TIE, PAGE, LENGTH, transpose, CLEAR. Chord entry is by toggling (tap on, tap off), not by holding several keys at once.
- Every sequencer edit is one ed.group = one undo entry, then host.commit (forks a shared variant first, as the 303 does).
- Patterns: original lines written here. HVT-D: Drive, Tied, Ratchet, Climb (32), Glider, Pulse (32). HVT-106: Offbeat, Pads (32),
  Garage, Pulse, Rise (32). No record's line, no maker's marks.
- 20:40 ET: W1's app/engine/presets.js appeared; the three pages now load it (the menus feature-detect the global and hide without it).
- solo.css: menus, dialog, and `touch-action: pan-y` on the panel face with `none` on the controls, so a tall portrait panel still
  scrolls the page while a knob or fader drag does not.

## Files each page fetches (relative to app/solo/)

All three: ../ui/panels.css, solo.css, ../engine/core.js, ../engine/programs.js, ../engine/synths.js, ../engine/drums.js,
../engine/worklets.js, ../engine/classics.js, ../engine/processors.js, ../engine/songdoc.js, ../engine/sequencer.js, ../engine/song.js,
../engine/host.js, ../engine/presets.js, ../ui/panels.js, solo.js, and at start ../engine/worklets/classics-processor.js (loaded by
worklets.js). Then the page's own config: 303.html -> 303.js; d.html -> d.js; 106.html -> 106.js.

## Checks (exit codes read directly)

node app/engine/selfcheck.js 448 OK exit 0; tools/classics-check.js 110 exit 0; tools/panels-check.js 149 exit 0 (was 132);
tools/solo-check.js 115 exit 0 (was 25; now all three pages, the sequencers, ratchet played as three triggers, a chord step reaching
the juno as one trigger with ev.notes, Presets save/load/copy/paste); tools/faces-check.js 2495 exit 0; tools/presets-check.js 1907 exit 0.

Headless Chromium (scratchpad script, Playwright, tools/serve.js on a random port, killed after), 1280 x 800 and iPhone 13, all three
pages: tap starts, AudioWorklet engine, plays, a step edit through the panel changes the document and that step's note or chord
reaches the instrument while playing, track and master meters non-zero, the 106 sounds 6 voices at once on chord steps, no
horizontal overflow, no page or console errors or failed requests. Screenshots: docs/screenshots/solo-{303,d,106}-{desktop,phone}.png.
Seen and fixed: the 106's function keys had dark ink on dark keys (now light); Fm9 without its fifth read "F2+3" (names now allow an
omitted fifth); the pattern menu label "Bank" -> "Pattern".

Not verified: a real phone's touch (only Playwright's emulated tap and dispatched pointer events); the approximate fallback path in a
browser (only the status text path, unchanged from the 303 page); Safari; the Electron window with the new taller HVT-D and HVT-106
panels (windows.js uses the default size, which now includes the sequencer); listening by ear.

## 2026-11-26 21:25 ET (2026-11-27 02:25 UTC): late changes, final runs

- classics.js gained a modeld spec row `priority` (low/last) during the session; panels-check and solo-check failed on it (no
  control). Added a LOW/LAST rocker in the HVT-D's CONTROLLERS (both arrangements).
- Phone bar: the Patch and Pattern menus put the select on its own row with Save, Copy as text and Paste text under it.
- Final: selfcheck 448 exit 0; classics-check 127 exit 0; panels-check 149 exit 0; solo-check 115 exit 0; faces-check 2495 exit 0;
  presets-check 1907 exit 0; browser-check 26 PASS exit 0; the Chromium run of the solo pages ALL OK (44 rows) and the six
  screenshots refreshed.
