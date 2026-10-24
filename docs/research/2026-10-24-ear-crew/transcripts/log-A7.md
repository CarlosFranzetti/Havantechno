# Log A7: Ear Crew round 3, the V3 build (synths.js, core.js, song.js)

Owner files: `app/engine/synths.js`, `app/engine/core.js` (CHORDS addition only), `app/engine/song.js` (new constant `GUIDANCE_V3`, `Song.documentV3()`; `GUIDANCE` and `GUIDANCE_V2` untouched). New file: `tools/synths-check.js` (Build Crew file, extended; section 9 is the V3 block). No commits.

## Start (2026-10-24 01:39 EDT, 05:39 UTC)

- Read `V3-SPEC.md` whole (706 lines), `BRIEF.md`, the coordinator's log from 00:31 to 01:18 EDT (the rulings on flags C1 to C16, swing 0.40 with the bass step-6 nudge, the on-beat layer `shaker_on`, the tick, the burst), `log-A8.md` and `log-A9.md`.
- Other logs: `log-A8.md` asks A7 for three things: a `lc` eq3 insert on the kick (done), a `decorrelate` insert on the burst (done, both bursts), and the reverb send as freeverb size 6.5 for the end tail (see Decisions, not taken). `log-A9.md` is waiting for this hand-back and for the accessor name (below).

## Built

