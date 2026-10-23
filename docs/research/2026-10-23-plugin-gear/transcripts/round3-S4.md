# S4: round 3 — limiting, width, modulation
Agent model: Sonnet. Date: 2026-10-23.

Marks. `(fetched: URL)` means I opened the page this round or in round 1. `(search summary: URL)` means the URL appeared in a search result and the fact is from the summary, not the page. `(from O1/O2)` means I am passing on a measurement or a spec reading from round2-O1.md or round2-O2.md, which I did not repeat. `(derived)` means arithmetic of mine, with the assumptions stated; it is a prediction to test, not a measurement. `(recalled)` means from memory, not checked.

This round I ran four searches (all returned results) and fetched four pages (two worked). I did not render the studio, so nothing below says what the studio's master or stab measures today. It only says what the code and the numbers imply.

Local state I read: `studio/` is a symlink to `olde Havantechno dub studio/`. In `song.js` the master chain is the `Processors.master` default (limiter threshold -2 dB, release 0.08 s, ceiling -0.6 dB, glue compressor before it), the only widener is on the stab (`width: 1.1`, stab `hp: 180`, `spread: 0.5`, `detune: 11`), and no track uses the chorus. Hats are panned +0.08 and -0.08, the perc -0.3 with a delay send of 0.3.

## 1. Answers

### O1 Q6 (to H3 and S4): what gives about 0.5 L/R correlation at the stab onset, and what does a 3/16 ping-pong return do in the tail?

O1 measured 300 Hz to 2 kHz at the stab steps in mainA: 0.47 to 0.60 in the first 30 ms, 0.29 to 0.46 at 60 to 115 ms; full mix 0.93 to 0.96 (from O1, M7).

What the current stab voice can reach (derived). Each note is a detuned saw pair, one saw panned to +spread and one to -spread. Assume the StereoPanner equal-power law for a mono input, gainL = cos(x*pi/2) and gainR = sin(x*pi/2) with x = (pan+1)/2 (recalled; O2 read the Web Audio spec through Context7 for other points but not this one). Call the two saws a and b with mutual correlation r. Then L = g1*a + g2*b and R = g2*a + g1*b, where g1 and g2 are the two panner gains for pan = +spread (and swapped for -spread). With the law above, 2*g1*g2 = sin((spread+1)*pi/2) = cos(spread*pi/2). The channel correlation is (2*g1*g2 + r) / (1 + 2*r*g1*g2).
- At the onset the two saws start in phase, so r is about 1 and the correlation is about 1.0, whatever the spread. That does not match 0.47 to 0.60.
- After the saws drift apart (11 cents is about 3 Hz at 500 Hz, so a quarter cycle in roughly 80 ms) r falls toward 0 and the correlation approaches cos(spread*pi/2). With the song's spread of 0.5 that is 0.71. With the synth default of 0.7 it is 0.45. A value near 0.73 would give 0.41.
- So, if these assumptions hold, the song's spread of 0.5 cannot reach the measured tail (0.29 to 0.46), and voice pan alone cannot produce a low onset value, because identical-phase oscillators are coherent at the onset.

