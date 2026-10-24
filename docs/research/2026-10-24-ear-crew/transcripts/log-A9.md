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