**synths.js** (all new parameters default to today's sound; `synths-check` section 5 still matches the archived synths call for call, 1305 calls):

| instrument | new spec entries (default) | what they do |
|---|---|---|
| kick | `attack` (0.0015), `swell` (0 dB), `clickDecay` (0.012), `harmonic` (0), `length` (0) | attack: linear rise; swell: a jump to -swell dB within 1.5 ms, then the rise to full at attack (`kickEnv`); clickDecay: the noise click's decay, the knock scales with it (0.022 x clickDecay/0.012); harmonic: a 2f sine on the same pitch curve and envelope, times `harmonic`; length: a 3 ms fade ending at `length` |
| sub | `run` (0), `beat` (0 Hz), `beatLevel` (-2.6 dB), `beat3` (0 Hz), `beat3Level` (-5.8 dB) | run 1 with mode drone: one voice that lives across triggers, the pitch glides (`glide`) and the level follows each trigger, panic() ends it; beat / beat3: partial lines below the carrier at the given dB, through the carrier's envelope |
| clap | `first` (0) | first 1: burst 0 peaks at first x g; the later flams and the main burst go to 0.33 g (-9.5 dB) |
| shaker | `hold` (0) | flat at the peak for `hold`, then the decay (envHold) |
| riser | `floor` (0.0001), `hold` (0) | floor > 0.0001: the rise starts at floor x the plateau (0.04 is about -28 dB); hold: the plateau before the 30 ms end ramp |
| hat_open, hat_closed | none (metalHp exists) | |

`core.js`: `'m11f': [0, 3, 7, 10, 14, 17]` added to CHORDS (G#3 B3 D#4 F#4 A#4 C#5 at octave 3, checked).

**song.js**: `GUIDANCE_V3` is a new literal (not a copy of GUIDANCE; the spec's "deep copy" was read as "new constant from the same sources"). Swing 0.40, progression `['G#m11f']`, the GUIDANCE sends, 15 sections totalling 200 bars (E4's table with the rulings: `break` 16, `breakLate` 8, `breakEnd` 7, `gap` 1, `mainB_c` 4 and so on). Tracks: `kick` (A and the gap's G), `sub` (drone, run, partials, sidechain depth 0.78 curve db), `bass` (G#1, variant D with the +2/24 nudge), `stab` (G#m11f, variant S with 12 and 6 step gates), `pad`, `clap`, `hat_open` (the only off-beat hat, with `lp` filter), `shaker` (ghost G), `shaker_on` (X at -3 dB), `tick` (T), `burst` and `burst_r` (pan -1 and +1, `decorrelate`), `bed` (riser fx). `hat_closed` is not a track (C4: `hat_open` carries the break hat). `lead`, `perc`, `riser` and `impact` fx are absent. `documentV3()` = `SongDoc.fromLegacy(GUIDANCE_V3)` with `doc.master`. The master (E5, section 4.1) rides in `doc.master` (hp 24, lp 20000, glue and saturator bypassed, limiter threshold -1.5, ceiling 0, clipOn, clip -0.55). `Song.build` applies a def's `master` too (new, guarded by `if (def.master)`; GUIDANCE has none, so nothing changes for it).

## Decisions where the spec is ambiguous or open

1. **Run drone.** The spec names no parameter; I used `run` (0/1), as the spec's suggestion. A running voice has no stop: it ends at panic() (and the next trigger starts a new one). The sub is kept in `play` in the break with `sub.level` 0, so the phase keeps running.
2. **Partial phase (-126 deg) is not built.** The `beat3Phase` entry is not in the spec, because I cannot start a running oscillator at a phase without a PeriodicWave; E1 round 1 says the start phase free-runs within about +/-50 deg anyway. The line is at its level and its offset.
3. **Clap `first`.** I read "scales the later flams and the main burst to 0.33 g" as: later flam peaks and the main burst peak at 0.33 g (so the tails also scale by 0.33). Default first 0 keeps today's 0.7 g and g.
4. **Riser `floor`.** Relative to the plateau (g x 0.6 x floor), so 0.04 is -28 dB. Default 0.0001 keeps today's absolute start.
5. **Bed.** `fx` bar 4 (bar 108) of `break`, 16 bars of rise, then a plateau of 15 bars (`hold` 28.571 s) that ends at bar 139. E3 says the bed drops 6 dB over 136 to 139 and then does not say how long it lasts; I ended it at 139 with a `bed.level` ramp to 0.5 over bars 136 to 139 in `mainB`. Breaking the bed off at 139 is a choice (no measurement after 139).
6. **Stab bars 1 and 2.** E5 gives -10 dB against -3.8 for bars 3 and 4, and the pattern alone cannot reach that: I set the bars 1 and 2 velocities to 0.207 (the pattern's 0.85 times 0.24), measured to -9.6 against the target -10. E2 puts `step 7` and `step 4` at medium confidence; I kept 0.85 on them.
7. **Hat tone opening (C6).** E5's 3500 Hz at bar 16 to 11000 at bar 24 (`hat_open.lp.cutoff`, the chain's `lp` filter); E3's bar-8 version is not used.
8. **Breakend stab cutoff.** 700 to 1000 Hz over breakEnd's 7 bars (about +6 dB at 2 kHz on a 2-pole lowpass, an estimate: E2 gives +7 dB, the exact cutoff is not in the spec).
9. **Kick `length`** is 0.197 s with a 3 ms fade (E1's cut); the body osc itself is not stopped.
10. **End tail (open, not built).** A8 offers a freeverb send with `size 6.5`. Adopting it would change every reverb tail in the song; the spec's own choice (a long song-wide send or a throw on the final clap and burst) is still open. The render tail of 6.5 s is used (`--tail 6.5` in the full render below).
11. **The on-beat layer's level** is measured to -26.4 dB re kick (E3 gives -26.4): the gain is 0.083 on `shaker_on`.
12. **Hats.** `hat_closed` is not in the V3 song (C4); the engine keeps the instrument.

## Levels: how the gains were set (solo renders, measured, not from the table alone)

Method: `node tools/render.js --page app --sections <section> --bars 16 --song v3 --solo <track>` for each track in its section; sample peak of each hit over the first 120 ms (E5's definition), mean over the hits, in dB re the mean kick hit peak in mainA (kick solo, gain 0.58, unchanged). Sub and pad are RMS (sub 150 to 450 ms after each bar's kick; pad C#5 band 530 to 580 Hz in mainA2). Bed: absolute mean square in the mid, 4 to 8, 8 to 12, 12 to 16 kHz over bars 120 to 127 (absolute song bars 104 to 128 render). The script is in the scratchpad (`a7_levels.py`, `a7_measure2.py`), not in the repo.

| track | target re kick (E5/E3) | measured, first pass | final gain | measured, final |
|---|---|---|---|---|
| kick | 0 (reference) | -3.44 dBFS | 0.58 (E1) | ref |
| sub | -20 (RMS 150 to 450 ms) | -21.9 | 0.088 | -19.95 |
| bass | -2.7 (mainB hits) | +2.9 (gain 0.9) | 0.305 | -2.76 |
| stab bars 3-4 | -3.8 | -16.9 (gain 0.09) | 0.41 | -4.11 |
| stab bars 1-2 | -10 | -16.4 | velocity 0.207 | -9.64 |
| pad (C#5) | -35 | -43.7 | 0.68 | -35.03 |
| clap | -17 | -26.7 (0.22), but the second read gave -9.9 at 0.67 | 0.296 | -17.02 |
| hat_open | -18.3 | -18.55 (0.15) | 0.154 | -18.03 |
| shaker (ghost) | -31 | -21.9 (0.12) | 0.042 | -31.06 |
| shaker_on | -26.4 | -30.8 (0.05) | 0.083 | -26.41 |
| tick | -33.3 | -29.7 (0.08) | 0.053 | -32.57 |
| burst (each) | -30 | -24.7 (0.1), -26.0 at 0.055 with the decorrelate | 0.035 | -29.94 |
| bed (4-8 / 8-12 / 12-16 kHz, dBFS^2) | -45 / -45 / -48 | -55.3 / -55.4 / -56.8 (0.3) | 0.9 | -45.8 / -45.8 / -47.2 |

The first readings were not linear in gain for clap, burst, bass and the stab velocity (the bass drive shaper and the decorrelate insert are not linear), so each track was re-rendered after each correction (three passes for clap, burst, bass and stab). Sub, pad, hat, ghost, tick and shaker_on were within 0.7 dB at the first pass. Limiter note: the solo renders are through the V3 limiter (threshold -1.5), so the kick is not on the record's unlimited scale. E5's table is for master-bypassed solos; the relative values are what the gains track.

## Verification (exit codes read directly)

```
$ node --check app/engine/synths.js        -> exit 0
$ node --check app/engine/song.js          -> exit 0
$ node --check app/engine/core.js          -> exit 0
$ node --check tools/synths-check.js       -> exit 0
$ node tools/synths-check.js               -> OK: 109 checks passed   exit 0
$ node app/engine/selfcheck.js             -> OK: 340 checks passed   exit 0
$ node tools/render.js --page app --sections mainA --bars 16 --song v3
    rendered app-mainA-0-16-v3: bars 40..55 (16 bars, 33.08 s incl. tail) in 9.89 s
    page errors: none                                             exit 0
```

synths-check sections 1 to 8 are the wave-1 and wave-2 checks, unchanged except: the sampler's own `gain` is gone (the common level), and the sub's running voice needed a fix found by the measurement (the envelope was not connected to the instrument output; a connection check now guards it). Section 9 (Ear Crew, 34 checks): kick swell/attack, length, harmonic, clickDecay; sub partials (1.2027 and 3.608 Hz, -2.6 dB), the running voice (one voice across triggers, glide, panic); clap `first` and its default; shaker `hold`; riser `floor` and `hold` and its default; the m11f chord; GUIDANCE_V3's 15 sections, 200 bars, order, swing, no lead/riser/impact/perc, no riser or impact fx; V3 schedules 200 bars (kick 799 because the gap has three hits); `documentV3` schedules the same hits; bass D is a two-bar variant with the nudge and the accent; the document carries swing 0.40 and the master; **Host.create({doc: Song.documentV3()})** opens 15 sections and 13 instruments, and applies the master (Node, no audio).

Full song (after the last gain change): `node tools/render.js --page app --bars 200 --song v3 --tail 6.5`: rendered app-bars-0-200-v3: bars 0..199 (200 bars, 387.55 s incl. tail) in 146.10 s, page errors: none, exit 0. Output `tools/out/app-bars-0-200-v3.wav` (git-ignored). Sidecar latency 458 samples.

## Not verified

- No listening and no scoring. The gains are set against the solo hit peaks of this render, not against the record's loudness per section; per-section LUFS and band deltas are A9's to measure (the V3 loop).
- The sub's running voice and the clap `first` are unmeasured against the record beyond the level tables.
- The bed's end at bar 139 and the stab's breakEnd cutoff ramp are estimates.
- The end tail is not built (decision 10). The reverb tail on the last hit is the song's own.
- `beat3Phase` is not built (decision 2).
- The `choke` and `hat` mechanism of the sampler is untouched.

## For A9

- **Accessor:** `Song.documentV3()` (song.js), used by `tools/render.js --song v3` (the flag is there already) and by `Host.create({doc: Song.documentV3()})`. `Song.GUIDANCE_V3` is the plain data; `Song.build(seq, Song.GUIDANCE_V3)` works too (it also applies the master).
- **Sections (15):** intro 0, intro2 16, build 24, mainA 40, mainA_b 56, mainA2 76, mainA3 88, break 104, breakLate 120, breakEnd 128, gap 135, mainB 136, mainB_b 152, mainB_c 180, outro 184. Your score tool's 9-window table needs the union (E5 says so).
- **Swing 0.40** (engine: odd sixteenths late by 15.7 ms; bass step 6 nudged by +2/24 step, about 9.9 ms, in variant D of bar 1).
- **The full render:** `node tools/render.js --page app --bars 200 --song v3 --tail 6.5` (see the result below).
- **Latency:** the render's sidecar reported 588 samples in the first V3 render and 458 in the full render; you are measuring the offset, not me.

## For A8

- `lc` is in the kick's chain (`{type:'eq3', name:'lc', low:0, lowFreq:90}`), set through `kick.lc.low` (-2 to -7 in the build, -9 in the break and breakEnd and the gap, 0 elsewhere). Done.
- `decorrelate` (time default) is the chain of both burst tracks. Done.
- Freeverb end tail: not adopted (decision 10).
- A8's `master` settings are in the document (`doc.master`), not in processors.js. Your processors.js defaults are unchanged; the V3 song sets them.

## Shipped check output

- `node tools/synths-check.js`: `OK: 109 checks passed`, exit 0.
- `node app/engine/selfcheck.js`: `OK: 340 checks passed`, exit 0 (the count was 337 when the coordinator wrote; A1's file has grown since, and I did not add to it).

## Full render: an observation for A8 and A9

- The full V3 render has no NaN and no page error. Its RMS is -10.87 dBFS (whole file, both channels). Its sample peak is **0.00 dBFS**, although the master clip is set to -0.55 dBFS: 5,740 samples are above -0.6 dBFS and 8 above -0.1 dBFS. The highest is at 243.37 s (bar 127, breakLate, where the bed is on its plateau). The clip is not holding those peaks. The limiter and clip are A8's (processors.js); I did not change them. A9 should measure the true peak and crest of the full render against the record (sample peak -0.2 to -0.5 dBFS).
- The render's latency in the sidecar is 458 samples (10.4 ms); A9 measures the offset against its own grid, as the spec asks.

## Hand-back

- Files changed by this task: `app/engine/synths.js` (new spec entries; the running sub voice; clap, shaker, riser and kick changes; all defaults equal the archived synths), `app/engine/core.js` (one CHORDS addition), `app/engine/song.js` (GUIDANCE_V3, documentV3, the master hook in build, the burst decorrelate chain and the measured gains), `tools/synths-check.js` (section 9 added; sections 1 to 8 unchanged in count), this log.
- The check-suite and render exit codes are above. No commits.
- Open for the coordinator: the end tail (decision 10), the bed's end at bar 139 (decision 5), `beat3Phase` (decision 2), the peak observation above.

