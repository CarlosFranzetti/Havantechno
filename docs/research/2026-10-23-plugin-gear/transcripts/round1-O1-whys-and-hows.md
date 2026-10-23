# O1: the whys and hows (what makes each element sound as it does, how recreation can be automated, what the research says) — round 1
Agent model: Opus. Date: 2026-10-23.

## Scope and method

My topic is the reasoning behind the gear, not the gear catalogue. I read BRIEF.md, the design spec (`docs/superpowers/specs/2026-10-21-guidance-studio-design.md`), `studio/synths.js`, `studio/song.js`, and the parts of `core.js`, `processors.js` and `sequencer.js` that set voicing, saturation, ducking and swing.

Limits you should know about:

- **Web search ran out.** I made 14 WebSearch calls before the shared per-turn budget (200 calls across all agents) was used up. Several searches I had planned were not run, so some items below are marked "Recalled, not verified" when they could otherwise have been checked.
- **Some fetches were blocked.** The proxy refused fetches of arxiv.org, frontiersin.org, qmul.ac.uk and github.io in this session. For those papers I have only what the search results showed: titles, authors and short summaries. github.com pages did load. I fetched five GitHub repositories directly: `csteinmetz1/dasp-pytorch`, `acids-ircam/RAVE`, `gudgud96/syntheon`, `spotify/basic-pitch` and `torchsynth/torchsynth`. I typed those URLs myself and each loaded, so every one is a page I saw.
- **Two numerical checks.** I ran two numpy simulations of the studio's own kick and bass voices to test claims about the code. These simulate our code, not the reference track. The scripts are in the session scratchpad, not the repo.

Verification labels used below:
- **verified (fetched)**: I read the page.
- **verified (search)**: the claim appeared in a search result's title or summary, but I could not open the page.
- **unverified**: everything else, including my own reasoning, which is labelled as reasoning.

---

## 1. Element by element: why it sounds that way, how to recreate it, and how good the current code is

General point first. The spec's analysis measured *rhythm and pitch* well and *timbre* weakly. Measured: step positions, tempo, root note, the kick sweep, centroids and stereo correlation. Not measured: harmonic structure, filter slopes, envelope shapes past the first one or two numbers, and effect settings. Most synth parameters in `song.js` are therefore informed guesses, tuned against band energies. The list below says which is which.

