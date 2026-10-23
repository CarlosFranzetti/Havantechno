# F-S2: round 2 (discussion)
Agent model: Sonnet. Date: 2026-10-23.

Read in full: the eleven other round-1 files. Web searches used this round: 0 of 2. Facts about the repo are marked `(verified: <file>)` and were read from `studio/` this session (the folder is identical to `olde Havantechno dub studio/`).

## Reactions

**F-O2.** Quote: "A face that reads only `spec` and `params` and writes only through a setter has no audio dependency at all." and "One write path: `seq.setParam(path, v)`. One read path: `dev.obj.params`, polled."
I agree, and it changes my design in three places. (1) My round-1 knobs called `device.set()` and exposed a pushed `refresh(v)`. F-O2's coupling C2 and C4 show why that is wrong: the page has two write paths, and sliders never follow ramps. I now say: controls write through `host.setParam(dev.path + '.' + key, v)` and are read by a polled `sync()` inside one `requestAnimationFrame` loop. (2) I proposed a data-only `FaceDefs` object. F-O2's `Faces.define(type, {...})` registry with `placed()` and a `hide` list is better, because the same call carries the data and the coverage check can ask "is every spec key placed or hidden". I drop `FaceDefs` and adopt that shape; the face data files stay free of `document` at load time so `selfcheck.js` can load them. (3) My control count was low. I counted about 193 controls and left out the sidechain; F-O2 counts 141 live controls plus 91 for channel and sidechain, about 232 (verified count of 137 params across 23 types: matches my own dump, 91 synth + 46 processor params). My node estimate of about 1,700 should therefore be read as about 2,000; the conclusion (render only the selected chain) is unchanged.

**F-S4.** Quote: "State is carried by fill, never by family hue. A control that is on, armed, soloed or playing is a filled shape; an identity element is an outline or a stroke."
This maps onto the knob without any new widget. The knob's value arc is a stroke in `var(--fam-ink)` (identity); on, bypass and held are drawn by a `data-state` attribute on the control root and styled in CSS as fills, hatches or hollow shapes (F-S5's "hollow with an amber marker"). One caution from my own knob design: I drive the value arc with `stroke-dasharray` and `stroke-dashoffset` (`pathLength="1"`, recalled, unverified), so a dashed "bypassed" look cannot also use `stroke-dasharray` on that same arc. Bypass on a knob should be a second element or an opacity change; the dashed treatment F-S4 wants is for the hero graph, where it is free. F-S4's 24 px minimum target is also fine: the SVG is drawn about 36 px, the hit area is padding.

**F-S5.** Quote: "A cheap first step is to keep the inputs and add dblclick, a Shift-slows-drag handler and a value tooltip, then replace them face by face."
Agreed, and my architecture is built to allow exactly this: the hidden native `<input type=range min=0 max=1>` stays under the SVG, so keyboard, touch and screen-reader behaviour come from the browser while the look is replaced one face at a time. F-S5's rule sets need three things from the widget, and I will build them in from the start so no later rewrite is needed: (a) a `state` of inherited, set, ramp or held on every control; (b) a faint ramp arc behind the knob from `from` to `to` for the current section; (c) double-click, double-tap and Delete resetting to `spec.value`. Resetting to the factory value is free because `Synths.create` and `Processors.create` deep-copy the spec, so `spec[k].value` is never overwritten (verified: `studio/synths.js` lines 479-485, `studio/processors.js` `copySpec`). The "held" set that stops ramps overwriting a drag is an engine change, not a widget one, and I agree with F-S5 that F-O2 must cost it.

**F-H4.** Quote: "Pure-JS curves avoid that." (on needing a stub in the fake AudioContext for `getFrequencyResponse` or `reduction`.)
Agreed. Of F-H4's ten hero displays, seven are pure functions of `params` (filter, saturator, delay taps, reverb tail, eq3, widener width, chorus) and can run in Node for the self-check. The compressor and limiter gain-reduction meters and the sidechain trace need a live read; the widener correlation display needs an analyser. I would build the seven first, and add the live three through the taps F-O2 describes. F-H4's closing question (are live reads allowed?) gets a yes from me, with that order.

**F-S3.** Quote: "The current 4-column card grid maps onto the Recreation rows with little change: each card already has a name, M and S, and a step row."
True for the data, and it sets the build order I would use: the Recreation group is the existing `buildTracks()` output made compact, so it can ship before any stem exists, and the Source group is an empty lane that appears when stems do. I would not draw waveforms from raw samples; F-S3's min/max peaks per pixel and F-O2's 16.8M-sample figure agree.

## Answers

