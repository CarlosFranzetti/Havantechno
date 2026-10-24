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

## Coordinator request: device title and exit 0 (23:33)

Request: the device title check failed ("device title", `.se-dtitle` only). Fix it to use A3's `.hv-head`, look in whichever view is active, keep asserting that a double-click reaches `Windows.open` or a panel in `#windows`, note that the page exposes `window.HavantechnoApp = {host, app}`, run the check, and report the exit code read directly.

Changes to `tools/browser-check.js`:
- `deviceTitle` candidates now start with `.hv-head`, then the System Editor `.se-dtitle` fallback and the older names.
- The title is looked for in the active view first. If it is not there, one Tab switches views and the search repeats. The view is not switched back before the double-click (the earlier version switched back first, which hid the title and made `dblclick` time out).
- The device window step wraps `Windows.open` in the page to count calls. It passes if a double-click gives a `Windows.open` call and a panel in `#windows`; the detail names both counts. If the wrap is not possible it passes on the panel alone and says so.
- The step toggle now runs before the device window. The first order failed: the opened panel covered the step grid and the cell click timed out.
- The host is still read from `window.HavantechnoApp.host` (the `app` member is not used).

Runs (exit read from `$?`, output redirected to a file, no pipe):
- Before the fix: `exit code: 1`, one failure: device title (`.hv-head` found in the System Editor, but the view had already switched back, so the double-click timed out).
- After the view-order fix: `exit code: 1`, step toggle click timed out behind the panel.
- After moving the step toggle first: `exit code: 0`, `RESULT: PASS (26 checks)`.
- Second run: `exit code: 0`, `RESULT: PASS (26 checks)`.

The device window check output: `device window opens on double-click - .hv-head, Windows.open called 1x, #windows children 0 -> 1`.

Not committed. `app/README.md` snapshot and status row updated to match this run.

## Wave 2: README status rewrite at head 55f205d (2026-10-24, 00:08 to 00:12)

Coordinator's request: rewrite the status parts of `app/README.md` for the current head, with sections on the sampler and on offline render and export, and update the three plan status lines I own if they are wrong. Only `app/README.md`, the plan's status lines and this log changed. Nothing committed.

**Read.** `log-coordinator.md` (all, 00:07 entries included); `log-A1.md` (parts 1 and 2, the Sampler, Host and render sections); `log-A2.md`, `log-A3.md`, `log-A4.md`, `log-A5.md`, `log-A6.md` (wave 2 parts 1 to 4), `log-A7.md` (wave 2 and the follow-up), `log-A8.md` ("Not done", "What shipped"), `log-A9.md` (render timings, findings, open items), `log-A11.md` (findings E1 to E9, S1, S2, W1 to W5, C1, C2, F1, F2, D1, D2, the hold/release audit and the unverified suspicions). `app/CONTRACT.md`: the Host section (wave-1 extras and the wave-2 review fixes) and the Sampler section. The UI code for keys, export and sample entry points: `app/ui/app.js`, `app/engine/host.js`. Nothing in `log-A9.md` is wave 2 yet: the re-score is still pending.

**Checks run for the README, each exit code read directly (output to a file, no pipe), on head 55f205d at about 00:08:**

| Command | Result | Exit |
|---|---|---|
| `node app/engine/selfcheck.js` | OK: 337 checks passed | 0 |
| `node tools/synths-check.js` | OK: 74 checks passed | 0 |
| `node tools/processors-check.js` | OK: 54 checks passed | 0 |
| `node tools/widgets-check.js` | OK: 157 checks passed | 0 |
| `node tools/faces-check.js` | OK: 1167 checks passed | 0 |
| `node tools/system-editor-check.js` | OK: 50 checks passed | 0 |
| `node tools/step-view-check.js` | OK: 72 checks passed | 0 |
| `node tools/browser-check.js` | RESULT: PASS (26 checks) | 0 |
| `python3 tools/score.py --selftest` | OK: all selftest checks passed | 0 |
| `node tools/render.js --page app --sections mainA --bars 16` | 16 bars rendered in 5.94 s, no page errors (7.0 s wall including Chromium) | 0 |

The render result is for the 16-bar mainA case on the chunked engine, and it is not the same case as A1's table (A1 rendered from bar 0). A9's wave-1 figure for the same mainA case was 16.9 s, taken before the change.

**What changed in `app/README.md`.** The "Snapshot" header is now "Status at head 55f205d (2026-10-24)". Added: the checks table with the counts above and exit codes; a Sampler section (how to add a sample track through `host.addSampler`, since no UI entry point is built; what the document stores; what happens when a file is missing; the web re-add); an "Offline render and export" section (chunked `suspend` render, timings from A1's table and A11's pre-change table, my run, and what is not measured); the status table, one row per module, each with the owner's stated gaps and its log; and "What is unverified". Keys were checked against `app/ui/app.js`: Ctrl/Cmd+1 and Ctrl/Cmd+2 and Alt+1 and Alt+2 all switch view.

**Plan status lines.** I rewrote the three lines I own (milestones 2, 3 and 4). Milestone 2 had the wave-1 counts (982 checks, 24 definitions); it now has 25 definitions and 1167 faces checks, from log-A3.md and log-coordinator 00:04. Milestone 3 now lists the wave-2 Xvfb checks (log-A6.md, parts 2 to 4) and keeps the untested native dialogs. Milestone 4 said wave 2 adds "the sampler track UI", which is not built (see below); it now says so. `git diff` on the plan shows three changed lines and nothing else.

**Not changed, for the coordinator.**
- Plan milestone 1's line (not mine) says save and open work "through the Electron dialogs". The logs say the native dialogs have not been run (log-A1.md part 2; log-A6.md, milestone 3 line). Suggest the wording be corrected.
- Plan milestone 5b (not mine): "Status: not started; scheduled for wave 2". The sampler is in (log-A7.md wave 2, log-A1.md part 1, log-A6.md part 4), with the UI entry points still missing. Suggest it is updated.
- The Sampler section of `app/CONTRACT.md` (coordinator's file) says "Adding a sampler track: drop an audio file on the track list or use the track menu". Neither exists (log-A4.md and log-A6.md part 3 say the drop target is not built; `grep` finds no caller of `addSampler` in `app/ui/`). The README says so.
- `CLAUDE.md` (coordinator's file, quoted in this session) gives stale figures: selfcheck 263 (now 337), and "a full 200-bar offline render takes 3 to 4 minutes" (that is the pre-chunk figure, log-A9.md). The README now says what is measured and what is not.
- `THIRD_PARTY.md` has no entries (log-A11.md, licence hygiene); A11's optional provenance row for Freeverb's topology and mulberry32 is not added. Flagged in the README's unverified list.
- `.gitignore` already lists `tools/out/`, so A9's open question on that is closed (checked, not edited).

**Not verified, as the README now says.** A full 200-bar export after the chunked render; Electron on macOS and Windows; native dialogs; `pickAudio` through the native dialog; hearing A8's processor changes; the sampler's sound beyond A1's Chromium meter reading; live-audio behaviour of the Step View and the System Editor drag; the wave-2 re-score of A9; A11's unverified Electron suspicions.
