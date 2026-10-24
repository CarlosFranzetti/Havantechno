# app/

The next Havantechno: a desktop DAW (Electron shell) built on the Web Audio engine from the archived studio. The same `app/index.html` runs in a browser and in Electron. The plan is `docs/plans/2026-10-23-desktop-build-plan.md`; the decisions behind it are in `prd.md` section 6b; the module contract is `app/CONTRACT.md`.

## Status at head 55f205d (2026-10-24)

Written from the owner logs (`docs/research/2026-10-23-build-crew/transcripts/log-A1.md` to `log-A11.md`, `log-coordinator.md`) and from my own runs of every check at 00:08 on head 55f205d. Every wave-2 code item is committed (log-coordinator, 2026-10-24 00:07). A9's wave-2 re-score is still in progress: `log-A9.md` has no wave-2 entry yet, so the scoring numbers below are the wave-1 numbers.

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
  shell/               Electron main process (main.js) and preload (preload.js)
  node_modules/        electron 45.0.0 and its dependencies (from npm install; git-ignored)
tools/
  serve.js             static server for the repo root, COOP/COEP headers, port 8000
  browser-check.js     headless Chromium smoke test of the web app (26 checks)
  *-check.js           one Node check per UI and engine owner (see Checks)
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

Electron 45.0.0 has been run on Linux under Xvfb by A6 (log-A6.md, wave 2 parts 2 to 4): child windows, retargeting, bypass, `readFile`, `pathForFile`. It has not been run on macOS or Windows.

## Checks

Run each command directly and read the exit code. Do not pipe them through `tail` or `grep`, which hides the exit code (log-coordinator.md, wave 1 rule). The results below are my own runs on head 55f205d at 00:08 to 00:10, 2026-10-24.

| Command | Result on 55f205d | Exit | What it covers |
|---|---|---|---|
| `node app/engine/selfcheck.js` | `OK: 337 checks passed` | 0 | Engine in Node with a fake AudioContext: schedule equivalence with the archived studio, string round trip, save and load, audio map, sampler track, Host and Project, chase on jump, undo per gesture, bypass, offline render chunks |
| `node tools/synths-check.js` | `OK: 74 checks passed` | 0 | Instruments, including the sampler (no own gain; `level` and stab `hp` at the event time) |
| `node tools/processors-check.js` | `OK: 54 checks passed` | 0 | Processors, with automation of the pre-existing parameters identical to the archive |
| `node tools/widgets-check.js` | `OK: 157 checks passed` | 0 | Widgets on a fake DOM, including gesture phases start, move, end |
| `node tools/faces-check.js` | `OK: 1167 checks passed` | 0 | Faces: 25 definitions at four densities, `Faces.lint`, knob home values, the jump ruling |
| `node tools/system-editor-check.js` | `OK: 50 checks passed` | 0 | System Editor on the real Host and widgets, one undo entry per drag |
| `node tools/step-view-check.js` | `OK: 72 checks passed` | 0 | Step View on the real Host, follow, deferral during gestures, fx and pattern length |
| `node tools/browser-check.js` | `RESULT: PASS (26 checks)` | 0 | Headless Chromium on `app/index.html`: globals, Start audio, Play, transport advances, Step View, device window from its title (`Windows.open` called), a step toggled, Save, no page or console errors |
| `python3 tools/score.py --selftest` | `OK: all selftest checks passed` | 0 | Synthetic checks of the scoring measures |
| `node tools/render.js --page app --sections mainA --bars 16` | 16 bars in 5.94 s, no page errors | 0 | Offline render through `Host.render` into `tools/out/` |

These checks use fake DOMs and fake audio contexts where stated in their logs. They do not listen to anything.

## Sampler

A sampler track plays one audio file (a buffer) from the song's document, with the same step, lock, probability and condition behaviour as any other track. The contract is `app/CONTRACT.md`, "Sampler" section; the implementation is log-A1.md (parts 1 and 2) and log-A7.md (wave 2).

**How to add a sample track.** The UI has no entry point for this yet: the drop target and the track menu in the contract are not built (log-A6.md, wave 2 part 3; log-A4.md). Today a sample track is added through the Host, after Start audio:

```js
// in the browser console, or a script, after Start audio
var h = window.HavantechnoApp.host;
h.addSampler(file, { name: 'vox', family: 'keys', pattern: 'x...............' })
  .then(function (trackName) { console.log('added', trackName); });
```

`file` may be a `File` or `Blob`, a URL string, an `ArrayBuffer`, or the Electron result from `Project.pickAudio()`. `name` names the track (made unique and cleaned). `family` picks the family (`drums` by default). `pattern` is the step pattern; the default is one hit on the first step. `host.loadAudio(source)` alone loads a file without adding a track.

