# H3: Chord stab and pad polysynths — round 1

Agent model: Haiku 5.5. Date: 2026-10-23.

Verification legend used below: "fetched" = I opened the page with WebFetch on 2026-10-23 and the claim is from that page. "snippet" = the claim is from a WebSearch result text only (not opened). "unverified" = nothing I saw supports it. Prices are from snippets, with no date shown on the page unless stated.

## Scope

Polysynths that could produce the reference's chord stabs and the breakdown chord pad, and the browser-side options for them. Covered: Juno and Jupiter, Prophet and Oberheim, FM, modern wavetable and subtractive polysynths, and open-source or free polysynths with public source. Not covered: the chorus DSP as a general topic (S4), the filter DSP (S3), the reverb tail (S2). Those are handed off below.

## What the reference track needs from this category

From the analysis table in `docs/superpowers/specs/2026-10-21-guidance-studio-design.md`:

- Stabs: "short chord stabs on steps 2, 6, 7, 10, 14, 15; wide stereo (L/R correlation 0.41)". Chords are Bmaj9, Bmaj9, G#m7, Emaj7 over a static B bass (the spec marks the progression as lower confidence).
- Breakdown: "chord pad" (no further detail in the table).
- Spec tuning notes: the stab/pad must sit in the 300 Hz to 1 kHz band without running hot. The spec does not give envelope times for the stab beyond "short".

What this means for a polysynth: (a) a fast-attack, short-decay poly voice with a filter envelope that snaps closed (stab); (b) a stereo width source, which is either a chorus/ensemble on the bus or per-voice stereo spread; (c) a slow-attack, lowpassed, wide pad voice for the breakdown.

Current studio state, read from `studio/synths.js`:

- `BUILD.stab` (line 243): detuned saw pairs per note, one pair panned to +spread and one to -spread (spread 0.7 by default), a shared lowpass with an envelope (cutoff 1600 Hz, env 2200 Hz, decay 0.18 s), then a highpass at 160 Hz. Width currently comes only from the per-voice pan and the ±10 ct detune. No chorus is inside the voice.
- `BUILD.pad` (line 397): detuned saw pairs (±12 ct), alternating pan ±0.5 per note, a 0.3 Hz sine pitch LFO at ±6 ct, lowpass at 1100 Hz. No chorus inside the voice.

## Findings

