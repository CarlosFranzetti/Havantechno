# Log T2 (Selector Crew): A2 and A3, the Juno and the 303 in the worklet

Builder T2. Task: row T2 of `../BRIEF.md` (strategy steps A2 and A3). Files owned: `app/engine/worklets/classics-processor.js`,
`app/engine/classics.js`, `tools/classics-check.js`, `tools/juno-bench.js`, `tools/tb303-bench.js`. Every number below was
measured in this session, with the command that produced it. Nobody has listened to anything, and nothing has been
compared with a real unit.

## 2026-11-27 02:06 EST (07:06 UTC): reading, and the "before" snapshot

Read `BRIEF.md`, `memory.md` (Now), `CLAUDE.md`, `docs/plans/2026-11-21-strategy.md` (A2, A3), `app/engine/worklets/classics-processor.js`
(all of it), `app/engine/classics.js`, `tools/juno-bench.js`, `tools/tb303-bench.js`, `tools/classics-check.js`, the seed
and `snapTime` parts of `app/engine/sequencer.js` (lines 120-135, 180-195, 380-470), Pressing Crew log-G1 (the per-hit
generator: `Math.random` is replaced, for the length of one `inst.trigger`, by a generator seeded by track, absolute step,
n-th trigger on that step and `seq.seed`).

