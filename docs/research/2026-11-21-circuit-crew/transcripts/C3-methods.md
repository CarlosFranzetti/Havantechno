# C3: methods (Circuit Crew)

Researcher C3, 21 November 2026 (ET). Question: how the makers describe their analogue modelling, the published toolkit,
the open tools, and a concrete workflow and ranked plan for this app's engine. Research and reasoning only; no repo code
was changed. Scratch measurements were made in the session scratchpad, not in the repository.

## 0. Evidence rules, budget, and what went wrong

- Tags: **READ** = I fetched the page or file and it says so (URL given, figure or words quoted); **SNIPPET** = a search
  result's summary only; **MEMORY** = my own recollection, unverified; **RAN** = I ran it in this sandbox and saw the
  output. Paper titles marked MEMORY may be slightly off in wording or year; they are listed so a later pass can check them.
- Budget before the outage: 8 Firecrawl searches (2 failed), 11 Firecrawl scrapes (1 failed), 24 raw-GitHub fetches.
- **The Firecrawl account ran out of credits** after 6 searches and 10 scrapes (message: "Insufficient credits ... the
  allowance resets at 2026-11-22T06:40:54.832Z", i.e. 01:40 ET 22 November). After that I used only `curl` on
  raw.githubusercontent.com, as the brief allows. The GitHub API (api.github.com) answered 403 "GitHub access to this
  repository is not enabled for this session", so licences were read from LICENSE files, not from API metadata.
- Consequence: Part B's paper references are mostly READ only as citations inside library READMEs, SNIPPET, or MEMORY.
  I opened no paper PDF. Softube and TAL rest on SNIPPET; Native Instruments, Cherry Audio and D16 on nothing (2.3).
- After the coordinator's message (curl to any host that answers, WebSearch summaries as SNIPPET) I tried four paper
  PDFs by curl. **Refused** by the proxy (`curl: (56) CONNECT tunnel failed, response 403`, or no connection):
  www.dafx.de, dafx2018.web.ua.pt, www.native-instruments.com, www.eurasip.org. **Answered**: raw.githubusercontent.com,
  zenodo.org (HTTP 200 on its home page; no paper fetched). Then 3 WebSearch calls (11 searches in all); their results
  are tagged SNIPPET. Pages fetched in all: 39 of 40.
- No query carried the owner's name or the project's name.

## 1. Where the present engine stands (READ, this repository)

What a method upgrade would replace, from `app/engine/worklets/classics-processor.js`, `classics.js`, `drums.js`,
`tools/tb303-bench.js`, the Patch Crew REPORT and `log-P5.md`:

- **Shared DSP.** `OS = 4` ("oversampling factor of the oscillators and ladders (Open303 uses 4)"); PolyBLEP and PolyBLAMP
  residuals (2-sample polynomial); a [7/6] Pade tanh `th()` "exact to about 1e-6 for |x| < 4.97 and clamped beyond";
  Open303's 12th-order elliptic quarter-band decimator. No antiderivative antialiasing anywhere. No iterative solver
  anywhere. Noise is a seeded LCG so offline renders are deterministic (a design rule worth keeping, log-P5 section 1).
- **tb303.** Open303's TeeBeeFilter TB_303 mode: the processor comment calls it "the mystran and kunn diode-ladder
  approximation". It is a **linear** four-state update (`y1 += 2*b0*(y0 - y1 + y2)` ...) with polynomial-fitted
  coefficients `b0`, `kf` and a makeup gain `g`; the only nonlinearity is a prior soft clip in the feedback,
  `fb / (1 + |fb| * 0.15)`. Oscillator, high-pass and ladder run at 4x, then the elliptic decimator, then the all-pass
  and second high-pass at 1x. The accent network is a real circuit solve (piecewise-linear diode, exact exponential per
  sample) — the one place the engine already does circuit-level modelling. Resonance never self-oscillates; peak height
  4.8 / 8.0 / 8.7 dB at resonance 1 (log-P5 section 10). Priors: `kMax` 15, `accentHz` 1260, the soft clip, Kacc.
- **modeld.** ImprovedMoog (D'Angelo and Valimaki, ICASSP 2013, ISC): trapezoidal stages with one tanh per stage and
  "feedback from the previous V3" (a one-sample delay in the loop, compensated by the measured `tuneFix` 5.1 and
  `tuneGain` 1.025). Oscillators at 4x with PolyBLEP; ideal saw, pulse, triangle shapes plus measured level weights.
  Drift and static offsets per oscillator are priors (`offsetCt 2`, `driftCt 1.5`, `driftTau 4`).
- **juno.** Six voices; a 4-pole TPT (zero-delay) ladder with one tanh at the loop input, solved in closed form
  (`u = th((x - res*sig) / (1 + res*G^4))`, i.e. the linear ZDF solution with the tanh applied after: an approximation,
  not an exact nonlinear solve). **Runs at 1x** (DCO, ladder and tanh); REPORT section 5: "the filter is not
  oversampled". Chorus: one linear-interpolated delay line, two taps in antiphase, one-pole low-passes at 7237 and
  10644 Hz around it, optional hiss; REPORT: "the chorus has no delay-line noise or filtering" of the real BBD.
  DCOs run at fixed start phases, no per-voice variance in filter or envelope.
- **808/909** (`drums.js`): plain Web Audio nodes (oscillators, biquads, a waveshaper, buffers), fitted to the service
  notes' tables and Werner's 808 papers; `tools/drums-score.js` reads 86 pass, 19 fail (CLAUDE.md).
- **Bench.** `tools/tb303-bench.js` renders through headless Chromium, excites the filter with the instrument's own saw
  (note 24, a harmonic every 32.7 Hz), reads a test-only probe output (cutoff, frequency, VCA gain, wiper voltage), and
  `--compare` flags a change beyond 2 % or 0.2 dB. It measures the model against itself over time; it has no external
  reference curve. Nothing has been compared with a unit or a recording (REPORT section 5).
- **Loader.** `app/engine/worklets.js` adds `FILES = ['classics-processor.js']` with `audioWorklet.addModule`, resolved
  next to `worklets.js`; a failed load falls back to plain nodes. No build step, no package.json at the root.

## Part A. What the makers say

### 2.1 Arturia, TAE

- **READ, https://www.arturia.com/technology/tae (fetched 21 Nov 2026, undated page).** Claims, in their words:
  - "TAE® is 'True Analog Emulation' - Arturia's exclusive technology that accurately reproduces the tone, waveshape,
    tuning and other detailed characteristics of an analog synthesizer."
  - Process: "Depending on the context, our instruments are modeled starting from mathematical models, physical models,
    simulations of their circuitry. From then, we sit next to the instrument we are modeling and listen to every little
    nuance ... the response of the filter cutoff knob, a small artifact in the waveform of an oscillator, even the noise
    that is generated by the circuit."
  - Oscillators: "free-running; i.e., they are not sampled, wavetable-based or generated from a 0-point when a note is
    played"; "completely free of aliasing in all contexts (PWM, FM, hard sync, etc.), at no extra CPU cost"; "TAE®
    simulates the oscillators' instability"; "waveforms were always slightly different from one period to the next";
    "TAE® allows the reproduction of a condenser's unload" (the capacitor-discharge curvature of saw, triangle, square).
  - Filters: for Prophet-V, "direct filter modeling techniques ... By modeling the operation of the individual hardware
    components of the filter circuit"; a plot of harmonics of the self-oscillating filter, "virtual (blue) and original
    (red)" — the only stated comparison with hardware.
  - Soft clipping: "the resonant filter uses a current-limiting function ... TAE® emulates this current-limiting
    function ... It also allows filters to enter self-oscillation"; output-stage soft clipping "with a very particular
    shape".
- **READ, OP-Xa V manual 1.4.1, https://dl.arturia.net/products/op-xa-v/manual/op-xa-v_Manual_1_4_1_EN.pdf**, section 1.3
  "Arturia's Secret Ingredient: TAE®": the same three pillars ("Aliasing-Free Oscillators", "A Better Reproduction of
  Analog Oscillator Waveforms" — "the discharge of such capacitors results in a slight 'bend' in the original waveform",
  "Additional factors" — instability, "the starting point for each period (in Trigger mode) could vary"). A table gives
  one figure: at 700 Hz, "-48" dB for "a current well-known software synthesizer" against "-90" dB for "Oscillator
  modeled with TAE®" (an alias-level comparison with no stated test condition).
- **SNIPPET**: the same TAE text appears in the Prophet V 2.6, Modular V 2.6, SEM V and Analog Lab manuals (search
  results only). So the public description has not changed across a decade of manuals; I found **no version history** of
  TAE, no "TAE 2", and no statement of what changed.
- **READ, Acid V manual 1.0.0, https://downloads.arturia.net/products/acid-v/manual/acid-v_Manual_1_0_0_EN.pdf** (first
  20 of 111 pages): "Authentic 303 oscillator with sawtooth and pulse waveforms"; "Faithful model of 303 diode ladder
  filter with cutoff and resonance"; "Advanced voicing features such as bass boost, variable pulse width, accent attack,
  filter cutoff knob range, circuit noise, pitch tracking, and clipping level". No method is described in those pages.
  Note the exposed parameters: these are the knobs a circuit model naturally has (trimmers and part values).
- **Mini V, Jup-8 V, Jun-6 V**: not fetched (budget gone). MEMORY: their manuals carry the same TAE boilerplate.
- **Research output by Arturia engineers. READ, arXiv 2512.15313v2**, "Time-Varying Audio Effect Modeling by End-to-End
  Adversarial Training", Yann Bourdin (Arturia and Inria Bordeaux), Pierrick Legrand (Inria, IMS Bordeaux), Fanny Roche
  (Arturia). A GAN trained on "only input-output audio recordings" of "the phaser effect of the Ensoniq DP/4". This is
  black-box neural modelling of an effect from recordings, not TAE. It is the only Arturia-affiliated technical paper
  this search found. **No patent, thesis or engineering interview on TAE was found.**
- What this amounts to: Arturia publishes **goals and observable properties**, not a method. The properties are
  checkable: alias level, waveform curvature, period-to-period jitter, filter self-oscillation harmonics, a
  current-limited resonance, output soft clip, and comparison by ear and by plot against a unit they own.

### 2.2 Roland, ACB

- **READ, Roland U.S. blog, 14 February 2014, https://www.rolandus.com/blog/2014/02/14/analog-circuit-behavior-acb/**:
  ACB uses "original design specs, consultation with original engineers, and a detailed, part-by-part analysis of each
  analog circuit in our own pristine units"; it "reproduces each analog component by thoroughly analyzing each detail of
  the original design drawings. By combining the analyzed components in exactly the same manner as the original analog
  components, detailed characteristics of the original musical instruments emerge". A reader's comment on the same page:
  the TB-3 lacks "the accumulating accent" (unverified user claim; relevant because our accent network does model it).
- **READ, Roland Boutique developer interview, https://www.roland.com/global/promos/roland_boutique/interview_2/**
  (undated; MEMORY: Boutique launched 2015). Takeshi Tojo: "This series is based on ACB ... we modeled the circuitry of
  the originals, and took it as far as we could by ourselves first." Hideki Izuchi (Juno designer): "Just make sure you
  get the chorus right." Hirotake Tohyama: "we would come up against individual differences [due to age]. It was
  difficult to decide on which of those to simulate." Tojo: "A BBD ... can get noisier as years go by. The first original
  unit that we checked had a lot of noise, but another ... made less noise. So we adjusted the amount of noise to where it
  sounded good." Izuchi: impressed that ACB "could realize this degree of simulation just from the circuit drawing and an
  original unit". Takahashi on the TR-8: "the engineer who was involved in developing the original TR-808 would write a
  program based on the circuit diagram".
- Reading: ACB is described as component-level modelling from schematics, checked against one or more real units, with
  unit-to-unit variance resolved by taste. No paper, patent or solver detail was found. The interview is the best public
  evidence that (a) the Juno's character is concentrated in the chorus and (b) BBD noise is a tuned, not measured, value.

### 2.3 u-he, Cytomic, and the others

- **u-he Diva. READ, Diva user guide version 1.4.3, March 15, 2018** (hosted at larslentzaudio.wordpress.com, a
  third-party copy of u-he's guide): accuracy modes "draft ... resonance is primitive (not 'zero delay')", "fast",
  "great", "divine ... Top-quality zero delay feedback filters"; a separate "OfflineAcc" for rendering. On the solver:
  "We calculate the filter with a few test samples and look at the deviation between the prediction and the result, then
  we use that deviation to calculate a better prediction. However, it can take up to 15 cycles if the resonance is very
  high and/or the input is very complex, for instance noise." That is an iterative (Newton-like or fixed-point) solve of
  the implicit nonlinear filter equations per sample, with a variable iteration count and user-selectable quality.
  SNIPPET (Sound On Sound review): Diva "needs a pretty powerful computer" in Divine.
- **Cytomic. READ, https://cytomic.com/technical-papers/**: "This knowledge is placed in the public domain". Listed:
  "From Circuit To Code: Under the Hood of Analog Modelling" (ADC 2020 slides and video); "Dynamic Smoothing";
  trapezoidal-integrated one-pole, SVF and Sallen-Key papers (`SvfLinearTrapOptimised2.pdf`, `SkfLinearTrapOptimised2.pdf`,
  2013); conversions between trapezoidal SVF and DF1; sin-only coefficient forms; Nyquist-matched SVF. SNIPPET (search
  excerpt of `SvfLinearTrapOptimised2.pdf`): "Solving for terms using nodal analysis (also called KCL, ie the sum of
  currents at each node is zero)", with the capacitor as a trapezoidal companion model
  `ic[n+1] = (2C/h) vc[n+1] - (2C/h) vc[n] - ic[n]`. The ADC 2020 slides could not be read (credits). MEMORY: Simper's
  stated approach for nonlinear circuits is nodal analysis plus trapezoidal integration with Newton iteration, a good
  initial guess from the previous sample, and oversampling; and his products (The Drop, The Glue) are commercial and
  closed. These papers are public domain: the safest material in this whole list to port.
- **Softube. SNIPPET** (WebSearch summary of MusicTech, MusicRadar, gearnews, KVR, 2021): Model 84 is a Juno-106
  recreation described as "circuit-modeling on a component level", built from "a fully serviced and highly functioning
  Juno-106 from 1984", keeping "all the quirks and non-linearities"; a separate "Model 84 Chorus" module exists. No
  technical detail on the method was in the results.
- **TAL. SNIPPET** (product listings and reviews of TAL-U-NO-LX): "self resonating zero feedback delay filter (24dB LP),
  with a filter range up to ~40kHz (depends on the sample rate)"; "meticulously calibrated after a real Juno-60"; one
  review says it "uses PSpice circuit technology to model the original circuitry" (a reviewer's claim, not TAL's own).
- **Native Instruments, Cherry Audio, D16 (Phoscyon)**: nothing found (one combined search returned only TAL). MEMORY
  only: Native Instruments employs Vadim Zavalishin and hosts his book "The Art of VA Filter Design" (revisions up to
  2.1.x, about 2018-2020), the main published account of ZDF/TPT filters including ladder, diode-ladder and Sallen-Key
  chapters (the PDF host refused this session); Cherry Audio and D16 have published no technical papers that I know of.
- **Basis of Part A, plainly**: Arturia's TAE page and two manuals, Arturia's arXiv paper, Roland's 2014 blog post and
  the Boutique interview, u-he's Diva guide (third-party copy) and Cytomic's paper list are READ. The Cytomic
  nodal-analysis excerpt, Softube, TAL and the other Arturia manuals are SNIPPET. Everything said about Native
  Instruments, Cherry Audio, D16, Cytomic's Newton practice and the Mini V / Jup-8 V / Jun-6 V manuals is MEMORY.

## Part B. The published toolkit

Each item: key references, what it does, when it is the right tool here.

### 3.1 ZDF / TPT filters and nonlinear ladders

- References: Zavalishin, "The Art of VA Filter Design", Native Instruments, rev. 2.x, 2018-2020 (MEMORY; free PDF).
  Simper, Cytomic technical papers 2011-2013 (READ, listing above). Huovilainen, "Non-linear digital implementation of
  the Moog ladder filter", DAFx-04 (MEMORY). D'Angelo and Valimaki, "An improved virtual analog model of the Moog ladder
  filter", ICASSP 2013 (READ as the source of our `modeld` ladder in THIRD_PARTY.md; title wording MEMORY). D'Angelo and
  Valimaki, "Generalized Moog ladder filter" parts I and II, IEEE TASLP 2014 (MEMORY). Stinchcombe, analyses of the Moog
  ladder (2008) and of the TB-303 diode ladder (MEMORY; our code cites "Stinchcombe's SPICE pole 92 Hz"). Fontana and
  Civolani, EMS VCS3 diode-ladder model, IEEE TASLP 2010 (MEMORY).
- READ, ddiakopoulos/MoogLadders README (raw GitHub): ten ladder variants with licences — "Huovilainen | LGPLv3",
  "Stilson | Unlicense", "Krajeski | Unlicense", "MusicDSP | Suggested CC-BY-SA", "Oberheim | Custom | Will Pirkle",
  "Improved | ISC", "RKSimulation | BSD", "Hyperion | Unlicense"; "The filters have not been rigorously verified".
- READ, 1ay1/acidflow README (MIT): "A real diode-ladder filter ... the four stages are coupled like the 303's, solved
  exactly with zero-delay feedback and a tanh on the input node. The filter and drive run at 2× between 59-tap half-band
  FIRs, and the saturators use antiderivative anti-aliasing". Code not read. It is an existence proof of the
  "linear ZDF diode ladder + one input nonlinearity" level, the same level as our Juno ladder.
- What it does: TPT discretises each integrator with the trapezoidal rule and solves the instantaneous feedback loop
  algebraically, so cutoff and resonance are exact (no one-sample loop delay, no `tuneFix` correction) and modulation is
  stable. With nonlinearities inside the loop the equation becomes implicit and needs a solver (3.2), or an
  approximation (tanh applied after the linear solution, as `juno` does now).
- When: every ladder here. The Model D's one-sample-delay feedback and its two measured tuning patches (`tuneFix`,
  `tuneGain`) are the symptom a ZDF form removes. The 303's polynomial-fitted coefficients are a curve fit of a linear
  diode ladder; a true diode-ladder ZDF with per-stage nonlinearity is the next level (4, rank 3).

