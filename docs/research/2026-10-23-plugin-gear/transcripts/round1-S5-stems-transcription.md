# S5: Stem separation and audio-to-MIDI transcription (the analysis front end) — round 1
Agent model: Sonnet. Date: 2026-10-23.

## Scope

The front end of the remix pipeline: source song -> stems -> MIDI and parameter data.

- (a) Stem separation: open-source models, commercial services and apps, and the stem features inside DAWs and DJ software.
- (b) Audio-to-MIDI transcription: polyphonic pitch, drums, chords and key, beat and downbeat tracking.
- (c) Browser feasibility of each (WebAssembly, ONNX Runtime Web, TensorFlow.js, WebGPU) versus server or desktop.
- Which Python libraries are the standard for the offline numpy/scipy style analysis, and whether they have JavaScript equivalents.

How to read the verification marks. This session's WebSearch budget ran out part-way through, and several hosts (huggingface.co, mixxx.org, ableton.com, essentia.upf.edu, izotope.com, stemsplit.io, kitmul.com, djmag.com, futureproofmusicschool.com, pypi.org) could not be fetched from the sandbox (DNS failure).

- `(verified: URL, fetched)` means I fetched that page and read the fact there.
- `(verified: URL, search text)` means the URL appeared in a search result and the search summary stated the fact. I did not read the page myself. Treat this as one grade weaker.
- `(unverified)` means no source in this session showed it.

Things I wanted to check and could not (no search budget left): the "Beat This!" beat tracker, Essentia.js model list, official LALAL.AI and Moises pricing pages, Apple's Logic Pro page, the FL Studio manual, official Open-Unmix and Spleeter licence files, Spleeter model sizes, Cubase/Bitwig/Studio One stem features, and any tool that estimates synth parameters from audio. These are "not found" in this report, not "do not exist".

## What the reference track needs from this category

From the analysis table in `docs/superpowers/specs/2026-10-21-guidance-studio-design.md` (the table was measured with numpy/scipy on the decoded MP3):

| Reference finding | What the front end must deliver | Difficulty (my judgement, unverified) |
|---|---|---|
| 126.0 BPM, straight 4/4, first downbeat 0.58 s | Tempo, beat grid and downbeat offset | Easy; electronic, steady. The studio already measured it with autocorrelation. |
| Key B, bass root B1 (~62 Hz), upper partials B major / G# minor | Key and root note | Easy for the root; the chord progression is flagged "lower confidence" in the spec. |
| Kick 4-on-the-floor, 130 -> 43 Hz sweep in ~60 ms | A clean kick stem, or kick onsets plus the sweep envelope | Kick and sub overlap in time and frequency; a 4-stem model will put both in "drums" and "bass" arbitrarily. |
| Sub: plucked sine, peaks ~35 ms after the kick, mono | Separate sub from kick | Hard. Not a stem any listed model outputs (inference from the 4-stem/6-stem output lists below). |
| Mid bass on steps 3, 7, 10, 14 | Bass stem, note onsets, pitch (B2-ish) | Medium. Monophonic bass is easy for pitch trackers once isolated. |
| Stabs on steps 2, 6, 7, 10, 14, 15; wide stereo (L/R corr 0.41) | "Other" stem, polyphonic notes, stereo kept | Medium-hard. Polyphonic chords; mono downmix in some transcribers loses the stereo cue. |
| Clap on beats 2 and 4; open hat off-beat 8ths; closed hat 16th pickups | Drum-stem onset classes (kick/snare-clap/hat open/closed) | Medium. Hat open/closed is detected by some tools (see ADTOF entry). |
| Breakdown: shaker, percussion, chord pad, 8th-note lead F#4 G#4 C#5 D#5 | Monophonic melody notes; pad chords | Medium. Spec says the lead melody was written from a note contour, not transcribed note for note; that is the gap this front end could close. |
| Form: intro 0:00, build 0:44, main 1:16, break 3:16, drop 4:20, outro 5:52 | Section boundaries | Not covered by any tool I researched (not found; not searched). Handoff to O1. |

The key point: the existing analysis found patterns by hand-tuned DSP (STFT, onset flux, autocorrelation tempo, band energies, FFT peaks) on the full mix. Stems would make each of those measurements cleaner (hat centroid on a drum stem instead of the full mix), but the stems themselves are an approximation of the original, so measurements on them carry the separator's artefacts.

## Findings

### A. Stem separation: open source

