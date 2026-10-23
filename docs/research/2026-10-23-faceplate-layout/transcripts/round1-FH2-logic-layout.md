# F-H2: Logic Pro main layout — round 1
Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

## Scope

Apple Logic Pro for Mac, main window: Tracks area, Inspector and its two channel strips, Library, Editors pane (Piano Roll, Step Sequencer, Audio editor), Mixer, plug-in windows (floating window vs Controls view), Smart Controls, Live Loops, markers and the ruler for a long arrangement. Visual style noted where I could. Target for the comparison: the current `studio/index.html` and `studio/studio.js` page, as shown in the two screenshots.

Version caveat: most Apple search excerpts come from the Logic Pro 10.1 help (2019-era), the 9.1.6 manual, and the iPad guide. Menu names and placement may differ in current Logic. Where a fact is iPad-only or from an older version, the text says so.

Fetch caveat: both page fetches failed in this sandbox (`getaddrinfo ENOTFOUND support.apple.com`). Every Logic fact below therefore rests on a search excerpt, marked `(search excerpt: <url>)`, or is `(unverified)`. Facts about the Havantechno page were read from the local screenshots and are marked `(verified: local screenshot ...)`.

Search budget: 12 web searches used (the plan's maximum), 2 failed page fetches. Not reached: the Mac Score Editor and Audio File editor (no excerpt found), whether the Mac Mixer sits below the Tracks area as a pane (not confirmed), the current Mac visual style (no search covered it), and the exact default Smart Controls knob count (not found).

## What I looked at

- Local screenshots: `docs/screenshots/studio-playing.png` and `docs/screenshots/studio-rack.png` (the BRIEF's `../../screenshots/` resolves to `docs/screenshots/`).
- Apple Logic Pro help and user guide excerpts (Mac, 10.1 / 10.4 / 9.1.6 / 12.3 table of contents), the iPad user guide (indicative only), Apple support articles on Live Loops and the Step Sequencer, one Sound On Sound tutorial, one Berklee guide, and one Apple community thread. The exact list is in Sources.

## Findings

### F1. The main window is a set of named areas

- Tracks area: where audio and MIDI regions are recorded, arranged, and built into a project. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp2a07a994.html)
- Track List: the left column of the Tracks area, one row per track. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp2a07a994.html)
- Inspector: contents change with the working area that has focus and with the selection. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp2a07a994.html)
- Library: prebuilt patches. What it shows depends on the kind of channel strip chosen in the Track List. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp2a07a994.html)
- Editors: a set of editors for individual tracks and regions. The editor shown depends on the type of track or region selected. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp2a07a994.html)
- Control bar: transport, and buttons that show and hide the other areas (Inspector, Library, Editors, Mixer, Smart Controls). (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc403a.html; the Smart Controls button position is from search excerpt: https://www.soundonsound.com/techniques/smart-controls)
- Quick Help: a panel at the top of the Inspector that describes whatever the pointer is over. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp2a07a994.html)

Sketch A. Logic main window, contents from the excerpts above. Exact positions of Library and Inspector are recalled, not verified.

```
+----------------------------------------------------------------------------+
| CONTROL BAR  transport | position | [Inspector][Library][Editors][Mixer]    |
|                        |          |                [Smart Controls]         |
+-------------+----------+----------------------------------------------------+
| INSPECTOR   | LIBRARY  | TRACK LIST | BAR RULER  1    5    9   13   17 ...  |
| (upper:     | (patches | 1 Inst     | MARKER TRACK  [Intro][Verse]  [Hook]  |
|  track      |  for the | 2 Drums    | Region  ====      ======              |
|  settings,  |  current | 3 Bass     | Region        ===     ====            |
|  Quick Help)|  strip   | ...        | ...                                    |
| (lower:     |  type)   |            |             playhead |                 |
|  channel    |          |            |                                        |
|  strips:    |          |            |                                        |
|  [track][out]|         |            |                                        |
+-------------+----------+------------+----------------------------------------+
| EDITORS PANE (below Tracks area): Piano Roll | Step Sequencer | Audio      |
|   shows whatever is selected in the Tracks area or Live Loops              |
+----------------------------------------------------------------------------+
```

### F2. The Inspector shows two channel strips

