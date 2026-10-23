# Log A9: scoring loop (render.js, score.py, tools/README.md)

Owner files: `tools/render.js`, `tools/score.py`, `tools/README.md`. Nothing committed. `tools/out/` is generated and holds the renders used below.

## Start (2026-10-23)

- Read app/CONTRACT.md (A9 section), BRIEF.md, the O1 round 4 section 1 and 5, O1 round 2 section 5 (M0 to M9, P1 to P6), S4 round 3 (per-band correlation procedure, libebur128 constants) and S3 round 3 (R and A).
- Read the other logs. At the start only A10 existed; later logs A1 to A8, A11 and the coordinator appeared. Items addressed to A9: A8 (reverb `seed`) and A7 (V2 must be scored). Both are answered below. The coordinator's render-length note is addressed in the "Render length" section.
- Environment found:
  - Playwright 1.56.1 at `/opt/node22/lib/node_modules/playwright`; Chromium at `/opt/pw-browsers/chromium` (symlink to `chromium-1194`).
  - `/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux` (n7.0.1) cannot read WAV or MP3 (no demuxers, no `pcm_f32le` encoder, no `ebur128`). `/usr/bin/ffmpeg` 6.1.1 decodes both. `score.py` tries candidates in order and prints the decoder used.
  - numpy 2.5.3 and scipy 1.18.1 are installed.
- The reference MP3 is readable at `/root/.claude/uploads/341aa418-0695-5408-80be-331d2fec6cae/9014b1a3-Guidance_Original_Mix_192kbps.mp3`. Decoded: 17,108,660 samples at 44.1 kHz, 387.95 s. It was not copied into the repo.

## What was built

- `tools/render.js`:
  - Serves the repo root on 127.0.0.1 with COOP/COEP headers.
  - `--page studio` (default, archived page) uses `Sequencer.render(function (s) { Song.build(s); }, opts)`, with the section list from a null-context `Sequencer.create` plus `Song.build`.
  - `--page app` uses `Host.create()` and `host.render({from, to, sampleRate, tail})`. `host.sections()`, `totalBars()`, `bpm()`, `swing()` and `wav()` are used as A1 documents them. Verified on app/engine/host.js as it stands.
  - `--sections`, `--bars a:b | N` (relative to section start), `--sr`, `--tail` (default 2.5 s, the archived default), `--song baseline|v2` (V2 = `Song.GUIDANCE_V2` on the archive, `Song.documentV2()` in the app; files get `-v2`), `--seed` (default 1).
  - Writes `tools/out/<name>.wav` plus a sidecar `<name>.json` (bar range, sample rate, bpm, swing, `gridStartSample` = 2205, tail, page, song). Non-archive pages get an `app-` prefix so they never overwrite archived renders.
  - Seeds `Math.random` in the page (test harness only, via `addInitScript` and a reset per job). Reason: the archived engine's noise and jitter use unseeded `Math.random` (`core.js`, `synths.js`), so two renders of the same bars differed.
  - Reports page errors and console errors. Exits 1 on a page error.
- `tools/score.py`: all measures listed in CONTRACT and the S3 and S4 procedures. Options: `--ref`, `--section`, `--bars`, `--tail`, `--json`, `--xcheck` (ffmpeg `ebur128` on the same window), `--selftest`, and reference-only mode (no render argument, `--ref` plus `--bars`). Details, limits and status for every measure are in `tools/README.md`.
- `tools/README.md`: method, limits, verification status and open items for each measure.

## Commands and exit codes (read directly from each command)

