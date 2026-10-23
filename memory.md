# Memory

Each dump below has a date and time stamp in UTC. Append new dumps under the marker at the bottom. Older dumps stay as they are.

Note on what a dump is: this file is a written summary of the working state, made from the session and the repo. It is not a verbatim copy of the context window, which I cannot reproduce in full.

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
