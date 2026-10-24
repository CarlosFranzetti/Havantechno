# V3-SPEC: the build sheet for GUIDANCE_V3 (Ear Crew, round 3)

Scribe's compilation, 2026-10-24. For A7 (`app/engine/synths.js`, `app/engine/song.js` GUIDANCE_V3, `app/engine/core.js` CHORDS), A8 (`app/engine/processors.js`) and A9 (`tools/score.py`). It is built from the five analysts' transcripts (E1 to E5, `transcripts/`) and the coordinator's rulings (`transcripts/log-coordinator.md`); you should not need to open them. Nothing here is a new measurement. Every value carries its source and the analyst's own confidence mark.

> **STATUS: COMPLETE.** E1's round 2 and final V3 table were added at 05:09 UTC and are used for the kick and sub (section 2.1, 2.2, 3.2). The coordinator's rulings of 01:10 ET (global swing 0.40 plus a +2/24-step nudge on bass step 6; no B0 edit; E1's onset re-fit supersedes round 1) are applied. Conflicts the sheet cannot settle are marked **FLAG Cn** and collected in section 6.

## 0. Conventions, sources, rulings applied

**Source tags.** `E1 final` = E1's "Final V3 table"; `E1 R1 s7.2` = E1 round 1, section 7.2 (used only where the final table is silent). `E2 final: Bass` = E2's "Final V3 table", Bass block. `E3 final` = E3's final V3 table; `E3 sec` = E3's per-section patterns table; `E3 P1..P6` = E3's round-1 proposals. `E4 V3 row n` = row n of E4's V3 arrangement table (reproduced in section 3.1). `E5 level` = E5's V3 level table; `E5 master` = E5's master unit table. `LOG hh:mm` = coordinator ruling at that ET time.

**Confidence.** H, M, L as the analyst marked them (E2 and E3 use letters; E2: H measured and repeated, M measured once or by one method, L estimate or taken from the synth model, not rendered). `est.` = the analyst marked it an estimate without a letter. E1 and E5 use words ("estimated"); they are shown as `est.`. A value with no mark in the source is shown `(unmarked)`.

**Engine names.** Checked against `app/engine/synths.js` (BUILD.* spec entries), `app/engine/song.js` (GUIDANCE, GUIDANCE_V2), `app/engine/processors.js`, `app/engine/sequencer.js` (parameter paths) and `app/engine/songdoc.js` (pattern parser). A parameter is `exists` when its spec entry is already there, `NEW` when A7 must add it (default keeps today's sound), `chain` when it is a channel-strip insert (`{type, name, ...}` in a track's `chain`, reached as `<track>.<name>.<param>`), `track` when it is a track field in song.js (gain, gate, pan, sends, sidechain, duck, octave, note, chords).

**Pattern strings** are the engine's own: 16 characters per bar, an array for a multi-bar variant. The parser maps `x` to velocity 0.85, `X` to velocity 1.0 with the accent flag (the synth then multiplies by 1.2), `o` to 0.5, `.` to rest (`songdoc.js parsePattern`). Arrays cycle from the start of each section (A7 to confirm that a 4-bar variant restarts at the section's first bar; every section start in the table in 3.1 except the 1-bar gap at 135 is a multiple of 4, so absolute bars 4n+3 land on the 4th bar of the variant).

**Bars** are song bars on the reference grid (bar b starts at 0.568 + 1.9047619 b s, 126 BPM, 16th = 119.05 ms). 200 bars in all. The app's render starts 16.4 ms after its sidecar grid (E1); A9 must correct for it.

**Rulings applied (LOG).** Swing is global 0.40 (odd 16ths about 15 ms late; A9 may move it within 0.38 to 0.45 if a scored render prefers), and bass step 6 carries a per-step nudge of +2/24 of a step (about 10 ms; LOG 01:10) in the V3 song document's cells (`cell.nudge` is in steps, so 0.0833; the archived string form cannot express it, so bass D is written as a `{bars, cells}` variant). A9 checks the rendered onset offsets of bass steps 1, 6, 11, 14 against E2/E3 (+10 to +16 ms for 1, 6, 11; -4 to -5 ms for 14) and reports; more than 4 ms off on any step reopens the ruling. E1 round 2 read step 6 as an even control and recommended swing 0 to 0.06 (the bass's four steps 1, 6, 11 land at +9.5 ms and 14 at -4.4 ms, E1 R2 D5); the ruling overrules that. No B0 edit to the sub (the drone's 1.2 Hz pulse carries the pitch dip). The lead track is removed (the `lead` instrument stays in the engine). Tuning offsets (the record is about 3 cents flat in the chord, 13 in the bass, 8.6 in the drone) are ignored. The master starts from E5's settings. The break clap is at level 0.2 (104 to 119; see FLAG C3 for 120 to 135). `CHORDS` gets `m11f` = [0,3,7,10,14,17] as an addition only, `G#m9` as fallback. The intro, intro2 and build carry kick and drone only, plus the phrase-end noise hit and E2's chord filter sweep over bars 28 to 39 (and, per E3, the off-beat hat; the ruling's wording lists only kick, drone, hit and sweep, but E3, E4 and E5 all place the hat and its fade-in there, see FLAG C7). 59.2 Hz is the kick body; the drone is a separate voice at 34.475 Hz. Bar 120 is spectral (hats stop, a noise bed stays), not a loudness event and not a lowpass. The 92 ms silence plus 472 ms pre-roll before the first kick is the file's, not the track's: no slice. No sampler slices are used anywhere in V3.

