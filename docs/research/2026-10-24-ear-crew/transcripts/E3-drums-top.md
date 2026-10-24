# E3 transcript: drums above the kick (hats, clap, shaker, perc, sweeps)

Analyst E3 (Sonnet). Started 2026-10-24. Reference: scratchpad `ref/reference.mp3` and its 16-bar windows (never copied into the repo). Scripts and intermediate data live in the scratchpad folder `e3/` (not in the repo).
All numbers are measured unless marked (est.). Windows: ref-intro/mainA/break/mainB-16.wav, 1,344,000 samples each, 44.1 kHz, mono sum unless stated.

## Log

- Setup: no matplotlib in the sandbox, so no new spectrogram images; everything below is numeric (numpy/scipy). Demucs stems are not available (coordinator message), so all measures are on the mixed reference windows. Scripts `common.py`, `onset.py`, `grid.py` in scratchpad `e3/`.
- Window alignment (method: 150 Hz lowpass, Hilbert envelope, 30% of peak crossing at each beat): kick onset sits +11 to +13 ms after the window's bar grid in all four windows (std 6 to 23 ms because of the filtfilt smear). From the 6-16 kHz STFT flux (nfft 512, hop 64) the hat onsets peak 6 to 9 ms before the 16th grid line, i.e. the STFT window centre leads the onset by about 3 to 6 ms. I therefore use grid line minus 6 ms as the expected onset time (est., +-5 ms).
- First look (mainA, bars 3 and 4, 6-16 kHz flux): strong onsets at steps 2, 6, 10, 14 (level about -22 dB re band maximum, flux 45 to 68), at steps 4 and 12 (clap + kick, about -31 dB, flux 45 to 52), and weak ones at steps 0 and 8 (kick click, -37 dB, flux 21 to 25). Steps 1, 5, 9, 13 show only a tail. The offbeat hat decays about 13 dB in the first 100 ms and reaches -30 dB re its peak at about 330 ms (first rough read, refined below).
