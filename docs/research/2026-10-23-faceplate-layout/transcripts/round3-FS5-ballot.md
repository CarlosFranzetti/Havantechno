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
