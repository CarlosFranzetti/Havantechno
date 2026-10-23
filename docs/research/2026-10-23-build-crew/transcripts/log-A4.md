# Log A4: System Editor (`app/ui/system-editor.js`)

Build Crew, wave 1, 2026-10-23. Files: `app/ui/system-editor.js` (global `SystemEditor`), `tools/system-editor-check.js`.

## Start

- Read CONTRACT.md, BRIEF.md, REPORT.md section 3 and 11, round2-FO2 ("My suggestion"), round2-FS2, round1-FH5 (overview, ruler), VOTE.md "Amendments", and `songdoc.js` / `sequencer.js` for the document and `pos()` shapes.
- Other logs at start: A1 and A10 (nothing addressed to A4). A1 says `host.mute(track, b)` and `host.solo(track, b)` exist and that `setParam('<track>.mute', b)` routes to the same code, so my M and S call `host.mute`/`host.solo` and fall back to `setParam('<track>.mute')` (solo emulated by muting the others) when they are missing.
- `app/engine/host.js` did not exist while I worked, so the check ran on a fake host. `widgets.js`, `theme.css`, `faces.js` appeared midway; `facedefs.js`, `windows.js` did not.

## Decisions

1. **Layout as built.** Overview strip, section ruler, four collapsible group headers over thirteen rows, one device row. Rows and groups are fixed (`SystemEditor.GROUPS`); a document track not in the table lands in OTHER. Group headers start expanded (the report says "collapsed" for the empty stem lane, not the rows); each shows a placeholder "stem lane: empty". Collapse state survives rebuilds.
2. **Proportional columns.** Overview, ruler and the nine cells in every row share one grid, `minmax(0, <bars>fr)` per section with no gaps, so a section lines up in all three and the playhead is a single `left: %` of `bar/totalBars`. Widths come from the document (16/8/16/32/32/24/8/48/16 for the Guidance song).
3. **"Visible window" in the overview** = the current section (what the step rows and PATTERN face show). The whole song already fits the ruler, so there is no zoom; click in the overview jumps to the section at that bar. Dragging the box is not implemented.
4. **Ruler.** Click a block = `host.transport.jump(sectionName)`. Loop: the "Loop" button loops the current section, double-click on a block loops that section; both call `host.transport.loop(name | null)` and draw the brace from local state (the contract has no loop getter; **To A1:** if you add `host.transport.loopSection()` or a `'loop'` event I will read it instead). Blocks with master/send ramps get a `~`.
5. **Row.** 4 px rail, face chip (`Faces.render(device 'track:<name>', 'chip')`; it already draws glyph + name, so my own name label is used only when no face exists), M, S, `Widgets.meter` fed by `host.meter('track:<name>:channel').level`, `Widgets.steps` for the current section's bar, nine section cells with the variant letter and `~` where the section has a ramp on that track. Selecting: click or Enter on the row; ArrowUp/Down moves between rows. A click on a section cell selects the track and jumps to that section.
6. **Step toggles** go through `host.editor().setStepInSection(sectionName, track, barInVariant*16+step, patch)` then `host.commit()`. Toggle patch is `{vel: 0.85}` or `null` (rest); a drag sends `{vel}`. Because that call is copy-on-write with the default scope, editing a variant that several sections share forks it (kick A in the intro becomes a new letter for that section only). The Step View has the scope switch; this view does not. A section that does not play the track disables the row (dimmed, edits ignored).
7. **Device row.** PATTERN face first (16 steps + variant chips calling `editor.setPlay` + commit, per FH1: the progression strip for chord tracks and the compact roll for melody), then instrument, inserts, sidechain, channel (all `Faces.render(dev, 'face')`), then RETURNS and MASTER chips pinned right. Clicking a pinned chip expands it as a `strip`-density face inline; double-click opens a window. Device order is by `kind` (instrument, insert in `devices()` order, sidechain, channel). Sidechain is shown because "duck" is part of the channel strip in the report.
8. **Windows.** The face draws its own head (glyph + title); a double-click on `.hv-head`/`.hv-title` inside a device box calls `Windows.open(device.id, host)`. If `Faces.render` fails, a small title bar of mine stands in. Selecting a track calls `Windows.onSelect('track:<name>')` if it exists.
9. **update()** is allocation-light: playhead `left` is written only when the percentage string changes; step rows and the PATTERN face only when a signature (section, variant, bar, doc revision) changes; meters only when the level moved by more than 0.004; faces get `update()` every call (A3's job to keep that cheap). DOM rebuild happens on `mount` and on the host's `'document'` event, except that a `'document'` event with `rebuilt === false` and unchanged track/section names and bars refreshes in place (cells, step rows, new variant chips) so keyboard focus stays on the step just toggled. **To A1:** this relies on `'document'` carrying `rebuilt` as your log says; without it I do a full rebuild every time.
10. **Styling.** `theme.css` (A2) has no classes for these bands, so the file injects one `<style id="se-style">` (classes `se-*`) that only uses A2's custom properties (`--bg --panel --panel-raised --line --fg --dim --on --solo --fam-ink`) with fallbacks. Minimum width 880 px inside the view's own scroll container (no page scroll). **To A2:** if you want these styles in `theme.css`, take the `CSS` array at the top of `system-editor.js` and tell me; I will then delete the injection.

## Questions / notes to others

- **To A3:** I rely on `Faces.render(device, density, host)` returning `{el, update, dispose}`, on the `chip` density showing glyph + name, and on `face`/`strip` drawing their own head with a `.hv-head` or `.hv-title` element. If the head class changes, tell me. Glyph chip for the row looks up `host.device('track:<name>')`.
- **To A6:** `SystemEditor.mount(el, host)` expects `el` to be the area below the control bar, with a definite height (it scrolls inside). It calls `Windows.open` and `Windows.onSelect` only if they exist. `select(name)` ignores unknown names.
- **To A2:** I pass `Widgets.steps` cells as SongDoc cells (`null` or `{vel, acc, ...}`); your `levelOf` handles that. Fine as is.

## Shipped

- `app/ui/system-editor.js` (`SystemEditor.mount(el, host) -> {update, dispose, select}`, `SystemEditor.GROUPS`).
- `tools/system-editor-check.js`.

## Not done / unverified

- Never run in a browser (no Playwright run of this view yet): layout, spacing and the injected CSS are unseen. The Node check uses a fake DOM, so the real `Widgets.steps` ran only against that fake.
- Not run against the real `Host` (`host.js` did not exist) or the real `Faces` (`facedefs.js` did not exist): the fake host reproduces the contract shape (document, editor, commit event, `transport.pos/jump/loop`, `devices`, `meter`, `mute`).
- Dragging the overview box, section-cell right-click variant cycling, and editing the chord progression from the strip are not built.
- Solo emulation (when `host.solo` is missing) mutes the other tracks through `setParam('<track>.mute')`; untested against the real engine.

## Verification run

```
$ node --check app/ui/system-editor.js          -> no output, exit 0
$ node --check tools/system-editor-check.js     -> no output, exit 0
$ node tools/system-editor-check.js
  update() x100: 12 ms, 856 DOM nodes
using: host=fake, widgets=real, faces=fake, windows=fake
OK: 43 checks passed
```

The check mounts the view, asserts 13 rows, 4 group headers, 9 ruler blocks with `16fr 8fr 16fr 32fr 32fr 24fr 8fr 48fr 16fr` columns, 9 cells per row, PATTERN first in the device row, RETURNS/MASTER chips, selects kick, bass, lead (roll), pad (progression strip) and an unknown name, double-click on a face head opens a window (and not outside the head), ruler click jumps, Loop toggles, M calls `host.mute`, group collapse, a step toggle calls `commit` and forks kick A (in place refresh keeps the same row nodes), a `rebuilt: true` event rebuilds, 100 `update()` calls with a moving playhead leave the node count unchanged, and `dispose()` removes the view and unsubscribes.

## Wave 1 follow-up: check red against real Host and real windows.js

Coordinator report: `FAIL: step edit forked kick A for the intro ...` and an earlier "Windows.open called on head double-click" failure. No editor code changed; both were check problems.

- **Fork assertion:** the earlier ruler click does `host.transport.jump('mainA')`, which really moves the real Host, so the step edit (which edits the section the transport is in, as designed) forked mainA's kick variant. `tools/system-editor-check.js` now reads `host.transport.pos().section` before the edit and asserts the fork, and the section cell, for that section.
- **Windows assertion was silently skipped, then exposed:** it was guarded by `!used.faces`, so with real faces it never ran. I added a spy around `Windows.open` / `Windows.onSelect` (real or fake; the real call goes through) and asserted `Windows.open(deviceId, host)` is called with a string id and the same host on a double-click on the face head, that a double-click outside the head does nothing, and that the real call does not throw and puts a window into `#windows`. Two gaps in the fake DOM were the real cause of the failures: no `createElementNS` (the real Faces/Widgets then threw, and the editor correctly fell back to its own title bar, which has no `.hv-head`) and no `#windows`/`body` for the real `Windows.open` (`layer = getElementById('windows') || document.body`; app.js provides `#windows` in the page). Both were added to the check's fake document.
- The editor calls the Windows API as written in CONTRACT.md (`Windows.open(deviceId, host)`, `Windows.onSelect('track:<name>')`); nothing for A6 to change.
- The in-place-refresh and rebuild assertions now also run against the real Host (a step commit is incremental; `host.loadDocument(host.document())` gives the `rebuilt: true` rebuild).
- Run directly (not through a pipe): `node tools/system-editor-check.js` printed `using: host=real Host.create(), widgets=real, faces=real, windows=real` and `OK: 40 checks passed`, exit code 0.
