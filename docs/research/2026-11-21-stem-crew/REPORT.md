# Stem Crew report: separation, commercial practice and the detection engine

Coordinator's report, 21 November 2026 (ET), from `BRIEF.md`, `transcripts/S1-izotope.md`, `S2-separation.md`, `S3-detection.md` and `transcripts/log-coordinator.md`. A research round: no code was written. The owner's Firecrawl credits ran out part-way, so parts of S2 and S3 rest on search summaries and memory; each transcript lists which sections.

## 1. The question

How commercial tools (iZotope RX first) analyse and separate audio, which open engines exist and how stems should be handled, and how to improve the app's detection engine.

## 2. Findings

- **RX 12 exists** (S1, read on iZotope's site). iZotope names Band-Split RNN and BS-RoFormer without saying which tool uses which; no training data, scores or latency are published. No iZotope tool names instruments, tempo or notes; no commercial tool found returns synth patches from a record.
- **Worth copying is workflow** (S1): stems that sum to the input with the residual audible, one lane per stem, an assistant that proposes an editable result, classification the user can correct, draft and final quality.
- **A defect in the app's separator** (S2; confirmed by the coordinator at `tools/separate.py` line 174): Demucs is called without float output, so stems are 16-bit and rescaled, which can change one stem's level against another's.
- **Drum-kit separation** (S2): every model found was trained on acoustic kits; none outputs clap, rim or cowbell; the best-scored community model carries no licence and the peer-reviewed one is non-commercial. Whether either works on 808 and 909 material is unmeasured.
- **Licences** (S2): many top weights have no licence statement; several are non-commercial; whether training-data terms reach weights is unsettled. Weights the app trains on its own renders avoid all three.
- **Detection** (S3): nothing found identifies a drum-machine or synth model from audio, and no transcriber outputs 303 slides or accents. Proposed pipeline: separation with drum pieces, grid, sections, events, shortlist, fitting the app's own instruments by rendering, effects, and a person confirming between the top hypotheses. S3 supports fitting by synthesis as the most valuable stage, conditional on a correct grid and notes first and on calibration through the separator; it estimates one to five minutes a song with a shortlist and short excerpts, against 18 to 60 for a plain search.

## 3. What is not known

Timings on a current laptop; scores for any commercial separator; whether public drum models work on electronic kits; whether weights trained on the app's renders generalise to records; the accuracy figures S3 could not fetch.

## 4. What follows

`docs/plans/2026-11-21-strategy.md`, stages A1 and C1 to C5.
