# F-H4: effect faces — round 1
Agent model: Haiku 5.5. Date: 2026-10-23.

## Scope

How Ableton Live and Logic Pro give each built-in effect its own panel: which element gets a graph, which gets knobs, how sidechain controls are shown, and what colour accents are used. Then, for Havantechno's 10 processors, which display element each one deserves, using only parameters that already exist in `studio/processors.js`.

Coverage: the 5 Ableton devices and 5 Logic devices named in the BRIEF were searched. Many specifics are missing (see "Not found"). Web search budget: 12 of 12 used. Two page fetches were tried and failed (DNS lookup refused for help.apple.com and www.musictech.net), so every web fact below rests on a search excerpt. Nothing is marked "verified".

Note for the coordinator: CLAUDE.md in the repo root now gives the studio path as `olde Havantechno dub studio/`. The files I read are at `studio/processors.js` (`/home/user/havantechno/studio/processors.js`). I did not check which path is current.

## What I looked at

- `/home/user/havantechno/docs/screenshots/studio-playing.png`: the current track grid. Each track is a card with a 16-step row, M/S buttons, and slider rows with numeric readouts. Inserts appear as a one-line summary ("inserts: eq", "inserts: width") under a "synth parameters" disclosure.
- `/home/user/havantechno/docs/screenshots/studio-rack.png`: "processors: sends and master". Each processor is a card of labelled sliders with numeric readouts. Cards named "master eq (eq3)", "master glue (compressor)" and similar have a "bypass" button. Sends are plain sliders too.
- `/home/user/havantechno/studio/processors.js`, `BUILD.*.spec` entries (10 types). Parameters per type:
  - filter: mode (string), cutoff 20–20000 Hz, q 0.05–20, gain −24–24 dB
  - saturator: drive 0–1, mix 0–1, tone 500–20000 Hz, trim 0–2
  - delay: time 0.01–2 s, division (string, e.g. "3/16"), bpm 40–300, feedback 0–0.95, mix 0–1, tone 300–20000 Hz, pingpong (bool), hp 20–5000 Hz
  - reverb: size 0.2–8 s, decay 0–1, damp 500–20000 Hz, predelay 0–0.2 s, mix 0–1, hp 20–2000 Hz
  - eq3: low/mid/high −24–24 dB; lowFreq 30–1000 Hz; midFreq 100–10000 Hz; midQ 0.1–10; highFreq 1000–16000 Hz
  - compressor: threshold −60–0 dB, ratio 1–20, attack 0–1 s, release 0.01–1 s, knee 0–40 dB, makeup −12–24 dB
  - limiter: threshold −30–0 dB, release 0.01–1 s, ceiling −12–0 dB
  - sidechain: depth 0–1, attack 0.001–0.1 s, hold 0–0.5 s, release 0.01–2 s
  - widener: width 0–3
  - chorus: rate 0.05–10 Hz, depth 0–0.01 s, mix 0–1
- Code facts that matter for display (from the same file): `compressor` and `limiter` set `p.node` to their DynamicsCompressorNode (lines 212, 227). `sidechain` sets `p.node` to its gain node (line 242). Limiter hard-codes ratio 20, attack 0.001 and knee 1, so none of those is a parameter. Filter's `mode` is a string the biquad type is set from. `makeProc` runs with no AudioContext, and the units then stay inert, so display code must not depend on a live context.

## Findings

### Ableton Live (search excerpts only)

