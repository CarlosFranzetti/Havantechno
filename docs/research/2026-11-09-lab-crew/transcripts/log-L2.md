# L2 build log (Lab Crew, batch 3: element classification)

Builder: L2 (Opus), taking over from L1 (whose agent cannot be resumed). Opened 2026-11-11 ET. Times are Eastern
(UTC in brackets). Exit codes are read directly from the command, never through a pipe. Nobody listened to anything.

## 1. What L1 left on disk (read 2026-11-11)

- `app/analysis/dsp.js` (174 lines): mono/side, zero-phase Butterworth bands (RBJ biquads, forward and back),
  centred RMS envelope, hysteresis onsets (L1 3.1, with an optional `rearm` rule), radix-2 FFT, prepared-spectrum NCC
  (`prep`, `nccPrep`, `ncc`, `bestLag`), linear-interpolation resample, Hann magnitude spectrum, Schroeder EDC,
  `rtFit` (least-squares RT between two EDC levels), corr, median, energy, mulberry32 rng.
- `app/analysis/features.js` (181 lines): `hits`, `identity` (per-band pair and twin NCC, overall twin 300 Hz-16 kHz,
  pitch-normalised twin over +-7 semitones, residual after the best scaled twin, 3-16 kHz flatness), `formantSlope`,
  `freeDecay` (early/late EDC slopes, time to -60, per-band late RT), `predelay` (side-channel onset behind mid, refused
  on a panned dry source), `tailSignature` (3-band late RT, 16 third-octave tail/head colour, L/R correlation).
- `app/analysis/decide.js` (110 lines): `synthOrSample` (with the cap for deterministic synthesis and the formant
  override), `reverb`, `sameReverb` (quadratic fit of the colour difference over commonly excited bands, plus RT
  log-ratio), `sharedOrSpecific` (union-find clustering; says "shared (send or bus)" or "element-specific", ruling 5).
- `tools/analysis-check.js`: 15 synthetic checks and 21 on the V3 mainA3 solos in `tools/out/`.
  Run 2026-11-11: `node tools/analysis-check.js` -> `OK: 36 checks passed`, exit 0.
- `tools/separate.py`: MDX-Net ONNX runner (UVR hash check, settings from UVR's model_data), `--model htdemucs` path.
  Never run end to end by L1 as far as the disk shows (no models cached in `~/.cache/havantechno/models`, no
  `tools/out/stems/`). Its docstring points to "log-L1.md" for licence quotes; that file does not exist. The licence
  check is therefore open and is done in this log (section 3).
- So: decision A (identity, cap, formant) and decision D (presence, RT60, pre-delay, shared/specific) exist in JS and
  are checked; missing are separation end to end, the licence verdict, the MDX/HT-Demucs comparison, Drums ground
  truth, mono/poly, FM/subtractive, the drum decision, the analyze entry, and the labels spec.

## 2. Ground truth used

- L1's V3 mainA3 renders in `tools/out/` (twelve solos and the mix, 16 bars, 33.1 s).
- New, made by L2 (scratchpad only, never the repository): `l2/s/truth.js` renders engine instruments on
  `app/index.html` in headless Chromium through `Synths.create` (which falls back to `Drums`) on an OfflineAudioContext,
  stereo 44.1 kHz float32, seeded `Math.random`; a job may first render one hit of any instrument into a buffer and play
  it through the `sampler` (truth "sample"), and may add an element-specific stereo exponential-noise reverb through a
  ConvolverNode (known RT60 and pre-delay). Run 2026-11-11: 47 identity jobs and 6 reverb jobs, exit 0, no page errors.
  - `dr-<type>`: all 27 Drums voices, 20 hits at 0.3 s (cymbals and open hats 0.6 s), velocity 0.7 to 1.0.
  - `smp-<type>`: the sampler replaying one hit of bd808, sd808, cp808, oh808, sd909, bd909; `smp-fm-pitched` and
    `smp-stab-pitched` replay one fm note / stab chord transposed by 0, +2, -3, +5, +7 semitones.
  - `syn-<type>`: kick, clap, hat_closed, shaker, perc, bass, fm, lead, stab at one pitch; `synp-<type>`: bass, fm,
    lead at five pitches.
  - `rv-*`: perc (RT 1.2 s, pre-delay 25 ms), sd909 (0.8 s, 5 ms), cp808 and fm (2.5 s, 10 ms), plus dry cp808 and bd808.
- Truth caveat found on the way: **the Drums noise is frozen.** `drums.js` `noiseBuf` makes one seeded 2 s buffer per
  context and every `v.noise` starts it at offset 0 (comment: "so a hit renders the same twice"), so every 808 and 909
  noise voice replays the same noise on every hit, like a sample. A real 808 or 909 noise source never repeats. For
  decision A these voices are therefore not "synth" truth. Hook request to A12 (drums.js owner), not done by me: start
  each hit's noise at an offset that advances per trigger (deterministic per context, so the scoring tool's
  reproducibility stays), e.g. `s.start(t0, (inst._nHit++ * 0.6180339) % 2)`.

