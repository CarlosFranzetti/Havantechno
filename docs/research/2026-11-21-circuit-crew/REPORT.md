# Circuit Crew report: hardware, open emulations and modelling methods

Coordinator's report, 21 November 2026 (ET), from `BRIEF.md`, `transcripts/C1-hardware.md`, `C2-open-emulations.md` (with its second pass), `C3-methods.md` and `transcripts/log-coordinator.md`. A research round: no code was written. The owner's Firecrawl credits ran out part-way; each transcript says what rests on search summaries or memory.

## 1. The question

The chips and schematics of the five instruments, which open emulations exist and whether to use them, and what the best emulations' methods are.

## 2. Findings

- **Documents** (C1): service notes for the TB-303, Juno-106, Juno-60 and TR-909 can be fetched; their drawings are scanned images the researcher could not see, so no component value has been read from a Roland drawing. No public simulator netlist was found for the 303's filter with accent, the 808 or 909 voices, the Juno's filter chip or chorus. ROM checksums are recorded in an emulator's source; nothing read permits redistributing the images.
- **Starting points** (C2): 303, the diode-ladder filter and output network in JC303 (AGPL-3.0-or-later; calibrated to its author's circuit simulations; no hardware comparison stated); Model D, CA-72's light model (GPL-3.0-or-later); Juno, parts of KR-106 (GPL-3.0) and a published bucket-brigade chorus model; 909, the present source; 808, nothing open at circuit level.
- **A correction** (found by C2, confirmed by the coordinator in CA-72's calibration notes): CA-72 is calibrated against a modern recreation of the Model D, not an original. `THIRD_PARTY.md` and the Patch Crew report are corrected.
- **Methods** (C3): Arturia publishes goals, not methods; no paper or patent on TAE was found. The honest equivalent is the same goals with published methods (nonlinear filter cores solved inside the loop, antialiasing, waveform imperfections and seeded variance), checked against a simulation of the schematic and published measurements. Ranked upgrades: Juno oversampling; Juno bucket-brigade chorus; a nonlinear diode ladder for the 303 against a simulated reference; per-voice variance; Model D ladder and oscillator shapes; antialiased clips; 808 and 909 circuit voices; neural modelling only with a recorded unit.
- **Tools**: ngspice 42 runs in the sandbox (C3 and the coordinator each ran a test circuit against a hand-calculated corner). WebAssembly is not needed for the first six upgrades.

## 3. What is not known

Component values (unread until the drawings are viewed as images); datasheets for the BA662A, MN3009, MN3101, MC5534, uPD650 and IR3109; any firmware disassembly for the 303 or Juno-106; CPU cost on a phone; how any model sounds next to a real unit.

## 4. What follows

`docs/plans/2026-11-21-strategy.md`, stages A2, A3 and B1 to B5.
