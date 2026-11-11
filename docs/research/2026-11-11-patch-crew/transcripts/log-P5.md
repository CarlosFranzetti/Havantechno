# P5 log: worklet infrastructure, `tb303`, `modeld` (Patch Crew)

Agent P5 (Opus). Dates and times ET. Files owned: `app/engine/worklets.js`, `app/engine/worklets/*`, `app/engine/classics.js`,
`tools/classics-check.js`, this log; minimal hooks listed in section 3.

## 1. Design (written before coding)

### Decision: whole-voice worklet processors, one node per instrument, driven only by AudioParam automation

Each classic instrument owns ONE persistent `AudioWorkletNode` (processor `hvt-tb303`, `hvt-modeld`, later `hvt-juno`)
whose processor computes the entire voice per sample: band-limited oscillators (PolyBLEP), noise from a seeded
generator, the mixer, the ladder (oversampled), the envelopes, accent and slide / glide logic, the VCA. The main thread
never sends notes as messages. A note becomes automation on the node's AudioParams at the event time:

- `pitch` (MIDI note number, set at the note time; the glide / slide lag runs in the processor, an RC in the pitch CV),
- `gate` (0 / 1; held high through a slide or a legato overlap),
- `trig` (a counter: a change of value at sample n is a new contour trigger at sample n; no change = legato),
- `acc` and `vel` (latched by the processor at a trigger), `slide` (303: 1 while the incoming note slides),
- the knobs (`cutoff`, `resonance`, ...) as AudioParams too, so `set(name, v, {at})` and the sequencer's section
  sets and ramps land sample-accurately; enumerated knobs (`wave`, ranges, waveforms) are numeric params.

Reasons, against the alternative (a worklet ladder filter inside a native node graph, oscillators and envelopes as
native nodes):
1. Determinism: AudioParam automation is evaluated at exact sample frames in an OfflineAudioContext, so two renders of
   one pattern are sample-identical (the noise generator is a seeded LCG, reset per node, never Math.random).
   MessagePort traffic is untimed, so nothing that shapes the sound travels on it.
2. The 303's character lives in couplings a node graph cannot express: the accent sweep (an RC that charges from the
   envelope only on accented notes, with a resonance-dependent time constant, and builds on consecutive accents), the
   VCA fed by the main envelope, slide that must not retrigger anything. The Model D's single triggering, the mixer
   overdriving the ladder, oscillator 3 as a free-running modulation source of pitch and cutoff, and the feedback loop
   (`mixFeedback`) are likewise per-sample in one loop. In a hybrid graph each of these needs a separate approximation.
3. A mono synth is naturally one persistent voice: legato, slide, last-note handling and glide are state in the
   processor, not voice hand-offs between short-lived node groups. No node churn per note, so the 200-bar render
   costs one processor per track (CPU is linear in time, independent of note count).
4. One infrastructure for the three synths: the processor module carries shared DSP (PolyBLEP, ladders, envelopes,
   one-poles, halfband decimator, LCG noise); the poly `juno` adds a processor class whose voices are indexed params
   (`pitch0..5`, `gate0..5`, `trig0..5`) allocated on the main thread, same scheduling rules.

Costs accepted: the knob-to-param path needs a param per knob (fine: ~40 params max); parameter locks need
explicit writes (below); the fallback is a separate, approximate implementation.

### Module loading
- `Worklets` (app/engine/worklets.js): `Worklets.load(ctx) -> Promise<boolean>` adds the module(s) to that context once
  (cached per context in a WeakMap), `Worklets.ready(ctx)` is synchronous, `Worklets.node(ctx, name, opts)` returns an
  `AudioWorkletNode` or null (never throws). The module URL is resolved from the URL of worklets.js itself
  (`document.currentScript`), so it works from the browser server and from Electron's `havantechno://app/` scheme.
- `Host.start` awaits `Worklets.load(ctx)` before its first live rebuild; `Sequencer.render` awaits it on the new
  OfflineAudioContext before it builds the song on it (this also covers `Host.render`, which goes through it). A load
  that fails or a context without `audioWorklet` resolves false; the instruments then build the fallback and the
  console says so once.
- An instrument built on a context that is not ready (an early build before the load resolved) uses the fallback for
  its lifetime; the Host's rebuild after the load replaces it.

