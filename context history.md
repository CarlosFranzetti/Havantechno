# Context history

Dumps of the working context, each with a UTC date and time stamp. A new dump is written every 7 to 8 user updates, then the context window is compacted. New dumps are appended under the marker at the bottom; older dumps stay as they are.

Cadence tracker: last dump at 2026-10-23 23:23:16 UTC. Updates since: 0. Next dump due at update 7.

Earlier dumps from before this file existed: `context.md` (2026-10-21) and `memory.md` (2026-10-21 and 2026-10-23).

What a dump is: a written summary of the state of the work, the decisions and what is still open. It is not a verbatim copy of the context window.

## Dump 1 at 2026-10-23 16:37:59 UTC

### Repos

- **Havantechno** (`/home/user/havantechno`, remote `CarlosFranzetti/Havantechno`), branch `claude/song-synths-sequencer-processors-e79zyb`, head `5dd3665`. Holds only the studio and its docs.
- **AassMaster** (`/home/user/AassMaster`, remote `CarlosFranzetti/AassMaster`), same branch name, head `5f4419f`. Holds only the game. The two were separated on 2026-10-23 after being mixed; neither history was rewritten.

### Havantechno layout

- `olde Havantechno dub studio/`: the Web Audio studio, archived as it stood on 2026-10-23 (moved from `studio/`). 13 synths, 10 processors, 16-step sequencer, 200-bar arrangement, WAV export. Self-check: `node "olde Havantechno dub studio/selfcheck.js"`, 161 checks pass.
- A local-only symlink `studio → olde Havantechno dub studio` exists in the working copy (excluded via `.git/info/exclude`) so running research agents can still read the old path. Remove it when Faceplate round 1 finishes.
- Docs: `README.md`, `CLAUDE.md`, `prd.md` (with section 4b, direction D1 to D4), `future.md`, `memory.md`, `context.md`, this file, `docs/screenshots/` (studio-playing.png, studio-rack.png), `docs/superpowers/specs/2026-10-21-guidance-studio-design.md`.

### Roundtable (the research process)

Named and documented in `docs/research/README.md`. Multi-model agent teams research in parallel, write transcripts, read each other, discuss, vote; the coordinator (this session) writes the report.

- **Gear Crew** (`docs/research/2026-10-23-plugin-gear/`): what plugins and tools could recreate a source track in the browser. Round 1: 11 of 12 reports in and committed (H1 to H5, S1 to S5, O1). Waiting on O2 (DAW platform). Then round 2 (O1 and O2 critique and ask numbered questions), round 3 (category agents answer, paired H1–S1, H2–S3, H3–S2, H4–S4, H5–S5), round 4 (O1 and O2 syntheses), then `REPORT.md`.
- **Faceplate** (`docs/research/2026-10-23-faceplate-layout/`): DAW layout and per-device looks, with Ableton Live and Logic Pro as references. Round 1 running: 12 agents dispatched. Then round 2 discussion (each agent reacts to others and gives one layout suggestion → `DISCUSSION.md`), round 3 vote (ranked ballots → `VOTE.md`), then `REPORT.md` and layout mockup artifacts.
- Agent ids for continuing agents are in the scratchpad file `roster.txt` (not in the repo).

### Findings so far worth keeping (from Gear Crew round 1)

- Sandbox limits: page fetches failed (DNS, proxy 403), so most "verified" marks rest on search excerpts. Web search has a shared per-turn budget that ran out late in the round.
- O1: the spec measured rhythm and pitch, not timbre, so most synth settings are guesses; the measured "sub" may be the kick's own tail; the mid bass is the likely cause of the 300 Hz to 1 kHz excess; the kick tune (44 Hz) is a tritone off B; the open hat's 1.5 kHz ring is probably filtered out by its 3.5 kHz highpass.
- Licensing is the recurring question: the repo has no LICENSE file, and several candidate engines (webOBXD, junox, Dexed, Mz101, Dragonfly) are GPL or AGPL. MIT options: Tone.js, Demucs, libebur128, Airwindows, sndfilter. Decision needed from the owner.
- S5: Demucs v4 (MIT) for stems, Basic Pitch (Apache 2.0) for notes; no 4-stem model separates sub from kick; the browser build needs COOP/COEP headers that `python3 -m http.server` does not send. Open question: may analysis run offline in Python and export a bundle the studio imports?
- S3: fix the 300 Hz to 1 kHz excess with an offline EQ-match (average-spectrum difference fitted to eq3 bands) rather than a plugin; find the source per stem first.
- S1: extend the trigger-driven sidechain (curve, lookahead, low-band mode); replace the master glue DynamicsCompressorNode with an AudioWorklet compressor.
- S2: rebuild the reverb on the public-domain Freeverb topology; move the delay's filters inside the feedback loop.

### Decisions

- Commits carry `Co-Authored-By: Claude <noreply@anthropic.com>` and the Claude-Session trailer, no model name.
- No history rewrites and no force-pushes without the owner's go-ahead.
- Layout mockups will be built without the account's "Design System" artifact unless the owner says otherwise.
- Context dumps: this file, every 7 to 8 updates, then compact.

### Open with the owner

- Licence for the repo (decides which open-source engines can be ported).
- Whether the analysis pipeline may run offline in Python.
- Whether the stale model-name attribution on commit `546a2c6` should be rewritten.

