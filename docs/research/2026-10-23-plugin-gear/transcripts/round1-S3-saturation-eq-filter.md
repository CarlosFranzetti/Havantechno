# S3: Saturation, EQ and filters — round 1
Agent model: Sonnet. Date: 2026-10-23.

How to read the verification marks. WebFetch could reach github.com only; every other host failed with a DNS error (rekkerd.org, w3.org, vicanek.de, fabfilter.com, soundtoys.com, bedroomproducersblog.com). The web-search budget ran out part-way through (a shared per-turn limit), so four planned searches never ran. Therefore:

- `(verified: <url> [fetched])` means I read that page myself. Only the two GitHub pages qualify.
- `(verified: <url> [search summary])` means the URL appeared in a search result and the fact comes from the search tool's summary of it. I did not read the page. Treat it as second-hand.
- `(unverified)` means no source in this session showed it.

## Scope

Saturation (tape, tube, console, multiband), EQ (analogue emulations, dynamic, linear-phase, matching), filters (DJ and performance filters with resonance and drive), DAW built-ins, and the published algorithms behind them. Specific attention to anything that helps with the known problem that the studio's 300 Hz to 1 kHz band sits several dB hotter than the reference.

## What the reference track needs from this category

From the analysis table in `docs/superpowers/specs/2026-10-21-guidance-studio-design.md` and the code:

- **The open problem.** After tuning, the renders match the reference within about 1 dB in the 20 to 300 Hz band, but "the 300 Hz to 1 kHz band still sits several dB hotter than the reference in every section" (spec, "Tuning decisions"). The spec does not say which elements cause it. Candidates that overlap that band: the mid bass (B2, ~123 Hz fundamental plus harmonics), the chord stab, the pad, the clap body, and the saturator and master EQ.
- **Current studio gear in this category.**
  - `BUILD.saturator`: a single static `tanh` WaveShaper curve, `k = 1 + drive*40`, normalised by `tanh(k)` (`studio/core.js` `shaperCurve`). It is symmetric, so it adds odd harmonics only. It has `oversample = '2x'`, a lowpass "tone", and a wet/dry mix.
  - `BUILD.eq3`: lowshelf, peaking and highshelf biquads in series.
  - `BUILD.filter`: one `BiquadFilterNode`, so 12 dB/oct slopes for lowpass and highpass, and no drive.
  - The master chain is eq3 (+1.5 dB at 90 Hz low shelf, -1 dB at 400 Hz Q 0.8, +1 dB at 8 kHz high shelf), then highpass at 24 Hz, then lowpass, then glue compressor, then saturator (drive 0.12, mix 0.5), then limiter.
  - The mid bass has an eq3 insert (`song.js`: +2 dB low shelf at 200 Hz, high shelf -8 dB at 1500 Hz).
  - Section automation sweeps `master.hp.cutoff` (24 to 500 Hz) and `master.lp.cutoff` (20 kHz to 1200 Hz), which is a DJ-style filter move on a plain biquad.
- **What is therefore missing** (my reading of the code, not a measurement):
  - A tool to find where the excess energy comes from, per element and per band.
  - A correction curve derived from the reference rather than set by ear. The master mid cut of -1 dB at 400 Hz is the only 300 Hz to 1 kHz correction at the master. It is small compared with "several dB".
  - Asymmetric (even-harmonic) saturation.
  - Steeper filter slopes with resonance and drive for the sweep sections.

## Findings

Marks are as defined at the top.

### Saturation

