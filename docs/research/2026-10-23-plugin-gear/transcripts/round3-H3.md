# H3: round 3 — answers, revisions, partner report, open questions

Agent model: Haiku 5.5. Date: 2026-10-23.

## What I did this round

- Read `round2-O1.md`, `round2-O2.md` and `round1-S2-delay-reverb.md` in full.
- Web: one WebSearch (limit four). WebFetch of the GitHub pages for webOBXD, webdx7, the Pro-54 patch folder and youth106, plus the junox and Juno60 pages from round 1. The fetch of `https://webaudio.github.io/web-audio-api/` failed (DNS) in this session, so I did not re-check the spec text; O2 read it in round 2.
- Code: I read the archived studio at `/home/user/havantechno/olde Havantechno dub studio/` (the folder the coordinator named). I did not separately check the `studio/` symlink. The archived folder is frozen under its CLAUDE.md, so every change below is a proposal for a new folder.
- A numpy model of the stab's L/R correlation in 300 Hz to 2 kHz, built from the studio's stab geometry and a Juno-style chorus. It is my model, not a render of the studio. Scripts are in the session scratchpad, not the repo: `/tmp/claude-0/-home-user/341aa418-0695-5408-80be-331d2fec6cae/scratchpad/h3_stab_sim.py`, `h3_sweep.py`, `h3_robust.py`. Assumptions are in section 4.

## Facts from code (read this round)

- `olde Havantechno dub studio/song.js` lines 48 to 50: the stab track has `pan: 0`, `params: { cutoff: 1500, env: 2400, decay: 0.17, release: 0.09, detune: 11, spread: 0.5, hp: 180 }`, `chain: [widener width 1.1]`, `sends: { delay: 0.15, reverb: 0.1 }`. No chorus on the stab. The song overrides the synth defaults in `synths.js` (default spread 0.7, detune 10). My round-1 file used the synth defaults; the song uses spread 0.5.
- `processors.js` lines 259 to 271, `BUILD.widener`: mid/side. Mid is `(L+R)/2`, side is `(L-R)/2`, and the side is multiplied by `width` (default 1; the song uses 1.1).
- `processors.js` lines 278 to 292, `BUILD.chorus`: rate 0.05 to 10 Hz (default 0.8, sine), depth 0 to 0.01 s (default 0.003), mix 0 to 1 (default 0.4). The two delays are fixed at 14 ms and 21 ms, modulated in opposite senses. No song track uses it.
- `processors.js` lines 119 to 150, `BUILD.delay`: input goes input → hp → lp → delay line. The feedback gains take their input from the delay outputs, so the tone and hp filters sit outside the loop. S2's finding is confirmed. Ping-pong sets the input gain of the right line to 0.
- `core.js` lines 85 to 95, `K.impulse`: each reverb channel is independent random noise with an exponential envelope, not normalised. The two channels of the reverb IR are therefore uncorrelated by construction. The song's reverb predelay is the default 12 ms.
- `synths.js` line 56 to 58: `v.pan` uses `createStereoPanner` when present.

## 1. Answers

Numbering follows the questions addressed to H3 in `round2-O1.md` (Q6, Q7, Q12) and `round2-O2.md` (Q1, Q6).

### O1 Q6 (to H3 and S4): what mechanism gives about 0.5 at onset, and how much does the 3/16 ping-pong lower the tail?

**Onset mechanism.** The model says the pan geometry alone is not it.

