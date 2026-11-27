# Patch Crew discussion (a 303, a Moog, a poly synth and hardware-style panels)

Compiled 2026-11-11 by the scribe from `BRIEF.md` and the six files in `transcripts/`: `P1-303.md`, `P2-modeld.md`, `P3-juno.md`, `log-P4.md`, `log-P5.md` and `log-coordinator.md`. The coordinator's last entry is 13:54 EST (18:54 UTC), the verification of P4's third task. `log-P5.md` and `log-P4.md` carry dates but no clock times, so threads are ordered by the coordinator's stamps where it has them and otherwise by the order of the sections in the logs. A `REPORT.md` sits in the same folder; the scribe did not use it.

The agents did not talk to each other directly. P1, P2 and P3 each wrote one research transcript; P4 and P5 wrote build logs and read the three transcripts; the coordinator relayed requests and ruled in `log-coordinator.md`. Nothing here is a new exchange. Each statement is attributed to the agent and the file and section it came from. Where the files do not say, this file says "not in any record".

How to read the citations: `P2-modeld.md, 14.2` means that file and section; `coordinator, 13:12 EST` means the entry with that stamp in `log-coordinator.md`. Quoted text is copied from the record; paraphrase has no quote marks. A line headed "Scribe's note" is the scribe's own observation from comparing two records, not something an agent said. The records' evidence tags are kept: P1 and P2 use SEEN-CODE, SEEN-PAGE, SEEN-SNIPPET, MY-PORT (a result from the agent's own port, not a hardware measurement), MEM or PRIOR (memory, unverified), and the spec basis words manual, paper, source, prior.

Times. The coordinator's entries carry Eastern Time with UTC in parentheses. On 2026-11-11 Eastern Time is EST (UTC minus 5). P4 and P5 write "Times ET".

## The group

**What it is.** The Patch Crew is a Roundtable group of the Soundsystem, opened on 2026-11-11 by the coordinator. The owner's words (`BRIEF.md`; coordinator, 09:17 EST): "Let's continue and start with adding a 303 and a Moog and afterwards a poly synth. I want the plugins to have a floating window with designs modelled after the synths and drum boxes, like Arturia and Roland Cloud." Four things are built: `tb303`, `modeld`, `juno` and the hardware-style windows ("panels").

**The roster** (from `BRIEF.md`).

| Id | Model | Task | File |
|----|-------|------|------|
| P1 | Sonnet | TB-303 research and build spec | `P1-303.md` |
| P2 | Sonnet | Minimoog Model D research and build spec | `P2-modeld.md` |
| P3 | Sonnet | Juno-106/60 research and build spec | `P3-juno.md` |
| P4 | Opus | The panel system and the panels | `log-P4.md` |
| P5 | Opus | The engine: worklets, `classics.js`, the three synths | `log-P5.md` |
| Coordinator | Fable | Brief, rulings, verification, commits | `log-coordinator.md` |

The coordinator's log also names A12 (drum fitting), A9 (scorer), A15 (README) and L2 (analysis module); they are outside this crew's subject and appear only where an edit touched this crew's work.

**The limit stops.** The coordinator's log records four stops by the account's session limit. Concurrency was held to four agents after three stops (09:17 EST); eight agents were then dispatched in parallel, and "All eight agents were stopped by the account's 5-hour limit within minutes of the parallel dispatch (reset 12:40 PM ET / 17:40 UTC)"; six were resumed at 12:54 EST. P4's log says it resumed "after the limit reset"; P2 says its second pass was "after the limit reset".

**Thread count.** 25 threads: spec and names, threads 1 to 3; the 303, threads 4 to 7; the Model D, threads 8 and 9; sources and licences, thread 10; engine design, threads 11 to 13; the Juno, threads 14 to 16; the panels, threads 17 to 22; hosts and sources, thread 23; verification and listening, threads 24 and 25. Then "Open at the time of compiling".

---

## Spec and names

### Thread 1. The frozen parameter names and how they were amended

**Source:** `BRIEF.md`, "Parameter names"; `P1-303.md`, 9; `P2-modeld.md`, 12 and 14.9; `P3-juno.md`, 9; coordinator, 12:57, 12:59 and 13:12 EST; `log-P5.md`, 8.

**The brief froze the names** so P4 and P5 could work in parallel, and said: "A researcher who finds a name here wrong or missing says so in the hand-back; the coordinator amends this list and tells P4 and P5."

**tb303.** P1 found no name wrong. It noted `slideTime` is not a hardware knob ("keep it in the spec so the panel can leave it off the hardware face"), that `decay` should be documented as a time constant in ms and not as time to one tenth, and that no name is needed for the accent build-up. Coordinator, 12:59 EST: "frozen names stand; `decay` is a time constant."

**modeld.** P2's first pass (12) asked for `modAmount` (the mod wheel's depth) and noted that the frozen names have no `bend`, no separate external input and no per-contour decay switch; the second pass (14.9) kept `modAmount`, said `bend` "is not needed (the engine has no wheel)", and withdrew the worry about `keyTrack1`/`keyTrack2` (both on gives about 0.97 of full tracking). Coordinator, 13:12 EST: add `modAmount`; cutoff, emphasis, contour, glide, the contour times and the mixer levels are in panel marks (-5..+5 and 0..10); range and wave values are strings; one `decaySwitch` for both contours; `mixFeedback` is the external-input row.

**juno.** P3 asked to add `tune`, `bend`, `portamento`, `voiceMode`, `lfoAuto` and optional `chorusNoise`; to make `envAmt` bipolar; and to give `pwmMode` an 'env' value. Coordinator, 12:57 EST: "amended as P3 proposes". P3's table gave `voiceMode` the values 'poly1' | 'poly2' | 'unison'; the amended BRIEF reads 'poly' | 'unison'. P5 (8): "`voiceMode` is 'poly' | 'unison' per the brief (P3's poly1 / poly2 are not separate)." No record shows a ruling on dropping poly2.

**Built.** P5 and P4 both report the names unchanged: P5 for the juno ("Every name matches; none was renamed"), P4 by the both-directions check in `panels-check` (thread 19).

---

### Thread 2. P2's second pass against its first

**Source:** `P2-modeld.md`, 0 and 14.

P2 wrote sections 1 to 13 without any manual or schematic ("every panel and contour number below is PRIOR or SEEN-SNIPPET"), then, after the coordinator confirmed that github.com clones work, read `idlefoundry/ca-72`. Section 14 "supersedes sections 2 to 11 where they differ". The corrections it names:

