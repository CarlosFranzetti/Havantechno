# H1: Kick and sub-bass synthesis — round 1
Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

## Scope

Kick drum (4-on-the-floor, pitch sweep about 130 Hz to 43 Hz in about 60 ms, low click) and the plucked mono sine sub on B1 (about 62 Hz, peak about 35 ms after the kick, about 300 ms decay). Covered: commercial kick synths, drum-machine kick emulations (909, 808), general synths used for subs, free and open-source kick synths, and what each one does for these elements. Out of scope: mid bass (H2), hats and clap (H4), sidechain (S1).

Method and limits, read this first:
- The spec analysis and the in-repo builders were read: `studio/synths.js` `BUILD.kick` (lines 157 to 183) and `BUILD.sub` (lines 186 to 213). Current defaults: kick punch 170 Hz, tune 45 Hz, sweep 0.06 s, decay 0.34 s, click 0.4, drive 0.35. Sub decay 0.4 s, attack 0.005 s, harmonic 0.12, glide 0.
- WebFetch failed with DNS errors on every page I tried. Direct HTTPS through the agent proxy was refused at CONNECT (403). The proxy README treats 403 as a policy denial, so I did not retry. No page was read in full.
- Every "verified" tag below therefore means the claim appeared in a search-result excerpt, and the URL shown is the one in that search result. Excerpts are short and sometimes vendor-written, so treat them as leads to check, not as settled facts.
- One fetch used a URL I composed from a search result's path (unpkg.com instead of app.unpkg.com). It failed and is not cited.
- Prices: no price was found for any commercial item. Dates checked: 2026-10-23.

## What the reference track needs from this category

From the analysis table in `docs/superpowers/specs/2026-10-21-guidance-studio-design.md`:
- Kick: 4-on-the-floor; pitch sweep about 130 Hz to about 43 Hz in about 60 ms; click on top.
- Sub: plucked sine on every beat; peak about 35 ms after the kick; about 300 ms decay; mono.
- The spec says the sub is not sidechained (kick and sub read as one event) and the kick click is kept low.

Gaps between the spec numbers and the current code defaults (my reading, not a source):
- Kick start frequency: the spec measures about 130 Hz; `BUILD.kick` default `punch` is 170 Hz. Tune end 43 Hz versus default 45 Hz is close. Sweep 0.06 s already matches about 60 ms.
- Sub decay: about 300 ms versus default 0.4 s.
- Sub harmonic: the spec says pure sine; the default `harmonic` is 0.12 (a second partial).
- Sub peak offset: no parameter exists for a delayed peak. `attack` is 0.005 s by default. I did not read `envDecay` in `core.js`, so I cannot say whether a longer `attack` would move the peak to about 35 ms. Check that before relying on it.
- The spec says some tuning decisions were made after comparing renders. I did not read `song.js` to see the values each track uses now.

## Findings

