# Log A9, Ear Crew round 3: scoring for V3

Owner files: `tools/render.js`, `tools/score.py`, `tools/README.md`. No engine files touched; nothing committed. The reference is read from the scratchpad path in BRIEF.md and never copied into the repo.

## 1. The render offset (E1's 16.4 ms), found and fixed

Measured in a scratch page (`scratchpad/latency.js`, not in the repo), solo sub, master on, first sample above 1e-4:

| condition | first sample | offset from the grid (2205) |
|---|---|---|
| master on (app baseline) | 2927 | +722 (16.37 ms) |
| all six master units bypassed | 2206 | +1 |
| glue compressor alone active | 2663 | +458 (10.4 ms) |
| limiter alone active | 2471 | +266 (6.0 ms) |
| eq, hp, lp, sat alone active | 2927 | +722 (no contribution) |

Cause: the two DynamicsCompressorNodes (glue, then limiter); the other units add nothing. The latency depends on the chain, so it is measured per render now:
- `render.js` renders a one-bar solo of the sub (kick if there is no sub) before each run and subtracts the scheduled grid.
- The sidecar carries `gridStartSample` (= 2205 + latency, the grid as it appears in the WAV), `scheduledGridSample` (2205), `latencySamples`, `latencyMeasuredOn`.
- Measured: app baseline 722 (16.37 ms); archived page 530 (12.0 ms); app V3 588 (13.33 ms). The archived page and the V3 chain differ, so a fixed correction would have been wrong for one of them.
- Effect: the app intro kick glide moves from f0 188.6 Hz, fT 5.0 (bound), tau 75.3 ms to f0 273.7, fT 39.0, tau 26.3 ms (reference intro: 253.0, 51.2, 25.2). The fit is still flagged (residual 84 Hz), so the render glide is not yet reliable.
- Renders made before this change have the scheduled grid and are off by the latency.

## 2. What score.py now has (spec section 5)

- `--layout auto|archive|v3`: `auto` reads the sidecar's song. V3 sections are E4's 15 (`V3_SECTIONS`), and each maps to one of E5's nine windows by start bar (`v3_window`).
- `--v3` (with `--ref`): one run, every measure per E5 window and the two extra mid/side windows; prints the delta table (render minus reference) and the twelve largest deltas. `--json` gives the raw values.
- Measures added: 29 ISO third-octave bands (mid+side power, Welch Hann 16384, dB re window total); mid/side per coarse band (S/M dB, rho); per-bar 4-8, 8-12, 12-16 kHz; crest (sample peak minus rms) and PLR (true peak minus gated LUFS); ungated LUFS; kick glide and sub duck per window.
- `--onsets` (with `--onset-band`, `--onset-method slope|rise`): per 16th offsets re the straight grid, rel to the even controls; PASS/FAIL at 4 ms for steps 1, 6, 11, 14.

## 3. Validation (numbers as measured)

