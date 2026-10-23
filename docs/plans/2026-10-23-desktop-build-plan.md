# Havantechno desktop build plan

Date: 2026-10-23. Derived from the Roundtable reports (`docs/research/2026-10-23-plugin-gear/REPORT.md`, `docs/research/2026-10-23-faceplate-layout/REPORT.md`) and the owner's decisions of the same day (`prd.md` 6b): Electron shell, AGPL-3.0-or-later, version 1 edits and saves songs, audio files allowed at runtime. All day counts below are the agents' rough estimates, labelled as such in their files, and are kept here only to order the work.

## Ground rules

- New code lives in `app/`. The archived studio in `olde Havantechno dub studio/` is frozen and is the regression baseline: a converted song must schedule the same 3,200 steps with the same times and velocities.
- Plain JavaScript, no framework, no bundler in the engine. Electron is the only build dependency and arrives at milestone 3.
- One write path: the UI and the arrangement both change parameters through `seq.setParam(path)` and change the song through named edit operations on one song document. Faces read `p.node` for meters. Parameter paths have at most three segments.
- Every milestone keeps a Node self-check passing (`node app/selfcheck.js`), extended at each step.
- Shape-only state markers; one face definition per device drawn at three densities (chip, chain face, floating window).

## Milestone 1: the song document and the step record (engine data)

**Status (2026-10-23): engine part done in `app/engine/` (songdoc.js, sequencer.js, song.js; 193 self-checks, schedule-equivalent to the archived engine). Saving to a file under a name waits for the Electron shell (milestone 3); `SongDoc.save` already produces the JSON.**

Goal: the song becomes editable and saveable data, with every step addressable, and the engine still sounds the same.

1. `app/engine/` starts as a copy of the archived engine's five files (core, synths, processors, sequencer, song), kept byte-identical at first so the baseline is exact.
2. **Song document.** One JSON object: `{name, bpm, swing, key, progression, sends, tracks: [{name, inst, kind, params, chain, sends, sidechain, gate, note|notes, variants: {A: ...}}], sections: [{name, bars, play, set, ramp, fx}]}`. `Song.GUIDANCE` is converted into it by a function, and a writer produces readable `song.js`-style strings whenever a variant has no per-step overrides.
3. **Step record.** A variant is `{bars, cells}` with a cell `{vel, acc, len, nudge, note, prob, cond, rep, locks}` stored sparsely; the string forms (`x X o .` and melody tokens) parse into cells, and `formatPattern` round-trips plain cells back to strings. Velocity and accent are separated (`X` parses to `{vel: 1, acc: true}`). Note tracks get explicit per-cell notes at conversion so the running `noteIdx` counter disappears.
4. **Scheduler.** `schedule()` reads cells: probability and condition decide first (a skipped kick does not duck), then nudge (clamped to the lookahead), length, note, velocity; parameter locks travel on the event as `ev.locks` and apply to that voice only (instrument voice parameters only in version 1). Probability uses a seeded hash of track, absolute step and variant, so export equals playback.
5. **Edit operations.** `setStep`, `setNote`, `setProgression`, `setPlay`, `forkVariant` (copy-on-write when a variant is shared), `setSectionParam`, with an undo stack over the document.
6. **Save and load.** `Song.save(doc) -> JSON string`, `Song.load(json) -> doc`, versioned (`v: 1`). Saved under a name; loading rebuilds the sequencer from the document.
7. **Held set.** `seq.held` keyed by parameter path; a held path is skipped by section `set` and `ramp`; "re-enable arranged" clears it.
8. **Self-check additions.** Equivalence with the archived engine (same step counts, times, velocities), string round trip for every variant in the song, nudge offset, deterministic probability, a lock that reaches the trigger and leaves `inst.params` unchanged, save/load round trip, held paths not overwritten.

