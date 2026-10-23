# S3: saturation, EQ and filters — round 3
Agent model: Sonnet. Date: 2026-10-23.

Marks as in my round 1. `[search summary]` means the fact comes from the search tool's summary of that URL, not from a page I read. `[local]` means I read the file in this repo. "O1 M#" and "O2 item #" cite the numbered measurements and items in `round2-O1.md` and `round2-O2.md`, which I read in full (O2's file via a saved copy of the tool output, all sections). I used 3 of the 4 allowed web searches.

New work this round: a numpy simulation of the studio's `bass` voice (not of the reference). The script is in the session scratchpad, not the repo. Its assumptions are listed in section 2 and its numbers are labelled "my sim".

## 1. Answers

Questions addressed to S3: O1 Q4 (shared with H2) and Q12; O2 Q1, Q3 and Q11.

### O1 Q4: which studio element first, and is the biquad lowpass `Q` in dB?

**Q in dB: confirmed.** MDN's `BiquadFilterNode.Q` page says that for lowpass and highpass the value is interpreted in dB, and its `type` page calls them "standard second-order resonant" filters with 12 dB/octave rolloff (verified: https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/Q [search summary]; https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/type [search summary]). O2 item 14 reports the same wording from the Web Audio specification (verified by O2: https://webaudio.github.io/web-audio-api/; I did not re-read it). Consequences for the code:
- `bass res: 3` is a 3 dB peak.
- A `peq` or `filter` device that exposes a linear Q must convert for LP/HP bands (`dB = 20·log10(q)`) and not convert for peaking and notch bands.

**Which element first: the bass voice, then the kick drive, then the master saturator.** The reason is the band budget in the intro, where only kick, sub and bass play (`song.js` intro section `play: kick, sub, bass`).
- Target: 300 Hz–1 kHz relative to 20–300 Hz is −24.3 dB in the intro (O1 M9).
- O1's sim of the bass alone gave about −12 dB. Mine gives −12.7 dB (my sim; same code, so this confirms the reading, not the reference).
- O1's sim of the kick alone with drive 0.45 gave −28.1 dB.
- Illustration (my assumption: bass low-band energy equals kick+sub low-band energy). The mix ratio is then about −15.5 dB. Hitting −24.3 dB needs the bass at about −22 dB on its own, with the kick left as is. The bass is the only element that is 10 dB away; the kick is within a few dB of its share.

**Per-step attribution, studio side.** On the studio side no least-squares fit is needed: render with each track muted (`Sequencer` tracks have mute) and take the difference in band energy. That is exact. O1's least-squares fit (P5) is only needed for the reference side. The sharpest reference-side test is the bass-only window: with the kick on steps 0, 4, 8, 12 and the bass on steps 3, 7, 10, 14, the bass hit at step 3 lands 357 ms after a kick, when the kick body is 34 dB down (O1 M2). Measure the 300 Hz–1 kHz to 20–300 Hz ratio in the 110–225 ms window after each bass step in the reference (O1's M5 windows) and in the studio render. That gives the bass voice its own target. I have not run it on the reference (see section 4).

### O1 Q12 and O2 Q1: licence class and parameter table for my top three

My round-1 top three were Spectrum Thief, Pro-Q 4, and a group of open-source references. Given O1's and O2's rounds, I replace them with the three things the platform can use. The two round-1 closed tools stay as method references.

