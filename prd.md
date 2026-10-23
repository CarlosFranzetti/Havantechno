# Product requirements: Havantechno studio

Status: written from the code as it stands on `claude/song-synths-sequencer-processors-e79zyb`, 2026-10-23. Where a requirement describes what the code already does, it says so. Anything not built yet lives in `future.md`.

## 1. Purpose

The Havantechno studio is a Web Audio page that recreates a Guidance-style electro track (126 BPM, key B). It has one synth per element, a 16-step sequencer that runs a 200-bar arrangement, a processor rack, and WAV export.

## 2. Users

- **Producers and tinkerers** open `studio/` to listen to the track, change any synth or processor parameter live, and export a section or the whole song.
- **Developers and coding agents** change the track's patterns in `studio/song.js` or the processors in `studio/processors.js` and reload. They need no toolchain.

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
| S11 | `node studio/selfcheck.js` runs without a browser and passes its checks. | Built (161 checks pass) |
| S12 | The lead melody and the chord progression are transcribed from the reference track. | **Not built.** The current material is an inspired version |

## 4b. Direction set on 2026-10-23 (not built)

The owner set a longer-term direction for the studio. None of it is built; it is recorded here so the requirements and the research in `docs/research/` point the same way.

| ID | Requirement | Status |
|----|-------------|--------|
| D1 | Each device (instrument or processor) has its own panel and look, the way a DAW shows a different view per device, instead of identical slider lists. | Not built |
| D2 | The reference track lives in the studio as a modifiable track: every element as a separate stem with its own MIDI and parameters, all tweakable. | Not built |
| D3 | A remix pipeline: source song → stems → MIDI and parameter data → loaded into the studio → the song recreated with the existing synths and processors, with a modified one, or with a new one when nothing fits. | Not built |
| D4 | A researched gear list of plugins, instruments, effects and analysis tools that could achieve D3, with what can run in a browser. | In progress, see `docs/research/2026-10-23-plugin-gear/` |

## 5. Acceptance criteria

- `node studio/selfcheck.js` exits 0 and prints `OK: N checks passed`.
- Opening `/studio/` and pressing Play plays audio with no page errors, and jumping to `mainA` keeps it playing.
- Exported section and song WAV files open in an audio editor at the stated length and sample rate.

## 6. Out of scope

- Saving or loading songs, MIDI input, and plug-in formats.
- Any server-side component.

## 7. Open questions

- The studio's 300 Hz to 1 kHz band is several dB hotter than the reference in every section. This was measured, not listened to. Is the balance wanted as it is?