| Name | Vendor | Licence (commercial / free / open source) | Formats (VST3, AU, CLAP, AAX, hardware, web) | Relevance to the element | Verified source |
|---|---|---|---|---|---|
| junox (Juno-60 Web Audio emulation) | Daniele Zannotti (original engine), continued by Andy Harman (pendragon-andyh) | Open source, GPL-3.0 (fetched) | Web (AudioWorklet, fetched); has a chorus visualisation demo (fetched) | Best browser-native Juno chorus reference for stab and pad width. Its chorus implementation was not confirmed from the code. | verified: https://github.com/pendragon-andyh/junox (fetched); demo https://pendragon-andyh.github.io/junox/ (snippet) |
| Juno-60 chorus analysis | pendragon-andyh | Open source, GPL-3.0 per the junox page (fetched) | None (analysis repo, not a synth) | Gives the chorus model: one triangle LFO, two 256-step bucket-brigade delay lines, right channel inverted. Modes about 0.51 Hz and 0.86 Hz (stereo), and 9.75 Hz (mono). The author's caveats are in the Findings notes below. | verified: https://github.com/pendragon-andyh/Juno60/blob/master/Chorus/README.md?plain=1 (fetched) |
| Youth106 (Juno-106 rebuild) | nagualcode (Jardim Sonoro) | GPL-3.0-or-later (fetched). The search snippet describes it as a "free, non-commercial" study; this conflict is unresolved. | VST3, AU, CLAP (fetched); Rust with the truce framework | Juno-106 poly: six voices by default, 8 and 10 optional (fetched). README names an MN3009 BBD chorus and an IR3109 ladder filter (fetched). Good for a stab and pad with the 106's chorus. Desktop only. | verified: https://github.com/nagualcode/youth106 (fetched); release notes https://github.com/nagualcode/youth106/releases/tag/v0.1.1 (snippet) |
| Ultramaster KR-106 | Not confirmed from the sources (article names only) | Free, GPL (snippet, from two articles) | macOS, Linux, Windows (snippet) | Juno-106 emulation with an MN3009-style BBD chorus and per-voice component variance (snippet). One reviewer said the chorus, filters and oscillators do not sound like a real Juno (snippet). | verified (snippet only): https://synthanatomy.com/2026/03/ultramaster-kr-106-an-open-source-roland-juno-106-synthesizer-emulation.html ; https://bedroomproducersblog.com/2026/03/19/ultramaster-kr-106/ |
| Juno-106.js | Steven Goldberg (stevengoldberg) | Licence not found | Web Audio + Web MIDI, Backbone.Marionette (snippet) | Browser Juno-106 with a chorus at two intensity settings (snippet). The chorus is listed as unfinished in the project's to-do (snippet). Useful as a browser Juno-106 control reference. | verified (snippet only): https://github.com/stevengoldberg/juno106 |
| schollz/juno-60 | schollz | MIT for its chorus, per the port's own description (snippet: the chorus follows Peter Allwin's junologue-chorus, MIT) | SuperCollider (C++) port of junox (snippet) | A second, independent Juno-60 chorus implementation to compare against junox. | verified (snippet only): https://github.com/schollz/juno-60 |
| webOBXD | jariseon | GPL-3.0 (fetched) | Web: AudioWorklets, WebAssembly, WAM (fetched); "Currently runs best in Chrome" (fetched) | OB-X polysynth in a browser. Good for pads and poly stabs with a Oberheim-style filter. No chorus found in this repo. | verified: https://github.com/jariseon/webOBXD (fetched) |
| OB-Xd (discoDSP / reales) and forks | discoDSP (upstream), community forks | Source up to 2.11 under GPL v3; newer releases freeware (snippet). Forks kovala/ob-xd and others are GPL-3.0 (snippet). | VST2/VST3/AU/LV2/CLAP depending on fork (snippet) | Oberheim polysynth for pads and stabs. Upstream README says it has no internal effects, so any chorus must be a separate effect (snippet). | verified (snippet only): https://github.com/reales/OB-Xd ; https://github.com/kovala/ob-xd |
| Dexed | Digital Suburban / asb2m10 | GPL-3.0 (fetched) | VST3 and CLAP named on the page; "multi format plugin synth" (fetched). AU, LV2 and standalone (snippet). | FM poly, DX7 sysex compatible (snippet). FM electric keys and bell-like stabs. No chorus in the plugin. Desktop. | verified: https://github.com/asb2m10/dexed (fetched); https://asb2m10.github.io/dexed/ (snippet) |
| webdx7 | webaudiomodules | MIT (snippet) | Web: WebAssembly in AudioWorklet, WAM (snippet) | Browser DX7 FM. Work in progress; author warns of "pure hacks" for AudioWorklet limitations. Last update March 2022 (snippet). Activity not confirmed. | verified (snippet only): https://github.com/webaudiomodules/webdx7 ; https://www.webaudiomodules.org/blog/webdx7-wasm-wip/ |
| Surge XT | Surge Synth Team | GPL-3.0 (fetched) | VST3, AU, LV2, standalone (fetched); CLAP (snippet). Regular releases (fetched). | Hybrid poly synth with a built-in chorus FX and chorus presets, including Supersaw and Unison (snippet). Preset count disagrees: 2,800+ (MusicTech) vs 1000+ (PluginDrop) (snippet). Stereo not confirmed. Good for prototyping stabs and pads on desktop before porting. | verified: https://github.com/surge-synthesizer/surge (fetched); https://musictech.com/products/surge-xt-synthesizer-plugin/ (snippet) |
| Vital | Matt Tytel (mtytel) | GPL-3.0 with a paid non-GPL licence option for closed or App Store use (fetched). Free edition has the full synth, 75 presets and 25 wavetables (snippet). Paid tiers: $25 Plus and $80 Pro (snippet from a blog; date not shown, approximate). | Desktop plugin; not web (no web build found) | Wavetable poly synth with a large free preset ecosystem: house stab presets exist (snippet, Presetshare). Free-version presets may not be redistributed (fetched). Good preset source to audition a stab sound. | verified: https://github.com/mtytel/vital (fetched); https://muted.io/vital-presets/ (snippet) |
| Helm | Matt Tytel | GPL-3.0 (fetched) | Desktop; repo archived by owner 8 Feb 2025, read-only (fetched) | 32-voice poly, up to 15 unison oscillators per oscillator (fetched). No chorus in the listed effects (snippet). Archived, so less useful as a reference. Fork at bepzi/helm (snippet, GPL-3.0). | verified: https://github.com/mtytel/helm (fetched); https://github.com/bepzi/helm (snippet) |
| Pro-54 (Cmajor patch, Prophet-5-style) | Julian Storer, Cesare Ferrari (Cmajor). Native Instruments original (Pro-53). | Licence for the patch not found. Cmajor itself: dual GPLv3 / commercial (snippet). | Browser (Cmajor patch) (snippet: browser only for now) | A Prophet-5-style poly in a browser (snippet). Good for a filter-env stab. README calls it a close translation of an unreleased internal C++ port of the Pro-53 (fetched). | verified: https://github.com/cmajor-lang/cmajor/tree/main/examples/patches/Pro54 (fetched); https://synthanatomy.com/2024/03/native-instruments-pro-53-is-back.html (snippet) |
| Tone.js (PolySynth + Chorus) | tonejs | MIT (fetched) | Web Audio framework (fetched) | Browser building blocks: a PolySynth wrapping mono voices and a stereo Chorus effect with LFO-modulated delays (snippet from the Tone.js docs). Defaults in the snippet: frequency 1.5, delayTime 3.5 ms, depth 0.7, spread 180 degrees. The docs page itself was not fetched (DNS failed). | verified (repo fetched): https://github.com/tonejs/tone.js ; docs (snippet only): https://tonejs.github.io/docs/14.7.58/Chorus |
| Gombassa Web_Audio_Polysynth | Gombassa | No licence stated (fetched) | Web, no build step (fetched) | 10-voice poly in one HTML file using plain Web Audio and Web MIDI (fetched). Small reference for voice management in the studio's own style. Licence absence means no code reuse. | verified: https://github.com/Gombassa/Web_Audio_Polysynth (fetched) |
| Morphoice EightyEight | Morphoice | Free beta, pay-what-you-want; source not found (snippet) | Desktop plugin; built with FAUST (snippet) | Jupiter-8 emulation (snippet). Chorus is the Juno-6 chorus borrowed from EightySix. Developer says the Jupiter-8 never had a chorus (snippet). Still in beta (snippet). | verified (snippet only): https://www.morphoice.com/eightyeight ; https://synthanatomy.com/2026/06/morphoice-eightyeight-a-roland-jupiter-8-emulation.html |
| Arturia Chorus JUN-6 / Jun-6 V | Arturia | Commercial. Price not found. | Desktop plugins (snippet) | Commercial Juno-6 chorus (three modes; I + II sums to mono) (snippet). Closed source. Listed for the chorus character only. | verified (snippet only): https://www.arturia.com/products/software-effects/chorus-jun-6/overview |
| Cherry Audio Mercury-8 | Cherry Audio | Commercial. Price not found. | Desktop plugin (snippet) | Jupiter-8 emulation with a DCO chorus described as modelled on the Roland Juno chorus (snippet). Closed source. | verified (snippet only): https://synthanatomy.com/2025/11/cherry-audio-mercury-8-review-roland-jupiter-8-emulation.html |
| Synth1 (Daichi Laboratory) | Daichi Laboratory (Ichiro Toda) | Freeware, not open source. A Medium article says open source; the LMMS forum thread and the manual disagree (snippet). | Desktop plugin | Free poly subtractive with a large community preset base (snippet). Not usable as source. | verified (snippet only): https://daichilab.sakura.ne.jp/softsynth/synmanu/readmeeng.html ; https://www.lmms.io/forum/viewtopic.php?t=35545 |