| Name | Vendor | Licence (commercial / free / open source) | Formats (VST3, AU, CLAP, AAX, hardware, web) | Relevance to the element | Verified source |
|---|---|---|---|---|---|
| KICK 2 | Sonic Academy | Commercial. Price not found | Not confirmed in excerpts | Synthesised sub generator with its own pitch envelope (first node sets start Hz, last node sets end Hz). Additive sub with up to 8 partials. Sampled click layers, each with its own amp envelope. Per-source keytrack on/off. Vocabulary for the sub and click split. | verified: https://www.pressreader.com/australia/computer-music/20160713/284438508203555 ; https://musicradar.com/reviews/tech/sonic-academy-kick-2-640392 ; https://www.audiotent.com/blogs/production-tips/production-tipsultimate-guide-sonic-academy-kick-2 (excerpts only) |
| KICK 3 | Sonic Academy | Commercial. Price not found | Product page title reads "KICK 3 Drum VST Plugin"; other formats not confirmed | Lets you choose which nodes in the SUB layer respond to keytracking. Phase tools keep the sub in phase with the click and bassline. Phase alignment matters because the reference treats kick and sub as one event. | verified: https://www.sonicacademy.com/products/kick-3 (feature list seen in search summary only) |
| Hexinverter Mutant BD9 | Erica Synths | Commercial hardware module. Price not found | Hardware module (format name not confirmed) | Two separate decay envelopes, one for pitch and one for amplitude, each with its own intensity and decay time, both CV-controllable. Sine or square core with an optional sub-oscillator one or two octaves lower. Matches the sweep/decay split already in `BUILD.kick`. Reviewed as inspired by the TR-909 kick. | verified: https://www.ericasynths.lv/hexinverter-mutant-bd9-3329/ ; https://www.bonedo.de/?p=2612672 (German review, excerpt) |
| BD909 (reverse-engineered TR-909 kick) | Tiptop Audio | Commercial hardware. Price not found (listing seen, not read) | Hardware | Listed controls are Attack, Decay, Tune Decay, Accent and Level. Tuning attack and tune decay interact, so changing one moves where the energy peak sits. Relevant to the click and sweep balance. | verified: https://vintageking.com/products/tiptop-audio-bd909-tr909-bass-drum-generator-black (listing excerpt) |
| Werner, Abel, Smith: "A Physically-Informed, Circuit-Bendable, Digital Model of the Roland TR-808 Bass Drum Circuit" (DAFx-14) | Academic (published paper) | Paper; licence not stated in excerpts | Digital model built in Gen~ (Max); not a product | Models the sub-circuits of the 808 bass drum physically. Separates the characteristic pitch sweep from a frequency jump during the attack. Notes that unmodified units differ from one another. The best published algorithm for the 808 kick pitch behaviour that I found. | verified: https://dafx14.fau.de/papers/dafx14_kurt_james_werner_a_physically_informed,_ci.pdf ; https://dafx.de/paper-archive/details/hwkd1Lfe8vmtOxCEjsNY-g ; https://www.musica.ed.ac.uk/?p=597 (lecture abstract, excerpt) |
| Deruty, arXiv preprint on the TR-808 bass drum (2502.07524) | Academic (arXiv) | Preprint | Not applicable | Says the usable tuning range of the 808 bass drum is limited if its characteristic sound is to be kept. Bears on the tune range of `BUILD.kick` (30 to 90 Hz). | verified: https://arxiv.org/pdf/2502.07524v1 (excerpt only) |
| MembraneSynth (Tone.js 15.0.4) | Tone.js project | Open source per the package. Licence not seen (see Recalled) | Web Audio, runs in the browser | Kick and tom voice: one oscillator, pitch envelope starts at note times `octaves` and ramps to the note over `pitchDecay`. Defaults: sine, `octaves` 10, `pitchDecay` 0.05 s. Same architecture as `BUILD.kick`. Reference for parameter ranges. | verified: https://app.unpkg.com/tone@15.0.4/files/build/esm/instrument/MembraneSynth.js ; https://tessl.io/registry/tessl/npm-tone/15.3.0/files/docs/instruments.md (type listing: `octaves` number, `pitchDecay` Time) ; https://cables.gl/op/Ops.Deprecated.WebAudio.Lib.Tonejs.Instrument.MembraneSynth (wrapper, not authoritative) |
| Chow Kick | ChowDSP | Free and open source (per excerpt). Price not applicable | Mac, Windows, Linux, iOS (per article title); plugin format not confirmed | Free kick synth with MIDI support, so the body can be tuned to an incoming note. Free reference for tuning the body to B1 or 43 Hz. | verified: https://synthanatomy.com/2021/07/chowdsp-chow-kick-free-kick-drum-synthesizer-plugin-for-mac-win-linux-ios.html (title and excerpt) |
| BD-808 (Synsonic) | Synsonic | Freeware per the download page (no registration; optional donation). Date: 2017-era URL; check for a newer version | VST and AU (per excerpt); browser not applicable | Controls: Tune (semitones), Fine (cents), LongDecay, MIDI-synced pitch. Signal processing said to be based on analysis of the original 808 bass drum circuit. Listening reference for the 808 character. | verified: https://bedroomproducersblog.com/2017/05/01/synsonic-bd-808/ ; https://synthanatomy.com/2017/05/design-your-own-808-909-kick-sounds.html |
| SubKick | Hitshaper | Paid. Price not found | Not confirmed | Tunes the sub-bass frequency precisely and shows the matching MIDI note. Directly relevant to tuning the sub to B1 (about 62 Hz). | verified: https://www.gearnews.com/hitshaper-subkick-is-all-about-that-bass (excerpt) |
| GnomeKick | BassGnomes | Free | VSTi, Windows (built in SynthEdit, per listing) | An "Analog" knob adds modulation to the oscillators. No sub-tuning control found in sources. Low relevance; free baseline only. | verified: https://bedroomproducersblog.com/2012/04/17/gnomekick-free-kick-drum-vsti-plugin-by-bassgnomes/ ; https://www.pluginboutique.com/product/1-Instruments/7-Drum-Machine/509-Gnome-Kick (rating 4.1 from 130 reviews, seen on an undated page; not a price) |
| KickCrafter | Arnaud Valensi (GitHub: ArnaudValensi) | Open source, AGPL-3.0-or-later | VST3 for Linux; AU on macOS (per README excerpt) | Adjustable pitch-sweep curve; the pitch graph can be dragged during playback. Derived from Daisy KickCrafter firmware. Useful for reading the pitch-curve design; C++/JUCE, so it would be reimplemented, not used. | verified: https://github.com/ArnaudValensi/kickcrafter (excerpt) |
| Kickmess | WeirdConstructor (GitHub) | Open source, AGPL v3 or later (per excerpt) | Not confirmed; framework not confirmed | Pitch and amplitude envelopes with exponential slopes. Read for the envelope shape only. | verified: https://github.com/WeirdConstructor/Kickmess (excerpt) |
| Torden | fjord-sounds (GitHub) | Open source. Licence not seen | VST3, AU, LV2, standalone | Per-sample pitch envelope, with Hz and note names shown. The README says the code was written with Claude Opus; note this for provenance. | verified: https://github.com/fjord-sounds/torden (excerpt) |

