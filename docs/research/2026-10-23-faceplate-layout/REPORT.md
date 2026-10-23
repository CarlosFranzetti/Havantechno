# Faceplate report: how Havantechno should be laid out

Coordinator: the Fable session. Written 2026-10-23 17:01:54 UTC. Process: Roundtable (see `../README.md`). This report cites the group's transcripts in `transcripts/`, the compiled debate in `DISCUSSION.md` and the ballot in `VOTE.md`. Where it states a fact about Ableton Live or Logic Pro, the fact comes from an agent's file and carries that file's verification grade; most rest on search excerpts because page fetches failed in the research sandbox. Nothing here was verified by using either DAW.

The mockups are on the canvas **Havantechno Layout Concepts**: https://claude.ai/artifact/Wy3gZLnLoShp6uzxrNVfP7 (private until shared). Five boards: the winner, the runner-up, the remix end-state, the Logic-shaped alternative, and a sheet of device faces.

## 1. The question and how it was answered

With Ableton Live and Apple Logic Pro as references: what are the layout possibilities for Havantechno, and how does each device get its own face, in plain HTML, CSS, SVG and JS with no build step?

Twelve agents (five Haiku, five Sonnet, two Opus) researched one topic each (round 1), read all twelve reports and each wrote reactions, one disagreement and one layout suggestion (round 2, `DISCUSSION.md`), then ranked three suggestions each (round 3, `VOTE.md`). The coordinator ruled before the ballot that the vote was for the first layout to ship on today's data (13 tracks, no stems) with a clear slot for the stem pipeline.

## 2. Result

| Rank | Suggestion | By | Points (3-2-1) | First places |
|------|------------|----|----------------|--------------|
| 1 | **Strip Bench** | F-O2 (tech lead) | 28 | 8 of 12 |
| 2 | Matrix Bench | F-S2 | 20 | 3 |
| 3 | Stem Bench | F-O1 (design director) | 9 | 1 |
| 4 | Chain Bench | F-S1 | 7 | 0 |
| 5 | Family Bench | F-S4 | 5 | 0 |

Five suggestions received no votes, including the two that departed from the shared shape (F-H2's Logic-shaped Tracks and Editors, F-H5's Section Matrix as the first screen). The full matrix, every amendment and every dissent are in `VOTE.md`.

The result is less a contest than a convergence: ten of twelve suggestions were variants of one shape, F-O1's Concept A "Bench" (`transcripts/round1-FO1-design-director.md`), and the top three differ in emphasis, not structure. Matrix Bench and Strip Bench are close enough that F-O2's own ballot ranked Matrix Bench first and F-S2's ranked Strip Bench first.

## 3. The layout to build: Strip Bench, as amended

One window, four bands, in F-O2's words (`transcripts/round2-FO2.md`), with the amendments the voters attached (`VOTE.md`, "Amendments proposed to the winner"), all of which are drawn on board 1 of the canvas.

