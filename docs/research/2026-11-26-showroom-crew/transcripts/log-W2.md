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
