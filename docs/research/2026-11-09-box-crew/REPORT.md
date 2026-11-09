# Box Crew report: the sampler and the drum machines

Coordinator's report, 9 November 2026 (ET), from `transcripts/B1-sampler.md`, `B2-808.md`, `B3-909.md` (first passes from search summaries; second passes from pages and source read through the proxy), the builders' logs (`log-A1`, `log-A3`, `log-A4`, `log-A6`, `log-A7`, `log-A12`) and `log-coordinator.md`, which records every check run with its exit code. Every claim here names its source; nothing was heard.

## 1. The question

Batches 1 and 2 of the roadmap: a Kontakt-class sampler, then TR-808 and TR-909 recreations, with research first on what the commercial and open-source instruments do, what the circuits are, and which code and samples may be used.

## 2. Result in one paragraph

Both batches are built and every module check passes on one tree. The sampler plays programs with key and velocity zones, round robins, loops with baked crossfades, dB-linear envelopes, a filter, LFOs, choke groups and polyphony; it imports and exports SFZ with an exact round trip, auto-maps folders by file name and then by pitch detection, reads WAV metadata before decoding, stores programs in the project with region edits on the undo stack, and has a face with a zone map and region panel. The drum machines exist as 27 voices (16 TR-808, 11 TR-909) whose metal-oscillator bank and kick model come from two published papers and whose 909 constants come from read source; every other value is marked a prior. Nothing has been fitted against a real 808 or 909 hit, because none with a licence that allows shipping was found and the owner has not yet supplied any; the service manuals sit behind bot walls.

## 3. What the research established

**Sampler (B1, Opus).** For recreating records the features that matter first are one-shots, per-step pitch and start, choke, multi-zone kits, round robin, a filter envelope and slicing; old-sampler bit and rate reduction is a processor, time-stretch waits. SFZ is the right interchange format and the wrong storage format: programs are JSON in the document and SFZ is import and export only, with about sixty tier-1 opcodes played and the rest kept verbatim. The second pass against the SFZ specification corrected six things in the design (dB-linear decay and release with decay as a rate to the sustain level; a squared velocity curve; loop_mode semantics; gate 1 on SFZ import; lpf_2p as the default filter type; header inheritance without `<control>`); the WAV `smpl` chunk layout and several opcode defaults remain unverified against a primary source and are kept as named constants. Two prototypes backed the design: YIN pitch detection within 3 cents on 41 to 1046 Hz tones, and a baked loop crossfade that cut a seam jump from 0.399 to 0.0003.

**TR-808 (B2).** From Werner's DAFx-14 kick paper and the ICMC 2014 cymbal paper (both CC BY): the metal bank is six Schmitt-trigger squares at 205.3, 369.6, 304.4, 522.7 Hz plus trimmed 800 and 540 Hz at 47.98 % duty, through band-passes at 3440 and 7100 Hz and high-passes near 10.5 kHz; the cowbell uses only the 540/800 pair; the kick is a 1 ms pulse into a bridged-T whose centre shifts up more than an octave for about 6 ms, modelled at 49.5 Hz against Roland's 56 Hz chart value. Corrected along the way: accent does not double the kick's frequency; 587/845 Hz was the CR-8000's cowbell; io-808's hat oscillators do not match the circuit and are not ported. io-808 is MIT (text quoted). No 808 sample set was confirmed redistributable.

**TR-909 (B3).** Sound on Sound confirms the hats and cymbals are samples and the clap a circuit. andremichelle/tr-909 (AGPL-3.0-or-later) does not synthesise: it plays Float32 recordings of the author's RE-909 with code envelopes, so its code is portable and its recordings are not; its constants were quoted with file and line (kick 274 → 53 Hz, 60 ms hold, Tune as the pitch-fall time constant 7 to 29.4 ms, Decay 12 to 100 ms; snare Tone as noise decay 40 to 200 ms, Snappy as noise gain; toms 30 ms hold; hats hold 6/12 ms, decay 8 to 60 / 30 to 160 ms; step levels −18/−9/0 dB). The 6-bit and 18 kHz figures for the samples stay secondhand. No 909 sample set was confirmed redistributable; the synthesized hats, ride and crash are rendered once into buffers as the fallback.

