# E3 transcript: drums above the kick (hats, clap, shaker, perc, sweeps)

Analyst E3 (Sonnet). Started 2026-10-24. Reference: scratchpad `ref/reference.mp3` and its 16-bar windows (never copied into the repo). Scripts and intermediate data live in the scratchpad folder `e3/` (not in the repo).
All numbers are measured unless marked (est.). Windows: ref-intro/mainA/break/mainB-16.wav, 1,344,000 samples each, 44.1 kHz, mono sum unless stated.

## Log

- Setup: no matplotlib in the sandbox, so no new spectrogram images; everything below is numeric (numpy/scipy). Demucs stems are not available (coordinator message), so all measures are on the mixed reference windows. Scripts `common.py`, `onset.py`, `grid.py` in scratchpad `e3/`.
- Window alignment (method: 150 Hz lowpass, Hilbert envelope, 30% of peak crossing at each beat): kick onset sits +11 to +13 ms after the window's bar grid in all four windows (std 6 to 23 ms because of the filtfilt smear). From the 6-16 kHz STFT flux (nfft 512, hop 64) the hat onsets peak 6 to 9 ms before the 16th grid line, i.e. the STFT window centre leads the onset by about 3 to 6 ms. I therefore use grid line minus 6 ms as the expected onset time (est., +-5 ms).
- First look (mainA, bars 3 and 4, 6-16 kHz flux): strong onsets at steps 2, 6, 10, 14 (level about -22 dB re band maximum, flux 45 to 68), at steps 4 and 12 (clap + kick, about -31 dB, flux 45 to 52), and weak ones at steps 0 and 8 (kick click, -37 dB, flux 21 to 25). Steps 1, 5, 9, 13 show only a tail. The offbeat hat decays about 13 dB in the first 100 ms and reaches -30 dB re its peak at about 330 ms (first rough read, refined below).

### Round 1 measurements so far (reference)

Method M-step: bandpass (4th-order Butterworth, zero-phase), power, 2 ms boxcar, dB; for each 16th of each of the 16 bars the maximum in [onset-2 ms, onset+20 ms] with onset = grid line minus 6.5 ms ("post"), and the rise over the median of [onset-40, onset-10 ms] ("jump"). Script `steptab.py`. Grid offset: even-step onsets in 6-16 kHz land at -6.5 ms re the grid line with std 0.6 to 0.8 ms over 16 bars, so the hats/claps are sample-accurate repeats (sequenced, no humanisation).

**mainA and mainB, 6-16 kHz, median over 16 bars (identical to 0.5 dB between mainA and mainB)**

| step | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| post dB (abs, band power) | -36 | -55 | -19 | -33 | -25 | -50 | -19 | -32 | -35 | -46 | -19 | -30 | -24 | -48 | -19 | -34 |
| jump dB | 6.5 | 0.7 | 31.7 | 1.4 | 18.3 | -3.5 | 33.5 | 3.0 | 7.9 | 11.2 | 33.9 | 4.9 | 18.1 | -1.6 | 33.0 | 0.5 |

