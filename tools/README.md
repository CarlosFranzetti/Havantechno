# tools/: scoring loop (A9)

Render the Havantechno engine offline, then measure the render and the reference with the same code,
so that a change in the engine shows up as a number. Two scripts:

- `render.js` renders song sections through the page (Playwright, offline, 44.1 kHz) into `tools/out/`.
- `score.py` measures a render, and optionally the reference, with the methods of the Roundtable
  research (O1 M1 to M9, S3 R and A, S4 per-band correlation). numpy and scipy.

`tools/out/` is generated. Its WAVs are about 1.1 MB per 2 bars and about 5.8 MB per 16 bars. Keep it out of git
(the coordinator's decision; no `.gitignore` entry was added here).

## Quick use

```
node tools/render.js --sections intro,mainA --bars 2            # archived page, seeded, 2 bars each
node tools/render.js --page app --sections mainA --bars 16      # app/index.html (Host.render)
node tools/render.js --page app --sections intro --bars 16 --song v2
python3 tools/score.py tools/out/mainA-0-2.wav --ref <reference.mp3> --xcheck
python3 tools/score.py tools/out/mainA-0-2.wav --ref <reference.mp3> --json
python3 tools/score.py --ref <reference.mp3> --bars 40:72          # reference alone, absolute bars
python3 tools/score.py --selftest                                  # synthetic checks of the measures
```

`render.js` options: `--page studio` (default, the archived `olde Havantechno dub studio/`), `app`, or a
repo-relative path to another page. `--sections` takes names from the page's arrangement. `--bars a:b` is
relative to each section start (absolute song bars without `--sections`); a single `N` means `0:N`.
`--song baseline|v2` picks the preset (`Song.GUIDANCE_V2` on the archived page, `Song.documentV2()` in the
app; V2 files get a `-v2` suffix). `--seed` (default 1) seeds `Math.random` in the page. `--tail` is the
seconds rendered after the last bar (default 2.5, the archived default). The app's files get an `app-`
prefix so they never overwrite archived renders. `--solo kick[,name]` (app page only) solos tracks through
`Host.solo` before the render, for isolating one track's level; the file gets a `-solo-<names>` suffix.

`score.py` options: `--section name` (the archived arrangement, see `SECTIONS`), `--bars a:b` (relative to
the section, or absolute), `--tail s` (appended to the window, default 0), `--json`, `--xcheck` (ffmpeg's
`ebur128` on the same window), `--selftest`.

## Environment, as found and checked

- Chromium: `/opt/pw-browsers/chromium` (symlink to `chromium-1194`). Playwright 1.56.1 at
  `/opt/node22/lib/node_modules/playwright`. Override with `CHROMIUM_PATH`.
- ffmpeg: `/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux` (n7.0.1) cannot read WAV or MP3 at all (no demuxers,
  no `pcm_f32le` encoder, no `ebur128` filter). `score.py` tries `$FFMPEG`, then that binary, then
  `/usr/bin/ffmpeg` (6.1.1, has MP3 and `ebur128`). The decoder used is printed. Verified: the reference
  decodes to 17,108,660 samples at 44.1 kHz (387.95 s).
- numpy 2.5.3, scipy 1.18.1, Node 22.22.0.

## render.js: what it does and what it assumes

- Serves the repo root on `127.0.0.1` with a random port and COOP/COEP headers. It opens the page, reads the
  page's arrangement (archived: `Sequencer.create(null, {})` + `Song.build`; app: `Host.create()`,
  `host.sections()`, `host.totalBars()`), and calls `Sequencer.render` (archived) or `host.render({from, to})`
  (app). The WAV comes from `Sequencer.wav` or `host.wav`, read back in base64 chunks.
- Timing: the archived engine starts bar `from` at audio time 0.05 s (`sequencer.js`, `render()`), so
  sample 2205 at 44.1 kHz is step 0 of bar `from`. The sidecar `<name>.json` records this as
  `gridStartSample`, with the bar range, bpm, swing and tail. `score.py` reads it.
- Seeding: the archived engine draws noise and jitter from unseeded `Math.random` (`core.js`, `synths.js`).
  Each job re-seeds the page's `Math.random` (mulberry32, `--seed`). This is a harness-only override,
  installed before the page's scripts. The app engine also seeds through `Host.create({seed})` and the
  document's sequencer seed.
