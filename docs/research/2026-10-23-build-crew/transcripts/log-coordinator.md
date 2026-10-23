# Coordinator log (Fable)

## Wave 1

- 2026-10-23 23:14:41 UTC: A7 handed back (synths.js, song.js, tools/synths-check.js). Verified: node --check, app/engine/selfcheck.js 193 OK, tools/synths-check.js 36 OK. Committed 19ce4ef.
- 2026-10-23 23:14:41 UTC: A4 handed back (system-editor.js, tools/system-editor-check.js). node --check OK. Committed 584a534 citing "43 checks", which was A4's run against a fake Windows. **Correction:** by the time I ran the check, A6's real windows.js existed and the check fails at "Windows.open called on head double-click" (exit 1). This is an interface mismatch between A4's double-click hook and A6's Windows.open, for wave 2: **To A4 and A6:** agree on how a device title double-click reaches Windows.open(deviceId, host) and make tools/system-editor-check.js pass against the real windows.js.
- Rule for the rest of wave 1: a check that prints a Node stack trace has failed even if a pipe hides the exit code; I will check exit codes directly from now on.
- 2026-10-23 23:15:45 UTC: A2 handed back (widgets.js, theme.css, tools/widgets-check.js). Verified: node --check OK; tools/widgets-check.js "OK: 134 checks passed", exit 0. Files were already in the WIP snapshot d91fafa (identical), so no new commit. **Decision:** the wheel changes only a focused control (A2's choice) stands; hover-wheel would move knobs while scrolling a panel.
- 2026-10-23 23:16:01 UTC: A10 handed back (tools/browser-check.js, app/README.md rewrite, plan status lines). Its final real run: FAIL, 10 checks, blocked on ui/app.js and ui/facedefs.js not yet present (A6, A3 still writing); the happy path passes on a stub page. **To A6:** expose window.HavantechnoApp = {host} and a Play button inside #frame; the check looks for #start-audio. The browser check is the wave-1 gate once A3 and A6 land.
- 2026-10-23 23:16:29 UTC: A5 handed back (step-view.js, tools/step-view-check.js). Verified: node --check OK; step-view-check exit 0 (OK: 53 checks passed) against the real Host. **To A1:** A5 asks for ed.group(fn) to collapse undo steps, ed.setFx, and a way to set a variant's bar count. **To A6:** call view.selectSection(name) on section change.

## 2026-10-23 23:21:41 UTC — wave 1 hand-backs verified: A1, A3, A8

Ran every check directly and read the exit code (not through a pipe).

| Check | Result | Exit |
|---|---|---|
| `node app/engine/selfcheck.js` | OK: 263 checks passed (sections 1–5; section 5 is A1's Host and Project) | 0 |
| `node tools/processors-check.js` (A8, new) | OK: 54 checks passed; automation of all pre-existing params identical to the archived processors.js | 0 |
| `node tools/faces-check.js` (A3, new) | OK: 982 checks passed; 49 real devices rendered, Faces.lint 0 problems | 0 |
| `node tools/synths-check.js` | OK: 36 | 0 |
| `node tools/step-view-check.js` | OK: 53 | 0 |
| `node tools/widgets-check.js` | OK: 134 | 0 |
| `node tools/system-editor-check.js` | FAIL: "step edit forked kick A for the intro and set step 2 (variant A)" | 1 |
| `node --check` on host.js, project.js, selfcheck.js, processors.js, processors-check.js, app.js | pass | 0 |

The system-editor failure is A4's. A1's diagnosis, which I accept after reading the check: the check clicks the ruler first, that click really moves the transport into mainA, so the following step edit forks mainA's kick variant instead of the intro's. The Host behaves as the contract says; the check's expectation is wrong (or the check should select the section without moving the transport). Sent to A4 to fix in its own file.

**Decision on A1's open question** (should knob moves go on the undo stack?): yes, one snapshot per gesture, taken on the first `hold(path)` of a gesture and never on each `setParam`. Not in wave 1: it needs A4 and A5 to call `hold`/`release` around every drag consistently first, which A11's review will confirm. A1 owns the change in wave 2. Until then knob moves are not undoable; the UI must not advertise otherwise.

A1's additions beyond the contract (`host.mute`/`solo`, `transport.loopSection`, `meter('master')`, send levels on the channel device, `setParam` writing into the document) are accepted; A1 to add them to CONTRACT.md in wave 2 so A4/A5/A6 build against the written interface.

A8's list of things not done (S2 exponential IR envelope and IR buffer-swap click, Dattorro, S1 offset; Freeverb is a native approximation, not gain-matched to the IR) goes to the wave-2 backlog. No sound has been verified for any A8 change; A9's render and score loop is the place that will show it.

A3 reports 24 face definitions, not the brief's 23 (13 instruments + 10 processor types + channel). The brief's count was mine and wrong; 24 is right. A3's hero numbers are its reading of the engine, not measurements; noted for A11.

Committed A1, A3 and A8's files as verified. A6 (app.js) and A9 (score.py) are still writing; their current files pass syntax checks only and go in as a separate WIP snapshot.

## 2026-10-23 23:23:56 UTC — A4 check green against the real modules

`node tools/system-editor-check.js` run directly: prints `using: host=real Host.create(), widgets=real, faces=real, windows=real` then `OK: 40 checks passed`, exit 0. A4 changed only its check: it now reads the transport's section before the step edit and asserts the fork for that section; its fake DOM gained `createElementNS` and the `#windows`/`body` nodes the real Windows.open needs; the Windows assertion, previously skipped whenever real faces loaded, now runs with a spy on `Windows.open(deviceId, host)`. No editor code changed, nothing for A6. Earlier commit message that cited 43 checks for this file stays corrected: the count is now 40 and green. Committed.

## 2026-10-23 23:30:06 UTC — A6 hand-back; wave-1 gate run

A6's files (windows.js, app.js, index.html, shell/main.js, shell/preload.js, package.json, tools/serve.js) were already in WIP snapshot 5; `node --check` passes on every JS file here. Gate: `node tools/browser-check.js` run directly, exit 1, 1 failed check, 0 page errors, 0 console errors. 22 of 23 pass, including host handle exposed, start gate, Play in #frame, transport advancing, Tab to Step View, step toggle changes the document, Save downloads a song file, autosave, all files load. The failure is "device title": the check switches to the Step View and then looks for System-Editor-only selectors; the real faces' double-click target is `.hv-head`. The check is A10's; sent to A10 with the selector. A6's headless-Chromium and Electron-under-Xvfb results (link modes, pin, tile, cascade, V, Esc, undo, child windows, app-data round-trip) are A6's report, not reproduced by me. A6's export caveat stands as a wave-2 engine item: a 48-bar offline render took over 100 s in this sandbox and the full 200-bar song did not finish in 180 s; Export WAV only completed with the render limited to 4 bars. A6 also found `engine/project.js` missing from the contract's load order though index.html loads it; fixed in CONTRACT.md (coordinator's file). Wave 1 is complete once A10's check is green and A9 hands back.

## 2026-10-23 23:31:28 UTC — wave 2 opened: A11 integration review dispatched

A11 (Opus) started on head 6ab1499 while A9 (render and score loop) and A10 (browser-check selector fix) finish wave 1; A11 reads app/engine, app/ui, the shell and the checks, not A9's tools. Its brief, in order: contract mismatches, real bugs on real paths (edit while playing, forks across sections, save/load round trip, undo after knob and step edits, link modes in Electron versus in-page, voice leaks, lock restore, fake-DOM blind spots), the render slowness A6 found (measure 4/16/48 bars with suspects toggled; suspects named: Freeverb node count, seeded IR generation, per-step node creation, scheduler cell lookup), the hold/release audit that gates A1's undo-per-gesture change, and THIRD_PARTY.md hygiene. A11 writes only log-A11.md and commits nothing. A9 was told to score a short window rather than fix the engine.

## 2026-10-23 23:34:15 UTC — wave-1 gate green

`node tools/browser-check.js` run here with output to a file and the exit code read from $?: exit 0, `RESULT: PASS (26 checks)`, including "device window opens on double-click: .hv-head, Windows.open called 1x, #windows children 0 -> 1". A10 changed only its check (and app/README.md's status row): the title selector is `.hv-head` in the active view, the step toggle runs before the device window because the opened panel covered the step grid, and the host is read from `window.HavantechnoApp.host`. Wave 1 is complete for A1 to A8 and A10; A9's render and score loop is the last hand-back outstanding, and it does not gate the app. Committed.

## 2026-10-23 23:35:49 UTC — A9 verified; wave 1 complete

Ran here, exit codes read directly: `node --check tools/render.js` 0; `py_compile tools/score.py` 0; `python3 tools/score.py --selftest` 0 ("OK: all selftest checks passed"); `node tools/render.js --page app --sections intro --bars 2` 0 (2 bars in 0.32 s, no page errors, wrote tools/out/app-intro-0-2.wav); `python3 tools/score.py tools/out/app-intro-0-2-v2.wav --json` 0. tools/out/ was already git-ignored. A9's reference comparisons (loudness within 0.05 LU of O1's table on all 7 sections, true peak within 0.01 dB, kick glide 253/51/25 ms against O1's 264/51/24) are A9's numbers from its log, not reproduced here: the reference file is not in the repo.

A9's wall time per rendered bar: intro 0.22 to 0.27 s, mainA 1.05 to 1.08 s, so a 200-bar song is 3 to 4 minutes offline. That explains A6's export timeout and is now a measured wave-2 item, not a mystery; A11 is finding where the mainA time goes.

A9 findings routed to wave 2: for A7, the V2 sub duck is 14 to 15 dB too deep at 100 to 150 ms though it matches the reference at 0 to 60 ms; the baseline intro is about 14 dB hot in the mids (R −9.8 against the reference −23.9), owner to be decided after A11 (synth level versus EQ). A9's unresolved measurement questions (band levels 1 to 2 dB above O1's method in every section, stab-step correlation not reproduced, kick glide fit unreliable on renders, build tempo read at 63 BPM) stay in log-A9.md as open.

Wave 1 is complete: A1 to A10 handed back, every check green and run here (selfcheck 263, synths 36, processors 54, widgets 134, faces 982, system-editor 40, step-view 53, browser-check 26, score selftest). Next: compile DISCUSSION.md from the wave-1 logs, A11's findings, then wave-2 owner fixes and the sampler.

## 2026-10-23 23:39:09 UTC — screenshots and docs

Ran the app in headless Chromium (viewport 1440×900, tools/serve.js): Start audio, Play, System Editor, Tab to Step View, double-click on a face title. No page errors. Screenshots saved to docs/screenshots/app-system-editor.png, app-step-view.png, app-device-window.png and added to README.md. Observation for wave 2 (owners A3 and A6): the device window's Editor tab shows only the hero graph, scaled to the window, with no parameter controls; the knobs are behind the Controls tab (Faces.fallback). The round-5 design and the FloatingWindows mockup show the hero with the section controls below it in the window density. Either facedefs' window layout should include the sections or windows.js should render the face density under the hero. Also for A11 to confirm: a second double-click on another title retargeted the same window (Link: Single), which is the contract's behaviour.

Updated README.md (app section, quick start, Build Crew row, layout), CLAUDE.md (263 checks, app checks, serve, render and score), docs/research/README.md (status), docs/plans/2026-10-23-desktop-build-plan.md (milestone statuses 1 to 5b).

## 2026-10-23 23:43:46 UTC — DISCUSSION.md compiled; rulings on what the scribe found

The scribe compiled `DISCUSSION.md` (22 threads) from the ten logs and this one, and listed what the logs leave inconsistent or unanswered. Records are not edited; the corrections and rulings are here.

**Corrections.**
- Browser-check counts: I wrote "22 of 23" at the A6 gate; A10's revision then reordered and merged steps (the step toggle moved before the device window, the title and window checks became one assertion with a Windows.open spy), and the final run reports 26. A11 saw 27 (26 pass, 1 fail) on an intermediate tree. The counts differ because the check changed, not because results were misreported. The "FAIL, 10 checks" I wrote earlier meant 10 failed checks on the first tree.
- System-editor-check: my 23:14 entry called the red check an interface mismatch between A4 and A6. A4's log and my 23:23 entry show it was the check's fake DOM. The 43 → 40 change is A4 merging assertions in its revision; A4's log does not say so, and I did not ask. Noted, not reopened.
- tools/out/ was ignored by me in an earlier gitignore commit (f5c1beb's neighbour), before A9 looked; A9's "not added" means A9 did not add it. Both true.
- Render time: A9's rate (about 1 s per mainA bar) gives about 50 s for 48 bars, not the "over 100 s" A6 reported; A6's number may include page start, the tail and WAV encoding, or a slower moment of the sandbox. More important, the scribe points out that the archived page renders mainA at the same speed as the app (17.3 s against 16.9 s for 16 bars, A9's log), and Freeverb and the seeded IR exist only in the app and are off by default. So those two suspects I named are unlikely to be the cause; forwarded to A11.
- A3's "15 new params" is 14 by the names listed. Count error, no effect.
- BRIEF.md names A11's file `review-A11.md`; the file is `log-A11.md`. The log name stands; BRIEF.md is amended by this note, not by editing the brief.

**Rulings on A7's four open decisions** (log-A7.md, lines 20, 23, 29, 30).
1. **B0 bar**: unmeasured, so do not guess a bar. Keep C#1 and the TODO; the sampler and remix pipeline will bring measured notes. Not a wave-2 item.
2. **Sub attack**: A7's reading is right. The values are the sidechain processor's, not the instrument's attack. No change.
3. **Lowpass restore at bar 136, not 128**: keep 136, the reference's measured section start. Bars 128 to 135 are unmeasured; a future render-versus-reference score of that window decides it.
4. **choke**: not now. It arrives with the sampler (milestone 5b lists choke groups), where it is needed for one-shots; the hats can wait for the same mechanism.

**Rulings on the rest.**
- Step View follow: A5 defaulted follow to off, A6 calls `selectSection` on every section event. Ruling: following the playhead while playing is the behaviour the owner asked for ("modify every step ... in that view" while the song runs), so follow defaults on; A5 flips its default and its button turns it off, and `selectSection` honours the flag. Wave 2, A5.
- Rulers: both views draw their own ruler (A6's reading). Acceptable for now; a shared ruler widget is a wave-3 simplification, not a bug.
- A5 and the editor extras: whether step-view.js uses `ed.group`, `ed.setFx`, `ed.setVariantBars` is for A11 to check and A5 to state in its wave-2 log.
- A6's note that the face head repeats the window title bar at window density, unanswered by A3: joins the window Editor-tab item (hero only, no controls). A3 and A6 settle it in wave 2: the window shows one title bar (the window's), and the face's window density carries the hero and the section controls.
