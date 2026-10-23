# F-H2: Logic Pro floating plug-in windows — round 5
Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

## Scope

How Logic Pro opens, links, shows, sizes, hides and clutters its floating plug-in windows, and what Ableton Live does instead. The aim is to give Havantechno, now a Mac or PC desktop DAW with a "System Editor" view and a per-device floating window with its own look, a set of window rules. Topics asked for: opening from the channel-strip slot and the Inspector, floating over the main window, linking to the selected track or staying pinned, size and position memory, stacking or tiling, the Link button, the Editor and Controls views in the header, the preset menu and bypass in the header, the keyboard shortcut to hide or show all windows, and clutter control.

Evidence grade. I ran 8 web searches (the limit). No page fetch succeeded: every Apple page I tried failed with a DNS error in earlier rounds, and this round I did not try again. So every Logic and Live fact below is a search excerpt, marked `(search excerpt: <url>)`. The sources are mostly Logic Pro 9.1.6, 10.1 and 10.4 help pages, one 2019 article, and Ableton forum threads that run from 2005 to 2026. Current Logic (11 and 12) may use different menu names and defaults. Where two sources disagree, both are stated.

## What I looked at

- `REPORT.md` (read first, as asked), and my round-1 and round-2 files for the Logic facts already gathered: the Link button, the header, Editor and Controls views, the 9.1.6 floating-window note, and the Smart Controls excerpts.
- Eight searches this round: Logic opening from a slot; Logic Link button and header; Logic show/hide key; Logic window size and header; Ableton plug-in windows; Logic Smart Controls and clutter; Logic link and track-follow behaviour; Ableton floating-window opinions.
- Not reached: a current Logic 11 or 12 help page for the window header (the preset menu and the bypass button did not come up in any result); any tile or cascade command in Logic (none found); size memory across sessions (only an anecdote); any study of why users pick one model over the other.

## Findings

### 1. Opening a plug-in window (Logic)

- A plug-in window opens when you insert a plug-in, and it floats above the main interface. The Apple summary calls it "their own window that floats above the Logic Pro for Mac interface". (search excerpt: https://support.apple.com/guide/logicpro/aside/lgcpd600161c/12.2/mac/15.6, and the 9.1.6 "Working with Plug-ins" page https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_10_section_2.html; the summary did not say which of these held the sentence.)
- Auto-open is a preference. Deselect "Open plug-in window on insertion" in the Mixer display preferences (9-9 in the 9.1.6 manual; the newer path is Logic Pro > Settings > View > Mixer). (search excerpt: https://help.apple.com/logicpro/mac/10.4/en.lproj/lgcpbc21a1fd.html; https://support.apple.com/en-bh/guide/logicpro/lgcpbc21a1fd/mac)
- Click the centre of an insert slot to open its window. Double-click an assigned Insert or Instrument slot to reopen a closed one. Closing the window does not deactivate the plug-in. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html; the reopen rule is from the same family of pages, summary-level.)
- Double-clicking the Channel EQ icon at the top of a channel strip adds Channel EQ to the first free slot and opens its window. (search excerpt: https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_10_section_2.html, summary-level.)
- The Inspector: I found no source that says the Inspector opens a plug-in window. The Inspector shows the channel strips and their slots, and the Smart Controls button sits in the Control bar. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp2a07a994.html, round 1.) So for Havantechno, the Inspector route is a design choice, not a Logic rule.

### 2. The Link button (Logic)