Also seen, lower relevance (not in the table):
- Hum808 (free Windows VST 808-style bass synth): https://rekkerd.org/hum808-free-808-bass-synthesizer-instrument-for-windows (excerpt)
- 808XD: a free sample-based 808 kick rompler (31 sounds), not a synthesis model: https://www.bonedo.de/artikel/freeware-sonntag-808xd-minispillage-xorbot-kostenlos-plugin-synthesizer-vst (German article, excerpt)
- StraticDrum: a 16-voice JUCE drum synth with per-voice pitch envelopes and a Sub Kick voice: https://github.com/pilat102/stratic_drum (excerpt)
- kicksynth-pro (JUCE DSP core, Bezier envelopes, AGPL-3.0): https://github.com/David12752/kicksynth-pro (excerpt)
- next-gen-kick (JUCE, GPLv3, 100 presets): https://github.com/OTODESK4193/next-gen-kick (excerpt)
- Geonkick (GPLv3, listed on a wiki page; framework and pitch details not confirmed): https://wiki.thingsandstuff.org/Drum_synth (excerpt)

Sub-bass pluck: no source describing a plucked sine sub synth (or a Web Audio sub pluck) was found. The search results gave pluck designs that are not sines: Karplus-Strong string models and `pluck-string-node` (an oscillator into a waveshaper and a lowpass, per its description). A pluck envelope usually has sustain at zero (forum excerpt, no URL seen in that snippet, so not cited). The "peak 35 ms after the kick" feature was not found as a feature of any product. Not found.

## Recommended gear list

Ranked. Cost and licence are given where a source showed them.