### 3.2 Newton and other solvers, and their cost

- Newton-Raphson on the nodal or state equations per sample, started from the previous sample's solution; 1 to 4
  iterations typical, more near clipping or high resonance (u-he READ above: "up to 15 cycles"). Alternatives: fixed-point
  iteration (cheap, slow to converge at high loop gain), damped Newton, one Newton step per sample ("semi-implicit"),
  precomputed tables of the solution over a 1-D or 2-D input (the DK-method trick for one or two nonlinear ports).
- **RAN, scratch CPU estimate** (scratchpad `bench.js`, Node 22, this sandbox's Xeon at 2.10 GHz, one voice at 4x, 10 s
  of audio): the present Open303-style linear ladder costs **0.38 to 0.45 % of one core**; a four-state nonlinear diode
  ladder (four tanh differences, trapezoidal, full 4x4 Jacobian solved by Gaussian elimination) costs **4.5 %** with 2
  Newton iterations and **5.8 %** with 3. So a true nonlinear solve is about **10 to 15 times** the present filter, in
  plain JavaScript, unoptimised (Float64Array Jacobian refilled every iteration). The model's equations were a
  plausible diode-ladder form for timing only, not a verified 303 model.
- When: whenever a nonlinearity sits inside a feedback loop and its shape matters audibly (303 diode ladder, Minimoog
  ladder under overdrive, Juno IR3109 at high resonance). Not for memoryless stages outside loops (use ADAA, 3.3).

