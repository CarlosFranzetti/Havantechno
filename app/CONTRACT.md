# Havantechno app: module contract (Build Crew, 2026-10-23)

Read this first. It is the agreement between the modules of the new app so that several people can build them at once. The coordinator owns this file; propose changes in your transcript log, do not edit it.

## What is being built

One codebase that runs two ways:
- **Web:** `app/index.html` served by `node tools/serve.js` (static files plus COOP/COEP headers) or any static server. Plain JavaScript globals, no bundler, no framework.
- **Desktop:** Electron loads the same `app/index.html` (`app/shell/main.js`). Device windows become real child windows there; on the web they are in-page panels. `window.HavantechnoShell` is present only in Electron and exposes file dialogs and child windows.

Views: the **System Editor** (the voted layout) and the **Step View** (same frame, Tab switches), plus **floating device windows**. Design sources: `docs/research/2026-10-23-faceplate-layout/REPORT.md` (sections 3 to 5 and 11), the canvas boards, and the transcripts named in each owner's brief.

## Load order (app/index.html)

```
engine/core.js  engine/synths.js  engine/processors.js  engine/songdoc.js  engine/sequencer.js  engine/song.js
engine/host.js  engine/project.js
ui/theme.css   ui/widgets.js  ui/faces.js  ui/facedefs.js  ui/windows.js  ui/system-editor.js  ui/step-view.js  ui/app.js
```
Every file is an IIFE that reads `root = window` and publishes one global. Style: ES5-ish like the engine (`var`, `function`), `'use strict'`, no classes required, no imports. Nothing throws on a missing AudioContext.

## File ownership (one owner each; touch only your files)

| Owner | Files |
|---|---|
| A1 engine lead | `app/engine/host.js`, `app/engine/project.js`, `app/engine/selfcheck.js` (additions only) |
| A2 widgets | `app/ui/widgets.js`, `app/ui/theme.css` |
| A3 faces | `app/ui/faces.js`, `app/ui/facedefs.js` |
| A4 system editor | `app/ui/system-editor.js` |
| A5 step view | `app/ui/step-view.js` |
| A6 windows and shell | `app/ui/windows.js`, `app/ui/app.js`, `app/index.html`, `app/shell/main.js`, `app/shell/preload.js`, `app/package.json`, `tools/serve.js` |
| A7 audio fixes, instruments | `app/engine/synths.js`, `app/engine/song.js` (add `GUIDANCE_V2`; never change `GUIDANCE`) |
| A8 audio fixes, processors | `app/engine/processors.js` |
| A9 scoring loop | `tools/render.js`, `tools/score.py`, `tools/README.md` |
| A10 checks and docs | `tools/browser-check.js`, `app/README.md` (rewrite), `docs/plans/2026-10-23-desktop-build-plan.md` (status lines only) |

The archived folder `olde Havantechno dub studio/` is frozen. `app/engine/songdoc.js`, `sequencer.js`, `core.js` are not owned this wave: ask A1 in your log if you need a change there and code around it meanwhile.

## Engine facts you can rely on (already built)

- `Sequencer.create(ctx, {bpm, swing, seed})` → `seq` with `addSend`, `addTrack`, `setArrangement`, `play/pause/stop/jump/loop`, `setParam(path, v, o)`, `getParam(path)`, `hold(path)/release(path)/releaseAll()/heldCount()`, `on('step'|'section'|'play'|'stop', fn)`, `pos()`, `scheduleAll`, `describe()`, `hits()`, `dispose()`, `seq.tracks[name]`, `seq.order`, `seq.sends[name]`, `seq.sendOrder`, `seq.master` (chain with `get(name)`), `seq.sections[]` (`name, bars, start, play, set, ramp, fx`), `seq.totalBars`, `seq.analyser` (master).
- A track `tr` has `inst` (synth: `spec`, `params`, `set/get`, `trigger`, `panic`, `out`, `pre`), `chain` (`procs[]`, `byName`, `get(name)`, `set('name.param')`), `sc` (sidechain processor; `sc.node` is its gain), `channel` (`spec`, `params`, `set/get`; `level`, `pan`, `mute`), `sendGains[name]`, `variants[name]` = `{bars, cells}`, `kind` in `drum|note|chord|melody`, `gate`, `note`, `duck[]`.
- Processors expose `type`, `name`, `spec`, `params`, `set/get`, `bypass(b)`, `input`, `output`; compressor and limiter expose `p.node` (DynamicsCompressorNode, `.reduction`); sidechain exposes `p.node.gain`.
- Parameter paths: `track.param`, `track.unit.param` (insert), `track.sc.param`, `track.send.name`, `send.name.param`, `master.unit.param`, `bpm`, `swing`. At most three segments.
- `SongDoc`: `fromLegacy`, `toLegacy`, `save(doc) -> json`, `load(json) -> doc`, `parseVariant`, `formatVariant`, `createEditor(doc)` → `ed` with `doc`, `track(name)`, `section(name)`, `variantUsage`, `setStep`, `setStepInSection(section, track, index, patch, scope)`, `forkVariant`, `setPlay`, `setSectionParam`, `setProgression`, `setTrackParam`, `rename`, `undo/redo/canUndo/canRedo`. A cell is `{vel, acc, len, nudge, note, prob, cond, rep, locks}` or `null`.
- `Song.GUIDANCE` (frozen baseline), `Song.document()`, `Song.build(seq, docOrDef)`.
- `Kit`: `setV, lin, expo, target, val, cancel, disc, clamp, mtof, ntom, mton, chordNotes, noise, impulse, shaperCurve, defineParams`.