1. **In-house `BUILD.kick` and `BUILD.sub`, retuned.** Free, already in the browser, no new code needed for the first pass. Suggested values from the spec numbers: kick `punch` about 130 (default 170), `tune` about 43, `sweep` about 0.06 (already right); sub `decay` about 0.3 (default 0.4), `harmonic` 0 for a pure sine (default 0.12). Sub onset about 35 ms after the kick needs either a delayed trigger or a longer attack, to be checked against `envDecay`. Check `song.js` first, since some values may already be tuned.
2. **Tone.js MembraneSynth as a parameter reference.** Free, open source per the package (licence to check), runs in the browser. Its model (start at a multiple of the note, ramp to the note over a set time) is the same as `BUILD.kick`. The spec's sweep is about 130/43, a ratio near 3.0 (about 1.6 octaves), over about 60 ms. That ratio is my arithmetic from the spec, not from a source. Use it to sanity-check ranges, not as a dependency.
3. **Werner, Abel, Smith (DAFx-14) TR-808 model.** Free paper. Read it before changing the click or attack. It matters only if the reference shows a separate attack frequency jump. Reimplement in Web Audio; do not port the Gen~ patch. Full text not read.
4. **Synsonic BD-808 (freeware, 2017-era).** Listening reference for an 808 character, if the team wants one. Not a browser tool.

Commercial items (KICK 2 and KICK 3, Hexinverter BD9, BD909, SubKick): useful for vocabulary and as listening references. Prices not found. None is needed to reach the reference.

## Browser feasibility

- **Already in the browser:** `BUILD.kick` and `BUILD.sub` in `studio/synths.js` use the classic recipe: sine oscillator, exponential pitch ramp, gain envelope, a short noise and triangle click, and soft clipping. The sources describe the same recipe (dev.to Kabisa tutorial, Opera Web Audio article, the JavaScript drum-synthesis article). Excerpts only: https://dev.to/kabisasoftware/browser-beats-i-synthesizing-a-kick-drum-1gej ; https://dev.opera.com/articles/drum-sounds-webaudio ; https://www.nickwritesablog.com/drum-synthesis-in-javascript/ . The JavaScript article's sweep (about 5 times the base pitch down to the base pitch over a short click time, then an amplitude envelope and a soft clipper) matches the existing design.
- **Web Audio constraint:** `exponentialRampToValueAtTime` must target a strictly positive value. A Web Audio bug report quotes the spec on this. Fade to 0.0001 (as the code does), not 0. Source: https://lists.w3.org/Archives/Public/public-audio/2013JanMar/0226.html (excerpt). MDN page seen but its wording not confirmed: https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/exponentialRampToValueAtTime
- **Has a Web Audio equivalent or is one already:** Tone.js MembraneSynth (library; check licence before copying code; the design is what matters).
- **Needs reimplementing (no browser build found):** all commercial plugins and hardware (KICK 2/3, BD9, BD909, SubKick, GnomeKick, Chow Kick, Synsonic). No published browser port was found. Synsonic says its processing is based on circuit analysis, but no algorithm is published in the excerpt.
- **Needs reimplementing and a licence review first:** the open-source JUCE kick synths (KickCrafter, Kickmess, Torden, kicksynth-pro, next-gen-kick). They are C++ under AGPL or GPL. Reading them for ideas is different from porting their code.
- **Needs reimplementing from a paper:** the 808 bass drum model (Werner et al., DAFx-14). It is published, but only the abstract excerpt was seen.
- **Sub pluck:** a sine oscillator with a fast gain decay is the straightforward Web Audio build, and `BUILD.sub` already does this. I found no source with a specific sub-pluck recipe; the sine plus decay approach is my own summary.

## Recalled, not verified

- Tone.js is MIT-licensed. Recalled; the licence file was not seen.
- The Tone.js API reference is at tonejs.github.io/docs. Recalled; the search did not return it.
- The Deruty arXiv preprint (2502.07524) is a separate paper from the Werner et al. DAFx-14 paper. I have seen only excerpts of both and have not compared their models.

## Handoffs to other agents

- **S1 (sidechain):** The spec says the sub is not ducked by the kick. Check whether any kick-to-sub ducking is needed at all, and what the sidechain rig would do to the 35 ms sub peak.
- **S3 (saturation, EQ, filters):** The kick's `drive` is a soft clip on the body. Check whether a saturator on the kick track should replace or add to it.
- **S5 (stems and transcription):** Measure the reference kick's pitch curve from the isolated kick stem (start frequency, end frequency, sweep time) and the sub's onset offset. This would settle the 130 Hz and 35 ms numbers, which come from the earlier analysis.
- **O2 (DAW possibilities):** Licence handling for AGPL and GPL kick synths, and whether Tone.js can be used directly in the studio.