- The Link button sits in the window header. Its states are Off, Single and Multi. Clicking it toggles Link on and off; right-clicking or Control-clicking switches between Single and Multi. (search excerpt: https://9to5mac.com/2019/08/11/logic-plug-in-link/; the Single and Multi descriptions also come from the older help pages at https://help.apple.com/logicpro/mac/10.4/en.lproj/lgcpbc21a1fd.html.)
- Off: each plug-in you open gets its own window, and several can stack and overlap. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html; "many can overlap" from the same summary.)
- Single: one window is reused for every plug-in. Opening another plug-in replaces the contents. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html; https://9to5mac.com/2019/08/11/logic-plug-in-link/)
- Multi: one window per insert-slot row, shared across the Mixer. (search excerpt: https://9to5mac.com/2019/08/11/logic-plug-in-link/.)
- Conflict on the colour. One result says the Link button turns yellow in Multi mode; another says it turns purple in Single mode. Both are older pages, so I do not rely on either colour. (search excerpts: https://9to5mac.com/2019/08/11/logic-plug-in-link/; https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html.)
- Scope of the Link setting: one search summary says it is project-wide, so it cannot differ between windows of the same project. I did not see the sentence on the page itself. (search excerpt, unverified: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html.)
- Follow the selected track: an older Apple manual says that selecting a different track updates an open, linked window to show that track's instrument slot. The example given: switching between tracks 1 and 11 changes the window to ES 1 or EXS24 mkII. I found no current confirmation. (search excerpt: https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_10_section_6.html, older manual.)
- Linked windows as a clutter control. A Native Instruments forum user describes linking windows so that focusing another track puts that track's instrument in the same window, which keeps the screen from filling up. The same post reports a glitch with one large sampler, so test it with each plug-in. (search excerpt: https://community.native-instruments.com/discussion/21236/komplete-kontrol-in-logic-pro-linked-plugin-windows; user report, not Apple.)
- Control surfaces: with Link on, selecting another plug-in on a control surface replaces the open window. (search excerpt: https://help.apple.com/logicpro/mac/9.1.6/cn/logicpro/controlsurfacessupport/chapter_5_section_6.html, from the search list; summary-level.)

### 3. The header and the views (Logic)

- The header is shared by all plug-ins. Its uses: resize the window, link windows when more than one is open, switch the parameter view, and route side-chain signals. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html.)
- Editor view shows the plug-in's own graphic interface, if it has one. Controls view shows every function as a horizontal slider with a numeric field to the left (round 1, search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html). The switch is in the View pop-up menu in older docs. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html; summary-level.)
- Parameters that the Editor view does not show are reached by a disclosure triangle at the bottom-left of the window. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html.)
- Preset menu and bypass in the header: not found. The search result on window opening said the docs describe no preset menu or bypass button in the header. (search excerpt: https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_10_section_4.html, summary-level, "did not surface anything".) So I do not state where Logic puts them.
- The header's Editor and Controls views are the only view switch documented. A "Controls view" label in the header is not confirmed for current Logic.

### 4. Size and position (Logic)

- Three ways to size a window: drag the lower-right corner (this applies to that plug-in only); choose a size from the window's View menu (per plug-in); set a default in Logic Pro > Preferences > Display > Mixer (applies to all plug-ins). (search excerpt: https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_10_section_4.html.)
- Size memory across sessions is not documented. One forum post says windows keep their own sizes, while new windows open at the size of the last one. Another report from Logic Pro 11 says a FabFilter plug-in's GUI scale resets to its default each time the plug-in is reopened. A FabFilter forum reply called that unexpected. These are anecdotes. (search excerpts: https://gearspace.com/threads/alchemy-default-size.1046461/ and https://prod.fabfilter.com/forum/add-comment?id=8114; both listed, summary-level.)
- Position memory: not found.

### 5. Show and hide all (Logic)

- Hide/Show All Plug-in Windows is a key command. Its default assignment is V, and it toggles. (search excerpt: https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_10_section_4.html; O'Reilly appendix: https://www.oreilly.com/library/view/logic-pro-x/9780136886761/app01.xhtml, which lists "V | Toggles all open plug-in windows" (the summary did not say which appendix held the entry).)
- The newer docs found in this round do not mention that key command. The default may have changed. Check Logic's Key Commands window.

### 6. Tiling, stacking and clutter (Logic)

- Stacking happens in Off mode, where windows overlap. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html.)
- Tiling or cascading commands: not found in any Logic source.
- Smart Controls are Logic's answer to clutter. They are a simplified set of on-screen controls, reached from the Smart Controls button at the left of the Control bar, and they show in the lower third of the Main Window. One Smart Control can drive two plug-ins, so you do not open both windows. (search excerpts: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp7e59f24b.html and https://www.soundonsound.com/techniques/smart-controls.)
- The Mixer lets you add and edit plug-ins without a floating window. The toolbar can be hidden to free screen space. (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc403a.html and the Smart Controls search summary, summary-level.)
- Multi-monitor layout: not found.

### 7. Ableton Live: no floating windows by default

- Live's Device View is a panel at the bottom of the window, as recorded in round 1 (search excerpt: https://www.ableton.com/en/live-manual/12/working-with-instruments-and-effects/). Plug-in windows are an option, not the default. (search excerpt: https://www.ableton.com/de/live-manual/12/using-plug-ins/.)
- Auto-Open Plug-In Windows opens a window when a plug-in is loaded from the browser. Auto-Hide Plug-In Windows shows only the windows of the selected track. Multiple Plug-In Windows allows any number of windows at once. (search excerpt: https://www.ableton.com/de/live-manual/12/using-plug-ins/; the menu for these settings differs by version, and a forum post says the Look/Feel tab is where they sat in some releases.)
- Show/Hide Plug-In Windows: the View menu or Ctrl+Alt+P (Win) / Cmd+Option+P (Mac). (search excerpt: https://www.ableton.com/de/live-manual/12/using-plug-ins/.)
- Windows can be lost. Causes listed in forum threads: Auto-Hide is on, Auto-Open is off, the windows were hidden with the shortcut, or the GUI must be opened from the device panel's icon. (search excerpts: https://forum.ableton.com/viewtopic.php?p=144733 and https://forum.ableton.com/viewtopic.php?p=1792912; summary-level.)
- A 2020s forum thread says Live's Session and Device layout cannot keep specific plug-in windows open, and recommends a Max for Live floating-window device as a workaround. (search excerpt: https://forum.ableton.com/viewtopic.php?p=1792895 or p=1792912; the summary did not say which.)

### 8. Why users prefer which model (opinion, not a survey)

- Floating windows are the main request. Users with many third-party plug-ins want windows that stay open, or that float no matter which track is selected. One 2021-era thread asks for master reverb, delay and looper windows to float "no matter what track I have selected", and notes no float or undock option for Live's native effects. (search excerpts: https://forum.ableton.com/viewtopic.php?p=1000144 and p=1792912; the summary did not say which thread held which post.)
- The unified layout is defended. A 2009 thread recalls Live's slogan of a unified UI "with no floating windows that interrupt your workflow". One reply says to set the parameters you use and then work from the live sliders. (search excerpt: https://forum.ableton.com/viewtopic.php?p=1000144; the summary attributes the 2009 post to this thread, but I did not read it.)
- The summary of the forums: people who run many third-party plug-ins tend to want floating windows, and people who want a tidy single window are content with the bottom panel. This is anecdotal, and I found no poll. (search excerpts: as above.)

## Window rules for Havantechno

These are proposals built from the findings. Where a rule copies a Logic or Live behaviour, the source is in brackets. Where it has no source, it is marked "(proposal)".

1. **Open.** A device opens its window from its chip or from a double-click on its title in the device row (Logic: click the slot centre, double-click an assigned slot; the reopen rule). Inserting a device opens its window by default, with a preference to turn that off (Logic). A closed window never bypasses or unloads the device (Logic).
2. **Link.** Three modes, set per window in the header: Off (each device gets its own window, which may overlap; a cap of about 4 windows open at once is a proposal), Single (default; one window reused for each device chosen, as Logic's Single), and Multi (one window per insert row, across tracks). When a window is linked, it follows the selected track's device of the same role (older Logic track-follow behaviour; proposal to keep it, since the current Logic behaviour is unconfirmed).
3. **Pin.** A window can be pinned to its device. A pinned window ignores track selection, so two devices from two tracks can be compared (proposal; Logic does not document pinning, Live's Multiple Plug-In Windows allows many open at once). Pinning is the escape from follow-selection, not the default.
4. **Remember.** Each device stores its window size and position under its device id, so the bass window reopens where it was. The default size comes from a preference, as Logic's Mixer default does (Logic: size per plug-in via the corner or the View menu, default in preferences). Position memory is a proposal, because Logic's position memory is not documented. Clamp the window onto the visible screen on open, so a window cannot open off a monitor that is no longer there (proposal).
5. **Tile.** Offer one command that tiles the open device windows in a grid inside the screen, and one that cascades them. Logic documents no tile command, so this is a proposal, not a copy.
6. **Hide all.** One key toggles the hide or show of every device window (Logic: V, toggled; Live: Ctrl+Alt+P / Cmd+Option+P). Use V as the default, since Logic's default is V, and make it rebindable (proposal on the key; the toggle is from the sources). A hidden window keeps its state.
7. **Header contents, left to right.** Device name and track name; a preset menu (proposal; not found in Logic's header sources); bypass (proposal; not found in Logic's header sources); Editor and Controls view switch, in one control (Logic: the View pop-up, Editor and Controls); size (Logic: View menu); Link (Off, Single, Multi; Logic); side-chain route when the device takes one (Logic). A disclosure at the bottom-left for parameters the face does not show (Logic).
8. **Clutter.** The Smart Controls idea is the fallback for a device with no window: a macro row in the Inspector that can drive one device's main parameters without a window (Logic; the Inspector row is the proposal from round 2's Strip Bench and the Smart Controls excerpts).

## ASCII sketch: main window with two floating device windows

Floating windows are drawn over the main window, at the positions their remembered settings give. The "System Editor" is the main window's bottom device row.

```
+-----------------------------------------------------------------------------+
| > []  126  swing .06 | bar 42 mainA | [SRC|REC|A+B]   [Hide all: V]  WAV    |
+-----------------------------------------------------------------------------+
| overview [==|#########|=====================================================]  |
+-----------+-----------------------------------------------------------------+
| kick  M S | ruler  intro  i2  build  mainA   mainA2   brk   bE   mainB       |
| bass  M S | A  A  A  A  A  B  C  ...                                        |
| stab  M S | ...    (13 rows)                                                |
|           |   +------------------ bass  [Single]  [Editor|Ctl] [ - ] [x] ---+ |
|           |   | BASS face: osc, filter curve, amp            (floating)      | |
|           |   +-----------------------------------------------------------+ |
+-----------+-------------------+----------------------------------------------+
| SYSTEM EDITOR  bass: [PATTERN] > [BASS] > [EQ3] > [channel] | RETURNS MASTER|
|                              +-- kick  [Off] [pin] -----------------+        |
|                              | KICK face (floating, pinned to kick) |        |
+------------------------------+--------------------------------------+--------+
```

The sketch is schematic. The two floating windows sit over the main window. The bass window follows the selected track. The kick window is pinned, so it stays on kick when the selection moves.

## Questions

1. **Floating as OS windows or in-app panels.** Does the desktop shell (Mac and PC) give each device its own OS window, so it can sit on a second monitor, or does everything float inside the app window? The second costs less and keeps one window, but the first is what Logic's users expect. The owner should decide before the window rules are built.
2. **Default Link mode.** Single (as in Logic's examples) or Off (each device stays open)? This decides whether a new user sees one window or many.
3. **Follow or pin by default.** Should a window follow the selected track unless pinned (proposed here), or stay on the device it was opened for? Live users complain about the opposite default, so the choice is worth a vote.
4. **Relation to the System Editor.** Is the device row in the System Editor the docked version of the same device face, so a floating window and a docked row show one face? The rules above assume yes.

## Sources

Search excerpts. No page was fetched successfully this round, and no search result was opened. Every entry was seen in a search result list, and the summary stated the fact cited against it. Where the summary did not say which URL held a sentence, the entry says so.

Apple Logic Pro (search excerpts):
- https://support.apple.com/guide/logicpro/aside/lgcpd600161c/12.2/mac/15.6
- https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_10_section_2.html
- https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_10_section_4.html
- https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_10_section_6.html
- https://help.apple.com/logicpro/mac/9.1.6/cn/logicpro/controlsurfacessupport/chapter_5_section_6.html
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html
- https://help.apple.com/logicpro/mac/10.4/en.lproj/lgcpbc21a1fd.html
- https://support.apple.com/en-bh/guide/logicpro/lgcpbc21a1fd/mac
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc403a.html
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp2a07a994.html (round 1)
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp7e59f24b.html (Smart Controls overview)
- https://www.oreilly.com/library/view/logic-pro-x/9780136886761/app01.xhtml (appendix; the entry's appendix not confirmed)

Logic Pro, third-party and community:
- https://9to5mac.com/2019/08/11/logic-plug-in-link/ (2019 article)
- https://www.soundonsound.com/techniques/smart-controls
- https://community.native-instruments.com/discussion/21236/komplete-kontrol-in-logic-pro-linked-plugin-windows (user forum)
- https://gearspace.com/threads/alchemy-default-size.1046461/ (forum, listed; summary-level)
- https://prod.fabfilter.com/forum/add-comment?id=8114 (forum reply, listed; summary-level)
- https://whylogicprorules.com/plugin-window-management/ (listed, not read)

Ableton Live (search excerpts):
- https://www.ableton.com/en/live-manual/12/working-with-instruments-and-effects/ (round 1)
- https://www.ableton.com/de/live-manual/12/using-plug-ins/
- https://forum.ableton.com/viewtopic.php?p=144733 (forum, summary-level)
- https://forum.ableton.com/viewtopic.php?p=1000144 (forum, the 2009 thread; the summary attributes the post to it)
- https://forum.ableton.com/viewtopic.php?p=1792895 (forum; post not identified)
- https://forum.ableton.com/viewtopic.php?p=1792912 (forum; post not identified)
- https://forum.ableton.com/viewtopic.php?p=1197902 (listed, "key command for view/hide all plug in windows", not read)

Local files:
- `docs/research/2026-10-23-faceplate-layout/REPORT.md`
- `docs/research/2026-10-23-faceplate-layout/transcripts/round1-FH2-logic-layout.md`
- `docs/research/2026-10-23-faceplate-layout/transcripts/round2-FH2.md`
