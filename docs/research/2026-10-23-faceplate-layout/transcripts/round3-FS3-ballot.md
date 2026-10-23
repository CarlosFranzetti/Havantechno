# Ballot: F-S3
Agent model: Sonnet. Date: 2026-10-23.

## Ranking
1. #11 Stem Bench (by F-O1) — it makes each stem the header of the tracks it feeds, which matches the many-to-one shape the pipeline actually produces (about four stems, not 13), it falls back to plain family groups with no waveform on today's 13 tracks and nine sections, and it keeps one chain drawn in full with a Chain, Notes and Compare pane as the slot for stems.
2. #12 Strip Bench (by F-O2) — it is the cheapest shell to ship on today's data (base plus 7 to 10 days, F-O2's rough estimate), it reads its section cells straight from `seq.sections[].play`, and its single `setParam` write path leaves the held-parameter and stem work free of rework.
3. #7 Matrix Bench (by F-S2) — its section matrix, one-chain Device Row with pinned return and master, and three-density faces ship on today's data and keep the matrix lanes as the home for stems later, though its per-row source lane does not fit the stem-to-track mapping.

## One amendment
For #11, store the stem-to-track mapping as plain data (a table that Plan can edit) and let a track be fed by more than one stem, because the sub track has no stem of its own (S5: 4-stem models do not separate sub from kick), so it should sit under the BASS group with a secondary link to DRUMS. Keep the A/B switch and Compare tab visible but disabled until stems are loaded, so the first build has no dead controls.

## Dissent (optional)
None. I accept the coordinator's ruling.
