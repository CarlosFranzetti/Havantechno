# app/

The next Havantechno: a desktop DAW (Electron shell) built on the Web Audio engine from the archived studio. The same `app/index.html` runs in a browser and in Electron. The plan is `docs/plans/2026-10-23-desktop-build-plan.md`; the decisions behind it are in `prd.md` section 6b; the module contract is `app/CONTRACT.md`.

## Status at head 55f205d (2026-10-24)

Written from the owner logs (`docs/research/2026-10-23-build-crew/transcripts/log-A1.md` to `log-A11.md`, `log-coordinator.md`) and from my own runs of every check at 00:08 on head 55f205d. Every wave-2 code item is committed (log-coordinator, 2026-10-24 00:07). A9's wave-2 re-score is still in progress: `log-A9.md` has no wave-2 entry yet, so the scoring numbers below are the wave-1 numbers.

The status table below is still the 2026-10-24 table. It does not cover the sampler, the drum machines or the fm instrument, which were built on 2026-11-09 (see the Sampler, Drum machines and fm sections). Its rows have not been re-audited.

Each status row names the owner and the log it comes from. "Gap" means the owner's own stated gap, or a gap I found while checking.

## Folder layout

```
app/
  CONTRACT.md          module contract and file ownership (coordinator owns it)
  README.md            this file
  index.html           the web page and the Electron page (load order is here)
  package.json         Electron shell: "start" runs electron, "web" serves the repo
  engine/              audio engine, song document, host and project file (plain globals, no bundler)
  ui/                  views, widgets, faces, device windows, app frame (plain globals)
  analysis/            element classifier (Lab Crew, batch 3, in progress; plain globals)
  shell/               Electron main process (main.js) and preload (preload.js)
  node_modules/        electron 45.0.0 and its dependencies (from npm install; git-ignored)
tools/
  serve.js             static server for the repo root, COOP/COEP headers, port 8000
  browser-check.js     headless Chromium smoke test of the web app (26 checks)
  *-check.js           one Node check per UI and engine owner (see Checks)
  drums-score.js       scores the drum voices against the manuals' tables (see Drum machines)
  render.js            offline render of song sections through the page (Playwright)
  score.py             measures a render against the reference (numpy, scipy)
  README.md            scoring loop: options, methods, what is unverified
  out/                 generated renders (git-ignored)
```

## Run the web app

From the repo root:

```
node tools/serve.js            # port 8000; PORT=9000 or node tools/serve.js 9000 to change it
```

Open `http://localhost:8000/app/index.html`. Click "Start audio": browsers start audio only after a click. Keys, from `app/ui/app.js`:

- Space plays and pauses. Tab switches between the System Editor and the Step View; Alt+1 / Alt+2 and Ctrl/Cmd+1 / Ctrl/Cmd+2 switch directly.
- V hides or shows the device windows. Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redoes.
- Ctrl/Cmd+S saves a `<name>.havantechno.json` file (a download on the web). Ctrl/Cmd+O opens one (a file picker on the web). The browser autosaves to localStorage.

## Run the desktop app

```
cd app
npm install
npm start                      # electron . with shell/main.js
```

`npm start` loads the same `index.html` through the `havantechno://app/` scheme. Set `HAVANTECHNO_URL=http://localhost:8000/app/index.html` before `npm start` to load the dev server instead. Device windows are real child windows there. `window.HavantechnoShell` exists only in Electron (`shell/preload.js`).

Electron 45.0.0 has been run on Linux under Xvfb by A6 (log-A6.md, wave 2 parts 2 to 4): child windows, retargeting, bypass, `readFile`, `pathForFile`. It has not been run on macOS or Windows. On 2026-11-09 A6 also ran `shell.readText` and `shell.openFiles` under Xvfb, with the native dialog stubbed in the main process (log-A6.md, batches 1 and 2).

## Checks

Run each command directly and read the exit code. Do not pipe them through `tail` or `grep`, which hides the exit code (log-coordinator.md, wave 1 rule).

The table below holds results from runs made by A15 on 2026-11-11, read directly. The working tree was head `9ade5c2` with uncommitted edits to `app/engine/drums.js`, `app/index.html` and `app/ui/windows.js`, and untracked Patch Crew files (`app/engine/worklets/`, `app/ui/panels.js`, `app/ui/panels.css`). The results therefore describe that tree, not a commit. Other agents were editing `drums.js` during these runs. The drums check gave 342 where the coordinator expected 341 (see the note under the table). No check failed, so none was re-run.