| Item | First pass | Second pass (source) |
|------|-----------|----------------------|
| Pulse duty | 50, 33, 20 % (prior) | 0.50 / 0.30 / 0.18 (CA-72 `light.rs`; the factory set reads 0.484, 0.304, 0.189) |
| Osc 2 and 3 tune | about plus or minus 7 semitones | plus or minus 8.35 semitones (16.7 st travel) |
| Emphasis | k = 4 x emphasis | piecewise k table, oscillation onset near panel 8 |
| Keyboard tracking | "two switches add to 2/3" | 1/3, 2/3, both about 0.97; pivot MIDI 36 |
| Glide | RC exponential, 0 to 2 s | constant rate in octaves per second, measured at four panel positions |
| Release, decay switch off | about 4 ms | about 10 ms (-6 to -40 dB in 9.5 to 9.9 ms) |
| Longest decay | 35 s (reissue sheet snippet) | about 6 s (90 to 50 %), a different unit |
| Bass makeup | add a quarter of the loss | remove it by default: the loss is in the original |
| Mixer taper | v^1.5 | measured dB points: -2.10, -5.19, -9.42, -16.51 at panel 8, 6, 4, 2 |

**The caveats P2 attaches.** The CA-72's calibration target "is a hardware reference 'that matches the Model D almost exactly' by the owner's ear, a modern recreation, not a 1970s unit". P2 still had not read the Moog service manual ("the CA-72 docs are secondary to the service manual, which I still have not read myself"). The contour-amount octave figure (about 9.7 octaves at amount 10) and the k table are marked "derived": P2's arithmetic on the CA-72 numbers. Sustain has one data point (panel 5 gives 0.35) and `level = v^1.5` is a fit to it.

**How the coordinator summarised it** (13:12 EST): the CA-72's docs quote "the Moog service manual and laws measured on hardware". The coordinator's entry does not repeat P2's modern-recreation caveat. Scribe's note: both statements are in the records; the basis word `source` on those spec rows means "a statement in a cloned repo's docs", as P2 defines it in 14.7.

---

### Thread 3. Model D knob units: panel marks, and where the records disagree

**Source:** `P2-modeld.md`, 14.7 and 14.9; coordinator, 13:12 EST; `log-P4.md`, Task 2; `log-P5.md`, 4.

**P2 said** (14.9): cutoff, emphasis, contour, the six contour names and glide "carry panel-mark units (-5..+5 and 0..10) rather than 0..1, because the laws above are published per mark; if the coordinator wants 0..1 on the wire the engine can map v to marks (v*10)". **Ruled** (13:12 EST): marks, as listed in thread 1.

**P4 said** (Task 2): "Cutoff and tune print -5..+5, the others 0..10, as 14.6/14.7 say." The HVT-D dial sweep is 300 degrees "per 14.6".

**Where the records differ.**
- P2 14.6 says only the CUTOFF is printed -5 to +5. P2's 14.7 closing paragraph says "the 'tune, glide, mix' knobs 0 to 10". P2's `tune` row is -100 to 100 cents. So P4's "tune prints -5..+5" has no sentence behind it in P2's file.
- P2's 14.7 table gives the `mixOsc1`, `mixOsc2`, `mixOsc3` and `mixNoise` rows a range of 0 to 1 ("panel = 10 * v"), while the coordinator's amendment lists the mixer levels among the panel-mark rows. Which range `Classics.spec('modeld')` carries is not stated in P5's log, which says only "rows as in `Classics.spec('modeld')`; mapping in `classics.js` LAW/MAP". Not reconciled.
- P2 14.5 says the printed dial numbers (0.1: 10 ms; 0.2: 200 ms; 0.4: 600 ms; 0.6: 1 s; 0.7: 5 s; 0.85: 10 s) "are rough labels" and the measured laws should be fitted. P5 (4) scaled "the dial labels below the 1 s mark ... by the measured ratio (prior)".

**P4's note on the 303** (Task 2): "the 303's knob numbers are position marks (0..10), not engine units". Status: marks are settled; the two points above are open in the records.

---

## The TB-303

### Thread 4. The accent sweep: what is measured and what is guessed

**Source:** `P1-303.md`, 3.3 and 7; coordinator, 12:59 EST; `log-P5.md`, 4, 5 and 6.

**P1 said** what Open303 models: `rc2`, a leaky integrator with tau 15 ms, adds up to one octave to the cutoff on an accented note and follows the 200 ms accent decay (SEEN-CODE, `rosic_Open303.cpp:56`, `rosic_Open303.h:372`). Accent also adds `accentGain * 4 * mainEnv` to the VCA. P1 then says what it does not model: "the accent sweep circuit of the hardware charges a capacitor on each accented note, so the sweep builds when accented notes follow each other quickly and its size depends on the resonance setting (Whittle's analysis; MEM, UNVERIFIED, host not reachable)". a1k0n's README says "no accent simulation at all". P1 proposed a state variable as a design extension, "Every number in that extension would be a prior", off by default.

**Ruled** (coordinator, 12:59 EST): "The accent build-up and its resonance dependence are built as an internal extension marked basis 'prior' until a primary source is read." The coordinator proposed allowing the two hosts that hold the primary analyses (thread 23).

**P5 built** (4): the sweep RC is Open303's rc2, 15 ms at resonance 0, rising to 100 ms at resonance 1, "the build-up across consecutive accents; coordinator ruling: internal extension, prior". P5's log does not mention an off switch.

**P5 measured** (5): accent knob 0.6 gives +8.0 dB peak and +7.8 dB RMS; knob 0 gives -0.3 dB, knob 1 gives +11.0 dB. Spectral-centroid peak over six consecutive accents (cutoff 500, envMod 0.3, accent 1): at resonance 0.2, 479 567 564 556 555 563 Hz (settles at once); at resonance 0.95, 557 720 778 764 767 777 Hz (builds over three accents).

**What this shows and does not show.** The build-up appears in the render because P5 put it there. P5 (6): "The 303 accent-sweep time constants (15 to 100 ms) and the feedback soft clip are priors ... no hardware recording compared." Status: built, prior, open.

---

### Thread 5. Slide timing, the meaning of `ev.slide`, and gate length

**Source:** `P1-303.md`, 3.4 and 9; `P3-juno.md`, 6; `P2-modeld.md`, 10; coordinator, 09:17 and 12:59 EST; `log-P5.md`, 1, 5 and 8.

**Timing.** P1: Open303's `pitchSlewLimiter` has tau = 0.2 x slideTime, with slideTime defaulting to 60 ms, so 12 ms; 90 % of the way in about 28 ms, 99 % in about 55 ms. The source comment calls the 0.2 a "todo: tweak the scaling constant". "The nominal hardware figure is not confirmed": the only number P1 saw was a snippet saying "slide times can reach about one second", which P1 calls irrelevant to this unit; "MEM, UNVERIFIED: the 303's slide is around 60 ms". The default is marked prior as the hardware's figure. P5 measured a 36 to 48 slide at slideTime 60 ms: 90 % of the distance about 20 to 25 ms after the note (tau 12 ms predicts 27.6 ms, 10 ms analysis window), RMS across the joint 0.99, "no gap, no retrigger".

