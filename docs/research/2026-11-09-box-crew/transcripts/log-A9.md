# Log A9 (scoring loop), Box Crew batch 2

## 2026-11-09: tools/drums-score.js against A12's fitting (commit 9cbb0dc)

Tool: `tools/drums-score.js`. Renders each Drums voice on app/index.html (OfflineAudioContext, 44.1 kHz, one hit, seeded Math.random), measures, and prints reference / rendered / delta / verdict. Options: `--only <voices>`, `--json <file>`, `--levels` (normal and accent peak and RMS per voice), `--selftest` (5 DSP checks on synthetic signals).

Measures and their limits:
- `period`: autocorrelation, first 100 ms after the attack, lag range 30 Hz to 1 kHz (a 4 kHz cap picked the click transient on toms). Tom sweep is inside the window, so the period is biased high by the sweep.
- `t20`: time from the envelope peak to 1/10 of it. The envelope is the analytic (Hilbert) envelope with a 2 ms mean; a centred max-hold rippled with the carrier and was rejected by the self-test.
- `tc`: time constant (t20 minus hold) / ln 10, reference level = mean envelope over 4 to 9 ms (the click is skipped).
- `pitch_start`: the sweep is exponential, so the start is extrapolated from the first full cycle with tau 7.3 ms (B3 R21 x C9); `pitch_settle` is autocorrelation over 40 to 100 ms.
- `count` / `spacing`: clap bursts on a 1 ms hop, 2 ms RMS, 3 dB prominence. Limit: the count changes with the noise realisation (cp909 gave 1 burst under the seeded run and 3 bursts unseeded), so treat cp909 as unresolved.
- `peaks` / `ratio2`: Hann window, zero-padded, parabolic interpolation, 5 % match.
- `fold`: 909 sample clock from the spectral null in 10 to 20 kHz (fs = 2 x null, 250 Hz bands). Approximate: the null is the base band / image crossover. A brick-wall reading is printed beside it.
- `accent`: peak ratio of ev.accent to the normal hit, B2 section 7 band 2.0 to 3.7 (maracas 1.5 to 1.85).
- `steps`: 909 ladder ev.step 0, 1, 2, each step 9 dB +-1 (B3 section 9 d). A drive-0 variant separates drive compression from the ladder.

Tolerances: period 5 %, decay / time constant 15 %, pitch 15 %, partials and ratios 5 %, fold 5 %, burst spacing 3 ms.

Run: `node tools/drums-score.js` exit 1 (PASS 61, FAIL 44, INFO 12, ERR 0; 117 rows). Self-test `node tools/drums-score.js --selftest` exit 0. `node --check tools/drums-score.js` exit 0. `node tools/drums-score.js --levels` exit 0.

### Table (run 3, current app/engine/drums.js)

