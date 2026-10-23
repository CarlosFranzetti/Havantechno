# H2: Mid bass synths — round 3
Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

Method this round: I read round2-O1.md and round2-O2.md in full, and round1-S3-saturation-eq-filter.md in full. I used 0 WebSearch calls and 8 WebFetch reads (budget: at most 4 searches; fetches are not searches). Numbers marked "model" come from my own offline numerical runs of a simplified bass (additive saw pair at ±7 cents, RBJ-style biquad lowpass with Q = 10^(res_dB/20), no eq3, no amp envelope, no kick, stab, pad or reverb). They are not measurements of the studio render and not of the reference. Studio path: `studio/` is a symlink to `olde Havantechno dub studio/`, and every `studio/...` path below resolves.

---

## Answers

Every numbered question addressed to H2 in round2-O1.md and round2-O2.md.

**O1 Q4 (to S3 and H2): which studio element would you check first, and can you confirm or refute that a BiquadFilterNode lowpass Q is in dB?**
- First element: the bass voice's filter. In the model, the bass's own 300 Hz to 1 kHz to 20 to 300 Hz ratio is −15.3 dB with the studio's single 12 dB/oct biquad and −24.6 dB with a 24 dB/oct cascade (B2, 220 Hz, res 3). Slope moves the bass's band balance by about 9 dB, more than pitch (about 4 dB across B1 to C#3) and more than square versus saw (about 3 dB). Next in line for per-step attribution is the kick's drive (O1's M2), but that is not my element.
- Q in dB: I could not confirm it myself. `https://webaudio.github.io/web-audio-api/` did not resolve from this sandbox (ENOTFOUND). I rely on O2's reading of the spec (O2 item 14, cited as verified by O2, not by me). My model uses that convention: Q_linear = 10^(res_dB/20), so res 3 dB gives Q 1.41.

**O1 Q5 (to H2): the partials near 98, 109, 133–138, 162, 181–186 and 228 Hz over a 34 Hz component (M5): is that a bass on other notes, an FM or inharmonic bass, or stab bleed? Which synth families would make it?**
- My answer is that M5 cannot yet attribute those partials to the mid bass. Three problems with the M5 window:
  1. The M5 window (110 to 225 ms after the step) is kick-contaminated for steps 3 and 7. By the spec's element map the kick sits on steps 0, 4, 8 and 12. One 16th at 126 BPM is 119 ms, so the next kick onset for steps 3 and 7 (steps 4 and 8) falls at +119 ms, inside the window. Steps 10 and 14 are kick-clean: the next kick is two 16ths away (+238 ms, at steps 12 and 16), after the window closes at 225 ms. The kick's pitch glide runs 184 Hz to 61 Hz across 0 to 106 ms (M1), which spreads energy across exactly the 76 to 186 Hz range M5 lists.
  2. Stabs are on steps 7, 10, 14 among the bass steps (spec: steps 2, 6, 7, 10, 14, 15). Steps 7, 10 and 14 therefore carry stab sustain in their windows. Step 3 is the only bass step with no stab, but it is kick-contaminated.
  3. The B2 fundamental (123.5 Hz) is not in M5's peak list.
- What the listed peaks match, with the caveat that 4 to 9 Hz resolution makes note names tentative: D#2 (77.8, listed 77–79), G2 (98.0), A2 (110.0, listed 109), C#3 (138.6, listed 133–138), E3 (164.8, listed 162), F#3 (185.0, listed 181–186). The 228 Hz peak does not map cleanly to a note (A3 is 220, A#3 is 233). The peaks are not one harmonic series: 34.5 Hz times 3, 5 and 6 gives 103.5, 172.5 and 207, none of which match the listed peaks.
- Families: once the pitch is pinned, any monophonic subtractive bass (saw or square through a lowpass) can play those notes, so the family question is secondary to the pitch question. FM or inharmonic voices are not needed to explain the peaks.
- Next measurement: M5 on steps 10 and 14 (kick-clean; stab bleed remains, so compare with the same steps in a stab-muted bar if one exists), and on steps 3 and 7 after subtracting a kick template taken from kick-only steps (0 and 8 or 0 and 4 in a bar with no bass, if one exists).

**O2 Q1 (★, to H2): top three devices, with licence, browser build and character parameters.**

| Device | Source available | Licence (as seen) | Browser build | Character parameters, ranges, mapping to spec names |
|---|---|---|---|---|
| Open303 engine (MIT core) | yes: https://github.com/RobinSchmidt/Open303 | MIT (verified: https://raw.githubusercontent.com/RobinSchmidt/Open303/master/License.txt, fetched; the URL is built from the File listing on the repo page) | none; a port to AudioWorklet is possible (my assessment, not tested) | From `rosic_Open303.h` and `rosic_TeeBeeFilter.h` (fetched): cutoff in Hz, clamped 200 to 20000 in TeeBee → spec `cutoff`; resonance in percent, 100 = self-oscillation, no lower clamp → spec `res` (needs conversion from percent to dB, not a 1:1 map); env mod in percent, no range given → spec `env` (Hz; conversion needed); decay in ms, normal 200 to 2000, Devil Fish 30 to 3000 → spec `decay` (spec is 0.02 to 1 s); waveform blend 0 (saw) to 1 (square) → spec `wave` (the studio has a fixed saw and a separate square). Accent percent and slide ms have no spec equivalent. |
| jc303 (GPL wrapper around Open303) | yes: https://github.com/midilab/jc303 | GPL-3.0 (verified: fetched page) | prebuilt CLAP, VST3, LV2, AU; no web build | Same engine as above (the Open303 core is MIT per the same page). |
| TAL-BassLine | closed binary | freeware per listings (unverified: https://www.pluginboutique.com/product/1-Instruments/4-Synth/434-TAL-Bassline and https://www.kvraudio.com/product/tal-bassline-by-togu-audio-line, search results only) | none found | Not found: I did not open a manual or read parameter ranges. No mapping given. |
| Mz101 (SH-101) | yes: https://github.com/simozzer/Mz101 | AGPL-3.0 ("free software under the GNU Affero General Public License v3", verified: fetched page) | none; desktop VST3, AU, LV2, standalone | Not read: I did not open the source for parameter ranges. |

**O2 Q5 (to H2): if Open303 is MIT, list the components that would form a 24 dB/oct ladder option for `BUILD.bass`, with parameters and ranges.**
- Licence: MIT, confirmed (verified: fetched License.txt, "The Open303 source code is released under the terms of the MIT license", copyright Robin Schmidt 2009). The repo page itself did not show the licence text, and the O2 round-2 note that the upstream LICENSE was unread is now resolved.
- Filter: `rosic_TeeBeeFilter.h` (fetched) is described in its class comment as "a variation of the Moog ladder filter which includes a highpass in the feedback path". The code cascades four first-order sections (y1 to y4), so it has four poles. A 24 dB/oct slope follows from that reading (my reading of the code). The comment itself ends with an unresolved note, "...18 vs. 24 dB? blah?", so the author did not settle the slope in writing. Output tap is selectable (FLAT, LP, HP, BP, TB_303). Cutoff clamps to 200 to 20000 Hz. Resonance is percent, 100 = self-oscillation, no clamp in the setter. A one-pole feedback highpass sits in the loop. The class comment also mentions an input highpass and allpass, but only commented-out code applies them.
- Envelope and accent: `rosic_Open303.h` exposes setEnvMod (percent, no range), setDecay (ms), setAccentDecay (ms), setAccent (percent, no range) and setSlideTime (ms, no range; the comment says the TB-303 used 60 ms). Envelope source files `rosic_DecayEnvelope` and `rosic_AnalogEnvelope` were not read.
- A 24 dB ladder option for `BUILD.bass` would therefore be: the TeeBee LP tap, with cutoff, resonance (percent mapped to res), envMod (mapped to env), decay, and the feedback highpass as a fixed internal. Ranges would need to be fixed by a test sweep, since the source gives only some of them.

**O2 Q12 (to H2): classify each top-three device as (a) permissive, (b) copyleft, (c) paper, (d) closed.**
- Open303 engine: (a) permissive (MIT).
- jc303 and Mz101: (b) copyleft (GPL-3.0 and AGPL-3.0).
- TAL-BassLine: (d) closed binary (per listings; unverified).

No other numbered question in round2-O1.md or round2-O2.md is addressed to H2. The other questions go to H1, H3, H4, H5, S1, S2, S4 or S5.

---

## Revisions to my round 1

Round 1 said: the mid bass plays B2, which "lands its energy in the 120 to 300 Hz band like the reference"; the studio bass is two detuned saws plus a square through a resonant lowpass with an envelope; the mid bass is the prime suspect for the 300 Hz to 1 kHz excess ("not contradicted").

What changes if the pitch is not B2 and if filter slope or saw content drives the excess:

1. **Pitch is an open question, not a settled B2.** The spec's own tuning note says B2 was chosen so the mid bass's energy lands in 120 to 300 Hz. That was a band-balance choice, not a pitch measurement, as O1 says. M5 does not show a B2 fundamental, but M5 is kick-contaminated (see Answers, O1 Q5), so the pitch is unknown, not "not B2". I withdraw "B2 is right" from round 1. The candidates are the notes listed under O1 Q5, and the pitch should come from a kick-excluded per-step spectrum.

2. **Pitch barely moves the bass's band balance.** Model, steady state, 12 dB, 220 Hz, res 3 dB:

   | Pitch | 300 Hz to 1 kHz vs 20 to 300 Hz |
   |---|---|
   | B1 (61.7 Hz) | −17.3 dB |
   | C#2 (69.3 Hz) | −19.5 dB |
   | B2 (123.5 Hz) | −15.3 dB |
   | C#3 (138.6 Hz) | −18.1 dB |

   So the choice of pitch within B1 to C#3 is worth about 4 dB. Pitch is not the lever for the excess; the filter is.

3. **Filter slope is the strongest lever, and the studio uses the weak setting.** Model, B2, 220 Hz, res 3 dB:
   - 12 dB/oct (one biquad, the studio): −15.3 dB.
   - 24 dB/oct (two cascaded stages): −24.6 dB. That is about 9 dB less 300 Hz to 1 kHz energy relative to 20 to 300 Hz, from the bass alone.
   - Cutoff 220 to 300 Hz at 12 dB: −15.3 to −9.4 dB, a 6 dB rise. The cutoff is also a lever.

   Recommendation: add a 12/24 dB slope switch to `BUILD.bass`, as O2's "what the platform needs" suggests. Then set it by the per-step measurement, not by ear.

4. **Saw versus square matters less than slope.** Model, B2, 12 dB, 220 Hz, raw then filtered:
   - Saw pair: raw −3.5 dB, filtered −15.3 dB.
   - Square: raw −7.7 dB, filtered −18.2 dB.

   A square lowers the bass's 300 Hz to 1 kHz share by about 3 dB. The song's square is already silent (`sub: 0`), so the saw content is what the filter has to remove.

5. **The filter envelope's attack opens the band.** Model, 0.25 s window, B2, env on versus off: −17.3 dB with the 300 Hz envelope, −24.0 dB without. This is window-sensitive: the same steady configuration gives −24.6 dB at 1 s with 24 dB, and −15.3 dB at 12 dB with a 1 s window. Treat the envelope number as a direction, not a value. The envelope amount is a second lever after slope.

6. **Where the bass ranks against the reference.** The bass alone sits at about −15 dB in this ratio. The reference's whole-mix ratio in mainA is −14.7 dB (O1 M9). So the bass by itself is at roughly the reference's full-mix balance. That makes it a plausible contributor, not a proven one. I cannot assign it a share without its level against the other elements. Round 1 called it the "prime suspect"; I now say "a candidate, to be scored per step".

7. **Ranking.** Open303 moves to first for the filter model. It is MIT (verified), its filter is a four-pole ladder (my code reading), and it has the resonance and envelope controls the bass needs. TAL-BassLine drops to reference only, since its listing facts are unverified and its filter slope is unknown (one snippet says −18 dB/oct, which is neither 12 nor 24; unverified). Mz101 stays as a reference for the SH-101 saw plus square, subject to AGPL.

8. **Round 1's SH-101 "24 dB lowpass" claim** (O1 row 13) stays unverified. The Wikipedia page for the SH-101 did not resolve, and the Roland write-up was seen only as a search snippet.

---

## On my partner's report (S3)

Where bass synthesis and saturation, EQ and filter design must agree:

1. **Filter slope and drive placement must be decided together.** S3 notes that `BUILD.filter` is one biquad (12 dB/oct) and that the saturator is a symmetric tanh. It does not say where the drive sits in the instrument. In `studio/synths.js` (lines 126 to 130, shared by all instruments with a drive parameter), voices connect to `inst.pre`, which feeds the WaveShaper, which feeds `inst.out`. For the bass, the voice is already filtered and enveloped before it reaches `inst.pre`. So the drive is post-filter, and its odd harmonics land above the cutoff, straight into the 300 Hz to 1 kHz band.

   Model (B2, 220 Hz cutoff, res 3 dB, drive 0.15 using the shaper form k = 1 + 40·drive normalised by tanh(k), input level assumed at 0.5 of peak, not measured):
   - Filter, no drive: −15.3 dB.
   - Filter then drive (the studio's order): −13.8 dB.
   - Drive then filter (pre-filter order): −16.8 dB.
   - Drive then 24 dB filter: −25.9 dB.

   So the studio order adds about 1.5 dB to the band over the filter alone; moving drive before the filter takes off about 3 dB against the studio order; and 24 dB with pre-filter drive is about 12 dB below the studio order. This is a model with an assumed input level. It agrees with S3's point that a shaper placed where it cannot be filtered is a source of band energy. Correction to S3's implied picture: S3 lists the drive as a generic saturator property. In this studio it is a per-instrument stage after the filter, and its position matters as much as its amount.

2. **The bass's eq3 insert does not cut the target band.** S3 lists `song.js` bass insert: +2 dB low shelf at 200 Hz, high shelf −8 dB at 1.5 kHz. The 1.5 kHz cut is above the band. My estimate (unverified, not modelled) is that the low shelf lifts the bottom edge of the band by about 1 to 2 dB. So the insert is not a 300 Hz to 1 kHz correction. I would not count it as one.

3. **Match EQ must follow per-element attribution, not a master fit.** I agree with S3 that a master match-EQ hides which element is hot. My model supplies a per-element expectation that the attribution method can use: for the bass, the 300 Hz to 1 kHz profile is −15 dB at 12 dB/oct, −25 dB at 24 dB/oct, before its level is set. The step-attribution (O1 P5) needs kick-clean bass steps. Steps 10 and 14 are kick-clean, but they carry stab bleed, and steps 3 and 7 carry kick tail. So the attribution has to use steps 10 and 14 (with the stab handled) and kick-subtracted windows for steps 3 and 7 before a match curve can be trusted.

4. **Corrections to S3.**
   - S3 lists Surge XT's licence as "not found" (S3 is marked as a search-only report). I fetched https://github.com/surge-synthesizer/surge in round 1 and it shows "GPL-3.0 license". O2 already notes this.
   - S3's handoff to me says the mid bass "has B2 with a cutoff of 220 Hz, resonance 3 and an eq3 insert, so its upper harmonics reach into the 300 Hz to 1 kHz band". The first part is correct as a description of the studio. The claim that the bass's upper harmonics are the excess is not established (see Answers, O1 Q5), and the drive placement is the more specific cause.
   - S3's "steeper filter slopes for the sweep sections" is right, and the model puts a number on it: about 9 dB for the bass alone.

5. **Anything I would not adopt from S3.** The "master −1 dB at 400 Hz" is the only master correction. I would not expand it to fix the excess. The 300 Hz to 1 kHz excess is more likely to be fixed at the element (bass filter slope and drive, kick drive per O1 M2) than at the master.

---

## Still open

1. **Mid bass pitch.** Not settled. Needs a kick-excluded per-step spectrum (steps 10 and 14, stab handled; steps 3 and 7 after subtracting a kick template). Owner: O1 (M5 rerun) with H2 to check the note candidates.
2. **Bass share of the 300 Hz to 1 kHz excess.** Needs the studio's per-element levels, a bass-muted render, or the P5 attribution. My model gives the bass's own profile, not its share.
3. **Open303 slope.** My 24 dB/oct reading of the four-pole code is unconfirmed by a response test. The class comment's "18 vs. 24 dB? blah?" is unresolved. Test: sweep the TeeBee filter in code, or run its response.
4. **Web Audio Q in dB.** Not verified by me (spec host did not resolve). Depends on O2's reading.
5. **Drive level.** The 3 dB placement difference assumes an input level of 0.5 of peak. The studio's real voice amplitude is not measured.
6. **Window sensitivity.** The same configuration gave −24 dB at 1 s and −15 dB at 0.25 s in different runs. Any band number needs a fixed, long window before it is scored against the reference.
7. **TAL-BassLine parameters and licence.** Not opened. Needs its manual or page.
8. **Mz101 accuracy and parameter ranges.** Source not read; hardware match not checked.
9. **Whether a 24 dB/oct, resonant, post-filter-drive bass still sounds like the reference.** The model says the 300 Hz to 1 kHz balance moves; it does not say the bass sounds right. That needs a listening test against the reference, which is outside what I can run here.

## Sources

Fetched this round (verified):
- https://github.com/RobinSchmidt/Open303 (repo page; licence text not shown on it; File listing read)
- https://raw.githubusercontent.com/RobinSchmidt/Open303/master/License.txt (MIT, copyright Robin Schmidt 2009; URL built from the File listing on the repo page)
- https://github.com/RobinSchmidt/Open303/tree/master/Source (folder listing: DSPCode, VSTPlugIn)
- https://github.com/RobinSchmidt/Open303/tree/master/Source/DSPCode (file listing; filter and envelope names)
- https://raw.githubusercontent.com/RobinSchmidt/Open303/master/Source/DSPCode/rosic_TeeBeeFilter.h (class comment, four-pole ladder, cutoff clamp, resonance in percent)
- https://raw.githubusercontent.com/RobinSchmidt/Open303/master/Source/DSPCode/rosic_Open303.h (class comment and public setters)
- https://raw.githubusercontent.com/RobinSchmidt/Open303/master/ReadMe.md (clone and CLAP conversion; no synth detail)
- https://github.com/midilab/jc303/tree/main/src (folder listing: dsp, gui, sequencer; file names)

Read in earlier rounds and cited here:
- https://github.com/midilab/jc303 (GPL-3.0; formats; Open303 MIT core)
- https://github.com/simozzer/Mz101 (AGPL-3.0; formats)
- https://github.com/surge-synthesizer/surge (GPL-3.0 licence; corrects S3)
- https://github.com/AudiusProject/303 (round 1)

Search results seen in earlier rounds (not fetched; unverified):
- https://www.pluginboutique.com/product/1-Instruments/4-Synth/434-TAL-Bassline
- https://www.kvraudio.com/product/tal-bassline-by-togu-audio-line
- https://en.wikipedia.org/wiki/Roland_SH-101 (did not resolve)

Did not resolve from this sandbox (ENOTFOUND): https://webaudio.github.io/web-audio-api/ (cited as read by O2, not by me).

Local files read: round2-O1.md, round2-O2.md, round1-S3-saturation-eq-filter.md, `studio/synths.js` lines 118 to 140 (through the `studio` symlink to `olde Havantechno dub studio/`).
