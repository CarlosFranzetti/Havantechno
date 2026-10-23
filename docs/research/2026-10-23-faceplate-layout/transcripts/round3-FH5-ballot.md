# Ballot: F-H5
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