| Name | Vendor | Licence | Formats | Relevance to the element | Verified source |
|---|---|---|---|---|---|
| Demucs v4 (htdemucs, htdemucs_ft, htdemucs_6s) | Meta (facebookresearch); author's fork at adefossez/demucs | Open source, MIT. Repo archived by owner 1 Jan 2025, "not maintained anymore". | Python/PyTorch CLI. Output stereo WAV 44.1 kHz (int16 default, `--float32`, `--int24`) or MP3. Stems drums, bass, vocals, other; 6-stem adds guitar and piano ("piano output is weak"). | The default choice for splitting this track into drums / bass / other. SDR 9.0 dB on MUSDB HQ (htdemucs_ft). CPU time roughly 1.5x track length; GPU needs 3 GB minimum, ~7 GB default. | (verified: https://github.com/facebookresearch/demucs, fetched) |
| ONNX exports of HT-Demucs (Mixxx GSoC 2025 fork; demucs-onnx; adowu, smank, monteslu exports) | Mixxx contributor Anmol Mishra; StemSplit; community | MIT per a Hugging Face page crediting the Mixxx fork (search text only; not read) | ONNX; runnable from C++ (Mixxx) and onnxruntime-web (others) | Makes Demucs usable outside Python. Mixxx's goal was real-time stem separation in the DJ app; no speed or accuracy figures were found in the results. | (verified: https://mixxx.org/news/2025-10-27-gsoc2025-demucs-to-onnx-dhunstack/, search text) (verified: https://pypi.org/project/demucs-onnx/, search text) (verified: https://huggingface.co/smank/htdemucs-onnx, search text) |
| demucs-web (browser library) | timcsy (individual) | Open source, MIT | JS library using ONNX Runtime Web; WebGPU first, WASM fallback. Input 44.1 kHz stereo Float32Array; returns drums, bass, other, vocals each as left/right Float32Array. | The one verified route to run the best open model inside Havantechno's page. One ~172 MB ONNX file (`htdemucs_embedded.onnx`) downloaded on first load. Needs COOP/COEP headers (SharedArrayBuffer). 4 stems only. | (verified: https://github.com/timcsy/demucs-web, fetched) |
| htdemucs-web-onnx | monteslu (Hugging Face) | Not found | ONNX for onnxruntime-web on WebGPU; mixed precision fp16 except convolutions; split into 21 chained pieces; ~126 MB total; author reports ~2.4x speed-up over fp32 | Smaller WebGPU alternative to the 172 MB file. Author's own claims; I could not open the page. | (verified: https://huggingface.co/monteslu/htdemucs-web-onnx, search text) |
| Spleeter | Deezer | Code MIT. Licence of the pretrained weights not stated in any result. README warns to get authorisation from rights owners before use on copyrighted material. | Python/TensorFlow; 2, 4 and 5 (adds piano) stem models. A community ONNX conversion of the 4-stem model exists. | Older and lower quality than Demucs v4 (Demucs v3 hybrid is listed at 7.7 dB, Spleeter's own figure not found). Useful mainly as a small, fast model. | (verified: https://pypi.org/project/spleeter/1.5.3, search text) (verified: https://huggingface.co/Best-Practice/spleeter-4stems-onnx, search text) |
| Open-Unmix (umx, umxhq, umxl) | sigsep | Third-party index lists MIT; official page not read (search text only, treat as unverified) | PyTorch; 4 stems vocals/drums/bass/other; CLI reads wav/flac/ogg, not mp3 | Reference implementation, weaker than Demucs. Matters because it is the model behind the browser WASM demixer below. | (verified: https://pytorch.org/hub/sigsep_open-unmix-pytorch_umx/, search text) (verified: https://science.ecosyste.ms/projects/2457, search text) |
| free-music-demixer | sevagh (original), olilarkin (fork) | Not shown on the fetched page (links to a LICENSE file) | Static site; Open-Unmix UMX-L ported to C++/Eigen, compiled to WebAssembly; weights quantised to uint8, 425 MB -> 45 MB; output WAV | Proof that a small CPU-only WASM separator works in a page. Quality: SDR on one MUSDB18-HQ track: vocals 6.55, drums 6.54, bass 1.65, other 5.19. Memory can reach 4 GB. | (verified: https://github.com/olilarkin/free-music-demixer, fetched) |
| BS-RoFormer / Mel-Band RoFormer | ByteDance (BS-RoFormer paper); community checkpoints (Kimberley Jensen, MVSep and others) | Paper and training code open. A packaging project lists its checkpoints as CC-BY-NC-SA-4.0 (non-commercial); per-checkpoint licences not verified. | PyTorch; `bs-roformer` PyPI package; checkpoints from community. Newer than Demucs. | Higher separation scores than HT-Demucs on MUSDB18-HQ in several papers (see Quality). Ecosystem is community-run and licences vary. | (verified: https://pypi.org/project/bs-roformer/, search text) (verified: https://arxiv.org/html/2310.01809v1, search text) (verified: https://huggingface.co/Ryan5453/unblend, search text) (verified: https://mvsep.com/es/algorithms, search text) |
| MDX23C (Kuielab) and DrumSep variants | Kuielab; Jarredou drum-stem variant | Not found (the ADTOF wrapper is MIT; the model's own licence was not shown) | PyTorch; drums stem and drum-kit split | Used inside the drum transcription tools below to isolate drums and split a drum stem into kick/snare/hat etc. Relevant to separating kick from the rest of the kit. | (verified: https://github.com/xavriley/adtof_plus_drum_transcription, fetched) (verified: https://github.com/mykolad/drum2midi, fetched) |

Quality notes I can source:

- HT Demucs fine-tuned: 9.0 dB overall SDR on MUSDB HQ; Hybrid Demucs v3: 7.7 dB (verified: https://github.com/facebookresearch/demucs, fetched).
- BS-RoFormer: 9.80 dB average under standard training, up to 12.72 dB with extra data, against 9.20 dB for HT Demucs, in the Moises-Light paper's table (verified: https://arxiv.org/pdf/2510.06785, search text). A 2026 study over 50 tracks reports median SDR BS-RoFormer vs HT-Demucs of drums 11.68 vs 10.06, other 8.12 vs 6.51, vocals 10.78 vs 8.63, and bass 9.68 vs 9.78 (nearly tied) (verified: https://arxiv.org/html/2609.04224, search text).
- The same study says SDR predicts timing fidelity but not transient or dynamic fidelity (verified: https://arxiv.org/html/2609.04224, search text). That matters here: this project cares about the kick transient and the hat tone, which SDR does not measure.
- Numbers come from different papers and protocols and are not directly comparable. The search result itself flagged this.

### B. Stem separation: commercial services, DAW and DJ features

| Name | Vendor | Licence (commercial / free) | Formats | Relevance | Verified source |
|---|---|---|---|---|---|
| Stem separation in Live 12.3 | Ableton (algorithms from Music AI) | Commercial; Live Suite only; free update for Live 12 users | Desktop DAW. Splits any audio clip into vocals, bass, drums, others; High Speed or High Quality mode. | The most direct DAW example of "split a song into stems then work on them". Price of Suite not found. | (verified: https://www.ableton.com/stem-separation-in-ableton-live/, search text) (verified: https://mixdownmag.com.au/news/ableton-live-12-3-drops-overnight-with-stem-separation-and-splice-integration/, search text) |
| Audio-to-MIDI commands in Live ("Convert Drums / Harmony / Melody to New MIDI Track", "Slice to New MIDI Track") | Ableton | Commercial | Desktop DAW | Drums command pulls rhythm from percussive audio and tries to identify kick, snare and hat into a Drum Rack; melody command is for monophonic audio. Harmony (polyphonic) is described by Sound on Sound; I did not read the Harmony section of the manual. | (verified: https://www.ableton.com/en/manual/converting-audio-to-midi/, search text) (verified: https://www.soundonsound.com/techniques/making-notes, search text) |
| Stem Splitter in Logic Pro | Apple | Commercial | Needs Apple silicon Mac or iPad; six stems (vocals, drums, bass, guitar, piano, other) from Logic 11.2 | Secondary source only (dj.studio, a vendor with commercial interest); Apple's page was not found. | (verified: https://dj.studio/blog/daws-djs-stem-separation-workflows, search text) |
| Stem extraction in FL Studio | Image-Line | Commercial; from version 21.2, Producer Edition and above; four stems | Desktop DAW | Same caveat: secondary sources only; the manual was not found. | (verified: https://stemconsole.ai/blog/stem-separation-in-daws/, search text) |
| Serato DJ Pro, djay (Algoriddim), Traktor Pro | Serato, Algoriddim, Native Instruments | Commercial | DJ apps | Serato and djay separate in real time (vocals, drums, bass, melody in Serato); Traktor Pro uses pre-separated stem files. Sources disagree on details. | (verified: https://dj.studio/blog/daws-djs-stem-separation-workflows, search text) |
| Mixxx | Mixxx project | Open source (licence of the app not looked up) | Desktop DJ app | Mixxx 2.6 will play stem files; the Demucs-to-ONNX GSoC project aims at stem separation inside Mixxx. | (verified: https://mixxx.org/news/2025-10-27-gsoc2025-demucs-to-onnx-dhunstack/, search text) |
| RX 11 Music Rebalance | iZotope | Commercial; RX 11 Standard, Advanced and Post Production Suite; also an ARA plug-in | Four stems: vocals, bass, percussion, other; per-stem sensitivity sliders | Stem split inside a plug-in, aimed at rebalancing rather than export. Price not found. | (verified: https://www.izotope.com/en/products/rx/features/music-rebalance, search text) |
| LALAL.AI | LALAL.AI | Commercial, minutes-based. Approximate prices seen 2026-10-23 on a third-party site: Starter free (10 min), Lite $7.50/month (90 fast minutes), Pro $15/month (250 fast minutes plus API and VST plugin). Another third-party listing shows $7.26/month for Lite. May be out of date. | Web, app, plugin, API | A cloud option if the owner accepts uploading audio. Official pricing page not found. | (verified: https://toolradar.com/tools/lalal-ai/pricing, search text) |
| Moises | Moises | Commercial freemium. Approximate prices from a review by a competitor (StemSplit), seen 2026-10-23: Free 5 tracks/month, Premium $3.99/month, Pro $9.99/month with API access. Another source conflicts on where API access sits. | Web, app, integrations | AlternativeTo lists it as proprietary and says it uses the separation algorithm developed by Deezer; I could not confirm that from Moises. Official pricing not found. | (verified: https://stemsplit.io/blog/moises-ai-review, search text) (verified: https://alternativeto.net/software/stemdeck/, search text) (verified: https://moises.ai/products/integrations, search text) |
| Fadr | Fadr | Commercial; per iTechGuides offers stem separation, MIDI detection, DAW plugins and API | Web, plugin | Only a one-line mention; details not checked. | (verified: https://www.itechguides.com/best/stem-separation-software/, search text) |

### C. Audio-to-MIDI transcription: pitched and polyphonic

| Name | Vendor | Licence | Formats | Relevance | Verified source |
|---|---|---|---|---|---|
| Basic Pitch (Python) | Spotify Audio Intelligence Lab | Open source. Licence section says Apache 2.0 (the text also mentions "the GPL License" in a confusing way; read the LICENSE file before relying on it). | Python 3.7-3.11. Model in TensorFlow, CoreML, TensorFlowLite and ONNX. Outputs MIDI file with pitch bends, optional note-events CSV, optional raw model outputs NPZ. | Best candidate for turning the "other" stem (stabs, pad, lead) into note lists. Instrument-agnostic, polyphonic, "works best on one instrument at a time". Model size not stated. | (verified: https://github.com/spotify/basic-pitch, fetched) |
| basic-pitch-ts | Spotify | Open source, Apache 2.0 ("Copyright 2022 Spotify AB") | TypeScript. API `new BasicPitch(model)` plus `outputToNotesPoly`, `addPitchBendsToNoteEvents`, `noteFramesToTime`; example uses browser Web Audio (`AudioContext`, `decodeAudioData`). Stereo is down-mixed to mono and audio resampled to 22,050 Hz. | The version that could live in Havantechno. The page does not say TensorFlow.js or "browser" explicitly; the browser use is implied by the example only. Mono down-mix loses the stereo width the stabs have (corr 0.41). | (verified: https://github.com/spotify/basic-pitch-ts, fetched) |
| MT3 | Google Magenta (Gardner et al., ICLR 2022) | Apache-2.0 per a Gitee mirror only; checkpoint licence not found | Python, T5X (JAX); Colab notebook for inference; multi-instrument transcription to MIDI | Multi-instrument in one pass, but heavy and tied to T5X. Not a browser candidate on the evidence found. | (verified: https://gitee.com/hyhhui/mt3, search text) (verified: https://iclr.cc/virtual/2022/poster/6969, search text) |
| Onsets and Frames | Google Magenta | Repo inactive, supplement to the papers; licence not shown | TensorFlow; Piano Scribe web app transcribes in the browser | Piano only. Not relevant to synth stabs except as a reference. | (verified: https://magenta.Tensorflow.Org/onsets-frames, search text) |
| High-resolution piano transcription | ByteDance | Replicate listing says Apache 2.0 (GitHub licence not confirmed); onset F1 96.72% on MAESTRO vs Onsets and Frames 94.80% | PyTorch; one developer's product (Pianolyze) reports running it client-side with ONNX Runtime, Web Workers and IndexedDB caching | Piano only. Shows a transcription model can run in a browser via ONNX. | (verified: https://replicate.com/bytedance/piano-transcription, search text) (verified: https://arxiv.org/abs/2010.01815v2, search text) (verified: https://hunted.space/product/pianolyze, search text) |
| Transkun ONNX export | TuesdayCrowd (Hugging Face), upstream Transkun | Upstream code listed MIT; licence of the export not verified | ONNX (transformer-only export plus decode spec) | Piano only. | (verified: https://huggingface.co/TuesdayCrowd/transkun-onnx, search text) |
| Omnizart | Music and Culture Technology Lab | Open source, MIT | Python (pip). Modules: music (pitched notes), drum, chord, beat, vocal, vocal-contour. `omnizart download-checkpoints`. README notes "unknown bugs" in drum training but the shipped checkpoints work. | One install that covers several tasks. Output formats and release date not shown on the page (Releases section empty in the capture). | (verified: https://github.com/Music-and-Culture-Technology-Lab/omnizart, fetched) |
| Melodyne | Celemony | Commercial. Third-party sources, 2026-10-23, approximate: assistant $249 (monophonic MIDI), editor $399 to $499 (polyphonic); essential has no MIDI export. Sources disagree. | Plug-in / standalone | Established polyphonic audio-to-MIDI; not a pipeline component (manual, GUI). | (verified: https://futureproofmusicschool.com/blog/best-audio-to-midi-converters, search text) |
| AnthemScore | Lunaverus | Commercial. Third-party sources, 2026-10-23, approximate: Professional ~$44 to $49 one-time; web version $9.99 or $29.99 a month. | Desktop and web | Cheapest polyphonic paid option listed; MIDI and MusicXML export. | (verified: https://futureproofmusicschool.com/blog/best-audio-to-midi-converters, search text) |
| Samplab | Samplab | Commercial; one source ~$9.99/month; another source says it is being sunset in September 2026 (already past on 2026-10-23, status unconfirmed) | Plug-in / standalone | Edit notes inside audio. Treat as unavailable until the vendor site is checked. | (verified: https://samplab.net/, search text) (verified: https://audiotechhub.com/blogs/music-production/audio-to-midi-vst-plugins, search text) |

### D. Drum transcription

| Name | Vendor | Licence | Formats | Relevance | Verified source |
|---|---|---|---|---|---|
| adtof_plus_drum_transcription | xavriley (wrapper); ADTOF model by Zehren et al., PyTorch port by xavriley | Wrapper MIT. Model weights licence not shown. | Python 3.8+, 8 GB RAM recommended. Pipeline: MDX23C extracts drums from a mix, drum kit is split into components, ADTOF detects onsets, writes one MIDI file. Classes kick, snare, hi-hat, cymbals, toms; hat open/closed by sustain. | Closest fit to the reference's open/closed hat and clap/kick pattern. No F1 numbers on the page. | (verified: https://github.com/xavriley/adtof_plus_drum_transcription, fetched) |
| drum2midi | mykolad | Not shown on the page (links to a LICENSE file) | Python 3.10-3.13, FFmpeg needed. Stage 0 optional htdemucs to get drums from a song; ADTOF for onsets (5 classes, 100 fps); MDX23C DrumSep or LarsNet for velocity and articulation. Output .mid, GM numbers on channel 10 (kick 36, snare 38, closed hat 42, pedal hat 44, open hat 46, toms 43/47/50, crash 49, ride 51), PPQ 960. | Adds velocity and open/closed hats. Author's own benchmark, 50 ms tolerance: MDB Drums overall F1 0.882, ENST-Drums 0.837, IDMT-SMT-Drums 0.935 (kick, snare, hat only). 38 s for a 270 s track on an RTX 4070 SUPER; about 15x slower than real time on one laptop CPU. The author says the separator does not improve note detection; it helps velocity. The author notes that ReStem's developers did not review the comparison. | (verified: https://github.com/mykolad/drum2midi, fetched) |
| ADTLib | Carl Southall | Not found | Python; text file of onsets and drum tablature; a browser version "ADTWeb" is mentioned | Oldest tool in the results; the search flagged that it may not run on current Python. | (verified: https://github.com/CarlSouthall/ADTLib, search text) |
| DrumScript | DrumScript project | Open source (licence not read) | Python; rule-based (no ML); takes a full mix or an isolated drum stem and outputs sheet music, MIDI, MusicXML | A non-ML alternative for comparison. | (verified: https://github.com/DrumScript/DrumScript, search text) |
| Enhanced ADT via drum-stem separation | Paper (arXiv 2509.24853) | Not applicable (paper) | n/a | Supports the idea that separating the drum stem first helps drum transcription; I did not read it. | (verified: https://arxiv.org/abs/2509.24853, search text) |

### E. Chords, key, tempo, beats and downbeats

| Name | Vendor | Licence | Formats | Relevance | Verified source |
|---|---|---|---|---|---|
| madmom | CPJKU (JKU Linz) | Source code BSD. All model and data files CC BY-NC-SA 4.0 (non-commercial, share-alike); contact the authors for commercial use. | Python. Onset detection, beat and downbeat tracking (RNN + DBN, ISMIR 2016 method), tempo, chord recognition (deep chroma + CRF, major/minor), key classification, piano note transcription. | Strongest classic beat/downbeat tracker. The licence split is the trap: the code is BSD but the trained models are non-commercial. The README still lists Python 2.7; maintenance unclear (1,753 commits, 60 open issues). | (verified: https://github.com/CPJKU/madmom, fetched) (verified: https://madmom.readthedocs.io/en/v0.16/modules/features/chords.html, search text) |
| librosa | librosa team | Open source, ISC | Python. `librosa.beat.beat_track` (Ellis 2007 dynamic programming: onset strength, tempo, peak picking), chroma (`chroma_stft`), `onset_detect`; latest 0.11.0 in the docs. | The standard Python library for what the studio's numpy/scipy scripts did by hand. Key estimation is not a single built-in call in what I saw (key from chroma is recalled below). | (verified: https://github.com/librosa/librosa, fetched) (verified: https://librosa.org/doc/main/generated/librosa.beat.beat_track.html, search text) |
| Essentia / Essentia.js | Music Technology Group, UPF | AGPL v3, or a proprietary licence on request | C++ library compiled to WebAssembly with a JS/TypeScript API; real-time and offline | The only listed analysis library that is both rich (beat detection is documented for Essentia; KeyExtractor exists in the C++ library) and browser-capable. I did not confirm that every algorithm is exposed in Essentia.js. AGPL means a network-served studio would need to publish its source or buy the licence. | (verified: https://unpkg.com/essentia.js@0.1.1/README.md, search text) (verified: https://essentia.upf.edu/essentiajs, search text) (verified: https://repositori.upf.edu/handle/10230/45451?show=full, search text) |
| BeatNet | davies-w fork on GitHub | Not found | Python, uses librosa and madmom for feature extraction | Appeared in results as a madmom-dependent beat tracker; nothing else checked. | (verified: https://github.com/davies-w/BeatNet, search text) |
| Omnizart (chord and beat modules) | see section C | MIT | Python | Listed there. Chord and beat quality figures not found. | (verified: https://github.com/Music-and-Culture-Technology-Lab/omnizart, fetched) |

Chord estimation tools other than madmom (for example Chordino as a Vamp plugin) are not found in my results; see "Recalled, not verified".

## Python standard and JavaScript equivalents

| Task in the existing studio analysis | Standard Python | JavaScript equivalent found | Verified source |
|---|---|---|---|
| STFT, spectrogram, band energies | numpy / scipy (and `librosa.stft`) | Not searched. Web Audio `AnalyserNode` exists in the browser (recalled, below). Meyda extracts spectral features in JS. | (verified: https://meyda.js.org/, search text) |
| Spectral centroid, MFCC, chroma | librosa.feature | Meyda (MIT): chroma (12 bands by default), MFCC, spectral centroid; offline and real-time; default Hanning window, so results differ from other libraries unless the window is matched. | (verified: https://meyda.js.org/, search text) (verified: https://libraries.io/npm/meyda, search text) |
| Onset flux | librosa.onset | `@audio/beat` (onsets, tempo, beats; Node and browser) | (verified: https://github.com/audiojs/beat-detection, search text) |
| Autocorrelation tempo | librosa.beat / madmom | `web-audio-beat-detector` (tempo plus first-beat offset via `guess()`; AudioBuffer in; works best on electronic music; tempo only) | (verified: https://cdn.jsdelivr.net/npm/web-audio-beat-detector@8.2.37/README.md, search text) |
| Pitch tracking | aubio, librosa | aubio on npm is Node bindings that depend on a system install, no WebAssembly port found | (verified: https://github.com/aubio/node-aubio, search text) |
| Polyphonic notes | basic-pitch | basic-pitch-ts | (verified: https://github.com/spotify/basic-pitch-ts, fetched) |
| Broad MIR (key, beats, many descriptors) | essentia (Python), madmom | Essentia.js (AGPL) | see section E |
| Source separation | demucs, open-unmix | demucs-web (ONNX Runtime Web), free-music-demixer (WASM) | see section A |

## Recommended gear list

Ranked for this project (recreate Guidance from a source track; browser DAW with no build step).

1. **Demucs htdemucs (open source, MIT; code archived Jan 2025)** for stems, run offline in Python first. Why: best-documented open model, 9.0 dB SDR, WAV output the studio can load. Cost: free. The `htdemucs_ft` variant is about 4x slower (verified: https://github.com/facebookresearch/demucs, fetched).
2. **demucs-web (MIT)** as the in-browser route, if the owner wants the whole pipeline inside the page. Why: verified API, WebGPU with WASM fallback, 172 MB model, four stems. Cost: free; needs COOP/COEP headers (the repo's `python3 -m http.server` does not send them, so a small server change is needed) (verified: https://github.com/timcsy/demucs-web, fetched).
3. **Basic Pitch / basic-pitch-ts (Apache 2.0)** for note lists from the "other" stem (stabs, pad, lead). Why: polyphonic, MIDI with pitch bends, TypeScript sibling, ONNX model available. Cost: free. Run it per isolated element, not on the full mix (verified: https://github.com/spotify/basic-pitch, fetched).
4. **adtof_plus_drum_transcription (MIT wrapper) or drum2midi** for drum MIDI from the drums stem. Why: kick/snare/hat and open/closed hat with GM mapping; drum2midi adds velocity. Cost: free; desktop Python only; weights licence unverified (verified: https://github.com/xavriley/adtof_plus_drum_transcription, fetched; https://github.com/mykolad/drum2midi, fetched).
5. **librosa (ISC)** to replace the hand-written numpy/scipy analysis scripts for tempo, onsets and chroma. Cost: free (verified: https://github.com/librosa/librosa, fetched).
6. **Meyda (MIT) plus `web-audio-beat-detector`** as the light in-browser analysis (spectral features, tempo and first-beat offset). Cost: free (verified: https://meyda.js.org/, search text; https://cdn.jsdelivr.net/npm/web-audio-beat-detector@8.2.37/README.md, search text).
7. **madmom** only for offline experiments: best classic downbeat tracker, but the model files are CC BY-NC-SA, so avoid shipping them (verified: https://github.com/CPJKU/madmom, fetched).
8. **BS-RoFormer family** as the quality upgrade over Demucs if the owner accepts community checkpoints with mixed (sometimes non-commercial) licences (verified: https://huggingface.co/Ryan5453/unblend, search text).
9. **Paid desktop options, for comparison or as a ground-truth check:** Ableton Live 12.3 Suite stem separation and Convert Drums/Harmony/Melody (price not found), Logic Pro Stem Splitter, FL Studio, RX 11 Music Rebalance. These are tools to compare against, not pipeline parts, because they are GUI features.
10. **Cloud services (LALAL.AI, Moises):** roughly $4 to $15 a month per the third-party figures above; only if uploading audio is acceptable and an API is needed.

## Browser feasibility

Runs in a browser today (evidence found):

- Stem separation: Demucs v4 through ONNX Runtime Web with WebGPU or WASM (demucs-web, 172 MB; monteslu export ~126 MB fp16 in 21 pieces; also the live app demuxx) (verified: https://github.com/timcsy/demucs-web, fetched; https://huggingface.co/monteslu/htdemucs-web-onnx, search text; https://azopsoft.com/apps/demuxx, search text). Open-Unmix UMX-L compiled to WASM, 45 MB quantised, up to 4 GB RAM (verified: https://github.com/olilarkin/free-music-demixer, fetched).
- Polyphonic notes: basic-pitch-ts, with the caveat that the fetched page does not state the runtime (verified: https://github.com/spotify/basic-pitch-ts, fetched).
- Piano transcription via ONNX (Pianolyze reports it) and Magenta's Piano Scribe (search text only).
- Analysis: Meyda, `web-audio-beat-detector`, `@audio/beat`, Essentia.js (AGPL).

Needs a desktop or server (Python), on the evidence found:

- Drum transcription (ADTOF wrapper, drum2midi, Omnizart drums), madmom, MT3 (T5X/JAX), BS-RoFormer checkpoints (PyTorch; I found no browser build).
- The drum2midi pipeline downloads about 400 MB of separator weights on first use and wants FFmpeg and Python 3.10-3.13 (verified: https://github.com/mykolad/drum2midi, fetched).

Practical constraints that affect this repo:

- COOP/COEP headers are required by demucs-web for SharedArrayBuffer. The repo's documented server is `python3 -m http.server 8000`, which sends neither. This is my inference from the README claim plus CLAUDE.md; I did not test it.
- First-use download of 126 to 172 MB of model weights conflicts with the repo's "no image, audio or font files" and "no build step" style; it would be a runtime fetch, not a repo file.
- Speed in the browser is claimed, not measured by me. A third-party blog says the browser route is slower than CPU/GPU Demucs and suited to quick, privacy-sensitive jobs (verified: https://kitmul.com/en/blog/audio-stem-splitter-ai-source-separation-browser, search text). A tools4music page claims WebGPU runs about 3x faster than real time; unverified (verified: https://tools4music.com/tools/stem-splitter, search text, vendor claim only).
- The 4-stem models do not give a separate sub. For the reference's sub-plus-kick structure the studio's own envelope analysis on the drums and bass stems, or a drum-kit split (MDX23C DrumSep), is the more promising route. This is my judgement, not a sourced result.

What has a Web Audio equivalent or would need reimplementing:

- Web Audio's own `AnalyserNode` gives FFT frames for live feature work (recalled, below), so spectral-centroid, band-energy and onset-flux measurements like the ones in the design table can be reimplemented in JS directly (Meyda does this).
- Autocorrelation tempo and onset flux are small enough to reimplement; `web-audio-beat-detector` already does a version.
- Chroma-based key estimation would need a small reimplementation in JS if Essentia.js (AGPL) is not acceptable (Meyda supplies the chroma input).
- Neural models (separation, transcription) cannot be reimplemented by hand; they have to be loaded as ONNX/TF.js files.

## Recalled, not verified

- `numpy`/`scipy` `scipy.signal` (STFT via `scipy.signal.stft`, `find_peaks`, `fftconvolve`) as the standard base for the existing scripts. I did not search for these.
- `librosa.pyin` for monophonic pitch tracking, and a Krumhansl-Schmuckler style key estimate computed from chroma (profile correlation). Neither was confirmed in this session.
- Chordino (Vamp plugin) and Sonic Visualiser/Sonic Annotator for chord estimation. Not found in results.
- `pretty_midi` and `mir_eval` as Python helpers for writing MIDI and scoring onsets. drum2midi's page mentions both by name (verified: https://github.com/mykolad/drum2midi, fetched), but I have no licence for them.
- Essentia's `KeyExtractor` and `RhythmExtractor2013` algorithm names. The search text mentioned KeyExtractor only for the C++ library.
- The Web Audio `AnalyserNode` and `OfflineAudioContext` as the browser primitives for FFT and offline decoding. The repo itself already uses OfflineAudioContext for export.
- "Beat This!" (a beat/downbeat tracker from ISMIR 2024), Spleeter weights licence, and Open-Unmix weights licence. I meant to look them up and the search budget ran out.
- Browser stem tools such as StemRoller and desktop apps such as Ultimate Vocal Remover: no licence or details in my results.

## Handoffs to other agents

- **O2:** how stems and MIDI get into the DAW: loading a WAV stem as an audio track, importing a .mid file or note-event list into the 16-step sequencer (which uses pattern strings, not arbitrary-timing notes), hosting of ONNX models and COOP/COEP headers on the dev server, and Ableton/Logic/FL workflows as models for the "source song as modifiable track" feature.
- **O1:** parameter estimation after transcription (fitting the kick pitch sweep, bass filter envelope, sidechain depth from stems), section detection for the form row (intro/build/main/break/drop/outro), and whether any tool estimates synth parameters from audio. I did not search for the last one.
- **S1:** measuring the sidechain duck shape from a bass or pad stem; the stems give a cleaner envelope than the full mix.
- **S4:** stereo width measurement (L/R correlation) per stem; note that basic-pitch downmixes to mono.
- **H1:** the kick/sub split problem from the separation side: 4-stem models do not separate them.
- **H4:** drum-stem tools above (ADTOF, drum2midi) give hat open/closed and clap/snare onsets; compare to the drum synths' parameters.
- **H5:** browser-synth engines that could play back the transcribed notes.

## Questions for the Opus agents

1. (O2) Must the analysis step run in the browser, or may it be an offline Python tool (librosa, Demucs, Basic Pitch, ADTOF) that exports a bundle (stems as WAV plus a MIDI file plus a JSON of tempo, key and sections) which the studio imports? This decides whether the heavier Python-only tools (drum transcription, madmom, MT3) are usable at all.
2. (O2) Would O2 accept a dev-server change (COOP/COEP headers) and a runtime fetch of a 126 to 172 MB model for an in-browser Demucs, given the repo's no-build, no-audio-files rules?
3. (O1) For the Guidance reference, is a 4-stem split enough, or does the pipeline need a separate kick/sub/bass split to recreate the sub as its own synth? If the latter, what method (drum-kit split, frequency-band split, or analysis of the mixed bass stem) is better supported by research?
4. (O1) What error budget is acceptable for transcribed notes: the spec treats the chord progression and lead melody as lower confidence. Would a transcription (basic-pitch on the "other" stem) be trusted over the hand-written melody, and how should the pipeline decide?
5. (O1) The licences in this area are mixed (madmom models CC BY-NC-SA, RoFormer community checkpoints sometimes CC-BY-NC-SA, Essentia.js AGPL, Spleeter's README warning on copyrighted material). Is this project personal/non-commercial only, and does the owner need to avoid those?

## Sources

Fetched (page read in this session):

- https://github.com/facebookresearch/demucs
- https://github.com/timcsy/demucs-web
- https://github.com/olilarkin/free-music-demixer
- https://github.com/spotify/basic-pitch
- https://github.com/spotify/basic-pitch-ts
- https://github.com/xavriley/adtof_plus_drum_transcription
- https://github.com/mykolad/drum2midi
- https://github.com/Music-and-Culture-Technology-Lab/omnizart
- https://github.com/CPJKU/madmom
- https://github.com/librosa/librosa

Seen in search results only (fact taken from the search summary; fetch failed or not attempted):

- https://huggingface.co/monteslu/htdemucs-web-onnx
- https://huggingface.co/smank/htdemucs-onnx
- https://huggingface.co/schism-audio/htdemucs-mlx
- https://huggingface.co/Best-Practice/spleeter-4stems-onnx
- https://huggingface.co/Ryan5453/unblend
- https://huggingface.co/TuesdayCrowd/transkun-onnx
- https://huggingface.co/spotify/basic-pitch/raw/main/README.md
- https://pypi.org/project/demucs-onnx/
- https://pypi.org/project/spleeter/1.5.3
- https://pypi.org/project/bs-roformer/
- https://pypi.org/project/madmom
- https://mixxx.org/news/2025-10-27-gsoc2025-demucs-to-onnx-dhunstack/
- https://stemsplit.io/blog/htdemucs-ft-onnx-export
- https://stemsplit.io/blog/moises-ai-review
- https://kitmul.com/en/blog/audio-stem-splitter-ai-source-separation-browser
- https://dev.to/sam_lee_880a38a45a170858b/building-a-practical-browser-based-ai-stem-separation-tool-with-demucs-29md
- https://tools4music.com/tools/stem-splitter
- https://azopsoft.com/apps/demuxx
- https://replicate.com/ryan5453/demucs
- https://awesome.ecosyste.ms/projects/github.com%2Fdeezer%2Fspleeter
- https://pytorch.org/hub/sigsep_open-unmix-pytorch_umx/
- https://science.ecosyste.ms/projects/2457
- https://arxiv.org/html/2310.01809v1
- https://arxiv.org/pdf/2309.02612
- https://arxiv.org/pdf/2510.06785
- https://arxiv.org/html/2609.04224
- https://mvsep.com/es/algorithms
- https://engineering.atspotify.com/meet-basic-pitch/
- https://gitee.com/hyhhui/mt3
- https://iclr.cc/virtual/2022/poster/6969
- https://magenta.Tensorflow.Org/onsets-frames
- https://replicate.com/bytedance/piano-transcription
- https://arxiv.org/abs/2010.01815v2
- https://hunted.space/product/pianolyze
- https://github.com/CarlSouthall/ADTLib
- https://github.com/DrumScript/DrumScript
- https://arxiv.org/abs/2509.24853
- https://github.com/davies-w/BeatNet
- https://madmom.readthedocs.io/en/v0.16/modules/features/chords.html
- https://madmom.readthedocs.io/en/v0.16/modules/features/downbeats.html
- https://librosa.org/doc/main/generated/librosa.beat.beat_track.html
- https://unpkg.com/essentia.js@0.1.1/README.md
- https://essentia.upf.edu/essentiajs
- https://repositori.upf.edu/handle/10230/45451?show=full
- https://meyda.js.org/
- https://libraries.io/npm/meyda
- https://cdn.jsdelivr.net/npm/web-audio-beat-detector@8.2.37/README.md
- https://github.com/audiojs/beat-detection
- https://github.com/aubio/node-aubio
- https://www.ableton.com/stem-separation-in-ableton-live/
- https://www.ableton.com/en/manual/converting-audio-to-midi/
- https://www.soundonsound.com/techniques/making-notes
- https://mixdownmag.com.au/news/ableton-live-12-3-drops-overnight-with-stem-separation-and-splice-integration/
- https://dj.studio/blog/daws-djs-stem-separation-workflows
- https://stemconsole.ai/blog/stem-separation-in-daws/
- https://www.izotope.com/en/products/rx/features/music-rebalance
- https://toolradar.com/tools/lalal-ai/pricing
- https://moises.ai/products/integrations
- https://alternativeto.net/software/stemdeck/
- https://www.itechguides.com/best/stem-separation-software/
- https://futureproofmusicschool.com/blog/best-audio-to-midi-converters
- https://samplab.net/
- https://audiotechhub.com/blogs/music-production/audio-to-midi-vst-plugins
