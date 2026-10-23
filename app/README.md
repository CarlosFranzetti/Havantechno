# app/

The next Havantechno: a desktop DAW (Electron shell) built on the Web Audio engine from the archived studio. The plan is `docs/plans/2026-10-23-desktop-build-plan.md`; the decisions behind it are in `prd.md` section 6b.

```
app/
  engine/      core.js, synths.js, processors.js, sequencer.js, song.js — the audio engine, started as a byte-identical
               copy of "olde Havantechno dub studio/" so that folder stays the regression baseline. selfcheck.js runs
               the engine in Node with a fake AudioContext: node app/engine/selfcheck.js
```

Milestone 1's engine work is done: `songdoc.js` (global `SongDoc`) holds the song as a document with a sparse step record per cell (`vel, acc, len, nudge, note, prob, cond, rep, locks`), parses the readable string forms and formats plain variants back to them, saves and loads JSON (`v: 1`), and edits through `SongDoc.createEditor(doc)` (copy-on-write variant forks, undo/redo). The sequencer schedules from cells, applies parameter locks per voice, uses a seeded hash for probability, and skips held parameter paths (`seq.hold(path)`). `Song.document()` converts the Guidance data; `Song.build(seq, doc)` accepts a document directly. The self-check proves the new engine schedules every trigger identically to the archived one. Later milestones add the device list and face registry, the Electron shell, the System Editor and Step View, the Gear Crew audio fixes, and the remix pipeline.

Load order: `core.js` → `synths.js` → `processors.js` → `songdoc.js` → `sequencer.js` → `song.js`.

Rules: faces and the arrangement both write parameters through `seq.setParam(path)` (three path segments at most); the song changes only through named edit operations on one document; every milestone keeps `node app/engine/selfcheck.js` passing.