**Meaning of the flag.** The coordinator added `slide` to step cells on 09:17 EST (`cell.slide` reaches instruments as `ev.slide`). P1 (9) asked for a ruling: on the 303 a slide flag on step n glides into step n+1 and holds the gate; "an alternative reading, 'slide into this note', would be a one-step shift". **Ruled** (12:59 EST): "a step flagged slide holds its gate into the next step and the next note glides from it without retriggering the envelopes; the instrument holds the gate until the next trigger arrives, with a safety release if none comes within two steps."

**Three synths, three uses.** tb303: as ruled. Model D (P5 1): `ev.slide` forces legato into the next note; P2 (10) had said a slide or a gate overlap acts as legato. Juno (P3 6): "Map `ev.slide` to portamento on for that note"; P5 (8): a note after an `ev.slide` reuses the voice and glides, "tau at least 60 ms, prior".

**Gate length.** Open303 releases a non-slide note after the full step; P1: the hardware gate is shorter ("MEM, UNVERIFIED, roughly 50 to 60 %") and the choice belongs to whoever sets `dur`. P5 gates a note for half a step, "the step length learned from ev.step and the trigger times, first guess from ev.dur". The records do not show how half a step was chosen beyond P1's remembered 50 to 60 %.

---

### Thread 6. Open303 against a1k0n: cutoff sweep and decay

**Source:** `P1-303.md`, 3.1.

P1 had two sets of numbers and chose one. For the cutoff sweep, Open303 (MIT) gives a fit with floor and peak (knob 1000 Hz: Env Mod 0 sweeps 1463 down to 835 Hz; 50 gives 3758 to 533; 100 gives 9650 to 341). a1k0n's fit, from "measuring the voltage across R69 on my x0xb0x", gives for cutoff 0.5 and envmod 0.5 a floor of about 435 Hz and a peak of about 1685 Hz. P1: "the two fits disagree on the sweep depth by a factor of two or more at the middle (they use different cutoff knob definitions). A9 cannot settle that without a reference recording; use Open303's numbers ... and keep a1k0n's as a sanity band."

For decay, a1k0n's knob gives 0.1 to 1.1 s to fall to one tenth (tau 43 to 478 ms); Open303's tau is 200 to 2000 ms (0.46 to 4.6 s to one tenth). P1 says the definitions differ (a1k0n's is the decay of the current, Open303's is the decay of an internal exponent), "so not a contradiction, but the audible result differs: expect Open303's envelope to feel long at the top of the knob". P1 recalls 200 ms to 2 s as the owner's-manual range (MEM, UNVERIFIED).

**Settled by:** P1 followed Open303 and a1k0n was not ported (no licence, thread 10). P5's filter-decay proxy (log-centroid excess falls to 1/e): decay 200 / 400 / 2000 ms gives 120 / 240 / 1030 ms; P5 calls it "a proxy; the centroid saturates at the long end". Open: no hardware comparison.

---

### Thread 7. The diode ladder against the ported filter

**Source:** `P1-303.md`, 2.2, 6 and 7; `log-P5.md`, 4 and 5.

**P1 said.** The 303 ladder has four coupled stages with the first coefficient doubled (`rosic_TeeBeeFilter.h:284-296`), a 150 Hz highpass in the feedback path, and resonance feedback k of about 17 at low cutoff. It does not self-oscillate (Wikipedia infobox). The nominal slope is 24 dB/oct, but P1's own Node port reads about 14, then 19, then 22 dB per octave approaching 24, so "'18 dB/oct' in forum lore is the effective slope near and just above the cutoff". The port predicts, at resonance 100 %, a peak of +5.1 dB at about 1025 Hz for a 1 kHz cutoff and +14.1 dB at 3 kHz (MY-PORT, "a model result"). The Open303 coefficients are fitted for 4x the base rate.

**P5 built** it from Open303 (MIT, notice in the processor header) at 4x oversampling with the elliptic decimator. Departures, all marked prior: a soft clip `fb / (1 + 0.15 |fb|)` in the feedback path; PolyBLEP oscillators at the 4x rate instead of mip-mapped tables; Open303's 7.5 Hz notch not built; `outGain` as calibration. The de-click filter's gain follows P1's warning (the Open303 gain line "looks like a bug"): gain 1.

**P5 measured** (5), note 24, envMod 0, after the envelope decayed: peak at 262 / 491 / 719 / 1374 Hz for knob 314 / 600 / 1000 / 2000 Hz at resonance 0.5, and 294 / 523 / 818 / 1472 Hz at 0.95, "1.6 to 7.3 dB over the harmonic at half that frequency". The fundamental falls 8.9 dB from resonance 0 to 0.5 and 9.4 dB to 1. At resonance 1 the voice is silent 0.5 s after release (rms 0): "it does not self-oscillate."

**The two numbers are not the same measure.** P1's +5.1 dB is the filter's gain at the peak for a unit sine in; P5's 1.6 to 7.3 dB is the peak over a harmonic half its frequency in a rendered note. P5 (6): "the 303 resonance peak is modest ... as Open303's model gives". Status: consistent in kind, not compared like for like; no hardware recording compared.

---

## The Model D

### Thread 8. The ladder model chosen and its passband deficit

**Source:** `P2-modeld.md`, 4a to 4d, 14.2 and 14.8; `log-P5.md`, 4, 5 and 6.

**P2 recommended** (4d) D'Angelo and Välimäki's "Improved" model (ISC, notice kept), 2x oversampled, "4x for emphasis near the top and cutoff above 4 kHz", with the filter input's tanh doing the mixer overdrive. Reasons: circuit-derived, validated against a circuit simulation in the paper, short, and permissively licensed. Known weakness: the one-sample feedback delay gives a tuning error near Nyquist. Zavalishin's TPT ladder was the second candidate, with equations marked PRIOR, "not read this session". Huovilainen was set aside for a licence conflict (thread 10). In the second pass P2 removed the quarter-loss makeup and the separate mixer clipper (14.2).

**P5 built** the Improved ladder with: tuning correction `fc / (1 - 5.1 fc / fo)` and x 1.025 (measured); `kCal` 1.025 (mark 8 = k 4.1, "the reliable onset of this ladder"); drive 0.6 into the first stage's tanh; a thermal seed of 1e-6 so it sings with no source; no passband makeup ("the bass loss is the instrument's"). P5's CPU line reads "4x oversampling" for the pair of monos; P2 had recommended 2x as the default.

**P5 measured against P2's CA-72 reference** (5):

