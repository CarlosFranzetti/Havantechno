# F-H4: floating windows for the effect processors — round 5

Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

## Scope

The owner's direction after the vote: Havantechno becomes a Mac or PC desktop DAW; the voted layout (Strip Bench, as amended in `REPORT.md` section 3) stays as the "System Editor" view; and each piece of gear also gets its own floating window with its own look, as in Logic. This file designs the floating window for the ten processors in `studio/processors.js`, grouped by family (dynamics, time, tone, utility), and gives full detail for three devices: the glue compressor, the delay return and eq3.

Sources of facts. Round-1 Logic and Ableton facts are search excerpts, cited by URL, because page fetches failed in the sandbox. Engine facts are marked `(verified: studio/processors.js line N)` because I read the file. Layout and sizes are my design proposals and are marked as such. No new web searches were used this round.

Device instances in today's song, from the round-1 reports and the screenshots: master glue (compressor), master eq (eq3), master hp and lp (filter), master sat (saturator), master limiter (limiter), send delay and send reverb (returns), bass insert eq (eq3), stab insert width (widener), and one sidechain (duck) per track. Chorus is defined in `processors.js` but is not placed in the song in any round-1 report, so its window is designed for later use.

## Window anatomy common to all

**Size and behaviour (design).** Default 560 by 360 px, minimum 420 by 280, resizable. The hero display is an SVG that scales with the window; the controls reflow from four columns at default size to two at minimum. Each window is an OS window on the desktop build, not a panel inside the page (see "What the desktop allows" below).

**Title bar.** Family glyph (16 px, drawn in family ink), device name, and a context line: "master · glue", "return · delay", "insert · bass". A 2 px family-ink underline under the header, as in F-S4's token table (`REPORT.md` section 5).

