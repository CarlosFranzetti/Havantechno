# E1: low end (kick and sub), round 1

Analyst: E1 (Opus). Group: everything under about 150 Hz in the reference, the kick and the sub.
Opened 2026-10-24. Everything below is measured by analysis with numpy/scipy on the decoded audio; nobody here hears.
"Estimated" marks a number that is a judgement or an extrapolation, not a measurement.

## Sources and conventions

- Reference: the coordinator's decoded copy of the MP3, `scratchpad/ref/guidance.f32` (float32 stereo, 17,108,660 frames,
  44.1 kHz; checked against `ref-intro-16.wav`: correlation 0.9996 on the left channel over 16 bars, so it is the same decode
  and the same grid). Not in the repo, never copied.
- Reference grid (O1 M0, `tools/README.md`): T0 = 0.568 s = sample 25,049; bar = 84,000 samples, beat 21,000, 16th 5,250.
  "Bar n" is a song bar from T0. Windows: intro bars 0-16, mainA 40-56, break 104-128, mainB 136-152 unless stated.
- App renders: `tools/out/app-*.wav` and `scratchpad/ref/solo/mainA-*.wav`. Their sidecars say `song: baseline`, i.e.
  `Song.GUIDANCE` (not `GUIDANCE_V2`): kick tune 44, punch 190, sweep 0.07, decay 0.3, click 0.12, drive 0.45, tau 0, hold 0;
  sub B1 pluck, four hits per bar, decay 0.4, harmonic 0.15, gate 8, no sidechain. Render grid: bar `from` at sample 2205.
- Scratch scripts: `scratchpad/e1/*.py` (outside the repo).

## 0. Answers in one place

1. **59.2 Hz is the kick's body, not a tone of its own; 35.0 Hz is a separate voice, the free-running sub drone.** Below
   150 Hz the reference holds exactly two sounds in the intro and main sections: the kick (beat-locked, all its energy
   between 0 and 200 ms after each beat) and a mono drone on 34.475 Hz (not beat-locked) that pulses at 1.2027 Hz and
   ducks after every kick. The coordinator's 59.2 Hz peak is the top of the kick's spectrum. The kick's pitch glides down
   to about 52 to 55 Hz, but it is loudest between 40 and 100 ms, while it is still passing through 97 to 56 Hz, so its
   spectrum peaks at 56 Hz (−3 dB from 52 to 60 Hz). The "B0 in one bar of eight" (O1) is one line of the drone's
   spectrum, not a second note.
2. **Kick**: f(t) = 52.0 + 210·e^(−t/24.0 ms) Hz from 10 to 150 ms. O1's glide holds (51 + 213·e^(−t/24 ms)). The first
   10 ms are an irregular transient at 195 to 245 Hz. The level starts about 4 dB below the peak, rises to the peak by
   35 to 40 ms, stays within 1 dB of it until about 70 ms, then falls 0.2 dB per ms (−6 dB at 99 ms, −20 dB at 162 ms)
   and is cut off at about 197 ms. There is a 1 to 2 ms click about 25 dB below the body, and a second harmonic at −24 dB.
3. **Duck**: the drone falls −5.5 dB by 10 ms and −11 dB by 20 ms, bottoms at −15 dB at 40 to 44 ms, holds a shelf
   near −11.5 dB from 80 to 120 ms, and is back to −3 dB at 177 ms and −1 dB at 265 ms. The shape is the same in the intro,
   mainA, mainA2 and mainB. The best ducker fit is depth 0.78, attack 0.01, hold 0.08, release 0.12, curve 'db'.
4. **Break**: the drone fades out over bars 91 to 103 and is absent from bar 104 to bar 129. It fades back in over bars
   130 to 134 and is at full level at bar 136. The kick keeps playing four to the floor through the break with its low
   end cut: −9 dB below about 60 Hz (a 90 Hz low shelf, −9 dB, fits within 0.7 dB). The same cut ramps in across the build
   (bars 24 to 39) and is lifted at bar 40. That lift is O1's "+4 dB kick at bar 40".
