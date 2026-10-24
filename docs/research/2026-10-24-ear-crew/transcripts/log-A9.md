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


## 8. Loop run on the iteration-2 V3 (2026-10-24, after A7 and A8 iteration 2)

Exit codes read directly: `python3 tools/score.py ... --v3` 0 (full render and the four 16-bar windows); `--onsets` 0 (mainA
hats, mainA3 bass); `node tools/render.js --page app --song v3 ...` 0 for every render below (16-bar windows, mainA hat solo,
mainA3 bass solo, intro2 mix and burst solo, build and break solos per track); the full-song render is the coordinator's
`tools/out/app-bars-0-200-v3.wav` (sidecar latency 458 samples, tail 6.5 s; swing 0.40).

Rulings applied: burst scored by the intro2 2.5-4 kHz delta with a 3 dB tolerance, on the burst's level basis (E3 -31 dBFS RMS
at 1-2.5 kHz); mainA hats judged on 4-16 kHz with +3 dB as the line above which the hat comes down.

### 8.1 Per-section delta table, full V3 song (render minus reference)

The report text is pasted from the saved run (`scratchpad/loop2/v3_full.txt`). The last column is the whole song.

```
V3 report: render tools/out/app-bars-0-200-v3.wav (layout v3, latency 458 samples), reference /root/.claude/uploads/341aa418-0695-5408-80be-331d2fec6cae/9014b1a3-Guidance_Original_Mix_192kbps.mp3
measure                           intro   intro2    build    mainA   mainA2    break breakEnd    mainB    outro break104 break120 render0-
------------------------------------------------------------------------------------------------------------------------------------------
LOUDNESS AND PEAKS (render minus reference)
LUFS ungated (E5 1b)              -1.32    -1.33     0.56     0.39     0.58     1.27     0.76     0.81    -0.18     1.38     1.10     0.42
LUFS gated (O1 M9)                -1.32    -1.33     0.56     0.39     0.58     1.27     0.76     0.81    -0.18     1.38     1.10     0.42
sample peak dBFS                  -2.41    -2.37    -0.03    -0.34    -0.31    -0.13    -0.04    -0.37    -0.16    -0.13    -0.05    -0.37
true peak dBTP                    -2.41    -2.37     0.22    -0.05     0.16    -0.13     0.02    -0.02    -0.25    -0.13    -0.03    -0.02
rms dBFS (L+R mean square)        -0.63    -0.64     0.52     0.45     0.72     2.13     1.75     1.32     0.63     2.22     1.96     0.81
crest, sample peak - rms          -1.78    -1.72    -0.55    -0.79    -1.03    -2.26    -1.78    -1.69    -0.79    -2.35    -2.01    -1.19
PLR, TP - gated LUFS              -1.09    -1.03    -0.33    -0.44    -0.42    -1.40    -0.73    -0.83    -0.07    -1.50    -1.13    -0.44

29 THIRD-OCTAVE BANDS, dB re window total (render minus reference); the E5 check is printed below the table
25 Hz                             -4.54    -4.80    -6.42    -5.52    -4.79     9.62    -1.08    -3.57    -3.64     9.60     9.56    -4.10
31.5 Hz                            3.83     3.64     2.30     2.72     2.35     5.15     0.17     2.16     2.85     5.06     5.23     2.43
40 Hz                             -1.69    -1.85    -3.28    -2.61    -1.61    14.03     3.39     0.46     0.55    14.06    13.85    -0.28
50 Hz                              4.93     4.92     5.11     4.04     4.45    11.88    12.43     6.51     6.44    11.78    12.05     6.02
63 Hz                              0.96     0.95     0.58     0.13     0.07     0.19     0.69    -0.10     0.29     0.09     0.34     0.10
80 Hz                             -1.95    -1.93    -2.38    -2.44    -2.55    -3.98    -3.75    -3.02    -2.64    -4.07    -3.87    -2.77
100 Hz                            -3.01    -3.06    -3.89    -3.39    -3.36    -5.42    -5.52    -4.20    -3.69    -5.45    -5.45    -3.84
125 Hz                            -4.65    -4.57    -5.58    -5.08    -5.20    -7.09    -6.84    -5.78    -5.38    -7.16    -7.04    -5.53
160 Hz                            -2.18    -2.16    -2.97    -2.92    -2.89    -3.58    -3.61    -3.16    -2.52    -3.59    -3.63    -2.91
200 Hz                            -2.04    -2.03    -0.56    -0.69    -0.83    -1.86    -2.08    -1.43    -2.31    -1.92    -1.71    -1.29
250 Hz                            -1.66    -1.61     1.87     1.64     1.61     0.09    -0.37     0.28    -1.07     0.03     0.19     0.70
315 Hz                             2.64     2.74     4.78     2.34     1.02    -0.54    -0.87    -0.77    -3.52    -0.91     0.19     0.49
400 Hz                             5.73     5.74     6.17     6.04     4.23     2.76     2.55     2.39     1.50     2.52     3.25     3.85
500 Hz                            10.30     8.79     6.37     6.56     5.75     3.24     3.35     3.05     3.54     3.30     3.08     4.64
630 Hz                             8.54     2.42     1.22     1.36     1.73    -1.91    -2.20    -1.49     1.47    -1.26    -3.03     0.05
800 Hz                             6.73     2.03     4.06     6.37     3.50    -1.36    -1.10    -0.99     1.17    -1.07    -1.90     1.32
1000 Hz                            3.28    -0.90    10.34     4.44     5.66    -0.90    -0.77     1.33     2.29     2.17    -3.84     2.70
1250 Hz                           -0.05    -1.83     3.81     1.30    -0.27    -4.41    -6.08    -0.61    -1.69    -2.63    -6.62    -0.81
1600 Hz                           -5.04    -5.19     4.88    -3.13    -0.70    -5.32    -7.72    -2.04    -4.76    -5.19    -5.65    -2.22
2000 Hz                           -8.50    -8.33     6.86     0.87     2.17     0.63    -5.39     1.44    -7.44     0.44     1.00     1.12
2500 Hz                           -9.01   -14.07     2.80     1.28     1.42    -1.33    -4.83     0.94    -8.82    -1.30    -1.61     0.80
3150 Hz                           -8.60   -15.60     2.14     2.52     1.51    -3.65    -5.27     1.49    -9.99    -3.40    -5.38     1.29
4000 Hz                           -8.60   -15.45    -0.66     0.29    -0.33    -2.15    -3.62    -0.79   -10.22    -2.23    -2.26    -0.44
5000 Hz                           -5.88   -10.04     1.96     2.70     2.23    -0.84    -1.82     1.67   -10.05    -0.60    -3.14     1.94
6300 Hz                           -1.94    -4.44     0.40     0.49     0.13    -2.09    -1.98    -0.58    -9.75    -2.23    -1.63    -0.06
8000 Hz                            2.67    -0.98     1.69     1.56     0.88    -3.52    -0.62     0.43   -10.45    -3.86    -1.19     0.83
10000 Hz                           4.09     1.58     3.70     3.15     3.10    -3.35     0.38     2.27   -10.33    -3.90    -1.86     2.69
12500 Hz                           1.05    -2.63     4.19     3.68     3.98    -0.74     1.94     2.89   -10.02    -2.78     1.16     3.39
16000 Hz                           5.38     1.11     1.74     1.86     2.43     9.49     6.88     1.00   -10.09     7.00    10.35     2.12
  E5 check, max |ref - E5| and mean (dB): intro 0.05/-0.00  intro2 0.05/+0.01  build 0.05/+0.01  mainA 0.05/-0.01  mainA2 0.05/+0.00  break 0.05/+0.01  breakEnd 0.05/-0.01  mainB 0.05/+0.00  outro 0.05/-0.00

MID/SIDE PER BAND (render minus reference): S/M dB, then rho
20-120 Hz S/M dB                 -11.93   -25.24    16.13    11.93    11.20     8.82     8.08     9.75     6.58     8.52     9.46    10.83
20-120 Hz rho                      0.00     0.00    -0.00    -0.00    -0.00    -0.00    -0.00    -0.00    -0.00    -0.00    -0.00    -0.00
120-300 Hz S/M dB                -38.19   -39.79    17.50    12.74    11.73    11.29    10.00    10.68     7.10    11.18    11.50    11.59
120-300 Hz rho                     0.00     0.00    -0.48    -0.42    -0.40    -0.41    -0.33    -0.36    -0.14    -0.40    -0.41    -0.35
300-1000 Hz S/M dB               -33.12   -36.71     2.79     2.03     1.79     2.16     2.25     2.50     1.63     2.23     2.04     2.24
300-1000 Hz rho                    0.15     0.42    -0.31    -0.23    -0.20    -0.23    -0.24    -0.27    -0.17    -0.24    -0.22    -0.24
1000-4000 Hz S/M dB              -15.64   -12.01     3.78    -0.63    -0.72    -1.28     0.37    -1.16     1.44    -1.80    -0.26    -0.57
1000-4000 Hz rho                   0.74     0.54    -0.38     0.04     0.05     0.12    -0.04     0.08    -0.14     0.17     0.02     0.04
4000-10000 Hz S/M dB               2.38    -1.58   -10.09   -13.25   -14.36    -6.80     1.40   -12.16    -0.07   -13.84     2.51   -10.93
4000-10000 Hz rho                 -0.24     0.11     0.16     0.17     0.23     0.36    -0.09     0.17    -0.00     0.44    -0.27     0.19
10000-16000 Hz S/M dB             -1.20    -2.56    -9.16   -10.93   -12.02     1.44     3.93    -7.93     2.87   -10.85     3.54    -5.32
10000-16000 Hz rho                 0.11     0.19     0.06     0.09     0.12    -0.13    -0.34     0.08    -0.02     0.36    -0.39     0.08

PER-BAR 4-16 kHz LEVEL, window mean of bars, dB (render minus reference)
4000-8000 Hz                      -8.93   -11.02     0.65     2.20     2.28     0.66    -0.73     1.95    -9.34     1.43    -1.10    -0.66
8000-12000 Hz                      2.18    -2.74     3.61     3.77     4.15    -1.03     1.38     3.67    -9.81    -1.14    -1.37     1.55
12000-16000 Hz                     2.49    -3.12     3.60     3.99     5.50     3.04     3.68     3.99    -9.26     2.12     3.04     2.51

KICK GLIDE AND SUB DUCK (coherent fit; render minus reference)
glide f0 Hz                       31.51    36.18    42.61    48.99    58.41    82.21    84.39    71.39    64.45      n/a      n/a      n/a
glide fT Hz                        1.59     2.41     2.04     2.78     3.30     3.96     3.37     4.21     3.94      n/a      n/a      n/a
glide tau ms                      -2.02    -2.72    -2.93    -3.82    -4.63    -5.89    -5.82    -5.72    -5.27      n/a      n/a      n/a
sub duck 0 ms                     -0.12    -0.09     1.13     0.39    -1.93    -2.03    -2.25     0.93    -0.68      n/a      n/a      n/a
sub duck 20 ms                    -1.52    -3.41    -2.33     0.23     1.76    -1.45    -3.68    -0.87     0.64      n/a      n/a      n/a
sub duck 60 ms                     1.36     1.59     1.10     3.76     3.02    -1.04    -3.87     2.97     2.77      n/a      n/a      n/a
sub duck 100 ms                   -0.20    -0.14    -2.58    -0.92    -1.92     1.41    -2.60     0.24    -1.25      n/a      n/a      n/a
sub duck 200 ms                    2.05     0.18     0.66    -0.94    -2.51    -3.96    -1.45     0.68    -2.53      n/a      n/a      n/a

largest |render - reference| deltas in the table:
     -39.79  intro2: S/M 120-300 Hz
     -38.19  intro: S/M 120-300 Hz
     -36.71  intro2: S/M 300-1000 Hz
     -33.12  intro: S/M 300-1000 Hz
     -25.24  intro2: S/M 20-120 Hz
     +17.50  build: S/M 120-300 Hz
     +16.13  build: S/M 20-120 Hz
     -15.64  intro: S/M 1000-4000 Hz
     -15.60  intro2: 3150 Hz band
     -15.45  intro2: 4000 Hz band
     -14.36  mainA2: S/M 4000-10000 Hz
     -14.07  intro2: 2500 Hz band
```

