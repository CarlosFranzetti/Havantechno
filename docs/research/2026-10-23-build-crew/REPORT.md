# Build Crew report: the first build of the Havantechno DAW

Coordinator's report, written 2026-10-24 from the crew's logs (`transcripts/log-A1.md` to `log-A11.md`), the coordinator's own log (`transcripts/log-coordinator.md`, every check run is recorded there with its exit code), the compiled conversation (`DISCUSSION.md`), the brief (`BRIEF.md`) and the contract (`app/CONTRACT.md`). Where a number comes from one agent's run and was not reproduced by the coordinator, this report says so. Nothing here is a new claim: each statement points at the log that carries it.

## 1. The task

The owner asked for the DAW to be built as both a web app and a desktop app, by a crew of agents run the way the research groups were run: Fable coordinating, the other agents researching, coding and talking to each other, with the conversation saved. The design came from the two earlier Roundtable groups: the Gear Crew (`../2026-10-23-plugin-gear/REPORT.md`, what to build and the measured facts of the reference track) and Faceplate (`../2026-10-23-faceplate-layout/REPORT.md`, the System Editor layout as voted, with the round-5 addendum for floating windows, the Step View and the desktop shell). The owner's four decisions (Electron shell, AGPL-3.0-or-later, version 1 edits and saves the Guidance recreation as a song, audio files at runtime with sample-based elements staying samples) are in `prd.md` section 6b.

## 2. How the crew worked

Ten agents on three models (A1 Opus; A2 to A6 Sonnet; A7 to A10 Haiku) plus A11 (Opus) for the integration review, coordinated by this session. The roster, files and waves are in `BRIEF.md`. The method differs from the research rounds in one way: agents coded to a written contract (`app/CONTRACT.md`: load order, one owner per file, the interfaces between Host, Project, Widgets, Faces, Windows, System Editor, Step View, app frame and shell) and each owned a check for its module. The coordinator verified every hand-back by running its check and reading the exit code directly, committed only verified work, and committed in-progress files only as commits labelled "WIP ... syntax-checked only".

Two waves, as the brief set out. Wave 1 built every module; its gate was `tools/browser-check.js`, which serves the repo, opens the app in headless Chromium and exercises start, play, both views, a step edit, a device window, save and autosave. Wave 2 opened with A11's review of the whole program, then each owner fixed its own files, and the sampler was added. `DISCUSSION.md` (22 threads for wave 1; a wave-2 section follows) is the conversation as the logs recorded it. Agents did not message each other directly: they wrote requests in their logs, read each other's logs, and the coordinator relayed and ruled.

## 3. Result

The app in `app/` runs in a browser (`node tools/serve.js`, then `http://localhost:8000/app/`) and as an Electron app (`cd app && npm install && npm start`). What it does, with the check that shows it:

| Capability | Evidence |
|---|---|
| Plays the Guidance recreation as a song document: 13 tracks, 200 bars, 9 sections, variants per section, a sparse step record (velocity, accent, length, nudge, probability, condition, repeats, parameter locks) | `app/engine/selfcheck.js`, 337 checks, exit 0, including schedule equivalence with the archived engine |
| System Editor: section ruler, track rows in stem groups, the selected track's device chain with returns and master pinned right, a step drag that previews and commits once | `tools/system-editor-check.js`, 76, against the real Host, Widgets, Faces and Windows |
| Step View: every step of every track editable, step editor lanes, variant panel with fork-on-first-edit and scope, follows the playhead by default and defers while you drag | `tools/step-view-check.js`, 72 |
| Device faces: 25 definitions (14 instruments, 10 processor types, channel) at chip, strip, face and window density, one hero graph each, shape-only state markers, lint at 0 | `tools/faces-check.js`, 1167 |
| Widgets: SVG knobs, sliders, steps, meters, curves with keyboard and drag, gesture phases | `tools/widgets-check.js`, 157 |
| Floating device windows: in-page panels on the web, child windows in Electron; link modes off/single/multi, pin, tile, cascade, hide-all; the window shows the hero and the controls | `tools/browser-check.js`, 26 (opens a window from a face title); A6's Electron runs under Xvfb (`log-A6.md`) |
| Save and open a song as JSON (download and file input on the web, dialogs in Electron), autosave and restore, undo and redo including knob gestures | browser-check (save, autosave); selfcheck section 5 and 6; A1's and A6's Chromium runs |
| Sampler tracks: load an audio file, play it or a slice with pitch, envelope, loop and choke groups, add a track by dropping a file or from the track menu, re-add a missing file | `tools/synths-check.js`, 74; selfcheck section 6; system-editor-check (drop and menu); A1 heard a sample in its own Chromium run (`log-A1.md`) |
| Offline render and WAV export, 200 bars in about 89 s | A9's run (`log-A9.md`, wave 2); the coordinator timed 16 bars at 5.9 s |
| Render-versus-reference scoring: loudness, true peak, band levels, kick glide, sub duck, tempo | `python3 tools/score.py --selftest`, exit 0; A9's comparisons in `log-A9.md` |

