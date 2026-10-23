# log-A11: integration review (wave 2, step 1)

Reviewer: A11 (Opus). Repo /home/user/havantechno, branch claude/song-synths-sequencer-processors-e79zyb, head 6ab1499 (working tree has uncommitted edits to tools/browser-check.js, tools/render.js, tools/score.py by their owners). I write only this file. No commits.

## Read

BRIEF.md, app/CONTRACT.md, app/README.md, THIRD_PARTY.md, app/index.html, app/package.json (first pass). Further reads are listed per section below.

## Checks run (exact command, exit code read directly, not piped)

| Command | Result | Exit |
|---|---|---|
| `node app/engine/selfcheck.js` | OK: 263 checks passed | 0 |
| `node tools/synths-check.js` | OK: 36 checks passed | 0 |
| `node tools/processors-check.js` | OK: 54 checks passed | 0 |
| `node tools/widgets-check.js` | OK: 134 checks passed | 0 |
| `node tools/faces-check.js` | OK: 982 checks passed | 0 |
| `node tools/system-editor-check.js` | OK: 40 checks passed | 0 |
| `node tools/step-view-check.js` | OK: 53 checks passed | 0 |
| `timeout 280 node tools/browser-check.js` | 26 PASS, 1 FAIL ("device window opens on double-click": locator.dblclick timeout 5000 ms), 0 page errors, 0 console errors | 1 |

Note: the brief said "22 of 23"; the working-tree browser-check.js (uncommitted A10 edit) now has 27 checks; 26 passed. The one failure is the known device-title selector.

## Read (full list)

- Logs: coordinator, A1, A2, A3, A4, A5, A6, A7, A8, A10 (all in full; A9's log not read, A9's tools out of scope).
- Engine: core.js, synths.js, processors.js (base, reverb, sidechain, chain, channel, master; delay/eq/widener/chorus bodies skimmed), songdoc.js, sequencer.js, song.js, host.js, project.js, selfcheck.js lines 1-82 (fake context).
- UI: widgets.js 180-500 and 613-700 (control gestures, steps), faces.js (all), system-editor.js 1-60, 180-330 and its call sites, step-view.js write path (236-300), selectSection/gotoSection (664-670, 920-990), windows.js (all), app.js (all).
- Shell: main.js, preload.js; tools/serve.js. Not read: facedefs.js bodies (heroes), theme.css, tools/render.js, score.py.
- CONTRACT.md changed during my review (commit 542e7b5, Sampler section); read the diff.

## Scratch scripts (in my scratchpad, not in the repo)

