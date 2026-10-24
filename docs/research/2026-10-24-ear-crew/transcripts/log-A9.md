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


## 9. Third loop on V3 (iteration 3, 2026-10-24, after A7's iteration 3, commit c058ed7)

Exit codes read directly: `--v3` full render 0 and each 16-bar window 0 (intro, mainA, break, mainB; each re-rendered with
`--song v3`); `--onsets` 0 (mainA hats; mainB bass); solo renders of intro (kick, hat_open, burst, burst_r), break (every
track), outro (kick, sub, bass, stab, pad, clap, burst, burst_r, shaker, hat_open) and mainA (hat_open), each 0; selftest 0;
py_compile 0; node --check 0. The full render is the coordinator's `tools/out/app-bars-0-200-v3.wav` (sidecar latency 458,
tail 6.5 s, swing 0.40). No engine files changed.

### 9.1 Per-section delta table, full V3 song (render minus reference)

The report is pasted from the saved run (`scratchpad/loop3/v3_full.txt`); the last column is the whole song.

```
V3 report: render tools/out/app-bars-0-200-v3.wav (layout v3, latency 458 samples), reference /root/.claude/uploads/341aa418-0695-5408-80be-331d2fec6cae/9014b1a3-Guidance_Original_Mix_192kbps.mp3
measure                           intro   intro2    build    mainA   mainA2    break breakEnd    mainB    outro break104 break120 render0-
------------------------------------------------------------------------------------------------------------------------------------------
LOUDNESS AND PEAKS (render minus reference)
LUFS ungated (E5 1b)              -0.03    -0.03    -0.58     0.12     0.27     0.12    -0.44     0.18    -0.69     0.24    -0.06     0.02
LUFS gated (O1 M9)                -0.03    -0.03    -0.58     0.12     0.27     0.12    -0.44     0.18    -0.69     0.24    -0.06     0.02
sample peak dBFS                  -0.70    -0.03    -0.03    -0.34    -0.31    -0.13    -0.04    -0.37    -0.23    -0.13    -0.05    -0.37
true peak dBTP                    -0.69    -0.03     0.02    -0.13     0.06    -0.10     0.03    -0.17    -0.32    -0.14     0.00    -0.17
rms dBFS (L+R mean square)         0.66     0.65    -0.25     0.29     0.43     0.20    -0.25     0.44    -0.10     0.30     0.02     0.33
crest, sample peak - rms          -1.36    -0.68     0.22    -0.62    -0.74    -0.33     0.21    -0.81    -0.14    -0.43    -0.07    -0.70
PLR, TP - gated LUFS              -0.67     0.00     0.60    -0.25    -0.20    -0.22     0.47    -0.35     0.38    -0.38     0.07    -0.19

29 THIRD-OCTAVE BANDS, dB re window total (render minus reference); the E5 check is printed below the table
25 Hz                             -4.54    -4.80    -5.81    -5.53    -5.42    -1.10    -6.93    -5.41    -4.94    -1.10    -1.09    -5.36
31.5 Hz                            3.83     3.63     3.07     2.87     2.58    -6.85     1.61     2.75     3.23    -6.92    -6.70     2.98
40 Hz                             -1.69    -1.85    -2.59    -2.51    -2.64     3.41    -3.40    -2.54    -2.06     3.43     3.24    -2.30
50 Hz                              4.93     4.91     5.88     4.17     4.09     7.16     7.69     4.74     5.04     7.05     7.34     4.71
63 Hz                              0.96     0.94     1.35     0.27     0.29     0.33     0.79     0.41     0.73     0.23     0.50     0.56
80 Hz                             -1.95    -1.93    -1.61    -2.27    -2.27    -2.22    -1.91    -2.20    -1.97    -2.31    -2.08    -2.08
100 Hz                            -3.01    -3.06    -3.12    -3.23    -3.09    -3.46    -3.47    -3.31    -2.96    -3.48    -3.45    -3.17
125 Hz                            -4.65    -4.58    -4.81    -4.93    -4.93    -5.21    -4.84    -4.93    -4.67    -5.28    -5.13    -4.87
160 Hz                            -2.18    -2.17    -2.23    -2.78    -2.50    -1.14    -1.08    -1.76    -1.41    -1.15    -1.15    -1.99
200 Hz                            -2.04    -2.03    -1.37    -1.33    -1.34    -0.73    -0.68    -1.30    -1.92    -0.80    -0.56    -1.38
250 Hz                            -1.66    -1.62    -0.08     0.51     0.77     1.00     0.74     0.18    -0.98     0.94     1.12     0.15
315 Hz                             2.64     2.74     2.96     1.85     0.82     0.97     0.77    -0.30    -3.22     0.59     1.73     0.42
400 Hz                             5.73     5.74     4.38     5.81     4.15     4.35     4.25     2.92     1.92     4.10     4.87     3.87
500 Hz                            10.30     8.79     4.63     6.57     5.84     5.00     5.22     3.76     4.13     5.06     4.87     4.85
630 Hz                             8.54     2.43    -0.11     1.47     1.98    -0.01    -0.19    -0.62     2.15     0.64    -1.10     0.45
800 Hz                             6.74     2.13     1.82     6.48     3.72     0.53     0.90    -0.13     1.87     0.82     0.01     1.65
1000 Hz                            3.37    -0.45     5.89     4.62     5.95     1.04     1.25     2.22     3.11     4.12    -1.90     2.82
1250 Hz                            0.32     0.26    -0.61     1.88     0.29    -2.27    -4.07     0.52    -0.00    -0.37    -4.67    -0.46
1600 Hz                           -3.78     0.15    -0.07    -2.37    -0.01    -2.99    -5.73    -0.79    -1.35    -2.68    -3.70    -1.75
2000 Hz                           -4.71     1.34     3.44     1.26     2.72     3.15    -3.45     2.53    -1.81     3.17     2.95     1.66
2500 Hz                           -2.16    -1.31     1.69     1.13     1.58     1.17    -3.03     1.70    -1.72     1.35     0.35     1.17
3150 Hz                            0.36    -1.91     2.11     2.16     1.40    -1.39    -3.71     2.00    -1.86    -1.10    -3.42     1.44
4000 Hz                            1.59    -1.78    -0.45    -0.23    -0.64    -0.24    -2.18    -0.43    -2.20    -0.32    -0.30    -0.45
5000 Hz                            3.63     1.80     2.04     2.08     1.75     0.68    -0.36     1.93    -2.99     0.87    -1.19     1.77
6300 Hz                            4.41     3.45     0.35    -0.21    -0.44    -0.87    -0.52    -0.40    -4.90    -1.08     0.32    -0.33
8000 Hz                            4.35     1.72     1.58     0.82     0.27    -2.35     0.85     0.59    -8.05    -2.81     0.76     0.53
10000 Hz                           2.87     0.96     3.58     2.41     2.49    -2.02     1.89     2.43    -9.18    -2.82     0.09     2.38
12500 Hz                          -1.78    -4.95     4.06     2.94     3.37     0.93     3.67     3.05    -9.36    -1.57     3.11     3.10
16000 Hz                          -4.16    -7.43     1.61     1.15     1.88    11.35     8.84     1.21    -9.92     8.58    12.30     1.96
  E5 check, max |ref - E5| and mean (dB): intro 0.05/-0.00  intro2 0.05/+0.01  build 0.05/+0.01  mainA 0.05/-0.01  mainA2 0.05/+0.00  break 0.05/+0.01  breakEnd 0.05/-0.01  mainB 0.05/+0.00  outro 0.05/-0.00

MID/SIDE PER BAND (render minus reference): S/M dB, then rho
20-120 Hz S/M dB                 -12.33   -11.67    -4.87    -6.58    -7.25    -6.02    -6.56    -7.69   -11.08    -6.30    -5.40    -7.38
20-120 Hz rho                      0.00     0.00     0.00     0.00     0.00     0.00     0.00     0.00     0.00     0.00     0.00     0.00
120-300 Hz S/M dB                -31.98   -24.65    11.20     8.93     7.98     7.41     6.18     6.80     3.13     7.31     7.62     7.42
120-300 Hz rho                     0.00     0.00    -0.13    -0.19    -0.17    -0.17    -0.13    -0.14    -0.04    -0.17    -0.17    -0.13
300-1000 Hz S/M dB               -23.54   -21.43     1.45     1.52     1.28     1.67     1.79     1.98     1.14     1.74     1.55     1.64
300-1000 Hz rho                    0.14     0.42    -0.15    -0.17    -0.14    -0.18    -0.19    -0.21    -0.12    -0.19    -0.17    -0.18
1000-4000 Hz S/M dB               -5.97     0.91     1.05     1.00     0.49    -0.70     0.44    -0.06     2.91    -0.95    -0.27    -0.07
1000-4000 Hz rho                   0.50    -0.09    -0.09    -0.08    -0.04     0.07    -0.04     0.00    -0.29     0.10     0.02     0.00
4000-10000 Hz S/M dB               3.37     5.10    -7.07   -10.13   -10.94    -5.00     2.07    -9.51    13.05    -8.93     2.50    -8.31
4000-10000 Hz rho                 -0.35    -0.52     0.14     0.16     0.21     0.30    -0.14     0.16    -0.66     0.39    -0.27     0.17
10000-16000 Hz S/M dB             -7.87    -3.60    -9.16   -10.91   -11.99     1.85     4.37    -7.56     3.42   -10.22     3.55    -4.69
10000-16000 Hz rho                 0.46     0.25     0.06     0.09     0.12    -0.17    -0.38     0.08    -0.02     0.35    -0.39     0.08

PER-BAR 4-16 kHz LEVEL, window mean of bars, dB (render minus reference)
4000-8000 Hz                      -5.17    -8.24    -0.14     1.33     1.44     0.16    -1.25     1.28    -7.34     0.67    -1.09    -0.67
8000-12000 Hz                      4.28    -1.80     2.70     2.87     3.25    -1.60     0.88     2.98    -9.50    -2.00    -1.37     1.17
12000-16000 Hz                    -0.10    -4.89     2.68     3.09     4.62     2.65     3.46     3.30    -9.41     1.54     3.04     1.64

KICK GLIDE AND SUB DUCK (coherent fit; render minus reference)
glide f0 Hz                       31.52    36.17    38.49    49.29    49.25    42.96    40.04    38.58    38.30      n/a      n/a      n/a
glide fT Hz                        1.59     2.41     1.82     2.81     2.67     0.78    -0.13     1.83     1.96      n/a      n/a      n/a
glide tau ms                      -2.02    -2.72    -2.53    -3.85    -3.78    -2.45    -1.95    -2.66    -2.72      n/a      n/a      n/a
sub duck 0 ms                     -0.12    -0.09     1.16     0.39    -1.96     1.42    -3.18     0.80    -0.65      n/a      n/a      n/a
sub duck 20 ms                    -1.53    -3.41    -2.30     0.23     1.74     0.78    -4.97    -0.84     1.04      n/a      n/a      n/a
sub duck 60 ms                     1.36     1.59     1.12     3.71     2.94     1.73    -3.73     3.26     3.23      n/a      n/a      n/a
sub duck 100 ms                   -0.20    -0.15    -2.58    -1.01    -2.27     2.59    -5.60    -0.49    -1.95      n/a      n/a      n/a
sub duck 200 ms                    2.05     0.18     0.66    -0.95    -2.51    -1.26    -1.19     0.79    -2.43      n/a      n/a      n/a

largest |render - reference| deltas in the table:
     -31.98  intro: S/M 120-300 Hz
     -24.65  intro2: S/M 120-300 Hz
     -23.54  intro: S/M 300-1000 Hz
     -21.43  intro2: S/M 300-1000 Hz
     +13.05  outro: S/M 4000-10000 Hz
     -12.33  intro: S/M 20-120 Hz
     +12.30  break120-128: 16000 Hz band
     -11.99  mainA2: S/M 10000-16000 Hz
     -11.67  intro2: S/M 20-120 Hz
     +11.35  break: 16000 Hz band
     +11.20  build: S/M 120-300 Hz
     -11.08  outro: S/M 20-120 Hz
```

