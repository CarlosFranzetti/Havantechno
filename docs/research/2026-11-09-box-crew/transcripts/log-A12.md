# Log A12: TR-808 and TR-909 voices (Box Crew, batch 2)

Builder A12, 2026-11-09. Files written: `app/engine/drums.js` (global `Drums`), `tools/drums-check.js`. Not edited: `synths.js`, `selfcheck.js`, `index.html`. No commits. (An earlier session hit the 5-hour limit before writing anything; this run started from the transcripts.)

## What `Drums` is
`Drums.create(ctx, type, opts)`, `Drums.types()` (27 types, 808 first), `Drums.spec(type)`, `Drums.has(type)`, `Drums.bank(ctx)`, `Drums.STEP_DB`. Same instrument API as `Synths` (trigger(t, ev), set/get, params/spec, panic, dispose, out, `_live`). Own `makeInst`/`voice` copy of synths.js's pattern (not exported there). `drive` is a gentle soft clip of my own (drive 0 is a straight line), because `Kit.shaperCurve` is too hard for the spec's default drives. Accent: `ev.vel`, `ev.accent` x1.2 as in `Synths`; 909 voices also take `ev.step` 0/1/2 = weak/normal/accent at -18/-9/0 dB (absolute; absent = unchanged).

Every spec row has `basis` ('paper', 'prior', 'choice') and a `label` naming the source; prior rows are also marked prior in the code comments.

## A7: the one-line fallback (not applied)
In `Synths.create`, before the unknown-type branch: `if (!def && root.Drums && root.Drums.has(type)) return root.Drums.create(ctx, type, opts);`
Also needed by A7 (not part of the line): load `drums.js` right after `core.js` in index.html and in selfcheck's `load()` list; merge `Drums.types()` into what `Synths.types()` returns if the UI should list them. Without `createPeriodicWave` (selfcheck's fake) the metal bank falls back to `type = 'square'`, so no stub is required there.

## Constants from the papers or the 909 code ('paper')
- Metal bank: 205.3, 369.6, 304.4, 522.7, 800, 540 Hz, duty 47.98 % (built as a PeriodicWave once per context), band-passes 3440 and 7100 Hz, high-pass corner 10500 Hz, cowbell = 800 and 540 only (Werner, Abel, Smith 2014; SOS cowbell).
- bd808: 1 ms trigger pulse; attack centre-frequency shift of 2x for 6 ms (Werner: "more than an octave", 5 to 6 ms); centre 49.5 Hz default (range 35 to 90); a second 1 ms pulse at the end of the shift (the retriggering pulse); accent is amplitude only (the first-pass "frequency doubling" claim was dropped, per B2).
- bd909: 274 to 53 Hz, 60 ms hold, Tune = pitch-fall time constant 7 to 29.4 ms (default 7), Decay = time constant 12 to 100 ms (default 35), Attack = click gain in dB.
- sd909: Tune +/-0.5 oct on the body, Tone = noise decay time constant 40 to 200 ms, Snappy = noise gain in dB. Toms: hold 30 ms, decay time constant 40 to 150 ms, Tune +/-0.5 oct. Hats: hold 6 ms (closed) and 12 ms (open), decay time constants 8 to 60 ms and 30 to 160 ms, defaults 8 and 69 ms. Crash/ride Tune +/-0.5 oct. Step levels -18/-9/0 dB. Closed hat chokes open hat, one shared hat channel (group 'hat909', any new hat stops the previous one, as in channel.ts).

