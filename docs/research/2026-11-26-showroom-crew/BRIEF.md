# Showroom Crew brief: every instrument on its own page, with a sequencer, presets and pattern save and load

Written by the coordinator, 26 November 2026 (ET).

## The owner's words

"make me a separate web artifact for each instrument as it is now ... each one should have a step sequencer like the behringer polyd or the drum machines should be like the actual machine so I can audition on the web add a save load for the sequencer and a presets engine as well in[c]or[po]rate that in the non artifact versions"

## What exists

`app/solo/303.html` with `solo.js` and `solo.css`: the HVT-303 alone on the real engine and the real panel (`app/ui/panels.js`), published for the owner as a static bundle. Panels exist for HVT-808, HVT-909, HVT-303, HVT-D and HVT-106; the 303's has a sixteen-step sequencer (note, accent, slide, tie, rest, transpose); the drum machines' have instrument select and sixteen step keys; the HVT-D and HVT-106 have keyboards that audition and no sequencer. The window header's "Preset" button is a placeholder. Engine: `app/engine/classics.js` (tb303, modeld, juno), `drums.js` (27 voices), `host.js`, `songdoc.js` (tracks hold variants of `{bars, cells}`; a cell is `{vel, acc, len, nudge, note, prob, cond, rep, locks, slide}`).

## What to build

1. **W1, presets and pattern bank.** `app/engine/presets.js` (global `Presets`), the Preset menu in device windows (`app/ui/windows.js`), `tools/presets-check.js`.
2. **W2, the synth pages.** A shared solo-page framework in `app/solo/` and pages for the HVT-D and the HVT-106, each with a step sequencer on the panel. The HVT-D's follows the kind found on current analogue monos (up to 32 steps, per step: note, rest, tie, accent, glide, and a ratchet if the cell's `rep` can carry it); the HVT-106's is polyphonic (a chord per step, entered from the panel's keyboard). The 303 page moves onto the framework unchanged in behaviour. W2 owns `app/ui/panels.js`'s shared controls and the hvt303, hvtd and hvt106 definitions.
3. **W3, the drum machine pages.** Pages for the HVT-808 and HVT-909 with the whole kit, working like the machine: instrument select and sixteen step keys (exist), plus pattern slots with A and B variations, an accent row, per-voice mute, clear, copy, tempo, and shuffle and flam on the 909. W3 edits only the hvt808 and hvt909 definitions in `app/ui/panels.js`, with Edit (never a whole-file write), and owns `app/solo/808.html`, `909.html` and `drums-solo.js`.
4. **W4, the bundler.** `tools/solo-bundle.js`: turns a solo page into a publishable bundle (rules in the task message) and tests it in Chromium.

## Frozen interface (W1 builds it; W2 and W3 build against it and feature-detect)

```js
Presets.list(type) -> [{id, name, factory, kind:'patch'}]            // type: an instrument type ('tb303', 'bd808', ...) or a machine ('hvt808', 'hvt909')
Presets.get(type, id) -> {id, name, type, params:{name: value}} | null
Presets.save(type, name, params, {id}) -> id                          // user presets; factory ones are read-only
Presets.rename(type, id, name) -> bool;  Presets.remove(type, id) -> bool
Presets.capture(host, track) -> params;  Presets.apply(host, track, id) -> bool   // through host.setParam, one undo step
Presets.exportText(type, id) -> string;  Presets.importText(text) -> {type, id}   // JSON text; rejects what it does not understand
Presets.patterns.list(type) / .get(type, id) / .save(type, name, pattern, {id}) / .rename / .remove / .exportText / .importText
//   pattern for a synth: {bars, cells}; for a machine: {voices: {'<track type>': {bars, cells}}, bpm, swing}
Presets.storage(adapter)      // {get(key) -> string|null, set(key, string), remove(key)}; default: localStorage in try/catch, falling back to memory
Presets.on('change', fn)
```

Factory presets and patterns are original work written for this project: never a transcription of a record's line or a copy of another product's preset bank.

## Rules

One owner per file as above; nobody edits the engine's instruments or `host.js` (the Pressing Crew is in `host.js` now: use its public calls). No commits; never git stash, checkout, reset or clean. Pages load engine and panel files by relative path, nothing copied, nothing from a CDN; audio starts on a tap; the page says so when it runs the approximate fallback; usable at 390 px wide; no maker's marks. Every existing check keeps passing (`node tools/*-check.js`, `node app/engine/selfcheck.js`, `node tools/browser-check.js`); run each directly and read the exit code. Verify in headless Chromium at 1280×800 and with a phone profile, look at your screenshots, and say what you did not verify. Logs in `transcripts/log-W<n>.md` with Eastern Time and UTC. Hand back in 15 lines.
