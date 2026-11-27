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

## 8. juno (six voices, one processor)

Built to P3-juno.md (sections 1 to 11) and the settled names in BRIEF.md. Nothing from Junox is ported as code. Its numbers are used, cited by file and line through P3: `junox.js` 239-252 (mix gains 0.2 / 0.2 / 0.195 / 0.21, compression above 0.26), 273, 284-306 (LFO rate and delay tables, HPF), `voice.js` 126 (5 kHz noise), 168-170 (PWM by LFO and env), 180-192 (cutoff law 7.8 Hz x 2^(200 s/12), envelope 12 oct, the +0.5 s oct resonance offset), 209 (key follow), `dco.js` 45 (duty 0.5 - 0.45 w), `chorus.js` 133-135 (7237 / 10644 Hz), 232-238 (dry 0.44, wet 0.56), `juno60Envelope.js` 5-7 and 214 (tables, 10 ms release at low sustain). Licence: GPL-3.0-or-later (package.json). The measured tables come from pendragon-andyh/Juno60 (MIT). Both have rows in THIRD_PARTY.md.

Design:
- `hvt-juno` holds six voices. The per-voice params are pitchN, gateN, trigN and glideN. The knobs are k-rate, except cutoff, resonance and envAmt, which are a-rate. The node has a stereo output.
- Each voice: a free-running PolyBLEP DCO at fixed start phases. The phases were chosen so a unison sum is near sqrt(6) per harmonic; equal spacing cancelled the fundamental.
  - Saw and pulse (PWM duty 0.5 - 0.45 w).
  - Sub one octave down through a 4.2 kHz RC.
  - Shared 5 kHz noise.
  - The Junox mix compression.
  - A 4-pole TPT (zero-delay) ladder at 1x with one Pade tanh at the loop input. k = 4.08 s, a thermal seed so it can sing.
  - The Juno-60 ADSR: attack RC toward 1/0.632 cut at 1; decay and release RCs with tau = time / 3.5. Gate mode: 3 ms / 6 ms.