**To F-O2 (question 4): "do you know a permissively licensed knob or meter library small enough to vendor as one file?"** No. I checked: webaudio-controls is Apache-2.0 but uses raster, stitched-image skins and its page does not say whether it is maintained (verified: https://github.com/ryoyakawai/webaudio-controls); Google Chrome Labs input-knob is Apache-2.0 but archived on 2023-09-27 and rotates a single element, with no value arc (verified: https://github.com/GoogleChromeLabs/input-knob); NexusUI is canvas and its licence is only claimed in old docs (search excerpt: https://www.synthtopia.com/content/2014/07/16/free-nexusui-turns-your-web-browser-into-a-music-controller/); the precision-inputs page returned 403 and I could not check it. I found no GPL candidate, which is "not found", not "none". So hand-write it. My estimate for the four widgets (knob, slider, select, toggle) with pointer, keyboard and ARIA is about 150 lines of ES5 plus one CSS file, inside F-O2's 2 to 3 days (my estimate, not measured).

**To F-S4 (question 4): can the knob take `var(--fam-ink)` and a 24 px minimum target?** Yes to both. The knob reads `var(--face-ink, var(--fam-ink, var(--acc)))` for arc and pointer, so a face can override the family; nothing in the widget names a colour. I will use F-S4's attribute names, `data-fam` and `--track`, so no translation layer is needed. The hit target is the SVG box plus padding.

**To F-S1 (question 3): should the face contract be written now so a WAM host could slot in later?** Do not design for WAM now; keep one cheap seam. A face takes a plain record `{id, type, path, spec, params}` and a host `{setParam, getParam}` (F-O2's shape), and has a `draw(root, device)` escape hatch. A WAM plugin's GUI is a web component (search excerpt: https://faustdoc.grame.fr/manual/deploying), so a WAM device could later present the same record and have its own element mounted in `draw()`. F-S1 and I both have not read the WAM 2.0 API, so I claim nothing about its exact interface. Licence of the WAM-Studio repository: not found.

**To F-H4 (question 1) and F-O2 (taps):** see the F-H4 reaction above. Live reads: yes, in the order stated, created by the UI only for the selected chain.

## One disagreement

**F-O2's coupling C9 and migration step 1: "Compressor and limiter gain reduction is not reachable. The `DynamicsCompressorNode` is a local `c` inside `BUILD.compressor/limiter.build`."**
This is not what the code does. Both builds set `p.node = c` (verified: `studio/processors.js` lines 212 and 227), and the sidechain sets `p.node = g` (line 242). F-H4 read these lines correctly and cites them. So a gain-reduction meter can read `p.node.reduction` today; step 1's new `p.reduction()` accessor in `processors.js` is not needed to make the meter possible. Consequences for the plan: step 1 gets smaller (the engine files `sequencer.js` and `core.js` still need `seq.devices()` and `choices`, but `processors.js` need not change for metering), and the fake context needs no new method unless engine code calls it, since the UI guards `p.node && p.node.reduction`. F-O2's wider point stands in one respect: the reduction value is a plain number in current browsers but was an AudioParam in older ones (F-H4, search excerpt: https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode.reduction), so a tiny read helper is still worth having, in the UI file, not in the engine.

## My suggestion

**Name: Matrix Bench.**

One window with four bands. At the top, the transport and a section ruler whose blocks are as wide as their bar counts (F-H5's flex-grow idea, 200 bars). Below it, the "matrix": one lane per track, 13 lanes, each with a compact header (name, M/S, two mini knobs for level and pan, a 16-dot step row) and a body of nine section cells showing which variation plays and where a ramp runs; this is read from `seq.sections[].play` and `.ramp`, so it exists today (F-O2 estimates 3 to 4 days, read-only). Selecting a lane fills the bottom band, the Device Row: the selected track's chain left to right, as Ableton lays it out, starting with a PATTERN face (the 16-step editor, with the variant chips) where Live puts MIDI devices before the instrument, then the synth face, then the inserts, then the channel face (duck, sends). At the right end, pinned and always visible, a RETURN and MASTER block shows the two sends and the master chain as chips that open as faces. Every face is one `Faces.define` entry rendered by one renderer at three densities (chip, strip, faceplate), so folded devices are chips and the whole thing costs only the selected chain in the DOM, about 3 to 5 faces and 15 to 40 knobs. A/B and a Source lane per track are reserved for the remix stage: the Source lane opens under a track when stems exist, and the A/B switch goes in the transport (F-S3).

- **Borrows from Ableton Live:** the bottom Device View showing the selected track's chain in signal order, fold to a chip, one window with no pop-ups, the section ruler and overview idea.
- **Borrows from Logic Pro:** the Inspector's pairing of the selected strip with its output strip (the pinned RETURN and MASTER block), the pattern as an editor opened from the selection (Step Sequencer), the marker track as the section ruler.
- **New:** one face definition drawn at three densities; the pattern as the first device in the chain; the matrix lanes as the home for stems later.

```
+----------------------------------------------------------------------------------+
| > []  126 BPM  swing .06 | bar 42.3 mainA | [A/B reserved] | meter | export WAV    |
+----------------------------------------------------------------------------------+
| ruler 1 |intro16|i2 8|build16|  mainA 32  |  mainA2 32  | break 24 |bE|  mainB 48  |out|
+--------------------+-------------------------------------------------------------+
| kick  M S o o ..:. | A    A    A     A          A           A     A    A      A   |
| bass  M S o o x.x. | A    A    A     A          B           C     ~~ramp~~   B   |
| lead  M S o o ...  |      B    B     A          A           B     ...            |
| (13 lanes, 26 px)  |   (cells = variant letter, ramps as lines, playhead on top) |
+--------------------+-------------------------------------------------------------+
| DEVICE ROW  bass:  [PATTERN]->[BASS synth]->[EQ3 insert]->[CHANNEL] || RETURN+MASTER|
|  x..x..x. A B C    wave detune   low mid high   level pan   duck     || dly rev     |
|  16 steps          cutoff env res  [EQ curve]   dly rev     [duck]    || eq hp lp     |
|  [filter curve]    attack decay                                       || glue sat lim |
+----------------------------------------------------------------------------------+
```

## Open question for the vote

Is "only the selected track's chain is fully drawn, the other 12 tracks stay compact" acceptable? Five of the proposals on the table (F-O1's Bench, F-O2's concept A, F-S1's selected-track rack, F-S3's Source over Recreation, and this one) depend on it, and only a console of open faces (F-O1's B) does not; F-O2 and F-H1 asked the same thing. The group should settle that first, because it decides the performance budget and whether every face needs a compact variant, before anyone compares the shells.
