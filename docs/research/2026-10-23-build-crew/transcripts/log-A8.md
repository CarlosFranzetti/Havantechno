# Log A8: audio fixes, processors (app/engine/processors.js)

Owner: A8 (Haiku 5.5). Files: `app/engine/processors.js` (only), `tools/processors-check.js` (new). No commits.

## Read at start

- `app/CONTRACT.md` in full, especially "Audio fixes (A7, A8)" and the logs rules.
- `docs/research/2026-10-23-build-crew/BRIEF.md`.
- Agreed changes: `round3-S2.md` (delay filters in the loop, Freeverb on native nodes, seeded IR), `round3-S4.md` (band-limited widener), `round3-H3.md` (chorus base and invert), `round3-S1.md` (sidechain curve and retrigger), `round4-O1.md` section 2 (the agreed list).
- `app/engine/processors.js`, `core.js` (`K.impulse`, `K.noise`, `defineParams`), `selfcheck.js` (fake context: node types gain, osc, bufsrc, const, biquad, shaper, delay, convolver, comp, panner, splitter, merger, analyser).
- Other logs when I started: only `log-coordinator.md` existed. Read again before finishing (see "Other logs" below).

## Decisions

1. **Delay `loop`** (default false). With loop off the graph is today's graph (input through hp and lp, then the delay lines); one unity gain node was added in front of it. With loop on, the input enters the delay lines unfiltered, and each feedback path runs through its own hp then lp before reaching the next line. So the first echo is clean and every repeat darkens. Left and right have separate filter pairs (`lp`/`hp` and `lpR`/`hpR`), because a single pair cannot carry two channels. `wire()` disconnects and reconnects the delay's internal nodes when `loop` or `pingpong` changes; it does not touch `p.input` or the output.
2. **Delay `modRate` (Hz, 0 to 20) and `modDepth` (s, 0 to 0.05)**: a sine oscillator into a gain (`modDepth`) into both `delayTime` params. Both 0 by default, so the LFO adds nothing. The LFO is stopped in `dispose`.
3. **Reverb `algo`**: `'ir'` (default, the old path unchanged) or `'freeverb'`. Freeverb follows the brief: 8 combs and 4 allpasses per channel, lengths from the published constants at 44.1 kHz scaled by sampleRate/44100, right channel + 23 (scaled). Each comb is delay → lowpass → gain → delay (the delay's input sums the input and the loop gain). Each allpass is a delay with feedback 0.5, and output = delayed − input. Comb feedback = 10^(−3·T/RT60) with T = length/sampleRate, so `size` is RT60 in seconds and automatable (`auto`, no buffer swap). `damp` sets the comb lowpass frequencies. `predelay`, `hp` (a highpass before the network) and `mix` apply. `decay` and `seed` apply only to `'ir'`. Input gain: Freeverb's 0.015 input times its output scale 3 is folded into one gain of 0.045 (the network is linear), applied to L and R through a splitter. Switching `algo` disconnects and drops the old nodes, then builds the new network.
   - Node count: one freeverb instance has 92 nodes in total (`gain` 48, `delay` 25, `biquad` 17, `splitter` 1, `merger` 1). The IR instance has 9. The 25 delays are the predelay plus 12 per channel. No new node type is used, so `selfcheck.js` needs no stub.
   - Level: Freeverb's gain staging is not matched to the IR's. At the same `mix` the two algorithms will not sound the same level. That needs an ear check.
4. **Reverb `seed`** (integer, 0 = `Math.random`, as before). When > 0 the impulse is generated in processors.js (`impulseSeeded`) with the same envelope and high-pass as `K.impulse`, from mulberry32. `K.impulse` in core.js is untouched. Regeneration on `size`, `decay` and `hp` uses the same seed, so renders repeat.
5. **Chorus `base`** (ms, 2 to 30, default 14). The left line is at `base`, the right at 1.5 × `base`, which gives 14 and 21 ms at the default, as before. **Note:** the Juno analysis (H3) has both lines at 3.5 ms ± 1.85. Setting `base` 3.5 gives 3.5 and 5.25 ms, not Juno's equal lines. I kept the 1.5 × ratio because it reproduces today's 14/21 ms with one parameter. Equal lines would need a second parameter (a line ratio); not added, because it is outside the brief.
6. **Chorus `invert`** (boolean, default false): a gain node (`invR`) between the right line and the merger, at 1 or −1 (smoothed with `auto` when toggled). Default gain 1, so the default output is unchanged.
7. **Widener `monoBelow`** (Hz, 0 to 500, default 0): the side signal goes through a highpass at `monoBelow` (Q −3 dB, Butterworth), or directly when off. Two gates (`sA` direct, `sB` highpass) switch with `auto` (smoothed), so default output equals the old output exactly (direct gate 1, filtered gate 0). Q in dB for lowpass and highpass is the settled fact from round 4 (O2, S3). I did not recheck it against the spec this session, so it is recalled.
8. **Sidechain `curve`** (`'lin'` default | `'db'`): the recovery ramp is `exponentialRampToValueAtTime(1)` for `'db'` (only when the dip level is > 0, otherwise linear, as `auto` does).
   - **Retrigger, approach:** each trigger keeps its breakpoints (`pts`: time, value, how the segment is drawn). When a trigger arrives, `levelAt(t)` computes the gain the scheduled envelope has at t (linear or exponential, per segment). Then `cancelScheduledValues(t)` removes the old schedule from t on, `setValueAtTime(level, t)` starts the new dip from that level, and the attack, hold and recovery are scheduled as before. The gain therefore ramps from its current value and never steps. Without a retrigger, the level is 1 and the calls are identical to before (checked by the regression in the check tool).
   - The reset in `depth <= 0` clears `pts`.

## Not done (and why)

- **S2's exponential IR envelope** (in round 4's agreed list): not in this brief's list, and it would change the default `'ir'` sound. Left for a later option.
- **S2's convolver buffer swap on `size`, `decay` and `hp` changes** (click risk): the `'ir'` path still swaps its buffer. The `'freeverb'` path avoids it.
- **Freeverb is not Freeverb exactly.** Damping is a biquad lowpass (Q −3 dB) in each comb, not the one-pole of the original. Nothing is gain-matched to the IR. Its tail has not been rendered, so its character is unverified.
- **S2's offline acceptance tests** (RT60 arrival within 15%, constant dB tail slope, L/R correlation at 60–115 ms and 100–300 ms): not run. They need an offline render, which needs Host.render and a browser.
- **S1's sidechain `offset`**: not in the brief; not done.
- **Dattorro**: not in the brief; not done.
- **Band-limited widener at about 150 Hz** (round 4 agreed): the processor supports it, but the song value is A7's (`song.js`). The default `monoBelow` stays 0, so nothing changes until the song sets it.
- **CPU of the Freeverb network** (92 nodes): not measured.