Every number in the table was produced by a check run by the coordinator on one tree at the final wave-2 commit, except where a log is named. The final counts: selfcheck 337, synths 74, processors 62, widgets 157, faces 1167, system-editor 76, step-view 72, browser-check 26, score selftest OK.

## 4. What the integration review found, and what happened to it

A11 read every module as one program at commit `6ab1499` and wrote `log-A11.md`. Its findings, by severity, and their outcome:

- **Render cost grew with the square of the range.** `Sequencer.render` scheduled the whole range before rendering, so every voice (946 voices, 9,579 nodes at 48 bars) sat in the graph for the whole render. A11 measured 111.6 s for 48 bars of the song and 13.0 s with bars scheduled two ahead through `OfflineAudioContext.suspend`. The coordinator's earlier suspects (A8's Freeverb, the seeded reverb IR, sends, ducking) each measured within 2 s of the baseline: not the cause. A1 implemented the chunked schedule; A9 then measured 0.44 s per bar for the full song (was 1.05 s per mainA bar) with the output unchanged to measurement precision (`log-A9.md`, wave 2). Fixed.
- **Jumping or rendering from mid-song did not apply earlier sections' settings** (after a visit to the break, mainA2 played kick at 0.6, clap at 0.6, stab cutoff 900 instead of 1, 1, 1500). Ruling: jumps apply the arrangement's state at the target, except held paths. A1 fixed it; the coordinator's faces check needed one step adjusted because of the ruling (`log-A3.md`). Fixed.
- **Undo of a step edit reverted later knob moves.** Ruling: one undo snapshot per `host.hold` call. A11's audit confirmed every face knob calls `hold` once per gesture. A1 fixed it; A6 made the BPM and swing fields hold too. Fixed.
- **Bypass had no Host call and was not saved.** A1 added `host.bypass`, stored in the document, honoured by rebuild and export, undoable; A6 wired windows and the Electron bridge to it. Fixed.
- **Instrument level ignored the scheduled time**, so a section's level change landed at t=0 in an export. A7 fixed it for every instrument; A9 confirmed in a render that the break's kick drop measures −4.40 dB with the master bypassed, which is 20·log10(0.6). Fixed.
- **One 40 px step drag made 21 undo entries and 19 commits.** A2 added gesture phases to the widgets; A4 previews on move and commits once on release. Fixed.
- **The window's Editor tab showed only the hero graph**, because the face took the whole body for the graph. A3 redefined `resize(w, h)` as the whole face area with the hero capped at about 45 % of the height, and the window no longer draws a second title bar. Fixed; the coordinator saw it in a screenshot (`docs/screenshots/app-device-window.png`).
- **Electron: a retargeted window kept its old device id.** A6 fixed it and found a second cause (windows shared a name per device id, so `window.open` navigated the existing one). Fixed in A6's Xvfb run; not reproduced by the coordinator.
- **Minor**: export ignored held values, a fork could reuse a section's letter, a refused step edit still added an undo entry (A1, fixed); the BPM field applied every keystroke (A6, fixed); child windows refreshed on a poll (A6, now on document events); knob double-click home was the spec default, not the song's value (A3, fixed); a face mute toggle counted as held (A3, fixed; ruling: mute and solo are not arrangement parameters).
- **Confirmed working**: save then load is identical after locks, forks, longer variants, fx hits and knob writes; locks reach the voice and are restored; all 6,246 voices of the full song leave `inst._live`; nothing is copied from another project, so the empty `THIRD_PARTY.md` is correct.

