# Faceplate discussion (round 2 transcript)

Compiled 2026-10-23 16:46:02 UTC by the coordinator from the twelve round-2 files in `transcripts/`. Nothing below is edited; each agent's file is reproduced in full after the slate. Read `BRIEF.md` for the question and the roster.

## The slate: twelve suggestions

| # | Agent | Suggestion | In one line |
|---|-------|------------|-------------|
| 1 | F-H1 | Bench with a Chain | F-O1's Concept A; one Device View for the selected track at the bottom; an Overview strip; the mixer as a row that opens above the chain. |
| 2 | F-H2 | Tracks and Editors | Logic-shaped: a 200-bar Tracks area with a variant letter per section cell, an Inspector with two strips and macro knobs, a Mixer view, and a bottom Editors pane that follows the selection with a Controls-view fallback. |
| 3 | F-H3 | Bench Chain | Concept A with a per-track channel strip; full instrument face only in the selected track's chain, chip-size faces elsewhere. |
| 4 | F-H4 | Bench, Chained | Concept A; the selected track's inserts in series, with delay, reverb and the master chain in a separate RETURNS block, as the engine runs them. |
| 5 | F-H5 | Section Matrix | The arrangement as a 13-track by 9-section grid of variant letters, drawn to scale; an editor strip follows the selected cell (copy-on-write); the mixer is a toggled view. |
| 6 | F-S1 | Chain Bench | F-S2's Strips over a Device Row refined: proportional section ruler, compact track strips, a bottom chain (instrument, inserts, channel) with sends and master on a second tab, a thin Source placeholder lane, and a "foreign face" slot for a future WAM GUI. |
| 7 | F-S2 | Matrix Bench | Section ruler, 13 compact lanes in a section matrix, a bottom Device Row for the selected track (pattern, synth, inserts, channel) with RETURN and MASTER pinned right; every device drawn at chip, strip or faceplate density. |
| 8 | F-S3 | Bench with a Stem Group | Concept A with a collapsible Source group of stem lanes above recreation tracks, a three-tab bottom panel (Notes, Chain, Compare), a Load/Modify/Create chip per lane and an A/B switch in the transport. |
| 9 | F-S4 | Family Bench | Concept A with the selected-track chain strip, Source-over-Recreation lanes, the overview and proportional ruler, and the family colour system: a 4 px track rail and glyph chips in every lane header. |
| 10 | F-S5 | Bench with Section Lanes | Concept A with one lane per track of editable section cells (variant chip and ramp marks), an editor band for the selected cell, shape-only knob markers for set, ramp and held, and a "Re-enable arranged" button. |
| 11 | F-O1 | Stem Bench | Concept A refined, with Concept C folded in as a tab: stem group headers above the tracks they feed, variant letters per section, A/B with level match in the transport, and one bottom pane with Chain, Notes and Compare tabs. Works today with no stems loaded. |
| 12 | F-O2 | Strip Bench | F-S2's Strips over a Device Row plus F-H5's ruler and overview and F-S3's section cells; one device row for the selected track. Estimated at 7 to 10 days on top of the 12 to 19 day shared base (rough). |

Ten of the twelve build on F-O1's Concept A ("Bench": timeline above, a device chain for the selected track below). The exceptions are F-H2 (Logic-shaped Tracks and Editors) and F-H5 (Section Matrix as the first screen).

## What the group converged on before the vote

- **One chain at a time.** F-H1, F-H2, F-S1, F-S2, F-S4 and F-O2 all asked whether the bottom panel draws one selected track's chain or many faces at once. Every suggestion except F-H5's answers "one chain, with compact chips elsewhere". No agent argued for all faces at once.
- **Mixer as a drawer or toggle, not a permanent band.** F-O1 and F-H5 disagree on this; F-H1, F-H2 and F-H5 all show the mixer as a toggled view in both reference DAWs.
- **Meters need no engine change.** F-H4, F-S2 and F-O2 agree that compressor, limiter and sidechain already expose `p.node`; F-O2 corrected its own round 1 on this.
- **Faces write through `seq.setParam(path)`.** F-O2's point, accepted by F-S2.
- **Editor type follows track kind.** F-S5: a piano roll for the lead only; step rows for drums and fixed-pitch tracks; a progression strip for chord tracks.
- **Logic's per-circuit compressor "skins" are unproven.** F-H2 and F-H4 both found only that the parameter set changes, not that the artwork does. Any skin tier needs its own justification.
- **The repo's licence is still undecided**, so GPL and AGPL DAWs stay look-only references.

## Coordinator's ruling for the ballot

Two framing questions were raised (F-O1, F-O2, F-S1, F-S3) and must be settled before anyone can rank. My ruling, which the owner may overturn:

1. **The vote is for the first layout to ship.** It must work with today's data (13 tracks, nine sections, no stems, no transcription) and leave a clear slot for the stem pipeline (D2, D3). Suggestions are judged on that basis. Stem-first features count as a plus only if the suggestion also works without them.
2. **One selected track's chain is drawn in full; other tracks stay compact.** This is the group's own consensus, so ballots may assume it.

Ballot rules are in `transcripts/round3-*-ballot.md` instructions: rank three suggestions, not your own in first place, one sentence per rank.

---


# Round 2: FH1

## F-H1: Ableton Live's main layout — round 2

Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

This round has no new web searches. Facts marked "(round 1)" are from my round-1 file, and the URLs in them are the ones I saw in search results there.

## Reactions

**F-O2 (tech lead).** Quote: "a device is a self-contained panel addressed by a stable id, and the shell decides where it appears." I agree, and it changes how I see the bottom slot. In round 1 I described the Device View as a layout. F-O2 treats it as a shell over a device list (`seq.devices()`), which is the right way to hold it. The consequence is that my chain, the Editors pane F-H2 wants and the Compare tab F-S3 wants can all receive the same device record and need no separate code. I also accept F-O2's order of work: its steps 1 and 2 (device list, face registry with a generic face) are layout-neutral, so they should be built first whatever wins the vote.

**F-S2 (implementation).** Quote: "So the main lever is not SVG vs canvas but how many faces are fully rendered at once." I agree. In round 1 I wrote "about 3 to 6 faces at once" with no basis in the repo. F-S2's count (one synth face plus its inserts, about 15 to 40 controls) gives the same order, so I now use it. It also means the 13 track rows can stay live at low cost, because a row with no full face is cheap. F-S2's "Strips over a Device Row" is close to what I propose below, and I adopt its compact track rows.

