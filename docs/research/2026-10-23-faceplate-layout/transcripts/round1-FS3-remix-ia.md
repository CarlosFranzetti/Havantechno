# F-S3: information architecture for a remix DAW — round 1
Agent model: Sonnet. Date: 2026-10-23.

## Scope

What views Havantechno needs once the remix pipeline (PRD D2, D3) exists: source song to stems to MIDI and parameter data, loaded into the studio and recreated with a stock synth, a modified synth, or a new one. Specifically:

- a source-stems lane set,
- a MIDI view per track (step grid or piano roll),
- an A/B switch between the source stem and the recreated track,
- section markers,
- the device chain per track,
- where the "load / modify / create a synth" decision is shown.

Research question: how do Ableton Live 12 and Logic Pro 11 present stem separation and audio-to-MIDI (where the result lands, how the user compares source with result), and how do DJ and remix tools (Serato Stems, RipX) lay out stems. I also looked at FL Studio and at reference-track A/B plug-ins, because both DAWs leave the comparison to the user.

How to read the marks. Every page fetch in this session failed (`getaddrinfo ENOTFOUND` for www.ableton.com and support.apple.com), so nothing from the web is marked "fetched". Web facts are `(search excerpt: <url>)`: the URL appeared in a search result and the search summary stated the fact; I did not read the page. Where the summary did not say which of several URLs held a sentence, I list the URLs and say so. Facts about this repo are `(verified: local file ...)`, read by me this session. Everything labelled "my design" is a proposal, not a finding.

Search budget: 12 of 12 used. What I did not get to is listed under "Recalled, not verified" and in the last paragraph of "Findings".

## What I looked at

- BRIEF.md (rules, format), both screenshots, `prd.md` section 4b (D1 to D4), and the S5 report (stems, MIDI, tempo/key/section data).
- Screenshot `docs/screenshots/studio-playing.png`: a header (transport, BPM, swing, bar/step readout, meter, two export buttons), a row of nine section chips (`intro (16)`, `intro2 (8)`, `build (16)`, `mainA (32)`, `mainA2 (32)`, `break (24)`, `breakEnd (8)`, `mainB (48)`, `outro (16)`) plus a "loop section" checkbox, then a 4-column grid of 13 identical track cards. Each card has M and S buttons, a 16-step row with a green playhead, five sliders (level, pan, send delay, send reverb, duck depth) and collapsed "synth parameters" and "inserts" lists.
- Screenshot `docs/screenshots/studio-rack.png`: a separate block "processors: sends and master" with eight identical slider cards (send delay, send reverb, master eq, hp, lp, glue, sat, limiter) and bypass buttons.
- Repo data model, read locally: `studio/song.js` and `studio/sequencer.js` (see Findings, section F).
- 12 web searches: Ableton 12.3 stem separation; Ableton audio-to-MIDI manual chapter; Logic Stem Splitter; Logic Flex Pitch / Drum Replacement; Serato Stems; RipX; Ableton Slice to New MIDI Track; Logic Smart Tempo; Ableton Clip View (little useful came back); Logic Step Sequencer; FL Studio stem separation; reference-track A/B plug-ins.

## Findings

### A. Stem separation: where the result lands