| Rank | Name | Class | Source available | SPDX or licence as shown | Browser build | Parameters that define it (mapped to spec names) |
|---|---|---|---|---|---|---|
| 1 | N-band parametric EQ from the Audio EQ Cookbook | (c) published algorithm | W3C Working Group Note: https://www.w3.org/TR/audio-eq-cookbook (verified: [search summary]) | licence of the note: not found | native: `BiquadFilterNode` (peaking, shelves, LP/HP, notch) | see O2 Q11 below |
| 2 | Airwindows saturation (Density, Console family) | (a) permissive | repository URL: not seen; Airwindows pages: https://www.airwindows.com/density3/ and https://www.airwindows.com/everyconsole/ (verified: [search summary]) | MIT, per Airwindows' own text and an LV2 port README (verified: https://code.volse.net/audio/plugins/airwindows-lv2-port.git/about/plugins/LV2/README.md [search summary]). One forum post reported source headers that said "All rights reserved" before being changed; check each plugin's header | none (C++). Static curves (sine, asin) map to `WaveShaperNode` tables. Stateful ones need an AudioWorklet | `curve` {tanh, sine, asin, asym}, `drive` 0–1, `asym` 0–1, `mix` 0–1, `tone` Hz, `trim` |
| 3 | Ableton Auto Filter (as design reference) | (d) closed | no | part of Live | none | `mode` {lowpass, highpass, bandpass, notch}, `circuit` {Clean, OSR, MS2, SMP, PRD}, `slope` {12, 24}, `cutoff`, `q`, `drive` (Drive appears for any non-Clean circuit). Numeric ranges: not found |
| ref | Spectrum Thief, Pro-Q 4 EQ Match | (d) closed | no | free closed / commercial | none | not mapped; method only |
| ref | ZL Equalizer, FreeEQ8, Chow Tape Model | (b) copyleft | https://github.com/ZL-Audio/ZLEqualizer, https://github.com/GareBear99/FreeEQ8 (both fetched in round 1) | AGPL-3.0 and GPL-3.0 as shown on those pages. Chow Tape Model: GPL-3.0 (verified: https://github.com/jatinchowdhury18/AnalogTapeModel [search summary]); the iOS build is dual GPL/MPL-2.0 (same source) | none | read for method, re-derive |

Corrections to round 1, now sourced: Chow Tape Model is GPL-3.0 (it was "recalled" before). Surge XT is GPL-3.0 per the pages H2, H3 and S4 fetched, as O1 and O2 pointed out. I did not see that page myself.

### O2 Q3: which of my parameters move over time, at what resolution, and how to measure

Read from `song.js` sections 1–5 only; I did not read the later sections, so more automation may exist.

| Parameter | What `song.js` does | Resolution needed | Measurement on the reference |
|---|---|---|---|
| `master.hp.cutoff` | 24 Hz, then expo ramps 24→180 Hz (build, bars 8–16) and 24→500 Hz (a later section) | per bar, probably enough | Grid-synchronous average per bar. Take 1/3-octave band energies from 30 to 500 Hz and divide by the same bands from the section's first bar. The −3 dB crossing frequency of that ratio is the cutoff estimate. |
| `master.lp.cutoff` | 20 kHz → 1200 Hz over the last 8 bars of the break section (line 95) | per bar | Same method on 1–16 kHz bands, ratio to the section's first bar. |
| `stab.cutoff` | 400→900, 900→2400, 1500→300 Hz ramps; section `set` values | per bar | Spectral centroid of 300 Hz–6 kHz in the first 60 ms of each stab hit (steps 2, 6, 10, 14), averaged per bar. H3 owns the stab; I list it because it is a filter parameter. |
| `bass.cutoff`, `bass.env`, `bass.decay` | constant in what I read | within one hit (milliseconds) | Bass-hit window at step 3 (above): band-limited energy vs time at 100 Hz–1 kHz in 10 ms frames. This is the filter-envelope shape. |
| saturator `drive` / `mix` | constant | constant | Not directly measurable. Proxy: the level of harmonics 3, 5 and 7 relative to harmonic 1 at the bass hits, compared with a pre-drive render. |
| correction EQ bands | none today | per section | The targets differ by section (−24.3 dB intro, −8.5 dB break). A match-EQ fit must be written per section. |

Decision for the platform: section `set` plus `ramp` with `curve: 'expo'` is enough for the filter sweeps if the per-bar estimates fall on a smooth curve. A test: fit an exponential between the section's first and last bar and check the residual per bar. If the residual exceeds about 10% of frequency, add per-point lanes. The threshold is my choice, not from a source. The sweeps in the current arrangement came from the spec's "build" and "break" descriptions; I have not seen a measurement of them, so they may be wrong.