**Gain rule (E5, LOG 00:54).** All track `gain`s start at the baseline value times about 0.58 (`impact` is removed), then A9 scores each section's loudness against section 5. The per-track targets are in dB re the kick's body peak (section 5.1); the absolute gains quoted by individual analysts were computed on different masters (E3's against a limiter-flattened kick) and are starting values only (FLAG C11).

## 1. What the record contains, and what the recreation must drop

The record is 200 bars at 126 BPM (387.99 s: 0.568 s of lead-in, 381.5 s of music, a 6.4 s reverb tail) and is flat in loudness inside each section (intro -10.56, mainA -10.24, break -12.4 to -12.9, mainB -9.92, outro -10.43 LUFS). Below 150 Hz it holds exactly two sounds: a four-on-the-floor **kick** (pitch 52.0 + 210 e^(-t/24 ms) Hz, body peak -1.2 dBFS at 35 to 45 ms, -20 dB at 162 ms, cut at 197 ms, a 1 to 2 ms click 25 dB down; its low end is cut 9 dB below 60 Hz in the break and ramped in across the build) and a **sub drone** at 34.475 Hz (C#1, 8.6 cents flat) that free-runs through the whole song with a 1.2027 Hz beating pulse of 15 to 20 dB, ducked about 15 dB on every kick, fading out over bars 91 to 103, absent 104 to 129, back over 130 to 134. A mono **mid bass** pluck on G#1 (about 51.5 Hz, saw-like, 12 to 15 ms attack, 100 ms gate, filter closing in 60 to 80 ms) plays a two-bar pattern from bar 88 (fade-in over 88 to 103) to the end. A static **G#m11 chord** (D#4 F#4 G#4 A#4 B4 C#5 D#5; never a progression) plays short stabs with a long plateau (gate 0.6 to 1.1 s) from bar 24, with a 12-bar filter sweep over bars 28 to 39 that resets at bar 40, and a sustained wide **chord bed** from bar 76 to 179. One **off-beat hat** (steps 2, 6, 10, 14; a repeated sample-like broadband noise, centroid 6.6 kHz) is the only hat: it fades in from silence at about +1.5 dB per bar over bars 8 to 23 with its tone opening, steps up 13 dB at bar 24, climbs to bar 39, plays flat 40 to 89, fades 6 dB over 90 to 103, is gated and 7 dB lower in the break 104 to 119, is absent 120 to 127, returns and crescendos 128 to 135, plays at full level in mainB and is gone from bar 184. A quiet **ghost shaker** answers each off-beat hat on the next 16th (steps 3, 7, 11, 15; -13 dB re the hat, 25 to 30 ms attack). A **kick-top tick** (flat 1.6 to 6 kHz noise, 100 ms plateau, on every beat) builds from bar 26 to bar 40. A soft-attack **on-beat hat layer** (a shaker voice on steps 0, 5, 8, 13, 9.3 dB under the off-beat hat) enters sharply at bars 56 and 152 and plays to bar 119 and bar 183; the break's own soft hits are the same part. The **clap** (generated noise, loudest burst first, flat 0.8 to 5 kHz) plays steps 4 and 12 from bar 40 to 103 and 136 to 199 (the outro keeps it at full level), at -14 dB in the break. A wide generated **noise hit** (500 Hz to 2.5 kHz, 0.3 s hold, long reverb, different noise every time) lands on beat 4 of bars 4n+3 at bars 3, 7, 11, 15, 19 and 23 (bar 23 is 8 to 12 dB louder) and then wherever it is not masked, ending with bar 199. A rising **noise bed** (white-ish, lowpass opening from about 5 kHz at bar 108 to above 16 kHz at bar 124, plateau to bar 135) replaces the hats in 120 to 127. There is a one-beat **gap** at bar 135 beat 4 (kick and hats out; chord and bass keep going), the record's low end is mono below 125 Hz and wide from 300 Hz, the mix peaks are pinned at -0.55 dBFS (a sample-peak ceiling) with a crest of 10.7 to 13.8 dB, and the last kick and noise hit at bar 199 beat 4 ring out into a 6.4 s stereo reverb tail (RT60 about 5 to 6.5 s). There is no vocal, no spoken word, no lead melody, no riser, no impact, no crash, no perc, no master filter move anywhere. **The recreation must drop**: the `lead` track; every `riser` and `impact` fx; `perc`; the baseline and V2 `shaker` pattern `XoxoXo...`; the closed-hat patterns B, C, D, E and the closed hat in intro2, build, mainA, mainA2 and mainB; the clap in the build, in 120 to 135 (see FLAG C3) and the V2 break `clap.level 0.6`; `bass` before bar 88 (and the whole B2 mid-bass stack in the intro); `stab` before bar 24 and the progression Bmaj9 / Bmaj9 / G#m7 / Emaj7; `master.hp.cutoff` ramps (24 to 180 Hz in the build, 24 to 500 Hz in breakEnd); `master.lp.cutoff` 6000 at bar 120 and the outro's 20000 to 1200 ramp; `stab.cutoff` outro ramp; `kick.level` 0.6 in the break (replaced by a kick low cut); the V2 `sub` pluck and the B0 note idea (B0 is a line of the drone's beat comb, not a note); the master glue compressor and saturator and the -4.2 dB limiter ceiling; the 2.5 s render tail.

## 2. Tracks

Track names follow song.js. Section play letters are in section 3.1. The pattern dictionary (all strings checked to 16 characters per bar):

| id | track | string(s) | source | conf. |
|---|---|---|---|---|
| kick A | kick | `x...x...x...x...` | baseline | H |
| kick G (gap) | kick | `x...x...x.......` | E4 V3 | H (steps 12 to 15 absent at bar 135) |
| sub A | sub | `x...............` (one hit per bar, gate 16) | V2, E1 | H |
| bass D | bass | `['.o....o....o..o.', '.o......o..X..o.']` (bar 1: steps 1, 6, 11, 14 at 0.5; bar 2: step 11 loud, steps 1, 8, 14 soft), plus `nudge` 2/24 = 0.0833 step on the bar-1 step-6 cell (LOG 01:10), so it is stored as a `{bars: 2, cells}` variant | E2 final: Bass; LOG 01:10 | steps M to H, velocities M; nudge ruled |
| stab S | stab | `['x..........x....', '.x.........x....', '....x..x........', '....x..x........']` | E2 final: Stab | step 7 M, step 4 M, others L |
| pad A | pad | `x...............` (gate 16) | E2 final: Pad | M |
| clap A | clap | `....x.......x...` | baseline, E3 final | H |
| hat_open A | hat_open | `..x...x...x...x.` | E3 final | H |
| hat_closed break | hat_closed | `..x...x...xo..x.` (steps 2, 6, 10, 14 plus a soft 11) | E3 final | M (FLAG C4) |
| shaker_on (on-beat layer) | shaker_on (inst shaker) | `X....o..X....o..` (X steps 0 and 8; o steps 5 and 13 at -3 dB) | E3 on-beat hat layer section (LOG 01:12) | H |
| shaker G (ghost) | shaker | `...x...x...x...x` | E3 final | H |
| ~~shaker B (break)~~ | shaker | `x....x..x....x..`: **replaced by shaker_on** (same hits, LOG 01:12) | E3 final, superseded | n/a |
| tick T | shaker (tick track) | `x...x...x...x...` | E3 final | H |
| burst P | burst (shaker type) | `['................', '................', '................', '............x...']` | E3 P4, E4 | H where present, L where masked |

### 2.1 kick (type `kick`)

Source: **E1 final V3 table** (`E1-low-end.md`, "Final V3 table: kick, sub and sidechain") unless stated. E1's round-1 values for attack, swell, harmonic, hold and drive are superseded (swell 6 dB withdrawn in D6: it made the 160 to 250 Hz source worse).

| parameter | V3 value | unit | status | source | conf. |
|---|---|---|---|---|---|
| tune | 53 | Hz | exists (30..90) | E1 final: glide fit 52.0 (10 to 150 ms), late zero crossings 53 to 56 Hz | M |
| punch | 265 | Hz | exists (80..400) | E1 final: 52 + 210 = 262 at t = 0; model 265 | M |
| tau | 0.022 | s | exists (0..0.1) | E1 final: fit 24.0 ms, model 21.8 ms | M |
| attack | 0.02 | s | **NEW** (default 0.0015 keeps today): the level jumps to -swell dB in 1.5 ms, then rises linearly to full at `attack` | E1 final: peak at 35 to 45 ms; D6 compromise | M |
| swell | 2 | dB | **NEW** (default 0) | E1 final: D6 re-fit (round-1 value 6 withdrawn) | M |
| hold | 0.045 | s | exists (0..0.3) | E1 final: within 1 dB of the peak to about 70 ms | M |
| decay | 0.45 | s | exists (0.05..1.2) | E1 final: 0.20 dB/ms after 80 ms, model 0.448 | M |
| length | 0.197 | s | **NEW** (default 0 = off): a 3 ms fade at that time | E1 final: cut to below -40 dB at 197 to 198 ms | H |
| harmonic | 0.1 (-20 dB) | 0..1 | **NEW** (default 0): a 2f sine on the same pitch curve and envelope, used instead of more drive because the record's distortion is even-order | E1 final: 2nd harmonic -23.9 dB in the plateau; D6 re-fit | M |
| click | about 0.05 | 0..1 | exists | E1 final; target: 1 to 2.5 kHz per-hit peak 25 dB under the 150 to 300 Hz peak, 0 to 12 ms spectrum re 250 Hz at 1 / 2.5 / 4 kHz -35 / -40 / -47 dB | L |
| clickDecay | 0.0015 | s | **NEW** (default 0.012, the hard-coded value; the knock's 0.022 s decay scales with it) | E1 final: -10 dB within 2 ms | H |
| drive | 0.1 | 0..1 | exists | E1 final: 3rd harmonic -28.9 dB; the engine has no asymmetric drive | L |
| level | 1.0; +0.5 dB in the intro is optional | | exists | E1 R1 s7.2 and E5 level kick row (+0.5 in 0 to 23); not in E1's final table | M (measured -6.6 against -7.0 to -7.3 dBFS) |
| lc.low (chain) | by section, below | dB | chain `{ type: 'eq3', name: 'lc', low: 0, lowFreq: 90 }`, reached as `kick.lc.low`; the sequencer already routes `track.unit.param`, no processors.js change | E1 final | H |

Track fields: `gain` set so the master limiter takes at most about 2 dB off kick peaks, about 0.58 (E1 final, E5 ruling; peaks about -0.5 dBFS with the new limiter); in a solo render the raw peak per 10 ms must fall from 70 ms on and reach -20 dB re peak at about 160 ms (E1 R1 s7.2). `duck`: `['sub','bass','stab','pad']` (E1 final names only `sub` and leaves bass, stab, pad to E2 and E5; V2's list minus `lead`; the pad's own sidechain depth is 0). Pattern: kick A everywhere except bar 135 (kick G).

**`kick.lc.low` by section** (E1 final, H; measured -2.5 / -4.5 / -6.5 dB at bars 24 / 30 / 36 and -9 in the break; a 90 Hz low shelf at -9 dB fits the break within 0.7 dB: model -8.1, -7.4, -5.5, -3.6, -2.3, -1.2 dB at 50, 60, 80, 100, 120, 150 Hz against measured -8.8, -7.2, -6.0, -3.5, -2.2, -1.5):

| sections | `kick.lc.low` |
|---|---|
| intro, intro2 | 0 |
| build | ramp -2 to -7, curve `lin`, over the section |
| mainA, mainA_b, mainA2, mainA3 | 0 (the lift at bar 40 is the "+4 dB kick" O1 saw) |
| break, breakLate, breakEnd, gap | -9 (replaces `kick.level` 0.6, which is removed) |
| mainB, mainB_b, mainB_c, outro | 0 |

E4's table writes the same quantity as `kick.lowcut 0 to -9 dB [0,16]` in the build (FLAG C1: name and build endpoints; E1's final endpoints -2 to -7 are used here because E1 owns the measurement and E5's level table agrees).

### 2.2 sub (type `sub`, mode `drone`)

Source: **E1 final V3 table** unless stated.

| parameter | V3 value | unit | status | source | conf. |
|---|---|---|---|---|---|
| mode | `drone`, one voice running across bars | | exists; the running voice is **NEW behaviour**: a new trigger only changes pitch (with `glide`) or level, and `panic()` or a section mute stops it, so the pulse's phase free-runs (E1 R1 s7.2: within about +/-50 deg from bar 0 to 199). No spec name is given by E1; the scribe suggests `run` (0/1, default 0 keeps today). Simpler alternative (E1 R1): one hit per section with a gate as long as the section | E1 final | H |
| note (track) | `C#1` (34.648 Hz); the record is 34.475 Hz, 8.6 cents flat; the detune is ruled out of V3, so **no** `fine` parameter | | track | E1 final; LOG 00:31, E1 round 2 | H |
| partials | `[-1.2027 Hz, -2.6 dB]` and `[-3.608 Hz, -5.8 dB, phase -126 deg re the carrier]` (second sines at f minus the offset; the second is E1's three-sine model; with only the first line the pulse is 15.7 dB deep, with both 18.7 dB, record 20.3 dB). Entry names: E1 R1 proposed `beat` (Hz), `beatLevel` (dB), `beat3Level` (dB); E1 final calls the block `partials` | Hz, dB, deg | **NEW** (default none) | E1 final | M |
| alternative to partials | an LFO of 1.2027 Hz on level and pitch: level swing 11 dB, pitch dip 6.0 Hz, pitch LFO 253 deg from the level LFO; fits the 12 measured lines at 2.3 dB rms | | **NEW**, not preferred (partials need no LFO in synths.js) | E1 final | L |
| harmonic | 0.1 (-20 dB; record 2nd harmonic -19.9 dB) | | exists | E1 final | H |
| attack | 0.005 | s | exists | E1 final (unchanged; the fades are automation) | L |
| release | 0.03 | s | exists | E1 final | L |
| glide | 0 | s | exists | E1 R1 s7.2 | M |
| gain (track) | about 0.07 (-18 dB from V2's 0.55, before E5's x0.58). Targets: drone on the third 16th of a beat 15.4 dB under the kick step's 45 to 80 Hz, plateau 20 dB under the kick peak | | track | E1 final | M |
| sidechain (track) | `{ depth: 0.78, attack: 0.01, hold: 0.08, release: 0.12, curve: 'db' }`; `sub` stays in `kick.duck`. Record: -5.5 dB at 10 ms, -11 dB at 20 ms, -15 dB at 40 to 44 ms, a -11.5 dB shelf at 80 to 120 ms, -3 dB at 177 ms, -1 dB at 265 ms; grid fit rms 0.98 dB (V2's 0.82 / 0.03 / 0.08 / 0.12 gives 2.38 dB); `curve: 'db'` beats `'lin'` by 0.05 dB (marginal) | | track (spec exists) | E1 final | M |
| level (automation) | see below | | exists (`sub.level`) | E1 final | H |

**`sub.level` automation** (E1 final, H; measured on the 25 to 45 Hz per-bar track): full (1.0) from the start to bar 92; ramp to 0.03 over bars 93 to 103; off in 104 to 129; ramp to 1 over bars 130 to 134; full 136 to 199. Implementation in the E4 sections: mainA3 (88 to 103) ramp `sub.level` expo 1 to 0.03 over section bars [5,16] (E1's 93 to 103; E4's row 7 has 1 to 0.1 over [3,16], FLAG C2); break and breakLate (104 to 127): `set sub.level 0` (E1 "off"; leakage only, -41 dBFS in 25 to 45 Hz) with the sub left out of `play` or held at level 0; breakEnd (128 to 134): `sub.level` stays 0 for bars 128 and 129, then ramp expo 0.03 to 1 over section bars [2,7] (bars 130 to 134; E4's row 10 has 0.1 to 1.0); mainB onward: `set sub.level 1`. E5's level table gives the same shape in dB re kick: -20 plateau, falling to -35 over 91 to 103, off, then back to -20 by bar 134 (a 15 dB fade where E1's 0.03 is -30 dB: the record's own 25 to 45 Hz band falls -26 to -38 dB, 12 dB, before the break floor).

**No B0.** E1 round 2 and the ruling of 01:10 ET: B0 is not a note. The 30.9 Hz peaks in about one bar in seven or eight are the low phase of the drone's own 831.5 ms pulse (pitch dips 4 to 6.6 Hz in the quiet part of each cycle, which a one-bar window catches about every 7th bar). Make no B0 edit; the partials (or the pitch LFO) carry the dip. A7's old V2 TODO and E4's proposed B0 bar placement are not to be built. The sub is not 51.5 Hz either (E1: no 51.5 Hz fundamental is detectable under the mid bass; its 2nd and 3rd harmonics are).

Pattern: sub A (one hit per bar), unless the running voice is implemented.

### 2.3 bass (type `bass`)

Source: E2 final: Bass, unless stated. The record's mid bass is a G#1 pluck; the recreation's B2 (123.8 Hz) stack is 15 semitones high, on the wrong steps, in the wrong sections, and is the intro's mid excess.

| parameter | V3 value | unit | status | source | conf. |
|---|---|---|---|---|---|
| note (track) | `G#1` (51.91 Hz; the record is f0 about 51.5 Hz, 13 cents flat, ignored) | | track | E2 final | H pitch class, M octave (octave fixed only by plausibility: the same harmonic set fits 25.8 Hz) |
| pattern | bass D (section 2 dictionary) | | | E2 final | steps M to H, velocities M |
| play | bars 88 to 199 only (none before) | | | E2 final; E4 V3 rows 7 to 15 | H |
| gate (track, steps) | 0.9 | step | track | E2 final | M |
| wave | `sawtooth` | | exists | E2 final | L |
| detune | 4 | ct | exists | E2 final | L |
| sub | 0 | | exists | E2 final | M |
| cutoff | 450 | Hz | exists (60..8000) | E2 final | L |
| env | 2600 | Hz | exists (0..8000); peak = cutoff + env x vel (1750 Hz on `o`, 3050 on `X`) | E2 final | L |
| res | 2.5 | | exists | E2 final | L |
| attack | 0.008 | s | exists | E2 final (record 12 to 15 ms) | M |
| decay | 0.07 | s | exists | E2 final (filter closes in 60 to 80 ms) | M |
| release | 0.03 | s | exists | E2 final | L |
| drive | 0.5 | | exists | E2 final | L |
| glide | 0 | s | exists | E2 final | M |
| chain eq (`bass.eq.high`) | -4 dB at 1500 Hz (was -8) | dB | chain (eq3 `eq`, `high`, `highFreq` exist) | E2 final | L |
| widener / stereo | none: mono at the bottom (155 Hz side -16 dB, 258 Hz -9 to -14, 517 Hz -6) | | | E2 final | H |
| sidechain | depth 0.5, release 0.2 (kept) | | track | E2 final | L |
| level | 0.25 to 1.0 expo over bars 88 to 104; outro 1.0 to 0.7 (E2 final) or a step at 184 (FLAG C9) | | exists | E2 final; E4 V3 rows 7 and 15 | M, L |
| level target | E5 level: -14.7 rising to -2.7 dB re kick over bars 88 to 104, -2.7 to bar 183, then about -6 to -8 | dB re kick | | E5 level (E2: hit peak 2.5 to 2.9 dB under the kick peak, rms 7 dB under the kick in 100 Hz to 1 kHz) | M |

Implementation note (FLAG C12): E2 assumed `X` = 1.0; the parser gives `X` velocity 1.0 with the accent flag, so the synth sees 1.2, and `o` 0.5, `x` 0.85. Step 11 of bar 2 is therefore +7.6 dB over an `o` hit, not the +6 dB E2 measured (hits at -6 dB re the loudest).

### 2.4 stab (type `stab`, track `chords: true`)

Source: E2 final: Stab.

| parameter | V3 value | unit | status | source | conf. |
|---|---|---|---|---|---|
| progression (song) | `['G#m11f']`, one chord, every section | | `m11f` = [0,3,7,10,14,17] **NEW in core.js CHORDS**; fallback `G#m9` | E2 final; LOG 00:59 | H pitch set, M voicing |
| octave | 3 (G#3 B3 D#4 F#4 A#4 C#5; the record's set is D#4 F#4 G#4 A#4 B4 C#5 D#5, so G#4, B4 and D#5 are missing and G#3, B3 are extra: E2 notes `inversion` does not fix it, "skip") | | track | E2 final | M |
| pattern | stab S | | | E2 final | see dictionary |
| play | from bar 24 (build, mainA ... outro); never before | | | E2 final; E4 V3 | H |
| gate (track, steps) | 6 in bars 3 and 4 of each group, 12 in bars 1 and 2 (the engine has one `gate` per track; use 6 and let A7 decide, or per-bar `ev.dur`) | step | track | E2 final | M, L |
| cutoff | 450 base; build ramp 450 to 2400 expo (bars 28 to 39 carry the audible sweep); mainA and after: about 700 | Hz | exists | E2 final (record: D#6 1245 Hz rises 20 dB over bars 28 to 39, drops 12 dB at 40) | L |
| env | 700 | Hz | exists | E2 final | L |
| res | 1.5 | | exists | E2 final | L |
| attack | 0.008 | s | exists | E2 final (record at most 15 ms) | M |
| decay | 0.07 | s | exists | E2 final | M |
| release | 0.08 | s | exists | E2 final | L |
| detune | 4 | ct | exists | E2 final (record tones within 2 to 7 ct, no 11 ct pairs) | M |
| spread | 0.8 | | exists | E2 final | M |
| hp | 150 | Hz | exists | E2 final | L |
| chain widener width | 1.4 (E2) **or** 1.6 to 2.0 with `monoBelow` 250 (E5); FLAG C10 | | chain (widener `width` 0..3, `monoBelow` 0..500 exist) | E2 final M; E5 round 2 est. | M / est. |
| gain (track) | 0.09 (from 0.4) | | track | E2 final | L; superseded by E5 level (below) |
| level target | E5 level: -3.8 dB re kick on bars 3 and 4 of each 4-bar group (step 7), -10 on bars 1 and 2, from bar 26; the hit is 14.2 dB under the kick in 250 Hz to 1 kHz rms | dB re kick | | E5 level; E2 | M |
| sidechain | depth 0.9, release 0.12 | | track | E2 final | L (record: step 1 level after the kick falls 25 to 30 dB) |
| sends | delay 0.15, reverb 0.1 (unchanged) | | track | E5 sends | (unmarked) |
| outro | step at 184: see FLAG C9 (E4 `stab.level` x 0.58 est.; E5 and E2 final tables carry no stab change) | | | | est. |

Faint intro tones (408, 472 Hz, about -50 dB) are not built (E2 inventory E2-5, optional); E5's optional "-35 dB re kick faint tones" in 0 to 23 is not built either.

### 2.5 pad (type `pad`, the chord bed)

Source: E2 final: Pad.

| parameter | V3 value | unit | status | source | conf. |
|---|---|---|---|---|---|
| chords / octave | `G#m11f`, octave 3 | | track | E2 final | M |
| pattern | pad A, gate 16 (track field) | | | E2 final | M |
| play | bars 76 to 179; stops at 180 | | | E2 final; E4 V3 rows 6 and 14 | M (180 +/-2 bars) |
| attack | 0.3 | s | exists | E2 final | L |
| release | 1.2 | s | exists | E2 final | L |
| cutoff | 2500 | Hz | exists | E2 final (partials to the 8th harmonic at -10 dB) | L |
| detune | 4 | ct | exists | E2 final | L |
| sidechain depth | 0 (flat within 1.5 dB at 554 Hz in break and mainB) | | track | E2 final | M |
| sends | reverb 0.4 | | track | E2 final | L |
| level target | C#5 (554 Hz, +/-25 ct) about -36 dBFS rms narrowband; falls to -49 dBFS at bar 200 | | | E2 final; E5 level pad row | M |

### 2.6 hat_open (type `hat_open`): the only off-beat hat

Source: E3 final unless stated.

| parameter | V3 value | unit | status | source | conf. |
|---|---|---|---|---|---|
| pattern | hat_open A | | | E3 final | H |
| decay | 0.26 (break: about 0.05, gated 45 ms shape) | s | exists | E3 final; E3 P1 | H (main); M (break) |
| tone | 2000 (spec minimum; was 7000) | Hz | exists (2000..12000) | E3 final | M |
| ring | 1500 | Hz | exists | E3 final | (unmarked) |
| metal | 0.15 (was 0.5) | | exists | E3 final | M |
| metalHp | 4000 | Hz | exists (already in synths.js) | E3 final | L |
| chain lp | `{ type: 'filter', name: 'lp', mode: 'lowpass', cutoff: 11000, q: 0.7 }` in main sections; opening ramp: E3 `lp.cutoff` 6000 at bar 8 to 11000 at bar 40 expo (conf. L) **or** E5 3500 at bar 16 expo to 11000 at bar 24, then fixed (est.): FLAG C6 | Hz | chain (`hat_open.lp.cutoff`) | E3 final; E5 round 2 D8 | cutoff M; ramp L / est. |
| gain (track) | 0.15 (from 0.45; computed on a flattened kick: FLAG C11) | | track | E3 final | M |
| pan | 0.08 (kept; E3 notes -0.04 is closer to the measured L/R) | | track | E3 P2 | est. |
| sends | reverb 0.12 (was 0.06) | | track | E3 P2; E5 sends | est. |
| level curve | bars 0 to 23 expo 0.002 to 0.035; bar 24 step to 0.2; bars 24 to 39 expo to 1.0; 40 to 89 1.0; 90 to 103 1.0 to 0.5; 104 to 119 0.45; 120 to 127 off; 128 to 135 expo 0.12 to 0.6 (FLAG C5); 136 to 183 1.0; 184 to 199 off | x gain | `hat_open.level` | E3 final (the segments 0.002 to 0.035 and 0.2 to 1.0 are measured -53 to -29 dB and -14 to -0.4 dB re the main hat) | bars 24 to 103, 120 to 127, 184+: H; 0 to 23 and 128 to 135: M |
| level target | E5 level: hat peak -18.3 dB re kick (hat 2 ms band power vs kick 30 to 150 Hz peak) in 40 to 87; 8 to 12 kHz re the bar-40 plateau -38 at bar 16, -32 at bar 20, -27.5 at bar 23, -14.2 at bar 24, -0.3 at bar 39; -7 in 104 to 119; -20 rising to -6 over 128 to 135 | dB | | E5 level | M |
| width | reference side/mid -13.7 dB, correlation 0.92 at 6 to 16 kHz; a mono source cannot be widened by the widener: use the reverb send; chorus (`base 12, mix 0.25, invert true`) is an untested alternative | | | E3 P2 | est. |

Spectral target (E3): centroid 6.6 kHz +/-0.7 in 1 to 16 kHz, 57 % of the 1 to 16 kHz energy above 6 kHz; the baseline is 10.9 kHz and 94 %. Hat peak -18.3 dB re kick (baseline +9.7 dB too loud). Envelope re peak: 20 ms -6, 60 ms -12, 100 ms -19 dB.

### 2.7 hat_closed (type `hat_closed`): break only

Source: E3 final. The reference has no closed hat in the main sections; the baseline closed hat and its patterns are deleted from intro2, build, mainA, mainA2, mainB (ruled, H).

| parameter | V3 value | status | source | conf. |
|---|---|---|---|---|
| pattern | hat_closed break `..x...x...xo..x.` in 104 to 119 only | | E3 final | M |
| decay | 0.07 | exists | E3 final | M |
| level | 0.45 of the main hat | exists | E3 final | M |
| E4 on-beat layer | E4's `hat_closed` H `x.......x.......` at level 0.4 from bars 56 and 152 is **superseded** by the `shaker_on` track (2.9b): E3 measured the layer on steps 0, 5, 8, 13, -9.3 dB re the off-beat hat (E4 estimated steps 0 and 8 at -8), a soft-attack noise voice, not a closed hat | | E3 on-beat section, LOG 01:12 | H |

If the break hat is played on `hat_open` (E4's table and E5) the `hat_closed` break pattern is not used (FLAG C4).

### 2.8 clap (type `clap`)

Source: E3 final.

| parameter | V3 value | unit | status | source | conf. |
|---|---|---|---|---|---|
| tone | 1500 (was 1900) | Hz | exists | E3 final | M |
| q | 0.4 (was 0.8) | | exists (0.2..6) | E3 final | M |
| decay | 0.12 (was 0.16) | s | exists | E3 final | M |
| tail | 0.3 | | exists | E3 final | (unmarked) |
| tailDecay | 0.25 (was 0.35) | s | exists | E3 final | (unmarked) |
| flams | 3 | | exists | E3 final | (unmarked) |
| flam | 0.011 | s | exists | E3 final | (unmarked) |
| first | 1 | 0..2 | **NEW** (default 0 = today): sets the gain of burst 0 to `first` x g and scales the later flams and the main burst to 0.33 g (-9.5 dB). The record's loudest burst is first, then +12 to +16 ms and +22 to +26 ms at -9 to -10 dB; the engine fires the loudest last | E3 final; E3 P3 | M |
| gain (track) | 0.22 (from 0.7) | | track | E3 final | M (FLAG C11) |
| sends | reverb 0.25 (unchanged) | | track | E5 sends | (unmarked) |
| level | 1.0 in 40 to 103 and 136 to 199; 0.2 in 104 to 119 (ruled); 120 to 135: FLAG C3; off in 0 to 39 | | `clap.level` | E3 final; LOG 01:05; E4 | H main, H outro; break 0.2 ruled |
| level target | -17 dB re kick (1.5 to 6 kHz peak re kick low-band peak) in 40 to 103, 136 to 183, 184 to 199; break -31 | dB | | E5 level | M |

Reference clap: noise, hit-to-hit NCC 0.11 to 0.17, spectrum flat 0.8 to 5 kHz, time to -20 dB 89 ms, side/mid -9.8 dB. Baseline: +9.9 dB too loud, 118 ms to -20 dB.

### 2.9 shaker (type `shaker`): the ghost second event and the break hits

Source: E3 final.

| parameter | V3 value | unit | status | source | conf. |
|---|---|---|---|---|---|
| tone | 6500 | Hz | exists | E3 final | M |
| q | 0.35 | | exists | E3 final | M |
| attack | 0.028 (the record's 25 to 30 ms rise) | s | exists (0.001..0.05) | E3 final | M |
| decay | 0.07 | s | exists | E3 final | M |
| pattern | shaker G in 40 to 103 and 136 to 183 (follows the hat's 90 to 103 fade); none in 104 to 135 and in the outro (E3's break pattern B is replaced by `shaker_on`, 2.9b) | | | E3 final, E3 sec | G H |
| gain (track) | about 0.12 (-13 dB re the hat) | | track | E3 final | L |
| level target | ghost -31 dB re kick (-13 dB re the hat); break hits at the break hat level (-7 re the main hat) | dB re kick | | E5 level | est. |

### 2.9b shaker_on: the on-beat hat layer (a third `shaker`-type track)

Source: E3-drums-top.md, "On-beat hat layer" section (appended 05:12 UTC; LOG 01:12). It is a separate track from the tick (all four beats, bars 26 to 55) and from the ghost shaker G (steps 3, 7, 11, 15), and it **replaces** E3's earlier break-shaker row (same hits) and E4's `hat_closed` H.

| parameter | V3 value | unit | status | source | conf. |
|---|---|---|---|---|---|
| inst / pattern | `shaker`, `X....o..X....o..` (X = steps 0 and 8; o = steps 5 and 13 at -3 dB) | | | E3 on-beat | H |
| tone | 6000 | Hz | exists | E3 on-beat | M |
| q | 0.25 | | exists | E3 on-beat | (unmarked) |
| attack | 0.035 (35 ms rise, peak +40 ms) | s | exists (0.001..0.05) | E3 on-beat | M |
| decay | 0.06 (gated end near 100 ms: -24 dB between +60 and +100 ms) | s | exists | E3 on-beat | L |
| hold | 0.03 if A7's NEW `shaker.hold` is available | s | NEW (shared with `burst`) | E3 on-beat | L |
| gain (track) | such that the 6 to 16 kHz peak is 9.3 dB under `hat_open` (about 0.15 x 0.34 = 0.05 on E3's scale; rescore) | | track | E3 on-beat | relative level M; gain L |
| level | constant: -27.9 dB abs in 6 to 16 kHz (hat -18.6, kick 30 to 150 Hz peak -1.5): -26.4 dB re kick (E3), about -27.6 via E5's hat -18.3 re kick; the layer does not follow the hat's 90 to 103 fade (E4: it is relatively louder there) | dB re kick | | E3 on-beat | M |
| sections | mainA_b (56 to 75), mainA2 (76 to 87), mainA3 (88 to 103), break (104 to 119, same pattern at the hat's break level: -27 / -28 dB abs); mainB_b (152 to 179), mainB_c (180 to 183). Off in mainA (40 to 55), mainB (136 to 151), breakLate and breakEnd (120 to 135), the outro, and everything before bar 56 | | | E3 on-beat | H for 56 to 106 and 152 to 182; M for 107 to 119 |
| width | not measured | | | | |

Entry is sharp: steps 0/8 -35.5 dB at bar 55 to -28.1 at bar 56 (+7 dB), steps 5/13 -48 to -31 (+17 dB); the same at 151 to 152. Spectrum parallel to the off-beat hat's from 2.5 to 10 kHz, 4 to 8 dB darker at 12.5 to 16 kHz; waveform a repeated sample (step 0 against step 0 NCC 0.93, step 0 against step 8 0.74).

### 2.10 tick: the kick-top (a second `shaker` track named `tick`)

Source: E3 final (D3 of round 2). A separate track, not a kick parameter (E1 and E3 agree the kick is identical in intro and mainA).

| parameter | V3 value | unit | status | source | conf. |
|---|---|---|---|---|---|
| inst / pattern | `shaker`, tick T `x...x...x...x...` (all four beats) | | | E3 final | H |
| tone | 3500 | Hz | exists | E3 final | L |
| q | 0.3 | | exists | E3 final | L |
| attack | 0.002 | s | exists | E3 final | L |
| decay | 0.10 (hold 0 or 0.05 with the NEW `hold`) | s | exists / NEW | E3 final | L |
| level | bars 26 to 40 expo ramp (+16 dB); plateau -15 dB re the hat peak in 40 to 55; the tick stays at the plateau after bar 56 and 152; the louder on-beat layer E3 and E4 saw there is the separate `shaker_on` track (2.9b) | | `tick.level` | E3 final; E3 on-beat section (the tick is the "-36 dB = the tick" baseline under the layer) | ramp M; levels L |

Measured: flat spectrum 1.6 to 6 kHz (-77 to -78 dB/Hz), -2 dB per octave above 6 kHz, 100 ms plateau 17 to 20 dB above the kick's tail, a fixed waveform per position that differs between beats 1 and 3, correlation 0.09 with the hat. The track is absent from E4's table (FLAG C7).

### 2.11 burst: the phrase-end noise hit (`shaker`-type track named `burst`)

Source: E3 final, E3 P4, E4 section 4c.

| parameter | V3 value | unit | status | source | conf. |
|---|---|---|---|---|---|
| inst | `shaker` | | | E3 final | M |
| tone | 1400 | Hz | exists | E3 final | M |
| q | 0.35 | | exists | E3 final | M |
| attack | 0.004 | s | exists | E3 final | M |
| hold | 0.30 | s | **NEW** on `shaker` (0..0.6, default 0): flat sustain at the peak, then the decay | E3 final | M |
| decay | 0.30 (-8 dB at 0.45 s, est.) | s | exists | E3 final | M |
| sends | reverb 0.35 (reverb tail about -8 dB at step 1 and -16 dB at step 5 of the next bar re the burst) | | track | E3 final; E5 sends | M |
| intro lowpass | about 1.5 kHz in the intro (top rolled off: -12 dB at 2 kHz, -25 at 4 kHz); the outro hits are the normal clap spectrum with a long reverb | Hz | chain filter | E4 4c | est. |
| stereo | two tracks panned -1 and +1 with independent noise (record L/R correlation 0.07, side/mid -0.6 dB), or a stereo-noise option | | A7 to check whether `K.noise` voices differ per voice (`v.noise` starts at a random offset into one shared buffer, so two tracks give independent material) | E3 final | M |
| pattern | burst P (4-bar variant, hit on step 12 of its 4th bar) | | | E3 P4, E4 | see 3.5 for which bars |
| level | -30 dB re kick (1 to 2.5 kHz sustained -31 dBFS abs); bar 23 x2.5 (+8 dB, "8 to 12 dB louder than the other five"); bar 183 x0.5 (weak hit) | | `burst.level` | E3 final, E4 rows 2 and 14 | M; bar 23 and 183 est. |

### 2.12 bed: the break noise bed (`riser`-type track named `bed`)

Source: E3 final, E3 P5, E4 V3 rows 8 to 11.

| parameter | V3 value | unit | status | source | conf. |
|---|---|---|---|---|---|
| inst | `riser` | | | E3 final | M |
| tone | 0 (no saw drone) | | exists (0..1) | E3 final | M |
| from | 5000 | Hz | exists (max 5000) | E3 final | M |
| to | 16000 | Hz | exists (max 16000) | E3 final | M |
| q | 0.3 | | exists (0.2..8) | E3 final | M |
| floor | 0.04 (about a 28 dB rise; the engine's rise starts at 0.0001, a 76 dB rise) | | **NEW** on `riser` (0.0001..1, default 0.0001) | E3 final | M |
| hold / plateau | the rise lasts 16 bars (108 to 124); the level then holds until bar 135, with the 30 ms end ramp at bar 136; "hold (A7)" | s | **NEW**, E3's request; not named in the rulings (FLAG C16) | E3 final | M |
| event | `fx: bar 108, track 'bed', bars 16`, then plateau to bar 136; E4: chain it as fx in break (16 bars), breakLate (8) and breakEnd (7) if an fx may not outlast its section | | | E3 final; E4 V3 row 8 | M |
| level | 8 to 12.5 kHz -72 to -46 dB abs (+26 dB), plateau -46 dB to bar 135, then -52 to -54 dB in mainB (the bed drops 6 dB over 136 to 139); the record's rise is linear in dB | | | E3 final | M |
| level target | E5 level: plateau 4 to 8 / 8 to 12 / 12 to 16 kHz = -45 / -45 / -48 dBFS squared (mid) in 120 to 127; starts rising at 108 | | | E5 level | M |

### 2.13 Tracks and fx removed in V3

`lead` (E2, ruled), `perc` (E3, E4), `riser` and `impact` fx everywhere (E3, E4, E5), the closed hat in the main sections (E3, ruled), the baseline `shaker` pattern `XoxoXoxo...` in the break and breakEnd (E3), the `hat_closed` patterns B, C, D, E (E3, E4). The instruments stay in the engine.

### 2.14 Summary of new spec entries and structural changes for A7

| where | entry | default | needed by |
|---|---|---|---|
| `core.js` CHORDS | `'m11f': [0,3,7,10,14,17]` (addition only; `G#m9` as fallback) | n/a | stab, pad (E2, LOG 00:59) |
| `synths.js` kick | `attack` (s), `swell` (dB), `clickDecay` (s), `harmonic` (0..1), `length` (s) | 0.0015, 0, 0.012, 0, 0 | E1 final; LOG 00:53 ruling 2 |
| kick low cut | chain eq3 `lc` (no engine change; E1 final, E5) **or** spec entry `lowcut` (dB; E4's name, the coordinator's wording) | 0 | E1, E4, E5 (FLAG C1) |
| `synths.js` sub | `partials` list of [Hz offset, dB, phase] (E1 final; R1 named it `beat` / `beatLevel` / `beat3Level`); a running drone voice across triggers (suggested `run`); optionally an LFO pair | none; off | E1 final; LOG 00:53 ruling 2 |
| `synths.js` clap | `first` (0..2) | 0 | E3 final; LOG 00:47 ruling 3 |
| `synths.js` shaker | `hold` (0..0.6 s) | 0 | E3 final; LOG 00:47 ruling 3 |
| `synths.js` riser | `floor` (0.0001..1); plateau `hold` | 0.0001; off | E3 final; LOG 00:47 ruling 3 |
| `synths.js` hat_open | none (`metalHp` and `tone` min 2000 already exist) | | E3 final |
| `song.js` | GUIDANCE_V3 as a deep copy of GUIDANCE (never edit GUIDANCE); 15 sections (3.1); per-track changes of 2.1 to 2.12; `swing` 0.40; bass D with the step-6 nudge as a `{bars, cells}` variant; the bass `eq` high -4; new tracks `tick`, `shaker_on`, `burst` (two panned), `bed`; their patterns | | this sheet |
| `sequencer.js` render | `tail` option 6.5 s (the host option already exists; the renderer default is 2.5) | 2.5 | E4, E5 |

## 3. The arrangement

### 3.1 E4's 15-section table, reproduced exactly

From `E4-arrangement-samples.md`, "V3 arrangement: a song.js-shaped section table (input for A7)". Convention as in `song.js`: `bars` = length, `play` = track: pattern letter, `set` applies at the section start (and persists until changed), `ramp` entries use section-relative bars `[from, to]` (default whole section), `fx` = {bar, track, bars}. 200 bars in all (16+8+16+16+20+12+16+16+8+7+1+16+28+4+16). E4's letter definitions come first, then the table verbatim, then E4's two closing notes verbatim. The table itself is not edited; section 3.2 lists, row by row, what the later analysts and rulings change in it (the on-beat layer, the tick, the burst, the drone, the low cut, the swing).

**E4's pattern letters (verbatim):**

Patterns (letters used below): `kick` A `x...x...x...x...`, G (gap) `x...x...x.......`; `sub` A one hit per bar (E1's drone voice); `bass` D = E2's two-bar pattern (steps 1, 6, 11, 14; bar 2 with 11 loud and 1, 8, 14 soft), note G#1 (E2); `stab` S = E2's G#m11f four-bar pattern `x..........x....` / `.x.........x....` / `....x..x........` / `....x..x........` (E2 section D2); `pad` A whole-bar chord (E2); `clap` A `....x.......x...`; `hat_open` A `..x...x...x...x.` (E3, unchanged); `hat_closed` H = `x.......x.......` (steps 0, 8; the on-beat layer, name pending E3); `shaker` G `...x...x...x...x` (ghost, E3), B `x....x..x....x..` (break, E3); `burst` P = four bars, only bar 4 has `............x...` (E3 P4, step 12); `bed` = the riser instrument with `tone` 0, `floor` **new** (E3 P5).

**E4's table (verbatim):**

| # | name | start | bars | play | set at start | ramp (bars relative) | fx |
|---|---|---|---|---|---|---|---|
| 1 | intro | 0 | 16 | kick A, sub A, hat_open A, burst P | kick.lowcut 0, sub.level 1, hat_open.level 0.002 | hat_open.level 0.002 → 0.0136 expo [0,16] | none |
| 2 | intro2 | 16 | 8 | same | – | hat_open.level 0.0136 → 0.035 expo [0,8]; `burst.level` ×2.5 (bar 23 only: set via a per-bar level or a second burst note, E3) | none |
| 3 | build | 24 | 16 | kick A, sub A, hat_open A, stab S, burst P | hat_open.level 0.2 (the +13 dB step) | hat_open.level 0.2 → 1.0 expo [0,15]; kick.lowcut 0 → −9 dB [0,16] (E1: ramps in across 24-39); stab.cutoff low → high expo [4,16] (E2's sweep, bars 28-39; E2 supplies the two cutoffs, the measured rise is D#6 +20 dB); no clap | none (the app's riser is removed) |
| 4 | mainA | 40 | 16 | kick A, sub A, stab S, clap A, hat_open A, shaker G | kick.lowcut 0; stab.cutoff = E2's mainA value (reset: the sweep drops 12 dB at 40); hat_open.level 1; clap.level 1 | – | none (the app's impact is removed) |
| 5 | mainA_b | 56 | 20 | mainA's play + hat_closed H | hat_closed.level 0.4 (−8 dB re the off-beat hat, est.) | – | none |
| 6 | mainA2 | 76 | 12 | mainA_b's play + pad A | pad.level per E2 (C#5 −36 dBFS narrowband) | – | none |
| 7 | mainA3 | 88 | 16 | mainA2's play + bass D | bass.level 0.25 | bass.level 0.25 → 1.0 expo [0,16] (E2: 88-103); hat_open.level 1 → 0.5 expo [2,16] (E3: 90-103; mine −8 dB on the off-beat hat); sub.level 1 → 0.1 expo [3,16] (E1: 91-103, −20 dB) | none (the app's riser at 100-104 is removed) |
| 8 | break | 104 | 16 | kick A, sub A, bass D, stab S, pad A, clap A, hat_open A, shaker B | kick.lowcut −9; clap.level 0.2 (E3); hat_open.level 0.45 (E3: −7 dB, 104-119); shaker.level per E3 | – | bed: {bar 4, track 'bed', bars 28} (E3 P5, 108 to 136; if fx longer than the section is not allowed, chain it as a 16-bar fx here and 8 + 7 bar fx in the next two sections) |
| 9 | breakLate | 120 | 8 | kick A, sub A, bass D, stab S, pad A | hat_open off, shaker off, clap off (jump 2.8 dB at all 16 steps: no hits); no master.lp.cutoff (the V2 value 6000 is removed) | – | the bed continues |
| 10 | breakEnd | 128 | 7 | breakLate's play + hat_open A | hat_open.level 0.1 | hat_open.level 0.1 → 0.55 expo [0,7] (hats return 128, jump 7 → 19 dB, post −37 → −24 dB); sub.level 0.1 → 1.0 expo [2,7] (E1: 130-134); stab.cutoff up ≈ +7 dB at 2 kHz over [0,7] (E2) | bed continues; no riser, no clap roll, no master.hp ramp |
| 11 | gap | 135 | 1 | kick **G**, sub A, bass D, stab S, pad A | hat_open off | – | none (beat 4: kick and hats absent, the chord and bass keep going) |
| 12 | mainB | 136 | 16 | kick A, sub A, bass D, stab S, pad A, clap A, hat_open A, shaker G | kick.lowcut 0, sub.level 1, hat_open.level 1, clap.level 1, stab.cutoff as mainA | – | none |
| 13 | mainB_b | 152 | 28 | mainB's play + hat_closed H | hat_closed.level 0.4 | – | none |
| 14 | mainB_c | 180 | 4 | mainB_b's play minus pad | pad off at 180 (E2: bed to 179); burst P at 183 with `burst.level` 0.5 (the weak phrase-end hit at 183, 1 kHz +6 dB) | – | none (the app's riser at 180-184 is removed) |
| 15 | outro | 184 | 16 | kick A, sub A, bass D, stab S, clap A, burst P | hat_open off, hat_closed off, shaker off; stab.level × 0.58 (1.6-3.2 kHz −4.7 dB, est., or a lower cutoff: E2/E5) | bass.level 1.0 → 0.7 expo [0,16] (E2 est., −3 to −5 dB over the last 16 bars); no master.lp.cutoff ramp, no stab.cutoff ramp | none; last kick and last burst at bar 199 beat 4; render with `tailSeconds` 6.5 (the record rings 6.43 s after bar 200: RT60 5 to 6.5 s, wide) and the reverb send's decay set to match (A8: either a long song-wide send or a throw on the final clap, e.g. `clap.sends.reverb` raised at bar 199) |

**E4's closing notes (verbatim; the last sentence of the first note, "Global (E3...): swing about 0.6", is superseded by the swing ruling 0.40 + nudge, and `hat_closed` H / `shaker` B by `shaker_on`):**

Removed from V3 relative to the baseline and V2 (all measured absent or contradicted): `lead` (E2), `riser` at the build, mainA2, breakEnd and mainB (and the 8-bar breakEnd one), `impact` at 40 and 136, `perc`, the clap in the build and in 120-135, `master.hp.cutoff` ramps (build 24→180 Hz, breakEnd 24→500 Hz), `master.lp.cutoff` at 120 and the outro's ramp, V2's `breakLate` LP 6000, `kick.level 0.6` (replaced by `kick.lowcut`), `bass` before bar 88, `stab` before bar 24, the app's closed-hat patterns B, C, D, E (E3: no counterpart). Global (E3, pending a second analyst's confirmation): swing about 0.6.

Mapping each section's evidence to this table: boundaries 24, 40, 56, 76, 88, 104, 120, 128, 135, 136, 152, 180, 184 are all measured steps or fades in rounds 1 and 2 of this transcript (`Section 2` for 24-136 and 184; D9 and D2 above for 76 and 180; the hat table in D4 for 128 and 135). Bar 72 is deliberately not a boundary. Estimates: the on-beat layer's level (0.4), the pad entry (a 4 to 6 dB floor lift, not a note onset), the 180 bed exit (±2 bars), and every level in the `ramp` column that carries only a name for E1, E2 or E3.

### 3.2 Amendments to E4's rows (later analysts and rulings; the numbers are in section 2)

| E4 row | name (bars) | amendments |
|---|---|---|
| 1 | intro (0 to 15) | kick `lc.low` 0; kick `level` optional +0.5 dB (E1 R1, E5); `sub.level` 1; **burst** P plays (bars 3, 7, 11, 15 present, H); `hat_open` also gets its tone-opening ramp (FLAG C6: E3 `hat_open.lp.cutoff` 6000 at bar 8 expo to 11000 at bar 40, or E5 3500 at bar 16 to 11000 at bar 24); no `tick`, no clap, no `stab`, no `bass`; swing 0.40 applies from the first bar |
| 2 | intro2 (16 to 23) | burst bars 19 and 23 present; bar 23 is x2.5 (+8 dB); hat tone opening (E5: 3500 Hz at bar 16 expo to 11000 at bar 24) |
| 3 | build (24 to 39) | `kick.lc.low` ramp -2 to -7 dB lin (E1 final, E5; E4's cell says 0 to -9, FLAG C1); **tick** T from bar 26, `tick.level` expo ramp +16 dB to bar 40; hat step 0.2 at 24 then expo to 1.0 (E3 gives the same as E4's `hat_open.level` 0.2 to 1.0 [0,15]); `stab.cutoff` ramp 450 to 2400 expo over [4,16] (bars 28 to 39, E2); stab S and `stab.level` target -3.8 dB re kick from bar 26; burst bars 27, 31, 35, 39 masked, est. on (L); the E4 row omits the `bass` (correct) |
| 4 | mainA (40 to 55) | `stab.cutoff` back to about 700 (E2); tick stays at its plateau (-15 dB re the hat); burst bars 43, 47 masked est. on, 51, 55 present (E4 omits the burst here, FLAG C8); clap `level` 1; shaker G |
| 5 | mainA_b (56 to 75) | E4's `hat_closed` H at 0.4 is **replaced by `shaker_on`** (2.9b; steps 0, 5, 8, 13; E3 on-beat section, LOG 01:12); burst bars 59, 63, 67, 71 present, 75 masked est. on; E2's D#5 +10 to +14 dB step at bar 56 has no V3 parameter (open, section 6.3) |
| 6 | mainA2 (76 to 87) | `shaker_on` continues; pad A; burst 79, 83, 87 masked, est. on |
| 7 | mainA3 (88 to 103) | `sub.level` 1 to 0.03 expo over [5,16] (bars 93 to 103, E1 final; E4 has 1 to 0.1 over [3,16], FLAG C2); `hat_open.level` 1 to 0.5 [2,16] (E3: bars 90 to 103); `bass.level` 0.25 to 1.0 expo [0,16] (E2); `shaker_on` constant; burst 91, 95, 99 masked est. on, 103 present |
| 8 | break (104 to 119) | `kick.lc.low` -9, **sub off**: `set sub.level 0` and no `sub` in `play` (E1 final; E4's row keeps `sub A`, FLAG C2); `clap.level` 0.2 (ruled); hat: `hat_open` A at level 0.45 with `decay` about 0.05 (E4, E5, E3 P1) **or** `hat_closed` break (E3 final), not both (FLAG C4); the break shaker B is replaced by `shaker_on` at the hat's break level; burst: 107, 111, 115 masked est. on, 119 present; bed `fx` bar 108 |
| 9 | breakLate (120 to 127) | sub off, clap: E3 final 0.2 vs E4 off (FLAG C3); `shaker_on`, ghost shaker and burst off; bed continues; no `master.lp` |
| 10 | breakEnd (128 to 134) | `hat_open.level` 0.12 to 0.6 expo (E3 final) or 0.1 to 0.55 over [0,7] (E4) (FLAG C5); `sub.level` stays 0 for bars 128 and 129, then expo 0.03 to 1 over [2,7] (E1 final; E4 has 0.1 to 1.0); `kick.lc.low` -9; clap per FLAG C3; no burst |
| 11 | gap (135) | kick G; hats off; the sub, chord and bass continue; `sub.level` about 1 (E1: bar 135 reads 3 dB down, "estimated as noise"); `kick.lc.low` -9 for steps 0 to 11 |
| 12 | mainB (136 to 151) | `kick.lc.low` 0, `sub.level` 1; ghost shaker G; tick plateau; **no** `shaker_on` (starts at 152); burst 139, 143 masked est. on, 147, 151 present |
| 13 | mainB_b (152 to 179) | E4's `hat_closed` H replaced by `shaker_on`; burst 155, 159 present, 163 to 175 masked est. on, 179 present |
| 14 | mainB_c (180 to 183) | pad off; burst 183 weak (x0.5); `shaker_on` plays to bar 183 (E3: gone at 184) |
| 15 | outro (184 to 199) | no hat, no ghost shaker, no tick, no `shaker_on`; clap full level; burst 187, 191, 195, 199; stab and bass change at 184: step (E2 D9, E4: 1.6 to 3.2 kHz -4.7 dB, est.) or ramp (E2 final / E4 row) (FLAG C9); `tailSeconds` 6.5 |

Sections 1 to 14 keep `swing` 0.40 (global) and the bass step-6 nudge wherever bass D plays (88 to 199).

### 3.3 Kick low cut and drone fades (E1)

| bars | `kick.lc.low` (dB) | `sub.level` | note |
|---|---|---|---|
| 0 to 23 | 0 | 1 | kick +0.5 dB optional |
| 24 to 39 | ramp -2 to -7 (lin): -2.5 at 24 to 26, -4.5 at 30 to 32, -6.5 at 36 to 40 | 1 (the drone stays at -24 dB in 25 to 45 Hz through the build; no master highpass may cut it) | kick body falls 4.5 dB in 40 to 120 Hz (E4), 4.8 dB in 45 to 150 Hz (E1) |
| 40 to 92 | 0 | 1 | the lift at 40 is the "+4 dB kick" (E4: +7.6 dB at 50 Hz, step) |
| 93 to 103 | 0 | expo 1 to 0.03 | E1's per-bar track reads the fade 91 to 103, E4 93 to 104; E1: "take E4's 93 as the start of the steep part" |
| 104 to 129 | -9 | 0 (off; -41 dBFS leakage) | kick peak -4.4 dB, 50 Hz -7.7 dB (E4) |
| 130 to 134 | -9 | expo 0.03 to 1 | bar 134 reads +0.5 dB, bar 135 -3 dB (noise) |
| 135 | -9 (steps 0 to 11); beat 4 gap | 1 | |
| 136 to 199 | 0 | 1 | |

### 3.4 Hat, tick, on-beat layer and top-end timeline (E3 final, E5)

| bars | `hat_open` (x gain) | `hat_open.lp` | tick | `shaker_on` | ghost G | notes |
|---|---|---|---|---|---|---|
| 0 to 15 | expo 0.002 to 0.0136 (E3: -72 dB at bar 0 rising 1 dB per bar; audible from about 16; E5 starts the pattern at bar 8) | E3 6000 at bar 8 (FLAG C6) | off | off | off | HF 8 to 12 kHz about -80 dBFS squared |
| 16 to 23 | expo 0.0136 to 0.035 (+1.5 dB per bar) | E5 3500 at 16 expo to 11000 at 24 | off | off | off | 8 to 12 kHz -72.5 at 16, -62 at 23; 4 to 10 kHz tilt drop 21.7 dB (16 to 19), 20.2 (20 to 23), 5.9 (24 to 27), 0 (mainA) |
| 24 | step to 0.2 | open (11000) | | | | +13 dB at 8 to 12 kHz, -49 |
| 24 to 39 | expo 0.2 to 1.0 (+0.75 dB per bar) | 11000 | from bar 26, +16 dB ramp to 40 | off | off | all of 8, 10, 12.5, 16 kHz rise by the same 11.8 to 12.4 dB: a gain ramp, not a filter |
| 40 to 55 | 1.0 | 11000 | plateau | off | G | 8 to 12 kHz flat at -34.7 |
| 56 to 89 | 1.0 | 11000 | plateau | on (56 onward) | G | |
| 90 to 103 | 1.0 to 0.5 (-0.4 to -0.7 dB per bar; ghost falls 13 dB) | 11000 | plateau | on | G following the hat | 8 to 12 kHz -39.6 at 103 |
| 104 to 119 | 0.45, decay 0.05 | | off | on, at the hat's break level | off | break 8 to 12 kHz -40.1 |
| 120 to 127 | off | | off | off | off | bed only; HF -45 dBFS squared (4 to 8 / 8 to 12) and -48 (12 to 16) |
| 128 to 135 | expo 0.12 to 0.6 (FLAG C5) | | off | off | off | jump 7 dB at 128, 18 to 19 at 133 to 134 |
| 136 to 151 | 1.0 | | plateau | off | G | |
| 152 to 183 | 1.0 | | plateau | on | G | |
| 184 to 199 | off | | off | off | off | HF -49.6 from 184 (4 to 8 kHz -43.7, 8 to 12 -49.6, 12 to 16 -54.8) |

E3 gives the tick through 55 and "plateau" in mainA, mainA2 and mainB (its per-section table has no tick in 104 to 135 and the outro).

### 3.5 Bass, chord and pad timeline (E2)

| bars | event | source |
|---|---|---|
| 0 to 22 | no bass, no stab; faint tones at 408, 472 Hz (-50 dB) not built | E2 final, inventory E2-5 |
| 23 | the sixth phrase-end noise hit (E2 retracted a separate "one-bar event") | E2 R2 D9 |
| 24 to 25 | chord layer enters (554 and 622 Hz up 9 dB); D#4 and A#4 from bar 26; accents on bars 26 to 27, 30 to 31, 34 to 35, 38 to 39 (the step-7 hits in bars 3 and 4 of each group) | E2 R2 D9, E4 |
| 28 to 39 | chord filter sweep: D#6 (1245 Hz) from -57 to -37 dB; drops 12 dB at bar 40 and sits at -50 dB in mainA (the V3 `stab.cutoff` ramp 450 to 2400, then reset to about 700) | E2 final |
| 56 | D#5 (622 Hz) up 10 to 14 dB (-37.4 at 52, -29.7 at 56, -33.4 at 57); no V3 parameter carries it (6.3) | E2 R2 D9 |
| 76 to 179 | sustained wide chord bed (`pad` A) | E2 final, E4 |
| 88 to 103 | mid bass fades in: `bass.level` 0.25 to 1.0 expo (+12 dB at harmonics 5 to 10, +9 dB at harmonic 3); full from 104 | E2 final, E4 |
| 88 to 139, 156 to 171 | tones at 1.1 to 1.7 kHz (the "lead lines") are the bass pluck's harmonics and the chord bed's octave-6 and 7 copies; no lead is built | E2 R2 D2 |
| 104 to 199 | bass D, steady at -25 to -32 dB narrowband; the chord stays a static G#m11 | E2 final |
| 180 to 199 | the bed ends (C#5 falls 6 to 10 dB; -49 at bar 200); `pad` off from 180 | E2 final, E4 row 14 |
| 184 | chord harmonics at 2.2 to 3.3 kHz drop 2 to 5 dB; bass and chord level change (FLAG C9) | E2 R2 D9 |

### 3.6 Phrase-end noise hit (`burst`) bars

Measured present (E3, H): 3, 7, 11, 15, 19, 23, 51, 55, 59, 63, 67, 71, 103, 119, 147, 151, 155, 159, 179, 183, 187, 191, 195, 199 (183 weaker; 23 is 8 to 12 dB louder than the other five of the intro). Masked by other material (E3, L, "may be present", estimated on): 27 to 47, 75 to 99, 107 to 115, 123 to 143, 163 to 175. E3's per-section table plays it in intro, intro2, build (masked), mainA, mainA2 (masked), break (103, 119), mainB and outro, and not in breakLate, breakEnd or the gap. Pattern burst P (one hit on step 12 of the variant's 4th bar) in every section where it is listed, which gives exactly the bars above plus the masked ones. E4's table puts `burst P` only in intro, intro2, build, mainB_c and outro (FLAG C8). The last hit is at bar 199 beat 4 together with the last kick.

### 3.7 The bar-135 gap, the ending and the tail

- **Gap (E4):** bar 135, beat 4 (steps 12 to 15): kick and hats absent (40 to 120 Hz peak -18.8 dB against -4.5 at beats 1 to 3; 6 to 16 kHz -17 dB); 1 to 2.5 kHz and 300 Hz to 1 kHz keep going, so the chord and the bass play on. Kick pattern G in a 1-bar section "gap" at bar 135; `hat_open` off; the section before it (breakEnd) is 7 bars, so the section lengths sum to 200.
- **Start (E4):** no fade-in, no count-in, the drone already running at the first full bar; the 92 ms of digital silence plus the 472 ms pre-roll are the file's, not the track's (ruled): not built, no slice. The reference grid starts the first kick at 0.568 s.
- **End (E4, E5):** no fade, no lowpass; loudness flat -10.4 to -10.5 LUFS-M through bar 199; the last kick and the last noise hit at 381.044 s (bar 199 beat 4); then a 6.43 s stereo reverb tail (broadband -18.9 dBFS at 381.5 s, -39 at 383.0, -48 at 384.0, -66 at 386.0, below -90 after 387.64; band RT60 313 Hz 6.5 s, 413 Hz 5.5 s, 200 to 250 Hz 6.9 s, 1 to 2.5 kHz 4.6 s, 2.5 to 6 kHz 5.1 s; L/R correlation -0.02; lines 77.4, 153.8, 233.5, 312.6, 414.2, 555.5, 626.1 Hz). V3: render `tail` 6.5 s (the app's default is 2.5 s) with the reverb decaying to match (section 4).

## 4. The master and the sends

### 4.1 Master chain (E5 master table, LOG 00:54 and 01:04; for A8)

The V3 master starts from E5's settings. Source and master are fixed together: the sources reach the old master 4.8 to 6.5 LU too hot and its glue, saturator and limiter then reshape the balance (160 Hz -8.4 dB, 40 Hz +4.7, 400 Hz to 2 kHz +4 to +6, 4 to 12 kHz +7). With the settings below, all track `gain`s at about x0.58, the balance equals the raw mix within 0.1 dB in every band (measured, "v2": peak -1.0 dBFS, rms -10.55, crest 9.6, -9.5 LUFS on mainA against the record's -0.2, -11.2, 11.0, -10.26).

| unit | parameter (range) | V3 value | note / source | conf. |
|---|---|---|---|---|
| `eq` | `low` 1.5 @ `lowFreq` 90; `mid` -1 @ `midFreq` 400, `midQ` 0.8; `high` 1 @ `highFreq` 8000 | unchanged | moves bands by 1 dB at most; re-fit only after the first V3 render (E5's six-band EQ list, section 5.3, is the check) | (unmarked) |
| `hp` | `cutoff` (20..20000) | 24, constant | no 24 to 180 or 24 to 500 ramps (E1, E4, E5) | H |
| `lp` | `cutoff` (20..20000) | 20000, constant | no outro ramp, no 6000 at bar 120 (E4, E5 3c: 1 to 4 kHz does not move at 120; a 6 kHz 2-pole lowpass fits with 5.4 dB rms against 1.7 dB for an order-8 at 12.6 kHz, and bars 120 to 127 fit no lowpass better than 3.3 dB) | H |
| `glue` | bypass | on (bypassed): `bypass: true` on the master unit in the document (`host.js` already reads it); threshold -14, ratio 2.5 stay stored | Web Audio's compressor makeup (+1.4 dB for glue) disappears with the bypass | M |
| `sat` | bypass | on (bypassed) | saturator on costs about 1.5 dB of crest and adds 1 dB rms | M |
| `limiter` | `threshold` (-30..0) | -1.5 | E5 / E1 | M |
| `limiter` | `release` (0.01..1) | 0.08 | 0.05 was 0.7 LU louder and lost 2 dB of crest | M |
| `limiter` | `ceiling` (-12..0) | 0 (was -4.2: it sits before the clipper, so the clipper never acted and the real ceiling was -4.2 dB) | E5, E1 | H |
| `limiter` | `clipOn` / `clip` (-12..0) | true / -0.55 (the record's kick peaks are pinned at -0.57 to -0.54 dBFS, std 0.01 dB; 0.17 % of intro samples within 0.1 dB of the maximum) | E5 3d | H |
| render | `tail` | 6.5 s | E4, E5; the host option exists, the renderer default is 2.5 | H |

A8 may bring the glue or the saturator back only if a scored render improves (LOG 00:54 ruling 2). Level re-check after each change: the Web Audio `DynamicsCompressorNode` adds its own makeup gain (glue +1.4 dB, limiter +2.1 dB at the old thresholds, saturator +1.3 dB).

### 4.2 Sends (E5 master section, E3, E4)

| send / track | V3 value | source | conf. |
|---|---|---|---|
| reverb: clap | 0.25 (unchanged) | E5 | (unmarked) |
| reverb: hat_open | 0.12 (was 0.06; the hat is a mono source, width comes from the send) | E3 P2, E5 | est. |
| reverb: burst | 0.35 | E3 | M |
| reverb: pad | 0.4 (unchanged) | E5, E2 | L |
| reverb: stab | 0.1; delay: stab 0.15 (unchanged) | E5 | (unmarked) |
| reverb: bass, sub, kick | 0 | E5 | (unmarked) |
| reverb decay (send `reverb`) | raised so RT60 is about 6 s on the last hit: 6.5 s at 313 Hz, 5.5 s at 413 Hz, 4.6 s at 1 to 2.5 kHz, 5.1 s at 2.5 to 6 kHz; stereo, L/R correlation -0.02. Spec: `size` 0.2..8 s, `decay` 0..1 (song value 0.55), `damp`, `hp` 220. | E4 4e, E5 | H (measurement), method open |
| end-tail method | either a song-wide long reverb send, or a throw on the final clap and burst (`clap.sends.reverb` and `burst.sends.reverb` raised at bar 199) | E4 item 6, section 4e; A8 and A7 to decide | open |

Width targets (side/mid, mainA, for A9): hat 6 to 16 kHz -13.7 dB, clap 1.5 to 6 kHz -9.8 dB, burst -0.6 dB, stab 300 Hz to 1 kHz -2.4 dB and 1 to 4 kHz -6.8 dB, everything below 125 Hz mono (S/M below -40 dB).

## 5. Scoring: the level table and A9's targets

### 5.1 E5's level table (V3), verbatim

Convention (E5): 0 dB = the kick's body peak = -1.2 dBFS in the reference (E1). Every row is "the track's own hit, measured solo at the master input (master dynamics bypassed, track `gain` set, nothing else playing), sample peak over the first 120 ms of the hit, in dB re the kick's solo peak measured the same way". Absolute target = -1.2 dBFS + the row value. Bars are reference bars; the columns are E5's coarse ranges (the app's `intro`+`intro2` = bars 0 to 23, `build` 24 to 39, `mainA` 40 to 71, `mainA2` split at 88, `break` 104 to 119, `breakLate` 120 to 127, `breakEnd` 128 to 135, `mainB` 136 to 183, `outro` 184 to 199).

| track | 0-23 | 24-39 | 40-87 | 88-103 | 104-119 | 120-127 | 128-135 | 136-183 | 184-199 | source and how measured |
|---|---|---|---|---|---|---|---|---|---|---|
| kick | +0.5 | 0 falling to -4.5 (shelf `kick.lc.low` -2 to -7) | 0 | 0 | -4.4 (`kick.lc.low` -9) | -4.4 | -4.4, gap at bar 135 beat 4 | 0 | 0 | E1 (peak -1.2 dBFS, intro +0.5 over main; break -4.4 dB peak per E4); body peak -1.2 dBFS, -20 dB at 162 ms |
| sub drone (C#1 34.475 Hz, pulsing 1.2027 Hz) | -20 (plateau, rms between kicks -21.3 dBFS) | -20 | -20 | -20 falling to -35 over bars 91-103 | off (-41 dBFS leakage only) | off | off to -20 by bar 134 (ramp 130-134) | -20 | -20 | E1 L2; the V2 drone is 18 dB too hot |
| bass (G#1 pluck, bars 88-199) | off | off | off | -14.7 rising to -2.7 over bars 88-104 (+12 dB fade-in at harmonics 5-10) | -2.7 | -2.7 | -2.7 | -2.7 | -2.7 rising to about -6/-8 in the last 16 bars (E2: -3 to -5 dB) | E2: hit peak 2.5-2.9 dB under the kick peak, rms 7 dB under the kick in 100 Hz-1 kHz |
| stab / chord hits (G#m11 voicing) | -35 (faint tones, optional; narrowband -45 to -55 dBFS) | -3.8 from bar 26 (filter opens bars 28-39) | -3.8 on bars 3-4 of each 4-bar group, -10 on bars 1-2 (step 7 -14.2 dB band rms vs -21.4 in bars 1-2) | same | same | same | same | same | same | E2: chord hit peak -4.5 dBFS against kick -0.7 dBFS (total peak over 120 ms); 250-1000 Hz rms 5-65 ms after the hit is 14.2 dB under the kick's 20-250 Hz rms |
| pad / sustained chord bed | off | off | from bar 76: set so C#5 (554 Hz, +-25 ct) = -36 dBFS rms narrowband | same, to 179 | same | same | same | same to bar 179, fading to -49 at bar 200 | -41.7 to -49 dBFS (C#5) | E2 per-bar rms of the C#5 line; relative to the kick this is -35 dB (narrowband) and is scored by that band, not by hit peak |
| hat_open (the one off-beat hat; steps 2, 6, 10, 14) | bar 8 onward; 8-12 kHz band re the bar-40 plateau: bar 16 -38, bar 20 -32, bar 23 -27.5 (brightness opening, see D8) | bar 24 -14.2; bar 39 -0.3 (gain ramp, shape fixed) | 0 (hat peak -18.3 dB re kick; hat 2 ms band power vs kick 30-150 Hz peak) | 0 falling to -6 over bars 90-103 | -7 (gated, 45 ms) | off | -20 rising to -6 over bars 128-135 | 0 | off (-60 to -67) | E3 and my per-bar 8-12 kHz band (hf2) |
| hat_closed | off | off | off | off | break hits only: share the break hat's -7 (E3: steps 2, 6, 10, 14, soft 11) | off | off | off | off | E3 deletes the closed hat from the main sections |
| clap (steps 4, 12) | off | off | -17 (1.5-6 kHz peak re kick low-band peak) | -17 | -14 re main = -31 (E3; E4 says none: ruling needed) | off | off | -17 | -17 (E3: stays at -20 dB re band in the outro, step 4/12) | E3 clap level; E4 no clap in 0-39, 104-135 |
| shaker (ghost second event, steps 3, 7, 11, 15) | off | off | -31 (-13 dB re the hat) | -31 falling with the hat | break soft hits at steps 0, 5, 8, 13 at the break hat level (-7 re main hat) | off | off | -31 | off | E3 P1 |
| noise hit ("burst", step 12 of bars 4n+3; 0.3 s hold) | -30 (1-2.5 kHz sustained -31 dBFS abs vs kick low-band peak -0.6) at bars 3, 7, 11, 15, 19, 23 | at the unmasked bars (E3 list: not 27-47) | at 51, 55, 59, 63, 67, 71 | 75-99 masked; 103 | 103, 119 | off | off | 147, 151, 155, 159, 179, 183 | 187, 191, 195, 199 | E3 (stereo: maximally wide, S/M -0.6 dB) |
| break noise bed ("riser", bars 108-135) | off | off | off | off | rises from bar 108 (5-8 kHz -66 at 105 to -47 at 119 in E3's 20th-percentile units) | plateau (my per-bar band power, 4-8 / 8-12 / 12-16 kHz = -45 / -45 / -48 dBFS squared, mid) | continues, then the hats return | off | off | E3 P5 and my hf2 |
| perc, lead, riser, impact | off | off | off | off | off | off | off | off | off | E3, E2, E4: no counterparts (lead absent in the record) |

Notes to the table: (1) rows give the level at the start of the ramp and at its end where a ramp is named; the intermediate bars are linear in dB (the reference ramps are linear in dB: 1.5 dB per bar in 16-23, 0.75 per bar in 24-39 for the hat, 0.4-0.7 per bar fade in 89-103). (2) The sum of the rows is not forced to a loudness: the global x0.58 puts the sources at roughly the right overall level, and the per-section loudness is scored with the targets below; any remaining difference is taken on all tracks by the same dB (a master-input trim is not available, so scale every track's `gain`). (3) The reverse is also a check: with all rows right the raw mix must give mainA crest of about 11 dB and peak near -0.55 after the clipper.

**Rows added since E5's table** (dB re the kick body peak; scribe's conversions where marked):

| track | 0-23 | 24-39 | 40-55 | 56-87 | 88-103 | 104-119 | 120-135 | 136-151 | 152-183 | 184-199 | source |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tick (kick-top, every beat) | off | from bar 26, +16 dB ramp to bar 40 (level re the hat peak: -15 dB at the plateau, i.e. about -33 dB re kick, scribe's sum with the hat at -18.3) | plateau | plateau | plateau | off | off | plateau | plateau | off | E3 final, E3 on-beat section |
| shaker_on (steps 0, 8 / 5, 13) | off | off | off | -26.4 (E3; about -27.6 via the hat) | same | same, at the break hat's level | off | off | -26.4 | off | E3 on-beat section |
| bass step-6 nudge | n/a | n/a | n/a | n/a | from 88: +2/24 step | | | | | | LOG 01:10 |

E5's `shaker` row (ghost, -31) stays; its break entry "soft hits at steps 0, 5, 8, 13" is now `shaker_on`. E5's `hat_closed` row entry in the break is E3's `hat_closed` break hat (FLAG C4). E5's kick break value (-4.4) is produced by `kick.lc.low` -9, not by `kick.level`.

### 5.2 A9's scoring targets (all measurements by E5 unless named)

Tolerances from the brief: every band within 2 dB of the reference's balance in every section, loudness within 1 LU per section (aim 0.3). A9 must correct the render's 16.4 ms offset against its sidecar grid (E1), and extend `tools/score.py`'s SECTIONS table (still the archived arrangement) to the 15 V3 sections; the E5 windows below are the app's nine sections, which are also the unions of the V3 sections.

**(a) Loudness, ungated K-weighted LUFS (E5 1b; agrees with the coordinator's gated values to 0.1 LU).**

| window (bars) | reference LUFS |
|---|---|
| intro 0 to 15 | -10.55, -10.57, -10.57, -10.54 (per 4 bars) |
| intro2 16 to 23 | -10.53, -10.54 |
| build 24 to 39 | -11.67, -12.02, -12.30, -12.44 (a gradual 0.8 LU fall) |
| mainA 40 to 71 | -10.20 to -10.33 (eight windows); section value -10.24 |
| mainA2 72 to 99 | -10.17 to -10.49; -10.3 sliding to -10.6 |
| 100 to 103 | -10.63 |
| break 104 to 127 | -12.92, -12.72, -12.48, -12.41, -12.41, -12.40; section -12.4 to -12.9 |
| breakEnd 128 to 135 | -12.29, -12.18; section -12.2 |
| mainB 136 to 179 | -9.78 to -9.94; section -9.92 |
| 176 to 183 | -10.09, -10.09 |
| outro 184 to 199 | -10.41 to -10.50; section -10.43 |

Break: no step at bar 120 (-12.0 to -13.2 per bar with a 4-bar rhythm). 3 s short-term (max / median / min): mainA -9.8 / -10.3 / -10.5; break -11.7 / -12.5 / -13.4; mainB -9.5 / -10.0 / -10.4.

**(b) The 29-band reference columns** (1/3-octave bands at ISO centres 25 Hz to 16 kHz; mid+side power by Welch, Hann, nperseg 16384, 50 % overlap; dB re each section's own total; app sections intro 0 to 16, intro2 16 to 24, build 24 to 40, mainA 40 to 72, mainA2 72 to 104, break 104 to 128, breakEnd 128 to 136, mainB 136 to 184, outro 184 to 200). The score is the render minus this table, with the same method:

| fc (Hz) | intro | intro2 | build | mainA | mainA2 | break | breakEnd | mainB | outro |
|---|---|---|---|---|---|---|---|---|---|
| 25 | -26.7 | -26.4 | -24.2 | -26.5 | -27.7 | -40.1 | -28.7 | -26.8 | -26.5 |
| 31.5 | -16.5 | -16.3 | -14.0 | -16.4 | -17.7 | -29.9 | -18.1 | -16.7 | -16.4 |
| 40 | -20.4 | -19.9 | -18.0 | -20.1 | -21.4 | -33.6 | -22.2 | -20.4 | -20.3 |
| 50 | -11.4 | -11.4 | -14.5 | -11.6 | -11.4 | -16.5 | -16.8 | -11.9 | -11.5 |
| 63 | -5.1 | -5.1 | -7.4 | -5.3 | -5.4 | -9.0 | -9.4 | -5.7 | -5.3 |
| 80 | -8.0 | -8.0 | -9.3 | -8.5 | -8.5 | -10.7 | -11.0 | -8.9 | -8.4 |
| 100 | -9.2 | -9.2 | -9.1 | -9.8 | -10.0 | -9.8 | -9.7 | -9.9 | -9.6 |
| 125 | -8.6 | -8.7 | -7.7 | -9.2 | -9.2 | -7.8 | -8.1 | -9.5 | -9.1 |
| 160 | -11.3 | -11.4 | -10.0 | -11.6 | -11.6 | -9.1 | -9.1 | -11.3 | -11.4 |
| 200 | -11.9 | -12.0 | -10.2 | -11.9 | -11.8 | -9.5 | -9.7 | -12.1 | -11.9 |
| 250 | -16.2 | -16.3 | -13.9 | -15.7 | -15.7 | -12.5 | -12.6 | -15.1 | -15.4 |
| 315 | -24.1 | -24.3 | -18.3 | -17.9 | -16.5 | -13.4 | -13.7 | -15.6 | -15.4 |
| 400 | -29.7 | -29.7 | -19.9 | -21.6 | -19.7 | -16.5 | -17.2 | -18.6 | -20.8 |
| 500 | -34.5 | -33.1 | -17.9 | -19.1 | -18.2 | -14.1 | -15.1 | -16.4 | -20.4 |
| 630 | -34.1 | -28.1 | -19.5 | -20.3 | -20.6 | -15.3 | -15.7 | -18.1 | -23.8 |
| 800 | -36.1 | -31.5 | -22.8 | -26.4 | -23.3 | -16.8 | -16.7 | -19.6 | -25.0 |
| 1000 | -35.6 | -31.4 | -28.0 | -26.6 | -26.9 | -18.6 | -16.9 | -23.3 | -28.4 |
| 1250 | -35.1 | -33.4 | -26.2 | -29.1 | -26.2 | -20.4 | -17.7 | -26.4 | -29.5 |
| 1600 | -34.3 | -34.0 | -27.9 | -25.5 | -26.4 | -20.8 | -17.8 | -25.4 | -29.5 |
| 2000 | -36.1 | -35.8 | -31.1 | -28.5 | -29.0 | -27.8 | -21.4 | -28.6 | -30.6 |
| 2500 | -41.0 | -34.6 | -29.2 | -27.8 | -28.0 | -27.8 | -24.4 | -27.8 | -32.5 |
| 3150 | -45.2 | -35.6 | -29.3 | -27.9 | -27.8 | -26.9 | -26.1 | -27.9 | -33.6 |
| 4000 | -47.9 | -36.8 | -26.4 | -24.8 | -25.4 | -28.6 | -27.7 | -25.0 | -34.7 |
| 5000 | -53.0 | -43.0 | -28.6 | -26.7 | -27.4 | -29.5 | -29.2 | -27.0 | -36.2 |
| 6300 | -57.9 | -48.7 | -26.2 | -23.6 | -24.3 | -27.4 | -27.8 | -23.8 | -37.9 |
| 8000 | -63.7 | -52.8 | -26.1 | -23.3 | -23.8 | -26.0 | -27.9 | -23.5 | -38.8 |
| 10000 | -65.7 | -56.6 | -27.7 | -24.5 | -25.6 | -28.5 | -28.2 | -25.0 | -40.3 |
| 12500 | -63.6 | -56.0 | -31.2 | -28.2 | -29.6 | -33.7 | -30.5 | -28.6 | -42.6 |
| 16000 | -68.1 | -62.4 | -38.4 | -35.7 | -37.2 | -47.0 | -38.0 | -36.0 | -45.3 |

**(c) Peak, true peak and crest (E5 1c; reference).**

| section | sample peak | true peak | rms | crest | PLR |
|---|---|---|---|---|---|
| intro | -0.49 | -0.49 | -11.17 | 10.68 | 10.07 |
| intro2 | -0.52 | -0.51 | -11.15 | 10.64 | 10.02 |
| build | -0.52 | -0.51 | -13.23 | 12.71 | 11.59 |
| mainA | -0.21 | -0.04 | -11.22 | 11.00 | 10.21 |
| mainA2 | -0.24 | -0.23 | -11.32 | 11.08 | 10.11 |
| break | -0.42 | -0.38 | -14.23 | 13.81 | 12.17 |
| breakEnd | -0.51 | -0.45 | -13.96 | 13.45 | 11.79 |
| mainB | -0.18 | 0.00 | -11.01 | 10.83 | 9.92 |
| outro | -0.39 | -0.29 | -11.18 | 10.79 | 10.14 |

Whole song true peak +0.004 dBTP. Targets: sample peak -0.2 to -0.5 dBFS, crest 10.7 to 11.1 in the main sections and 12.7 to 13.8 in build, break and breakEnd. Kick-peak ceiling statistics: per-beat peaks (max |x| in the first 40 ms after each beat) in the intro p5 to p95 -0.57 to -0.54 dB (std 0.01); mainA and mainB p5 -0.55, p50 -0.48, p95 -0.37 (std 0.06 to 0.07); break p5 -1.61, p50 -0.95, p95 -0.48 (std 0.40); std below 0.1 dB in the main sections; 0.1 to 0.2 % of samples within 0.1 dB of the maximum in the intro.

**(d) The per-bar 4 to 16 kHz timeline (E5 3b, `hf2.py` method: band-pass 4th order zero phase on the mid signal, mean square per bar, dBFS squared; reference).**

| bars | 4 to 8 kHz | 8 to 12 kHz | 12 to 16 kHz |
|---|---|---|---|
| 0 to 2 | -66 to -64 | -81 to -79 | -82 to -81 |
| 3, 7, 11, 15 | -63, -60, -59, -57.5 | -75.5, -73, -72.5, -71 | -78, -77, -75, -73 |
| 16 | -58.4 | -72.5 | -73.3 |
| 20, 23 | -52.2, -47.8 | -66.6, -62.2 | -71.6, -70.3 |
| 24 | -43.7 | -48.9 | -55.9 |
| 32, 39 | -36.5, -33.0 | -40.1, -35.0 | -47.5, -42.8 |
| 40 to 71 | -32.5 | -34.7 | -42.0 |
| 72 to 88 | -31.6 | -33.9 | -41.8 |
| 103 | -37.3 | -39.6 | -50.6 |
| 104 to 119 | -38.2 | -40.1 | -53.5 |
| 120 | -44.3 | -47.6 | -65.7 |
| 121 to 124 | | -45 (E5 level table, 120 to 127 plateau) | -58.9, -53.8, -50.0, -48.1 (then flat to 127) |
| 136 to 183 | -32.4 | -34.7 | -42.0 |
| 184 | -43.7 | -49.6 | -54.8 |

The off-beat hit's 8 kHz to 16 kHz shape does not change over bars 24 to 39 (16 kHz band 13 dB under the 8 kHz band at every stage); the bars 16 to 23 rise is gain plus tone opening (E5 D8).

**(e) Mid/side per band (E5 section 2; reference S/M in dB, equal-level rho in brackets), coarse bands 20-120 / 120-300 / 300-1k / 1-4k / 4-10k / 10-16k Hz.**

| window | 20-120 | 120-300 | 300-1k | 1-4k | 4-10k | 10-16k |
|---|---|---|---|---|---|---|
| intro 0 to 16 | -58.3 (1.00) | -28.4 (1.00) | -11.0 (0.85) | -2.1 (0.24) | -4.3 (0.46) | -3.6 (0.40) |
| mainA 40 to 72 | -43.7 (1.00) | -19.2 (0.98) | -2.4 (0.27) | -6.8 (0.65) | -10.1 (0.82) | -12.8 (0.90) |
| break 104 to 120 | -37.8 (1.00) | -17.8 (0.97) | -3.4 (0.37) | -2.8 (0.31) | -5.2 (0.54) | -6.0 (0.60) |
| break 120 to 128 | -39.0 (1.00) | -17.7 (0.97) | -3.2 (0.36) | -3.3 (0.36) | -3.1 (0.35) | -3.7 (0.40) |
| mainB 136 to 184 | -42.8 (1.00) | -17.9 (0.97) | -3.5 (0.38) | -6.3 (0.62) | -10.1 (0.82) | -13.2 (0.91) |

By 1/3 octave in mainA: -42 to -69 dB from 25 to 125 Hz, then at 160 Hz either about -34 dB (E5 finding 1) or -23.4 dB (E5 finding 3; E5's two readings differ, section 6.3), -19 at 200 Hz, -11.9 at 250 Hz, -4.1 at 315 Hz. Mono below about 125 Hz. The bass is mono at the bottom (155 Hz S/M -16 dB, 258 Hz -9 to -14, 517 Hz -5.8, E2); chord tones 311 to 1245 Hz S/M -1.0 to -4.6 dB.

**(f) Swing (E2, E3, E1; ruling 0.40 plus the bass step-6 nudge).** Engine: odd 16ths are late by swing x 0.33 x 119.05 ms = 15.7 ms at 0.40 (0.38 gives 14.9, 0.45 gives 17.7); step 6 (even) gets +2/24 step = 9.9 ms from the nudge. Measured onsets of the record, ms re the grid line: bass (E3, 500 to 535 Hz 3 ms envelope, 50 % of the local peak, hits within 8 dB of the loudest) mainB step 1 +11.0 (sd 8.2, n 48), step 6 +11.9 (6.7, 32), step 8 -4.6 (10.7, 25), step 11 +13.1 (4.5, 24), step 14 -5.0 (11.8, 43); break 1 +9.4, 6 +10.9, 8 -5.9, 11 +13.2, 14 -5.0. Bass (E2, 350 to 1000 Hz, 2 ms power, maximum slope): step 11 +9.9 (sd 2.8, n 34), step 1 +16.3 (7.1, 8), step 14 -4.2 (6.0, 12), step 6 +7.5 (n 6, unreliable). Bass (E1, 400 to 1000 Hz band, 10 % and 50 % rise): break 1 +9.6, 6 +9.7, 11 +9.6, 14 -4.3; mainB +9.5, +9.5, +9.5, -4.4. Chord (E2) step 7 +15.5 (sd 2.4, n 9) against steps 4, 8, 0 at +0.2, +0.3, +0.8. Odd minus even: 15.9 ms (mainB) and 16.8 ms (break) (E3); 14 to 20 ms (E2). The record's step 14 is 4 to 5 ms early; V3 leaves it on the grid (no ruling), so it will read about 4.4 ms off against the 4 ms threshold of LOG 01:10: A9 to report it without reopening the ruling unless steps 1, 6, 11 also disagree.

**(g) Per-element measures worth scoring (solo renders against the record's mixed-signal figures).**

| element | measure | reference value | source |
|---|---|---|---|
| kick | glide fit f = f_end + A e^(-t/tau) | 52.0 + 210 e^(-t/24.0 ms) Hz, 10 to 150 ms, residual 3.2 Hz; first 10 ms irregular at 195 to 245 Hz | E1 |
| kick | level crossings (Hilbert, 400 Hz lowpass) | -1 dB at 49 ms, -3 at 82, -6 at 99, -20 at 162, -40 at 198; peak -1.2 dBFS at 37 to 45 ms; cut at about 197 ms | E1 |
| kick | click, 1 to 2.5 kHz, per hit | -29.1 dBFS in the first ms, -10 dB by 2 ms; 25.2 dB under the 150 to 300 Hz peak (-3.9 dBFS at 6 to 7 ms); 0 to 12 ms spectrum re 250 Hz: 500 Hz -26.6, 1 kHz -34.8, 2.5 kHz -40.3, 4 kHz -47.1, 10 kHz -63.7 dB | E1 |
| kick | harmonics 2 / 3 / 4 / 5 at 60 to 140 ms | -23.9 / -28.9 / -39.1 / -55.1 dB | E1 |
| kick | third-octaves re 63 Hz at 125 / 160 / 200 / 250 Hz (single hit) | -15.5 / -24.6 / -29.7 / -36.5 dB (E1's re-fit gives -17.7 / -24.2 / -32.2 / -40.0) | E1 |
| drone | line, duck | 34.475 Hz, pulse 1.2027 Hz depth 20.3 dB (fold), plateau -21.3 dBFS, duck table: -5.5 dB at 10 ms, -11.3 at 20, -15 at 40, -11.5 at 80 to 120, -7.3 at 150, -1.5 at 200 | E1 |
| bass | f0 harmonics, hit shape | harmonics 3 to 12 of 51.5 Hz (155, 207, 258, 310, 360, 411, 462, 511 Hz); attack 12 to 15 ms, hold 100 to 110 ms, centroid 628 Hz falling to 300 Hz in 90 ms; flat 100 Hz to 1 kHz within 1 dB | E2 |
| stab | pitch set, hit | D#4 F#4 G#4 A#4 B4 C#5 D#5; attack under 15 ms, -6 dB by 60 ms, plateau -8 dB for 0.3 s or more, centroid 510 Hz; hit 14.2 dB under the kick (250 Hz to 1 kHz rms against 20 to 250 Hz rms) | E2 |
| hat | spectrum, level | centroid 6.6 kHz (1 to 16 kHz), 57 % above 6 kHz; peak -18.3 dB re kick; -3 / -6 / -12 / -19 dB re peak at 5 / 20 / 60 / 100 ms; side/mid -13.7 dB | E3 |
| clap | level, structure | -17 dB re kick; three bursts at 0, +12, +24 ms, the first loudest; -20 dB at 89 ms; flat 0.8 to 5 kHz; side/mid -9.8 dB | E3 |
| burst | level, envelope | 1 to 2.5 kHz -31 dBFS sustained for 0.3 s, -8 dB in the next 0.15 s; maximally wide (L/R correlation 0.07) | E3 |
| bed | 20th-percentile band power | 5 to 8 kHz -66 (bar 105) to -47 (bar 119); 8 to 12.5 kHz -72.7 (106) to -50.6 (119) and -45.3 (123); 12.5 to 16 kHz -82 (118) to -52 (124) | E3 |

### 5.3 The EQ check (E5 section 4)

Six-band biquad list fitted on mainA (after the V3 source and master fixes its gains should all come out under 3 dB; not part of the chain): peaking 41.1 Hz Q 4 -12; peaking 68.8 Hz Q 4 +9.3; peaking 189.0 Hz Q 2.69 +12; peaking 1368.7 Hz Q 0.4 -12; peaking 7010.8 Hz Q 0.96 +7.2; high shelf 13165 Hz -12 (shelf Q ignored by Web Audio). Rms residual 7.07 dB before, 3.46 dB after on the shipped master. Three of the filters sat on their bounds, the signature of a source error patched (E5).

## 6. Open, estimated and flagged

### 6.1 Conflicts for the coordinator (FLAG Cn)

Where a ruling exists it is applied and listed in 0 and not here. Each flag gives both values and their sources; the sheet's default is the one marked "default".

| # | item | values and sources | default used |
|---|---|---|---|
| C1 | kick low-cut name and build ramp | name: `kick.lc.low` on a chain eq3 `lc` (E1 final, E5 level table) against `kick.lowcut` (E4 table; the coordinator's wording "kick lowcut"). Build endpoints: -2 to -7 dB lin (E1 final, measured -2.5 / -4.5 / -6.5; E5) against 0 to -9 (E4 table cell `kick.lowcut 0 -> -9 dB [0,16]`) | chain `lc` with E1's endpoints; A7/A8 may add `lowcut` as an alias |
| C2 | drone fade and the break | E1 final: full to bar 92, ramp to 0.03 over 93 to 103, off 104 to 129, ramp to 1 over 130 to 134. E4 table: `sub.level` 1 to 0.1 over section bars [3,16] (91 to 103) and 0.1 to 1.0 over [2,7], with `sub A` still in `play` in break and breakLate (no off-level). E4 section 2: fade 93 to 104, -15 dB. E5 level table: -20 falling to -35 dB (15 dB) over 91 to 103. E1 R1 text: -26 to -38 dB (12 dB) | E1 final |
| C3 | clap in bars 120 to 135 | E3 final and E3 per-section table: `clap.level` 0.2 in breakLate and breakEnd. E4 table: clap not in play in 120 to 135 (E4 round 2: "mute it in 120-135 where the 2.5-6 kHz profile is flat"; the E4 D4 test found hats, shaker and ghost events off). Ruled: 0.2 for 104 to 119 only | open; sheet follows E4 (off) pending ruling |
| C4 | which track plays the break hat | `hat_open` A, level 0.45, decay about 0.05 (E4 table row 8, E5 level table, E3 P1) against `hat_closed` `..x...x...xo..x.`, decay 0.07, level 0.45 of the main hat (E3 final and E3 per-section table, which lists both `hat_open` "gated, 0.45" and `hat_closed`, i.e. the same hits twice) | `hat_open`; use one track only |
| C5 | hat return ramp, bars 128 to 135 | E3 final: expo 0.12 to 0.6. E3 P1: 0.1 to 0.5. E4 row 10: 0.1 to 0.55 over [0,7], then 1.0 at 136. E5 level table: -20 rising to -6 dB re kick (about 0.1 to 0.5 of the main hat) | E3 final |
| C6 | hat tone-opening ramp (D8) | E3 final: `hat_open.lp.cutoff` 6000 at bar 8 expo to 11000 at bar 40 (conf. L). E5 round 2: 3500 Hz at bar 16 expo to 11000 at bar 24 then fixed (est.; from the 21.7 dB drop between 4 and 10 kHz in bars 16 to 19, 20.2 in 20 to 23, 5.9 in 24 to 27, 0 in mainA). E3 round 2 D8 reads the tilt as opening "from 5 to 6 kHz at bar 8 to above 12 kHz by bar 40" | E5's (it carries the measurement); no ruling |
| C7 | on-beat layer | closed by E3's on-beat section and LOG 01:12 (`shaker_on`, steps 0, 5, 8, 13, bars 56 to 119 and 152 to 183). Remaining: E4's table still has `hat_closed` H and lacks `tick`, `shaker_on` and the break shaker; E3's earlier statement that the layer rises on steps 0 and 8 only (E4: "steps 0 and 8, -8 dB") is corrected by E3 to four hits at -9.3 dB | `shaker_on` replaces E4's H |
| C8 | `burst` presence | E3: present at bars 3, 7, ..., 23, 51 to 71, 103, 119, 147 to 159, 179 to 199 and masked-but-probable elsewhere; E3 per-section table puts it in every section but 120 to 135. E4 table: `burst P` only in intro, intro2, build, mainB_c, outro | E3's list (3.6) |
| C9 | outro level change | stab: E4 `stab.level` x0.58 at 184 (est.); E5 level table and E2 final table carry no stab change; E2 D9: chord harmonics at 2.2 to 3.3 kHz drop 2 to 5 dB at 184 (a step, not a ramp). Bass: E2 final and E4 row 15 ramp 1.0 to 0.7 (expo, over 16 bars, "-3 to -5 dB over the last 16 bars" in E2 round 1); E2 D9: "step at 184, not a ramp". E5: bass about -6 to -8 re kick in the last 16 bars | step at 184 for the stab (x0.58, est.), bass ramp as in E2 final; no ruling |
| C10 | stab widener | E2 final: `width` 1.4 with `spread` 0.8. E5 round 2: `width` 1.6 to 2.0 with `monoBelow` 250 (est.). Target: S/M 300 Hz to 1 kHz -2.4 dB, 1 to 4 kHz -6.8 dB, 4 to 10 kHz -10.1 dB (the record's upper partials are narrower than the app's) | E2's pair, then A9 decides by the S/M target |
| C11 | absolute gains | E3's hat 0.15, clap 0.22, shaker 0.12, `shaker_on` about 0.05 were computed on a kick solo the limiter had flattened to -6.4 dBFS; E5 says scale them by about +5 dB before the global x0.58, a net factor near 1.0. E2's stab 0.09 and E1's sub 0.07 were fitted on the old master. E5's dB-re-kick table is the authority; track gains are starting values for A9 | gains as quoted, A9 re-sets by 5.1 |
| C12 | velocity map | E2's bass pattern assumes `X` = 1.0; the parser gives `X` 1.0 with the accent flag (x1.2 in the synth), `o` 0.5, `x` 0.85, so step 11 of bar 2 is +7.6 dB over an `o` hit where E2 measured +6 dB. Also the bass is a `note` track: every hit plays G#1 | keep; A9 may use cell `vel` values 0.5 and 1.0 without the accent |
| C13 | E1 swing recommendation | E1 final table: global swing 0 to 0.06 ("the bass's odd and even steps land within 0.1 ms"). E2 (0.45), E3 (0.38) and the coordinator (0.40 + nudge) disagree; the ruling stands | ruled; A9 check at 4 ms |
| C14 | tick extent | E3 per-section table: tick plateau through mainA, mainA2, mainB and absent in the break; the E3 D3 text says it is on all four beats from bar 26. The coordinator's 01:12 note does not say. | 26 to 103 and 136 to 183 |
| C15 | drone and kick `duck` list | E1 final names `['sub']` only and leaves bass, stab and pad to E2 and E5; E2 gives sidechains (bass depth 0.5, stab 0.9, pad 0) | `['sub','bass','stab','pad']` |
| C16 | bed plateau and fx length | E3 final asks A7 for `floor` and a plateau `hold` on `riser` (rise 16 bars from bar 108, then flat to bar 135); only `floor` is named in the rulings. E4 row 8 suggests chaining fx per section if an fx may not outlast its section | E3 request; A7 decides |

### 6.2 Estimated and low-confidence values (A9 tunes these by measurement)

- **Kick (E1 final):** `click` about 0.05 (L), `drive` 0.1 (L), kick gain about 0.58 (L); `tune`, `punch`, `tau`, `attack`, `swell`, `hold`, `decay`, `harmonic` are M (model fits; the swell 2 / attack 0.02 / harmonic 0.1 compromise leaves 125 / 160 / 200 / 250 Hz within 2.2 / 0.4 / 2.5 / 3.5 dB and a level error of 2.5 dB rms over 5 to 185 ms against 1.0 dB for the swell-6 fit; the 250 Hz remainder is the onset transient, to be added by the knock). The intro +0.5 dB is optional.
- **Sub (E1 final):** `gain` about 0.07 (M, the limiter interacts); `attack` / `release` (L); the second partial and its phase (M); the LFO alternative (L); the 0.03 floor of the fades.
- **Bass (E2):** wave `sawtooth` (L), detune 4 (L), cutoff 450 (L), env 2600 (L), res 2.5 (L), release 0.03 (L), drive 0.5 (L), the `eq` change (L), the sidechain (L), the outro ramp (L); octave of G#1 is M (plausibility only); the pattern's velocities (M), the omitted soft step 8 in bar 1 (-11 dB) and soft step 6 in bar 2 (-13 dB).
- **Stab (E2):** cutoff 450 / env 700 / res 1.5 / release 0.08 / hp 150 / gain 0.09 (L); the mainA cutoff of about 700 (est.); gate 6 and 12 (M, L; one `gate` per track); hits in bars 1 and 2 of each group, steps 0, 1 and 11 (L); the octave-3 voicing misses G#4, B4, D#5 and adds G#3, B3 (M).
- **Pad (E2):** attack 0.3, release 1.2, cutoff 2500, detune 4, reverb 0.4 (L); the 180 bed exit is +/-2 bars.
- **Hat (E3):** `metalHp` 4000 (L), the lowpass cutoff 11000 (M), the ramp (L), `pan`, the sends 0.12 (est.), the 0 to 23 and 128 to 135 level curves (M), break decay 0.05 (L).
- **Clap (E3):** `tone`, `q`, `decay`, `first` (M); `tail`, `tailDecay`, `flams`, `flam` (unmarked); the chorus idea (est.).
- **Ghost shaker (E3):** gain about 0.12 (L); **tick:** all params L, ramp M; **`shaker_on`:** tone / attack M, decay L, gain L, `hold` 0.03 optional (L).
- **Burst (E3):** the intro lowpass near 1.5 kHz (E4 est.), the stereo method, bar 23 x2.5 and bar 183 x0.5 (est.), all masked bars (L).
- **Bed (E3):** `floor` 0.04 and the plateau `hold` (M, not ruled by name).
- **Arrangement (E4):** `hat_open`'s first 8 bars (below the codec floor), the on-beat layer's older E4 level 0.4 (est., superseded), the pad entry (a 4 to 6 dB floor lift, not a note onset), the 180 bed exit (+/-2 bars), the outro stab step x0.58 (est.), every level in the ramp column that carries only a name.
- **Master (E5):** the `eq` re-fit after the first V3 render; the cause of the master's 160 to 200 Hz loss (limiter on the kick onset, inferred); the widener width 1.6 to 2.0 (est.); the hat boost of +9 to +11 dB after the master is relaxed (extrapolated); the break's HF shoulder being a duller hat voicing rather than a filter (est.); the break order-8 fit.
- **Measurement limits (all):** no stems (Demucs blocked), everything from the mixed MP3 at 192 kbps (side channel above about 10 kHz coarse, band limit near 19.5 kHz); 25 to 40 Hz bands rest on 1 to 5 bins; solo contributions are not additive; E5's K-weighting is ungated.

### 6.3 Items the coordinator left open, and loose ends

1. **The stationary lines at 1460 and 1557 Hz** (E3: the floor at -68 dB, 24 dB under the kick click, not on the chord series: 23 cents under F#6, 12 under G6). E2 round 2 D2 attributes 1546.7 and 2071.2 Hz to the hat sample's fixed partials (they come and go with the hat); E4 withdrew "constant through the whole track". No V3 element carries them; the hat's `ring` and `metal` parameters are the only available stand-in.
2. **Bass step 6 at +11 ms:** ruled (LOG 01:10): a per-step nudge of +2/24 step on bar-1 step 6 in the V3 cells; A9 checks the offsets of steps 1, 6, 11, 14.
3. **The on-beat hat layer at bars 56 and 152:** settled by E3's `shaker_on` (2.9b). Left: E2's D#5 +10 to +14 dB step at bar 56 (622 Hz: -43.4 at 48, -37.4 at 52, -29.7 at 56) has no V3 parameter, and E3 did not sample bars 107 to 119 bar by bar.
4. E5's two figures for the 160 Hz mid/side in mainA (-34 in finding 1, -23.4 in finding 3): to be re-measured by A9; the target for the 120 to 300 Hz band is -19.2 dB.
5. Intro faint tones (408, 472 Hz) and E5's optional "-35 dB re kick" chord tones before bar 24: not built.
6. The end-tail method (song-wide long reverb against a throw on the last hit): A7 and A8 (4.2).
7. The bed's plateau `hold` and an fx longer than its section (2.12, FLAG C16): not ruled.
8. Whether the master `eq` (+1.5 / -1 / +1 dB) stays; E5 says leave it until the first V3 render.
9. Pre-roll and silence: ruled, no slice; owner's decision to revisit.
10. Case where A9's render disagrees with the swing offsets by more than 4 ms: the ruling is revisited (LOG 01:10).
