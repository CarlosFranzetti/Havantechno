# O1: round 2 — critique, cross-cutting findings, questions, measurements
Agent model: Opus. Date: 2026-10-23.

I read all eleven other round-1 files in full: H1–H5, S1–S5, and O2's `round1-O2-daw-possibilities.md`. I made **no web searches** this round. The new evidence here is my own measurements of the reference MP3, done with numpy and scipy. Section 5 gives the method and numbers for each. The scripts are in the session scratchpad, not the repo.

**The headline is that the reference's low end differs from both the spec and the studio.** Three findings:
1. **The kick.** It glides from about 190 Hz at 10 ms to about 52 Hz at 150 ms, approaching its target exponentially with a time constant of about 24 ms. The studio's kick reaches 44 Hz at 70 ms and stays there.
2. **The sub.** There is no plucked B1 sine. The energy the spec read as a "35 ms-delayed B1 sub" is the kick's own glide. A separate, *ducked* sub drone does exist, mostly at about 34.5 Hz (C#1), with B0 on some bars.
3. **The excess.** The spec's 300 Hz–1 kHz excess can now be checked against absolute reference numbers per section.

---

## 1. What the category reports confirm or contradict in my round 1

| # | My round-1 claim | Status after round 1 reports and my measurements |
|---|---|---|
| 1 | "The 35 ms sub peak may be the kick's own tail" | **Confirmed and sharpened by measurement (section 5, M1–M3).** The 30–80 Hz energy around each beat is phase-locked to the kick. It peaks 70–83 ms after onset, as the glide passes 60 Hz, and falls 33–35 dB by 200 ms. That holds in the intro, mainA, break and mainB. H1 found no product with a "35 ms delayed sub" feature ("Not found"), which fits: it is not a separate pluck. **New:** there *is* a separate sub, a non-phase-locked tone at about 34.5 Hz that ducks on every kick (M4). My round 1 did not anticipate it. |
| 2 | "44 Hz is about F1, a tritone off B; 43 Hz may be an artefact" | **Partly confirmed.** The reference tail reaches 44–45 Hz only at 170–180 ms, when the body is already 20–25 dB down. Through the loud part (75–150 ms) it sits at 61 → 52 Hz. The spec's "~43 Hz" is a late-tail reading. The studio kick is too low too early. H1 proposed retuning `punch` to 130, but the measurement says the start is higher: about 190 Hz at 10 ms, with 130 Hz reached at about 24 ms. H1 was working from defaults, not `song.js`, and said so. |
| 3 | "Kick drive 0.45 (tanh k = 19) adds about 18 dB of low-mid" | **Still true, but it has a purpose I missed.** I simulated the studio kick with the `song.js` values. The drive's flattening gives an amplitude envelope that closely matches the reference: −4.3 vs −6.3 dB at 100 ms, −17.3 vs −17.8 at 150 ms, −29.7 vs −33.6 at 200 ms (M2). So the right fix is an explicit hold-then-decay envelope plus less drive, not simply less drive. S3 independently noted that the shaper is symmetric and odd-harmonic only (verified in code). |
| 4 | "The mid bass is the prime suspect for the 300 Hz–1 kHz excess" | **Not contradicted, and weakened as a model.** H2 confirmed the `song.js` bass values (`sub: 0`, cutoff 220 + env 300). S3 listed the same candidates without measuring. **New:** the reference spectrum at the bass steps does not show a B2 harmonic series. Its partials sit near 98, 109, 133–138, 162, 181–186 and 228 Hz, over the 34 Hz sub (M5). The B2 choice was a band-energy tuning decision in the spec, never a pitch measurement. |
| 5 | "The open hat's 1.5 kHz ring is removed by `hp2`" | Not contradicted. H4 described the same code path (highpass at half the tone frequency) without flagging the conflict. S3 handed the Q 4 bandpass and the `hp2` setting back to filters. Still unrendered. Still open. |
| 6 | "Stab width: test onset vs tail correlation" | **Measured (M7).** In 300 Hz–2 kHz at the stab steps of mainA, the L/R correlation is 0.47–0.60 in the first 30 ms and 0.29–0.46 at 60–115 ms. The full-mix correlation is 0.93–0.96 in the main sections. So the spec's 0.41 is a mid-band figure, not a broadband one, as S4 suspected. Width exists at the onset (voice spread or chorus) and grows in the tail (delay or reverb). Steps without a stab are also wide in this band (0.1–0.5), so a wide ambient bed runs throughout. |
| 7 | "Quantise to the grid; transcription becomes classification" | **Supported.** S5's drum2midi and ADTOF output GM-mapped onsets. **New and stronger:** at 126 BPM and 44.1 kHz a beat is exactly 21,000 samples, so the grid is sample-exact (M0). *Grid-synchronous averaging* then separates phase-locked one-shots (kick, sample-based drums) from free-running synths (the sub drone gave a coherence ratio of 0.03). No separator S5 found outputs this split. |
| 8 | "No end-to-end song-to-patches system: not found" | **Confirmed by O2.** None of O2's verified sources describes a DAW that recovers synth patches, effect settings or automation from audio. |
| 9 | "Swing 0.06 is effectively straight" | Nobody else checked. It stands. |
| 10 | Recalled: TR-808 hats are six square oscillators; the 808 clap is noise bursts plus a tail | **Now verified by H4** (ICMC 2014 paper; firstpr.com.au guide; Cherry Audio docs excerpt). The 909 hat being sampled is **disputed** in H4's sources (Roland's press release vs Polynominal). |
| 11 | Recalled: `basic-pitch-ts` exists | **Verified by S5** (fetched, Apache 2.0, down-mixes to mono, resamples to 22,050 Hz). |
| 12 | Recalled: Web Audio biquad lowpass `Q` is in dB | Not checked by anyone. Still recalled only. |
| 13 | Recalled: 4-pole ladder basses | H2 reports the SH-101 has a 24 dB lowpass (search snippet only). |
| 14 | "Spec 'click on top'" | **Contradicted by measurement (M2).** Energy above 2 kHz in the first 20 ms is 45 dB below the kick body in the intro, and 30 dB below in mainA, where hats overlap. The reference kick has almost no click. |
| 15 | "Spec 'sub not sidechained' is a tuning decision" | **Reframed.** The reference's real sub (the 34 Hz drone) *is* ducked: −13 dB 40 ms after the kick, −7 dB on the next 16th, −2 dB by the 8th (M4). The spec's un-ducked B1 "sub" corresponds to nothing in the reference. |

