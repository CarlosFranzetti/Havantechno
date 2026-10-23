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