### 3.3 Antialiasing of nonlinearities, and oversampling

- References (MEMORY): Parker, Zavalishin and Le Bivic, "Reducing the aliasing of nonlinear waveshaping using
  continuous-time convolution", DAFx-16; Bilbao, Esqueda, Parker and Valimaki, "Antiderivative antialiasing for memoryless
  nonlinearities", IEEE Signal Processing Letters 2017; later work on ADAA inside stateful systems and in WDFs.
- READ: chowdsp_utils README lists `chowdsp_waveshapers` (GPLv3) "implemented with integrated waveshaping (ADAA)":
  `ADAAHardClipper`, `ADAATanhClipper`, `ADAASoftClipper`. acidflow (MIT) uses ADAA saturators at 2x (above).
- What: first-order ADAA replaces `f(x[n])` by `(F(x[n]) - F(x[n-1])) / (x[n] - x[n-1])` with F the antiderivative
  (for tanh, `log cosh`), giving roughly the alias reduction of 2x to 4x oversampling at the cost of half a sample of delay
  and an ill-conditioned branch when consecutive inputs are close. Inside a feedback loop the half-sample delay breaks
  the ZDF property, so ADAA suits stages outside loops; loops are better served by oversampling.
- Oversampling choices: polyphase half-band FIR (linear phase, latency; acidflow's 59-tap at 2x), IIR elliptic decimator
  (our Open303 one: minimum latency, phase distortion near the band edge), or none. Our 303 and Model D already pay 4x;
  the Juno pays 1x for six voices with a tanh in the loop — the one clear aliasing gap.

### 3.4 Wave digital filters

- READ (citations in chowdsp_wdf README, raw GitHub): Fettweis, "Wave Digital Filters: Theory and Practice", Proc. IEEE
  1986; J. O. Smith, "Wave Digital Filters" in Physical Audio Signal Processing (CCRMA online); Yeh and Smith, "Simulating
  Guitar Distortion Circuits Using Wave Digital And Nonlinear State Space Formulations", DAFx-08; Werner et al., "Wave
  Digital Filter Modeling of Circuits with Operational Amplifiers", EUSIPCO 2016; Werner et al., "Resolving Wave Digital
  Filters with Multiple/Multiport Nonlinearities", DAFx-15; Werner, "Virtual Analog Modeling of Audio Circuitry Using Wave
  Digital Filters", PhD dissertation, Stanford 2016; Zhang and Smith, cascaded tube amplifiers, DAFx-18; Chowdhury,
  "chowdsp_wdf: An Advanced C++ Library for Wave Digital Circuit Modelling", arXiv 2210.12554, 2022. The library's diode
  models use "an approximation of the Wright Omega function based on Stefano D'Angelo's implementation" (MIT).
- MEMORY: Bernardini, Sarti and colleagues' scattering iterative method (SIM) for WDFs with many nonlinearities.
- What: each component becomes a wave-domain one-port; series/parallel adaptors connect them in a tree; one
  nonlinearity at the root is solved explicitly (diode via Wright Omega, no iteration); several nonlinearities or
  non-tree topologies need an R-type adaptor (a scattering matrix derived from the circuit) and, for multiport
  nonlinearities, a local Newton solve. Component values map one-to-one to adaptor parameters, so trimmers and tolerances
  are direct model parameters ("circuit-bendable", Werner's word in the 808 papers cited in THIRD_PARTY.md).
- When: passive networks with few nonlinearities — the 808/909 voice networks (Werner's 808 bass drum and cymbal were
  done this way, and ChowKick, READ: "inspired by Kurt Werner's analysis and modelling of the TR-808 Kick Drum Circuit",
  BSD-3), the 303's accent network and coupling capacitors, the Juno's HPF and BBD input/output filters, EQ and tone
  stacks. Less natural for ladders (four coupled nonlinear stages; R-type plus multiport Newton, little gain over nodal).

### 3.5 State-space: nodal DK and the generalised method; port-Hamiltonian

- READ (ACME.jl README, MIT "Copyright (c) 2015, 2016, 2017: Martin Holters"): ACME "is based on the method described in
  M. Holters, U. Zölzer, 'A Generalized Method for the Derivation of Non-Linear State-Space Models from Circuit
  Schematics'" (EUSIPCO 2015, link http://www.eurasip.org/Proceedings/Eusipco/Eusipco2015/papers/1570103545.pdf, not
  opened). It lets one "programmatically describe a circuit in terms of elements and connections ... and then
  automatically derive a model" (its first example is a diode clipper with `diode(is=1e-15)`).
- MEMORY: Yeh, Abel and Smith, "Automated physical modeling of nonlinear audio circuits for real-time audio effects,
  part I" (IEEE TASLP 2010) and Yeh's Stanford thesis 2009 (the nodal DK method: trapezoidal companion models, a
  state-space form `x[n+1] = A x + B u + C i(v)`, `v = D x + E u + F i(v)` with only the nonlinear port voltages solved
  by Newton, and the solution tabulated when there are one or two ports). Holters and Zolzer's method generalises it to
  arbitrary elements and reduces the nonlinear equation's dimension.
