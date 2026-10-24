# Build Crew discussion (waves 1 and 2 transcript)

Compiled 2026-10-23 23:39 UTC by the scribe from the twelve files in `transcripts/`; the wave 2 part, the updated verification record, "Left open after wave 2" and the reconciled inconsistency list were added 2026-10-24 00:32 UTC after the coordinator closed wave 2. The sources are `log-A1.md` to `log-A11.md` and `log-coordinator.md` (all final). The agents did not talk to each other directly. They wrote questions and answers in their own logs (`**To A3:**`, `**From A3 to A2:**`), read each other's logs, and the coordinator relayed some requests and ruled on some. Nothing here is a new exchange: each statement is attributed to the agent and the log section it came from, and where a log's own wording matters it is quoted. Where the logs do not say, this file says "not in any log". Read `BRIEF.md` and `app/CONTRACT.md` for the task and the interfaces; `REPORT.md` is the coordinator's and is not written yet.

How to read the citations: `log-A5.md, "Questions and requests"` means that file and that heading. Quoted text is copied from the log. Paraphrase is marked by the absence of quote marks. A line headed "Scribe's note" is the scribe's own observation from comparing two logs; it is not something an agent said.

Timing: only `log-coordinator.md` (every entry) and `log-A10.md` (a few) carry clock times. The other logs have none, so threads are ordered by when they start according to the logs' internal order and the coordinator's timestamps, and that order is approximate. The coordinator's entries run from 23:14:41 UTC on 2026-10-23 to 00:25:46 UTC on 2026-10-24; wave 2 adds the clock times of `log-A10.md` (00:08 to 00:12).

## The crew

Ten agents built the app in wave 1; the coordinator is the Fable session. The model column is from `BRIEF.md`. The files column is from `BRIEF.md` and the ownership table in `app/CONTRACT.md`, which agree except where noted.

| Id | Model | Role | Files |
|----|-------|------|-------|
| A1 | Opus | Engine lead: Host, Project, self-check | `app/engine/host.js`, `app/engine/project.js`, `app/engine/selfcheck.js` (additions only) |
| A2 | Sonnet | Widgets and theme | `app/ui/widgets.js`, `app/ui/theme.css` |
| A3 | Sonnet | Faces registry and the face definitions | `app/ui/faces.js`, `app/ui/facedefs.js` |
| A4 | Sonnet | System Editor view | `app/ui/system-editor.js` |
| A5 | Sonnet | Step View | `app/ui/step-view.js` |
| A6 | Sonnet | Windows, app frame, web server, Electron shell | `app/ui/windows.js`, `app/ui/app.js`, `app/index.html`, `app/shell/main.js`, `app/shell/preload.js`, `app/package.json`, `tools/serve.js` (BRIEF says `app/shell/*`) |
| A7 | Haiku | Audio fixes: instruments and `GUIDANCE_V2` | `app/engine/synths.js`, `app/engine/song.js` (add `GUIDANCE_V2`; never change `GUIDANCE`) |
| A8 | Haiku | Audio fixes: processors | `app/engine/processors.js` |
| A9 | Haiku | Scoring loop | `tools/render.js`, `tools/score.py`, `tools/README.md` |
| A10 | Haiku | Browser check and docs | `tools/browser-check.js`, `app/README.md` (rewrite), plan status lines only |
| A11 | Opus | Integration review (wave 2) | reads everything; BRIEF says it writes `review-A11.md`, but the coordinator's wave-2 entry and the file on disk say `log-A11.md` |
| Coordinator | Fable | Brief, contract, commits, runs the checks | `app/CONTRACT.md`, `log-coordinator.md` |

Files not in the ownership table but written in wave 1, as the contract invited ("a tiny `tools/<module>-check.js` is welcome"): `tools/widgets-check.js` (A2), `tools/faces-check.js` (A3), `tools/system-editor-check.js` (A4), `tools/step-view-check.js` (A5), `tools/synths-check.js` (A7), `tools/processors-check.js` (A8).

## The two waves (from BRIEF.md)

1. **Build.** Everyone codes their files against the contract and logs as they go. The coordinator commits and runs the self-check and the browser check.
2. **Integrate.** A11 reviews all modules against the contract and each other and lists mismatches by owner. Each owner reads the review and the other logs, fixes their own files and logs what changed. The coordinator commits, runs the checks, compiles `DISCUSSION.md` from all logs and writes `REPORT.md`.

This file covers both waves. Wave 1 ran to the coordinator's entry at 23:35:49 ("Wave 1 is complete: A1 to A10 handed back, every check green"). Wave 2 opened at 23:31:28 with A11's dispatch; the coordinator's entry at 2026-10-24 00:25:46 says: "Every wave-2 item is in and verified; REPORT.md section 7 written". Wave 1 has 22 threads (1 to 22), wave 2 has 17 (23 to 39). In wave 2 the owners fixed their own files after A11's review, the coordinator ruled on A11's questions and on the wave-1 scribe's list, and a sampler was added.

## Wave 1 threads

22 threads. Each gives who raised it, what each side said, and how it was settled.

---

### Thread 1. Contract facts the logs corrected

Not one exchange but five places where an agent found the brief or the contract wrong against the code or the sandbox, and told the coordinator or the next reader.

- **Face count.** `app/CONTRACT.md` and the coordinator's brief said 23 face definitions ("13 instruments, 9 processor types, channel"). A3, `log-A3.md`, "Decisions" 1: "**24 definitions, not 23.** 13 instruments + 10 processor types (filter, saturator, delay, reverb, eq3, compressor, limiter, sidechain, widener, chorus) + channel = 24. The "23" in the brief counts 9 processor types." Coordinator, 23:21:41: "A3 reports 24 face definitions, not the brief's 23 (13 instruments + 10 processor types + channel). The brief's count was mine and wrong; 24 is right." Settled: 24.
- **F-S4 section reference.** The contract points A2 to the hex values in "section 6" of `round1-FS4-visual-system.md`. A2, `log-A2.md`, "Read at start": "F-S4 (tokens are in section F.3 and F.10, not "section 6")". A3 reads the same file for its "glyph and hero table" (`log-A3.md`, "Read at start"). No log says the contract's section number was corrected.
- **Hat high-pass default.** The contract says `metalHp` defaults to "today's 3.5 kHz". A7, `log-A7.md`, decision 7: "It is not a fixed 3.5 kHz: at the default tone 7200 that is 3600 Hz, and the 3.5 kHz in CONTRACT is the song's open hat (tone 7000)." The default stays `0`, meaning the old `tone * 0.5`. No reply in any log.
- **ffmpeg path.** The contract names `/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux`. A9, `log-A9.md`, "Start": that binary "cannot read WAV or MP3 (no demuxers, no `pcm_f32le` encoder, no `ebur128`). `/usr/bin/ffmpeg` 6.1.1 decodes both." `score.py` tries candidates in order and prints which it used.
- **Self-check count.** The contract says "193 checks or more". See the verification table: A1 raised it to 263 (70 new checks in section 5) and the coordinator accepted that count.

---

### Thread 2. What the Host does beyond the contract

**Raised by:** A1 (`log-A1.md`, "Decisions" 1 to 6 and "Answers"), read by A3, A4, A5, A6, and accepted by the coordinator.

**A1 said.** The Host builds a dry engine before audio, so `devices()`, `getParam` and the editor work before the Start gate (decision 1). `commit()` patches the running sequencer in place for step edits, forks, `setPlay`, section `set`/`ramp`/`fx` and progression edits, and rebuilds for anything else; every rebuild emits `'document'` with `{reason, rebuilt}` (decision 2). Knob values are written into the document (decision 3). A1 added `host.mute`/`host.solo`, `host.dispose()`, `host.started()`, `host.context()` (decision 6), `transport.loopSection`, `meter('master')` and per-send levels in the channel spec (decisions 5 and 6). To all UI owners: "device `ref`s are replaced on `start()`, `loadDocument()` and a rebuilding `commit()`; refetch `host.devices()` / `host.device(id)` on `'document'` with `rebuilt: true`."

**How the others took it.**
- A4 (`log-A4.md`, "Start" and decision 9) read A1's log, calls `host.mute`/`host.solo` for M and S (falling back to `setParam('<track>.mute')` if missing), and relies on `rebuilt` to refresh in place: "**To A1:** this relies on `'document'` carrying `rebuilt` as your log says; without it I do a full rebuild every time." A1 confirmed it in "Answers" to A4, point 1: a step edit through `setStepInSection` + `commit()` gives `rebuilt: false`.
- A4 asked for loop state: decision 4, "**To A1:** if you add `host.transport.loopSection()` or a `'loop'` event I will read it instead." A1 answered (to A4, point 2): `host.transport.loopSection` exists as a property (the section name or null) and `host.transport.pos().loop`; "There is no `'loop'` event; poll the property in `update()`." A4's own log still describes the local-state version; whether its code reads `loopSection` is not in any log.
- A5 (`log-A5.md`, "Start") adopted `host.mute`/`host.solo`, `host.tracks()` for initial M/S state, and `transport.pos()` `{step, bar, section, sectionName, barInSection}` for the playhead.
- A3 (`log-A3.md`, "Answers", to A1): "`host.isHeld` is used. A face holds a `device.ref` only for `_bypassed` and the sidechain node; the views re-render faces on `'document'` with `rebuilt: true`, so no refetch is needed inside Faces. Nothing requested." A6 (decision 8) rebuilds a window's face when the device's `ref` changes, checked on `'document'` and every 45 frames.
- Meters: A1 says the first `meter(id)` call attaches the analyser and reads 0, so callers poll it every frame; for the sidechain it returns `reduction` as the gain dip in dB. A3 (`log-A3.md`, decision 6 and "Unfinished") reads the sidechain live bar from `device.ref.node.gain.value` instead, and says live meters were exercised only with stubbed data and with zeros in a browser. A8 (`log-A8.md`, "Other logs") checked that A1's read of `p.node` on the sidechain as its gain still holds: "`p.node` is still the gain."

**Settled.** Coordinator, 23:21:41: "A1's additions beyond the contract (`host.mute`/`solo`, `transport.loopSection`, `meter('master')`, send levels on the channel device, `setParam` writing into the document) are accepted; A1 to add them to CONTRACT.md in wave 2 so A4/A5/A6 build against the written interface." Status: accepted; CONTRACT.md update is a wave-2 item for A1 (not done in wave 1).

**Later (wave 2):** the coordinator's request was met: A1 wrote the wave-1 extras into the Host section of `CONTRACT.md` (coordinator, 23:54:52). The Host's `'document'` and `ref` rules were not changed by any wave-2 log.

---

### Thread 3. SongDoc editor operations A5 asked A1 for

**Raised by:** A5, `log-A5.md`, "Questions and requests": "**To A1 (songdoc owner):** (a) an `ed.group(fn)` or `ed.edit(fn)` that takes one undo snapshot for several operations would remove my access to `ed._undo`; (b) `ed.setFx(section, index|null, patch)` so the riser and impact rows can be edited; (c) `ed.setVariantBars(track, variant, bars)` so a new variant can be longer than one bar (the lead's 4-bar loop is the case)."

**Why A5 needed them.** A5, decision 4b: `setStepInSection` on a shared variant takes three snapshots (fork, setPlay, setStep), so "`group()` in my write path truncates `ed._undo` to the first of them, so one gesture is one undo step (it reads the editor's `_undo` array, guarded: if it is missing nothing is collapsed)." Decision 8: the riser and impact rows are read-only because "songdoc's editor has no fx write".

**Relayed.** Coordinator, 23:16:29: "**To A1:** A5 asks for ed.group(fn) to collapse undo steps, ed.setFx, and a way to set a variant's bar count."

**A1's answer.** `log-A1.md`, decision 8: "`songdoc.js` is unowned this wave, so the three operations A5 asked for live on the editor the Host hands out (`host.editor()`), added in `host.js` by `extendEditor`, each with one undo snapshot like the built-in operations." `ed.group(fn)` runs several operations as one undo step and returns `fn`'s result; `ed.setFx(section, index|null, patch|null)` adds (null index), removes (null patch) or merges a hit; `ed.setVariantBars(track, variant, bars, fill)` takes 1..64 bars, `fill` `'repeat'` (default) or `'empty'`, shrinking truncates. A1 to A5: "Use `ed.group` instead of touching `ed._undo`." A1 adds that the operations "should move into `songdoc.js` when someone owns it; the Host keeps the same names." The self-check covers `group`, `setFx` (+1 impact hit) and `setVariantBars` (`log-A1.md`, "Shipped").

**Status.** The operations exist and A1's self-check passes them. `log-A5.md` was not updated after A1's answer: its "Shipped" and "Not done" still describe the `ed._undo` workaround and read-only riser and impact rows. Whether `step-view.js` now calls `ed.group`, `ed.setFx` or `ed.setVariantBars`: not in any log. A5's log lists A1 among the logs it read before finishing, and its "Verification run" cites a self-check count of 193, which is the count before A1's additions.

**Later (wave 2):** A11 found step-view.js used none of the three operations (V1). A5's wave-2 log then states that all three are used: `ed.group` in the write path, `ed.setFx` for editable riser and impact cells, `ed.setVariantBars` in a "Pattern length" select (Thread 31).

---

### Thread 4. Styling: injected CSS or `theme.css`

**Raised by:** A4, `log-A4.md`, decision 10: `theme.css` "has no classes for these bands, so the file injects one `<style id="se-style">` (classes `se-*`) that only uses A2's custom properties ... **To A2:** if you want these styles in `theme.css`, take the `CSS` array at the top of `system-editor.js` and tell me; I will then delete the injection."

**A2's answer** (`log-A2.md`, "Answers and requests"): "**From A2 to A4:** thanks, your use of `Widgets.steps` with SongDoc cells is supported as is. I have not moved your `se-*` styles into `theme.css`: leave your injection in place for this wave; a `.row` base now exists in `theme.css` if you want to build on it, but nothing requires it."

**Others.** A5, decision 1, takes the same approach (`sv-*` classes in an injected `<style id="sv-style">`) and says it did not use `.row`/`.chip` from `theme.css` ("they are shaped for the System Editor row"; "no conflict") (`log-A5.md`, "Start"). A6 injects `ap-*` and `wn-*` classes and avoids `hv-*` "to avoid collisions" (`log-A6.md`, decision 1). A3 injects none (decision 7), following A2's `.face` markup.

**Settled.** Each view keeps its own injected CSS for wave 1. Moving it into `theme.css` is not scheduled in any log.

---

### Thread 5. A2's four asks of A3 (the widget protocol)

