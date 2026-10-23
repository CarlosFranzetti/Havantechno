# F-O1: Design director — round 2
Agent model: Opus. Date: 2026-10-23.

I read all eleven other round-1 files in full. I ran no web searches this round. Every fact below either cites a round-1 file by agent id and section (each file marks its own sources) or is a repo fact I checked again: `kick: 'A'` appears on 9 lines of `studio/song.js`, and `selfcheck.js` loads only the five engine files.

## Reactions

**F-S3**: "no 4-stem model separates sub from kick ... a many-to-one map that neither DAW needed because they stop at the stem."
This changes the main idea of my Concept A. In round 1 I drew one source lane paired with each recreation lane, 13 pairs. That pairing does not exist. The source arrives as about four stems:
- drums feeds kick, clap, hats, shaker and perc;
- bass feeds bass and sub;
- other feeds stab, lead and pad.

F-S3's own finding (section A, from their excerpts) is that both DAWs put the stems in one container beside the muted original: a Group Track in Live, a summing stack in Logic. So the honest layout makes **each stem the group header of the tracks that recreate it**. That is 4 stem lanes plus 13 tracks, not 26 lanes, and it also eases my own "vertical space" risk for A.

F-S3 also writes: "the arrangement is already a matrix: sections as columns, tracks as rows, and a variation letter in each cell". I agree, and it fixes what my Bench lanes should show. Recreation lanes should show the `play` letter per section, plus ramps as lines (F-O2, section 6A), not invented waveform blocks.

**F-O2**: "Ranking by cost: A < B < C. Concept C's UI can sit on top of A or B later as one more view, because the face layer does not care which shell holds it."
I agree, and it settles how to use Concept C. The best part of C was showing the recreation against the source. That becomes a **Compare tab** in A's bottom panel, not a separate shell.

F-O2's coupling C3 (the 208 class toggles run inside the scheduler's `tick`) and C4 (sliders ignore ramps) matter for design, not only for code. A face that is the identity of a device must move when the arrangement moves it, otherwise it lies. So their steps 1 and 2 (device list, registry with a generic face, one rAF loop) come before any visual work, whichever layout wins.

**F-S4**: "Logic's compressor skins carry meaning (a hardware model) that Havantechno's devices do not have."
This answers my round-1 question 2 and retires my Concept B. The skeuomorphism I described in round 1 was justified by the meaning of each skin: the Compressor's Circuit Type picks a model compared to named hardware (my round 1, from the dummies.com excerpt; F-S4 C4 lists the same models). Havantechno's compressor is one `DynamicsCompressorNode` (F-H4, "What would not fit"), so a hardware plate would be decoration.

I adopt F-S4's three tiers as written:
- flat for every device;
- "plate" for the focused face only;
- "skin" only when Gear Crew gives a device real models.

F-S4's rule "state is carried by fill, never by family hue" is the best single rule in this round, and I would make it binding.