Not found: a free open-source Juno-106 or Prophet-5 with a published licence that also runs in a browser. Pro-54 is browser-only but its patch licence is not stated. No source-available Jupiter-8 or CS-80 style pad synth was found in these searches.

## Recommended gear list

Ranked. Costs are as found; all prices are approximate and dated 2026-10-23 at the time of the search.

1. **junox + Juno60 chorus analysis (GPL-3.0, free).** Best fit for the stab and pad width. A Web Audio/AudioWorklet Juno-60 exists to read, and the analysis gives a concrete two-delay-line chorus model to reimplement in the studio's own code. Caveat: the analysis is Juno-60 and is disputed in parts (see Findings and notes). GPL terms apply if code is copied.
2. **Youth106 (GPL-3.0-or-later, free; the snippet says non-commercial, conflict open).** A Juno-106 poly with an MN3009-type BBD chorus and an IR3109 ladder model, six voices by default. Desktop only, so the use is as a listening reference and parameter map, not as runtime code.
3. **Pro-54 Cmajor patch (free to run in browser; licence not found).** Prophet-5-style poly in a browser for listening and for a filter-snap stab reference. Do not copy code until its licence is found.
4. **Tone.js (MIT, free).** Ready browser PolySynth and stereo Chorus. Useful as a fast test bench for a chorus on the stab bus. It would add a CDN script, which the repo's "no build step" rule permits, but the studio currently has its own engine, so this is a prototype aid, not a replacement.
5. **Surge XT (GPL-3.0, free).** Polyphonic hybrid with a chorus FX and chorus presets. Use it on desktop to prototype the target stab and pad sounds and to measure the target before recreating them.
6. **Vital (GPL-3.0 with a paid licence exception; free edition; $25 and $80 paid tiers per a blog snippet, date not shown).** Preset source for house stabs. Redistribution of the free presets is restricted (fetched).
7. **webOBXD (GPL-3.0, free).** OB-X poly with WAM and AudioWorklet in a browser. Good for a pad with an Oberheim filter. No chorus found.
8. **Dexed (GPL-3.0, free) and webdx7 (MIT, free, work in progress).** FM options for bell-like or electric keys stabs. Desktop for Dexed; browser for webdx7 with the caveats above.
9. **Commercial, listed for character only:** Arturia Chorus JUN-6 and Jun-6 V, Cherry Audio Mercury-8, Morphoice EightyEight (free beta). Prices not found, except the EightyEight beta is pay-what-you-want (snippet, date not shown).

