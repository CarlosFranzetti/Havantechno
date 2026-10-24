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
2. The app is mono below 120 Hz too, but less perfectly in the mixed sections: -34 to -37 dB (against -43 in the record) (the cause is not isolated; the solo kick and bass are -80 to -100 dB S/M, fully mono, while the solo stab is -5.8 dB at 125 Hz and the clap -27 dB, so the stab and the reverb/delay sends are the likely leak: inferred). The app in its intro is digitally mono everywhere (S/M -65 to -90 dB at all bands) because only kick, sub and bass play; the record's intro is wide above 300 Hz (S/M -11 dB at 300-1k, -2 dB at 1-4k, -4 dB at 4-16k) but at -35 to -65 dB absolute level, which is its faint noise sweeps and reverb, not a lead sound.
3. 120-300 Hz: at 160 and 200 Hz both files agree in mainA (S/M -23.4 and -19.0 dB in the record, -24.0 and -18.4 in the app). The record then opens up at 250 and 315 Hz (-11.9 and -4.1 dB) while the app stays narrower (-21.5 and -11.5 dB), which is why the coarse 120-300 Hz figure is -19.2 dB for the record and -28.8 dB for the app.
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
- The off-beat hit spectrum does not change shape during the build ramp. Off-beat hit energy in 1/3-octave bands (dB, `hits.py`): at bars 24-27 the 8 kHz band is 22.7 and the 16 kHz band 9.6 (difference -13.1); bars 28-31 27.4 and 14.6 (-12.8); 32-35 30.8 and 18.0 (-12.8); 36-39 33.4 and 20.5 (-12.9); mainA 34.5 and 21.5 (-13.0). The 8, 10, 12.5 and 16 kHz bands each rise by 11.8, 12.4, 12.0 and 11.9 dB from bars 24-27 to mainA. A master lowpass opening through this region would raise 16 kHz far more than 8 kHz; all four bands rise by the same amount within 0.6 dB. This is a gain ramp on the hat material (a fade-in, an automated level), not a master filter. The bars 16-23 rise is different and is not a pure gain ramp: over those 8 bars 4-8 kHz rises 10.6 dB and 8-12 kHz 10.3 dB (1.3 to 1.5 dB per bar) but 12-16 kHz only 3.0 dB (-73.3 to -70.3), and 1-4 kHz moves less than 4 dB. Something dark (a lowpassed noise or hat, or a lowpass opening on one element) fades in during intro2. That is not a master filter either: the master would also move 300 Hz-1 kHz, which stays at -36 dB in bars 16-22. (E3 owns what the element is.)
- The rhythmic profile says the same: in build and mainA the 6-12 kHz energy peaks on steps 3, 7, 11, 15 (+4.8 dB over the section mean) and sits 6 to 13 dB under the mean on steps 1, 5, 9, 13 (the kick steps) and between: a hat grid; the app's HF has a similar grid but with gaps of -35 to -62 dB (its 10th-percentile step is -37 dB under the mean, against the record's -7 dB). The record has sustained HF between hits (ring and reverb); the app's hats are dry and clean.
- The intro's own 4-16 kHz content (-71 dB mean in 6-12 kHz) is below what any master filter change would explain: it is at the level of the codec floor plus the faint sweeps. There is no evidence in the reference of a master filter that opens at bar 40 or at any other bar. The conclusion: the 4-16 kHz presence is hat-type material (and clap, stab upper partials) entering and fading in by gain automation, not a master filter.
- The app instead steps: its 8-12 kHz goes -54 (bars 0-15, the kick only) to -45.5 at bar 16 (+9 dB, hat_closed A enters) to -37 at bar 24 (+8 dB, hat_open and clap) and stays flat to bar 38, then equals the record from bar 40 (-36 to -38 against -34.7). In bars 0-15 the app is 26 dB above the record in 8-12 kHz (-54 against -80), 22 dB at 4-8 kHz, and 25 dB at 12-16 kHz: those are the kick's click and drive harmonics (source problem, section 5). Both files agree at plateau within 2 to 3 dB.

### 3c. Any lowpass in the break? (the drop at bar 120)

