# Build Crew discussion (wave 1 transcript)

Compiled 2026-10-23 23:39 UTC by the scribe from the twelve files in `transcripts/`: `log-A1.md` to `log-A11.md` and `log-coordinator.md`. The agents did not talk to each other directly. They wrote questions and answers in their own logs (`**To A3:**`, `**From A3 to A2:**`), read each other's logs, and the coordinator relayed some requests and ruled on some. Nothing here is a new exchange: each statement is attributed to the agent and the log section it came from, and where a log's own wording matters it is quoted. Where the logs do not say, this file says "not in any log". Read `BRIEF.md` and `app/CONTRACT.md` for the task and the interfaces; `REPORT.md` is the coordinator's and is not written yet.

How to read the citations: `log-A5.md, "Questions and requests"` means that file and that heading. Quoted text is copied from the log. Paraphrase is marked by the absence of quote marks. A line headed "Scribe's note" is the scribe's own observation from comparing two logs; it is not something an agent said.

Timing: only `log-coordinator.md` (every entry) and `log-A10.md` (a few) carry clock times. The other logs have none, so threads are ordered by when they start according to the logs' internal order and the coordinator's timestamps, and that order is approximate. The coordinator's entries run from 23:14:41 to 23:35:49 UTC.

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

This file covers wave 1, plus the point where wave 2 opened (A11 dispatched at 23:31:28) and the one partial A11 log that exists. The coordinator's last wave-1 entry (23:35:49) says wave 1 is complete: A1 to A10 handed back and every check green.

## Threads

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

---

### Thread 3. SongDoc editor operations A5 asked A1 for

**Raised by:** A5, `log-A5.md`, "Questions and requests": "**To A1 (songdoc owner):** (a) an `ed.group(fn)` or `ed.edit(fn)` that takes one undo snapshot for several operations would remove my access to `ed._undo`; (b) `ed.setFx(section, index|null, patch)` so the riser and impact rows can be edited; (c) `ed.setVariantBars(track, variant, bars)` so a new variant can be longer than one bar (the lead's 4-bar loop is the case)."

**Why A5 needed them.** A5, decision 4b: `setStepInSection` on a shared variant takes three snapshots (fork, setPlay, setStep), so "`group()` in my write path truncates `ed._undo` to the first of them, so one gesture is one undo step (it reads the editor's `_undo` array, guarded: if it is missing nothing is collapsed)." Decision 8: the riser and impact rows are read-only because "songdoc's editor has no fx write".

**Relayed.** Coordinator, 23:16:29: "**To A1:** A5 asks for ed.group(fn) to collapse undo steps, ed.setFx, and a way to set a variant's bar count."

**A1's answer.** `log-A1.md`, decision 8: "`songdoc.js` is unowned this wave, so the three operations A5 asked for live on the editor the Host hands out (`host.editor()`), added in `host.js` by `extendEditor`, each with one undo snapshot like the built-in operations." `ed.group(fn)` runs several operations as one undo step and returns `fn`'s result; `ed.setFx(section, index|null, patch|null)` adds (null index), removes (null patch) or merges a hit; `ed.setVariantBars(track, variant, bars, fill)` takes 1..64 bars, `fill` `'repeat'` (default) or `'empty'`, shrinking truncates. A1 to A5: "Use `ed.group` instead of touching `ed._undo`." A1 adds that the operations "should move into `songdoc.js` when someone owns it; the Host keeps the same names." The self-check covers `group`, `setFx` (+1 impact hit) and `setVariantBars` (`log-A1.md`, "Shipped").

**Status.** The operations exist and A1's self-check passes them. `log-A5.md` was not updated after A1's answer: its "Shipped" and "Not done" still describe the `ed._undo` workaround and read-only riser and impact rows. Whether `step-view.js` now calls `ed.group`, `ed.setFx` or `ed.setVariantBars`: not in any log. A5's log lists A1 among the logs it read before finishing, and its "Verification run" cites a self-check count of 193, which is the count before A1's additions.

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

---

### Thread 9. Project save/open, the shell API and autosave events (A1, A6)

**A1's side.** `log-A1.md`, decision 9: Electron `saveFile({name, text, filters})` and `openFile({filters})` "both resolving null on cancel, as A6's `preload.js` and `main.js` now define them". Autosave writes `localStorage` synchronously (so `restore()` stays synchronous as the contract says) and mirrors to `shell.writeAppData(...)`; `Project.restoreAsync()` reads `shell.readAppData` first. "**To A6:** your shell API matches what `project.js` calls (`saveFile({name, text, filters})` → `{name, path}|null`, `openFile({filters})` → `{name, path, text}|null`, `appDataPath`, `readAppData`, `writeAppData`)."

