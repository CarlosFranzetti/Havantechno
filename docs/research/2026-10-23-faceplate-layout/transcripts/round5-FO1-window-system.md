# F-O1: Design director — round 5, the window system
Agent model: Opus. Date: 2026-10-23.

## Scope

The owner changed direction after the vote:

- Havantechno becomes a Mac or PC desktop DAW, not browser-only.
- The voted layout, Strip Bench (`REPORT.md` section 3), is kept and is now called the **System Editor** view.
- The owner wants more layout options "more like Logic", with **each piece of gear in its own floating window with its own look**.
- The owner wants a **Step View**, similar in shape to the System Editor, where every step of the sequencer can be modified.

My topic is how these pieces fit together as one window system:
- what the main window holds;
- whether the System Editor and the Step View are panes, modes or full views;
- the rules for floating gear windows and how they relate to the compact faces in the System Editor's device row;
- how the user switches views and always knows where they are.

I give three options for the main window, each with a wireframe at 1440 px wide, and recommend one. I also revisit what the desktop platform changes in my round-1 reasoning about Live and Logic.

Out of scope: the desktop shell itself (Electron, Tauri or native), the audio engine port, and the gear (Gear Crew). Where my design depends on them, I list it under Questions.

Searches: 6 of 6 used, listed under Sources. Page fetches were not attempted this round. Every web fact is a search excerpt, marked `(search excerpt: <url>)`. Facts from earlier rounds cite the agent's file.

## What changes with a desktop app

### Reasons for my Ableton lean in round 1 that no longer hold