| Command | Result on 2026-11-11 (A15) | Exit | What it covers |
|---|---|---|---|
| `node app/engine/selfcheck.js` | `OK: 392 checks passed` | 0 | Engine in Node with a fake AudioContext: schedule equivalence with the archived studio, string round trip, save and load, audio map, sampler tracks, programs (regions, undo, WAV metadata, reload), detectPitch, pickFiles and SFZ includes, Host and Project, chase on jump, undo per gesture, bypass, offline render chunks |
| `node tools/synths-check.js` | `OK: 169 checks passed` | 0 | Instruments: kick, sub, hats, the sampler on the single-buffer and program paths (keys, layers, round robin, loops, choke, polyphony, SFZ, WAV metadata, pitch detection, name parsing), the `fm` instrument, `level` and stab `hp` at the event time |
| `node tools/drums-check.js` | `OK: 342 checks passed` | 0 | The 27 drum voices: types and specs, silent without a context, voice registration and `panic`, hat chokes, parameter clamping, the metal bank and filter centres, kick pitch tracks and hold, step levels, the 909 sampled-voice fallbacks. Structure and ranges only, not sound |
| `node tools/system-editor-check.js` | `OK: 97 checks passed` | 0 | System Editor on the real Host and widgets: one undo entry per drag, folder, multi-file and SFZ entry points, the "TR-808 kit", "TR-909 kit" and "Drum voice…" menu entries |
| `node tools/faces-check.js` | `OK: 2495 checks passed` | 0 | Faces: 54 definitions including the 27 drum voices and `fm`, the sampler face, `Faces.lint` (0 problems, 16 notes), knob home values, every drum voice rendered at window density |
| `node tools/step-view-check.js` | `OK: 72 checks passed` | 0 | Step View on the real Host, follow, deferral during gestures, fx and pattern length |
| `node tools/processors-check.js` | `OK: 92 checks passed` | 0 | Processors, with automation of the pre-existing parameters identical to the archive; master limiter clip, widener, sidechain curve, Freeverb, chorus |
| `node tools/widgets-check.js` | `OK: 157 checks passed` | 0 | Widgets on a fake DOM, including gesture phases start, move, end |
| `node tools/analysis-check.js` | `OK: 36 checks passed` | 0 | The element classifier (`app/analysis/`) on synthetic and rendered sounds: synth or sample, reverb presence and RT60, pre-delay, shared reverb sends |
| `node tools/browser-check.js` | `RESULT: PASS (26 checks)` | 0 | Headless Chromium on `app/index.html`: globals, Start audio, Play, transport advances, Step View, device window from its title (`Windows.open` called), a step toggled, Save, no page or console errors, no HTTP 4xx or 5xx for app files |
| `python3 tools/score.py --selftest` | not run by A15 this pass; last recorded on 55f205d: `OK: all selftest checks passed` | - | Synthetic checks of the scoring measures |
| `node tools/render.js --page app --sections mainA --bars 16` | not run by A15 this pass; last recorded on 55f205d: 16 bars in 5.94 s, no page errors | - | Offline render through `Host.render` into `tools/out/` |

Note on drums: the coordinator's last run gave 341. A15's run gave 342 with exit 0. The second drum fitting pass is still editing `drums.js` and `drums-check.js` (coordinator, 2026-11-11), so the count may move again.

These checks use fake DOMs and fake audio contexts where stated in their logs. They do not listen to anything.

## Sampler

A sampler track plays audio from the song document. It has two forms: a single buffer (one file, played as it is) and a program (a set of zones that map keys and velocities to regions of one or more files). The contract is `app/CONTRACT.md`, "Sampler" and "Sampler programs". The builder logs are `docs/research/2026-11-09-box-crew/transcripts/log-A1.md`, `log-A3.md`, `log-A4.md`, `log-A6.md` and `log-A7.md`.

### Adding a sampler track

- **Drop on the track list in the System Editor.** One audio file gives a plain sampler track named after the file. Several audio files, or a folder, give one sampler track whose program is mapped from the file names. An `.sfz` file gives a program track: the SFZ is imported, and its samples come in with it when they are dropped together (log-A4.md, batch 1).
- **The "+ track" menu:** "Sampler track from file…", "Sampler track from folder…" and "Import SFZ…" (log-A4.md, batch 1). The folder entry uses the shell's `openFiles` in Electron (log-A6.md, batch 2) and a folder input on the web.
- A new sampler track has family `drums` and an empty step pattern (log-A4.md; CONTRACT, Host section). It is silent until steps are toggled.

