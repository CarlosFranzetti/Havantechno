# F-H5: Mixer, transport and arrangement timeline — round 1
Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

## Scope

How Ableton Live and Logic Pro lay out (a) the mixer (track faders, pan, sends, returns, master, meters, solo/mute/arm), (b) the transport bar (play, stop, tempo, position, loop, metronome), and (c) the arrangement timeline (locators, loop brace, section markers, ruler, and how a roughly 200-bar song is navigated). Then a proposal for how Havantechno's transport, its nine sections and its mixer (level, pan, two sends, duck depth per track) could be laid out in plain HTML/CSS/JS.

Budget: all 12 planned searches were used. No page was fetched successfully in this session, so every Ableton and Logic fact below rests on a search excerpt. Where an excerpt's page attribution was only inferred from the search result list, I say so in Sources. Several excerpts come from older versions (Live 9/10/11, Logic 9.1.6 and 10.1, the Logic iPad guide, a 2007 article). Those are marked with their version.

## What I looked at

- BRIEF: `/home/user/havantechno/docs/research/2026-10-23-faceplate-layout/BRIEF.md` (read in full).
- Screenshots (read): `/home/user/havantechno/docs/screenshots/studio-playing.png` and `/home/user/havantechno/docs/screenshots/studio-rack.png`. The BRIEF's `../../screenshots/` path resolves to `docs/screenshots/`, which is where the files are.
- `/home/user/havantechno/studio/song.js` (read in full, 112 lines): nine sections, 200 bars, per-track sends and sidechain data, section `set`, `ramp` and `fx` entries.
- Not read: `studio/studio.js`, `studio/index.html`, `studio/sequencer.js`. The claims about how the UI is built come from the screenshots and `song.js` only.
- Note: `/home/user/havantechno/CLAUDE.md` changed on disk during this session. It now names the studio folder as `olde Havantechno dub studio/` in its serve and selfcheck commands. The BRIEF and the paths in this file use `studio/`, and `studio/song.js` exists and was read. Someone should confirm which folder name is current before round 2 paths are written.
- Web searches (12 of 12): listed under Sources.

## Findings

### A. Ableton Live

