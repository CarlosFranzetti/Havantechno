# H2: Mid bass synths — round 1
Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

## Scope

The syncopated mid bass of "Guidance (Original Mix)": hits on steps 3, 7, 10, 14 of the 16-step bar, on B2, sitting between the kick and sub band (120 to 300 Hz). Covered: analogue-modelling monosynths and polysynths (hardware and emulations), 303-style acid boxes, wavetable synths, and free or open-source synths. Out of scope: the sub-bass (H1), chord polysynths (H3), and the transcription of the pattern (S5).

Method: WebSearch in standard mode, then extended searches where standard was thin. Pages fetched with WebFetch where the host resolved. Several hosts did not resolve from this environment (ENOTFOUND for tb303.com, en.wikipedia.org, surge-synthesizer.github.io, sonicstate.com, syntorial.com, plugindrop.net, synthanatomy.com, www.pluginboutique.com, www.webaudiomodules.com, tonejs.github.io). Claims that rest only on a search snippet are labelled "(unverified: search snippet)".

## What the reference track needs from this category
   (use the analysis table in the design spec)

From `docs/superpowers/specs/2026-10-21-guidance-studio-design.md`:
- Bass: mid bass hits on steps 3, 7, 10, 14 (syncopated against the kick). The spec's tuning notes say the mid bass plays B2 rather than B1 so its energy lands in the 120 to 300 Hz band.
- Bass root B1 (~62 Hz) throughout; the mid layer is the character, the sub is a separate element (H1).

What the current studio bass does (`studio/synths.js`, `BUILD.bass`, around line 216):
- Two detuned oscillators at `P.wave` (default sawtooth, detune ±7 ct) plus a square one octave below the note, gain `sub * 0.6`.
- Lowpass biquad with `cutoff` (spec default 420 Hz), `res` (default 4), and a filter envelope of `env` Hz that decays back to `cutoff` over `decay` seconds. Then an AHR amplitude envelope, and the shared `drive` shaper.
- Note for the owner: the song's bass params (`studio/song.js`, line 45) set `sub: 0`, so in the Guidance arrangement the square layer is silent. The bass in the song is two detuned saws only, through `cutoff 220, env 300, res 3, decay 0.15, drive 0.15`. The filter envelope (300 Hz) is small against the cutoff (220 Hz), so the note opens only to about 520 Hz and closes again. Whether the reference has that much filter movement was not measured by me; see the questions.

## Findings

