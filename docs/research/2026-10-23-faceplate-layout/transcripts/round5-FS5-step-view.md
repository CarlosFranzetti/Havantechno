# F-S5: Step View — round 5
Agent model: Sonnet. Date: 2026-10-23.

## Scope

The owner now wants a Mac and PC desktop DAW, keeps the voted layout as one view called the System Editor, and wants a second view, the Step View, that has the System Editor's shape but lets them change every step of the sequencer in place. This file designs that view: what a step holds for each of the four track kinds today and what it should hold, how each field is edited, how the view relates to the System Editor, how a section picks a variant, copy-on-write, and how an edit reaches the song data. It does not design the device faces, the mixer or the stem lanes.

What I looked at:
- `REPORT.md` (the voted Strip Bench, as amended) and my own `round1-FS5-interaction.md` and `round2-FS5.md`.
- The archived engine, read again for this round: `sequencer.js`, `song.js`, `synths.js` and `core.js` in `/home/user/havantechno/olde Havantechno dub studio/`. The repo's CLAUDE.md says that folder is frozen, so every engine change below is meant for the copy in the new build folder. Code facts are marked `(verified: <file> <lines>)`.
- 6 web searches (the full budget) on Logic's Step Sequencer, Elektron parameter locks and trig conditions, and Live 12's per-note chance. No page was fetched; each web fact rests on a search excerpt and is marked so. Nothing here was checked by using either product.

