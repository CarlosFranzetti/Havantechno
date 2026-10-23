# F-H1: Ableton Live's main layout — round 1

Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

## Scope

Ableton Live's main window: the two main views (Session and Arrangement), how users switch between them, the Device View chain at the bottom, the Browser on the left, the mixer, what stays on screen in every view (transport and Control Bar), how the Arrangement timeline, locators and Clip View work in Live 12, and what is known about density, colour and typography of the default theme. Scope is layout only. Instrument and effect faces (F-H3, F-H4) and the mixer and transport detail (F-H5) belong to other agents, and I touch them only where the main layout needs them.

## What I looked at

- Web searches (11 of a planned 12; the 12th was not used to save the shared budget). Queries covered: view switching and the Tab key; Device View and its show/hide shortcuts; the Browser and Control Bar; Arrangement View, locators and the ruler; Clip View; the Mixer and its sections; Session View's grid; the Device View chain's signal direction; the stock themes; the Live 12 browser sidebar.
- One WebFetch of the Live 12 manual page `https://www.ableton.com/en/live-manual/12/working-with-instruments-and-effects/` failed with `getaddrinfo ENOTFOUND www.ableton.com`. Every Ableton fact below therefore rests on a search excerpt, not on a fetched page. Each is marked as such.
- The two Havantechno screenshots I could view: `/home/user/havantechno/docs/screenshots/studio-playing.png` and `/home/user/havantechno/docs/screenshots/studio-rack.png`. (The brief's relative path `../../screenshots/` resolves to `docs/screenshots/` from the transcripts folder.)

What the current page looks like, from the screenshots:

- `studio-playing.png`: a top bar (title, Pause/Stop, BPM, swing, a "bar 42 · step 9 · mainA" readout, export buttons), then a row of section buttons (intro, intro2, build, mainA, mainA2, break, breakEnd, mainB, outro) and a loop checkbox. Below that is a grid of 13 identical cards (kick, sub, bass, stab, clap, hat_open, hat_closed, shaker, perc, lead, pad, riser, impact). Each card has a 16-step row, then sliders for level, pan, send delay, send reverb and duck depth, and a collapsed "synth parameters" disclosure.
- `studio-rack.png`: a "processors: sends and master" panel. It is a grid of 8 identical boxes (send delay, send reverb, master eq, master hp, master lp, master glue, master sat, master limiter), each a title, a list of sliders with values, and a "bypass" button where present. The effects are listed in one flat grid, not in a chain.

## Findings

Each finding is marked `(search excerpt: <url>)` or `(unverified)`. None is marked "verified", because no page fetch succeeded.

### 1. The two main views and how users switch

- Live has two main views: Session View, which is a grid of clips for launching, and Arrangement View, which is a linear timeline for building a song's structure. (search excerpt: https://www.ableton.com/en/live-manual/12/arrangement-view and https://www.ableton.com/en/live-manual/12/session-view/)
- Switching: in a single window, the Tab key toggles between the two views, or use the view controls in the top-right corner of the window. With two windows, Tab swaps which view appears in each window. (search excerpt: https://help.ableton.com/hc/en-us/articles/12243771208092 and https://www.ableton.com/en/live-manual/12/live-concepts/)
- When the "Use Tab Key to Navigate" option is on in Display & Input settings, Tab does not switch views. The shortcuts Alt+1 (Win) / Option+1 (Mac) give Session View and Alt+2 / Option+2 give Arrangement View. (search excerpt: https://help.ableton.com/hc/en-us/articles/11550373507868 and https://help.ableton.com/hc/en-us/articles/12243771208092)
- The Session/Arrangement switch sits in the Control Bar. (search excerpt: https://www.ableton.com/en/live-manual/12/live-concepts/)
- A track plays either a Session clip or an Arrangement clip, never both, and Session clips take precedence. (search excerpt: https://www.ableton.com/en/live-manual/12/session-view/)

### 2. Session View (the grid)

- Tracks are columns and scenes are rows. Each column plays one clip at a time, so alternative versions of a section go in the same column. Clips can be triggered in any order. (search excerpt: https://www.ableton.com/en/live-manual/12/session-view/ and https://www.ableton.com/en/live-manual/12/live-concepts/)
- A scene is the set of clips in one row that play together across tracks. (search excerpt: https://www.ableton.com/en/live-manual/12/live-concepts/)
- Stop buttons sit in each clip slot or in a Track Status field below the grid. Clicking a Track Status field opens Clip View for the clip running on that track. (search excerpt: https://www.ableton.com/en/live-manual/12/session-view/ and https://www.ableton.com/live-manual/12/clip-view/)
- Track headers can be narrowed to show only the clip launch buttons and the essential track controls, so more tracks fit on screen. (search excerpt: https://www.ableton.com/en/live-manual/12/session-view/)

### 3. Arrangement View (the timeline)

- The Overview shows the whole arrangement from start to end. A black outline shows the part on screen, and the Overview handles zoom and scroll. (search excerpt: https://www.ableton.com/en/live-manual/12/arrangement-view)
- The ruler is in bars, beats and sixteenths. (search excerpt: https://www.ableton.com/en/live-manual/12/arrangement-view)
- Locators: the Previous and Next Locator buttons jump playback between locators. Jumps are quantised to the global launch quantisation. The Set Locator button adds a locator during playback or recording. The Set Locator sentence was in a result whose text matched the Live 11 manual, so treat that one line as Live 11 wording. (search excerpt: https://www.ableton.com/en/live-manual/12/arrangement-view and https://www.ableton.com/en/live-manual/11/arrangement-view/)
- The Lock Envelopes toggle ties automation to the song position rather than to the clips, so clips can move without moving their automation. (search excerpt: https://www.ableton.com/en/live-manual/12/arrangement-view)
- The Mixer can be shown in Arrangement View from the View menu. (search excerpt: https://www.ableton.com/de/live-manual/12/arrangement-view/)
- Live 12 (press coverage, not the manual) says the mixer now appears in Arrangement View, where it used to exist only in Session View. (search excerpt: https://mixmag.net/read/ableton-live-12-new-features-news, one of the Live 12 press results from the Device View search; exact source of the sentence not separable from the result list)

### 4. Device View chain (the bottom panel)

- Device View sits at the bottom of the window. It shows the selected track's devices and is opened by double-clicking the track's title bar. (search excerpt: https://www.ableton.com/en/live-manual/12/working-with-instruments-and-effects/)
- Signal runs left to right through the chain. Each device passes its signal to the device on its right. (search excerpt: https://www.ableton.com/en/live-manual/12/working-with-instruments-and-effects/ and https://www.ableton.com/en/live-manual/12/instrument-drum-and-effect-racks/)
- On a MIDI track, devices to the left of the instrument handle MIDI and devices to the right handle audio. (search excerpt: https://www.ableton.com/en/live-manual/12/working-with-instruments-and-effects/)
- Devices are reordered by dragging a device by its title bar and dropping it beside another device. (search excerpt: https://www.ableton.com/en/live-manual/12/working-with-instruments-and-effects/)
- Show/hide: Ctrl+Alt+4 (Win) / Cmd+Option+4 (Mac) shows or hides Device View. Ctrl+Alt+3 / Cmd+Option+3 shows or hides Clip View. (search excerpt: https://help.ableton.com/hc/en-us/articles/12840878679452; the same keys appear in the Live 12 manual text in the Device View search results)
- A device can be folded to save space, either by double-clicking its title bar or from the title bar's context menu. (search excerpt: https://www.ableton.com/en/live-manual/12/working-with-instruments-and-effects/ — the result text came from the Device View search; the fold wording is the one I could confirm)
- Stacked Detail view: Live 12 can show the clip editor or automation together with the device parameters, so the user sees both at once. (unverified: stated in press previews in the Device View search results, e.g. https://mixmag.net/read/ableton-live-12-new-features-news; I could not attribute the sentence to one page)
- Forum users (March 2024) said the older Option+Command+L toggle for Device View stopped working in Live 12. These are user reports, not confirmed by Ableton. (search excerpt: https://forum.ableton.com/viewtopic.php?p=1821736 — the forum result appeared in the search; the claim is a user report)

### 5. Browser (left side)

- The Control Bar has a Show/Hide Browser toggle. The shortcut is Ctrl+Alt+5 (Win) / Cmd+Option+5 (Mac). (search excerpt: https://www.ableton.com/en/live-manual/12/live-concepts/ and https://help.ableton.com/hc/en-us/articles/12243771208092)
- The Live 12 browser has a sidebar with three sections: Collections, Library and Places. It also has a search bar, a filter area and a content pane. Places gives access to Ableton Cloud and Push-attached content in Standalone mode. (search excerpt: https://ableton.com/de/live-manual/12/working-with-the-browser)
- Live 12 replaced the old per-category folders (for example Audio Effects split into Delays, Dynamics, EQ) with a Filters section at the top of each browser window, which narrows the list by sound type, format and characteristics. (search excerpt: https://musicradar.com/how-to/live-12-5-things-you-need-to-know)
- The older help article describes category-based folders (Sounds, Drum Racks, Plug-ins). It predates the Live 12 redesign, so its list is not current. (search excerpt: https://help.ableton.com/hc/en-us/articles/209774665-The-Live-Browser)
- Not found: the exact items under Library in Live 12.

### 6. Control Bar and what stays visible

- The Control Bar holds the transport and tempo controls, the scale and MIDI settings, the CPU meter, the Session/Arrangement switch, and the browser toggle. (search excerpt: https://www.ableton.com/en/live-manual/12/live-concepts/ and https://help.ableton.com/hc/en-us/articles/12243771208092)
- Not found: an explicit statement that the transport stays visible when the browser, the mixer or Device View are hidden. The search results did not settle it. The Control Bar is a fixed strip at the top, which is consistent with it being visible in both views, but I could not confirm this from a source. (unverified)

### 7. Mixer

- The Mixer can be expanded or collapsed in either view from the view control at the bottom right of the window. Each view keeps its own Mixer setting. (search excerpt: https://help.ableton.com/hc/en-us/articles/12243771208092)
- A drop-down beside the mixer control chooses which sections show: Inputs/Output, Sends, Volume, Track Options, Crossfader, Performance Impact, Return Tracks. (search excerpt: https://help.ableton.com/hc/en-us/articles/12243771208092)
- In Live 11, the Mixer in Arrangement View was a horizontal strip and in Session View a vertical one. The search wording is unclear on the exact placement, so I do not rely on it. (search excerpt: https://www.ableton.com/en/live-manual/11/mixing/)
- Returns and the master are shared between the two views. (search excerpt: a Sound on Sound guide surfaced in the mixer search, https://www.soundonsound.com/techniques/ableton-live-complete-production)
- Not found: the Live 12 wording of the master channel strip and the detail of sends and returns. The Live 11 mixing chapter is the nearest source. F-H5 should cover this.

### 8. Clip View

- Clip View holds clip properties and clip content: waveforms, MIDI notes, envelopes, MPE. It opens by double-clicking a clip, from the Clip View Selector, or with the Clip View Toggle beside the selector. (search excerpt: https://www.ableton.com/live-manual/12/clip-view/)
- Clip View and Device View can sit in the same bottom panel. Which one shows is set by the selector and the toggles. (search excerpt: https://www.ableton.com/live-manual/12/clip-view/ and https://help.ableton.com/hc/en-us/articles/12840878679452)

### 9. Density, colour and typography of the flat theme

- Not found in a source: the stock Live 12 Light and Dark colour values, the type face, and the type sizes. I did not find an official description.
- A community guide says Live ships with a set of default skins, reached from the Look/Feel tab in Preferences. (search excerpt: https://www.musicianwave.com/ableton-live-themes-and-skins)
- A community creator says they built their own Live 12 dark theme because they did not like the stock looks. Another describes free dark sets as neutral dark greys with a few coloured accents. These are opinions in search excerpts, not measurements. (search excerpt: https://www.musicianwave.com/ableton-live-themes-and-skins and the gumroad theme pages in the same results)
- A forum thread reports that the Tab navigation option can vanish on Mac in Live 12. This is a user report. (search excerpt: https://forum.ableton.com/viewtopic.php?p=1832191)

### 10. Sketches of the two main views

These sketches show the layout as the findings describe it. Exact pixel proportions are unverified.

Session View (grid):

```
+-------------------------------------------------------------------------+
| CONTROL BAR   play stop | tempo | quantise | SESSION | ARRANGE | CPU   |
+----------+--------------------------------------------------+-----------+
| BROWSER  | [track 1] [track 2] [track 3] ...   (narrow headers)| RETURNS  |
| collect- |--------------------------------------------------| + MASTER  |
| ions,    | scene 1  [clip ][clip ][     ][clip ]   >           |           |
| library, | scene 2  [clip ][     ][clip ][     ]   >           |           |
| places,  | scene 3  [     ][clip ][clip ][     ]   >           |           |
| filters  | Track Status  [stop] [stop] [stop] [stop]           |           |
|          |--------------------------------------------------|           |
|          | MIXER (toggle, bottom right control)             |           |
+----------+--------------------------------------------------+-----------+
| DEVICE VIEW (toggle, bottom)  [MIDI fx][instrument][audio fx][audio fx]->|
+-------------------------------------------------------------------------+
```

Arrangement View (timeline):

```
+-------------------------------------------------------------------------+
| CONTROL BAR   play stop | tempo | quantise | SESSION | ARRANGE | CPU   |
+----------+--------------------------------------------------+-----------+
| BROWSER  | OVERVIEW  [=====whole song, outline = on screen=====]|       |
|          |--------------------------------------------------|           |
|          | ruler  1    5    9    13   17   ... (bars.beats)   |           |
|          | locators  ^intro  ^build  ^drop  ^outro          |           |
|          |--------------------------------------------------|           |
|          | track 1  [====clip====][  ][=clip=]   ...        | RETURNS   |
|          | track 2       [=clip=]      [====clip====]        | + MASTER  |
|          | track 3  [=clip=][=clip=]       ...               |           |
|          |--------------------------------------------------|           |
|          | MIXER (toggle)                                   |           |
+----------+--------------------------------------------------+-----------+
| DEVICE VIEW (toggle, bottom)  [MIDI fx][instrument][audio fx][audio fx]->|
+-------------------------------------------------------------------------+
```

Device View chain (the bottom panel, one selected track):

```
  signal ->   [ MIDI fx ] [ INSTRUMENT ] [ audio fx ] [ audio fx ] [ ... ]
              title bar  | face          | face       | face
              (fold by double-click on title bar; drag title bar to reorder)
```

## What Havantechno could borrow

These are ideas only. The group should judge them against the other agents' findings.

1. A top-level split between a grid view and a timeline view. Havantechno already has the grid (the 16-step rows, one per track) and the timeline (200 bars, nine sections, with the section buttons in the top strip). The section buttons could become a locator-style ruler above a timeline, with the existing grid as the Session-like view for the current section. This gives the 200-bar song a place to be seen whole, which the current card grid lacks.
2. A single bottom Device View, with the selected track's chain shown left to right as device faces in a row. This fits the way per-track inserts already work (signal runs through them in order). Each device gets its own face in a fixed-height panel. Folding a device by double-clicking its title bar gives a density control without a new view. Today every device is a long slider list in a card, so this is the largest change in what the user sees.
3. A browser on the left that lists the 13 synths and 10 processors with Live 12's approach: filter chips (by family, by kind) at the top and one list below, instead of folders. This would also be the natural place for future stems and MIDI clips once the remix pipeline exists.
4. A narrow track header in the grid. Live shows only the launch button and essential controls when a track is narrowed. For Havantechno this would be level, mute, solo and a mini 16-step row. Pan, sends and duck depth would move into the mixer or the device view.
5. A mixer row (level, pan, sends, mute, solo) that is separate from the devices. Today the sends and level are mixed into each card. A mixer strip per track, with its own toggle as in Live, would clear the cards so that they can show only the device's own face.
6. The Control Bar as one always-present strip, holding transport, BPM, swing, the bar and step readout, and the section switch, as it does in the current top bar. Keep it fixed in both views, but confirm the Live behaviour before copying it (see Recalled, not verified).

## What would not fit (and why)

- Live's full Session View clip-launching workflow. Havantechno has a fixed 200-bar, nine-section arrangement and no live clip-launch use case yet. A scene grid for sections would be enough.
- A separate Clip View next to Device View, with stacked detail panes. Havantechno's 16-step row is a small editor and does not need a second bottom panel yet. Stacked detail adds layout weight without a clear payoff at this size.
- Drag-to-reorder devices in the chain. The master chain order is fixed in the engine (EQ, highpass, lowpass, glue compressor, saturator, limiter, per the CLAUDE.md note). Free reordering would need engine changes. Reordering per-track inserts is possible but should wait for the audio gear work in the other group.
- Live's dark-grey flat theme as the look. The look belongs to the visual-system agents. I only borrow structure here.
- Live 12's Browser Packs and Cloud content. Havantechno has no content library to browse.

## Build notes (plain HTML, CSS, SVG, JS, no build step)

- Two main views can be two `<section>` panels in one page with a `hidden` attribute toggled by a button. Keyboard shortcuts can follow Live's pattern: Alt+1 for the grid and Alt+2 for the timeline. Tab as the switch key would conflict with the browser's focus order, so do not use it.
- The 200-bar timeline can be a CSS grid where the bar width is a custom property (`--bar-w`). Each section is one absolutely positioned block over the ruler. Locators are `<button>` elements placed on the ruler. Redraws should touch only the playhead element, not the whole grid, to keep the 200-column layout cheap.
- The Device View can be a flex row with `overflow-x: auto` inside its own panel. Each device face is a `<section>` with a title bar `<header>`. Double-clicking the header toggles a `folded` class (Live's fold behaviour). Do not let the device row scroll the whole page sideways.
- The browser can be an `<aside>` with filter chips as `<button aria-pressed>` elements and a `<ul>` of devices. Filtering is a `hidden` toggle on the list items, with no re-render.
- Keep the section list and the track list as data from `studio.js` or the parameter spec, so the grid, the timeline and the browser are all built from one source. No new framework is needed.
- SVG faces are per device, so the performance cost is in the number of visible faces. Live shows one selected track's chain at a time. Doing the same keeps the number of live SVG panels low (about 3 to 6 at once instead of 23).

## Recalled, not verified

- The stock Live dark theme uses neutral greys with a bright accent colour for selection. This is from memory and I did not confirm it in a source.
- Live's Overview sits above the Arrangement tracks and shows the whole song. This matches the search excerpt, but I recall the placement from using the program and did not see a source that states it.
- The Control Bar stays visible in both views. This is my recollection, and I could not confirm it in a source (see Findings section 6).
- The Ctrl+Alt+5 browser shortcut and the Ctrl+Alt+4 device view shortcut in Live 12 are as the search excerpts say. I have not checked them against the keyboard shortcut list myself.

## Questions for the group

1. Should the bottom panel show only the selected track's device chain (Live's model), or all devices at once in a long strip (closer to the current page)? The answer changes whether F-H3 and F-H4 need to design for a single face per view or for several faces side by side.
2. Which view opens first, the 16-step grid per section or the 200-bar timeline? The rest of the layout follows from that choice.

## Sources

Search excerpts only. No page fetch succeeded (WebFetch of https://www.ableton.com/en/live-manual/12/working-with-instruments-and-effects/ returned `getaddrinfo ENOTFOUND www.ableton.com`).

- https://www.ableton.com/en/live-manual/12/live-concepts/
- https://www.ableton.com/en/live-manual/12/working-with-instruments-and-effects/
- https://www.ableton.com/en/live-manual/12/instrument-drum-and-effect-racks/
- https://www.ableton.com/en/live-manual/12/arrangement-view
- https://www.ableton.com/en/live-manual/12/session-view/
- https://www.ableton.com/live-manual/12/clip-view/
- https://www.ableton.com/en/live-manual/11/arrangement-view/
- https://www.ableton.com/en/live-manual/11/mixing/
- https://www.ableton.com/de/live-manual/12/arrangement-view/
- https://ableton.com/de/live-manual/12/working-with-the-browser
- https://help.ableton.com/hc/en-us/articles/12243771208092
- https://help.ableton.com/hc/en-us/articles/11550373507868
- https://help.ableton.com/hc/en-us/articles/12840878679452
- https://help.ableton.com/hc/en-us/articles/209774665-The-Live-Browser
- https://forum.ableton.com/viewtopic.php?p=1821736
- https://forum.ableton.com/viewtopic.php?p=1832191
- https://mixmag.net/read/ableton-live-12-new-features-news
- https://musicradar.com/how-to/live-12-5-things-you-need-to-know
- https://www.musicianwave.com/ableton-live-themes-and-skins
- https://www.soundonsound.com/techniques/ableton-live-complete-production
- Screenshots read: /home/user/havantechno/docs/screenshots/studio-playing.png and /home/user/havantechno/docs/screenshots/studio-rack.png
