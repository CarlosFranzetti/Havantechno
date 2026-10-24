# E4: arrangement and samples (Ear Crew)

Analyst: E4 (Sonnet). Written 2026-10-24. Everything below is measured from the mixed reference (`reference.mp3`, scratchpad, never copied here); Demucs stems were not available (model download blocked), so no number comes from a separated stem. Nobody heard anything: "measured" is the only verb. Estimates are marked **(est.)**. No web searches were used.

Scripts and intermediates live in the scratchpad (`.../scratchpad/e4/`: `bars.py`, `third.py`, `grid.py`, `resid.py`, `offgrid.py`, `scores.py`). All times are on the reference grid: bar b starts at `0.568 + 1.9047619·b` s, 16th step = 119.05 ms, 126 BPM.

## 0. Method, so each number can be reproduced

- **Decode**: the scratchpad's `guidance.f32` (44.1 kHz stereo float, 17,108,660 samples = 387.951 s). Mono = (L+R)/2 unless said.
- **Per-bar bands (table 1)**: scipy STFT, 4096 Hann, hop 1024, power summed in six bands, averaged over frames whose centre lies in the bar. "dB re total" = band power / sum of the six bands. Hat onset counts: >6 kHz Butterworth-4 highpass, 256-sample RMS, rises >0.35 in log, 40 ms minimum spacing. **Counts are only meaningful where the 8 kHz level is above about −60 dB; below that they are noise-floor flux and are shown as "-".**
- **Per-bar 1/3-octave levels (every "step" in section 2)**: STFT 8192 Hann, hop 2048, 1/3-octave bands 31.5 Hz to 16 kHz, mean power per bar. Steps were read from the per-bar values, not from differences of 4-bar means (4-bar differences smear a step into a ramp; I checked bars 40, 104, 120, 136, 184 per bar).
- **16th-grid profiles**: STFT 2048 Hann, hop 441, band energy averaged inside each 16th step, median over the bars of a window. Used to find which steps a layer plays on.
- **Loudness**: ffmpeg `ebur128` momentary (400 ms) LUFS, energy-averaged per bar.
- **Non-repeating content (samples, vocals)**: three tests, section 4a.

## 1. Bar-by-bar map (table 1, per 4-bar phrase)

