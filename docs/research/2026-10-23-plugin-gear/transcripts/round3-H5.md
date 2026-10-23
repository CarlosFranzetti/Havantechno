# H5: round 3 — lead, riser, impact and browser synth engines
Agent model: Haiku 5.5. Date: 2026-10-23.
Inputs read this round: round2-O1.md, round2-O2.md, round1-S5-stems-transcription.md, and my own round-1 file.
Studio path: the archived studio is now `olde Havantechno dub studio/` (frozen per CLAUDE.md). Any synth change for this pipeline goes in a new folder. I made no edits.

Searches this round: 4 WebSearch calls (the limit for this round). Fetches: surge-synthesizer/surge PR 8597, boourns/wam-community (fetch 404 at webaudiomodules/wam-community), registry.npmjs.org/@grame%2Ffaustwasm, github grame-cncm/faustwasm (targeted), github cmajor-lang/cmajor LICENSE.md, github webaudiomodules/webdx7.

Grades: (F) = I fetched it this round or in round 1; (S) = search summary only; (O2) = a claim I am relaying from O2's round-2 file, not checked by me.

---

## 1. Answers

### O1 round 2, Q11 (to H5)

"For the render-and-score fitting loop, which of Tone.js, FaustWasm and webOBXD can be instantiated on an OfflineAudioContext and have every parameter set from code?"

