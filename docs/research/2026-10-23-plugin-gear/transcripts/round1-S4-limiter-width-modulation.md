# S4: Limiting, mastering, stereo width, chorus and modulation — round 1
Agent model: Sonnet. Date: 2026-10-23.

How to read the verification marks. `(verified, fetched: URL)` means I fetched that page and read it. `(verified, search summary: URL)` means the URL appeared in a search result and the fact comes from the summary the search tool returned for it; I did not open the page. Most vendor and review sites refused to load in this environment (host lookup failed for fabfilter.com, izotope.com downloads host, voxengo.com, mathworks.com, kvraudio.com, rekkerd.org, csound.com, forum.juce.com, docs.rs; npmjs.com returned 403). Treat "search summary" facts as one step weaker than "fetched". The shared web-search budget ran out part-way through my work, so several topics below are marked "not searched". That is a gap in my work, not evidence that the product does not exist.

## Scope

Limiting and mastering (true-peak limiters, loudness meters, LUFS targets for club electro, mastering suites), stereo width (imagers, mid/side tools, correlation meters), and chorus, ensemble and micro-pitch wideners. Out of scope: the glue compressor and sidechain (S1), saturation and clipping (S3), delay and reverb (S2), stem separation (S5).

## What the reference track needs from this category

From the design spec (`docs/superpowers/specs/2026-10-21-guidance-studio-design.md`), analysis table:

- Stabs: "wide stereo (L/R correlation 0.41)". The spec does not say whether 0.41 was measured on an isolated stab or on the full mix, or whether it is broadband or per band. Open question below.
- Sub: "mono". Kick and sub are one event. So the width tool must leave the low end mono.
- Open hat centroid ~5.9 kHz, clap ~2.7 kHz with a reverb tail: the other wide content sits high, which suggests width should be applied from the mids upward.
- No loudness, LUFS or true-peak figure for the reference appears anywhere in the analysis table. Nothing in the spec says what the master should measure.

What the studio does now (read from `studio/processors.js`):

- `BUILD.limiter`: one Web Audio `DynamicsCompressorNode` with ratio 20, attack 1 ms, knee 1, release from the spec, followed by a gain stage for the ceiling. Defaults in the file are threshold -3 dB, ceiling -0.5 dB (the task brief says the master uses -2 / -0.6; I did not trace where those are set). It has no true-peak detection and no oversampling, and the lookahead cannot be set from the code.
- `BUILD.widener`: broadband mid/side. Mid = (L+R)/2, side = (L-R)/2, side scaled by `width` (0 to 3), then L = M + S*w, R = M - S*w. It has no crossover, so it widens the low end and the sub as much as the mids, and it has no mono-compatibility check.
- `BUILD.chorus`: two delay lines (14 ms and 21 ms base) with sine LFOs of opposite sign, d1 hard to the left and d2 hard to the right, dry signal on both. It has no pitch-shift element and no high-pass on the wet path.

## Findings

Verified facts only in the table; each row names the evidence level.