From code, after Start audio: `host.addSampler(file, {name, family, pattern})` adds a track, and `host.importProgram(sfzFile, {files, path})` imports an SFZ (CONTRACT, Host section).

### What a program holds

A program (`doc.programs[id]`) is JSON. Its regions carry these parts (log-A7.md; CONTRACT, "Sampler programs"):

- **Key and velocity zones.** Each region has `lokey`, `hikey`, `lovel` and `hivel`, a root key, `tune`, `transpose`, `pan` and `gain`.
- **Round robins.** `seq` and `seqLen` cycle through regions that share a key range in turn. `lorand` and `hirand` pick at random. In the Chromium check of the program path, three round-robin regions gave an exact 0.1, 0.2, 0.3 cycle (log-A7.md, R6).
- **Loops.** `loop` is `none`, `oneshot`, `continuous` or `sustain`, with loop points in frames of the original file. A crossfade (`xfade`) is baked into the buffer; the Chromium check measured the loop seam at 23 dB without it and under 0.1 dB with it (log-A7.md, R3).
- **Envelopes.** Delay, attack, hold, decay, sustain and release. Decay and release are dB-linear. The −90 dB floor is a named constant and an assumption (log-A7.md, "Decisions").
- **Filter.** Off, lowpass, highpass, bandpass, notch, lp24 or hp24, with cutoff, resonance, key and velocity tracking and an envelope.
- **LFOs and vibrato, choke groups, polyphony.** `off_by` chokes a group (a closed hat fades an open one in 6 ms in the check), `poly` and `note_polyphony` steal voices (log-A7.md; synths-check section 10).
- **SFZ.** Import and export round-trip the regions exactly (log-A7.md). Opcodes the engine does not play are kept verbatim in `extra` and written back (log-A7.md, "Corrections").

### Auto-mapping

Files are mapped by name first, then by pitch (log-A7.md; log-A1.md, follow-ups).

- Name: `Snare rr3.wav` gives snare with round robin 3; `Piano C4 v100.wav` gives key 60 at velocity 100; `kick_v127_rr2.wav` gives kick, velocity 127, round robin 2 (synths-check section 10, checked on 2026-11-11).
- Pitch: when the name gives no key, the root comes from YIN pitch detection (`Programs.detectPitch`). The result is stored on the audio entry as `analysis`, and `autoMap` reads its `root`. A prototype found pitch within 3 cents on 41 to 1046 Hz tones (REPORT.md, section 3; not re-run).

### What the project stores

The project file stores references to audio files, never the audio bytes. `doc.audio[id]` holds `{name, src, duration, sampleRate, channels}`, and `src` is the path, the URL or, when nothing else is known, the file name (CONTRACT, Sampler; log-A1.md, decision 1). Programs are stored in the project as JSON under `doc.programs`, with region edits on the undo stack (log-A1.md, batch 1). A song with no samples has no `audio` key.

A reference whose bytes are not loaded is missing. Its track plays silence. `Project.missing(host)` lists what a loaded project could not find (CONTRACT, Host section). A missing entry with the same file name is relinked when the file is added again (CONTRACT, Host section). In Electron, a stored path is read again; on the web, a bare file name cannot be read again, so the user adds the file.

### The sampler face

The face (log-A3.md, batch 1) has:

- A hero: the waveform of the selected region (or the single buffer), with offset and end handles, loop handles, a crossfade wedge and a playhead. The playhead reads `inst._lastHit`, which the engine sets on each hit (log-A7.md).
- At window density, a zone map of 128 keys by 127 velocities. Round-robin siblings are stacked, missing buffers are hatched, and a click selects a region (shift-click adds). Dragging an edge of a selected region edits its key or velocity range, one undo step per gesture.
- A region panel (root, key and velocity range, tune, gain, pan, crossfade, round robin, group, loop, overrides). Edits apply to every selected region as one step.
- Buttons: Load SFZ, Map folder, Slice, Export SFZ, Re-detect pitch.
- Sections SOURCE, AMP, FILTER, LFO and VOICE, a program select, and a quick view at face and strip density.

### Unverified

