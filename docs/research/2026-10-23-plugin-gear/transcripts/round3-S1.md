# S1: sidechain, compression and glue — round 3
Agent model: Sonnet. Date: 2026-10-23.

What I read for this round: `round2-O1.md` and `round2-O2.md` in full, `round1-H1-kick-sub.md` in full, the `BUILD.sidechain` and `BUILD.compressor` code in `studio/processors.js`, and the Guidance track definitions in `studio/song.js` (the studio folder is now "olde Havantechno dub studio/"; `studio/` still resolves).

Searches this round: 2 of the allowed 4. Pages opened: none. I used the Context7 index of the Web Audio specification for the ramp formula (marked below). The Giannoulis/Massberg/Reiss and Faust results are search-result text only.

New facts I verified this round:

- The exponential-ramp formula is `v(t) = V0 * (V1/V0)^((t-T0)/(T1-T0))`. A ramp to 0 is not possible. (verified: https://webaudio.github.io/web-audio-api/, via the Context7 index)
- In an AudioWorklet `process(inputs, outputs, parameters)`, `inputs[n]` is an empty array when no active node is connected to input n. A processor can declare `parameterDescriptors` with `automationRate: "k-rate"`. (verified: https://webaudio.github.io/web-audio-api/, via the Context7 index)
- The AES E-Library listing for the Giannoulis/Massberg/Reiss paper says the detector is placed in the log domain after the gain computer, which gives a smooth envelope, no attack lag and a variable knee width. It says the authors recommend feed-forward designs as stable and predictable. It is published in JAES vol. 60 no. 6, 2012, pp. 399-408 per the MathWorks reference. (verified: https://aes2.org/publications/elibrary-page/?id=16354, search-result text; the full paper was not reached)
- A Faust Libraries page for compressors exists, with a lookahead-limiters section. The search text says most compressors there use a "strength" parameter instead of a ratio. I did not see the function signatures. (verified: https://faustlibraries.grame.fr/libs/compressors/, search-result text only). The `lamb` project describes itself as a lookahead compressor/limiter in Faust. (verified: https://github.com/magnetophon/lamb, search-result text only)

---

## 1. Answers

Questions addressed to S1 in the two round-2 files: O1 Q3 (with H1) and O1 Q12; O2 Q1, O2 Q3 and O2 Q9.

### O1 Q3 (to S1 and H1): fit the sub drone's ducking to depth, attack, hold, release

The measurement (O1 M4): the 22-50 Hz sub drone sits at -13, -7, -2, -2 dB on the four 16ths after each kick, measured 40 ms after each step and averaged over 20+ bars. At 126 BPM a 16th is 119.05 ms, so the samples sit at about 40, 159, 278 and 397 ms after the kick.

Reading it: the last two values are equal, so -2 dB is the plateau. Relative to that plateau the curve is -11, -5, 0, 0 dB (gain 0.28, 0.56, 1.0, 1.0). This assumes that -2 dB is the un-ducked level. If the true un-ducked level is higher, the real depth is deeper than my fit.

**What the data can and cannot fix.** There are three informative points (the fourth is the plateau). Any curve with three free parameters fits them. The data cannot tell a linear-gain release from an exponential one, and it says nothing about the trough, because the first sample is already 40 ms after the kick.

Fits (computed by me with a grid search and a regression; the numbers are my arithmetic, not a source):

| Release shape | Parameters | Predicted at 40 / 159 / 278 ms (relative to plateau) | Error vs measured (-11, -5, 0) |
|---|---|---|---|
| Studio defaults now (`depth 0.6, attack 4 ms, hold 20 ms, release 220 ms`, linear gain) | as in `BUILD.sidechain` | -7.1, -2.3, 0.0 dB | 3.9, 2.7, 0 dB. Too shallow and recovers too fast. |
| Linear-gain release, best fit | depth 0.74 (trough gain 0.26), attack 4 ms, hold 30 ms, release 265 ms | -11.2, -4.3, -0.5 dB | within 0.7 dB |
| dB-linear (exponential-ramp) release, best fit | trough gain 0.24 (depth 0.76) at 5 ms, then `exponentialRampToValueAtTime(1, kick + 275 ms)`, no hold | -10.9, -5.4, 0.0 dB | within 0.4 dB |

The dB-linear fit gives a recovery rate of about 46 dB per second (regression slope 46.2 dB/s through the three points, reaching 0 dB at about 275 ms).

**Answer to the O1 question "is a linear release adequate, or does it need `setValueCurveAtTime`?"**

- A linear-gain release is adequate: it fits within 0.7 dB at the three measured points. The measurement noise from a 192 kbps MP3 and a band-power estimate is plausibly of that size (my judgment; O1's caveats mention the MP3).
- The exponential ramp fits slightly better, and it needs no new Web Audio feature. `exponentialRampToValueAtTime` is exactly linear in dB by the spec formula (verified above). The ramp target must be positive, and the trough gain of 0.24 is positive.
- `setValueCurveAtTime` is needed only if a custom shape (Kickstart's 16 curves, Duck's drawn curve) is wanted. The current evidence does not call for it.
- To choose between the shapes the reference must be measured at finer resolution. See "Still open".

**What this means for the studio's `sidechain` spec.** The existing four parameters can carry the fit: set `depth` 0.74, `attack` 0.004, `hold` 0.03, `release` 0.265 for the linear shape. Adding one parameter, `curve` (0 = linear gain, 1 = dB-linear), covers the second fit. The `depth` range (0 to 1) and `release` range (0.01 to 2 s) already contain the fitted values. No range change is needed.

### O1 Q12 (to H1, H2, H3, H4, S1, S2, S3, S4): classify my top three

My revised top three (see section 2):

| # | Item | Class | Licence evidence |
|---|---|---|---|
| 1 | Extended in-house `sidechain` ducker (curve, retrigger fix, key routing) | own code | The repo has no LICENSE file (H3, confirmed by O2). Cableguys and Devious Machines products are used for ideas only (controls), not code. |
| 2 | Keyed AudioWorklet glue compressor, DSP structure from sndfilter `compressor.c` | (a) permissive code | MIT, stated in the header of the gist I fetched. The gist says it is adapted from Chromium's `DynamicsCompressorKernel`. (verified: https://gist.github.com/rweichler/21e34fb127d6021d4660b16ed13ce0e2) |
| 3 | Airwindows compressors as a second DSP source | (a) permissive code | MIT per the main repository listing and DeepWiki. I did not confirm per-file licences for individual compressors. (verified: https://github.com/airwindows/airwindows) (verified: https://deepwiki.com/airwindows/airwindows) |

Other items from my round 1, classified for completeness:

- (b) copyleft: LSP Plugins, LGPLv3 per the README I fetched. Reference only. (verified: https://github.com/lsp-plugins/lsp-plugins)
- (c) published algorithm or paper: the Giannoulis/Massberg/Reiss compressor-design paper (JAES 2012, abstract seen only); the compression curve and release zones as embodied in the sndfilter port; The Glue's published control spec.
- (d) closed binary: Kickstart 2, Duck / Duck 2, The Glue, FabFilter Pro-C 2, TDR Kotelnikov, the SSL G-bus emulations. Reference listening and control lists only.

### O2 Q1 (to H1-H4, S1-S4): one row per top-three device

| Device | Source available | Licence (SPDX if a page showed it) | Browser build | Defining parameters, mapped to our spec names |
|---|---|---|---|---|
| In-house `sidechain` (extended) | repo: `BUILD.sidechain` in `studio/processors.js` | none (repo has no LICENSE) | native nodes (GainNode scheduling); no worklet | `depth` 0..1; `attack` 0.001..0.1 s; `hold` 0..0.5 s; `release` 0.01..2 s (all existing); proposed `curve` 0..1; proposed `offset` -0.02..0.02 s; proposed `retrigger` behaviour (no spec entry, see section 2) |
| Keyed glue compressor (proposed) | structure from sndfilter (gist above) | MIT (sndfilter header) | AudioWorklet (O2 items 17-18; render in `OfflineAudioContext` untested) | full list in the Q9 answer below |
| Kickstart 2 (closed reference) | closed | not applicable | none | From search-result text: `curve` (16 curves, index 0..15 by my mapping), draggable slope (maps to `release`; range not found), `mix` (range not found), tempo-synced timings, `splitFreq` for the built-in band split (range not found), trigger mode MIDI / audio. (verified: https://musictech.com/news/nicky-romero-cableguys-kickstart-2-plug-in/) |
| Duck / Duck 2 (closed reference) | closed | not applicable | none | From search-result text: speed and depth of a drawn curve (ranges not found); low/high band depths with adjustable crossover; lookahead (v1) or a single offset in ms or samples (Duck 2); MIDI-note range filter; velocity-to-depth (Duck 2 only, per search summary). (verified: https://www.kvraudio.com/news/45183) (verified: https://rekkerd.org/?p=214606) |
| The Glue (closed reference) | closed | not applicable | none | From a third-party spec page: `attack` 0.01..30 ms; `release` 0.1..1.2 s plus Auto; `ratio` steps 2, 4, 10; `scHp` 0..2 kHz at 6 dB/oct; `range`; `mix`. Threshold range not found. (verified: https://blog.dubspot.com/plugins/compare/the-glue-vs-unisum) |

### O2 Q3 (to S1-S4): which of my parameters plausibly move over time, and the measurement

What I can say from the evidence:

- **Duck depth and release per section.** Plausible but unmeasured. The only measurement (O1 M4) averages over 20+ bars and says the pattern is "the same in all four quarters of the bar". O1 also found the sub drone's band power about 10 dB lower in the break (M4); that is level, not depth.
  - Measurement: fold the 22-50 Hz sub-band RMS on the 21,000-sample beat (O1 M0 shows the grid is sample-exact, with T0 = 0.568 s) at 5 ms resolution, separately per section. Compare trough depth and recovery time across sections.
  - Resolution test: also fold per bar within a section. If the bar-to-bar spread of the trough is small compared with the section-to-section spread, per-section `set` is enough. If not, per-bar values are needed.
  - Result for now: I assume per-section `set`/`ramp` suffices. No evidence yet supports finer lanes for ducking.
- **Duck triggers.** These change by pattern, not by parameter. The kick patterns in `song.js` include a fill pattern `F` ('x...x...x...x.xx') and a half-time `H` ('x.......x.......'). The `duck` list triggers the ducker on every kick event, so the pattern change already changes the ducking. No automation lane is needed for that.
- **Glue compressor.** Nothing here shows time-varying glue settings. The crest factors in O1 M9 (10.6 to 14 dB per section) mix content and compression, so I cannot attribute them to a glue setting without stems. I treat the glue as static, and that is an assumption, not a finding.
- **Master high-pass and low-pass sweeps and send levels** belong to S3/S2. I add nothing.

### O2 Q9 (to S1): specify a worklet compressor with a key input

**Contract.** Processors contract `{input, output, params, set, get, bypass, dispose}`. The AudioWorkletNode is created with `numberOfInputs: 2` (input 0 = audio, input 1 = key) and `numberOfOutputs: 1`. O2 verified that `numberOfInputs` and `numberOfOutputs` are accepted options (item 17 of `round2-O2.md`). Channel handling: I recall `outputChannelCount: [2]` is how an output is forced to stereo, but I did not verify it.

**Key input.** When the key input has no active connection, `inputs[1]` is an empty array (verified above). The processor must then use the audio input as its own detector source. So there is no separate "mode" flag needed for that case; I still list `key` as a parameter so the panel can show it.

**Parameters** (ranges in our `{min, max, value, unit}` form; ranges marked "proposal" are my design choices, not sourced; defaults marked "studio" are the current master glue values from `Processors.master`):

| Name | min | max | default | unit | Note |
|---|---|---|---|---|---|
| `threshold` | -60 | 0 | -14 (studio) | dB | as `BUILD.compressor` |
| `ratio` | 1 | 20 | 2.5 (studio) | | The Glue offers steps 2, 4, 10; keep continuous, with those as presets |
| `attack` | 0.00001 | 0.1 | 0.02 (studio) | s | The Glue spans 0.01 to 30 ms |
| `release` | 0.02 | 2 | 0.25 (studio) | s | The Glue spans 0.1 to 1.2 s |
| `auto` | 0 | 1 | 0 | | 1 = program-dependent release using the four release zones (0.090, 0.160, 0.420, 0.980) found in sndfilter / the Chromium kernel |
| `knee` | 0 | 24 | 8 (studio) | dB | the native node's knee default is 30; the studio uses 8 |
| `makeup` | -12 | 24 | 0.5 (studio) | dB | as `BUILD.compressor` |
| `autoMakeup` | 0 | 1 | 0 | | 1 = sndfilter's `(1/fulllevel)^0.6` rule |
| `mix` | 0 | 1 | 1 | | parallel blend; the dry path uses the same delay as the wet path |
| `scHp` | 0 | 2000 | 0 (proposal; 0 = off) | Hz | first-order (6 dB/oct) high-pass on the detector input only, as The Glue |
| `scLp` | 200 | 20000 | 20000 (proposal) | Hz | detector low-pass, so a full drum bus can key from its kick (see below) |
| `lookahead` | 0 | 0.01 | 0.006 (proposal; matches the native node's fixed pre-delay) | s | audio delayed, detector reads undelayed, as in sndfilter |
| `hold` | 0 | 0.5 | 0 | s | Pro-C 2 offers up to 500 ms |
| `link` | 0 | 1 | 1 | | stereo link; The Glue uses 25% steps |
| `key` | 0 | 1 | 0 | | 0 = detector from the audio input; 1 = detector from input 1 |
| `bypass` | 0 | 1 | 0 | | |

**Port message.** The processor posts gain reduction in dB to the main thread every 8 render quanta (128 frames each; about 21 ms at 48 kHz) so the device panel can draw a meter. The native node's `reduction` is read-only and is read from the main thread, so this is the worklet equivalent. I assume a message every 21 ms is smooth enough for a meter; I did not test it.

**Detector source.** The gain computer and release zones come from sndfilter (MIT, fetched). I fetched the gist, not the project home. It documents: a delay-line pre-delay with the gain computed from the current sample; a soft knee solved by bisection; adaptive release via a cubic through four zone points; attack/release handling; sine shaping of the gain; makeup `(1/fulllevel)^0.6`. Reasons to start there: it is the same family as the native node the studio uses today, so the existing master tuning (threshold -14, ratio 2.5, knee 8) should carry over, and the swap can be A/B tested against the native node. The detector high-pass, hold, mix, key and meter are my additions. The Giannoulis/Massberg/Reiss log-domain topology (detector after the gain computer) is the alternative when a different, published-paper design is wanted. I have only its abstract. Airwindows is the third source; I did not read any Airwindows compressor code, so I cannot say which would suit a keyed bus.

**How `duck: [...]` maps when the key is an imported stem rather than a scheduled kick.**

Today `duck` calls `trigger(t)` on each listed track's `sidechain` processor at every kick event, so a stem the sequencer does not schedule cannot drive anything. Two paths, which can coexist:

1. **Scheduled path (unchanged).** The `duck` list stays as is for synthesised kicks. It is cheap and sample-exact, and it reproduces the same curve every time.
2. **Key path (new).** Add a per-track `keyFrom: '<track name>'` in the sequencer. The sequencer connects the key track's post-fader tap to the target's key input (input 1 of the keyed processor). For a scheduled kick this works too, so a `duck` list could be compiled into `keyFrom` when the key is audio.
   - A kick stem from S5's separator is best. A full drum bus can also key if `scLp` is set to roughly the kick's body range (the kick body is 50 to 260 Hz per O1 M1). The value is a starting point; it needs a listening test.
   - Two ways to turn the key into gain reduction, which differ in character:
     - **Compressor-style**: the keyed compressor follows the key level. It will hold gain reduction as long as the kick's tail is above threshold (the kick body is full level for about 60 ms and then falls, per O1 M2), so the duck shape depends on the kick's decay.
     - **Onset-triggered curve**: detect a threshold crossing in the key and run the same attack/hold/release/curve generator as the scheduled ducker. The shape is then independent of the kick tail, and the parameters stay the fitted ones above. This is what the audio-trigger modes of Kickstart 2 and ShaperBox 3 are described as doing (ShaperBox 3: "the LFO restarts with each transient"; verified: https://www.synthtopia.com/?p=132647 and https://cableguys.com/volumeshaper, search-result text).
   - Recommendation: for imported stems use the onset-triggered curve, because it reuses the fitted `depth/attack/hold/release/curve`. Which of the two matches the reference is not known (see "Still open").

---

## 2. Revisions to my round 1

**Retracted.** In my round-1 "What the reference needs" section I repeated the spec's design decision that the sub is not sidechained. O1's measurement (M4) says the reference's actual sub is a free-running drone near 34.5 Hz that is ducked on every kick, and that the spec's "35 ms-delayed B1 sub" was the kick's own glide (M1 to M3). The `sub: { depth: 0 }` entry in `song.js` (and the spec's reasoning that a ducked B1 pluck "recovered audibly between beats") therefore describes a track that the reference does not contain. If H1 or H2 replaces the pluck with a sustained drone, that drone must be ducked, because a constant low sine under the kick would otherwise stay at full level through the kick body. This is my inference from O1's numbers; I have not rendered it.

**Ducker parameters** (replacing my round-1 advice to tune by feel). Use the fit in section 1:

- Sub drone: `depth 0.74, attack 0.004, hold 0.03, release 0.265` (linear), or `depth 0.76, attack 0.005, hold 0, release 0.27, curve 1` (dB-linear, `exponentialRampToValueAtTime(1, kickTime + 0.275)`).
- Bass, stab, pad, lead keep their current values (`depth 0.5, release 0.2` for bass and stab in `song.js`). **I have no measurement for them**, so I make no claim that those values are right. The drone's measured depth is deeper than 0.5, and I cannot say whether the other tracks differ.
- A timing observation from `song.js` that follows from the fit: bass steps 3, 7, 10, 14 fall 3, 3, 2, 2 sixteenths after the preceding kick (357, 357, 238, 238 ms), and stab steps 2, 6, 10, 14 fall 2 sixteenths after (238 ms). The fitted curve is within about 1.5 dB of fully recovered by 238 ms and fully recovered by about 275 ms. So on the main groove the ducker mostly shapes the tails and the sustained parts (pad, lead, drone), not the note onsets. This depends on the fit and on the bass and stab tracks being ducked the same way, which is unmeasured.

**Priority changes to my round-1 list.**

- Band-split (low-band-only) ducking drops in priority. Its motive was keeping the sub un-ducked while ducking the bass. If the sub is ducked anyway, a full-band duck on each track is enough until the bass is measured.
- Velocity-scaled depth drops. The kick pattern in `song.js` uses `x`/`X` accents but nothing shows that ducking depth follows kick velocity in the reference.
- Raised: a **retrigger fix**. In `BUILD.sidechain`, when a trigger arrives within `len` of the last one, the code calls `setV(g.gain, 1 - P.depth, t)`, which steps the gain straight to the trough from wherever the previous release had got to. With kick fills `'x...x...x...x.xx'` the last two kicks are 119 ms apart, shorter than the 244 ms default `len`. A downward step on a 34 Hz drone or a pad is an audible click risk. The fix is to ramp from the current value, either by computing the current curve value in JavaScript and scheduling from it, or by using `cancelAndHoldAtTime` (I recall it is not available in every browser; unverified). This is from reading the code, not from a render.
- Raised: a **key-routing** option, as described under O2 Q9.
- Added: a `curve` parameter (two values) and an optional `offset`. Offset (negative lookahead) is free in a sequencer. The data here do not need it (the first sample is 40 ms after the kick), so it is optional.

**Worklet compressor.** In round 1 I said an AudioWorklet glue was moderate-to-large effort. O2 has since verified from the spec: the native node has a fixed look-ahead delay (`DelayNode` of 0.006 s), no side-chaining, and the curve shape is left to the user agent (item 16 of `round2-O2.md`); an AudioWorkletNode takes `numberOfInputs` (item 17); and `audioWorklet` is a property of `BaseAudioContext`, so an offline context has one (item 18, no render tested). My round-1 "unverified" notes on these three are now closed except the offline render itself. What the compressor needs, in order:

1. A DSP core ported from sndfilter (known to match the native node's character, MIT).
2. The detector high-pass (first-order), the `lookahead`/dry-delay pairing for `mix`, and the `key` input handling.
3. A gain-reduction message for the panel.
4. Registration in `Processors` as a new type with the spec above, a stub in `selfcheck.js`'s fake AudioContext (per the repo's CLAUDE.md), and an `addModule` call before `startRendering` in `Sequencer.render` (O2 item 18).
5. A first A/B against the native-node master with the new processor set to match it (`scHp` 0, `lookahead` 0.006, `auto` 1, `mix` 1). Only then enable the detector filter.

**Master glue.** Nothing in the new measurements changes the glue spec. O1 M9 gives the reference's section crest factors (10.6 to 14 dB) and loudness (-10.7 LUFS integrated), which are scoring targets for the master chain, not a compression measurement.

---

## 3. On my partner's report (H1)

**Where kick and sidechain design must agree.**

1. **One trigger time.** The ducker is called with the kick's event time. If H1 adds a kick start offset or a delayed sub trigger (H1 mentions "a delayed trigger or a longer attack" for a 35 ms sub peak), the ducker must keep using the kick's own time `t`, not the sub's. O1 M0 puts the real kick onsets 11-13 ms before the spec's grid; both the kick and the ducker follow the same sequencer time, so a grid correction moves both together.
2. **The 35 ms sub peak.** H1 handed me the question of what the sidechain would do to it. Answer: there is no separate sub peak to protect. O1 M3 puts the 30-80 Hz peak 70-83 ms after the onset and attributes it to the kick's glide. The ducker only acts on tracks in the `duck` list, and the kick is not in it, so the kick's own tail is unaffected.
3. **A merged kick-with-tail voice.** O2 Q4 asks H1 about a single voice with a long tuned tail. If the tail and the drone are merged into the kick track, the drone would not be ducked, which contradicts the measurement (the drone is ducked -13 dB at 40 ms). So the drone must stay on its own track, with `duck` including it, and the kick voice should carry only the glide and its decay.
4. **Duck length against kick length.** The fitted duck is back to within about 1 dB by 275 ms. The measured kick body is full level for about 60 ms and then falls -18 dB at 150 ms and -34 dB at 200 ms (O1 M2). The drone is still -5 dB down at 159 ms while the kick is already -18 dB. So the duck outlasts the audible kick by about 75 ms. If H1 lengthens the kick's `decay` (default 0.3 in `song.js`), the `release` of the drone should be re-checked, or the duck will end while the kick is still sounding. This is arithmetic on O1's numbers, not a listening result.
5. **Glue interaction.** The master glue detector sees the kick. H1's kick `drive` and level changes (O1 section 1, row 3) alter how hard the glue works. If H1's retune lands, I would retest the glue threshold afterwards.

**Corrections I would make to H1.**

- H1's recommended retune (`punch` about 130, `tune` about 43, sub `decay` about 0.3, `harmonic` 0) rests on spec numbers that O1's measurements overturn: the pitch glide starts near 190 Hz and ends near 52 Hz with a time constant of about 24 ms, and there is no plucked B1 sub. H1 said it worked from code defaults and had not read `song.js`; that is the cause. I defer to O1 and H1 on the kick numbers.
- H1's handoff to me assumed a plucked sine sub that is not ducked. That premise should be dropped: the reference sub is a ducked drone (O1 M4).
- H1 flagged that its excerpts are search-result text only and gave no prices. I have the same limit and I did not re-check any H1 product row.

Nothing in H1's report conflicts with the ducking fit once those two points are corrected.

---

## 4. Still open

1. **Trough depth and shape.** The first measurement is 40 ms after the kick. The fit extrapolates the trough. A beat-folded 22-50 Hz RMS envelope at 5 ms resolution, per section, would show the true trough, whether there is a hold, and whether the release is linear or dB-linear. Owner: O1 (measurement), me (fit).
2. **Is -2 dB really 0 dB of ducking?** If the un-ducked drone level is higher than the plateau seen at 278 and 397 ms, the depth is deeper than 0.74-0.76. A section where the kick stops (the break has a lighter kick, `H` pattern) could show the un-ducked level.
3. **Kick-tail contamination.** The kick glide passes 44-50 Hz at roughly 170-180 ms (O1 M1), inside the 22-50 Hz band, near my 159 ms sample. I do not know whether O1's incoherent averaging removed it. If not, the -7 dB value at 159 ms is biased high.
4. **Bass, stab, pad, lead ducking is unmeasured.** The current `depth 0.5, release 0.2` has no source. O1's per-step attribution idea (P5) could test it; stems from S5 would be cleaner, if the separation keeps the ducking.
5. **Compressor-style or onset-triggered?** Does the reference's ducking depth follow kick level (compressor behaviour) or repeat a fixed shape (envelope shaper)? A test: compare the duck after the fill pattern's two close kicks (`'x...x...x...x.xx'`) with the duck after a single kick. A fixed-shape trigger retriggers; a compressor follows the summed level.
6. **Does an AudioWorklet render correctly in `Sequencer.render`?** O2 has not tested it, and neither have I.
7. **Classic compressor emulations, Faust signatures, ReaComp** are still not covered. The Faust Libraries page exists but I did not see its function signatures or licence.
8. **Licence decision** for porting sndfilter or Airwindows code is the owner's. Both show MIT in the sources I saw, and the repo has no LICENSE of its own.

## Sources

Opened or read this round:

- `/home/user/havantechno/docs/research/2026-10-23-plugin-gear/transcripts/round2-O1.md`
- `/home/user/havantechno/docs/research/2026-10-23-plugin-gear/transcripts/round2-O2.md`
- `/home/user/havantechno/docs/research/2026-10-23-plugin-gear/transcripts/round1-H1-kick-sub.md`
- `studio/processors.js` (`BUILD.sidechain`, `BUILD.compressor`, `master`) and `studio/song.js` (Guidance tracks)

URLs (all appeared in a search result or a fetched page; those marked "search text" I did not open):

- https://webaudio.github.io/web-audio-api/ (spec text through the Context7 index)
- https://aes2.org/publications/elibrary-page/?id=16354 (search text)
- https://faustlibraries.grame.fr/libs/compressors/ (search text)
- https://github.com/magnetophon/lamb (search text)
- https://gist.github.com/rweichler/21e34fb127d6021d4660b16ed13ce0e2 (opened in round 1)
- https://github.com/lsp-plugins/lsp-plugins (opened in round 1)
- https://github.com/airwindows/airwindows (search text)
- https://deepwiki.com/airwindows/airwindows (search text)
- https://blog.dubspot.com/plugins/compare/the-glue-vs-unisum (search text)
- https://musictech.com/news/nicky-romero-cableguys-kickstart-2-plug-in/ (search text)
- https://www.kvraudio.com/news/45183 (search text)
- https://rekkerd.org/?p=214606 (search text)
- https://www.synthtopia.com/?p=132647 (search text)
- https://cableguys.com/volumeshaper (search text)
