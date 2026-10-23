# F-O1: Design director (principles, why the two DAWs differ, three layout concepts) — round 1
Agent model: Opus. Date: 2026-10-23.

## Scope

My topic is the principles behind the layouts, not a catalogue of panels. F-H1 to F-H5 cover the panel-by-panel detail. I try to answer four questions:

1. What is each DAW's layout optimised for, and where does that come from?
2. Why do Ableton Live and Logic Pro differ, especially on device faces (flat and uniform vs skeuomorphic and per-plugin) and on windows (one fixed window vs floating plug-in windows)?
3. What should a remixing DAW that starts from a source song borrow from each?
4. Three layout concepts for Havantechno that differ from each other at the root.

I give the three concepts equal weight here. My one suggestion comes in round 2, after I have read the other eleven files.

## What I looked at

- `BRIEF.md` (this folder), `prd.md` (S1 to S12, D1 to D4), `studio/index.html`, and `studio/studio.js` (206 lines, page logic only).
- The two screenshots. `studio-playing.png` shows 13 identical cards in a 4-column grid. Each card has a name, M/S, a 16-cell step row, five sliders (level, pan, send delay, send reverb, duck depth) and collapsed "synth parameters" and "inserts" sections. The header holds the transport, BPM, swing, a bar/step/section readout, a meter and the export buttons. Under it is a row of section buttons. `studio-rack.png` shows "processors: sends and master": eight identical units, each a title plus a slider list, with bypass on the master units. Everything is one monospace font, cyan sliders on near-black. Nothing tells a kick from a pad, or a reverb from a limiter, except the label.
- Code facts that limit the layout (read in the repo):
  - `studio.js` builds every control from the `spec` objects through `paramSliders`. It already detects log ranges (`max/min > 50`).
  - Section changes call `refreshPatterns`, which pushes `sec.set` values back into the sliders.
  - `selfcheck.js` loads only `core`, `synths`, `processors`, `sequencer` and `song`. It never loads `studio.js`, so a new UI cannot break the self-check unless it changes engine files.
- Note: during this round, `CLAUDE.md` was changed to point at a folder named `olde Havantechno dub studio/`. That folder holds the same file names as `studio/`. I read `studio/`, as the brief says.
- 12 web searches, all used (listed under Sources). Every page fetch failed with a DNS error (roberthenke.com, musicradar.com, ccrma.stanford.edu). So every external fact below rests on a search-result excerpt and is marked that way.

## Why Ableton and Logic differ

### Ableton Live: a stage instrument that grew into a studio