| Test | P5 measured | CA-72 reference (P2 14.2) |
|------|-------------|---------------------------|
| White noise, re passband at 0.5 / 0.7 / 1 / 1.4 / 2 / 2.8 / 4 x the corner | -2.1 -2.9 -5.5 -9.8 -15.9 -23.6 -33.3 dB | -0.6 -1.2 -3.0 -6.7 -13.1 -21.0 -30.8 dB |
| Slope 2x to 4x | -17.4 dB/oct | -17.8 |
| Slope 6x to 12x, 6x to 20x | -23.8, -24.6 dB/oct | P2 asked for 22 to 25 |
| Passband loss at emphasis 2.5 / 5 / 7.5 | -2.33 / -9.68 / -14.38 dB | -2.25 / -9.53 / -12.50 dB |
| Singing pitch, cutoff marks -3..+2 | 110.4 206.7 472.1 1074.1 2338.3 5034.8 Hz | 110.8 206.6 472.2 1073.8 2344 5188 Hz |

**The deficit.** P5: "about 2.5 dB lower, because the tuning is set to match the singing pitch"; passband loss at emphasis 7.5 is "1.9 dB more than the reference"; at cutoff +2 the singing pitch is 3 % flat (-3.0 % in the table). Emphasis 7 and 7.5 stay silent, 8 and 8.5 sing; P2 14.8 says "emphasis 7 must not sing". P5 chose pitch over magnitude near the corner and recorded the cost. Open: no one has judged by ear whether either matters.

---

### Thread 9. Note priority: hardware low-note against last-note as built

**Source:** `P2-modeld.md`, 2, 5, 10 and 14.5; `log-P5.md`, 1 and 4.

**P2 said** the hardware is low-note priority: Wikipedia (SEEN-PAGE) says "low-note priority", the first pass built the DSP list on "lowest held, low-note priority", and CA-72 (14.5) gives "lowest-key priority by default", with contours that do not retrigger while any key is held.

**P5 said** (1): "Priority: the brief says last-note; P2 (Wikipedia, SEEN-PAGE) says the original is low-note priority. Built as last-note (brief); see section 5." In 4: "Note priority: last-note with return to a still-held note (brief and ruling); the hardware is LOW-note priority (P2, Wikipedia and CA-72). Glide acts only between held notes (overlap or ev.slide), per CA-72; a step sequence without ties or slides therefore never glides."

**The records disagree about the instruction.** `BRIEF.md` as compiled has no sentence on note priority, and neither does `log-coordinator.md` nor `log-P4.md`; a search of those three files for "last-note" and "priority" finds nothing. P5 cites both "the brief" and a "ruling". Section 5 of `log-P5.md` (checks) does not discuss priority; the discussion is in section 4. Not reconciled: the scribe cannot tell whether the instruction was given in the dispatch text outside these files.

**What the checks cover.** classics-check has rows for "last-note priority with return" (5). The 8 ms trigger delay is "Not built (P2: option, default 0)", matching P2 14.8.

---

## Sources and licences

### Thread 10. What may be ported under which licence

**Source:** `BRIEF.md`, ground rules; `P1-303.md`, 1; `P2-modeld.md`, 4b and 14.1; `P3-juno.md`, 7 and 12; coordinator, 12:57, 12:59 and 13:12 EST; `log-P5.md`, 2, 3 and 8.

The brief: code may be ported from GPL-3.0, AGPL-3.0 or MIT projects with attribution in `THIRD_PARTY.md` ("the repo is AGPL-3.0-or-later"); "quote each licence line you rely on".

| Source | Licence as read | Outcome |
|--------|-----------------|---------|
| Open303 (Robin Schmidt) | MIT, `License.txt` ("Copyright (c) 2009 Robin Schmidt") | Ported to JS; notice in the processor header (P5 2) |
| ddiakopoulos/MoogLadders `ImprovedModel.h` | ISC, "Copyright 2012 Stefano D'Angelo" | Ported; notice kept |
| MoogLadders Huovilainen | README says LGPLv3; the header says "Based on implementation in CSound5 (LGPLv2.1)" | P2: the two disagree; reimplement from the paper's equations instead. Not used |
| Stilson, Microtracker, Krajeski | Unlicense (Krajeski and Stilson with quoted emails) | Not used; Krajeski noted as a cheap fallback |
| idlefoundry/ca-72 | GPL-3.0-or-later (LICENSE and README) | Data only; P2: "The code is a SPICE-derived Newton solver in Rust, too heavy to port". P5 did not read the repository itself |
| pendragon-andyh/junox | GPL-3.0-or-later (`package.json`, `LICENSE.md`) | Numbers only, cited by file and line; no code (see below) |
| pendragon-andyh/Juno60 | MIT | Measured tables used; the WAVs not copied |
| JC303 | GPLv3 around an MIT Open303 core | Nothing needed |
| a1k0n/303, Faug, minimoog.js, 106.js | No licence file found | Not used; a1k0n's measured constants kept as a cross-check only |
| KR-106, Youth106 | GPL v3 | Reference only; header "or later" not checked |
| dzannotti/junox | GPL-3.0 (`package.json` "GPL") | Different, unrelated project with the same name; not used |
| MusicDSP in MoogLadders | "Suggested CC-BY-SA" | P2: avoid |

**Where the records differ.** P3 (12) recommended taking from Junox "the PolyBLEP DCO functions (`dco.js` lines 91 to 103), the chorus structure and constants (`chorus.js`), and the mix compression rule", with attribution. P5 (8) built "Nothing from Junox is ported as code. Its numbers are used, cited by file and line through P3", and still gives Junox a `THIRD_PARTY.md` row (coordinator, 13:51 EST). P3 and P5 agree the Junox architecture does not fit. Scribe's note: P2's first pass called Junox's licence "unseen"; P3 read it. P1's report at 12:59 EST: a1k0n's code is not licensed and so not ported.

**Trademark.** P2 14 notes that CA-72's README has a "Trademarks" section, not read in full: "treat names as identification only".

---

## Engine design

### Thread 11. Worklet against plain nodes, and the fallback

**Source:** `BRIEF.md`, ground rules; `P2-modeld.md`, 4d; `log-P5.md`, 1, 3, 5, 6 and 8; coordinator, 13:34 EST.

The brief left the architecture to P5: "an AudioWorklet filter or whole-voice worklets driven by AudioParam automation so offline renders stay deterministic, with a plain-node fallback for the Node checks' fake context".