### 8.2 Twelve largest deltas (the tool's ranking, as printed)

```
largest |render - reference| deltas in the table:
     -39.79  intro2: S/M 120-300 Hz
     -38.19  intro: S/M 120-300 Hz
     -36.71  intro2: S/M 300-1000 Hz
     -33.12  intro: S/M 300-1000 Hz
     -25.24  intro2: S/M 20-120 Hz
     +17.50  build: S/M 120-300 Hz
     +16.13  build: S/M 20-120 Hz
     -15.64  intro: S/M 1000-4000 Hz
     -15.60  intro2: 3150 Hz band
     -15.45  intro2: 4000 Hz band
     -14.36  mainA2: S/M 4000-10000 Hz
     -14.07  intro2: 2500 Hz band
```

Mostly mid/side on the mono intro and build (the render is wide where the record is mono below about 120 Hz), and the
high band of break and breakEnd. The level-only ranking is in 8.4.

### 8.3 Checks the rulings asked for

- **Burst (intro2 2.5-4 kHz, 3 dB tolerance): FAIL.** Delta -14.1 (2.5 kHz), -15.6 (3.15 kHz), -15.5 (4 kHz). The burst hit
  (bars 19 and 23, step 12, 0.3 s, band RMS): reference -30.6 and -34.5 dBFS at 1-2.5 kHz (E3: -31), render solo -52.3 and -49.4;
  at 2.5-4 kHz reference -43.8 and -42.0, render -58.0 and -54.0. Iteration 2 narrowed the burst but did not raise its
  level: still about 22 dB too quiet at 1-2.5 kHz and 15 dB at 2.5-4 kHz. Owner A7 (song.js `burst` gain 0.035, pan -1, and the
  `burst.level` ramp 1 to 2.5 in intro2 bars 7-8). Re-measure the hit after the change.
