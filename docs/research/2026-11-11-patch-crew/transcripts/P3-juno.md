# P3: Roland Juno-106 / Juno-60 for the `juno` instrument (Patch Crew)

Agent P3 (Sonnet). Date 2026-11-11 ET. Rules: at most 10 page fetches and 6 searches. Used: 4 GitHub repository searches (search budget), and about 9 fetches (git clones of dzannotti/junox, pendragon-andyh/junox and pendragon-andyh/Juno60 each counted as one fetch; raw README/LICENSE of 106.js and youth106; raw docs of ultramaster_kr106; Wikipedia raw wikitext of Roland Juno-106). I did not read Roland's service notes or owner's manual (Roland's site and ManualsLib refuse automated clients); service-note numbers below are second-hand through the emulation authors, marked as such. Nothing was downloaded into the repo; clones and notes are in the session scratchpad. No host refused or failed to resolve, except `api.github.com/.../git/trees` (rate limited, not needed after cloning).

Evidence tags: **manual** (a Roland document, second-hand unless stated), **paper** (a written analysis), **source** (read from code), **prior** (memory or an earlier crew file, unverified). Where sources disagree, I give both.

## 0. Headline findings

1. **Junox is GPL-3.0**; the repo with the work is `pendragon-andyh/junox` (the AudioWorklet Juno-60). `dzannotti/junox` is a different, unrelated project with the same name ("A really not great emulator of a Roland Juno 60", GPL-3.0). Details in section 7.
2. **The best open data is a measurement repo**, `pendragon-andyh/Juno60` (MIT): envelope times, HPF corner table, LFO delay table, chorus rates and delays, measured from a real Juno-60.
3. **The best Juno-106-specific source** is Ultramaster KR-106 (GPL-3.0, built from disassembly of the 106's voice CPU) and Youth106 (GPL-3.0, a port of KR-106's 106 path plus service-note checks). Both are C++/Rust, not JS.
4. **Sources disagree on the 106's chorus.** Youth106 argues from the 106 jack-board circuit that I and II share one depth and differ only in rate (0.514 and 0.835 Hz); Junox's 60 analysis gives 0.513 and 0.863 Hz at a fixed depth; KR-106 gives a different depth per mode (plus or minus 0.5 and 1.1 ms). Section 5.
5. **Sources disagree on the 106's HPF corners.** Section 2.

## 1. The DCO

Facts:
- One DCO per voice (six voices). A digital counter divides a master clock, so pitch is stable; the waveform is made in the analog domain. [Wikipedia Juno-106 infobox: "1 DCO per voice (pulse, saw, square and noise)"; Juno60 repo DCO README: "The signal path is analog but the timing is driven by a digital clock"; manual/paper]
- Saw: a current source charges a capacitor and a comparator resets it; the ramp bows (finite impedance). KR-106 models this as `pos * (1 + 0.15 * (1 - pos))` with a small discharge blip. [source: KR-106 docs/DSP_ARCHITECTURE.md lines 27 to 36]
- Pulse: a comparator on the ramp against a PWM control voltage. KR-106: effective width `pw / (1 + 0.15 * (1 - pw))` to compensate for the bow (same file, lines 38 to 43). Youth106 says the same ("pulse is ramp above the PWM CV"). [source]
- Sub: a flip-flop divides the DCO by two, so a square one octave down. Junox gives it a decaying amplitude (`subOutput *= 0.998` per sample), a detail I could not corroborate. KR-106 puts a passive RC lowpass on it (coeff 0.45, about 4.2 kHz at 44.1 kHz). [source]
- Noise: white-ish, lowpassed. Juno60 repo Noise README cites the AR80017A clone note that the noise source is lowpassed at 5 kHz; Junox uses `new Noise(sampleRate, 5000)` (voice.js line 126); KR-106 uses an 8 kHz tilt filter. [paper, source]
- Range 16', 8', 4': factors 0.5, 1, 2 on the DCO frequency. Junox `dcoDetuneFactor = this.patch.dco.range` (junox.js line 128 area) with 0.5, 1, 2 from the UI (ui/DCO/index.js in the dzannotti copy, lines 21 to 35). [source]
- Tuning: Junox says "Service notes explicitly says middle-A is 442" (dco.js line 19). Treat A=442 as the 60's service figure; the 106 is normally listed as 440 (prior). Keep `tune` in cents, default 0, reference 440.
- Mixing: pulse and saw are on/off switches, sub and noise are sliders (user brief; Junox UI has the same split). Junox gain per source: saw 0.2, pulse 0.2, sub `subAmount * 0.195`, noise `noise * 0.21`; when the sum exceeds 0.26 the mix is scaled by `0.26 / (0.26 + (sum - 0.26) * 0.3)` (junox.js lines 239 to 252). So the DCO level compresses when sources stack. [source]
- Phase: Junox restarts the phase at each note (`currentPhase = 1.1`, dco.js line 24); Youth106 says the 8253 counters free-run, so the phase never restarts and unison voices sit at fixed arbitrary phase offsets. [source / paper, conflict; the free-running behaviour is the 106 firmware view and the more authoritative]

PWM sources (what each source does):
- Manual: width from the PWM slider. 
- LFO: width = slider times the unipolar LFO. Junox: `pulseWidth *= lfoOut * 0.5 + 0.5` (voice.js line 168); KR-106 `pwmSlider * (lfo + 1) * 0.5` (lines 324 to 330). [source, agree]
- Envelope (Juno-60 only; the 106 has MAN and LFO): `pwmSlider * envelope` (Junox voice.js line 170). Wikipedia: JU-06A has "the envelope-controllable pulse-width-modulation of the 60". [source, prior]
- Width range: Junox maps slider to duty `0.5 - 0.45 * pw` (down to 5 percent; dco.js line 45); the dzannotti fork `0.5 + value * 0.45` (params.js line 3). So the slider spans 50 percent (square) to about 5 percent / 95 percent. Youth106 notes the 106's PWM slider range is 0 to 105 in its firmware units. [source]
- On the 106, the LFO PWM depth comes from the PWM slider; the 60 behaves the same.

DCO LFO (vibrato): Junox `lfoOut * pitchLfoModDepth * 0.25` octaves, which is plus or minus 300 cents ("page 14" of the 60 service manual per the code comment); Youth106 states the service-note figure for the 106 as plus or minus 400 cents. [source, conflict]. Pitch bender: plus or minus 700 cents in Junox for the 60; KR-106/Youth106 make the bender range an adjustable number of semitones. [source]

## 2. Highpass and lowpass

### Highpass (global, after the voices)
Four positions. Corners by source:

| Pos | Juno-60 (Juno60 repo, from R and C) | Juno-106, Juno60 repo (from a KVR thread) | Youth106 | KR-106 | Junox code |
|---|---|---|---|---|---|
| 0 | none | low shelf +6 dB below 65 Hz | boost | +10 dB below 150 Hz | 0 (no filter) in the dzannotti fork; slider continuous in pendragon |
| 1 | 154 Hz | flat | flat | flat | 250 Hz |
| 2 | 339 Hz | 225 Hz | 236 Hz | 240 Hz | 520 Hz |
| 3 | 720 Hz | 720 Hz | 754 Hz | 720 Hz | 1220 Hz |

All first-order (6 dB/oct). Junox's own numbers (140/250/520/1220 in `curveFromHpfSliderToFreq`, junox.js line ~305) differ from the measured table in the Juno60 repo; I trust the repo's README (derived from F = 1/(2 pi R C)) over Junox's constants. Spec choice: 106 positions 0 to 3 as `boost` (low shelf +6 dB at 65 Hz), `flat`, 225 Hz, 720 Hz; a `hpfSet` switch for 60 flavour is optional. [paper; conflict noted]

### Lowpass (24 dB/oct, IR3109 on the 106, 80017A on the 60)
- Four OTA stages with feedback; resonance up to self-oscillation. (Wikipedia: "Analog 24 dB/oct resonant low-pass, non-resonant high-pass"; KR-106: "TPT ladder filter with OTA saturation"; Youth106: IR3109 4-pole OTA ladder, BA662 loop.) [paper]
- Junox filter: Pirkle-style virtual-analog Moog ladder (`ladderFilter.js` lines 50 to 89): `k = 4 * resonance`, `xin = (input - k * feedback) / (1 + k * alpha^4)`; self-oscillation at resonance 1. Cutoff law in voice.js lines 180 to 192:
  - `cutoffDetuneOctave = filterCutoff * 200 / 12` (slider 0 to 1 spans 16.7 octaves)
  - envelope: `modEnvOut * filterEnvMod * 12` octaves (plus or minus 12)
  - LFO: `filterLfoMod * lfoOut * 3.0` octaves (junox.js line 143, comment "plus or minus 6 octaves (section 8.7)")
  - key follow: `filterKeyMod * 5 * (note - 60) / 60` octaves (voice.js line 209)
  - resonance adds `resonance * 0.5` octave (compensating that resonance lowers the cutoff)
  - `cutoffFrequency = 7.8 * 2^sum` Hz
  [source]
- Official figures via Youth106 (checked against the 106 service notes, second-hand): cutoff 5 Hz to 50 kHz; envelope plus or minus 14 octaves; LFO plus or minus 3.5 octaves; keyboard follow +3 / -2 octaves; VCA level plus or minus 10 dB. [paper]
- KR-106: `log(Nyquist) * envelope * vcfEnv * 0.73`, `log(Nyquist) * lfo * vcfLfo * 0.2`, final cutoff clamped to 20 Hz to 0.82 Nyquist; resonance `k = res * 4.5`; seed the filter state on note-on at high Q; add tiny thermal noise so a silent input can start self-oscillation (KR-106 docs lines 122 to 139). [source]
- Envelope polarity: a switch on the 106 (positive/negative); Junox `modPositive`. Both Junox and KR-106 apply it as a sign on the amount. [source]
- Keyboard follow centre: Junox centres at middle C (60) in the pendragon version (and C2 minus 0.4 in the dzannotti fork; the fork is cruder). Pick middle C.
- Resonance behaviour to reproduce: the passband level drops as Q rises (ladder property); self-oscillation near top of slider; cutoff slides as resonance rises, compensated by the `0.5 * res` octave.

## 3. VCA and envelope

- One ADSR drives the VCF (amount with polarity) and the VCA (if mode ENV) and, on the 60, the PWM. Gate mode: a fixed fast envelope. Juno60 repo Gate README: attack 0.003 s, release 0.006 s; Junox `setValues(0.00247, 0.0057, 0.98, 0.0057)` (voice.js line 241); KR-106: about 1.5 ms ramp. [paper, source]
- Times, measured on a Juno-60 (Juno60 repo Envelope READMEs; slider 0 to 10; "slider values approximate"):

| Slider | Attack (s) | Decay (s, sustain 0) | Release (s) |
|---|---|---|---|
| 0 | 0.001 | 0.002 | 0.002 |
| 2.5 | 0.03 | 0.096 | 0.096 |
| 5 | 0.24 | 0.984 | 0.984 |
| 7.5 | 0.65 | 4.449 | 4.449 |
| 10 | 3.25 | 19.783 | 19.783 |

  The user guide gives 1 ms to 3 s attack and 2 ms to 12 s decay and release; the measured decay and release top out at about 19.8 s, so the guide and the measurement disagree (the repo's own note). [paper]
- Shapes: attack is an RC charge, `level = (1 - exp(-x)) / 0.632` over x from 0 to 1 (so it is normalised to reach 1 at the end); decay is `sustain + (1 - sustain) * exp(-3.5 x) - exp(-3.5)`; release `sustain * exp(-3.5 x) - exp(-3.5)`. Measured attack slope at slider 10: 0.224 at 0.5 s, 0.410 at 1.0 s, 0.716 at 2.0 s, 0.956 at 3.0 s. [paper] Junox implements these as piecewise segments (`juno60Envelope.js` lines 5 to 7 tables, 22 to 35 segments). The 106 firmware attack is linear and slightly overshoots (KR-106 docs line 165); the 60 is the RC curve. Choose the 60 curve as the default, both are small effects.
- Released-from-sustain: Junox shortens release to 10 ms when sustain is at or below 0.02 (juno60Envelope.js line 214).
- Gate vs ENV: Junox at VCA mode `gate` uses the fixed envelope above.
- VCA level slider: Junox `0.1 * 1.2589^(slider * 10)` (so 0 gives -20 dB, 10 gives 0 dB; junox.js line 273); Youth106 says plus or minus 10 dB.
- Retrigger: the single envelope retriggers per note on each voice; legato in unison retriggers from the current level in firmware (not read here).

## 4. LFO

- Triangle, global (shared by all voices), one per synth. Wikipedia infobox: "triangle with delay and rate". [manual]
- Rate (Junox, measured on the 60): points 0.3, 0.85, 3.39, 11.49, 22.22 Hz at slider 0, 2.5, 5, 7.5, 10 (junox.js line 284 `curveFromLfoRateSliderToFreq`). The dzannotti fork comment says 0 gives 0.3 Hz, 0.5 gives 3.5 Hz, 1 gives 21 Hz, consistent. Note `interpolatedLookup(slider * length, table)` in Junox with 5 points indexes by `slider * 5`, which looks like a bug at the top end; I would interpolate on `slider * (n - 1)`. [source]
- Delay (Juno60 repo LFO/Delay README, measured): delay before anything is audible and then a ramp:

| Slider | Delay (s) | Attack 0 to 1 (s) |
|---|---|---|
| 0 | 0 | 0 |
| 2.5 | 0.0639 | 0.053 |
| 5 | 0.85 | 0.188 |
| 7.5 | 1.2 | 0.348 |
| 10 | 2.786 | 1 (Junox uses 1.15) |

  Junox applies the delay-plus-attack to the LFO output (`lfoWithEnvelope.js`). [paper, source]
- Trigger modes: Auto (the delay restarts when the first key goes down after all were up) and Man (a trigger button / mod-lever restarts it). Junox `lfo.autoTrigger`; Youth106 and KR-106 describe the same. [source]
- Routing: DCO (vibrato), PWM (when mode LFO), VCF cutoff, via separate sliders; the LFO feeds nothing else. On the 106 the DCO and VCF depth sliders sit in the DCO and VCF sections, and the bender lever has its own sensitivity sliders (prior).

## 5. Chorus

Common ground: one triangle LFO modulates two bucket-brigade lines (MN3009 on the 106 per Youth106 and KR-106), one per output side, in antiphase; the dry signal is mixed in; mono input from the HPF/VCA output. [paper]

| Source | Mode I | Mode II | I+II | Delay range |
|---|---|---|---|---|
| Juno60 repo Chorus README (measured on a 60) | 0.513 Hz | 0.863 Hz | 9.75 Hz, mono | min 1.66 ms, max 5.35 ms (I, II); 3.3 to 3.7 ms (I+II) |
| Junox chorus.js lines 232 to 238 | 0.513 Hz | 0.863 Hz | 9.75 Hz | left 1.54 to 5.15 ms, right 1.51 to 5.4 ms; I+II left 3.22 to 3.56, right 3.28 to 3.65; dry 0.44 (wet 0.56) |
| Youth106 (argued from the 106 jack board) | 0.514 Hz | 0.835 Hz, same depth | none (60 only) | not stated |
| KR-106 | 0.513 Hz | 0.863 Hz | both | center 3.5 ms, plus or minus 0.5 ms (I), plus or minus 1.1 ms (II) |
| Service notes (second-hand, Juno60 repo) | 0.5 Hz | 0.83 Hz | "1 Hz" (likely 10 Hz) | |
| Juno-6 service notes (same README) | 0.4 | 0.67 | 8.06 | |

- Junox pre-filter 7237 Hz and post-filter 10644 Hz single-pole lowpass (chorus.js lines 133 to 135); the signal is saturated lightly (disabled in the code). KR-106: 15 kHz pre and post, plus a BBD bandwidth lowpass at `256 / (4 * delay)`. Juno60 repo: the BBD clocks at about 70 kHz so little bit-crushing; a 12 dB lowpass precedes the BBD; a non-linearity rounds the delayed saw. [source, paper]
- Stereo: the right line's modulation is inverted (opposite phase) so the lines move in opposite senses. Output = dry plus each wet line. [paper, source]
- Noise: Youth106 says a real 106 chorus adds a hiss that swaps slowly between left and right, because each MN3009 leaks more noise when its clock is slow and the two lines are swept in antiphase; Youth106 leaves it out by design, and offers an "Analog Noise" setting. [paper] Include as an option (default off).
- The existing engine chorus (processors.js lines 478 to 508) has equal sine LFOs, one base delay with the right line at 1.5 times, and depths of 3 ms; its comment already notes the Juno figures (base 3.5 ms, depth 1.85 ms) cannot be dialled in exactly. The `juno` chorus needs its own implementation (equal lines, triangle LFO, per-mode delay ranges), or the processor needs `shape: triangle` and a `ratio` parameter. Prior records: crate-crew round-3 file `2026-10-23-plugin-gear/transcripts/round3-H3.md` line 68 and log-A8.md line 21.

Recommended chorus constants (60 mode set from the measurements; 106 default from Youth106's circuit argument; mark conflict):

| Mode | LFO | Left delay (ms) | Right delay (ms) | Dry : wet |
|---|---|---|---|---|
| I | triangle 0.513 Hz | 1.66 to 5.35 | 1.66 to 5.35, inverted LFO | 0.44 : 0.56 (Junox) |
| II | triangle 0.863 Hz (60) / 0.835 Hz (106) | same | same | same |
| I+II (60 only) | triangle 9.75 Hz | 3.3 to 3.7 | 3.3 to 3.7, same phase, mono | same |

## 6. Voice assignment, portamento, unison

- Six voices. Junox: on note-on, reuse the voice with the same note; else add until six; else replace `voices[0]` (with a TODO to recycle the quietest). Crude. [source]
- Youth106: Poly 1 (release tails ring), Poly 2 (notes reuse voices, so only the latest note keeps its release), Mono = unison, all six voices on one note; both say assignment follows the 106's ROM firmware. Portamento: Youth106 has a time control; KR-106 cubic map `knob^3 * 3 s` (docs lines 303 to 320), per-voice glide in poly+portamento and all voices glide in unison. KR-106: no volume compensation in unison ("the hardware is louder"). Unison voices sit at fixed arbitrary phase offsets, not detuned (Youth106). The 60 has portamento only on later models; the 106 has it ("portamento on the 106" in the brief; prior).
- For the sequencer: events come with `midi`, `dur`, `vel`, `slide`. Map `ev.slide` to portamento on for that note. `vel` is ignored by the hardware (Wikipedia: velocity "No"); keep a `velSens` default 0 and let `vel` scale level only when it is above 0. Voice stealing: take the oldest released voice, then the oldest held.

## 7. Open-source emulations and licences

| Project | Licence, as stated | What it is | Use in an AGPL-3.0-or-later repo |
|---|---|---|---|
| pendragon-andyh/junox (https://github.com/pendragon-andyh/junox) | `LICENSE.md` is the GNU GPL v3 text ("GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"); `package.json` line 4: `"license": "GPL-3.0-or-later"` | JavaScript AudioWorklet Juno-60 ("JavaScript library that emulates the classic Roland Juno-60"). PolyBLEP DCO, Pirkle ladder VCF, measured envelope/LFO/chorus tables. Last commit 2024-10-10. | Yes: GPL-3.0-or-later code can be incorporated into an AGPL-3.0-or-later project; the combined work is under the AGPL, with attribution and a THIRD_PARTY.md entry. (GPLv3 section 13 and AGPLv3 section 13 allow the combination.) |
| pendragon-andyh/Juno60 (https://github.com/pendragon-andyh/Juno60) | `MIT-LICENSE.md` ("Copyright (c) 2015 Andy Harman and Pendragon Software Limited. Released under the MIT license. Please feel free to reuse the techniques developed in this project") | The measurement analysis (READMEs and WAVs). | Yes. The numbers are facts; cite them. The WAVs are samples of a real Juno; do not copy them into the repo. |
| dzannotti/junox | `LICENSE` is GPL-3.0; `package.json` `"license": "GPL"` (no version or "or later") | A different, cruder Juno-60 (README: "A really not great emulator"). Moog and diode-ladder variants, params.js curves. | GPL-3.0 only; usable by the same section 13 route, but nothing to gain over the pendragon one. Do not mix the two. |
| kayrockscreenprinting/ultramaster_kr106 | `LICENSE` is GPL v3 (README badge "License: GPL v3") | JUCE C++ Juno-6/60/106, firmware-based 106 path, ngspice-checked chorus, per-voice variance. | Reference for constants. Whether the repo's headers say "or later" was not checked; port nothing from it without reading the file headers. |
| nagualcode/youth106 | `LICENSE` is GPL v3 text; round-3 H3 (docs/research/2026-10-23-plugin-gear) read "GPL-3.0-or-later" on the page | Rust Juno-106 (VST3, AU, CLAP). Ports KR-106's 106 path. | Reference only (Rust). |
| stevengoldberg/juno106 ("106.js") | LICENSE returned 404; no licence | Web Audio Juno-106 (JS, old). | Do not use. |
| JohnnyRehab/JS106, gkpmpchffwpq/tal-j-8 | none stated by GitHub search | | Skip. |

Junox constants, with file and line (pendragon-andyh/junox, `src/junox/` unless noted):
- Envelope table points: `juno60Envelope.js` lines 5 to 7: attack `[0.001, 0.03, 0.24, 0.65, 3.25]`; decay and release `[0.002, 0.096, 0.984, 4.449, 19.783]`; attack segment `new AttackSegment(sampleRate, 0.632, 1.0, false)`, decay and release segments with constant `0.025` (lines 22 to 25).
- Filter: `ladderFilter.js` lines 50 to 89 (Pirkle TPT ladder, `k = 4 * resonance`); cutoff law `voice.js` lines 180 to 192 (above); `7.8 * Math.pow(2.0, vcfCutoffValue)` line 192.
- Chorus: `chorus.js` lines 232 to 238 (mode table above), pre and post filters lines 133 to 135, ring buffer length `sampleRate * 0.006` (line 132).
- DCO: `dco.js` line 20 (`442`), line 45 to 48 (pulse width and amplitude), lines 51 to 56 (saw `phase * 2 - 1` with PolyBLEP), lines 67 to 79 (sub flip-flop), `calcPolyBLEP2` lines 91 to 103.
- LFO delay and rate tables and HPF table: `junox.js` lines 284 to 306. VCA law: line 273. Mix gains: lines 239 to 252.
- Pitch bend and LFO depth: `junox.js` lines 130 to 143.

## 8. Panel (for P4; no logos or wordmarks)

Sources: the panel order below is from Youth106's README ("laid out in the Juno-106's own section order") and Junox's UI sections; control shapes, colours and positions are **prior** (memory of the hardware) and flagged UNVERIFIED. P4 should check against a photograph before final colours. I did not fetch a photograph.

Shape: a long, low panel, wider than tall (about 5.5 to 1 in the hardware; prior), dark body with a lighter strip of printed section names. Sliders dominate: vertical sliders with small flat caps, and illuminated push buttons for selections. Slider travel is long and thin. A pitch lever (bender) sits at the far left, left of the panel (on the real unit it protrudes from the left cheek; for the window, a small vertical lever with a spring-return mark).

Left to right, sections:
1. **Left cluster (performance)**: bender lever; two short sliders "bender" for DCO and VCF sensitivity (UNVERIFIED); a PORTAMENTO time slider; a mode group (Poly 1, Poly 2, Unison) and Hold; Tune knob; Transpose / Volume area (UNVERIFIED which ones are knobs).
2. **LFO**: RATE, DELAY sliders (two). Youth106 also has Auto/Man and a trigger button; on the real 106 the trigger is the lever/"man" switch.
3. **DCO**: LFO slider (vibrato depth), PWM slider, PWM source two-way (MAN / LFO), RANGE three-way buttons (16', 8', 4'), waveform buttons PULSE and SAW (two push switches; the 106 shows each as a small rocker or button with an LED), SUB slider, NOISE slider.
4. **HPF**: one slider with four detents (labels 0 to 3; position 0 is a low-boost icon).
5. **VCF**: FREQ, RES, ENV (with a +/- polarity switch beside it), LFO, KYBD sliders (five sliders, polarity switch).
6. **VCA**: LEVEL slider and ENV / GATE two-way switch.
7. **ENV**: A, D, S, R sliders (four).
8. **CHORUS**: OFF, I, II push buttons (two LEDs; both pressed gives I+II on the 60 only, not on the 106).
9. **Patch memory area**: number buttons 1 to 8, bank buttons 1 to 8 with A/B halves, MANUAL, WRITE/SAVE, and a small display or LEDs (UNVERIFIED which). The window can show 1 to 8 / A, B patch buttons wired to patch slots in the Project.

Colours (UNVERIFIED, prior): each section has a coloured line or strip over the sliders that ties its name to its sliders, in the same family used on other 1980s Roland panels (blue, orange, yellow, red, green stripes); push buttons are light grey with illuminated tops; slider caps are grey with a white index. Junox's UI uses LED variants white (pulse), yellow (saw) and orange (sub), which is Junox's own choice, not a statement about the hardware. Havantechno's wordmark plus the plain model name HVT-106 go where the maker's mark would be; the strip colours and button shapes can follow the hardware.

ASCII layout (not to scale):

```
+-----------------------------------------------------------------------------------------+
| bend  ||  LFO    ||   DCO                  ||HPF||    VCF           ||VCA ||   ENV   ||CHORUS|
|  /    ||  | |    ||  | |  [16][8][4]       || | ||  | | | | |       || |  ||  | | | |  || [I]  |
|  |    ||  R D    ||  LFO PWM MAN/LFO      || 0 ||  FRQ RES ENV LFO KY||LVL ||  A D S R  || [II] |
| port. ||         ||  [PULSE][SAW] SUB NOISE||3 ||        [+/-]      ||ENV/||           || [off]|
| mode  ||         ||                         ||   ||                    ||GATE||           ||      |
+-----------------------------------------------------------------------------------------+
|  tune  vol          patch buttons  1..8   bank A/B 1..8   MANUAL  WRITE      HVT-106    |
+-----------------------------------------------------------------------------------------+
```

## 9. Build spec table for `juno`

Provisional names from BRIEF.md, with changes. Slider position is written as `s` (0 to 1) when the panel works in 0 to 10; the physical value column gives the mapping. Defaults give a plain saw pad: one saw, filter half open.

| Param | Range | Default | Unit | Slider position to physical value | Basis |
|---|---|---|---|---|---|
| `lfoRate` | 0..1 | 0.35 | slider | piecewise-linear through (0, 0.3), (0.25, 0.85), (0.5, 3.39), (0.75, 11.49), (1, 22.22) Hz, interpolated on `s * 4` | paper (Juno60 repo measurement via Junox table) |
| `lfoDelay` | 0..1 | 0 | slider | delay s: (0, 0), (0.25, 0.064), (0.5, 0.85), (0.75, 1.2), (1, 2.79); then a linear fade over attack (0, 0.053, 0.188, 0.348, 1.0 s) | paper (Juno60 LFO/Delay README) |
| `lfoAuto` (new) | bool | true | | Auto: delay restarts on first key after all keys up; Man: restarts each note | source (Junox, Youth106) |
| `dcoLfo` | 0..1 | 0 | slider | vibrato depth = `s * 300` cents (Junox) or `s * 400` (106 per Youth106); use 400 | source/paper (conflict) |
| `pwm` | 0..1 | 0.5 | slider | duty = `0.5 - 0.45 * w`, where w = `s` (manual), `s * (lfo+1)/2` (LFO), `s * env` (env) | source (Junox, KR-106) |
| `pwmMode` | 'man' \| 'lfo' \| 'env' | 'lfo' | | 'env' is Juno-60 only; list it and mark the 106 panel without it | source |
| `pulse` | bool | false | | switch | manual |
| `saw` | bool | true | | switch | manual |
| `sub` | 0..1 | 0 | slider | level `s * 0.195` against saw 0.2 | source (Junox gains) |
| `noise` | 0..1 | 0 | slider | level `s * 0.21`, lowpassed at 5 kHz | source/paper |
| `range` | 16 \| 8 \| 4 | 8 | foot | factors 0.5, 1, 2 | manual |
| `hpf` | 0..3 (int) | 1 | position | 0: low shelf +6 dB below 65 Hz; 1: flat; 2: 225 Hz; 3: 720 Hz (first order) | paper (conflict: 236/754 Youth106; 240/720 KR-106) |
| `cutoff` | 0..1 | 0.6 | slider | `f = 7.8 * 2^(s * 200 / 12 + modsOct)` Hz, clamp 20 Hz to 0.8 Nyquist | source (Junox) |
| `resonance` | 0..1 | 0.15 | slider | ladder `k = 4 * s` (self-oscillates at 1); cutoff offset +`0.5 * s` octave | source |
| `envAmt` | -1..1 (rename from 0..1; the panel splits polarity switch + slider) | 0.4 | octaves | plus or minus 12 octaves (Junox) or 14 (service notes second-hand); use 12 until measured | source/paper |
| `vcfLfo` | 0..1 | 0 | slider | `s * 3` octaves (Junox) or 3.5 (service notes); use 3.5 | source/paper |
| `vcfKey` | 0..1 | 0.5 | slider | `s * 5 * (note - 60) / 60` octaves | source |
| `vcaMode` | 'env' \| 'gate' | 'env' | | gate: attack 3 ms, release 6 ms, sustain 1 | paper |
| `attack` | 0..1 | 0.1 | slider | s 0, .25, .5, .75, 1 = 0.001, 0.03, 0.24, 0.65, 3.25 s; RC shape `(1 - e^-x)/0.632` | paper |
| `decay` | 0..1 | 0.5 | slider | 0.002, 0.096, 0.984, 4.449, 19.783 s; shape `sus + (1 - sus) e^(-3.5x) - e^-3.5` | paper |
| `sustain` | 0..1 | 0.7 | level | linear level | manual |
| `release` | 0..1 | 0.35 | slider | same table as decay | paper |
| `chorus` | 0 \| 1 \| 2 (3 for I+II optional) | 1 | mode | table in section 5 | paper/source (conflict) |
| `level` | existing engine `level` | engine | | Add `vcaLevel` as in the hardware (plus or minus 10 dB) only if panels need it; otherwise skip | paper |
| `portamento` (new) | 0..1 | 0 | slider | time `s^3 * 3 s` (KR-106) | source |
| `voiceMode` (new) | 'poly1' \| 'poly2' \| 'unison' | 'poly1' | | Poly 2 reuses voices, unison all six on one note | paper |
| `bend` (new) | 0..12 | 2 | semitones | bender range for the Host's pitch bend, if added | source |
| `tune` (new) | -100..100 | 0 | cents | | prior |
| `chorusNoise` (new, optional) | 0..1 | 0 | | BBD hiss, slow left/right swap | paper (Youth106) |

Renames: none of the provisional names are wrong. Add `lfoAuto`, `portamento`, `voiceMode`, `bend`, `tune`, optional `chorusNoise`. `envAmt` becomes bipolar (no separate polarity param). `pulse` and `saw` are booleans. Drop nothing. The `level` param stays the engine's output level.

## 10. DSP block list

Per voice (six, plus stealing):
1. DCO: phase accumulator (free-running per voice, no note reset), saw (curved ramp or plain PolyBLEP), pulse by comparator with PWM, sub flip-flop with a gentle lowpass.
2. Noise: white lowpassed at 5 kHz, shared or per voice.
3. Mixer: source gains with the `0.26` compression rule.
4. VCF: 4-pole ladder (shared infrastructure from P5, sample-level feedback), cutoff law in section 2, resonance, seed on note-on.
5. VCA: envelope or gate level times note level.
6. ADSR: per-voice, drives the VCF amount (signed), the VCA, and PWM when mode 'env'.

Shared:
1. LFO: triangle, delay and fade, auto/man trigger, feeds DCO pitch, PWM, VCF cutoff.
2. Voice allocator and portamento.
3. HPF: first-order highpass or low shelf, by position.
4. Chorus: one triangle LFO, two modulated delay lines in antiphase, pre and post lowpass (7.2 kHz and 10.6 kHz as Junox or 15 kHz as KR-106), dry plus wet, optional noise.
5. Output level.

## 11. Behaviours to reproduce, and how to measure each

| Behaviour | Target | Measurement |
|---|---|---|
| PWM depth | duty from 50 percent down to 5 percent at pwm 1; with LFO, duty sweeps 50 to 5 percent | render a held pulse with pwm 1 mode 'man'; count the high fraction in one cycle; with mode 'lfo' and rate 3 Hz, log duty over time |
| Pulse and saw levels | sub at slider 1 is 0.195 vs saw 0.2; two sources together compress by the 0.26 rule | render saw only, saw plus pulse, compare RMS ratio |
| Sub | square exactly one octave below the DCO | FFT peak at f/2; waveform sign changes at half the rate |
| Filter slope | 24 dB per octave, resonance reaching self-oscillation at 1 | impulse or sweep through the voice with the saw off and noise on; slope above cutoff; with resonance 1 and silence, a sinusoid appears at the cutoff within 100 ms (the thermal-noise seed) |
| Cutoff law | `s = 0.5` at 7.8 * 2^(8.33) = about 2.5 kHz, key follow shifts `0.5 octave` per octave of note at max | sweep a sine through the filter, locate -3 dB |
| Envelope times | at slider ends: 1 ms attack, 3.25 s; decay and release 2 ms, 19.8 s | gate on a held note with sustain 0 and cutoff open; measure time from peak to 1/e^3.5 (3 percent) |
| Gate mode | attack 3 ms, release 6 ms | gate a short note, measure |
| LFO | rate table; delay before audible, then fade | log the control value at slider 5: delay 0.85 s, fade 0.19 s |
| HPF | position 2: -3 dB at 225 Hz, position 3: 720 Hz, position 0: +6 dB below 65 Hz | pink-noise through the chain, compare spectra |
| Chorus | LFO rates 0.513 and 0.863 Hz, delay swing 1.66 to 5.35 ms, left and right in antiphase; I+II 9.75 Hz mono | send an impulse train; track delay of the wet peak per side over a few cycles; check correlation of left and right wet parts is about -1 |
| Voice assignment | seven notes on six voices steal one; unison runs six voices on one note | count active voices through `inst._live` |
| Portamento | time constant `s^3 * 3 s` | step a note by an octave, measure the time to reach 63 percent |

## 12. Recommendation: port or rebuild

**Rebuild, borrowing selectively.** Junox is GPL-3.0-or-later and compatible with this AGPL-3.0-or-later project, so a port is legally fine, but its engineering does not fit: one global patch object with per-sample smoothed parameters instead of AudioParam automation, voice stealing that replaces `voices[0]`, no per-event parameter locks, a 60 (not a 106), a single Pirkle ladder with no oversampling or saturation, and DCO details I could not confirm on a 106 (phase restart on note-on). P5's worklet architecture and shared ladder filter replace most of it.

What to take from it, with attribution in THIRD_PARTY.md (Junox, GPL-3.0-or-later; Juno60 analysis, MIT): the measured tables (they are facts, and the repo is MIT), the PolyBLEP DCO functions (`dco.js` lines 91 to 103), the chorus structure and constants (`chorus.js`), and the mix compression rule. Use KR-106 and Youth106 only as references for 106-specific behaviour. Do not use the 106.js project (no licence).

What is not settled and needs a measurement against a 106 recording or the owner's sample material: the 106 chorus depth per mode (three sources disagree), the HPF corners (four sources), the DCO LFO depth (300 vs 400 cents), the envelope's linear vs RC attack on the 106, and the filter env and LFO octave ranges (12 and 3 vs 14 and 3.5).

## 13. Not verified / limits

- I read no Roland document. Every "service notes" figure is second-hand through Youth106 or the Juno60 repo.
- The panel colours and the left-hand cluster layout are memory (prior).
- Junox's `interpolatedLookup` implementation was not read in `utils.mjs`; my remark about the `slider * length` indexing is from the call sites only.
- The Juno-60 measurement WAVs in the Juno60 repo were not analysed; I read only the READMEs.