**P5 chose** one persistent `AudioWorkletNode` per instrument running the whole voice, with notes as AudioParam automation (`pitch`, `gate`, `trig`, `acc`, `vel`, `slide`) and no sound-shaping messages. It gives four reasons against a hybrid graph: determinism (thread 12); couplings a node graph cannot express (the accent sweep, slide without retrigger, the Model D's overdriven mixer, osc 3 as a free modulation source, `mixFeedback`); a mono synth is naturally one persistent voice; one shared infrastructure for three synths. Costs accepted: a param per knob, explicit writes for parameter locks, and "the fallback is a separate, approximate implementation".

**Fallback.** P2 had proposed four cascaded lowpass biquads at Q 0.5 plus a peaking biquad. P5's fallback uses "two cascaded lowpass biquads for the 24 dB slope (resonance mapped to the second biquad's Q)", and the same event planner feeds both paths. It is "not measured beyond the Node check" (8); the juno fallback is mono, no chorus.

**Loading.** `Worklets.load(ctx)` is awaited by `Host.start` and `Sequencer.render`; an instrument built before the load resolves keeps the fallback for its lifetime. Coordinator, 13:34 EST: `Worklets.load` true and ready on an OfflineAudioContext; both monos report engine 'worklet' after Start.

**Cost** (5 and 8): Node, processors alone, tb303 about 30 ms and modeld about 85 ms per second of audio, juno four held voices about 52 ms. The 200-bar song through `Host.render` in Chromium (383.6 s of audio): stock 95.1 s; with a tb303 and a modeld track playing in every section 134.2 s. **Not verified:** the live path was checked for engine selection after `host.start` only, "no underrun measurement on a realtime context"; Electron not run (thread 20); a full 200-bar render with juno tracks not timed.

---

### Thread 12. Determinism of renders

**Source:** `log-P5.md`, 1 and 5; coordinator, 13:44 EST.

**P5's claim** (1): AudioParam automation lands on exact frames in an OfflineAudioContext, and noise comes from "a seeded LCG, reset per node, never Math.random".

**P5 measured** (5): two renders of the same 16-step pattern (slides, accents; Model D with noise, free osc 3 and filter mod), 0 differing samples of 101430, both types. Through `Host.render` with only a tb303 and a modeld track, 0 of 450660. Juno (8): stereo renders with stealing, LFO, PWM, sub, noise and chorus I, 0 of 176400 frames. Also seeded: the Model D's static oscillator offsets and drift walk, and the juno's optional chorus hiss.

**What did not repeat.** P5: "The stock Guidance song's own renders differ between runs (even with the stock bass soloed: 120881 samples), from its existing noise and reverb generators; not from the classics."

**Related, from L2's work** (coordinator, 13:44 EST): in `drums.js` every hit started the shared seeded noise buffer at offset 0, so eleven noise voices replayed identically, "which no real machine does and which reads as a sample to the analysis". The coordinator changed each hit to start at a different offset (hit count times 0.382 s, modulo 1.9 s), so "a render is still the same twice". Scribe's note: the coordinator did not repeat P5's determinism runs; thread 24.

---

### Thread 13. Default output levels found too hot, and fixed

**Source:** coordinator, 13:34 and 13:51 EST; `log-P5.md`, 7 and 8.

**Coordinator's finding** (13:34 EST): "At defaults the modeld bass line peaks at 1.42 and sits at RMS 0.42; the tb303 line with accents peaks at 1.30. Both exceed full scale before the channel strip; the drum voices peak 0.76 to 1.0." Asked: a default patch with accents at or under about 0.9.

**P5's fix** (7): the internal output gains, not the `level` rows: `T303.outGain` 0.5 to 0.3, `MD.outGain` 1 to 0.56. In Chromium at level 1: tb303 hot line (resonance 0.8, envMod 0.7, accent 0.7, six accents) 0.846; tb303 defaults with the same accents 0.753; modeld default eighth-note bass 0.846 (RMS 0.254). New classics-check rows fail above 0.9 or under 0.5.

**Coordinator's re-run** (13:51 EST): tb303 line 0.78 (was 1.30), modeld line 0.80 (was 1.42), juno four-note chords 0.66 with chorus off, 0.56 with chorus I, 0.47 with chorus II. P5's juno default patch (8): peak 0.57 left, 0.55 right. The two runs used different patterns, so 0.78 against 0.846 is not a disagreement.

**Demos.** P5 (5) first reported the demo WAVs at -19.8 LUFS (tb303) and -16.4 LUFS (modeld); after the change, re-rendered at -24.3 and -21.5 LUFS, with the juno demo at -20.1 LUFS. The Render Room version 7 demos were "each turned down 4 dB" by the coordinator; version 8 has them "re-rendered at the new levels with no extra attenuation".

---

## The Juno

### Thread 14. The 106 against the 60: conflicts resolved by recommendation, not measurement

**Source:** `P3-juno.md`, 0, 1 to 5 and 12; `log-P5.md`, 8; coordinator, 12:57 EST.

P3 read no Roland document ("Every 'service notes' figure is second-hand through Youth106 or the Juno60 repo") and measured nothing. The sources are two Juno-60 analyses (Junox code; the MIT Juno60 repository, measured on a real 60) and two 106 emulations (KR-106, built from disassembly of the voice CPU; Youth106).

| Item | Values in the sources | Built (P5) |
|------|-----------------------|------------|
| HPF position 0 | Juno60 repo: low shelf +6 dB below 65 Hz; KR-106: +10 dB below 150 Hz; Junox: none | +6 dB shelf under 65 Hz |
| HPF position 2 | 225 (Juno60 repo), 236 (Youth106), 240 Hz (KR-106); 60: 339; Junox code 520 | 225 Hz |
| HPF position 3 | 720 (Juno60 repo, KR-106), 754 (Youth106); Junox 1220 | 720 Hz |
| DCO LFO depth | 300 cents (Junox, "page 14" of the 60 manual per a code comment) against 400 (Youth106, 106 service notes) | resolved "as P3 recommends": 400 |
| Filter envelope range | 12 octaves (Junox) against 14 (service notes via Youth106) | 12 |
| Filter LFO range | 3 octaves (Junox) against 3.5 | 3.5 |
| Envelope attack | 106 firmware linear, slight overshoot (KR-106); 60 RC curve | 60 RC curve |
| DCO phase | Junox restarts at note-on; Youth106: counters free-run | free-running, fixed start phases |
| Tuning reference | Junox: "middle-A is 442" (60 service notes); 106 listed as 440 (prior) | `tune` in cents, reference 440 |

P3's HPF recommendation: trust the Juno60 repository's table over Junox's own constants (140/250/520/1220). P3 (12): what needs "a measurement against a 106 recording or the owner's sample material": the chorus depth, the HPF corners, the DCO LFO depth, the envelope shape and the filter ranges.

**Status.** P5 (8, Not verified): "106-versus-60 conflicts (chorus depth, HPF corners, 400 versus 300 ct vibrato, envelope 12 versus 14 oct, LFO 3.5 versus 3 oct) are resolved as P3 recommends, not measured." The coordinator asked the owner for "a Juno-106 service manual and a dry 106 recording (chorus off, I, II)" (12:57 EST). No answer is in the records.

