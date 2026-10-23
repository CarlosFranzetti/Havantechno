# O2: round 2 — critique, consolidated gear list, questions, owner decisions
Agent model: Opus. Date: 2026-10-23.

I read all twelve round-1 files in full (H1–H5, S1–S5, O1, and my own O2), plus `prd.md` and `future.md` at the repo root, because they state constraints that bear on every recommendation.

**What I checked this round.**
- I made **no WebSearch calls**.
- I settled five factual points from primary sources:
  - three from the Web Audio specification and two from MDN content, both read through the Context7 docs index;
  - one GitHub page fetch (`webaudiomodules/webdx7`);
  - one local listing of the repo root.
- Each point is marked where it is used. Labels:
  - `(verified: <url>)` means I read it this round or in round 1.
  - A category agent's own grade is passed through as F (that agent fetched the page), S (search summary only) or U (unverified).

**Constraints in `prd.md` that round 1 did not take into account (mine included):**
- **C1:** "No build step, no package manager, no audio files."
- **C2:** "No network at runtime. The studio fetches nothing after load."
- **C3:** "Runs from a static HTTP server" (`python3 -m http.server`).
- **Out of scope:** "Saving or loading songs, MIDI input, and plug-in formats."
- **Direction D1–D3** (per-device look, the source as stems plus MIDI, the remix pipeline) needs at least the first and third of those out-of-scope items brought into scope.

Most of the owner decisions in section 5 come from these clashes.

The studio folder is now `olde Havantechno dub studio/`. `studio/` is a symlink to it, so every `studio/...` path below still resolves.

## 1. What the category reports confirm or contradict in my round 1

**Confirmed**

1. **No VST3, AU or CLAP binary runs in a browser; source-available DSP can be recompiled.** Every category agent reached the same split independently:
   - H2: Mz101 "no web build found".
   - H3: Youth106, Dexed and Vital are desktop only.
   - S1: LSP Plugins "would be a port to WASM or a rewrite".
   - S3: closed commercial plugins "cannot be hosted".
   - S4: "Nothing in the table runs in a browser as-is."
   - The only browser-native entries anyone found are source projects: junox, webOBXD, webdx7, Texed, Pro-54, AudiusProject/303.
2. **WAM 2.0 is the hosting standard, and the WAM catalogue is thin for electro.**
   - H5 could not retrieve the catalogue and lists "WAM parameter API and preset format: not found".
   - Round 1 has the catalogue (58 `plugins.json` entries, mostly guitar effects) and the API (`WamParameterConfiguration`, `wam-automation`, `getState`/`setState`). That answers H5's two O2 questions.
   - H5's "over 40 WAM2 plugins" (search summary) agrees with my 58 entries once the MIDI, video and utility entries are counted.