- `a11/engine-probe.js`: loads the real engine files into a vm sandbox with selfcheck.js's fake Web Audio section (same trick as processors-check). Run: `node <scratch>/a11/engine-probe.js`, exit 0.
- `a11/render-perf.js <variant> <bars...>` (env STEADY=1 replaces the arrangement with one section of N bars playing mainA's tracks): Playwright Chromium, tools/serve.js on a random port, times `scheduleAll` and `startRendering` at 44.1 kHz.
- `a11/ui-probe.js`: drives the real app (Start audio, System Editor step drag, window open, knob drags, Step View during a section change).
- `a11/archive-perf.js`: archived studio's Sequencer.render vs app Host.render on bars 0-16 and 40-56.

## Render performance (measured, headless Chromium in this sandbox, 4 cores, 44.1 kHz)

| Case | 4 bars | 16 bars | 32 bars | 48 bars |
|---|---|---|---|---|
| Real song, as shipped (`base`) | 0.74 s | 4.3 s | - | 111.6 s |
| Real song, scheduled 2 bars ahead with `OfflineAudioContext.suspend` (`chunked`, no engine edit) | 0.65 s | 2.2 s | - | 13.0 s |
| One mainA-like section, as shipped (STEADY base) | 1.8 s | 18.0 s (17.5 s rerun) | 64.2 s | not run |
| One mainA-like section, chunked | 1.55 s | 6.2 s | 13.1 s | 20.3 s |
| STEADY 16 bars, reverb `seed: 7` | | 17.5 s | | |
| STEADY 16 bars, reverb `algo: 'freeverb'` | | 17.2 s | | |
| STEADY 16 bars, no sends at all | | 15.6 s | | |
| STEADY 16 bars, no duck lists (no sidechain retriggers) | | 17.6 s | | |
| Archived engine, bars 0-16 / 40-56 | | 4.4 s / 17.5 s | | |
| App Host.render, bars 0-16 / 40-56 | | 5.1 s / 18.5 s | | |

JS time is small: `scheduleAll` 121 ms for 48 bars, build under 110 ms (the seeded IR adds about 20-30 ms of build).

Cause (measured): `Sequencer.render` (sequencer.js:475-495) calls `scheduleAll(from, to)` before `startRendering`, so every voice of the whole range (T11 below: 946 voices / 9579 nodes for 48 bars) is created and connected to `inst.pre` at time 0 and stays in the render graph for the whole render; `onended` cannot dispose them because the main thread does not run during an uninterrupted offline render. Cost per render quantum grows with the range, so total time is about quadratic: as shipped, 16 to 32 bars of steady content costs 3.6x; chunked it costs 2.1x, and 32 to 48 bars chunked costs 1.5x (linear). mainA is slower than the intro per bar because it fires about twice as many voices per bar (T11: 12 per bar in the intro, 23.5 per bar in bars 16-48), and the quadratic term multiplies that. Freeverb, the seeded IR, sends and sidechain retriggers are each within 2 s of baseline at 16 steady bars, so they are not the cause. The archived engine has the same cost (same up-front design), which matches A9's observation relayed by the coordinator. Chunked output equals the shipped output in RMS (0.3984 vs 0.3984 at 32 steady bars; peaks differ in the third decimal because the noise and IR use Math.random).

## Findings

Severity: blocker / major / minor. Owner from CONTRACT's table; sequencer.js, songdoc.js, core.js are unowned this wave, so those go to A1 as the engine lead (CONTRACT: "ask A1").

### Engine (A1 for unowned files; A7 synths.js)

E1. **Offline export is O(bars^2)** (major, blocker for "Export WAV" of the full song). sequencer.js:489 `seq.scheduleAll(from, to, 0.05)` then :490 `startRendering()`. Measured above. Fix (A1): schedule incrementally inside `render`: schedule the first 2 bars, then `octx.suspend(k * barSec).then(scheduleNextBar; octx.resume())` per bar (this is exactly what my `chunked` driver did, via `seq.scheduleStep`), falling back to today's up-front path when `suspend` is missing. 48 real bars: 111.6 s -> 13.0 s here.

E2. **Instrument `level` ignores the scheduled time** (major; owner A7). synths.js:111 `K.target(inst.out.gain, v, ctx.currentTime, 0.01)` drops `opts.at` (the onSet callback gets `opts` but makeInst does not pass it on; stab `hp` at :290 likewise). Path: song `set` {'kick.level', 'clap.level'} -> sequencer.js:336 `setParam(p, v, {at: t})` -> inst.set -> currentTime. Offline (T1): every kick.level write lands at t=0: `[[setTargetAtTime,1,0],[0.6,0],[1,0]]`, so an export never has the break's kick at 0.6 or the build's clap at 0.7 (export differs from playback). Live: the change is applied up to the 120 ms lookahead early. Fix: `function (name, v, o) { ... K.target(inst.out.gain, v, (o && typeof o.at === 'number') ? o.at : ctx.currentTime, 0.01) }`, same for stab hp.

E3. **Jump and partial render do not chase the arrangement state** (major; A1, sequencer.js). Section `set` is applied only on the first step of its own section (sequencer.js:335-336). T2: entering mainA2 linearly gives kick.level 1, clap.level 1, stab.cutoff 1500; after the user jumps to break and then to mainA2 it gives 0.6, 0.6, 900, and that state persists. T10: a render from breakEnd starts with kick.level 1 where playback has 0.6. Affects `transport.jump`, ruler clicks, loops, `host.render({from})` and A9's per-section renders. Fix: on jump and at the start of `scheduleAll`, apply the merged `set` of sections 0..target (later wins) plus each ramp's value at the start position, skipping held paths.

E4. **Undo of a step edit reverts later knob moves** (major, known; A1 owns the planned change). T4: kick.tune set to 60 after a step edit reads 44 after undo (`commit` rebuilt). Cause: `persist` (host.js:320) writes knobs into `ed.doc` without a snapshot and `undo` swaps in an older JSON. Fix as decided: snapshot on hold (see the audit below for which call to key it on).

E5. **Bypass is not part of the Host or the document** (major; A1 + A6). windows.js:142-144 calls `d.ref.bypass(b)` on the live engine object (the contract says the UI does not touch the engine; the contract has no bypass call). T5: bypass true on track:bass:eq, then a structural commit: false; nothing about bypass in the saved document; `host.render` builds fresh processors, so export ignores bypass too. Fix: A1 adds `host.bypass(id, b)` / `host.isBypassed(id)` persisted as `bypass: true` on the chain entry / send / master unit and restored on rebuild and render; A6 calls it (windows.js already prefers `h.bypass`/`h.isBypassed` when present, and the bridge must forward them).

E6. **Render ignores held paths** (minor; A1). host.js:541-554 builds a fresh sequencer with no `held`, so a section `set` overrides a value the user is holding during playback (e.g. hold stab.cutoff 3000 in mainA: playback keeps 3000, export applies mainA's 1500 at bar 40). Traced, not run. Fix: copy `seq.held` into the render sequencer (the doc already holds the knob value).

E7. **forkVariant can take a letter a section already names** (minor, latent; A1 songdoc.js:237; A5 step-view.js:272 `freeLetter` same rule). T8: with intro2 naming a missing kick B (plays A by fallback), a fork from mainA becomes B and intro2 silently starts playing the fork. Not reachable with Song.document() today. Fix: skip letters referenced by any section's `play` for that track.

E8. **A refused setStep still pushes an undo snapshot** (minor; A1, songdoc.js:220-223 `snap()` before the range check). T9: depth 0 -> 1 for index 999.

E9. Checked and fine: save -> parse round trip after locks, prob, cond, nudge, rep, a fork, setVariantBars(lead B, 6), a melody note crossing a bar, setFx, and knob writes to master, send, insert, track send, sidechain and bpm: `SongDoc.save` before and after `Project.parse(Project.serialize())` identical, and identical again after `host.loadDocument` (T3). Locks reach the voice and restore after the trigger; the `level` lock is ignored as designed (T6). Every voice is in `inst._live` and all 6246 voices of the 200-bar schedule leave `_live` after `onended`; no voice without a source (T7).

### Sampler contract added during review (coordinator, A1, A7)

C1. **`gain` collides with the channel's `gain`** (major, contract). Sampler spec names `gain`; sequencer.js:233 and host.js:337 resolve `<track>.<param>` against the instrument spec first, so for a sampler track `'<track>.gain'` (the channel face's fader, pathPrefix = track name) would write the sampler's gain and the channel gain would be unreachable. Every other instrument uses `level` for its trim. Proposal: name it `level`.
C2. **`ev.note` vs `ev.midi`** (major, contract). The contract says the sampler reads `ev.note`; the sequencer (sequencer.js:364, 370-372) sets `e.midi` from `cell.note`. Proposal: the sampler reads `ev.midi` like every other instrument (offset from 60 = C4 or 48 = C3; say which).

### A6 (app.js, windows.js, shell)

W1. **The Step View is yanked to the playing section on every section change** (major). app.js:623-626 calls `view.selectSection(name)` on each host `'section'` event, overriding A5's follow-off default, and step-view.js:664-670 `gotoSection` rebuilds even mid-drag. Verified in Chromium (ui-probe step 4): viewed section set to mainB, playhead crossed intro2 -> build, the view showed build. Fix: app.js calls selectSection only on mount/view switch; let the Step View follow when its own `follow` is on (A5 already does that in update()); A5 also guards gotoSection with `!st.dragging`.

W2. **The window's Editor tab shows only the hero** (major, answers the coordinator's question). windows.js:286-291 `resizeFace` passes the whole body height to `face.resize(w, h)`; faces.js:402-405 hands it to the hero. Verified (ui-probe step 2, screenshot): body 537 px, hero canvas 521 px, 9 controls in 5 sections, 0 visible without scrolling (scrollHeight 888). faces.js does render hero plus sections at window density (renderBody, non-strip branch), so the design (hero plus section controls) is what the face builds; the window squeezes it out. Fix (A6, with A3 agreeing the meaning of resize): pass the hero's height (layout heroH.window, or a share of the body), not the body height. Also the face head repeats the window title (A6 already noted it to A3).

