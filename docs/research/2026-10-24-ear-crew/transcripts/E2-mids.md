# E2 transcript: mid harmonic content (bass line, stab or chord, lead, pad)

Analyst E2 (Sonnet), Ear Crew, 2026-10-24. Reference: scratchpad `ref/reference.mp3` and its 16-bar cut windows (never copied into the repo). Working scripts live in the scratchpad `e2/` folder, not in the repo. Everything here is measured by analysis; nobody listens.

## Log

- Read BRIEF.md, `app/engine/song.js` (GUIDANCE, GUIDANCE_V2), `synths.js` (bass, stab, lead, pad builders).
- Engine facts: `bass` = two detuned saws + square an octave down -> resonant lowpass (cutoff + env*vel decaying over `decay`), gain 0.5*vel. `stab` = per chord note a detuned saw pair, panned, shared lowpass, highpass `hp`. Chord names come from `K.chordNotes(name, octave)`: Bmaj9 at octave 4 = 71,75,78,82,85 (B4 D#5 F#5 A#5 C#6, selfcheck.js line 119). Stab track GUIDANCE: `octave: 4`, patterns A `..x...xx..x...xx`, B `..x...x...x...x.`, C `..x.......x.....`, progression Bmaj9, Bmaj9, G#m7, Emaj7 (one chord per bar). Bass track GUIDANCE: note B2 (a `note:` track, so every hit plays B2 = 123.47 Hz), patterns A `...x...x..x...x.`, B `..x...x.x...x.x.`, C `...x......x...x.`. V2 changes only bass params (cutoff 220, env 100, res 3, decay .15, drive 0, sub 0).
- Sections (GUIDANCE): intro 0-16 bass A, intro2 16-24, build 24-40, mainA 40-72 (bass A, stab A), mainA2 72-104 (bass B, stab A, lead B), break 104-128 (bass C, stab B, pad A, lead A), breakEnd 128-136, mainB 136-184 (bass B, stab A, lead B), outro.
