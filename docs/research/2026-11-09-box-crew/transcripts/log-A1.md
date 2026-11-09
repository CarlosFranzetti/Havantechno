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

## After the limit reset: what A7's `programs.js` actually exposes, and how the Host adapted

`app/engine/programs.js` appeared while I worked (A7; no A7 log in this folder yet). Its API differs from my proposal in four places, and I adapted the Host to it rather than ask for changes:
- `toSfz(program, {src: fn(bufferId) -> path, defaultPath})`: the Host passes `src` from `doc.audio[id].src`.
- `slice(id, samples, sampleRate, opts)`: the Host passes the buffer's channel 0.
- `detectPitch(samples, sampleRate, opts) -> {hz, clarity, midi, root, cents}`, hz 0 when unpitched. The Host stores `analysis = {pitch: hz|null, hz, root, midi, cents, clarity}`, because `autoMap` reads `analysis.hz` and `analysis.root`.
- `readWavMeta(buf)` always returns an object (rate 0 for a non-WAV). The Host keeps `meta` only when there is a rate, a root or a loop, and drops empty fields. My fallback reader is used only when `programs.js` is missing.
- `parseSfz` puts the unresolved path in `region.buffer` and lists `samples` after `default_path`, which fits the Host's two-pass import (first pass for the paths, load the samples, second pass resolves every path to an audio id; an unreadable sample gets a missing `doc.audio` entry so the region relinks later).

**To A7:** (1) the program path in `synths.js` has the spec but its `trigger` does not read `opts.getProgram` yet. Self-check 8d detects that from the source and passes as "silent, nothing throws"; once `getProgram` is read, the same check requires region bd for key 36 and region sd for a `key` lock 38 on the fake context. (2) Your spec has `veltrack` −1..1; B1 had 0..1. I wrote −1..1 into CONTRACT.md as built. (3) `normalize` sets `kind` to 'pitched' for anything other than 'drums', and sets `source` to `{format: 'native'}`. Both are fine.
**To A6:** `index.html` needs `engine/programs.js` after `engine/synths.js` (B1 §10.1). `importProgram` reads `#include` files from the folder map or URLs; in Electron it calls `HavantechnoShell.readText(path)` if you add it (`readFile` only reads audio extensions). It also reads samples through `readFile` for absolute paths (unchanged).
**To A3:** the face's program select is `host.programs()`, a region's buffer is `host.buffer(region.buffer)`, region edits go through `host.editor().setRegion(...)` then `host.commit()` (in place), and the `'program'` event says when to redraw.
**To A4:** a folder drop is `host.addSampler({relativePath: File, ...}, {name})` (auto-map), or `host.importProgram(sfzFile, {files, path: '<the .sfz relative path>'})` when the folder holds an .sfz.

## Decisions

1. `SongDoc` normalises programs only structurally: an object, a `regions` array of at most 2048 objects with a string `buffer`, `name` and `global` filled. Everything else is kept as plain JSON so nothing is lost. The defaults come from `Programs.normalize` in the Host (`addProgram`, import, and every `loadDocument`), so the engine gets full regions whenever `programs.js` is loaded.
2. `usedBy(id)` adds `'program:<id>'` for every program with a region on that file. `unloadAudio` keeps the `doc.audio` reference while a program uses it, and `refreshSamplers` re-sets `program` on samplers whose program uses a newly loaded file.
3. `'program'` events: `added`/`removed` from the Host calls, plus a JSON comparison of `doc.programs` at every commit (`changed`, and the editor's or undo's adds and removes). Program edits never rebuild: `doc.programs` is outside the structural key.
4. `assignProgram` and `addSampler({program})` copy `program.global` into the track params, only for keys in the sampler spec, as one undo step.
5. Not done: `ev.hit` for render-exact round robin (B1 §5.8) needs a line in `sequencer.js`, which is not in my file list this batch. It is ready to add if the coordinator rules so.

## Incident: a `git stash` that took other builders' uncommitted work (fixed; please check)