3. **Faust, Cmajor and RNBO are the routes for "create a new device".**
   - H5 ranks FaustWasm second and confirms mono and poly nodes, MIDI and sample-accurate `setParamValue` (F).
   - H3 found a browser Prophet-style patch written in Cmajor (Pro-54, F).
   - **Licences.** H5 lists Faust's and Cmajor's licences as "not stated" or "not found". Round 1 has both:
     - `@grame/faustwasm` is LGPL-3.0 (npm registry).
     - Cmajor is dual GPLv3-or-later / commercial, and "that generated C++ is yours to use however you wish" (verified: https://github.com/cmajor-lang/cmajor/blob/main/LICENSE.md).
4. **SharedArrayBuffer needs COOP/COEP, which the documented server lacks.** S5 found that demucs-web needs COOP/COEP (F) and drew the same conclusion about `python3 -m http.server` that I did. That claim is still an inference by both of us, not a test.
5. **Essentia.js is AGPL.** S5 (S) and my npm registry check (`essentia.js` 0.1.3, AGPL-3.0) agree.
6. **Basic Pitch has a JS route under Apache-2.0.** S5 fetched `spotify/basic-pitch-ts`: stereo is downmixed to mono and resampled to 22,050 Hz. My registry check shows `@spotify/basic-pitch` 1.0.1, Apache-2.0, last published 2022-08-05. Same family, consistent.
7. **Ableton Live 12 stem separation and audio-to-MIDI.**
   - S5 adds that stem separation arrived in **Live 12.3, Suite only** (S, ableton.com and mixdownmag).
   - My Context7 read of the Live 12 manual confirmed the four stems and the two quality modes, but not the edition.
8. **The device contract maps onto WAM.**
   - H5 asks whether Havantechno can host a WAM. Answer: yes, through an adapter. `seq.addTrack` already accepts a ready-made instrument object.
   - The open costs are async construction and creating every plugin again on the `OfflineAudioContext`.

**Contradicted or qualified (corrections to my round 1)**

9. **"No verified source describes recovering synth patches from audio."** Too strong. O1 found:
   - **Synplant 2 Genopatch**, which "crafts synth patches from audio recordings" (search grade).
   - **Syntheon**, which infers Vital presets from audio (Apache-2.0, fetched).
   - Neither is a DAW, and both are locked to one engine. My corrected claim: no *DAW* does it, and no tool does it for an arbitrary synth. Havantechno's case — small in-house synths with offline render — is the one O1 judges practical, by search-based fitting.
10. **"There is no polysynth built for stabs."** True only of the wam-community list. H3 and H5 found browser polysynths outside it:
    - junox: Juno-60, AudioWorklet, GPL-3.0, F.
    - webOBXD: OB-X, WAM, GPL-3.0, F.
    - Pro-54: Cmajor, licence not found, F.
    - webdx7: FM, WAM.
11. **webdx7.** Round 1 cited `jariseon/webdx7` from a topic page. H3 cites `webaudiomodules/webdx7` as MIT (S); H5 says "licence not found".
    - This round I fetched `webaudiomodules/webdx7`. It shows "MIT license", and the README says "webdx7 code is MIT licensed" and "MSFA is Apache 2.0 licensed".
    - The README does not say whether it targets WAM v1 or WAM 2.0 (verified: https://github.com/webaudiomodules/webdx7).
12. **FL Studio stem separation.** I wrote "not found" in the Context7 copy of the FL manual. S5 found secondary sources: FL Studio 21.2, Producer Edition and above, four stems (S, stemconsole.ai). Logic Pro's Stem Splitter gives six stems from 11.2 (S, dj.studio). Both move up from my "recalled" list to search-grade, from vendors with a commercial interest.
13. **Loading WAM plugins "by URL from another origin".** C2 (no network at runtime) rules this out as the project stands. Under C2 every plugin, the SDK and any model must be vendored into the repo. That conflicts with C1's "no package manager" only in tooling, not in principle: a vendored file is still a plain file.

**Settled this round (questions round-1 agents left open)**

14. **Biquad `Q` for lowpass and highpass is in dB** (O1 recalled; S3 asked). The spec: "For lowpass and highpass filters the Q value is interpreted to be in dB", and each is "a standard second-order resonant lowpass filter with 12dB/octave rolloff". So `res: 3` in the bass is a 3 dB peak, and O1's bass simulation assumption holds. (verified: https://webaudio.github.io/web-audio-api/)
15. **A `DelayNode` inside a feedback cycle is clamped to at least one render quantum** (S2 marked this unverified). The spec: "If DelayNode is part of a cycle, then the value of the delayTime attribute is clamped to a minimum of one render quantum" — 128 frames by default. (verified: same URL)
    - Consequence for S2's top pick: Freeverb's comb lengths (1116–1617 samples) and allpass lengths (225–556) are all above 128 at 44.1 kHz, so Freeverb can be built from native nodes. That is my arithmetic on S2's figures.
    - Dattorro's modulated short taps still need an AudioWorklet.
16. **`DynamicsCompressorNode` behaviour** (S1, S4). The spec's internal graph is `new DelayNode(context, {delayTime: 0.006})` in front of the gain stage. It lists "Fixed look-ahead", "Side-chaining is not supported", and leaves the soft-knee curve shape to the user agent ("User-Agents can choose the curve shape"). This confirms S1's 6 ms finding, which came from the sndfilter port, and S4's recalled pre-delay. (verified: same URL)
17. **A keyed compressor can be built in Web Audio** (S1 Q3). An `AudioWorkletNode` takes `numberOfInputs` and `numberOfOutputs` options, defaulting to 1 each. A two-input processor (audio plus key) is supported by the API. (verified: https://github.com/mdn/content/blob/main/files/en-us/web/api/audioworkletnode/audioworkletnode/index.md)
18. **AudioWorklet in an `OfflineAudioContext`** (S1, S4 marked this unverified). `audioWorklet` is a property of `BaseAudioContext` (BCD 8.1.7: Chrome 66, Firefox 76, Safari 14.1, from round 1), so an offline context has one. Each context needs its own `addModule` call, which `Sequencer.render` would have to do before `startRendering`. I have not tested a render.

## 2. Critique

**H1 (kick and sub).**
- **Strong.** Puts the spec's numbers next to the code defaults (punch 170 vs ~130, sub decay 0.4 vs ~0.3, harmonic 0.12 vs pure sine). Finds the right published model: Werner, Abel and Smith, DAFx-14, the 808 bass drum.
- **Weak.**
  - Every claim is excerpt-grade. Song values were not read: `song.js` uses punch 190, tune 44, sweep 0.07, per O1.
  - Tone.js was left "licence to check". H5 fetched it as MIT.
  - O1's finding that the swept kick alone peaks in the 30–80 Hz band at ~41–46 ms reopens the "separate sub" question H1 assumed closed.
- **What the platform needs.** Kick parameters an analysis step can write directly — start Hz, end Hz, sweep time, and a sweep-curve shape — and a decision on whether kick and sub become one voice. The open-source kick synths (KickCrafter, Kickmess: AGPL) are reference-only unless the repo goes AGPL.

**H2 (mid bass).**
- **Strong.** Seven fetched GitHub pages and careful licence work: jc303 GPL-3.0 with an MIT Open303 core; Mz101 AGPL-3.0; Vital presets not redistributable. Correctly notes that `sub: 0` mutes the square layer in the song.
- **Weak.** The #1 pick (TAL-BassLine) rests on unverified listings. The report says nothing about filter **slope**, which O1's simulation makes the prime suspect for the 300 Hz–1 kHz excess. The Open303 upstream LICENSE was not read (blob 404).
- **What the platform needs.** One MIT-clean filter model — Open303, if its licence is confirmed — ported to an AudioWorklet or reimplemented. A `slope` parameter (12/24 dB) exposed in the bass spec so the matcher can switch it.

**H3 (stab and pad).**
- **Strong.** The best browser-native findings in the H group: junox (AudioWorklet, F), the Juno-60 chorus analysis with concrete rates (0.51 / 0.86 Hz, two BBD lines, inverted right channel), webOBXD (WAM, F), and the Pro-54 Cmajor patch (F). Says plainly that the repo has no LICENSE (confirmed: `ls` finds none).
- **Weak.** Pro-54's licence is not found. webdx7 was MIT on a snippet only (fetched now, see item 11). Whether WAM v1 or 2 is used is not stated for any of the WAM synths. The stab-width test it proposes is not run.
- **What the platform needs.** The repo-licence decision first (everything H3 ranks 1–8 is GPL, except Tone.js and webdx7, which are MIT). If webOBXD is wanted, its WAM API version, because the adapter targets `@webaudiomodules/sdk` 0.0.12 (WAM 2).

**H4 (drums).**
- **Strong.** Reports the 909 hat conflict honestly (analog per Roland vs 6-bit PCM per Polynominal) instead of picking one. Circuit-level sources for the 808 hats and clap.
- **Weak.**
  - Shaker and percussion are not covered.
  - Every fact is excerpt-grade, and all four fetches failed.
  - None of the browser TR-808 repos has a licence.
  - Tone.js MetalSynth's fixed ratios come from a fork.
- **What the platform needs.**
  - A **choke-group rule** in the sequencer (open hat cut by closed hat). Today hats are independent voices.
  - A decision on sample-like sources, since C1 forbids audio files: a 6-bit hat path would have to be generated in code.
  - Parameter names modelled on Ableton DS HH and DS Clap, which H4 suggests.

**H5 (lead, FX, browser engines).**
- **Strong.** Verified fetches of Tone.js (MIT), faustwasm, webOBXD, Texed (GPL-3.0) and web-synth. Clear that the reference lead's synth is "Not found". States the gap that the spec has no measured riser or impact data.
- **Weak.** The WAM catalogue, API and preset format were not retrieved (answered in my round 1 and item 2). Faust and Cmajor licences were left unknown (answered in item 3). Riser research is a roundup summary.
- **What the platform needs.** For the "create" path: a way to ship a **precompiled** Faust or Cmajor device as plain files (C2 rules out a runtime cloud compile or CDN). A confirmation that faustwasm's precompiled path needs only its `index.js` and not the libfaust compiler. faustwasm's README says precompiled modules need only `index.js` (my round 1, fetched), but the size was not stated.

**S1 (sidechain and compression).**
- **Strong.** Reads `BUILD.sidechain` precisely (trigger-scheduled gain, linear release, no offset or velocity). Turns commercial products into a concrete control list: curve, offset/lookahead, velocity depth, low-band-only. Finds MIT DSP sources (sndfilter's Chromium-derived compressor, Airwindows).
- **Weak.** Nearly all product facts are search summaries. Classic emulations were not searched. The 6 ms pre-delay is now verified from the spec (item 16).
- **What the platform needs.**
  - A Processors-contract API for a worklet compressor with a key input (now known to be possible, item 17).
  - Per-track "key from" routing in the sequencer. Today `duck` only triggers scheduled envelopes, so imported stems — which the sequencer does not schedule — cannot drive a ducker.
  - A gain-reduction value the device panel can read: the native node's `reduction`, or a worklet port message.

**S2 (delay and reverb).**
- **Strong.** Gives published algorithms with numbers (Freeverb's line lengths and stereo spread of 23 samples; Zita-Rev1's structure; the Dattorro paper). Spots a real code issue: `BUILD.delay`'s tone and highpass sit outside the feedback loop, so repeats do not darken.
- **Weak.** No page was opened. No measurement of the reference's delay time or RT60. Its unverified render-quantum claim is now confirmed (item 15).
- **What the platform needs.** A decision on IR files (C1). Freeverb as a native-node reverb with its comb lengths scaled to the context's sample rate. An `inLoop` placement for the delay's filters, exposed as a parameter so existing renders do not change by default.

**S3 (saturation, EQ, filters).**
- **Strong.** The most useful reframing in the S group: match-EQ is an **offline analysis script** (render, compare spectra, fit 3–6 peaking biquads), not a plugin. It also correctly notes that `WaveShaperNode` cannot do ADAA and that a symmetric tanh adds only odd harmonics.
- **Weak.** Lists Surge XT's licence as "not found" although H2, H3 and S4 fetched GPL-3.0. Most claims are search summaries. It does not engage with O1's simulation, which points at the bass voice and the kick's drive rather than the master.
- **What the platform needs.** An **N-band parametric EQ device** whose bands are addressable by dotted path (`bass.peq.b2.gain`), so match-EQ output can be written as parameter data. `eq3` has one fixed mid band and cannot take a fitted curve. A saturator `curve` choice (tanh, sine, asymmetric) as a spec parameter.

**S4 (limiter, width, modulation).**
- **Strong.** Two fetched primary sources: the Ozone 9 Imager docs, and the libebur128 README ("All source code is licensed under the MIT license"). It reads the widener correctly (broadband mid/side, so it widens the sub) and the chorus (hard-panned voices that comb-filter in mono).
- **Weak.** The 0.41 correlation's provenance cannot be settled from the spec. The club LUFS targets are blog consensus. No browser loudness implementation was verified beyond `needles` (ScriptProcessor, S).
- **What the platform needs.** A **metering device**: LUFS, true peak, multiband correlation and a vectorscope, as an AudioWorklet plus a canvas face. It is the natural first "own look" device under D1, because it shows what the render-vs-reference loop measures. A crossover parameter on the widener so the low band stays mono.

**S5 (stems and transcription).**
- **Strong.** The most thoroughly fetched report (10 GitHub pages) and the most decision-relevant one:
  - demucs-web's real costs: ~172 MB model, COOP/COEP, four stems only;
  - drum2midi's GM mapping and PPQ 960;
  - basic-pitch-ts's mono downmix;
  - the licence trap in madmom: BSD code, CC BY-NC-SA models.
- **Weak.** The Live 12.3 / Suite and the FL and Logic stem claims are search-grade. The licences of drum2midi, free-music-demixer and the ADTOF weights are unknown. No tool outputs tempo maps or downbeats in a form checked against our grid.
- **What the platform needs.**
  - **An import bundle format**: stems as WAV, MIDI, and JSON for tempo, offset, key and sections. S5's Q1 proposes this, and it matches my DAWproject-shaped JSON.
  - An owner ruling on C2 for any in-browser model.

## 3. The gear list as it stands

**How to read the table.**
- **Only entries a category report actually sourced.** Grade is the source agent's: F fetched, S search summary, U unverified. "+O2" means I added verification (round 1 npm, Context7, or GitHub).
- **Browser?** "yes" means it runs in a browser today. "WASM port" means source exists and would need compiling or porting. "no" means a closed binary, hardware or a Python-only tool. "native nodes" means buildable from built-in Web Audio nodes.
- **Action**:
  - **adopt**: use as is, vendored.
  - **port**: recompile or translate the source.
  - **reimplement**: write our own from a published algorithm or description.
  - **reference**: listen, compare or copy controls only.
- **Licence bundles.** Every GPL/AGPL "adopt" or "port" is conditional on decision 1 in section 5.

| Device or tool | Role in the pipeline | Licence | Runs in browser? | Recommended action | Source agent (grade) |
|---|---|---|---|---|---|
| In-house `kick`, `sub` (retuned) | instrument | repo's own (no LICENSE yet) | yes | adopt; retune, and test kick+sub as one voice | H1, O1 (code read) |
| Werner, Abel, Smith, 808 bass drum model (DAFx-14) | instrument design | paper | reimplement as native nodes or a worklet | reimplement, only if the reference shows a separate attack jump | H1 (S) |
| Tone.js (MembraneSynth, MetalSynth, PolySynth, Chorus, NoiseSynth) | parameter reference, prototype | MIT | yes | reference; adopt only vendored (C2 rules out a CDN) | H5 (F), H1/H3/H4 (S) |
| KickCrafter, Kickmess | kick design reference | AGPL-3.0 | WASM port | reference | H1 (S) |
| Open303 engine (inside jc303) | bass filter model | MIT core, as stated by jc303; upstream LICENSE unread | WASM port | port to a worklet if the licence is confirmed | H2 (F via jc303) |
| jc303, schwung-303 | drive and acid reference | GPL-3.0 | WASM port | reference | H2 (F) |
| Mz101 (SH-101) | bass reference | AGPL-3.0 | no web build | reference | H2 (F) |
| AudiusProject/303 | browser bass reference | licence not found | yes | reference only | H2 (F) |
| TAL-BassLine | bass A/B | freeware | no | reference | H2 (U/S) |
| Surge XT | synth, effects and filter reference | GPL-3.0 | WASM port (PR #8597 closed unmerged) | reference | H2, H3, S4 (F); O2 (F) |
| Vital | wavetable and preset reference | GPLv3 + commercial; free presets not redistributable | no | reference | H2, H3 (F) |
| junox (Juno-60) | stab and pad voice, chorus | GPL-3.0 | yes (AudioWorklet) | reference; adopt only under a GPL repo | H3 (F) |
| Juno-60 chorus analysis (pendragon-andyh) | chorus algorithm | GPL-3.0 (per the junox page) | native nodes or a worklet | reimplement from the analysis | H3 (F) |
| webOBXD | poly voice (WAM) | GPL-3.0 | yes (WAM; version not stated) | adopt as a hosted WAM only if GPL is acceptable | H3, H5 (F) |
| webdx7 | FM voice (WAM) | MIT; MSFA Apache-2.0 | yes (WAM; version not stated) | adopt candidate once the WAM version is confirmed | H3 (S); O2 (F this round) |
| Pro-54 (Cmajor patch) | poly voice | patch licence not found; Cmajor GPLv3/commercial | yes | reference until the licence is found | H3 (F) |
| Dexed, Youth106, OB-Xd | poly references | GPL-3.0 | no | reference | H3 (F/S) |
| In-house hats, clap, shaker, perc | instruments | own | yes | adopt; fix the hat `hp2` (O1) and add choke groups | H4, O1 |
| Plaits firmware | drum voice DSP | reported MIT/GPL split (U) | WASM port | port candidate once the licence is read | H4 (S/U) |
| Browser TR-808 repos (gsspdev, io-808, others) | drum references | none found | yes | reference only | H4 (S) |
| Ableton DS HH and DS Clap parameter sets | naming template | commercial | no | reference | H4 (S) |
| Roland TR-909 (Roland Cloud) | listening reference | commercial, ~$149 or ~$19.95/month (S, dated 2026-10-23) | no | reference | H4 (S) |
| FaustWasm (+ faust2wam `wam2-ts`) | "create" path, DSP language | LGPL-3.0 | yes | adopt as the device-authoring route, precompiled | H5 (F); O2 (npm, Context7) |
| Cmajor web export | "create" path | GPLv3/commercial; generated code free to use | yes | adopt candidate (half native speed per its docs) | H5 (S); O2 (F) |
| Texed, web-synth | browser references (presets, runtime Faust) | Texed GPL-3.0; web-synth not captured | yes | reference | H5 (F) |
| AIR The Riser, liftFX | riser references | commercial | no | reference | H5 (S) |
| In-house `sidechain` ducker | ducking | own | yes | adopt; add curve, offset, velocity depth, low-band mode | S1 |
| sndfilter `compressor.c` (Chromium-derived) | glue compressor DSP | MIT | WASM port or worklet | port | S1 (F) |
| Airwindows compressors, reverbs, saturators | DSP sources | MIT | WASM port or worklet; static curves map to a WaveShaper | port or reimplement | S1 (F repo), S2, S3 (S) |
| LSP Plugins | dynamics reference | LGPLv3 | no | reference | S1 (F) |
| Kickstart 2, Duck 2, The Glue, Pro-C 2 | control and spec references | commercial | no | reference | S1 (S) |
| TDR Kotelnikov, TDR Nova | A/B references | free, closed | no | reference | S1, S3 (S) |
| Freeverb | reverb algorithm | public domain | native nodes (all loops ≥128 samples, item 15) | reimplement | S2 (S); O2 (spec) |
| Dattorro plate (JAES 1997) | reverb algorithm | paper | worklet | reimplement | S2 (S) |
| Zita-Rev1 (Faust `zita_rev1`) | reverb | GPL per a port | via Faust → WASM | port only if GPL is acceptable | S2 (S) |
| Dragonfly Reverb | A/B reference | GPL-3.0 | no | reference | S2 (S) |
| OpenAIR and EchoThief IRs | convolution IRs | per-item CC / custom | yes, but these are audio files | reference unless C1 is relaxed | S2 (S) |
| Audio EQ Cookbook | EQ coefficients | W3C note | native nodes | adopt as the basis for the N-band EQ | S3 (S) |
| ADAA papers, chowdsp `ADAASineClipper` | antialiased saturation | paper / library | worklet | reimplement | S3 (S) |
| Spectrum Thief, Pro-Q 4, Ozone Match EQ | match-EQ method | free closed / commercial | no | reference (method only) | S3 (S) |
| ZL Equalizer, FreeEQ8 | EQ code reference | AGPL-3.0 / GPL-3.0 | no | reference | S3 (F) |
| Klanghelm IVGI, Ableton Saturator, Ableton Auto Filter | saturation and filter design references | freeware / commercial | no | reference | S3 (S) |
| libebur128 | loudness and true-peak meter | MIT | WASM port or worklet | port (metering device) | S4 (F) |
| needles | browser LUFS meter | MIT (S) | yes (ScriptProcessor) | reference | S4 (S) |
| Ozone Imager (docs) | multiband width design | commercial / free | no | reference (design) | S4 (F) |
| Voxengo Correlometer, MSED; Youlean | measurement | free, closed | no | reference (measure the reference track) | S4 (S) |
| LoudMax, TDR Limiter 6 GE, Pro-L 2 | limiter references | free / commercial | no | reference | S4 (S) |
| TAL-Chorus-LX, MicroShift | chorus and width references | free / commercial | no | reference (copy MicroShift's Focus crossover idea) | S4 (S) |
| Demucs v4 (htdemucs) | separation | MIT (archived 2025) | no (Python) | adopt offline | S5 (F) |
| demucs-web | separation in the page | MIT | yes (WebGPU/WASM, 172 MB, COOP/COEP) | adopt only if C2 and the server headers change | S5 (F) |
| free-music-demixer | separation in the page (WASM) | not shown | yes | reference | S5 (F) |
| BS-RoFormer family | separation, higher quality | mixed, some non-commercial | no | reference / private experiments | S5 (S) |
| Basic Pitch / basic-pitch-ts | polyphonic notes | Apache-2.0 | yes (TS; mono downmix) | adopt (offline first) | S5 (F); O2 (npm) |
| adtof_plus_drum_transcription | drum MIDI | wrapper MIT; weights unknown | no | adopt offline | S5 (F) |
| drum2midi | drum MIDI with velocity | not shown | no | adopt offline once the licence is read | S5 (F) |
| Omnizart | multi-task transcription | MIT | no | offline option | S5 (F) |
| librosa | tempo, onsets, chroma | ISC | no | adopt offline | S5 (F) |
| madmom | downbeats, chords | BSD code; CC BY-NC-SA models | no | private experiments only | S5 (F) |
| Meyda | browser features | MIT | yes | adopt | S5 (S); O2 (npm) |
| web-audio-beat-detector | browser tempo + first beat | not stated | yes | adopt candidate | S5 (S) |
| Essentia.js | browser MIR | AGPL-3.0 | yes | reference unless the repo is AGPL | S5 (S); O2 (npm) |

What the table says in one line: **almost nothing is "adopt as is".** The realistic gear list is:
- **in-house devices**, extended;
- **reimplementations** of published algorithms and MIT code (Freeverb, Dattorro, Juno chorus, Open303, sndfilter, Airwindows, libebur128, Audio EQ Cookbook);
- the **Faust/Cmajor** authoring route for new devices;
- an **offline Python analysis front end** (Demucs, Basic Pitch, ADTOF/drum2midi, librosa).

Commercial plugins serve as listening and control references.

## 4. Numbered questions

Each question can be answered in round 3 by reading a repo or page the agent already cited, by reasoning, or with one or two searches. ★ marks my three round-1 questions, refined.

- **Q1 ★ (to H1, H2, H3, H4, H5, S1, S2, S3, S4).** For each device you rank in your top three, add one row to your round-3 file:
  - name;
  - source available (repo URL or "closed");
  - licence as SPDX, if a page showed it;
  - browser build (WAM 2 / WAM version unknown / AudioWorklet / none);
  - for closed devices, the 3–6 parameters that define its character, with ranges, mapped to our spec names (`{min, max, value, unit}`).
  This replaces "which licence" prose with a table the coordinator can merge into section 3.
- **Q2 ★ (to S5).** For Demucs, basic-pitch-ts, adtof_plus_drum_transcription and drum2midi, state the exact output:
  - file type;
  - time unit (seconds, or ticks with PPQ);
  - velocity resolution;
  - pitch bend;
  - whether a tempo map or downbeat is written.
  Which tool, if any, would place imported notes on our bar grid given the reference's first downbeat at 0.58 s, and which needs a separate beat tracker (librosa, madmom, web-audio-beat-detector) to do it?
- **Q3 ★ (to S1, S2, S3, S4).** Which parameters in your category plausibly **move over time** in the reference (for example the master highpass and lowpass sweeps already in `song.js`, send levels in the break, duck depth), and at what resolution: per section, per bar, per 16th, or continuous? Give the measurement you would use for each (centroid per bar, beat-folded RMS, autocorrelation). This decides whether section `set`/`ramp` suffices or per-point automation lanes are needed.
- **Q4 (to H1).** O1's simulation shows the swept kick alone peaking in the 30–80 Hz band at about 41–46 ms. Which of your sourced kick designs supports a **single kick-bass voice** with a long tuned tail (KICK 2/3's sub layer with keytrack, Mutant BD9's separate pitch and amp envelopes)? List the parameters such a merged voice needs.
- **Q5 (to H2).** Read the Open303 repository's licence file or source headers. If it is MIT, list the Open303 components (filter, envelopes, accent, slide) that would form a "24 dB/oct ladder" option for `BUILD.bass`, with their parameters and ranges.
- **Q6 (to H3).**
  - Do webOBXD and webdx7 implement WAM 1 or WAM 2? Check each repo's `package.json` dependencies or README; a dependency on `@webaudiomodules/sdk` or `@webaudiomodules/api` would show WAM 2.
  - What is the Pro-54 patch's licence (the Cmajor repo's examples folder or patch header)?
- **Q7 (to H4).**
  - From the Ableton Drum Rack and Analog Rytm sources you cited, state a choke rule precise enough to implement: which voice cuts which, and whether the cut is instant or a fast release (ms).
  - Can the Plaits firmware licence be read from its repository?
- **Q8 (to H5).** From the faustwasm README you fetched: can a **precompiled** Faust DSP run with only `dist/esm/index.js` plus its own `.wasm`, without the `libfaust-wasm` compiler files? If the README shows any file sizes, give them. Same question for a Cmajor `--target=webaudio` export. This decides whether "create a new device" fits C2 (no runtime network) with plain vendored files.
- **Q9 (to S1).** Specify a worklet compressor for our Processors contract (`{input, output, params, set, get, bypass, dispose}`) with a second input for a key signal (two inputs are allowed: item 17). Give the parameter list with ranges, and say which MIT source the detector comes from (sndfilter or Airwindows). How would the sequencer's `duck: [...]` list map onto it when the key is an imported stem rather than a scheduled kick?
- **Q10 (to S2).**
  - Restate the Freeverb and Dattorro delay lengths at 48 kHz.
  - Which loops would fall under 128 samples at either rate and so need a worklet?
  - Does any of your sources indicate whether the clap's "reverb tail" in the reference is a short synthetic tail or a send reverb (relevant to H4's split)?
- **Q11 (to S3).**
  - Define the N-band parametric EQ device that a match-EQ script would write to: number of bands, band types, parameter names and ranges, and the dotted-path naming.
  - Using O1's simulation results, should the first correction for the 300 Hz–1 kHz excess be per element (bass filter slope, kick drive) rather than on the master?
- **Q12 (to S4).**
  - Propose the measurement procedure for per-band L/R correlation on the reference (bands, window, onset vs tail), so the 0.41 figure can be replaced by a profile.
  - Can libebur128's K-weighting and true-peak parts be described well enough from its README and source to reimplement in a worklet, or does it need a WASM build?
- **Q13 (to S5).** Under C2 (no runtime network): can demucs-web load its ONNX model from a file the user picks (`<input type="file">`) rather than a fetch? Does its WASM fallback still need COOP/COEP, or only the threaded path? The answers decide whether an in-browser separator is possible without changing the server.
- **Q14 (to S5 and H4).** For hats: does adtof_plus_drum_transcription or drum2midi output open and closed hats as separate notes (GM 46 and 42) with durations, so that a choke rule can be inferred from the reference, or only onsets?

## 5. Decisions the owner must make

1. **Repo licence.** The repo has no LICENSE file (checked: `ls` at the repo root finds none; H3 found the same).
   - **MIT or another permissive licence.**
     - Rules in: MIT, BSD, ISC, Apache and public-domain sources (Open303 core if confirmed, Airwindows, sndfilter, libebur128, webdx7, Tone.js, Meyda, Basic Pitch, Freeverb, published papers).
     - Rules out: copying or porting GPL/AGPL code (junox, webOBXD, Surge, Mz101, ZL EQ, Juno-60 analysis code, Essentia.js) into the repo. Their algorithms can still be studied.
     - Hosting a GPL WAM as a separately loaded file is a legal grey area I cannot settle. I recommend treating it as ruled out.
   - **GPL-3.0.** Rules in all of the above plus the GPL projects. AGPL code (Mz101, KickCrafter, ZL Equalizer, Essentia.js) would bring its network-use clause along with it.
   - **AGPL-3.0.** Rules in everything listed, but anyone who serves the studio must offer its source.
   - **Stay unlicensed / private use.** Keeps every option for personal experiments, including non-commercial model licences (madmom models, some RoFormer checkpoints). Nothing can be published or shared as open source.
2. **Where analysis runs: offline or in the browser.**
   - **Offline Python tool that exports an import bundle** (stems WAV + MIDI + tempo/offset/key/sections JSON).
     - Rules in the best tools found: Demucs, ADTOF/drum2midi (no browser build exists), librosa, Basic Pitch.
     - Needs a Python environment outside the studio. Rules out a one-page experience.
   - **In the browser** (demucs-web, basic-pitch-ts, Meyda, web-audio-beat-detector).
     - Rules out drum transcription (no browser tool found).
     - Needs a 126–172 MB model, COOP/COEP headers and, on some platforms, WebGPU.
     - Conflicts with C2 unless the user loads the model file by hand.
   - **Hybrid** (offline now, in-browser later). The import bundle format is the same either way, so this costs little. **My recommendation.**
3. **Audio files.** C1 says none.
   - **None anywhere.** Rules out the reference and its stems inside the studio. Also rules out IR reverbs, a sample-based 909-style hat, and O1's "sample playback of the cleanest extracted one-shot" fallback.
   - **User-loaded at runtime, none in the repo.** Rules in stems as audio tracks, A/B against the reference, and sample devices fed from extracted one-shots. The repo stays file-free. Needs C2 read as "no *network* fetch", with local file input allowed.
   - **Audio in the repo.** Rules in bundled IRs (per-item CC licences must be tracked: OpenAIR, EchoThief) and test fixtures. It also makes the repo heavier.
4. **Hosting, headers and runtime network** (C2, C3).
   - **Keep `python3 -m http.server` and C2.**
     - Rules in: AudioWorklet (localhost counts as a secure context — recalled, not verified); vendored WAM plugins (the WAM SDK works without SharedArrayBuffer); Faust/Cmajor precompiled devices.
     - Rules out: SharedArrayBuffer, so no demucs-web threaded path and no threaded JUCE/Surge-style ports. Also any CDN or plugin-by-URL loading.
   - **Add a small dev server that sends COOP/COEP.** Rules in SharedArrayBuffer-based tools. Every cross-origin resource then needs CORS/CORP. Static hosts that cannot set headers would need a workaround (recalled, not verified).
   - **Relax C2.** Rules in CDN libraries, remote WAMs and model downloads. Brings a trust question: a WAM is arbitrary code running in the page's origin.
5. **Bring "saving or loading songs" and "plug-in formats" into scope.** The PRD lists both as out of scope, but D2 and D3 need a stored, reloadable recreated track.
   - **Yes.** Rules in a song JSON (DAWproject-shaped, my round 1) and MIDI import and export. Optionally WAM hosting.
   - **No.** D2 and D3 stay blocked: a recreated track could only live as hand-edited `song.js`.
   - MIDI *input* (Web MIDI) is separate and optional. It does not work in Safari (BCD, round 1).
6. **AudioWorklet devices.**
   - **Native nodes only.** Keeps `selfcheck.js` simple. Rules out the lookahead or true-peak limiter, the keyed compressor, the Dattorro reverb, ADAA saturation, the Open303 port, the metering device and Faust/Cmajor devices.
   - **Allow worklets.** Each module is a separate `.js` file (or a Blob URL built from a string, which keeps C2; recalled, not verified). Each needs a `selfcheck.js` stub (repo CLAUDE.md rule) and an `addModule` call in `Sequencer.render` for exports.
   - **My recommendation:** allow them. More than half of the "reimplement" and "port" rows in section 3 depend on it.

## Sources

Read this round:
- https://webaudio.github.io/web-audio-api/ (via Context7: BiquadFilterNode Q in dB and 12 dB/oct; DelayNode clamp in cycles; DynamicsCompressorNode internal graph, fixed look-ahead, no side-chaining)
- https://github.com/mdn/content/blob/main/files/en-us/web/api/audioworkletnode/audioworkletnode/index.md (via Context7)
- https://github.com/mdn/content/blob/main/files/en-us/web/api/audioworkletprocessor/audioworkletprocessor/index.md (via Context7)
- https://github.com/webaudiomodules/webdx7 (fetched)

Carried over from my round 1 and cited above:
- https://github.com/cmajor-lang/cmajor/blob/main/LICENSE.md
- https://registry.npmjs.org/@grame%2Ffaustwasm
- https://registry.npmjs.org/essentia.js
- https://registry.npmjs.org/@spotify%2Fbasic-pitch
- https://registry.npmjs.org/@webaudiomodules/sdk/-/sdk-0.0.12.tgz
- https://registry.npmjs.org/@mdn%2Fbrowser-compat-data
- https://github.com/grame-cncm/faustwasm
- https://github.com/surge-synthesizer/surge/pull/8597

Local files read: the eleven round-1 transcripts in `transcripts/`, `/home/user/havantechno/prd.md`, `/home/user/havantechno/future.md`, and the repo root listing (no LICENSE or COPYING file).

All other facts in sections 2 and 3 are taken from the named agents' round-1 files at the grade they gave. Their URLs are in those files' Sources sections.