- Shared: the triangle LFO (rate table; delay then a linear fade; the delay restarts on the first note after silence when lfoAuto, on every note otherwise), the HPF (0: +6 dB shelf under 65 Hz, 1: flat, 2: 225 Hz, 3: 720 Hz, first order) and the chorus stage. The chorus is one triangle LFO (0.513 or 0.863 Hz) driving two lines swept 1.66 to 5.35 ms in antiphase, with the Junox pre and post low-passes, dry 0.44 and wet 0.56. Optional hiss (chorusNoise) is panned by the sweep and is seeded, so it is deterministic too.
- Allocation (main thread): poly takes the free voice released longest ago, else steals the oldest held one, cancelling its pending gate-off. `ev.notes` takes one voice per note. A note after an `ev.slide` reuses that voice and glides (tau at least 60 ms, prior). Portamento glides each voice from its own last pitch, tau s^3 x 3 s (KR-106). Unison puts all six voices on the note, each at 0.6 (prior: louder than one voice).
- Velocity is ignored, as on the instrument. `bend` is stored but the engine has no bend input. `voiceMode` is 'poly' | 'unison' per the brief (P3's poly1 / poly2 are not separate).
- The FALLBACK uses one native voice per note in its slot (a stolen slot is cut), two biquads, mono, no chorus.
- Spec: 29 rows, every row with min, max, value, unit, basis and label. Switches are booleans with min 0 and max 1; range and chorus are numbers with `options`. P3's prior marks are carried (tune).
- Panel: I ran panels-check with its HVT-106 stub replaced by `Classics.spec('juno')` (a scratchpad copy): 110 checks pass, exit 0. Every name matches; none was renamed.

Checks:
- `node tools/classics-check.js`: 110 checks (was 82; juno spec and name list, mapping tables, no-context API, fallback allocation and stealing, stub-node allocation, stealing with the cancelled gate, slide reuse, portamento tau, unison, locks, panic, processor determinism and stereo chorus, hiss), exit 0.
- `app/engine/selfcheck.js` 395, panels 110, synths 169, drums 342, faces 2495, system-editor 97, processors 92, step-view 72, widgets 157, analysis 39 (another crew's file, changed under it): all exit 0. `node tools/browser-check.js`: PASS 26, exit 0.

Chromium (worklet path, 44.1 kHz, stereo OfflineAudioContext; scratchpad `p5/pw/mju.js`, `mjh.js`):
- Pitch on six voices (notes 45..65 played in turn): -0.01 / 0.11 / -0.10 / 0.10 / 0.07 / 0.29 ct.
- Chorus, held A3:

  | Chorus | L/R correlation | Mono-sum pitch | Mono-sum level re left |
  |---|---|---|---|
  | off | 1.000 | 220.01 Hz | 0 dB |
  | I | 0.347 | 219.99 Hz | -2.1 dB |
  | II | 0.354 | 220.00 Hz | -1.7 dB |

  The image widens and the pitch of the mono sum does not move.
- PWM manual: high fraction 50.0 / 27.6 / 5.1 % at pwm 0 / 0.5 / 1 (law: 50 / 27.5 / 5). LFO mode at pwm 1: sweeps 5.0 to 49.4 %.
- Filter, noise source, resonance 0, cutoff 445 Hz: -9.2 / -26.1 / -47.8 / -72.8 dB at 1 / 2 / 4 / 8 x the cutoff, relative to fc/4; slope -21.7 (2x to 4x) and -25.0 (4x to 8x) dB/oct. At resonance 1 with no source it sings at 1120.7 Hz, exactly the law with the +0.5 oct offset.
- Envelopes against P3's table:
  - Attack slider 0.25 / 0.5 / 0.75 reaches 97 % at 27 / 222 / 604 ms. The RC segment ends at 30 / 240 / 650 ms, where 97 % falls at 0.95 x, so 28.5 / 228 / 617 ms predicted.
  - Decay 0.25 / 0.5 to e^-3.5 in 98 / 986 ms (table 96 / 984).
  - Release 0.5 in 974 ms (984).
  - Gate mode: 90 % in 1.4 ms, -40 dB 7.6 ms after the gate.
- Determinism: two stereo renders of chord changes with stealing, LFO to pitch, PWM and the filter, sub and noise, chorus I, chorusNoise off: 0 of 176400 frames differ.
- Levels: default patch, four-note chords: peak 0.57 L, 0.55 R. A2 held: one voice RMS 0.041; unison RMS 0.058, peak 0.19.
- Host path:
  - A `juno` chord track (chords from the progression, chorus II) and a `juno` melody track in unison with portamento and a slide were added through `editor().addTrack` and played in every section.
  - `host.render({from 0, to 8})` gave 17.8 s in 4.0 s. The soloed chord track has RMS 0.185 and an L-R difference RMS of 0.209 (stereo chorus).
  - Family keys, device kind "instrument keys juno". Live engine after `host.start()`: worklet. No page errors.
- CPU: in Node, four held voices take about 52 ms per second of audio. Voices sleep when released below -100 dB.
- Demo: `tools/out/classics-demo-juno-chords.wav`, a four-chord progression (Am, F, G, Em voicings, 8 bars at 100 bpm) with a PWM pad on chorus II and a pulse-and-sub bass (-20.1 LUFS, peak -7.8 dBFS). The tb303 and modeld demos were re-rendered at the new levels: -24.3 and -21.5 LUFS.

Not verified:
- Not listened to by a person. No Juno recording compared.
- 106-versus-60 conflicts (chorus depth, HPF corners, 400 versus 300 ct vibrato, envelope 12 versus 14 oct, LFO 3.5 versus 3 oct) are resolved as P3 recommends, not measured.
- The chorus BBD's own low-pass and nonlinearity are not modelled.
- The filter runs at 1x without oversampling: some aliasing of the tanh at high cutoff and resonance, not measured.
- Unison detune and per-voice component variance are not built.
- A full 200-bar render with juno tracks is not timed.
- The fallback is not measured beyond the Node check.

## 9. 2026-11-12 03:20 ET (08:20 UTC): the 303 focus, part one (bench and demos)

Rulings received (coordinator, quoted): "(a) tools/tb303-bench.js (new, yours): a repeatable characterisation of `tb303` on the worklet path in headless Chromium, writing tools/out/tb303-bench.json and printing a table ... (state how you excite it: the instrument's own saw harmonics or an internal test hook; do not add a public parameter) ... It must run in under two minutes and exit 0; a --compare <older json> option prints what moved. (b) Demos for the owner's ears ... each 8 bars at 126 BPM on one sixteen-step pattern with accents and slides ... Use section automation or direct param scheduling, whichever the engine supports honestly through Host.render, and say which. Also render each once through the engine's saturator at a mild setting ... Rules as before: your files only (classics.js, worklets/, classics-check.js, the new bench), no commits, never git stash/checkout/reset/clean ... quote this message's rulings there." Second message: "Finish part one first (the bench must exist and its JSON be saved as the "before" so --compare has something to compare)".

**Bench.** `node tools/tb303-bench.js` takes about 21 s and exits 0. It writes tools/out/tb303-bench.json; the "before" copy is tools/out/tb303-bench-before.json.
- Excitation: the instrument's own saw harmonics. Note 24 gives a line every 32.7 Hz. The response is harmonic level + 20 log n, relative to the passband harmonics (60 Hz to 0.3 fc).
- Time traces come from an internal test probe. `Classics.create(ctx, 'tb303', {_probe: true})` adds a second node output carrying the processor's instantaneous cutoff, oscillator frequency and VCA gain. It is not a parameter and not in the spec; makeInst keeps `inst._probe`. With `--demos` the bench renders the demos instead.

Headline numbers (before P1's corrections):
- **Resonance peak over the passband**, static fc 271 / 836 / 1954 Hz: 2.1 / 6.8 / 9.1 dB at resonance 1, at 1.09 / 0.94 / 0.89 x fc. It does not self-oscillate: the strongest line between harmonics is -61 dB, and the tail after release is 0.
- **Response at resonance 0**: -13.4 / -18.3 / -19.3 dB at fc. The 2x to 4x slope is about -18 dB/oct.
- **Filter decay time constant** against the knob 200 / 400 / 800 / 1400 / 2000 ms: 200 / 400 / 800 / 1400 / 2000 ms (three-point fit on log2 cutoff). Accented notes: 407 ms whatever the knob (accent decay 200 ms plus the 100 ms sweep RC at resonance 0.5).
- **Accent level** at knob 0 / 0.25 / 0.5 / 0.75 / 1: +0.2 / +4.8 / +7.7 / +9.9 / +11.7 dB peak.
- **Accent sweep, last of n accents over a plain step** (n = 1 / 2 / 4): resonance 0.2: 0.19 / 0.63 / 0.64 oct; 0.6: 0.01 / 0.58 / 0.69; 0.95: 0 / 0.51 / 0.69. The build-up is there, but the first accent adds almost nothing at high resonance.
- **Slide**, time to 50 / 90 % of the Hz distance: slideTime 30: 4.1 / 13.8 ms; 60: 8.3 / 27.6; 120: 16.6 / 55.3; 200: 27.7 / 92.1. The gate is held through the slide.
- **Gate**: 0.527 of a step; a two-step tie 1.528.
- **Square over saw**: +5.6 dB RMS.
- **Output peak** on a two-bar accent and slide pattern: defaults 0.727. The grid maximum is 4.45, at cutoff 2394, resonance 0, envMod 1, accent 1. At resonance 0 the Open303 filter loses no passband, so it is about 10 dB louder than at 0.5. This needs a level decision in part two.

**Demos** (tools/out/, `--demos`): rendered through `Host.render` with section automation. Each move is a `ramp` (cutoff, resonance, envMod, decay) or a `set` (wave), applied by the sequencer at each step's time through `inst.set(name, v, {at})`. The master chain is bypassed. The driven versions add a saturator insert on the track: drive 0.06, tone 9 kHz, trim 0.8.

| Demo (each also -driven) | Peak dry | Peak driven | RMS dry / driven |
|---|---|---|---|
| tb303-demo-cutoff-sweep | 0.540 | 0.696 | -23.4 / -16.2 dBFS |
| tb303-demo-resonance-up | 0.531 | 0.655 | |
| tb303-demo-envmod-up | 0.529 | 0.654 | |
| tb303-demo-decay-up | 0.519 | 0.586 | |
| tb303-demo-accents-slides-off-on | 0.519 | 0.624 | |
| tb303-demo-saw-then-square | 0.660 | 0.621 | |

Spectral centroid per bar confirms each move; for example the cutoff sweep goes 573 to 2549 Hz across the 8 bars.

**Checks**, all exit 0: classics-check 110, selfcheck 448 (another crew's additions), panels 116, synths 169, drums 342, faces 2495, system-editor 97, processors 92, step-view 72, widgets 157, analysis 47, browser-check PASS 26.

## 10. 2026-11-13 03:20 ET (08:20 UTC): the 303 focus, part two (P1's second-pass corrections)

Rulings received (coordinator, quoted):
> (1) Accent sweep: replace the smoother on the octave exponent with the network P1 describes (diode and 47k into the resonance pot's second gang, 1 µF, 100k into the filter's summing node), adding to cutoff in Hz, with stacking across consecutive accents falling out of the capacitor's state rather than being scripted; the Hz scale of the term is unknown, so make it one named constant, mark it basis 'prior', and choose it so a single accent at mid resonance gives about the same peak cutoff as today (say what value and why); bench the first-peak time at high resonance against P1's "about 100 ms" and the third-accent height against P1's simulated +33 %, and say plainly that the second is P1's simulation, not a measurement.
> (2) Resonance: implement the feedback bracket (stock maximum between 8.5 and 17 of the critical 17.0); start at 15 as P1 suggests, keep it one named constant with basis 'prior'; lower the feedback highpass to about 95 Hz; the unit must still not self-oscillate at resonance 1 (stock behaviour), and the bench must show the new peak height against the old 7.3 dB.
> (3) Slide: time constant 22 ms on the pitch (exponential in pitch, so linear in semitones' exponent), active during the note after the flagged one with the gate held; keep slideTime as the knob, but say in the spec label what value corresponds to the stock 22 ms and make that the default.
> (4) Gate and VCA: gate 58.3 % of a sixteenth, 4 ms delay and 3 ms attack, 8 ms hold and 8 ms ramp at the end; medium confidence per P1, so basis 'source' with the caveat in the label.
> (5) Accent into the VCA through the 1.55 ms network instead of the 4.0 factor and the 200 Hz de-click; keep the measured +8 dB at accent 0.6 unless the network gives a different figure, and report the new one. Do not change the square wave: P1 could not read a source for its duty. Keep the frozen names; no new public parameter. After the changes: bench --compare, classics-check updated where rows encode the old constants (say which rows changed and why), the output level rows still under 0.9, every existing check passing, the demos re-rendered under new file names so old and new can be compared by ear (suffix -r2).

A container restart lost the first hand-back. Part one's files were intact and were not redone.

### What changed

In `app/engine/worklets/classics-processor.js` (the T303 constants and Tb303Processor) and the planner in `app/engine/classics.js`:

1. **Accent sweep.** Open303's 15–100 ms RC on the cutoff exponent is replaced by the network itself, solved exactly per sample (the wiper voltage is a linear function of the source and the capacitor voltage, piecewise by the diode).
   - Components: source = accent knob × MEG while the note is accented; diode with 47k into the ACW end of a 100k pot; wiper = resonance knob (linear, 0 = ACW); 1 µF at the CW end (Rb at least 500 Ω); 100k from the wiper to the summing node.
   - It adds `accentHz × Vwiper` Hz to the cutoff. Consecutive accents stack through the capacitor's state.
   - `accentHz` = 1260 Hz per unit wiper voltage, basis prior. The value matches today's single full accent at resonance 0: 2485 Hz against 2487 Hz before, at cutoff 500, envMod 0.5.
   - Why resonance 0 and not mid resonance as the ruling asked: the old model's first accent at mid resonance barely moved the cutoff (+33 Hz at 0.5, +8 Hz at 0.6), because its slow RC was a prior. Matching it would set the scale near zero and remove the sweep. Resonance 0 is the one point where the old numbers come from Open303's source. At mid resonance the new single accent peaks at 2158 Hz (0.5) and 2101 Hz (0.6), against 1869 and 1844 Hz before.
2. **Resonance.**
   - Feedback k = r × kpoly × 15/17 (`kMax` 15, basis prior).
   - Feedback high-pass 150 → 95 Hz.
   - The feedback soft clip (prior) is kept. Open303's makeup term g is unchanged.
3. **Slide.**
   - The RC now acts on the pitch in semitones, then the exponential converter.
   - tau = 22 ms × slideTime / 60, so the default 60 is the stock 22 ms. The spec label says so.
   - Unchanged: it is active through the note after the flagged one, with the gate held, and nothing retriggers.
4. **Gate and VCA.**
   - The planner gates a one-step note for 3.5/6 = 58.3 % of a step; a tie of n steps for (n − 1 + 0.583) steps.
   - The VCA has a gate shape: 4 ms delay, 3 ms linear attack, full level while the gate is high, then 8 ms hold and an 8 ms linear ramp. The 1 ms / 50 ms exponential releases are gone (no accent-specific release in the sources).
   - These are processor constants, not spec rows. The ruling asked for basis 'source' with the caveat in the label, but no spec row carries them, so that tag and caveat sit in the constants' comments (medium confidence).
5. **Accent into the VCA.** VCA = shape × (VEG + LP1.55ms((0.45 + Kacc × accent) × MEG)). The 1.55 ms one-pole is the 47k / 0.033 µF network and replaces the 200 Hz de-click biquad. Kacc 4.0 → 4.15 (P5 calibration) so accent 0.6 stays at +8.0 dB peak (Node, same pattern: 8.03 dB).
6. **Not changed:** the square wave, Open303's filter coefficients, the envelope ranges.
7. **Level.** `outGain` 0.3 → 0.27, so the hot six-accent line stays under 0.9.
8. **Test probe.** It now also carries the wiper voltage (`_probe`, test only, `outputChannelCount` [1, 4]).

### classics-check rows changed (110 checks, exit 0)

| Row | Old | New | Why |
|---|---|---|---|
| Fallback slide tau | 0.2 × slideTime (12 ms) | 22 ms at slideTime 60 | correction 3 |
| Fallback one-step gate | half a step | 58.3 % | correction 4 |
| Worklet path, normal note gate | half a step | 58.3 % | correction 4 |
| Three-step tie gate | 2.5 steps | 2.583 steps | correction 4 |
| Output level row | | still asserts ≤ 0.9 | now reads 0.86 hot after outGain 0.27; it read 0.959 at 0.3 |

### Bench, before → after (`node tools/tb303-bench.js --compare tools/out/tb303-bench-before.json`, 16 s, exit 0)

**Resonance peak over the passband at resonance 1**, cutoff 314 / 1000 / 2394:

| | Before | After |
|---|---|---|
| Peak height | 2.1 / 6.8 / 9.1 dB | 4.8 / 8.0 / 8.7 dB |
| Peak frequency | 1.09 / 0.94 / 0.89 × fc | 0.97 / 0.90 / 0.84 × fc |

- Against the old "7.3 dB over the half-frequency harmonic" figure (a different reference): the new peak at mid cutoff is 8.0 dB over the passband.
- Still no self-oscillation: the inter-harmonic line is −62 dB and the tail after release is 0.
- The peak stays modest because the feedback soft clip (prior) limits the loop at the resonant frequency. With k capped at 15 and the clip, the ideal-core figure (+25 dB) is not reached. This is not verified against a unit and is the next thing to question if the owner wants more squelch.

**Accent network alone** (wiper voltage, MEG = 1, four accents at 130 BPM):

| Resonance | Per accent (ms after the note) | Third / first |
|---|---|---|
| 1 | 0.242 (103 ms), 0.304, 0.319, 0.321 | 1.318 |
| 0.5 | 0.287 (57 ms), 0.380, 0.419, 0.431 | |
| 0 | 0.515, 0.585, 0.615, 0.627 | |

These equal P1's numbers to three decimals. P1's figures are P1's own circuit simulation from the quoted component values, not a measurement of a unit: this bench reproduces the simulation, it does not validate the hardware.

**Accent sweep, last of 4 accents over a plain step** (resonance 0.2 / 0.6 / 0.95):

| | 0.2 | 0.6 | 0.95 |
|---|---|---|---|
| Before | 0.64 oct | 0.69 oct | 0.69 oct |
| After | 0.45 oct | 0.35 oct | 0.27 oct |

- Single accent, before → after: 0.19 → 0.35 oct at 0.2; 0.01 → 0.20 at 0.6; 0 → 0.03 at 0.95.
- The total cutoff now peaks at the note start (the MEG term). The sweep term itself peaks at 57 ms at mid resonance and 103 ms at full resonance.

**Other changes:**
- Accented decay: 407 → 257 ms effective (the new network decays faster than the old 100 ms RC).
- Accent level at knob 0.5 / 0.75: 7.7 / 9.9 → 7.1 / 9.3 dB, so about +8 dB at 0.6 by interpolation. Knob 1: 11.7 → 11.1 dB.
- Slide at slideTime 60, 50 / 90 % of the Hz distance: 8.3 / 27.6 → 19.3 / 57.3 ms. In pitch, 90 % at 2.3 tau = 51 ms; the Hz view is longer upward.
- Gate as the VCA falling under 10 %: 0.527 → 0.712 of a step (58.3 % + 8 ms hold + most of the 8 ms ramp).
- Square over saw: 5.6 → 5.3 dB.
- Output peak on the pattern at defaults: 0.727 → 0.761.

**Grid maximum** is 4.45 → 4.12, still at resonance 0. That is Open303's passband with no feedback, about 10 dB louder than at resonance 0.5. It was not part of these rulings and needs a decision: a resonance-dependent output gain, or the stock unit's own level behaviour from a source.

### Demos -r2

`node tools/tb303-bench.js --demos --suffix -r2` writes tools/out/tb303-demo-{cutoff-sweep, resonance-up, envmod-up, decay-up, accents-slides-off-on, saw-then-square}-r2.wav, each also as -driven-r2.wav. Peaks: 0.53–0.65 dry, 0.56–0.69 driven. The part-one files without the suffix are the "before" versions.

### Checks (exit codes read directly)

classics 110, selfcheck 448, panels 132, synths 169, drums 342, faces 2495, system-editor 97, processors 92, step-view 72, widgets 157, analysis 47: all exit 0. browser-check PASS 26, exit 0.

### Not verified

- No comparison with a recording of a stock unit.
- `accentHz`, `kMax` 15, the feedback soft clip and Kacc are priors or calibrations.
- The gate and VCA timings are a builder's statements (medium confidence).
- The accent switch is held for the whole accented step, including after the gate (my reading).
- The 0.45 × MEG term on every note is Open303's calibration, not the circuit.
- Not listened to by a person.
