# F-H1: Ableton Live's main layout — round 2

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