5. **Recreation**: the baseline renders have no drone (their sub is a B1 61.7 Hz pluck that sits inside the kick's band)
   and a 44 Hz kick. In V2 the drone is +18 dB too loud against the kick and has no 1.2 Hz pulse. In both renders the kick
   is flattened by the master limiter (a flat −6 dBFS top for 140 ms in the baseline and 230 ms in V2). Proposals are in
   section 7.

## 1. Methods used (all scripts in `scratchpad/e1/`)

- **Beat template / residual** (`a1.py`, `p2.py`): the mono sum is cut into beats of 21,000 samples from T0. The mean
  over beats is the beat-locked part (the kick, and anything else that repeats every beat). The beat minus the local
  mean (±8 or ±16 beats) is the residual, i.e. everything not locked to the beat. The bar-locked equivalent (84,000
  samples) gives almost the same result: in the intro below 150 Hz the beat template carries −13.1 dBFS, the bar template
  −13.0 and the residual −19.8. So nothing below 150 Hz in the intro is bar-locked without also being beat-locked.
- **Line spectra**: Hann window, zero-padded FFT up to 2^25 points, parabolic peak interpolation (`a4.py`, `a6.py`), on
  the residual band-passed 24 to 46 Hz (4th-order Butterworth, zero phase). Windows are 40 to 64 bars long, which gives
  0.008 to 0.026 Hz resolution.
- **Kick pitch and level** (`k1.py`, `k2.py`): beat template over 64 beats. Zero-crossing half-periods after a causal
  2nd-order 1 kHz low-pass give frequency and the peak of each half-cycle, which avoids the Hilbert artefacts of a
  low-level onset. The Hilbert envelope of the 400 Hz low-passed template gives the threshold crossings. Fits use
  `curve_fit` with f = f_end + A·e^(−t/tau).
- **Click** (`c3.py`): band power per hit, averaged over hits (incoherent). This matters: the click is noise-like and
  cancels in the beat template, so the template method (`c1.py`) under-reads it by about 10 to 18 dB. The table uses
  the per-hit figures.
- **Duck** (`d1.py`): residual (kick template removed) × e^(−i2π·34.475 t), low-passed at 15 Hz (4th order, zero phase),
  power folded on the beat, dB relative to the mean over 300 to 450 ms. Smear calibration: the same chain on a synthetic
  drone with V2's sidechain shape (`d1.py` bottom, `d2.py`). Ducker fits are made through the same chain, so the smear
  cancels in the comparison. `tools/score.py`'s 30 to 40 Hz band (about 30 ms smear) was not used.
- **Per-16th band levels** (`p1.py`): zero-phase 4th-order bands 25–45, 45–80, 80–150 and 150–300 Hz. The rms of each
  16th is averaged over bars.
- **Per-bar tracks** (`a2.py`, `a3.py`, `b1.py`): kick = 45 to 150 Hz rms over 0 to 120 ms after each beat; drone =
  25 to 45 Hz rms over 200 to 470 ms after each beat (outside the kick and the duck).
- **Renders**: every app render starts **16.4 ms late** against its sidecar grid. In five files the first sample above
  1e-4 is at sample 2927, against `gridStartSample` 2205: the solo sub, solo hat_open, solo clap, the intro mix and the
  V2 solo sub. The solo kick's body is at 19.3 ms (sd 0.01 ms over 64 hits, so there is no jitter). The cause was not
  isolated. Estimate: the look-ahead of the two DynamicsCompressorNodes in the master (glue and limiter) plus the
  oversampled WaveShapers. Every render number below has these 722 samples removed. **For A9:** this offset is a likely
  reason `score.py` flags its kick-glide fit on renders as UNRELIABLE, because the fit starts at the grid, 16 ms before
  the kick.
- Renders made for this transcript (git-ignored `tools/out/`): `app-mainA-0-4-v2-solo-kick`, `app-mainA-0-8-v2-solo-sub`,
  `app-mainA-0-16-v2`, `app-break-0-16-v2`.

## 2. Inventory: what lives under 150 Hz in the reference

| # | Sound | Where | Onsets | Pitch / band | Envelope (measured) | Level | Stereo |
|---|---|---|---|---|---|---|---|
| L1 | Kick | Bars 0–199, every beat. Build 24–39: low end cut, ramping in. Break 104–134: low end cut. | Steps 0, 4, 8, 12. Onset 0.05 ms after the grid (sd 0.15 ms, 64 hits). | Glide 52.0 + 210·e^(−t/24.0 ms) Hz (10–150 ms, residual 3.2 Hz). First 10 ms irregular, 195–245 Hz. Late pitch 53–56 Hz at 90–140 ms. Spectrum peak 56.2 Hz, −3 dB from 52.2 to 59.6 Hz. | Starts −10.7 dBFS (first 2 ms), −5 dB at 4–17 ms, peak −1.2 dBFS at 37–45 ms, within 1 dB to about 70 ms. Then −2.5 dB at 80 ms, −6 at 97, −9 at 106, −11.3 at 125, −15 at 143, −19 at 153, −22.5 at 180, −26 at 195; cut to below −40 dB at about 197–198 ms. Hilbert crossings: −1 dB 49 ms, −3 dB 82, −6 dB 99, −20 dB 162, −40 dB 198. | Body peak −1.2 dBFS (intro). 45–150 Hz per-beat rms −6.6 dBFS (intro), −7.0 to −7.3 (mainA, mainB). | Mono |
| L1a | Kick click | With L1 | Same | Broadband transient. 0–12 ms per-hit spectrum re 250 Hz: 500 Hz −26.6, 1 kHz −34.8, 1.6 kHz −35.3, 2.5 kHz −40.3, 4 kHz −47.1, 6.3 kHz −56.1, 10 kHz −63.7 dB. | 1–2.5 kHz: peak −29.1 dBFS in the first ms, −10 dB by 2 ms. 2.5–6 kHz: −36.9, −10 dB by 2 ms. 6–16 kHz: −52.2. | 25.2 dB below the 150–300 Hz body peak (−3.9 dBFS at 6–7 ms) | Mono |
| L1b | Kick saturation | With L1 | Same | Plateau window 60–140 ms (f0 55.9 Hz): 2nd harmonic −23.9 dB, 3rd −28.9, 4th −39.1, 5th −55.1. Even-order present, so asymmetric. | — | — | — |
| L2 | Sub drone | Bars 0–90 full. Fades out over bars 91–103 (25–45 Hz: −26 → −38 dB). Absent 104–129 (−41, probably leakage). Fades in over 130–134 (−36, −33, −31, −28, −24). Full from bar 136 to 199. | Free-running, not locked to the beat or the bar. | Carrier **34.475 Hz** (C#1 at −8.6 cents; constant from bar 0 to bar 199). Lines every 1.2027 Hz, dB re carrier (bars 40–104): 33.272 −2.5, 32.069 −9.0, 30.866 −5.4, 29.684 −6.8, 28.481 −14.8, 35.677 −22.3, 36.881 −6.2, 38.084 −6.7, 39.266 −13.2, 40.469 −10.2, 41.672 −9.2. Duck sidebands at ±2.1 Hz (32.375, 36.575) at −10 dB. Harmonics re carrier: 2nd −19.9 dB, 3rd −14.6 dB (tentative: 103 Hz is near other content). | Continuous. Its envelope pulses at 1.2027 Hz (period 831.5 ms, 0.2 % faster than 7 sixteenths): two humps of about 1.2 sixteenths each, then a gap of about 2.4 sixteenths at −15 to −20 dB (section 3). Ducked on every kick (section 4). | Plateau amplitude −21.3 dBFS (between kicks, mean over the pulse), about 20 dB below the kick peak. 24–46 Hz residual rms −27.6 dBFS (bars 72–104). | Mono (side −58 dB re mid at 34.475 Hz) |
| — | Beat-locked 80–150 Hz content | Break, mainB | Step 11 (odd) | About 118–124 Hz | — | — | E2's (bass). Timed in section 6 for the swing question. |
| — | 155.8 Hz sustained line | Break, mainB | — | D#3 | — | −33 dBFS | E2's |
| — | 95–99 Hz lines | mainA2 residual | — | — | — | −37 dBFS | E2's, or the kick's hit-to-hit variation (lines at multiples of 2.1 Hz) |

Count: **two sounds** in my group (kick with its click and saturation; the drone), plus three items passed to E2.

How "59 Hz is struck, not a drone" was measured (`p1.py`, intro, per-16th rms): 45–80 Hz is −9.0 dBFS on the kick
step, −21 on the next 16th, −31 to −32 on the other two. In 25–45 Hz the drone is −33.6 on the kick step (ducked), −27.8
on the next, −24.4 and −24.1 on the other two. mainA and mainB agree within 0.5 dB.

## 3. The drone in detail (question 1)

- **One voice, not two notes.** A per-bar FFT (`a2.py`, 1-bar Hann window) shows 30.87 Hz on top in bars 3, 10, 20,
  27, 44, 52, 59, 66, 76, 83, 90, … (about one bar in eight, which is O1's B0). The long-window spectrum shows why: 30.866 Hz
  is the −3 line of a comb spaced 1.2027 Hz around 34.475 Hz. In a 1.9 s window the comb's lines beat against each other,
  and in some bars the 30.87 Hz line comes out on top. A per-beat 4-note least-squares fit (`a3.py`) produced a
  "B0/C1/C#1" sequence repeating every 7 bars. That is an artefact of fitting 2 Hz-spaced frequencies in a 0.27 s
  window, so it is not used.
- **The pulse.** Folding the drone's envelope (beat-duck divided out) on 7 sixteenths gives a stable shape with 18 to 21 dB
  of contrast in every 16 to 32-bar window (`a9.py`, `m2.py`). Shape over one 831.5 ms cycle, in 24 bins from the
  maximum (bars 72–104): 0, −0.2, −1.5, −3.7, −5.8, −4.5, −1.6, −0.4, −1.0, −3.4, −7.2, −11.2, −14.5, −17.3, −18.4, −19.6,
  −20.3, −17.4, −12.1, −8.6, −7.7, −7.5, −4.4, −1.3 dB. The rate is 1.2027 ± 0.001 Hz: line spacing 1.2021–1.2031 Hz near
  the carrier over 64 bars. The fold phase drifts by about −0.11 of a 1/64 note per bar against a 7/16 grid, which also
  gives 1.202 Hz. So the pulse is not tempo-synced. Its phase stays within about ±50° from bar 0 to bar 199 against
  absolute time at 1.2027 Hz, i.e. it free-runs through the whole song (estimate; the break is too quiet to check).
- **What produces it** (estimated, not provable from a mix): three or more sines at fixed Hz offsets beating. A
  three-sine model (`m2.py`, C below) gets the depth and the two-hump shape best.

  | Model | Fold depth | Shape |
  |---|---|---|
  | Reference | −20.3 dB | Two humps and a long gap |
  | B: 34.475 Hz (0 dB) + 33.272 Hz (−2.6 dB) | −15.7 dB | One hump |
  | C: B + 30.866 Hz (−5.8 dB, phase −126° re carrier) | −18.7 dB | Two humps, gap about 4 bins (reference about 8) |
  | 11 fitted lines with fitted phases | −13.1 dB | Fixed lines explain only 58 % of the band power over 32 bars, so the drone is not perfectly stationary |
  | 11 lines with random phases (5 draws) | −9.6 to −14.0 dB | — |

## 4. The duck (question 3)

Reference, `d1.py`, dB re the 300–450 ms plateau, ms after the kick onset:

| ms | 0 | 5 | 10 | 20 | 30 | 40 | 50 | 60 | 80 | 100 | 120 | 150 | 200 | 250 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| intro | −0.4 | −2.7 | −5.5 | −11.3 | −13.8 | −15.0 | −14.7 | −13.1 | −11.6 | −11.5 | −11.7 | −7.3 | −1.5 | −1.8 |
| mainA | −2.0 | −4.2 | −6.8 | −12.1 | −14.8 | −15.3 | −14.6 | −13.8 | −12.7 | −11.8 | −12.0 | −7.7 | −1.7 | −1.8 |
| mainB | −1.3 | −3.5 | −6.1 | −11.1 | −13.1 | −13.7 | −13.6 | −12.8 | −12.1 | −11.9 | −11.9 | −7.6 | −1.7 | −1.8 |
| V2 sidechain, synthetic, same chain | −0.6 | −1.6 | −2.9 | −6.4 | −10.7 | −14.9 | −16.8 | −16.2 | −14.7 | −14.7 | −12.2 | −6.9 | −2.0 | 0.1 |
| **Fit: depth 0.78, att 0.01, hold 0.08, rel 0.12, 'db'** | — | −4.3 | −6.2 | −10.5 | −14.3 | −15.3 | −14.3 | −13.2 | −12.8 | −12.2 | −10.0 | −6.6 | −1.1 | 0.0 |
| V2 mix render (`app-mainA-0-16-v2`) | −1.9 | −3.5 | −5.5 | −11.2 | −18.2 | −23.1 | −26.3 | −26.6 | −22.8 | −20.3 | −17.8 | −13.7 | −4.5 | −1.0 |
| V2 solo sub render | 0.0 | −0.1 | −0.3 | −0.9 | −1.8 | −2.7 | −3.7 | −4.4 | −4.5 | −3.6 | −2.3 | −0.3 | 0.0 | 0.0 |

- Reference crossings: minimum at 39–44 ms, −6 dB recovered at 157 ms, −3 dB at 177 ms, −1 dB at 265 ms. The −11.5 dB
  shelf from 80 to 120 ms suggests a keyed compressor rather than a plain ducker (estimate). The grid fit
  (`d2.py`, 6×5×5×5×2 candidates, rms error over 14 points) is 0.98 dB for the bold row. V2's values give 2.38 dB:
  the V2 attack is too slow (−6.4 dB at 20 ms against −11.3) and the trough too deep and too long.
- The renders do not show the ducker's own shape. In V2 solo the drone sits at the limiter (peak −6.1 dBFS flat, rms
  −8.9 dBFS), so the 0.82 duck only takes 4.7 dB off the limiter's input excess. In the V2 mix the kick drives the limiter
  as well, and the duck becomes −27 dB at 56 ms. Both effects come from levels, not from the sidechain.

## 5. The kick against the reference (question 2)

| Quantity | Reference (intro) | O1 / Gear Crew | App baseline (solo) | App V2 (solo) |
|---|---|---|---|---|
| Glide | 52.0 + 210·e^(−t/24.0 ms), 10–150 ms, residual 3.2 Hz | 51 + 213·e^(−t/24 ms). **Correct** from 10 ms on. | 40.9 + 245·e^(−t/24.3 ms), residual 5.3 Hz (a log-linear sweep that happens to fit) | 50.6 + 302·e^(−t/23.4 ms), residual 6.8 Hz |
| First 10 ms | Irregular, 195–245 Hz, at −5 to −11 dB | Not described. O1's f(0) = 264 is an extrapolation. | 336–339 Hz | 298–302 Hz |
| End pitch (90–140 ms) | 53–56 Hz (zero crossings); fit 52.0 | 51 | 43–44 | 51–52 |
| Spectrum peak | 56.2 Hz (52.2–59.6) | — | 43.9 (41.2–46.6) | 51.3 (49.0–53.3) |
| Onset level | −9 dB re peak at 0–2 ms, −4 dB at 4–17 ms, rising to the peak at 35–45 ms | "Holds near full level to 60 ms": the rising onset was missed | −15 dB dip at 10 ms, peak at 99 ms | −11.5 dB dip at 20 ms, peak at 190 ms |
| Within 1 dB of peak | about 30–70 ms | 0–60 ms | about 50–147 ms | about 50–228 ms |
| −6 / −20 / −40 dB | 99 / 162 / 198 ms (hard cut at about 197 ms) | −6 at 100, −18 at 150, −34 at 200: **correct** | 186 / 247 / 406 ms | 279 / 352 / >460 ms |
| Raw peak per 10 ms | Shaped | — | Flat −6.1 dBFS for 140 ms | Flat −6.1 dBFS for 230 ms |
| Click, 1–2.5 kHz (per hit) | −29 dBFS in the first ms, −10 dB by 2 ms; 25 dB below the 150–300 Hz peak | "about 45 dB below the body": template method, under-reads | −21 dBFS, spread over 2–20 ms; 2 dB below its 150–300 Hz peak | −19 dBFS, 2–20 ms (distortion; click is 0); 5 dB below its 150–300 Hz peak |
| 0–12 ms spectrum re 250 Hz at 1 / 2.5 / 4 / 10 kHz | −34.8 / −40.3 / −47.1 / −63.7 dB | — | −7.0 / −10.2 / −13.2 / −18.0 | −13.0 / −13.2 / −17.2 / −23.2 |
| Harmonics 2 / 3 / 4 / 5 (60–140 ms) | −23.9 / −28.9 / −39.1 / −55.1 dB | — | −38.4 / −32.4 / −61 / −41.6 | −44.2 / −29.8 / −56.9 / −31.1 |
| 150–300 Hz peak re plateau | −2.7 dB | — | −11.7 dB | −7.3 dB |

**Where O1 was wrong or incomplete.**
- The click is not "45 dB down". It is a 1–2 ms broadband transient about 25 dB below the body. It is noise-like, so a
  template cancels it.
- The onset is not a flat hold from 0 ms: the kick rises about 4 dB over its first 35–40 ms.
- The body ends with a hard cut at about 197 ms, not an exponential tail.
- The 35 Hz drone is 34.475 Hz: O1's 34.47 holds, but C#1 is 34.648 Hz, so the note is 8.6 cents flat.
- "B0 in one bar of eight" is a line of the drone's beating comb, not a note.
- The −15 dB duck is right in depth, but its fall is faster (−11 dB at 20 ms) and it has a −11.5 dB shelf at 80–120 ms.

**Model check of the parameters** (`m1.py`: the engine's kick, a sine with a setTargetAtTime glide and an envHold
envelope, synthesised in numpy with no limiter; half-cycle peaks and zero-crossing pitch compared at 18 times from 5 to
185 ms).
- V2's parameters alone are close to the reference: −1.2 dB to 60 ms, −9.7 at 100 ms (reference −6.9), −28.6 at 185 ms
  (reference −22.4). The mismatch in the render comes from the limiter, not from tau, hold or decay.
- Best fit with a two-stage onset (cost 4.7, against 17.6 for V2): tune 55.1, punch 265, tau 21.8 ms, attack 34.7 ms
  starting 6 dB below the peak, hold 32 ms, decay 448 ms. Without the onset stage: hold 66 ms, decay 448 ms (cost 8.0).

## 6. Odd 16ths and swing (for E3)

The only low-end event on an odd 16th is the 80–150 Hz note on step 11 in the break and mainB. That note is E2's,
probably the bass. Its rise in the bar fold (`c2.py`, 4th-order zero-phase band, 2 ms smoothing) comes after the
straight grid by:
- break: 10 % rise +12.7 ms, 50 % rise +19.7 ms;
- mainB: 10 % rise +14.5 ms, 50 % rise +19.9 ms.

The kick on step 12, measured the same way, rises at +18 to +26 ms. Its 80–150 Hz content arrives late because of the
glide, so it cannot calibrate the method. The estimate for the odd-16th offset is +10 to +20 ms, which is swing 0.25 to
0.51 in the app's units (offset = swing × 0.33 × 119 ms). This **supports a late odd 16th but at the low end of E3's
20–30 ms**. The note's attack time is unknown, so the 50 % figure is an upper bound. Every kick and the drone is on even
steps or free-running, so the rest of the low end cannot test swing.

## 7. The recreation: measured deltas and proposals (question 5)

### 7.1 Measured deltas

Per-16th band rms (dBFS), on the kick step / the next 16th / the third / the fourth 16th of a beat. Reference against
the app's 16-bar renders (`p1.py`, `p3.py`).

| Band | Ref intro | App intro baseline | App intro V2 | Ref mainA | App mainA V2 | Ref break | App break V2 |
|---|---|---|---|---|---|---|---|
| 25–45 | −33.6 / −27.8 / −24.4 / −24.1 | −16.8 / −15.4 / −32.3 / −38.4 | −19.7 / −10.3 / −4.2 / −8.1 | −31.5 / −27.5 / −23.5 / −24.3 | −22.5 / −15.8 / −10.0 / −12.5 | −37.2 / −42.9 / −41.5 / −41.5 | −22.0 / −15.5 / −10.9 / −13.2 |
| 45–80 | −9.0 / −21.0 / −31.1 / −32.4 | −14.0 / −19.6 / −35.6 / −35.9 | −6.8 / −6.2 / −21.1 / −20.8 | −9.3 / −21.1 / −31.0 / −32.2 | −12.1 / −10.7 / −26.7 / −25.4 | −15.8 / −29.3 / −43.0 / −43.5 | −12.8 / −12.6 / −29.2 / −27.8 |
| 80–150 | −10.4 / −26.2 / −26.2 / −26.1 | −18.2 / −31.1 / −46.9 / −13.8 (bass) | −14.1 / −23.1 / −19.0 / −13.9 | −10.8 / −26.7 / −25.3 / −26.7 | −18.9 / −28.3 / −27.3 / −18.5 | −13.6 / −27.6 / −36.5 / −40.1 | −19.4 / −32.1 / −31.4 / −19.1 |

**Relative to the kick** (45–80 Hz on the kick step):

| Measure | Reference | Baseline | V2 |
|---|---|---|---|
| Drone (25–45 Hz, third 16th) | −15.4 dB | −18.3 (the kick's own 44 Hz tail; no drone) | **+2.6** (V2 drone +18 dB too loud) |
| 80–150 Hz on the kick step | −1.4 dB | −4.2 | −7.3 |
| Second 16th, 45–80 Hz | −12.0 dB | −5.6 | **+0.6** (V2 kick far too long) |

**The three largest deltas.**
1. The V2 drone is +18 dB too loud against the kick (in solo it sits at the limiter, rms −8.9 dBFS). The baseline has no
   drone at all.
2. The kick is flattened by the master limiter: a flat −6.1 dBFS top for 140 ms (baseline) and 230 ms (V2), so −20 dB
   arrives at 247 ms and 352 ms against the reference's 162 ms. The limiter's ceiling (−4.2 dB, threshold −6) sits below
   the reference kick peak (−1.2 dBFS).
3. The kick's 1–2.5 kHz content is 20 to 23 dB too bright relative to its own body, spread over 20 ms instead of 2 ms.
   It comes from the click and knock (baseline) and from drive plus limiter distortion (V2).

**Also:**
- Baseline kick end pitch 43–44 Hz against 52–55 Hz.
- No drone fade-out in the break (V2 keeps it at full level, 25–45 Hz −11 dBFS against −41).
- No kick low-cut in the build or the break. The baseline's `kick.level 0.6` matches the break's broadband drop
  (−4.4 dB) but not its tone.
- The build's `master.hp.cutoff` ramp (24 → 180 Hz) would cut the drone, which the reference keeps at full level
  through the build (−24 dB at 25–45 Hz in bars 24–39).
- The drone is 8.6 cents sharp in V2 (34.648 Hz).
- The drone's 2nd harmonic is 0.15 (−16.5 dB) against the reference's −20 dB.

### 7.2 Proposals for `GUIDANCE_V3` (song.js) and synths.js

Engine names and ranges are taken from `synths.js` and `processors.js` as read.

**Kick, existing parameters.** `kick.params = { tune: 53, punch: 265, tau: 0.022, hold: 0.066, decay: 0.45, click: 0.05,
drive: 0.15 }`.
- `tune` 53: between the 10–150 ms fit (52.0) and the model fit (55.1), so it is estimated. The kick tune does change
  from the baseline's 44; V2's 51 was close.
- `click` 0.05 and `drive` 0.15 are estimated starting points. Tune them by measuring:
  - 1–2.5 kHz per-hit peak 25 dB below the 150–300 Hz peak, down 10 dB within 2 ms;
  - 0–12 ms spectrum re 250 Hz at 1 / 2.5 / 4 kHz: −35 / −40 / −47 dB;
  - 3rd harmonic in the plateau −29 dB.

**Kick, new parameters (synths.js changes, proposed, each with its default leaving the current sound unchanged).**
- `attack` (s, default 0.0015) and `swell` (dB, default 0): the level jumps to −swell dB in 1.5 ms and then rises
  linearly to full at `attack`. Reference: attack 0.035, swell 6 (model fit), then hold 0.032 and decay 0.45.
- `clickDecay` (s, default 0.012, the current hard-coded value): reference 0.0015. The knock's 0.022 s decay should
  scale with it.
- `harmonic` (default 0): a 2f sine riding the same pitch curve and envelope. Reference 0.06 (−24 dB), estimated. Use it
  in place of more drive, because the reference's distortion is even-order.
- `length` (s, default 0 = off): a 3 ms fade at that time. Reference 0.197 (low priority; it only matters below −26 dB).

**Kick level and the master (coordinate with E5 and A8).** Set the kick's gain so that the master limiter takes no more
than about 2 dB off kick peaks, and raise the limiter ceiling towards the reference's −0.3 dBTP. Without this, none of
the envelope parameters above shows up in a render. Check in a solo render: the raw peak per 10 ms must fall from 70 ms
on, reaching −20 dB re peak at about 160 ms.

**Kick low cut.** Add an insert to the kick chain: `{ type: 'eq3', name: 'lc', low: 0, lowFreq: 90 }`. A lowshelf at
90 Hz, −9 dB, fits the break's measured cut within 0.7 dB from 50 to 150 Hz: model −8.1, −7.4, −5.5, −3.6, −2.3,
−1.2 dB at 50, 60, 80, 100, 120, 150 Hz, against measured −8.8, −7.2, −6.0, −3.5, −2.2, −1.5.
- build: `ramp: [{ param: 'kick.lc.low', from: -2, to: -7, curve: 'lin' }]`. Measured −2.5 dB at 50–80 Hz in bars
  24–26, −4.5 in 30–32, −6.5 in 36–40.
- break, breakLate and breakEnd: `set: { 'kick.lc.low': -9 }`, which replaces `'kick.level': 0.6`.
- mainA and mainB: `set: { 'kick.lc.low': 0 }`.
- intro: `kick.level` +0.5 dB against main (measured −6.6 against −7.0 to −7.3 dBFS), optional.
- Remove or cap the build's `master.hp.cutoff` ramp at about 30 Hz, so the drone survives the build.

**Sub drone, existing parameters.** `sub.params = { mode: 'drone', attack: 0.005, release: 0.03, harmonic: 0.1, glide: 0 }`.
- `harmonic` 0.1 gives −20 dB.
- Gain about 18 dB below V2: `sub.gain` 0.55 → about 0.07 (estimated; the limiter interacts). Target: 25–45 Hz on the
  third 16th of each beat sits 15 dB below the kick step's 45–80 Hz, and the drone's plateau amplitude sits 20 dB under
  the kick peak.

**Sub drone, note.** Keep C#1, but the reference is 8.6 cents flat (34.475 Hz). The sub should not be a different note.
- B0 is not a note in the reference; drop the A7 TODO.
- B1 (baseline) is wrong: it lands inside the kick's band at 61.7 Hz.
- No per-bar note list is needed.
- If the song's other tracks are tuned to A440, a `detune: -9` cents (new) or `fine` parameter matches it. Ask E2 whether
  the mids are flat too.

**Sub drone, the pulse (synths.js change).** In drone mode, add `beat` (Hz, default 0) and `beatLevel` (dB, default
−inf): a second sine at f − `beat`. Optionally add a third at f − 3·`beat` (`beat3Level`). Reference:
- `beat` 1.2027, `beatLevel` −2.6;
- third line at f − 3.608 Hz (30.866), −5.8 dB, phase −126° re carrier, set through its start offset.

The two-line version gives a 15.7 dB pulse and the three-line version 18.7 dB (reference 20.3). Equivalent, and more
general: a `partials` list of [Hz offset, dB] pairs.

**Sub drone, retrigger (synths.js change).** The drone restarts every bar today, one trigger per bar with gate 16, and
that would reset the pulse's phase each bar. The reference pulse free-runs. Proposed: drone mode keeps one running voice
across triggers; a new trigger only changes pitch (with `glide`) or level, and `panic()` or a section mute stops it.
Simpler alternative: one hit per section with a gate as long as the section (a section-length note).

**Sidechain on the sub.** `sub.sidechain = { depth: 0.78, attack: 0.01, hold: 0.08, release: 0.12, curve: 'db' }`.
Keep `sub` in `kick.duck`.

**Drone arrangement.** The level automates on `sub.level`:
- full through intro, intro2, build and mainA;
- mainA2: hold until bar 90, then fade to off over bars 91–103 (ramp `sub.level` 1 → 0.03 over the last 13 bars);
- break and breakLate: off;
- breakEnd (bars 128–135): ramp 0.03 → 1 over bars 130–134 (bar 134 measured 0.5 dB above full, bar 135 −3 dB: a
  small dip before mainB, estimated as noise);
- mainB and outro: full until bar 199.

**What the intro's low end should contain:** the kick at main level +0.5 dB and the full drone from bar 0 (ducked and
pulsing), and nothing else below 150 Hz. Between kicks, 80–150 Hz is −26 dBFS, i.e. 16 dB under the kick step. The
baseline intro's B2 bass (−13.8 dBFS at 80–150 Hz on step 3) is 12 dB more than anything the reference has there. That
is E2's call, but from the low-end side there is no bass in the reference intro.

### 7.3 Not verified

- None of the proposals was rendered; the kick checks are a numpy model of the engine's kick without the master chain.
- Assumed: Web Audio's lowshelf follows the cookbook with S = 1; this was not checked in the engine.
- Estimated: the drone's mechanism and the 3rd-harmonic level.
- Unmeasured: the break's 4-dB question at bar 120 shows nothing in the low end. The kick stays at −11.5 dBFS from bar
  104 to 134 and the drone is absent throughout, so bar 120 is not a low-end event.

## 8. Notes for round 2

- **E3:** the click claim is disputed in part. The kick sample is identical in the intro and mainA: the low-band
  envelopes agree within about 0.5 dB and the glide fits within 0.1 Hz. In the intro its click is a 1–2 ms transient
  (1–2.5 kHz −29 dBFS, gone in 2 ms). The on-beat broadband content in mainA is something else: about −30 dBFS flat from
  1 to 16 kHz, about 10 dB down (−40 to −41 dBFS) by 100–110 ms, so it matches E3's "peaks at 6 ms, gone by 100 ms".
  It grows from bar 24 (1–2.5 kHz at beat: −36 dBFS) to bar 40 (−31) and is steady after that; intro bars 0–23 read
  −36 to −42. It is either a top layer added to the kick from the build on, or a separate on-beat hat or tick; it is
  E3's to name. Either way, the app's kick should keep only the 2 ms click. E3's app deltas (+14 dB at 1–2.5 kHz) agree
  with mine against mainA (+10 to +12 dB) and understate them against the intro (+20 dB).
- **E2:** the 59 Hz is the kick; the 124 Hz in the reference break and mainB is beat-locked and plays on step 11; the
  155.8 Hz line is sustained. No reference bass appears below 150 Hz in the intro.
- **E5:** the master limiter's ceiling is below the reference kick peak and flattens the kick for 140–230 ms. The
  render latency is 16.4 ms.
