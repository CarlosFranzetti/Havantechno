# Log A8: V3 processors (Ear Crew, round 3)

Owner: A8. Files changed: `app/engine/processors.js`, `tools/processors-check.js`. No commits. Times are ET (EDT); `log-coordinator.md` is the ruling record.

## 2026-10-24 01:22 EDT (05:22 UTC): read and start

- Read `V3-SPEC.md` sections 0, 4, 5 and 6 (4.1 master table, 4.2 sends, 5.1 level table, 5.3 EQ check, 6.1 flags C1 to C16, 6.2 estimates, 6.3 items). Read the last entries of `log-coordinator.md` (01:04 to 01:18 EDT, round 3 dispatch and the flag rulings).
- Engine facts read: `processors.js` (makeProc, chain, master, limiter, saturator, widener, reverb), `host.js` lines 83 to 151 and 457 to 488 (applyMaster, applyBypass, host.bypass), `sequencer.js` lines 114 to 175 and 228 to 253 (chain paths, `setParam` routing) and 523 to 540 (render, `tail`), `host.js` 816 (`host.render` passes `tail`).

## What changed (processors.js)

1. **Bypass as a construction option (`makeProc`).** `bypass: true` in any unit's options (a chain entry or `Processors.create`) starts the unit bypassed at once: wet gain 0, dry gain 1, `_bypassed` true, no fade. Before, the key was passed to `set()`, found no spec entry, and was silently ignored, so only the Host's post-build `proc.bypass` (a 10 ms fade) worked. `Processors.chain` already passed the key through. Nothing else changes; without the key the code path is the old one.
2. **Decorrelate unit (`BUILD.decorrelate`, type `decorrelate`).** Mono in, stereo out: left = input, right = input delayed by `time` (s, 0.001 to 0.05, default 0.011, automatable). Built from a stereo `ChannelMerger` into `_wet`. Use: the burst (and any noise voice) as a chain insert. Reason in section "Stereo noise" below.

Nothing was added to `Processors.master()`. Its defaults are the wave-2 values (threshold -6, ceiling -4.2, clipper on at -0.5), which the app's current render uses. The V3 values are supplied as song data (see below), so the master defaults are unchanged.

## Task (1): master per spec 4 from song data