```
$ node --check tools/render.js                       -> EXIT 0
$ python3 -m py_compile tools/score.py               -> EXIT 0
$ python3 tools/score.py --selftest                  -> EXIT 0, last line "OK: all selftest checks passed"
   PASS K-weight stage 1 at 48 kHz matches BS.1770-4 Table 1 (max diff 8.88e-16)
   PASS K-weight stage 2 at 48 kHz matches BS.1770-4 Table 2 (a1 -1.99004745 a2 0.99007225)
   PASS loudness of a stereo 1 kHz sine (0.1 amplitude) ... (measured -19.988, expected -19.993 (K gain 0.698 dB))
   PASS correlation: identical noise gives 1, independent noise gives about 0 (identical 1.0000, independent 0.0082)
   PASS tempo estimate on a synthetic 126 BPM click track (estimated 125.99)
   PASS kick glide fit recovers f0, fT, tau on a synthetic 264/51/24 ms kick (f0 266.4 fT 50.1 tau 23.99 ms)
   PASS sub duck: 20 ms is ducked by the expected amount, 200 ms is back near 0 dB (20 ms -5.98 dB (expect -6.67), 200 ms -0.60 dB)
$ node tools/render.js --sections intro,mainA --bars 2   -> EXIT 0
   rendered intro-0-2: bars 0..1 (2 bars, 6.41 s incl. tail) in 0.56 s -> tools/out/intro-0-2.wav
   rendered mainA-0-2: bars 40..41 (2 bars, 6.41 s incl. tail) in 0.92 s -> tools/out/mainA-0-2.wav
   page errors: none
$ node tools/render.js --sections intro,mainA --bars 16  -> EXIT 0
   rendered intro-0-16: bars 0..15 (16 bars, 33.08 s incl. tail) in 4.33 s
   rendered mainA-0-16: bars 40..55 (16 bars, 33.08 s incl. tail) in 17.30 s
   page errors: none   (wall 22.7 s for the process)
$ node tools/render.js --page app --sections intro,mainA --bars 2   -> EXIT 0
   rendered app-intro-0-2: bars 0..1 in 0.40 s;  app-mainA-0-2: bars 40..41 in 0.92 s;  page errors: none
$ node tools/render.js --page app --sections intro,mainA --bars 16  -> EXIT 0
   rendered app-intro-0-16: 3.53 s;  app-mainA-0-16: 16.87 s;  page errors: none   (wall 21.6 s)
$ node tools/render.js --page app --sections intro --bars 16 --song v2  -> EXIT 0 (app-intro-0-16-v2, 2.23 s)
$ node tools/render.js --page app --sections intro --bars 2 --song v2 -> EXIT 0 (app-intro-0-2-v2, 0.39 s)
$ node tools/render.js --sections intro --bars 2 --song v2  -> EXIT 1 (expected: archived page has no Song.GUIDANCE_V2;
   message "Song.GUIDANCE_V2 is not on this page")
$ python3 tools/score.py tools/out/mainA-0-2.wav --ref <MP3> --xcheck     -> EXIT 0 (table below)
$ python3 tools/score.py tools/out/mainA-0-16.wav --ref <MP3>            -> EXIT 0
$ python3 tools/score.py tools/out/mainA-0-16.wav --ref <MP3> --json     -> EXIT 0
$ python3 tools/score.py tools/out/app-intro-0-16.wav --ref <MP3>        -> EXIT 0
```

## Render length and wall time (coordinator's note)

Measured in headless Chromium in this sandbox, `Sequencer.render` offline. Per-bar time is the reported render time divided by bars:

| Render | Bars | Render time | Per bar |
|---|---|---|---|
| archived intro | 16 | 4.33 s | 0.27 s |
| archived mainA | 16 | 17.30 s | 1.08 s |
| archived mainA | 2 | 0.92 s | 0.46 s (includes setup) |
| app intro | 16 | 3.53 s | 0.22 s |
| app mainA | 16 | 16.87 s | 1.05 s |
| app intro (V2) | 16 | 2.23 s | 0.14 s |

Each run's total wall time (including Chromium start and page load) was about 22 s for two sections of 16 bars. The density of the section drives the cost: mainA (stabs, hats, clap, bass, lead) takes about 4× intro per bar.

The loop uses 2 bars for quick plumbing checks and 16 bars for scores. It never renders a full song. At 1 s per bar, the 200-bar song would take about 3 to 4 minutes, consistent with A6's report of more than 100 s for 48 bars. I did not investigate further, per the coordinator's instruction (A11 is measuring).

## Verification output: the 2-bar contract case, scored against the reference

`python3 tools/score.py tools/out/mainA-0-2.wav --ref <MP3> --xcheck` (exit 0). Window: song bars 40 to 41 (sidecar). Both files 3.81 s.