**What the document stores.** The file's bytes are never saved in the song. The document holds a reference:

- `doc.audio[id] = { name, src, duration, sampleRate, channels }`. `src` is the URL, the Electron path, or the file name when nothing else is known. The id is the file name without extension, lower case, at most 40 characters.
- A sampler track has `type: 'sampler'` (or `inst: 'sampler'`) and `params.buffer` set to that id. The other parameters are `start`, `end` (0 to 1; `end` 0 means the whole buffer), `pitch` (semitones), `attack`, `release`, `loop`, `choke` and `level`. There is no own gain: the channel fader is `<track>.gain`.
- A `family` field on the track overrides the instrument's family (log-A1.md, decision 6).

A song with no samples saves no `audio` key, so existing files are unchanged (log-A1.md, part 1, decision 5).

**When a file is missing.** A reference whose bytes are not loaded is missing. The Host reports it as an `'audio'` event with `status: 'missing'`, its track plays silence, and `host.audio()` lists it with `missing: true` and the tracks that use it (log-A1.md, part 1, decision 4).

- On Open, the toast says how many samples are missing ("Opened song; 2 samples missing") and offers "Re-add...". That action picks a file, relinks it to the missing entry with the same file name (or the first missing one), and offers the next one while any are left (log-A6.md, wave 2 part 4).
- A sampler window shows "Re-add sample..." in its title bar while its buffer is missing (log-A6.md, wave 2 part 4).
- Reloading after Open: a URL reloads through `fetch`; an Electron path reloads through `shell.readFile` with the project folder as its base, so a relative path works (log-A1.md, parts 1 and 2; log-A6.md, wave 2 part 2). A bare file name on the web cannot be read again, so on the web the user re-adds it. The browser check never fetches a missing file (a 404 would fail the check).

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

`tools/render.js` renders sections through the page into `tools/out/`, and `tools/score.py` measures the render and the reference with the methods of the research (O1 M1 to M9, S3, S4). The options, the method of each measure and what is unverified are in `tools/README.md`. The wave-1 scores are in log-A9.md: loudness within 0.05 LU of O1's table on all seven sections, and true peak within 0.01 dB. The wave-2 re-score is pending.

## Module map

One line per module, from `app/CONTRACT.md`:

| Module | Role |
|---|---|
| `engine/core.js` | `Kit` helpers (`setV`, `lin`, `expo`, `target`, `defineParams`, `mtof`, noise and shaper utilities). Byte-identical to the archive. |
| `engine/synths.js` | Instruments from `Synths.create(ctx, type, opts)`: `trigger`, `set`/`get`, `panic`, `dispose`. Includes the sampler (not listed in `Synths.types()`). |
| `engine/processors.js` | Effect units and the channel strip, `Processors.chain`. |
| `engine/songdoc.js` | `SongDoc`: the song as one JSON document, sparse step cells, variant parsing, save and load (`v: 1`), the audio map, and an editor with undo per gesture. |
| `engine/sequencer.js` | `Sequencer`: lookahead scheduler, tracks, sends, parameter paths, holds, the arrangement chase, chunked offline `render`, `wav`. |
| `engine/song.js` | `Song.GUIDANCE` (frozen), `Song.GUIDANCE_V2`, `Song.document()`, `Song.documentV2()`, `Song.build(seq, docOrDef)`. |
| `engine/host.js` | `Host`: the one object the UI talks to (transport, parameters, devices, meters, document and editor, bypass, audio, render). |
| `engine/project.js` | `Project`: serialize, parse, save, open with the host, `pickAudio`, autosave and restore. |
| `engine/selfcheck.js` | Node self-check of the engine and the Host (337 checks). |
| `ui/widgets.js`, `ui/theme.css` | `Widgets` (knob, slider, toggle, select, steps with gesture phases, meter, curve) and the colour tokens. |
| `ui/faces.js`, `ui/facedefs.js` | `Faces`: the face registry, the 25 device definitions at four densities, `Faces.lint`, the fallback. |
| `ui/system-editor.js` | `SystemEditor`: the System Editor view (ruler, rows, device row). |
| `ui/step-view.js` | `StepView`: the Step View (step grids, variant strip, step editor lanes, follow). |
| `ui/windows.js` | `Windows`: device windows (in-page panels on the web, child windows in Electron), link modes, tile, cascade. |
| `ui/app.js` | Frame, control bar, view switch, keys, the start gate, open, save, export, relink. |
| `index.html` | Page skeleton and the script load order. |
| `shell/main.js`, `shell/preload.js` | Electron main process and the `HavantechnoShell` bridge (dialogs, `readFile`, `pathForFile`, device windows). |
| `package.json` | Scripts `start` and `web`; `electron` 45.0.0 as a dev dependency. |
| `tools/serve.js` | Static server for the repo root with COOP and COEP headers. |
| `tools/browser-check.js` | Headless Chromium smoke test of the web app. |
| `tools/render.js`, `tools/score.py`, `tools/README.md` | Scoring loop. |