- **mainA hats (4-16 kHz, the +3 dB line): the hat is above the line.** Per-bar mean over the mainA window: 4-8 kHz +2.2 dB,
  8-12 kHz +3.8, 12-16 kHz +4.0 (the full-song mainA column). Above +3 at 8-16 kHz, so the hat comes down by about 1 dB
  (bringing 12-16 kHz to +3). Owner A7 (song.js `hat_open` gain; the iteration-2 value is 0 dB re kick).
- **Bar-127 overshoot: gone.** The new full file's largest int16 value is 30,757 (sample peak -0.55 dBFS, exactly the clip level),
  no sample at -32768 or +32767, and no sample at or above 32,000 in any bar. The clip still acts (the sample peak sits at the
  clip level), but nothing exceeds full scale.
- **Break mid/side at 10-16 kHz, after the bed is decorrelated (bars 104-127):** render S/M -3.6 dB, rho 0.40; reference S/M
  -5.1 dB, rho 0.53. So S/M is within 1.5 dB and rho is 0.13 low. In the 4-10 kHz band the render is -11.8 dB (rho 0.88) against
  the reference -5.0 (rho 0.52): the break's 4-10 kHz is now more mono than the record. breakEnd (128-135): render S/M -2.9,
  rho 0.32; reference -6.8, rho 0.66.