**F-S5**: "while a ramp is running, the engine calls `setParam` again every step, so a slider drag on that parameter is overwritten within one step."
I had not seen this. It changes what a face must show. A knob needs a visible owner state:
- inherited;
- set by the section;
- ramped;
- held by the user (Live's override and re-enable pattern, F-S5 C4).

Otherwise a user tweaking `stab.cutoff` in `mainA` will think the face is broken. Their rule set 4 (a dot on the label, an arc behind the knob for a ramp) belongs in the face contract from the first version.

**F-H4 and F-H3**: their per-device display tables (F-H4's table under "Havantechno: display proposal per processor", F-H3 section F onwards) are the content of my "signature display" idea. Both draw only from existing `spec` keys, so no engine work is needed. Every device's hero graph is now named, and each one agrees with F-S4's section 6 glyph table. I would treat the three tables as one list.

## Answers

- **F-S2 Q1 and F-O2 Q1 (one chain fully drawn, or many faces at once?)** One chain. This is a design position, not only a performance one. A face can only carry identity if it has room, and 23 faces side by side shrink back into the identical cards the owner rejected. The other tracks are compact. Each track header shows:
  - the name;
  - a family-coloured rail and the device glyph (F-S4 sections 6 and 9);
  - M and S;
  - the channel fader;
  - a small meter.
- **F-H1 Q1, F-H2 Q, F-S1 Q2 (should the bottom pane follow the selection?)** Yes. Selecting a lane or a device fills one fixed bottom pane. That is Live's Device View and Logic's Editors area (my round 1, "The root difference"). There are no floating windows: both F-S1 and F-H2 found nothing in their evidence that justifies them in a browser tab.
- **F-H1 Q2 (which view opens first?)** The arrangement, with section columns. The 16-step grid becomes the Notes tab of the selected track.
- **F-H3 Q1 (does the face open from the card or replace it?)** The card goes away. Its step row becomes the Notes tab, its slider list becomes the face in the Chain tab, and its channel controls move into the lane header.
- **F-H5 Q (sends and duck on the mixer, or on each face?)** Neither, as a primary home. They belong to the channel, so they appear as the last unit in the chain: synth → inserts → channel (level, pan, delay, reverb, duck). The same values also appear in an optional mixer drawer. Keep them off the instrument faces, because they are not properties of the instrument.
- **F-O2 Q2 (which "level" is the fader?)** The channel gain is the fader in the lane header. The instrument `level` stays on the face, as F-O2's `hide`/hint mechanism allows. The face labels it "trim", so there are not two controls both called "level".
- **F-S4 Q1 (a skin tier?)** Not now (see Reactions). F-S4 Q2 (track colour defaults to the family hue): yes. With stem groups this also means a stem group reads as one colour block. That is right, because drums are mostly one family.
- **F-S5 Q2 (does a live tweak replace a ramp or offset it?)** Replace it, with a visible held state and a "re-enable arranged values" button (Live's model). An offset like Logic's Trim is a later refinement.
- **F-S3 Q1 (is the analysis done offline or in the page?)** Treat that as Gear Crew's and F-O2's call. For the layout, assume an imported bundle: a file picker plus F-S3's confidence chips. Do not design a progress screen until someone shows that separation can run in the page.
- **F-S3 Q4 (can the Source group push the Recreation tracks below the fold?)** No. With stems as group headers there is no separate Source block to push anything down. A collapsed group is one stem lane, the same as Live's folded Group Track.

## One disagreement

**With F-H5's "Console Strip": the mixer as a permanent bottom band, with "the instrument and effect faces (F-H3, F-H4) sit behind the strips and open from them".**

I disagree because it gives the best screen space to the five controls per track that matter least for this product, and pushes the faces (D1) behind a click. Four points from the round-1 files:

1. **The faces are the work, and the mixer is not.** The owner's D1 asks for per-device faces, and D3 is about matching sounds, which happens in synth and insert parameters. A track's mixer is only level, pan, two sends and duck (F-H5 C). F-O2 counts 141 controls on the device panels against 91 for channels and sidechains. A permanent bottom band should hold the faces, not the five.
2. **Neither reference keeps the mixer permanently in that spot.** In Live the Mixer is a toggle, and each view keeps its own setting (F-H1 section 7). In Logic it is opened separately (F-H2 F4). In both, the bottom spot follows the selection (F-H1 section 4, F-H2 F3). Logic even offers Smart Controls so you avoid opening plug-in windows (F-H2 F5, my round 1).
3. **It is my retired Concept B in another form.** The risks I listed for "Console" apply: the song structure disappears, and faces become windows over the thing you are comparing. F-O2 also costs the inspector-and-mixer model above the chain model (B versus A in their section 6).
4. **Vertical space.** A band of 13 vertical strips plus a ruler, overview, FX row and loop row leaves no room for the device chain on a laptop. F-H5 says faces "open from" the strips, but not where they open. Any answer is either a floating window, which F-S1 and F-H2 both rule out, or a pane that steals the mixer's room.

F-H5's timeline work should be kept whole: the overview strip, sections as `flex-grow` blocks sized by bar count, the loop brace and the clip lamp. I use it below. Only the mixer's placement is what I dispute; it should be a drawer.

## My suggestion

**"Stem Bench"**: my Concept A (Bench), refined with F-S3, F-S4, F-S5 and F-H5, and with Concept C folded in as a tab.

One window, three stacked zones:

1. **Top zone.** The transport, with an always-visible A/B switch (SRC, REC, BOTH) and a level-match toggle (F-S3 C). Under it, F-H5's 200-bar overview strip and the nine sections as abutting blocks sized by bar count.
2. **Middle zone.** The arrangement. Each source stem is a collapsible group header with its waveform. The tracks that recreate it sit under it. Each track lane shows the variation letter per section, ramps as lines, and a Load, Modify or Create chip (F-S3).
   - Before any stems exist, the groups are simply the families with no waveform, so the layout works today with 13 tracks.
   - Master and sends are one more lane at the bottom.
3. **Bottom zone.** One pane that follows the selection, with three tabs:
   - **Chain:** the selected track's devices left to right as distinct faces, ending in a channel unit. Only this chain is fully drawn.
   - **Notes:** the step grid, or the piano roll when needed, with the stem's detected onsets ghosted above.
   - **Compare:** what is left of Concept C. The stem waveform and the recreation render share one time axis, with an onset diff and a level offset, and no "match score" (F-S3 found no source for one).

Faces follow F-S4 and F-O2:
- a flat chassis with family ink, a glyph and one hero graph per device;
- "plate" depth for the focused face only;
- built from `FaceDefs` data, with the generic slider face as the fallback;
- F-S5's owner dot (inherited, set, ramp, held) on every knob.

The mixer is a drawer you toggle on, not a band.

- **From Ableton Live:**
  - a single window and no floating windows;
  - the Device View chain, left to right, for the selected track only;
  - the Overview strip for a long song;
  - stems in a Group Track beside the muted source;
  - a flat chassis;
  - the Mixer as a toggle;
  - the held-automation state with a re-enable button.
- **From Logic Pro:**
  - a bottom area whose editor follows the selection (Editors pane);
  - the summing stack as the stem container;
  - arrangement markers that abut;
  - the Step Sequencer as an editor of a pattern;
  - Smart Tempo-style confidence marks on imported analysis (via F-S3);
  - the principle that a face announces what the device is, at "plate" depth and not as a skin.
- **New:**
  - the stem as the header of a many-to-one track group;
  - lanes that show the section matrix (variation letters) instead of clips;
  - A/B with level match in the transport;
  - the Compare tab (onset diff between stem and recreation);
  - the Load/Modify/Create chip;
  - family ink plus a hero graph as the identity of each device.

```
+------------------------------------------------------------------------------+
| > || []  126  sw .06 | 042.3 mainA | A/B [SRC|REC|BOTH] [lvl=] | meter | WAV  |
| overview [==|#####|=====================================================]    |
|          |intro|i2|build| mainA     | mainA2    |break |bE| mainB      |outro|  |
+------------------------------------------------------------------------------+
| v DRUMS stem ~|~~|~~|~~|~~|~~|~~|~~|~~|~~|~~|~~|~~|~~|~~|~~|     M S         |
|  |kick  [LOAD] M S =|A    |A |A    |A         |A         |F     |..           |
|  |clap  [MOD]  M S =|     |  |A    |A         |B         |      |..           |
|  |hat_c [LOAD] M S =|     |A |B    |C         |C   /ramp\|      |..           |
| > BASS stem  (bass, sub)          ~~_~~_~~_~~_~~_~~_~~_~~_~~_~~              |
| > OTHER stem (stab, lead, pad)    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~             |
|   MASTER + sends  ........................................ [mixer drawer]    |
+------------------------------------------------------------------------------+
| [Chain] [Notes] [Compare]      selected: bass   [MODIFY: 4 params differ]    |
| [ BASS  ~lowpass curve~ ] -> [ EQ3 ~3-band curve~ ] -> [ CH lvl pan dly rev ] |
|  wave det sub glide         low mid high (nodes)      duck  (o)(o)(o)(o)(o) |
|  cutoff* res env  att dec rel drive     * = owner dot: ramp in this section   |
+------------------------------------------------------------------------------+
```

What I changed from my round-1 Concept A:
- I replaced the per-track source and recreation pairs with stem groups (F-S3).
- I replaced placeholder waveforms in recreation lanes with the variation matrix (F-S3 F).
- I replaced Concept C's shell and match score with the Compare tab and an onset diff.
- I dropped Concept B entirely.
- I deferred the Smart-Controls-style macro row, because it needs mapping data that nobody has designed yet.

## Open question for the vote

**Must every suggestion work in today's state, with no source loaded and 13 tracks?** That state will last as long as D2 is unbuilt.

Several suggestions (F-S3's Source over Recreation, my old Concept C, and parts of mine) are at their best only once stems exist, while others (F-S2, F-S1, F-H5) are built for today. I propose this rule before voting: a suggestion must be usable with zero stems, and it earns extra credit for how well it absorbs stems later. If the group rejects the rule, voters should say which of the two states they are ranking.
