# Ear Crew report: matching the recreation to the record

Coordinator's report, written 24 October 2026 (ET) from the crew's transcripts in `transcripts/` (E1 to E5, A7 to A9, and the coordinator's own log, which records every check and render with its exit code), the brief, `V3-SPEC.md` and `DISCUSSION.md`. Every number here is a measurement from one of those files, named where it is used; nothing here was heard. The original track is the owner's file and is not in the repository.

## 1. The question

The owner listened to the app's first full render against the original and said it was not close, and that every sound in the original should be accounted for. For the first time a Roundtable group had the original to measure. The question was: what exactly does the record contain, element by element, where does the recreation differ, and how far can the recreation be brought toward it with the engine as it stands.

## 2. Result in one paragraph

The recreation's harmony, bass and arrangement were wrong in kind, not in degree, and the master was reshaping the balance by up to 8 dB per band. After five analysts' inventories, a cross-read that settled nine disputes by measurement, a consolidated spec and three build-and-score iterations, the V3 song renders within 0.5 LU of the record in every one of nine sections (whole song −10.41 LUFS against −10.65), with the record's ceiling, the record's swing on every hat, and the bass on the record's timing on all four measured steps. In third-octave terms, between 13 and 18 of 29 bands per section sit within 2 dB of the record after the fourth pass (8 to 16 after the third); the rest are named in section 6 with an owner each. Nobody has listened to it.

## 3. What the record contains (the inventory)

From the five round-1 and round-2 transcripts, as settled:

- **Kick** (E1): body peaking at 56 Hz, pitch glide 52 + 210·e^(−t/24 ms) Hz, level peaking at 35 to 40 ms, −20 dB at 162 ms, cut at about 197 ms, a 1 to 2 ms click 25 dB down. Through the build and the break it carries a −9 dB low cut that a 90 Hz low shelf matches within 0.7 dB. No other kick-like voice.
- **Sub drone** (E1): a continuous mono 34.475 Hz tone (C#1, 8.6 cents flat) pulsing at 1.2027 Hz, not tempo-synced, with 15 to 20 dB dips; its pitch dips to about 31 Hz in each pulse's quiet phase, which is what an earlier analysis had read as a B0 note. Ducked by the kick: −15 dB at about 40 ms, a plateau, back to −3 dB at 177 ms (best fit depth 0.78, attack 0.01, hold 0.08, release 0.12, curve 'db'). Fades out over bars 91 to 103, absent 104 to 129, back over 130 to 134.
- **Bass** (E2): one note, G#1 (f0 about 51.5 Hz, read from harmonics 3 to 10; the fundamental itself is not detectable in the mix), saw-like, attack 12 to 15 ms, hold about 100 ms, filter closing in 60 to 80 ms, a two-bar pattern (steps 1, 6, 11, 14; then 11 loud with 1, 8, 14 soft). It plays only from bar 88, fading in over 88 to 103.
- **Chord** (E2): one static G#m11 (D#4 F#4 G#4 A#4 B4 C#5 D#5), no progression, a stab with attack under 15 ms, a plateau of at least 0.3 s and a gate of 0.6 to 1.1 s, 14.2 dB under the kick, centroid 510 Hz, from bar 24 (with a filter sweep over bars 28 to 39); and a sustained wide chord bed from bar 76 to 179. The D#5 steps up at bar 56.
- **No lead** (E2). The tones that looked like a lead are the bed's upper partials.
- **Hats** (E3, E5): one off-beat hat on steps 2, 6, 10, 14 with a ghost on 3, 7, 11, 15; a decay of −6 dB at 20 ms, −19 at 100; centroid 6.6 kHz with 57 % of its energy above 6 kHz; it fades in over bars 16 to 39 while its brightness opens (a 3.5 to 11 kHz tone sweep), and its level is automated by section. No closed 16ths in the main sections. Hats are absent in bars 120 to 127 and return over 128 to 134.
- **Clap** (E3): generated noise, a loud first snap then bursts about 12 ms apart, on steps 4 and 12, from bar 40 only, about 17 dB under the kick, quieter in the break, full in the outro.
- **Kick-top tick** (E3, E1): a flat-spectrum noise hit on all four beats, 100 ms, rising from bar 26 to 40, about 15 dB under the hat; a separate voice, not a kick parameter.
- **On-beat layer** (E3, found by E4): a soft-attack noise voice on steps 0, 5, 8, 13, entering at bars 56 and 152, 9 dB under the off-beat hat.
- **Noise bursts** (E3, E4): on beat 4 of bars 4n+3 (bars 3, 7, 11 ... through the intro and again in the outro), different noise each time, two decorrelated channels, a reverb tail; not a sample.
- **Break bed** (E3, E4, E5): a steady wide noise bed from bar 108 whose lowpass opens from about 5 kHz to above 16 kHz by bar 124, holding to bar 135. There is no master lowpass anywhere in the record; the bar-120 "drop" is the hats stopping.
- **Arrangement** (E4): boundaries at bars 24, 40, 56, 76, 88, 104, 120, 128, 135 (a one-beat gap), 136, 152, 180, 184; no change at 72; loudness flat inside each section (intro −10.56, mainA −10.24, break −12.4 to −12.9, mainB −9.92 LUFS). No vocal, no spoken word, no sample (three tests). A 6.4 s reverb tail after the last kick at bar 199 beat 4.
- **Master** (E5): a sample-peak ceiling at −0.55 dBFS, crest 10.6 to 13.8 dB, mono below 125 Hz, wide at 300 Hz to 1 kHz, near pink above 630 Hz and steep below.
- **Swing** (E1, E2, E3, ruled): odd 16ths about 15 ms late on the hats and the chord; the bass's steps 1, 6, 11 late and 14 not, so a global 0.40 with a per-step nudge on bass step 6.

## 4. What the recreation had wrong

Against the inventory, the V2 song (the first full render the owner heard):

- The bass was B2, 15 semitones above the record's note, on the wrong steps, playing from bar 1 where the record has none until bar 88; its harmonic stack from 124 Hz to 1.6 kHz was most of the "too much in the mids" (300 Hz to 1 kHz read +13.6 dB in the intro, +6 in the main sections).
- The stab played a Bmaj9 / G#m7 / Emaj7 progression in octave 4 with a 105 ms gate, 13.7 dB too loud and twice as bright as the record's single G#m11; a lead with no counterpart played over it.
- The sub was a B1 pluck (baseline) or an 18 dB too loud drone (V2); the kick was 20 dB too bright at 1 to 2.5 kHz and the master limiter flattened its peaks for 140 to 230 ms.
- Closed hats, a clap and risers played in sections where the record has none; the hat was 4 kHz too bright and 10 dB too loud; the four noise bursts, the tick, the on-beat layer, the ghost shaker and the break bed did not exist; the master ran highpass and lowpass sweeps the record never does.
- The master's glue, saturator and limiter reshaped the balance (160 Hz −8.4 dB, 40 Hz +4.7, 400 Hz to 2 kHz +4 to +6, 4 to 12 kHz +7) and inverted the break's loudness (+3.4 LU where the record drops).

## 5. What was built, and the three scores

A7 added the engine parameters the inventory needed (kick attack, swell, clickDecay, clickLp, harmonic, length; a drone voice running across bars with beat partials; clap first; shaker hold; riser floor and hold; the G#m11 voicing) and wrote `GUIDANCE_V3`: 15 sections, swing 0.40, the nudged bass cell, every element above, and none of the removed ones. A8 gave every chain unit a real bypass, the master a true ceiling (an oversampled clip with a sample-rate clamp behind it), a decorrelation insert for stereo noise, and the end-tail reverb. A9 found and removed the 16.4 ms render offset (compressor lookahead, now measured per render), and built the one-run delta table: loudness, peaks, crest, 29 third-octave bands against E5's reference columns, mid/side per band, the 4 to 16 kHz per-bar timeline, kick glide, sub duck, and per-step onset offsets with a 4 ms pass line.

Loudness delta per section, render minus record (LU), `log-A9.md` sections 7 to 9:

| Score | intro | intro2 | build | mainA | mainA2 | break | breakEnd | mainB | outro |
|---|---|---|---|---|---|---|---|---|---|
| 1 (first V3) | −1.32 | −1.33 | +0.28 | −0.18 | +0.14 | +3.22 | +5.79 | +0.58 | −0.18 |
| 2 (bed, hat, nudge) | −1.32 | −1.33 | +0.56 | +0.39 | +0.58 | +1.27 | +0.76 | +0.81 | −0.18 |
| 3 (burst, bass hp, stab, intro) | −0.03 | −0.03 | −0.58 | +0.12 | +0.27 | +0.12 | −0.44 | +0.18 | −0.69 |
| 4 (kick drive, 4th-order bass hp and nudges, break hat, burst shelf) | +0.24 | +0.23 | −0.23 | +0.34 | +0.47 | +0.33 | −0.24 | +0.34 | −0.43 |

Third-octave bands within 2 dB of the record, score 3 → score 4: intro 8 → 13 of 29, intro2 14 → 16, build 13 → 17, mainA 12 → 16, mainA2 14 → 18, break 15 → 17, breakEnd 14 → 15, mainB 16 → 17, outro 12 → 15. Timing at score 4: every off-beat hat within 1.2 ms of the record; bass steps 1, 6, 11 and 14 all pass (−2.2, +2.5, +2.3, +2.7 ms) after the 4th-order highpass's delay was compensated with fitted nudges. The ceiling holds: sample peak −0.55 dBFS, true peak −0.10 dBTP, no overshoot. Whole song −10.41 LUFS against −10.65.

What each iteration changed: (1) the break bed came down 25 dB (its first level had been read off the wrong bars) and was decorrelated; the open hat rose 14 dB to the record's level and was nudged 5 ms earlier; (2) the bursts came up to the record's band level, a highpass went under the bass, the stab lost 3 dB and went mono below 250 Hz in the build, the intro's kick and drone rose 1.3 dB together, the kick's click was lowpassed at 12 kHz; (3) the kick lost its drive (the intro's 500 Hz excess fell from +10.3 to +3.0 dB) with a 1 kHz peak recovering part of what that cost, the bass highpass became 4th order (break 40 Hz +14 → −1.9 dB) with nudges fitted so all four measured bass steps pass, the break hat's lowpass went to 7 kHz, the bursts gained a −3 dB shelf above 7 kHz.

## 6. What is still off, with an owner

From A9's fourth score (`log-A9.md` section 10), where the loop paused:

- The break's open hat is still too bright at 16 kHz (+11.2 dB; its lowpass at 7 kHz was not enough), and breakEnd's 16 kHz +8.8; mainA's 500 Hz +6.4 is unattributed. A7.
- The intro's bursts are 9 dB quiet at 1.25 to 1.6 kHz though they pass at 2.5 to 4 kHz: the burst's spectrum is flatter than the record's (tone and level, A7).
- The record's outro has a top-band source (8 to 16 kHz, −9.7 at 16 kHz in the render) the inventory never named. Open for E3 and E4.
- 25 Hz is 6 dB low in the build, mainA2 and mainB (the drone's level or its partials; A7).
- The end tail's RT60 by band, record against render: 500 Hz 5.5 against 2.9 s; 2 kHz 4.2 against 1.7 s; 8 kHz 1.2 against 2.3 s. The render's mids ring too short and its top too long: A8's reverb damping.
- The record's outro has a top-band source (8 to 16 kHz) the inventory never named; the recreation is 8 to 10 dB quiet there. Open for E3 and E4.
- The intro's side energy: the record is wide at 120 Hz to 1 kHz in the intro (burst reverb tails and the faint 408/472 Hz tones); the recreation is near mono there (S/M −32 dB). A texture item, not addressed.
- The break's 4 to 10 kHz is more mono than the record's (−11.8 against −5.0 dB S/M).
- The end tail's RT60 is frequency dependent in the record (4.6 s at 1 to 2.5 kHz, 5.1 s at 2.5 to 6 kHz); one damping lowpass cannot give that (A8).
- The saturator's gain is level dependent (+10 dB at −40 dBFS); V3 bypasses it; whether the record's master has saturation is unmeasured.

## 7. Limits of this research

- **No stems.** Demucs installed but its weights are blocked by the sandbox proxy, so every reference number is from the mixed signal. The recreation's side had exact stems (solo renders), the record's did not; where an element sits under another (the bass fundamental under the kick) the analysts said so and reasoned from harmonics.
- **No listening.** Every judgement is a measurement; the owner's ears are the test that has not been run on V3.
- **The reference is a 192 kbps MP3**: the side channel above 10 kHz and everything above 19.5 kHz are the encoder's, not the record's (E5).
- **Round-1 errors were caught by the cross-read**, not by the coordinator: E2's octave-blurred drone reading, E3's break hats, E4's constant lines, E1's swing figure, E5's separate dark element, A7's bed level. The method depends on that round.
- **The session limit** stopped all five analysts within minutes of starting and cost about three hours; they resumed from saved transcripts without loss.

## 8. What the method taught

- Having the original changes everything: the Gear Crew's spec, built from a description, had the sub as a pluck, the bass an octave and a fifth high, the chord a progression; one afternoon of measurement against the file found all three.
- A dispute list with named owners and "the measurement that decides it" closed nine disputes in one round; two of them (the drone's pitch, the stationary lines) turned on window length alone.
- Score every change, and keep nothing that moves a band away from the record. The loop's three passes each halved the largest delta because the scorer named the parameter, not just the band.
- A level computed against the wrong master is wrong by the master's gain: E3's hat gain, computed on a flattened kick, was 14 dB low. The ruling that one table (E5's, in dB re the kick body) is the authority for every level should have come before the build, not after the first score.

## 9. Decisions for the owner

1. Listen to V3 against the record; the Render Room artifact has both. Say what is wrong by ear; the scorer cannot hear texture, and the intro's width and the outro's top are the two places it already knows it is short.
2. Whether to pursue the remaining band deltas further with the engine as it is, or to accept V3 as the base for the remix DAW's "load, modify or create" rule and move to milestone 6.
3. Whether V3 replaces V2 as the song the app opens by default.
4. Stems: if you can run Demucs (or any separator) on the original elsewhere and provide the four stems, the per-element comparison becomes direct.

## 10. Files

`BRIEF.md`, `V3-SPEC.md`, `DISCUSSION.md`, `transcripts/E1-low-end.md` to `E5-mix.md`, `transcripts/log-A7.md`, `log-A8.md`, `log-A9.md`, `transcripts/log-coordinator.md`; the engine changes in `app/engine/synths.js`, `song.js` (`GUIDANCE_V3`, `Song.documentV3()`), `core.js`, `processors.js`; the tools in `tools/render.js` (`--song v3`, latency in the sidecar), `tools/score.py` (`--v3`, `--onsets`), `tools/README.md`. Renders are in `tools/out/` (ignored). The owner's MP3 is in the coordinator's scratchpad only.