## Browser feasibility

- **Runs in a browser now:** junox (AudioWorklet, GPL-3.0; fetched), Juno-106.js (Web Audio + Web MIDI, snippet), webOBXD (WAM, AudioWorklet, WASM; fetched), webdx7 (WAM, WASM; snippet, WIP), Pro-54 (Cmajor patch; snippet), Gombassa Web_Audio_Polysynth (plain Web Audio, no licence; fetched).
- **Web Audio equivalent exists:** the Juno chorus can be built from the Juno60 analysis as two bucket-brigade-style delay lines (2 to 20 ms region, per the Tone.js chorus defaults in the snippet) driven by a triangle LFO at about 0.5 to 0.9 Hz, with the right channel's LFO inverted. The studio already has a `chorus` processor (rate, depth, mix; from the BRIEF). Whether it is wired to the stab bus is not checked here.
- **Would need reimplementing:** the stab's filter-envelope snap is already present in `BUILD.stab` (cutoff, env, decay). The pad has no chorus, so an ensemble would need adding to `BUILD.pad` or the bus. A true Juno BBD character (noise, bit-crush, non-linear delay, from the Juno60 analysis) would need a waveshaper plus delay model; the author's own analysis says the effect is minor and the output shows some distortion.
- **Not browser:** Youth106 (Rust/truce), Dexed (JUCE), Vital, Surge XT, Helm, OB-Xd forks, Arturia, Cherry Audio, TAL-J-8. Use as reference or measurement only.

Note on the studio's stab width: `BUILD.stab` already puts the two saws of each note hard apart (±spread with ±10 ct detune). A stereo chorus on top will widen further. Whether 0.41 L/R correlation is reached with the current pan alone is not measured here; that is a test for the Opus agents, not something I could verify.

## Recalled, not verified