- The reference's HF does not stay at the mainA plateau into the break. Per-bar band levels (`hf2.txt`): 4-8, 8-12 and 12-16 kHz sit at -31.6, -33.9, -41.8 dBFS squared from bar 72 to bar 88, then fall steadily from bar 89 (0.4 to 0.7 dB per bar) to -37.3, -39.6, -50.6 at bar 103: a 15-bar fade of 5.7, 5.7 and 8.6 dB, a little more at the top. The break proper (bars 104-119) is flat at -38.2, -40.1, -53.5. At bar 120 there is a second, abrupt step: 4-8 kHz by 7 dB (-37.3 to -44.3), 8-12 kHz by 8 dB (-39.7 to -47.6) and 12-16 kHz by 12 dB (-53.5 to -65.7). 1-4 kHz does not move (-32.8 to -32.8 at bars 119 and 120; bars 121-123 -32.1, -32.6, -31.4), 300 Hz-1 kHz stays at -24 to -26 (bar 119 -25.1, bar 120 -24.2), and the low band is unchanged (-16.1 dBFS squared at 40-200 Hz on both sides). The outro starts with the same kind of step at bar 184: 4-8 kHz -32.0 to -43.7, 8-12 kHz -34.6 to -49.6, 12-16 kHz -42.0 to -54.8 (hats gone, then flat 4-8 and 8-12 kHz bands for the 16 bars). The 12-16 kHz band then climbs back over five bars (-65.7, -58.9, -53.8, -50.0, -48.1) and stays at -48.1 for bars 124-127, 5 dB above its level before bar 120.
- After bar 120 the 16th-step profile in 3-6, 6-12 and 12-16 kHz is flat to within 0.6 dB at every step (build/mainA hats are +4.8 dB on steps 3/7/11/15): the hat grid and the clap/stab transients above 3 kHz are gone and a steady wide noise bed (S/M -3 dB) remains. So the drop at bar 120 is the removal of the rhythmic HF elements plus a rising noise (E3's riser or sweep), and 1-4 kHz is untouched. A lowpass in the master with a cutoff below 4 kHz is ruled out (1-4 kHz does not change); a cutoff above about 8 kHz cannot produce a 7 dB step in 4-8 kHz.
- Fitting a lowpass anyway. Ratio of the long-term mean spectrum (Welch 4096, mid, 1/6-octave means) to mainA's at 8, 9, 10.1, 11.3, 12.7, 14.3, 16, 18 kHz, with a free offset and a Butterworth magnitude of order n, least squares (`lpfit.py`):
  - bars 104-119: ratio -4.8, -4.2, -8.2, -8.7, -9.5, -14.8, -20.4, -32.6 dB. Order 8 fits best (fc 12.6 kHz, offset -6.2 dB, rms residual 1.7 dB); order 6 (fc 11.5 kHz, 2.1 dB); order 4 (fc 9.4 kHz, 3.2 dB); order 2 (fc about 3.2 kHz, 5.2 dB, a bad fit). The shape is a shoulder at about 12 kHz falling about 40 dB per octave: much steeper than the 12 dB per octave biquad `filter` (cutoff, q) in the app's master (`lp`), which no setting can reproduce. The off-beat hits show the same thing directly: 16 kHz band against 8 kHz band is -34 dB in the break (28.0 to -6.0) against -13 dB in mainA.
  - bars 120-127: ratio -15.9, -13.8, -8.6, -10.2, -6.4, -12.9, -15.0, -28.9 dB (noise bed against hats, so not a filter shape); no fit is better than 3.3 dB rms.
  - Estimate of what it is: the hats in the break are a different, duller voicing with little above 12 kHz (or the encoder's own band-limiting at that bit allocation), not a master lowpass. The `lp` cutoff of 6000 in GUIDANCE_V2's `breakLate` section is not supported: a 6 kHz second-order Butterworth lowpass gives -6.2, -9.5, -13.2, -17.1 dB at 8, 10, 12.7 and 16 kHz against the measured -4.8, -8.2, -9.5, -20.4 (rms residual 5.4 dB with a free offset, against 1.7 dB for the order-8 fit at 12.6 kHz), and it also cuts 4 kHz by 0.8 dB; so it is both the wrong cutoff and the wrong slope.
- Whole-record ceiling: the record's spectrum ends at about 19.5 kHz (mean PSD -85 dB at 19 kHz, -140 dB at 20 kHz) in every section, which is the MP3 encoder's lowpass (192 kbps), not a mix choice. It is not in the app and does not need to be.

### 3d. Clipping and limiting signature (measured)

Method: sample peak and 4x true peak as in 1c; per-beat peak = max |x| over the first 40 ms after each beat (21,000 samples apart) on the section's own grid; counts of samples within d dB of the section's maximum; `clip.py`.

- Reference intro (kick, sub, bass only): per-beat peaks are -0.57 to -0.54 dB at the 5th to 95th percentile (std 0.01 dB, 64 beats); per-bar maximum -0.55 median, std 0.017 dB; 0.17 % of all samples (2,287) are within 0.1 dB of the section maximum. So in the intro the kick peak is pinned at -0.56 dBFS in every beat: a hard ceiling at about -0.55 dBFS (0.94 linear), on the decoded MP3 (so the pre-encode ceiling may be slightly different; the codec adds up to 0.3 dB of overshoot, seen as the whole-song sample peak of -0.18).
- Reference mainA and mainB (32 and 48 bars): per-beat peaks p5 -0.55, p50 -0.48, p95 -0.37 dB (std 0.06 to 0.07); 0.18 % / 0.14 % of samples within 0.5 dB of the maximum; per-bar peak std 0.05 to 0.06 dB. Still pinned at about -0.5 dB, a little looser because other material rides over the kick.
- Reference break (bars 104-120): the per-beat peaks spread (p5 -1.61, p50 -0.95, p95 -0.48, std 0.40) and the top 25 % of beats are at -0.58 to -0.46: a ceiling that is reached on some beats and not on others, which is the signature of a ceiling (hard clip or fast limiter) at about -0.5 dBFS, not of heavy compression (a compressor would shrink the spread of the peaks, and the break's crest of 13.8 dB is the highest of the song).
- Inter-sample overshoot of the reference: true peak minus sample peak is 0.00 to 0.17 dB per section (intro 0.00, mainA +0.17, mainB +0.18, outro +0.10), whole song true peak +0.004 dBTP: the mastering did not control true peak; the ceiling is a sample-peak ceiling. A hard clipper with oversampling off, or a sample-peak limiter, would give exactly this.
- App: the per-beat kick peaks are pinned at -5.8 dB (p5 -5.84, p50 -5.76, p95 -5.57, std 0.08, intro) and the section maxima are -5.0 to -5.5 dB; the true peaks are -3.8 to -5.5 dBTP, whole song -3.77. The app's ceiling is therefore about -5.5 dBFS, 5 dB below the record, and it is the limiter's compressor-plus-`ceiling` trim doing the work: the clipper at `clip` -0.5 dBFS never engages (only 1 to 38 samples lie within 0.1 dB of the maximum (mainB 1, mainA 4, break 9, intro 38); in the record 2,287 do in the intro).
- The master's effect on the mix (render of mainA 16 bars with the same code, sets and bypasses from a scratch copy of `tools/render.js` that adds `--set path=value` and `--bypass id`; the repo's `render.js` is unchanged): before glue, saturator and limiter (eq, hp, lp only) the mix is at peak +3.1 dBFS, rms -6.5 dBFS, crest 9.6 dB, -5.5 LUFS; as shipped it is peak -5.2, rms -11.9, crest 6.7, -11.25 LUFS. The reference's mainA is peak -0.2, rms -11.2, crest 11.0, -10.26 LUFS. So the sources reach the master 5.8 LU too hot and about 3 dB of crest is lost in the master (including the Web Audio `DynamicsCompressorNode` automatic makeup gain: glue alone adds +1.4 dB, saturator +1.3 dB, limiter +2.1 dB at the given thresholds, which the -4.2 dB `ceiling` is cancelling).
- What gets the crest back (render of mainA 16 bars, all track `gain`s multiplied by 0.58 = -4.7 dB, impact 0.46): `limiter.ceiling` 0 and `threshold` -1.5 with glue and saturator bypassed: peak -1.0 dBFS, rms -10.55, crest 9.6, -9.5 LUFS (v2). With the saturator on: peak -0.43, rms -8.57, crest 8.1, -7.9 LUFS (v1; the saturator adds 1 dB of rms and costs 1.5 dB of crest here). Shipped chain with the same gains and `ceiling` 0: peak -1.4, rms -7.8, crest 6.4, -7.1 LUFS (too loud, crest unchanged). The reference's crest of 11 dB is not reachable by the master alone: the raw mix has 9.6 dB, and the record's 11 dB means the sustained body (kick tail, bass, stab) is lower against the kick peak than in the app.

## 3e. The app's master: what it does to the balance (measured; needed to split source from master in section 5)

Method: the same 16-bar windows rendered three ways with the real engine (`Host.render`, via a scratch copy of `tools/render.js` in the scratchpad that adds `--set path=value` and `--bypass id`; nothing in the repo was changed): (a) as shipped (`tools/out/app-<section>-0-16.wav`); (b) "raw": glue set to `threshold` 0, `ratio` 1, `knee` 0, `makeup` -12 dB and the saturator and limiter bypassed, then the WAV multiplied by 4 (+12 dB) in numpy, so the 16-bit file does not clip (this leaves `eq`, `hp`, `lp` only); (c) the reference, same bars. 1/3-octave shares as in section 0.

Level of the three (LUFS ungated / rms dBFS / sample peak dBFS):

| window | raw | shipped | reference |
|---|---|---|---|
| intro 0-16 | -5.76 / -6.62 / +1.58 | -12.49 / -12.40 / -5.53 | -10.55 / -11.17 / -0.49 |
| mainA 40-56 | -5.46 / -6.48 / +3.09 | -11.25 / -11.92 / -5.19 | -10.26 / -11.19 / -0.21 |
| break 104-120 | -6.52 / -8.18 / +4.36 | -9.02 / -11.14 / -5.37 | -12.63 / -14.31 / -0.42 |
| mainB 136-152 | -5.61 / -6.67 / +4.47 | -10.67 / -11.98 / -5.18 | -9.87 / -10.93 / -0.18 |

- The sources reach the master 4.8 to 6.5 LU hotter than the record's final loudness. The master takes 6.7 LU off the intro, 5.8 off mainA, 2.5 off the break and 5.1 off mainB. It therefore flattens and inverts the curve: raw, the break is 1.1 LU quieter than mainA (the record: 2.4 LU quieter); shipped, it is 2.2 LU louder than mainA. Net: break +3.4 LU too loud, a master-induced error on top of a source error (the break's sources are not quiet enough).
- Balance changes made by the master, `shipped - raw`, in dB re total (mainA 16 bars; full table in section 5): 40 Hz +4.7, 125 Hz -4.2, 160 Hz -8.4, 200 Hz -5.1, 400 Hz +4.7, 1 kHz +5.6, 4 kHz +6.8, 6.3 kHz +7.5, 8 kHz +6.9, 12.5 kHz +7.3. Cause (inferred): the limiter's compressor has a 1 ms attack and ratio 20 with a threshold at -6 dB while the raw peaks are +3 to +4.5 dBFS, so it removes 9 to 10 dB at the kick's onset, which is where the 150-250 Hz body of the kick sits, and the glue compressor (threshold -14, ratio 2.5) follows the loud 40-125 Hz content; everything not dominated by the low end rises in share. A gentle limiter (v2 above: `threshold` -1.5, `ceiling` 0, glue and saturator bypassed, track gains x0.58) leaves the balance identical to raw within 0.1 dB in every band (measured).
- The `eq` unit (low shelf +1.5 dB at 90 Hz, 400 Hz peak -1 dB Q 0.8, high shelf +1 dB at 8 kHz) is inside "raw" and moves bands by 1 dB at most; in the right direction at 400 Hz and 8 kHz, but 10 dB too small to matter.

### mainA (bars 40-55), 1/3-octave, dB re the file's own total

| fc (Hz) | ref | raw mix (before glue, sat, limiter) | shipped master | source part (raw - ref) | master part (shipped - raw) |
|---|---|---|---|---|---|
| 25 | -26.5 | -31.6 | -31.8 | -5.2 | -0.1 |
| 31.5 | -16.3 | -22.0 | -24.0 | -5.6 | -2.0 |
| 40 | -20.0 | -11.0 | -6.3 | +8.9 | +4.7 |
| 50 | -11.6 | -8.5 | -6.4 | +3.1 | +2.0 |
| 63 | -5.3 | -13.8 | -13.3 | -8.5 | +0.5 |
| 80 | -8.4 | -12.2 | -14.2 | -3.7 | -2.0 |
| 100 | -9.7 | -12.1 | -14.3 | -2.4 | -2.2 |
| 125 | -9.2 | -3.4 | -7.6 | +5.8 | -4.2 |
| 160 | -11.6 | -13.4 | -21.8 | -1.8 | -8.4 |
| 200 | -11.9 | -19.3 | -24.3 | -7.3 | -5.1 |
| 250 | -15.7 | -17.8 | -19.2 | -2.1 | -1.3 |
| 315 | -17.5 | -22.2 | -17.5 | -4.7 | +4.7 |
| 400 | -22.1 | -17.5 | -12.8 | +4.6 | +4.7 |
| 500 | -20.4 | -19.7 | -20.1 | +0.7 | -0.4 |
| 630 | -23.5 | -20.8 | -15.9 | +2.7 | +4.8 |
| 800 | -26.8 | -21.3 | -17.5 | +5.5 | +3.8 |
| 1000 | -26.6 | -21.6 | -16.0 | +5.0 | +5.6 |
| 1250 | -29.2 | -23.8 | -19.3 | +5.3 | +4.5 |
| 1600 | -25.6 | -24.4 | -18.9 | +1.3 | +5.4 |
| 2000 | -28.8 | -22.8 | -18.6 | +6.0 | +4.2 |
| 2500 | -27.9 | -26.5 | -20.8 | +1.4 | +5.7 |
| 3150 | -28.5 | -28.6 | -22.5 | -0.1 | +6.0 |
| 4000 | -25.3 | -32.1 | -25.3 | -6.8 | +6.8 |
| 5000 | -27.2 | -35.9 | -27.9 | -8.6 | +8.0 |
| 6300 | -24.2 | -36.8 | -29.4 | -12.6 | +7.5 |
| 8000 | -24.1 | -35.1 | -28.3 | -11.1 | +6.9 |
| 10000 | -25.0 | -34.3 | -27.4 | -9.3 | +6.9 |
| 12500 | -28.4 | -33.8 | -26.4 | -5.3 | +7.3 |
| 16000 | -35.6 | -32.8 | -26.8 | +2.8 | +6.0 |

### Coarse bands, four 16-bar windows (power-summed 1/3-octave bands; source part = raw - ref, master part = shipped - raw)

| band | intro: src / master | mainA: src / master | break: src / master | mainB: src / master |
|---|---|---|---|---|
| 25-63 | -1.7 / +3.2 | -1.7 / +2.8 | -0.2 / +1.9 | -1.1 / +1.5 |
| 80-125 | +1.6 / -3.1 | +1.9 / -3.6 | +1.8 / -5.6 | +1.8 / -4.1 |
| 160-250 | -3.3 / -4.7 | -3.4 / -5.2 | -7.4 / -3.8 | -3.5 / -4.9 |
| 315-630 | +7.7 / +3.7 | +0.6 / +3.9 | -0.0 / +3.8 | -0.7 / +5.0 |
| 800-2k | +8.2 / +2.1 | +4.6 / +4.7 | +3.8 / +3.6 | +2.1 / +4.9 |
| 2.5k-5k | +5.2 / +6.9 | -2.5 / +6.2 | +1.2 / +4.8 | -0.8 / +6.2 |
| 6.3k-10k | +9.6 / +10.2 | -10.9 / +7.0 | -10.6 / +6.8 | -9.6 / +6.0 |
| 12.5k-16k | +14.9 / +4.5 | -2.6 / +6.6 | -7.8 / +7.5 | -1.5 / +4.9 |

## 4. EQ match: proposed biquads for the app's master (a check, not the fix)

Method: long-term average spectra (mid+side power, Welch 16384) of mainA bars 40-72 for the reference and for the app as shipped (`app-bars-0-200.wav`), 1/3-octave sums 31.5 Hz to 16 kHz, each normalised to its own total, target = reference minus app in dB (a free global gain is allowed). Target spread (rms about its mean): 7.07 dB. Fit: up to six RBJ biquads (Web Audio `BiquadFilterNode` formulas; shelf Q fixed at 0.7071 because Web Audio ignores Q on shelves), differential evolution then least squares (scripts `eqfit3.py`, `eqrefine.py`), gains limited to +-12 dB, peaking Q to 0.4-4, each filter's frequency confined to its own range so that the list is readable (kick region, sub body, 190 Hz body, mid cut, hat presence, top shelf). Then applied to the app's mainA render with `scipy.signal.lfilter` and the band table recomputed.

Engine mapping: the master's own `eq` unit has one low shelf, one peak and one high shelf (`low`, `lowFreq`, `mid`, `midFreq`, `midQ`, `high`, `highFreq`), not enough for six bands. The generic `filter` unit takes `mode` ('peaking', 'highshelf', ...), `cutoff` (20-20000 Hz), `q` (0.05-20) and `gain` (-24 to +24 dB), so six `{ type: 'filter', name: 'm1', mode: 'peaking', cutoff: ..., q: ..., gain: ... }` units inserted after `eq` in `Processors.master` express the list exactly.

Six-band list (the main proposal; residual rms 3.07 dB with the free shelf Q, 3.08 dB with the shelf Q fixed at 0.7071 as listed; on the app's actual mainA render 7.07 dB before, 3.46 dB after):

| # | `mode` | `cutoff` (Hz) | `q` | `gain` (dB) | what it corrects |
|---|---|---|---|---|---|
| 1 | peaking | 41.1 | 4.0 (bound) | -12.0 (bound) | the app's 40-50 Hz kick fundamental (app +13.8 dB at 40 Hz, +5.2 at 50) |
| 2 | peaking | 68.8 | 4.0 (bound) | +9.3 | the missing 63-100 Hz body (app -7.9 at 63, -5.7 at 80, -4.5 at 100) |
| 3 | peaking | 189.0 | 2.69 | +12.0 (bound) | the missing 160-250 Hz (app -10.2 at 160, -12.4 at 200) |
| 4 | peaking | 1368.7 | 0.4 (bound) | -12.0 (bound) | the 400 Hz-3 kHz excess (app +9 to +10.6 at 800-2k) |
| 5 | peaking | 7010.8 | 0.96 | +7.2 | hat presence (app -5.7 at 6.3 kHz, -5.1 at 8 kHz) |
| 6 | highshelf | 13165 | 0.7071 (fixed; ignored by Web Audio) | -12.0 (bound) | 16 kHz excess (app +8.9) |

Smaller lists (the same method, residual rms about the target's mean): four bands (1-4 above) 4.00 dB: 41.2 Hz Q 4 -12; 68.9 Hz Q 4 +10.2; 188.2 Hz Q 2.73 +12; 1173.7 Hz Q 0.57 -11.8. Five bands (adds 7006 Hz Q 0.91 +12; retunes 58.2 Hz Q 0.4 +9.8; 1460 Hz Q 0.68 -5.4) 3.49 dB.

Result on mainA (app + the six-band EQ, dB re total, minus the reference): 31.5 Hz -12.8 (before -8.9), 40 +5.3 (+13.8), 50 +1.0 (+5.2), 63 -1.0 (-7.9), 80 0.0 (-5.7), 100 -2.5, 125 +4.0 (+1.6), 160 -5.0 (-10.2), 200 -4.0 (-12.4), 250 -0.9, 315 -0.9, 400 +5.8 (+8.8), 500 -5.9 (-0.9), 630 -2.5, 800 +0.5 (+8.9), 1k +0.3 (+10.6), 1.25k -1.1, 1.6k -4.2, 2k +0.7 (+10.0), 2.5k -0.6, 3.15k +0.2, 4k -2.7, 5k -0.3, 6.3k -1.6 (-5.7), 8k -0.7 (-5.1), 10k -1.5, 12.5k -1.4, 16k +0.5 (+8.9). Rms about the mean over 31.5 Hz-16 kHz: mainA 7.07 to 3.46 dB, mainA2 7.21 to 2.96, mainB 6.78 to 3.00, break 7.77 to 4.76, build 6.92 to 4.53, outro 6.72 to 4.73, intro 10.23 to 9.31. The same list generalises to the other main sections (it was fitted on mainA only); it does not help the intro (the intro's problems are the mid stack and the HF tail, which a static EQ cannot fix without hurting mainA).

Cost and caveats (measured unless marked):

1. Headroom and loudness. Applied after the shipped master, this EQ moves the sample peak from -5.2 to +1.1 dBFS (+6.2 dB, the 69 and 189 Hz boosts add to the kick) and K-weighted loudness from -11.25 to -11.58 LUFS. In the chain it would sit before `glue`, so the compressor and limiter would work harder (the dynamics of section 3e would change); the numbers above are a spectral check on a finished render, not a prediction of the re-rendered result.
2. Three of the six filters sit on their bounds (gain 12 dB, Q 4 or 0.4). The unconstrained optimum is more extreme (an earlier unconstrained run stacked two -14 dB notches at 43.4 Hz and a +14 dB peak at 185 Hz). That is the signature of a source error being patched: a -12 dB Q 4 notch at 41 Hz is a stand-in for retuning the kick (E1: the record's kick body is at 51-59 Hz), the +12 dB at 189 Hz is a stand-in for the missing kick body or bass harmonic, the -12 dB wide dip at 1.4 kHz is a stand-in for fixing the stab and bass harmonic levels.
3. What an EQ cannot do: the record's 31.5-35 Hz layer (app -8.9 dB at 31.5 and the EQ makes it -12.8, since the 41 Hz notch has a skirt) is a missing sound, not a level; the 400 Hz (+5.8) and 500 Hz (-5.9) residuals are a tonal pair (the app's bass/stab partial at 371-414 Hz against the record's peaks at 309.5/368.8 and 409/474 Hz) that needs a notch the six-filter budget does not leave; 160-200 Hz stays 4-5 dB low.
4. Decision for the owner: fix the mix or fix the master. The coordinator's view (fix the sources first, EQ as a check) is supported by the evidence in section 5: a quarter to half of each large delta is created by the master's dynamics, not by the sources, so an EQ matched to the shipped render would be compensating a limiter-induced tilt and would have to be re-fitted after any change of gains or limiter settings. If the owner prefers an EQ-only route, use the four-band list (it has the simplest moves) and expect to re-fit.

## 5. Which deltas are source problems and which are master problems

Evidence: the raw/shipped/reference decomposition of section 3e, solo-track contributions (`solo.py`, mainA 16 bars, each solo rendered through the master so contributions are not additive), and the per-bar and per-step measurements above. "Source part" = raw minus reference, "master part" = shipped minus raw, both in dB re total, mainA window (the other three sections are in the coarse table). A source delta is for E1-E3 (kick/sub; bass/stab/lead/pad; hats/clap/shaker/sweeps); a master delta is for A8.

| delta (shipped vs record, mainA) | source part | master part | verdict and owner | evidence |
|---|---|---|---|---|
| 40-50 Hz too strong (+13.8, +5.2) | +8.9 at 40, +3.1 at 50 | +4.7 at 40, +2.0 at 50 | SOURCE (E1): kick fundamental at 44 Hz, the record is at 51-59 Hz; the master adds 4.7 dB more | solo kick contributes -6.2 / -6.4 dB at 40 / 50 Hz re mix, the same as the mix itself (-6.3 / -6.4); reference peak is 59.2 Hz (coordinator) |
| 63-100 Hz too weak (-7.9, -5.7, -4.5) | -8.5 at 63, -3.7 at 80, -2.4 at 100 | +0.5 / -2.0 / -2.2 | SOURCE (E1/E2): the 59 Hz sub/kick body is under-represented; master neutral | raw and shipped agree within 2.2 dB |
| 31.5 Hz layer missing (-8.9) | -5.6 (mainA; -5.4 intro) | -2.0 (mainA; -4.6 intro) | SOURCE (E1): the 35 Hz second peak is absent; master worsens it | reference 35.0 Hz peak at -33 dB; app has nothing there |
| 125 Hz bass fundamental (+1.6; 124 Hz is the app's bass note) | +5.8 | -4.2 | SOURCE (E2): bass fundamental about 5 dB too strong; the master happens to hide it | raw 125 Hz band -3.4 dB against -9.2 |
| 160-250 Hz hole (-10.2 at 160, -12.4 at 200) | -1.8 at 160, -7.4 at 200 (mainA window) | -8.4, -5.1 | BOTH: 160 Hz is a MASTER problem (sources are within 2 dB, shipped is 10 dB low), 200 Hz about 60 % source (E1: kick body/glide) and 40 % master | raw 160 Hz -13.4 vs ref -11.6 vs shipped -21.8; limiter at ratio 20, 1 ms attack removes the kick's first 20 ms where the 150-250 Hz sweep sits (inferred) |
| 315-630 Hz and 800-2k excess (+9 to +10.6 at 400-2k) | +4.6 at 400, +5.5 at 800, +5.0 at 1k, +6.0 at 2k | +4.7, +3.8, +5.6, +4.2 | BOTH, half each. Source (E2): bass harmonic stack at 247/371/614/737/861/985/1109 Hz and the stab (solo stab -13 to -16 dB re mix at 630-2k, solo bass -13.8 at 400 Hz); master: share rise from compressing the lows | solo contributions; v2 render (gentle limiter) removes the master part, leaving the raw excess |
| intro 300 Hz-1.2 kHz stack (+17 at 400, +15 at 630) | +11.6 / +11.5 / +12.7 (400/630/800) | +5.3 / +3.8 / +0.4 | SOURCE (E2): the bass's harmonic stack; the record has nothing there (-30 to -36 dB) | `intro` raw render, ref intro table |
| 6.3-10 kHz too weak (-5.7 at 6.3, -5.1 at 8k) | -12.6 / -11.1 / -9.3 (6.3 / 8 / 10 kHz) | +7.5 / +6.9 / +6.9 | SOURCE (E3): the hats are about 10 dB too quiet before the master; the master's makeup (compression of the lows) lifts them 7 dB and conceals most of the error. Once the master is relaxed (A8) the hats need roughly +9 to +11 dB | raw HF is -11 dB below the record, 4 kHz -6.8, 12.5 kHz -5.3; hat solos: closed -36.4 dBFS rms, open -25.1 (coordinator) |
| 16 kHz excess (+8.9) | +2.8 | +6.0 | MASTER mostly (relative lift), small source; and the record is band-limited above 12.5 kHz in the break and 19.5 kHz always | table |
| intro 4-16 kHz tail (+14 to +22 dB) | +5 to +18 | +3 to +10 | SOURCE (E1): the kick's click and drive harmonics are the only HF source in the intro (kick solo -36.8 dB at 4 kHz re mainA mix; app intro -34 dB re its own total); the master adds 3 to 10 dB | intro tables |
| loudness: intro -1.9 LU, mainA -1.0, mainB -0.8, outro -1.6, break +3.4 | sources +4.8 to +6.5 LU hot | -6.7 / -5.8 / -2.5 / -5.1 LU | MASTER (A8) for the level and the curve shape (it inverts the break); SOURCE (E4/E1) for the break: the record's break is 2.4 LU below mainA, the raw sources give only 1.1 LU below, the shipped master turns that into 2.2 LU above | loudness table, raw/shipped table |
| peak and crest (peak -5.2 against -0.2, crest 6.7 against 11.0) | raw crest 9.6 | ceiling -4.2 dB and a clipper that never acts | MASTER: `ceiling` -4.2 applied before the clipper; set `ceiling` 0 and let `clip` -0.55 be the ceiling. A residual 1.4 dB crest gap is SOURCE (body too long against the kick peak) | v2 render: crest 9.6, peak -1.0, LUFS -9.5 |
| stereo: 300 Hz-1 kHz narrower (-8.5 against -2.4 dB S/M), 4-10 kHz wider (-6.2 against -10.1) | n/a | n/a | SOURCE (E2/E3): widen the stab, narrow its upper partials | section 2 |
| HF presence timeline (record ramps; app steps) | the ramp in the record: +1.5 dB/bar in bars 16-23 (a lowpassed element), +13 dB at bar 24, +0.75 dB/bar in bars 24-39, fade of 0.4-0.7 dB/bar in bars 89-103, steps at 120 and 184 | n/a | SOURCE (E3/E4): automation of the hat and noise levels, not a master filter | sections 3b, 3c |

## 6. Proposals for A7 and A8 with engine names and ranges (estimates marked)

For A8 (`processors.js`, `Processors.master`), in order of evidence:

1. `limiter`: `ceiling` 0 (range -12..0), `clipOn` true, `clip` -0.55 (range -12..0; the record's kick peaks sit at -0.57 to -0.54 dBFS in the intro, std 0.01 dB, so `clip` -0.55 reproduces a ceiling the record has), `threshold` -1.5 (range -30..0; measured with glue and saturator bypassed and the track gains x0.58: the balance is unchanged from the raw mix within 0.1 dB in every band), `release` 0.08 (unchanged; 0.05 was louder by 0.7 LU and lost 2 dB of crest in the test v3).
2. `glue` and `sat`: with the sources at x0.58 the glue (threshold -14, ratio 2.5) is not needed to hold the level; bypassed in the best test (v2: peak -1.0, rms -10.55, crest 9.6, -9.5 LUFS against the record's peak -0.2, rms -11.2, crest 11.0, -10.26 LUFS). Note that Web Audio's `DynamicsCompressorNode` applies its own makeup gain (measured here: glue +1.4 dB, limiter +2.1 dB at the shipped thresholds, saturator +1.3 dB): re-check the level after each change. Saturator on costs about 1.5 dB of crest and adds 1 dB of rms (v1: crest 8.1).
3. `eq` unit: its present settings (+1.5 dB / 90 Hz, -1 dB / 400 Hz, +1 dB / 8 kHz) are right in sign for 400 Hz and 8 kHz and about 10 dB too small. Do not enlarge them before the sources are retuned; the six-band list in section 4 is the target if the owner wants an EQ-only route.
4. Loudness targets per section (ungated K-weighted, record): intro -10.56, intro2 -10.53, build -11.7 falling to -12.4, mainA -10.24, mainA2 -10.3 (to -10.6 by bar 100), break -12.4 to -12.9, breakEnd -12.2, mainB -9.9 (the loudest, 0.35 LU above mainA), outro -10.4. The curve is flat inside each section (spread 0.1 LU): a static master with no section-dependent gain reproduces it if the sources' section balance is right.

For A7 (`song.js` / GUIDANCE_V3), estimates, not rendered unless stated:

1. Scale all track `gain`s by about 0.58 (the v2 render did exactly this and `impact.gain` to 0.46), then trim 0.7 dB further to land on -10.3 LUFS.
2. Hats: follow the record's 8-12 kHz band (-80 dBFS squared in bars 0-15, rising 1.5 dB/bar to -62 by bar 23, a step to -49 at bar 24, then +0.75 dB/bar to the plateau at -34.7 by bar 40) by ramping `hat_closed.gain` and `hat_open.gain` (the 12-16 kHz band rises only 3 dB in bars 16-23, so the intro2 element is dark: give it a low `tone`) using section `ramp` entries (`{ param: 'hat_closed.gain', from: ..., to: ..., curve: 'expo' }`), then a fade of 0.4-0.7 dB/bar from bar 89 to 103 and the steps at bars 120 and 184 (section lengths differ from the record's phrases: bar 120 is inside the app's `break`, which GUIDANCE_V2 splits into `break` 16 + `breakLate` 8).
3. The record has no master lowpass in the break; do not use `master.lp.cutoff` 6000 for `breakLate`. If a duller break is wanted, shape the hats' own `tone` (about -34 dB at 16 kHz against 8 kHz in the break's hat hits, -13 dB in mainA).
4. Stab: `widener` `width` about 1.6-2.0 and `monoBelow` 250 (estimate from section 2; the stab solo is already -4 to -8 dB S/M at 315 Hz-2.5 kHz and the record's mix is -2.4 dB at 300-1k).

## 7. Estimates, limits, what I did not do

- Estimates (not measured): the cause of the master's 160-200 Hz loss (limiter on the kick onset); the widener width of 1.6-2.0; the idea that the break's HF shoulder is a different hat voicing or the encoder rather than a filter; the +9 to +11 dB hat boost after the master is relaxed (extrapolated from the raw-minus-reference 6.3-10 kHz figures).
- Measurement limits: MP3 at 192 kbps (side channel above about 10 kHz, band-limit above 19.5 kHz); one window length (Welch 16384) for all bands, so 25-40 Hz bands rest on 1-5 bins; "total" in the 1/3-octave tables is the full-band total, so a change in one dominant band moves all the others (that is why the decomposition tables matter); the K-weighted loudness here is ungated (the coordinator's gated section values agree to 0.1 LU); the solo-track contributions are not additive because each solo passes through the master.
- Not done: round 2 (cross-read of the other transcripts); web search (none used); no repo file other than this transcript was written or changed. Scratch scripts and renders (`e5/` in the scratchpad) are outside the repo: `common.py`, `bands.py`, `loud.py`, `loud2.py`, `peaks.py`, `hf.py`, `hf2.py`, `hits.py`, `lpfit.py`, `clip.py`, `solo.py`, `eqfit.py`, `eqfit3.py`, `eqrefine.py`, `eqapply.py`, `decomp.py`, `render_e5.js` (patched copy of `tools/render.js` with `--set`, `--bypass`, `--tag`).