A11 also asked three questions the coordinator answered (`log-coordinator.md`, 2026-10-23 23:5x entry): gestures end only through "Re-enable arranged" for the held meaning; the sampler drops its own `gain` and uses the common instrument `level`, and reads `ev.midi`; jumps apply the arrangement.

## 5. Sound

The build has been measured more than heard. What is known, from `log-A9.md`:

- The scoring loop reproduces O1's loudness within 0.05 LU on all seven sections of the reference and its true peak within 0.01 dB (wave 1).
- After the chunked render, the full 200-bar render measures −6.82 LUFS against the reference's −10.65 (+3.8 LU) and a true peak of +0.88 dBTP, above full scale: the master limiter is not holding a ceiling. This is independent of chunking. A8 fixed it; section 7.
- The V2 song's sub duck matches the reference for 0 to 60 ms and is 14 to 15 dB too deep at 100 to 150 ms (A7's item). The baseline intro is about 14 dB hot in the mids (owner undecided: synth level or EQ).
- A9's open measurement questions: band levels read 1 to 2 dB above O1's table in every section (method difference, not identified); O1's stab-step correlation is not reproduced; the kick-glide fit is unreliable on renders though fine on the reference; the build section's tempo reads 63 BPM (a two-beat pick).
- Nobody has heard A8's processor changes (delay loop filters and modulation, Freeverb, seeded IR, chorus base/invert, widener monoBelow, sidechain curve). Their automation is identical to the archived engine for every pre-existing parameter (`tools/processors-check.js`, 54).

## 6. The sampler

The owner's clarification (a provided track's sample-based elements stay samples) became PRD D8 and milestone 5b. What exists now: a `sampler` instrument (A7) with buffer, start, end, pitch, attack, release, loop and choke groups, driven like any instrument so steps, locks, probability, conditions and repeats apply unchanged; `host.loadAudio`, `audio()`, `buffer(id)`, `unloadAudio`, `addSampler` and an `'audio'` event, with decoding through an OfflineAudioContext before Start (A1); the document's `audio` map as references only, never bytes (A1); `Project.open` reloading samples through the shell's `readFile` with the project folder as base, listing the rest as missing (A1, A6); `Project.pickAudio` and `pathForFile` (A1, A6); a sampler face with the waveform and draggable start and end handles as its hero (A3); a drop target and a "+ track" menu in the System Editor (A4); "Re-add sample" in a window and in the Open toast (A6). Not built: `SongDoc.sliceToTrack` (cutting a stem at section and step boundaries), which is milestone 6's first step. Not verified by anyone: a real OS file drag, the Electron native dialogs, and the whole path on macOS or Windows.

## 7. The master chain fix

