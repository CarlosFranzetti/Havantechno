# Gear Crew report: what gear recreates a source track inside Havantechno

Coordinator: the Fable session. Written 2026-10-23 17:12:06 UTC. Process: Roundtable (see `../README.md`). Every claim below comes from a transcript in `transcripts/` and carries that file's verification grade. The agents could rarely open a web page from the research sandbox (DNS and proxy failures), so most product facts rest on search-result excerpts and are marked so in the transcripts; the numbers about the reference track come from numpy measurements O1 ran on the MP3, with the method stated per row in `transcripts/round4-O1.md`. Nothing here was verified by listening.

## 1. The question, and how the answer changed

The brief asked what plugins, instruments, effects and analysis tools could recreate a source track element by element, what could run in a browser, and what a realistic gear list would cost. Four rounds later the answer has two parts the brief did not anticipate:

1. **The spec the studio was built from was partly wrong.** The original analysis measured rhythm and pitch, not timbre, and several of its rows do not survive measurement (section 3). Re-measuring came before choosing gear.
2. **Almost nothing can be adopted as-is.** No VST3, AU or CLAP binary runs in a browser (O2, verified from the SDK licences and the standards), and the one browser plugin standard (Web Audio Modules 2.0, MIT) has a thin catalogue for electro. The realistic gear is the studio's own devices extended, reimplementations of published or permissively licensed algorithms, and an offline Python front end for stems and transcription.

Mid-way through the final round the owner redirected the product to a **Mac or PC desktop DAW**. That reopens real plugin hosting and removes the browser boundary for analysis; section 7 covers it. The browser findings stay true for the archived studio and any web build.

## 2. The team and the rounds

Twelve agents: five Haiku on instrument categories (H1 kick and sub, H2 mid bass, H3 stabs and pad, H4 drums, H5 lead, FX and browser synth engines), five Sonnet on processors and the pipeline (S1 sidechain and compression, S2 delay and reverb, S3 saturation, EQ and filters, S4 limiting, width and modulation, S5 stems and transcription), two Opus (O1 the whys and hows, O2 the platform). Round 1: twelve reports. Round 2: O1 and O2 critiqued all ten and asked 27 numbered questions; O1 ran nine measurements on the reference. Round 3: the ten answered and each reviewed a partner's report. Round 4: O1's corrected measurement table and element-by-element changes; O2's final gear list, build order, pipeline contract and desktop options. All 36 files are in `transcripts/`.

## 3. The reference track, as measured (replaces the spec's table)

From `transcripts/round4-O1.md` section 1, with O1's confidence grades. The band-energy table and per-section loudness are there in full.