## Dump 2 at 2026-10-23 23:23:16 UTC

Covers the owner's updates 1 to 7 after Dump 1: "can I see what the agents have been talking about", "update all .md files and the readme", the desktop redirect (Mac/PC DAW, Logic-shaped, floating per-device windows, the voted layout is named System Editor, add a Step View), the four decisions (Electron shell, a licence that lets GPL/AGPL code in, version 1 edits and saves songs, audio files at runtime), "start to build this as both a web and desktop app" with a Fable-led crew that researches, codes and talks, and the clarification that sample-based elements of a provided track stay samples.

### Repos

- **Havantechno** (`/home/user/havantechno`, remote `CarlosFranzetti/Havantechno`, branch `claude/song-synths-sequencer-processors-e79zyb`). Head at this dump: `46190a5`. Everything below lives here.
- **AassMaster** untouched since Dump 1 (head `5f4419f`), game only.

### Research closed since Dump 1

- **Gear Crew** done: rounds 2 to 4 and `docs/research/2026-10-23-plugin-gear/REPORT.md` (36 transcripts). Headline: the measured facts of the reference are 126 BPM, 21,000 samples per beat, kick glide 51+213·e^(−t/24 ms) Hz, sub a 34.47 Hz drone ducked −15 dB, −10.7 LUFS, section starts at bars 24/40/104/120/136/184.
- **Faceplate** done: rounds 1 to 5, `DISCUSSION.md`, `VOTE.md`, `REPORT.md` with the round-5 addendum for the desktop redirect. Strip Bench won with 28 points and is now called the **System Editor**; Matrix Bench 20; Stem Bench 9. Voters' amendments: returns and master pinned right, stem group headers, PATTERN face first in the chain, state markers are shapes not hues (dot set, arc ramp, ring held), channel strip last in signal order.
- Layout canvas artifact (7 boards: System Editor, Matrix Bench, Stem Bench, Tracks and Editors, Faces, FloatingWindows, StepView): https://claude.ai/artifact/Wy3gZLnLoShp6uzxrNVfP7. Sources in the scratchpad `canvas/project/`.

### Decisions taken (prd.md 6b)

- Electron shell. Licence AGPL-3.0-or-later (`LICENSE` is the full text from the spdx-license-list package; `THIRD_PARTY.md` lists ports). Version 1 edits the Guidance recreation and saves it as a named, editable song. Audio files allowed at runtime; none in the repo. **D8**: when a provided track is separated into elements, sample-based elements (vocals and the like) become sampler tracks, not synth recreations; every provided track is different. Milestone 5b in the plan.
- Knob gestures go on the undo stack in wave 2, one snapshot per gesture taken on the first `hold`; until then knob moves are not undoable.

### The build (plan: `docs/plans/2026-10-23-desktop-build-plan.md`)

- `app/` is the live DAW: `app/engine/` (archived files plus `songdoc.js`, `host.js`, `project.js`; `selfcheck.js` 263 checks), `app/ui/` (`widgets.js`, `theme.css`, `faces.js`, `facedefs.js`, `system-editor.js`, `step-view.js`, `windows.js`, `app.js`), `app/index.html`, `app/shell/` (Electron `main.js`, `preload.js`), `app/package.json`. `app/CONTRACT.md` is the module contract the crew builds to. `tools/` holds `serve.js` (COOP/COEP), `browser-check.js`, `render.js`, `score.py` and one `*-check.js` per module.
- Song document: variants `{bars, cells}`, sparse step records `{vel, acc, len, nudge, note, prob, cond, rep, locks}`, copy-on-write forks, snapshot undo, v1 JSON save/load, schedule-equivalent with the archived engine.
- **Build Crew** (`docs/research/2026-10-23-build-crew/`, logs per agent in `transcripts/`): A1 Host and Project (verified, 263), A2 widgets and theme (134), A3 faces (982), A4 System Editor (its check is red: the check's ruler click moves the transport; fix sent), A5 Step View (53), A6 windows, app frame, shell (in progress), A7 synth fixes (36), A8 processor fixes (54), A9 render and score loop (in progress), A10 browser-check (3 failures, all A6/A4 items). Wave-1 gate: `node tools/browser-check.js` once A6 lands.
- Wave 2 planned: A11 (Opus) integration review, owners fix their own files, sampler (A7 instrument, A1 `Host.loadAudio`, A4/A5 UI), CONTRACT.md updated with A1's additions, then `DISCUSSION.md` and `REPORT.md` for the Build Crew.

### Rules in force

- Commits: `Co-Authored-By: Claude <noreply@anthropic.com>` and the Claude-Session trailer, never a model name. No history rewrite or force-push without the owner.
- Verify every hand-back by running its check and reading the exit code directly (a pipe hid one exit code once; logged in `log-coordinator.md`). Unverified agent files are committed only as clearly labelled WIP snapshots.
- Transcripts are records: never edited after the fact; corrections are appended.

### Open with the owner

- Confirm AGPL-3.0-or-later (GPL-3.0 is the alternative if the app must stay usable in closed network services).
- A stray cloud session `session_01YQ55qJkgnsfKmjr7VmKc1y` was opened by an agent by mistake; it has no task and can be archived.
- The stale model-name attribution on commit `546a2c6` is still in history.

<!-- next dump goes here -->
