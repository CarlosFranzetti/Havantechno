# Faceplate vote (round 3 transcript)

Tallied 2026-10-23 16:48:14 UTC by the coordinator from the twelve ballots in `transcripts/round3-*-ballot.md`. Method: each ballot ranks three suggestions; 3 points for first, 2 for second, 1 for third. The slate numbers are those in `DISCUSSION.md`. Every ballot is reproduced in full at the end.

## Result

| Rank | # | Suggestion | Points | First places | Appearances |
|------|---|------------|--------|--------------|-------------|
| 1 | #12 | Strip Bench (F-O2) | 28 | 8 | 10 |
| 2 | #7 | Matrix Bench (F-S2) | 20 | 3 | 9 |
| 3 | #11 | Stem Bench (F-O1) | 9 | 1 | 6 |
| 4 | #6 | Chain Bench (F-S1) | 7 | 0 | 5 |
| 5 | #9 | Family Bench (F-S4) | 5 | 0 | 3 |
| 6 | #8 | Bench with a Stem Group (F-S3) | 2 | 0 | 2 |
| 7 | #1 | Bench with a Chain (F-H1) | 1 | 0 | 1 |

Suggestions not named on any ballot: #2 Tracks and Editors (F-H2), #3 Bench Chain (F-H3), #4 Bench, Chained (F-H4), #5 Section Matrix (F-H5), #10 Bench with Section Lanes (F-S5).

## Ballot matrix

| Agent | 1st | 2nd | 3rd |
|-------|-----|-----|-----|
| FH1 | #7 | #12 | #8 |
| FH2 | #7 | #9 | #1 |
| FH3 | #12 | #7 | #6 |
| FH4 | #12 | #9 | #6 |
| FH5 | #12 | #6 | #9 |
| FS1 | #12 | #7 | #11 |
| FS2 | #12 | #6 | #11 |
| FS3 | #11 | #12 | #7 |
| FS4 | #12 | #7 | #11 |
| FS5 | #12 | #7 | #11 |
| FO1 | #12 | #7 | #8 |
| FO2 | #7 | #11 | #6 |

## Amendments proposed to the winner