### O2 Q11: the N-band parametric EQ device a match-EQ script writes to

Constraint I checked in local code: `Sequencer.setParam` accepts at most three path segments for a track (`track.unit.param`, `studio/sequencer.js` lines 213–230), and `defineParams` takes flat names. O2's example `bass.peq.b2.gain` has four segments; the fourth would be dropped (`parts[1] + '.' + parts[2]`). So the band index has to be part of the parameter name:

- Path: `bass.peq.b2gain`, `master.peq.b2freq`. These resolve through the existing code with no change to the sequencer.
- Device type `peq`, built on `BiquadFilterNode`. Default 6 bands. The count is fixed at build time (a `bands` option), because nodes cannot be added during playback without a rebuild.
- Per band `n` = 1..6:
  - `bnType`: string, one of `peaking`, `lowshelf`, `highshelf`, `highpass`, `lowpass`, `notch`. Default: b1 `lowshelf`, b2–b5 `peaking`, b6 `highshelf`. String params are already supported by `defineParams` (as for `filter.mode`).
  - `bnFreq`: 20–20000 Hz, log-spaced defaults 80, 200, 500, 1000, 3000, 8000.
  - `bnGain`: −18 to +18 dB, default 0. Not used for highpass, lowpass or notch.
  - `bnQ`: 0.1–18 linear, default 1 (peaking 1.0 gives a moderate bell). For LP/HP types the device converts to dB before setting `biquad.Q`, per the MDN note above. Shelves ignore Q.
  - `bnOn`: boolean. Off sets the band gain to 0 (or passes through for LP/HP) by `target()` so there is no click.
- Device level: `out` trim −12 to +12 dB. No auto-gain (it would hide the level change the scoring needs).
- Automation: all params go through the existing `auto()` (setTargetAtTime), as `eq3` does, so section `set` and `ramp` work.
- `selfcheck.js`: already stubs the biquad node used by `eq3`; I did not open its stub to confirm which properties it exposes.
- The fit routine writes `bNfreq`, `bNgain`, `bNq` as plain parameter data per track and section. See section 2.

Ranges and defaults are my design choices, informed by `eq3` (±24 dB, 30 Hz–16 kHz) and the Audio EQ Cookbook; no source gives them.

## 2. Revisions to my round 1

### 2.1 The match-EQ idea as a concrete offline procedure

Round 1 said "compute, smooth, fit 3 to 6 peaking biquads". The steps below tie that to O1's grid and per-section targets. All steps run offline against `Sequencer.render` and the reference decode; nothing here is a plugin.

Targets (O1 M9, reference energy of 300 Hz–1 kHz relative to 20–300 Hz): intro −24.3, build −14.0, mainA −14.7, mainA2 −13.7, break −8.5, mainB −11.2, outro −14.3 dB. The reference is a 192 kbps MP3 decode and the section windows are O1's, set from the spec's form times; boundaries were not detected.

