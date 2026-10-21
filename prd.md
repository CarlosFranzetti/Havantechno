# Product requirements: aasssMaster and the Havantechno studio

Status: written from the code as it stands on `claude/song-synths-sequencer-processors-e79zyb`, 2026-10-21. Where a
requirement describes what the code already does, it says so. Anything not built yet lives in `future.md`.

## 1. Purpose

This repo holds two browser-only products that share nothing except the repo and the no-build rule:

1. **aasssMaster**, a vertical shoot-'em-up played in the browser, with a hairy-butt alien theme. All art and sound are
   generated in code.
2. **The Havantechno studio**, a Web Audio page that recreates a Guidance-style electro track (126 BPM, key B). It has
   one synth per element, a 16-step sequencer with a 200-bar arrangement, a processor rack, and WAV export.

## 2. Users

- **Players** open `index.html` on a phone or desktop and play a three-stage run.
- **Producers and tinkerers** open `studio/` to listen to the track, change any synth or processor parameter live, and
  export a section or the whole song.
- **Developers and coding agents** change the games data in `js/levels.js` or the studio's patterns in `studio/song.js`
  and reload. They need no toolchain.

## 3. Constraints (apply to every feature)

- **C1. No build step, no package manager, no external assets.** Plain JS globals loaded by `<script>` tags.
  Every sprite, sound and impulse response is generated at runtime.
- **C2. No network at runtime.** Neither product fetches anything after load.
- **C3. Runs from a static HTTP server.** The README says to use `python3 -m http.server`.
- **C4. Silent until a gesture.** Web Audio starts only after a user tap or key press.
- **C5. Never throws on missing pieces.** A missing sprite draws a magenta box (per CONTRACT.md); a missing track falls
  back to `stage1` with one console warning.

## 4. Game requirements (aasssMaster)

| ID | Requirement | Status |
|----|-------------|--------|
| G1 | Fixed 384×216 logical canvas, scaled to the screen with pixelated rendering. | Built |
| G2 | Three stages (HAIRY NEBULA, THE CRACK OF DOOM, RECTUM OF THE GODS) with a boss at the end of each. | Built |
| G3 | Stages 2 and 3 have a mid-boss (at 40 s and 45 s). Stage 1 has none. | Built |
| G4 | Ten regular enemy types, one mid-boss, three bosses, all defined as data in `js/levels.js`. | Built |
| G5 | Keyboard controls (arrows or WASD to move, Z/Space/Ctrl to fire, X to charge a beam, C/Shift for Force, B for bomb, P/Esc to pause, M to mute, V for haptics). | Built |
| G6 | Touch controls: drag on the left side to move, tap to throw Force, hold on the right side to fire, hold longer for the beam. | Built |
| G7 | Power-ups (power, speed, shield, option), a Force pod, lives, continues and a hi-score. | Built |
| G8 | After the third stage the run loops with scaled boss HP and loop modifiers or mutators. | Built |
| G9 | Music per stage and per boss, sound effects, all synthesised. | Built |
| G10 | The engine boots with zero console errors when every module is present, and keeps running when a sprite or sound is missing (CONTRACT.md C7). | Built, checked by hand |
| G11 | `Levels.validate()` reports unknown names, budget overruns and quiet gaps as warnings at load. | Built |
| G12 | A committed automated test that drives a headless run of the game. | **Not built** (CONTRACT.md C8 describes one) |

## 5. Studio requirements (Havantechno)

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

## 6. Acceptance criteria

- `node studio/selfcheck.js` exits 0 and prints `OK: N checks passed`.
- Opening `/` and pressing Space starts the stage with no page errors in the browser console.
- Opening `/studio/`, pressing Play and jumping to `mainA` plays audio with no page errors.
- Exported section and song WAV files open in an audio editor at the stated length and sample rate.

## 7. Out of scope

- Saving or loading songs, MIDI input, and plug-in formats.
- Multiplayer, leaderboards, and accounts.
- Any server-side component.

## 8. Open questions

- The studio's 300 Hz to 1 kHz band is several dB hotter than the reference in every section. This was measured, not
  listened to. Is the balance wanted as it is?
- Stage 1 has no mid-boss while stages 2 and 3 do. Is that intended?