**Raised by:** A2, `log-A2.md`, "Answers and requests", "**To A3:**" (1) call `knob.setState('set'|'ramp'|'held'|null)` every `update()` from host data, "the widget never decides it"; (2) pass `home` as a function returning the section's arranged value, `factory: spec.value`; (3) "`onHold` fires once per gesture and may fire many times across gestures, so `host.hold(path)` must be idempotent"; (4) `curve.draw` receives resolved colours as a fourth argument; hero graphs for bypass should draw dashed because "the CSS cannot do that for canvas".

**A3's answer.** `log-A3.md`, "Answers": "**From A3 to A2:** all four asks adopted (setState every update, `home` function, idempotent hold, colours from the 4th draw argument; bypass dashed). Thank you for `setRamp`/`setStock`, used." A3's decision 5 adds: faces call `host.hold(path)` on the first change, and "toggles and selects hold on each change"; release is only by the host's "re-enable arranged".

**Settled.** Adopted by both sides and covered by A3's `faces-check` (982 checks, markers follow the host: set in `intro`, ramp in `intro2`, held beats ramp, cleared by `releaseAll`). Real-browser check by both: widgets and faces rendered without errors in throwaway pages; A3 says the window-density screenshot "was produced but not inspected".

---

### Thread 6. The face head hook and `Windows.open(deviceId, host)` (A4, A3, A6)

**Contract.** `Windows.open(deviceId, host) -> win`; "Clicking a device title opens its window via `Windows.open`" (CONTRACT, Windows and System Editor).

**A4 to A3** (`log-A4.md`, "Questions / notes to others"): "I rely on `Faces.render(device, density, host)` returning `{el, update, dispose}`, on the `chip` density showing glyph + name, and on `face`/`strip` drawing their own head with a `.hv-head` or `.hv-title` element. If the head class changes, tell me."

**A3's answer.** `log-A3.md`, decision 7: "Head and title also carry `hv-head` / `hv-title` (A4 hooks a double-click on them)." "Answers": "**From A3 to A4:** chip density is glyph + name with `.hv-head`/`.hv-title` on the face and strip heads, as you rely on. Chip has no border (wrap it)."

**A4's hook.** Decision 8: "a double-click on `.hv-head`/`.hv-title` inside a device box calls `Windows.open(device.id, host)`. If `Faces.render` fails, a small title bar of mine stands in." **To A6:** `SystemEditor.mount(el, host)` wants a definite-height area below the control bar, and "calls `Windows.open` and `Windows.onSelect` only if they exist."

**A6's answer.** `log-A6.md`, "Answers to messages": "**From A6 to A4:** a double-click on a face head (`.hv-head`) opens the window with the real `Windows.open` (verified in Chromium; the window for `track:kick` appeared). `Windows.onSelect('track:<name>')` is the right call for a track selection."

**The coordinator's flag.** At 23:14:41 the coordinator committed A4's file citing 43 checks and then wrote: "**Correction:** by the time I ran the check, A6's real windows.js existed and the check fails at "Windows.open called on head double-click" (exit 1). This is an interface mismatch between A4's double-click hook and A6's Windows.open, for wave 2: **To A4 and A6:** agree on how a device title double-click reaches Windows.open(deviceId, host) and make tools/system-editor-check.js pass against the real windows.js."

**What the logs then show.** A4 found no interface mismatch (Thread 7): "The editor calls the Windows API as written in CONTRACT.md (`Windows.open(deviceId, host)`, `Windows.onSelect('track:<name>')`); nothing for A6 to change." The coordinator's 23:23:56 entry agrees: "No editor code changed, nothing for A6." The two logs therefore disagree about the 23:14:41 diagnosis; A4's account, which the coordinator accepted at 23:23:56, is that the failure was in the check's fake DOM.

**Settled.** The signature is as in the contract on both sides; the hook is `.hv-head`. The same selector later decided Thread 12.

---

### Thread 7. A4's check red against the real modules

**State at hand-back.** A4, `log-A4.md`, "Verification run": `using: host=fake, widgets=real, faces=fake, windows=fake` and `OK: 43 checks passed`. "Not run against the real `Host` (`host.js` did not exist) or the real `Faces` (`facedefs.js` did not exist)."

**First red.** Coordinator, 23:14:41 (above): fails at "Windows.open called on head double-click".

**Second red, with a diagnosis.** Coordinator, 23:21:41, table: `node tools/system-editor-check.js` FAIL "step edit forked kick A for the intro and set step 2 (variant A)", exit 1. The coordinator reports A1's diagnosis and accepts it: "the check clicks the ruler first, that click really moves the transport into mainA, so the following step edit forks mainA's kick variant instead of the intro's. The Host behaves as the contract says; the check's expectation is wrong". A1 had written the same in `log-A1.md`, "Answers", to A4, point 3: "I probed it, and the earlier ruler click really jumped the real transport to mainA (pos `{bar: 40, sectionName: 'mainA'}`), so the edit forked kick A for **mainA** (sections[3].play.kick = 'B'), not the intro. The Host is right; the check should read the section from `host.transport.pos()` (or stop / rewind before the toggle)."

**A4's fix.** `log-A4.md`, "Wave 1 follow-up": "No editor code changed; both were check problems." The fork assertion now reads the section from `host.transport.pos()`. On the Windows assertion: "it was guarded by `!used.faces`, so with real faces it never ran" and was "silently skipped, then exposed". "Two gaps in the fake DOM were the real cause of the failures: no `createElementNS` (the real Faces/Widgets then threw, and the editor correctly fell back to its own title bar, which has no `.hv-head`) and no `#windows`/`body` for the real `Windows.open`." A4 added both to the fake document and a spy on `Windows.open`/`Windows.onSelect`.

**Result.** Coordinator, 23:23:56: `node tools/system-editor-check.js` prints `using: host=real Host.create(), widgets=real, faces=real, windows=real` then `OK: 40 checks passed`, exit 0. "Earlier commit message that cited 43 checks for this file stays corrected: the count is now 40 and green."

**Count correction.** 43 (A4's first run, fake host and fake windows; in the commit message of 584a534) became 40 (real modules). A4's log does not say why 43 became 40.

---

### Thread 8. Section selection and who owns the ruler (A5, A6, coordinator)

**Contract wording.** The Step View contract says "app.js provides the control bar and ruler; both views mount below them", while the System Editor contract has the ruler inside the System Editor.

**A5's request.** `log-A5.md`, "Questions and requests": "**To A6:** `StepView.mount(el, host)` wants `el` to be a flex or fixed-height area below the control bar (the view scrolls inside). ... If the ruler selects a section, call `view.selectSection(name)`; the view does not read any shared selection by itself. Tab handling stays in `app.js`." A5, decision 3, on its own default: "follow" is off by default, "editing a looping bar would otherwise jump"; clicking a section letter, `<`, `>` or the bar select turns follow off.

A5's wording ("If the ruler selects a section") assumes the frame has a ruler.

**Relayed.** Coordinator, 23:16:29: "**To A6:** call view.selectSection(name) on section change."

**A6's answer.** `log-A6.md`, decision 6: "**The ruler is not in the frame.** A4 and A5 draw their own section ruler inside their views, so `app.js` has none. Section sharing: on mount of a view, and on each host `'section'` event, `app.js` calls `view.selectSection(name)` when the view has it (A5's request relayed by the coordinator). Consequence: the Step View follows the playhead while playing. If that is unwanted while editing, change the `'section'` handler in `bootMain`." Also "**From A6 to A5:** `view.selectSection(name)` is called on mount and on every host `'section'` event. The frame has no shared ruler." Decision 7: a view switch carries the selected track and "the section under the playhead".

**Scribe's note.** A5's log describes a column header with section numbers and a right-hand variant column, and does not mention drawing a section ruler; A6 says both views draw one. And A5's default of follow-off (so a looping bar does not jump while editing) sits against A6's wiring, which moves the viewed section on every `'section'` event while playing. Neither log says which wins when both apply, and no log records a test of editing a bar while the transport plays. A6 left the call to the owner of the behaviour ("change the `'section'` handler").

**Status.** Wired as A6 describes; the follow-while-playing consequence is open for wave 2.

**Later (wave 2):** the follow default was ruled on and flipped, and A11 found the drag problem it created (Thread 31).

---

### Thread 9. Project save/open, the shell API and autosave events (A1, A6)

**A1's side.** `log-A1.md`, decision 9: Electron `saveFile({name, text, filters})` and `openFile({filters})` "both resolving null on cancel, as A6's `preload.js` and `main.js` now define them". Autosave writes `localStorage` synchronously (so `restore()` stays synchronous as the contract says) and mirrors to `shell.writeAppData(...)`; `Project.restoreAsync()` reads `shell.readAppData` first. "**To A6:** your shell API matches what `project.js` calls (`saveFile({name, text, filters})` → `{name, path}|null`, `openFile({filters})` → `{name, path, text}|null`, `appDataPath`, `readAppData`, `writeAppData`)."

**A6's side.** Decision 10 lists the same IPC; "**From A6 to A1:** ... Shell API matches `project.js`." Decision 2: after Start the autosave is read (`Project.restoreAsync`, else `restore`) and loaded with `host.loadDocument`; "`'document'` events with `reason: 'start'` never schedule an autosave (otherwise the default song could overwrite the saved one)". Decision 3: autosave is debounced 1.5 s on `'document'` and on `'param'` with `source: 'ui'`, "knob moves are stored in the document by Host but do not emit `'document'`". That uses A1's decisions 3 and 4 (knob values written into the document; `'param'` events with `source`).

**Verified, by whom.** A1: Save and autosave PASS in A10's check (`Guidance-style.havantechno.json`, 11287 bytes; key `havantechno.autosave`); not verified: Electron save/open/app-data, the web `<input type=file>` open path in a real browser. A6: Ctrl+S download, autosave then reload restoring bpm 120, and under Xvfb a `writeAppData`/`readAppData` round trip; not tested: "the native open/save dialogs".

**Settled.** Interfaces agree on both sides. Open: native dialogs and the web Open path have no recorded run (see "Left open").

**Later (wave 2):** audio files added `Project.open({shell, host})`, `pathForFile`, `readFile` and `pickAudio` to this interface (Thread 33).

---

### Thread 10. The `project.js` load-order gap

**Found by:** A6. `log-A6.md`, decision 1: "`index.html` loads the contract order, with `engine/project.js` right after `engine/host.js` (the contract list omits it)." Under "Known problems and not done": "`app/index.html` loads `engine/project.js`, which the contract's load order does not list; the coordinator may want to add it to CONTRACT.md."

**Background.** The contract's "Interfaces to build" section defines `window.Project` (A1) and the ownership table gives A1 `project.js`, but its load-order block ended `engine/host.js` without it.

**Coordinator, 23:30:06:** "A6 also found `engine/project.js` missing from the contract's load order though index.html loads it; fixed in CONTRACT.md (coordinator's file)."

**Settled.** `app/CONTRACT.md` line 17 now reads `engine/host.js  engine/project.js`. Neither A1 nor A10 mentions the gap in its log; A10's global table includes `Project` and it passed in A10's run at 23:15 (`log-A10.md`, "Verification run").

---

### Thread 11. The host handle and Play button A10's check needed from A6

**A10's requests**, `log-A10.md`, "Requests to other owners": "**To A6:** `ui/app.js` should (a) call `host.start()` on the `#start-audio` click, (b) expose the host as `window.HavantechnoApp = { host: host }` (or `window.HavantechnoHost = host`), since the check and the README rely on one of them, (c) put a Play button in `#frame` with `aria-label="Play"` and the text "Play" (the check tries both), (d) mark the view that is mounted (for example `data-view="step"` on the Step View root, or keep `.step-grid` from A5), (e) mount Windows panels as children of `#windows` (the check counts its children)."

**Reinforced by A1.** `log-A1.md`, "Answers": "**To A6:** ... For the A10 check, `app.js` still needs to expose the host (`window.HavantechnoApp = {host}`); the browser check reports it missing."

**Relayed.** Coordinator, 23:16:01: "**To A6:** expose window.HavantechnoApp = {host} and a Play button inside #frame; the check looks for #start-audio. The browser check is the wave-1 gate once A3 and A6 land." The same entry reports A10's last run before the files landed: A10's log says `RESULT: FAIL (10 failed check(s), 0 page error(s), 2 console error(s))`; the coordinator's wording is "FAIL, 10 checks", which reads as ten checks in total and is not what A10 wrote. The 10 were failures: host handle, Play, empty `#view`, transport, Step View marker, device title, step cell, Save, plus 404s for `ui/facedefs.js` (A3) and `ui/app.js` (A6).

**A6's answer.** `log-A6.md`, "Answers to messages": "**From A6 to A1:** `window.HavantechnoApp = {host, app}` is exposed". "**From A6 to A10:** `#start-audio`, `#frame` with a button of `aria-label="Play"` (becomes "Pause" while playing), `data-view="system|step"` on the mounted view's wrapper, windows are children of `#windows`."

**A5 to A10** (`log-A5.md`, "Start"): the view root has `data-view="step"`, each row's cell container has class `step-grid`, each cell carries `data-step`; "My cells are `div[role=button][aria-pressed]`, not `button.hv-step` ... so A10's selector `.step-grid [data-step]` is the one that matches." **A2 to A10** (`log-A2.md`): "the step selector `button.hv-step[aria-pressed]` is correct" for `Widgets.steps`. The two selectors cover two different widgets. A10's log does not say which one its passing run used.

**A1 to A10** (`log-A1.md`, "Answers"): the names `host.transport.playing`, `host.transport.pos()`, `host.devices()`, `host.document()` are as A10 read them; the project file keeps `app: 'havantechno'`; the autosave key is `havantechno.autosave`. A1's log has this answer to A10, but A10 recorded at 23:14 that none of the A1, A4 and A7 logs was addressed to it, so the answer was presumably added after that read (not stated in either log).

**Settled.** All five asks met; at 23:30:06 the coordinator's run shows the host handle, start gate, Play in `#frame`, transport advancing, Tab to Step View, step toggle, Save, autosave and file loads passing.

---

### Thread 12. A10's check red against the real app: the device title

**State.** Coordinator, 23:30:06: `node tools/browser-check.js` exit 1, 1 failed check, 0 page errors, 0 console errors, "22 of 23 pass". A1's run (`log-A1.md`, "Verification"), made in an earlier state of the tree, had seen three failures (host handle, transport read, device title); A6's own run (`log-A6.md`, "Verification") saw one: "device title".

**Diagnosis, two accounts.**
- A6: "The check's "device title" step fails because it first switches to the Step View and then looks for `.se-dtitle[title^="Double-click"]`, which only the System Editor has (and which A4 draws only as a fallback; with the real Faces, the double-click target is the face's `.hv-head`). Fix in the check: open the window before pressing Tab, or look for `.hv-head`."
- Coordinator, 23:30:06: "the check switches to the Step View and then looks for System-Editor-only selectors; the real faces' double-click target is `.hv-head`. The check is A10's; sent to A10 with the selector."
- A10, `log-A10.md`, "Coordinator request" (23:33): before the fix, "`.hv-head` found in the System Editor, but the view had already switched back, so the double-click timed out". That is a different second cause from A6's, and a different first cause from the selector name alone: the earlier version of the check switched back to the System Editor before the double-click, which "hid the title".