| bars | start s | total dB | 20-60 | 60-120 | 120-300 | 300-1k | 1-4k | 4-16k | 8 kHz 1/3-oct dB | hat onsets/bar | LUFS-M | note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0-3 | 0.6 | -12.4 | -7.0 | -2.5 | -6.4 | -23.6 | -31.5 | -52.4 | -80.7 | - | -10.6 | intro; kick+drone; event bar 3 |
| 4-7 | 8.2 | -12.4 | -7.0 | -2.5 | -6.4 | -24.0 | -31.9 | -51.3 | -79.1 | - | -10.5 | event bar 7 |
| 8-11 | 15.8 | -12.4 | -7.0 | -2.5 | -6.4 | -24.0 | -31.7 | -50.0 | -78.1 | - | -10.6 | event bar 11; HF starts to creep |
| 12-15 | 23.4 | -12.4 | -6.9 | -2.5 | -6.4 | -24.2 | -30.3 | -48.0 | -76.5 | - | -10.5 | event 15 |
| 16-19 | 31.0 | -12.4 | -6.9 | -2.5 | -6.3 | -23.7 | -28.4 | -43.2 | -71.5 | - | -10.5 | intro2 (app); event 19 |
| 20-23 | 38.7 | -12.4 | -6.9 | -2.5 | -6.4 | -22.0 | -28.1 | -37.3 | -64.4 | - | -10.5 | event 23 (largest) |
| 24-27 | 46.3 | -13.9 | -7.8 | -3.0 | -5.3 | -15.7 | -25.0 | -27.2 | -48.3 | 14 | -11.7 | BUILD: HF +12 dB step, kick sinking |
| 28-31 | 53.9 | -14.4 | -8.1 | -3.2 | -4.9 | -14.6 | -23.6 | -22.9 | -43.5 | 12 | -12.0 |  |
| 32-35 | 61.5 | -14.9 | -8.3 | -3.6 | -4.6 | -13.6 | -20.9 | -19.7 | -40.1 | 14 | -12.3 |  |
| 36-39 | 69.1 | -15.2 | -8.6 | -3.9 | -4.4 | -12.8 | -18.1 | -17.0 | -37.7 | 11 | -12.4 | kick lowest (-4.5 dB peak) |
| 40-43 | 76.8 | -12.5 | -6.9 | -2.8 | -6.5 | -16.2 | -20.2 | -18.5 | -36.7 | 11 | -10.3 | MAIN A: kick back, clap in, loudness +2.2 LU |
| 44-47 | 84.4 | -12.5 | -6.9 | -2.8 | -6.5 | -17.2 | -20.4 | -18.4 | -36.7 | 10 | -10.3 |  |
| 48-51 | 92.0 | -12.5 | -7.1 | -2.8 | -6.4 | -15.2 | -20.2 | -18.5 | -36.8 | 12 | -10.2 |  |
| 52-55 | 99.6 | -12.5 | -7.0 | -2.8 | -6.6 | -14.5 | -20.2 | -18.5 | -36.7 | 10 | -10.2 |  |
| 56-59 | 107.2 | -12.6 | -7.0 | -2.9 | -6.5 | -14.7 | -19.7 | -17.5 | -35.6 | 15 | -10.2 | on-beat HF layer enters (bar 56) |
| 60-63 | 114.9 | -12.6 | -7.0 | -2.9 | -6.5 | -14.3 | -19.9 | -17.4 | -35.5 | 13 | -10.2 |  |
| 64-67 | 122.5 | -12.6 | -7.0 | -2.9 | -6.5 | -15.0 | -19.7 | -17.5 | -35.5 | 15 | -10.2 |  |
| 68-71 | 130.1 | -12.6 | -7.0 | -2.9 | -6.4 | -14.7 | -19.8 | -17.5 | -35.6 | 13 | -10.2 |  |
| 72-75 | 137.7 | -12.6 | -6.9 | -2.9 | -6.6 | -14.9 | -19.8 | -17.5 | -35.6 | 15 | -10.3 | (no step at 72) |
| 76-79 | 145.3 | -12.6 | -6.9 | -2.9 | -6.5 | -14.3 | -20.1 | -17.5 | -35.6 | 13 | -10.2 |  |
| 80-83 | 152.9 | -12.6 | -7.0 | -3.0 | -6.4 | -13.5 | -19.9 | -17.6 | -35.6 | 14 | -10.2 |  |
| 84-87 | 160.6 | -12.6 | -7.0 | -2.9 | -6.6 | -13.6 | -19.9 | -17.6 | -35.6 | 14 | -10.2 |  |
| 88-91 | 168.2 | -12.7 | -7.0 | -2.9 | -6.4 | -15.0 | -19.9 | -18.4 | -36.4 | 14 | -10.3 | offbeat HF and drone start fading |
| 92-95 | 175.8 | -12.8 | -7.2 | -2.9 | -6.5 | -13.1 | -20.3 | -20.5 | -38.7 | 13 | -10.4 | drone fade (31 Hz) |
| 96-99 | 183.4 | -12.8 | -7.3 | -2.8 | -6.3 | -13.7 | -20.5 | -22.0 | -39.9 | 14 | -10.5 |  |
| 100-103 | 191.0 | -12.9 | -7.4 | -2.7 | -6.3 | -13.9 | -20.7 | -22.8 | -40.6 | 11 | -10.6 | drone -15 dB |
| 104-107 | 198.7 | -16.1 | -11.6 | -4.0 | -3.8 | -10.5 | -17.0 | -20.6 | -41.0 | 14 | -12.9 | BREAK: kick -6.5 dB at 50 Hz, drone gone, clap out |
| 108-111 | 206.3 | -15.9 | -11.7 | -4.0 | -3.9 | -10.0 | -17.5 | -20.7 | -41.1 | 16 | -12.7 |  |
| 112-115 | 213.9 | -15.7 | -11.9 | -4.2 | -3.9 | -9.1 | -18.0 | -20.6 | -41.0 | 18 | -12.5 |  |
| 116-119 | 221.5 | -15.7 | -12.0 | -4.2 | -4.0 | -8.5 | -18.0 | -20.4 | -40.7 | 16 | -12.4 | 1 kHz +4 dB |
| 120-123 | 229.1 | -15.7 | -12.1 | -4.2 | -4.0 | -8.6 | -16.9 | -26.7 | -49.1 | 10 | -12.4 | hats out (4-16k -8 dB), 1.3 kHz +6 |
| 124-127 | 236.8 | -15.7 | -12.0 | -4.2 | -3.9 | -9.3 | -14.6 | -26.4 | -50.1 | 4 | -12.4 |  |
| 128-131 | 244.4 | -15.6 | -11.8 | -4.3 | -4.0 | -9.3 | -13.8 | -25.1 | -48.2 | 7 | -12.3 | hats back, crescendo; drone fades in 129-134 |
| 132-135 | 252.0 | -15.4 | -10.0 | -4.4 | -4.2 | -10.0 | -13.8 | -19.9 | -41.5 | 7 | -12.1 | bar 135 beat 4 gap |
| 136-139 | 259.6 | -12.4 | -7.3 | -3.1 | -6.4 | -11.9 | -19.0 | -18.6 | -36.7 | 11 | -9.9 | MAIN B: kick, drone back, loudness +2.2 LU |
| 140-143 | 267.2 | -12.3 | -7.3 | -3.2 | -6.5 | -10.8 | -20.1 | -18.7 | -36.7 | 11 | -9.8 |  |
| 144-147 | 274.9 | -12.3 | -7.2 | -3.1 | -6.4 | -11.7 | -19.9 | -18.7 | -36.7 | 12 | -9.9 |  |
| 148-151 | 282.5 | -12.4 | -7.2 | -3.1 | -6.4 | -12.1 | -19.9 | -18.6 | -36.6 | 10 | -9.9 |  |
| 152-155 | 290.1 | -12.5 | -7.2 | -3.2 | -6.4 | -11.6 | -19.5 | -17.7 | -35.6 | 14 | -9.9 | on-beat HF layer enters (bar 152) |
| 156-159 | 297.7 | -12.4 | -7.3 | -3.1 | -6.5 | -11.3 | -19.4 | -17.7 | -35.5 | 13 | -9.9 |  |
| 160-163 | 305.3 | -12.4 | -7.3 | -3.2 | -6.4 | -11.1 | -19.0 | -17.8 | -35.5 | 14 | -9.9 |  |
| 164-167 | 312.9 | -12.4 | -7.2 | -3.2 | -6.4 | -11.3 | -18.9 | -17.9 | -35.8 | 13 | -9.9 |  |
| 168-171 | 320.6 | -12.4 | -7.2 | -3.1 | -6.4 | -11.7 | -19.7 | -18.0 | -35.9 | 14 | -9.9 | 1.27 kHz element leaves (168) |
| 172-175 | 328.2 | -12.4 | -7.2 | -3.1 | -6.4 | -12.0 | -20.1 | -18.2 | -36.0 | 13 | -9.9 |  |
| 176-179 | 335.8 | -12.5 | -7.1 | -3.0 | -6.3 | -12.8 | -19.9 | -18.2 | -36.2 | 13 | -10.1 |  |
| 180-183 | 343.4 | -12.5 | -7.1 | -3.0 | -6.4 | -13.1 | -19.8 | -18.2 | -36.1 | 11 | -10.1 | event 183 |
| 184-187 | 351.0 | -12.5 | -7.0 | -2.8 | -6.4 | -13.9 | -23.8 | -30.6 | -51.0 | 8 | -10.4 | OUTRO: hats out, >3 kHz -10 dB |
| 188-191 | 358.7 | -12.6 | -7.0 | -2.8 | -6.4 | -14.0 | -24.5 | -30.7 | -51.3 | 7 | -10.4 | event 187 |
| 192-195 | 366.3 | -12.5 | -7.0 | -2.8 | -6.4 | -14.2 | -24.6 | -31.0 | -51.7 | 7 | -10.4 | event 191 |
| 196-199 | 373.9 | -12.5 | -6.9 | -2.7 | -6.4 | -15.5 | -24.3 | -31.0 | -51.6 | 6 | -10.5 | event 195, 199; last kick bar 199 beat 4 |

