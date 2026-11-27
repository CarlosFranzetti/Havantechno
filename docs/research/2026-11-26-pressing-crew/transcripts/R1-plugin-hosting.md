# R1: hosting VST and AU plug-ins in an Electron and Web Audio DAW

Researcher R1, Pressing Crew, 26 November 2026 (ET). For the version after next (the owner's words: "loading vst/au for instruments as well as for processing fx").

## Method and tags

- READ: I fetched the file or page and it says so. Almost all READs are raw.githubusercontent.com files (README, LICENSE) fetched with curl. URLs are given as `raw/<owner>/<repo>/<branch>/<file>`, meaning `https://raw.githubusercontent.com/...`.
- SNIPPET: a WebSearch result summary only; I did not open the page.
- MEMORY: my recollection, unverified. Every design claim about timing or threading that I did not measure is MEMORY or "design, unmeasured".
- Budget: 0 Firecrawl calls (tools were not needed), 4 WebSearch calls, about 45 raw file fetches. `steinbergmedia.github.io` failed DNS resolution in this session (WebFetch error), and the GitHub API via `gh` was refused (repo access not enabled), so I read no Steinberg portal page and no commit history.
- No query contained the owner's or the project's name. Nothing was committed. The repository was only read (CLAUDE.md, `app/engine/host.js` header, `app/shell/main.js`, `app/package.json`).

## What exists in this repository (READ, local)

- `app/package.json`: Electron `45.0.0`, electron-builder `26.18.0`, `main: shell/main.js` (READ).
- `app/shell/main.js` sends `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Resource-Policy: same-origin` (lines 107 to 109), so `SharedArrayBuffer` is available to the page. It serves `havantechno://app/`, opens device windows as child `BrowserWindow`s with `window.open`, and runs `tools/separate.py` with the system Python through `shell/separation.js` (so a sidecar child process and an optional Python dependency are already an accepted pattern).
- `host.js` header: the UI talks only to `Host`; "so a native engine can replace this file later". `Host.start` builds the AudioContext with `latencyHint: 'interactive'` (line 323). Device ids are `track:<name>`, `track:<name>:<unit>` (insert), `send:<name>`, `master:<unit>`; parameters are dotted paths; instruments expose `trigger(t, ev)`. These are the seams a plug-in device has to fit: a plug-in is "another unit in a track's insert chain" and "another instrument type".
- CLAUDE.md: Web Audio only, `Sequencer.render` uses an OfflineAudioContext, no build step, AGPL-3.0-or-later, `THIRD_PARTY.md` entry per ported code.

## 1. Formats, terms, and what each asks of a host

### VST3 (the format to do first)

Licence, read carefully (the owner's question about a recent change):

- READ `raw/steinbergmedia/vst3sdk/master/README.md`, section "License & Usage guidelines": "**VST 3 SDK** is under MIT license." and "Licensing under **GPLv3** and the **Steinberg proprietary license** is no longer available." and "Code licensed under MIT license can be used, modified, and redistributed freely — including in commercial products — provided MIT license terms are followed." The README title is "Welcome to VST SDK 3.8.x".
- READ `raw/steinbergmedia/vst3sdk/master/LICENSE.txt`: "MIT License / Copyright (c) 2026, Steinberg Media Technologies GmbH", standard MIT text. The same MIT text with the same 2026 copyright is in `vst3_pluginterfaces/master/LICENSE.txt` and `vst3_public_sdk/master/LICENSE.txt` (both READ). So the licence did change: before 3.8 it was a dual licence (GPLv3 or Steinberg proprietary). The old per-repo README of pluginterfaces still points to "www.steinberg.net/sdklicenses_vst3" (READ), and the public_sdk README points to a forum page "VST 3 SDK public_sdk License" which I did not read.
- SNIPPET (Sound on Sound, Steinberg press release PDF, CDM, heise, Steinberg forum "VST 3.8.0 SDK Released"): the change was announced on 29 October 2025 with VST 3.8; Steinberg's FAQ says existing products "may continue using your current license"; ASIO SDK is licensed separately (GPLv3 plus proprietary), which I did not confirm.
- Trademark, READ in the same README: use of the "VST" name or logo is optional under MIT; if used it must follow Steinberg's rules; prohibited: "Using 'VST' (or derivatives like 'VSTi') in company or product names." For this repository: do not name a module or product "Havantechno VST ..."; describing "loads VST3 plug-ins" in docs is the ordinary use (the trademark text there says "VST is a registered trademark of Steinberg Media Technologies GmbH" in Pedalboard's README, READ).
- Position for an AGPL-3.0-or-later project: MIT code can be incorporated into AGPL work (MEMORY: MIT is GPL-compatible). Keep the MIT notice and a `THIRD_PARTY.md` entry.
- Stale licence statements exist elsewhere: Pedalboard's README (READ, section License) still says "The VST3 SDK, bundled with JUCE, ... is licensed under the GPLv3". That predates 3.8 or is not updated; do not copy it.

What a VST3 host must do (README facts READ; the interface-level detail is MEMORY unless stated):

- READ (vst3sdk README): "The host and its current environment control the block-size"; plug-ins have "an arbitrary number of inputs, outputs (Event (MIDI) or Audio)"; busses can be deactivated and reactivated; side-chains are "very easily realizable"; "Note Expression" gives per-note events by `noteId`. Public SDK contains "helper classes implementing VST 3 Interfaces" and "samples of VST 3 Hosting" (public_sdk README, READ).
- Scanning (MEMORY): enumerate `.vst3` bundles in the standard folders; load the module (`bundleEntry`/`InitDll`), read `IPluginFactory` class infos (class category "Audio Module Class"; sub-categories "Instrument", "Fx"). Standard folders READ in `raw/audiojs/host/main/README.md`: macOS `/Library/Audio/Plug-Ins/VST3/`, Linux `~/.vst3/` or `/usr/lib/vst3/`, Windows `C:\Program Files\Common Files\VST3\`. Loading arbitrary plug-ins to scan them is where crashes happen; scan in a child process (READ: @audio/host does this: "Scan probes each plugin in a subprocess").
- Instantiation (MEMORY): create `IComponent` and `IEditController` (one object or two, and they may live on different threads), connect them (`IConnectionPoint`), `setComponentState`, set bus arrangements, `setupProcessing` (sample rate, max block, 32 or 64 bit), `setActive(true)`, `setProcessing(true)`.
- Parameters (MEMORY, partly READ via nvst3-host): normalized 0 to 1 values; changes go to the processor as `IParameterChanges` with sample offsets, and plug-in-side edits come back through `IComponentHandler` (`beginEdit`/`performEdit`/`endEdit`). nvst3-host README (READ) lists these as events `restart`, `dirty`, `beginGesture`, `endGesture` and says the host must null-check things some plug-ins mishandle (audiojs README, READ: "Some plugins dereference `inputParameterChanges` without null-checking").
- State (MEMORY): `getState` on component and on controller into `IBStream`; opaque, versioned by the plug-in. audiojs README (READ): "State is opaque. `getState()` returns the plugin's internal binary format, not portable across versions."
- MIDI and note events (READ in nvst3-host README: structured NoteOn/NoteOff/PolyPressure/Controller/ProgramChange/ChannelPressure/PitchBend/SysEx plus raw bytes, optional `noteId`, output events via `takeOutputEvents()`): events carry a sample offset inside the block.
- Process call (MEMORY): `IAudioProcessor::process(ProcessData)` on the audio thread with `numSamples`, `ProcessContext` (tempo, position, play state), no allocation or locks. nvst3-host READ: "No locks during `IAudioProcessor::process`", process modes `realtime` / `offline` / `prefetch`, latency and tail-samples queries.
- Editor (MEMORY): `IEditController::createView("editor")` returns an `IPlugView`; the host passes a platform handle (`HWND`, `NSView*`, X11 window id) to `attached()`, implements `IPlugFrame` for resize requests, and must call all of it on the UI thread. nvst3-host READ: it does not support this ("No GUI/editor support", "their `IPlugView` is never opened").
- Threading (MEMORY): UI thread for editor and controller edits, audio thread for `process`, never block the audio thread; parameter edits cross threads through queues.

### VST2 (do not)

- SNIPPET (KVR, Renoise and JUCE forum search results; one is a Steinberg staff reply quoted second-hand): Steinberg stopped providing the VST2 SDK and signing VST2 licence agreements in October 2018, and "it is not possible to license a VST2 for host too for new development". The VST3 licence text quoted there says it "neither applies to the development nor the hosting of VST2 Plug-Ins". Legal footing for a new unlicensed host is unclear; forum opinions disagree. Carla advertises VST2 hosting (READ `raw/falkTX/Carla/main/README.md`: "LADSPA, DSSI, LV2 and VST2, VST3 and AU plugin formats"); Element lists VST on macOS and Windows (READ, below). I did not read their legal reasoning.
- Recommendation: not supported; say "VST3 only" in the UI. The owner's "vst" most likely means what is installed today, which is overwhelmingly VST3 for any maintained plug-in.

### Audio Unit (macOS only; v2 and v3)

- Hosting needs (MEMORY): Apple's `AudioToolbox`/`AVFoundation` APIs (`AudioComponentFindNext`, `AudioComponentInstanceNew`, `AUAudioUnit` for v3), render callback or `AUAudioUnit.renderBlock`, parameter tree (`AUParameterTree`), `fullState` dictionary for state, MIDI via `MusicDeviceMIDIEvent` or `AUMIDIEvent`, view via `requestViewController` (v3) or Cocoa view (v2), all main-thread for UI. AUv3 plug-ins are app extensions that run out of process by design (MEMORY). I did not read Apple's documentation pages (only a search summary).
- JUCE (READ README): "VST, VST3, AU, AUv3, AAX and LV2 audio plug-ins and plug-in hosts". So JUCE is the shortest way to AU hosting that I found. Pedalboard also hosts AU (READ: "Supports instrument and effect Audio Units on macOS"). Element lists AU on macOS (READ).
- Apple SDK licence: not read (clap-wrapper's README READ mentions a folder named `AudioUnitSDK` for AUv2 builds; I did not read its licence).
- Hardened runtime (SNIPPET only, from JUCE forum threads and Apple documentation summary): a hardened-runtime host needs `com.apple.security.cs.disable-library-validation` to load plug-ins signed by other developers ("Load frameworks and plug-ins that are written by third-party developers"), and some hosts reportedly also need `com.apple.security.cs.allow-unsigned-executable-memory`; the search summary says the working combination varies and Apple advises the narrowest exception. A host that is unsigned or ad-hoc signed without hardened runtime is not under library validation (MEMORY, not verified); the planned V3 builds are unsigned unless the owner supplies identities (brief), so unsigned builds may load plug-ins more freely, and a signed build would need these entitlements. I did not test either.

### CLAP

- READ `raw/free-audio/clap/main/LICENSE`: MIT, "Copyright (c) 2021 Alexandre BIQUE". clap-wrapper and clap-host are MIT too (READ; clap-wrapper copyright "2022 defiantnerd", clap-host "2021 Alexandre BIQUE").
- READ clap README: "stable ABI", a plug-in built against CLAP 1.x loads in any 1.y host; pure C header (`clap/clap.h`). Draft extension list includes a webview extension and WCLAP (WebAssembly) builds (README line near "signalsmith-clap-cpp": "WebAssembly (WCLAP) build instructions").
- Adoption: READ that Element, @audio/host and clap-wrapper support it; clap-wrapper README says it projects a CLAP into "VST3, Audio Unit v2 (AUv2), Audio Unit v3, AAX, A Simple Standalone". Carla's README feature line (READ) lists "LADSPA, DSSI, LV2 and VST2, VST3 and AU" and no CLAP in that line (I did not read the rest). I found no figure for how many commercial plug-ins ship CLAP; MEMORY says the free and open-source plug-in scene is where it is common and big vendors mostly ship VST3 and AU. Unverified.
- Host needs (MEMORY): `clap_entry` init, factory, plugin `init/activate/start_processing/process`, extensions for params, state, note ports/audio ports, gui (embedded or floating window), thread-check; main-thread and audio-thread functions are separated by the spec. Notably, CLAP's gui extension supports a plug-in-owned floating window, which simplifies editor hosting (MEMORY).
- Rust hosting crate: `clack-host` (READ `raw/prokopyl/clack/main/README.md`: "low-level, safe Rust wrappers to create audio plugins and hosts using the CLAP API"; its README says "there is (to the author's knowledge) no higher-level alternative available and functional yet" for CLAP hosts in Rust). Its licence file I did not read.

### LV2 (Linux first, optional elsewhere)

- READ `raw/lv2/lv2/main/COPYING`: ISC-style permission text, "Copyright 2006-2012 Steve Harris, David Robillard. Copyright 2000-2002 Richard W.E. Furse, Paul Barton-Davis, Stefan Westerfeld."
- Needs (MEMORY): Turtle metadata discovery of installed bundles (the `lilv` library does this, ISC, unverified), ports of type audio/control/atom (MIDI is atom sequence), URID mapping, worker and state extensions, UI as separate GTK/Qt/X11 libraries (the UI/DSP split is a headache for hosting). JUCE lists LV2 (READ). Element lists LV2 (READ). Carla lists LV2 (READ).
- Position: Linux only in practice; do after CLAP.

## 2. Architectures for Electron

Shared facts (all design, unmeasured unless noted):

- Web Audio renders in 128-frame quanta (render quantum), pulled by the audio device callback in the browser's audio thread; AudioWorklet runs on that thread. At 48 kHz, 128 frames = 2.667 ms (arithmetic). Native plug-ins accept any block size up to the maximum set at setup (READ: "block-size is controlled by the host"); some plug-ins misbehave at tiny blocks (MEMORY). @audio/host sets `blockSize: 128` by default "matches Web Audio BLOCK_SIZE exactly, zero reblocking" (READ).
- Electron 45 and external buffers: SNIPPET from the search summary of an Electron issue thread says Electron does not support N-API external buffers, so zero-copy ArrayBuffer views from an addon are hard; plan to copy at the addon boundary. nvst3-host advertises "zero-copy `Float32Array`" (READ) for plain Node; whether that holds in Electron 45 I did not test.
- A `SharedArrayBuffer` is shared between an AudioWorklet and its page's JS agent cluster (Chrome's published design pattern: "AudioWorklet, SharedArrayBuffer, and Worker", SNIPPET). It is not shared with a different OS process (MEMORY). So the SAB ring in the brief connects the worklet to a renderer Worker or main thread, not to an external process; an extra hop, copy or a native shared-memory mapping is needed to reach the plug-in process.

### (a) Native Node addon in main or utility process

- Shape: addon (N-API) loads the plug-in in-process in an Electron utility process; the renderer's worklet talks to it via SAB and a message port (the SAB must still be bridged across processes, see above).
- Existing parts: `nvst3-host` (MIT, VST3 SDK 3.8.0, N-API, headless, prebuilt binaries for Windows, macOS Intel and Apple Silicon, Linux; READ), `@audio/host` (MIT, VST3 and CLAP, AudioWorkletProcessor wrapper, headless, "Currently yes" a crashed plug-in crashes your process, MIDI "Planned"; READ), slopsmith-desktop (SNIPPET: a JUCE engine as a Node native addon built with cmake-js and N-API in Electron).
- Costs: native build and ABI matching per Electron version (Electron 45 here), per platform and per architecture; a native-module step in a repository with no build step; electron-builder needs `asarUnpack` for `.node` files (MEMORY).
- Risks: a crashing plug-in kills the process that hosts it (a utility process softens this but still takes the audio path down); on macOS Apple silicon an arm64 process cannot load x86_64-only plug-ins (MEMORY; Rosetta works per process); editor windows need UI-thread access that Node's thread does not own on macOS (main-thread requirement, MEMORY).
- Latency: no pipe hop but still SAB-to-process hop, so at least one extra quantum; unmeasured.
- Offline render: addon call in process mode `offline` (nvst3-host supports `processMode: offline`, READ) from a non-realtime loop.

### (b) Separate native host process (the sidecar)

- Shape: a small native executable "plughost" (C++) that loads plug-ins, scans them in grand-child processes, and talks to Electron over stdin/stdout pipes, a local socket or shared memory. It owns plug-in editor windows. No audio device of its own.
- Why it fits: crash isolation (browsers and many DAWs do this: MEMORY); one process per plug-in is possible; a second x86_64 build can run under Rosetta on Apple silicon for old plug-ins (MEMORY); the native code is a separate binary, so the Electron app needs no native Node module and the repository keeps no build step for the web side; the editor window problem is solved inside a process that has a real UI loop.
- Cost: you write a protocol (audio blocks, MIDI/param events with frame offsets, state blobs, lifecycle) and ship a CMake project and a CI build matrix (V3 already builds per platform). JUCE or the VST3 hosting classes carry the format work.
- Data rate (arithmetic): stereo float at 48 kHz = 384 kB/s per audio direction per plug-in. Pipes and local sockets carry that easily; the issue is jitter, not bandwidth.
- Latency (design, unmeasured): `output prefetch` of N blocks is added latency of N times the block length; 2 blocks of 128 frames = 5.3 ms at 48 kHz. Plug-in internal latency (VST3 reports latency in samples; MEMORY) must be compensated against the other tracks (delay them by that amount).
- Clock drift: none if the sidecar has no device of its own and is driven by the worklet's clock (each block the page sends yields a block back). The drift problem appears only if the sidecar opens its own audio device; do not do that. Underrun policy (silence versus last block) must be decided; unmeasured.

### (c) Whole engine native (JUCE or similar), web UI as remote control

- Cost: rewrite of `sequencer.js`, `synths.js`, `drums.js`, `classics.js` (AudioWorklet DSP), `processors.js`, exports, tests (448 plus 161 checks, 26 browser checks, per CLAUDE.md). Host's header explicitly says a native engine can replace `host.js` later, so the seam exists, but the whole DSP library would be ported.
- Benefit: one clock, native editors, native plug-in latency handling, no 128-frame hop. JUCE AGPL use is allowed for this project (see 3).
- Verdict: the highest-risk path; only worth it if the sidecar route fails its latency tests. I would not start here.

### (d) The reverse: wrap this engine as a plug-in

- clap-wrapper turns a CLAP into VST3/AUv2/AUv3/standalone (READ). The engine is JavaScript on Web Audio; shipping it as a plug-in means embedding a JS and Web Audio runtime (a webview or Chromium) in the plug-in. CLAP's draft webview extension and WCLAP point the other way (CLAP plug-ins with web UIs, READ line in clap README). Not what the owner asked for ("loading vst/au"); not attempted.

### Offline render with a plug-in (app's `Sequencer.render` and V1's `exportAudio`)

Options (design, none tested):

1. Bake (freeze) each plug-in track: render the plug-in's input offline in the sidecar (effects: the dry upstream audio from an OfflineAudioContext pass; instruments: the note list from the `SongDoc`, which the sidecar renders end to end) and return an `AudioBuffer`; the final offline pass plays that buffer through a `BufferSource`. Works with the existing "schedule two bars ahead, suspend once per bar" structure because the baked buffer is just a source. Limits: no feedback or side-chain between a plug-in and other tracks; effect plug-ins on sends need the send bus rendered first (a two-pass graph).
2. Lockstep: an AudioWorklet in the OfflineAudioContext waits on a sidecar answer per block. Blocking inside the worklet (Atomics.wait) may not be permitted in AudioWorkletGlobalScope; I did not verify, so treat as unavailable.
3. Parameter automation: pass the same lock/automation events with sample offsets in the bake.

For stems, V1's exportAudio per track is a bake per plug-in track, so staged work is a natural fit.

### Editor windows

- VST3: `IPlugView::attached(handle, type)`; macOS `NSView*`, Windows `HWND`, Linux X11 (MEMORY). Embedding a native view into an Electron `BrowserWindow` content area is not a supported pattern (Electron's `getNativeWindowHandle()` exists, MEMORY; embedding children is fragile). Sidecar-owned top-level windows (JUCE-style or plain) avoid it. This repo already opens device windows as separate child BrowserWindows (READ main.js), so "a plug-in window is another window, owned by the sidecar" matches the UI model. Remembered bounds can be stored with the existing `window-state.json` approach.
- Window must be raised and closed from Electron: a message to the sidecar. Keyboard focus and the main-thread run loop on macOS (the sidecar must run an `NSApplication` loop; MEMORY).
- CLAP: floating window mode removes embedding (MEMORY).
- Wayland: embedding foreign windows is poor; X11 reparenting is what plug-ins expect (MEMORY).

### State in the project

- Document side: per track `plugin: {format, id (VST3 class id, AU component triple, CLAP id), name, vendor, version, state: <blob>, params: {...}}`, plus an `inserts[]` entry type for effects. Blobs are binary and can be large; store them as files beside the project in the V1 audio bundle (`saveBundle`) rather than as base64 in JSON when above a size (design). If the plug-in is missing on load, keep the blob and show a placeholder device (Element's "Placeholder Nodes" is a feature name in its README, READ).
- Recall on another machine: plug-ins are platform-native ("A macOS `.vst3` won't run on Windows", audiojs README, READ), so a project that uses plug-ins is not portable across operating systems unless the plug-in has a matching build; document that.

## 3. What exists to build on (licences read where marked)

| Project | Licence (read?) | Use here |
|---|---|---|
| JUCE | READ `raw/juce-framework/JUCE/master/LICENSE.md`: "dual-licensed under the AGPLv3 and the commercial JUCE licence (JUCE 9 End User Licence Agreement)"; examples ISC; README says it builds "VST, VST3, AU, AUv3, AAX and LV2 audio plug-ins and plug-in hosts" and tells assistants to state that "a commercial JUCE licence may be required" | AGPL option matches this repository (AGPL-3.0-or-later) for the sidecar. Not for sale, so no commercial licence is needed now; selling would change it. I did not read the JUCE 9 EULA text. |
| VST3 SDK (+ public_sdk, pluginterfaces) | READ: MIT, 2026, Steinberg; 3.8.x | Hosting classes (`public.sdk/source/vst/hosting`) and a sample host: README READ lists "samples of VST 3 Hosting". Names of exact files are MEMORY. |
| CLAP, clap-host, clap-wrapper | READ: MIT | clap-host is "a minimal CLAP host" example with Qt GUI (READ README) |
| Carla | READ README: "open source and licensed under the GNU General Public License, version 2 or later"; usable as host, also "available as an LV2 plugin and VST2 plugin"; formats LADSPA, DSSI, LV2, VST2, VST3, AU. Its `doc/GPL.txt` is GPLv2 text (READ first lines). | GPLv2-or-later code can be combined into AGPL-3.0-or-later work (MEMORY; "or later" is what makes it work). Carla as an external program driven over its own plug-in-host API (MEMORY: Carla has a host API) is possible but heavy. I did not read a library-licence file for its libraries; MEMORY says a few parts are LGPL. |
| Pedalboard (Spotify) | READ `raw/spotify/pedalboard/master/LICENSE` and README: GPLv3; `load_plugin` for "VST3 instrument and effect plugins on macOS, Windows, and Linux" and "instrument and effect Audio Units on macOS"; instruments render by passing MIDI; "Live audio effects via AudioStream" | Offline bounce prototype in Python with no C++ (see stage 0). Live path uses its own audio device (AudioStream), so it is not a slave to Web Audio's clock. |
| Element (Kushview) | READ README: "modular AU/LV2/VST/VST3/CLAP audio plugin host"; table: Linux LADSPA/LV2/VST3/CLAP, macOS AU/VST/VST3/LV2/CLAP, Windows VST/VST3/LV2/CLAP; "Runs standalone or as a plugin"; has "Placeholder Nodes". Its licence file path 404ed; REUSE badge present | Reference for how a JUCE-based host organises graphs and placeholders. Licence unread (MEMORY says GPLv3; not verified). |
| Ardour | READ `COPYING`: GPL v2 with a "Plugin Clarification": "Ardour may load arbitrarily licensed plugins ... without any implications for either Ardour or the plugin", covering "VST, AudioUnits, LV2, LADSPA and CLAP" | Strongest read licence statement for "a copyleft host may load proprietary plug-ins". It is Ardour's understanding, not law, and not binding on this project; but it is the same stance this repo can take in its docs. Ardour's hosting code was not read. |
| DPF (DISTRHO Plugin Framework) | READ `LICENSE`: ISC-style | For building plug-ins, not hosts; relevant only for the reverse direction (d). |
| nih-plug | READ README "Licensing": framework ISC but "the VST3 bindings used by `nih_export_vst3!()` are licensed under the GPLv3" (vst3-sys) | Plug-in side, not hosting; shows the pre-3.8 licence hazard that 3.8 removes. |
| @audio/host (audiojs) | MIT per README footer ("## License / MIT"); a LICENSE file at `main/LICENSE` returned 404 | VST3 and CLAP from JS, AudioWorkletProcessor registration; headless; MIDI planned; "Currently yes" crash takes your process down. Maturity unknown to me. |
| nvst3-host (Henley04) | READ `LICENSE`: MIT, "Copyright (c) 2026 Henley Sun" | Node addon on VST3 SDK 3.8.0; MIDI, state, params, offline mode; no GUI. Good for stage tests and as a model; I did not run it. |
| vstjs / vst-js | SNIPPET only | "launches VST3 plug-ins, including their GUI, in a separate process"; "very experimental". Unread. |
| slopsmith-desktop | SNIPPET only | JUCE engine as Node native addon in Electron. Closest match found; unread, licence unknown. |
| clack (Rust) | README READ: CLAP host and plug-in crates; licence unread | Rust sidecar option for CLAP only. |
| Web Audio Modules (WAM) | READ `raw/webaudiomodules/api/master/LICENSE`: MIT (copyright 2015 WAM); README: "`master` branch tracks v0.2, targeting AudioWorklets"; SDK README (READ): a plug-in is `index.js` with `createAudioNode()` plus `gui.js` returning an `HTMLElement` | Web-only fallback: plug-ins that are JS or WASM, loadable in this app with no native code. No commercial VST3 or AU can be used this way. |

Notes:
- Existing bridge of native plug-ins into a Web Audio graph: @audio/host claims "register any plugin as AudioWorkletProcessor" but for the Node `web-audio-api` package (its example imports from `'web-audio-api'`, READ), not Chromium's Web Audio. I found no project (read) that bridges native plug-ins, with editors, into Chromium's Web Audio inside Electron. slopsmith-desktop (SNIPPET) is the nearest.
- The "native web audio api plugins" paper at `webaudioconf.github.io/papers/native-web-audio-api-plugins.pdf` was in search results (SNIPPET title only); I did not read it.

### Web-only fallback detail

- WAM2: MIT API (READ), runs in the same AudioContext with no latency or clock issues, editor is a DOM element in a device window (this repo already has device windows with a "faceplate" model, `app/ui/panels.js`). Plug-in catalogue is small compared with VST3/AU (MEMORY).
- WCLAP (CLAP compiled to WebAssembly) is mentioned in the CLAP README (READ line) and @audio/host planned CLAP-to-WASM (READ FAQ: "CLAP-to-WASM is planned"). Not ready to rely on.

## 4. Per platform

- macOS (arm64 and x86_64 per V3): AU and VST3 (CLAP optional). Need either an AU-capable host (JUCE or Apple APIs) in the sidecar, plus sidecar signing. Hardened runtime and entitlements as in section 1 (SNIPPET). Rosetta: an arm64 sidecar can only load arm64 or universal plug-ins; for x86_64-only ones a second x86_64 sidecar binary run under Rosetta is the standard bridge (MEMORY; not tested). VST3 and AU install folders: `/Library/Audio/Plug-Ins/VST3/` (READ) and `/Library/Audio/Plug-Ins/Components/` (MEMORY) plus the `~/Library` versions (MEMORY). A downloaded unsigned app is quarantined by Gatekeeper; the sidecar inside it inherits that (MEMORY).
- Windows: VST3 in `C:\Program Files\Common Files\VST3\` (READ). The sidecar needs a Win32 message loop for editor windows (MEMORY). arm64 Windows exists: the VST3 README lists "arm64, arm64EC" for Windows 11 (READ), so arm64 hosts and x64-emulated plug-ins is a possible headache; not investigated.
- Linux: VST3 in `~/.vst3/` or `/usr/lib/vst3/`, CLAP in `~/.clap/` or `/usr/lib/clap/` (READ), LV2 in `~/.lv2` and `/usr/lib/lv2` (MEMORY). The VST3 SDK README READ supports "Linux - Ubuntu 24.04 LTS x86_64" only (compiler GCC 13.3 or higher). Editors rely on X11; under Wayland run with XWayland (MEMORY). Many Linux users have more LV2 and CLAP than VST3.

## 5. Recommendation: the sidecar, in stages, smallest first

Architecture: (b), a separate native "plughost" process driven by the page's audio clock; no native Node addon; the engine and the document stay in JavaScript. Reasons: crash isolation, no build step for the web code, a place to own editor windows, a way to bridge Rosetta later, one audio clock, and a protocol that is also the offline-bake interface. Language and base: C++ with the MIT VST3 SDK hosting classes for VST3 and CLAP headers, plus JUCE (AGPL option) for AU, VST3 and editor windows if it saves time; decide at stage 1 by spike. Keep the protocol small enough that another backend could replace it.

### Stage 0: offline bounce through a plug-in with no new build (days)

- What: `tools/plugin-render.py` uses Pedalboard (GPLv3, READ) from the system Python (already used by `tools/separate.py`) to run a rendered track WAV through a VST3 or AU, and to render a MIDI note list through an instrument. A "Bake with plug-in" menu command calls it through the shell and loads the result as an audio track (V1's `addAudioTrack`).
- Proof: render a known plug-in, such as a VST3 built from the SDK's own MIT example plug-ins (the public_sdk README READ says it contains "samples of VST 3 ... plug-ins"; exact example names are MEMORY), versus an expected output computed in JS. For a gain plug-in: peak and null test within 1e-5; for a delay: the lag in samples equals the setting; instrument: a note's onset sample equals the scheduled sample.
- Build complexity added: none to the repo's JS; an optional Python dependency (`pip install pedalboard`) like the separation tool.
- Licence: Pedalboard GPLv3 as an external tool invoked by subprocess, fine under AGPL; if code is ported, keep `THIRD_PARTY.md` entry. Pedalboard's own README still says the VST3 SDK is GPLv3 (stale after 3.8; READ conflict).

### Stage 1: native sidecar, scan and offline effect and instrument bake (weeks)

- What: `app/plughost/` (C++, CMake): `plughost scan` (in grand-child process, writes a JSON catalogue and a blocklist of crashers), `plughost bake --plugin ... --in in.wav --out out.wav --state s.bin --params ...`, `plughost bake-instrument --notes notes.json`. VST3 on Windows, Linux, macOS; AU on macOS. State get/set. CI workflow added to V3's matrix.
- Proof: same null/delay/onset tests as stage 0; a crash test (a dummy plug-in or a deliberately corrupted bundle) leaves the app alive and listed as "failed to load"; state round-trip: save, restart, reload, output identical; the 448-check engine selfcheck extended with a fake `plughost` stub so engine checks still need no binary.
- Build complexity: first native build step in the repo; CMake plus the VST3 SDK (git submodule or fetched at build) and JUCE if used; artifacts per platform and arch in CI; the web app still runs without the binary (feature-detect).
- Licence: VST3 SDK MIT (keep notice), JUCE under AGPLv3 (matches), `THIRD_PARTY.md` entries; no "VST" in product or module names (README READ).

### Stage 2: live effects (insert on a track or send)

- What: a Web Audio node (`AudioWorkletNode` with SAB ring pair) per plug-in insert; a renderer Worker or the main thread bridges the ring to the sidecar over a local socket or pipes; block size matches the worklet's 128 frames, with a configurable prefetch (start at 2 blocks); latency reported by the plug-in is compensated by delaying parallel tracks (`DelayNode`); bypass; parameter changes and state over the same channel.
- Open question to test first: the shortest reliable path from the page to the sidecar (WebSocket from a Worker, a MessagePort to a utility process then a pipe, or a native shared-memory addon). All three are unmeasured; WebSocket under `require-corp` needs checking.
- Proof: loopback null test (a pass-through plug-in must null against the dry path after latency alignment, to sample accuracy); a 10-minute run at 128-frame quanta with zero underruns, recorded (`host.audioOptions().baseLatency`/`outputLatency` plus own counters); live render equals offline bake for the same input within a stated tolerance (CPU load will differ, but the signal must not).
- Build complexity: JS ring-buffer protocol plus test harness; no new native dependency beyond stage 1. A dropout counter in the Host.
- Licence: unchanged from stage 1.

### Stage 3: instruments with MIDI from the sequencer

- What: a plug-in instrument is an instrument type for a track; `trigger(t, ev)` becomes a timestamped note message (frame offset within the next block) to the sidecar; plug-in audio returns on the same ring; parameter locks (`ev.locks`) map to parameter changes at the event time; polyphonic note ids kept (READ: VST3 Note Expression by `noteId`).
- Proof: onset sample of each note equals its scheduled sample (±0 samples in offline bake; ±1 block of jitter bound measured live); the Step View playing a pattern produces the same bake as the live path.
- Build complexity: the sequencer's scheduling horizon (a 120 ms lookahead in the archived engine, READ CLAUDE.md) is bigger than the prefetch, so events arrive early; the sidecar must queue by timestamp.
- Licence: unchanged.

### Stage 4: editor windows and recall

- What: sidecar-owned native windows (`IPlugView`, AU view, CLAP gui); open/close from the device menu; parameter edits made in the editor flow back as events (`beginGesture`/`endGesture` become undo entries, matching the existing "one undo entry per hold" rule in Host); state saved into the project bundle; missing-plug-in placeholder.
- Proof: a manual test on each OS with one free plug-in (open, move a knob, close, save, reopen: the knob position is restored; undo steps once per gesture); window-state remembered; plug-in crash while the window is open leaves the app running.
- Build complexity: platform windowing code in the sidecar (macOS run loop on the main thread, Win32 loop, X11); focus handling between Electron and the sidecar.
- Licence: unchanged.

### Stage 5: CLAP, then LV2 on Linux, then Rosetta bridge if asked

- CLAP via the MIT headers (small); LV2 via lilv (licence unread). Rosetta sidecar build only if the owner's plug-ins demand it.

### What I would NOT attempt

- VST2 (no new licences, SNIPPET; legal footing unclear).
- Loading plug-ins in-process in the Electron renderer, main process, or an addon without isolation (crash and macOS main-thread problems; @audio/host's own FAQ says a crash takes the process down).
- Embedding plug-in editor views inside Electron's DOM or window content.
- Wrapping this engine as a VST3 or AU (d).
- Rewriting the engine native (c) unless stage 2 fails its latency test.
- A second audio device inside the sidecar (two clocks, drift).
- Lockstep plug-in processing inside an OfflineAudioContext worklet (bake instead).
- AAX, and plug-in sandboxing beyond a child process.
- Promising plug-in portability of projects across operating systems.
- Claiming any latency number before stage 2 measures it. The numbers in this note are arithmetic or design targets.

## 6. What I could not find or read

- No Steinberg portal page: `steinbergmedia.github.io` failed to resolve; the 29 October 2025 date is SNIPPET only. I did not read commit history, so I cannot say when `LICENSE.txt` became MIT beyond the 3.8.x README and 2026 copyright lines. The `public_sdk` licence forum page, the `sdklicenses_vst3` page and the VST3 FAQ were not read.
- JUCE 9 EULA text, Apple AudioUnit SDK licence, Carla library licences, Element's licence, clack's licence, lilv's licence, `@audio/host`'s LICENSE file (404; README footer says MIT), vstjs and slopsmith-desktop (SNIPPET only).
- Apple's hardened-runtime and AU hosting documentation (SNIPPET from a search; I did not open it), and whether unsigned or ad-hoc builds are subject to library validation.
- Whether Electron 45 supports zero-copy external buffers (SNIPPET: no), whether WebSocket from a Worker works under COEP `require-corp`, whether `Atomics.wait` works in AudioWorkletGlobalScope, and whether a SAB can be shared across Electron processes. Untested.
- Any measured latency, jitter or CPU figure; any run of Pedalboard, nvst3-host, @audio/host or JUCE; no plug-in was loaded.
- CLAP adoption figures; AUv3 hosting behaviour; Wayland editor embedding; arm64 Windows plug-in availability.
- A project that already bridges native plug-ins with editors into Chromium's Web Audio inside Electron: none found in what I read.
