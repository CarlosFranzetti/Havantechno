# Lab Crew brief: element classification

Roundtable group of the Soundsystem, opened 2026-11-08 ET. Batch 3 of docs/plans/2026-11-09-roadmap.md. The owner's words: "when you get a track for analysis and try to figure out what elements are used: if it's a synth, approximate it to existing synth recordings and figure out whether it's a mono synth or a poly synth, FM or analog; figure out if it uses reverb and whether it's built-in effects or outboard; for drums, when it's an obvious 808 or 909 load the recreation, when it's unknown take a guess, and if it's a sampler then use samples."

The Ear Crew (docs/research/2026-10-24-ear-crew/, REPORT.md and the E1 to E5 transcripts) measured one record by hand: that work shows what numpy and scipy can tell from a mixed signal and where it failed (no stems). `tools/score.py` is the measurement tool.

## Roster

| Id | Model | Area | Transcript |
|---|---|---|---|
| L1 | Opus | Methods for each decision, with reliability and a test plan: synth or sample (repetition identity, round-robin variance, aliasing and bit depth); mono or poly (polyphony estimation, voice stealing signatures, legato glide); FM or analog/subtractive (inharmonic partials, spectral evolution, filter resonance tracks); reverb present and its RT60 and pre-delay, and the built-in against outboard heuristic (reverb on one element against the bus, stereo width, tail colour); drum machine identification (808 against 909 against sample: kick pitch and decay signatures, hat spectra, 6-bit noise); the nearest-recreation and plugin-suggestion mapping; separation options the sandbox or the owner's machine can run (Demucs weights blocked here; alternatives: Spleeter, Open-Unmix, HT-Demucs via a different host, running on the owner's machine). Published methods cited; what to build first. | `transcripts/L1-methods.md` |

## Method and rules

Web search allowed, at most 12 searches; cite only pages you saw. Test any method you can on the Ear Crew's material (the solo renders in tools/out/ and the measurements in its transcripts) and say what it got right. End with a build plan for an `app/analysis/` module (functions, inputs, outputs, confidence) and a scoring plan. Write only your transcript. Hand back with a 20-line summary.
