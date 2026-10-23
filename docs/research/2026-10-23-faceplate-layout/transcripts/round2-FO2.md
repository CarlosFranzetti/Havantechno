# F-O2: Tech lead — round 2
Agent model: Opus. Date: 2026-10-23.

I read all eleven other round-1 files in full and re-checked several code claims against the repo. `studio/` is now a symlink to `olde Havantechno dub studio/`, so the paths are the same. I ran no web searches this round. Every cost below is a **rough estimate in developer-days for one person who knows the code, ±50%, not measured**. It sits on top of the shared base from my round-1 file: device list, face registry, generic face, widgets, meters and family faces, 12–19 days. Code facts are verified by reading the files named.

**Correction to my round-1 file.** I wrote (C9) that the compressor and limiter keep their `DynamicsCompressorNode` private. F-H4 is right and I was wrong. `processors.js` sets `p.node = c` in both `BUILD.compressor` and `BUILD.limiter`, and `p.node = g` in `BUILD.sidechain` (verified: `processors.js`, the `build` functions of those three). Gain-reduction meters and the duck trace need no engine change. That removes one engine edit from my migration step 1.

## Reactions

**F-O1 (design director).** Cost notes for the three concepts:
- **Bench: base + 8–12 days.** Arrangement lanes drawn from `seq.sections[].play` (3–4), the chain strip (2–3), selection and lane pairs with an empty source placeholder (2–3), mixer toggle (1–2). Real source lanes come later, with stems: +3–5.
- **Console: base + 15–22 days.** Strips for 13 tracks, stems and master (3–4); the macro layer, which needs mapping data and a write fan-out (3–4); the rack overlay (2–3). Distinct "hardware" faces cost +5–8 more than flat family faces, because each needs its own drawing, not layout data.
- **Tracing: base + 15–20 days for the UI.** Nothing for the stems, transcription or match score, which cannot be estimated until the pipeline exists.

> "Main risk: vertical space ... you can see either the song or the devices, not both."

I agree, and it changes my view. In round 1 I treated the timeline as a cheap read-only canvas. With 13 source/recreation lane pairs it is the biggest space problem, not the biggest cost. I now prefer one row per track, with the source shown inside that row when it exists, over two lanes per track.

> "Mount only what is visible ... F-O2 should measure this."

Agreed, with a nuance. On desktop, all 23 faces at once is not a performance risk by my round-1 budget: about 420 static SVG nodes, and only meters animate. The reason to mount one chain is room for a distinct face. I have not measured on a phone, and that is the real unknown.

**F-S2 (implementation).** Cost note: **"Strips over a Device Row" is base + 5–8 days.** Compact strips are today's cards with fewer rows (1–2). The device row is my chain strip (2–3). The sends and master strip toggle takes 1. A section ruler takes 1–2. It is the cheapest concept, because almost every piece is also needed by Bench and by Source over Recreation.

> "Fallback is per device and per parameter ... unplaced [spec entries] are appended in a collapsed 'more' drawer."

This is better than my round-1 rule, which listed unplaced keys in `hide`. I adopt it. The selfcheck lint then reports unplaced keys as a count, not a failure, and a new parameter from Gear Crew shows up the same day. My lint keeps one hard failure: a face that names a key the spec does not have. F-S2's `FaceDefs` and my `Faces.define` are the same idea; I will use F-S2's shape (`sections`, `controls: [{p, as, size}]`).

> "Step 2: a small fake `document` ... so the check can call `Faces.render` for all 23 types."

I would not build this, or at least not early. It is about 50 lines of fake DOM to keep in step with real browsers, and the data lint already catches the drift that matters. Faces are cheap to check by opening the page. If we ever want a DOM test, it should be a browser run, not a hand-rolled fake.

**F-S3 (remix IA).** Cost note: **"Source over Recreation" is base + 14–20 days, without the pipeline.**
- Arrange screen with ruler and section matrix: 4–5.
- Stem lanes with decode, peak overview, playback on the sequencer clock and gain-ramped A/B: 5–7.
- Notes tab with a step grid writing back to pattern strings: 3–4.
- Compare tab: 2–3.
- Import and Plan screens: 3–4.

A piano roll for off-grid MIDI is extra: +3–5 for a new note-event path in `sequencer.js` (see Answers).

> "the arrangement is already a matrix: sections as columns, tracks as rows, and a variation letter in each cell."

This is the most useful observation in round 1 for the build. The matrix is in `seq.sections[i].play` today, so a section-by-track grid costs about one day to draw read-only, with no stems. I put it into my suggestion.

**F-H5 (mixer, transport, arrangement).** Cost note: **"Console Strip" is base + 6–9 days.** The overview strip plus flex-grow section ruler and loop brace (2–3) is the cheapest correct answer to 200 bars. Mixer strips with meters take 3–4, and faces opening from strips take 1–2.

> "The `fx` bars look relative to section start ... The relative reading is assumed and has not been checked."