**A6's side.** Decision 10 lists the same IPC; "**From A6 to A1:** ... Shell API matches `project.js`." Decision 2: after Start the autosave is read (`Project.restoreAsync`, else `restore`) and loaded with `host.loadDocument`; "`'document'` events with `reason: 'start'` never schedule an autosave (otherwise the default song could overwrite the saved one)". Decision 3: autosave is debounced 1.5 s on `'document'` and on `'param'` with `source: 'ui'`, "knob moves are stored in the document by Host but do not emit `'document'`". That uses A1's decisions 3 and 4 (knob values written into the document; `'param'` events with `source`).

**Verified, by whom.** A1: Save and autosave PASS in A10's check (`Guidance-style.havantechno.json`, 11287 bytes; key `havantechno.autosave`); not verified: Electron save/open/app-data, the web `<input type=file>` open path in a real browser. A6: Ctrl+S download, autosave then reload restoring bpm 120, and under Xvfb a `writeAppData`/`readAppData` round trip; not tested: "the native open/save dialogs".

**Settled.** Interfaces agree on both sides. Open: native dialogs and the web Open path have no recorded run (see "Left open").

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

---

### Thread 21. The face head repeated in the window (A6 to A3)

**A6 to A3**, `log-A6.md`, "Answers to messages": "Note: in the `window` density the face draws its own head (glyph and name), which repeats the window title bar; your call whether to drop it at that density." A3's log, which carries "**To A6:**" notes on `Faces.fallback` and `face.resize(w,h)` for windows, has no reply to this one.