### 9.2 Twelve largest deltas (the tool's ranking, as printed)

```
largest |render - reference| deltas in the table:
     -31.98  intro: S/M 120-300 Hz
     -24.65  intro2: S/M 120-300 Hz
     -23.54  intro: S/M 300-1000 Hz
     -21.43  intro2: S/M 300-1000 Hz
     +13.05  outro: S/M 4000-10000 Hz
     -12.33  intro: S/M 20-120 Hz
     +12.30  break120-128: 16000 Hz band
     -11.99  mainA2: S/M 10000-16000 Hz
     -11.67  intro2: S/M 20-120 Hz
     +11.35  break: 16000 Hz band
     +11.20  build: S/M 120-300 Hz
     -11.08  outro: S/M 20-120 Hz
```

S/M units dominate the ranking again (mid/side in dB of a side-to-mid ratio, not a level); the level-only ranking is in 9.4.

### 9.3 Verdict

**Loudness: every section is within 1 LU.** The per-section LUFS deltas are intro -0.03, intro2 -0.03, build -0.58, mainA +0.12,
mainA2 +0.27, break +0.12, breakEnd -0.44, mainB +0.18, outro -0.69 (the whole-song column of the table reads +0.02, which matches the coordinator's -10.62 against the reference's -10.65). **Bands: no section is within 2 dB in every band.** The
number of the 29 third-octave bands within 2 dB is intro 8, intro2 14, build 13, mainA 12, mainA2 14, break 15, breakEnd 14, mainB
16 and outro 12. The worst band in each section: intro 500 Hz +10.3, intro2 500 Hz +8.8, build 1000 Hz +5.9, mainA 500 Hz +6.6,
mainA2 1000 Hz +6.0, break 16 kHz +11.4, breakEnd 16 kHz +8.8, mainB 25 Hz -5.4, outro 16 kHz -9.9. So: loudness passes in all nine;
bands pass in none. The closest to passing are mainB and break's low and mid bands once their 16 kHz is handled.

