# O1: round 4 — the reference as measured, what to change, the pipeline, corrections
Agent model: Opus. Date: 2026-10-23.

**What I read and ran**
- I read all ten round-3 files (H1–H5, S1–S5) and O2's `round2-O2.md`.
- No web searches.
- New this round: seven more numpy measurements of the reference MP3, labelled R1–R7 in section 5, alongside my round-2 M0–M9. The method and caveats are given with each. The scripts are in the session scratchpad: `r4_sub.py`, `r4_misc.py`, `r4_sec.py`, `r4_more.py`.

**The owner's direction change** came in while I was writing: Havantechno becomes a Mac/PC desktop DAW. It affects section 3, which addresses it.

**Notation.** Bar numbers are 0-based on the corrected grid: T0 = 0.568 s, 126 BPM, 1 bar = 1.9048 s. "Steps" are 0-based 16ths.

---

## 1. The reference, as now measured

This replaces the analysis table in `docs/superpowers/specs/2026-10-21-guidance-studio-design.md`.

Confidence levels:
- **High**: many hits averaged, robust method.
- **Medium**: method sound but band- or window-limited.
- **Low**: tentative or confounded.
- **Unmeasured**: nobody measured it.

| Element | Measured values | Method | Confidence |
|---|---|---|---|
| **Grid and length** | 126.0 BPM, straight; one beat is exactly 21,000 samples at 44.1 kHz; first kick onset 0.568 s (11–13 ms before the spec's 0.58 s), no drift through bar 195. 200 bars of content, then a 6 s tail; file 387.95 s. Swing: none detected (the studio's 0.06 is about 2.4 ms). | Onset threshold in 0.5 ms bins at every 4th bar (M0) | High |
| **Form** | Section starts: bar 24 (46.3 s), 40 (76.8 s), 104 (198.7 s), 120 (229.1 s, highs drop 4–8 dB inside the break), 136 (259.6 s), 184 (351.0 s). Content ends at bar 200 (381.5 s). These match `song.js`'s bar counts (24/40/104/136/184/200) but **not** the spec's clock times: 0:44 and 3:16 are 2–3 s early, as S5 noted. No band step at bar 72 (mainA/mainA2). The intro has a one-bar high-band event (+6 to +9 dB at 2–16 kHz) in bars 3, 7 and 11. | Bar-level band-energy novelty, 6 bands (R5) | Medium-high for the boundaries; the meaning of bar 120 and of the intro events is unmeasured |
| **Kick** | Pitch f(t) ≈ 51 + 213·e^(−t/24 ms) Hz: 184 Hz at 10 ms, 119 at 25, 76 at 50, 61 at 75, 58 at 100, 52 at 150, about 44 Hz by 180 ms. Body below 250 Hz: −4.8 dB at 5 ms, peak near 40 ms (within 1 dB from 20 to 60 ms), −6.3 dB at 100 ms, −17.8 at 150, −33.6 at 200. Click: energy above 2 kHz in the first 20 ms is −45 dB relative to the body. 50–150 Hz is about 4 dB louder in the mains than in the build, and about 4.5 dB lower in the break. Same shape in every section. | Grid-synchronous average of 84+ beats, zero-crossing frequency, band envelopes (M1, M2, R5) | High. The first 10 ms is extrapolated (H1's attack-jump question is open). |
| **Sub** | **A free-running drone, not a pluck.** Coherence across beats 0.03. Carrier 34.47 Hz (C#1 −9 cents) in every section; per bar, B0 (31.0 Hz) in 1 bar of 8 and 33.3 Hz in some intro bars. **Ducked on every kick:** relative to its 300–450 ms plateau it reads −1 dB at 0 ms, −4 at 10, −7 at 20, −15 at 40–60, −12 to −13 at 80–120, −8.6 at 160, −2.5 at 200, −1.5 at 240–280, 0 by about 320 ms (mainA; intro and mainB within 1 dB). In the break it is 10 dB quieter with a −10 dB duck. It fades back in over bars 129–135 (−38 to −25 dB band level) before the drop. The spec's "plucked B1 sine, peak at 35 ms" has no counterpart. | 22–50 Hz band, kick template subtracted per beat, 5 ms smoothing (M4, M6, R1). The zero-phase filter smears about ±30 ms, so the attack figure is an upper bound. | High for existence and pitch; medium for the duck shape |
| **Mid bass** | Rhythm: steps 3, 7, 10, 14 (spec; not re-measured). Pitch **unmeasured**: the M5 partials (about 77, 98, 109, 133–138, 162, 181–186 Hz) are not a B2 series, but note names are tentative. In the intro, 300 Hz–1 kHz relative to 20–300 Hz is −18.7 to −21.8 dB in bass-step windows, against −26.0 dB at the non-bass step 1. That is the bass's mid target in context. | Spectra in kick-clean windows (step start −12 ms to +98 ms for steps 3 and 7; to +213 ms for steps 10 and 14), summed over 20 intro bars (M5, R2) | Low for pitch; medium for the band ratio |
| **Stabs** | Rhythm: steps 2, 6, 7, 10, 14, 15 (spec). Chords **unmeasured**: Bmaj9/G#m7/Emaj7 was a guess. H3's C#m9/C#m11 hypothesis fits the C# drone and the lead notes. L/R correlation in 300 Hz–2 kHz at stab steps in mainA: 0.47–0.60 at 0–30 ms, 0.29–0.46 at 60–115 ms. **Confounded:** the open and closed hats fall on the same steps (H4). | Per-step band correlation (M7) | Low |
| **Clap** | Beats 2 and 4, centroid about 2.7 kHz (spec). In 1–4 kHz at the clap steps (mainA, mainB): −2 dB at 30–60 ms, −6 at 60–100, −10 to −10.5 at 100–150, then a tail at about −10 dB through 150–230 ms. That tail is 8 dB above the same windows at kick-only steps. L/R correlation is 0.75 at the onset and 0.32–0.40 in the tail. **A wide tail suggests a send reverb rather than a mono in-voice tail** (S2's test). RT60 unmeasured. | Band energy and correlation by window, compared with steps 0 and 8 (R4) | Medium |
| **Hats** | Open hats on steps 2, 6, 10, 14 and closed pickups on 7 and 15 (spec). At the hat steps in the build and mains, 9–16 kHz is only 3.5–4.3 dB below 4–9 kHz, so they are full-band. That argues against a raw 6-bit, 18 kHz-sampled hat (H4's test). **The spec's "1.5 kHz ring" is not tied to the hats:** the 1.4–1.6 kHz share of 1–4 kHz is the same at hat and non-hat steps (within 0.3 to 1.6 dB) in intro, build and mainA. Faint hats are present in the intro, about 14 dB above the floor between steps in 4–16 kHz; the studio intro has none. Choke: unmeasured. | Per-step band ratios (R3) | Medium |
| **Shaker** | Unmeasured. | — | — |
| **Perc** | Unmeasured. | — | — |
| **Lead** | Note set F#4 G#4 C#5 D#5 (spec contour). Melody, timbre, bends and sends unmeasured. | — | Low |
| **Pad** | Unmeasured. | — | — |
| **Riser** | No distinct noise riser identified. The 0.5–16 kHz centroid rises over the last 4 bars of the build (about 2.6 → 3.6–4.1 kHz, bars 36–39). Before the drop it rises over bars 126–135 (about 1.1 → 2.3 kHz), together with the sub fading back in. | Per-bar spectral centroid (R6) | Low |
| **Impact** | None detected as a separate event. At bars 40 and 136 the 50–150 Hz band steps up about 4 dB, which is a kick-level change. | R5 | Low |
| **Delay** | No ping-pong alternation in the 300 Hz–3 kHz L/R balance per step. Steps where a 3/16 echo would land (5, 9, 13) are 1–3 dB above the non-landing steps 11 and 15, but clap tails confound 5 and 13. End tail −9.4 dB/s. The delay time is unmeasured; 3/16 stays an assumption (S2). | R7, M8 | Low |
| **Master** | Integrated −10.7 LUFS; max short-term −9.5; sample peak −0.18 dBFS; true peak +0.01 dBTP (4×). Per section, integrated loudness / true peak / PLR: intro −10.6 / −0.49 / 10.1; build −12.1 / −0.51 / 11.6; mainA −10.2 / −0.03 / 10.2; mainA2 −10.3 / −0.23 / 10.1; break −12.5 / −0.38 / 12.1; mainB −9.9 / +0.01 / 9.9; outro −10.4 / −0.29 / 10.1. Crest 10.6–14 dB. Full-mix L/R correlation 0.93–0.96 in the mains, 0.85 in the break; by band in mainA: 1.00 below 150 Hz, 0.80 for 150 Hz–1 kHz, 0.65 for 1–4 kHz, 0.84 above 4 kHz. The 300 Hz–3 kHz band leans slightly right (balance −0.02 to −0.16). Band ratios relative to 20–300 Hz are in the table below. | BS.1770-4 K-weighting at 48 kHz with gating; 4× oversampled peak (M7, M9, R5, R7) | High, except true peak on an MP3 decode (S4: the codec may add peak) |

Band energy relative to 20–300 Hz, per section (M9, carried forward unchanged):

| Section | 300 Hz–1 kHz (dB) | 1–4 kHz (dB) | 4–16 kHz (dB) |
|---|---|---|---|
| intro | −24.3 | −30.2 | −45.5 |
| build | −14.0 | −21.5 | −20.7 |
| mainA | −14.7 | −19.8 | −17.7 |
| mainA2 | −13.7 | −19.8 | −18.2 |
| break | −8.5 | −16.4 | −21.0 |
| mainB | −11.2 | −19.2 | −17.7 |
| outro | −14.3 | −24.2 | −30.6 |

**Rows the spec should drop or change:**
- "sweep 130→43 Hz in 60 ms": replace with the kick row above.
- "sub: plucked sine on B1, peak 35 ms, ~300 ms decay": replace with the sub row above.
- "click on top": no click, about −45 dB.
- "bass root B1 throughout": the low root is about 34.5 Hz (C#1), with B0 in 1 bar of 8.
- "open hat metallic ring ~1.5 kHz": not a hat property.
- The form clock times: use the bar numbers above.

---

## 2. Element by element: what to change in the recreation

"Agreed" means the round-3 agents named in brackets support it and no agent disputes it. "Contested" names the disagreement. All changes go in a new folder; `olde Havantechno dub studio/` is frozen (H3, H5).

**Kick**
- **Agreed:**
  - Replace the ramp with an exponential approach: start about 264 Hz, `setTargetAtTime(51, t, 0.024)`. That means a new `tau` parameter replacing `sweep` (O1, H1; S5's bundle carries `pitch_env {f0, fT, tau_ms}`).
  - Set click to 0 for this preset (O1, H1).
  - Add an explicit hold-then-decay amplitude envelope: about 60 ms near full level, −6 dB at 100 ms, −18 at 150, −34 at 200 (O1, H1, S3, S4).
  - Set the master limiter only after this fix (S4).
- **Contested or open:**
  - How far to lower `drive` once the hold exists. The drive currently supplies the hold shape (O1 M2) and part of the low-mid. H1 and S3 ask for a drive-0 vs drive-0.45 render.
  - Whether a separate attack frequency jump exists in the first 10 ms (H1).

**Sub**
- **Agreed:**
  - Replace the B1 pluck with a continuous sine drone.
  - Notes per bar: 34.47 Hz (C#1), with B0 in 1 bar of 8, carried as a per-bar note list.
  - Keep the drone a separate track from the kick (H1, S1).
  - Put it in the `duck` list (H1, S1, O1).
  - Fix the ducker's retrigger step (S1: a downward step on a 34 Hz drone clicks).
- **Contested: the duck shape.**
  - S1's fit to my coarse round-2 points: trough at about 5 ms, then a dB-linear release reaching 0 dB at 275 ms.
  - My finer fold (R1): the trough is −15 dB at 40–60 ms, held at −12 dB to about 120 ms, then recovering to −2.5 dB at 200 ms.
  - That shape tracks the kick body (full level to 60 ms, −18 dB at 150 ms). It suggests a compressor keyed by the kick, or a ducker with about 80 ms of hold, rather than a fast trough and long release.
  - Interim proposal for the existing four parameters: depth about 0.82 (−15 dB), attack 0.02–0.04 s (an upper bound because of filter smear), hold about 0.08 s, release about 0.12 s.
  - S1's compressor-vs-shape test (two close kicks) is still needed.
  - In the break: depth about 0.68 (−10 dB) and level −10 dB.

**Mid bass**
- **Agreed:**
  - The bass voice is the first studio element to fix for the 300 Hz–1 kHz excess, at the source and not with master EQ (S3, H2, O1, O2).
  - Reduce the filter envelope (300 → 0–150 Hz) and remove the post-filter drive, or move it before the filter (S3's simulation; H2's drive-placement finding).
  - Target −19 to −22 dB in the intro bass-step windows (R2).
  - Add a `keytrack` parameter if the bass turns out to play several pitches (S3).
  - Open303's MIT four-pole filter is the permissive model for a ladder option (H2).
- **Contested:**
  - **Slope.** H2's steady-state model gives about 9 dB from 24 dB/oct. S3's fuller simulation (envelope, eq3 insert, amp envelope) shows a naive same-resonance cascade makes it 4.4 dB *worse*, and a split-resonance cascade gains only 2.7 dB. I side with S3 on order of work (envelope and drive first, slope third) because its model includes more of the real voice. Keep a `slope` option either way.
  - **Pitch.** It is unmeasured, so B2 stays a placeholder.

**Stabs**
- **Agreed:**
  - Studio pan spread alone cannot give onset decorrelation, because the saws start in phase (H3, S4 derivations).
  - A decorrelator on a near-mono voice is needed. H3's model puts a Juno-style stereo chorus (3.5 ms base, ±1.85 ms, 0.51 Hz, right channel inverted) in the measured onset range.
  - The studio chorus needs a `base` delay parameter (its 14/21 ms are too long) and an `invert` option (H3, S4).
  - The delay cannot affect the 60–115 ms window (H3, S2, S4).
  - Keep the chord root above about 200 Hz (H3).
- **Contested or open:**
  - S4 prefers spread about 0.73 plus a chorus mix of 0.5–0.55; H3 prefers a mono voice plus a chorus at wet 1.0–1.2.
  - Is the reference stab width real or inflated by hat coincidence? (H4's confound.)
  - Chord identity: Bmaj9 vs C#m9/C#m11. P6 decides.
  - Voice-level vs bus chorus placement (H3's question): unknown.

**Clap**
- **Agreed:** the studio double-counts the tail (in-voice tail 0.3 plus reverb send 0.25) (S2).
- **New evidence (R4):** the reference tail is wide (correlation 0.32–0.40), so keep the send and lower the in-voice tail.
- **Agreed:** the master limiter's release interacts with the flams on beats 2 and 4 (H4); test after the kick fix.
- **Open:** RT60.

**Hats**
- **Agreed:**
  - Make the metal path's highpass (`hp2`) a parameter with a lower default rather than deleting it (H4).
  - Add a choke rule: a closed-hat onset steals the open-hat voice (H4, S4). The release in ms is not found; 5 ms is H4's untested choice.
- **New:**
  - Since the reference shows no hat-tied 1.5 kHz ring (R3), the "ring" retune is not needed. The metal bank can be tuned by ear.
  - The intro needs faint hats (R3).
- **Contested:** width per hit (H4) vs master band width (S4). H4's reason, that a master band split would widen the clap body, is sound. Prefer per-track width.

**Shaker and perc**
- No agreed change. Candidate decays (shaker 150–200 ms) and the 808 cowbell model are H4's leads, unmeasured against the reference.

**Lead**
- **Agreed:**
  - A `bend` input is a real gap in the in-house synths (H5, S5).
  - Transcribe with a monophonic tracker on a band-limited region and check against the spec's note set (H5, S5).
  - Basic Pitch's 127.7 ms minimum note length drops 16ths unless lowered (S5).

**Pad**
- **Agreed:** do not add a chorus before measuring. The reverb IR is already decorrelated (S2). No other change.

**Riser and impact**
- **New (R6):** the reference's transitions are a centroid rise of the whole mix plus the drone fading in, not an obvious noise riser or sub boom.
- Recommendation: before tuning the `riser` and `impact` synths, check by listening whether they belong in the recreation at all. Express the transition as `master.lp`/`hp` and level ramps first.

**Delay**
- **Agreed:**
  - Move the tone and hp filters inside the feedback loop behind a `loop` switch that defaults to today's behaviour (S2, H3; confirmed in code).
  - Do not raise feedback to chase the end tail (S2).
- **Open:** delay time, and whether the stabs have a delay at all (R7 inconclusive).

**Reverb**
- **Agreed:**
  - A native-node Freeverb with RT60 as an automatable parameter. About 80 nodes; no new `selfcheck.js` stub (S2).
  - Seed the generated IR so offline renders are repeatable (S2; this matters for scoring).
  - An exponential IR envelope instead of the polynomial one (S2).
- **Open:** one reverb, or a short and a long one (S2).

**Widener and master**
- **Agreed:**
  - A band-limited widener (`monoBelow`, about 150 Hz) with Q handled in dB (S4, H3).
  - A meter device for LUFS, true peak and per-band correlation before limiter work (S4, O2).
  - Two limiter profiles: fitting (−10.7 LUFS, sample peak about −0.2 dBFS) and release (−1 dBTP) (S4).
  - A limiter input-gain parameter (S4).
  - A glue detector high-pass, and a keyed worklet compressor with the parameter table S1 wrote (S1, H1).
- **Settled fact:** `BiquadFilterNode` lowpass and highpass `Q` is in dB (O2 from the spec, S3 from MDN).

**Arrangement**
- Section bar counts already match the reference (R5).
- **Change:**
  - Move the break's internal change to bar 120 (song.js has breakEnd at 128; the highs drop at 120).
  - Fade the drone in over bars 129–135.
  - Add the intro's one-bar high-band events in bars 3, 7 and 11.
  - Raise the kick by about 4 dB at the start of the mains (bar 40) relative to the build.

---

## 3. The pipeline (revised for a desktop DAW)

The owner now wants a Mac/PC desktop DAW. That removes the browser boundary which shaped rounds 1–3:
- no COOP/COEP;
- no 172 MB in-page model download;
- no "no audio files" rule by necessity (that stays an owner choice);
- no worklet-vs-native-node question.

The stages stay the same.

**Stage A — grid, key, sections: automatable today.**
- Grid fit from kick onsets (M0) and section boundaries from bar-level band novelty (R5, which recovered every `song.js` boundary except mainA/mainA2).
- Key from chroma plus the drone root per bar.
- The human checks the result. It is not tuned.

**Stage B — stems: automatable, with a split rule.**
- **Grid-synchronous folding first** (S5 and O1 agree). It splits the phase-locked one-shots (kick) from free-running synths (drone) with no model and no licence. It works whenever the fold's coherence ratio is high; the pipeline should report that ratio.
- Then Demucs for the rest. In a desktop app it runs natively (Python sidecar or an ONNX runtime), so it is minutes of CPU, not the 22–65 minutes S5 estimated for demucs-web.
- Drum transcription (ADTOF, drum2midi), which had no browser build, becomes available inside the app.
- Licence traps remain: madmom models and LarsNet weights are non-commercial (S5).

**Stage C — events and notes: mostly automatable.**
- Grid-quantised drum classes (S5's per-step energy table plus ADTOF as a cross-check).
- Drone pitch per bar from long-window FFT on the folded residual.
- Bass and lead with pyin or Basic Pitch at `midi_tempo` = 126 and a lowered minimum note length.
- Chords by template matching per stab onset (own code; no verified tool names extended chords).
- **Hand-checked:** chord names, velocities (Basic Pitch's velocity is model confidence, not loudness, per S5), and the choke.

**Stage D — patch parameters: automatable for our own synths; harder for hosted plugins.**
- **Own synths:** gradient-free search over 4–12 parameters with offline renders, pitch fixed from Stage C. This is still the most practical path (round 1, ST-ITO-style search). A desktop engine renders faster and can run renders in parallel. Render speed has not been measured, so I give no number.
- **Hosted plugins:** see the extended rule below.

**Stage E — automation: semi-automatable.**
- Per-bar centroid and band ratios give filter and level ramps (S3's −3 dB-crossing method, R6). S3's residual test decides whether section `ramp`s are enough or per-point lanes are needed.

**Stage F — mix: semi-automatable.**
- Ducking (R1 fold, then fit), loudness and true peak (M9 and per section), width profile (S4's nine-band procedure).
- Reverb and delay times are still unmeasured. S2's methods A and B, and the clap tail (R4), are the routes.

**Stage G — score and iterate: automatable once a render exists.**
- The same scripts on the render and the reference, per section and per step.
- S3 adds a second score (absolute 300 Hz–1 kHz after loudness normalisation), so a changed low end cannot pass the ratio test by moving the denominator.
- **Hand-tuned:** final listening, "does a darker bass still pluck" (S3), and whether the riser and impact belong.

**What the desktop move changes in automation, concretely:**
1. Stages A–C become one in-app action rather than "offline Python, then import a bundle". S5's bundle format is still the right internal contract between analysis and arrangement.
2. The render-and-score loop (P1) no longer needs Playwright. The engine can render offline headlessly, so threshold calibration becomes possible. It is blocked today only because nothing renders the studio outside a browser.
3. Hosting real plugins (VST3, whose SDK is MIT from 3.8 per O2; AU; CLAP) brings parameter estimation against third-party synths into scope.

**Extended load/modify/create rule.** The round-1 definitions stand: score S = d(best render, reference events) / N, where N is the spread among repeated reference hits. The steps, cheapest first:

0. **Calibrate.** Score the current in-house synths against the reference (P1) to set the thresholds.
1. **Load own.** Fit our in-house synth: few parameters, fully editable, no licence. Accept if S ≤ T1.
2. **Load hosted.** Fit a hosted plugin.
   - Start from the nearest factory or user preset by feature distance (preset retrieval).
   - Search only a hand-picked subset of 5–15 parameters per plugin (oscillator shape, filter cutoff/resonance/envelope, amp envelope, drive). A whole-plugin search is not practical: Yee-King et al. reported close matches in 25% of Dexed cases, DeepDIVA judged its Diva matching too limited, and Synplant 2 and Syntheon each work for one engine only (round 1 sources).
   - Measure N on the plugin itself as well: analog-drift or random-phase plugins add their own run-to-run spread, which must be fixed by seed or measured.
   - Accept if S ≤ T1.
3. **Modify.**
   - For our own synths: add 1–2 modules, as in round 1.
   - For a hosted plugin, its DSP is closed, so "modify" means wrapping it: our filter, drive, envelope or width stage after the plugin, fitted jointly.
   - Accept if S ≤ T1.
4. **Create.** A new in-house synth or device (a Faust or JUCE device is now an ordinary option). Or, if the owner relaxes the audio-file rule, which a desktop app makes natural, a sample device fed with the cleanest folded one-shot. The kick template from Stage B is exactly that one-shot.
5. **Tie-breakers.** Prefer own over hosted when scores are within the noise: editable, scriptable, no licence, deterministic. Prefer hosted when the residual is structural for our synths (FM, wavetable, inharmonic) and a hosted engine already has that structure.

**Thresholds: still placeholders.** T1 = 1.5 and T2 = 3 were never calibrated, because no studio render has been scored (P1). My one calibration-like datum: the studio kick's amplitude envelope already matches the reference within about 2–4 dB at 100–200 ms (M2), while its pitch misses by 8–16 Hz from 75 ms on. A per-feature breakdown of S is therefore needed, not only the total.

---

## 4. What I was wrong about

1. **The "35 ms sub peak is the kick's own glide" reading (round 1).** Half right.
   - What I got wrong: in round 1 I said a swept kick's 30–80 Hz energy peaks at about 41–46 ms. That was my simulation of the *studio* kick (190→44 Hz over 70 ms). The *reference* kick peaks in that band at 70 ms (coherent) and 83 ms (incoherent) (M3), because its glide is slower. So neither kick reproduces the spec's 35 ms, and my explanation of that number was wrong.
   - What stands: that energy is the kick and not a B1 pluck. The real sub is a separate drone.
   - O2 then quoted 41–46 ms as if it described the reference, and H1 caught the conflation in round 3. The figure belongs to the studio simulation only.
2. **"The kick ends at 43–44 Hz, a tritone off B" (round 1).** The reference tail sits at 61–52 Hz through the loud part and reaches about 44 Hz only after 170 ms. Superseded in round 2.
3. **"The hat's `hp2` removes the 1.5 kHz ring" (round 1).** H4 is right that it attenuates by about 15 dB (a Butterworth estimate; Q is in dB), it does not remove. And R3 shows the reference has no hat-tied ring at all, so the point mattered less than I said.
4. **"The mid bass is the prime suspect, mainly through its 12 dB/oct slope" (rounds 1–2).**
   - The bass as first suspect survives: S3's intro budget, and R2 shows bass steps raise the intro's mid ratio from −26 to about −19 to −22 dB.
   - The mechanism I named was wrong. S3's simulation puts the filter envelope and the post-filter drive ahead of slope, and shows a naive 24 dB cascade making it worse.
5. **"Stab width is about 0.5 at the onset" (round 2, M7).** Stated without the confound H4 found: every stab step I used coincides with a hat step. The figure is "the mix at stab steps", not the stab.
6. **H2's critique of M5 is half right.** My 110 ms windows for steps 3 and 7 ended 9 ms before the next kick onset, so they were kick-clean. The 225 ms windows were used only on steps 10 and 14, which are also clean. I did not state the windows clearly in round 2, which invited the doubt. H2 is right that stab steps 7, 10 and 14 can carry stab sustain. In the reference intro, stab presence is unmeasured.
7. **"Sub ducks −13, −7, −2, −2 dB" (round 2, M4) was too coarse to fit.** It also mixed kick-tail energy into the 22–50 Hz band (H1). The finer, template-subtracted fold (R1) shows a later, held trough. S1's fit was correct for my four numbers, but those numbers misled it.
8. **"P3 (riser) needs the render pipeline"** (H5's reading of my round 2). It is a reference-only measurement. I should have run it in round 2. Now done (R6).
9. **Round-1 pipeline framing.** I treated "browser or offline Python" as the boundary. With the desktop direction, that boundary and the C1/C2 caveats I attached to the sample fallback no longer apply.

---

## 5. Measurements: run this round, and still worth running

**Run this round** (numpy and scipy on the 44.1 kHz decode; grid T0 = 0.568 s):

- **R1, drone duck (S1, H1).** 22–50 Hz zero-phase band, cut per beat from the kick onset. The coherent kick template (mean over beats) is subtracted. Then the incoherent power is averaged and smoothed at 5 ms. Results are in the sub row of section 1. The coherent (kick) share of band power is 0.17–0.18 in the mains and 0.59 in the break.
- **R2, bass-step band ratio (S3).** Summed power spectra over 20 intro bars. The 300 Hz–1 kHz vs 20–300 Hz ratio at steps 3, 7, 10 and 14 is −18.7, −20.2, −21.8 and −19.2 dB, against −26.0 dB at step 1 and −20.6 at step 11, the bass tail. In mainA the same windows read −2 to −12 dB because stabs and hats are present, so use the intro.
- **R3, hat high band and ring (H4, P4).** 9–16 kHz relative to 4–9 kHz, 0–100 ms after the hat steps: −3.4 to −4.3 dB in the build and mainA. The 1.4–1.6 kHz share of 1–4 kHz, 20–200 ms after a step, is no larger at the open-hat steps than at steps 1, 3 and 5 beyond 0.3–1.6 dB.
- **R4, clap tail (S2 Q9, P2).** Covered in the clap row. A Schroeder RT60 was not attempted, because the next event arrives at 238 ms.
- **R5, sections and per-section loudness (S5, S4).** Covered in the form and master rows.
- **R6, riser centroid (P3, H5).** Covered in the riser row.
- **R7, ping-pong test (S2 method B).** The 300 Hz–3 kHz (L−R)/(L+R) per step in mainA is −0.02 to −0.16 at every step, with no alternation. Level per step is in the delay row.

**Still worth running, short list:**
1. **P1, the render-and-score pass.** Run every M and R script on a studio render. It needs an offline render outside the browser, which the desktop build makes easy. Nothing in section 2 is confirmed until this runs.
2. **Kick-subtracted bass pitch (H2).** Long-window spectra at steps 3, 7, 10 and 14 after removing the folded kick template, in intro bars, to name the bass notes.
3. **P6, chord chroma per stab onset (H3).** After removing the kick template, test C#m9/C#m11 against Bmaj9.
4. **Duck after two close kicks (S1).** Find fill bars (if any) in the reference kick pattern and compare the drone duck after two kicks with the single-kick duck, to decide between a compressor and a fixed shape.
5. **First 10 ms of the kick at 0.5 ms resolution (H1).** Broadband instantaneous frequency on the coherent average. This settles the attack jump.
6. **Hat choke (H4).** Open-hat band level at closed-hat steps 7 and 15 against steps 3 and 11.
7. **Stab width without hats.** The break has no hats but has perc and shaker on the same steps (H4). So it first needs their step maps (shaker and perc are unmeasured), then S4's nine-band, onset/tail procedure.
8. **Delay, S2 method A on clean landing steps.** Needs the reference stab pattern confirmed per bar first.
9. **Clap RT60.** Use isolated claps at section ends (bar 199) or a break bar where no event follows within 300 ms, with Schroeder backward integration.

Caveats for everything above:
- The source is a 192 kbps MP3.
- Band filters smear time by roughly 1/bandwidth.
- Note names from windows shorter than 0.25 s are tentative.
