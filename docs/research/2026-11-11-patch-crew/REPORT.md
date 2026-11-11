# Patch Crew report: three classic synths and the hardware-style windows

Coordinator's report, 11 November 2026 (ET), from `BRIEF.md`, `transcripts/P1-303.md`, `P2-modeld.md`, `P3-juno.md`, the builders' logs (`log-P4.md`, `log-P5.md`) and `log-coordinator.md`, which records every check the coordinator ran with its exit code. Where a figure was measured only by the agent that built the thing, this report says so. Nothing was heard by anyone.

## 1. The question

The owner, 11 November: "start with adding a 303 and a moog and afterwards a poly synth. I want the plugins to have a floating window with designs modeled after the synths and drum boxes like Arturia and Roland cloud." Roadmap batch 2b: recreations of a TB-303, a Minimoog Model D and a Juno-style poly as instruments of the app's own engine, and panels drawn after the hardware for those three and for the TR-808 and TR-909 built in batch 2.

## 2. Result in one paragraph

All five instruments open in a floating window on a panel drawn after the hardware, carrying Havantechno's mark and a model name (HVT-808, HVT-909, HVT-303, HVT-D, HVT-106) and no maker's logo. The three synths are AudioWorklet instruments (`tb303`, `modeld`, `juno`) in one processor module, with a plain-node fallback for contexts without a worklet; they are in the "+ track" menu, render offline through the same chunked path as the rest of the song, and give the same samples twice. Every module check passes on one tree. What is measured against a reference, what is ported from open-source models and what is still a guess is listed below; no instrument has been compared with a real machine or with a recording of one.

## 3. What the research established

**TB-303 (P1).** Parameter ranges and the sequencer's behaviour (a note gated for half a step, slide as a held gate with a pitch glide and no envelope retrigger, accent raising level and adding a filter sweep that builds over consecutive accents at high resonance) from the open-source Open303 model (MIT) and published analyses. Two of the analyses P1 wanted (the accent-sweep circuit and the diode-ladder derivation) sat on hosts the sandbox blocked at the time; the hosts were allowed afterwards and a second pass has not been run. P1's panel description is from memory, not a photo.

**Model D (P2).** Knob laws taken from CA-72's published calibration data (GPL-3.0-or-later; measurements of a real unit: cutoff, emphasis, contour amounts and times, glide rates, mixer law, modulation depth), ladder models compared, and the licences of each candidate read. The parameter list was amended after P2: knobs are stored in the panel's own marks (cutoff −5 to +5, the rest 0 to 10) and mapped to physical values inside the engine; `modAmount` added; one decay switch. P2 notes the hardware is low-note priority.

**Juno (P3).** Slider laws, the DCO mix, LFO rate and delay tables, the HPF positions and envelope times from Junox (GPL-3.0-or-later) and Juno60 (MIT), with the places where sources for the 106 and the 60 disagree settled by P3's recommendation rather than measurement. No service manual and no dry recording of a real unit were available. P3's panel description is from the sources' text; the strip colours are unverified.

## 4. What was built

