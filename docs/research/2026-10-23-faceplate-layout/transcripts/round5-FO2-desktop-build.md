# F-O2: Tech lead — round 5, what the desktop move means for the build
Agent model: Opus. Date: 2026-10-23.

## Scope

The owner's new direction, as given in the coordinator's message and in `prd.md` D6:
- Havantechno becomes a Mac or PC desktop DAW, "so it's more powerful".
- The voted Strip Bench layout stays, as the **System Editor** view.
- Each piece of gear gets a **floating window** with its own look.
- A **Step View** is added in which every step is editable.

I cover four things: the shell options, the data model the Step View needs, a revised migration path, and how the face registry serves both the chain and the floating windows.

Inputs: `REPORT.md`, my rounds 1 to 3, and the Gear Crew's `round1-O2-daw-possibilities.md` (for the plugin and licence facts it verified). I also re-read the code in `olde Havantechno dub studio/` (`studio/` is a symlink to it): `sequencer.js` (`parsePattern`, `parseMelody`, `schedule`) and the `kick` and `bass` triggers in `synths.js`.

I ran 8 web searches (budget 8) and no page fetches. Every web fact below is marked `(search excerpt: <url>)`. Facts I take from another agent's file carry that file's grade. All day counts are **my judgement, rough, ±50%, for one developer who knows this code**.

## 1. Shell options

### What "more powerful" can mean, which decides the choice

There are three distinct gains, and only some shells deliver each.