- The lower part of the Inspector holds the channel strip for the selected track and the channel strip for its output, so you can view and edit channel strip parameters and plug-ins there. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp2a07a994.html)
- The right-hand strip shows the output by default. It can show an aux used by the left strip, if one exists. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc3b1d.html and https://library.berklee.edu/node/346546, a third-party guide that describes the same behaviour)
- The Inspector strips hold a reduced set of the parameters in the full channel strip. Level, pan, sends, inserts, effects and audio routing can be edited there without opening the Mixer. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc3b1d.html)
- Shown with the Inspector button in the control bar, View > Show Inspector, or the I key. An individual inspector can be dragged out of the main window by its title bar. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc3b1d.html)

### F3. The Editors pane sits below the Tracks area, and its content follows the selection

- The Piano Roll opens as a pane below the Tracks area, or as a separate resizable window. It opens from the Editors button or View > Show Editors. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpa9111b0d.html and https://help.apple.com/logicpro/mac/10.4/en.lproj/lgcpa9111b0d.html)
- Piano Roll layout: notes are coloured bars on a time grid. Quantize, pitch and velocity controls sit on the left. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpa9111b0d.html)
- The Editors area switches editor with the selection: an audio region brings up the Audio editor, and a Step Sequencer pattern region brings up the Step Sequencer. This is from the iPad guide, so it is indicative only for the Mac. (search excerpt: https://support.apple.com/guide/logicpro-ipad/lpipd9859eae/ipados)
- Step Sequencer on Mac (Apple support article): start with a Software Instrument or External MIDI track and open the Step Sequencer from the Editors button. A pattern region is made by Control-clicking an empty part of the Tracks area and choosing Create Pattern Region. Rows are kit pieces, notes, or automation data. Step rate, playback mode and pattern length are pop-up menus. If a region is shorter than the pattern, not every step plays. (search excerpt: https://support.apple.com/HT211026)
- Score Editor and Audio File editor on Mac: not found (no excerpt).

Key point for Havantechno: in Logic the step pattern is a region on the timeline. The 16-step grid is an editor opened from that region, not a card in a page of identical cards.

### F4. The Mixer is a set of channel strips, opened separately

- Channel strips for every track, plus aux, output and master strips. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc43f6.html)
- Opened by the Mixer button in the control bar, View > Show Mixer (X), or Window > Open Mixer (Command-2). (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc43f6.html)
- View buttons switch between Single, Tracks and All views. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc43f6.html)
- Channel strip parts (from the iPad guide, indicative only): plug-in slots, send slots, a pan knob, a volume fader, mute, solo, and a name and number label. When the Mixer fills most of the window, the track for the selected strip appears above it. (search excerpt: https://support.apple.com/guide/logicpro-ipad/lpip1454fa06/3.0/ipados/26)
- Whether the Mac Mixer sits as a pane below the Tracks area or only in its own window: unverified.

Sketch B. Logic Mixer, contents from the excerpts above. The placement is unverified.

```
+------------------------------------------------------------------------------+
| view buttons: [Single] [Tracks] [All]                                         |
+--------+--------+--------+--------+--------+--------+---------+-------------+
| ch 1   | ch 2   | ch 3   | aux    | ...    | ...    | OUTPUT  | MASTER      |
| name 1 | name 2 | name 3 | name A |        |        | name    | name        |
| [ins]  | [ins]  |        |        |        |        | [ins]   | [ins]       |
| [send] | [send] |        |        |        |        |         |             |
| (pan)  | (pan)  | (pan)  |        |        |        |         | (pan)       |
| |fader |  |fader |  |fader |  |fader |        |        |  |fader |   |  |fader |
| M  S   | M  S   | M  S   |        |        |        |         |             |
+--------+--------+--------+--------+--------+--------+---------+-------------+
```

### F5. Plug-in windows: floating or Controls view

- Clicking the centre of a plug-in slot opens its plug-in window. The window opens automatically when a plug-in is inserted, and this can be turned off in Preferences > Display > Mixer. (search excerpt: https://help.apple.com/logicpro/mac/10.4/en.lproj/lgcpbc21a1fd.html)
- Two views. Editor view shows the plug-in's graphical interface, if it has one. Controls view shows every function as a horizontal slider, with a numeric field to the left of each parameter. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html)
- Window header: resize, link windows, switch parameter view, route side-chain signals. In Single mode, one window shows all open plug-ins, and the Link button turns purple. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html)
- Hidden parameters are opened from a disclosure triangle at the bottom-left of the window. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html)
- Floating behaviour: the 9.1.6 manual says floating windows stay in the foreground, and that the plug-in window has a different title bar from other floating windows. (search excerpt: https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_4_section_1.html)
- Default view: Apple's accessibility guide says plug-ins can be set to open in Controls view in Preferences > Display > Mixer. A community post says that setting moved to an Accessibility tab in General preferences in Logic Pro 10.6. (search excerpt: https://support.apple.com/en-uz/101781 and https://discussions-cn-prz.apple.com/thread/252482509)
- Double-click gesture: not found. The documented gesture is a single click on the slot.
- Smart Controls are presented as a way to adjust parameters "without having to clutter your workspace with open plug-in windows". (search excerpt: https://www.soundonsound.com/techniques/smart-controls)

### F6. Smart Controls: one track, a few knobs, mapped parameters

- A simplified set of on-screen controls for the selected track. They cover channel strip and plug-in parameters. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp2a07a994.html)
- Each knob can be mapped to one or more parameters on the selected track. Mapping uses a Learn button or the Parameter pop-up in the Smart Control inspector. The Learn workflow is: open the Parameter Mapping area, click Learn, click the plug-in parameter, click Learn again to finish. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp076273cd.html)
- Mapping needs at least one plug-in on the track. The automatic option can map all controls or only unmapped ones. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp6deeba65.html)
- Smart Controls can only reach parameters of the track they are attached to. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp076273cd.html)
- Newer guides say the mapping features are gated by "Enable Complete Features" in Logic Pro > Settings > Advanced, where older guides say "Show Advanced Tools". (search excerpt, from the marker search results; the page that states this was not pinned to a single URL, so treat the setting name as unverified for current Logic)
- Default number of knobs: not found (unverified).

