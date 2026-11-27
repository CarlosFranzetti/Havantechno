# Log T2 (Selector Crew): A2 and A3, the Juno and the 303 in the worklet

Builder T2. Task: row T2 of `../BRIEF.md` (strategy steps A2 and A3). Files owned: `app/engine/worklets/classics-processor.js`,
`app/engine/classics.js`, `tools/classics-check.js`, `tools/juno-bench.js`, `tools/tb303-bench.js`. Every number below was
measured in this session, with the command that produced it. Nobody has listened to anything, and nothing has been
compared with a real unit.

## 2026-11-27 02:06 EST (07:06 UTC): reading, and the "before" snapshot

Read `BRIEF.md`, `memory.md` (Now), `CLAUDE.md`, `docs/plans/2026-11-21-strategy.md` (A2, A3), `app/engine/worklets/classics-processor.js`
(all of it), `app/engine/classics.js`, `tools/juno-bench.js`, `tools/tb303-bench.js`, `tools/classics-check.js`, the seed
and `snapTime` parts of `app/engine/sequencer.js` (lines 120-135, 180-195, 380-470), Pressing Crew log-G1 (the per-hit
generator: `Math.random` is replaced, for the length of one `inst.trigger`, by a generator seeded by track, absolute step,
n-th trigger on that step and `seq.seed`).

What the Juno's voice loop is today: one sample per output sample. PolyBLEP saw and pulse (and the sub), the 4-pole TPT
ladder with one tanh at its input, ADSR, VCA, six voices summed, then HPF and the BBD chorus. No oversampling (the 303
and the Model D run at 4x with Open303's elliptic quarter-band decimator).

How instruments are made: `sequencer.js` line 187, `Synths.create(seq.ctx, def.inst || name, def.params)`. No seed reaches
an instrument; the Juno's processor gets the constant seed 106 (`classics.js` BUILD.juno), the Model D 22051.

Before snapshot (copies of my five files taken before any change, md5): classics-processor.js 7305e4da8b9f2e4e3381134c655648c5,
classics.js cd338c17ced78245574313b278db3f28, juno-bench.js 3f7949138acb914206a7564f028c2131, tb303-bench.js
b88b362788720bc83f1cd1159653ea3c, classics-check.js 9401d4f9423ccbd4cfdf3b07f96a3e12. Kept in my scratch folder
(`<scratch>/before/`), never in the repository; `tools/juno-bench.js --proc <file>` serves such a copy in place of the
working processor, which is how every "before" row below is measured with the same bench.

The machine has 4 cores and two other builders render in Chromium at the same time: every timing below is noisy, and I
give best-of-N and the spread.
