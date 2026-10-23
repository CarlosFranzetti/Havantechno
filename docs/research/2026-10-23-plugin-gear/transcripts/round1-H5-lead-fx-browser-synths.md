# H5: Lead, riser, impact synths, and synth engines that run in a browser — round 1
Agent model: Haiku 5.5. Date: 2026-10-23.

## Scope

Two halves, as briefed:
(a) Which synths and FX-sound tools make the reference's 8th-note breakdown lead (F#4 G#4 C#5 D#5), and its risers and impacts at section changes.
(b) Synth engines that actually run in a browser (WAM 2.0 instruments, WebAssembly synths, Faust or Cmajor web exports, JS synth libraries, desktop synths ported to the web).

Search budget: the shared WebSearch limit for this turn was reached after about 13 searches, so the checks listed under "Not completed" were not run. Fetches that failed (DNS or 403) are marked where they matter.

## What the reference track needs from this category

From the design spec (`docs/superpowers/specs/2026-10-21-guidance-studio-design.md`):
- Breakdown: "8th-note lead on F#4 G#4 C#5 D#5" (break starts at 3:16). The spec says the lead melody is "an 8-bar melody written from the measured note contour, not a note-for-note transcription", and the exact melody is "lower confidence".
- Form: build 0:44, main 1:16, break 3:16, drop 4:20, outro 5:52. The brief asks for risers and impacts at section changes.
- Gap to note: the spec's analysis table has no riser or impact row. The riser and impact requirement comes from the brief, not from measured data in the spec. Nothing in the spec measures riser or impact timing.

Current builders in `studio/synths.js`:
- `lead` (lines 370-394): detuned saw pair plus sub square, resonant lowpass with envelope, portamento. Suitable for the breakdown lead in principle. The reference lead's actual sound was not identified by any source I found.
- `riser` (lines 425-446): noise through a rising bandpass, plus a rising saw drone.
- `impact` (lines 449-466): sine boom from 95 Hz down to the tune value, with a noise wash.

Finding for (a): I found no source that identifies the synth used on the reference lead. "Not found."

## Findings

Licence key: "verified" = I fetched the page; "search snippet" = the URL and its summary came from a search result, and I did not fetch the page. Where a search summary is the only evidence, the claim is marked unverified.

| Name | Vendor | Licence (commercial / free / open source) | Formats (VST3, AU, CLAP, AAX, hardware, web) | Relevance to the element | Verified source |
|---|---|---|---|---|---|
| webOBXD (OB-X style synth, repo `obxd`) | Port of 2DAT's OBXD JUCE plugin; this fork by jariseon | Open source, GPL-3.0 (verified) | Web: AudioWorklet + WebAssembly + WAM; runs best in Chrome (verified) | Lead candidate: analog-style poly synth, a real WAM voice rather than our own build | verified: https://github.com/jariseon/obxd |
| webDX7 | webaudiomodules org | Licence not found | Web: WAM, AudioWorklet + WASM (search summary); repo is C++ (verified org listing) | FM lead or bell; not a core element | verified (repo name and description): https://github.com/webaudiomodules ; architecture: search summary of https://deepwiki.com/webaudiomodules/webdx7 (unverified) |
| webcz101 | webaudiomodules org | Licence not found | Web WAM (repo marked archived) | Not relevant to the elements; listed for WAM coverage | verified (name, archived note): https://github.com/webaudiomodules |
| Texed | WouterVanNifterick | GPL-3.0 (verified) | Web: TypeScript/React, AudioWorklet, Web MIDI; up to 256 voices; SysEx to hardware | Reference for presets and bank loading (factory banks, .syx import); not a riser or impact tool | verified: https://github.com/WouterVanNifterick/texed |
| Tone.js | Tone.js project | MIT (verified) | Web: JavaScript library, script or npm | NoiseSynth for riser noise; Synth, AMSynth, FMSynth, PolySynth for lead. Automation through `rampTo` (verified in README) | verified: https://github.com/Tonejs/Tone.js |
| FaustWasm (+ Faust DSL) | GRAME | Licence not stated on the fetched page (repo links COPYING.txt) | Web: TypeScript library, compiles Faust to WebAssembly AudioWorklet nodes; Node and browsers | Write a bespoke lead, riser or impact as Faust DSP. Mono and poly nodes; MIDI (keyOn, keyOff, ctrlChange, pitchWheel) | verified: https://github.com/grame-cncm/faustwasm |
| web-synth (browser DAW and synth platform) | ameobea | Licence not captured (page links a LICENSE file; text not seen) | Web: DSP compiled to WASM on the audio thread; dynamic Faust and Soul compilation | Reference architecture for runtime-compiled DSP and presets; needs MySQL backend for preset sharing | verified: https://github.com/ameobea/web-synth |
| wam-community | WAM community (repo by boourns) | No licence stated in repo (verified) | WAM 2 prebuilt plugins as npm package; self-hosted or JSON index | Catalogue of WAMs; repo itself names no plugins | verified: https://github.com/boourns/wam-community ; npm page https://npmjs.com/package/wam-community returned 403 (not fetched) |
| Cmajor web export | Cmajor | Licence not found. Pricing not found | Export: `cmaj generate --target=webaudio-html` gives dependency-free HTML, JS and WASM; also VST, AU, AAX via JUCE (search summary) | Could author a lead, riser or impact in Cmajor and export to web. Summary says web WASM runs at about half the speed of its native JIT | unverified (search summary): https://cmajor.dev/docs/Examples and https://cmajor.dev/ (cmajor.dev DNS fetch failed) |
| web-polysynth | atelic | MIT (search summary, unverified) | Web: React and Tone.js app, not a library | Reference for polyphonic preset design (ten factory presets per summary) | unverified (search snippet): https://github.com/atelic/web-polysynth |
| Surge XT | Surge Synth Team | Free and open source per search summary (GPL licence not confirmed) | Desktop: VST3, AU, Linux builds; no browser build found | Desktop lead and riser reference; not runnable in browser | search snippet: https://github.com/surge-synthesizer/surge ; https://rekkerd.org/surge-xt-free-open-source-hybrid-synthesizer-ported-to-juce/ (unverified) |
| Vital | Vital Audio (contact address in snippet) | GPLv3 open source; commercial licence for closed-source use (search snippet) | Desktop: VST3, AU; LV2 only via fork Vitalium (search snippet); no browser build found | Wavetable lead reference; not browser | search snippet: https://pypi.org/project/vita/ ; https://forum.mod.audio/t/vital-synth-port/10062 (unverified) |
| AIR The Riser | Air Music Technology | Commercial. Price not found | AU and VST (search snippet) | Direct riser fit: three oscillators (sweep, noise, chord), Pumper effect tempo-synced. Desktop only | search snippet: https://www.airmusictech.com/virtual-instruments/the-riser/ (unverified; price not found) |
| liftFX | Boom Library | Commercial. Price not found | Format not stated in snippet; 275 presets, no samples, tempo sync (search snippet) | Riser and drop synth, reference for riser design | search snippet: https://www.boomlibrary.com/sound-effects/liftfx/ (unverified) |
| Riser and impact roundup (named products) | Various | Not checked individually | Desktop and Kontakt (roundup summary) | Named in roundup summary: ujam Finisher BOOST, Vir2 Phoenix, NI Cinematic Rise & Hit, UVI Whoosh & Motion Designer, UVI Meteor. Not individually verified | unverified (search summary): https://integraudio.com/8-best-sweep-riser-plugins/ |

