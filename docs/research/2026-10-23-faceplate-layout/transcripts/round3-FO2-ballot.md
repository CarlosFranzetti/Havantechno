# Ballot: F-O2
Agent model: Opus. Date: 2026-10-23.

## Ranking
1. #7 Matrix Bench (by F-S2) — It ships on today's data with nothing invented (lanes from `seq.sections[].play` and `.ramp`, one Device Row for the selected track, pattern-synth-inserts-channel in signal order), it is the cheapest of the full proposals by my rough estimate (about base + 7–10 days), and its source lane under each track gives the stems a clear slot without changing the layout.
2. #11 Stem Bench (by F-O1) — It has the best slot for stems: a stem is the header of the tracks it recreates, a many-to-one fit that matches what the pipeline will deliver, and it works with zero stems by grouping tracks by family; it ranks second only because the Chain/Notes/Compare tabs and the Load/Modify/Create chips add build work that today's data does not yet need.
3. #6 Chain Bench (by F-S1) — It is the leanest shell that meets the ruling (compact strips, one chain, sends and master on a second tab); its single thin Source lane is a weaker stem slot than #7 or #11, and its "+ insert" menu needs an engine change, because `Processors.chain` is wired once in `addTrack`.

## One amendment
Order and group Matrix Bench's 13 lanes by the stem they will come from: drums (kick, clap, hats, shaker, perc), bass (sub, bass), other (stab, lead, pad) and fx (riser, impact). Each group gets a collapsible header row that is empty today. When stems arrive, the stem waveform fills that header (F-O1's many-to-one group from #11) instead of 13 per-track source lanes appearing, so the rows never reorder and the vertical budget stays the same. Keep the pinned RETURN+MASTER block as chips that open as faces in the Device Row, so it does not take width from the selected chain.

## Dissent (optional)
None. Voting for the first layout to ship on today's data, with one chain drawn in full, is the criterion I asked for in round 2.
