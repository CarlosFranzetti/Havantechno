# E4: arrangement and samples (Ear Crew)

Analyst: E4 (Sonnet). Written 2026-10-24. Everything below is measured from the mixed reference (`reference.mp3`, scratchpad, never copied here); Demucs stems were not available (model download blocked), so no number comes from a separated stem. Nobody heard anything: "measured" is the only verb. Estimates are marked **(est.)**. No web searches were used.

Scripts and intermediates live in the scratchpad (`.../scratchpad/e4/`: `bars.py`, `third.py`, `grid.py`, `resid.py`, `offgrid.py`, `scores.py`). All times are on the reference grid: bar b starts at `0.568 + 1.9047619·b` s, 16th step = 119.05 ms, 126 BPM.

## 0. Method, so each number can be reproduced

- **Decode**: the scratchpad's `guidance.f32` (44.1 kHz stereo float, 17,108,660 samples = 387.951 s). Mono = (L+R)/2 unless said.
- **Per-bar bands (table 1)**: scipy STFT, 4096 Hann, hop 1024, power summed in six bands, averaged over frames whose centre lies in the bar. "dB re total" = band power / sum of the six bands. Hat onset counts: >6 kHz Butterworth-4 highpass, 256-sample RMS, rises >0.35 in log, 40 ms minimum spacing. **Counts are only meaningful where the 8 kHz level is above about −60 dB; below that they are noise-floor flux and are shown as "-".**
- **Per-bar 1/3-octave levels (table 2 and every "step" below)**: STFT 8192 Hann, hop 2048, 1/3-octave bands 31.5 Hz to 16 kHz, mean power per bar. Steps were read from the per-bar values, not from differences of 4-bar means (4-bar differences smear a step into a ramp; I checked bars 40, 104, 120, 136, 184 per bar).
- **16th-grid profiles**: STFT 2048 Hann, hop 441, band energy averaged inside each 16th step, median over the bars of a window. Used to find which steps a layer plays on.
- **Loudness**: ffmpeg `ebur128` momentary (400 ms) LUFS, energy-averaged per bar.
- **Non-repeating content (samples, vocals)**: three tests, section 5.

## 1. Bar-by-bar map (table 1, per 4-bar phrase)