### 9.4 Three largest level deltas, each with parameter and owner

1. **break, 16 kHz: +11.4 dB over bars 104 to 127 (+8.7 over bars 104 to 119; breakEnd +8.8).** The break's open hat is the
   element: solo over bars 104 to 119 gives `hat_open` -61.8 dBFS in 16 kHz, against the reference's -66.1 for the whole band and the
   mix's -56.2. The bass (-69.9) and bed (-77.6) are smaller. Parameters: song.js `hat_open` in the break (the section's level set and
   the `hat_open.lp` cutoff, 11000 Hz in the track chain, the break's 16 kHz brightness). **Owner A7** (`hat_open` break level or lowpass;
   E3's break hat row). Judged in 9.5: the mainA -1 dB does not reach this.
2. **intro, 500 Hz: +10.3 dB (intro2 +8.8, mainA +6.6).** Solo: the kick alone is -35.4 dBFS in 500 Hz, which is the whole intro
   mix (-35.4); the reference is -46.5. The kick's body and click carry 400 to 630 Hz at the level the record puts in the 2nd to 5th
   harmonics (E1 table: -24 to -55 dB). Parameters: song.js `kick` drive (0.45), the click (clickLp, changed in iteration 3) and the
   tune/punch. **Owner A7** (kick, synths.js). Not changed by iteration 3.
