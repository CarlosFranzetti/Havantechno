# F-S5: interaction — round 1
Agent model: Sonnet. Date: 2026-10-23.

## Scope

How a user touches the studio: knob and slider conventions (drag, fine control, reset, typed values), how Live and Logic display automation and modulation, the step grid versus the piano roll, touch support in browser DAWs, and then concrete interaction rules for Havantechno. I did not cover layout, visual style or implementation of the knob widget itself (F-S2 and F-S4 own those); where my rules need a widget feature I say so.

Evidence labels follow the BRIEF. Most Ableton and Logic facts below rest on search excerpts, because no page fetch was made. Facts about this repo are read from local files and marked `(verified: <path>)`.

## What I looked at

- BRIEF.md in full.
- Screenshot `docs/screenshots/studio-playing.png`: 13 identical cards. Each has a 16-cell step row (about 16 px per cell, the current step outlined in green, hits dim blue, accents brighter), then five native-looking sliders (level, pan, send delay, send reverb, duck depth) with a numeric readout on the right, then a collapsed "synth parameters" disclosure (and "inserts: eq" or "inserts: width" on bass and stab). M and S buttons sit top right. A section bar above lists 9 buttons with bar counts and a "loop section" checkbox. The sliders have no default tick, no automation marker and no fine control.
- Screenshot `docs/screenshots/studio-rack.png`: send and master processors as cards of plain sliders with a "bypass" button. EQ has 7 sliders, compressor 6. No curve, no meter.
- `studio/sequencer.js`, searched for `parsePattern`, `parseMelody`, `ramp`, `setParam`, `getParam`, and read the header comment.
- `studio/song.js` (track and section definitions) and `studio/studio.js` lines 77-81 (slider builder) and 128-150 (`refreshPatterns`).
- 12 web searches (the full budget). Not reached: Amped Studio's touch behaviour, Live 12's Drum Rack or step-sequencer editing, Logic Smart Controls, Live's per-control context menu, any accessibility guidance for custom knobs (F-S2 may have it).

## Findings

### A. What the repo's data model allows (this drives every rule below)