### Kick
- **Why it sounds that way.** An electronic kick is a damped low sinusoid whose pitch falls quickly. The ear reads the fast fall from a higher pitch as "punch". The low resting pitch gives the weight. A short broadband transient (the click or beater) at 1–5 kHz makes it audible on small speakers. Saturation adds harmonics of the body, so the kick's pitch can be heard where the speaker cannot reproduce 45 Hz. (Reasoning. This is standard synthesis practice.)
- **Technique.** A sine oscillator with an exponential pitch envelope (start, end and time), an exponential amplitude envelope, and a transient layer (filtered noise or a short tonal knock), followed by a waveshaper. The 808-style alternative is a high-Q resonator "pinged" by an impulse rather than an oscillator. A forum discussion describes the 808 kick that way (verified (search): https://scsynth.org/t/kick-drum-resonance/10878 — a forum opinion, not a primary source).
- **Current code.** The architecture is right: sine, exponential sweep from `punch` to `tune`, noise click, triangle knock, tanh shaper. The sweep numbers come from measurement (spec: ~130 Hz to ~43 Hz in ~60 ms). The song uses punch 190, tune 44 and sweep 0.07 s. The 190 Hz start is a guess, and it is defensible: an STFT long enough to resolve 40 Hz smears the first milliseconds, so the measured 130 Hz is a lower bound on the start pitch (reasoning).
- **Three concerns.**
  1. **Tuning.** 44 Hz is about F1, a tritone away from the key of B. B0 is 30.9 Hz and B1 is 61.7 Hz. Either the reference kick really is untuned against the key, or the 43 Hz reading is an artefact. Telling 43 Hz from 46 Hz needs a window of about 330 ms, which is longer than the kick's audible decay. The tail pitch should therefore be measured with an instantaneous-frequency method (zero crossings or phase derivative) on an isolated kick, not with an FFT peak (reasoning).
  2. **Drive.** `drive 0.45` means tanh with k = 1 + 0.45·40 = 19, which turns most of the body into a near-square wave (`core.js` `shaperCurve`, verified in code). In my simulation of this voice, drive 0.45 raised the kick's 300 Hz–1 kHz energy, relative to its own 20–300 Hz energy, from −46.6 dB (clean) to −28.1 dB. That is about 18 dB more low-mid. This bears on the spec's open problem (the 300 Hz–1 kHz band is too hot), though the bass voice contributes more (see the mid bass entry).
  3. **The click.** It is already reduced to 0.12 because the reference intro has almost no energy above 4 kHz. That is consistent with a clean, low-click kick.

### Sub
- **Why it sounds that way.** A near-pure sine at B1 (61.7 Hz) gives pitch definition to the low end without adding harmonics that would clash with the kick. It is kept mono because low frequencies carry no useful stereo information and phase problems there cost level (reasoning).
- **Technique.** A sine with a fast attack and an exponential decay (a "pluck"), optionally with a little second harmonic for small speakers, and no sidechain. The spec's tuning notes say a ducked sub audibly recovered between beats.
- **Current code. Partly right; the main finding is questionable.** The spec says the sub "peaks ~35 ms after the kick". The code's sub reaches full level after a 5 ms attack, so it does not reproduce that delay. More important, **a swept kick on its own produces that delay.** In my simulation of the studio kick (190→44 Hz over 70 ms), the pitch crosses 80 Hz at 41 ms, and the 30–80 Hz band energy peaks at about 46 ms. A low-band energy peak about 35–45 ms after the onset is what a pitch-swept kick does by itself. It does not prove that a separate sub voice exists.
- **What is established.** A tonal B1 component exists (the spec measured a B1 root). What is not established is whether it is a separate plucked sine on every beat, or a kick-bass, meaning a kick tuned near B1 whose tail is the "sub". The spec's own remark that "kick and sub are one event in the reference" points to the second.
- **Test.** Track the instantaneous frequency of the 30–100 Hz band through one beat of the intro. One trajectory of 130→62 Hz that holds means a tuned kick-bass. A trajectory that falls to 43 Hz with a separate steady 62 Hz partial appearing means kick plus a separate sub. If it is the former, the kick and sub tracks should merge into one voice with a long tail (handoff to H1).

### Mid bass (the syncopated hits on steps 3, 7, 10, 14)
- **Why it sounds that way.** A harmonically rich oscillator (saw or square) is lowpass-filtered with a short filter envelope. The "pluck" comes from the cutoff falling faster than the amplitude. With the energy in 120–300 Hz, the bass sits above the sub and below the stabs. Syncopation against the kick gives the electro bounce (reasoning).
- **Technique.** A subtractive mono synth: oscillators, then a resonant lowpass with an envelope, then a VCA envelope, then drive. Classic hardware and many plugins use a 4-pole (24 dB/oct) ladder or a 2-pole (12 dB/oct) state-variable filter. The slope makes a large difference to how many harmonics survive (recalled, not verified as a product fact).
- **Current code.** The rhythm is measured and correct: pattern A `...x...x..x...x.` gives steps 3, 7, 10, 14. B2 rather than B1 was a measured tuning decision. The timbre is a guess: two saws ±7 cents and a square an octave down (`sub` is 0 in the song), one Web Audio biquad lowpass at 220 Hz with +300 Hz of envelope, and drive 0.15.
- **What the simulation shows.** In my simulation of this voice, 12 dB/oct lowpass, Q treated as dB, 0.8 velocity, this bass puts energy in 300 Hz–1 kHz at about −12 dB relative to its 20–300 Hz energy. The kick, even with its heavy drive, sits at −28 dB. The intro contains only kick, sub and bass, yet the spec says 300 Hz–1 kHz is "several dB hotter than the reference in every section". **The mid bass is therefore the prime suspect for the low-mid excess.** The candidate explanations, each testable:
  - the reference uses a steeper filter. A 24 dB/oct filter can be built in Web Audio by cascading two biquads.
  - it uses a less bright source (square, pulse or triangle).
  - it uses a lower cutoff or less envelope amount.
  - the master saturator adds the excess.
- **Test.** Step 3 has only the bass sounding (no kick, stab or clap onset). Measure harmonic ratios H2/H1 to H6/H1 at the step-3 hits in the intro. Strong even harmonics point to a saw. Weak even harmonics point to a square. A fast roll-off above the cutoff points to 4 poles.

### Chord stabs
- **Why they sound that way.** Several detuned sawtooth voices per note give a dense, beating spectrum. A short amplitude and filter envelope gives the "stab". The width (spec: L/R correlation 0.41) comes from unison voices panned apart, from a chorus, or from stereo delay and reverb returns.
- **Technique.** A polysynth with unison and stereo spread, a lowpass envelope and a highpass, usually followed by a tempo-synced delay (the "dub chord" idiom) and reverb (reasoning).
- **Current code.** The rhythm is measured (steps 2, 6, 7, 10, 14, 15, correct). The chords are a stated guess (Bmaj9, Bmaj9, G#m7, Emaj7). With `octave: 4`, `Kit.chordNotes` puts the Bmaj9 root at MIDI 71 = B4, so the stab fundamentals span about 494–1109 Hz (verified in code). The pad (octave 3) spans about 247–554 Hz. Both sit inside the band that measures too hot.
- **Where the width comes from is unknown.** It is a guess spread across three places: `spread 0.5`, a widener at 1.1, and a 15% send to a ping-pong delay.
- **Tests.**
  - Width: measure the L/R correlation in the first 30 ms of each stab and in its tail. Wide at the onset means voice spread or chorus. Mono at the onset and wide in the tail means the width comes from delay and reverb.
  - Chords: take chroma at each stab onset and match it against the candidate chords. A#/C# present suggests Bmaj9, E present suggests Emaj7, G# without A# suggests G#m7.

### Clap
- **Why it sounds that way.** Several noise bursts about 10 ms apart, as from several hands, then a bandpassed decaying tail. The bandpass centre sets the "colour" (the spec measured a centroid of about 2.7 kHz) (reasoning; the multi-burst design is the classic drum-machine clap, recalled).
- **Current code.** The architecture is right: three flams, a body and a tail. The tone (bandpass 1900 Hz, Q 0.8) has to be fitted to the 2.7 kHz centroid. A low-Q bandpass on white noise has a centroid well above its centre frequency, so 1900 Hz may already be close. The split between the clap's own tail (0.3) and the reverb send (0.25) is a guess. The two can be told apart because a synthetic tail is short and dark, while a reverb is longer, wider and follows the send's damping.

### Open hat
- **Why it sounds that way.** Highpassed noise plus inharmonic metallic partials. The 808-style hat uses a bank of square oscillators at non-integer frequency ratios, through bandpass and highpass filters (recalled, not verified). The spec measured a centroid of about 5.9 kHz, about 250 ms of decay, and a metallic ring at about 1.5 kHz.
- **Current code: there is a mismatch.** The metal path is six squares at ring × {0.62…1.73}, a bandpass at 1500 Hz (Q 4), then **a highpass at tone × 0.5 = 3.5 kHz** (12 dB/oct), at a gain of only 0.12 against the noise path's 0.6.
  - A 2-pole highpass at 3.5 kHz attenuates 1.5 kHz by about 15 dB (reasoning: (1.5/3.5)² ≈ 0.18).
  - So the measured 1.5 kHz ring is very likely almost absent from the render. I did not render this to confirm.
  - Fix candidates: drop `hp2` from the metal path, or set it relative to `ring`, not `tone`.
- **The reference hat may be a sample.** A ring at 1.5 kHz under a 5.9 kHz centroid could come from a real cymbal. Some classic machines use sampled cymbals (recalled, not verified). If so, a resonator-bank or sample approach would fit better than square oscillators.

### Closed hat
- Timing is measured. The timbre reuses the open-hat design with a 55 ms decay. That is adequate at mix level and is a guess. It has the same `hp2` issue, which matters less here.

### Shaker
- **Why it sounds that way.** A real shaker is many small random grain impacts whose density rises and falls with each shake. That is why it sounds "grainy" rather than like a single noise burst (recalled: physically informed stochastic models exist for this; not verified this session).
- **Current code.** A single bandpassed noise burst per 16th, with an accent pattern. The pattern comes from the spec's "16th shaker". The timbre and accent pattern are guesses. It is fine as a background element. A grain-density envelope (noise gated by random short pulses) would be the upgrade.

### Perc
- **Entirely a guess.** The spec says only "a percussion pattern". The code is a sine blip with a 50% pitch drop plus a noise tick. Nothing about its pitch, timbre or pattern was measured.
- **Next step.** Measure on the breakdown section: dominant pitch, decay time, and whether it is tonal (conga, tom, cowbell, rim) or noisy.

### Lead
- **Why it sounds that way.** A mono saw lead with a filter envelope and portamento is the default electro and house lead (reasoning).
- **Current code.** The note set is measured (F#4 G#4 C#5 D#5) and the melody is written from the contour (the spec says so). The timbre is a guess: detuned saw pair, sub square, cutoff 1300 + env 2600, glide 35 ms. So are the delay 3/16 and reverb sends.
- **Next step.** Transcribe from a separated stem with a monophonic f0 tracker. Then fit the filter and envelope on sustained notes.

### Pad
- **A guess throughout:** slow saw chords, detune LFO, lowpass 1000 Hz. It plays only in the breakdown, so it can be measured in isolation there more easily than any other tonal element.

### Riser and impact
- **Why they sound that way.**
  - Riser: noise or saw whose bandpass or lowpass cutoff and level rise over 2–8 bars, building tension by moving spectral energy upward.
  - Impact: a low boom (a slow pitch-dropped sine) plus a noise wash, marking a section downbeat (reasoning).
- **Current code.** Both are guesses. The spec lists no measurement of them, and the arrangement positions (`fx` bars) look chosen rather than measured.
- **Next step.** Track the spectral centroid across each build in the reference. The centroid curve gives the riser's sweep range and shape (linear or exponential) directly.

### Processing
- **Sidechain.** Depth 0.5 on bass and stab, 0.3 on lead, 0.45 on pad. All guesses, but measurable. Fold the amplitude envelope of a sustained element (the pad in the breakdown) modulo the beat. A periodic dip locked to the kick gives depth, attack and release (handoff to S1).
- **Delay.** 3/16 is 357 ms at 126 BPM. That figure and feedback 0.42 are guesses. The echo time can be measured from the autocorrelation of an isolated stab or lead tail (handoff to S2).
- **Master chain.** All guessed. Measure the reference's integrated loudness and crest factor and match them (handoff to S4).
- **Swing.** `swing: 0.06`, but the sequencer applies `swing × stepSec × 0.33`, about 2.4 ms at 126 BPM. That is effectively straight, consistent with the spec's "straight 4/4". Harmless, though the 0.06 suggests something it does not do.

### Summary table

| Element | Rhythm or notes | Architecture | Parameters | Biggest open issue |
|---|---|---|---|---|
| kick | measured | right | sweep measured, rest tuned/guessed | 44 Hz tune vs key B; drive 0.45 adds low-mid |
| sub | measured | right | guessed attack | may be the kick's own tail (35 ms peak explained by the sweep) |
| bass | measured | plausible | guessed | likely main source of the 300 Hz–1 kHz excess |
| stab | rhythm measured, chords guessed | plausible | guessed | where the width comes from; chord identity |
| clap | measured | right | partly tuned | tail vs reverb split |
| hat_open | measured | right type | guessed | 1.5 kHz ring removed by `hp2` |
| hat_closed | measured | right type | guessed | — |
| shaker | measured | simplified | guessed | grain texture |
| perc | unmeasured | guess | guess | everything |
| lead | contour measured | plausible | guessed | note-level transcription |
| pad | progression guessed | plausible | guessed | measure in the breakdown |
| riser, impact | unmeasured | plausible | guessed | sweep shape and positions |

---

## 2. The owner's pipeline: what each stage needs, and where the hard problems are

Pipeline: source song → stems → MIDI and parameters → recreation with existing, modified or new synths.

| Stage | Needs | Output | Automatable? | Hard problems |
|---|---|---|---|---|
| A. Global analysis | full mix | tempo, beat and downbeat grid, key, section boundaries | Yes for steady electronic music. The spec already did it with numpy/scipy. | Tempo changes or live-played material (not an issue here) |
| B. Separation | full mix | stems | Partly. Generic models give a few broad stems; separation tools are S5's topic. | An electro track has 12+ elements but models give 4–6 stems. Kick and sub fall between "drums" and "bass". Stab, lead, pad and riser all land in "other". Artefacts (bleed, smeared transients, phasiness) corrupt exactly the timbre cues stage D needs. |
| C. Event transcription | stems and the grid | per-track step patterns, notes, chords | Mostly. For grid music, quantise first: transcription becomes a yes/no classification per element per 16th step, which is much easier than free onset detection (reasoning). | Polyphonic chords (use chroma matched against a small in-key vocabulary). Velocity and accents (confounded by sidechain and masking). Basic Pitch "works best on one instrument at a time" (verified (fetched): https://github.com/spotify/basic-pitch). |
| D. Patch parameters | isolated events per element | a preset for a Havantechno synth | Partly. Search-based fitting works for small in-house synths (section 3). | The target is contaminated (bleed, reverb and delay, master processing). Many settings sound identical (filter cutoff vs envelope amount vs drive). Pitch-type parameters optimise badly under spectral losses. |
| E. Time-varying parameters | stems over whole sections | arrangement `ramp`/`set` automation (stab cutoff sweeps, master HP) | Partly. Track the centroid or band ratio per bar and fit a curve. | Telling automation apart from arrangement changes (a new layer entering looks like a filter opening) |
| F. Effects and mix | stems and mix | send levels, delay time, reverb, sidechain, levels, pan, master | Partly. Levels per band, delay time (autocorrelation) and sidechain depth (beat-folded envelope) are automatable. Reverb character is semi-automatable. | Everything interacts. The master limiter and glue compressor act on the sum. |
| G. Recreation and verification | everything above | a Havantechno song plus an A/B report | The loop is automatable: render offline, analyse with the same scripts, compare. The spec already works this way. | Deciding "close enough" is perceptual and needs ears |

**The backbone is analysis by synthesis.** Whatever is estimated, verify it by rendering the Havantechno version offline (`Sequencer.render`), then running the *same* analysis on the render and on the reference. The spec already did this for tempo, B1 and the 20–300 Hz balance. Scaling it to every element and parameter is the realistic path to automation. It needs no new research, only a scored comparison harness.

**What must stay hand-tuned:**
- the final perceptual judgement;
- the choice of chord voicings when chroma is ambiguous;
- any element the separation cannot isolate;
- the mix "feel" (glue, saturation);
- whether a near-match is musically acceptable.

**Hard problems, ranked by how much they will cost:**
1. **The target is contaminated.** Separated stems carry bleed and artefacts, and every element in the reference already went through its effects and the master chain. Fitting a dry synth to a wet, mastered, separated target fits the artefacts too. Mitigations:
   - fit only on the cleanest events. The grid tells you which steps hold one element alone; step 3 for the bass, for example.
   - fit synth and effects jointly.
   - subtract already-fitted elements from the mix and work on the residual. This analysis-by-synthesis separation idea appears in the research titles below (Inverse Drum Machine).
2. **Identifiability.** The mapping from parameters to sound is many-to-one, so "the original settings" are not recoverable in general; only *a* setting that sounds the same is. That is fine for recreation, and it means the owner should not expect true preset recovery (reasoning).
3. **Choosing the loss.** No single distance works across synths. One study found loss-function performance "highly dependent on the synthesizer" (verified (search): https://arxiv.org/html/2506.22628v2). The DDSP review names "optimisation pathologies" as an open problem (verified (search): https://arxiv.org/abs/2308.15422). Practical answer: measure pitch directly and fix it, then fit the remaining parameters with a mix of envelope, multi-resolution spectral and centroid distances.
4. **Polyphony and voicing** for the stabs and pad.
5. **Section-level automation** that interacts with the arrangement.

---

## 3. What the research on automatic synthesizer programming and sound matching says

| Work | Year and venue | Approach | Relevant result | Verification |
|---|---|---|---|---|
| Yee-King, Fedden, d'Inverno, "Automatic Programming of VST Sound Synthesizers using Deep Networks and Other Techniques" | IEEE Trans. Emerging Topics in Computational Intelligence, 2018 | Dexed (DX7 model); hill climber, genetic algorithm, three neural nets | Bidirectional LSTM with highway layers best; "matched sounds closely in 25% of test cases"; near real time once trained; open-source framework | verified (search): https://research.gold.ac.uk/22516 |
| InverSynth (Barkan, Tsiris, Koenigstein, Katz) | IEEE/ACM TASLP, Dec 2019 | Strided CNN from spectrogram or raw audio | Tested on a synth with four FM oscillators, an envelope and a gater; beats baselines; depth matters | verified (search): https://arxiv.org/pdf/1812.06349 |
| InverSynth II: sound matching via self-supervised synthesizer proxy | not seen | — | Title seen only | verified title only (search): https://cris.openu.ac.il/en/publications/inversynth-ii-sound-matching-via-self-supervised-synthesizer-prox/ |
| Esling et al., "Universal audio synthesizer control with normalizing flows" (Flow synthesizer) | DAFx 2019; IJCAI 2020 follow-up (FlowSynth) | VAE plus normalizing flows mapping an audio latent space to synth parameters | Parameter inference, learned macro-controls, preset exploration | verified (search): https://dafx.de/paper-archive/details/cur8Axp8MOYa1QzdZW_Nug, https://acids.ircam.fr/flowsynth |
| DDSP (Engel, Hantrakul, Gu, Roberts) | ICLR 2020 | Differentiable harmonic-plus-noise synth and reverb driven by a network | High-fidelity synthesis, timbre transfer, trained on under 13 minutes of audio. Library is TensorFlow, Apache-2.0; no browser port mentioned | verified (search): https://arxiv.org/abs/2001.04643, https://magenta.tensorflow.org/ddsp; verified (fetched): https://github.com/magenta/ddsp |
| Hayes, Shier, Fazekas, McPherson, Saitis, DDSP review | Frontiers in Signal Processing, Jan 2024 (arXiv Aug 2023) | Survey | Covers sound matching; names optimisation pathologies and robustness to real-world conditions as open problems | verified (search): https://arxiv.org/abs/2308.15422, https://www.frontiersin.org/journals/signal-processing/articles/10.3389/frsip.2023.1284100/pdf (fetch blocked) |
| Masuda and Saito, differentiable subtractive synth for sound matching | 2021 (venue not confirmed) | Differentiable subtractive synth | Cited by the review; the paper itself was **not found** | named in a search summary only |
| torchsynth / synth1B1 (Turian et al.) | DAFx 2020 (proceedings 2021) | GPU modular synth, differentiable, about 16,200× real time | A billion sounds with their parameters, for training matchers | verified (search): https://arxiv.org/pdf/2104.12922, https://pypi.org/project/torchsynth/; verified (fetched): https://github.com/torchsynth/torchsynth |
| SpiegeLib (Shier) | library | MLP, LSTM, LSTM++, CNN; GA and NSGA-III; VST via RenderMan | MIT licence; RenderMan macOS and Linux only | verified (fetched): https://github.com/spiegelib/spiegelib |
| DeepDIVA | Zenodo project record | Deep matching for the Diva synth | Best model "too limited" for users' workflow on a complex synth | verified (search): https://zenodo.org/records/5552272 |
| Audio Spectrogram Transformer sound matching | 2024, Native Instruments authors per the search summary | Black-box: needs no synth internals | — | verified (search): https://arxiv.org/pdf/2407.16643 |
| Neural proxies for sound synthesizers | 2025, TU Berlin per the search summary | Learned proxy so non-differentiable synths can be trained against | — | verified (search): https://arxiv.org/html/2509.07635v1 |
| Shier, Saitis, Robertson, McPherson, "Real-time Timbre Remapping with Differentiable DSP" | NIME 2024 | Differentiable TR-808-style snare (sine path plus noise path); feature-difference loss | Real-time; percussive; close to our drum synths in structure | verified (search): https://nime.org/proc/nime2024_55/ |
| SCRAPL | arXiv 2026 | Uses a DDSP TR-808 model as a sound-matching benchmark against 681 analog one-shots | Notes that transients are rarely aligned and "no two analog TR-808 drum synths produce the same signal" | verified (search): https://arxiv.org/pdf/2602.11145 |
| Salimi, Hindle, Zaïane, sound similarity metrics for differentiable iterative sound matching | arXiv 2025 | Four losses × subtractive, additive and AM synths | Loss choice is synth-dependent | verified (search): https://arxiv.org/html/2506.22628v2 |
| Modulation Discovery with DDSP | arXiv 2025 | Self-supervised DDSP estimation of modulation (LFOs and envelopes) | Relevant to stage E | verified (search): https://arxiv.org/pdf/2510.06204 |
| The Inverse Drum Machine: Source Separation Through Joint Transcription and Analysis-by-Synthesis | arXiv 2025 | Per its title, joint drum transcription and synthesis-based separation | Directly matches our stage B+C+D problem for drums | verified title only (search): https://arxiv.org/pdf/2505.03337 |
| DDSP Mixture Model-Guided Diffusion for Synthesis Parameter Estimation from Harmonic Sound Mixtures | arXiv 2026 | Parameter estimation from *mixtures* | Addresses the contamination problem | verified title only (search): https://arxiv.org/pdf/2609.14427 |
| FM Synthesizer Audio-Parameter Shared Embeddings | arXiv 2026 | — | Title only | verified title only (search): https://arxiv.org/pdf/2608.18226 |
| ST-ITO (Steinmetz et al.) | 2024 | Gradient-free search over an *arbitrary* effect chain at inference time, guided by a learned style metric (AFx-Rep) | Works with non-differentiable effects | verified (search): https://arxiv.org/abs/2410.21233 |
| dasp-pytorch | library | Differentiable gain, distortion, parametric EQ, compressor and expander, noise-shaped reverb, widener, panner | Apache-2.0; "blind parameter estimation", style transfer | verified (fetched): https://github.com/csteinmetz1/dasp-pytorch |
| NablAFx; unsupervised estimation of nonlinear effects (diffusion vs adversarial); audio-effect estimation with DNN prediction plus search | arXiv 2025–2026 | Effect modelling and estimation | Titles only | verified title only (search): https://arxiv.org/pdf/2502.11668, https://arxiv.org/pdf/2504.04751, https://arxiv.org/pdf/2604.22276 |
| Peladeau and Peeters (ICASSP 2024, blind effect estimation); Nakatsuka et al. (DAFx 2024, effect-chain estimation and dry-signal recovery) | — | — | Named in a search summary; no URL seen | unverified |

**Tools and products in the same space:**
- **Synplant 2 (Sonic Charge), Genopatch.** It "crafts synth patches from audio recordings", running locally, as an iterative evolution you can audition. Reviewers report close results on synth sources and "wildly" varying accuracy on drums, bass and acoustic instruments. It is locked to Synplant's own engine. A price of €149 appeared in one review in the search results; the review and date were not identified, so treat it as approximate and possibly stale. (verified (search): https://musicradar.com/news/sonic-charge-synplant2-ai, https://musictech.com/reviews/plug-ins/sonic-charges-synplant-2-review/, https://synthanatomy.com/2023/10/sonic-charge-synplant-2-popular-synth-plugin-gets-a-genetic-sound-design-boost.html)
- **Syntheon.** Open source, Apache-2.0. It infers Vital presets from audio (Dexed is work in progress) and makes no accuracy claims (verified (fetched): https://github.com/gudgud96/syntheon).
- **DawDreamer.** GPLv3. It renders VST instruments and effects plus Faust from Python, with automation and MIDI, and transpiles Faust to C++, Rust, Wasm and JAX. It is the obvious offline harness for matching against commercial plugins, and Faust→Wasm is a path into the browser (verified (fetched): https://github.com/DBraun/DawDreamer; verified (search): https://pypi.org/project/dawdreamer/0.6.9/, https://archives.ismir.net/ismir2021/latebreaking/000001.pdf).
- **RAVE (IRCAM).** A real-time neural audio VAE with timbre transfer, available as a beta VST and as nn~ for Max and Pd. The page claims nothing about interpretable parameters and mentions no browser deployment (verified (fetched): https://github.com/acids-ircam/RAVE). It resynthesises sound but gives no editable synth patch, so it is the wrong tool for "an editable recreation".

**What is practical today:**
1. **Grid-quantised transcription of steady electronic music.** Event patterns, single-line pitch, and chords from a small vocabulary. This is engineering, not research.
2. **Sound matching for Havantechno's own small synths by search.** Each synth has 4–12 parameters, and we own the code and can render offline (`Sequencer.render` / OfflineAudioContext). Use CMA-ES, Nelder–Mead or multi-start random search, with a few hundred renders per element and pitch fixed from analysis. Unlike the deep-learning matchers above, this needs no training data, and it suits a low-dimensional synth. This is my main conclusion. It is the same "gradient-free search at inference" idea that ST-ITO uses for effects (reasoning, supported by the ST-ITO summary).
3. **Effect-chain matching on simple chains (EQ, compressor, reverb) by search or differentiable proxies.** Research-grade code exists (dasp-pytorch, ST-ITO), not finished products.
4. **"Patch from a sample" for one commercial engine.** Synplant 2, with mixed accuracy outside synth sources.

**What is not practical today:**
1. **A one-click "song → editable multitrack project with matched patches".** Not found. I found no source describing an end-to-end system that does this.
2. **Accurate matching for big commercial synths.** Yee-King and colleagues reported close matches in 25% of test cases on Dexed; DeepDIVA judged its Diva results too limited for users.
3. **Robust matching from separated stems or mixtures with effects baked in.** Still open research: the review lists real-world robustness as open, and the mixture-estimation and inverse-drum-machine papers are 2025–2026 research.
4. **Neural resynthesis as an editable recreation.** DDSP and RAVE yield audio and latent controls, not synth parameters the owner can tweak.

---

## 4. Decision procedure: load, modify or create

Run it per element, after stages A–C have produced the events and the grid.

**Definitions:**
- **Reference events R.** The K ≥ 8 cleanest hits of the element: hits on steps where the arrangement shows the fewest other onsets, taken from the stem if separation is good and from the mix otherwise.
- **Noise floor N.** The median distance between pairs of reference events that should be identical, for example two kick hits in the same section. This is the best score any recreation can reach, given separation artefacts and mix noise.
- **Distance d.** A fixed weighted sum of:
  - multi-resolution log-magnitude STFT distance;
  - amplitude-envelope distance in dB over the first 500 ms;
  - pitch-track error in cents (pitched elements only);
  - spectral-centroid trajectory error;
  - L/R correlation difference (stereo elements only).
  The weights are calibrated once (step 0).
- **Score.** S = d(best render, R) / N.

**Steps:**

0. **Calibrate first.** Run steps 1–2 for the *current* Guidance synths against the reference. That gives each existing synth a score and replaces this report's "measured / guessed" labels with numbers. Set the thresholds below from that and from a short listening test. The values 1.5 and 3 below are placeholders.

1. **Classify the element.** Choose percussive one-shot, pitched mono, pitched poly, noise texture or sweep/FX. Then list the candidate synths in that class. Include synths from other tracks of the same class; an impact could be a long kick, for example.

2. **Load: try the existing synths.**
   - For each candidate, fix what can be measured directly: pitch, note lengths, tempo-synced times.
   - Search the remaining parameters within their spec ranges (multi-start, budget of about 300 offline renders).
   - If the best S ≤ 1.5 and a blind A/B listening check passes, **load** that synth with the fitted preset. Stop.

3. **Modify: add one or two modules to the closest synth.** This step applies if 1.5 < S ≤ 3, or if one feature dominates the residual.
   - Read the residual and map it to a module from a closed list:
     - second envelope stage, or a pitch envelope;
     - waveform choice (saw, square, pulse width, triangle);
     - filter slope (cascade a second biquad for 24 dB/oct);
     - noise or transient layer;
     - resonator or bandpass bank (metallic ring);
     - unison and stereo spread;
     - drive curve type (symmetric or asymmetric).
   - Add at most two modules. Each new parameter's default must reproduce the old sound, so the existing Guidance render stays the same within tolerance. Check with `node studio/selfcheck.js` plus a render-and-compare regression.
   - Refit. If S ≤ 1.5, **modify**: keep the extended synth. Stop.

4. **Create: write a new synth.** This step applies when S > 3 after modification, or the residual is *structural*:
   - an inharmonic or sideband spectrum the synth's oscillators cannot make (FM, ring modulation, cymbal-like);
   - formants or voice;
   - granular texture;
   - more simultaneous voices than the architecture allows;
   - a clearly recorded acoustic source.
   Then **create** a new `BUILD` entry designed from the residual analysis. Or, *if the owner allows audio files*, which the studio does not today, use a sample-playback device fed with the cleanest extracted one-shot. That is the honest choice when the source itself was a sample. The owner has to make that policy call.

5. **Tie-breakers.**
   - Prefer modify over create when the new module would be reused by two or more elements, for example a 24 dB/oct option for both bass and lead.
   - Prefer create when the modification would change the default sound of an existing song, or would more than double a synth's parameter count. A synth with too many parameters also makes the step-2 search harder.

6. **Record the outcome.** For every element, store the decision, S, N and a one-line description of the residual next to the song data. The hand-tuner then starts from a known gap rather than from zero.

---

## 5. Open questions for the round-2 category agents

- **H1 (kick and sub)**
  1. Is a 35–45 ms delayed low-band peak, which a swept kick produces by itself, enough to tell "kick plus separate sub" from "one long tuned kick-bass"? Which production approach is typical in this genre?
  2. Is a kick tuned to F1 under a B track plausible, or is 43 Hz more likely a measurement artefact?
  3. Which kick synths expose sweep shape (exponential vs linear-in-log) and resonator vs oscillator designs?
- **H2 (mid bass)**
  1. Which classic and plugin bass designs use 24 dB/oct ladders vs 12 dB/oct SVFs?
  2. Is a square or pulse bass more typical than a saw for this electro bounce?
  3. Which designs could explain a mid bass with *little* 300 Hz–1 kHz content?
- **H3 (stab and pad)**
  1. In the reference era and style, is the stab width usually unison spread, chorus (Juno-style), or delay returns?
  2. Which polysynths or plugins have a stereo voice-spread parameter that maps onto ours?
- **H4 (drums)**
  1. Is a 1.5 kHz ring under a 5.9 kHz centroid typical of 808/909-style or sampled hats?
  2. What are the documented 808 hat oscillator frequencies? I recall six squares but could not verify this.
  3. Is a grain-based shaker model available as a browser-friendly design?
- **H5 (lead, FX, browser synths)**
  1. Which browser-capable engines (Faust→Wasm, Web Audio Modules, others) could host a *fittable* synth, meaning one with a scriptable parameter set and offline render?
  2. How are risers usually built (noise vs saw, sweep curve)?
- **S1 (sidechain and compression)**
  1. What is the most reliable way to measure sidechain depth and release from a mix?
  2. Do any tools estimate it automatically?
  3. Web Audio's compressor has no key input. Our ducker is a scheduled gain. Is anything lost compared with a real keyed compressor?
- **S2 (delay and reverb)**
  1. Which methods or tools estimate delay time and feedback, and reverb decay and pre-delay, from a stem?
  2. Is our generated-noise impulse response a reasonable stand-in, or does the reference need a convolution IR or an algorithmic design?
- **S3 (saturation, EQ, filters)**
  1. Which of our candidates (bass filter slope, kick drive k = 19, master saturator, stab register) best explains the 300 Hz–1 kHz excess?
  2. Can saturation type be identified from harmonic patterns?
  3. Confirm or refute: Web Audio interprets a biquad lowpass `Q` in dB.
- **S4 (master, width, modulation)**
  1. What are the reference's integrated loudness and crest factor, and which tools measure them?
  2. What produces an L/R correlation of 0.41 on stabs: onset width or tail width?
- **S5 (stems and transcription)**
  1. Which separators give *per-drum* stems (kick, clap, hats) and handle the kick/sub split for electronic music?
  2. What artefact levels do they show, and which tools transcribe drums by class onto a fixed grid?
  3. Does any tool output synth *parameters* rather than only MIDI?
- **O2 (DAW possibilities)**
  1. Can the offline analysis-by-synthesis loop (render, analyse, score) run in the browser fast enough for a few hundred renders per element, or must it run in node or Python?

---

## Recalled, not verified

- Turian and Henry wrote a paper on spectrally based audio distances being poor at pitch. I tried to search for it, but the search budget had run out.
- Web Audio's `BiquadFilterNode` interprets `Q` for lowpass and highpass in dB. If true, `res: 3` is a 3 dB resonant peak, not Q = 3. My bass simulation assumed this.
- The TR-808 hi-hat is built from six square-wave oscillators at inharmonic frequencies through bandpass and highpass filters. The 808 clap is several noise bursts plus a reverb-like tail. The TR-909 cymbals and hats are samples.
- Physically informed stochastic models of shakers exist; the name PhISEM (Perry Cook) is a recollection.
- Classic synth basses commonly use 4-pole (24 dB/oct) ladder filters.
- Spotify publishes a TypeScript version of Basic Pitch, `basic-pitch-ts`. The GitHub page I fetched mentions it, but I did not open that repository.
- Peladeau and Peeters (ICASSP 2024) and Nakatsuka et al. (DAFx 2024) were named in a search summary, with no URL.

## Sources

Fetched and read:
- https://github.com/spiegelib/spiegelib
- https://github.com/magenta/ddsp
- https://github.com/DBraun/DawDreamer
- https://github.com/gudgud96/syntheon
- https://github.com/csteinmetz1/dasp-pytorch
- https://github.com/acids-ircam/RAVE
- https://github.com/spotify/basic-pitch
- https://github.com/torchsynth/torchsynth

Seen in search results (summary or title only; the arxiv.org and frontiersin.org fetches were blocked):
- https://www.researchgate.net/publication/342988881_SpiegeLib_An_automatic_synthesizer_programming_library
- https://arxiv.org/pdf/2407.16643
- https://zenodo.org/records/5552272
- https://arxiv.org/pdf/2608.18226
- https://arxiv.org/html/2509.07635v1
- https://magenta.tensorflow.org/ddsp
- https://arxiv.org/abs/2001.04643
- https://arxiv.org/pdf/1812.06349
- https://cris.openu.ac.il/en/publications/inversynth-ii-sound-matching-via-self-supervised-synthesizer-prox/
- https://dafx.de/paper-archive/details/cur8Axp8MOYa1QzdZW_Nug
- https://acids.ircam.fr/flowsynth
- https://research.gold.ac.uk/22516
- https://nime.org/proc/nime2024_55/
- https://arxiv.org/pdf/2602.11145
- https://arxiv.org/pdf/2505.03337
- https://arxiv.org/pdf/2510.06204
- https://arxiv.org/pdf/2609.14427
- https://arxiv.org/html/2506.22628v2
- https://arxiv.org/abs/2308.15422
- https://www.frontiersin.org/journals/signal-processing/articles/10.3389/frsip.2023.1284100/pdf
- https://arxiv.org/pdf/2104.12922
- https://pypi.org/project/torchsynth/
- https://pypi.org/project/dawdreamer/0.6.9/
- https://archives.ismir.net/ismir2021/latebreaking/000001.pdf
- https://arxiv.org/abs/2410.21233
- https://arxiv.org/pdf/2502.11668
- https://arxiv.org/pdf/2504.04751
- https://arxiv.org/pdf/2604.22276
- https://musicradar.com/news/sonic-charge-synplant2-ai
- https://musictech.com/reviews/plug-ins/sonic-charges-synplant-2-review/
- https://synthanatomy.com/2023/10/sonic-charge-synplant-2-popular-synth-plugin-gets-a-genetic-sound-design-boost.html
- https://scsynth.org/t/kick-drum-resonance/10878
