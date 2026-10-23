# F-S1: round 2 (discussion)
Agent model: Sonnet. Date: 2026-10-23.

I read the other eleven round-1 files in full. I used 2 searches this round to settle one fact (floating plug-in windows in browser DAWs). Facts marked as in round 1: `(search excerpt: <url>)` means I saw the URL in a search result and the summary stated the fact; I did not read the page (page fetches to every host except github.com fail in this sandbox).

## Reactions

**F-O1** — "In a browser tab, floating windows are worse than in Logic: there is no second monitor, and they fight the page scroll."
I agree, and the browser-DAW evidence points the same way: every product where I found a panel position docks it. Amped Studio's VST Remote panel opens at the bottom of the screen (search excerpt: https://ampedstudio.com/blog/how-to-use-vst-plugins-inside-amped-studio/). BandLab opens effects from the selected track, at the bottom left per its help centre (round 1, search excerpt: https://help.bandlab.com/hc/en-us/articles/115002945473-Adding-Effects). This changes my view in one respect: in round 1 I listed Audiotool's free desktop as "would not fit" only because of cables. It also fails on F-O1's ground, because a free desktop is the one browser layout where devices can overlap, and I found nothing on how Audiotool handles that.

**F-O2** — "Custom elements do work without a build step (recalled), but they add little over a plain `build()` function here."
I withdraw the claim in my round-1 "What Havantechno could borrow" that each face should be a custom element. F-O2's `Faces.build(dev, host)` registry does the same job for Havantechno's own faces and keeps `faces*.js` loadable in the self-check vm. What I keep from round 1 is the narrower point: a face is a unit with a stable id, an audio side and a GUI side that a host mounts. That is the WAM contract (a plugin's GUI is a web component; search excerpt: https://aes2.org/publications/elibrary-page/?id=23110). So the registry should allow one entry type, a "foreign face", whose `el` is supplied by someone else and is drawn inside a neutral frame. It costs almost nothing now and keeps WAM possible later.

**F-S2** — "Only the selected track's faces are fully rendered, which is also the performance lever from F6."
This is the same choice every browser DAW I found makes: one selected-track chain or panel, not 13 open at once. Amped Studio, BandLab and Soundtrap all work this way as far as the excerpts show (not exhaustive; layout detail was often "not found"). F-S2's "Strips over a Device Row" is therefore the safest base. One point it changes for me: F-S2's light-DOM decision is right for Havantechno's faces, but a WAM GUI would bring its own shadow DOM and its own look (F-S2 itself found a WAM example that reuses sprite-image knobs), so a foreign face will not follow `--fam-ink`. Show it in the neutral utility family and say so in the UI.

**F-S3** — "That decision display is new ground."
I agree, and I would go further: I found no browser DAW that shows a source stem next to the MIDI recreated from it. The nearest item is Soundation's drag-and-drop audio-to-MIDI conversion (search excerpt: https://soundation.rockpaperscissors.biz/artist/19187/press_clips/29516/white). So F-S3's Arrange screen has no browser precedent to copy and no known failure to avoid. It changes my view of risk: the Source group must degrade to one thin placeholder lane when there are no stems, or the screen is an empty frame today.

**F-S4** — "I recommend shipping flat and plate only at first, and adding skin per device only when a device earns it."
Agreed. The browser-DAW lesson is the negative case: a press clipping calls Soundation's effects basic, with "very rudimentary controls, often only one or two dials" (search excerpt: https://soundation.rockpaperscissors.biz/artist/19187/press_clips/29516/white), and BandLab gates "One Knob" effects behind a Membership (search excerpt: https://help.bandlab.com/hc/en-us/articles/115002945473-Adding-Effects). Both read as devices without identity. F-S4's hero graph per device is a stronger answer than a colour or a skin, and it is cheap in SVG.

## Answers

**To F-O1, question 5** ("does any browser DAW use floating plug-in windows inside the page? How do they handle overlap on a laptop screen?"): not found.
- A search aimed at Amped Studio plug-in windows returned no statement that they float or can be dragged out. It did say the VST Remote device panel opens at the bottom of the screen, and that a Super Preset can be unfolded to show and edit its full device chain, so no separate plug-in window is needed (search excerpt: https://ampedstudio.com/blog/how-to-use-vst-plugins-inside-amped-studio/ and https://www.ampedstudio.com/blog/studio-redesign/; the summary did not say which page held which sentence).
- Soundtrap: an Effects Rack where effects are added, removed and reordered by drag, each with an on button and a dry/wet mix (search excerpt: https://blog.soundtrap.com/how-to-make-music-in-soundtrap/). No window behaviour found.
- BandLab: effects chain on the selected track, bypass toggle, drag to reorder, 10-effect cap (round 1). Where the panel sits differs by source, left or right (round 1).
- openDAW: reviewers describe a familiar timeline plus device panel (round 1, search excerpt: https://bedroomproducersblog.com/2026/08/22/opendaw-review/). Overlap handling: not found.
- Audiotool: the free desktop is the one layout where overlap could occur; how it is handled: not found.
So the honest answer is that I found docked panels in every case where a position was stated, and no evidence about overlap handling anywhere.

**To F-O2, question 1 and F-S2, question 1** (one chain at a time, or many faces open): the browser-DAW evidence leans to one selected-track chain, as above. It is thin: it covers where the panel sits, not how many are open.

**To F-O2, question 4** (a small permissively licensed knob library): not my area. One licence fact from my topic: openDAW is AGPL v3 or later (verified: https://github.com/f15u/opendaw), so its device code cannot be copied into a non-AGPL repo. Its device names and list are fine as a vocabulary reference.

## One disagreement

**F-H1**, "A browser on the left that lists the 13 synths and 10 processors with Live 12's approach" (its borrowing item 3).

I disagree with a permanent left browser column for Havantechno.
- Havantechno's device set is fixed and small: 13 synths and 10 processors, of which only a few are inserts a user can choose. Live's browser exists because the library is large and grows. F-H1 itself lists "Havantechno has no content library to browse" under "would not fit" for Packs and Cloud, which is the same reason.
- The browser DAWs I found add a device from the place it will sit. BandLab uses a "+Fx" control under the track name or Add Effect in the Effects panel (round 1, search excerpt: https://help.bandlab.com/hc/en-us/articles/115002945473-Adding-Effects), and Soundtrap adds effects in its Effects Rack (search excerpt: https://blog.soundtrap.com/how-to-make-music-in-soundtrap/). Neither needs a browsing column.
- A left column costs width on a laptop. F-O1 and F-H5 both need that width for the 200-bar ruler and the track strips; F-H5 notes that a ruler at phone width gives about 1.8 px per bar.
Where I agree with F-H1: a browser becomes worth its width when stems and MIDI clips exist, because then there is a library of imported items. Build it then, as a drawer.

## My suggestion

**Chain Bench** (a refinement of F-S2's "Strips over a Device Row", with parts of F-O1's Concept A, "Bench")

One window and no floating windows. At the top, the transport and a proportional section ruler (F-H5). Under it, the track list as compact strips: a family-coloured rail, name, M and S, level and the 16-step row, with one strip selected. At the bottom sits one chain strip for the selected track, signal left to right: instrument face, then its inserts, then the channel (pan, sends, duck). Each device is a self-contained face drawn from the registry (F-O2) with a generic slider face as fallback (F-S2 and F-H2). Each face has a header with a bypass toggle; a double-click on the header folds it. An "+ insert" menu at the end of the chain adds from the processors that exist, with a chain cap, as BandLab does. A second tab of the same strip shows sends and master. Above the track list there is one thin Source lane that stays a placeholder until stems exist (F-S3). A registry entry may be a foreign face, a WAM GUI mounted in a neutral frame, so WAM plug-ins can come later without a layout change.

- Borrows from Ableton Live: the Device View chain at the bottom, left to right, driven by selection; folding a device by its title bar; the ruler and locator-style section markers (F-H1, F-H5).
- Borrows from Logic Pro: the always-visible channel strip per track with level, M and S; the generic Controls view as the fallback face for every device (F-H2); Smart Controls-style macros later as a folded-device state.
- Borrows from browser DAWs: BandLab's selected-track chain with bypass, drag to reorder and a cap; Amped Studio's bottom device panel and its Super Preset that unfolds into its full chain (a way to show a macro over a chain); the WAM split of an audio side and a GUI side.
- New: the foreign-face slot in the registry, the folding Source placeholder lane, and the insert menu that lists only what the engine has. All three are small and layout-neutral.

```
+----------------------------------------------------------------------+
| > []  126 BPM  swing .06 | bar 42  mainA | [A/B later]   | meter  WAV |
+----------------------------------------------------------------------+
| intro |i2|build |   mainA   |  mainA2   | break |bE|   mainB  |outro |
+----------------------------------------------------------------------+
| SOURCE  (thin placeholder lane; stem lanes when they exist)           |
+----------------------------------------------------------------------+
|#kick   M S lvl  X..x X..x X..x X..x                                  |
|#sub    M S lvl  x... .... x... ....                                  |
|#bass   M S lvl  .x.x .x.x .x.x .x.x    <- selected                  |
|  ... 10 more compact strips ...                                      |
+----------------------------------------------------------------------+
| CHAIN: bass   [chain] [sends / master]                                |
| [BASS face]--> [EQ3 face]--> [+ insert] --> [channel: pan dly rev duck]|
|  osc|filter curve|amp          curve         menu                     |
|  header: name  bypass  fold                                          |
+----------------------------------------------------------------------+
```

Cost note: only the selected chain is fully drawn (about 3 to 5 faces), so F-O2's performance budget holds, and the shell can be built after F-O2's steps 1 and 2 (device list, registry with generic face, one draw loop).

## Open question for the vote

Should the layouts be judged as they would work for today's 13 tracks with no stems, or as they would work once the remix pipeline exists? Concepts that start from stems (F-O1's Tracing, F-S3's Source over Recreation) win on vision and lose on what can be built and used now, and I found no browser DAW to compare them against. If the group does not fix the criterion first, the vote will compare a working shell with an empty frame.
