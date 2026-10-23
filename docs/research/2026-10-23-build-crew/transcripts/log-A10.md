# Log A10: checks and docs

Owner files: `tools/browser-check.js`, `app/README.md` (rewrite at the end), status lines in `docs/plans/2026-10-23-desktop-build-plan.md`.

## Start (2026-10-23)

- Read CONTRACT.md (Checks A10, file ownership, logs rules), BRIEF.md, app/README.md, the desktop build plan.
- State at start: `app/engine/` has core, synths, processors, sequencer, song, songdoc, selfcheck. `app/ui/`, `app/shell/` exist but were empty. `tools/` was empty. No other owner log exists yet (`transcripts/` was empty).
- Ran `node app/engine/selfcheck.js`: printed `OK: 193 checks passed`, exit 0.
- Playwright 1.56.1 at `/opt/node22/lib/node_modules/playwright`. `/opt/pw-browsers/chromium` is a symlink to `chromium-1194/chrome-linux/chrome`.
- Reference `browser-check.js` in the scratchpad uses a hardcoded `/opt/node-tools` Playwright path and the archived studio (`studio/`, `#play`, `Studio.seq`). Used as a pattern only. The new script serves the repo root itself, because `tools/serve.js` (A6) is not written yet.

## Built

- `tools/browser-check.js` (new). Serves the repo root on a random 127.0.0.1 port with COOP/COEP headers (`BROWSER_CHECK_ROOT` overrides the root for testing). Opens `/app/index.html` in Chromium with `--autoplay-policy=no-user-gesture-required`. Steps: page loads; each global in its table (Kit, Synths, Processors, SongDoc, Sequencer, Song, Host, Project, Widgets, Faces, SystemEditor, StepView, Windows) is defined, and a missing one is reported with its file and owner; host handle exposed (`window.HavantechnoApp.host` or `window.HavantechnoHost`); click Start audio; click Play; wait 2 s; `#view` has children; transport `playing` and `pos()` advances (host handle needed); switch to Step View (Tab, then the view switch button); double-click one device title; `#windows` gains a child; toggle one step (checked through `host.document()`, or the grid DOM without a host); Save (button or Ctrl+S); a download or a localStorage value containing "havantechno" must appear; no page errors, no console errors, no HTTP 4xx from the local server (each 404 is annotated with its CONTRACT owner). Prints PASS/FAIL lines and `RESULT`. Exit 0, 1 (failed check or page/console error), 2 (Playwright or Chromium did not start).
- Selectors come from the CONTRACT defaults and from what the owners have written so far: `#start-audio` (A6 `index.html`), `#frame` for the control bar, `#windows`, `.se-dtitle[title^="Double-click"]` (A4 device titles), `button.hv-step[aria-pressed]` (A2 `Widgets.steps`). Each failure prints every candidate it tried.
- `app/README.md` rewritten for the state at 23:13: folder layout, run commands for web and desktop, checks table, scoring loop pointer, module map (one line per CONTRACT module), status table with owner ids and the evidence for each row, and "what is unverified".
- `docs/plans/2026-10-23-desktop-build-plan.md`: status lines only. Milestone 1 line left as it was (still accurate). Added a status line under the headings of milestones 2, 3 and 4. Nothing else changed.

## Verification run

- `node app/engine/selfcheck.js` (23:0x and again at the end): `OK: 193 checks passed`, exit 0.
- `node --check tools/browser-check.js`: ok (after each edit).
- Stub test: a 60-line page with the globals and the CONTRACT ids, kept in the scratchpad (not in the repo), run with `BROWSER_CHECK_ROOT=<stub>`: 20 PASS, and the only FAILs are the stub's own missing globals (Project, Widgets, Faces, SystemEditor, StepView, Windows). This shows the Start, Play, Tab, double-click, step-toggle and Save logic passes when the pieces exist.
- Final real run at 23:15 (after `project.js` and `windows.js` landed): `RESULT: FAIL (10 failed check(s), 0 page error(s), 2 console error(s))`, exit 1.
  - PASS: page loads; globals Kit, Synths, Processors, SongDoc, Sequencer, Song, Host, Project, Widgets, Faces, SystemEditor, StepView, Windows; start audio clicked (`#start-audio`); no page errors.
  - FAIL: host handle not exposed (A6 `ui/app.js`, not written); Play not found (A6, `#frame`); `#view` empty; transport not checked (no host); no Step View marker; no device title; no step cell; Save: Ctrl+S gave no download and no autosave.
  - FAIL, HTTP 404: `ui/facedefs.js` (A3) and `ui/app.js` (A6).

## Requests to other owners

**To A6:** `ui/app.js` should (a) call `host.start()` on the `#start-audio` click, (b) expose the host as `window.HavantechnoApp = { host: host }` (or `window.HavantechnoHost = host`), since the check and the README rely on one of them, (c) put a Play button in `#frame` with `aria-label="Play"` and the text "Play" (the check tries both), (d) mark the view that is mounted (for example `data-view="step"` on the Step View root, or keep `.step-grid` from A5), (e) mount Windows panels as children of `#windows` (the check counts its children). Also: `tools/serve.js` is not run by me, so it is still unverified.

**To A5:** the check finds step cells as `button.hv-step[aria-pressed]` (A2's `Widgets.steps`) and the Step View by `[data-view="step"]` or `.step-grid`. If you use other names, tell me in your log or set one of these. A click on the first cell must change `host.document()`.

**To A4:** device titles are `.se-dtitle[title^="Double-click"]`, which is what your file uses now; keep the `title` attribute. The check double-clicks the first match.

**To A1:** the Save check passes if the saved JSON or the localStorage autosave contains the text `havantechno` (the `app: 'havantechno'` field from `Project.serialize` in the CONTRACT). Keep that field. Also `host.transport.playing` (boolean) and `host.transport.pos()` are what the check reads, and `host.devices()`, `host.document()`. Tell me if the names differ.

**To A2, A3:** nothing needed from you. The check looks for `button.hv-step` (A2) and `window.Faces`, `window.Widgets` as globals only.

## Unfinished

- The real app has not passed the check, because `ui/app.js` and `ui/facedefs.js` are not on disk. Re-run `node tools/browser-check.js` after they land and update the README snapshot.
- Electron has not been launched.
- The status table in the README comes from the files on disk, not from owner logs. Correct each row when a log says otherwise.
- Other owners' logs read at the end (23:14): `log-A1.md`, `log-A4.md`, `log-A7.md`. None is addressed to A10. A4 and A7 had not read the requests above when they wrote their logs.
- Nothing committed.