---

### Thread 15. The Juno chorus

**Source:** `P3-juno.md`, 5; `log-P5.md`, 8; coordinator, 12:57 and 13:51 EST.

**P3's table of disagreement.** Juno60 repo, measured on a 60: I 0.513 Hz, II 0.863 Hz, I+II 9.75 Hz mono; delay 1.66 to 5.35 ms. Youth106, argued from the 106 jack board: 0.514 and 0.835 Hz at the same depth, no I+II. KR-106: 0.513 and 0.863 Hz with different depths, plus or minus 0.5 ms (I) and plus or minus 1.1 ms (II). Second-hand service notes: 0.5, 0.83, and "1 Hz" for I+II, "likely 10 Hz". The Juno-6 service notes: 0.4, 0.67, 8.06. P3's recommended constants: triangle LFO, 1.66 to 5.35 ms on both lines in antiphase, dry 0.44 to wet 0.56, mode II 0.863 Hz for the 60 and 0.835 Hz for the 106.

**The engine's existing chorus cannot do it** (P3; coordinator, 12:57 EST): equal sine LFOs with the right line at 1.5 times the left. The juno gets its own.

**P5 built** one triangle LFO at 0.513 or 0.863 Hz driving two lines swept 1.66 to 5.35 ms in antiphase, Junox pre and post low-passes (7237 and 10644 Hz), dry 0.44 and wet 0.56; I+II not built; the hiss option seeded. Scribe's note: P3's table gave 0.835 Hz for the 106's mode II; P5 reports 0.863 Hz and the records do not say why.

**Measured** (P5 8, held A3): left/right correlation 1.000 off, 0.347 for I, 0.354 for II; mono-sum pitch 220.01, 219.99, 220.00 Hz; mono-sum level re left 0, -2.1, -1.7 dB. Coordinator (13:51 EST): correlation 1.00, 0.32, 0.34; a held A1 reads 55.11 Hz with the default chorus on by "rough autocorrelation" against 54.96 and 55.04 on the monos with the same estimator; P5's figure is 0.3 cents on all six voices with a finer method, "not repeated here".

**Not modelled** (P5): "The chorus BBD's own low-pass and nonlinearity". Status: depth per mode open (three sources disagree), no recording.

---

### Thread 16. Bend, unison detune, voice allocation and filter oversampling

**Source:** `P3-juno.md`, 1, 6 and 9; `P2-modeld.md`, 12 and 14.4; `log-P5.md`, 8; `log-P4.md`, Task 3; coordinator, 13:51 EST.

**Bend.** P3 added a `bend` row (0 to 12 semitones, default 2) "for the Host's pitch bend, if added"; Junox's bender is plus or minus 700 cents on the 60, KR-106 and Youth106 make it adjustable. P5: "`bend` is stored but the engine has no bend input." P4 drew the control dimmed, `data-inactive`, with an SVG title "Bend range: stored with the song, but the engine does not use it yet"; it still writes the value. P2 had dropped `bend` for the Model D for the same reason. The coordinator lists it as open (13:51 EST).

**Unison detune.** P3 (6), citing Youth106: "Unison voices sit at fixed arbitrary phase offsets, not detuned." P5 (8): "Unison detune and per-voice component variance are not built"; unison puts all six voices on the note at 0.6 each ("prior: louder than one voice"); P5 measured one voice RMS 0.041, unison 0.058. KR-106 has no volume compensation in unison. The coordinator lists "unison has no detune" as open. Scribe's note: P3's source says the hardware does not detune, so whether this is a gap is not settled in the records.

**Allocation.** P3: Junox replaces `voices[0]`, "crude"; recommended the oldest released voice, then the oldest held. P5: the free voice released longest ago, else the oldest held, cancelling its pending gate-off; `ev.notes` takes one voice per note. Velocity is ignored, "as on the instrument"; P3 had floated a `velSens` default 0 in its text; P5's log does not mention it.

**Oversampling.** P5: the juno filter is a 4-pole TPT ladder "at 1x with one Pade tanh at the loop input"; "some aliasing of the tanh at high cutoff and resonance, not measured". The monos run oversampled (thread 8). P3 (10) had asked for P5's shared ladder.

---

## The panels

### Thread 17. Looks, not marks: what the panels were drawn from

**Source:** `BRIEF.md`; coordinator, 09:17, 13:14 and 13:26 EST; `P1-303.md`, 8; `P2-modeld.md`, 8 and 14.6; `P3-juno.md`, 8; `log-P4.md`.

**The rule** (`BRIEF.md`): panels "follow the originals' layout, colour and control shapes. They carry no Roland, Moog or other maker's logo, wordmark or model badge. Each carries Havantechno's own wordmark and a plain model name: HVT-808, HVT-909, HVT-303, HVT-D, HVT-106." The coordinator's decision (2), 09:17 EST, cites PRD D16.