- **No real sample library has been loaded.** The owner has not supplied one (REPORT.md, section 5; section 6, decision 3).
- **Nobody has heard a sampler program.** The Chromium checks in log-A7.md measure pitch, seam, choke and round-robin numbers, not sound.
- **Real pointer drags** on the zone map and the waveform handles. The face was tested with simulated events in Node (log-A3.md, "Not verified").
- **The native file dialogs** (open, save and multi-file pick in Electron). A6 ran `openFiles` under Xvfb with the dialog stubbed (log-A6.md, batches 1 and 2). The browser's folder picker and a real folder drop have not been run; A4's check fakes the directory entries (log-A4.md, "Not verified").
- **The WAV `smpl` and `acid` layouts and the −90 dB envelope floor** are assumptions, kept as named constants (log-A7.md; REPORT.md, section 5).

## Drum machines

The TR-808 and TR-909 recreations are in `app/engine/drums.js` (global `Drums`). They use the same instrument API as the synths.

### Adding them

- **"TR-808 kit"** from the "+ track" menu adds nine tracks: bd, sd, cp, ch, oh, cb, lt, mt, ht. **"TR-909 kit"** adds eleven: bd, sd, cp, ch, oh, lt, mt, ht, rs, cr, rd. Each kit is one undo step, and its tracks sit under DRUMS with empty patterns (log-A4.md, batch 2).
- **"Drum voice…"** is a submenu that lists every voice with a name (for example `bd808 · Bass drum 808`) and adds one track of that type (log-A4.md, batch 2).

### The voices

There are 27 voice types: 16 for the TR-808 and 11 for the TR-909 (log-A12.md).

- TR-808: `bd808 sd808 cp808 ch808 oh808 cy808 cb808 lt808 mt808 ht808 lc808 mc808 hc808 rs808 cl808 ma808`
- TR-909: `bd909 sd909 lt909 mt909 ht909 rs909 cp909 ch909 oh909 cr909 rd909`

The voice names are the ones the faces check printed on 2026-11-11.

### How they are built