W3. **Electron: a retargeted child window keeps its original id in main.js** (major, Electron only; traced, not run). main.js:157 keys `deviceWins` by the URL id; windows.js retarget (488-489, 685) changes only the renderer's record. Path: link Single, open track:kick (child K), select bass (K retargets to track:bass), switch link to Off, `Windows.open('track:kick')` -> no entry with that id -> `shell.openDeviceWindow('track:kick')` -> main.js:248-249 finds K and focuses it: kick never opens, the user sees bass. Bounds are also saved under the old id (main.js:158). In-page panels re-key correctly (windows.js:471-475). Fix: an IPC `retargetDeviceWindow(oldId, newId)` that re-keys `deviceWins` and the bounds key, called from the child's `retarget`.

W4. **Child windows never subscribe to `'document'`** (minor; traced). `Windows.embed` (windows.js:668-705) does not call `subscribe(h)`, so after a rebuild the child face refreshes only on the 45-frame poll (windows.js:328), about 0.75 s with a stale `ref`.

W5. **BPM and swing fields push every keystroke** (minor; traced). app.js:358 `input` -> `host.setParam('bpm', v)`: typing 126 sets 40 (clamped "1"), then 40 ("12"), then 126; the tempo jumps audibly while typing. Fix: push on `change`/Enter only.

