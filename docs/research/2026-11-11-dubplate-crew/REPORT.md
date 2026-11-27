# Dubplate Crew report: import a track, analyse it, save it as a project, A/B it

Scribe's report, written 27 November 2026 (ET) from the crew's written records only: `BRIEF.md` and `transcripts/log-D1.md`, `log-D2.md`, `log-D3.md` and `log-coordinator.md`. No check was run and nothing was measured for this report. Where a figure was measured only by the agent that built the thing, this report says so; where the coordinator ran something itself, its log says so and this report repeats that. Nobody has listened to anything this crew built.

The records use the app's name at the time, Havantechno (for example `HavantechnoShell`). The app has since been renamed Recut; that rename is recorded in the Pressing Crew's coordinator log, not in this crew's folder.

## 1. The question

The owner, 8 November, as the brief quotes it: "when an Audio file is imported for deconstruction and analysis I will immediately want it saved after analysis as a project file and I always want the ability to a/b it with the recreated project." And: "I want the daw to then load up its own existing recreations of those synths for each sound it's isolated and placed on the daw or suggest an existing plugin for that sound." (BRIEF.md)

PRD D13, as the brief quotes it: "an imported audio file becomes a saved project immediately after analysis, with the original on an audio track and the recreation beside it; A/B with level match is always available." Roadmap batch 4, PRD D9 to D13. (BRIEF.md)

Terms used below. The reference is the original recording held in the project. A/B means switching what is heard between the app's own song and the reference. Level match sets the reference's gain so both read the same loudness. Stems are the separate parts (drums, bass, other, vocals) a separation model splits a mix into. LUFS (loudness units relative to full scale) is the loudness measure of the ITU-R BS.1770-4 standard.

## 2. Result in one paragraph

A project can now hold one reference recording that plays in sync with the transport, outside the master chain, and is never part of an export (log-D1.md). One call, `Project.importTrack`, decodes a file, optionally separates it into stems from the desktop shell, estimates tempo, runs the Lab Crew's analysis on each stem or band, builds tracks with first-pass patterns read from the audio, and saves the project at once; a cancel saves nothing and restores the previous document (log-D1.md, log-coordinator.md). The interface has an import dialog, a report view that shows every decision with its confidence, a Song and Ref A/B pair on the key A, a Match button with a loudness readout, and a reference waveform lane above the tracks (log-D2.md). Every check passed on one tree in the coordinator's own run (log-coordinator.md). All the accuracy figures are on the engine's own renders, measured by the agents: nothing has been tried on a real record or on real separated stems, the live A/B has not been measured in a running audio context, and the recreation type was wrong for both pitched parts in the one song import measured (log-D1.md, log-coordinator.md).

## 3. What was built, per agent

**D1, engine (Opus).** Files: `app/engine/importer.js` (new), `host.js`, `project.js`, `songdoc.js`, section 10 of `selfcheck.js`, `tools/importer-check.js` (new), the Host and Project sections of `app/CONTRACT.md` (log-D1.md).
- The Importer reads tempo and beat phase, drum steps quantised to sixteenths with velocity, and mono note lines with length, slide and accent; it folds a pattern to the shortest repeat of 1, 2, 4, 8 or 16 bars when at least 90 % of the bars agree, and measures BS.1770-4 loudness (log-D1.md).
- The reference player in `host.js` follows play, jump, loop wrap and tempo change. It starts later than the song by the master chain's latency, which D1 measured at 19.3 ms in Chromium (two compressors with look-ahead); `host.reference().latency` reports it (log-D1.md).
- A/B moves two gains on 10 ms linear ramps, so the switch has no step and does not touch the playhead (log-D1.md).
- `Project.importTrack` takes an abort signal (the coordinator's ruling after D2's request), checks it between stages and just before the save, rejects with an AbortError, saves nothing, cancels a running separation and puts the previous document back (log-D1.md, log-coordinator.md).
- Additions beyond the frozen interface that do not change it: extra fields on analysis elements and tempo, the events `reference` and `analysis`, `host.meter('reference')`, the options `maxSeconds` and `signal` (log-coordinator.md).

