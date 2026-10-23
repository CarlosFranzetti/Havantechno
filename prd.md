# Product requirements: Havantechno studio

Status: written from the code as it stands on `claude/song-synths-sequencer-processors-e79zyb`, 2026-10-23. Where a requirement describes what the code already does, it says so. Anything not built yet lives in `future.md`.

## 1. Purpose

The Havantechno studio is a Web Audio page that recreates a Guidance-style electro track (126 BPM, key B). It has one synth per element, a 16-step sequencer that runs a 200-bar arrangement, a processor rack, and WAV export.

## 2. Users

- **Producers and tinkerers** open `olde Havantechno dub studio/` to listen to the track, change any synth or processor parameter live, and export a section or the whole song.
- **Developers and coding agents** change the track's patterns in `olde Havantechno dub studio/song.js` or the processors in `olde Havantechno dub studio/processors.js` and reload. They need no toolchain.

## 3. Constraints

- **C1. No build step, no package manager, no audio files.** Plain JS globals loaded by `<script>` tags. Every sound is synthesised in the browser.
- **C2. No network at runtime.** The studio fetches nothing after load.
- **C3. Runs from a static HTTP server.** The README says to use `python3 -m http.server`.
- **C4. Silent until a gesture.** Audio starts only after the user presses Play.
- **C5. Never throws without an AudioContext.** Every instrument and processor is a no-op when the context is missing.

## 4. Studio requirements

| ID | Requirement | Status |
|----|-------------|--------|
| S1 | Thirteen instruments, one per element of the track: kick, sub, bass, stab, clap, closed and open hats, shaker, perc, lead, pad, riser, impact. | Built |
| S2 | Each instrument exposes `trigger`, `set`/`get`, `panic` and `dispose`, and every live voice can be stopped. | Built |
| S3 | A 16-step sequencer with swing, a lookahead scheduler (25 ms tick, 120 ms lookahead), pattern notation (`x`, `X`, `o`, `.`) and melody notation with sustain (`-`). | Built |
| S4 | A 200-bar arrangement across nine sections (intro, intro2, build, mainA, mainA2, break, breakEnd, mainB, outro), with per-section play maps, parameter sets and ramps. | Built |
| S5 | Ten processors: filter, saturator, delay (tempo-synced ping-pong), reverb, eq3, compressor, limiter, sidechain ducker, widener, chorus. | Built |
| S6 | A master chain of EQ, highpass, lowpass, glue compressor, saturator and limiter. | Built |
| S7 | Live tweaking of every track's level, pan, sends, duck depth and synth parameters, plus its insert processors, from the page. | Built |
| S8 | Mute and solo per track. | Built |
| S9 | Jump to a section, loop it, and play, pause, stop, rewind. | Built |
| S10 | Export the current section or the whole song as 16-bit PCM WAV, rendered offline. | Built |
| S11 | `node "olde Havantechno dub studio/selfcheck.js"` runs without a browser and passes its checks. | Built (161 checks pass) |
| S12 | The lead melody and the chord progression are transcribed from the reference track. | **Not built.** The current material is an inspired version |

## 4b. Direction set on 2026-10-23 (not built)

The owner set a longer-term direction for the studio. None of it is built; it is recorded here so the requirements and the research in `docs/research/` point the same way.

| ID | Requirement | Status |
|----|-------------|--------|
| D1 | Each device (instrument or processor) has its own panel and look, the way a DAW shows a different view per device, instead of identical slider lists. | Not built |
| D2 | The reference track lives in the studio as a modifiable track: every element as a separate stem with its own MIDI and parameters, all tweakable. | Not built |
| D3 | A remix pipeline: source song → stems → MIDI and parameter data → loaded into the studio → the song recreated with the existing synths and processors, with a modified one, or with a new one when nothing fits. | Not built |
| D4 | A researched gear list of plugins, instruments, effects and analysis tools that could achieve D3, with what can run in a browser. | In progress: Gear Crew round 1 done, round 2 running, see `docs/research/2026-10-23-plugin-gear/` |
| D6 | **Desktop platform.** Havantechno becomes a Mac or PC DAW, not a browser-only page, so it can host real plugins and use more power. The browser studio stays as the archived first step. Platform choice (wrap the existing Web Audio code in a desktop shell, or go native) is open. | Direction set 2026-10-23, not built |
| D8 | **Samples as elements.** A source track's sample-based elements (vocals first) become sampler tracks sliced from the separated stems, editable per section and processed like any other track; the pipeline decides synth vs sample per element. | Direction set 2026-10-23, not built |
| D7 | **Views.** The voted layout is one view, named **System Editor**. A second view, **Step View**, shows the same shape but lets every step of every track's sequence be edited (hit, accent, note, per-step parameters). A Logic-like main window with **floating windows per device**, each with its own look, is the third element. | Direction set 2026-10-23, not built |
| D5 | A researched DAW layout, with Ableton Live and Logic Pro as references, chosen by group discussion and vote, with mockups. | Researched: Strip Bench chosen (8 of 12 first places). Report, discussion, vote and mockups in `docs/research/2026-10-23-faceplate-layout/`. Not built. |

