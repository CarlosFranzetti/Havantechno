# F-H4: effect faces — round 2

Agent model: Haiku 5.5. Date: 2026-10-23. Read all eleven other round-1 files in full, plus my own. No web searches this round. Code paths are read from `studio/processors.js` (the `studio/` symlink points to `olde Havantechno dub studio/`).

## Reactions

**F-O1 (design director), agree and change my view.** Quote: "Not photoreal skins, but each device type gets its own layout, a family colour and one signature display." I agree, and it changes my round-1 table. I had listed effects by what the DAWs show. F-O1 turns that into a rule: every one of Havantechno's ten processors gets exactly one signature display, and the display is the face's identity. I now treat that as a requirement, not an option. The per-processor table in my round-1 file becomes the list of those ten displays.

**F-O2 (tech lead), agree, with a correction to my own file and to F-O2's.** Quote: "A GR meter needs a small accessor in `processors.js`." I checked `studio/processors.js` again. The compressor, limiter and sidechain already store their node on the unit: `p.node = c;` at line 212 (compressor), `p.node = c;` at line 227 (limiter) and `p.node = g;` at line 242 (sidechain). So the reduction value is reachable without an engine change. F-O2's accessor is still the cleaner route, because a `p.reduction()` wrapper keeps the face away from engine internals (its C1). I adopt the accessor, but it can be a three-line wrapper, not new audio code. My round-1 claim that the GR value was "not reachable" was also wrong, and I withdraw it.

**F-S4 (visual system), agree.** Quote: "compressor | dynamics | magenta `#ea97d8` | gain-reduction needle; transfer curve with live GR meter". Their section 6 gives each device a glyph plus a hero graph, and that is the right identity cue for the ten processors. It also changes my view on bypass: F-S4's "hero graph drawn dashed" for a bypassed unit is a better signal than a grey-out, and I will use it for every effect face.

**F-H1 (Ableton layout), agree.** Quote: "Folding a device by double-clicking its title bar gives a density control without a new view." Fold is the cheapest density control for ten effect faces in one chain. I want it on every effect face, with the folded state showing the hero graph at small size, so a folded chain still says what each device is.

**F-H5 (mixer and transport), agree.** Quote: "Logic's aux strips are the model for DELAY and REVERB as returns on the right." Delay and reverb are parallel sends in the engine (`seq.sends`, the `send.delay` and `send.reverb` paths), not inserts. A serial device strip would misstate that. I agree they belong in a return area at the chain's end, outside the series line. This is the main structural point my suggestion below depends on.

**F-O2 also, on chain rendering.** Quote: "only the selected chain is live, which is also the cheapest rendering model." This matches my round-1 build notes (3 to 5 mounted faces). It also means I can build effect faces without worrying about a 23-face budget.

## Answers

**To F-S4, question 3** ("For F-H4: can the effect faces agree on one hero graph per device from section 6? If a device can't draw one cheaply, say so"). Yes for nine of the ten. Each graph comes from the processor's own spec, plus a live read where noted:

| Processor | Hero graph | Source of the numbers |
|---|---|---|
| filter | response curve (mode, cutoff, q, gain) | parameters only |
| saturator | transfer curve (drive), tone corner | parameters, via the same shaper function the engine uses |
| delay | tap train (time or division, feedback, pingpong) | parameters only |
| reverb | decay envelope (size, decay), predelay marker | parameters, but the exact mapping needs a read of `K.impulse` in `core.js`, which I did not read |
| eq3 | three-node curve (low, mid, high) | parameters only |
| compressor | transfer curve plus live gain-reduction meter | curve from parameters; meter from `p.node.reduction` (live) |
| limiter | hard-knee curve to ceiling, live gain-reduction meter | curve from parameters; meter live |
| sidechain | duck envelope (depth, attack, hold, release) | parameters; optional live trace from `p.node.gain.value` |
| widener | width diagram (mid 1, side = width) | parameters only |
| chorus | LFO scope (rate, depth in ms, mix) | parameters only |

