# F-S2: implementation of per-device faces without a build step — round 1
Agent model: Sonnet. Date: 2026-10-23.

## Scope

How to build a distinct panel ("face") for each of the 13 synths and 10 processors in plain HTML, CSS, SVG and JS with no build step, while the parameter spec stays the single source of truth. Covered: knob and slider implementations (SVG, Canvas, DOM) and existing libraries with licences; custom elements; per-device theming with CSS custom properties; meters and scopes with AnalyserNode; pointer, keyboard and touch input; ARIA; performance of many SVG panels. Ends with an architecture for Havantechno and one layout suggestion.

Not covered: the look of each face (F-S4, F-H3, F-H4), interaction conventions in depth (F-S5), other browser DAWs (F-S1).

## What I looked at

- `BRIEF.md` (all of it) and both screenshots. `studio-playing.png`: a grid of identical cards, each with a 16-step row and five sliders (level, pan, send delay, send reverb, duck depth) and a collapsed "synth parameters" section. `studio-rack.png`: "processors: sends and master", a grid of boxes that are all label + slider + number, with a bypass button on master units. The screenshot header shows an older product name, not the `HAVANTECHNO STUDIO` that `studio/index.html` has now, so the screenshot predates a rename.
- `studio/core.js` (`Kit.defineParams`), `studio/studio.js`, `studio/index.html`, and the `spec:` objects in `synths.js` and `processors.js`. I also read `studio/selfcheck.js` and ran it: `OK: 161 checks passed` before any change. I changed nothing in `studio/`.
- `CLAUDE.md` changed on disk while I worked. It now names a folder `olde Havantechno dub studio/` as the studio location. That folder exists next to `studio/` and `diff -rq` reports the two as identical, so everything below applies to both; I use the `studio/` paths from the BRIEF.
- Web: 11 searches (of 12 planned) and 4 page fetches. Two fetches worked (GitHub pages for input-knob and webaudio-controls); the W3C APG page failed (DNS error) and npm `precision-inputs` returned 403.

## Findings

### F1. How the current UI is generated, and what it implies

- `Kit.defineParams(obj, spec, onSet)` gives every instrument and processor `obj.spec`, `obj.params`, `obj.set(name, value, opts)` (clamps to min/max, rejects NaN and unknown names) and `obj.get`. A spec entry is `{min, max, value, unit}`; string and boolean entries have only `value`. (verified: `studio/core.js`)
- `studio.js` `paramSliders(parent, spec, params, setter, skip)` walks a spec and makes one `<input type=range>` row per entry. Rules it hard-codes: skip non-number entries; step by range size (>1000: 1, >50: 0.5, >5: 0.05, else 0.001); treat a param as logarithmic when `min > 0 && max/min > 50` and slide on `Math.log(value)`. The same function renders synth parameters, per-track inserts, send units and master units. (verified: `studio/studio.js`)
- Consequence 1: string and boolean params have no control today. From the specs: `wave` (bass, lead), `mode` (filter), `division` (delay), `pingpong` (delay) are unreachable from the page. A face needs a select and a toggle widget anyway.
- Consequence 2: `refreshPatterns()` pushes section-automation values back into sliders through `ui.strips[name].params[param].refresh(...)`, with a special case for log sliders. Any new control must keep a `refresh(realValue)` method of that shape, or `studio.js` needs a small change there.
- Size of the job, counted from the specs (computed with a Node one-off, not written to disk): synth params per type are kick 7, sub 5, bass 12, stab 11, clap 8, hat_closed 5, hat_open 5, shaker 5, perc 5, lead 12, pad 7, riser 5, impact 4; processors are filter 4, saturator 4, delay 8, reverb 6, eq3 7, compressor 6, limiter 3, sidechain 4, widener 1, chorus 3. The live page has about 193 numeric controls (78 synth params excluding `level`, 13 tracks x 5 strip controls, 42 in the send and master rack, 8 in inserts).
- The master analyser is one `AnalyserNode` (`fftSize = 256`) on `seq.out`, read every 60 ms with `setInterval` for a peak bar. No per-track or per-device analyser exists. (verified: `studio/sequencer.js` lines 98-99, `studio/studio.js` `meter()`)
- `selfcheck.js` loads only `core, synths, processors, sequencer, song` into a `vm` sandbox with a fake AudioContext and no DOM. So UI code is never executed by the self-check today. The fake context already has `createAnalyser` with `getByteTimeDomainData` only. (verified: `studio/selfcheck.js`)

