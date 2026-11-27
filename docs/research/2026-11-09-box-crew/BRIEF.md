# Box Crew brief: the sampler and the drum machines

Roundtable group of the Soundsystem, opened 2026-11-08 ET. Batches 1 and 2 of docs/plans/2026-11-09-roadmap.md: a Kontakt-class sampler, then TR-808 and TR-909 recreations. The owner's words: "first off create a sampler plugin like Kontakt, next off 808 and 909 recreations; use Arturia's and all existing VST and AU online for help and use samples from online sources."

The engine today: `app/engine/synths.js` has a one-shot `sampler` (buffer, start, end, pitch, attack, release, loop, choke) built in the Build Crew (see app/CONTRACT.md "Sampler" and docs/research/2026-10-23-build-crew/REPORT.md); the Host loads audio and the document stores references (`doc.audio`). The drum voices in synths.js (kick, clap, hats, shaker, perc) are 808/909-flavoured synthesis tuned to one track. Read those before proposing.

## Roster

| Id | Model | Area | Transcript |
|---|---|---|---|
| B1 | Opus | The sampler: what Kontakt, TAL-Sampler, Decent Sampler, Sitala, Serato Sample and the SFZ players (sfizz, Sforzando) do; the SFZ format (opcodes for regions, key and velocity ranges, round robin, loops, envelopes, filters, LFOs, choke groups) as the DAW's program format; auto-mapping by file name and by pitch detection; which features matter for recreations and which can wait; a Web Audio design (AudioBufferSourceNode per voice, envelopes, filter) with the engine's conventions; a check list for A7. | `transcripts/B1-sampler.md` |
| B2 | Sonnet | The TR-808: service manual and circuit analyses of each voice (kick bridged-T, snare, clap, hats, cowbell, congas and toms, claves, maracas, cymbal), the control set, published measurements, open-source recreations (io-808 and others) with their licences, how Roland Cloud TR-808, D16 Nepheton, AudioRealism ADM and Arturia's kits expose the controls, free and redistributable sample sets with licence text quoted. | `transcripts/B2-808.md` |
| B3 | Sonnet | The TR-909: the same for the 909 (analog kick, snare, toms, rim, clap; sampled hats, ride, crash and their 6-bit character), open-source recreations with licences, commercial recreations' control sets, free and redistributable sample sets with licence text quoted. | `transcripts/B3-909.md` |

## Method and rules

Web search allowed, at most 12 searches each; cite only pages you saw and mark anything else unverified. For code and samples, record the licence exactly as the source states it and say whether it permits redistribution in an AGPL project; the owner's use is non-commercial, but the coordinator ships only what the licence allows and catalogues the rest for the owner's own machine. Download nothing here except small text (licence files); list URLs instead. Each transcript ends with a build specification in the engine's own terms (parameter names, ranges, defaults, the voice's signal path) that A7 can implement, and a verification plan A9 can score against reference samples the owner provides. Write only your transcript. Hand back with a 20-line summary.
