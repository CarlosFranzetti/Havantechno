# O2: The DAW and its possibilities — round 1
Agent model: Opus. Date: 2026-10-23.

## Scope

The platform, not the gear: whether a browser DAW can host third-party devices, how MIDI and parameter data get in and out, what Web Audio can and cannot do on a site with no build step, what other DAWs already ship for stems and remixing, and how each device can get its own panel. Everything is measured against the code in `studio/` (the BRIEF's path. During this round CLAUDE.md was changed to point at a copy in `olde Havantechno dub studio/`. I read `studio/`) (read for this report: `sequencer.js`, `processors.js`, `studio.js`, `core.js` `defineParams`, the top of `song.js`) and the design spec.

**How this was researched, and its limits (read this first).**
- I made 12 WebSearch calls. After that the search budget shared by the team (200 calls per turn) was used up, and every later search was refused. I did not work around this.
- From this container, WebFetch reaches github.com only. webaudiomodules.com, cmajor.dev, faustdoc.grame.fr, rnbo.cycling74.com, emscripten.org, dl.acm.org and researchgate.net all failed DNS. Facts about those sites come from the **search-result summaries** I received, and I mark them `(verified, search summary: <url>)`. Pages I opened myself are marked `(verified: <url>)`.
- Three other sources were reachable, and I used them heavily:
  - **npm registry metadata.** I fetched `https://registry.npmjs.org/<package>` for licences, latest versions and publish dates, and downloaded tarballs of `@webaudiomodules/api` and `@webaudiomodules/sdk` to read their code. These are marked `(verified, npm registry: <url>)`. The registry URLs are API addresses I built from package names. Every one returned 200 with the package's own metadata, so none is a guessed link, but the coordinator should know they were built rather than copied from a search result.
  - **MDN browser-compat-data.** I downloaded `@mdn/browser-compat-data` 8.1.7 (CC0-1.0, published 2026-10-22) from the npm registry and queried it for browser support. Version numbers below marked "(BCD)" come from it. They show the first browser version with support, as BCD records it.
  - **Context7 MCP** for MDN content (mdn/content on GitHub), the Web Audio spec, the Ableton Live 12 manual, the Cmajor docs, the Faust docs and the DAWproject reference. Each snippet came with its source URL, and those URLs are cited.
- Topic 4 (other DAWs) is the weakest section. Apart from Ableton and DAWproject, my notes on desktop DAW stem features and browser DAWs are recalled, not verified. They are listed under "Recalled, not verified".

## What the reference track needs from the platform

From the design spec's findings table, read for platform needs rather than sound:
- **Tempo-locked event data.** 126.0 BPM, straight 4/4, first downbeat at 0.58 s. Every element sits on a 16th grid (kick 4-on-the-floor, bass on steps 3/7/10/14, stabs on 2/6/7/10/14/15, hats off-beat with 16th pickups). A recreated track can be stored as notes on a beat grid, plus an audio offset of 0.58 s for aligning with the source stems.
- **Pitched material.** B1 sub, B2 mid bass, chord stabs (the chords chosen were Bmaj9, G#m7 and Emaj7, at lower confidence), and an 8-bar lead on F#4 G#4 C#5 D#5. Per-note data is needed: key, velocity and length. Chords cannot stay as names (`'Bmaj9'`) once they come from transcription.
- **Parameter movement over time.** The arrangement already uses section `set` and `ramp` (for example filter cutoffs in the build). A transcription pipeline will deliver curves, not section-level constants.
- **Analysis in the loop.** The spec's tuning was done by rendering offline and comparing band energies with the reference (20–300 Hz within about 1 dB; 300 Hz–1 kHz still several dB hot). The platform must keep offline rendering and add a way to load the reference audio and its stems for side-by-side analysis.
- **Mono low end and wide stabs** (L/R correlation 0.41). Each device's panel should show stereo width and low-end mono state, not just a gain number.

## 1. Plugin hosting in a browser

### Findings

| Name | Vendor / maintainer | Licence | Formats | Relevance to Havantechno | Verified source |
|---|---|---|---|---|---|
| Web Audio Modules 2.0 (WAM2) API | WebAudioModules Working Group | MIT (npm `license` field) | Web (ES module + AudioWorklet) | The only browser plugin standard found. Its plugin interface maps almost one to one onto Havantechno's device contract (see below). | (verified: https://github.com/webaudiomodules/api); (verified, npm registry: https://registry.npmjs.org/@webaudiomodules%2Fapi), latest 2.0.0-alpha.6, published 2023-03-06 |
| WAM2 SDK | WebAudioModules Working Group | MIT | Web | Host and plugin helpers: `initializeWamHost`, `initializeWamEnv`, `initializeWamGroup`, `addFunctionModule`, `WebAudioModule`, `WamNode`, ring buffers. | (verified: https://github.com/webaudiomodules/sdk); (verified, npm registry: https://registry.npmjs.org/@webaudiomodules%2Fsdk), 0.0.12, 2024-07-26 |
| wam-community | boourns (collection) | No licence field on npm; the repo page shows none | Web (prebuilt WAMs) | A prebuilt plugin collection with a JSON index. Its `plugins.json` files list 58 entries (details below). | (verified: https://github.com/boourns/wam-community); (verified: https://github.com/boourns/wam-community/blob/main/plugins/burns-audio/plugins.json); (verified: https://github.com/boourns/wam-community/blob/main/plugins/wimmics/plugins.json) |
| Faust → WAM2 (`wam2-ts`, `wam2-poly-ts`, `wam2-fft-ts`) and faustwasm | GRAME | `@grame/faustwasm` is LGPL-3.0 (npm field) | Web: AudioWorklet node, WAM2 plugin, PWA | The quickest route from DSP code to a browser device. Can be compiled at runtime in the page or exported ahead of time. | (verified, Context7: https://github.com/grame-cncm/faustdoc/blob/master/docs/manual/deploying/index.html); (verified: https://github.com/grame-cncm/faustwasm); (verified, npm registry: https://registry.npmjs.org/@grame%2Ffaustwasm), 0.19.0, 2026-10-01 |
| Cmajor `--target=webaudio` / `webaudio-html` | Cmajor Software Ltd | Dual GPLv3-or-later / commercial. "that generated C++ is yours to use however you wish" | Web (JS + WASM + Web MIDI helpers), plus CLAP and JUCE targets | A second DSP-language route. The docs say the WebAssembly output runs at "approximately half the speed of the native JIT engine". | (verified: https://github.com/cmajor-lang/cmajor/blob/main/LICENSE.md); (verified, Context7: https://cmajor.dev/docs/PatchFormat); (verified, search summary: https://cmajor.dev/docs/Examples) |
| Elementary Audio (`@elemaudio/core`, `web-renderer`, `offline-renderer`) | Elementary Audio | MIT | Web, Node (offline), C++ engine | A declarative JS DSP graph. Its offline renderer could run analysis or rendering in Node. Latest npm publishes are from December 2024. | (verified: https://github.com/elemaudio/elementary); (verified, npm registry: https://registry.npmjs.org/@elemaudio%2Fweb-renderer), 4.0.3, 2024-12-21 |
| RNBO web export + `@rnbo/js` | Cycling '74 | `@rnbo/js` is MIT. A RNBO/Max licence for exporting was not checked. | Web (cloud-compiled WASM) | Patch in Max, export to a browser device. Not verified: whether exporting needs a paid Max licence. | (verified, search summary: https://rnbo.cycling74.com/learn/the-web-export-target); (verified, npm registry: https://registry.npmjs.org/@rnbo%2Fjs), 1.4.5, 2026-07-07 |
| iPlug2 (WAM target) | iPlug2 project | "liberal zlib-like" licence | VST2, VST3, AUv2/v3, AAX, WAM | One C++ codebase for desktop and web. The fork page I read does not say which WAM version it targets. A forum user reported that a headless (no GUI) WAM build needed manual hacking. | (verified: https://github.com/kant/iPlug2, a fork marked [PRE-RELEASE]); (verified, search summary: https://iplug2.discourse.group/t/headless-wam-web-audio-module/280); (verified, search summary: https://pure.hud.ac.uk/en/publications/iplug-2-desktop-plug-in-framework-meets-web-audio-modules/) |
| JUCE → WebAssembly (community forks only) | anthem-audio fork; older jariseon fork | JUCE is AGPLv3 / commercial ("JUCE 9 End User Licence Agreement") | Web (experimental) | No official JUCE web target was found. The anthem fork supports only stereo output (no audio input, no MIDI), and needs pthreads, Wasm Workers and cross-origin isolation headers. | (verified: https://github.com/anthem-audio/juce-with-wasm-subset); (verified: https://github.com/juce-framework/JUCE/blob/master/LICENSE.md); (verified: https://github.com/juce-framework/JUCE/tree/master), whose README lists "VST, VST3, AU, AUv3, AAX and LV2" and no web target |
| Surge XT browser port (PR #8597) | amilajack (contributor) | Surge is GPL-3.0 | Web (JUCE + Wasm AudioWorklet) | Shows a real open-source synth can be ported, and how much work it takes. The PR was closed unmerged on 2026-09-29. A maintainer wrote "there's zero chance of this being merged in this form". | (verified: https://github.com/surge-synthesizer/surge/pull/8597); (verified: https://github.com/surge-synthesizer/surge) |
| WCLAP (CLAP compiled to WebAssembly) | signalsmith-clap-cpp (Geraint Luff) | Repo BSL-1.0; CLAP itself MIT | `.wclap.tar.gz` bundle holding `module.wasm`; a demo browser host exists | The one path I found by which a *CLAP* plugin runs in a browser: recompile from source with wasi-sdk or Emscripten, with a webview UI. It is early. The README names no production host. | (verified: https://github.com/geraintluff/signalsmith-clap-cpp); (verified: https://github.com/free-audio/clap), which lists the project as having "WebAssembly (WCLAP) build instructions" |
| VST3 SDK | Steinberg | **MIT** from SDK 3.8. "Licensing under GPLv3 and the Steinberg proprietary license is no longer available." The trademark and logo rules still apply when you use the VST name or logo. | Native only (the page does not mention WebAssembly) | Licensing no longer blocks reading VST3 source. A compiled VST3 binary still cannot run in a browser. | (verified: https://github.com/steinbergmedia/vst3sdk); (verified: https://github.com/juce-framework/JUCE/blob/master/JUCE.spdx.json), which lists VST3 SDK 3.8.0 as MIT |
| CLAP | free-audio | MIT | Native, plus WCLAP as above | `gui` extension, draft `webview` extension, `params` and `param-indication`. These are useful patterns for Havantechno's own device contract. | (verified: https://github.com/free-audio/clap) |

**The WAM2 plugin list as published.** The wam-community `plugins.json` files list 25 burns-audio entries and 33 wimmics entries, 58 in all.
- Instruments: `synth101`, `modal`, `soundfont`, `drumsampler`, `audio_track`.
- Burns-audio effects: `distortion`, `reverb`, `delay`, `simpleEQ`.
- MIDI tools: `pianoroll`, `functionseq`, `stepmod`, `randomizer`, `envmod`, and hardware editors for microKORG, JX-3P and OB-6.
- Wimmics: guitar effects (BigMuff, TS9_Overdrive, GuitarAmpSim60s and others), reverbs (greyhole, kbverb, OwlShimmer), delays (pingpongdelay, SmoothDelay), modulation (stonephaser, ThruZeroFlanger, StereoEnhancer), and visualisers.
(verified: the two plugins.json URLs above)

The GitHub topic page also shows WAM-tagged browser synths: jariseon/webdx7, webOBXD and yoshimi (verified: https://github.com/topics/audio-worklet).

**My read.** For an electro track this is thin. There is no 909/808-style drum synth, no polysynth built for stabs, and no mastering limiter in the list. The value of WAM for Havantechno is as a *contract*, not as a catalogue.

A 2024 seminar listing claims "over 40 WAM2 plugins" (verified, search summary: https://kth.se/navet/calendar/seminars-and-worksho/web-audio-modules-including-3d-vr-extensions-1.1340375). A 2023 AES paper reports new WAM hosts, "including two DAWs" (verified, search summary: https://aes2.org/publications/elibrary-page/?id=23110). The ACM WAM 2.0 paper says the SDK, API and repositories are MIT, version 2.0 dates from 2021, and hosts can schedule parameter changes and MIDI from either thread (verified, search summary: https://dl.acm.org/doi/fullHtml/10.1145/3487553.3524225).

### Can VST3, AU or CLAP plugins run in a browser at all?

- **Compiled binaries: no.** A browser runs JS and WebAssembly in a sandbox. A `.vst3`, `.component` or `.clap` file is a native dynamic library for one OS and CPU. I found no project that loads such binaries in a page. The routes that exist all **recompile from source**:
  - WCLAP: CLAP source built to wasm.
  - iPlug2's WAM target.
  - JUCE community forks.
  - Faust, Cmajor and RNBO exports.
  So a commercial closed-source plugin (most of what H1–H5 and S1–S4 will list) can be *used as a reference* or *reimplemented*, but not *hosted*.
- **Licences are no longer the blocker.**
  - VST3 SDK: MIT (verified above).
  - CLAP: MIT (verified above).
  - JUCE: AGPLv3 or commercial. A JUCE-based port shipped from a public site would have to be AGPL-compatible or commercially licensed.
  - Faust: the faustwasm library is LGPL-3.0.
  - Cmajor: GPLv3 or commercial, but the generated code belongs to the user.
  - Surge-style GPL-3.0 code can be ported but makes the derived device GPL. The Surge PR itself lists "Licensing and corresponding-source distribution" as an unfinished item.

### Mapping Havantechno's device contract to WAM2

I read this from `@webaudiomodules/api` `src/types.d.ts` in the 2.0.0-alpha.6 tarball (verified, npm registry: https://registry.npmjs.org/@webaudiomodules/api/-/api-2.0.0-alpha.6.tgz).

| Havantechno today | WAM2 equivalent |
|---|---|
| `Synths.create(ctx, type, opts)` (synchronous) | `await WAM.createInstance(groupId, audioCtx, initialState)` (asynchronous, after `initializeWamHost`) |
| `inst.out` (AudioNode) | `wam.audioNode` (a `WamNode`, which extends `AudioNode`) |
| `inst.trigger(t, {midi, vel, dur})` | `audioNode.scheduleEvents({type:'wam-midi', time:t, data:{bytes:[0x90,midi,vel*127]}}, {type:'wam-midi', time:t+dur, data:{bytes:[0x80,midi,0]}})` |
| `set(name, v, {at})` | `scheduleEvents({type:'wam-automation', time, data:{id, value, normalized:false}})` or `setParameterValues({...})` |
| `spec[name] = {min, max, value, unit}` | `WamParameterConfiguration {label, type:'float'\|'int'\|'boolean'\|'choice', defaultValue, minValue, maxValue, discreteStep, exponent, choices, units}` |
| tempo and swing pushed to delay `bpm` | `{type:'wam-transport', data:{currentBar, currentBarStarted, tempo, timeSigNumerator, timeSigDenominator, playing}}` |
| `params` snapshot | `getState()` / `setState(state)`, where the state can be any serialisable value |
| `dispose()` | `audioNode.destroy()` |
| the slider list in `studio.js` | `await wam.createGui()` returns an `Element`. The API notes that "several GUIs may control the same WAM". (verified: https://github.com/webaudiomodules/api) |
| none | `getCompensationDelay()`: latency reporting the master chain could use |

Other event types: `wam-sysex`, `wam-mpe`, `wam-osc`, `wam-info`. MIDI data is exactly three bytes (`bytes: [number, number, number]`), so WAM carries 7-bit MIDI, not high-resolution notes. Per-note pitch has to go through `wam-mpe`.

### What it would take to host third-party devices

1. **An adapter, not a rewrite.** `seq.addTrack` already accepts a ready-made instrument: `def.inst && def.inst.trigger` (see `sequencer.js`). A `WamDevice` wrapper that exposes `{type, out, spec, params, set, get, trigger, panic, dispose}` over a WAM instance would plug in unchanged.
   - `panic` becomes an all-notes-off `wam-midi` (CC 123) or `clearEvents()`.
   - Processors need the same wrapper with `input` and `output`. Note that `makeProc` builds its own input, output and bypass gains around the effect.
2. **Asynchronous construction.** WAM instances are created with `await`, so `Song.build(seq)` and `Sequencer.render(buildFn)` need an async variant. Today `render` builds the graph synchronously on a fresh `OfflineAudioContext`. Every WAM, and its `audioWorklet.addModule(...)` calls, must be created again on that offline context: `audioWorklet` is a property of `BaseAudioContext`, so each context has its own (BCD: Chrome 66, Firefox 76, Safari 14.1).
3. **Loading from a no-build site works.** The SDK's `dist/index.js` is a single self-contained ES module of 59,920 bytes with no imports (read from the 0.0.12 tarball, verified, npm registry: https://registry.npmjs.org/@webaudiomodules/sdk/-/sdk-0.0.12.tgz). Classic scripts can load ES modules with dynamic `import()` (BCD: Chrome 63, Firefox 67, Safari 11.1). So the SDK can be vendored into `studio/vendor/` with no bundler. Plugins loaded by URL from another origin will need CORS (recalled, not verified).
4. **SharedArrayBuffer is optional for WAM.** The SDK sets `this._useSab = !!useSab && !!globalThis.SharedArrayBuffer` and otherwise uses the message port (read in the same tarball). So WAM hosting does **not** force cross-origin isolation. JUCE-style Emscripten ports with threads **do** need it (see section 3).
5. **The self-check.** `studio/selfcheck.js` has a fake AudioContext. Any WAM path needs stubs for `audioWorklet.addModule`, `AudioWorkletNode` and a fake WAM, or the hosting path must stay out of the node check (repo CLAUDE.md rule).
6. **Automation paths.** Third-party parameter ids must fit into `seq.setParam('track.param')`. Ids containing dots need escaping, or a mapping table per device.
7. **Security and trust.** A WAM is arbitrary JS and WASM running in the page's origin. Hosting plugins from unknown URLs is a code-execution decision. My view: allow-list URLs, or self-host vetted plugins only.

## 2. MIDI in and out, and storing a recreated track

### Findings

| Name | Licence | Latest version / date | What it does | Verified source |
|---|---|---|---|---|
| `@tonejs/midi` | MIT | 2.0.28, 2022-02-04 | Parses SMF into JSON and writes it back (`toArray()`). Each note has `midi`, `time`, `ticks`, `name`, `pitch`, `octave`, `velocity` (0–1) and `duration`. `controlChanges` are keyed by CC number. The header has `tempos`, `timeSignatures` and `PPQ`. Loads with a `<script>` tag from unpkg; `Midi.fromUrl`. | (verified: https://github.com/Tonejs/Midi); (verified, npm registry: https://registry.npmjs.org/@tonejs%2Fmidi) |
| `midi-file` | MIT | 1.2.4, 2023-03-15 | Low-level SMF parser and writer, event by event. | (verified, npm registry: https://registry.npmjs.org/midi-file) |
| `jzz` | MIT | 1.9.6, 2025-09-20 | "MIDI library for Node.js and web-browsers". | (verified, npm registry: https://registry.npmjs.org/jzz) |
| `midi-writer-js` | MIT | 3.2.1, 2026-03-01 | API for generating MIDI files. | (verified, npm registry: https://registry.npmjs.org/midi-writer-js) |
| `webmidi` (WEBMIDI.js) | Apache-2.0 | 3.3.1, 2026-09-15 | A wrapper over the Web MIDI API (`playNote()`, `sendControlChange()`, listeners for `"noteon"` and `"pitchbend"`). | (verified: https://github.com/djipco/webmidi); (verified, npm registry: https://registry.npmjs.org/webmidi) |
| `g200kg/webaudio-pianoroll` | Apache-2.0 | (not checked) | A `<webaudio-pianoroll>` custom element for editing notes, loaded with one `<script>`. A ready-made editor for transcribed MIDI. | (verified: https://github.com/g200kg/webaudio-pianoroll) |
| DAWproject | MIT | format 1.0 ("stable") | An open, vendor-neutral DAW exchange format: a ZIP holding `project.xml` and `metadata.xml`. It has tracks, channels, note clips with per-note expression, and automation of tempo, volume, pan, sends, plug-in and built-in device parameters. Plug-in states are embedded. Listed supporters: Bitwig Studio 5.0.9, PreSonus Studio One 6.5, Steinberg Cubase 14, Cubasis 3.7.1, VST Live 2.2, n-Track Studio v10.2.2. | (verified: https://github.com/bitwig/dawproject); (verified, Context7: https://github.com/bitwig/dawproject/blob/main/Reference.html) |

**Web MIDI API support (BCD 8.1.7).**
- `navigator.requestMIDIAccess`: Chrome 43, Edge 79, Firefox 108. In Firefox access is "gated by installation of a site permission add-on (user prompt), secure context, and Permission Policy: midi". Safari has none (`version_added: false`, WebKit bug 107250).
- MDN: the call must be made in a secure context, can be blocked by the `midi` Permissions Policy, needs user permission, and takes a `sysex` option. `MIDIOutput.send(data, timestamp)` accepts a timestamp in ms relative to `Performance.timeOrigin`. (verified, Context7: https://github.com/mdn/content/blob/main/files/en-us/web/api/navigator/requestmidiaccess/index.md; https://github.com/mdn/content/blob/main/files/en-us/web/api/web_midi_api/index.md; https://github.com/mdn/content/blob/main/files/en-us/web/api/midioutput/send/index.md)
- Consequence: MIDI *file* import and export works in every browser. Live MIDI in and out does not work in Safari.

### How DAWs represent notes and automation

- DAWproject `Note`: `time`, `duration` (on the parent timeline), `channel`, `key` (0–127), `vel` (normalised 0–1), `rel` (release velocity), and an optional child timeline for per-note expression.
- DAWproject `AutomationTarget`: either `parameter` (an id reference) or `expression` (`gain, pan, transpose, timbre, formant, pressure, channelController, channelPressure, polyPressure, pitchBend, programChange`), with `channel`, `key` and `controller`.
- DAWproject says outright that it does not store low-level MIDI events and uses higher-level abstractions instead.
(verified, Context7: https://github.com/bitwig/dawproject/blob/main/_autodocs/api-reference/clips.md and the Reference.html above)
- Standard MIDI Files hold notes, 7-bit CCs, pitch bend and tempo. They have no place for "bass.cutoff in Hz". That is my reading of the Tone/Midi field list above. The SMF byte layout itself is recalled, not verified.

### Recommendation for a stored, reloadable "recreated track"

- **Canonical project format: Havantechno JSON shaped like DAWproject.** In beats, not seconds, with tempo in a separate track:
  - `tracks[]`: `{name, device:{type, params}, inserts:[{type, params}], sends, channel:{gain, pan}}`
  - `clips[]`: `{track, start, length, notes:[{time, duration, key, vel}]}`
  - `automation[]`: `{path:'bass.cutoff', unit:'Hz', interp:'linear'|'hold'|'expo', points:[{time, value}]}`
  - The `path` is the existing `seq.setParam` dotted path, so nothing in the engine changes its address scheme.
- Keep today's pattern strings, melody tokens and section `set`/`ramp` as an **authoring shorthand** that compiles to that event list. They cannot hold transcribed micro-timing, varied velocities or curves, and the song currently derives chords from names (`progression: ['Bmaj9', ...]`).
- **Export:**
  - MIDI: run the arrangement through `scheduleAll` on a dry sequencer, capture every `trigger(tr, t, ev)` call, and write one SMF track per Havantechno track with `@tonejs/midi`.
  - Automation: write CCs only for paths a user maps. Otherwise export a sidecar JSON. A full-fidelity exchange would be a DAWproject export (MIT), which desktop DAWs can open (the list above).
- **Import:** SMF → notes per track. Stems and analysis curves → `automation[]` lanes. Assigning a SMF track to a device stays a human or heuristic step.
- **Playback of automation.** The current `ramps()` writes one value per 16th step with `setTargetAtTime` (via `auto()` with `{at}`). For recreated curves, schedule `linearRampToValueAtTime` between stored points. Web Audio does not quantise automation event times to samples (next section).

## 3. Audio capabilities and limits

Browser support figures come from @mdn/browser-compat-data 8.1.7 (verified, npm registry: https://registry.npmjs.org/@mdn%2Fbrowser-compat-data). Wording comes from MDN and the spec through Context7.

| Capability | Status | Consequence for Havantechno | Source |
|---|---|---|---|
| AudioWorklet (`BaseAudioContext.audioWorklet`, `AudioWorkletNode`) | Chrome 66, Firefox 76, Safari 14.1 (BCD). `process()` is called "synchronously from the audio rendering thread, once for each block". `currentFrame` advances by 128 per block. `audioWorklet` is not available outside secure contexts. | Custom DSP (a better compressor or limiter, oversampled saturation, a real analog-style filter) becomes possible. `http://localhost` from `python3 -m http.server` counts as a secure context (recalled, not verified). | (verified, Context7: https://github.com/mdn/content/blob/main/files/en-us/web/api/audioworkletprocessor/process/index.md; https://github.com/mdn/content/blob/main/files/en-us/web/api/audioworkletnode/index.md; https://github.com/mdn/content/blob/main/files/en-us/web/api/audioworkletglobalscope/currentframe/index.md) |
| SharedArrayBuffer and cross-origin isolation | SAB: Chrome 68, Firefox 79, Safari 15.2. COOP/COEP headers: Chrome 83, Firefox 79, Safari 15.2. COEP `credentialless`: Chrome 96, Firefox 119, not in Safari (BCD). Needs `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless`), plus the `cross-origin-isolated` Permissions-Policy; check with `crossOriginIsolated`. | Plain `python3 -m http.server` does not send these headers (recalled, not verified), so SAB is off on the documented dev server. WAM works without SAB (section 1). Threaded Emscripten ports (the JUCE fork, possibly Surge) need the headers. | (verified, Context7: https://github.com/mdn/content/blob/main/files/en-us/web/http/reference/headers/cross-origin-opener-policy/index.md; https://github.com/mdn/content/blob/main/files/en-us/web/api/workerglobalscope/crossoriginisolated/index.md; https://github.com/mdn/content/blob/main/files/en-us/web/api/window/postmessage/index.md); (verified: https://github.com/anthem-audio/juce-with-wasm-subset) |
| Emscripten Wasm Audio Worklets | "audio worklets will always run in a Wasm Worker, and not in a Pthread" | Relevant only if C++ DSP is ported. | (verified, search summary: https://emscripten.org/docs/api_reference/wasm_audio_worklets.html) |
| OfflineAudioContext | Chrome 35, Firefox 25, Safari 14.1. Renders "as fast as it can". `suspend()` is rounded to the render quantum and is **not in Firefox**. Firefox's `resume()` "always rejects with NotSupportedError" (BCD). | The current render, which schedules all steps up front and calls `startRendering()`, is the portable approach. Progressive scheduling with `suspend()` would break Firefox. Rendering 200 bars creates every voice node up front; memory cost not measured. | (verified, Context7: https://github.com/mdn/content/blob/main/files/en-us/web/api/web_audio_api/index.md; https://github.com/mdn/content/blob/main/files/en-us/web/api/offlineaudiocontext/suspend/index.md) |
| Sample-accurate scheduling | Spec: "Automation event times are not quantized with respect to the prevailing sample rate." k-rate parameters are sampled once per render quantum, a-rate per sample. The render quantum is 128 by default. The spec adds `renderSizeHint`. `BaseAudioContext.renderQuantumSize` is experimental, Chrome 153 only (BCD). | The sequencer's `setInterval` only fills the lookahead; actual times are exact `AudioContext` times. Timing is already sample-accurate for note starts and AudioParam changes. One coarse part: `sec.set`/`ramp` resolution (one point per 16th). | (verified, Context7: https://webaudio.github.io/web-audio-api/) |
| Latency | `latencyHint` (`"interactive"` default, `"balanced"`, `"playback"`, or seconds): Chrome 58, Safari 14.1, not in Firefox (BCD). `baseLatency`: Chrome 58, Firefox 70, Safari 14.1. `outputLatency`: Chrome 102, Firefox 70, Safari 18.4. | Matters for live MIDI play-in and for drawing the playhead in sync with audio (`getOutputTimestamp`: Chrome 57, Firefox 70, Safari 14.1). | (verified, Context7: https://github.com/mdn/content/blob/main/files/en-us/web/api/audiocontext/audiocontext/index.md; https://github.com/mdn/content/blob/main/files/en-us/web/api/audiocontext/outputlatency/index.md; https://github.com/mdn/content/blob/main/files/en-us/web/api/audiocontext/baselatency/index.md) |
| Decoding MP3 and other formats | `decodeAudioData`: Chrome 14, Firefox 25, Safari 6 (BCD). Decodes a whole file into memory; the formats are whatever the browser supports. WebCodecs `AudioDecoder`: Chrome 94, Firefox 130, Safari 26 (BCD). The codec-string table lists `mp3` decode at 96.5% support and no MP3 encoder. "The WebCodecs API does not deal with container formats", so a demuxer is needed. | `decodeAudioData` is enough to load the reference MP3 and the stems. WebCodecs only pays off for streaming or very long files. `mpg123-decoder` (MIT, 1.0.3, 2025-10-20) is a WASM fallback decoder. | (verified, Context7: https://github.com/mdn/content/blob/main/files/en-us/web/api/webcodecs_api/codec_selection/index.md; https://github.com/mdn/content/blob/main/files/en-us/web/api/webcodecs_api/video_processing_concepts/index.md; https://github.com/mdn/content/blob/main/files/en-us/web/api/webcodecs_api/index.md); (verified, npm registry: https://registry.npmjs.org/mpg123-decoder) |
| ScriptProcessorNode | Deprecated (BCD) | Do not use for new DSP. | BCD |
| Export formats | WAV is already done in JS (`Sequencer.wav`). WebCodecs `AudioEncoder` has no MP3 (above). `MediaRecorder`: Chrome 47, Firefox 25, Safari 14.1 (BCD). `showSaveFilePicker`: Chrome 86 only, experimental (BCD). | Keep the Blob download, which works everywhere. | BCD |
| Visualisation APIs a device panel can use | `BiquadFilterNode.getFrequencyResponse` (Chrome 17, Firefox 25, Safari 6); `DynamicsCompressorNode.reduction` (Chrome 19, Firefox 25, Safari 6); `AnalyserNode.getFloatFrequencyData` (BCD) | Real filter and EQ curves and gain-reduction meters with no extra DSP (section 5). | BCD |
| In-browser analysis libraries | `meyda` (MIT, 5.6.3, 2024-04-21); `essentia.js` (**AGPL-3.0**, 0.1.3, 2021-06-24); `@spotify/basic-pitch` (Apache-2.0, 1.0.1, 2022-08-05) | Handed to S5 and O1. Note the AGPL on essentia.js if Havantechno is ever distributed. | (verified, npm registry: https://registry.npmjs.org/meyda, https://registry.npmjs.org/essentia.js, https://registry.npmjs.org/@spotify%2Fbasic-pitch) |
| WebGPU (for ML in the page) | `navigator.gpu`: Safari 26; Chrome support depends on platform (notes in BCD); Firefox only on some platforms (BCD notes) | In-browser stem separation is platform-dependent. Handed to S5. | BCD |

**What a no-build-step site can use.** It can use:
- classic globals, as now;
- `import()` of ES modules (WAM SDK, faustwasm, Tone/Midi) from vendored files;
- AudioWorklet modules as separate `.js` files;
- `.wasm` fetched at runtime;
- custom elements and Shadow DOM (`customElements.define`: Chrome 54, Firefox 63, Safari 10.1; `attachShadow`: Chrome 53, Firefox 63, Safari 10; BCD);
- `<script type="importmap">` (Chrome 89, Firefox 108, Safari 16.4; BCD).

**What it cannot use, or only with a server change.** SharedArrayBuffer, and with it threaded WASM ports, needs a server that sends COOP and COEP: a small custom Python handler instead of `http.server`, or a service-worker shim (recalled, not verified). TypeScript, JSX or React plugin GUIs need a build unless the plugin ships them pre-built. WAM's own React example "needs extra build configuration" (verified: https://github.com/webaudiomodules/sdk).

## 4. Other DAWs' stem and remix features (state of the art)

**Verified.**
- **Ableton Live 12, stem separation.** Separates any mono or stereo file into **Vocals, Drums, Bass, Others** with a local deep-learning model that needs no internet. Offers "High Speed" and "High Quality" modes. High Quality uses dedicated passes per stem; selecting "Others" means all stems are processed. (verified, Context7: https://www.ableton.com/en/live-manual/12/stem-separation)
- **Ableton Live 12, audio-to-MIDI.** Convert Harmony (polyphonic, onto a piano Instrument Rack), Convert Melody (monophonic, onto a synth with a "Synth to Piano" macro), and Convert Drums (kick, snare and hi-hat onto a Drum Rack, using adjustable transient markers). (verified, Context7: https://www.ableton.com/en/live-manual/12/converting-audio-to-midi)
- **DAWproject import and export** is in Bitwig Studio 5.0.9, Studio One 6.5, Cubase 14, Cubasis 3.7.1, VST Live 2.2 and n-Track Studio 10.2.2 (verified: https://github.com/bitwig/dawproject). This is the interchange route if a Havantechno project is to be opened in a desktop DAW.
- **FL Studio.** I queried the FL Studio online manual through Context7 for stem separation and got only Edison and Slicex pages. **Not found** in that source. (The Context7 index of that manual is small, so this is not evidence of absence.)

**Browser DAWs (verified).**
- **wam-openstudio**: a multitrack WAM DAW with C++/Emscripten processing and plugin automation in the audio thread. MIT. Demo at https://wam-openstudio.dylann.fr/ (not visited). The repo page does not mention MIDI import, recording or export. (verified: https://github.com/TER-M1/wam-openstudio)
- **WAM-studio**: an "open source, online Digital Audio Workstation" built on Web Audio, WebAssembly and Web MIDI (verified, search summary: https://dl.acm.org/doi/fullHtml/10.1145/3543873.3587987).
- **sequencer.party**: its author open-sourced a set of WAM plugins (verified, search summary: https://dl.acm.org/doi/fullHtml/10.1145/3487553.3524225).
- **wam-examples**: includes "a very simple host built with parceljs" that loads plugins by URL (verified: https://github.com/webaudiomodules/wam-examples).

**How Havantechno compares.** Four-stem separation and note-only audio-to-MIDI are now stock features in a mainstream DAW (Ableton above). Ableton's conversions put notes onto *generic* instruments (piano, synth, Drum Rack). None of the verified sources describes a DAW that recovers **synth patches, effect settings or automation curves** from audio. That is exactly stage 3 of the owner's pipeline, and it is where Havantechno would be new. It is also the least proven part (O1's topic).

## 5. Per-device UI

**How DAWs and plugin standards do it (verified).**
- **Ableton Device View.**
  - Shows the chain of devices on a track. Each has a title bar (on/off, presets, context menu) and optional expanded views "such as modulation matrices or frequency displays".
  - Plug-ins get a generic "Live panel". "If a plug-in has more than 64 parameters, the panel is initially empty and must be configured manually."
  - The plug-in's own interface can open in a separate window that stays in sync.
  - Racks expose Macro Controls.
  (verified, Context7: https://www.ableton.com/en/live-manual/12/working-with-instruments-and-effects; https://www.ableton.com/en/live-manual/12/using-push-2)
  The pattern is two tiers: a uniform host-drawn panel for every device, plus an optional bespoke face. It is a good model for Havantechno.
- **WAM2**: `createGui()` returns an `Element`, and several GUIs may control one WAM (verified: https://github.com/webaudiomodules/api). The SDK GUI convention is `gui.js` exporting `createElement(plugin)` that returns an `HTMLElement` (verified: https://github.com/webaudiomodules/sdk).
- **Faust**: `webaudiowasm` and `pwa` targets export a node "with a prebuilt GUI" (verified, Context7: faustdoc deploying page above). That GUI is generic, generated from the DSP's UI declarations.
- **CLAP**: a `gui` extension plus a draft `webview` extension (verified: https://github.com/free-audio/clap). signalsmith-clap-cpp uses webview UIs because "platform-native UI pointers can't be used from inside the WASM sandbox" (verified: https://github.com/geraintluff/signalsmith-clap-cpp). Plugin UIs are converging on HTML, which is what Havantechno already uses.
- **UI kits.**
  - `nexusui`: MIT, 2.1.6, last published 2020-08-29, so likely unmaintained (verified, npm registry: https://registry.npmjs.org/nexusui).
  - `webaudio-pianoroll`: Apache-2.0, a custom element (verified above).
  - `webaudio-controls` (g200kg knobs): the npm name `webaudio-controls` returned "Not found". Recalled only.

**Practical options for Havantechno** (no build step, no image files):

| Option | What it is | Cost | Gives each device its own look? |
|---|---|---|---|
| A. Richer spec metadata | Extend each spec entry from `{min, max, value, unit}` with `{ui:'knob'\|'fader'\|'switch'\|'select', group:'env', label, curve:'log'}` plus a per-device `layout` and accent colour. A generic renderer draws grouped SVG knobs. | Low. `defineParams` ignores unknown keys, so the engine is untouched. | Partly: each device gets its own grouping and colour. The renderer is the same. |
| B. Face modules per device type | `Faces.register('kick', function (el, dev) {...})`, each drawing its own panel with a live visual: a kick pitch-envelope curve plotted from `tune`/`punch`/`sweep`, a filter or EQ curve from `getFrequencyResponse`, a compressor or limiter gain-reduction meter from `DynamicsCompressorNode.reduction`, the reverb impulse response drawn from the generated buffer, delay taps on a beat grid, a widener shown as a mid/side meter. Falls back to option A when no face exists. | Medium: one face per device type (13 synths, 10 processors). | Yes. This is the Ableton two-tier model. |
| C. Custom elements with Shadow DOM | Wrap each face as `<ht-device type="kick">` so per-device CSS cannot leak between devices. Supported in all target browsers (BCD above). | Low on top of B. | Yes, and themable per device. |
| D. WAM-compatible face contract | Make a face a function `(device) → Promise<Element>`, the same shape as WAM `createGui()`. Native devices and hosted WAMs then mount the same way in the device rack, and a third-party WAM brings its own GUI. | Low if decided now. | Yes, including third-party devices. |

My recommendation is A+B+C with D's signature: one source of truth (the spec), one address scheme (dotted paths), and bespoke faces only where a visual helps sound matching, starting with kick, bass filter, sidechain, compressor and limiter, and EQ. `studio.js` already builds strips from `tr.inst.spec`. The change is to replace `paramSliders(...)` with `Faces.mount(el, device)`.

## 6. Open questions for the category agents (round 2)

Numbered. The three I most want answered are marked ★.

1. ★ **H1, H2, H3, H4, H5, S1, S2, S3, S4**: For each device you recommend, is the **source** available, and under which licence (GPL, MIT or other open source, Faust or Cmajor code, a published DSP paper), or is it a **closed binary**? Only source-available DSP can become a WAM, AudioWorklet or WCLAP. For closed devices, name the 3–6 parameters that define its character, so that a Havantechno reimplementation can copy their behaviour.
2. ★ **S5 (with O1)**: For each separation and transcription tool, what exactly does it **output**: notes only, or also velocities, pitch bend, CC, onset strengths, chord labels? In what format (SMF, JSON, CSV)? Which of them run **in a browser** (ONNX/WebGPU/WASM, with model size) and which need a server or desktop?
3. ★ **S1, S2, S3, S4**: Which effect parameters in the Guidance reference **move over time** (filter cutoff in the build, sidechain depth, reverb or delay sends in the break, master high-pass in the intro)? At what time resolution (per bar, per 16th, continuous)? This decides whether section `set`/`ramp` is enough or per-point automation lanes are needed.
4. **H5**: Of the browser synth engines you found, which are WAM2 plugins, which are plain AudioWorklet or Web Audio code, and what are their licences? Do any cover a polysynth stab or a lead, which the 58 wam-community entries lack?
5. **H1, H4**: Is there any open-source 808, 909 or other analog-drum model (code or circuit description) that would make a better Havantechno kick, clap or hat? Licence?
6. **S1**: Which compressor and limiter designs need lookahead or oversampling? Those need AudioWorklet, because `DynamicsCompressorNode` has a fixed, unspecified knee and timing behaviour (recalled).
7. **S3**: Which saturation models need oversampling beyond `WaveShaperNode.oversample = '4x'`? Is there an open-source analog filter model (for example a ladder filter) in Faust or C++?
8. **S2**: Is there an open-source algorithmic reverb (FDN or Dattorro style) in Faust or JS that could replace the generated-noise impulse response? Greyhole and kbverb appear in wam-community; what is their provenance?
9. **S4**: For the 0.41 L/R correlation of the stabs, which widener or chorus designs are mono-compatible below about 150 Hz? Does any expose a correlation meter we could copy for the device face?
10. **S5**: Does any transcription tool output **tempo maps and downbeats** (the reference starts at 0.58 s), so that imported MIDI lands on Havantechno's bar grid without manual offsetting?
11. **O1**: For "create a new synth or processor when nothing fits", which parameter-estimation methods (differentiable DSP, black-box optimisation against renders) are proven, and do they assume a specific synth architecture?
12. **All**: Flag every tool whose licence is AGPL or GPL (as found for essentia.js and JUCE), because bundling it in a web page counts as distribution.

## Recalled, not verified

These are from memory. I could not search after the budget ran out, so treat each as a lead to check.
- FL Studio added built-in stem separation (around version 21.2). Logic Pro has a "Stem Splitter". Serato DJ has "Serato Stems". Algoriddim djay has "Neural Mix". rekordbox and Traktor have added stem features. Studio One added stem separation. Melodyne does polyphonic audio-to-MIDI.
- Browser DAWs that exist today: BandLab, Soundtrap, Audiotool, Amped Studio, openDAW (an open-source browser DAW by André Michelle), and Ableton's "Learning Music" pages. As far as I recall, none hosts VST/AU plugins. I believe some import MIDI files, but I have no source for which.
- `python3 -m http.server` sends no COOP or COEP headers. GitHub Pages cannot set custom headers. A service-worker shim (`coi-serviceworker`) is a known workaround for cross-origin isolation on static hosts.
- `http://localhost` and `http://127.0.0.1` count as secure contexts, so AudioWorklet and Web MIDI work on the documented dev server.
- WAM plugins loaded from another origin need CORS headers on that server.
- `DynamicsCompressorNode` has no lookahead control and its detector behaviour differs between browsers.
- The Faust compiler is GPL, but code it generates may be licensed freely (architecture-file exception).
- RNBO export requires a Max licence with RNBO.
- `webaudio-controls` by g200kg is a set of knob, slider and switch custom elements that support image strips.
- WebAudio-based DAWs commonly store projects as JSON. The Standard MIDI File format has types 0/1/2 and PPQ timing.
- The iPlug2 page names virtualcz.io as a WAM built with iPlug 2. This came from a search summary whose exact source page I could not identify, so it is not used above.

## Handoffs to other agents

- **S5**: browser-capable separation and transcription (basic-pitch JS is Apache-2.0, last release 2022; essentia.js is AGPL-3.0). WebGPU support depends on platform.
- **O1**: automated parameter recovery (stage 3), which no verified DAW does.
- **H5**: WAM-tagged synths (webdx7, webOBXD, yoshimi by jariseon; synth101 and modal in burns-audio) as candidates in their browser-synth survey.
- **S2**: wam-community reverbs (greyhole, kbverb, OwlShimmer) and delays (pingpongdelay, SmoothDelay).

## Sources

Fetched pages (GitHub):
- https://github.com/webaudiomodules/api
- https://github.com/webaudiomodules/sdk
- https://github.com/webaudiomodules/wam-examples
- https://github.com/boourns/wam-community
- https://github.com/boourns/wam-community/tree/main/plugins
- https://github.com/boourns/wam-community/tree/main/plugins/wimmics
- https://github.com/boourns/wam-community/tree/main/plugins/burns-audio
- https://github.com/boourns/wam-community/blob/main/plugins/burns-audio/plugins.json
- https://github.com/boourns/wam-community/blob/main/plugins/wimmics/plugins.json
- https://github.com/topics/audio-worklet
- https://github.com/TER-M1/wam-openstudio
- https://github.com/grame-cncm/faustwasm
- https://github.com/cmajor-lang/cmajor
- https://github.com/cmajor-lang/cmajor/blob/main/LICENSE.md
- https://github.com/elemaudio/elementary
- https://github.com/kant/iPlug2
- https://github.com/anthem-audio/juce-with-wasm-subset
- https://github.com/anthem-audio/juce-with-wasm-subset/blob/master/LICENSE.md
- https://github.com/juce-framework/JUCE/tree/master
- https://github.com/juce-framework/JUCE/blob/master/LICENSE.md
- https://github.com/juce-framework/JUCE/blob/master/JUCE.spdx.json
- https://github.com/steinbergmedia/vst3sdk
- https://github.com/free-audio/clap
- https://github.com/geraintluff/signalsmith-clap-cpp
- https://github.com/surge-synthesizer/surge
- https://github.com/surge-synthesizer/surge/pull/8597
- https://github.com/Tonejs/Midi
- https://github.com/djipco/webmidi
- https://github.com/g200kg/webaudio-pianoroll
- https://github.com/bitwig/dawproject

npm registry metadata and tarballs (fetched; API URLs built from package names, each returned the package's metadata):
- https://registry.npmjs.org/@webaudiomodules%2Fapi
- https://registry.npmjs.org/@webaudiomodules/api/-/api-2.0.0-alpha.6.tgz
- https://registry.npmjs.org/@webaudiomodules%2Fsdk
- https://registry.npmjs.org/@webaudiomodules/sdk/-/sdk-0.0.12.tgz
- https://registry.npmjs.org/@webaudiomodules%2Fsdk-parammgr
- https://registry.npmjs.org/wam-community
- https://registry.npmjs.org/@grame%2Ffaustwasm
- https://registry.npmjs.org/@grame%2Ffaust-web-component
- https://registry.npmjs.org/@elemaudio%2Fcore
- https://registry.npmjs.org/@elemaudio%2Fweb-renderer
- https://registry.npmjs.org/@elemaudio%2Foffline-renderer
- https://registry.npmjs.org/@rnbo%2Fjs
- https://registry.npmjs.org/@tonejs%2Fmidi
- https://registry.npmjs.org/midi-file
- https://registry.npmjs.org/jzz
- https://registry.npmjs.org/midi-writer-js
- https://registry.npmjs.org/webmidi
- https://registry.npmjs.org/tone
- https://registry.npmjs.org/meyda
- https://registry.npmjs.org/essentia.js
- https://registry.npmjs.org/@spotify%2Fbasic-pitch
- https://registry.npmjs.org/mpg123-decoder
- https://registry.npmjs.org/nexusui
- https://registry.npmjs.org/@mdn%2Fbrowser-compat-data
- https://registry.npmjs.org/@mdn/browser-compat-data/-/browser-compat-data-8.1.7.tgz

Context7 snippets (each snippet's source URL):
- https://github.com/mdn/content/blob/main/files/en-us/web/security/practical_implementation_guides/corp/index.md
- https://github.com/mdn/content/blob/main/files/en-us/web/http/reference/headers/cross-origin-opener-policy/index.md
- https://github.com/mdn/content/blob/main/files/en-us/web/api/workerglobalscope/crossoriginisolated/index.md
- https://github.com/mdn/content/blob/main/files/en-us/web/api/window/postmessage/index.md
- https://github.com/mdn/content/blob/main/files/en-us/web/api/audioworkletprocessor/process/index.md
- https://github.com/mdn/content/blob/main/files/en-us/web/api/audioworkletglobalscope/currentframe/index.md
- https://github.com/mdn/content/blob/main/files/en-us/web/api/audioworkletnode/index.md
- https://github.com/mdn/content/blob/main/files/en-us/web/api/audiodecoder/configure/index.md
- https://github.com/mdn/content/blob/main/files/en-us/web/api/webcodecs_api/codec_selection/index.md
- https://github.com/mdn/content/blob/main/files/en-us/web/api/webcodecs_api/index.md
- https://github.com/mdn/content/blob/main/files/en-us/web/api/webcodecs_api/video_processing_concepts/index.md
- https://github.com/mdn/content/blob/main/files/en-us/web/api/audiocontext/audiocontext/index.md
- https://github.com/mdn/content/blob/main/files/en-us/web/api/audiocontext/baselatency/index.md
- https://github.com/mdn/content/blob/main/files/en-us/web/api/audiocontext/outputlatency/index.md
- https://github.com/mdn/content/blob/main/files/en-us/web/api/offlineaudiocontext/suspend/index.md
- https://github.com/mdn/content/blob/main/files/en-us/web/api/web_audio_api/index.md
- https://github.com/mdn/content/blob/main/files/en-us/web/api/navigator/requestmidiaccess/index.md
- https://github.com/mdn/content/blob/main/files/en-us/web/api/web_midi_api/index.md
- https://github.com/mdn/content/blob/main/files/en-us/web/api/midioutput/send/index.md
- https://webaudio.github.io/web-audio-api/
- https://cmajor.dev/docs/PatchFormat
- https://cmajor.dev/docs/Examples
- https://github.com/grame-cncm/faustdoc/blob/master/docs/manual/deploying/index.html
- https://www.ableton.com/en/live-manual/12/stem-separation
- https://www.ableton.com/en/live-manual/12/converting-audio-to-midi
- https://www.ableton.com/en/live-manual/12/working-with-instruments-and-effects
- https://www.ableton.com/en/live-manual/12/using-push-2
- https://github.com/bitwig/dawproject/blob/main/Reference.html
- https://github.com/bitwig/dawproject/blob/main/_autodocs/api-reference/clips.md

Search-result pages (used through the search summary only; not opened):
- https://kth.se/navet/calendar/seminars-and-worksho/web-audio-modules-including-3d-vr-extensions-1.1340375
- https://aes2.org/publications/elibrary-page/?id=23110
- https://dl.acm.org/doi/fullHtml/10.1145/3487553.3524225
- https://dl.acm.org/doi/fullHtml/10.1145/3543873.3587987
- https://www.webaudiomodules.com/docs/intro/
- https://www.npmjs.com/package/@webaudiomodules/api
- https://faustdoc.grame.fr/manual/deploying
- https://rnbo.cycling74.com/learn/the-web-export-target
- https://elementary.audio/docs/packages/web-renderer
- https://emscripten.org/docs/api_reference/wasm_audio_worklets.html
- https://forum.juce.com/t/juce-plugins-in-webassembly/25255
- https://forum.juce.com/t/tracking-juce-for-wasm/57356
- https://pure.hud.ac.uk/en/publications/iplug-2-desktop-plug-in-framework-meets-web-audio-modules/
- https://iplug2.discourse.group/t/headless-wam-web-audio-module/280

Linked from fetched pages, not visited: https://wam-openstudio.dylann.fr/, https://clapdb.tech, https://www.webaudiomodules.com/community/plugins.json (DNS failed), https://signalsmith-audio.github.io/wasm-clap-browserhost/
