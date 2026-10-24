# Ear Crew brief: make the recreation sound like the record

Roundtable group, opened 2026-10-24 by the coordinator (the Fable session) on the owner's instruction after hearing the app's first full render: "I want it to sound very close to the original. I don't think it does right now. I want all the sounds accounted for."

For the first time the crew has the original: the owner uploaded `Guidance (Original Mix)` as a 192 kbps MP3. It is **not in the repository** (copyright) and must never be committed, copied into the repo or quoted as audio; it lives in the coordinator's scratchpad at `/tmp/claude-0/-home-user/341aa418-0695-5408-80be-331d2fec6cae/scratchpad/ref/reference.mp3` (387.99 s, 44.1 kHz stereo). Cut windows of it are beside it (`ref-intro-16.wav`, `ref-mainA-16.wav`, `ref-break-16.wav`, `ref-mainB-16.wav`: 16 bars each at bars 0, 40, 104, 136 on the reference grid; first kick at 0.568 s, 126 BPM, one bar 1.9047619 s). Stems from Demucs (drums, bass, other, vocals) will appear in `/tmp/claude-0/-home-user/341aa418-0695-5408-80be-331d2fec6cae/scratchpad/ref/stems/` once the separator is installed; the coordinator will say when.

The app's renders are in `tools/out/` (git-ignored): `app-bars-0-200.wav` (the full song), `app-{intro,mainA,break,mainB}-0-16.wav`, and in `/tmp/claude-0/-home-user/341aa418-0695-5408-80be-331d2fec6cae/scratchpad/ref/solo/mainA-<track>.wav` one solo render per track for 16 bars of mainA (kick, sub, bass, hat_closed, hat_open, clap, shaker, perc, stab, lead, pad). Make more with `node tools/render.js --page app --sections <name> --bars N [--solo track]` (see `tools/README.md`).

## What the coordinator measured first (so you start from facts, not from the spec)

Band energy relative to the window's total, reference, 16-bar windows (scipy STFT, mono sum):

| Band | intro | mainA | break | mainB |
|---|---|---|---|---|
| 20–60 Hz | −6.3 | −6.3 | −11.1 | −6.6 |
| 60–120 | −2.9 | −3.3 | −4.6 | −3.5 |
| 120–300 | −6.0 | −6.2 | −3.6 | −6.1 |
| 300–1000 | −24.3 | −15.7 | −9.4 | −11.6 |
| 1000–4000 | −31.3 | −20.2 | −17.6 | −19.7 |
| 4000–16000 | −49.9 | −18.5 | −20.6 | −18.6 |

Loudness-matched comparison (`tools/score.py --ref`), render minus reference: 300 Hz–1 kHz +13.6 dB (intro), +6.1 (mainA), +6.9 (break), +5.6 (mainB); 1–4 kHz +9.9, +8.1, +11.8, +10.3; 4–16 kHz +17 (intro, both tiny), +0.7, +2.5, +0.5. Render loudness per section −12.49 / −11.25 / −9.02 / −10.67 LUFS against the reference's −10.55 / −10.26 / −12.63 / −9.87: our break is 3.6 LU too loud, our intro 2 LU too quiet.

Low-end peaks in the reference (STFT 16384, mean spectrum): 59.2 Hz dominates every section (−24.4 dB in intro, mainA and mainB; −31.6 in the break), 35.0 Hz second (−33 dB; −49.5 in the break). In the main sections there is a 309.5 Hz peak (−37 dB) with 368.8 Hz beside it. The render's intro is dominated by the kick at 43 Hz and a bass fundamental at 123.8 Hz (−24 dB) with harmonics at 247, 371, 614, 737, 861, 985, 1109 Hz: that stack is the mid excess. The reference intro has no such stack; above 300 Hz it holds only −50 dB peaks at 409, 474, 619 Hz and faint 4-bar noise sweeps (visible at 7, 15, 22.6 s of the intro window). The reference's 1–2.5 kHz band is rhythmic (5.8 dB standard deviation per 16th), not a drone.