| Tool | Where the result lands | What happens to the source | Source |
|---|---|---|---|
| Ableton Live 12.3 (Suite) | Right-click a sample in the browser, or a clip in Session or Arrangement View, choose "Separate Stems to New Audio Tracks". Four stems: Vocals, Drums, Bass, Others. Each stem is rendered onto its own track in a new Group Track. | The source clip is muted "to avoid doubled output". Audio effects from the source track are also added to the Group Track. Choice of High Speed or High Quality. Runs locally; the technology is from Music AI. | (search excerpt: https://www.ableton.com/en/stem-separation-in-ableton-live/; the summary attributes the sentences to Ableton's release notes, whose URL was not in the results. Also listed in the same result: https://mixdownmag.com.au/news/ableton-live-12-3-drops-overnight-with-stem-separation-and-splice-integration/ and https://routenote.com/blog/ableton-live-12-3-update/) |
| Logic Pro (Mac) | Control-click an audio region, Processing > Stem Splitter. Vocals, Drums, Bass and Other are ticked by default; click Split. A summing stack appears below the track; its subtracks hold the stems. | The original is muted automatically. Apple silicon only. The iPad guide lists vocals, drums, bass, guitar, piano and other, and says there are presets for stem combinations; the Mac text I saw lists four. | (search excerpt: https://support.apple.com/en-is/guide/logicpro/lgcp61bae908/mac; https://musicradar.com/how-to/stem-splitter-logic; https://soundonsound.com/techniques/logic-pro-how-use-stem-splitter; iPad: https://support.apple.com/guide/logicpro-ipad/lpip1b60ada3/ipados) |
| FL Studio | Per two tutorial sites, stems appear as clips on separate Playlist tracks; routing them to Mixer tracks is a manual step. One vendor page claims FL Studio has no native stem separation in 2026; the sources conflict, and I did not see Image-Line's manual. | Not stated. | (search excerpt: https://www.aiseesoft.com/how-to/isolate-vocals-in-fl-studio.html; https://slooply.com/blog/how-to-separate-vocals-instruments-in-fl-studio-no-plugins-needed/; conflicting: https://stemsplit.io/blog/fl-studio-stem-separation) |
| Serato DJ Pro (Stems) | Not tracks: four stems (vocals, melody, bass, drums) are controls on the deck. Per Digital DJ Tips the top four performance pads toggle vocals, melody, bass and drums; the bottom four add effects such as echoing out the vocals or drums. Quick Acapella and Instrumental buttons are always visible in the virtual deck area; the full Stems tab appears with hardware or in Serato Play's 2-deck mode. Shift-click on a stem button solos it in Serato Sample. | The waveform changes colour to match the audio that is playing, and muted sections turn grey. | (search excerpt: https://www.digitaldjtips.com/?p=2776580; https://support.serato.com/hc/en-us/articles/7645256113551-Stems; https://wearecrossfader.co.uk/blog/serato-dj-3-stems/; https://serato.com/sample/downloads/2.0.0/releasenotes). The sources disagree on which pad mode holds stems on some controllers. |
| RipX DAW | A project is a "Rip"; each separated element or recorded sound is a Layer, the equivalent of a track. Clicking a Layer selects it and all editing is restricted to it. Pitched sounds appear as editable "note blobs" on a piano-roll grid; there is no separate MIDI and audio track type, so one set of tools edits both. Grouping notes is Cmd/Ctrl+G. | Not stated. | (search excerpt: https://music.loop.fans/ai/ripx-ai-daw-review-surgical-audio-editing-with-ai-stem-separation; https://www.audiocipher.com/post/ripx-daw; https://www.soundonsound.com/reviews/hitnmix-ripx-deepcreate). Mostly vendor or promotional pages; one review says whether RipX is "a true DAW" is "yes... but also no". |

Pattern I draw from the table (my reading of the excerpts, not a quoted claim): both DAWs put the stems next to the source, inside one collapsible container (Group Track in Live, summing stack in Logic), mute the source rather than delete it, and keep the full original in place. Serato does the opposite because a DJ deck has no timeline: stems are four always-reachable toggles, with colour showing which are live.

### B. Audio-to-MIDI: where the result lands

- Ableton: "Convert Drums to New MIDI Track" extracts rhythms from unpitched, percussive audio into a clip on a new MIDI track, tries to identify kick, snare and hi-hat, and assigns them to the preloaded Drum Rack. Transient markers can be adjusted before converting, which controls where notes land. "Convert Melody" turns a single melodic line into MIDI notes. (search excerpt: https://www.ableton.com/en/live-manual/12/converting-audio-to-midi/)
- Ableton, Harmony: the manual's Harmony text was not in the results. One forum post lists three modes and says Harmony and Melody produce a new track "containing an instrument rack with a default sound" and Drums produces a Drum Rack. (search excerpt: https://www.kvraudio.com/forum/viewtopic.php?p=7311886; community post, not Ableton.) Community advice in the same results: isolate each instrument on its own track before converting, because other sounds get detected as pitches. This matches S5's advice to run Basic Pitch per stem.
- Ableton, "Slice to New MIDI Track": for warped audio, creates a Drum Rack of Simplers or Samplers with one pad per slice. Slices can be cut by Warp Marker, transient, bar or note size; trigger notes start at C1. (search excerpt: https://www.soundonsound.com/techniques/ableton-live-clip-slicing and https://splice.com/blog/?p=425, both in the result list; the summary did not say which page holds which sentence.) Whether the original clip stays on its track: not found.
- Logic, melodic: open the audio region in the Audio Track Editor, show Flex, choose Flex Pitch mode, correct, then Edit > Create MIDI Track from Flex Pitch Data. The result is a new instrument track below the audio track holding MIDI regions. Apple's guide says it works best on single notes and chords can be misread. (search excerpt: https://support.apple.com/ar-qa/guide/logicpro/lgcpe2fd1b83/mac) The correction happens on the audio, in the Flex view, before conversion.
- Logic, drums: Drum Replacement is for non-pitched drums and percussion. A Sound On Sound article is summarised as saying that once the MIDI is generated there is no going back, and that the tool ignores plug-ins on the track, so the track must be bounced for gating to affect extraction. (search excerpt: https://www.soundonsound.com/node/4929589)
- Both DAWs auto-load a default instrument (a Drum Rack, "an instrument rack with a default sound") and leave swapping it to the user. Neither search returned a concept of "this instrument is a stock load, a tuned one, or a new one", nor a measure of how well the instrument matches the source. That decision display is new ground. (Absence in a 12-search budget, not proof.)

### C. How the user compares source with result

- Neither DAW's result showed any link between the new MIDI track and the audio it came from, in the excerpts I saw. Logic's drum conversion is described as irreversible. In practice comparison means muting or soloing tracks by hand. I found no documented A/B feature for this in either DAW (not found, not "does not exist").
- The established idiom for A/B is the reference-track plug-in: Mastering The Mix REFERENCE matches reference levels to the track being worked on ("Match To Original"), and its REFSEND skips the FX chain so a loudness-matched A/B survives edits. (search excerpt: https://www.masteringthemix.com/pages/reference-2-manual)
- A Puremix article argues the comparison plug-in goes at the very end of the master bus, and that the switch must be instant because a two-second gap while finding the mute button "is long enough for your ear memory to evaporate". It names MCompare, Metric AB and ADPTR Metric. (search excerpt: https://www.puremix.com/blog/how-to-use-reference-tracks-when-mixing)
- A forum user in another result points out that loudness matching alone misses EQ, reverb, compression and placement differences. (search excerpt: https://gearspace.com/threads/mix-analysis.1392767/; the page title in the result was "What's new", so the thread identity is shaky.)

### D. Tempo, beat and section data: how an imported track gets its grid

- Logic Smart Tempo analyses imported audio into a tempo map. Hint Mode in the Smart Tempo Editor lets the user mark downbeats and beats where the analysis is wrong, and time signature changes can only be detected if the user adds hints. Beat markers can be dragged. In the Global Tracks tempo lane blue marks mapped ranges and orange marks unmapped ones. (search excerpt: https://support.apple.com/en-gw/102165; https://www.soundonsound.com/techniques/logic-pro-using-smart-tempo?amp)
- Lesson for Havantechno: the analysis result is a proposal with a visible confidence state (blue or orange) and an edit tool, not a silent import. The pipeline's tempo, downbeat, key and section data (S5: 126 BPM, first downbeat 0.58 s, B major in the design spec; section detection "not found" in any tool S5 researched) should arrive the same way.
- Section markers: I did not search Ableton locators or Logic markers; that is F-H5's topic.

### E. Step grid versus piano roll in the two DAWs

- Logic: the Step Sequencer edits a Pattern region, shown as an editor at the bottom of the window. With Drum Machine Designer, rows are individual kit pieces; with other instruments they are pitched notes; the assignment is shown in row headers on the left. (search excerpt: https://support.apple.com/en-ca/102117; https://www.audeobox.com/learn/logic-pro/logic-pro-step-sequencer/). The iPad guide says a pattern region can be separated so each row becomes its own one-row region ("Separate by Kit Piece"). (search excerpt: https://support.apple.com/guide/logicpro-ipad/lpip7bfae625/ipados) I did not find the Mac equivalent.
- Ableton: my search for Clip View, fold and step-view switching returned nothing usable. The only related finding is the Sequencers pack, whose Rhythmic Steps device is "aimed towards use with Drum Racks", with per-step probability and swing. (search excerpt: https://www.ableton.com/en/packs/sequencers/) Not found: Live 12's own Clip View behaviour. F-S5 owns this topic.

### F. What Havantechno already has (my reading of the repo)

- A song is `tracks` plus `sections`. Each track has `patterns`: named variations such as `A`, `B`, `C`, each a 16-character string like `'x...x...x...x...'` (`x`, `X`, `o` give accent and open-hat variants). Pitched tracks carry `melody`: per bar, per step, `{midi, len, vel}`. Chord tracks use a song-level `progression`. (verified: local file studio/song.js, studio/sequencer.js)
- Each section lists `play`, a map from track to the variation it plays (for example `mainA` plays kick `A`, bass `A`, stab `A`, hat_closed `A`), plus `set` (parameter values), `ramp` (parameter sweeps over the section) and `fx` (riser and impact triggers). (verified: local file studio/song.js)
- So the arrangement is already a matrix: sections as columns, tracks as rows, and a variation letter in each cell. The screenshot hides this: it shows only the current 16 steps per track and a chip row for sections. That matrix is the natural home for "source versus recreation" lanes.
- The sequencer has no arbitrary-timing note events: patterns are 16 steps per bar. (verified: local file studio/sequencer.js; the same point appears in S5's handoff to O2.) Off-grid MIDI from a transcriber must be quantised to 16ths or the sequencer must grow a note-event path. That decides when a track can use the step grid and when it needs a piano roll.

### G. Not covered

Not found: Ableton Live 12's Clip View and Drum Rack pad view; Ableton Convert Harmony text; Apple's own Stem Splitter page (all fetches failed); any documented A/B between a stem and its MIDI recreation in Ableton or Logic; Bitwig, Studio One, Moises, djay and Traktor layouts; how Serato or RipX show tempo and key.

## What Havantechno could borrow

Views needed (my design). Six screens plus two always-visible elements.

1. Import and check: where the analysis bundle (stems as WAV, MIDI files, JSON of tempo, key and sections; S5's suggested offline hand-off) is loaded. Shows each result with a confidence state in the Smart Tempo style (borrowed from Logic): tempo, first downbeat, key, section edges. The user confirms or drags before anything lands in the studio.
2. Plan: one table, one row per stem, columns: stem, the Havantechno tracks that recreate it, decision (Load, Modify, Create), status. Examples by S5's findings: drums to kick, clap, hat_closed, hat_open, shaker, perc, impact; bass to bass and sub (S5: no 4-stem model separates sub from kick, so sub is derived from the drums and bass stems); other to stab, lead, pad; vocals empty. This is a many-to-one map that neither DAW needed because they stop at the stem.
3. Arrange (home screen): ruler with section markers, a Source group of stem lanes on top, Recreation tracks below, bottom detail panel.
4. Notes editor: step grid or piano roll, with the stem and detected onsets drawn above.
5. Device face: full-size panel for one device (look is F-S4's topic).
6. Mixer drawer: strips, sends and master, with the existing processors block as its right-hand side.
7. Always visible, in the transport: the A/B switch and the loop-section control.

ASCII map of screens and navigation (my design):

```
                       +---------------------+
 stems .wav, .mid,     |  1 IMPORT & CHECK   |  tempo, downbeat, key, sections:
 analysis .json  ----> |  (confidence chips) |  confirm or drag, like Smart Tempo hints
                       +----------+----------+
                                  v  "Accept"
                       +---------------------+
                       |  2 PLAN             |  stem -> track(s) -> LOAD / MODIFY / CREATE
                       |  (table)            |  proposed by the pipeline, user overrides
                       +----------+----------+
                                  v  "Open in studio"
 +-------------------------------------------------------------------------+
 |  3 ARRANGE (home)                                                       |
 |  transport: play | bpm | bar | [A/B: SOURCE|RECREATION] | loop section   |
 |  ruler + section markers                                                |
 |  SOURCE group (stem lanes)      RECREATION tracks (section matrix)      |
 |  bottom panel tabs:  [Notes] [Chain] [Compare]                          |
 +-----+-----------------------+-----------------------+-------------------+
       | dbl-click a clip /    | click a device in     | "Mixer" button
       | Notes tab             | the Chain tab         |
       v                       v                       v
 +-------------+        +----------------+      +------------------+
 | 4 NOTES     |        | 5 DEVICE FACE  |      | 6 MIXER drawer   |
 | grid | roll |        | (full size)    |      | strips, sends,   |
 | + stem strip|        | changed knobs  |      | master chain     |
 +------+------+        | marked         |      +---------+--------+
        |               +--------+-------+                |
        +--- Esc / click the breadcrumb: back to 3 -------+
 Plan row click -> jumps to 3 with that track selected (and back).
```

Arrange screen mock (my design). Rows are a Source group above a Recreation group on one shared ruler, the way Live's Group Track and Logic's summing stack sit beside the original.

```
+------------------------------------------------------------------------------+
| > [] 126 BPM  bar 42 | A/B [ SOURCE | RECREATION ] level-match | loop: mainA |
+------------------------------------------------------------------------------+
|        |intro 16 |i2 8|build 16|mainA 32          |mainA2 32       |break 24...|
| marker ^         ^    ^        ^  (drag to move, dbl-click to rename)         |
+------------------------------------------------------------------------------+
| v SOURCE   original muted when A/B = RECREATION                              |
|  mix    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ |
|  drums  ~||~||~||~||~||~...                      M S  -> kick clap hats ...  |
|  bass   ~~_~~_~~_~~...                           M S  -> bass sub            |
|  other  ~~~~~~~~~~...                            M S  -> stab lead pad       |
|  vocals (not mapped)                                                         |
+------------------------------------------------------------------------------+
| v RECREATION                                                                 |
|  kick  [LOAD]   |A    |A   |A      |A              |A         |A    ...  M S|
|  bass  [MODIFY] |A    |A   |A      |A              |B         |C    ...  M S|
|  lead  [CREATE] |     |    |       |               |B         |A    ...  M S|
+------------------------------------------------------------------------------+
| [Notes] [Chain] [Compare]    selected: bass                                  |
|  (bottom panel content: see the three mocks below)                           |
+------------------------------------------------------------------------------+
```

Bottom panel, Notes tab: one note list, two renderers (my design).

```
 step grid (drums, on-grid)                piano roll (pitched, or off-grid)
 stem  ~|~~~|~~~|~~~|~~~|  <- waveform     stem  ~~_~~~_~~_~~~  <- waveform
 hint  .   .   .   .   .   <- detected     C#5   .   [==]  .
 kick  X . . . x . . . x . . . x . . .     B4    [==]       [=]
 clap  . . . . x . . . . . . . x . . .     F#4        [=]
 hat   . . x . . . x . . . x . . . x .     B2    [=====]
 var:  [A] B C   (bar 1 of 4)             toggle: [Grid | Roll]
 ghost/diff: transcribed notes the current pattern misses (outlined), extras (struck)
```

Chain tab: decision first, then the chain left to right, then sends (my design).

```
[ LOAD | MODIFY | CREATE ]   -> [ bass synth ] -> [ eq ] -> [ channel: level pan ] -> sends: delay, reverb, duck
  MODIFY: 6 params differ       knobs that differ       (inserts today: eq, width     (existing send/duck
  from stock; "show diff"       from stock are marked    on bass and stab)             params from the card)
```

Compare tab: stem waveform and recreation waveform stacked on the same time axis, onset ticks for both, a short "differences" list (missed onsets, extra onsets, level offset in dB), and a per-track A/B button.

How each requested view maps to what I found:

- Source-stems lane set: a collapsible Source group, one lane per stem plus the original mix, with M and S buttons, and a bracket label showing which tracks each stem feeds. Borrowed: Group Track in Live and summing stack in Logic (stems grouped beside the muted original, effects of the source carried over in Live). From Serato: colour the waveform by whether the lane is audible and grey it when muted (search excerpt, see A).
- MIDI view per track: one note list with two renderers. Drum tracks default to the step grid (Logic's rows-per-kit-piece), pitched tracks to the piano roll (RipX's note blobs on a roll). A track may switch to the grid only when all its notes fall on 16th steps and are monophonic or chord-per-step, because that is all `patterns` and `melody` can store (section F). Show the stem waveform and detected onsets above the editor; Ableton's Convert Drums lets the user adjust transient markers before converting, so showing them is precedent.
- A/B switch: in the transport, not buried in a panel, with a level-match toggle on by default and an instant, click-free switch; keyboard shortcut. Borrowed from reference-plug-in practice (section C). Per-track A/B also lives on the Compare tab. Both versions play in sync all the time and the switch only moves gain, so there is no re-trigger or re-sync (my design).
- Section markers: a ruler row above both groups, proportional to bars (the screenshot's chips show bar counts but not proportion), each marker draggable. The analysis proposes the markers (S5: no researched tool does section detection, so expect manual edits) and the Import screen shows them with the confidence styling from Smart Tempo.
- Device chain per track: a Chain tab showing instrument, inserts, channel strip and sends as one left-to-right line. The repo already has these concepts per track (inserts such as eq and width, send levels, duck depth in the screenshot).
- Load / modify / create: shown in three places so it is never hidden. (1) A chip on each Recreation lane header: LOAD (stock synth, stock parameters), MODIFY (stock synth, parameters or inserts changed; chip shows the count), CREATE (no stock synth fits; a new synth type is needed). (2) The first card of the Chain tab, with a "show diff" that marks the changed knobs on the device face. (3) The Plan table, the only place that lists all tracks at once. The pipeline proposes a state and the user overrides it. S5 found no tool that estimates synth parameters from audio, so a "fit" figure has no source yet; show a placeholder or leave it out until the pipeline defines one.

My one concrete suggestion for the layout: **Source over Recreation**. One Arrange screen where the original lives as a collapsible group of stem lanes above the recreated tracks on a shared ruler with draggable section markers. An A/B switch sits in the transport. Detail opens in a bottom panel with three tabs (Notes, Chain, Compare). A decision chip on every recreated lane says Load, Modify or Create. The step grid and piano roll are two renderers of one note list. Import and Plan are one-time screens before it.

- From Ableton: Group Track beside the muted source, and the bottom detail panel (the Device View position; F-H1 covers it).
- From Logic: the summing stack, kit-piece rows for the step grid, Smart Tempo's confidence colours and hints.
- New: the Plan table, the decision chip, the always-visible A/B, and onset diff between stem and recreation.

## What would not fit (and why)

- Serato's model (stems as four deck toggles with no timeline): Havantechno needs a timeline, because the recreation is built per section, and its stems are comparison references rather than performance controls. Borrow the colour-when-audible idea only.
- RipX's "no MIDI/audio distinction" model: it edits audio notes directly. Havantechno's engine plays synths from patterns, so the recreation cannot be the stem edited in place. The note-blob look (notes drawn as audio) is borrowable for the Compare tab, the model is not.
- Logic's irreversible drum conversion: the pipeline output should stay re-runnable (keep the stem and the proposed MIDI beside the edited pattern). Not a layout point, but it constrains the Notes view (keep the "transcribed" notes as a ghost layer).
- Per-stem sub: no 4-stem model gives a sub stem (S5), so a Source lane for sub cannot exist unless the Import step derives it. Do not draw a "sub" source lane in the first version; show "sub" as a track fed by the drums and bass stems.
- A "fit" score: no source for how to compute it (S5 found no parameter-estimation tool). Do not design the chip around a number.
- Vocals: the reference is an electro track; a vocals lane would normally be empty. Keep the lane but allow it hidden.
- A fully separate "Session view" for the matrix: the section matrix already is the Recreation group of the Arrange screen. Not borrowing Ableton's Session grid.

## Build notes (plain HTML/CSS/SVG/JS, no build step)

- Waveform lanes: decode each stem with `decodeAudioData`, precompute min/max peak pairs per pixel column at a few zoom levels once, draw to a `<canvas>` per lane. 200 bars at 126 BPM is about 380 s (the song.js comment says 6:20), so peaks are small (verified: local file studio/song.js comment "200 bars = 6:20 at 126 BPM"). Hundreds of SVG waveforms would be heavy; canvas for lanes and SVG for markers and notes is the split I would use (performance is F-O2's topic).
- Playback of stems: one `AudioBufferSourceNode` per stem, started on the sequencer clock with the downbeat offset (0.58 s per S5's table). Sources are one-shot nodes, so loop-section and seek mean recreating and restarting them at the right offset. The sequencer's lookahead scheduler (25 ms tick, 120 ms lookahead per CLAUDE.md) is the clock to align to.
- A/B: each stem lane and the recreation bus feed their own gain node into the master. A/B ramps two gains with `Kit.target` (setTargetAtTime, which CLAUDE.md says avoids clicks) instead of muting nodes, so both stay in sync. Level match: precompute integrated loudness per stem and per rendered recreation (an `OfflineAudioContext` render exists for export), then store a trim in dB. The level-match default follows the reference-plug-in recommendation (section C).
- `studio/selfcheck.js` uses a fake AudioContext, and CLAUDE.md says any new Web Audio node type needs a matching stub there or the check fails. Buffer sources and gain nodes for stems would need stubs; I have not checked which the fake already has.
- Note editors: one note list `{start (in 16ths), len, midi, vel}`. The step grid reads and writes the existing 16-character pattern strings (and `x`/`X`/`o` accents). The piano roll reads and writes `melody` entries. Off-grid imported notes need a quantise step or a new sequencer path (section F); until then the roll is read-only for off-grid material.
- Section markers: render from `seq.sections` (`{name, start, bars}`), a draggable handle per marker that calls `setArrangement` again. Use CSS grid or absolute positioning with percentage widths so the ruler scales; the 200-bar overview and a zoomed 16-bar view are the same component at different scale.
- Tabs for the bottom panel and the Plan table: plain HTML `<table>`, `role="tablist"` for the tabs; no library needed. The decision chip is a `<button>` with a text label, not colour alone.
- The current 4-column card grid maps onto the Recreation rows with little change: each card already has a name, M and S, and a step row. The Arrange screen replaces the grid; the cards' slider list moves into the Chain tab and device face (F-S2 and F-S4 cover the knobs and the look).

## Recalled, not verified

- That Live's Tab key toggles Session and Arrangement view, and that Live's Clip View has a piano roll with a Fold option and a Drum Rack pad view. Not found in this session's results.
- That Logic's Piano Roll and Step Sequencer are separate editors in the bottom pane, and that Drum Machine Designer exists as a kit-piece instrument (the Step Sequencer excerpt mentions Drum Machine Designer rows; I did not see its own page).
- That Live's Convert Harmony produces a polyphonic MIDI clip with a default instrument (only a forum post, see section B).
- That Logic 11.2 added six-stem Stem Splitter on Mac (S5 cites dj.studio; the Mac text I saw lists four stems).
- That Live's Group Tracks fold and unfold from a triangle on the group header, and that a Logic summing stack folds similarly. I used "collapsible" on that basis; I did not see it stated in these results.
- Typical DAW A/B conventions beyond the reference-plug-in articles (for example Logic's per-plug-in A/B compare button). Not searched.

## Questions for the group

1. F-O2, F-O1: is the analysis bundle (stems, MIDI, tempo/key/section JSON) produced offline in Python and imported, or does the page run separation and transcription itself (S5's question to O2)? It decides whether the Import screen is a file picker or a progress screen, and whether drum MIDI exists at all.
2. F-S5, F-O2: is the sequencer growing arbitrary-timing note events? If not, the piano roll is limited to 16th-grid melody and chord tracks, and imported off-grid MIDI must be quantised on import.
3. F-H5: should section markers be editable on the ruler (the song data is currently static), and should a marker move re-time the stems as well as the patterns?
4. All: is the Source group allowed to push the Recreation tracks below the fold on a laptop screen? The screenshot already needs scrolling for 13 tracks. A collapsed Source group (one thin lane) is the fallback I would pick.

## Sources

Fetched: none (all page fetches failed with `getaddrinfo ENOTFOUND`). Local files read: `/home/user/havantechno/docs/research/2026-10-23-faceplate-layout/BRIEF.md`, `/home/user/havantechno/prd.md` (section 4b), `/home/user/havantechno/docs/research/2026-10-23-plugin-gear/transcripts/round1-S5-stems-transcription.md`, both screenshots in `/home/user/havantechno/docs/screenshots/`, `/home/user/havantechno/studio/song.js`, `/home/user/havantechno/studio/sequencer.js`.

Search excerpts (URLs exactly as they appeared in results; none read by me):

- https://www.ableton.com/en/stem-separation-in-ableton-live/
- https://mixdownmag.com.au/news/ableton-live-12-3-drops-overnight-with-stem-separation-and-splice-integration/
- https://routenote.com/blog/ableton-live-12-3-update/
- https://www.ableton.com/en/live-manual/12/converting-audio-to-midi/
- https://www.kvraudio.com/forum/viewtopic.php?p=7311886 (community forum)
- https://www.soundonsound.com/techniques/ableton-live-clip-slicing
- https://splice.com/blog/?p=425
- https://www.ableton.com/en/packs/sequencers/
- https://support.apple.com/en-is/guide/logicpro/lgcp61bae908/mac
- https://musicradar.com/how-to/stem-splitter-logic
- https://soundonsound.com/techniques/logic-pro-how-use-stem-splitter
- https://support.apple.com/guide/logicpro-ipad/lpip1b60ada3/ipados
- https://support.apple.com/ar-qa/guide/logicpro/lgcpe2fd1b83/mac
- https://www.soundonsound.com/node/4929589
- https://support.apple.com/en-gw/102165
- https://www.soundonsound.com/techniques/logic-pro-using-smart-tempo?amp
- https://support.apple.com/en-ca/102117
- https://www.audeobox.com/learn/logic-pro/logic-pro-step-sequencer/ (third-party guide)
- https://support.apple.com/guide/logicpro-ipad/lpip7bfae625/ipados
- https://www.digitaldjtips.com/?p=2776580
- https://support.serato.com/hc/en-us/articles/7645256113551-Stems
- https://wearecrossfader.co.uk/blog/serato-dj-3-stems/
- https://serato.com/sample/downloads/2.0.0/releasenotes
- https://music.loop.fans/ai/ripx-ai-daw-review-surgical-audio-editing-with-ai-stem-separation (promotional)
- https://www.audiocipher.com/post/ripx-daw (promotional)
- https://www.soundonsound.com/reviews/hitnmix-ripx-deepcreate
- https://www.aiseesoft.com/how-to/isolate-vocals-in-fl-studio.html (third-party tutorial)
- https://slooply.com/blog/how-to-separate-vocals-instruments-in-fl-studio-no-plugins-needed/ (third-party tutorial)
- https://stemsplit.io/blog/fl-studio-stem-separation (competitor vendor, conflicts with the two above)
- https://www.puremix.com/blog/how-to-use-reference-tracks-when-mixing
- https://www.masteringthemix.com/pages/reference-2-manual
- https://gearspace.com/threads/mix-analysis.1392767/ (result title read "What's new"; forum content, shaky)
