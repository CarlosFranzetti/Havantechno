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

## Third pass applied (service manuals), 2026-11-09
`drums.js` and `drums-check.js` updated to B2's and B3's "Third pass (service manual)" tables. Type and parameter names are unchanged (no parameter added or removed). `basis` is now one of 'manual', 'paper', 'source', 'prior' ('choice' is gone: those rows are 'prior'; `level` and `drive` carry no basis).

808 changes
- Decay is now seconds to 1/10 of the peak (the manual's definition); tau = decay / ln 10 everywhere in the 808 voices (and the shared envelope helper). Ranges: bd808 50/300/800 ms, cy808 350/800/1200, oh808 90/450/600, ch808 50 (range 30 to 100), toms/congas at the table mid decays (LT 200, MT 130, HT 100, LC 180, MC 100, HC 80), cl808 25, rs808 10, ma808 25, cb808 50, cp808 100 ms main decay.
- bd808: tune 56 Hz (range 45 to 70); every hit starts at 2.8x for 6 ms (paper); on accent the Q43 doubling is built as a 2x window for 4 ms right after the shift (the manual's "immediately after the trigger" overlaps the 2.8x shift, so the window follows it); tone range 400 to 5000 Hz.
- sd808: 238 and 476 Hz (manual); TONE is the balance between the two resonators (gain 2(1-tone) and 2 tone, capped at 1); the noise high-pass is fixed at 1200 Hz (prior, 800 to 1800); noise gate tau 48 ms; body 60 ms.
- Hats: band-pass stage a 7210 Hz (manual), stage b 3440 (paper, kept, the manual's 2620 not reconciled; `Drums.bank().bpPaper` keeps 7100); high-pass 7800 (OH) and 11700 Hz (CH); cymbal third band high-pass 14400 Hz. The paper's 10500 stays in the bank as `hpPaper`.
- Clap: three pulses (not four), 10 ms spacing (prior), pulse envelope tau 38.5 ms, 30 ms gate (caps the count: spacing 30 ms gives 2), main decay starts at the last pulse. cl808 2526 Hz, rs808 452.5 and 1667 Hz, ma808 high-pass 2340 Hz plus a 10.6 kHz low-pass. Toms and congas: table pitch ends, pitch-up sweep default 0.3 over about 5 ms (germanium diodes).
- Accent: the 808 accent hit is the full-scale hit and an unaccented hit is 1/ratio of it, ratios 2.86 BD, 3.33 SD, 3.43 LC/LT/HC/HT/CB, 3.33 MC/RS, 3.67 MT, 3.2 CL, 1.67 MA, 2.0 CY/OH/CH, CP 2.0 (the printed 0.33 is a probable misprint, prior). `Drums.ACC808` exposes them. Consequence: an unaccented hit at vel 1 peaks at 0.15 to 0.5 in the render test; accented hits are near full scale. `ev.accent` replaces the old x1.2.

909 changes
- Sampled voices: 30 kHz clock, 6-bit, ROM lengths 8192 (CH), 24576 (OH), 32768 (crash, ride) samples, buffers created at 30000 Hz with those lengths (Tune on crash/ride is playbackRate, so pitch and length move together); `crush` default 1 = the ROM, 0 = a clean buffer at the context rate. The hat decay ranges stay andremichelle's (the manual only fixes the closed path at 1/10 of the open one).
- bd909: Tune 7 to 40 ms, Decay 12 to 350 ms (defaults 7 and 35 ms from the source), click tau 0.7 ms, hold range 0 to 0.1. sd909: VCO ratio 1.47 (range 1.2 to 1.8), glide 20 ms, Tone range 40 to 340 ms with the source default 200 ms. Toms: decay 38 to 380 ms, default 150 ms (so the earlier 80 ms and 90 ms defaults, chosen to stop 1 s tails, are gone; A9 may bring them back). rs909: 495, 219, 1053 Hz, 5 ms. cp909: high-pass 185 Hz, decay default 100 ms.
- Accent: a 909 accent without `ev.step` is 6 dB (x2) over an unaccented hit at half scale; with `ev.step` 0/1/2 the -18/-9/0 dB levels apply as before.

Checks (exit codes read directly)
- `node --check app/engine/drums.js`: 0. `node tools/drums-check.js`: `OK: 341 checks passed`, exit 0 (new cases: kick 56 Hz and 18 ms, doubling window, all 16 accent ratios, decay extremes, three clap pulses and the gate, 238/476, 2526, 452.5/1667, 2340, tom/conga ends, 909 sample clock 30 kHz and ROM lengths, 6-bit, ratio 1.47, rim and clap filters, 6 dB accent).
- `node app/engine/selfcheck.js`: `OK: 392 checks passed`, exit 0. `node tools/faces-check.js`: `OK: 2495 checks passed`, exit 0 (it already renders every Drums type).
- Chromium render (scratch drums-render.js): 27 voices finite, no page errors, exit 0; choke residual -127 dB (808) and below -165 dB (909).