### 8.4 Three largest level deltas, each with its parameter and owner

Level, not mid/side (the ranking above is dominated by S/M units; the three below are dB of band level, with a window):

1. **intro2, 2.5 to 4 kHz: -14 to -16 dB (29-band table).** Burst, not hats (the hat in intro2 is -88 dBFS at 2.5-4 kHz, which is E5's
   ramp). Parameter: song.js `burst` gain 0.035 and the `burst.level` ramp. **Owner A7.** (Section 8.3.)
2. **break, 30 to 50 Hz: +12 to +14 dB (40 Hz +14.0, 50 Hz +11.9, 25 Hz +9.6).** Solo attribution, bars 104 to 119: `bass` alone is
   -22.9 dBFS in 30-50 Hz, which is the whole mix (-22.8); the reference is -39.3, and the kick alone is -37.0 (correct). E1: the
   record has no 51.5 Hz bass fundamental (its 2nd and 3rd harmonics are present), so the bass's fundamental has to come down.
   Parameter: song.js `bass` (V3 bass D in break; the fundamental and its low-end content, the pitch and filter settings in E2's
   table). **Owner A7** (bass in synths.js and song.js); a high-pass on the bass track would be the cleanest fix, if the
   engine allows a per-track insert (A8 `processors.js` if a new insert is needed).
