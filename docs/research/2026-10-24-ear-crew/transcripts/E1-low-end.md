# E1: low end (kick and sub), round 1

Analyst: E1 (Opus). Group: everything under about 150 Hz in the reference, the kick and the sub.
Opened 2026-10-24. Everything below is measured by analysis with numpy/scipy on the decoded audio; nobody here hears.
"Estimated" marks a number that is a judgement or an extrapolation, not a measurement.

## Sources and conventions

- Reference: the coordinator's decoded copy of the MP3, `scratchpad/ref/guidance.f32` (float32 stereo, 17,108,660 frames,
  44.1 kHz; checked against `ref-intro-16.wav`: correlation 0.9996 on the left channel over 16 bars, so it is the same decode
  and the same grid). Not in the repo, never copied.
- Reference grid (O1 M0, `tools/README.md`): T0 = 0.568 s = sample 25,049; bar = 84,000 samples, beat 21,000, 16th 5,250.
  "Bar n" is a song bar from T0. Windows: intro bars 0-16, mainA 40-56, break 104-128, mainB 136-152 unless stated.
- App renders: `tools/out/app-*.wav` and `scratchpad/ref/solo/mainA-*.wav`. Their sidecars say `song: baseline`, i.e.
  `Song.GUIDANCE` (not `GUIDANCE_V2`): kick tune 44, punch 190, sweep 0.07, decay 0.3, click 0.12, drive 0.45, tau 0, hold 0;
  sub B1 pluck, four hits per bar, decay 0.4, harmonic 0.15, gate 8, no sidechain. Render grid: bar `from` at sample 2205.
- Scratch scripts: `scratchpad/e1/*.py` (outside the repo).