### F7. Live Loops: a grid of cells beside the Tracks area

- The grid is made of cells. Each cell holds a short phrase or loop. Regions from the Tracks area can be copied into cells, and audio or MIDI can be recorded straight into a cell. (search excerpt: https://support.apple.com/en-us/HT211140)
- Trigger one cell, or launch a whole column, which Apple calls a scene. (search excerpt: https://support.apple.com/en-us/HT211140)
- The Live Loops Grid and Tracks View buttons can be shown together. A divider between them has buttons to activate cells or tracks. (search excerpt: https://support.apple.com/en-al/102113)
- On any one track, either the grid cells or the Tracks area regions play. Cells take priority. Stopping a cell does not bring the regions back. (search excerpt: https://support.apple.com/en-al/102113)
- The Cell Editor opens below the grid and the Tracks area, and shows a cell's regions. The Cell inspector sets loop start and end, cell length and play mode. (search excerpt: https://support.apple.com/en-al/102113)
- Apple suggests recording and arranging in the Tracks area first, then dragging regions into cells to build sections. (search excerpt: https://support.apple.com/en-al/102113)
- The article applies to Logic Pro for Mac 10.5 and later. (search excerpt: https://support.apple.com/en-us/HT211140)

### F8. Markers and the ruler for a long project

- The Bar ruler shows markers, locators and time-signature changes. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp0ec9fc09.html)
- The Marker track is in the Global Tracks area. It opens with the disclosure triangle or the G key. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp0ec9fc09.html)
- Jump to a marker: Option-click it in the Marker track, Command-click it in the Bar ruler, or click it in the Marker List. (search excerpt: https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_6_section_9.html)
- Key commands: Go to Marker Number 1 to 20 (numbered in project order), Go to Previous Marker, Go to Next Marker. (search excerpt: https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_6_section_9.html)
- Command-drag a marker up into the top of the Bar ruler to make a cycle with the marker's position and length. (search excerpt: https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_6_section_9.html)
- The Marker List shows names, bar positions and lengths in an editable list. It opens from the Lists button (tab K) or Navigate > Open Marker List. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp0ec9fc09.html)

### F9. Visual style: not covered by search

- No search returned anything about Logic's current visual style, its depth, or the look of plug-in skins. The contrast "flatter main window vs skinned plug-in panels" is recalled, not verified. See the Recalled section.

### F10. The Havantechno page today (verified: local screenshots)

- `studio-playing.png`: a top bar with the title, Pause and Stop, BPM, swing, a "bar 42 · step 9 · mainA" readout, and export buttons. Below it, a row of nine section chips (intro 16, intro2 8, build 16, mainA 32, mainA2 32, break 24, breakEnd 8, mainB 48, outro 16, adding to 200 bars) and a "loop section" checkbox. Below that, 13 identical cards in a 4-wide grid (kick, sub, bass, stab, clap, hat_open, hat_closed, shaker, perc, lead, pad, riser, impact). Each card has a name, M and S buttons, a 16-step row with lit steps, and five sliders (level, pan, send delay, send reverb, duck depth). Each card ends with a "synth parameters" disclosure. Bass shows "inserts: eq" and stab shows "inserts: width". There is no timeline, no ruler, no marker track and no separate mixer.
- `studio-rack.png`: a panel titled "processors: sends and master" with eight cards (send delay, send reverb, master eq, master hp, master lp, master glue, master sat, master limiter). Each has sliders with numeric readouts, and some have a bypass button. These are the same kind of slider list as the Controls view in F5, without the device artwork.

Mapping to Logic, in one line each: the track cards are a Mixer strip plus a pattern editor plus an Inspector, all in one card. The processor cards are Controls views with no Editor view.

## What Havantechno could borrow

1. Split the single grid into areas with one job each, as in Logic. Keep a top control bar (transport, BPM, swing, position readout, section jump). Add a Tracks area: one lane per track across the 200-bar arrangement, with the 16-step pattern as a pattern region on the lane. Add a Mixer view for level, pan, sends, mute and solo. Add an Editors pane at the bottom that shows the editor for the current selection. This is the main structural lesson.
2. Make the step pattern a region, and open its 16-step grid in the Editors pane (the Step Sequencer model in F3). The lane shows where the pattern plays. The pane shows what it plays. This removes the need for the M/S and 16-step row to share a card with five sliders.
3. Keep the current slider list as the generic Controls view for every device (F5). Add each device's own face as its Editor view. Every device then works before it has custom artwork, and the faces can be built one at a time. This is the clearest way to give each device its own look without breaking the others.
4. Show the selected track's Inspector with two strips: the track's channel strip, and the strip of its output (the master, for now) (F2). Put the Smart Controls idea here too: a row of a few macro knobs for the selected track, each mapped to parameters of that track's devices (F6). This suits the remix stems later, because the knobs stay local to one track.
5. Use a bar ruler and a marker track for the 200-bar arrangement (F8). The nine section chips become markers on the ruler, with Next and Previous Section keys (Logic's Go to Next Marker model) and a Command-drag-style cycle over a section. A marker list is cheap and helps with the long timeline.
6. Live Loops, later and optional: a grid of cells, one row per track and one column per section, to launch sections or loops in a live way (F7). Logic's rule that cells take priority over regions per track is a useful model for the remix pipeline, where a stem could be played from the grid or from the arrangement but not both. Defer until the arrangement works.

## What would not fit (and why)

- Floating device windows. Logic's floating plug-in windows need drag, z-order and focus handling. Logic itself offers Smart Controls to avoid window clutter (F5). With 23 devices and a plain-JS page, the cost is high and the benefit is low. Use one editor slot instead.
- Logic's full docking model (Library, Inspector and Editors each hidden or shown from the control bar, undocked windows). A few toggles are fine. A full docking system is too much for a page with no framework.
- The full Piano Roll and Score Editor. Havantechno has no MIDI regions yet. These are for the later MIDI stage of the remix pipeline, not for the first layout.
- The complete Live Loops grid with free clip launching. Havantechno's sections are a fixed 200-bar arrangement, so free launching is not needed yet.
- Heavy skeuomorphism across the whole page. Logic's plug-in panels look skinned (recalled, unverified). Putting that depth on the main window would fight the flat dark theme the studio already has. Use depth only inside a device face.
- Identical equal cards for everything. This is the current problem. Logic does not use it, because Logic's track list, Mixer strips and editors are all different shapes.

## Build notes (plain HTML/CSS/SVG/JS, no build step)

- Layout: CSS grid for the page regions (control bar, Tracks area, Editors pane, optional Inspector). Keep the bottom pane as one container whose child is swapped by selection, as Logic does.
- Tracks area: one DOM row per track, plus a sticky ruler and marker track. Render only the visible bars for the 200-bar arrangement. Keep the playhead as a single absolutely positioned element updated from `Sequencer`.
- Editors pane: a registry keyed by the selected region or device type. Step grid for pattern regions, the device face for devices, the Controls-view slider list as the fallback. The registry can reuse the `defineParams` spec objects in `core.js`.
- Controls view: the existing slider generation from `defineParams` can be reused unchanged. Its paths (`kick.decay`, `stab.delay.mix`) already match the dotted-path parameter model in CLAUDE.md.
- Smart Controls: 4 to 8 range inputs bound to `Sequencer.setParam` on a selected track's dotted paths. Mapping can be a plain JS array of path strings in the track's data.
- Mixer: a horizontal flex row of strips, each reusing the level, pan, send and mute controls.
- Per-device faces: SVG or CSS panels built from the same spec, with a small registry. Nothing here needs a library or a build step.
- Self-check: these are DOM changes. They do not add Web Audio nodes, so the fake AudioContext in the studio self-check needs no new stubs. Re-run the self-check named in CLAUDE.md after any change to `studio.js` or `index.html`.
- Phone width: not covered by Logic's layout, and not researched here.

## Recalled, not verified

- Logic's default placement: Library on the left, Inspector on the left above the Tracks area, Editors below the Tracks area (the last is partly confirmed by F3). (unverified)
- Logic's Mixer appears as a pane in the main window when toggled from the control bar. (unverified; only the window-open commands were in the excerpts)
- The main window is a flatter, mostly grey interface, while plug-in windows are skinned, with depth and textures (for example Logic's own instrument panels). (unverified; no search covered it)
- Smart Controls default to eight knobs per track. (unverified)
- Logic's Editor view for a plug-in is drawn by the plug-in itself for third-party plug-ins, and by Logic for its own. (unverified)
- Logic's current Live Loops and Step Sequencer menu names may differ from the 2020-era pages cited. (unverified)

## Questions for the group

- Should the bottom Editors pane follow the selected track or device, as Logic's Editors area does, rather than each device opening its own panel? This decides whether device faces are built once for the pane or once per card.

## Sources

Apple Logic Pro help and guides (search excerpts; page fetch failed):
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp2a07a994.html
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc403a.html
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc3b1d.html
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc43f6.html
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpa9111b0d.html
- https://help.apple.com/logicpro/mac/10.4/en.lproj/lgcpa9111b0d.html
- https://help.apple.com/logicpro/mac/10.4/en.lproj/lgcpbc21a1fd.html
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp076273cd.html
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp6deeba65.html
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp0ec9fc09.html
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp46edc90d.html
- https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_6_section_9.html
- https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_4_section_1.html
- https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_23_section_1.html
- https://support.apple.com/is-is/guide/logicpro/toc/12.3
- https://support.apple.com/en-is/guide/logicpro/toc
- https://support.apple.com/en-gu/guide/logicpro/lgcp146fb520/mac
- https://support.apple.com/en-mz/guide/logicpro/lgcp0ec9fc09/mac
- https://support.apple.com/en-uz/101781 (Adjust plug-ins with VoiceOver in Logic Pro for Mac and MainStage)
- https://support.apple.com/HT211026 (Build grooves in Logic Pro for Mac with the Step Sequencer)
- https://support.apple.com/en-us/HT211140 (Use Live Loops in Logic Pro for Mac)
- https://support.apple.com/en-al/102113 (Use Live Loops in Logic Pro for Mac)

iPad guide (indicative only, not Mac):
- https://support.apple.com/guide/logicpro-ipad/lpipd9859eae/ipados
- https://support.apple.com/guide/logicpro-ipad/lpip1454fa06/3.0/ipados/26

Third-party and community:
- https://www.soundonsound.com/techniques/smart-controls (Sound On Sound tutorial on Smart Controls)
- https://library.berklee.edu/node/346546 (Berklee guide, "Logic's Inspector: The Complete Guide")
- https://ask.audio/articles/markers-the-ultimate-project-navigation-technique-in-logic-pro-9
- https://discussions-cn-prz.apple.com/thread/252482509 (Apple community thread)

Local (verified by reading the files):
- `docs/screenshots/studio-playing.png`
- `docs/screenshots/studio-rack.png`