- Limit: with the same seed, two renders still differ by at most 15 LSB (about -80 dB rms; verified on the
  same 2 bars). The cause was not isolated. Every score in this file agreed between the two to three decimals.
- Verified: archived `intro` and `mainA` (2 bars and 16 bars), and app `intro`, `mainA` (2 bars) and
  `intro` V2 (16 bars). No page or console errors in any run.
- Wall time per bar on the app page (after A1's chunked render, wave 2): intro 0.15 s, mainA 0.39 s, a 48-bar
  window 0.42 s, the full 200-bar song 0.44 s (88.8 s). Wave 1 (single schedule): intro 0.22 to 0.27 s,
  mainA 1.05 to 1.08 s. The 16-bar window is the scoring length; the full song is feasible now but is
  not needed for the per-section checks.

## score.py: input, windows and the reference grid

- Everything is decoded to 44.1 kHz stereo float32 with ffmpeg.
- Reference grid (O1 M0): first kick onset T0 = 0.568 s, 126 BPM, straight. One bar is 84,000 samples,
  one beat 21,000, one 16th 5,250. No swing.
- Render grid: from the sidecar (bar `from` at `gridStartSample`), with the page's bpm and swing. Odd 16ths
  are late by `swing * 0.33 * stepSec` in the archived sequencer (2.36 ms at swing 0.06). Correlation
  applies this per step. Without a sidecar, bar 0 is assumed at sample 0, 126 BPM, no swing (a warning).
- Window: `--section` (SECTIONS table), else `--bars`, else the sidecar's bar range, else the whole file.
  Both files are cut on the same bars. `--tail` extends the window.
- SECTIONS (song bars, archived `song.js`): intro 0-16, intro2 16-24, build 24-40, mainA 40-72, mainA2 72-104,
  break 104-128, breakEnd 128-136, mainB 136-184, outro 184-200. The reference's section starts at bars 24,
  40, 104, 136 and 184 agree with these. The reference's drop at bar 120 (O1) is not in this table.

## Measures

Status key: **Verified** = checked against an independent number or a synthetic test. **Matches O1** = agrees
with O1's measured value. **Unverified** = not checked. **Open** = a known disagreement not resolved.

**1. Tempo** (onset-flux autocorrelation). Mono mix. 10 ms RMS frames at a 2 ms hop (the hop is 88 samples,
1.9955 ms; the BPM conversion uses the real hop). Half-wave-rectified dB flux, smoothed with a 14 ms Gaussian
(without it the fractional beat lag quantizes to 2 beats). Autocorrelation normalised at lag 0, searched over
60 to 200 BPM. Octave guard (a choice of this tool, not from a source): the shortest-lag local peak whose
value is at least 50 % of the maximum wins. Parabolic refinement.
- Verified: synthetic 126 BPM click train 125.99; reference bars 0-end 126.00; reference mainA 125.94.
- Limits: 2-bar windows are unreliable (125 to 167 BPM seen). Open: reference bars 24-40 (build) report
  63.05, a 2-beat pick where the 1-beat peak is under 50 % of the 2-beat peak. The candidate list is in `--json`
  (`tempo_candidates`). Its resolution is about 0.3 BPM at 3 to 4 bars.

**2. Band levels** (R, 1-4 kHz, 4-16 kHz, A). Welch PSD (Hann, 8192 samples, 50 % overlap, both channels summed).
Band power = sum of PSD across the band times the bin width (mean-square units). dB relative to 20-300 Hz.
- `R` = 300 Hz-1 kHz relative to 20-300 Hz (S3 R, O1 M9).
- `A` = 300 Hz-1 kHz power in dB, after matching loudness to the reference: A_render = A_abs + (LUFS_ref - LUFS_render),
  so both signals are compared at the reference's loudness (S3 A). Reported as a difference only.
- Matches O1 in trend, not in value. Against O1's M9 table on the reference (seven sections, same bar windows
  as O1's intro 0-24, build 24-40, mainA 40-72, mainA2 72-104, break 104-136, mainB 136-184, outro 184-200):
  R is +1.1 to +2.0 dB higher than O1 in every section; 1-4 kHz is +0.9 to +3.0 dB higher; 4-16 kHz is +0.1
  to +3.1 dB higher. The method difference (window function, band edges, power or amplitude) was not identified
  from the transcripts. **Open.** Render-minus-reference differences from this tool are consistent with
  each other. Do not compare absolute values with O1's table.

**3. Integrated loudness** (approximate). BS.1770-4 K-weighting with the libebur128 constants from S4
(stage 1 high shelf f0 1681.97 Hz, G 4.0 dB, Q 0.7072; stage 2 RLB high-pass f0 38.14 Hz, Q 0.5003), computed
for 48 kHz. Stereo, channel weights 1. The window is resampled 44.1 to 48 kHz (`resample_poly` 160/147).
400 ms blocks, 100 ms hop, absolute gate -70 LKFS, relative gate -10 LU, `-0.691 + 10 log10` mean power.
- Verified: K-weighting coefficients equal BS.1770-4 Table 1 and Table 2 at 48 kHz (max difference 9e-16 on
  Table 1). A stereo 1 kHz sine of 0.1 amplitude measures -19.99 LUFS against -19.99 expected (power plus the
  filter's 0.70 dB gain at 1 kHz).
- Matches O1 M9 on the seven reference sections within 0.05 LU (intro -10.55 vs -10.6, build -12.11 vs -12.1,
  mainA -10.24 vs -10.2, mainA2 -10.34 vs -10.3, break -12.47 vs -12.5, mainB -9.92 vs -9.9, outro -10.43 vs -10.4).
- Cross-checked against ffmpeg `ebur128` (libebur128, `--xcheck`): reference mainA 2 bars -10.32 vs -10.4 (ffmpeg
  prints one decimal); render -7.11 vs -7.1.
- Not libebur128 itself. The resampling and the filter are our own implementation, not the libebur128 code.

**4. Sample peak.** Maximum absolute sample over the window, in dBFS. Exact for the decoded data.
- Unverified against an independent tool beyond the window values above.

**5. True peak (4x).** `scipy.signal.resample_poly(x, 4, 1)` per channel, processed in 2^19-sample chunks.
Maximum absolute value, dBTP.
- Matches O1 M9 per section within 0.01 dB on the reference (intro -0.49, build -0.51, mainA -0.04 vs -0.03,
  mainA2 -0.23, break -0.38, mainB 0.00 vs +0.01, outro -0.29).
- Limit: not the BS.1770 Annex 2 polyphase filter. ffmpeg `ebur128=peak=true` agrees to about 0.1 dB (it prints
  one decimal).

**6. L/R correlation, 300 Hz-2 kHz** (S4 procedure, O1 M7 windows). Zero-phase 4th-order Butterworth band.
For each 16th, the step's own hits are summed, not averaged: rho = sum(L R) / sqrt(sum(L^2) sum(R^2)), with the
sums taken over all hits of one step index. Windows are onset 0-30 ms and tail 60-115 ms after each step.
Outputs: all steps, the O1 stab steps (1-indexed 2, 6, 10, 14, as O1 M7 reads them), and per-step arrays.
Nine octave bands (S4 Q12a: 20, 60, 150, 300, 600, 1.2k, 2.4k, 4.8k, 9.6k, 16k) are printed as well.
- Verified: identical noise gives rho 1.0000, independent noise 0.008.
- Matches O1 in the octave profile, coarsely: reference below 150 Hz about 1.0, 1.2-2.4 kHz 0.61, 2.4-4.8 kHz 0.80,
  above 4.8 kHz 0.90 (O1 M7: 0.65 at 1-4 kHz, 0.84 above 4 kHz, for the full mainA).
- **Open:** the O1 stab-step numbers are not reproduced. Reference mainA (32 bars, 300 Hz-2 kHz, 0-30 ms): steps
  2, 6, 10, 14 give 0.11, 0.04, 0.48, 0.19 (aggregate 0.17), against O1's 0.47 to 0.60. With steps 2, 6, 10, 14
  read 0-indexed the values are 0.23, 0.32, 0.48, 0.41 (aggregate 0.36), still below O1. The cause was not found
  in the transcripts. Treat the stab-step figures as unverified until this is resolved.
- Limit: `--section` windows of 2 bars give about 2 hits per step; use 16 or more bars for stable values.

**7. Kick pitch glide.** Zero-phase 4th-order low-pass at 400 Hz (a choice; O1 used 250 Hz, which did not change the
render result). On the mono mix. Two estimates: (a) the aligned mean over all beats (primary: an incoherent sub
averages down); (b) the median over beats of each beat's instantaneous frequency. Instantaneous frequency is
the analytic-signal (`scipy.signal.hilbert`) phase derivative, sampled from 2 to 150 ms after each beat. Fit
`f(t) = fT + (f0 - fT) exp(-t/tau)` by least squares (`curve_fit`, bounds f0 20-5000 Hz, fT 5-500 Hz, tau
1-1000 ms). Reported: f0 (the model at t = 0), fT, tau, residual rms. Flag `UNRELIABLE` if a fitted value
sits on a bound or the residual exceeds 50 Hz (a choice of this tool).
- Verified: synthetic kick 264 / 51.2 Hz / 23.9 ms with a 0.2 incoherent 34.47 Hz drone over 84 beats
  recovers 266.4 / 50.1 Hz / 23.99 ms.
- Matches O1 M1 on the reference: intro 0-16 (63 beats) gives f0 253.0 Hz, fT 51.2 Hz, tau 25.2 ms (O1 M1:
  264, 51.2, 23.9; f0 is 11 Hz lower in our 400 Hz band, not explained). Reference mainA 2 bars (7 beats):
  259.8, 51.4, 24.7 ms.
- **Unverified for renders:** the fit on the archived renders and the app renders is flagged UNRELIABLE (fT at its
  5 Hz bound, residual 46 to 142 Hz). The cause was not isolated (not the low-pass; the render's low band after
  about 40 ms is not a single exponential sweep). Do not read kick numbers from renders yet.

**8. Sub duck profile.** Zero-phase 4th-order band 30-40 Hz, mono mix. The aligned mean over beats (the kick
template, O1 R1) is subtracted per beat. The residual power is averaged over beats and smoothed with a 5 ms
centred moving average. The output is dB relative to the mean power over 300-450 ms, at 0, 10, 20, 40, 60, 100,
150 and 200 ms after each beat. Beats are folded at the period 21,000 samples (from the page's bpm, 60/bpm x 44100).
- Verified: synthetic 0.8 ducking with a 50 ms decay (incoherent drone): 20 ms -5.98 dB against -6.67 expected;
  200 ms -0.60 dB against 0 (test tolerance 1.5 and 1.0 dB).
- Matches O1 M4 on the reference (mainA 2 bars, 7 beats): 0 ms +0.9 (O1 -1), 10 ms -3.3 (-4), 20 ms -7.9 (-7),
  40 ms -7.1 (-15), 60 ms -12.6 (-15), 100 ms -12.2 (-12 to -13), 150 ms -5.1, 200 ms -2.7 (-2.5).
- Limits: the 30-40 Hz filter smears by about 1/bandwidth (about 30 ms, as O1 notes), so the 0-10 ms values are
  not resolved. The 40 ms and 60 ms values differ from O1 by 8 and 2 dB; the reason was not identified.
- The archived sub is a plucked oscillator with no duck (the reference has a ducked drone), so its profile is
  a plateau-relative rise, which is expected and is the point of the measure.

## Reference numbers used in this file

Reference mainA 2 bars (song bars 40-41) and intro 0-16 are scored from `/root/.claude/uploads/...Guidance_Original_Mix_192kbps.mp3`.
The mp3 is not copied into the repo. Band and correlation numbers are per window; the O1 numbers quoted are
O1's (round 4 and round 2, section 5) and used only as reference points.

## Limits, in one place

- Decoding: MP3 at 192 kbps. Lossy coding may change side content above about 4.8 kHz (S4).
- Band filters smear time by about 1/bandwidth, so the first 10 to 30 ms of any band-limited value is approximate.
- Short windows: 2 bars is enough to run every measure, not enough for tempo or the kick fit. Use 16 bars or more.
- The archived renders are not bit-identical without the seed; with the seed they differ by at most 15 LSB.
- Not verified at all: any listening result; the BS.1770 Annex 2 true-peak filter; libebur128 equality beyond two
  ffmpeg checks; the O1 band method; the stab-step correlation; the kick fit on renders.

## Checks run for this version

`python3 tools/score.py --selftest` prints PASS for: K-weight coefficients (two tables), loudness of a 1 kHz sine,
correlation (identical and independent noise), tempo (126 BPM click train), kick glide (synthetic 264/51/24 ms),
sub duck (synthetic 0.8 duck). `node --check tools/render.js` passes. Renders and scores are recorded in
`docs/research/2026-10-23-build-crew/transcripts/log-A9.md`.