| Piece | Owner | Evidence |
|---|---|---|
| `app/engine/worklets.js`: loads the processor module once per context; `Host.start` and `Sequencer.render` wait for it | P5 | selfcheck 395; both monos report engine `worklet` in the app page (coordinator's run) |
| `app/engine/worklets/classics-processor.js`: `hvt-tb303`, `hvt-modeld`, `hvt-juno`; notes and knobs arrive as AudioParam automation; seeded noise | P5 | classics-check 110; two renders identical (P5) |
| `app/engine/classics.js`: `Classics.create/spec/has/types/values`, the event planner shared by worklet and fallback, voice allocation for the poly | P5 | classics-check 110 |
| `tb303`: filter, envelopes, accent, slide and square shaping ported from Open303 | P5 | held A1 at 54.96 Hz (coordinator); accent +8.0 dB at 0.6, slide reaching 90 % of the new pitch in 20 to 25 ms of a 60 ms slide, accent sweep building at resonance 0.95 (P5) |
| `modeld`: three oscillators, noise, the ImprovedMoog ladder (ISC), CA-72 laws | P5 | held A1 at 55.04 Hz (coordinator); self-oscillation within 0.3 % of the reference pitches from mark −3 to +1, slope −24.6 dB/oct, keyboard tracking 0 / 0.334 / 0.666 / 0.959 (P5) |
| `juno`: six voices and the two-mode chorus in one stereo processor; poly and unison; portamento | P5 | chords peak 0.47 to 0.66; left/right correlation 1.00 chorus off, 0.32 and 0.34 on (coordinator); pitch within 0.3 ct on all voices, PWM 50 / 27.6 / 5.1 %, envelope times within about 2 % of P3's table (P5) |
| Default output levels: a default patch with accents peaks under 0.9 | P5 after the coordinator's finding | 0.78 (303 line) and 0.80 (Model D line) in the coordinator's render, down from 1.30 and 1.42; two check rows guard it |
| `Host.audition(track, {midi, vel, dur})`: one note on a track's live instrument, no document change | P5 | selfcheck rows; returns true for both monos and false for an unknown track in the app page (coordinator) |
| `app/ui/panels.js`, `panels.css`: `Panels.define/for/render`, SVG controls (knobs with fluted or wedge styles, faders, stepped selectors, switches, lamp buttons, step keys, a keyboard) with drag, wheel, keys and one undo entry per gesture; a "Panel" view first in a device window | P4 | panels-check 116 |
| HVT-808 and HVT-909: machine panels over all the kit's tracks, step keys editing the selected voice, instrument select, tempo, start and stop, a VOICE TRIM strip for parameters the hardware lacks | P4 | screenshots seen by the coordinator |
| HVT-303: knob row; sixteen steps with note, accent and slide, a one-octave note row, a running light | P4 | screenshot seen |
| HVT-D: five sections, wedge selectors, rockers, wheels, a 44-key keyboard that auditions | P4 | screenshot seen; audition returned true on a key press in Chromium (P4) |
| HVT-106: slider panel from the engine's spec, lamp buttons, a C2 to C6 strip, bend drawn inactive | P4 | screenshot of the real device window seen; slider values reaching the engine (P4) |
| Electron child windows: document, editor, commit, transport and audition forwarded | P4 | 808 panel exercised under Xvfb by P4; not repeated |
| "+ track" entries for the classic synths; Remove track for drum and synth tracks; the menu above device windows | coordinator, in A4's file | system-editor-check 97; add, remove and undo, and the stacking, checked in the app page |

Final counts on one tree, run by the coordinator with exit codes read directly: classics 110, panels 116, selfcheck 395, synths 169, drums 342, faces 2495, system-editor 97, processors 92, step-view 72, widgets 157, analysis 39, browser 26. `tools/drums-score.js` reads 86 pass, 19 fail (exit 1) on two consecutive runs.

## 5. What is not verified

- Nobody has listened to any instrument, and none has been compared with a real machine or a recording of one.
- The 303's accent-sweep time constants and the soft clip in its filter feedback are priors; its resonance does not self-oscillate at maximum (P5's measurement).
- The Model D's passband sits about 2.5 dB under the reference table near the corner (it was tuned to the singing pitch instead); at cutoff mark +2 the singing pitch is 3 % flat; note priority is last-note where the hardware is low-note.
- The Juno: unison has no detune; bend is stored and does nothing; the filter is not oversampled; the chorus has no delay-line noise or filtering; the 106-versus-60 choices are P3's recommendations.
- The coordinator's own measurements cover pitch, peak level, stereo correlation and engine selection. P5's finer figures (slopes, envelope times, PWM, determinism) and P4's Chromium interactions were not repeated.
- The three synths have not been run in Electron; the panel keyboards have not been tried in a child window; audition keys are pointer only (no Tab access); touch input is untested.
- A full 200-bar render with both monos took 134 s against 95 s for the stock song (P5); with Juno tracks it has not been timed. No underrun measurement on a realtime context.
- The 303 and 106 panel layouts come from memory and from text, not photographs.

## 6. Decisions for the owner

1. Listen: the Render Room has an HVT-303 line, an HVT-D bass and HVT-106 chords, each at default-ish settings with no effects. Say what is wrong in your own words; the priors above are where to look first.
2. A dry recording of a real 303, Model D or Juno (even a few notes with the knob positions written down) would let the Ear Crew's scoring loop fit the priors, as it did for the song.
3. Photos of a TB-303 and a Juno-106 panel, or permission to work from ones you point to, would let P4 correct the layouts.
4. Note priority on the HVT-D: last-note as built, or low-note as on the hardware.
5. Whether the Juno should gain the delay-line noise and filtering of the real chorus (the `chorusNoise` row exists and is off).

## 7. Files

`BRIEF.md`, `transcripts/P1-303.md`, `P2-modeld.md`, `P3-juno.md`, `log-P4.md`, `log-P5.md`, `log-coordinator.md`, `DISCUSSION.md`, this report. Code: `app/engine/worklets.js`, `app/engine/worklets/classics-processor.js`, `app/engine/classics.js`, the hooks in `host.js`, `sequencer.js` and `synths.js`, `app/ui/panels.js`, `panels.css`, the panel hook in `windows.js`, the bridge in `app.js`, the menu in `system-editor.js`, `tools/classics-check.js`, `tools/panels-check.js`, `docs/screenshots/panel-*.png`. Attributions: `THIRD_PARTY.md`.
