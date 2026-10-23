# Log A7: audio fixes, instruments (and GUIDANCE_V2)

Build Crew, wave 1, 2026-10-23. Owner files: `app/engine/synths.js`, `app/engine/song.js`. New file: `tools/synths-check.js`.

## Start

- Read `app/CONTRACT.md` (Audio fixes A7/A8, engine facts, logs rules), `BRIEF.md`.
- Read `round4-O1.md` sections 1 and 2 (kick, sub, bass, hats, arrangement rows), `round3-H1.md` (kick envelope, drone duck), `round3-S1.md` (duck curve, sidechain params, retrigger note).
- Read `synths.js`, `song.js`, `sequencer.js` (`addTrack`, `trigger`, note and gate handling), `selfcheck.js` (fake context, sections 3 and 4), `core.js` (`defineParams`, `Kit.target`), and `processors.js` `BUILD.sidechain` (read only).
- Found: `olde Havantechno dub studio/synths.js` is identical to `app/engine/synths.js` at start, so it is a usable baseline for default-behaviour equivalence. `core.js` is identical too.
- Other logs at start: `log-A10.md` (nothing addressed to A7). At the end: `log-A1.md` (nothing addressed to A7).

## Decisions

1. **Kick pitch `tau`** (default 0). `tau > 0`: `setValueAtTime(punch)` then `setTargetAtTime(tune, t, tau)` via `Kit.target`. `tau = 0`: the old `expo` ramp over `sweep`, unchanged.
2. **Kick amplitude `hold`** (default 0). `hold > 0`: linear attack 1.5 ms to full, hold at full for `hold`, then exponential to 1e-4 over `decay` (new helper `envHold`). `hold = 0`: `envDecay`, unchanged. The body oscillator's stop time includes `hold` (equal to today when hold is 0).
3. **Kick decay for V2: 0.36 s, not the brief's "~0.12".** `decay` is the time from the end of the hold to -80 dB, so the envelope is dB(t) = -80 (t - 0.06) / decay. For 0.12 that gives -60 dB at 150 ms (reference -17.8). Fit to O1 M2 (-6.3 at 100 ms, -17.8 at 150, -33.6 at 200): least squares gives 0.357 s. With 0.36 the model minus reference is -2.6, -2.2, +2.5 dB at those three points (-8.9, -20.0, -31.1 dB).
4. **Sub `mode`** (`'pluck'` default, `'drone'`). Drone: one sine per trigger (plus the 2nd harmonic at `harmonic`, as the pluck does), `envAHR` with `attack`, hold for `ev.dur || 1`, and a new `release` param (default 0.03 s, used only in drone mode). `glide` (default 0) moves from the previous note. `mode` is a string spec, so an unknown name falls back to pluck.
5. **Sub drone pattern must be one hit per bar.** The sub's `gate` 16 gives `ev.dur` = a whole bar (1.905 s). With the old four hits per bar the voices would stack four deep, so V2 uses `patterns: {A: 'x...............'}`. Sections only ever use sub `A`, so B and O were dropped from V2.
6. **Sidechain values for the sub.** `depth 0.82, attack 0.03, hold 0.08, release 0.12` are placed in the sub track's `sidechain` (the processor's own parameters, O1's interim proposal, section 2). They are not the sub instrument's `attack`, which stays at its default 0.005. If the coordinator meant the instrument's attack, change that line in `GUIDANCE_V2.sub`.
7. **Hat `metalHp`** (default 0). `0` keeps today's `tone * 0.5`. It is not a fixed 3.5 kHz: at the default tone 7200 that is 3600 Hz, and the 3.5 kHz in CONTRACT is the song's open hat (tone 7000). A value above 0 sets the metal-path highpass directly.
8. **Bass V2**: `env 100, drive 0` (S3's order, first guess). `drive` is not moved before the filter: no `drivePos` parameter was added (not in the brief).
9. **Arrangement**: `break` (16 bars, bars 104-119) and `breakLate` (8 bars, 120-127, `master.lp.cutoff` 6000, the break's sets copied in). `breakEnd` is unchanged. **Added beyond the brief:** `mainB`'s set gets `master.lp.cutoff` 20000. Without it the lowpass would stay at 6000 for all of mainB, since section sets persist and nothing else resets it. It is restored at bar 136 (the reference's section start), not at 128. The bar-128 choice is open: the reference gives no measurement of the highs in bars 128-135.
10. **`GUIDANCE` is not changed** (checked in the check script: 9 sections, break 24 bars, kick duck 4, sub not ducked, sub note B1).
11. `Song.GUIDANCE_V2` is a deep copy (`copy()`), `Song.documentV2()` is `SongDoc.fromLegacy(GUIDANCE_V2)`. `Song.document()` still uses `GUIDANCE`.

## Not done (say so)

- **Sub per-bar notes and the B0 bar.** Left at `note: 'C#1'` with a TODO in `song.js`. The sequencer's `notes` list (`tr.notes`) cycles once per hit, so with one hit per bar it could carry a per-bar note list. That would work now, but which bar holds B0 is unmeasured (O1: 1 bar in 8), so I did not pick one. This is for the coordinator to decide.
- **`choke` flag** (CONTRACT A7 mentions it for the hats, "honoured by the sequencer later"). It is not in the brief's list for this wave, so it is not added. Say if you want the flag now.
- **Drone glide between bars** is in the code (`glide`), but V2 keeps the default 0 because the drone only changes note at the B0 bar, which is not in V2.
- **Kick `drive` 0 vs 0.45** is not rendered (no render tool was run). V2 keeps 0.45 as the brief asks.

## Sidechain note for A8 (processors.js, not my file)

- `BUILD.sidechain` steps the gain to the trough from its current value when a trigger arrives inside `attack + hold + release` (`setV(g.gain, 1 - depth, t)` after `cancel`). That is the retrigger step S1 flagged. With V2's kick pattern (`x...x...`, 476 ms apart) it does not fire, because the sidechain length is 0.23 s. The fill pattern `F` (`x.xx`, 119 ms) would hit it, and the sub drone would click there. Not changed here.

## Verification

Commands and output (run in `/home/user/havantechno`):

```
$ node --check app/engine/synths.js && node --check app/engine/song.js && node --check tools/synths-check.js
(no output, exit 0)

$ node app/engine/selfcheck.js
1. modules without any AudioContext
2. parsing
[Synths] unknown instrument "bogus"
[Processors] unknown processor "bogus"
3. fake AudioContext graph
   fake graph: 5840 nodes, 2376 sources
4. song document, step record, equivalence with the archived engine
OK: 193 checks passed            (exit 0; same count before my edits)

$ node tools/synths-check.js
1. kick tau: first-order approach from punch to tune      (5 checks)
   body starts at punch 264 Hz; setTargetAtTime(51, t, 0.024); no exponential sweep when tau > 0; default kick keeps expo to tune
2. kick hold: plateau at full level, then 0.36 s decay to -80 dB; hold 0 has no plateau      (4 checks)
3. sub drone: 2 sources per trigger; fundamental sustains past ev.dur; envelope holds for ev.dur;
   glide from C#1 to B1 over 0.03 s; panic stops drones; default mode is pluck      (10 checks)
4. hat metalHp: default 3600 Hz (tone * 0.5); metalHp 1500 sets 1500; hat_closed tone 7500 keeps 3750      (3 checks)
5. defaults: all 13 synths log 1305 calls on the fake context, identical to the archived synths.js (seeded Math.random)      (2 checks)
6. Song.GUIDANCE_V2: 200 bars, 10 sections; breakLate lowers the lowpass, mainB restores it; kick ducks sub;
   GUIDANCE unchanged; deep copy; hits: kick 800, sub 200, all other tracks equal GUIDANCE; documentV2 same hits;
   the kick ducks the drone on the fake graph (16 gain ramps); V2 kick params reach the instrument      (12 checks)
OK: 36 checks passed
```

Saved copy of the check output: `/tmp/claude-0/-home-user/341aa418-0695-5408-80be-331d2fec6cae/scratchpad/synths-check.out.txt`.

Not verified: any audible result. No render was made, so the kick, drone and break values are fits to measurements and have not been listened to or scored (that is A9's job once the render exists).

## For others

- **A1:** `Song.GUIDANCE_V2` and `Song.documentV2()` exist. `Song.document()` still returns the baseline. Whether the Host should open V2 by default is your call, not made here. The self-check is unchanged (A1 owns it). `tools/synths-check.js` is separate and reuses the same fake-context pattern.
- **A8:** see the sidechain retrigger note above.
- **Coordinator:** the open decisions are the B0 bar (TODO in `song.js`), the sub-attack reading in decision 6, the bar-128 vs bar-136 lowpass restore (decision 9), and whether `choke` is wanted now.

---

## Wave 2: sampler (CONTRACT "Sampler", 542e7b5; coordinator dispatch 23:45:33)

Read first: CONTRACT "Sampler", `log-coordinator.md` (rulings on A7's four open decisions: B0 bar stays a TODO, sub attack reading right, lowpass restore stays at 136, choke arrives with the sampler), `log-A1.md`, `log-A8.md`. **From A1 to A7** (log-A1 line 26): the Host opens `Song.document()` by default; `Song.documentV2()` is the switch, and which one the app opens is A6's or the coordinator's call. Nothing for A7 to change. **From A8 to A7** (log-A8 line 41): the sidechain retrigger fix is in; my sub settings are unchanged and valid. Read, nothing to do in `song.js`.

### Shipped

- `app/engine/synths.js`: `BUILD.sampler`, helpers `chokeGroups`, `chokeUnregister`, `chokeVoice`, `samplerEnv`, and `inst._getBuffer` set in `create()` from `opts.getBuffer`. `Synths.chokeGroups(ctx)` is exposed on `window.Synths`.
- Params (spec): `buffer` (string, ''), `start`, `end` (0..1, end 0 = whole), `pitch` (-24..24 st), `gain` (0..2), `attack`, `release` (s), `loop` (0|1), `choke` (string, ''), `reverse` (0|1), plus `level`.
- `tools/synths-check.js`: fake context extended (`createBufferSource` with `playbackRate`, `loopStart`/`loopEnd`, `start` args recorded, `flush`, and a `fakeBuffer(seconds, sampleRate, channels)` stub). New section 7 with 28 sampler checks.

### Decisions (say so if you disagree)

1. **`sampler` is not in `Synths.types()`.** It is created by name only. `selfcheck.js` (A1) iterates `types()` in section 1 and section 3 (sections 3 expects sources started on a fake context with no buffer, so a silent sampler would fail it), and line 330 requires a device for every listed type. Adding it to `types()` would break A1's check. A1's Host lists it as a device explicitly. If A1 wants it in the list, selfcheck needs a getBuffer stub and a device; that is A1's file.
2. **Pitch offset.** CONTRACT says `ev.note` (semitones from C3). The sequencer sends `ev.midi` on note tracks and never `ev.note`. The instrument accepts both: `ev.note` if a number, else `ev.midi - 48`, else 0. This is a superset, not a change. Flagged to A1 and the coordinator: a sampler on a note track gets its pitch from `midi` this way.
3. **One-shot vs gate.** A one-shot plays its slice in full and ignores `ev.dur`. The sequencer's default `ev.dur` is `gate` (0.6 step) for every track, so using it would cut every sample to 70 ms. `loop: 1` uses `ev.dur` as the gate.
4. **Envelope.** Linear attack to `vel * gain` over `attack`, sustain, linear release that ends at the slice end (one-shot) or the gate end (loop). `attack` has a 0.5 ms floor so the ramp always has a duration.
5. **Choke.** A hit with `choke` set cuts every live voice in that group, in any sampler on the same context, with a 5 ms fade from the current gain value, then stops the sources 6 ms after the hit. The registry (`chokeGroups(ctx)`) maps group name to the list of live voices; a voice leaves its group when it is cut or disposed. A hit with `choke: ''` cuts nothing, and a hit in another group does not cut either. The hats do not use the mechanism yet (ruling: later).
6. **`reverse`** is accepted and does nothing (the contract says "later"). Not implemented.
7. **No resolver, no buffer, a throwing resolver, an empty id, or no context**: the trigger returns without creating a voice. `opts.getBuffer` is stored on the instance (`inst._getBuffer`), not as a parameter.
8. **Locks.** The sequencer's existing lock path applies numeric locks to `inst.params` for one trigger. The check runs through a real sequencer track and reads `pitch` and `gain` inside the trigger. No change to `sequencer.js`.

### Verification (run here, exit codes read directly)

```
$ node --check app/engine/synths.js        -> exit 0
$ node --check app/engine/song.js          -> exit 0
$ node --check tools/synths-check.js       -> exit 0
$ node app/engine/selfcheck.js             -> OK: 263 checks passed   exit 0
$ node tools/synths-check.js               -> OK: 64 checks passed    exit 0
```

The synths-check output is 36 wave-1 checks (unchanged; defaults equal the archived engine, 1305 calls) plus 28 sampler checks. The sampler checks: one source per hit; playbackRate 2 at pitch 12; the buffer comes from `getBuffer`; `ev.note` 7 and `ev.midi` 60 offsets; start/end to offset and duration (0.5 s, 1.0 s); end 0 is the whole buffer; end before start is silent; gain envelope values; one-shot has no loop; loop start/end and gate; null / empty / throwing / no-resolver / no-context are silent with no throw; choke across two instances (stop at 1.206 s); group registry holds only the new voice; empty and other groups do not choke; two voices in `_live`; `panic()` stops both; `flush` releases them; `dispose()` stops the voice; locks apply and restore through the sequencer; `buffer` and `choke` are string params.

Saved outputs: `/tmp/claude-0/-home-user/341aa418-0695-5408-80be-331d2fec6cae/scratchpad/synths-check.sampler.out.txt` and `/tmp/claude-0/-home-user/341aa418-0695-5408-80be-331d2fec6cae/scratchpad/selfcheck.sampler.out.txt`.

### Not verified

- No real AudioBuffer, decode or audible render. The fake buffer has `duration`, `sampleRate`, `numberOfChannels` and `length`; the real `AudioBuffer` also has `getChannelData`, which the instrument does not call.
- Real-browser behaviour of `playbackRate` as an AudioParam (the `val()` path sets `.value`, which real browsers accept).
- The choke fade reads `gain.value` as the current level. In a real context that is the last computed value and may differ from the audible level by one render quantum. Inaudible in practice, but unmeasured.
- A1's Host (loadAudio, the `audio` map, `getBuffer` passing, the sampler device) is not in my files; not checked here.
- The selfcheck stub for `createBufferSource` and `decodeAudioData` is A1's (CONTRACT: "Host.create with no audio must still work in Node"). My stub lives in `tools/synths-check.js`.

### For others

- **A1:** `Synths.create(ctx, 'sampler', {buffer, ..., getBuffer: fn})` is the path. `inst._getBuffer` is kept on the instance; a rebuild needs the same resolver passed again. `Synths.types()` does not list `sampler` (decision 1). The `ev.midi` offset (decision 2) is in synths.js; the sequencer does not change.
- **A8:** nothing new from me in processors.js.
- **Coordinator:** the choke fade and the `midi` fallback are the two places I went past the text. Both are in the decisions list above.