## Status

Every row is "shipped" (the module is in the repo, its check passes on 55f205d, and its owner's log reports it as done) or "shipped, with gaps" where the owner's log lists gaps. The gaps are the owner's own, unless marked otherwise.

| Module | Owner | Status | Owner's stated gaps | Source |
|---|---|---|---|---|
| `engine/core.js` | archive copy | shipped | none | log-coordinator (byte-identical check, wave 1) |
| `engine/songdoc.js` | A1 | shipped | none stated | log-A1.md part 2 (undo per gesture, refused `setStep`, fork letters, `ed.group`, `setFx`, `setVariantBars`) |
| `engine/sequencer.js` | A1 | shipped, with gaps | a 200-bar export after the chunked render is not run | log-A1.md part 2 |
| `engine/song.js` | A7 | shipped, with gaps | sub B0 bar unmeasured (kept at C#1 with a TODO); lowpass restore kept at bar 136, bars 128 to 135 unmeasured | log-A7.md; log-coordinator 23:43 rulings |
| `engine/synths.js` | A7 | shipped, with gaps | sub per-bar notes not added; `choke` on hats not added (ruled later, with the sampler); V2 drone glide off; kick `drive` 0 vs 0.45 not rendered; sampler `reverse` accepted and does nothing; choke fade reads `gain.value`, so it may differ from the audible level by one render quantum; no real `AudioBuffer` in the unit checks | log-A7.md, "Not done", wave 2 and the follow-up |
| `engine/processors.js` | A8 | shipped, with gaps | exponential IR envelope not done; buffer swap on `'ir'` size, decay and hp changes may click (`'freeverb'` avoids it); Freeverb is a biquad-damped approximation, not gain-matched to the IR; offline acceptance tests (RT60, tail slope, correlation) not run; sidechain `offset` and Dattorro not done; widener `monoBelow` stays 0 until the song sets it; Freeverb CPU not measured; nothing has been listened to | log-A8.md, "Not done" |
| `engine/host.js` | A1 | shipped, with gaps | Electron paths and a real file input in a browser are not verified by A1; the drop target and track menu that would call `addSampler` are not built | log-A1.md parts 1 and 2; log-A6.md wave 2 part 3 |
| `engine/project.js` | A1 | shipped, with gaps | native dialogs and `pickAudio` in Electron not run (A6 traced them); the web file input was run in Chromium by A6 | log-A1.md part 2; log-A6.md wave 2 part 4 |
| `engine/selfcheck.js` | A1 | shipped | none stated (337 checks pass) | log-A1.md part 2; my run |
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

## What is unverified

Nobody has run these. Each is listed so that nobody reads the green checks as more than they are.

- **A full 200-bar export after the chunked render.** The largest case timed is 48 bars (13 s). The Export WAV button was run only with 4 bars, before the change (log-A6.md; log-A1.md part 2).
- **Electron on macOS and Windows.** Electron has run on Linux under Xvfb only (log-A6.md).
- **Native dialogs in Electron**: open, save, and `Project.pickAudio` with the native file dialog (log-A6.md, log-A1.md part 2). The web file input was run in Chromium by A6 (log-A6.md, wave 2 part 4).
- **Hearing the processor changes.** A8's changes (delay loop and modulation, Freeverb, chorus, widener, sidechain curve) are checked for defaults only. Nobody has listened to them or measured their output (log-A8.md).
- **The sampler's sound.** A1 heard a sampler in Chromium (meter peak 0.68, log-A1.md part 1). The unit checks use fake buffers. The choke fade and the pitch path have not been heard.
- **Live audio in the views.** The Step View's follow and the System Editor's drags were checked in the fake DOM (log-A4.md, log-A5.md). Nobody has run them with audio playing in a browser.
- **The scoring loop against O1.** Band-level, stab-correlation and kick-glide measures are open (log-A9.md). The wave-2 re-score is pending.
- **Audio by ear, in general.** The engine checks compare schedules and parameters; they do not compare sounds (log-A7.md, "Not verified").
- **A11's unverified suspicions** (log-A11.md, "Unverified suspicions"): the double-open of linked windows in Electron, the bridge listeners of a crashed child, and `Project.restoreAsync`'s preference. None has been reproduced or fixed.
- **Licence provenance.** `THIRD_PARTY.md` lists no entries. A11 found no copied third-party code, but it suggested a provenance row for the public-domain Freeverb topology and mulberry32 (log-A11.md, "Licence hygiene"). Not added.