What can produce about 0.5 at the onset (derived). Something that decorrelates the left and right copies from the first milliseconds: a delay of a few ms or more between the channels, or different start phases per voice. A Juno-style chorus does the first (two delay lines, right channel's LFO inverted; fetched by H3 at https://github.com/pendragon-andyh/Juno60/blob/master/Chorus/README.md?plain=1, rates 0.51 and 0.86 Hz). I did not find the delay times in my sources. The studio's own `BUILD.chorus` has 14 and 21 ms base delays. If the delayed copies are uncorrelated with the dry signal and with each other across the band, the channel correlation of dry (gain 1-m) plus one delayed copy per side (gain m) is (1-m)^2 / ((1-m)^2 + m^2), where m is the studio chorus `mix`. That gives 0.5 at m = 0.5 and 0.41 at m of about 0.55 (derived). In the first 14 to 21 ms the delayed copies have not arrived, so an onset window of 0 to 30 ms would read higher than the tail, which is the direction O1 saw. This is a candidate, not a finding: only a render and the same measurement will settle it.

3/16 ping-pong return. The studio delay is 3/16 (357 ms), feedback 0.42, stab send 0.15 (from `song.js`). An echo arrives 357 ms after the hit, so it falls outside O1's 60 to 115 ms window. It cannot be what lowers the tail value. It does fall in the "non-stab steps are also wide (0.09 to 0.52)" figures from O1. If echo 1 goes to one side, the return is almost fully decorrelated there (I did not re-read `BUILD.delay` for the routing). The reverb send of 0.1 is about -20 dB, which if uncorrelated lowers the tail correlation by about 1 percent (derived). So neither effect explains 0.29 to 0.46 in the tail window. The stab voice and any chorus on it must.

Method for the answer: any claim above is checkable with O2 Q12's procedure below on a studio render.

### O1 Q10 (to S4): which limiter design gives about 0 dBTP and about -10.7 LUFS, and should Havantechno match or target -1 dBTP?

Numbers I am using (from O1, M9): integrated -10.7 LUFS, max short-term -9.5 LUFS, sample peak -0.18 dBFS, true peak +0.01 dBTP (4x oversampled), crest 10.6 to 14.0 dB by section. The difference between true peak and integrated loudness (peak-to-loudness ratio, PLR) is therefore about 10.7 dB (derived from O1's two numbers).

What this implies:
1. The reference is not slammed. A PLR of about 10.7 dB is moderate. A hot club limiter chain is not needed to reach it; gain staging and the kick's peak shape matter more than which limiter is used. O1's simulation says the kick drive (tanh, 0.45) flattens the kick peak (from O1, M2). If the kick is fixed (less drive, explicit hold and decay), its crest rises and the master limiter will work harder at the same loudness. So the limiter should be set after the kick fix, not before.
2. Loudness is not set by the limiter. `BUILD.limiter` has threshold, release and ceiling only. It is one `DynamicsCompressorNode` plus a gain. The node adds its own automatic make-up gain (S1 reported `(1/fulllevel)^0.6` from the sndfilter port, search or gist evidence in S1's file, not checked by me). To land at -10.7 LUFS the pre-limiter level has to be right, or the limiter needs an input-gain (drive) parameter.
3. A fixed 6 ms look-ahead and no sidechain are properties of the native node (from O2, verified by O2 from the Web Audio spec). It has no true-peak awareness, so "0.0 dBTP" or "-1 dBTP" cannot be guaranteed; it can only be measured afterwards with a meter.
4. Designs that fit: any look-ahead brickwall with true-peak handling. Limiter No6 and TDR Limiter 6 GE put a clipper ahead of the peak limiter and a true-peak stage last (search summaries, round 1); that order suits a kick-dominated track because the clipper takes the kick peak and the limiter works less. LoudMax has a true-peak (ISP) button and 1.25 ms look-ahead (search summary, round 1). FabFilter Pro-L 2 describes a two-stage true-peak method (search summary, round 1). None of these is a target the studio can load. They are references for what the worklet should do.
5. Whether 0.0 dBTP is intentional is not known. The reference is a decoded 192 kbps MP3 (from O1). Lossy decoding can raise inter-sample peaks above where the pre-encode master sat (recalled, not verified). A master limited to -0.3 or so before encoding may decode to about 0.0.

Recommendation: keep both as a profile, not a single number. A fitting profile that matches the reference (target -10.7 LUFS integrated, sample peak about -0.2 dBFS), so the render-and-score loop has no loudness gap to explain. A release profile with ceiling -1 dBTP for exports, because -1 dBTP is the figure the club and broadcast sources I found agree on (search summaries in round 1: Boris FX doc for R128, the club blogs). The studio's present -0.6 dB ceiling is neither: it sits 0.4 dB under the reference's sample peak and 0.4 dB over the safer -1.

The earlier -9 to -8 LUFS blog range in my round 1 is superseded by O1's measurement. The reference sits at the quiet end of the -11 to -8 band the blogs gave.

### O1 Q12 and O2 Q1 (top three, classified; closed devices with their defining parameters)

Licence classes: (a) permissive code, (b) copyleft, (c) published algorithm or paper, (d) closed binary.

| # | Device | Source available | Licence | Browser build | Class |
|---|---|---|---|---|---|
| 1 | Meter device: loudness (LUFS), true peak, multiband correlation | libebur128, repo https://github.com/martingasser/libebur128 and https://github.com/andrewrk/libebur128 (both fetched; forks of jiixyj/libebur128, whose page I did not open) | MIT (fetched: README says "All source code is licensed under the MIT license") | none today. Algorithm is small enough for an AudioWorklet (see Q12 below). needles (MIT per search summary, ScriptProcessorNode) is a Web Audio meter but is not built on a worklet | (a) |
| 2 | Look-ahead true-peak limiter | No source for LoudMax, Limiter No6, TDR Limiter 6 GE or Pro-L 2. Airwindows repo has open limiter code (fetched: https://github.com/airwindows/airwindows, "MIT license" link text, "all the Airwindows audio open source code"); a search summary names Acceleration as an open-source acceleration limiter | MIT for Airwindows (fetched link text only; the licence text was not shown). Closed for the four named plugins | none today. Reimplement in an AudioWorklet | (a) for Airwindows code, (c) for the true-peak method (BS.1770; standard text not opened, summary at https://www.mathworks.com/help/audio/ref/loudnessmeter.html), (d) for the commercial references |
| 3 | Band-limited / multiband widener with mono-below crossover | No source for Ozone Imager, MSED, bx_digital V3 or Waves S1. Surge XT has a Mid-Side Tool (search summary) | Surge XT GPL-3.0 (fetched, round 1). Others closed | none today. Buildable from native nodes (see section 2) | (c) for mid/side and Haas decorrelation (Ozone Imager docs, fetched in round 1), (b) for Surge, (d) for the rest |

Parameters of the closed devices, mapped to the spec shape `{min, max, value, unit}`. Ranges that come from a source say so. Ranges I chose are marked "proposed".

Limiter (what LoudMax / TDR / Pro-L 2 expose, mapped to our names):
- `threshold` {min -30, max 0, value -3, unit dB}: already in the studio.
- `ceiling` {min -12, max 0, value -0.6 (proposed new default -1 for the release profile, -0.2 for fitting), unit dB}: already in the studio. Ozone 9's docs suggest -0.3 dB with dither and -0.6 to -0.8 dB before mp3/aac (search summary, round 1).
- `release` {min 0.01, max 1, value 0.08, unit s}: already in the studio.
- `lookahead` {min 0.0005, max 0.005, value 0.00125, unit s} (proposed range; the default is LoudMax's 1.25 ms, search summary, round 1).
- `truePeak` {min 0, max 1, value 1} on/off (the Ozone and Pro-L 2 option, proposed as a switch).
- `drive` (input gain) {min 0, max 18, value 0, unit dB} (proposed; no source gives a range, but loudness cannot be set without it).

Widener (what Ozone Imager, MSED, bx_digital and Waves S1 expose):
- `width` {min 0, max 3, value 1}: already in the studio. Waves S1 Imager width is described as 0 to 3.0 in a competitor's blog (search summary: https://rysupaudio.com/blogs/news/waves-s1-stereo-imager-alternatives; the blog sells a rival, so unconfirmed against Waves).
- `monoBelow` {min 20, max 500, value 150, unit Hz} (proposed). Brainworx's Mono Maker "makes bass frequencies mono only" (search summary: https://www.uaudio.com/uad-plugins/equalizers/brainworx-bx-digital3.html). O1 measured correlation 1.00 below 150 Hz in mainA (from O1, M7), which is where the default comes from.
- Ozone Imager band widths run -100 to +100 per band, up to four bands, with Link Bands (fetched, round 1). In our names that is `width.low`, `width.lowMid`, and so on, if the owner wants more than one crossover.
- `stereoize` {min 0, max 1, value 0}: Ozone's Haas-based Stereoize, Mode I (fetched, round 1).

Meter (new device, no closed original): `bands` {min 4, max 64, value 8} and `window` (correlation averaging time, proposed {0.05, 2, 0.4, s}); Voxengo Correlometer lists 4 to 64 bands and adjustable averaging time and band Q (search summary, round 1).

### O1 Q12 (the O2 version): can libebur128's K-weighting and true peak be described well enough to reimplement in a worklet, or is a WASM build needed?

K-weighting and gating: yes, a worklet is enough. I fetched `ebur128.c` from the martingasser fork (fetched: https://raw.githubusercontent.com/martingasser/libebur128/master/ebur128/ebur128.c). The fetch tool returns a model summary of the file, so check the constants against the file before relying on them. It reports:
- Stage 1 (high shelf): f0 = 1681.974450955533 Hz, G = 3.999843853973347 dB, Q = 0.7071752369554196; K = tan(pi*f0/fs), Vh = 10^(G/20), Vb = Vh^0.4996667741545416, with a0 = 1 + K/Q + K^2, b0 = (Vh + Vb*K/Q + K^2)/a0, b1 = 2(K^2 - Vh)/a0, b2 = (Vh - Vb*K/Q + K^2)/a0, a1 = 2(K^2 - 1)/a0, a2 = (1 - K/Q + K^2)/a0.
- Stage 2 (RLB high-pass): f0 = 38.13547087602444 Hz, Q = 0.5003270373238773, numerator {1, -2, 1}, a1 = 2(K^2 - 1)/(1 + K/Q + K^2), a2 = (1 - K/Q + K^2)/(1 + K/Q + K^2).
- The two are multiplied into one 5-tap filter. Coefficients are recomputed per sample rate through K, matching the README's "supports all samplerates by recalculation of the filter coefficients" (fetched).
- Blocks: 400 ms momentary, a new block every 100 ms (75 percent overlap), short-term 3 s window with a new value each second; absolute gate at -70 LUFS (energy threshold 10^((-70 + 0.691)/10)), relative gate -10 LU; loudness range uses a -20 LU relative cutoff.

True peak: not fully specified by the README or this fetch. The code oversamples by 4 below 96 kHz, 2 below 192 kHz, 1 above, but does the filtering through the Speex resampler (quality 8) when that is compiled in, and the fetch did not show the fallback interpolator. So the filter taps are not in my sources. A worklet needs its own 4x polyphase low-pass; MathWorks' summary gives the target (half-polyphase length 12, 80 dB stopband; search summary, round 1). I recall that BS.1770 Annex 2 lists a 48-tap filter, but I did not see it and it is unverified. Plan: design the filter, then check the result on test signals against libebur128 and Youlean to within about 0.1 dB. If that fails, compile libebur128 to WASM (it is portable ANSI C, MIT). WASM in a worklet adds a vendored binary, which O2's decision 6 says needs the owner's agreement.

### O2 Q3 (to S1, S2, S3, S4): which of my parameters plausibly move over time, at what resolution, and how to measure

| Parameter | Moves in the reference? | Resolution | Measurement |
|---|---|---|---|
| Limiter threshold, ceiling, release | No evidence of change. Loudness varies because the mix content varies | none (static) | Short-term LUFS and true peak per section, then per bar. O1 gave only integrated, max short-term and crest per section; per-section LUFS is not in the report, so ask O1 for it |
| Widener `width` (or the stab/mix width) | Yes, by section. Full-mix correlation 0.85 in the break vs 0.93 to 0.95 in the mains; 1 to 4 kHz is 0.32 in the break vs 0.65 in mainA (from O1, M7) | per section; check per bar in the break because it may build | Per-band correlation per bar with the O2 Q12 procedure |
| `monoBelow` | No. Correlation is 1.00 below 150 Hz in mainA (from O1, M7); break not reported | none (static) | Same procedure on the break and intro |
| Chorus rate, depth | Rate and depth, no evidence. The LFO is the movement. `mix` could change by section | per section | Not separable from reverb and delay width without stems |
| Master loudness into the limiter | Yes, through the master highpass ramp in `song.js` (24 to 500 Hz in builds), which removes low-frequency energy and so lowers short-term loudness | continuous within a build | Short-term LUFS per second across builds |

Section `set`/`ramp` is enough for my parameters. I see no need for per-point automation lanes from the limiter or width side.

### O2 Q12a (to S4): procedure for per-band L/R correlation, to replace the single 0.41

This extends O1's M7, which used four bands and three windows.
1. Grid. Use O1's corrected grid: T0 = 0.568 s, 126 BPM, one 16th = 5,250 samples at 44.1 kHz (from O1, M0). Do not decode to another rate before folding.
2. Bands. Nine octave-wide bands (edges in Hz): 20, 60, 150, 300, 600, 1200, 2400, 4800, 9600, 16000. These split the sub, the kick body, the stab band (300 to 2400, so the 0.41 band is covered) and the hat and clap region. Use the same zero-phase filter on both channels (for example a 4th-order Butterworth applied forward and backward), so the filter adds no L/R phase difference of its own.
3. Statistic. Per band, per window: rho = sum(L*R) / sqrt(sum(L^2) * sum(R^2)). Aggregate across steps and bars by summing the three sums first, then dividing. Do not average correlation values; that weights silent windows as much as loud ones.
4. Windows (as in O1): onset 0 to 30 ms and tail 60 to 115 ms after each step, and the whole 16th. Run them per step number, so stab steps (2, 6, 7, 10, 14, 15) and non-stab steps are separate.
5. Companion numbers: side-to-mid energy ratio in dB per band, and the mono-sum loss in dB, which for roughly equal channel levels is 10*log10(1 + rho) below the power sum (derived). These are easier to read than rho in quiet bands.
6. Reporting: a table by section (intro, build, mainA, mainA2, break, mainB, outro) by band by window. That replaces 0.41 with a profile, and the break row shows what changes.
7. Controls: run the same script on the studio render and on the reference. Check one band by hand with a known pair (identical noise on both channels must give 1.0, independent noise about 0).
8. Caveat: the reference is a 192 kbps MP3 (from O1). Lossy joint-stereo coding can change side content at high frequencies (recalled, not verified), so I would trust the bands below 4.8 kHz more.

For a desktop cross-check, Voxengo Correlometer gives multiband correlation with adjustable averaging time (search summary, round 1), but only time-averaged, with no step-aligned onset and tail.

## 2. Revisions to my round 1

1. Limiter and loudness targets (replaces my blog-based -9 to -8 LUFS).
   - Fitting profile: integrated -10.7 LUFS, max short-term about -9.5, sample peak about -0.2 dBFS, true peak up to about 0.0 dBTP, PLR about 10.7 dB, crest 10.6 to 14 dB by section (all from O1, M9).
   - Release profile: ceiling -1 dBTP.
   - The studio's -0.6 dB ceiling is between the two and neither.
   - Add a drive (input gain) parameter and a true-peak meter before tuning; the native node cannot report true peak.
   - Re-fit loudness after the kick is corrected (see section 3).
2. Meter first. My round-1 ranking put measurement tools first and that stands, but the order of work changes: the loudness and correlation meter device (libebur128 method, filter constants above) comes before any limiter work, because without it the limiter has no scored target. This agrees with O2's call for a metering device.
3. Widener: make it band-limited, cheaply. With native nodes only: high-pass the side signal (M and S already exist inside `BUILD.widener`) at a `monoBelow` corner before the `width` gain, then L = M + w*HP(S), R = M - w*HP(S). Below the corner the output is mono for every width; above it the side is scaled by w. It adds one or two `BiquadFilterNode`s (two cascaded for a steeper slope), so `selfcheck.js` should need no new stub, though I have not run it. Two cautions. Web Audio's lowpass and highpass `Q` is in dB, not linear (from O2's spec reading), so a Butterworth response needs Q = -3.01 dB, not 0.707; the studio filter default of 0.7 would read as +0.7 dB of resonance. And a 12 dB/octave slope at 150 Hz still passes some side energy at 100 Hz, so use two stages if the sub must be exactly mono.
4. Correction to my round 1: in the present song the widener does not widen the sub. It sits only on the stab, whose own highpass is 180 Hz (`song.js`), and its width is 1.1, so its effect is about +10 percent side. The fault O1 flagged is real in the processor (it is broadband), but it is a hazard for future use, not today's problem. Today's stab width comes from spread and detune, not from the widener.
5. Stab width target changes from "0.41" to the measured profile. By the derivation in Q6, the song's `spread: 0.5` has a long-run floor near 0.71 for a decorrelated saw pair, while the measured tail is 0.29 to 0.46. Prediction to test: a `spread` near 0.73 gives about 0.41 in the tail, and the onset needs a decorrelator (chorus or per-voice start phase) to get to about 0.5. The test is a render of `BUILD.stab` at those settings measured with the procedure above.
6. Chorus is lower priority. No track in `song.js` uses it. It stays on the list as the candidate decorrelator for the stab onset, with the changes I named in round 1: a high-pass on the wet path, a micro-pitch or detune element if wanted, and a mono-sum check. The mix-to-correlation relation in Q6 gives a first setting to try (mix about 0.5 to 0.55).
7. Mid-side and imaging references, now searched. Search summaries only:
   - Brainworx bx_digital V3: 11-band mid/side EQ with a Mono Maker and stereo widener, L/R balance and correlation meters; included in Plugin Alliance CORE and PRO subscriptions; price not found (search summary: https://plugin-alliance.com:443/en/products/bx_digital_v3.html, https://www.uaudio.com/uad-plugins/equalizers/brainworx-bx-digital3.html, https://www.pluginboutique.com/products/10253-bx-digital-V3).
   - Waves S1 Stereo Imager: suite of Imager, Shuffler and MS Matrix; the Shuffler widens selected low frequencies and keeps mono compatibility; Waves warns S1 can create new peaks even at neutral settings; list price $129 in a search summary seen 2026-10-23, approximate, possibly out of date (search summary: https://www.pluginboutique.com/product/2-Effects/27-Stereo-Width/13667-S1-Stereo-Imager, https://josephnilo.com/blog/waves-s1-stereo-imager-explained/, https://ask.audio/articles/five-tools-to-help-you-master-your-soundstage/waves-s1).
   - The S1 point matters for the limiter: width processing placed after the limiter can raise peaks. The widener belongs before the master limiter.

## 3. On my partner's report (H4)

Where drum design and the master limiter and width must agree:

1. Kick drive is the peak clipper. O1's simulation says the kick's tanh drive flattens its peak. H4's drum work does not touch the kick, but the clap and hats add the transients that survive the limiter. Fix the kick first (O1/H1), then set the limiter, then check the clap and hat levels. If the order is reversed, each fix re-opens the other.
2. Hat and clap width against the target. The reference's correlation above 4 kHz is 0.84 and 1 to 4 kHz is 0.65 in mainA (from O1, M7). The studio pans hat_open +0.08 and hat_closed -0.08, so both are near centre; unless their noise is generated per channel, their correlation will be close to 1.0 (derived, not rendered). The clap's width comes from its reverb send of 0.25 (`song.js`), which is a decorrelated tail. If a render shows the high band too narrow, the fix is a decorrelated noise source per channel in the hat and clap, or the high-band side gain in the widener, and that decision belongs to H4 and me together.
3. The break is the widest section (1 to 4 kHz correlation 0.32, from O1). H4 did not cover the shaker and perc, which are the breakdown percussion. In `song.js` the perc is panned -0.3 with a delay send of 0.3, so ping-pong repeats widen it. These two tracks may carry much of the break's width, so they are worth measuring before widening anything else.
4. Limiter's HF behaviour. Limiter No6 and TDR Limiter 6 GE include a separate high-frequency limiter (search summaries, round 1). With the hat energy in the mains (4 to 16 kHz at -17.7 dB against the low band, from O1, M9), a single broadband limiter will duck the whole mix on hat peaks. If gain reduction on hats is audible in the studio render, a band-split or HF-limiter stage is the standard answer.
5. Choke. H4 says the open and closed hat choke is a sequencer rule. Agreed. It also lowers coincident peaks, so it slightly lowers the master's peak demand; it has no effect on width.

What I would correct or update in H4:
- H4 lists the Tone.js licence as "not found". H3 fetched the Tone.js repo and records MIT, and O1's licence list agrees (O1 round 2). H4's Tone.js MetalSynth row can move to permissive.
- H4's Plaits licence (MIT for STM32 code, GPL-3.0 for AVR code, CC-BY-SA for hardware) comes from an excerpt whose page was not identified; I would keep it labelled unverified. No Plaits source was fetched in the round-1 files I read.
- H4's first open question (synthesised or sampled hats) matters to the limiter in one way: a 6-bit, 18 kHz sample hat (Polynominal excerpt in H4's file) has a different peak and high-frequency profile from a synthesised one. I cannot tell which from the reference with the numbers we have.
- I have no objection to H4's ranking. H4 itself says no page was opened, so every H4 row is a search summary; I treat it that way.

## 4. Still open

Searched this round (search summaries unless noted):
- Faust limiters. The official compressors.lib page lists a "Lookahead Limiters" section and the prefix `co` (search summary: https://faustlibraries.grame.fr/libs/compressors/). The page would not load (host lookup failed), so I did not see `limiter_lad_mono`'s signature, its look-ahead behaviour or the licence. Not found. A Bela forum post shows library limiters defined as preset compressors (search summary: https://forum.bela.io/d/1381/8). Whether a Faust limiter runs in an `OfflineAudioContext` through FaustWasm is H5's area (O1 Q11).
- Airwindows. The repo says "all the Airwindows audio open source code" and links an MIT licence; I did not see the licence text. It is read-only, with a `plugins` folder (fetched: https://github.com/airwindows/airwindows). A search summary says Johnson publishes some plugins as MIT and names Acceleration as an open limiter; the LV2 port README says some, not all, are open (search summary: https://code.volse.net/audio/plugins/airwindows-lv2-port.git/about/plugins/LV2/README.md). Not found: whether a clipper such as ADClip is in the open set, and whether the DSP is portable enough to translate.
- Brainworx bx_digital V3 and Waves S1: see section 2, item 7. Pages were search summaries. No price found for bx_digital.

Not resolved, and why:
1. Where the 0.0 dBTP comes from (codec or deliberate). Needs the pre-encode master, which we do not have.
2. What the studio's current render measures: loudness, true peak, per-band correlation. Needs a browser or Playwright run (O1's P1; CLAUDE.md says no such script is committed). Every "the studio would measure X" above is derived, not rendered.
3. The true-peak filter taps (see Q12). The Speex path in libebur128 hides them, and I did not see the BS.1770 annex.
4. The Juno-60 chorus delay times, and whether the "modes may be flangers" caveat in H3's file changes the decorrelation estimate.
5. Whether the studio's `BUILD.delay` sends echo 1 to one side only; I did not re-read it.
6. The 9.75 Hz mono chorus mode and the right-channel inversion are H3's fetched facts; I have not checked them against a second source.
7. Prices: Pro-L 2, Ozone, Youlean Pro, Klangfreund and bx_digital: not found.

Questions back to the Opus agents:
- (to O1) Per-section short-term LUFS and the per-section PLR for the reference, so the limiter fit can be scored per section, not only overall.
- (to O1) Can your correlation script be run in the same step-aligned form (nine bands, onset and tail windows) on a studio render, so the stab-width prediction (`spread` near 0.73, or chorus mix about 0.5 to 0.55) is tested before any code changes?
- (to O2) A worklet meter needs the filter constants above in a vendored file. Is a file of constants plus a small worklet acceptable under decision 6 ("allow worklets"), or does the true-peak stage force a WASM binary?

## Sources

Fetched this round:
- https://raw.githubusercontent.com/martingasser/libebur128/master/ebur128/ebur128.c (summary returned by the fetch tool)
- https://github.com/martingasser/libebur128 (file listing only)
- https://github.com/airwindows/airwindows

Search results seen this round (page not opened, or fetch failed):
- https://faustlibraries.grame.fr/libs/compressors/
- https://forum.bela.io/d/1381/8
- https://code.volse.net/audio/plugins/airwindows-lv2-port.git/about/plugins/LV2/README.md
- https://www.airwindows.com/page/107/
- https://plugin-alliance.com:443/en/products/bx_digital_v3.html
- https://www.uaudio.com/uad-plugins/equalizers/brainworx-bx-digital3.html
- https://www.pluginboutique.com/products/10253-bx-digital-V3
- https://www.pluginboutique.com/product/2-Effects/27-Stereo-Width/13667-S1-Stereo-Imager
- https://josephnilo.com/blog/waves-s1-stereo-imager-explained/
- https://rysupaudio.com/blogs/news/waves-s1-stereo-imager-alternatives
- https://ask.audio/articles/five-tools-to-help-you-master-your-soundstage/waves-s1

Carried over from my round 1 (same status as marked there): https://github.com/andrewrk/libebur128 (fetched), https://s3.amazonaws.com/izotopedownloads/docs/ozone9/en/imager/index.html (fetched), https://github.com/surge-synthesizer/surge (fetched), https://www.mathworks.com/help/audio/ref/loudnessmeter.html, https://www.voxengo.com/product/correlometer, https://npmjs.com/package/@domchristie/needles, https://rekkerd.org/thomas-mundt-updates-loudmax-and-luveler-free-plugins, https://www.musicradar.com/reviews/tokyo-dawn-labs-limiter-6-ge (all search summaries except where marked fetched).

Other agents' files used: round2-O1.md (measurements M0 to M9, questions), round2-O2.md (spec readings, questions, decisions), round1-H4-drums.md, round1-H3-stab-pad.md (Juno chorus analysis, stab code), round1-S1-sidechain-compression.md (compressor internals), round1-S2-delay-reverb.md (delay routing). Local files: `olde Havantechno dub studio/song.js` and `processors.js`.