Reference check, in one place so the rest of the file can lean on it:
- **Logic Step Sequencer edit modes.** The iPad guide lists these per-step modes: Velocity/Value (drag vertically, 1 to 127), Gate (drag vertically, percent of the step), Note (drag, -12 to +12 semitones; changing the pitch of a step in a fixed-pitch row relabels the row Melodic), Octave (-2 to +8), Tie (tap a step's right or left edge to tie it to the next or previous step), Note Repeat (1 to 16 retriggers inside the step) and Chance (drag a percentage; the step's active state is fixed when you edit the value and is not re-rolled each cycle) (search excerpt: https://support.apple.com/guide/logicpro-ipad/lpip92c1e9a1/ipados; this is the iPad guide, the Mac page may differ). Several edit modes can be shown for one row at once as subrows, and two subrows of a row cannot have the same mode. Automation rows use the Value mode, and Option-Shift while dragging across steps ramps the values evenly between the start and end step (search excerpt: https://support.apple.com/guide/logicpro/use-edit-modes-lgcpf8b9a06c/mac). On Mac, Control-Option plus a letter switches the global edit mode (search excerpt: https://support.apple.com/en-asia/guide/logicpro/lgcp1d6a34a9/mac). Rows control either a sound or an automation parameter (search excerpt, round 1: https://support.apple.com/guide/logicpro/step-sequencer-overview-lgcp39acefc9/mac).
- **Elektron parameter locks.** Per manual text quoted in a forum thread, a parameter lock lets each trig carry its own parameter values, and the parameters on the parameter pages can be locked; you press and hold a trig and then turn a control (the excerpt cuts off after "adjust the para"). Users report that a locked parameter shows with an inverted background and that holding the trig shows its locked values (search excerpt: https://www.elektronauts.com/t/trigless-locks-why-how-to-use-them/41953 and https://www.elektronauts.com/t/digitakt-unofficial-guide/40705/132; the search summary did not say which thread held which sentence; forum posts, not Elektron documentation). Trig conditions decide only whether a trig plays, not its values or timing; one fan guide describes a ratio such as 3:5 as firing on the third pass and then every fifth pass (search excerpt, same threads). Micro-timing is separate from conditions; a forum user found nudged trigs sounded early or late until sequencer quantisation was turned off (search excerpt: https://www.elektronauts.com/t/digitakt-micro-timing-capabilities/226313). I did not find the manual's nudge range or the full list of conditions.
- **Live 12 per-note chance.** The MIDI Note Editor has a Chance lane (hidden by default) where dragging a note's marker sets a 0 to 100 percent probability, and a Velocity Deviation control that picks a random velocity within a range each time the note plays (search excerpt: https://www.ableton.com/en/live-manual/12/editing-midi/).

## What a step holds

### Today (verified from the archived engine)

| Kind | Tracks in `song.js` | What one step is today |
|---|---|---|
| drum | kick, clap, hat_closed, hat_open, shaker, perc, riser, impact | A character per step: `.` rest, `o` 0.5, `x` 0.85, `X` 1.0 (verified: sequencer.js 26, 34-43). The event is `{vel, accent: vel >= 1, dur: gate * stepSec}`; `accent` makes the synth multiply the velocity by 1.2 (verified: sequencer.js 329, synths.js 146). Gate is one number per track in steps (default 0.6; sub has 8) (verified: sequencer.js 160, song.js 43-65). Timing is the grid plus a global swing that delays odd steps only: `ts = t + swing * stepSec * 0.33` (verified: sequencer.js 299). Riser and impact have no patterns; they play from the section's `fx` list `{bar, step, track, bars, vel}` (verified: sequencer.js 304-311). |
| note | sub, bass | The same character, plus a pitch that is not in the step: one fixed note per track (`note: 'B1'`, `'B2'`), or a `notes` list that cycles with a per-track counter `noteIdx` that increments on every hit and is never reset, so the pitch of a hit depends on how many hits came before (verified: sequencer.js 331). `song.js` uses only the fixed note. |
| chord | stab, pad | The same character. The pitches come from the section's chord progression, indexed by bar: `prog[(bar - sec.start) % prog.length]`, so one chord per bar, never per step (verified: sequencer.js 276-279, 330). Octave, voicing and gate are per track. Stab and pad read the same progression. |
| melody | lead | Not a character row. `parseMelody` makes events keyed by start step: `{midi, len (steps), vel}`, with vel 0.85 or 1.0 (the `!` suffix), one note per step (monophonic), 8 or 16 tokens per bar (with 8 tokens each token is two steps), `-` extends the previous note, and the pattern loops by `bar % mel.bars` (verified: sequencer.js 45-64, 318-324). The song's one melody is 4 bars at eighth-note resolution, and the variants are chosen per section like patterns. |

Variants and loops, common to all kinds: a track has named variants (kick A, F, H; hat_closed A to E), a section picks one per track in `play`, and a pattern of n bars loops by `bar-in-section % n` (verified: sequencer.js 321-327; song.js 40-61, 72-95).

### Should hold

One step record, the same shape for every kind, stored sparsely: a step holds only the fields that differ from the track default. The first row of each table is what exists today.

**Fields common to all kinds**

| Field | Range and meaning | Edit in place | Phase |
|---|---|---|---|
| on and `vel` | Rest, or 0 to 1. Today three levels. Keep `o`, `x`, `X` as the 0.5, 0.85, 1.0 presets. | Click; drag up and down on the cell | 1 |
| `acc` | A separate accent flag (today `X` means both vel 1.0 and accent). Needed because a continuous velocity of 1.0 would otherwise switch on the 1.2 multiplier. | Shift+click | 1 |
| `len` | Length in steps, fractional; overrides the track gate for this step. Logic's Gate and Tie modes. | GATE lane; drag the right edge of the cell | 1 |
| `nudge` | Micro-timing, -12 to +12 units of 1/24 step (at most half a step either way, 5 ms per unit at 126 BPM; my arithmetic). Added to the swing offset. | NUDGE lane | 1 |
| `prob` | 0 to 100 percent. Live 12's Chance and Logic's Chance. | PROB lane | 1 |
| `cond` | `a:b` means "play on bar a of every b bars of the section" (bar-in-section modulo b); `!` negates. This is my definition, borrowed from the Elektron ratio idea (search excerpt above); it is useful because a one-bar pattern repeats for 32 bars and a fill on every fourth bar would otherwise need its own variant. | COND lane; click cycles a short list | 2 |
| `rep` | Retriggers inside the step, 1 to 8 (Logic's Note Repeat goes to 16). For hats and claps. | REP lane | 2 |
| `locks` | `{param: value}` for the instrument's voice parameters (cutoff, decay, tune and so on). Elektron's parameter lock. | One LOCK lane per parameter | 2 |

**Per kind, on top of the common fields**

| Kind | Adds | Notes |
|---|---|---|
| drum | Optional lock on `tune`, `decay`, `tone`. | Riser and impact keep their section `fx` list; the step row shows the hits whose `bar` equals the bar being viewed, and `bars` is the length. |
| note | `note`: a pitch override for this step, as a semitone offset from the track note (Logic's Note mode, -12 to +12, plus an octave shift). | Replaces the stateful `notes` list: a bassline can then have different pitches per step without a hidden counter. |
| chord | `chord`: an optional chord for this one hit (name or degree), `oct` shift. The per-bar chord stays in the progression. | A CHORD lane under the row shows one slot per bar for the section's progression. Stab and pad share it; the lane says "shared with pad". |
| melody | `midi`, `len`, `vel`, plus the common `prob`, `nudge`, `locks`. | Still one note per step. Off-grid or polyphonic imported MIDI belongs to the separate clip format that F-S3 and F-O2 proposed in round 2, not to this view. |

**Locks, and what can be locked.** The instrument's `params` object is a plain object that voices read as `P.x` inside `trigger`, synchronously, while they build and schedule their nodes (verified: core.js 117-139; synths.js, the kick, bass and stab voices). So an engine can set `inst.params[k]` just before `inst.trigger(ts, ev)` and put the old value back right after, and the lock reverts by itself on the next step, as an Elektron lock does. Exceptions found by reading: `level` and `drive` act through the defineParams callback (output gain and shaper curve), and stab's `hp` acts through `onParam` (verified: synths.js 100-110, 256), so these three cannot be locked this way. I checked the voice code of kick, bass and stab only; the other ten synths are unverified. Locks on insert, send or master parameters would need a scheduled `setParam` at the step plus a restore to the arranged value at the next step; that is phase 3 and I would not build it first.

## Editing gestures

Desktop mouse and keyboard; touch is not a requirement any more, so modifier keys, hover and right-click are all available.

**On a cell (every track row, always editable, no selection needed)**

| Gesture | Result |
|---|---|
| Click | Toggle on and off (default). A preference makes click cycle off, `x`, `X`, `o`, off, as on a hardware sequencer. See Questions. |
| Drag across cells | Paint: the first cell touched decides on or off for the rest (Live's Draw Mode idea; round 1). |
| Drag up or down on a lit cell | Velocity, continuous; the fill height shows it; release snaps to `o`, `x` or `X` if Alt is held. |
| Shift+click, Alt+click | Accent toggle; soft (0.5). |
| Drag the right edge | Length (Logic's Tie and Gate, in one gesture). |
| Double-click | A small inspector with every field typed (vel, len, nudge, prob, cond, rep, note, locks). Enter commits, Esc cancels. |
| Right-click | Menu: clear step, copy, paste, randomize this lane, fill every 2 or 4. |
| Drag on empty background | Marquee; then Delete, Cmd/Ctrl+C, V, D (duplicate a bar). Arrow keys move the focused cell; Space toggles it. |

**In a lane (selected track only)**

| Gesture | Result |
|---|---|
| Drag a bar up or down | Set the value for that step. Log parameters drag in log space. |
| Alt-drag across steps | Ramp between the first and last step touched (Logic's Option-Shift ramp). |
| Shift while dragging | Fine control, as the knob grammar in round 2. |
| Double-click a lane value | Clear it (the step reverts to the track default or the arranged value). |
| Click the lane's baseline | Set the value for every step (the track default for that field). |
| "+ lane" menu | Adds a lock lane for any lockable parameter of the instrument, listed from its `spec` with its `min`, `max` and unit. Logic's subrows: several lanes at once, never the same parameter twice. |

A step with any non-default field gets a small mark in its cell: `*` lock, `%` probability under 100, `~` nudge. Hovering the cell lists all its values (Elektron shows them on holding the trig; we use hover). The mark is a shape, not a hue (F-S4's rule).

**Per kind**
- drum and note: the cell gestures above; note tracks add the NOTE lane (drag up or down, shown as a note name).
- chord: the step row is rhythm only; the CHORD lane is one slot per bar of the section, click to choose from a list of chords in the key or type a name. Editing it changes the progression for this section, and for the other chord track that shares it.
- melody: the cell shows a note name; dragging it up or down changes the pitch (Logic's Note mode); the cell's right edge sets length; Shift+click toggles accent. A compact roll subrow (pitches folded to those in use, plus a row either side) can be shown in the editor band; clicking an empty roll cell adds a note, clicking a note removes it. A new note at an occupied step replaces it, and a note's length stops at the next note, which is the notation's monophony.
- riser and impact: click a step in the viewed bar to add or remove an `fx` hit; the `bars` length is a lane value.

## Layout and relation to the System Editor

**Decision: same shell, two tabs, shared state.** The Step View keeps the System Editor's control bar, overview, section ruler and grouped track rows, so nothing moves when the user switches (a tab in the control bar, or Cmd/Ctrl+1 and 2). Selected track, selected section, the playhead and the held set are shared. Two things change:

1. **Every track row's body becomes the step grid at edit size.** The nine section cells shrink into the right column as a strip of variant letters with a "used n" count; clicking a letter selects that section, as in the System Editor. Because every row is a live editor, the owner can change any step of any track without selecting first, which is what "modify every step" asks for.
2. **The bottom band is replaced by the Step Editor of the selected track**: the per-step lanes (velocity, gate, note, probability, nudge, lock lanes), the chord or melody extras, and the variant and scope controls. A toggle on the band's header swaps back to the System Editor's device row without leaving the view. RETURNS and MASTER are not shown in the Step View.

Why not expand every track with all its lanes: 13 rows with 6 lanes each is 78 rows, which cannot fit a laptop screen, and it would be a second device-face problem. Why not only the selected track: the owner asked for every step, and a hardware-style grid is one glance per track. This is closer to Logic's Step Sequencer on a Drum Machine Designer patch (all rows, one editor; round 1 and F-S3) than to Live's single clip, with the rows being tracks.

Height at 1440 by 900 (my arithmetic, not measured): control bar 36, overview 24, ruler 24, column header 48, 13 rows at 24 plus 4 group headers at 20 is 392, editor band about 200: roughly 724 px. The grid shows one bar of 16 steps by default (cells about 40 px wide with a 10 px beat gap in the wireframe scale); "show 2 bars" shrinks the cells to about 24 px for 32 steps.

**Bars and loops.** The bar selector is the bar within the section (1 to 32 in mainA2). A pattern of n bars shows its bar `(bar - 1) % n`; shorter patterns are drawn dimmed as loop ghosts when a longer pattern, such as the lead's 4 bars, is longest in the section. Riser and impact rows show the real bar.

**How a section's variant is chosen.** The variant chip on each row header (`[B v]`) is an arrangement edit: it changes `sec.play[track]` for the current section only. The menu lists existing variants with a mini preview and "used n", and offers "+ new empty" and "+ copy of this". Clicking a letter in the right column does the same for another section.

**Copy-on-write.** A variant is shared when more than one section plays it for that track; for example kick A is played by all 9 sections and bass B by 2 (mainA2 and mainB) (verified: song.js 72-95, by a node dump of `play`).
1. First edit of a shared variant, scope "this section only" (the default): copy the variant to the next free letter (bass B becomes D), point only this section at the copy, then apply the edit, with a non-blocking message "bass B to D for mainA2; B is still used by mainB [Undo] [Apply to all 2 instead]".
2. Scope "all N sections": edit in place; the chip shows a warning outline and the count.
3. A variant used by one section is edited in place.
4. A copy remembers its source (`from: 'B'`) for display, and a "merge identical variants" command can fold duplicates later.
Locks, probability and the other step fields belong to the variant, so they are copied with it. Ramps and `set` values belong to the section and are not affected.

## Data model changes

All in the new build folder; the archived engine is frozen.

1. **One source of truth: the song document**, the same plain data as `Song.GUIDANCE` (tracks with patterns and melodies, sections with `play`, `set`, `ramp`, `fx`, `progression`). The engine's `tr.patterns[v]` and `tr.melodies[v]` are derived from it. The scheduler reads those arrays on every step (verified: sequencer.js 321-327), so a patched array is heard on the next step without a restart.
2. **Pattern format stays backward compatible.** A pattern with no overrides remains the readable string (`'..x...x.x...x.x.'`). With overrides it becomes an object: `{bars: ['..x...x.x...x.x.'], steps: {'0:8': {vel: 0.7, len: 0.4, nudge: 4, prob: 50, locks: {cutoff: 2400}}}}`, where the key is `bar:step`. `parsePattern` accepts both. A melody stays token strings while it is expressible as tokens (monophonic, on grid, two velocities) and becomes a note list otherwise.
3. **Velocity and accent separated.** Today `accent` is derived as `vel >= 1`; it becomes an explicit flag, and `X` parses to `{vel: 1.0, acc: true}` so existing data sounds the same.
4. **`schedule()` per step**, in this order: probability and condition decide whether the step plays (before any side effect, so a skipped kick does not duck the bass; ducking is triggered inside `trigger()`, verified: sequencer.js 290-295); `nudge` is added to the time and clamped so it is never earlier than now in live play; `len` replaces the track gate; `rep` schedules extra triggers inside the step; locks are applied around `inst.trigger`; `note` and `chord` overrides replace the track pitch.
5. **Probability is deterministic.** Use a seeded hash of track, absolute step and variant, not `Math.random`, so a WAV export equals what was heard. A "re-seed" button changes the seed. (Logic fixes chance when you edit it, which is the same idea: search excerpt above.)
6. **Edit operations, one write path** (same spirit as `seq.setParam(path)` from F-O2): `setStep(track, variant, bar, step, patch)`, `setNote(track, variant, step, note | null)`, `setProgression(section, bar, chord)`, `setPlay(section, track, variant)`, `forkVariant(track, variant, section)` returning the new letter, `setFx(section, index, patch)`. Each op mutates the document, patches the derived array, pushes its inverse on the undo stack and marks the document dirty.
7. **Saving.** A desktop app can autosave the document to its app-data folder a second or two after the last edit, and "Save" writes it to a project file (JSON) the user chooses. Export of the song as plain `Song` data keeps the strings readable. The format name and location are the owner's and the build team's choice; I propose only that it be JSON.
8. **Held parameters** (round 2) stay as designed: a live tweak marks the path held so a ramp or section `set` does not overwrite it.
9. **Self-check.** The check loads only the engine files and never the page, so the new `schedule()` fields and the ops are testable there: an off-grid nudge lands at the right offset, a probability-zero step never triggers or ducks, a lock reverts on the next step, a fork leaves the other sections unchanged, and old strings still parse to the same events.

## ASCII wireframe

Step View at 1440 px wide, 1 character is about 10 px, 144 columns. Current section mainA2 (its `play` map is real: kick A, sub A, bass B, stab A, clap A, hat_open A, hat_closed C, lead B; the step patterns are the real variants from `song.js`). The step edits (locks, probability, nudge, velocities, the D3 note) are illustrative. Drum rows hat_o, shaker, perc and the riser and impact rows are left out for height. Selected track: bass.

```
+----------------------------------------------------------------------------------------------------------------------------------------------+
| > [] 126 BPM  sw .06 | 073.01 mainA2 | [ System ] [*STEPS*] | A/B (off) | meter | Undo Redo | Save | WAV | Re-enable arranged (0)            |
| overview [===|##########|=========================================================================================================] 200 bars |
| ruler    |intro    |i2  |build     |mainA               |[mainA2]            |break          |bE  |mainB                         |outro      |
+-----------------------+----------------------------------------------------------------------------------+-----------------------------------+
| mainA2 (bars 73-104)  |bar [01/32] [<][>]  longest pattern: 4 bars (lead)  show [1 bar] 2 bars           | SECTION VARIANTS (this row)       |
| track      var        | 1    2    3    4     5    6    7    8     9    10   11   12    13   14   15   16 | in i2 bd mA m2 br be mB ou used   |
+-----------------------+----------------------------------------------------------------------------------+-----------------------------------+
| v DRUMS (stem: empty) |                                                                                  |                                   |
|:kick   M S  [A v]     |[X*] [. ] [. ] [. ]  [x ] [. ] [. ] [. ]  [x ] [. ] [. ] [. ]  [x ] [. ] [. ] [. ]| A  A  A  A [A] A  A  A  A  9      |
|:clap   M S  [A v]     |[. ] [. ] [. ] [. ]  [x ] [. ] [. ] [. ]  [. ] [. ] [. ] [. ]  [x ] [. ] [. ] [. ]| .  .  A  A [A] A  R  A  A  6      |
|:hat_c  M S  [C v]     |[x ] [. ] [x ] [. ]  [. ] [x%] [x~] [. ]  [. ] [. ] [x ] [x ]  [. ] [. ] [x ] [. ]| .  A  B  A [C] .  D  C  .  2      |
| ... hat_o shaker perc |(13 rows in all, 24 px each; rows not shown follow the same grid)                 |                                   |
| v BASS (stem: empty)  |                                                                                  |                                   |
|:sub    M S  [A v]     |[x ] [. ] [. ] [. ]  [x ] [. ] [. ] [. ]  [x ] [. ] [. ] [. ]  [x ] [. ] [. ] [. ]| A  A  A  A [A] A  A  A  A  9      |
|>bass   M S  [B v]     |[. ] [. ] [x*] [. ]  [. ] [. ] [x ] [. ]  [x*] [. ] [. ] [. ]  [x ] [. ] [x%] [. ]| A  A  A  A [B] C  C  B  A  2      |
| v OTHER (stem: empty) |                                                                                  |                                   |
|:stab   M S  [A v]     |[. ] [. ] [x ] [. ]  [. ] [. ] [x ] [x ]  [. ] [. ] [x ] [. ]  [. ] [. ] [x ] [x ]| .  C  B  A [A] B  B  A  C  3      |
|:lead   M S  [B v]     |[F#] [. ] [. ] [. ]  [C#] [. ] [G#] [. ]  [C#] [. ] [. ] [. ]  [. ] [. ] [. ] [. ]| .  .  .  . [B] A  A  B  .  2      |
+----------------------------------------------------------------------------------------------------------------------------------------------+
| STEP EDITOR: bass     |lanes line up under the step columns above                                        | VARIANT FOR THIS SECTION          |
+-----------------------+----------------------------------------------------------------------------------+-----------------------------------+
| VEL    (drag)         | --   --   8    --    --   --   8    --    8    --   --   --    5    --   8    -- | [A] [B*] [C]   [+ new]            |
| GATE   % of step      | --   --   80   --    --   --   80   --    80   --   --   --    40   --   80   -- | B is used in 2 sections:          |
| NOTE   (drag, +-12)   | --   --   B2   --    --   --   B2   --    D3   --   --   --    B2   --  F#2   -- |   mainA2, mainB                   |
| PROB   %              | --   --   --   --    --   --   --   --    --   --   --   --    --   --   50   -- | Edit scope:                       |
| NUDGE  1/24 step      | --   --   --   --    --   --   +4   --    --   --   --   --    --   --   --   -- | (o) this section only (fork B>D)  |
| LOCK   cutoff Hz      | --   --  900   --    --   --   --   --   2400  --   --   --    --   --   --   -- | ( ) all 2 sections                |
| LOCK   decay  s       | --   --   --   --    --   --   --   --    .4   --   --   --    --   --   --   -- | [+ lane v] [Rnd] [Clr] [Copy]     |
+----------------------------------------------------------------------------------------------------------------------------------------------+
| cell: click on/off | drag = level | Shift+click accent | Alt+click soft || lane: drag value | dbl-click clear | Alt-drag ramp                |
| marks in a cell:  * has a lock   % probability under 100   ~ nudged   (more than one: shows the first)                                       |
+----------------------------------------------------------------------------------------------------------------------------------------------+
```

## Questions

1. **For the owner: should a plain click on a cell toggle it on and off, or cycle off, `x`, `X`, `o`, off?** I default to toggle because painting across cells needs an on/off meaning; the cycle is one preference away.
2. **For the owner and F-O2: may the build change the pattern data model (continuous velocity, per-step overrides, explicit accent), as long as old strings still parse?** The Step View's per-step fields cannot be stored in the character strings.
3. **For the owner: stab and pad share one chord progression. Should a progression edit change both tracks (today's behaviour), or should each chord track be able to have its own?** The CHORD lane has to say which.
4. **For F-O2: is this phasing right, and can you cost it?** My order: phase 1 is velocity, accent, length, nudge, probability, note override and the ops with undo; phase 2 is conditions, retrigger and instrument locks; phase 3 is locks on inserts, sends and master.
5. **For F-S3: imported MIDI that is off the 1/24-step nudge range or polyphonic goes to the clip format, not to step fields; agreed?** Nudge covers at most half a step either way.
6. **For the owner: should probability be reproducible (same notes every play and export, my default) or re-rolled on every pass?** Re-rolling is closer to live Elektron feel, but then the exported WAV differs from what was heard.
7. **For F-O1 and F-H5: should the Step View show 4 bars at once for the lead, or one bar with a bar selector (my default)?** Four bars means 64 narrow cells.

## Sources

URLs below were seen in search results this round; none was fetched, so every web fact is a search excerpt. Elektron items are forum posts or fan guides, not Elektron documentation.

- https://support.apple.com/guide/logicpro-ipad/lpip92c1e9a1/ipados (Logic for iPad, edit modes)
- https://support.apple.com/guide/logicpro/use-edit-modes-lgcpf8b9a06c/mac (Logic for Mac, edit modes)
- https://support.apple.com/en-asia/guide/logicpro/lgcp1d6a34a9/mac (Logic for Mac, keyboard shortcuts)
- https://support.apple.com/guide/logicpro/step-sequencer-overview-lgcp39acefc9/mac (from my round 1)
- https://support.apple.com/en-mk/guide/logicpro/lgcpe275686a/mac (listed in results; text not seen)
- https://www.elektronauts.com/t/trigless-locks-why-how-to-use-them/41953
- https://www.elektronauts.com/t/digitakt-unofficial-guide/40705/132
- https://www.elektronauts.com/t/digitakt-micro-timing-capabilities/226313
- https://www.ableton.com/en/live-manual/12/editing-midi/

Not found: Elektron's own manual text for parameter locks, trig conditions and the nudge range; how the Logic Mac Step Sequencer lays out subrows beyond "several edit modes for one row"; whether the other ten synths read every voice parameter inside `trigger` (I checked kick, bass and stab).

Local files read: `/home/user/havantechno/docs/research/2026-10-23-faceplate-layout/REPORT.md`, `/home/user/havantechno/docs/research/2026-10-23-faceplate-layout/transcripts/round1-FS5-interaction.md`, `/home/user/havantechno/docs/research/2026-10-23-faceplate-layout/transcripts/round2-FS5.md`, and in `/home/user/havantechno/olde Havantechno dub studio/`: `sequencer.js`, `song.js`, `synths.js`, `core.js`.