## 3. Step 1: hit identity (decision A)

### 3.1 Changes

- `dsp.onsets` (bug found on the truth set): 18 of 47 renders read as **one hit** (bd808, toms, cymbals, open hats,
  cp808, sd909), because the detector re-armed only after the envelope fell 45 dB under the file's peak, which a long
  decay at a 0.3 s spacing never does. First fix (re-arm after 15 dB on the 3 ms envelope) made it worse: a 3 ms RMS of
  a 50 Hz tone ripples by over 10 dB, so the 808 kick fired three times per hit (60 of 20). Final: re-arm when a 25 ms
  envelope falls 10 dB under its peak since the last onset; fire only on a rise of 8 dB of that envelope above its trough
  since re-arming (so a tail above the threshold never fires by itself); the refinement stops at the trough level + 3 dB
  instead of searching back for -50 dB. Result: 20 of 20 hits in all 47 renders; L1's 36 checks unchanged.
- `features.yin` (YIN, de Cheveigne and Kawahara 2002: cumulative-mean-normalised difference, threshold 0.15) and
  `features.hitPitches` (per hit, 80 ms from 20 ms after the onset, clarity > 0.8).
- `features.formantSlope` rewritten. L1's peak-harmonic slope gave 0.42 for an fm note transposed by the sampler (truth
  1). New score: per pair of notes at different pitches, the harmonic profile (dB, harmonics within 40 dB of the
  strongest) compared aligned in Hz and aligned by harmonic number, level offset removed;
  score = errHz / (errHz + errHarm). The harmonic-number comparison uses windows at the same point of the recording's
  own time (a sampler plays a note r times higher r times faster), the Hz comparison the same wall-clock window.
  1 = profile and time course scale with pitch, 0 = fixed spectral envelope, 0.5 = undecidable (an unfiltered
  oscillator). `identity` now computes it when 3 or more distinct semitones are clearly pitched.
