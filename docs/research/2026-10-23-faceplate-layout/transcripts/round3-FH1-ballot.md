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