| Element | What was measured | Confidence |
|---|---|---|
| Grid | 126.0 BPM, one beat exactly 21,000 samples at 44.1 kHz, first kick at 0.568 s, no drift over 195 bars, no swing detected (the studio's 0.06 swing is about 2.4 ms). | High |
| Form | Section starts at bars 24, 40, 104, 120, 136, 184; content ends at bar 200. These match `song.js`'s bar counts but not the spec's clock times (0:44 and 3:16 are 2 to 3 s early). | High |
| Kick | Pitch glides as 51 + 213·e^(−t/24 ms) Hz: about 184 Hz at 10 ms, 76 at 50 ms, 52 at 150 ms. Body holds near full level to 60 ms, −6 dB at 100 ms, −18 at 150, −34 at 200. Click about 45 dB below the body: effectively none. | High |
| Sub | **A free-running drone, not a pluck.** 34.47 Hz (C#1), with B0 in one bar of eight. **Ducked on every kick:** −15 dB at 40 to 60 ms, about −12 dB to 120 ms, back to −2.5 dB by 200 ms, a shape that follows the kick body. | High |
| Mid bass | Steps 3, 7, 10, 14 (from the spec). Pitch unmeasured; the partials are not a B2 series. Intro target for 300 Hz to 1 kHz relative to 20 to 300 Hz: −19 to −22 dB in bass-step windows. | Medium / unmeasured |
| Stabs | Steps 2, 6, 7, 10, 14, 15. Chords unmeasured (Bmaj9 etc. was a guess; H3 proposes C#m9 or C#m11 to fit the drone). L/R correlation in 300 Hz to 2 kHz: 0.47 to 0.60 at onset, 0.29 to 0.46 in the tail, but hats land on the same steps, so the figure is confounded. | Low |
| Clap | Beats 2 and 4, centroid about 2.7 kHz; a tail at about −10 dB through 150 to 230 ms, wide (correlation 0.32 to 0.40), so a send reverb rather than an in-voice tail. | Medium |
| Hats | Full-band (9 to 16 kHz only 3.5 to 4.3 dB below 4 to 9 kHz), which argues against a raw low-rate sample. The spec's "1.5 kHz ring" is not a hat property. | Medium |
| Shaker, perc, pad | Unmeasured. | — |
| Lead | Note set F#4 G#4 C#5 D#5 (spec contour). Melody and timbre unmeasured. | Low |
| Riser, impact | No distinct noise riser or impact found; the transitions are a rise in the whole mix's spectral centroid plus the drone fading in. | Low |
| Delay | No ping-pong alternation detected; 3/16 stays an assumption. | Low |
| Master | −10.7 LUFS integrated, sample peak −0.18 dBFS, true peak +0.01 dBTP; per section −9.9 to −12.5 LUFS, PLR 9.9 to 12.1 dB. Full-mix L/R correlation 0.93 to 0.96. | High |

Rows the spec should drop: the 130→43 Hz in 60 ms sweep, the plucked B1 sub, the click on top, "bass root B1 throughout", the hat ring, and the clock times.

## 4. What to change in the recreation, element by element

From `transcripts/round4-O1.md` section 2, which marks each item agreed (named agents, no dissent) or contested.

- **Kick (agreed):** replace the linear ramp with an exponential approach, `setValueAtTime(punch)` then `setTargetAtTime(tune, t, tau)`, with a new `tau` parameter (about 24 ms) replacing `sweep`; a hold-then-decay amplitude envelope; click 0. Contested: how far to lower `drive` once the hold exists (render drive 0 vs 0.45).
- **Sub (agreed):** a continuous sine drone on a per-bar note list (C#1, B0 once in eight), its own track, in the kick's duck list, with the ducker's retrigger click fixed. Contested: the duck shape. S1 fitted a fast trough and long release to O1's coarse round-2 points; O1's finer measurement shows a trough at 40 to 60 ms held to 120 ms, which suggests a compressor keyed by the kick or a ducker with about 80 ms hold. Interim: depth about 0.82, attack 0.02 to 0.04 s, hold 0.08 s, release 0.12 s.
- **Mid bass (agreed):** fix the 300 Hz to 1 kHz excess at the source, not with master EQ. Reduce the filter envelope (300 → 0 to 150 Hz) and remove or move the post-filter drive before the filter (S3's simulation, H2's placement finding). Contested: how much a 24 dB/oct slope helps (H2 about 9 dB; S3's fuller simulation says 2.7 dB and a naive cascade is worse). Only a render settles it. Pitch unmeasured.
- **Stabs (agreed):** pan spread cannot decorrelate in-phase saws; a Juno-style stereo chorus on a near-mono voice (3.5 ms base, ±1.85 ms, about 0.5 Hz, right channel inverted) lands in the measured onset range. The studio chorus needs a `base` parameter (its 14/21 ms are far too long) and an `invert` option. Contested: chorus wet 1.0 on a mono voice (H3) vs spread 0.73 plus chorus 0.5 (S4).
- **Clap (agreed):** the studio double-counts the tail (in-voice 0.3 plus send 0.25); keep the send, lower the voice tail.
- **Hats (agreed):** make the metal path's highpass a parameter with a lower default; add a choke rule (closed hat steals the open-hat voice); faint hats in the intro. The "ring" retune is not needed.
- **Lead (agreed):** the in-house synths lack a pitch-bend input; transcribe with a monophonic tracker and lower Basic Pitch's 127.7 ms minimum note length or 16ths are dropped.
- **Riser and impact:** check by listening whether they belong at all; express the transitions as master filter and level ramps first.
- **Delay (agreed):** move the tone and highpass filters inside the feedback loop behind a `loop` switch. **Reverb (agreed):** a native-node Freeverb with RT60 as the parameter (every loop is above the 128-sample minimum), a seeded IR so renders are repeatable, an exponential IR envelope.
- **Widener and master (agreed):** band-limit the widener (`monoBelow` about 150 Hz); a meter device (LUFS, true peak, per-band correlation) before any limiter work; two limiter profiles (fitting at −10.7 LUFS, release at −1 dBTP); a glue detector highpass and a keyed AudioWorklet compressor.
- **Arrangement:** move the break's internal change to bar 120; fade the drone in over bars 129 to 135; add the intro's one-bar high events at bars 3, 7, 11; raise the kick about 4 dB at bar 40.

## 5. The gear list

O2's final list (`transcripts/round4-O2.md` section 1) has about 70 sourced rows in four groups: instruments, processors, analysis and transcription, platform libraries, each with licence grade, browser status, desktop-host status and an action. The summary:

**Adopt (permissive, usable as code or as a reference implementation):** Tone.js (MIT) for test benches; webdx7 (MIT); Open303's engine core (MIT) as the ladder-filter model; Airwindows (MIT) and sndfilter (MIT, a port of Chromium's compressor) as DSP sources for the saturator and worklet compressor; libebur128 (MIT) for LUFS and true peak; Freeverb (public domain) and Dattorro's published plate for reverb; Demucs v4 (MIT) for stems; Basic Pitch (Apache 2.0) for notes; librosa (ISC) for analysis; @tonejs/midi (MIT) for MIDI files; the VST3 SDK (MIT since 3.8) and CLAP (MIT) for any future hosting.

**Reference only (GPL, AGPL or closed; read or listen, do not copy):** Surge XT, Dexed, junox, webOBXD, Mz101, jc303's wrapper, Dragonfly Reverb, Chow Tape, ZL EQ, openDAW (GPL/AGPL); TAL-BassLine, TDR Kotelnikov, TDR Nova, Klanghelm IVGI, Valhalla Supermassive, LoudMax, Voxengo MSED and Correlometer, Spectrum Thief (free, closed); and the commercial set (KICK 2/3, Kickstart 2 about €14, Duck about $27, The Glue about $99, Pro-Q 4 and Pro-R 2 about $199, Valhalla about $50, TDR Limiter 6 GE about $50 to 60, MicroShift about $99, Microtonic about $99; prices as seen on 2026-10-23, approximate, some from one retailer page).

**Licence traps:** madmom's models and some RoFormer checkpoints are CC BY-NC; Essentia.js is AGPL; Cmajor is GPLv3-or-later or commercial; faustwasm is LGPL-3.0.

**Desktop-hostable plugins** (section 1e of O2's file, by role): the free and open candidates above plus the commercial ones become loadable in a native host. O2's caveat: hosting a plugin does not put it in the recreation loop; the render-and-score loop needs offline rendering and full parameter control from code, and a song built on commercial plugins only renders where they are licensed. In-house devices stay the default; plugins become optional inserts.

## 6. The pipeline

**Source song → stems → MIDI and parameters → recreation.** S5's design (`transcripts/round3-S5.md`), mapped by O2 onto the engine (`round4-O2.md` section 3): an offline Python front end produces a bundle (stem WAVs, a .mid, `analysis.json` with tempo, key, sections and per-step onsets) that maps field by field onto `song.js` patterns, melodies and progressions and onto three-segment `seq.setParam` paths. Bends and micro-timing are not imported in the first version.

Two findings change the usual recipe. First, **this track's low end does not need a neural separator**: the kick is grid-locked (beat coherence 0.96) and the sub drone is free-running (0.03), so folding the audio at the exact 21,000-sample beat period splits them (S5 from O1's figures). Second, **no 4-stem model separates sub from kick** in general, so for other tracks the studio's own envelope analysis or a drum-kit split fills the gap.

**What is automatable today:** quantising transcription to the 16th grid; fitting the studio's own small synths by gradient-free search over a few hundred offline renders with pitch fixed from analysis (O1). **What is not:** one-click song-to-patches for commercial synths (no source found; Synplant 2 and Syntheon recover patches only for their own engines), and matching from wet or separated stems.

**Load, modify or create** (O1's rule): score each element as best-fit distance over the spread between repeated reference hits; load an existing synth at 1.5 or below; otherwise add one or two backward-compatible modules and refit; create a new synth (or a sampler, if audio files are allowed) above 3 or when the residual is structural. The thresholds are placeholders until a studio render is scored; nobody has scored one yet. On the desktop the rule gains a step: fit a hosted plugin from its nearest preset over 5 to 15 hand-picked parameters.

## 7. Build order and the desktop decision

O2's 15-step order (`round4-O2.md` section 2) runs in the same new folder as Faceplate's base and keeps its rules (three-segment parameter paths, faces write through `seq.setParam`, meters read `p.node`): 0 scoring loop; 1 kick envelope; 2 sub as a ducked drone; 3 sidechain extension; 4 bass envelope and drive placement; 5 delay filters in the loop; 6 Freeverb; 7 width; 8 hats and choke; 9 parametric EQ and offline match script; then the AudioWorklet-dependent steps 10 to 13 (worklet infrastructure, meter device, keyed glue compressor, true-peak limiter); 14 bundle import. Steps 1 to 9 need no new node types and can run beside the UI base. Sizes are O2's judgement (small to large).

**Desktop platform** (`round4-O2.md` section 6, and Faceplate's `round5-FO2-desktop-build.md`, which reached the same recommendation independently): ship an **Electron shell** around the existing JavaScript and Web Audio engine first (1 to 2 weeks, keeps every line of engine and UI, gives files, save/load, a bundled Python sidecar). Treat **plugin hosting as a separate later decision**: bridging native plugins into Chromium's audio graph is months of risky work, so if hosting is wanted, move to a native engine (JUCE, AGPL or commercial; or Tracktion Engine) behind one `Host` interface with the web UI kept. Spike `node-web-audio-api` (BSD-3) for a week first: if it runs `Sequencer.render` unchanged, the JS engine survives the move. Tauri is riskier on macOS because AudioWorklet support in WKWebView is unconfirmed. None of this is tested; it is ordering by cost and risk.

## 8. Decisions for the owner

From `round4-O2.md` section 4, ordered so each gates the next:

1. **Desktop shell:** Electron around the JS engine (recommended first), native rewrite, hybrid native engine with web UI, or stay browser-only. And the question F-O2 put plainly: does "more powerful" mean desktop comforts, or real plugins and low latency? The second needs the engine port.
2. **Repo licence** (none today): permissive rules in the MIT/BSD/Apache sources above and rules out porting GPL code; GPL or AGPL rules in Surge, junox, Dragonfly and JUCE without a commercial licence; private keeps everything for personal use.
3. **Where analysis runs:** offline Python with a bundle (recommended; a sidecar in a desktop shell), in-app JS, or hybrid.
4. **Audio files:** user-loaded at runtime, none in the repo (recommended); it unblocks stems, A/B and a sampler fallback.
5. **AudioWorklet:** yes unblocks the meter, keyed compressor and true-peak limiter.
6. **Song save/load:** the same question as Faceplate's "does version 1 edit?"
7. **Sample rate:** live at the device rate, score and export at 44.1 kHz (recommended).

## 9. What the group got wrong along the way

Recorded because the corrections are the most useful part of the transcripts. O1's round 1 read the kick's own tail as the sub; its round-2 kick figure (41 to 46 ms) came from simulating the studio kick, not the reference. O2 corrected eleven of its own claims, among them that filter slope is the first lever on the bass (it is the third) and that more devices needed an AudioWorklet than do. S1's "sub not ducked" and H1's retune advice were retracted once the sub turned out to be a ducked drone. H2 withdrew B2 as the bass pitch. The spec's hat ring, kick click and clock times did not survive measurement. Two models still disagree (H2 and S3 on filter slope); a render, not more argument, settles it.

## 10. Files

- `BRIEF.md`: question, roster, rules.
- `transcripts/round1-*.md` (12), `round2-O1.md`, `round2-O2.md`, `round3-*.md` (10), `round4-O1.md`, `round4-O2.md`.
- The corrected measurement table: `transcripts/round4-O1.md` section 1. The gear list: `transcripts/round4-O2.md` section 1.