**D2, interface (Opus).** Files: `app/ui/import-view.js` and `import-view.css` (new), `tools/import-view-check.js` (new), edits in `app/ui/app.js`, `app/index.html`, and three places marked "D2" in `app/ui/system-editor.js` (log-D2.md).
- An import dialog in three steps: pick the audio; in the desktop shell, separate with HT-Demucs or analyse the mix, in the browser drop or pick stem files; then six stages (decode, separate, tempo, analyse, build, save) with progress, an elapsed clock and a working Cancel (log-D2.md).
- A report view: each decision as a chip with its confidence as a word and one to three dots; a low-confidence call is dashed, italic and marked "?"; the analysis's unverified notes in full; a select per element to change the recreation, one undo entry each (log-D2.md, log-coordinator.md).
- In the toolbar: Import… and Report buttons, the Song and Ref pair on key A, a reference gain field in dB (from −24 to +12), Match with a LUFS readout. With no reference the controls stay focusable and say why they are off (log-D2.md).
- A reference lane in the System Editor drawing the file's waveform under the arrangement's bars, with the playhead (log-D2.md).
- Screenshots `docs/screenshots/app-import-report.png` and `app-ab.png` (log-D2.md).

**D3, shell separation and labelled renders (Sonnet).** Files: `app/shell/main.js`, `preload.js`, a new `app/shell/separation.js` (accepted by the coordinator as D3's file), `tools/separate.py`, `tools/render.js`, `tools/README.md`, `tools/shell-separate-check.js` (log-D3.md, log-coordinator.md).
- The shell's `separate(path, {model})`, `cancelSeparate()` and `onSeparateProgress(fn)`: one run at a time; cancel stops the whole process group; stems cached by path, size, modification time and model; missing Python, packages, model weights or ffmpeg each give a readable message (log-D3.md, log-coordinator.md).
- `separate.py` gains only `--check`, which prints what is installed and what is missing as JSON (log-D3.md).
- `tools/render.js` writes labels for every track in each sidecar file and takes `--labels-only` and `--sampler-from <track>[:rr3|:pitched]`, so a rendered song carries its own truth for scoring an import of it (log-D3.md).

## 4. What was checked, and by whom

**Run by the coordinator, exit codes read directly** (log-coordinator.md, 11 November 21:18 EST (02:18 UTC)): selfcheck 448; importer-check 20; import-view-check 122; synths 169; drums 342; classics 110; panels 116; faces 2495; system-editor 97; step-view 72; widgets 157; processors 92; analysis 47; shell-separate-check 92; browser-check PASS (26).

The coordinator also, by its own log: read D3's process-spawn calls (argument arrays, no shell string, the handler answers the main window only) and rendered two bars with labels (0.63 s render, 1.9 s wall; labels for the four sounding tracks) at 15:18 EST (20:18 UTC); and looked at D2's two screenshots at 20:37 EST (01:37 UTC), which show the kick band read as bd909 at medium confidence, the snare band as a dashed low-confidence guess, and in the A/B shot "song −11.1 · ref −11.4 LUFS" with the reference lane above five built tracks (log-coordinator.md).

**Measured only by the agents, not repeated by the coordinator** (log-coordinator.md says so for each):
- D1, against labelled engine renders in headless Chromium: tempo exact on a 909 kit at 126 beats per minute and an 808 kit at 98 with swing 0.4, offset within 3.4 ms; drum steps bd909 40/40, sd909 22/24, ch909 72/72, cp909 16/16; a tb303 line 72/72 notes, 64/72 lengths, 12/20 slides with no false slides; a modeld line 70/72 notes, 42/72 lengths, 20/20 slides with 27 false slides (log-D1.md).
- D1, a 16-bar song import with three stems: 34.5 s; kick steps exact; snare band recall 1.00, precision 0.22; hat band precision 0.71; bass notes 144/144, slides 32/40; level match +2.06 dB (song −9.78, reference −11.84 LUFS) (log-D1.md).
- D2, against D1's real calls in Chromium at 1440 by 900: six stages ran, five elements reported, a recreation change left one undo entry, key A switched to the reference, Match measured song −11.1 and reference −11.4 LUFS and set +0.3 dB, a non-audio file gave D1's decode message and the project was restored, no console errors (log-D2.md).
- D3, in Electron under a virtual display: a real HT-Demucs separation of a 6.4 s engine render, 4 stems, 11 progress events, 241 s wall of which Demucs took 58 s; a second call during the run was refused; cancel after 8 s left no process behind (log-D3.md).

## 5. What changed in behaviour

- The toolbar gains Import…, Report, the A/B pair, the reference gain and Match; at 1440 px the project actions wrap to a second row as one group. D2 measured the one-row bar at about 1770 px; the coordinator accepted two rows for now and allowed shorter labels later (log-D2.md, log-coordinator.md).
- The "+ track" menu gains "Import track…" (log-D2.md).
- An import saves a project file immediately; a cancel or a failure leaves the previous document in place and saves nothing (log-D1.md).
- Errors from the shell reach the page as a message only, with no code, so the interface shows the message as it is (log-D3.md, log-coordinator.md).
- `tools/render.js` without the new flags writes the same WAV as before; the sidecar gains only `labels` (log-D3.md).

## 6. What is open or unverified

- Nothing has been run on a real record or on real separated stems; every number is on the engine's own renders (log-D1.md, log-coordinator.md).
- Nobody has listened to an A/B, and nobody has measured one in a running audio context: the sync on loop wrap and jump, the latency compensation and the 10 ms ramps are checked on the fake context only (log-D1.md, log-coordinator.md).
- The recreation type was wrong for both pitched parts in the song import (a tb303 and an fm part both read as modeld), and the hats read as ma808 instead of ch909. These come from the Lab Crew's rules, which this crew did not change (log-D1.md).
- A tb303 line alone reads at half tempo and a modeld line alone gets the wrong bar, which is why an import takes tempo from the drums stem; a 174 beats-per-minute break reads 87; poly parts are read as one mono line; the downbeat is assumed, not measured, so a pickup before bar 1 puts bar 1 in the wrong place (log-D1.md, log-coordinator.md).
- A frequency band is not a separation: the snare band's precision of 0.22 comes from the kick's click and the hats sharing the band (log-D1.md).
- The reference lane uses one tempo and does not follow a tempo change inside the song; screen-reader output was not heard (log-D2.md).
- Not run in Electron: the missing-Python, missing-package and missing-weights paths (unit tests with a fake process only), mp3 input through ffmpeg, any model download, the import dialog's Electron branch on a real shell. macOS and Windows were not tried at all (log-D3.md, log-D2.md, log-coordinator.md).
- The `:<bars>` form of `--sampler-from` from L2's specification is not built; the coordinator ruled it stays unbuilt until needed (log-coordinator.md).

## 7. Where the records disagree

- D3's log has an entry stamped 15:14 ET (20:14 UTC), for the Electron run, placed after its entries for 15:05 to 15:40 ET, and it gives 15:40 ET as the time the shell separation was built; the coordinator's log verifies that separation at 15:18 EST (20:18 UTC). These times cannot all be right (log-D3.md, log-coordinator.md).
- The failing selfcheck rows while D1 was mid-edit read differently at different moments: "FAILED 6 of 445" (coordinator, 15:18 EST), "2 of 445" (D2, about 15:24 ET), "section 5 threw ... reading 'vel'" (D3), "FAILED 1 of 445" (coordinator, 20:37 EST). These are snapshots of unfinished work rather than a conflict; the final run reads 448 with exit 0 (log-coordinator.md, log-D2.md, log-D3.md).
- D2's log at 15:10 ET gives a readout "song −10.8 · ref −6.5 LUFS" without saying which run produced it; its later run against D1's real calls reads −11.1 and −11.4 (log-D2.md).

## 8. Decisions for the owner

1. Listen to an A/B in the app on a project you know, and say whether the switch clicks or drifts; nobody has.
2. Whether a real record may be used to test the import. The brief keeps the owner's reference file out of the repository (BRIEF.md); no import of a real recording is recorded.
3. Whether the Lab Crew's recreation rules for pitched parts are changed next. The coordinator's log lists that as the crew's next task, with a live A/B measurement and an import of a labelled render through HT-Demucs scored against its labels (log-coordinator.md).
4. The two-row toolbar at 1440 px, accepted for now, or shorter labels (log-coordinator.md).

## 9. Files

`BRIEF.md`, `transcripts/log-D1.md`, `log-D2.md`, `log-D3.md`, `log-coordinator.md`, this report. Code named in the logs: `app/engine/importer.js`, `host.js`, `project.js`, `songdoc.js`, `selfcheck.js`; `app/ui/import-view.js`, `import-view.css`, `app.js`, `system-editor.js`, `app/index.html`; `app/shell/main.js`, `preload.js`, `separation.js`; `tools/importer-check.js`, `import-view-check.js`, `shell-separate-check.js`, `render.js`, `separate.py`, `README.md`; `docs/screenshots/app-import-report.png`, `app-ab.png`.

## Coordinator's note (27 November 2026)

The scribe compiled this report from the crew's records and could not save files itself; the coordinator read it and saved it unchanged. The places where the records disagree are listed in the report as the scribe found them; the mismatched times come from agents writing clock times they did not read from the machine, and the coordinator's log is the one to trust for when something was verified.