- **Data path:** `doc.master[unit].<param>` is written with `seq.setParam('master.<unit>.<param>')` by `host.applyMaster` (host.js 83). `doc.master[unit].bypass: true` is applied after the build by `host.applyBypass` (host.js 151). So V3 can set everything from the document. The V3 document (A7's `documentV3()`) needs:
  `master: { hp: {cutoff: 24}, lp: {cutoff: 20000}, eq: {}, glue: {bypass: true}, sat: {bypass: true}, limiter: {threshold: -1.5, ceiling: 0, release: 0.08, clipOn: true, clip: -0.55} }`.
  I checked this set on a fresh master (section 9 of the check): hp 24, lp 20000, eq unchanged (1.5 / -1 / 1), limiter -1.5 / 0 / 0.08 / clipOn / -0.55, glue and sat bypassed (wet path driven to 0).
- **Bypass and makeup:** a bypassed unit's wet gain is 0. The `DynamicsCompressorNode` makeup is inside the compressor node, so it reaches the output only through that gain and adds no level. The dry path goes straight to the output at unity. The check asserts wet 0 / dry 1 at construction. What this cannot check is the Chromium makeup value itself (not visible to the fake context; spec 4.1 quotes glue +1.4 dB, limiter +2.1 dB, which A9 must measure).
- **Limiter ceiling 0:** the output trim is 0 dB and the hard clip at -0.55 dBFS is the ceiling (wave-2 design). Limiter makeup is unchanged and still present.
- **Note on the saturator (flag for E5 and A9, not changed):** `K.shaperCurve(drive)` is `tanh(k x)/tanh(k)`, with k = 1 + 40 × drive. At drive 0.12, k = 5.8, so the curve's slope at zero is about 6. With mix 0.5 the wet/dry sum on a small signal is about 0.5 × 6 + 0.5, roughly +11 dB (the check prints the model value: wet slope 6.23, total +11.2 dB). Spec 4.1 says "saturator adds 1 dB rms" and "+1.3 dB" makeup; those were measured on the old master and may be for louder material, but I could not reconcile them from the curve. Bypassing sat therefore removes a large small-signal boost, not a 1 dB one. A9 should check the sat-on/off level on the V3 master before the spec's value is used.

## Task (2): per-track `lc` insert

**Yes, the chain already expresses it; no code change was needed.** `{type:'eq3', name:'lc', low:0, lowFreq:90, mid:0, high:0}` in a track's `chain` gives a low shelf at 90 Hz, transparent at 0 dB. `low` is set with `setParam('kick.lc.low', v)` (sequencer.js 239 routes `<track>.<name>.<param>` to `chain.set('lc.low')`) and ramped with a section `ramp` on the same path (the check uses `set` and a 1 s linear ramp). The mid peak and high shelf at 0 dB do nothing. Note for A7: `lc` must be in the kick's `chain` in `GUIDANCE_V3` (C1: values -2 to -7 in the build, -9 in the break, per section).

## Task (3): end tail

- **Capability:** `reverb` with `algo: 'freeverb'` and `size: 6.5`. `size` is the undamped RT60 (checked: the comb loop gain is 10^(-3T/size), and after 6.5 s a comb has fallen 60 dB). `hp` and `mix` apply; `decay` and `seed` do not (Freeverb has no envelope). A send such as `send.reverb` with `{type:'reverb', algo:'freeverb', size:6.5, damp: D, hp: 220}` gives it. A7 sets the values.
- **Frequency dependence (flag, not solved by me):** the spec gives RT60 6.5 s at 313 Hz, 5.5 at 413 Hz, 4.6 at 1 to 2.5 kHz, 5.1 at 2.5 to 6 kHz (E4 4e, E5). That is not monotonic (higher bands last longer than mid bands), and a damping lowpass in each comb can only make HF decay faster. Model (RBJ lowpass, Q -3 dB, comb 1116, RT60 = 60 / (60/size + loss per second)):

  | damp (Hz) | 313 Hz | 1 kHz | 2 kHz | 4 kHz | 6 kHz |
  |---|---|---|---|---|---|
  | 3000 | 6.49 | 5.39 | 1.54 | 0.23 | 0.11 |
  | 5000 | 6.50 | 6.36 | 4.67 | 0.93 | 0.28 |
  | 8000 | 6.50 | 6.49 | 6.24 | 3.66 | 1.25 |
  | 12000 | 6.50 | 6.50 | 6.48 | 6.06 | 4.52 |
  | 16000 | 6.50 | 6.50 | 6.50 | 6.47 | 6.30 |

  Damp 5000 matches the 2 kHz figure (4.67 against 4.6) but gives 0.9 s at 4 kHz (spec 5.1). No single damp value matches both bands. A different tone-shaping (an EQ after the reverb, or a shelf) would be needed for the spec's pattern; that is a design call for the coordinator and E5. The check asserts only the 313 Hz and 2 kHz model values.
- **Render tail (no code change needed):** `Sequencer.render` takes `opts.tail` (sequencer.js 538: `tail == null ? 2.5 : tail`), and `host.render` passes `tail` through (host.js 816). The render script's default is 2.5 s (`tools/render.js --tail`, A9's file). For V3: `node tools/render.js --page app --tail 6.5 ...`. No edit to A1's or A9's file is needed; the only thing needed is that the V3 render is started with `--tail 6.5`.

## Task (4): stereo noise burst

- The widener cannot widen a mono source: its side signal is (L-R)/2, which is zero when L = R, so `width` multiplies zero. A pan cannot make two channels either, since one mono voice gives L = R.
- **Smallest change, in my file:** `decorrelate` (type `decorrelate`, `time` 11 ms). Put it as a chain insert on the burst track: left = the noise as it is, right = the same noise 11 ms later. Noise's correlation time is much shorter than 11 ms, so L/R correlation should sit near 0 (E3's target for the burst: S/M near -0.6 dB; the target correlation of about 0.07 is what A9 measures). A tonal input would comb-filter, so this is for noise voices only.
- **Not changed:** the noise voice in `synths.js` (A7's file). If A7 prefers a `stereo` flag on the voice, that is the alternative; I did not need it. Or two tracks panned ±1 (E3's suggestion), which needs no processor change.
- Note for A7: the burst track's `chain` should be `[{type:'decorrelate', name:'dec'}]` (time default 0.011). It must come before any stereo-sensitive insert.

## Verification (exit codes read directly, run in /home/user/havantechno)