- **808 metal bank:** six Schmitt-trigger squares at 205.3, 369.6, 304.4, 522.7, 800 and 540 Hz, at 47.98 % duty, as one PeriodicWave per context, through band-passes and high-passes. The cowbell uses only the 800 and 540 Hz pair (log-A12.md; REPORT.md, section 3, from Werner's papers).
- **808 kick:** a 1 ms pulse into a bridged-T, with a centre-frequency shift at the start of the hit (log-A12.md).
- **909:** the kick, snare, toms, rim and clap are synthesised. The 909 hats, ride and crash are rendered once per context into buffers by plain JavaScript DSP (log-A12.md, "Notes on behaviour"). The 909 constants come from the read source of andremichelle/tr-909 (log-A12.md; see the licence note under Unverified).
- **Accent:** on the 808 an accented hit is full scale and an unaccented hit is 1/ratio of it. The 909 takes `ev.step` 0, 1, 2 for weak, normal and accent at −18, −9 and 0 dB (log-A12.md, third pass).

### Where the values come from, and what marks them

Each parameter row in the spec has a `basis`: `manual`, `paper`, `source` or `prior` (log-A12.md, third pass).

- `manual`: the Roland TR-808 service notes (check table, page 14) and the TR-909 Service Notes of 1984. The owner uploaded both, and B2 and B3 read them page by page (log-coordinator.md, 04:32 to 04:37 on 2026-11-09; B2-808.md, B3-909.md). The 909 scans are low resolution, and illegible values were left unresolved, not guessed (log-coordinator.md, 04:36).
- `paper`: the Werner papers (DAFx-14 and ICMC 2014), CC BY (REPORT.md, section 3).
- `source`: constants read from andremichelle/tr-909 (AGPL-3.0-or-later) with file and line in the code comments.
- `prior`: a guess or a by-ear value. Every `prior` control shows a small dotted ring on its face, with no text, and the spec label as its hover title (log-A3.md, batch 2).

### First score against the manuals

`node tools/drums-score.js` renders each voice on the page and compares it with the manuals' tables. Its tolerances are 5 % for periods and partials, 15 % for decay and pitch (log-A9.md). In run 3, on `drums.js` at commit 9cbb0dc, it gave **PASS 61, FAIL 44, INFO 12, ERR 0 (117 rows)** (log-A9.md, "Table (run 3)").

The main failures, by cause (log-A9.md; log-coordinator.md, 04:48): the 808 hats, cymbal, cowbell and clap decay to 1/10 are 26 to 47 % short of the table; bd808 at minimum decay runs 101 ms against 50 ms; the 808 toms read 5 to 9 % sharp, which is partly the measurement window; the 909 step ladder is off; the 909 clap burst count depends on the noise seed. The 808 normal-hit levels for hats, cymbal, cowbell and clap sit about 15 to 20 dB below the others. A9 measured that and handed the fix to A12.

**A second fitting pass is in progress.** A12 began iteration 2 on 2026-11-09. The owner paused the crew at 04:48 ET, and the pass is still running on 2026-11-11, with `drums.js`, `drums-check.js` and `drums-score.js` being edited. Run 3 predates it. A15 did not re-run the scorer.

### Unverified

- **Nothing has been compared with a real TR-808 or TR-909 by ear.** No reference hits have been supplied, and the scores compare numbers from the manuals, not recordings (REPORT.md, section 5; section 6, decision 1).
- The drum checks test structure, ranges, chokes and timing. They do not test sound.
- The 909 values from andremichelle/tr-909 are not yet recorded in `THIRD_PARTY.md`, which lists no entries (see Unverified, licence provenance).

## fm

The `fm` instrument (`app/engine/synths.js`, A7, log-A7.md) is two sine operators. The modulator runs at a ratio of the note and drives the carrier's frequency. The index follows Chowning's convention (depth = index × modulator Hz), so sidebands sit at carrier ± n × modulator. `indexEnv` blends a constant index and the modulator's envelope. Feedback is a one-period delay approximation, not the DX algorithms. The carrier has its own ADSR and glide, and the instrument is polyphonic. Its face shows the Bessel sideband spectrum and both envelopes (log-A3.md, batch 2). The synths check passed 169 on 2026-11-11, including section 11 for fm (above). A Chromium offline check with carrier 440 Hz, ratio 0.5 and index 2 gave power at 220, 660 and 880 Hz and −120 dB off-grid (log-A7.md). Nobody has listened to it.

## Offline render and export

`Sequencer.render` renders the song offline (`OfflineAudioContext`). Since wave 2 it renders in two-bar chunks: it schedules the first two bars, then calls `suspend` once per bar to schedule up to two bars ahead and resume (log-A1.md, part 2, decision 1). Voices that have ended are disposed between chunks, so the render graph stays small. `Sequencer.render(build, {chunked: false})` keeps the old path, which schedules the whole range before rendering. The Export WAV button calls `Host.render` for the whole song and then `host.wav()`, which encodes 16-bit PCM (`app/ui/app.js`, `doExport`).

Render time, headless Chromium in this sandbox, 44.1 kHz, `Host.create().render({from: 0, to: N})` (log-A1.md, part 2, table; log-A11.md, measured before the change):

| Bars | Before, up front | After, chunked | RMS before / after |
|---|---|---|---|
| 4 | 0.58 s | 0.8 to 0.9 s (noise) | 0.33603 / 0.33602 |
| 16 | 4.6 s (A11: 4.3 s) | 2.4 to 2.7 s | 0.37361 / 0.37361 |
| 48 | 115 s (A11: 111.6 s) | 13.1 to 13.4 s | 0.38448 / 0.38437 |

The maximum per-bar RMS difference at 48 bars is 0.0011. Both paths use `Math.random` for noise and the reverb impulse, so no two renders are sample-identical even on the old path (log-A1.md, part 2). The trigger list is identical on the fake context, checked over 12 bars (self-check section 7).

My own run on 55f205d: `node tools/render.js --page app --sections mainA --bars 16` rendered 16 bars in 5.94 s (7.0 s including Chromium start). A9's wave-1 measurement of the same case was 16.9 s, taken before the change (log-A9.md, "Render length and wall time").

**Not measured.** A full 200-bar export after chunking. The largest case anyone timed is 48 bars (13 s). The earlier estimate of "3 to 4 minutes" for 200 bars is for the pre-chunk engine (log-A9.md). Nobody has timed a full export since the change. The full song's Export WAV has been run only with a 4-bar render (log-A6.md, known problems, before the change).

## Scoring loop

`tools/render.js` renders sections through the page into `tools/out/`, and `tools/score.py` measures the render and the reference with the methods of the research (O1 M1 to M9, S3, S4). The options, the method of each measure and what is unverified are in `tools/README.md`. The wave-1 scores are in log-A9.md: loudness within 0.05 LU of O1's table on all seven sections, and true peak within 0.01 dB. The wave-2 re-score is pending. The drum scorer (`tools/drums-score.js`) is separate and is described under Drum machines.

## Module map

One line per module, from `app/CONTRACT.md`:

| Module | Role |
|---|---|
| `engine/core.js` | `Kit` helpers (`setV`, `lin`, `expo`, `target`, `defineParams`, `mtof`, noise and shaper utilities). Byte-identical to the archive. |
| `engine/synths.js` | Instruments from `Synths.create(ctx, type, opts)`: `trigger`, `set`/`get`, `panic`, `dispose`. Includes the sampler (not listed in `Synths.types()`), the program path, and `fm`. `Synths.create` falls back to `Drums` for drum types. |
| `engine/programs.js` | `Programs`: sampler programs as plain data. SFZ parse and write, the name parser, auto-map, slicing, YIN pitch detection and WAV metadata. Pure: no AudioContext, runs in Node (header of the file; log-A7.md). |
| `engine/drums.js` | `Drums`: 27 TR-808 and TR-909 voice recreations with the `Synths` instrument API. The 808 metal bank is one PeriodicWave per context. The 909 hats, ride and crash are rendered once into buffers (header of the file; log-A12.md). |
| `analysis/dsp.js`, `analysis/features.js`, `analysis/decide.js` | `Analysis` (Lab Crew, batch 3, in progress): signal helpers, measurements on one element, and one decision function per classification, loaded in that order. The decision thresholds are starting values to be calibrated (file headers; `docs/plans/2026-11-09-roadmap.md`, status). |
| `engine/songdoc.js` | `SongDoc`: the song as one JSON document, sparse step cells, variant parsing, save and load (`v: 1`), the audio map, programs, and an editor with undo per gesture. |
| `engine/sequencer.js` | `Sequencer`: lookahead scheduler, tracks, sends, parameter paths, holds, the arrangement chase, chunked offline `render`, `wav`. Events carry `step` and `hit` for round robin. |
| `engine/song.js` | `Song.GUIDANCE` (frozen), `Song.GUIDANCE_V2`, `Song.document()`, `Song.documentV2()`, `Song.build(seq, docOrDef)`. |
| `engine/host.js` | `Host`: the one object the UI talks to (transport, parameters, devices, meters, document and editor, bypass, audio, programs, render). |
| `engine/project.js` | `Project`: serialize, parse, save, open with the host, `pickAudio`, `pickFiles`, `importProgram`, autosave and restore. |
| `engine/selfcheck.js` | Node self-check of the engine and the Host (392 checks). |
| `ui/widgets.js`, `ui/theme.css` | `Widgets` (knob, slider, toggle, select, steps with gesture phases, meter, curve) and the colour tokens. |
| `ui/faces.js`, `ui/facedefs.js` | `Faces`: the face registry, the device definitions (the sampler, `fm`, the 27 drum voices and the processors), `Faces.lint`, the fallback. |
| `ui/system-editor.js` | `SystemEditor`: the System Editor view (ruler, rows, device row, drops, the "+ track" menu, the drum kits). |
| `ui/step-view.js` | `StepView`: the Step View (step grids, variant strip, step editor lanes, follow). |
| `ui/windows.js` | `Windows`: device windows (in-page panels on the web, child windows in Electron), link modes, tile, cascade. |
| `ui/app.js` | Frame, control bar, view switch, keys, the start gate, open, save, export, relink. |
| `index.html` | Page skeleton and the script load order. |
| `shell/main.js`, `shell/preload.js` | Electron main process and the `HavantechnoShell` bridge (dialogs, `readFile`, `readText`, `openFiles`, `pathForFile`, device windows). |
| `package.json` | Scripts `start` and `web`; `electron` 45.0.0 as a dev dependency. |
| `tools/serve.js` | Static server for the repo root with COOP and COEP headers. |
| `tools/browser-check.js` | Headless Chromium smoke test of the web app. |
| `tools/drums-score.js` | Scores the drum voices against the TR-808 check table and the TR-909 derived values (log-A9.md). |
| `tools/render.js`, `tools/score.py`, `tools/README.md` | Scoring loop. |

## Status

Every row is "shipped" (the module is in the repo, its check passes on 55f205d, and its owner's log reports it as done) or "shipped, with gaps" where the owner's log lists gaps. The gaps are the owner's own, unless marked otherwise. The table is as of 2026-10-24 (see the note under the heading at the top).

| Module | Owner | Status | Owner's stated gaps | Source |
|---|---|---|---|---|
| `engine/core.js` | archive copy | shipped | none | log-coordinator (byte-identical check, wave 1) |
| `engine/songdoc.js` | A1 | shipped | none stated | log-A1.md part 2 (undo per gesture, refused `setStep`, fork letters, `ed.group`, `setFx`, `setVariantBars`) |
| `engine/sequencer.js` | A1 | shipped, with gaps | a 200-bar export after the chunked render is not run | log-A1.md part 2 |
| `engine/song.js` | A7 | shipped, with gaps | sub B0 bar unmeasured (kept at C#1 with a TODO); lowpass restore kept at bar 136, bars 128 to 135 unmeasured | log-A7.md; log-coordinator 23:43 rulings |
| `engine/synths.js` | A7 | shipped, with gaps | sub per-bar notes not added; `choke` on hats not added (ruled later, with the sampler); V2 drone glide off; kick `drive` 0 vs 0.45 not rendered; sampler `reverse` accepted and does nothing; choke fade reads `gain.value`, so it may differ from the audible level by one render quantum; no real `AudioBuffer` in the unit checks | log-A7.md, "Not done", wave 2 and the follow-up |
| `engine/processors.js` | A8 | shipped, with gaps | exponential IR envelope not done; buffer swap on `'ir'` size, decay and hp changes may click (`'freeverb'` avoids it); Freeverb is a biquad-damped approximation, not gain-matched to the IR; offline acceptance tests (RT60, tail slope, correlation) not run; sidechain `offset` and Dattorro not done; widener `monoBelow` stays 0 until the song sets it; Freeverb CPU not measured; nothing has been listened to | log-A8.md, "Not done" |
| `engine/host.js` | A1 | shipped, with gaps | Electron paths and a real file input in a browser are not verified by A1 | log-A1.md parts 1 and 2; log-A6.md wave 2 part 3 |
| `engine/project.js` | A1 | shipped, with gaps | native dialogs and `pickAudio` in Electron not run (A6 traced them); the web file input was run in Chromium by A6 | log-A1.md part 2; log-A6.md wave 2 part 4 |
| `engine/selfcheck.js` | A1 | shipped | none stated (337 checks pass on 55f205d; 392 on 2026-11-11) | log-A1.md part 2; my run |
| `ui/widgets.js`, `ui/theme.css` | A2 | shipped, with gaps | contrast of the neutral marker against each family wash not checked; held ring and some step cells smaller than 24 px; track-colour muted palette not implemented; knob rounding without `step`; no real-browser touch test | log-A2.md, "Unfinished" and wave 2 |
| `ui/faces.js`, `ui/facedefs.js` | A3 | shipped, with gaps | hero figures are the owner's reading of the engine, not measured; live meters tested only with stub data and zeros in the browser; no touch, keyboard-in-browser or screen-reader test; the stab hero shows a fixed example chord; hero end points are draggable only on the sampler; window sizes are hints | log-A3.md, "Unfinished" and wave 2 parts 2 and 3 |
| `ui/system-editor.js` | A4 | shipped, with gaps | never run in a real browser (fake DOM only, so the real pointer path is not driven); overview box drag, right-click variant cycling and progression editing not built; the bar a System Editor edit uses is read at click time (A11 S2, minor, not reported fixed) | log-A4.md, "Not done" and wave 2; log-A11.md S2 |
| `ui/step-view.js` | A5 | shipped, with gaps | drag to paint, length drag, inspector, right-click menu, marquee, copy and paste, 2-bar view not built; lane order and collapse not remembered across a reload; follow with live audio in a browser not checked; fx and pattern-length controls checked in the fake DOM only | log-A5.md, "Not done" and wave 2 |
| `ui/windows.js` | A6 | shipped, with gaps | Mixer drawer, A/B and preset menus are disabled placeholders; no screenset memory; no cap on windows; bounds persistence across launches not tested; Electron checks on Linux under Xvfb only; A11's unverified suspicions (two linked windows if `Windows.open` is called twice before the first child registers; a crashed child's listeners stay on `host`) not checked | log-A6.md, "Known problems"; log-A11.md, "Unverified suspicions" |
| `ui/app.js` | A6 | shipped, with gaps | the same placeholders; the position readout updates every step, which screen readers may announce often; `Project.restoreAsync` prefers app data over a newer localStorage copy (A11 suspicion, not checked) | log-A6.md; log-A11.md |
| `index.html`, `package.json`, `shell/main.js`, `shell/preload.js`, `tools/serve.js` | A6 | shipped, with gaps | Electron on Linux under Xvfb only; macOS and Windows not run; native open and save dialogs not run | log-A6.md parts 2 to 4; log-A1.md part 2 |
| `tools/browser-check.js` | A10 | shipped, with gaps | web app only: no audio is heard, no Electron run, no sampler drop, no System Editor drag | log-A10.md; my run |
| `tools/render.js`, `tools/score.py`, `tools/README.md` | A9 | shipped, with gaps; wave-2 re-score pending | band levels read 1 to 2 dB above O1's table (method not identified); stab-step correlation not reproduced; kick glide fit unreliable on renders; tempo octave by a documented choice; renders differ by up to 15 LSB at the same seed; the true-peak filter is an approximation (scipy `resample_poly`); no listening | log-A9.md, "Open items" |
| `tools/synths-check.js`, `processors-check.js`, `widgets-check.js`, `faces-check.js`, `system-editor-check.js`, `step-view-check.js` | A7, A8, A2, A3, A4, A5 | shipped | the checks use fake DOMs or fake contexts where their logs say so | each owner's log, "Verification" |

## In progress

A Patch Crew is adding `tb303` and `modeld` synths and hardware-style panels. Its brief is `docs/research/2026-11-11-patch-crew/BRIEF.md`. This README does not document them further.

## What is unverified

Nobody has run these. Each is listed so that nobody reads the green checks as more than they are.

- **Drum sounds against real machines.** No TR-808 or TR-909 hit has been compared by ear or with a recording. The first score (PASS 61, FAIL 44) compares numbers from the manuals (log-A9.md, run 3). A second fitting pass is in progress and is not reflected in that score (log-coordinator.md, 04:48 on 2026-11-09; the coordinator's message on 2026-11-11).
- **The sampler's sound and real libraries.** No real sample library has been loaded. Nobody has heard a sampler program (REPORT.md, section 5; log-A7.md).
- **Real pointer drags** on the sampler's zone map and waveform handles, and in the System Editor (log-A3.md; log-A4.md; log-A5.md).
- **The native file dialogs in Electron** (open, save, `Project.pickFiles` and `openFiles` with the real dialog) and the browser's folder picker. A6 ran `openFiles` under Xvfb with the dialog stubbed (log-A6.md, batch 2); the browser folder picker and the folder drop have not been run by anyone (log-A4.md).
- **A 200-bar export after the chunked render.** The largest case timed is 48 bars (13 s). The Export WAV button was run only with 4 bars, before the change (log-A6.md; log-A1.md part 2).
- **Electron on macOS and Windows.** Electron has run on Linux under Xvfb only (log-A6.md).
- **Hearing the processor changes.** A8's changes (delay loop and modulation, Freeverb, chorus, widener, sidechain curve) are checked for defaults only. Nobody has listened to them or measured their output (log-A8.md).
- **Live audio in the views.** The Step View's follow and the System Editor's drags were checked in the fake DOM (log-A4.md, log-A5.md). Nobody has run them with audio playing in a browser.
- **Hearing the fm instrument** and the sampler's choke fade and pitch path. The fm sidebands were checked offline in Chromium (log-A7.md); nobody has listened to them.
- **The scoring loop against O1.** Band-level, stab-correlation and kick-glide measures are open (log-A9.md). The wave-2 re-score is pending.
- **Audio by ear, in general.** The engine checks compare schedules and parameters; they do not compare sounds (log-A7.md, "Not verified").
- **A11's unverified suspicions** (log-A11.md, "Unverified suspicions"): the double-open of linked windows in Electron, the bridge listeners of a crashed child, and `Project.restoreAsync`'s preference. None has been reproduced or fixed.
- **Licence provenance.** `THIRD_PARTY.md` still lists "(none yet)". `app/engine/drums.js` takes 909 constants from andremichelle/tr-909 (AGPL-3.0-or-later), which the code cites by file and line (drums.js comments; log-A12.md). CLAUDE.md asks for a `THIRD_PARTY.md` row for each port. No row has been added. Earlier, A11 suggested a provenance row for the public-domain Freeverb topology and mulberry32, which was not added either (log-A11.md, "Licence hygiene").