### F2. Existing knob and slider libraries (licences)

| Library | What it is | Licence | Fit for Havantechno |
|---|---|---|---|
| webaudio-controls (the page I fetched is the `ryoyakawai` fork of `g200kg/webaudio-controls`) | Custom elements: `webaudio-knob`, `webaudio-slider`, `webaudio-switch`, `webaudio-param`, `webaudio-keyboard`. Skinning is mostly raster images (`src` attribute, stitched multi-frame images); without an image the look comes from a `colors` attribute. SVG not mentioned. | Apache-2.0 (verified: https://github.com/ryoyakawai/webaudio-controls). The author's 2013 blog also says Apache 2.0 (search excerpt: https://www.g200kg.com/archives/2013/08/webaudio-contro-1.html). | Permissive, but the raster-skin model fights per-device vector theming with CSS variables. The page did not say whether it is maintained. A search excerpt from a fork listing says the library was built on Polymer 1.x; I did not see that on the page itself, so (unverified). Good as a catalogue of widgets and attributes to copy, not as a dependency. |
| input-knob (Google Chrome Labs) | One custom element that behaves like `<input type=range>`: `value`, `min`, `max`, `scale`, events `knob-move-start`, `knob-move-change`, `knob-move-end`; themed with CSS and `::part(rotator)`. | Apache-2.0; repository archived by its owner on Sep 27, 2023, read-only (verified: https://github.com/GoogleChromeLabs/input-knob) | Archived, rotates one element only (no value arc). Useful as a reference for the range-like API and `::part` theming. Not a dependency. |
| NexusUI | Canvas-based dials, sliders and other UI for the browser; no sound generation. | "New BSD" according to older docs and press; the current v2 README did not state it (search excerpt: https://www.synthtopia.com/content/2014/07/16/free-nexusui-turns-your-web-browser-into-a-music-controller/). Check the repo LICENSE before use. | Canvas widgets are one `<canvas>` each and cannot be styled by CSS variables. Not a fit for CSS-themed faces. |
| react-dial-knob | HTML/SVG knob as a React component | MIT (search excerpt: https://www.jsdelivr.com/package/npm/react-dial-knob) | React; no. |
| precision-inputs | npm package, knob and fader widgets | not found (page fetch got 403) | not assessed. |
| input-knobs.js | Turns `<input>` elements into knobs, faders and switches; used by an SVG-panel prototype | not found | not assessed. |

- I found no GPL-licensed candidate. That is "not found", not "none exist".
- A small prototype (XPUB "Nutritional synth") builds synth panels from an SVG drawing, borrowing the idea from VCV Rack: a separate parameters layer marks shapes that become knobs and sockets (search excerpt: https://hub.xpub.nl/soupboat/~kamo/projects/panel). This is the "face as a drawing" route: an SVG file per device, with placeholders bound to params. It is attractive for artists but harder to lint and to theme; see "What would not fit".
- Web Audio Modules (WAM) plugins pair an audio processor with a web-component GUI; the example I saw reuses the webaudio-controls knob with sprite images (search excerpt: https://github.com/guizmo2000/WebAudioPluginBank). Licence of that repo not found.
- A HISE forum thread says filmstrip knobs are tied to predefined frame counts and PNG strips had to be regenerated (search excerpt: https://forum.hise.audio/post/2942). That is the practical cost of raster skins; vector knobs have no frame count.
- Conclusion: no library found is worth a dependency. The knob itself is about 60 lines of JS plus an SVG template, and the repo's rule (plain globals, no build, no files for sprites) points to writing it in-house.

### F3. Custom elements and theming

- CSS custom properties inherit, so a page-level or face-level value reaches into a component, including across a shadow-root boundary; a component can only be themed this way for the properties it actually reads with `var()` (search excerpts: https://www.open-wc.org/guides/knowledge/styling/styles-piercing-shadow-dom/ and https://vaadin.com/docs/v14/flow/styling/css-custom-properties). `all: initial` does not reset custom properties; registering with `@property` is the way to stop inheritance (search excerpt: https://modern-web.dev/guides/going-buildless/css/). A nested component inherits a parent's value, which can surprise (same excerpt).
- `index.html` already defines tokens on `:root` (`--bg --panel --line --fg --dim --acc --acc2 --on`). Per-device theming is the same idea one level down: `.face { --face-acc: ...; }` and every control reads `var(--face-acc, var(--acc))`. (verified: `studio/index.html`)
- Design choice, not from a source: use **light-DOM** custom elements or plain factory functions, not shadow DOM. With light DOM the page's CSS, focus rings and the CSS variables all work with no `::part` plumbing, and `querySelectorAll('[data-param]')` can find controls for `refresh`. Shadow DOM buys style isolation that this single-author page does not need.
- Chrome Labs input-knob shows the `::part()` route for when isolation is wanted (verified: https://github.com/GoogleChromeLabs/input-knob).

### F4. Input: pointer, touch, keyboard

- For a custom drag control, set `touch-action: none` in CSS before the touch starts (changes after `pointerdown` are ignored), call `setPointerCapture(pointerId)` on `pointerdown` so moves keep arriving when the pointer leaves the element, and release on `pointerup` or `pointercancel`. If the control sits in a scrolling area, apply `touch-action: none` to the knob only, so the rest still scrolls (search excerpts: https://git.jeena.net/jeena/en.javascript.info/raw/branch/master/2-ui/3-event-details/6-pointer-events/article.md and https://docs.dndkit.com/api-documentation/sensors/pointer).
- Draggable or natively draggable elements can fire `pointercancel` right before a native drag starts; `preventDefault()` on `pointerdown` stops that, and the behaviour varies by vendor, so test on real iOS Safari and Android Chrome (search excerpt: https://lists.w3.org/Archives/Public/public-pointer-events/2017AprJun/0179.html).
- ARIA slider: it must be focusable and work by keyboard, mouse and touch; required value properties are `aria-valuenow`, `aria-valuemin`, `aria-valuemax`; `aria-valuetext` carries a readable value (the APG example is 90 with "1 minute 30 seconds") (search excerpts: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/slider_role and https://www.w3.org/WAI/ARIA/apg/patterns/slider/). The APG lists Right and Up Arrow as +1 step and Left Arrow as -1 step (search excerpt: https://www.w3.org/WAI/ARIA/apg/patterns/slider/). I could not read the APG page itself (fetch failed), so Home, End, Page Up and Page Down are not confirmed from it.
- Other widget libraries use Page Up/Down for a large step and Home/End for min/max (Kendo, DevExtreme), but one older desktop guide has Home and End reversed (search excerpt: https://www.telerik.com/kendo-react-ui-develop/components/inputs/rangeslider/keyboard-navigation and https://docs.oracle.com/cd/E36784_01/html/E36850/keynav-32.html). So: copy the Kendo mapping, and note it is convention, not a standard I confirmed.

### F5. Meters and scopes

- `AnalyserNode.getFloatTimeDomainData()` fills a `Float32Array` with the waveform, the byte variant fills a `Uint8Array`; time-domain buffers are `fftSize` long, frequency buffers `frequencyBinCount` (half). The byte frequency data is 0 to 255 linear in frequency from 0 to half the sample rate. MDN's oscilloscope and bar-graph examples redraw a canvas every frame with `requestAnimationFrame` (search excerpt, mirrors of MDN: https://www-igm.univ-mlv.fr/~forax/MDN/developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteTimeDomainData.html).
- Level meter by RMS or peak from the float data is my inference, not from the result.
- Current code: a 256-sample window is 256/44100 = about 5.8 ms (my arithmetic), short for a smooth peak bar read every 60 ms; with a face meter use 1024 or 2048 and a peak-hold decay in JS.

### F6. Performance of many SVG panels

- Search excerpts agree on the mechanism, not on numbers: every SVG element is a DOM node, a DOM change can trigger style, layout, paint and composite, and canvas wins for hundreds to thousands of animated objects (search excerpt: https://blog.logrocket.com/when-to-use-html5s-canvas-ce992b100ee8). The same results say SVG can do well when you change one attribute on a group instead of many nodes, and that canvas does not always win for few objects or large areas (search excerpts: https://news.ycombinator.com/item?id=2575219 and https://www.jointjs.com/blog/jointjs-performance-overview-testing-diagrams-with-100-000-nodes). All of it is anecdotal or dated; nothing measured on Havantechno.
- My estimate: about 193 controls x about 9 DOM nodes (svg, body, track, value arc, pointer, hidden input, label, value text) is roughly 1,700 nodes, plus 13 x 16 step cells. That is well under the "thousands of animated objects" in the excerpts, and nearly all of it is static: a knob changes only when moved, or on a section change. The things that animate every frame are meters, scopes and the step cursor, which should be few and sit on canvas or on one transformed element each.
- So the main lever is not SVG vs canvas but **how many faces are fully rendered at once**. Rendering the full face only for the selected track (as Ableton's device view does) keeps the detailed DOM to one synth face + its inserts, about 15 to 40 controls. This is design reasoning, to be confirmed with a measurement (see Questions).

## What Havantechno could borrow

An architecture in five parts. Everything is plain globals, loaded after `song.js` and before `studio.js`, in the repo's existing style.

**1. A face is data, in `studio/facedefs.js`.** One global `FaceDefs` with no DOM code, so Node can load it:

```
FaceDefs.bass = {
  family: 'mono-synth', hue: 28, width: 3,           // theme + grid span
  sections: [
    { title: 'OSC',    controls: [ {p:'wave', as:'select'}, {p:'detune'}, {p:'sub'}, {p:'glide'} ] },
    { title: 'FILTER', controls: [ {p:'cutoff', size:'lg'}, {p:'res'}, {p:'env'} ] },
    { title: 'AMP',    controls: [ {p:'attack'}, {p:'decay'}, {p:'release'}, {p:'drive'} ],
                       widget: { as:'adsr', params:['attack','decay','release'] } }
  ]
};
```

- A face names params (`p`) and presentation (`as`: knob, slider, select, toggle, value; `size`; `label`; `role` for colour). It **never states min, max, unit or default**: those are always read from `device.spec[p]`, so Gear Crew changing a range in `synths.js` updates every face with no edit. A key the renderer does not know is an error.
- Composite widgets (`adsr`, `eqcurve`, `filtercurve`, `scope`, `meter`, `stepgrid`) are named in the face and implemented once in `faces.js`. A face may also give `draw(root, device)` for a one-off.

**2. One renderer, `studio/faces.js` (`Faces`).**

- `Faces.render(device, kind)`, where `device` is anything with `type, spec, params, set, get` (`tr.inst`, a `Processors` unit, a channel). It looks up `FaceDefs[device.type]`.
- **Fallback is per device and per parameter.** No definition: `Faces.generic()` draws today's slider list (the existing `paramSliders` body moved here, plus select and toggle rows for the string and boolean params that currently have no UI). A definition exists but leaves some spec entries unplaced: they are appended in a collapsed "more" drawer drawn by the same generic code. No parameter ever becomes unreachable, and a new parameter added to a spec shows up the same day.
- Returns `{root, controls: {name: {refresh(v)}}, dispose()}`, the same `refresh` shape `refreshPatterns()` already calls, so `studio.js` changes by a few lines.
- Value mapping lives in one function, `Faces.scale(specEntry)`, returning `{toPos, fromPos, format}`. Linear by default; logarithmic when `min > 0 && max/min > 50` (the rule `studio.js` uses now, so a knob and today's slider agree); a face may force `curve: 'lin' | 'log' | 'db'`. Everything works on a 0..1 position, so knob, slider, ARIA and keyboard share one code path.

**3. Controls: SVG for the look, a native input for behaviour and access.**

- Each knob is a `<span class="hv-knob">` holding a visually hidden `<input type=range min=0 max=1 step=0.001>` (position, not value) and an `aria-hidden` SVG. The input gives focus, arrow, Home, End and Page keys, touch and screen-reader semantics from the browser; set `aria-valuetext` to the formatted value ("2400 Hz") on every change, and `aria-label` to the param name. This is a design choice. I did not confirm from a source that a native range input is the better base, but it avoids hand-rolling the APG key table whose Home/End/Page rules I could not verify. Focus ring: `input:focus-visible + svg { outline: ... }`.
- The SVG is a body circle, a track arc, a value arc and a pointer line. The value arc uses `pathLength="1"` with `stroke-dasharray` and `stroke-dashoffset`, so a change writes one attribute (recalled, see below). Style comes from variables: `stroke: var(--face-acc)`, `--knob-size`.
- Drag on the SVG: `pointerdown` then `setPointerCapture`, vertical delta (about 200 px for the full range), Shift for fine (x0.1), wheel, double-click or double-tap to reset to `spec.value`, `touch-action: none` on the knob only. Details of the conventions are F-S5's.
- Same file also gives `slider` (SVG or CSS bar), `select` (button group for `wave`, `mode`, `division`), `toggle` (bypass, `pingpong`, mute), and a text value that can be typed into later.

**4. Theming per device.**

```
.face            { --face-hue: 200; --face-acc: hsl(var(--face-hue) 80% 62%); --face-bg: hsl(var(--face-hue) 18% 11%); }
.face[data-family="drum"]   { --face-radius: 4px; }
.hv-knob svg     { color: var(--face-acc, var(--acc)); }
```

The renderer sets only `data-family`, `data-type` and an inline `--face-hue` from the face definition; all colour decisions stay in CSS, so F-S4's visual system is a stylesheet change, not a code change. Light and dark and family densities are CSS custom property sets. `color-mix()` and `@property` are options (recalled).

**5. Meters and scopes from a shared loop.**

- One `requestAnimationFrame` loop in `faces.js` replaces the 60 ms `setInterval`; it runs only while something is visible and playing.
- Level meters: write `transform: scaleY(x)` on a bar element (no layout), with peak hold in JS.
- Waveforms, spectrum, EQ and filter response: one `<canvas>` per focused face (canvas suits the redraw rate; static controls stay SVG).
- Per-device scopes need a tap: for the selected track only, create an `AnalyserNode` and `connect` the device `out` to it as a side branch (it does not alter the audio path), and `disconnect` and drop it on deselect. If faces use `getFloatTimeDomainData`, the fake AnalyserNode in `selfcheck.js` needs that method added, per the CLAUDE.md gotcha about new node types.
- Filter and EQ response curves can be computed analytically in JS from the spec values (RBJ biquad formulas, recalled), so the curve needs no Web Audio node and runs in Node for the self-check. `BiquadFilterNode.getFrequencyResponse` is the alternative (recalled).

**How the self-check keeps passing.** The existing 161 checks do not touch the DOM or any new file, so they cannot regress from adding faces.

- Step 0 (no behaviour change): move `paramSliders` into `Faces.generic`, call it from `studio.js`. Selfcheck unchanged.
- Step 1: add `'facedefs'` to the `load()` list in `selfcheck.js` (one word) and a section 4, "face lint", that needs no DOM: for every name in `Synths.types()` and `Processors.types()`: if a face exists, every `p` is in `spec`; no face repeats a param; only known keys and widget names appear; `as:'select'` only for string params; `as:'toggle'` only for boolean; `as:'knob'` only for numeric. Print unplaced-but-reachable params as a count, not a failure.
- Step 2: a small fake `document` (createElement, setAttribute, appendChild, classList, style) of about 40 to 60 lines beside the fake AudioContext, so the check can call `Faces.render` for all 23 types and assert it returns a control for every spec entry and never throws. This mirrors how the repo already tests audio, and avoids adding jsdom or a `package.json`. Risk: the fake can drift from a real browser, so this does not replace looking at the page.
- Step 3: faces for two or three devices first (kick, bass, delay as the cross-section of drum, mono synth and effect), the other 20 on the generic fallback. Each later face is data plus one lint run.

**One layout suggestion from the implementation side: "Strips over a Device Row".**

```
+--------------------------------------------------------------------+
| transport | bpm | position | master meter | export                   |
+--------------------------------------------------------------------+
| sections:  intro  intro2  build  [mainA]  mainA2  break ...        |
+--------------------------------------------------------------------+
| track strips (compact)                                             |
|  kick   [M][S] ##..#..# step row | level pan      <- selected row   |
|  sub    [M][S] ...                                                 |
|  bass   [M][S] ...   (13 rows, mini controls only)                 |
+--------------------------------------------------------------------+
| DEVICE ROW for the selected track (scrolls sideways)               |
| [ BASS face ]->[ eq3 face ]->[ width ]  |  sends: [delay][reverb]  |
|  full knobs, curves, scope                |  master: eq hp lp glue.. |
+--------------------------------------------------------------------+
```

- Borrowed from Ableton: the device chain shown for the selected track at the bottom, one face per device in signal order. Borrowed from Logic: the always-visible channel strip (level, pan, M/S, sends) per track, and a separate master and sends area.
- New: one face source (`FaceDefs`) feeds both the detailed row and, later, a compact "mini face" using the same data. Only the selected track's faces are fully rendered, which is also the performance lever from F6.
- This keeps today's `studio.js` structures: a strip is today's card with fewer rows, and the device row is the existing `tr.inst`, `tr.chain.procs`, `seq.sends` and `seq.master.procs` shown through `Faces.render`.

## What would not fit (and why)

- **webaudio-controls, NexusUI, input-knob as dependencies.** Raster skins, canvas widgets and an archived repo all work against vector faces themed by CSS variables, and the first two bring Polymer-era or framework-era assumptions (F2). Copying their API ideas is fine; adding them is not worth it.
- **A face per device as a hand-drawn SVG file with placeholders (the VCV-style route).** It looks good and artists can edit it, but there is no cheap way to lint it against the spec in Node, and it duplicates layout per theme. Keep it as a later option for one flagship device, behind the `draw()` hook.
- **Canvas for everything, as in NexusUI.** No CSS variable theming, no free focus or accessibility semantics, and every redraw is JS. Reserve canvas for scopes and curves.
- **Shadow DOM for controls.** It buys isolation this page does not need, and costs `::part` plumbing and harder `querySelector` for `refresh`.
- **A face that restates min, max or unit.** It would drift from the spec when Gear Crew changes a range; the lint forbids it.
- **All 13 faces fully expanded at once.** Possible (about 1,700 nodes by my estimate) but it defeats the point of a distinct face, which needs room; see the layout suggestion.

## Build notes (plain HTML/CSS/SVG/JS, no build step)

- New files, load order `... song.js, facedefs.js, faces.js, studio.js`: `studio/facedefs.js` (data only, Node-loadable), `studio/faces.js` (renderer and controls, DOM only), optionally `studio/faces.css`. No change to `core.js`, `synths.js`, `processors.js`, `sequencer.js`.
- `studio.js` changes: call `Faces.generic` in place of `paramSliders`; later call `Faces.render` for the selected track; replace `setInterval(meter, 60)` by the shared rAF loop; keep `ui.strips[name].params[k].refresh` working.
- Self-check changes: add `facedefs` to `load()`, add the lint section; optionally the fake `document`. Note from CLAUDE.md: a new Web Audio node type used by the studio needs a stub in the fake context; a per-device `AnalyserNode` only needs `getFloatTimeDomainData` added if that method is used.
- The existing helper `Kit.expo` and friends are untouched; the controls call `device.set(name, value)` only, which already clamps and smooths through `Kit.target`.
- Keep `device.set` as the one path from UI to audio, so automation, section sets and UI stay consistent.
- Check list before calling a face done: arrow keys move the value; the value text matches `aria-valuetext`; a touch drag does not scroll the page; double-click resets; `prefers-reduced-motion` stops the meters' smoothing (recalled).

## Recalled, not verified

- `pathLength` on an SVG path normalises its length so `stroke-dasharray` and `stroke-dashoffset` can be given in 0..1 units.
- `BiquadFilterNode.getFrequencyResponse(freqArray, magArray, phaseArray)` exists and returns the filter response.
- RBJ "Audio EQ Cookbook" biquad formulas are the standard way to compute a response in JS.
- `color-mix()`, `@property` and `hsl()` with a `var()` hue are supported in current evergreen browsers.
- `dblclick` is not reliably generated by touch on mobile browsers, so double-tap reset needs a manual timer.
- `transform` and `opacity` changes avoid layout and are the cheapest per-frame style changes.
- MDN generally prefers a native `<input type=range>` to a `role=slider` element where possible.
- `requestAnimationFrame` pauses in background tabs.
- The FaceDefs shape, the control list and the fake `document` are my design, not from a source.

## Questions for the group

1. For F-O1 and F-O2 (and the voters): is it acceptable that only the selected track's device chain is fully drawn, with the other 12 tracks compact? If every device must be visible at once, the performance figure (about 1,700 nodes, my estimate) should be measured on a phone before choosing the layout.
2. For F-S4: can the visual system be expressed as a family (hue, radius, density, background) plus per-device section layout, so it is a stylesheet and a `FaceDefs` change and not code per device?
3. For Gear Crew: will the gear work add or rename spec entries? With the lint above a rename breaks the self-check, which is the intended early warning, but they should know.
4. For F-S5: can the knob conventions (drag distance, fine key, reset, wheel) be fixed in one table I can build into `Faces.scale` and the control factory?

## Sources

Fetched (page content read):
- https://github.com/GoogleChromeLabs/input-knob
- https://github.com/ryoyakawai/webaudio-controls

Search excerpts only (page not read):
- https://www.g200kg.com/archives/2013/08/webaudio-contro-1.html
- https://www.synthtopia.com/content/2014/07/16/free-nexusui-turns-your-web-browser-into-a-music-controller/
- https://www.jsdelivr.com/package/npm/react-dial-knob
- https://www.w3.org/WAI/ARIA/apg/patterns/slider/
- https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/slider_role
- https://www.telerik.com/kendo-react-ui-develop/components/inputs/rangeslider/keyboard-navigation
- https://docs.oracle.com/cd/E36784_01/html/E36850/keynav-32.html
- https://git.jeena.net/jeena/en.javascript.info/raw/branch/master/2-ui/3-event-details/6-pointer-events/article.md
- https://docs.dndkit.com/api-documentation/sensors/pointer
- https://lists.w3.org/Archives/Public/public-pointer-events/2017AprJun/0179.html
- https://www-igm.univ-mlv.fr/~forax/MDN/developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteTimeDomainData.html
- https://www.open-wc.org/guides/knowledge/styling/styles-piercing-shadow-dom/
- https://vaadin.com/docs/v14/flow/styling/css-custom-properties
- https://modern-web.dev/guides/going-buildless/css/
- https://blog.logrocket.com/when-to-use-html5s-canvas-ce992b100ee8
- https://news.ycombinator.com/item?id=2575219
- https://www.jointjs.com/blog/jointjs-performance-overview-testing-diagrams-with-100-000-nodes
- https://github.com/guizmo2000/WebAudioPluginBank
- https://hub.xpub.nl/soupboat/~kamo/projects/panel
- https://forum.hise.audio/post/2942

Repo files read: `docs/research/2026-10-23-faceplate-layout/BRIEF.md`, `studio/core.js`, `studio/studio.js`, `studio/index.html`, `studio/synths.js`, `studio/processors.js`, `studio/sequencer.js`, `studio/selfcheck.js`, `docs/screenshots/studio-playing.png`, `docs/screenshots/studio-rack.png`.

Not got to: Faust's web UI, Tone.js UI examples, VCV Rack's own panel format, the APG page's Home/End/Page rules (fetch failed), the npm `precision-inputs` and `input-knobs.js` licences (403 / not found), Safari-specific pointer behaviour, any measured performance on this page. Searches used: 11 of 12.