## 5. Acceptance criteria

- `node "olde Havantechno dub studio/selfcheck.js"` exits 0 and prints `OK: N checks passed`.
- Opening `/olde%20Havantechno%20dub%20studio/` and pressing Play plays audio with no page errors, and jumping to `mainA` keeps it playing.
- Exported section and song WAV files open in an audio editor at the stated length and sample rate.

## 6. Out of scope

- Saving or loading songs, MIDI input, and plug-in formats.
- Any server-side component.

## 6b. Decisions taken on 2026-10-23

The owner answered the questions the research raised:

| # | Decision | Answer | What it rules in |
|---|----------|--------|------------------|
| 1 | Desktop shell | **Electron** around the existing JavaScript and Web Audio engine. | All current code and the Faceplate UI carry over; files, save/load and a Python sidecar. Plugin hosting stays a later decision behind a `Host` interface. |
| 2 | Repo licence | **Whatever lets everything be used.** Recorded as **AGPL-3.0-or-later**: it is compatible with the GPL-3.0 and AGPL-3.0 sources the research found (Surge XT, junox, webOBXD, Mz101, Dragonfly, ZL EQ, Essentia.js, openDAW) and with JUCE's AGPL option, and permissive code (MIT, BSD, Apache, ISC) can be included. Anyone who distributes the app or serves it over a network must offer its source. CC BY-NC models (madmom, LarsNet) remain non-commercial under their own terms regardless. | 
| 3 | Editing and saving | **Version 1 edits the song and saves it.** A song is saved under a name and stays an editable track in the DAW. Save/load is in scope from the first build. | The step record, the song document and the JSON save format come first in the build order. |
| 4 | Audio files | **Yes, and samples are a first-class element.** The owner's clarification: every source track provided is a different track; when it is separated into elements, any element that is itself a sample (vocal samples, found sounds, anything a synth should not imitate) stays a sample, played by a **sampler track** from the separated audio, and runs through the same processors as the synth tracks. The rest of the elements are recreated by synths. Files are loaded at runtime from the user's tracks; the repo itself ships no audio. | A `sampler` instrument (buffer or slice, start/end, pitch, gain, envelope, choke) joins the synth list; the load/modify/create rule gains a fourth outcome, **sample**; stems are sliced per section so each slice is editable like any step. |

## 7. Open questions

Raised by the research and waiting on the owner:

- **Desktop shell.** Decided: Electron (6b). Kept here for the record of the options: Electron or Tauri around the existing JavaScript and Web Audio engine (keeps all current code; plugin hosting needs a native bridge), or a native app (JUCE in C++, or Swift on Mac) with the engine rewritten. This decides almost everything else about plugin hosting.

- **Licence.** The repo has no LICENSE file. Several candidate engines are GPL or AGPL (webOBXD, junox, Dexed, Mz101, Dragonfly Reverb, openDAW). Without a decision, only MIT/BSD/Apache code and reimplementation from published algorithms are safe.
- **Offline or in-browser analysis.** Stem separation and transcription tools mostly run in Python. May the pipeline run offline and export a bundle (stems, MIDI, tempo/key/sections JSON) that the page imports?
- **Audio files.** The studio has none by design. A stems workflow needs them, at least for the source.
- **Hosting headers.** Browser-side separation and SharedArrayBuffer need COOP/COEP headers, which `python3 -m http.server` does not send.

Earlier:

- The studio's 300 Hz to 1 kHz band is several dB hotter than the reference in every section. This was measured, not listened to. Is the balance wanted as it is?