| Variant (300 Hz to 2 kHz, L/R correlation) | Onset 0 to 30 ms | Tail 60 to 115 ms | Note |
|---|---|---|---|
| A. song.js stab: spread 0.5, detune 11, widener 1.1 | 0.84 to 0.90 | 0.19 to 0.63 | Five chord voicings (Bmaj9, C#m9, Emaj7, G#m7, C#m11); onset range is across all five |
| B. round-1 default: spread 0.7, detune 10, no widener | 0.77 to 0.84 | −0.13 to 0.35 | As above |
| C. spread 1.0, detune 11, pan only (for reference) | 0.41 (Bmaj9) | −0.05 (Bmaj9) | Pan alone can reach 0.5 at onset only by collapsing the tail |
| D. mono voice + stereo BBD chorus, wet 1.0 (Juno-60 analysis: base 3.5 ms, ±1.85 ms, 0.513 Hz triangle, right inverted) | 0.44 to 0.61 | 0.51 to 0.63 | Onset at or near the reference range (0.47 to 0.60) for all five voicings |
| E. mono voice + BBD chorus, wet 1.2 | 0.31 to 0.53 | 0.42 to 0.56 | Tail nearer the reference range, onset slightly low for some voicings |
| F. song.js stab + studio chorus insert (14 and 21 ms, mix 0.4) | 0.86 (Bmaj9) | 0.43 (Bmaj9) | The studio's default chorus does not fix onset |

Reading:
- Onset correlation of about 0.5 comes from a decorrelating stereo chorus on a near-mono voice (D and E). It does not come from the stab's pan spread, because the two detuned saws of each note are correlated in the first 30 ms.
- The same result follows from a short algebra check (my derivation, not measured). If L = x + b·x_L and R = x + b·x_R, with the two wet paths decorrelated from each other and from the dry signal, then the correlation is 1/(1+b²). A wet level equal to the dry gives 0.5, matching D.
- The model is sensitive to phase. Web Audio oscillators start at phase 0, so the saws align at note-on, and this drives the high onset values in A and B. That convention is recalled, not verified (see Recalled).

**Tail and the 3/16 ping-pong.** The ping-pong return cannot contribute to the 60 to 115 ms window.
- 0.357 s is exactly three 16ths at 126 BPM (one 16th is 0.119 s).
- The first repeat of a stab lands 357 ms after its onset. That is outside 60 to 115 ms.
- Where the echoes land on the grid (stab pattern A, 0-based steps): step 2 → 5 (no stab), 6 → 9 (no stab), 7 → 10 (stab), 10 → 13 (no stab), 14 → 1 of the next bar (no stab), 15 → 2 of the next bar (stab). So two of six stab echoes land on stab steps. This is O1's Q9 problem: onset-based measurement mixes echoes with new hits.
- So the tail decorrelation at 60 to 115 ms has to come from something with a delay under about 115 ms. The candidates are the reverb (12 ms predelay, with an independent-noise IR, see Facts), the chorus, and other content in the band (O1's non-stab steps measure 0.09 to 0.52).
- For the reverb, a wet return with independent L/R noise at relative level r gives about 1/(1+r²) in the band. Reaching 0.4 needs r ≈ 1.2 relative to the dry stab, and reaching 0.3 needs r ≈ 1.5. The IR's gain is not normalised, so the real level is unknown. I did not measure it.
- Conclusion: a 0.1 reverb send probably does not explain the tail alone. This is a measurement to make, not a settled answer.

### O1 Q7 (to H3): the sub is C#-rooted with occasional B; which progressions fit, and does voicing change?

Evidence (O1 M4 and M6): the sub is mostly 34.5 Hz (about nine cents flat of C#1), with B0 (31.0 Hz) in one bar of eight and 33.3 Hz in another. The lead uses F#, G#, C# and D# (spec).

- F#, G#, C# and D# all lie in C# major. None of the lead notes lies outside C# major, so the lead is consistent with a C#-centred harmony.
- B is the minor seventh of C#. C#7 and C#m7 contain B. An occasional B0 bar fits a C#7 passing chord, or a B chord for one bar.
- The spec's Bmaj9, G#m7, Emaj7 set was chosen over a static B1 sub that M4 and M6 contradict. Bmaj9 has D#, F#, C#, A# but no G#, so it misses a lead tone.
- Candidates, as hypotheses: C#m9 (C#, E, G#, B, D#) and C#m11 (adds F#). Both cover every lead tone and the sub's C# and B. The model used C#m9 and C#m11 as stab voicings and got the same mono-plus-chorus pattern as Bmaj9 (section 1, O1 Q6), so the width advice does not depend on the chord identity.
- Voicing advice that follows from the sub being C#: the stab should not place its root (C#) below about 200 Hz, where it would double the sub and fill the 120 to 300 Hz band. Emphasise the third, seventh and ninth. The model's stab voicings were at octave 4 (about 250 to 1100 Hz).
- Test: P6 in O1's round-2 file (chroma per stab onset after subtracting the kick). Nothing here is measured.

### O2 Q1 (to H1 to H5, S1 to S4): one row per top-three device

Top three as ranked in my round-1 file: 1. junox with the Juno-60 chorus analysis; 2. Youth106; 3. the Pro-54 Cmajor patch.

| Device | Source (open or closed) | Licence (SPDX, as shown) | Browser build | Parameters shown (range or default where a page gave one) | Mapped to spec names |
|---|---|---|---|---|---|
| junox (Juno-60 Web Audio, AudioWorklet) | Open: https://github.com/pendragon-andyh/junox (fetched) | GPL-3.0 ("GPL-3.0 license" on page; a search snippet says GPL-3.0-or-later) | Yes, AudioWorklet (fetched) | junox's own UI ranges: not shown. Chorus from the analysis repo (fetched): modes at 0.513 Hz and 0.863 Hz (stereo), 9.75 Hz (mono, I+II); delay min 1.66 ms, max 5.35 ms | `chorus.rate` {min 0.05, max 10, value 0.51, unit 'Hz'} (matches the existing spec range). New: `chorus.base` {min 0.001, max 0.02, value 0.0035, unit 's'}; `chorus.depth` {min 0, max 0.005, value 0.00185, unit 's'} (current spec max is 0.01 s); `chorus.mix` {0 to 1}; `chorus.invert` (boolean, for the right channel) |
| Youth106 (Juno-106 rebuild, Rust/truce) | Open: https://github.com/nagualcode/youth106 (fetched) | GPL-3.0-or-later (fetched). The "non-commercial" wording from a search snippet is not on the page. | No (VST3, AU, CLAP only) | VCF cutoff 5 Hz to 50 kHz; VCF env ±14 oct; VCF keyboard tracking +3/−2 oct; VCA level ±10 dB; CHORUS I 0.514 Hz and II 0.835 Hz at the same depth, plus an I+II mode; voices 6, 8 or 10. LFO, DCO, envelope ranges: not shown | `chorus.rate` {value 0.514, unit 'Hz'} (in range). Filter cutoff {min 5, max 50000, unit 'Hz'} would need a new range (studio stab cutoff is 100 to 12000 Hz). Env ±14 oct does not map to the studio's Hz envelope: not mapped |
| Pro-54 (Cmajor patch, Prophet-5-style) | Open patch folder: https://github.com/cmajor-lang/cmajor/tree/main/examples/patches/Pro54 (fetched) | Patch licence: not found. Cmajor repo: dual GPLv3 / commercial (per O2 round 2; I did not re-fetch the LICENSE file) | Yes (Cmajor web export, search snippet only) | Not shown. The README gives no control list or ranges (fetched) | None mapped |

### O2 Q6 (to H3): WAM version of webOBXD and webdx7; Pro-54 licence

- **webOBXD** (https://github.com/jariseon/webOBXD, fetched): root entries are Builds, JuceLibraryCode, Source, WAM (folder), .gitattributes, .gitignore, README.md, license.txt. No dependency manifest is linked. The page does not contain "@webaudiomodules/sdk", "@webaudiomodules/api", "WAM 1" or "WAM 2". The README links a JUCE WASM fork. **WAM version: not settled.** Next step: open the WAM folder and check its imports.
- **webdx7** (https://github.com/webaudiomodules/webdx7, fetched): root entries are build, dist, src, LICENSE, README.md. No manifest link. No WAM version string on the page. **WAM version: not settled.** The LICENSE file is present, which supports O2's MIT reading.
- **Pro-54 patch licence: not found.** The patch folder lists gui, worker, Pro54.cmajor, Pro54.cmajorpatch, README.md, icon.png and thumbnail.png; the listing is truncated ("View all files"). No LICENSE is linked from the folder page.

### O1 Q12 (to H1 to H4, S1 to S4): classify the top three

- junox: (b) copyleft, GPL-3.0 (fetched).
- Juno-60 chorus analysis: (c) a published analysis, as text. Its own licence was not checked (I did not open its LICENSE). Treat as (c) until checked.
- Youth106: (b) copyleft, GPL-3.0-or-later (fetched).
- Pro-54 patch: not yet classifiable. No licence found, so it is neither (a) to (d) for now.
- If Tone.js and webdx7 are counted as extra picks: Tone.js is (a) (MIT, fetched in round 1); webdx7 is (a) (MIT, with MSFA Apache-2.0 per O2's fetch).

### Round-1 corrections (my own file)

- My round-1 summary to the coordinator listed Tone.js as third. The file ranked Pro-54 third and Tone.js fourth. The file is the record, so its order stands.
- The round-1 open conflict on Youth106 ("GPL" against "non-commercial") is resolved in favour of the page: GPL-3.0-or-later. The "non-commercial" wording came only from a search description. Its LICENSE file is still unread.

## 2. Revisions to my round 1

1. **The stab is not wide in the mid-band; it is too correlated.** Round 1 said the stab was "wide stereo" from its pan and detune. The model says the song's stab (spread 0.5, detune 11, widener 1.1) sits at about 0.84 to 0.90 onset and 0.19 to 0.63 tail, against the reference's 0.47 to 0.60 and 0.29 to 0.46 (O1 M7). The correction is about the current song setting, not the synth default.
2. **Pan spread is not a route to the onset target.** Raising spread lowers the onset correlation, but only to about 0.4 at spread 1.0. By then the tail is near zero or negative (table, C). Pan cannot match both onset and tail.
3. **Chorus, not widener, is the right tool for the onset.** Mid/side widening only trims the stab's mid-band correlation: from 0.87 to 0.84 at width 1.1 in the model. Broadband widening also hits the full mix. The reference's full mix is 0.93 to 0.96 (O1 M7). With full-mix correlation 0.95 and width 1.5, the algebra gives about 0.89; at width 2, about 0.81. That overshoots, so a broadband widener on the master is the wrong move. A band-limited width (low band mono) is what S4 proposed in round 2, and I agree with it.
4. **The studio's chorus is set in the wrong range for this job.** Its 14 and 21 ms delays are far from the Juno analysis (base 3.5 ms, ±1.85 ms). The studio chorus at default leaves the onset high (model F). It needs a base-delay parameter and a short-delay mode before it can imitate the Juno chorus.
5. **The stab chord set should not stay B-rooted.** See O1 Q7 above.

## 3. On my partner's report (S2)

Where S2 and I must agree, and what I would correct.

- **Where width comes from (S2 round 1 asked this).** The model says: a voice-level decorrelator (chorus or a detuned pair) gives onset width. A send can supply tail width only through the reverb's independent L/R IR, at a level I could not confirm. The delay send cannot supply width in 60 to 115 ms. S2's "send, widener, or both" should become: voice first, reverb second, band-limited widener last.
- **Delay.** S2's finding that the tone and hp filters sit outside the feedback loop is correct (Facts above). I add two things for the stab: (a) its 3/16 echoes land on other stab steps, so echo and new hit cannot be separated by onset alone; (b) the tone filter inside the loop would darken each repeat, which matters for the stab's dark-tail character. Fix placement is S2's, and I agree with its `inLoop` proposal.
- **Reverb.** S2 recommended Freeverb, with its stereo spread of 23 samples on every line. In a stab tail, Freeverb's per-line decorrelation may matter more than the send level. That needs the same band-correlation test. I would not assume the studio's own convolver behaves like Freeverb, since its IR is independent noise per channel.
- **Loop length.** S2 said a loop under one render quantum would need a worklet. O2 verified the spec clamp to 128 frames. Freeverb's comb lengths (1116 to 1617 samples) are above 128, so no correction here.
- **Correction to S2.** None substantive. S2's claim that repeats do not darken is confirmed by the code. S2's round-1 note that the clap's reverb tail is "generic advice" remains true; I found nothing better.

## 4. Still open

- **The tail (60 to 115 ms, reference 0.29 to 0.46).** The model's tail is chord-dependent for pan-only variants (−0.1 to 0.6) and sits about 0.1 to 0.2 high for the mono-plus-chorus variants (0.42 to 0.63). The reverb with its independent-noise IR is the likely contributor, but its level is unknown. Needs a render with the reverb send on.
- **Juno chorus fidelity.** Juno-60 rates are 0.513 and 0.863 Hz; Youth106's Juno-106 rates are 0.514 and 0.835 Hz. The 106 and 60 differ in the BBD chips. The junox analysis is disputed in parts (its author says Chorus 1 and 2 may be flangers, and a KVR thread disputes some numbers). Not resolved.
- **WAM versions.** Not settled for webOBXD or webdx7 from the repo root. Needs the WAM folder (webOBXD) and the source imports (webdx7).
- **Pro-54 licence.** Not found.
- **Model assumptions.** Equal-power pan law: the MDN search snippet says StereoPannerNode uses "a low-cost equal-power panning algorithm"; the spec's exact gain formula was not checked (fetch failed). Oscillators start at phase 0. No filter sweep, no envelope on the filter, no reverb, no delay. One chord set family at octave 4, and a 0.35 s window. The numbers vary with phase and window, so the table is a direction, not a value. A render with P1 (run M1 to M9 on the studio render) is the real test.
- **Placement.** Every change in section 2 belongs in a new folder. The archived `olde Havantechno dub studio/` is frozen under its CLAUDE.md.

## Recalled, not verified

- Web Audio oscillators start at phase 0 at `start()`. Recalled, not checked against the spec this session.
- StereoPannerNode uses an equal-power law. The MDN snippet says "equal-power"; the exact formula is not verified.
- Freeverb's stereo spread is 23 samples. Taken from S2's round-1 file (S2 verified it on search snippets), not re-checked here.

## Handoffs to other agents

- **S4 (widener, chorus, modulation):** a band-limited width (low band mono) and a chorus with `base` and `invert` parameters. Please check whether `chorus.base` at 3.5 ms changes the studio's other uses of the chorus. The mid/side width formula I used is the one in `BUILD.widener` (lines 259 to 271).
- **S2 (delay and reverb):** the reverb's independent-noise IR and its level. Please give the reverb's effective wet level on the stab (IR energy is not normalised in `K.impulse`).
- **O1:** P6 (chroma per stab onset) to test C#m9 or C#m11 against Bmaj9; P1 (render-and-score) for the tail question.
- **H2:** the bass partials (O1 M5) may be harmonics or stab bleed; with the sub at C#1, H2 should check whether a C#-rooted bass explains them.
- **H5:** webOBXD's WAM folder is where the WAM version question is answered; H5 holds the WAM catalogue notes.

## Questions for the Opus agents

1. Should the stab's decorrelation move into the voice (per-note chorus or detune pair) or onto the track bus (chorus insert)? The model gives the onset for a near-mono voice with a stereo chorus, but says nothing on which placement the reference used.
2. Who decides the stab's chord set before any voicing change? I recommend P6 first, since the B-rooted set rests on a sub the reference does not have.

## Sources

Fetched this round:
- https://github.com/jariseon/webOBXD
- https://github.com/webaudiomodules/webdx7
- https://github.com/cmajor-lang/cmajor/tree/main/examples/patches/Pro54
- https://github.com/nagualcode/youth106

Fetched in round 1 and re-cited:
- https://github.com/pendragon-andyh/junox
- https://github.com/pendragon-andyh/Juno60/blob/master/Chorus/README.md?plain=1
- https://github.com/cmajor-lang/cmajor/blob/main/LICENSE.md (cited in O2 round 2; not fetched by me this round)

Search result this round (snippet only):
- https://developer.mozilla.org/en-US/docs/Web/API/StereoPannerNode/StereoPannerNode

Attempted, failed (DNS): https://webaudio.github.io/web-audio-api/ (read by O2 in round 2).

Local files read: `round2-O1.md`, `round2-O2.md`, `round1-S2-delay-reverb.md`, `round1-H3-stab-pad.md`; in `olde Havantechno dub studio/`: `song.js`, `synths.js`, `processors.js`, `core.js`.