Table 1 notes: `total dB` is the mean mono STFT power in 20 Hz to 16 kHz (relative scale only, E5 owns absolute levels). The 20-60 Hz column loses 4.3 dB at bar 104 and gains it back over bars 129 to 134 (the drone, below). 300-1k and 1-4k carry the 4-bar phrase structure (accent bars 3 and 4 of each phrase, E2's finding). LUFS-M is ffmpeg's momentary loudness, energy-mean per phrase.

## 2. Boundaries found, with the quantity that moves (per-bar 1/3-octave levels, section 0)

Reference time = `0.568 + 1.9047619·bar`. "Step" means the change is complete within one bar line.

| Bar | Time s | What moves (measured) | App section table |
|---|---|---|---|
| 3, 7, 11, 15, 19, 23 | 7.711, 15.330, 22.949, 30.568, 38.187, 45.806 (step 12 of those bars) | phrase-end hit: +31 dB in 1-6 kHz in under 10 ms at beat 4, 500-700 Hz +20 to +38 dB over the bar's median, 2.5-6 kHz back to its floor in about 0.7 s, 1-2.5 kHz in about 0.8 s; clap-like spectrum, section 4 | none (intro has only kick, sub, bass) |
| 8 to 23 | 15.8 to 46.3 | 8 kHz and 12.8 kHz levels climb about +1 dB per bar from −81 to −62 (8 kHz); 4 kHz from −66 to −48; E3 reads this as the off-beat hat fading in | intro2 at 16 (hat_closed A, 2 hits per bar) |
| **24** | 46.282 | 8 kHz +11.5 dB, 12.8 kHz +12.9, 5 kHz +7 in one bar; 400 to 800 Hz +5 to +10 dB (chord layer enters, with strong accents in bars 26-27, 30-31, 34-35, 38-39); 50 Hz −3 dB; loudness −10.5 to −11.7 LU | build at 24: matches |
| 24 to 39 | 46.3 to 76.2 | HF keeps climbing +0.9 dB per bar (8 kHz −50.5 to −37.0); kick body falls: 40-120 Hz peak −1.5 dB (bar 24) to −4.5 dB (bar 38-39), 50 Hz band −7.6 dB, 63 Hz −6.4 dB; 32 and 40 Hz (drone) constant −31 dB; loudness −11.7 to −12.4 LU | build: app instead ramps `master.hp.cutoff` 24 to 180 Hz over bars 32 to 40 (see section 3) |
| **40** | 76.758 | kick +7.6 dB at 50 Hz, +6.4 at 63, +4.4 at 79 (back to full level, step); total +2.7 dB; loudness −12.4 to −10.3 LU; clap enters (2.5-6 kHz at steps 4 and 12 +6 dB); 1.27 kHz −4 dB | mainA at 40: matches. App fires an `impact` here: nothing measurable (32-40 Hz constant, no broadband one-shot) |
| **56** | 107.235 | a new HF layer on steps 0 and 8 (6-16 kHz at those steps −20 dB to −8 dB re the off-beat hat, step) | none (mainA runs to 72) |
| 72 | 137.711 | no step in any band or in the 16th profiles (identical to 56-71 within 1 dB) | mainA2 at 72: no measurable boundary |
| 88 to 103 | 168.2 to 198.6 | E2: mid bass fades in (517 Hz level −41 to −29 dB); 8 kHz −36 to −41; the off-beat HF hit −8 dB (6-16 kHz at step 2: 31 to 23 dB abs); the on-beat layer relatively louder; 1.27 kHz +4 dB | mainA2 has no fades |
| 93 to 104 | 177.7 to 198.7 | drone: 31 Hz band −32 dB (bar 93) to −47 dB (bar 104), 40 Hz −32 to −46, about −1.4 dB per bar | none (app's sub plays A pattern throughout the break) |
| **104** | 198.663 | step: 50 Hz −7.7, 63 Hz −6.4, 79 Hz −5.0 dB (kick body −4.4 dB peak, constant); drone at its floor; total −3.1 dB; loudness −10.6 to −12.9 LU; clap leaves; HF pattern changes (steps 3, 4, 7, 12, 15 empty) | break at 104: matches |
| 116 to 120 | 221.5 to 229.1 | 1.0 kHz +1.2 dB per bar (−38 at bar 115, −32 at bar 120), E2's territory | none |
| **120** | 229.139 | step: 4 kHz −7.1, 5 kHz −5.2, 6.4 kHz −8.1, 8 kHz −8.4, 12.8 kHz −11.6 dB; every HF transient stops (16th profile of 6-16 kHz becomes flat, within 1 dB across the 16 steps); 1.0 kHz +2 | app V2: `breakLate` at 120 with `master.lp.cutoff` 6000 |
| 122 to 125 | 233 to 238 | 1.27 kHz +6.5 dB (−40 to −33), 1.6 kHz +3 | none |
| **128** | 244.378 | 2 kHz +7 dB in one bar, then 2-8 kHz climb: 2 kHz −47 to −35, 4 kHz −50 to −41, 8 kHz −50 to −39 (bars 128 to 135); HF transients return (hats, 16th pattern in the profile) | breakEnd at 128: matches |
| 129 to 134 | 246.3 to 255.8 | drone back: 31 Hz −46.5 (bar 129) to −30.0 (bar 134); 40 Hz −45.2 to −30.2 | V2 spec says fade 129 to 135, app default has none |
| **135, beat 4** | 259.139 | kick absent (40-120 Hz peak −18.8 dB against −4.5 at beats 1 to 3), hats absent (6-16 kHz at steps 12-15 −17 dB), 1-2.5 kHz and 300-1k keep going: a one-beat gap before the drop | none |
| **136** | 259.616 | kick +7.8 dB at 50 Hz (full level), total +3.2 dB, loudness −12.1 to −9.9 LU, clap returns; 2 kHz −2, 1.6 kHz −3 | mainB at 136: matches |
| **152** | 290.092 | the on-beat HF layer (steps 0 and 8) enters again (6-16 kHz at step 0 from −20 to −8 dB re hat) 16 bars after the drop, as at 56 | none |
| 155 to 168 | 296 to 320 | 1.27 kHz +4 to +5 dB (−43 to −37), 1.0 kHz −4: E2's | none |
| 183 | 349.139 | phrase-end hit (1.0 kHz +6 dB, 500-700 Hz +7 dB) | app: `riser` bars 180 to 184: not in the reference (8 kHz flat at −36 to bar 183) |
| **184** | 351.044 | step: 4 kHz −9.1, 5 kHz −9.5, 6.4 kHz −13.8, 8 kHz −14.9, 12.8 kHz −13.5; 1.6 to 3.2 kHz −4.7 dB; off-beat and on-beat hat hits gone; loudness −10.1 to −10.4 LU, then constant to bar 199 (no fade); no further change to 199 | outro at 184: matches the bar; app closes `master.lp.cutoff` 20000 to 1200 gradually over bars 192-200 |
| 187, 191, 195, 199 | 358.187, 365.806, 373.425, 381.044 | phrase-end hits again, same step 12 position as in the intro; the one at 199 is the last kick of the track | none |
| 199 beat 4 | 381.044 | last kick (40-120 Hz peak −1.0 dB at beat 4; −23 dB at the next bar line) and the last hit | outro ends at bar 200 with the tail cut at 2.5 s |
| 200 | 381.520 | content after the grid's bar 200: a 6.43 s reverb tail, section 5 | |

So the app's section table is right at bars 24, 40, 104, 128, 136, 184 and the Gear Crew's 120 holds, but it is wrong or incomplete at: nothing at 72 (no change), a missing boundary at 56 and 152 (on-beat HF layer), the drone fade (93 to 104 out, 129 to 134 in), the kick level ramp inside the build, the gap at 135 beat 4, and the phrase-end hit that the app does not have anywhere.

## 3. Section by section: what plays, what the master does, and the recreation's equivalent

Names follow the E1/E2/E3 groups. "Drone" = E1's sub drone (34.47 Hz, C#1). Where I lean on another analyst's finding I name it; I did not isolate these elements myself (no stems), and "plays" means a measured band or pattern change at that bar, not a transcription.

| Section (ref bars) | Elements playing (measured) | Master and loudness | Recreation (GUIDANCE_V2) and delta |
|---|---|---|---|
| intro 0-23 | kick four-on-floor (peak 0 to −0.6 dBFS); drone (31 Hz = B0 in some bars, below); near-silent off-beat hat creeping up from bar 8 (E3); phrase-end hit at 3, 7, 11, 15, 19, 23; kick-synchronous 300-1k pumping (16th profile peaks at steps 3, 4, 7, 8, 11, 12, 15, 0). No mid bass (E2: it enters at 88). | LUFS-M −10.55 every phrase (flat to 0.1 LU); 20-60 and 60-120 Hz at −7.0 and −2.5 dB re total | App intro: kick, sub A, `bass` A, `stab.cutoff` 500. App render minus reference, section-relative band power: 504 Hz +9.4, 1 kHz +13.8, 2 kHz +9.7, 4 kHz +15.5, 8 kHz +24.0, 32 Hz −6.5 dB. Deltas: the app has a bass in the intro that the reference lacks (E2), no phrase-end hit, a hat level 24 dB too high at 8 kHz, and a drone 6.5 dB too weak |
| build 24-39 | kick (falling 4.5 dB), drone constant, chord layer from bar 24 with 4-bar accents, hat rising to 8 kHz −37 dB; no clap (2.5-6 kHz at steps 4 and 12 the same as at the other steps within 1 dB) | LUFS-M −11.7 to −12.4 (−1.9 LU over the build); 50 Hz and 63 Hz −7 dB, 126 Hz −2 dB, drone unchanged | App build: stab B, `hat_open` A, `hat_closed` B, **clap A**, riser at bars 36 to 40, **`master.hp.cutoff` 24 to 180 Hz over 32 to 40**. Deltas: the clap should not play here; the master highpass at 180 Hz would remove the drone (31 and 40 Hz stay at −31 dB in the reference) and does not match the kick-only loss; the riser and its noise have no counterpart (8 kHz rises smoothly 0.9 dB per bar, no sweep) |
| mainA 40-71 | kick full level, drone, clap (4, 12), off-beat hat (2, 6, 10, 14), from 56 a second HF layer on steps 0 and 8, chord layer with accents at bars 3 and 4 of each phrase (E2), no mid bass | LUFS-M −10.2 to −10.3, total up 2.7 dB at bar 40 | App mainA: bass A, stab A, clap, `hat_open` A (steps 2, 6, 10, 14: correct), `hat_closed` A (steps 7, 15: E3 says no counterpart), impact at bar 0 (no counterpart). Deltas: 1 kHz +10.9, 2 kHz +9.9, 8 kHz −4.9 dB (section-relative): app hats are 5 dB too quiet relative to the mix, mids 10 dB too loud; bass present where E2 finds none; missing: on-beat HF layer at 56 |
| mainA2 72-103 | as mainA; mid bass fades in 88-103 (E2); off-beat HF −8 dB over 88-103; drone fades out 93-104 | LUFS-M −10.2, falling to −10.6 at bars 100-103 (E5's loudness) | App mainA2: bass B, `hat_closed` C, lead B, riser at 100-104. Deltas: no fades in the app, riser has no counterpart; mid bass level wrong in both directions |
| break 104-119 | kick at −4.4 dB peak (50 Hz −7.7 dB), drone gone (−47 dB), no clap, HF pattern with hits on steps 0, 1, 2, 5, 6, 8, 9, 10, 11, 13, 14 only, mid bass continuing (E2), 1 kHz rising from 116 | LUFS-M −12.9 falling to −12.4 over the break (−2.3 LU against mainA2); 20-60 Hz −11.1 dB re total | App V2 break: kick.level 0.6 (−4.4 dB, close), clap.level 0.6 (**the reference has no clap**), sub A keeps playing (drone should be gone: app 32 Hz +5.9 dB too loud in the break), `perc`, `shaker`, pad, lead A. App render is 3.3 dB louder in total |
| breakLate 120-127 | hats gone, stationary tonal lines only (see section 4), 1.27 kHz +6.5 dB from 122, no clap | LUFS-M −12.4; no lowpass: 1 to 3 kHz unchanged, 4-8 kHz −8 dB because the hats left | App V2: LP 6000 Hz at 120. Delta: the reference removes the hat, not the top end: 12.8 kHz is **higher** by 3 dB than before bar 120 (−48.4 against −51.4, bars 124-127 against 112-115), so a lowpass is the wrong tool. Mute hats instead |
| breakEnd 128-135 | hats return and crescendo (8 kHz −50 to −39), 2 kHz +7 dB, drone fades in 129-134, no clap, kick at −4.4 dB until bar 135 beat 3, gap at 135 beat 4 | LUFS-M −12.3 to −12.1 | App: hat D pattern, clap R roll (not in the reference: no clap at steps 4/12, and no 16th roll in 2.5-6 kHz), riser 8 bars, `master.hp.cutoff` 24 to 500 Hz. Deltas: the master highpass ramp would remove the drone and kick body that in the reference rise (50-63 Hz constant, 31 Hz +17 dB); the 8-bar noise riser has no counterpart; missing the gap |
| mainB 136-183 | as mainA (hat and clap identical to 0.5 dB, E3); on-beat HF layer from 152; 1.27 kHz element 155-167; mid bass present (E2) | LUFS-M −9.9 constant, drifting to −10.1 by bar 183 | App mainB: bass B, stab A, lead B, impact at 136, riser at 180-184. Deltas as mainA plus the riser and impact (no counterpart) |
| outro 184-199 | kick, drone, clap (steps 4 and 12), mid bass, chord layer; hats gone; phrase-end hits at 187, 191, 195, 199; last kick at 381.044 | step at 184: 4 kHz and above −9 to −15 dB, 1.6-3.2 kHz −4.7 dB, then constant for 16 bars; LUFS-M −10.4 flat, no fade | App outro: kick, sub, bass A, clap, stab C, `stab.cutoff` 1500 to 300 and `master.lp.cutoff` 20000 to 1200 over bars 192-200. Deltas: the reference closes nothing gradually; one step at 184 and constant to the end; the app's lowpass (1.2 kHz at the end) would take 10 to 20 dB more off 2-8 kHz than the reference ever shows |

App-minus-reference numbers above come from the baseline `GUIDANCE` full render (`tools/out/app-bars-0-200.wav`, sidecar says song "baseline", grid start 2205 samples): the same per-bar 1/3-octave method as the reference, band power relative to the section's own total, then app minus reference. The V2 song was not re-rendered here; its arrangement edits (break split, LP 6000) are discussed from the source.

## 4. Samples, vocals and one-shots

### 4a. Vocal, spoken word: none found (three independent tests, none positive)

1. **Non-repeating content** (REPET-style residual): the mixed reference reduced to 168 frames per bar (STFT 2048, hop 500, which divides the 84,000-sample bar exactly), then for each bar the median over the four nearest bars at ±8, ±16 (±32) bars is subtracted; the energy left over in 250-4000 Hz is divided by the bar's own energy. Median over bars 0.145; the largest values (0.28 to 0.41) are all in the build (bars 26 to 39), where a stab filter opens bar by bar, plus 0.26 to 0.32 at bars 48, 49, 53, 61, 85, 92, 123, 129, 131, 133, 140 and 192, which sit at known phrase positions (peak frames at steps 1 to 3 or step 11). No isolated bar sits far above its neighbours; a spoken word or a vocal phrase would show as a one-bar outlier in a stable section (mainA bars 40-100 are all below 0.32).
2. **Grid-phase of onsets**: spectral-flux onsets (STFT 1024, hop 128) in 150-1k, 1-4k and 4-16k Hz; of the 25 strongest off-grid onsets (more than 25 ms from a 16th) in each band, all but two (−40 and −50 ms, both in 150-1k) are at +25 to +57 ms, so they are the slow attack of a pad or lead swell and E3's swing estimate (odd 16ths +20 to +30 ms), not a free-time event. There is no onset population at random phase, which a syllable stream would produce.
3. **Looking at it**: spectrograms (ffmpeg `showspectrumpic`, linear 200-4500 Hz) of break bars 120-136 and of the build/intro: no curved harmonic tracks, no formant bands moving in time; mid-band activity is blocks of bar length with constant partials (E2's tonal lines at 309.5, 370, 416, 466, 555, 622 Hz).

What would have found one: formant bands at about 500, 1500, 2500 Hz moving over 100 to 300 ms with a harmonic series gliding by more than a semitone, off the 16th grid. The three tests above are the proxies available without stems; the Demucs `vocals` stem would be the direct test (non-silent only if a vocal exists). Verdict: no vocal, no spoken word. Confidence: medium-high for a lead vocal in the open sections, medium for a quiet vocal chop buried under hats in bars 24 to 103.

### 4b. Crash, reverse cymbal, riser, impact: none found

- **Crash / impact at section starts**: at bars 24, 40, 104, 136 the 32-40 Hz and the 4-16 kHz levels are continuous across the bar line except for the steps listed in section 2 (a crash would add a decaying 5-12 kHz burst at the bar line; 8 kHz at bar 40 is −36.6 dB against −37.0 in bar 39; at bar 136, −36.6 against −39.3 in bar 135 as part of the 128-135 hat crescendo). No sub boom either (32 Hz −31 dB constant at 40; the 136 change is the drone's own fade-in). The app's `impact` at bars 40 and 136 has no counterpart.
- **Reverse cymbal / riser before boundaries**: the two bars before 24, 40, 104, 120, 136, 184 show smooth slopes (1 dB per bar or flat), not an accelerating HF swell; the "riser" candidates (the app's fx at bars 12, 28, 44 of their sections) show nothing at the corresponding reference bars (bars 36-39: HF +0.9 dB per bar; bars 100-103: HF falling; bars 180-183: flat).
- The faint "4-bar noise sweeps" the coordinator saw in the intro are the phrase-end hits of 4c: onset within 10 ms of step 12 (instant rise, 31 dB in under 10 ms), then decay. They do not sweep.

### 4c. The phrase-end hit (intro bars 3, 7, 11, 15, 19, 23; outro bars 187, 191, 195, 199): one-shot, but generated, not a sample

Where: step 12 (beat 4) of bar 3 + 4n in the intro and of bar 187 + 4n in the outro: 7.711, 15.330, 22.949, 30.568, 38.187, 45.806 s and 358.187, 365.806, 373.425, 381.044 s (ten occurrences; 183 is a weaker one at 349.139 s).
Detection (reproducible): ratio of band energy in steps 13 to 15.9 against the median of steps 0 to 11 of the same bar, STFT 2048 hop 500; 2.5-6 kHz +20.3, +20.3, +15.5 dB at bars 3, 7, 11 and +19.6, +20.8, +18.7 at bars 191, 195, 199; 500-700 Hz +28.9, +26.2, +23.3 at 3, 7, 11 and +38.1 at 23; ordinary bars give +6 to +12 (the normal clap tail).
Envelope (2.5-6 kHz, 10 ms RMS): at +2 ms after step 12 the peak; −43 dBFS at 0 ms, −46 at +100 and +200 ms, −49 at +300, −52 at +400, −55 at +500, −62 at +600, −63 at +700 ms (floor), i.e. about −30 dB per second over the first 0.6 s (bar 3). 500-700 Hz holds −33 to −34 for 300 ms then −40 to −45.
Spectrum of the first 60 ms (half-octave bands from 1 kHz, dB re the band maximum): intro bar 3 `0, −3, −12, −17, −25, −32, −35` (1.0, 1.4, 2.0, 2.8, 4.0, 5.7, 8.0 kHz); bars 7, 11, 15, 19 similar (−6 to −12 at 2 kHz, −18 to −21 at 4 kHz); outro bars 187-199 `−3, 0, −2, −2, −5, −6, −9` which is the spectrum of the normal clap (mainA clap at step 4: `0, 0, 0, 0, −2, −4, −5`). So in the outro it is the clap with a long reverb tail; in the intro it is the same noise burst with the top rolled off (−12 dB at 2 kHz, −25 at 4 kHz, I estimate a lowpass near 1.5 kHz).
Stereo (0.01 to 0.5 s after the hit, band-passed): L/R correlation 0.08 to 0.15 in 1-6 kHz and 0.08 to 0.38 in 500-700 Hz, side/mid −0.7 to −3.9 dB: wide. Tonal lines of the reverb around 313, 413, 560, 626 Hz (from the end tail, 4e; not isolated from the kick here).
Sample test: waveform similarity of the 1 s windows (300-8000 Hz) of bar 3 against bars 7, 11, 15, 19, 23: normalised cross-correlation 0.49, 0.52, 0.55, 0.46, 0.36 (best lag ±2000 samples, better of L and R); the control (the same step in random mainA bars) gives 0.14 to 0.27. The excess is the shared tonal reverb and kick, not an identical waveform, and E3 independently finds NCC 0.11 to 0.25 for the burst's noise at bars 4n+3 while the same window without a burst correlates 0.81 to 0.93 with itself. So: a generated noise hit (a clap) through a long reverb, not a repeated sample. **Recommendation: no sampler slice; add the phrase-end hit as a pattern event** (clap at step 12 with `reverb` send raised for about 0.8 s and a 1.5 kHz lowpass in the intro), coordinated with E3 who owns the clap's synthesis.
If the owner insists on slicing it anyway (est. start and end, kick in the mix is not removable from a mixed file): start 7.706 s, end 8.60 s (+0.9 s; est.: the 2.5-6 kHz band is at its −63 dBFS floor by +0.7 s and the 1-2.5 kHz band by +0.8 s), pitch 1.00. No clean gain figure: the mixed file's kicks and drone sit under the hit (high-passed at 250 Hz its 1.4 s window still peaks at −2 to −4 dBFS from the next kick's harmonics), so a slice would need a 300 Hz highpass and a level set by ear against the clap.

### 4d. The pre-roll (the track starts inside a sound): a sample candidate, 0.094 to 0.565 s

- The decoded file is digital silence (−99 dBFS) until 0.092 s, rises −91 to −41 dBFS in 6 ms (0.092 to 0.098), then holds −22 to −34 dBFS (10 ms RMS) until the first kick at 0.5665 s (first RMS sample above −25 dBFS at 0.566, kick body −7 dBFS at 0.568). So **there is a 472 ms sound before the first kick that starts abruptly, the shape of an excerpt that was cut into**.
- Level: sample peak −10.0 dBFS, RMS −23.1 dBFS over 0.090 to 0.558 s (the intro's kick peak is −0.6 dBFS: the pre-roll is 9.4 dB under it; its RMS is 10.6 dB under the intro's RMS of −12.5).
- Spectrum (Hann FFT 65536 of 0.088-0.56 s): band energy relative to its total: 20-60 −59 dB, 60-120 −45, 120-300 −27, **300-1000 −1.0, 1000-4000 −6.9**, 4-8k −35, 8-16k −43. Centroid 650 to 920 Hz per 40 ms slice. Lines at 310.2, 369.4, 415.9, 466.3, 498.6, 558.5, 628.5 (strongest, 0 dB), 695.8, 741.5, 922.6 Hz. Stereo: L/R correlation 0.07, side/mid −0.6 dB: essentially decorrelated (a reverb-like or stereo-noise texture, not a mono synth note).
- Does it repeat? No other place in the file has an abrupt −91 to −41 dB onset. Its spectrum shares the line positions near 310 to 313 and 413 to 416 Hz with the end tail (4e), but the cosine similarity of the two 39-band log spectra is 0.05, so I cannot say it is the same sound.
- **Proposed sampler slice** (owner's decision; the reference stays out of the repo): `start 0.094 s, end 0.560 s` (est.: 5 ms before the kick's rise at 0.566 s), pitch 1.00 (no retune; the line at 628.5 Hz is about D#5 +17 cents (est.), if a retune to a key is wanted), gain 0 dB relative to the file (peak −10 dBFS), placed so that the slice ends at bar 0's downbeat (it plays once, before the first kick). A synth alternative: decorrelated noise, 300 to 1500 Hz bandpass, 470 ms, level −23 dBFS RMS: much cheaper and inaudible as different if it is a pre-roll.

### 4e. The end tail 381.52 to 387.95 s: a reverb tail, not a sample

Last kick and last hit at 381.044 s (bar 199 beat 4). After the grid's bar 200 (381.52 s) the file carries 6.43 s of decay: 10 ms-RMS broadband −18.9 dBFS at 381.5, −25 at 381.75, −28 at 382.25, −35 at 382.5, −39 at 383.0, −48 at 384.0, −56 at 385.0, −66 at 386.0, −74 at 386.5, below −90 dBFS after 387.64 s; the file ends at 387.951 s.
Band decay (Butterworth-4, 50 ms RMS, linear fit over 382 to 386 s): 313 Hz band −9.2 dB/s (RT60 6.5 s), 413 Hz −10.9 (5.5 s), 200-250 Hz −8.7 (6.9 s), 1-2.5 kHz −13.0 (4.6 s), 2.5-6 kHz −11.9 (5.1 s). So the highs die first and the 313 Hz line outlasts everything (−67 dBFS at 386.0 s). L/R correlation −0.02 (381.6-382.4: +0.04): a stereo reverb.
Spectral lines in the tail (FFT 131072 of 381.6 to 382.4 s): 77.4, 153.8, 233.5, 312.6 (0 dB), 414.2, 555.5, 626.1 Hz: the 77.4/153.8/233.5/312.6 set is a harmonic series of 77.9 Hz (D#2) (the 4th, 3rd, 2nd harmonic of 77.9 are 311.6, 233.7, 155.8; match within 2 Hz), together with 413 to 414 and 555 to 626 Hz. It is the ring of the last clap/kick/chord hit through the master's reverb, plus the sustained tonal layer E2 identified (310, 370, 416, 466, 555, 622 Hz) decaying with it.
Reproduction: either let the song's reverb ring out (the app cuts at 2.5 s; the reference needs RT60 of about 6 s on the send, size to feed 6.4 s of tail) or a sampler slice `start 381.30 s, end 387.95 s` (est.: 250 ms after the last kick, when its body is at −34 dB re peak), pitch 1.00, linear gain, 6.65 s, stereo. The synthesis route is better: the tail follows from the last hit and costs nothing.

## 5. How the track starts and ends

**Start**: file starts with 92 ms of digital silence (the encoder or decoder delay, I do not know which), then the 472 ms pre-roll sound (4d), then the first kick at 0.5665 s (grid 0.568) at full level, with the drone already running (31/34 Hz band at its steady value from the first full bar: 34.32 Hz in bar 0). There is no fade-in, no riser into the first kick, no count-in. The intro keeps constant LUFS-M (−10.55 for 24 bars); the only build is the HF creep (+1 dB per bar from bar 8) and the six phrase-end hits.
**Intro tails**: the six hits at bars 3 to 23 are about 0.7 to 0.8 s long (2.5-6 kHz to its floor) and overlap into the next bar, which is why a tail shows in the 300-1k band at the first beat of bars 4, 8, 12, 16, 20, 24 (0.2 to 0.5 s of overlap; the hit is at 1.43 s of a 1.905 s bar).
**End**: no fade. Loudness LUFS-M −10.4 to −10.5 through bar 199, then the last kick and phrase-end hit at 381.044 s, then the 6.43 s reverb tail (4e). A hard stop of the pattern with the master reverb ringing out; the app's `tailSeconds: 2.5` and its gradual `master.lp.cutoff` and `stab.cutoff` ramps (1200 Hz and 300 Hz) have no equivalent in the reference.
**Drone note changes**: bar-wide FFT peak in 25-45 Hz (zero-padded 2^18, 0.17 Hz bins) is 34.3 to 34.6 Hz in most bars and 30.95 Hz (B0 = 30.87 Hz, within 0.1 Hz) in bars 3, 10, 20, 27, 44, 52, 59, 66, 76, 83, 90, 107, 124, 131, 136, 138, 143, 148, 155, 172, 179, 186, 191, 196 (24 of 200 bars; spacing 7 or 8 bars mostly, 10 and 17 after the fade gaps). Caveat: a whole-bar window cannot place the change inside the bar, and bars adjacent to a B0 bar often read 33.1 to 33.3 Hz (for example bars 5, 12, 29, 61, 68, 85, 92, 98, 103, 109, 114, 116, 119, 122: the drone crossing the bar line). It is E1's measurement to confirm; I list it because V2's TODO says the bar placement is unmeasured: this is a placement, with mean spacing 7.3 bars.

## 6. Proposed changes for song.js (GUIDANCE_V3), arrangement only

All edits are `sections` data; times in bars of the app's grid.

1. **Drone automation** (needs a track `level` set in a section, or a sub gate): sub level −15 dB linearly from bar 93 to 104, kept down through 128, back up linearly over 129 to 134, full at 136. The app has the `sub` in the kick's duck list already; the needed new thing is a per-bar level ramp (sections' `ramp` with `param: 'sub.level'`).
2. **Kick level ramp in the build**: `kick.level` 1.0 at bar 24 down to about 0.6 (−4.5 dB) at bar 39 (ramp), 1.0 at bar 40; the break at about 0.6 (−4.4 dB; app already has 0.6). Remove the build's `master.hp.cutoff` ramp (24 to 180) and breakEnd's (24 to 500): the reference's low end only moves with the kick and the drone.
3. **Clap**: play only in 40-103, 136-199 (reference has none in 0-39, 104-135). Remove `clap: 'A'` from build, break, and `clap: 'R'` from breakEnd. The V2 break's `clap.level` 0.6 becomes mute.
4. **Hats** (E3 owns the pattern): level ramp of the off-beat hat across 8 to 39, +40 dB in total (−81 to −37 dB at 8 kHz) with a +11 dB step at bar 24; a second, on-beat HF layer (steps 0 and 8) from bar 56 and from bar 152; off-beat hat −8 dB over bars 88 to 103; no hats at all in bars 120-127; crescendo 128-135 (+11 dB at 8 kHz); no hats from bar 184. In the break (104-119) a different pattern (steps 0, 1, 2, 5, 6, 8, 9, 10, 11, 13, 14 in 6-16 kHz).
5. **Replace the LP 6000 at bar 120 by muting the hats**. Keep the 2-3 kHz band (no lowpass at all: 1-3 kHz unchanged at 120).
6. **Outro**: no ramps; one step at 184 that mutes the hats and takes 4.7 dB off 1.6-3.2 kHz (stab cutoff or level); constant to the end; the pattern ends at bar 199 beat 4 with a clap on step 12 through a long reverb; reverb send decay to RT60 about 6 s, 6.5 s of tail rendered after bar 200 (`tailSeconds` 6.5).
7. **Phrase-end hit**: a clap-like event on step 12 of bars 3, 7, 11, 15, 19, 23 (intro, lowpassed near 1.5 kHz, big reverb send) and 187, 191, 195, 199 (outro, normal clap with raised reverb); 183 smaller.
8. **Gap at bar 135 beat 4**: mute kick and hats for steps 12-15 of bar 135.
9. **Remove**: `impact` at 40 and 136; `riser` fx at bars 12, 28, 44 and the breakEnd riser (no counterparts); the app's mid bass outside bars 88-199 (E2).
10. **No sampler slices recommended** except as owner's option: pre-roll 0.094-0.560 s (4d). Everything else I tested is generated.

## 7. Open points for the coordinator

- Is the 92 ms of digital silence plus 472 ms pre-roll part of the track as released, or a decoder/encoder artefact of the MP3 (the owner's file)? If artefact, bars 0's pre-roll slice is moot.
- The intro's phrase-end hit has the clap's noise spectrum but a 1.5 kHz lowpass: E3 and E5 should confirm whether the reverb is the master reverb send or a separate one (outro hits: reverb RT60 about 5 to 6.5 s).
- The break's hats pattern (steps 0, 1, 2, 5, 6, 8, 9, 10, 11, 13, 14, and the 27 ms attack lag in the 6-16 kHz flux at step 5) belongs to E3; the arrangement only fixes when it plays.
- Stationary tonal lines above 1.4 kHz (1.46, 1.92, 2.2, 2.5, 3.3 kHz and more, constant through the whole track, intact after the hats leave at 120) are visible in the spectrograms at every bar; they belong to E2/E3, but they are the only content in 6-16 kHz in bars 120-127 and they decide the "1.4-1.6 kHz rhythmic band" question.

## 8. Cross-read notes (E2 and E3 transcripts, read as they stood at 04:39 UTC)

- Agree with E3: the off-beat hat fades in linearly in dB (E3 +1 dB per bar over bars 0 to 23, mine +1 dB per bar at 8 and 12.8 kHz from bar 8), jumps at bar 24 (E3 +15 dB at 6-16 kHz, mine +11.5 to +12.9 dB), constant from 40, falls 6 dB over 90-103 (mine −8 dB at step 2 over 88-103); the burst at beat 4 of bars 4n+3 is generated noise (E3's NCC 0.11 to 0.25; mine 0.36 to 0.55 on a longer window that includes the shared reverb and kick).
- Agree with E2: mid bass from bar 88 (my 1.27 kHz +3 dB and the 4-16 kHz and drone changes over 88-104 line up with E2's 517 Hz level −41 to −29 dB). I cannot see the intro or mainA mid bass that the app has either: 300-1k there is kick-synchronous.
- Dispute with E3 (bars 120 to 127): E3 reads hats still at −42 dB (highs "down 16 dB"); I read the same −42 to −43 dB as a flat floor, because the 16th profile of 6-16 kHz is flat within 1 dB across all 16 steps at 120-127 (no step peaks) and the spectrogram shows only stationary horizontal lines after bar 120. Test to settle it: hit-aligned NCC of the 6-16 kHz waveform at steps 2, 6, 10, 14 for bars 120-127 against bar 119 (hat present) and against the stationary line floor.
- Open for E3: the app's `hat_closed` A at steps 7, 15 and the `C`, `D` patterns have no counterpart (E3 says so); my arrangement item 4 gives only entries, exits and level ramps, not patterns.