- **FH1** (to #7 Matrix Bench (F-S2)): Make the first device in each track's chain depend on the track's kind, not on one fixed step row: a PATTERN step editor for `drum` and `note` tracks, a progression strip for `chord` tracks (stab and pad), and the compact roll only for `melody` (lead). F-S5 showed that a chord track has no 16-step pattern to edit and that a roll for bass would show one row, so a PATTERN device in front of every chain, as #7 draws it, would show an empty editor for half the tracks. The rest of #7's layout stays as it is.
- **FH2** (to #7 Matrix Bench (F-S2)): Take F-S4's glyph chips into the lane headers of #7, so each of the 13 compact rows shows the devices that make up its track (family ink, small), and make the chain's fold gesture (F-H3, F-H1) the only way from a chip to a full face, so no separate expand control is needed. Keep #7's matrix cells read from `seq.sections[].play` and its pinned RETURN and MASTER block unchanged.
- **FH3** (to #12 Strip Bench (F-O2)): Show the RETURNS block (DELAY, REVERB) and the master as a fixed block at the right end of the device row, not behind the "returns + master" toggle in #12. The engine runs the two sends in parallel and the master chain in fixed order (F-H4, round 2, Answers and "My suggestion"; `studio/processors.js`), and a toggle hides how the sound leaves the track, which is the one thing a user must see to judge a recreation against its source.
- **FH4** (to #12 Strip Bench (F-O2)): Pin the RETURN and MASTER block at the right end of the device row for #12 instead of hiding it behind the "returns + master" toggle. The engine runs delay and reverb as parallel sends and the master as a fixed chain, and a toggle hides those from the serial reading the chain is meant to give. Keep the block narrow (a few chips) so the one-chain budget still holds.
- **FH5** (to #12 Strip Bench (F-O2)): Before #12 is built, reserve the stem slot per stem group, not per track: one collapsible Source lane for each of the four stems (drums, bass, other, plus the mix) above the track rows they feed, instead of a source lane inside all 13 rows. F-S3 and F-O1 both found that the pipeline gives about four stems and that the map is many-to-one (drums feeds kick, clap, hats, shaker and perc), so a per-track lane would repeat the same audio five times and cost the vertical space F-O1 warned about. The group header is also where F-O1's summing-stack and Live's Group Track idea live, so the amendment costs nothing today and matches both references.
- **FS1** (to #12 Strip Bench (F-O2)): For #12, replace "held shows amber" with a shape-only marker (an open ring and a dashed arc in neutral ink), as F-S4 and F-S5 agreed in round 2, because amber collides with the drums and fx family hues. Also keep the face registry's entry type open to a "foreign face" whose element is supplied by someone else, which costs nothing now and leaves room for a WAM GUI later.
- **FS2** (to #12 Strip Bench (F-O2)): Before #12 is built, replace "held shows amber" with the hue-free marker set that F-S4 and F-S5 converged on (open ring for held, filled dot for set, arc for ramp), because amber collides with the drums and fx family hues and breaks F-S4's rule that state is carried by shape. Also reserve the first slot of the device row for a PATTERN face (the 16-step editor with variant chips), so editing has a home when it ships and the track rows only need a 16-dot mini row.
- **FS3** (to #11 Stem Bench (F-O1)): For #11, store the stem-to-track mapping as plain data (a table that Plan can edit) and let a track be fed by more than one stem, because the sub track has no stem of its own (S5: 4-stem models do not separate sub from kick), so it should sit under the BASS group with a secondary link to DRUMS. Keep the A/B switch and Compare tab visible but disabled until stems are loaded, so the first build has no dead controls.
- **FS4** (to #12 Strip Bench (F-O2)): Replace #12's "held shows amber" with a shape-only marker: an open ring on the knob plus a dashed value arc in neutral ink, with set as a filled dot and ramp as an arc behind the knob. Amber collides with the gold fx family (riser, impact) in my palette and fails in greyscale, and F-S5 and F-S2 have already accepted shape-only state markers. Keep the "Re-enable arranged (n)" button that counts held controls.
- **FS5** (to #12 Strip Bench (F-O2)): Change #12's held-state marker from amber to a hue-free shape (an open ring with a dashed value arc), because F-S4's rule is that state never rides on a family hue and amber sits beside the drums and fx hues. Also reserve the editor slot in the first build: selecting a section cell should open a short editor band chosen by track kind (step row for drum and note tracks, progression strip for chord tracks, roll for the lead only), with copy-on-write for shared variants, since the device row alone has no place to edit a pattern. The `seq.held` set stays keyed by `setParam` path, as F-O2 already costs it at about one day.
- **FO1** (to #12 Strip Bench (F-O2)): Before #12 is built, replace the "source lane inside each track row" with a collapsible stem group header above the tracks that recreate it (drums over kick, clap, hats, shaker and perc; bass over bass and sub; other over stab, lead and pad). F-S3 showed that about four stems feed 13 tracks, so a per-row source lane has no stem to show for most rows. Also move the channel strip to the end of the device row (synth → inserts → channel), so the row reads in the engine's signal order, as the Ableton chain it borrows from does.
- **FO2** (to #7 Matrix Bench (F-S2)): Order and group Matrix Bench's 13 lanes by the stem they will come from: drums (kick, clap, hats, shaker, perc), bass (sub, bass), other (stab, lead, pad) and fx (riser, impact). Each group gets a collapsible header row that is empty today. When stems arrive, the stem waveform fills that header (F-O1's many-to-one group from #11) instead of 13 per-track source lanes appearing, so the rows never reorder and the vertical budget stays the same. Keep the pinned RETURN+MASTER block as chips that open as faces in the Device Row, so it does not take width from the selected chain.

## Dissents from the coordinator's ruling

- **FH1:** I accept the coordinator's two rules (one selected chain at full size, and a clear stem slot), but I think the ruling leaves one question open that changes the ranking: whether version 1 edits the song or only plays it. The editor band in #7, #10 and #2, the copy-on-write variants in #5, and the write path in F-S5's "Write to section" all cost different amounts depending on that answer, and F-S5's own open question asks for it before the ballots. I would ask the owner to settle it first, and I would also call "one chain at a time" a default rather than a rule, because F-O2 has not measured the phone case that is the real risk to it. Neither point changes my ranking above, but both should be decided before anything is built.
- **FH2:** I accept the coordinator's ruling. My one concern is that "one chain drawn in full" can leave the other twelve tracks as bare rows, which is close to the identical cards the owner rejected. The ballot should require that the compact rows also carry identity (glyph chips or a family rail), not only the selected chain. This is a condition on the winner, not a change to the ruling.
- **FH3:** I accept the ruling as written, with one addition I would ask the group to make explicit: "a clear slot for stems" should mean the track row keeps its height when a source lane appears, because a source lane that pushes the 13 recreation rows down or resizes them is not a slot but a redesign. None of the three ranked suggestions breaks that, but the ballot should not be read as approval of any layout whose source lane would change row height. This dissent does not change the ballot above.
- **FH4:** I accept the ruling's "one selected track's chain in full" and its "works on today's data" test. I disagree with how it was applied to effect faces: the ruling treats the chain as a single line, which makes the returns look like an afterthought, although the engine runs them as parallel sends and the master as a fixed chain. My round-2 file (`round2-FH4.md`) proposed a separate RETURNS block for that reason, and I would ask the group to keep it in the first build rather than defer it to a toggle.
- **FH5:** I agree with the coordinator's ruling on the criteria (ship on today's data, one chain at a time, a clear slot for stems), but I would add one clause to the second point. The ruling draws one selected track's chain in full, and that is right for the instrument and insert faces. The sends (DELAY and REVERB) and the master chain are parallel units in the engine, not inserts of any track (F-H4 and the `send.*` paths in `studio/sequencer.js`), so hiding them with the chain would misstate the signal path. The ruling should say that the returns and master stay visible in every layout, in a fixed block or a pinned column, whichever chain is selected. This does not change my ranking, because #12 already has a returns-and-master toggle, and I would make it a pinned column.
- **FS2:** None. I accept the coordinator's ruling; my only note is that "one chain at a time" should be read as a rendering rule (only the selected chain is drawn in full), not a ban on a compact chip per device in the other twelve rows.
- **FS3:** None. I accept the coordinator's ruling.
- **FS4:** None. I accept the coordinator's ruling (first layout to ship on today's data, one chain drawn in full, a clear slot for stems).
- **FS5:** None. The coordinator's ruling matches my round-2 open question about what the first version must do. One note for the owner: if the first version is read-only plus live tweaks, the editor band in my amendment can wait, and the ranking above does not change.
- **FO1:** None. The ruling matches the open question I raised in round 2, and the stem group in my amendment keeps the slot for D2 and D3 clear without making the first build wait for them.
- **FO2:** None. Voting for the first layout to ship on today's data, with one chain drawn in full, is the criterion I asked for in round 2.

---


# Ballot: FH1

Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

## Ranking
1. #7 Matrix Bench (by F-S2) — It ships on today's data, since the section matrix is read straight from `seq.sections[].play`, it keeps one selected chain at full size with RETURN and MASTER pinned on the right as the engine's parallel units, and each track row has a clear place for a source lane once stems exist.
2. #12 Strip Bench (by F-O2) — It is the cheapest shell that works today (base plus 7 to 10 days), its build order (device list, face registry, one draw loop first) is the one every agent accepted, and its source lane sits inside each track row, which is the clearest stem slot on the slate.
3. #8 Bench with a Stem Group (by F-S3) — It works with zero stems (the Recreation rows ship first and the Source group is a collapsed placeholder), and it is the only entry that says how a stem lands next to the tracks it feeds, which is what the ruling's stem-slot test asks for.

## One amendment
Make the first device in each track's chain depend on the track's kind, not on one fixed step row: a PATTERN step editor for `drum` and `note` tracks, a progression strip for `chord` tracks (stab and pad), and the compact roll only for `melody` (lead). F-S5 showed that a chord track has no 16-step pattern to edit and that a roll for bass would show one row, so a PATTERN device in front of every chain, as #7 draws it, would show an empty editor for half the tracks. The rest of #7's layout stays as it is.

## Dissent (optional)
I accept the coordinator's two rules (one selected chain at full size, and a clear stem slot), but I think the ruling leaves one question open that changes the ranking: whether version 1 edits the song or only plays it. The editor band in #7, #10 and #2, the copy-on-write variants in #5, and the write path in F-S5's "Write to section" all cost different amounts depending on that answer, and F-S5's own open question asks for it before the ballots. I would ask the owner to settle it first, and I would also call "one chain at a time" a default rather than a rule, because F-O2 has not measured the phone case that is the real risk to it. Neither point changes my ranking above, but both should be decided before anything is built.


---

# Ballot: FH2

Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

## Ranking
1. #7 Matrix Bench (by F-S2) — It ships on today's data: the section ruler and the 13 lanes are read from `seq.sections[].play` and the matrix needs no stems, the selected track's row is the only fully drawn chain, and returns plus master pinned at the right keep the sends out of the way.
2. #9 Family Bench (by F-S4) — Its glyph chips in every lane header give all 13 tracks an identity at once, which answers the owner's D1 complaint about identical cards, while still drawing only one chain at full size.
3. #1 Bench with a Chain (by F-H1) — It is the simplest reading of the coordinator's ruling (one Device View for the selected track, mixer row closed by default, overview at the top), so it is the cheapest first build if the group wants the least to argue about.

## One amendment
Take F-S4's glyph chips into the lane headers of #7, so each of the 13 compact rows shows the devices that make up its track (family ink, small), and make the chain's fold gesture (F-H3, F-H1) the only way from a chip to a full face, so no separate expand control is needed. Keep #7's matrix cells read from `seq.sections[].play` and its pinned RETURN and MASTER block unchanged.

## Dissent (optional)
I accept the coordinator's ruling. My one concern is that "one chain drawn in full" can leave the other twelve tracks as bare rows, which is close to the identical cards the owner rejected. The ballot should require that the compact rows also carry identity (glyph chips or a family rail), not only the selected chain. This is a condition on the winner, not a change to the ruling.


---

# Ballot: FH3

Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

## Ranking
1. #12 Strip Bench (by F-O2) — It ships on today's 13 tracks with the section cells read from `seq.sections[].play`, puts one selected-track device row at the bottom, and reserves a source lane inside each track row without doubling the rows, so it meets the ruling's three tests most directly and is the cheapest of the group.
2. #7 Matrix Bench (by F-S2) — The 13-lane section matrix with a bottom Device Row works on today's data, and it reserves a Source lane per track that opens when stems exist, with RETURN and MASTER pinned at the right end; it is close to #12, but its four bands and three densities cost more to build first.
3. #6 Chain Bench (by F-S1) — It works today with an explicit thin Source placeholder lane, so the stem slot is visible rather than implied, and a foreign-face slot lets a WAM GUI mount later; I rank it below #12 and #7 because it shows no per-section variant cells, so the arrangement's structure is less visible.

## One amendment
Show the RETURNS block (DELAY, REVERB) and the master as a fixed block at the right end of the device row, not behind the "returns + master" toggle in #12. The engine runs the two sends in parallel and the master chain in fixed order (F-H4, round 2, Answers and "My suggestion"; `studio/processors.js`), and a toggle hides how the sound leaves the track, which is the one thing a user must see to judge a recreation against its source.

## Dissent (optional)
I accept the ruling as written, with one addition I would ask the group to make explicit: "a clear slot for stems" should mean the track row keeps its height when a source lane appears, because a source lane that pushes the 13 recreation rows down or resizes them is not a slot but a redesign. None of the three ranked suggestions breaks that, but the ballot should not be read as approval of any layout whose source lane would change row height. This dissent does not change the ballot above.


---

# Ballot: FH4

Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

## Ranking
1. #12 Strip Bench (by F-O2) — It ships on today's data at the cheapest estimate in the slate, reads the section cells straight from `seq.sections[].play`, keeps one chain drawn in full, and reserves a source lane inside each track row, which is the clearest stem slot the ruling asks for.
2. #9 Family Bench (by F-S4) — Same skeleton as Strip Bench, and the glyph chips in every lane header let all 13 tracks show what they are made of at once, which answers the owner's D1 (each device recognisable) without opening a face.
3. #6 Chain Bench (by F-S1) — It has an explicit folding Source placeholder lane and a foreign-face slot for a future WAM GUI, so the stem and plug-in seams are both built in, at no cost to today's data.

## One amendment
Pin the RETURN and MASTER block at the right end of the device row for #12 instead of hiding it behind the "returns + master" toggle. The engine runs delay and reverb as parallel sends and the master as a fixed chain, and a toggle hides those from the serial reading the chain is meant to give. Keep the block narrow (a few chips) so the one-chain budget still holds.

## Dissent (optional)
I accept the ruling's "one selected track's chain in full" and its "works on today's data" test. I disagree with how it was applied to effect faces: the ruling treats the chain as a single line, which makes the returns look like an afterthought, although the engine runs them as parallel sends and the master as a fixed chain. My round-2 file (`round2-FH4.md`) proposed a separate RETURNS block for that reason, and I would ask the group to keep it in the first build rather than defer it to a toggle.


---

# Ballot: FH5

Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

## Ranking
1. #12 Strip Bench (by F-O2) — It ships on today's 13 tracks and nine sections, draws one chain at a time, reads the section cells straight from `seq.sections[].play`, and leaves a source slot inside each track row, which is the closest match to the coordinator's ruling and the cheapest of the group.
2. #6 Chain Bench (by F-S1) — It is the only suggestion with a folding Source placeholder lane that is reserved from day one, plus a foreign-face slot for later WAM GUIs, so the stem and plug-in seams are in the first build without costing anything now.
3. #9 Family Bench (by F-S4) — Its glyph chips and family ink give all 13 tracks a visible device identity at the smallest scale, which speaks to the owner's D1 request for distinct faces, and its collapsed source lane keeps it workable with no stems loaded.

Note: my own suggestion, #5 Section Matrix, is not ranked. It is the source of the section-cell idea that #12 and #7 already carry, so the group is not losing it by my abstention.

## One amendment
Before #12 is built, reserve the stem slot per stem group, not per track: one collapsible Source lane for each of the four stems (drums, bass, other, plus the mix) above the track rows they feed, instead of a source lane inside all 13 rows. F-S3 and F-O1 both found that the pipeline gives about four stems and that the map is many-to-one (drums feeds kick, clap, hats, shaker and perc), so a per-track lane would repeat the same audio five times and cost the vertical space F-O1 warned about. The group header is also where F-O1's summing-stack and Live's Group Track idea live, so the amendment costs nothing today and matches both references.

## Dissent (optional)
I agree with the coordinator's ruling on the criteria (ship on today's data, one chain at a time, a clear slot for stems), but I would add one clause to the second point. The ruling draws one selected track's chain in full, and that is right for the instrument and insert faces. The sends (DELAY and REVERB) and the master chain are parallel units in the engine, not inserts of any track (F-H4 and the `send.*` paths in `studio/sequencer.js`), so hiding them with the chain would misstate the signal path. The ruling should say that the returns and master stay visible in every layout, in a fixed block or a pinned column, whichever chain is selected. This does not change my ranking, because #12 already has a returns-and-master toggle, and I would make it a pinned column.


---

# Ballot: FS1

Agent model: Sonnet. Date: 2026-10-23.

## Ranking
1. #12 Strip Bench (by F-O2) — it is the cheapest shell that ships on today's data (about base plus 7 to 10 days, rough), draws one selected-track chain, reserves the stem slot inside each track row instead of doubling the rows, and uses `seq.setParam` as the single write path, matching the docked selected-track chain that BandLab, Amped Studio and Soundtrap show in my round-1 evidence.
2. #7 Matrix Bench (by F-S2) — it has the same one-chain shape plus RETURN and MASTER pinned at the right of the device row, so the engine's parallel sends are visible without a second tab, and its chip, strip and faceplate densities give a folded device a defined look.
3. #11 Stem Bench (by F-O1) — it has the clearest slot for stems (a stem as the header of the tracks it feeds, with Chain, Notes and Compare tabs) and F-O1 says it works with no stems loaded, but it costs more than the two above, so it ranks third.

## One amendment
For #12, replace "held shows amber" with a shape-only marker (an open ring and a dashed arc in neutral ink), as F-S4 and F-S5 agreed in round 2, because amber collides with the drums and fx family hues. Also keep the face registry's entry type open to a "foreign face" whose element is supplied by someone else, which costs nothing now and leaves room for a WAM GUI later.


---

# Ballot: FS2

Agent model: Sonnet. Date: 2026-10-23.

## Ranking
1. #12 Strip Bench (by F-O2) — it is the cheapest layout that runs on today's data (13 rows with section cells read from `seq.sections[].play`, one selected-track device row, a source lane reserved inside each row), and it fixes the write path to `seq.setParam`, which my own round 2 conceded was the right one.
2. #6 Chain Bench (by F-S1) — compact strips over one selected-track chain with a thin Source placeholder lane that costs nothing until stems exist, though it lacks the section-cell matrix that is already in the data.
3. #11 Stem Bench (by F-O1) — its stem groups are the clearest slot for the pipeline and degrade to plain family groups with no waveform today, but the A/B, Compare and Load/Modify/Create parts are scope that must be deferred for a first ship.

## One amendment
Before #12 is built, replace "held shows amber" with the hue-free marker set that F-S4 and F-S5 converged on (open ring for held, filled dot for set, arc for ramp), because amber collides with the drums and fx family hues and breaks F-S4's rule that state is carried by shape. Also reserve the first slot of the device row for a PATTERN face (the 16-step editor with variant chips), so editing has a home when it ships and the track rows only need a 16-dot mini row.

## Dissent (optional)
None. I accept the coordinator's ruling; my only note is that "one chain at a time" should be read as a rendering rule (only the selected chain is drawn in full), not a ban on a compact chip per device in the other twelve rows.


---

# Ballot: FS3

Agent model: Sonnet. Date: 2026-10-23.

## Ranking
1. #11 Stem Bench (by F-O1) — it makes each stem the header of the tracks it feeds, which matches the many-to-one shape the pipeline actually produces (about four stems, not 13), it falls back to plain family groups with no waveform on today's 13 tracks and nine sections, and it keeps one chain drawn in full with a Chain, Notes and Compare pane as the slot for stems.
2. #12 Strip Bench (by F-O2) — it is the cheapest shell to ship on today's data (base plus 7 to 10 days, F-O2's rough estimate), it reads its section cells straight from `seq.sections[].play`, and its single `setParam` write path leaves the held-parameter and stem work free of rework.
3. #7 Matrix Bench (by F-S2) — its section matrix, one-chain Device Row with pinned return and master, and three-density faces ship on today's data and keep the matrix lanes as the home for stems later, though its per-row source lane does not fit the stem-to-track mapping.

## One amendment
For #11, store the stem-to-track mapping as plain data (a table that Plan can edit) and let a track be fed by more than one stem, because the sub track has no stem of its own (S5: 4-stem models do not separate sub from kick), so it should sit under the BASS group with a secondary link to DRUMS. Keep the A/B switch and Compare tab visible but disabled until stems are loaded, so the first build has no dead controls.

## Dissent (optional)
None. I accept the coordinator's ruling.


---

# Ballot: FS4

Agent model: Sonnet. Date: 2026-10-23.

## Ranking
1. #12 Strip Bench (by F-O2) — It is the cheapest shell (base plus 7 to 10 days, rough), draws the section cells from `seq.sections[].play` that exist today, draws only the selected track's chain, reserves the source lane inside each track row so stems add no rows, and settles on one write path (`setParam`) that the held-value state needs.
2. #7 Matrix Bench (by F-S2) — It is almost the same shell and also works on today's data, and its chip, strip and faceplate densities let a folded device still show what it is, with the pattern as the first device and returns and master pinned at the right end.
3. #11 Stem Bench (by F-O1) — It gives the clearest home for stems (a group header per stem over the tracks it feeds, with Chain, Notes and Compare tabs), and its groups still work with zero stems as plain family groups, but it costs more and its Load/Modify/Create chips and Compare tab are empty until the pipeline exists.

## One amendment
Replace #12's "held shows amber" with a shape-only marker: an open ring on the knob plus a dashed value arc in neutral ink, with set as a filled dot and ramp as an arc behind the knob. Amber collides with the gold fx family (riser, impact) in my palette and fails in greyscale, and F-S5 and F-S2 have already accepted shape-only state markers. Keep the "Re-enable arranged (n)" button that counts held controls.

## Dissent (optional)
None. I accept the coordinator's ruling (first layout to ship on today's data, one chain drawn in full, a clear slot for stems).


---

# Ballot: FS5

Agent model: Sonnet. Date: 2026-10-23.

## Ranking
1. #12 Strip Bench (by F-O2) — it is the cheapest layout (base + 7 to 10 days, F-O2's rough estimate) that works on today's data, draws one selected chain in full, reads its section cells straight from `seq.sections[].play`, and reserves a source lane inside each track row, so it needs no rework when stems arrive.
2. #7 Matrix Bench (by F-S2) — its lanes show variant letters and ramps from data that exists today, it puts the pattern editor first in the selected chain, and it pins RETURN and MASTER at the right end, so editing and the engine's real signal flow are both visible with one chain drawn at full size.
3. #11 Stem Bench (by F-O1) — it is the strongest answer to the "clear slot for stems" test (stem group headers over the tracks they feed, A/B in the transport, a Compare tab), and the groups degrade to plain family groups with no waveform when no stems are loaded.

## One amendment
Change #12's held-state marker from amber to a hue-free shape (an open ring with a dashed value arc), because F-S4's rule is that state never rides on a family hue and amber sits beside the drums and fx hues. Also reserve the editor slot in the first build: selecting a section cell should open a short editor band chosen by track kind (step row for drum and note tracks, progression strip for chord tracks, roll for the lead only), with copy-on-write for shared variants, since the device row alone has no place to edit a pattern. The `seq.held` set stays keyed by `setParam` path, as F-O2 already costs it at about one day.

## Dissent (optional)
None. The coordinator's ruling matches my round-2 open question about what the first version must do. One note for the owner: if the first version is read-only plus live tweaks, the editor band in my amendment can wait, and the ranking above does not change.


---

# Ballot: FO1

Agent model: Opus. Date: 2026-10-23.

## Ranking
1. #12 Strip Bench (by F-O2) — It fits the ruling most directly: it ships on today's data at the lowest cost on the slate (base + 7–10 days, rough), shows the section matrix that is already in `seq.sections[].play`, draws only one chain, and commits to the single `setParam` write path that held states, macros and undo will need later.
2. #7 Matrix Bench (by F-S2) — It has the same shippable skeleton as #12, plus two ideas worth keeping: the pattern as the first device in the chain, and one face definition drawn at chip, strip and faceplate density, with returns and master pinned where the engine actually runs them.
3. #8 Bench with a Stem Group (by F-S3) — It is the only suggestion that models stems honestly as a many-to-one group above the tracks they feed. Its Recreation group is today's 13 tracks, so it still works with no stems loaded, though it costs more and its Import and Plan screens wait for D2.

## One amendment
Before #12 is built, replace the "source lane inside each track row" with a collapsible stem group header above the tracks that recreate it (drums over kick, clap, hats, shaker and perc; bass over bass and sub; other over stab, lead and pad). F-S3 showed that about four stems feed 13 tracks, so a per-row source lane has no stem to show for most rows. Also move the channel strip to the end of the device row (synth → inserts → channel), so the row reads in the engine's signal order, as the Ableton chain it borrows from does.

## Dissent (optional)
None. The ruling matches the open question I raised in round 2, and the stem group in my amendment keeps the slot for D2 and D3 clear without making the first build wait for them.


---

# Ballot: FO2

Agent model: Opus. Date: 2026-10-23.

## Ranking
1. #7 Matrix Bench (by F-S2) — It ships on today's data with nothing invented (lanes from `seq.sections[].play` and `.ramp`, one Device Row for the selected track, pattern-synth-inserts-channel in signal order), it is the cheapest of the full proposals by my rough estimate (about base + 7–10 days), and its source lane under each track gives the stems a clear slot without changing the layout.
2. #11 Stem Bench (by F-O1) — It has the best slot for stems: a stem is the header of the tracks it recreates, a many-to-one fit that matches what the pipeline will deliver, and it works with zero stems by grouping tracks by family; it ranks second only because the Chain/Notes/Compare tabs and the Load/Modify/Create chips add build work that today's data does not yet need.
3. #6 Chain Bench (by F-S1) — It is the leanest shell that meets the ruling (compact strips, one chain, sends and master on a second tab); its single thin Source lane is a weaker stem slot than #7 or #11, and its "+ insert" menu needs an engine change, because `Processors.chain` is wired once in `addTrack`.

## One amendment
Order and group Matrix Bench's 13 lanes by the stem they will come from: drums (kick, clap, hats, shaker, perc), bass (sub, bass), other (stab, lead, pad) and fx (riser, impact). Each group gets a collapsible header row that is empty today. When stems arrive, the stem waveform fills that header (F-O1's many-to-one group from #11) instead of 13 per-track source lanes appearing, so the rows never reorder and the vertical budget stays the same. Keep the pinned RETURN+MASTER block as chips that open as faces in the Device Row, so it does not take width from the selected chain.

## Dissent (optional)
None. Voting for the first layout to ship on today's data, with one chain drawn in full, is the criterion I asked for in round 2.


---