- MEMORY: port-Hamiltonian formulations (Falaize and Helie, "Passive guaranteed simulation of analog audio circuits: a
  port-Hamiltonian approach", Applied Sciences 2016; the PyPHS tool) guarantee passivity (no numerical energy gain),
  attractive for self-oscillating filters that must not blow up; heavier to derive and run.
- When: a whole block with a few nonlinear ports and many linear parts — the Minimoog ladder with its input pair and
  coupling network, the IR3109 stage as a macromodel, the 808 voices. DK's offline derivation emits matrices that can be
  hand-coded in JS: the derivation is offline (Julia or SymPy), the runtime is matrix-vector products plus a small Newton.

### 3.6 Oscillators

- References (MEMORY): Stilson and Smith, BLIT, ICMC 1996; Brandt, minBLEP, ICMC 2001; Valimaki, DPW (differentiated
  parabolic waveform), IEEE SPL 2005, and Valimaki, Nam, Smith and Abel, higher-order DPW, IEEE TASLP 2010; Valimaki and
  Huovilainen, "Antialiasing oscillators in subtractive synthesis", IEEE Signal Processing Magazine 2007 (PolyBLEP);
  Esqueda, Valimaki and Bilbao, "Rounding corners with BLAMP", DAFx-16. SNIPPET: Pekonen, "Filter-Based Oscillator
  Algorithms for Virtual Analog Synthesis", Aalto doctoral dissertation 2014. SNIPPET: "Towards Neural Emulation of
  Voltage-Controlled Oscillators", DAFx-25 paper 33.
- What and when: PolyBLEP (ours) is cheap and adequate at 4x; minBLEP or higher-order BLEP tables are better at 1x
  (Juno). Hard sync needs a BLEP at the reset instant of the slave with the slave's jump height, at the fractional reset
  time — PolyBLEP handles it if the reset time is known within the sample. Analog shapes: a saw core is a capacitor
  charged by a current and reset by a comparator and transistor, so (a) the ramp bends if the current source is not
  ideal (Arturia's "condenser's unload"), (b) the reset takes a finite time (a short falling slope, sometimes a small
  spike), (c) the period jitters with comparator noise. Each is an analytic waveform with known discontinuities, so BLEP
  and BLAMP still apply: model the shape as a smooth function of phase plus band-limited corrections at the reset.
  Drift: a slow random walk (one-pole filtered noise) on the exponential converter, plus per-period jitter; per-voice
  static offsets from component tolerance. Free-running phase: the oscillator keeps running between notes (ours do).
  The Juno's DCOs are counter-driven (MEMORY: an 8253 timer drives the reset, READ Izuchi: "the core part of that setup
  was the NEC μPD8253 chip"), so pitch is stable but the waveshaper after the counter still has analog shape.

### 3.7 Bucket-brigade delays, chorus, companders, clock noise

- READ (chowdsp_utils, `modules/dsp/chowdsp_dsp_utils/Delay/BBD/chowdsp_BBDFilterBank.h`, GPLv3 module): "Bucket-Bridage
  Device emulation, as derived by Martin Holters and Julian Parker: http://dafx2018.web.ua.pt/papers/DAFx2018_paper_12.pdf";
  "Anti-aliasing/reconstruction filters used by JUNO-60 chorus. Root/Pole analysis borrowed from the above paper", with
  `inputFilterOriginalCutoff = 9900.0f`, `outputFilterOriginalCutoff = 9500.0f` and complex roots such as
  `{ -10329.2715f, -329.848f }`. SNIPPET (WebSearch, dafx.de archive entry): the title is "A Combined Model for a Bucket
  Brigade Device and its Input and Output Filters", a model that "uses a variable sample rate" and avoids interpolation;
  the authors and year come from the chowdsp header (READ: Holters and Parker, DAFx2018 paper 12). SNIPPET: "Practical
  Modeling of Bucket-Brigade Device Circuits" is in the same archive (MEMORY: Raffel and Smith, DAFx-10; a BBD as a
  clocked sample-and-hold with charge-transfer losses).