**A10's changes** (own file only): `deviceTitle` candidates start with `.hv-head`; the title is looked for in the active view first, with one Tab and a second search if it is absent; the view is not switched back before the double-click; the device-window step wraps `Windows.open` to count calls; the step toggle now runs before the device window "because the opened panel covered the step grid"; the host is read from `window.HavantechnoApp.host`.

**Runs** (exit read from `$?`, output to a file): `exit code: 1` (device title), `exit code: 1` (step toggle click timed out behind the panel), `exit code: 0` `RESULT: PASS (26 checks)`, and again `exit code: 0` `RESULT: PASS (26 checks)`. Output line: `device window opens on double-click - .hv-head, Windows.open called 1x, #windows children 0 -> 1`.

**Coordinator, 23:34:15:** wave-1 gate green, run here with the exit code read from `$?`: exit 0, `RESULT: PASS (26 checks)`.

**Count discrepancy.** The coordinator's 23:30:06 entry says 23 checks (22 pass). A11, running the working tree at head 6ab1499 (`log-A11.md`, "Checks run"), saw 26 PASS and 1 FAIL, i.e. 27 checks, and wrote: "the brief said "22 of 23"; the working-tree browser-check.js (uncommitted A10 edit) now has 27 checks". A10's final and the coordinator's 23:34:15 both say 26. A11's 27 and the final 26 are not reconciled in any log; the count presumably changed between A10's edits, but no log says how.

**Settled.** Green at 26 checks. The rule the coordinator set in the 23:14:41 entry applied here: "a check that prints a Node stack trace has failed even if a pipe hides the exit code; I will check exit codes directly from now on."

---

### Thread 13. The knob-undo question

**Raised by:** A1. `log-A1.md`, decision 3: knob values are written into the document, and "No undo snapshot is taken for a knob move (that would flood the undo stack); an undo of a later step edit restores the snapshot, which can put back an older knob value." Under "Questions", "**To the coordinator:** decision 3 (knob values are written into the document, not undoable) is a contract interpretation; if you prefer knob moves on the undo stack, `setParam` can take an `{undo: true}` option in wave 2 (one snapshot per gesture, taken on `hold`)."

**Coordinator's decision**, 23:21:41: "**Decision on A1's open question** (should knob moves go on the undo stack?): yes, one snapshot per gesture, taken on the first `hold(path)` of a gesture and never on each `setParam`. Not in wave 1: it needs A4 and A5 to call `hold`/`release` around every drag consistently first, which A11's review will confirm. A1 owns the change in wave 2. Until then knob moves are not undoable; the UI must not advertise otherwise." Repeated in `log-A1.md`, "From the coordinator (after hand-back)".

**What the other logs say about `hold`.**
- A2, decision 5: `onHold()` fires once per gesture, on the first actual value change, for drag, wheel, keys, reset and typed value.
- A3, decision 5: faces call `host.hold(path)` on the first change; "toggles and selects hold on each change"; release only by "re-enable arranged".
- A4 and A5 do not mention `hold` or `release`. Their writes go through `host.editor()` and `host.commit()` (step edits, lanes), not through `setParam` (A4 decision 6; A5 decisions 4 and 6).
- A6 lists Ctrl+Z undo among the things it verified in Chromium (`log-A6.md`, "Verification") and does not mention the knob caveat. Whether the undo/redo buttons or any text tell the user knob moves are not undoable: not in any log.
- A11's brief includes "the hold/release audit that gates A1's undo-per-gesture change" (coordinator, 23:31:28). `log-A11.md` has no result for it yet.

**Scribe's note.** The decision keys the snapshot to "the first `hold(path)` of a gesture". A2 says `host.hold` must be idempotent because it is called once per gesture and "may fire many times across gestures", so a second gesture on an already-held path calls `hold` on a path that is already held. The logs do not say whether the snapshot is taken on every gesture's first `hold` call or only when a path becomes held. A11 or A1 will have to settle that in wave 2.

**Status.** Decided, deferred to wave 2, owner A1, gated on A11's audit.

**Later (wave 2):** decided as written, implemented by A1, and the "first hold" ambiguity settled by A11's audit as "every `host.hold` call" (Thread 28).

---

### Thread 14. A3's new params from A7 and A8 (and what the Host reads from processors)

**A8 to A3**, `log-A8.md`, "Messages": "New spec entries (all have defaults equal to today's behaviour): `delay`: `loop` (boolean), `modRate` (Hz), `modDepth` (s). `reverb`: `algo` (string, `'ir'` | `'freeverb'`), `seed` (integer). `chorus`: `base` (ms), `invert` (boolean). `widener`: `monoBelow` (Hz). `sidechain`: `curve` (string, `'lin'` | `'db'`). Strings need an option list in the layout (`layout.options.algo`, `layout.options.curve`) if you place them. Unplaced ones land in the "more" drawer, which the lint treats as a note, not an error."

**A7's new params** (`log-A7.md`, "Decisions"): kick `tau` and `hold`; sub `mode` (`'pluck'`|`'drone'`) and `release`; hat `metalHp`. A7's log has no "To A3" message.

**A3's answer**, `log-A3.md`, "Answers": "**From A3 to A8 and A7:** your new params are placed (delay loop, modRate, modDepth; reverb algo, seed; chorus base, invert; widener monoBelow; sidechain curve; kick tau, hold; sub mode, release; hats metalHp) and the heroes draw them. Option lists for `algo` and `curve` are in Faces' defaults; sub `mode` is `['pluck','drone']` in its layout. If you rename a param or add a string param, the lint says so." Decision 3: "New engine params (A7, A8 added 15 this wave) therefore appear the same day; I then placed them in sections and the lint note count went to 0." Decision 4: a string param with no option list is a lint error, and a unit test shows a new spec param goes to the drawer.

**Scribe's note on the count.** A3 says 15 new params. The names in A8's message (9) and in A3's own reply (kick tau, hold; sub mode, release; hats metalHp: 5) come to 14. Either one extra param (A7's sub `glide`, or `metalHp` on two hat tracks) was counted, or the count is off by one; no log lists the 15.

**A8 to A1**, `log-A8.md`, "Messages": A8 read `host.js` (lines 340 to 350, `setParam` for chain units): "the value is written generically into `t.chain[i][param]`, so `algo`, `seed`, `loop`, `curve`, `invert`, `base`, `monoBelow` and the delay modulation persist with no change on your side. I did not run host.js." A1's log lists what `selfcheck.js` section 5 asserts for `setParam`; whether that covers A8's new params is not in it. A3's faces-check covers rendering of all of them.

**Settled.** Placed and linted; engine-side persistence through the Host is A8's reading, not a run.

---

### Thread 15. A8's sidechain retrigger fix for A7

**Raised by:** A7, `log-A7.md`, "Sidechain note for A8 (processors.js, not my file)": "`BUILD.sidechain` steps the gain to the trough from its current value when a trigger arrives inside `attack + hold + release` (`setV(g.gain, 1 - depth, t)` after `cancel`). That is the retrigger step S1 flagged. With V2's kick pattern (`x...x...`, 476 ms apart) it does not fire, because the sidechain length is 0.23 s. The fill pattern `F` (`x.xx`, 119 ms) would hit it, and the sub drone would click there. Not changed here."

**A8's fix.** `log-A8.md`, decision 8: each trigger keeps its breakpoints (`pts`); on a retrigger `levelAt(t)` computes the gain the scheduled envelope has at `t` (linear or exponential per segment), `cancelScheduledValues(t)` removes the old schedule, `setValueAtTime(level, t)` starts the new dip from that level, "The gain therefore ramps from its current value and never steps. Without a retrigger, the level is 1 and the calls are identical to before (checked by the regression in the check tool)." A8 also added `curve: 'lin'|'db'` (exponential recovery for `'db'`).

**A8 to A7:** "The sidechain retrigger fix from your note is in (see decision 8). The fill pattern `x.xx` (119 ms) now starts the dip from the current level. Your sub settings (`depth 0.82, attack 0.03, hold 0.08, release 0.12`) are unchanged and valid. For a dB-linear recovery on the sub, set `curve: 'db'` in its `sidechain` params; I have not changed anything in `song.js`."

**Evidence.** `tools/processors-check.js`, 54 checks, section 7: "retrigger 10 ms apart in the hold: starts from the dip level 0.4"; "curve db, retrigger in the release: starts from 0.40672 (not the step 0.4)"; "the old schedule from the retrigger on is cancelled"; "the dB curve differs from the old step by 0.0067". A8's mutation test (changing the sidechain recovery end by 1 ms in a scratch copy) made the regression fail with exit 1.

**Not verified.** A7's "the sub drone would click there" is not confirmed or refuted by any log: no render of the fill pattern exists, and A8 says "any sound" is unverified (`log-A8.md`, "Verification": "filter responses, the Freeverb tail ... and the ducking shape are not rendered or measured").

**What came next.** A9 measured the V2 sub duck and found it too deep at 100 to 150 ms (Thread 19). Whether `curve: 'db'` or the retrigger path matters there is not in any log. The sidechain values A7 lists for the V2 sub do not include `curve`, and A8 says it did not touch `song.js`, so V2's sub is on the default `'lin'` curve (scribe's reading of those two statements).

---

### Thread 16. Reverb seed for repeatable renders (A8, A9)

**A8 to A9**, `log-A8.md`, "Messages": "For repeatable renders, set the reverb return's `seed` above 0 (for example `send.reverb.seed` through `setParam`). I read `sequencer.js` `addSend` (lines 125 to 135): returns are built with `Processors.create(seq.ctx, type, opts)`, so the seed reaches the processor. The default (seed 0) still uses `Math.random`, so renders differ run to run until a seed is set. I did not run a render."

**A9's answer**, `log-A9.md`, "Findings", "**To A8:** `send.reverb.seed` is read by the app's sequencer and is not needed by the loop: `render.js` seeds `Math.random` in the page, which covers the reverb impulse path too. The seed parameter is still the right way to make app renders repeatable for users. Not changed here." A9's reason (Start/What was built): the archived engine's noise and jitter use unseeded `Math.random`, so two renders of the same bars differed; the harness seeds `Math.random` via `addInitScript` (test harness only).

**Residual.** A9 open item 5: "Same seed still differs by at most 15 LSB (-80 dB rms) for a source I did not isolate. Measures agree to three decimals." So the seed work is complete in the engine and the harness, and one non-determinism source is unidentified.

---

### Thread 17. `GUIDANCE_V2` and which song opens

**A7 to A1**, `log-A7.md`, "For others": "`Song.GUIDANCE_V2` and `Song.documentV2()` exist. `Song.document()` still returns the baseline. Whether the Host should open V2 by default is your call, not made here."

**A1's answer** (`log-A1.md`, "Answers"): "the Host opens `Song.document()` (the baseline) by default, as the contract says. `Host.create({doc: Song.documentV2()})` opens V2; `host.loadDocument(Song.documentV2())` switches at run time. Which one the app opens is A6's call in `app.js` (or the coordinator's)."

**A6** (decision 7; "From A6 to A1"): "`?song=v2` opens `Song.documentV2()` (A1's open question: the default stays the baseline)."

**A9** uses both: `--song v2` renders `Song.documentV2()` through `Host` on the app page and `Song.GUIDANCE_V2` on the archive. The archive page has no `GUIDANCE_V2`, so `node tools/render.js --sections intro --bars 2 --song v2` exits 1 with "Song.GUIDANCE_V2 is not on this page"; A9 marks that as expected.

**Settled.** Default stays the baseline; V2 by `?song=v2`. The coordinator's log does not record a decision on the default, so this stands on A6's choice.

---

### Thread 18. A7's departures from the brief's numbers

A7's log is explicit about where it did not follow the contract or the brief, and ends with a list for the coordinator ("the open decisions are the B0 bar (TODO in `song.js`), the sub-attack reading in decision 6, the bar-128 vs bar-136 lowpass restore (decision 9), and whether `choke` is wanted now"). The items:

- **Kick decay.** Decision 3: "Kick decay for V2: 0.36 s, not the brief's "~0.12"". Reason: `decay` runs from the end of the hold to -80 dB; 0.12 would give -60 dB at 150 ms where the reference is -17.8; a least-squares fit to O1 M2 gives 0.357 s; with 0.36 the model minus reference is -2.6, -2.2 and +2.5 dB at 100, 150, 200 ms.
- **Sub pattern.** Decision 5: the sub's `gate` 16 gives `ev.dur` of a whole bar (1.905 s), so with four hits per bar the drone voices would stack; V2 uses `patterns: {A: 'x...............'}` and drops B and O.
- **Sub duck source.** Decision 6: `depth 0.82, attack 0.03, hold 0.08, release 0.12` are placed in the sub track's `sidechain` and are "not the sub instrument's `attack`... If the coordinator meant the instrument's attack, change that line in `GUIDANCE_V2.sub`."
- **Bass.** Decision 8: `env 100, drive 0`; no `drivePos` added ("not in the brief").
- **Arrangement.** Decision 9: `break` 16 bars, `breakLate` 8 bars with `master.lp.cutoff` 6000, and, "Added beyond the brief:", `mainB` sets `master.lp.cutoff` 20000 restored at bar 136 not 128, because section sets persist. "The bar-128 choice is open: the reference gives no measurement of the highs in bars 128-135."
- **Not done:** sub per-bar notes and the B0 bar (unmeasured, "O1: 1 bar in 8"); the `choke` flag; kick `drive` 0 vs 0.45 not rendered.

**Coordinator's response:** none recorded. `log-coordinator.md` does not mention these four open decisions after the 23:14:41 hand-back entry, which says only "Verified: node --check, app/engine/selfcheck.js 193 OK, tools/synths-check.js 36 OK. Committed 19ce4ef." The last coordinator line (23:35:49) lists "wave-2 owner fixes" without naming them.

**Later (wave 2):** the coordinator ruled on all four at 23:43:46 (Thread 23).

---

### Thread 19. A9 scores V2 and reports back to A7

**Request.** A9 read A7's log and took "V2 must be scored" as addressed to it (`log-A9.md`, "Start"). 

**A9's findings**, `log-A9.md`, "Findings for the coordinator and owners", "**To A7 (V2 scored):**" app intro 16 bars, baseline against V2, against reference intro bars 0 to 16:
- Sub duck 0 to 60 ms: V2 gives -3.0 / -4.1 / -5.8 / -9.4 / -15.8 dB against the reference's -2.8 / -3.5 / -5.4 / -8.8 / -13.3. "Good match."
- Sub duck 100 to 150 ms: V2 gives -25.9 / -19.9 dB against the reference's -10.8 / -5.7. "About 14 to 15 dB too deep and too slow to recover (the baseline has no duck, so this is the first duck measured on the app)."
- Kick glide: "unreliable on both renders"; tempo 124.4 for V2 against 126.0.
- Baseline mids: "R -9.8 dB vs reference -23.9 dB on the intro. About 14 dB hot in the mids; 1-4 kHz +10 dB; 4-16 kHz +17 dB. This is the largest gap found so far, and it is the intro".

**Coordinator**, 23:35:49: routes these to wave 2: for A7, "the V2 sub duck is 14 to 15 dB too deep at 100 to 150 ms though it matches the reference at 0 to 60 ms"; for the intro being hot in the mids, "owner to be decided after A11 (synth level versus EQ)". A9's unresolved measurement questions stay open (Thread 20 and "Left open").

**Settled.** Findings delivered and routed; no fix yet. A7's log predates the findings and has no reply. Every V2 value is still a fit to O1's measurements, not a listened result (`log-A7.md`, "Verification": "No render was made, so the kick, drone and break values are fits to measurements").

**A9's method checks against O1** (A9's numbers, not reproduced by the coordinator, 23:35:49): integrated loudness within 0.05 LU on all seven sections; true peak within 0.01 dB; kick glide on the reference 253.0 / 51.2 / 25.2 ms against O1's 264 / 51.2 / 23.9; sub duck on the reference mainA at 40 ms differs from O1 by 8 dB. The reference file is outside the repo (`/root/.claude/uploads/.../Guidance_Original_Mix_192kbps.mp3`), so the coordinator could not re-run those.