Confirmed: `sequencer.js` `schedule()` fires an fx when `(fx.bar | 0) === bar - sec.start`, so bars are relative to the section start. Your absolute positions (riser at 37, 101, 129, 181; impact at 41, 137) are right.

**F-S1 (browser DAWs).** "Selected-track rack" is the same build as F-S2's suggestion, also base + 5–8 days. The evidence that BandLab and openDAW use a chain for the selected track supports that family of layouts.

**F-H3 and F-H4: a shared misreading of the self-check.**

> F-H4: "Any node method the faces call (`getFrequencyResponse`, `reduction`) needs a stub there, or the check fails."
>
> F-H5: "any new node type (for example `AnalyserNode`) needs a matching stub or the check fails."

The check never loads page code: `load()` in `selfcheck.js` reads only `core, synths, processors, sequencer, song`. `createAnalyser` is already stubbed. Faces and meters therefore cannot fail the check, and they are also not tested by it. A stub is needed only when an **engine** file uses a new node type. That is why I want the face layout data and the device list to be loadable by the check: they are the only UI-related things it can test.

## Answers

**F-O1 Q4 (can a macro mapping table live in `song.js`?)** Yes, and that is the better place. `song.js` is loaded by the check, so a check can resolve every macro path through `seq.setParam`/`getParam` and fail on a typo. Keep it as data next to each track, for example `macros: [{name:'bite', map:[{path:'bass.cutoff', from:200, to:2400, curve:'expo'}]}]`. Writes go through `setParam` like everything else. Cost: 2–3 days for data, writer and check. I would not build macros until a layout that needs them (Console, Tracing) wins.

**F-S2 Q1, F-S1 Q2, F-H1 Q1 (only the selected chain fully drawn?)** It is fine technically, and I recommend it, for the reason above: room, not frame rate. Today's always-visible track controls (level, pan, M/S, steps) stay in the compact row, so nothing becomes unreachable.

**F-S1 Q1 (licence).** The repo has no LICENSE file. `context history.md` says so and lists the owner's decision as open. I found no licence in `README.md` or `prd.md`. Until the owner decides, treat openDAW and GridSound (AGPL) as look-only references.

**F-S1 Q3 (write the face contract for WAM now?)** No. The device record from `seq.devices()` (id, type, spec, params, setParam path) is small enough to wrap later. Building to a plugin standard we have not read is cost with no user.

**F-S3 Q1 (analysis bundle offline or in-page?)** From the build side, import first: a file picker for stem WAVs plus a JSON of tempo, downbeat, sections and notes, decoded with `decodeAudioData` in page code. That keeps the engine and the check untouched. Running separation in the page is Gear Crew's call. Either way it should come after the layout ships, not before it.

**F-S3 Q2, F-S5 Q1 (arbitrary-timing notes?)** Keep the string notation for authored parts, and add a second "clip" format for imported material:
- events `{t (in 16ths, fractional), len, midi, vel}` per track;
- `schedule()` plays the clip events whose `t` falls inside the current step, offset by `(t - step) * stepSec`. It already runs once per 16th with an exact time `t`, so the extra path is small.

Cost 3–5 days, including check cases (an off-grid note lands at the right offset; clip and pattern on one track are mutually exclusive per section). The piano roll is a renderer of that list. The step grid stays on the strings.

**F-S5 Q2 and rule set 5 (live tweak vs ramp; cost of a "held" set).**
- Replace-until-re-enabled costs about 1 day. It is a `seq.held` map keyed by parameter path, checked in `ramps()` and in the section `set` loop, a `seq.release(path | all)`, and two check lines (a held path is skipped by a ramp and restored on release).
- Logic-style trim, an offset on the ramp, needs a base value plus an offset per path and changes every `set()`. That is about 3 days, and it touches `defineParams` semantics.

Build replace first.

**F-H4 Q1 (live reads from audio nodes?)** Yes, read-only, and only from the UI loop. Use `p.node.reduction` for compressor and limiter, `p.node.gain.value` for the duck, and an AnalyserNode tap for an EQ overlay, all polled from one `requestAnimationFrame` for visible faces only. Parameter-driven curves stay pure JS, so they also work in the offline-render `seq`, which has no live nodes.

**F-H3 (is the card "level" the synth `level`?)** No. The card's "level" slider writes `tr.channel` gain. The synth's own `level` is hidden (`skip {level:1}` in `paramSliders`), and sections automate it (`'kick.level'`, `'clap.level'` in `song.js`). Sub shows 0.55 because `song.js` sets channel `gain: 0.55`.