---

## 2. Critique, agent by agent

**H1 (kick and sub).**
- **Strong:** honest about having no page fetches. A useful find in Werner, Abel and Smith's DAFx-14 808 model, which separates the sweep from an attack frequency jump.
- **Weak:** the retune advice ("punch about 130, harmonic 0, decay 0.3") rests on the spec's numbers and on code defaults, not on `song.js`, and my measurement overturns it: the start is higher, the tail sits at 50–60 Hz, and there is no B1 sub. Most product rows are excerpt-only, with no prices.
- **Missing for the whys:** pitch-envelope *shape*. The reference is an exponential approach to a target (in Web Audio terms `setTargetAtTime(51, t, 0.024)` from about 260 Hz), not a ramp to an end frequency. H1 should say which listed synths model that, and whether "kick plus long tail" is the genre norm.

**H2 (mid bass).**
- **Strong:** it read the actual `song.js` values and caught that `sub: 0` silences the square, which is a real finding. The licence labelling is careful, and GPL, AGPL and MIT are kept apart (Open303 MIT core vs jc303 GPL).
- **Weak:** the TAL-BassLine structure, Tone.js MonoSynth defaults and SH-101 specs are snippet-only. The "generic bass design" paragraph is not electro-specific, and H2 says so.
- **Missing:** any link between candidate synths and the measurable signature (harmonic ratios, filter-sweep rate). Now that the reference bass is not a clean B2 series, H2 should reason about which bass families produce partials near 98, 109, 136, 162 and 183 Hz over a 34 Hz root.