voice   check                                                     reference             rendered                                    delta             verdict
bd808   period at default (table mid 56 Hz)                       18                    17.77 ms                                    -1.3 %            PASS
bd808   t20 at decay min (table 50 ms)                            50                    100.9 ms                                    101.7 %           FAIL
bd808   t20 at default (table mid 300 ms)                         300                   292.5 ms                                    -2.5 %            PASS
bd808   t20 at decay max (table 800 ms)                           800                   779.9 ms                                    -2.5 %            PASS
bd808   accent / normal peak (table 10/3.5)                       2.857142857142857     2.20 (6.8 dB), peak 0.0 dBFS                -23.1 %           PASS
sd808   partials at default (238, 476 Hz)                         238 / 476             238.0, 476.0, 1467.0, 1517.8, 1747.7, 2325. all matched       PASS
sd808   t20 at default (table mid 60 ms)                          60                    74.8 ms                                     24.7 %            FAIL
sd808   accent / normal peak (table 10/3)                         3.3333333333333335    2.92 (9.3 dB), peak 0.1 dBFS                -12.4 %           PASS
cp808   burst count in first 40 ms (table: three pulses)          3                     3 at 10, 27, 30 ms                          exact             PASS
cp808   t20 at default (table mid 100 ms)                         100                   72.5 ms                                     -27.5 %           FAIL
cp808   accent (table prints 6 / 2, not used)                     -                     1.46 (3.3 dB), peak -10.9 dBFS                                INFO
ch808   metal oscillator set at default (INFO: HP 10.5 kHz remove 205.3 / 369.6 / 304.4 7196.9, 8801.7, 9600.8, 10349.5, 10396.5, 1 missing 205.3, 36 FAIL
ch808   band-pass stage a peak at default (7.21 kHz, B2 s3 deriva 7210                  5598.5, 7017.5, 7196.9, 7312.3, 7560.7, 799 all matched       PASS
ch808   t20 at default (table 50 ms)                              50                    33.7 ms                                     -32.7 %           FAIL
ch808   accent / normal peak (table 6/3)                          2                     2.00 (6.0 dB), peak -15.6 dBFS              -0.0 %            FAIL
oh808   metal oscillator set at default (INFO: HP 10.5 kHz remove 205.3 / 369.6 / 304.4 5599.9, 6399.0, 6791.6, 7018.6, 7198.0, 731 missing 205.3, 36 FAIL
oh808   band-pass stage a peak at default (7.21 kHz, B2 s3 deriva 7210                  5599.9, 6399.0, 6791.6, 7018.6, 7198.0, 731 all matched       PASS
oh808   t20 at decay min (table 90 ms)                            90                    64.5 ms                                     -28.3 %           FAIL
oh808   t20 at default (table mid 450 ms)                         450                   303.3 ms                                    -32.6 %           FAIL
oh808   t20 at decay max (table 600 ms)                           600                   404.1 ms                                    -32.7 %           FAIL
oh808   accent / normal peak (table 7/3.5)                        2                     2.00 (6.0 dB), peak -8.7 dBFS               0.0 %             PASS
cy808   t20 at decay min (table 350 ms)                           350                   302.7 ms                                    -13.5 %           PASS
cy808   t20 at default (table mid 800 ms)                         800                   588.0 ms                                    -26.5 %           FAIL
cy808   t20 at decay max (table 1200 ms)                          1200                  883.0 ms                                    -26.4 %           FAIL
cy808   peaks at default (table gives none)                       -                     369.5, 799.8, 1107.4, 1567.2, 1620.1, 2399.                   INFO
cy808   accent / normal peak (table 7/3.5)                        2                     2.00 (6.0 dB), peak -4.7 dBFS               0.0 %             PASS
cb808   partials at default (540, 800 Hz)                         540 / 800             540.0, 800.0, 1619.1, 2160.2, 2400.0, 2700. all matched       PASS
cb808   t20 at default (table 50 ms)                              50                    26.5 ms                                     -46.9 %           FAIL
cb808   accent / normal peak (table 12/3.5)                       3.4285714285714284    3.43 (10.7 dB), peak -11.7 dBFS             0.0 %             PASS
lt808   period at tune low (table 12.5 ms)                        12.5                  11.50 ms                                    -8.0 %            FAIL
lt808   period at default (table mid 11.1 ms)                     11.1                  10.50 ms                                    -5.4 %            FAIL
lt808   period at tune high (table 10 ms)                         10                    9.28 ms                                     -7.2 %            FAIL
lt808   t20 at default (table 200 ms)                             200                   185.7 ms                                    -7.2 %            PASS
lt808   accent / normal peak (table 3.43)                         3.4285714285714284    2.90 (9.2 dB), peak 0.1 dBFS                -15.5 %           PASS
mt808   period at tune low (table 8.3 ms)                         8.3                   7.58 ms                                     -8.7 %            FAIL
mt808   period at default (table mid 7.4 ms)                      7.4                   6.73 ms                                     -9.0 %            FAIL
mt808   period at tune high (table 6.3 ms)                        6.3                   5.90 ms                                     -6.3 %            FAIL
mt808   t20 at default (table 130 ms)                             130                   118.7 ms                                    -8.7 %            PASS
mt808   accent / normal peak (table 3.67)                         3.6666666666666665    3.07 (9.7 dB), peak 0.2 dBFS                -16.4 %           PASS
ht808   period at tune low (table 6.1 ms)                         6.1                   5.69 ms                                     -6.7 %            FAIL
ht808   period at default (table mid 5.4 ms)                      5.4                   4.89 ms                                     -9.5 %            FAIL
ht808   period at tune high (table 4.5 ms)                        4.5                   4.27 ms                                     -5.1 %            FAIL
ht808   t20 at default (table 100 ms)                             100                   88.7 ms                                     -11.3 %           PASS
ht808   accent / normal peak (table 3.43)                         3.4285714285714284    2.87 (9.2 dB), peak 0.2 dBFS                -16.3 %           PASS
lc808   period at tune low (table 6.1 ms)                         6.1                   5.74 ms                                     -6.0 %            FAIL
lc808   period at default (table mid 5.4 ms)                      5.4                   5.04 ms                                     -6.6 %            FAIL
lc808   period at tune high (table 4.5 ms)                        4.5                   4.41 ms                                     -1.9 %            PASS
lc808   t20 at default (table 180 ms)                             180                   162.2 ms                                    -9.9 %            PASS
lc808   accent / normal peak (table 3.43)                         3.4285714285714284    2.94 (9.4 dB), peak 0.2 dBFS                -14.3 %           PASS
mc808   period at tune low (table 4 ms)                           4                     3.79 ms                                     -5.4 %            FAIL
mc808   period at default (table mid 3.6 ms)                      3.6                   3.37 ms                                     -6.5 %            FAIL
mc808   period at tune high (table 3.2 ms)                        3.2                   3.03 ms                                     -5.3 %            FAIL
mc808   t20 at default (table 100 ms)                             100                   96.6 ms                                     -3.4 %            PASS
mc808   accent / normal peak (table 3.33)                         3.3333333333333335    2.88 (9.2 dB), peak 0.1 dBFS                -13.7 %           PASS
hc808   period at tune low (table 2.7 ms)                         2.7                   2.57 ms                                     -5.0 %            PASS
hc808   period at default (table mid 2.5 ms)                      2.5                   2.25 ms                                     -9.9 %            FAIL
hc808   period at tune high (table 2.2 ms)                        2.2                   2.04 ms                                     -7.2 %            FAIL
hc808   t20 at default (table 80 ms)                              80                    76.9 ms                                     -3.9 %            PASS
hc808   accent / normal peak (table 3.43)                         3.4285714285714284    2.40 (7.6 dB), peak 0.1 dBFS                -30.0 %           PASS
rs808   partials at default (1667, 455 Hz)                        1667 / 455            452.3, 1666.8, 5000.3                       all matched       PASS
rs808   t20 at default (table 10 ms)                              10                    12.4 ms                                     24.5 %            FAIL
rs808   accent / normal peak (table 10/3)                         3.3333333333333335    2.34 (7.4 dB), peak 0.0 dBFS                -29.7 %           PASS
cl808   partial at default (2500 Hz)                              2500                  2526.0                                      all matched       PASS
cl808   t20 at default (table 25 ms)                              25                    25.4 ms                                     1.5 %             PASS
cl808   accent / normal peak (table 8/2.5)                        3.2                   2.96 (9.4 dB), peak 0.1 dBFS                -7.6 %            PASS
ma808   t20 at default (table 25 ms short or 35 ms long, either)  25 / 35               22.7 ms                                                       PASS
ma808   accent / normal peak (table 5/3)                          1.6666666666666667    1.85 (5.4 dB), peak -3.8 dBFS               11.3 %            FAIL
bd909   pitch start at default (274 Hz)                           274                   274.3 Hz                                    0.1 %             PASS
bd909   pitch settle at default (53 Hz)                           53                    52.9 Hz                                     -0.1 %            PASS
bd909   decay time constant at min (derived 15.5 ms)              15.5                  11.3 ms (hold 60)                           -27.4 %           FAIL
bd909   decay time constant at max (derived 346 ms)               346                   376.7 ms (hold 60)                          8.9 %             PASS
bd909   decay time constant at default (B3 0.035 s)               35                    36.3 ms (hold 60)                           3.7 %             PASS
bd909   step ladder ev.step 0/1/2 (9 dB each)                     9                     step1-0 7.9 dB, step2-1 4.1 dB                                FAIL
bd909   step ladder at drive 0 (is drive the compressor?)         9                     step1-0 7.7 dB, step2-1 8.8 dB                                FAIL
bd909   ev.accent / normal (info)                                 -                     1.19 (1.5 dB), peak 0.0 dBFS                                  INFO
sd909   partial ratio VCO2/VCO1 at default (1.47)                 1.47                  195.7 / 285.7 = 1.460                       -0.7 %            PASS
sd909   step ladder ev.step 0/1/2 (9 dB each)                     9                     step1-0 8.7 dB, step2-1 3.8 dB                                FAIL
sd909   step ladder at drive 0 (is drive the compressor?)         9                     step1-0 8.7 dB, step2-1 9.1 dB                                PASS
sd909   tone time constant range (derived 103 to 338 ms; spec 40  0.103..0.338 s        0.04..0.2 s (spec)                                            FAIL
lt909   decay time constant at min (derived 38 ms)                38                    38.1 ms (hold 30)                           0.3 %             PASS
lt909   decay time constant at max (derived 378 ms)               378                   395.6 ms (hold 30)                          4.7 %             PASS
lt909   decay-to-1/10 at max (2.3 x 378 ms + hold; INFO, the manu 900.3771651517493     934.6 ms                                                      INFO
lt909   decay-to-1/10 at default (0.15 s constant, INFO)          375.38776394910684    385.3 ms                                                      INFO
lt909   step ladder ev.step 0/1/2 (9 dB each)                     9                     step1-0 8.6 dB, step2-1 5.6 dB                                FAIL
lt909   step ladder at drive 0 (is drive the compressor?)         9                     step1-0 9.1 dB, step2-1 8.8 dB                                PASS
lt909   ev.accent / normal (info)                                 -                     1.46 (3.3 dB), peak -0.2 dBFS                                 INFO
mt909   decay time constant at min (derived 38 ms)                38                    38.1 ms (hold 30)                           0.2 %             PASS
mt909   decay time constant at max (derived 378 ms)               378                   395.3 ms (hold 30)                          4.6 %             PASS
mt909   decay-to-1/10 at max (2.3 x 378 ms + hold; INFO, the manu 900.3771651517493     934.0 ms                                                      INFO
mt909   decay-to-1/10 at default (0.15 s constant, INFO)          375.38776394910684    385.4 ms                                                      INFO
mt909   step ladder ev.step 0/1/2 (9 dB each)                     9                     step1-0 8.4 dB, step2-1 5.7 dB                                FAIL
mt909   step ladder at drive 0 (is drive the compressor?)         9                     step1-0 9.0 dB, step2-1 9.1 dB                                PASS
mt909   ev.accent / normal (info)                                 -                     1.47 (3.3 dB), peak -0.2 dBFS                                 INFO
ht909   decay time constant at min (derived 38 ms)                38                    38.1 ms (hold 30)                           0.3 %             PASS
ht909   decay time constant at max (derived 378 ms)               378                   395.2 ms (hold 30)                          4.5 %             PASS
ht909   decay-to-1/10 at max (2.3 x 378 ms + hold; INFO, the manu 900.3771651517493     938.8 ms                                                      INFO
ht909   decay-to-1/10 at default (0.15 s constant, INFO)          375.38776394910684    387.4 ms                                                      INFO
ht909   step ladder ev.step 0/1/2 (9 dB each)                     9                     step1-0 8.4 dB, step2-1 5.6 dB                                FAIL
ht909   step ladder at drive 0 (is drive the compressor?)         9                     step1-0 9.1 dB, step2-1 9.0 dB                                PASS
ht909   ev.accent / normal (info)                                 -                     1.45 (3.2 dB), peak -0.2 dBFS                                 INFO
rs909   partials at default (495, 219, 1053 Hz)                   495 / 219 / 1053      192.7, 493.0, 818.9, 1067.2                 missing 219       FAIL
rs909   step ladder ev.step 0/1/2 (9 dB each)                     9                     step1-0 8.9 dB, step2-1 8.5 dB                                PASS
cp909   burst count in first 40 ms (prior 4, 3 to 5)              4                     1 at 10 ms                                  exact             FAIL
cp909   burst spacing (prior 10 ms)                               10                    n/a ms (1 bursts)                           n/a               FAIL
cp909   step ladder ev.step 0/1/2 (9 dB each)                     9                     step1-0 10.2 dB, step2-1 11.8 dB                              FAIL
ch909   decay time constant at min (8 ms)                         8                     5.8 ms (hold 6)                             -27.4 %           FAIL
ch909   decay time constant at max (60 ms)                        60                    54.3 ms (hold 6)                            -9.5 %            PASS
ch909   sample clock from fold-over (30 kHz)                      30000                 fs 30000 Hz (null at 15000 Hz, brick-wall 2 0.0 %             PASS
ch909   step ladder ev.step 0/1/2 (9 dB each)                     9                     step1-0 9.0 dB, step2-1 9.0 dB                                PASS
oh909   decay time constant at min (30 ms)                        30                    27.8 ms (hold 12)                           -7.3 %            PASS
oh909   decay time constant at max (160 ms)                       160                   150.8 ms (hold 12)                          -5.7 %            PASS
oh909   sample clock from fold-over (30 kHz)                      30000                 fs 31500 Hz (null at 15750 Hz, brick-wall 2 5.0 %             PASS
oh909   step ladder ev.step 0/1/2 (9 dB each)                     9                     step1-0 9.0 dB, step2-1 9.0 dB                                PASS
cr909   sample clock from fold-over (30 kHz)                      30000                 fs 31500 Hz (null at 15750 Hz, brick-wall 2 5.0 %             PASS
cr909   step ladder ev.step 0/1/2 (9 dB each)                     9                     step1-0 9.0 dB, step2-1 9.0 dB                                PASS
rd909   sample clock from fold-over (30 kHz)                      30000                 fs 31000 Hz (null at 15500 Hz, brick-wall 2 3.3 %             PASS
rd909   step ladder ev.step 0/1/2 (9 dB each)                     9                     step1-0 9.0 dB, step2-1 9.0 dB                                PASS

PASS 61  FAIL 44  INFO 12  ERR 0  (117 rows)

### Levels (vel 1 normal and accent, RMS over 0 to 300 ms; for the Host kit gains)

```
voice    normal peak   normal RMS 0-300ms   accent peak   accent RMS   accent/normal (peak)
bd808    -6.8 dBFS (0.455)     -17.7 dBFS           0.0 dBFS (1.001)      -9.2 dBFS    6.8 dB
sd808    -9.2 dBFS (0.346)     -29.9 dBFS           0.1 dBFS (1.010)      -19.7 dBFS   9.3 dB
cp808    -14.2 dBFS (0.195)    -36.0 dBFS           -10.9 dBFS (0.285)    -31.3 dBFS   3.3 dB
ch808    -21.6 dBFS (0.083)    -48.5 dBFS           -15.6 dBFS (0.166)    -42.5 dBFS   6.0 dB
oh808    -14.7 dBFS (0.184)    -33.1 dBFS           -8.7 dBFS (0.367)     -27.0 dBFS   6.0 dB
cy808    -10.7 dBFS (0.291)    -28.2 dBFS           -4.7 dBFS (0.581)     -22.1 dBFS   6.0 dB
cb808    -22.4 dBFS (0.076)    -46.4 dBFS           -11.7 dBFS (0.261)    -35.7 dBFS   10.7 dB
lt808    -9.1 dBFS (0.350)     -25.1 dBFS           0.3 dBFS (1.033)      -14.3 dBFS   9.4 dB
mt808    -9.3 dBFS (0.345)     -27.3 dBFS           0.1 dBFS (1.009)      -16.1 dBFS   9.3 dB
ht808    -8.8 dBFS (0.362)     -27.8 dBFS           0.1 dBFS (1.014)      -17.2 dBFS   9.0 dB
lc808    -9.1 dBFS (0.351)     -25.5 dBFS           0.1 dBFS (1.012)      -14.9 dBFS   9.2 dB
mc808    -8.7 dBFS (0.369)     -27.3 dBFS           0.1 dBFS (1.013)      -17.0 dBFS   8.8 dB
hc808    -8.3 dBFS (0.385)     -28.6 dBFS           0.1 dBFS (1.008)      -17.9 dBFS   8.4 dB
rs808    -7.4 dBFS (0.427)     -30.9 dBFS           0.0 dBFS (1.001)      -21.7 dBFS   7.4 dB
cl808    -9.4 dBFS (0.341)     -28.9 dBFS           0.1 dBFS (1.007)      -18.8 dBFS   9.4 dB
ma808    -9.4 dBFS (0.337)     -32.3 dBFS           -3.7 dBFS (0.653)     -27.6 dBFS   5.7 dB
bd909    -1.4 dBFS (0.852)     -10.5 dBFS           0.0 dBFS (1.001)      -7.1 dBFS    1.4 dB
sd909    -2.3 dBFS (0.771)     -17.1 dBFS           0.4 dBFS (1.046)      -12.0 dBFS   2.6 dB
lt909    -3.4 dBFS (0.673)     -10.8 dBFS           -0.2 dBFS (0.980)     -6.1 dBFS    3.3 dB
mt909    -3.5 dBFS (0.671)     -10.8 dBFS           -0.2 dBFS (0.974)     -6.1 dBFS    3.2 dB
ht909    -3.4 dBFS (0.674)     -10.8 dBFS           -0.2 dBFS (0.976)     -6.1 dBFS    3.2 dB
rs909    -12.6 dBFS (0.234)    -40.8 dBFS           -7.1 dBFS (0.444)     -35.0 dBFS   5.6 dB
cp909    -10.8 dBFS (0.289)    -32.8 dBFS           -5.9 dBFS (0.508)     -26.7 dBFS   4.9 dB
ch909    -9.7 dBFS (0.329)     -32.8 dBFS           -3.6 dBFS (0.657)     -26.8 dBFS   6.0 dB
oh909    -10.1 dBFS (0.311)    -28.1 dBFS           -4.1 dBFS (0.622)     -22.1 dBFS   6.0 dB
cr909    -8.2 dBFS (0.391)     -21.0 dBFS           -2.1 dBFS (0.782)     -15.0 dBFS   6.0 dB
rd909    -8.4 dBFS (0.381)     -23.0 dBFS           -2.4 dBFS (0.761)     -17.0 dBFS   6.0 dB
```