- **Tone.js: yes, with a caveat.** Tone.js 15.1.22 declares `Tone.Offline()` (a callback that builds Tone graphs and resolves to a ToneAudioBuffer) and `OfflineContext`, a wrapper that renders a native OfflineAudioContext to a ToneAudioBuffer (S: https://unpkg.com/browse/tone@15.1.22/build/esm/core/context/Offline.d.ts and https://unpkg.com/browse/tone@15.1.22/build/esm/core/context/OfflineContext.d.ts, both from a search result, not fetched). Parameters: the README says signal parameters can be assigned directly and automated with `rampTo` (F: https://github.com/Tonejs/Tone.js). So every signal parameter can be set from code. Caveat: the README I read does not list parameter names or ranges for each synth, so "every parameter" is verified only at the level of the mechanism.
- **FaustWasm: yes, verified.** The README describes `createOfflineProcessor` for offline rendering, and parameters are set with `setParamValue(path, value, time)`, where `time` is sample-accurate, plus AudioParam automation (F: https://github.com/grame-cncm/faustwasm, round-1 fetch and this round's targeted fetch). The offline path is one of the listed generator methods, so it is not a workaround. Parameter ranges come from the DSP we write, so they are in our own code.
- **webOBXD: not verified.** The fetched repo page names no offline path and no parameter API (F: https://github.com/jariseon/obxd). O2 says a WAM 2 adapter would need an AudioWorklet rebuilt on each OfflineAudioContext, with `addModule` called per context (O2, item 18; I have not tested this). Parameter control in WAM 2 goes through the host automation interface (O2 cites `wam-automation` and `WamParameterConfiguration`); I did not read that API. Answer for the loop: unknown until someone runs one offline render with it.

### O2 round 2, Q1 (to H5): device rows for my top three

Format: name; source; licence (SPDX); browser build; parameters with ranges mapped to spec names.

| Name | Source | Licence | Browser build | Parameters (mapped to spec names) |
|---|---|---|---|---|
| Tone.js | https://github.com/Tonejs/Tone.js (F) | MIT (F) | JavaScript library, no WAM; script or npm | Signal parameters set directly and automated with `rampTo` (F). Ranges and names per instrument not read: not verified. |
| FaustWasm (with our own Faust DSP) | https://github.com/grame-cncm/faustwasm (F) | LGPL-3.0 per npm registry, versions 0.0.25 to 0.0.59 (F: https://registry.npmjs.org/@grame%2Ffaustwasm); 0.19.0 entry not read | WebAssembly AudioWorklet nodes; precompiled route needs no compiler (F, see Q8) | Our DSP defines them. Set with `setParamValue(path, value, time)` (F). Ranges: to be written, not read from a source. |
| webOBXD | https://github.com/jariseon/obxd (F) | GPL-3.0 (F) | WAM, AudioWorklet and WebAssembly; best in Chrome (F) | Closed-device parameter table: not required (open source), and the defining parameters were not read: not found. |

Closed devices: none of my three is closed, so the 3–6 parameter table is not applicable. For the riser and impact devices (commercial references), the parameter ranges were not found.

### O2 round 2, Q8 (to H5): precompiled Faust and the Cmajor export

- **Faust precompiled: yes, with the file list below.** The faustwasm README (targeted fetch this round, F) has a "Dynamic and Static Instances" section. It says Faust Wasm and Audio Node instances can be built from precompiled WebAssembly modules, and that the precompiled route does not need the `libfaust-wasm.js` compiler loader. It says `index.js` alone supplies the required services. The CLI section shows that `faust2wasm` produces `dsp-module.wasm` and `dsp-meta.json`, with `-no-template` leaving only those two. Polyphonic DSP adds `mixer-module.wasm`; effects add `effect-module.wasm` and `effect-meta.json`. The README gives no file sizes. So a vendored precompiled device is `index.js` plus its `.wasm` and `.json`, with no libfaust files. That fits C2 as plain vendored files.
- **Cmajor web export: not verified.** My search summary (S: https://cmajor.dev/docs/Examples) says `cmaj generate --target=webaudio-html` produces a dependency-free folder of HTML, JavaScript and WASM. O2 asked about `--target=webaudio`. The name I found is `webaudio-html`. I could not check either name against a fetched page, because cmajor.dev failed to resolve in round 1. The licence check did run this round (F: https://github.com/cmajor-lang/cmajor/blob/main/LICENSE.md): it names GPLv3 (or later) and a commercial licence, and says C++ generated from your own Cmajor code "is yours to use however you like". Converting someone else's Cmajor source may violate that person's licence.

---

## 2. Revisions to my round 1

Round-1 items the budget cut, now checked (up to four searches this round):

1. **WAM community plugin list.** Partly found. A search result gives the index at https://www.webaudiomodules.com/community/plugins.json and says each collection has a `plugins.json` listing its plugins and their host categories (S). The repo at https://github.com/boourns/wam-community (F, round 1) names no plugins. My fetch of https://github.com/webaudiomodules/wam-community this round returned 404. I did not fetch the JSON index itself, so I cannot count its entries. O2 reports 58 entries (O2, not checked by me). The count "over 40" from the KTH listing is an older figure (S). Round-1 claim "WAM parameter API and preset format: not found": still not found by me; O2 cites `@webaudiomodules/sdk` 0.0.12 (O2, npm check).
2. **Surge XT browser build.** Found a port attempt, not a release. PR #8597 in surge-synthesizer/surge, titled "feat(web): add JUCE WebAssembly app and Vercel deployment", is closed and not merged, closed 29 September 2026 (F: https://github.com/surge-synthesizer/surge/pull/8597). Maintainers objected to its scope, and one asked for it to be split into separate commits and PRs (F). My round-1 Surge licence claim (search summary, "free and open source") is now backed by O2's GPL-3.0 (O2 cites H2, H3, S4 fetches). I did not check the Surge licence file myself.
3. **Vital browser build.** Not found. A second search (S) returned only webOBXD and wasm-synth. Vital remains desktop-only in what I can see.
4. **Faust WAM export.** Exists, search-grade. A 2022 paper describes `faust2wam`, a WebAudio plugin generator for the WebAudioModule standard with an auto-generated UI (S: https://hal.archives-ouvertes.fr/hal-02158925 and https://faustdoc.grame.fr/manual/deploying). The Faust manual says WAMs can be generated from the command line with `faust2wam`, and the Faust IDE can also generate WAMs (S). The WAM 2.0 standard was released in 2021 (S). I did not find faust2wam's licence or install steps: not found.

Other round-1 corrections:
5. **webdx7 licence.** My round-1 "licence not found" is now MIT (F: https://github.com/webaudiomodules/webdx7, this round). The README says "the webdx7 code is MIT licensed" and "MSFA is Apache 2.0 licensed". The README does not say whether it targets WAM 1 or WAM 2, and it names no SDK package (F).
6. **Cmajor licence.** My round-1 "not found" is now GPLv3 (or later) plus commercial (F, LICENSE.md, this round). See O2 Q8 above.
7. **Faust licence.** My round-1 "not stated" is now LGPL-3.0 for `@grame/faustwasm` (F: npm registry page). The 0.19.0 entry was truncated, so the latest version is not confirmed.
8. **Tone.js.** Still MIT (F). My round-1 note that MonoSynth is missing from the README stays open: the search summary said it is in the docs, and the README I fetched does not list it.
9. **Texed.** Still GPL-3.0 (F, round 1).
10. **ameobea/web-synth.** Licence still not captured (the LICENSE link was not read).

---

## 3. On my partner's report (S5)

S5 and I were paired on H5–S5. Where the synth engines and the transcription pipeline must agree:

**Agreement on the note contract.** Our instruments take `ev = {midi | notes, vel 0..1, dur seconds, accent}` (studio design spec, "Instruments" section). S5's transcribers produce MIDI with pitch bends (Basic Pitch), or GM note numbers at PPQ 960 (drum2midi). A converter must do three things:
- turn ticks into seconds using the tempo map (at 126 BPM and 960 PPQ, one tick is 60/126/960 s);
- turn amplitude into `vel`;
- handle pitch bend. Our in-house synths have no bend input, so bends are dropped. The lead has `glide` (portamento between notes, `synths.js` line 375), which covers only note-to-note slides, not continuous bends. Tone.js PolySynth, FaustWasm (`pitchWheel`, `ctrlChange`, `midiMessage` per my round-1 fetch) and WAM instruments can accept bends. So a `bend` input is a real gap for the in-house lead, and it needs a new folder, since the archived studio is frozen.

**Grid agreement.** The sequencer runs on 16-step pattern strings, not arbitrary-timed notes (S5 says this too). The lead already has a `melody` notation (8 or 16 tokens per bar, `-` sustains, `.` rests, design spec). So a transcribed lead can be quantized to 8ths and written as melody tokens, if the grid is right. O1's M0 gives the grid: 21,000 samples per beat at 44.1 kHz, with the kick onsets 11–13 ms before the spec's downbeat. The first downbeat is therefore about 0.568 s, not 0.58 s. The transcription bundle needs that offset, or the quantized lead will be shifted.

**Stereo agreement (lead only).** S5 notes that Basic Pitch downmixes to mono and that this loses the stab's width. For the lead this is not a loss: in `synths.js` both detuned oscillators feed one lowpass with no pan, so the lead is mono already. The stab is wide by spec (L/R about 0.41 in the 300 Hz to 2 kHz band, per O1 M7), so mono transcription of the stab would lose its width cue, not its pitch.

**Model hosting agreement.** Every synth engine I found is pure DSP (Tone.js, FaustWasm, WAM) and needs no model file. The only in-browser model routes are on the analysis side: demucs-web (ONNX, about 172 MB, COOP/COEP headers, S5 fetched) and basic-pitch-ts (Apache-2.0, S5 fetched). Under C2 (no network at runtime, O2), both need files vendored or picked by the user. So the two halves agree: synths stay model-free, and models stay in the offline Python front end, with the import bundle as the only interface. That is the hybrid O2 recommended.

**Lead transcription.** S5's question 4 to O1 asks whether basic-pitch on the "other" stem beats the hand-written melody. My view: in the breakdown the "other" stem holds the lead and the pad, so basic-pitch will return pad chords as well as the lead line. The spec gives the lead's pitches (F#4 G#4 C#5 D#5), so the transcription can be checked against them. A monophonic tracker on a band-limited region (S5 lists `librosa.pyin`, recalled, not verified) may fit the line better than a polyphonic model. Neither is verified for this track.

**Corrections to S5.**
- S5 says the 4-stem models produce no separate sub. Correct as far as it goes. But the sub drone (34.5 Hz, O1 M4) sits inside the "bass" stem's band, so a bass stem already carries the sub. Splitting sub from mid bass is a frequency-and-phase problem on that stem, not a model problem. This is my inference from O1's measurements, not a sourced result. The kick tail (about 52 Hz at 150 ms, O1 M1) also sits near the top of that band, so the cut is not clean.
- S5's "Sub: not a stem any listed model outputs" is right for the model list. It is wrong to conclude the sub is absent from the stems.
- S5 says basic-pitch-ts's browser use is "implied by the example only". I agree. I cannot add a fetch to that.

**Parameter data.** S5 found no tool that estimates synth parameters from audio. O2 relays two that do for single engines: Syntheon (Vital presets, Apache-2.0) and Synplant 2 Genopatch (O2 and O1, not checked by me). A fitting loop for our own synths needs an offline render. Tone.js (`Tone.Offline`) and FaustWasm (`createOfflineProcessor`) both have one. webOBXD's offline path is not verified.

---

## 4. Still open

1. **Repo licence (owner decision).** GPL-3.0 items (webOBXD, Texed, Surge if its licence is GPL) need a ruling before any can be adopted. Tone.js, FaustWasm (LGPL-3.0, so linking rules apply) and webdx7 (MIT) are the usable set for now.
2. **webOBXD offline render and WAM version.** Unverified: whether it instantiates on an OfflineAudioContext and which WAM version it targets. O2 says it targets WAM 2 via `@webaudiomodules/sdk` 0.0.12 (O2, not checked by me).
3. **Pitch-bend input for in-house synths.** A `bend` parameter or input is needed to carry transcribed bends. Not built. Requires a new folder.
4. **Lead identity.** The reference lead's synth was not identified by any source. Not found.
5. **Riser and impact.** No measured riser or impact data in the spec. O1's proposal P3 (track the spectral centroid per 16th across the build, bars 24–40) was not run; it needs the render pipeline, which does not exist yet.
6. **WAM catalogue count.** The 58-entry figure is O2's. My fetches could not confirm it (plugins.json not fetched; the repo path returned 404).
7. **Cmajor web target name.** `webaudio-html` (my search summary) versus `webaudio` (O2's question). Not resolved.
8. **Prices.** No new prices this round. The riser plugins (AIR The Riser, liftFX) remain "price not found".
9. **Lead melody from transcription.** Whether a monophonic tracker on a band-limited region recovers the breakdown lead, with the spec's pitch set as a check. Not tested.

## Sources

Fetched this round:
- https://github.com/surge-synthesizer/surge/pull/8597
- https://github.com/grame-cncm/faustwasm (targeted fetch: precompiled route, file list)
- https://registry.npmjs.org/@grame%2Ffaustwasm
- https://github.com/cmajor-lang/cmajor/blob/main/LICENSE.md
- https://github.com/webaudiomodules/webdx7
- https://github.com/webaudiomodules/wam-community (404; not used as evidence)

Search results this round (not fetched):
- https://www.webaudiomodules.com/community/plugins.json (URL from search summary)
- https://www.webaudiomodules.com/docs/intro/
- https://kth.se/navet/calendar/seminars-and-worksho/web-audio-modules-including-3d-vr-extensions-1.1340375
- https://github.com/boourns/wam-community
- https://github.com/TimDaub/wasm-synth
- https://github.com/jariseon/obxd
- https://hal.archives-ouvertes.fr/hal-02158925
- https://faustdoc.grame.fr/manual/deploying
- https://cdn.jsdelivr.net/npm/@grame/faustwasm@0.16.5/README.md
- https://unpkg.com/browse/tone@15.1.22/build/esm/core/context/Offline.d.ts
- https://unpkg.com/browse/tone@15.1.22/build/esm/core/context/OfflineContext.d.ts
- https://cmajor.dev/docs/Examples

Carried from round 1 and used above: https://github.com/Tonejs/Tone.js, https://github.com/jariseon/obxd, https://github.com/grame-cncm/faustwasm, https://github.com/WouterVanNifterick/texed, https://github.com/ameobea/web-synth, https://github.com/boourns/wam-community, https://github.com/webaudiomodules.

Relayed from O1 and O2 (not checked by me): the 58-entry catalogue, `@webaudiomodules/sdk` 0.0.12, Syntheon, Synplant 2 Genopatch, and the Web Audio spec points on OfflineAudioContext and `addModule` (O2 round 2).
