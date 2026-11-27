# Pressing Crew brief: the next version (audio in and out, views, settings, downloadable builds) and research for the one after

Written by the coordinator, 26 November 2026 (ET).

## The owner's words

"I want the next version to have save and load and import/export audio (entire arrangement track and individual tracks and the compiled Mac pc and Linux versions available for download the version after will allow for loading vst/au for instruments as well as for processing fx. We should also have multiple views like ableton does and some settings like [Native Instruments]/ableton/logic for the audio settings and view settings. Do everything in parralel for that next version with subagents. And do more research as well."

## What exists

Project save and open (`Project.save/open/autosave/restore`, a `.havantechno.json` document that references audio files by path), Export WAV of the whole song (16-bit), a sampler and a reference track for imported audio, the System Editor (arrangement) and Step View, a disabled "Mixer" button in the toolbar, the Electron shell (`app/shell/`, started with `npm start`; no packaging).

## What to build

1. **V1, audio in and out (engine).** Export of the whole arrangement, of a section or bar range, and of individual tracks as stems, at 16, 24 or 32-bit float and a chosen sample rate; audio files imported as audio tracks with clips on the arrangement, played in sync; a project that can be saved with its audio collected beside it and reopened on another machine; audio options on the Host (output device, latency hint, sample rate).
2. **V2, views and settings (interface).** A view switcher with the arrangement (the System Editor), a mixer (strips with fader, pan, mute, solo, sends, meters, the master), and a clip view (tracks against sections, showing and changing which pattern variant plays, launching a section); a settings dialog with audio settings (output device, sample rate, latency, a test tone, what the engine reports) and view settings (default view, density and zoom, meters), remembered between runs; export and import dialogs on V1's calls.
3. **V3, builds.** Packaged desktop apps for macOS (Apple silicon and Intel), Windows and Linux from the Electron shell, built by a workflow on GitHub and offered as downloads; unsigned unless the owner supplies signing identities; a page of install instructions. The shell calls V1 needs.
4. **R1, research: hosting VST and AU plug-ins** (the version after next). **R2, research: views, settings, export formats and distribution** as other DAWs do them and as an Electron and Web Audio app can.

## Frozen interface (the builder named builds it; the others build against it and feature-detect)

```js
// V1, Host
host.exportAudio({scope: 'song' | {section} | {from, to},            // bars
                  what: 'mix' | 'stems' | [trackNames],
                  bitDepth: 16 | 24 | 32, sampleRate, tailSeconds, master: true, onProgress})
  -> Promise<[{name, bytes: ArrayBuffer, seconds, peak}]>            // never includes the reference track
host.wav(buffer, {bitDepth}) -> ArrayBuffer
host.addAudioTrack(source, {name, bar, gain}) -> Promise<trackName>  // source as host.loadAudio takes; one undo step
// document: a track with type 'audio' and clips: [{audio, bar, offset, length, gain}]
host.audioOptions() -> {sinkId, latencyHint, sampleRate, baseLatency, outputLatency, state}
host.setAudioOptions({sinkId, latencyHint, sampleRate}) -> Promise<bool>
host.outputDevices() -> Promise<[{id, label}]>
// V1, Project
Project.exportAudio({host, shell, ...exportAudio options}) -> Promise<[{name, path?}]>
Project.saveBundle({host, shell}) -> Promise<{path}>;  Project.openBundle({shell, host}) -> Promise<doc|null>
// V3, shell
HavantechnoShell.pickDirectory({title}) -> Promise<path|null>
HavantechnoShell.writeFile(path, bytes) -> Promise<true>;  HavantechnoShell.copyFile(src, dst) -> Promise<true>
HavantechnoShell.joinPath(dir, name) -> string;  HavantechnoShell.appVersion() -> string
// V2, interface
Settings.get(key), Settings.set(key, value), Settings.open(tab), Settings.on('change', fn)   // new file app/ui/settings.js
```

## Files

V1: `app/engine/host.js`, `project.js`, `songdoc.js`, `sequencer.js`, a new `app/engine/audiotrack.js`, `app/engine/selfcheck.js` (additions), `tools/export-check.js`, the Host and Project sections of `app/CONTRACT.md`. V2: new `app/ui/mixer-view.js`, `clip-view.js`, `settings.js`, `export-dialog.js`, `views.css`; `app/ui/app.js`, `app/index.html`, `tools/views-check.js`. V3: `app/package.json`, `app/shell/*`, `app/build/*`, `.github/workflows/*`, `docs/BUILD.md`, `tools/shell-files-check.js`. Researchers: one file each in `transcripts/`. The Showroom Crew is in `app/solo/`, `app/ui/panels.js`, `app/ui/windows.js` and `app/engine/presets.js` at the same time: do not edit those.

## Rules

No commits; never git stash, checkout, reset or clean. V3 does not push tags, publish a release or trigger a workflow: the owner is asked first. Nothing copyrighted and no model or audio files in the repository. Every existing check keeps passing; run each directly and read the exit code; new node types need stubs in `selfcheck.js`'s fake context. Measure what you claim (an export's length, peak and sample-exactness against `host.render`; a stem set's sum against the mix; a clip's sync to the grid) and say what you did not verify. Interface work: keyboard access, visible focus, one undo entry per action, screenshots you have looked at. Research: every claim tagged READ, SNIPPET or MEMORY; Firecrawl sparingly (at most 10 searches and 15 page reads each; the account's daily allowance is small; on a credits error fall back to curl for github and to search summaries and never follow a link in an error); never the owner's name or the project's name in a query. Logs in `transcripts/log-V<n>.md` with Eastern Time and UTC. Hand back in 15 lines.