Notes on the table:
- Impact: no tool specific to impacts was found beyond the roundup names above. Impact sound design in the sources is sample-based (libraries). "Not found" for a browser impact tool.
- Vendor for Tone.js: the README I fetched names no individual author, so I leave the vendor as the project.
- Tone.js: the search summary said MonoSynth is in the Tone docs, but the README I fetched lists FMSynth, AMSynth, NoiseSynth, Synth, PolySynth and no MonoSynth. This conflict is unresolved.

## WAM 2.0: plugin catalogue and standard

What I could establish:
- WAM 2.0 is an open browser plugin standard; the paper and the 2021 version date come from search snippets (unverified): https://www.researchgate.net/publication/362727709_Web_Audio_Modules_20_An_Open_Web_Audio_Plugin_Standard and https://kvraudio.com/news/web-audio-modules-wam---a-new-audio-plug-in-format-for-the-web-browser-39307
- Plugins load with the page, use AudioWorklet, and their DSP is WebAssembly; they are usually C++ cross-compiled (search summary, unverified): kvraudio link above.
- WAM-Studio is an open-source web DAW built on WAM (search summary, unverified): https://ieeexplore.ieee.org/document/10704163
- WAM may add some latency versus VST, per a blog summary (unverified): https://synthanatomy.com/?p=26693
- Community catalogue: the intro page summary says the `wam-community` collection holds over 40 WAM2 plugins (unverified): https://www.webaudiomodules.com/docs/intro/ (DNS fetch failed). KTH seminar listing gives the same count (unverified): https://kth.se/navet/calendar/seminars-and-worksho/web-audio-modules-including-3d-vr-extensions-1.1340375
- Named example WAMs (unverified, search summary of https://www.webaudiomodules.org/wamsynths/, which failed to fetch): webDX7, DEXED, OBXD, yoshimi, NoiseMaker.
- The full community list was NOT retrieved. The wam-community repo names no plugins (verified). Not found: the full plugin list with licences.
- WAM parameter API and preset format: not found in my sources.

## Recommended gear list

Ranked. Costs are as stated in sources; prices not found unless noted.

1. **Tone.js (MIT, verified) for risers and lead voices in our own code.** Free and permissive. NoiseSynth covers the riser noise layer; `rampTo` covers rising filter or level automation (verified in README). Fits the existing Web Audio architecture with no new runtime. Gap: no preset system and no documented get/set parameter API (verified absence in README).
2. **FaustWasm for a bespoke lead, riser or impact voice.** Licence on the fetched page is not stated, so confirm before use. Gives mono and poly nodes, MIDI, and sample-accurate `setParamValue` (verified). This is the route for "create a new synth when nothing fits".
3. **webOBXD (GPL-3.0, verified) as a real lead voice loaded as a WAM.** Presets and parameter automation API were not mentioned on the fetched page, so both are unverified. GPL-3 means it cannot be copied into a non-GPL codebase without a licence decision (see open question).
4. Study-only references: AIR The Riser and liftFX (riser design, commercial, price not found); Texed (preset and bank loading, GPL-3); web-synth (runtime Faust compilation and preset architecture, licence not captured).

## Browser feasibility

- Runs in a browser today, verified: webOBXD (WAM, WASM), webDX7 (WAM, search summary for architecture), Texed (WASM not confirmed; AudioWorklet and Web MIDI verified), Tone.js (JS), FaustWasm (WASM), web-synth (WASM).
- Browser equivalent exists in a loose sense: the riser and impact builders in `studio/synths.js` already cover the Tone.js-style technique (noise through a moving bandpass; a sine sweep). Commercial riser plugins have no browser counterpart in my sources.
- Needs reimplementing: AIR The Riser's three-oscillator transition design and its Pumper effect; liftFX's tempo-synced buildups (not found in any browser form); impact layers built from sampled libraries (no browser sample-library route found).
- Not found: a browser Surge XT or Vital build. Searches for both returned only desktop or LV2 information. Cmajor web export is the nearest route to a native-quality engine, but its licence and pricing are not found.

## Recalled, not verified

- Faust is distributed under a GPL-family licence. Recalled, not verified in this session.
- WAM 2.0 plugins expose parameters through a host automation interface. The exact API was not seen in any source (not verified).

## Not completed (budget and access)

- WebSearch limit for the turn was reached. Not done: confirm Surge XT's licence text; confirm whether Faust has a WAM export target; confirm a browser Vital build (one search found none); fetch the WAM community plugin list at webaudiomodules.org.
- Fetch failures: webaudiomodules.org and webaudiomodules.com (DNS), cmajor.dev (DNS), cdn.jsdelivr.net (DNS), npmjs.com wam-community (403).
- I attempted to read the proxy status README through Bash to diagnose the fetch failures. The permission classifier denied it, and I did not pursue it further.

## Handoffs to other agents

- S4 (chorus, width, modulation): the lead's chorus or stereo width and the riser's modulation depth.
- S2 (delay and reverb): riser tail and impact reverb send.
- S3 (saturation, EQ, filters): the resonant lowpass in the lead and the riser bandpass.
- H3 (stab and pad): Tone.js PolySynth and the polyphony path, since it overlaps chord voices.
- O2 (DAW possibilities): WAM hosting in the browser DAW, the WAM parameter and preset API, and WAM-Studio as a reference host.

## Questions for the Opus agents

- O2: Can Havantechno host a WAM 2.0 plugin, and what is its parameter automation and preset format? I could not verify either.
- O1: Is a riser best built from a moving noise bandpass (as now) or from a wavetable or granular sweep? Which would match the reference's riser timing?
- O2: Licence policy. Is GPL-3 code (webOBXD, Texed) acceptable in the repo, or should the browser route stay on MIT libraries (Tone.js) and our own code?

## Sources

Fetched (verified):
- https://github.com/jariseon/obxd
- https://github.com/webaudiomodules
- https://github.com/boourns/wam-community
- https://github.com/WouterVanNifterick/texed
- https://github.com/Tonejs/Tone.js
- https://github.com/grame-cncm/faustwasm
- https://github.com/ameobea/web-synth

Search results and summaries (not fetched; unverified):
- https://www.researchgate.net/publication/362727709_Web_Audio_Modules_20_An_Open_Web_Audio_Plugin_Standard
- https://kvraudio.com/news/web-audio-modules-wam---a-new-audio-plug-in-format-for-the-web-browser-39307
- https://ieeexplore.ieee.org/document/10704163
- https://synthanatomy.com/?p=26693
- https://www.webaudiomodules.com/docs/intro/
- https://www.webaudiomodules.org/wamsynths/
- https://kth.se/navet/calendar/seminars-and-worksho/web-audio-modules-including-3d-vr-extensions-1.1340375
- https://deepwiki.com/webaudiomodules/webdx7
- https://npmjs.com/package/wam-community (403 on fetch)
- https://cmajor.dev/ (DNS fail on fetch)
- https://cmajor.dev/docs/Examples
- https://github.com/atelic/web-polysynth
- https://github.com/surge-synthesizer/surge
- https://rekkerd.org/surge-xt-free-open-source-hybrid-synthesizer-ported-to-juce/
- https://forum.mod.audio/t/vital-synth-port/10062
- https://pypi.org/project/vita/
- https://www.airmusictech.com/virtual-instruments/the-riser/
- https://www.boomlibrary.com/sound-effects/liftfx/
- https://integraudio.com/8-best-sweep-riser-plugins/
- https://www.npmjs.com/package/webaudiofont (GPL-3.0-or-later per summary; excluded from the table)
- https://github.com/jogijas/webaudio-synth (listed in a summary only; not used in the table)