- Vital has a built-in chorus effect and a wavetable engine with unison. (Recalled. The Vital GitHub page fetched did not list effects.)
- The Juno-106 chorus rates (about 0.5 Hz and 0.86 Hz) are the Juno-60 rates per the Juno60 README. The Juno-106 chorus rates were not found in any source I opened.
- Roland Jupiter-8 has no chorus (per the EightyEight developer's statement in a snippet). Not verified against Roland documentation.

## Handoffs to other agents

- **S4 (chorus and modulation, Sonnet):** the Juno60 chorus model (two bucket-brigade delay lines, triangle LFO, right channel inverted, 0.51 / 0.86 Hz stereo modes and 9.75 Hz mono). S4 should check the Tone.js Chorus defaults and whether the studio's existing `chorus` processor can match it. Also the author's caveat that the modes may be flangers, not choruses.
- **S3 (saturation, EQ and filters, Sonnet):** the Youth106 README names an IR3109 ladder filter (fetched). The Pro-54 README calls it a Pro-53 port; the filter topology was not read.
- **S2 (delay and reverb, Sonnet):** the stab tail and the pad's release under reverb and delay.
- **H5 (browser synths and lead engines, Haiku):** webOBXD, webdx7 and Pro-54 overlap H5's browser-synth brief.
- **O2 (DAW and plugin hosting, Opus):** whether WAM 2.0 hosting is worth targeting; the webaudiomodules project lists its state; the webdx7 and webOBXD maintenance state is unknown.
- **S5 (stems and transcription, Sonnet):** no direct overlap. Mentioned only so that stab-chord detection is not assumed to be solved.

## Questions for the Opus agents

1. (For O1 or S4) Is the reference's stab width mostly from voice-level pan, or from a bus chorus? A render of `BUILD.stab` with and without a chorus, measured for L/R correlation against the reference's 0.41, would answer it. Who runs that test?
2. (For O2) The repo has no LICENSE file (`Glob` on /home/user/havantechno found none). Before any GPL code (junox, Youth106, webOBXD, Dexed) is copied or ported into the studio, which licence should the studio carry? If GPL, the copied code and any derivative must be GPL. If not, only the analysis can be reimplemented.

## Sources

- https://github.com/pendragon-andyh/junox (fetched)
- https://pendragon-andyh.github.io/junox/ (snippet)
- https://github.com/pendragon-andyh/Juno60/blob/master/Chorus/README.md?plain=1 (fetched)
- https://github.com/schollz/juno-60 (snippet)
- https://github.com/nagualcode/youth106 (fetched)
- https://github.com/nagualcode/youth106/releases/tag/v0.1.1 (snippet)
- https://synthanatomy.com/2026/03/ultramaster-kr-106-an-open-source-roland-juno-106-synthesizer-emulation.html (snippet)
- https://bedroomproducersblog.com/2026/03/19/ultramaster-kr-106/ (snippet)
- https://github.com/stevengoldberg/juno106 (snippet)
- https://github.com/jariseon/webOBXD (fetched)
- https://github.com/reales/OB-Xd (snippet)
- https://github.com/kovala/ob-xd (snippet)
- https://github.com/asb2m10/dexed (fetched)
- https://asb2m10.github.io/dexed/ (snippet)
- https://github.com/webaudiomodules/webdx7 (snippet)
- https://www.webaudiomodules.org/blog/webdx7-wasm-wip/ (snippet)
- https://github.com/surge-synthesizer/surge (fetched)
- https://musictech.com/products/surge-xt-synthesizer-plugin/ (snippet)
- https://github.com/mtytel/vital (fetched)
- https://muted.io/vital-presets/ (snippet)
- https://github.com/mtytel/helm (fetched)
- https://github.com/bepzi/helm (snippet)
- https://github.com/cmajor-lang/cmajor/tree/main/examples/patches/Pro54 (fetched)
- https://synthanatomy.com/2024/03/native-instruments-pro-53-is-back.html (snippet)
- https://github.com/tonejs/tone.js (fetched)
- https://tonejs.github.io/docs/14.7.58/Chorus (snippet; fetch failed)
- https://github.com/Gombassa/Web_Audio_Polysynth (fetched)
- https://www.morphoice.com/eightyeight (snippet)
- https://synthanatomy.com/2026/06/morphoice-eightyeight-a-roland-jupiter-8-emulation.html (snippet)
- https://www.arturia.com/products/software-effects/chorus-jun-6/overview (snippet)
- https://synthanatomy.com/2025/11/cherry-audio-mercury-8-review-roland-jupiter-8-emulation.html (snippet)
- https://daichilab.sakura.ne.jp/softsynth/synmanu/readmeeng.html (snippet)
- https://www.lmms.io/forum/viewtopic.php?t=35545 (snippet)

Fetch failures (not used as sources): https://surge-synthesizer.github.io/faq/ (DNS error); https://tonejs.github.io/docs/14.7.58/Chorus (DNS error).