- **(a) Desktop comforts.** Files on disk (save songs, load stems), no tab throttling, several OS windows, offline use. Every shell gives these.
- **(b) Lower and more controllable latency and more DSP headroom.** Only a native audio engine gives this. A Web Audio engine inside a desktop shell keeps the browser's audio path. Chromium's `outputLatency` is the buffer size of the platform audio callback, about 10 ms on Windows according to the Chromium intent-to-ship thread (search excerpt: https://groups.google.com/a/chromium.org/g/blink-dev/c/dTQniJNVVMY/m/hPFwY1fbBQAJ). `latencyHint` is a request the browser may ignore (search excerpt: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/baseLatency). Whether Chromium can use ASIO on Windows: not found.
- **(c) Hosting real VST3, AU or CLAP plugins.** Only a native engine can load them. The Gear Crew already established that compiled plugin binaries cannot run inside Web Audio, and that the VST3 SDK (from 3.8) and CLAP are MIT (Gear Crew `round1-O2-daw-possibilities.md`, marked verified there: https://github.com/steinbergmedia/vst3sdk, https://github.com/free-audio/clap).

If the owner means (a), a thin shell around today's code is enough. If the owner means (b) or (c), the audio engine has to become native at some point, and the question becomes when.

### Options compared

| Option | Reuse of current code | Latency | Floating gear windows | Plugin hosting | Licence | Rough cost (my judgement) |
|---|---|---|---|---|---|---|
| **A. Electron + today's Web Audio engine** | All of it unchanged: `core`, `synths`, `processors`, `sequencer`, `song`, `selfcheck`, and the planned faces. The app stays plain script tags; only the runner needs a `package.json`. | The same as Chromium (above). No ASIO found. | Good. A same-origin `window.open()` creates the child window in the same renderer process, so the parent can script it directly, "the same behavior as in the browser" (search excerpt: https://electronjs.org/docs/latest/api/window-open). A gear window can therefore call the main window's `Host.setParam` with no IPC. `setWindowOpenHandler` in the main process "has final say" over the window options (same excerpt), which is where always-on-top and frameless styles are set. | Not inside Web Audio. It needs a native addon with its own audio engine. One example: Slopsmith Desktop, an Electron app whose JUCE engine is a Node native addon built with cmake-js that hosts VST3 (search excerpt: https://github.com/JayMan8-1/slopsmith-desktop). That means two audio engines and two clocks, with audio bridged between them. | Electron: MIT (recalled). | Shell 2–4 days. Gear window manager 3–5. Signed installers for Mac and Windows 3–5. Plugin bridge into Web Audio 20–40, high risk; I advise against it. |
| **B. Tauri + today's code** | The JS carries over, but it runs in the system webview: WKWebView on Mac (WebKit) and WebView2 (Chromium) on Windows (search excerpt: https://v2.tauri.app/zh-cn/reference/webview-versions/). The Web Audio engine would then run on two different browser engines. Web Audio and AudioWorklet parity between them: not found. | WebKit on Mac, Chromium on Windows, so it differs per OS. | Each window is its own webview. I recall that they do not share a JS heap, so every parameter and meter value would cross IPC (recalled, not verified). | Through Rust or C++ sidecars; the same two-engine problem as A. | Tauri: MIT/Apache (recalled). | Shell 3–5 days, then a two-engine test matrix and IPC for every window (+5–10). Not worth it for an audio engine running in JS. |
| **C. JUCE native app (C++)** | The engine is rewritten: 13 synths, 10 processors, the sequencer, offline render and WAV. The JS engine becomes the reference implementation, and the self-check's numbers become golden tests. The faces can survive as HTML through JUCE 8's `WebBrowserComponent`, which uses WebKit on Mac and, with `JUCE_USE_WIN_WEBVIEW2`, WebView2 on Windows (search excerpt: https://docs.juce.com/master/classWebBrowserComponent.html). | Native audio devices; ASIO on Windows (recalled). | Native windows, one per gear piece. Each window holds its own webview or native components and is synced from the engine. | First class: `AudioPluginFormatManager` plus `KnownPluginList` to scan and `createPluginInstance` to load, with VST3 and AU hosting behind `JUCE_PLUGINHOST_VST3` and `JUCE_PLUGINHOST_AU` (search excerpts: https://artandlogic.com/?p=1846, https://ccoderun.ca/programming/doxygen/juce_6/juce__audio__processors_8h.html). A plugin's own editor opens in its own window (recalled). | AGPLv3 or a commercial JUCE licence (Gear Crew O2, verified there: https://github.com/juce-framework/JUCE/blob/master/LICENSE.md). Closed source needs a commercial licence (search excerpt: https://forum.juce.com/t/do-i-need-the-starter-or-indie-licence/69021). Tier prices: only dated JUCE 5-era figures found (search excerpt: https://git.kx.studio/DISTRHO/JUCE/commit/d9dee4d87332bf9e3d12da2e032608698829dc14.diff), so no current price is given. | Engine port 30–50 days. Plugin hosting, basic, 5–10. UI in webviews reusing the faces 10–15, or native JUCE components 30+. Total roughly 50–80. |
| **D. Swift on Mac (AVAudioEngine)** | The engine is rewritten in Swift; Mac only. | Native Core Audio. | Native windows. An AU's own view comes from `AUAudioUnit.requestViewController` (search excerpt: https://developer.apple.com/documentation/audiotoolbox/migrating-your-audio-unit-host-to-the-auv3-api.md). | AU only. Units are found with `AVAudioUnitComponentManager` and loaded with `AVAudioUnit.instantiate` (search excerpt: https://developer.apple.com/forums/thread/46856). No VST3 without extra work, and **no Windows**. | Apple SDKs. | Similar engine port to C, 30–50 days, and it excludes PC. **Rejected**: the owner said Mac or PC. |
| **E. Hybrid: native engine sidecar + web UI** | The UI is reused whole: System Editor, faces, Step View. The engine is ported to native (JUCE, or a C++/Rust host on the MIT VST3 and CLAP SDKs) and runs as a separate process or a Node addon. The UI shell is Electron, or JUCE's own webview. | Native. | As in A for the UI. Gear windows talk to the UI host, which talks to the engine over IPC. | Native, in the engine process. `@audio/host` probes plugins in a subprocess so that a crashing plugin does not take the host down (search excerpt: https://github.com/audiojs/host). | Depends on the engine library. | Engine port 30–50 days plus an IPC protocol 5–8. UI work is not redone. |

**My reading.**
- Option A is the cheapest way to get a desktop app, and it reuses everything. It is not more powerful in senses (b) or (c).
- Option C or E is the only route to plugins and low latency. Both cost about two to three months of engine port.
- The decisive move is the same in all of them: put a **host contract** between the UI and the engine now. Then A ships first and E replaces the engine later without the UI being redone.

### The host contract (the seam that makes A-then-E possible)

My round-1 sketch let faces read `dev.obj.params` directly, which only works when engine and UI share one JS heap. For a later native engine, faces must talk only to a host object that can sit in front of either engine:

```js
/* host.js - the only object the UI touches. Engine-agnostic. */
var Host = {
  devices: function () { /* [{id, path, kind, type, spec}] from the engine */ },
  get: function (path) { /* from a local mirror of params, never from engine objects */ },
  set: function (path, v) { /* in-process: seq.setParam(path, v); later: an IPC message */ },
  on: function (type, fn) { /* 'param' (path, v), 'step', 'section', 'meter' (id, peak, rms) */ },
  transport: { play: fn, stop: fn, jump: fn, loop: fn },
  steps: { get: fn, set: fn }   /* Step View records, section 2 */
};
```

- In-process (A), `Host.get` reads the mirror filled from `seq` each frame, and meters come from AnalyserNodes.
- Out-of-process (E), the engine pushes changed params and meter values at about 30–60 Hz, and the mirror is the same object.

Faces, the System Editor and the Step View never change between the two.

## 2. The Step View's data model

### What the engine stores today (verified in `sequencer.js`)

- **Drum patterns.** `parsePattern` turns a 16-character string per bar into rows of `vel | null`, with only four symbols: `x` 0.85, `X` 1.0, `o` 0.5, `.` rest. `schedule()` reads `pat[bis % pat.length][st]` and builds `{vel, accent: v >= 1, dur: gate * stepSec}`. Gate is one value per track.
- **Note tracks** get their pitch from `tr.note`, or cycle through `tr.notes` using a running counter, `tr.noteIdx++`. That counter is state: the pitch of a hit depends on how many hits came before, so a jump or a loop changes which note plays.
- **Melodies.** `parseMelody` makes `{bars, ev: {stepIndex: {midi, len, vel}}}`, monophonic, with two velocities.
- **No step has a time offset** other than global swing on odd steps.
- **No step can change a parameter.** Sections do that through `set` and `ramp`.

So "every step editable" needs a step record. I propose one record type for drum, note and melody tracks; chord tracks keep the section progression for pitch.

```js
// one cell; a variant is {bars, cells: [Step|null, ... bars*16]}
// Step:
{ vel: 0.85,          // 0..1 continuous; >= 1 keeps today's accent meaning
  len: 1,             // gate in steps (float); replaces the per-track gate for this step
  nudge: 0,           // micro-timing, fraction of a step, -0.5..+0.5, added after swing
  note: null,         // midi; null = track default (note tracks) or required (melody)
  prob: 1,            // 0..1 trigger probability, deterministic per (track, absStep, seed)
  locks: null }       // parameter locks for this step only, e.g. {cutoff: 800, decay: 0.2}
```

**Back-compatibility.** `song.js` keeps its strings. A converter turns each string or melody into cells. The reverse writer `formatPattern` emits the string form whenever every cell is plain (`vel` in {0.5, 0.85, 1}, `len` = track gate, no nudge, prob or locks), so hand-written patterns stay readable. Anything richer saves as JSON cells.

### What changes in `sequencer.js` (and one line per synth)

1. **`parsePattern` / `parseMelody` → `parseVariant(def)`.** It accepts a string, an array of strings, a melody token list or a `{bars, cells}` object, and always returns cells. The `noteIdx` cycling becomes explicit `note` values written into cells at conversion time, which removes the hidden state.
2. **`schedule()`.** It reads `cell = v.cells[(bis % v.bars) * 16 + st]` and computes:
   - `time = ts + cell.nudge * sd`. A negative nudge is clamped to no earlier than the context's current time when live, and to no earlier than 0 offline. A half-step nudge at 126 BPM is about 60 ms, inside the 120 ms lookahead.
   - `dur = cell.len * sd`, `midi = cell.note`, `vel = cell.vel`.
   - It skips the cell when `rand(trackSeed, absStep) >= cell.prob`. A seeded hash, not `Math.random`, so that the WAV export and live playback hit the same steps.
3. **Parameter locks travel with the event**, as `ev.locks`, instead of being written to the device. Today's triggers read parameters from the closure `P` at trigger time (verified: `BUILD.kick` reads `P.punch`, `P.tune`, `P.sweep`, `P.decay`, `P.click`; `BUILD.bass` reads `P.cutoff`, `P.env`, `P.res` and others inside `trigger`). So one line at the top of each of the 13 triggers is enough: `var P = K.lockView(inst.params, inst.spec, ev.locks);`, a clamped merged view.
   - The lock then affects only that voice, with nothing to restore and no fight with ramps or the `held` set.
   - Exceptions: `level` and `drive` act on shared nodes through `onSet`, and processor parameters are shared too. Locks on those would need scheduled automation plus a restore, so version 1 allows locks on per-voice instrument parameters only. `Faces` greys out the others while lock mode is on.
4. **Copy-on-write variants**, already agreed. Editing a cell of a variant used by several sections first offers to duplicate it.
5. **A save format.** The engine has no serialisation back to `Song` data today (round 1). A song becomes JSON: `{bpm, swing, progression, sends, tracks[{..., variants: {A: string | {bars, cells}}}], sections}`, written to disk by the desktop shell.

### Self-check additions

All of these run in node, so they keep `node selfcheck.js` meaningful:
- **Equivalence.** Converting every string pattern and melody in `song.js` to cells must give **identical** schedules: the same 3200 steps, kick 800, clap 392, and the same trigger times and velocities as recorded from the string path.
- **Nudge.** A cell with `nudge: 0.25` lands a quarter step late.
- **Probability.** Two runs of `scheduleAll` with `prob: 0.5` give the same hits.
- **Locks.** A lock reaches the trigger and leaves `inst.params` unchanged.
- **Round trip.** `formatPattern(parseVariant(s)) === s` for every string in the song.

### Cost (my judgement)

| Item | Days |
|---|---|
| Engine: step record, converter, scheduling, locks, deterministic `prob` | 3–5 |
| Lock line in 13 synths, plus `lockView` | 1 |
| Save and load format | 2–3 |
| Step View UI: grid, per-step inspector, velocity and length lanes, lock mode where turning any face knob with steps selected writes locks | 5–8 |
| **Total** | **11–17** |

The Step View UI does not depend on the shell; the engine part does not depend on the UI.

## 3. Revised migration path

### What survives from the browser plan

- The device list and dotted parameter paths.
- One write path, `setParam`, now behind `Host.set`.
- The `held` set.
- The face registry as data, linted by the self-check.
- The hand-written SVG widgets and the visual tokens.
- One drawing loop.
- The Strip Bench layout, now the System Editor.
- The self-check itself, which stays a node script.

All of it runs unchanged in Electron, and as HTML inside a JUCE or Electron webview in option E.

### What is replaced or changes

- **"No build step, no package manager"** (PRD C1) no longer holds for the runner. Electron needs a `package.json` and an `electron` dependency. I would keep the app itself buildless (plain script tags) so that the self-check and a browser fallback still work. This is a constraint change the owner should confirm.
- **"Plain browser page" assumptions go**: tab throttling, `python3 -m http.server`, and the missing COOP/COEP headers. A desktop shell can set the headers, so SharedArrayBuffer becomes available (recalled, not verified).
- **Faces read from the `Host` mirror, not `dev.obj.params`.** This changes my round-1 sketch.
- **Floating gear windows are new work.** A window manager handles open and close, positions saved per gear, keeping windows on top of the main window, and copying the CSS tokens into each child document.
- **Plugin hosting moves out of the UI plan entirely.** It is an engine decision (section 1), not a face decision.
- **Work goes in a new folder.** `olde Havantechno dub studio/` is frozen (CLAUDE.md).

### Build order now

1. **Engine data first, shell-independent, all testable in node** (5–8 days):
   - copy the engine into a new folder;
   - add `seq.devices()`, the `held` set, and the step record with the converter and its equivalence check (section 2);
   - add the JSON save format.

   This comes first because the Step View, the save files and any later native port (as its specification) all depend on it, and it is the only part that touches the engine core.
2. **`Host` contract plus the face registry with the generic face, in the browser** (4–6 days). Fixes the two old bugs (sliders ignore ramps, master rack never refreshes).
3. **Electron shell** (2–4 days): a main process, file dialogs for save, load and WAV export, and the app loaded from the new folder.
4. **System Editor (Strip Bench)** (7–10 days on top of the base, as voted).
5. **Floating gear windows** (3–5 days), the faceplate density from section 4, then bespoke faces family by family.
6. **Step View UI** (5–8 days).
7. **Only when the owner wants real plugins or ASIO latency: the native engine (option E).** About 30–50 days, plus IPC. Golden tests are WAVs rendered by the JS engine section by section, compared within a tolerance (method to be designed). Choose JUCE (AGPL or commercial) or a C++/Rust host on the MIT VST3 and CLAP SDKs at that point.

## 4. Face registry: chain face and floating window

**One definition, two layouts, three densities.** Not two definitions, because two would drift on every spec change, which the lint exists to stop.

```js
Faces.define('compressor', {
  family: 'dynamics',
  hero: 'transferCurve',                       // one hero graph, drawn at any size
  sections: [                                  // auto-flow layout: chip and strip (System Editor chain)
    { title: 'DYN',  controls: [{p:'threshold', size:'lg'}, {p:'ratio'}, {p:'knee'}] },
    { title: 'TIME', controls: [{p:'attack'}, {p:'release'}, {p:'makeup'}] } ],
  panel: {                                     // optional fixed layout: the floating window only
    w: 520, h: 300, skin: 'plate',             // F-S4 tiers: flat | plate | skin
    place: { threshold: [40, 60, 'xl'], ratio: [190, 60], knee: [270, 60],
             attack: [190, 170], release: [270, 170], makeup: [380, 170], hero: [360, 40, 140, 100], gr: [460, 40, 'meter'] }
  }
});
```

- **chip** (track row) and **strip** (the device row in the System Editor) are drawn from `sections`.
- **faceplate** (the floating window) is drawn from `panel` when it exists, otherwise from `sections` laid out larger.
- The window is where "its own look" lives: fixed positions, a bigger hero graph, an optional skin. The window never contains controls the chain lacks; every parameter keeps one meaning and one path.
- **The same widgets, `Host.set` path and owner-state markers** (set, ramp, held, lock) are used in both. A chain knob and a window knob for the same parameter stay in sync because both read the one `Host` mirror. Several GUIs controlling one device is also a pattern WAM allows (Gear Crew O2, verified there: https://github.com/webaudiomodules/api).
- **Lint** (self-check): every key in `sections` and in `panel.place` must exist in the spec. A spec key placed in neither goes to the "more" drawer at all densities and is reported as a count.
- **Generic fallback**: a device without a face gets the generic sections in the chain and a generic window (sections in a grid), so the floating window works for every device on the first day.
- **Third-party plugins later (option E)** bring their own editor window. The registry gets a "foreign" entry (F-S1's idea) that shows a neutral chip in the chain and opens the plugin's own editor as the floating window.

## Recommendation

1. **Build the engine-side data now** (`seq.devices()`, `held`, the step record with p-locks, nudge and probability, and a JSON song format) behind a `Host` contract, in a new folder, with node equivalence checks. Every shell needs it, and it is the specification for any future native engine.
2. **Ship the first desktop version as Electron around the existing Web Audio engine** (option A). It reuses everything, and same-origin child windows make floating gear windows cheap (search excerpt above). Tell the owner plainly that this is "desktop", not yet "more powerful" in audio terms.
3. **Do not bridge native plugins into Web Audio.** When plugins or low latency are wanted, replace the engine with a native one behind the same `Host` contract (option E). Choose JUCE versus raw VST3 and CLAP SDKs then, with the licence decided (AGPL or commercial for JUCE; MIT for the SDKs).
4. **Reject Swift** (Mac only) **and Tauri** (two browser engines under one audio engine).

## Questions

1. **For the owner:** does "more powerful" mean desktop comforts (files, windows), or real plugins and low latency? The first is about 2 weeks of shell work; the second is about 2–3 months of engine port.
2. **For the owner:** may the repo gain a `package.json` and an Electron dependency (PRD C1 says no package manager), provided the app code itself stays buildless?
3. **For the owner:** is the repo licence going to be AGPL-compatible? That decides whether JUCE can be used without a commercial licence.
4. **For F-S5:** which step fields does the Step View need in version 1: velocity, length, nudge, probability, locks, ratchets? I left ratchets out; they would add a `rep` field and sub-step scheduling.
5. **For F-S4:** may a floating window use the "skin" tier that the group deferred, given the owner now asks for each gear's own look?
6. **For the Gear Crew:** if the engine goes native, which of your recommended devices exist as CLAP, VST3 or AU, so that hosting replaces reimplementation?

## Recalled, not verified

- Electron is MIT-licensed; Tauri is MIT/Apache-2.0.
- Tauri windows are separate webviews with separate JS contexts, so state crosses IPC.
- A desktop shell can send COOP/COEP headers, which enables SharedArrayBuffer.
- JUCE supports ASIO on Windows, and a hosted plugin's editor opens as its own component or window.
- Mac and Windows code signing and notarisation add a few days of packaging work.

## Sources

Search excerpts (8 searches; no page was fetched):
- https://electronjs.org/docs/latest/api/window-open
- https://api.osv.dev/v1/vulns/GHSA-f3pv-wv63-48x8 (Electron named-window advisory; relevant if child windows get elevated preferences)
- https://v2.tauri.app/zh-cn/reference/webview-versions/
- https://artandlogic.com/?p=1846
- https://ccoderun.ca/programming/doxygen/juce_6/juce__audio__processors_8h.html
- https://forum.juce.com/t/bug-knownpluginlist-scanandadddraganddroppedfiles-fails-for-au-plugin/45340
- https://docs.juce.com/master/classWebBrowserComponent.html
- https://forum.juce.com/t/do-i-need-the-starter-or-indie-licence/69021
- https://git.kx.studio/DISTRHO/JUCE/commit/d9dee4d87332bf9e3d12da2e032608698829dc14.diff (dated JUCE 5-era tier text)
- https://developer.apple.com/documentation/audiotoolbox/migrating-your-audio-unit-host-to-the-auv3-api.md
- https://developer.apple.com/forums/thread/46856
- https://groups.google.com/a/chromium.org/g/blink-dev/c/dTQniJNVVMY/m/hPFwY1fbBQAJ
- https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/baseLatency
- https://github.com/JayMan8-1/slopsmith-desktop
- https://github.com/audiojs/host

From another agent's file (grade as marked there): Gear Crew `docs/research/2026-10-23-plugin-gear/transcripts/round1-O2-daw-possibilities.md`, for the VST3 SDK and CLAP MIT licences, JUCE's AGPLv3/commercial licence, compiled plugins not running in a browser, and WAM allowing several GUIs per plugin.

Repo files read: `REPORT.md`, `prd.md` (D6), `olde Havantechno dub studio/sequencer.js` (`parsePattern`, `parseMelody`, `schedule`) and `synths.js` (`BUILD.kick`, `BUILD.bass`, `vel`).

Not reached: Chromium ASIO support, current JUCE prices, Web Audio parity between WKWebView and WebView2, Electron audio-device selection (`setSinkId`), and code-signing costs.