Two cannot be drawn cheaply in the parameter-only sense. The widener's stereo view (correlation or vectorscope) needs an AnalyserNode reading the output, which is not a parameter. So its hero graph must be the static width diagram, and the live view is an option for later. The reverb mapping from size and decay to a visible envelope is my proposal, not a DAW convention, and I would check it against `K.impulse` before the face is built.

## One disagreement

**F-O1 claims that Logic's Compressor shows a different skin per circuit type, and recommends the same skin switch for Havantechno "as Logic's Compressor does" (Borrow from Logic, item 4; also "In Logic, the face tells you which sound you are getting").** I do not think the evidence supports this as a Logic lesson.

Reasons, from the files:
- My round-1 file (F-H4, Logic Compressor section) found Apple's iPad guide saying only that "the interface updates when you choose a model" and that "not all parameters are available" in each model. No source I found describes different artwork, colour or graph per circuit. I marked the per-circuit skin claim "not confirmed".
- F-S4 (section C, items 5 and 6) reached the same conclusion from its own search: "Not found: what each skin looks like", and "Not found: any statement that each Logic plugin has its own colour."
- F-O1's own source for the look is a Splice post (`splice.com/blog/?p=16766`). It calls the stock Compressor "highly skeuomorphic", which describes the plug-in as a whole, not a change between circuit models.

So what Logic demonstrably does is name the hardware each model imitates (the Studio FET to a UREI 1176, the Classic VCA to a dbx 160). That is a naming lesson, and it costs nothing for Havantechno. The skin switch should come off the list. Havantechno's compressor has one algorithm (`DynamicsCompressorNode`), so a switch would be decoration, as F-S4 says.

## My suggestion

**Bench, Chained.** I endorse F-O1's Concept A ("Bench") as the base, because F-O2 ranks it cheapest and F-O1 says it is closest to how producers think. I change three things for effect faces. First, the bottom panel shows the selected track's chain as one left-to-right line of faces in signal order: instrument, then inserts (bass: eq3; stab: widener), then the channel strip with level, pan and duck. Second, delay and reverb are not in that line. They sit in a RETURNS block at the chain's right end, with the master chain (eq3, hp, lp, glue, saturator, limiter) after them, because the engine treats them as parallel sends and master units. A reader can then see which effects are in series and which are returns. Third, every effect face has one hero graph from the table above, dashed when bypassed (F-S4), and a Fold toggle (F-H1) that shrinks it to the graph alone. Ableton supplies the one-chain bottom panel, the left-to-right order, and fold. Logic supplies the channel-strip inspector for level and pan and the naming of what each device is. What is new is the split between the serial chain and the returns block, which neither DAW draws, because Ableton's device view has no parallel returns and Logic's returns are in the mixer, not in the device view.

```
+---------------------------------------------------------------------------+
| > || []  126 BPM  swing .06  bar 42 mainA   [src][rec][A+B]   WAV          |
+---------------------------------------------------------------------------+
| sections  intro|i2|build| mainA |mainA2|break|bE|mainB|outro   (to scale)  |
+------------+--------------------------------------------------------------+
| kick  M S  | section lanes: pattern letter per section                    |
| sub   M S  | ...                                                          |
| bass  M S  | ... (selected row highlighted)                               |
| ...        |                                                              |
+------------+--------------------------------------------------------------+
| CHAIN bass:  [BASS face] > [EQ3 face] > [channel: lvl pan duck]  | RETURNS |
|              synth        curve(hero)                            | [DELAY] |
|                                                                  | [REVERB]|
|                                                                  | MASTER  |
|                                                                  | eq hp lp|
|                                                                  | glue sat|
+---------------------------------------------------------------------------+
```

## Open question for the vote

Should the chain show the inserts in series with sends and master in a separate RETURNS block (as above), or should sends and master go into the same line as the inserts? The answer decides whether the master chain, which the engine runs in fixed order, is drawn as a row in the chain or as its own block.
