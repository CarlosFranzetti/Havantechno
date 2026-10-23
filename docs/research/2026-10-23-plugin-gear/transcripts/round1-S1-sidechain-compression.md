# S1: Sidechain, compression and glue — round 1
Agent model: Sonnet. Date: 2026-10-23.

How to read the verification marks. `(verified: <url>)` means the fact appeared in a search-result summary for that URL or in a page I fetched. I opened only two pages in full (the sndfilter gist and the LSP Plugins GitHub README). Almost every other fetch failed with a DNS error (`getaddrinfo ENOTFOUND`), so most "verified" product facts rest on search-result text, not on the full vendor page. Where a summary gave a fact without saying which of several URLs carried it, I say so. The web-search budget ran out before I could cover classic-compressor emulations (1176, LA-2A, Fairchild), Faust's compressor library, REAPER's ReaComp, or the Giannoulis/Massberg/Reiss compressor-design paper. Those are listed under "not found / not searched" below.

## Scope
Sidechain ducking, per-track compression, and bus/master glue compression. Plugins that duck without an audio sidechain (envelope-shaper style), classic and bus compressor emulations, DAW built-ins, and free or open-source compressors. For each: trigger type, curve shaping, lookahead, attack/hold/release, and whether the algorithm is documented or open, so it could be reimplemented in Web Audio.

## What the reference track needs from this category
From the analysis table in `docs/superpowers/specs/2026-10-21-guidance-studio-design.md`:

- 126.0 BPM, straight 4/4 kick on every beat, so a kick event arrives every 476 ms. The ducker only needs to recover within that window.
- Kick pitch sweep ~130 to ~43 Hz in ~60 ms. Sub is a plucked sine peaking ~35 ms after the kick, ~300 ms decay, mono.
- Design decision in the spec: kick and sub are one event in the reference, so the sub is not sidechained ("a ducked sub recovered audibly between beats"). Bass, stab, pad and lead are ducked (`duck: ['bass', 'stab', 'pad', 'lead']` in `studio/song.js`).
- Bass plays B2 so its energy lands in 120 to 300 Hz. That band overlaps the kick's body, so ducking bass depth and release matter most there.
- The master chain ends with a glue compressor (threshold -14 dB, ratio 2.5, attack 20 ms, release 250 ms, knee 8 dB, makeup 0.5 dB) before the saturator and limiter.
- The spec records that the 300 Hz to 1 kHz band still sits several dB hotter than the reference in every section. Dynamics shaping on the buses could be one lever, but the spec does not say so; this is my inference.
- Open measurement gap: the spec has no measured ducking curve (depth, attack, hold, release shape) from the reference. The current defaults (depth 0.6, attack 4 ms, hold 20 ms, release 220 ms) are not tied to a measurement that I can see in the spec.

What the studio has now (`studio/processors.js`):

- `BUILD.sidechain` is a trigger-driven ducker: a GainNode whose gain is scheduled on `trigger(t)` with a linear attack, a hold, and a linear release. This is the same idea as Kickstart or Duck in MIDI-trigger mode, without any audio key input. Its release shape is linear only, there is no lookahead or offset, and depth does not follow velocity.
- `BUILD.compressor` wraps one `DynamicsCompressorNode` (threshold, ratio, attack, release, knee) plus a makeup gain. The master "glue" is an instance of it. It has no sidechain filter, no mix control, no auto-release choice, and no gain-reduction meter wired into the UI that I could see.

## Findings