```
measure                                                              render    reference         diff
tempo, onset-flux autocorrelation (BPM)                              125.24       125.59        -0.35
R: 300 Hz-1 kHz vs 20-300 Hz (dB)                                     -8.48       -14.37        +5.88
1-4 kHz vs 20-300 Hz (dB)                                            -11.23       -18.93        +7.70
4-16 kHz vs 20-300 Hz (dB)                                           -18.80       -17.84        -0.95
A: 300 Hz-1 kHz power, matched to ref loudness (dB)                  -17.29       -22.93        +5.65
integrated loudness (LUFS, approx.)                                   -7.11       -10.32        +3.21
sample peak (dBFS)                                                    -0.62        -0.34        -0.27
true peak, 4x (dBTP, approx.)                                          0.36        -0.04        +0.40
L/R corr 300 Hz-2 kHz, onset 0-30 ms, all steps                       0.974        0.483       +0.491
L/R corr 300 Hz-2 kHz, tail 60-115 ms, all steps                      0.664        0.273       +0.391
kick glide, coherent: f0 (Hz, at t=0)                                 156.3        259.8       -103.5   (render UNRELIABLE)
kick glide, coherent: fT / tau (ms)                                     5.0 / 89.1   51.4 / 24.7
sub duck (dB re 300-450 ms)  0/10/20/40/60/100/150/200 ms (render | ref)
   -8.9 | +0.9,  -7.1 | -3.3,  -7.7 | -7.9,  -10.7 | -7.1,  -0.5 | -12.6,  +6.4 | -12.2,  +2.1 | -5.1,  +9.8 | -2.7
xcheck (ffmpeg ebur128, same window): render I -7.1 LUFS, TP 0.4 dBTP; reference I -10.4 LUFS, TP -0.1 dBTP
```

Same run, reference mainA over the 32 bars (`--bars 40:72`, reference only): 0-30 ms correlation at steps 2, 6, 10, 14 = 0.165 (per step 0.11, 0.04, 0.48, 0.19). O1 M7 gives 0.47 to 0.60. This does not reproduce; see Open items.

Scored 16 bars: `mainA-0-16` (render) against reference bars 40 to 55: tempo 125.70 vs 125.96; R -7.67 vs -13.77 (+6.10); 1-4 kHz -11.55 vs -19.20 (+7.65).

## Validation against O1 and independent tools

- Loudness (integrated, approximate) on the seven reference sections against O1 M9: within 0.05 LU for all seven (intro -10.55 vs -10.6; build -12.11 vs -12.1; mainA -10.24 vs -10.2; mainA2 -10.34 vs -10.3; break -12.47 vs -12.5; mainB -9.92 vs -9.9; outro -10.43 vs -10.4).
- Loudness cross-check: ffmpeg `ebur128` on the 2-bar windows: -10.4 (reference, ours -10.32) and -7.1 (render, ours -7.11).
- True peak against O1 M9 per section: within 0.01 dB (intro -0.49, build -0.51, mainA -0.04 vs -0.03, mainA2 -0.23, break -0.38, mainB 0.00 vs +0.01, outro -0.29).
- Band levels against O1 M9: R is +1.1 to +2.0 dB higher than O1 in every section; 1-4 kHz is +0.9 to +3.0 dB; 4-16 kHz is +0.1 to +3.1 dB. The cause was not identified (window function, band edges and power or amplitude convention are candidates). Not resolved; see Open items.
- Kick glide on the reference: intro 0-16 (63 beats) f0 253.0 Hz, fT 51.2 Hz, tau 25.2 ms, against O1 M1 264 / 51.2 / 23.9 ms. Reference mainA (7 beats) 259.8 / 51.4 / 24.7 ms.
- Sub duck on the reference mainA 2 bars: 0 ms +0.9 (O1 -1), 10 -3.3 (-4), 20 -7.9 (-7), 40 -7.1 (-15), 60 -12.6 (-15), 100 -12.2 (-12 to -13), 200 -2.7 (-2.5). The 40 and 60 ms values differ from O1 by 8 and 2 dB.
- Same-seed noise floor: two renders of mainA 2 bars with the same seed differ by at most 15 LSB (-80 dB rms). R, 1-4 kHz, 4-16 kHz, LUFS and sample peak agree to three decimals.
- App against archive, mainA 2 bars (same bars, same reference): R -8.48 on both, LUFS -7.11 on both, kick glide f0 156.3 on both (sub duck and correlation identical to the displayed digits). So the app's Host renders the baseline the same as the archived page, to the precision shown.

## Findings for the coordinator and owners