**F-H5 (mixer, transport, arrangement).** Quote: "Ableton's Overview strip, with a box for the visible window, is the clearest answer to 200 bars." I agree. My round-1 search excerpt says the same: the Overview shows the whole arrangement, and a black outline marks the part on screen (search excerpt: https://www.ableton.com/en/live-manual/12/arrangement-view). I did not put the Overview in round 1. I add it now, at the top of the timeline. I also agree with F-H5 that the Control Bar should be read as three groups (transport, tempo, position), since that is how Live's Control Bar is described (round 1, section 6).

**F-O1 (design director).** Quote: "Main risk: vertical space. Timeline, lane pairs and a device strip ~180 px tall compete on a 900 px laptop screen." I agree the risk is real for Concept A as F-O1 drew it, with 26 lanes. Live solves the same problem by narrowing track headers to the essentials (search excerpt: https://www.ableton.com/en/live-manual/12/session-view/, round 1 section 2). So the answer is one line per track, not two lanes per track. Sends move to a mixer row that is closed by default, so the device chain gets its height only when it is in use.

**F-H2 (Logic).** Quote: "Split the single grid into areas with one job each, as in Logic." I agree with the split. I disagree with one step: F-H2 wants the 16-step grid to open in a generic Editors pane. Live's bottom area holds one chain for the selected track, and its Clip View is a separate toggle (round 1 section 4: Ctrl+Alt+3 for Clip View and Ctrl+Alt+4 for Device View). So the bottom slot should have one default content (the chain) and a selector for others (Notes, Compare). Two different panes would mean two places to look for the same track's sound.

## Answers

Questions addressed to my area by id:

- **F-H3, "What would not fit".** Quote: "A device-view bar at the bottom ... It would need a second selected-device concept; this is a question for F-H1's view." No second selection is needed. In Live the Device View is keyed to the selected track: a track's chain appears when you double-click its title bar (round 1 section 4, search excerpt: https://www.ableton.com/en/live-manual/12/working-with-instruments-and-effects/). The devices inside the chain are addressed by their position, so there is one selection (the track) and the device is only folded or expanded. Havantechno needs the same: select a track, see its chain.

- **F-S3, "From Ableton ... the bottom detail panel (the Device View position; F-H1 covers it)".** Yes. Device View is at the bottom and shows the selected track's chain. Live's bottom area is toggled between contents (Clip View and Device View have separate toggles), which fits F-S3's three tabs, [Notes] [Chain] [Compare], in one slot. I would still be careful about Live's "Stacked Detail" view, which I could only see in press excerpts (unverified), so I do not use it as evidence that both show at once.

Group questions in my area, answered by id:

- **F-S1, question 2** (is a selected-track chain acceptable when it hides 12 of 13 tracks' parameters?). Yes, if each track row keeps level, pan, M/S and its 16 steps visible. Live keeps the track headers visible in both views and narrows them when space is short (round 1 section 2). Sends and duck are the parameters that should move out of view, to the mixer row and the chain.

- **F-O2, question 1, and F-S2, question 1** (one device chain at a time, or many faces at once?). One chain at a time. Live shows one chain by default (round 1 section 4, and the same claim in the F-O1 search excerpt: https://www.ableton.com/en/live-manual/12/instrument-drum-and-effect-racks/). This keeps the performance budget F-S2 and F-O2 set out, and it is the answer I give in my suggestion below.

- **F-H3, question 1** (does an instrument face open from its track card, or replace the slider list on the card?). Neither, exactly. Live has no card: a track is selected and its chain shows (round 1 section 4). For Havantechno the card becomes a fixed-height track row, and the face opens in the chain for that track. The card does not grow.

- **F-S3, question 4** (may the Source group push the Recreation tracks below the fold?). Yes, with F-S3's fallback of one thin collapsed Source lane. Live copes with many tracks by narrowing headers and fitting track heights (the H key in the Arrangement view, from the F-H5 search excerpt: https://www.ableton.com/en/live-manual/12/arrangement-view). A collapsed group is the same idea.

- **F-H5, question** (mixer as vertical strips with sends, or sends on each face?). Sends stay in the mixer. In Live the Sends and Returns are part of the Mixer section, not of any device (round 1 section 7). A device face keeps only its own sound. The sidechain is different: in Live it is a sub-panel of the device that uses it (F-H4 search excerpt: https://www.gear4music.com/blog/how-to-sidechain-in-ableton-live). So duck belongs on a sidechain face in the chain, and the strip shows at most one readout of its amount.

## One disagreement

F-O1, question 1: "Main question: what is the main object, the song (A), the mix (B) or the match (C)? The owner's D3 suggests the match." I disagree with making the match the main object (Concept C). Four reasons, all from the round-1 files:

1. F-O1's own risk entry for C: "Most of what it shows does not exist yet: there are no stems, no audio-to-MIDI and no match score in the repo. Until they exist, Concept C is an empty frame around today's 13 tracks."
2. F-S3 on the match score: "no source for how to compute it ... Do not design the chip around a number."
3. F-O2 gives C's pipeline no number ("the pipeline is not estimable yet"), and F-O1's question 6 to Gear Crew is still open.
4. The song is the one object the repo already has, and it is checked: the nine sections sum to 200 bars, and every track has a variant letter per section (round 1, F-H5 section C; F-S5 finding A2 and song.js).

D3 is about recreation, which is judged by listening and by A/B, and that can be a mode of the timeline (F-S3's A/B switch in the transport). So C should be a view on the song, not the centre of the screen. F-O1's own reading of the Live and Logic evidence, "Every DAW we studied suggests the song", supports this.

## My suggestion

**Name: Bench with a Chain.** This is F-O1's Concept A with three changes. (1) The bottom is one Device View for the selected track, not a strip of every device, so one selection drives it, as in Live. (2) The mixer is a row that opens above the chain, closed by default, so sends and master do not take height. (3) The Overview strip from Live sits at the top of the timeline, and each track row shows its variant letter per section. I drop the browser column from round 1 for version 1. The device set is fixed, and the browser's real job here is the stem library, which does not exist yet (F-S3's Source group comes back then).

What it borrows from Ableton Live: the Overview with the visible-window box; one Device View for the selected track, read left to right in signal order, with fold; narrowed track headers; a mixer opened from a control at the bottom right; section markers on a ruler. What it borrows from Logic Pro: a permanent track list beside the timeline, and one bottom slot whose content follows the selection (F-H2 findings 1 and 3). What is new: the timeline cells are the song's variant matrix (A, B, C per section per track), so the sections read as data and not as chips; the chain carries a sidechain face for duck; and the bottom slot has tabs (Chain, Notes, Compare) for the later remix stage, as F-S3 proposes.

```
+--------------------------------------------------------------------------+
| > []  126 BPM  swing .06 | bar 42 mainA | loop [mainA]        WAV         |
+--------------------------------------------------------------------------+
| overview [==|##########|================================]    200 bars      |
+-----------+--------------------------------------------------------------+
| track     | intro  | build | mainA          | mainA2 | break | mainB ...   |
| kick M S  | [A]    | [A]   | [A] [A] ...    | [A]    | ...                 |
|  steps    |                                                              |
| sub  M S  |  (13 rows, one line each: name, M/S, 16 steps, variant)      |
+-----------+--------------------------------------------------------------+
| MIXER (closed by default)  per track: lvl pan dly rev  | RET DLY RET REV  |
+--------------------------------------------------------------------------+
| DEVICE VIEW  kick (selected)            [fold v] [Chain|Notes|Compare]   |
| [kick face] > [sidechain duck] > [channel: lvl pan] > track out          |
+--------------------------------------------------------------------------+
```

## Open question for the vote

Does the bottom slot show only the selected track's chain (one selection, as in Live), or do device faces stay on their track rows? Concepts A and B, and F-S1's and F-S2's suggestions, each answer this differently, and the answer sets the performance budget, the cost of each concept (F-O2) and whether faces need a compact variant. It should be settled before the ballots.

---

# Round 2: FH2

## F-H2: Logic Pro main layout — round 2
Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

Basis: my round-1 file (`round1-FH2-logic-layout.md`) and all eleven other round-1 files, read in full. Search use this round: one web search (the Compressor circuit-type question in "One disagreement"). The Apple page fetches still fail in this sandbox, so the Logic facts below remain search excerpts or unverified, as in round 1.

## Reactions

**F-O1 (design director, Concept B "Console").** Quoted: "The owner's D1 ... asks for Logic's identity. The single-screen browser setting asks for Live's discipline."
I agree with the diagnosis. It changes my view in one place: I had argued for Logic's identity in the shell, through skinned panels and the mixer. F-O1's framing moves it into the device face, and the shell can keep Live's discipline. I also agree with F-O1 that floating plug-in windows should not be the main device surface. F-O1 gives the reason, "A browser tab is one screen, so they would hide the timeline", and my round-1 finding F5 (Logic's Smart Controls exist to avoid window clutter) points the same way.

**F-O2 (tech lead, migration steps).** Quoted: "They are layout-neutral, so every concept in the vote needs them."
I agree, and it matches my round-1 build note that a generic Controls-view fallback comes first. F-O2's cost line for a bottom editor pane ("2 to 4 days") also supports the single-pane design I propose below. It changes my view in one way: the editor pane can be built on step 2 of F-O2's plan, before the layout vote, so the vote does not block the first useful work.

**F-H1 (Ableton main layout).** Quoted: "A single bottom Device View, with the selected track's chain shown left to right as device faces in a row."
I agree with the signal-order chain. I disagree with the "faces in a row" part, and this changes my view. Logic shows one editor for the current selection, not every device at once (my round-1 F3, from the Editors pane excerpts). So the chain should select what the pane shows, and only one device face is drawn at a time. This also keeps the performance budget that F-O2 sets.

**F-S3 (remix information architecture).** Quoted: "Logic: the Step Sequencer edits a Pattern region, shown as an editor at the bottom of the window."
This confirms my round-1 F3 finding, and it is the most useful point for Havantechno. It changes my view: the 16-step pattern should be drawn as a region on the track's lane, labelled with the variant it plays in each section, and opened in the bottom pane when selected. The step grid stops being a card of its own. F-S3's section matrix (`play` per section, plus a variant letter per cell) is the same idea from the data side.

## Answers

Questions addressed to my area by id, plus two group questions that bear on it.

- **F-H3, question 1** (open the face from the card, or replace the card's slider list?). Logic opens a plug-in from its slot in a window, and the same plug-in has two views: Editor view (its own graphic interface) and Controls view (every parameter as a slider). A preference sets which view opens first (search excerpts: https://help.apple.com/logicpro/mac/10.4/en.lproj/lgcpbc21a1fd.html and https://support.apple.com/en-uz/101781). Answer: in my suggestion the card does not exist. The face opens in the bottom Editors pane for the selected device, and the slider list becomes that device's Controls view, switched per device. The card-size question therefore goes away.
- **F-H1, question 1** (show only the selected track's chain, or all devices at once?). Answer: only the selected chain, with one face open at a time in the pane. Logic works the same way: the Editors area shows the editor for the current selection (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp2a07a994.html).
- **F-H1, question 2** (grid first, or the 200-bar timeline first?). Answer: the timeline first. Logic opens onto the Tracks area, and the editors appear below it when something is selected (same excerpts). The step grid is then one editor among several, not the first screen.
- **F-H5, question** (mixer as a vertical strip with level, pan, sends and duck, or sends and duck on each device face?). Logic keeps sends and inserts on the channel strip, and they can be edited there without opening the Mixer (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc3b1d.html). Answer: sends and duck depth belong on the strip. Device faces hold only the device's own parameters, and the sidechain envelope sits on the sidechain face. This matches F-H5's own proposal.
- **F-FO1, question 1** (what is the main object: the song, the mix or the match?). From Logic, the main object is the project timeline of regions, with the Mixer as a separate view. The console is not the main object. For Havantechno I would say the song in time, with the match shown on each lane.
- **F-FO1, question 5** (for F-S1: do browser DAWs float plug-in windows, and how do they handle overlap?). Not my area. From Logic: plug-in windows float over the main window, and a Link control chooses one shared window or one window per plug-in (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html). I found no source on overlap handling in a browser, so I pass this to F-S1.

## One disagreement

**Disagreement with F-O1 and F-S4 on whether Logic's plug-in skins carry identity.** F-O1 says: "In Logic, the face tells you which sound you are getting." F-S4 says Logic "uses the skin tier to tell you which hardware a plug-in imitates", and that "the look encodes a sonic character". F-S4's own section C lists "Not found: what each skin looks like (colours, textures, knob styles)". My round-1 file (FH4) marks the same claim "Circuit skins: not confirmed". This round I searched for it once. The results say the interface "updates when you choose a model", and that not all parameters exist in every model (search excerpt: https://support.apple.com/guide/logicpro-ipad/lpip25f51558/ipados). None of the results mentions artwork, colour or texture per circuit. The sources support three things: model names tied to named hardware, a changing parameter set, and a general "highly skeuomorphic" description of the stock Compressor (the Splice post cited in round1-FS4 section C, item 2; I did not see it in my own results). They do not support a per-model visual identity.

Why it matters: F-S4's "skin tier" and F-O1's Concept B both lean on this premise. I shared it in round 1, as a recalled point I had marked unverified. I now think the skin tier should be justified by design grounds (it is still a valid option), not by Logic. Havantechno's devices also have no model selector, so a per-model skin would have nothing to encode, as F-S4 itself notes.

## My suggestion

**Name: Tracks and Editors.** This is a Logic-shaped layout with Live's overview and chain. The Tracks area is the centre: the 200-bar arrangement, one lane per track, with the variant letter each section plays shown in each cell, and a bar ruler with the nine sections as markers. An overview strip sits above it, as in Live. The Inspector on the left holds the selected track's two strips: the track's channel strip (level, pan, sends, duck depth, mute and solo) and its output (the master, for now), plus a row of four to six macro knobs (Logic's Smart Controls) that map across the track's synth and inserts. A Mixer button switches the centre to a Mixer view of all 13 tracks, the two sends and the master, so the Mixer is a view rather than a window. The Editors pane sits at the bottom and always shows what is selected. A pattern region opens the 16-step grid for that variant. A device opens its face (Editor view), and a toggle switches to the slider list (Controls view). A signal-order strip in the pane header (instrument, inserts, channel, sends, master) lets the user select any device in the chain, so the pane shows one device at a time.
- From Ableton Live: the overview strip, and the signal-order chain as a selector (F-H1, F-H5).
- From Logic Pro: the Tracks area as the main surface; the Inspector with two strips; the Editors pane that follows the selection (Step Sequencer for a pattern region, the device editor for a device); Editor and Controls views per device; Smart Controls as a macro row; a Mixer as a view.
- New: the 16-step pattern is a block on the lane, labelled with its variant, so structure and rhythm are seen together; the pane header chain selects devices without drawing them all; the Controls view is the fallback for every device, so each device works before it has its own face.

```
+--------------------------------------------------------------------------+
| > []  126  swing .06 | bar 42 mainA | [ARRANGE] [MIXER] | export WAV     |
+--------------------------------------------------------------------------+
| overview [==|##########|==============================================]    |
+-----------+--------------------------------------------------------------+
| INSPECTOR | ruler  intro  i2   build   mainA      mainA2  brk  bE  mainB   |
| kick      | kick   [A]    [A]  [A]     [A]          [A]    [A]  ...      |
| lvl  pan  | sub    [A]    [A]  [A]     [A]          [A]    ...           |
| dly  rev  | bass   [A]    [A]  [A]     [A]          [B]    ...           |
| duck      | ...    13 lanes, scrolls; each cell = variant played         |
| macros    |                                                              |
|  (o) (o)  |                                                              |
+-----------+--------------------------------------------------------------+
| EDITORS  kick: [inst] > [inserts] > [channel] > [sends] > [master]      |
|          tune  punch  sweep  decay  click  drive     [Face | Controls] |
+--------------------------------------------------------------------------+
```

## Open question for the vote

Does one device face open at a time in the bottom pane (my suggestion, and Logic's model), or do several faces stay open at once? The answer fixes the performance budget F-O2 has to meet, whether faces need a compact variant, and whether the Concept B rack is needed at all.

---

# Round 2: FH3

## F-H3: Instrument faces — round 2
Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

I read all eleven other round-1 files in full (FH1, FH2, FH4, FH5, FS1 to FS5, FO1, FO2). No new web searches this round. Facts about other agents' work are cited to their round-1 file and section. Facts about the repo are cited to the file they came from.

## Reactions

1. **F-O1 (design director).** Quote: "The cost is that devices look alike. That is exactly what the Havantechno owner objects to in D1."
   I agree, and it changes my view. My round-1 file described family colour and a per-device graph as the identity layer, but did not say what the shared base should be. F-O1's rule gives the constraint: one control grammar for every face (same knob drag, same double-click reset, same readout, same on/off), with distinctness coming only from layout, colour and one signature display. I adopt that rule for all 13 synths. The faces will differ in grid and graph, never in how a knob behaves.

2. **F-O2 (tech lead).** Quote: "Build first: steps 1 and 2. These are the device list plus a face registry with a generic face and one UI loop."
   I agree, and it changes my plan. I had assumed the 13 instrument faces would be designed first and placed later. F-O2's registry with a generic fallback means instrument faces can ship one family at a time, and the layout choice does not block them. F-O2 also flags a gap I had noted in round 1: "Selector widgets need a `choices` list" (F-O2 section 1, C6). This changes my suggestion for `wave` on bass and lead. Its option list should live in the `synths.js` spec as a `choices` entry, which F-O2 already plans for the string specs, not be hard-coded in my face.

3. **F-S4 (visual system).** Quote: "Within a family (six drums share one orange) devices must differ by motif."
   I agree with the structure: a family hue plus a per-device hero graph. Its drum and fx rows (section 6) match what I proposed in round 1, including kick as a pitch-drop curve, clap as bursts, riser as a ramp and impact as a hit. I also agree with its choice to give hat_closed and hat_open the same drawn envelope at different lengths, so the pair reads as siblings. My one addition: the hero graph, not the 16 px glyph, should carry the identity at a glance. Six drum glyphs at 16 px are hard to tell apart. This is my judgement, not a tested result.

4. **F-H1 (Ableton main layout).** Quote: "Folding a device by double-clicking its title bar gives a density control without a new view."
   I agree. Fold is the right gesture for moving between a compact and a full instrument face, and a user who learns it once gets the same behaviour on every device. I would make fold the gesture for chip versus full face in the chain, so there is no separate expand button.

5. **F-H5 (mixer, transport, arrangement).** Quote: "The instrument and effect faces (F-H3, F-H4) sit behind the strips and open from them."
   I agree that faces open from the strips. I read "behind the strips" as the bottom detail panel, which matches F-H1 and F-H2, not as a layer over the mixer. I would say this explicitly in the layout, because a face drawn over the strips would bring back the floating-window problem that F-O1 and F-H2 both reject.

## Answers

Only one question was addressed to my area by id. Others are for the group, and where they touch instrument faces I answer them below.

- **F-H1, question 1.** Quote: "Should the bottom panel show only the selected track's device chain (Live's model), or all devices at once in a long strip (closer to the current page)? The answer changes whether F-H3 and F-H4 need to design for a single face per view or for several faces side by side."
  Answer: design for both sizes, and design the full size for one face at a time. Only the selected track's chain shows full faces. Every other track shows a chip-size face in its row, 28 px high, with glyph, name and bypass, as F-S4 section 8 defines it. That gives each instrument two sizes, and the full size must fit the chain panel's height. At about 40 px per knob, three rows of four controls fit. Kick (7), sub (5), stab (11), clap (8), pad (7) and the rest fit. Bass and lead (12 each) need the "more" drawer F-S2 proposes for any parameter that does not fit.

- **F-H4 group question 1** (live reads from audio nodes on faces, quoted in its file). For instrument faces only: no live reads are needed. Their graphs can be computed from `spec` and `params`, as F-O1 and F-O2 both propose. The only live value I would want is an optional per-track level, which is already in the track meter.

## One disagreement

**F-S4 (visual system), section 9, the default track colour.** Quote: "Default: a track's colour is its instrument's family hue at the muted level. That means zero setup, and a kick track is orange without anyone choosing it."

I disagree with this default. If a track's rail is its instrument's family hue by default, then every track's rail matches its own device's ink by construction. F-S4's collision rule (section 9: "when track colour and device ink are within about 30 degrees of hue ... the rail is the track's job and the ink is the device's job") is meant for the rare case of a user-painted clash. Under this default it fires on every track, so the rule that is supposed to keep "two colours, two jobs" separate is never tested in its normal state. F-S4 says the collision rule is "not tested by eye (unverified)", and its own question 2 asks the group the same thing.

Evidence: F-S4 section 9 (the default and the collision rule) and F-S4 question 2. Live's track colours are a palette, per F-S4 B7 and the Recalled list.

My alternative: the rail starts neutral or takes a palette colour by track order, and family colour lives only on the device (header underline, glyph, graphs). Then the collision rule only fires when a user paints a track, which is the case it was written for.

## My suggestion

**Name: Bench Chain.** This is Concept A from F-O1 (its "Bench"), refined with F-H5's channel strip, F-S2's and F-S4's density tiers and the registry from F-O2.

One window. The top is a control bar: transport, BPM, swing, the bar and section readout, the SRC / REC / A+B audition switch and export. Below it, the 200-bar ruler with the nine sections. Each track has one row in the timeline, starting with a narrow channel strip (M, S, level, pan, duck) on its left, as in F-H5's Console Strip. Source stem lanes sit above each recreation row and are collapsed until stems exist. The bottom is a fixed-height chain panel for the selected track only. It holds the instrument's full face first, then its inserts and the channel, in signal order, left to right. Clicking a track's chip selects it and opens its chain. Every face is drawn from the F-O2 registry with the F-O1 control grammar. Family colour is on the device, and the track rail stays neutral (see my disagreement above).

Borrowed from Ableton: the bottom Device View chain, one selected track at a time, fold as the density gesture (F-H1), and the arrangement ruler, without the clip grid. Borrowed from Logic: the per-track channel strip as an Inspector-style column (F-H2), and the generic slider list as the Controls-view fallback for any device without a face. New: family-coloured faces that identify the instrument by its graph, the two-size chip and full face, and a neutral track rail.

Vertical budget (my estimate, not measured): control bar about 40 px, ruler and sections about 40 px, 13 lanes at about 24 px (about 312 px), chain panel about 200 px. That totals roughly 600 px, which fits a 900 px laptop screen with lanes collapsed. Expanding source lanes is what overflows, which is why they collapse by default.

```
+----------------------------------------------------------------------------+
| > || []  126 BPM  swing .06   bar 42 mainA   [SRC|REC|A+B]        WAV      |
+------------+---------------------------------------------------------------+
| channel    | 1    17   25     41        73       105  129 137     185       |
| strip      | |intro16|i2 8|build16|  mainA 32  | mainA2 32 |brk|bE|mainB|out|  |
+------------+---------------------------------------------------------------+
| kick M S   | rec  #..#..#..#..#..#..#..#..  (rail neutral, chip: glyph+name) |
| lvl pan    | src  ~~/\~~/\~~   (collapsed until stems exist)                |
| duck       |                                                                |
| sub  M S   | rec  ====....====....                                          |
| bass M S   | rec  ..#..#..#...                                              |
|  ...       |  ...                                                           |
+------------+---------------------------------------------------------------+
| CHAIN: kick   [KICK  tune punch sweep | decay click drive]  >  [CHANNEL]  > |
|               pitch-drop plot  decay plot (SVG, computed from params)       |
+----------------------------------------------------------------------------+
```

## Open question for the vote

Does the group accept that the full instrument face is drawn for the selected track only, with the other twelve tracks showing chips? A yes makes the full faces (up to 12 controls each) a one-at-a-time design, and it is the cost assumption behind F-O2's cost figures for option A. A no means every instrument needs a full face visible at once, which would change the F-O2 performance budget and my three-row limit.


---

# Round 2: FH4

## F-H4: effect faces — round 2

Agent model: Haiku 5.5. Date: 2026-10-23. Read all eleven other round-1 files in full, plus my own. No web searches this round. Code paths are read from `studio/processors.js` (the `studio/` symlink points to `olde Havantechno dub studio/`).

## Reactions

**F-O1 (design director), agree and change my view.** Quote: "Not photoreal skins, but each device type gets its own layout, a family colour and one signature display." I agree, and it changes my round-1 table. I had listed effects by what the DAWs show. F-O1 turns that into a rule: every one of Havantechno's ten processors gets exactly one signature display, and the display is the face's identity. I now treat that as a requirement, not an option. The per-processor table in my round-1 file becomes the list of those ten displays.

**F-O2 (tech lead), agree, with a correction to my own file and to F-O2's.** Quote: "A GR meter needs a small accessor in `processors.js`." I checked `studio/processors.js` again. The compressor, limiter and sidechain already store their node on the unit: `p.node = c;` at line 212 (compressor), `p.node = c;` at line 227 (limiter) and `p.node = g;` at line 242 (sidechain). So the reduction value is reachable without an engine change. F-O2's accessor is still the cleaner route, because a `p.reduction()` wrapper keeps the face away from engine internals (its C1). I adopt the accessor, but it can be a three-line wrapper, not new audio code. My round-1 claim that the GR value was "not reachable" was also wrong, and I withdraw it.

**F-S4 (visual system), agree.** Quote: "compressor | dynamics | magenta `#ea97d8` | gain-reduction needle; transfer curve with live GR meter". Their section 6 gives each device a glyph plus a hero graph, and that is the right identity cue for the ten processors. It also changes my view on bypass: F-S4's "hero graph drawn dashed" for a bypassed unit is a better signal than a grey-out, and I will use it for every effect face.

**F-H1 (Ableton layout), agree.** Quote: "Folding a device by double-clicking its title bar gives a density control without a new view." Fold is the cheapest density control for ten effect faces in one chain. I want it on every effect face, with the folded state showing the hero graph at small size, so a folded chain still says what each device is.

**F-H5 (mixer and transport), agree.** Quote: "Logic's aux strips are the model for DELAY and REVERB as returns on the right." Delay and reverb are parallel sends in the engine (`seq.sends`, the `send.delay` and `send.reverb` paths), not inserts. A serial device strip would misstate that. I agree they belong in a return area at the chain's end, outside the series line. This is the main structural point my suggestion below depends on.

**F-O2 also, on chain rendering.** Quote: "only the selected chain is live, which is also the cheapest rendering model." This matches my round-1 build notes (3 to 5 mounted faces). It also means I can build effect faces without worrying about a 23-face budget.

## Answers

**To F-S4, question 3** ("For F-H4: can the effect faces agree on one hero graph per device from section 6? If a device can't draw one cheaply, say so"). Yes for nine of the ten. Each graph comes from the processor's own spec, plus a live read where noted:

| Processor | Hero graph | Source of the numbers |
|---|---|---|
| filter | response curve (mode, cutoff, q, gain) | parameters only |
| saturator | transfer curve (drive), tone corner | parameters, via the same shaper function the engine uses |
| delay | tap train (time or division, feedback, pingpong) | parameters only |
| reverb | decay envelope (size, decay), predelay marker | parameters, but the exact mapping needs a read of `K.impulse` in `core.js`, which I did not read |
| eq3 | three-node curve (low, mid, high) | parameters only |
| compressor | transfer curve plus live gain-reduction meter | curve from parameters; meter from `p.node.reduction` (live) |
| limiter | hard-knee curve to ceiling, live gain-reduction meter | curve from parameters; meter live |
| sidechain | duck envelope (depth, attack, hold, release) | parameters; optional live trace from `p.node.gain.value` |
| widener | width diagram (mid 1, side = width) | parameters only |
| chorus | LFO scope (rate, depth in ms, mix) | parameters only |

Two cannot be drawn cheaply in the parameter-only sense. The widener's stereo view (correlation or vectorscope) needs an AnalyserNode reading the output, which is not a parameter. So its hero graph must be the static width diagram, and the live view is an option for later. The reverb mapping from size and decay to a visible envelope is my proposal, not a DAW convention, and I would check it against `K.impulse` before the face is built.

## One disagreement

**F-O1 claims that Logic's Compressor shows a different skin per circuit type, and recommends the same skin switch for Havantechno "as Logic's Compressor does" (Borrow from Logic, item 4; also "In Logic, the face tells you which sound you are getting").** I do not think the evidence supports this as a Logic lesson.

Reasons, from the files:
- My round-1 file (F-H4, Logic Compressor section) found Apple's iPad guide saying only that "the interface updates when you choose a model" and that "not all parameters are available" in each model. No source I found describes different artwork, colour or graph per circuit. I marked the per-circuit skin claim "not confirmed".
- F-S4 (section C, items 5 and 6) reached the same conclusion from its own search: "Not found: what each skin looks like", and "Not found: any statement that each Logic plugin has its own colour."
- F-O1's own source for the look is a Splice post (`splice.com/blog/?p=16766`). It calls the stock Compressor "highly skeuomorphic", which describes the plug-in as a whole, not a change between circuit models.

So what Logic demonstrably does is name the hardware each model imitates (the Studio FET to a UREI 1176, the Classic VCA to a dbx 160). That is a naming lesson, and it costs nothing for Havantechno. The skin switch should come off the list. Havantechno's compressor has one algorithm (`DynamicsCompressorNode`), so a switch would be decoration, as F-S4 says.

## My suggestion

**Bench, Chained.** I endorse F-O1's Concept A ("Bench") as the base, because F-O2 ranks it cheapest and F-O1 says it is closest to how producers think. I change three things for effect faces. First, the bottom panel shows the selected track's chain as one left-to-right line of faces in signal order: instrument, then inserts (bass: eq3; stab: widener), then the channel strip with level, pan and duck. Second, delay and reverb are not in that line. They sit in a RETURNS block at the chain's right end, with the master chain (eq3, hp, lp, glue, saturator, limiter) after them, because the engine treats them as parallel sends and master units. A reader can then see which effects are in series and which are returns. Third, every effect face has one hero graph from the table above, dashed when bypassed (F-S4), and a Fold toggle (F-H1) that shrinks it to the graph alone. Ableton supplies the one-chain bottom panel, the left-to-right order, and fold. Logic supplies the channel-strip inspector for level and pan and the naming of what each device is. What is new is the split between the serial chain and the returns block, which neither DAW draws, because Ableton's device view has no parallel returns and Logic's returns are in the mixer, not in the device view.

```
+---------------------------------------------------------------------------+
| > || []  126 BPM  swing .06  bar 42 mainA   [src][rec][A+B]   WAV          |
+---------------------------------------------------------------------------+
| sections  intro|i2|build| mainA |mainA2|break|bE|mainB|outro   (to scale)  |
+------------+--------------------------------------------------------------+
| kick  M S  | section lanes: pattern letter per section                    |
| sub   M S  | ...                                                          |
| bass  M S  | ... (selected row highlighted)                               |
| ...        |                                                              |
+------------+--------------------------------------------------------------+
| CHAIN bass:  [BASS face] > [EQ3 face] > [channel: lvl pan duck]  | RETURNS |
|              synth        curve(hero)                            | [DELAY] |
|                                                                  | [REVERB]|
|                                                                  | MASTER  |
|                                                                  | eq hp lp|
|                                                                  | glue sat|
+---------------------------------------------------------------------------+
```

## Open question for the vote

Should the chain show the inserts in series with sends and master in a separate RETURNS block (as above), or should sends and master go into the same line as the inserts? The answer decides whether the master chain, which the engine runs in fixed order, is drawn as a row in the chain or as its own block.

---

# Round 2: FH5

## F-H5: mixer, transport and arrangement — round 2
Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23. Read: all eleven other round-1 files in full. Web searches this round: none. Repo facts are from `studio/song.js`, read in round 1 and re-checked for this round.

## Reactions

- **F-S3:** "So the arrangement is already a matrix: sections as columns, tracks as rows, and a variation letter in each cell." I agree, and I checked it in `studio/song.js`: every section has a `play` map from track to variant. This changes my view. In round 1 I drew the arrangement as a ruler with lanes. The matrix shows the real data (which variant each track plays in each section), so I now make it the arrangement view.
- **F-H2:** "Make the step pattern a region, and open its 16-step grid in the Editors pane." I agree. My round-1 proposal kept the 16-step row inside each track lane. Logic's model is a pattern region that opens in an editor below, so the row moves out of the track header and into a matrix cell plus an editor strip.
- **F-S5:** "`kick: 'A'` appears on 9 lines of studio/song.js." I agree, and the count holds: all nine sections play kick `A`. That makes copy-on-write the only safe default for editing a variant (see Answers).
- **F-O1:** "Main risk: vertical space. Timeline, lane pairs and a device strip ~180 px tall compete on a 900 px laptop screen." I agree, and it applies to my round-1 proposal as well, which stacked three bands. The matrix must use compact rows (13 rows at 24 px is about 312 px, my arithmetic), and the editor strip must stay short. I have kept the vertical budget in the suggestion below.
- **F-S2:** "Strips over a Device Row." Its layout (compact track strips on top, a device row for the selected track, sends and master in a second area) is close to my round-1 Console Strip. I endorse that skeleton. My one difference is that the compact track list becomes the matrix rows, so the same rows carry the arrangement and the mixer controls.
- **F-H1:** "A narrow track header in the grid. Live shows only the launch button and essential controls when a track is narrowed. For Havantechno this would be level, mute, solo and a mini 16-step row." I agree. It is the row header of the matrix, and it matches the Logic rule that track-header M/S and the channel strip stay linked (F-H2, F1 and F4).

## Answers

- **To F-S3, question 3** ("should section markers be editable on the ruler (the song data is currently static), and should a marker move re-time the stems as well as the patterns?"): In v1, markers are read-only, because a marker move changes the bar count of a section and so the start bar of every later section, which `setArrangement` would have to recompute. If markers become editable later, a move should change only the pattern and `fx` positions, and never the stems. Stems are audio laid on the bar grid. Moving a marker does not re-time them, and re-timing audio would need time-stretch, which the repo does not have. A stem's bar position is therefore fixed by the grid, and the boundary between two sections is the only thing a move changes. This is my reading of the design, not a sourced fact.
- **To F-S5, question 3** ("is 'edit variant A for every section that uses it' or 'copy on write' the right default for the step rows?"): Copy on write, by default. `kick` `A` is used in all nine sections of `song.js`, so editing it in place would change the kick in every section at once. The matrix cell shows the variant letter and a "used in N sections" count. The editor strip edits the variant for the selected cell. The user chooses "edit all N sections" or "duplicate as new variant" explicitly. Copy-on-write is the default for every variant that has more than one use.

## One disagreement

F-O1's Concept B says: "The arrangement shrinks to the section bar in the header. Pattern editing happens in the device or in a per-track step drawer, not on a timeline." Its risk line says: "Main risk: you lose the song." I disagree that a console needs the timeline removed. F-O1 itself says "Both put the timeline in the middle" (its section on the root difference) and "The Tracks area is the central workspace" (about Logic). In both references the mixer is a toggled view beside the timeline, not a replacement for it. F-H1 (section 7) describes Ableton's mixer as a section that "can be expanded or collapsed in either view", and F-H2 (F4) describes Logic's Mixer as a view opened from its own button. Neither needs the timeline gone. The console can be a toggled view over the same matrix, and Concept B does not need to give up the song.

## My suggestion

### Section Matrix (refines my round-1 Console Strip)

The arrangement is a grid, not a lane set. Rows are the 13 tracks, and columns are the nine sections, drawn to scale by bar count across the 200 bars. Each cell holds the variant letter from `song.js` (A, B, C or D, or blank where a track is silent), so the matrix is the data the repo already has. Above it, a thin overview bar shows the whole song with the visible window marked. The section ruler carries the loop brace (the "loop section" checkbox becomes a brace over the selected section) and the playhead. Each row header has M and S, linked to that track's channel strip, and collapses to a 16-step mini row when narrow. Selecting a cell opens that variant's 16-step row in an editor strip below, which follows the selection. Editing a variant shared by several sections is copy-on-write by default. The same bottom strip shows the selected track's channel strip (level, pan, DELAY and REVERB send knobs, duck depth) and its device chain as faces. The full mixer for all 13 tracks, the two returns and the master is a toggled view over the same rows. The transport sits in one bar: play and stop, BPM, swing, a position readout, a master clip lamp and export.

- **From Ableton Live:** the Overview box with the visible window (F-H1, section 3, search excerpt); the narrow track header (F-H1, borrow 4); the Control Bar grouping of transport, tempo and position; and the Session-style idea of one cell per track and section, which F-H1 suggests as "a scene grid for sections" (its borrow 1).
- **From Logic Pro:** the Tracks area with track headers linked to channel strips (F-H2, F1 and F4); the Editors pane that follows the selection (F-H2, F3); markers that abut with no gap (F-H2, F8), which the nine sections already are; and the cycle as a range on the ruler (F-H2, F8).
- **New:** the matrix is built from `song.js` `play` maps, with a "used in N sections" count on every variant cell and copy-on-write as the default. The bottom strip shows one track at a time, so 23 device faces are never all mounted. Sends are named by effect (DELAY, REVERB) and duck depth is one control, following the round-1 finding that the data calls it `sidechain.depth`.

Vertical budget (my arithmetic, not measured): overview 20 px, ruler 24 px, 13 rows at 24 px (312 px), editor and channel strip about 140 px, transport 40 px. That is about 540 px, which fits a 900 px laptop screen with the browser chrome.

```
+------------------------------------------------------------------------------+
| > []  126  swing .06   bar 042 . 09 . mainA  loop[mainA]    clip[ ]  WAV    |
+------------------------------------------------------------------------------+
| overview [==|##########|==========================================]           |
+----------+--------+-------+-------+-------+-------+-------+-------+----------+
| track    | intro  |intro2 | build | mainA |mainA2 | break |brkEnd |  mainB  |
|          |   16   |   8   |   16  |   32  |  32   |  24   |   8   |   48    |
+----------+--------+-------+-------+-------+-------+-------+-------+----------+
| kick M S |   A    |   A   |   A   |   A   |   A   |   A   |   A   |   A     |
| sub  M S |   A    |   A   |   A   |   A   |   A   |   A   |   A   |   A     |
| bass M S |   A    |   A   |   A   |   A   |   B   |   C   |   C   |   B     |
| hatc M S |   .    |   A   |   B   |   A   |   C   |   .   |   D   |   C     |
| ...      |                                                                   |
+----------+--------+-------+-------+-------+-------+-------+-------+----------+
| EDITOR bass.B [..x...x.x...x.x.]  [A][B][C]   used in 2 sections [copy]     |
| CHANNEL bass  lvl ==o  pan o  DELAY o  REVERB o  duck [==]   | MASTER |      |
+------------------------------------------------------------------------------+
```

The sketch is not to scale and leaves out the outro column (16 bars) for width. The letters for kick, sub, bass and hat_closed are copied from the `play` maps in `studio/song.js`. A `.` marks a section where that track is silent in the song.

## Open question for the vote

Should the section matrix (13 tracks by nine sections) be the first thing on screen, with the card grid moved behind a toggle, or should the matrix sit under the current grid? The answer sets how much of the 900 px laptop screen goes to the arrangement, and it is the vertical-space trade-off that F-O1 raised.


---

# Round 2: FS1

## F-S1: round 2 (discussion)
Agent model: Sonnet. Date: 2026-10-23.

I read the other eleven round-1 files in full. I used 2 searches this round to settle one fact (floating plug-in windows in browser DAWs). Facts marked as in round 1: `(search excerpt: <url>)` means I saw the URL in a search result and the summary stated the fact; I did not read the page (page fetches to every host except github.com fail in this sandbox).

## Reactions

**F-O1** — "In a browser tab, floating windows are worse than in Logic: there is no second monitor, and they fight the page scroll."
I agree, and the browser-DAW evidence points the same way: every product where I found a panel position docks it. Amped Studio's VST Remote panel opens at the bottom of the screen (search excerpt: https://ampedstudio.com/blog/how-to-use-vst-plugins-inside-amped-studio/). BandLab opens effects from the selected track, at the bottom left per its help centre (round 1, search excerpt: https://help.bandlab.com/hc/en-us/articles/115002945473-Adding-Effects). This changes my view in one respect: in round 1 I listed Audiotool's free desktop as "would not fit" only because of cables. It also fails on F-O1's ground, because a free desktop is the one browser layout where devices can overlap, and I found nothing on how Audiotool handles that.

**F-O2** — "Custom elements do work without a build step (recalled), but they add little over a plain `build()` function here."
I withdraw the claim in my round-1 "What Havantechno could borrow" that each face should be a custom element. F-O2's `Faces.build(dev, host)` registry does the same job for Havantechno's own faces and keeps `faces*.js` loadable in the self-check vm. What I keep from round 1 is the narrower point: a face is a unit with a stable id, an audio side and a GUI side that a host mounts. That is the WAM contract (a plugin's GUI is a web component; search excerpt: https://aes2.org/publications/elibrary-page/?id=23110). So the registry should allow one entry type, a "foreign face", whose `el` is supplied by someone else and is drawn inside a neutral frame. It costs almost nothing now and keeps WAM possible later.

**F-S2** — "Only the selected track's faces are fully rendered, which is also the performance lever from F6."
This is the same choice every browser DAW I found makes: one selected-track chain or panel, not 13 open at once. Amped Studio, BandLab and Soundtrap all work this way as far as the excerpts show (not exhaustive; layout detail was often "not found"). F-S2's "Strips over a Device Row" is therefore the safest base. One point it changes for me: F-S2's light-DOM decision is right for Havantechno's faces, but a WAM GUI would bring its own shadow DOM and its own look (F-S2 itself found a WAM example that reuses sprite-image knobs), so a foreign face will not follow `--fam-ink`. Show it in the neutral utility family and say so in the UI.

**F-S3** — "That decision display is new ground."
I agree, and I would go further: I found no browser DAW that shows a source stem next to the MIDI recreated from it. The nearest item is Soundation's drag-and-drop audio-to-MIDI conversion (search excerpt: https://soundation.rockpaperscissors.biz/artist/19187/press_clips/29516/white). So F-S3's Arrange screen has no browser precedent to copy and no known failure to avoid. It changes my view of risk: the Source group must degrade to one thin placeholder lane when there are no stems, or the screen is an empty frame today.

**F-S4** — "I recommend shipping flat and plate only at first, and adding skin per device only when a device earns it."
Agreed. The browser-DAW lesson is the negative case: a press clipping calls Soundation's effects basic, with "very rudimentary controls, often only one or two dials" (search excerpt: https://soundation.rockpaperscissors.biz/artist/19187/press_clips/29516/white), and BandLab gates "One Knob" effects behind a Membership (search excerpt: https://help.bandlab.com/hc/en-us/articles/115002945473-Adding-Effects). Both read as devices without identity. F-S4's hero graph per device is a stronger answer than a colour or a skin, and it is cheap in SVG.

## Answers

**To F-O1, question 5** ("does any browser DAW use floating plug-in windows inside the page? How do they handle overlap on a laptop screen?"): not found.
- A search aimed at Amped Studio plug-in windows returned no statement that they float or can be dragged out. It did say the VST Remote device panel opens at the bottom of the screen, and that a Super Preset can be unfolded to show and edit its full device chain, so no separate plug-in window is needed (search excerpt: https://ampedstudio.com/blog/how-to-use-vst-plugins-inside-amped-studio/ and https://www.ampedstudio.com/blog/studio-redesign/; the summary did not say which page held which sentence).
- Soundtrap: an Effects Rack where effects are added, removed and reordered by drag, each with an on button and a dry/wet mix (search excerpt: https://blog.soundtrap.com/how-to-make-music-in-soundtrap/). No window behaviour found.
- BandLab: effects chain on the selected track, bypass toggle, drag to reorder, 10-effect cap (round 1). Where the panel sits differs by source, left or right (round 1).
- openDAW: reviewers describe a familiar timeline plus device panel (round 1, search excerpt: https://bedroomproducersblog.com/2026/08/22/opendaw-review/). Overlap handling: not found.
- Audiotool: the free desktop is the one layout where overlap could occur; how it is handled: not found.
So the honest answer is that I found docked panels in every case where a position was stated, and no evidence about overlap handling anywhere.

**To F-O2, question 1 and F-S2, question 1** (one chain at a time, or many faces open): the browser-DAW evidence leans to one selected-track chain, as above. It is thin: it covers where the panel sits, not how many are open.

**To F-O2, question 4** (a small permissively licensed knob library): not my area. One licence fact from my topic: openDAW is AGPL v3 or later (verified: https://github.com/f15u/opendaw), so its device code cannot be copied into a non-AGPL repo. Its device names and list are fine as a vocabulary reference.

## One disagreement

**F-H1**, "A browser on the left that lists the 13 synths and 10 processors with Live 12's approach" (its borrowing item 3).

I disagree with a permanent left browser column for Havantechno.
- Havantechno's device set is fixed and small: 13 synths and 10 processors, of which only a few are inserts a user can choose. Live's browser exists because the library is large and grows. F-H1 itself lists "Havantechno has no content library to browse" under "would not fit" for Packs and Cloud, which is the same reason.
- The browser DAWs I found add a device from the place it will sit. BandLab uses a "+Fx" control under the track name or Add Effect in the Effects panel (round 1, search excerpt: https://help.bandlab.com/hc/en-us/articles/115002945473-Adding-Effects), and Soundtrap adds effects in its Effects Rack (search excerpt: https://blog.soundtrap.com/how-to-make-music-in-soundtrap/). Neither needs a browsing column.
- A left column costs width on a laptop. F-O1 and F-H5 both need that width for the 200-bar ruler and the track strips; F-H5 notes that a ruler at phone width gives about 1.8 px per bar.
Where I agree with F-H1: a browser becomes worth its width when stems and MIDI clips exist, because then there is a library of imported items. Build it then, as a drawer.

## My suggestion

**Chain Bench** (a refinement of F-S2's "Strips over a Device Row", with parts of F-O1's Concept A, "Bench")

One window and no floating windows. At the top, the transport and a proportional section ruler (F-H5). Under it, the track list as compact strips: a family-coloured rail, name, M and S, level and the 16-step row, with one strip selected. At the bottom sits one chain strip for the selected track, signal left to right: instrument face, then its inserts, then the channel (pan, sends, duck). Each device is a self-contained face drawn from the registry (F-O2) with a generic slider face as fallback (F-S2 and F-H2). Each face has a header with a bypass toggle; a double-click on the header folds it. An "+ insert" menu at the end of the chain adds from the processors that exist, with a chain cap, as BandLab does. A second tab of the same strip shows sends and master. Above the track list there is one thin Source lane that stays a placeholder until stems exist (F-S3). A registry entry may be a foreign face, a WAM GUI mounted in a neutral frame, so WAM plug-ins can come later without a layout change.

- Borrows from Ableton Live: the Device View chain at the bottom, left to right, driven by selection; folding a device by its title bar; the ruler and locator-style section markers (F-H1, F-H5).
- Borrows from Logic Pro: the always-visible channel strip per track with level, M and S; the generic Controls view as the fallback face for every device (F-H2); Smart Controls-style macros later as a folded-device state.
- Borrows from browser DAWs: BandLab's selected-track chain with bypass, drag to reorder and a cap; Amped Studio's bottom device panel and its Super Preset that unfolds into its full chain (a way to show a macro over a chain); the WAM split of an audio side and a GUI side.
- New: the foreign-face slot in the registry, the folding Source placeholder lane, and the insert menu that lists only what the engine has. All three are small and layout-neutral.

```
+----------------------------------------------------------------------+
| > []  126 BPM  swing .06 | bar 42  mainA | [A/B later]   | meter  WAV |
+----------------------------------------------------------------------+
| intro |i2|build |   mainA   |  mainA2   | break |bE|   mainB  |outro |
+----------------------------------------------------------------------+
| SOURCE  (thin placeholder lane; stem lanes when they exist)           |
+----------------------------------------------------------------------+
|#kick   M S lvl  X..x X..x X..x X..x                                  |
|#sub    M S lvl  x... .... x... ....                                  |
|#bass   M S lvl  .x.x .x.x .x.x .x.x    <- selected                  |
|  ... 10 more compact strips ...                                      |
+----------------------------------------------------------------------+
| CHAIN: bass   [chain] [sends / master]                                |
| [BASS face]--> [EQ3 face]--> [+ insert] --> [channel: pan dly rev duck]|
|  osc|filter curve|amp          curve         menu                     |
|  header: name  bypass  fold                                          |
+----------------------------------------------------------------------+
```

Cost note: only the selected chain is fully drawn (about 3 to 5 faces), so F-O2's performance budget holds, and the shell can be built after F-O2's steps 1 and 2 (device list, registry with generic face, one draw loop).

## Open question for the vote

Should the layouts be judged as they would work for today's 13 tracks with no stems, or as they would work once the remix pipeline exists? Concepts that start from stems (F-O1's Tracing, F-S3's Source over Recreation) win on vision and lose on what can be built and used now, and I found no browser DAW to compare them against. If the group does not fix the criterion first, the vote will compare a working shell with an empty frame.

---

# Round 2: FS2

## F-S2: round 2 (discussion)
Agent model: Sonnet. Date: 2026-10-23.

Read in full: the eleven other round-1 files. Web searches used this round: 0 of 2. Facts about the repo are marked `(verified: <file>)` and were read from `studio/` this session (the folder is identical to `olde Havantechno dub studio/`).

## Reactions

**F-O2.** Quote: "A face that reads only `spec` and `params` and writes only through a setter has no audio dependency at all." and "One write path: `seq.setParam(path, v)`. One read path: `dev.obj.params`, polled."
I agree, and it changes my design in three places. (1) My round-1 knobs called `device.set()` and exposed a pushed `refresh(v)`. F-O2's coupling C2 and C4 show why that is wrong: the page has two write paths, and sliders never follow ramps. I now say: controls write through `host.setParam(dev.path + '.' + key, v)` and are read by a polled `sync()` inside one `requestAnimationFrame` loop. (2) I proposed a data-only `FaceDefs` object. F-O2's `Faces.define(type, {...})` registry with `placed()` and a `hide` list is better, because the same call carries the data and the coverage check can ask "is every spec key placed or hidden". I drop `FaceDefs` and adopt that shape; the face data files stay free of `document` at load time so `selfcheck.js` can load them. (3) My control count was low. I counted about 193 controls and left out the sidechain; F-O2 counts 141 live controls plus 91 for channel and sidechain, about 232 (verified count of 137 params across 23 types: matches my own dump, 91 synth + 46 processor params). My node estimate of about 1,700 should therefore be read as about 2,000; the conclusion (render only the selected chain) is unchanged.

**F-S4.** Quote: "State is carried by fill, never by family hue. A control that is on, armed, soloed or playing is a filled shape; an identity element is an outline or a stroke."
This maps onto the knob without any new widget. The knob's value arc is a stroke in `var(--fam-ink)` (identity); on, bypass and held are drawn by a `data-state` attribute on the control root and styled in CSS as fills, hatches or hollow shapes (F-S5's "hollow with an amber marker"). One caution from my own knob design: I drive the value arc with `stroke-dasharray` and `stroke-dashoffset` (`pathLength="1"`, recalled, unverified), so a dashed "bypassed" look cannot also use `stroke-dasharray` on that same arc. Bypass on a knob should be a second element or an opacity change; the dashed treatment F-S4 wants is for the hero graph, where it is free. F-S4's 24 px minimum target is also fine: the SVG is drawn about 36 px, the hit area is padding.

**F-S5.** Quote: "A cheap first step is to keep the inputs and add dblclick, a Shift-slows-drag handler and a value tooltip, then replace them face by face."
Agreed, and my architecture is built to allow exactly this: the hidden native `<input type=range min=0 max=1>` stays under the SVG, so keyboard, touch and screen-reader behaviour come from the browser while the look is replaced one face at a time. F-S5's rule sets need three things from the widget, and I will build them in from the start so no later rewrite is needed: (a) a `state` of inherited, set, ramp or held on every control; (b) a faint ramp arc behind the knob from `from` to `to` for the current section; (c) double-click, double-tap and Delete resetting to `spec.value`. Resetting to the factory value is free because `Synths.create` and `Processors.create` deep-copy the spec, so `spec[k].value` is never overwritten (verified: `studio/synths.js` lines 479-485, `studio/processors.js` `copySpec`). The "held" set that stops ramps overwriting a drag is an engine change, not a widget one, and I agree with F-S5 that F-O2 must cost it.

**F-H4.** Quote: "Pure-JS curves avoid that." (on needing a stub in the fake AudioContext for `getFrequencyResponse` or `reduction`.)
Agreed. Of F-H4's ten hero displays, seven are pure functions of `params` (filter, saturator, delay taps, reverb tail, eq3, widener width, chorus) and can run in Node for the self-check. The compressor and limiter gain-reduction meters and the sidechain trace need a live read; the widener correlation display needs an analyser. I would build the seven first, and add the live three through the taps F-O2 describes. F-H4's closing question (are live reads allowed?) gets a yes from me, with that order.

**F-S3.** Quote: "The current 4-column card grid maps onto the Recreation rows with little change: each card already has a name, M and S, and a step row."
True for the data, and it sets the build order I would use: the Recreation group is the existing `buildTracks()` output made compact, so it can ship before any stem exists, and the Source group is an empty lane that appears when stems do. I would not draw waveforms from raw samples; F-S3's min/max peaks per pixel and F-O2's 16.8M-sample figure agree.

## Answers

**To F-O2 (question 4): "do you know a permissively licensed knob or meter library small enough to vendor as one file?"** No. I checked: webaudio-controls is Apache-2.0 but uses raster, stitched-image skins and its page does not say whether it is maintained (verified: https://github.com/ryoyakawai/webaudio-controls); Google Chrome Labs input-knob is Apache-2.0 but archived on 2023-09-27 and rotates a single element, with no value arc (verified: https://github.com/GoogleChromeLabs/input-knob); NexusUI is canvas and its licence is only claimed in old docs (search excerpt: https://www.synthtopia.com/content/2014/07/16/free-nexusui-turns-your-web-browser-into-a-music-controller/); the precision-inputs page returned 403 and I could not check it. I found no GPL candidate, which is "not found", not "none". So hand-write it. My estimate for the four widgets (knob, slider, select, toggle) with pointer, keyboard and ARIA is about 150 lines of ES5 plus one CSS file, inside F-O2's 2 to 3 days (my estimate, not measured).

**To F-S4 (question 4): can the knob take `var(--fam-ink)` and a 24 px minimum target?** Yes to both. The knob reads `var(--face-ink, var(--fam-ink, var(--acc)))` for arc and pointer, so a face can override the family; nothing in the widget names a colour. I will use F-S4's attribute names, `data-fam` and `--track`, so no translation layer is needed. The hit target is the SVG box plus padding.

**To F-S1 (question 3): should the face contract be written now so a WAM host could slot in later?** Do not design for WAM now; keep one cheap seam. A face takes a plain record `{id, type, path, spec, params}` and a host `{setParam, getParam}` (F-O2's shape), and has a `draw(root, device)` escape hatch. A WAM plugin's GUI is a web component (search excerpt: https://faustdoc.grame.fr/manual/deploying), so a WAM device could later present the same record and have its own element mounted in `draw()`. F-S1 and I both have not read the WAM 2.0 API, so I claim nothing about its exact interface. Licence of the WAM-Studio repository: not found.

**To F-H4 (question 1) and F-O2 (taps):** see the F-H4 reaction above. Live reads: yes, in the order stated, created by the UI only for the selected chain.

## One disagreement

**F-O2's coupling C9 and migration step 1: "Compressor and limiter gain reduction is not reachable. The `DynamicsCompressorNode` is a local `c` inside `BUILD.compressor/limiter.build`."**
This is not what the code does. Both builds set `p.node = c` (verified: `studio/processors.js` lines 212 and 227), and the sidechain sets `p.node = g` (line 242). F-H4 read these lines correctly and cites them. So a gain-reduction meter can read `p.node.reduction` today; step 1's new `p.reduction()` accessor in `processors.js` is not needed to make the meter possible. Consequences for the plan: step 1 gets smaller (the engine files `sequencer.js` and `core.js` still need `seq.devices()` and `choices`, but `processors.js` need not change for metering), and the fake context needs no new method unless engine code calls it, since the UI guards `p.node && p.node.reduction`. F-O2's wider point stands in one respect: the reduction value is a plain number in current browsers but was an AudioParam in older ones (F-H4, search excerpt: https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode.reduction), so a tiny read helper is still worth having, in the UI file, not in the engine.

## My suggestion

**Name: Matrix Bench.**

One window with four bands. At the top, the transport and a section ruler whose blocks are as wide as their bar counts (F-H5's flex-grow idea, 200 bars). Below it, the "matrix": one lane per track, 13 lanes, each with a compact header (name, M/S, two mini knobs for level and pan, a 16-dot step row) and a body of nine section cells showing which variation plays and where a ramp runs; this is read from `seq.sections[].play` and `.ramp`, so it exists today (F-O2 estimates 3 to 4 days, read-only). Selecting a lane fills the bottom band, the Device Row: the selected track's chain left to right, as Ableton lays it out, starting with a PATTERN face (the 16-step editor, with the variant chips) where Live puts MIDI devices before the instrument, then the synth face, then the inserts, then the channel face (duck, sends). At the right end, pinned and always visible, a RETURN and MASTER block shows the two sends and the master chain as chips that open as faces. Every face is one `Faces.define` entry rendered by one renderer at three densities (chip, strip, faceplate), so folded devices are chips and the whole thing costs only the selected chain in the DOM, about 3 to 5 faces and 15 to 40 knobs. A/B and a Source lane per track are reserved for the remix stage: the Source lane opens under a track when stems exist, and the A/B switch goes in the transport (F-S3).

- **Borrows from Ableton Live:** the bottom Device View showing the selected track's chain in signal order, fold to a chip, one window with no pop-ups, the section ruler and overview idea.
- **Borrows from Logic Pro:** the Inspector's pairing of the selected strip with its output strip (the pinned RETURN and MASTER block), the pattern as an editor opened from the selection (Step Sequencer), the marker track as the section ruler.
- **New:** one face definition drawn at three densities; the pattern as the first device in the chain; the matrix lanes as the home for stems later.

```
+----------------------------------------------------------------------------------+
| > []  126 BPM  swing .06 | bar 42.3 mainA | [A/B reserved] | meter | export WAV    |
+----------------------------------------------------------------------------------+
| ruler 1 |intro16|i2 8|build16|  mainA 32  |  mainA2 32  | break 24 |bE|  mainB 48  |out|
+--------------------+-------------------------------------------------------------+
| kick  M S o o ..:. | A    A    A     A          A           A     A    A      A   |
| bass  M S o o x.x. | A    A    A     A          B           C     ~~ramp~~   B   |
| lead  M S o o ...  |      B    B     A          A           B     ...            |
| (13 lanes, 26 px)  |   (cells = variant letter, ramps as lines, playhead on top) |
+--------------------+-------------------------------------------------------------+
| DEVICE ROW  bass:  [PATTERN]->[BASS synth]->[EQ3 insert]->[CHANNEL] || RETURN+MASTER|
|  x..x..x. A B C    wave detune   low mid high   level pan   duck     || dly rev     |
|  16 steps          cutoff env res  [EQ curve]   dly rev     [duck]    || eq hp lp     |
|  [filter curve]    attack decay                                       || glue sat lim |
+----------------------------------------------------------------------------------+
```

## Open question for the vote

Is "only the selected track's chain is fully drawn, the other 12 tracks stay compact" acceptable? Five of the proposals on the table (F-O1's Bench, F-O2's concept A, F-S1's selected-track rack, F-S3's Source over Recreation, and this one) depend on it, and only a console of open faces (F-O1's B) does not; F-O2 and F-H1 asked the same thing. The group should settle that first, because it decides the performance budget and whether every face needs a compact variant, before anyone compares the shells.

---

# Round 2: FS3

## F-S3: round 2 (discussion)
Agent model: Sonnet. Date: 2026-10-23.

I read all eleven other round-1 files in full. No web searches this round; every claim below is either from my own round-1 file (`round1-FS3-remix-ia.md`), from another agent's file (cited by id), or from `studio/song.js` and `studio/sequencer.js` as quoted in those files. Web facts keep the marks they have in the file I cite.

## Reactions

**F-O1, Concept C "Tracing".** Quote: "It is the only concept built around the job D2 and D3 describe, which is matching." I agree that matching is the job, and Concept C's left column (recreation tracks grouped under the stem they recreate, "one drum stem holds kick, clap, the hats, shaker and perc") is the same many-to-one map I proposed in my Plan table. It changes two things in my view. First, my Compare tab should show a difference strip under the aligned waveforms, as Concept C does, instead of a text list only. Second, I now think my one-time Import and Plan screens should stay one-time and not become a permanent five-step stepper, because F-O1 names "the stepper risks becoming five separate apps" as Concept C's own risk. I do not agree that the match should be the home screen: F-O1 itself says Concept C is "an empty frame around today's 13 tracks" until the pipeline exists.

**F-O2, cost ranking and build order.** Quote: "Ranking by cost: A < B < C. Concept C's UI can sit on top of A or B later as one more view, because the face layer does not care which shell holds it." I agree, and it answers the worry in my "What would not fit": my layout should not be a fourth shell. It is Concept A (Bench) plus a Source group, built after F-O2's steps 1 and 2 (device list, face registry, one UI loop). F-O2's estimates for the stem parts (waveform overviews 3 to 4 days, A/B on one clock 2 to 3 days, step grid or roll writing back 4 to 6 days, import UI 2 to 3 days; all F-O2's rough estimates, plus or minus 50%) also tell me what to stage first: the Source group and A/B need no write path. F-O2 also reports that the fake context "has `createBufferSource` but no `decodeAudioData`", which answers the stub question I left open in my build notes.

**F-S5, notation limits.** Quote: "audio-to-MIDI output from stems will not [fit the monophonic, 8-or-16-token notation]". This corrects a rule in my round 1. I wrote that pitched tracks default to the piano roll and that a track may use the grid when its notes snap to 16ths. F-S5 shows the track kinds are finer than that: `drum`, `note` (fixed pitch, for sub and bass), `chord` (pitch from the section progression, for stab and pad) and `melody` (only lead). So the view follows the track kind first. Drum and `note` tracks get the step grid, with a pitch field for `note` tracks (a transcribed bass stem at steps 3, 7, 10, 14 becomes a pattern plus `note: B2`, per S5's table). Only lead gets the compact roll. Chord tracks get the grid for rhythm and a progression strip for pitch, so a transcribed stab stem's notes become chord names in the section progression, not notes in a roll. Transcribed notes that fit none of these live in a separate read-only layer (see Answers).

**F-H2, Live Loops rule.** Quote: "On any one track, either the grid cells or the Tracks area regions play. Cells take priority." This is the precedent my A/B was missing. It changes my A/B from one global switch to a per-track state (source, recreation, both) with a global default in the transport. Logic's rule is a hard either-or per track; the remix case also needs "both" for the difference listen, so I keep a third state.

**F-S4, colour for lanes.** Quote: "a track's colour is its instrument's family hue at the muted level." This gives the stem-to-track bracket a free colour code. The drums stem lane takes the drums hue (orange), the bass stem the bass hue (violet), and the other stem the keys hue (sky blue), the same hues as the tracks they feed (kick, clap, hats, shaker, perc; sub and bass; stab, lead, pad per F-S4's family table). Vocals and the original mix lane stay neutral. I had not thought of this in round 1.

**F-H5, ruler and overview.** Quote: "A thin full-song bar above the arrangement, with the visible window marked, would do this in CSS." I adopt the Overview strip and the flex-grow section blocks (one block per section, width set by bar count) for my ruler, and I add F-H5's FX-hit row (riser and impact marks from `fx`) as a thin row in the ruler band (not drawn in the wireframe, which is capped at 20 lines) because those events are not in any stem lane and the user needs to see where they sit against the source.

## Answers

**To F-O1, question 3** ("how do Ableton 12.3 and Logic show a separated stem next to the original? Do either show source and derived MIDI together in one lane?"). From my round 1, all search excerpts, none fetched. Ableton: "Separate Stems to New Audio Tracks" puts Vocals, Drums, Bass and Others each on its own track inside a new Group Track, copies the source track's audio effects onto the Group Track, and mutes the source clip (search excerpt: https://www.ableton.com/en/stem-separation-in-ableton-live/). Logic: Processing > Stem Splitter creates a summing stack below the track whose subtracks hold the stems, and mutes the original (search excerpt: https://support.apple.com/en-is/guide/logicpro/lgcp61bae908/mac). In neither case did I find source audio and derived MIDI drawn together in one lane. Audio-to-MIDI in both lands on a new track with a default instrument, with no visible link back to the audio (Ableton: https://www.ableton.com/en/live-manual/12/converting-audio-to-midi/; Logic: https://support.apple.com/ar-qa/guide/logicpro/lgcpe2fd1b83/mac, both search excerpts). The one tool I found that draws notes on the audio itself is RipX, where pitched sounds are editable "note blobs" on a piano roll and there is no separate MIDI track type (search excerpt: https://music.loop.fans/ai/ripx-ai-daw-review-surgical-audio-editing-with-ai-stem-separation; a promotional source). So source and derived notes in one lane is not found in either reference DAW. It would be new here.

**To F-O2, question 5** ("does the remix view need a writable pattern model (save and load) in round one, or is a read-only lane view enough at first?"). Read-only is enough for round one, in this order. Stage 1 needs no write path: load stem WAVs from a file picker, draw them as lanes on the section ruler, and A/B them against the existing recreation (F-O2's own estimate for these is about 5 to 7 days). Stage 2 adds the step grid writing back into the pattern strings, using F-S5's rules (copy-on-write for shared variants), session-only because F-O2 notes there is no serialisation back to `Song` data yet. Stage 3 adds the second note format and import. I would add one small thing to stage 2: an "export song data" button that downloads the edited patterns as JSON, since browser-only state is lost when site data is cleared (a warning F-S1 found for openDAW).

**To F-S5, question 1** (extend the notation, or keep strings for authored parts and add a second "MIDI clip" format for extracted stems?). Keep the strings for authored parts and add a second format, a note list `{start in 16ths or finer, len, midi, vel}`, for transcribed stems. Reasons: extending the string notation to hold several notes per step, velocity values and free start times would break the readable pattern strings that F-S5 wants to round-trip, and F-S5 itself cites Logic's pattern-to-MIDI exit route as the model. The note list is a read-only ghost layer in the Notes tab at first (outlined notes the current pattern misses, struck notes it has extra). "Snap to pattern" is the action that converts a ghost layer into pattern strings: quantise to 16ths, map velocity to the three levels `o`, `x`, `X`, and keep the original list so the pipeline stays re-runnable.

**To F-H1, question 2** (which view opens first, the grid per section or the 200-bar timeline?). After import, the Arrange screen with the section ruler, because the remix needs the stems and the recreation on one shared time axis. The per-track step grid opens from it (Notes tab).

**To F-S1, question 2** (is "selected-track chain at the bottom, one instrument face plus its inserts" acceptable?). For the remix job, yes, provided the Recreation lanes stay visible above it so the overview is not lost; my Chain tab is that strip. F-S2 reaches the same conclusion on performance grounds.

## One disagreement

I disagree with F-O1's Concept C putting a per-stem match score in the stem list ("drums 78% *", "bass 82% <") as the main status of every stem. Reasons, with evidence:

- No one has a way to compute it yet. F-O1 says so ("it is not built, and how to compute it is a question for Gear Crew"), and S5 found no tool that estimates synth parameters or scores a recreation against a stem. My round 1 reached the same point and left the number out ("Do not design the chip around a number").
- The reference signal is itself approximate. S5 reports that stems carry the separator's artefacts and that separation scores (SDR) "predict timing fidelity but not transient or dynamic fidelity" (verified: https://arxiv.org/html/2609.04224, search text, as quoted in S5). This project cares most about the kick transient and hat tone, so one percentage would look precise exactly where it is least reliable.
- A single number also hides what to do next. Measurable, actionable differences are available without a model: onsets matched, missed and extra (stem onsets against pattern steps), and the level offset in dB per band. Those can sit in the Compare tab, and F-O1's own difference strip ("+3dB 300-1k") is already the better half of Concept C's idea.

I would keep Concept C's grouping of tracks under stems and its difference strip, and drop the percentage until Gear Crew names a method.

## My suggestion

**Name: Bench with a Stem Group.**

One paragraph. I endorse F-O1's Concept A (Bench) and F-O2's cost ranking, and change three things. First, the lanes: Concept A draws a source lane and a recreation lane for each of 13 tracks, which F-O1 itself flags as 26 lanes. The pipeline produces about four stems (S5), not 13, so I replace the 13 pairs with a collapsible Source group of one lane per stem plus the original mix, above a Recreation group of one lane per track, grouped and coloured by the stem it recreates (drums orange, bass violet, other sky blue, per F-S4's family hues). Second, the bottom panel gets three tabs driven by selection: Notes (step grid for drum, `note` and chord-rhythm tracks, compact roll for lead only, with the stem waveform above and a read-only ghost layer of transcribed notes), Chain (instrument, inserts, channel strip and sends, with a Load / Modify / Create decision card first) and Compare (stem and rendered recreation on one time axis, onset differences, level offset). Third, the A/B switch lives in the transport with a per-track override and level matching on by default. Import and Plan (the stem to track table with the Load / Modify / Create proposal) are one-time screens before the Arrange screen, not a permanent stepper. The 200 bars are handled by an Overview strip and flex-sized section blocks. Everything stays on the existing data: lanes read `seq.sections[].play`, the step grid writes the pattern strings, and F-O2's steps 1 and 2 come first.

- **Borrows from Ableton Live:** the Group Track holding the stems beside the muted source; the selected-track bottom panel with the device chain left to right (Device View); the Overview strip over a long arrangement; locators as the model for section markers.
- **Borrows from Logic Pro:** the summing stack (stems folded into one container under the source); the pattern region with the Step Sequencer as an editor, rows per kit piece; the Live Loops rule that a track plays one of two sources at a time; Smart Tempo's hints and blue/orange confidence colours for the Import screen; the Editors pane that follows the selection.
- **New:** the stem to track many-to-one bracket and colour link; the Load / Modify / Create decision chip on every recreated lane, with the Plan table as its overview; an always-visible A/B with per-track state and level match (reference-plug-in practice, not a DAW feature); the Compare tab with onset differences; the ghost layer of transcribed notes with a "snap to pattern" action.

```
+--------------------------------------------------------------------------------+
| > []  126 BPM | bar 42 mainA | A/B [SOURCE|RECREATION|BOTH] lvl-match | loop | WAV|
+--------------------------------------------------------------------------------+
| OVERVIEW [==|#####|==========================================]                  |
| ruler  |intro16|i2|build16|   mainA 32    | mainA2 32 |break 24|bE|mainB 48|out16|
+------------+-------------------------------------------------------------------+
| v SOURCE   | mix  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ |
|  drums  MS | ~|~~|~~|~~|~~|~~|~~|~~   -> kick clap hats shaker perc            |
|  bass   MS | ~~_~~_~~_~~_~~_~~_~~      -> sub bass                              |
|  other  MS | ~~~~~~~~~~~~~~~~~~~~      -> stab lead pad                         |
+------------+-------------------------------------------------------------------+
| v RECREATION (grouped by stem, rail colour = family)                           |
|  kick  LOAD   MS |A    |A  |A    |A            |A        |A    |A  ..  [A|B|AB] |
|  bass  MODIFY MS |A    |A  |A    |A            |B        |C    |C  ..           |
|  lead  CREATE MS |     |   |     |             |B        |A    |A  ..           |
+------------+-------------------------------------------------------------------+
| [Notes] [Chain] [Compare]       selected: bass      (selection drives the panel)|
| Chain: [MODIFY: 6 params differ] -> [bass face] -> [eq face] -> [channel] -> sends|
| Notes: grid + pitch field | stem waveform above | ghost = transcribed, unmatched |
+--------------------------------------------------------------------------------+
```

## Open question for the vote

Before voting, the group should settle whether the stem part (Source group, per-track A/B, Compare tab) is **in scope for the first build** or only a reserved slot in the shell. If it is reserved, the real contest is between shells (A, B, F-S2's "Strips over a Device Row", F-H5's "Console Strip") and the stem group is added to the winner later, as F-O2 suggests. If it is in scope, the vote has to weigh how much each shell leaves room for a Source group and a three-tab bottom panel, and Concept C and my suggestion become the candidates to beat. Without that decision, the ballots will compare layouts that were each designed for a different amount of pipeline.

---

# Round 2: FS4

## F-S4: round 2 (discussion)
Agent model: Sonnet. Date: 2026-10-23.

I read all eleven other round-1 files in full. Web searches this round: none. Two small computations of my own (contrast ratios against the panel colour `#15151e`, same script style as round 1) are marked "computed". The two files I cite for the page and the engine (F-O2, F-S2) read the repo; I did not re-read the repo this round.

## Reactions

**F-O1** — "Distinctness comes from layout, colour and a display, never from different interaction rules."
I agree, and it changes my round-1 weighting. In round 1 I offered a three-tier material ladder (flat, plate, skin) as if the skin tier were a live option. After reading F-O1 and F-H4 ("Havantechno's compressor has one algorithm ... There is no circuit selector to skin"), I demote it: the skin tier stays in the token system as a switch (`data-skin`) but nothing in the first build uses it. Identity comes from family hue, glyph and the hero display, in that order. F-O1's own six-family list (drums, bass/tonal, atmosphere, dynamics, space, tone) is close to my eight; the difference is that I split sweeps-and-hits (riser, impact) from drums and keep the one utility device (widener) neutral.

**F-H3** — "Per-instrument colours with no family rule. Thirteen unrelated colours would not read as one system (F-S4's concern)."
Agreed on the rule. But F-H3's own palette (drums amber, bass teal, stab rose, pad violet, lead lime, fx red) gives the keys family three hues, and red fx sits on the arm/record red while lime sits on the green "on" state. I keep one hue per family and let stab, pad and lead differ by glyph and hero graph, which F-H3 already specifies well (stab: stereo field; pad: slow swell; lead: glide arrow). I also adopt two of F-H3's graphs over my own guesses in the round-1 table: sub gets an envelope graph (attack, decay, glide) instead of a bare sine, and shaker a bandpass bell with attack/decay. perc keeps its pitch line plus noise tick.

**F-H4** — "Widener note: a live correlation or vectorscope display cannot be built from `width` alone."
Agreed, and it corrects round 1, where I wrote "or a goniometer if cheap". The widener's face is the static width diagram unless the group allows live reads. F-H4's per-processor table matches my hero-graph column for all ten processors (filter curve, saturator transfer curve, delay taps, reverb tail, EQ nodes, compressor transfer curve plus meter, limiter ceiling, sidechain duck envelope, chorus LFO), which is a reassuring convergence: two agents working from different starting points drew the same ten pictures. That makes the hero graph the safest part of the proposal.

**F-S5** — "a held control turns hollow with an amber marker, and a control-bar button 'Re-enable arranged values' clears all holds."
This collides with my palette. My fx family (riser, impact) is gold at hue 90, so an amber "held" marker would read as "this is an fx device" on those two faces, and my own rule says state is never carried by a family hue. So the held, set and ramp markers should be shapes in neutral ink: held is a hollow ring, set is a filled dot, ramp is an arc behind the knob, none is no mark. That follows F-S5's own logic (the dot tells who owns the value) and keeps it legible in greyscale. If the group still wants a colour, it must come from the reserved state tokens (`--on`, `--arm`, `--solo`), not from a family.

**F-S3** — "colour the waveform by whether the lane is audible and grey it when muted" (the Serato idea), and "The decision chip is a `<button>` with a text label, not colour alone."
Both fit my rules. It changes my track-colour section in one way: source lanes and recreation lanes need a visible difference even though they share a track. My rule is that the Source group draws in a desaturated version of the track rail colour (about a third of the chroma) and the Recreation lane draws the step cells in the family ink at full strength, so A/B reads as "grey-ish original, coloured recreation", and a muted lane goes neutral in both. The LOAD / MODIFY / CREATE chip stays neutral outline with text, as F-S3 wants.

## Answers

**F-O1, question 2** ("should 'own look' mean Ableton-flat with a family colour and a signature display, or Logic-style 'hardware' plates?"). The first. Flat chassis, one family hue as line and ink, one signature display per device. My evidence is cost and meaning: Logic's skins carry a meaning (the Compressor's circuit types name specific hardware, per the Apple and MusicTech excerpts in my round 1), and Havantechno's devices have no such models; F-H4 confirms the compressor has one algorithm. A plate (a faint top highlight and inner edge, pure CSS) is allowed as a "this is the selected device" cue, not as identity.

**F-O2, question 6** ("how many families? I assumed about 5 templates"). Separate two numbers. Colour families: eight (drums, fx, time, keys, tone, bass, dynamics, utility); each costs one three-line CSS block and nothing else, so it does not scale the face cost. Layout templates are what cost days, and I would count seven: drum strike (6 devices), voice (sub, bass, lead, stab, pad: five devices, one template with per-device rows), sweep-and-hit (riser, impact), curve processor (filter, eq3, saturator), time processor (delay, reverb, chorus), dynamics (compressor, limiter, sidechain), and a trivial one for widener that can be the generic face. So F-O2's "about 5" is close; the colour count can be eight without adding to it. Colour families and templates should be two separate fields in the face data.

**F-S2, question 2** ("can the visual system be expressed as a family (hue, radius, density, background) plus per-device section layout, so it is a stylesheet and a `FaceDefs` change and not code per device?"). Yes, with one correction (see the disagreement): the face definition names a `family`, never a hue. All eight family blocks (`--fam-ink`, `--fam-dim`, `--fam-wash`) are in the CSS token block in my round 1, Findings F, item 10. Radius, density (chip, strip, faceplate) and ground (`--fam-wash` under the header only) hang off the same attribute.

**F-H4, question 1** (live reads from audio nodes on faces). The group decides the audio question; I can say the visual rule that works either way. Static curves (computed from params) draw in `--fam-ink`; any live overlay (a gain-reduction needle, the sidechain trace, a future EQ analyser) draws in a thin `--fg` line on top. That is Logic's Channel EQ pattern F-H4 describes (live curve over static curve on the same scale), and it means a face looks right with the live layer simply absent.

**F-S3, question 4** (is the Source group allowed to push Recreation below the fold?). From the visual side: collapse it. A collapsed Source group is one 28 px lane in neutral grey; expanding it is a choice, not the default. See my layout below.

## One disagreement

**F-S2's theming snippet.** F-S2 proposes `.face { --face-hue: 200; --face-acc: hsl(var(--face-hue) 80% 62%); ... }`, with "the renderer sets ... an inline `--face-hue` from the face definition", and the sample `FaceDefs.bass = { family: 'mono-synth', hue: 28, ... }`.

I disagree for two reasons.

1. HSL at a fixed saturation and lightness does not give equal visibility across hues. For the hues in my family table at `hsl(h 80% 62%)` against the current panel (computed): drums 45 gives 10.9:1, fx 90 gives 12.6:1, time 190 gives 10.2:1, keys 235 gives 3.6:1, tone 270 gives 4.2:1, bass 300 gives 6.0:1, dynamics 335 gives 5.3:1; hue 240 is 3.2:1. So the blue-violet families would be barely above the 3:1 non-text floor (WCAG 1.4.11, search excerpt in my round 1) and below 4.5:1 for any small text, while yellow-green would glare. The OKLCH values in my round 1 hold every family at 8.6 to 9.5:1 (computed), which is the reason I generated hex from OKLCH and froze it as constants. A one-line `hsl()` formula in the stylesheet undoes that.
2. A per-face `hue` number invites 23 different hues. F-S2's own `bass` example already gives a mono-synth family its own hue (28). F-H3's per-instrument palette shows the same drift. With a `family` name and a fixed table, nothing a face author does can break the palette.

F-S2's mechanism (CSS custom properties set per face, controls reading `var(--face-acc, var(--acc))`) is right and I keep it. The fix is small: the face names `family`, the stylesheet maps family to the three fixed colours, and `--face-acc` is simply `var(--fam-ink)`.

## My suggestion

**Name: Family Bench.**

It is F-O1's Concept A (Bench), with the selected-track chain strip from F-S2 and F-S1, the Source-over-Recreation lanes and A/B switch from F-S3, and the overview strip and proportional section ruler from F-H5, given the visual system from my round 1. The window is one page: a transport bar, a section ruler with one collapsed source lane, 13 compact track lanes, and a bottom chain strip for the selected track. Every device is a module with a family ribbon, a glyph and a hero display. The new part is what the visual system adds to the overview: each lane header carries small **glyph chips** for that track's devices (instrument plus inserts), drawn in family ink, so all 13 tracks show what they are made of at once, while only the selected track's modules are drawn at full size. A 4 px **track rail** at the left of each lane (default: the track's family hue at a muted level, user-overridable) is the only coloured thing in the lane list. Sends, master and the channel strip are neutral, so tracks stay the only coloured rails. The step row takes its family ink, so a kick row and a hat row differ without labels.

```
+---------------------------------------------------------------------------------+
| > []  126 | bar 42 mainA | A/B [SRC|REC] | overview [==|####|=========] | WAV   |
+---------------------------------------------------------------------------------+
| ruler  |intro 16|i2|build 16|  mainA 32  | mainA2 32 | break 24 |bE| mainB 48 |.. |
| SRC    ~~~~~~~~~~~~~~~~ (one collapsed neutral lane, expand on demand)            |
+------------------+--------------------------------------------------------------+
|#kick   [K]    M S| x...x...x...x...  |A   |A   |A     |A   |F   ...  (family ink) |
|#bass * [B][EQ]M S| ..x...x...x...    |A   |A   |A     |B   |C   ...               |
|#lead   [L]    M S| ...                                                            |
|  ...13 lanes   # = 4px track rail   [x] = glyph chips (one per device, family ink) |
+------------------+--------------------------------------------------------------+
| bass  CHAIN: instrument -> inserts -> channel -> sends           [Chain|Notes|Cmp] |
|+-BASS (violet)------+  +-EQ3 (periwinkle)---+  +-channel--+  +-sends / duck-----+ |
|| [filter curve]     |  | [3-node EQ curve]  |  | level pan |  | dly  rev  duck   | |
|| cutoff env res ... |  | low mid high       |  | (neutral) |  | (neutral)        | |
|+--------------------+  +--------------------+  +----------+  +------------------+ |
|  master and send racks: [open >]  (same module style, family ink per device)       |
+---------------------------------------------------------------------------------+
```

- **Borrows from Ableton Live:** one fixed window, no pop-ups; selection drives a bottom device strip running left to right; a flat, quiet chassis; theming as named tokens (the Live 12 theme tokens in my round 1, B5); a narrow track header that keeps only the essentials; the overview strip for the 200 bars.
- **Borrows from Logic Pro:** a face that tells you what the device is before you read the label (here a glyph and a live-style hero display, not a painted skin); the always-visible channel strip per track (level, pan, M/S), split from the device faces; Smart-Controls-style macro knobs are not part of this suggestion (F-O1 and F-H2 cover that); arrangement markers that abut and map onto the nine sections.
- **New:** glyph chips in the lane headers, so device identity is visible for all 13 tracks at the smallest scale; a fixed family palette with equal visibility per hue (OKLCH-derived constants, 8.6 to 9.5:1 against the panel, computed); a hue-free state language (rings, dots, arcs, hatch) so that held, set, ramp, mute and bypass survive greyscale and never collide with a family colour; a Source-vs-Recreation distinction by saturation (grey-ish source, coloured recreation).
- **Space check (my estimate, not measured):** transport about 40 px, ruler and sections about 48 px, collapsed source lane 28 px, 13 lanes at about 22 px is 286 px, chain strip about 240 px: roughly 640 px, leaving room on a 900 px laptop screen. F-O1's concern that 26 lanes plus the strip will not fit is answered by collapsing the Source group and keeping lanes one row high; expanded, the source lanes would push the recreation lanes off screen, which is why collapsed is the default.
- **What it costs:** F-O2 puts the Ableton-style chain layout at the cheapest of the three (base plus 7 to 10 days, rough). My additions are the glyph set (23 small SVG symbols), the token block, and the `data-fam` attribute, which are CSS and small data tables, not new code paths.

## Open question for the vote

Does the bottom panel show **one selected track's chain at a time**, or **many faces at once**? F-H1, F-S1, F-S2 and F-O2 each asked this as their main question and nobody has answered it. My suggestion assumes the first (the glyph chips exist because only one chain is drawn at full size); if the group wants many faces at once (F-O1's Console), the colour system still works, but the glyph chips become redundant and the density levels need a different scheme. The vote cannot be meaningful until this is settled.

---

# Round 2: FS5

## F-S5: interaction — round 2
Agent model: Sonnet. Date: 2026-10-23.

I read all eleven other round-1 files in full. No web searches this round. Code facts about the repo are from my own round-1 reading of `studio/sequencer.js`, `studio/song.js` and `studio/studio.js`; where I lean on another agent's code reading, I name them.

## Reactions

**F-O2** (tech lead), on C4 and the UILoop: "Sliders do not follow automation. `refreshPatterns` applies `sec.set` only to instrument params and only at section start. `ramp` ... is never shown."
This is the same gap I found from the other side (my round-1 A6 and A7). It changes one thing in my view. O2's polling `sync()` reads `dev.obj.params[k]`, and a param value cannot say who wrote it: the ramp, the section `set`, or the user's hand. So a polled face can show a ramp moving but cannot show "held by the user". The engine needs a small `seq.held` set that `ramps()` and the section `set` loop skip, and `seq.setParam` from the UI must add to it. I would put that in O2's step 1 beside `seq.devices()`. The arranged side of the display does not need polling at all: the ramp's from, to and bars are in `sec.ramp`, so the ghost arc is drawn from data and only the live needle is polled.

**F-S4** (visual system), on state: "State is carried by fill, never by family hue" and "bypass ... header underline switches ... with a hatch".
I agree, and it corrects my round-1 proposal. I said a held control gets an "amber marker". Amber sits next to drums (hue 45), `--arm` red (25) and fx gold (90) in S4's table, so a hue cue would collide with identity colours. The held state should use shape: an open ring marker plus a dashed value arc, in `--fg` ink, with no hue at all. S4's table has no row for it, so I ask for one: "held (live tweak)" in the state-rules table, next to mute and bypass.

**F-S3** (remix IA), on the Chain tab: "MODIFY: 6 params differ from stock; 'show diff' marks the changed knobs on the device face."
That is a third per-knob state (differs from the stock synth) on top of my arranged state (set or ramp in this section) and held state. Three dots per knob would be noise. I would give each its own place: the marker beside the label carries the arrangement state (nothing, filled dot for `set`, dot with a slant for `ramp`, open ring for held), and "differs from stock" is a small tick on the knob's arc at the stock value, so the user sees how far the knob is from stock without reading a symbol. Different place, different shape, no priority fight.

**F-S2** (implementation), on the control: "a visually hidden `<input type=range>` ... Drag on the SVG ... double-click or double-tap to reset ... `dblclick` is not reliably generated by touch."
I agree with the native input for keyboard and screen-reader behaviour. Two additions from my round 1: a manual double-tap timer is needed (Logic for iPad uses double-tap for reset, search excerpt in my round-1 B2), and the hidden input must not take the pointer, or its own touch drag will fight the SVG drag. Pointer events go on the SVG with `touch-action: none` on the knob only.

**F-H5** (mixer, arrangement), on the ruler: "one flex row with each section's `flex-grow` set to its bar count".
That geometry is exactly what my per-section automation display needs. A per-track lane in the same flex row can show the variant chip and any ramp line for each section with no new layout code. I adopt it in my suggestion.

## Answers

**To F-S2 (Q4): "can the knob conventions be fixed in one table?"** Yes. Proposed table, one grammar for every face on the page (sources are in my round-1 B1 to B5, all search excerpts):

| Gesture | Result | Note |
|---|---|---|
| Vertical drag | change value | about 200 px for the full range, in the 0..1 position space of `Faces.scale`, so log params drag in log space |
| Shift + drag | fine, about a tenth of the rate | Logic and Live both document Shift |
| Double-click, double-tap | go to the "home" value (see the answer to F-O2 Q3) | manual timer on touch |
| Shift + double-click, Alt-click | go to the factory default `spec.value` | Alt-click matches Logic's Option-click |
| Delete, Backspace on a focused control | home value | matches Live's Delete |
| Enter, long press | open a number field with the unit; Enter commits, Esc cancels | Logic: type a value; Live: type digits |
| Mouse wheel, arrow keys | step; Shift + arrow is fine; Page Up and Down are large steps | the Kendo mapping F-S2 found |
| Value shown | tooltip while dragging and for 800 ms after | needed because faces may hide readouts |

**To F-O2 (Q3): reset to factory default (`spec.value`) or to the song's value?** Both, with a clear order. Plain double-click goes to the "home" value: the arranged value for the current section if the parameter has one, otherwise the value the project loaded with (a snapshot of `params` taken once after `Song.build`). Shift + double-click goes to `spec.value`. Reason: in a remix DAW, "undo my tweaks" means back to the recreation, and the factory kick tune is a sound that was never in the song. Cost: one snapshot object in `studio.js`, no engine change.

**To F-O2 (Q2): channel level or instrument level?** The visible fader should be the channel gain, as today. Sections automate `kick.level` and `clap.level`, which is the instrument level (O2's C5). Do not show them as one control. Draw the section's `kick.level` change as a mark on the arrangement lane (a step in the lane line), not on the fader, so a live drag on the fader is never fought by a hidden `set`.

**To F-S3 (Q2): is the sequencer growing arbitrary-timing note events?** From the editing side I would not wait for it. The piano roll writes monophonic grid tokens (my round-1 A4), and imported off-grid MIDI is quantised to the 8th or 16th grid on import, with the original kept as a ghost layer in the roll (S3's own ghost/diff idea). A note-event path can come later behind the same editor.

**To F-H5 (question: mixer shows everything, or sends and duck stay on the faces?):** each parameter gets exactly one home. Level, pan, M and S may appear twice (strip and header) because Logic links them (H5's finding) and the page mirrors both from the same value. Sends and duck depth live in one place only. My preference is the strip, because duck depth is a per-track mix control and the sidechain face (F-H4) is the device that owns the envelope shape (attack, hold, release).

**To F-H3 (question: open a face from the card or replace the sliders?):** from the interaction side, single click selects the track, double-click on a device title folds it (Live's gesture, in F-H1), and no gesture opens a floating window. Selection drives the bottom row.

## One disagreement

**F-S3**, in "How each requested view maps": "Drum tracks default to the step grid ..., pitched tracks to the piano roll ... toggle: [Grid | Roll]", and in section F: "Pitched tracks carry `melody`".

I disagree that pitched tracks default to the roll, because the data does not say that. In `studio/song.js` only `lead` has a `melody`. `sub` and `bass` are `note` tracks (`note: 'B1'`, `note: 'B2'`) with a rhythm pattern, and `stab` and `pad` are `chords: true`, with pitch from the section progression (my round-1 A3, checked against `song.js` lines 40-66 and `sequencer.js` lines 143-155). A roll for bass would show one row, and a roll for stab would show nothing to edit. The editor should follow the track's `kind`: step row for `drum` and `note` (plus a pitch field), a progression strip for `chord`, and a roll only for `melody`. A `note` track is promoted to `melody` when imported MIDI gives it more than one pitch, which is the case the Grid | Roll toggle was meant for. Logic points the same way: its Step Sequencer holds a Melodic row, and pattern regions convert to MIDI regions only when note-level work is needed (my round-1 D1 to D3, search excerpts).

## My suggestion

**Name: Bench with Section Lanes.**

I endorse F-O1's Concept A ("Bench": timeline above, device chain below) and refine it in four ways, taking the section-matrix idea from F-S3 and F-H5. The middle band is one lane per track on a shared ruler. Each lane is a row of section cells whose width follows the bar count, and each cell shows its variant chip (A, B, C) and any ramp for that track as a thin line, so the song's real structure (`play`, `set`, `ramp`, which my round-1 A2 and A5 describe) is visible and clickable. Selecting a cell opens an editor band below the lanes: the 16-step row with variant chips and bar tabs for drums and note tracks, a progression strip for chord tracks, and a compact roll for the lead. The bottom band is the selected track's device chain, left to right, with the knob grammar above and the marker vocabulary below. The transport carries one "Re-enable arranged (n)" button that counts held controls. The source-stem group from F-S3 would slot in above the lanes later, and the Chain, Notes and Compare tabs map onto the bottom two bands.

Marker vocabulary on every knob (shape, not hue, so it works in greyscale): nothing means inherited; a filled dot means `set` at section start; a dot with a slant means a `ramp` is running here, with a ghost arc from the start value to the end value and the live needle moving along it; an open ring with a dashed arc means held by the user; a tick on the arc marks the stock value. Dragging is always a live tweak. "Write to section" in the dot's popover commits it as a `set` or `ramp`. Editing a variant used by several sections offers "duplicate as new variant" first (copy-on-write).

- **Borrows from Ableton Live:** the bottom Device View chain with one chain at a time and fold-on-double-click; the Re-Enable Automation idea for overridden controls; Draw Mode painting on the step row; the Overview strip over a long timeline.
- **Borrows from Logic Pro:** the Step Sequencer as a row-based pattern editor with vertical drag per step; the Piano Roll's edge-drag for length; pattern region converts to MIDI region when note-level editing is needed; markers abutting as sections; Touch and Latch as the two meanings of "I changed it" (here, tweak versus Write to section).
- **New:** variant chips with "used in N sections" and copy-on-write; the section cell as the editable unit; a held-versus-arranged state with a shape-only marker set; the ghost ramp arc on the knob; one grammar table for all faces.

```
+------------------------------------------------------------------------------+
| > []  126 BPM  swing .06 | bar 42 mainA | [Re-enable arranged (2)] | WAV      |
+------------+-----------------------------------------------------------------+
| overview   |[=====|#########|=================================]               |
| ruler      |intro16|i2 8|build 16| mainA 32 |mainA2 32|brk 24|bE|mainB 48|out16|
+------------+-----------------------------------------------------------------+
| kick   M S | [A ][A ][A  ][ A        ][ A        ][F  ][H][ A         ][A   ]   |
| bass   M S | [A ][A ][A  ][ A        ][ B        ][C  ][A][ B         ][A   ]   |
| stab   M S | [  ][C ][B  ][ A   /~~~ cutoff ramp ~~~/  ][ B ] ...              |
| lead   M S | [  ][  ][   ][ B        ][ A        ][ B ] ...                     |
+------------+-----------------------------------------------------------------+
| EDITOR  stab / mainA / variant A (used in 3 sections)  [A][B][C][+copy] bar 1 2 3 4 |
|  step row  [x][.][.][.][.][.][x][x] ...   (lead: compact roll; pad: chord strip) |
+------------------------------------------------------------------------------+
| stab chain: [STAB face] -> [width face] -> [channel strip]    [fold: dbl-click]|
|  cutoff (o~)  env (o)  res (o)   marks: o set  o~ ramp  (o) held  | stock tick   |
|  drag = live tweak   dbl-click = home value   Shift+dbl = factory                |
+------------------------------------------------------------------------------+
```

The cell contents above are illustrative, not the real variant letters per section.

## Open question for the vote

Is editing in the first version, or is it a player with live tweaks only? Every rule of mine that writes (paint steps, edit the roll, "Write to section", copy-on-write variants) needs a writable song model and a save format; F-O2 notes there is no serialisation back to `Song` data today. If the first version is read-only plus live tweaks, the editor band can wait and the layouts differ little; if it edits, the layouts that put an editor next to the lanes (Bench, Source over Recreation) cost less than the ones that hide editing in a drawer. The group should settle this before ranking.

---

# Round 2: FO1

## F-O1: Design director — round 2
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

---

# Round 2: FO2

## F-O2: Tech lead — round 2
Agent model: Opus. Date: 2026-10-23.

I read all eleven other round-1 files in full and re-checked several code claims against the repo. `studio/` is now a symlink to `olde Havantechno dub studio/`, so the paths are the same. I ran no web searches this round. Every cost below is a **rough estimate in developer-days for one person who knows the code, ±50%, not measured**. It sits on top of the shared base from my round-1 file: device list, face registry, generic face, widgets, meters and family faces, 12–19 days. Code facts are verified by reading the files named.

**Correction to my round-1 file.** I wrote (C9) that the compressor and limiter keep their `DynamicsCompressorNode` private. F-H4 is right and I was wrong. `processors.js` sets `p.node = c` in both `BUILD.compressor` and `BUILD.limiter`, and `p.node = g` in `BUILD.sidechain` (verified: `processors.js`, the `build` functions of those three). Gain-reduction meters and the duck trace need no engine change. That removes one engine edit from my migration step 1.

## Reactions

**F-O1 (design director).** Cost notes for the three concepts:
- **Bench: base + 8–12 days.** Arrangement lanes drawn from `seq.sections[].play` (3–4), the chain strip (2–3), selection and lane pairs with an empty source placeholder (2–3), mixer toggle (1–2). Real source lanes come later, with stems: +3–5.
- **Console: base + 15–22 days.** Strips for 13 tracks, stems and master (3–4); the macro layer, which needs mapping data and a write fan-out (3–4); the rack overlay (2–3). Distinct "hardware" faces cost +5–8 more than flat family faces, because each needs its own drawing, not layout data.
- **Tracing: base + 15–20 days for the UI.** Nothing for the stems, transcription or match score, which cannot be estimated until the pipeline exists.

> "Main risk: vertical space ... you can see either the song or the devices, not both."

I agree, and it changes my view. In round 1 I treated the timeline as a cheap read-only canvas. With 13 source/recreation lane pairs it is the biggest space problem, not the biggest cost. I now prefer one row per track, with the source shown inside that row when it exists, over two lanes per track.

> "Mount only what is visible ... F-O2 should measure this."

Agreed, with a nuance. On desktop, all 23 faces at once is not a performance risk by my round-1 budget: about 420 static SVG nodes, and only meters animate. The reason to mount one chain is room for a distinct face. I have not measured on a phone, and that is the real unknown.

**F-S2 (implementation).** Cost note: **"Strips over a Device Row" is base + 5–8 days.** Compact strips are today's cards with fewer rows (1–2). The device row is my chain strip (2–3). The sends and master strip toggle takes 1. A section ruler takes 1–2. It is the cheapest concept, because almost every piece is also needed by Bench and by Source over Recreation.

> "Fallback is per device and per parameter ... unplaced [spec entries] are appended in a collapsed 'more' drawer."

This is better than my round-1 rule, which listed unplaced keys in `hide`. I adopt it. The selfcheck lint then reports unplaced keys as a count, not a failure, and a new parameter from Gear Crew shows up the same day. My lint keeps one hard failure: a face that names a key the spec does not have. F-S2's `FaceDefs` and my `Faces.define` are the same idea; I will use F-S2's shape (`sections`, `controls: [{p, as, size}]`).

> "Step 2: a small fake `document` ... so the check can call `Faces.render` for all 23 types."

I would not build this, or at least not early. It is about 50 lines of fake DOM to keep in step with real browsers, and the data lint already catches the drift that matters. Faces are cheap to check by opening the page. If we ever want a DOM test, it should be a browser run, not a hand-rolled fake.

**F-S3 (remix IA).** Cost note: **"Source over Recreation" is base + 14–20 days, without the pipeline.**
- Arrange screen with ruler and section matrix: 4–5.
- Stem lanes with decode, peak overview, playback on the sequencer clock and gain-ramped A/B: 5–7.
- Notes tab with a step grid writing back to pattern strings: 3–4.
- Compare tab: 2–3.
- Import and Plan screens: 3–4.

A piano roll for off-grid MIDI is extra: +3–5 for a new note-event path in `sequencer.js` (see Answers).

> "the arrangement is already a matrix: sections as columns, tracks as rows, and a variation letter in each cell."

This is the most useful observation in round 1 for the build. The matrix is in `seq.sections[i].play` today, so a section-by-track grid costs about one day to draw read-only, with no stems. I put it into my suggestion.

**F-H5 (mixer, transport, arrangement).** Cost note: **"Console Strip" is base + 6–9 days.** The overview strip plus flex-grow section ruler and loop brace (2–3) is the cheapest correct answer to 200 bars. Mixer strips with meters take 3–4, and faces opening from strips take 1–2.

> "The `fx` bars look relative to section start ... The relative reading is assumed and has not been checked."

Confirmed: `sequencer.js` `schedule()` fires an fx when `(fx.bar | 0) === bar - sec.start`, so bars are relative to the section start. Your absolute positions (riser at 37, 101, 129, 181; impact at 41, 137) are right.

**F-S1 (browser DAWs).** "Selected-track rack" is the same build as F-S2's suggestion, also base + 5–8 days. The evidence that BandLab and openDAW use a chain for the selected track supports that family of layouts.

**F-H3 and F-H4: a shared misreading of the self-check.**

> F-H4: "Any node method the faces call (`getFrequencyResponse`, `reduction`) needs a stub there, or the check fails."
>
> F-H5: "any new node type (for example `AnalyserNode`) needs a matching stub or the check fails."

The check never loads page code: `load()` in `selfcheck.js` reads only `core, synths, processors, sequencer, song`. `createAnalyser` is already stubbed. Faces and meters therefore cannot fail the check, and they are also not tested by it. A stub is needed only when an **engine** file uses a new node type. That is why I want the face layout data and the device list to be loadable by the check: they are the only UI-related things it can test.

## Answers

**F-O1 Q4 (can a macro mapping table live in `song.js`?)** Yes, and that is the better place. `song.js` is loaded by the check, so a check can resolve every macro path through `seq.setParam`/`getParam` and fail on a typo. Keep it as data next to each track, for example `macros: [{name:'bite', map:[{path:'bass.cutoff', from:200, to:2400, curve:'expo'}]}]`. Writes go through `setParam` like everything else. Cost: 2–3 days for data, writer and check. I would not build macros until a layout that needs them (Console, Tracing) wins.

**F-S2 Q1, F-S1 Q2, F-H1 Q1 (only the selected chain fully drawn?)** It is fine technically, and I recommend it, for the reason above: room, not frame rate. Today's always-visible track controls (level, pan, M/S, steps) stay in the compact row, so nothing becomes unreachable.

**F-S1 Q1 (licence).** The repo has no LICENSE file. `context history.md` says so and lists the owner's decision as open. I found no licence in `README.md` or `prd.md`. Until the owner decides, treat openDAW and GridSound (AGPL) as look-only references.

**F-S1 Q3 (write the face contract for WAM now?)** No. The device record from `seq.devices()` (id, type, spec, params, setParam path) is small enough to wrap later. Building to a plugin standard we have not read is cost with no user.

**F-S3 Q1 (analysis bundle offline or in-page?)** From the build side, import first: a file picker for stem WAVs plus a JSON of tempo, downbeat, sections and notes, decoded with `decodeAudioData` in page code. That keeps the engine and the check untouched. Running separation in the page is Gear Crew's call. Either way it should come after the layout ships, not before it.

**F-S3 Q2, F-S5 Q1 (arbitrary-timing notes?)** Keep the string notation for authored parts, and add a second "clip" format for imported material:
- events `{t (in 16ths, fractional), len, midi, vel}` per track;
- `schedule()` plays the clip events whose `t` falls inside the current step, offset by `(t - step) * stepSec`. It already runs once per 16th with an exact time `t`, so the extra path is small.

Cost 3–5 days, including check cases (an off-grid note lands at the right offset; clip and pattern on one track are mutually exclusive per section). The piano roll is a renderer of that list. The step grid stays on the strings.

**F-S5 Q2 and rule set 5 (live tweak vs ramp; cost of a "held" set).**
- Replace-until-re-enabled costs about 1 day. It is a `seq.held` map keyed by parameter path, checked in `ramps()` and in the section `set` loop, a `seq.release(path | all)`, and two check lines (a held path is skipped by a ramp and restored on release).
- Logic-style trim, an offset on the ramp, needs a base value plus an offset per path and changes every `set()`. That is about 3 days, and it touches `defineParams` semantics.

Build replace first.

**F-H4 Q1 (live reads from audio nodes?)** Yes, read-only, and only from the UI loop. Use `p.node.reduction` for compressor and limiter, `p.node.gain.value` for the duck, and an AnalyserNode tap for an EQ overlay, all polled from one `requestAnimationFrame` for visible faces only. Parameter-driven curves stay pure JS, so they also work in the offline-render `seq`, which has no live nodes.

**F-H3 (is the card "level" the synth `level`?)** No. The card's "level" slider writes `tr.channel` gain. The synth's own `level` is hidden (`skip {level:1}` in `paramSliders`), and sections automate it (`'kick.level'`, `'clap.level'` in `song.js`). Sub shows 0.55 because `song.js` sets channel `gain: 0.55`.

**F-H5 Q (sends and duck on the mixer strip or on the face?)** On the strip. In the engine they are per-track channel objects (`tr.sendGains`, `tr.sc`), not part of any device, so putting them on the strip matches the data. The sidechain face (F-H4's duck envelope) can still open from the strip's duck control.

**F-H2 Q (does the bottom pane follow the selection?)** Yes. One pane, with contents swapped by selection, is what my registry assumes.

## One disagreement

**With F-S2: "Keep `device.set` as the one path from UI to audio, so automation, section sets and UI stay consistent."** I think the one path must be `seq.setParam(path, value)`, not `device.set(name, value)`.

Reasons:
1. **The arrangement already writes by path.** Section `set` and `ramp` call `seq.setParam(r.param, v, {at})` with dotted paths (verified: `sequencer.js` `ramps()` and the `sec.set` loop in `schedule()`). The "held" rule F-S5 asks for is about one parameter being written by both the user and the arrangement. It needs both writers to use the same key, the path. A UI that calls `device.set('cutoff', v)` directly is invisible to a path-keyed `held` map, so the next ramp step overwrites the user, the bug F-S5 describes in A6.
2. **Undo, macros and later automation recording need a single path-keyed write.** F-O1's macro table maps to paths. A macro that writes `bass.cutoff` and a face that writes `inst.set('cutoff')` would be two routes to one value.
3. **It costs nothing.** `setParam` already resolves `track.key`, `track.insert.key`, `send.name.key` and `master.name.key`, ending in the same `obj.set`. I checked every path shape against `setParam`/`getParam` in round 1.

So faces should receive a `host.setParam` bound to their device's path prefix (my round-1 sketch), and read `dev.obj.params`. F-S2's renderer can keep its `refresh(v)` shape unchanged; only the write call differs.

## My suggestion

**"Strip Bench": F-S2's Strips over a Device Row, refined with F-H5's ruler and F-S3's section matrix.** One window with four bands:
1. The control bar.
2. A proportional section ruler with an overview and a loop brace.
3. Thirteen compact track rows. Each row is a family rail, name, M/S, a meter, the 16-step row for the current section, and a strip of section cells showing which variation plays in each of the nine sections, all read from `seq.sections[].play`.
4. One device row at the bottom for the selected track: its channel strip (level, pan, sends, duck), then the synth face, then its inserts, in signal order. A toggle swaps the row to "returns + master".

Every face comes from the registry with the generic fallback, so the page works on day one and gains faces one at a time. When stems exist (D2), each track row gains a thin source lane inside it, with per-row and global A/B, instead of doubling the rows. Rough cost: **base + 7–10 days**, the cheapest layout that leads to Bench and to Source over Recreation without rework.

- **Borrowed from Ableton:**
  - the Device View chain for the selected track, left to right in signal order, with fold by double-clicking the title bar;
  - the Overview strip for a 200-bar song;
  - one window, no floating panels.
- **Borrowed from Logic:**
  - the Inspector's channel strip at the head of the chain;
  - the marker track and cycle as the section ruler and loop brace;
  - the Controls view as the generic face that every device has before it gets its own Editor view.
- **New:**
  - section cells in each track row, showing the arrangement matrix that is already in the data;
  - F-S5's per-parameter state dot (inherited, set or ramp; held shows amber) on every face;
  - the source lane reserved inside the track row for the remix stage;
  - one write path (`setParam`), so held, macros and undo come later without a rewrite.

```
+-----------------------------------------------------------------------------+
| > || [] 126 BPM sw .06 | 042.09 mainA | [A src|B rec|A+B] | meter clip | WAV |
| overview [==|######|=======================================]                |
| ruler |intro|i2|build|  mainA  |  mainA2 |break|bE| mainB    |outro|       |
| loop                 [=== brace ===]                ^ playhead              |
+-----------------------------------------------------------------------------+
| ▌kick  M S ▮▮ x...x...x...x... | A  A  A  A  A  A  A  A  A |                 |
| ▌sub   M S ▮  x...x...x...x... | A  A  A  A  A  A  A  A  A |                 |
|>▌bass  M S ▮▮ ...x...x..x...x. | A  A  A  A  B  C  C  B  A |  (src lane, D2) |
| ▌stab  M S ▮  ..x...xx..x...xx | .  C  B  A  A  B  B  A  C |                 |
|  ... 13 rows, family rail colour, section cells read from seq.sections      |
+-----------------------------------------------------------------------------+
| bass ▸ [strip: lvl pan dly rev duck] -> [ BASS face: osc | filter curve |   |
|        amp ] -> [ EQ3 face: curve, 3 nodes ] -> out     [returns+master ⇄] |
+-----------------------------------------------------------------------------+
```

## Open question for the vote

**Are we voting for the first layout to ship on today's data (13 tracks, no stems, no transcription), or for the end-state remix layout that needs the D2/D3 pipeline?** The concepts sort cleanly on this:

- Strip Bench, Strips over a Device Row, Selected-track rack and Console Strip ship on today's data, at base + 5–10 days.
- Bench and Console need stems to be more than placeholders.
- Tracing and Source over Recreation mostly show things that do not exist yet: base + 14–20 days, plus a pipeline nobody can estimate.

If the vote is for the end state, the group should also name the shippable first stage of it, or the first months produce a frame around empty lanes.

---