| Name | Vendor | Licence | Formats | Relevance to the element | Verified source |
|---|---|---|---|---|---|
| Kickstart 2 | Cableguys (with Nicky Romero) | commercial, approx. EUR 14 / USD 16, seen in a MusicTech news item 2026-10-23, date of the item not checked, may be out of date | VST3 confirmed in a result summary; other formats not found | Trigger-based ducker closest to the studio's `sidechain`. MIDI trigger and audio trigger, 16 curves, draggable slope, mix knob, tempo-synced timings, built-in band split so only low frequencies are ducked. Review sources disagree on whether it is multiband (the developer description says yes), so the manual should settle it. The PDF manual is at the URL below but I could not fetch it. | (verified: https://musictech.com/news/nicky-romero-cableguys-kickstart-2-plug-in/) (verified: https://musictech.com/reviews/cableguys-kickstart-2-review/) (verified: https://www.cableguys.com/downloads/Nicky-Romero-Kickstart-2-Manual.pdf appeared in results, content not read) |
| VolumeShaper / ShaperBox 3 | Cableguys | commercial; summary said VolumeShaper USD 29 and ShaperBox 3 (full, nine shapers) USD/EUR 99, undated, approximate | not found in results | Drawn volume curves. Triggered by beats, MIDI or audio transients; ShaperBox 3 added an Audio mode that restarts the LFO on each transient (needs the external sidechain input) and a MIDI Trigger section that loads up to nine curves via MIDI notes. A bonedo review of VolumeShaper 5 lists "MIDI-Trigger in der DAW nicht fur AU" as a con. | (verified: https://cableguys.com/volumeshaper) (verified: https://musictech.com/reviews/plug-ins/cableguys-shaperbox-3-review/) (verified: https://www.synthtopia.com/?p=132647) (verified: https://www.bonedo.de/artikel/cableguys-shaperbox-3-test). The search summary did not say which of these pages carried the two prices. |
| Duck (v1) and Duck 2 | Devious Machines | commercial; v1 listing showed GBP 18 / USD 24 "for a limited time", GBP 20 / USD 27 thereafter, undated; 14-day demo | VST2, VST3, AU, AAX on Mac and Windows (v1 listing) | Draw-your-own curve, speed and depth, low and high bands ducked at different depths with adjustable crossover. Triggered by sidechain audio or MIDI notes. Lookahead exists to avoid clicks on audio/MIDI triggering. Later update added MIDI filtering (e.g. trigger from a note range), grouping, band soloing. A summary describes Duck 2 (March 2026) as a redesign: loop and release trigger modes, velocity control over depth, a single adjustable offset (ms or samples) replacing offset plus lookahead, and 2 or 3 band processing. Duck 2 details come from search results only. | (verified: https://www.kvraudio.com/product/duck-by-devious-machines) (verified: https://www.kvraudio.com/news/45183) (verified: https://rekkerd.org/?p=214606) (verified: https://www.pluginboutique.com/products/16956-Duck-2/) (verified: https://www.kvraudio.com/news-print.php?id=66374). The summary did not say which page carried the Duck 2 features. |
| LFOTool | Xfer Records | commercial, USD 49.95 per a Dubspot page seen 2026-10-23, may be out of date | not found | Envelope/LFO volume shaping used for ducking. MIDI re-trigger ("Note Retrig") from a MIDI track carrying the kick pattern; multiple graphs per preset; optional MIDI CC output. One FL Studio forum thread reports a plugin-delay-compensation timing problem with MIDI Out. A source in the results calls Kickstart 2 simpler and cheaper for pure ducking. | (verified: https://blog.dubspot.com/plugins/lfo-tool) (verified: https://cymatics.fm/blogs/production/you-wont-believe-what-youre-missing-out-on-in-lfo-tool) (verified: https://forum.image-line.com/viewtopic.php?p=1987819) |
| Submerge, SidechainX | Slate Digital; Otium Development | Submerge commercial, USD 49 (undated); SidechainX price not found | Submerge AAX, AU, VST3; SidechainX VST3, Windows only with macOS "coming soon" | Both are trigger-based ducking tools with MIDI trigger. Listed for completeness; I found no deeper feature data. | (verified: https://www.bestservice.com/fr/submerge.html) (verified: https://www.kvraudio.com/product/sidechainx-by-otium-development) |
| The Glue | Cytomic | commercial, USD 99 one-time per a third-party page seen 2026-10-23; Cytomic's own page not found | VST2, VST3, AUv2, AAXv2 per that third-party page | Bus compressor modelled on the SSL G-series. Spec per Dubspot: attack 0.01 to 30 ms, release 0.1 to 1.2 s plus Auto, ratios 2:1, 4:1, 10:1, sidechain high-pass 0 to 2 kHz at 6 dB/oct, external sidechain, Range, Mix, Peak Clip, oversampling. The sidechain HPF is the feature the studio's glue most lacks. A 2009 launch listing shows stepped attack/release values (attack 0.01, 0.1, 0.3, 1, 3, 10, 30 ms). The Auto release is described by a reviewer as slow base release with a faster component for transients. Closed source. | (verified: https://blog.dubspot.com/plugins/compare/the-glue-vs-unisum) (verified: https://rekkerd.org/?p=9057) (verified: https://rekkerd.org/review-cytomic-the-glue) (verified: https://ProRec.com/?p=688) |
| SSL G bus compressor emulations: UAD "SSL 4000 G Bus Compressor" and Legacy; Waves "SSL G-Master Buss Compressor"; "Native Bus Compressor 2" | Universal Audio; Waves; Native Bus Compressor 2 vendor unclear (the search summary said Waves, the retailer URL slug says "ssl_native_bus_compressor_2") | commercial; prices not shown | UAD plug-ins run on UAD hardware/software (formats not confirmed); others not found | Same bus-glue category as The Glue. UAD: newer version adds variable sidechain HPF, wet/dry mix, headroom; attack and release are fixed SSL-voiced steps. Native Bus Compressor 2 is listed with 2x/4x oversampling, external sidechain with HPF, auto-release. All closed source, vendor claims only. | (verified: https://uaudio.com/ssl-4000-g-series-bus-compressor.html) (verified: https://help.uaudio.com/hc/en-us/articles/30847649785748) (verified: https://www.thomann.co.uk/ssl_native_bus_compressor_2.htm) (verified: https://muziker.lt/waves-waves-ssl-g-master-buss-compressor) |
| FabFilter Pro-C 2 | FabFilter | commercial; USD 179 / EUR 149 at the 2015 launch per a 2015 news item; a retailer listed a discounted price, undated; current price not found | VST, AU, RTAS, AAX at launch (2015) | General-purpose compressor. Smooth lookahead up to 20 ms (can be disabled for zero latency), hold up to 500 ms, external sidechain, sidechain EQ with HP, LP and one free filter. Lookahead and hold are the two parameters the studio's Web Audio compressor cannot expose. A newer version exists in my memory; not found in these results. | (verified: https://www.mactech.com/2015/08/26/fabfilter-releases-fabfilter-pro-c-2-compressor-plug-in/) (verified: https://musictech.com/reviews/fabfilter-pro-c-2-review/) (verified: https://equipboard.com/items/fabfilter-pro-c-2). The summary did not say which page carried the lookahead and hold figures. |
| TDR Kotelnikov | Tokyo Dawn Labs | free (standard edition); Gentleman's Edition approx. EUR 40 per a Rekkerd item, date not checked | VST, AU, AAX per the Rekkerd item | Transparent wideband mastering/bus compressor. Peak and RMS release times with a crest-factor scheme, sidechain high-pass, stereo link options, Delta preview, 64-bit multi-rate path. External sidechain, INERTIA timing modes and wider time ranges (v1.1.0) are Gentleman's Edition only. Closed source. | (verified: https://www.tokyodawn.net/tdr-kotelnikov/) (verified: https://rekkerd.org/?p=101383) (verified: https://www.production-expert.com/home-page/2017/10/04-friday-free-plug-in-tokyo-dawn-labs-kotelnikov?format=amp) |
| Ableton Live Compressor and Glue Compressor (DAW built-ins) | Ableton | part of Live (price not checked) | built-in | Compressor has Peak, RMS and Expand modes; one article lists lookahead as 0, 1 or 10 ms. Glue Compressor is described as an SSL G-series bus compressor emulation with a Range control and soft clipping; both devices have a filtered sidechain input. Sourced from secondary articles, not the manual. | (verified: https://www.soundonsound.com/techniques/compress-gang) (verified: https://mixelite.com/blog/sidechain-in-ableton-2/) (verified: https://forum.ableton.com/viewtopic.php?p=1754764). The summary did not say which article carried the lookahead values. |
| Airwindows compressors (named in results: ButterComp, Logical4, Pressure4, Pressure6) | Airwindows (Chris Johnson) | open source, MIT per the main repository listing | source repo; plugin formats not checked. Third-party ports exist: an LV2 port and an iPadOS AUv3 wrapper | The only compressor family in my results with a permissive licence on the original code. The MIT licence is shown for the main repo (`github.com/airwindows/airwindows`) and the ConsoleX3 repo; I did not confirm per-file licences for Pressure6 or ButterComp2. The code is small C++ per-sample processing, so porting to an AudioWorklet is plausible (my judgment, not a source claim). Third-party Air-G plugins are built on Airwindows Logical4 and Pressure6 and state the Airwindows code is MIT. | (verified: https://github.com/airwindows/airwindows) (verified: https://deepwiki.com/airwindows/airwindows) (verified: https://www.kvraudio.com/product/air-g-pulse-by-air-g-audio) (verified: https://www.kvraudio.com/product/air-g-volt-by-air-g-audio) |
| LSP Plugins (sidechain compressors, limiters, gates, expanders, multiband compressors) | Linux Studio Plugins project | open source, LGPLv3 per the README I fetched | CLAP, LV2, VST2/LinuxVST, VST3 full; LADSPA partial; GStreamer experimental; JACK standalone | Free, full-featured dynamics suite with sidechain on the compressors. Debian's package description lists sidechain compressors. C++ source; reimplementation in a browser would be a port to WASM or a rewrite. Check LGPL obligations before copying code. | (verified: https://github.com/lsp-plugins/lsp-plugins, fetched) (verified: https://packages.debian.org/sid/lsp-plugins) (verified: https://lsp-plug.in/) |
| Audio Toolkit ATKSidechainCompressor; Polarity-SC-Dark | Audio Toolkit; Polarity project | open source: Audio Toolkit "free and Open Source" (licence not stated); Polarity-SC-Dark GPL-3.0, written in Rust | VST/CLAP plugins per the summary | Small open sidechain compressors. Mentioned in one search summary; I did not open either project page. | (verified for Polarity-SC-Dark: https://awesome.ecosyste.ms/projects/github.com%2Fpolarity%2Fplugin.nih.polarity-sc-dark). Audio Toolkit: (unverified page; the summary cited one of the result pages https://rekkerd.org/?p=91077, https://rekkerd.org/?p=53311, https://www.kvraudio.com/news-print.php?id=30517) |
| FFmpeg `sidechaincompress` filter | FFmpeg project | open source, LGPL per the summary | offline filter in C, not a plugin | A readable reference implementation of a sidechain compressor with a separate key input. Useful as an algorithm reference only. | (verified: https://lists.ffmpeg.org/doxygen/trunk/af__sidechaincompress_8c_source.html) (verified: https://fuchsia.googlesource.com/third_party/ffmpeg/+/n3.3.7/libavfilter/af_sidechaincompress.c) |
| sndfilter `compressor.c` (adapted from Chromium's `DynamicsCompressorKernel`) | Sean Connelly (voidqk) | open source, MIT | C source | Documents what the browser's own compressor does, with constants (see Browser feasibility). A starting point for an AudioWorklet compressor that is a known quantity but with the sidechain input and filter the native node lacks. | (verified: https://gist.github.com/rweichler/21e34fb127d6021d4660b16ed13ce0e2, fetched; the gist names the project home as https://github.com/voidqk/sndfilter, which I did not open) |
| AudioCmprssr | silveryar (Firefox add-on) | licence not found | Firefox extension (web) | Evidence that an AudioWorklet compressor with sidechain-style trigger filters (low-pass, band-pass, high-pass) runs in a browser. Not open source as far as I could tell. | (verified: https://addons.mozilla.org/addon/audiocmprssr/) |

Not found / not searched (the search budget ran out):

- Classic compressor emulations (1176, LA-2A, Fairchild, Distressor): not searched. Nothing recorded.
- Faust's `dynamics` library compressors, REAPER's ReaComp and its JSFX source, Logic Pro's built-in compressor, Bitwig's compressors: not searched or no result. Nothing recorded.
- The Giannoulis/Massberg/Reiss compressor-design paper: not searched. See "Recalled, not verified".
- Cytomic's own product page and FabFilter's own current product page: not found in results.

## Recommended gear list
Ranked by value for rebuilding the Guidance ducking and glue in Havantechno. "Gear" here also means algorithms to copy, since the target is a browser.

1. **Kickstart 2 (Cableguys), as a design reference, approx. EUR 14 / USD 16 (MusicTech, seen 2026-10-23).** It is the closest commercial twin to what the studio already does: MIDI trigger, curve shape, mix, band split. Use it to decide which controls to add to `sidechain` (curve shape, a low-band-only mode, mix). No licensing issue if only the controls are borrowed.
2. **Duck / Duck 2 (Devious Machines), as a second reference, approx. GBP 20 / USD 27 (v1 listing, undated).** It adds three ideas that fit a scheduler-driven engine: lookahead/offset (free in a sequencer because trigger times are known ahead of the audio clock), MIDI-note filtering, and velocity-scaled depth.
3. **Own AudioWorklet glue compressor, with The Glue's published spec as the design target (USD 99 to buy the original as an A/B reference, seen 2026-10-23).** The spec to copy is: sidechain HPF 0 to 2 kHz, ratios 2/4/10, attack 0.01 to 30 ms, release 0.1 to 1.2 s plus Auto, Mix, Range. Start the DSP from the MIT-licensed sndfilter/Chromium algorithm or the MIT-licensed Airwindows code and add a detector high-pass.
4. **TDR Kotelnikov (free).** Free reference compressor to A/B the master glue against while tuning. Not reimplementable (closed source).
5. **Airwindows compressors (free, MIT).** Cheapest legal source to read and port. ButterComp/Logical4/Pressure6 each have a distinct character.
6. **LSP Plugins (free, LGPLv3).** A host-able reference if the owner wants a free sidechain compressor in a desktop DAW while building the pipeline. Code reuse needs LGPL care.
7. **FabFilter Pro-C 2 (approx. USD 179 at 2015 launch; current price not found).** Reference for lookahead and hold behaviour. Only worth buying if the owner wants a polished desktop comparison.
8. **Ableton Glue Compressor / Compressor (included in Live).** Free reference if the owner already runs Live for A/B work.

## Browser feasibility

What the browser can do now:

- **Trigger-based ducking needs no sidechain input.** The studio already does it: the sequencer knows each kick time, and the `sidechain` processor schedules AudioParam automation on a GainNode. That covers the Kickstart/Duck/VolumeShaper "MIDI trigger" family. Things still missing that Web Audio can do: a non-linear release curve via `setValueCurveAtTime`, an offset/lookahead (start the dip a few ms before the kick, which is negative-latency for free because the schedule is ahead of time), velocity-scaled depth, and a low-band-only mode using a crossover (two BiquadFilterNodes per band plus a summing node; phase-matching of the split bands needs care and I have not verified a recommended recipe).
- **The native `DynamicsCompressorNode` has one input and one output.** MDN lists no sidechain input and no methods beyond AudioNode; it exposes a read-only `reduction` value (MDN lists attack, knee, ratio, release and threshold as k-rate; defaults threshold -24, knee 30, attack 0.003, release 0.25). (verified: https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode)
- **The native node's algorithm is not fully described in the spec.** A 2012 W3C bug report asks for the algorithm to be described. (verified: https://lists.w3.org/Archives/Public/public-audio/2012OctDec/0331.html). The sndfilter port, adapted from Chromium's kernel, shows the shape: a fixed pre-delay of 6 ms (default `predelay` 0.006), four adaptive "release zones" (0.090, 0.160, 0.420, 0.980) feeding a cubic release curve, a soft knee solved by bisection, an attack/release detector, and makeup gain `(1/fulllevel)^0.6`. (verified: https://gist.github.com/rweichler/21e34fb127d6021d4660b16ed13ce0e2). That a Chromium build uses the same 6 ms is from secondary sources only (unverified against Chromium's own file; see "Recalled, not verified"). Consequence for the master glue: the user's `release` parameter is a base value that the zones reshape, the fixed lookahead delays the audio by about 6 ms, and the exact curve differs from an SSL-style detector, so tuning by ear against a reference is the only way to match.
- **No sidechain filter on the native node.** The master glue's detector sees the full mix, including the kick's low end, so the kick will pump the whole master harder than an SSL-style glue with a sidechain HPF. I could not find a listening comparison; this is reasoning from the node's shape. A workaround inside the native node does not exist.
- **The usual workaround is an AudioWorklet.** A worklet can run a custom detector (with a high-pass), a lookahead delay line and an envelope follower, and could expose a second input for an external key. A Babylon.js forum thread describes a two-input AudioWorkletNode used for ducking, with the second input used only for level detection. (verified: https://forum.babylonjs.com/t/how-to-link-audioworkletnode-with-v2-busses/63630). The 2013 W3C mailing-list threads discuss exposing gain reduction as a connectable node and say reading it is not straightforward. (verified: https://lists.w3.org/Archives/Public/public-audio/2013AprJun/0197.html) (verified: https://lists.w3.org/Archives/Public/public-audio/2013OctDec/0011.html). AudioCmprssr shows a worklet compressor with sidechain-style filters in a browser extension. (verified: https://addons.mozilla.org/addon/audiocmprssr/)
- **Offline export.** `Sequencer.render` uses an OfflineAudioContext. Whether `AudioWorklet` modules load and run identically in an OfflineAudioContext in all target browsers was not checked in these searches (unverified). `selfcheck.js` also needs a stub for any new node type, per the repo's CLAUDE.md.

What would need reimplementing, ranked by effort:

1. Curve shape and offset on the existing ducker: small change in `BUILD.sidechain`, no new node types.
2. Low-band-only ducking: crossover filters, moderate, no worklet.
3. Glue compressor in an AudioWorklet with a detector HPF, ratio steps, auto release and Mix: a new processor, moderate to large; algorithms available under MIT (sndfilter, Airwindows) or as design specs (The Glue).
4. Matching a closed-source commercial compressor's sound exactly: not feasible from published specs; only the controls can be copied.

## Recalled, not verified
- I remember the Giannoulis, Massberg and Reiss paper on digital dynamic range compressor design (JAES, 2012) as the standard reference for smooth-branching detectors and feed-forward/feedback topologies. I did not find it in these searches.
- I remember Chromium's compressor living in `dynamics_compressor.cc` and `dynamics_compressor_kernel.cc` under a BSD-style (WebKit-derived) licence. The searches returned only an old Blink header and the sndfilter port, so the current Chromium path and licence are unconfirmed.
- I remember that DynamicsCompressorNode's `ratio` range is 1 to 20 and `attack` range 0 to 1 s. The MDN results I saw gave defaults, not ranges.
- I remember that the SSL G bus compressor hardware has fixed attack steps of 0.1, 0.3, 1, 3, 10, 30 ms and release steps of 0.1, 0.3, 0.6, 1.2 s plus Auto, and ratios 2, 4, 10. Only the Cytomic 2009 launch listing (attack steps 0.01 to 30 ms, release 0.1 to 1.2 s) matched part of this in my results, so the hardware values are unverified.
- Faust's `dynamics` library, ReaComp (REAPER) and Logic Pro's compressor are things I believe exist and could be relevant; none was found or checked in this round.

## Handoffs to other agents
- **S3 (saturation, EQ, filters):** the sidechain HPF in the glue compressor and the band-split crossover for low-band ducking are filter design questions; the master saturator comes after the glue in the chain, so the interaction between glue and saturator is theirs to weigh.
- **S4 (limiter, width, modulation):** the limiter after the glue, and loudness/ceiling behaviour. The native node used as a limiter (ratio 20, attack 1 ms) inherits the same 6 ms fixed pre-delay and non-brickwall behaviour; that is their topic.
- **S5 (stems and transcription):** measuring a ducking curve from separated stems. If the bass, stab and pad stems can be isolated, the gain envelope relative to the kick could be fitted to depth/attack/hold/release. Whether stem separation leaves enough of the ducking intact to fit a curve is theirs to judge.
- **H1 (kick and sub):** the "sub not ducked" decision and the 35 ms sub peak after the kick. The kick-to-sub timing interacts with any lookahead/offset added to the ducker.
- **O1 (whys and hows):** automation of fitting the ducker and glue parameters from the source stems (see questions).
- **O2 (DAW possibilities):** AudioWorklet in OfflineAudioContext for export, and whether the DAW should expose a per-track "key from" input so a worklet compressor can take an external sidechain.

## Questions for the Opus agents
1. **O1:** Can ducking depth, attack, hold and release be fitted automatically from separated stems? A concrete method would be: cross-correlate each ducked stem's short-time RMS with the kick onset times, average over many beats at 126 BPM, then fit the shape. What accuracy does stem-separation leakage allow, and does the kick bleed into the bass stem enough to bias the fit? The spec has no measured ducking curve today.
2. **O1:** Is the "sub not ducked" decision a general rule for this genre or specific to this track? If it is general, should the ducker's default for any low-frequency track be a band-split with the sub band left alone?
3. **O2:** Does the DAW plan allow a processor with two audio inputs (a key input), or should every sidechain stay trigger-driven from the sequencer? A trigger-driven ducker cannot follow audio that the sequencer does not schedule (for example an imported stem).
4. **O2:** If the glue moves to an AudioWorklet, is the added offline-render and `selfcheck.js` complexity acceptable? A new processor type needs a fake-AudioContext stub there.
5. **O1/O2:** The master glue's 300 Hz to 1 kHz band is several dB hotter than the reference per the spec. Is the cause plausibly bus dynamics (so the compressor could help) or EQ/synth balance? I could not determine that from the sources I found.

## Sources
Every URL below appeared in a search result or a fetched page in this session. Pages I opened are marked "opened"; the rest are known only from search-result text.

- https://github.com/lsp-plugins/lsp-plugins (opened)
- https://gist.github.com/rweichler/21e34fb127d6021d4660b16ed13ce0e2 (opened)
- https://cableguys.com/volumeshaper
- https://musictech.com/reviews/plug-ins/cableguys-shaperbox-3-review/
- https://www.synthtopia.com/?p=132647
- https://www.bonedo.de/artikel/cableguys-shaperbox-3-test
- https://musictech.com/news/nicky-romero-cableguys-kickstart-2-plug-in/
- https://musictech.com/reviews/cableguys-kickstart-2-review/
- https://www.cableguys.com/downloads/Nicky-Romero-Kickstart-2-Manual.pdf (appeared in results; content not read; fetch failed)
- https://blog.dubspot.com/plugins/lfo-tool
- https://cymatics.fm/blogs/production/you-wont-believe-what-youre-missing-out-on-in-lfo-tool
- https://forum.image-line.com/viewtopic.php?p=1987819
- https://www.kvraudio.com/product/duck-by-devious-machines
- https://www.kvraudio.com/news/45183
- https://rekkerd.org/?p=214606
- https://www.pluginboutique.com/products/16956-Duck-2/
- https://www.kvraudio.com/news-print.php?id=66374
- https://www.bestservice.com/fr/submerge.html
- https://www.kvraudio.com/product/sidechainx-by-otium-development
- https://blog.dubspot.com/plugins/compare/the-glue-vs-unisum
- https://rekkerd.org/?p=9057
- https://rekkerd.org/review-cytomic-the-glue
- https://ProRec.com/?p=688
- https://uaudio.com/ssl-4000-g-series-bus-compressor.html
- https://help.uaudio.com/hc/en-us/articles/30847649785748
- https://www.thomann.co.uk/ssl_native_bus_compressor_2.htm
- https://muziker.lt/waves-waves-ssl-g-master-buss-compressor
- https://www.mactech.com/2015/08/26/fabfilter-releases-fabfilter-pro-c-2-compressor-plug-in/
- https://musictech.com/reviews/fabfilter-pro-c-2-review/
- https://equipboard.com/items/fabfilter-pro-c-2
- https://www.tokyodawn.net/tdr-kotelnikov/
- https://rekkerd.org/?p=101383
- https://www.production-expert.com/home-page/2017/10/04-friday-free-plug-in-tokyo-dawn-labs-kotelnikov?format=amp
- https://www.soundonsound.com/techniques/compress-gang
- https://mixelite.com/blog/sidechain-in-ableton-2/
- https://forum.ableton.com/viewtopic.php?p=1754764
- https://github.com/airwindows/airwindows
- https://deepwiki.com/airwindows/airwindows
- https://www.kvraudio.com/product/air-g-pulse-by-air-g-audio
- https://www.kvraudio.com/product/air-g-volt-by-air-g-audio
- https://packages.debian.org/sid/lsp-plugins
- https://lsp-plug.in/
- https://awesome.ecosyste.ms/projects/github.com%2Fpolarity%2Fplugin.nih.polarity-sc-dark
- https://rekkerd.org/?p=91077
- https://rekkerd.org/?p=53311
- https://www.kvraudio.com/news-print.php?id=30517
- https://lists.ffmpeg.org/doxygen/trunk/af__sidechaincompress_8c_source.html
- https://fuchsia.googlesource.com/third_party/ffmpeg/+/n3.3.7/libavfilter/af_sidechaincompress.c
- https://addons.mozilla.org/addon/audiocmprssr/
- https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode
- https://lists.w3.org/Archives/Public/public-audio/2012OctDec/0331.html
- https://lists.w3.org/Archives/Public/public-audio/2013AprJun/0197.html
- https://lists.w3.org/Archives/Public/public-audio/2013OctDec/0011.html
- https://forum.babylonjs.com/t/how-to-link-audioworkletnode-with-v2-busses/63630
- Repo files read: `docs/superpowers/specs/2026-10-21-guidance-studio-design.md`, `studio/processors.js`, `studio/song.js` (grep only)