## 4. What was built

| Piece | Owner | Evidence |
|---|---|---|
| `app/engine/programs.js`: program object, SFZ parse and write (exact round trip), file-name parser, auto-map, slicing, YIN pitch detection, WAV metadata | A7 | synths-check 169; Chromium renders R1 to R7 (pitch, loop seam under 0.1 dB with crossfade, choke below −230 dB, exact round-robin cycle) |
| Sampler program path in `synths.js`: regions, dB-linear envelopes, filter, LFOs, vibrato, polyphony and stealing, off_by, `_lastHit` | A7 | same |
| `doc.programs`, region edit operations, Host program calls, `getProgram` and `getMeta` on every sampler, `usedBy` counting regions, WAV header before decode, `detectPitch`, `Project.pickFiles`, `importProgram` with `#include`, `Project.missing` | A1 | selfcheck 392 |
| Sequencer events carry `step` and `hit` for round robin | coordinator | selfcheck 375 at the time |
| Folder, multi-file and SFZ drops; "Sampler track from folder…", "Import SFZ…"; "TR-808 kit", "TR-909 kit", "Drum voice…" | A4 | system-editor-check 97 |
| Sampler face: waveform with loop handles, key-by-velocity zone map, region panel, program tools, quick view; faces for decorrelate and the clip stage | A3 | faces-check 1235 |
| `app/engine/drums.js`: 27 voices under `Drums`, the metal bank as one PeriodicWave per context, chokes, 909 sampled voices synthesized into buffers; `Synths.create` falls back to `Drums` | A12, A7 | drums-check 322; all 27 voices rendered non-silent in A12's Chromium test |
| 27 drum faces from one table with five shared heroes, 808 and 909 skins, a dotted ring on every prior control | A3 | faces-check 2495 |
| `fm` instrument (two operators, Chowning index, indexEnv, feedback approximation) and its face | A7, A3 | synths-check 169; Chromium sidebands at carrier ± n·modulator |
| `programs.js` and `drums.js` in the load order; `HavantechnoShell.readText`; `.sfz` served | A6 | browser-check 26; Xvfb run by A6 |

Final counts on one tree, run by the coordinator with exit codes read directly: selfcheck 392, synths 169, drums 322, system-editor 97, faces 2495, step-view 72, processors 92, widgets 157, browser 26.

## 5. What is not verified

- No real sample library has been loaded; real pointer drags, the browser's folder picker and the Electron dialogs are untested (Electron's multi-file dialog is A6's next item).
- No drum voice has been scored against a real 808 or 909 hit. Every value marked `basis: 'prior'` in `drums.js` is a guess; the faces show a dotted ring on those controls. The service manuals (Roland, ManualsLib) and the 909 manual mirror were unreachable.
- The SFZ `smpl`/`acid` chunk layout, several opcode defaults and the −90 dB envelope floor are assumptions kept as named constants.
- Nobody has listened to a sampler program, a drum voice or the fm synth.

## 6. Decisions for the owner

1. Supply reference hits: a few dry 808 and 909 samples at default and swept settings let A9 fit every prior.
2. The TR-808 and TR-909 service-manual PDFs, if you have them, unlock a third pass on the snare resonators, clap timing and panel ranges.
3. Sample sets you own (Wave Alchemy, the SampleRadar packs, and others the transcripts list by URL) can be loaded on your machine through the sampler; none ships in the repository.
4. Try the sampler on one of your libraries and say what breaks.

## 7. Files

`BRIEF.md`, `transcripts/B1-sampler.md`, `B2-808.md`, `B3-909.md`, `log-A1.md`, `log-A3.md`, `log-A4.md`, `log-A6.md`, `log-A7.md`, `log-A10.md`, `log-A12.md`, `log-coordinator.md` (shared with the Crate and Lab Crews), this report. Code: `app/engine/programs.js`, `drums.js`, the sampler and fm in `synths.js`, `host.js`, `songdoc.js`, `project.js`, `app/ui/facedefs.js`, `faces.js`, `system-editor.js`, `app/shell/*`, `tools/serve.js`, `tools/drums-check.js`.
