# Log G1: engine and shell integration (second wave)

Pressing Crew, 27 November 2026. Times Eastern (UTC in parentheses). Files: app/engine/host.js, sequencer.js,
project.js, sampled909.js, assets.js (new), app/assets/manifest.json (new), app/shell/*, app/electron-builder.config.js,
tools/shell-files-check.js, tools/export-check.js, tools/sampled909-check.js, app/engine/selfcheck.js (additions),
the Host, Project and Shell parts of app/CONTRACT.md.

## 2026-11-27 01:06 EST (06:06 UTC) — for G2: the call a page awaits, and the script tags

**`Assets.ready(ctx, docOrSeq?) -> Promise<result>`** (global `Assets`, file `app/engine/assets.js`). Never rejects.

- Fetches `<assets>/manifest.json` once per page, where `<assets>` is `../assets/` from assets.js's own script URL
  (so `/app/engine/assets.js` reads `/app/assets/`, and a bundle `<root>/engine/assets.js` reads `<root>/assets/`).
  The manifest is `{"tr909-rom": bool, "tr909-robroy": bool}`. The tracked one says ROM false, Rob Roy true.
- If `"tr909-robroy": true` (or the manifest cannot be read at all): `Sampled909.load(ctx, {types, base: <assets>/tr909-robroy/})`,
  where `types` is `Sampled909.typesIn(docOrSeq)`, or every sampled voice when no document is given.
- If `"tr909-rom": true`: `Drums.loadRomsFrom(<assets>/tr909-rom/)`, once per page, when no document is given or the
  document has ch909, oh909, cr909 or rd909 with its `rom` row on (`Assets.romWanted(doc)`). In the Electron shell with
  the ROM entry false, the owner's copy in `<userData>/roms/tr909/` is read through `HavantechnoShell.readRoms()` instead.
  A set whose entry is false is never fetched (no 404 lines).
- Resolves to `{manifest, robroy: null | {types, loaded, missing}, rom: null | {source: 'assets'|'shell', chips, status}}`.
- Also: `Assets.manifest()`, `Assets.base()`, `Assets.setBase(url)`, `Assets.romWanted(x)`.

The HVT-909 page: after making its context (inside the start gesture), `Assets.ready(ctx).then(start)`; with a Host,
`Host.start()` already awaits it for the Host's document (and `Sequencer.render` for a render's tracks).

Script tags (G2 owns the pages). After drums.js, and before host.js; sampled909.js before assets.js:

- app/index.html, after line 46 `<script src="engine/drums.js"></script>`:
  `<script src="engine/sampled909.js"></script>` then `<script src="engine/assets.js"></script>`
- app/solo/909.html, after `<script src="../engine/drums.js"></script>`:
  `<script src="../engine/sampled909.js"></script>` then `<script src="../engine/assets.js"></script>`
- the other solo pages: `<script src="../engine/assets.js"></script>` after drums.js is harmless (nothing is fetched but
  the manifest; no sampled types in their documents) and optional.

(G2 has since added the two tags to app/index.html and app/solo/909.html, after drums.js, as written above.)

## 2026-11-27 01:30 EST (06:30 UTC) — the five tasks

### 1. Sampled909's level (app/engine/sampled909.js)

- `ampOf` is now drums.js's `ampOf9`: `ev.level909` 0/1/2 (-18/-9/0 dB times vel) for direct callers; else `ev.accent`
  0 dB; else velocity under 0.5 -18 dB; else -9 dB times min(1, vel/0.85). `ev.step` is no longer read anywhere.
- The rim shot's and clap's two-velocity choice follows the same rule: `level909 >= 2`, or without level909 `ev.accent`.
  Header comment and the usage line updated.
- tools/sampled909-check.js: every `{step: N}` input became `{level909: N}` (also the measuring page's inputs to drums.js);
  new rows: a plain hit -9 dB, vel 0.4 -18 dB, ev.step 2/37/0 leaves the level alone, rim/clap file choice; section 5b
  through a real Host and Sequencer (`scheduleAll`): bd909s with `cell.acc` on steps 5 and 9 rises by 9.00 dB, unaccented
  hits level at every absolute step; rs909s plays RIM127 only on steps 5 and 9. 98 -> 116 checks.

### 2. Awaiting the sampled voices (host.js, sequencer.js)

- host.js: `assetsFor(ctx, doc)`: `Assets.ready` when assets.js is loaded, else K1's `Sampled909.load(ctx, {types})`
  when the document uses sampled types, else null (nothing awaited). `host.start` and the context rebuild in
  `setAudioOptions` await it beside `Worklets.load`.
- sequencer.js `render`: after the worklets, `Assets.ready(octx, dry)` (or K1's line without assets.js), then the build.
- Measured (headless Chromium, 44.1 kHz): a sampled groove (bd, sd, ch, cp, rs on drum tracks, accent on step 1),
  rendered by `host.render` from bar 0: first hit peak 0.517, the same hit in bar 2 0.515: complete from its first hit.
  The same render with Assets hidden and `Sampled909.load` stubbed (the old state): first hit 0.0096, the rest silent.
- The stock song's first 4 bars (`host.render({from 0, to 4, seed 7})`), before and after this change, with sampled909.js
  and assets.js loaded: difference -103.1 dB rms (max 1.65e-4), the same as two renders before the change against each
  other (-102.8 dB rms, max 1.33e-4): no change beyond the run-to-run floor. (Task 5 then changes it; below.)

### 3. ROM voices and the asset manifest

- `app/assets/manifest.json` (tracked): `{"tr909-rom": false, "tr909-robroy": true}`. `app/engine/assets.js` (above).
  A set marked false is never fetched; checked in sampled909-check 5c (requests counted with a stub fetch: ROMs false ->
  no ROM request; both false -> only the manifest; ROM voices with `rom: 0` -> none; no document -> all eleven sampled
  voices and the three chips; no manifest -> Rob Roy still asked, ROMs never; shell readRoms used when the entry is false).
- Shell (app/shell/files.js, main.js, preload.js): `readRoms()` reads `<userData>/roms/tr909/` (only the three MAME names,
  regular files, 32768 bytes, links not followed) and returns `[{name, bytes}]`; `importRoms(paths?)` copies picked files
  there after the name and size test (no paths: main opens a file dialog), answering `{copied, refused: [{name, reason}]}`.
  Main window only. drums.js checks the hashes on `loadRom`.
- electron-builder: the file list is relative to app/ (the app directory), so the repository's local/ is outside it;
  extraResources name only ../tools/separate.py, ../LICENSE and ../THIRD_PARTY.md. Added `assets/**/*` (the packaged app
  had no assets folder at all, so no Rob Roy set and no manifest) and the exclusions `!**/local/**` and
  `!assets/tr909-rom/**`. Verified by reading the config and by shell-files-check rows; NOT verified by a packaged build
  (no electron-builder run here).
- Nothing under local/ was copied or read by me; the tracked manifest says ROMs false.

### 4. makeDirectory and bundles

- `HavantechnoShell.makeDirectory(path)` (files.js guard, main.js `shell:makeDirectory`, preload): parent inside a
  granted folder or userData, the writeFile path rules, existing folder -> true, link or file -> refused, not recursive.
- Project.saveBundle already used `makeDirectory` when present (V1), so no change was needed in project.js; openBundle
  resolves both layouts through `readFile(src, {base: folder})`.
- tools/export-check.js: a bundle saved and opened on a temporary folder through the real guard (makeDirectory, writeFile,
  copyFile): audio/ made, file copied, `src` 'audio/vox take 1.wav'; reopened from audio/; a flat bundle of the first
  kind reopened; a shell without makeDirectory gives `flat: true`. 45 -> 51. shell-files-check: makeDirectory refusals
  (never granted, not recursive, relative, "..", over a file, URL, NUL, link, linked parent pointing out), the ROM calls,
  the preload, main.js wiring, the builder file list. 172 -> 227.

### 5. The mid-song render mismatch: traced and fixed in sequencer.js

Reproduced in headless Chromium with the stock song, bass alone, render bars 16-24 against the same bars of a render from
bar 0: -23.8 dB residual at the instrument's own output (before the chain, the ducker and the master), bar 17 identical,
the other bars -20.6 / -27.7 dB, worst on steps 10 and 14. The trigger events were identical in both renders (note,
velocity, duration, parameters) except the time, which differed by about 1.3e-13 s.

Cause (two, both state that is not reproduced when a render starts later):
1. **The onset frame.** At 126 BPM and 44.1 kHz a step is exactly 5250 frames and the render starts at 0.05 s (2205
   frames), so every step time is on a sample frame in exact arithmetic. Chromium places an AudioParam event at
   ceil(t * sampleRate), measured: setValueAtTime(1, r/sr) lands on frame r+1 whenever (r/sr)*sr > r in doubles, and
   t + 1e-13 lands on r+1 always (source starts are robust to this; params are not). The scheduler accumulates
   `tNext += sd`, so the float noise of a step time depends on where the render started, and each envelope (gain,
   filter) started one frame earlier or later: -24 dB on the bass.
2. **Random draws.** One Math.random stream for the whole render (the Host's seed): a render from bar 16 drew fewer
   numbers before each hit, so noise voices (the kick's click, the hats) started at other noise offsets.

Fix (sequencer.js only): `snapT` moves a trigger time that is within 1e-6 frames of a frame to the largest double whose
t * rate is not above it (exposed as `seq.snapTime`); and each trigger runs with Math.random seeded by (track, absolute
step, n-th trigger of that track on that step, seq.seed), the shared noise buffer (K.noise) made first outside it.
Voices are not changed. selfcheck section 12 (4 checks).

Residual, section intro2 (bars 16-24) against the same bars of the render from bar 0, measured in the page:

| | before | after |
|---|---|---|
| bass alone, instrument output | -23.8 dB (bars 16-23) | -85.2 (bar 16 only: bar 15's tail; bars 17-23 identical) |
| bass alone, through the master | -21.0 | -58.2 (bar 16 -49: the master's state) |
| mix, master off, whole section | -24.2 | -72.4 |
| mix, master off, after the first bar | -23.9 (-23.2 after 4 bars) | -124.9 (-124.5) |
| mix, master on, whole section | -13.9 | -15.0 (the first bar: compressor and limiter state, tails) |
| mix, master on, after the first bar | -20.0 (-19.3 after 4) | -78.0 (-76.6) |

Per track after the fix, master off, after bar 16: kick -156, sub -154, bass -206, stab -107, hat_closed -143, delay
return -113, reverb return -112 dB. What remains is the first bar (tails of notes, sends and the master from before the
section), which a render that starts there cannot have.

**Changed behaviour:** renders and playback now place on-frame onsets on the exact frame (before: about half of them one
frame late, at random), and noise voices draw per hit. The stock song's first 4 bars against before the change:
-24.6 dB relative from the snapping alone (max sample difference 0.57, a kick onset one frame earlier), -24.3 dB with both;
run-to-run floor -83.8 dB. The sound is the same instruments with onsets up to 22.7 us earlier; nobody has listened.

Left as found (not in my files): `ev.hit` (the round-robin index, seq._hitCount) still counts from the render's start, so
a sampler with round robin plays other regions in a render from mid-song. Proposed: synths.js's sampler could take its
round-robin position from ev.step (the absolute step) as it already does for its random draw, or the Sequencer could
count the hits before `from` in `chase` with a quiet dry pass; not done.

### Not verified

- Electron: readRoms, importRoms (and its dialog), makeDirectory on a real run; a packaged build's file list.
- Live AudioContext start with the sampled kit (only renders were measured); the HVT-909 page with both sets loaded.
- Rendering at rates where a step is not a whole number of frames (the snap then does nothing; the onset can still sit
  near a frame boundary by chance).
