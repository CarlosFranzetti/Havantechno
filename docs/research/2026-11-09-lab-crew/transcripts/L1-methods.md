# L1: methods for element classification (Lab Crew, batch 3)

Analyst: L1 (Opus). Opened 2026-11-08 23:20 ET (2026-11-09 04:20 UTC), closed 2026-11-09 00:40 ET (05:40 UTC).
Everything below was either measured here with numpy, scipy, torch and onnxruntime on files in `tools/out/`, or is cited
from a page I saw. Nobody listened. "Est." marks a judgement. Scripts are in my scratchpad (`l1/s/*.py`), not in the
repository; the ones the build plan needs are described well enough to be rewritten (section 9).

## 0. Answers in one place

| Decision | Method that worked here | Result on labelled material | Reliability (est.) |
|---|---|---|---|
| Separation in this sandbox | KUIELab MDX-Net ONNX models (drums, bass, other) from GitHub release assets, run with onnxruntime on CPU | runs at about 2x real time; SDR on a linear mix of the V3 solos: drums 9.7 dB, bass 7.5, other 15.9 | usable now; Demucs v4 would be about 1.5 dB better on average (its README's table) |
| Synth or sample | per-band "nearest twin": the best normalised cross-correlation between aligned hits, by band; a pitch-normalised version for melodic samplers; formant tracking across notes | every noise-based engine voice read "synth" (twin 0.10 to 0.28); every sampled track read "sample" (twin 1.00), including round robins, a pitched sampler and a 6-bit hat; a sampled hat kept its identity through the mix (0.99) and through separation (0.95) | high for noise-bearing sounds; **undecidable for deterministic synthesis** (the engine's kick, bass and stab also read 1.00) |
| Mono or poly | iterative multi-F0 (harmonic sum, estimate and cancel with a smoothness cap, Klapuri's principle), median count over frames | stab 6 notes (truth 6), pad 6 (6), bass 1 (1), sub 1 (1); pitch-class precision/recall stab 0.94/0.81, pad 1.00/0.95 | high for counting on a solo or a clean stem; octave errors and sub-octave ghosts remain |
| FM or subtractive | model comparison on harmonic-amplitude frames: best fit of a 2-operator FM family against a saw/square plus resonant lowpass family | 10 of 11 synthetic and engine notes right, 1 undecided (1:2 FM, which gives odd harmonics like a filtered square); the FM ratio recovered in all 5 FM cases | medium-high on mono notes; not built for chords |
| Reverb present | free-decay slope after the last hit (Schroeder backward integration); side-channel energy for centred sources | the 5 tracks with a reverb send read 2.0 to 2.9 s late slope; the 4 dry tracks read 0.04 to 0.10 s | high on solos and stems with a free decay |
| RT60 | Schroeder EDC fit at -25 to -45 dB on a free decay | clap 2.05 s, hat 2.21, burst 2.06, pad 2.04 against the engine reverb's own T30 of 1.94 to 2.02 s and T20 of 2.16 to 2.20 s computed from its impulse formula | within 10 % on a free decay; mid-song estimate (no free decay) read 2.63 s, which is the IR's EDT (2.5 to 2.7 s), not its T30 |
| Pre-delay | lag of the wet (side) onset behind the dry (mid) onset | clap 15.9 ms against 15 ms | good for a centred dry source only; failed on the panned hat (0.8 ms, then 7.0 ms) |
| Built-in against outboard | cluster the late tails of all elements by RT per band and tail/head colour; one cluster = one shared send; a singleton = element-specific | clap, hat and burst clustered as one reverb (colour distance 1.4 to 3.0 dB, RT log-ratio under 0.15); a synthetic plate on the tick came out as a separate reverb (6.3 to 7.5 dB, 1.0) | the measurable question is "shared or element-specific"; "built into the synth or an outboard unit" is not measurable from audio, only guessable (section 5.5) |
| 808 / 909 / sample | kick: pitch-glide fit, decay, click ratio; hats: sample identity plus fixed spectral lines | the V3 kick's glide recovered as 53.3 Hz end, 22.3 ms tau (truth 53, 22); the baseline kick's end 43.6 Hz (truth 44); both read "909-like swept VCO", a self-made 808-style control read "808-like"; hats read "not a sample", so not 909 | medium; the real test needs batch 2's recreations as reference points |
| Nearest recreation | a feature rule tree to an engine instrument type, then parameter fitting | 7 of 10 solos mapped to the right type; the bass went to "kick" (its filter sweep read as a pitch glide), the stab to "pad" (the sidechain moved its envelope peak late), the clap to the bright-noise class | rules are not enough; analysis by synthesis against the engine's own instruments is the method to build |

## 1. Sources, material and conventions

- Brief: `docs/research/2026-11-09-lab-crew/BRIEF.md`; roadmap `docs/plans/2026-11-09-roadmap.md` (batch 3, and batch 4's separation question); Ear Crew `REPORT.md`, `E1-low-end.md` (methods section 1: beat template, Hilbert glide fits, incoherent click power), `E4-arrangement-samples.md` (section 4: the three no-sample tests, the waveform-similarity sample test, the end-tail RT60 by band). `tools/score.py` (I reused its `fit_glide`).
- Ground truth: the V3 song (`app/engine/song.js`, `GUIDANCE_V3`) and the instruments in `app/engine/synths.js`. Per track: kick = sine with a pitch envelope (punch 265 Hz to tune 53 Hz, tau 22 ms), a 20 ms attack, a 197 ms length gate, a lowpassed noise click and a triangle knock; sub = drone sine at C#1 with two beat partials, ducked by the kick; bass = detuned saw pair through a resonant lowpass with an envelope, mono line (G#1), 4th-order highpass at 95 Hz; stab = six-note G#m11 voicing (G#3 B3 D#4 F#4 A#4 C#5, from `core.js` `m11f` on octave 3), each note a detuned saw pair panned apart, one lowpass with an envelope, reverb send 0.10 and delay send 0.15; pad = same chord, slow attack, reverb send 0.40; clap = flams of bandpassed noise plus a **built-in** mono noise tail (`tail` 0.3, `tailDecay` 0.25 s), reverb send 0.25; hat_open = highpassed noise plus a six-square "metal" bank at 1500 Hz x (0.62 ... 1.73), metal 0.15, pan 0.08, reverb send 0.12; shaker, shaker_on, tick, burst = bandpassed-noise shaker voices (burst hard left, decorrelated, reverb send 0.35). The reverb send is `processors.js` reverb, algo 'ir': stereo decaying noise of 2.4 s, decay 0.55, highpass 220 Hz, a lowpass at 4500 Hz, pre-delay 15 ms.
- There is **no sampler track and no FM instrument in V3**. I made labelled sampler material in Python by doing what the engine's sampler does (replaying one buffer, linear interpolation for transposition, random velocity 0.7 to 1.0) with hits cut from the engine's own solos: `smp_kick`, `smp_hat`, `smp_hat_rr3` (three round-robin hits), `smp_hat_6bit` (quantised to 6 bits), `smp_stab_pitched` (one stab chord replayed at 0, +2, -3, +5 semitones). FM and subtractive notes for decision C are synthesised in Python (2-operator FM with a decaying index; saw or square through a time-varying resonant state-variable lowpass). These are self-made labels and are marked so in every table.
- Renders made for this transcript (git-ignored `tools/out/`): `app-mainA3-0-16-v3.wav` and solos of all twelve tracks in mainA3 (bars 88 to 103: the only V3 section with kick, sub, bass, stab, pad, clap, hats, shakers, tick and bursts together). Command: `node tools/render.js --page app --sections mainA3 --bars 16 --song v3 [--solo <track>]`, 20 s per render, exit 0, "page errors: none". All thirteen sidecars carry the same `gridStartSample` 2663 and `latencySamples` 458. Older renders used: `app-mainA-0-16-solo-kick.wav` and `-hat_open.wav` (baseline song).
- Network as found: `dl.fbaipublicfiles.com` (Demucs weights), `huggingface.co`, `zenodo.org` (Open-Unmix weights), `arxiv.org` and every paper host I tried answer 403 at the proxy. **GitHub release assets and `raw.githubusercontent.com` download** (HTTP 206/200), and PyPI is open. So I read the separators' READMEs from GitHub raw, but I could not open any paper PDF: for papers, what I cite is the search-result page (title, venue, abstract text as shown), not the paper. 9 of the 12 allowed searches were used.

## 2. Separation (needed before every decision on a real track)

### 2.1 Options

| Option | Where it runs | Quality (published) | Status here |
|---|---|---|---|
| HT-Demucs (`htdemucs`, `htdemucs_ft`), Demucs v4 | owner's machine (`pip install demucs`, weights from dl.fbaipublicfiles.com) | "SDR of 9.00 dB on the MUSDB HQ test set", 9.20 with sparse attention and per-source fine-tuning (Demucs README); MIT licence (README) | package installed here (demucs 4.1.0, torch 2.14.1) but the weight host is blocked |
| KUIELab MDX-Net (UVR's `kuielab_a_*.onnx`) | **here** (onnxruntime 1.29, CPU) and the owner's machine; also a candidate for onnxruntime-web in the app | 7.5 dB overall SDR in the Demucs README's comparison table (no extra data) | downloaded from the UVR model repository's GitHub release (`TRvlvr/model_repo`, tag `all_public_uvr_models`), 29.7 MB each; tested below |
| Spleeter 4stems | needs TensorFlow (README); weights are GitHub release assets (`deezer/spleeter` v1.4.0, reachable) | 5.9 dB in the Demucs README's table | TensorFlow is not installed; not tried |
| Open-Unmix (`umxhq`, `umxl`) | weights on Zenodo (README DOIs) | 5.3 dB (`umx`) in the Demucs README's table; `umxl` weights "only licensed for non-commercial use (CC BY-NC-SA 4.0)" (README) | Zenodo blocked |
| HT-Demucs weights re-hosted as a GitHub release asset | here | as HT-Demucs | GitHub release assets download here, so if the owner (or the coordinator from the owner's machine) uploads `htdemucs` weights to a release in an owner repository, this sandbox can fetch them. The README says Demucs is MIT; whether that covers the weight files must be checked before re-hosting (a decision, section 11) |

### 2.2 Test: MDX-Net on the V3 mainA3 mix with exact stems

Parameters per model came from UVR's published `mdx_model_data/model_data.json` (raw.githubusercontent.com, `TRvlvr/application_data`), keyed by the MD5 of the file's last 10,000 KiB, which matched all three files: drums `n_fft` 4096, bass 16384, other 8192; `dim_f` 2048, `dim_t` 2^9; compensate 1.035. Input tensor [1, 4, 2048, 512] = (L re, L im, R re, R im) of the first 2048 STFT bins, hop 1024 (the ONNX input shape confirmed `dim_f` and `dim_t`). My runner (`sep.py`, 50 lines: torch STFT, 523,264-sample chunks with 50 % Hann overlap) took 25.6 s (drums), 15.1 s (bass) and 14.3 s (other) for 33.1 s of audio on this CPU.

Ground truth stems: drums = kick + clap + hat_open + shaker + shaker_on + tick + burst + burst_r; bass = sub + bass; other = stab + pad. The engine's master is not linear (glue, limiter, sidechains): the real mix against the sum of the twelve solos is only 8.9 dB SDR, so I scored two inputs.

| Input | drums SDR (scale-invariant) | bass | other |
|---|---|---|---|
| sum of the solos (a linear mix, exact truth) | 9.7 dB (11.6) | 7.5 (8.5) | 15.9 (15.9) |
| the engine's real mix | 10.5 (12.5) | 0.0 (0.2) | 15.6 (15.7) |

Got right: drums and other are clean (other stem correlates 0.93 with the stab, 0.33 with the pad; drums 0.96 with the kick). The bass stem on the linear mix correlates 0.90 with the bass solo and 0.26 with the sub; it carries the 34 Hz drone about 3 dB low (25 to 45 Hz band -31.6 dBFS against -28.2 in the sub solo). Got wrong or unproven: the bass score on the real mix is 0 dB, but that measures the truth's mismatch as much as the separator (the bass is 15 dB under the kick at 100 to 400 Hz and the master changes the sum); the linear figure is the separator's. A sampled hat survives separation: see 3.3.

## 3. Synth or sample (decision A)

### 3.1 Method

1. Onsets: a 3 ms RMS envelope with hysteresis (arm 45 dB under the track's peak, fire 30 dB under it, 80 ms minimum gap), refined back to the last sample 50 dB under the following 50 ms maximum. (Two earlier onset rules failed here: a plain rise detector fired 3 times per kick, and a steepest-rise refinement put the V3 kick's onsets 13 ms early because the kick's 20 ms attack starts from -100 dB.)
2. Cut each hit (150 ms), band-pass it (20-300, 300-3000, 3000-16000 Hz), and compute the maximum normalised cross-correlation (NCC) within plus or minus 10 ms against other hits. Two statistics: the median over random pairs, and the **nearest twin** (for each hit, the best NCC over all other hits; median over hits). The twin statistic handles round robins: each hit has a perfect partner somewhere.
3. Pitched sampler: the twin search also tries each partner resampled by 2^(n/12), n = -7 ... 7 (a sampler transposes by resampling).
4. Formants: a sampler transposes the spectral envelope with the pitch; a synth with a fixed filter keeps it. Fit log(envelope peak) against log(f0) over several notes: slope 1 = sample, 0 = synth.
5. Bit depth and aliasing (the brief's list): not measurable after mixing in a way I could test; see 3.4.

Published basis: E4 section 4c used exactly this waveform-similarity test on the record (NCC 0.36 to 0.55 for the phrase-end hit against a 0.14 to 0.27 control) and concluded "generated, not a sample"; E3 found 0.11 to 0.25 for the burst. Sample identification against a catalogue is a published task: Van Balen, Serrà and Haro adapted spectral-peak fingerprinting to find samples in hip-hop (iiia.csic.es PDF, as described on the search result page), and Cheston, Van Balen and Durand (arXiv 2502.06364) train a CNN on an artificial dataset for it. Those identify *which* recording; the twin test asks only *whether the hits are replays*.

### 3.2 Test on the engine's solos (truth: all synthesis) and the sampler set (truth: samples)

Median pair NCC by band, after fixing pair sampling (`tA.py`), then the twin statistics (`tA2.py`), 300 Hz to 16 kHz:

| Track | truth | pairs 20-300 | pairs 300-3k | pairs 3k-16k | twin | pitch-twin | verdict |
|---|---|---|---|---|---|---|---|
| kick | synth (deterministic sine + noise click) | 0.97 | 0.84 | (too quiet) | 1.00 | 0.99 | "sample or deterministic synth" |
| clap | synth, noise | 0.29 | 0.19 | 0.14 | 0.28 | 0.22 | synth |
| hat_open | synth, noise + bank | (quiet) | 0.20 | 0.10 | 0.12 | 0.13 | synth |
| shaker | synth, noise | 0.46 | 0.24 | 0.12 | 0.16 | 0.15 | synth |
| tick | synth, noise | 0.48 | 0.28 | 0.16 | 0.18 | 0.21 | synth |
| burst | synth, noise | (quiet) | 0.12 | 0.11 | - | - | synth |
| bass | synth, phase-reset oscillators | 0.98 | 0.98 | (quiet) | 1.00 | 0.99 | "sample or deterministic synth" |
| stab | synth, phase-reset oscillators | 0.57 | 0.45 | (quiet) | 1.00 | 1.00 | "sample or deterministic synth" |
| smp_kick | sample (self-made) | 1.00 | 1.00 | - | 1.00 | 1.00 | sample |
| smp_hat | sample | - | 1.00 | 1.00 | 1.00 | 1.00 | sample |
| smp_hat_rr3 | sample, 3 round robins | - | 0.22 | 0.11 | **1.00** | 1.00 | pairs say synth, twin says sample |
| smp_hat_6bit | sample, 6-bit | - | 1.00 | 1.00 | 1.00 | 1.00 | sample |
| smp_stab_pitched | sample, transposed | 0.16 | 0.47 | - | 1.00 | 1.00 | pairs say synth, twin says sample |

Residual after the best scaled, aligned twin (`tA3.py`, full band, dB re the hit): stab -63.8, kick -27.3 (its noise click), bass -22.7 (velocity and the sidechain), clap -0.3, hat -0.5; the synthetic samples -120 (integer placement; a real sampler through a mix will sit far higher, est. -30 to -40 dB).

Formant test (`tA4.py`, synthetic): a saw through a fixed resonant peak at 1.2 kHz played at five pitches over an octave gives envelope peaks 1210, 1177, 1174, 1153, 1100 Hz, log-log slope -0.13; the same note transposed as a sample gives 1210, 1438, 1615, 1812, 2420 Hz, slope 1.00.

### 3.3 Test through the mix and the separator

I replaced the synth hat in the real mainA3 mix with `smp_hat` at the same RMS and separated it. Twin statistic in 6 to 16 kHz:

| Input | synth hat (the real mix) | sampled hat |
|---|---|---|
| the mix, no separation, onsets taken in the 6-16 kHz band | 0.15 | 0.99 |
| MDX-Net drums stem | 0.16 | 0.95 |
| kick band (30-200 Hz) of the drums stem | 0.99 | 0.99 |

### 3.4 What it got right, reliability, failure modes

- Right: every noise-bearing voice (5 of 5) and every sample variant (5 of 5) once the twin statistic is used; the sample identity survives mixing and separation in a band where the element dominates.
- **It cannot tell a sample from deterministic synthesis.** The engine's kick, bass and stab restart their oscillators at the same phase on every note, so they replay identically like a sample (twin 1.00; the stab's residual -64 dB). An analogue 808 kick is also nearly deterministic (est.). For these the evidence has to come from elsewhere: a fresh-noise band (the kick's click gives -27 dB residual, but a click is not always there), formant movement across notes (needs more than one pitch), or identity against a known library (a catalogue match). Confidence for "sample" on a tonal element with no noise band must be capped (section 9).
- A pure sine always finds a twin within one period of lag (the sub drone read 0.96), so the test is skipped below about 3 harmonics.
- Real samplers add per-hit variation that is not a new waveform: velocity layers (a twin exists within a layer), sample-start modulation, filter envelopes keyed to velocity, and FX after the sampler. The twin is computed before any reverb tail dominates (first 150 ms).
- 6-bit and aliasing: the 6-bit hat looked like any other sample to the twin test; I did not find a quantisation signature after random velocity scaling (the steps no longer sit on a grid), and the engine's oscillators are band-limited Web Audio oscillators, so no aliasing truth exists here. Both stay as weak evidence only (a 909 hat is better identified by matching the 909 samples themselves, section 6).
- Expected reliability (est.): for drums and percussion with noise content, above 95 % on stems; for tonal one-shots, "sample" cannot be asserted from this test alone.

## 4. Mono or poly (decision B)

### 4.1 Method

Iterative multiple-F0 estimation on 250 ms frames 50 ms after each onset (sustained parts for pads and drones): FFT peaks (prominence 6 dB, parabolic interpolation), candidate F0s from each peak divided by 1 to 4, salience = sum of matching harmonic amplitudes (within 1.2 %) weighted 1/sqrt(k), require the fundamental, take the best, subtract its harmonics capped by the mean of their neighbours (the smoothness principle), repeat until the salience falls under 12 % of the first; merge F0s within 50 cents (detuned pairs). Polyphony = median count over frames; mono if the median is 1.

Published basis: Klapuri, "Multiple fundamental frequency estimation based on harmonicity and spectral smoothness", IEEE Trans. Speech and Audio Processing (2003), pages 804-816: the iterative estimate-and-cancel approach and smoothness in the subtraction stage, and, for unknown polyphony, a stopping rule (as shown on the researchportal.tuni.fi page and the search summary). Voice stealing and glide are behavioural tests (4.3), not from a paper.

### 4.2 Test

| Track | truth | median polyphony | note precision / recall | pitch-class precision / recall |
|---|---|---|---|---|
| stab | 6 notes, G#3 B3 D#4 F#4 A#4 C#5 | 6 | 0.72 / 0.72 | 0.94 / 0.81 |
| pad | the same 6 | 6 | 0.88 / 0.85 | 1.00 / 0.95 |
| bass | 1 (G#1) | 1 | 0.92 / 1.00 | 0.92 / 1.00 |
| sub | 1 (C#1 drone) | 1 | 0.40 / 0.60 | 0.53 / 0.80 |

Right: the count, which is the decision. Wrong: stab frames carried sub-octave ghosts (E1, G#2) and octave errors (pad F#3 for F#4); the sub's pitch is 39 cents off because a 250 ms frame resolves 4 Hz at 34 Hz (E1 needed 40 to 64 bars for 0.01 Hz). Before the 50-cent merge, every detuned saw pair counted twice (bass read 3).

### 4.3 Reliability and failure modes

- Counting on a solo or a clean stem: high (est. above 90 % for "mono against poly"). On a mixed "other" stem two monophonic parts look like a poly part; the decision has to be made per separated element, and MDX-Net gives no per-instrument stems inside "other".
- Octave-related notes hide each other (a D#5 over D#4 adds only even harmonics); unison-detuned or chorused voices can be counted as two notes unless merged; a single note through a resonant filter can add a "note" at the resonance.
- Mono-synth evidence beyond the count, not tested here (no engine voice glides in V3): (a) note overlap: a mono synth never has two pitches at once, and a new note cuts the previous release (voice stealing shows as a release truncated at the next onset, with no tail overlap); (b) legato glide: a continuous pitch track between notes (portamento) with no new attack; (c) envelope retrigger: on legato notes a mono synth often does not retrigger the envelope. These need a pitch track (the same F0 estimator at 10 ms hops) and are cheap to add.
- A layered pad made of several mono synths cannot be told from one poly synth (est.).

## 5. FM or analog/subtractive (decision C)

### 5.1 Method

First an inharmonicity check: the energy-weighted deviation of the partials from integer multiples of F0 in the first 60 ms (above 15 cents = inharmonic, FM with a non-integer ratio, or ring modulation, or a bell/metal sample). Then **model comparison** on harmonic-amplitude frames (16 harmonics, 40 ms frames every 10 ms, frames within 30 dB of the peak): for each frame find the best member of each family, with one free parameter per frame and a few global choices, and compare the median frame error (dB, absolute, clipped at -60):

- FM family: carrier:modulator ratios 1:1, 1:2, 2:1, 1:3, 3:1, 1:4, 2:3; harmonic amplitudes are sums of Bessel functions J_n(I) folded at zero; the index I is free per frame (0 to 12).
- Subtractive family: saw (1/k) or square (odd, 1/k) through a 2-pole resonant lowpass, Q from 0.7, 1.5, 3, 6, 12; the cutoff is free per frame.

Call FM or subtractive when one family is better by more than 1 dB; otherwise undecided. I first tried hand features (partial "rebounds", envelope roughness): they confused a square wave and a detuned saw with FM, and missed FM with a static index, so I dropped them.

Published basis: the sound-matching framing, synthesizer parameter estimation as "the inverse of sound synthesis", and the note that models trained only on parametric loss do poorly out of domain so a spectral loss is combined (KAIST MAC lab page, "Parameter Estimation for Sound Synthesis"); InverSynth (Barkan et al., IEEE/ACM TASLP 2019; arXiv 1812.06349 as shown on the search page) estimates the parameters of an FM-plus-subtractive synthesizer from spectrograms or raw audio with strided CNNs. My test uses the analytic version of the same idea, with two small model families instead of a network.

### 5.2 Test (`tC2.py`; f0 given; FM and the first five subtractive rows are self-made)

| Note | truth | FM error, best | subtractive error, best | call |
|---|---|---|---|---|
| FM 1:1, index 6 to 0.3 | FM | 0.55 dB (1:1) | 2.17 (saw, Q 12) | FM |
| FM 1:2, index 4 to 0.5 | FM | 1.85 (1:2) | 2.59 (saw, Q 1.5) | undecided |
| FM 2:1, index 3 to 0.2 | FM | 0.40 (2:1) | 3.52 | FM |
| FM 1:1, static index 1.5 | FM | 0.49 (1:1) | 2.35 | FM |
| FM 1:3, index 2.5 to 0.3 | FM | 0.35 (1:3) | 4.34 | FM |
| saw, lowpass sweep, Q 4 | subtractive | 6.45 | 0.36 (saw, Q 3) | subtractive |
| saw, sweep, Q 1 | subtractive | 5.58 | 0.67 (saw, Q 0.7) | subtractive |
| square, sweep | subtractive | 5.91 | 2.92 (square, Q 6) | subtractive |
| saw pair detuned 7 cents | subtractive | 6.58 | 3.76 | subtractive |
| saw, Q 8, slow sweep | subtractive | 5.27 | 0.29 | subtractive |
| engine bass (saw pair, lowpass envelope), one note from the solo | subtractive | 5.33 | 2.49 (saw) | subtractive |

Right: 10 of 11; the FM ratio was recovered in all five FM notes; the wave shape (saw or square) in all subtractive notes. Undecided: 1:2 FM, whose spectrum is odd harmonics only, which a filtered square also gives; the time evolution (index decay against cutoff decay) is what separates them, and a per-frame fit throws that away. The inharmonicity check alone caught non-integer ratios in the first, discarded version (1:3.5 bell: 104 cents).

### 5.3 Reliability and failure modes

- Mono notes on a solo or a clean stem: est. 85 to 90 %. Needs F0 (from section 4) and at least about 100 ms of note.
- Chords (the stab, the pad) are out of scope for this fit: partials of different notes collide. Fit per note only where partials are resolvable, or fit the chord as a sum (the multi-F0 output gives the notes), or ask whether an FM model with fixed ratio explains every note equally.
- Families overlap: FM with index under 1 is a sine plus a little second harmonic, like a heavily filtered saw; a sync or wavefolded analog sound has FM-like spectra; a sample of either is indistinguishable from its source. The honest output is a likelihood ratio, not a verdict.
- Effects after the synth (chorus, distortion, the bus) change the harmonic amplitudes; distortion adds harmonics that favour neither family cleanly (est.).

## 6. Reverb: presence, RT60, pre-delay, built-in against outboard (decision D)

### 6.1 Truth

From the engine's impulse formula (`core.js` `impulse`, then the reverb's 4500 Hz lowpass and 15 ms pre-delay; my Python copy, `tD.py` `truth_ir`): per octave band 250 Hz to 8 kHz, T20 2.16 to 2.20 s, T30 1.94 to 2.02 s, EDT 2.50 to 2.74 s. The decay is a power of (1 - t/size), not exponential, so the early decay is slower than the late one; the RT60 one quotes depends on the fitting range.

### 6.2 Methods and tests

1. **Presence and RT60 from a free decay** (`tD2.py`): Schroeder backward integration of the energy after the last hit of the render (each render has 2.5 s of tail), fitting the EDC at -1 to -11 dB (early) and -25 to -45 dB (late). Published basis: Schroeder, "New Method of Measuring Reverberation Time", JASA 37, pages 409-412 (1965), backward integration of the squared impulse response, part of ISO 3382; known dependence on the integration limit and background noise (vocal.com page and the scilit record, as seen on the search page).

| Track | send | early RT | late RT | tail to -60 dB |
|---|---|---|---|---|
| kick | none | 0.47 s | 0.08 s | 0.24 s |
| bass | none | 0.62 | 0.10 | 0.21 |
| tick | none | 0.08 | 0.07 | 0.09 |
| shaker | none | 0.09 | 0.04 | 0.07 |
| clap | 0.25 | 0.39 | **2.05** | 1.20 |
| hat_open | 0.12 | 0.26 | **2.21** | 1.10 |
| burst | 0.35 | 1.59 | **2.06** | 1.61 |
| pad | 0.40 | (sustained) | **2.04** | - |
| stab | 0.10 + delay 0.15 (feedback 0.42) | 4.54 | 2.85 | 2.81 |

Right: presence 9 of 9 (dry late slopes 0.04 to 0.10 s, wet 2.0 to 2.9 s); RT60 within 3 to 11 % of the truth's T30/T20 for clap, hat, burst and pad. The stab's 2.85 s is the reverb plus the delay's echoes, which a single slope cannot separate (an echo detector, an autocorrelation peak at the delay time, 3/16 at 126 bpm = 357 ms, would; not run).

2. **RT60 mid-song, with no free decay** (the common case in a track): side channel (wet only, for a centred dry source) averaged over claps, minus the floor that earlier claps leave, slope of the excess. Clap solo: 2.63 s, which is the impulse's EDT (2.5 to 2.7 s), as it should be for a fit near the start of the decay. On the full mix's side channel: 29.5 s, a failure: the wide stab and pad fill the side channel. So the mid-song estimate needs a stem, and it reads EDT, not T30. Published basis for blind estimation from running signals: Löllmann, Yilmaz, Jeub and Vary, "An Improved Algorithm for Blind Reverberation Time Estimation" (IWAENC 2010), a maximum-likelihood estimator on a statistical model of sound decay, with pre-selection of candidate decays; it was built for reverberant speech (iks.rwth-aachen.de page). Its premise (free decays between syllables) is weaker in dense electronic music; E4 measured the record's RT60 by band on its end tail only (500 Hz 5.5 s, 2 kHz 4.2 s, 8 kHz 1.2 s per REPORT section 6), which is the right place to look on a real track.

3. **Pre-delay** (`tD2.py`, `tD3.py`): the dry onset in the mid channel against the first 6 dB rise of the side channel. Clap: 15.9 ms against 15 ms (the dry clap is centred, so its side channel is silent until the reverb arrives: -75 dB until 16 ms, then -68, -64, -61). Hat (pan 0.08): 0.8 ms, wrong, because the panned dry signal is in the side channel; removing a per-hit fitted pan gain gave 7.0 ms, still wrong (the fit window and the reverb overlap). Open: fit the pan gain on the whole hit with the reverb modelled, or measure pre-delay on a free decay's first reflection in the autocorrelation.

4. **Shared send against element-specific reverb** (`tD4.py`): per element, the late-tail RT in three bands (0.3-1.2, 1.2-4, 4-10 kHz) and the tail colour (1/3-octave energy of 0.4 to 1.0 s after the hit minus the first 50 ms, mean removed: for a linear reverb that is the reverb's own colouring, whatever the source). A synthetic element-specific reverb was added to the dry tick (stereo exponential noise, RT 0.8 s, 9 kHz lowpass).

| Pair | colour distance | RT log-ratio (max over bands) | call |
|---|---|---|---|
| clap ~ hat_open | 1.4 dB | 0.14 | same reverb |
| clap ~ burst | 2.1 | 0.07 | same reverb |
| hat_open ~ burst | 3.0 | 0.09 | same reverb |
| clap ~ tick+plate | 6.8 | 0.99 | different |
| hat_open ~ tick+plate | 7.5 | 1.10 | different |
| burst ~ tick+plate | 6.3 | 1.03 | different |

Right: the engine's one send came out as one reverb across three different sources, and the extra reverb as a separate one.

### 6.3 The built-in against outboard heuristic

What is measurable: (a) **shared or element-specific** (6.2.4): one tail signature across several elements means a send or a bus reverb (in a hardware studio, an outboard unit on an aux; in a DAW, a send); a signature on one element only means an insert or the instrument's own effect; (b) **character**: RT per band, EDT against T30 (a linear-decay digital reverb against a gated or non-exponential one: the engine's own IR has EDT 30 % longer than T30), stereo decorrelation of the tail (L/R correlation -0.02 to -0.03 for the engine's send), the tail's bandwidth against the dry signal's (est.: early digital units of the 1980s had a reduced bandwidth, so a tail that stops at 10 to 15 kHz while the dry goes higher points at a vintage digital unit or a lo-fi built-in effect), modulation in the tail (chorused digital reverbs), and spring signatures (dispersive chirps). (c) The owner's question "built into the synth or outboard" cannot be read from the signal: a synth's onboard reverb on one part and an outboard unit inserted on that part are the same measurement. The report should say "element-specific reverb (likely the instrument's own or an insert)" against "shared reverb (a send or bus, the outboard style)", with the character as supporting text. Confidence medium for (a) when two or more elements have free decays, low for (b), none for (c) beyond (a).

A built-in tail that is mono and short is indistinguishable from the dry sound's own decay: the clap's built-in noise tail (0.25 s, mono) shows only as the clap's slower early slope (0.39 s), not as reverb. That is acceptable: the recreation reproduces it by matching the dry envelope.

## 7. Drum machine identification: 808 against 909 against sample (decision E)

### 7.1 Basis

- TR-808 bass drum: Werner, Abel and Smith, "A Physically-Informed, Circuit-Bendable, Digital Model of the Roland TR-808 Bass Drum Circuit", DAFx-14, pages 159-166: a sub-circuit model of the original, implemented in Gen (dafx.de and CCRMA listing as shown on the search page). I could not open the paper (dafx14.fau.de and ccrma.stanford.edu are blocked), so its measured signature is not quoted here; the features below are the commonly described behaviour of a triggered resonator (est.) and must be checked against the Box Crew's circuit reading and against batch 2's recreations.
- TR-909: hi-hats, ride and crash are 6-bit samples; kick, snare and toms are analogue circuits; the samples were made playable with a volume envelope and tuning (the search page's summary of Wikipedia mirrors and an Attack Magazine interview with Atsushi Hoshiai, who sampled the cymbals from his own kit). So a 909 hat is a **sample** to decision A, and a 909 kick is a swept oscillator.
- E1 measured the record's kick as f = 52 + 210 e^(-t/24 ms) Hz with a 1 to 2 ms click 25 dB down: the 909-style shape.

### 7.2 Kick test (`tE.py`; the glide fit is `score.py`'s `fit_glide` on the coherent mean of the 20-400 Hz band, starting 3 ms after the body passes 10 % of its peak)

| Kick | truth | f_start | f_end | tau | -20 / -40 dB decay | click (>1 kHz, first 10 ms, re body) | rule |
|---|---|---|---|---|---|---|---|
| engine V3 | punch 265, tune 53, tau 22 ms, length 197 ms, click 0.05 lowpassed 12 kHz | 240 Hz (at +3 ms; 267 extrapolated to 0) | 53.3 Hz | 22.3 ms | 104 / 137 ms | -45 dB | 909-like |
| engine baseline | punch 190 -> tune 44 by an exponential ramp over 70 ms, decay 0.3, click 0.12, drive 0.45 | 283 | 43.6 | 19.6 | 151 / 310 ms | -24 dB | 909-like |
| synthetic 808-style (self-made) | 52 Hz, 3 % glide, 0.8 s decay, no click | 54 | 52.1 | (20) | 177 / 429 ms | -55 dB | 808-like |

Right: the V3 kick's three glide parameters to within 1 %; the baseline's end pitch to 0.4 Hz; the click ordering (0.12 unfiltered louder than 0.05 lowpassed); both engine kicks are swept-sine designs, which is what "909-like" means here. Not tested: a real 808 or 909 recording (none in the repository; batch 2 will provide recreations and a redistributable sample set).

Rule used (est., to be replaced by nearest neighbour): glide ratio under 1.5 with a -40 dB decay over 300 ms = 808-like; glide ratio over 2 with tau under 60 ms = 909-like; anything else = unknown, take a guess by nearest neighbour; a twin of 1.00 with a noise band = a sample of either.

### 7.3 Hats (`tE2.py`)

| Hat | truth | spectral lines above 8 dB (2-14 kHz) | twin (5-16 kHz) | reading |
|---|---|---|---|---|
| V3 hat_open | noise + six-square bank, metal 0.15, bank highpassed at 4 kHz | 0 | 0.15 | noise synthesis, not a sample |
| baseline hat_open | noise + bank, metal 0.5 | 2 (2207, 2594 Hz = 1500 x 1.47 and x 1.73, two of the bank's oscillators) | 0.12 | oscillator bank + noise, not a sample: the 808-style architecture |
| shaker | bandpassed noise | 0 | 0.18 | noise |
| smp_hat_6bit (self-made) | one hit replayed | 8 (one frozen noise realisation has a fixed ripple) | 1.00 | sample (909 if it matches the 909 samples) |

Right: the line test found the bank's partials where they are loud enough, and the twin separated the replayed hat. Caveat: a replayed noise sample also shows fixed "lines" (its frozen ripple), so lines alone do not mean an oscillator bank; lines with a low twin do.

### 7.4 Reliability and failure modes

- Classic machines are sampled and re-sampled constantly; "a sample of an 808" is the most common case in practice, and decision A then says "sample" while decision E says "808-like" (both are useful: load the 808 recreation or the sample).
- Tuning, decay and accent controls move a single machine across a wide range (a short, tuned-up 808 kick is close to a 909 with the attack turned down, est.); processing (EQ, saturation, the bus compressor) changes decay and click. Under a mix, the kick body hides the sub's fundamental and vice versa (E1, E2).
- The identification that will work is nearest neighbour in a feature space populated by **rendering batch 2's recreations across their control ranges** (and the free sample set), with the distance as the confidence. Until batch 2 exists, the rule above is a placeholder.

## 8. Nearest recreation and plugin suggestion (decision F)

### 8.1 Type level (`tF.py`): a rule tree on cheap features (spectral flatness, centroid, polyphony, F0, attack, inter-onset interval, gap depth between hits, pitch glide)

| Solo | engine type | mapped to | right? |
|---|---|---|---|
| kick | kick | kick (glide ratio 4.5) | yes |
| sub | sub drone | sub (never falls silent: -37 dB gaps) | yes |
| bass | bass | kick | **no**: its filter envelope pulls the instantaneous frequency of the 20-400 Hz band up at each attack (glide ratio 12), read as a pitch glide; pitch must come from the harmonic F0, not the IF |
| stab | stab | pad | **no**: the kick's sidechain on the stab moves the envelope peak to 0.43 s, read as a slow attack |
| pad | pad | pad | yes |
| clap | clap | bright-noise class (hat/shaker) | **no**, partly: centroid 4.2 kHz; the flams and the 12 ms burst spacing are the clap's signature and were not used |
| hat_open, shaker, tick | hat / shaker voices | bright noise | yes (class level) |
| burst | shaker voice | mid noise | yes |

7 of 10. Each failure is an effect of processing or modulation on a cheap feature, which is why rules will not carry this decision.

### 8.2 Parameter level

Analysis by synthesis: render the candidate instrument through the engine itself (an OfflineAudioContext with `Synths.create`) and minimise a multi-resolution spectral distance plus an envelope distance over its parameters, starting from the feature estimates. The kick shows the start point is already good: tune, punch and tau come straight from the glide fit (53.3, 267, 22.3 against 53, 265, 22). The distance at the optimum is the confidence; a distance above a threshold means "no good recreation: suggest a plugin or use a sample". The published framing (5.1) warns that parameter-space models fail out of domain, which is why the loss is spectral and the synth is the engine's own.

### 8.3 Plugin suggestion

A static table from the decision outputs to free instruments the owner can install, shown as text, never loaded: subtractive mono/poly: Surge XT (GPL-3), Odin 2, TAL-NoiseMaker (freeware); FM: Dexed (a DX7 emulation, GPL-3), Surge XT's FM modes; wavetable: Vital; reverb: Dragonfly Reverb (GPL-3), Valhalla Supermassive (freeware). These names and licences are from memory, not checked in this session: the Box Crew should verify them before they appear in the app.

## 9. Build plan: `app/analysis/`

Conventions followed: plain browser JS as globals with a fixed load order, one owner per file, the UI talks only to `Host`, a Node self-check with a fake context, `{min, max, value, unit}` style specs, Python for offline work in `tools/`.

### 9.1 Files and functions

Load order after the engine: `dsp.js` -> `features.js` -> `decide.js` -> `match.js` -> `report.js`. Global `Analysis`.

| File | Functions (inputs -> outputs) |
|---|---|
| `dsp.js` | `fft(re, im)`, `stft(x, n, hop)`, `butter(x, lo, hi, order)` (zero-phase), `env(x, ms)`, `onsets(x, opts) -> Int32Array` (the hysteresis rule of 3.1), `ncc(a, b, maxLag)`, `peaks(frame) -> {f, a}`, `schroeder(e2)`, `fitExp(t, f)` (the glide model) |
| `features.js` | `hits(buf, opts) -> [{at, segL, segR}]`; `identity(buf) -> {pairs: {band: v}, twin, pitchTwin, residualDb}`; `multiF0(frame) -> [Hz]`, `polyphony(buf) -> {median, frames: [[Hz]]}`; `harmonicFrames(buf, f0)`; `decay(buf) -> {early, late, bands: {lo-hi: T}, edt}`; `wetOnset(buf) -> ms`; `tailSignature(buf) -> {rt: [3], colour: [16], lrCorr}`; `kick(buf) -> {fStart, fEnd, tau, d20, d40, clickDb}`; `lines(buf) -> [Hz]`; `basic(buf) -> {flatness, centroid, active, ioi, gapDb, attack, f0}` |
| `decide.js` | one function per decision, each returning `{value, confidence, evidence: [strings], alternatives: [{value, p}]}`: `synthOrSample`, `monoPoly`, `fmOrSubtractive` (the two model families of 5.1), `reverb` (present, rt60 by band, edt, predelay), `sharedOrSpecific(elements)` (clusters tails across all elements of one track), `drumMachine` (rule now, nearest neighbour when batch 2 exists), `nearestType` |
| `match.js` | `fit(buf, type, opts) -> Promise<{params, distance, confidence}>`: renders `Synths.create(ctx, type)` in an OfflineAudioContext with candidate params, multi-resolution STFT plus envelope loss, coarse grid then Nelder-Mead over at most 6 parameters; `library()` = cached feature vectors of every engine instrument and batch-2 voice across their ranges; `nearest(features) -> [{type, preset, distance}]` |
| `report.js` | `build(results) -> {elements: [...], text}`: the owner-readable report (per element: what it is, mono/poly, FM/analog, reverb and RT60, shared or own, nearest recreation and its distance, plugin suggestion, each with a confidence word: high, medium, low, guess) |
| Host | `host.analyze(bufferId or AudioBuffer, {stems}) -> Promise<Report>`; `host.applyAnalysis(report, {replace})` creates the recreation tracks (batch 4) |
| `tools/separate.py` | MDX-Net ONNX runner (the 50-line runner of 2.2, parameters from UVR's model_data), `--model kuielab|htdemucs`; writes stems next to the input; HT-Demucs when its weights are reachable |
| `tools/analyze.py` | the Python mirror of `features.js` and `decide.js` for offline runs, and the reference implementation the JS is checked against |
| `tools/analysis-check.js` | Node check with a fake AudioContext: runs `features.js` and `decide.js` on synthetic buffers with known answers (a replayed hit, fresh noise, a 6-note chord, FM 1:1, saw plus filter, an exponential decay of known RT, a 15 ms pre-delay), prints `OK: N checks passed` |

### 9.2 Confidence per decision (initial rules, to be calibrated by the scoring plan)

- synthOrSample: twin < 0.5 in a band holding > 10 % of the energy -> synth, high; twin > 0.97 with a noise band -> sample, high; twin > 0.97 with no noise band -> "sample or deterministic synth", confidence capped at low unless formant tracking (slope > 0.7 over 3 or more pitches) or a library match supports it.
- monoPoly: fraction of frames agreeing with the median count; low if fewer than 5 frames.
- fmOrSubtractive: from the error gap (gap > 2 dB high, 1-2 medium, < 1 undecided); "not attempted" for chords.
- reverb: high with a free decay of at least 30 dB above the floor; medium from the mid-song method (and labelled EDT); pre-delay only for centred elements.
- sharedOrSpecific: needs two or more elements with free decays; otherwise "unknown".
- drumMachine: nearest-neighbour distance against batch 2's renders, mapped to a probability by the scoring set.

### 9.3 What to build first

1. `dsp.js` and the onset and identity features with `tools/analysis-check.js` (decision A is the most reliable and gates the sampler route of batch 1).
2. `tools/separate.py` with MDX-Net, so the rest runs on stems of real files now; ask for HT-Demucs weights (section 11).
3. Reverb (free-decay RT60, presence, shared clustering) and mono/poly: both tested here and cheap.
4. The FM/subtractive model fit (Python first, JS after the scoring set confirms it).
5. `match.js` analysis by synthesis against the engine's own instruments; then the drum-machine nearest neighbour once batch 2's voices exist.
6. `report.js` and `host.analyze`.

## 10. Scoring plan

1. **Labelled corpus from the engine** (truth by construction): solo renders of every track in every section of V1, V2 and V3 (the instrument type, polyphony, reverb send, RT60 from the impulse formula, pre-delay are all known); parameter sweeps per instrument (e.g. stab cutoff, Q, attack; kick tune, punch, tau, click; hat metal, tone) rendered with `tools/render.js`; batch-1 sampler tracks with real redistributable samples (round robins, velocity layers, transposition) once batch 1 lands; batch-2 808 and 909 voices across their control ranges; a synthetic FM set until an FM instrument exists. Store each render's labels in its sidecar JSON (a `labels` field written by `render.js` from the document).
2. **Three conditions for every item**: the solo; the solo inside a linear mix, then separated; the solo inside the engine's real master mix, then separated (the hardest, and the realistic one).
3. **Metrics**: per decision, accuracy and a confusion table; calibration (Brier score and expected calibration error of the confidence); RT60 error in percent by band (T30 truth and EDT truth reported separately), pre-delay error in ms; F0 and note precision/recall; for match.js, the spectral distance at the fit and the parameter error; separation SDR per stem as in 2.2. A per-run table like A9's, one command (`python3 tools/analyze.py --score corpus.json`), exit code non-zero on a regression.
4. **External truth**: batch 5's minimal tracks with known gear (owner-provided, not committed) as the only check against real machines; the Ear Crew's record as a check against E1 to E5's hand findings (e.g. the record's kick must read 909-like with E1's glide, the phrase-end hit must read synth by the twin test as E4 found, the end tail's RT60 by band must match E4's 5.5 / 4.6 / 5.1 s).
5. **Pass lines to start with** (est.): decision A 95 % on noise-bearing items in all three conditions; polyphony count 90 % on solos and stems; FM/subtractive 85 % on mono notes; RT60 within 15 % on free decays; drum machine 80 % top-1 against batch-2 renders with processing applied. Every change is scored and kept only if nothing regresses (the Ear Crew's rule).

## 11. Limits

- All ground truth is the engine's own synthesis plus self-made sampler and FM sets; no real 808, 909, FM synth, hardware reverb or commercial sample was available. The methods' behaviour on real gear is an estimate until batch 2 and batch 5.
- I could not open any paper (every paper host is blocked); citations are to the search-result pages and to READMEs read from GitHub raw.
- The real-mix bass separation score is confounded by the master's non-linearity; the linear-mix score is the separator's.
- Mid-song RT60, pre-delay on panned sources, glide and voice stealing, chords for FM/subtractive, 6-bit detection and aliasing were not solved or not tested.

## 12. Decisions needed from the coordinator

1. Separation in the sandbox: adopt KUIELab MDX-Net ONNX (from UVR's GitHub release) as the default separator for batch 4 now? Its licence (the KUIELab and UVR model files) has not been checked; it must be before anything ships or is re-hosted.
2. HT-Demucs: ask the owner to run `demucs` on their machine, or to upload the `htdemucs` weights as a release asset in one of the owner's GitHub repositories so this sandbox can fetch them (GitHub release assets download here). This depends on the weights' licence (the Demucs README says MIT for the code).
3. Truth labels: may A9 (or the analysis module's owner) add a `labels` field to `render.js` sidecars and a sampler-track option to `render.js`, so the corpus of section 10 is generated rather than hand-made?
4. Owner of `app/analysis/` (new files, one owner each per the contract), and whether `CONTRACT.md` gets an Analysis section and `host.analyze` before building starts.
5. Whether the report's built-in/outboard line may say only "shared (send or bus) against element-specific (instrument's own or an insert)", as section 6.3 argues, instead of claiming "built-in" or "outboard".
6. Whether an FM instrument enters the engine (batch 1 or 2), so decision C's truth stops being synthetic and its recreations have somewhere to point.

## 13. Pages seen (cited above)

- facebookresearch/demucs README (raw.githubusercontent.com, main branch): v4 Hybrid Transformer, 9.00 / 9.20 dB, the comparison table (Open-Unmix 5.3, Spleeter 5.9, KUIELab-MDX-Net 7.5, HT Demucs f.t. 9.0), MIT licence.
- sigsep/open-unmix-pytorch README: `umxl` weights CC BY-NC-SA 4.0, Zenodo DOIs.
- deezer/spleeter README: TensorFlow, 2/4/5 stems.
- nomadkaraoke/python-audio-separator README: MDX (ONNX), VR, Demucs and MDXC models from UVR.
- TRvlvr/application_data `mdx_model_data/model_data.json` (raw.githubusercontent.com): the kuielab_a parameters.
- Search page: "KUIELab-MDX-Net: A Two-Stream Neural Network for Music Demixing" (arXiv 2111.12203): per-target frequency cut-off and larger n_fft.
- Search page: Werner, Abel, Smith, TR-808 bass drum model, DAFx-14 pages 159-166 (dafx.de, CCRMA listings).
- Search page: TR-909 6-bit cymbal and hat samples, analogue kick, snare, toms (Wikipedia mirrors; Attack Magazine interview with Atsushi Hoshiai).
- Search page: Löllmann et al., "An Improved Algorithm for Blind Reverberation Time Estimation", IWAENC 2010 (iks.rwth-aachen.de).
- Search page: Klapuri, "Multiple fundamental frequency estimation based on harmonicity and spectral smoothness", IEEE TSAP 2003, pages 804-816 (researchportal.tuni.fi).
- Search page: InverSynth, Barkan et al., IEEE/ACM TASLP 2019 (arXiv 1812.06349); KAIST MAC lab, "Parameter Estimation for Sound Synthesis".
- Search page: Schroeder, "New Method of Measuring Reverberation Time", JASA 37, pages 409-412, 1965 (vocal.com, scilit).
- Search page: Van Balen, Serrà, Haro, automatic sample identification (iiia.csic.es); Cheston, Van Balen, Durand (arXiv 2502.06364).