**Later (wave 2):** the coordinator routed the sub-duck finding to A7 at 23:35:49; no wave-2 log from A7 addresses it (see "Left open after wave 2"). The loudness gap was handled at the master output stage by A8 (Thread 36).

---

### Thread 20. The render slowness (A6 found it, A9 measured it)

**Found by A6**, `log-A6.md`, "Known problems and not done": "**Full-song export is slow in this sandbox.** `host.render({from:0,to:8})` took 1.7 s but a 48-bar render ran more than 100 s, and the full 200-bar export from the button did not finish in 180 s in headless Chromium. That is in `Sequencer.render` or the processors (A1/A8/A9), not the frame; the button, WAV encoding and download are verified only with a 4-bar render."

**Earlier data point, A1.** `log-A1.md`, "Verification": `render({from:'intro', to:4})` gave 450660 frames at 44.1 kHz in 0.9 s, WAV 1802684 bytes.

**Coordinator**, 23:30:06: "A6's export caveat stands as a wave-2 engine item: a 48-bar offline render took over 100 s in this sandbox and the full 200-bar song did not finish in 180 s; Export WAV only completed with the render limited to 4 bars." At 23:31:28 A11 was told to find it: "measure 4/16/48 bars with suspects toggled; suspects named: Freeverb node count, seeded IR generation, per-step node creation, scheduler cell lookup". A9 "was told to score a short window rather than fix the engine".

**Measured by A9**, `log-A9.md`, "Render length and wall time", headless Chromium, offline:

| Render | Bars | Render time | Per bar |
|---|---|---|---|
| archived intro | 16 | 4.33 s | 0.27 s |
| archived mainA | 16 | 17.30 s | 1.08 s |
| app intro | 16 | 3.53 s | 0.22 s |
| app mainA | 16 | 16.87 s | 1.05 s |
| app intro (V2) | 16 | 2.23 s | 0.14 s |

A9: "The density of the section drives the cost: mainA (stabs, hats, clap, bass, lead) takes about 4× intro per bar." "At 1 s per bar, the 200-bar song would take about 3 to 4 minutes, consistent with A6's report of more than 100 s for 48 bars. I did not investigate further, per the coordinator's instruction (A11 is measuring)." Coordinator, 23:35:49: "That explains A6's export timeout and is now a measured wave-2 item, not a mystery".

**Scribe's note.** Two points the logs do not reconcile. (1) 48 bars at A9's 1.05 s per bar is about 50 s, not "more than 100 s"; A6's figure implies over 2 s per bar, so A9's "consistent" holds for the 200-bar total (about 3 to 4 minutes) but not obviously for the 48-bar figure. Both call `host.render` on the app page, and A6 does not say which bars its 48-bar render covered, so the gap is not explained in any log. (2) The archived page, which has none of A7's or A8's changes, took 17.30 s for mainA against the app's 16.87 s. Of the coordinator's named suspects, Freeverb and the seeded IR exist only in the app, and A8 keeps both off by default (`algo` `'ir'`, `seed` 0). A9 does not draw this comparison. A8 says the Freeverb CPU "was not measured".

**Status.** Open. A11 measuring; `log-A11.md` has no timings yet.

**Later (wave 2):** cause found and fixed (Thread 26).

---

### Thread 21. The face head repeated in the window (A6 to A3)

**A6 to A3**, `log-A6.md`, "Answers to messages": "Note: in the `window` density the face draws its own head (glyph and name), which repeats the window title bar; your call whether to drop it at that density." A3's log, which carries "**To A6:**" notes on `Faces.fallback` and `face.resize(w,h)` for windows, has no reply to this one.

**Status.** Unanswered in the logs. Owner A3, with A6 affected. A related fact: the head is also what A4 and the browser check double-click (Threads 6 and 12), so dropping it at window density would not affect those, which use the strip and face densities (scribe's reading; no log says so).

**Later (wave 2):** settled by ruling (Threads 23 and 30).

---

### Thread 22. Wave 2 opens: A11's integration review

**Coordinator**, 23:31:28: "A11 (Opus) started on head 6ab1499 while A9 (render and score loop) and A10 (browser-check selector fix) finish wave 1; A11 reads app/engine, app/ui, the shell and the checks, not A9's tools." Brief, in order: contract mismatches; real bugs on real paths (edit while playing, forks across sections, save/load round trip, undo after knob and step edits, link modes in Electron versus in-page, voice leaks, lock restore, fake-DOM blind spots); the render slowness (Thread 20); the hold/release audit that gates A1's undo-per-gesture change (Thread 13); `THIRD_PARTY.md` hygiene. "A11 writes only log-A11.md and commits nothing."

**What A11 has logged.** `log-A11.md` holds the reading list and a table of eight checks run with exit codes read directly (see the verification table). It records no findings yet. The log ends after the checks, with a note on the 27-check count (Thread 12). Everything else the brief asked of A11 is therefore not traced.

**Other logs and A11.** A9 names A11 as the owner of the render timing ("A11 is measuring"). No other log is addressed to A11.

**Later (wave 2):** `log-A11.md` is complete; its findings, and what each owner did with them, are in Thread 25 and the threads it names.

---

## Wave 2 threads

Wave 2 opened at 23:31:28 with A11's dispatch and ran to the coordinator's entry at 2026-10-24 00:25:46, which says: "Every wave-2 item is in and verified". The sources are `log-A11.md` (the review), `log-coordinator.md` from the 23:43:46 entry onward, and the wave-2 sections of `log-A1.md` to `log-A10.md`. Of the owners' logs only `log-A10.md` (00:08 to 00:12) and the coordinator's carry clock times; `log-A9.md` is dated 2026-10-24 and has none. The same citation and "Scribe's note" conventions apply. Threads 23 to 39 follow; they are grouped by subject and ordered by when each starts.

---

### Thread 23. The coordinator answers the wave-1 DISCUSSION (23:43:46)

**Raised by:** the coordinator, `log-coordinator.md`, 23:43:46: "The scribe compiled `DISCUSSION.md` (22 threads) from the ten logs and this one, and listed what the logs leave inconsistent or unanswered. Records are not edited; the corrections and rulings are here."

**Corrections it gave** (reconciled item by item in the closing section):
- Browser-check counts: "A10's revision then reordered and merged steps ... and the final run reports 26. A11 saw 27 (26 pass, 1 fail) on an intermediate tree." The earlier "FAIL, 10 checks" "meant 10 failed checks on the first tree".
- System-editor-check: the 23:14 "interface mismatch" call was wrong; "The 43 → 40 change is A4 merging assertions in its revision; A4's log does not say so, and I did not ask. Noted, not reopened."
- `tools/out/` "was ignored by me in an earlier gitignore commit ... before A9 looked; A9's "not added" means A9 did not add it. Both true."
- Render time: A9's rate gives about 50 s for 48 bars, "not the "over 100 s" A6 reported; A6's number may include page start, the tail and WAV encoding, or a slower moment of the sandbox." It also adopted the scribe's note that the archived page renders as slowly as the app, so "Freeverb and the seeded IR ... are unlikely to be the cause; forwarded to A11" (Thread 26 shows what A11 found).
- A3's "15 new params" is 14 by the names listed, "Count error, no effect." `review-A11.md` in BRIEF is `log-A11.md` in fact: "The log name stands; BRIEF.md is amended by this note, not by editing the brief."

**Rulings on A7's four open decisions** (Thread 18): the B0 bar stays C#1 with the TODO ("unmeasured, so do not guess a bar ... Not a wave-2 item"); the sub-attack reading is right ("The values are the sidechain processor's, not the instrument's attack. No change."); the lowpass restore stays at bar 136 ("a future render-versus-reference score of that window decides it"); `choke` is "not now. It arrives with the sampler (milestone 5b lists choke groups)".

**Rulings on the rest:**
- Step View follow: "following the playhead while playing is the behaviour the owner asked for ("modify every step ... in that view" while the song runs), so follow defaults on; A5 flips its default and its button turns it off, and `selectSection` honours the flag." (Thread 31.)
- Rulers: "both views draw their own ruler (A6's reading). Acceptable for now; a shared ruler widget is a wave-3 simplification, not a bug."
- A5 and the editor extras: for A11 to check and for A5 to state in its wave-2 log (Thread 31).
- A6's repeated-head note: "the window shows one title bar (the window's), and the face's window density carries the hero and the section controls." (Thread 30.)

**Scribe's note.** The coordinator's wave-1 ruling on knob undo said the change "needs A4 and A5 to call `hold`/`release` around every drag"; A11's audit later shows neither view calls `setParam` at all (Thread 28), so that premise did not hold. The coordinator's 23:51:27 ruling restates the rule without it.

---

### Thread 24. The sampler contract and its two amendments (coordinator, A7, A1, A3, A11)

**Dispatch.** Coordinator, 23:45:33: wrote "the Sampler section of app/CONTRACT.md (542e7b5): instrument params, `opts.getBuffer`, choke groups through a per-context registry, `host.loadAudio`/`audio()`/`unloadAudio`, the document's `audio` map as references, track type `sampler`, Project.open reloading or listing missing sources, UI and check expectations." A7 builds the instrument and its cases; A1 builds the Host and document side, the self-check stubs and round trip, and writes its wave-1 extras into the Host section. (A1 did the latter: coordinator, 23:54:52, "CONTRACT.md now carries the wave-1 Host extras and the sampler amendments".)

**A7's build** (`log-A7.md`, "Wave 2: sampler"). `BUILD.sampler` with `buffer`, `start`, `end` (0 = whole), `pitch`, `gain`, `attack`, `release`, `loop`, `choke`, `reverse` and `level`; choke through `Synths.chokeGroups(ctx)` with a 5 ms fade. Decision 1: `sampler` is kept out of `Synths.types()` because A1's self-check iterates `types()` and requires a device per type (coordinator, 23:49:05: accepted "until A1 adds the device"). Decision 2: the contract says `ev.note`, "The sequencer sends `ev.midi` on note tracks and never `ev.note`. The instrument accepts both". Decision 3: a one-shot ignores `ev.dur` ("using it would cut every sample to 70 ms"). Decision 6: `reverse` "is accepted and does nothing". To the coordinator: "the choke fade and the `midi` fallback are the two places I went past the text."

**A11's two contract findings** (`log-A11.md`, "Sampler contract added during review"): C1, "`gain` collides with the channel's `gain`": `<track>.<param>` resolves against the instrument spec first, so for a sampler track `'<track>.gain'` "would write the sampler's gain and the channel gain would be unreachable. Every other instrument uses `level` for its trim." C2, "`ev.note` vs `ev.midi`": the contract says `ev.note`, the sequencer sets `e.midi`; "say which" base. Question 2 to the coordinator asked for both to be settled "before A7 builds it".

