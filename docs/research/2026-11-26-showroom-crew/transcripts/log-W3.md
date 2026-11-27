# W3 log: HVT-808 and HVT-909 pages, machine functions

Times: Eastern Time (EST), UTC in parentheses.

## 2026-11-26 19:15 ET (2026-11-27 00:15 UTC): start, reading; engine findings

Read CLAUDE.md, the brief, solo/303.html, solo.js, solo.css, ui/panels.js (render kit, the machine helper, hvt808, hvt909),
tools/panels-check.js, tools/solo-check.js, engine/drums.js (accent, chokes), songdoc.js, sequencer.js (schedule), host.js
(editor group, transport, mute, setParam/persist), the two panel screenshots, log-W1.md and log-W2.md.

What the sequencer plays (sequencer.js `schedule`):
- A variant is `{bars, cells}` with bars*16 cells; bar `bis % v.bars` of the section. A section's `play[track]` names the
  variant; a missing variant falls back to `A`, a track with no `A` is silent. So a pattern slot's A and B are two variants of
  every kit track, and "A then B" is two one-bar sections in a row with the transport looping the whole song (loopAll is the
  default); "A only" / "B only" are `transport.loop('A' | 'B')`. That is honest: no data is duplicated.
- `cell.acc` becomes `ev.accent`. Swing: odd steps late by `swing * step * 0.33` (doc.swing 0..1, so 1 = triplet feel).
- `cell.rep` retriggers evenly inside the step (rep 2 = two hits half a step apart, 60 ms at 126 BPM); `cell.nudge` moves the
  one hit. Neither can carry a flam (a grace hit some 10 to 30 ms before the main one). **Flam is left out.**
- Last step / pattern length: cells are always bars*16 and the sequencer reads step `st` of 16; a variant cannot end at step 12.
  **Pattern length is left out.**
- Chokes: drums.js 'hat808' (ch808 chokes oh808) and 'hat909' (one hat channel) act per context, between tracks too.

**Engine bug found (not mine to fix, for the coordinator / Box Crew):** drums.js `ampOf9(ev)` reads `ev.step` as the 909's
weak/normal/accent level (0/1/2 -> -18/-9/0 dB), but sequencer.js sets `ev.step` to the ABSOLUTE step number on every
trigger (sequencer.js 409, "ev.step is the absolute step"). So in any sequenced song every 909 hit from step 2 on plays at
0 dB (full accent), the song's first step at -18 dB and the second at -9 dB, and `cell.acc` makes no difference on the 909.
The 808 (ampOf) is not affected. Suggested fix in drums.js: use `ev.level` (or `ev.accentLevel`) for the 0/1/2 form, or only
read `ev.step` when `ev.accent` is undefined... the simplest is a separate field name. The 909 page's accent row writes
`acc` correctly; it will be heard when the engine reads it.

Request to W2 (framework): the machine pages need two one-bar sections `A` and `B` (not one 'loop'), every kit track playing
variant `A` in section A and `B` in section B. Could `Solo.boot` take `sections: [...]` (default the one looping section) and
pass `machine: true` / any extra `panelOpts` through to `Panels.render(dev, host, {layout, ...})`? Until then the panel
detects the layout itself (exactly two sections named A and B), and drums-solo.js can build on Solo.boot or not, whichever
is there when I get to the pages.

## 2026-11-26 19:39 ET (2026-11-27 00:39 UTC): built, verified

**Machine functions** (app/ui/panels.js, the drum-machine section only: `machine()`, the HVT-808 and HVT-909 definitions and
three helpers used only by them, `bankButtons`, `muteButton`, `portraitMachine`; applied as exact-string replacements of that
region, checked unchanged before each write; W2's shared controls and synth definitions untouched). The machine object is
reachable as `panel.kit.machine`.

How the patterns map onto the document (the single truth):
- Slot k (1..8) variation A = variant letter `LET[2(k-1)]`, B = `LET[2(k-1)+1]` of every kit track (slot 1 = A/B, 2 = C/D,
  ... 8 = O/P). A machine page's song has two one-bar sections named `A` and `B`; a slot press is `setPlay('A', t, A-letter)`
  and `setPlay('B', t, B-letter)` on every kit track (missing variants made empty with `setVariantBars`), one undo entry.
- Play modes are the transport, not data: A = `loop('A')`, B = `loop('B')`, A then B = `loop(null)` (the song loops, so the
  two sections alternate: honest alternation, nothing duplicated). Switching while playing finishes the bar first: loop(null)
  now, then `loop(target)` on the Host's 'section' event when the target starts.
- The keys edit the variation the mode names (in A then B, the one under the transport). Each key is one ed.group, one undo.
- Accent row: AC on the instrument select (808 rotary position, 909 INST row, phone grid); a key sets or clears `acc` (vel 1)
  on every hit of that step, one undo entry; a new hit on a lit accent step is accented; Shift-click accents one voice. The
  engine has no separate accent track, so an accent on a step with no hit is not stored.
- CLR VOICE clears the selected voice (AC: every accent), CLR PTN the edited variation of every voice, COPY A▸B copies the
  slot's A onto B for every voice; one undo entry each. MUTE (808: per column; 909: a row under INST; phone: the selected
  voice) is the engine's track mute: not in the document, no undo entry. TEMPO as before. 909 SHUFFLE: the document's
  swing in six positions (0, .2 .. 1; the sequencer delays odd steps by swing x a third of a step), one undo entry per move.