What the Juno's voice loop is today: one sample per output sample. PolyBLEP saw and pulse (and the sub), the 4-pole TPT
ladder with one tanh at its input, ADSR, VCA, six voices summed, then HPF and the BBD chorus. No oversampling (the 303
and the Model D run at 4x with Open303's elliptic quarter-band decimator).

How instruments are made: `sequencer.js` line 187, `Synths.create(seq.ctx, def.inst || name, def.params)`. No seed reaches
an instrument; the Juno's processor gets the constant seed 106 (`classics.js` BUILD.juno), the Model D 22051.

Before snapshot (copies of my five files taken before any change, md5): classics-processor.js 7305e4da8b9f2e4e3381134c655648c5,
classics.js cd338c17ced78245574313b278db3f28, juno-bench.js 3f7949138acb914206a7564f028c2131, tb303-bench.js
b88b362788720bc83f1cd1159653ea3c, classics-check.js 9401d4f9423ccbd4cfdf3b07f96a3e12. Kept in my scratch folder
(`<scratch>/before/`), never in the repository; `tools/juno-bench.js --proc <file>` serves such a copy in place of the
working processor, which is how every "before" row below is measured with the same bench.

The machine has 4 cores and two other builders render in Chromium at the same time: every timing below is noisy, and I
give best-of-N and the spread.

## 2026-11-27 02:10 to 02:40 EST (07:10 to 07:40 UTC): "before" measurements

All with the working tree as found (my files unchanged), commands run from the repository root, output files in my
scratch folder:

- `node tools/classics-check.js`: `OK: 131 checks passed`, exit 0.
- `node tools/tb303-bench.js --out <scratch>/tb303-before.json`: exit 0, 13.2 s (the full table is in that file; e.g.
  slide 60: 19.3 / 57.3 ms to 50 / 90 %, output peak of the 2-bar pattern at defaults 0.761, grid max 4.119).
- `node tools/juno-bench.js --out <scratch>/juno-orig-before.json`: exit 0 (chorus sweep I 1.703..5.324 ms at 0.513 Hz,
  II 1.677..5.343 at 0.861 Hz; correlation progression I 0.37, II 0.379; hiss at the default -80.9 dBFS; offline CPU 16 s of
  the progression: off 773 ms, I 1329, II 1271).
- Live context in headless Chromium, probed first (`<scratch>/probe.js`): with `--autoplay-policy=no-user-gesture-required`
  an AudioContext runs (state running, context clock 1.010 s over 1.001 s of wall clock), `playbackStats` exists
  (underrunEvents, underrunDuration ...), and in the AudioWorkletGlobalScope `performance` is undefined, `currentFrame`
  and `Date.now()` exist. So the live cost is measured with Date.now() around each process() call (whole milliseconds,
  averaged over about 2170 blocks per run) plus the underrun count.

## 2026-11-27 02:40 EST (07:40 UTC): A2, the oversampled voice loop

`classics-processor.js`, JunoProcessor: the DCO (saw, pulse, sub and its RC), the mix and the TPT ladder now run `os`
times per output sample (JU.os = 4); pitch, cutoff, envelopes, LFO, noise and the PWM duty are computed once per output
sample and held. The six voices' VCA outputs are summed per sub-sample and decimated once by Open303's elliptic
quarter-band filter (the 303's and the Model D's decimator, already in the file under its MIT notice). Measured
response of that filter at 176.4 kHz (`<scratch>/ell.js`, from its coefficients): +0.10 dB at 15 kHz, +0.08 at 18 kHz,
-2.15 at 20 kHz, -38.4 at 21 kHz, -77 at 22.05 kHz, under -96 dB from 23 kHz. The cutoff cap stays 0.4 x the base rate.
The decimator sleeps once no voice sounds and its output is under 1e-12 (so silence is exactly 0, which an existing row
of classics-check needs). `processorOptions.os` 1 runs the old loop.

Equivalence: `<scratch>/ident.js` runs the snapshot processor and the new one in Node on a two-chord pattern with pulse,
saw, sub, noise, resonance 2 and the chorus: largest sample difference at os 1 (A3 rows 0): **0** (bit-identical); at
os 4: 0.154 (peak 0.281; the waveform moves by the decimator's delay and the response near Nyquist).

## Aliasing, before and after (juno-bench section 6, Chromium, 44.1 kHz)

`node tools/juno-bench.js --only alias --proc <scratch>/before/classics-processor.js` (before) and
`node tools/juno-bench.js --only alias --compare ...` (after), exit 0 both. Alias power re line power over 20 Hz to
20 kHz / the same under 5 kHz / the strongest alias bin re the strongest line (dB):

| case | before (1x) | after (4x) |
|---|---|---|
| saw MIDI 72 | -38.5 / -46.6 / -49.9 | -56.3 / -59.3 / -69.5 |
| saw 84 | -35.5 / -43.9 / -44.7 | -53.1 / -55.9 / -64.3 |
| saw 96 | -32.5 / -40.6 / -38.6 | -49.8 / -52.5 / -57.9 |
| saw 103 | -30.8 / -39.6 / -35.3 | -47.6 / -50.7 / -54.3 |
| saw 108 | -29.6 / -39.2 / -33.1 | -45.9 / -48.0 / -51.7 |
| pulse duty 0.05, 96 | -25.1 / -30.6 / -25.7 | -41.1 / -45.3 / -43.6 |
| PWM depth 1 (duty 0.05..0.5) at 21.8 Hz, 84 | -34.9 / -43.7 / -46.3 | -59.5 / -62.4 / -76.1 |
| PWM depth 1, 96 | -31.6 / -39.9 / -40.1 | -62.1 / -64.8 / -75.8 |

Floor of the method (`<scratch>/floor.js`: an additive band-limited saw at 72 / 96 / 108 through the same analysis):
-88.7 / -88.8 / -89.6 dB, so every figure above is at least 25 dB over it. What is left at 4x is the PolyBLEP residue and
the tanh at the ladder input; I did not separate the two.

## Cost, before and after

Offline (section 5: render time of 16 s of the PAD progression, best of three) and live (section 7: microseconds of
process() per 128-sample block per instance, best of three runs of 6 s; the block budget is 2902 us), two pairs run
back to back (`--only cpu,live`, before with `--proc`). The machine has 4 cores shared with two other builders, and the
three runs of one setting spread by up to a factor of two (the "runs" lists in the JSON files), so read these as
ranges:

| | before, pair 1 | after, pair 1 | before, pair 2 | after, pair 2 (decimator push) | after, full bench run |
|---|---|---|---|---|---|
| offline, chorus off | 947 ms | 1697 ms | 638 ms | 1078 ms | 1030 ms |
| offline, chorus I | 1552 | 2542 | 1179 | 1442 | 1430 |
| live, 1 instance, us/block (runs) | 165 (165, 320, 169) | 329 (497, 487, 329) | 162 (263, 162, 193) | 207 (207, 352, 342) | 254 (254, 317, 295) |
| live, 4 instances, us/block per instance | 252 | 350 | 150 | 264 | 258 |
| live, 4 instances, share of the budget | 0.348 | 0.482 | 0.206 | 0.364 | 0.355 |
| live, 4 instances, underrun events | 0 | 32 | 0 | 8 | 11 |

After pair 1 I gave the elliptic filter a `push` (its state update without the output sum) for the three sub-samples
whose output the decimator drops: the same numbers, fewer multiplies. In Node, six held voices for 3 s: os 1 187 to 316
ms, os 4 312 to 323 ms (three runs each). Summary: the Juno costs about 1.3 to 2 times what it did; four instances with
the chorus take about a third of the live budget here, and the live runs after the change counted underrun events
(8 to 32 per 6 s at four instances) where the runs before counted none. Whether a headless fake output device's underrun
count means anything on the owner's Mac is not known; it is not measured there.

## 2026-11-27 03:00 EST (08:00 UTC): A3, seeds, variance, drift, the 303's tuning error

How a seed reaches the instruments, in the spirit of G1 (deterministic per track and `seq.seed`, the same draw however
the render starts):

- `Classics.create(ctx, type, opts)` reads `opts._seed` (a number) as the instrument's seed; without it the seed is fixed
  per type (juno 106, tb303 303), as before. The sequencer does not pass one yet: see Requests.
- Juno: processorOptions `{seed: 106, vseed: <instrument seed>}`. `seed` keeps feeding the noise and the BBD hiss
  exactly as before; `vseed` feeds only the new deviates. Each voice v has five fixed deviates (pitch, cutoff, attack,
  decay, release): the sum of four uniforms from MurmurHash3's fmix32 finaliser (public domain), scaled to unit variance,
  so |z| <= 3.46 by construction.
- Drift: a smooth function of SONG time, not of how long the processor has run: lattice values every 8 s per stream,
  smoothstep between, evaluated once per block, through a 50 ms one-pole (so a jump of the song position at a loop is not
  a step). Pitch drift is one curve for all six voices (one master clock); cutoff drift one curve per voice. The song
  time is `currentFrame / fs + songOff`, and classics.js writes `songOff = ev.songTime - t` at a note when the event
  carries `ev.songTime` (see Requests); without it songOff stays 0 and the drift follows the context clock.
- 303: `tuneError` (cents, default 0): every MIDI key gets a fixed offset `tuneError x z(seed, key)`, added to the pitch
  classics.js writes at the note (worklet and fallback alike); the processor is unchanged for the 303.

New spec rows, all basis `prior`, each label stating its bound (3.46 sd):

| row | default | meaning |
|---|---|---|
| juno.voiceTune | 0.2 ct | per-voice pitch offset sd (DCOs: in tune by design, memory, not read) |
| juno.voiceCutoff | 15 ct | per-voice cutoff offset sd |
| juno.voiceEnv | 2 % | per-voice scale of attack, decay, release (one deviate each) |
| juno.driftTune | 0.3 ct | slow pitch drift sd, common to the voices |
| juno.driftCutoff | 10 ct | slow cutoff drift sd, per voice |
| tb303.tuneError | 0 ct | per-key offset sd; 0 so that every row of tb303-bench stays (measured: nothing moved) |

The sizes are my priors. No unit has been measured for this project and nobody has listened.

The panels check (`tools/panels-check.js`, not mine) requires a control for every spec row and stopped at
"HVT-303: every spec row has a control (missing: tuneError)", exit 1. So the A3 rows are behind a feature test in
classics.js: on a page that has loaded panels.js, `Classics.spec()` and new instruments leave the six rows out until
`Panels.a3 === true` (Requests, item 3); the processor's own defaults for them are 0, i.e. the engine without A3. Where
panels.js is not loaded (the Node checks, the benches' pages do load it... see below) the rows are in.

Correction, checked: the benches open `app/index.html`, which loads panels.js, so with the feature test the rows would be
hidden there too. Both benches now set `Panels.a3 = true` in their page helper (bench pages only, commented), and the A3
rows below were measured with that (and gave the same figures as before the feature test went in).

## 2026-11-27 08:50 EST (13:50 UTC): A3 measured

Node, `node tools/classics-check.js` section 6b (these numbers are printed by the rows):
- Two renders of a six-note chord, defaults, chorus I, one vseed: identical to the sample. Two vseeds: largest sample
  difference 0.534 (peak 0.505), level -0.66 dB.
- Deviates over 7 seeds x 6 voices x 5: 210 values, all |z| <= 3.46, mean -0.032, variance 1.010.
- Through the DSP: voiceTune 5 ct, one voice at A4, two seeds: 439.007 and 439.807 Hz, -3.15 ct apart, predicted from the
  deviates -3.16 ct.
- voiceEnv 20 %: every voice's attack time equals 0.5 s x (1 + 0.2 z) (to 1e-6), within 1 +- 0.69.
- Drift: a processor that starts at song time 9 s and runs 1 s agrees with one that ran from 0 to 10 s to 9.1e-8 (in sd
  units); over 400 s of one stream the largest value is 1.78 (bound 3.46) and the largest 10 ms step 0.0051 sd.
- tb303 tuneError 10, seeds 1 and 2, keys 36 38 48 36 43 60: -3.6 10.0 -24.3 -3.6 1.2 2.5 / -7.5 4.3 -10.1 -7.5 25.7 22.7 ct;
  a key keeps its offset; the fallback 303 and the fallback juno play the same offsets as the worklet path.

Chromium:
- `node tools/juno-bench.js --only seed` (exit 0): the PAD progression, chorus II, 4 bars: `_seed` 7 twice: largest
  difference **0** (identical to the sample, both channels); `_seed` 8: largest difference 0.717, level +0.21 dB.
- `node tools/tb303-bench.js --compare <before>` (exit 0, 10.9 s): tuneError 10, keys 36 38 43 48 36, the oscillator
  frequency from the probe in the middle of each note: seed 1 -3.620 9.967 1.196 -24.278 -3.620 ct, seed 2 -7.474 4.305
  25.695 -10.134 -7.474 ct, equal to the prediction to 0.001 ct; seed 1 twice identical to the sample. Every other value
  of the bench is within its 2 % / 0.2 dB compare tolerance of the before run ("values that moved": only the new
  tuning rows).

## Changed behaviour (measured)

- Juno, A2 (always on, also in the app now): `juno-bench --only seed`, PAD progression with chorus II and the A3 rows 0,
  4x against the old loop (os 1, which is the old engine sample for sample): RMS +0.07 dB; band levels 20 Hz-5 kHz +0.07,
  5-10 kHz +0.42, 10-15 kHz -0.58, 15-20 kHz +0.22 dB. A held A3 on the default filter, Node: +0.08 dB. The waveform moves
  by the decimator's delay (largest sample difference 0.154 of 0.281 on the Node pattern). The chorus rows of juno-bench
  did not move (sweep, wet response, hiss); progression correlation I 0.37 -> 0.361, II 0.379 -> 0.371. Cost: see the table.
- Juno, A3 defaults (only where the rows are present, i.e. not yet in the app: see the feature test): against the old
  loop RMS -0.24 dB; bands -0.25, +0.46, -0.56, +0.28 dB. Unison is no longer exactly in tune (voiceTune 0.2 ct sd).
- 303: none at the default (tuneError 0): the pitch written is the key exactly (classics-check row) and the bench moved
  nowhere.

## Requests

1. `app/engine/sequencer.js` line 187 (coordinator): pass each instrument a seed derived from the track and `seq.seed`, so
   two tracks differ and a project keeps its sound:
   `: Synths.create(seq.ctx, def.inst || name, seeded(def.params, hash32('inst:' + name + ':' + seq.seed)));`
   with, next to hash32, `function seeded(p, s) { var o = {}, k; if (p) for (k in p) if (p.hasOwnProperty(k)) o[k] = p[k]; o._seed = s; return o; }`
   (do not mutate def.params). Feature test on my side: without `_seed` the seed is 106 / 303, as now. Synths.create
   already forwards opts to Classics.create (synths.js 1064). Model D ignores `_seed` (its seed stays 22051).
2. `app/engine/sequencer.js`, `schedule()` where the cell event is made (`var e = { vel: ..., step: absStep }`): add
   `songTime: absStep * sd` (sd is `seq.stepSec()` already in scope), so the Juno's drift follows the song position and a
   render from bar 16 draws the same drift as one from bar 0. Feature test: classics.js writes songOff only when
   `typeof ev.songTime === 'number'`. Not verified end to end: I could not run it without the line.
3. `app/ui/panels.js` (coordinator): a control for `tuneError` on HVT-303 (a trim knob, like slideTime's) and for
   `voiceTune`, `voiceCutoff`, `voiceEnv`, `driftTune`, `driftCutoff` on HVT-106 (trims, like the HISS knob, conditional
   on `P.voice(null).entry(...)`), then `Panels.a3 = true;` after the definitions. Until then classics.js hides the six
   rows on any page that loaded panels.js, and tools/panels-check.js passes.
4. No new Web Audio node type: nothing for selfcheck's fake context.

## 2026-11-27 08:54 EST (13:54 UTC): every check, as run

`for f in app/engine/selfcheck.js tools/*-check.js; do timeout 600 node $f; done` (each exit code read directly), then
`node tools/drums-score.js`; browser-check and classics-check rerun at the end:

selfcheck 481 exit 0; analysis 26 / 0; browser-check 30 / 0; classics 151 / 0 (131 before: 20 new rows in 6b, and the
two frozen-name rows now list the six A3 rows); drums 372 / 0; export 51 / 0; faces 2499 / 0; import-view 122 / 0;
importer 20 / 0; panels 202 / 0 (with the feature test; 1 failure, exit 1, before it); presets 1908 / 0; processors 92 / 0;
rom909 12 / 0; sampled909 116 / 0; shell-files 227 / 0; shell-separate 97 / 0; solo 151 / 0; step-view 72 / 0; synths 169 / 0;
system-editor 105 / 0; views 144 / 0; widgets 157 / 0. drums-score: 86 pass, 19 fail, exit 1 (the baseline).
Not mine: separate-check (T1's) exit 1, "a Python with numpy and scipy: none found". fit-check (T3's, unfinished): my
loop ran it once before the coordinator's message asking to skip it (exit 2, two toy-fit rows failing); to be reported
as not run.

## Not verified

- Nobody has listened to the oversampled Juno or to the variance and drift; no unit has been measured: every A3 size is
  a prior.
- The drift through the sequencer: `ev.songTime` and `_seed` are not passed yet (Requests 1 and 2), so the seeded
  per-track behaviour and the mid-song agreement are checked only in Node at the processor and with explicit `_seed`.
- In the app (panels.js loaded) the A3 rows are hidden until Request 3; A2 is on everywhere.
- Live cost is from a headless fake output device on a shared 4-core machine (spread up to 2x between runs); nothing
  measured on the owner's Mac. The underrun events counted after the change (8 to 32 per 6 s at four instances) are not
  explained.
- The remaining aliasing at 4x was not split between the PolyBLEP residue and the tanh.
- 48 kHz and other rates: the decimator's corner scales with the rate; only 44.1 kHz was measured.