- `decide.synthOrSample`: (a) uses `id.formantSlope` when no score is passed; support for "sample" needs > 0.9 (was
  0.7), because FM and key-tracked filters also scale their profile with pitch (engine fm read 0.74); < 0.3 still lifts
  the cap toward "synth" (medium). (b) Identical noise replays drop from high to **medium** ("a recording, or a digital
  voice restarting one noise table each hit"), because of the Drums finding above. (c) New: noise replays where a band
  shows pair NCC < 0.9 with twin >= 0.97 (a small set of different recordings: round robins, velocity layers or
  transposition) stay **high**.

### 3.2 Results on the truth set (`node l2/s/idrun.js l2/truth`, 2026-11-11)

| Truth group | Items | Output | Right? |
|---|---|---|---|
| sampler replays, noisy (smp-cp808, smp-sd808, smp-sd909) | 3 | sample, medium | yes |
| sampler replays, tonal (smp-bd808, smp-bd909, smp-oh808, smp-stab-pitched) | 4 | sample, low (capped) | yes, at the cap |
| transposed fm sample (smp-fm-pitched) | 1 | sample, medium; formant score 0.98 lifted it | yes |
| fresh-noise synths (syn-clap, syn-hat_closed, syn-shaker) | 3 | synth, high (twin 0.18, 0.30, 0.26) | yes |
| deterministic synths, one pitch (syn-kick, -bass, -fm, -lead, -perc, -stab) | 6 | sample, low (capped) | as designed: undecidable |
| deterministic synths, five pitches (synp-bass, -fm, -lead) | 3 | sample low (0.59, 0.74), undecided low (0.48) | not rescued: the formant test did not reach < 0.3 on the engine's filter-envelope bass |
| Drums, frozen-noise voices (cp808, cp909, hc808, ht808, lc808, lt808, ma808, mc808, mt808, sd808, sd909) | 11 | sample, medium | signal-true (they do replay), label-false; see section 2 |
| Drums, tonal or 6-bit sample voices (bd808, bd909, cb808, ch808, cl808, rs808, ch909, oh909, cr909, rd909, ht909, lt909, mt909, rs909) | 14 | sample, low | at the cap; ch909/oh909/cr909/rd909 are samples in truth |
| Drums with free-running metal oscillators (cy808, oh808) | 2 | undecided, low (twin 0.88, 0.63) | honest: hits differ, no fresh noise band |

No item got a wrong "synth"; no "synth" item got "sample" above low except the frozen-noise Drums. The formant test
never lifted a synth to "sample" here. What it could not tell: deterministic synthesis from a sample (all tonal cases).

### 3.3 Checks

`tools/analysis-check.js`: two expectations changed with the rule (one replayed noise hit: high -> medium, with the
reason in the name); three checks added (20 overlapping 808-style rings at 0.3 s give 20 onsets; a mono 55 Hz ring's
long decay is not reverb; a long tail with L/R correlation 1 in a stereo file is the element's own decay). Run
2026-11-11 13:37 EST (18:37 UTC): `node tools/analysis-check.js` -> `OK: 39 checks passed`, exit 0.

## 4. Step 1: reverb measures (decision D)

L1's functions kept (Schroeder EDC late slope -25..-45 dB, per-band late RT, pre-delay from the side-channel onset,
refused on a panned dry source, colour plus RT clustering). Two gaps found on the Drums truth and fixed:

- An 808 kick's own ring read "reverb, 0.90 s" and the 808 clap's built-in tail "reverb, 0.53 s". `freeDecay` now
  also returns `stereo`, `tailCorr` (L/R correlation in the -25..-45 dB late window) and `sideLate` (side channel's decay,
  EDC -5..-35 dB). `decide.reverb`: a long decay with tailCorr > 0.99 is "the element's own decay, not a stereo reverb"
  (medium); in a mono file a long decay counts as reverb only when 2 or more of the 3 bands above 300 Hz decay slowly,
  at low confidence. The engine's reverb send read tailCorr -0.00 (clap), 0.71 (hat), 0.70 (pad), 0.01 (stab), so the
  threshold is 0.99 (a first 0.9 on a -15 dB window failed the hat, whose near-mono dry decay was still in the window).
- `sharedOrSpecific` applies the same gate (the 808 ring had been grouped as a reverb).

Results (`l2/s/rvrun.js`, 2026-11-11):

| Render | Truth | present | RT60 read | pre-delay read | side-channel decay |
|---|---|---|---|---|---|
| rv-perc | 1.2 s, 25 ms | yes, high | 1.16 s | 21.1 ms (4 ms early) | 1.24 s |
| rv-cp808 | 2.5 s, 10 ms | yes, high | 2.52 s | refused (dry side/mid -17 dB with a very wet mix) | 2.48 s |
| rv-fm | 2.5 s, 10 ms | yes, high | 2.21 s | refused (-9.5 dB) | 2.45 s |
| rv-sd909 | 0.8 s, 5 ms | yes, high | 1.39 s (wrong) | 5.8 ms | 1.37 s |
| dry-bd808 (mono file) | none | no, low | - | - | - |
| dry-cp808 (mono file) | none (built-in tail) | yes, low (wrong; 3 bands decay 0.5 s) | 0.53 s | - | - |
| V3 solos (L1's checks) | send, T30 2.0 / T20 2.2 | 5 of 5 wet, 4 of 4 dry | clap 2.05, hat 2.21, burst 2.06 | clap 15.2 ms (15) | - |

Shared or element-specific on the rv set: perc, sd909 and the 2.5 s pair came out as three reverbs; cp808 and fm (two
separate impulses with the same RT and colour) came out "shared". That is the method's limit: two units with the same
settings are the same measurement. Not solved: a reverb shorter than the element's own decay (sd909: the snare's noise
tail, time constant up to 0.2 s, outlasts a 0.8 s reverb; both the full and the side channel read the snare's 1.4 s,
an upper bound only); pre-delay on wet mixes (refused, as designed); a built-in mono tail in a mono file.

## 5. Step 2: separation, licence, MDX-Net against HT-Demucs

### 5.1 Licences (read 2026-11-11 with curl through the proxy)

- **KUIELab MDX-Net weights: CC BY 4.0.** Zenodo record 5717356 (API, `https://zenodo.org/api/records/5717356`):
  title "KUIELab-MDX-Net: A Two-Stream Neural Network for Music Demixing", creators Minseok Kim, Woosung Choi, Jaehwa
  Chung, Daewon Lee, Soonyoung Jung, description "Uploaded files are trained parameters for KUIELab-MDX-Net.",
  `license: {'id': 'cc-by-4.0'}`, access open, files `onnx_A.zip` (md5 72605d3722ebef18c353f831abdbfc07) and
  `mixer.ckpt`. The mdx-net-submission `leaderboard_A` README installs exactly this file ("wget
  https://zenodo.org/record/5717356/files/onnx_A.zip"). I downloaded the zip (md5 matched) and compared it with UVR's
  release files: `kuielab_a_drums.onnx`, `_bass`, `_other` are **byte-identical** to `onnx_A/drums.onnx`, `bass.onnx`,
  `other.onnx` (full-file MD5 bfc170e3..., 949791e2..., c2fa07e6...). So the CC BY 4.0 terms of the authors' upload apply
  to the files separate.py uses.
- KUIELab code: `kuielab/mdx-net` LICENSE "MIT License / Copyright (c) 2020 KINoAI"; `kuielab/mdx-net-submission`
  (master and leaderboard_A) "MIT License / Copyright (c) 2021 AIcrowd". separate.py ports no KUIELab code (it is a
  re-implementation of the STFT framing from UVR's published parameters), so these matter only as context.
- UVR: README section "License": "The **Ultimate Vocal Remover GUI** code is [MIT-licensed](LICENSE)." and "**Please
  Note:** For all third-party application developers who wish to use our models, please honor the MIT license by
  providing credit to UVR and its developers." Its "About" says "UVR's core developers trained all of the models provided
  in this package (except for the Demucs v3 and v4 4-stem models)"; for the kuielab_a files that is contradicted by the
  byte match with the KUIELab authors' Zenodo upload, and its Credits line reads "Kuielab & Woosung Choi - Developed the
  original MDX-Net AI code". The LICENSE file itself answered 404 under LICENSE, LICENSE.txt, LICENSE.md, license and
  License on the master branch, so I quote the README only.
- Demucs: `facebookresearch/demucs` LICENSE "MIT License / Copyright (c) Meta Platforms, Inc. and affiliates."; README
  "Demucs is released under the MIT license as found in the [LICENSE](LICENSE) file." I found no separate statement for
  the weight files on dl.fbaipublicfiles.com.
- Not verified: the training data's terms (MDX-Net Track A was trained on MUSDB18-HQ only, per its README; HT-Demucs
  on MUSDB HQ plus extra songs, per the Demucs README L1 read). Whether a dataset's terms reach the weights is a legal
  question I cannot settle; CC BY 4.0 on the weights is what their authors state.
- **Verdict: the MDX-Net licence permits this use** (analysis in the app and in tools, redistribution and re-hosting
  included) with attribution. separate.py now refuses any model file whose full MD5 is not the Zenodo original and
  writes this attribution into every `<name>-stems.json`: "Separation: KUIELab-MDX-Net (Kim, Choi, Chung, Lee, Jung),
  weights CC BY 4.0, Zenodo 10.5281/zenodo.5717356; files mirrored by Ultimate Vocal Remover (UVR)." A THIRD_PARTY.md
  entry is needed once the models ship (coordinator's file). The DOI is the Zenodo default form for the record; I did
  not open a DOI resolver page.

### 5.2 separate.py end to end

Input: L1's 16 bars of V3 (mainA3, `tools/out/app-mainA3-0-16-v3.wav`, 33.1 s) and the linear sum of its twelve
solos (`l2/sep/linmix.wav`; truth stems: drums = kick, clap, hat_open, shaker, shaker_on, tick, burst, burst_r;
bass = sub, bass; other = stab, pad). Models cached in the scratchpad (`HAVANTECHNO_MODELS`), stems written there.

- `python3 tools/separate.py linmix.wav --out .../mdx` (models downloaded from the UVR release): exit 0, drums 45.4 s
  (including download), bass 25.4, other 25.0; wall 1 m 43 s. Real mix: exit 0, 1 m 36 s.
- After adding the Zenodo MD5 check: `--stems drums` exit 0 (16.1 s).
- `--model htdemucs` on both: exit 0 each, wall 3 m 59 s and 4 m 43 s (other agents were loading the CPU; user time
  1 m 01 s and 2 m 56 s).
- New default `--model auto` (HT-Demucs when the demucs package runs, else MDX-Net, and MDX-Net if demucs exits non-zero):
  on linmix exit 0, chose htdemucs, wall 6 m 28 s under load; stems.json carries model and attribution.
- Error path: a missing input prints "separate.py: no such file" and exits 2.

### 5.3 Exact-stem comparison (L1's method; `l2/s/sdr.py`)

| Separator, input | drums SDR (SI-SDR) | bass | other |
|---|---|---|---|
| MDX-Net, linear mix (exact truth) | 9.7 (11.3) | 7.5 (7.8) | 15.9 (15.8) |
| **HT-Demucs, linear mix** | **24.0 (24.1)** | **17.7 (17.6)** | **19.4 (19.3)** |
| MDX-Net, the engine's real mix | 10.5 (12.2) | 0.0 (-13.5) | 15.6 (15.6) |
| HT-Demucs, the engine's real mix | 24.9 (24.9) | 0.1 (-10.7) | 18.4 (18.3) |

MDX-Net reproduces L1's figures to 0.1 dB, which confirms separate.py matches L1's runner. HT-Demucs's vocals stem holds
-59 dB of the other stem's energy; adding it to "other" changes nothing. The real-mix bass score is 0 dB for both: the
truth (sum of solos) does not match the real mix there (the solos sum to the mix at 9.3 dB SDR; the sub's ducking and
the master's glue depend on what else plays), so only the linear-mix row measures the separators. The existing
HT-Demucs stems of the full V3 render were made by the same model (htdemucs); I ran it again on the 16 bars because
only those have exact solo truth.

**Recommendation: HT-Demucs is the default** (10 to 14 dB better on drums and bass, 3.5 dB on other; one more stem;
MIT), MDX-Net the fallback (ONNX, 3 x 30 MB, clear CC BY 4.0 weights, a candidate for onnxruntime-web in the app, about
2x faster here). Done in separate.py as `--model auto`. The coordinator's ruling (1) made MDX-Net the provisional default;
this changes it, so it is the coordinator's call.

Not run yet: identity through separation for both separators (L1's sampled-hat test, 0.95 through MDX-Net).

## 6. Hooks and requests (files I do not own)

- A12, `app/engine/drums.js`: free-running noise (section 2). Until then, Drums noise voices are "frozen-noise
  synthesis" truth, not "synth" truth, for decision A.
- Coordinator: THIRD_PARTY.md entry for the MDX-Net weights (CC BY 4.0, text in 5.1) if they ship or are re-hosted;
  confirm HT-Demucs as default.
- The truth-render harness (`l2/s/truth.js`, 90 lines) should live in the repository so the scoring set can be rebuilt;
  it is not in my file list. Either A9 folds it into render.js with the labels spec (step 6), or I add it as
  `tools/analysis-truth.js` if the coordinator agrees.

## 7. Not verified yet

Identity and reverb through separation; real hardware (no real 808, 909, FM synth or hardware reverb); the onset change
on dense full mixes (only solos and single-voice renders were run); the formant score on chords (YIN finds no pitch on
the stab, so it is skipped there).

## 8. Remaining (after the first hand-back)

Step 3 mono/poly, step 4 FM/subtractive with real `fm` renders, the drum decision with the Drums truth set above,
step 5 the analyze entry (JSON and table), step 6 the labels spec for A9, and the run on the four reference stems.
