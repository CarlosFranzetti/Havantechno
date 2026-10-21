# Memory

Each dump below has a date and time stamp in UTC. Append new dumps under the marker at the bottom. Older dumps stay as
they are.

Note on what a dump is: this file is a written summary of the working state, made from the session and the repos. It is
not a verbatim copy of the context window, which I cannot reproduce in full.

## Dump 1 at 2026-10-21 18:10:36 UTC

### Repos and branches

- **AassMaster**, `/home/user/AassMaster`. Remote `CarlosFranzetti/AassMaster`. Branch
  `claude/song-synths-sequencer-processors-e79zyb` at `8ada6b8`. The studio commits are `546a2c6` and `8ada6b8`. The
  rest of the branch is earlier game history. Nothing was removed from this repo when the studio moved.
- **Havantechno**, `/home/user/havantechno`. Remote `CarlosFranzetti/Havantechno`, the same branch name. Commits:
  `5c15f37` (the README cleanup, authored by the user), `6de79fc` (CLAUDE.md, pushed). This is the repo the studio and
  the game now live in.
- The repo was created by the user. Creating it from this session returned 403, so it was attached with `add_repo`.

### Work done

- The studio was built: 13 synths, a sequencer, a processor rack, 200 bars, offline WAV export. The self-check passes
  with 161 checks.
- The game was analysed as part of the repo: three stages, a mid-boss in stages 2 and 3, three bosses, ten regular
  enemies.
- CLAUDE.md was written and pushed as `6de79fc`.
- Screenshots were taken with headless Chromium into `docs/screenshots/`: `game-title.png`, `game-stage1.png`,
  `game-boss.png`, `studio-playing.png`, `studio-rack.png`.
- `prd.md`, `future.md`, `memory.md` and a new `README.md` were written.

### Decisions

- **Commit attribution.** Commits name no model. The Co-Authored-By line uses the generic Claude address, because the
  system instructions forbid model identifiers in commits. The Claude-Session trailer is kept.
- **Context dumps.** The earlier `context.md` dump is kept. These dumps go to `memory.md`. They are written by hand.
  A scheduled or hook-driven dump is not set up.
- **Stale history.** Commit `546a2c6` names a model in its co-author line. It is not rewritten, since that needs
  permission.

### Facts worth keeping

- Studio: 126 BPM, key B, sections intro (16), intro2 (8), build (16), mainA (32), mainA2 (32), break (24), breakEnd (8),
  mainB (48), outro (16).
- Studio mix: the 300 Hz to 1 kHz band is several dB hotter than the reference. Measured, not listened to.
- Game: stage 1 boss `boss_butt` (240 HP), stage 2 boss `boss_crack` (360 HP), stage 3 boss `boss_god` (440 HP).
- Screenshot scripts: `/tmp/claude-0/-home-user-AassMaster/341aa418-0695-5408-80be-331d2fec6cae/scratchpad/pw/shots.js`
  and `.../pw/rack.js`. They use Playwright from `/opt/node22/lib/node_modules/playwright` and Chromium from
  `/opt/pw-browsers/chromium`.

### Still open

- Everything in `future.md` under **Open items**.
- The docs commit for this dump, which is pending when this file is first written.

<!-- next dump goes here -->