## Interfaces to build

### Host (A1) — `window.Host`
The one object the UI talks to. The UI never touches `seq` or the AudioContext directly, so a native engine can replace it later.
```js
var host = Host.create();                 // no audio yet
host.start()                              // creates the AudioContext on a gesture, builds the song; returns Promise
host.loadDocument(doc)                    // (re)builds the sequencer from a SongDoc; keeps transport stopped
host.document()                           // the current SongDoc (the editor's doc)
host.editor()                             // SongDoc editor bound to the current document; after any edit call host.commit()
host.commit()                             // applies the document to the running engine (rebuild or incremental), emits 'document'
host.transport: { play(), pause(), stop(), toggle(), jump(sectionRef), loop(ref|null), rewind(), playing, pos() }
host.setParam(path, v), host.getParam(path), host.hold(path), host.release(path), host.releaseAll(), host.heldCount()
host.devices()                            // [{id, type, kind:'instrument'|'insert'|'send'|'master'|'channel'|'sidechain', track, name, family, spec, pathPrefix, ref}]
host.device(id)                           // one entry; ref is the live engine object (inst or processor)
host.meter(id)                            // {level: 0..1 peak (per frame), reduction: dB or null, correlation: -1..1 or null} from analysers the Host creates
host.sections(), host.tracks(), host.sends(), host.bpm(), host.swing()
host.render({from, to})                   // Promise<AudioBuffer> via Sequencer.render; host.wav(buffer) -> ArrayBuffer
host.on(type, fn) / host.off: 'step' {step, bar, section}, 'section', 'play', 'stop', 'document', 'param' {path, value, source:'ui'|'arrangement'}
```
Family per device type (from F-S4): drums = kick, clap, hat_closed, hat_open, shaker, perc; bass = sub, bass; keys = stab, lead, pad; fx = riser, impact; dynamics = compressor, limiter, sidechain; time = delay, reverb, chorus; tone = filter, eq3, saturator; utility = widener, channel.

Device ids: `track:<name>` (instrument), `track:<name>:<unit>` (insert), `track:<name>:sc`, `track:<name>:channel`, `send:<name>`, `master:<unit>`.