| Name | Vendor | Licence (commercial / free / open source) | Formats (VST3, AU, CLAP, AAX, hardware, web) | Relevance to the element | Verified source |
|---|---|---|---|---|---|
| jc303 (JC-303) | midilab | Open source, GPL-3.0 (verified). Its Open303 engine part is MIT (verified, same page). | VST2 (user must compile), VST3, LV2, CLAP, AU; prebuilt CLAP, VST3, LV2, AU (verified) | 303-style acid. Reference for the Devilfish mods (decay, slide, feedback HPF) and the RAT drive stage. Less direct for an electro mid bass, which is a saw/square through a ladder-like filter, not a 303. | verified: https://github.com/midilab/jc303 |
| Open303 engine (Robin Schmidt) | Robin Schmidt | Open source, MIT (verified as stated by jc303 and schwung-303 pages; the upstream LICENSE file was not read, the blob URL returned 404) | C++ DSP core, no plugin format of its own | Clean reference for a monophonic acid filter model; MIT means code can be read and re-implemented in JS with the licence kept. | verified (via quote on): https://github.com/midilab/jc303 ; repo page: https://github.com/RobinSchmidt/Open303 (repo page fetched; licence text not shown on it). Also seen in search: https://context7.com/robinschmidt/open303 |
| schwung-303 | charlesvestal | Open source, GPL-3.0 (verified). Says the Open303 core remains MIT. | Built for Ableton Move hardware; the page does not list VST formats | Shows a concrete drive model (port of dm-Rat, third-order op-amp IIR, 2x oversampling, Soft model with tilt EQ and asymmetric tanh, drive 0 bypasses, mix blend). Useful for the studio's `drive` param design, not for the oscillator. | verified: https://github.com/charlesvestal/schwung-303 |
| AudiusProject/303 | Audius | Licence not found: no LICENSE file on the page. | Web: vanilla HTML/CSS/JS with Web Audio, 16-step sequencer, run from a local static server (verified README) | Browser-native 303-style reference. Oscillator, filter and envelope details were not found on the page; the source files in `js/` would show them. | verified: https://github.com/AudiusProject/303 |
| Surge XT | Surge Synth Team | Open source, GPL-3.0 (verified on repo page: "GPL-3.0 license"). Free. | CLAP and others (kvraudio listing, unverified: search snippet). Not confirmed by a fetch. | Wide palette: classic and wavetable oscillators, a ladder filter among many filter algorithms (unverified: search snippet). A free, deep place to build a mid bass. Oscillator and filter counts are inconsistent across the snippets I saw. | verified (licence, repo page): https://github.com/surge-synthesizer/surge ; listing: https://www.kvraudio.com/product/surge-xt-by-surge-synth-team (unverified: search snippet) |
| Vital | Matt Tytel (Vital Audio) | Source GPLv3 (verified). Free version; the page says "Do not distribute the presets that come with the free version of Vital" and that preset licence does not allow redistribution (verified). Paid presets. | Plugin formats not checked on the page | Wavetable synth. The saw-wavetable plus filter route gives an electro mid bass without a sine or square sub. Its free bass presets are in third-party packs with their own terms (search snippets, unverified). | verified: https://github.com/mtytel/vital |
| Mz101 | simozzer | Free software, AGPL-3.0 (verified: "free software under the GNU Affero General Public License v3"). | VST3 and standalone on Windows; VST3, AU, standalone on macOS (beta); VST3, LV2, standalone on Linux (beta) (verified) | Open-source SH-101 emulation. The SH-101 is a saw plus pulse plus selectable square sub, through a 24 dB lowpass that self-oscillates (the 101 description is from search snippets: https://en.wikipedia.org/wiki/Roland_SH-101 and https://rolandcorp.com.au/blog/roland-icon-series-sh-101-synthesizer, unverified). Most direct open-source route to the classic squelch. Accuracy of Mz101 against the hardware was not checked. | verified (licence, formats): https://github.com/simozzer/Mz101 |
| TAL-BassLine | Togu Audio Line / TAL Software | Free download in listings (search results, unverified: https://www.pluginboutique.com/product/1-Instruments/4-Synth/434-TAL-Bassline and https://www.kvraudio.com/product/tal-bassline-by-togu-audio-line; labelled "free" in a result seen 2026-10-23). Not fetched. | VST, VST3, AAX, CLAP per Plugin Boutique listing (unverified: search snippet); version 1.5.5 listed on plugins4free (unverified) | The structure the studio already uses: band-limited saw and pulse, sub-oscillator, resonant lowpass (about -18 dB/oct), LFO, 2x unison (all unverified: search snippets). Good A/B reference for the bass params. | unverified: https://www.kvraudio.com/product/tal-bassline-by-togu-audio-line ; https://www.audiopluginsforfree.com/tal-bassline/ |
| TAL-BassLine-101 | TAL Software | Paid, price not found | Not checked | Described by a blog as the most recommended SH-101 plugin and as replicating "almost every aspect" of the 101 (unverified: search snippet). A review of the emulation found the sub "suitably meaty" but not as deep as some synths. | unverified: https://www.syntorial.com/highlights/tal-bassline-101/ (not fetched; host did not resolve) ; https://www.gearnews.com/roland-sh-101-plugins-synth/ |
| Softube Model 82 | Softube | Paid, price not found | Plugin and modular (unverified: search snippet) | SH-101 emulation with a sequencer, stereo doubling control and a drive knob (unverified: search snippet). The drive knob is the feature the studio's bass lacks at the plugin level. | unverified: https://www.musicradar.com/news/softube-model-82-synth-plugin-sh-101 |
| Roland Cloud SH-101 | Roland | Subscription, price not found | Software (unverified) | Official SH-101 emulation (unverified: search snippet). | unverified: https://www.gearnews.com/roland-sh-101-plugins-synth/ |
| Roland SH-101 (hardware) | Roland | Hardware | Hardware | Reference sound. One VCO with saw, pulse with PWM, and a selectable sub (-1 oct square, -2 oct square, -2 oct pulse), 24 dB lowpass with self-oscillation (unverified: search snippets from https://rolandcorp.com.au/blog/roland-icon-series-sh-101-synthesizer and https://en.wikipedia.org/wiki/Roland_SH-101; Wikipedia did not resolve). The Roland write-up says a longer release and portamento give a "rubbery" bass (unverified). | unverified: https://rolandcorp.com.au/blog/roland-icon-series-sh-101-synthesizer |
| Novation Bass Station II | Novation | Hardware, price not found | Hardware | Relative of the 101 rather than a clone; its filter has an acid mode inspired by the 303 and 101; step sequencer has rests and ties but no accent or glide (unverified: forum snippets). | unverified: https://gearspace.com/board/electronic-music-instruments-and-electronic-music-production/957798-roland-sh-101-vs-novation-bass-station-ii.html |
| Helm | Matt Tytel | GPL-3.0 per the repo (unverified: search snippet). The owner archived the repo on Feb 8 2025, so it is read-only (unverified: search snippet). Free. | LV2, VST, VST3, AU (unverified: KVR listing snippet) | Open-source subtractive synth with per-oscillator unison and a monophonic mode (unverified: Zynthian snippet). Bass use is a blog recommendation, not a test. No official bass preset set found. | unverified: https://github.com/mtytel/helm ; https://zynthian.org/engines/_engine-list/engine-helm ; https://www.kvraudio.com/product/helm-by-matt-tytel |
| Tone.js MonoSynth | Tone.js project | Licence not checked | Web (JavaScript, Web Audio) | Structure is one oscillator, one filter, two envelopes (amp and filter). Default oscillator square; filter lowpass, Q 6, -24 rolloff; filter envelope baseFrequency 200, octaves 7, attack 0.06, decay 0.2, sustain 0.5, release 2 (all unverified: search snippet from the r12 docs URL, which did not fetch). Useful as a browser reference for filter-envelope defaults. | unverified: https://tonejs.github.io/docs/r12/MonoSynth |
| WAM 2.0 (Web Audio Modules) | WAM community | Open-source standard; npm packages MIT (unverified: search snippet) | Web (AudioWorklet-based plugins, WamNode) | Not a synth, but the host standard for browser plugins. If a mid bass ever ships as a WAM, the studio would host it through this. | unverified: https://www.webaudiomodules.com/docs/intro/ ; https://dl.acm.org/doi/fullHtml/10.1145/3487553.3524225 |
| tb303.com | Not verified (fan project per search snippet) | Licence not found | Web (BIQUAD and LADDER filter modes per search snippet, unverified) | 303 clone in the browser. Not fetched: host did not resolve. | unverified: https://tb303.com/ |

Not found: a current price for Mini V, Roland Cloud SH-101, Softube Model 82, Novation Bass Station II, or Behringer / Moog hardware. A search for Minimoog-style bass patches (Mini V, Thriller bass tutorial, Behringer Model D, Moog Sub 37) returned mostly forum opinion. Sub 37's reset-on-key-press feature (oscillators restart together) is reported in a forum snippet (unverified: https://forum.moogmusic.com/viewtopic.php?t=25723). No source gave an electro-house bass patch with exact filter and drive values, so none is quoted here.

Generic bass-design guidance from search results (unverified: search snippets from https://gearspace.com/board/electronic-music-instruments-and-electronic-music-production/1414285-bass-sound-design.html, https://beatkitchen.io/guides/electronic-music/04-bass-design/, https://www.myloops.net/designing-a-melodic-techno-bassline, https://www.presetdrive.com/bass-house-production-guide/): a saw or square through a lowpass at roughly 400 to 800 Hz with light resonance; a square an octave up at about -12 dB against the saw; a filter-cutoff envelope with fast attack and around 150 ms decay. These are not electro-specific and are not checked against the reference. One snippet argues the opposite on resonance (it makes the sound thinner and more synthesiser-like), so resonance needs a listening test.

## Recommended gear list
   Ranked, with one line each on why, and the approximate cost or licence

1. TAL-BassLine (free, listed as free; verify the current download and licence on the TAL site). Its listed structure (saw/pulse, sub, resonant lowpass, LFO, 2x unison) is the same shape as the studio's bass, so it is the best A/B reference for the parameter ranges. Licence: free-of-charge freeware per listing; not fetched.
2. Mz101 (AGPL-3.0, free, open source). The most direct open-source route to the SH-101 saw-plus-square-sub-through-resonant-lowpass sound that drives electro and acid mid basses. Read it for the filter model; AGPL-3.0 means copying code brings the AGPL along, so use it as a reference, not a source.
3. Surge XT (GPL-3.0, free). The widest free palette here, with a ladder filter among its algorithms (unverified). Useful if the studio needs a second oscillator family for the mid layer; GPL-3.0 applies to copied code, not to music made with it (per the repo's licence; FAQ not fetched).
4. jc303 + Open303 engine (GPL-3.0 wrapper, MIT engine core). Best source for a drive stage and a Devilfish-style decay and slide model; use the MIT engine if code is to be reused in JS.
5. Vital (GPLv3 source, free version; presets not redistributable). Wavetable option if the mid bass should move beyond saw/square. Do not ship its presets.

Browser-only candidates: AudiusProject/303 (browser, licence not found) and tb303.com (browser, not fetched).

## Browser feasibility
   What here can run in a browser, what has a Web Audio equivalent, what would need reimplementing

- Run in a browser now: AudiusProject/303 (verified: vanilla JS with Web Audio, 16-step sequencer). No licence found, so it can be studied, not copied, until the owner checks.
- Reimplementation in JS / AudioWorklet: the Open303 ladder/acid model (MIT, so it can be re-implemented with the licence notice kept) and the RAT-style drive from schwung-303 (GPL-3.0, so copying the code would bring GPL terms into Havantechno; re-deriving the math from the description is a separate question for the owner). The studio's own BUILD.bass already has a Web Audio biquad and a shared shaper, so the gap is in the filter model and envelope depth, not in what the Web Audio API can do.
- Tone.js MonoSynth structure (licence not checked) maps directly onto the studio's existing bass: one oscillator, one filter, filter envelope, amp envelope.
- Plugin hosting: WAM 2.0 is the browser standard for plugins (unverified). Not needed for the bass unless a third-party bass is hosted.
- Not browser: all VST, AU, CLAP, hardware and Mz101 binaries (AGPL, no web build found).

## Recalled, not verified
- Roland TB-303: single saw or square, a 24 dB resonant lowpass with accent and slide. Recalled from general knowledge; no source fetched (Wikipedia did not resolve).
- The Thriller-style bass patch (two square oscillators at 16' and filter envelope amount around 40% on Mini V) comes from a MusicRadar search snippet (https://www.musicradar.com/how-to/recreate-thriller-synth-minimoog); not fetched.
- The "square one octave up at -12 dB" recipe is from a search snippet, not checked.

## Handoffs to other agents
- H1 (kick and sub): the square layer in `BUILD.bass` is the sub-octave square, and song.js sets `sub: 0` for the bass track, so whether the square belongs to the sub or the mid layer is a question for H1 and the owner.
- S3 (saturation, EQ, filters): drive curve and lowpass resonance model. The schwung-303 drive description and the Open303 filter are the main inputs.
- S5 (transcription): confirm the step positions (3, 7, 10, 14) and the B2 pitch from the stem; the studio's `bass` pattern A is `...x...x..x...x.`, which is those positions 0-indexed.
- H3 (stab and pad polysynths): Surge XT and Helm also cover poly pads; overlap is possible.
- H5 (browser synths): WAM 2.0 and Tone.js MonoSynth belong to the browser-engine question; I covered only the bass use.
- O2 (DAW possibilities): hosting of a GPL or AGPL plugin in a browser DAW is a licence question; flag for WAM hosting.

## Questions for the Opus agents
1. Filter envelope: the studio's bass has an env of 300 Hz on a cutoff of 220 Hz, so the cutoff moves from about 220 Hz to about 520 Hz and back. Does the reference's mid bass show a larger, faster filter sweep (measured as spectral centroid over each hit)? If yes, the env and decay params need a much larger range than the current spec suggests.
2. Square layer: the song has `sub: 0`, so the square is silent. Should the reference's mid bass include a square (or pulse) layer, and if so is it an octave down (as the code has it) or on the same octave as the saws?
3. Licence policy: may Havantechno take algorithms (not code) from GPL-3.0 (jc303, schwung-303, Surge XT, Helm) and AGPL-3.0 (Mz101) projects? The answer decides whether Mz101 and jc303 are references only or sources for code.

## Sources
Fetched and read (verified):
- https://github.com/midilab/jc303
- https://github.com/charlesvestal/schwung-303
- https://github.com/AudiusProject/303
- https://github.com/RobinSchmidt/Open303 (repo page only; licence text not shown)
- https://github.com/surge-synthesizer/surge
- https://github.com/mtytel/vital
- https://github.com/simozzer/Mz101

Seen in search results (not fetched; claims labelled unverified where used):
- https://context7.com/robinschmidt/open303
- https://www.kvraudio.com/product/surge-xt-by-surge-synth-team
- https://www.kvraudio.com/product/tal-bassline-by-togu-audio-line
- https://www.pluginboutique.com/product/1-Instruments/4-Synth/434-TAL-Bassline
- https://www.audiopluginsforfree.com/tal-bassline/
- https://plugins4free.com/plugin/688
- https://www.syntorial.com/highlights/tal-bassline-101/
- https://www.gearnews.com/roland-sh-101-plugins-synth/
- https://www.gearnews.com/roland-sh-101-alternatives-synth/
- https://www.musicradar.com/news/softube-model-82-synth-plugin-sh-101
- https://www.musicradar.com/how-to/recreate-thriller-synth-minimoog
- https://rolandcorp.com.au/blog/roland-icon-series-sh-101-synthesizer
- https://en.wikipedia.org/wiki/Roland_SH-101
- https://en.wikipedia.org/wiki/Roland_TB-303
- https://gearspace.com/board/electronic-music-instruments-and-electronic-music-production/957798-roland-sh-101-vs-novation-bass-station-ii.html
- https://gearspace.com/board/electronic-music-instruments-and-electronic-music-production/1414285-bass-sound-design.html
- https://forum.moogmusic.com/viewtopic.php?t=25723
- https://beatkitchen.io/guides/electronic-music/04-bass-design/
- https://www.myloops.net/designing-a-melodic-techno-bassline
- https://www.presetdrive.com/bass-house-production-guide/
- https://tb303.com/
- https://zynthian.org/engines/_engine-list/engine-helm
- https://github.com/mtytel/helm
- https://www.kvraudio.com/product/helm-by-matt-tytel
- https://tonejs.github.io/docs/r12/MonoSynth
- https://www.webaudiomodules.com/docs/intro/
- https://dl.acm.org/doi/fullHtml/10.1145/3487553.3524225
- https://plugindrop.net/posts/best-free-bass-synth-vst/

Local files read:
- /home/user/havantechno/docs/research/2026-10-23-plugin-gear/BRIEF.md
- /home/user/havantechno/docs/superpowers/specs/2026-10-21-guidance-studio-design.md
- /home/user/havantechno/studio/synths.js (BUILD.bass, around lines 216 to 240)
- /home/user/havantechno/studio/song.js (bass track, line 45)