3. **build, 1 to 2 kHz: +5 to +10 dB (1000 Hz +10.3, 1600 Hz +4.9, 2000 Hz +6.9), plus mid/side 20-300 Hz +16 to +18 dB.** Solo
   attribution, bars 24 to 39: `stab` alone is -33.6 dBFS at 1-2 kHz and the mix is -32.9 (reference -38.0); the stab also carries
   side energy at 20-120 Hz (+2.4 dB S/M) and 120-300 Hz (+2.9 dB), where the record is mono. Parameters: song.js `stab` gain and
   the build `stab.cutoff` ramp (900 to 2400, bars 24-39; E2's sweep cutoffs), and the stab widener (`width` 1.4, `spread` 0.8;
   E5 wants `monoBelow` 250 on the widener). **Owners: A7** (stab gain and cutoff ramp, song.js) and **A8** (widener `monoBelow`,
   processors.js; the parameter exists per log-A8, default off).

Not attributed: intro 16 kHz +5.4 dB (4-16 kHz render brighter than the record in the intro; the intro hat is at 0.002 to 0.0136
and E5's tone-opening ramp is in place, so the candidate is the intro burst's top band; not measured).

### 8.5 Timing (`--onsets`, 0-based steps, 4 ms threshold)

Open hats, mainA (`--onset-band 6000-16000`, absolute ms re the grid line; steps 2, 6, 10, 14). Iteration 2's hat nudge brought
them in: render -5.9 ms (sd 0.1), reference -6.8 to -7.2; deltas +1.2, +1.2, +0.9, +0.9 ms: PASS on all four.

```
window bars 40..55, band 6000-16000 Hz, method slope, search -10..+30 ms, hits within 8 dB of the loudest
control (0-based even steps 0,2,4,8,10,12,14): render -5.90 ms, reference -7.14 ms
step0 |    n      abs      sd      rel |    n      abs      sd      rel | delta rel delta abs  PASS/FAIL 4 ms (rel)
      | render                          | reference (mix)                 |
    0 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    1 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    2 |   16    -5.90    0.70    +0.00 |   16    -7.14    0.57    +0.00 |     +0.00     +1.24  
    3 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    4 |    0     +nan     nan     +nan |   11    -7.15    0.71    -0.01 |      +nan      +nan  
    5 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    6 |   16    -5.91    0.06    -0.01 |   16    -7.15    0.53    -0.01 |     +0.00     +1.24  PASS
    7 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    8 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    9 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
   10 |   16    -5.93    0.07    -0.03 |   16    -6.79    0.60    +0.35 |     -0.39     +0.86  
   11 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
   12 |    0     +nan     nan     +nan |   11    -7.20    0.56    -0.06 |      +nan      +nan  
   13 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
   14 |   16    -5.87    0.08    +0.02 |   16    -6.81    0.62    +0.33 |     -0.31     +0.94  PASS
   15 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
steps are 0-based (E1-E3 numbering). Reference n is the hit count in the mix (small n = unreliable). E numbers (absolute, their conventions): 1: E3 +11.0 / E2 +16.3 / E1 +9.6; 6: E3 +11.9 / E1 +9.7 (E2 n=6 unreliable); 8: E3 -4.6; 11: E3 +13.1 / E2 +9.9 / E1 +9.6; 14: E3 -5.0 / E2 -4.2 / E1 -4.3
```

