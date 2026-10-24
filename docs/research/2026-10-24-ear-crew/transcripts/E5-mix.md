# E5 transcript: mix and master (Ear Crew)

Analyst E5 (Sonnet). Written as I go. Scratch scripts live in the scratchpad `e5/` folder (common.py, bands.py, loud.py), not in the repo.
No stems (Demucs blocked), so everything below is from the mixed reference (mono/mid/side from the decoded 44.1 kHz stereo MP3), the app's full render `tools/out/app-bars-0-200.wav`, and solo renders.

## 0. Setup and grids (measured)

- Reference decoded with `/usr/bin/ffmpeg` to float32 (coordinator's `guidance.f32`; checked bit-identical to a fresh `ffmpeg -t 20` decode of `reference.mp3`, max abs difference 0.0). 17,108,660 samples, 387.95 s.
- Reference grid: bar b starts at sample round(0.568*44100) + b*84000 = 25,049 + 84,000 b (126 BPM, straight, per `tools/README.md`).
- App grid: `app-bars-0-200.json` sidecar: gridStartSample 2205, bar b starts at 2205 + 84,000 b; render is `song: baseline` (the `GUIDANCE` preset, not V2), 16-bit PCM, 16,914,660 samples (383.55 s), sample peak 0.578 (-4.76 dBFS) against the reference's 0.980 (-0.18 dBFS).
- Sections (the app's nine, from `song.js`): intro 0-16, intro2 16-24, build 24-40, mainA 40-72, mainA2 72-104, break 104-128, breakEnd 128-136, mainB 136-184, outro 184-200. Same bars used on both files. The `breakLate` split at bar 120 exists only in GUIDANCE_V2, not in this render.
- Band method: mid = (L+R)/2, side = (L-R)/2; `scipy.signal.welch`, Hann, nperseg 16384 (2.7 Hz bins), 50 % overlap, scaling 'spectrum'. 1/3-octave bands at ISO centres 25 Hz to 16 kHz (29 bands), edges fc/2^(1/6) to fc*2^(1/6); band power = sum of PSD bins inside the edges. "Section total" = mid power + side power over the whole spectrum (equals the mean of L and R power). Check: the same code on mid alone with the coordinator's six coarse bands on the 16-bar windows reproduces his table (intro -6.3/-2.9/-6.0/-24.3/-31.3/-50.1 against his -49.9; mainA, break, mainB identical to 0.1).
- Differences are app minus reference, in dB relative to each file's own section total, so they are balance differences, not loudness differences.

