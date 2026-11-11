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

## 2. Build and measurements

(written as the work proceeds; see the sections below)
