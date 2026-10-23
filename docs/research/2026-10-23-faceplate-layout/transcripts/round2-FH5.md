# F-H5: mixer, transport and arrangement — round 2
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

SubagentHandback summary follows as my final step.