| Name | Vendor | Licence | Formats | Relevance | Verified source |
|---|---|---|---|---|---|
| Decapitator | Soundtoys | commercial (price not found) | not found in what I saw | Standard "analogue saturation" reference. Five Styles named A, E, N, T, P. Per the summaries these model Ampex 350 preamp (A), Chandler/EMI TG channel (E), Neve 1057 (N), Thermionic Culture Vulture in triode mode (T) and pentode mode (P). Controls: Drive, Low Cut, High Cut, Tone, Mix, Punish. A reviewer says T leans even-order and P odd-order. Algorithm proprietary. A Music Guy Mixing article says no updates beyond compatibility fixes since release | (verified: https://www.soundtoys.com/wp-content/uploads/Decapitator-Manual.pdf [search summary]); (verified: https://www.musicguymixing.com/decapitator-style/ [search summary]); (verified: https://barryrudolph.com/newtoys/toys7/soundtoysdecapitator.html [search summary]) |
| Saturn 2 | FabFilter | commercial (price not found) | not found in what I saw | The standard multiband saturator. Up to six bands. Crossover slopes: sources disagree on the exact list (one says 6/12/24/36/48 dB/oct, another 6/12/24/48). Linear-phase option. Per-band Drive, Mix, Feedback, Dynamics, Tone, Level. HQ modes "Good" (8x oversampling) and "Superb" (32x). 28 distortion styles including tube and tape. Later "Subtle" styles for mastering. Modulation sources (XLFOs, envelope followers). Algorithm proprietary | (verified: https://sonicstate.com/news/2020/05/20/fabfilter-releases-fabfilter-saturn-2 [search summary]); (verified: https://www.fabfilter.com/news/1589878800/fabfilter-releases-fabfilter-saturn-2-distortion-and-saturation-plug-in [search summary]); (verified: https://www.toolfarm.com/?p=16623 [search summary]) |
| Chow Tape Model | Chowdhury DSP (Jatin Chowdhury) | free and open source (the specific licence: not found) | one listing names VST3, AU, AAX, CLAP, LV2 and standalone | The most credible published tape model. Physical model with hysteresis; controls for bias, drive, saturation, wow and flutter. Basis is the DAFx 2019 paper "Real-Time Physical Modelling for Analog Tape Machines". Source repository named in the listing: `https://github.com/jatinchowdhury18/AnalogTapeModel` (I did not fetch it). Manual: `https://chowdsp.com/manuals/ChowTapeManual.pdf` (not fetched). The hysteresis solve is heavy for a main-thread browser design; would need an AudioWorklet | (verified: https://synthanatomy.com/2020/07/chow-tape-model-free-open-source-tape-saturation-plugin-for-pc-mac.html [search summary]); (verified: https://audiotechnology.com/?p=78166 [search summary]) |
| Airwindows (Density, Console family, Hard Vacuum) | Airwindows (Chris Johnson) | free, MIT licence, "no DRM" | several formats incl. AU/VST on Mac, Windows, Linux (Pi) per the EveryConsole listing | The best-documented source for small, reimplementable saturation maths. Density: transfer function is a sine curve, described as the smoothest saturation; can be run "in reverse". EveryConsole bundles the original Console, Console6, Console7, and the sin()/asin() routine used in Console8 and PurestConsoles. Hard Vacuum is tube-style. A sine or asin transfer function maps directly onto a `WaveShaperNode` curve (for static curves). Whether the source is also on GitHub: not found | (verified: https://www.airwindows.com/density3/ [search summary]); (verified: https://www.airwindows.com/everyconsole/ [search summary]); (verified: https://bedroomproducersblog.com/2026/09/30/airwindows-consolex3/ [search summary]); (verified: https://airwindows.com/page/115 [search summary]) |
| IVGI 2 | Klanghelm | freeware (closed source) | VST, VST3, AU, AAX per reviews; Windows and macOS | Small asymmetric saturator: Drive, Asym Mix (symmetry), X-Talk, Response. Described as lightweight version of the paid SDRR. Calibrated 0 VU = -18 dBFS. Current version on the vendor page: 2.5.0. Relevant because the studio's curve is symmetric; IVGI's Asym control is the missing even-harmonic feature | (verified: https://klanghelm.com/contents/products/IVGI [search summary]); (verified: https://www.bonedo.de/artikel/klanghelm-ivgi-test [search summary]) |
| Saturation Knob | Softube | free, but needs a Softube account and a licence; sources conflict on whether an iLok is needed (current page lists iLok) | AU, VST, VST3, AAX | One-knob saturation with three modes: Keep Low, Neutral, Keep High. "Keep Low" focuses the distortion on mids and highs to protect the low end, which is the behaviour wanted on a mid-heavy element. Closed | (verified: https://www.softube.com/saturationknob [search summary]); (verified: https://www.softube.com/free-plug-ins [search summary]) |
| Saturator | Ableton Live (DAW built-in) | part of Live (price not found) | Live only | Waveshaper with named curves: Analog Clip (default), Soft Sine, Medium Curve, Hard Curve, Sinoid Fold, Digital Clip, and a Waveshaper mode with Curve and Depth controls. A good template for a curve-selector UI on the studio saturator. The Max package `abl.dsp.saturator~` documents numeric mode values but I saw no evidence the source is open | (verified: https://ask.audio/articles/saturator-ableton-lives-secret-sound-design-weapon [search summary]); (verified: https://docs.cycling74.com/reference/abl.dsp.saturator~ [search summary]); (verified: https://www.soundonsound.com/techniques/distortion-effects-live [search summary]) |

### EQ: dynamic, linear-phase, matching

| Name | Vendor | Licence | Formats | Relevance | Verified source |
|---|---|---|---|---|---|
| Pro-Q 4 | FabFilter | commercial. Approx. $199 (listed as discounted from $249) on one retailer page seen 2026-10-23; may be out of date | not found in what I saw (retailer notes surround formats up to 9.1.6 Atmos) | The standard mix EQ. Any bell or shelf band can be dynamic, at any slope, including in linear-phase mode. Version 4 adds attack and release to the dynamic bands and a "Spectral" dynamic mode that acts on frequencies inside the band. Phase modes: linear phase (adjustable latency per one retailer), zero latency, Natural Phase. Pre/post/external spectrum analyser. Spectrum Grab. EQ Match: per the listings it matches the spectrum of another Pro-Q 4 instance or an external signal, takes about a minute, and adds EQ bands so the input follows the reference. The listings do not describe the controls; check the manual. Algorithm proprietary | (verified: https://moogaudio.com/products/fabfilter-pro-q-4 [search summary]); (verified: https://store.acoustica.com/third_party_plugins/fabfilter-pro-q-4 [search summary, price]); (verified: https://www.zzounds.com/item--FABPROQ [search summary]); (verified: https://www.pluginboutique.com/products/14125 [search summary]) |
| Ozone (Match EQ module, Tonal Balance Control) | iZotope | commercial (price not found) | not found in what I saw | Ozone 9 (2019) reworked Match EQ: matches to a reference track from a session or file, uses over 8000 bands, can target part of the spectrum, saves results as presets. Tonal Balance Control 2 compares a track with targets built from many masters. I did not find newer-version information. Master Assistant can load a reference. I found nothing for a feature called "Assistive Listening" | (verified: https://audioxpress.com/news/izotope-releases-ozone-9-mastering-software-with-improved-machine-learning-features [search summary]); (verified: https://www.pro-tools-expert.com/production-expert-1/izotope-release-ozone-9 [search summary]); (verified: https://musictech.com/reviews/plug-ins/izotope-ozone-9/ [search summary]) |
| CurveEQ | Voxengo | commercial | AAX, AU, VST | Spline EQ with a "SPAN-like" analyser. The vendor lists spectrum matching: transfers the spectrum shape of one recording to another, usable for reducing frequency-balance differences between tracks. Dated price reports: $89.95 USD, and a 2018 sale at $55 until 2 Jan 2019 (regular $79.95). Those are old; current price not found | (verified: https://voxengo.com/curveeq [search summary]) |
| Spectrum Thief | Ghost Note Audio | free, no account or activation | VST3 and AU; Windows and macOS (mid-2025 coverage) | The most direct fit for the problem. Captures two frequency responses (source and reference), generates a filter that moves the source toward the target, offers smoothing and low/high roll-offs, can swap source and target, and exports the result as an impulse response. Closed or open source: not found | (verified: https://rekkerd.org/spectrum-thief-free-eq-match-and-ir-generator-plugin-by-ghost-note-audio/ [search summary]); (verified: https://bedroomproducersblog.com/2025/07/16/ghost-note-audio-spectrum-thief/ [search summary]); (verified: https://polarity.me/posts/polarity-music/2025-08-07-spectrum-thief-eq-match-plugin-with-ir-export/ [search summary]) |
| ZL Equalizer | ZL Audio | open source, AGPL-3.0 on the repository page I fetched; a search summary said GPL v3, so check the LICENSE file | VST3 and LV2 build examples; AAX buildable (needs PACE signing); AU: not described | Dynamic EQ, default 24 bands (build variable `ZL_EQ_BAND_NUM`). The fetched README does not mention phase modes or EQ match. A search summary of a review says ZL Equalizer 2 is Pro-Q-style with dynamic bands, multiple phase modes, collision detection and EQ match. I could not tell which repo version I fetched, and I could not confirm that claim from a primary page. Releases section empty on the page I saw. A separate "ZL Spectrum Equalizer" (FFT, up to 24 linear-phase bands) was reported in August 2026 | (verified: https://github.com/ZL-Audio/ZLEqualizer [fetched]); (verified: https://bedroomproducersblog.com/2024/03/22/zl-equalizer/ [search summary]); (verified: https://bedroomproducersblog.com/2026/08/02/zl-spectrum-equalizer/ [search summary]) |
| FreeEQ8 | GareBear99 (individual GitHub project) | open source, GPL-3.0 | VST3 and AU (macOS), VST3 and standalone (Windows), VST3 (Linux) | Claims 8 bands, 12/24/48 dB/oct slopes, linear phase, dynamic EQ, Match EQ, per-band tanh drive, M/S, 1x to 8x oversampling, 4096-point analyser. README is candid about weaknesses: 2048 samples latency in linear-phase mode, poor low-frequency accuracy in linear phase, a paid "ProEQ8" upgrade that is not purchasable, a licence-key secret exposed in the repo. 49 stars, 6 forks at fetch time. Claims are self-reported. Treat as unproven, but the code is readable | (verified: https://github.com/GareBear99/FreeEQ8 [fetched]) |
| Nova | Tokyo Dawn Labs | free (a paid Nova GE edition exists, with more bands and dynamics modes) | sources disagree: one says VST3, AAX and Apple Silicon; another says VST2, VST3, AAX, AU | Four dynamic bands plus highpass and lowpass; parallel dynamics per band; spectrum display. Good for the "hot only when loud" form of the 300 Hz to 1 kHz problem. Closed. Not a matching tool | (verified: https://production-expert.com/production-expert-1/free-plugin-tdr-nova?format=amp [search summary]); (verified: https://blog.dubspot.com/plugins/tdr-nova [search summary]) |

### EQ: analogue emulations

| Name | Vendor | Licence | Formats | Relevance | Verified source |
|---|---|---|---|---|---|
| Luftikus | lkjb Plugins | freeware (one summary calls it open source; I did not confirm) | VST and AU, Windows and Mac | Fixed half-octave bands at 10, 40, 160 and 640 Hz, a 2.5 kHz shelf and a boost-only high shelf (2.5, 5, 10, 20, 40 kHz). Based on an analogue EQ design. A KVR commenter says it does not model analogue nonlinearities. Useful as a design reference for a fixed-frequency "musical" EQ, not for correcting a specific band | (verified: https://rekkerd.org/lkjb-plugins-luftikus-free-eq-plugin-v1-2-1/ [search summary]) |
| Pultec Passive EQ Collection | Universal Audio | commercial, paid (price not found); per listing covers EQP-1A, MEQ-5, HLF-3C | native plugin download | The standard Pultec-style emulation. Algorithm proprietary | (verified: https://m.thomann.de/pt/universal_audio_pultec_passive_eq_coll._native.htm [search summary]) |

Free Pultec-style plugins named only inside a search summary: Ignite Amps (a free Pultec emulation) and Analogue Obsession "Poortec" (free, January 2025, uses a Fairchild-style line amp after the passive EQ). I did not see the individual product pages. (unverified)

### Filters: DJ, performance, resonance and drive

| Name | Vendor | Licence | Formats | Relevance | Verified source |
|---|---|---|---|---|---|
| Auto Filter | Ableton Live (DAW built-in) | part of Live (price not found) | Live only | Five circuit modes (Live 11 manual): Clean (same as EQ Eight, CPU-efficient), OSR (state-variable, resonance limited by a hard-clipping diode), MS2 (Sallen-Key with soft clipping, LP and HP only), SMP (custom, between MS2 and PRD, LP and HP only), PRD (ladder, no explicit resonance limiting, LP and HP only). A Drive control appears on LP, HP and BP in any non-Clean circuit. 12 or 24 dB slopes. Circuits added in Live 9.5, developed with Cytomic. A MusicRadar item says Live 12.2 extended Auto Filter (comb, vowel; list truncated in my result). This is the clearest template for how a DJ-style filter sweep should behave | (verified: https://www.ableton.com/en/live-manual/11/live-audio-effect-reference/ [search summary]); (verified: https://www.musicradar.com/music-tech/daws/ive-been-a-live-user-for-around-20-years-and-its-probably-the-effect-i-turn-to-most-regularly-ableton-live-12-2-gives-this-incredibly-versatile-device-a-much-needed-refresh-and-rectifies-push-3s-most-notable-missing-feature [search summary]) |
| FilterShaper XL | Cableguys | commercial. A review noted an introductory $49 (from $79) at the September 2023 launch; current price not found | not found in what I saw | 20 filter types in Warm and Clean families. Warm filters are inspired by a Sallen-Key semi-modular synth filter and have "Resonance Drive" inside the resonance loop (soft and hard modes), plus a Safe mode limiting resonance and an off switch for self-oscillation. Drive is switchable pre- or post-filter. Any two filters in series or parallel. Rhythmic shaping is its main selling point, which is relevant to the filter sweeps in Guidance's build and break sections | (verified: https://cableguys.com/filtershaper-xl [search summary]); (verified: https://www.soundonsound.com/news/cableguys-release-filtershaper-xl [search summary]); (verified: https://www.pluginboutique.com/products/11111-FilterShaper-XL [search summary]) |
| Filter, Nonlinear Filter, Ladder Filter (Snapins) | Kilohearts | commercial or bundled (price not found) | plugin versions and Snap Heap host | Filter has 7 modes: low pass, band pass, high pass, notch, low shelf, peak, high shelf, with Q and Gain. I found no slope setting or drive control on it. Nonlinear Filter colours the signal in its other modes. Distortion Snapin has five shapes. Snap Heap hosts Snapins in four lanes | (verified: https://kilohearts.com/products/filter [search summary]); (verified: https://kilohearts.com/docs/snapins [search summary]) |
| Surge XT | Surge Synth Team | open source (licence: not found in my results) | plugin, standalone; formats not confirmed | Not an effect, but its filter set is an open reference: K35 and Diode Ladder types credited to Odin 2, 12 and 24 dB/oct multimode filters credited to OB-Xd, and "Cutoff Warp", "Resonance Warp" and "Tri-Pole" by Jatin Chowdhury. Also a 43-shape Waveshaper. The summaries say its filters self-oscillate with excitation. Each borrowed filter may carry its own licence; I did not check | (verified: https://www.audiotechnology.com/free-stuff/vember-audio-surge-synthesiser-surge-xt [search summary]); (verified: https://www.synthtopia.com/?p=127913 [search summary]) |

### Algorithms that are published

| Name | Author | Licence | Relevance | Verified source |
|---|---|---|---|---|
| Audio EQ Cookbook | Robert Bristow-Johnson (W3C Working Group Note) | text document | Biquad formulas for LPF, HPF, peaking, shelves, via bilinear transform with frequency warping. Gives the coefficients behind a peaking/shelf EQ, so any EQ curve could be fitted offline and realised with `BiquadFilterNode`, or with `IIRFilterNode` using the same coefficients. I did not retrieve the formulas themselves in this session | (verified: https://www.w3.org/TR/audio-eq-cookbook [search summary]) |
| "Reducing the Aliasing of Nonlinear Waveshaping Using Continuous-Time Convolution" | Parker, Zavalishin, Le Bivic (DAFx-16) | paper (abstract seen only) | Early form of antiderivative antialiasing for waveshapers, "especially in combination with low order oversampling" | (verified: https://dafx.de/paper-archive/details/vem_XXF5qBbfiWOH2RVVAA [search summary]) |
| "Antiderivative Antialiasing for Memoryless Nonlinearities" | Bilbao, Esqueda, Parker, Välimäki (IEEE Signal Processing Letters) | paper (title and authors from a search summary; no URL seen for the paper itself) | The usual reference for ADAA. For a static curve, first-order ADAA needs the curve's antiderivative, which cannot be done with a `WaveShaperNode` (it takes only a lookup table). It would need an AudioWorklet or a `ScriptProcessorNode` | (verified: https://dafx.de/paper-archive/details/vem_XXF5qBbfiWOH2RVVAA [search summary, mentions the follow-up]) |
| ADAASineClipper (chowdsp_utils) | Jatin Chowdhury | open-source library class (licence: not found) | A worked ADAA implementation of a sine clipper; code reference for a reimplementation | (verified: https://ccrma.stanford.edu/~jatin/chowdsp/chowdsp_utils/classchowdsp_1_1ADAASineClipper.html [search summary]) |
| "AADistortion.pdf" | Martin Vicanek (host: vicanek.de) | unknown | Appeared in the search results for antialiased distortion. I could not fetch it and did not see its content. Possibly a lightweight antialiasing method; not confirmed | (verified that the URL appeared: https://www.vicanek.de/articles/AADistortion.pdf [title only]) |

## Recommended gear list

Ranked for usefulness to this project (the 300 Hz to 1 kHz problem first, then the other gaps).

1. **Spectrum Thief (free)** as the tool to measure and decide. It captures a source and a reference response and produces a matching filter with smoothing and IR export. Use it by rendering a section offline, capturing it against the reference, and reading the curve it proposes. The plugin itself would run outside the browser; what we take from it is the method. Free; no price.
2. **Pro-Q 4 (approx. $199 on one retailer page seen 2026-10-23, may be out of date)** as the benchmark for what a good EQ with dynamic bands, linear phase and EQ Match can do. Only if the owner wants a commercial mix EQ. For this project, a free matcher should cover the need.
3. **Open-source references to read, not to host:** ZL Equalizer (AGPL-3.0, dynamic EQ), FreeEQ8 (GPL-3.0, claims Match EQ and per-band drive; treat as unproven), Chow Tape Model (free and open source), Airwindows (MIT). Their code shows how dynamic bands, matching, hysteresis and sine/asin transfer functions are done. Licence caution: GPL and AGPL code cannot simply be copied into other licence terms; read it for the method and re-derive.
4. **Klanghelm IVGI (freeware) and Ableton Saturator** as the listening and design references for asymmetric and curve-selectable saturation. The studio's saturator is symmetric `tanh`; adding an asymmetry control and a few named curves is cheap.
5. **Ableton Auto Filter** as the design reference for the sweep sections: circuit choices, Drive, 12/24 dB. Built into Live, so cost follows Live; no price found.
6. **TDR Nova (free)** to audition whether the excess in 300 Hz to 1 kHz is level-dependent (dynamic EQ) or constant (static EQ).
7. **Decapitator and Saturn 2 (commercial, price not found)** as the "what everyone uses" references for tape/tube/console flavours and multiband saturation. Nothing here is open, so the studio would imitate the behaviour, not the code.

## Browser feasibility

What follows mixes what I saw with Web Audio knowledge from the studio code and from memory; the memory items are marked.

- **Already a direct Web Audio equivalent.**
  - Static EQ curves: peaking and shelf biquads (`eq3` already does this). A cascade of 4 to 8 peaking biquads can approximate a matched correction curve. The Audio EQ Cookbook is the published basis for such coefficients.
  - Filter sweeps: `BiquadFilterNode` lowpass and highpass. Cascading two nodes gives 24 dB/oct, and `Q` gives resonance. A drive stage before it would be a `WaveShaperNode`.
  - Static saturation curves: `WaveShaperNode` with a lookup table. Sine (Airwindows Density), asin, tanh, and asymmetric curves are all just different Float32Arrays. Oversampling is a `WaveShaperNode` property, and the studio already sets `'2x'` (`studio/processors.js` line 104).
- **Needs reimplementation, with a cost.**
  - Dynamic EQ: no native node. Build it as a bandpass sidechain feeding a detector (an `AnalyserNode` poll or an AudioWorklet), then drive a peaking band's `gain` AudioParam. Its release timing from the main thread would be coarse. An AudioWorklet is the clean route but is a new module file, and the repo's no-build-step, `selfcheck.js` fake AudioContext would need a matching stub (CLAUDE.md "Gotchas").
  - Linear-phase EQ and match-EQ filtering: FIR via `ConvolverNode` with a computed impulse response is possible (recalled, unverified: convolver latency and normalisation behaviour need care). Spectrum Thief's IR export shows the pattern.
  - Hysteresis tape (Chow Tape Model) and ADAA: sample-by-sample nonlinear processing, so AudioWorklet only.
  - Multiband saturation: split with crossover biquads (the standard approach is Linkwitz-Riley, recalled, unverified in this session), saturate each band, sum. The delay and phase alignment of crossover filters needs checking.
- **Match-EQ as an offline tool.** Because the studio already renders offline (`Sequencer.render`) and the spec says the reference analysis was done with numpy/scipy outside the repo, the cheapest route for the 300 Hz to 1 kHz problem is a script: compute the average spectrum of a render and the reference per section, smooth to 1/3 octave, fit 3 to 6 peaking biquads to the difference, and write them into `Song`. That is an analysis step, not a plugin. It matches how Spectrum Thief, Pro-Q 4 and Ozone describe EQ matching (compare two spectra, derive correction), though I did not see their exact algorithms.
- **Two cautions.** (a) A correction on the master hides which element is hot; fixing the source element, such as the stab cutoff or the pad, may sound better. A per-element match needs stems of the reference, which is S5's topic. (b) A static match EQ on one section may be wrong for another, since the analysis found the excess "in every section" but not necessarily by the same amount.
- **Not usable in a browser.** Closed commercial plugins (Decapitator, Saturn 2, Pro-Q 4, Ozone, FilterShaper XL) cannot be hosted by the studio. None can be reimplemented from a published algorithm; only behaviour descriptions exist.

## Recalled, not verified

These are from memory. I did not find a source in this session.

- The Web Audio `BiquadFilterNode` coefficient formulas are based on the Audio EQ Cookbook, and lowpass/highpass biquads are 12 dB/oct. The first part is my recollection of the Web Audio specification; I did not look it up.
- `IIRFilterNode` coefficients are fixed at creation and cannot be automated, unlike `BiquadFilterNode` parameters.
- Oversampling choices on `WaveShaperNode` are `'none'`, `'2x'` and `'4x'`.
- Chow Tape Model is licensed under GPL v3 (I recall this; the search results said only "free and open source").
- SSL, Neve and other console-style EQ and saturation emulations exist from Waves, Universal Audio, Brainworx and others. My search for them was blocked by the search limit, so I name no product, price or feature.
- Logic Pro's Match EQ and Channel EQ, FL Studio's Fruity Parametric EQ 2 and Waveshaper, and Reaper's ReaEQ and JS effects are DAW built-ins I believe exist. The one result mentioning Logic's Match EQ was a weak forum comment. Not searched.
- Voxengo SPAN is a free spectrum analyser. The results only said CurveEQ's display resembles it.
- Tone.js and Faust can generate Web Audio effects. Not searched, as this belongs to H5/O2.

## Handoffs to other agents

- **S1 (sidechain, compression, glue):** dynamic EQ (TDR Nova, Pro-Q 4 dynamic bands, ZL Equalizer) overlaps dynamics processing. The master chain's glue compressor feeds the saturator, so order effects matter.
- **S4 (limiter, mastering, width):** Ozone's Match EQ and Tonal Balance Control sit in the mastering category; Saturn 2 "Subtle" styles are aimed at mastering. I covered only the EQ-matching part.
- **S5 (stems and transcription):** a per-element spectrum comparison against the reference needs separated stems. This is the route to finding which element is responsible for the 300 Hz to 1 kHz excess.
- **H2 (mid bass):** the mid bass is B2 with a cutoff of 220 Hz, resonance 3 and an eq3 insert, so its upper harmonics reach into the 300 Hz to 1 kHz band. H2 (partner for round 3) should say whether any bass synth reviewed gives a different harmonic balance.
- **H3 (stab and pad) and H4 (clap):** the stab, pad and clap body also occupy this band.
- **O2 (DAW possibilities):** AudioWorklet and the no-build-step constraint decide whether dynamic EQ, ADAA and hysteresis are feasible. Also whether per-device UIs can show a spectrum and match curve.

## Questions for the Opus agents

1. (O1) Is there published evidence, or an automated method, to attribute a band-level excess in a full mix to individual elements without stems? The 300 Hz to 1 kHz problem is measured on the sum.
2. (O1) Is a long-term-average spectrum match a valid target for electro tracks, given that the reference is a decoded MP3 with sections at different levels? I did not see a source on this.
3. (O2) Can the studio add an AudioWorklet module under its no-build-step, global-script rules, and how would `selfcheck.js` stub it? This decides whether a dynamic EQ, an antialiased saturator or a hysteresis tape model are possible.
4. (O2) Is the owner's pipeline meant to emit EQ settings as parameter data (a list of peaking bands per track) so that match-EQ output feeds the existing `eq3`, or should a new multi-band EQ device be created?

## Sources

All URLs below appeared in a search result or fetch result in this session. Marks follow the definitions at the top.

Fetched (read directly):
- https://github.com/ZL-Audio/ZLEqualizer
- https://github.com/GareBear99/FreeEQ8

Seen in search results (not fetched):
- https://www.soundtoys.com/wp-content/uploads/Decapitator-Manual.pdf
- https://www.musicguymixing.com/decapitator-style/
- https://barryrudolph.com/newtoys/toys7/soundtoysdecapitator.html
- https://sonicstate.com/news/2020/05/20/fabfilter-releases-fabfilter-saturn-2
- https://www.fabfilter.com/news/1589878800/fabfilter-releases-fabfilter-saturn-2-distortion-and-saturation-plug-in
- https://www.toolfarm.com/?p=16623
- https://moogaudio.com/products/fabfilter-pro-q-4
- https://store.acoustica.com/third_party_plugins/fabfilter-pro-q-4
- https://www.zzounds.com/item--FABPROQ
- https://www.pluginboutique.com/products/14125
- https://audioxpress.com/news/izotope-releases-ozone-9-mastering-software-with-improved-machine-learning-features
- https://www.pro-tools-expert.com/production-expert-1/izotope-release-ozone-9
- https://musictech.com/reviews/plug-ins/izotope-ozone-9/
- https://voxengo.com/curveeq
- https://rekkerd.org/spectrum-thief-free-eq-match-and-ir-generator-plugin-by-ghost-note-audio/
- https://bedroomproducersblog.com/2025/07/16/ghost-note-audio-spectrum-thief/
- https://polarity.me/posts/polarity-music/2025-08-07-spectrum-thief-eq-match-plugin-with-ir-export/
- https://bedroomproducersblog.com/2024/03/22/zl-equalizer/
- https://bedroomproducersblog.com/2026/08/02/zl-spectrum-equalizer/
- https://production-expert.com/production-expert-1/free-plugin-tdr-nova?format=amp
- https://blog.dubspot.com/plugins/tdr-nova
- https://synthanatomy.com/2020/07/chow-tape-model-free-open-source-tape-saturation-plugin-for-pc-mac.html
- https://audiotechnology.com/?p=78166
- https://github.com/jatinchowdhury18/AnalogTapeModel (named in a search summary; not fetched)
- https://chowdsp.com/manuals/ChowTapeManual.pdf (named in a search summary; not fetched)
- https://www.airwindows.com/density3/
- https://www.airwindows.com/everyconsole/
- https://bedroomproducersblog.com/2026/09/30/airwindows-consolex3/
- https://airwindows.com/page/115
- https://klanghelm.com/contents/products/IVGI
- https://www.bonedo.de/artikel/klanghelm-ivgi-test
- https://www.softube.com/saturationknob
- https://www.softube.com/free-plug-ins
- https://ask.audio/articles/saturator-ableton-lives-secret-sound-design-weapon
- https://docs.cycling74.com/reference/abl.dsp.saturator~
- https://www.soundonsound.com/techniques/distortion-effects-live
- https://rekkerd.org/lkjb-plugins-luftikus-free-eq-plugin-v1-2-1/
- https://m.thomann.de/pt/universal_audio_pultec_passive_eq_coll._native.htm
- https://www.ableton.com/en/live-manual/11/live-audio-effect-reference/
- https://www.musicradar.com/music-tech/daws/ive-been-a-live-user-for-around-20-years-and-its-probably-the-effect-i-turn-to-most-regularly-ableton-live-12-2-gives-this-incredibly-versatile-device-a-much-needed-refresh-and-rectifies-push-3s-most-notable-missing-feature
- https://cableguys.com/filtershaper-xl
- https://www.soundonsound.com/news/cableguys-release-filtershaper-xl
- https://www.pluginboutique.com/products/11111-FilterShaper-XL
- https://kilohearts.com/products/filter
- https://kilohearts.com/docs/snapins
- https://www.audiotechnology.com/free-stuff/vember-audio-surge-synthesiser-surge-xt
- https://www.synthtopia.com/?p=127913
- https://www.w3.org/TR/audio-eq-cookbook
- https://dafx.de/paper-archive/details/vem_XXF5qBbfiWOH2RVVAA
- https://ccrma.stanford.edu/~jatin/chowdsp/chowdsp_utils/classchowdsp_1_1ADAASineClipper.html
- https://www.vicanek.de/articles/AADistortion.pdf

Searches not completed because of the shared search limit: console/channel-strip emulations (SSL, Neve), and the DAW built-ins in Logic, FL Studio and Reaper. These are gaps in this report.
