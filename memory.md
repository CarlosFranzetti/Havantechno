# Memory

This file is the project's working memory. The first part, **Now**, is rewritten as the project moves and is the place to look first; the dumps below it are the older record and stay as they were written. The periodic context dumps are in `context history.md`.

## Now (updated 2026-11-27 02:25 EST (07:25 UTC))

**What this is.** **Recut** (called Havantechno until 27 November 2026; Havantechno stays as the maker's mark on the instrument panels and pages, and as the repository's name): a remixing DAW that takes a record apart and rebuilds it with its own instruments. Web app plus an Electron desktop shell, plain JavaScript with no build step, AGPL-3.0-or-later, for the owner and a few friends, not for sale. Repository `CarlosFranzetti/Havantechno`, all work on `main` (GitHub's default branch is still an old `claude/` branch: clone with `-b main`).

**What exists and is checked.**
- The app (`app/`), version 0.2.0: arrangement (System Editor), Step View, Mixer and Sections views, floating device windows, Settings, project save and open and project bundles (a folder with the audio beside the document), audio export (the mix, stems or chosen tracks; song, section or bar range; 16, 24 or 32-bit), audio tracks with clips (no time-stretching), a sampler with programs, import of a track with an analysis report, reference lane and A/B with level match, stem separation from the desktop shell.
- Instruments: 27 TR-808 and TR-909 voices (`app/engine/drums.js`); the 909 from three sources, chosen on its panel: synthesized, the Rob Roy sample set (`app/engine/sampled909.js`, `app/assets/tr909-robroy/`), and the owner's ROM images for the hats and cymbals (`Drums.loadRom`); three AudioWorklet synths (`app/engine/classics.js`): `tb303`, `modeld` (note priority switch), `juno` (bucket-brigade chorus). Hardware-style panels (`app/ui/panels.js`) with step sequencers: HVT-808, HVT-909, HVT-303, HVT-D, HVT-106.
- Presets (`app/engine/presets.js`): patches, kits and patterns, saved, loaded and copied as text, in the app's device windows and on the pages.
- `Assets.ready(ctx, doc)` (`app/engine/assets.js`) with `app/assets/manifest.json` says which optional sets a copy carries and loads them; the tracked manifest says ROM false, Rob Roy true.
- Analysis (`app/analysis/`): synth or sample, mono or poly, FM or subtractive, 808 or 909, reverb, a suggested recreation; `tools/analyze.js`, `tools/separate.py` (HT-Demucs default).
- A page per instrument under `app/solo/` (303, d, 106, 808, 909), published for the owner.
- Packaging: electron-builder config and `.github/workflows/build.yml` (never run); a Linux AppImage was built and run once by an agent; macOS and Windows builds have never been made.
- Checks, last run by the coordinator on 27 November, all exit 0: `node app/engine/selfcheck.js` (475), `node tools/browser-check.js` (30) and `tools/*-check.js` (analysis 26, classics 131, drums 372, export 51, faces 2499, import-view 122, importer 20, panels 202, presets 1908, processors 92, rom909 12 where the images are in `local/`, sampled909 116, shell-files 227, shell-separate 92, solo 151, step-view 72, synths 169, system-editor 105, views 144, widgets 157). `tools/drums-score.js`: 86 pass, 19 fail (exit 1, the baseline).

**Published pages (private to the owner).** Playable instruments: HVT-303 https://claude.ai/artifact/CK2Y94feFhT1N68CmY33Fh , HVT-D https://claude.ai/artifact/GGVMp2gh9LHXaVBTxhWa4T , HVT-106 https://claude.ai/artifact/XcP8dCgjCuCsgDJ7wXXqF4 , HVT-808 https://claude.ai/artifact/QMD7Xk4yr5MfZuTgnkjzXk , HVT-909 https://claude.ai/artifact/VjyMn1eweUDvBAz8vbBHyB . Republished 27 November. Each is built with `node tools/solo-bundle.js app/solo/<name>.html --test --note "…"` and published from `tools/out/bundles/<name>/` (the page plus every file in its `files.json`). The 909 is built with `--asset-dir assets/tr909-robroy=app/assets/tr909-robroy --rom-dir <folder with the three images> --write-file 'assets/manifest.json={"tr909-rom":false,"tr909-robroy":true}'`: the hosting serves no file with a chip-image extension, so `--rom-dir` carries the images inside a script. Sharing the 909 page shares the samples and the images. Render Room (renders to listen to): https://claude.ai/artifact/D9a1XyaKNManzV714jEUzj (its source files were lost with a scratch folder).

**Next, in order.** The first run of the GitHub build. The ROM images into `app/assets/tr909-rom/` once the owner says the repository is private. Then `docs/plans/2026-11-21-strategy.md`: the separator's output, a reverse-engineering loop on the 303 (schematic values, a simulated reference, a ported diode ladder), the detection engine's second version; version 0.3 (hosting VST and AU plug-ins) after `docs/research/2026-11-26-pressing-crew/transcripts/R1-plugin-hosting.md`.

**Open small items.** Kits and patterns do nothing on a sampled 909 kit; `assets.js` asks for the Rob Roy set when the manifest cannot be read; the app's toolbar is wider than a phone; the sampler's round robin counts from a render's start; nothing run in Electron for `readRoms`, `importRoms`, `makeDirectory`; no DISCUSSION or REPORT yet for the Dubplate, Showroom and Pressing crews; context-history dump 7 is due.

**Nobody has listened.** Every statement about sound in this repository is a measurement. No instrument has been compared with a real unit. The Model D's knob laws follow a modern recreation, not an original.

**Standing rules.**
- Commit messages name no model; trailers are `Co-Authored-By: Claude <noreply@anthropic.com>` and the session link. No force-push or history rewrite without permission. Commit and push after every verified piece; agents' unfinished files go in commits labelled WIP.
- The coordinator verifies before committing: runs the checks itself and reads exit codes, looks at screenshots, and re-measures at least pitch and level for an instrument. Rulings given to agents in messages are written into the coordinator's log at the time.
- Agents: one owner per file; no commits; never git stash, checkout, reset or clean in the shared tree; logs with Eastern Time and UTC.
- Nothing under someone else's copyright in the repository (reference audio, manuals, schematics, model weights). The ROM images and the unlicensed sample pack stay in the git-ignored `local/` folder, and nothing from it enters a tracked path, until the owner says the repository is private. `app/assets/tr909-robroy/` is never modified (its own terms). No maker's marks on panels. Original patterns and presets only.
- Research: every claim tagged as read, search summary or memory; no invented sources.
- Times shown to the owner are Eastern Time.

**Lost and needed again.** The cloud machine has been replaced more than once and its scratch folder wiped: the Guidance recording and the three Roland manuals must be uploaded again when work needs them.

**Decided by the owner on 26 November.** Computer: a Mac with an Apple chip. Builds: an automatic build with installers on a draft release is approved. Separation models with non-commercial or missing licences: optional, labelled downloads. The 909's ROM: wanted; the owner supplied the ROM images and two sample sets, said the project is not for commercial release, and asked for the samples included with a loading option for later, in the published 909 page too. The owner chose to make the repository private so the images can be committed (not yet confirmed done). HVT-D note priority: a switch, lowest note by default. HVT-106 chorus: realistic, switchable. The app's new name: **Recut** (applied 27 November: `RecutShell`, `<name>.recut.json`, `recut://app/`, application id `io.github.carlosfranzetti.recut`; files that say `havantechno` are still read).

**Waiting on the owner.** The Guidance recording and the Roland manuals again; recordings of real units; panel photos; the repository made private; GitHub's default branch set to `main`; a list of VST and AU plug-ins wanted; and listening to the pages and the Render Room.

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