**H3 (stab and pad).**
- **Strong:** the best browser-native finds of the round: junox (AudioWorklet Juno-60, GPL-3.0) and the Juno-60 chorus analysis, with its two BBD lines, inverted LFO and stated rates. H3 also noticed the repo has no LICENSE file.
- **Weak:** Youth106's GPL vs "non-commercial" conflict is left open. Ultramaster KR-106 is snippet-only.
- **Missing:** what L/R correlation a Juno-style chorus produces on a saw chord, which would let the measured onset 0.5 / tail 0.3–0.45 be attributed. Also no view on chord identity, which matters more now that the sub is not a B pedal (M6).

**H4 (drums).**
- **Strong:** the circuit descriptions (808 six-oscillator bank, clap pulse cluster plus "reverb" pulse) are the most useful whys in the H reports. H4 also surfaced the 909 hat analog-vs-sample conflict.
- **Weak:** no page opened. The shaker and perc were not researched at all; the budget ran out.
- **Missing:** did not check the studio's own hat against its 808 description. `hp2` at 3.5 kHz kills a 1.5 kHz ring, and the code's ratios 0.62–1.73 are not the 808 frequencies (Cherry Audio's figure is roughly 200–800 Hz). The question "synthesised or sampled?" is the right one; section 4 assigns it.

**H5 (lead, FX, browser synths).**
- **Strong:** it states plainly that the spec has no riser or impact measurement, and that no source identifies the reference lead synth. FaustWasm is a good find, and Tone.js is verified MIT.
- **Weak:** the WAM catalogue claims are snippet-only (O2 later fetched the wam-community index, 58 entries). Surge and Vital rows are snippet-only.
- **Missing:** for fitting, what matters is whether an engine can be built on an `OfflineAudioContext` and set programmatically. That decides whether it can join the render-and-score loop. H5's question to me about "noise bandpass vs wavetable riser" can be settled by measuring the centroid curve over a build. That is proposal P3; it was not run.

**S1 (sidechain, compression).**
- **Strong:** thorough. It reads the studio ducker correctly (linear only, no offset, no velocity). The sndfilter / Chromium constants (6 ms pre-delay, four release zones) are the most concrete Web Audio fact in the round. It identifies the missing detector HPF on the glue.
- **Weak:** most prices are undated summaries. The Duck 2 features cannot be tied to a page.
- **Missing:** a measurement plan. S1 asked me for one, and M4 is a first answer: the sub drone's level by 16th is −13, −7, −2, −2 dB after each kick, which is a ducking curve to fit. S1 should translate that into attack, hold and release, and a curve shape.

**S2 (delay, reverb).**
- **Strong:** it caught that the studio's delay tone filters sit *outside* the feedback loop, so repeats never darken. That is a concrete, checkable code critique. It gives published algorithms with numbers: Freeverb line lengths, the Dattorro paper, Zita-Rev1 damping.
- **Weak:** no page opened. Clap-reverb practice is generic vocal advice.
- **Missing:** a way to measure delay and RT60 in *grid* music. A 3/16 echo is 3 steps, so it coincides with grid hits and plain autocorrelation cannot separate them. My test on the final tail (M8) found no clear 357 ms period. S2 should propose a method, for example tracking the ping-pong L/R alternation.

**S3 (saturation, EQ, filters).**
- **Strong:** the best framing of the 300 Hz–1 kHz problem. It warns that a master match-EQ hides which element is hot, and proposes an offline match script feeding `eq3`. It flags the WaveShaper's inability to do ADAA, with a source.
- **Weak:** Surge's licence is marked "not found", though H2, H3 and S4 fetched GPL-3.0. The Chow Tape licence is recalled.
- **Missing:** it asked whether band excess can be attributed to elements without stems. It can, partly. Measure band energy by *step position* across the grid, where each step has a known element set (the arrangement), and solve for per-element contributions (least squares). Step 3 (bass only) and step 1 (almost nothing) are the anchors. The reference band targets are now in M9.

**S4 (limiter, width, chorus).**
- **Strong:** precise reading of the studio widener (broadband, so it widens the sub) and the limiter (no true-peak). It names libebur128 (MIT, fetched) as the loudness reference. It asked exactly the right questions about the 0.41 and LUFS, and both are answered in M7 and M9.
- **Weak:** the club loudness targets are blog consensus, and S4 says so.
- **Missing:** a recommendation on whether to match loudness or crest. The reference has a crest of about 11 dB in the mains and about 14 dB in the break (M9), which is moderate, not slammed.

**S5 (stems, transcription).**
- **Strong:** the most useful category report for the pipeline. demucs-web (fetched, 172 MB, COOP/COEP), the drum2midi benchmark figures, the madmom CC BY-NC-SA model trap, and the point that SDR does not predict transient fidelity.
- **Weak:** some quality figures come from different protocols, and S5 says so. Samplab's status is unresolved.
- **Missing:** the kick/sub split. S5 says 4-stem models cannot do it. M1–M4 show that for this track the split is easy by *phase-locking and frequency*: the kick is grid-coherent and 50–260 Hz, the sub is incoherent and 30–40 Hz. Also missing is the lowest pitch each transcriber supports, because the reference root is about 31–35 Hz.

---

## 3. Cross-cutting findings

1. **The spec's timbre and low-end facts are weaker than its rhythm facts, and some are wrong.** Each of H1, H2, H3, H4, H5, S2, S4 and S5 reports a missing or ambiguous spec measurement: riser, impact, reverb and delay times, LUFS, the meaning of 0.41, the stab chords, and the shaker and perc. My measurements now *contradict* four spec rows:
   - "sweep 130→43 Hz in 60 ms": actually about 190 Hz at 10 ms, 52 Hz at 150 ms, τ ≈ 24 ms;
   - "sub: plucked sine on B1, ~35 ms": actually the kick's glide, plus a ducked C#1/B0 drone;
   - "click on top": actually about −45 dB;
   - "bass root B1 throughout": the low root is mostly about 34.5 Hz, with B0 (31.0 Hz) in 1 bar out of 8.

   **Recommendation: re-measure before re-tuning.** Any agent's "retune parameter X to the spec value" advice should wait.
2. **Licence is the gating decision, and it belongs to the owner.** H3 found that the repo has no LICENSE file. GPL or AGPL appears for Mz101, jc303, Surge, Vital, Helm, junox, webOBXD, Dexed, Texed, Dragonfly, essentia.js (AGPL), JUCE (AGPL) and ZL EQ (AGPL). Separately, madmom's models and some RoFormer checkpoints are CC BY-NC-SA. The permissive set worth building on is: Tone.js (MIT), Open303 core (MIT), Airwindows (MIT), sndfilter (MIT), libebur128 (MIT), Basic Pitch (Apache-2.0), Demucs (MIT, archived), dasp-pytorch (Apache-2.0), Freeverb (public domain), and the published papers (Dattorro, Werner et al.). Until the owner decides, every GPL item is "read for method, re-derive".
3. **AudioWorklet is the shared unlock, and the shared cost.** S1 (glue with detector HPF), S2 (Dattorro, tape delay), S3 (ADAA, dynamic EQ), S4 (true-peak limiter, loudness meter) and H3 (junox) all need it. O2 confirms it works on localhost, must be rebuilt on each OfflineAudioContext, and needs `selfcheck.js` stubs. One decision covers five reports.
4. **Several studio processors are structurally off, independent of tuning.**
   - Delay filters sit outside the feedback loop (S2).
   - The widener is broadband, so it widens the sub (S4).
   - The glue detector sees the full kick (S1).
   - The hat `hp2` removes the ring (O1).
   - The kick pitch envelope is a ramp, not an approach (M1).

   These are cheap code fixes with clear whys.
5. **The 300 Hz–1 kHz excess now has a target.** Reference energy in 300 Hz–1 kHz relative to 20–300 Hz is −24.3 dB in the intro, −14.7 in mainA, −13.7 in mainA2, −8.5 in the break, −11.2 in mainB and −14.3 in the outro (M9). The intro figure says the reference intro is almost pure low end. Any studio render can be scored against these numbers per section. Candidate causes now include the studio's *extra* B1 sub and B2 bass, which the reference may not have in that form.
6. **Search-snippet evidence dominates.** Only O2, S5, H2, H3 and parts of S1 and S4 fetched pages. Arxiv and most vendor hosts were blocked for everyone. Round-3 answers should prefer reasoning over the facts already gathered, plus the measurements, rather than new product lists.

---

## 4. Numbered questions for round 3

Each question can be settled by reading, reasoning or at most a little search.

- **Q1 (to S5, refined from my round 1).** For this track the kick and sub separate by phase-locking: the kick is grid-coherent, with averaging correlation 0.96; the sub drone is not, with coherence 0.03. They also separate by band: the kick is 50–260 Hz, the sub 30–40 Hz. Given that, is a neural separator needed for the low end at all?
  - Which of your drum-split tools (MDX23C DrumSep, LarsNet in drum2midi) keep a kick's 50–60 Hz tail in the kick rather than in "bass"?
  - What is the lowest pitch Basic Pitch, Omnizart and pyin are documented to track? The root here is about 31–35 Hz.
- **Q2 (to H1, refined).** The reference kick follows f(t) ≈ 51 + 213·e^(−t/24 ms) Hz. Its body is held near full level for about 60 ms, then falls to −18 dB at 150 ms and −34 dB at 200 ms. It has almost no click (M1, M2).
  - Which of your kick synths or models express the pitch as an exponential *approach to a target* rather than a ramp to an end frequency?
  - Does Werner et al.'s 808 model, or the Tone.js MembraneSynth source, give that shape?
  - Is a tail around 52 Hz (G#1) under a C#/B-rooted track a plausible deliberate tuning?
- **Q3 (to S1 and H1, refined).** The sub drone (26–44 Hz band) sits at −13, −7, −2 and −2 dB on the four 16ths after each kick (M4). Fit that to the studio ducker's depth, attack, hold and release, or to one of your tools' curve shapes (Kickstart 2, Duck). Is a linear release adequate, or does it need `setValueCurveAtTime`?
- **Q4 (to S3 and H2, refined from my round 1).** The reference's 300 Hz–1 kHz band sits at −24.3 dB (intro) and −14.7 dB (mainA) relative to 20–300 Hz (M9). Using the per-step attribution idea (Critique, S3), which studio element would you check first? Can you confirm or refute, from the Web Audio spec or MDN, that a `BiquadFilterNode` lowpass `Q` is in dB?
- **Q5 (to H2).** At the bass steps the reference shows partials near 98, 109, 133–138, 162, 181–186 and 228 Hz over a 34 Hz component, not a B2 series (M5). Is that consistent with a bass playing other notes (for example G2, A2, E3, F#3 over C#1), with an FM or inharmonic bass, or with stab-chord bleed? Which synth families on your list would make it?
- **Q6 (to H3 and S4).** The stab band (300 Hz–2 kHz) measures L/R correlation of about 0.5 at onset and 0.3–0.45 at 60–115 ms. The full mix measures 0.93–0.96 (M7).
  - From the Juno-60 chorus analysis (two BBD lines, inverted LFO) and from the studio's ±spread pan, which mechanism would give about 0.5 at the onset?
  - How much would a 3/16 ping-pong return lower the correlation in the tail?
- **Q7 (to H3).** The sub root changes by bar, mostly 34.5 Hz (C#1), with 31.0 Hz (B0) in one bar of eight and 33.3 Hz in another (M6). The lead uses F#, G#, C# and D#. Which chord progressions fit a C#-rooted harmony with an occasional B, and does that change your stab and pad voicing advice? The current Bmaj9/G#m7/Emaj7 was a guess.
- **Q8 (to H4).** Does the reference open hat's "1.5 kHz ring under a 5.9 kHz centroid" fit an 808-style six-square bank, whose oscillators Cherry Audio's docs put at roughly 200–800 Hz, or a sampled 909-style cymbal? What would you change in `hatBuild` (ratios, `hp2`) to produce the ring?
- **Q9 (to S2).** In grid music a 3/16 echo lands on a grid step, so autocorrelation cannot tell it from the pattern. The final tail of the track decays at about 9 dB/s with no clear 357 ms period (M8).
  - Propose a measurement that isolates delay returns, for example ping-pong L/R alternation, or a section where the dry source stops.
  - Say whether any of your listed tools, or the Freeverb or Dattorro designs, would explain a long (about 6 s to −60 dB) tail at the end.
- **Q10 (to S4).** The reference measures −10.7 LUFS integrated, −9.5 LUFS maximum short-term, sample peak −0.18 dBFS, true peak about 0.0 dBTP (4× oversampled), and crest 10.6–14 dB per section (M9). Which of your limiter designs reproduces a 0 dBTP, about −10.7 LUFS master? Should Havantechno match that or target −1 dBTP?
- **Q11 (to H5).** For the render-and-score fitting loop, which of Tone.js, FaustWasm and webOBXD can be instantiated on an `OfflineAudioContext` and have every parameter set from code? Use your fetched READMEs and O2's WAM notes.
- **Q12 (to H1, H2, H3, H4, S1, S2, S3, S4).** For your top three recommendations only, classify each as:
  - (a) permissive code (MIT, BSD, Apache, public domain);
  - (b) copyleft (GPL, AGPL, LGPL);
  - (c) published algorithm or paper;
  - (d) closed binary.

  This feeds one owner decision. The repo has no LICENSE file.
- **Q13 (to S5).** S5 said section detection was not covered. Do librosa, madmom or Essentia.js document a structural segmentation or novelty function that would recover the spec's form boundaries (0:44, 1:16, 3:16, 4:20, 5:52)? On the sample-exact grid, a bar-level self-similarity matrix would do it, as my reasoning suggests. Is any tool documented to do this?

---

## 5. Measurements I can run, and the ones I ran

**Data and grid.** The reference MP3 was decoded with `ffmpeg` to 44.1 kHz stereo float. Duration 387.95 s, sample peak 0.980.

**M0. Grid.**
- The spec's tempo is 126.0 BPM. At 44.1 kHz that makes one beat exactly 21,000 samples and one 16th exactly 5,250.
- The kick onsets, found by an envelope threshold in 0.5 ms bins, sit a constant 11–13 ms *before* the spec's downbeat grid. The offset holds at every checked bar from 1 to 195, with no drift.
- I used T0 = 0.568 s instead of the spec's 0.58 s.

**M1. Kick pitch.**
- Method: 84 intro beats (bars 1–21), low-passed at 250 Hz, aligned and averaged (each beat correlates 0.94–0.96 with the average). Zero-crossing instantaneous frequency from the onset.
- Result: 184 Hz at 10 ms, 119 at 25, 76 at 50, 61 at 75, 58 at 100, 52 at 150, about 44 Hz by 180 ms.
- Fit: f(t) = 51.2 + (264 − 51.2)·e^(−t/23.9 ms).
- The same within ±3 Hz in mainA, break and mainB, where the break is slightly faster.
- For comparison, the studio kick (`song.js` values) is at 154, 113, 67, 44, 44 and 44 Hz at the same times.

**M2. Kick level and click.**
- Coherent <250 Hz envelope: −4.8 dB at 5 ms, peak at 40 ms (within 1 dB from 20 to 60 ms), then −6.3 dB at 100 ms, −17.8 at 150 and −33.6 at 200.
- The studio kick with its drive gives −4.3, −17.3 and −29.7 dB at 100, 150 and 200 ms, a close match.
- Click: per-beat energy above 2 kHz in the first 20 ms is −45.2 dB relative to the 0–100 ms body in the intro, which is 16 dB above the pre-onset floor. In mainA it is −30.3 dB, where hats overlap.

**M3. Low band around the beat.**
- 30–80 Hz energy, coherent average: peak at 70 ms. Incoherent per-beat average: peak at 83 ms. Both are well after the spec's "35 ms".
- After 150 ms the incoherent average flattens to a floor at about −20 dB that holds to 400 ms (break: about −30 dB). That floor is the sub of M4.

**M4. The sub drone.**
- Band 22–50 Hz. Its coherence ratio across bars is 0.03, so it is not phase-locked: a free-running oscillator.
- Long-window carrier: 34.47 Hz in every section, between C1 (32.70) and C#1 (34.65), and closest to C#1, about −9 cents.
- Level by 16th step, 40 ms after each step and averaged over 20+ bars: −13, −7, −2, −2 dB, the same in all four quarters of the bar. That is a ducked sub with roughly 120–240 ms of recovery.
- In the break its band power is about 10 dB lower than in the mains (−23.9 vs about −13.7 dB relative to the full mix).

**M5. Spectrum at the bass steps.**
- Intro, steps 3, 7, 10 and 14, 110–225 ms windows averaged over 20 bars. Peaks at 34 Hz (strongest), and near 77–79, 98, 109, 133–138, 162, 181–186, 225–228 and 253–258 Hz.
- That is not a B2 (123.5 Hz) series. The resolution is 4–9 Hz, so individual note names are tentative.

**M6. Sub pitch by bar.**
- One-bar windows over the 22–50 Hz band.
- mainA, bars 42–57: 34.5 34.5 31.0 34.7 34.5 34.5 34.5 34.3 | 34.5 34.5 31.0 34.7 …, an 8-bar cycle with B0 (31.0 Hz) in one bar of eight.
- Intro, bars 2–17: also contains 33.3 Hz bars.

**M7. Width.**
- Full-mix L/R correlation: 0.95, 0.94 and 0.93 in mainA, mainA2 and mainB; 0.85 in the break.
- By band in mainA: below 150 Hz 1.00, 150 Hz–1 kHz 0.80, 1–4 kHz 0.65, above 4 kHz 0.84. The break's 1–4 kHz band is 0.32, the widest.
- 300 Hz–2 kHz at the stab steps 2, 6, 10 and 14 in mainA: 0.47–0.60 in the first 30 ms, 0.29–0.46 at 60–115 ms. Non-stab steps measure 0.09–0.52.

**M8. End tail.**
- After the last downbeat (about 381.7 s) the level falls about 75 dB in 6 s. A linear fit over 381.8–386.3 s gives about −9.4 dB/s.
- Residual bumps every 0.15–0.25 s. The envelope autocorrelation peaks at 0.74 s and 1.06 s, not at 0.357 s. **Inconclusive for the delay time.**

**M9. Loudness and band balance.**
- BS.1770-4 K-weighting after resampling to 48 kHz, 400 ms blocks, absolute and relative gating:
  - integrated −10.7 LUFS;
  - maximum short-term −9.5 LUFS;
  - true peak (4× oversampled) +0.01 dBTP.
- Crest factor: intro 10.6, build 12.8, mainA 10.9, break 14.0, mainB 10.7 dB.
- Energy relative to 20–300 Hz:

| Section | 300 Hz–1 kHz | 1–4 kHz | 4–16 kHz |
|---|---|---|---|
| intro | −24.3 | −30.2 | −45.5 |
| build | −14.0 | −21.5 | −20.7 |
| mainA | −14.7 | −19.8 | −17.7 |
| mainA2 | −13.7 | −19.8 | −18.2 |
| break | −8.5 | −16.4 | −21.0 |
| mainB | −11.2 | −19.2 | −17.7 |
| outro | −14.3 | −24.2 | −30.6 |

**Caveats.**
- Everything here comes from a 192 kbps MP3.
- The section windows are set from the spec's form times on my corrected grid; I did not detect the boundaries.
- Note names from 4–9 Hz-resolution windows are tentative. M4 and M6 use 1.9–38 s windows and are firmer.

**Proposals, not run:**
- **P1.** Render the studio's Guidance offline and run M1–M9 on the render, to turn every row above into a scored gap. This needs a browser or Playwright, which the repo does not commit (CLAUDE.md).
- **P2.** Clap reverb decay: average the clap hits on beats 2 and 4 where nothing else falls in the next 100 ms (check the arrangement), and fit the decay of the 1–4 kHz band from 50 to 300 ms.
- **P3.** Riser shape: track the spectral centroid per 16th across the build (bars 24–40) and before the drop. That gives the sweep range and curve, and answers H5.
- **P4.** Open-hat ring: average step 2 of bars in the *build*, where the hats enter, against step 2 of the intro2 bars without hats, and look for a 1.5 kHz partial.
- **P5.** Per-step least-squares attribution of the 300 Hz–1 kHz band to elements, using the arrangement's step map (answers S3).
- **P6.** A chroma per stab onset, after subtracting the coherent kick average, to test the chord progression against the C#/B sub pattern.
