# S2: delay and reverb — round 3
Agent model: Sonnet. Date: 2026-10-23.

Inputs read in full: `round2-O1.md`, `round2-O2.md`, `round1-H3-stab-pad.md`. I also re-read `song.js` and `K.impulse` in `olde Havantechno dub studio/` (the `studio/` path still resolves). I ran 2 of my 4 allowed web searches. WebFetch is still blocked here (DNS), so "verified" again means a search result at that URL supported the fact. Arithmetic labelled "my arithmetic" is mine, not a source's.

## Answers

**O1 Q9: how to measure delay returns and RT60 in grid music, and whether a long tail is explained by a delay or reverb.**

Studio facts that shape the answer (read from `song.js`): the delay send is `3/16`, feedback 0.42, tone 2800 Hz, hp 300 Hz, ping-pong. The stab sends are delay 0.15 and reverb 0.1. The lead sends are delay 0.35 and reverb 0.18. The clap sends reverb 0.25.

Step indexing: the spec's steps are 0-based (kick on 0, 4, 8, 12; clap on 4 and 12; stabs on 2, 6, 7, 10, 14, 15; open hats on 2, 6, 10, 14). A 3/16 return therefore lands 3 steps after each hit.

1. **Candidate delay times to test.** At 126 BPM: 1/8 = 0.238 s, dotted 1/8 (= 3/16) = 0.357 s, 1/4 = 0.476 s, dotted 1/4 (= 3/8) = 0.714 s (my arithmetic). O1's tail shows envelope bumps every 0.15 to 0.25 s, which the 1/8 time (0.238 s) fits and 0.357 s does not. Its autocorrelation peaks at 0.74 s and 1.06 s are within about 4% and 1% of 2x and 3x of 0.357 s. They also fit other readings, so I treat the tail as unable to separate the candidates. I do not know the autocorrelation resolution O1 used.
2. **Method A, a differential on the grid (clean landing steps).**
   - With the 3/16 time, stab returns land on steps 5, 9, 10, 13, 1 and 2 (hits at 2, 6, 7, 10, 14, 15). Steps 1, 5, 9 and 13 carry no stab onset.
   - Measure the 300 Hz to 2 kHz energy over 0 to 100 ms from those steps. Compare it with the same measure from steps that no candidate time lands on.
   - Step 5 and step 13 also carry clap-adjacent material (clap on 4 and 12), so steps 1 and 9 are the cleanest.
   - Run it for each candidate time: a 1/8 delay lands on steps 4, 8, 9, 12, 16, 17.
   - It only works in bars where the stab pattern is known. The studio's A/C pattern switch is the studio's guess at the reference; the reference may not switch. If it does, A minus C isolates the echo of the step-6 and step-14 hits.
3. **Method B, ping-pong alternation.** A ping-pong return alternates channels. Take the band envelope per channel, compute (E_L − E_R)/(E_L + E_R) in the 300 Hz to 3 kHz band after an isolated hit, and look for a sign flip every T. The flip repeats with period 2T, which for 3/16 is 6 steps, and 6 does not divide the 16-step bar. So it does not alias onto the grid as plain autocorrelation does.
4. **Method C, a source that stops.** Look for the regions where the dry source ends and sends keep sounding: the final tail, and the gap before the drop if the build ends in silence. The last stab or lead note is the "impulse". I have no data on which instrument was last.
5. **RT60 on isolated claps.** O1's proposal P2 is right. Add Schroeder backward integration on the 1 to 4 kHz band instead of fitting the raw envelope, since backward integration is the standard way to get an RT from a noisy decay (recalled, not sourced).
6. **Clap tail: in-voice or send.** My sources do not say. The two readings differ in stereo. The studio's own clap tail is a mono noise burst (`BUILD.clap`, tail 0.3, tailDecay 0.35 s) and the send reverb uses independent L/R noise IRs. Measure the L/R correlation of the clap tail at 100 to 300 ms. Near 1 means a mono in-voice tail; below about 0.5 means a send reverb. That threshold is my guess, not from a source.