**Status.** Unanswered in the logs. Owner A3, with A6 affected. A related fact: the head is also what A4 and the browser check double-click (Threads 6 and 12), so dropping it at window density would not affect those, which use the strip and face densities (scribe's reading; no log says so).

---

### Thread 22. Wave 2 opens: A11's integration review

**Coordinator**, 23:31:28: "A11 (Opus) started on head 6ab1499 while A9 (render and score loop) and A10 (browser-check selector fix) finish wave 1; A11 reads app/engine, app/ui, the shell and the checks, not A9's tools." Brief, in order: contract mismatches; real bugs on real paths (edit while playing, forks across sections, save/load round trip, undo after knob and step edits, link modes in Electron versus in-page, voice leaks, lock restore, fake-DOM blind spots); the render slowness (Thread 20); the hold/release audit that gates A1's undo-per-gesture change (Thread 13); `THIRD_PARTY.md` hygiene. "A11 writes only log-A11.md and commits nothing."

**What A11 has logged.** `log-A11.md` holds the reading list and a table of eight checks run with exit codes read directly (see the verification table). It records no findings yet. The log ends after the checks, with a note on the 27-check count (Thread 12). Everything else the brief asked of A11 is therefore not traced.

**Other logs and A11.** A9 names A11 as the owner of the render timing ("A11 is measuring"). No other log is addressed to A11.

---

## Verification record

Every count below is the last one a log reports. "Coordinator" gives the entry in `log-coordinator.md` that records running the check; "ran here" means the coordinator says it ran it itself and read the exit code. Where the coordinator's entry only lists the check in a summary, that is said.

| Check | Owner | Final count | Where the coordinator's log records running it | Other runs and notes |
|---|---|---|---|---|
| `node app/engine/selfcheck.js` | A1 (section 5; sections 1 to 4 pre-existing) | **263** (OK, exit 0) | 23:14:41: 193 OK, after A7. 23:21:41: 263, "sections 1–5; section 5 is A1's Host and Project", exit 0. Listed in the 23:35:49 summary ("selfcheck 263"). | Count history: 193 baseline (A5, A7, A10 and A8's first run) to 263 after A1's 70 checks (A1, A8, A3, A11 at 263). Contract says "193 or more"; commit e04a0b2 for A1 |
| `node tools/synths-check.js` | A7 | 36 | 23:14:41 (36 OK); 23:21:41 table (36, exit 0) | Includes equivalence of the 13 synths' default call logs with the archived `synths.js` (1305 calls) |
| `node tools/processors-check.js` | A8 | 54 | 23:21:41 table (54, exit 0) | New this wave; A8's mutation test failed as it should; no sound verified |
| `node tools/widgets-check.js` | A2 | 134 | 23:15:45 ("OK: 134 checks passed", exit 0); 23:21:41 table | Fake DOM; real-browser page checked by A2 separately, not committed |
| `node tools/faces-check.js` | A3 | 982 (lint 0 problems) | 23:21:41 table: "49 real devices rendered, Faces.lint 0 problems" | 24 face definitions; heroes drawn: 72 |
| `node tools/system-editor-check.js` | A4 | **40** (earlier 43 against fake modules) | 23:14:41 fail against real windows.js (exit 1); 23:21:41 fail "step edit forked kick A for the intro..." (exit 1); 23:23:56 OK 40, exit 0, "host=real Host.create(), widgets=real, faces=real, windows=real" | Commit 584a534 cited 43; the coordinator's 23:23:56 entry corrects it |
| `node tools/step-view-check.js` | A5 | 53 (real Host); 55 with `SV_FAKE_HOST=1` | 23:16:29 (exit 0, 53); 23:21:41 table (53) | The 55 count is A5's alone, not run by the coordinator |
| `node tools/browser-check.js` | A10 | **26** (PASS, exit 0) | 23:16:01 (A10's last run FAIL, 10 failed checks); 23:30:06 (exit 1, 1 failed, "22 of 23" pass, 0 page errors, 0 console errors); 23:34:15 (exit 0, `RESULT: PASS (26 checks)`) | A10's two final runs: exit 0, 26. A11 saw 27 checks, 26 pass 1 fail (before the final fix). Commit f56ce74 |
| `node --check` on host.js, project.js, selfcheck.js, processors.js, processors-check.js, app.js | A1, A8, A6 | pass | 23:21:41 | Also run on A6's other files at 23:30:06 |
| `node --check tools/render.js`, `py_compile tools/score.py` | A9 | exit 0 | 23:35:49 | |
| `python3 tools/score.py --selftest` | A9 | "OK: all selftest checks passed" (7 items listed in `log-A9.md`) | 23:35:49 | K-weighting constants, sine loudness, correlation, tempo, kick glide, sub duck |
| `node tools/render.js --page app --sections intro --bars 2` | A9 | exit 0, 2 bars in 0.32 s | 23:35:49 | Wrote `tools/out/app-intro-0-2.wav` |
| `python3 tools/score.py tools/out/app-intro-0-2-v2.wav --json` | A9 | exit 0 | 23:35:49 | |
| A6's own runs: `node --check` on 5 files; `tools/serve.js` headers; Playwright run of the app; Electron under Xvfb with Playwright's `_electron` | A6 | no count | 23:30:06: `node --check` re-run; the rest "A6's report, not reproduced by me" | Link modes, pin, tile, cascade, V, Esc, undo, child windows, app-data round trip are A6's report only |
| A1's real-Chromium scratch run (meters, rebuild while playing, 4-bar render) | A1 | no count | not recorded | Script not in the repo |
| A9's reference comparisons (loudness within 0.05 LU, true peak within 0.01 dB, kick glide, duck) | A9 | no count | 23:35:49: "A9's numbers from its log, not reproduced here: the reference file is not in the repo" | |
| A11's eight-command table | A11 | 263 / 36 / 54 / 134 / 982 / 40 / 53 / browser-check 26 pass 1 fail | 23:31:28 only dispatches A11; A11's run is in `log-A11.md`, "Checks run" | Head 6ab1499; the working tree had uncommitted edits to browser-check.js, render.js, score.py |

The 23:35:49 wave-complete line lists: "selfcheck 263, synths 36, processors 54, widgets 134, faces 982, system-editor 40, step-view 53, browser-check 26, score selftest". For selfcheck, synths, processors, widgets, faces, system-editor, step-view and browser-check, the earlier entries above record the run; the 23:35:49 line is a summary, not a re-run of those.

### Count differences in the logs

- **Selfcheck 193 / 263.** Not a contradiction: A1's section 5 added 70 checks. Logs written before that report 193 (A5, A7, A10); logs written after report 263 (A8, A3, A11, coordinator).
- **System-editor 43 / 40.** Corrected by the coordinator at 23:23:56 (Thread 7).
- **Browser-check 23 / 27 / 26.** The coordinator at 23:30:06 says 23 checks (22 pass). A11 says 27 (26 pass). A10 and the coordinator at 23:34:15 say 26 (all pass). Not reconciled (Thread 12).
- **Browser-check "10 checks".** The coordinator at 23:16:01 writes "FAIL, 10 checks"; A10 wrote "10 failed check(s)" (Thread 11).
- **Faces 23 / 24.** Settled at 24 (Thread 1).
- **Contract `tools/out` ignore.** A9 (`log-A9.md`, "Findings"): "`tools/out/` should be ignored by git ... No `.gitignore` entry was added; the decision is yours." Coordinator, 23:35:49: "tools/out/ was already git-ignored." Who added the entry is not in any log.

## Left open for wave 2

Items the logs themselves mark unverified, not done, deferred or undecided. Owner and log are given; where a decision is the coordinator's, that is said.

**Coordinator's own list** (`log-coordinator.md`):
- A1: add the accepted Host additions to `app/CONTRACT.md` (23:21:41).
- A1: knob undo, one snapshot per gesture on the first `hold(path)`, gated on A11's hold/release audit (23:21:41; Thread 13).
- A6 and engine owners: full-song offline render takes 3 to 4 minutes; Export WAV completed only with the render limited to 4 bars (23:30:06 and 23:35:49; Thread 20). A11 is measuring.
- A8: exponential IR envelope and the IR buffer-swap click, Dattorro, sidechain `offset`; Freeverb is a native approximation not gain-matched to the IR (23:21:41).
- A7: V2 sub duck 14 to 15 dB too deep at 100 to 150 ms (23:35:49; Thread 19).
- Owner undecided: the baseline intro about 14 dB hot in the mids, "synth level versus EQ", after A11 (23:35:49).
- A9: the unresolved measurement questions below (23:35:49).
- A3: hero numbers are A3's reading of the engine, not measurements, "noted for A11" (23:21:41).
- "Then wave-2 owner fixes and the sampler" (23:35:49). "The sampler" is not defined in any log. The root `CLAUDE.md` now mentions sampler tracks under decision D8 in `prd.md`; that is a pointer, not something a log says about it.
- A11's findings are pending; `log-A11.md` has none yet.

**A1** (`log-A1.md`, "Verification" and decisions):
- Not verified: Electron save/open/app-data paths, the web `<input type=file>` open path in a real browser, meters on Safari (`getByteTimeDomainData` fallback).
- Browsers without the file input's `cancel` event leave the Open promise pending on cancel.
- Editor operations (`group`, `setFx`, `setVariantBars`) to move into `songdoc.js` when someone owns it (decision 8).
- An undo of a later step edit can put back an older knob value (decision 3).

**A2** (`log-A2.md`, "Unfinished / unverified"):
- Colour-blind and contrast checks of the marker ink against every family wash: not done.
- The held ring marker (14 px) and step cells (down to 14 px wide) are under the 24 px target; the WCAG 2.5.8 spacing reading is "not verified".
- Muted track-colour palette (F-S4 section 9) not implemented.
- Not tested in a real browser: touch, wheel, typed field, vertical slider jump, screen-reader output. The wheel-on-focused-control choice is "not verified in a real browser" (decision 3; the coordinator ruled it stands, 23:15:45).
- `Widgets.knob` rounds nothing without `step`, so values like 75.00000000000003 reach `onInput`.

**A3** (`log-A3.md`, "Unfinished / unverified"):
- Hero numbers not measured against rendered audio; the compressor live dot is approximate.
- Live meters exercised only with stubbed data and with zeros in a browser.
- No touch, in-browser keyboard or screen-reader test of faces; window-density screenshot not inspected.
- Hero end-point dragging not built; stab hero shows a fixed example chord; `width.window` values are hints.
- No reply to A6's note on the repeated head at window density (Thread 21).

**A4** (`log-A4.md`, "Not done / unverified"):
- Dragging the overview box, right-click variant cycling on section cells, and editing the chord progression from the strip are not built.
- Solo emulation (if `host.solo` is missing) is untested against the real engine.
- The view's layout, spacing and injected CSS were unseen in a browser when A4 wrote. I found no log entry recording a later inspection of the System Editor layout; A6's screenshots cover the frame and windows.
- Whether the editor now reads `host.transport.loopSection` (Thread 2): not in the log.

**A5** (`log-A5.md`, "Not done"):
- Drag across cells to paint, drag a cell's edge for length, double-click inspector, right-click menu, marquee, copy/paste, 2-bar view, Alt-drag lane ramp, baseline click, Rnd/Clr/Copy buttons.
- Lane order, collapsed state, scope and added lanes are in memory only.
- Not checked: touch, keyboard flows in a real browser, the narrow layout. (The System Editor / Step View switch was run later by A6 and the browser check.)
- Riser and impact rows read-only; whether they use `ed.setFx` is not in the log (Thread 3).

**A6** (`log-A6.md`, "Known problems and not done" and "Verification"):
- Not tested: native open/save dialogs, window-bounds persistence across launches, macOS child-window behaviour, Windows/Mac packaging.
- Mixer drawer, A/B and preset menus are disabled placeholders.
- No screenset memory, no cap or soft warning on window count (F-O1's soft warning at 8), no "open window when an insert is added" preference.
- The position readout is a `role=timer` updating every step and may be announced often.
- Tab is taken for the view switch as the contract says; "keyboard users move focus with Shift+Tab or Alt+1/2 until the owner decides".
- Step View follows the playhead while playing (Thread 8).

**A7** (`log-A7.md`, "Not done" and "For others"; no coordinator ruling recorded):
- Sub per-bar notes and the B0 bar (TODO in `song.js`); sub-attack reading; mainB lowpass restore at bar 136 vs 128; `choke` flag; kick `drive` 0 vs 0.45 unrendered; no `drivePos`.
- No audible result for any V2 value.

**A8** (`log-A8.md`, "Not done"):
- Exponential IR envelope, IR buffer-swap click, Dattorro, sidechain `offset`.
- Freeverb is not Freeverb exactly (biquad damping) and not gain-matched to the IR; its tail has not been rendered; CPU of the 92-node network not measured.
- S2's offline acceptance tests (RT60 arrival within 15%, tail slope, L/R correlation) not run.
- Band-limited widener at about 150 Hz: processor supports it, but the song value is A7's, so nothing changes until `song.js` sets it.
- Chorus `base` keeps the 1.5x ratio, so `base` 3.5 gives 3.5 and 5.25 ms, not the Juno analysis's equal lines.
- The Q-in-dB reading for the widener's high-pass is "recalled", not rechecked.
- Engine-side persistence of the new params through `Host.setParam` is a reading of `host.js`, not a run.

**A9** (`log-A9.md`, "Open items" and "Not verified at all"):
1. Band levels run +1.1 to +2.0 dB (R) above O1 M9 in every section; cause unidentified, so absolute values must not be compared with O1's table.
2. Stab-step correlation on the reference is 0.11 / 0.04 / 0.48 / 0.19 against O1 M7's 0.47 to 0.60; "Treat O1's stab figures as unverified".
3. Kick glide fit is "UNRELIABLE on every render tried"; works on the reference.
4. Tempo octave: reference bars 24 to 40 read 63.05 BPM.
5. Same-seed renders differ by up to 15 LSB from an unisolated source.
6. Glide low band in the reference: 253 Hz against O1's 264 Hz.
7. Sub duck at 40 and 60 ms differs from O1 M4 by 8 and 2 dB.
- Not verified at all: any listening result; the BS.1770 Annex 2 true-peak filter (A9 uses scipy `resample_poly`); libebur128 equality beyond two ffmpeg `ebur128` cross-checks.

**A10** (`log-A10.md`, "Unfinished"):
- Electron has not been launched by A10 (A6 launched it under Xvfb).
- The `app/README.md` status table "comes from the files on disk, not from owner logs" and A10 asks that each row be corrected when a log says otherwise. A10's last entry says the snapshot and status row were updated to match the final run; whether every other row was checked against the logs is not recorded.
- Which step-cell selector the passing run uses (Thread 11): not in the log.

**A11** (`log-A11.md`): the whole review (Thread 22).

## Inconsistencies noticed in the logs

Listed so the coordinator can decide which need a correction in `REPORT.md`; each is explained in the thread named.

1. The coordinator's 23:14:41 diagnosis of A4's red check ("interface mismatch between A4's double-click hook and A6's Windows.open") against A4's finding that the cause was the fake DOM, and the coordinator's 23:23:56 "nothing for A6" (Threads 6 and 7).
2. Check counts: system-editor 43 and 40; browser-check 23, 27 and 26; "10 checks" and "10 failed checks" (Threads 7 and 12, verification table).
3. A3's "15" new params against 14 named by A7, A8 and A3's own reply (Thread 14).
4. A9's "consistent with A6's report of more than 100 s for 48 bars" against 48 bars at about 1 s per bar (Thread 20).
5. A9 ("no `.gitignore` entry was added") against the coordinator ("already git-ignored") for `tools/out/` (verification section).
6. A5's follow-off default against A6's section wiring; A6's statement that both views draw a ruler against A5's log (Thread 8).
7. `BRIEF.md` names `review-A11.md`; the coordinator and the file on disk use `log-A11.md` (crew table).
8. Contract references the logs found wrong: 23 faces, F-S4 section 6, 3.5 kHz hat default, the ffmpeg path (Thread 1).
9. A5's log still cites 193 selfcheck checks and its `ed._undo` workaround after A1's answer; it was not revised (Thread 3).