- **29 bands:** the reference's own values agree with E5's column (spec 5.2b) to 0.05 dB (max) in all nine windows. My transcription of E5's column was checked against the spec text (29 rows, 0 mismatches after fixing three typos).
- **Crest and PLR:** the reference's sample peak, true peak, rms, crest and PLR agree with E5's table (c) to 0.01 dB in all nine windows.
- **Loudness:** ungated and gated LUFS are identical to 0.01 LU in the baseline windows (E5 says they agree to 0.1 LU on the reference; not separately checked).
- **Onset method:** on a synthetic note train with odd steps 10 ms late, slope gives odd minus even 8.9 ms (rise 9.9). It reads about 1 ms under; the selftest accepts 7.5 to 12.5 ms.
- **Reference bass onsets on the mix are not resolved:** 0 to 16 hits per step at 350-1000 Hz; the 500-535 Hz band (E3's) collapses under the 50 % rule. The mix measure is therefore weak; the solo render is the reliable side. Logged as a limit, not a result.

## 4. Commands and exit codes (read directly)

```
$ node --check tools/render.js                                                      -> 0
$ python3 -m py_compile tools/score.py                                              -> 0
$ python3 tools/score.py --selftest                                                  -> 0 ("OK: all selftest checks passed")
$ node tools/render.js --page app --sections intro --bars 2 --song v3 ...           -> 0 (V3 song landed in the working tree: GUIDANCE_V3, documentV3 at song.js:163/329; sections match E4's 15)
$ node tools/render.js --page app --bars 2 --song v9                                -> 2 (refused: "--song must be baseline, v2 or v3")
$ node tools/render.js --page app --sections intro --bars 16 --song v3              -> 0 (latency 588 samples)
$ python3 tools/score.py tools/out/app-intro-0-16-v3.wav --ref <ref> --v3            -> 0 (windows outside the render print n/a)
$ python3 tools/score.py tools/out/app-bars-0-200.wav --ref <ref> --v3               -> 0 (baseline full song, pre-latency-fix sidecar; 69 s)
$ node tools/render.js --page app --sections mainB --bars 16 --solo bass            -> 0 (latency 722)
$ python3 tools/score.py tools/out/app-mainB-0-16-solo-bass.wav --ref <ref> --onsets -> 0
$ python3 tools/score.py --selftest   (after the last edit)                         -> 0
```

## 5. Baseline numbers from the first --v3 run (pre-fix sidecar: grid off by 722 samples, so glide and sub numbers are not usable; levels and bands are fine)

Full baseline song, render minus reference, nine windows (sample of rows):
- LUFS (gated = ungated): intro -1.94, intro2 -1.46, build +0.40, mainA -1.00, mainA2 -0.31, break +3.54, breakEnd +3.38, mainB -0.73, outro -1.61.
- 29 bands, the big ones: intro 400 Hz +17.0, 1 kHz +12.3, 8 kHz +21.8, 16 kHz +21.4; mainA 8 kHz -5.1, 6.3 kHz -5.7; break 40 Hz +22.6 (the baseline has a 40 Hz drone the reference does not), 160 Hz -13.5.
- Mid/side: intro S/M is -58 to -40 dB below the reference in 300 Hz to 16 kHz (the baseline intro is mono there; the reference's intro has a little side: E5 gives -11.0 dB at 300 Hz to 1 kHz).

## 6. Open, for the loop

- A7's V3 song is in the working tree but has not been handed back (no A7 log in this folder). The full V3 loop (full song, 16-bar windows, delta table with the three largest deltas and their analyst parameter) runs when A7 hands back, as the coordinator asked. Until then, no V3 scores are reported.
- The baseline odd-step bass offset of about 11 ms (swing 0.06 predicts 2.4 ms) is unexplained (open).
- Render glide still flagged UNRELIABLE after the latency fix (residual 84 Hz; the 400 Hz low band still holds the sub and bass).
- The `--v3` deltas mix dB units (S/M, bands, LUFS) in the twelve largest; read them per measure.


## 7. Loop run on V3 (after A7's hand-back, 2026-10-24)

Read directly, every exit code: `python3 tools/score.py ... --v3` exit 0 for the full render and each 16-bar render;
`--onsets` exit 0; `node tools/render.js --page app --song v3 ...` exit 0 for every render below;
`python3 tools/score.py --selftest` exit 0 (after the last edit). Renders: the coordinator's `tools/out/app-bars-0-200-v3.wav`
(sidecar latency 458 samples), my seeded full-song re-render into the scratchpad (same int16 counts, so it reproduces the
coordinator's file exactly), and 16-bar V3 windows (intro 0-15, mainA 40-55, break 104-119, mainB 136-151), plus solo
renders (mainB bass, mainA hat_open, mainA and intro2 every track). All written under `tools/out/` (ignored) or the scratchpad.

### 7.1 Per-section delta table, full V3 song (render minus reference), `score.py --v3`

Nine E5 windows; the 15 V3 sections map onto them by start bar (intro, intro2, build, mainA = mainA + mainA_b, mainA2 =
mainA2 + mainA3, break = break + breakLate, breakEnd = breakEnd + gap, mainB = mainB + mainB_b + mainB_c, outro).
The report text is pasted from the saved run (`scratchpad/loop/v3_full.txt`):

```
V3 report: render tools/out/app-bars-0-200-v3.wav (layout v3, latency 458 samples), reference /root/.claude/uploads/341aa418-0695-5408-80be-331d2fec6cae/9014b1a3-Guidance_Original_Mix_192kbps.mp3
measure                           intro   intro2    build    mainA   mainA2    break breakEnd    mainB    outro
---------------------------------------------------------------------------------------------------------------
LOUDNESS AND PEAKS (render minus reference)
LUFS ungated (E5 1b)              -1.32    -1.33     0.28    -0.18     0.14     3.22     5.79     0.58    -0.18
LUFS gated (O1 M9)                -1.32    -1.33     0.28    -0.18     0.14     3.22     5.79     0.58    -0.18
sample peak dBFS                  -2.40    -2.38    -0.86    -0.33    -0.30     0.42     0.50     0.07    -0.16
true peak dBTP                    -2.40    -2.38    -0.86    -0.50    -0.30     0.75     0.95     0.39    -0.25
rms dBFS (L+R mean square)        -0.63    -0.64     0.43     0.30     0.60     2.67     3.49     1.27     0.63
crest, sample peak - rms          -1.78    -1.73    -1.30    -0.62    -0.90    -2.25    -2.99    -1.20    -0.78
PLR, TP - gated LUFS              -1.08    -1.05    -1.14    -0.32    -0.44    -2.47    -4.85    -0.19    -0.07

29 THIRD-OCTAVE BANDS, dB re window total (render minus reference); the E5 check is printed below the table
25 Hz                             -4.54    -4.80    -6.32    -5.34    -4.67     8.82    -3.28    -3.50    -3.64
31.5 Hz                            3.83     3.64     2.38     2.89     2.49     4.43    -2.26     2.28     2.85
40 Hz                             -1.69    -1.85    -3.19    -2.44    -1.48    13.28     0.79     0.68     0.55
50 Hz                              4.93     4.92     5.19     4.19     4.57    11.15     9.87     6.59     6.44
63 Hz                              0.96     0.95     0.66     0.28     0.18    -0.48    -1.65    -0.07     0.29
80 Hz                             -1.95    -1.93    -2.29    -2.28    -2.43    -4.65    -6.08    -2.98    -2.64
100 Hz                            -3.01    -3.06    -3.80    -3.23    -3.24    -6.14    -8.06    -4.15    -3.69
125 Hz                            -4.65    -4.57    -5.49    -4.92    -5.08    -7.82    -9.42    -5.73    -5.38
160 Hz                            -2.18    -2.16    -2.89    -2.76    -2.77    -4.31    -6.19    -3.09    -2.52
200 Hz                            -2.04    -2.03    -0.47    -0.52    -0.70    -2.55    -4.46    -1.36    -2.31
250 Hz                            -1.66    -1.61     1.96     1.82     1.75    -0.60    -2.71     0.37    -1.07
315 Hz                             2.64     2.74     4.87     2.52     1.16    -1.22    -3.19    -0.69    -3.52
400 Hz                             5.73     5.75     6.26     6.22     4.37     2.07     0.22     2.48     1.50
500 Hz                            10.30     8.79     6.46     6.76     5.89     2.54     1.05     3.15     3.54
630 Hz                             8.54     2.42     1.31     1.55     1.87    -2.61    -4.57    -1.40     1.47
800 Hz                             6.73     2.03     4.15     6.55     3.63    -2.04    -3.41    -0.90     1.17
1000 Hz                            3.28    -0.90    10.43     4.60     5.77    -1.56    -3.02     1.40     2.29
1250 Hz                           -0.07    -1.87     3.84     0.99    -0.41    -5.01    -8.14    -0.82    -1.69
1600 Hz                           -5.15    -5.40     4.66    -5.71    -1.80    -5.87    -9.42    -3.22    -4.79
2000 Hz                           -8.90    -9.04     6.03    -6.87    -0.81     0.13    -6.20    -1.81    -7.51
2500 Hz                           -9.66   -15.41    -0.25   -11.77    -4.84    -1.16    -3.57    -5.20    -8.88
3150 Hz                           -8.64   -16.86    -4.99   -13.65    -8.98    -1.64    -0.09    -7.89    -9.98
4000 Hz                           -7.27   -16.50   -11.61   -16.74   -13.93     2.07     4.22   -11.17   -10.14
5000 Hz                           -3.39   -10.98   -13.00   -14.65   -13.63     5.16     8.20    -8.16    -9.90
6300 Hz                            1.34    -5.64   -16.99   -16.99   -16.54     5.55     9.68    -9.12    -9.53
8000 Hz                            6.39    -2.42   -16.31   -15.88   -15.96     6.75    12.61    -6.79   -10.15
10000 Hz                           7.74     0.53   -13.95   -13.85   -13.38    11.62    15.56    -2.80   -10.00
12500 Hz                           4.21    -1.75   -12.62   -12.10   -10.96    18.76    19.94     2.76    -9.67
16000 Hz                           7.23     2.95   -13.13   -10.04    -7.49    33.93    29.60    12.18    -9.77
  E5 check, max |ref - E5| and mean (dB): intro 0.05/-0.00  intro2 0.05/+0.01  build 0.05/+0.01  mainA 0.05/-0.01  mainA2 0.05/+0.00  break 0.05/+0.01  breakEnd 0.05/-0.01  mainB 0.05/+0.00  outro 0.05/-0.00

MID/SIDE PER BAND (render minus reference): S/M dB, then rho
20-120 Hz S/M dB                 -11.72   -19.36    16.13    12.02    11.25     8.81     8.21     9.82     6.58
20-120 Hz rho                      0.00     0.00    -0.00    -0.00    -0.00    -0.00    -0.00    -0.00    -0.00
120-300 Hz S/M dB                -34.17   -33.16    17.50    12.78    11.75    11.27    10.15    10.71     7.10
120-300 Hz rho                     0.00     0.00    -0.48    -0.42    -0.40    -0.40    -0.34    -0.36    -0.14
300-1000 Hz S/M dB               -31.19   -34.59     2.79     2.06     1.81     2.18     2.30     2.53     1.63
300-1000 Hz rho                    0.14     0.42    -0.31    -0.23    -0.20    -0.24    -0.25    -0.27    -0.17
1000-4000 Hz S/M dB              -17.88   -14.33     5.37     5.93     2.75    -2.04    -2.16     2.29     1.42
1000-4000 Hz rho                   0.75     0.56    -0.56    -0.58    -0.25     0.19     0.19    -0.20    -0.13
4000-10000 Hz S/M dB               3.40     5.04     5.03    -7.68    -6.60   -29.53   -32.08   -14.43     2.56
4000-10000 Hz rho                 -0.35    -0.51    -0.29     0.14     0.18     0.48     0.29     0.16    -0.04
10000-16000 Hz S/M dB              1.48     3.27    -2.40    -7.78    -9.28   -43.33   -46.31   -23.60     7.56
10000-16000 Hz rho                -0.15    -0.33     0.03     0.08     0.11     0.47     0.34     0.09    -0.09

PER-BAR 4-16 kHz LEVEL, window mean of bars, dB (render minus reference)
4000-8000 Hz                      -9.02   -18.50   -17.45   -15.44   -13.84     4.60    14.29   -13.11    -9.26
8000-12000 Hz                      3.13    -6.88   -14.20   -13.42   -12.27     7.18    20.30   -11.49    -9.65
12000-16000 Hz                     3.42    -3.68   -12.68   -11.02    -7.94    18.09    27.35    -8.30    -9.11

KICK GLIDE AND SUB DUCK (coherent fit; render minus reference)
glide f0 Hz                       31.51    36.17    42.60    48.99    58.41    82.63    81.21    71.12    64.45
glide fT Hz                        1.59     2.41     2.04     2.78     3.30     3.99     3.25     4.19     3.94
glide tau ms                      -2.02    -2.72    -2.93    -3.82    -4.63    -5.93    -5.61    -5.70    -5.27
sub duck 0 ms                     -0.12    -0.09     1.13     0.39    -1.93    -2.09    -1.81     0.90    -0.68
sub duck 20 ms                    -1.52    -3.41    -2.33     0.23     1.76    -1.65    -3.81    -0.89     0.64
sub duck 60 ms                     1.36     1.59     1.10     3.75     3.01    -0.98    -3.69     2.93     2.77
sub duck 100 ms                   -0.20    -0.15    -2.58    -0.93    -1.92     1.49    -2.39     0.18    -1.25
sub duck 200 ms                    2.05     0.18     0.67    -0.91    -2.48    -3.86    -0.74     0.72    -2.53

largest |render - reference| deltas in the table:
     -46.31  breakEnd: S/M 10000-16000 Hz
     -43.33  break: S/M 10000-16000 Hz
     -34.59  intro2: S/M 300-1000 Hz
     -34.17  intro: S/M 120-300 Hz
     +33.93  break: 16000 Hz band
     -33.16  intro2: S/M 120-300 Hz
     -32.08  breakEnd: S/M 4000-10000 Hz
     -31.19  intro: S/M 300-1000 Hz
     +29.60  breakEnd: 16000 Hz band
     -29.53  break: S/M 4000-10000 Hz
     -23.60  mainB: S/M 10000-16000 Hz
     +19.94  breakEnd: 12500 Hz band
```

### 7.2 Twelve largest deltas (as the tool ranks them; S/M units are dB of a side-to-mid ratio, not a level)

Printed by the report above: breakEnd S/M 10-16 kHz -46.3; break S/M 10-16 kHz -43.3; intro2 S/M 300 Hz-1 kHz -34.6;
intro S/M 120-300 Hz -34.2; break 16 kHz band +33.9; intro2 S/M 120-300 Hz -33.2; breakEnd S/M 4-10 kHz -32.1;
intro S/M 300 Hz-1 kHz -31.2; breakEnd 16 kHz band +29.6; break S/M 4-10 kHz -29.5; mainB S/M 10-16 kHz -23.6;
breakEnd 12.5 kHz band +19.9. Mostly mid/side on the mono intro (the render is mono where the record has side) and
the break/breakEnd high band.

### 7.3 Three largest level deltas, each pointed at a spec parameter and an analyst

1. **breakEnd and break, 8 to 16 kHz (+12 to +34 dB in the 29-band table; LUFS +5.8 LU breakEnd, +3.2 LU break).**
   Solo renders of breakEnd (bars 128 to 135): `bed` alone is the whole mix (LUFS -7.4 against the mix's -6.5; 8 to 16 kHz
   -16.9 dB against the mix's -17.3). In the break (bars 104 to 127) `bed` alone is -22.5 dB in 8 to 16 kHz against the
   mix's -22.8, while its LUFS (-13.1) is close to the reference's break (-12.6). So the bed is too bright, not only too
   loud. E5's reference for bars 104 to 119 is about -40 dB at 8 to 12 kHz and -53.5 at 12 to 16 kHz.
   Parameters (song.js, GUIDANCE_V3 `bed`, inst `riser`): `gain` 0.9, `from` 5000, `to` 16000, `q` 0.3, `floor` 0.04,
   `hold` 15 bars; section sets `bed.level` (1, then ramp to 0.5 over bars 0-3). **Owner: A7** (synths.js riser and
   song.js V3). Suggested: lower `to` (or the band), set the bed level by band rather than by gain (E3's 20th-percentile
   bands: 5-8 kHz -66 to -47, 8-12.5 kHz -73 to -51, 12.5-16 kHz -82 to -52, in E3's units). E3 request C16 is the same item.
2. **mainA (and mainB, outro), 4 to 16 kHz (-14 to -17 dB at 3 to 8 kHz; -10 at 16 kHz).** Reference, bars 40 to 55, per
   bar mean: 4-8 kHz -32.5, 8-12 kHz -34.7, 12-16 kHz -42.0 dB (E5's table for bars 40 to 71 gives -32.5, -34.7, -42.0).
   Render, same bars: -47.9, -48.1, -53.8. Solo attribution (mainA, bars 40 to 55): `hat_open` alone gives -48.9, -48.4,
   -54.5 (LUFS -37.3); `clap` -56.2 (LUFS -44.4), `shaker` -65.5, `tick` -67.0; everything else is below -70. So the
   open hat is the whole high band of mainA and it is about 13 to 16 dB too quiet. The gains needed: about +16 dB in
   4-8 kHz, +14 in 8-12, +12.5 in 12-16 (average +14 dB). Parameter: song.js `hat_open` gain 0.154 (the channel gain
   E3 computed on a flattened kick; E3 C11 asked A9 to re-set it). **Owner: A7** (song.js hat_open gain, E3 final
   table, with E5's level table). E5's rule says scale every row by about +5 dB before the global 0.58; that is not
   enough here. Re-measure after the change.
3. **intro2, 2.5 to 4 kHz (-15 to -17 dB), and intro 4 to 16 kHz (+6 to +7 dB, the render brighter).** intro2: the
   reference burst hit (bars 19 and 23, step 12, 0.3 s) is -30.6 and -34.5 dBFS RMS in 1 to 2.5 kHz (E3: -31), and
   -43.8 and -42.0 in 2.5 to 4 kHz. The render's burst solo gives -55.8 and -52.8 (1 to 2.5 kHz) and -57.8 and -53.7
   (2.5 to 4 kHz): about 25 dB too quiet in 1 to 2.5 kHz and 14 dB in 2.5 to 4 kHz. The hat (`hat_open`) in intro2 is
   -88 dBFS in 2.5 to 4 kHz, which is E5's ramp (bars 16 to 20 at -38 to -32 re bar 40), so the hat is not the gap.
   Parameter: song.js `burst` gain 0.035 (inst `shaker`, pan -1) with the section ramp `burst.level` 1 to 2.5 (bars 7-8
   of intro2). **Owner: A7** (burst gain and spectrum; E3's burst spec: 1-2.5 kHz at -31 dBFS for 0.3 s).

### 7.4 Timing (`--onsets`, 0-based steps; bass V3 mainB solo against the reference mix; swing 0.40; 4 ms threshold)

```
window bars 136..151, band 350-1000 Hz, method slope, search -10..+30 ms, hits within 8 dB of the loudest
control (0-based even steps 0,2,4,8,10,12,14): render +7.23 ms, reference -1.75 ms
step0 |    n      abs      sd      rel |    n      abs      sd      rel | delta rel delta abs  PASS/FAIL 4 ms (rel)
      | render                          | reference (mix)                 |
    0 |    0     +nan     nan     +nan |   13    -1.44    2.58    +0.32 |      +nan      +nan  
    1 |   16   +21.47    2.67   +14.25 |   16   +12.33    7.76   +14.08 |     +0.16     +9.15  PASS
    2 |   16    -0.95    2.81    -8.18 |    2    +1.20    0.88    +2.95 |    -11.13     -2.15  
    3 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    4 |    0     +nan     nan     +nan |    8    -4.52    2.47    -2.77 |      +nan      +nan  
    5 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    6 |    8   +15.67    0.17    +8.44 |    8    +8.47    7.25   +10.23 |     -1.79     +7.20  PASS
    7 |    8    -6.76    0.17   -13.99 |    7   +15.12   10.65   +16.87 |    -30.86    -21.88  
    8 |    8   +24.98   10.43   +17.75 |   16    -1.75    3.02    +0.00 |    +17.75    +26.73  
    9 |    4    -0.57    0.10    -7.79 |    1    -5.93    0.00    -4.17 |     -3.62     +5.36  
   10 |    0     +nan     nan     +nan |    2    +0.50    6.84    +2.26 |      +nan      +nan  
   11 |   16   +21.44    2.97   +14.21 |   16    +8.76    6.10   +10.51 |     +3.70    +12.68  PASS
   12 |   12    -2.40    2.21    -9.63 |   11    -2.32    4.28    -0.57 |     -9.06     -0.08  
   13 |    0     +nan     nan     +nan |    2    +3.54    7.90    +5.29 |      +nan      +nan  
   14 |   16   +15.41    7.14    +8.18 |   11    -4.59   11.88    -2.83 |    +11.01    +20.00  FAIL
   15 |   15    -1.67    5.16    -8.89 |    0     +nan     nan     +nan |      +nan      +nan  
steps are 0-based (E1-E3 numbering). Reference n is the hit count in the mix (small n = unreliable). E numbers (absolute, their conventions): 1: E3 +11.0 / E2 +16.3 / E1 +9.6; 6: E3 +11.9 / E1 +9.7 (E2 n=6 unreliable); 8: E3 -4.6; 11: E3 +13.1 / E2 +9.9 / E1 +9.6; 14: E3 -5.0 / E2 -4.2 / E1 -4.3
```

Summary: steps 1, 6 and 11 pass (deltas +0.2, -1.8, +3.7 ms; E3 gives +11.0, +11.9, +13.1; E1 +9.6, +9.7, +9.6). Step 14
FAILS at +11.0 ms (the render's step 14 is +8.2 against the reference's -2.8; E3 -5.0, E2 -4.2, E1 -4.3). The render's
step-14 hits are soft and scatter (sd 7 ms), so the check is weakest there. The record's step 14 is early by about 5 ms
(spec 5.2f), and V3 leaves it on the grid: the spec says A9 reports it without reopening the ruling unless steps 1, 6, 11
also disagree. They do not. Render odd-step delay (step 1 rel +14.3) matches swing 0.40 (15.7 ms predicted) and the
reference (+14.1).

Open hats, V3, mainA (`--onset-band 6000-16000`, absolute ms re the grid line):

```
window bars 40..55, band 6000-16000 Hz, method slope, search -10..+30 ms, hits within 8 dB of the loudest
control (0-based even steps 0,2,4,8,10,12,14): render -0.95 ms, reference -7.14 ms
step0 |    n      abs      sd      rel |    n      abs      sd      rel | delta rel delta abs  PASS/FAIL 4 ms (rel)
      | render                          | reference (mix)                 |
    0 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    1 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    2 |   16    -0.93    0.09    +0.02 |   16    -7.14    0.57    +0.00 |     +0.02     +6.21  
    3 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    4 |    0     +nan     nan     +nan |   11    -7.15    0.71    -0.01 |      +nan      +nan  
    5 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    6 |   16    -0.94    0.10    +0.01 |   16    -7.15    0.53    -0.01 |     +0.02     +6.21  PASS
    7 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    8 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    9 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
   10 |   16    -0.96    0.10    -0.01 |   16    -6.79    0.60    +0.35 |     -0.36     +5.82  
   11 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
   12 |    0     +nan     nan     +nan |   11    -7.20    0.56    -0.06 |      +nan      +nan  
   13 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
   14 |   16    -0.95    0.09    +0.00 |   16    -6.81    0.62    +0.33 |     -0.33     +5.86  PASS
   15 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
steps are 0-based (E1-E3 numbering). Reference n is the hit count in the mix (small n = unreliable). E numbers (absolute, their conventions): 1: E3 +11.0 / E2 +16.3 / E1 +9.6; 6: E3 +11.9 / E1 +9.7 (E2 n=6 unreliable); 8: E3 -4.6; 11: E3 +13.1 / E2 +9.9 / E1 +9.6; 14: E3 -5.0 / E2 -4.2 / E1 -4.3
```

Steps 2, 6, 10, 14: the render reads -0.9 to -1.0 ms (sd 0.1); the reference mix reads -6.8 to -7.2 (E3: -6.5). The
render's open hats are about 6 ms late against the record (FAIL at 4 ms). Nothing in V3 moves the hats, and the cells have
a `nudge` (in 24ths of a step: 1/24 step = 4.96 ms at 0.40, the unit used for bass step 6). A nudge of about -1.3/24 would
bring them to -6.5 ms. **Owner: A7** (song.js V3 hat_open cells). Not verified by a render after such a change.

Baseline check, for the record (old master, swing 0.06, bass solo mainB, 0-based, same controls):

```
window bars 136..151, band 350-1000 Hz, method slope, search -10..+30 ms, hits within 8 dB of the loudest
control (0-based even steps 0,2,4,8,10,12,14): render +4.48 ms, reference -1.75 ms
step0 |    n      abs      sd      rel |    n      abs      sd      rel | delta rel delta abs  PASS/FAIL 4 ms (rel)
      | render                          | reference (mix)                 |
    0 |    0     +nan     nan     +nan |   13    -1.44    2.58    +0.32 |      +nan      +nan  
    1 |    0     +nan     nan     +nan |   16   +12.33    7.76   +14.08 |      +nan      +nan  
    2 |   16    +4.05    3.93    -0.44 |    2    +1.20    0.88    +2.95 |     -3.38     +2.85  
    3 |   16    -6.53    1.26   -11.01 |    0     +nan     nan     +nan |      +nan      +nan  
    4 |    0     +nan     nan     +nan |    8    -4.52    2.47    -2.77 |      +nan      +nan  
    5 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    6 |   16    +3.82    6.59    -0.66 |    8    +8.47    7.25   +10.23 |    -10.89     -4.65  FAIL
    7 |   16    -6.52    1.00   -11.00 |    7   +15.12   10.65   +16.87 |    -27.87    -21.64  
    8 |   16    +4.60    2.20    +0.12 |   16    -1.75    3.02    +0.00 |     +0.12     +6.36  
    9 |   16    -6.53    0.94   -11.01 |    1    -5.93    0.00    -4.17 |     -6.84     -0.61  
   10 |    0     +nan     nan     +nan |    2    +0.50    6.84    +2.26 |      +nan      +nan  
   11 |    0     +nan     nan     +nan |   16    +8.76    6.10   +10.51 |      +nan      +nan  
   12 |   16    +7.85    3.61    +3.36 |   11    -2.32    4.28    -0.57 |     +3.93    +10.17  
   13 |   16    -6.51    0.98   -10.99 |    2    +3.54    7.90    +5.29 |    -16.29    -10.05  
   14 |   16    +4.37    6.67    -0.12 |   11    -4.59   11.88    -2.83 |     +2.72     +8.95  PASS
   15 |   15    -6.86    1.11   -11.34 |    0     +nan     nan     +nan |      +nan      +nan  
steps are 0-based (E1-E3 numbering). Reference n is the hit count in the mix (small n = unreliable). E numbers (absolute, their conventions): 1: E3 +11.0 / E2 +16.3 / E1 +9.6; 6: E3 +11.9 / E1 +9.7 (E2 n=6 unreliable); 8: E3 -4.6; 11: E3 +13.1 / E2 +9.9 / E1 +9.6; 14: E3 -5.0 / E2 -4.2 / E1 -4.3
```

Corrected in this run: the earlier note "odd steps about 11 ms late" in README and this log came from controls that were
the odd steps (my step numbering was 1-based while E1-E3 are 0-based). The baseline's odd steps 3 and 7 read about -11 ms
against the even controls. The swing predicts +2.4 ms, so this is still unexplained (the slope rule is level-sensitive
and the baseline bass steps differ in velocity). Open; not a V3 item.

### 7.5 The three flags (measured in scratch pages, exit 0; engine files untouched)

Method: each unit run alone on an OfflineAudioContext with the engine's own `Processors.create`, a 1 kHz sine at -40 dBFS
(small signal) unless stated; the gain is the steady-state output over input. Scripts: `scratchpad/flags.js`.

| flag | measured | reading | owner |
|---|---|---|---|
| A8: makeup gain of the glue when bypassed | bypassed glue 0.00 dB (exact); active glue +4.18 dB (makeup 0.5 dB plus the node's own +3.68 dB, measured with makeup 0) | bypass leaks nothing; the active glue carries about +3.7 dB of automatic makeup at small signal, so it is not unity at any setting | A8 (processors.js compressor) |
| A8: makeup gain of the limiter when bypassed | bypassed limiter 0.00 dB; active limiter +0.69 dB at small signal (ceiling 0, clipOn off or on, so the clip is not the cause) | bypass leaks nothing; the active limiter adds +0.69 dB even below threshold (the DynamicsCompressor auto makeup). V3 runs the limiter active, so the V3 master sits +0.69 dB above the nominal ceiling at small signal | A8 (processors.js limiter; compensate with ceiling or the node's makeup) |
| A8: saturator small-signal gain, drive 0.12, mix 0.5 | +10.44 dB at -40 dBFS (A8 computed about +11); mix 1.0: +15.27 dB; mix 0: 0.00 dB; at -6 dBFS: +4.44 dB | the gain is level dependent (it falls by 6 dB between -40 and -6 dBFS), so a fixed trim fixes only the small-signal case. V3 bypasses the saturator (no effect on V3); the baseline master uses it, which accounts for much of the baseline's hot master | A8 (processors.js saturator; default master) |
| A7: is the clipper active in the V3 master, and where is the 0.00 dBFS peak | yes: `clipOn` true, clip -0.55 dB (level 0.9386). Full V3 song: 3,336 samples at or over the clip level; the sample peak is one sample of -1.0025 (+0.02 dBFS) at bar 127, R channel (the WAV writer clamps it to -32768, which reads 0.00 dBFS) | the clip is active in breakLate and breakEnd (bars 122 to 137). The overshoot above the clip (0.9973 at bar 134, -1.0025 at bar 127) comes from the 4x oversampled clip stage rolling over at the knee; the mechanism was not isolated in a unit test. A bars-only render from bar 120 does not reproduce the bar-127 peak, the full song does, so the peak depends on the state carried from earlier sections | source of the level: A7 (bed in breakLate and breakEnd, item 1 above); clip overshoot: A8 (processors.js clip) |

### 7.6 Sanity checks of the loop itself

- The 16-bar intro render scores identically to the full-song intro window (LUFS -1.32 both; 25 Hz -4.54 both; 16 kHz
  +7.23 both; crest -1.77 against -1.78), so the V3 state carries no difference into bars 0 to 15.
- The 16-bar mainA render, scored on its own bars (`render40-55` column): LUFS -0.16 against the full song's -0.18; 4-8 kHz
  -15.40 against -15.44. The break 16-bar render, scored on bars 104 to 119 (`break104`): LUFS +1.58 against the full
  window's +3.22, so breakLate (bars 120 to 127) is the hotter half of the break.
- The full render from the coordinator's file and my seeded full render have identical int16 counts (32768 at -1: one
  sample; 90 at |v| >= 32000, bars 122 to 137), so the file is reproducible from the current tree.

### 7.7 What is open for the loop, by owner

- A7 (song.js V3, synths.js): bed brightness (item 1), hat_open gain +14 dB (item 2), burst gain and spectrum +14 to
  +25 dB (item 3), hat nudge about -1.3/24 (open hats 6 ms late), bass step-14 hits soft and scattered (E2's soft-hit
  pattern; check the velocity and the nudge on step 14 after the hat fix).
- A8 (processors.js): limiter +0.69 dB small-signal makeup (decide: keep, or trim the ceiling); the clip overshoot past the
  clip level (oversampled clip stage); saturator trim at small signal (baseline master only).
- Mine (loop): nothing outstanding in the tools beyond the onset check's soft-hit scatter on step 14. The baseline
  odd-step result is open (README).
