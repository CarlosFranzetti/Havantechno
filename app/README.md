# app/

The next Havantechno: a desktop DAW (Electron shell) built on the Web Audio engine from the archived studio. The plan is `docs/plans/2026-10-23-desktop-build-plan.md`; the decisions behind it are in `prd.md` section 6b.

```
app/
  engine/      core.js, synths.js, processors.js, sequencer.js, song.js — the audio engine, started as a byte-identical
               copy of "olde Havantechno dub studio/" so that folder stays the regression baseline. selfcheck.js runs
               the engine in Node with a fake AudioContext: node app/engine/selfcheck.js
```

Milestone 1 (in progress) turns the song into an editable, saveable document with a per-step record. Later milestones add the device list and face registry, the Electron shell, the System Editor and Step View, the Gear Crew audio fixes, and the remix pipeline.

Rules: faces and the arrangement both write parameters through `seq.setParam(path)` (three path segments at most); the song changes only through named edit operations on one document; every milestone keeps `node app/engine/selfcheck.js` passing.