**Host additions (wave 1, accepted by the coordinator; written here in wave 2 by A1).** Build against these:
```js
host.mute(track, b) / host.solo(track, b) -> bool     // M and S; setParam('<track>.mute', b) goes to the same code; host.tracks() lists muted, solo
host.isHeld(path)                                      // true while the path is held
host.transport.loopSection                             // property: the looped section's name or null (also pos().loop); there is no 'loop' event
host.transport.pos() -> {step, bar, section, sectionName, barInSection, playing, loop}
host.meter('master')                                   // the final output (after the master chain), with correlation; master:<unit> ids also give correlation
host.meter(id) -> {level, peak, reduction, correlation} // peak is unclamped; the first call for an id attaches the analyser and reads 0
                                                       // reduction: compressor/limiter from p.node.reduction, sidechain from its gain (dB)
host.started(), host.dispose(), host.totalBars(), host.describe(), host.analyser() (master AnalyserNode or null)
host.engine()                                          // the running Sequencer: tools and the self-check only, never the UI
```
- **The document holds knob values.** `host.setParam(path, v)` applies the value live and writes it into the document (`track.params`, `track.gain`/`pan`, `track.chain[i]`, `track.sidechain`, `track.sends`, `doc.sends[name]`, `doc.bpm`/`swing`, and `doc.master[unit][param]`, which the Host applies after `Song.build`). Mute is session state and is not stored. A rebuild and a save therefore keep knob values.
- **Channel send levels.** The channel device's `spec` is the channel spec plus one entry per send, keyed `'send.<name>'` (`{min: 0, max: 1.5}`), so `pathPrefix + '.' + param` is `<track>.send.<name>`, which `setParam` and `getParam` accept.
- **Commit.** `'document'` carries `{reason: 'start'|'load'|'commit', rebuilt}`. Step, variant, section and progression edits are applied in place (`rebuilt: false`); anything else rebuilds, keeping position, play state, loop, held paths, mute and solo. Device `ref`s change on every rebuild: refetch `devices()` on `rebuilt: true`.
- **Release.** `host.release(path)` returns the path to the latest section `set` at or before the playhead at once and emits `'param'` with source `'arrangement'`.
- **Editor additions** on `host.editor()`: `group(fn)` (several operations, one undo step), `setFx(section, index|null, patch|null)`, `setVariantBars(track, variant, bars, fill)`; in `songdoc.js` (wave 2): `addTrack(def, index)`, `removeTrack(name)` (also clears the track's play, fx, duck, set and ramp references).
- **Audio (sampler, see "Sampler" below).** `host.loadAudio(source, {id, name, src}) -> Promise<bufferId>` (a `File`, `Blob`, URL string, `ArrayBuffer`, typed array, or the shell's `{name, path, bytes}`; a missing entry with the same file name is relinked); `host.audio() -> [{id, name, src, duration, sampleRate, channels, loaded, missing, usedBy}]`; `host.buffer(id) -> AudioBuffer|null` (for the waveform hero); `host.unloadAudio(id)` (the document keeps the reference while a track uses it); `host.reloadAudio({shell, base}) -> Promise<{loaded, missing}>`; `host.audioReady()` (the reload started by `create`, `loadDocument(doc, {shell, base})` or `start`); `host.addSampler(source, {name, family, pattern}) -> Promise<trackName>` (loads, adds the track, commits). Event `'audio'` `{id, status: 'loaded'|'missing'|'unloaded'}`. A track's `family` field in the document overrides the device family; samplers default to `drums`.
- **Project.** `Project.open({shell, host})` also loads the song into `host` (with the project's folder as `base` for relative audio paths) and resolves after the audio reload; without `host` it resolves the parsed document as before. Extras: `Project.restoreAsync`, `savedAt`, `clearAutosave`, `appDataPath`, `fileName`. The file is `{app: 'havantechno', format: 1, savedAt, song}`.

### Project (A1) — `window.Project`
```js
Project.serialize(doc) -> json string; Project.parse(json) -> doc        // SongDoc.save/load plus {app:'havantechno', savedAt}
Project.save(doc, {shell}) -> Promise<{name, path?}>   // Electron: shell.saveFile dialog; web: download <name>.havantechno.json
Project.open({shell}) -> Promise<doc|null>              // Electron: shell.openFile; web: <input type=file>
Project.autosave(doc) / Project.restore() -> doc|null    // localStorage on the web, shell app-data in Electron
```

### Widgets (A2) — `window.Widgets`
Hand-written, SVG for knobs and sliders, Canvas only for redrawn displays. Every control is a real focusable element with `role="slider"`, `aria-valuenow/min/max`, keyboard arrows (Shift = fine), vertical drag (Shift = fine), double-click = home value, wheel. 24 px minimum target; 44 px in the floating window density.
```js
Widgets.knob({label, min, max, value, unit, log?, size:'chip'|'strip'|'face'|'window', onInput(v), onHold?(), onRelease?()}) -> {el, set(v), setState('set'|'ramp'|'held'|null)}
Widgets.slider({...same, orientation:'h'|'v'}) -> same
Widgets.toggle({label, value, onInput}) -> {el, set}
Widgets.select({label, options:[...], value, onInput}) -> {el, set}
Widgets.steps({count:16, cells, onToggle(i), onDrag(i, vel), ink}) -> {el, set(cells)}          // one 16-step row
Widgets.meter({orientation, size}) -> {el, set(level0to1, peakHold?)}
Widgets.curve({width, height, draw(ctx2d, w, h)}) -> {el, redraw()}   // Canvas; redraw() called by the drawing loop
Widgets.grMeter, Widgets.correlation (small)       // optional, if time allows
```
State markers are shapes only (F-S4/F-S5): filled dot = set at section start, arc = ramp running, open ring = held. Colours come from `theme.css` custom properties: `--bg --panel --panel-raised --line --fg --dim --on --arm --solo --brand` and per family `[data-fam=drums|bass|keys|fx|dynamics|time|tone|utility] { --fam-ink --fam-dim --fam-wash }` with the hex values in `docs/research/2026-10-23-faceplate-layout/transcripts/round1-FS4-visual-system.md` (section 6). Brand pink only on the wordmark and Play.

### Faces (A3) — `window.Faces`
```js
Faces.define(type, layout)   // layout: {hero(ctx2d, w, h, device, host)?, sections:[{title, params:[names], widget:'knob'|'slider'|'toggle'|'select'}], width:{strip, face, window}, height:{...}}
Faces.render(device, density, host) -> {el, update(), dispose()}     // density 'chip' | 'strip' | 'face' | 'window'
Faces.has(type); Faces.fallback(device, density, host)              // generic: every spec param as a slider/select/toggle
```
`device` is a `host.devices()` entry. Every control writes `host.setParam(device.pathPrefix + '.' + param, v)` and calls `host.hold(path)` on drag start (release via "re-enable arranged", not on drag end). `update()` pulls values from `host.getParam` and marks set/ramp/held from `host`'s section data and `heldCount`. `facedefs.js` defines all 23 devices (13 instruments, 9 processor types, channel) with one hero graph each, drawn from parameters (plus `host.meter(id)` for compressor, limiter, sidechain and the master meter). Unplaced spec params go to a "more" drawer. Chips: glyph + name only. Face lint: a function `Faces.lint(host)` returning problems (params named in a layout that are not in the spec; spec params unreachable).

### Windows (A6) — `window.Windows`
```js
Windows.open(deviceId, host) -> win; Windows.close(id); Windows.toggleAll(); Windows.tile(); Windows.cascade()
Windows.link: 'off'|'single'|'multi' (default 'single': one window follows host selection); Windows.pin(id, bool)
Windows.onSelect(deviceId)      // called by views when the selected track or device changes
```
Each window: title bar (family glyph, name · family, preset menu placeholder, bypass or track Mute, Editor | Controls toggle, Link control), body = `Faces.render(device, 'window', host)` (Controls view = `Faces.fallback`), footer (focused value, section state, key hint). Size and position remembered per device id in localStorage. In Electron, `HavantechnoShell.openDeviceWindow(id)` opens a real child window loading `index.html?device=<id>`; `app.js` detects `?device=` and renders only that window's face bound to the opener's host via `window.opener.Host`-free messaging: the child calls `window.opener.HavantechnoBridge` (A6 defines a tiny bridge object in `app.js` that forwards `setParam/getParam/meter/devices` and events). On the web, windows are absolutely positioned draggable panels inside `#windows`. `V` toggles hide-all.

### System Editor (A4) — `window.SystemEditor`
`SystemEditor.mount(el, host) -> {update(), dispose(), select(trackName)}`. Board 1 of the canvas, amended: control bar (view switch handled by app.js; transport, BPM, swing, bar·step·section, A/B placeholder disabled, master meter, Export WAV, Re-enable arranged (n)); overview strip; proportional section ruler with loop brace and playhead; thirteen compact rows under four collapsed stem-group headers (DRUMS kick clap hat_closed hat_open shaker perc; BASS sub bass; OTHER stab lead pad; FX riser impact): 4 px family rail, glyph chip, name, M, S, meter, 16-step row of the current section, nine section cells with the variant letter; one device row for the selected track: PATTERN face (16 steps, variant chips), synth face, inserts, channel, then RETURNS (delay, reverb) and MASTER chips pinned right. Clicking a device title opens its window via `Windows.open`. Rows and cells read `host.document()`; editing is in the Step View, but the step row here toggles steps through `host.editor().setStepInSection(...)` + `host.commit()`.

### Step View (A5) — `window.StepView`
`StepView.mount(el, host) -> {update(), dispose(), select(trackName)}`. Board 7 of the canvas and `round5-FS5-step-view.md`: same shell as the System Editor (app.js provides the control bar and ruler; both views mount below them); each row's body is the one-bar step grid of the viewed bar (bar selector 1..n of the section, loop ghosts for shorter patterns); the right column is the variant-letter strip with "used n"; the bottom band is the Step Editor of the selected track with lanes VEL, GATE, NOTE (note and melody tracks), PROB, NUDGE, and LOCK lanes added from a "+ lane" menu; cell gestures: click toggles, drag sets velocity, Shift-click accent, lanes drag, double-click clears; the variant chip menu forks on first edit of a shared variant (scope radio: this section only / all n sections). All writes go through `host.editor()` then `host.commit()`.

### App (A6) — `app/ui/app.js`
Builds the frame: control bar with the view switch (System Editor | Step View | Mixer drawer placeholder), mounts the current view, routes `host.on('step')` to the drawing loop, one `requestAnimationFrame` loop calling `view.update()` and `Windows.update()` at most 60 fps and the meters each frame, keyboard: Space play/pause, Tab switch view, V hide windows, Cmd/Ctrl+S save, Cmd/Ctrl+O open, Cmd/Ctrl+Z undo. Start gate: an overlay button "Start audio" calls `host.start()`. Autosave after edits (debounced 1.5 s) via `Project.autosave`.

### Shell (A6) — Electron
`app/package.json` with `"main": "shell/main.js"`, `electron` as a devDependency, scripts `start`, `web` (`node ../tools/serve.js`). `main.js` creates the BrowserWindow for `index.html`, handles IPC for `openFile`, `saveFile`, `appDataPath`, `openDeviceWindow(id)` (child BrowserWindow, `parent` set, remembers bounds). `preload.js` exposes `HavantechnoShell` through `contextBridge`. If `npm install` cannot download Electron in the sandbox, say so in the log and leave the code ready.

### Audio fixes (A7, A8)
Everything stays backward compatible: new parameters get defaults that reproduce today's sound, so `node app/engine/selfcheck.js` (schedule equivalence) keeps passing and the archived render stays the baseline. A7: kick `tau` (exponential approach via `setTargetAtTime`), `hold` (hold-then-decay amplitude), keep `sweep` working as before when `tau` is 0; sub `drone` mode (continuous voice following per-bar notes, no pluck) with `pluck` remaining the default; hat `metalHp` parameter (default today's 3.5 kHz) and a `choke` flag honoured by the sequencer later; chorus-friendly stab (`spread` unchanged). Add `Song.GUIDANCE_V2`: a copy of GUIDANCE with the re-measured presets from `docs/research/2026-10-23-plugin-gear/transcripts/round4-O1.md` (kick punch ~264, tune ~51, tau 0.024, click 0; sub as a C#1 drone with B0 once in eight, in the kick's duck list with depth ~0.82, hold 0.08, release 0.12; bass env lowered and drive before the filter if A7 adds a `drivePos` param; section change at bar 120). A8: delay `loop` switch (filters inside the feedback path; default off), `modRate`/`modDepth`; `reverb` gains an `algo: 'ir'|'freeverb'` option with a native-node Freeverb (8 combs + 4 allpasses, RT60 from `size`, lengths scaled by sampleRate/44100; default stays `'ir'`) and a seeded IR (`seed` param) so renders are repeatable; chorus `base` (ms, default today's) and `invert`; widener `monoBelow` (Hz, default 0 = off); sidechain `curve: 'lin'|'db'` and retrigger-from-current-value. Each new node type must get a stub in the fake context if the self-check needs it (none expected: these use gain, delay, biquad, convolver, shaper only).

### Scoring loop (A9)
`tools/render.js`: Playwright (Chromium at `/opt/pw-browsers/chromium`, library at `/opt/node22/lib/node_modules/playwright`) serves `app/` and renders section WAVs through `Host.render` into `tools/out/`. `tools/score.py`: numpy/scipy; given a WAV and the reference MP3 path (decoded with ffmpeg at `/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux` or `ffmpeg` if present), prints O1's measures: tempo, band energies per section relative to 20–300 Hz, LUFS (K-weighting from libebur128's published constants, labelled approximate), true peak (4× oversampled), L/R correlation per band at step onsets, the kick pitch glide fit, and the sub duck profile. Document the method per measure in `tools/README.md` and mark anything you could not verify.

### Checks (A10)
`tools/browser-check.js`: Playwright opens the web app, clicks Start audio, Play, switches to Step View, opens one device window, edits a step, saves to a blob, and fails on any page error or console error; prints a short report. Rewrite `app/README.md` for what exists at the end of the wave (ask the others' logs for what they shipped). Update only the status lines in the build plan.

## Logs and communication

Each owner keeps `docs/research/2026-10-23-build-crew/transcripts/log-<ID>.md` and appends as they work: decisions, interface questions addressed to another owner as `**To A3:** ...`, answers as `**From A3 to A2:** ...`, what shipped, what is unfinished, verification run and its output. Read every other log when you start and again before you finish; adopt or answer what is addressed to you. Do not edit another owner's files or log. Do not commit; the coordinator commits after each wave and runs the checks.

## Verification before you report

- Engine owners: `node app/engine/selfcheck.js` passes (193 checks or more).
- UI owners: `node --check` on every file you wrote, and a Node smoke test of your module with a fake `document` if you can (a tiny `tools/<module>-check.js` is welcome), or a Playwright run with `tools/browser-check.js` once it exists.
- Say in your log exactly what you ran and what it printed. If you could not verify something, say so; never report it as working.

## Sampler (wave 2; PRD D8, plan milestone 5b)

Sample-based elements of a provided track stay samples. The sampler is an instrument like any other, so steps, locks, probability, conditions and repeats apply unchanged, and the sequencer does not change.

**Instrument** (`app/engine/synths.js`, owner A7): `Synths.create(ctx, 'sampler', opts)`. Params, each a spec entry `{min, max, value, unit}` except the two strings:
`buffer` (string: a buffer id from the document's `audio` map, '' = silent), `start` and `end` (0..1 of the buffer, `end` 0 = whole), `pitch` (−24..24 semitones, playbackRate = 2^(pitch/12)), no own gain (coordinator ruling, wave 2: the sampler uses the common instrument `level` like every instrument), `attack` and `release` (seconds), `loop` (0|1), `choke` (string group name, '' = none; a trigger stops every live voice of the same group in any sampler instance, through a per-context registry `Synths.chokeGroups(ctx)`), `reverse` (0|1, later). `opts.getBuffer(id)` is the Host's resolver and returns an `AudioBuffer` or null; the instrument never loads files itself. `trigger(t, ev)` plays one `AudioBufferSourceNode` per hit through a gain envelope; the pitch offset comes from `ev.midi` (the sequencer sends `midi`, not `note`, on note and melody tracks): semitones = `ev.midi` − 48 (C3). Every voice is in `inst._live`; `panic()` and `dispose()` stop them. Locks work on every numeric param.

**Host and document** (owner A1): `host.loadAudio(source) -> Promise<bufferId>` where `source` is a `File`, a `Blob`, a URL string or an `ArrayBuffer`; decodes with `ctx.decodeAudioData`, stores the `AudioBuffer` in the Host's buffer table and writes `doc.audio[bufferId] = {name, src, duration, sampleRate, channels}` (a reference, never bytes; `src` is the path or URL when known, else the file name). `host.audio()` lists the table; `host.unloadAudio(id)` removes it. The Host passes `getBuffer` to every sampler it builds and rebuilds samplers on load. `SongDoc` save/load carries `audio` and a track `type: 'sampler'`; `Project.open` on a document whose `audio` entries have a `src` the shell can read reloads them, otherwise it lists them as missing and the track plays silent. In Electron the shell reads `src` paths through `HavantechnoShell`'s existing file API; on the web, missing sources wait for the user to re-add the file. `Host.create` with no audio must still work in Node (fake context: `decodeAudioData` and `createBufferSource` stubs in selfcheck, A1).

**UI** (A4, A5, later in wave 2): a sampler track row looks like any track; the PATTERN face shows the step grid; the sampler face (A3) shows the waveform with start/end handles as its hero and the params below. Adding a sampler track: drop an audio file on the track list or use the track menu.

**Checks**: `tools/synths-check.js` gains sampler cases (A7); `app/engine/selfcheck.js` gains a save/load round trip with an `audio` map and a sampler track (A1). Parameter names above are the contract; say so in your log if one must change, and why.