To check whether two failing tool checks were already failing at HEAD, I ran `git stash` and then `git stash pop`. The stash took every uncommitted change in the tree, not just mine: `app/analysis/decide.js`, `dsp.js`, `features.js`, `app/engine/programs.js`, `tools/analysis-check.js`, plus my `host.js` and `selfcheck.js`. While the stash was out (a few seconds), the analysis builder wrote `tools/analysis-check.js` again, so the pop was refused. What I did:
- Restored each stashed file that was still at HEAD from the stash (`decide.js`, `dsp.js`, `features.js`, `programs.js`, `host.js`, `selfcheck.js`), checking each one with `git diff --quiet` first.
- Merged `tools/analysis-check.js` three ways (HEAD as base, the stashed version, and the builder's new version). The one conflict was the dry-tone and mix line. I kept the stashed `sawHit` tone together with the builder's new mix values (0.3/0.3/0.4) and unit-energy IR. **The analysis-check owner should confirm that line.** The check then printed `FAILED: 1 of 36` (the pre-delay check, which also failed at HEAD).
- The stash entry `stash@{0}` is left in place as a backup; drop it once the owners confirm.

`app/engine/synths.js` was not in the stash (A7's later edits are untouched). Lesson recorded: never stash in a shared working tree; compare against HEAD in a scratch checkout (`git show HEAD:<file>`).

## Verification (batch 1)

- `node --check` on `host.js`, `songdoc.js`, `project.js`, `selfcheck.js`: exit 0 each.
- `node app/engine/selfcheck.js`: exit 0, `OK: 375 checks passed` (340 before batch 1; new section 8, run with A7's `programs.js` loaded):
  - SongDoc: no `programs` key for a song without one; `addProgram` (junk regions dropped, a taken or empty id refused); save/load with `extra` opcodes; `meta`/`analysis` kept, non-objects dropped; stable through `Project.serialize`/`parse` and `toLegacy`/`fromLegacy`; the 2048-region cap; `setRegion`, `addRegions`, `removeRegion`, `setProgram` (one undo step each; refused ones take none; undo); `removeProgram` refused while a track plays the program.
  - Host without audio: `addSampler({program})` copies `global`; every sampler gets `getProgram` next to `getBuffer`; `usedBy` names the program; `programs()` counts and missing; `unloadAudio` keeps a program's sample; add/remove with events; a region edit commits in place with `'program'` changed; undo; `assignProgram` (refused for a non-sampler or an unknown program).
  - Fake context: WAV header meta (fmt and smpl: rate 22050, root 62, fraction 0.5, loop 100..300; the acid root without smpl; a truncated header keeps its rate; non-WAV bytes give no meta); files relink to a program's missing entries; meta survives save/load.
  - The two-region program track: `getProgram` resolves both regions; the play check is silent until A7's `trigger` reads `getProgram` (see To A7).
  - `Project.open({shell, host})` reloads one region sample and `Project.missing` lists the other with `program:kit`.
  - With `programs.js`: `importProgram` from a folder map (one sample loaded, one missing), `exportProgram` (SFZ text and the file list), `mapFiles`. I confirmed these checks run by forcing two of them to fail in a scratch copy.
- Other checks now: `tools/browser-check.js`, `processors-check.js`, `step-view-check.js`, `synths-check.js`, `system-editor-check.js` and `widgets-check.js` exit 0. `tools/faces-check.js` exits 1: a lint problem, `decorrelate: no face definition`, A3's, the same at HEAD. `tools/analysis-check.js` exits 1: the pre-delay check, the analysis builder's, the same at HEAD.
- Not verified: the program path's sound (A7's trigger is not finished), importing a real .sfz library, Electron reading of `#include` files, and a Chromium run of the program calls.

## Follow-ups (coordinator's three items after the batch-1 hand-backs)

1. **`host.detectPitch(bufferId) -> Promise<{hz, midi, cents, confidence}>`** runs `Programs.detectPitch` on channel 0 of the loaded buffer one tick later (so the button can repaint first). It writes `doc.audio[id].analysis` in the same shape as on load and emits `'audio'` `{id, status: 'analysed'}`. `confidence` is YIN's clarity. It rejects when the file is not loaded or `programs.js` is missing. **To A3:** the "Re-detect pitch" button can wait on this promise.
2. **`Project.pickFiles({shell, directory, multiple, accept})`.**
   - Web: `<input type=file multiple webkitdirectory>` (the `webkitdirectory` property and attribute are both set), resolving `[File]` with `webkitRelativePath`, or null on cancel.
   - Electron: `HavantechnoShell.openFiles({directory, multiple, filters, binary: true})`. Without it, `openFile` with the same options (an array result is used as is; a single result is wrapped).
   - **To A6:** the shell's `openFile` today opens a single file only (`properties: ['openFile']`). Please add `openFiles({directory, multiple, filters, binary}) -> [{name, path, relativePath, bytes}] | null`: `openDirectory` or `multiSelections`, a recursive walk for a folder, `relativePath` from the chosen folder, the same audio and sfz extension and size rules as `readFile`. Until then, in Electron "Sampler track from folder…" gets one file.
   - `Project.importProgram({host, shell, files, directory})` picks an .sfz (in Electron through `openFile` with an SFZ filter; on the web a folder) and calls `host.importProgram`. In a folder it takes the least deep .sfz as the root, because included files usually sit in subfolders. **To A4:** both menu items can call these two.
3. **`#include` and `default_path`.**
   - In Electron, includes go through `HavantechnoShell.readText(path, {})` with absolute paths joined from the root .sfz folder. On the web they go through the dropped list (`files` may now be an array of Files with `webkitRelativePath`; the Host keys it by relative path, case-insensitive on a miss).
   - Include paths resolve against the **root** .sfz folder, also inside nested includes. That is my reading of SFZ practice and is unverified; say if sfizz differs.
   - `default_path` is applied by `Programs.parseSfz` to every sample, the included regions too.
   - Unresolved includes come back as `unresolvedIncludes`, and each one is also a warning (`{opcode: '#include', why: 'include not found: …'}`, added unless `parseSfz` already reported it).
4. Also fixed in my selfcheck: section 5's "every instrument type has a device" now checks the song's instruments. A7's new drum-machine types are not in the Guidance song, so the old wording failed although nothing was wrong.

Verification:
- `node --check` on `host.js`, `project.js`, `selfcheck.js`: exit 0 each.
- `node app/engine/selfcheck.js`: exit 0, `OK: 392 checks passed`. The new section 9 covers:
  - detectPitch: 220 Hz found on a sine, analysis written, the event fires, a rejection for an id that is not loaded.
  - pickFiles: Electron `openFiles` options, the `openFile` fallback, cancel, and the web input on a fake DOM.
  - Electron includes, nested, through `readText` (three regions); an unreadable include becomes a warning.
  - Web: a dropped list with a root .sfz, an included file in a subfolder, `default_path`, a missing include and a missing sample; a selection without an .sfz is refused.
- `tools/synths-check.js`, `faces-check.js`, `step-view-check.js` and `system-editor-check.js` exit 0.
- Not verified: the real Electron dialogs (`openFiles` doesn't exist yet) and a real browser folder pick.
- No git stash, checkout, reset or clean was used this time.
