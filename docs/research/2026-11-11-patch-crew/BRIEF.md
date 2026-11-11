# Patch Crew brief: a 303, a Moog, a poly synth, and hardware-style windows

Roundtable group of the Soundsystem, opened 2026-11-11 ET by the coordinator. The owner's words: "Let's continue and start with adding a 303 and a Moog and afterwards a poly synth. I want the plugins to have a floating window with designs modelled after the synths and drum boxes, like Arturia and Roland Cloud."

## What is being built

1. **`tb303`**: the Roland TB-303 bass line as an instrument: one oscillator (saw or square), the 4-pole diode-ladder lowpass with its resonance behaviour, the single decay envelope with Env Mod, the accent circuit (accent raises level, shortens the filter decay and feeds the resonance-dependent accent sweep), slide (a fixed-time glide with the gate held), tuning.
2. **`modeld`**: a Minimoog Model D class mono synth: three oscillators with range and waveform, oscillator 3 usable as a modulation source, noise, the mixer (with overdrive when pushed), the 24 dB transistor ladder filter with emphasis and keyboard tracking, the filter and loudness contours (attack, decay, sustain; decay switch for release), glide, modulation mix.
3. **`juno`** (after the monos): a Juno-106/60 class six-voice poly: DCO (saw, pulse with PWM, sub, noise), highpass, the 24 dB lowpass with resonance, one envelope and a gate mode, LFO with delay, chorus I and II.
4. **Hardware-style windows** ("panels"): a device's floating window shows a panel drawn after the hardware: the TR-808 and TR-909 as whole machines (every voice's knobs in its column, the sixteen step keys), the 303's silver box, the Model D's tilted wooden-cheeked panel, the Juno's slider panel; the way Arturia's and Roland Cloud's plugin windows fill the window with the instrument. Controls are live (they write the same parameters as today's faces).

## Ground rules for the design

- **Looks, not marks.** Panels follow the originals' layout, colour and control shapes. They carry no Roland, Moog or other maker's logo, wordmark or model badge. Each carries Havantechno's own wordmark and a plain model name: HVT-808, HVT-909, HVT-303, HVT-D, HVT-106.
- **Sound first, from sources.** Every value in a spec is tagged manual, paper, source or prior, as the Box Crew did. Code may be ported from GPL-3.0, AGPL-3.0 or MIT projects with attribution in THIRD_PARTY.md (the repo is AGPL-3.0-or-later); quote each licence line you rely on.
- **The engine's conventions hold**: spec entries `{min, max, value, unit}`, `create(ctx, type, opts)` returning an instrument with `trigger(t, ev)`, `set/get`, `panic`, `dispose`, every voice in `inst._live`, nothing throws without an AudioContext, parameter locks through `inst.params`. Events carry `midi`, `dur`, `vel`, `accent`, `slide` (new: a step cell's `slide: true` reaches the instrument as `ev.slide`), `step`, `hit`.
- **A ladder filter needs sample-level feedback**, which Web Audio's BiquadFilterNode cannot give. P5 decides the architecture (an AudioWorklet filter or whole-voice worklets driven by AudioParam automation so offline renders stay deterministic, with a plain-node fallback for the Node checks' fake context) and builds the shared infrastructure once for all three synths.
- **Fetching**: the agents' WebFetch tool bypasses the session proxy; fetch pages with `curl -sS -L --max-time 30 "<url>"` in Bash and strip tags with python3 html.parser. Reachable: en.wikipedia.org, www.soundonsound.com, github.com, raw.githubusercontent.com, zenodo.org (others listed in the coordinator's log if added). reverb.com, Equipboard, Roland's site and ManualsLib refuse automated clients.
- **Shared tree**: never run git stash, checkout, reset or clean. Compare against HEAD with `git show HEAD:<path>`. No commits; the coordinator verifies and commits. Run checks directly and read exit codes.
- The owner's manuals are in the coordinator's scratchpad at `/tmp/claude-0/-home-user/341aa418-0695-5408-80be-331d2fec6cae/scratchpad/manuals/` (TR-808 service and owner's manuals, TR-909 service notes); never copy them into the repo.

## Roster

| Id | Model | Task | Files |
|---|---|---|---|
| P1 | Sonnet | TB-303 research and build spec: the circuit (oscillator, diode ladder, envelope, accent, slide), published analyses, open-source emulations with licences, the control set with ranges, the panel layout described for P4. | `transcripts/P1-303.md` |
| P2 | Sonnet | Minimoog Model D research and build spec: oscillators, mixer, ladder filter, contours, modulation, glide; published filter models (Huovilainen, Zavalishin, Välimäki and others); open-source emulations with licences; the control set with ranges; the panel layout for P4. | `transcripts/P2-modeld.md` |
| P3 | Sonnet | Juno-106/60 research and build spec (starts after the monos' specs land): DCO, HPF, VCF, VCA, envelope, LFO, chorus; open-source emulations with licences (Junox is a JavaScript worklet emulation); control set; panel layout. | `transcripts/P3-juno.md` |
| P4 | Opus | The panel system and the panels: `app/ui/panels.js` and `app/ui/panels.css` (new), the hook that lets a device's window show its panel, the TR-808 and TR-909 machine panels first, then the 303, Model D and Juno panels as their engines land. | `app/ui/panels.js`, `app/ui/panels.css`, `tools/panels-check.js`, `transcripts/log-P4.md`, minimal documented hooks in `faces.js` or `windows.js` |
| P5 | Opus | The engine: worklet infrastructure and ladder filters, `app/engine/classics.js` with `tb303` and `modeld` (then `juno`), the one-line fallbacks and load-order entries, checks, Chromium renders. | `app/engine/classics.js`, `app/engine/worklets/*`, `tools/classics-check.js`, `transcripts/log-P5.md`, minimal documented hooks listed in its brief |
| Coordinator | Fable | Brief, rulings, verification, commits, the report. | `transcripts/log-coordinator.md` |

## Parameter names (frozen here so P4 and P5 can work in parallel; P1 and P2 give the ranges and defaults)

- `tb303`: `tune`, `wave` ('saw' | 'square'), `cutoff`, `resonance`, `envMod`, `decay`, `accent`, `slideTime`, `level`.
- `modeld`: `tune`, `glide`, `glideOn`, `modMix`, `oscMod`, `filterMod`; `osc1Range`, `osc1Wave`, `osc2Range`, `osc2Wave`, `osc2Detune`, `osc3Range`, `osc3Wave`, `osc3Detune`, `osc3Keys` (oscillator 3 follows the keyboard or runs free as an LFO); `mixOsc1`, `mixOsc2`, `mixOsc3`, `mixNoise`, `noiseType` ('white' | 'pink'), `mixFeedback`; `cutoff`, `emphasis`, `contour`, `keyTrack1`, `keyTrack2`, `fAttack`, `fDecay`, `fSustain`, `attack`, `decay`, `sustain`, `decaySwitch`; `level`.
- `juno` (provisional until P3): `lfoRate`, `lfoDelay`, `dcoLfo`, `pwm`, `pwmMode`, `pulse`, `saw`, `sub`, `noise`, `range`, `hpf`, `cutoff`, `resonance`, `envAmt`, `vcfLfo`, `vcfKey`, `vcaMode`, `attack`, `decay`, `sustain`, `release`, `chorus` (0 | 1 | 2), `level`.

A researcher who finds a name here wrong or missing says so in the hand-back; the coordinator amends this list and tells P4 and P5.
