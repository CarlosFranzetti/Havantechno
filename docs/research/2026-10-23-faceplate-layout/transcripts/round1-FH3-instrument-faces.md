# F-H3: Instrument faces — round 1
Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

## Scope

How the DAW built-in instruments get distinct panels: Ableton Operator, Wavetable, Drift, Analog, Drum Synths, Simpler; Logic Alchemy, Retro Synth, ES2, Sculpture, Drum Synth, Quick Sampler. Then a proposal for Havantechno's 13 synths, grouped into families, each given a face built only from its existing parameters in `studio/synths.js`. Effect faces are F-H4's. Whole-window layout is F-H1 and F-H2's.

Verification status: every fact below rests on a search excerpt. The one page fetch I tried (ableton.com manual) failed with `getaddrinfo ENOTFOUND`, so nothing is `verified:`. Where an excerpt does not say which of several returned URLs it came from, I list the candidates and say so.

## What I looked at

- `BRIEF.md` (read in full).
- Screenshots: `/home/user/havantechno/docs/screenshots/studio-playing.png` and `/home/user/havantechno/docs/screenshots/studio-rack.png`.
- `/home/user/havantechno/studio/synths.js`: the `spec:` block of all 13 instruments. I did not read `studio.js`, `index.html` or `core.js`, so I do not know how the track-card sliders are generated.
- Web search: 12 of 12 used (the budget is exhausted):
  1. Operator interface sections
  2. Wavetable device view
  3. Drum Synths (DS) devices
  4. Drift look and colour
  5. Alchemy layout
  6. Retro Synth layout and colour
  7. ES2 layout and colour
  8. Sculpture / Drum Synth layout
  9. Simpler device view
  10. Quick Sampler waveform display
  11. Live 12 themes and flat device view
  12. Drum Machine Designer and Quick Sampler skins
- Not got to: Operator, Analog and Drift colours (none found); Ableton's own statement on flat vs skeuomorphic; Logic's Drum Synth on Mac (only Sculpture on iPad came back); Alchemy Mac panel names; Retro Synth's exact engine colours; any skin for Logic's Drum Synth.

## Findings

### A. What Havantechno looks like now (from the screenshots)

- `studio-playing.png`: every track is an identical card. Each card has a name, a type label (`kick kick`), M and S buttons, a 16-step row, then the same five sliders (level, pan, send delay, send reverb, duck depth), then a collapsed "synth parameters" disclosure. Two cards add an extra line ("inserts: eq" under bass, "inserts: width" under stab). The only visible differences between instruments are the title and the slider values.
- Sliders are the only control type. Values are in cyan. The Pause button and the title are in pink. The card background is dark.
- `studio-rack.png`: the processors are shown as cards with the same slider-list pattern and a "bypass" button. The screenshot shows 8 cards (send delay, send reverb, master eq, master hp, master lp, master glue, master sat, master limiter). The brief says 10 processors, so two are not in this screenshot.
- The level slider on the track card and `level` in each synth spec look like the same parameter. Kick shows 1 in both places. Sub shows 0.55 on the card while its spec default is 1, so the card value probably comes from the song. I did not check `studio.js`, so this is not confirmed.

### B. Ableton Live instruments