## Messages

**From A8 to A7:** The sidechain retrigger fix from your note is in (see decision 8). The fill pattern `x.xx` (119 ms) now starts the dip from the current level. Your sub settings (`depth 0.82, attack 0.03, hold 0.08, release 0.12`) are unchanged and valid. For a dB-linear recovery on the sub, set `curve: 'db'` in its `sidechain` params; I have not changed anything in `song.js`.

**To A3:** New spec entries (all have defaults equal to today's behaviour): `delay`: `loop` (boolean), `modRate` (Hz), `modDepth` (s). `reverb`: `algo` (string, `'ir'` | `'freeverb'`), `seed` (integer). `chorus`: `base` (ms), `invert` (boolean). `widener`: `monoBelow` (Hz). `sidechain`: `curve` (string, `'lin'` | `'db'`). Strings need an option list in the layout (`layout.options.algo`, `layout.options.curve`) if you place them. Unplaced ones land in the "more" drawer, which the lint treats as a note, not an error.

**To A1:** The new processor parameters are ordinary spec entries, so `setParam` / `getParam` reach them through `chain` and the processor's `set`. I read `host.js` (lines 340 to 350, `setParam` for chain units): the value is written generically into `t.chain[i][param]`, so `algo`, `seed`, `loop`, `curve`, `invert`, `base`, `monoBelow` and the delay modulation persist with no change on your side. I did not run host.js.

**To A9 (scoring):** For repeatable renders, set the reverb return's `seed` above 0 (for example `send.reverb.seed` through `setParam`). I read `sequencer.js` `addSend` (lines 125 to 135): returns are built with `Processors.create(seq.ctx, type, opts)`, so the seed reaches the processor. The default (seed 0) still uses `Math.random`, so renders differ run to run until a seed is set. I did not run a render.

## What shipped

- `app/engine/processors.js`: decisions 1 to 8.
- `tools/processors-check.js`: 54 checks (see verification). It reuses the fake context from `selfcheck.js` by reading its "fake Web Audio" section at run time, so `selfcheck.js` is not edited (A1 owns it).

## Verification (run in /home/user/havantechno)

- `node --check app/engine/processors.js` → no output, exit 0.
- `node --check tools/processors-check.js` → no output, exit 0.
- `node app/engine/selfcheck.js` → exit 0. Last lines:
  ```
  5. Host and Project
  OK: 263 checks passed
  ```
  (The count was 193 when I first ran it, before A1's additions to selfcheck.js. It passed at 193 with my first version of the file, too.)
- `node tools/processors-check.js` → exit 0. Full output:
  ```
  1. defaults and existing parameters match the archived processors.js
    ok   filter: 11 existing-parameter operations, 3 automation lists identical
    ok   saturator: 12 existing-parameter operations, 4 automation lists identical
    ok   delay: 20 existing-parameter operations, 8 automation lists identical
    ok   reverb: 18 existing-parameter operations, 4 automation lists identical
    ok   eq3: 21 existing-parameter operations, 7 automation lists identical
    ok   compressor: 18 existing-parameter operations, 6 automation lists identical
    ok   limiter: 9 existing-parameter operations, 3 automation lists identical
    ok   widener: 3 existing-parameter operations, 2 automation lists identical
    ok   chorus: 9 existing-parameter operations, 5 automation lists identical
    ok   sidechain: 12 existing-parameter operations, 1 automation lists identical
  2. delay: loop (filters in the feedback path) and modRate / modDepth
    ok   loop off: the input is filtered on the way in, the feedback is not
    ok   loop on: the input does not reach the tone filter without a delay
    ok   loop on: left feedback goes through hp then the tone filter
    ok   loop on: right feedback uses its own pair of filters
    ok   loop switched off again: the input path is restored
    ok   modRate 3 Hz drives the oscillator frequency
    ok   modDepth 4 ms sets the LFO gain
    ok   the oscillator reaches both delay-time parameters through the gain
    ok   defaults: modRate 0, modDepth 0, loop off
  3. reverb: algo freeverb on native nodes
    ok   freeverb at 44100 Hz: 25 delay nodes = 1 predelay + 12 per channel x 2
    ok   freeverb at 44100 Hz: no convolver
    ok   freeverb at 44100 Hz: line lengths 1116 1188 1277 1356 1422 1491 1557 1617 556 441 341 225 1139 1211 1300 1379 1445 1514 1580 1640 579 464 364 248
    ok   freeverb at 44100 Hz: input reaches the output
    ok   freeverb at 44100 Hz: one splitter and one merger for the stereo sum
    ok   freeverb at 48000 Hz: 25 delay nodes = 1 predelay + 12 per channel x 2
    ok   freeverb at 48000 Hz: no convolver
    ok   freeverb at 48000 Hz: line lengths 1215 1293 1390 1476 1548 1623 1695 1760 605 480 371 245 1240 1318 1415 1501 1573 1648 1720 1785 630 505 396 270
    ok   freeverb at 48000 Hz: input reaches the output
    ok   freeverb at 48000 Hz: one splitter and one merger for the stereo sum
    ok   size 2 s sets comb 1 feedback to 0.916307 (RT60 relation)
    ok   size is automatable: 0.5 s gives 0.704958
    ok   algo back to ir: network removed, one convolver
    ok   default algo is ir
  4. reverb: seed
    ok   seed 7 twice: the two impulse buffers are identical
    ok   seed 8 differs from seed 7
    ok   seed 0 (default) keeps Math.random: two builds differ
  5. chorus: base and invert
    ok   default lines are 14 ms and 21 ms, as before
    ok   default: the right wet is not inverted (gain 1)
    ok   invert: the right wet gain goes to -1
    ok   base 3.5 ms: left line 3.5 ms, right line 5.25 ms (1.5 x base)
  6. widener: monoBelow
    ok   default: the side goes through unfiltered (direct gate 1, high-pass gate 0)
    ok   monoBelow 150: side high-passed at 150 Hz
    ok   monoBelow 150: the filtered side replaces the direct side
    ok   high-pass Q is -3 (dB, Butterworth)
    ok   default monoBelow 0 (off)
  7. sidechain: curve and retrigger from the current level
    ok   default: dip to 1 - depth at the attack end (unchanged)
    ok   retrigger 10 ms apart in the hold: starts from the dip level 0.4
    ok   curve db, retrigger in the release: starts from 0.40672 (not the step 0.4)
    ok   the old schedule from the retrigger on is cancelled
    ok   curve db: the new recovery is exponentialRampToValueAtTime(1) at t + len
    ok   curve db: no linear recovery is scheduled
    ok   curve lin, same retrigger: ramps from 0.41091 linearly
    ok   the dB curve differs from the old step by 0.0067
    ok   default curve lin
  OK: 54 checks passed
  ```
- **Mutation test of the check** (a scratch copy, not the repo): I changed the sidechain recovery end by 1 ms. The tool then printed `FAIL sidechain: ... 1 automation lists identical` and `FAIL curve lin, same retrigger`, exit 1. So the regression does catch a change.
- **Not verified:** any sound. The check tool runs on a fake context, so filter responses, the Freeverb tail, the impulse shape, the widener's mono-below effect and the ducking shape are not rendered or measured. The Q-in-dB reading is the round 4 settled fact, not rechecked this session.

## Other logs

- Read when I started: `log-coordinator.md` (in full).
- Read again before finishing: `log-coordinator.md`; all other logs were searched for "A8", "processors", "reverb", "delay", "chorus", "sidechain" and "widener". Found: A7's note on the sidechain retrigger (addressed above, answered). A1's note that `p.node` on the sidechain is read for its gain (host.js line 481, `d.ref.node.gain.value`): unchanged, `p.node` is still the gain. A10: the browser check looks for `Processors` as a global: still exposed. A4 and A5 mention no processor param. A2 and A1 mention no processor param. Nothing else addressed to A8.
- I did not read A1, A2, A4, A5 and A10 logs in full; I read the matches above. Say if you want a full read.

## Files

- `app/engine/processors.js` (rewritten, behaviour of defaults unchanged, verified by the regression above)
- `tools/processors-check.js` (new)
- `docs/research/2026-10-23-build-crew/transcripts/log-A8.md` (this file)

## Wave 2: master output stage (coordinator task, from A9's full-song score)

Task: the app's 200-bar render measured -6.82 LUFS against the reference's -10.65 (+3.8 LU), with a true peak of +0.88 dBTP. Give the master a real ceiling, and bring the full render to about -10.7 LUFS by changing the output stage, not the mix.

### Diagnosis (processors.js, `BUILD.limiter` as it was)

- The limiter's `ceiling` was a fixed output gain (-0.6 dB) after a DynamicsCompressorNode (threshold -2, ratio 20, attack 1 ms, knee 1). Nothing limited the output to the ceiling. The compressor only lowers level above its threshold, and its 1 ms attack lets fast transients (kick, clap) through above it.
- Arithmetic from the measured numbers (my arithmetic, not a measurement of the compressor): -2 dB threshold + overshoot + (-0.6 dB) = +0.88 dBTP, so the overshoot was about 3.5 dB.
- The saturator (drive 0.12, mix 0.5, normalised tanh) was not measured as a peak source. It is not ruled out.
- The loudness excess (+3.8 LU) is the output level: the master sits about 3.8 dB too hot against the reference. The output trim is the lever for that.

### Changes

1. **`BUILD.limiter` (processors.js):** a safety clipper after the output trim. New parameters: `clipOn` (boolean, default **false**) and `clip` (dBFS, -12 to 0, default -0.5). Off: the curve is null and oversampling is 'none', which is an identity (exact pass-through), so the default sound is unchanged. On: a 4096-point hard clip at `clip` dBFS, 4x oversampled. The `ceiling` param keeps its existing meaning (output trim, its automation unchanged). It is not a ceiling; `clip` is. The name is kept for compatibility.
2. **`Processors.master` (the limiter unit):** `threshold` -2 -> **-6** dB, `ceiling` (output trim) -0.6 -> **-4.2** dB, `clipOn` **true**, `clip` **-0.5** dBFS. Release 0.08 and the other units are unchanged. The chain keeps six units.

Why these values: the threshold is lowered so the compressor's overshoot (about 3.5 dB at -2) stays below the clip level, so the clipper rarely engages. The output trim sets the level. Trial 1 (threshold -6, trim -0.6) gave -7.65 LUFS with +0.36 -> -0.61 dBTP, so the threshold change alone barely moves loudness and the trim does the work. Trial 2 (trim -3.3 dB) read -10.35 LUFS on mainA and -9.85 LUFS / -2.87 dBTP on the full song, which is inside the 1 LU window but at its edge. The trim was then moved to -4.2 dB to centre the full song near -10.7 (final run below).

### Measurements (app page, `tools/render.js --page app`, `tools/score.py --json`, read directly)

| Render | Settings | Integrated LUFS | True peak (dBTP) | Sample peak (dBFS) |
|---|---|---|---|---|
| full 0:200, before | threshold -2, trim -0.6, no clipper | **-6.82** | **+0.88** | -0.34 |
| full 0:200, trial 2 | threshold -6, trim -3.3, clip -0.5 on | -9.85 | -2.87 | -3.86 |
| full 0:200, after (final) | threshold -6, trim -4.2, clip -0.5 on | **-10.75** | **-3.77** | -4.76 |
| mainA 16 bars, before | as above | -7.09 | +0.36 | -0.62 |
| mainA 16 bars, trial 1 | threshold -6, trim -0.6 | -7.65 | -0.61 | -1.59 |
| mainA 16 bars, trial 2 | threshold -6, trim -3.3 | -10.35 | -3.31 | -4.29 |
| mainA 16 bars, final | threshold -6, trim -4.2 | -11.25 | -4.21 | -5.19 |

- The "before" full-song figures reproduce A9's -6.82 / +0.88 exactly. I restored the original master line for that render and put the final line back afterwards; the restored file is byte-identical to the final one (`diff -q` against a saved copy).
- Reference: full song -10.65 LUFS (A9); mainA window about -10.24 (A9). The full render is at -10.75, within 0.1 LU of the target. The mainA window is 1.0 LU below its reference section. Section and song levels are measured on different windows; the coordinator's target is the full song.
- The sample peak of the full song is -4.76 dBFS, below the clip level of -0.5 dBFS. The clipper never engaged on this render, so the -3.77 dBTP is the compressor and output stage alone.
- Intersample overshoot after the clipper is not separately bounded. The true peak (4x oversampled, approximate, from `score.py`) is -3.77 dBTP, which is the margin we have.

### Checks

- `node --check app/engine/processors.js`, `node --check tools/processors-check.js`: exit 0.
- `node app/engine/selfcheck.js`: exit 0, `OK: 337 checks passed`.
- `node tools/processors-check.js`: exit 0, `OK: 62 checks passed`. New section 8: default clipper is an identity; clipOn sets the curve to +/-0.944 at -0.5 dBFS, linear through zero, 4x oversampled, and passes 0.5 unchanged; off restores identity; clip -3 sets the curve level; the master has six units with the clipper on. Section 1 (automation identical to the archived processors.js for every existing parameter) still passes; the `ceiling` automation is unchanged.
- A tool mutation test is not repeated for this task.

### Not done / limits

- The AudioWorklet true-peak limiter (Gear Crew report) is not built; the clipper is the interim safety stage the coordinator allowed.
- The clipper is a hard clip at -0.5 dBFS. It is a safety net, not a limiter; if the threshold is raised it will engage and distort. The processors-check does not cover that.
- The saturator was not measured as a peak source.
- Nothing was listened to. No sound was judged, only the measured levels.
- Full-song integrated loudness moved by about 4 dB. Whether the perceived balance (intro, break, drums) is still right is unverified.
