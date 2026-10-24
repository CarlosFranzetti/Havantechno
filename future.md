# Future work

Nothing in this file is committed. Items under **Open items** are known gaps. Items under **Ideas** are proposals, and each needs a decision before it is built.

## Open items

1. **Studio mix, 300 Hz to 1 kHz.** Measured several dB hotter than the reference track in every section. Tune by ear on the studio page, then re-check the band energies against the reference.
2. **Transcribe the real lead melody and chord progression.** The current `Song` data is inspired, not copied. Replace it with a transcription of the reference track.
3. **An unidentified 404 in the browser console** on the studio page. Likely the favicon request. Confirm it, then either add a favicon or stop the request.
4. **Attribution on commit `546a2c6`.** It names a model in the co-author line, which the repo rules say not to do. Correcting it means rewriting a pushed branch, so it needs your go-ahead.
5. **Automatic context dumps.** The memory dumps are written by hand when asked. A scheduled or hook-driven dump has not been set up.

## Findings from research that point at work (2026-10-23)

From Gear Crew round 1, each a candidate task once the owner confirms:

- The spec measured rhythm and pitch, not timbre; most synth settings in `song.js` are guesses (O1). Measure clap reverb decay, stab delay time, the kick's first 20 ms, per-band L/R correlation, LUFS and true peak of the reference.
- The measured "sub" may be the kick's own tail, and the kick tune (44 Hz) is a tritone off B (O1). Re-check the low end as one event.
- The mid bass is the likely cause of the 300 Hz to 1 kHz excess (O1, S3); fix with an offline EQ-match fitted to `eq3` bands, after finding the source per stem.
- Extend the trigger-driven sidechain (curve, lookahead, low-band mode) and replace the master glue `DynamicsCompressorNode` with an AudioWorklet compressor (S1).
- Rebuild the reverb on the Freeverb topology; move the delay filters inside the feedback loop (S2).
- The open hat's 1.5 kHz ring is probably filtered out by its 3.5 kHz highpass (O1).
- `song.js` sets `sub: 0` on the bass, so the bass square layer is silent (H2).
- The studio UI skips every non-numeric spec entry, so `wave`, `mode`, `division` and `pingpong` have no controls (F-S2).
- Live tweaks are overwritten by section ramps within one step; a `held` set is needed in the engine (F-S5).
- The master meter reads 256 samples every 60 ms, about 10% of the signal (F-O2).

## Decisions taken (2026-10-23, later)

Electron shell; AGPL-3.0-or-later licence; version 1 edits and saves songs (saved under a name, editable in the DAW); audio files allowed at runtime, and sample-based elements of a source track (vocals first) stay samples in sampler tracks (PRD D8). See `prd.md` 6b and `docs/plans/2026-10-23-desktop-build-plan.md` for the milestones that follow from them.

## Direction change (2026-10-23, later): desktop DAW, floating device windows, Step View

- The app is to be a **Mac or PC DAW**, not browser-only. That reopens plugin hosting (VST3, AU, CLAP) and changes the Gear Crew's platform conclusions; its round 4 was redirected to cover it.
- The voted layout keeps its place as the **System Editor** view.
- A **Step View** is added: the same shape, but every step of every track is editable there (hit, accent, note, per-step parameter values such as cutoff or decay).
- Each device gets a **floating window** with its own look, as in Logic, in addition to its face in the System Editor chain.
- A Faceplate follow-up round covers the floating-window system, the Step View and the desktop shell options.

## Layout, from the Faceplate vote (2026-10-23)

The layout to build is **Strip Bench** as amended (`docs/research/2026-10-23-faceplate-layout/REPORT.md`, mockups on the canvas linked there). Order of work, from the tech lead's estimates (rough, labelled):

1. Shared base, 12 to 19 days: device list, face registry with a generic fallback face that reproduces today's sliders (plus select and toggle widgets for `wave`, `mode`, `division`, `pingpong`), one drawing loop, the `held` set, hand-written knob, slider, meter and curve widgets. Build in a new folder; the archived studio stays frozen.
2. Strip Bench on top, 7 to 10 days: control bar, overview and proportional section ruler, 13 compact rows under four stem group headers (collapsed until stems exist), one device row for the selected track (PATTERN → synth → inserts → channel) with RETURNS and MASTER pinned.
3. Later: the stem group headers fill with source stems, the A/B switch and a Compare tab come alive (Stem Bench).

Owner decisions before step 1: does version 1 edit the song or only play it; repo licence; stems in the first build or only the slot.

## Direction (set 2026-10-23)

- **Per-device looks (PRD D1).** Give each synth and processor its own panel design. The research report in `docs/research/2026-10-23-plugin-gear/` surveys how other DAWs do this.
- **The source track as stems (PRD D2).** Load the reference track's elements as separate, editable tracks with their own MIDI.
- **Remix pipeline (PRD D3).** Source song → stems → MIDI → recreation. Depends on the stem-separation and transcription findings in the research report.
- **Gear list (PRD D4).** Decide which plugins or open-source engines to adopt, port or reimplement, from the research report's recommendations.

## After Build Crew wave 2 (2026-10-24)

Wave 2 closed these from the earlier backlog: undo per knob gesture, the contract additions, the window Editor tab (hero plus controls), the render speed (200 bars in 89 s), the level-timing bug, the sampler (instrument, Host loading, document audio map, face, drop target and menu, re-add of missing files), the master ceiling and loudness. `docs/research/2026-10-23-build-crew/REPORT.md` has the detail. What remains, with owner logs:

- **Listen.** Nobody has heard the app end to end; everything about its sound is a measurement.
- **Sound** (A7, A9): V2 sub duck 14 to 15 dB too deep at 100 to 150 ms; the baseline intro about 14 dB hot in the mids (synth level or EQ match: owner's call); mainA about 1 LU under its reference section while the full song is on target.
- **Processors** (A8): the AudioWorklet true-peak limiter (the clip is a safety net), sidechain offset, exponential IR envelope and IR swap click, Dattorro; the saturator not yet measured as a peak source.
- **Measurement** (A9): band-level method offset against O1, stab-step correlation, kick-glide fit on renders, build-section tempo octave.
- **Shell** (A6): native dialogs, bounds across launches, macOS and Windows, packaging; Mixer, A/B and preset menus.
- **Editors** (A4, A5): overview-box drag, right-click variant cycling, chord-progression editing; paint-drag, length-drag, marquee, copy and paste, 2-bar view.
- **Accessibility** (A2, A3): contrast and colour-blind checks, screen-reader pass, touch.
- **Milestone 6**: `SongDoc.sliceToTrack`, the offline Python front end (Demucs, Basic Pitch, drum transcription), the bundle import, A/B with level match, the load/modify/create rule.

## Ideas

- Save and load a song as JSON, so an edited arrangement survives a reload.
- A keyboard-driven pattern editor, so steps can be changed without the sliders.
- Per-track sidechain sources, so more than the kick can duck a track.
- A reference-analysis script that prints band energies and onset times for any WAV, so the comparison in item 1 is repeatable.
- Export stems (one WAV per track), not just the mixed song.