1. **Fix the grid and windows.** Use O1's T0 = 0.568 s and the 126 BPM sample-exact grid (21,000 samples per beat). Use the same section windows for the render and the reference.
2. **Score two numbers per section, not one.**
   - R: the ratio above (O1's metric).
   - A: the absolute 300 Hz–1 kHz level after both signals are normalised to the same integrated loudness (libebur128 is MIT, per S4's fetch).
   - Why both: R has a denominator. The studio has a B1 sub that the reference lacks (O1 M4: the reference's real sub is a ducked 34.5 Hz drone), so a render can pass R by changing its low end, not its mids. If R passes but A fails, the denominator moved.
3. **Gap table.** G(section) = studio R − target R. Expect the largest gap in the intro, where my illustration above says the bass must fall about 10 dB.
4. **Attribute on the studio side by mute renders** (Q4 above). Record the contribution of bass, kick, stab, pad, clap and the master chain to the gap, per section.
5. **Fix at the source first** (section 2.2) until the gap in each section is within ±3 dB. Then re-attribute.
6. **Only then fit a correction EQ,** if a residual above ±2 dB remains:
   - Build the residual curve: the render's long-term average spectrum minus the reference's, smoothed to 1/3 octave, limited to 200 Hz–2 kHz.
   - Greedy fit: place a peaking band at the largest absolute residual, set Q from the width at half-height, set gain to the residual up to ±6 dB, subtract the band's own response (the Cookbook formulas give it), repeat up to 6 bands or until the residual rms is below 1.5 dB.
   - Fit per element first (bass, stab, pad). Fit on the master last, per section, and write the result into section `set`.
   - Re-render and re-score with step 2. Accept a band only if A and R both improve.
   - Thresholds (±3 dB first pass, ±2 dB to accept, 1.5 dB stop) are my choices.
7. **Why not just a master EQ.** The targets run from −24.3 dB (intro) to −8.5 dB (break). One static master cut that fixes the intro would over-cut the break and the mains. A per-element fix follows the arrangement automatically, because the intro contains only kick, sub and bass. This supports the round-1 warning that a master match-EQ hides the cause.

### 2.2 What to try first at the source

My sim (numpy): one bass note, B2 = 123.47 Hz, two band-limited saws at ±7 cents (additive), lowpass biquad with `Q` in dB (the Cookbook form with Q' = 10^(Q/20), from my memory of the spec, not looked up), cutoff 220 Hz, envelope `env` × velocity 0.8 decaying exponentially to the cutoff over 0.15 s, AHR amplitude (attack 3 ms, hold 95 ms from gate 0.8 × 119 ms step, release 60 ms), then the shaper `tanh(k·x)/tanh(k)` with `k = 1 + 40·drive`, then the bass `eq3` insert (+2 dB low shelf at 200 Hz, −8 dB high shelf at 1500 Hz). Ratio = energy 300 Hz–1 kHz over 20–300 Hz, over the whole note. It ignores the sidechain, the other tracks and the master chain. It is one note, not the reference. Treat differences of 1 dB as noise.

| Variant | 300 Hz–1 kHz vs 20–300 Hz (dB) |
|---|---|
| `song.js` as is (12 dB/oct, res 3, env 300, drive 0.15) | −12.7 |
| drive 0 only | −11.9 |
| env 0 only (drive 0.15) | −12.8 |
| env 150, drive 0 | −15.2 |
| env 0, drive 0 | −20.7 |
| env 0, drive 0, cutoff 160 | −24.2 |
| 24 dB/oct as two cascaded stages, both res 3 | −8.3 (worse) |
| 24 dB/oct, stage 1 at −3 dB and stage 2 at +3 dB, drive 0 | −14.6 |
| the same 24 dB/oct, drive 0, env 150 | −19.5 |
| drive moved before the filter, 12 dB/oct | −13.2 (but 1–4 kHz falls from −25 to −46) |
| square waves instead of saws, as is | −10.3 (worse) |

What this says, in order of effect:

1. **Filter envelope and drive together.** Each alone moves the band by about 1 dB; both off give −20.7 dB, and a lower cutoff on top gives −24.2 dB, which is the intro target (the illustration in Q4 says about −22 dB is needed from the bass). The mechanism for drive: the shaper sits after the filter, so tanh at k = 7 creates harmonics 3, 5 and 7 of 123 Hz at 370, 617 and 864 Hz, inside the band, and the lowpass cannot remove them. The mechanism for env: it opens the filter to about 460 Hz at the start of each hit, so harmonics 3 and 4 pass. Try first: `env` 300→0 to 150 and `drive` 0.15→0, one at a time and then together. This costs no new code.
2. **Move the drive before the filter** if some saturation is wanted. My sim shows the band barely changes (−13.2 dB) but the 1–4 kHz content collapses, so it removes the top-end fizz without fixing the mids. It is a structural change in `BUILD.bass` (a node order change), so it is a second step.
3. **Filter slope is a minor lever, and the naive version is wrong.** Cascading a second biquad with the same `res` doubles the resonant peak and made the band 4.4 dB hotter (−8.3 dB), not cooler. With the resonance split (first stage at −3 dB, second at +3 dB) 24 dB/oct gained 2.7 dB (−11.9 → −14.6 at drive 0). This does not support O1's and O2's reading that slope is the prime suspect; envelope and drive are. Keep slope as a spec option (`slope` 12/24, as O2 asked of H2) but try it third.
4. **Saw vs square: do not switch.** Square was hotter in this band in my sim (−10.3 dB). The square has no even harmonics, so less energy lands in the 20–300 Hz band (the 2nd harmonic at 247 Hz is lost) while the 3rd and 5th stay in the hot band. A triangle or a filtered saw plus sub would behave differently; I did not test either.
5. **Kick drive** is the next contributor after the bass is fixed. O1's sim gave −28 dB for the kick alone, which looks small, but in the illustration it takes about a fifth of the intro budget. O1 M2 shows the drive also gives the right amplitude envelope (a close match to the reference decay). So do not just lower it: add an explicit hold-then-decay envelope, as O1 suggests, then lower the drive and re-score.
6. **Master saturator** (drive 0.12 → k = 5.8, mix 0.5) acts on the whole mix. By the same mechanism it turns 50–120 Hz content into harmonics at 250–900 Hz. I did not simulate it. The cheap test is a render with `master.sat.mix` at 0 and the difference in R. The master eq3 already has −1 dB at 400 Hz Q 0.8, which is small next to a 10 dB gap.
7. **The reference bass is dark.** O1 M5 lists reference peaks at the bass steps up to about 258 Hz and none in the 300 Hz–1 kHz band. That agrees with a nearly closed envelope and no post-filter drive, and it does not agree with the current 220 Hz + 300 Hz envelope. This is consistent evidence, not proof (4–9 Hz resolution, 192 kbps MP3).

## 3. On my partner's report (H2)

I read `round1-H2-bass.md` in full.

**Where bass synthesis and tone shaping must agree.**
- **Envelope depth and drive placement set the band, not the oscillator.** H2 flagged the 300 Hz envelope against a 220 Hz cutoff and asked whether the reference sweep is larger. My sim says the opposite risk: the reference looks darker than the studio (O1 M5), so the synth needs a near-zero envelope and no drive after the filter. H2's candidate synths (TAL-BassLine, Mz101, Surge XT, jc303, Vital) are all designed to sweep brightly. Use them as A/B only with the envelope closed.
- **Drive position.** H2 found the schwung-303 drive (a dm-Rat model, third-order op-amp IIR, 2x oversampling, asymmetric tanh with tilt EQ) and wrote "drive 0 bypasses". The question that matters here is where that drive sits relative to the filter. H2's page does not say, and I did not see it. If it comes before the filter, as in my variant 2, that matches the fix that keeps the character without the mid harmonics. H2 should check the jc303 and schwung-303 signal flow.
- **Cascading for slope.** H2 (and O1) suggest a 24 dB option. If H2's Open303 port exposes a 4-pole ladder, it gives 24 dB/oct with its own resonance feedback (not stacked peaks). That is better than cascading two biquads; my sim shows the naive cascade fails. H2 should say how the ladder's resonance is normalised.
- **Key tracking.** O1 M5 suggests the reference bass may play several pitches (partials near 98, 109, 138, 162, 183 Hz). A fixed cutoff passes more harmonics of a low note than of a high one. If the bass is not a single pitch, `BUILD.bass` needs a `keytrack` parameter. That is a tone-shaping consequence of O1 Q5 to H2.

**Corrections to H2.**
- H2 says the filter opens "to about 520 Hz". That is 220 + 300 at velocity 1.0. At velocity 0.8, which O1 and I assumed, it is 460 Hz. Small, but my sim uses 460.
- H2's "no electro-specific bass patch" and "resonance is a listening test" are fair. One addition: my sim shows resonance is not the lever (res 3 dB vs 0 dB changed the band by 0.1 dB at drive 0, env 0).
- H2's #1 pick, TAL-BassLine, rests on listings H2 labels unverified. As an A/B tool it cannot score the reference. The reference-side measurement at step 3 is what ranks any synth.
- H2's hand-off to me lists "drive curve and lowpass resonance model". I take these: drive curve = asymmetric tanh or sine as a `curve` option on the shaper; resonance = the Web Audio dB-Q biquad, with the doubling caveat above.

## 4. Still open

1. **The reference's own bass-hit ratio.** I have not measured the 300 Hz–1 kHz to 20–300 Hz ratio in the 110–225 ms windows after bass steps in the reference. Everything in section 2.2 targets the mix ratio. The bass-only number would say how far each variant must go. This needs the MP3 decode and O1's scripts, which I do not have.
2. **My sim is one note.** It ignores the sidechain (depth 0.5, release 0.2), the sub, the kick overlap and the master chain. The illustration of the mix ratio assumes equal low-band energy for bass and kick+sub, which I invented. A real render of the intro with mutes would replace both.
3. **Master saturator and kick drive contributions** are untested (steps 5 and 6 above).
4. **Whether a darker bass still reads as the right pluck.** Closing the envelope removes the "pluck" the code is built around. The reference decay shape at the bass steps is in O1 M5's windows but I have not seen it as a time curve. A time-frequency measurement of one bass hit (10 ms frames, 100 Hz–1 kHz) would settle it.
5. **Drive placement in jc303 and schwung-303** (H2 to check).
6. **Airwindows header status.** One forum report says some headers read "All rights reserved" before being changed. Check each file's header before porting. The chowdsp_utils licence (for `ADAASineClipper`) was not found.
7. **Worklets are not needed for this problem.** Envelope, drive removal, drive reordering, cascaded biquads with split resonance and the N-band EQ all use native nodes. The worklet decision (O2 owner decision 6) gates ADAA and dynamic EQ, not the 300 Hz–1 kHz fix.
8. **Section boundaries and the MP3 source.** O1's section windows come from the spec's form times, not from detected boundaries. Differences of 1–2 dB between sections may be partly window placement.

## Sources

Fetched or seen in this round (search summaries unless noted):
- https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/Q
- https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/type
- https://github.com/jatinchowdhury18/AnalogTapeModel
- https://code.volse.net/audio/plugins/airwindows-lv2-port.git/about/plugins/LV2/README.md
- https://www.airwindows.com/density3/ and https://www.airwindows.com/everyconsole/ (from round 1)
- https://www.w3.org/TR/audio-eq-cookbook (from round 1)
- https://webaudio.github.io/web-audio-api/ (cited by O2; not re-read by me)
- https://github.com/ZL-Audio/ZLEqualizer and https://github.com/GareBear99/FreeEQ8 (fetched in round 1)

Local files read:
- /home/user/havantechno/docs/research/2026-10-23-plugin-gear/transcripts/round2-O1.md
- /home/user/havantechno/docs/research/2026-10-23-plugin-gear/transcripts/round2-O2.md
- /home/user/havantechno/docs/research/2026-10-23-plugin-gear/transcripts/round1-H2-bass.md
- /home/user/havantechno/docs/research/2026-10-23-plugin-gear/transcripts/round1-O1-whys-and-hows.md (the bass and kick simulation notes)
- /home/user/havantechno/studio/synths.js (`BUILD.bass`, `voice`), `studio/song.js` (tracks, sections 1–5), `studio/sequencer.js` (`setParam`), `studio/core.js` (`defineParams`, `shaperCurve`), `studio/processors.js` (master chain)
