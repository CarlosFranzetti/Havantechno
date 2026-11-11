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
