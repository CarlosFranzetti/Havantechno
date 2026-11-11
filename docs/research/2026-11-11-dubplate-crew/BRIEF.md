# Dubplate Crew brief: import a track, analyse it, save it as a project, A/B it

Written by the coordinator, 11 November 2026 (ET). Roadmap batch 4; PRD D9 to D13.

## The owner's words

8 November: "when an Audio file is imported for deconstruction and analysis I will immediately want it saved after analysis as a project file and I always want the ability to a/b it with the recreated project." And: "I want the daw to then load up its own existing recreations of those synths for each sound it's isolated and placed on the daw or suggest an existing plugin for that sound."

PRD D13: "an imported audio file becomes a saved project immediately after analysis, with the original on an audio track and the recreation beside it; A/B with level match is always available."

## What exists

- `app/analysis/` (`Analysis.report.element/stem/shared/table`), `tools/analyze.js`, `tools/separate.py` (HT-Demucs default): Lab Crew, `docs/research/2026-11-09-lab-crew/REPORT.md`. Every score there is on the engine's own renders; nothing is validated after separation.
- Instruments the analysis can suggest: 27 drum voices (`Drums`), `tb303`, `modeld`, `juno` (`Classics`), `fm`, the sampler with programs. `Host.loadAudio`, `Host.addSampler`, `Project.save/open/pickAudio/pickFiles`.
- `tools/analysis-truth.js` renders the engine's own instruments with labels: the test bed for anything that claims to read notes or steps out of audio.

## What to build

1. **Reference track and A/B (D1).** A project can hold one reference: the original audio. It plays in sync with the transport, outside the master chain. A/B switches what is heard between the song and the reference without a click and without moving the playhead; level match sets the reference's gain so both read the same loudness.
2. **Import (D1).** One call takes an audio file and, when available, its stems; registers the file as the reference; estimates tempo; runs the analysis on each stem or band; stores the report in the document; builds tracks from the suggested recreations with a first-pass pattern read from the audio (drum onsets to steps, mono lines to notes); and saves the project at once.
3. **The import and A/B interface (D2).** An "Import track…" entry, progress while it works, a report view (one row per element: what it is, each decision with its confidence, what was loaded, with a control to change the recreation), an A/B control in the transport with a key, a level-match control and readout, and a reference lane with the file's waveform above the tracks.
4. **Separation from the app, and truth on a mix (D3).** In the Electron shell, run `tools/separate.py` on the imported file and report progress, so the owner does not need a terminal; in the browser the owner drops the stems. In `tools/render.js`, the labels sidecar and sampler option L2 specified (`log-L2.md` section 10), so a rendered song carries its own truth and an import of that render can be scored.

## Frozen interface (D1 builds it, D2 and D3 build against it; change only through the coordinator)

```js
// document
doc.reference = { audio: '<buffer id in doc.audio>', gain: 1, offset: 0 }   // offset in seconds: reference time of bar 1 beat 1
doc.analysis  = { version: 1, source: {name, duration, sampleRate}, bpm: {value, confidence}, elements: [ {id, name, stem, band, decisions, recreation, track} ], separator: {...}|null, unverified: [strings] }

// Host
host.reference() -> null | {id, name, duration, gain, offset, ready}
host.setReference(source|null, {gain, offset}) -> Promise<bool>     // source as host.loadAudio takes; one undo step; null removes
host.setReferenceParam('gain'|'offset', v)                           // live, stored in the document
host.ab() -> 'song' | 'reference';  host.ab('song'|'reference'|'toggle') -> the new state; emits 'ab' {state}
host.matchLevel({section}) -> Promise<{gainDb, songLufs, referenceLufs}|null>   // sets doc.reference.gain
host.analysis() -> doc.analysis or null
host.analyze(stems, {onProgress}) -> Promise<analysis>               // stems: [{name:'drums'|'bass'|'other'|'vocals'|string, source}] or [{name:'mix', source}]
host.applyRecreation(elementId, recreation|null) -> bool             // swap or remove the track built for an element; one undo step

// Importer (new file app/engine/importer.js, global Importer; D1)
Importer.tempo(buffer) -> {bpm, confidence, offset}
Importer.steps(buffer, {bpm, offset, bars}) -> {bars, cells}         // onsets quantised to sixteenths, with velocity
Importer.notes(buffer, {bpm, offset, bars}) -> {bars, cells}         // mono pitch track to cells with note, len, slide
Importer.build(analysis, {buffers}) -> {tracks:[track defs], sections:[...]}

// Project
Project.importTrack({file, stems, shell, host, onProgress}) -> Promise<{doc, saved:{name, path?}, analysis}>
```

`onProgress({stage: 'decode'|'separate'|'tempo'|'analyse'|'build'|'save', done, total, note})`.

Shell (D3): `HavantechnoShell.separate(path, {model}) -> Promise<{stems:[{name, path}], model, log}>` with `HavantechnoShell.onSeparateProgress(fn)`; rejects with a readable message when Python or the model is missing. Absent in the browser.

## Ground rules

- One owner per file. D1: `app/engine/host.js`, `project.js`, `songdoc.js`, `importer.js` (new), `app/engine/selfcheck.js` (additions), `tools/importer-check.js` (new), the Host and Project sections of `app/CONTRACT.md`. D2: `app/ui/import-view.js` and `import-view.css` (new), `app/ui/app.js`, `app/index.html`, `tools/import-view-check.js` (new); in `app/ui/system-editor.js` only the reference lane and the menu entry, marked with a comment. D3: `app/shell/main.js`, `app/shell/preload.js`, `tools/render.js`, `tools/separate.py`, `tools/README.md`. Nobody edits `app/analysis/` (ask in your log) or the archived studio.
- Never run git stash, checkout, reset or clean in the shared tree. No commits: the coordinator verifies and commits.
- Copyrighted audio stays out of the repository. Tests use the engine's own renders (`tools/analysis-truth.js`, `tools/render.js`); the owner's reference file is in the coordinator's scratchpad and is not to be copied.
- Say what is measured and what is a guess. A step or note read from audio is a first pass: score it against truth renders and report the fraction right. Carry the analysis's confidences through to the document and the interface; never show a guess as a fact.
- A/B must not click, must not change the playhead, and the reference must bypass the master chain. Level match must say what it measured.
- Every existing check keeps passing (`node tools/*-check.js`, `node app/engine/selfcheck.js`, `node tools/browser-check.js`); run each directly and read the exit code.
- Fake contexts: `selfcheck.js` has a fake AudioContext; new node types need stubs there.
- Log as you go in `transcripts/log-D<n>.md` (Eastern Time with UTC in parentheses); rulings the coordinator gives you in messages are quoted in your log when you receive them. Hand back in 20 lines: what was built, check counts with exit codes, what you measured, what is not verified.

## Roster

| Id | Role | Model |
|---|---|---|
| D1 | engine: reference, A/B, level match, Importer, `Project.importTrack` | Opus |
| D2 | interface: import flow, report view, A/B control, reference lane | Opus |
| D3 | shell separation, `render.js` labels | Sonnet |
| coordinator | verification, rulings, commits | this session |