- `node --check app/engine/processors.js`: exit 0.
- `node --check tools/processors-check.js`: exit 0.
- `node tools/processors-check.js`: exit 0, `OK: 81 checks passed`. Sections 1 to 8 (earlier: the regression against the archived processors.js for every existing parameter, the delay loop and modulation, the Freeverb network and seed, chorus, widener, sidechain, limiter clip) still pass. New section 9:
  ```
  9. V3: master from song data, bypass without makeup, lc insert, stereo decorrelate, 6.5 s tail
    ok   compressor created bypassed: wet gain 0, dry 1 (no makeup from the unit)
    ok   compressor default: wet 1, dry 0 (unchanged)
    ok   chain entry bypass: true, threshold kept
    ok   V3 master: hp 24 Hz, lp 20000 Hz (already the defaults)
    ok   V3 master: eq unchanged
    ok   V3 master: limiter -1.5 / ceiling 0 / release 0.08 / clipOn / clip -0.55
    ok   V3 master: glue and sat bypassed
    ok   V3 master: glue wet path driven to 0 (the bypass fade)
    ok   lc: low shelf at 90 Hz (lowFreq option, applied on the shelf), 0 dB (transparent)
    ok   lc: kick.lc.low-style path sets -7 dB (set)
    ok   lc: a ramp to -4.5 dB is a linear ramp on the shelf gain
    ok   decorrelate: right line delayed 11 ms by default
    ok   decorrelate: input reaches the stereo merger directly (left) and through the delay (right)
    ok   decorrelate: the input reaches the delay line
    ok   decorrelate: time 0.02 s is automatable
    ok   size 6.5 s: comb loop gain 0.973465 (RT60 6.5 s for the undamped loop)
    ok   size 6.5 s: after 6.5 s the comb has fallen 60 dB
    ok   model: RT60 at 313 Hz 6.50 s (spec 6.5 s)
    ok   model: RT60 at 2 kHz 4.67 s (spec 4.6 s at 1 to 2.5 kHz)
    info model RT60 at 4 kHz 0.93 s (spec 5.1 s at 2.5 to 6 kHz; not asserted)
    info saturator small-signal gain (model): wet slope 6.23, with mix 0.5 total 3.61 (11.2 dB); not asserted
  OK: 81 checks passed
  ```
  (One earlier run failed on the `lc` frequency check because my check read the build-time value; `lowFreq` is applied on the shelf after build. The check now reads the scheduled call. The failure was in the check, not the processor.)
- `node app/engine/selfcheck.js`: exit 0, `OK: 340 checks passed`.
- Not verified: any audio. The fake context cannot show makeup values, the freeverb tail, the decorrelation correlation or the saturator level. All levels and correlations go to A9's render.

## For the coordinator

- Flag: the end-tail frequency pattern (spec 4.2) is not reachable with a damping lowpass; see the table above. A choice of damping (or an EQ after the reverb) is needed.
- Flag: the saturator's small-signal gain at the V3 setting (drive 0.12, mix 0.5) is about +11 dB by the curve arithmetic, which does not match spec 4.1's +1 dB figure. Bypassing sat changes levels a lot on quiet material; A9 should measure sat on/off before the bypass is accepted.
- Flag (A7): `lc` in the kick chain; `decorrelate` on the burst; the reverb send as `algo: 'freeverb'`, `size: 6.5`.
- Flag (A9): render with `--tail 6.5`; measure the glue and limiter makeup (not visible to the fake).
- No change needed in A1's or A9's files for any of the four tasks.

## 2026-10-24 02:31 EDT (06:31 UTC): clip overshoot, makeup documented, makeup trim (A9 section 7 items)

Read: `log-A9.md` section 7 (7.1 table; 7.3; the table of A8 items: glue +4.18, limiter +0.69, saturator +10.44 / +4.44 / +15.27; the clip overshoot -1.0025 at bar 127, R channel, against a clip level of 0.9386 (-0.55 dBFS), 3,336 samples at or over the clip level in bars 122 to 137).

### 1. Clip overshoot: fixed (processors.js, `BUILD.limiter`)