**Coordinator's ruling**, 23:51:27: "drop the sampler's own `gain`; it uses the common instrument `level` like every other instrument (so `<track>.gain` stays the channel's). The contract says `ev.midi`, which the sequencer sends. A7 already built with `gain` and `ev.midi`; A7 changes the one name."

**A7's follow-up** (`log-A7.md`, "Wave 2 follow-up"): sampler `gain` removed; amplitude is "the hit velocity times the common instrument `level`"; `ev.midi` "stays as built (`ev.note` if a number, else `ev.midi - 48`, else 0)". synths-check 74.

**A1's side** (`log-A1.md`, part 1, decision 8): in the Sampler section, "no own `gain` (the common instrument `level`), and the pitch offset comes from `ev.midi` (the sequencer never sends `ev.note`), semitones = `ev.midi − 48`." Decision 6: `sampler` is `drums` by default and a document track's `family` field overrides it.

**A3's face and its accessor question** (`log-A3.md`, "Wave 2, part 2"). A3 built a sampler face (waveform hero with draggable start and end handles; 25 definitions) and asked A1: "the hero needs the decoded AudioBuffer. The contract has no accessor, so Faces tries `host.getBuffer(id)`, `host.buffer(id)`, `host.audioBuffer(id)`, then `device.ref.getBuffer(id)`; please provide `host.getBuffer(id)` (or tell me the name)", and suggested family `'drums'`. A1 answered (`log-A1.md`, "Answers", to A3): "the one name is **`host.buffer(id)`**; it returns the `AudioBuffer` or null. Please drop the other names", `host.audio()` returns "an **array** ... never a map", and `sampler` is `drums`. A3 (part 3): the hero "reads the waveform only through `host.buffer(id)` and the list only through `host.audio()` ... The earlier "To A1" request for `getBuffer` is withdrawn." Coordinator 23:54:52 listed "A3 asks A1 for a `sampler` family" among items open from the hand-backs; A1's log shows it had already been done in part 1.

**A3's `gain` layout and A1's check.** A1 reported `tools/faces-check.js` failing because `Faces.lint` reported `sampler.gain` named in A3's layout but not in the spec: "A3's layout against A7's removal of `gain` (the ruling in item 7), not Host code." The coordinator's account (23:54:52): "A1's faces-check failure (sampler.gain in the layout) was a race with A3's edit; green now." Both agree it is fixed; they differ on whether it was a race or the ruling reaching A3's layout.

**Status.** Settled and covered by checks (synths 74, selfcheck section 6, faces 1167). Not verified: any real `AudioBuffer` decode in A7's own checks, the real-browser `playbackRate` AudioParam, the choke fade's `gain.value` reading (`log-A7.md`, "Not verified"); `reverse` is not implemented. A1's own Chromium run is the only sound evidence: a WAV made with `Sequencer.wav` loaded, "sampler meter peak 0.68; solo render of bar 0: peak 0.79" (`log-A1.md`, "Verification (part 1)").

---

### Thread 25. A11's review: findings by owner, the coordinator's rulings

**Received:** coordinator, 23:51:27: "A11 reviewed head 6ab1499 (before A1's and A3's wave-2 edits) and wrote log-A11.md only. Its checks table matches mine." A11 also confirmed that save then load is identical after locks, forks, fx hits and knob writes (E9), that locks restore, that "all 6,246 voices of the song leave `_live`", and that nothing is copied from another project, so "the empty THIRD_PARTY.md is right". A11's own note: it did not rerun anything against A1's later `host.js` (about 220 uncommitted lines at hand-back).

**Findings and where each went** (A11's ids; threads named):

| Id | Finding (A11's severity, owner) | Disposition in the logs |
|---|---|---|
| E1 | Offline export is O(bars^2) (major; A1) | A1 chunked render; Thread 26 |
| E2 | Instrument `level` and stab `hp` ignore the scheduled time (major; A7) | A7 fixed; Thread 35 |
| E3 | Jump and partial render do not chase the arrangement (major; A1) | A1 fixed per ruling; Thread 27 |
| E4 | Undo of a step edit reverts later knob moves (major; A1) | A1 snapshot per `hold`; Thread 28 |
| E5 | Bypass is not part of the Host or the document (major; A1 and A6) | A1 `host.bypass`, A6 caller; Thread 32 |
| E6, E7, E8 | Render ignores held paths; fork can take a letter a section names; refused `setStep` still snapshots (minor; A1) | A1 fixed; Thread 39 |
| E9 | Round trips, locks, voice leaks checked and fine | no action |
| C1, C2 | Sampler `gain` collision; `ev.note` vs `ev.midi` | Thread 24 |
| W1 | Step View yanked to the playing section on every section change (major; A6, A5) | ruled and fixed differently from A11's proposal; Thread 31 |
| W2 | Window Editor tab shows only the hero (major; A6, A3) | A3 and A6; Thread 30 |
| W3, W4, W5 | Retargeted Electron child keeps old id; child windows do not subscribe to `'document'`; BPM field pushes every keystroke (A6) | A6 fixed; Thread 37 |
| S1 | System Editor step drag floods the undo stack (major; A4, A2) | A2 and A4; Thread 29 |
| S2 | System Editor edits use the transport's bar and section at click time (minor; A4) | No log answers it. |
| V1 | step-view.js does not use `ed.group`, `ed.setFx`, `ed.setVariantBars` (minor; A5) | A5 now uses all three; Thread 31 |
| F1 | Knob `home` is the spec default, not the song's value (minor; A3) | A3 fixed (home = section set value, else document value, else spec) |
| F2 | Toggles and selects call `hold` on every change, including `mute` (minor; A3) | A3: "`mute` and `solo` toggles never call `host.hold`"; other toggles and selects still hold per change, which A11's audit table records as intended ("one change = one gesture") |
| D1 | Contract says hold at drag start and release only via "re-enable arranged" | Kept; Thread 28 |
| D2 | Contract says `tools/serve.js` serves `app/`; it serves the repo root | No log answers it (the contract is the coordinator's file). |
| Licence | No third-party code found; optional provenance row for Freeverb topology and mulberry32 | Not added (`log-A10.md`, wave 2: "A11's optional provenance row ... is not added") |

**A11's three questions and the coordinator's rulings** (23:51:27): (1) Gesture end: "a gesture still ends only through "Re-enable arranged" for the *held* meaning (the contract's). For undo, A1 snapshots on every `hold` call ... so that is one snapshot per gesture with no new callback." (2) Sampler `gain` and `ev.note`: Thread 24. (3) Chasing on jump: "Jumping and rendering from mid-song apply the arrangement's section sets and ramp end values up to the target position, except held paths. Sound state does not carry over across jumps. A1."

**A11's unverified suspicions** (`log-A11.md`): two `Windows.open` calls before the first child registers open two linked windows (Electron, Single link); a crashed child leaves its listeners in `host`; `Project.restoreAsync` prefers app-data over `localStorage` even when the app-data write failed. "Nothing run in Electron by me; W3/W4 are code traces only." None of the three is addressed in any later log.

---

### Thread 26. The render slowness: cause and fix (A6 found, A9 measured, A11 located, A1 fixed, A9 re-scored)

**Earlier in the thread** (Thread 20): A6 found a 48-bar render over 100 s; A9 measured about 1 s per mainA bar at 16 bars and called that consistent; the coordinator, 23:43:46, doubted A6's figure and named Freeverb and the seeded IR as unlikely suspects once the archived page proved equally slow.

**A11 located the cause** (`log-A11.md`, "Render performance", headless Chromium, 4 cores, 44.1 kHz). The real song as shipped took 0.74 s at 4 bars, 4.3 s at 16 and 111.6 s at 48. Scheduled two bars ahead with `OfflineAudioContext.suspend` (a driver, "no engine edit") it took 0.65, 2.2 and 13.0 s. A steady mainA-like section took 18.0 s at 16 bars and 64.2 s at 32 as shipped, and 6.2 s and 13.1 s chunked. Suspects, each at 16 steady bars against a 17.5 s baseline: reverb `seed: 7` 17.5 s, `algo: 'freeverb'` 17.2 s, no sends 15.6 s, no duck lists 17.6 s. The archived engine took 4.4 s and 17.5 s for bars 0-16 and 40-56, the app's `Host.render` 5.1 s and 18.5 s. JS time was small ("`scheduleAll` 121 ms for 48 bars"). Cause, as A11 wrote it: "`Sequencer.render` (sequencer.js:475-495) calls `scheduleAll(from, to)` before `startRendering`, so every voice of the whole range ... is created and connected to `inst.pre` at time 0 and stays in the render graph for the whole render; `onended` cannot dispose them because the main thread does not run during an uninterrupted offline render. Cost per render quantum grows with the range, so total time is about quadratic". mainA is slower than the intro per bar "because it fires about twice as many voices per bar", and the quadratic term multiplies that. "Freeverb, the seeded IR, sends and sidechain retriggers are each within 2 s of baseline at 16 steady bars, so they are not the cause." Chunked output "equals the shipped output in RMS (0.3984 vs 0.3984 at 32 steady bars; peaks differ in the third decimal because the noise and IR use Math.random)". Finding E1 gave the fix.

**Coordinator**, 23:51:27, summarised it and dispatched A1: "chunked render with `suspend` (bar-sized or two-bar chunks; same output as now to the sample where possible, and A9 scores it)".

**A1's fix** (`log-A1.md`, part 2, decision 1): after building, `Sequencer.render` schedules the first two bars, then one `octx.suspend(k · barSec)` per bar schedules up to two bars past the render position and resumes; "The step times use the same accumulation as `scheduleAll` (`t += stepSec`), so the trigger list is identical (self-check 7b compares it trigger by trigger on a fake context with `suspend`)". `chunked: false`, a context without `suspend`, or a range of 2 bars or less keep the old path. A1's timings in Chromium, up front against chunked: 4 bars 582 ms against 833 to 927 ms ("run-to-run noise" on a side-by-side run); 16 bars 4631 ms against 2368 to 2652; 48 bars 115011 ms against 13132 to 13398, RMS 0.38448 against 0.38437, a maximum per-bar RMS difference of 0.0011.

**Coordinator's check**, 00:04:30: "`node tools/render.js --page app --sections mainA --bars 16`: 16 bars in 5.89 s here (A9 measured 16.9 s before the change), no page errors"; A1's timings repeated ("48 bars 115.0 s → 13.1–13.4 s"); output RMS and trigger list as above.

**A9's re-score** (`log-A9.md`, "Wave 2"). Per bar on the app page: intro 0.15 s (was 0.22 to 0.27), mainA 0.39 s (was 1.05 to 1.08), 48 bars (40:88) 0.42 s, 12 bars (100:112) 0.49 s, "full song 0:200 ... 88.79 s ... 0.44 s". New mainA 16 against wave 1: every measure within 0.0001 (tempo, R, bands, loudness, peak, correlation, duck, glide). At sample level "1,314,188 of 2,917,320 samples differ; maximum difference 39 LSB; rms difference 1.21 LSB against a signal rms of 12,804 LSB (about -80 dB)" and the cause is "the chunked scheduler draws `Math.random` in a different order (not verified)". A9's answer to the coordinator's question: "no measure moved by more than the stated noise."

**Scribe's note.** (1) A11's measurement explains the two things the logs left unreconciled in wave 1: cost is quadratic in range, so A9's 16-bar rates cannot be multiplied up, and A6's over 100 s for 48 bars (A11: 111.6 s) was right. The coordinator's 23:43:46 hypotheses (page start, tail, WAV encoding, a slow moment) were not needed. (2) The coordinator's 00:04:30 entry still lists as unverified "a full 200-bar export". A9 did render all 200 bars through `render.js` on the app page (88.79 s) and A1 notes only "the chunked render on a full 200-bar export in the app (only up to 48 bars)" as unverified; no log records the Export WAV button on the full song. (3) `CLAUDE.md` still says "a full 200-bar offline render takes 3 to 4 minutes", which A10 flags as stale (Thread 38).

---

### Thread 27. The jump ruling and the faces-check step it broke (A1, A3)

**Raised by:** A11, E3 (`log-A11.md`): "Section `set` is applied only on the first step of its own section (sequencer.js:335-336). T2: entering mainA2 linearly gives kick.level 1, clap.level 1, stab.cutoff 1500; after the user jumps to break and then to mainA2 it gives 0.6, 0.6, 900, and that state persists. T10: a render from breakEnd starts with kick.level 1 where playback has 0.6." Question 3 asked whether chasing was wanted or "sound state persists across jumps" was intended.

**Ruling**, coordinator, 23:51:27: chase; see Thread 25.

**A1's implementation** (`log-A1.md`, part 2, decision 2): `seq.arranged(absStep)` returns the arrangement's state at a step (every section `set` up to the one playing, earlier ramps at their end value, running ramps at their value at the step); paths first written by the arrangement later "go back to their value before the arrangement first wrote them"; `seq.chase(absStep, t)` writes that state skipping held paths, with `'param'` events of source `'arrangement'`. Called by `jump`, `stop` (back to the section start), `rewind`, the loop wrap, and `render` when `from > 0`; `host.release(path)` uses `seq.arranged`, so a release mid-ramp returns the ramp's current value. Selfcheck section 7 (40 checks): break to mainA2 gives kick 1, clap 1, stab 1500; a render from breakEnd starts with kick level 0.6. Real Chromium while playing: "jump to break → kick 0.6, clap 0.6, stab 900; jump to mainA2 → 1, 1, 1500, still playing, 13 arrangement `'param'` events".

**The broken step.** A1 to A3 (`log-A1.md`, "Answers"): "Your `tools/faces-check.js` now fails one check ("Delete returns stab.cutoff to the intro section value (500)", got null): I probed it. `host.transport.jump('intro')` now applies intro's state, so `stab.cutoff` is already 500 and Delete has nothing to write (writes `[]`). The behaviour is right under the coordinator's chase ruling; the check should move the knob away from 500 ... before pressing Delete." The coordinator saw the same at 00:04:30 (faces-check "FAILED 1 of 1167", the same cause) and told A3 to move the knob off 500.

**A3's fix** (`log-A3.md`, "part 3"): "The check moves the knob to 900 first, then presses Delete and asserts the write of 500 (the section's `set` value wins over the document value)." Coordinator, 00:05:30: faces-check OK 1167, exit 0; "which also shows the section's set value winning over the document value".

**Settled.** Chase implemented; the check's assumption was what changed. Not verified by anyone: the audible effect of chasing. A1's decision on a related point: A3's caveat that a face built after a tweak sees the tweaked value as the song value ("`persist` writes knob moves into the document") is "by design. The document is the song, tweaks included."

---

### Thread 28. Undo per hold gesture (A11, coordinator, A1, A2, A3, A4, A6)

**The wave-1 decision** (Thread 13): one snapshot per gesture on the first `hold(path)`, gated on A11's audit.

**A11's audit** (`log-A11.md`, "hold/release audit"). Verified in Chromium: "two drags of the kick `punch` knob in a window called `host.hold('kick.punch')` twice (once per gesture, before the first value change; widgets.js:316 ensureHold then onInput) and never `release`; heldCount 1; undo depth unchanged." The table: knobs and sliders in every face density hold once per gesture; toggles and selects "on each change (one change = one gesture)"; the native range fallback holds on pointerdown only; A4's and A5's controls "none call setParam (document edits or session state); not applicable"; BPM and swing, and the window Mute and Bypass buttons, do not hold. Conclusion for A1, quoted: "every knob gesture calls `host.hold(path)` exactly once at its start, but `hold` is idempotent and the path stays held after the first gesture, so "snapshot on the first hold of a gesture" must mean "snapshot on every `host.hold` call", not "when the path becomes held". There is no gesture-end signal anywhere (no `release`, no widget callback), so the snapshot must be taken before the value changes (it is: onHold precedes onInput)." This answers the scribe's wave-1 note in Thread 13.

**Ruling**, 23:51:27 (Thread 25): snapshot on every `hold`, no new callback; "BPM and swing fields and the window Mute/Bypass buttons must call `hold` too (A6), except mute and solo, which are not arrangement parameters and are not held (A3's face toggles likewise)."

**A1** (`log-A1.md`, part 2, decision 3): "`host.hold(path)` takes one undo snapshot on every call, before `seq.hold`. A11's audit: each knob gesture calls `hold` once, before its first value, so the snapshot holds the value before the gesture. A click without a move leaves an undo step that changes nothing; accepted. BPM and swing have no hold, so they stay outside undo". Self-check: undo reverts the knob and keeps the step edit, redo, undo to the start.

**Others.** A3: `mute` and `solo` toggles never call `host.hold` (`log-A3.md`, part 2). A6, W5: the BPM and swing fields "apply on `change` or Enter, never per keystroke ... and call `host.hold('bpm')` / `host.hold('swing')` before `setParam`", with the note "a held bpm shows in "Re-enable arranged (n)" and releasing it hands the tempo back to the arrangement"; Mute "does not call `hold` (ruling)". The coordinator's 23:55:29 entry records A6's fix.

**Scribe's notes.** (1) A1 says a click without a move leaves an undo step; A2's wave-1 decision 5 says `onHold` "fires once per gesture, on the first actual value change (not on a bare click)". For knobs those two statements disagree; for toggles and selects a click is a change. No log runs a bare knob click against undo. (2) A1 wrote that BPM and swing "have no hold"; A6's field change (verified by the coordinator at 23:55:29) adds `hold('bpm')`. The logs do not say which was written first, and none runs an undo of a BPM edit; A6 verified one `'param'` event and a held count of 1.

**Status.** Implemented and checked in Node; A1's browser run did not cover knob undo.

---

### Thread 29. Gesture phases and one commit per drag (A2, A4)

**Raised by:** A11, S1 (`log-A11.md`): "widgets.js steps `pointermove` calls `onDrag` on every move (no change check); system-editor.js:232-234 `dragStep` -> `setStepInSection` + `commit()` per call. Verified (ui-probe step 1): one 40 px drag added 21 undo entries and 19 `'document'` events." Fix proposed: A4 writes once on release or wraps the gesture in `ed.group`; A2 "calls `onDrag` only when the quantised velocity changes and adds an end-of-drag callback".

**Dispatch**, coordinator, 23:51:27: "`Widgets.steps` (and knobs, for symmetry) report a gesture phase start/move/end; A4 previews on move and commits once on end, inside `ed.group`. Today one 40 px drag makes 21 undo entries and 19 commits."

**A2** (`log-A2.md`, "Wave 2: gesture phases"). `steps` `onDrag(i, vel, phase)`: `'start'` on pointerdown on a lit cell, `'move'` "only when the quantised velocity (steps of 0.05) changes", `'end'` on pointerup or pointercancel. "A bare click on a lit cell gives `start, end` with the same velocity and then `onToggle` from the click, so **A4 should write on `'end'` only if the velocity differs from `'start'`'s**". Knob and slider keep `onInput(v, phase)` and gain `onGesture(phase, v)`; `onInput` never gets `'start'` "because A3's faces write on every `onInput` and a pointerdown alone must not write". widgets-check 157.

**A4** (`log-A4.md`, "Wave 2: one undo entry per step drag"). A drag keeps a gesture record; on each move the widget is redrawn locally and "the document is not touched and nothing is committed". On the end signal, one `ed.group(...)` with `setStepInSection` and one `host.commit()`. It handles the phase argument and, "until A2's widget passes a phase", `pointerup`/`pointercancel` on the widget element; a keyboard step is one entry. system-editor-check 50: the simulated drag on the real `Widgets.steps` gives no undo entry and no `'document'` event during moves, then exactly one of each on release.

**Coordinator**, 23:54:52: "A4 says nothing changes on its side now that A2's phases exist, and its check passes here with them."

**Not verified / open.** A4: "the phase path is tested only against captured options, not against a widget that really emits phases; a real pointer drag in a browser ... is exercised only through the fake DOM, since `tools/browser-check.js` does not drag a System Editor step." A2: "Not verified: A4's use of the phases (A4's file), real-browser touch." A4's promise to re-run against the real widget and remove the pointer fallback "if wanted" is not followed by a log entry. A2's advice to write on `'end'` only if the velocity differs from `'start'` is not mentioned in A4's log. A3's log does not mention `onGesture`; its faces hold through `onHold`.

---

### Thread 30. The window density and the repeated head (A3, A6, A11, coordinator)

**Earlier:** A6 had noted to A3 that the face head repeats the window title (Thread 21), unanswered in wave 1. The coordinator's own run at 23:39:09 found the Editor tab "shows only the hero graph, scaled to the window, with no parameter controls".

**A11 confirmed it** (`log-A11.md`, W2): "windows.js:286-291 `resizeFace` passes the whole body height to `face.resize(w, h)`; faces.js:402-405 hands it to the hero. Verified (ui-probe step 2, screenshot): body 537 px, hero canvas 521 px, 9 controls in 5 sections, 0 visible without scrolling (scrollHeight 888). faces.js does render hero plus sections at window density ... so the design (hero plus section controls) is what the face builds; the window squeezes it out." Fix: pass the hero's height, A3 and A6 agreeing what `resize` means.

**Coordinator**, 23:51:27, to A3: "`face.resize(w, h)` is the whole face area; the hero takes at most about 45 % of the height and the controls lay out below it and scroll".

**A3** (`log-A3.md`, part 2): "`face.resize(w, h)` is the whole face area: the hero gets the width minus padding and 42% of the height (60..340 px), sections below, body scrolls (checked: 700x537 gives a hero well under 45%)." A3's log does not mention the head.

**A6** (`log-A6.md`, "Device window: the face owns everything below the title bar"): `.wn-wbody` has no padding and the face fills it; `face.resize(w, h)` gets the whole body size after every size change. "Nothing in `windows.js` refers to `.hv-head` (the title bar ... are all mine)." Verified in Chromium: face element exactly body size (638x609, then 480x455), "the window contains no `.hv-head`", `face.resize` calls at each drag step. "A3's current faces already draw no head at window density." In part 2 A6 adds: "I did not re-check the screenshot after A3's change beyond the face filling the body (earlier run)."

**Coordinator**, 23:49:05: "the face fills the window body below the title bar and gets `resize` on every size change; no `.hv-head` inside a window".

**Scribe's note.** The three logs agree on one title bar and on hero plus controls. No log records a screenshot of the window Editor tab after A3's change; A3's wave-1 log says of the window screenshot, "produced but not inspected", and its wave-2 sampler screenshots are of the face and strip. The System Editor still uses `.hv-head` at face density for its double-click (Thread 6), which A6's change does not touch.

---

### Thread 31. Step View follow: default, drag deferral and the editor extras (A5, A6, A11, coordinator)

**Background** (Thread 8): A5 default follow-off; A6 calls `selectSection` on every host `'section'` event.

**A11, W1** (`log-A11.md`): `app.js` calls `view.selectSection(name)` on each host `'section'` event, "overriding A5's follow-off default, and step-view.js:664-670 `gotoSection` rebuilds even mid-drag. Verified in Chromium (ui-probe step 4): viewed section set to mainB, playhead crossed intro2 -> build, the view showed build." A11 proposed `app.js` call `selectSection` only on mount and view switch, and A5 guard `gotoSection` with `!st.dragging`. A11's V1: step-view.js uses none of `ed.group`, `ed.setFx`, `ed.setVariantBars` and "truncates `ed._undo` itself (step-view.js:245-248), which fails at the 200-entry limit".

**Coordinator.** Wave-1 ruling (23:43:46, Thread 23): follow defaults on. After A11 (23:51:27): "A5: defer following the playhead while a pointer gesture is active in the view ... The editor-extras finding is already resolved by A5's wave-2 hand-back". It did not adopt A11's mount-only proposal.

**A5, first change** (`log-A5.md`, "Wave 2"): follow starts true; `selectSection` "returns without effect when follow is off"; a click on a section number, `<`, `>` or the bar select "still moves the view directly and turns follow off". Side effect, in A5's words: "with follow on, the viewed bar changes every bar while playing; the owner turns follow off to edit one bar." `ed.group`, `ed.setFx` and `ed.setVariantBars` are all used: riser and impact cells editable with a bar-length select, a "Pattern length" select (1, 2, 4, 8, 16) that forks a shared variant first. The `ed._undo` truncation stays "only as a fallback". step-view-check 64.

**A5, second change** ("Wave 2, item 2"): a pointer gesture in a cell or lane cell sets `st.gesture`; meanwhile `selectSection(ref)` "stores the latest `ref` in `st.pendingSection` and returns, and the `update()` follow jump is skipped"; at the end of the gesture the pending section is applied "through `selectSection`, so follow still decides: if follow was turned off meanwhile, it is dropped". step-view-check 72 (section 6d).

**A6**: "W1. Per the coordinator, `app.js` keeps calling `selectSection` on `'section'` events; A5 defers during drags. (A11 suggested mount-only; flagged here in case the ruling changes.)"

**Coordinator verification**, 23:52:51: "Section events are deferred while a pointer gesture is active in the Step View and the latest pending section is applied when the gesture ends; a direct click on a section number is not deferred ... Browser behaviour with live audio not checked by anyone yet."

**Status.** Settled by ruling. Open: live-audio behaviour in a browser (A5 and the coordinator both say so); fx and pattern-length controls checked only in the Node fake DOM.

---

### Thread 32. Bypass in the Host and the document (A11, A1, A6)

**Raised by:** A11, E5 (`log-A11.md`): "windows.js:142-144 calls `d.ref.bypass(b)` on the live engine object (the contract says the UI does not touch the engine; the contract has no bypass call). T5: bypass true on track:bass:eq, then a structural commit: false; nothing about bypass in the saved document; `host.render` builds fresh processors, so export ignores bypass too." Fix: `host.bypass(id, b)` and `host.isBypassed(id)`, stored on the chain entry, send or master unit, restored on rebuild and render; A6 calls it.

**Dispatch:** coordinator, 23:51:27: A1 `host.bypass(deviceId, on)` "saved in the document and honoured by rebuild and export".

**A1** (`log-A1.md`, part 2, decision 4): `host.bypass(deviceId, on)` for inserts, sidechains, sends and master units; live through `ref.bypass`, stored as `bypass: true`, one undo snapshot, a `'bypass'` event, `host.isBypassed(id)`; `applyBypass` after every build; instruments and channels return false ("Mute is the channel's switch"). Self-check: stored and kept by a rebuild and by save/load, undoable; Chromium: "`bypass('master:sat', true)` survives a rebuilding commit while playing".

**A6.** Part 2: Bypass already prefers `host.bypass`/`isBypassed` when present and falls back otherwise; "`host.bypass` does not exist yet ... so only the fallback was run". Part 4: windows.js "no longer touches `ref`", redraws on `'bypass'` and `'audio'` events, the bridge forwards `bypass`, `isBypassed`, `audio` and `loadAudio`. Chromium: the button on `track:bass:eq` "is written to the document chain; after `host.loadDocument(host.document())` the host flag, the button and the stored `bypass` are all still on". Xvfb: in a child window the button shows the host state and an outside `host.bypass(id, false)` updates it within 400 ms.

**Coordinator**, 00:04:30: "`host.bypass`/`isBypassed` with a `'bypass'` event, stored, rebuilt, exported, undoable." 00:07:07 records A6's wiring.

**Traced only** (A6): the Re-add button inside a child window, the forwarding through the bridge for audio, and the native-dialog route.

---

### Thread 33. Sample loading across the Host, Project and shell (A1, A6)

**A6 to A1** (`log-A6.md`, "Audio files for the Sampler"): `HavantechnoShell.readFile(path, {base}) -> Promise<ArrayBuffer | null>`: `null` "for a missing or unreadable file, a path the shell refuses, or a URL"; main window only; audio extensions only; regular files up to 1 GiB; relative paths resolved against `opts.base`, "So a hostile project file cannot read other files through `audio[id].src`." A6 also proposed that A1 own `Project.pickAudio() -> Promise<File | null>` for the web. Verified in Electron under Xvfb (readFile with absolute and relative paths; `.txt`, missing `.wav` and `http://` URL return `null`).

**Coordinator**, 23:49:05: "A6 proposes `Project.pickAudio() -> Promise<File|null>` on A1's side for the web re-add; accepted, sent to A1 with its wave-2 part 2."

**A1** (`log-A1.md`, part 1): `host.reloadAudio({shell, base})`; URLs through `fetch`, other `src` values through `readFile(src, {base})`; "anything else (a bare file name on the web) is missing, without a fetch (a 404 would fail the browser check)"; it "never rejects; each missing file emits `'audio' {id, status: 'missing'}` and its track plays silent". A load whose file name matches a missing entry takes that entry's id. `Project.open({shell, host})` loads into the host with the project folder as `base`. To A6: call `Project.open({shell, host})`, and for an Electron drop use `HavantechnoShell.pathForFile(file)` "(Electron 32+ removed `File.path`; `webUtils.getPathForFile` in the preload gives it)". Part 2, decision 7: `Project.pickAudio({shell})`: web `<input type=file accept="audio/*,.wav,…">`, Electron `openFile({binary: true, filters: [Audio]})`, returning `{name, path, bytes}` or null.

**A6** (parts 3 and 4). `App.open` (button, Ctrl/Cmd+O) calls `Project.open({shell, host})` and reports "Opened song; 2 samples missing"; `preload.js` exposes `pathForFile` (`webUtils.getPathForFile`, `''` when unknown). Re-add: a sampler window shows "Re-add sample..." while its buffer is missing, and the Open/restore toast has "Re-add..." (`App.relinkMissing`), matching "the missing entry with the same file name (else the first missing one)". Chromium: bpm 111 saved, 140 set, reopened to 111; a track whose buffer was unloaded showed the button, a chosen WAV relinked it, "Sample restored". Xvfb: `pathForFile` returned `"/tmp/claude-0/t.wav"` for a file put in an input through CDP and `""` for a `new File(...)`.

**Coordinator**, 23:56:56 and 00:04:30: A6's runs are A6's; "Not verified by anyone: ... `pickAudio` in Electron or a real file input."

**Open (traced only, A6):** the Electron open of a project with an `audio` map (native dialog, `base` from the project folder, missing-sample toast); a drop's reload through `pathForFile`; the native-dialog path of `pickAudio`.

---

### Thread 34. The sampler entry point gap (A10 found, A4 built)

**A10 found it** while rewriting the README (`log-A10.md`, wave 2): "the Sampler section of `app/CONTRACT.md` (coordinator's file) says "Adding a sampler track: drop an audio file on the track list or use the track menu". Neither exists (log-A4.md and log-A6.md part 3 say the drop target is not built; `grep` finds no caller of `addSampler` in `app/ui/`). The README says so." It also corrected the plan's milestone 4 line, which said wave 2 adds "the sampler track UI", "which is not built".

**A6 had said the same** (`log-A6.md`, part 3): "no drop target exists yet; that is A4's".

**The dispatch.** `log-coordinator.md` has no entry dispatching A4 for this. A4's log opens it as "Task from the coordinator (A10's finding: the contract's "drop an audio file on the track list or use the track menu" was never built)".

**A4 built it** (`log-A4.md`, "Wave 2: sampler tracks in the System Editor"): a drop target on `.se-body` that takes only drags carrying `Files`, keeps audio files, says "Skipped n file(s) that are not audio" for the rest and calls `host.addSampler(file, {name, family: 'drums', pattern: '................'})` once per file; a "TRACKS" band with a "+ track" menu ("Sampler track from file…" through `Project.pickAudio`, and "Remove track", disabled for the 13 built-in tracks); remove inside `ed.group` with one undo entry; `editStep` now makes the section play a track it did not play, in one undo entry, so a fresh sampler is silent until its first step edit; `view.addFiles(list)`. To A6: an app-level Electron drop handler should call `view.addFiles(files)`. system-editor-check 76.

**Coordinator**, 00:16:43: verified, "A4's Chromium probe used synthetic drag events; a real OS drag, the real picker and the Electron path recording are not verified."

**Scribe's note.** A10's README was written at 00:08 to 00:12, before A4's work was verified at 00:16:43, so its sampler section says no entry point exists and its check table carries system-editor 50. No log records a later README edit (Thread 38).

---

### Thread 35. A7's level timing bug and A9's confirmation in a render (A11, A7, A9)

**A11, E2** (`log-A11.md`): "synths.js:111 `K.target(inst.out.gain, v, ctx.currentTime, 0.01)` drops `opts.at` ... Offline (T1): every kick.level write lands at t=0 ... so an export never has the break's kick at 0.6 or the build's clap at 0.7 (export differs from playback). Live: the change is applied up to the 120 ms lookahead early."

**A7** (`log-A7.md`, "Wave 2 follow-up"): confirmed; "`defineParams` passes `(name, v, opts)` to its callback, and `makeInst` dropped `opts`". `makeInst`'s setter takes `(name, v, o)` and uses `o.at` when numeric; the stab `hp` hook likewise; "Every instrument goes through `makeInst`, so the fix covers all of them." Live writes without `at` still apply now. Eight new checks (section 8) plus a mutation test: the old time-blind setter makes synths-check, per A7, "exits 1 with 5 FAILs (the level cases)", and 2 more with the stab hook reverted. "Not verified: ... the audible effect of the fix ... A9's render is where that shows."

**A9** (`log-A9.md`, "(4) Kick level change at bar 104"), kick solo, 50 to 150 Hz band, bars 100 to 111: "step -0.12 dB. Expected step -4.44 dB." In a scratch test: master chain on, chunked, "-0.54 dB step"; master units bypassed, chunked, "**-4.44 dB**"; single schedule "-4.40 dB". Conclusion: "the instrument level now changes at the scheduled bar, on both render paths ... With the master chain on, the glue compressor, saturator and limiter absorb most of the change at the output (about -0.5 dB)."

**Coordinator**, 00:14:16: "A7's level fix is confirmed in sound: the bar-104 kick drop measures −4.40 dB with the master bypassed, which is 20·log10(0.6)."

**Scribe's note.** The coordinator's wording leaves out A9's master-on figure (about -0.5 dB at the output). A9 ties that to the +3.8 LU finding (Thread 36). After A8 retuned the master (threshold -6, trim -4.2), no log re-measures the kick step with the master on.

---

### Thread 36. A8's master ceiling and loudness (A9, coordinator, A8)

**Raised by:** A9's full-song score (`log-A9.md`, "(3) Full song"): "Render, 200 bars: integrated **-6.82 LUFS** (+3.8 LU against the reference); sample peak -0.34 dBFS; **true peak +0.88 dBTP** (above full scale; the master chain is not holding the ceiling on this mix)." The reference over the same 200 bars is -10.65 LUFS, against O1's -10.7 for the whole file. A9 to the coordinator: "The master limiter is not holding a -1 dBTP ceiling on this mix. Not investigated further (owner decides)."

**Routed**, coordinator, 00:14:16: "Two findings for A8 (owner of processors.js, master chain): the full-song render is −6.82 LUFS against the reference's −10.65 (+3.8 LU) and its true peak is +0.88 dBTP, above full scale, so the master limiter is not holding a ceiling. These are independent of chunking (A9 saw the same levels with single scheduling)."

**A8** (`log-A8.md`, "Wave 2: master output stage"). Diagnosis: the limiter's `ceiling` "was a fixed output gain (-0.6 dB) after a DynamicsCompressorNode (threshold -2, ratio 20, attack 1 ms, knee 1). Nothing limited the output to the ceiling." Overshoot "about 3.5 dB" is "my arithmetic, not a measurement of the compressor"; the saturator "was not measured as a peak source. It is not ruled out." Changes: the limiter gains `clipOn` (default false) and `clip` (dBFS, default -0.5), a 4x oversampled hard clip that is an exact pass-through when off; "The `ceiling` param keeps its existing meaning (output trim, its automation unchanged). It is not a ceiling; `clip` is. The name is kept for compatibility." The master's limiter unit moves to threshold -6, `ceiling` (trim) -4.2, `clipOn` true, `clip` -0.5. Full 0:200: -6.82 / +0.88 dBTP before, -9.85 / -2.87 (trial 2), -10.75 LUFS / -3.77 dBTP final; mainA 16 bars -11.25 LUFS / -4.21 dBTP. "The clipper never engaged on this render, so the -3.77 dBTP is the compressor and output stage alone." The restored original line reproduced A9's before numbers exactly. processors-check 62 (new section 8).

**Coordinator**, 00:25:46: reproduced A8's mainA numbers (`lufs_integrated −11.25, true_peak_dbtp −4.21, sample_peak_dbfs −5.19`); "A8's full-song numbers (−10.75 LUFS, −3.77 dBTP; before −6.82 and +0.88) are A8's run." 

**Scribe's note.** A8's task was to change "the output stage, not the mix" (`log-A8.md`, "Wave 2"), so A9's wave-1 finding that the baseline intro is about 14 dB hot in the mids (R -9.8 against -23.9) was not the target. The coordinator's 23:35:49 question, "synth level versus EQ", has no decision recorded in wave 2.

---

### Thread 37. A6's Electron window fixes and the BPM field (A11 W3, W4, W5)

**A11** (`log-A11.md`): W3, "Electron: a retargeted child window keeps its original id in main.js ... Path: link Single, open track:kick (child K), select bass (K retargets to track:bass), switch link to Off, `Windows.open('track:kick')` -> no entry with that id -> `shell.openDeviceWindow('track:kick')` -> main.js:248-249 finds K and focuses it: kick never opens, the user sees bass." (traced, not run). W4, child windows never subscribe to `'document'`, so a child face refreshes on the 45-frame poll, "about 0.75 s with a stale `ref`". W5, BPM and swing fields push every keystroke: "typing 126 sets 40 (clamped "1"), then 40 ("12"), then 126".

**A6** (`log-A6.md`, part 2). W3: a new IPC `retargetDeviceWindow(newId)` re-keys the calling child in `deviceWins`; while reproducing it A6 "found a second cause: the main process opened every device window with the name `hv-device-<id>`, and `window.open` with a name that already exists navigates that window"; names are now unique (`hv-device-<n>-<id>`). Xvfb: after the fix a third window opens where before "2 windows, the child had been navigated". W4: `Windows.embed` calls `subscribe(h)`; a child rebuilt "once within 250 ms" of `host.loadDocument`. W5: apply on `change` or Enter, once per edit, with a `hold` (Thread 28).

**Coordinator**, 23:55:29: records the fixes and that "The Electron checks are A6's Xvfb runs, not reproduced here."

**Open:** A11's three unverified suspicions (Thread 25) remain unanswered.

---

### Thread 38. A10's README rewrite and the stale lines it flagged

**Request**, coordinator, 00:07:07: "A10 is asked to refresh app/README.md from the logs and the current counts." (A10's log: "rewrite the status parts of `app/README.md` for the current head, with sections on the sampler and on offline render and export, and update the three plan status lines I own if they are wrong.")

**A10's work** (`log-A10.md`, "Wave 2: README status rewrite at head 55f205d (2026-10-24, 00:08 to 00:12)"). It read the coordinator's, A1's to A9's and A11's logs, ran the checks (selfcheck 337, synths 74, processors 54, widgets 157, faces 1167, system-editor 50, step-view 72, browser-check 26, score selftest OK, a 16-bar mainA render in 5.94 s), and rewrote the README header, checks table, sampler section, "Offline render and export" section, status table and unverified list; it changed three plan lines (milestones 2, 3, 4), "`git diff` on the plan shows three changed lines and nothing else".

**Stale lines it flagged but did not own** (A10, "Not changed, for the coordinator"):
- Plan milestone 1 says save and open work "through the Electron dialogs", though "the native dialogs have not been run".
- Plan milestone 5b says "not started; scheduled for wave 2", though the sampler is in.
- The Sampler section of `app/CONTRACT.md` names a drop target and track menu that did not exist (Thread 34).
- `CLAUDE.md` "gives stale figures: selfcheck 263 (now 337), and "a full 200-bar offline render takes 3 to 4 minutes" (that is the pre-chunk figure)".
- `THIRD_PARTY.md` has no entries; A11's optional rows for Freeverb and mulberry32 not added.
- `.gitignore` already lists `tools/out/`, so "A9's open question on that is closed".

**Outcome.** No entry in `log-coordinator.md` or `log-A10.md` records any of those lines being corrected. The coordinator's last entry says "REPORT.md section 7 written". The README's counts predate A4's 76 and A8's 62.

---

### Thread 39. A1's smaller engine fixes (E6, E7, E8)

**A11:** E6, "Render ignores held paths ... hold stab.cutoff 3000 in mainA: playback keeps 3000, export applies mainA's 1500 at bar 40" (traced, not run). E7, "`forkVariant` can take a letter a section already names ... with intro2 naming a missing kick B (plays A by fallback), a fork from mainA becomes B and intro2 silently starts playing the fork. Not reachable with Song.document() today" (A5's `freeLetter` has the same rule). E8, "A refused setStep still pushes an undo snapshot ... `snap()` before the range check".

**Dispatch**, coordinator, 23:51:27: export honours held values ("what you hear is what exports"), a fork "never takes a letter the section already names", a refused `setStep` "adds no undo entry".

**A1** (`log-A1.md`, part 2, decisions 5 and 6): the render sequencer gets the held paths; `forkVariant` skips letters any section names for that track; the `setStep` index is checked (also NaN) "before the snapshot, and a missing variant is created only when the step is accepted". Self-check: `Host.render` keeps a held 3000 through mainA's set; a fork skips a named letter (B to C); refused `setStep` (999, -1, a missing variant at 16, an unknown track) leaves no undo entry and no variant. Coordinator, 00:04:30: "Export keeps held values; forks skip used letters; refused setStep leaves no trace."

**Not addressed.** A5's own `freeLetter` rule (step-view.js) is not mentioned in A5's log; whether it was changed is not traced.

---

## Verification record

Every count is the last one a log reports. "Coordinator" gives the entries in `log-coordinator.md` that record running the check, with times; "ran here" in those entries means the coordinator ran it and read the exit code. The coordinator's closing line (2026-10-24 00:25:46): "Final counts on one tree: selfcheck 337, synths 74, processors 62, widgets 157, faces 1167, system-editor 76, step-view 72, browser-check 26, score selftest OK." A rule the coordinator noted at 23:54:52 for REPORT.md: "run cross-module checks only on a snapshot" (two transient failures happened while another owner was mid-edit).

| Check | Owner | End of wave 1 | **Final (end of wave 2)** | Where the coordinator's log records running it |
|---|---|---|---|---|
| `node app/engine/selfcheck.js` | A1 | 263 | **337** (exit 0) | 23:49:05 (263); 23:54:52 (297, section 6 adds 34); 00:04:30 (337, section 7 adds 40); 00:25:46 (337) |
| `node tools/synths-check.js` | A7 | 36 | **74** | 23:49:05 (64, 28 sampler cases); 23:54:52 (74: sampler without own gain, scheduled `level` and stab `hp`, 8 checks, mutants fail) |
| `node tools/processors-check.js` | A8 | 54 | **62** | 23:54:52 (54); 00:25:46 (62, new section 8 for the clipper) |
| `node tools/widgets-check.js` | A2 | 134 | **157** | 23:54:52 (gesture phases on steps, `onGesture` on knob and slider) |
| `node tools/faces-check.js` | A3 | 982 | **1167** (25 definitions) | 23:54:52 (1167); 00:04:30 (FAILED 1 of 1167, the Delete step, Thread 27); 00:05:30 (OK 1167, exit 0) |
| `node tools/system-editor-check.js` | A4 | 40 | **76** | 23:54:52 (50, one commit per drag); 00:16:43 (76, drop target, "+ track" menu, remove, against the real Host, Widgets, Faces and Windows) |
| `node tools/step-view-check.js` | A5 | 53 | **72** | 23:49:05 (64, real Host); 23:52:51 (72, drag deferral); 23:54:52 (72) |
| `node tools/browser-check.js` | A10 | 26 | **26** (PASS, exit 0) | 23:49:05; 23:55:29; 23:56:56; 00:07:07; 00:16:43 |
| `python3 tools/score.py --selftest` | A9 | OK | **OK** | 00:25:46 (final counts line) |
| `node --check tools/render.js`; a 2-bar app render | A9 | exit 0 | exit 0 | 00:14:16 |
| `node tools/render.js --page app --sections mainA --bars 16` and `score.py ... --json` | A9, A8 | n/a | exit 0; 5.89 s; LUFS -11.25, true peak -4.21 dBTP | 00:04:30 (render, 5.89 s); 00:25:46 (score reproduced A8's figures) |
| A7, A5, A6 `node --check` on edited files | A5, A6, A7 | pass | pass | 23:49:05; 23:55:29; 23:56:56; 00:07:07 |

Not run by the coordinator (owners' own runs): A1's Chromium runs (sampler meter peak 0.68; chase while playing; render timings 4, 16, 48 bars); A6's Chromium and Electron-under-Xvfb runs (retarget, document subscription, BPM field, `readFile`, `pathForFile`, bypass in a child window, Open/Save, Re-add); A4's Chromium drop probe with synthetic `DragEvent`s; A9's wave-2 re-score (timings, equality to wave 1, 200-bar render, bar-104 kick step); A8's master trials; A11's measurements (`log-A11.md`, "Render performance") and probes (scratch scripts outside the repo). The coordinator re-ran some end results (the 16-bar mainA render and its score, A1's timings) and reports where they matched.

### Count differences in the logs

- **Selfcheck 193 / 263 / 297 / 337.** Growth, not contradiction: A1's section 5 (70), section 6 (34, sampler and audio map) and section 7 (40, chase, chunked render, undo per hold, bypass, fork, pickAudio). A7's wave-2 log notes "it was 263 when I ran it an hour ago, so A1 has added checks to its file since".
- **System-editor 43 / 40 / 50 / 76.** The 43 to 40 change is explained only by the coordinator ("A4 merging assertions"), not by A4's log. 50 is A4's drag change; 76 is the sampler entry point.
- **Browser-check 23 / 27 / 26.** The coordinator explained it at 23:43:46: the check changed between runs. Final 26 in every wave-2 run.
- **Processors 54 / 62; A10's README table.** A10's README run at 00:08 shows processors 54 and system-editor 50. Both were later raised (A8's 62 at 00:25:46, A4's 76 at 00:16:43), so the README's check table is out of date (Thread 38).
- **Synths 36 / 64 / 74.** 64 = 36 + A7's 28 sampler checks; 74 = 64 + 2 sampler checks + 8 scheduled-write checks. Consistent with A7's log.

## Left open after wave 2

Items the logs themselves mark unverified, not done, deferred or undecided, taken from each owner's not-done and not-verified lists (wave 1 and wave 2) and from the coordinator's entries. An item that a later log closes is left out and named under "Closed in wave 2". Where a ruling parked an item, the ruling is quoted.

**Closed in wave 2 (by the log named):** knob undo per gesture (A1, Thread 28); the Host extras written into the contract (coordinator, 23:54:52); riser and impact editing and pattern length in the Step View (A5); the repeated head at window density (A6, A3, Thread 30); the export slowness (A1, A9, Thread 26); instrument `level` at its scheduled time (A7, A9, Thread 35); jump chase (A1, Thread 27); bypass in the Host (A1, A6, Thread 32); `tools/out/` ignore (A10, "`.gitignore` already lists `tools/out/`"); the "sampler" (defined by the contract's Sampler section; built by A7, A1, A3, A4, A6).

**Coordinator** (`log-coordinator.md`):
- "Not verified by anyone: a full 200-bar export; `pickAudio` in Electron or a real file input" (00:04:30). A9 rendered 200 bars through `render.js` (88.79 s), but no log runs the Export WAV button on the full song.
- A4's sampler entry: "a real OS drag, the real picker and the Electron path recording are not verified" (00:16:43).
- "Traced only: the Electron open of a project with an audio map, and a dropped sample's reload" (23:56:56); Electron checks are A6's Xvfb runs, "not reproduced here" (23:55:29 and others).
- A9's open measurement questions (00:14:16): band-level method offset against O1, stab-step correlation, kick-glide fit on renders, build-section tempo octave.
- Browser behaviour of the Step View with live audio: "not checked by anyone yet" (23:52:51).
- The intro's mids (A9 wave 1) and "synth level versus EQ": no decision recorded.
- A3's hero numbers are its reading of the engine, "noted for A11" (23:21:41). A11 did not read the `facedefs.js` hero bodies (`log-A11.md`, "Read"), so the note has no reviewer.
- Stale lines the coordinator was told about by A10 (Thread 38): plan milestones 1 and 5b, the contract's sampler sentence, `CLAUDE.md` figures, `THIRD_PARTY.md`. No entry records fixing them. A11 D1 and D2 (contract wording) are likewise unanswered.

**A1** (`log-A1.md`):
- Not verified: Electron paths with a real file (`readFile` and `pathForFile` were run by A6 under Xvfb, so the native-dialog route is what is left), the web `<input type=file>` in a real browser (`pickAudio`, `Project.open`), `fetch` of a relative URL in the served app, the chunked render on a full 200-bar export in the app (only up to 48 bars), meters on Safari.
- Browsers without the file input's `cancel` event leave the Open promise pending on cancel (wave 1; not revisited).
- The editor extras (`group`, `setFx`, `setVariantBars`) were to move into `songdoc.js` "when someone owns it"; no wave-2 log says they moved, while `addTrack` and `removeTrack` went into `songdoc.js` in part 1.
- Decoding resamples to the decoder's rate (`doc.audio[id].sampleRate` is the decoded rate).
- Accepted limits: a knob click without a move leaves a no-op undo step; BPM and swing undo is not covered by any run (Thread 28).
- A11's E-items on `sequencer.js` and `songdoc.js` all have an A1 fix; the new engine behaviour has no listening check.

**A2** (`log-A2.md`): colour-blind and contrast checks of the marker ink not done; held ring (14 px) and step cells (down to 14 px wide) under the 24 px target, the WCAG 2.5.8 reading unverified; muted track-colour palette not implemented; touch, wheel, typed field, vertical slider jump and screen reader not run in a real browser; `onInput` can see unrounded values without `step`. Wave 2: "Not verified: A4's use of the phases (A4's file), real-browser touch."

**A3** (`log-A3.md`): hero numbers not measured against rendered audio, compressor live dot approximate; live meters exercised only with stubbed data or zeros; no touch, in-browser keyboard or screen-reader test; hero end-point dragging not built for the other heroes; stab hero shows a fixed example chord; `width.window` values are hints. Wave 2: the sampler handle drag "was tested in Node only, not with a real pointer"; a face built after a tweak treats the tweaked value as the song's (accepted by A1 as "by design"); toggles and selects other than mute and solo still hold on each change. The window-density screenshot after the change is not recorded.

**A4** (`log-A4.md`): not built: dragging the overview box, right-click variant cycling on section cells, editing the chord progression from the strip, arrow-key navigation inside the new "+ track" menu. Not verified: a real pointer drag of a System Editor step in a browser (`browser-check.js` does not drag one); the phase path against a widget that emits phases through the real chain end to end (only captured options and the fake DOM); a real OS drag, the real file picker, the Electron path recording; solo emulation when `host.solo` is missing; the System Editor's layout in a browser (no log records an inspection; the A4 probe screenshot shows the TRACKS band and sampler row only). A11's S2 (edits use the transport's bar and section at click time) is unanswered.

**A5** (`log-A5.md`): not built: drag across cells to paint, drag a cell's edge for length, double-click inspector, right-click menu, marquee, copy/paste, 2-bar view, Alt-drag lane ramp, baseline click, Rnd/Clr/Copy buttons; lane order, collapsed state, scope and added lanes are in memory only; touch, keyboard flows in a real browser and the narrow layout unchecked. Wave 2: "Not checked: the follow behaviour while real audio plays in a browser", the fx and pattern-length controls in a real browser, the drag deferral with real section events during playback. Whether `freeLetter` in step-view.js was changed to match A1's fork rule (A11 E7) is not recorded.

**A6** (`log-A6.md`): not tested: native open and save dialogs, window-bounds persistence across launches, macOS child-window behaviour, Windows and Mac packaging. Placeholders: Mixer drawer, A/B, preset menus. Not built: screenset memory, a cap or soft warning on window count, "open window when an insert is added", a quieter position readout (`role=timer`). Tab is taken for the view switch "until the owner decides". Traced only in wave 2: the Electron open of a project with an `audio` map, the Re-add button inside a child window, the relink toast after an Electron Open, a drop reloading through `pathForFile`. A11's W2 screenshot after A3's change was not re-checked. A6 flagged that A11 suggested a mount-only `selectSection` "in case the ruling changes". A held `bpm` shows in "Re-enable arranged (n)" and releasing it hands the tempo back to the arrangement.

**A7** (`log-A7.md`):
- Parked by the coordinator (23:43:46): the B0 bar (stays C#1 with the TODO, "Not a wave-2 item"), the lowpass restore at bar 136 vs 128 (keep 136), `choke` for the hats ("It arrives with the sampler ... the hats can wait").
- Not done: sub per-bar notes, kick `drive` 0 vs 0.45 unrendered, no `drivePos`, sampler `reverse` (accepted, does nothing).
- Not verified: any audible V2 value; a real `AudioBuffer` decode in A7's checks; real-browser `playbackRate` as an AudioParam; the choke fade's `gain.value` reading; stab `cutoff` ramps do not change the sound mid-note.
- A9's wave-1 finding that the V2 sub duck is 14 to 15 dB too deep at 100 to 150 ms: no wave-2 log addresses it.

**A8** (`log-A8.md`): exponential IR envelope and IR buffer-swap click, Dattorro, sidechain `offset`, S2's offline acceptance tests, Freeverb CPU (92 nodes) and gain matching against the IR, Freeverb tail unrendered; band-limited widener's song value is A7's; chorus `base` keeps the 1.5x ratio; the Q-in-dB reading is "recalled". Wave 2: the AudioWorklet true-peak limiter is not built; the clip is "a safety net, not a limiter"; the saturator was not measured as a peak source; intersample overshoot after the clipper is not bounded; "Nothing was listened to"; whether the perceived balance is right after a roughly 4 dB level change "is unverified"; the mainA window sits 1.0 LU below its reference section.

**A9** (`log-A9.md`): seven wave-1 items (band-level offset of +1.1 to +2.0 dB against O1; stab-step correlation 0.11/0.04/0.48/0.19 against O1's 0.47 to 0.60; kick glide "UNRELIABLE" on renders; tempo octave at 63 BPM; same-seed renders differing by up to 15 LSB; glide low band 253 against 264 Hz; sub duck at 40 and 60 ms) are carried unchanged ("Open (carried from wave 1)"). Wave 2: chunked renders are not bit-identical to wave 1 (up to 39 LSB), cause unverified; `tools/README.md` "to be updated with `--solo` and the wave-2 timings" (no later entry says it was); no re-score after A8's retune is in A9's log. Not verified at all: any listening result; the BS.1770 Annex 2 true-peak filter; libebur128 equality beyond two ffmpeg cross-checks.

**A10** (`log-A10.md`): Electron not launched by A10; the README's status table is derived from files and logs at head 55f205d and carries pre-A4 and pre-A8 counts and a "no sampler entry point" statement that A4's work (verified 00:16:43) has since made wrong; the stale lines in Thread 38. Which step-cell selector the passing browser-check uses is not recorded.

**A11** (`log-A11.md`): three unverified suspicions (two Electron Single-link opens before registration; listeners left by a crashed child; `restoreAsync` preferring app-data over a newer `localStorage`); "Nothing run in Electron by me"; W3 and W4 are code traces; A11 reviewed head 6ab1499, before A1's and A3's wave-2 edits, and did not rerun against the later `host.js`; the optional provenance rows for `THIRD_PARTY.md`.

## Inconsistencies noticed in the logs, reconciled

The scribe's wave-1 list, set against the coordinator's entry of 2026-10-23 23:43:46 ("DISCUSSION.md compiled; rulings on what the scribe found") and later logs. "Answered" means the coordinator or a later log gives a reason or a ruling; it does not mean the reason was checked by anyone else.

| # | Wave-1 inconsistency | Coordinator's answer (23:43:46) and later logs | Status |
|---|---|---|---|
| 1 | The coordinator's 23:14:41 "interface mismatch" call on A4's red check, against A4's fake-DOM diagnosis | Coordinator: "A4's log and my 23:23 entry show it was the check's fake DOM." | Answered |
| 2a | Browser-check counts 23, 27, 26 and "10 checks" against "10 failed checks" | Check changed between runs; "10 checks" "meant 10 failed checks on the first tree". Wave-2 runs all report 26. | Answered |
| 2b | System-editor 43 against 40 | Coordinator: "A4 merging assertions in its revision; A4's log does not say so, and I did not ask. Noted, not reopened." | Answered by the coordinator only; A4's log is silent |
| 3 | A3's 15 new params against 14 named | "Count error, no effect." | Answered |
| 4 | A9's "consistent" with A6's over 100 s for 48 bars | Coordinator: A9's rate gives about 50 s; A6's number "may include page start, the tail and WAV encoding". A11 later measured 111.6 s for 48 bars as shipped and showed cost is about quadratic (Thread 26). | Answered; the coordinator's guess was superseded by A11's measurement |
| 5 | A9 "No `.gitignore` entry was added" against the coordinator "already git-ignored" | Coordinator: ignored by the coordinator earlier; "Both true." A10 confirms `tools/out/` is listed. | Answered |
| 6a | A5 follow-off default against A6's section wiring | Ruled: follow defaults on; A5 flipped it; A11 then found the drag problem and A5 added deferral (Thread 31). | Answered |
| 6b | A6 says both views draw a ruler; A5's log does not mention one | Coordinator: "both views draw their own ruler (A6's reading). Acceptable for now". A5's log still does not say it draws one. | Ruled; A5's side not confirmed in any log |
| 7 | `review-A11.md` in BRIEF against `log-A11.md` | "The log name stands; BRIEF.md is amended by this note." | Answered |
| 8a | Face count 23 against 24 | Settled at 24 in wave 1 (coordinator 23:21:41); the sampler face makes 25 (A3, wave 2). | Answered |
| 8b | F-S4 section reference; hat 3.5 kHz default; ffmpeg path (contract text) | Not addressed in the 23:43:46 entry or later entries. | Still open (no log shows the contract text corrected) |
| 9 | A5's log still citing 193 checks and the `ed._undo` workaround | A5's wave-2 log supersedes it: `ed.group`, `ed.setFx`, `ed.setVariantBars` are used. A11 had found them unused (V1); A5's log now states they are. | Answered |

Also answered by the coordinator in that entry: the four open decisions of A7 (Thread 23) and A6's repeated-head note (Thread 30).

### Still inconsistent or unreconciled after wave 2

1. **Bare knob click and undo.** A1: "A click without a move leaves an undo step that changes nothing". A2: `onHold` "fires once per gesture, on the first actual value change (not on a bare click)". A11's audit: hold "before the first value change". No log runs a bare click (Thread 28).
2. **BPM and swing undo.** A1: they "have no hold, so they stay outside undo". A6 added `hold('bpm')` and `hold('swing')` (Thread 28). The logs do not show whether BPM edits are now undoable, or which log was written first.
3. **The kick step through the master.** The coordinator's 00:14:16 entry gives A9's master-bypassed -4.40 dB and omits A9's master-on step of about -0.5 dB, which A9 says the master chain absorbs. After A8's retune nobody re-measured it (Thread 35).
4. **Full-song export.** A9 rendered 200 bars in 88.79 s through `render.js`; the coordinator and A1 still list a full-song export in the app as unverified (Thread 26).
5. **Faces-check `sampler.gain` failure.** A1 attributes it to A3's layout meeting the removal of `gain`; the coordinator calls it "a race with A3's edit" (Thread 24).
6. **Window head.** A6 states "A3's current faces already draw no head at window density"; A3's log never says it removed the head, and no log shows a window screenshot after the change (Thread 30).
7. **A10's README and plan lines.** The README's counts and its "no sampler entry point" statement are older than A4's and A8's final work; the plan, `CONTRACT.md` and `CLAUDE.md` lines A10 flagged have no recorded correction (Thread 38).
8. **Contract text.** F-S4 section 6, the 3.5 kHz hat default and the ffmpeg path (reconciliation row 8b); A11's D1 and D2.
9. **A4's pointer fallback and A2's `'end'` advice.** A4 wrote it would re-run against A2's real phases and remove the fallback "if wanted"; no log says that happened, and A4's log does not mention A2's advice to write on `'end'` only when the velocity differs from `'start'` (Thread 29).
10. **Step View follow.** A11's mount-only proposal was not adopted; A6 recorded it "in case the ruling changes". With follow on, the viewed bar changes every bar while playing (A5), and no log tests this with live audio.