### A4 (system-editor.js) and A2 (widgets.js)

S1. **A System Editor step drag floods the undo stack** (major). widgets.js steps `pointermove` calls `onDrag` on every move (no change check); system-editor.js:232-234 `dragStep` -> `setStepInSection` + `commit()` per call. Verified (ui-probe step 1): one 40 px drag added 21 undo entries and 19 `'document'` events. Fix: A4 writes once on release (as A5 does) or wraps the gesture in `ed.group`; A2 calls `onDrag` only when the quantised velocity changes and adds an end-of-drag callback.
S2. System Editor edits use the transport's bar and section at click time (system-editor.js:221), not the bar the row was drawn for; the window is one frame, so minor.

### A5 (step-view.js)

V1. Does not use A1's `ed.group`, `ed.setFx` or `ed.setVariantBars` (grep: no call). It truncates `ed._undo` itself (step-view.js:245-248), which fails at the 200-entry limit (shifted snapshots leave several undo steps). riser/impact rows stay read-only and new variants stay one bar although the calls now exist. Minor. Fix: `group` -> `ed.group(fn)`; wire setFx and setVariantBars.
V2. See W1 (gotoSection during a drag).

### A3 (faces.js)

F1. Knob `home` is the spec default, not the song's value (faces.js:217): double-click on kick tune goes to 45 while the song has 44. Minor. Fix: home = section set value, else the document's track param, else spec.
F2. Toggles and selects call `hold` on every change (faces.js:211, 214), including the channel `mute` toggle, so muting from a channel face adds `<track>.mute` to "Re-enable arranged (n)". Minor.

### Licence hygiene

No code copied from a third-party project found. Algorithms named in code: Freeverb topology and constants (processors.js:219, public domain, attributed), mulberry32 (processors.js:49 and tools/render.js:210, public domain), RBJ biquad formulas (facedefs.js:5, published formulas), BS.1770 K-weighting constants in score.py (standard coefficients; libebur128 named as the source of the numbers, not code). THIRD_PARTY.md is empty, which is consistent. Optional: a provenance row for Freeverb and mulberry32 (public domain).

