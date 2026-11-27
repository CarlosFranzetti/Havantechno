# Memory

This file is the project's working memory. The first part, **Now**, is rewritten as the project moves and is the place to look first; the dumps below it are the older record and stay as they were written. The periodic context dumps are in `context history.md`.

## Now (updated 2026-11-26 19:12 EST (00:12 UTC))

**What this is.** Havantechno: a remixing DAW that takes a record apart and rebuilds it with its own instruments. Web app plus an Electron desktop shell, plain JavaScript with no build step, AGPL-3.0-or-later, for the owner and a few friends, not for sale. Repository `CarlosFranzetti/Havantechno`, all work on `main` (GitHub's default branch is still an old `claude/` branch: clone with `-b main`).

**What exists and is checked.**
- The app (`app/`): arrangement (System Editor), Step View, floating device windows, project save and open, WAV export, a sampler with programs, import of a track with analysis report, reference lane and A/B with level match, stem separation from the desktop shell.
- Instruments: 27 TR-808 and TR-909 voices (`app/engine/drums.js`), and three AudioWorklet synths (`app/engine/classics.js`): `tb303`, `modeld`, `juno`. Hardware-style panels (`app/ui/panels.js`): HVT-808, HVT-909, HVT-303, HVT-D, HVT-106.
- Analysis (`app/analysis/`): synth or sample, mono or poly, FM or subtractive, 808 or 909, reverb, a suggested recreation; `tools/analyze.js`, `tools/separate.py` (HT-Demucs default).
- A single-instrument page for the 303 (`app/solo/303.html`), published for the owner.
- Checks: `node app/engine/selfcheck.js` (448) and `tools/*-check.js`; `tools/tb303-bench.js` measures the 303; `tools/drums-score.js` scores the drums against the manuals (86 pass, 19 fail).

**Published pages (private to the owner).** Playable instruments: HVT-303 https://claude.ai/artifact/CK2Y94feFhT1N68CmY33Fh , HVT-D https://claude.ai/artifact/GGVMp2gh9LHXaVBTxhWa4T , HVT-106 https://claude.ai/artifact/XcP8dCgjCuCsgDJ7wXXqF4 , HVT-808 https://claude.ai/artifact/QMD7Xk4yr5MfZuTgnkjzXk , HVT-909 https://claude.ai/artifact/VjyMn1eweUDvBAz8vbBHyB . Each is built from a page under `app/solo/` with `node tools/solo-bundle.js --all --test` and republished from `tools/out/bundles/<name>/`. Render Room (renders to listen to): https://claude.ai/artifact/D9a1XyaKNManzV714jEUzj .

**In progress (26 November).** Showroom Crew: a page per instrument with a step sequencer, presets and pattern save and load, also in the app. Pressing Crew: the next version (0.2): audio export of the arrangement and of single tracks, audio tracks, a mixer and a clip view, settings, packaged builds for macOS, Windows and Linux; research for 0.3 (hosting VST and AU plug-ins). Briefs: `docs/research/2026-11-26-showroom-crew/BRIEF.md`, `docs/research/2026-11-26-pressing-crew/BRIEF.md`.

**The plan after that.** `docs/plans/2026-11-21-strategy.md`: fix the separator's output, a reverse-engineering loop on the 303 (schematic values, a simulated reference, a ported diode ladder), and the detection engine's second version (fitting the app's own instruments to each element).

**Nobody has listened.** Every statement about sound in this repository is a measurement. No instrument has been compared with a real unit. The Model D's knob laws follow a modern recreation, not an original.

**Standing rules.**
- Commit messages name no model; trailers are `Co-Authored-By: Claude <noreply@anthropic.com>` and the session link. No force-push or history rewrite without permission. Commit and push after every verified piece; agents' unfinished files go in commits labelled WIP.
- The coordinator verifies before committing: runs the checks itself and reads exit codes, looks at screenshots, and re-measures at least pitch and level for an instrument. Rulings given to agents in messages are written into the coordinator's log at the time.
- Agents: one owner per file; no commits; never git stash, checkout, reset or clean in the shared tree; logs with Eastern Time and UTC.
- Nothing under someone else's copyright in the repository (reference audio, manuals, schematics, ROM images, model weights). No maker's marks on panels. Original patterns and presets only.
- Research: every claim tagged as read, search summary or memory; no invented sources.
- Times shown to the owner are Eastern Time.

**Lost and needed again.** The cloud machine has been replaced more than once and its scratch folder wiped: the Guidance recording and the three Roland manuals must be uploaded again when work needs them.

**Decided by the owner on 26 November.** Computer: a Mac with an Apple chip. Builds: an automatic build with installers on a draft release is approved (the workflow is in `.github/workflows/build.yml`; the first run still waits for a go). Separation models with non-commercial or missing licences: optional, labelled downloads. The 909's ROM: wanted; the owner supplied the ROM images and two sample sets. The Rob Roy set is in `app/assets/tr909-robroy/` under its own terms; the ROM images and the unlicensed pack are in the git-ignored `local/` folder until the owner makes the repository private (the owner's choice), then they are committed. HVT-D note priority: a switch, lowest note by default. HVT-106 chorus: realistic with a hiss control. The app's new name: **Recut** (not applied yet: one change after the running work lands).

**Waiting on the owner.** The list is the last page of the transcript PDF of 26 November and `docs/plans/2026-11-21-strategy.md` section 6: files to upload, which computer, whether builds may be published, optional model downloads, the 909's ROM, the name, HVT-D note priority, the Juno's chorus noise, GitHub's default branch, and listening.

## Earlier dumps

Each dump below has a date and time stamp in UTC.

## Dump 1 at 2026-10-21 18:10:36 UTC

### Repo and branch

- This repo, branch `claude/song-synths-sequencer-processors-e79zyb`. Remote `CarlosFranzetti/Havantechno`.
- Commits that make up the studio: `546a2c6` and `8ada6b8`. Later commits: `5c15f37` (a README cleanup, authored by the user), `6de79fc` (CLAUDE.md), `b7a1540` (README, PRD, future notes, this memory file).
- The repo was created by the user. Creating it from this session returned 403, so it was attached with `add_repo`.

### Work done

- The studio was built: 13 synths, a sequencer, a processor rack, 200 bars, offline WAV export. The self-check passes with 161 checks.
- CLAUDE.md was written and pushed as `6de79fc`.
- Screenshots were taken with headless Chromium into `docs/screenshots/`: `studio-playing.png` and `studio-rack.png`.
- `prd.md`, `future.md`, `memory.md` and a new `README.md` were written.

### Decisions

- **Commit attribution.** Commits name no model. The Co-Authored-By line uses the generic Claude address, because the system instructions forbid model identifiers in commits. The Claude-Session trailer is kept.
- **Context dumps.** Dumps are written by hand to this file. A scheduled or hook-driven dump is not set up.
- **Stale history.** Commit `546a2c6` names a model in its co-author line. It is not rewritten, since that needs permission.

### Facts worth keeping

- Studio: 126 BPM, key B, sections intro (16), intro2 (8), build (16), mainA (32), mainA2 (32), break (24), breakEnd (8), mainB (48), outro (16).
- Studio mix: the 300 Hz to 1 kHz band is several dB hotter than the reference. Measured, not listened to.

### Still open

- Everything in `future.md` under **Open items**.

## Dump 2 at 2026-10-23 16:13:17 UTC

- This repo now holds only the studio. The other project's files were removed from it, and its references were scrubbed from the studio's source headers, spec, README, CLAUDE.md, PRD, future notes and the dumps above.
- The studio's README, CLAUDE.md, PRD and future notes were rewritten to cover only the studio.

## Dump 3 at 2026-10-23 16:44:28 UTC

- The studio was moved to `olde Havantechno dub studio/` and is frozen there. A local symlink `studio/` (not in git) stays until the Faceplate agents finish.
- Roundtable research is running in `docs/research/`: Gear Crew (gear and pipeline) has 12 round-1 reports and is in round 2; Faceplate (layout and device looks) has 12 round-1 reports and is in its discussion round, with a vote to follow.
- `context history.md` now carries the periodic dumps (every 7 to 8 updates); this file is kept for the record.
- Owner decisions still open: repo licence, offline vs in-browser analysis, audio files, hosting headers, whether to use the account's saved design system for mockups (default: no).
- A stray cloud session was created by a research agent's mistake; it was told it has no task and may archive itself.

<!-- next dump goes here -->
