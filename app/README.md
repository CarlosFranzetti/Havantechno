# app/

The next Havantechno: a desktop DAW (Electron shell) built on the Web Audio engine from the archived studio. The same `app/index.html` runs in a browser and in Electron. The plan is `docs/plans/2026-10-23-desktop-build-plan.md`; the decisions behind it are in `prd.md` section 6b; the module contract is `app/CONTRACT.md`.

Snapshot: written 2026-10-23 from the files on disk at the end of A10's work. Several modules were still being written, and most owners had not yet written their logs. The status table below says where each status came from.

## Folder layout

```
app/
  CONTRACT.md          module contract and file ownership (coordinator owns it)
  README.md            this file
  index.html          the web page and the Electron page (load order is here)
  package.json         Electron shell: "start" runs electron, "web" serves the repo
  engine/              audio engine and song data, plain globals, no bundler
  ui/                  views, widgets, faces, device windows (plain globals)
  shell/               Electron main process (main.js) and preload (preload.js)
  node_modules/        electron 45.0.0 and its dependencies (from npm install)
tools/
  serve.js             static server for the repo root with COOP/COEP headers
  browser-check.js     headless Chromium smoke test of the web app
  README.md            scoring loop (owner A9; see below)
```

## Run the web app

From the repo root:

```
node tools/serve.js          # default port 8000; PORT=9000 or node tools/serve.js 9000 to change it
```

Open `http://localhost:8000/app/index.html`. Click "Start audio" (browsers need a click before audio starts). The keys in the contract are Space (play and pause), Tab (switch view), V (hide device windows), Cmd/Ctrl+S (save) and Cmd/Ctrl+O and Cmd/Ctrl+Z. At this snapshot `app.js` is not on disk, so none of these keys is wired and the "Start audio" button has no handler. The web build is meant to save by download and autosave to localStorage.

## Run the desktop app

```
cd app
npm install
npm start                     # runs electron . with shell/main.js
```

`npm start` loads the same `index.html` through the `havantechno://app/` scheme. To load the dev server instead, set `HAVANTECHNO_URL=http://localhost:8000/app/index.html` before `npm start`. Device windows open as real child windows there. `window.HavantechnoShell` exists only in Electron.

Status of the desktop path: the files exist and `electron` 45.0.0 is installed in `app/node_modules`, but nobody has launched the app in this sandbox. Treat it as unverified.

## Checks

| Command | What it checks | Last result (2026-10-23) |
|---|---|---|
| `node app/engine/selfcheck.js` | Engine in Node with a fake AudioContext: schedule equivalence with the archived studio, string round trip, save and load, locks, held paths, face lint once it exists | `OK: 193 checks passed`, exit 0 |
| `node tools/browser-check.js` | Serves the repo root, opens `app/index.html` in headless Chromium, checks globals, clicks Start audio and Play, checks the transport runs, Tab to the Step View, double-clicks one device title, toggles one step, saves, and fails on page or console errors. Prints each missing global, selector and file with its owner. | See the snapshot below |
| `tools/*-check.js` | Other owners' Node smoke tests. None were written at this snapshot. | none |

Environment for the browser check: `PLAYWRIGHT_PATH` (default `/opt/node22/lib/node_modules/playwright`), `CHROMIUM_PATH` (default `/opt/pw-browsers/chromium`), and `BROWSER_CHECK_ROOT` to point the check at another folder with the same layout. Exit codes: 0 all checks passed, 1 a failed check or a page or console error, 2 the harness could not start Chromium or Playwright.

The browser check needs these from `app.js` and the frame: `#start-audio` (the overlay button), `#frame` with a Play button, `#view`, `#windows` (device panels on the web), and the host on `window.HavantechnoApp.host` (or `window.HavantechnoHost`). Without the host it can only check the DOM.

Browser-check snapshot (2026-10-23, 23:15, the last run before this file was written): 10 failed checks, 0 page errors, 2 console errors. The two console errors are HTTP 404s for files not yet on disk: `ui/facedefs.js` (A3) and `ui/app.js` (A6). Because `app.js` is missing, nothing is mounted: the start button click works, but there is no Play button, no `#view` content, no host handle and no Step View. The engine globals and `Host`, `Project`, `Widgets`, `Faces`, `SystemEditor`, `StepView` and `Windows` are defined. The same script's happy path passes against a stub page outside the repo (20 checks), which tests the script and not the app.

## Scoring loop

`tools/render.js` (Playwright) renders section WAVs through `Host.render` into `tools/out/`, and `tools/score.py` measures them against the reference. The method, what each measure means, and what could not be verified are in `tools/README.md` (owner A9). At this snapshot those files were not yet written.

## Module map

One line per module, from `app/CONTRACT.md`:

| Module | Role |
|---|---|
| `engine/core.js` | `Kit` helpers (`setV`, `lin`, `expo`, `target`, `defineParams`, `mtof`, noise and shaper utilities). Byte-identical to the archive. |
| `engine/synths.js` | Instruments from `Synths.create(ctx, type, opts)` with `trigger`, `set/get`, `panic`, `dispose`. Owner A7 is changing the kick, sub and hat voices. |
| `engine/processors.js` | Effect units and the channel strip, `Processors.chain`. Owner A8 is changing delay, reverb, chorus, widener and sidechain. Not changed yet. |
| `engine/songdoc.js` | `SongDoc`: the song as one JSON document with sparse step cells, variant parsing and formatting, save and load (`v: 1`), and a copy-on-write editor with undo. |
| `engine/sequencer.js` | `Sequencer`: lookahead scheduler, tracks, sends, parameter paths, holds, offline `render` and `wav`. Reads cells, applies locks per voice. |
| `engine/song.js` | `Song.GUIDANCE` (frozen), `Song.document()`, `Song.build(seq, docOrDef)`. A7 adds `GUIDANCE_V2`. |
| `engine/host.js` | `Host`: the one object the UI talks to (transport, parameters, devices, meters, document and editor, render). Owner A1; status below. |
| `engine/project.js` | `Project`: serialize, parse, save and open (shell dialogs in Electron, download and file input on the web), autosave and restore. Owner A1; status below. |
| `engine/selfcheck.js` | Node self-check of the engine (193 checks). |
| `ui/widgets.js` | `Widgets`: knob, slider, toggle, select, steps, meter, curve, all SVG or Canvas with keyboard and drag. Owner A2; status below. |
| `ui/theme.css` | Colour tokens on `:root` and per-family colours. Owner A2; status below. |
| `ui/faces.js` | `Faces`: the face registry, `define`, `render(device, density, host)`, the fallback and `lint`. Owner A3; status below. |
| `ui/facedefs.js` | The 23 device face definitions with their hero graphs. Not written yet. Owner A3. |
| `ui/system-editor.js` | `SystemEditor`: the System Editor view (control bar contents, ruler, rows, device row). Owner A4; status below. |
| `ui/step-view.js` | `StepView`: the Step View with step grids, the variant strip and the step editor lanes. Owner A5; status below. |
| `ui/windows.js` | `Windows`: device windows (in-page panels on the web, child windows in Electron), link modes, tile and cascade. Owner A6; status below. |
| `ui/app.js` | Frame, view switch, keyboard, the start gate, the single animation loop and autosave. Not written yet (the page 404s on it). Owner A6. |
| `index.html` | Page skeleton and the script load order. Written by A6. |
| `shell/main.js`, `shell/preload.js` | Electron main process and the `HavantechnoShell` bridge. Written by A6; not run. |
| `package.json` | Scripts `start` and `web`, and `electron` 45.0.0 as a dev dependency. Owner A6. |
| `tools/serve.js` | Static server with COOP and COEP headers. Owner A6. |
| `tools/browser-check.js` | Browser smoke test. Owner A10. |

## Status

Source for each row: the files on disk at this snapshot. No owner had written a log yet, so every "status" below is A10's reading of the files, not the owner's report. Owners should correct their row when their log is in.

| Module | Owner | Status | Evidence |
|---|---|---|---|
| `engine/core.js` | engine (archive copy) | shipped | byte-identical to the archived studio; selfcheck passes |
| `engine/processors.js` | A8 | not started | byte-identical to the archive |
| `engine/synths.js` | A7 | partial | changed on disk (60 diff lines from the archive), no log; `GUIDANCE_V2` not in `song.js` yet |
| `engine/songdoc.js` | engine (milestone 1) | shipped | new file; selfcheck covers round trip and save and load |
| `engine/sequencer.js` | engine (milestone 1) | shipped | changed from the archive (123 diff lines); schedule equivalence in selfcheck |
| `engine/song.js` | A7 | partial | changed on disk (77 diff lines), in progress; `GUIDANCE_V2` pending |
| `engine/selfcheck.js` | A1 (additions) | shipped | 193 checks pass |
| `engine/host.js` | A1 | partial | on disk at 23:13, A1 log describes it; its global loads |
| `engine/project.js` | A1 | partial | on disk (9 KB, 23:14); its global loads in the browser check; not checked beyond that |
| `ui/theme.css` | A2 | partial | on disk; no log yet |
| `ui/widgets.js` | A2 | partial | on disk (850 lines); no log yet |
| `ui/faces.js`, `ui/facedefs.js` | A3 | partial | `faces.js` on disk (490 lines); `facedefs.js` absent (404) |
| `ui/system-editor.js` | A4 | partial | on disk (709 lines); needs `app.js` to mount |
| `ui/step-view.js` | A5 | partial | on disk; needs `app.js` to mount |
| `ui/windows.js` | A6 | partial | on disk (35 KB, 23:14); its global loads |
| `ui/app.js` | A6 | not started | file absent (404 in the page); nothing mounts without it |
| `index.html`, `package.json` | A6 | partial | written; loads 2 files that are absent (`ui/facedefs.js`, `ui/app.js`) |
| `shell/main.js`, `shell/preload.js` | A6 | partial | written (23:10); `electron` 45.0.0 installed; never launched |
| `tools/serve.js` | A6 | partial | written; not run by A10 |
| `tools/browser-check.js` | A10 | partial | runs; fails on the missing modules above; happy path checked against a stub outside the repo |
| `tools/render.js`, `score.py`, `tools/README.md` | A9 | not started | files absent |

## What is unverified

- The Electron shell has not been launched in this sandbox. `npm install` put Electron in `app/node_modules`; `npm start` was not run.
- The browser check has not passed on the real app: `ui/app.js` and `ui/facedefs.js` are not on disk. Its happy path was run against a stub page outside the repo, which checks the script and not the app.
- `tools/serve.js` was not run by A10.
- The audio changes from A7 and A8 are not verified by ear or by the scoring loop. The engine self-check covers schedule equivalence and nothing about sound.
- Saving to a file: `SongDoc.save` produces the JSON and `project.js` (A1) is on disk, but nothing has run the save path through the shell or the browser yet.
