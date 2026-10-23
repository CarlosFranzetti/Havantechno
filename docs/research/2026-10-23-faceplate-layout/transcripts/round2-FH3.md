# F-H3: Instrument faces — round 2
Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

I read all eleven other round-1 files in full (FH1, FH2, FH4, FH5, FS1 to FS5, FO1, FO2). No new web searches this round. Facts about other agents' work are cited to their round-1 file and section. Facts about the repo are cited to the file they came from.

## Reactions

1. **F-O1 (design director).** Quote: "The cost is that devices look alike. That is exactly what the Havantechno owner objects to in D1."
   I agree, and it changes my view. My round-1 file described family colour and a per-device graph as the identity layer, but did not say what the shared base should be. F-O1's rule gives the constraint: one control grammar for every face (same knob drag, same double-click reset, same readout, same on/off), with distinctness coming only from layout, colour and one signature display. I adopt that rule for all 13 synths. The faces will differ in grid and graph, never in how a knob behaves.

2. **F-O2 (tech lead).** Quote: "Build first: steps 1 and 2. These are the device list plus a face registry with a generic face and one UI loop."
   I agree, and it changes my plan. I had assumed the 13 instrument faces would be designed first and placed later. F-O2's registry with a generic fallback means instrument faces can ship one family at a time, and the layout choice does not block them. F-O2 also flags a gap I had noted in round 1: "Selector widgets need a `choices` list" (F-O2 section 1, C6). This changes my suggestion for `wave` on bass and lead. Its option list should live in the `synths.js` spec as a `choices` entry, which F-O2 already plans for the string specs, not be hard-coded in my face.

3. **F-S4 (visual system).** Quote: "Within a family (six drums share one orange) devices must differ by motif."
   I agree with the structure: a family hue plus a per-device hero graph. Its drum and fx rows (section 6) match what I proposed in round 1, including kick as a pitch-drop curve, clap as bursts, riser as a ramp and impact as a hit. I also agree with its choice to give hat_closed and hat_open the same drawn envelope at different lengths, so the pair reads as siblings. My one addition: the hero graph, not the 16 px glyph, should carry the identity at a glance. Six drum glyphs at 16 px are hard to tell apart. This is my judgement, not a tested result.

4. **F-H1 (Ableton main layout).** Quote: "Folding a device by double-clicking its title bar gives a density control without a new view."
   I agree. Fold is the right gesture for moving between a compact and a full instrument face, and a user who learns it once gets the same behaviour on every device. I would make fold the gesture for chip versus full face in the chain, so there is no separate expand button.

5. **F-H5 (mixer, transport, arrangement).** Quote: "The instrument and effect faces (F-H3, F-H4) sit behind the strips and open from them."
   I agree that faces open from the strips. I read "behind the strips" as the bottom detail panel, which matches F-H1 and F-H2, not as a layer over the mixer. I would say this explicitly in the layout, because a face drawn over the strips would bring back the floating-window problem that F-O1 and F-H2 both reject.

## Answers

Only one question was addressed to my area by id. Others are for the group, and where they touch instrument faces I answer them below.

- **F-H1, question 1.** Quote: "Should the bottom panel show only the selected track's device chain (Live's model), or all devices at once in a long strip (closer to the current page)? The answer changes whether F-H3 and F-H4 need to design for a single face per view or for several faces side by side."
  Answer: design for both sizes, and design the full size for one face at a time. Only the selected track's chain shows full faces. Every other track shows a chip-size face in its row, 28 px high, with glyph, name and bypass, as F-S4 section 8 defines it. That gives each instrument two sizes, and the full size must fit the chain panel's height. At about 40 px per knob, three rows of four controls fit. Kick (7), sub (5), stab (11), clap (8), pad (7) and the rest fit. Bass and lead (12 each) need the "more" drawer F-S2 proposes for any parameter that does not fit.

- **F-H4 group question 1** (live reads from audio nodes on faces, quoted in its file). For instrument faces only: no live reads are needed. Their graphs can be computed from `spec` and `params`, as F-O1 and F-O2 both propose. The only live value I would want is an optional per-track level, which is already in the track meter.