3. **outro, 8 to 16 kHz: -8 to -10 dB (16 kHz -9.9).** The render is too quiet at the top. Solo over bars 184 to 199 at 8 kHz:
   clap -62.8, bass -64.6, burst -69.4 (per channel), stab -91.7; the mix is -59.5 against the reference -50.6. E3 and E4 put no
   hat, tick or shaker in the outro (the spec's outro row), so the record's outro top band has no named source in the spec. **Owner
   A7** (outro clap level and brightness; the source of the record's top band is open: ask E3 and E4 for an outro top-band element).
   Not resolved.

### 9.5 Judgements the coordinator asked for

- **mainA hat -1 dB (4 to 16 kHz against the +3 line): yes, apply -1 dB to `hat_open`.** Per-bar means over mainA:
  4-8 kHz +1.3 dB, 8-12 kHz +2.9, 12-16 kHz +3.1 (16-bar window: +1.8, +3.3, +3.3). The 29-band table has 5 kHz +2.7, 10 kHz +2.4 and
  12.5 kHz +2.9. A -1 dB hat moves every one of those under +2: 4-8 kHz to +0.3, 8-12 kHz to +1.9, 12-16 kHz to +2.1; 5 kHz to +1.7,
  10 kHz to +1.4, 12.5 kHz to +1.9. Solo attribution (earlier iteration) gives the hat as the whole mainA high band, so -1 dB is a
  -1 dB change in those bands. -0.5 dB would leave 12.5 kHz above +2. The same hat sits in the break, so -1 dB also takes 1 dB off the
  break's 16 kHz (item 1 above), which is not enough on its own. **Owner A7.**
- **Bass 50 Hz remainder in the break: still +7 dB.** Solo bass over bars 104 to 119 at 30 to 50 Hz is -33.6 dBFS (was -22.9 before
  iteration 3's high-pass); the mix is -32.0 and the reference -39.3. The 50 Hz third-octave band is +7.2 in the break window and +7.7
  in breakEnd. The high-pass is `hp` at 95 Hz, second order, q 0.7: at 51.5 Hz that is about -11 dB, which leaves the fundamental the
  record does not have. Estimate (not rendered): a fourth-order high-pass at 95 Hz (two stages) adds about -11 dB at 51.5 Hz, which would
  bring 50 Hz to about 0 dB against the reference. **Owner A7** (song.js bass chain).
- **Two items A7 raised.** Intro 8 kHz +4.4: solo over bars 0 to 15 gives the kick -77.6 dBFS, burst -77.4, burst_r -77.3 and open hat
  -94.0 at 8 kHz; the mix is -72.9 and the reference -77.5. Per hit (bars 3 and 7, step 12, 0.3 s, 7.1 to 11.3 kHz) the burst is
  -63.0 and -62.7 against the reference's -67.5 and -65.3, so the burst's top band is about 3 dB too loud per hit (two channels), and
  the kick's click adds a little. **Owner A7** (burst: the `lp` cutoff of 5000 Hz in its chain; a 4000 Hz cutoff would take about the 3 dB; estimate, not rendered). Break 16 kHz +8.7 (bars 104 to 119): the element is `hat_open` (item 1), with the bass (-69.9 in 16 kHz) second. The bass
  having 16 kHz energy is unexpected for a 51.5 Hz note with a 95 Hz high-pass and a 16 kHz `eq` high shelf -4 dB at 1.5 kHz; not
  investigated. **Owner A7** (bass chain, if the 16 kHz is the bass's own harmonics; A8 if it is the eq).
- **Burst (intro2 2.5 to 4 kHz, the 3 dB ruling): PASS.** Now -1.3 (2.5 kHz), -1.9 (3.15 kHz), -1.8 (4 kHz). Iteration 3 fixed it.
- **Mid/side at break 10 to 16 kHz:** not repeated here (unchanged since iteration 2: S/M -3.6 against -5.1, rho 0.40 against 0.53).

### 9.6 Timing (`--onsets`)

Open hats, mainA (6 to 16 kHz, absolute; steps 2, 6, 10, 14): unchanged. Render -5.9 ms (sd 0.1); reference -7.1 to -6.8. Deltas
+1.2, +1.2, +0.9, +0.9 (PASS on all four).

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

Bass, mainB (0-based, the usable bass check; the reference has 8 to 16 hits per step, sd 2 to 12 ms):

```
window bars 136..151, band 350-1000 Hz, method slope, search -10..+30 ms, hits within 8 dB of the loudest
control (0-based even steps 0,2,4,8,10,12,14): render +4.51 ms, reference -1.75 ms
step0 |    n      abs      sd      rel |    n      abs      sd      rel | delta rel delta abs  PASS/FAIL 4 ms (rel)
      | render                          | reference (mix)                 |
    0 |    0     +nan     nan     +nan |   13    -1.44    2.58    +0.32 |      +nan      +nan  
    1 |   16   +21.43    2.67   +16.92 |   16   +12.33    7.76   +14.08 |     +2.84     +9.10  PASS
    2 |   16    -1.01    2.81    -5.52 |    2    +1.20    0.88    +2.95 |     -8.46     -2.20  
    3 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    4 |    0     +nan     nan     +nan |    8    -4.52    2.47    -2.77 |      +nan      +nan  
    5 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    6 |    8   +15.62    0.17   +11.12 |    8    +8.47    7.25   +10.23 |     +0.89     +7.15  PASS
    7 |    8    -6.80    0.17   -11.31 |    7   +15.12   10.65   +16.87 |    -28.18    -21.92  
    8 |    8   +24.92   10.43   +20.41 |   16    -1.75    3.02    +0.00 |    +20.41    +26.67  
    9 |    4    -0.61    0.10    -5.12 |    1    -5.93    0.00    -4.17 |     -0.95     +5.31  
   10 |    0     +nan     nan     +nan |    2    +0.50    6.84    +2.26 |      +nan      +nan  
   11 |   16   +21.39    2.71   +16.89 |   16    +8.76    6.10   +10.51 |     +6.38    +12.64  FAIL
   12 |   16    -1.04    3.00    -5.55 |   11    -2.32    4.28    -0.57 |     -4.98     +1.28  
   13 |    0     +nan     nan     +nan |    2    +3.54    7.90    +5.29 |      +nan      +nan  
   14 |   16   +10.02    7.13    +5.52 |   11    -4.59   11.88    -2.83 |     +8.35    +14.61  FAIL
   15 |   15    -1.73    5.15    -6.24 |    0     +nan     nan     +nan |      +nan      +nan  
steps are 0-based (E1-E3 numbering). Reference n is the hit count in the mix (small n = unreliable). E numbers (absolute, their conventions): 1: E3 +11.0 / E2 +16.3 / E1 +9.6; 6: E3 +11.9 / E1 +9.7 (E2 n=6 unreliable); 8: E3 -4.6; 11: E3 +13.1 / E2 +9.9 / E1 +9.6; 14: E3 -5.0 / E2 -4.2 / E1 -4.3
```

Iteration 3 moved the bass: steps 1 and 6 still pass (+2.8 and +0.9 ms). Step 11 failed at +6.4 ms (render +16.9 rel, reference +10.5,
where iteration 2 was +14.2 rel) and step 14 at +8.4 ms (render +5.5 rel, reference -2.8). The 95 Hz high-pass moved the bass onsets
later on steps 11 and 14. **Owner A7** (bass hp; the hp is a filter, so its phase shifts the envelope's rise). Not judged further here.

### 9.7 Open, by owner

- A7: hat_open -1 dB (mainA) and the break's 16 kHz (item 1); kick 500 Hz (item 2, drive and click); outro top band (item 3, with
  an open question for E3 and E4); bass 50 Hz (fourth-order high-pass estimate) and the bass's step-11 and step-14 timing after the
  high-pass; burst top band (4 kHz cutoff estimate).
- A8: nothing new from this loop (the eq question for bass 16 kHz is listed under A7 until checked).
- Mine: the outro top band has no spec element to score against; ask E3 and E4 for one.


## 10. Fourth and final score of this session (iteration 4, after A7's iteration 4)

Exit codes read directly: `--v3` on the full render 0; `--v3` on the four 16-bar windows 0 each (re-rendered with `--song v3`);
`--onsets` 0 (mainA hats, mainB bass; the bass solo re-rendered, 0); solo renders 0 (mainA hat_open, mainB bass, intro burst and
kick); selftest 0; py_compile 0; node --check 0. The full render is the coordinator's `tools/out/app-bars-0-200-v3.wav` (sidecar
latency 458, tail 6.5 s, swing 0.40). No engine files changed; no commits.

### 10.1 Per-section delta table, full V3 song (render minus reference)

Pasted from the saved run (`scratchpad/loop4/v3_full.txt`). The last column is the whole song (LUFS +0.24, which is the coordinator's
-10.41 against the reference's -10.65).

```
V3 report: render tools/out/app-bars-0-200-v3.wav (layout v3, latency 458 samples), reference /root/.claude/uploads/341aa418-0695-5408-80be-331d2fec6cae/9014b1a3-Guidance_Original_Mix_192kbps.mp3
measure                           intro   intro2    build    mainA   mainA2    break breakEnd    mainB    outro break104 break120 render0-
------------------------------------------------------------------------------------------------------------------------------------------
LOUDNESS AND PEAKS (render minus reference)
LUFS ungated (E5 1b)               0.24     0.23    -0.23     0.34     0.47     0.33    -0.24     0.34    -0.43     0.44     0.15     0.24
LUFS gated (O1 M9)                 0.24     0.23    -0.23     0.34     0.47     0.33    -0.24     0.34    -0.43     0.44     0.15     0.24
sample peak dBFS                  -0.06    -0.03    -0.03    -0.34    -0.31    -0.18    -0.04    -0.37    -0.16    -0.18    -0.85    -0.37
true peak dBTP                    -0.06    -0.02     0.02    -0.13     0.06    -0.14     0.02    -0.10    -0.24    -0.14    -0.86    -0.10
rms dBFS (L+R mean square)         0.62     0.60    -0.05     0.30     0.41     0.26    -0.21     0.34    -0.15     0.36     0.08     0.31
crest, sample peak - rms          -0.68    -0.63     0.01    -0.64    -0.72    -0.44     0.17    -0.71    -0.01    -0.53    -0.93    -0.68
PLR, TP - gated LUFS              -0.30    -0.25     0.25    -0.47    -0.40    -0.47     0.26    -0.45     0.18    -0.58    -1.01    -0.34

29 THIRD-OCTAVE BANDS, dB re window total (render minus reference); the E5 check is printed below the table
25 Hz                             -4.79    -5.26    -6.18    -6.14    -6.24    -4.81    -7.75    -5.96    -5.56    -4.77    -4.71    -5.91
31.5 Hz                            3.85     3.71     2.87     2.86     2.59   -11.07     1.53     2.86     3.30   -11.14   -10.92     2.99
40 Hz                             -1.88    -1.99    -2.92    -2.84    -3.16    -2.01    -4.41    -2.91    -2.33    -1.96    -2.12    -2.70
50 Hz                              1.72     1.71     2.50     0.96     0.77     1.84     2.23     1.04     1.44     1.74     2.03     1.25
63 Hz                              0.77     0.76     1.10     0.09     0.09    -0.21     0.24     0.17     0.56    -0.31    -0.05     0.34
80 Hz                              0.24     0.27     0.48    -0.07    -0.05    -0.08     0.24     0.06     0.35    -0.17     0.06     0.12
100 Hz                            -1.00    -1.06    -1.36    -1.28    -1.10    -1.68    -1.64    -1.28    -0.98    -1.71    -1.68    -1.21
125 Hz                            -2.57    -2.48    -2.98    -2.90    -2.83    -3.09    -2.71    -2.67    -2.45    -3.16    -3.01    -2.78
160 Hz                            -0.93    -0.91    -1.25    -1.58    -1.14     0.39     0.44    -0.10     0.18     0.39     0.39    -0.54
200 Hz                            -1.60    -1.58    -1.27    -1.09    -1.05    -0.50    -0.40    -0.91    -1.51    -0.57    -0.33    -1.07
250 Hz                            -2.19    -2.14    -0.58     0.29     0.61     0.82     0.57     0.17    -1.10     0.77     0.95    -0.05
315 Hz                            -1.23    -1.13     1.73     1.21     0.23     0.23    -0.07    -0.85    -4.61    -0.14     1.00    -0.36
400 Hz                            -1.43    -1.39     3.37     5.35     3.74     3.84     3.63     2.56     0.84     3.59     4.37     3.26
500 Hz                             2.96     1.57     3.99     6.38     5.72     4.81     5.01     3.77     3.74     4.88     4.69     4.66
630 Hz                            -1.19    -7.12    -2.02     0.76     1.33    -0.78    -1.02    -1.18     0.57    -0.12    -1.84    -0.44
800 Hz                            -2.10    -5.97     0.76     6.15     3.45     0.16     0.56    -0.32     1.07     0.45    -0.35     1.26
1000 Hz                           -5.59    -7.22     5.08     4.31     5.75     0.78     1.09     2.13     2.50     3.87    -2.15     2.54
1250 Hz                           -8.96    -3.63    -1.79     1.31    -0.12    -2.72    -4.42     0.23    -1.05    -0.81    -5.14    -0.99
1600 Hz                           -9.09    -1.22    -0.72    -2.63    -0.16    -3.22    -5.92    -0.89    -1.82    -2.90    -3.95    -1.99
2000 Hz                           -6.61     0.88     3.14     1.18     2.69     3.03    -3.55     2.61    -1.97     3.06     2.81     1.60
2500 Hz                           -2.79    -1.50     1.46     1.09     1.58     1.17    -3.01     1.82    -1.76     1.35     0.35     1.17
3150 Hz                            0.05    -2.09     1.89     2.13     1.42    -1.35    -3.76     2.12    -1.90    -1.04    -3.47     1.46
4000 Hz                            1.26    -2.09    -0.66    -0.25    -0.63    -0.12    -2.20    -0.31    -2.34    -0.18    -0.34    -0.44
5000 Hz                            3.05     1.22     1.82     2.05     1.77     0.77    -0.35     2.04    -3.35     0.98    -1.24     1.79
6300 Hz                            3.31     2.44     0.14    -0.23    -0.42    -1.22    -0.55    -0.27    -5.49    -1.46     0.29    -0.33
8000 Hz                            2.58     0.38     1.38     0.81     0.29    -3.81     0.81     0.72    -8.54    -4.55     0.71     0.52
10000 Hz                           1.19     0.04     3.39     2.40     2.52    -3.63     1.87     2.56    -9.36    -5.41     0.05     2.38
12500 Hz                          -3.10    -5.49     3.87     2.93     3.40     0.28     3.65     3.17    -9.31    -3.67     3.06     3.12
16000 Hz                          -5.63    -8.01     1.42     1.14     1.91    11.20     8.82     1.34    -9.70     7.88    12.26     1.98
  E5 check, max |ref - E5| and mean (dB): intro 0.05/-0.00  intro2 0.05/+0.01  build 0.05/+0.01  mainA 0.05/-0.01  mainA2 0.05/+0.00  break 0.05/+0.01  breakEnd 0.05/-0.01  mainB 0.05/+0.00  outro 0.05/-0.00

MID/SIDE PER BAND (render minus reference): S/M dB, then rho
20-120 Hz S/M dB                 -14.84   -11.23    -4.97    -6.52    -7.03    -5.55    -6.05    -7.26   -10.78    -5.84    -4.93    -7.12
20-120 Hz rho                      0.00     0.00     0.00     0.00     0.00     0.00     0.00     0.00     0.00     0.00     0.00     0.00
120-300 Hz S/M dB                -32.77   -25.72    10.46     8.22     7.23     6.53     5.30     5.88     2.10     6.43     6.75     6.58
120-300 Hz rho                     0.00     0.00    -0.11    -0.16    -0.14    -0.13    -0.10    -0.11    -0.02    -0.13    -0.14    -0.11
300-1000 Hz S/M dB               -16.86   -14.90     2.84     2.27     1.97     2.30     2.53     2.63     2.68     2.37     2.18     2.50
300-1000 Hz rho                    0.14     0.40    -0.31    -0.26    -0.22    -0.25    -0.27    -0.28    -0.29    -0.26    -0.24    -0.27
1000-4000 Hz S/M dB                1.50     3.60     1.53     1.22     0.69    -0.45     0.70     0.12     3.92    -0.73     0.08     0.19
1000-4000 Hz rho                  -0.17    -0.39    -0.14    -0.10    -0.06     0.04    -0.07    -0.01    -0.40     0.07    -0.01    -0.02
4000-10000 Hz S/M dB               3.38     5.05    -7.52   -10.46   -11.29    -4.60     2.07    -9.79    12.78    -8.77     2.50    -8.56
4000-10000 Hz rho                 -0.35    -0.51     0.14     0.16     0.22     0.28    -0.14     0.16    -0.63     0.39    -0.27     0.18
10000-16000 Hz S/M dB             -9.04    -5.61    -9.22   -10.93   -12.02     2.87     4.37    -7.58     0.76    -8.42     3.55    -4.69
10000-16000 Hz rho                 0.49     0.34     0.06     0.09     0.12    -0.28    -0.38     0.08    -0.00     0.33    -0.39     0.08

PER-BAR 4-16 kHz LEVEL, window mean of bars, dB (render minus reference)
4000-8000 Hz                      -6.35    -8.74    -0.15     1.33     1.43     0.01    -1.24     1.29    -7.49     0.44    -1.09    -0.81
8000-12000 Hz                      2.89    -2.23     2.70     2.87     3.25    -3.21     0.88     2.99    -9.65    -4.41    -1.37     0.83
12000-16000 Hz                    -1.38    -5.66     2.68     3.09     4.62     1.63     3.46     3.32    -9.39     0.01     3.05     1.39

KICK GLIDE AND SUB DUCK (coherent fit; render minus reference)
glide f0 Hz                       38.59    45.62    49.71    65.05    74.39    93.88    90.98    82.29    66.08      n/a      n/a      n/a
glide fT Hz                        2.15     3.08     2.51     3.74     4.18     3.30     2.42     4.52     3.77      n/a      n/a      n/a
glide tau ms                      -2.90    -3.80    -3.69    -5.34    -6.04    -6.55    -6.12    -6.61    -5.46      n/a      n/a      n/a
sub duck 0 ms                     -0.19    -0.14     1.15     0.36    -1.99     5.70    -2.79     0.89    -0.59      n/a      n/a      n/a
sub duck 20 ms                    -1.59    -3.41    -2.31     0.19     1.72     6.98    -4.26    -0.82     1.01      n/a      n/a      n/a
sub duck 60 ms                     0.76     1.50     1.05     3.61     2.76     8.20    -3.12     3.24     3.26      n/a      n/a      n/a
sub duck 100 ms                   -0.59    -0.46    -2.60    -0.99    -2.33     4.13    -5.62    -0.50    -1.89      n/a      n/a      n/a
sub duck 200 ms                    2.01     0.24     0.64    -0.90    -2.63    -1.21    -1.14     0.78    -2.63      n/a      n/a      n/a

largest |render - reference| deltas in the table:
     -32.77  intro: S/M 120-300 Hz
     -25.72  intro2: S/M 120-300 Hz
     -16.86  intro: S/M 300-1000 Hz
     -14.90  intro2: S/M 300-1000 Hz
     -14.84  intro: S/M 20-120 Hz
     +12.78  outro: S/M 4000-10000 Hz
     +12.26  break120-128: 16000 Hz band
     -12.02  mainA2: S/M 10000-16000 Hz
     -11.29  mainA2: S/M 4000-10000 Hz
     -11.23  intro2: S/M 20-120 Hz
     +11.20  break: 16000 Hz band
     -11.14  break104-120: 31.5 Hz band
```

### 10.2 Verdict on score 4

- **Loudness: every section within 1 LU.** Deltas: intro +0.24, intro2 +0.23, build -0.23, mainA +0.34, mainA2 +0.47, break +0.33,
  breakEnd -0.24, mainB +0.34, outro -0.43.
- **Bands: no section within 2 dB in every band.** Bands within 2 dB (of 29): intro 13, intro2 16, build 17, mainA 16, mainA2 18,
  break 17, breakEnd 15, mainB 17, outro 15. mainA2 is the closest.
- Worst band per section: intro 1.6 kHz -9.1, intro2 16 kHz -8.0, build 25 Hz -6.2, mainA 500 Hz +6.4, mainA2 25 Hz -6.2,
  break 16 kHz +11.2, breakEnd 16 kHz +8.8, mainB 25 Hz -6.0, outro 16 kHz -9.7.

### 10.3 Twelve largest deltas (the tool's ranking, as printed)

```
largest |render - reference| deltas in the table:
     -32.77  intro: S/M 120-300 Hz
     -25.72  intro2: S/M 120-300 Hz
     -16.86  intro: S/M 300-1000 Hz
     -14.90  intro2: S/M 300-1000 Hz
     -14.84  intro: S/M 20-120 Hz
     +12.78  outro: S/M 4000-10000 Hz
     +12.26  break120-128: 16000 Hz band
     -12.02  mainA2: S/M 10000-16000 Hz
     -11.29  mainA2: S/M 4000-10000 Hz
     -11.23  intro2: S/M 20-120 Hz
     +11.20  break: 16000 Hz band
     -11.14  break104-120: 31.5 Hz band
```

The ranking is still dominated by mid/side in dB (side-to-mid), mostly on the intro and intro2 low mid (the render is wide there
where the record is mono).

### 10.4 Three largest level deltas, each with parameter and owner

1. **break, 16 kHz: +11.2 dB over bars 104 to 127 (+12.3 over bars 120 to 127; +8.6 over bars 104 to 119).** Unchanged from score 3
   (+11.35). The break's open hat, as before: `hat_open` in the break (solo 16 kHz -61.8 dBFS against the reference's -66.1). Iteration 4
   did not touch it. **Owner A7** (`hat_open` in the break section: level or lowpass).
2. **outro, 16 kHz: -9.7 dB (8 kHz -8.5, 12.5 kHz -9.3).** Unchanged from score 3 (-9.9). The top band of the outro is short of the
   reference (solo, bars 184 to 199 at 8 kHz: clap -62.8, bass -64.6, burst -69.4 dBFS; mix -59.5, reference -50.6). The spec has no
   top-band element for the outro (E3 and E4: no hat, tick or shaker there). **Owner A7** (outro clap level and brightness); the source
   of the record's outro top band is open (ask E3 and E4).
3. **intro, 1.25 to 1.6 kHz: -9.0 and -9.1 dB (1 kHz -5.6, 2 kHz -6.6).** New as the worst band of the intro, now that the kick's 500 Hz
   is fixed (score 3: 500 Hz +10.3, now +3.0). Solo: the burst hit at bar 3 and bar 7 (step 12, 0.3 s, band RMS) is -41.0 and -41.6 dBFS
   at 1 to 2.5 kHz, against the reference's -31.1 and -32.2 (E3: -31). At 2.5 to 4 kHz the burst is -45.9 and -45.4 against -48.1 and
   -47.0 (passes). The record falls about 17 dB from 1 to 2.5 kHz to 2.5 to 4 kHz; the burst falls about 4 dB. So the burst's spectrum is
   too flat: its `tone` (1600 Hz, q 1.2) and its 5000 Hz lowpass set the 2.5 to 4 kHz level, and the 1 to 2.5 kHz needs about +10 dB.
   **Owner A7** (burst: `tone` lower and the 1 to 2.5 kHz level). Unchanged since iteration 3, when this item was not yet visible.

Not attributed: mainA 500 Hz +6.4 (score 3: +6.6; the kick is fixed in intro, so the mainA 500 Hz is the stab or the kick at the
mainA level; not measured here).

### 10.5 Tail RT60 per band (the 6.5 s tail after bar 200)

Method: from the end of content (bar 200 plus 0.05 s) to the end of each file, 20 ms power envelope of the third-octave band of the mid
signal, a straight-line fit of dB against time over the part of the tail more than 10 dB above the file's own floor, RT60 = -60 / slope.
Schroeder backward integration was tried first and rejected: over a tail of about 6 s it reports 30 s at 8 kHz, which is a floor
artefact. Checked against O1's reference tail figure (-9.4 dB/s, whole band): the reference's 125 to 500 Hz fits give about 6 s, which is
consistent.

| band (Hz) | reference RT60 (s) | render RT60 (s) | note |
|---|---|---|---|
| 125 | 6.1 | 45.9 | render fit not meaningful: the tail is nearly flat at -61 dB (floor -125 dB); the sub's release, not reverb |
| 500 | 5.5 | 2.9 | render decays about half as fast as the reference |
| 2000 | 4.2 | 1.7 | render too short by about 2.5 times |
| 8000 | 1.2 | 2.3 | render too long by about 2 times |
| 16000 | n/a | n/a | both at the file floor |

Owners: **A8** (processors.js: the end-tail send and reverb decay; the render's mids die in under 3 s, the record's in about 5 to 6 s;
8 kHz is the other way round, so the damping is not the same across bands). **A7** (the sub's release, which sets the 125 Hz tail).
Limits: a 6.4 s tail, few fit points at the top bands, and the reference's own MP3 noise sets the floor.

### 10.6 Score 1 to score 4, per section

Score 1 = the first V3 score (section 7). Score 2 = section 8. Score 3 = section 9. Score 4 = this section. LUFS delta; bands within
2 dB (of 29); worst band.

| section | score 1 | score 2 | score 3 | score 4 |
|---|---|---|---|---|
| intro | -1.32 / 6 / 500 Hz +10.3 | -1.32 / 7 / 500 Hz +10.3 | -0.03 / 8 / 500 Hz +10.3 | +0.24 / 13 / 1.6 kHz -9.1 |
| intro2 | -1.33 / 8 / 3.15 kHz -16.9 | -1.33 / 9 / 3.15 kHz -15.6 | -0.03 / 14 / 500 Hz +8.8 | +0.23 / 16 / 16 kHz -8.0 |
| build | +0.28 / 5 / 6.3 kHz -17.0 | +0.56 / 9 / 1 kHz +10.3 | -0.58 / 13 / 1 kHz +5.9 | -0.23 / 17 / 25 Hz -6.2 |
| mainA | -0.18 / 5 / 6.3 kHz -17.0 | +0.39 / 11 / 500 Hz +6.6 | +0.12 / 12 / 500 Hz +6.6 | +0.34 / 16 / 500 Hz +6.4 |
| mainA2 | +0.14 / 9 / 6.3 kHz -16.5 | +0.58 / 13 / 500 Hz +5.8 | +0.27 / 14 / 1 kHz +6.0 | +0.47 / 18 / 25 Hz -6.2 |
| break | +3.22 / 7 / 16 kHz +33.9 | +1.27 / 11 / 40 Hz +14.0 | +0.12 / 15 / 16 kHz +11.3 | +0.33 / 17 / 16 kHz +11.2 |
| breakEnd | +5.79 / 5 / 16 kHz +29.6 | +0.76 / 12 / 50 Hz +12.4 | -0.44 / 14 / 16 kHz +8.8 | -0.24 / 15 / 16 kHz +8.8 |
| mainB | +0.58 / 10 / 16 kHz +12.2 | +0.81 / 17 / 50 Hz +6.5 | +0.18 / 16 / 25 Hz -5.4 | +0.34 / 17 / 25 Hz -6.0 |
| outro | -0.18 / 7 / 8 kHz -10.2 | -0.18 / 7 / 8 kHz -10.4 | -0.69 / 12 / 16 kHz -9.9 | -0.43 / 15 / 16 kHz -9.7 |

Closing comparison, in words. Loudness went from failing (break +3.2 LU and breakEnd +5.8, intro and intro2 about -1.3) to passing
in every section; the break and breakEnd fix is the bed and the hat's level and the whole song is now +0.24 LU. Bands went from 5 to 10 of
29 in most sections (score 1) to 12 to 18 of 29 (score 4). Every section's worst band has changed: the 6 to 17 kHz deficit of mainA,
mainA2 and build (score 1) is gone; the break and breakEnd 16 kHz excess (+30 to +34 dB, score 1) is down to +9 to +11 dB; intro's
kick-driven 500 Hz (+10.3, score 1 to 3) is now 3 dB; intro2's 2.5 to 4 kHz burst deficit (-17, score 1) is fixed (-2 dB). What is left
is in the top band (outro's 16 kHz -9.7, break's 16 kHz +11, intro2's 16 kHz -8), the burst's 1 to 2.5 kHz (intro -9), and the 25 Hz to
50 Hz low end (build, mainA2, mainB: -6 dB at 25 Hz, and the break's +7 at 50 Hz is now in the mid-30s of within-2 bands). Three things moved
from fixed to open in this run: intro's worst band (the burst's 1 to 2.5 kHz), and mainA's 500 Hz (+6.4, unattributed).

### 10.7 Onsets (`--onsets`, 0-based, 4 ms threshold)

Open hats, mainA (6 to 16 kHz, absolute; steps 2, 6, 10, 14): deltas +1.2, +1.2, +0.9, +0.9 ms: PASS on all four (unchanged).

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

Bass, mainB (the usable bass check; 350 to 1000 Hz, slope rule): steps 1, 6, 11 and 14 all PASS this time (rel deltas -2.2, +2.5,
+2.3, +2.7 ms). Score 3 had steps 11 and 14 failing (+6.4 and +8.4 ms); iteration 4 brought them within 4 ms.

```
window bars 136..151, band 350-1000 Hz, method slope, search -10..+30 ms, hits within 8 dB of the loudest
control (0-based even steps 0,2,4,8,10,12,14): render -4.37 ms, reference -1.75 ms
step0 |    n      abs      sd      rel |    n      abs      sd      rel | delta rel delta abs  PASS/FAIL 4 ms (rel)
      | render                          | reference (mix)                 |
    0 |    0     +nan     nan     +nan |   13    -1.44    2.58    +0.32 |      +nan      +nan  
    1 |   16    +7.48    2.71   +11.85 |   16   +12.33    7.76   +14.08 |     -2.23     -4.85  PASS
    2 |   16    -4.21    5.79    +0.16 |    2    +1.20    0.88    +2.95 |     -2.79     -5.41  
    3 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    4 |    0     +nan     nan     +nan |    8    -4.52    2.47    -2.77 |      +nan      +nan  
    5 |    0     +nan     nan     +nan |    0     +nan     nan     +nan |      +nan      +nan  
    6 |    8    +8.34    5.75   +12.71 |    8    +8.47    7.25   +10.23 |     +2.49     -0.13  PASS
    7 |    4    -8.38    0.00    -4.01 |    7   +15.12   10.65   +16.87 |    -20.88    -23.50  
    8 |    8    -2.30    2.62    +2.07 |   16    -1.75    3.02    +0.00 |     +2.07     -0.55  
    9 |    4    -8.10    0.08    -3.73 |    1    -5.93    0.00    -4.17 |     +0.45     -2.17  
   10 |    0     +nan     nan     +nan |    2    +0.50    6.84    +2.26 |      +nan      +nan  
   11 |   16    +8.45    2.72   +12.81 |   16    +8.76    6.10   +10.51 |     +2.30     -0.31  PASS
   12 |   12    -9.58    5.73    -5.21 |   11    -2.32    4.28    -0.57 |     -4.65     -7.26  
   13 |    0     +nan     nan     +nan |    2    +3.54    7.90    +5.29 |      +nan      +nan  
   14 |   16    -4.52    5.73    -0.16 |   11    -4.59   11.88    -2.83 |     +2.68     +0.06  PASS
   15 |    7    -9.72    0.13    -5.35 |    0     +nan     nan     +nan |      +nan      +nan  
steps are 0-based (E1-E3 numbering). Reference n is the hit count in the mix (small n = unreliable). E numbers (absolute, their conventions): 1: E3 +11.0 / E2 +16.3 / E1 +9.6; 6: E3 +11.9 / E1 +9.7 (E2 n=6 unreliable); 8: E3 -4.6; 11: E3 +13.1 / E2 +9.9 / E1 +9.6; 14: E3 -5.0 / E2 -4.2 / E1 -4.3
```

### 10.8 Open, by owner, after score 4

- A7: break 16 kHz (hat_open, +11); outro top band (-9.7, open source); burst 1 to 2.5 kHz (intro -9; `tone` and level); bass 25 Hz and 50 Hz
  low end (build, mainA2, mainB at -6 dB at 25 Hz, the break's 50 Hz); sub release (the 125 Hz tail).
- A8: end-tail send and reverb decay (mids decay about twice as fast as the record; 8 kHz about twice as slow).
- Mine: the mainA 500 Hz +6.4 (unattributed); the outro top band's source (ask E3 and E4).
