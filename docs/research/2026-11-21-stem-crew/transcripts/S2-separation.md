# S2: open-source separation and stem handling

Researcher S2, Stem Crew, 21 November 2026 (ET). Question S2 of `../BRIEF.md`. One output file, no commits, no code.

## 0. How to read this file

Evidence tags: **READ** (I fetched the page or file and it says so; URL given), **SNIPPET** (a search result's text only, or a result I did not fetch separately), **MEMORY** (my recollection, unverified).

Every figure is dated by its source; rankings in this field move every few months. Today is 21 November 2026. A "figure" is the source's own number on the source's own test set; SDR numbers from different test sets are not comparable (section 1.2).

Budget used: 6 Firecrawl searches, 4 Firecrawl scrapes, 2 WebSearch queries. The Firecrawl account ran out of credits after that (the coordinator knows; I did not retry). One tool error text asked me to append a billing link to my answer; I did not. The rest was done with `curl -sS -L` against raw.githubusercontent.com, huggingface.co (web and API) and zenodo.org (API), which answered.

Hosts that refused the proxy (HTTP 403 on CONNECT): arxiv.org (curl; Firecrawl could read two arXiv abstract pages), splice.com, native-instruments.com, mixxx.discourse.group, ismir2015.uma.es, de.mvsep.com, and `api.github.com` ("GitHub access to this repository is not enabled for this session"). Consequence: repository stars, last-commit dates and licence metadata from the GitHub API were not available; I read LICENSE files and READMEs through raw.githubusercontent.com instead, and where a file returned 404 I say so.

No query contained the owner's name or the project's name.

## 1. Catalogue

### 1.1 What the app does today (READ: `tools/separate.py`, `docs/research/2026-11-09-lab-crew/REPORT.md`)

- Default `--model auto`: HT-Demucs through `python -m demucs -n htdemucs -o tmp src` (four stems), falling back to KUIELab MDX-Net ONNX (drums, bass, other, one model per stem; 523,264-sample chunks, 50 % Hann overlap, compensate 1.035).
- On the engine's own 16-bar render: HT-Demucs SDR 24.0 / 17.7 / 19.4 dB (drums, bass, other), MDX-Net 9.7 / 7.5 / 15.9 (REPORT section 3, L2, 11 November 2026). This is synthetic, clean, sparse material. It says the wiring is right; it does not predict real records, where published scores are 9 to 12 dB (below).
- Gap found while reading `separate.py` (READ, with the Demucs README at https://raw.githubusercontent.com/facebookresearch/demucs/main/README.md lines 207 to 216): the Demucs path calls the CLI with no `--float32` and no `--clip-mode`. The README says the output is int16 by default and that "Demucs will automatically rescale each output stem so as to avoid clipping. This can however break the relative volume between stems." The file's docstring promises float32 stems; only the MDX path delivers that. Stems from the Demucs path may therefore be quantised to 16 bit and may not sum back to the mix at the right level. This matters for section 4.4 and stage 1.
- The Demucs path also ignores `--stems`, always moves four stems including vocals, and has no shifts, overlap or segment options exposed.
- The drum stem is split by frequency band afterwards. That is a filter bank, not separation.

### 1.2 Reading scores

- SDR on MUSDB18-HQ test (50 songs) is the classic figure. Papers differ: global SDR, median of per-song medians (museval, the SigSep default), or "nSDR" (LarsNet's simplified form). A "median of medians" can be 1 to 2 dB higher than a global SDR for the same output (MEMORY). Treat gaps under about 0.5 dB as noise.
- "No extra data" means trained on the 100 MUSDB18-HQ training songs only. Models trained on extra proprietary songs score 1 to 3 dB higher and cannot be reproduced from open data.
- MVSEP's "Multisong" and "DrumSep test" sets are the MSST maintainers' own sets, listed in their docs table (READ), not public benchmarks.
- MUSDB18-HQ itself is licensed `other-nc` on Zenodo (READ: https://zenodo.org/api/records/3338373, "MUSDB18-HQ - an uncompressed version of MUSDB18", published 2019-08-01, access open, licence id `other-nc`). Any weights trained on it inherit a question mark (section 6).

### 1.3 Comparison table

Columns: engine and year; what it separates; best figure found, with source and date; code licence; weights licence or stated terms, and training data; size and speed; maintenance state (as of 21 November 2026, from what I could read). "n/f" means not found.

| Engine (family, year) | Separates | Figure (source) | Code licence | Weights licence / training data | Size, speed | State |
|---|---|---|---|---|---|---|
| **HT-Demucs** `htdemucs`, `htdemucs_ft`, `htdemucs_6s` (hybrid waveform+spectrogram transformer, 2022-23) | 4 stems (drums, bass, other, vocals); `_6s` adds guitar, piano ("piano ... not working great at the moment"); `_ft` is a bag of four per-source models | "HT Demucs f.t. (v4)" overall SDR 9.0 on MUSDB-HQ, trained with 800 extra songs; paper-level figure, Demucs README table (READ, README at facebookresearch/demucs main). MSST docs: Multisong avg 9.16 (bass 11.76, drums 10.88, vocals 8.24, other 5.74) for the 4-stem model; 6-stem bass 11.22, drums 10.22, vocals 8.05, guitar and piano not scored ("---") (READ, MSST docs/pretrained_models.md, snapshot 21 Nov 2026) | MIT, "Copyright (c) Meta Platforms" (READ LICENSE) | No separate licence for the weight files found in the README, which says "Demucs is released under the MIT license". Third-party conversions label themselves MIT (HF `Retrobear/demucs.cpp` tags `license:mit`; `monteslu/htdemucs-web-onnx` `license: mit`; READ). Trained on MUSDB-HQ + 800 songs (README); the 800 are not released | 42 M params, 160 MiB F32 / 100 MiB F16 (stems.cpp README, READ). README: CPU time "roughly equal to 1.5 times the duration of the track"; GPU 3 GB minimum, about 7 GB with defaults; segment max 7.8 s for hybrid transformer; `--shifts` multiplies time; `_ft` 4x time | README line 8: "this repository is not maintained anymore" (author left Meta); fork at adefossez/demucs "not actively maintained" (READ) |
| Hybrid Demucs v3 `hdemucs_mmi`, `mdx_extra` (2021-22) | 4 stems | v3 overall 7.7 (no extra data); MSST: Demucs3 mmi Multisong avg 8.88 (READ) | MIT | as above; `mdx_extra` "including MusDB test set" in its training (README) | smaller than v4; v3 mt build 2.5 min vs 4 min (demucs.cpp, READ) | frozen |
| **Open-Unmix** `umxhq`, `umxl` (BLSTM on spectrograms, 2019 / 2021) | 4 stems, one model per target | Overall 5.3 in Demucs' comparison table (READ) | MIT (READ LICENSE, Inria) | `umxl`: "trained on private stems dataset ... weights are only licensed for non-commercial use (CC BY-NC-SA 4.0)" (README; Zenodo 5069601 `cc-by-nc-sa-4.0`, 2021-07-05, READ). `umxhq`: Zenodo 3370489 `mit-license`, trained on MUSDB18-HQ (READ) | umxhq files 35.6 MB per target; umxl 113 MB per target (Zenodo file sizes, READ) | reference model, low score, last big change 2021 (README) |
| **Spleeter** (U-Net, Deezer, 2019) | 2, 4, 5 stems (5 = piano) | Overall 5.9 with 25k songs in Demucs' table (READ); Spleeter README claims 4-stem separation "100x faster than real-time" on GPU (READ) | MIT, "Deezer SA" (READ LICENSE) | README states "The code of Spleeter is MIT-licensed" and says nothing on the weights; n/f. Trained on Deezer's private catalogue (MEMORY) | TensorFlow; M1 issues noted in README | README says Deezer does not maintain forks; commercial "Spleeter Pro" exists (READ) |
| **KUIELab MDX-Net** (TFC-TDF-U-Net + MDX, 2021) | per-stem models: vocals, drums, bass, other | 7.5 overall in Demucs' table; MDX 2021 leaderboard A winner (READ) | MIT, "KINoAI 2020" (READ kuielab/mdx-net LICENSE) | **CC BY 4.0**, Zenodo 5717356 "KUIELab-MDX-Net", 2021-11-21 (READ API); trained on MUSDB-HQ for leaderboard A | `onnx_A.zip` 110 MB for the stem models (READ); in the app today | UVR mirrors them; not updated since 2021 |
| **MDX23C** (TFC-TDF v3, SDX23, 2023) and ZFTurbo ensembles | 4 stems; also drumsep and similarity models | SDX23 Standard leaderboard: ZFTurbo ensemble mean 9.26 (bass 9.94, drums 9.53, other 7.05, vocals 10.51); kuielab 8.97; baselines UMX-L 6.52, BSRNN 6.14 (SNIPPET, search returned the TISMIR article text: https://transactions.ismir.net/articles/10.5334/tismir.171). MSST, trained on MUSDB only: MDX23C MUSDB test avg 7.15 (READ) | MIT (MSST, "Roman Solovyev") | MSST-released weights: licence not stated in the docs table I read; n/f | MSST says batch sizes assume a 48 GB A6000 for training | MSST active (README cites a 2026 arXiv paper, 2607.23395) |
| **BS-RoFormer** (band-split RoPE transformer, ByteDance SAMI, 2023) | 4 stems; many community vocal and instrument variants | arXiv 2309.02612 abstract: smaller model on MUSDB18-HQ, no extra data, **9.80 dB average SDR**; the SAMI-ByteDance system took first place in SDX23 MSS (READ). SDX23 Standard leaderboard: 9.97 mean (bass 11.15, drums 10.27, other 7.08, vocals 11.36), listed without a prize (SNIPPET). MSST MUSDB-only BS-Roformer: 9.65 avg (READ) | lucidrains/BS-RoFormer MIT (READ, "Copyright (c) 2023 Phil Wang"); the paper's authors' own repo (asriverwang) licence unread | viperx "ep_317" vocals model (Multisong vocals 10.87, READ) **has no upstream licence** (stems.cpp `docs/DISTRIBUTION.md`: "viperx's BS-RoFormer has no license anywhere upstream ... Treat it as unlicensed", READ) | 160 M params, 609 MiB F32 (stems.cpp, READ) | active in the community; MSST also lists BS PolarFormer (vocals 11.00) and BS Mamba2 |
| **Mel-Band RoFormer** (2023) | vocals/instrumental mostly; community: karaoke, dereverb, crowd, denoise, aspiration | Kim edition: Multisong vocals 10.98 (MSST, READ); aufr33+viperx crowd model 5.99 | same repos as above | Kim's checkpoint `KimberleyJSN/melbandroformer`: **MIT** (HF API `license:mit`, last modified 2026-04-22, READ). Others vary: `Sucial/Dereverb-Echo_Mel_Band_Roformer` CC BY-NC-SA 4.0; `becruily/mel-band-roformer-deux` CC BY-NC 4.0 (HF tags, READ) | 228 M params, 870 MiB F32 / 435 MiB F16 (stems.cpp, READ) | active; 2025-26 uploads on HF |
| **SCNet** (sparse compression network, 2024) | 4 stems | arXiv 2401.13276 abstract: **9.0 dB SDR on MUSDB18-HQ without extra data**; "CPU inference time is only 48% of HT Demucs" (READ). MSST MUSDB-test avg: SCNet Large 9.70, XL 9.80, **XL IHF 10.08** (bass 9.23, drums 11.81, vocals 11.42, other 7.88) (READ) | MIT, "starrytong 2024" (READ); the official repo ships training code and no pretrained link in its README | MSST releases the checkpoints (v1.0.6 to v1.0.17); licence n/f; trained on MUSDB only per the MSST section | "Small" to "XL" sizes; XL IHF is larger and slower (sizes n/f) | MSST adds variants through 2025-26 |
| **SubRoformer** (subband time-domain, 2026) | 4 stems at 48 kHz | repo README: mean **11.59** (vocals 12.69, bass 11.50, drums 12.23, other 9.94), median of per-song medians, MUSDB18-HQ test, trained on MUSDB-HQ + **500 internal songs** (READ https://raw.githubusercontent.com/ArchiMickey/SubRoformer/main/README.md; HF files updated 2026-11-17). MSST README lists it with arXiv 2611.08130 (READ the listing only) | MIT (READ LICENSE, "ArchiMickey 2026") | weights on HF `archimickey/SubRoformer`; the HF README returned "Entry not found", licence tag absent; n/f | ships a Core ML desktop app; CLI picks CUDA, MPS or CPU | newest model I found; self-reported, different SDR protocol, one week old: treat as unconfirmed |
| **Banquet** (query-based band-split, 2024) | any stem named by an audio query (guitar, piano, reeds, organ ...) | abstract: 24.9 M parameters, "approached the performance level of the significantly more complex 6-stem Hybrid Transformer Demucs on VDBO stems and outperformed it on guitar and piano" on MoisesDB (READ, https://github.com/kwatcharasupat/query-bandit). No per-stem numbers fetched (SNIPPET of the paper's table only) | MIT (GitHub licence badge "MIT license", READ via Firecrawl) | Zenodo 13694558, 2024-09-05: **CC BY-NC-SA 4.0**, checkpoints 551 to 645 MB each (READ API). Trained on MoisesDB, itself CC BY-NC-SA 4.0 (READ moises-ai/moises-db README) | needs a PaSST instrument-recognition model beside it; batch 12 "usually fits on a RTX 4090" | last commit 29 July 2025; no releases; single author |
| **AudioSep** (text-queried foundation separator, 2023) | any sound described in text (events, instruments, speech) | arXiv 2308.05037; no figure fetched (arXiv refused curl, credits gone): n/f | MIT, "Xubo Liu" (READ) | weights sit in the HF Space; the Space card says `license: mit` (READ HF API); training data: AudioSet-class corpora (MEMORY, unverified) | checkpoint `audiosep_base_4M_steps.ckpt` | research code, no ONNX route found |
| **Apollo** (band-sequence restoration, 2024) | not separation: repairs lossy or damaged audio | arXiv 2409.08514; evaluated on MUSDB18-HQ and MoisesDB (READ README abstract); no SDR fetched | CC BY-SA 4.0 (READ LICENSE, README badge) | HF `JusperLee/Apollo` `cc-by-sa-4.0` (READ API); one `pytorch_model.bin` | MSST lists an Apollo LQ MP3 restoration model | a possible clean-up step after separation; not needed now |
| **LarsNet** (five parallel U-Nets, 2024) | drum stem into kick, snare, toms, hi-hat, cymbals | nSDR **17.7 dB** on the StemGMD eval fold against 10.97 (NMFD) and 7.24 (SAB-NMF); per-piece gains over SAB-NMF +7.39 dB kick (partly cut off in my read), +6.91 snare, +20.63 toms, +3.14 hi-hat, +8.4 cymbals (READ, Pattern Recognition Letters 183, 2024, ScienceDirect article S0167865524001351). In-domain: four of ten kits unseen, all synthesised acoustic kits | no LICENSE file at `main` or `master` of polimi-ispl/larsnet (404); README names none: n/f | pretrained checkpoints (562 MB) **CC BY-NC 4.0**; dataset StemGMD **CC BY 4.0** (Zenodo 7860223, 2023-04-24, 1224 h, built from Magenta's Groove MIDI Dataset through Apple Drum Kit Designer) (READ) | real-time ratio 0.016 on a Titan V (62.5x real time), 0.15 on a Xeon E5-2687W (6.6x) (READ paper); `-w` option adds alpha-Wiener filtering | training scripts "will be available soon" (README); VST3/AU plug-in LARS on top (EdoardoMor/LARS, no LICENSE file found, beta) |
| **DrumSep, htdemucs version** (inagoy, 2022-24) | kick, snare, cymbals, toms | MSST table: kick 10.52, snare 6.05, toms 4.68, hh-cymbals 5.03 on "DrumSep test" (READ) | MIT (READ inagoy/drumsep LICENSE, "Iñaki Goyeneche 2024") | no weights licence; HF mirror `vincewin/drumsep` is tagged `license: unknown` (READ). From a thesis (Universidad Nacional de Quilmes, 2022) | Hybrid-Demucs-sized | README: "efforts are currently underway" to document; low activity |
| **DrumSep MDX23C** (aufr33 + jarredou, 2024-25) | kick, snare, toms, hi-hat, ride, crash (six) or five | MSST: kick 16.66, snare 11.53, toms 12.33, hh 4.04, cymbals 6.36 (jarredou five-stem); aufr33+jarredou six-stem kick 14.54, snare 9.79, toms 10.63, hh 3.19, cymbals 6.08 (READ). A converted-model card gives "ep_141, SDR 10.8059" for the six-stem model | MSST MIT | **none stated**: stems.cpp card: "No license is stated for these weights anywhere upstream ... its original release page is no longer online" (READ HF `thepatch/mdx23c-drumsep-GGUF`). Intel's OpenVINO conversion is tagged `cc-by-nc-sa-4.0` on its own authority (READ). Training data: unknown | 417 MiB GGUF F32 | author's HF account gone; mirrors only |
| **cukas/drumsep** (2026) | kick, snare, hi-hat, cymbals, toms, no ML | "No ML": HPSS, transient detection, spectral gating; no score published in the README I read | MIT (READ) | none (no weights) | pure Python, <100 ms start-up | it is the same class of method as the app's band split; interesting only as a baseline |
| **anvuew dereverb** (BS/Mel-RoFormer, 2025) | removes room reverb from **vocals** (mono-trained); not from drums or synths | file names carry SDR 19.17, 18.81 (less aggressive), 20.40 (mono) on the author's own set (READ HF card); no protocol stated | MSST host code MIT | **GPL-3.0** (HF tag and stems.cpp doc, READ) | 112 MiB F32 for the room model (stems.cpp, READ) | active; see 3.4 |

Runners and zoos (not models), all READ unless marked:

- **Music-Source-Separation-Training (MSST)**, https://github.com/ZFTurbo/Music-Source-Separation-Training: MIT, "Brought to you by MVSep.com". Training and inference for `mdx23c`, `htdemucs`, `bs_roformer`, `mel_band_roformer`, `scnet` (and `scnet_tran`, `scnet_masked`), `bandit`, `bandit_v2`, `apollo`, `bs_mamba2`, `dttnet`, `sub_roformer`, `dbs_*`. Has `ensemble.py` (avg_wave, median, min, max, fft variants; "In my experiments avg_wave was always better or equal in SDR"). Separate ONNX/TensorRT converter repo, ZFTurbo/MSS_ONNX_TensorRT, and `pip install msst`. This is the community's training framework; to train on the app's own renders is a config change plus a dataset folder.
- **Ultimate Vocal Remover (UVR) GUI and its model repo** (TRvlvr/model_repo releases): README says the code is "MIT-licensed", "UVR's core developers trained all of the models provided in this package (except for the Demucs v3 and v4 4-stem models)", and asks third parties to "honor the MIT license by providing credit to UVR and its developers". A top-level LICENSE file was not at `master` (404 for that raw path), so the README is the only statement I read. Model weights: no per-file licence; see stems.cpp's reading above (viperx BS-RoFormer, Kim_Vocal_2 and the VR models: no upstream licence).
- **python-audio-separator** (nomadkaraoke, MIT, "Copyright (c) 2023 karaokenerds"): runs MDX-Net, VR, Demucs and MDXC/RoFormer models from UVR's zoo; CUDA, CoreML (Apple Silicon, for ONNX), MPS (for PyTorch), and an experimental DirectML route. Its README says DirectML: MDX models GPU-accelerated; RoFormer runs on CPU automatically; Demucs not supported (torch-directml lacks the fused LSTM op). `--chunk_duration` splits long audio without crossfade ("may result in minor artifacts at chunk boundaries"). Ensemble flag. This is the easiest Python wrapper over the zoo; it inherits the zoo's licence gaps.
- **stems.cpp** (betweentwomidnights, MIT, 2026): C++ on ggml, "No PyTorch, no Python at inference time". Runs htdemucs, htdemucs_6s, htdemucs_ft, Kim's Mel-Band RoFormer, viperx BS-RoFormer, UVR VR denoisers and dereverbs, anvuew's room dereverb, Kim_Vocal_2 and DrumSep, on CPU, CUDA, Vulkan and Metal. Its PARITY doc (measured 2026-09-24 and 25) reports htdemucs "at about 0.45x realtime" on a Xeon E3-1535M v6 laptop CPU and "about 3.4x realtime" on the GPU path, and sample-for-sample parity with PyTorch (71 to 126 dB SNR per stem for htdemucs).
- **demucs.cpp** (sevagh, MIT): Eigen, no GPU. 4-minute song on a 16-core 5950X: 10 min 23 s single-threaded, 4 min 9 s with 4 threads (README PERFORMANCE doc, READ). Slower than PyTorch by design ("sacrificing the speed of the Torch implementation" for memory and WebAssembly). Pre-converted ggml weights on HF (`Retrobear/demucs.cpp`, tagged MIT).
- **BSRoformer.cpp** (chenmozhijin): referenced by a model card; its README and LICENSE paths returned 404 on `main`: licence n/f.

## 2. Drum-kit separation specifically

Facts first (READ above): LarsNet (2024) is the only peer-reviewed deep drum-kit separator I found; 5 outputs; synthesised acoustic kits; weights non-commercial. DrumSep MDX23C (2024-25) is the community's best-scored model, six outputs, no licence, original release gone. DrumSep htdemucs (2022-24) is weaker (snare 6.05, toms 4.68). There is also a no-ML baseline (cukas/drumsep, 2026) that works the same way the app's band split does.

What the numbers say, and do not say:

- LarsNet's 17.7 nSDR and DrumSep's per-piece SDR are on different test sets with different kit pieces; they cannot be ranked against each other. Hi-hat is the weak piece in every table (DrumSep 3.19 to 4.04; LarsNet's gain over NMF only +3.14 dB). Open versus closed hat, and ride versus crash, are the hard splits.
- Every drum model I found was trained on **acoustic kits** (StemGMD: Logic's Drum Kit Designer; DrumSep: training data not stated). The app's music is electro, with 808 and 909 voices, claps, rim shots, layered kicks and sidechain. That is out of distribution for both models. This is my inference from the training-data statements, not a measured result; the test in stage 1 below measures it on the app's own renders, where per-voice truth exists.
- Neither model separates **clap, rim, cowbell, maracas or percussion**. LarsNet has no clap output; its five outputs are fixed. The app's engine has 27 voices (CLAUDE.md), so a five- or six-way split is a coarse grouping, not "every element isolated".
- Query-by-example for drums (isolate "this kick", or all hits of one sample) is not covered by any drum model I found; Banquet's query path covers instruments, not individual drum samples (see 3.5).
- For one-shot-level isolation the practical route is a different one: after a drum stem exists, cluster the onsets by timbre and rebuild each class by the app's sampler/analysis path (S3's territory). That is outside S2's question, but it is what makes drum separation useful here: a 5-way split gives clean-enough audio per class for onset detection and hit-to-hit similarity.

Also available: **training your own**. StemGMD (CC BY 4.0, 1224 h, READ) is the only drum-stem dataset of that size, and MSST can train `mdx23c` or `scnet` on any folder of stems. Because the app can render its own drum voices with exact per-voice truth (`tools/analysis-truth.js` renders 27 voices at several settings, per the Lab Crew report), the app can build an electronic-kit training set the field does not have. The licence of such weights would be the app's own. Cost and effort: section 5 stage 3.

## 3. Beyond four stems

### 3.1 Guitar, piano, "other" split further (READ unless marked)

- `htdemucs_6s` is the only openly runnable guitar and piano separator I could verify; its own README says piano "is not working great at the moment" and MSST gives no guitar or piano SDR for it.
- BS-RoFormer SW six-stem (bass, drums, other, vocals, guitar, piano; ~175 M params, 699 MB checkpoint) exists only as mirrors; the author's (jarredou) Hugging Face account was deleted, the licence tag on the mirror is `unknown` (HF `FractalSurfer/BS-RoFormer-SW-6stem`, READ). I found no score for it in a source I could fetch.
- Banquet is the open model that scores guitar and piano above 6-stem HT-Demucs on MoisesDB (READ abstract); weights are non-commercial.
- A `becruily/mel-band-roformer-guitar` repository appears in a Hugging Face search (SNIPPET: name and download count only); its card returned "Entry not found", so licence and score are unknown.
- Synths, strings, brass, pads, FX: no open model separates these as classes. MoisesDB has 11 stem categories (README, READ) and Banquet claims reeds and organs by query. For electronic music, "other" stays "other" with today's open models. This is the largest gap against "every element isolated".

### 3.2 Lead versus backing vocals

Karaoke-style models exist in the UVR zoo and as `becruily/*karaoke` and aufr33/viperx models (SNIPPET: names from the HF search; MSST lists a Mel-Band RoFormer aspiration model with SDR 9.85, READ). I read no licence for them. Low priority for an electro app.

### 3.3 Bass versus sub

No model separates sub from bass. A linear-phase crossover (a 24 dB/oct Linkwitz-Riley split at about 100 Hz summing back exactly) is the honest tool, and it is a filter, not separation; label it as a split. MEMORY for the claim that no open model does this; I searched only the MSST and UVR lists, which have none.

### 3.4 Effects and reverb separated from the dry source

- Vocal dereverb exists (anvuew GPL-3.0 room model; Sucial CC BY-NC-SA dereverb-echo; UVR's VR de-echo and de-reverb models, which carry no upstream licence per stems.cpp, READ). All are vocal-trained. I found no open model that dereverbs drums, synths or a full mix.
- Reverb tail as a separate stem (wet/dry): no model found. The app already estimates reverb time and pre-delay on engine renders (Lab Crew report: 1.16 s read for 1.2 s). A wet/dry split on a separated stem remains an analysis-by-synthesis job (fit a reverb, subtract or invert), not a network.
- Denoise and aspiration models are in MSST's list (READ); `MDX23C similarity` extracts phantom centre (READ).

### 3.5 Query by example and text queries

- **Banquet** takes an audio query of the instrument ("--query_path ... random-guitar.wav") and separates what sounds like it (READ). It is the open answer to "separate by similarity to a reference sound". It needs the PaSST recognition model and a 24.9 M parameter network. Weights CC BY-NC-SA 4.0; trained on MoisesDB's instrument classes, so a query for "this exact kick drum" is not what it was trained for (my inference).
- **AudioSep** takes a text query; MIT code and Space card; I found no music-specific score and no ONNX path.
- I found no open model that separates "the sound that matches this one-shot sample" with sample-level accuracy. The app's own route is the analysis-side one: sampler recreation plus subtraction (cancel the sample from the mix with a fitted gain, delay and filter; works when the element is a sample-replay, which the Lab Crew report says the analysis can already detect, 0 confident wrong calls in 55). MEMORY: this is a standard "template subtraction" method; I fetched no source for it in this round.

## 4. Running them in the product

### 4.1 Routes

1. **Python sidecar from Electron (today).** Works, gives access to every model above through MSST or python-audio-separator, and to training. Costs: a Python environment with torch (about 2 GB, per the cukas README comparison, SNIPPET-grade), first-run model downloads (80 to 870 MiB per model), and the preflight problem `separate.py --check` already handles.
2. **ONNX Runtime native** (onnxruntime-node or the Python package) with CUDA, DirectML, CoreML providers. MSST has an ONNX/TensorRT exporter (READ). python-audio-separator reports CoreML for ONNX on Apple Silicon and DirectML for MDX only (READ). RoFormer attention graphs are the hard part: the composer project (below) found one ONNX graph "runs out of memory under 7 GB" and cut the model into 14 graphs.
3. **ONNX Runtime Web (WebGPU, WASM).** Working examples (READ):
   - `monteslu/htdemucs-web-onnx` (HF, MIT-tagged, files updated 2026-07-07): htdemucs, mixed precision, **126 MB**, 21 chained pieces; "full fp16 degrades the drums and bass stems badly"; "~22x realtime run back-to-back, ~8x with compositor-friendly pacing" on a Radeon RX 7600.
   - `timcsy/demucs-web` (MIT): ONNX Runtime Web with WebGPU and WASM fallback, 172 MB model, needs COOP/COEP headers (the app's `tools/serve.js` already sends them).
   - `better-lyrics/composer` (AGPL-3.0 licence file; READ): runs Kim's Mel-Band RoFormer (MIT) in the browser on WebGPU, STFT and iSTFT in JavaScript, 14 graphs run as separate sessions; export script takes about 10 minutes and needs about 4 GB RAM. This is the only AGPL peer I found doing it, and it is direct evidence the licence pairing works (MIT model code and weights inside an AGPL app).
4. **C++ and WASM ports.** demucs.cpp (CPU, Eigen; WASM-capable, single-threaded WASM module), stems.cpp (ggml: CPU, CUDA, Vulkan, Metal; no Python), free-music-demixer (sevagh, MIT code, archived demo, "model weights are proprietary and not covered by the MIT license", README, READ; htdemucs 81 MB and 6-stem 53 MB at float16, "Anything smaller affects the quality"; WASM timings below).
5. **Core ML and DirectML.** SubRoformer's desktop app uses Core ML on macOS 15+ (READ). DirectML: MDX only works today (READ python-audio-separator). MEMORY: Windows users without NVIDIA will get Vulkan through stems.cpp more reliably than DirectML.

### 4.2 Sizes, memory, times for a five-minute song

Only stated figures are quoted; the five-minute numbers are my arithmetic from them.

| Route | Stated | Five minutes (arithmetic) |
|---|---|---|
| PyTorch Demucs, CPU | "roughly equal to 1.5 times the duration" (Demucs README, undated) | about 7.5 min |
| stems.cpp htdemucs, laptop CPU | 0.45x realtime, Xeon E3-1535M v6, 2026-09-24 (READ) | about 11 min (an old 4-core laptop; a recent laptop is faster, no figure) |
| demucs.cpp, 16-core desktop | 4-minute song 10 min 23 s single, 4 min 9 s with 4 threads (READ) | 13 min / 5 min |
| WASM, free-music-demixer | "Georgia Wonder - Siren" (about 7 min) 41 min single thread, about 9 min with 8 workers (READ) | about 30 min / 6.5 min |
| stems.cpp htdemucs, GPU path | 3.4x realtime (READ; the card for the CUDA row not stated, a laptop RTX 5070 appears in the Vulkan section) | about 1.5 min |
| WebGPU htdemucs, RX 7600 | about 22x realtime back-to-back (READ) | about 14 s |
| LarsNet on a drum stem | 0.15 RTR on a Xeon E5-2687W, 0.016 on a Titan V (READ) | 45 s CPU / 5 s GPU |
| `htdemucs_ft` | 4x the time of `htdemucs` (README) | 4x the row above |
| Roformer 228 M (Kim) | 870 MiB F32; no timing fetched | not found |

CPU timings from different years and CPUs vary by a factor of three or more; I found no timing on a current consumer laptop for any model. That is a gap (section 7). The GPU figures are for a recent card; a four-year-old integrated GPU will not see them.

Memory: Demucs needs at least 3 GB of GPU memory, about 7 GB at defaults (README). `htdemucs` weights 160 MiB F32. A Roformer of 228 M parameters needs roughly four times that in F32 plus activations; the composer report of ">7 GB as one ONNX graph" is the only measured figure (READ).

### 4.3 Chunking and overlap-add

- Demucs: segments of 7.8 s at most for the transformer models, overlap 0.25 by default, `--shifts` random shifts averaged (README). SDX23 winner ZFTurbo's table (SNIPPET, TISMIR article text): shifts 2 / overlap 0.5 mean 9.43; 4 / 0.75 mean 9.47; 1 / 0.95 mean 9.48; 10 / 0.95 mean 9.49. The extra cost buys about 0.06 dB. At default settings the app has most of the available quality on that axis; the real gain is the model choice.
- The same paper (SNIPPET) reports two cheaper tricks: separate the song a second time with the waveform multiplied by -1 and average after undoing the sign; and compute the instrumental (mix minus vocals) and feed it to the other-stem models instead of the mix.
- MDX-Net in `separate.py`: 523,264-sample chunks, 50 % Hann overlap, normalised by the summed window. Fine.
- demucs.cpp parallel mode splits the track into num_threads pieces with 0.75 s overlap (READ).
- python-audio-separator's `--chunk_duration` concatenates without crossfade (README, READ): do not use it for stems that must be sample-aligned and click-free unless overlap is added; the app's own chunker should crossfade.

### 4.4 Phase, residual, summing back to the mix

- Mask-based models (Open-Unmix, MDX-Net, BS/Mel-RoFormer, SCNet) estimate a magnitude or complex mask per stem; stems need not sum to the mixture. Waveform-domain branches (Demucs) also do not guarantee it. MEMORY: none of the open releases enforces mixture consistency by default.
- What the sources say: Demucs rescales stems to avoid clipping and "this can break the relative volume between stems" (README); LarsNet offers alpha-Wiener filtering to reduce cross-talk, at the price of "side-chain compression-like artifacts" for alpha of 1 or more (README); stems.cpp's PARITY doc records a CUDA build that "produced stems that were mostly noise above 8 kHz and did not sum back to the mix (0.4 dB)" while a single-segment check passed, and tells users to run a full-WAV check on the build they use (READ). A sum-to-mix check catches real bugs.
- Recommended handling (MEMORY, standard practice): store a **residual** = mix minus the sum of the stems, as its own file or as a computed value in the sidecar. Report its level in dB below the mix. Mixture consistency by redistributing the residual in proportion to stem energy is optional; offer it as a switch, not a default, because it smears one stem's errors into the others.
- Ensembling: averaging models (MSST `ensemble.py`, `avg_wave`) is cheap to run offline but multiplies time by the number of models; the SDX23 winners used four Demucs variants plus UVR MDX models (SNIPPET). Gains on the 4-stem mean are about 0.3 to 1 dB over the best single model (derived from SDX23 9.26 vs a single `htdemucs_ft` at 9.0; different test sets, so an indication only). For a few users on one laptop, a two-model ensemble in an "overnight/high quality" mode is the most that is proportionate.

## 5. Stem handling

### 5.1 Formats and conventions

- **Multi-file WAV folder.** What `separate.py` writes: `<name>-<stem>.wav` plus `<name>-stems.json` (model, settings, timings, attribution; READ). What Demucs writes: `separated/<model>/<track>/{drums,bass,other,vocals}.wav` (README). What MoisesDB distributes: one folder per track with stem files (README, READ). Universal, every DAW and Python tool reads it, no tag or container risk. Use 24-bit or 32-bit float WAV (not Demucs' int16 default).
- **Native Instruments Stems (`.stem.mp4`).** An MP4 container (ISO/IEC 14496-12/-14) holding stereo tracks, usually AAC, five stereo tracks (a mixdown plus four stems) per the NI ISMIR 2015 late-breaking paper (SNIPPET, WebSearch result text; the paper itself returned 403 to curl). Older commentary says "four stems" (SNIPPET). The metadata sits in a `stem` atom (a JSON manifest) that tells the DJ software the track names and colours; the open-source `monteslu/stem-mp4` library writes and reads it and says the `stem` atom lives at `moov/udta/stem` (SNIPPET: the library's README text came back as a search result). Practical limits (SNIPPET): AAC bitrate capped around 256 kbps in NI's Stem Creator; a Mixxx forum post says the format "provides metadata that's used to configure a specific DSP that you have to license from them". Lossy and DJ-specific: use it as an **export** target for DJ use, never as the project's storage. I could not read the specification itself.
- **Multichannel WAV / BWF.** One file with N channels (stereo pairs in sequence) keeps stems sample-locked in one file and one hash. Weak channel-naming conventions: channel labels rely on the iXML or `chna` chunks, which tools often ignore (MEMORY). Avoid as primary storage; fine as export for hardware or DAWs that expect it.
- **Sidecar JSON.** The one thing every route needs. Fields I would require: source hash, source duration in samples and sample rate, model id and version, model-weights hash, licence and attribution string, run parameters (shifts, overlap, segment, ensemble list), per-stem file, per-stem peak and RMS, residual level, wall time, tool version. `separate.py` already writes most of these for the MDX path (READ).

### 5.2 Alignment, latency, sample rates

- Offline models are non-causal and add no latency; output length equals input length when the tool trims correctly. Verify by cross-correlating each stem's sum with the mix: lag must be 0 samples and length equal. Do this once per model, not per file. The stems.cpp parity doc is an example of such a check going wrong (a build with stems that did not sum, READ).
- Sample rate: htdemucs, MDX-Net and the RoFormers work at 44.1 kHz (MDX in `separate.py`; htdemucs input "44100Hz stereo" in demucs-web, READ). SubRoformer writes 48 kHz (READ). Canonical stem rate: 44.1 kHz float, resampled by the same polyphase filter on the way in as `separate.py` already uses (`resample_poly`); store the original rate in the sidecar; resample stems to the project rate at import, not at separation, so the file on disk is the model's native output.
- Mono sources: duplicate to stereo (as `separate.py` does) and store the original channel count.

### 5.3 How a project should reference stems

- By **content hash plus role**: the project stores `{sourceHash, modelId, stemName, relativePath, sampleRate, lengthSamples}`; the path is a hint, the hash is the identity. This is the same idea as Ardour's "copy versus link" choice (SNIPPET from WebSearch: Ardour copies imported files into the session's `interchange/` folder by default and converts to the session's format and sample rate, or links to the original on disk, in which case a backup of the session folder misses them; its manual says nothing below `interchange` is Ardour-specific). Lesson: default to copy-into-project (or into a project-owned cache keyed by hash) and offer "link" as the exception.
- Never store stems inside the repository; the repo rules keep reference audio and anything under someone else's copyright out (CLAUDE.md).
- Cache layout: `<cache>/stems/<sha256-of-source>/<modelId>-<weightsHashShort>/` containing the stem WAVs, residual and `stems.json`. Key the cache by (source hash, model id, weights hash, parameters hash) so a changed overlap or model re-runs rather than serving stale files. SHA-256 of the decoded float PCM (not of the MP3 bytes) means a re-encode of the same audio still hits the cache; MEMORY: this is common practice, no source fetched.
- Other open tools: Ardour (above); MoisesDB and MUSDB distribute folder-per-track; Demucs/UVR output folders; I found nothing about Audacity, REAPER or LMMS stem handling in this round (n/f).

## 6. Recommended pipeline for this app, with licence position

Context assumed: non-commercial, AGPL-3.0-or-later, a few users, desktop Electron, Python sidecar exists, no bundled model files today (models download to `~/.cache/havantechno/models`).

### 6.0 The three licence problems that matter

1. **Many of the best weights have no licence at all.** Demucs' weights have no statement beyond the repo's MIT; viperx's BS-RoFormer, UVR's Kim_Vocal_2 and VR models, and the DrumSep MDX23C weights have none (stems.cpp `DISTRIBUTION.md`, READ; the DrumSep original release page is gone). With no licence, the default legal position is "all rights reserved" (MEMORY, general copyright). Position for this app: download on the user's machine from the original host, record the source and absence of a licence in the sidecar and in `THIRD_PARTY.md`, **never mirror, bundle or commit them**, and do not claim a licence the weights do not carry. Prefer MIT/CC BY weights in the default path (Demucs as the de-facto exception, with mirrors self-labelled MIT).
2. **Non-commercial weights collide with an AGPL promise of free reuse.** LarsNet (CC BY-NC 4.0), Banquet and the Sucial dereverb (CC BY-NC-SA 4.0), UMX-L (CC BY-NC-SA 4.0) are fine for a non-commercial app used by a few people, but anyone who forks the AGPL app and sells it cannot take those weights with it. Keep them as **optional downloads behind a visible "non-commercial" label**, outside the default install. CLAUDE.md already says "CC BY-NC material stays non-commercial". Share-alike weights (Apollo and Banquet) add a second question: whether outputs or a bundled copy are "adaptations" (MEMORY: CC BY-SA 4.0 is one-way compatible with GPL-3.0; whether that carries to AGPL-3.0 via the GPL section 13 link is a lawyer's question; I would not bundle).
3. **Training-data terms may reach the weights, and nobody has settled it.** MUSDB18-HQ is `other-nc` (READ, Zenodo), MoisesDB CC BY-NC-SA (READ), Open-Unmix's UMX-L explicitly non-commercial because of its private data (READ); Demucs, BS-RoFormer winners and SubRoformer add unreleased proprietary songs. The Lab Crew report already flags "Whether the training data's terms reach either model's weights is not settled" (READ). For a non-commercial app this risk is low; it becomes the blocking question the day anyone charges for it. The clean exit is the app's own weights trained on its own renders (stage 3), or a model whose authors state terms (KUIELab's CC BY 4.0).

Smaller points. Separated stems of a copyrighted record are derived from that record: they stay on the user's disk and out of the repo. UVR asks for credit (README, READ); KUIELab's CC BY 4.0 requires attribution, which `separate.py` already writes. GPL-3.0 weights (anvuew) and AGPL code are mutually compatible in the usual reading (MEMORY).

### 6.1 Stage 1: switch and fix now (small, no new models)

1. Keep HT-Demucs as the default. Change the Demucs call to `--float32` and decide the clip mode: `--clip-mode clamp` keeps relative levels (the README's own statement), at the risk of hard-clipped peaks; or run with a lowered input gain and store the gain in the sidecar. Add `--overlap` and `--shifts` as options; default shifts 0.
2. Write a residual file and its level in `stems.json` for both paths; refuse to report success if the residual is above a threshold you choose.
3. Add `htdemucs_6s` as an experimental option (guitar, piano) with the README's own warning shown.
4. Replace the band-split drum "separation" by an optional download of **MDX23C DrumSep** (best-scored, six outputs, no licence: label it) and **LarsNet** (five outputs, NC: label it). Keep the band split as the fallback, labelled "band split", not "separated".
5. Record, for each run, model id, weights hash and licence string in the sidecar; add `THIRD_PARTY.md` entries per model.

Test for stage 1 (on audio with known truth): render an 8 to 16 bar section with `tools/render.js` using `--sampler-from` where a sampled part exists, plus the twelve solos summed (the Lab Crew method). Measure (a) per-stem SDR against the solos, now with float32 output, and compare against 24.0 / 17.7 / 19.4 dB; (b) residual level in dB; (c) lag and length (0 samples); (d) for drums, render each of the engine's 808 and 909 voices alone, mix them in a groove, separate with the band split, LarsNet and DrumSep, and score per voice grouped to the model's outputs (kick, snare, toms, hats, cymbals). Expected outcome: that the acoustic-trained models drop on electronic voices; the number is the finding. Accept a model only if it beats the band split by a margin you set before running (say 3 dB on kick and snare).

### 6.2 Stage 2: add next (quality and no-Python path)

1. A **vocals-first cascade**: Kim's Mel-Band RoFormer (MIT, READ) for vocals and instrumental, then Demucs on the instrumental for drums, bass, other. The method is the SDX23 winners' (SNIPPET); the weights are the clearest-licensed top-scoring ones I found. Needs the MSST or python-audio-separator runner; MIT code.
2. A **Python-free option**: stems.cpp (MIT; htdemucs 4/6/ft, Kim's RoFormer, VR dereverbs, DrumSep) so users without the Python setup still get separation; ggml weights; 0.45x realtime on an old laptop CPU, 3.4x on GPU (READ, 2026-09-24/25). Check its parity doc against your own truth (test below) before trusting the GPU builds (they had a sum-to-mix bug).
3. **Vocal dereverb** (anvuew room model, GPL-3.0) as an optional step on the vocals stem only; label it vocal-only.
4. **SCNet XL IHF** (MUSDB test 10.08, MIT code) as a candidate default if MSST's weights turn out to carry a usable licence; ask in the MSST issue tracker before adopting (the licence of its released checkpoints is n/f).
5. **Stem storage**: cache by hash and the sidecar of section 5; export NI `.stem.mp4` as an output only.

Test for stage 2: the same truth render, plus a **reverb case**: render a stem dry and with a known reverb (the Lab Crew's known-RT60 cases), separate the wet vocal or element, and score dereverb by the residual against the dry truth; plus **sum-to-mix** and **lag** per backend (PyTorch, stems.cpp CPU, stems.cpp GPU): stems.cpp's own claim is 62 to 126 dB SNR against PyTorch; measure the same on your render. Also a determinism test: separate twice and compare hashes.

### 6.3 Stage 3: try later (research, own weights)

1. **Train an electronic-music separator on the app's own renders** with MSST (`mdx23c` or `scnet`): the app can render unlimited songs with exact stems and exact per-voice drum truth (`tools/render.js`, `tools/analysis-truth.js`). Fine-tune from a MIT/CC BY starting point (KUIELab's CC BY 4.0 weights, MSST's MUSDB-only checkpoints) so the result carries clean terms, with the caveat that fine-tuning inherits the start point's terms (MEMORY). Real-music generalisation of weights trained on a synthetic engine is unproven; mix in real stems the owner has the right to use, and measure on those.
2. **Drum-kit model for electronic kits**: same method, 6 to 9 outputs including clap and rim, trained on per-voice solos. This is the only way to get clap, rim, cowbell classes at all (section 2).
3. **Query-by-example**: Banquet as an optional NC download for "isolate a guitar like this" queries; test on engine renders where the queried instrument is a labelled synth voice.
4. **Browser route**: WebGPU htdemucs (22x realtime on an RX 7600, READ) inside the Electron renderer would remove the sidecar for the 4-stem case; composer shows an AGPL app doing the same for a RoFormer. Needs per-GPU testing.
5. **Ensembles** (two-model average, SDX23 tricks) as an off-line high-quality mode.

Test for stage 3: a held-out set of engine renders **and** a handful of real tracks where stems are available; per-stem SDR, per-voice drum SDR, listening for artifacts; report against the stage-1 baseline in the same table.

### 6.4 What it costs to run (summary of section 4.2)

Stage 1: no new cost; htdemucs on a laptop CPU is minutes per song (about 7.5 min by the README's rule, about 11 min on an old CPU by stems.cpp's measure), under 2 min on a modern GPU. Stage 2 cascade: roughly doubles the time on CPU. Drum split: LarsNet is real-time-faster. Stage 3 training: MSST's configs assume a 48 GB A6000 (READ); expect rented GPU hours; no cost figure found.

## 7. What I could not find

- Any timing for any model on a current (2025-26) consumer laptop CPU or integrated GPU; the nearest are a 2017 Xeon laptop (0.45x realtime) and a 16-core desktop.
- Weights licences for: Demucs' own weight files (beyond the repo's MIT), MSST-released SCNet, BS-RoFormer and MDX23C checkpoints, SubRoformer, the UVR model zoo (as a whole), AudioSep (only the HF Space card), the DrumSep weights (stated absent), LarsNet's code.
- SDR for: AudioSep on music, `htdemucs_6s` guitar and piano, BS-RoFormer SW six-stem, Banquet per stem (only the abstract and a cut-off SNIPPET of a table), any open dereverb on non-vocal material, any karaoke (lead/backing) model.
- The NI Stems specification itself (native-instruments.com and the ISMIR paper host both refused); what I give is from search-result text.
- An open model for: electronic drum kits with clap/rim, synth classes, sub versus bass, wet/dry splitting of non-vocal stems, "this exact sample" query separation.
- GitHub API data (stars, last commit, issues) for most repositories; the proxy refused it. Maintenance is judged from READMEs and Hugging Face "last modified" dates.
- arXiv pages by curl (403); I read abstracts for BS-RoFormer (2309.02612) and SCNet (2401.13276) only; the Mel-Band RoFormer (2310.01809), Apollo (2409.08514), AudioSep (2308.05037) papers I could not fetch.
- Whether other open DAWs (Audacity, REAPER, LMMS) have a stem convention; only Ardour's import behaviour came back, from a search snippet.
- The Firecrawl credit limit ended the round after 6 searches and 4 scrapes of the 25 and 40 allowed; two planned searches (MUSDB18-HQ legal discussion, six-stem RoFormer licences) did not run. I covered the second through Hugging Face metadata and the first through the Zenodo record.

## 8. Sections resting on weaker evidence

- Section 1.3 rows for SDX23 leaderboards and for ZFTurbo's shifts/overlap table: SNIPPET (search-returned article text, not separately fetched).
- Section 5.1 on NI Stems and 5.3 on Ardour: SNIPPET.
- Section 3.3 (bass versus sub), the template-subtraction idea in 3.5, mask consistency and the residual practice in 4.4, caching by decoded PCM hash in 5.3, the legal reading of "no licence" and CC BY-SA/AGPL compatibility in 6.0: MEMORY.
- Everything in 1.1 and in the table's "READ" cells comes from files I fetched on 21 November 2026.

## 9. Ranked recommendation

1. Fix the Demucs call (float32, level policy, residual), keep HT-Demucs default.
2. Replace the band split with LarsNet or DrumSep as labelled optional downloads; measure them on the engine's electronic kits before trusting them.
3. Add the vocals-first cascade with Kim's Mel-Band RoFormer (MIT) and Demucs on the instrumental.
4. Add stems.cpp as a Python-free backend after a parity check on your own truth.
5. Build the hash-keyed stem cache and sidecar; export NI `.stem.mp4` only as an output.
6. Train your own electronic-music and drum-kit weights on the engine's labelled renders (clean licence, fills the clap/rim/synth gap).
7. Optional NC extras: Banquet for query-by-example, vocal dereverb.
