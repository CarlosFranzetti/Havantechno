# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

The repo has no package.json, no build step and no linter. The studio is plain browser JS that loads as globals.

- Serve the folder over HTTP: `python3 -m http.server 8000`. The studio is at `http://localhost:8000/olde%20Havantechno%20dub%20studio/`.
- Archived studio smoke test: `node "olde Havantechno dub studio/selfcheck.js"` (161 checks). New engine: `node app/engine/selfcheck.js` (337 checks, including schedule equivalence with the archived engine, the Host and Project, and the sampler and audio map). Both print `OK: N checks passed` and exit 0 on success; neither has a flag to run one section, so to isolate a check you edit the script.
- App checks: `node tools/browser-check.js` (serves the repo, opens `app/index.html` in headless Chromium, 26 checks) and one Node check per UI module in `tools/*-check.js` (widgets, faces, system-editor, step-view, synths, processors). Run checks directly and read the exit code; a pipe to `tail` hides it.
- Serve the app with `node tools/serve.js` (COOP/COEP headers, port 8000), then open `http://localhost:8000/app/`. Desktop: `cd app && npm install && npm start`.
- Render and score: `node tools/render.js --page app --sections intro --bars 2` writes WAVs to `tools/out/` (ignored); `python3 tools/score.py <wav> --json` measures them; `tools/README.md` has the options. The offline render schedules two bars ahead and suspends once per bar; 48 bars take about 13 s (was 115 s), and a full 200-bar render has not been timed since.

## Repo shape

- `olde Havantechno dub studio/` is the archived first studio. Treat it as frozen: fix bugs there only if asked. New DAW work goes in new folders.
- `docs/research/` holds Roundtable research (see its README): briefs, per-agent transcripts, discussion, votes and reports. Transcripts are records; do not edit them. Paths inside them that say `studio/` mean the archived folder.
- `context history.md` gets a timestamped dump every 7 to 8 user updates, then the context is compacted. `memory.md` and `context.md` are earlier dumps.
- `prd.md` section 4b holds the remix-DAW direction (D1 to D8) and section 6b the decisions taken: Electron shell, AGPL-3.0-or-later licence, version 1 edits and saves songs, audio files allowed at runtime, sample-based elements of a provided track stay samples (sampler tracks). Read both before designing new UI or audio features.
- The build plan is `docs/plans/2026-10-23-desktop-build-plan.md`. New DAW code goes in `app/` (engine, UI and shell), not in the archived folder.
- Licence: AGPL-3.0-or-later (see `LICENSE`). Code from GPL-3.0 and AGPL-3.0 projects may be ported with attribution; keep a `THIRD_PARTY.md` entry for each. CC BY-NC material stays non-commercial.

## Architecture

`app/` is the DAW; `app/CONTRACT.md` is the module contract (load order, one owner per file, the Host, Project, Widgets, Faces, Windows, SystemEditor and StepView interfaces). The UI talks only to `Host`, never to the sequencer. `app/engine/` is the live engine (see `app/README.md`): the archived files plus `songdoc.js`, loaded before `sequencer.js`, then `host.js` and `project.js`. Tracks hold `variants` of `{bars, cells}`; `Song.build(seq, doc)` takes a `SongDoc` document or the legacy data. Parameter locks ride on the event (`ev.locks`) and are applied to `inst.params` for that trigger only; `level` is not lockable.

The archived studio is a separate page that recreates a Guidance-style electro track with Web Audio. Its design notes, including the analysis of the reference track and the tuning decisions, are in `docs/superpowers/specs/2026-10-21-guidance-studio-design.md`.

- Load order: `core.js` → `synths.js` → `processors.js` → `sequencer.js` → `song.js` → `studio.js`. The globals are `Kit`, `Synths`, `Processors`, `Sequencer`, `Song` and `Studio`. `studio.js` is page logic only.
- `Song.build(seq, def)` (in `song.js`) defines the tracks and the 200-bar arrangement on a `Sequencer`.
- `Sequencer` runs a lookahead scheduler (25 ms tick, 120 ms lookahead) and calls `trigger(t, ev)` on each track's instrument. Instruments come from `Synths.create(ctx, type, opts)` and expose `trigger`, `set`/`get`, `panic` and `dispose`. Every voice is registered in `inst._live` so `panic()` can stop it.
- Each track runs through a channel strip from `Processors.channel`. `Processors.chain(ctx, specs)` builds the effect units. The master chain is EQ, highpass, lowpass, glue compressor, saturator, then limiter.
- Parameters use dotted paths: `Sequencer.setParam('kick.decay')`, `'stab.delay.mix'`, `'send.reverb.mix'`, `'master.hp.cutoff'`, plus `'bpm'` and `'swing'`. The studio UI is built from the same spec objects through `defineParams` in `core.js`. Each spec entry is `{min, max, value, unit}`.
- Offline export: `Sequencer.render(buildFn, opts)` returns a Promise of an `AudioBuffer` rendered by an OfflineAudioContext. `Sequencer.wav()` encodes 16-bit PCM.

### Gotchas

- The filter processor's parameter is `mode`, not `type`, because `type` clashes with the constructor's own argument.
- Use the `Kit` helpers (`setV`, `lin`, `expo`, `target`) for scheduled AudioParam changes. `expo` clamps its target to a small positive value, so it won't throw on zero. `target` (setTargetAtTime) is what avoids clicks when stepping a value.
- `selfcheck.js` has a fake AudioContext. A new Web Audio node type used by the studio needs a matching stub there, or the check fails.