1. Pattern notation is one character per step: `x` hit (0.85), `X` accent (1.0), `o` soft (0.5), `.` rest. A pattern is one string per bar, or an array of strings for several bars. So a drum step has exactly three velocity levels. (verified: studio/sequencer.js lines 17-18, 24-42)
2. Each track has several named pattern variants (kick has A, F, H; hat_closed has A to E), and a section picks one per track through `play {track: variant}`. (verified: studio/song.js lines 40-61, 72-80)
3. Tracks fall into four kinds: `drum` (default), `note` (fixed pitch from `note` or a `notes` list, for example sub B1 and bass B2), `chord` (pitch comes from the section's chord progression, for example stab and pad) and `melody` (only `lead`). (verified: studio/sequencer.js lines 143-155; studio/song.js lines 40-66)
4. Melodies are tokens, 8 or 16 per bar: a note name, `!` suffix for accent, `-` to extend the previous note, `.` rest. Each event is keyed by start step with a length in steps and only two velocities (0.85, 1.0). It cannot hold two notes at the same step, so it is monophonic. The one melody in the song spans 4 bars at eighth-note resolution and uses roughly G#4 to D#5. (verified: studio/sequencer.js lines 44-64; studio/song.js lines 18-29)
5. Section parameters come in two forms. `set {path: value}` is applied once at the first step of the section. `ramp [{param, from, to, bars:[a,b], curve}]` is applied on every step while the position is inside the bar range, with a linear or exponential curve. The song uses only a handful of paths: `stab.cutoff`, `kick.level`, `clap.level`, `master.hp.cutoff`, `master.lp.cutoff`. (verified: studio/sequencer.js lines 253, 280-290, 297-304; studio/song.js lines 72-95)
6. Consequence for live tweaking: while a ramp is running, the engine calls `setParam` again every step, so a slider drag on that parameter is overwritten within one step. A `set` value is re-applied each time the section starts. Nothing in the engine marks a parameter as "held by the user". (verified: studio/sequencer.js lines 280-290, 297-304; inferred consequence)
7. The page today: every slider is a plain `<input type=range>` with `oninput`. It shows only bar 1 of a multi-bar pattern (`p[0]`). For a melody it reads only step indexes 0-15, which is bar 1 of 4. It re-reads `sec.set` into the sliders when you jump to a section, but it does not follow ramps while playing. Some parameters use a log slider with a `Math.log` mapping. (verified: studio/studio.js lines 77-81, 131-146)
8. The parameter specs carry `{min, max, value, unit}` per entry (CLAUDE.md, "defineParams"), so a default for double-click reset already exists if `value` is the default rather than the current value. I did not check which. (verified: /home/user/havantechno/CLAUDE.md; unchecked detail)

### B. Knob and slider conventions in the two references

1. Logic Pro, drag and modifiers: rotary knobs are dragged vertically and sliders along their axis. Shift before dragging gives finer adjustment. Option-click returns a parameter to its default or centred value. Command-click inside a knob's value circle or a slider's range jumps to that spot. Clicking or double-clicking a numeric field lets you type a value. A selected parameter can be changed with the mouse wheel or trackpad scroll. (search excerpt: https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_10_section_5.html) This is the Logic Pro 9.1.6 manual, so current versions may differ.
2. Logic Pro for iPad: double-tapping a slider or knob resets it to its default position. (search excerpt: https://support.apple.com/ar-ae/guide/logicpro-ipad/lpip82ec02cf/3.0/ipados/26; the search summary attributed this to the iPad mixer gestures table, and I am not certain this exact page is the one that holds it.)
3. Ableton Live keyboard shortcuts: Shift with the up and down arrow keys is listed for fine adjustment, and Shift as a finer-resolution modifier while dragging. Return to default is Delete (Live 12) and Backspace on Windows or Delete on Mac (Live 11). Typing digits 0 to 9 enters a value. (search excerpt: https://www.ableton.com/en/manual/live-keyboard-shortcuts/ and https://www.ableton.com/en/live-manual/11/live-keyboard-shortcuts/)
4. Ableton double-click reset: not found in the manual. An Ableton forum thread (2023) says double-clicking a parameter returns it to default on the desktop, but that is a user report. (search excerpt: https://forum.ableton.com/viewtopic.php?p=1819446)
5. Other plugin hosts and toolkits show the same family of gestures with different keys: HALion uses Shift for fine and Ctrl/Cmd-click for default (search excerpt: https://steinberg.help/halion/v7/en/halion/topics/common_editing_methods/encoders_and_sliders_r.html); Harrison plugins use double-click to reset and Shift-drag or Ctrl-drag for fine (search excerpt: https://support.harrisonaudio.com/hc/en-gb/articles/14835643413149-Mouse-Keyboard-Modifiers). So the vocabulary is shared (vertical drag, one modifier for fine, one gesture to reset, a way to type) but the exact keys are not standard.

### C. How automation and modulation are displayed

1. Live separates automation (a control's value over time) from modulation (an offset on top of the value) so both can act on one parameter. In a Session clip, the clip envelope box has Aut and Mod buttons (Live 10.1 and later), and modulation envelopes are drawn in blue. Those buttons exist only for Session clips. A control with automation shows a red dot. (search excerpt: https://help.ableton.com/hc/en-us/articles/209070629-Automation-Vs-Modulation)
2. In Arrangement view, Automation Mode (button above the track headers, or the A key) shows envelopes in the track's automation lane, and clicking a mixer or device control shows its envelope. (search excerpt: https://www.ableton.com/en/live-manual/12/automation-and-editing-envelopes/)
3. The Clip View envelope editor has a Device chooser on the left that picks a category of controls and a second chooser for the control. (search excerpt: https://www.ableton.com/en/live-manual/12/clip-envelopes/)
4. Override: when you move an automated control by hand, its automation indicator changes to grey (the search summary's wording of the manual; I did not see the manual text) and the Re-Enable Automation button in the Control Bar becomes active; clicking it restores all overridden automation. (search excerpt: https://www.ableton.com/de/live-manual/12/automation/; forum reports in the same search describe the same button behaviour but are not official.)
5. Wavetable's modulation matrix: a Live 10 release note says the target column shows bars for the unmodulated and modulated value of each parameter. I found no statement of a knob-ring indicator in Live 12. (search excerpt: https://www.ableton.com/en/release-notes/live-10-beta/)
6. Logic Pro automation modes: Read plays existing automation and ignores control moves. Touch overwrites while the control is held, then returns to the existing curve. Latch keeps the last value after release. Write records continuously as the playhead moves and erases what it passes. Trim offsets existing Volume, Pan or Send automation by the amount you move the control. Relative adds a second curve that offsets the primary one, both visible and editable. The mode is chosen from a pop-up in the track header or channel strip once automation curves are shown. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpb1a6ab26.html and https://dummies.com/article/logic-pro-automation-turning-your-mix-into-a-performance-258852)

### D. Step grid versus piano roll

1. Logic's Step Sequencer is modelled on hardware step sequencers. Each row controls a sound (a drum kit piece, a sample, a note, a range of notes or a chord degree) or an automation parameter; each step is a set length of musical time. It is described as especially suited to drum patterns with Drum Machine Designer, and a Melodic row can hold steps at different pitches. (search excerpt: https://support.apple.com/guide/logicpro/step-sequencer-overview-lgcp39acefc9/mac and https://support.apple.com/guide/logicpro/use-step-sequencer-with-drum-machine-designer-lgcp38edb881/mac)
2. Per step, velocity and gate are set by dragging vertically inside the step (iPad guide: velocity 1 to 127, gate as a percentage of the step), and a row can show several edit modes at once as subrows. (search excerpt: https://support.apple.com/en-am/guide/logicpro-ipad/edit-step-sequencer-pattern-row-settings-lpip227f0cd1/2.2/ipados/18.0). This is the iPad guide; the Mac page for editing steps is https://support.apple.com/en-in/guide/logicpro/lgcpe275686a/mac, which I did not see the text of.
3. Pattern regions can be edited only in the Step Sequencer; converting a pattern region to a MIDI region makes it editable in the Piano Roll. Apple advises turning Note Length off when recording drums and on for pitched events. (search excerpt: Apple support pages in the Step Sequencer result set; the search summary gave this, I did not see the page text.)
4. Logic's Piano Roll: drag a note's left or right edge to change its length, with a help tag showing the length. Velocity is edited with a slider, a Velocity tool, or shown as colour by velocity. Option-Shift while dragging makes selected notes equal length or velocity. (search excerpt: https://support.apple.com/guide/logicpro/edit-note-velocity-lgcpa8fee137/mac)
5. Live has no separate step sequencer in the manual pages I got. Drums and melodies both use the MIDI Note Editor. Draw Mode (B key or Control Bar button) draws notes, and clicking an existing note while it is on deletes it. "Draw Mode with Pitch Lock" is a preference that constrains drawing to one key track. Grid keys: narrower, wider, triplet, snap, fixed or adaptive. With Scale Mode on, Fold to Scale shows only the key tracks in the scale. I found no description of plain Fold or of Drum Rack step entry in Live 12. (search excerpt: https://www.ableton.com/en/live-manual/12/editing-midi/ and https://www.ableton.com/en/manual/live-keyboard-shortcuts/)
6. Pattern for the choice: both DAWs let drums be drawn on a grid of rows; Logic adds a dedicated hardware-style editor that stores the result as a pattern region, and Live uses one note editor for everything. Logic's own advice is pattern for repeating grooves, convert to MIDI for note-level work, and Piano Roll is usually the more direct tool for melodies. (search excerpt, same Apple pages as item 3.)

### E. Touch support

1. Pointer Events are the usual route for custom controls. `setPointerCapture` keeps a drag alive when the pointer leaves the element, and on touchscreens implicit capture already happens on pointerdown. `touch-action: none` stops the browser taking the gesture for panning and avoids a `pointercancel`. During capture the pointerover/enter/leave/out events do not fire, so hover cannot be used in a drag. Supported across browsers since July 2020. (search excerpt: https://developer.mozilla.org/docs/Web/API/Element/setPointerCapture; the `touch-action` points came from a javascript.info mirror in the same results.)
2. Browser DAWs: Soundtrap is reported to run in the browser on iPads and Android tablets (search excerpt: https://symposium.music.org/volume-59-no-1/technology-and-online-resource-reviews-1752877061/soundtrap-a-browser-based-digital-audio-workstation). BandLab's phone app is the touch-first product and the browser Mix Editor is the fuller editor with a piano roll (search excerpt: https://www.audeobox.com/learn/bandlab/bandlab-mobile-vs-desktop/). A directory page claims Soundtrap has multi-touch support, but it is a directory summary, not a primary source (unverified).
3. Not found: any source on pinch-zoom, two-finger scroll or other gestures inside a browser DAW's piano roll, and anything on Amped Studio or Audiotool touch behaviour.

## What Havantechno could borrow

Proposed interaction rules. Each rule says where it comes from.

**Rule set 1: knobs and sliders (one vocabulary everywhere)**
1. Vertical drag changes a knob; a slider drags along its axis. (Logic, B1)
2. Shift while dragging is fine control, about a tenth of the normal rate. (Logic B1, Live B3)
3. Double-click resets to the spec's default. This also becomes double-tap on touch. (Logic iPad, B2). Alt-click also resets, as in Logic (B1), and Delete while a control is focused, as in Live (B3). Three routes cost one line of code each and match whichever DAW the user already knows.
4. Typing: Enter or a long press on a focused knob opens a small number field showing the value with its unit. Escape cancels. (Logic numeric field B1, Live typing digits B3)
5. Mouse wheel or arrow keys step the focused control; Shift with arrows is fine. (Logic B1, Live B3)
6. Log-scaled parameters (cutoff, frequencies) drag in log space so that fine control and the engine's `expo` ramps agree. The slider builder already has a `log` flag (A7).
7. Show the value while dragging and for a moment after, as a tooltip beside the knob, since the new faces may hide readouts.

**Rule set 2: the 16-step rows**
1. The row is a grid of 16 buttons. Click toggles a step between `.` and `x`. Dragging across cells paints on or off, matching the state of the first cell touched (Live's Draw Mode idea, D5).
2. Three levels only, because the notation has three: `o`, `x`, `X`. Shift-click sets accent `X`, Alt-click sets soft `o`. On a lit step, a vertical drag steps through the three levels (Logic's vertical drag for velocity, D2, quantised to the notation).
3. Edits write back to the pattern string, so the data stays human-readable and round-trips.
4. Variants are chips beside the row (A, B, C ...), like Session clips. The chip the current section plays is highlighted. Picking another chip changes that section's `play` entry.
5. Copy-on-write: if variant A is used by several sections (it is: `kick: 'A'` appears on 9 lines of studio/song.js, one per section; verified: studio/song.js), editing it changes all of them. Show "used in N sections" on the chip and offer "duplicate as new variant" as the default when the user starts editing a shared variant.
6. Multi-bar patterns: show a bar tab strip (1, 2, 3, 4) when the pattern array has more than one bar. Today the page shows bar 1 only (A7).
7. Keyboard: arrow keys move between cells, Space toggles. Group the row in fours with a slightly different background so 1-e-and-a is visible.
8. Which tracks get a step row: `drum` and `note` kinds (sub, bass). For `note` tracks add one pitch field (`note: B1`) next to the row.

**Rule set 3: melodic tracks**
1. Only the lead needs a piano roll (A3). It should be compact: a pitch window that folds to the notes in use plus one or two rows each side (Live's Fold to Scale idea, D5), at the song's resolution of 8 or 16 tokens per bar.
2. Click empty cell adds a note one cell long; drag the right edge to lengthen (Logic, D4); click a note to select, Delete removes it; or click a note in a draw state to delete it (Live, D5).
3. Monophony is a hard rule from the notation (A4): a new note cuts off the previous one at its start, shown immediately so the user is never surprised.
4. Velocity is a single accent flag (`!`), so there is no velocity lane. Shift-click toggles accent, shown as a brighter note, in the manner of Logic's colour by velocity (D4).
5. Chord tracks (stab, pad) get no piano roll. Their pitches come from the section's progression, so edit the chord names in a progression strip per section (A3, A5) and keep the 16-step row for rhythm only.
6. Follow Logic's pattern-to-MIDI idea (D3) as the exit route: a melody that needs polyphony, free timing or velocities becomes a "MIDI clip" with the full piano roll. This is where the remix pipeline's stems-to-MIDI output will land, because audio-to-MIDI is not going to fit an 8-step grid. See the question below.

**Rule set 4: showing per-section changes on a device**
1. A parameter has one of three states in the current section: inherited (nothing set), set (a value at the section start, `set`) or ramp (from, to, bars, curve). Show it on the control itself. A small dot beside the label is the cheapest signal and echoes Live's red dot (C1); colour it by state.
2. A ramp draws a faint arc or bar behind the knob from the start value to the end value for that section, and the live value moves along it as bars pass. The page must read `getParam` on each step to do this (A7 says it currently does not follow ramps).
3. A per-device mini lane (Live's Automation Mode lane, C2) under the device header: one horizontal strip for the 200 bars, nine section segments, a line for the focused parameter. Click a segment to jump to it. The song only automates five paths today (A5), so the lane will usually be short.
4. Editing a section value: a small popover from the dot with three buttons, "Set at section start", "Ramp to ..." and "Clear", plus from, to, bars and curve fields. This keeps the editing explicit and does not require recording modes.

**Rule set 5: live tweak versus arranged**
1. Defaults: dragging a control is a live tweak. It must not silently change the song.
2. The engine problem (A6): a ramp overwrites the user every step and a `set` overwrites at section entry. The engine needs a "held" set of paths that `ramps()` and the `set` application skip. (Tech lead, F-O2, should cost this. I have not checked the code that would change.)
3. Display, borrowed from Live (C4): a held control turns hollow with an amber marker, and a control-bar button "Re-enable arranged values" clears all holds. Clicking the individual dot clears one.
4. Making a tweak permanent is a separate act: "Write to section" in the dot's popover (Logic's Latch idea, C6, without the modes). Rule of thumb: the dot tells you who controls the value, the knob tells you what it is.
5. Optional second behaviour from Logic's Trim (C6): a held control could be an offset on the arranged curve rather than a replacement, so a filter tweak survives a ramp. I would not build this first; it needs a second question answered (below).
6. Looping a section replays its ramps from their start each pass, so a tweak that was held in loop mode needs a visible reset at the loop point. State this in the UI.

**Rule set 6: touch**
1. All controls on Pointer Events with `setPointerCapture` and `touch-action: none` on knobs (E1). For the step grid use `touch-action: pan-y` so a vertical swipe scrolls the page and a horizontal drag paints (my inference from the CSS property, not tested).
2. No modifier keys on a tablet, so each modifier needs a touch equivalent: double-tap resets (Logic iPad, B2), a long press opens the number field, and a two-state "fine" toggle or a drag offset replaces Shift.
3. Hit targets of about 44 px are the usual touch guideline (recalled, unverified), larger than the current 16 px step cells (screenshot). On narrow screens, show 8 steps at a time with a page switch rather than shrinking cells.
4. Evidence that touch matters for this product is thin (E2, E3). I would make the rules touch-safe and not build a separate touch layout in the first version.

## What would not fit (and why)

- Logic's five automation modes (Read, Touch, Latch, Write, Trim, Relative; C6). They suit recording a performance. Havantechno's arrangement is data written as `set` and `ramp`, not a recorded stream, so a mode menu would invite confusion. Take the vocabulary (touch, latch, trim) for explanation only.
- Live's separate Aut and Mod envelope buttons (C1). There is no modulation layer in the engine; only `set` and `ramp`. Keep "modulation" out of the UI until the engine has it.
- Velocity per step with 127 values or gate as a percentage (D2). The notation has three levels and no gate per step. Offering more would be lost on save.
- A full piano roll on every track. Drums and fixed-pitch tracks are rhythm only, and chord tracks take pitch from the progression, so the roll would show one row with nothing to edit.
- Free note placement and polyphony in the melody editor, until the data format changes (A4).
- Mouse-only gestures (hover reveal, right-click menus) as the only route to a feature, since touch has neither.

## Build notes (plain HTML/CSS/SVG/JS, no build step)

- Knob widget: one small module, `pointerdown` then `setPointerCapture`, `pointermove` updating a value by `-dy * range * k` (k smaller when `e.shiftKey`), `dblclick` resetting, `keydown` for arrows, Delete and Enter. Give it `role="slider"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and `aria-valuetext` carrying the unit; coordinate details with F-S2.
- Native `<input type=range>` already gives keyboard and touch behaviour but no default tick, fine control or typed value (A7). A cheap first step is to keep the inputs and add dblclick, a Shift-slows-drag handler and a value tooltip, then replace them face by face.
- Step row: 16 `<button>` elements in a container with `role="grid"` semantics, one pointer handler on the container using `elementFromPoint` to paint across cells. Write back through `Sequencer.parsePattern` in reverse (a small `formatPattern`), keeping the strings.
- Melody roll: an SVG or a `<canvas>` of at most 16 columns by about 12 rows per bar; it needs a `formatMelody` that turns events back into tokens, enforcing the one-note-per-step rule.
- Ramp display: an SVG arc or bar behind the knob, drawn from `sec.ramp`; the live marker needs a `requestAnimationFrame` or the existing `step` event reading `seq.getParam(path)`.
- Held parameters: a `seq.held` set checked inside `ramps()` and the section `set` loop in `studio/sequencer.js`; `selfcheck.js` has a fake AudioContext and would need a test line for it (CLAUDE.md).
- Mouse versus touch: `pointerType` on the event tells them apart, so fine control can differ.

## Recalled, not verified

- Live's knobs respond to Shift-drag for fine control and double-click for reset on the desktop (the search found only the shortcut table and a forum thread, B3 and B4).
- Live's mouse wheel and Cmd/Ctrl-click behaviours on controls.
- That a 44 px touch target is the common guideline (Apple and Google both publish figures near this; I did not look them up).
- That Logic's Smart Controls show a few mapped controls at once; not researched.
- That Live's Drum Rack has a "step" view in Live 12; the search said no Live 12 source covered this.
- Exact colour of Live's overridden-automation indicator: the excerpt said grey, my memory says it can read as orange. Leave this to the visual group.

## Questions for the group

1. For F-O2 (tech lead) and F-S3 (remix IA): the melody notation is monophonic, quantised to 8 or 16 tokens per bar with two velocities, but audio-to-MIDI output from stems will not be. Do we extend the notation (several notes per step, velocity values, free start times) before building the piano roll, or keep the string notation for authored parts and add a second "MIDI clip" format for extracted stems?
2. For all: when the user tweaks a parameter that a ramp is driving, should the live tweak replace the ramp until re-enabled (Live's behaviour, simple) or add an offset to it (Logic's Trim, more musical, more code)?
3. For F-H5 (arrangement): is "edit variant A for every section that uses it" or "copy on write" the right default for the step rows?

## Sources

URLs below were all seen in search results. Pages marked (excerpt) rest on the search summary only; none was fetched.

- https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_10_section_5.html (excerpt)
- https://support.apple.com/ar-ae/guide/logicpro-ipad/lpip82ec02cf/3.0/ipados/26 (excerpt, page attribution uncertain)
- https://www.ableton.com/en/manual/live-keyboard-shortcuts/ (excerpt)
- https://www.ableton.com/en/live-manual/11/live-keyboard-shortcuts/ (excerpt)
- https://forum.ableton.com/viewtopic.php?p=1819446 (excerpt, forum)
- https://steinberg.help/halion/v7/en/halion/topics/common_editing_methods/encoders_and_sliders_r.html (excerpt)
- https://support.harrisonaudio.com/hc/en-gb/articles/14835643413149-Mouse-Keyboard-Modifiers (excerpt)
- https://help.ableton.com/hc/en-us/articles/209070629-Automation-Vs-Modulation (excerpt)
- https://www.ableton.com/en/live-manual/12/automation-and-editing-envelopes/ (excerpt)
- https://www.ableton.com/en/live-manual/12/clip-envelopes/ (excerpt)
- https://www.ableton.com/de/live-manual/12/automation/ (excerpt)
- https://www.ableton.com/en/release-notes/live-10-beta/ (excerpt)
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpb1a6ab26.html (excerpt)
- https://dummies.com/article/logic-pro-automation-turning-your-mix-into-a-performance-258852 (excerpt)
- https://www.ableton.com/en/live-manual/12/editing-midi/ (excerpt)
- https://support.apple.com/guide/logicpro/step-sequencer-overview-lgcp39acefc9/mac (excerpt)
- https://support.apple.com/guide/logicpro/use-step-sequencer-with-drum-machine-designer-lgcp38edb881/mac (excerpt)
- https://support.apple.com/en-am/guide/logicpro-ipad/edit-step-sequencer-pattern-row-settings-lpip227f0cd1/2.2/ipados/18.0 (excerpt)
- https://support.apple.com/en-in/guide/logicpro/lgcpe275686a/mac (listed only; text not seen)
- https://support.apple.com/guide/logicpro/edit-note-velocity-lgcpa8fee137/mac (excerpt)
- https://developer.mozilla.org/docs/Web/API/Element/setPointerCapture (excerpt)
- https://symposium.music.org/volume-59-no-1/technology-and-online-resource-reviews-1752877061/soundtrap-a-browser-based-digital-audio-workstation (excerpt)
- https://www.audeobox.com/learn/bandlab/bandlab-mobile-vs-desktop/ (excerpt)
- Local files read: /home/user/havantechno/docs/screenshots/studio-playing.png, /home/user/havantechno/docs/screenshots/studio-rack.png, /home/user/havantechno/studio/sequencer.js, /home/user/havantechno/studio/song.js, /home/user/havantechno/studio/studio.js, /home/user/havantechno/CLAUDE.md
