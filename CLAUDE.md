# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

The repo has no package.json, no build step and no linter. Both apps are plain browser JS that load as globals.

- Serve the folder over HTTP: `python3 -m http.server 8000`. The game is at `http://localhost:8000/`, the studio at `http://localhost:8000/studio/`. The README says the studio needs HTTP.
- Studio smoke test: `node studio/selfcheck.js`. It prints `OK: N checks passed` and exits 0 on success. It is the only automated test, and it has no flag to run one section, so to isolate a check you edit the script.
- Game data check: `Levels.validate()` runs at load and logs its warnings with console.warn. The engine never reads its result (CONTRACT.md C8).
- CONTRACT.md C8 describes a Playwright run for the game. No such script is committed, so don't assume one exists.

## Architecture

### Game (`index.html`, `js/`)

- Load order matters: `sprites.js` → `sfx.js` → `levels.js` → `render.js` → `game.js`. The globals are `Sprites`, `SFX`, `Levels`, `GameRender` and `Game`. `game.js` boots itself on DOMContentLoaded.
- Logical canvas 384×216, floor at y=196. There are no image, audio or font files: sprites are built from character grids at load and every sound is synthesised.
- `levels.js` is data only (enemy types, wave scripts, boss phases that name attack ids). Behaviour and attack defaults live in the engine.
- Specs conflict in a fixed order, stated at the top of CONTRACT.md: `team/DIRECTOR-RULINGS.md`, then the round-3 files in `team/`, then CONTRACT.md's FINAL CORRECTIONS, then its v1 sections. Read those before changing an API.
- `SFX` must stay silent and non-throwing until `SFX.init()` is called from a user gesture.

### Studio (`studio/`)

The studio is a separate page that recreates a Guidance-style electro track with Web Audio. Its design notes, including the analysis of the reference track and the tuning decisions, are in `docs/superpowers/specs/2026-10-21-guidance-studio-design.md`.

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
