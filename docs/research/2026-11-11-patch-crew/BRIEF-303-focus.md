# Patch Crew, second round: the 303

Written by the coordinator, 11 November 2026, 21:10 ET (12 November 02:10 UTC).

## The owner's words

"Let's focus on the 303."

The coordinator reads this as: make the HVT-303 right before anything else, its sound first, then its panel and sequencer, and put it where the owner can hear and play it. The owner has not yet listened to any instrument; the first round's report says so. If the owner meant something narrower, this brief is amended.

## Where the 303 stands (first round, `REPORT.md`)

- Engine: `tb303` in `app/engine/classics.js` and `app/engine/worklets/classics-processor.js` (`hvt-tb303`), ported from Open303 (MIT). Measured by P5: pitch within 0.33 ct, accent +8.0 dB at 0.6, a 60 ms slide reaching 90 % in 20 to 25 ms, the accent sweep building over consecutive accents at resonance 0.95, no self-oscillation at resonance 1.
- Still guesses: the accent-sweep time constants (15 to 100 ms), the soft clip in the filter feedback, the 60 ms slide default. The resonance peak is modest (up to 7.3 dB over the half-frequency harmonic at 0.95).
- P1 could not read two analyses in the first round because their hosts were blocked: the accent circuit (www.firstpr.com.au) and the diode-ladder filter (www.timstinchcombe.co.uk). Both hosts are allowed now. No owner's manual or service notes for the 303 have been read.
- Panel: HVT-303 in `app/ui/panels.js`, drawn from memory, with sixteen steps (note, accent, slide), a one-octave note row, octave down and up, rest, run and stop, tempo.
- Import: in D1's test a `tb303` line was labelled `modeld` by the analysis rules, and a 303 line alone read half tempo.

## What to do

1. **P1, second research pass.** Read the two analyses and any primary document reachable (owner's manual, service notes, schematics with component values). Deliver corrections to the first spec, each with its source and what it changes in the build: the filter (pole count and slope, cutoff range, resonance behaviour and whether the real unit self-oscillates, the highpasses around it), the envelope (decay range, what accent does to decay), the accent circuit (how the sweep forms, its time constants, how consecutive accents stack, the role of the resonance knob), slide (time constant, which step carries it), gate length and tie behaviour, tuning range, the square wave's shape, the VCA envelope, output level. Also the sequencer as the hardware has it (pattern length, pitch mode and time mode, transpose, rests and ties) and the panel's layout in words precise enough to draw from. Mark each item measured, derived from a schematic, or stated by a secondary source.
2. **P5, a bench and then the corrections.** Now: `tools/tb303-bench.js`, a repeatable characterisation of `tb303` in headless Chromium (frequency response at several cutoff and resonance settings, resonance peak height, envelope decay against the knob, accent level and sweep over one, two and four consecutive accents, slide curve, gate length, level against settings) written as a table and a JSON file, so every later change is compared with numbers. Then demos the owner can judge: classic acid moves (a cutoff sweep over a looping pattern, resonance up, envelope modulation up, decay short to long, accents and slides on and off), rendered dry and through a mild drive. When P1 hands back: apply the corrections, re-run the bench, and say what moved.
3. **P4, a playable 303.** A single-instrument page (`app/solo/303.html`) that loads the real engine files and the real panel, so the owner can play the HVT-303 in a browser, phone included: the panel scaled to the screen, start on a tap, the sixteen steps editable, a few stored patterns, tempo, and nothing of the rest of the app. The coordinator publishes it for the owner. Then, when P1 hands back: correct the panel's layout and add the sequencer functions the hardware has that the panel lacks.

Later, not in this round: the analysis rules that should recognise a 303 line (`app/analysis/`), and tempo from a bass line alone (`importer.js`).

## Rules

As in `BRIEF.md`: one owner per file, no commits, never git stash, checkout, reset or clean, no maker's marks, nothing copyrighted in the repository, every existing check passing, logs in `transcripts/` with Eastern Time and UTC, rulings received in messages quoted in the log. Frozen `tb303` parameter names stay: tune, wave, cutoff, resonance, envMod, decay, accent, slideTime, level. A new parameter needs a line to the coordinator first.