**Operator** (FM/subtractive, four oscillators).
- Layout: four primary-control panels on each side, with a central display that shows whichever section is selected. The left side holds the four oscillators. The right side holds the LFO, filter, and global pitch and output. (search excerpt: https://www.soundonsound.com/node/4903491 — Sound on Sound, 2013 per the excerpt)
- Terminology: MusicTech calls the side panels "Shells". The bottom-right shell is the Global Shell, which shows the algorithm symbols across the top of the central display. (search excerpt: https://musictech.com/tutorials/ableton-live-tutorial-operator/)
- The central display shows the envelope, filter, LFO or pitch envelope for whichever section is clicked. Oscillator type sits to the lower right. The Global shell carries master volume, tone, polyphony and the algorithm chooser. (search excerpt: https://violetrecording.com/how-to-use-operator-in-ableton/)
- Colour: not found.

**Wavetable** (wavetable synth).
- Compressed view: oscillators on the left, modulators on the right, filter in the middle. (search excerpt: https://splice.com/blog/how-to-use-ableton-wavetable/)
- Expanded view: sources differ on what shows by default. One says the Sub and two wavetable oscillators sit across the top, with three envelopes and two LFOs below and filters, matrix and output in Device View at the bottom. Another says the envelopes and LFOs show first and the oscillators appear when the window's top edge is dragged up. (search excerpts: https://musictech.com/tutorials/wavetable-synth-ableton-live-10/ and https://www.pauseplayrepeat.com/blog/xploring-the-wonders-of-ableton-live-s-wavetable-synthesizer)
- Each oscillator has pan, volume, tuning and a wavetable-position sweep. A hidden toggle switches the table display between linear and polar. Two filters, each 12 or 24 dB, with series (default) or parallel routing. Almost any control can be added to a matrix and modulated by three envelopes, two LFOs and MIDI sources. (search excerpt: https://splice.com/blog/how-to-use-ableton-wavetable/ and https://www.pauseplayrepeat.com/blog/xploring-the-wonders-of-ableton-live-s-wavetable-synthesizer)
- Colour: not found.

**Drum Synths** (DS Kick, DS Snare, DS Clap, DS Hat, DS Tom and others; Max for Live).
- The manual lists the DS devices in its Max for Live section. DS Kick is a modulated sine with controls for pitch, drive, harmonics, attack, click and decay. DS Snare mixes a pitched oscillator with noise, with Color shaping the pitched part and Tone setting the noise. DS Hat has a Decay knob and a Volume control. DS Tom pairs an impulse with pitched waveforms. (search excerpt: https://www.ableton.com/en/live-manual/12/max-for-live-devices)
- The DS devices were introduced in Live 10 and are Max for Live instruments. (search excerpt: https://warpacademy.com/?p=70273)
- All eight can be loaded together in a pre-built "DS Rack". (search excerpt: https://www.soundonsound.com/techniques/live-12-drum-racks-revisited)
- Colour and skin: not found. The excerpts do not show how a drum device is told apart from a pad device.

**Drift** (small, minimal synth; a news result titled "Ableton Beta 11.3 Adds New Synth - Drift" gives the version, search excerpt: https://sonicstate.com/news/2023/04/07/ableton-beta-113-adds-new-synth-drift/).
- The KVR release-note excerpt describes a minimal layout with interactive controls, inspired by classic hardware and by modern synths and Eurorack modules. (search excerpt, source not certain: https://kvraudio.com/news-print.php?id=57902)
- Colour and exact layout: not found.

**Analog**: no excerpt returned. Not found.

**Simpler** (sampler).
- Two tabs, Sample and Controls, with a control bar that stays at the bottom. A triangle in the title bar enlarges the waveform. (search excerpt: https://musictech.com/tutorials/ableton-live-tutorial-the-simpler-instrument/ and https://www.musicradar.com/news/ableton-live-simpler-masterclass)
- The Sample tab holds the waveform and the playback-mode buttons on its left side: Classic, One-Shot and Slice. Start and end markers are dragged on the waveform. A Hot-Swap button sits at the lower right of the waveform. (search excerpt: https://blog.dubspot.com/ableton-live-tutorial-simpler and https://www.soundonsound.com/techniques/simpler-pleasures)
- Controls tab: filter, LFO and envelope. Right-clicking the waveform gives Normalise Volumes and Slice To Drum Rack. (search excerpt: https://musictech.com/tutorials/ableton-live-tutorial-the-simpler-instrument/)
- The Push 1 display has no waveform. (search excerpt: https://musictech.com/tutorials/ableton-live-tutorial-the-simpler-instrument/)
- Colour: not found.

### C. Logic Pro instruments

**Alchemy** (sample synth).
- The iPad version uses three horizontal bands. The top band has edit-mode buttons, the sample name and lock, and the Amp/Mod button for the envelopes. The middle band has the source buttons (A to D), the Mixer button, play modes, the Snap menu and the Mod Matrix. The bottom band has each source's controls, the synthesis modes and the filter. (search excerpt, source page not named: candidates include https://support.apple.com/en-my/guide/logicpro-ipad/source-overview-lpip4db272d2/1.0/ipados/16.0)
- Each source is shown as three modules: source, synthesis, filter. (same excerpt)
- The iPad Motion view is a mode, not a separate panel. (same excerpt)
- The Mac version has Simple and Advanced views. The Mac guide lists separate source, filter, master voice, morph and modulation sections. (search excerpt, Mac page not identified)
- Colour: not found.

**Retro Synth** (four engines in one plug-in).
- The four tabs at the top left select the four engines. Each engine has its own colour scheme. (search excerpt: https://www.soundonsound.com/techniques/totally-retro — 2014 article)
- The same arrangement in all four: Oscillator, Filter, Amp and Effect across the top; Glide/Autobend, LFO, Filter Envelope and Amp Envelope across the bottom. (same excerpt)
- The Analog engine has two oscillators, each with a shape knob, and a mix slider. The Sync engine has a sync slider on oscillator 2. (same excerpt)
- The CDM article says Retro Synth and Vintage B3 use "varying degrees of widget-skinning to look like the stuff they're modeling". (search excerpt: https://cdm.link/logic-pro-10-5-new-sampler-workflows/)

**ES2** (hybrid synth).
- Mac guide: oscillators in the upper left, with a triangle control setting the mix of the three oscillators. Global controls (Tune and others) are to the left of the oscillators. The filter section is in a circular area, with Drive and Filter FM. Output controls are at the top right. (search excerpt, candidate: https://support.apple.com/ar-qa/guide/logicpro/lgsia123e9f/mac)
- iPad guide: oscillators at the top of the Main view, a multimode filter and a lowpass filter in series or parallel, plus Mod Matrix and Vector Envelope in their own sections. (search excerpt, candidate: https://support.apple.com/guide/logicpro-ipad/lpip49559669/3.0/ipados/26)
- Colour: not found.

**Sculpture** (physical-modelling synth; the excerpt is from the iPad guide, so I list it as the Sculpture page and not the Drum Synth page).
- Top-level tabs move between views. The upper area holds the sound engine (five subsections) with Morph and Global beside it. Below it are the modulation sources: LFOs, jitter and random generators, and recordable envelopes. The bottom strip assigns MIDI controllers to parameters. (search excerpt, candidate: https://support.apple.com/guide/logicpro-ipad/lpip05f02abb/ipados)
- Colour: not found.

**Drum Synth**: not found. The search returned only Sculpture. The Mac guide is not confirmed.

**Drum Machine Designer** (the pad-grid instrument that opens Quick Sampler and Drum Synth editors).
- Logic 10.5 review: the interface looks largely the same, with 48 pads over three pages. (search excerpt, candidate: https://www.soundonsound.com/node/4922169?page=2)
- Pad controls have extra buttons that open the Quick Sampler or Drum Synth editor. (search excerpt, no page named in the excerpt)
- A French training site calls the interface "reminiscent of professional hardware controllers". (search excerpt, candidate: https://www.elephorm.com/formation/apprendre-logic-pro-x-1072-version-2023-les-fondamentaux/creer-un-kit-de-batterie-avec-drum-machine-designer — the excerpt does not say which page the sentence came from)
- Skin or colour: not found.

**Quick Sampler**.
- Mac: playback-mode buttons sit above the waveform (Classic, One Shot). A root-key readout with a play button sits at the bottom left. Start, end, loop and fade points are set on the waveform. (search excerpt: https://support.apple.com/HT210972)
- iPad: the waveform shows the file, zoomable with pinch and a scroll bar, and resizable. Marker values appear below the display when touched. A Snap menu limits marker edits to set positions. In Slice mode the markers are colour-coded: yellow for slice start and length, blue for the sample start and end. (search excerpt, candidate: https://support.apple.com/guide/logicpro-ipad/lpip5007ae10/ipados)
- The yellow/blue marker convention is the only colour-as-meaning example I found in any of the 12 instruments.

### D. Flat or skeuomorphic

| Instrument | Look | Evidence |
|---|---|---|
| Live (general) | Flat, with a coloured accent | A Cubase user on a forum says Live's early colours and flat objects stood apart from skeuomorphic designs of the time (search excerpt: https://forums.steinberg.net/t/cubase-14-gui-design-regressions/953624?page=20). An Ableton forum user says they do not want 3D buttons or fake brushed aluminium (search excerpt, thread unclear: https://forum.ableton.com/viewtopic.php?p=709962). These are user opinions, not Ableton's design statement. |
| Live 12 themes | Dark greys with small colour pops | Third-party themes (search excerpts: https://www.musicianwave.com/ableton-live-themes-and-skins and https://deafmanskwx.gumroad.com/l/mrrera). Themes are not the stock look. |
| Operator, Wavetable, Drift, Analog, Simpler | Not confirmed | No excerpt covers their surface treatment. |
| Retro Synth | Skinned per engine | CDM (search excerpt: https://cdm.link/logic-pro-10-5-new-sampler-workflows/) and the per-engine colour (search excerpt: https://www.soundonsound.com/techniques/totally-retro). |
| Alchemy, ES2, Sculpture, Quick Sampler, DMD | Not confirmed | DMD "reminiscent of hardware controllers" (excerpt above). |

### E. How the panels separate a drum synth from a pad synth

Not answered directly by any excerpt. What the excerpts do show:
- Ableton's Drum Synths are identified by name and by the DS prefix, and the drum set is one rack (search excerpt: https://www.soundonsound.com/techniques/live-12-drum-racks-revisited). The excerpts do not describe a visual difference.
- Logic's DMD puts a drum grid on the front, and Retro Synth gives each engine its own colour. So Logic separates by colour per engine and by container (a pad grid), and Ableton separates by name and by the rack.
- The Quick Sampler Slice mode colour code (yellow and blue) shows that a display can carry meaning through colour.

### F. Havantechno's 13 synths: parameter inventory (from `synths.js`)

| Synth | Params | Kinds of control |
|---|---|---|
| kick | 7: tune, punch, sweep, decay, click, drive, level | pitch sweep (punch → tune over sweep), amp decay, noise click, drive |
| sub | 5: decay, attack, harmonic, glide, level | one oscillator, amp envelope, 2nd harmonic, portamento |
| bass | 12: cutoff, env, res, attack, decay, release, detune, sub, glide, drive, wave, level | two detuned oscillators plus a sub square, lowpass with an envelope, amp envelope, portamento, drive, waveform |
| stab | 11: cutoff, env, res, attack, decay, release, detune, spread, hp, drive, level | chord of detuned saw pairs, stereo spread, lowpass with env, highpass, amp envelope, drive |
| clap | 8: tone, q, decay, flam, flams, tail, tailDecay, level | bandpassed noise, a count of flams (0 to 6) at a spacing, decay, reverb-like tail |
| hat_closed, hat_open | 5 each: decay, tone, ring, metal, level | highpassed noise, a bank of six square waves through a bandpass, decay (open has a longer default) |
| shaker | 5: tone, q, attack, decay, level | bandpassed noise, attack and decay |
| perc | 5: pitch, drop, decay, noise, level | pitched blip with a drop, noise tick |
| lead | 12: same keys as bass | as bass, with a larger glide default |
| pad | 7: attack, release, cutoff, detune, lfo, depth, level | detuned saws, LFO on detune (depth in cents), lowpass, slow amp envelope |
| riser | 5: from, to, q, tone, level | bandpass sweep (from → to over the event duration), saw drone mix |
| impact | 4: tune, decay, wash, level | sine boom with a pitch drop, noise wash |

Notes on the spec:
- `wave` (bass, lead) has a value but no min or max and no list of options. A selector would need its options written into the face.
- `level` appears both in the spec and on the track card (see A).
- Some drawing inputs are code constants, not spec parameters: the six hat ring ratios, the 95 Hz start of the impact drop, the 40 ms kick and perc sweeps, and the 4 s riser default. The face can draw them, but they are not tweakable parameters.

## What Havantechno could borrow

The borrowable idea from both DAWs is that a face is built around the thing the instrument does, not around a generic slider list. Ableton shows the sound's stages (oscillators → filter → modulators). Logic gives each engine a colour and a fixed three-band arrangement. Logic's DMD and Ableton's DS Rack both group drum voices into one rack-like unit.

Proposal for the 13 synths, using only existing parameters. Each family has one accent colour in the card header, a control grid, and one SVG graph drawn from the family's own parameters. Each synth gets its own graph, so no two look the same. The screenshot's sliders are kept for any parameter that has no graph.

**Drums (amber accent): kick, clap, hat_closed, hat_open, shaker, perc.** A row of voice cells, no keyboard, and a strike graph at the top.
- kick: a pitch-sweep line from `punch` down to `tune` over `sweep`, with the `decay` envelope under it. Knobs: `click`, `drive`, `level`.
- clap: `flams` tick marks spaced by `flam`, then a `decay` curve, and a grey `tail` smear over `tailDecay`. Knobs: `tone`, `q`, `tail`.
- hat_closed / hat_open: the same face. `decay` is the main control, and the open hat's graph shows its longer envelope. The six bars for `ring` use the ratios in code (see the constants note above).
- shaker: a bandpass bell from `tone` and `q`, with `attack` and `decay` as an envelope.
- perc: a pitch line from `pitch` to `pitch × drop`, with a `noise` tick.

**Bass (teal accent): sub, bass.** A mono face in three columns. Oscillator (left: `wave`, `detune`, `sub`, `glide`); filter (centre: a live lowpass response curve from `cutoff`, `res`, with `env` shown as the sweep down over `decay`); amplitude (right: `attack` and `release`, with a note-length bar).
- sub is a smaller version: one envelope graph (`attack`, `decay`, `glide`) and a `harmonic` knob. It has no filter column.

**Keys (stab: rose, pad: violet, lead: lime).**
- stab: a stereo field diagram. Each note is a pair of detuned saws drawn left and right at `spread`, with `detune` as the gap between a pair. `hp` shades the low end. Filter curve from `cutoff` and `env`.
- pad: a long swell graph (`attack`, a hold bar, `release`), and an LFO wave drawn from `lfo` and `depth`. One `cutoff` knob. This is the only face with a slow envelope drawn across the whole card.
- lead: the mono layout of bass, with `glide` drawn as an arrow between two pitches, and `sub` as a bar. A keyboard strip is shown at the bottom of the keys family.

**FX (red accent): riser, impact.** A timeline-first face with no keyboard.
- riser: a bandpass sweep from `from` to `to` drawn across a 4 s timeline (the 4 s is the code default), with `q`, and a `tone` drone bar.
- impact: a pitch-drop line into `tune` over the decay, with `wash` drawn as a grey cloud over its own envelope.

Why this works without new parameters: each graph reads only the parameters already in `spec`. Each family differs in layout and accent, and each synth differs in its graph.

## What would not fit (and why)

- Skeuomorphic skins with large background images. The CDM excerpt ties large background images to Drum Kit Designer, a separate plugin, and I found no image details for Retro Synth or the others (search excerpt: https://cdm.link/logic-pro-10-5-new-sampler-workflows/). Image-heavy skins would also need assets, and the brief asks for plain HTML and SVG. Flat SVG graphs fit better.
- A device-view bar at the bottom, as in Ableton's Device View. It would need a second selected-device concept; this is a question for F-H1's view.
- A keyboard on every card. The drum and FX faces have none, so the keyboard should be a family-level element.
- Per-instrument colours with no family rule. Thirteen unrelated colours would not read as one system (F-S4's concern).

## Build notes (plain HTML/CSS/SVG/JS, no build step)

- One SVG per face, drawn from the spec by one function per family. Graph inputs: a `params` object read through `inst.get`/`inst.params`. No new Web Audio nodes. The face redraws when a parameter changes, using the callback that `synths.js` passes to `K.defineParams`. I read that call in `synths.js` but did not read `core.js`, so whether it fires for every change is unverified.
- Accent colour as a CSS custom property on the card (`--accent`), so the theme can change without touching faces.
- Knobs are SVG `<circle>` with a drag handler. Sliders stay as the existing `<input type="range">`, so the self-check does not change.
- Self-check: `selfcheck.js` runs the instruments with a fake AudioContext. The faces add no audio nodes, so no stub is needed for them.
- `wave` needs a `<select>` with the Web Audio oscillator types (sine, square, sawtooth, triangle). This is recalled, not verified (see below).
- Graph code runs on track change; keep each graph under a few hundred SVG elements, since there are 13 at once.

## Recalled, not verified

- Operator, Wavetable, Drift and Analog are flat with a dark grey panel. I believe this but found no excerpt.
- Live devices use a per-device accent colour. Not found.
- Web Audio OscillatorType values are sine, square, sawtooth, triangle, plus custom. This is standard API knowledge, not checked against a source in this run.
- The Logic Retro Synth engine colours (orange, green and so on) are from memory, not from the excerpt. The excerpt says only "distinctive colour scheme".

## Questions for the group

1. Should each instrument face open from its track card (as Ableton opens a device view) or replace the slider list on the card itself? The answer changes whether the card stays a fixed size.

## Sources

Search excerpts (no page fetched successfully):
- https://www.soundonsound.com/node/4903491
- https://musictech.com/tutorials/ableton-live-tutorial-operator/
- https://violetrecording.com/how-to-use-operator-in-ableton/
- https://splice.com/blog/how-to-use-ableton-wavetable/
- https://musictech.com/tutorials/wavetable-synth-ableton-live-10/
- https://www.pauseplayrepeat.com/blog/xploring-the-wonders-of-ableton-live-s-wavetable-synthesizer
- https://www.ableton.com/en/live-manual/12/max-for-live-devices
- https://warpacademy.com/?p=70273
- https://www.soundonsound.com/techniques/live-12-drum-racks-revisited
- https://kvraudio.com/news-print.php?id=57902
- https://sonicstate.com/news/2023/04/07/ableton-beta-113-adds-new-synth-drift/
- https://forums.steinberg.net/t/cubase-14-gui-design-regressions/953624?page=20
- https://forum.ableton.com/viewtopic.php?p=709962
- https://musictech.com/tutorials/ableton-live-tutorial-the-simpler-instrument/
- https://www.musicradar.com/news/ableton-live-simpler-masterclass
- https://blog.dubspot.com/ableton-live-tutorial-simpler
- https://www.soundonsound.com/techniques/simpler-pleasures
- https://support.apple.com/en-my/guide/logicpro-ipad/source-overview-lpip4db272d2/1.0/ipados/16.0 (Alchemy, candidate)
- https://www.soundonsound.com/techniques/totally-retro
- https://cdm.link/logic-pro-10-5-new-sampler-workflows/
- https://support.apple.com/ar-qa/guide/logicpro/lgsia123e9f/mac (ES2 Mac, candidate)
- https://support.apple.com/guide/logicpro-ipad/lpip49559669/3.0/ipados/26 (ES2 iPad, candidate)
- https://support.apple.com/guide/logicpro-ipad/lpip05f02abb/ipados (Sculpture, candidate)
- https://www.soundonsound.com/node/4922169?page=2 (Logic 10.5 review, candidate)
- https://www.elephorm.com/formation/apprendre-logic-pro-x-1072-version-2023-les-fondamentaux/creer-un-kit-de-batterie-avec-drum-machine-designer (candidate)
- https://support.apple.com/HT210972
- https://support.apple.com/guide/logicpro-ipad/lpip5007ae10/ipados (Quick Sampler iPad, candidate)
- https://www.musicianwave.com/ableton-live-themes-and-skins
- https://deafmanskwx.gumroad.com/l/mrrera

Local files:
- /home/user/havantechno/docs/research/2026-10-23-faceplate-layout/BRIEF.md
- /home/user/havantechno/docs/screenshots/studio-playing.png
- /home/user/havantechno/docs/screenshots/studio-rack.png
- /home/user/havantechno/studio/synths.js