Rough size: 6 to 9 days (F-O2's engine 3 to 5, locks 1, save/load 2 to 3).

## Milestone 2: the device list and the face registry

1. A device list on the engine: every instrument, insert, send and master unit with its type, spec and parameter path prefix.
2. `Faces.define(type, layout)` with a generic fallback that reproduces today's sliders and adds select and toggle widgets for non-numeric parameters (`wave`, `mode`, `division`, `pingpong`). Hand-written knob, slider, meter and curve widgets in SVG and Canvas.
3. One requestAnimationFrame drawing loop; the scheduler's step and section handlers only record events. AnalyserNodes created by the page feed meters.
4. A `Host` interface between UI and engine (create device, set/get parameter, transport, render), so a native engine can replace the JS one later without redoing the UI.
5. Self-check: a face lint (every face parameter exists in the spec; every spec parameter is reachable through a face or the fallback).

Rough size: 12 to 19 days (F-O2's shared base).

## Milestone 3: the Electron shell

1. Electron main process, one BrowserWindow for the main frame, same-origin child windows for device windows (they share the process and can call the main window's code).
2. File access: open and save the song document to a user-chosen `.json`; autosave to the app-data folder; recent files.
3. Audio files: load a source track and stems from disk; `decodeAudioData` into audio tracks.
4. Window rules from the research: open on double-click, Link Off/Single/Multi, pin, remember size and position per device, tile and cascade, V hides all.
5. Packaging for macOS and Windows.

Rough size: about 2 weeks (F-O2 and O2 agree).

## Milestone 4: the System Editor and the Step View

1. System Editor (the voted layout as amended): control bar; overview and proportional section ruler; thirteen compact rows under four stem-group headers; one device row for the selected track (PATTERN, synth, inserts, channel) with RETURNS and MASTER pinned.
2. Step View: the same frame switched by Tab; every row a one-bar step grid; the bottom band a step editor with velocity, gate, note, probability, nudge and lock lanes; copy-on-write forks with a scope switch.
3. Floating device windows from the same face definitions, with the designed sizes (kick 420×340, bass 600×340, stab 500×320, glue 520×360, delay, EQ3).
4. Mixer as a drawer.

Rough size: System Editor 7 to 10 days; Step View UI 5 to 8; floating windows on top of the registry, small.

## Milestone 5: the audio fixes from the Gear Crew (can run beside milestones 2 to 4)

In O2's order: 0 scoring loop (export section WAVs, run O1's measurements on render and reference, seed the reverb IR); 1 kick envelope (`setTargetAtTime` approach with `tau`, hold-then-decay amplitude, click 0); 2 sub as a ducked drone (C#1 with B0 once in eight) in the duck list; 3 sidechain extension (curve, retrigger, offset); 4 bass filter envelope and drive placement, then slope and keytrack; 5 delay filters in the feedback loop; 6 Freeverb with RT60; 7 band-limited widener and chorus `base`/`invert`; 8 hat choke and clap tail; 9 parametric EQ and the offline match script. Steps 10 to 13 (AudioWorklet: meter device, keyed glue compressor, true-peak limiter) follow once the worklet infrastructure exists. Step 14, bundle import from the offline Python front end, follows milestone 3's file access.

## Milestone 6: the remix pipeline

The offline Python front end (Demucs, epoch folding for this track's low end, Basic Pitch, a drum transcriber, librosa) writes the bundle (stem WAVs, `.mid`, `analysis.json`); the app imports it into the song document; stem group headers fill with source audio; A/B with level match; the Compare tab; the load/modify/create rule with thresholds calibrated on scored renders.

## Open items carried from the research

- Does "more powerful" also mean real plugins and low latency? If yes, a native engine (JUCE or Tracktion Engine, both compatible with AGPL) goes behind the `Host` interface later; spike `node-web-audio-api` for a week first.
- Device windows as OS windows or in-app panels (Electron child windows are the default here).
- Whether instruments get a real bypass parameter (today the header uses the track's Mute).
- The two bass models (H2 and S3) disagree on filter slope; milestone 5 step 4 settles it with renders.
