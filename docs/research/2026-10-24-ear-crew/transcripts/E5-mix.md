# E5 transcript: mix and master (Ear Crew)

Analyst E5 (Sonnet). Written as I go. Scratch scripts live in the scratchpad `e5/` folder (common.py, bands.py, loud.py), not in the repo.
No stems (Demucs blocked), so everything below is from the mixed reference (mono/mid/side from the decoded 44.1 kHz stereo MP3), the app's full render `tools/out/app-bars-0-200.wav`, and solo renders.

## 0. Setup and grids (measured)

- Reference decoded with `/usr/bin/ffmpeg` to float32 (coordinator's `guidance.f32`; checked bit-identical to a fresh `ffmpeg -t 20` decode of `reference.mp3`, max abs difference 0.0). 17,108,660 samples, 387.95 s.
- Reference grid: bar b starts at sample round(0.568*44100) + b*84000 = 25,049 + 84,000 b (126 BPM, straight, per `tools/README.md`).
- App grid: `app-bars-0-200.json` sidecar: gridStartSample 2205, bar b starts at 2205 + 84,000 b; render is `song: baseline` (the `GUIDANCE` preset, not V2), 16-bit PCM, 16,914,660 samples (383.55 s), sample peak 0.578 (-4.76 dBFS) against the reference's 0.980 (-0.18 dBFS).
- Sections (the app's nine, from `song.js`): intro 0-16, intro2 16-24, build 24-40, mainA 40-72, mainA2 72-104, break 104-128, breakEnd 128-136, mainB 136-184, outro 184-200. Same bars used on both files. The `breakLate` split at bar 120 exists only in GUIDANCE_V2, not in this render.
- Band method: mid = (L+R)/2, side = (L-R)/2; `scipy.signal.welch`, Hann, nperseg 16384 (2.7 Hz bins), 50 % overlap, scaling 'spectrum'. 1/3-octave bands at ISO centres 25 Hz to 16 kHz (29 bands), edges fc/2^(1/6) to fc*2^(1/6); band power = sum of PSD bins inside the edges. "Section total" = mid power + side power over the whole spectrum (equals the mean of L and R power). Check: the same code on mid alone with the coordinator's six coarse bands on the 16-bar windows reproduces his table (intro -6.3/-2.9/-6.0/-24.3/-31.3/-50.1 against his -49.9; mainA, break, mainB identical to 0.1).
- Differences are app minus reference, in dB relative to each file's own section total, so they are balance differences, not loudness differences.

## 1. Band energies per section (1/3 octave, dB re section total; ref, app, app minus ref)

Method as in section 0. Read a positive difference as "the app has more of this band, relative to its own total, than the record".

| fc (Hz) | intro 0-16: ref / app / diff | intro2 16-24: ref / app / diff | build 24-40: ref / app / diff |
|---|---|---|---|
| 25 | -26.7 / -31.9 / -5.3 | -26.4 / -32.1 / -5.6 | -24.2 / -33.8 / -9.6 |
| 31.5 | -16.5 / -26.5 / -10.0 | -16.3 / -26.7 / -10.4 | -14.0 / -26.7 / -12.7 |
| 40 | -20.4 / -5.8 / +14.6 | -19.9 / -6.0 / +13.9 | -18.0 / -6.8 / +11.1 |
| 50 | -11.4 / -5.9 / +5.6 | -11.4 / -6.1 / +5.3 | -14.5 / -6.5 / +8.0 |
| 63 | -5.1 / -12.7 / -7.6 | -5.1 / -12.9 / -7.8 | -7.4 / -13.3 / -5.9 |
| 80 | -8.0 / -13.5 / -5.6 | -8.0 / -13.8 / -5.8 | -9.3 / -13.7 / -4.4 |
| 100 | -9.2 / -13.6 / -4.5 | -9.2 / -13.9 / -4.7 | -9.1 / -13.9 / -4.8 |
| 125 | -8.6 / -6.9 / +1.7 | -8.7 / -7.1 / +1.6 | -7.7 / -6.8 / +0.9 |
| 160 | -11.3 / -21.5 / -10.1 | -11.4 / -21.7 / -10.3 | -10.0 / -20.4 / -10.4 |
| 200 | -11.9 / -23.9 / -12.0 | -12.0 / -24.0 / -12.1 | -10.2 / -22.5 / -12.4 |
| 250 | -16.2 / -18.4 / -2.2 | -16.3 / -18.6 / -2.4 | -13.9 / -17.7 / -3.8 |
| 315 | -24.1 / -20.0 / +4.1 | -24.3 / -18.8 / +5.4 | -18.3 / -17.6 / +0.7 |
| 400 | -29.7 / -12.7 / +17.0 | -29.7 / -12.6 / +17.1 | -19.9 / -12.7 / +7.2 |
| 500 | -34.5 / -25.2 / +9.3 | -33.1 / -22.4 / +10.6 | -17.9 / -20.2 / -2.3 |
| 630 | -34.1 / -18.9 / +15.2 | -28.1 / -17.1 / +11.0 | -19.5 / -16.6 / +2.9 |
| 800 | -36.1 / -23.2 / +13.0 | -31.5 / -19.3 / +12.2 | -22.8 / -18.1 / +4.7 |
| 1000 | -35.6 / -23.3 / +12.3 | -31.4 / -17.9 / +13.5 | -28.0 / -16.9 / +11.1 |
| 1250 | -35.1 / -25.6 / +9.5 | -33.4 / -21.6 / +11.8 | -26.2 / -20.2 / +6.0 |
| 1600 | -34.3 / -27.5 / +6.9 | -34.0 / -21.4 / +12.6 | -27.9 / -19.8 / +8.1 |
| 2000 | -36.1 / -28.8 / +7.3 | -35.8 / -23.1 / +12.7 | -31.1 / -19.9 / +11.3 |
| 2500 | -41.0 / -30.4 / +10.6 | -34.6 / -25.9 / +8.7 | -29.2 / -22.2 / +6.9 |
| 3150 | -45.2 / -32.1 / +13.0 | -35.6 / -28.0 / +7.6 | -29.3 / -23.7 / +5.6 |
| 4000 | -47.9 / -34.2 / +13.7 | -36.8 / -30.6 / +6.2 | -26.4 / -25.5 / +0.8 |
| 5000 | -53.0 / -36.7 / +16.3 | -43.0 / -33.2 / +9.8 | -28.6 / -27.0 / +1.6 |
| 6300 | -57.9 / -39.2 / +18.7 | -48.7 / -35.2 / +13.5 | -26.2 / -26.8 / -0.6 |
| 8000 | -63.7 / -41.9 / +21.8 | -52.8 / -36.0 / +16.8 | -26.1 / -25.9 / +0.2 |
| 10000 | -65.7 / -44.1 / +21.6 | -56.6 / -35.4 / +21.2 | -27.7 / -25.6 / +2.1 |
| 12500 | -63.6 / -45.2 / +18.4 | -56.0 / -35.0 / +20.9 | -31.2 / -24.9 / +6.3 |
| 16000 | -68.1 / -46.7 / +21.4 | -62.4 / -35.7 / +26.8 | -38.4 / -25.5 / +12.9 |

| fc (Hz) | mainA 40-72: ref / app / diff | mainA2 72-104: ref / app / diff | break 104-128: ref / app / diff |
|---|---|---|---|
| 25 | -26.5 / -32.3 / -5.8 | -27.7 / -30.6 / -2.9 | -40.1 / -34.0 / +6.1 |
| 31.5 | -16.4 / -25.3 / -8.9 | -17.7 / -24.3 / -6.7 | -29.9 / -25.5 / +4.5 |
| 40 | -20.1 / -6.3 / +13.8 | -21.4 / -7.7 / +13.7 | -33.6 / -11.0 / +22.6 |
| 50 | -11.6 / -6.4 / +5.2 | -11.4 / -7.4 / +4.0 | -16.5 / -9.3 / +7.2 |
| 63 | -5.3 / -13.2 / -7.9 | -5.4 / -13.8 / -8.4 | -9.0 / -15.0 / -6.1 |
| 80 | -8.5 / -14.1 / -5.7 | -8.5 / -14.5 / -6.0 | -10.7 / -15.1 / -4.4 |
| 100 | -9.8 / -14.3 / -4.5 | -10.0 / -15.0 / -5.0 | -9.8 / -16.3 / -6.5 |
| 125 | -9.2 / -7.5 / +1.6 | -9.2 / -8.6 / +0.6 | -7.8 / -10.1 / -2.3 |
| 160 | -11.6 / -21.8 / -10.2 | -11.6 / -22.0 / -10.4 | -9.1 / -22.6 / -13.5 |
| 200 | -11.9 / -24.3 / -12.4 | -11.8 / -22.4 / -10.6 | -9.5 / -23.4 / -13.9 |
| 250 | -15.7 / -19.1 / -3.4 | -15.7 / -19.2 / -3.6 | -12.5 / -19.0 / -6.5 |
| 315 | -17.9 / -17.4 / +0.6 | -16.5 / -17.5 / -0.9 | -13.4 / -17.9 / -4.5 |
| 400 | -21.6 / -12.8 / +8.9 | -19.7 / -10.2 / +9.5 | -16.5 / -7.1 / +9.3 |
| 500 | -19.1 / -20.0 / -0.9 | -18.2 / -14.5 / +3.7 | -14.1 / -9.9 / +4.1 |
| 630 | -20.3 / -15.9 / +4.4 | -20.6 / -11.9 / +8.8 | -15.3 / -15.5 / -0.2 |
| 800 | -26.4 / -17.5 / +8.9 | -23.3 / -15.6 / +7.7 | -16.8 / -13.5 / +3.3 |
| 1000 | -26.6 / -16.0 / +10.6 | -26.9 / -14.8 / +12.2 | -18.6 / -10.7 / +7.9 |
| 1250 | -29.1 / -19.3 / +9.8 | -26.2 / -15.8 / +10.4 | -20.4 / -14.0 / +6.4 |
| 1600 | -25.5 / -18.9 / +6.6 | -26.4 / -16.7 / +9.6 | -20.8 / -13.2 / +7.5 |
| 2000 | -28.5 / -18.6 / +10.0 | -29.0 / -17.4 / +11.6 | -27.8 / -17.4 / +10.4 |
| 2500 | -27.8 / -20.8 / +7.0 | -28.0 / -19.4 / +8.6 | -27.8 / -18.1 / +9.8 |
| 3150 | -27.9 / -22.5 / +5.3 | -27.8 / -21.2 / +6.6 | -26.9 / -21.9 / +5.0 |
| 4000 | -24.8 / -25.3 / -0.4 | -25.4 / -23.1 / +2.3 | -28.6 / -22.0 / +6.6 |
| 5000 | -26.7 / -27.9 / -1.1 | -27.4 / -25.9 / +1.4 | -29.5 / -24.7 / +4.8 |
| 6300 | -23.6 / -29.3 / -5.7 | -24.3 / -27.6 / -3.3 | -27.4 / -27.7 / -0.3 |
| 8000 | -23.3 / -28.4 / -5.1 | -23.8 / -27.7 / -3.9 | -26.0 / -29.6 / -3.6 |
| 10000 | -24.5 / -27.5 / -2.9 | -25.6 / -27.6 / -2.1 | -28.5 / -32.6 / -4.1 |
| 12500 | -28.2 / -26.5 / +1.7 | -29.6 / -27.1 / +2.4 | -33.7 / -35.4 / -1.7 |
| 16000 | -35.7 / -26.8 / +8.9 | -37.2 / -27.7 / +9.5 | -47.0 / -40.2 / +6.8 |

| fc (Hz) | breakEnd 128-136: ref / app / diff | mainB 136-184: ref / app / diff | outro 184-200: ref / app / diff |
|---|---|---|---|
| 25 | -28.7 / -38.8 / -10.1 | -26.8 / -30.5 / -3.7 | -26.5 / -32.1 / -5.5 |
| 31.5 | -18.1 / -29.6 / -11.5 | -16.7 / -23.9 / -7.2 | -16.4 / -26.6 / -10.3 |
| 40 | -22.2 / -15.6 / +6.6 | -20.4 / -7.7 / +12.8 | -20.3 / -6.0 / +14.2 |
| 50 | -16.8 / -13.0 / +3.8 | -11.9 / -7.4 / +4.5 | -11.5 / -6.1 / +5.5 |
| 63 | -9.4 / -17.9 / -8.6 | -5.7 / -13.8 / -8.1 | -5.3 / -12.9 / -7.6 |
| 80 | -11.0 / -17.1 / -6.1 | -8.9 / -14.5 / -5.6 | -8.4 / -13.8 / -5.4 |
| 100 | -9.7 / -17.9 / -8.2 | -9.9 / -15.0 / -5.0 | -9.6 / -13.9 / -4.3 |
| 125 | -8.1 / -11.1 / -2.9 | -9.5 / -8.6 / +0.9 | -9.1 / -7.1 / +2.0 |
| 160 | -9.1 / -21.8 / -12.8 | -11.3 / -22.0 / -10.7 | -11.4 / -21.6 / -10.2 |
| 200 | -9.7 / -22.2 / -12.5 | -12.1 / -22.4 / -10.3 | -11.9 / -24.0 / -12.2 |
| 250 | -12.6 / -17.7 / -5.1 | -15.1 / -19.2 / -4.2 | -15.4 / -18.6 / -3.2 |
| 315 | -13.7 / -17.7 / -4.0 | -15.6 / -17.4 / -1.7 | -15.4 / -18.9 / -3.5 |
| 400 | -17.2 / -6.1 / +11.2 | -18.6 / -10.2 / +8.4 | -20.8 / -12.6 / +8.1 |
| 500 | -15.1 / -9.0 / +6.0 | -16.4 / -14.5 / +1.9 | -20.4 / -22.5 / -2.1 |
| 630 | -15.7 / -14.3 / +1.4 | -18.1 / -11.8 / +6.2 | -23.8 / -17.1 / +6.7 |
| 800 | -16.7 / -11.6 / +5.2 | -19.6 / -15.7 / +3.9 | -25.0 / -19.4 / +5.6 |
| 1000 | -16.9 / -10.1 / +6.8 | -23.3 / -14.8 / +8.5 | -28.4 / -18.1 / +10.3 |
| 1250 | -17.7 / -13.1 / +4.6 | -26.4 / -15.8 / +10.7 | -29.5 / -21.5 / +8.0 |
| 1600 | -17.8 / -12.5 / +5.3 | -25.4 / -16.7 / +8.7 | -29.5 / -21.5 / +8.0 |
| 2000 | -21.4 / -16.3 / +5.2 | -28.6 / -17.4 / +11.1 | -30.6 / -22.5 / +8.0 |
| 2500 | -24.4 / -17.3 / +7.1 | -27.8 / -19.4 / +8.4 | -32.5 / -25.1 / +7.4 |
| 3150 | -26.1 / -20.4 / +5.8 | -27.9 / -21.2 / +6.7 | -33.6 / -27.2 / +6.4 |
| 4000 | -27.7 / -20.5 / +7.3 | -25.0 / -23.2 / +1.9 | -34.7 / -29.8 / +4.9 |
| 5000 | -29.2 / -22.6 / +6.6 | -27.0 / -26.1 / +0.9 | -36.2 / -32.4 / +3.8 |
| 6300 | -27.8 / -24.2 / +3.6 | -23.8 / -27.8 / -4.1 | -37.9 / -35.2 / +2.7 |
| 8000 | -27.9 / -24.9 / +3.0 | -23.5 / -27.9 / -4.4 | -38.8 / -38.3 / +0.5 |
| 10000 | -28.2 / -26.1 / +2.2 | -25.0 / -27.8 / -2.8 | -40.3 / -41.3 / -0.9 |
| 12500 | -30.5 / -26.7 / +3.8 | -28.6 / -27.2 / +1.4 | -42.6 / -43.8 / -1.2 |
| 16000 | -38.0 / -28.2 / +9.8 | -36.0 / -27.8 / +8.2 | -45.3 / -47.4 / -2.1 |

Reading the band tables (measured; the owner of each element is my attribution, not a measurement of the element):

- Low end, every main section: the record puts its energy at 63 Hz (-5.1 to -5.7 dB re total) with 80-125 Hz at -8 to -10 and 160-200 Hz still at -11 to -12 (smooth, no tonal peak above 3 dB prominence in the reference's 100-330 Hz mean spectrum; the only peak is 309.5 Hz in the main sections). The app puts its energy at 40-50 Hz (-6 dB) and 125 Hz (-7), is 8 dB low at 63 Hz, 5-6 dB low at 80-100 Hz and 10-12 dB low at 160-200 Hz in every section. The 125 Hz band is the bass fundamental (123.8 Hz, -12 dB peak in the intro mean spectrum).
- 160-200 Hz: from the solo renders (mainA, 16 bars, contribution re the mix total) kick contributes -23 / -25 dB and bass -31 / -35 dB there, stab -36 / -34. Nothing in the app fills those bands, while the record has them 3 dB under its 63 Hz peak. The shape (smooth, 63 Hz peak falling slowly to 200 Hz) matches a kick whose pitch sweep and body decay linger through 100-250 Hz, which is E1's question.
- 300 Hz to 3 kHz: in the intro the record has nothing (-24 dB at 315 falling to -35 at 500-1250 Hz) and the app has a 400 Hz bump at -12.7 (+17 dB) with the bass harmonic stack behind it. In mainA the app is +9 at 400 and +9 to +11 at 800-2000 Hz; in the break it is +9 at 400, +8 at 1 kHz, +10 at 2-2.5 kHz. The solo renders put the stab at -13 to -16 dB at 630-2000 Hz (re the mix) and the bass at -14 at 400 Hz: those two are the mid excess.
- 4-16 kHz: the app is -5 dB at 6.3-8 kHz in mainA/mainA2/mainB (the record has -23.3 to -23.8 at 6.3-10 kHz, which is the hats; the app's closed hat alone gives -37 at 6.3 kHz and the open hat -25), about right at 4-5 kHz, and +9 dB at 16 kHz (the record falls off above 12.5 kHz; see section 3). In the intro the record has essentially nothing above 4 kHz (-48 at 4 kHz to -68 at 16 kHz); the app's intro has a -34 to -47 dB tail (+14 to +22 dB over the record). In the intro only kick, sub and bass play (`song.js`), so that tail comes from them; the kick solo (mainA) is -36.8 dB at 4 kHz and -47 at 16 kHz re the mix total, the same size as the intro's -34 / -47, so the kick's drive and click harmonics are the likely source (inferred, not isolated in an intro solo); see section 5.
- Break: the record loses 40 Hz (-33.6 against -20.4, a 13 dB drop) and 31.5 Hz (-29.9 against -16.5): the break has no sub drone at 35 Hz and almost no 40 Hz; the app keeps 40 Hz at -11 (kick at level 0.6 plus the sub), 22.6 dB too much.

## 1b. Loudness curve (K-weighted, per 4 bars)

Method: reference and app resampled 44.1 to 48 kHz (`scipy.signal.resample_poly` 160/147), K-weighting coefficients from `tools/score.py` (`kweight_coeffs`, libebur128 constants), stereo power sum, mean over the window, -0.691 + 10 log10. No gating, windows are exactly 4 bars (7.62 s) on each file's own grid. Section values agree with the coordinator's gated numbers to 0.1 LU (ref intro -10.56 against -10.55; app mainA -11.24 against -11.25). Script `loud2.py`.

| bars | ref LUFS | app LUFS | app - ref |
|---|---|---|---|
| 0-3, 4-7, 8-11, 12-15 (intro) | -10.55, -10.57, -10.57, -10.54 | -12.50 (all four) | -1.95 |
| 16-19, 20-23 (intro2) | -10.53, -10.54 | -12.01, -12.01 | -1.5 |
| 24-27, 28-31, 32-35, 36-39 (build) | -11.67, -12.02, -12.30, -12.44 | -11.60, -11.59, -11.61, -11.97 | +0.1, +0.4, +0.7, +0.5 |
| 40-71 (mainA, eight windows) | -10.20 to -10.33 | -11.23 to -11.26 | -0.9 to -1.0 |
| 72-99 (mainA2) | -10.17 to -10.49 | -10.65 to -10.66 | -0.4 falling to -0.2 |
| 100-103 | -10.63 | -10.53 | +0.1 |
| 104-127 (break, six windows) | -12.92, -12.72, -12.48, -12.41, -12.41, -12.40 | -9.02 (all six) | +3.9 falling to +3.4 |
| 128-135 (breakEnd) | -12.29, -12.18 | -9.01, -8.74 | +3.3, +3.4 |
| 136-179 (mainB) | -9.78 to -9.94 | -10.64 to -10.66 | -0.7 to -0.9 |
| 176-183 | -10.09, -10.09 | -10.66, -10.52 | -0.6, -0.4 |
| 184-199 (outro) | -10.41 to -10.50 | -12.02 to -12.05 | -1.6 |

- The record's loudness is flat inside each section (spread 0.1 LU in intro, mainA, outro) and steps between them: intro -10.55, build falls from -11.7 to -12.4 across its 16 bars (a gradual 0.8 LU fall, not a step), mainA -10.24 (+2.2 LU at bar 40), mainA2 -10.3 sliding to -10.6 by bar 100, break -12.4 to -12.9, mainB -9.9 (the loudest, +2.5 LU at bar 136), outro -10.4.
- The break's drop at bar 120 is NOT a loudness event: per-bar loudness in the record is -12.0 to -13.2 across bars 104-135 with a 4-bar rhythm, no step at 120 (bars 116-119 mean -12.4, bars 120-123 mean -12.4). It is spectral (section 3).
- The app's curve has the wrong shape in the break. The record falls 2.1 LU (mainA2 end -10.5 to break -12.4); the app rises 1.6 LU (-10.65 to -9.02), and its rms rises 0.8 dB over mainA (-11.14 against -11.93 dBFS) while K-weighted loudness rises 2.2 LU, so energy has moved from the lows to the mids: the app's break loses 40-50 Hz (kick level 0.6) but has 400 Hz to 2.5 kHz at -7 to -17 dB re total (stab, lead, pad, perc, shaker all play), K-weighting counts those 2 to 3 dB more than the lows (crest falls to 5.8). Break is 3.4 to 3.9 LU too loud; intro 1.9 too quiet; mainB 0.7 too quiet; outro 1.6 too quiet.
- 3 s short-term (hop 0.5 s) max / median / min per section, ref against app: mainA -9.8/-10.3/-10.5 against -11.0/-11.3/-11.5; break -11.7/-12.5/-13.4 against -8.8/-9.0/-9.2; mainB -9.5/-10.0/-10.4 against -10.0/-10.7/-11.3. The record's break is more dynamic (1.7 LU between max and min) than the app's (0.4).

## 1c. True peak and crest factor per section

Method: sample peak = max |sample| over both channels; true peak = `resample_poly(x, 4, 1)` per channel (as `tools/score.py`), max abs; rms = 10 log10 of the mean of L² and R² over the window; crest = sample peak minus rms; PLR = true peak minus the section's ungated LUFS. Script `peaks.py`.

| section | ref sample pk | ref TP | ref rms | ref crest | ref PLR | app sample pk | app TP | app rms | app crest | app PLR |
|---|---|---|---|---|---|---|---|---|---|---|
| intro | -0.49 | -0.49 | -11.17 | 10.68 | 10.07 | -5.53 | -5.50 | -12.40 | 6.87 | 7.00 |
| intro2 | -0.52 | -0.51 | -11.15 | 10.64 | 10.02 | -5.54 | -5.11 | -12.20 | 6.67 | 6.90 |
| build | -0.52 | -0.51 | -13.23 | 12.71 | 11.59 | -5.18 | -4.19 | -12.46 | 7.28 | 7.50 |
| mainA | -0.21 | -0.04 | -11.22 | 11.00 | 10.21 | -5.24 | -4.32 | -11.93 | 6.69 | 6.92 |
| mainA2 | -0.24 | -0.23 | -11.32 | 11.08 | 10.11 | -5.03 | -3.77 | -11.97 | 6.95 | 6.87 |
| break | -0.42 | -0.38 | -14.23 | 13.81 | 12.17 | -5.36 | -5.14 | -11.14 | 5.78 | 3.88 |
| breakEnd | -0.51 | -0.45 | -13.96 | 13.45 | 11.79 | -5.18 | -4.26 | -11.59 | 6.41 | 4.61 |
| mainB | -0.18 | 0.00 | -11.01 | 10.83 | 9.92 | -4.76 | -4.38 | -11.98 | 7.22 | 6.26 |
| outro | -0.39 | -0.29 | -11.18 | 10.79 | 10.14 | -5.53 | -5.23 | -12.24 | 6.71 | 6.81 |

(whole song true peak: reference +0.004 dBTP, app -3.77 dBTP.) The reference peaks 4.3 to 5.3 dB higher than the app yet has 4 dB MORE crest (10.7 to 13.8 against 5.8 to 7.3). The app's output is held 4.7 dB below full scale and squeezed: the master's limiter `ceiling` (-4.2 dB) is applied before the clipper at `clip` -0.5 dBFS (`processors.js` limiter: compressor, then `out` gain `ceiling`, then the shaper), so the clipper never engages (app sample peak -4.76 at most) and the ceiling really is -4.2 dB. That is a master problem independent of the sources: see section 4.

## 2. Stereo: mid/side per band, reference against the app

Method: mid = (L+R)/2, side = (L-R)/2, Welch 16384 as in section 0, side power over mid power per band, in dB (S/M). A pair of equal-level channels with correlation rho has S/M = (1-rho)/(1+rho), so "equal-level rho" below is a conversion of S/M, not a separate measurement. L and R level balance was also measured (last number in each cell): it is within 0.1 to 1.4 dB everywhere in both files, so neither is panned off-centre as a whole. Script `stereo.txt` output (per 1/3 octave, all nine sections) is in the scratchpad; the coarse table is below. MP3 caveat: at 192 kbps joint stereo the side channel above about 10 kHz is coarsely coded, so side figures above 10 kHz are less certain than the rest.

S/M in dB (equal-level rho), bands 20-120 / 120-300 / 300-1k / 1-4k / 4-10k / 10-16k:

| window | file | 20-120 | 120-300 | 300-1k | 1-4k | 4-10k | 10-16k |
|---|---|---|---|---|---|---|---|
| intro 0-16 | ref | -58.3 (1.00) | -28.4 (1.00) | -11.0 (0.85) | -2.1 (0.24) | -4.3 (0.46) | -3.6 (0.40) |
| intro 0-16 | app | -88.2 (1.00) | -89.8 (1.00) | -85.4 (1.00) | -75.9 (1.00) | -68.5 (1.00) | -65.7 (1.00) |
| mainA 40-72 | ref | -43.7 (1.00) | -19.2 (0.98) | -2.4 (0.27) | -6.8 (0.65) | -10.1 (0.82) | -12.8 (0.90) |
| mainA 40-72 | app | -36.8 (1.00) | -28.8 (1.00) | -8.5 (0.75) | -6.5 (0.64) | -6.2 (0.61) | -12.0 (0.88) |
| break 104-120 | ref | -37.8 (1.00) | -17.8 (0.97) | -3.4 (0.37) | -2.8 (0.31) | -5.2 (0.54) | -6.0 (0.60) |
| break 104-120 | app | -29.6 (1.00) | -20.4 (0.98) | -13.8 (0.92) | -12.1 (0.88) | -9.9 (0.82) | -8.2 (0.74) |
| break 120-128 | ref | -39.0 (1.00) | -17.7 (0.97) | -3.2 (0.36) | -3.3 (0.36) | -3.1 (0.35) | -3.7 (0.40) |
| mainB 136-184 | ref | -42.8 (1.00) | -17.9 (0.97) | -3.5 (0.38) | -6.3 (0.62) | -10.1 (0.82) | -13.2 (0.91) |
| mainB 136-184 | app | -34.4 (1.00) | -24.9 (0.99) | -9.9 (0.81) | -7.6 (0.70) | -7.7 (0.71) | -13.3 (0.91) |

Findings (measured unless marked):

1. Is the reference's low end mono? Yes. Below 120 Hz the side is 44 dB under the mid in mainA and mainB (58 dB in the intro, 38 to 39 dB in the break); by 1/3 octave it is -42 to -69 dB from 25 to 125 Hz in the main sections, and rises to about -34 dB at 160 Hz, -19 dB at 200 Hz, -11 dB at 250 Hz, -4 dB at 315 Hz. So the record is effectively mono up to about 125 Hz and opens up above 160 Hz. The residual side at 25-100 Hz (-42 to -57 dB) is codec noise or a tiny phase offset, not content.
2. The app is mono below 120 Hz too, but less perfectly in the mixed sections: -34 to -37 dB (against -43 in the record) because the sidechained stab and the reverb send leak low-frequency side into the mix. Solo kick, bass: -80 to -100 dB S/M (fully mono). The app in its intro is digitally mono everywhere (S/M -65 to -90 dB at all bands) because only kick, sub and bass play; the record's intro is wide above 300 Hz (S/M -11 dB at 300-1k, -2 dB at 1-4k, -4 dB at 4-16k) but at -35 to -65 dB absolute level, which is its faint noise sweeps and reverb, not a lead sound.
3. 120-300 Hz: the record is more mono than wide at 120-200 Hz (-19 to -34 dB) and the app is wider (-29 for mainA 120-300 coarse band; this is mostly the 250 Hz and 160 Hz bands where the app is -24 and -26 against the record's -12 and -23 at 250 and 160 Hz; the 1/3-octave table shows the record becoming wide from 250 Hz up while the app stays at -21 to -24 dB at 250 Hz).
4. 300 Hz-1 kHz: the record is much wider than the app in every main section: S/M -2.4 dB (rho about 0.27) against the app's -8.5 dB (rho 0.75) in mainA; -3.5 against -9.9 in mainB; -3.4 against -13.8 in the break. The stab (and whatever else lives there) is therefore about 6 dB wider in the record. At 1-4 kHz both are about -6.5 dB in mainA (match), but in the break the record is -2.8 dB against -12.1 (9 dB wider).
5. 4-10 kHz: the record is narrower than the app: -10.1 dB against -6.2 dB in mainA (the app is 4 dB wider), -10.1 against -7.7 in mainB. 10-16 kHz matches (-12.8 against -12.0). In the break the record is wide at 4-10 kHz (-5.2 and -3.1 dB at 120-128) while the app is -9.9. The app's closed and open hats are near-mono on their own (solo S/M -24 to -26 dB at 6-16 kHz, pans of -0.08 and +0.08 only), so the app's 4-10 kHz width in mainA comes from the stab's upper harmonics (solo stab S/M -1.9 dB at 6.3 kHz, -0.7 dB at 10 kHz, from the widener at width 1.1 and detuned voices) and the reverb/delay sends. The record's hats are therefore more mono than the app's HF content, and the record's stab is wider in the mids but, by the 4-10 kHz figure, not brighter-and-wider. (Inference from solo S/M of the app's tracks; the record cannot be soloed without stems.)
6. Break 120-128: every band above 300 Hz is at S/M -3 to -3.7 dB (rho about 0.35-0.40): the steady HF bed that replaces the hats (section 3) is wide noise, as wide as the intro's faint sweeps (-2 to -4 dB).
7. App widener settings: only the stab has one (`widener width 1.1`, `monoBelow` unset). A 1.1 width increases S by 0.8 dB, which changes S/M by +0.8 dB only; the stab's own S/M at 315-2.5k is -4 to -8 dB (solo mainA), and the record's mix at 300-1k is -2.4 dB. To match, the stab's width would have to be roughly 1.6 to 2.0 (estimate: a 3-6 dB side boost needs width 1.4 to 2.0 times the existing side), and `monoBelow: 250` should be set on the stab so that its sidechain/low harmonics stay centred as the record's 120-250 Hz is. (Estimate, not rendered; width up to 3 is in range of the widener spec.)

## 3. The reference master's apparent processing

### 3a. Spectral tilt (measured)

Least-squares slope of the long-term power spectral density (band power divided by band width, 1/3-octave bands, dB per octave; pink noise is -3, white 0), mid+side:

| section | 63-630 Hz ref / app | 630 Hz-16 kHz ref / app | 63 Hz-16 kHz ref / app |
|---|---|---|---|
| intro | -12.6 / -5.7 | -11.4 / -8.9 | -11.0 / -7.3 |
| build | -7.2 / -4.6 | -4.8 / -5.2 | -6.4 / -4.8 |
| mainA | -7.8 / -4.4 | -3.8 / -6.0 | -5.8 / -4.9 |
| mainA2 | -7.5 / -2.8 | -4.4 / -6.7 | -6.0 / -4.8 |
| break | -5.2 / -2.1 | -7.5 / -8.8 | -6.7 / -5.4 |
| mainB | -6.7 / -2.8 | -4.8 / -6.8 | -6.0 / -4.8 |
| outro | -8.2 / -5.0 | -7.2 / -9.5 | -7.9 / -6.8 |

In the main sections the record is close to pink above 630 Hz (-3.8 to -4.8 dB/oct) and steep below it (-7 to -8 dB/oct). The app is the opposite: shallow below 630 Hz (-3 to -4 dB/oct) and 2 to 3 dB/oct steeper above 630 Hz (-6 to -7). In plain terms the app has too much 300 Hz-3 kHz and too little at both extremes relative to the record's 63 Hz peak and 6-10 kHz hats. The intro's record slope (-11 dB/oct) is the steepest because it is kick, sub and bass only.

### 3b. The 4-16 kHz level, intro against mainA: hats or a filter?

Method: band-pass (4th order Butterworth, zero phase) the mid signal, mean square per bar, 200 bars (script `hf2.py`; the bars 0-52 and 100-140 are in the scratchpad `hf2.txt`); then the same bands per 16th step, averaged over the section's bars (`hf.py`); then the spectral shape of the off-beat hits (steps 3, 7, 11, 15, the first 4096 samples of each, Hann window, 1/3-octave sums, `hits.py`). Per-bar levels, dBFS squared, ref (mid):

| bar | 4-8 kHz | 8-12 kHz | 12-16 kHz | note |
|---|---|---|---|---|
| 0-2 | -66 to -64 | -81 to -79 | -82 to -81 | intro floor (about -71 dB mean in 6-12 kHz) |
| 3, 7, 11, 15 | -63, -60, -59, -57.5 | -75.5, -73, -72.5, -71 | -78, -77, -75, -73 | +7 to +10 dB over their neighbours: the 4-bar noise sweeps |
| 16 | -58.4 | -72.5 | -73.3 | start of intro2 |
| 20, 23 | -52.2, -47.8 | -66.6, -62.2 | -71.6, -70.3 | rising 1.5 dB per bar over bars 16-23 |
| 24 | -43.7 | -48.9 | -55.9 | step of +4 to +13 dB at the start of build |
| 32, 39 | -36.5, -33.0 | -40.1, -35.0 | -47.5, -42.8 | rising about 0.75 dB per bar over bars 24-39 |
| 40-71 (mainA) | -32.5 | -34.7 | -42.0 | flat to 0.1 dB for 32 bars |
| 136-183 (mainB) | -32.4 | -34.7 | -42.0 | the same values as mainA |

Findings:

- The jump from the intro to mainA in 8-12 kHz is 46 dB (-80 to -34.7). It arrives in three pieces, not one: a 1.5 dB per bar rise during intro2 (bars 16 to 23, about 11 dB in all), a step of about 13 dB at bar 24, then a 0.75 dB per bar rise during build (bars 24 to 39, about 14 dB), reaching the plateau at bar 40.
- The off-beat hit spectrum does not change shape during the build ramp. Off-beat hit energy in 1/3-octave bands (dB, `hits.py`): at bars 24-27 the 8 kHz band is 22.7 and the 16 kHz band 9.6 (difference -13.1); bars 28-31 27.4 and 14.6 (-12.8); 32-35 30.8 and 18.0 (-12.8); 36-39 33.4 and 20.5 (-12.9); mainA 34.5 and 21.5 (-13.0). The 8, 10, 12.5 and 16 kHz bands each rise by 11.8, 12.4, 12.0 and 11.9 dB from bars 24-27 to mainA. A master lowpass opening through this region would raise 16 kHz far more than 8 kHz; all four bands rise by the same amount within 0.6 dB. This is a gain ramp on the hat material (a fade-in, an automated level), not a master filter. The bars 16-23 rise is also gain-like (4-8, 8-12 and 12-16 kHz all rise 10 to 11 dB over 8 bars at about the same rate, 1.3 to 1.5 dB per bar).
- The rhythmic profile says the same: in build and mainA the 6-12 kHz energy peaks on steps 3, 7, 11, 15 (+4.8 dB over the section mean) and sits 6 to 13 dB under the mean on steps 1, 5, 9, 13 (the kick steps) and between: a hat grid; the app's HF has a similar grid but with gaps of -35 to -62 dB (its 10th-percentile step is -37 dB under the mean, against the record's -7 dB). The record has sustained HF between hits (ring and reverb); the app's hats are dry and clean.
- The intro's own 4-16 kHz content (-71 dB mean in 6-12 kHz) is below what any master filter change would explain: it is at the level of the codec floor plus the faint sweeps. There is no evidence in the reference of a master filter that opens at bar 40 or at any other bar. The conclusion: the 4-16 kHz presence is the hats (and clap, stab upper partials) entering and fading in.
- The app instead steps: its 8-12 kHz goes -54 (bars 0-15, the kick only) to -45.5 at bar 16 (+9 dB, hat_closed A enters) to -37 at bar 24 (+8 dB, hat_open and clap) and stays flat to bar 38, then equals the record from bar 40 (-36 to -38 against -34.7). In bars 0-15 the app is 26 dB above the record in 8-12 kHz (-54 against -80), 22 dB at 4-8 kHz, and 25 dB at 12-16 kHz: those are the kick's click and drive harmonics (source problem, section 5). Both files agree at plateau within 2 to 3 dB.

### 3c. Any lowpass in the break? (the drop at bar 120)

- The break is not one section for the reference. Per-bar band levels (table in `hf2.txt`): at bar 104 the 4-8 and 12-16 kHz bands step down 5.7 and 11 dB (the hats thin out); at bar 120 they step down again, 4-8 kHz by 7 dB (-37.3 to -44.3), 8-12 kHz by 8 dB (-39.7 to -47.6) and 12-16 kHz by 12 dB (-53.5 to -65.7). 1-4 kHz does not move (-32.8 to -32.8), neither does 300 Hz-1 kHz (-24 to -26), and the low band is unchanged (-16.1 dBFS squared at 40-200 Hz on both sides). The 12-16 kHz band then climbs back over five bars (-65.7, -58.9, -53.8, -50.0, -48.1) and stays at -48.1 for bars 124-127, 5 dB above its level before bar 120.
- After bar 120 the 16th-step profile in 3-6, 6-12 and 12-16 kHz is flat to within 0.6 dB at every step (build/mainA hats are +4.8 dB on steps 3/7/11/15): the hat grid and the clap/stab transients above 3 kHz are gone and a steady wide noise bed (S/M -3 dB) remains. So the drop at bar 120 is the removal of the rhythmic HF elements plus a rising noise (E3's riser or sweep), and 1-4 kHz is untouched. A lowpass in the master with a cutoff below 4 kHz is ruled out (1-4 kHz does not change); a cutoff above about 8 kHz cannot produce a 7 dB step in 4-8 kHz.
- Fitting a lowpass anyway. Ratio of the long-term mean spectrum (Welch 4096, mid, 1/6-octave means) to mainA's at 8, 9, 10.1, 11.3, 12.7, 14.3, 16, 18 kHz, with a free offset and a Butterworth magnitude of order n, least squares (`lpfit.py`):
  - bars 104-119: ratio -4.8, -4.2, -8.2, -8.7, -9.5, -14.8, -20.4, -32.6 dB. Order 8 fits best (fc 12.6 kHz, offset -6.2 dB, rms residual 1.7 dB); order 6 (fc 11.5 kHz, 2.1 dB); order 4 (fc 9.4 kHz, 3.2 dB); order 2 (fc about 3.2 kHz, 5.2 dB, a bad fit). The shape is a shoulder at about 12 kHz falling about 40 dB per octave: much steeper than the 12 dB per octave biquad `filter` (cutoff, q) in the app's master (`lp`), which no setting can reproduce. The off-beat hits show the same thing directly: 16 kHz band against 8 kHz band is -34 dB in the break (28.0 to -6.0) against -13 dB in mainA.
  - bars 120-127: ratio -15.9, -13.8, -8.6, -10.2, -6.4, -12.9, -15.0, -28.9 dB (noise bed against hats, so not a filter shape); no fit is better than 3.3 dB rms.
  - Estimate of what it is: the hats in the break are a different, duller voicing with little above 12 kHz (or the encoder's own band-limiting at that bit allocation), not a master lowpass. The `lp` cutoff of 6000 in GUIDANCE_V2's `breakLate` section is not supported: a 6 kHz 12 dB per octave lowpass would put 8 kHz at -6 dB, 10 kHz at -9 dB, 12.7 kHz at -13 dB and 16 kHz at -17 dB against the measured -4.8, -8.2, -9.5, -20.4, i.e. it would be wrong by up to 4 dB at 12.7 kHz and would cut 1-4 kHz by 0.5-3 dB, which the record does not do.
- Whole-record ceiling: the record's spectrum ends at about 19.5 kHz (mean PSD -85 dB at 19 kHz, -140 dB at 20 kHz) in every section, which is the MP3 encoder's lowpass (192 kbps), not a mix choice. It is not in the app and does not need to be.

### 3d. Clipping and limiting signature (measured)

Method: sample peak and 4x true peak as in 1c; per-beat peak = max |x| over the first 40 ms after each beat (21,000 samples apart) on the section's own grid; counts of samples within d dB of the section's maximum; `clip.py`.

- Reference intro (kick, sub, bass only): per-beat peaks are -0.57 to -0.54 dB at the 5th to 95th percentile (std 0.01 dB, 64 beats); per-bar maximum -0.55 median, std 0.017 dB; 0.17 % of all samples (2,287) are within 0.1 dB of the section maximum. So in the intro the kick peak is pinned at -0.56 dBFS in every beat: a hard ceiling at about -0.55 dBFS (0.94 linear), on the decoded MP3 (so the pre-encode ceiling may be slightly different; the codec adds up to 0.3 dB of overshoot, seen as the whole-song sample peak of -0.18).
- Reference mainA and mainB (32 and 48 bars): per-beat peaks p5 -0.55, p50 -0.48, p95 -0.37 dB (std 0.06 to 0.07); 0.18 % / 0.14 % of samples within 0.5 dB of the maximum; per-bar peak std 0.05 to 0.06 dB. Still pinned at about -0.5 dB, a little looser because other material rides over the kick.
- Reference break: the per-beat peaks spread (p5 -1.61, p50 -0.95, p95 -0.48, std 0.40): the kick is at level 0.6 or lower and the ceiling is only reached on some beats. A brickwall that is always acting would pin them; here it acts when the peaks reach it. That is the signature of a ceiling (hard clip or fast limiter) at about -0.5 dBFS, not of heavy compression.
- Inter-sample overshoot of the reference: true peak minus sample peak is 0.00 to 0.17 dB per section (intro 0.00, mainA +0.17, mainB +0.18, outro +0.10), whole song true peak +0.004 dBTP: the mastering did not control true peak; the ceiling is a sample-peak ceiling. A hard clipper with oversampling off, or a sample-peak limiter, would give exactly this.
- App: the per-beat kick peaks are pinned at -5.8 dB (p5 -5.84, p50 -5.76, p95 -5.57, std 0.08, intro) and the section maxima are -5.0 to -5.5 dB; the true peaks are -3.8 to -5.5 dBTP, whole song -3.77. The app's ceiling is therefore about -5.5 dBFS, 5 dB below the record, and it is the limiter's compressor-plus-`ceiling` trim doing the work: the clipper at `clip` -0.5 dBFS never engages (only 4 to 38 samples lie within 0.1 dB of the maximum; in the record 2,287 do in the intro).
- The master's effect on the mix (render of mainA 16 bars with the same code, sets and bypasses from a scratch copy of `tools/render.js` that adds `--set path=value` and `--bypass id`; the repo's `render.js` is unchanged): before glue, saturator and limiter (eq, hp, lp only) the mix is at peak +3.1 dBFS, rms -6.5 dBFS, crest 9.6 dB, -5.5 LUFS; as shipped it is peak -5.2, rms -11.9, crest 6.7, -11.25 LUFS. The reference's mainA is peak -0.2, rms -11.2, crest 11.0, -10.26 LUFS. So the sources reach the master 5.8 LU too hot and about 3 dB of crest is lost in the master (including the Web Audio `DynamicsCompressorNode` automatic makeup gain: glue alone adds +1.4 dB, saturator +1.3 dB, limiter +2.1 dB at the given thresholds, which the -4.2 dB `ceiling` is cancelling).
- What gets the crest back (render of mainA 16 bars, all track `gain`s multiplied by 0.58 = -4.7 dB, impact 0.46): `limiter.ceiling` 0 and `threshold` -1.5 with glue and saturator bypassed: peak -1.0 dBFS, rms -10.55, crest 9.6, -9.5 LUFS (v2). With the saturator on: peak -0.43, rms -8.57, crest 8.1, -7.9 LUFS (v1; the saturator adds 1 dB of rms and costs 1.5 dB of crest here). Shipped chain with the same gains and `ceiling` 0: peak -1.4, rms -7.8, crest 6.4, -7.1 LUFS (too loud, crest unchanged). The reference's crest of 11 dB is not reachable by the master alone: the raw mix has 9.6 dB, and the record's 11 dB means the sustained body (kick tail, bass, stab) is lower against the kick peak than in the app.