### Contract and docs

D1. CONTRACT Faces says hold "on drag start (release via 're-enable arranged', not on drag end)"; the audit criterion I was given asks for release at gesture end. Nobody releases at gesture end, by contract (see audit).
D2. CONTRACT (and the coordinator's brief to me) say tools/serve.js serves app/; it serves the repo root (app at /app/index.html), as README says. Minor wording.

## hold/release audit

Verified in Chromium (ui-probe step 3): two drags of the kick `punch` knob in a window called `host.hold('kick.punch')` twice (once per gesture, before the first value change; widgets.js:316 ensureHold then onInput) and never `release`; heldCount 1; undo depth unchanged.

| Control | Owner | hold at gesture start | release at gesture end |
|---|---|---|---|
| Knobs and sliders in every face density (System Editor device row, windows, strips), including the `more` drawer and the Controls (fallback) view | A3 via A2 | yes, once per gesture (drag, wheel burst, key run, reset, typed value) | no (by contract) |
| Toggles and selects in faces | A3 | yes, on each change (one change = one gesture) | no |
| Native range fallback (only when Widgets is missing) | A3 | pointerdown only; keyboard changes do not hold | no |
| System Editor own controls: step toggle/drag, variant chips, M/S, ruler | A4 | none call setParam (document edits or session state); not applicable | - |
| Step View cells, lanes, lock lanes, progression, M/S | A5 | none call setParam (document edits); not applicable | - |
| BPM and swing fields | A6 app.js:347-360 | no hold | no |
| Window Mute and Bypass buttons | A6 windows.js:202-209 | no hold (mute is session state; bypass goes to `ref`) | no |

Conclusion for A1: every knob gesture calls `host.hold(path)` exactly once at its start, but `hold` is idempotent and the path stays held after the first gesture, so "snapshot on the first hold of a gesture" must mean "snapshot on every `host.hold` call", not "when the path becomes held". There is no gesture-end signal anywhere (no `release`, no widget callback), so the snapshot must be taken before the value changes (it is: onHold precedes onInput). BPM/swing need a hold-equivalent (or their own snapshot on `change`) if they are to be undoable; step drags in A4 need S1's fix first.

## Unverified suspicions

- Electron, Single link: two `Windows.open` calls before the first child registers (windows.js:544-546 returns `{pending: true}`) open two linked windows.
- A child window that crashes leaves its listeners in `host` (bridge `on`); `host.emit` would then warn on every step event.
- `Project.restoreAsync` prefers app-data over localStorage even when the app-data write failed and localStorage is newer.
- Nothing run in Electron by me; W3/W4 are code traces only.

## Questions

- **To the coordinator:** (1) gesture-end semantics: keep "release only via Re-enable arranged" (then A1 snapshots per `hold` call) or add a widget `onEnd` and a Host `endGesture()`? (2) Sampler `gain` -> `level` and `ev.note` -> `ev.midi` (C1, C2) before A7 builds it? (3) Is chasing the arrangement on jump (E3) wanted, or is "sound state persists across jumps" the intended behaviour?
- **To A1:** E1 (chunked render), E3, E5 (host.bypass), E6, E7, E8. **To A7:** E2. **To A6:** W1-W5, and E5's caller side. **To A4 / A2:** S1. **To A5:** V1, W1's drag guard. **To A3:** F1, F2, and W2's resize meaning.

## Hand-back status

All of the above written before hand-back. No other file touched, nothing committed.

Note added at hand-back: while I wrote this, app/engine/host.js gained about 220 uncommitted lines (A1's sampler work: loadAudio, buildSong, getBuffer). My host.js line numbers and probes refer to head 6ab1499's host.js; I did not rerun anything against the new version. C1 (sampler `gain` vs channel `gain` path) applies to it as soon as sampler tracks exist.
