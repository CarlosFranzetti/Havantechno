# H4: Hats, clap, shaker and percussion — round 3
Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.
Folder used: `olde Havantechno dub studio/` (the archived studio; `studio/` is a symlink to it). Code paths below use the real folder name.

**Research this round.** Four WebSearch calls, the most this round allowed. No page fetches were tried. Round 1's fetch failures (DNS and egress policy 403) were not retried. Every "verified" tag below means a search excerpt from that URL supported the claim. `(unverified)` means the excerpt's page was not identified, or the claim is from memory, a forum, or a vendor's marketing text I could not read in full. Verification tags follow the BRIEF.

---

## 1. Answers

Questions addressed to H4 in `round2-O1.md` and `round2-O2.md`, by number. I checked the numbers against the files directly. O1's Q8 and Q12 and O2's Q1, Q7 and Q14 name H4.

### O1 Q8 (to H4): does the open hat's 1.5 kHz ring under a 5.9 kHz centroid fit an 808-style six-square bank, or a sampled 909-style cymbal? What would you change in `hatBuild` (ratios, `hp2`)?

**Short answer.** Neither source settles it. Two points in my round-1 file need correcting first.

- **The 200–800 Hz figure is not an 808 hat figure.** Cherry Audio's documentation gives roughly 200–800 Hz for the four-or-six-square-wave approach, and in this round's search the same page is read as applying "to Roland-style cymbals in general, not specifically to the 808 hats" (verified: https://docs.cherryaudio.com/misfit-audio/transistor-808-hats, excerpt). My round-1 file said "cymbal", but O1 read it as a hat figure. I withdraw any reading of it as an 808 hat frequency. A search for the 808 hat oscillator frequencies returned nothing usable: "not found" (verified: https://r2.gear4music.com/media/48/487019/download_487019.pdf reports measured variation between original 808s, but gives no Hz values, excerpt).
- **Roland's 909 cymbals are sampled in both Roland excerpts.** The disagreement is only about the 909 hat (see round 1). So "909-style cymbal" is settled as sampled, and the open hat question is about the hat only.

**What the studio's hat actually produces.** In `olde Havantechno dub studio/synths.js`, the metal part is six squares at ratios 0.62 to 1.73 times `ring` (default 1500 Hz, so about 930 to 2600 Hz), through a bandpass at Q 4 and then `hp2`, a highpass at `tone * 0.5` (3500 Hz for the open hat in `song.js`). The noise part is a highpass at `tone` (7000 Hz for the open hat). So the studio's bank sits about twice as high as the Cherry span, and the bandpass at 1.5 kHz picks out the ring.

**On `hp2`.** O1 says `hp2` "kills" the 1.5 kHz ring. My arithmetic says it attenuates it, by about 15 dB at 1.5 kHz, if the highpass were Butterworth (Q 0.707). Web Audio reads that Q in dB for highpass, not linear (per O2 item 14, verified: https://webaudio.github.io/web-audio-api/). So the real figure, with Q 0.7 dB, needs a render. "Attenuated by roughly 15 dB, exact value unmeasured" is the honest reading.

**What the reference can tell us, with a test.**
1. **P4 from O1** (already proposed): compare the open-hat step in the build, where hats enter, with an intro2 step that has only closed hats. Look for a 1.5 kHz partial. This separates the ring from the rest of the hat.
2. **Synth or sample, a test I did not see proposed:** if Polynominal's "18 kHz" is the sample rate (its excerpt reads "3 PCM samples coded at 6 bits resolution and 18 kHz frequency"; verified: https://www.polynominal.com/m/roland-tr-909.htm), the Nyquist limit is 9 kHz. A sampled 909-style hat would then have almost no energy above 9 kHz. The reference is a 192 kbps MP3, which keeps content above 9 kHz, so measuring the reference open hat's energy above 9 kHz is a valid test. Strong energy there argues against an 18 kHz sample. This is my inference, not a source's claim.

**What I would change, if the tests agree.**
- Do not change the ratios yet. Make the bank base frequency a parameter (`ring` today), so the 808-style low base and a 1.5 kHz ring can be tried separately.
- Make the metal part's highpass a parameter, with a lower default than 3500 Hz, and render with it. Do not remove `hp2` on the strength of the arithmetic above.

### O1 Q12 (to H1, H2, H3, H4, S1, S2, S3, S4): classify your top three

My round-1 top three, classified. Only (a) to (d) are used. Where none fits, I say so.

| Item | Class | Basis |
|---|---|---|
| Keep the in-house hat and clap DSP (`synths.js`) | Own code, not one of (a) to (d). The repo has no LICENSE file, so the owner decision in O2 section 5 applies | Repo |
| Ableton DS HH and DS Clap, used as a parameter-name template | (d) closed binary. We copy names and control types, not code | Manual excerpt (verified: https://www.ableton.com/en/live-manual/12/max-for-live-devices) |
| Browser TR-808 repos (gsspdev/TR_808_Emulator, vincentriemer/io-808, ewanders1-web/tr-808, jeco123/beatcraftery) | Unclassified. No licence found in any of them, so default copyright applies until one is found | Repo pages seen in search (verified: https://github.com/gsspdev/TR_808_Emulator and the others listed in round 1) |

Two further items from round 1, for completeness: Tone.js MetalSynth is (a) MIT per H5's fetch (I have not read the licence myself). The ICMC 2014 paper on the 808's six-oscillator bank is (c), a published paper (verified: https://speech.di.uoa.gr/ICMC-SMC-2014/images/VOL_2/1453.pdf, excerpt).

### O2 Q1 (to H1–H5, S1–S4): one row per device in your top three

For closed devices: the parameters that define the character, with ranges, mapped to our spec names. "not found" means the excerpts gave no range.

| Device | Source available | Licence (SPDX) | Browser build | Parameters, ranges, spec mapping |
|---|---|---|---|---|
| Ableton DS HH (closed device) | closed | closed; SPDX not applicable | none; desktop Live only | Noise: white or pink toggle. Maps to a new `noise` option on `hat_closed` and `hat_open` (not in spec today). Tone: high-pass cutoff, range not found, maps to `tone` (spec 2000–12000 Hz). Decay: range not found, maps to `decay` (spec 0.01–1.5 s). Volume: maps to `level`. Sources: manual excerpt (verified: https://www.ableton.com/en/live-manual/12/max-for-live-devices) |
| Ableton DS Clap (closed device) | closed | closed; SPDX not applicable | none | Tone (brightness, range not found), maps to `tone` (spec 400–6000 Hz). Tune, not found, no spec entry. Decay, range not found, maps to `decay` (spec 0.03–0.6 s). Tail (filtered noise added to the impulse), maps to `tail` (spec 0–1). Volume maps to `level`. Source: as above |
| Tone.js MetalSynth | Tone.js is open source. Repo URL not seen; npm mirror seen (verified: https://app.unpkg.com/tone@15.1.8/files/build/esm/instrument/MetalSynth.d.ts) | MIT per H5's fetch of Tone.js (not read by me) | yes, Web Audio, no WAM | harmonicity (positive, range not found), modulationIndex (not found), octaves (not found), resonance (sets the lower filter limit, not found), envelope (ADSR, not found). Maps: resonance to a floor for `tone` (spec 2000–12000 Hz); envelope decay to `decay`. harmonicity and modulationIndex have no spec entry |
| TR-808 browser repo, gsspdev/TR_808_Emulator (open code, no licence found) | yes, public GitHub (verified: https://github.com/gsspdev/TR_808_Emulator) | none found | yes, plain JS ES6, Web Audio | Parameters not read. The excerpt says it has eight synthesised voices, closed and open hats included, a 16-step sequencer and tempo 60 to 180 BPM. No hat parameters or ranges found |

### O2 Q7 (to H4): a choke rule precise enough to implement: which voice cuts which, and instant or fast release (ms)?

**What the sources support.**
- **Analog Rytm MKII (hardware).** Closed and open hats share one voice. The track partners "are always triggered selectively, but never simultaneously" (verified: https://www.perfectcircuit.com/m2e/elektron-analog-rytm-mkii.html, excerpt). So the cut is a voice steal by design. The excerpt gives no ms figure.
- **Ableton Drum Rack.** Choke groups exist (verified: https://unison.audio/ableton-drum-rack/, excerpt). The excerpt gives no release time. **Release time: not found.**
- **808.** An excerpt says the open and closed hats cut each other when triggered together, but names no source. Unverified. No ms figure.

**The rule I can state from the sources:** a closed-hat onset steals the open-hat voice. The open hat's envelope stops at that onset. This is the Rytm's voice-steal behaviour, and the Ableton choke group is the same idea in software.

**Not sourced (my design choice, to test):** a release of about 5 ms after the steal, to avoid a click. Test: in the reference, does the open hat's tail stop at a closed-hat onset? That needs the reference's step map for both hats, which S5's transcription may supply (see the question to S5 below).

**Other things I could not answer.** Plaits firmware licence: not read. I have no repository URL for it, and fetches are blocked. The search excerpt said MIT for STM32 code, GPL-3.0 for AVR code, and CC-BY-SA 3.0 for hardware, from a page I did not identify (unverified).

### O2 Q14 (to S5 and H4): do adtof_plus_drum_transcription or drum2midi output open and closed hats as separate notes (GM 46 and 42) with durations, so a choke rule can be inferred? Or only onsets?

From S5's round-1 file, which fetched both repositories (I did not fetch them this round):
- drum2midi writes GM numbers on channel 10: closed hat 42, pedal hat 44, open hat 46, PPQ 960 (verified, fetched by S5: https://github.com/mykolad/drum2midi).
- ADTOF has five classes at 100 fps (a 10 ms frame), and "hat open/closed by sustain" (verified, fetched by S5: https://github.com/xavriley/adtof_plus_drum_transcription).

So the answer is: separate notes (46 and 42), and their durations come from the sustain rule. The 10 ms frame limits the timing resolution of any choke read from these tools. The sustain threshold that separates open from closed is not found. I did not check whether note durations are written as sustain lengths; S5 would have to confirm that. A choke inference from the reference is possible at roughly 10 ms resolution, which is coarse for a steal that should be close to instant.

---

## 2. Revisions to my round 1

**R1. `hp2` and the ring.** Round 1 said the 1.5 kHz ring is "not removed" by `hp2`. That is correct, but it was not quantified. Now: `hp2` attenuates the ring by roughly 15 dB (open) and 16 dB (closed, at 3750 Hz), if the filter were Butterworth. Web Audio reads that Q in dB, so treat the figure as approximate (see O1 Q8 above).

**R2. The 200–800 Hz span.** My round-1 wording was "cymbal", and O1 read it as hats. Corrected in section 1 above. The 808 hat oscillator frequencies: not found, this round or round 1.

**R3. The measured variation between 808s.** Round 1 attributed it to vendor pages (kraftmusic, rubadub). The source is the Tiptop HATS808 manual PDF, which appeared in this round's search results: https://r2.gear4music.com/media/48/487019/download_487019.pdf (excerpt, unverified page open). The claim itself is still a vendor claim.

**R4. The 909 cymbal and hat.** Round 1 framed the 909 conflict as Roland against Polynominal. The Roland excerpts also disagree with each other about the hat, and both place the cymbals in the sampled group (verified: https://www.roland.com/us/company/press_releases/2018/ROLAND-VIRTUAL-SONICS-ANNOUNCES-THE-RELEASE-OF-THE/ and https://www.gearnews.com/?p=259080, excerpts). Recorded in section 1.

**R5. Tone.js licence.** Round 1 said "not found". O2 records H5's fetch of Tone.js as MIT. I have not read the licence myself.

**R6. Choke.** Round 1 recommended a choke rule with no source. Now sourced for the rule's shape (Rytm voice steal, Ableton choke group, both excerpts). The release time remains not found.

**R7. Shaker (not reached in round 1).** Four searches this round: shaker, Ableton's DS Tom, the 808 cowbell, and the 808 hat frequencies. The shaker findings:
- **Recipe, consistent across excerpts.** Noise into a bandpass or lowpass filter, then a short amplitude envelope. Variants add grain, multiple voices, or velocity variation.
  - Cycling 74's !SHAKE! patch: white noise through a bandpass, with eight voices at slightly different centres and delays, and two strokes per cycle, the second softer (verified: https://cycling74.com/projects/shake, excerpt).
  - MusicRadar on synthesising drums from noise: "Any synth with a noise generator can be used for basic drum design" (verified: https://www.musicradar.com/how-to/synthesize-drums-noise, title only; the body of the page was not read).
  - An Elephorm course on a Maschine drum synth describes a granular shaker with grain size, a bandwidth filter, and a Tune control that moves it toward maracas (verified: https://www.elephorm.com/formation/audio-mao/maschine/apprendre-maschine-2x/fonctionnalites-du-shaker-dans-le-drum-synth, French, excerpt).
  - A forum builder suggests a decay of about 150 to 200 ms for punch (unverified: forum, page not identified; KVR thread seen at https://www.kvraudio.com/forum/viewtopic.php?p=2738391, which I did not open).
- **Our shaker** (`BUILD.shaker`, `song.js`): bandpass at 6500 Hz, Q 1.2, attack 6 ms, decay 70 ms, pan +0.3. The decay is shorter than the forum's 150 to 200 ms. That is a candidate to test against the reference, not a finding.
- **Our pattern** `XoxoXoxoXoxoXoxo`: accents on the beats, alternating soft and normal 16ths. The reference's shaker pattern and its level are not measured. A shaker band (roughly 4 to 10 kHz) measurement per 16th in the breakdown would settle it.
- **Not found:** the internal shaker design of any specific drum machine.

**R8. Percussion (not reached in round 1).**
- **Ableton DS Tom** (from the German Live 12 and Spanish Live 11 manuals, excerpt): Pitch (tunes it, in Hz), Color (gain and cutoff of a filter), Tone (a resonant bandpass that mimics a drumhead), Bend (pitch envelope), Decay, Volume. The DS Tom is not in the Intro, Lite or Standard editions (Live 11 German excerpt). The English labels were not confirmed, because the English pages cut off before the DS Tom section (verified: https://www.ableton.com/de/live-manual/12/max-for-live-devices/ and https://www.ableton.com/es/live-manual/11/max-for-live-devices/, excerpts).
  - Mapping to our perc (`BUILD.perc`: sine at 380 Hz with a drop of 0.5, plus a 2500 Hz noise tick): Pitch to `pitch`, Bend to `drop`, Decay to `decay`. Tone and Color have no spec entry. Our perc has no resonant bandpass body.
- **808 cowbell** (a percussion voice, and a useful model for a tuned perc): two square-wave oscillators at about 540 Hz and 800 Hz, from a forum thread and a blog. Unverified. The forum converts service-manual cycle times; the blog gives the same frequencies (verified as seen: https://lookmumnocomputer.discourse.group/t/tr-808-cowbell-tuning-question/4374 and https://midnightrebels.com/roland-tr-808-cowbell-synthesis-history-drift-phonk/, excerpts). The cowbell circuit is described as two square oscillators, each modulated by an envelope, summed, then filtered, with a bandpass near 850 Hz by one builder's experiment (unverified). Tiptop's CB808 clone uses the same two-oscillator, bandpass architecture (verified: https://www.ctrl-mod.com/products/tiptop-audio-cb808, excerpt).
- **The reference's percussion** is not identified as a cowbell, a tom, or anything else. The breakdown's pitch content is not measured. The test: find the spectral peaks of the breakdown perc hits, and compare with 380 Hz (our default) and with a tuned pair.

**R9. Step maps checked.** Round 1 took the spec's step map on trust. Checked now against `song.js`: `hat_open` A `..x...x...x...x.` (steps 2, 6, 10, 14), `hat_closed` A `.......x.......x` (steps 7, 15), clap A `....x.......x...` (steps 4, 12), kick A `x...x...x...x...` (steps 0, 4, 8, 12). The spec and the song agree. The clap and kick coincide on beats 2 and 4 (see section 3).

---

## 3. On my partner's report (S4, `round1-S4-limiter-width-modulation.md`)

### 3.1 Where drum design and width must agree

**Current layout (from `song.js` and `processors.js`).**
- Pans: `hat_open` +0.08, `hat_closed` −0.08, `shaker` +0.3, `perc` −0.3. The clap and kick are centred.
- The widener is used only on `stab` (`chain: [{ type: 'widener', width: 1.1 }]`).
- Drums get stereo only from their sends. The delay is ping-pong. The reverb is stereo at its output, assumed from the send design and not read.

**What the reference measures (O1, M7).** Mid-band correlation in mainA: 1.00 below 150 Hz, 0.80 at 150 Hz to 1 kHz, 0.65 at 1 to 4 kHz, 0.84 above 4 kHz. In the break, 1 to 4 kHz falls to 0.32. The full mix is 0.93 to 0.95 in the main sections.

So the reference is least correlated in the 1 to 4 kHz band, and the top band is at 0.84. Our hats and clap are near-mono, and our top band is probably more correlated than the reference's. That is a prediction to check on an offline render (O1's P1). It is not a finding.

**Policy I would propose, and where it disagrees with S4.**
1. **Keep the kick, the sub, and the clap body centred.** The clap's centroid is about 2.7 kHz, which is inside the band S4 would widen if the crossover sat at 120 to 200 Hz. A crossover set that low would widen the clap body.
2. **Widen hats per hit, not per band.** A small random pan per hit, kept mono-compatible, is the drum version of the stab's onset width. Test it against the reference's 4 to 16 kHz correlation of 0.84.
3. **Use the stereo reverb and delay tails** as the main decorrelator for the clap, not the dry clap.
4. **Disagreement with S4:** width belongs to each track, not to a master crossover. A master band-split width would widen the clap body and the open hat's ring, which both sit above 1 kHz, and I would not want that on drums.

**A confound in O1's M7 measurement.** O1's stab-step set (2, 6, 10, 14 in mainA) is exactly the open-hat set in our spec pattern. The mainA stab pattern `..x...xx..x...xx` also hits steps 7 and 15, which are the closed-hat steps. So every stab onset in mainA coincides with a hat. The reference's stab-step figure (0.47 to 0.60 at onset, 0.29 to 0.46 later) may include the hats. Hats are near-mono, so they would push the correlation up. The stab alone might therefore be less correlated than 0.47 to 0.60. Round 1 and S4 both treated 0.41 as a stab property; this confound should be on the list of open questions.

- **Break as a cleaner window.** The break has no hats (its `play` list has no `hat_open` or `hat_closed`). The stab pattern B `..x...x...x...x.` falls on 2, 6, 10, 14, and the clap falls on 4 and 12. But the perc pattern A `x.x..xx.x.xx.xx.` also covers 2, 6, 10 and 14, and the shaker runs on every step at pan +0.3. So a clean stab-width test in the break needs the reference's perc and shaker step maps first. That is a question for S5 or O1.

### 3.2 Transient handling at the limiter

**What the master limiter does (`processors.js`).** Master chain: eq3, highpass 24 Hz, lowpass 20 kHz, glue compressor (threshold −14, ratio 2.5), saturator, then a limiter (threshold −2 dB, release 0.08 s, ceiling −0.6 dB). The limiter is a `DynamicsCompressorNode` with ratio 20 and attack 1 ms. It has no true-peak detection.

**Correction to S4's framing.** S4 says the native limiter's look-ahead "cannot be set from the code" (correct), and recalls a fixed pre-delay of a few ms (recalled). O2 item 16 now verifies that: the spec's informative graph has a 6 ms DelayNode in front of the gain stage, and it describes a fixed look-ahead (verified: https://webaudio.github.io/web-audio-api/, via O2). So the native limiter does have about 6 ms of look-ahead, fixed. The transient problem is therefore not "no look-ahead". It is the interaction of the clap flams with the release.

**The clap flams and gain reduction.** Our clap fires three flams 11 ms apart (0, 11, 22 ms), then a body at 33 ms, with a 160 ms body decay and a 350 ms tail. With ratio 20 and release 80 ms, each flam can pull the limiter down, and the release carries that reduction through the body and into the next 16th. A longer look-ahead does not fix that. Look-ahead shapes the gain before a peak. It does not stop release-driven reduction after the peak. So the lever for the clap body is the release time, or keeping the clap off the master limiter's detector.

**Which events set the peaks.** In the arrangement, kick and clap coincide on beats 2 and 4 (kick 0, 4, 8, 12; clap 4 and 12). So the limiter's gain reduction is most likely set on those two beats. This is a hypothesis for the render, and it is a testable one: O1's M9 gives the reference's sample peak (−0.18 dBFS) and true peak (+0.01 dBTP), but not where the peaks fall. Finding the beat position of the reference's sample peaks would test it.

**Test to run (not run).** Render with the master limiter bypassed and with it on. Measure the clap body energy (1.9 to 3 kHz, the clap's band) in each. The difference is the limiter's cost on the clap.

**Ceiling.** S4's Q10 asks whether we should target 0 dBTP. Our ceiling is −0.6 dB with no true-peak stage, so the drums (kick and clap on beats 2 and 4) carry most of the peak budget. A true-peak stage after the limiter, as S4 suggests, is the fix for that, and it should be measured with the drums in.

### 3.3 Other corrections and agreements

- **Agreement:** S4's "widen from the mids upward" is right for the stab and the reverb. It is wrong, in my view, for the clap body and the hat ring, which sit above 1 kHz in the band it would widen. See 3.1 point 4.
- **Agreement:** S4's Correlometer and libebur128 are the right measurement tools, and I would use them on the drum stems as well as the mix.
- **Correction:** the stab-step confound in 3.1 means the 0.41 figure, and M7's 0.47 to 0.60 at onset, cannot be read as the stab's own width until hats are removed from the measurement.
- **Caveat on S4's 120 to 200 Hz crossover:** that is S4's own suggestion, not from a source (S4 says so). I agree it should be tested, not adopted.

---

## 4. Still open

1. **Hats: synthesised or sampled?** Two tests, neither run: (a) the reference open hat's energy above 9 kHz, which an 18 kHz 6-bit sample would not have; (b) P4 from O1, the 1.5 kHz partial in the build against intro2.
2. **The 808 hat's oscillator frequencies.** Not found in any source I have. Without them, the studio's 930 to 2600 Hz bank cannot be compared with the 808.
3. **Choke release time.** Not found. The rule's shape is sourced; the milliseconds are not.
4. **Does the closed hat cut the open hat in the reference?** Needs S5's step map and the ADTOF or drum2midi sustain rule. Unanswered.
5. **Shaker and percussion in the reference.** No step map, no level, no pitch. Our shaker and perc defaults are untested against the reference.
6. **Where the reference's peaks fall.** On beats 2 and 4, or elsewhere. This decides whether the clap's gain reduction matters for the reference's loudness.
7. **Stab width without hats.** Needs the reference's hat, perc and shaker steps before M7 can be read cleanly.
8. **Licences.** Plaits firmware (no repo URL seen). Tone.js MetalSynth (MIT per H5, not read by me). TR-808 browser repos (none found).
9. **The sources' status.** Every verified tag in this file is a search excerpt. No page was opened in full in either round.

---

## Sources

Seen this round, in search results or read as excerpts. None was opened in full.

- https://docs.cherryaudio.com/misfit-audio/transistor-808-hats
- https://r2.gear4music.com/media/48/487019/download_487019.pdf
- https://www.ctrl-mod.com/products/tiptop-audio-cb808
- https://www.polynominal.com/m/roland-tr-909.htm
- https://www.perfectcircuit.com/m2e/elektron-analog-rytm-mkii.html
- https://unison.audio/ableton-drum-rack/
- https://www.ableton.com/en/live-manual/12/max-for-live-devices
- https://www.ableton.com/de/live-manual/12/max-for-live-devices/
- https://www.ableton.com/es/live-manual/11/max-for-live-devices/
- https://app.unpkg.com/tone@15.1.8/files/build/esm/instrument/MetalSynth.d.ts
- https://github.com/gsspdev/TR_808_Emulator
- https://speech.di.uoa.gr/ICMC-SMC-2014/images/VOL_2/1453.pdf
- https://cycling74.com/projects/shake
- https://www.musicradar.com/how-to/synthesize-drums-noise
- https://www.elephorm.com/formation/audio-mao/maschine/apprendre-maschine-2x/fonctionnalites-du-shaker-dans-le-drum-synth
- https://www.kvraudio.com/forum/viewtopic.php?p=2738391
- https://lookmumnocomputer.discourse.group/t/tr-808-cowbell-tuning-question/4374
- https://midnightrebels.com/roland-tr-808-cowbell-synthesis-history-drift-phonk/
- https://webaudio.github.io/web-audio-api/ (read through O2, not this round)

Carried from round 1 and this round's other answers, read in round 1 or in S5's and O2's files:
- https://www.roland.com/us/company/press_releases/2018/ROLAND-VIRTUAL-SONICS-ANNOUNCES-THE-RELEASE-OF-THE/
- https://www.gearnews.com/?p=259080
- https://github.com/mykolad/drum2midi (fetched by S5)
- https://github.com/xavriley/adtof_plus_drum_transcription (fetched by S5)