**Arrangement timeline and long songs**
- The Overview shows the whole piece. A black outline marks the part on screen. Dragging horizontally scrolls, dragging vertically zooms, and double-clicking inside the outline zooms out to the full Arrangement. (search excerpt: https://www.ableton.com/en/live-manual/12/arrangement-view)
- The beat-time ruler shows bars-beats-sixteenths. Dragging vertically on the ruler zooms, dragging horizontally scrolls, and a pinch gesture zooms. The W key fits the whole song horizontally and the H key fits track heights. Alt/Option plus scroll zooms one track vertically. (search excerpt: https://www.ableton.com/en/live-manual/12/arrangement-view)
- Follow is a switch in the Control Bar (or in the Options menu). It scrolls the view with the song position and pauses after an edit, a horizontal scroll, or a click on the ruler. (search excerpt: https://www.ableton.com/en/live-manual/11/arrangement-view/)
- Locators can be placed at any point in the Arrangement, including during playback or recording with the Set Locator button. They snap to the global quantisation value in the Control Bar. (search excerpt: https://www.ableton.com/en/live-manual/11/arrangement-view/)
- Live 12 Previous/Next Locator buttons launch playback at locators, and the jump between triggered locators follows the global launch quantisation. (search excerpt: https://www.ableton.com/en/live-manual/12/arrangement-view)
- Loop brace: the official excerpts did not describe it. A Sound On Sound guide (Live-era not stated) describes a loop brace with locators labelled 1 and 2 at its ends. Attribution of that excerpt to a page is inferred, not confirmed: https://www.soundonsound.com/techniques/ableton-quick-start (search excerpt, page not confirmed). The official loop brace section was not found.

**Control Bar (transport and tempo)**
- In Live 12, the Control Bar is the strip holding transport and tempo controls, plus controls for scale and MIDI settings, CPU monitoring, and switching between Session and Arrangement. (search excerpt: https://www.ableton.com/en/live-manual/12/live-concepts/)
- The tempo and metronome group holds the Link control, the Set's tempo and time signature, metronome customisation, and Tempo Follower on/off. (search excerpt: https://www.ableton.com/en/live-manual/12/live-concepts/)
- Transport is play/stop plus Arrangement record. The Follow and Arrangement Position group shows and adjusts the current Arrangement position. (search excerpt: https://www.ableton.com/en/live-manual/12/live-concepts/)
- The metronome options themselves were not found in the excerpts.

**Mixer (track faders, sends, returns, master, crossfader)**
- The Mixer section sits in the Arrangement view as well as Session. A Live 12 forum moderator says the Arrange View mixer is the same Mixer as Session, so send controls for return tracks appear there too. (search excerpt: https://forum.ableton.com/viewtopic.php?p=1817980)
- The Mixer section is on by default and holds faders with pan, output meters, and mute, solo and record buttons. (search excerpt, Live version not stated: https://www.musicgurus.com/courses/learn-ableton-live-9-essentials-with-madeleine-bloom-sonic-bloom/lessons/guide-to-ableton-live-user-interface)
- The Send section is on by default and has two Return tracks plus a send knob per track. Sends start at zero. A per-send pre/post-fader setting is applied from the Master track. (search excerpt, from a third-party guide, Live version not stated: https://www.musicgurus.com/courses/learn-ableton-live-9-essentials-with-madeleine-bloom-sonic-bloom/lessons/guide-to-ableton-live-user-interface)
- The crossfader is hidden by default. Clicking the x symbol to the right of the Master track reveals it. Tracks are assigned to A, none or B, and the fader blends the two groups. The curve can be changed by right-clicking the fader (seven shapes). This comes from a 2007 Sound on Sound article, so it is old. (search excerpt: https://www.soundonsound.com/node/4910446, attribution inferred from the result list)
- Cue on the Master channel swaps the track Solo buttons for Cue buttons. Cued tracks go to a Cue Out, and that volume uses a Preview/Cue knob on the Master section. This is from a Numark DJ|iO setup document with no Live version stated. (search excerpt: https://www.numark.com/images/product_downloads/djio___setup_with_ableton_live.pdf)
- Master meters: not found. The only meter in the excerpts is the global CPU meter.

**Track state: solo, mute, arm**
- Track Activator: switching it off silences the track output. With several tracks selected, toggling one toggles all. A third-party course on Live 10 says the activator works the opposite way from a mute button: enabled means audible. (search excerpt, Live 10 third-party: https://origin-www.lynda.com/Ableton-Live-tutorials/Track-controls/642460/737654-4.html)
- Solo mutes every other track and can also be used for cueing. Only one track can be soloed at a time unless Ctrl (Win) or Cmd (Mac) is held, or the Exclusive Solo preference is off. (search excerpt, Live 11 mixing chapter: https://www.ableton.com/en/live-manual/11/mixing/)
- Arm: an armed track is enabled for recording. Exclusive Arm in the Record/Warp/Launch preferences limits arming to one track at a time. This comes from the Spanish Live 11 manual, so the English wording was not checked. (search excerpt: https://www.ableton.com/es/live-manual/11/mixing/)
- A user-reported Live 9-era forum thread says solo states do not appear in Arrangement automation lanes, while mute states can be automated. Not official. (search excerpt: https://forum.ableton.com/viewtopic.php?p=1559411)
- The excerpts name the controls but do not describe their on-screen look. Whether the buttons are shown as lit, coloured or outlined was not found.

### B. Logic Pro

**Mixer (channel strips, sends, aux, meters)**
- The Mixer shows a channel strip for every track, plus aux, output and master strips. Busses and sends control signal flow. (search excerpt, Logic Pro 10.1 Mac help: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc43f6.html)
- Aux strips work as send returns, as subgroups, and as output destinations. Bus strips are described as kept mainly for older projects. (search excerpt, Logic Pro 9.1.6 Mac manual: https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_27_section_3.html)
- Sends view (iPad guide): see a track's sends, add sends, pick or create a bus, and adjust send levels. The iPad layout may differ from the Mac. (search excerpt: https://support.apple.com/en-jo/guide/logicpro-ipad/lpipd72a60da/ipados)
- Meter colours (Mac 10.1): amber and yellow are safe; red marks hot levels, and an occasional red peak is fine unless the clipping indicator stays lit. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp8e96d97b.html, page attribution inferred)
- Clipping indicator (iPad guide): the numeric peak display lights red on output strips and orange on other strips when the signal goes above 0 dB. Tapping the display resets it. The Mac reset behaviour was not confirmed. (search excerpt: https://support.apple.com/en-my/guide/logicpro-ipad/peak-level-display-and-clipping-lpip44ffab9d/1.0/ipados/16.0)
- Meter scale (Mac): two scales can be chosen under Preferences > Display after Show Advanced Tools is enabled in the Advanced pane. The Exponential option gives finer resolution in the upper range. (search excerpt, page attribution inferred: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp8e96d97b.html)
- Third-party training site: Logic meters default to post-fader; pre-fader metering shows the signal regardless of fader position. (search excerpt, third-party: https://logicstudiotraining.com/logic-pro-mixing-metering-and-loudness-explained/)

**Track headers: solo, mute, record enable**
- By default, Mute, Solo and Record Enable buttons appear on all tracks, with an Input Monitoring button on audio tracks. Track header controls can be shown or hidden, and the headers can be resized. (search excerpt: https://support.apple.com/en-ng/guide/logicpro/lgcpe53c68af/mac)
- Track header volume, pan, mute and solo correspond to channel strip controls in the Mixer, so changing one changes the other. (search excerpt: https://support.apple.com/en-ng/guide/logicpro/lgcpe53c68af/mac)
- Soloing a track isolates it and mutes all other tracks. Track and strip solo states are independent unless the tracks share a strip destination, in which case soloing the strip solos them all. Command+Option clicking a mute button mutes all tracks sharing that strip. (search excerpt, Logic Pro 9.1.6 and 10.1 manuals: https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_9_section_13.html)
- Click and drag across track header buttons sets the same state on each track swiped over. (search excerpt, Mac guide, version not stated: https://support.apple.com/en-ng/guide/logicpro/lgcpe53c68af/mac)

**Timeline: ruler, cycle, markers, LCD**
- Arrangement markers (Mac) define sections such as intro, verse and chorus. They sit on an arrangement track at the top of the Tracks area, shown via Global Tracks (Track menu, or the G key). Each marker starts where the previous one ends, with no gap. (search excerpt: https://support.apple.com/en-bh/guide/logicpro/lgcpf7c0c09c/mac)
- Every linear editing window has a Bar ruler at the top. It shows markers and locators and reflects time signature changes. Global tracks, including the Marker track, sit just below it. (search excerpt, Logic Pro 9.1.6: https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_3_section_11.html)
- Cycle area: dragging across the upper part of the Bar ruler creates a cycle and turns Cycle mode on. The cycle shows as a stripe in the ruler. The colour is described as green in 9.1.6 and yellow in newer versions. (search excerpt: https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_5_section_6.html for the green stripe; yellow from a newer Apple page, page not confirmed)
- Left and right locators mark the cycle's start and end and hide when Cycle mode is off. (search excerpt: https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_5_section_6.html, attribution inferred)
- LCD: the LCD's pop-up can be set to Custom to show the left and right locator positions in beats and time formats. The control bar can also hold buttons to set, go to or start playback from the locators, and to swap them for a skip cycle. (search excerpt, Apple Logic Pro help, exact page not confirmed)
- Cycle from marker: the Marker List has commands to set the locators to a marker and enable the cycle. Holding Command while dragging a marker up into the top of the Bar ruler sets a cycle with the same position and length. Dragging a cycle down into the Marker track creates a marker. (search excerpt, Apple Logic Pro help, page not confirmed)
- On iPad, double-tapping a marker and tapping Set Cycle sets the cycle to the marker's length. Markers cannot overlap. (search excerpt: https://support.apple.com/guide/logicpro-ipad/lpipcf2eb4a7/ipados, iPad only)

### C. Havantechno as it is now (from screenshots and song.js)

- Top bar (screenshot, verified): title "aasssMaster STUDIO", a guidance label, a Pause/Stop pair, a BPM field (126), a swing slider (0.06), a position readout ("bar 42 · step 9 · mainA"), a single master level bar on the right, two export buttons ("Export section WAV", "Export song WAV"), and a status line ("engine ready · 200 bars · 381 s"). The 381 s is consistent with 200 bars at 126 BPM (200 × 4 × 60 / 126 ≈ 381 s).
- Section chips row (screenshot, verified): nine chips, each with its length in bars (intro 16, intro2 8, build 16, mainA 32, mainA2 32, break 24, breakEnd 8, mainB 48, outro 16), plus a "loop section" checkbox. The chips are a horizontal list. They have no lengths drawn to scale, and there is no ruler, no loop brace and no locator.
- Track grid (screenshot, verified): 13 cards in four columns (kick, sub, bass, stab / clap, hat_open, hat_closed, shaker / perc, lead, pad, riser / impact). Each card has M and S buttons, a 16-step row with the playhead outlined in green, five sliders (level, pan, send delay, send reverb, duck depth), and a collapsed "synth parameters" panel. Some cards also show "inserts: eq" or "inserts: width". There is no arm button and no per-track meter.
- Processors panel (screenshot, verified): a row of panels titled "processors: sends and master", with send delay, send reverb, master eq3, master hp and lp filters, master glue, saturator and limiter, each with its own sliders.
- Sections in `song.js` (read, verified): bars sum to 200 (16+8+16+32+32+24+8+48+16). Start bars, counting from 1: intro 1, intro2 17, build 25, mainA 41, mainA2 73, break 105, breakEnd 129, mainB 137, outro 185. The playhead readout "bar 42" falls in mainA, which matches.
- Per-section data in `song.js` (read, verified): `set` values (e.g. `stab.cutoff`, `kick.level`, `clap.level`), `ramp` curves (e.g. `master.hp.cutoff` from 24 to 180 in build), and `fx` entries (riser or impact hits). The `fx` bars look relative to section start: the mainA impact is at bar 0 (absolute 41), the mainA2 riser at bar 28 (absolute 101), and the mainB riser at bar 44 (absolute 181). The relative reading is assumed and has not been checked against `sequencer.js`.
- Duck naming (read, verified): the screenshot calls it "duck depth". `song.js` stores it as `sidechain: { depth, release }` per track, while the kick also has a `duck` list naming bass, stab, pad and lead. Two representations for one control.
- Sends (read, verified): two global sends, `delay` and `reverb`, defined in `song.js`. Each track gets a per-track amount, e.g. stab delay 0.15 and reverb 0.1, lead delay 0.35 and reverb 0.18, pad reverb 0.4.

### D. Comparison for a 200-bar arrangement and section boundaries

| Need | Ableton Live (search excerpts) | Logic Pro (search excerpts) | Havantechno now |
|---|---|---|---|
| Whole-song overview | Overview strip with a box for the visible part; double-click to zoom out | Not found for the Arrangement; ruler scrolls and zooms | None; section chips in a row |
| Section boundaries | Locators (set anywhere, quantised); loop brace (official text not found) | Arrangement markers abutting on an arrangement track; Marker track in global tracks | Chips only, not drawn to scale |
| Loop range | Loop brace (official text not found); locators | Cycle area in the ruler, with left and right locators | "loop section" checkbox |
| Position readout | Arrangement Position field in the Control Bar | LCD, with locator positions on Custom | "bar 42 · step 9 · mainA" |
| Solo | Exclusive by default; Cmd/Ctrl for multi | Solo isolates and mutes others; strip solo linked | S button per card |
| Mute | Activator on/off | Mute on track and strip; Cmd+Opt for shared strip | M button per card |
| Arm | Arm, exclusive by default (Live 11, Spanish) | Record Enable on each track header | None (no recording) |
| Meters | Mixer output meters (per excerpt); master meters not found | Segmented meters, clip indicator, peak display, tap to reset (iPad) | One master bar |

## What Havantechno could borrow

- Logic's clip indicator on the output strip (red when above 0 dB, resets on click) is a small, clear way to show the master clipping. Havantechno has only one master bar and no clip cue.
- Ableton's Overview strip, with a box for the visible window, is the clearest answer to 200 bars. A thin full-song bar above the arrangement, with the visible window marked, would do this in CSS.
- Logic's arrangement markers that abut with no gap map directly onto the nine `sections` entries. Each section becomes one block whose width is its bar count.
- Logic's cycle area in the ruler matches the existing "loop section" checkbox. Instead of a checkbox, the selected section can be given a brace over the ruler.
- Ableton's Control Bar grouping (transport, then tempo, then Follow and position) suggests the top bar can be split into three groups: transport buttons, BPM and swing, and the position readout.
- Logic's track header rule (track and strip controls linked, so changing one shows in the other) is a model for the per-track M/S buttons on the card and in any mixer strip.

### Proposed layout: "Console Strip" (my one concrete suggestion)

Three bands, top to bottom: transport, arrangement timeline, mixer. The instrument and effect faces (F-H3, F-H4) sit behind the strips and open from them. The mixer shows only what the strip needs.

```
+------------------------------------------------------------------------------+
| TRANSPORT  [> play] [# stop]  BPM [126]  swing [0.06]  POS 042 . 09 mainA    |
+------------------------------------------------------------------------------+
| OVERVIEW  [===|##########|=============================================]       |
|                ^ visible window: drag to scroll, wheel or pinch to zoom      |
+------------------------------------------------------------------------------+
| RULER      1      17     25         41          73          105  129 137 185 |
| SECTIONS   |intro16|i2 8|build 16|   mainA 32 |  mainA2 32  |brk24|bE8|mainB 48|out16|
| LOOP       .........[==== mainA: loop brace ====]............................ |
| PLAYHEAD   .................................^ bar 42                          |
| FX HITS    R(37)        I(41)          R(101)          R(129)  I(137)  R(181)  |
+------------------------------------------------------------------------------+
| MIXER   kick | sub | bass | stab | clap | hat_o | hat_c | shaker | perc | lead ... |
|         [M][S]  per strip, same as the current cards                          |
+------------------------------------------------------------------------------+
```

One channel strip (one per track; the 16-step row stays in the track lane):

```
 +---------+
 | kick    |   name
 | [M] [S] |   mute, solo (as now)
 |  | |    |   level fader (vertical)
 |  (o)    |   pan knob
 |  (o)    |   send 1: dly  -> DELAY return
 |  (o)    |   send 2: rev  -> REVERB return
 |  [==]   |   duck depth (one name, one control)
 +---------+
  RET DLY  RET REV  MASTER (peak meter, clip lamp)
```

Why this shape: Ableton's Control Bar groups transport, tempo and position, so the top band follows that split. Logic's Bar ruler and cycle area in the ruler suggest the timeline. Logic's aux strips are the model for DELAY and REVERB as returns on the right. The 200-bar length is handled by the overview, as in Ableton. The two sends are named by effect (dly, rev), not A/B, because the studio has two named sends and no third.

## What would not fit (and why)

- Ableton's Session view and clip launching. Havantechno's content is a 16-step pattern per track plus a fixed arrangement, not clips that can be launched freely.
- Logic's Live Loops grid. The same reason as above.
- Arm buttons per track. Havantechno does not record, so an arm would show a state that does nothing. Add arm only with a recording or input feature.
- A full Ableton-style crossfader (A/B assignment). The studio has no DJ-style groups, so it would be an unused control. The Cue Out idea is also DJ-oriented and does not fit yet.
- Logic's full Mixer window with many aux strips. Havantechno has two named sends and one master, so a wide mixer with empty strips adds noise.
- A 200-bar ruler drawn at phone width without scrolling. A 360 px wide phone gives about 1.8 px per bar, too small for section names, so the arrangement needs a zoom or overview, as Ableton does.

## Build notes (plain HTML/CSS/SVG/JS, no build step)

- Arrangement blocks: one flex row with each section's `flex-grow` set to its bar count (16, 8, 16, 32 and so on). The width then follows the bars with no canvas. Section colour can come from a CSS custom property per section (for example, the sections that carry `ramp` data).
- Playhead and loop brace: absolutely positioned divs. Their `left` is the current bar divided by 200, as a percentage. Update them from `requestAnimationFrame` using the current bar the sequencer already reports (the readout suggests one exists; `sequencer.js` was not read, so this is unverified).
- Overview strip: a 200-bar thin bar with a child div for the visible window. Scroll moves the child. Clicking jumps the view.
- Channel strip (one per track): a vertical `input type="range"` for level (vertical via `writing-mode: vertical-lr`, unverified across browsers), a pan knob (SVG arc, or a range input), two send knobs for delay and reverb, and a duck slider. Put M and S as buttons above the fader, as in the current cards.
- Meters: an `AnalyserNode` per strip (or on the master only, to start), read on `requestAnimationFrame`. Clip lamp when the peak is above 1.0 in linear terms. A peak-hold value can be reset on click, as in Logic's iPad guide.
- `selfcheck.js`: `CLAUDE.md` says the self-check uses a fake AudioContext, so any new node type (for example `AnalyserNode`) needs a matching stub or the check fails. This is a repo fact from `CLAUDE.md` (read, verified by file).
- Duck data: settle on one name before the UI is built. The screenshot says "duck depth" and `song.js` says `sidechain.depth`. Pick one in the data and use it in the label.
- Mobile: the track strips sit in a horizontally scrolling row with a 16 px side gutter, and the arrangement uses the overview strip so the full 200 bars never need to be on screen at once.

## Recalled, not verified

- Ableton's loop brace, its default colour and how it is dragged. (not in any official excerpt I saw)
- Ableton's return tracks are named A, B, C by default, and Live shows the Return strip letter on its send knob. (unverified)
- Ableton's master meter location and look. (unverified; not found in search)
- Logic's aux strip default naming. (unverified)
- The Logic Mac Cycle area colour in the current version (excerpts disagree: green in 9.1.6, yellow in newer). (unverified which is current)
- Vertical `writing-mode` range inputs work in current Chrome, Firefox and Safari. (unverified; not checked)
- Havantechno's `fx` bar values are relative to section start. (unverified; `sequencer.js` not read)

## Questions for the group

- Should the mixer be a vertical strip row (level, pan, delay send, reverb send, duck, M/S per track) with the 16-step row kept in the track lane, or should sends and duck stay on each instrument's own face (F-H3, F-H4) so the mixer shows only level, pan, M and S?

## Not covered (search budget)

- Ableton master meters, and the official Ableton loop brace section.
- The Ableton Live 12 metronome settings page (only the group summary was seen).
- Logic's Mac sends view (only the iPad guide was seen) and Logic's Mac LCD defaults.
- Fetching any of the pages above. Every fact here rests on a search excerpt, and the excerpts' page attribution is partly inferred, as marked.

## Sources

Search excerpts (no page was fetched in this session):
- https://www.ableton.com/en/live-manual/12/arrangement-view
- https://www.ableton.com/en/live-manual/11/arrangement-view/
- https://www.ableton.com/de/live-manual/12/arrangement-view/
- https://www.soundonsound.com/techniques/ableton-quick-start (loop brace; page not confirmed)
- https://www.ableton.com/en/live-manual/12/live-concepts/
- https://www.ableton.com/en/live-manual/11/mixing/
- https://www.ableton.com/es/live-manual/11/mixing/
- https://forum.ableton.com/viewtopic.php?p=1817980
- https://www.soundonsound.com/node/4910446 (crossfader, 2007 article; attribution inferred)
- https://www.numark.com/images/product_downloads/djio___setup_with_ableton_live.pdf
- https://www.musicgurus.com/courses/learn-ableton-live-9-essentials-with-madeleine-bloom-sonic-bloom/lessons/guide-to-ableton-live-user-interface (third-party)
- https://origin-www.lynda.com/Ableton-Live-tutorials/Track-controls/642460/737654-4.html (third-party, Live 10)
- https://forum.ableton.com/viewtopic.php?p=1559411 (user-reported, Live 9 era)
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc43f6.html
- https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_27_section_3.html
- https://support.apple.com/en-jo/guide/logicpro-ipad/lpipd72a60da/ipados (iPad)
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp8e96d97b.html (page attribution inferred)
- https://support.apple.com/en-my/guide/logicpro-ipad/peak-level-display-and-clipping-lpip44ffab9d/1.0/ipados/16.0 (iPad)
- https://logicstudiotraining.com/logic-pro-mixing-metering-and-loudness-explained/ (third-party)
- https://support.apple.com/en-ng/guide/logicpro/lgcpe53c68af/mac
- https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_9_section_13.html
- https://support.apple.com/en-bh/guide/logicpro/lgcpf7c0c09c/mac
- https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_3_section_11.html
- https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_5_section_6.html
- https://support.apple.com/guide/logicpro-ipad/lpipcf2eb4a7/ipados (iPad)

Local files (read in this session):
- `/home/user/havantechno/docs/research/2026-10-23-faceplate-layout/BRIEF.md`
- `/home/user/havantechno/docs/screenshots/studio-playing.png`
- `/home/user/havantechno/docs/screenshots/studio-rack.png`
- `/home/user/havantechno/studio/song.js`
- `/home/user/havantechno/CLAUDE.md` (the `selfcheck.js` fake AudioContext note)