**Origin.** Live began as Max patches that Gerhard Behles and Robert Henke wrote to perform their techno project Monolake live, with Bernd Roggendorf credited as a co-creator (search excerpt: https://en.wikipedia.org/wiki/Ableton_Live).

In a 2023 interview, Behles said the Max work "turned into an early prototype of Live that included features like Session View". He said it "allowed us to break away from playing songs linearly, which was new at the time". He thinks Henke brought the first patch for it, but is not sure (search excerpt: https://products.zplane.de/blog/gerhard-behles-interview-ableton).

Henke is reported as saying "we just thought that our concept of a more performance-focused sequencing system would be interesting for a small group of people" (search excerpt: https://www.musicradar.com/news/ableton-live-origins-robert-henke).

**Single window as a rule.** A 2003 mailing-list post relays a conversation with an Ableton designer. It says everything must fit into one window, and that overlapping or pop-up windows were ruled out because live performers should not have to manage windows (search excerpt: https://ccrma.stanford.edu/mirrors/lalists/lau/2003/01/0359.html). This is second-hand, and I found no current Ableton statement of it.

A Tape Op review of Live 4 contrasts a typical multitrack program, with a dozen or more windows for mixer, pool and effects, with Live's single window (search excerpt: https://tapeop.com/reviews/gear/46/live-4). Sound on Sound describes "one window, two views" with fixed panels (search excerpt: https://www.soundonsound.com/node/4908743).

**Two views of one set of tracks.** The manual calls Arrangement and Session the two main views. Arrangement is for structuring a song on a linear timeline. Session centres on improvisation, looping and clip launching (search excerpt: https://www.ableton.com/en/live-manual/12/arrangement-view).

The two views share tracks: Session columns are the Arrangement's tracks, and each track plays from only one view at a time. Swapping views "does not switch modes, alter what you hear or change what is stored" (search excerpt: https://www.soundonsound.com/techniques/live-fundamental-concepts).

**The device chain is a strip, and position is signal flow.** The Device View is where you insert, view and adjust a selected track's devices. Devices are connected serially, "passing their signals from one device to the next, left to right". You reorder by dragging a device's title bar, without interrupting the audio. Devices have input and output meters (search excerpt: https://www.ableton.com/en/live-manual/12/working-with-instruments-and-effects/). By default the Device View shows only one chain (search excerpt: https://www.ableton.com/en/live-manual/12/instrument-drum-and-effect-racks/).

**Flat and uniform.** Live 10's redesign:
- brought in a lighter typeface, Ableton Sans, used everywhere (search excerpt: https://www.soundonsound.com/reviews/ableton-live-10);
- thinned or removed lines and redrew knobs and sliders as vector graphics so they scale;
- renamed skins to Themes and kept them "around the subdued end of the spectrum" (search excerpts: https://www.soundonsound.com/reviews/ableton-live-10, https://edu.garnishmusicproduction.com/?p=21516).

CDM called it "probably the biggest UI overhaul Live has ever had – and yet you won't really notice it" (search excerpt: https://cdm.link/ableton-live-10-depth-hands-impressions-whats-new/).

**I found no official Ableton statement of why devices are flat and alike.** The reasons in circulation are community views:
- plain device names ("Sampler", "Reverb") and a dense, scalable layout (search excerpt: https://forum.ableton.com/viewtopic.php?p=709962);
- easier to read on stage than 3D or gradient styling (same forum excerpt);
- Live "looks and works like a computer program" and everything on screen has a function (search excerpt: https://ethanhein.substack.com/p/user-interface-case-study-propellerheads-figure).

**What Live optimises for, in my reading:** never losing your place. One window and fixed panels, so spatial memory never breaks. Selection drives the bottom panel. Every device uses the same grammar (title bar, on/off, knobs, meters), so an unfamiliar device can be read in seconds on a dark stage. The cost is that devices look alike. That is exactly what the Havantechno owner objects to in D1.

### Logic Pro: a studio that you can see

**Single window since Logic Pro X.** Logic Pro X (July 2013) introduced "a new, single-window customizable interface" in line with Final Cut Pro X (search excerpt: https://apple.fandom.com/wiki/Logic_Pro_X). MusicTech found it radically redesigned but clearer (search excerpt: https://musictech.com/reviews/logic-pro-x-review/). XLR8R thought the arrangement was largely the same as Logic 9 apart from the colour scheme (search excerpt: https://xlr8r.com/?p=73028).

**Fixed areas.** The Tracks area is the central workspace. A control bar with the transport runs across the top, and the Inspector shows the parameters of whatever is selected (search excerpts: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html, https://help.apple.com/logicpro/mac/10.4/en.lproj/lgcpbc21a1fd.html). The current guide lists separate Piano Roll, Step, Score, Audio Track and Audio File editors, plus the Mixer and Smart Controls (search excerpt: https://support.apple.com/en-is/guide/logicpro/toc).

**Plug-ins float.** Plug-in parameters are edited in a plug-in window that opens automatically when you insert the plug-in; a preference turns that off. A Link button sets whether each plug-in gets its own window ("Off") or one window shows the most recently opened plug-in ("Single") (search excerpts: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc403a.html, https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp2a07a994.html). So the main window is single, but devices sit in floating windows on top of it. That is the opposite of Live's Device View.

**Skeuomorphic, and the skin means something.** The stock Compressor is described as "highly skeuomorphic, with rotary knobs, 'analog' meters, color palettes" laid out like outboard gear, while Space Designer leans more on waveforms and plain text fields (search excerpt: https://splice.com/blog/?p=16766). Its Circuit Type menu picks models compared to known hardware (Studio FET to a UREI 1176, Classic VCA to a dbx 160, and so on) (search excerpt: https://dummies.com/software/logic-pro-x/logic-pro-x-plug-ins-compressor-limiter-and-other-dynamic-tools). Apple says the Vintage EQs are modelled on EQs from the 1950s to 1970s and reproduce their tonal character (search excerpt: https://support.apple.com/en-ae/101857). In Logic, the face tells you which sound you are getting.

**Smart Controls: a second, simplified face.** One screen control can drive several parameters across the channel strip, the instrument and its effects. Mappings are learned or picked from a menu and saved with the patch, and an "Automatic Smart Controls" layout maps them for you (search excerpts: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp076273cd.html, https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp6deeba65.html).

**Logic has moved towards Live.** Live Loops (10.5) adds a clip grid that can sit beside the Tracks area in a split view. Each track plays from either the grid or the Tracks area, not both, and cells take priority by default (search excerpts: https://support.apple.com/en-us/HT211140, https://9to5mac.com/2020/05/24/live-loops-logic-pro-how-to/). That is Live's "one track, one active view" rule, shown side by side instead of swapped.

**What Logic optimises for, in my reading:** depth and the studio mental model. A console of channel strips, gear that looks like the gear an engineer knows, many windows for many monitors, and a simplified layer (Smart Controls) for people who don't want the full panel. The cost is window management, a lot of drawing for each plug-in, and two parallel faces per device that can drift apart.

### The root difference

| Axis | Ableton Live | Logic Pro |
|------|--------------|-----------|
| Born as | A performance tool for two techno musicians (search excerpts above) | A recording and mixing studio (Emagic origin: recalled, see below) |
| Main thing a person looks at | The set: clips and tracks, with selection driving a fixed bottom panel | The project: regions on a timeline, plus a console |
| Where devices live | Inline, in one left-to-right strip, inside the window | In floating windows over the window |
| What a device face says | "This is a function", in the same grammar for every device | "This is that piece of gear", with a skin per model |
| How it simplifies | It doesn't. Racks and macros are the user's job (macros recalled, see below) | Smart Controls, an automatic second face |
| Screen assumption | One laptop screen, maybe on stage | A studio desk, maybe several screens |

**The two share one move: selection drives a fixed panel.** In Live it is the Detail/Device View at the bottom. In Logic it is the Inspector on the left and the editors at the bottom. Both put the timeline in the middle. Both now have a clip grid beside it. They differ in whether a device's face is information (Live) or identity (Logic).

The owner's D1 ("each device should have its own look") asks for Logic's identity. The single-screen browser setting asks for Live's discipline. Havantechno has to resolve that tension.

## What a remix DAW should borrow

A remix DAW differs from both references in one way. It always has two versions of every element: the **source** (a stem cut from the reference) and the **recreation** (synths and MIDI that try to match it). PRD D2 and D3 make this pair the basic unit. Neither DAW was designed around it. Logic's Live Loops split view comes closest.

**From Ableton:**
1. **One window, fixed areas, no pop-ups.** In a browser tab, floating windows are worse than in Logic: there is no second monitor, and they fight the page scroll. Selection should drive a fixed panel.
2. **Two views of the same tracks, where swapping the view never changes the sound.** For a remix the useful pair is not Session vs Arrangement but **Source vs Recreation** (or "both"). Each track plays one of them, as in Live, and Logic's split view lets you see both.
3. **The left-to-right device chain.** Havantechno's engine is already serial: synth, then insert chain, then channel strip (sidechain, sends), then master. A horizontal strip shows that order spatially for free.
4. **One control grammar.** Every face uses the same knob drag, double-click reset, value readout and on/off. Distinctness comes from layout, colour and a display, never from different interaction rules. F-S5 should set the grammar.

**From Logic:**
1. **A face that says what the device is.** Not photoreal skins, but each device type gets its own layout, a family colour and one signature display. Some examples:
   - kick: pitch-envelope curve;
   - filter, bass and lead: a response curve;
   - delay: tap dots;
   - reverb: a decay tail;
   - compressor: a transfer curve and gain-reduction needle;
   - riser: a sweep arc;
   - pad: a chord readout.

   D1 asks for this, and SVG can draw it cheaply.
2. **Smart Controls as a "macro face".** Each track gets four to eight big controls that drive several parameters across synth and inserts. With 13 synths and 10 processors, this layer is what fits on screen when 13 tracks are visible. The full face opens only for the selected device.
3. **An Inspector column** for the selected track: channel strip, sends, sidechain, and later the source stem's analysis (key, level, spectrum match).
4. **Circuit types as a skin switch, where the engine supports it.** If Gear Crew adds compressor or saturator models, the face can change with the model, as Logic's Compressor does. Until then, don't fake it.

**New, from neither:**
- **The stem pair as a lane:** the source waveform with the recreation's notes or steps drawn over or under it.
- **A/B and null:** solo source, solo recreation, play both, and a difference readout. The PRD's open question (the 300 Hz to 1 kHz band is several dB hot) is exactly what such a readout would show.
- **The nine sections as first-class markers** shared by every view (they already drive `refreshPatterns`).

**What would not fit:**
- Logic-style free floating windows as the main device surface. A browser tab is one screen, so they would hide the timeline.
- Photoreal skeuomorphism. There are no image files (C1), and drawing hardware in SVG for 23 devices costs a lot.
- Live's uniformity taken all the way. It is what the owner is moving away from.

## Concept A: "Bench" (timeline above, device chain below)

The Ableton-shaped answer, adapted for remixing: one window, the arrangement on top, the selected track's chain along the bottom.

```
+--------------------------------------------------------------------------------+
| > || []  126 BPM  swing .06 | bar 42.3  mainA | [A src][B rec][A+B] | meter | WAV |
+------------+-------------------------------------------------------------------+
| intro |intro2|build|  mainA  |mainA2|break|bE| mainB |outro|   <- section ruler  |
+------------+-------------------------------------------------------------------+
| kick   M S | src  ~~~~/\~~~~/\~~~~/\~~~~/\~~~~/\~~~~/\~~~~        (waveform)   |
|            | rec  #...#...#...#...#...#...#...#...#...            (steps/notes)|
| sub    M S | src  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~                          |
|            | rec  ====....====....====....====....                              |
| bass   M S | ...  (13 pairs, collapsible to rec only or src only)               |
|  ...       |                                                                   |
+------------+-------------------------------------------------------------------+
| bass: [ BASS synth face ] -> [ EQ3 face ] -> [ channel: duck, sends ] -> (out) |
|       cutoff  env  res      low mid high     level pan  dly rev duck           |
|       (o)    (o)   (o)      (o) (o) (o)     (o)  (o)  (o) (o)  (o)             |
|       [ filter curve ]      [ EQ curve ]    [ duck meter ]                     |
+--------------------------------------------------------------------------------+
```

- **Device faces.** Each face is a fixed-height panel, one per device type, set in the bottom strip in signal order: synth, inserts, channel, and then sends and master through a "return" toggle. The faces are flat in Ableton's way, but each type has:
  - its own width;
  - a family colour (drums, bass/tonal, atmosphere, dynamics, space, tone);
  - one signature SVG display.

  The macro layer is optional here. The full face is always the one you see.
- **Source and recreation.** Each track is a lane pair in the timeline. The header has three global audition buttons (source, recreation, both), and each track can override them. Stems that don't exist yet show as an empty "drop or split stem" lane.
- **What it is good at.** It is closest to how producers already think, and it shows all 200 bars, so you get the overview. It needs the fewest new ideas, and you can build it a strip at a time.
- **Main risk: vertical space.** Timeline, lane pairs and a device strip ~180 px tall compete on a 900 px laptop screen. 13 pairs is 26 lanes, so you can see either the song or the devices, not both. Faces squeezed to a fixed height drift back towards look-alike rows of knobs, which is what D1 rejects.

## Concept B: "Console" (mixer first, gear in a rack)

The Logic-shaped answer: the main surface is a mixing console, and devices are distinct pieces of "hardware" that open over it.

```
+--------------------------------------------------------------------------------+
| > || []  126 BPM | intro|intro2|build|[mainA]|mainA2|break|bE|mainB|outro | WAV |
+---------------------------------------------+----------------------------------+
| SOURCE STEMS        | RECREATION                                | MASTER       |
| drm bas syn voc oth | kick sub bass stab clap hO hC shk perc .. | eq hp lp     |
| [==][==][==][==][==]| [::][::][::][::][::][::][::][::][::]      | glue sat lim |
|  |   |   |   |   |  | [ins][ins][ins][ins]                       |  [|||||]     |
|  |   |   |   |   |  |  (o) (o) (o) (o)  <- macro knobs (Smart)  |              |
| _|_ _|_ _|_ _|_ _|_ | _|_ _|_ _|_ _|_ _|_ ...  <- faders, meters |   _|_        |
+---------------------+---------------------------------------------+------------+
|  RACK (opens over the lower half; 1 to 3 units, Logic "Link: Single" default):|
|  +------------------------------------------------------------------------+   |
|  | [o] HAVAN COMP-2   thr (O)  ratio (O)  atk (O)  rel (O)   GR [needle]  |   |
|  +------------------------------------------------------------------------+   |
|  | [o] HAVAN VERB     size (O) decay (O)  damp (O)  [decay tail display]  |   |
|  +------------------------------------------------------------------------+   |
+--------------------------------------------------------------------------------+
```

- **Device faces.** Each device is drawn as a "rack unit" with a strong identity: its own panel colour, its own control layout, a name plate, and sometimes a needle meter or a lit display. This is nearer Logic's skeuomorphism, but drawn in flat SVG with a few gradients, not photoreal.
  - Insert slots on each strip open the unit into a rack area that slides over the lower half.
  - The rack defaults to one unit at a time (like Logic's "Single" link mode), with a pin to keep up to three.
  - Each strip also carries three or four macro knobs (like Smart Controls), so most tweaking never opens the rack.
- **Source and recreation.** Two banks of channel strips on one console: source stems on the left, recreation tracks on the right. Faders, mute and solo on each.
  - A source strip can be "linked" to one or more recreation strips. Linked pairs share A/B and solo, and are drawn joined by a line or colour.
  - The arrangement shrinks to the section bar in the header. Pattern editing happens in the device or in a per-track step drawer, not on a timeline.
- **What it is good at.** It answers D1 most directly, because the gear is the star. It suits mixing and sound matching ("make my bass sound like their bass"), and a console is a strong, familiar picture.
- **Main risk: you lose the song.** There is no visible 200-bar timeline, so structure and automation (`sec.set` ramps) are hidden. Distinct hardware faces for 23 devices are also the costliest art in this group, and the costliest to keep consistent. An overlay rack is still a window, and it hides the strips you are trying to compare.

## Concept C: "Tracing" (the source is the canvas)

A remix-native answer built from neither DAW's main view: the source song is the drawing surface, and the recreation is traced over it, one stem at a time. The window is organised by the D3 pipeline, not by a timeline or a console.

```
+--------------------------------------------------------------------------------+
| > || []  bar 42  mainA |  SOURCE > STEMS > NOTES > SOUND > MIX  | A | B | A+B   |
+----------------+---------------------------------------------------+-----------+
| STEM PAIRS     |  SECTION: mainA (bars 41-72)       [< prev][next >] | INSPECTOR |
|                |                                                   | bass      |
| drums   78% *  |  source spectrogram / waveform of selected stem   |           |
|  kick  91%     |  ░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓                   | MACRO     |
|  clap  64%     |  recreation notes drawn ON TOP (tracing paper):   | (O) bite  |
|  hats  70%     |   ■■  ■■    ■■  ■■    ■■  ■■    ■■                 | (O) body  |
| bass    82% <  |                                                   | (O) move  |
| synths  55%    |  difference strip:  +3dB 300-1k  ▁▂▅▇▅▂▁             | (O) space |
|  stab, lead,   |                                                   |           |
|  pad           |  mini-map of all 200 bars, current section lit:   | [open     |
| other   40%    |  |..|.|...|#####|.....|...|.|.....|..|               |  face >]  |
+----------------+---------------------------------------------------+-----------+
| FACE SHEET (slides up on "open face"): BASS synth -> EQ3 -> channel, full size |
+--------------------------------------------------------------------------------+
```

- **Device faces at two depths.**
  - The Inspector always shows a macro face of four to six controls, named by what you hear (bite, body, move, space). Each one maps to several engine parameters, like a Smart Control.
  - "Open face" slides up a full-width sheet with the complete per-device faces in chain order, the same faces Concept A would use.
  - So a device's identity shows in the full face, while the everyday surface stays small.
- **Source and recreation.** Stems come first, in the left column, with a match score each. The score could be a spectral-distance number from an offline analysis. It is not built, and how to compute it is a question for Gear Crew.
  - Recreation tracks are grouped under the stem they recreate (one drum stem holds kick, clap, the hats, shaker and perc).
  - The centre shows one stem in one section, with the recreation drawn over the source, plus a difference strip.
  - The pipeline stepper across the top changes what the centre shows: SOURCE (whole song, sections), STEMS (split and assign), NOTES (step grid or piano roll over the spectrogram), SOUND (macro and full faces, A/B), MIX (the console, compact).
- **What it is good at.** It is the only concept built around the job D2 and D3 describe, which is matching. It keeps the screen calm by showing one stem and one section at a time. It makes the "how close are we" question visible, which neither reference DAW does.
- **Main risk: it depends on the pipeline, and it is new.**
  - Most of what it shows does not exist yet: there are no stems, no audio-to-MIDI and no match score in the repo. Until they exist, Concept C is an empty frame around today's 13 tracks.
  - It also drops the always-visible song overview (only a mini-map) and the plain "all tracks at once" view that producers expect. Someone coming from Live or Logic may feel lost.
  - The stepper risks becoming five separate apps.

**How the three differ at the root.** In each concept the main object is something else:

| Concept | Main object | Shape | Devices | Source |
|---------|-------------|-------|---------|--------|
| A | The song in time | Timeline | Docked, flat, full faces | One lane per pair |
| B | The mix | Console | Distinct "hardware" over the console, macros on strips | A second bank of strips |
| C | The match | Canvas | Macro face first, full face on demand | The surface everything is drawn on |

## Build notes (plain HTML/CSS/SVG/JS, no build step)

- **Keep the engine untouched.** `selfcheck.js` loads only `core`, `synths`, `processors`, `sequencer` and `song`, so any of the three concepts can be built in page files (`studio.js` plus new globals) without risk to the 161 checks. New UI files would load after `song.js` and before `studio.js`.
- **One face registry, with today's slider list as the fallback.** A global `Faces` maps `type -> function(container, device) -> {refresh(name, value), destroy()}`. If a device has no custom face yet, it gets a generic face built from `spec` with today's `paramSliders` logic, including the log-range detection. Migration is then one device at a time, and the page always works.
- **Shared primitives in SVG, applied consistently.** Every face uses the same `knob`, `fader`, `switch`, `meter` and `display` primitives (one SVG each, with pointer events, keyboard support and an `aria-valuenow`). Distinctness comes from three things:
  - layout: a per-face grid template;
  - CSS custom properties per family (`--face-hue`, `--face-ink`, `--face-plate`);
  - one signature display per type, drawn from the live `params`. For example, the filter display plots the biquad response with `getFrequencyResponse`, a real Web Audio method (recalled, not verified this round). The fake context in `selfcheck.js` doesn't need it, because faces never load there.
- **Mount only what is visible.** In A and C only the selected track's chain is mounted, about 3 to 5 faces. B mounts 13 strips of macro knobs plus 1 to 3 rack units, about 60 small SVGs, which should be fine. 23 full faces at once is what to avoid. F-O2 should measure this.
- **Section sync already exists.** `refreshPatterns` pushes `sec.set` values into the controls. Each face's `refresh(name, value)` should be the single path for that, and later for automation display.
- **Timeline (A, C mini-map).** Draw 200 bars × 26 lanes on one `<canvas>` per lane group. Keep section markers and the playhead in DOM or SVG on top. Source waveforms need decoded stems, which don't exist yet, so draw a placeholder lane until D2.
- **The "rack overlay" in B** should be an in-page panel (`position: fixed` sheet), not `window.open`. That way it stays one window and works on touch.
- **The macro layer (B, C)** needs a small mapping table per track, `macro -> [{path:'bass.cutoff', from, to, curve}]`, set through `Sequencer.setParam` paths. That is data, so it could live in `song.js` next to the track definitions. That is a decision for F-O2, because `song.js` is loaded by the self-check.

## Recalled, not verified

- Logic Pro comes from Emagic, which Apple bought around 2002. This is behind my "studio tradition" reading. Not searched this round.
- Ableton Racks have Macro Controls, which map one knob to several device parameters. This is Live's equivalent of Smart Controls, but the user builds it. Not searched.
- Live's Detail View toggles between Clip View and Device View in the same bottom area. This is partly supported by an unofficial Live 9 shortcut list in a search result (https://www.scribd.com/document/259853929/Live-Keyboard-Shortcuts-Ableton-Reference-Manual-Version-9-Ableton), but I did not see the official manual page.
- Logic's third Link mode (show plug-ins of the same insert slot across channels) is mentioned in older help. My search did not return a source for it.
- Stem separation, from news and blog excerpts only:
  - Ableton Live 12.3 added stem separation that runs locally, in Live Suite, with up to four stems (search excerpts: https://djmag.com/news/ableton-unveils-stem-separation-tool-live-123-update, https://routenote.com/blog/ableton-live-12-3-update/).
  - Logic Pro's Stem Splitter separates up to six stems (search excerpt: https://www.editorskeys.com/blogs/news/stem-separation-in-2026-which-daw-does-it-best).

  Both are third-party sources, not Ableton or Apple documentation. F-S3 should confirm. I did not see either app's stem UI.
- `AnalyserNode` / `BiquadFilterNode.getFrequencyResponse` exist in Web Audio and are enough for the response-curve displays.

## Questions for the group

1. **Main question: what is the main object, the song (A), the mix (B) or the match (C)?** The owner's D3 suggests the match. Every DAW we studied suggests the song. Choose before arguing about knobs.
2. F-S4: should "own look" mean Ableton-flat with a family colour and a signature display, or Logic-style "hardware" plates? My bet is the first. B is the case for the second.
3. F-S3: how do Ableton 12.3 and Logic show a separated stem next to the original? Do either show source and derived MIDI together in one lane?
4. F-O2: can a macro mapping table live in `song.js`, or should it stay out of the self-checked files?
5. F-S1: does any browser DAW use floating plug-in windows inside the page? How do they handle overlap on a laptop screen?
6. Gear Crew: is a per-stem "match score" (spectral distance per section) feasible offline in the browser? Concept C depends on it.

Not covered for lack of search budget:
- interviews with Ableton's current UI designers;
- Apple's own words on Logic's plug-in design;
- Live 12's MIDI tools UI;
- Logic's Session Players and Flashback/Quick Sampler faces.

## Sources

Every page fetch failed (DNS errors). Every entry below was seen in a search result only.

1. https://en.wikipedia.org/wiki/Ableton_Live
2. https://products.zplane.de/blog/gerhard-behles-interview-ableton
3. https://www.musicradar.com/news/ableton-live-origins-robert-henke
4. https://roberthenke.com/interviews/ableton.html (seen in results; fetch failed; not used for any fact)
5. https://www.musicradar.com/news/story-of-ableton-live-at-20 (seen in results; fetch failed; not used for any fact)
6. https://ccrma.stanford.edu/mirrors/lalists/lau/2003/01/0359.html
7. https://tapeop.com/reviews/gear/46/live-4
8. https://www.soundonsound.com/node/4908743
9. https://www.ableton.com/en/live-manual/12/arrangement-view
10. https://www.soundonsound.com/techniques/live-fundamental-concepts
11. https://www.ableton.com/en/live-manual/12/working-with-instruments-and-effects/
12. https://www.ableton.com/en/live-manual/12/instrument-drum-and-effect-racks/
13. https://www.soundonsound.com/reviews/ableton-live-10
14. https://edu.garnishmusicproduction.com/?p=21516
15. https://cdm.link/ableton-live-10-depth-hands-impressions-whats-new/
16. https://forum.ableton.com/viewtopic.php?p=709962
17. https://ethanhein.substack.com/p/user-interface-case-study-propellerheads-figure
18. https://apple.fandom.com/wiki/Logic_Pro_X
19. https://musictech.com/reviews/logic-pro-x-review/
20. https://xlr8r.com/?p=73028
21. https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html
22. https://help.apple.com/logicpro/mac/10.4/en.lproj/lgcpbc21a1fd.html
23. https://support.apple.com/en-is/guide/logicpro/toc
24. https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc403a.html
25. https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp2a07a994.html
26. https://splice.com/blog/?p=16766
27. https://dummies.com/software/logic-pro-x/logic-pro-x-plug-ins-compressor-limiter-and-other-dynamic-tools
28. https://support.apple.com/en-ae/101857
29. https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp076273cd.html
30. https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp6deeba65.html
31. https://support.apple.com/en-us/HT211140
32. https://9to5mac.com/2020/05/24/live-loops-logic-pro-how-to/
33. https://djmag.com/news/ableton-unveils-stem-separation-tool-live-123-update
34. https://routenote.com/blog/ableton-live-12-3-update/
35. https://www.editorskeys.com/blogs/news/stem-separation-in-2026-which-daw-does-it-best
36. https://www.scribd.com/document/259853929/Live-Keyboard-Shortcuts-Ableton-Reference-Manual-Version-9-Ableton

Searches run (12 of 12):
1. Session View origin (Henke/Behles)
2. Ableton single-window philosophy
3. Logic Pro X 2013 single-window redesign
4. Ableton Detail/Device View manual
5. Ableton flat design rationale
6. Logic skeuomorphic plug-ins and circuit models
7. Logic main window, Inspector and plug-in windows
8. Logic Live Loops split view
9. Live 12 and Logic stem separation
10. Logic Smart Controls
11. Live 10 redesign (Ableton Sans, vectors)
12. Ableton device chain left to right
