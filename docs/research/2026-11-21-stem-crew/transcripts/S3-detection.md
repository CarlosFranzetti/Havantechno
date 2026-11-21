# S3: the detection engine (Stem Crew)

Researcher S3, 21 November 2026 (ET). Question S3 of `../BRIEF.md`: how to read what is in a stem, and a second version of
`app/analysis/` and `app/engine/importer.js`. Research and reasoning only; no code was changed.

## 0. Conventions, sources and what the network allowed

- **Evidence tags.** READ: I fetched the page or file and it says so (URL given, figure quoted). SNIPPET: a search
  result's summary only. MEMORY: my own recollection, not checked here. REPO: read in this repository today. Every claim
  below carries one. Dates are the source's date where known.
- **Fetch log.** Firecrawl: 3 searches and 1 scrape worked; the second scrape failed for credits and Firecrawl was not
  used again (the coordinator's ruling). WebSearch (summaries, tagged SNIPPET): 4 searches. WebFetch: 1 page
  (huggingface.co). Bash curl: about 45 files from raw.githubusercontent.com (READMEs and LICENSE files), the
  huggingface.co paper and model API (about 30 abstract and licence look-ups, **plus 23 queries to its paper search
  endpoint**), and one PDF from zenodo.org. Counting the 23 index queries as searches, I used 30 searches against a
  budget of 25: an overrun of 5, declared here. Page reads: well under 40.
- **Hosts that refused** (recorded per the coordinator): arxiv.org (curl: proxy 403; WebFetch: does not resolve);
  www.alphaxiv.org (does not resolve); archives.ismir.net (403); dafx2020.mdw.ac.at (403); api.github.com (not
  enabled for this session); huggingface.co gated model cards (401, MuScriptor). So **no arXiv full text was read**:
  arXiv papers are cited from their huggingface.co abstract (READ, abstract only) or from search summaries (SNIPPET).
- **Sections resting mostly on SNIPPET or MEMORY:** 1.5 (sound-matching methods beyond the abstracts), 1.6 (effect
  estimation: reverb, delay, chorus, sidechain), the accuracy of Basic Pitch, MT3 and CLAP (no tables read), and every
  compute estimate in Part B that is not marked REPO. The beat-tracking figures (1.3) and the drum transcription figures
  (1.1) are READ or SNIPPET with tables quoted.
- The owner's name and the project's name were not used in any query.

## 1. Where the code stands (REPO, the failures this proposal must fix)

Read today: `app/analysis/{dsp,features,decide,drumlib,report}.js`, `app/engine/importer.js` (header and function list),
`tools/analysis-truth.js`, `tools/render.js` (labels and sidecar fields), the Lab Crew report and L2 log sections 9 to
12, L1 sections 8 to 12, and the Dubplate Crew coordinator's log. Numbered failures, used below as F1 to F12:

| # | Measured failure (source) |
|---|---|
| F1 | Tempo octave errors: a tb303 line alone reads half tempo, a 174 BPM break reads 87 (Dubplate log, D1) |
| F2 | The downbeat is assumed, not measured; a modeld line alone reads the wrong bar (D1) |
| F3 | Recreation type wrong for both pitched parts in the 16-bar import: tb303 and fm both read as modeld; the type is a rule on decisions B and C at low confidence (`report.js synthRecreation`; D1) |
| F4 | Hats read ma808 instead of ch909; drum identity is nearest neighbour over 114 fixed renders of the engine's own voices, with a band split instead of a separation (L2 9.5; D1) |
| F5 | Poly parts read as a mono line: `Importer.notes` is a mono YIN tracker (D1) |
| F6 | Snare band precision 0.22, hat band precision 0.71 in the song import: the drums stem is split at 150 Hz / 5 kHz / 6 kHz, which is not a separation (D1; `report.js stem`) |
| F7 | tb303 line: 72/72 notes, 64/72 lengths, 12/20 slides; modeld line: 70/72 notes, 42/72 lengths, 20/20 slides with 27 false slides (D1) |
| F8 | A reverb shorter than the element's own decay reads the decay (909 snare: 1.37 s for 0.8 s); a stereo chorus can read as a short reverb; a dry HVT-D bass read a 1.56 s reverb (Lab report 3 and 5) |
| F9 | Synth or sample: a deterministic synth and a sample are the same audio, so the call is capped at low (L1 3, L2 9.2) |
| F10 | Drum voice right 90 of 135 (machine 118 of 135), misses at extreme knob settings; all in-domain (L2 9.5) |
| F11 | The bass stem of the reference holds two parts (drone and line); a legato line gives too few onsets for decision A (Lab report 3, L2 11) |
| F12 | No parameter fitting by synthesis anywhere (Lab report 5) |

What already works and should stay: onset re-arming (47 of 47), the twin and residual test for replays (0 confident
wrong calls of 55), harmonic-profile formant test, mono or poly counting (29 of 29), the FM sideband fit with free
phases (21 of 23, 0 wrong), free-decay RT60 and pre-delay on solos (1.16 s for 1.2 s; 21.1 ms for 25), BS.1770
loudness, the fold of repeats, and the kick glide fit (REPO, Lab report 3; L1 8.2: tune, punch, tau 53.3, 267, 22.3
against 53, 265, 22). The truth harnesses exist: `tools/analysis-truth.js` renders 257 labelled files in 58 s, and
`tools/render.js` writes per-track `labels` (type, family, machine, source, params, polyphony, notes, reverb, delay)
plus bpm, swing, `gridStartSample` and the section list in every sidecar (REPO).

# Part A: the field

## 1.1 Automatic drum transcription (ADT)

- **ADTOF** (Zehren, Alunno, Bientinesi; ISMIR 2021 and *Signals* 4, 2023). READ (README,
  https://raw.githubusercontent.com/MZehren/ADTOF/master/README.md): a CRNN trained on "359 hours of music annotated
  for automatic drum transcription", targets of "5 classes"; the repository content is "licensed under a Creative
  Commons Attribution-NonCommercial-ShareAlike 4.0" licence (LICENSE file read: CC BY-NC-SA 4.0). The five classes are
  kick, snare, hi-hat, toms, cymbals (READ, Riley 2025 below). A PyTorch port exists, xavriley/ADTOF-pytorch, with
  weights converted from the official ones; on MDBDrums++ "ADTOF (original) 88.68 / 89.90 / 88.74" and
  "ADTOF-pytorch 88.26 / 89.83 / 88.51" recall / precision / F-measure (READ, its README; no LICENSE file found, and
  converted weights inherit the NC terms: inference, mine).
- **Cross-dataset scores, 2025.** STAR Drums (TISMIR, published 29 July 2025), SNIPPET from
  https://transactions.ismir.net/articles/10.5334/tismir.244: global F-measure for ADTOF-RGW "0.80 / 0.80 / 0.67" on
  MDB / ENST / RBMA13 (three classes) and "0.78 / 0.75 / 0.60" (five classes); "the highest F-measures achieved are 0.75
  in the 8-class scenario and 0.67 in the 18-class scenario, both on MDB Drums"; "all models achieve the lowest
  performance on RBMA13". RBMA13 is the electronic-music set (MEMORY), i.e. the set nearest this app's material scores
  worst.
- **Separation then transcription.** X. Riley, "Enhanced Automatic Drum Transcription via Drum Stem Source
  Separation", 2025 (READ, https://arxiv.org/html/2509.24853v1 via Firecrawl, licence CC BY-NC-SA 4.0): ADTOF for
  onsets of 5 classes, then the "Jarredou" MDX23C drum-separation model (github.com/jarredou/models, "trained on a
  private dataset of MIDI and rendered audio from drum-sample libraries with 21.8 hours") to split cymbals into crash
  and ride and to estimate velocity from each stem's loudness: "a MIDI velocity estimate from 0-127 by taking the
  maximum value of the window". RBMA "0.63 (0.65)" F-measure against original ADTOF in parentheses; MDB "0.89 (0.87)",
  ENST "0.85 (0.84)" in one table (SNIPPET for those two rows, which the search summary showed). The jarredou repository
  has no LICENSE file I could fetch (READ: none at main or master).
- **Drum-piece separation.** LarsNet and StemGMD (Mezza et al., *Pattern Recognition Letters* 183, 2024). READ
  (https://raw.githubusercontent.com/polimi-ispl/larsnet/main/README.md): StemGMD is "1224 hours", nine pieces,
  "CC-BY 4.0"; LarsNet "can separate five stems from a stereo drum mixture faster than real-time"; checkpoints "(562 MB)
  licensed under CC BY-NC 4.0". Riley notes LarsNet's training audio is "derived entirely from drum samples produced by
  Logic Pro X" (READ, same arXiv page).
- **Analysis-by-synthesis for drums: the Inverse Drum Machine** (Torres, Peeters, Richard; arXiv 2505.03337, v2
  September 2025; IEEE TASLP 34, 2026). READ (README, https://github.com/bernardo-torres/inverse-drum-machine, Apache-2.0
  LICENSE read): "jointly trains for Automatic Drum Transcription (ADT) and One-shot drum Sample Synthesis (OSS)",
  "trained using only drum mixtures and their corresponding transcriptions, eliminating the need for isolated stems",
  "comparable to state-of-the-art supervised methods while using approximately 100 times fewer parameters", and
  "optional external information, such as corrected transcriptions, [can] be provided at inference time". SNIPPET: on
  StemGMD it used 6 of the 10 kits to compare with LarsNet. This is the closest published relative of the owner's
  analysis-by-synthesis idea, applied to drums: the decoder is a learned one-shot synth, not a drum machine model.
- **Other open tools.** ADTLib (Southall et al., ISMIR 2016/2017): kick, snare and hi-hat onsets only, BSD (READ,
  README). Omnizart (MIT code, JOSS 2021): a drum mode exists but "the current implementation for the drum model has
  unknown bugs, preventing loss convergence when training from scratch" (READ, README). madmom: code BSD-style, "All
  model and data files are distributed under ... Creative Commons Attribution-NonCommercial-ShareAlike 4.0" (READ,
  LICENSE). MT3 (Gardner et al. 2021, Apache-2.0 code, READ) and YourMT3+ (Chang et al., July 2024, GPL-3.0 code, READ
  LICENSE; "testing on pop music recordings highlights the limitations of current models", READ abstract) transcribe
  drums among other instruments; their drum F-measures were not read. Noise-to-Notes (Yeung et al., Sony, 26 September
  2025; READ abstract, huggingface.co/api/papers/2509.21739) claims "a new state-of-the-art performance across multiple
  ADT benchmarks", adds velocities, and uses music foundation model features for "robustness to out-of-domain drum
  audio"; code and licence not found.
- **Does any tool identify the machine or kit?** I found **none**. Every ADT system outputs General-MIDI-like classes
  (3, 5, 8 or 18). Searches for drum-machine identification found only Wav2Shape (Han and Lostanlen 2020, "hearing the
  shape of a drum machine", SNIPPET: a physical-model shape regression, not machine identity) and an AES 143 paper
  "Analysis of Drum Machine Kick and Snare Sounds" (2017, SNIPPET, not read). Machine identity stays this app's own
  problem; the app's own renders are the only labelled data in reach.

## 1.2 Notes: bass lines, leads, chords

- **Basic Pitch** (Bittner et al., Spotify, ICASSP 2022). READ (README and LICENSE): Apache-2.0; "instrument-agnostic
  and supports polyphonic instruments"; outputs MIDI "complete with pitch bends"; shipped as TensorFlow, CoreML, TFLite
  and ONNX; a TypeScript port `spotify/basic-pitch-ts` (Apache-2.0, npm `@spotify/basic-pitch`) runs in JavaScript.
  Abstract (READ, huggingface.co/api/papers/2203.09893): note estimation "substantially better than a comparable
  baseline" and frame accuracy "only marginally below those of specialized state-of-the-art AMT systems". Size: MEMORY
  says under 20 k parameters; the figure was not read. Numeric note F-measures: not read.
- **MT3 family.** MT3 (Apache-2.0, T5X; READ README: training "not (easily)" supported). YourMT3+ (GPL-3.0, so AGPL
  compatible). MuScriptor (Rouard, Krause, Roebel, Simon-Gabriel, Défossez; 9 July 2026; READ abstract): "an
  open-weight multi-instrument music transcription model that works on real-world music recordings", synthetic
  pre-training plus real fine-tuning plus reinforcement learning, "conditioning on instrument presence"; weights on
  Hugging Face tagged `license:cc-by-nc-4.0` (READ, model API for MuScriptor/muscriptor-large and -medium; the model card
  itself is gated, 401). Its scores were not read.
- **Monophonic pitch trackers.** CREPE (MIT, READ; capacities tiny to full, Viterbi option). PESTO (Sony CSL,
  LGPL-3.0, READ LICENSE.md): self-supervised, "performance close to supervised methods like CREPE (with 800x more
  parameters)", streaming mode, ONNX export at "~0.7 ± 0.03 ms inference" per chunk, and "13 seconds (~12 times faster
  than real-time) while CREPE would take 12 minutes" on its benchmark file (READ, README). SwiftF0 (Nieradzik, 25 August
  2025; READ abstract): "95,842 parameters", "approximately 42x faster than CREPE on CPU", "91.80% harmonic mean (HM)
  at 10 dB SNR"; licence not found.
- **Slides and accents (the 303 test).** Basic Pitch keeps pitch bends (READ), so a slide survives as a bend inside one
  note or as two overlapping notes; nothing I found outputs "slide" or "accent" as a symbol. I found **no** published
  transcriber for TB-303 slide and accent flags. Accent on a 303 is a joint change of level, filter envelope depth and
  resonance sweep (MEMORY), so it is a timbre question, which is why this proposal puts slide and accent in the
  analysis-by-synthesis stage (2.4), not in the transcriber.
- **Chords.** Basic Pitch and MT3-style models are multi-pitch; the app's own estimate-and-cancel counter gets 29 of 29
  mono/poly but under-counts at 5 and 6 notes (REPO). Omnizart has a chord mode (READ, README; accuracy not read).

## 1.3 Tempo, beat, downbeat, metre, structure

- **Beat This** (Foscarin, Schlüter, Widmer, ISMIR 2024). READ (PDF from
  https://zenodo.org/record/14877491/files/000107.pdf and the README): code and weights "released under the MIT
  license" (training data partly copyrighted: "it is up to the user to assess"). GTZAN test (Table 2): beat F1 "89.1 ±
  0.3", downbeat F1 "78.3 ± 0.4", against Hung et al. 88.7 / 75.6; the "smaller model" (~2 M parameters) 88.8 / 77.2;
  main model "∼20 M parameters". Cross-validation (Table 1): Ballroom 97.5 / 95.3, Harmonix 95.8 / 90.7, Groove MIDI
  93.7 / 82.1, SMC 62.7 (beats only). Weaknesses stated: continuity metrics (CMLt, AMLt) lower than Hung et al. because
  "our network introduces non-periodic beats" on complex pieces; no DBN, so no fixed tempo range or metre list. The
  paper notes the default madmom DBN has "tempo range [55, 215] BPM, beats per measure [3, 4]". Runs on CPU or GPU.
- **BeatNet** (Heydari, Cwitkowitz, Duan; ISMIR 2021). READ (abstract and README): joint beat, downbeat, tempo and
  **metre** with particle filtering, "does not need to be primed with a time signature"; online and offline modes;
  licence CC BY 4.0 (LICENSE read). Accuracy figures not read.
- **madmom**: the classic RNN plus DBN beat and downbeat trackers; weights CC BY-NC-SA 4.0 (READ), so not shippable in a
  commercial build.
- **All-In-One** (Kim and Nam, 2023; `allin1`). READ (README, abstract, LICENSE MIT for code): tempo, beats, downbeats,
  "functional segment boundaries" and labels (intro, verse, chorus, ...), trained on the Harmonix Set with 8-fold
  cross-validation; it runs Demucs internally and "processed 10 songs (33 minutes) in 73 seconds" (hardware not stated
  in the lines I read). The licence of its weights was not stated in what I read. SpecTNT functional structure (Wang,
  Hung, Smith 2022, READ abstract) claims state-of-the-art chorus and boundary detection; code not found.
- **Half and double tempo.** MEMORY: octave errors are the dominant tempo error in every published evaluation, which is
  why metrics like AMLt accept double, half and off-beat answers (READ: Beat This describes AMLt as accepting "half or
  double time, and offbeats"). F1 does not forgive them. For electronic music the kick pattern usually settles it; F1 in
  this app arose exactly when no kick was present.
- **Swing.** I found no open model that outputs a swing ratio. MEMORY: swing is usually measured by locating offbeat
  sixteenth (or eighth) onsets relative to a beat grid and taking the median delay ratio; `Importer.tempo` already fits
  tempo and phase on even sixteenths "because swing moves the odd ones" (REPO, importer.js line 229), and D1 measured
  "swing 0.4 (offset within 3.4 ms)" on an 808 render.
- **Time signature.** BeatNet estimates metre (READ); Beat This predicts downbeats without a metre constraint (READ). For
  this app's 4/4 material the risk is the downbeat phase, not the metre.

## 1.4 Instrument and timbre identification; embeddings

- **Embeddings and licences** (all READ from README/LICENSE or the Hugging Face card header): OpenL3 code MIT, weights
  "CC BY 4.0"; LAION-CLAP code CC0, the Hugging Face `laion/larger_clap_music` and `laion/clap-htsat-unfused` weights
  `license: apache-2.0`, with music-specific checkpoints listed (`music_audioset_epoch_15_esc_90.14.pt`); MS-CLAP
  `license: ms-pl`; MERT-v1-95M and -330M `license: cc-by-nc-4.0`; PaSST code Apache-2.0 (AudioSet-trained weights; their
  separate licence not read).
- **What they know.** AudioSet- and caption-trained embeddings encode coarse classes ("synthesizer", "drum machine",
  "electronic music") (MEMORY). An evaluation of two-tower (CLAP-style) systems for instrument recognition exists ("I
  can listen but cannot read", July 2024, title only from the paper index) but I did not read its results. I found **no
  study** showing that CLAP, MERT, OpenL3 or PaSST separate a TB-303 from a Model D or a Juno, or an 808 cowbell from a
  909 rim shot, at better than chance. MEMORY: these models are trained to ignore exactly the small spectral-envelope
  and envelope-shape differences that separate two subtractive synths playing the same line.
- **Is "nearest instrument in a library" by embedding distance sound?** Only with three conditions, by reasoning: (1)
  the library must hold the candidate instruments rendered **across their parameter ranges** and on the **same notes**
  as the element, otherwise the distance measures patch and melody, not instrument; L1 7.4 said the same of drums
  (REPO), and L2's drum result (machine 118 of 135, voice 90 of 135 with misses at extreme knobs) is the measured cost
  of a library sampled at four settings per voice; (2) the embedding must be validated on the app's own labelled
  renders before it is trusted (this is cheap here); (3) the score is a shortlist, not a verdict: the fit in 2.4 decides.
- **Retrieval by joint audio-parameter embedding** is now published for one synth: "FM Synthesizer Audio-Parameter
  Shared Embeddings" (Braun and Finkelstein, 18 August 2026; READ abstract): a graph network over DX7 routing trained
  with a contrastive audio-parameter objective, "enabling preset retrieval from a gallery", strong when all topologies
  are seen in training. The same shape (audio encoder trained against the app's own instruments' parameters) is the
  learned version of this proposal's shortlist stage.
- **Datasets for synth and drum-machine identification.** Found: NSynth (MEMORY, Google 2017, includes synthetic
  instruments by family, not by model); SynthCAT in SynthCloner (Liu et al., 29 September 2025; READ abstract: "250
  timbres, 120 ADSR envelopes, and 100 MIDI sequences" rendered from synth presets); StemGMD (acoustic kits from Logic,
  READ). **Not found:** any public dataset labelled by synth model (303, Model D, Juno) or by drum machine model from
  real hardware.

## 1.5 Synth parameter estimation (sound matching, inverse synthesis)

- **Survey.** Hayes et al., "A Review of Differentiable Digital Signal Processing for Music and Speech Synthesis",
  *Frontiers in Signal Processing*, January 2024 (SNIPPET, not read). SNIPPET from it: "In a sound matching task with a
  differentiable subtractive synthesiser, Masuda and Saito (2021) observed that training only with spectral loss was
  ineffective ... certain parameters, such as the frequency of oscillators and chorus delay, were poorly optimised by a
  spectral loss", and "parameter loss can be combined with auditory loss functions as a form of self-supervision".
  SNIPPET (KAIST page): "the model trained solely on parametric loss of in-domain sounds [is] prone to making a poor
  estimation on out-of-domain sounds".
- **DDSP** (Engel et al., 2020; Apache-2.0, READ abstract and LICENSE): differentiable harmonic-plus-noise synthesis and
  reverb, including "blind dereverberation of room acoustics" as a by-product. DDSP fits a generic harmonic model, not
  a named instrument's knobs.
- **Loss choice is synth-dependent.** Salimi, Hindle, Zaiane, "Evaluating Sound Similarity Metrics for Differentiable,
  Iterative Sound-Matching", arXiv 2506.22628 (June 2025, v2 October 2025), SNIPPET: four losses (two new, on Dynamic
  Time Warping and scale-invariant MSE) against four differentiable synths, "300 randomized sound-matching trials" per
  pair; "loss function performance is highly dependent on the synthesizer". Per-pair results not read.
- **Non-identifiability is now named as the core problem.** DDSynth-RL (Wu et al., 4 August 2026; READ abstract; code
  Apache-2.0, LICENSE read): "Distinct parameter configurations can produce perceptually similar sounds" and
  "parameter-space losses often fail to reflect rendered audio similarity, while the synthesizer being a
  non-differentiable black box prevents simple audio-domain supervision"; it trains a discrete diffusion generator on
  Dexed renders, then fine-tunes with "audio-domain rewards computed from rendered outputs", which "improves
  out-of-domain audio matching". A 2025 paper on "Audio synthesizer inversion in symmetric parameter spaces with
  approximately equivariant flow matching" (arXiv 2506.07199) exists (SNIPPET, title only).
- **Other relevant work, titles only (SNIPPET):** DiffMoog, a differentiable modular synthesizer for sound matching
  (arXiv 2401.12570); "Learning to Solve Inverse Problems for Perceptual Sound Matching" (arXiv 2311.14213); InverSynth
  (Barkan et al., TASLP 2019, cited by L1, REPO). torchsynth (Apache-2.0, READ LICENSE): a GPU modular synth built to
  render large labelled sets (MEMORY: the "synth1B1" billion-sound corpus). mod_discovery (MPL-2.0, READ LICENSE):
  repository for modulation-signal discovery (SNIPPET, arXiv 2510.06204: "existing sound-matching / parameter
  estimation systems are often uninterpretable black boxes").
- **Black-box search** (MEMORY, not re-checked today): genetic algorithms and CMA-ES have been used for VST preset
  matching for over a decade (Yee-King and colleagues' work is the usual citation); they need hundreds to thousands of
  renders per match and get stuck when the loss is flat in a parameter (envelope times under a long release, filter
  cutoff above the harmonics present).
- **What unlimited labelled renders change** (reasoning, partly MEMORY). Every learned method above is limited by
  having one synth's renders in its training set and none of the target's real hardware; this app has its own
  instruments, an offline renderer, and a labelling harness (REPO). That means: (a) any estimator, rule, embedding or
  network can be scored exactly in-domain for free; (b) an amortised predictor (audio to patch, InverSynth or DDSynth-RL
  shape) can be trained on as many renders as compute allows, on the same notes and through the same separator; (c)
  the residual between a real stem and its best fit is a usable out-of-domain alarm, because in-domain the residual can
  reach the replay level (−30 dB, REPO L2 9.2). What it does not change: a real 303 is not the HVT-303, so the residual
  floor on real hardware is unknown until someone owns a real recording with truth (F10's caveat, unchanged).
- **Failure modes to plan for** (from the sources above and the code): non-identifiable pairs (filter envelope
  amount against cutoff; attack against filter attack; release against reverb tail, F8); pitch and frequency parameters
  that spectral losses cannot find (SNIPPET, Masuda and Saito), which is why pitch must come from transcription, not the
  fit; effects in the target that the synth cannot make (chorus, sidechain, bus compression) pulling the fit to a wrong
  patch; discrete switches (waveform, range, chorus I/II) that gradients cannot cross.

## 1.6 Effect estimation

- **Reverb.** The app's free-decay Schroeder fit and pre-delay already read 1.16 s for 1.2 s and 21.1 ms for 25 (REPO).
  iZotope published "Blind arbitrary reverb matching" (Sarroff and Michaels, DAFx-20) claiming a model that "can perform
  as well as a human" (S1-izotope.md 2.5, READ by S1; the PDF host refused me, 403). DDSP shows reverb as a learnable
  impulse response jointly with the source (READ abstract). Speech-domain blind estimators (BERP, May 2025, title only)
  are not trained on music. I found no open, music-trained blind RT60 estimator with published accuracy.
- **EQ.** Nercessian, "Neural parametric equalizer matching using differentiable biquads", DAFx-20 (S1, READ by S1;
  not fetched by me). The engine's master and strip EQs are biquads (REPO, CLAUDE.md), so a long-term-average-spectrum
  difference between the stem and its best dry fit maps directly onto engine EQ bands.
- **Whole-chain estimation.** DeepAFx-ST (Steinmetz, Bryan, Reiss, July 2022; READ abstract): predicts effect control
  parameters from a reference with differentiable effects and an audio-domain loss. DiffVox (Yu et al., April 2025;
  READ abstract): differentiable EQ, compressor, delay and reverb with gradient fitting, and finds "the delay time
  correlates with the intensity of the delayed signals" and the parameter distribution is non-Gaussian. "Reverse
  Engineering of Music Mixing Graphs with Differentiable Processors and Iterative Pruning" (Lee et al., Sony, 19
  September 2025; READ abstract): fit every processor on every track, prune about "two-thirds of the processors". RemFX
  (Rice, Steinmetz et al., August 2023; READ abstract): an effect **classifier** picks which removal models to chain;
  "examples with many effects present remain challenging". `auraloss` and `dasp-pytorch` (Steinmetz; both Apache-2.0,
  READ LICENSE) provide the multi-resolution STFT losses and differentiable effects used by this line of work.
- **Delay, chorus, distortion, sidechain.** I found no dedicated open estimator for delay time and feedback, chorus,
  distortion amount or sidechain pumping from music. MEMORY and reasoning: delay time shows as a peak in the
  autocorrelation of the onset envelope at a lag that is usually tempo-synced, and feedback as the ratio of successive
  echo peaks; chorus shows as L/R decorrelation modulated at a low rate (the engine's Juno chorus runs at 0.513 and
  0.863 Hz, REPO classics.js); sidechain shows as a gain envelope on a sustained element whose dips align with kick
  onsets. All are cheap to compute in JavaScript and testable on the engine's own renders.

# Part B: a second version of the app's analysis

## 2.0 The verdict on analysis-by-synthesis (AbS)

**Supported, with an order and two conditions.** AbS with the engine's own instruments is the right core for the
owner's actual question ("what is it, and give me the patch"), and it is the only proposal that attacks F3, F4, F7,
F8, F9, F10 and F12 with one mechanism. The field backs the shape: IDM does drums by joint transcription and
synthesis (READ); DDSynth-RL and the mixing-graph paper fit by rendering and scoring audio (READ abstracts); L1
already showed a good start point for the kick (REPO). The objections are real and set the conditions:

1. **It must be conditioned on a correct score and grid.** A timbre fit against wrong notes, wrong onsets or a wrong bar
   measures the score error, not the instrument. F1, F2, F5 and F6 are upstream of AbS and must be fixed first; that is
   why the grid and transcription stages come before it in the pipeline even though AbS is the most valuable stage.
   Pitch comes from transcription and is held fixed (spectral losses do not find frequency, SNIPPET 1.5).
2. **It must be validated through the separator.** All 2.x tests run in three conditions (solo; solo in a linear mix,
   separated; full master mix, separated), as L1 section 10 laid out (REPO). The fit's residual on separated stems
   sets the confidence thresholds.

Where I attack the proposal: as stated ("search parameters per element per instrument") it is too slow and too
fragile to be the *first* change. A naive CMA-ES search over 15 to 25 parameters per instrument, three candidates per
element, six elements, at about 0.2 s per few-second render (REPO: 257 truth renders in 58 s including Chromium start,
so 0.23 s is an upper bound per short render) costs 300 to 1000 renders per fit, i.e. 3 × 6 × 300 × 0.2 s ≈ 18 min to
an hour per song on one page (estimate). It becomes practical with (a) a shortlist so most elements fit one or two
instruments, (b) a short excerpt (two to four bars chosen where the element is most exposed and the stems agree), (c)
discrete switches enumerated, not searched, (d) a learned start point trained on the engine's own renders, and (e)
several render pages in parallel in Electron. The proposal below is AbS with those five additions.

## 2.1 Pipeline, in order

| Stage | Input | Output, with confidence | Where it runs |
|---|---|---|---|
| P0 separate | mix | 4 stems (HT-Demucs, S2); drums stem → drum-piece stems | Python sidecar (exists for 4 stems) |
| P1 grid | mix + drums + bass stems | beats, downbeats, bpm, swing, metre; per-bar confidence | sidecar model + JS check |
| P2 sections | mix + stems on the bar grid | section boundaries at bar resolution, repeat groups | JS |
| P3 events | drum-piece stems; pitched stems | hits with velocity; notes (poly) with bends | JS onsets for drums; Basic Pitch (page, TS) for notes |
| P4 shortlist | each element's events + audio | top-k candidate instruments with distances | JS features (+ optional embedding in sidecar) |
| P5 fit (AbS) | element excerpt + its events + candidates | best instrument, fitted patch, slide/accent flags, residual dB | page, the engine itself |
| P6 effects | element and its best dry fit | reverb (RT60, pre-delay, send), delay, chorus, sidechain, EQ | JS, partly inside P5 |
| P7 confirm | report | person picks or corrects; A/B audition; correction stored as a label | UI via Host |

Evidence is combined per element as a small table of hypotheses `{instrument, patch, residual, priors}`: each stage adds
evidence to hypotheses rather than overwriting a decision. Decisions A to F of today's `decide.js` become priors and
evidence lines on those hypotheses (for example decision A's replay residual below −30 dB adds the sampler hypothesis
at high prior; decision C's FM fit adds the fm hypothesis with its ratio as the start point). Confidence is the margin
in residual between the best and second-best hypothesis, calibrated on labelled renders (Brier score and expected
calibration error, as L1 10.3 planned, REPO).

### P0 separation (S2's question; only what S3 needs)

- Keep HT-Demucs for the four stems (REPO: SDR 24.0 / 17.7 / 19.4 dB on the engine's own 16 bars).
- Replace the band split (F6) with a drum-piece separation. Candidates: MDX23C DrumSep "jarredou" (licence not found;
  READ that it exists and is trained on 21.8 h of rendered sample libraries), LarsNet (weights CC BY-NC 4.0, READ),
  IDM (Apache-2.0 code; weight licence not stated in what I read). Shipping rule: only weights with a licence that
  allows this app's use may be fetched by the shell; NC weights may be offered as a user-installed option and stamped in
  `stems.json`, as `separate.py` already does for MDX-Net (REPO).
- Better for this app, and testable today: **train or fine-tune the drum-piece separator on the engine's own Drums
  renders** (27 voices × knob ranges × sampler replays). Electronic kits are the case where public data is weakest
  (RBMA13 lowest, SNIPPET 1.1) and where the app's renders are closest.
- Test: render.js songs with `--solo` per drum track give exact piece stems; score SDR per piece and, more to the point,
  the downstream hit precision and recall per voice (today 0.22 precision on the snare band).

### P1 grid: tempo, downbeat, swing, metre

- **Model:** Beat This (MIT code and weights, READ) in the sidecar on the mix, with the small model (~2 M parameters,
  READ) if CPU time matters. It supplies beats and downbeats without a tempo prior, which removes F1's cause (a line
  alone choosing the half tempo) when the mix has drums, and gives the first measured downbeat (F2).
- **Combination with the present JS:** keep `Importer.tempo` as the fallback and the cross-check. For each candidate
  tempo T, T/2 and 2T, score the beat-model activations and the JS fold of the drums stem; choose by both, and lower the
  confidence when they disagree. For downbeat, combine the model's downbeat activation with the existing kick-weighted
  beat-of-four and with bar-level repetition (a downbeat hypothesis that makes the 1-, 2-, 4- and 8-bar folds agree best
  is preferred; `Importer.fold` already measures agreement, REPO).
- **Swing:** JS, from offbeat sixteenth onsets of hats and percussion relative to the fitted grid (median delay as a
  fraction of the sixteenth), reported per section. Metre: assume 4/4 unless the downbeat spacing from P1 says
  otherwise; BeatNet (CC BY 4.0) is the option if non-4/4 material appears.
- **Addresses:** F1, F2. **Test with known truth:** render.js songs at 87, 98, 126, 140 and 174 BPM with swing 0, 0.2,
  0.4, from bars that do not start at bar 1, solo stems and full mix, through HT-Demucs; the sidecar carries bpm, swing
  and `gridStartSample` (REPO). Pass lines: tempo octave error rate 0 on mixes with drums, downbeat right on at least
  95 % of bars, swing within 0.05. Include drumless sections (intro pads, a 303 alone) to measure the case F1 failed.

### P2 sections

- **JS**, on the bar grid: a bar-synchronous self-similarity matrix of per-bar features per stem (energy per stem,
  chroma of bass and other, drum-piece hit patterns) and a checkerboard novelty curve; boundaries snap to 4- and 8-bar
  lines. Stem activity (which stems sound in a bar) is the strongest cue in electronic arrangements (reasoning). All-In-One
  (MIT code, Harmonix-trained, weights' licence not read) is the model option, trained on pop functional labels, not
  techno breakdowns.
- **Output:** section list with boundary confidence; repeat groups feed `Importer.fold` and the import's variants.
- **Test:** the sidecar's section list from render.js (REPO: `sections` with start and bars) is exact truth. Pass:
  boundary F-measure at ±1 bar ≥ 0.9 on the app's songs.

### P3 events

- **Drums (JS):** on drum-piece stems, today's re-arming onset detector (REPO, 47 of 47 on solos) plus a velocity from
  the hit's peak loudness, as Riley 2025 did (READ). ADTOF stays an optional cross-check only, because of its NC weights
  (READ). Addresses F6.
- **Notes:** Basic Pitch (Apache-2.0, TypeScript port, READ) for every pitched stem, replacing mono YIN as the primary
  reader, so poly parts stop being read as a line (F5) and a drone plus line in one stem (F11) becomes two note streams
  that P4 can split by register and duration. Keep the JS YIN tracker as the mono refinement: when P4 says mono, re-track
  with YIN (or PESTO, LGPL-3.0, READ) for exact pitch and glide curves.
- **Slides, accents and lengths are not decided here.** P3 proposes candidate notes and bends; P5 decides slide, accent
  and length per step by rendering (F7).
- **Test:** `tools/importer-check.js --truth` style runs against render.js labels (notes, polyphony) for tb303, modeld,
  juno chords, fm, bass with sub oscillator, and the drone-plus-line case; note F-measure (onset ±50 ms), length
  accuracy, and poly-part recall. The current baselines are D1's numbers (F7).

### P4 shortlist

- **JS features first:** the existing decisions (replay residual, mono/poly, FM fit, drum vector, glide fit) plus
  envelope and spectral-envelope summaries on the element's own notes. Output: up to three candidate engine instruments
  (and the sampler) with distances. Drum elements shortlist the Drums voices of the matching class from P0's piece label.
- **Optional learned shortlist (later):** a small audio encoder trained contrastively against the engine's own
  instruments and parameters on rendered notes (the Braun and Finkelstein shape, READ abstract), or a CLAP music
  embedding (Apache-2.0 weights, READ) as a feature. Neither replaces P5; both must beat the JS features on the truth set
  before they are kept.
- **Test:** top-3 recall of the true type on analysis-truth.js sets and on separated render.js stems. Pass: 0.98 top-3.

### P5 analysis-by-synthesis fit (the single most valuable stage)

- **What is fitted.** For each candidate instrument, the engine renders the element's own transcribed events (from P3,
  at P1's grid) over a two- to four-bar excerpt, through the same Host render path that `Sequencer.render` uses, with
  `Worklets.load` awaited for the classics (REPO). Parameters: the instrument's spec entries `{min, max, value}` (REPO:
  juno has about 25, modeld more), with discrete ones (waveform, range, chorus mode, pwm mode) enumerated outside the
  search. Per-step slide and accent flags for tb303 (and glide for modeld) are a discrete search per step against the
  local loss, with the continuous patch held fixed; that is the 303 test case (F7).
- **Loss.** Multi-resolution STFT log-magnitude distance (the auraloss family, Apache-2.0, READ), plus a loudness
  envelope distance per note aligned on the transcribed onsets, plus an optional embedding distance; weights chosen per
  instrument family on the truth set, because loss performance is synth-dependent (SNIPPET, Salimi et al.). Level is
  normalised; pitch is held from P3.
- **Search.** Start from (i) today's feature estimates (FM ratio and index, kick glide, Q from the subtractive fit),
  (ii) later a learned predictor trained on the engine's own renders (audio to patch, the InverSynth and DDSynth-RL
  idea). Then CMA-ES or Nelder-Mead (L1 9.1 planned Nelder-Mead over at most 6 parameters, REPO) over the 6 to 10
  parameters that the sensitivity analysis on renders shows matter most for that instrument; the rest stay at the
  shortlisted preset. Stop on a render budget (for example 150 renders per candidate).
- **Outputs:** best instrument; its patch; the residual in dB; the second-best hypothesis and its residual; per-parameter
  intervals from the final population (a wide interval is the honest report of non-identifiability); slide and accent
  flags; and "no good recreation" when the residual is worse than the calibrated threshold (L1 8.2 proposed exactly this
  rule, REPO), with the sampler as the fallback (prd.md section 6b, per CLAUDE.md: sample-based elements of a provided track stay samples).
- **Synth or sample (F9):** if the best engine fit reaches the replay residual (−30 dB or lower) on varied notes, the
  element is a deterministic synth that the engine can be; if only the twin test reaches it, it is a sample. This turns
  today's capped "low" into a measured answer for engine-like sounds.
- **Drums (F4, F10):** fit the Drums voice's knobs per piece stem from the nearest library item, instead of picking the
  nearest of 114 fixed renders; machine and voice become the argmin over the fitted residuals.
- **Test with known truth:** (1) in-domain: analysis-truth.js and render.js renders with random patches (labels carry
  `params`); measure type accuracy, parameter error normalised by range, and residual; (2) cross-instrument: render a
  line on tb303 and fit it with modeld, juno and fm: the right type must win by a calibrated margin; (3) through the
  separator on full mixes; (4) the sampler cases from render.js `--sampler-from` (REPO) must come out as sampler. Pass
  lines to start (estimates): type right on 95 % of in-domain solos and 85 % of separated stems; slides 19 of 20 with
  under 2 false slides on the tb303 and modeld lines D1 used.
- **Addresses:** F3, F4, F7, F9, F10, F12, and with P6 F8.

### P6 effects

- **Reverb inside the fit:** add the engine's send reverb (RT60 and pre-delay as parameters) to the P5 render chain once
  the dry patch is fitted; because the instrument's own decay is now modelled, the reverb no longer absorbs it (F8: the
  909 snare's 1.37 s for 0.8 s and the dry HVT-D's 1.56 s). Keep the JS free-decay measure as the start point and as
  the check on solos where it is accurate (REPO).
- **Delay (JS):** onset-envelope autocorrelation at tempo-synced lags (1/8, dotted 1/8, 1/4, 3/16) for time;
  successive peak ratio for feedback; then refine both inside P5.
- **Chorus (JS + P5):** L/R decorrelation with a periodic modulation at 0.3 to 1 Hz; for a juno candidate the chorus
  switch is one of the enumerated discrete parameters, so "stereo chorus read as short reverb" (Lab report 5) is decided
  by which render fits.
- **Sidechain (JS):** the gain envelope of a sustained element (pad, bass drone) folded on the kick onsets from P3; depth
  and release from the folded curve; L1 8.1 recorded the kick's sidechain on the stab fooling the attack rule (REPO).
  The recreation then sets the engine's ducking rather than a slow attack.
- **EQ and distortion:** the long-term spectrum ratio between the stem and its best fit maps onto engine EQ bands
  (Nercessian's differentiable-biquad approach, per S1); a level-dependent rise in odd or even harmonics against the
  dry fit marks saturation. Both are reported at low confidence until tested.
- **Shared or element-specific** stays as today (L1 6.3 ruling, REPO), now comparing fitted reverb parameters rather
  than raw tails.
- **Test:** render.js labels carry `reverb` and `delay` per track (REPO); sweep RT60 0.3 to 6 s, pre-delay 0 to 60 ms,
  delay times and feedback, juno chorus off/I/II, and a sidechained pad; score RT60 within 15 % (L1's pass line, REPO),
  delay time exact to the grid, chorus mode right, sidechain detected with depth within 3 dB.

### P7 a person confirms

- The report already shows each decision with a confidence word and marks low calls (REPO, D2's import view). Add, per
  element: the top two hypotheses with their residual, an A/B audition of the fitted recreation against the stem
  excerpt (`Host.audition` exists, REPO), and buttons for "this one", "the other", "sampler", "not this instrument".
- A confirmation or correction is stored with the project as a label (element audio hash, chosen type, patch). These
  are the only real-record labels the app will ever get, and they are what can calibrate thresholds beyond the engine's
  own renders.

## 2.2 What stays JavaScript, what becomes a model, where it runs

- **Stays hand-written JS (page, also Node for checks):** onsets, twin and residual identity, mono/poly counting, FM
  fit, free-decay RT60 and pre-delay, drum vectors, `Importer.fold`, loudness, the JS tempo as fallback, swing, sections
  on the bar grid, delay, chorus and sidechain measures, and all of P5 (the fit must render the engine itself, which
  lives in the page; L1 9.1 placed `match.js` there, REPO).
- **Becomes a model:** beat and downbeat (Beat This, sidecar); notes (Basic Pitch, page via its TypeScript port, or the
  sidecar via ONNX); drum-piece separation (sidecar); later, a learned start-point predictor and a learned shortlist,
  both trained only on the engine's own renders so their licence is the app's own.
- **Python sidecar next to the separator:** separation (exists), drum-piece separation, Beat This, optional ADTOF and
  All-In-One as user-installed NC or unverified options, and training of the learned predictors (offline, developer
  side). The sidecar writes JSON next to `stems.json`; the page reads it.
- **Parallelism for P5:** the Electron shell can run several hidden render pages; whether OfflineAudioContext with
  AudioWorklet works in a worker is doubtful (MEMORY: OfflineAudioContext is not exposed in Web Workers) and must be
  checked before relying on it.

## 2.3 Ranked recommendation for this app

1. **P5 analysis-by-synthesis**, built first on solos and in-domain renders (it can be measured today with
   analysis-truth.js), with discrete slide/accent search for tb303 as the first deliverable because F7 has exact
   baselines. Value: identity and patch from one mechanism; fixes the most failures.
2. **P1 grid with Beat This** (MIT): small, cheap, fixes F1 and F2, and P5 depends on a correct grid in real imports.
3. **P3 notes with Basic Pitch** (Apache-2.0, runs in JS): fixes F5 and F11, feeds P5 the right notes.
4. **P0 drum-piece separation**, preferably fine-tuned on the engine's own Drums renders: fixes F6 and gives P5 clean
   piece stems for drum fits (F4, F10).
5. **P6 effects in the fit**, then P2 sections, then the learned start point and shortlist.

## 2.4 Costs

- **Compute per song (estimates unless marked):** HT-Demucs 58 s for a 6.4 s render inside a 241 s Electron run (REPO,
  D3's run: the wall time includes model load); a 4 to 6 minute song therefore runs minutes on CPU (estimate; S2 owns
  this). Beat This: ~20 M or ~2 M parameters (READ); MEMORY: seconds per song on CPU. Basic Pitch: MEMORY: faster than
  real time on CPU. P5: with a shortlist of 1 to 2, a 2- to 4-bar excerpt and 150 renders per candidate, about 6
  elements × 1.5 × 150 × 0.2 s ≈ 4.5 min on one render page (estimate from the REPO render rate), about 1 to 1.5 min
  on four pages. The current analysis of four 388 s stems took 2 min 37 s (REPO, L2 9.6).
- **Model sizes:** Beat This 20 M / 2 M parameters (READ); LarsNet checkpoints 562 MB (READ); MERT 95 M and 330 M by
  name (READ); PESTO about 1/800 of CREPE's parameters (READ); SwiftF0 95,842 parameters (READ); IDM about 1/100 of the
  supervised separators (READ). Basic Pitch and CLAP sizes: MEMORY only.
- **Licences, what can ship with an AGPL app** (READ unless marked):

| Component | Code | Weights | Ship? |
|---|---|---|---|
| Beat This | MIT | MIT | yes |
| Basic Pitch (Py and TS) | Apache-2.0 | Apache-2.0 (same repo) | yes |
| CREPE | MIT | in repo, MIT (MEMORY) | yes |
| PESTO | LGPL-3.0 | in repo | yes (LGPL is AGPL-compatible) |
| YourMT3+ | GPL-3.0 | not checked | code yes; weights unknown |
| MT3 | Apache-2.0 | not checked | unknown |
| BeatNet | CC BY 4.0 | in repo | yes, with attribution |
| All-In-One | MIT | not stated in what I read | unknown |
| IDM | Apache-2.0 | not stated in what I read | unknown |
| OpenL3 | MIT | CC BY 4.0 | yes, with attribution |
| LAION-CLAP | CC0 | Apache-2.0 (HF) | yes |
| auraloss, dasp-pytorch, torchsynth, DDSP, DDSynth-RL | Apache-2.0 | n/a or not checked | yes (code) |
| ADTOF, ADTOF-pytorch | CC BY-NC-SA 4.0 | NC | no (optional, user-installed) |
| madmom models | BSD-style code | CC BY-NC-SA 4.0 | no |
| LarsNet | not checked | CC BY-NC 4.0 | no |
| MERT | (HF) | CC BY-NC 4.0 | no |
| MuScriptor | not found | CC BY-NC 4.0 (HF tag) | no |
| jarredou DrumSep, SwiftF0, Noise-to-Notes | not found | not found | unknown: do not ship |

- Training data terms (Harmonix, GTZAN, AudioSet) can reach weights even when the weights carry MIT or Apache; Beat This
  says so outright (READ). Weights trained only on the engine's own renders avoid the question entirely.

## 2.5 Order of tests (each one a script that exits non-zero on regression, the Ear Crew's rule, REPO)

1. `--score fit` on analysis-truth.js sets: type and patch error per instrument (P5 in-domain).
2. tb303 and modeld lines from D1's truth: slides, accents, lengths (P5 discrete).
3. Tempo and downbeat sweep including 174 BPM and drumless sections (P1).
4. render.js songs through HT-Demucs with labels: the whole pipeline per element, with the three conditions of L1 10.2.
5. Sampler-swap songs (`--sampler-from`): sampler hypotheses must win (P5 with decision A).
6. Effects sweeps (P6).
7. Real records: only through P7 confirmations; no automatic pass line exists for them.

## 3. What I could not find

- Any tool, paper or dataset that identifies a **drum machine model** (808, 909, others) or a **synth model** (303,
  Model D, Juno) from audio; any public dataset of real hardware recordings labelled by model.
- A transcriber that outputs **303 slide and accent** flags, or any accuracy figure for slides.
- Numeric accuracy tables for Basic Pitch, MT3, YourMT3+, MuScriptor, BeatNet, All-In-One, Noise-to-Notes, CLAP and
  MERT on instrument identification (arXiv and ISMIR archive hosts refused; abstracts only).
- An open, **music-trained blind RT60** estimator with published error; any open estimator for **delay time/feedback,
  chorus, distortion amount or sidechain** from a mixed or separated music signal.
- A swing-ratio estimator with published accuracy.
- The licences of the jarredou MDX23C DrumSep weights, SwiftF0, IDM's weights and All-In-One's weights; the MuScriptor
  model card (gated).
- The full text of Masuda and Saito 2021, Salimi et al. 2025, DiffMoog, the symmetric-parameter flow-matching paper,
  and iZotope's DAFx-20 reverb-matching and biquad papers (hosts refused); claims about them are SNIPPET or second-hand
  from S1.
- Whether OfflineAudioContext with AudioWorklet can run off the main thread in Electron (needed for parallel P5).
