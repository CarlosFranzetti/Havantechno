# Log A5: Step View (`app/ui/step-view.js`)

Build Crew, wave 1, 2026-10-23. Files: `app/ui/step-view.js` (global `StepView`), `tools/step-view-check.js`.

## Start

- Read CONTRACT.md, BRIEF.md, `round5-FS5-step-view.md` (whole), REPORT.md section 11, `songdoc.js` (header, `createEditor`).
- Logs read at start (none existed for A5): none addressed to me. Logs read before finishing: A1, A2, A4, A7, A10, coordinator.
  - A1: `host.mute(track, b)` / `host.solo(track, b)` exist, `host.tracks()` lists `muted`/`solo`, `transport.pos()` returns `{step, bar, section: index, sectionName, barInSection}`; `'document'` carries `{reason, rebuilt}`. Adopted: M and S call `host.mute` / `host.solo` (fallback `setParam('<track>.mute')`), initial state from `host.tracks()`, playhead from `sectionName` + `barInSection`.
  - A10 to A5: the check looks for the Step View as `[data-view="step"]` or `.step-grid` and cells as `[data-step]`. Done: the view root has `data-view="step"`, each row's cell container has class `step-grid`, each cell carries `data-step`. My cells are `div[role=button][aria-pressed]`, not `button.hv-step` (theme.css styles `.hv-step` as a Widgets.steps cell; mine have their own sizes and lane alignment), so A10's selector `.step-grid [data-step]` is the one that matches. A click on a cell changes `host.document()` (verified in a real Chromium page, see below).
  - A2: I use none of `Widgets` (plain DOM) and only A2's custom properties with fallbacks; my classes are all `sv-*` plus `btn btn-mute` / `btn btn-solo` on M and S. I did not use `.row` / `.chip` from theme.css (they are shaped for the System Editor row); no conflict.

## Decisions

