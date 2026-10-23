# H1: kick and sub-bass synthesis — round 3
Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

Method for this round: I read round2-O1.md, round2-O2.md and round1-S1-sidechain-compression.md in full. I ran no web searches (budget 4, none used). I read the code paths the answers depend on: `studio/song.js` lines 40–45 (kick, sub, bass tracks and duck list), `studio/synths.js` lines 80–85 (`envDecay`) and 157–213 (`BUILD.kick`, `BUILD.sub`), `studio/core.js` lines 13–14 (`expo`, `target`), and `studio/processors.js` lines 237–247 (`BUILD.sidechain`). `studio/` is the symlink to `olde Havantechno dub studio/`. Code facts below are marked (code read). Measurements are O1's, marked (O1 M#). Nothing was rendered.

## Answers

### O1 Q2 (to H1): pitch shape, and whether 52 Hz is a deliberate tail

**Which of my kick designs express pitch as an exponential approach to a target?**

- In-house `BUILD.kick` (code read, `synths.js:166`): no. It calls `expo(body.frequency, P.tune, t + P.sweep)`, which is `exponentialRampToValueAtTime` from `punch` to `tune` over `sweep`. That is a log-linear ramp that ends exactly on `tune`. For song.js values (190 → 44 Hz over 70 ms) it gives 67 Hz at 50 ms, which matches O1's studio figure. It is not the reference's shape. The reference is a first-order approach, f = 51 + 213·e^(−t/24 ms) (O1 M1). Realising that in Web Audio needs `setValueAtTime(264, t)` then `setTargetAtTime(51, t, 0.024)`. `Kit.target` (`core.js:14`) already wraps `setTargetAtTime`.
- Tone.js MembraneSynth: no, by its description. The excerpt says the frequency envelope "starts at note * octaves and ramps to note over pitchDecay" (verified, excerpt only: https://app.unpkg.com/tone@15.0.4/files/build/esm/instrument/MembraneSynth.js). That is a ramp, not an approach. Not read in full.
- Kickmess: possibly. The excerpt says its pitch and amplitude envelopes use an "exponential slope" (verified, excerpt only: https://github.com/WeirdConstructor/Kickmess). An exponential envelope is usually an approach to an end level, but I have not read the code, so this is unverified.
- KICK 2 / KICK 3: the pitch curve is drawn as a Bezier curve with nodes, so an approach can be drawn, but the excerpts do not say which curve type it uses (verified, excerpt only: https://www.audiotent.com/blogs/production-tips/production-tipsultimate-guide-sonic-academy-kick-2).
- KickCrafter: an "adjustable curve" (excerpt only: https://github.com/ArnaudValensi/kickcrafter). Shape type not seen.
- Erica BD9: separate pitch and amplitude decay envelopes with intensity and decay time (excerpt only: https://www.bonedo.de/?p=2612672). Shape not stated. An analogue RC decay would be an approach, but that is my inference, not a source.
- Werner, Abel and Smith (DAFx-14): unknown. I have only the abstract excerpt, which says the sweep and an attack frequency jump are modelled separately. Whether the sweep is an RC-type approach is not stated in what I read.

Net: no source I read states the approach form for a product. The shape has to be fitted from the reference, not borrowed.

**Would Werner et al. or MembraneSynth give the reference shape?** MembraneSynth, no (ramp). Werner et al., not known. Read the paper before claiming it.

**Is a tail near 52 Hz plausibly deliberate?** 52 Hz sits within O1's stated accuracy of G#1 (51.9 Hz). In a B-based track, G# is the sixth degree of B major, and G#m7 is in the spec's own chord list. It is also a fifth above the drone's C#1 (34.5 Hz, O1 M4). So a G# tail is consistent with a deliberate choice. The audio alone cannot show deliberateness. Treat it as a plausible hypothesis to test by listening, not a finding.

**A discrepancy to flag.** O2's Q4 says the swept kick alone peaks in the 30–80 Hz band at 41–46 ms. O1's own M3 gives 70 ms for the coherent average and 83 ms for the incoherent one. The 40 ms figure in O1 is M2's broadband (<250 Hz) peak. I think O2 conflated the two. O1 should confirm.

### O1 Q3 (H1 part): the sub drone's ducking curve

Trigger-driven ducking is enough for this element. The drone is not a tail of the kick and does not need the kick's audio as a key. The kick is grid-locked, so a scheduled `trigger(t)` (the existing `BUILD.sidechain`, `processors.js:244`) can drive it. A key input is only needed for imported stems.

The data (O1 M4): −13, −7, −2, −2 dB, sampled 40 ms after each 16th step. Two cautions before fitting:

1. The sample is 40 ms after the grid step. The kick onset sits 11–13 ms before the grid (O1 M0), so the first sample is about 50 ms after the kick onset, not 40.
2. The later samples overlap the kick's own tail. At 159 ms after the kick (step 1), the kick is about −18 dB and its body is near 50–60 Hz, inside the 22–50 Hz band. So −7 dB at step 1 is probably drone recovery plus kick tail. The true recovery is probably faster than the raw numbers show.

If I take the raw numbers at face value, a single exponential recovery toward unity gives τ ≈ 350 ms (from −13 dB at 50 ms and −7 dB at 160 ms), or τ ≈ 180 ms (from −13 dB and −2 dB at 280 ms). The two estimates disagree, so one exponential does not fit cleanly. Tail contamination would push the true τ lower than either.

**Provisional shape, to be replaced:** a fast drop (attack around 5 ms, not yet measured) to about −13 dB, a short hold, then a release with τ around 100–180 ms. S1 should fit this.

**Requested measurement (for O1 or S5):** subtract the grid-synchronous average of the kick (O1's own method, which removes the coherent part) from the 22–50 Hz band, then re-measure drone level at 0, 10, 20, 40, 80, 160 and 280 ms after each kick. That also gives the missing 0–40 ms window needed to set the lookahead.

### O2 Q1 ★ (to H1): one row per top device

| Device | Source | Licence | Browser build | Parameters (spec names, range, value) |
|---|---|---|---|---|
| In-house `kick` (`BUILD.kick`) | In repo | None yet (repo has no LICENSE; owner decision) | Yes, Web Audio | `tune` 30–90 Hz, 51 (measured end). `punch` 80–400 Hz, 264 (start; extrapolated to t=0, the 0–10 ms part is unmeasured). `tau` (new; replaces `sweep` as a time constant) 0.005–0.1 s, 0.024. `click` 0–1, 0 (measured −45 dB, effectively off). `drive` 0–1, to be tested (song.js uses 0.45). |
| Tone.js (MembraneSynth and related) | Package source seen on unpkg (excerpt only) | MIT (per H5's fetch; I have not seen the licence file) | Yes, Web Audio library | `octaves` (number) and `pitchDecay` (Time). Ranges not found in excerpts. Shape is a ramp, so it is a parameter reference, not a model for this kick. |
| Werner, Abel, Smith (DAFx-14) TR-808 model | Paper; a Gen~ model is described | Published paper; licence not stated | None; reimplement | Parameter names and ranges not found in excerpts. Excerpts say the sweep and attack jump are separate, and Deruty's arXiv paper says the usable tune range is limited. Read the paper before filling this row. |

### O1 Q12 and O2 Q1 classification (H1's top three)

- In-house kick and drone: own code, no third-party licence. Repo licence is the owner's decision.
- Tone.js: (a) permissive code (MIT, per H5's fetch).
- Werner et al.: (c) published paper.
- Commercial and hardware references (KICK 2/3, BD9, BD909, SubKick): (d) closed binaries or hardware, reference only.

### O2 Q4 (to H1): one kick-bass voice, or two?

Keep two objects. The evidence:

1. The drone is free-running (coherence 0.03, O1 M4). It is not a tail of the kick.
2. It is ducked by the kick, so it needs its own gain path.
3. Its pitch changes by bar: mostly 34.5 Hz, 31.0 Hz (B0) in one bar of eight, and 33.3 Hz in the intro (O1 M6). That is a note sequence, not a pitch envelope.

None of the sourced designs has a free-running, ducked drone layer. KICK 2/3's sub layer is a synthesised sub with its own pitch envelope, and keytracking to MIDI notes would give per-bar pitch. But the sub is still a triggered kick layer. BD9's sub oscillator sits one or two octaves below the kick's main tone and is also triggered.

If the owner still wants one object, the merged voice needs these parameters:

- Kick body: start Hz, end Hz, approach time constant, body hold time, a multi-point amplitude curve (the reference reads −6.3 dB at 100 ms, −17.8 at 150 ms, −33.6 at 200 ms, O1 M2), click level, drive.
- Drone: frequency (per-bar note list, 34.47 Hz for C#1), level, duck depth, attack, hold and release (from S1's fit), and a continuous (no-gate) mode.
- Shared: the kick trigger time (grid minus 12 ms), and a rule that each kick re-triggers the duck.

## Revisions to my round 1

Round 1 was built on spec numbers and code defaults. O1's measurements replace them. Here is the list, item by item.

1. **Kick pitch.** Withdrawn: "punch about 130, tune 43, sweep 0.06 already right." Replace with: start about 264 Hz (extrapolated; measured 184 Hz at 10 ms), end 51 Hz, time constant 24 ms, approach form. Song.js currently uses punch 190, tune 44, sweep 0.07 (code read, `song.js:40`). My round-1 claim that song.js was unread is now resolved.
2. **Kick amplitude.** New finding, not in round 1. `envDecay` (code read, `synths.js:80–85`) is a single exponential from peak to 0.0001 over `decay`. At song.js's `decay` 0.3 that is τ ≈ 0.3/ln(10⁴) ≈ 33 ms. That is much faster than the reference's hold-then-drop shape, which only looks right because `drive` 0.45 flattens the envelope (O1 M2). The fix is an explicit hold plus a multi-point curve, with less drive, as O1 says. My round-1 advice to tune `decay` to 0.3 was the wrong lever.
3. **Click.** Withdrawn: "keep click low." Measured −45 dB below the body in the intro and −30 dB in mainA, where hats overlap (O1 M2). Set click to 0 for the reference preset. Song.js uses 0.12.
4. **Sub.** Withdrawn in full: "plucked B1 sine, harmonic 0, decay 0.3, peak at +35 ms." The reference has no plucked B1 sine. The energy I read as a delayed sub is the kick's glide (O1 M3). The real sub is a free-running drone at about 34.5 Hz that is ducked on every kick. Song.js still has the sub at `note: 'B1'`, `harmonic: 0.15`, `sidechain: { depth: 0 }` (code read, `song.js:43`).
5. **Attack jump.** Still open. My round-1 question about a separate attack frequency jump is not answered. The 0–10 ms part of the kick is an extrapolation.

## On my partner's report (S1)

Three points where the kick and the sidechain must agree:

1. **Trigger timing.** The kick's coherent onset sits 11–13 ms before the grid (O1 M0). The drone's duck trigger must use the same scheduled onset as the kick. S1's suggestion to "start the dip a few ms before the kick" is plausible but unmeasured: the drone's gain in 0–40 ms is not in the data. The requested measurement above settles it.
2. **Band and key.** The drone lives in 22–50 Hz. The kick's body runs 50–260 Hz and its tail stays at 52–60 Hz to 150 ms. An audio-keyed ducker on the drone would be fed by the kick's own tail, so the ducker should stay trigger-driven for this element. That agrees with S1's conclusion, but for a different reason than S1 gives.
3. **Master glue detector.** S1 notes the glue sees the full kick and has no detector high-pass. The reference's crest factor is 10.6–14 dB (O1 M9). A glue that sees the kick's 50–260 Hz body will pump on every kick. The cut frequency should be chosen so the kick body does not drive the glue. There is no measurement yet of the reference's gain reduction per kick, so the value is unset.

Corrections to S1's report:

- **The duck list.** S1 accepts the spec's "sub is not sidechained" as a design decision. O1 M4 shows the reference's real sub is ducked, with about −13 dB at 50 ms and recovery over roughly 120–240 ms. The spec's own reason against ducking was "a ducked sub recovered audibly between beats". That is exactly what the reference does. The sub belongs in the duck set (`song.js:41` currently ducks bass, stab, pad and lead only).
- **The 35 ms sub peak.** S1 says kick-to-sub timing interacts with any lookahead. That interaction is moot: the 35 ms event is the kick's glide, not a sub event (O1 M3).
- **The release shape.** S1 asks whether linear release is enough. My two-point estimates disagree (τ ≈ 180 vs 350 ms), so the data cannot yet tell linear from exponential. The contamination caveat matters here: fit only after the coherent kick average is removed.

## Still open

1. **Attack jump in the first 10 ms.** Needs an onset-aligned measurement at 0.5 ms resolution. O1's M1 starts at 10 ms.
2. **Drone duck curve.** Needs the coherent-average subtraction and samples at 0–40 ms (see O1 Q3 above).
3. **Drone pitch.** 34.47 Hz is about −9 cents from C#1 (O1 M4). Is that a deliberate detuning, a free oscillator, or a measurement error? And who writes the per-bar note sequence (31.0 Hz once per 8 bars)?
4. **Drive and the 300 Hz–1 kHz excess.** A tanh drive on a 60–190 Hz glide puts harmonics around 180–1000 Hz. That is a plausible contributor to the band excess. Test: an offline render with drive 0 and drive 0.45, comparing the 300 Hz–1 kHz band. This is for S3 and O1.
5. **Approach versus ramp in commercial products.** Not settled by any source I read. Kickmess is the best lead (excerpt only). The DAFx-14 paper is unread.
6. **Is 52 Hz a deliberate tail?** Needs listening, not measurement.

## Handoffs to other agents

- **S1:** duck the sub in the duck set; decide the trigger path for the drone; the glue detector high-pass.
- **O1:** confirm the 40 ms versus 70 ms discrepancy (O2 Q4); run the coherent-average subtraction on the drone band; provide 0–40 ms drone samples.
- **S3:** the kick drive test in the 300 Hz–1 kHz band.
- **H3 (per O2 Q7 and O1 Q7):** the per-bar sub note pattern (34.5, 31.0, 33.3) and whether it fits the chord plan.

## Questions for the Opus agents

- **O1:** Can the drone's duck depth and recovery be fitted after removing the kick's coherent average? If the drone's gain at 0 ms is not in the 40 ms samples, can a 0–40 ms window be measured?
- **O2:** For a Processors-contract kick with `tau` and a hold, which side should own the amplitude curve: the `BUILD.kick` spec (a new `hold` and a curve) or a generic envelope device under D1? This decides whether the kick's shape is a parameter change or a new device.

## Sources

No new URLs this round. Excerpt-level URLs from round 1 that I cite above:

- https://app.unpkg.com/tone@15.0.4/files/build/esm/instrument/MembraneSynth.js
- https://github.com/WeirdConstructor/Kickmess
- https://www.audiotent.com/blogs/production-tips/production-tipsultimate-guide-sonic-academy-kick-2
- https://github.com/ArnaudValensi/kickcrafter
- https://www.bonedo.de/?p=2612672
- https://dafx14.fau.de/papers/dafx14_kurt_james_werner_a_physically_informed,_ci.pdf
- https://dafx.de/paper-archive/details/hwkd1Lfe8vmtOxCEjsNY-g

Repo files read this round (code read): `studio/song.js` (lines 40–45, 73–94), `studio/synths.js` (lines 80–85, 157–213), `studio/core.js` (lines 13–14), `studio/processors.js` (lines 237–247). Round-2 and round-1 files: `docs/research/2026-10-23-plugin-gear/transcripts/round2-O1.md`, `round2-O2.md`, `round1-S1-sidechain-compression.md`.
