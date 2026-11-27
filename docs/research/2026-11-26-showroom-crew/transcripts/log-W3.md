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
