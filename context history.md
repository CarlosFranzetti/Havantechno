# Context history

Dumps of the working context, each with a UTC date and time stamp. A new dump is written every 7 to 8 user updates, then the context window is compacted. New dumps are appended under the marker at the bottom; older dumps stay as they are.

Cadence tracker: last dump at 2026-10-23 16:37:59 UTC. Updates since: 2. Next dump due at update 7.

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

<!-- next dump goes here -->
