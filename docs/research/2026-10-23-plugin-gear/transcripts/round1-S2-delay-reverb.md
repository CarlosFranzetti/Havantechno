# S2: Delay and reverb — round 1
Agent model: Sonnet. Date: 2026-10-23.

**Verification note (read first).** WebFetch failed for every page I tried (DNS errors: michaelwillis.github.io, valhalladsp.com, airwindows.com, ccrma.stanford.edu), and a curl fallback was blocked, so I opened no product page. Every fact below comes from WebSearch result summaries. `(verified: <url>)` therefore means "a search result at that URL supported the fact", not "I read the page". Vendor pages that I could not open are marked `(unverified)` where only a third-party page supported the claim. Prices are approximate, taken from third-party listings, seen on 2026-10-23, and may be out of date.

## Scope
Delay and reverb as send effects: algorithmic reverbs, convolution reverbs and free impulse-response (IR) libraries, tape/analogue delay emulations, tempo-synced ping-pong delays, and DAW built-ins. The focus is on what each does (tempo sync and divisions, feedback filtering, modulation, predelay) and whether the algorithm is published, so it could be rebuilt on Web Audio's `ConvolverNode`, `DelayNode` or an `AudioWorklet`.

## What the reference track needs from this category
From the analysis table in `docs/superpowers/specs/2026-10-21-guidance-studio-design.md`:
- Clap on beats 2 and 4, centroid ~2.7 kHz, "short body plus reverb tail". So the reverb is a short tail on the clap, not a long wash.
- Stabs on steps 2, 6, 7, 10, 14, 15, "wide stereo (L/R correlation 0.41)". Width could come from a stereo delay/reverb send, a widener, or both. The table does not say which. I found no measurement of the delay time or the reverb decay in the spec.
- Studio defaults (`studio/processors.js`): delay time 0.357 s, which is 3/16 at 126 BPM (a 16th is 0.119 s), feedback 0.4, tone 3500 Hz, hp 200 Hz. Reverb size 2.2 s, damp 5 kHz, predelay 12 ms, hp 160 Hz.

What the current builders do (read from `BUILD.delay` and `BUILD.reverb`):
- Delay: input → highpass → lowpass → delay L, with ping-pong cross-feedback between two `DelayNode`s. The tone and hp filters sit before the delay input, **not inside the feedback loop**, so repeats do not get progressively darker. There is no modulation of the delay time, no saturation in the loop, and no ducking.
- Reverb: predelay → `ConvolverNode` (generated IR from `K.impulse`, regenerated on size/decay/hp change) → lowpass (damp) → wet. I did not read `K.impulse`, so I cannot say how it builds early reflections or stereo decorrelation. There is no modulation, no early/late split and no ducking.

