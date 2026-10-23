# Ballot: F-H3
Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

## Ranking
1. #12 Strip Bench (by F-O2) — It ships on today's 13 tracks with the section cells read from `seq.sections[].play`, puts one selected-track device row at the bottom, and reserves a source lane inside each track row without doubling the rows, so it meets the ruling's three tests most directly and is the cheapest of the group.
2. #7 Matrix Bench (by F-S2) — The 13-lane section matrix with a bottom Device Row works on today's data, and it reserves a Source lane per track that opens when stems exist, with RETURN and MASTER pinned at the right end; it is close to #12, but its four bands and three densities cost more to build first.
3. #6 Chain Bench (by F-S1) — It works today with an explicit thin Source placeholder lane, so the stem slot is visible rather than implied, and a foreign-face slot lets a WAM GUI mount later; I rank it below #12 and #7 because it shows no per-section variant cells, so the arrangement's structure is less visible.

## One amendment
Show the RETURNS block (DELAY, REVERB) and the master as a fixed block at the right end of the device row, not behind the "returns + master" toggle in #12. The engine runs the two sends in parallel and the master chain in fixed order (F-H4, round 2, Answers and "My suggestion"; `studio/processors.js`), and a toggle hides how the sound leaves the track, which is the one thing a user must see to judge a recreation against its source.

## Dissent (optional)
I accept the ruling as written, with one addition I would ask the group to make explicit: "a clear slot for stems" should mean the track row keeps its height when a source lane appears, because a source lane that pushes the 13 recreation rows down or resizes them is not a slot but a redesign. None of the three ranked suggestions breaks that, but the ballot should not be read as approval of any layout whose source lane would change row height. This dissent does not change the ballot above.