- **Mechanism (my reading; A9 did not isolate it):** the clip stage is a WaveShaperNode at 4x oversampling. The downsampler after the shaper is a filter, and it rings near the clip level, so the output can come back above the curve's level. The curve itself never exceeds the clip level, which is why A9's unit test of the shaper alone did not show the overshoot.
- **Fix:** a second WaveShaperNode, same curve, oversample `none`, after the first. It is memoryless and its curve ends at +/- the clip level with linear interpolation between points, so no output sample can exceed the clip level. Chain: compressor → ceiling trim → clip (4x) → clamp (none) → wet. With clipOn off, both curves are null, so both are identities.
- **Check (section 10):** steps containing 0.9973, -1.0025, 1.0025, 1.01, -1.2 are fed through the clamp's curve (emulated: input clamped to [-1, 1], linear interpolation, as the spec defines `none`): every output is at or below the clip level; 1.0025 maps to exactly the clip level. Before the clamp the raw worst value is above the level (asserted), so the case does exercise the bug. A 1000-point sweep stays under the level and is an identity below it.
- **Not verified in Chromium:** the bar-127 sample. Only A9's render can show that the overshoot is gone. Ask A9 to re-measure bar 127 and the clipped-sample count.

### 2. Makeup and level dependence: documented (processors.js comments; not in V3-SPEC)

Documented next to the specs as comments in `BUILD.compressor`, `BUILD.limiter` and `BUILD.saturator` (the spec objects have no note field; V3-SPEC.md is the coordinator's file and was not edited). Values from A9 (Chromium, V3 settings):

| unit | at small signal | level dependence | compensation |
|---|---|---|---|
| glue (compressor, threshold -14, ratio 2.5, knee 8, attack 0.02, release 0.25) | automatic makeup +3.68 dB, plus the explicit `makeup` 0.5 dB = +4.18 dB | the automatic part is fixed by the node's settings (not measured at other levels) | `autoTrim` (new, see 3) |
| limiter (threshold -1.5, ratio 20, attack 1 ms) | +0.69 dB, even below threshold | not measured | lower `ceiling` by the same amount (ceiling is the output trim) |
| saturator (drive 0.12, mix 0.5) | +10.44 dB at -40 dBFS, +4.44 dB at -6 dBFS | falls with level (tanh curve); mix 1.0 gives +15.27 dB at small signal, mix 0 gives 0 dB | none fixed; no fixed trim makes it unity at every level |

- **Settles my earlier flag:** my arithmetic gave about +11 dB at small signal, and A9's +10.44 dB agrees. Spec 4.1's "adds 1 dB rms" and "+1.3 dB" do not hold for this setting on quiet material. The V3 master bypasses the saturator, so V3 is unaffected; the default (wave-2) master still uses it.
- Bypassing a unit removes all of the above (A9: bypassed glue 0.00 dB, exact).

### 3. Makeup compensation option (off by default)

- **`autoTrim`** on `compressor` (dB, -12 to 0, default **0** = unity): a gain after the explicit `makeup`. Its value is the negative of the automatic makeup: `-3.68` for the V3 glue (net +0.5 dB from the explicit makeup), or `-4.18` for unity at small signal. Valid only for the settings it was measured at; the comment says so. With the default 0 the output is unchanged (checked: the trim gain is 1, and the `makeup` and threshold automation are untouched).
- **Limiter:** no new parameter. `ceiling` is already the output trim after the compressor, so `ceiling -0.69` compensates the +0.69 dB. Setting that is a V3 song decision (the V3 spec has ceiling 0).
- **Saturator:** no option (the error is level dependent, a fixed trim cannot fix it).
- Requested for A7 (V3 song data, `doc.master.glue`): `autoTrim: -3.68` if the explicit glue makeup 0.5 stays, or `-4.18` with makeup 0 for unity. A9 should check the glue's small-signal level on the V3 render after the choice.

### Automation

- All existing parameters keep their automation: the regression in section 1 of processors-check (every existing parameter, every archived type) passes. The limiter's new clamp and the compressor's new trim node are not connected to any existing parameter's automation; the trim is at unity by default.

### Checks (exit codes read directly, run in /home/user/havantechno)

- `node --check app/engine/processors.js`: exit 0.
- `node --check tools/processors-check.js`: exit 0.
- `node tools/processors-check.js`: exit 0, `OK: 92 checks passed` (section 10 adds 10 checks: the clamp wiring and curve, the overshoot step through the clamp, the sweep, the identity default, the autoTrim default and -3.68 setting, p.node still exposed).
- `node app/engine/selfcheck.js`: exit 0, `OK: 340 checks passed`.

### Not done / open

- Chromium check of the bar-127 sample and the clipped-sample count (A9).
- The glue's automatic makeup at other levels or settings (A9 measured at one setting).
- The coordinator may want the V3-SPEC note lines: glue `autoTrim -3.68` (or -4.18), limiter ceiling note (`-0.69` if the level matters), saturator "level dependent: do not use for V3". I did not edit V3-SPEC.md.