## One disagreement

**F-S4 (visual system), section 9, the default track colour.** Quote: "Default: a track's colour is its instrument's family hue at the muted level. That means zero setup, and a kick track is orange without anyone choosing it."

I disagree with this default. If a track's rail is its instrument's family hue by default, then every track's rail matches its own device's ink by construction. F-S4's collision rule (section 9: "when track colour and device ink are within about 30 degrees of hue ... the rail is the track's job and the ink is the device's job") is meant for the rare case of a user-painted clash. Under this default it fires on every track, so the rule that is supposed to keep "two colours, two jobs" separate is never tested in its normal state. F-S4 says the collision rule is "not tested by eye (unverified)", and its own question 2 asks the group the same thing.

Evidence: F-S4 section 9 (the default and the collision rule) and F-S4 question 2. Live's track colours are a palette, per F-S4 B7 and the Recalled list.

My alternative: the rail starts neutral or takes a palette colour by track order, and family colour lives only on the device (header underline, glyph, graphs). Then the collision rule only fires when a user paints a track, which is the case it was written for.

## My suggestion

**Name: Bench Chain.** This is Concept A from F-O1 (its "Bench"), refined with F-H5's channel strip, F-S2's and F-S4's density tiers and the registry from F-O2.

One window. The top is a control bar: transport, BPM, swing, the bar and section readout, the SRC / REC / A+B audition switch and export. Below it, the 200-bar ruler with the nine sections. Each track has one row in the timeline, starting with a narrow channel strip (M, S, level, pan, duck) on its left, as in F-H5's Console Strip. Source stem lanes sit above each recreation row and are collapsed until stems exist. The bottom is a fixed-height chain panel for the selected track only. It holds the instrument's full face first, then its inserts and the channel, in signal order, left to right. Clicking a track's chip selects it and opens its chain. Every face is drawn from the F-O2 registry with the F-O1 control grammar. Family colour is on the device, and the track rail stays neutral (see my disagreement above).

Borrowed from Ableton: the bottom Device View chain, one selected track at a time, fold as the density gesture (F-H1), and the arrangement ruler, without the clip grid. Borrowed from Logic: the per-track channel strip as an Inspector-style column (F-H2), and the generic slider list as the Controls-view fallback for any device without a face. New: family-coloured faces that identify the instrument by its graph, the two-size chip and full face, and a neutral track rail.

Vertical budget (my estimate, not measured): control bar about 40 px, ruler and sections about 40 px, 13 lanes at about 24 px (about 312 px), chain panel about 200 px. That totals roughly 600 px, which fits a 900 px laptop screen with lanes collapsed. Expanding source lanes is what overflows, which is why they collapse by default.

```
+----------------------------------------------------------------------------+
| > || []  126 BPM  swing .06   bar 42 mainA   [SRC|REC|A+B]        WAV      |
+------------+---------------------------------------------------------------+
| channel    | 1    17   25     41        73       105  129 137     185       |
| strip      | |intro16|i2 8|build16|  mainA 32  | mainA2 32 |brk|bE|mainB|out|  |
+------------+---------------------------------------------------------------+
| kick M S   | rec  #..#..#..#..#..#..#..#..  (rail neutral, chip: glyph+name) |
| lvl pan    | src  ~~/\~~/\~~   (collapsed until stems exist)                |
| duck       |                                                                |
| sub  M S   | rec  ====....====....                                          |
| bass M S   | rec  ..#..#..#...                                              |
|  ...       |  ...                                                           |
+------------+---------------------------------------------------------------+
| CHAIN: kick   [KICK  tune punch sweep | decay click drive]  >  [CHANNEL]  > |
|               pitch-drop plot  decay plot (SVG, computed from params)       |
+----------------------------------------------------------------------------+
```

## Open question for the vote

Does the group accept that the full instrument face is drawn for the selected track only, with the other twelve tracks showing chips? A yes makes the full faces (up to 12 controls each) a one-at-a-time design, and it is the cost assumption behind F-O2's cost figures for option A. A no means every instrument needs a full face visible at once, which would change the F-O2 performance budget and my three-row limit.