Solo renders, mainA, RMS and spectral centroid: kick −14.2 dBFS / 89 Hz; sub −17.5 / 64 Hz (peak 59 Hz); bass −18.3 / 231 Hz (peak 124 Hz); hat_closed −36.4 / 11.8 kHz; hat_open −25.1 / 11.8 kHz; clap −28.4 / 3.8 kHz; stab −18.8 / 1.24 kHz (peak 415 Hz); shaker, perc, lead, pad silent in this window. Mix RMS −12.4 against the reference's −11.3 dBFS.

## Roster

| Id | Model | Element group | Transcript |
|---|---|---|---|
| E1 | Opus | Low end: kick and sub. Pitch, glide, decay, the 59 Hz against 35 Hz question, duck depth and timing, what the kick's tail is. | `transcripts/E1-low-end.md` |
| E2 | Sonnet | Mid harmonic content: bass line, stab or chord, lead, pad. Notes, rhythm, envelopes, filter movement, what plays in which section. | `transcripts/E2-mids.md` |
| E3 | Sonnet | Drums above the kick: closed and open hats, clap, shaker, perc, the noise sweeps and risers at phrase boundaries. Patterns, spectra, decay, level against the kick. | `transcripts/E3-drums-top.md` |
| E4 | Sonnet | Arrangement and samples: section by section, bar by bar, what enters and leaves; anything that is a sample rather than a synth (vocal, FX hit, texture), with exact time ranges so it can be sliced into a sampler track (PRD D8). | `transcripts/E4-arrangement-samples.md` |
| E5 | Sonnet | Mix and master: per-section band targets, loudness curve across the song, stereo width per band, the master's tonal balance; a proposed EQ match (Gear Crew S3) as a concrete biquad list. | `transcripts/E5-mix.md` |
| A7, A8, A9 | Haiku | Tuning phase (from the Build Crew): A7 applies the element tables to `app/engine/synths.js` and `song.js` (a new `GUIDANCE_V3` song, never editing `GUIDANCE`), A8 to `processors.js`, A9 extends `score.py` with per-stem and per-element measures and runs the loop. | `transcripts/log-A7.md`, `log-A8.md`, `log-A9.md` |
| Coordinator | Fable | Brief, stems, rulings, verification, DISCUSSION.md and REPORT.md | `transcripts/log-coordinator.md` |

## Method

Round 1, **inventory**: each analyst writes a table of every distinct sound in its group as heard in the reference: name, sections and bars where it plays, onset grid (which 16ths; swing), pitch or centre frequency and bandwidth, envelope (attack, decay, release in ms, measured), level relative to the kick peak in the same window (dB), stereo (mono, wide, panned), and how it was measured (the exact numpy/scipy or ffmpeg method, the window). Then the recreation's equivalent: which `app/engine` track and params produce it today (read `synths.js` spec entries and `song.js` `GUIDANCE`/`GUIDANCE_V2`), the solo render's measurement of the same quantity, and the delta. Where the reference has a sound the recreation lacks, say so and propose how to make it: a new synth type (describe the oscillator, filter and envelope), a change to an existing one, or a sample slice (E4 gives the time range). Where the recreation has a sound the reference lacks, say so (candidates: the mid bass stack in the intro).

Round 2, **cross-read**: each analyst reads the other four transcripts and appends "Agreements and disputes" (for example E1 and E2 must agree on what the 59 Hz and the 124 Hz are; E3 and E5 on what the 1.4–1.6 kHz rhythmic band is). The coordinator rules on disputes.

Round 3, **tuning**: A7, A8 and A9 apply the tables; A9 scores every change against the reference per section and per stem; nothing is kept that moves a band further from the reference. Target: every band within 2 dB of the reference's balance in every section, loudness within 1 LU per section, and every reference sound present in the inventory's "accounted for" column.

## Rules

Measured numbers only; every number carries its method and window; mark anything estimated. Cite the file and timestamps you listened to by analysis (nobody here hears; say "measured", never "heard"). Write only your own transcript (and, in round 3, your own engine files). The reference MP3 stays in the scratchpad: never copy it under the repo, never commit it, never embed audio from it in a document; sample slices for the sampler are proposed as time ranges, and whether to ship them is the owner's decision. Web search is allowed for synthesis facts (how a 909 open hat decays, a TB-303 filter's slope), at most 6 searches each; cite only pages you saw. No commits. Hand back with a 20-line summary: the inventory count, the three largest deltas, anything the recreation lacks entirely, and your questions for the coordinator.