- What: the BBD is a discrete-time system clocked at a rate that changes with the LFO, sitting between two continuous-time
  filters; Holters and Parker model the filters as sums of complex one-poles evaluated at the BBD's own sample instants,
  so the variable clock is exact and alias-free in the way the hardware is. Around it: clock feedthrough (a tone at the
  clock rate, filtered), BBD hiss rising with delay, charge-loss low-pass, input soft clip; the Juno-60 has no compander
  (MEMORY; some Roland choruses, such as the Dimension D, do). Roland themselves tuned BBD noise "to where it sounded
  good" (READ, Tojo).
- When: the Juno chorus — the one block the original designer singled out (READ, Izuchi). Our present chorus is an ideal
  delay; this is a direct replacement with a GPL-3.0 port path (compatible with AGPL-3.0-or-later per CLAUDE.md, with a
  THIRD_PARTY row) or a re-derivation from the paper.

### 3.8 Envelopes and VCAs

- References: SNIPPET, Pines, "Real-Time Virtual Analog Modelling of Diode-Based VCAs", DAFx-25 paper 44. MEMORY: OTA
  (CA3080, LM13700) large-signal transfer is `Iabc * tanh(Vin / 2VT)`; the Juno-60/106 use Roland's VCA/OTA chips and the
  IR3109 (MEMORY; C1 has the part list).
- What: an analog ADSR is a capacitor charged and discharged through resistors and switches: attack is an RC aimed above
  the comparator threshold (we model this, `attackTarget 1/0.632` and `rFilter`), decay and release are RCs, and the
  gate switch has finite on-resistance (click on fast attack). VCA: an OTA's tanh input stage gives level-dependent
  saturation; control feedthrough gives "thump" on fast envelopes (DC step bleeding into the audio when the CV offset
  trimmer is off); bleed is leakage of signal at zero CV (finite off attenuation, -70 to -90 dB typical, MEMORY).
- When: cheap once the block is in the per-sample processor; ours already have RC shapes. Thump and bleed are trimmer
  parameters (3.9), off by default.

### 3.9 Tolerance, unit variance, trimmers

- Facts (MEMORY): carbon-film resistors of the period were 5 % (some 1-2 % metal film in critical places), electrolytic
  and ceramic capacitors 10-20 %, transistor hFE and Vbe spread tens of percent and millivolts; trimmers set tracking,
  offsets and widths at the factory. READ, Matsui: "more than 100 semi-fixed resistors in the SYSTEM-700"; Takahashi on
  the Jupiter-8: "You would adjust one part just right and that might put another part out of whack."
- Method: represent each trimmer as a named model parameter with the factory procedure's target (e.g. "adjust VR for
  1 V/oct"), and each toleranced part as `nominal × (1 + σ·z)` with a seeded z per instance (per voice for the Juno).
  Keep the seed in the patch so renders stay deterministic (log-P5 rule). Never randomise beyond the tolerance band.

### 3.10 Neural and grey-box modelling