**Compressor (sidechain section).** The sidechain area opens from an arrow beside the bypass button. The panel has a source selector ("Audio From") and a sidechain EQ section. (search excerpt: https://www.gear4music.com/blog/how-to-sidechain-in-ableton-live)
- The sidechain EQ filters only the trigger copy. The compressed audio is unchanged. Typical use: high-pass the trigger so a kick's low tail does not hold the compressor down. (search excerpt: https://cymatics.fm/blogs/production/ableton-audio-effects)
- Guides point to the Activity LED and the gain-reduction meter as the way to confirm the sidechain fires. (search excerpt: https://www.audeobox.com/learn/ableton/how-to-sidechain-in-ableton/)
- A forum thread says the sidechain GUI changed after the printed manual went to press, and the PDF was later updated. The excerpt does not say which of the two forum threads it came from, so both are listed under Sources. (search excerpt: https://forum.ableton.com/viewtopic.php?p=480542 or https://forum.ableton.com/viewtopic.php?p=605095)
- Graph: no transfer curve was found for the Compressor. The meter is the graph.

**Glue Compressor.** One excerpt says Glue has a single meter in dB showing the amount of compression. The excerpt does not give a page. A forum post (anecdotal, unconfirmed) says Live 10 removed the dB gain-reduction meter from the Compressor. (search excerpt, source uncertain: https://gearspace.com/threads/abletons-compressor-clicking.1269599/). Glue's sidechain and its colours: not found.

**Echo.** Ableton's pack page describes it as a modulation delay with two independent delay lines and control of envelope and filter modulation. Sync modes listed: Notes, Triplet, Dotted, 16th. (search excerpt: https://www.ableton.com/en/packs/echo/)
- The display is a "tunnel" of rings. Each ring is one repeat; rings move from the outside toward the centre. Ring spacing = time between repeats. A fixed 1/8-note grid of dots sits in the centre. Delay times are dragged directly on the display. (search excerpt, source uncertain among Echo results: https://www.musicradar.com/how-to/ableton-live-10-echo-explained)
- Knobs: sync mode, two delay lines, modulation amounts. Sidechain: not applicable. Colour: not found.

**Hybrid Reverb.** One device that combines convolution with algorithmic reverb. Any audio file can be loaded as an impulse response. (search excerpt: https://www.ableton.com/en/packs/hybrid-reverb/)
- Two areas: a convolution area where the IR can be zoomed to see its early reflections, and an algorithmic area. (search excerpt: https://www.elephorm.com/formation/maitriser-ableton-live-11-les-effets-audio-et-midi/comprendre-les-reglages-de-la-hybrid-reverb-dans-ableton-live-11)
- A built-in EQ: two peak bands and low-cut and high-cut filters with slopes from 6 to 96 dB/octave. (search excerpt: https://www.ableton.com/en/packs/hybrid-reverb/, excerpt attributes the EQ description to Ableton; Elephorm says the EQ is similar to EQ Eight.)
- Output section: Stereo, Vintage and Bass Mono modes, plus Dry/Wet. Algorithmic and IR engines can run in parallel, in series, or both. (search excerpt: https://djmag.com/news/ableton-announce-live-11-comping-new-devices-more)
- Decay display: not found in Live's own UI. A Max-documentation definition (-60 dB time) exists but is not Live's labelling. (search excerpt: https://docs.cycling74.com/reference/abl.dsp.tides~ was in the results, but the excerpt is not about Live's UI; not used as a source for the panel.)

**Saturator.** Three default dials (Drive, Output, Dry/Wet per the excerpt). A waveshaping display sits above a curve selector. Default circuit: Analog Clip. A drop-down offers six more: Soft Sine, Medium Curve, Hard Curve, Sinoid Fold, Digital Clip, Waveshaper. A Color button engages two built-in filters. (search excerpt: https://ask.audio/articles/saturator-ableton-lives-secret-sound-design-weapon; Color button and circuit notes also match a Sound On Sound excerpt, source uncertain among distortion results: https://www.soundonsound.com/techniques/ableton-live-distortion)
- Graph: the transfer curve, which changes with the chosen circuit and with Drive. Knobs: the three dials. Sidechain: n/a. Colour: not found.

**Roar (Live 12).** Expanded View shows all stages at once. Controls: Drive (input level before the gain stages), Tone Amount (low-frequency attenuation), Color Compensation. Six routing modes: Single, Serial, Parallel, Multi Band, Mid Side, Feedback. (search excerpt: https://www.soundonsound.com/techniques/ableton-live-12-roar; product page https://www.ableton.com/en/packs/roar/ was in the results and was not read further.)

**Not found (Ableton):** EQ Eight curve display, Auto Filter display, Utility (width and gain panel), colour accents on any device. Sources for these were not reached within the search budget.

### Logic Pro (search excerpts only)

**Channel EQ analyser.** A live FFT curve of the incoming signal sits on top of the EQ curves, on the same scale. Default range 60 dB. Drag the scale on the right to set the maximum from +20 dB to −80 dB. Pre/Post switch. Peak or RMS mode and low, medium or high resolution, set from a shortcut menu. (search excerpt: https://help.apple.com/logicpro-effects/mac/10.2/en.lproj/lgcef1edccd9.html)
- Graph: the EQ curve plus the analyser curve. Knobs: band parameters, with the curve as the main control. Sidechain: n/a.

**Compressor.**
- The channel strip has a gain-reduction meter directly beneath the EQ display. Double-clicking it opens the plug-in. (search excerpt, Logic Pro Mac: https://musictech.com/tutorials/logic-tutorial-the-compressor/)
- Circuit-type buttons sit at the top of the plug-in. The interface updates when a model is chosen, and not every parameter is available in every model. Models listed by Apple (iPad guide): Platinum Digital, Studio VCA, Studio FET, Classic VCA, and Vintage VCA, FET and Opto. (search excerpt: https://support.apple.com/guide/logicpro-ipad/lpip25f51558/ipados — this is the iPad guide, not the Mac version.)
- Model details from a MusicTech article: Studio FET and Vintage FET are based on the UREI 1176 (Blackface and Bluestripe); Classic VCA is based on the dbx 160 and has no attack or release controls; Vintage Opto is a slow, optical-style model. (search excerpt: https://www.musictech.net/tutorials/logic-pro/understanding-compressor-circuit-types-in-logic/)
- Discrepancy: a training site lists seven circuits, including a Classic FET that Apple's list does not show. Not resolved.
- **Circuit skins: not confirmed.** The sources say the interface updates and the parameter set changes per model. I found no source describing distinct artwork, colour or graph per circuit. The premise "each circuit has a different look" is therefore not verified.
- Sidechain: a filter on the side-chain input with modes LP, BP, HP, Par EQ and Hi Shelf, plus frequency, Q and gain (gain only in Par EQ and Hi Shelf). It is switchable on or off. (search excerpt, iPad guide: https://support.apple.com/guide/logicpro-ipad/lpip1cc06e29/ipados)
- Transfer-curve display: not found in any excerpt.

**ChromaVerb.** The iPad guide describes a display showing the reverb output overlaid with a damping EQ curve. Parameters named: Attack, Size, Density, Distance, Decay. (search excerpt, iPad guide: https://support.apple.com/guide/logicpro-ipad/lpipdc1fd692/ipados). The Mac version was not confirmed.

**Tape Delay.** Sync button locks repeats to tempo; the current tempo is shown beneath it. Note values (including dotted) replace the ms readout when sync is on. Double and Halve Time buttons. Choosing a note value resets Deviation. Smoothing evens out the LFO and flutter. (search excerpt, iPad guide: https://support.apple.com/guide/logicpro-ipad/lpipf03e8133/ipados). Mac help: Feedback and Delay Time in ms. (search excerpt: https://help.apple.com/logicpro-effects/mac/10.1/en.lproj/lgcef18b8994.html)
- Graph: not found. Colour: not found.

**Not found (Logic):** Space Designer, Phat FX and Stereo Delay panels, and any colour accents. The Mac effects user guide lists sections for Tape Delay, Phat FX, ChromaVerb and Space Designer (search excerpt: https://help.apple.com/pdf/logicpro-effects/en_US/logic-pro-effects-user-guide.pdf). Fetching it failed (DNS), so its contents are unread.

### Pattern across both DAWs (from the above)

- Filters and EQs get a curve. Logic's Channel EQ adds a live analyser on the same scale.
- Dynamics get a meter (gain reduction). Logic puts it under the graph; Ableton's guides use it to confirm sidechain action.
- Delays get a timing display (Echo's ring tunnel) plus note-value menus in place of ms knobs.
- Waveshapers get a transfer-curve display with a circuit selector (Saturator).
- Reverbs get an output or IR display (ChromaVerb's curve overlay, Hybrid Reverb's IR zoom).
- Sidechain is a collapsible sub-panel with its own filter. It is not a separate device.

### Havantechno: display proposal per processor (parameters only)

| Processor | Params in spec | Display element | Knobs left on the face | Live or static |
|---|---|---|---|---|
| filter | mode, cutoff, q, gain | Response curve (log Hz, dB). Handle at cutoff, drag for cutoff/q. Mode as a segmented selector. | none beyond mode | static, computed from params |
| saturator | drive, mix, tone, trim | Transfer curve from the same shaper function the engine uses (`K.shaperCurve(drive)`, Kit file not read). Small corner plot of tone as a low-pass corner. | mix, trim | static |
| delay | time, division, bpm, feedback, mix, tone, pingpong, hp | Echo-style tap display: one tick per repeat at multiples of the effective time (`divSeconds` when division is set), height = feedback^n × mix; pingpong alternates L and R sides. Tone/hp as a small filter curve. | feedback, mix; division as a menu | static, from params |
| reverb | size, decay, damp, predelay, mix, hp | Decay envelope (time from size, slope from decay) with predelay marker; damp shown as tilt of the tail. Mapping is a guess until `K.impulse` in core.js is read. | mix, predelay | static, needs core.js check |
| eq3 | low, lowFreq, mid, midFreq, midQ, high, highFreq | EQ curve with three draggable nodes: x = frequency (log), y = dB; midQ shown as node width. The Eq8/Channel EQ pattern. | none; readouts on nodes | static, from params |
| compressor | threshold, ratio, attack, release, knee, makeup | Transfer curve (input dB vs output dB) with knee drawn from threshold, ratio, knee, makeup offset. Gain-reduction meter beneath, from `p.node.reduction` (live). | attack, release as small knobs | curve static; meter live |
| limiter | threshold, release, ceiling | Hard-knee transfer curve to threshold, ceiling line, gain-reduction meter from `p.node.reduction`. Ratio 20, attack and knee are hard-coded, so not shown as knobs. | release | curve static; meter live |
| sidechain | depth, attack, hold, release | Duck envelope (see diagram below). Live trace from `p.node.gain.value`. The trigger source is set in code (kick calls `trigger`), so label it as text, not a control. | attack, hold, release | envelope static; trace live |
| widener | width | Width diagram: mid fixed at 1, side level = width (0 = mono, 1 = as is, 2 = side doubled, 3 = max). | width | static |
| chorus | rate, depth, mix | LFO scope: sine at rate, amplitude = depth (0–10 ms), two taps at 14 ms and 21 ms base; mix as a dry/wet bar. | rate, depth, mix | static, from params |

Duck envelope for sidechain (from the code: 1 → 1−depth at attack, hold at 1−depth, back to 1 over release):

```
gain
 1 ----\                       /-------------
        \                     /
 1-depth '--------------------'
         |<att>|<-- hold -->|<--- release --->|
```

Widener note: a live correlation or vectorscope display cannot be built from `width` alone. It needs an AnalyserNode reading the output, which is not a parameter. So the widener's "correlation display" from the BRIEF is not achievable under the parameters-only rule. The static width diagram above is the parameter-only version.

## What Havantechno could borrow

- Logic's Channel EQ analyser pattern: a live curve over the static curve, same scale, dB range you can drag. Good for eq3 later. Needs a live read, see Questions.
- Echo's tunnel idea for delay: repeats as rings or ticks, with spacing equal to the delay time. It fits `time`/`division`/`feedback` directly.
- Saturator's transfer-curve-plus-selector: the saturator already has a curve function (`K.shaperCurve`), so the face can show the actual curve the engine uses.
- Compressor meter beneath the graph (Logic). The compressor and limiter already expose `p.node`, so `reduction` is reachable without new parameters.
- Sidechain as a collapsible sub-panel with its own mini display (Ableton). The sidechain processor has its own envelope and parameters, so it can be its own face.

## What would not fit (and why)

- Logic's per-circuit skins: Havantechno's compressor has one algorithm (DynamicsCompressorNode). There is no circuit selector to skin.
- Hybrid Reverb's IR zoom and import: the reverb is generated (`K.impulse`), not loaded from a file.
- Sidechain EQ (Ableton): the sidechain has no filter parameter, so it cannot show one.
- Tape Delay wow and flutter, Roar routing modes: no matching parameters.
- Live correlation or spectrum displays under the parameters-only rule: need an AnalyserNode (see Questions).

## Build notes (plain HTML/CSS/SVG/JS, no build step)

- Compute EQ and filter curves in plain JS from RBJ biquad formulas, so the face works without an AudioContext (`makeProc` is inert without one, and the processors must not throw). If the live node is available, `BiquadFilterNode.getFrequencyResponse(freqArray, magOut, phaseOut)` fills Float32Arrays of the same length, returns NaN outside 0 to Nyquist, and throws InvalidAccessError on length mismatch. (search excerpt: https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/getFrequencyResponse)
- Live gain reduction: `DynamicsCompressorNode.reduction` is a read-only dB value, 0 when there is no input, reported range −20 to 0. Older browsers exposed it as an AudioParam, so read `.value` when the property is an object. Poll at about 30 Hz in requestAnimationFrame, and only while the face is visible. (search excerpt: https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode.reduction)
- Sidechain trace: read `p.node.gain.value` in the same loop. `p.node` is already set on the sidechain (processors.js line 242).
- Faces as inline SVG with a viewBox, drag handles as SVG circles with pointer events. Colour: one accent CSS custom property per device family, on the face root.
- Redraw on parameter change, not every frame, except the meter and the sidechain trace. The `defineParams` callback in `makeProc` is the hook point.
- The self-check uses a fake AudioContext (per CLAUDE.md). Any node method the faces call (`getFrequencyResponse`, `reduction`) needs a stub there, or the check fails. Pure-JS curves avoid that.

## Recalled, not verified

- Ableton's device view generally uses a neutral dark-grey panel with small coloured accents. I did not confirm the colours or which devices use them.
- Ableton's EQ Eight draws a curve with draggable band nodes. Auto Filter has a filter-response graph. Utility has a width control and a gain control. None of this was confirmed by a source.
- Logic's classic plug-ins are skeuomorphic, with brushed-metal or wood-look faces. Not confirmed for Compressor in particular.
- The reverb decay mapping in the Havantechno table (size and decay to an envelope) is my own proposal, not a DAW convention.

## Questions for the group

1. Does the group allow live reads from the audio nodes on faces (`compressor.node.reduction`, an AnalyserNode for an EQ curve overlay or a widener correlation display), or keep to parameters only? Three of the proposals (compressor/limiter meter, sidechain trace, eq3 overlay) and the widener correlation display depend on the answer.

## Sources

Search excerpts only. No page was fetched successfully (help.apple.com and www.musictech.net did not resolve).

- https://www.gear4music.com/blog/how-to-sidechain-in-ableton-live
- https://cymatics.fm/blogs/production/ableton-audio-effects
- https://www.audeobox.com/learn/ableton/how-to-sidechain-in-ableton/
- https://forum.ableton.com/viewtopic.php?p=480542
- https://forum.ableton.com/viewtopic.php?p=605095
- https://gearspace.com/threads/abletons-compressor-clicking.1269599/
- https://www.ableton.com/en/packs/echo/
- https://www.musicradar.com/how-to/ableton-live-10-echo-explained
- https://www.ableton.com/en/packs/hybrid-reverb/
- https://www.elephorm.com/formation/maitriser-ableton-live-11-les-effets-audio-et-midi/comprendre-les-reglages-de-la-hybrid-reverb-dans-ableton-live-11
- https://djmag.com/news/ableton-announce-live-11-comping-new-devices-more
- https://ask.audio/articles/saturator-ableton-lives-secret-sound-design-weapon
- https://www.soundonsound.com/techniques/ableton-live-distortion
- https://www.soundonsound.com/techniques/ableton-live-12-roar
- https://www.ableton.com/en/packs/roar/
- https://help.apple.com/logicpro-effects/mac/10.2/en.lproj/lgcef1edccd9.html
- https://musictech.com/tutorials/logic-tutorial-the-compressor/
- https://support.apple.com/guide/logicpro-ipad/lpip25f51558/ipados
- https://www.musictech.net/tutorials/logic-pro/understanding-compressor-circuit-types-in-logic/
- https://support.apple.com/guide/logicpro-ipad/lpip1cc06e29/ipados
- https://support.apple.com/guide/logicpro-ipad/lpipdc1fd692/ipados
- https://support.apple.com/guide/logicpro-ipad/lpipf03e8133/ipados
- https://help.apple.com/logicpro-effects/mac/10.1/en.lproj/lgcef18b8994.html
- https://help.apple.com/pdf/logicpro-effects/en_US/logic-pro-effects-user-guide.pdf
- https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/getFrequencyResponse
- https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode.reduction
- https://docs.cycling74.com/reference/abl.dsp.tides~ (listed in results; not used for any claim)

Local files read: `/home/user/havantechno/docs/research/2026-10-23-faceplate-layout/BRIEF.md`, `/home/user/havantechno/docs/screenshots/studio-playing.png`, `/home/user/havantechno/docs/screenshots/studio-rack.png`, `/home/user/havantechno/studio/processors.js`.

Not reached within the 12-search budget: EQ Eight, Auto Filter, Utility, Glue Compressor colour, Logic Space Designer, Phat FX, Stereo Delay, and any device colour accents.
