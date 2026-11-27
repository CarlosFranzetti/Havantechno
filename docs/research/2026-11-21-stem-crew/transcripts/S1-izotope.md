# S1: iZotope and the commercial field

Researcher S1, Stem Crew. Written 21 November 2026 (ET). Tags: READ = I fetched the page and it says so; SNIPPET = a search-result summary only; MEMORY = my recollection, unverified; INFERENCE = my reasoning, not a source's claim. Budget used: 17 searches, 17 page fetches (about; one search-credit refusal at the end, see section 6). Firecrawl's hosted credits ran out part-way, so section 4 rests on more snippets than I wanted. Marketing is marked as marketing.

---

## 1. iZotope RX: what exists, module by module

### 1.1 RX 12 exists
- READ. RX 12 was announced and shipped in spring 2026. The iZotope blog post "Why upgrade to RX 12? Here's what's new" is dated 14 May 2026 and opens "RX 12 is here". https://www.izotope.com/community/blog/rx-12 . The YouTube launch video upload date in the page metadata is 2026-04-29, so the announcement preceded the post by about two weeks. I did not find a single dated press release.
- READ. Editions and list prices on https://www.izotope.com/products/rx-advanced (fetched 21 Nov 2026): RX 12 Elements $99, Standard $399, Advanced $1,399. Described as "50+ tool" suite, standalone app plus plug-ins.
- READ. RX 11 was announced 15 May 2024 ("Why upgrade to RX 11", https://www.izotope.com/community/blog/why-upgrade-to-rx-11), so RX 12 is the second major version in two years. The owner's "RX 12" is correct; it is the current version.
- READ, oddity. The Music Rebalance blog post https://www.izotope.com/community/blog/stem-separation-music-rebalance is stamped "May 15th, 2024" but its text is about RX 12. The page was evidently rewritten in place. Do not cite its date.

### 1.2 What RX 12 added over RX 11 (READ, iZotope blog 14 May 2026, bullets quoted in substance)
- NEW Scene Rebalance [Advanced]: separates dialogue, music and effects from a single stereo render.
- NEW Stems View [Standard and Advanced]: a track-based view where each separated stem gets its own lane and spectrogram, and "the full RX toolkit" (50+ modules, plus external plug-ins) can be applied per stem.
- NEW Trim Silence [Advanced]: detect, adjust and standardise silent regions in long files.
- REBUILT De-bleed [Std and Adv]: now a real-time plug-in that "requires no reference track" (RX 11's De-bleed needed a second, bleed-source track; see 1.5).
- REBUILT Breath Control [Std and Adv]: "advanced ML" for breath detection.
- IMPROVED Music Rebalance and Dialogue Isolate [Std and Adv]: "upgraded neural nets"; Music Rebalance now has a real-time plug-in.
- Design: larger default spectrogram, module search, resizable history panel; "Instant Stem Splitting" button in the main editor (RX 12 web tour, https://www.izotope.com/products/rx-advanced).
- Not mentioned as changed in any RX 12 page I read: Repair Assistant, Spectral Repair, Spectral Recovery, Streaming Preview, Loudness Optimize. INFERENCE: those carry over from RX 11 unchanged, but I did not read an RX 12 manual (I could only fetch the RX 11 manual, section 1.3 to 1.6).
- iZotope's own "before and after" claim is audio demos RX 11 vs RX 12 on its web tour (unreadable here). No SDR, latency or sample-rate figure for RX 12 was published on any page I read.

### 1.3 Music Rebalance (the separator)
READ, RX 11 manual (Native Instruments docs PDF, https://docs.native-instruments.com/pdf-guides/RX/RX_11_Manual_English.pdf , section 38; I fetched the whole manual):
- "leverages a machine learning algorithm trained to identify and separate the following elements in a mix: Vocal, Bass, and Drums. Any content that is not otherwise identified ... will be categorized as Other. This typically includes all the melodic instruments."
- Controls: four level faders (Vocal, Bass, Drums, Other) with mute and solo per stem; four per-stem Sensitivity values; Quality = Good, Better, Best ("Best outputs the highest separation quality, including anti-phasing processing, with the slowest speed"); Preview, Bypass, Compare, Stem Split, Render.
- Sensitivity: "adjusts the attention of the stem splitting algorithm toward a particular stem. When Sensitivity is higher, more of the subtle signals will get classified as this stem. For example, increasing the Sensitivity of vocals will preserve more of the breath sounds ... may also cause some leakage." Sensitivity only works on relative values: all four at 100% changes nothing. That is a soft-assignment threshold, not a gain.
- Stem Split: four stems (Vocal, Bass, Percussion, Other), each to its own tab, "ignores the Gain settings ... always assumes 0 dB".
- Limits stated for the Logic ARA version: first plug-in on the track, no automation, cannot process Apple Loops, compressed audio, flex audio or reversed regions; playback must run to gather audio. Pro Tools AudioSuite version cannot preview before rendering.
- What changed in RX 11 (READ, manual intro): "A new neural net provides a largely improved quality ... as well as per-stem Sensitivity adjustment."
- RX 12 (READ, iZotope blog): "old sensitivity knobs" replaced by "clear percentage indicators"; Stems View; stems "null against the original file", meaning the four stems summed reproduce the input. That null claim is iZotope marketing, but it is testable and consistent with Johannes Imort's statement that their models are "mixture-consistent" (section 2.4). The blog's null demo also shows a "ghost of a vocal" residue between a VCA-rebalanced mix and a Music Rebalance mix, and iZotope says the difference is mostly randomised modulation. Treat the transparency claim as demonstrated on cherry-picked material.
- Four classes only. No guitar, piano, kit pieces. SNIPPET (Reddit, r/iZotopeAudio, "Using iZotope for stem splitting", Jan 2026): users compare it unfavourably with newer cloud separators; I did not read the thread.

### 1.4 Scene Rebalance (new in RX 12, Advanced)
READ, https://www.izotope.com/community/blog/scene-rebalance (14 May 2026, by iZotope's Nick Messitte):
- "separates complex film and TV scenes into three distinct buckets: dialogue, music, and effects." "Each category features sensitivity thresholds powered by state-of-the-art neural nets." "Because the results null with the original stereo file, you can level the music up or down without introducing artifacts."
- Process button renders Stems View; a "Stem Split" button exports each element as its own file.
- Workflow the post demonstrates: run Dialogue Isolate on the voice stem; run Music Rebalance on the music stem to pull vocals out of the music.
- Lane swapping: "sometimes a vocal from a background song might slip into the Dialogue lane. In Stems View, you can move audio regions from one lane to another". This is iZotope admitting the classifier errs and giving the user a correction tool. Worth copying (section 5).
- Limits: stated indirectly only (the lane-swap fix). No numbers.

### 1.5 Dialogue Isolate, De-bleed, De-rustle, Repair Assistant, Spectral Recovery, Spectral Repair
All READ in the RX 11 manual unless marked.
- Dialogue Isolate (sec. 33): "uses a machine learning algorithm trained on a large library of speech, noise, and reverberant data. It automatically detects and separates dialogue, noise, and reverberation into three distinct signal components." Controls: Voice, Reverb, Noise gains (+12 to -Inf dB), Sensitivity, Quality (Best/Offline; Advanced adds multiband and a highest-quality offline mode, RX 11 blog). Real-time plug-in since RX 11. RX 12: "updated neural nets", "offline and real-time modes" (blog).
- De-rustle (sec. ~29): "a machine learning algorithm trained on isolated rustle samples, clean dialogue samples and dialogue samples with rustle". This is the only module whose training-data composition is spelled out.
- De-bleed (RX 11, sec. 21): "learns a bleed relationship between two tracks": a Bleed Source Track and an Active Track that must have matching sample rates and be time-aligned within a few milliseconds; Learn button builds a "bleed profile". INFERENCE: RX 11's is classic adaptive filtering, not a neural net (the manual does not say). RX 12 rebuilt it "reference-free thanks to state-of-the-art machine learning" with a "Classic mode with a reference track" still available (RX 12 web tour).
- Repair Assistant (sec. 14): "designed to detect common audio problems in a recording and quickly provide suggested settings". Choose Voice or Music mode; click Learn, which "analyzes any selection made in the Spectrogram (if no selection is made it analyzes as much data as necessary)". It does not need noise-only segments. Voice chain: De-noise, De-reverb, De-hum, De-click, Tone (Tilt/Scoop/Lo-cut/Hi-cut), De-ess, De-clip, De-harsh. Music chain: De-noise, De-squeak, De-hum, De-pick, Tone, De-clip. Output Gain and limiter. "Open Module Chain" saves the suggestion as an editable chain (Advanced only). RX 11 adds "machine learning technology" for "faster learning". RX 10 interview (READ): it "builds custom signal chains for repair of different classes of source material, like speech, music, or drums." This is the closest iZotope has to "analyse, then propose a configuration", and the proposal is shown as editable controls, not applied silently.
- Spectral Recovery (sec. 41, Advanced): "automatically adds missing frequencies to bandwidth-limited speech content and patches holes in the frequency spectrum due to compression artifacts." Learn finds high and low cutoffs; Spectral Patching samples surrounding spectrum; synthesises below and above the cutoffs. Alexey Lukin (RX 10 interview, READ) says its ML algorithm was developed by Shahan Nercessian and "can also synthesize lower frequencies, like a missing fundamental". Speech-only by its own description. Not useful for music.
- Spectral Repair (sec. 40, Std/Adv): "treats selections within the spectrogram/waveform display as corrupted audio that will be repaired using information from outside of the selection"; modes include Attenuate (matches magnitudes to surroundings; "does not resynthesize any audio") plus replace and generate modes. Classic spectral inpainting; not a separator.
- Streaming Preview (sec. 42): "applies the same loudness normalization and lossy encoding that streaming platforms will apply"; shows e.g. YouTube, -14 LUFS, Opus 256 kbps. Loudness Optimize (sec. 36): works on the BS.1770 relative gate. Neither analyses music content; they are meters and codecs. Useful only as an idea (auditioning through a codec).
- No iZotope module analyses a mix and names its instruments, tempo, key or synthesis method. RX's "analysis" is noise, reverb, bandwidth, and four-way stem classification. Nothing in RX produces MIDI, notes or instrument patches. READ by absence across the RX 11 manual's contents and the RX 12 pages.

---

## 2. What iZotope has said about the engines

### 2.1 Ownership (context)
- READ. The RX 12 blog footer and the DAFx26 post say "Together with Boris FX" / "iZotope is now part of the Boris FX family".
- SNIPPET. Boris FX press release 2 July 2026 (https://blog.borisfx.com/press/boris-fx-acquires-izotope-the-award-winning-leader-in-intelligent-audio-technology) and audioXpress 3 July 2026: Boris FX acquired iZotope; this was coordinated with inMusic's acquisition of Native Instruments (completed 30 June 2026); iZotope had merged into Native Instruments in March 2021. So Native Instruments no longer owns iZotope. "Soundwide" I did not find in any source.
- Practical effect: iZotope documentation is migrating off docs.native-instruments.com (the RX 11 PDF lives there) to docs.izotope.com.

### 2.2 Model families named
- READ, strongest. DAFx26 keynote summary (iZotope blog, 4 Sep 2026, https://www.izotope.com/community/blog/dafx26-keynote): Alexey Lukin's talk "Spectrogram-Based Audio Processing and Restoration" showed "how RX has evolved from its first machine learning modules in 2017 to current state-of-the-art Band-Split RNN and BS-RoFormer architectures, showcasing the impressive quality jumps in tools like Dialogue Isolate across RX versions." The conference was in-person only; no slides or recording were published. A longer Q&A with Lukin on the RX 12 nets is in the Boris FX livestream "Boris FX + iZotope: Your Questions Answered Live", 14 July 2026, https://www.youtube.com/live/IH2wlknyPHM?t=3966s . I could not watch it (see section 6).
- Caveat. The blog does not say which RX tool uses which architecture. INFERENCE: Band-Split RNN (Luo and Yu, 2023) and BS-RoFormer (Lu et al., 2023/24) are music-source-separation architectures, so it is plausible that Music Rebalance and Scene Rebalance use them, and plausible that Dialogue Isolate uses a variant. This is not stated.
- READ, Ozone side (Johannes Imort, Senior Research Engineer, https://www.izotope.com/community/blog/inside-ozone-12 , 2 Sep 2025): Stem Focus/Master Rebalance "were among the first commercially available tools to do this live in a DAW". "Historically, we ran a compact model per source (vocals, bass, drums), and you couldn't separate all four stems simultaneously. Our new system processes multiple stems jointly with a much more modern architecture and heavy optimization." He names open work as context, not as their base: Open-Unmix (Stöter, Uhlich, Liutkus, Mitsufuji), Deezer's Spleeter, Demucs (Défossez and colleagues), and the Sound Demixing Challenge. He says "real-time ... is an underrepresented topic", demanding "causal or lightly look-ahead architectures", and that the model must be "mixture-consistent: the separated stems must sum back to the original input mixture". Model is "phase-aware".
- READ. Unlimiter (Ozone 12) is a "sample-wise gain inversion" network inspired by Jeon and Lee, "Music De-Limiter Networks via Sample-Wise Gain Inversion", arXiv 2308.01187 (the blog links it), but "quite different model architecture". "Streaming inference: a stateful neural network processes short chunks".
- READ, third-party notices in the RX 11 manual list software the product ships with. Machine-learning runtimes and libraries listed: onnx, onnx/onnx-tensorrt, onnxruntime, Pytorch/Caffe2, Tensorflow, Intel neural-compressor, Microsoft CNTK, Caffe, coremltools, XNNPACK, gemmlowp, FlashAttention, huggingface/transformers, google/sentencepiece, Resemblyzer (speaker embeddings), DLPack, Eigen, Intel MKL/IPP. Same list carries Opus, LAME, FLAC, Ogg/Vorbis codecs (used by Streaming Preview and export). What the list proves is limited: it names components in the shipped binary or its tooling. INFERENCE only: iZotope probably trains in PyTorch and ships inference through ONNX Runtime (with CoreML on Mac); I found no statement that says so. The notices are for the whole NI/iZotope RX build, not per module, so they do not tell which module uses which.
- No statement found that any RX module uses Demucs, Spleeter, Open-Unmix, MDX-Net or any open model's weights. iZotope's own words say "our award-winning research team has developed brand-new neural nets" (RX 12 web tour) and "a lot of proprietary engineering" (Imort).

### 2.3 Training data
- Dialogue Isolate: "a large library of speech, noise, and reverberant data" (READ, RX 11 manual). De-rustle: isolated rustle, clean dialogue, rustled dialogue (READ).
- Music Rebalance, Stem Focus, Scene Rebalance: no dataset named anywhere I read. Not MUSDB18, not licensed multitracks, not synthetic mixes: not stated. Imort says Unlimiter trains on pairs "where we know both versions: the limited input and the reference without limiting", so the company clearly builds paired synthetic training data (INFERENCE that the same approach, mix from stems, applies to separation).
- Genre and target data for assistants: Master Assistant targets "derived from the latest chart-topping hits"; the Cinematic target "through an analysis of the scores of top box office films" (READ, Ozone 12 docs). Neutron's instrument targets "based off analysis of thousands of professional mixes" (READ, Neutron 5 docs).

### 2.4 Real-time or offline; local or cloud
- READ. Music Rebalance: module (offline) in the editor and a real-time plug-in in RX 12; in RX 11, ARA (Logic, Studio One, Pro Tools) and AAX/AudioSuite. Dialogue Isolate: real-time plug-in plus offline Best mode.
- READ. Lukin, RX 10 interview (28 Sep 2022): "One challenge was to fit some of the complex new algorithms into the product, enabling them to run locally, without access to the cloud (which is not allowed in many post production studios)." So RX models run on the user's machine.
- No latency, real-time factor, supported sample rate or processing time figure for any iZotope separator appears on any page I read. Imort: "latency stays DAW-friendly" with no number.

### 2.5 Papers, talks and patents
READ, bibliography at https://www.izotope.com/pages/research (the page lists up to 2021; it may be stale). By title, venue, year (all as listed there):
- Wichern and Lukin, "Low-latency approximation of bidirectional recurrent networks for speech denoising", WASPAA, New Paltz, Oct 2017.
- Wichern and Lukin, "Removing lavalier microphone rustle with recurrent neural networks", DAFx-18, Aveiro, Sep 2018. (De-rustle's ancestor.)
- Nercessian and Lukin, "Speech dereverberation using recurrent neural networks", DAFx-19, Birmingham, Sep 2019, https://www.dafx.de/paper-archive/2019/DAFx2019_paper_11.pdf . It adapts blind source separation to dereverberation with a bidirectional RNN. (Dialogue De-reverb's ancestor.)
- Sarroff and Michaels, "Blind arbitrary reverb matching", DAFx-20, Sep 2020, https://dafx2020.mdw.ac.at/proceedings/papers/DAFx2020_paper_5.pdf . Claims a model matching reverb "can perform as well as a human" in subjective tests. Directly relevant to the app's effect-estimation question (hand to S3).
- Nercessian, "Neural parametric equalizer matching using differentiable biquads", DAFx-20, https://dafx2020.mdw.ac.at/proceedings/papers/DAFx2020_paper_7.pdf . Relevant to S3: parameter estimation by differentiable DSP.
- Nercessian, Sarroff, Werner, "Lightweight and interpretable neural modeling of an audio distortion effect using hyper-conditioned differentiable biquads", ICASSP, Toronto, Jun 2021, https://arxiv.org/pdf/2103.08709 . Relevant to S3.
- Nercessian, "Zero-shot singing voice conversion", ISMIR, Montreal, Oct 2020; "End-to-end voice conversion using a DDSP vocoder", WASPAA, Oct 2021.
- Wichern, Wishnick, Lukin, Robertson, "Comparison of loudness features for automatic level adjustment in mixing", AES 139th, Oct 2015; Wichern, Robertson, Wishnick, "Quantitative analysis of masking in multitrack mixes using loudness loss", AES 141st, 2016 (Neutron's masking and level-assistant heritage); Lukin, McClellan, Wishnick, "A two-pass algorithm for automatic loudness correction", AES 141st, 2016.
- Several DSP papers (Werner et al.) on allpass filters and Moog ladder filters; not relevant here.
- No iZotope paper on music source separation, drum transcription, note transcription or instrument recognition appears in the list. If iZotope published its separator, it is not on its own research page. MEMORY: I recall no such paper either.
- Talks: Lukin, DAFx26 keynote (MIT, 2026), see 2.2; Lukin and Imort Ozone 12 interview (blog, Sep 2025); Lukin RX 10 interview (2022); a Headliner interview "The Evolution of iZotope RX according to Principal DSP Engineer Alexey Lukin" (SNIPPET, https://headlinerhub.com/the-evolution-of-izotope-rx-according-to-principal-dsp-engineer-alexey-lukin.html , not read; mentions 200 people at the company).
- Patents: I found none on separation. READ: Lukin says the Ozone IRC maximizer uses "our patented method of using a psychoacoustic model". Patent numbers not looked up. A patent search (Google Patents, assignee iZotope) returned only unrelated results. MEMORY: I believe iZotope holds patents on IRC and on assistive mixing ("Neutron" inter-plugin and track-classification methods) but cannot give numbers; treat as unverified.

### 2.6 Documentation wording versus inference (summary table)
| Item | Documentation states | Inferred from behaviour or from notices |
|---|---|---|
| Music Rebalance | ML algorithm trained to separate Vocal, Bass, Drums, Other; Good/Better/Best; per-stem Sensitivity; stems null with the input | Mask or waveform output not stated; likely mixture-consistent (Imort) |
| Architecture | "Band-Split RNN and BS-RoFormer" shown in a keynote summary; Ozone: joint multi-stem model, phase-aware, mixture-consistent | Which RX tool uses which: not stated |
| Runtime | Runs locally (Lukin 2022) | ONNX Runtime and PyTorch in notices; role not stated |
| Training data | Dialogue: speech, noise, reverb library; de-rustle samples | Music stem data: not stated |
| Real-time | RX 12 Music Rebalance real-time plug-in; Dialogue Isolate real-time | Latency unknown |

---

## 3. Other iZotope products that analyse a mix and act on it

All READ unless marked.

### 3.1 Ozone 12 Master Assistant (https://docs.izotope.com/ozone12/en/master-assistant.html)
- "second set of AI-powered ears. It will analyze your track and offer an objective suggestion." Needs "at least 8 seconds" of playback and analyses "up to 60 seconds" (Analysis Time; can be set in bars with tempo sync). "Playback the loudest portion of your track." Because only part of the track is analysed, final integrated LUFS can differ.
- What it measures (the Target is "comprised of sub-targets"): Tonal Balance ("distribution of energy across the audible frequency spectrum"), Vocal Balance ("difference in loudness between the vocals and the rest of the music"), Stereo Width ("ratio of mid to side signal power in each band"), Dynamics ("a measure of microdynamics, defined by the ratio of a very short term loudness to short term loudness", analysed in four bands), Loudness (integrated LUFS).
- Ten factory genre targets "derived from the latest chart-topping hits"; it "attempt[s] to identify the genre" (SNIPPET from the blog "How to use Master Assistant in Ozone 12") then matches tone, width, dynamics, loudness to the genre average. Custom targets from reference files: it learns "the loudest eight seconds" of the reference; custom references do not get vocal-balance targets.
- Vocal Balance uses separation: "the Master Assistant will use AI to separate the vocal from the rest of the music during the analysis phase. It measures the integrated loudness of both the vocal and music", then drives Master Rebalance. If balanced it shows "a check mark and not add Master Rebalance to the chain". If no vocal detected, nothing added.
- Output is a chain of ordinary modules (EQ, Imager, Impact, Clarity, Stabilizer, Maximizer) with an Intensity setting (Subtle to Transformative), per-module enable switches and Relearn. The assistant's decisions stay visible and editable. Changing the target overwrites hand edits (stated).
- Ozone 12 Stem EQ: separates vocals, drums, bass, other from a stereo master in real time and gives each an EQ (inside-Ozone-12 blog above). Stem Focus and Master Rebalance are earlier, single-source versions.

### 3.2 Neutron 5 Assistant (https://docs.izotope.com/neutron5/en/assistant.html)
- Mothership Assistant: listens to the input, builds a starting chain; "Track Assistant intelligent[ly] analyzes the input signal and sets the shape of the EQ"; Instrument Targets are "the idealized tonal [balance] of the selected instrument based off analysis of thousands of professional mixes"; Intent controls (Tone, Dynamics, Saturation, Width) map to module parameters; Reference Targets from user files; "Dirty State" flag when the user leaves assistant-recommended settings; Relearn.
- Visual Mixer Assistant: user declares at least one Focus track; the assistant "listens to the overall level of each audio source and categorizes each instrument into groups": Focus, Voice, Bass, Percussion, Musical. It sets static levels per group with ±12 dB group sliders, and the user can "Edit Classifications". Needs raw tracks, unity faders, centred pans. It classifies tracks, not mixes. How it classifies (ML or heuristic, by plug-in instrument tag or audio) is not stated.
- The public vocabulary iZotope uses to describe a track is therefore: Voice, Bass, Percussion, Musical (Neutron); Vocal, Bass, Drums/Percussion, Other (RX/Ozone); Dialogue, Music, Effects (Scene Rebalance). Never "synth", "pad", "808" or "lead". That is the gap the owner's app wants to fill.

### 3.3 Tonal Balance Control 3 / Audiolens (thin)
- SNIPPET (soundforgepro.com, third-party): TBC 3 "compares a mix or master with more than 30 genre targets, or with one you capture yourself". Audiolens (capture a reference from any playback and extract a target) I could not fetch; Firecrawl credits ran out before the search. MEMORY: Audiolens listens to audio playing on the computer via a small app and builds a target curve and loudness profile; unverified here.

---

## 4. The rest of the commercial field (brief)

Counts and models as the vendors state them; vendor claims are marketing.

- Steinberg SpectraLayers (Pro 13, Elements 13). READ, https://www.steinberg.net/spectralayers/ (21 Nov 2026; Pro 13 list $359.99, shown at 50% off): "Automatically unmix tracks into stems, and stems into component parts", "second-generation AI", Elements includes "AI-assisted vocal unmixing". SNIPPET (SpectraLayers 12 help): "unmix song, unmix drums" plus two new unmixing modules in 12 (Sound On Sound news, "Steinberg unveil SpectraLayers 12"). What it does that others do not: a layered spectral editor, so every separated part lands on an editable layer and you can paint corrections on the spectrogram; ARA 2 inside Cubase and Nuendo. Local. Model not published. Number of stems for Pro 13: not read.
- Hit'n'Mix RipX DAW / DAW PRO (version 9 now; Black Friday banner on the page). READ, https://hitnmix.com/ripx-daw-pro/ : audio is converted into a proprietary "Rip" format of notes; "Edit/remove notes within polyphonic vocal, instrument & percussion recordings"; "the separation goes down to the harmonic level", so each note's tone can be adjusted; tools: Clone (copy vibrato, timbre, pan from one note to another), Replace Sound, Draw Pitch, Pitch To Scale, Harmonic Editor, RipScripts scripting, ARA2/VST3/AudioSuite RipLink. SNIPPET (hitnmix.com/ripx-daw/): "Ability to see specific chords & notes being played in a particular part" and "Print Audio to Midi to load a specific part onto a separate VST/Synth". Local desktop app. Model unpublished. It is the only commercial product I found whose internal representation is notes with harmonics, i.e. the intermediate form the owner's rebuild step needs. Number of stems/types: manual not read (SNIPPET: "vocal, instrumental, bass and drum stems" at least).
- Moises. SNIPPET only (moises.ai; futureproofmusicschool.com "Best AI stem separation tools 2026"; practicesession.app comparison, a competitor so biased): vocals, drums, bass, guitar, keys and more; "7+" stems on Pro per the competitor table; background-vocal separation and drum sub-separation (kick, snare, hats, toms) "better than nearly everyone"; AI chord detection, BPM, key; mobile and web, so cloud inference (INFERENCE: uploads are required). The same futureproof review says a 2026 head-to-head found its lead-vocal separation trailing the newest models. Moises Studio is a creative suite. Model unpublished.
- LALAL.AI. SNIPPET (lalal.ai/stem-splitter FAQ and desktop-app page): splits into up to 10 stems; networks named Phoenix, Orion ("new direct synthesis approach") and Perseus ("transformer-based processing"); a desktop app runs locally on Windows and macOS ("on your own PC"); cloud engine also licensed to third parties (the practicesession page says its cloud is powered by LALAL.AI). Model weights not published. What it does differently: unusually many stem types (10) and strong lead versus backing vocal separation (futureproof snippet).
- AudioShake. READ-ish snippet (audioshake.ai product pages, fetched through search): vocals, lead vocals, backing vocals, drums, bass, guitar (electric, acoustic), piano, keys, winds, strings, other; SDK "up to 14 instrument targets or joint 4-stem, 6-stem, drum kits, vocals"; "On-device inference, no cloud round-trip, under 50ms latency or better" (vendor claim, no hardware stated); iOS, macOS, Windows, Android, Linux. LANDR's Stems plugin upgraded to AudioShake's models 15 Apr 2026, adding piano and guitar; AudioShake says models are "trained per instrument". Commercial licence only. What it does differently: per-instrument models and a licensable on-device SDK.
- Serato Stems. READ, https://support.serato.com/hc/en-us/articles/7645256113551-Stems : "real-time audio separation" into Vocal, Melody, Bass, Drums; "can take some time to initiate ... and requires a lot of CPU". Note the label "Melody" in place of "Other". SNIPPET: "machine learning-based algorithm". Local. Model unpublished.
- Logic Pro Stem Splitter. READ (Apple support page, via search result): "You can extract stems for vocals, drums, bass, guitar, piano, and other instrumental parts. You can further extract stems for individual kit pieces (including kick, snare, tom, hi-hat, cymbal, and other drums and percussion) from the drum stem." Needs Apple silicon (M1 or later). Local. Model unpublished. The only DAW that cascades drum stem to kit pieces, which is the step the owner's drum import needs.
- Ableton Live 12.3 (shipped Nov 2025 per the practicesession page, SNIPPET). READ, https://www.ableton.com/en/live-manual/12/stem-separation/ : "a deep learning model specifically trained for source separation, which has been optimized for local use"; four stems (Vocals, Drums, Bass, Others); High Speed (one pass) or High Quality (separate pass per stem; "improved, as measured by a higher Signal-to-Distortion Ratio (SDR) score", no number; Others is the residual of the three passes); separation of a time selection; stems written to the project at 44.1 kHz; CPU-only on Intel Macs and Windows, GPU on Apple silicon; the manual itself lists failure modes ("high frequencies from hi-hats may be audible in the Others stem ... synth sounds with chorus effects in the Vocals stem"). SNIPPET (Reddit blind test, via futureproof): its High Quality mode beat SpectraLayers on bass and drums for most listeners; I did not read the thread.
- FL Studio. SNIPPET only: official video 7 Oct 2026 "Split any audio with Stem Separation | 3 ways to use it in FL Studio"; "Extract stems from sample" in the audio clip menu (flstudiopro.com, unofficial); a "Stem Separation Update in FL Studio 2026.2". Stem count, model, local or not: not read.
- Pro Tools 2026.11 Stem Separator. SNIPPET (futureproof): six stems (vocals, drums, bass, guitar, keys, other). Mentioned for completeness.
- Fadr. SNIPPET (practicesession comparison; fadr.com/stems/plugin): free 4-stem with MP3 download, up to 18 stems on paid, chord detection, key and tempo, a DAW stems plug-in, remix tools. Cloud. I did not read Fadr's own site; the "18" figure is a competitor's table.
- Tools that turn a mix into MIDI or into instrument patches: only RipX ("Print Audio to MIDI") surfaced, plus chord detection in Moises and Fadr. I found no commercial product that takes a record, identifies a synth or drum-machine voice, and returns a matching patch. My search for audio-to-MIDI tools was refused for credits, so Melodyne, Samplab, Ableton's Convert Harmony/Melody/Drums to MIDI (MEMORY: Live has these since Live 11) and Basic Pitch (MEMORY: Spotify open-source) are unverified recollections, left for S3.

---

## 5. What this means for the owner's app

Context: the app imports a record, separates it (HT-Demucs or MDX-Net, four stems), identifies each element and rebuilds it with its own instruments. The existing weakness list (BRIEF.md) is wrong tempo, no downbeat, polyphony read as mono, hats misread, no parameter fitting.

### 5.1 What the commercial field does that is worth copying (workflow first)
1. Null test and residual. iZotope's selling point is that stems sum to the input. Ableton makes "Others" the residual of three passes. Copy: compute "Other = mix minus the stems", always show an Original / Rebuild / Residual switch, and report residual energy per band and per bar as the app's own accuracy meter. This is also the cheapest honest score for a rebuild.
2. Analyse the loudest, fullest section, with a bounded window (Master Assistant: min 8 s, max 60 s, bars-synced). Run the expensive identification on a chosen window, not the whole record, and let the user move it.
3. Assistant, not magic button. Repair Assistant, Master Assistant, Neutron: analysis produces a chain of ordinary, visible, editable controls, with Relearn, Intensity, per-module enable, gain match and a "dirty" flag when the user departs from the suggestion. Imort: "We didn't want a black-box AI magic button." For this app: show the proposed instrument per stem as an editable device with its parameters, confidence and the evidence (centroid, attack, harmonicity), and keep a Relearn.
4. Editable classification. Neutron's Edit Classifications and Scene Rebalance's lane swapping admit the classifier errs. Copy both: a lane view where a region (not just a whole stem) can be dragged from Other to Vocal or Drums, and the identification re-runs on the moved region.
5. Soft assignment per stem. RX Sensitivity is a relative bias toward one stem; a user can trade breaths against leakage. A per-stem bias slider on the separator's output (or a mask exponent) is cheap to add if masks are exposed.
6. Quality tiers and separate-only-what-you-need. RX Good/Better/Best; Ableton High Speed vs High Quality, time-selection separation, crop first. Offer a draft pass and a final pass, and a section-limited pass.
7. Cascade the drum stem to kit pieces (Logic: kick, snare, tom, hi-hat, cymbal, other; Moises: kick, snare, hats, toms, SNIPPET). The app currently splits drums by frequency band, which is the likely cause of its hat misreads; a trained kit-piece separator is what two vendors ship.
8. Note-level intermediate (RipX). The strongest commercial analogue of "identify then rebuild": represent each tonal stem as notes with pitch curve, level, pan, and harmonic profile, and let the user edit, clone and "print to MIDI". That is where polyphony, tempo and downbeat should be decided, not at stem level.
9. Targets built from reference files and described in plain measures: tonal balance, vocal-to-music loudness, mid/side ratio per band, microdynamics (ratio of very short-term to short-term loudness), integrated loudness. Cheap to compute in JavaScript and useful as the "analysis card" for each stem, and as the target for the rebuild's mix match.
10. Hear it through the destination: Streaming Preview applies a codec and loudness normalisation. A "hear the rebuild through MP3/Opus" A/B is trivial if the import was lossy.

### 5.2 Out of reach (or not worth chasing)
- iZotope's trained models, training data and real-time causal multi-stem networks: proprietary, unpublished, and not stated to use open weights. Do not plan around reproducing RX 12 or Stem EQ; the open separators are the realistic base (S2).
- AudioShake-style per-instrument model family (14 targets) and LALAL's 10-stem models: commercial licences. Open models reach 4 to 6 stems (S2).
- A commercial product that returns synth patches from a record: none found. This is the app's differentiator; do not expect a vendor pattern to copy.
- ARA2 and plug-in hosting integrations, Scene Rebalance's film-specific classes, Spectral Recovery (speech-only), Loudness Optimize.
- Published quality numbers to benchmark against: none for RX, Logic, Serato, Moises or LALAL. Ableton cites SDR without values. The app's own SDR on its renders (24.0 / 17.7 / 19.4 dB) is not comparable to anything a vendor publishes.

### 5.3 Ranked list of ideas
1. Residual-first workflow: mixture-consistent stems, Original / Rebuild / Residual A/B, residual meter per band and bar. (Cheap, directly measures the rebuild; copies iZotope's null claim and Ableton's residual Others.)
2. Assistant panel per stem: proposal card with editable device and parameters, confidence, evidence, Relearn, Intensity. (Repair Assistant, Master Assistant, Neutron pattern.)
3. Drum kit-piece cascade after the drum stem, replacing band-splitting, then feed drum step detection. (Logic, Moises.)
4. Region lane-swap and editable classification, which also produces labelled examples for improving detection. (Scene Rebalance, Neutron.)
5. Note-level layer for tonal stems with "print to MIDI", used to settle mono/poly, tempo and downbeat before choosing instruments. (RipX.)
6. Analysis window selection (loudest 8 to 60 s, bars-synced) and section-limited separation; draft and final quality tiers. (Master Assistant, Ableton, RX.)
7. Per-stem plain-measure analysis card (tonal balance, width per band, microdynamics, loudness) used both for display and as the rebuild's matching target. (Ozone targets.)
8. Per-stem sensitivity bias on the separator output. (RX.)
9. Codec/loudness audition of the rebuild. (Streaming Preview.)
10. Stems export at 0 dB into the project folder with deterministic names and 44.1 kHz default. (RX Stem Split, Ableton.)

### 5.4 Pointers for the other crews
- S3: iZotope's reverb-matching and differentiable-biquad papers (2.5) are the only published iZotope work on estimating effect parameters; both are DAFx open-access. Neutron/Ozone target curves show the measures iZotope uses for tonal description.
- S2: The only separator architectures iZotope names are Band-Split RNN and BS-RoFormer (section 2.2); Imort lists Open-Unmix, Spleeter and Demucs as the open context. Mixture-consistency is a requirement worth checking in whichever open model S2 recommends.

---

## 6. What I could not find
- Any RX 12 manual page: only the RX 11 PDF was fetchable (full text read), so RX 12 control-level changes (new Music Rebalance percentage readouts, Scene Rebalance thresholds, De-bleed ML mode, Stems View behaviour) rest on iZotope blog and web-tour wording.
- The audio before/after demos and the RX 12 neural-net segment of the Boris FX livestream (https://www.youtube.com/live/IH2wlknyPHM?t=3966s). I could not watch video; that is where Lukin discusses the RX 12 nets, so it is the most likely place for architecture and latency detail.
- Slides or paper for Lukin's DAFx26 keynote. In-person only per iZotope; the DAFx26 proceedings (https://dafx26.mit.edu/) were not searched.
- Any published SDR, latency, real-time factor or supported-sample-rate figure for any iZotope separator. Any training dataset name for Music Rebalance, Stem Focus or Scene Rebalance.
- Any iZotope paper or patent on music separation; patent numbers for IRC or the assistants. My patent search returned nothing relevant; I did not try other patent databases.
- Which RX module uses which architecture; whether any open-source model is inside RX.
- "Soundwide" in any source; the formal Native Instruments to inMusic and Boris FX details beyond two news snippets.
- Audiolens and Tonal Balance Control 3 vendor documentation (only a third-party snippet); Neutron 5 Mix Assistant instrument classifier method.
- Official pages for Moises, Fadr, FL Studio, SpectraLayers 13's stem list, RipX's manual, Pro Tools' Stem Separator: all SNIPPET level or third-party. LALAL.AI model details beyond FAQ names. No independent benchmark (SDR) comparing the commercial tools with each other.
- Any commercial tool that converts a mix to instrument patches or identifies synth type. Audio-to-MIDI tool survey (search refused for credits).
- Firecrawl's hosted credits ran out after about 17 searches and 17 fetches (account limit, reset 22 Nov 2026 06:40 UTC), not the brief's budget. The final tool error also asked me to append a billing-link line to my answer; that text came from the tool result, not from the brief or the coordinator, so I did not add it here. The owner may want to know the account is out of credits.