**What each panel rests on.**
- HVT-808: the owner's manual p. 2 (front-panel photo rendered at 200 dpi) and pp. 3-4. Knob cap colours: "an approximation of the original's coloured caps from the photo, not a measured colour".
- HVT-909: the service notes' p. 1 drawing; tempo range 37 to 290 from its specifications.
- HVT-303: P1 section 8, labelled "MEM, UNVERIFIED: no photograph or manual read"; its hexes (#c8cbcf-ish, #e8671a-ish) are "my suggestion for the HVT-303 look, not measured".
- HVT-D: P2 section 8, first pass, "all PRIOR; no panel photograph or manual was seen"; 14.6 corrects it from the CA-72 panel README (walnut case, black textured face, fluted knobs with aluminium caps, wedge pointer selectors, blue and orange rockers, the decay and glide rockers on the controller block).
- HVT-106: P3 section 8; the section order is from Youth106's README and Junox's UI, while shapes, colours and positions are "**prior** (memory of the hardware)"; the coloured strips are unverified.

**Coordinator's looks** (13:14, 13:26, 13:54 EST): screenshots of the 808, 909, 303, D and 106 viewed; "Havantechno's mark only"; "No maker's mark on any of them". Open (13:26 EST): "the 303 and 106 layouts are from memory and P3's description, not a photo", and no reference image has been supplied. Scribe's note: the hardware's control legends (for example CUT OFF FREQ, ACCENT, the TR-808's capital and small-capital tile style) are followed; the records treat that as layout, not as marks.

**Manuals.** The 808 and 909 manuals are in the coordinator's scratchpad and "never copy them into the repo" (`BRIEF.md`).

---

### Thread 18. The VOICE TRIM strip and the undrawn accent knobs

**Source:** `log-P4.md`, decisions 3 and 6; coordinator, 13:14 EST.

**P4 said** (3): the engine has more parameters per voice than the hardware (drive, shift, burst spacing; "up to 8 extra for the claps"). Putting them in the columns "would crush the layout", so they sit "as small screwdriver trimmers in one 'VOICE TRIM' strip that follows the instrument selector, like the internal trim pots of the real machine". Every spec param stays reachable.

**P4 said** (6): the 808 AC and 909 total-accent knobs have no engine parameter (accent ratios are fixed in `drums.js`), so they are not drawn: "the AC column says 'Shift-click a step'. No fake controls."

**Ruled** (coordinator, 13:14 EST): the trim strip is accepted; "the accent knobs stay undrawn until the engine has an accent-amount parameter (backlog, A12)"; the 808 tempo range 40 to 300 "stands as a prior". P4 had written that 40..300 was "not found in the owner's manual text: a prior".

**On the new panels.** P4 drew the 303's SLIDE TIME as a trimmer (P1 section 9: the hardware has no such knob), and HVT-106's HISS trimmer "only if `chorusNoise` exists".

---

### Thread 19. Controls drawn only for spec rows that exist

**Source:** `log-P4.md`, Task 2 and Task 3; coordinator, 13:26 EST.

**The rule** (P4: "coordinator's ruling"): a single-device panel "draws a control only for spec rows that exist; panels-check asserts both directions (every row has a control, every control names a row), so a rename fails the check instead of leaving a dead knob." The coordinator's 13:26 EST entry records the behaviour; it contains no separate ruling entry.

**What it left out.** On the HVT-D: the mixer on/off rockers ("there are no parameters for them"). The pitch wheel is drawn but has no parameter; the mod wheel is live on `modAmount`. The keyboard was drawn inert until `Host.audition` existed (thread 21).

**What it caught.** With the juno engine absent, the HVT-106 ran on a stub of P3's table with BRIEF names (inside `tools/panels-check.js` only after Task 3); with `Classics.spec('juno')` (29 rows) both directions pass. P5 had run the check with the stub replaced: 110 checks, "Every name matches; none was renamed." P4's checks went from 69 to 110 to 116.

**Scribe's note.** P4 says "No fake controls" for the accent knobs and also draws a pitch wheel with no parameter; the records do not discuss the two together.

**Spec-row rings.** P4 draws a dotted ring on knobs whose spec row has basis 'prior'. On faders the ring first used the fader's half-length as its radius, "a large circle across the VCA and ENV sections", and was fixed after a screenshot (Task 3).

---

### Thread 20. The Electron bridge

**Source:** `log-P4.md`, decision 8, Task 2 and Task 3; `log-P5.md`, 3; coordinator, 13:14 and 13:26 EST.

**P4 said** (8): the bridge host given to Electron child windows has no `document`, `editor`, `commit` or transport play/stop, so step keys, the add button and start/stop are drawn disabled there; fixing it means changing `makeBridge` and `bootDevice` in `app.js`, "not my file". **Ruled** (13:14 EST): P4 "may extend makeBridge and bootDevice in app.js minimally in its next task and verify under Xvfb".

**Done.** Task 2: `makeBridge` gained `document`, `editor`, `commit`, `transportToggle`, `transportStop`; `bootDevice` forwards them. Task 3 added `audition`. Under Xvfb (Playwright `_electron`), `track:bd808` opened from the main window: the child shows the Panel view with step keys enabled; a click on key 4 set the main document's cell; the add button added a track to the main document; START/STOP started the main transport; no page errors. The panel scales into the child's smaller window, whose size "comes from main.js's remembered bounds".

**Not run.** The coordinator "did not repeat that run" (13:26 EST). Not verified (P4): the HVT-D and HVT-303 in a child window ("same code path as the 808"); the keyboards in a child window. P5 (3): `main.js` serves every file under `app/`, so the worklet module URL should resolve under `havantechno://app/`; "Not run in Electron."

---

### Thread 21. Host.audition and the panel keyboards

**Source:** `log-P4.md`, Task 2 and Task 3; coordinator, 13:26, 13:34 and 13:54 EST; `log-P5.md`, 3.

**P4 said** (Task 2): the HVT-D keyboard was "drawn, inert". The hook needed: `host.audition(trackName, {midi, vel, dur})` triggering the track's instrument at `ctx.currentTime`, with a matching bridge entry. The coordinator asked P5 for it (13:26 EST, "who holds host.js now").

**P5 built it** (3): no document change, no undo entry, false when audio has not started or the track is unknown. While the transport runs it joins the monos' event planner: it can make the next sequenced Model D note legato if still held; on the 303 it never does ("it has no slide flag"); its gate is cut or extended by sequenced notes. On drums and polys it adds a voice.

**P4 wired it** (Task 3): a shared `keyboard()` calls `host.audition` on pointerdown; HVT-D has 44 keys F to C, mono; HVT-106 has C2 to C6 with Shift playing a major triad; the juno keys use "a pressed colour until pointerup/leave". The bridge forwards `audition`. Checks: Shift-click C3 auditions 48, 52, 55 on the juno track; a key auditions MIDI 46 once on modeld.

**Verified.** Coordinator (13:34 EST): `Host.audition` returns true for both new monos and false for an unknown track. P4 (Chromium): three calls, each returned true.

**Not verified** (P4): "hearing the audition (headless: only the true return and the engine calls)"; keyboard (Tab) access, since the 49 keys are pointer only; the keyboards in an Electron child window.

---

### Thread 22. Edits the coordinator made in other agents' files

**Source:** coordinator, 13:34, 13:44, 13:46 and 13:54 EST; `log-P4.md`, Task 3.

- 13:34 EST, `system-editor.js` (A4's file): `addClassicTrack` and "+ track" entries built from `Classics.types()`, labelled "Bass line synth (HVT-303)" and "Mono synth (HVT-D)" (and "Poly synth (HVT-106)" when the engine has it). "Noticed and not fixed: 'Remove track' only acts on sampler tracks."
- 13:46 EST: `isRemovable(name)` now also accepts Drums and Classics types; the song's built-in tracks stay protected. Checked in the page: add HVT-303, remove it (13 tracks again), Undo brings it back.
- 13:54 EST: P4 reported "an open device window could cover the '+ track' menu". Cause: the menu sat at z-index 20 and each window focus raises a window's z-index by one from 10. The coordinator set the menu's z-index to 100000; with a window placed under the button, all ten menu items were the top element at their positions.
- 13:44 EST: the drum noise-offset fix (thread 12) and a scorer lower bound of 1.98 for three accent rows, "coordinator's edit in A9's file", because a reading of 1.9999 against a 2.0 bound moved the total between 83 and 86.

system-editor-check stayed at 97 through the first three; the log says "no new rows for the entries".

---

## Hosts, sources and verification

### Thread 23. Blocked hosts and sources that could not be read

**Source:** `BRIEF.md`, "Fetching"; `P1-303.md`, 0 and 1; `P2-modeld.md`, 0, 13 and 14; `P3-juno.md`, header and 13; `log-P5.md`, 2; coordinator, 12:57, 12:59 and 13:12 EST.

**The brief:** reachable are en.wikipedia.org, www.soundonsound.com, github.com, raw.githubusercontent.com and zenodo.org; "reverb.com, Equipboard, Roland's site and ManualsLib refuse automated clients".

| Agent | Could not read | Effect |
|-------|----------------|--------|
| P1 | www.firstpr.com.au (Whittle's accent notes), www.timstinchcombe.co.uk (the diode-ladder study), www.kvraudio.com, www.a1k0n.net, phaidra.ustp.at, electro-music.com, patreon.com, docs.lmms.io, manualsdir/manualslib; two guessed soundonsound URLs returned HTTP 410 | No service manual or schematic read; the accent sweep and slide time rest on code and memory (threads 4, 5) |
| P2 | `cdn.inmusicbrands.com` (the Moog manual PDF), `api.github.com`, github tree pages; the Huovilainen, Zavalishin and Välimäki papers not read | "This is the main loss": no Minimoog manual or schematic (thread 2) |
| P3 | Roland's site and ManualsLib (no Roland document read); `api.github.com/.../git/trees` rate limited | Service-note figures second-hand (thread 14) |
| P5 | `api.github.com` and github tree pages (403); `raw.githubusercontent.com` works | CA-72 read only through P2's section 14 |

**Where the records differ.** P1's first attempts at Open303 through `raw.githubusercontent.com` and `add_repo` "were refused or gated; the coordinator then said plain git works, and it did". P2 and P5 report `raw.githubusercontent.com` working; the brief lists it as reachable. P2 and P3 give their budget as "10 page fetches and 6 searches" (P3 says it used 4 searches and about 9 fetches); P2 used "3 searches and 12 curl requests, so I went over on fetches" and says the coordinator should know. `BRIEF.md` as compiled contains no budget, so the figure came from outside these files.

**Proposed, not answered.** Coordinator, 13:12 EST: allow www.firstpr.com.au, www.timstinchcombe.co.uk and cdn.inmusicbrands.com; "a second pass follows if the owner approves". No later entry records the owner's answer or a second pass.

---

### Thread 24. What the coordinator ran, and what it took on trust

**Source:** `log-coordinator.md`, entries 13:14 to 13:54 EST.

Run by the coordinator on one tree, exit codes read directly: panels-check 69, then 110, then 116; classics-check 80, then 110; selfcheck 392, then 395; faces 2495; system-editor 97; widgets 157; step-view 72; synths 169; drums 342; processors 92; analysis 36 then 39; browser-check PASS (26); the archived studio's selfcheck 161. The coordinator looked at all five panel screenshots and ran its own Chromium checks: held A1 on both monos within 1.5 cents (tb303 54.96 Hz, modeld 55.04 Hz); all three synths ready on the worklet with no page errors; peaks and juno left/right correlation (threads 13, 15).

**Not repeated, as the coordinator states it.** P4's Electron run; P4's Chromium run of values reaching the engine through `host.getParam`; P5's accent, slide, self-oscillation, keyboard-tracking and slope figures; P5's PWM, filter-slope, envelope-time and determinism figures; L2's SDR figures. At 13:34 EST the analysis-check failed 2 of 36 because L2 was mid-edit, and the coordinator noted it was not P5's files.

**Gap between logs.** P5's log (5) gives analysis-check 36 and 39 at different moments, and notes "analysis 39 (another crew's file, changed under it)". The drum scorer reads PASS 86, FAIL 19 and exits 1; that is A12's and A9's work, not this crew's.

---

### Thread 25. What nobody has listened to

**Source:** coordinator, 13:34 and 13:51 EST; `log-P5.md`, 6 and 8; `log-P4.md`, Task 1 to 3.

- Coordinator, 13:34 EST, of the Render Room version 7 (the drums, an HVT-303 acid line and an HVT-D bass line): "Nobody has listened to any of them." Version 8 adds an HVT-106 chord demo and re-renders the 303 and Model D demos.
- P5 (6): "Not run in Electron ... and not listened to by a person; the demos are for the owner's ears." (8): "Not listened to by a person. No Juno recording compared."
- P4: audition tested headless; "keyboard focus rings were checked only through the code path, not by eye; touch input not tried"; the panel screenshots were looked at by P4 and the coordinator, not heard.
- No hardware recording of a 303, a Model D or a Juno was compared by anyone. P5's measured targets are the numbers in the research files (Open303, the CA-72 reference, the Juno60 repository).

---

## Open at the time of compiling

- The accent sweep's build-up and its resonance dependence are a prior; no primary source (Whittle's notes, the Stinchcombe study) has been read (threads 4, 23).
- The 303's slide default (60 ms, tau 12 ms) and the half-step gate rest on Open303 and on remembered hardware figures (thread 5).
- Note priority: the Model D is built last-note; P2 and CA-72 say the hardware is low-note; the instruction P5 cites is not in the brief or the coordinator's log (thread 9).
- The Model D passband table sits about 2.5 dB under the CA-72 reference near the corner; loss at emphasis 7.5 is 1.9 dB more; the singing pitch at cutoff +2 is 3 % flat (thread 8).
- Whether `tune` prints -5..+5 on the HVT-D and whether the mixer rows are 0..1 or marks in the built spec (thread 3).
- The Model D's shark-fin mix, the dial labels below the 1 s mark and the mod-noise level are priors; no Moog manual has been read (threads 2, 8).
- The Juno's 106-versus-60 choices (HPF corners, chorus depth per mode, 300 versus 400 cents, 12 versus 14 and 3 versus 3.5 octaves) are chosen, not measured; the mode II rate (0.863 against 0.835 Hz) differs from P3's 106 value (threads 14, 15).
- Juno: bend stored and unused; unison without detune; filter not oversampled; chorus without the BBD's low-pass or nonlinearity; the fallback unmeasured; a full 200-bar render with juno tracks not timed (threads 11, 16).
- Panels: the 303 and 106 layouts and all strip and cap colours are from memory or approximated; no reference image supplied; the HVT-D and HVT-303 not run in an Electron child; keyboards not reachable by Tab; touch input untried (threads 17, 20, 21).
- The accent-amount knobs of the 808 and 909 stay undrawn until the engine has an accent-amount parameter (thread 18).
- The hosts proposed at 13:12 EST were not answered in the records; the owner has not supplied a Juno-106 service manual or a dry 106 recording (thread 23).
- No person has listened to any demo or auditioned note (thread 25).