1. **"A browser tab is one screen, so floating windows would hide the timeline"** (my round 1, "What would not fit"). A desktop app gets real OS windows, which can be placed on a second monitor and can stay on top of the main window. Electron, for example, has a `parent` option: a child window "stays on top of the parent window". On macOS the child keeps its position relative to the parent when the parent moves; on Windows and Linux it does not (search excerpt: https://www.electronjs.org/docs/latest/api/browser-window). Electron is just one example. The shell has not been chosen.
2. **"Floating windows fight the page scroll."** This was a browser problem. A desktop main window has no page scroll.
3. **Live's single-window rule** comes from performing on stage (my round 1, from a second-hand 2003 post). Even Live floats windows on the desktop when it must:
   - **Third-party plug-ins.** Users and an Ableton support post describe "Multiple Plug-In Windows" and "Auto-Hide Plug-In Windows" settings. With auto-hide on, changing the selected track hides the plug-in windows of the other track (search excerpt: https://forum.ableton.com/viewtopic.php?p=144733, https://forum.ableton.com/viewtopic.php?p=1754661). These are forum sources, not the manual.
   - **A Second Window.** Live has one, View menu → Second Window, so Session or Arrangement can sit on one monitor and Clip or Device View on the other. Clip View and Device View cannot show in both windows at once (search excerpt: https://help.ableton.com/hc/en-us/articles/209071749-Dual-Monitor-Support).

   So "one window" is Live's rule for its own devices, not a ban on floating windows.
4. **Logic's answer to window clutter is documented, and it is cheap to copy:**
   - plug-in windows open from their slot;
   - a Link mode makes one window show the most recently opened plug-in (my round 1: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc403a.html);
   - one key, V, shows or hides all plug-in windows (search excerpt: https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_10_section_4.html; https://www.oreilly.com/library/view/logic-pro-x/9780135245699/app02.xhtml);
   - screensets save whole window layouts, including size, zoom and position, and recall them by number. Apple's manual gives a range of 1 to 99, and a screenset saves itself when you switch away (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp9bbbcb23.html).

   In a browser all of this would have to be hand-built inside one page. On the desktop it maps onto real windows.

### What does not change

- **The laptop is still the common screen.** A 1440 × 900 window has no room to spare. A floating window still covers the tracks it is editing. So floating windows must be **an addition, never the only way to edit a device**: the docked device row in the System Editor stays.
- **One face definition, one write path.** A floating window is the same face as the chain card, drawn at a larger density. Both write through `seq.setParam(path)` and read polled `params` (F-O2, `REPORT.md` section 4). If the windows are separate OS windows, the `host` object F-O2 designed becomes a message proxy. The face code does not change.
- **The identity rules:** family hue as ink, one hero graph per device, state carried by shape and never by hue (F-S4, F-S5).
- **Many-to-one stems and the section matrix.** The data has not changed.

### My skeuomorphism argument, revisited

In round 1 and round 2 I argued that a skin needs a meaning, such as Logic's circuit models (which F-H2 and F-H4 found unproven), and so I kept faces flat. Two things change that:

- the owner has now asked for "its own look" per gear window, which is the justification F-S4's skin tier asked for;
- a floating window gives a face the room a docked card never has.

So I now allow a **window skin tier**:
- a gear window may have its own panel ground, knob rendering and layout at faceplate size;
- it must keep its family ink, its hero graph, the shared knob grammar (F-S5) and the shape-only state markers;
- the docked card in the System Editor stays flat.

That is in fact what Logic does: a plain main window with skinned plug-in windows. My round 2 recorded Logic's main-window look as recalled, not verified, and that is still true.

One open constraint: PRD C1 ("no audio files", plain globals, no build step) was written for the browser. If image assets become allowed on the desktop, skins could use them. I would still draw skins as vectors, so they scale to any window size and stay themeable. See Questions.

### The new point the desktop raises: process boundaries

My recollection, not verified: in Electron each window normally runs in its own renderer process. In that case the audio engine lives in one window, and every gear window talks to it by message. That argues for F-O2's `host.setParam` / polled `params` seam over any direct reach into engine objects (F-O2's coupling C1). F-O2 should cost both forms of gear window:
- separate OS windows;
- in-window floating panels, drawn in the same document.

## Option A: "One frame, two modes" (System and Step share the window)

The voted Strip Bench window, unchanged in structure. The top bands and the track headers are shared by both views. Tab switches the **work area** (the matrix in the middle) and the **bottom band** together between System mode and Step mode. Gear windows float above either mode.

System mode at 1440 × 900 (each character is about 12 px):

```
+----------------------------------------------------------------------------------------------------------------------+
| HAVANTECHNO  > || []  126 BPM  sw .06  042.09 mainA  [ SYSTEM | step ]  A/B[src|rec|a+b] (off)  meter  clip   WAV    |  40
| overview [===|########|============================================================================]  200 bars     |  20
| ruler  |intro16 |i2 8|build16 |    mainA 32      |    mainA2 32     | break 24  |bE8|      mainB 48        |outro16|  24
+--------------------------+-------------------------------------------------------------------------------------------+
| v DRUMS (stem: none)     |                                                                                           |  22
| ▌kick   M S ▮▮ x...x...  |  A    | A  | A    |       A          |       A          |    A      | A |      A    | A   |  26
| ▌clap   M S ▮  ....x...  |  .    | .  | A    |       A          |       B          |    .      | A |      A    | .   |
| ▌hat_c  M S ▮  ..x...x.  |  .    | A  | B    |       A  /ramp\  |       C          |    .      | D |      C    | .   |
|  ...                     |                                                                                           |
| v BASS                   |                                                                                           |
|>▌bass   M S ▮▮ ...x...x  |  A    | A  | A    |       A          |       B          |    C      | C |      B    | A   |  selected
| ▌sub    M S ▮  x...x...  |  A    | A  | A    |       A          |       A          |    A      | A |      A    | A   |
| > OTHER (3)  > FX (2)                                                                                                |
+--------------------------+-------------------------------------------------------------------------------------------+
| bass › mainA › B   [PATTERN ..x...x.] > [ BASS  ~filter curve~  osc|filter|amp ] > [ EQ3 ~3 nodes~ ] > [ CHANNEL ]  | 210
|                     step row             cutoff* res env  att dec rel  drive       low mid high        lvl pan dly   |
|  (double-click a card = open its gear window; ⧉ = window open)       ⧉                                 rev duck     |
|                                                                               || RETURNS [dly][rev]  MASTER [eq hp lp glue sat lim] |
+----------------------------------------------------------------------------------------------------------------------+
```

Step mode is the same frame. The rows grow to show the selected section's steps for every track. The bottom band becomes the per-step detail for the selected track.

```
+----------------------------------------------------------------------------------------------------------------------+
| HAVANTECHNO  > || []  126 BPM  sw .06  042.09 mainA  [ system | STEP ]  ...                                     WAV  |
| overview / ruler (same; the selected section is the one being edited)  [mainA ▾]  bar [1][2][3][4]                  |
+--------------------------+-------------------------------------------------------------------------------------------+
| ▌kick   A  used in 9 ⎘   | [X][.][.][.] [x][.][.][.] [X][.][.][.] [x][.][.][.]                                      |  32
| ▌clap   B  used in 1     | [.][.][.][.] [x][.][.][.] [.][.][.][.] [x][.][.][o]                                      |
| ▌hat_c  A  used in 3 ⎘   | [.][.][x][.] [.][.][x][.] [.][.][x][.] [.][.][x][x]                                      |
|>▌bass   B  B2 (note)     | [.][.][x][.] [.][.][x][.] [.][x][.][.] [.][.][x][.]       <- selected step: 10       |
| ▌stab   A  chord prog.   | [x][.][.][x] [.][.][x][.] ...    (chord tracks: rhythm here, chords in the band)        |
| ▌lead   A  melody        | G#4 .  -  -  B4!  .  ...         (lead: token row; roll in the band)                     |
|  ... 13 rows, one per track, all steps of the section editable                                                       |
+--------------------------+-------------------------------------------------------------------------------------------+
| STEP DETAIL  bass › mainA › B › step 10            level: ( o | x | X )   pitch: B2 (track note)                      |
|  per-step lanes:  level ▁▃▃▁▃▁▅▁▁▃▁▁▃▁▁▁    [future: pitch, gate, probability, param locks — engine work]     |
|  [ copy-on-write: editing B changes 1 section ]    [ duplicate as new variant ]    [ write ]  [ revert ]            |
+----------------------------------------------------------------------------------------------------------------------+
```

- **Gear faces.** The device row shows strip-density cards. Double-click a card, or press Enter on it, to open its gear window at faceplate size. The card stays where it is and shows ⧉ while its window is open.
- **Where the user is.** A lit SYSTEM or STEP segment, the breadcrumb at the left of the bottom band (track › section › variant, then › step in Step mode), and the selected row. The selected track, section and device are the same in both modes.
- **Why it fits the brief.** "Similar in shape" is read literally: same top, same rows, same bottom band, different content. It costs almost nothing beyond Strip Bench, because Step mode reuses the rows, the ruler and the selection model.
- **Main risk: the rows change meaning by mode.** In System they are the section matrix; in Step they are the selected section's steps. A user can edit the wrong thing, for example change variant B believing they are in a different section. Mitigations:
  - the mode segment is always lit;
  - the "used in N" count and copy-on-write (F-H5, F-S5);
  - a short transition on switch: the cells for the edited section expand into steps, so the eye follows.

  A second risk: **the per-step lanes are mostly empty today.** The engine stores only `.`, `o`, `x`, `X` per drum step and tokens for the lead (F-S5 round 1, A1 to A4). "Every step can be modified" means little more than three levels until the engine grows per-step data.

## Option B: "Logic main window" (Inspector, Tracks area, Editors pane, gear windows first)

The Logic shape the owner asked about:
- an **Inspector** column on the left with the selected track's channel strip and its insert slots;
- a **Tracks area** in the centre showing the 200 bars, with each section's variant drawn as a region;
- an **Editors pane** at the bottom (E) whose tabs are the System Editor (compact chain) and the Step View;
- the **Mixer** as a full view (X).

Gear lives first in floating windows, opened from the Inspector's slots as in Logic. The docked chain is chips only.

```
+----------------------------------------------------------------------------------------------------------------------+
| > || []  126  sw .06  042.09 mainA  [I][E][X][V]  A/B(off)  meter  WAV                                                |
+--------------------+-------------------------------------------------------------------------------------------------+
| INSPECTOR  bass    | overview [==|#####|============================================================]               |
| ┌ track ┐┌ out ──┐ | ruler |intro|i2|build|    mainA     |    mainA2    | break |bE|     mainB      |outro|            |
| │ BASS  ││MASTER │ | ▌kick   [A    ][A ][A   ][A           ][A           ][A    ][A][A            ][A  ]          |
| │[eq3 ]⧉││[eq   ]│ | ▌clap   [     ][  ][A   ][A           ][B           ][     ][A][A            ][   ]          |
| │[ +  ] ││[hp   ]│ |>▌bass   [A    ][A ][A   ][A           ][B           ][C    ][C][B            ][A  ]          |
| │dly (o)││[lp   ]│ | ▌sub    [A    ][A ][A   ][A           ][A           ][A    ][A][A            ][A  ]          |
| │rev (o)││[glue ]│ |   ... 13 lanes (regions = variant per section, ramps drawn on the region)                 |
| │duck(o)││[sat  ]│ |                                                                                               |
| │ pan o ││[lim  ]│ |      ┌─ BASS · bass ──────────────── ⧉ pin  ─ □ ×┐   <- floating gear window              |
| │  |=|  ││  |=|  │ |      │  osc        filter (lowpass curve)    amp    │      (linked to selection)             |
| │ M  S  ││       │ |      │ (o)(o)(o)   (O)cutoff (o)res (o)env   (o)(o) │                                        |
| └───────┘└───────┘ |      └───────────────────────────────────────────────┘                                        |
+--------------------+-------------------------------------------------------------------------------------------------+
| EDITORS (E)  [ System Editor | Step View ]   bass: [PAT]>[BASS]>[EQ3]>[CH]   chips; double-click = gear window        |
+----------------------------------------------------------------------------------------------------------------------+
```

- **Gear faces.** The **floating window is the main face**. The Inspector's slot list (as in Logic's channel strip) and the chips in the Editors pane both open it. The Editors pane can grow to show strip-density cards when the owner wants the docked row back.
- **Source and stems.** Stem group headers go into the Tracks area as group lanes, the same as in the voted layout.
- **Main risks:**
  - It leaves the voted layout. The device row stops being the place where you edit and becomes a list of chips. That reopens the vote, which F-H2's similar "Tracks and Editors" lost with 0 points (`REPORT.md` section 2).
  - The same device appears in three places (Inspector slot, editor chip, window), which tests the "one source of truth" rule.
  - The 260 px Inspector takes width from the 200-bar timeline on a 1440 px screen.
  - Without a Logic-style "Link: Single" default, windows pile up.
  - F-O2 costed the Logic shape at 10 to 14 days on top of the base (`REPORT.md` section 6), against 7 to 10 for Strip Bench.

## Option C: "Full views and screensets" (System Editor and Step View as two whole pages)

Two **full-window views** with different layouts, switched like Live's Session and Arrangement:
- **System Editor** is Strip Bench exactly as voted.
- **Step View** is a drum-machine page. All 13 tracks are shown at full height for the selected section, each with its step row and its per-step lanes underneath. There is no device row.

Window layouts are saved per view as **screensets**, Logic's model, so each view remembers which gear windows were open and where. A **second main window** can hold the other view on a second monitor, Live's model.

Step View at 1440 × 900:

```
+----------------------------------------------------------------------------------------------------------------------+
| > || []  126  042.09 mainA  [ 1 SYSTEM | 2 STEP ]  section [mainA ▾] variant view: as played   bar [1][2][3][4]   WAV |
+----------------------------------------------------------------------------------------------------------------------+
| ▌kick  A ⎘9 | 1   2   3   4  | 5   6   7   8  | 9  10  11  12  | 13  14  15  16 |  ┌ KICK ─────────── ⧉ ┐            |
|             | [X] [.] [.] [.] | [x] [.] [.] [.] | [X] [.] [.] [.] | [x] [.] [.] [.] |  │ pitch-drop curve │            |
|   level     |  █   .   .   .  |  ▆   .   .   .  |  █   .   .   .  |  ▆   .   .   .  |  │ tune punch sweep │            |
| ▌clap  B    | [.] [.] [.] [.] | [x] [.] [.] [.] | [.] [.] [.] [.] | [x] [.] [.] [o] |  └──────────────────┘            |
|   level     |  .   .   .   .  |  ▆   .   .   .  |  .   .   .   .  |  ▆   .   .   ▃  |   pinned gear window             |
| ▌bass  B    | [.] [.] [x] [.] | [.] [.] [x] [.] | [.] [x] [.] [.] | [.] [.] [x] [.] |   (screenset 2 remembers it)     |
|   level/pitch  ...                                                                                                    |
| ▌stab  A    | rhythm row  +  chord strip:  F#m  |  D  |  A  |  E   (from the section progression)                        |
| ▌lead  A    | token roll (8 rows, folded to pitches in use)  G#4 ──  B4! ─ ...                                         |
|   ... 13 tracks, scrolls vertically; every step and every lane editable                                              |
+----------------------------------------------------------------------------------------------------------------------+
```

- **Gear faces.** Floating windows only, in this view. A pinned window is remembered by the screenset.
- **Source and stems.** Only in System Editor (stem headers). In a later version, Step View could ghost a stem's detected onsets above each step row (F-S3's ghost layer).
- **Main risks:**
  - Step View loses the device context and the arrangement, so moving between "the sound" and "the steps" becomes a full view switch. That is the "ear memory" problem F-S3 cited for A/B, applied to editing.
  - Two whole layouts to build and keep consistent.
  - Screensets are a power-user feature. On a laptop, with no second monitor, the user sees a lot of switching and little benefit.

## Floating window rules

These rules apply to every option. They are written for Option A, which I recommend.

1. **One face definition, two sizes.** A gear window renders the same face as the docked card at "faceplate" density, and may use the window skin tier. It never holds parameters the card cannot reach. The card's "more" drawer covers the rest (F-S2).
2. **How a window opens.**
   - Double-click a device card or chip, or press Enter on it.
   - For master and returns, click the chip in the pinned RETURNS/MASTER block.
   - Nothing opens by itself on load or on track change. A preference, "open window when an insert is added", is off by default. (Logic opens a window automatically on insert, with a preference to turn that off; my round 1, help.apple.com 10.1.)
3. **Linked and pinned windows** (after Logic's Link button):
   - The first window is **linked**. Its title bar shows a link icon, and it follows the selection: select another device or track and the linked window shows that device.
   - **Pin** (the ⧉ icon) freezes the window to its device. The next open creates a new linked window.
   - There is at most **one linked window**. Pinned windows are limited by screen space only, with a soft warning at 8.
   - Opening a device that already has a window focuses that window. No device ever has two windows.
4. **Track changes.** Pinned windows of other tracks stay open by default. A preference, "hide windows of unselected tracks", does the opposite; this is Live's auto-hide, which users describe as per track (forum excerpts above). Both behaviours have users, so I make it a choice and keep Logic's default.
5. **Hide all.** **V** hides and shows all gear windows (Logic's key). Esc closes the focused gear window. Ctrl/Cmd+W closes it too, and must never close the project (the conflict in Live's help article above).
6. **Where windows sit.**
   - On first open, a window sits above the device row, clear of the selected track's row.
   - Its position and size are saved per device id in the project and per view, so Option C's screensets come almost free later.
   - On macOS the gear windows are child windows that move with the main window. On Windows this does not happen by default (Electron excerpt above), so the app must move them itself or accept the platform difference.
7. **Sizing.** A window resizes in steps (100, 150, 200 percent), not freely, so the face layout stays designed. Hero graphs scale; knob hit areas stay at least 24 px (F-S4).
8. **Focus and keys.** Transport keys (Space, Tab for the view switch, V) work when a gear window has focus. The window forwards them to the main window. A gear window never steals the playhead or the selection, except a linked window following it.
9. **Title bar.** It reads `device · track` (for example `EQ3 · bass`), with a family colour line, the bypass toggle, link or pin, the size step and close. Bypass in the window and on the card is one state.
10. **The docked card shows the window state.** ⧉ means "window open". A card whose window is hidden by V shows a hollow ⧉. Editing the card and editing the window are the same edit, and both update within one frame (F-O2's single requestAnimationFrame loop).

## View switching

- **Views:** System (default) and Step in the main window (Option A modes); the Mixer as a drawer (`REPORT.md` section 4); gear windows on top.
- **Keys:**

  | Key | Action | Precedent |
  |-----|--------|-----------|
  | Tab | Toggle SYSTEM and STEP | Live's Tab toggles Session and Arrangement (F-H1 round 1) |
  | Alt+1, Alt+2 | Toggle SYSTEM and STEP, for users who keep Tab for focus movement | Live's alternative keys when "Use Tab Key to Navigate" is on (F-H1 round 1) |
  | X | Mixer drawer | Logic's X (search excerpt above) |
  | V | Hide or show all gear windows | Logic |
  | Enter | Open the gear window for the focused device | — |
  | Esc | Close the focused gear window | — |
  | Up and Down arrows | Select the track | — |
  | Left and Right arrows | Move across sections (System) or steps (Step) | — |

  These are the only keys that need special handling on Logic's I, E and B: the I, E, B and Y area keys (search excerpt: https://ask.audio/articles/10-logic-pro-x-key-commands-that-will-rock-your-workflow) exist only in Option B.
- **Where the user is, at every moment:**
  - The mode segment in the control bar shows SYSTEM or STEP.
  - The breadcrumb at the left of the bottom band reads `track › section › variant [› step]`.
  - The selected row is highlighted, and the selected section is marked on the ruler.
  - A linked gear window's title shows which device it follows.
- **Selection is shared.** Track, section, variant and device stay selected across a mode switch, so Tab never loses your place. Switching modes changes no audio and no data. That is Live's rule that swapping views "does not switch modes, alter what you hear or change what is stored" (my round 1: https://www.soundonsound.com/techniques/live-fundamental-concepts).
- **Later:** screensets (Option C) and a second main window on a second monitor (Live's model). The saved window positions in rule 6 prepare for both.

## Recommendation

**Option A, with Option C's screensets and second window as later additions, and Option B's Inspector not built.**

1. **It keeps what the group voted for.** The System Editor is Strip Bench, amended as in `REPORT.md`. Step View is the same frame, which is the owner's "similar in shape" read literally.
2. **The owner gets Logic's floating, skinned gear windows without the cost of Logic's main window.**
   - Windows sit on top of a layout that already works without them.
   - Linked-by-default plus V keeps clutter under control on a laptop.
   - Pinning gives the multi-window studio on a large or second screen.
3. **It is the cheapest.** Step mode reuses the rows, ruler and selection. Gear windows reuse the face registry at a second density. F-O2 should confirm the cost.
4. **Option B's main gain over A, the Inspector, duplicates the device row**, and it was the losing shape in the vote. Option C's main gain, a full drum-machine page, mostly shows per-step data the engine does not have yet.

## Questions

1. **Owner and F-O2: what can a step hold?** Today a drum step is `.`, `o`, `x` or `X`, and the lead is monophonic tokens (F-S5 round 1). "Every step can be modified" could mean any of:
   - per-step pitch for note tracks;
   - gate;
   - probability;
   - micro-timing;
   - per-step parameter values ("locks").

   Each is an engine and data-format change. The Step View's lower band is drawn for them but stays mostly empty until they exist.
2. **F-O2: OS windows or in-window panels for gear?** Separate OS windows give second-monitor placement but may put each face in another process (my recollection). In-window panels are simpler and always on top, but stay inside the main window. Both work behind `host.setParam`.
3. **Owner: do PRD constraints C1 to C3 still apply** (no build step, no audio or image files, served over HTTP)? They decide whether the window skin tier can use image assets or stays vector-only. I would keep vector either way.
4. **Owner: is the target a laptop or a desk with two screens?** This decides whether pinned windows of unselected tracks stay visible by default (Logic) or hide (Live's auto-hide).
5. **F-S4: what may a window skin vary**, beyond family ink, hero graph, knob grammar and state shapes, before the 23 gear windows stop reading as one product?

## Sources

This round (search excerpts; no page fetched):
- https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_10_section_4.html (Hide/Show All Plug-in Windows, V; plug-in window opens on insert)
- https://www.oreilly.com/library/view/logic-pro-x/9780135245699/app02.xhtml (V shows or hides all plug-in windows)
- https://www.soundonsound.com/techniques/logic-pro-key-commands (show/hide all plug-in windows, or those on focused tracks)
- https://forum.ableton.com/viewtopic.php?p=144733 (Multiple Plug-In Windows, Auto-Hide; forum)
- https://forum.ableton.com/viewtopic.php?p=1754661 (auto-hide hides other tracks' plug-in windows; forum)
- https://ask.audio/articles/10-logic-pro-x-key-commands-that-will-rock-your-workflow (X, E, I, B, Y area keys; third-party)
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp9bbbcb23.html (screensets: create, recall, switch; 1 to 99)
- https://www.electronjs.org/docs/latest/api/browser-window (`parent` option; child stays on top; macOS vs Windows/Linux)
- https://help.ableton.com/hc/en-us/articles/209071749-Dual-Monitor-Support (Second Window; Clip and Device View not in both windows; Ctrl/Cmd+W behaviour)

Cited from my earlier rounds (search excerpts there):
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc403a.html (plug-in window opens on insert; Link: Off/Single)
- https://www.soundonsound.com/techniques/live-fundamental-concepts (swapping views changes nothing you hear or store)
- https://ccrma.stanford.edu/mirrors/lalists/lau/2003/01/0359.html (Live's one-window goal, second-hand)

Repo and group files: `REPORT.md`, `VOTE.md`, `DISCUSSION.md`, and the round-1 files of F-H1, F-H2, F-O2, F-S2, F-S3, F-S4 and F-S5, cited by id in the text.