### Fallback (fake contexts, no AudioWorklet)
Plain nodes per note, clearly marked FALLBACK in the code: native oscillator(s), two cascaded lowpass biquads for the
24 dB slope (resonance mapped to the second biquad's Q), gain and cutoff envelopes as AudioParam automation, slide /
glide as frequency ramps. The same event planner (gate lengths, slide and legato decisions, accent latching) feeds both
paths, so the Node checks exercise the planner on the fallback and, with a stub `AudioWorkletNode`, on the worklet path.

### Events
- 303: ev.midi; a note is gated for half a step (the step length learned from ev.step and the trigger times, first
  guess from ev.dur); a tie (len > 1) keeps the gate to half a step before its end; `ev.slide` on note N holds the
  gate into note N+1, which glides over `slideTime` and does not retrigger the envelopes (accent of N+1 still applies to
  level and the sweep).
- Model D: overlapping notes (the next trigger lands before the previous note's end, `dur`) are legato: no contour
  retrigger, pitch moves to the new note (glide if on); a gap retriggers. `ev.slide` also forces legato into the next.
  Priority: the brief says last-note; P2 (Wikipedia, SEEN-PAGE) says the original is low-note priority. Built as
  last-note (brief); see section 5.
- Locks: a parameter differing from its set value at trigger time is written to the param at t and restored at the
  next trigger.

## 2. What I read (licence lines relied on)

- Open303 by Robin Schmidt, raw.githubusercontent.com/RobinSchmidt/Open303/master: `License.txt` ("The Open303 source code is released under the terms of the MIT license ... Copyright (c) 2009 Robin Schmidt (www.rs-met.com) ... Permission is hereby granted, free of charge, ..."), `Source/DSPCode/rosic_Open303.cpp/.h` (voice, getSample, triggerNote, slideToNote, calculateEnvModScalerAndOffset), `rosic_TeeBeeFilter.h/.cpp` (TB_303 mode, calculateCoefficientsApprox4), `rosic_DecayEnvelope.cpp`, `rosic_AnalogEnvelope.h`, `rosic_LeakyIntegrator.*`, `rosic_OnePoleFilter.cpp`, `rosic_EllipticQuarterBandFilter.*`, `rosic_MipMappedWaveTable.cpp` (fillWithSaw303, fillWithSquare303 and its constants). Ported to JS (MIT notice reproduced in the processor header).
- ddiakopoulos/MoogLadders `src/ImprovedModel.h` (ISC: "Copyright 2012 Stefano D'Angelo ... Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies."). Ported (notice reproduced).
- CA-72 (GPL-3.0-or-later) data only, through P2's section 14; I did not read the repository myself.
- P1-303.md (spec table section 4, the de-click gain bug), P2-modeld.md sections 9 to 14 (14.7 supersedes 9), BRIEF amendments and coordinator rulings.
- api.github.com and github.com tree pages are refused by the proxy (403); raw.githubusercontent.com works.

## 3. Files and hooks

New: `app/engine/worklets.js` (Worklets), `app/engine/worklets/classics-processor.js` (hvt-tb303, hvt-modeld; shared PolyBLEP/BLAMP, seeded LCG, one-poles, RBJ low-pass, Open303 elliptic decimator, Pade tanh, cached RC coefficients), `app/engine/classics.js` (Classics), `tools/classics-check.js`.
Hooks (each minimal):
- `app/engine/synths.js` create(): one line, falls back to `Classics` after `Drums`.
- `app/engine/host.js`: FAMILY tb303 bass, modeld bass, juno keys; `host.start` resumes in the gesture, awaits `Worklets.load(ctx)`, then sets live and rebuilds (start is now asynchronous whenever worklets.js is loaded; every caller already awaits the promise); `host.audition(track, {midi, vel, dur})` (coordinator's request for P4's panel keyboards).
- `app/engine/sequencer.js` render(): awaits `Worklets.load(octx)` before building the song on the OfflineAudioContext (covers Host.render). The build moved into an inner function; scheduling unchanged.
- `app/index.html`: worklets.js and classics.js after drums.js. `app/engine/selfcheck.js` load list (+ 3 audition rows: 392 -> 395). `tools/system-editor-check.js` load list. `app/CONTRACT.md` load-order line and a "Classics" section. `THIRD_PARTY.md`: Open303, ImprovedMoog, CA-72 data rows.
- Electron: `app/shell/main.js` serves every file under app/ (checked; not edited), so `havantechno://app/engine/worklets/classics-processor.js` resolves; the module URL is derived from worklets.js's own script URL. Not run in Electron.

`host.audition` while the transport runs: the note goes to the same instrument object the sequencer drives, at ctx.currentTime, without ev.step. On the monos it joins the event planner: it can make the next sequenced note legato (Model D: if it is still held; 303: never, it has no slide flag), its gate is cut or extended by sequenced notes, and the step-length estimate is untouched. On drums or polys it simply adds a voice. No document change, no undo entry; false when audio has not started or the track is unknown.

## 4. Constants and basis

tb303 (spec rows from P1, all 'source' except level 'prior'): tune ct -165..147; wave saw / square (square = Open303's tanh-shaped saw, high 47 %); cutoff 314..2394 Hz (Open303 measured c0, c1) with the measured env-mod scaler / offset; resonance skew (1-e^-3x)/(1-e^-3) and the TB_303 polynomials for k, b0 and the makeup g; decay = filter-envelope time constant in ms 200..2000 (accented notes 200 ms); amp envelope tau 1230 ms, release 1 ms (50 ms accented); VCA += (0.45 + 4 accent) x MEG while the gate is on; 200 Hz de-click low-pass at gain 1 (Open303's gain line is a bug, P1); slide tau = 0.2 x slideTime in Hz; hp 44.486 Hz before the ladder, feedback hp 150 Hz, all-pass 14.008 Hz, hp 24.167 Hz after; 4x oversampling with the elliptic decimator; cutoff clamp 200..20000 Hz.
P5 'prior' additions: the accent sweep RC is Open303's rc2 (15 ms) at resonance 0 rising to 100 ms at resonance 1 (the build-up across consecutive accents; coordinator ruling: internal extension, prior); a soft clip fb / (1 + 0.15 |fb|) in the feedback path; PolyBLEP oscillators at the 4x rate instead of mip-mapped tables; Open303's 7.5 Hz notch not built; outGain 0.5 (calibration).
modeld (P2 14.7 marks and laws, CA-72 data, 'source' unless the row says prior): rows as in `Classics.spec('modeld')`; mapping in `classics.js` LAW/MAP. P5 additions, all measured or design: ladder tuning correction fc / (1 - 5.1 fc / fo) and x 1.025 (measured, see 5); kCal 1.025 (mark 8 = k 4.1, the reliable onset of this ladder); drive 0.6 into the first stage's tanh (no separate mixer clipper, per P2 14.2); thermal seed noise 1e-6 so the ladder sings with no source; pink / red gains computed for equal RMS; contour attack as an RC toward 9.3/4.49 (filter) or 9.3/5.28 (loudness) of the peak; the dial labels below the 1 s mark scaled by the measured ratio (prior); shark-fin = tri-saw mix (prior); static oscillator offsets up to 2 ct and a 1.5 ct, 4 s drift walk, cutoff drift 0.01 oct (P2 14.3, seeded, deterministic); no passband makeup (P2 14.2: the bass loss is the instrument's). Note priority: last-note with return to a still-held note (brief and ruling); the hardware is LOW-note priority (P2, Wikipedia and CA-72). Glide acts only between held notes (overlap or ev.slide), per CA-72; a step sequence without ties or slides therefore never glides.
Not built: the 8 ms trigger delay (P2: option, default 0), pitch bend, the external audio input (mixFeedback is the output fed back through the external row's law), per-contour decay switches.

## 5. Checks and measurements (ET 2026-11-11)

Node (fake context), exit codes read directly:
- `node tools/classics-check.js`: OK 80 checks, exit 0 (spec rows and frozen names, mark laws, no-context API, Worklets without audioWorklet, fallback path: slide keeps the voice and glides with tau 0.2 x slideTime, accent level and filter peak, half-step gate, panic clears _live; worklet path with a stub node: trig counter, gate half a step, slide holds the gate and marks the next note legato, safety release, tie, accent latch, scheduled sets, live glides, locks written and restored, enumeration steps, panic, dispose; Model D legato by overlap, last-note priority with return, gate end, slide; processors run in Node: deterministic, accent louder, ladder sings at k 4.1 and not at 2.9, release with and without the decay switch, 303 glide reaches the slid pitch, 'stop' ends the processor; hooks).
- `node app/engine/selfcheck.js` OK 395 (was 392; +3 audition rows), exit 0. synths-check 169, drums-check 342, faces-check 2495, system-editor-check 97, processors-check 92, step-view-check 72, widgets-check 157, analysis-check 36, panels-check 110: all exit 0. `node tools/browser-check.js`: PASS 26, exit 0.

Chromium (Playwright, headless, served by tools/serve.js; scripts in the scratchpad `p5/pw/`), worklet path (`inst.engine === 'worklet'`, Worklets.load true), 44.1 kHz:
- 303 pitch (acf over 0.37 s): MIDI 24 / 36 / 48 / 60: -0.30 / -0.33 / -0.28 / -0.06 ct.
- 303 slide 36 -> 48 at slideTime 60 ms: 90 % of the Hz distance about 20 to 25 ms after the note (tau 12 ms predicts 27.6 ms; 10 ms analysis window); RMS across the joint 0.99 (no gap, no retrigger).
- 303 accent (knob 0.6): peak +8.0 dB, RMS +7.8 dB; knob 0: -0.3 dB, knob 1: +11.0 dB.
- 303 accent sweep, six consecutive accents (cutoff 500, envMod 0.3, accent 1), spectral-centroid peak per note: resonance 0.2: 479 567 564 556 555 563 Hz (settles at once); resonance 0.95: 557 720 778 764 767 777 Hz (builds over three accents).
- 303 filter decay (envMod 1, cutoff 314; log-centroid excess falls to 1/e): decay 200 / 400 / 2000 ms -> 120 / 240 / 1030 ms (a proxy; the centroid saturates at the long end).
- 303 resonance peak vs cutoff (note 24, envMod 0, after the envelope decayed; peak of the slope-corrected harmonics): knob 314 / 600 / 1000 / 2000 Hz (static cutoff 270 / 508 / 835 / 1637) -> peak 262 / 491 / 719 / 1374 Hz at resonance 0.5 and 294 / 523 / 818 / 1472 Hz at 0.95, 1.6 to 7.3 dB over the harmonic at half that frequency. Bass thinning: the fundamental falls 8.9 dB from resonance 0 to 0.5 and 9.4 dB to 1. At resonance 1 the voice is silent 0.5 s after release (rms 0): it does not self-oscillate.
- Model D pitch (osc 1, filter open): MIDI 36 / 48 / 57 / 72: -1.23 / -1.19 / -1.21 / -1.09 ct (osc 1's seeded static offset, by design).
- Model D white noise, emphasis 0, cutoff mark 0 (corner 680 Hz): re passband at 0.5 / 0.7 / 1 / 1.4 / 2 / 2.8 / 4 x: -2.1 -2.9 -5.5 -9.8 -15.9 -23.6 -33.3 dB (CA-72 reference -0.6 -1.2 -3.0 -6.7 -13.1 -21.0 -30.8: about 2.5 dB lower, because the tuning is set to match the singing pitch); slope 2x->4x -17.4 dB/oct (reference -17.8), 6x->12x -23.8, 6x->20x -24.6 dB/oct.
- Model D self-oscillation, emphasis 10, no source, cutoff marks -3..+2: 110.4 / 206.7 / 472.1 / 1074.1 / 2338.3 / 5034.8 Hz against 110.8 / 206.6 / 472.2 / 1073.8 / 2344 / 5188 (-0.3, +0.1, 0.0, 0.0, -0.2, -3.0 %). Emphasis 7 and 7.5: silent (1e-7); 8 and 8.5: sings.
- Passband loss (triangle 98 Hz, cutoff +3) at emphasis 2.5 / 5 / 7.5: -2.33 / -9.68 / -14.38 dB (reference -2.25 / -9.53 / -12.50).
- Keyboard tracking (singing filter, notes 29..77): none 0.000, switch 1 0.334, switch 2 0.666, both 0.959 oct/oct (reference 0, 1/3, 2/3, 0.967-0.970).
- Contours: loudness attack 10-90 % at marks 6 / 8.5: 474 ms / 6.778 s (reference 457 ms / 6.78 s); decay 90-50 % at 6 / 8.5: 296 ms / 4.024 s (293 ms / 4.02 s); release with the decay switch off -6 to -40 dB in 9.0 ms (9.5 to 9.9).
- Glide mark 7.5, two-octave legato step: up 3.87 oct/s, down 2.09 oct/s (reference 3.9 / 2.05).
- Detune beat osc 2 +0.06 st at 110 Hz: 0.469 Hz measured; the nominal 0.382 Hz plus the two oscillators' seeded static offsets (up to 2 ct each) and drift.
- Mixer volume law (triangle, re mark 10) at 2 / 4 / 6 / 8: -16.50 -9.41 -5.18 -2.10 dB (reference -16.51 -9.42 -5.19 -2.10). Overdrive, intermodulation 2f1-f2 of two triangles a fifth apart, re f1: marks 4 / 7 / 10: -64.2 / -51.9 / -43.1 dB; with osc 3 added: -59.5 / -46.3 / -35.9 dB.
- Modulation, modAmount 1, osc 3 free square in lo, oscMod: osc 1 swings 13.51 st p-p (reference 13.5).
- Determinism: two renders of the same 16-step pattern (slides, accents; Model D with noise, free osc 3 and filter mod): 0 differing samples of 101430, both types. Through `Host.render` with a document holding only a tb303 and a modeld track: 0 of 450660. The stock Guidance song's own renders differ between runs (even with the stock bass soloed: 120881 samples), from its existing noise and reverb generators; not from the classics.
- Host path: tracks `acid` (tb303) and `moog` (modeld) added through `host.editor().addTrack` with melody variants carrying acc and slide cells, played in every section, committed; `host.render({from:0, to:8})` chunked: 17.8 s of audio in 3.2 s, peak 0.54, no page errors and no fallback warnings; soloed renders RMS 0.140 (acid) and 0.240 (moog); after `host.start()` the live instruments report `engine: 'worklet'`, `Worklets.ready` true. The sequencer hands the 303 `ev.slide` and `ev.accent` (classics-check section 7).
- Demos for the owner (tools/out/, ignored by git): `classics-demo-tb303-acid.wav` (16-step line with slides and accents, 8 bars at 132 bpm, cutoff swept 380 -> 2080 -> 380 Hz, resonance 0.85; -19.8 LUFS, peak -1.8 dBFS) and `classics-demo-modeld-bass-lead.wav` (bass line and a legato, gliding lead with a slow osc-3 vibrato, 8 bars at 112 bpm; -16.4 LUFS, peak -4.3 dBFS).
- CPU, the full 200-bar song through `Host.render` in Chromium (383.6 s of audio): stock song 95.1 s; with a tb303 and a modeld track playing in every section 134.2 s (+39 s, two worklet voices for the whole song), peak 0.55, no page errors.
- CPU (Node, processors alone): tb303 about 30 ms and modeld about 85 ms per second of audio (4x oversampling; the Model D's 20 Pade tanh per sample dominate); both sleep when silent.

## 6. Not verified, open points

- Not run in Electron (the scheme serves app/engine/worklets/, read in main.js, not exercised) and not listened to by a person; the demos are for the owner's ears.
- The 303 accent-sweep time constants (15 to 100 ms) and the feedback soft clip are priors; the 303 resonance peak is modest (up to 7.3 dB over the half-frequency harmonic at 0.95), as Open303's model gives; no hardware recording compared.
- Model D: the passband table sits about 2.5 dB under the CA-72 reference near the corner (the tuning matches the singing pitch instead); passband loss at emphasis 7.5 is 1.9 dB more than the reference; at cutoff mark +2 the singing pitch is 3 % flat; the dial labels below the 1 s mark are priors; mod-noise level against the osc-3 square is a design choice; the shark-fin mix is a prior.
- The live (realtime) path was checked for engine selection after host.start only; no underrun measurement on a realtime context.
- Juno: the infrastructure takes more processor classes in the same module (Worklets.files) and `Worklets.node` passes outputChannelCount, so a six-voice processor with indexed params (pitch0..5, gate0..5, trig0..5) and a stereo chorus output fits; not built yet.

## 7. Output level fix (coordinator, after verification)

The default levels were too hot (coordinator's render: modeld eighth-note bass at defaults peaked 1.42; a tb303 line at resonance 0.8, envMod 0.7, accent 0.7 with six accents peaked 1.30). Changed the internal output gains in the processor, not the `level` rows: tb303 `T303.outGain` 0.5 -> 0.3, modeld `MD.outGain` 1 -> 0.56. Chromium, instrument output at level 1: tb303 hot line 0.846, tb303 defaults with the same six accents 0.753, modeld default eighth-note bass 0.846 (RMS 0.254). New classics-check rows run the processors on those two patterns and fail above 0.9 (or under 0.5): classics-check 82, exit 0. The demo WAVs in tools/out/ were rendered before this change.