- Hat: steps 2, 6, 10, 14 (every off-beat 8th), 31 to 34 dB jump, std 0.3 to 0.6 dB across bars. The same four steps in mainA and mainB; no hat on 0, 4, 8, 12 other than the kick click (-36 dB, 17 dB under the hat) and the clap.
- Clap: steps 4 and 12 (beats 2 and 4), -25/-24 dB in 6-16 kHz and about -20.4 dB in 2.5-6 kHz (louder than the hat in 1-6 kHz, 6 dB quieter above 6 kHz).
- A second, soft hat-like event follows each off-beat hat on the next 16th (steps 3, 7, 11, 15): the aligned median envelope (4 steps x 16 bars) falls to -19 dB re the hat peak at +100 ms and then rises to -13/-14 dB at +120 to +135 ms (about +5 dB bump), then decays again (-24 dB at +190 to +200 ms) until the clap or kick at +228 ms. Attack of this second event is slow (about 25 to 30 ms rise, onset-derivative std 11 to 17 ms), unlike the hat's (std 0.7 ms): a soft-attack sound, the shaker candidate. Its spectrum (below) is almost the same as the hat's tail.
- Steps 1, 5, 9, 13: nothing in 6-16 kHz (-46 to -55 dB, i.e. 27 to 36 dB under the hat; step 9 shows a small +11 dB jump at -46 dB, which in 1-2.5 kHz is +15.5 dB, so it is the stab or bass, E2's).
- No 16th-note closed hat on any step in mainA or mainB. The recreation's closed hat (steps 7, 15 in mainA) and its stack of `C` patterns have no counterpart.

**Hat spectrum, mainA, mean of 64 events (steps 2, 6, 10, 14; Welch nfft 2048), band energy dB abs** (edges 500 630 800 1000 1250 1600 2000 2500 3150 4000 5000 6300 8000 10000 12500 16000 20000):

| window | 500-630 | 630-800 | 800-1k | 1-1.25k | 1.25-1.6k | 1.6-2k | 2-2.5k | 2.5-3.15k | 3.15-4k | 4-5k | 5-6.3k | 6.3-8k | 8-10k | 10-12.5k | 12.5-16k | 16-20k |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hat 3-25 ms | -34 | -35 | -30 | -33 | -29 | -33 | -30 | -31 | -26 | -30 | -27 | -23 | -26 | -25 | -30 | -38 |
| hat tail 80-100 ms | -35 | -39 | -42 | -44 | -40 | -43 | -41 | -44 | -35 | -40 | -36 | -36 | -37 | -38 | -46 | -59 |
| second event 120-140 ms | -35 | -40 | -40 | -44 | -41 | -43 | -41 | -40 | -39 | -39 | -38 | -37 | -38 | -38 | -44 | -53 |
| clap 3-30 ms (4, 12) | -34 | -36 | -33 | -34 | -33 | -33 | -33 | -33 | -33 | -35 | -36 | -37 | -38 | -40 | -42 | -48 |
| kick 3-30 ms (0, 8) | -33 | -36 | -38 | -44 | -42 | -46 | -46 | -44 | -42 | -42 | -43 | -41 | -42 | -42 | -50 | -68 |
| quiet 0-25 ms (1, 5, 9, 13) | -35 | -36 | -41 | -43 | -45 | -45 | -48 | -51 | -51 | -53 | -55 | -55 | -55 | -58 | -63 | -71 |

Centroid and rms bandwidth (power spectrum, mean over events): hat peak 2-20 kHz centroid 7.3 kHz, bw 3.2 kHz; in 6-20 kHz 9.2 kHz (bw 2.4). Second event 6-20 kHz 9.2 kHz. Clap 2-20 kHz 4.7 kHz (bw 2.9). Note the MP3 lowpass: the 16-20 kHz bin is 8 to 20 dB lower than 12.5-16 kHz in every row.

**Hat envelope** (median over 64, 6-16 kHz, 2 ms smoothing, dB re peak): 5 ms -3, 20 ms -6, 40 ms -8, 60 ms -12, 80 ms -15, 100 ms -19. So the hat takes about 105 ms to -20 dB and the slope after the first 20 ms is about 0.17 dB/ms. It is cut short by the second event, which brings the level back to -13 dB at +125 ms; -40 dB is never reached in the gap (the clap or kick at +228 ms arrives at -16 to -24 dB). Per band (re own peak): 4-8 kHz -19 dB at 100 ms, 8-12 kHz -18, 12-16 kHz -22 (12-16 kHz peaks 6 dB lower, abs -29 vs -20 dB); so the decay is uniform across bands and the hat does not get darker as it decays. Break: -29 dB at 60 ms in 6-16 kHz (faster, see break below).

**Clap** (steps 4, 12; 1.5-6 kHz, 0.8 ms smoothing, kick contribution estimated from steps 0 and 8 and subtracted in linear power): first snap at 0 ms (peak), then bursts near +12 to +16 ms and +22 to +26 ms (each -9 to -10 dB re the first), a diffuse body -10 dB to -12 dB at 25 to 60 ms, -15 dB at 75 ms, -22 dB at 100 ms, -25 dB at 125 ms, -26 to -29 dB at 150 to 200 ms (a reverb-like tail). Three transients over about 25 ms (est.; the 0.8 ms envelope has many small local maxima after 25 ms, so a fourth cannot be excluded). Time to -20 dB: 89 ms; -40 dB: not reached before the next hit. The first snap is the loudest (reverse of the recreation, where the last flam is the loudest, see below).

**Swing (est.).** The app's `Sequencer` delays odd steps by `swing * stepSec * 0.33` (sequencer.js line 380): with GUIDANCE swing 0.06 that is 2.4 ms. In the reference the odd-16th events (stab notes at steps 1, 11 in mainB, 1-2.5 kHz band, derivative-of-envelope onset) land at +24.0 and +21.5 ms (std 8.7 and 11.3 over 15 bars) against -4.9 ms (std 13.8) for the same instrument on the even step 2, and the hat's soft second event on odd steps peaks at +14 to +18 ms against -6.5 ms for the even hats. So odd 16ths are late by about 20 to 30 ms (est., attack-time confound not fully excluded), i.e. a 16th of 119 ms is split about 61 : 38 (swing ratio about 0.61). Equivalent engine value: 25 ms / (119 ms * 0.33) = swing about 0.6 (est.; the engine's 0.33 factor makes 1.0 = 39 ms). This affects every odd-step event (stab, ghost hats, bass), so it belongs to the arrangement, not only to E3: proposal GUIDANCE_V3 swing 0.55 to 0.65, to be tuned by scoring the 1-2.5 kHz odd-step onset times.

**Full-song map (bars on the reference grid, T0 = 0.568 s, 203 bars).** Script `full.py` (map in scratchpad `e3/fullmap.txt`); for each bar the 6-16 kHz peak of the 2 ms envelope at steps 2, 6, 10, 14 ("hat"), at 3, 7, 11, 15 ("ghost"), 2.5-6 kHz at 4, 12 ("clap" band) and at 0, 8 ("kick" band), dB abs:

| bars | hat (6-16k, steps 2,6,10,14) | ghost (steps 3,7,11,15) | what it is |
|---|---|---|---|
| 0 to 23 | -72 rising to -48.5 (+1 dB per bar, linear in dB) | -75 to -53.5 | a very quiet off-beat hat fading in over 24 bars; in the intro it is 17 to 35 dB under the kick click (-52) |
| 24 to 39 | -33 (jump of 15 dB at bar 24) rising to -19.7 | -46 to -32.3 | hat enters at bar 24 and rises 13.4 dB in 16 bars |
| 40 to 89 | -19 constant (std < 0.5) | -32 | main hat; clap (2.5-6k at steps 4, 12) -21 from bar 40 |
| 90 to 103 | falls -20 to -26 | falls -33 to -48 | hat fades 6 dB, ghost 13 dB |
| 104 to 119 (break) | -26 constant | -49 then rises to -41 over bars 112 to 119 | clap gone (-34); steps 1, 5, 9, 13 rise from -53 to -42 over bars 112 to 119 |
| 120 to 135 | -42 then -39 to -37 (bar 128) rising to -23.5 (bar 134) | -43 to -35 | after bar 120 the highs are cut (highs above about 6 kHz down 16 dB), then the hat climbs 14 dB over bars 128 to 134 |
| 136 to 183 (mainB) | -19 | -32 to -33.7 | same as mainA |
| 184 to 199 (outro) | -60 falling to -67 | -64 to -70 | hats gone; clap-band at 4, 12 stays at -20 (E4/E5: is that a clap or a stab?) |

So the three hats of the recreation's arrangement (a closed hat in intro2, open + closed from the build, closed `C` and `D` patterns) do not exist in the reference: the reference has one off-beat hat part that fades in over 40 bars and leaves at the outro. The recreation's hats start at bar 16 (intro2) and the full pattern at bar 24 (build), the reference's only at bar 24 too, but 14 dB below its final level.

**Sample or synthesis (NCC of band-passed waveforms between repeated hits, best lag in +-60 samples).**
- Hat (6-16 kHz, 40 ms from onset, bar 45 step 2 against 8 other hits in bars 45 to 150): NCC 0.75 to 0.88 (0.47 for bar 100, where the hat is fading); the hat is a repeated sample (or a deterministic synth); the residual is the MP3 and the mixture.
- Clap (1.5-6 kHz, 60 ms): NCC 0.11 to 0.17 against 6 other claps: the noise is different on every hit. The clap is generated noise (not a sample), like an analogue 909 clap (est.).
- Second (ghost) event: NCC 0.30 to 0.45: partly noise.
- Burst at beat 4 of bars 4n+3 (500-3000 Hz, 0.25 s): NCC 0.11 to 0.25 against 12 other bursts, whereas the same window in bars without a burst correlates 0.81 to 0.93 with itself at lag 0: the burst is generated noise as well, not a sample.

**Break detail (bars 104 to 119 of the reference grid; window ref-break-16, bars 0 to 8, 3 ms envelope, peak in [-2, +80] ms after the onset, 6-16 kHz, dB abs, median).** Steps 0, 2, 5, 6, 8, 10, 14: -27; step 11: -35; step 13: -37; steps 1, 3, 4, 7, 9, 12, 15: -52 to -60. Two shapes:
- hat at 2, 6, 10, 14: instant attack (+10 ms to the peak), flat top for 30 ms, -4 dB at 40 ms, -11 dB at 50 ms, -23 dB at 60 to 70 ms, -29 dB at 80 ms (a gated closed hat of about 45 ms; compare mainA where the same step is -19 dB at 100 ms). Level 7 dB under the mainA hat.
- soft-attack hit at steps 0, 5, 8, 13 (and the odd 16ths of the main sections): the 6-16 kHz envelope rises over about 30 ms (-46 dB at +10 ms, -34 at +20, -29 at +30, peak -28 at +40 to +50 ms), then falls -20 dB by +110 ms. The peak is 33 to 51 ms after the grid line even at step 5 and 13 where there is no kick, so it is not a ducking effect; it is a soft-attack noise hit, the same shape as the mainA second event. Level equal to the break hat (-27/-28 dB).
- step 11 is hat-like (attack in 10 ms, flat 30 ms, -37 dB), 8 dB under the break hat.
- A backbeat remains at steps 4 and 12 in 2.5-6 kHz: -35 to -36 dB against -20.4 dB in mainA (14 dB lower): a quiet clap in the break, not gone (correction of the map above, where only the 6-16 kHz column was read).

**1-2.5 kHz rhythmic band (item 3).** In the intro (bars 1 to 15, bars 3, 7, 11, 15 excluded because of the burst below) the 2 ms band peaks are -29 dB at steps 0, 4, 8, 12 and -43 to -57 dB elsewhere (this is the 5.8 dB std per 16th). Aligned on the kick onsets the 1-2.5 kHz envelope peaks 6 ms after the grid line (-29.2 dB), is -18 dB at 10 ms, sits on a plateau of -20 to -23 dB from 20 to 40 ms, -33 dB at 60 ms and -40 dB at 100 ms. The spectrum in the first 10 ms falls smoothly from -25 dB (500-630 Hz) to -49 dB (5-6.3 kHz) and -66 dB (16-20 kHz), and by 30-80 ms it has collapsed to -51/-58 dB at 500-800 Hz and nothing above 4 kHz. So it is the kick's attack transient (click) plus a short harmonic body, not a hat, ride or shaker. Band peaks re the kick's 30-150 Hz peak (intro, 2 ms band power, median of 12 kicks): 300-1000 Hz -15.2 dB, 1-2.5 kHz -28.1 dB, 2.5-6 kHz -36.0, 6-16 kHz -51.5. The same measure on the app's kick solo (mainA): -8.1, -14.0, -19.6, -23.6 dB. The recreation's kick is therefore 14 dB too bright at 1-2.5 kHz, 16 dB at 2.5-6 kHz, 28 dB at 6-16 kHz (baseline GUIDANCE: click 0.12, drive 0.45). This is E1's element, but it is the largest single contributor to the +10 dB excess at 1-4 kHz and I list it as delta 1 below. In the intro the faint off-beat hat (steps 2, 6, 10, 14 in 1-2.5 kHz: -39 dB in bars 8 to 15, 16 dB under its peak at 100 ms) is the only other rhythmic contributor.

**Noise bursts every four bars (item 4, "the sweeps at 7, 15, 22.6 s").**
- Position: the last beat of bars 4n+3 (reference bars 3, 7, 11, ...): onset exactly at step 12 (-6.5 ms re grid, together with the beat-4 kick), i.e. window seconds 7.13, 14.76, 22.38 in the intro window; full-file seconds = 0.568 + (4n+3) * 1.9047619 + 12 * 0.1190476 - 0.0065 = 7.704 + 7.619 n s.
- Envelope (intro, median of bars 3, 7, 11, 15, 1-2.5 kHz, 4 ms): instant onset (no rise: -59 to -30 dB in one 20 ms frame), plateau -30 to -35 dB for about 0.30 s (steps 12 to 14.5), -39 dB at the end of the bar (-8 dB in 0.45 s), a reverb-like tail: -39 dB at step 1 of the next bar, -47 at step 5. Duration to the end of the bar 0.48 s, audible tail about 0.9 s.
- Spectrum: noise-like (dense, many 10 to 40 dB peaks over the normal-bar spectrum, 1/3-octave levels +8 dB at 400-500 Hz, +16 at 500-630, +24 at 630-800, +17 at 800-1k, +13 at 1-1.25k, +15 at 1.25-1.6k, +11 at 1.6-2.5k, +6 at 2.5-3.2k, +4.5 above 3.2 kHz). Peak region 570-800 Hz and a broad shoulder to 2.5 kHz. The spectral centroid in 400-8000 Hz is constant (1.4 to 1.6 kHz, 25 ms frames from +100 to +450 ms; the readings at 800 and 450 Hz are the next bar's kick). It does not sweep: neither rising nor falling in frequency; only the level falls. The coordinator's "sweep" was this burst.
- Stereo: side/mid -0.6 dB, L/R correlation 0.07, L/R level 0.1 dB: two independent noise signals (maximally wide). The normal intro bar in that window is side/mid -31 dB.
- Not a sample: 500-3000 Hz waveform correlation with bar 3's burst is 0.11 to 0.25 for 12 other bursts (bars 7 to 199), while the same window in burst-free bars correlates 0.81 to 0.93: the noise is different on every occurrence.
- Level: 1-2.5 kHz sustained -31 dB abs, 30 dB under the kick's low-band peak (-0.6 dB); 25 dB above the burst-free bar (-59 to -45 dB).
- Which bars (the burst is >= 3 dB over the same bar's steps 5-7 in 1-2.5 kHz): 3, 7, 11, 15, 19, 23, 51, 55, 59, 63, 67, 71, 103, 119, 147, 151, 155, 159, 179, 183, 187, 191, 195, 199. In the remaining 4n+3 bars the other material (stab, bass, pad) is 6 to 10 dB louder in that band and the burst cannot be read (27 to 47, 75 to 99, 107 to 115, 123 to 143, 163 to 175); a frame-level check at 39 and 47 shows a smaller rise (+1 to +2 dB), so it may be present but masked (est.).
- For E4: no sample slice is needed (random noise per occurrence). If the owner wants one anyway, slice [7.70 s, 8.60 s] of reference.mp3 and the other occurrences at +7.619 s steps.

**Slow noise bed in the break (item 4, the real "riser").** 20th percentile per bar of the 2048-point STFT band power (the level between hits), dB: 5-8 kHz rises from -66 (bar 105) to -47 (bar 119, +19 dB; starts rising at bar 108, -61); 8-12.5 kHz from -72.7 (bar 106) to -50.6 (bar 119) and -45.3 (bar 123), +27 dB, starting at bar 111 and accelerating at 2.7 dB per bar from bar 112; 12.5-16 kHz from -82 (bar 118) to -75.4 (bar 119) and -52 (bar 124), +23 dB between bars 119 and 124; 3-5 kHz and below do not move. So each higher band starts to rise later: a lowpass cutoff on a continuous noise bed opening upward from about 5 kHz (bar 108) to above 16 kHz (bar 124), about 16 bars (30 s). Direction: rising, in level and brightness; duration 16 bars, plateau at -46 to -47 dB (8-12.5 kHz) until bar 135, then the bed drops 6 dB in bars 136 to 139 (mainB). It is continuous, not gated to 16ths (in break bar 14 the level between hits is -43 to -49 dB, in bar 4 -60 to -70). Hats leave at bar 120 (jump over pre-window 2.8 to 3.5 dB for bars 120 to 126) and return as a fade-in over 8 bars (jump 7.1 dB at bar 128, 18 to 19 dB at bars 133 to 134) before mainB. Time range for E4 (full file): bar 108 to bar 136 = 0.568 + 108 * 1.9047619 = 206.3 s to 0.568 + 136 * 1.9047619 = 259.6 s. Noise: white-ish, not a sample (est.; no repeat test possible on a non-rhythmic bed).
No other rising or falling 4-bar sweep was found in the intro (6-16 kHz, 1-2.5 kHz and the band tables above); the 4-bar structure in the intro is only the burst. The recreation's riser (4 or 8 bars, bandpass 300 to 7000 Hz rising, plus a saw drone 55 to 110 Hz) has no counterpart in the reference at those bars (build 12, mainA2 28, breakEnd, mainB 44): delta.

**Stereo (mainA, mean of 64 hat events, 16 clap events).** Hat 6-16 kHz: side/mid -13.7 dB, L/R correlation 0.92, level 0.6 dB left of centre; 2.5-6 kHz -10.3 dB / 0.83. Second event: -11.5 dB / 0.87. Clap 1.5-6 kHz: side/mid -9.8 dB, correlation 0.81; 6-16 kHz -12.4 dB / 0.89. The app's hat_open, hat_closed and clap solos are mono: side/mid -28, -26 and -37 dB (correlation 1.00).

**Choke.** No closed hat exists in the reference main sections, so there is nothing to choke the open hat. The open hat is not cut by the second event either: the causal 1 ms envelope (6-16 kHz) falls smoothly from -37 dB at +180 ms to -44 dB at +225 ms with no step; the only feature is a 5 dB dip about 5 ms before the next clap or kick at +232 ms (-48 against -42 dB), a pre-hit duck rather than a choke.

### Recreation, same measures (solo renders mainA, tools/out/app-mainA-0-16-solo-*.wav, GUIDANCE baseline; grid starts at 0.05 s)

Settings today (song.js GUIDANCE): hat_open gain 0.45, pan 0.08, params decay 0.26, tone 7000, ring 1500, metal 0.5, pattern A '..x...x...x...x.' in build, mainA, mainA2, mainB; hat_closed gain 0.4, pan -0.08, decay 0.055, tone 7500, metal 0.4, A '.......x.......x' (intro2: A; build: B '...x...x...x...x'; mainA: A; mainA2/mainB: C 'x.x..xx...xx..x.'; breakEnd: D 'XxXx...'); clap gain 0.7, tone 1900, decay 0.16, tail 0.3, A '....x.......x...' from build on, break clap.level 0.6; shaker gain 0.3 tone 6500 decay 0.07 'XoxoXoxo...' and perc gain 0.4 pitch 380 only in break and breakEnd (silent in mainA); riser and impact on the fx lists.

| quantity (method) | reference mainA | recreation solo | delta |
|---|---|---|---|
| hat centroid, bw, 1-16 kHz (Welch, 3-25 ms after onset) | 6.6 kHz, 3.4 kHz | hat_open 10.9 kHz, 3.0 kHz; hat_closed 10.9, 2.8 | +4.2 kHz |
| hat centroid 2-20 kHz / 6-20 kHz | 7.3 / 9.2 kHz | 12.0 / 12.3 kHz (open); 12.3 / 12.6 (closed) | +4.7 / +3.1 kHz |
| share of 1-16 kHz energy above 6 kHz | 57% | 94% (open) | +37 points |
| hat spectrum 1.25 to 5 kHz relative to its 6.3-10 kHz peak (1/3-oct power) | -4 to -8 dB | -13 to -26 dB (open: 1.25-1.6k -58 dB abs against -32 at 12.5-16k; 4-5k -13, 3.15-4k -18, 2-2.5k -25) | 7 to 20 dB too little mid |
| hat 12.5-16 kHz re 6.3-10 kHz | -4 to -7 dB (16-20 kHz: -15 dB, partly the MP3 lowpass) | +2 to +4 dB (16-20 kHz +2 dB) | the app rises to Nyquist |
| open hat envelope, 6-16 kHz, dB re peak: 20 ms / 60 / 100 / 160 / 200 ms | -6 / -12 / -19 / -22 (est., ghost-filled) / -24 | -2 / -8 / -20 / -38 / -50 | initial drop 4 dB too slow, tail 15 to 25 dB too fast at 160-200 ms (ghost hides this) |
| open hat time to -20 / -40 dB | 105 ms / not reached (ghost at 119 ms) | 100 ms / 166 ms | -20 dB matches |
| hat peak re the kick's 30-150 Hz peak (2 ms band power; kick peak = -1.0 dB abs in the ref, -6.4 in the solo) | -18.3 dB | hat_open -8.6 dB; hat_closed -8.4 dB | +9.7 dB too loud |
| closed hat envelope, dB re peak, 20 / 40 / 60 ms | (none in the main sections; break hat -3 / -4 / -23) | -24 / -51 / -72 | far too short and steep |
| clap level, 1.5-6 kHz peak re kick | -17.0 dB | -7.1 dB | +9.9 dB too loud |
| clap centroid, bw (2-20 kHz) / 1-16 kHz | 4.7 kHz, 2.9 / 3.5 kHz | 4.9 kHz, 3.1 / 4.1 kHz | matches in centroid |
| clap spectrum 800-1600 Hz re 2-5 kHz | 0 dB (flat 0.8 to 5 kHz) | -12 dB at 800-1k, -7 at 1-1.25k, -3 at 1.25-1.6k (-19 dB at 630-800) | lacks up to 12 dB at 0.8-1.25 kHz |
| clap burst structure | loudest burst first (0 ms), then bursts at +12 to +16 and +22 to +26 ms at -9 to -10 dB, body -10 to -12 dB to 60 ms | flams at 0, 11, 22 ms at -2 to -12 dB; loudest burst last, at 33 ms (peak measured 36 to 54 ms) | order reversed |
| clap time to -20 dB (1.5-6 kHz) | 89 ms after the first burst | about 118 ms after onset (64 after its own peak) | 30% too long |
| stereo, side/mid | hat -13.7, clap -9.8 dB | -28, -37 dB | too mono by 15 to 27 dB |
| swing: odd-16th delay | 20 to 30 ms (est.) | 2.4 ms (swing 0.06) | 10x too little |
| hats in intro/intro2/build | off-beat hat only, fading in from -72 dB (bar 0) to -49 (bar 23), step to -33 (bar 24) and -20 (bar 39) | hat_closed from bar 16, hats full level from bar 24 | too early/loud by 14+ dB in 24 to 39 |
| second (ghost) event on 3, 7, 11, 15 | -13 dB re hat, soft attack 25 to 30 ms | shaker silent in mainA; closed hat on 7 and 15 only, with a 2 ms attack | missing |
| clap in the build (bars 24 to 39) | none (the clap-band equals the kick band until bar 40) | clap A from bar 24 | extra |
| noise burst on beat 4 of bars 4n+3 | present, maximally wide | absent | missing |
| break noise bed (bars 108 to 135) | rising 5 kHz to 16 kHz, +20 to +27 dB | riser in breakEnd (8 bars), bandpass 300 to 7000 Hz | different |
| 4-bar sweeps | none | riser on build 12, mainA2 28, mainB 44 | extra |
| perc | no tuned blip found; the break's 6-16 kHz hits are hats and soft shaker hits (above) | perc 'x.x..xx.x.xx.xx.' in break | extra (est.) |

### Reference inventory: E3's sounds
1. Off-beat hat, steps 2, 6, 10, 14, sample-like, broadband 1.2-12 kHz, centroid 6.6 kHz (1-16 kHz), -20 dB at 105 ms.
2. Soft second hat/shaker event, steps 3, 7, 11, 15 (main), -13 dB re hat, 25-30 ms attack, same spectrum.
3. Clap, steps 4, 12, noise bursts (not a sample), loudest first, 0.8-5 kHz flat.
4. Gated closed-style hat in the break at 2, 6, 10, 14 (+11 softer), 45 ms.
5. Soft-attack shaker-like hits in the break at 0, 5, 8, 13.
6. Backbeat clap in the break at 4, 12, -14 dB re main.
7. Kick click transient (the 1-2.5 kHz rhythmic band) - E1's.
8. Beat-4 noise burst every four bars, wide stereo, 0.57-2.5 kHz.
9. Break noise bed with opening lowpass, bars 108-135.
10. Hat fade-in (bars 0-39 and 128-135) - an automation, not a sound.
So E3 inventory count: 9 sounds (plus 1 automation); in the recreation 4 have an equivalent (hat, clap, closed hat, shaker), 5 have none (second event as a distinct sound, break soft hits, burst, noise bed, break clap level).

### Proposals (engine names and ranges from synths.js, processors.js, song.js; all values are starting points to be scored, estimates marked)

Web (3 pages seen in one search): a forum thread on emulating the TR-909/808 clap describes noise through a bandpass with an envelope that retriggers four times about 11 ms apart ([KVR, "Emulating the TR-909(808) clap in detail"](https://www.kvraudio.com/forum/viewtopic.php?p=8606994)); the Tiptop CP909 listing says the noise source is a logic-gate ring and the clap is a triple-saw envelope into a VCA ([Vintage King listing](https://vintageking.com/instruments/eurorack-and-modular-synths/tiptop-audio-cp909-tr909-clap-generator)); the HATS909 documentation says the original circuit chokes the open hat when open and closed are triggered together, and that the hats are six square oscillators into a bandpass ([Music Store listing of the HATS909](https://www.musicstore.com/pl_PL/PLN/Tiptop-Audio-HATS909-White/art-SYN0007030-000)). These agree with the clap findings (several noise bursts about 11 ms apart, different noise every hit; the reference's first burst at 0 and the next at +12/+24 ms). No source I saw gives decay times, so none are quoted. The reference hat is sample-like (repeat correlation 0.75 to 0.88), unlike a six-square bank; the reference choke question is moot (no closed hat in the main sections).

**P1. Patterns per section (GUIDANCE_V3), reference steps; 16-char strings, `x` normal, `X` accent, `o` soft as used by shaker A**
- hat_open (the one off-beat hat; keep the name): A '..x...x...x...x.' unchanged, in mainA, mainA2 (bars 72-103 of the song; the reference holds it to bar 89 then fades), mainB; fade-in automation: `hat_open.level` ramp (curve 'expo') bars 0 to 23 from 0.002 to 0.035, step to 0.2 at bar 24, ramp to 1.0 at bar 39 (values are the measured -53 -> -29 dB, -14 -> -0.4 dB re the main hat; est., audible only from bar ~16); fade 1.0 -> 0.5 over bars 90 to 103; hat off in the outro (bars 184 to 199: -60 to -67 dB) and bars 120 to 127; fade-in 0.1 -> 0.5 over bars 128 to 135; mainB 1.0. In the break hat level 0.45 of main (-7 dB) with decay ~0.05 (gated shape).
- hat_closed: delete the existing parts in intro2, build, mainA, mainA2, mainB (no counterpart). Keep one use: break hats at 2, 6, 10, 14 plus a soft 11: '..x...x...xo..x.' with decay 0.07, level -7 dB re hat_open main.
- shaker (second event "ghost"): new pattern G '...x...x...x...x' in mainA, mainA2, mainB at level -13 dB re the hat (gain ~0.12 against hat_open 0.45; est., verify with a solo render and the 6-16 kHz second-event bump of +5 dB at +119 ms); in the break a pattern 'x....x..x....x..' (0, 5, 8, 13) at the hat's own level; absent in the outro and bars 104-135 apart from this pattern. Currently shaker plays 'XoxoXoxo...' in the break and breakEnd, which the reference does not have.
- clap: A '....x.......x...' only from bar 40 (mainA on) instead of build; break '....x.......x...' at level 0.2 (-14 dB; app sets clap.level 0.6 now); outro A at full level; remove from build.
- perc: remove from the break and breakEnd (no tuned blip found; est., E2/E4 to confirm).
- riser: remove the 4-bar risers at build 12, mainA2 28, mainB 44 and the 8-bar breakEnd one; replace by the break noise bed (P5).
- burst: new track (P4), step 12 of bars 4n+3 for the whole song except where the reference masks it.
- swing: GUIDANCE_V3 swing 0.6 (est.: 25 ms odd-16th delay = swing * 119 ms * 0.33 -> swing 0.64; measured 20 to 30 ms, i.e. 0.5 to 0.76); score by the 1-2.5 kHz onset times of odd-step stab events (ref +21 to +24 ms, even -5 ms).

**P2. Hat sound (hat_open, after the pattern is right)**
- Spectrum: the reference is broadband noise from about 1.2 kHz to 12 kHz with a gentle fall above 10 kHz, centroid 6.6 kHz (1-16 kHz) and 57% of the energy above 6 kHz; the app's noise is a 2-pole highpass at `tone` 7000 plus six squares (`metal` 0.5, `ring` 1500, bank highpassed at tone/2 or `metalHp`), centroid 10.9 kHz, 94% above 6 kHz. Set `tone` 2000 (spec min 2000, 2-pole HP so 1.25-2 kHz still arrives at -6 to -12 dB, as in the reference), `metal` 0.15 (the six-square ring is not audible in the reference; spec 0..1), `metalHp` 4000. Add a lowpass in the track chain: `chain: [{ type: 'filter', name: 'lp', mode: 'lowpass', cutoff: 11000, q: 0.7 }]` (2-pole, gives about -3 dB at 10 kHz, -9 dB at 16 kHz; the reference is -4 to -7 dB at 12.5-16 kHz and -15 dB at 16-20 kHz, partly the MP3). With white noise from 2 kHz to 11 kHz the expected centroid is about 6.9 kHz (calc., est.); target 6.6 kHz +-0.7.
- Level: gain 0.45 -> 0.45 * 10^(-9.7/20) = 0.15 to bring the peak from -8.6 to -18.3 dB re the kick (solo measure; gain change moves the level 1:1; est. since the new filter shifts the band energy, rescore).
- Decay: time to -20 dB already matches (100 vs 105 ms); the first 20 ms in the reference drops 6 dB, the app 2 dB. The builder's first segment is hard-wired (expo to 0.2 g at 50 ms). Keep `decay` 0.26 (the tail below -25 dB at 120 ms onward is carried by the shaker second event). Proposed optional code change: a `punch` param (0..1, default 0) that adds a 10 ms 4 dB dip after the attack; or accept the 4 dB error.
- Stereo: reference side/mid -13.7 dB (corr 0.92); a mono source cannot be widened by the widener (mid/side of a mono signal has no side). Use `pan` +0.08 (kept; L/R measured -0.6 dB, i.e. slightly left, so pan -0.04 is closer) and the reverb send at 0.12 for width (est.); or `chorus` { base 12, mix 0.25, invert true } in the chain for the decorrelation (est., score side/mid -13 +-3 dB).
- Choke: not needed. If hat_closed is kept for the break, add a code-level choke group only if the closed hat and the open hat can ever coincide; they do not in the reference.

**P3. Clap**
- `tone` 1900 -> 1500, `q` 0.8 -> 0.4 (spec 0.2..6): lifts 0.8-1.6 kHz by up to 12 dB toward the flat 0.8-5 kHz of the reference; `decay` 0.16 -> 0.12 (-20 dB at 89 ms instead of 118 ms); keep `tail` 0.3, `tailDecay` 0.35 -> 0.25 (reference tail -26 dB at 150 ms and -29 at 200 ms re first burst); `flams` 3, `flam` 0.011 (reference bursts at 0, +12, +24 ms; a 909 clap uses ~11 ms spacing, KVR above).
- Level: gain 0.7 -> 0.7 * 10^(-9.9/20) = 0.22.
- Burst order: the engine fires flams at 0.7 g falling to 0.12 g, then the main burst at 1.0 g at `flams * flam` = 33 ms, so the loudest burst is last. Reference: first burst loudest, the next two -9 to -10 dB, body -10 to -12 dB. Param-only stopgap: `flams` 1, `flam` 0.012 (loudest burst at 12 ms, 0.7 g at 0): still reversed but 12 ms instead of 33 ms. Proposed code change (synths.js, clap): a `first` param (0..2, default 0 = today) that sets the gain of burst 0 to `first` * g and scales later flams and the main burst to 0.33 g (-9.5 dB), so `first` 1 gives the reference order.
- Stereo: side/mid -9.8 dB (corr 0.81); reverb send 0.25 stays; plus the chorus above (est.).
- Break clap level 0.2, outro full level, build none.

**P4. Beat-4 noise burst (new, every 4 bars)**: no engine type has a flat-topped noise hit. Closest: `shaker` (bandpass noise, `tone` 1000..12000, `q` 0.2..6, `attack` 0.001..0.05, `decay` 0.01..0.5) with tone 1400, q 0.35, attack 0.004, decay 0.5 gives a decaying noise, but the reference holds -30 to -35 dB for 0.3 s and then falls only 8 dB in the next 0.15 s. Proposed `shaker` param `hold` (0..0.6 s, default 0): flat sustain at the peak, then the decay (hold 0.30, decay 0.30 -> -8 dB at 0.45 s, est.). Track: { name: 'burst', inst: 'shaker', params: { tone: 1400, q: 0.35, attack: 0.004, hold: 0.3, decay: 0.3 }, sends: { reverb: 0.35 }, pattern a 4-bar variant with one hit at bar 4 step 12 (SongDoc variants `{bars: 4}`; the legacy one-bar string cannot express it) }. Level: 1-2.5 kHz sustained -31 dB abs = 30 dB under the kick's low-band peak; set the gain from a solo render. Stereo: two independent noises (correlation 0.07); a single shaker voice is mono, so use two `burst` tracks (L and R, `pan` -1 and +1) if the noise buffer is regenerated per voice (`K.noise(ctx)` in synths.js, to verify), else add a code option for a stereo noise source (A7). Reverb send 0.35 for the tail (-8 dB at step 1, -16 dB at step 5 of the next bar, re burst).

**P5. Break noise bed (new, bars 108 to 135)**: use `riser` with `tone` 0 (no saw drone; the reference bed has nothing below 3 kHz), `from` 5000 (spec max 5000), `to` 16000, `q` 0.3, `ev.dur` 16 bars (30.5 s) from bar 108, noise gain so that 8-12.5 kHz reaches -46 dB abs at bar 123 (peak level to be set from a solo). The riser's level is exponential from 0.0001 (a 76 dB rise over the whole event) whereas the reference rises 20 to 27 dB with roughly linear dB: propose a `floor` param (0.0001..1, default 0.0001; 0.04 gives a 28 dB rise), and that the note does not end with a 30 ms ramp at the end (the reference holds the plateau until bar 135): `hold` after the rise. Without code changes: keep the riser with `tone` 0 and ev.dur 16 bars; accept the dB-curve error.

**P6. Order of value for the scoring loop (largest expected improvement of the band balance in 1-16 kHz first):** (1) kick click 14 dB too bright at 1-2.5 kHz (E1; also lowers the 1-4 kHz excess), (2) hat lowpass/tone (the whole 4-16 kHz balance of mainA/mainB: reference 4-16 kHz is -18.5 dB, the render is +0.5 to +2.5 dB over), (3) hat and clap gains -9.7 / -9.9 dB, (4) remove the extra closed hats and build clap, (5) swing, (6) ghost shaker and the burst, (7) break bed, (8) fades.

### Questions for the coordinator
1. The outro (bars 184 to 199): the "clap" band at steps 4 and 12 stays at -20 dB while hats and the burst-free texture vanish. E2/E4 should say whether it is a clap or a stab; I have kept the clap in the outro.
2. Swing is a song-wide parameter; do you rule it into GUIDANCE_V3 (A7) at 0.6, or leave it to E2/E5?
3. The kick click (14 to 28 dB too bright above 1 kHz) is E1's; confirm E1 has it.
4. Is a `hold`/`floor`/`first` param addition to synths.js acceptable for A7 (three one-line changes), or must I stay inside the existing spec?

**Check of P2 on synthetic noise (numpy white noise, 2-pole Butterworth, Welch 4096, 1-16 kHz):** HP 7000 only: centroid 11.3 kHz, 95% above 6 kHz (the app today: 10.9 kHz, 94%). HP 2000 + LP 11000: 7.0 kHz, 57% (reference 6.6 kHz, 57%). HP 2000 + LP 9000: 6.1 kHz, 47%. HP 3000 + LP 11000: 7.5 kHz, 64%. So `tone` 2000 with a 10 to 11 kHz lowpass reproduces the reference's centroid and the 57% share; the lowpass cutoff is the tuning knob (9.5 kHz would give 6.6 kHz).

## Agreements and disputes
(round 2 not started; to be appended after the cross-read of E1, E2, E4, E5.)

## Round 2: agreements and disputes

Read: E1, E2, E4, E5 transcripts and the dispute list in log-coordinator.md. New measurements in this round (scripts `r2a.py`, `r2b.py`, `r2c.py`, `r2d.py` in the scratchpad `e3/`; full reference decoded once, T0 = 0.568 s, bar k = T0 + k * 1.9047619 s, grid minus 6.5 ms for onsets as in round 1). Every NCC is the best zero-phase normalised correlation over +-20 samples.

### D2: the 1.4-1.6 kHz band (E3 kick click, E4 stationary lines, E2 chord harmonics). All three hold, in different places.
- Intro bars 1-15 (burst bars 3, 7, 11, 15 excluded), 1400-1600 Hz band, 4 ms envelope, peak in [-2, +30] ms: kick steps 0, 4, 8, 12: -41.1, -41.2, -40.9, -41.2 dB; hat steps 2, 6, 10, 14: -49.9, -52.0, -49.9, -47.9; steps 1, 5, 9, 13 (peak up to +100 ms): -53.6 to -61.1. Time-domain band rms: the first 12 ms after a kick -44.1 dB, the floor at +30 to +90 ms after steps 1, 5, 9, 13 -68.1 dB. The rhythm of the band (the "5.8 dB std per 16th", here 4.9 dB over the 16-step profile) is the kick click on beats plus the faint off-beat hat: E3's reading holds for the modulation.
- The stationary lines are the floor, not the rhythm: a median-over-frames spectrum (32768-point STFT, intro) has its strongest 1.4-1.6 kHz line at 1460 Hz (5.2 dB above the median bin) and a second at 1557 Hz; floor rms -68 dB, i.e. 24 dB below the click's first 12 ms. E4 holds that they are constant through the track; they matter where nothing else plays (bars 120-127, D4).
- E2's chord harmonics do not explain 1460 or 1557 Hz: they are not on the series of the chord set (D#6 1245, C#6 1109, G#6 1661 Hz hold for E2; 1460 is 23 cents under F#6 = 1480, 1557 is 12 cents under G6 = 1568, and G is absent from the chord set). So: the click owns the rhythm, the non-chord stationary lines (1460, 1557, and E4's 1.92/2.2/2.5/3.3 kHz) own the floor at -68 dB, the chord bed owns the lines at 1109, 1245, 1661 Hz. Agreement: E4 and E2 are right about the lines, E3 about the modulation. The dispute is a difference of question, not of data.

### D3: the on-beat layer that builds from bar 24 to 40: name it. A kick top (an on-beat tick), not an on-beat hat.
Data (full file; steps 0 and 8; compare bars 30-39 with kick-only bars 4-14; tail window +5 to +105 ms):
- Spectrum of the increment (power sums, dB abs, bands in Hz): 1000-1600 -39.6, 1600-2500 -49.1, 2500-4000 -45.5, 4000-6300 -44.8, 6300-10000 -44.7, 10000-16000 -52.6. Per Hz that is flat from 1.6 to 6 kHz (-77 to -78 dB/Hz), -2 dB per octave above 6 kHz and -10 dB above 10 kHz, with an extra +10 dB at 1-1.6 kHz (the lines of D2). The off-beat hat rises toward 6-10 kHz and does not look like this.
- Envelope: 6-16 kHz: -53 dB at 0 ms, -41.0 at +5, -39.9 at +10, -43.1 at +20, -45.5 at +40, -51.3 at +60, -54.3 at +80, -58.2 at +100 ms (the kick alone: -64 to -94 dB). 1-2.5 kHz increment: -39 dB at +10, -41.7 at +20, then flat at -42.3 to -42.6 from +40 to +80 ms and -44.4 at +100 ms (the kick-only 1-2.5 kHz falls to -63 dB at +80 ms). So after the click it is a flat 100 ms plateau 17 to 20 dB above the kick's own tail, then it falls: E1's "about -30 dBFS, 100 ms" reading holds. Level: 15 dB under the off-beat hat at its peak in the same bars (-40 against -25 dB in 6-16 kHz).
- It is on all four beats, not only on steps 0 and 8: the same increment sits at steps 4 and 12 (1-6 kHz sums -37.6 to -45.5 dB there against -39.0 to -45.3 at 0 and 8).
- Repetition: step 0 against step 0 in other bars NCC 0.82 (6-16 kHz) and 0.65 (1-6 kHz); step 0 against step 8 only 0.14: it is a fixed waveform per position (a sampled or deterministic event) that differs between beats 1 and 3. The off-beat hat template (bar 45 step 2) correlates 0.09 with it, i.e. it is not the hat sample.
- Build-up per bar (peak of the 2 ms band envelope at steps 0 and 8): 4-8 kHz is constant at -42 dB to bar 20 (the kick click), rises -38 at bar 22, -34 at bars 28-32 and stays there; 8-12 kHz -58 (bars 8-16) -> -54 (bar 24) -> -47 (bar 30) -> -38 (bar 40), +16 dB over 12 bars; 12-16 kHz -68 -> -60 (bar 24) -> -48 (bar 40), +12 dB. It brightens as it rises. The 6-16 kHz peak at the beats falls from the kick's click level to a plateau at -37 dB at bars 40-55, then steps to -29 dB at bar 56 (E4's second on-beat layer).
- Name: "kick top / on-beat tick": a flat-spectrum noise-like tick on every beat, entering around bar 26, rising 1.2 to 1.5 dB per bar to bar 40, 100 ms long, not part of the kick sample (E1: the kick is identical in intro and mainA) and not the hat. E1's conclusion (the app's kick keeps only its 2 ms click) stands; this layer is a separate track, not a kick parameter. Recreation: a `shaker` track (see V3 table).

### D4: bars 120-127: agree with E4. There are no hats; the -42 dB is a floor.
E4's settling test, run here: 6-16 kHz waveform over 40 ms from each hit, correlated with the mean break hat of bars 117-119. Bars 112-119 hit steps (2, 6, 10, 14), positive control: median 0.98 (max 0.99): the break hat is a sample repeated to within the MP3. Bars 120-127 hit steps: median 0.09 (max 0.15). Bars 120-127 non-hit steps 1, 5, 9, 13: median 0.07 (max 0.13). The hit steps are indistinguishable from the control steps. So the hat is absent in 120-127; my round-1 "hat -42 dB, highs cut 16 dB" read the floor of stationary lines and noise (the 6-16 kHz level between hits went from -26 dB to -42 dB because the hats left, not because a lowpass came in; E4's finding that 12.8 kHz does not fall agrees with my bed table: 8-12.5 kHz stays at -46 to -47 dB). Correction to the round-1 table: bars 120-127 hat = none. Bars 128-135: the hits correlate with the mainA hat template with median 0.20, max 0.88, the same distribution as the mainB hats (bars 136-139: median 0.19, max 0.89), so the returning hat is the main hat at low level (my "break hat" template does not apply); the ramp 128-135 is a level ramp, jump 7 to 19 dB.

### D5: swing. Revised down to 15 ms (range 11 to 18) by a same-instrument test; my 20-30 ms was biased.
- Why mine was biased: the odd-step events I used (steps 1 and 11 in 1-2.5 kHz) are the bass pluck's harmonics (E2), compared with the hat at the even step 2 (instant attack); the bass has a 12 to 15 ms attack, so the derivative onset is late by about that much. The hat ghost event (odd 16th, +14 to +18 ms against -6.5 ms) has a 25-30 ms rise and is biased the same way.
- Same-instrument test: bass 10th harmonic (500-535 Hz), 3 ms amplitude envelope, onset = first crossing of 50% of the local peak, hits within 8 dB of the loudest at that step, ms re the grid line (median, std, n): mainB bars 136-183: step 1 +11.0 (8.2, 48), step 6 +11.9 (6.7, 32), step 8 -4.6 (10.7, 25), step 11 +13.1 (4.5, 24), step 14 -5.0 (11.8, 43). Break bars 104-119: step 1 +9.4, 6 +10.9, 8 -5.9, 11 +13.2, 14 -5.0. Outro: 1 +9.5, 11 +9.0, 8 -25 (n=11, std 3), 14 -7.
- Odd (1, 11) minus even (8, 14): mainB 11.1 - (-4.8) = 15.9 ms; break 11.3 - (-5.5) = 16.8 ms. Including step 6 as an even step gives 11.3 ms, but step 6 sits at +11 ms like the odd steps (it is E2's ghost/soft hit, possibly not on the even grid), so I exclude it and flag it. Combined: 11 to 18 ms, centre 15 ms. E1's 10 to 20 ms agrees; my 20-30 ms is withdrawn.
- Engine value: offset = swing * 0.33 * 119.05 ms -> swing = 15 / 39.3 = 0.38 (range 0.28 to 0.46). GUIDANCE_V3 swing 0.38 (medium confidence). Apply it song-wide; the ghost shaker's slow attack (28 ms) then lands at the measured +14 to +18 ms.

### D7: the outro's step 4/12 hit is the clap, at the main level. The phrase-end noise hit is separate.
- Outro bars 184-199, 1.5-6 kHz, median over 32 hits: -22.1 dB at 0 ms, -23.7 at +2, -27.6 at +6, -25.1 at +12, -28.9 at +16, -26.4 at +24, -28.5 at +30, -29.9 at +50, -34.1 at +80, -41.1 at +120. mainA clap, same bands: -22.1, -22.9, -27.1, -24.8, -28.2, -26.3, -29.0, -30.0, -34.2, -41.9. Within 1 dB at every point, including the burst structure at 0, +12, +24 ms.
- Spectrum (1/3 octave, 800 Hz to 12.5 kHz): outro hit -33, -33, -33, -33, -33, -34, -33, -35, -36, -38, -38, -40 dB; mainA clap -33, -32, -33, -32, -33, -33, -33, -34, -36, -37, -37, -40. Hit-to-hit NCC 0.12 (mainA clap-to-clap 0.11; a tonal stab hit (step 7, bars 45-54) has 0.73): noise, so a clap, not a stab. Kick-only steps 0 and 8: -55 dB at 0 ms.
- The noise hit also continues in the outro: 1-2.5 kHz at steps 13-15 minus steps 5-7 is +12.9, +11.5, +12.4, +14.0 dB in bars 187, 191, 195, 199 and -0.4 to +0.5 dB in bars 186, 190, 194, 198. Both exist; the outro keeps the clap at full level and the noise hit on bars 4n+3.

### D8: E5's dark element in intro2 is the off-beat hat (its spectral tilt opens as it rises). Hit-aligned.
Peak of the 2 ms band envelope at the hit steps 2, 6, 10, 14 (full file, dB abs):

| bar | 4-8 kHz | 8-12 kHz | 12-16 kHz | floor 1,5,9,13 (+30 to +90 ms) 8-12 / 12-16 |
|---|---|---|---|---|
| 8 | -62.1 | -74.2 | -71.9 | -88.3 / -90.1 |
| 16 | -49.9 | -63.3 | -63.1 | -84.5 / -86.2 |
| 22 | -39.7 | -54.5 | -60.2 | -77.0 / -84.2 |
| 24 | -32.6 | -35.8 | -41.9 | -72.4 / -82.3 |
| 32 | -24.5 | -27.5 | -33.5 | -59.3 / -78.2 |
| 40 | -20.6 | -22.2 | -28.6 | -53.4 / -65.7 |

Slopes over bars 16-23 at the hit steps: 4-8 kHz +1.64 dB/bar, 8-12 kHz +1.50 dB/bar, 12-16 kHz +0.50 dB/bar: E5's "8-12 kHz +1.5 dB/bar, 12-16 kHz nearly flat" exactly, and these are hit-aligned events (the floor between hits is 20 to 30 dB lower and rises 1.25 dB/bar as the tails do). So E5's dark element is my off-beat hat. It is darker early: 8-12 kHz sits 12 dB under 4-8 kHz at bar 8 and 1.6 dB under at bar 40; 12-16 kHz 6.4 dB under at bar 40. Reading: the same hat sample through a spectral tilt that opens (a lowpass whose corner rises roughly from 5-6 kHz at bar 8 to above 12 kHz by bar 40; est., the hit-to-hit NCC at those levels is not measurable). The on-beat tick (D3) rises more slowly in 4-8 kHz (+0.54 dB/bar over 16-23) and starts to brighten only after bar 24.

### Agreements with others (short)
- E1: the kick click is a 1-2 ms transient and the app's 1-2.5 kHz kick content is 14 dB too bright (E1: 20 to 23 dB too bright relative to its own body): same finding, E1's number stands. The on-beat layer is a separate track. Swing agrees at 15 ms.
- E4: no hats in bars 120-127; the on-beat HF layers (bar 24-40 tick at -40 dB, bar 56 and bar 152 at -29 dB) are one family of tick, the second louder; the hat fade-in 8-39 (+40 dB) agrees with my 1 dB/bar then step at bar 24.
- E2: the odd-step bass pluck gives 15 ms of swing; the lines at 1109, 1245, 1661 Hz are the chord bed's; the burst bursts 1.1-1.7 kHz in the break at steps 1, 11, 14 are the bass harmonics (my round-1 "1-2.5 kHz jump at step 9, 11" is the same).
- E5: the dark element is the off-beat hat (D8).
- Open: step 6 of the bass pattern sits at +11 ms (E2 to say whether it is a delayed ghost note); the 1460 and 1557 Hz lines have no source (not a chord, not the drone) - E4/E2.

## Final V3 table (names are engine names; confidence H high, M medium, L low; "est." = to be tuned by scoring)

| element | item | value | conf. |
|---|---|---|---|
| song | swing | 0.38 | M |
| hat_open | role | the only off-beat hat | H |
| hat_open | pattern A | '..x...x...x...x.' | H |
| hat_open | params | decay 0.26, tone 2000, ring 1500, metal 0.15, metalHp 4000 | decay H; tone M; metal M; metalHp L |
| hat_open | chain | { type:'filter', name:'lp', mode:'lowpass', cutoff:11000, q:0.7 } (cutoff ramp 6000 at bar 8 -> 11000 at bar 40, expo) | cutoff M; ramp L |
| hat_open | gain | 0.15 (from 0.45; rescore) | M |
| hat_open | level (x gain) | bars 0-23 expo 0.002 -> 0.035; bar 24 step to 0.2; bars 24-39 expo to 1.0; 40-89 1.0; 90-103 1.0 -> 0.5; 104-119 0.45 with decay 0.05; 120-127 off; 128-135 expo 0.12 -> 0.6; 136-183 1.0; 184-199 off | bars 24-103, 120-127, 184+: H; 0-23 and 128-135: M |
| hat_closed | usage | none except the break (steps 2, 6, 10, 14 plus soft 11): '..x...x...xo..x.', decay 0.07, level 0.45 of main hat | M |
| hat_closed | removed from | intro2, build, mainA, mainA2, mainB (ruled) | H |
| clap | pattern A | '....x.......x...' from bar 40 (not in build) | H |
| clap | params | tone 1500, q 0.4, decay 0.12, tail 0.3, tailDecay 0.25, flams 3, flam 0.011, first 1 (A7 addition) | tone/q/decay M; first M |
| clap | gain | 0.22 (from 0.7) | M |
| clap | level | break 0.2 of main (-14 dB), outro 1.0 (D7: same as mainA), mainA/A2/B 1.0 | H |
| shaker (ghost) | pattern G | '...x...x...x...x' in mainA, mainA2, mainB (follow the hat's fades) | H |
| shaker (ghost) | params | tone 6500, q 0.35, attack 0.028, decay 0.07 | M |
| shaker (ghost) | gain | about 0.12 (-13 dB re hat; rescore) | L |
| shaker (break) | pattern | 'x....x..x....x..' (steps 0, 5, 8, 13) at hat level, same params; breakEnd none (the reference keeps the break pattern) | M |
| tick (new `shaker` track, D3) | pattern | 'x...x...x...x...' | H |
| tick | params | tone 3500, q 0.3, attack 0.002, decay 0.10 (hold 0 or 0.05) | L |
| tick | level | bars 26-40 expo ramp (+16 dB), plateau -15 dB re hat peak bars 40-55; E4's louder layer (-29 dB) from 56 and 152 (+8 dB) | ramp M; levels L |
| noise hit | track | `shaker`-type with `hold` (A7): tone 1400, q 0.35, attack 0.004, hold 0.30, decay 0.30, reverb send 0.35 | M |
| noise hit | event | step 12 of bars 4n+3 (3, 7, 11, 15, 19, 23, 51-71, 103, 119, 147-159, 179-199 measured present; 27-47, 75-99, 107-115, 123-143, 163-175 masked, est. on) | present H; masked L |
| noise hit | stereo | two tracks pan -1 / +1 with independent noise (L/R corr 0.07) or a stereo noise option | M |
| noise hit | level | 30 dB under the kick low-band peak (1-2.5 kHz -31 dBFS sustained) | M |
| break bed | track | `riser` tone 0, from 5000, to 16000, q 0.3 from bar 108, 16 bars long (to bar 124), then plateau to bar 135; floor 0.04 and hold (A7) | M |
| break bed | level | 8-12.5 kHz -72 -> -46 dB abs (+26 dB); plateau -46 dB to bar 135; mainB -52 to -54 dB | M |
| removed | perc (break), the 4-bar risers at build 12, mainA2 28, mainB 44, the breakEnd riser, the shaker XoxoXo pattern (impact: E4's call) | | H |

## Per-section patterns (V3, 16-char strings, reference bars)

| section (reference bars) | hat_open | hat_closed | clap | shaker | tick | noise hit |
|---|---|---|---|---|---|---|
| intro 0-15 | A, level ramp from 0.002 | - | - | - | - | step 12 of bars 3, 7, 11, 15 |
| intro2 16-23 | A, ramp, tilt opening | - | - | - | rising from bar 26 | bars 19, 23 |
| build 24-39 | A at 0.2 -> 1.0 | - | - | - | ramp, 4 beats | bars 27, 31, 35, 39 (masked, est.) |
| mainA 40-71 | A | - | A | G (ghost) | plateau | bars 43-71 |
| mainA2 72-103 | A (1.0 -> 0.5 from 90) | - | A | G | plateau; E4's loud layer | bars 75-103 (est. masked) |
| break 104-119 | gated, 0.45 | '..x...x...xo..x.' (break hat) | '....x.......x...' at 0.2 | 'x....x..x....x..' | - | bars 103, 119 |
| breakLate 120-127 | off | - | at 0.2 | - | - | bed continues |
| breakEnd 128-135 | ramp 0.12 -> 0.6 | - | at 0.2 | - | - | bed continues |
| mainB 136-183 | A | - | A | G | plateau; loud layer from 152 | bars 147-183 |
| outro 184-199 | off | - | A (full) | - | - | bars 187, 191, 195, 199 |

## On-beat hat layer (bars 56 and 152, from E4 round 2 item 7 and the coordinator's request)

Measured on bars 56-71, 152-167 against 40-55, 136-151 (full file, 6-16 kHz 2 ms envelope, script `r3a.py`; peak in 0 to +70 ms after the onset, dB abs, median).
- Steps: 0 and 8 at -28 dB (bars 56-71: -29, -29; 152-167: -29, -29; before: -36 = the tick), and also steps 5 and 13 at -31 dB (before: -49 and -47; bars 56-71 step 5 -34, step 13 -38 in the 32 ms window because the peak comes later). So the layer is four hits per bar on 0, 5, 8, 13, steps 5 and 13 about 3 dB under 0 and 8. This is exactly the pattern of the break's soft-attack hits, and it is the same level there (break: -27/-28 dB): the "break shaker" and E4's on-beat layer are one part. Entry is sharp: bar 55 steps 0/8 -35.5, bar 56 -28.1 (+7 dB); steps 5/13 -48 -> -31 (+17 dB); bar 151 -35.7, bar 152 -27.7.
- Extent (steps 0/8 | 5/13 peaks stay at -27..-28 | -31): constant from bar 56 through bar 106 (last sampled) and, with the break, to bar 119 (round 2 break table); 152 through 182 constant (-27.7 | -31.5); gone at bar 184 (-51). I did not sample 107-119 bar by bar here (the break window shows it at -27/-28); 120-127 is the floor (D4). Present in mainA second half, mainA2, break, mainB.
- Envelope (6-16 kHz, on-beat steps 0 and 8, bars 56-71, dB abs): the tick click -37 at +5 ms, -32.8 at +20, peak -29.4 at +40 ms, -34.4 at +60, -40.4 at +80, -53.0 at +100, -60.6 at +120 ms. Rise about 35 ms, then a fall of 24 dB between +60 and +100 ms (a gated end near 100 ms, like the break soft hits: peak +40 to +50 ms, -20 dB by +110 ms). Bars 152-167: the same within 1 dB (-29.5 at +40 ms).
- Spectrum (increment over the tick-only bars, 3 to 30 ms, band sums, dB): 2.5-4 kHz -38.9, 4-6.3 -38.1, 6.3-8 -41.1, 8-10 -37.5, 10-12.5 -42.6, 12.5-16 -52.0; the off-beat hat in the same bars: -24.8, -23.4, -22.3, -24.6, -25.4, -30.4. The shapes are parallel from 2.5 to 10 kHz (layer 14 to 19 dB lower in this early window because the layer's attack is slow) and the layer is 4 to 8 dB darker at 12.5-16 kHz. Same family of broadband noise, different articulation (35 ms rise against the hat's instant attack) and a different waveform: step 0 against step 0 NCC 0.93, step 0 against step 8 0.74 (a repeated sample), while the hat template gives a bimodal NCC (0.19 median, 0.83 p90, two hat waveforms), so correlation with the hat is not diagnostic here. Verdict: not the off-beat hat's voice at another level; a soft-attack noise voice, the shaker.
- Level: peak 6-16 kHz -27.9 dB, which is 9.3 dB under the off-beat hat's -18.6 dB (E4 said -8) and 26.4 dB under the kick's 30-150 Hz peak (-1.5 dB) in the same bars; the hat is 17.1 dB under the kick.

V3 row (track `shaker`, a second `shaker` track is needed besides the ghost one because the attack and decay differ):

| item | value | conf. |
|---|---|---|
| track | `shaker_on` (inst shaker), gain so that the 6-16 kHz peak is -9.3 dB re hat_open (about 0.15 * 0.34 = 0.05 on today's scale; rescore) | M (relative level), L (gain) |
| pattern | 'X....o..X....o..' (X = steps 0 and 8, o = steps 5 and 13 at -3 dB) | H |
| params | tone 6000, q 0.25, attack 0.035, decay 0.06 (hold 0.03 if A7's `hold` is available; end near 100 ms) | attack M; tone M; decay L |
| sections | mainA 56-71, mainA2 72-103, break 104-119 (same pattern at hat level), mainB 152-183 (not 136-151); off in 120-135 (E4/D4: floor and crescendo), off from 184 | H for bars 56-106 and 152-182; M for 107-119 |
| relation to earlier rows | replaces the "shaker (break)" pattern 'x....x..x....x..' with this one (same hits), and is independent of the tick (all four beats, bars 26-55) and of the ghost shaker G ('...x...x...x...x', -13 dB) | H |