| bars | start s | total dB | 20-60 | 60-120 | 120-300 | 300-1k | 1-4k | 4-16k | 8 kHz 1/3-oct dB | hat onsets/bar | LUFS-M | note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0-3 | 0.6 | -12.4 | -7.0 | -2.5 | -6.4 | -23.6 | -31.5 | -52.4 | -80.7 | - | -10.6 | intro; kick+drone; event bar 3 |
| 4-7 | 8.2 | -12.4 | -7.0 | -2.5 | -6.4 | -24.0 | -31.9 | -51.3 | -79.1 | - | -10.5 | event bar 7 |
| 8-11 | 15.8 | -12.4 | -7.0 | -2.5 | -6.4 | -24.0 | -31.7 | -50.0 | -78.1 | - | -10.6 | event bar 11; HF starts to creep |
| 12-15 | 23.4 | -12.4 | -6.9 | -2.5 | -6.4 | -24.2 | -30.3 | -48.0 | -76.5 | - | -10.5 | event 15 |
| 16-19 | 31.0 | -12.4 | -6.9 | -2.5 | -6.3 | -23.7 | -28.4 | -43.2 | -71.5 | - | -10.5 | intro2 (app); event 19 |
| 20-23 | 38.7 | -12.4 | -6.9 | -2.5 | -6.4 | -22.0 | -28.1 | -37.3 | -64.4 | - | -10.5 | event 23 (largest) |
| 24-27 | 46.3 | -13.9 | -7.8 | -3.0 | -5.3 | -15.7 | -25.0 | -27.2 | -48.3 | 14 | -11.7 | BUILD: HF +12 dB step, kick sinking |
| 28-31 | 53.9 | -14.4 | -8.1 | -3.2 | -4.9 | -14.6 | -23.6 | -22.9 | -43.5 | 12 | -12.0 |  |
| 32-35 | 61.5 | -14.9 | -8.3 | -3.6 | -4.6 | -13.6 | -20.9 | -19.7 | -40.1 | 14 | -12.3 |  |
| 36-39 | 69.1 | -15.2 | -8.6 | -3.9 | -4.4 | -12.8 | -18.1 | -17.0 | -37.7 | 11 | -12.4 | kick lowest (-4.5 dB peak) |
| 40-43 | 76.8 | -12.5 | -6.9 | -2.8 | -6.5 | -16.2 | -20.2 | -18.5 | -36.7 | 11 | -10.3 | MAIN A: kick back, clap in, loudness +2.1 LU |
| 44-47 | 84.4 | -12.5 | -6.9 | -2.8 | -6.5 | -17.2 | -20.4 | -18.4 | -36.7 | 10 | -10.3 |  |
| 48-51 | 92.0 | -12.5 | -7.1 | -2.8 | -6.4 | -15.2 | -20.2 | -18.5 | -36.8 | 12 | -10.2 |  |
| 52-55 | 99.6 | -12.5 | -7.0 | -2.8 | -6.6 | -14.5 | -20.2 | -18.5 | -36.7 | 10 | -10.2 |  |
| 56-59 | 107.2 | -12.6 | -7.0 | -2.9 | -6.5 | -14.7 | -19.7 | -17.5 | -35.6 | 15 | -10.2 | on-beat HF layer enters (bar 56) |
| 60-63 | 114.9 | -12.6 | -7.0 | -2.9 | -6.5 | -14.3 | -19.9 | -17.4 | -35.5 | 13 | -10.2 |  |
| 64-67 | 122.5 | -12.6 | -7.0 | -2.9 | -6.5 | -15.0 | -19.7 | -17.5 | -35.5 | 15 | -10.2 |  |
| 68-71 | 130.1 | -12.6 | -7.0 | -2.9 | -6.4 | -14.7 | -19.8 | -17.5 | -35.6 | 13 | -10.2 |  |
| 72-75 | 137.7 | -12.6 | -6.9 | -2.9 | -6.6 | -14.9 | -19.8 | -17.5 | -35.6 | 15 | -10.3 | (no step at 72) |
| 76-79 | 145.3 | -12.6 | -6.9 | -2.9 | -6.5 | -14.3 | -20.1 | -17.5 | -35.6 | 13 | -10.2 |  |
| 80-83 | 152.9 | -12.6 | -7.0 | -3.0 | -6.4 | -13.5 | -19.9 | -17.6 | -35.6 | 14 | -10.2 |  |
| 84-87 | 160.6 | -12.6 | -7.0 | -2.9 | -6.6 | -13.6 | -19.9 | -17.6 | -35.6 | 14 | -10.2 |  |
| 88-91 | 168.2 | -12.7 | -7.0 | -2.9 | -6.4 | -15.0 | -19.9 | -18.4 | -36.4 | 14 | -10.3 | offbeat HF and drone start fading |
| 92-95 | 175.8 | -12.8 | -7.2 | -2.9 | -6.5 | -13.1 | -20.3 | -20.5 | -38.7 | 13 | -10.4 | drone fade (31 Hz) |
| 96-99 | 183.4 | -12.8 | -7.3 | -2.8 | -6.3 | -13.7 | -20.5 | -22.0 | -39.9 | 14 | -10.5 |  |
| 100-103 | 191.0 | -12.9 | -7.4 | -2.7 | -6.3 | -13.9 | -20.7 | -22.8 | -40.6 | 11 | -10.6 | drone -15 dB |
| 104-107 | 198.7 | -16.1 | -11.6 | -4.0 | -3.8 | -10.5 | -17.0 | -20.6 | -41.0 | 14 | -12.9 | BREAK: kick -6.5 dB at 50 Hz, drone gone, clap out |
| 108-111 | 206.3 | -15.9 | -11.7 | -4.0 | -3.9 | -10.0 | -17.5 | -20.7 | -41.1 | 16 | -12.7 |  |
| 112-115 | 213.9 | -15.7 | -11.9 | -4.2 | -3.9 | -9.1 | -18.0 | -20.6 | -41.0 | 18 | -12.5 |  |
| 116-119 | 221.5 | -15.7 | -12.0 | -4.2 | -4.0 | -8.5 | -18.0 | -20.4 | -40.7 | 16 | -12.4 | 1 kHz +4 dB |
| 120-123 | 229.1 | -15.7 | -12.1 | -4.2 | -4.0 | -8.6 | -16.9 | -26.7 | -49.1 | 10 | -12.4 | hats out (4-16k -8 dB), 1.3 kHz +6 |
| 124-127 | 236.8 | -15.7 | -12.0 | -4.2 | -3.9 | -9.3 | -14.6 | -26.4 | -50.1 | 4 | -12.4 |  |
| 128-131 | 244.4 | -15.6 | -11.8 | -4.3 | -4.0 | -9.3 | -13.8 | -25.1 | -48.2 | 7 | -12.3 | hats back, crescendo; drone fades in 129-134 |
| 132-135 | 252.0 | -15.4 | -10.0 | -4.4 | -4.2 | -10.0 | -13.8 | -19.9 | -41.5 | 7 | -12.1 | bar 135 beat 4 gap |
| 136-139 | 259.6 | -12.4 | -7.3 | -3.1 | -6.4 | -11.9 | -19.0 | -18.6 | -36.7 | 11 | -9.9 | MAIN B: kick, drone back, loudness +2.4 LU |
| 140-143 | 267.2 | -12.3 | -7.3 | -3.2 | -6.5 | -10.8 | -20.1 | -18.7 | -36.7 | 11 | -9.8 |  |
| 144-147 | 274.9 | -12.3 | -7.2 | -3.1 | -6.4 | -11.7 | -19.9 | -18.7 | -36.7 | 12 | -9.9 |  |
| 148-151 | 282.5 | -12.4 | -7.2 | -3.1 | -6.4 | -12.1 | -19.9 | -18.6 | -36.6 | 10 | -9.9 |  |
| 152-155 | 290.1 | -12.5 | -7.2 | -3.2 | -6.4 | -11.6 | -19.5 | -17.7 | -35.6 | 14 | -9.9 | on-beat HF layer enters (bar 152) |
| 156-159 | 297.7 | -12.4 | -7.3 | -3.1 | -6.5 | -11.3 | -19.4 | -17.7 | -35.5 | 13 | -9.9 |  |
| 160-163 | 305.3 | -12.4 | -7.3 | -3.2 | -6.4 | -11.1 | -19.0 | -17.8 | -35.5 | 14 | -9.9 |  |
| 164-167 | 312.9 | -12.4 | -7.2 | -3.2 | -6.4 | -11.3 | -18.9 | -17.9 | -35.8 | 13 | -9.9 |  |
| 168-171 | 320.6 | -12.4 | -7.2 | -3.1 | -6.4 | -11.7 | -19.7 | -18.0 | -35.9 | 14 | -9.9 | 1.27 kHz element leaves (168) |
| 172-175 | 328.2 | -12.4 | -7.2 | -3.1 | -6.4 | -12.0 | -20.1 | -18.2 | -36.0 | 13 | -9.9 |  |
| 176-179 | 335.8 | -12.5 | -7.1 | -3.0 | -6.3 | -12.8 | -19.9 | -18.2 | -36.2 | 13 | -10.1 |  |
| 180-183 | 343.4 | -12.5 | -7.1 | -3.0 | -6.4 | -13.1 | -19.8 | -18.2 | -36.1 | 11 | -10.1 | event 183 |
| 184-187 | 351.0 | -12.5 | -7.0 | -2.8 | -6.4 | -13.9 | -23.8 | -30.6 | -51.0 | 8 | -10.4 | OUTRO: hats out, >3 kHz -10 dB |
| 188-191 | 358.7 | -12.6 | -7.0 | -2.8 | -6.4 | -14.0 | -24.5 | -30.7 | -51.3 | 7 | -10.4 | event 187 |
| 192-195 | 366.3 | -12.5 | -7.0 | -2.8 | -6.4 | -14.2 | -24.6 | -31.0 | -51.7 | 7 | -10.4 | event 191 |
| 196-199 | 373.9 | -12.5 | -6.9 | -2.7 | -6.4 | -15.5 | -24.3 | -31.0 | -51.6 | 6 | -10.5 | event 195, 199; last kick bar 199 beat 4 |