1. **Control bar.** Transport, BPM, swing, bar and section readout, an A/B audition switch (SRC / REC / A+B) that is present but disabled until a source is loaded, master meter, Export WAV. Brand pink stays on the wordmark and Play only (F-S4).
2. **Overview and section ruler.** A 200-bar overview strip with the visible window marked (borrowed from Live's Overview, F-H1), and the nine sections as blocks sized by bar count (16, 8, 16, 32, 32, 24, 8, 48, 16), with a loop brace and playhead (F-H5).
3. **Thirteen compact track rows, grouped under stem headers.** Groups DRUMS (kick, clap, hat_closed, hat_open, shaker, perc), BASS (sub, bass), OTHER (stab, lead, pad), FX (riser, impact). The headers are collapsed and empty today; when stems arrive the stem waveform fills the header, so rows never reorder (amendment from F-H5, F-O1 and F-O2, following F-S3's finding that about four stems feed thirteen tracks). Each row: a 4 px family rail, name, M and S, a small meter, the 16-step row for the current section, and nine section cells showing the variant letter from `song.js` (`seq.sections[].play`), with ramps marked.
4. **One device row for the selected track**, left to right in signal order: a PATTERN face first (the editor chosen by track kind: step row for drum and note tracks, progression strip for chord tracks, a compact roll for the lead only; F-S5, F-H1, F-S2), then the synth face, then its inserts, then the channel strip (level, pan, sends, duck) at the end (F-O1). At the right, **RETURNS and MASTER pinned and always visible** as chips that open as faces, because the engine runs delay and reverb as parallel sends and the master as a fixed chain (F-H3, F-H4, F-H5).

Only the selected track's chain is drawn in full; the other twelve rows show chips. This was the group's own consensus (six agents asked it; none argued the other way) and sets the performance budget (F-S2's estimate: about 3 to 5 faces and 15 to 40 knobs in the DOM at once, instead of about 1,700 nodes for all faces).

Borrowed from Ableton Live (per F-H1, F-O1): the Device View chain for the selected track, fold by title bar, the Overview, one window with no floating panels. Borrowed from Logic Pro (per F-H2): the Inspector's channel strip paired with the output strip (here the pinned RETURNS and MASTER block), the marker track and cycle region as section ruler and loop brace, and the Controls view as the generic fallback face every device has before it gets an Editor view. New: the section cells in every row, the stem group headers, and the shape-only state markers.

## 4. What every layout shares

These came out of round 2 as agreed points, not votes (`DISCUSSION.md`, "What the group converged on"):

- **A face registry with a generic fallback.** Each device type declares a face (layout data naming its spec parameters); one renderer draws it at three densities (chip, strip, faceplate); any device without a face gets today's slider list, extended with select and toggle widgets for the non-numeric parameters that have no control today (`wave`, `mode`, `division`, `pingpong`; F-S2). Faces write through `seq.setParam(path)`, the same key the arrangement uses (F-O2).
- **Meters need no engine change.** Compressor, limiter and sidechain already expose `p.node` (F-H4, F-S2, F-O2 corrected its round 1). One requestAnimationFrame loop draws everything; AnalyserNodes created by the page feed meters and EQ overlays (F-O2).
- **State is shape, never hue.** Filled dot = set at section start; arc = ramp running; open ring = held by the user; hatch = bypassed or muted (F-S4, F-S5; the amber "held" marker was voted out by four ballots).
- **A `held` set in the engine.** Today a live tweak on a ramped parameter is overwritten within one step; a drag should mark the control held, with a "Re-enable arranged (n)" button (F-S5; F-O2 costs it at about a day).
- **The mixer is a drawer or toggle**, not a permanent band (F-H1, F-H2, F-H5, F-O1).
- **Copy-on-write for shared pattern variants**, since kick A is used in all nine sections (F-H5, F-S5).
- **Logic's per-circuit compressor skins are unproven.** Two agents found only that the parameter set changes per model, not the artwork (F-H2, F-H4). Any skinned tier needs its own justification.

## 5. Visual system

F-S4's system (`transcripts/round1-FS4-visual-system.md`), used on all five boards: a neutral chassis (`--bg #0b0b10`, `--panel #15151e`, `--line #2a2a3a`) and one hue per device family, used as thin ink only, with computed contrast of 8.6:1 to 9.5:1 against the panel for every family. Drums orange `#fc9b6f`, bass violet `#c4a4fe`, keys sky `#55c4fe`, fx gold `#d8b349`, dynamics magenta `#ea97d8`, time teal `#21d1ca`, tone periwinkle `#9cb4fe`, utility grey `#b0b8c5`. Within a family each device gets a glyph and one hero graph drawn from its own parameters (kick: pitch-drop curve; bass: filter curve over the waveform; compressor: transfer curve with gain-reduction meter; eq3: three-point curve; delay: tap train; sidechain: duck envelope). The hex values are F-S4's OKLCH arithmetic, not sourced from either DAW. F-H3's disagreement stands: a track rail that defaults to the family hue means the rail-versus-device colour rule is never exercised in the default state; the board uses it anyway because it costs no setup.

## 6. Cost and order of work

F-O2's estimates (`transcripts/round1-FO2-tech-lead.md`, `round2-FO2.md`), labelled rough, plus or minus 50 percent:

- **Shared base, 12 to 19 days:** the device list, the face registry with the generic fallback, the single drawing loop, the `held` set, select and toggle widgets, hand-written knob, slider, meter and curve widgets (F-S2 found no permissively licensed library worth vendoring).
- **Strip Bench on top of the base, 7 to 10 days.**
- Matrix Bench is within a day or two of the same; Stem Bench adds the Compare tab and A/B and depends on stems that do not exist; Tracks and Editors costs 10 to 14 days and was not voted for.

What to build first (F-O2): the device list and the registry with a generic face that reproduces today's sliders, then the drawing loop. That alone fixes two bugs: sliders that ignore section ramps, and a master rack that never refreshes. Build in a new folder, since `olde Havantechno dub studio/` is frozen; the self-check never loads `studio.js`, so no layout work can break its 161 checks (F-O1, F-O2). F-S2 proposes adding the face definitions to the self-check with a lint that every face parameter exists in the spec.

## 7. Decisions the owner should make

1. **Does version 1 edit the song, or only play it with live tweaks?** F-H1's dissent and F-S5's open question. Editing (paint steps, write to section, copy-on-write variants) needs a writable song model and a save format, which the engine does not have. The ranking does not change either way; the cost does.
2. **Repo licence.** Undecided; it gates whether openDAW (AGPL) or GridSound can be more than look-only references (F-S1), and it gates the Gear Crew's engine choices too.
3. **Stems in the first build, or only the reserved slot?** F-S3's question; the ruling said slot. Stem Bench is what the slot becomes.
4. **Returns and master always visible?** Four agents want them pinned; the winning text had a toggle. This report applies the pinned version, as the amendments asked.
5. **Brand pink** stays on the wordmark and Play only (F-S4's recommendation), unless the owner wants it elsewhere.

## 8. Limits of this research

Page fetches failed from the sandbox for nearly every DAW documentation page, so layout facts about Live and Logic rest on search-result excerpts and the agents' prior knowledge, and are marked so in their files. The hue values, the DOM-node counts and the day estimates are the agents' own computation or judgement, not sourced. The canvas boards are illustrations of the descriptions in the transcripts, drawn by the coordinator; they were not reviewed by the agents.

## 9. Files

- `BRIEF.md`: the question, roster and rules.
- `transcripts/round1-*.md`: twelve research reports.
- `transcripts/round2-*.md` and `DISCUSSION.md`: the debate and the twelve suggestions.
- `transcripts/round3-*-ballot.md` and `VOTE.md`: the ballots and tally.
- Canvas: https://claude.ai/artifact/Wy3gZLnLoShp6uzxrNVfP7