**F-H5 Q (sends and duck on the mixer strip or on the face?)** On the strip. In the engine they are per-track channel objects (`tr.sendGains`, `tr.sc`), not part of any device, so putting them on the strip matches the data. The sidechain face (F-H4's duck envelope) can still open from the strip's duck control.

**F-H2 Q (does the bottom pane follow the selection?)** Yes. One pane, with contents swapped by selection, is what my registry assumes.

## One disagreement

**With F-S2: "Keep `device.set` as the one path from UI to audio, so automation, section sets and UI stay consistent."** I think the one path must be `seq.setParam(path, value)`, not `device.set(name, value)`.

Reasons:
1. **The arrangement already writes by path.** Section `set` and `ramp` call `seq.setParam(r.param, v, {at})` with dotted paths (verified: `sequencer.js` `ramps()` and the `sec.set` loop in `schedule()`). The "held" rule F-S5 asks for is about one parameter being written by both the user and the arrangement. It needs both writers to use the same key, the path. A UI that calls `device.set('cutoff', v)` directly is invisible to a path-keyed `held` map, so the next ramp step overwrites the user, the bug F-S5 describes in A6.
2. **Undo, macros and later automation recording need a single path-keyed write.** F-O1's macro table maps to paths. A macro that writes `bass.cutoff` and a face that writes `inst.set('cutoff')` would be two routes to one value.
3. **It costs nothing.** `setParam` already resolves `track.key`, `track.insert.key`, `send.name.key` and `master.name.key`, ending in the same `obj.set`. I checked every path shape against `setParam`/`getParam` in round 1.

So faces should receive a `host.setParam` bound to their device's path prefix (my round-1 sketch), and read `dev.obj.params`. F-S2's renderer can keep its `refresh(v)` shape unchanged; only the write call differs.

## My suggestion

**"Strip Bench": F-S2's Strips over a Device Row, refined with F-H5's ruler and F-S3's section matrix.** One window with four bands:
1. The control bar.
2. A proportional section ruler with an overview and a loop brace.
3. Thirteen compact track rows. Each row is a family rail, name, M/S, a meter, the 16-step row for the current section, and a strip of section cells showing which variation plays in each of the nine sections, all read from `seq.sections[].play`.
4. One device row at the bottom for the selected track: its channel strip (level, pan, sends, duck), then the synth face, then its inserts, in signal order. A toggle swaps the row to "returns + master".

Every face comes from the registry with the generic fallback, so the page works on day one and gains faces one at a time. When stems exist (D2), each track row gains a thin source lane inside it, with per-row and global A/B, instead of doubling the rows. Rough cost: **base + 7–10 days**, the cheapest layout that leads to Bench and to Source over Recreation without rework.

- **Borrowed from Ableton:**
  - the Device View chain for the selected track, left to right in signal order, with fold by double-clicking the title bar;
  - the Overview strip for a 200-bar song;
  - one window, no floating panels.
- **Borrowed from Logic:**
  - the Inspector's channel strip at the head of the chain;
  - the marker track and cycle as the section ruler and loop brace;
  - the Controls view as the generic face that every device has before it gets its own Editor view.
- **New:**
  - section cells in each track row, showing the arrangement matrix that is already in the data;
  - F-S5's per-parameter state dot (inherited, set or ramp; held shows amber) on every face;
  - the source lane reserved inside the track row for the remix stage;
  - one write path (`setParam`), so held, macros and undo come later without a rewrite.

```
+-----------------------------------------------------------------------------+
| > || [] 126 BPM sw .06 | 042.09 mainA | [A src|B rec|A+B] | meter clip | WAV |
| overview [==|######|=======================================]                |
| ruler |intro|i2|build|  mainA  |  mainA2 |break|bE| mainB    |outro|       |
| loop                 [=== brace ===]                ^ playhead              |
+-----------------------------------------------------------------------------+
| ▌kick  M S ▮▮ x...x...x...x... | A  A  A  A  A  A  A  A  A |                 |
| ▌sub   M S ▮  x...x...x...x... | A  A  A  A  A  A  A  A  A |                 |
|>▌bass  M S ▮▮ ...x...x..x...x. | A  A  A  A  B  C  C  B  A |  (src lane, D2) |
| ▌stab  M S ▮  ..x...xx..x...xx | .  C  B  A  A  B  B  A  C |                 |
|  ... 13 rows, family rail colour, section cells read from seq.sections      |
+-----------------------------------------------------------------------------+
| bass ▸ [strip: lvl pan dly rev duck] -> [ BASS face: osc | filter curve |   |
|        amp ] -> [ EQ3 face: curve, 3 nodes ] -> out     [returns+master ⇄] |
+-----------------------------------------------------------------------------+
```

## Open question for the vote

**Are we voting for the first layout to ship on today's data (13 tracks, no stems, no transcription), or for the end-state remix layout that needs the D2/D3 pipeline?** The concepts sort cleanly on this:

- Strip Bench, Strips over a Device Row, Selected-track rack and Console Strip ship on today's data, at base + 5–10 days.
- Bench and Console need stems to be more than placeholders.
- Tracing and Source over Recreation mostly show things that do not exist yet: base + 14–20 days, plus a pipeline nobody can estimate.

If the vote is for the end state, the group should also name the shippable first stage of it, or the first months produce a frame around empty lanes.