- In any other song (the main app's windows) the bank acts on the section being played: a slot or A / B makes it play the
  slot's variant on every kit track; A then B is disabled. The old step-key behaviour there is unchanged (the original
  panels-check rows pass).
- Not built, because the format cannot carry them: **flam** (rep spaces hits half a step apart, nudge moves the one hit) and
  **last step / pattern length** (variants are whole bars of 16). Pattern changes take effect at once, not at the end of
  the bar (only the mode switch waits for the bar).
- Phone arrangement (layouts.portrait, 560 wide): voice grid (AC + every voice, a red lamp when muted), MUTE / + ADD for the
  selected voice, every knob of the selected voice (six a row), tempo (+ shuffle on the 909) and START / STOP, info line, the
  sixteen keys in two rows of eight, slots 1..8, A / B / A▸B, CLR VOICE, CLR PTN, COPY A▸B.

**Pages**: app/solo/808.html and 909.html (`<body data-machine>`), app/solo/drums-solo.js. Built on W2's `Solo.boot`
(chrome, start gate, panel mount and fit, BPM, undo and redo) with `patterns: []`, `presets: false`; the script then
`host.loadDocument`s the bank song (two sections) before audio starts, puts the panel's mode back after the framework's start
and Play (which loop the one section it knows), and removes the bar's empty pattern group. Kits and machine patterns come from
W1's `Presets.menu` (kits, patterns, save, rename, delete, import by pasting text, export with Copy as text) behind a
"Kits & patterns" button, feature-detected. Slots 1..6 hold six original grooves per machine written here (808: Freestyle,
Robot walk, Conga funk, Warehouse, Deep house, Booty bass; 909: Peak time, Acid floor, Jacking, Ride house, Broken beat, Toms in
the dark), each with a different A and B; 7 and 8 start empty. Kit: 808 bd sd lt mt ht lc mc hc rs cl cp ma cb cy oh ch;
909 bd sd lt mt ht rs cp ch oh cr rd.

Files each page fetches (relative to app/solo/), both pages the same: ../ui/panels.css, solo.css, ../engine/core.js,
../engine/programs.js, ../engine/synths.js, ../engine/drums.js, ../engine/processors.js, ../engine/songdoc.js,
../engine/sequencer.js, ../engine/song.js, ../engine/host.js, ../engine/presets.js (optional, feature-detected),
../ui/panels.js, solo.js, drums-solo.js. No worklets or classics (the drums are plain Web Audio); confirmed from the
request log in Chromium, no failed request.

**Checks** (run directly, exit codes read): selfcheck 448 (0), drums-check 342 (0), panels-check 183 (0; 34 rows under
"machine functions (Showroom Crew W3)"), solo-check 143 (0; 2 x 15 rows under "HVT-808 and HVT-909 (Showroom Crew W3)"),
presets-check 1907 (0), browser-check PASS 26 (0).

**Headless Chromium** (scratch script, tools/serve.js on a random port, killed after; 1280x800 and devices['iPhone 13']), 45
of 46 pass: each page starts on a tap and plays (master peak about 0.5), no horizontal overflow (1280/1280, 390/390), no page
or console errors and no failed request; eight key taps add eight hits (one undo entry each) on a voice the pattern lacked
(lt808, ht909), the keys show them, the voice's meter rises (heard), tapping again removes them and it goes quiet; the
instrument select moves the keys to SD; pattern 1's A and B differ; 808 accent: peak 0.337 -> 0.499; closed hat chokes the
open hat on both (rms after the closed hat equals the closed hat alone: 808 0.0508 -> 0.0148, 909 0.0057 -> 0.0032);
shuffle: the off-beat onset moves from 0.196 s to 0.238 s (808 page, swing 0 -> 1) and 0.187 -> 0.225 s (909).
**Fails: 909 accent** (0.527 -> 0.510): the engine bug above (ev.step), not the panel. The Presets menu: lists the 909
kits and W1's patterns, loading "Pounding techno" wrote the pattern and set 132 BPM in one undo entry, no errors.

Screenshots looked at and fixed: the 808's column MUTE buttons overlapped the LEVEL legends (moved up into the face's top
band, wordmark moved to the left over the select); the mute lamp was clipped at the button's edge on the phone. Saved
docs/screenshots/solo-808-desktop.png, solo-808-phone.png, solo-909-desktop.png, solo-909-phone.png.

Not verified: real phones and Safari (only Chromium's iPhone 13 emulation); by ear (meters and offline renders only); the
Electron windows with the new bank row (Node checks only); a long session's timing of the A-then-B switch under load.