Bass, mainA3 (`--sections mainA3 --solo bass`, 88-103; mainA itself has no bass in V3 per E4's row 4). The reference has
5 to 12 hits per step with sd 5 to 10 ms in this window, so the reference cannot resolve the bass onsets to 4 ms here: the
deltas (-4.7, -10.7, +9.0, +4.9 at steps 1, 6, 11, 14) lie inside the reference's own scatter. Not judged. The mainB bass
check (section 7.4, reference sd 2 to 4 ms at steps 1 and 11) remains the usable bass check.

```
window bars 88..103, band 350-1000 Hz, method slope, search -10..+30 ms, hits within 8 dB of the loudest
control (0-based even steps 0,2,4,8,10,12,14): render +4.61 ms, reference -2.30 ms
step0 |    n      abs      sd      rel |    n      abs      sd      rel | delta rel delta abs  PASS/FAIL 4 ms (rel)
      | render                          | reference (mix)                 |
    0 |    0     +nan     nan     +nan |   12    -1.17    1.16    +1.12 |      +nan      +nan  
    1 |    5   +19.60    2.71   +14.99 |   12   +17.39    8.63   +19.68 |     -4.69     +2.22  FAIL
    2 |    8    -0.95    2.84    -5.56 |    3    -9.37    9.78    -7.07 |     +1.51     +8.42  
    3 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    4 |    0     +nan     nan     +nan |   13    -2.77    3.53    -0.48 |      +nan      +nan  
    5 |    0     +nan     nan     +nan |    1   +27.61    0.00   +29.91 |      +nan      +nan  
    6 |    4   +15.67    0.17   +11.06 |    5   +19.43    5.68   +21.72 |    -10.66     -3.76  FAIL
    7 |    4    -6.76    0.17   -11.37 |    8   +15.96    8.92   +18.25 |    -29.62    -22.71  
    8 |    1   +28.13    0.00   +23.52 |   15    -1.82    2.05    +0.48 |    +23.04    +29.95  
    9 |    1    -0.46    0.00    -5.07 |    0     +nan     nan     +nan |      +nan      +nan  
   10 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
   11 |    9   +19.92    3.05   +15.31 |   11    +4.01   10.27    +6.30 |     +9.01    +15.91  FAIL
   12 |    6    -3.67    2.00    -8.28 |   14    -5.83    3.65    -3.54 |     -4.74     +2.16  
   13 |    0     +nan     nan     +nan |    3    -3.84    5.70    -1.54 |      +nan      +nan  
   14 |    9   +10.17    7.24    +5.56 |    7    -1.64    7.40    +0.66 |     +4.90    +11.81  FAIL
   15 |    7    -1.67    5.10    -6.28 |    0     +nan     nan     +nan |      +nan      +nan  
steps are 0-based (E1-E3 numbering). Reference n is the hit count in the mix (small n = unreliable). E numbers (absolute, their conventions): 1: E3 +11.0 / E2 +16.3 / E1 +9.6; 6: E3 +11.9 / E1 +9.7 (E2 n=6 unreliable); 8: E3 -4.6; 11: E3 +13.1 / E2 +9.9 / E1 +9.6; 14: E3 -5.0 / E2 -4.2 / E1 -4.3
```

### 8.6 Sanity

- The 16-bar windows against the full-song columns: intro identical to 0.01 dB on every row; mainA (bars 40-55 against 40-71)
  LUFS +0.41 against +0.39; mainB (136-151 against 136-183) LUFS +0.75 against +0.81; break (104-119 against 104-127) LUFS +1.39
  against +1.27, so breakLate (120-127) is the difference (16-bar 16 kHz +7.0 against the full window's +9.5). The 16-bar
  columns are in `scratchpad/loop2/v3_*.txt`.
- The whole-song column (last column of 8.1) reads LUFS +0.42 against the reference's whole-song value (coordinator -10.23 against
  the reference's -10.65 gives +0.42), which matches.

### 8.7 Open, by owner (after iteration 2)

- A7: burst level (+20 dB at the burst, then re-measure); hat_open gain -1 dB; bass fundamental (break 30-50 Hz, +14 dB); stab
  gain and cutoff ramp in build (1-2 kHz, +5 to +10 dB); the bed's low end and breakLate's 4-10 kHz mono (the break's 4-10 kHz is
  now -11.8 dB S/M against the record's -5.0: the bed decorrelated the 10-16 kHz, but the 4-10 kHz went the other way).
- A8: widener `monoBelow` (stab side at 20-300 Hz in build); the clip overshoot is gone; the limiter's +0.69 dB small-signal makeup
  is still present (unchanged from iteration 1, documented by A8).
- Mine: the bass onset check cannot resolve steps in mainA3 against the mix (the reference's scatter); a solo-based reference is
  not available (no stems). Nothing else open in the tools.