- **To A7 (V2 scored):** app intro 16 bars, baseline vs V2, against the reference intro 0 to 16.
  - Sub duck, 0 to 60 ms: V2 gives -3.0 / -4.1 / -5.8 / -9.4 / -15.8 dB against the reference's -2.8 / -3.5 / -5.4 / -8.8 / -13.3. Good match.
  - Sub duck, 100 to 150 ms: V2 gives -25.9 / -19.9 dB against the reference's -10.8 / -5.7. About 14 to 15 dB too deep and too slow to recover (the baseline has no duck, so this is the first duck measured on the app).
  - Kick glide: unreliable on both renders (see Open items). Tempo 124.4 for V2 vs 126.0 reference (16 bars). Not explained.
  - Baseline mids: R -9.8 dB vs reference -23.9 dB on the intro. About 14 dB hot in the mids; 1-4 kHz +10 dB; 4-16 kHz +17 dB. This is the largest gap found so far, and it is the intro (the match-EQ and per-element targets should start there, as S3 predicted).
- **To A8:** `send.reverb.seed` is read by the app's sequencer and is not needed by the loop: `render.js` seeds `Math.random` in the page, which covers the reverb impulse path too. The seed parameter is still the right way to make app renders repeatable for users. Not changed here.
- **To A1 and A6:** `Host.render({from, to, sampleRate, tail})`, `host.sections()` (name, start, bars), `host.totalBars()`, `host.bpm()`, `host.swing()` and `host.wav()` work as documented in your logs. `Host.create({doc: Song.documentV2()})` works. No page errors on `app/index.html` with the current files.
- **To coordinator:** `tools/out/` should be ignored by git (WAVs of about 1.1 MB per 2 bars, 5.8 MB per 16 bars). No `.gitignore` entry was added; the decision is yours.

## Open items (not resolved, reported as such)

1. **Band-level method vs O1 M9.** R +1.1 to +2.0 dB against O1 in every section. Not identified. Render-minus-reference differences are unaffected in principle, but absolute values must not be compared with O1's table.
2. **Stab-step correlation vs O1 M7.** Reference mainA stab steps give 0.11 / 0.04 / 0.48 / 0.19 (1-indexed 2, 6, 10, 14), against O1's 0.47 to 0.60. Not reproduced; the step-indexing or window convention in O1 is the first candidate. Treat O1's stab figures as unverified until this is resolved.
3. **Kick glide on renders.** UNRELIABLE on every render tried (fT pinned at 5 Hz, residual 46 to 142 Hz) at 400 Hz and 250 Hz low-pass. Works on the reference. Cause not isolated. Kick numbers from renders should not be used yet.
4. **Tempo octave.** Reference bars 24 to 40 (build) report 63.05 BPM (the 2-beat pick). Octave guard is a choice of this tool, documented; `--json` carries the candidates.
5. **Render determinism.** Same seed still differs by at most 15 LSB (-80 dB rms) for a source I did not isolate. Measures agree to three decimals.
6. **Glide low band in the reference.** f0 253 Hz in the 400 Hz band vs O1's 264 Hz. Not explained.
7. **Sub duck at 40 and 60 ms.** Differs from O1 M4 by 8 and 2 dB.

Not verified at all: any listening result; the BS.1770 Annex 2 true-peak filter (we use scipy `resample_poly`); libebur128 equality beyond the two ffmpeg checks.

## Files

- `tools/render.js` (new)
- `tools/score.py` (new)
- `tools/README.md` (new)
- `docs/research/2026-10-23-build-crew/transcripts/log-A9.md` (this file)
- `tools/out/` (generated renders and sidecars; not committed)

No commits made.

## Exit codes re-read directly (after writing the above)

```
$ node tools/render.js --page app --sections intro --bars 16 --song v2   -> EXIT 0
$ node tools/render.js --page app --sections intro --bars 2 --song v2    -> EXIT 0
$ node tools/render.js --sections intro --bars 2 --song v2               -> EXIT 1 ("Song.GUIDANCE_V2 is not on this page")
$ python3 tools/score.py tools/out/app-intro-0-16.wav --ref <MP3>        -> EXIT 0
$ python3 tools/score.py tools/out/mainA-0-2.wav --ref <MP3> --xcheck    -> EXIT 0
```