1. **Self-contained styling.** The view injects one `<style id="sv-style">` (classes `sv-*`) that reads A2's tokens (`--bg --panel --panel-raised --line --fg --dim --on --arm --fam-ink --fam-wash`) with fallbacks. Same approach as A4.
2. **Layout.** Toolbar (section name and bars, bar `<select>` 1..n with prev/next, "longest pattern", follow toggle, Undo, Redo); column header (step numbers, section numbers 1..9 with names in the tooltip); 4 group headers (collapsible, start expanded) over 13 rows; right column shows each section's variant letter for that track, current section outlined, and "used n" for the variant this section plays; bottom band = Step Editor + variant panel. The three columns use shared CSS variables so lanes line up under the step columns.
3. **Bar and section.** The viewed section and bar belong to the view (`select(track)`, extra `selectSection(nameOrIndex)`). It starts at the playhead's section. "follow" (off by default; editing a looping bar would otherwise jump) makes section and bar track the playhead while playing. Clicking a section letter, `<`, `>` or the bar select turns follow off.
4. **Cell gestures.** Click toggles (rest to `{vel: 0.85}`, hit to rest); drag vertically on a lit cell sets velocity (40 px = full range, Alt snaps to 0.5/0.85/1 on release) and writes once on release; melody cells drag pitch instead (8 px per semitone) and toggle on with the nearest earlier note; Shift-click toggles accent (`{acc: true, vel: 1}` / `{acc: null, vel: 0.85}`; melody: vel 1 / 0.85); Alt-click soft (0.5); a second click within 320 ms on the same cell clears it; Space/Enter toggle (Shift = accent). Marks: `*` lock, `%` prob under 1, `~` nudge (first that applies); the tooltip lists every field.
4b. **One undo per gesture.** `setStepInSection` on a shared variant takes three snapshots (fork, setPlay, setStep). `group()` in my write path truncates `ed._undo` to the first of them, so one gesture is one undo step (it reads the editor's `_undo` array, guarded: if it is missing nothing is collapsed).
5. **Loop ghosts.** A cell row is dimmed when the variant has fewer bars than the longest variant played in the section and the viewed bar is past the variant's own length (a repeat of the loop). Bar 1 of a 1-bar pattern is not dimmed, because it is the real bar. Editing a ghost cell edits the looped bar (index = `viewedBar % bars`).
6. **Step Editor lanes.** Always: VEL (0.05..1), GATE (`len` in steps, 0.1..max(4, 2x default)), PROB (0..1, step 0.05), NUDGE (-0.5..0.5 steps shown as 1/24 units), REP (1..8); NOTE for `note` kind (track note +-12) and `melody` kind (C3..C6); chord tracks get the progression strip above the lanes (click a slot, type a chord, Enter; writes `setProgression(section, index, chord)` so it is this section's progression; labelled "shared with pad/stab"). "+ lane" menu: COND (click cycles `1:2, 2:2, 1:4 ... !4:4`) and one LOCK lane per spec parameter of the instrument (`host.device('track:<n>').spec`, fallback `Synths.spec(inst)`), minus `level` and `drive` (they act through callbacks, the design says they cannot be locked) and stab `hp`. Log mapping for parameters whose max/min >= 50. Lane drag sets an absolute value from the pointer's height in the cell, Shift = relative at one fifth, writes once on release; double-click clears (field reverts to default); lane cells of rest steps are inert (a lane value on a rest would turn it into a hit, since any non-null cell plays).
7. **Variants and scope.** The chip on each row and the panel chips call `setPlay`; "+ new empty" makes a one-bar empty variant (`setStep(track, letter, 0, null)` + `setPlay`), "+ copy of this" is `forkVariant` + `setPlay`. Scope radio: "this section only (forks B to D on first edit)" or "all n sections" (chip gets a warning outline). After a fork a message line says "bass B to D for mainA2; B is still used by mainB" with Undo and "Apply to all n instead" (undo, then the same write with scope `all`).
8. **riser and impact** rows show the section's `fx` hits for the viewed bar (a continuing riser shows a dim cell at step 1) and are read-only: songdoc's editor has no fx write.
9. **update()** moves the `ph` class between columns only when the step changes, follows the playhead if enabled, notices a replaced document (undo, load) by identity, and every 10th frame compares a signature of the viewed cells, `play`, `fx`, progression, to catch edits made elsewhere. A `'document'` event rebuilds. It never rebuilds during a drag.

## Questions and requests

- **To A1 (songdoc owner):** (a) an `ed.group(fn)` or `ed.edit(fn)` that takes one undo snapshot for several operations would remove my access to `ed._undo`; (b) `ed.setFx(section, index|null, patch)` so the riser and impact rows can be edited; (c) `ed.setVariantBars(track, variant, bars)` so a new variant can be longer than one bar (the lead's 4-bar loop is the case).
- **To A6:** `StepView.mount(el, host)` wants `el` to be a flex or fixed-height area below the control bar (the view scrolls inside). `update()` every frame is cheap. If the ruler selects a section, call `view.selectSection(name)`; the view does not read any shared selection by itself. Tab handling stays in `app.js`; the view has no key handler outside its own cells.
- **To A4:** the System Editor and the Step View keep separate selected-track and section state; `app.js` can sync them through `select(name)` and `selectSection(name)`.

## Shipped

`app/ui/step-view.js`, `tools/step-view-check.js` (uses the real `Host.create()`; `SV_FAKE_HOST=1` forces the minimal fake host).

## Not done

- Drag across cells to paint, drag the cell's right edge for length, double-click inspector, right-click menu, marquee, copy/paste, 2-bar view, Alt-drag lane ramp, baseline click, "Rnd/Clr/Copy" buttons (all in the design, none in the brief's list).
- Lane order, collapsed state, scope and added lanes are in memory only (not remembered across a reload).
- Not run inside the full app frame (`app.js`, `index.html` do not exist yet).

## Verification run

```
$ node --check app/ui/step-view.js && node --check tools/step-view-check.js     -> no output, exit 0
$ node tools/step-view-check.js
host: real Host.create()
(apply-to-all branch ran)
OK: 53 checks passed
$ SV_FAKE_HOST=1 node tools/step-view-check.js
host: fake over SongDoc editor
(apply-to-all branch ran)
OK: 55 checks passed
$ node app/engine/selfcheck.js | tail -1   -> OK: 193 checks passed
```

The check mounts the view on a fake DOM, asserts 13 rows, 4 groups, 16 cells per row, 9 section buttons; selects mainA2 / bass; a click on a cell of bass B (shared with mainB) forks it to D (mainA2 plays D, mainB still B, D.from = 'B', B unchanged, one undo step, one commit with the fake host, fork message shown); a second click edits D in place (no E), a double-click clears; "+ lane" lists cutoff and not level/drive, adds the lock lane, a lane drag writes `locks.cutoff` and the `*` mark appears; scope "all" edits kick A in place without a fork; the playhead column lands on step 6 in all 13 rows; Undo x5 back through each edit leaves mainA2 on B with no D, Redo restores the fork; M calls `host.mute`; the variant menu's "+ new empty" creates and plays a one-bar empty variant; the riser row shows its hit in bar 13 of build; "Apply to all" edits the shared variant in place; dispose removes the root and every listener on the document and host.

Also run once in real Chromium (Playwright, a scratch page outside the repo with theme.css, the engine files, the real Host and the view, viewport 1440 x 900): page errors and console errors none; a real mouse click on a bass cell forked B to D; the "+ lane" menu item `cutoff` added a lane and a mouse drag in its cell wrote `locks.cutoff = 4339.83`; the screenshot showed rows, lanes and the variant panel aligned as in the design wireframe. Not checked: touch, keyboard flows in a real browser, the narrow layout, the System Editor / Step View switch.

## Wave 2 (coordinator ruling: follow defaults on; editor extras)

Changes in `app/ui/step-view.js` and `tools/step-view-check.js` only.

1. **Follow defaults on** (supersedes decision 3 above). `st.follow` starts true; the "follow" button turns it off. While the song plays and follow is on, `update()` moves the view to the playhead's section and bar. The public `selectSection(nameOrIndex)` (what `app.js` calls on every host `'section'` event and at mount) returns without effect when follow is off. A click on a section number in the view, `<`, `>` or the bar select still moves the view directly and turns follow off. (Side effect to know: with follow on, the viewed bar changes every bar while playing; the owner turns follow off to edit one bar.)
2. **Editor extras A1 added, all three now used** (reading `host.js`, lines 83 to 125):
   - `ed.group(fn)`: `group()` in the write path calls it; the hand-made `ed._undo` truncation stays only as a fallback for an editor without `group`.
   - `ed.setFx(section, index|null, patch|null)`: riser and impact cells are now editable. A click on an empty step adds `{bar: viewedBar, step, track}` (riser also `bars: 4`), a click on a hit (or a continuation cell) removes it; the band lists the section's hits for the track with a bar-length select that calls `setFx(section, idx, {bars})`.
   - `ed.setVariantBars(track, variant, bars, 'repeat')`: a "Pattern length" select (1, 2, 4, 8, 16, plus the current value) in the variant panel. With scope "this section only" a shared variant is forked first (inside one `group`), with scope "all" it is changed in place.
   - If the editor lacks `setFx` or `setVariantBars` (the bare `SongDoc` editor in the fake-host mode of the check), those two controls do nothing instead of throwing.
3. Check: new assertions for follow default, `selectSection` with follow off and on, a section-number click, riser fx add and remove, pattern length 2 bars. The fx and length assertions are skipped with a printed note when the editor has no `setFx` (`SV_FAKE_HOST=1`).

### Verification (exit codes read directly, not through a pipe)

```
$ node --check app/ui/step-view.js; node --check tools/step-view-check.js    exit 0, 0
$ node tools/step-view-check.js            -> OK: 64 checks passed     exit 0   (real Host.create())
$ SV_FAKE_HOST=1 node tools/step-view-check.js -> OK: 59 checks passed  exit 0   (fx and length checks skipped, noted)
$ node tools/browser-check.js              -> RESULT: PASS (26 checks)  exit 0
```

Not checked: the follow behaviour while real audio plays in a browser (browser-check switches to the Step View while playing and the step toggle passes, but does not assert the view's section moves with a section event); the new fx and pattern-length controls in a real browser (Node fake DOM only).

## Wave 2, item 2 (A11 finding, app.js:623: view pulled to the playing section during a drag)

- **Fix** in `app/ui/step-view.js`: a pointer gesture in a cell or lane cell (pointerdown to pointerup or pointercancel) sets `st.gesture`. While it is set, `selectSection(ref)` (the call `app.js` makes on every host `'section'` event) stores the latest `ref` in `st.pendingSection` and returns, and the `update()` follow jump is skipped. When the gesture ends (every exit path of the up handlers, through `endGesture()`), the pending section is applied through `selectSection`, so follow still decides: if follow was turned off meanwhile, it is dropped. Double-click clears and COND-cycle clicks on lane cells never register a gesture (they have no pointerup handler), so they are not affected. A direct click on a section number is unchanged (not deferred).
- **Check**: `tools/step-view-check.js` section 6d: pointerdown in a cell, two section events (`intro`, `break`), view stays on mainA2 with `break` pending, pointerup moves it to `break`; a second gesture ended by `pointercancel` applies `build`; the same for a lane cell (`outro`).
- **A11's editor-extras finding** (step-view.js not using `ed.group` / `ed.setFx` / `ed.setVariantBars`) was resolved by the previous wave-2 change above: all three are used.
- **Verified, exit codes read directly:** `node --check app/ui/step-view.js` exit 0; `node tools/step-view-check.js` -> `OK: 72 checks passed`, exit 0 (real Host); `SV_FAKE_HOST=1 node tools/step-view-check.js` -> `OK: 67 checks passed`, exit 0; `node tools/browser-check.js` -> `RESULT: PASS (26 checks)`, exit 0. Not checked: the deferral with real section events during audio playback in a browser (Node fake DOM only).
