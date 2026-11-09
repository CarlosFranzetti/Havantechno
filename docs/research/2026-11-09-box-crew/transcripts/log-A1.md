# Log A1: batch 1, the sampler (Host, document, Project, self-check)

Times are Eastern (EST) with UTC in parentheses.

## 2026-11-09, start

Read: the coordinator's message (batch 1 for A1), `docs/plans/2026-11-09-roadmap.md`, `B1-sampler.md` (§3, §4.3, §5, §6, §7, §9.1, §12, §13), and the coordinator's rulings (log-coordinator.md, 23:45 EST entry). Other logs in this folder at start: none from A7 yet (so no `programs.js` and no program path in `synths.js` exist). My files: `app/engine/host.js`, `songdoc.js`, `project.js`, `selfcheck.js`, `app/CONTRACT.md` (Sampler section and Host section).

## The `Programs` API I code against (To A7, please confirm or correct in your log)

The Host calls `root.Programs` only when it exists and only through these functions. Without the module, the program calls that need it reject with "Programs is not loaded", and everything else works:

- `Programs.normalize(program) -> program`: defaults filled, at most 2048 regions, never throws on junk (drops what it cannot use). The Host runs it on `addProgram`, on import, and over `doc.programs` when a document is loaded. **The instrument should still tolerate missing region fields:** `SongDoc` only normalises structure (see below), so a document that was saved without `programs.js` loaded has partial regions.
- `Programs.readWavMeta(arrayBuffer) -> {rate, root, fraction, loops: [[start, end]]} | null`: called on the bytes **before** `decodeAudioData` (which detaches them). Until `programs.js` exists, the Host has a small fallback reader for `fmt `, `smpl` and `acid` (rate, unity note + fraction, loops; acid root) so the self-check can test the path. When `Programs.readWavMeta` exists the Host uses it and never the fallback.
- `Programs.detectPitch(channelData: Float32Array, sampleRate) -> {hz, midi, cents, clarity} | null` (null = unpitched). The Host stores `doc.audio[id].analysis = {pitch: hz|null, root: midi|null, cents, clarity}`; `autoMap` reads `analysis.root` as B1 §4.3 says.
- `Programs.parseSfz(text, {resolve(path) -> audioId | null, include(path) -> text | null}) -> {program, samples: [paths], warnings}`. I call it twice: once with `resolve` returning null, to get `samples` (please give the paths after `default_path` and relative to the .sfz folder, `/`-separated, as written in the file); then the Host loads each sample, and the second call resolves every path to its audio id. `include` must be synchronous: the Host prefetches the `#include` files (depth up to 8) before parsing.
- `Programs.toSfz(program, params, audio) -> text`.
- `Programs.autoMap(entries: [{id, name, analysis, meta}], {mode: 'auto'|'drums'|'pitched', keys: 'mid'|'below'}) -> program`.
- `Programs.slice(audioBuffer, {mode: 'transient'|'grid', n, threshold}) -> [regions]` (the Host sets each region's `buffer` to the source's audio id).

And from `synths.js` (A7): the sampler takes `opts.getProgram(id)` next to `opts.getBuffer(id)`; the Host passes both. The program the Host returns is the document's own object (live: an edit is heard on the next hit, with no rebuild); please do not mutate it.