- READ: Alec-Wright/Automated-GuitarAmpModelling README: RNN models "described in this conference paper"
  (https://www.dafx.de/paper-archive/2019/DAFx2019_paper_43.pdf, MEMORY: Wright, Damskagg and Valimaki, "Real-time
  black-box modelling with recurrent neural networks", DAFx-19), and "a dataset recorded from your target device is
  required". READ: jatinchowdhury18/differentiable-wdfs: "implementing differentiable wave digital filters ... to
  integrate WDFs with neural networks, and allow for the automatic optimisation of WDF parameters", with a
  "diode_dataset". READ: Arturia's GAN phaser paper (2.1) needs "input-output audio recordings". MEMORY: Engel et al.,
  DDSP, ICLR 2020; Parker, Esqueda and Bergner, "Modelling of nonlinear state-space systems using a deep neural network",
  DAFx-19; grey-box work replacing one nonlinearity in a white-box model by a small network trained on measurements.
- Data needed: aligned input/output recordings of the device (for a synth voice, also the control signals — gate, CV,
  knob positions), minutes to hours of them, at the operating points that matter.
- Worth it here? **No, not without a unit.** A network trained on SPICE output only learns the SPICE model, which the
  white-box model can already compute exactly; trained on someone's plug-in it learns their model, with a licence
  problem (5.4). The one honest use without hardware: differentiable white-box models whose few uncertain parameters
  (a trimmer, a diode's Is and n, a BBD's noise level) are fitted by gradient descent to published measurements (CA-72's
  calibration tables, Juno60's measurements) — that is parameter fitting, and plain least squares does the same job.

## Part C. Open tools, for this sandbox and for the product

| Tool | Licence (how known) | What it gives | Fit with this app |
|---|---|---|---|
| ngspice 42 | BSD-style, mostly (MEMORY); installed here from Ubuntu `ngspice 42+ds-3build1` (RAN) | AC, transient, DC sweeps, `.meas`, model cards for BJTs, diodes, JFETs; batch mode `ngspice -b` | Reference simulator for every block, offline only. RAN: a 10k/10nF RC gave `f3db = 1.591608e+03` against 1591.5 Hz analytic. Never shipped. |
| PySpice 1.5 | GPL-3.0 (MEMORY) | Python front end to ngspice | Available from pip here (`pip index`, RAN); optional; plain ngspice batch decks plus Python parsing suffice. |
| LTspice | freeware, closed (MEMORY) | Same role; many published synth netlists are .asc | Not in the sandbox; netlists convertible to ngspice by hand. |
| LiveSPICE | MIT, "Copyright (c) 2013 Dillon Sharlet" (READ) | Real-time circuit simulation of audio "with minimal latency"; needs the ComputerAlgebra project (READ) | C#/.NET, Windows; useful as a design idea (symbolic derivation then compiled update), not portable to a worklet. |
| Qucs / Qucs-S | GPL-2.0 (MEMORY) | GUI simulator, Qucs-S drives ngspice | Not needed; ngspice batch is enough. |
| ACME.jl | MIT (READ) | Netlist in Julia, automatic nonlinear state-space model (Holters-Zolzer) | Offline derivation; Julia not installed here (MEMORY: installable). Matrices it derives can be hand-ported to JS. |
| chowdsp_wdf | BSD-3-Clause (READ) | Header-only C++14 WDF library, R-type adaptors, XSIMD optional, Wright-Omega diodes | Two paths: port the few adaptors used to JS (small, permissive), or compile to WASM (5.2). |
| chowdsp_utils BBD | GPL-3.0 module (READ: "`chowdsp_dsp_utils` (GPLv3)") | Holters-Parker BBD with Juno-60 filter roots | Port to JS with attribution (AGPL-compatible). |
| ChowKick | BSD-3-Clause (READ) | WDF kick after Werner's 808 analysis | Reference for an 808 BD worklet model. |
| Faust + wdmodels.lib | compiler LGPL-2.1-or-later (READ, COPYING.txt "FAUST compiler, Version 2.95.0"); wdmodels functions `declare ... license "LicenseRef-STK-4.3"` (READ), Dirk Roosenburg 2020, "heavily based on Kurt Werner's Dissertation" | DSP language with a WASM and AudioWorklet back end (READ, grame-cncm/faustwasm README: AudioWorklet nodes, polyphony, `npm i -D @grame/faustwasm`) | A prototyping tool; generated code is a separate WASM module per instrument with its own runtime; heavy toolchain (Node package or the compiler). Not installed here. |
| pywdf | MIT, 2023 (READ) | Python WDF with R-type adaptors, frequency and transient analysis; examples include `tr_808_hatresonator.py` | Quick offline prototyping and response plots of WDF trees; needs numpy (installed, RAN `import numpy` 2.5.3). |
| MAME netlist | BSD-3-Clause, "copyright-holders:Couriersud" (READ, `src/lib/netlist/solver/nld_ms_direct.h`) | A real-time nodal solver (direct, Gauss-Seidel, SOR solvers) with device models, used for discrete arcade audio | A source of solver ideas and possibly netlists; which synth or drum circuits it contains was not checked. |
| SymPy 1.14 | BSD (MEMORY) | Symbolic nodal analysis, derive and simplify update equations, emit code | Available from pip here (`pip index`, RAN), not installed. The cheapest path to hand-checked equations in JS. |
| clang 18 + wasm-ld | Apache-2.0 with LLVM exception (MEMORY) | C to WebAssembly without Emscripten | RAN: `clang --target=wasm32 -O3 -msimd128 -nostdlib -Wl,--no-entry` built a 369-byte module that Node instantiated and ran. |

### 5.1 Hand-port versus WebAssembly

- **Hand-port to JS** (the present practice: Open303 and ImprovedMoog were ported). Pros: no build step, debuggable in the
  same file, deterministic, the Node checks' stubs keep working. Cons: JS doubles only (no SIMD), Newton cost about 10-15x
  the present ladder (RAN, 3.2). Verdict: right for one-voice blocks (303, Model D) and for the BBD.
- **WASM**: worth it only where the arithmetic dominates and is regular — six Juno voices with a nonlinear ladder each
  and a SIMD batch across voices (chowdsp_wdf's README names exactly this case: "a WDF model of a synthesizer voice, and
  want to run several voices, like for a polyphonic synthesizer"), or a large R-type matrix. MEMORY: typical gains over
  well-written JS are 1.5-3x scalar, more with SIMD128 across 4 lanes.
- **Constraints of AudioWorklet plus WASM** (MEMORY, check in Chromium and Electron before relying on it): the
  AudioWorkletGlobalScope has `WebAssembly` but no `fetch`; so compile on the main thread (`WebAssembly.compile(bytes)`)
  and pass the `WebAssembly.Module` (structured-cloneable) in `processorOptions`, or pass the bytes and instantiate in the
  processor constructor (synchronous `new WebAssembly.Module` on large modules may be restricted on the main thread, not
  in worklets — unverified). Allocate all memory at construction (no `memory.grow`, no malloc in `process`); use
  `-nostdlib` C with static buffers, as in the RAN test. SIMD128 is in Chromium since about version 91 and Safari since
  about 16.4 (MEMORY); keep a scalar build or the JS path as fallback. OfflineAudioContext renders use the same
  processors, so determinism holds if the WASM code uses no time or randomness of its own.
- **Loader fit**: `worklets.js` adds `classics-processor.js` by URL. A WASM processor needs (a) the `.wasm` bytes served
  next to it (Electron's `havantechno://` scheme and `tools/serve.js` must serve `application/wasm`, MEMORY) or embedded
  as base64 in a JS file in `FILES`, and (b) a `Worklets.load` step that compiles the module once per context and hands it
  to `Worklets.node` through `processorOptions`. Embedding keeps "no build step" for users while the repo holds the C
  source, the generated base64 file and a `tools/build-wasm.sh` with the exact clang line; a check must fail if the
  committed blob does not match a rebuild.

## Part D. Workflow and plan for this project

### 6.1 The loop, one block at a time

1. **Schematic and part values.** From the service notes (C1 says where), transcribed into an ngspice deck per block:
   e.g. `ref/303-vcf.cir` (diode ladder, its coupling capacitors, the feedback path and resonance pot, the buffer),
   `ref/303-accent.cir`, `ref/minimoog-ladder.cir` (with the input differential pair and the mixer overdrive),
   `ref/juno-vcf.cir` (IR3109 as a macromodel, MEMORY: the chip's internals are not published, see 6.5),
   `ref/juno-chorus.cir` (the BBD's filters only; the BBD itself is not a SPICE part). Every deck names its sheet and
   part designators. Component facts are not copyrightable expression; the decks are our own transcription
   (coordinator to confirm they may live in the repo; the schematic images may not, CLAUDE.md).
2. **Reference simulation.** Batch runs: AC response of the linearised filter versus cutoff CV (5 to 9 points) and
   resonance (0, 0.5, 0.9, max); transient responses: a step, a slow sweep, and a sine at increasing level (-30 to +10 dB
   re the nominal oscillator level) for distortion (harmonic levels H2 to H7); for self-oscillation, the amplitude and
   frequency of the oscillation versus CV. For the accent network, the wiper voltage over 1-4 consecutive accents (P1
   already did this by hand; the bench reproduces it to three decimals, log-P5 section 10).
3. **Reference data stored as data.** Small JSON tables under a `tools/ref/` folder (frequency, dB, phase; time series
   decimated), each with the deck's hash, the ngspice version and the model cards used. Numbers, not audio.
4. **Real-time model fitted or re-derived** until the bench agrees within tolerance. Two kinds of change only: re-derive
   the equations (a structural change), or fit a named parameter that the circuit leaves open (a model card value, a
   trimmer). Never add a free fudge factor to close a gap silently; if one is needed it gets basis 'prior'.
5. **Bench.** Extend `tools/tb303-bench.js` (and add `modeld-bench.js`, `juno-bench.js`) with a test-only input to the
   filter block (like today's `_probe` output) so the bench can drive the block with the same sine, step and sweep as the
   SPICE run, and compare against the stored tables, exiting 1 on a miss. A Node shim that runs the processor classes
   without Chromium would make the loop seconds instead of 16 s; `classics-check.js` already stubs the worklet path.
6. **Listening comparison.** Render before/after pairs with the bench's demos (`--demos --suffix`), loudness-matched, and
   say plainly that this compares the model with its previous self and with a simulation, not with a unit.

### 6.2 Tolerances (proposed; basis prior, reasoning below)

- Linear response: within **±0.5 dB** in the passband and over the first octave of the stopband, **±1 dB** at the
  resonance peak, peak frequency within **±2 %** (about 35 cents). Stopband below -40 dB: shape only.
- Time constants (envelopes, accent network, slide): within **±5 %**. Pitch of a held note: within **±1 cent**.
- Distortion against level: each of H2 to H5 within **±2 dB** where it is above -60 dB re the fundamental; onset level of
  clipping within 1 dB.
- Why: level differences under about 0.5-1 dB and pitch differences under about 5 cents are near the limit of hearing
  for these sounds (MEMORY), and the period's parts were 5 % resistors and 10-20 % capacitors, so two real units differ by
  more than these bands. Tighter matching to a SPICE run of nominal values is false precision. Self-oscillation pitch is
  the exception: tune to the stated tracking, because the musician hears it.

### 6.3 What SPICE can and cannot stand in for

- Can: topology and every passive value (the schematic is the design), linear responses, DC operating points, the shape
  of a nonlinearity set by transistor and diode physics (exponential junctions with generic model cards), the effect of a
  trimmer or a tolerance (Monte Carlo), interactions a hand analysis misses (loading between stages, coupling-capacitor
  high-passes inside the loop — the 303's "SPICE pole 92 Hz" is Stinchcombe's example).
- Cannot: the actual transistors' Is, beta and matching in a given unit; aged electrolytics; the factory trim of a
  given unit; custom chips without published internals (IR3109, BBDs beyond their filters, CEM/SSM parts — macromodels
  only); mechanical and layout effects (pot tapers as built, ground bounce, crosstalk, power-supply ripple and its
  modulation); what the musician remembers. So a SPICE match is necessary, not sufficient.
- **Keeping priors honest**: add a basis value `'sim'` (from our own simulation of the schematic) alongside
  `manual | paper | source | prior`, with the deck name in the label. A value fitted to a simulation stays `'sim'`; a
  value matched by ear stays `'prior'`; nothing moves to `'source'` or `'manual'` unless a document says it. Report a
  residual for every fitted value. Where sources disagree (the Juno's chorus II rate), keep both and say which is used.

### 6.4 Ranked upgrades (audible value per unit of work)

1. **Juno: oversample the voice (2x, or 4x with the existing decimator) and/or ADAA on the loop-input tanh.**
   Replaces: the 1x DCO plus TPT ladder in `JunoProcessor` (REPORT: "the filter is not oversampled"). Work: small (the
   4x loop and `Elliptic` already exist in the file). Value: removes aliasing on high notes, bright PWM and high
   resonance across six voices. Cost: about 2-4x the voice loop; measure on a realtime context first.
2. **Juno chorus as a BBD model** (Holters-Parker filters with the Juno-60 roots, clocked delay, charge-loss low-pass,
   clock feedthrough and hiss with a tuned level). Replaces: the ideal linear-interpolated delay and the two one-poles.
   Work: medium; a GPL-3.0 port path exists (chowdsp_utils, READ) or a re-derivation from DAFx-18. Value: high — the
   designer's "Just make sure you get the chorus right" (READ). Bench: the filters' responses against the paper's roots,
   the delay sweep against Juno60's measured 1.66-5.35 ms, noise level marked prior (Roland tuned theirs by ear, READ).
3. **303: a nonlinear diode-ladder ZDF solved by Newton, with its coupling capacitors and buffer**, derived from the
   schematic and checked against an ngspice reference. Replaces: Open303's polynomial-fitted linear ladder, the prior
   feedback soft clip and probably `kMax` (the stock maximum then falls out of the circuit, or stays a bracketed trimmer).
   Work: medium-high (derivation, SPICE deck, solver, bench). Value: high on the instrument the owner focused on — level-
   dependent growl, resonance that saturates rather than clips, the accent behaviour through a nonlinear core. CPU: about
   10-15x the present filter, 4.5-5.8 % of a server core per voice in plain JS (RAN); one voice, so affordable. Offer an
   accuracy switch, live versus render, as Diva does (READ).
4. **Per-voice variance and drift, seeded.** Replaces: identical Juno voices (fixed phases only) and the 303's perfect
   tuning; makes the Model D's drift priors trimmer-shaped. Work: small. Value: subtle but always present (Arturia's and
   Roland's texts both stress instability and unit differences, READ). Tolerances per 3.9; seed in the patch.
5. **Model D: ZDF form of the ladder (remove the one-sample loop delay and the two tuning patches), the input-pair
   overdrive as part of the solve, and analog oscillator shapes** (capacitor-charge curvature, reset time, per-period
   jitter, after CA-72's measurements where they exist). Replaces: ImprovedMoog's delayed feedback with `tuneFix` and
   `tuneGain`, the ideal BLEP shapes. Work: medium. Value: medium; the passband error noted in REPORT section 5 (2.5 dB
   under the reference near the corner) is the bench target.
6. **ADAA on the remaining memoryless stages** (output soft clips, the drive stages). Work: small. Value: small at 4x.
7. **808/909 voices from plain nodes to worklet circuit models**, starting with the 808 bass drum (Werner's model, the
   paper already cited, ChowKick as a BSD reference) and the 909 bass drum, using WDF or DK. Replaces: oscillator, biquad
   and waveshaper graphs in `drums.js`. Work: high (a new processor, 27 voices' planning, the drum score's 19 failing rows
   as a bench). Value: medium; the drums score already measures them, and node graphs cannot do the 808's bridged-T
   ringing with its trigger interaction exactly.
8. **Neural or grey-box modelling**: last, and only once a dry recording of a unit with written knob positions exists
   (REPORT section 6, decision 2). Even then, fit the white-box model's parameters first.
- WASM is not required for 1-6. It becomes worth it for 3 or 5 if a phone cannot carry them, and for the Juno if item 1
  plus a nonlinear IR3109 solve per voice is attempted.

### 6.5 What "closer to Arturia's methods" can honestly mean

- Arturia has published (READ) properties, not methods: free-running oscillators; aliasing-free oscillators including
  PWM, FM and sync; capacitor-discharge curvature in the waveforms; period-to-period instability; "direct filter circuit
  modeling" of "individual hardware components" with self-oscillation harmonics compared against a real unit; current-
  limited resonance and output soft clipping; and listening against the instrument. They have not published solvers,
  sample rates, oversampling factors, a paper, a patent, or what changed between versions.
- So "closer to Arturia" here means **adopting the same goals with published methods**: circuit-derived models with the
  nonlinearities inside the loops (ZDF/Newton or WDF/DK), antialiasing by BLEP-family oscillators plus oversampling and
  ADAA, the circuit's own waveform imperfections and instability with seeded variance, and **comparison against a
  reference** — which for us is SPICE of the schematic plus the published measurements of real units (CA-72 for the
  Model D, Juno60 for the Juno), because we have no unit to "sit next to". Our engine already has three of Arturia's
  properties (free-running oscillators, PolyBLEP antialiasing, Model D drift) and one circuit-level solve (the 303
  accent network). The gap is the filters' nonlinear cores, the Juno chorus, and waveform shapes.
- It cannot mean matching Arturia's output: their model is not a reference for the hardware, and fitting to their
  plug-in's audio would copy their choices (and see 6.6).

### 6.6 Risks and staging

- **CPU on a phone.** A render quantum is 128 frames (2.67 ms at 48 kHz). The RAN figures are for a 2.1 GHz Xeon; a
  phone core is perhaps 2-5x slower (MEMORY), and the worklet shares the audio thread with every other processor. So:
  measure each step on a realtime context (no underrun measurement exists yet, REPORT section 5), give the costly
  models an accuracy setting (live versus offline, after Diva's "OfflineAcc"), keep the present models as the
  "draft" tier rather than deleting them, and let `Sequencer.render` use the top tier.
- **WASM in a repo with no build step.** Use clang alone (RAN), commit the source and an embedded artifact with a
  rebuild check, keep the JS path as fallback; adopt it for one processor only after a measured need.
- **Licence traps.** GPL-3.0 code (chowdsp_utils BBD and waveshapers) is fine with AGPL-3.0-or-later with a THIRD_PARTY
  row; LGPL-3.0 (Huovilainen) is also usable under GPL-3.0 terms (MEMORY); avoid the MusicDSP "Suggested CC-BY-SA" ladder
  and Pirkle's "Custom" licence (READ in MoogLadders) unless the terms are read; Faust's wdmodels functions carry
  "LicenseRef-STK-4.3" (READ; MEMORY: a permissive licence) and the faustwasm package's licence file was not found
  (404); the Cytomic papers are public domain (READ). Never decompile or record commercial plug-ins as targets (EULA
  terms, MEMORY), and never use CC BY-NC material outside non-commercial use (CLAUDE.md).
- **Staging, each step verified:** (1) ngspice decks plus reference JSON for the 303 filter and the Juno chorus filters,
  checked against hand-calculated corners (as the RC test above); (2) block-input test hooks in the benches and the
  comparison against those tables, run on the present models first to record today's error; (3) Juno oversampling, bench
  and realtime CPU measured; (4) Juno BBD, bench; (5) 303 nonlinear ladder behind an accuracy switch, bench, demos;
  (6) variance and drift; (7) Model D ZDF and shapes; (8) drums. Every step leaves the module checks passing and the
  priors listed with their basis.

## 7. Recommendation (ranked)

1. Juno oversampling or ADAA in the voice loop. 2. Juno BBD chorus (Holters-Parker). 3. 303 nonlinear diode-ladder ZDF
with Newton, against an ngspice reference, with a live/render accuracy switch. 4. Seeded per-voice variance and drift.
5. Model D ZDF ladder with the overdrive in the solve and analog oscillator shapes. 6. ADAA on memoryless clips.
7. 808/909 circuit models in a worklet. 8. Neural or grey-box only with a recorded unit. Tooling: ngspice (installed
here, RAN) and SymPy for derivation, hand-port to JS; clang-only WASM held in reserve.

## 8. What I could not find or did not reach

- Any Arturia technical paper, patent, thesis or engineer interview on TAE; any TAE version history; the Mini V,
  Jup-8 V and Jun-6 V descriptions (not fetched); Acid V's method beyond its feature list.
- Any Roland paper or patent on ACB, or any detail of its solver; the date of the Boutique interview page.
- Native Instruments, Cherry Audio and D16 statements; anything first-hand from Softube or TAL (SNIPPET only).
- The content of Cytomic's ADC 2020 "From Circuit To Code" slides; Zavalishin's book page; every paper PDF in Part B
  (titles come from library READMEs or memory).
- Which synth or drum circuits MAME's netlist library contains; the licence file of grame-cncm/faustwasm; the faustlibraries
  top-level licence file (404 at the paths tried).
- Phone CPU figures for any of these models, and whether synchronous WASM compilation is limited inside an
  AudioWorkletGlobalScope in Chromium or Electron.