## Questions for the Opus agents

- **O1:** Does the reference kick have a fast attack frequency jump separate from the 130 Hz to 43 Hz sweep? The 808 literature separates the two. If yes, which published model should be the basis for copying?
- **O2:** Which licence will Havantechno ship under? The answer decides whether AGPL kick code can be read for ideas or ported, and whether Tone.js can be a direct dependency.

## Sources

Every URL used, copied from the search results where I saw it. Excerpt-only unless noted.

- https://www.production-expert.com/production-expert-1/5-awesome-kick-drum-plugins-worth-having-on-your-radar
- https://www.sonicacademy.com/products/kick-3
- https://www.pressreader.com/australia/computer-music/20160713/284438508203555
- https://musicradar.com/reviews/tech/sonic-academy-kick-2-640392
- https://www.audiotent.com/blogs/production-tips/production-tipsultimate-guide-sonic-academy-kick-2
- https://www.ericasynths.lv/hexinverter-mutant-bd9-3329/
- https://www.bonedo.de/?p=2612672
- https://vintageking.com/products/tiptop-audio-bd909-tr909-bass-drum-generator-black
- https://en.wikipedia.org/wiki/Roland_TR-909
- https://dafx14.fau.de/papers/dafx14_kurt_james_werner_a_physically_informed,_ci.pdf
- https://dafx.de/paper-archive/details/hwkd1Lfe8vmtOxCEjsNY-g
- https://www.musica.ed.ac.uk/?p=597
- https://arxiv.org/pdf/2502.07524v1
- https://app.unpkg.com/tone@15.0.4/files/build/esm/instrument/MembraneSynth.js
- https://tessl.io/registry/tessl/npm-tone/15.3.0/files/docs/instruments.md
- https://cables.gl/op/Ops.Deprecated.WebAudio.Lib.Tonejs.Instrument.MembraneSynth
- https://synthanatomy.com/2021/07/chowdsp-chow-kick-free-kick-drum-synthesizer-plugin-for-mac-win-linux-ios.html
- https://synthanatomy.com/2017/05/design-your-own-808-909-kick-sounds.html
- https://bedroomproducersblog.com/2017/05/01/synsonic-bd-808/
- https://www.gearnews.com/hitshaper-subkick-is-all-about-that-bass
- https://bedroomproducersblog.com/2012/04/17/gnomekick-free-kick-drum-vsti-plugin-by-bassgnomes/
- https://www.pluginboutique.com/product/1-Instruments/7-Drum-Machine/509-Gnome-Kick
- https://github.com/ArnaudValensi/kickcrafter
- https://github.com/WeirdConstructor/Kickmess
- https://github.com/fjord-sounds/torden
- https://github.com/David12752/kicksynth-pro
- https://github.com/OTODESK4193/next-gen-kick
- https://github.com/pilat102/stratic_drum
- https://wiki.thingsandstuff.org/Drum_synth
- https://rekkerd.org/hum808-free-808-bass-synthesizer-instrument-for-windows
- https://www.bonedo.de/artikel/freeware-sonntag-808xd-minispillage-xorbot-kostenlos-plugin-synthesizer-vst
- https://www.splice.com/plugins/523-kick-by-nicky-romero-vst-au-by-sonic-academy (seen, not used)
- https://pluginerds.com/7-best-kick-plugins/ (seen, not used)
- https://dev.to/kabisasoftware/browser-beats-i-synthesizing-a-kick-drum-1gej
- https://dev.opera.com/articles/drum-sounds-webaudio (seen; fetch failed, excerpt only)
- https://www.nickwritesablog.com/drum-synthesis-in-javascript/ (seen; fetch failed, excerpt only)
- https://www.npmjs.org/package/pluck-string-node
- https://lists.w3.org/Archives/Public/public-audio/2013JanMar/0226.html
- https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/exponentialRampToValueAtTime
