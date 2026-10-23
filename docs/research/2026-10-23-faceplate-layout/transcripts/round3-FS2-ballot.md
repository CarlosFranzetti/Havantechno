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
