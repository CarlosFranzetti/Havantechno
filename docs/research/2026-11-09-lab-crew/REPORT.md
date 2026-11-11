# Lab Crew report: telling what an element is

Coordinator's report, 11 November 2026 (ET), from `BRIEF.md`, `transcripts/L1-methods.md`, `transcripts/log-L2.md` and the coordinator's logs (`../2026-11-09-box-crew/transcripts/log-coordinator.md` for 9 November, `../2026-11-11-patch-crew/transcripts/log-coordinator.md` for 11 November). L1 was stopped by the usage limit and could not be resumed; L2 took over from L1's files. Scores below are L2's unless the report says the coordinator ran them.

## 1. The question

The owner, 8 November: when a track is analysed, say for each element whether it is a synth or a sample, mono or poly, FM or analog, whether it carries reverb and whether that reverb is built in or outboard, then load the DAW's own recreation or suggest one; for drums, an obvious 808 or 909 loads the recreation, an unknown gets a guess, a sample goes to the sampler. Roadmap batch 3.

## 2. Result in one paragraph

`app/analysis/` (global `Analysis`: `dsp.js`, `features.js`, `decide.js`, `drumlib.js`, `report.js`) takes one element's audio and returns six decisions, each with a confidence and the evidence behind it, and a suggested recreation: an engine drum voice with knob settings, the sampler, the fm instrument with ratio and index, or `tb303`, `modeld` or `juno` chosen by rule. `node tools/analyze.js <wav...>` prints the table. `tools/separate.py` splits a mix into stems (HT-Demucs by default, MDX-Net as the fallback). Every score in this report is on audio the engine itself rendered, where the truth is known. Nothing is validated on a separated stem of a real record, and the drum library is the engine's own voices, not real machines.

## 3. What was established

**Methods (L1).** Tested on engine-labelled sounds: hit-to-hit similarity for sample against synth, with a cap on confidence because a deterministic synth and a sample are the same audio; harmonic counting for mono against poly; sideband fitting for FM; energy-decay curves for reverb. L1's write-up is `L1-methods.md`.

**Ground truth (L2).** `tools/analysis-truth.js` renders the engine's instruments headless with labels: 257 files (all 27 drum voices at several settings, sampler replays, synths at one and several pitches, reverb cases of known RT60 and pre-delay, and the three classic synths on their worklets).

**Fixes found by testing against it (L2).**
- Onsets: 18 of 47 renders had read as one hit because the detector waited for a 45 dB fall between hits; it now re-arms on a 25 ms envelope. All 47 read 20 of 20.
- The sample test by formants scored 0.42 on a transposed sample whose answer is 1; rewritten on harmonic profiles across notes, it reads 0.98 there and 0.05 on a fixed filter.
- An 808 kick's ring and the 808 clap's tail read as reverb; a long decay now counts as reverb only when it is decorrelated between channels (in a mono file, only when broadband, at low confidence).
- The engine's drum noise replayed identically on every hit (fixed in `drums.js` by the coordinator); the analysis then separated replays (residual −30 dB or lower after matching a hit to its best twin) from deterministic synths (−19 to −46) and free-running ones (−2 to −7).
- FM fitting needed the carrier and modulator phases as free parameters; without them every static-index note failed.

**Scores on the truth set (L2).**

| Decision | Result |
|---|---|
| Synth or sample | 0 confident wrong calls of 55 |
| Mono or poly | 29 of 29; exact note counts 17 of 29, low at five to six notes |
| FM or subtractive | 21 of 23 right, 0 wrong (a near-sine with no call; an undecided 1:1.41) |
| 808, 909 or other, each render left out of the library | machine right 118 of 135; voice right 90 of 135; high-confidence calls 97 of 97 |
| Reverb time | 1.16 s read for 1.2 s; 2.52 and 2.21 s for 2.5 s; pre-delay 21.1 ms for 25, 5.8 for 5 |

**Separation (L2).** On a 16-bar V3 render against the sum of its own solos, SDR in dB: MDX-Net drums 9.7, bass 7.5, other 15.9; HT-Demucs 24.0, 17.7, 19.4. HT-Demucs is the default. The MDX-Net weights are the KUIELab authors' own upload (Zenodo record 5717356, CC BY 4.0); `separate.py` refuses any other file and writes the attribution into `stems.json`. Whether the training data's terms reach either model's weights is not settled.

**The coordinator's own run.** `analysis-check` OK: 47. `tools/analyze.js` on three renders the tool had not seen (an HVT-303 line, an HVT-D bass, HVT-106 chords) suggested `tb303`, `modeld` and `juno`, each at low confidence, with mono, mono and poly. On the dry HVT-D bass it also read a reverb of 1.56 s at low confidence (the patch's own release in a mono file) and could not decide synth or sample (fewer than three onsets found in a 32-note line).

## 4. The owner's track through the tool

L2 ran the four HT-Demucs stems of the reference (kept in the scratchpad, never in the repository) through `tools/analyze.js`. This is the output of an unvalidated tool; the table is in `log-L2.md` section 11. In short: the kick band sits nearest the engine's 909 kick and its hits replay identically; the hat band reads as fresh-noise synthesis nearest the 808 maracas and open hat with a 2.87 s tail; the snare and clap band finds no confident machine; the bass stem reads as two parts (a drone near MIDI 24 to 26 and a line); the other stem as chords with a 6.1 s tail and 18 ms pre-delay; the vocals stem is leakage. Three of these agree with the Ear Crew's hand measurements (the 909-style kick glide, the long tail, the low drone), which is consistency, not validation.

## 5. What is not verified

- No decision has been checked on a separated stem with known truth. Stems leak into each other, and the drums stem is split by frequency band, so one band can hold several voices.
- The drum decision compares against the engine's own 808 and 909 voices, which themselves have not been compared with real machines.
- Recreation types for pitched parts are rules (mono and resonant gives 303, and so on) at low confidence; no parameters are fitted by synthesis yet.
- Known wrong readings: a reverb shorter than the element's own decay reads the element's decay (909 snare: 1.37 s for a 0.8 s reverb); two reverb units with the same settings read as one shared unit; a stereo chorus can read as a short reverb; a mono file with a built-in tail reads reverb at low confidence; a legato line can yield too few onsets for the synth-or-sample test.
- "Built-in or outboard" is answered only as "shared across elements or specific to one", which is what audio can show.
- Glide and voice-stealing tests for mono or poly are not built.

## 6. Next

1. Batch 4: import a file, separate, analyse, build a project from the suggested recreations, save it at once, and A/B it against the original.
2. Parameter fitting by rendering the engine's own instruments against the element (L1 section 8.2).
3. A sampled hat through HT-Demucs with known truth, to learn what separation does to decision A.
4. `render.js` labels (L2's spec, `log-L2.md` section 10) so a whole song render carries its own truth and the tool can be scored on a mix.
5. `Host.analyze` and a CONTRACT.md section for `Analysis`.

## 7. Files

`BRIEF.md`, `transcripts/L1-methods.md`, `transcripts/log-L2.md`, this report. Code: `app/analysis/*.js`, `tools/analyze.js`, `tools/analysis-truth.js`, `tools/analysis-check.js`, `tools/separate.py`. `app/analysis/drumlib.js` is generated: rebuild with `node tools/analysis-truth.js --sets drums && node tools/analyze.js --build-drumlib` whenever `drums.js` changes.