A8 reproduced A9's full-song numbers exactly (−6.82 LUFS, +0.88 dBTP, sample peak −0.34 dBFS) and found why: the master limiter's `ceiling` was only a fixed output gain after a compressor with a −2 dB threshold and 1 ms attack, so nothing limited the output and fast transients overshot by about 3.5 dB (A8's arithmetic from the measured true peak). The fix, all in the master limiter unit (`log-A8.md`, wave 2): a new `clipOn`/`clip` pair, off by default so existing songs are unchanged; on, it is a 4× oversampled hard clip at `clip` dBFS, the real ceiling. The master's own settings changed to threshold −6 dB, ceiling (output trim) −4.2 dB, `clipOn` true, `clip` −0.5 dBFS. On the full render the clipper never engaged (sample peak −4.76 dBFS). Results, `tools/score.py --json` on A8's full 200-bar render: −10.75 LUFS against the reference's −10.65, true peak −3.77 dBTP. The coordinator reproduced the 16-bar mainA window: −11.25 LUFS and −4.21 dBTP here against A8's −11.25 and −4.21. `tools/processors-check.js` grew to 62 and the automation of every pre-existing parameter is still identical to the archived engine. Limits A8 states: this is a safety net, not the AudioWorklet true-peak limiter from the Gear Crew order of work; the saturator was not measured as a peak source; nothing was listened to; mainA reads about 1 LU under its reference section while the full song is on target, measured on different windows.

## 8. What is not verified

Collected from the logs' own "not verified" lists and `app/README.md`:

- The Electron shell has been launched only under Xvfb by A6 (window open, retarget, bypass, app-data round trip, `readFile`, `pathForFile`). Native open and save dialogs, bounds persistence across launches, and macOS and Windows behaviour have not been run by anyone. The coordinator has not reproduced any Electron run.
- No one has listened to the app. A1 heard one sample through a sampler; everything else about sound is a measurement in `log-A9.md`.
- Real pointer and touch input in a browser: the checks drive synthetic events or a fake DOM; A4's drop used synthetic `DragEvent`s; the real file pickers are stubbed.
- Accessibility: A2's contrast and colour-blind checks are not done; screen-reader output is untested; Tab switches views as the contract says, which takes it from focus movement.
- Faces' hero numbers are A3's reading of the engine, not measurements.
- Not built, listed by owner in `DISCUSSION.md` "Left open for wave 2": Mixer drawer, A/B and preset menus (A6); overview-box drag, right-click variant cycling, chord-progression editing from the strip (A4); paint-drag, length-drag, marquee, copy and paste, 2-bar view, Rnd/Clr/Copy (A5); sidechain offset, exponential IR envelope and IR swap click, Dattorro (A8); hero end-point drag on non-sampler faces (A3).

## 9. What the method taught

- **A contract first, one owner per file, one check per module** let ten agents work on the same program at once with few collisions. The collisions that happened were all at interfaces nobody had written down (`Windows.open`'s signature, the editor operations A5 needed, `project.js` missing from the load order), and each was settled in a log within one round.
- **Checks against fakes hide real failures.** A4's check passed against a fake Windows and failed against the real one; A10's check looked for a selector the real faces did not have. The rule since: cross-module checks run against the real modules, and the coordinator reads exit codes directly, never through a pipe (one pipe hid an exit code in wave 1; `log-coordinator.md`, 23:14).
- **A reviewer who measures beats a coordinator who guesses.** The render slowness had four named suspects, all wrong; A11's measurement found the cause in an hour and the fix was forty lines.
- **Transient check failures while another owner edits the file under test** happened twice; cross-module checks should run on a snapshot, not a moving tree.
- **A scribe compiling the discussion found a dozen inconsistencies between logs** (check counts that changed as checks were rewritten, a render-time estimate that did not match the measured rate). Transcripts were not edited; the coordinator appended corrections. That is the right order: records stay, corrections are visible.

## 10. Decisions for the owner

1. Listen. Every claim about sound is a measurement; the app has not been heard end to end. The web app runs with `node tools/serve.js`.
2. Whether the master should be brought to the reference's loudness by the master stage alone (A8's wave-2 task) or by rebalancing the mix, which would change the measured band levels.
3. The baseline intro's 14 dB excess in the mids: a synth level change or an EQ match (Gear Crew S3's offline EQ-match proposal).
4. Milestone 6 (the remix pipeline: stems, MIDI, the bundle import, `sliceToTrack`) is the next large piece; its front end runs offline in Python per the Gear Crew report, which the owner has not yet confirmed.

## 11. Files

- `app/` (engine, ui, shell, `CONTRACT.md`, `README.md`), `tools/` (serve, browser check, render, score, one check per module, `README.md`).
- `BRIEF.md`, `transcripts/log-A1.md` to `log-A11.md`, `transcripts/log-coordinator.md`, `DISCUSSION.md`, this report.
- `docs/plans/2026-10-23-desktop-build-plan.md` carries the milestone status lines; `future.md` the backlog; `docs/screenshots/app-*.png` the app as rendered in headless Chromium.