**Header row, left to right:**
- **Preset.** Shows "Default" today, which is the factory `spec.value` set. The engine has no preset code (verified: no preset API in `processors.js`), so the slot is reserved and empty until presets exist. Save and recall would use the desktop's file menu.
- **Bypass.** Calls `proc.bypass(b)`, which already exists (verified: `processors.js` line 51). When bypassed, the header is hatched and the hero graph is drawn dashed (F-S4, round-2 file, F-H4 reaction).
- **Editor / Controls.** The Logic pattern. Logic plug-in windows have a graphic Editor view and a Controls view that lists every parameter as a slider with a numeric field, and a preference sets which view opens first (search excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html; default view: https://support.apple.com/en-uz/101781). Here, Editor is the hero display plus grouped dials; Controls is the generic slider list from the face registry's fallback (`REPORT.md` section 4), extended with select and toggle widgets for `wave`, `mode`, `division` and `pingpong`.
- **Link.** Logic's Link control: Off gives each device its own window, and Single shows one window whose content is the most recently opened device (search excerpts: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp2a07a994.html and https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html, which also says the Link button turns purple in Single mode). Havantechno shows link state as a filled chain glyph, not a colour, so it follows the shape-not-hue rule (`REPORT.md` section 4).
- **Show in chain.** Brings the System Editor's device row to that device and marks its chip as open.

**Body.** The hero display takes about 55 to 60 percent of the height. Controls sit in a grid below it. A footer shows the readout of the focused control and a legend of the owner marks (set, ramp, held) from F-S5's marker set. "Re-enable arranged (n)" appears only when controls are held.

**Interaction (one grammar, from F-S5's table, round-2 file).** Vertical drag changes a value; Shift-drag is fine; double-click returns to the home value; Option-click (Alt on PC) goes to the factory default; Delete resets the focused control; Enter opens a typed value; wheel and arrow keys step; a tooltip shows the value while dragging.

**Data path (design).** Every control writes through `seq.setParam(path, v)` and every display reads `params` in one `requestAnimationFrame` loop for the open windows only. The face in the System Editor chain reads the same record and the same loop.

### What the desktop allows that the browser face did not

- **Several windows at once, on several screens.** Logic's floating plug-in windows stay in the foreground and can sit across monitors (search excerpt: https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_4_section_1.html). A browser tab is one screen, which is why round 1 rejected floating windows (F-O1, `DISCUSSION.md` reactions).
- **Full-rate metering.** The browser face read the master analyser every 60 ms with 256 samples (verified: `studio/sequencer.js` lines 98-99, round-2 F-O2 coupling C8). A desktop window can read a 2048-sample or larger block each frame and keep peak-hold in JS. Gain reduction can be read on every frame (`DynamicsCompressorNode.reduction`, a dB value from 0 to -20 per the MDN excerpt: https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode.reduction).
- **Live FFT behind the EQ.** Logic's Channel EQ draws a live FFT curve on the same scale as the EQ curve, with a Pre/Post switch, Peak or RMS mode, and a low, medium or high resolution; Apple notes that high resolution costs much more processing (search excerpt: https://help.apple.com/logicpro-effects/mac/10.2/en.lproj/lgcef1edccd9.html). A desktop window can afford the high setting for the one window the user has open, because only that window runs the FFT.
- **Resizable windows with vector scaling.** The SVG hero scales with the window, so the EQ curve and the tap train stay sharp at any size.
- **Native menus and shortcuts.** Preset files, Option/Alt mapping and window commands go to the OS menus.

Not decided: whether the desktop keeps the Web Audio code in a web view or moves the engine to a native one. The answer changes the cost of the FFT and the GR read, and whether the windows are real OS windows. See Questions.

## Compressor window (glue)

**Device.** The master glue: `BUILD.compressor` in `processors.js` (`DynamicsCompressorNode` followed by a makeup gain). The song's values, from the studio-rack screenshot: threshold -14 dB, ratio 2.5, attack 0.02 s, release 0.25 s, knee 8 dB, makeup 0.5 dB.

**Size.** Default 520 by 360 px, minimum 420 by 300.

**Header.** Name "Glue". Context "master · after EQ and filters, before saturator". Preset "Default". Bypass. Editor / Controls. Link. Show in chain.

**Dominant display: the transfer curve with a gain-reduction needle.** A square plot, 1:1, input dB on the horizontal axis and output dB on the vertical axis, both from -60 to 0 (the compressor's threshold range).
- A dashed unity diagonal (no compression).
- A vertical threshold marker at the threshold value.
- The knee drawn as a smooth bend of width `knee` centred on the threshold.
- Above the threshold the curve has slope 1/ratio.
- Makeup shifts the whole curve up by the makeup value, because the makeup gain is a separate node after the compressor (verified: `processors.js` lines 208-214).
- A live dot at the current input and output levels, from an analyser tap on the unit's input (`p.input`, verified line 64) and its output, each read at full frame rate.
- A gain-reduction needle along the plot's right edge, reading `p.node.reduction` (verified: `p.node = c`, `processors.js` line 212). Its scale runs 0 to -20 dB.
- Under the plot, a three-second strip of gain reduction over time (design).

**Controls.** Six: threshold and ratio as the two large dials; attack and release as a pair, each with a time readout; knee; makeup. Attack and release show ms or s with the unit.

**Sidechain and sends.** The glue has no sidechain input; the engine's compressor takes only the track signal (verified: no key input in `BUILD.compressor`). The window shows "key: internal" in the context line and does not draw a sidechain section. The ducking sidechain is its own device with its own window (see the dynamics family note). Glue has no sends.

**Visibly different from the other two.** The only square plot in the set. Its unity line and the needle on the right edge are unique. The magenta ink (`#ea97d8`, dynamics) is the only magenta on the screen. Its window is the tallest of the three relative to its width.

**Relation to the chain face.** In the System Editor's device row the master glue is a faceplate-density face: a small knee-shaped curve, a threshold tick and a short gain-reduction bar. Double-clicking the title opens this window. Both read the same `params` and the same `reduction`, so they cannot disagree.

## Delay window (send return)

**Device.** The send delay: `BUILD.delay` in `processors.js`, placed as the "return · delay" in the System Editor's RETURNS block. The song's values, from the studio-rack screenshot: time 0.357 s, feedback 0.42, mix 1, tone 2800 Hz, hp 300 Hz. The engine also has `pingpong` (default true) and `division`, and a `bpm` parameter (default 126) (verified: `processors.js` lines 119-123).

**Size.** Default 600 by 380 px, minimum 460 by 300. The window is wider than the glue window because the time axis is horizontal.

**Header.** Name "Delay". Context "return · tempo-synced, 126 BPM". Preset "Default". Bypass. Editor / Controls. Link. Show in chain.

**Dominant display: the tap train.** A horizontal time axis in seconds, from 0 to about 8 repeats of the effective delay. Each repeat is a vertical bar at n times the effective time.
- The effective time is `time`, or the value of `division` at the bpm when a division is set, using `Processors.divSeconds` (verified: exported at `processors.js` line 395).
- Bar height is `feedback` to the power n, times `mix`. This is the engine's loop gain, as an approximation: the tone and hp filters sit inside the loop and are not in the height formula.
- With `pingpong` on, the bars alternate above and below the axis (left and right), which matches the engine's cross-feedback (verified: `fbL` to `dR` and `fbR` to `dL` when pingpong is set, `processors.js` lines 137-138).
- Tone and hp are drawn as a small filter curve in the top-right corner.
- Dragging the first tap sets `time`, the same drag-the-delay-time gesture Ableton's Echo uses on its display (search excerpt: https://www.musicradar.com/how-to/ableton-live-10-echo-explained).
- Changing `division` shows a dotted ghost of the new spacing before it is applied.

**Controls.** Six: time (or the division menu), feedback (0 to 0.95), mix, tone, hp and pingpong (a switch). Division is a menu with the note values, which matches Logic's Tape Delay sync, where note values replace the millisecond readout when sync is on (search excerpt: https://support.apple.com/guide/logicpro-ipad/lpipf03e8133/ipados, iPad guide).

**Sends: who feeds this return.** A "Fed by" panel under the controls lists the nine tracks with their send amounts to this return (per-track values in `song.js`, for example stab 0.15 and lead 0.35 from the round-1 H5 report), as horizontal bars. It is read-only in version 1; clicking a track selects it in the System Editor and shows its send knob. The exact parameter key for a per-track send was not confirmed in the round-1 reports, so the build should check it before wiring the bars.

**Open point: the delay's own bpm.** The delay has its own `bpm` parameter (default 126), separate from the transport tempo. The window can only show "follows transport" if the engine pushes the transport tempo into it. See Questions.

**Visibly different from the other two.** The only window with a time axis and bars rather than a curve. Teal ink (`#21d1ca`, time family). Ping-pong draws the repeats in two bands, above and below the axis.

**Relation to the chain face.** The RETURNS chip for delay shows three mini bars and the division text. Double-clicking opens this window. The chip and the window read the same `feedback`, `time` and `pingpong`.

## EQ3 window (master eq or bass insert)

**Device.** `BUILD.eq3` in `processors.js`: three bands, a low shelf, a peaking band and a high shelf. The master eq values, from the studio-rack screenshot: low 1.5 dB at 90 Hz, mid -1 dB at 400 Hz with Q 0.8, high 1 dB at 8000 Hz. The bass insert uses the same unit with its own values.

**Size.** Default 640 by 400 px, minimum 480 by 300. The widest of the three, because it has the most information on one screen.

**Header.** Name "EQ". Context "master · first in chain" or "insert · bass". Preset "Default". Bypass. Editor / Controls. Link. Show in chain.

**Dominant display: the EQ curve over a live spectrum.**
- Horizontal axis: frequency on a log scale from 20 Hz to 20 kHz. Vertical axis: gain from -24 to +24 dB, the spec's range.
- The curve is computed in plain JavaScript from the three bands' `params` using the standard biquad magnitude formulas. It works without a live audio context, and it is the same curve the browser face would draw. Live `getFrequencyResponse` is the alternative (MDN excerpt: https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/getFrequencyResponse).
- Behind the curve, a spectrum from an analyser tap. Pre reads `p.input` and Post reads `p.output` (both verified: `processors.js` lines 64-65). The Pre/Post switch chooses which one (Logic's Channel EQ has the same switch, search excerpt above).
- The spectrum range is 60 dB by default and draggable on the scale to +20 to -80 dB, as in Logic's Channel EQ.
- The spectrum uses Peak or RMS, and a Low, Medium or High resolution that maps to the FFT size. High costs more processing, so it is available only while the window is open.
- Three handles sit on the curve: the low shelf at lowFreq, the mid at midFreq, the high shelf at highFreq. Drag moves frequency (horizontal) and gain (vertical). The mid handle's width shows midQ; the wheel changes Q while the mid is selected (design).

**Controls.** Seven, in three columns: low (gain, frequency), mid (gain, frequency, Q), high (gain, frequency). The handles and the dials write the same paths.

**Sidechain and sends.** None. eq3 is not a sidechain device and has no sends. The window shows "pre and post" in the spectrum's legend instead.

**Visibly different from the other two.** The only window with a spectrum behind the curve, a log frequency axis, and draggable handles on the curve itself. Periwinkle ink (`#9cb4fe`, tone family). Its plot is wide and short, which is different from the glue's square and the delay's time strip.

**Relation to the chain face.** The chain chip for eq3 has three dots at the handle positions and no spectrum. The spectrum costs a live analyser and a per-frame FFT, which is affordable in one open window and not for every chip. Double-clicking the title opens the window.

## Family notes for the other seven

**Dynamics (magenta): limiter, sidechain.**
- *Limiter.* A sibling of the glue window: the same square plot, a hard knee at the threshold, a ceiling as a horizontal line and the same gain-reduction needle (`p.node`, verified line 227). Controls: threshold, release, ceiling. The engine hard-codes ratio 20, attack 1 ms and knee 1 (verified: `processors.js` lines 224), so the window shows them as fixed read-only text, not dials.
- *Sidechain (the ducker, "Duck (kick)").* The dominant display is the duck envelope: flat at 1, dropping to 1 - depth over the attack, holding, and returning over the release. Its live trace is `p.node.gain.value`, read every frame (verified: `p.node = g`, line 242). A row of ticks shows each trigger; the trigger source is set in code, because the kick calls `trigger` (`processors.js` comment at line 236), so the label says "trigger: kick" and does not offer a control. Controls: depth, attack, hold, release. Desktop: the trace runs at full rate during playback.

**Time (teal): reverb, chorus.**
- *Reverb.* A decay envelope: a time axis up to `size` seconds, with the slope set by `decay` and a predelay marker. `damp` is drawn as a tilt of the tail, and `hp` as a low-cut mark. Controls: size, decay, damp, predelay, mix, hp. Ableton's Hybrid Reverb has an IR zoom (search excerpt: https://www.ableton.com/en/packs/hybrid-reverb/), but Havantechno's reverb is generated and has no IR to show. The decay mapping from `size` and `decay` to a visible envelope is my proposal and needs a read of `K.impulse` in `core.js`, which I did not read.
- *Chorus.* A sine LFO scope: the rate sets the frequency, the depth (0 to 10 ms) sets the amplitude, and the two taps sit at 14 ms and 21 ms. A mix bar at the bottom. Not placed in the song; the window is designed for when it is.

**Tone (periwinkle): filter, saturator.**
- *Filter.* A magnitude response curve, computed from `mode`, `cutoff`, `q` and `gain`, with the `cutoff` handle on the curve. `mode` is a segmented control with the biquad types (the string spec has no choices list yet, so the choices must be written in, as F-O2's round-2 file proposed). `gain` shows only for the peak and shelf modes. The same template serves the master hp and lp, which share one filter type and can be windows named "HP" and "LP". The master hp cutoff ramps from 24 to 180 Hz in the build section, so the window shows that ramp as an arc on the handle (verified in the round-1 H5 report, `song.js`).
- *Saturator.* A transfer curve from the shaper function the engine uses (`K.shaperCurve(drive)`, `core.js` not read), with a tone corner plot. Controls: drive, mix, tone, trim. Ableton's Saturator shows its curve above a circuit selector (search excerpt: https://ask.audio/articles/saturator-ableton-lives-secret-sound-design-weapon). Havantechno's saturator has one curve, so there is no selector.

**Utility (grey): widener.** A width diagram: the mid is drawn flat at 1, and the side level equals `width` (mono at 0, as-is at 1, side doubled at 2, maximum at 3). One control, so the window is the smallest, about 360 by 240. The desktop adds what the browser face could not: a live left and right correlation meter from an analyser tap on the stereo split, which the parameters alone cannot show. Round-2 F-S4 agreed that this is an option, not a requirement.

## ASCII sketches

Glue window (520 by 360, schematic):

```
+-- GLUE ------------------------------------------------ [chain] --+
| glyph  Glue    master · after EQ and filters     key: internal   |
| preset [Default v]  [bypass: off]  [Editor|Controls]  [link: off]|
+--------------------------------------------------------------------+
|  out dB                                 |  GR                      |
|  0 |                       .--------    |   |                      |
|    |                     /             |   |  -4 dB               |
| -20|                 /  ' threshold    |   |  ##                  |
|    |             /                     |   |  ##                  |
| -40|        /   dashed unity           |   |                      |
|    |   /                               |   |                      |
| -60+----------------------------------  |   |                      |
|      -60    -40    -20    0  in dB     |   |                      |
|  [ GR strip, last 3 s ]                 |                          |
+--------------------------------------------------------------------+
| threshold (O)  ratio (O)   attack (o)  release (o)  knee (o) makeup|
+--------------------------------------------------------------------+
```

Delay window (600 by 380, schematic):

```
+-- DELAY ---------------------------------------------------------- [chain] --+
| glyph  Delay    return · tempo-synced, 126 BPM                                |
| preset [Default v]  [bypass: off]  [Editor|Controls]  [link: off]            |
+------------------------------------------------------------------------------+
|                                       tone/hp curve  _/‾‾‾\_                  |
|  level |        |    |    |   |  |  |  |    | |   |   | |                    |
|  ------+--+-----+----+----+---+--+--+--+----+-+---+---+-+----> seconds        |
|  taps  t   2t   3t   4t                                ping-pong: above/below |
|  (drag the first tap = time)                                                 |
+------------------------------------------------------------------------------+
| time (O) or [division 3/16 v]   feedback (O)   mix (o)   tone (o)  hp (o)    |
|  [pingpong: on]                                                              |
| Fed by: stab 0.15 ##  lead 0.35 ###  pad 0.40 ####  ...   (read-only)         |
+------------------------------------------------------------------------------+
```

EQ3 window (640 by 400, schematic):

```
+-- EQ ------------------------------------------------------------- [chain] --+
| glyph  EQ    master · first in chain        [pre|post]  [Peak|RMS]  [High v]|
| preset [Default v]  [bypass: off]  [Editor|Controls]  [link: off]            |
+------------------------------------------------------------------------------+
| +24 dB |  spectrum (grey, live, log Hz)   ....::::::...                       |
|        |      .---.   curve (periwinkle)                                     |
|    0 dB|-----/-----\-----------------------------------------------          |
|        |   (low)     (mid)            (high)   <- drag handles               |
|-24 dB  |                                                                     |
|        +----20---100----1k-----10k----20k Hz  (log)   range [60 dB] drag     |
+------------------------------------------------------------------------------+
| low   gain (O)  freq (o)  |  mid  gain (O)  freq (o)  Q (o)  |  high gain (O) freq (o) |
+------------------------------------------------------------------------------+
```

## Questions

1. **Desktop engine.** Does the desktop build keep the Web Audio code in a web view, or move the engine to a native one? The answer decides the cost of the live FFT and the per-frame gain-reduction read, and whether the windows are OS windows (this file assumes they are).
2. **Windows open at once.** Should several effect windows be open together by default (Logic's model with Link Off), or should Link Single be the default so one window is ever open?
3. **Delay tempo.** The delay has its own `bpm` (default 126), separate from the transport. Should the engine push the transport tempo into it, so the window can say "follows transport" honestly? This is an engine change, and it touches the bpm-synced repeats.
4. **Presets in version 1.** Is a preset system in scope? If not, the Preset slot stays "Default" and is shown disabled.
5. **Shortcuts on both platforms.** Logic uses Option and Command, and the round-1 reports use Alt and Ctrl on PC. Who maps the one grammar to each platform, and is it written into the design or left to the desktop shell?

## Sources

Search excerpts (URLs as they appeared in the round-1 search results; not fetched):
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html (plug-in window: Editor and Controls views, Link, sidechain routing in the header, Preferences)
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp2a07a994.html (Link Off and Single)
- https://help.apple.com/logicpro/mac/9.1.6/en/logicpro/usermanual/chapter_4_section_1.html (floating windows stay in the foreground)
- https://support.apple.com/en-uz/101781 (plug-in default view: Controls)
- https://help.apple.com/logicpro-effects/mac/10.2/en.lproj/lgcef1edccd9.html (Channel EQ analyser: FFT curve, range, Pre/Post, resolution)
- https://musictech.com/tutorials/logic-tutorial-the-compressor/ (gain-reduction meter beneath the EQ display in the channel strip)
- https://support.apple.com/guide/logicpro-ipad/lpip1cc06e29/ipados (compressor sidechain filter modes; iPad guide)
- https://support.apple.com/guide/logicpro-ipad/lpipf03e8133/ipados (Tape Delay sync and note values; iPad guide)
- https://help.apple.com/logicpro-effects/mac/10.1/en.lproj/lgcef18b8994.html (Tape Delay on Mac: feedback and delay time)
- https://www.ableton.com/en/packs/echo/ (Echo: two delay lines, modulation)
- https://www.musicradar.com/how-to/ableton-live-10-echo-explained (Echo display: repeats as rings; drag delay times on the display)
- https://www.ableton.com/en/packs/hybrid-reverb/ (Hybrid Reverb: IR and algorithmic areas)
- https://ask.audio/articles/saturator-ableton-lives-secret-sound-design-weapon (Saturator: curve display above a circuit selector)
- https://www.gear4music.com/blog/how-to-sidechain-in-ableton-live (Compressor sidechain panel opened from beside the bypass button)
- https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode.reduction (reduction: read-only dB, range -20 to 0)
- https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/getFrequencyResponse (magnitude response method)

Repo and screenshot facts (read this round or in round 1):
- `studio/processors.js`: `proc.bypass` (line 51), `proc.input` and `proc.output` (lines 64-65), `BUILD.delay` spec (lines 119-123) and feedback routing (lines 137-138), `BUILD.compressor` (lines 204-218, `p.node = c` at 212), `BUILD.limiter` (lines 220-234, `p.node = c` at 227, hard-coded ratio and attack at 224), `BUILD.sidechain` (lines 236-256, `p.node = g` at 242, kick trigger comment at 236), exports including `divSeconds` (line 395).
- `studio/sequencer.js` lines 98-99: the 256-sample master analyser (round-1 F-O2, coupling C8).
- `docs/screenshots/studio-rack.png`: master glue, master eq and send delay values used above.
- `docs/research/2026-10-23-faceplate-layout/REPORT.md`, section 4 (shared points) and section 5 (colour system).
- `docs/research/2026-10-23-faceplate-layout/transcripts/round1-FH4-effect-faces.md`, Ableton and Logic sections.