| Name | Vendor | Licence | Formats | Relevance to the element | Verified source |
|---|---|---|---|---|---|
| FabFilter Pro-L 2 | FabFilter | commercial (price not found) | not confirmed in my sources; a listing mentions a surround variant | Standard-choice true-peak limiter. Help page describes a True Peak Limiting option: it limits true peaks already in the input, then smooths overshoot caused by its own fast limiting. Listings cite up to 32x linear-phase oversampling and adjustable look-ahead, attack and release; true-peak metering described as ITU-R BS.1770 / EBU R128 compliant. Spec numbers come from marketing copy | (verified, search summary: https://www.fabfilter.com/help/pro-l/using/truepeaklimiting) and listings (verified, search summary: https://zzounds.com/item--FABPROL) |
| LoudMax | Thomas Mundt | free | VST, VST3, AU, LADSPA; Windows, macOS, Linux (v1.44 per one news item) | Free look-ahead brickwall limiter with an ISP (inter-sample peak) button. Listed specs: 1.25 ms look-ahead and attack, 6 samples added latency with ISP on. Closed source (not stated either way in my results) | (verified, search summary: https://rekkerd.org/thomas-mundt-updates-loudmax-and-luveler-free-plugins) and https://audiotechnology.com/?p=78358 |
| Limiter No6 | VladgSound (Vladislav Goncharov) | free; reported no longer supported | VST on Windows (32/64-bit), VST on 32-bit Intel Mac per one listing | Five stages: RMS compressor, peak limiter, high-frequency limiter, clipper, true-peak limiter. Optional 4x oversampling covers the peak limiter, HF limiter and clipper, not the true-peak stage (Plugin Boutique wording). Good model of a modular mastering limiter | (verified, search summary: https://www.pluginboutique.com/product/2-Effects/9-Limiter/338-Limiter-No6), support status (verified, search summary: https://audiotechnology.com/free-stuff/tdr-vladg-limiter-n6) |
| TDR Limiter 6 GE | Tokyo Dawn Labs | commercial, about $50-60 at retailers in search results seen 2026-10-23 (approximate; one listing showed a $19 sale ending 15 Sept 2026, so expired); a demo with limits exists | Linux support added in v2.0.0 per a news item; other formats not confirmed | Remake of Limiter No6. Six re-orderable modules: compressor, clipper (up and down), HF limiter, peak limiter (brickwall or non-brickwall, three lookahead settings), true-peak output protection limiter, EBU-compliant true-peak and loudness meter. Per-module mid/side mode. MusicRadar criticism: manual vague in places | (verified, search summary: https://www.musicradar.com/reviews/tokyo-dawn-labs-limiter-6-ge) and https://www.production-expert.com/production-expert-1/tdr-limiter-6-ge-200-linux-support-zwicker-meteringnuke-compressor-mode-and-more |
| Ozone Maximizer (inside iZotope Ozone) | iZotope | commercial (price not found) | not confirmed | Mastering-suite limiter. Ozone 9 docs: with True Peak on, the limiter accounts for the analog level after D/A conversion, which can exceed the digital peak by more than 3 dB; small CPU cost. Docs suggest ceiling -0.3 dB when dithering, -0.6 to -0.8 dB before mp3/aac. Modes IRC LL, I, II, III (Ozone 8); IRC IV added in Ozone 9; IRC 5 is described as the first multiband limiter algorithm in Ozone (Ozone 12, per an iZotope interview) | (verified, search summary: https://downloads.izotope.com/docs/ozone9/en/maximizer/index.html) and https://www.izotope.com/en/learn/inside-ozone-12 |
| Ozone Imager (multiband) and Imager free | iZotope | Ozone module is commercial; a stand-alone free Imager exists per a German review | free Imager: VST2, VST3, AAX (Windows), AU (macOS) per bonedo | Fetched Ozone 9 Imager docs: up to four bands, single band by default; Width adjusts side gain, -100 makes a band effectively mono; Link Bands; Stereoize Mode I uses Haas-effect decorrelation by delaying a copy of the mid into the side; docs state Stereoize is "completely mono compatible"; correlation trace, stereo width spectrum, vectorscope (polar sample, polar level, Lissajous), correlation and balance meters. Docs say widening pushes correlation lower and a brief dip below zero is not necessarily a problem. The free Imager has width and Stereoizer controls and no per-band control (one review); whether it has a correlation meter: not found | (verified, fetched: https://s3.amazonaws.com/izotopedownloads/docs/ozone9/en/imager/index.html); free version (verified, search summary: https://www.bonedo.de/artikel/izotope-ozone-imager-free-test) |
| Voxengo MSED | Voxengo | free | AAX, AU, VST, VST3 (v3.0 added VST3); Windows and macOS | Mid/side encoder-decoder with inline mode (gain and pan of mid and side in one instance), mid/side isolate, a stereo widener, phase invert, "plasma" vector scope, correlation and balance meters. v3.0 dated 15 Sept 2016 | (verified, search summary: https://voxengo.com/product/msed) and https://www.voxengo.com/forum/ar/3738/ |
| Voxengo Correlometer | Voxengo | free | AAX, AU, VST, VST3; macOS and Windows | Multi-band correlation meter, 4 to 64 bands, adjustable band Q and averaging time, side-chain input to correlate two tracks, zero latency. Built on the correlation meter of Voxengo PHA-979. v1.0 Jan 2019, v1.1 June 2019. This is the closest tool to checking whether 0.41 holds per band | (verified, search summary: https://www.voxengo.com/product/correlometer) and https://voxengo.com/product/correlometer/features |
| Youlean Loudness Meter 2 | Youlean | free tier plus paid Pro (price not found) | not confirmed in my sources | Measures LUFS (momentary, short-term, integrated), loudness range, true peak, dynamics; free tier covers core LUFS, true peak, LRA and histogram per Dubspot; streaming-service presets need Pro per MusicTech. Reviews, not Youlean's own docs | (verified, search summary: https://blog.dubspot.com/plugins/youlean-loudness-meter-2) and https://musictech.com/guides/buyers-guide/best-freeware-mastering-tools-plug-ins/ |
| Klangfreund LUFS Meter | Klangfreund | commercial plugin (price not found); source on GitHub; licence unresolved | v2 listed for VST, VST3, AU, AAX on macOS, Windows, Linux | Plugin loudness meter. Author's early announcement said GPLv2; a later JUCE forum post by the author reportedly says the licence changed from GPL2 to MIT. That one post is the only source for MIT and I could not open it | (verified, search summary: https://forum.juce.com/t/how-to-calculate-lufs/32342) and https://www.kvraudio.com/product/lufs-meter-by-klangfreund |
| libebur128 | jiixyj (upstream); forks by martingasser and andrewrk | open source, MIT | portable ANSI C library; Rust crate "ebur128" based on it per a search result | Reference implementation of EBU R128 / BS.1770: M, S, I modes, loudness range (EBU Tech 3342), true-peak scanning, any sample rate by recalculating filter coefficients. README says "All source code is licensed under the MIT license". Neither fork README mentions JavaScript or WebAssembly. Upstream jiixyj page not opened (its URL was not in my results) | (verified, fetched: https://github.com/martingasser/libebur128) and (verified, fetched: https://github.com/andrewrk/libebur128) |
| needles (@domchristie/needles) | Dom Christie | open source, MIT per search summary | npm package for Web Audio | Browser K-weighted momentary, short-term and integrated loudness aiming at EBU R128 / BS.1770-4. Uses ScriptProcessorNode; summary says early tests with AudioWorklet in Chrome were glitchy so it was disabled; that note may be dated. Page returned 403 so I could not check it myself | (verified, search summary: https://npmjs.com/package/@domchristie/needles) |
| Soundtoys MicroShift | Soundtoys | commercial; Dubspot listing showed $99, v5.5 (seen 2026-10-23; approximate; may be out of date) | not confirmed | Micro-pitch widener: pitch shifting plus time-varying delay. Controls: Delay, Detune, Focus (crossover so the effect applies only to the high band, protecting the low end), Mix. Style 1 and 2 are said to model Eventide H3000 presets #231 and #519 (tutorial claim, via search summary). Algorithm unpublished beyond vendor description | (verified, search summary: https://blog.dubspot.com/plugins/microshift) and https://www.bestservice.com/microshift.html |
| TAL-Chorus-LX | Togu Audio Line | free; open-source status not found (sources call it freeware) | reports differ: one says VST, AU, VST3, AAX, CLAP on macOS/Windows/Linux, another Windows and Mac only | Juno-60 style chorus, a "1:1 standalone version" of the chorus in TAL-U-NO-LX, two modes plus dry/wet and volume. "Close to the original" is the developer's claim in the coverage | (verified, search summary: https://rekkerd.org/togu-audio-line-releases-tal-chorus-lx-effect-plugin) |
| Surge XT | Surge Synth Team | open source, GPL-3.0 (README fetched) | VST3 and AU built by default; LV2 optional; VST2 builds may not be redistributed; Windows, macOS, Linux | Synth with a modulation effects group listed in a search summary as Chorus, Ensemble, Flanger, Phaser, Rotary Speaker, plus a Mid-Side Tool under Multi-Effects (2023 article, may have changed). The README I fetched does not list effects. GPL-3 means code cannot be pasted into a non-GPL project without taking on the licence; reading it to learn the structure is a separate matter | licence and formats (verified, fetched: https://github.com/surge-synthesizer/surge); effect names (verified, search summary: https://www.audiotechnology.com/free-stuff/vember-audio-surge-synthesiser-surge-xt) |

### Standards and loudness targets (all from search summaries; standards documents themselves not opened)

- True peak: MathWorks' Loudness Meter page says the signal is oversampled to at least 192 kHz (a table maps 48 to 96 kHz input to 4x), lowpass filtered (half-polyphase length 12, 80 dB stopband attenuation), and the true peak is the maximum of the rectified result. (verified, search summary: https://www.mathworks.com/help/audio/ref/loudnessmeter.html)
- Gating: absolute gate -70 LUFS, relative gate 10 LU below the running integrated value, as specified in ITU-R BS.1770-4. (verified, search summary: same MathWorks URL; also https://cdn.borisfx.com/borisfx/Documentation/sequoia-2025/en/Content/Loudnessmeter.htm)
- Broadcast: EBU R128 target -23 LUFS; Boris FX doc says R128 permits a maximum true-peak of -1 dBTP. (verified, search summary: https://en.wikipedia.org/wiki/EBU_R_128 and the Boris FX URL above)
- A browser lufs.js described in the MiniCPM-o docs uses two-stage K-weighting, 400 ms blocks and the -70 LUFS absolute gate followed by a relative gate. Repo not linked, so correctness unchecked. (verified, search summary: https://minicpmo45.modelbest.cn/docs/en/frontend/audio/)
- Club electro / techno targets: the sources found give ranges, not a standard. The most common range is about -8 to -11 LUFS integrated, peak-time techno near -9 to -8, "hotter" -8 to -6 in some producer blogs, true peak at or below -1 dBTP most consistently. Venia Mastering warns that pushing a club track to -6 LUFS makes it pump and lose punch. Streaming normalisation at about -14 LUFS means a -14 master sounds quiet next to -8 club masters. These are mastering-blog opinions, several from vendors. Treat them as starting points. (verified, search summary: https://veniamastering.studio/blog/mastering-for-ambient-and-electronic-music/, https://www.weaponsounds.com/blogs/production-tips/mastering-techno-club-vs-streaming-lufs, https://www.masteringthemix.com/pages/how-loud-should-you-master)

## Recommended gear list

Ranked for this project (measure, then reimplement what is publishable). Costs are as seen on 2026-10-23, approximate, possibly out of date.

1. Voxengo Correlometer plus MSED, both free. Why: the only concrete width number we have is 0.41, and Correlometer shows correlation per band (4 to 64 bands), so you can find out whether 0.41 is a broadband average hiding a mono low end and a wide top. MSED gives the inline mid/side gain and a vector scope. Free.
2. libebur128 (MIT) as the algorithm reference, with Youlean Loudness Meter 2 (free tier) as the cross-check. Why: Web Audio has no loudness meter, so the studio needs one to tune the limiter. libebur128 is the only fully open, fetched-and-confirmed implementation with true-peak scanning. Youlean lets you check a JS port against a known meter. Free / MIT.
3. TDR Limiter 6 GE (about $50-60) or Limiter No6 (free, unsupported) as the structural model for the studio limiter. Why: both are modular chains (compressor, HF limiter, clipper, peak limiter, true-peak stage) and TDR adds a per-module mid/side mode, so they show what a better master limiter contains. FabFilter Pro-L 2 is the industry-standard reference to compare against, with a documented two-stage true-peak approach, but I did not find its price.
4. LoudMax (free): quickest way to hear what an ISP-aware brickwall limiter does to the same render, with 1.25 ms lookahead as a concrete number to copy.
5. Ozone Imager (free standalone version, or the Ozone module): the fetched docs give a usable design to copy, namely multiband width with side gain, Haas-based Stereoize that stays mono-compatible, and a correlation trace. Price of Ozone: not found.
6. TAL-Chorus-LX (free) for a Juno-style chorus reference, and Soundtoys MicroShift (about $99) as the reference for micro-pitch width with a Focus crossover. The Focus idea (wet only above a crossover) is the part most worth copying into the studio.
7. Surge XT (GPL-3) as an open-source place to read how a chorus, ensemble and mid-side tool are structured, subject to the licence.

## Browser feasibility

Nothing in the table runs in a browser as-is. There are no web builds of these plugins in my results. What follows is what can be built with Web Audio, partly from my own knowledge of the API and not from a source.

Limiter:
- `DynamicsCompressorNode` has no true-peak detection and no oversampling control. The current `BUILD.limiter` therefore cannot guarantee a -1 dBTP ceiling, and the node's lookahead cannot be set. (My knowledge of the API, unverified. The W3C spec search did not run.)
- Reimplementing a lookahead brickwall limiter in an `AudioWorklet` is feasible: delay line for lookahead, 4x oversampled peak detection (the filter parameters are in the MathWorks summary above), gain smoothing. Whether the same worklet can run in `OfflineAudioContext` export: I expect so but have not checked (unverified).
- A cheaper route is a true-peak safety stage after the existing limiter: a 4x upsample in a worklet, measure, and trim the ceiling. Published algorithm: BS.1770 true-peak annex (standard text not opened).

Loudness meter:
- K-weighting is two biquads and the gating is simple arithmetic (all described in the summaries above), so it fits in an `AudioWorklet`. libebur128 (MIT) is the correct reference to port or compile (ANSI C, so a WebAssembly build is plausible; no ready-made WASM port was found in my results). needles (MIT) exists for Web Audio but uses `ScriptProcessorNode` and its AudioWorklet mode is described as disabled.
- The self-check uses a fake AudioContext (per CLAUDE.md), so any new node type or worklet needs a stub there.

Width:
- Mid/side is already implemented in the widener. To fix the sub: split at a crossover (for example 120 to 200 Hz, a number I am suggesting, not one from a source), keep the low band mono, and widen only the high band. Ozone's multiband Imager and MicroShift's Focus both do exactly this, according to their docs and descriptions.
- A correlation meter is a few lines in a worklet (running sums of L*R, L*L, R*R over a window). That formula is standard DSP and not from a fetched source. Correlometer's multiband version needs band-pass filters in front of it.
- Haas-style Stereoize (delay a copy of the mid into the side) is directly buildable with a `DelayNode`; docs say the result is mono compatible.

Chorus:
- The existing chorus is already the usual two-voice modulated delay. Gaps against the references: no high-pass or crossover on the wet path, no micro-pitch element (MicroShift mixes pitch shift with modulated delay), and the hard-left / hard-right voices will comb-filter in mono. A pitch shifter would need an `AudioWorklet` (granular or phase-vocoder); the published algorithms for that are out of my sources.

## Recalled, not verified

Things I believe but did not find in a source this session. Do not rely on them without checking.
- Roland Dimension D style chorus (fixed-rate, mono-compatible) and the Eventide H3000 as the origin of micro-pitch widening: I recall both but did not search for either. The only support in my results is that MicroShift is "modeled on" the H3000 and AMS DMX 15-80s.
- Waves S1 Stereo Imager, Brainworx bx_digital, Brainworx bx_control, Airwindows (open-source, MIT, many clippers and limiters), Calf plugins, Faust's `compressors.lib` and its lookahead limiters: I recall these from general knowledge. All four searches were refused when the budget ran out, so I have no verified facts about them. Faust and Airwindows are the two most worth a follow-up because both are open source and could be reimplemented.
- That the Web Audio `DynamicsCompressorNode` has a fixed built-in pre-delay of a few ms: recalled from the spec, not verified here.
- That an MP3-decoded reference can show inter-sample peaks above 0 dBFS after decoding, because lossy encoding does not preserve the original peaks: general audio knowledge, not from a source.

## Handoffs to other agents

- S1: glue compressor ahead of the limiter, and how the limiter interacts with the sidechain ducker. TDR Limiter 6 GE and Limiter No6 contain a compressor stage, which overlaps with S1's scope.
- S3: the clipper stage that Limiter No6 and TDR Limiter 6 GE put before the limiter, and the master saturator. Clipping before limiting is S3's area.
- S2: reverb and delay width. A wide reverb tail on the clap (spec: "short body plus reverb tail") affects the mix correlation as much as the stab widener does.
- H3: whether the stab's 0.41 correlation comes from the synth itself (detuned, unison voices) or from a widener plugin. That decides whether width belongs in the stab synth or in the insert chain.
- S5: any tool that can measure L/R correlation on an isolated stem. The spec's 0.41 would need to be re-measured on separated stems to show whether it is the stab alone.
- O2: whether `AudioWorklet` can be used in both live playback and `OfflineAudioContext` export in this project, and whether the no-build-step rule allows a worklet loaded from a separate file or a Blob URL.

## Questions for the Opus agents

1. (O1) What does the 0.41 L/R correlation in the spec refer to: the full mix, an isolated stab, or a stab estimate from the mix? Is it broadband? If broadband, should the recreation target a per-band profile (mono below roughly 150 Hz, wide above) rather than one number?
2. (O1) The spec contains no loudness or true-peak figure for the reference master. Should the first step of recreation be to measure integrated LUFS, short-term LUFS and true peak of the decoded MP3 (libebur128 or Youlean would do this), so the limiter has a target? The club-electro range I found (-9 to -8 LUFS, at most -1 dBTP) is a blog consensus, not a measurement of this track.
3. (O1) Does a recreation target the reference's loudness, or the reference's dynamics (crest factor, short-term range)? Hot limiting and a loudness match can pull in opposite directions.
4. (O2) Is a lookahead limiter in an `AudioWorklet` acceptable for the project, given the no-build, plain-JS rule and the node stubs in `selfcheck.js`? Or must the master limiter stay on `DynamicsCompressorNode`?
5. (O2) Should the studio get a master-bus metering panel (LUFS, true peak, correlation, vectorscope) as a device with its own look? The Ozone Imager docs I fetched describe a correlation trace, width spectrum and Lissajous display that would be a natural template.

## Sources

Fetched and read:
- https://s3.amazonaws.com/izotopedownloads/docs/ozone9/en/imager/index.html
- https://github.com/andrewrk/libebur128
- https://github.com/martingasser/libebur128
- https://github.com/surge-synthesizer/surge

Seen in search results only (page not opened; facts are from the search summary):
- https://www.fabfilter.com/help/pro-l/using/truepeaklimiting
- https://zzounds.com/item--FABPROL
- https://rekkerd.org/thomas-mundt-updates-loudmax-and-luveler-free-plugins
- https://audiotechnology.com/?p=78358
- https://www.pluginboutique.com/product/2-Effects/9-Limiter/338-Limiter-No6
- https://audiotechnology.com/free-stuff/tdr-vladg-limiter-n6
- https://www.musicradar.com/reviews/tokyo-dawn-labs-limiter-6-ge
- https://www.production-expert.com/production-expert-1/tdr-limiter-6-ge-200-linux-support-zwicker-meteringnuke-compressor-mode-and-more
- https://downloads.izotope.com/docs/ozone9/en/maximizer/index.html
- https://www.izotope.com/en/learn/inside-ozone-12
- https://www.bonedo.de/artikel/izotope-ozone-imager-free-test
- https://voxengo.com/product/msed
- https://www.voxengo.com/forum/ar/3738/
- https://www.voxengo.com/product/correlometer
- https://voxengo.com/product/correlometer/features
- https://blog.dubspot.com/plugins/youlean-loudness-meter-2
- https://musictech.com/guides/buyers-guide/best-freeware-mastering-tools-plug-ins/
- https://forum.juce.com/t/how-to-calculate-lufs/32342
- https://www.kvraudio.com/product/lufs-meter-by-klangfreund
- https://npmjs.com/package/@domchristie/needles
- https://minicpmo45.modelbest.cn/docs/en/frontend/audio/
- https://www.mathworks.com/help/audio/ref/loudnessmeter.html
- https://cdn.borisfx.com/borisfx/Documentation/sequoia-2025/en/Content/Loudnessmeter.htm
- https://en.wikipedia.org/wiki/EBU_R_128
- https://blog.dubspot.com/plugins/microshift
- https://www.bestservice.com/microshift.html
- https://rekkerd.org/togu-audio-line-releases-tal-chorus-lx-effect-plugin
- https://www.audiotechnology.com/free-stuff/vember-audio-surge-synthesiser-surge-xt
- https://veniamastering.studio/blog/mastering-for-ambient-and-electronic-music/
- https://www.weaponsounds.com/blogs/production-tips/mastering-techno-club-vs-streaming-lufs
- https://www.masteringthemix.com/pages/how-loud-should-you-master

Local files read: `/home/user/havantechno/docs/superpowers/specs/2026-10-21-guidance-studio-design.md`, `/home/user/havantechno/studio/processors.js` (limiter, widener, chorus builders).