## Priors (by-ear constants or memory, to be fitted by A9; do not treat as measurements)
- 808: every decay time, the tone/q/band-pass Qs, the 0.6 ratio between the two hat bands' decays, the hat high-pass Q 1.5, cymbal band decay ratios 1 : 0.57 : 0.21 (io-808 700/400/150 ms), cymbal tone mapping, cowbell band-pass 2640 Hz (Reid's CR8000 figure), cowbell stage 15 ms / 400 ms with weights 0.75 / 0.25, sd808 238/476 Hz and its noise high-pass and 75 ms decay, clap band-pass 1000 Hz, four bursts at 10 ms, burst levels 1, 0.5, 0.5... (io-808's 1, .5, 0, -.5 is a bug), tail, tom and conga end points and decays (io-808 tomConga.js table), pitch sweep, clave 2450 Hz, rim 480 and 1750 Hz, maracas 5 kHz and 30 ms.
- 909: bd click decay and low-pass, snare base 190 Hz and ratio 1.83 (memory), snare body decay, glide and noise high-pass, tom base pitches and pitch envelope, rim three resonances 220/500/950 Hz with Q 10.5 (ER-99), clap 900 Hz high-pass, 1200 Hz band-pass, 10 ms bursts, and the whole synthesised hat/crash/ride content (6-bit/18 kHz `crush` is snippet-only).
- Two defaults deliberately differ from the 909 panel defaults: toms 80 ms and snare Tone 90 ms (not 150 and 200 ms), because the original voices are recordings that decay by themselves and the synthesised ones do not, so the knob maxima gave 1 s toms. The ranges are the paper's.

## Notes on behaviour
- 909 hats, crash and ride are rendered once per context into AudioBuffers by plain JS DSP (six pulse oscillators plus seeded noise, high-pass/low-pass biquads, optional sample-and-hold and bit-depth crush), cached in a WeakMap; no OfflineAudioContext needed. Hats are played flat and shaped by hold + `setTargetAtTime`; crash/ride have the envelope baked in.
- The 808 closed hat chokes the open hat (group 'hat808'; a new open hat also retriggers the single source). Choke = 5 ms fade on a per-voice gain plus source stop 6 ms after the choke time.
- Peaks at level 1, vel 1, defaults: 0.4 to 1.04 (Chromium offline render). The toms, snares and cymbal sit at 1.00 to 1.04 because the shaper's 2x oversampling overshoots slightly; no clipping logic added.
- Not done: no use of `ev.dur`; no `tuneGroup` for toms (tune is 0 to 100 per voice, the UI can offset); no per-voice pan (A7/Box UI).

## Checks and exit codes (read directly, no pipe to tail on the exit)
- `node --check app/engine/drums.js`: 0. `node --check tools/drums-check.js`: 0.
- `node tools/drums-check.js`: `OK: 322 checks passed`, exit 0. Covers: 27 types and specs (rows in range, basis marked), silent instrument without a context, every voice triggers/lands in `_live`/panic stops its sources 30 ms ahead/leaves `_live`, no non-finite AudioParam time or value, hat chokes (808 and 909, per context, groups separate), clamping of every parameter, bank frequencies/duty/filter centres (3440, 7100, 10500, cowbell 540/800, spread +/-5 %), PeriodicWave duty, bd808 and bd909 pitch tracks and hold, step levels, accent x1.2, hat buffers rendered once, hat/snare/bd ranges.
- `node app/engine/selfcheck.js`: `OK: 375 checks passed`, exit 0 (unchanged by this work; drums.js is not loaded by it yet).
- Chromium render test, scratch script `/tmp/claude-0/-home-user/341aa418-0695-5408-80be-331d2fec6cae/scratchpad/drums-render.js` (loads app/index.html through tools/serve.js on port 8123, injects drums.js, OfflineAudioContext, one hit per voice): all 27 voices finite and non-silent, exit 0, no page errors (a favicon.ico 404 is ignored). Durations at -60 dB re peak: bd808 0.37 s, oh808 0.26, ch808 0.05, cy808 1.29, bd909 0.33, oh909 0.50, cr909 3.5, rd909 3.0. Choke render (open hat, closed hat 100 ms later): the open hat's remainder after the choke is at -120 dB (808) and below -170 dB (909) re its pre-choke level.
- Not run: tools/browser-check.js and the other tools/*-check.js (untouched files).