## Findings
| Name | Vendor | Licence | Formats | Relevance to the element | Verified source |
|---|---|---|---|---|---|
| Dragonfly Reverb (Hall, Room, Plate, Early Reflections) | Michael Willis | Open source, GPL-3.0 | LV2, VST, CLAP and VST3 in newer builds; newest version found 3.2.10 (not confirmed as latest) | Free algorithmic set. Hall is based on Hibiki from Freeverb3 (Moorer early-reflection model plus a modified FDN allpass Zita reverb); Room on ProG Reverb; Plate on NVerb and STRev; one version (DR-2) is based on Freeverb. A "Plate" or "Early Reflections" send suits a short clap tail. Source is GPL, so reading it is fine but copying it into the repo carries GPL obligations. | (verified: https://wiki.linuxaudio.org/apps/all/dragonflyreverb) (verified: https://aur.archlinux.org/packages/dragonfly-reverb-git) (verified: https://wiki.linuxaudio.org/_export/xhtml/apps/all/dragonflyreverb) |
| Zita-Rev1 | Fons Adriaensen (Linux standalone; ported in Faust) | Open source (GPL per a port's licence; original licence not checked) | Linux standalone; Faust `zita_rev1` | Published algorithm: hybrid of Schroeder and an 8th-order FDN, with a Schroeder allpass comb in series with each delay line (coefficients ±0.6 in the version J. O. Smith examined). Per-line damping is a low-shelf plus a first-order lowpass; the lowpass sets the HF decay to half the mid-band decay at the "HF Damping" frequency. Character "more hall than plate". Delay-line lengths were not in the results. | (verified: https://ccrma.stanford.edu/~jos//pasp//Zita_Rev1.html) (verified: https://manpages.org/zita-rev1) (verified: https://faustlibraries.grame.fr/libs/reverbs/) |
| Freeverb | Jezar at Dreampoint (2000) | Public domain | Many ports (Csound, Tone.js, etc.) | 8 parallel lowpass-feedback combs plus 4 series allpasses per channel; right channel detuned by adding a "stereospread" of 23 samples to all 12 line lengths. Comb delays 1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617 and allpass delays 556, 441, 341, 225 samples at 44.1 kHz (from a CCRMA port); allpass gain 0.5. The smallest published algorithm here and trivial to rebuild. | (verified: https://www.dsprelated.com/freebooks/pasp/Freeverb.html) (verified: https://csound.com/manual/opcodes/freeverb/) (verified: https://windfis.ch/git/muse/tree/muse2/plugins/freeverb/readme.txt) (verified: https://ccrma.stanford.edu/~byoink/220b/hw3/freeverb.ins) |
| Dattorro plate reverb (algorithm) | Jon Dattorro, "Effect Design, Part 1: Reverberator and Other Filters", JAES vol. 45 no. 9, 1997, pp. 660-684 | Paper hosted at CCRMA (reuse terms not checked); the AES copy is members-only | Algorithm only | Published two-half cross-coupled tank with modulated delay lines. A Web Audio version exists: khoin/DattorroReverbNode (AudioWorklet, stereo in/out, cubic interpolation, ~83 stars, last push Aug 2020, licence marked "other" so unclear). `fverb` by jpcima is a C stereo variant. | (verified: https://ccrma.stanford.edu/%7Edattorro/EffectDesignPart1.pdf) (verified: https://aes2.org/publications/elibrary-page/?id=10160) (verified: https://awesome.ecosyste.ms/projects/github.com%2Fkhoin%2Fdattorroreverbnode) (verified: https://github.com/jpcima/fverb) |
| Airwindows reverbs (Verbity, Verbity2, Galactic) | Airwindows (Chris Johnson) | Open source, MIT, credit Airwindows | VST/AU, macOS, Windows, Linux (Verbity per the vendor snippet) | Source published. Verbity is strictly dual mono (no stereo spread); Verbity2 uses 5x5 matrices vs Verbity's 4x4; Galactic is aimed at deep ambient space. Good code to read for compact matrix reverbs. Not aimed at short drum tails. I did not confirm Kitchen Sink (not in the results). | (verified: https://www.airwindows.com/verbity2/) (verified: https://airwindows.com/galactic) (verified: https://www.kvraudio.com/product/air-g-spaces-by-air-g-audio) |
| CloudSeed / CloudSeedCore | Valdemar Erlingsson (later versions sold via Ghost Note Audio) | Open-source core; forum posts say MIT (licence text not seen) | VST; ports (CloudReverb VST3/LV2, Daisy build) | Algorithmic reverb whose core algorithm is published for reuse. Treat the MIT claim as unverified until the repo's LICENSE is read. | (verified: https://github.com/ValdemarOrn/CloudSeed) (verified: https://packages.altlinux.org/en/sisyphus_loongarch64/srpms/CloudReverb/) (verified: https://forum.electro-smith.com/t/daisycloudseed-lush-reverb/522) |
| ValhallaSupermassive | Valhalla DSP (Sean Costello) | Free (freeware, not open source) | VST2.4, VST3, AAX, AU per a third-party database (CLAP and Linux not mentioned); vendor page not opened | Delay/reverb built on feedback delay networks. Tempo-synced delays, delay lines up to 2 s, Warp, Density, modulation depth/rate, HP/LP filters, width. Modes are named after celestial objects; source counts disagree (8, 18, 20, 22). Version 4.0 added Pleiades mode (Nov 2024 article). More ambient than drum-bus. | (verified: https://routenote.com/blog/valhallas-supermassive-delay-reverb-plugin-is-now-free/) (verified: https://synthanatomy.com/2024/11/valhallasupermassive-4-0-free-delay-reverb-plugin-gets-pleiades-mode.html) (verified: https://www.production-expert.com/production-expert-1/free-valhalla-supermassive-updated-two-new-modes) (verified: https://bedroomproducersblog.com/2020/05/19/valhallasupermassive/) |
| ValhallaDelay | Valhalla DSP | Commercial, $50 USD on the vendor store per a search summary, seen 2026-10-23, approximate | Not confirmed (vendor page not opened) | Seven delay modes including Tape and HiFi, Ratio and Quad styles, Ghost mode (frequency shifting), a diffusion section, an Age control, delay 0 ms to 20 s (per a 2019 launch article). Overkill for one 3/16 ping-pong, but shows the feature set a "good" delay has. | (verified: https://synthanatomy.com/2019/04/valhalladsp-announced-valhalladelay-plugin-pc-mac.html) (verified: https://valhalladsp.com/?p=5) |
| ValhallaVintageVerb | Valhalla DSP | Commercial, $50 USD (same sources), approximate | AU, VST on Mac and Windows per a review listing | Algorithmic reverb, 22 reverb modes plus 3 colour modes (1970s, 1980s, modern) in most sources (one says 18 algorithms); light CPU. Standard "everything" reverb for electronic mixes; 1980s-style plate/room modes are the likely fit for a clap tail. | (verified: https://equipboard.com/items/valhalladsp-valhallavintageverb-reverb-plugin) (verified: https://www.musicianwave.com/?p=68838) (verified: https://omr.com/en/reviews/product/valhalla-vintageverb/pricing) |
| ValhallaRoom | Valhalla DSP | Commercial, $50 USD per a forum post quoting the product description (may be outdated) | Not found | Early and Late sections; predelay delays the onset of both; Decay is a mid-frequency decay with bass and high multipliers (3 bands); decay 0.1 s to 100 s. Shows a standard early/late structure. | (verified: https://valhalladsp.com/?p=734) (verified: https://gearspace.com/threads/valhallaroom.585768/post-9994043) |
| FabFilter Pro-R 2 | FabFilter | Commercial, about $199 per retailer listings; one comparison article said $199 in the FabFilter USD shop on 2026-09-17 (author is a competitor; approximate) | Not confirmed from results | Space knob blends room models with matched decay time; Decay Rate scales decay (25%-400% in one listing); Decay Rate EQ shapes decay time across frequency; 6-band Post-EQ; predelay 0-500 ms; Freeze; Vintage and Plate algorithms. Feature text comes from retailer copy, not the vendor manual. | (verified: https://www.pluginboutique.com/product/2-Effects/17-Reverb/11576-FabFilter-Pro-R-2) (verified: https://www.adorama.com/ff10352623.html) (verified: https://rysupaudio.com/blogs/news/fabfilter-timeless-3-alternatives) |
| FabFilter Timeless 3 | FabFilter | Commercial, about $149 current listing (launch price EUR 109 / USD 129); approximate | Not confirmed | Tape-delay style multi-tap: 16 delay lines with host tempo sync and panning, 6 multimode filters, 300+ presets, extensive modulation (one listing). | (verified: https://synthyfrog.com/app/fabfilter-timeless-3/) (verified: https://equipboard.com/items/fabfilter-timeless-3) (verified: https://www.production-expert.com/production-expert-1/fabfilter-timeless-3-updated-delay-plugin) |
| Soundtoys EchoBoy | Soundtoys | Commercial; $199 on an undated Dubspot listing (possibly old; current price not found) | Not confirmed | The common tape/analogue delay. 30 styles modelled on EchoPlex, Space Echo, Memory Man, DM-2, TelRay oilcan; tape saturation (Ampex ATR-102 etc.), flutter, diffusion; low and high cut; dual-delay and ping-pong; tempo sync, tap tempo, Groove and Feel offset; Rhythm Echo up to 16 taps. | (verified: https://blog.dubspot.com/it/plugins/echoboy) (verified: https://reverb.com/item/13027089-soundtoys-echoboy) (verified: https://synthanatomy.com/2016/12/soundtoys-released-echoboy-jr.html) |
| WSTD DLAY | wasted-audio (itch.io) | Open source, GPL v3 (listing) | CLAP, VST3 (listing tags) | Tempo-synced option, 50 ms to 5000 ms, a Cross control from stereo to ping-pong. Candidate free open-source ping-pong. | (verified: https://wasted-audio.itch.io/wstd-dlay) |
| Voxengo Tempo Delay | Voxengo | Free, not open source | VST3, AU (Windows and Mac) | Separate delay, repetition period and panning controls for ping-pong; parameters lock to project BPM; host sync and multipliers; zero latency. | (verified: https://www.voxengo.com/product/tempodelay/") (verified: https://www.audiotechnology.com/free-stuff/voxengo-tempo-delay) |
| ChowMatrix | Chowdhury DSP | Free and open source (specific licence not named in results) | Sources disagree on formats | Tree of delay lines with per-node feedback, pan, distortion, and "Insanity" random modulation. Creative delay, not a straight 3/16 ping-pong. Note: results found no ChowDSP "tape echo"; ChowTape is a separate tape-saturation plugin. | (verified: https://synthanatomy.com/2020/12/chowdhury-dsp-chow-matrix-is-a-free-delay-plugin-modular-insanely-complex.html) (verified: https://www.audiotechnology.com/free-stuff/chowdsp-chow-matrix) |
| Ableton Echo | Ableton | Commercial DAW built-in (Live) | Live device | Ping Pong, Stereo and Mid/Side modes; time synced as Notes, Dotted, Triplet, 16th, or ms; Stereo Link; feedback; filter; stereo LFO (8 bars to 64th sync, or 0.01-40 Hz) modulating delay time and filter cutoff; input gate; noise generator; reverb in the output section (its controls were not in the results). | (verified: https://www.musicradar.com/how-to/ableton-live-10-echo-explained) (verified: https://www.soundonsound.com/techniques/echo-ableton-live) |
| Ableton Hybrid Reverb | Ableton | Commercial pack, USD 99 per the search summary (approximate) | Live device | Convolution and algorithmic engines in parallel, series or solo; import any audio file as an IR; HP/LP filters with slopes 6-96 dB/oct; two peak EQs; Stereo, Vintage, Bass Mono outputs; tempo-syncable predelay. | (verified: https://www.ableton.com/en/packs/hybrid-reverb/) |
| Logic Pro Space Designer / Delay Designer / ChromaVerb | Apple | Commercial DAW built-ins | Logic | Space Designer: convolution reverb with IRs of real spaces, envelope and EQ. Delay Designer: up to 26 taps, per-tap level, pan, filter, transposition. ChromaVerb: named but not described in my results. | (verified: https://support.apple.com/en-al/guide/logicpro/lgcea77399b4/mac) (verified: https://musicradar.com/news/fantastic-stock-plugins-logic-delay-designer) |
| FL Studio Fruity Delay 3 / Delay Bank | Image-Line | Commercial DAW built-in | FL Studio | Ping-pong as a mode; the **Cutoff filter sits inside the feedback loop so each echo is filtered further**; feedback can exceed 100%; tempo-synced. Delay Bank has an 8-state filter in the feedback section. Fruity Reverb 2 / Convolver: not found. | (verified: https://www.image-line.com/support/flstudio_online_manual/html/plugins/Fruity%20Delay%203.htm) (verified: https://flstudio.image-line.com/help/html/plugins/Fruity%20Delay%20Bank.htm) |
| Reaper ReaVerb / ReaDelay / ReaVerbate / JSFX | Cockos | Commercial DAW built-ins | Reaper | ReaVerb is a convolution processor that ships with no IRs (two digital-reverb presets) and loads any WAV; JSFX effects are text-editable. ReaVerbate and ReaDelay features: not found. | (verified: https://www.soundonsound.com/techniques/reaverb-part-1) (verified: https://reaper.blog/2018/04/reaverb_custom_ir/) (verified: https://www.cockos.com/wiki/index.php/ReaperEffects) |
| OpenAIR IR library | University of York Audiolab (AHRC-funded) | Per-item Creative Commons (licence chosen by each contributor, shown at the bottom of each item's page; some may reserve all rights) | WAV (stereo, B-format, 5.1) | Real-space IRs for a `ConvolverNode`. Check each IR's licence before bundling; CC variants with NC or SA terms matter if the repo is redistributed. | (verified: https://www.openair.hosted.york.ac.uk/?page_id=2) (verified: https://sonicfield.org/openair-a-collective-library-of-impulse-responses) |
| EchoThief IR library | Chris Warren (library); Stagecraft Software (paid plugin) | Free IRs; a licence copy hosted on a Boston University course page says use in derivative work (e.g. convolving) is allowed and other uses need author contact. I could not confirm it is the current licence. | WAV | Free real-space IRs. The plugin itself is commercial (7,980 yen at one Japanese retailer, seen 2026-10-23, approximate). | (verified: https://www.cs.bu.edu/fac/snyder/cs583/Homeworks/ImpulseResponses/EchoThiefImpulseResponseLibrary/EchoThief%20License.pdf) (verified: https://www.soundhouse.co.jp/en/products/detail/item/371076) |
| Tone.js reverbs and delays | Tone.js project | Licence not checked | Web (Web Audio) | `Reverb` (convolution from generated IR with room-size and presets), `Freeverb` (room size, dampening), `JCReverb`, `FeedbackDelay`, `PingPongDelay`. Discussion notes that Freeverb and JCReverb were switched to `ConvolverNode`s, with performance reports on mobile Safari. A direct web-native reference. | (verified: https://tessl.io/registry/tessl/npm-tone/15.3.0/files/docs/effects.md) (verified: https://lightrun.com/answers/tonejs-tone-js-open-to-cheap-feedbackcombfilter) |

Mixing practice (clap reverb) is thin: I found no source specific to claps in electro. General advice from a search summary: a short plate or room (about 0.7 to 1.4 s or 1.1 s with 25 ms predelay), reverb on an aux send at 100% wet, high-pass the return around 180-300 Hz, low-pass around 7-10 kHz, and duck 3-6 dB on kick hits (verified: https://hyperbits.com/blog/how-to-use-reverb/) (verified: https://gearspace.com/board/music-computers/1080647-what-kind-reverb-settings-house.html). These are generic tips, mostly for vocals, and a forum post is about 10 years old.

## Recommended gear list
Ranked for this project (recreating the track, then reimplementing in the browser). Costs are approximate and dated 2026-10-23.
1. **Freeverb topology (public domain), as an AudioWorklet or built from `DelayNode` + `BiquadFilterNode` feedback loops.** Smallest published algorithm; 8 damped combs + 4 allpasses with stereospread gives a decorrelated, wide tail. Cost: none. Replaces the generated-IR reverb for a short, damped clap tail while keeping `ConvolverNode` as an option.
2. **Dattorro plate (published paper; khoin/DattorroReverbNode as a reference, licence unclear).** The best-documented plate-style algorithm with built-in modulation and predelay/damping/bandwidth parameters. Cost: none; reuse terms unclear, so reimplement from the paper rather than copy the code.
3. **Dragonfly Reverb (Plate / Room / Early Reflections), GPL-3.0, free.** The reference to A/B the studio's reverb against in a desktop DAW, and to study for early-reflection plus late-tail structure. Do not copy GPL code into the repo without deciding on the licence.
4. **A feedback-filtered ping-pong delay (model on FL Fruity Delay 3 and Ableton Echo behaviour).** Move the lp/hp **inside** the loop, add a slow delay-time LFO and optional saturation (EchoBoy-style) so repeats darken. Cost: none (reimplementation).
5. **Voxengo Tempo Delay (free) or WSTD DLAY (GPL v3, free) as desktop references** for a tempo-synced ping-pong to compare against.
6. **Free IRs (OpenAIR per-item CC, EchoThief free for derivative work) for a convolution mode** if the DAW wants real-room sends. Bundle only items whose licence allows redistribution.
7. **ValhallaSupermassive (free, closed) as a listening reference** for FDN-style modulated delay-reverb.
8. **Commercial references if budget allows:** ValhallaVintageVerb or ValhallaRoom (about $50 each), FabFilter Pro-R 2 (about $199), EchoBoy (price uncertain), Timeless 3 (about $149). Useful for measuring what a "good" short tail looks like; none is needed to reimplement.

## Browser feasibility
- **Already in the studio:** `ConvolverNode` reverb with generated IR, two `DelayNode`s with `GainNode` feedback and `BiquadFilterNode` tone/hp.
- **Web Audio equivalent exists:** Freeverb can be built from `DelayNode` plus a filter in each comb's feedback path (the ITNext article describes building Freeverb from existing nodes; I did not verify it works without an AudioWorklet). A damped comb in native nodes needs a `DelayNode` loop with a lowpass, but Web Audio's minimum delay in a feedback loop is one render quantum (128 samples), which constrains short comb lengths; this is from my own knowledge, not from a source, so treat as unverified.
- **Needs an AudioWorklet:** Dattorro tank (modulated, sample-accurate short delays), true FDN or Zita-Rev1 style, tape-style delay with modulated read head and saturation in the loop. The studio has no worklet today; `selfcheck.js` would need a stub (per the repo CLAUDE.md, new node types need a matching stub).
- **Convolution:** `ConvolverNode` accepts mono, stereo or 4-channel buffers; IRs must be shipped as data (the repo currently has no audio files) or generated.
- **Cannot run in a browser as-is:** VST/AU/AAX/CLAP binaries (Dragonfly, Valhalla, FabFilter, Soundtoys). Open-source algorithms (Dragonfly via Freeverb3, Airwindows, CloudSeed) could be ported to JS or Faust-to-WebAudio; licence matters (GPL vs MIT).

## Recalled, not verified
- Faust can export Web Audio/AudioWorklet code, and its `zita_rev1` is available in its libraries (the Faust libraries page was in my results but I did not confirm the export route).
- Freeverb's "wet scaling" and the exact feedback/damping formulas (room size mapping) are not in my results; read Jezar's source or the CCRMA chapter before implementing.
- Typical electro delay settings (dotted-8th or 3/16, high-passed repeats, mid-level feedback): general knowledge, no source found.
- Soundtoys, FabFilter and Valhalla plugin formats (VST3/AU/AAX/CLAP): not confirmed from vendor pages.

## Handoffs to other agents
- S4 (widener, chorus and modulation): the stabs' L/R correlation of 0.41 may come from the widener rather than the send; ask S4 which tools produce that width. Also delay-time modulation (chorus-style) overlaps S4.
- S1 (sidechain): ducking the reverb/delay return to the kick is standard advice; whether the studio's sidechain can duck a send return belongs to S1 and the engineer.
- S3 (saturation, EQ, filters): tape-style saturation inside the delay feedback loop, and high-pass/low-pass on the sends.
- H4 (drums): the clap voice itself; the "short body plus reverb tail" split between the clap synth and the send is theirs to describe.

## Questions for the Opus agents
1. (O1) The spec gives only a clap "reverb tail" and stab width (correlation 0.41), no measured decay time, predelay or delay time. Can the source MP3 analysis estimate the reverb RT60 on the clap and whether stab repeats exist at 3/16 (0.357 s), so the studio defaults are tuned from data rather than convention? This is my most important open question.
2. (O2) Is adding an AudioWorklet processor acceptable for the "own look per device" and recreation goals, given `selfcheck.js` needs a fake-AudioContext stub per new node type? It decides whether Dattorro/FDN/tape-style delay is practical or only native-node Freeverb-style structures.
3. (O2) Is bundling third-party IRs wanted at all, given the repo ships no audio files and per-item CC licences (OpenAIR) would need tracking?

## Sources
- https://wiki.linuxaudio.org/apps/all/dragonflyreverb
- https://aur.archlinux.org/packages/dragonfly-reverb-git
- https://wiki.linuxaudio.org/_export/xhtml/apps/all/dragonflyreverb
- https://ccrma.stanford.edu/~jos//pasp//Zita_Rev1.html
- https://manpages.org/zita-rev1
- https://faustlibraries.grame.fr/libs/reverbs/
- https://www.dsprelated.com/freebooks/pasp/Freeverb.html
- https://csound.com/manual/opcodes/freeverb/
- https://windfis.ch/git/muse/tree/muse2/plugins/freeverb/readme.txt
- https://ccrma.stanford.edu/~byoink/220b/hw3/freeverb.ins
- https://ccrma.stanford.edu/%7Edattorro/EffectDesignPart1.pdf
- https://aes2.org/publications/elibrary-page/?id=10160
- https://awesome.ecosyste.ms/projects/github.com%2Fkhoin%2Fdattorroreverbnode
- https://github.com/jpcima/fverb
- https://www.airwindows.com/verbity2/
- https://airwindows.com/galactic
- https://www.kvraudio.com/product/air-g-spaces-by-air-g-audio
- https://github.com/ValdemarOrn/CloudSeed
- https://packages.altlinux.org/en/sisyphus_loongarch64/srpms/CloudReverb/
- https://forum.electro-smith.com/t/daisycloudseed-lush-reverb/522
- https://routenote.com/blog/valhallas-supermassive-delay-reverb-plugin-is-now-free/
- https://synthanatomy.com/2024/11/valhallasupermassive-4-0-free-delay-reverb-plugin-gets-pleiades-mode.html
- https://www.production-expert.com/production-expert-1/free-valhalla-supermassive-updated-two-new-modes
- https://bedroomproducersblog.com/2020/05/19/valhallasupermassive/
- https://synthanatomy.com/2019/04/valhalladsp-announced-valhalladelay-plugin-pc-mac.html
- https://valhalladsp.com/?p=5
- https://equipboard.com/items/valhalladsp-valhallavintageverb-reverb-plugin
- https://www.musicianwave.com/?p=68838
- https://omr.com/en/reviews/product/valhalla-vintageverb/pricing
- https://valhalladsp.com/?p=734
- https://gearspace.com/threads/valhallaroom.585768/post-9994043
- https://www.pluginboutique.com/product/2-Effects/17-Reverb/11576-FabFilter-Pro-R-2
- https://www.adorama.com/ff10352623.html
- https://rysupaudio.com/blogs/news/fabfilter-timeless-3-alternatives
- https://synthyfrog.com/app/fabfilter-timeless-3/
- https://equipboard.com/items/fabfilter-timeless-3
- https://www.production-expert.com/production-expert-1/fabfilter-timeless-3-updated-delay-plugin
- https://blog.dubspot.com/it/plugins/echoboy
- https://reverb.com/item/13027089-soundtoys-echoboy
- https://synthanatomy.com/2016/12/soundtoys-released-echoboy-jr.html
- https://wasted-audio.itch.io/wstd-dlay
- https://www.voxengo.com/product/tempodelay/"
- https://www.audiotechnology.com/free-stuff/voxengo-tempo-delay
- https://synthanatomy.com/2020/12/chowdhury-dsp-chow-matrix-is-a-free-delay-plugin-modular-insanely-complex.html
- https://www.audiotechnology.com/free-stuff/chowdsp-chow-matrix
- https://www.musicradar.com/how-to/ableton-live-10-echo-explained
- https://www.soundonsound.com/techniques/echo-ableton-live
- https://www.ableton.com/en/packs/hybrid-reverb/
- https://support.apple.com/en-al/guide/logicpro/lgcea77399b4/mac
- https://musicradar.com/news/fantastic-stock-plugins-logic-delay-designer
- https://www.image-line.com/support/flstudio_online_manual/html/plugins/Fruity%20Delay%203.htm
- https://flstudio.image-line.com/help/html/plugins/Fruity%20Delay%20Bank.htm
- https://www.soundonsound.com/techniques/reaverb-part-1
- https://reaper.blog/2018/04/reaverb_custom_ir/
- https://www.cockos.com/wiki/index.php/ReaperEffects
- https://www.openair.hosted.york.ac.uk/?page_id=2
- https://sonicfield.org/openair-a-collective-library-of-impulse-responses
- https://www.cs.bu.edu/fac/snyder/cs583/Homeworks/ImpulseResponses/EchoThiefImpulseResponseLibrary/EchoThief%20License.pdf
- https://www.soundhouse.co.jp/en/products/detail/item/371076
- https://tessl.io/registry/tessl/npm-tone/15.3.0/files/docs/effects.md
- https://lightrun.com/answers/tonejs-tone-js-open-to-cheap-feedbackcombfilter
- https://itnext.io/algorithmic-reverb-and-web-audio-api-e1ccec94621a
- https://hyperbits.com/blog/how-to-use-reverb/
- https://gearspace.com/board/music-computers/1080647-what-kind-reverb-settings-house.html