**Does the long end-tail point to delay or reverb?**
- O1's end-tail slope of about −9.4 dB/s is an RT60 of about 6.4 s (60 / 9.4, my arithmetic).
- A 3/16 delay would need each 0.357 s repeat to lose 9.4 × 0.357 = 3.4 dB, so feedback of about 0.68 (my arithmetic). The studio's 0.42 loses 7.5 dB per repeat, a decay near 21 dB/s.
- A reverb with RT60 of about 6.4 s fits a constant slope better than a delay. But the pad release (1.2 s) and impact (decay 1.4 s plus wash) also contribute at the end. The tail alone cannot separate delay, reverb and instrument release.
- Test: O1's step-wise bumps every 0.15 to 0.25 s are not a feedback delay at 0.357 s. They may be a reverb's early reflections, a delay of a different time (0.238 s), or hat and perc remnants.

**O1 Q12: licence classes for my top three (revised in this round).**
1. Freeverb on native nodes: (a) permissive/public domain. The original header says public domain (verified: https://windfis.ch/git/muse/tree/muse2/plugins/freeverb/tuning.h). The Faust port's header is BSD per the search summary (variant not seen) (verified: https://scm.cri.minesparis.psl.eu/git/Faustine.git/blob_plain/29c1f4c9f2543b9b079aa3960761214c920bb1f2:/interpretor/faust-0.9.47mr3/benchmark/freeverb.dsp).
2. Feedback delay with in-loop filter, optional saturation and delay-time LFO: no code to copy; it is our own design. Reference behaviour comes from closed products, class (d): FL Fruity Delay 3, Ableton Echo, EchoBoy. Nothing is taken from them except documented behaviour.
3. Dattorro plate: (c) a published paper (verified: https://ccrma.stanford.edu/%7Edattorro/EffectDesignPart1.pdf). The code reference khoin/DattorroReverbNode has licence "other" (unclear), so do not copy it. Dragonfly Reverb remains (b) copyleft, GPL-3.0, a listening and A/B reference only.

**O2 Q1: top-three table.**

| Name | Source available | Licence (SPDX if shown) | Browser build | Closed device: character parameters, mapped to our spec |
|---|---|---|---|---|
| Freeverb (native-node build, planned) | Yes: original constants and structure published (verified: https://windfis.ch/git/muse/tree/muse2/plugins/freeverb/tuning.h, https://www.dsprelated.com/freebooks/pasp/Freeverb.html) | Public domain (no SPDX identifier shown on the pages) | Would be ours on native nodes; Tone.js ships a Freeverb effect (Tone.js is MIT per H3's fetch of its repo) | Not closed. Proposed spec: `size {0.2, 8, 2.0, s}` read as RT60, `damp {500, 20000, 5000, Hz}`, `predelay {0, 0.2, 0.012, s}`, `hp {20, 2000, 160, Hz}`, `spread {0, 60, 23, samples}`, `mix {0, 1, 0.25}` |
| Feedback delay with in-loop filters | No (our design) | n/a | Native nodes | Closed references: Ableton Echo (time in Notes/Dotted/Triplet/16th or ms; modulation rate 0.01 to 40 Hz free, 8 bars to 64th synced; modes Ping Pong, Stereo, Mid/Side) (verified: https://www.musicradar.com/how-to/ableton-live-10-echo-explained). FL Fruity Delay 3: cutoff sits inside the feedback loop; feedback can exceed 100% (verified: https://www.image-line.com/support/flstudio_online_manual/html/plugins/Fruity%20Delay%203.htm). Parameter ranges beyond these: not found. Proposed additions to `BUILD.delay`: `loop {value: true}` (filters in loop), `modRate {0.01, 10, 0.5, Hz}`, `modDepth {0, 0.01, 0.002, s}`, `drive {0, 1, 0}` |
| Dattorro plate | The paper (verified: https://ccrma.stanford.edu/%7Edattorro/EffectDesignPart1.pdf); C ports exist (verified: https://github.com/el-visio/dattorro-verb, https://github.com/jpcima/fverb) | Paper: reuse terms not checked. el-visio and fverb licences not shown | AudioWorklet port exists (khoin; licence "other") (verified: https://awesome.ecosyste.ms/projects/github.com%2Fkhoin%2Fdattorroreverbnode) | Not closed. Parameters in khoin's design per Cacophony docs: decay, damping, bandwidth, pre-delay (verified: https://cacophony.js.org/interfaces/ReverbOptions.html); ranges not found |
| Dragonfly Reverb (reference only) | Yes, GitHub (michaelwillis/dragonfly-reverb) | GPL-3.0 (listing), Arch lists GPL-3.0-or-later | None (LV2/VST/CLAP/VST3) | Not closed |

**O2 Q3: which of my parameters move over time, and the measurement for each.**
- **Send levels per section (pad, riser, impact reverb; lead delay).** Per section. The break is the likely case: O1 M7 shows 1 to 4 kHz L/R correlation of 0.32 in the break against 0.65 in mainA. That gap is consistent with more reverb or delay in the break, but also with the pad's own width, so attribution is open. Measure the 1 to 4 kHz side/mid energy ratio per bar to see whether the change is a step at the section boundary or a ramp.
- **Reverb size/decay and throws (end of sections, the final tail).** Per event. A "throw" is a short send-level rise on one hit (a snare or clap into a reverb). Measure the tail decay slope after the last hit before a silent gap. Resolution: per hit, not per bar.
- **Delay feedback and delay filter sweeps.** Not evidenced. If they move, it would be a continuous sweep on repeats. Measure the spectral centroid of successive repeats of one isolated lead or stab hit.
- **Delay time.** Almost certainly fixed (synced). Measure only to settle the candidate times in Q9.
- Whether section `set`/`ramp` suffices: for send levels yes; for throws and sweeps, per-point automation lanes are needed. I cannot decide this from sources, only from a measurement of the reference.

**O2 Q10: Freeverb and Dattorro delay lengths at 48 kHz, the 128-sample rule, and the clap tail.**

Freeverb lengths (samples at 44.1 kHz from a CCRMA port; verified: https://ccrma.stanford.edu/~byoink/220b/hw3/freeverb.ins), scaled by 48000/44100 (my arithmetic):

| | 44.1 kHz | 48 kHz |
|---|---|---|
| Combs | 1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617 | 1215, 1293, 1390, 1476, 1548, 1623, 1695, 1760 |
| Allpasses | 556, 441, 341, 225 | 605, 480, 371, 245 |
| Stereo spread | 23 | 25 |

- Smallest loop: the 225-sample allpass at 44.1 kHz (245 at 48 kHz). Every Freeverb loop is above the 128-sample cycle clamp (verified by O2 from the spec: https://webaudio.github.io/web-audio-api/). The clamp would only bite below a sample rate of about 24.6 kHz (225 × 44100 / 128 → 128-sample equivalent; my arithmetic). Scale the lengths by `sampleRate / 44100` and floor them at 128.
- **Dattorro lengths: not found.** The search for the specific numbers returned nothing; one result cites tap indices 1800 and 2656 for the two tank halves in MathWorks' implementation, without a stated sample rate (verified: https://jp.mathworks.com/help/audio/ref/reverberator.html), and the Wikimization page treats the lengths as an open optimisation problem (verified: https://convexoptimization.com/wikimization/index.php/Dattorro). I will not give a list. I recall the paper's values are at 29,761 Hz and that the smallest input diffusers are about 100 to 150 samples, which would scale to roughly 160 to 240 samples at 44.1 or 48 kHz, so above 128, but that is recalled, not verified. The paper itself (the PDF URL above) must be read to confirm; I cannot open it from here.
- **What still needs an AudioWorklet.** Any feedback loop shorter than 128 samples (2.9 ms at 44.1 kHz): Karplus-Strong style, very short comb/flanger loops, and short allpass lengths if a design scales them down. Round 1 said tape-style delay and Dattorro need a worklet. That was too strong: a tape-style delay (hundreds of milliseconds) is above the clamp and can be native (see revisions). Dattorro may also fit native nodes, but its multi-tap output reads from inside delay lines, which a single `DelayNode` output cannot do; serial delay segments would be needed, and I would need the lengths first.
- **Clap tail.** None of my sources says whether the reference clap's reverb tail is an in-voice noise tail or a send reverb. H4's sources describe the 808 clap as a cluster of noise pulses plus a softer decaying "reverb" pulse (verified: https://www.firstpr.com.au/rwi/tr-808/, via H4's file). That is a synthetic tail inside the voice, but it says nothing about this track. The studio clap already does both (in-voice tail 0.3 and a 0.25 reverb send), so the current sound double-counts any tail. Q9 item 6 is the test.

## Revisions to my round 1

1. **Delay time stays 3/16 as an unmeasured assumption.** O1's M8 found no 0.357 s period in the end tail, but that tail has no dry source and I cannot say which instrument is last. It does not refute 3/16 in the main sections and does not support it either. The spec never stated a delay time; 3/16 came from a convention (my round 1). Keep `division` exposed; do not tune feedback or send levels to the end tail. Test with Q9 methods A and B first.
2. **Delay feedback and the tail.** Matching a 6.4 s tail by delay needs about 0.68 feedback, far above the studio's 0.42. Raising feedback to chase the tail would be the wrong fix; the tail is more plausibly reverb or instrument release.
3. **Reverb: the studio's tail decay is the wrong shape and length.**
   - I read `K.impulse` this round. The IR is independent stereo noise per channel with envelope (1 − t/n)^k, k = 2.5 + 6 × (1 − decay), plus a one-pole high-pass. For `song.js` (size 2.4 s, decay 0.55) k is 5.2, so the envelope reaches −60 dB at about 1.76 s (my arithmetic), and its slope is not constant: about −19 dB/s at the start, steepening to about −38 dB/s at 1.2 s.
   - The reference end tail is a near-constant −9.4 dB/s. A polynomial envelope cannot match a constant-slope decay at any setting; an exponential envelope (e^(−6.9 t / RT60)) can.
   - `K.impulse` calls `Math.random()`, so every regeneration, and every offline render, gets a different IR. That adds run-to-run noise to any render-and-score loop (O1 P1). A seeded generator would fix this cheaply.
   - A shared, size-automated convolver also swaps its buffer on every `size`/`decay`/`hp` change, which can click.
4. **Short clap tail and long outro tail want different reverbs.** The clap needs RT60 of roughly 1 s (generic advice, weakly sourced); the end tail needs about 6 s. One send cannot be both without automation. Preferred fix: the Freeverb build below, where RT60 is a smoothly automatable parameter. Alternative: two reverb sends, short for clap/stab/hats and long for pad/riser/impact.
5. **Tape-style delay does not need a worklet** (correcting round 1). With a minimum cycle delay of 128 samples, a delay of hundreds of milliseconds with an in-loop lowpass/highpass (`BiquadFilterNode`), a saturator (`WaveShaperNode`) and a slow delay-time LFO (`OscillatorNode` into `delayTime`) can be built from nodes the studio already uses. Move the existing `lp`/`hp` inside the loop, behind a `loop` switch defaulting to the current behaviour so existing renders do not change (as O2 suggested).
6. **Freeverb build plan on native nodes.**
   - **Structure per channel:** 8 parallel lowpass-feedback combs into 4 series allpasses (verified: https://www.dsprelated.com/freebooks/pasp/Freeverb.html). The right channel adds the spread (23 samples at 44.1 kHz) to all 12 lengths. Input is the mono sum, scaled by 0.015 (`fixedgain`), then predelay and the existing high-pass.
   - **Comb:** `GainNode` (feedback g) → `DelayNode` (length L) → lowpass `BiquadFilterNode` → back to the gain; the comb output is the delay output. All of L, g and the filter sit in one cycle with delay L >= 128, so the clamp is not reached. Allpass: input and 0.5 x delayed output sum into the `DelayNode`; output = delayed − input (from the Freeverb structure; verified: https://windfis.ch/git/muse/tree/muse2/plugins/freeverb/readme.txt).
   - **RT60 control (replaces the fixed room mapping):** original Freeverb sets feedback = room x 0.28 + 0.7 and damping = damp x 0.4 (verified: https://windfis.ch/git/muse/tree/muse2/plugins/freeverb/tuning.h, https://ccrma.stanford.edu/~jos/book2000/Lowpass_Feedback_Comb_Filter.html). To use seconds, set each comb's gain to g_i = 10^(−3 L_i / (sr x RT60)) (standard comb T60 relation; my derivation). For RT60 = 1.0 s at 44.1 kHz this gives 0.78 to 0.84 across the eight combs; for 6.4 s, 0.96 to 0.97 (my arithmetic). This keeps the existing `size` parameter name and unit (seconds) and makes it automatable without a buffer swap.
   - **Damping:** a `BiquadFilterNode` lowpass at `damp` Hz inside each comb. Note the Web Audio lowpass is 12 dB/octave and Q is in dB (verified by O2: https://webaudio.github.io/web-audio-api/), unlike Freeverb's 6 dB one-pole; set Q to about −3 dB for no resonant peak (my derivation from the dB reading). The sound will differ slightly from original Freeverb. `IIRFilterNode` could give an exact one-pole but its coefficients are fixed at creation (recalled, not verified), so `damp` could not be automated.
   - **Size:** roughly 80 nodes per instance (2 channels x (8 x 3 + 4 x 4)). Each uses only node types the studio already stubs in `selfcheck.js` (`createDelay`, `createGain`, `createBiquadFilter`, `createChannelMerger`/`Splitter`; checked by grep). No new stub is needed.
   - **Acceptance tests:** (1) render a unit impulse through the reverb offline and check −60 dB arrival within 15% of `size`; (2) check the tail slope is constant in dB; (3) print the L/R correlation of the wet tail at 60 to 115 ms and 100 to 300 ms, to compare with O1's stab and clap figures.
   - **Known gaps:** no early reflections and no modulation (Freeverb has neither; Dragonfly adds a separate Early Reflections plugin). Freeverb's stereo decorrelation comes only from the 23-sample length offset, so its channels are more correlated than the studio's independent-noise IR. I have not measured this, so the effect on the 0.3 to 0.45 tail correlation is open.
7. **ConvolverNode path stays as an optional "IR mode"** (generated, seeded, exponential envelope), not the default. Bundling third-party IRs remains an owner decision (O2 C1: no audio files).

## On my partner's report (H3)

**Where stab/pad width and the time-based sends must agree.**
1. **The measured "tail" window cannot come from the delay.** O1's stab-band correlation falls from about 0.5 (first 30 ms) to 0.3 to 0.45 (60 to 115 ms). A 3/16 return arrives at 357 ms, so it cannot explain a change at 60 to 115 ms. Candidates for that window: reverb (15 ms predelay in `song.js`, so its early field is already present), a chorus, or voice-level detune. With detuned saws panned apart, the L/R phase of each partial drifts at the detune beat rate, so correlation falls with time after the onset even with no send (my reasoning, unmeasured; ±11 cents at 1 kHz is about 13 Hz relative drift, my arithmetic). So some of the onset-to-tail drop may be the voice itself. The test is to render the stab dry (sends 0, no widener) and compare.
2. **The stab sends are small.** Stab sends are delay 0.15 and reverb 0.1. The first delay repeat is 0.15 x feedback path, about −16.5 dB below the dry stab, the second about −24 dB (my arithmetic, ignoring tone and hp). That is subtle; do not expect the delay to produce measurable decorrelation. The larger width levers are the voice spread, the widener (width 1.1) and the reverb.
3. **Where the returns land.** Per the spec's mixer order, inst → inserts → sidechain → channel → sends (verified in the spec at `docs/superpowers/specs/2026-10-21-guidance-studio-design.md`, line 89), the send taps the already-ducked stab. Returns of stabs from steps 2, 6, 10 and 14 land on steps 5, 9, 13 and 1, one 16th after the kick steps, at a time when the dry stab is still partly ducked (release 0.2 s). The returns are not ducked at landing, so they fill the pumping gaps. Whether the reference does that is unknown; Q9 method A would show it.
4. **Pad and break.** The pad has reverb 0.4 and the lead has delay 0.35 plus reverb 0.18. The break's 1 to 4 kHz correlation of 0.32 (O1 M7) is therefore at least as likely to come from the pad and lead sends as from stab width. H3 tied width to the stab; for the break it must be attributed per element.

**Corrections and cautions for H3's report.**
- H3 gave the stab's spread as 0.7 (the `synths.js` default). `song.js` sets `spread: 0.5`, `detune: 11`, and puts a `widener` (width 1.1) in the stab chain. It has no chorus in that chain, which answers H3's "not checked" note.
- H3 suggests adding an ensemble/chorus to the pad. The pad's wet path already uses an independent-noise stereo IR at send 0.4, which is highly decorrelated by construction. Measure the pad's L/R correlation (P1 render) before adding a chorus, to avoid double widening. If the Freeverb build replaces the IR, the pad's width will change, so any chorus decision should wait for it.
- H3's Tone.js `Chorus` figures (delayTime 3.5 ms, spread 180) are library defaults from a snippet, not evidence about the reference. I would not use them as targets.
- H3's licence ranking puts GPL items first. Per O1/O2, those are "read for method, re-derive" until the owner decides the repo licence. That is a coordinator decision, not something I can correct.

## Still open
1. **The reference delay time and whether a delay exists on the stabs at all.** Candidates 0.238, 0.357, 0.476 and 0.714 s remain. Needs Q9 methods A and B on the reference, not on the end tail.
2. **The clap tail source (in-voice or send) and its RT60.** Needs the clap-tail correlation test and backward integration on isolated hits (O1 P2).
3. **Whether the end tail is reverb, pad release, impact or a delay.** The −9.4 dB/s slope fits a reverb of about 6.4 s but not a unique cause.
4. **Dattorro delay lengths.** Not found; the paper PDF has to be read.
5. **L/R decorrelation of a Freeverb-style tail versus the reference's 0.3 to 0.45.** Needs the offline render and the correlation test above.
6. **Whether native-node Freeverb at roughly 80 nodes per instance is acceptable for CPU in the browser and in offline export.** Not measured, not sourced.

## Sources
New URLs seen this round (search results):
- https://windfis.ch/git/muse/tree/muse2/plugins/freeverb/tuning.h
- https://ccrma.stanford.edu/~jos/book2000/Lowpass_Feedback_Comb_Filter.html
- https://scm.cri.minesparis.psl.eu/git/Faustine.git/blob_plain/29c1f4c9f2543b9b079aa3960761214c920bb1f2:/interpretor/faust-0.9.47mr3/benchmark/freeverb.dsp
- https://jp.mathworks.com/help/audio/ref/reverberator.html
- https://convexoptimization.com/wikimization/index.php/Dattorro
- https://github.com/el-visio/dattorro-verb

URLs already in my round-1 file and reused:
- https://windfis.ch/git/muse/tree/muse2/plugins/freeverb/readme.txt
- https://www.dsprelated.com/freebooks/pasp/Freeverb.html
- https://ccrma.stanford.edu/~byoink/220b/hw3/freeverb.ins
- https://ccrma.stanford.edu/%7Edattorro/EffectDesignPart1.pdf
- https://github.com/jpcima/fverb
- https://awesome.ecosyste.ms/projects/github.com%2Fkhoin%2Fdattorroreverbnode
- https://www.musicradar.com/how-to/ableton-live-10-echo-explained
- https://www.image-line.com/support/flstudio_online_manual/html/plugins/Fruity%20Delay%203.htm

URLs seen in other agents' files (not re-checked by me, used only as pointers):
- https://webaudio.github.io/web-audio-api/ (O2, round 2)
- https://www.firstpr.com.au/rwi/tr-808/ (H4, round 1)
- https://cacophony.js.org/interfaces/ReverbOptions.html (search result in my round-1 search, summary only)
