# Ballot: F-O1
Agent model: Opus. Date: 2026-10-23.

## Ranking
1. #12 Strip Bench (by F-O2) — It fits the ruling most directly: it ships on today's data at the lowest cost on the slate (base + 7–10 days, rough), shows the section matrix that is already in `seq.sections[].play`, draws only one chain, and commits to the single `setParam` write path that held states, macros and undo will need later.
2. #7 Matrix Bench (by F-S2) — It has the same shippable skeleton as #12, plus two ideas worth keeping: the pattern as the first device in the chain, and one face definition drawn at chip, strip and faceplate density, with returns and master pinned where the engine actually runs them.
3. #8 Bench with a Stem Group (by F-S3) — It is the only suggestion that models stems honestly as a many-to-one group above the tracks they feed. Its Recreation group is today's 13 tracks, so it still works with no stems loaded, though it costs more and its Import and Plan screens wait for D2.

## One amendment
Before #12 is built, replace the "source lane inside each track row" with a collapsible stem group header above the tracks that recreate it (drums over kick, clap, hats, shaker and perc; bass over bass and sub; other over stab, lead and pad). F-S3 showed that about four stems feed 13 tracks, so a per-row source lane has no stem to show for most rows. Also move the channel strip to the end of the device row (synth → inserts → channel), so the row reads in the engine's signal order, as the Ableton chain it borrows from does.

## Dissent (optional)
None. The ruling matches the open question I raised in round 2, and the stem group in my amendment keeps the slot for D2 and D3 clear without making the first build wait for them.
