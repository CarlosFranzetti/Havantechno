# F-H3: Instrument floating windows — round 5
Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

## Scope

The owner's follow-up: Havantechno becomes a Mac or PC desktop DAW. The voted layout (Strip Bench, `REPORT.md` section 3) stays as the "System Editor" view. Each piece of gear also gets its own floating window with its own look, as in Logic.

This file covers the floating window for the 13 instruments: a common anatomy, a detailed design for kick, bass and stab, and a family note for the other ten. It also says what a desktop app allows that the browser face (round 1 and 2 of this group) did not.

It does not cover the 10 processors (F-H4's area), the System Editor layout (already voted), or the stem pipeline.

Evidence: no new web searches. Facts about Ableton Live and Logic Pro come from my round-1 file (`round1-FH3-instrument-faces.md`) and are marked as search excerpts there. Facts about Havantechno come from `studio/synths.js` (read in round 1; the parameter list below is copied from it). Design choices are marked as such.

## Window anatomy common to all

Each window is one device at "faceplate" density, with a header and a footer added. The same face definition (F-S2's and F-O2's registry) drives the window, the chain face in the System Editor, and the chip. Only the density and the chrome change.

**Title bar (about 32 px).** Left to right:
- family glyph in the family ink (drums orange, bass violet, keys sky, fx gold);
- device name and family, for example "kick · drums";
- preset menu (▾);
- Mute, the track's M state. See the question below: instruments have no bypass parameter, so the header's bypass is the track's mute;
- Editor | Controls segmented toggle, as in Logic's plug-in window (Editor view draws the face; Controls view draws every parameter as a horizontal slider with a numeric field on its left, round 1 of F-H2, section F5, excerpt: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html);
- Link: Off or Single. Off keeps the window on its own device. Single shows the device of the selected track, so one window follows the selection (Logic's Link modes, F-H2 F5, same excerpt).
- window controls (close, minimise, zoom) come from the OS on a desktop app.

**Body.** Sections in signal order, left to right, each with a small uppercase title. One hero graph per window, in the family ink on the family wash. The hero is the largest element and the first thing the eye lands on. Controls are knobs, sliders, selects, graphs and displays, each named in the device sections below.

**Footer (about 24 px).** Three slots: the focused control's value and unit ("tune 45 Hz"); the section state for the current bar ("mainA: set kick.level 1.00" or "ramp stab.cutoff 1600→2600"); and a keyboard hint.

**Control grammar.** The same on every window and every face (F-O1 and F-S5's table, round 2): vertical drag changes a knob; Shift is fine; double-click returns to the home value; Shift-double-click goes to the factory `spec.value`; typing opens a number field; arrows step a focused control.

**State markers.** Shape, never hue (F-S4 and F-S5, round 2): filled dot = set at section start; dot with a slant = ramp running (a faint arc behind the knob from `from` to `to`); open ring with dashed arc = held by the user; a small tick on the arc = the stock value. These sit beside the label, so a window shows who owns each value.

**Writes.** Every control writes `seq.setParam('<type>.<key>', v)`, the same path the arrangement uses (F-O2, round 2). The window never calls `inst.set` directly.

**Sizes.** A window has a default size, a minimum and a free resize. The hero scales with the window.

## Kick window

**Device:** `kick` (drums family). Parameters from `studio/synths.js`: tune 30–90 Hz (default 45), punch 80–400 Hz (170), sweep 0.01–0.3 s (0.06), decay 0.05–1.2 s (0.34), click 0–1 (0.4), drive 0–1 (0.35), level 0–1.5 (1). Seven parameters.

**Signal, as the code builds it:** a sine body starts at `punch` and falls to `tune` over `sweep`; its amplitude decays over `decay`. A noise click (high-passed) and a short triangle knock sit on top, scaled by `click`. The sum goes through a soft clipper set by `drive`, then to the output gain set by `level`. (Verified: `studio/synths.js`, `BUILD.kick`.) The knock's 520 Hz start and 90 Hz end, the 18 ms knock sweep and the 12 ms click decay are constants in the code, not parameters. The window can draw them but cannot change them.

**Window size:** default 420 × 340 px; minimum 360 × 300 px.

**Header:** orange glyph, "kick · drums", preset ▾, Mute (track M), Editor | Controls, Link.

**Sections, left to right (signal order):**

1. **PITCH (left, about 45% of the width).** The hero. A pitch-drop curve: frequency on a log axis (30 to 400 Hz, the union of `tune` and `punch` ranges) against time from 0 to `decay`. The curve starts at `punch`, falls to `tune` at `sweep`, and then stays. The amplitude envelope (from `decay`) is drawn lighter underneath on the same time axis. Knobs under the hero: punch, tune, sweep. The hero's two end points are also drag handles, which set `punch` and `tune`; the knobs stay as the precise control.
2. **CLICK (top right).** Knob: click. A small display: a single spike whose height is `click`, which shows the click's presence without a graph.
3. **BODY (bottom right, left half).** Knob: decay. The amplitude curve is in the hero already, so this section shows only the value and a numeric readout of decay in ms.
4. **DRIVE (bottom right, right half).** Knob: drive. Display: a transfer curve (input level against output level) drawn from the same shaping function the engine uses. (Round 1, F-H4: `K.shaperCurve(drive)` in `core.js`; the file was not read in round 1, so the exact function is unverified.)
5. **Footer, right.** Trim (`kick.level`). The label says "Trim", not "Level", so there are not two "level" controls on the window (F-O1, round 2, answer to F-O2 Q2). The channel fader is in the track's strip.

**Controls by type:** knobs: punch, tune, sweep, click, decay, drive, trim (seven). Graphs: pitch-drop hero, amplitude envelope (inside the hero), transfer curve (drive). Displays: click spike. Sliders: none in Editor view; Controls view shows all seven as sliders.

**Hero graph:** the pitch-drop curve with the envelope underneath. Its shape is the kick's identity: a steep drop from `punch` into `tune`, then a decaying tail.

**How it differs visibly:** tall and narrow hero in the left half; the hero's shape is a diagonal drop, which no other window has; orange glyph and orange ink.

**Relation to the System Editor face:** the chain face for `kick` shows the same seven parameters at faceplate density inside the chain. The chain's hero is the same pitch-drop curve at about a third of the window's height. Editing either one writes the same `kick.<key>` path, so both update together. The window adds: the preset menu, the Link button, the footer readout, a larger hero, and the Controls view.

## Bass window

**Device:** `bass` (bass family). Parameters from `studio/synths.js`: cutoff 60–8000 Hz (420), env 0–8000 Hz (1400), res 0.1–20 (4), attack 0.001–0.2 s (0.003), decay 0.02–1 s (0.16), release 0.01–1 s (0.06), detune 0–50 ct (7), sub 0–1 (0.35), glide 0–0.3 s (0), drive 0–1 (0.25), wave (a string, default 'sawtooth', no options list), level 0–1.5 (1). Twelve parameters.

**Signal, as the code builds it:** two detuned oscillators of the `wave` type (±`detune`) and a square wave one octave down at `sub` × 0.6. They pass through a resonant lowpass (`cutoff`, `res`). The lowpass cutoff starts at `cutoff + env × velocity` and falls back to `cutoff` over `decay`. The amplitude envelope is attack, a hold from the note length, and release. Glide (`glide`) slides the pitch between notes. The sum goes through the drive shaper and then to the output gain. (Verified: `studio/synths.js`, `BUILD.bass`.)

**Window size:** default 600 × 340 px; minimum 480 × 300 px. Wider than the kick window because there are three sections plus the drive display.

**Header:** violet glyph, "bass · bass", preset ▾, Mute, Editor | Controls, Link. The `wave` option list (sine, square, sawtooth, triangle) is an engine-side `choices` entry that F-O2 and I agreed should be added to `synths.js`. Until it exists, the window shows the default only.

**Sections, left to right (signal order):**

1. **OSC (left, about 150 px).** The `wave` selector is a segmented control, with a small waveform glyph on each segment. Knobs: detune, sub, glide. Display: a two-trace glyph, the main wave and the square one octave down, with the sub level shown as the square's height.
2. **FILTER (centre, about 45% of the width, the hero).** A lowpass response curve. The horizontal axis is log frequency from 20 Hz to 20 kHz; the vertical axis is gain in dB. It is computed in JavaScript from `cutoff` and `res` with the standard biquad formulas (round 1 of F-H4 and F-O2 both say this is pure JS and runs without an `AudioContext`). A dashed ghost curve shows the envelope's peak at `cutoff + env` and settles to `cutoff`. Knobs: cutoff, res, env, decay.
3. **AMP (right of the filter).** A silhouette of the amplitude envelope: attack, a hold bar whose width shows the note length, and release. Knobs: attack, release.
4. **DRIVE (right end).** Knob: drive. Display: transfer curve, as in the kick window.
5. **Footer, right.** Trim (`bass.level`), labelled "Trim".

**Controls by type:** knobs: detune, sub, glide, cutoff, res, env, decay, attack, release, drive, trim (eleven). Select: wave (the twelfth). Graphs: filter response (hero), amplitude silhouette, transfer curve. Displays: the two-trace OSC glyph.

**Hero graph:** the filter response with the envelope's ghost curve. It is wider and flatter than the kick's, and it reads as a frequency picture, not a time picture.

**How it differs visibly:** wide three-column layout; a segmented wave selector that no other window has; a frequency-axis hero, where the kick's hero is a time axis; violet glyph and ink.

**Relation to the System Editor face:** the chain face for `bass` shows the same twelve controls at faceplate density, with the filter response hero at about a third of the window's height. The `wave` selector is a segmented control in both places. The window adds the preset menu, the Link button, the footer readout, the larger hero and the Controls view. A large hero here is the main thing the window buys.

## Stab window

**Device:** `stab` (keys family). Parameters from `studio/synths.js`: cutoff 100–12000 Hz (1600), env 0–8000 Hz (2200), res 0.1–12 (2), attack 0.001–0.5 s (0.002), decay 0.02–1.5 s (0.18), release 0.01–2 s (0.08), detune 0–50 ct (10), spread 0–1 (0.7), hp 20–2000 Hz (160), drive 0–1 (0.1), level 0–1.5 (1). Eleven parameters.

**Signal, as the code builds it:** each chord note is a pair of detuned sawtooths. Their pan positions are `±spread`, so `spread` sets how wide the chord sits. The notes sum into one lowpass (`cutoff`, `res`, with the same envelope sweep over `decay` as bass). The amplitude envelope is attack, a hold from the note length, and release. The sum passes a highpass at `hp`, then the drive shaper, then the output gain. (Verified: `studio/synths.js`, `BUILD.stab`.) The alternation of which detuned saw sits left, from the `i % 2` rule, is a code detail that the field does not need to show.

**Window size:** default 500 × 320 px; minimum 420 × 280 px.

**Header:** sky glyph, "stab · keys", preset ▾, Mute, Editor | Controls, Link. A readout line under the title shows the chord last triggered: the note names of the notes in the last trigger event, read from the sequencer's trigger events (not from an audio node). It is blank when nothing has played.

**Sections, left to right (signal order):**

1. **VOICE (left, the hero).** A stereo field: a horizontal line from left to right. Two dots sit at `−spread` and `+spread`, the positions of the two detuned saws of each note. Their vertical gap shows `detune`. The field is the picture of the width: at `spread` 0 the dots merge to one point (mono), at 1 they sit at the edges. Knobs: spread, detune. The chord readout sits under the field.
2. **FILTER (centre).** Knobs: cutoff, res, env, decay. Display: a lowpass response curve, with the envelope's ghost curve as in bass.
3. **HP (right of the filter).** Knob: hp. Display: a highpass response curve from `hp`, the same biquad formula with the fixed Q that the code uses.
4. **AMP (right).** Knobs: attack, release. Silhouette as in bass.
5. **DRIVE (right end).** Knob: drive. Transfer curve.
6. **Footer, right.** Trim (`stab.level`), labelled "Trim".

**Controls by type:** knobs: spread, detune, cutoff, res, env, decay, hp, attack, release, drive, trim (eleven). Graphs: stereo field (hero), lowpass curve, highpass curve, amplitude silhouette, transfer curve. Readout: chord line.

**Hero graph:** the stereo field, the one window whose hero is not a curve. It is wide and short. The two dots and their gap are the identity.

**How it differs visibly:** wide, short hero made of dots and a line, not a curve; two filter curves (lowpass and highpass) in the same window, which the kick and bass windows do not have; a chord readout line under the title; sky glyph and ink.

**Relation to the System Editor face:** the chain face for `stab` shows the same eleven controls at faceplate density with a small stereo field as its hero. The chord readout is the one element that exists only in the window and the chain's track row. The window adds the preset menu, the Link button, the footer readout, the larger hero and the Controls view.

## Family notes for the other ten

Every window uses the same anatomy. Only the hero and the section grid change. Each family has one template; each device in the family takes the template and swaps its hero.

**Drums (orange): clap, hat_closed, hat_open, shaker, perc.** Template: the kick's narrow, tall window, hero on the left, short sections on the right.
- clap: hero is a row of flam taps (`flams` ticks spaced by `flam`) with a `decay` curve; a grey smear for `tail` over `tailDecay`. Knobs: tone, q, tail, tailDecay, level (trim).
- hat_closed and hat_open: one window design at two lengths. The hero is the six-bar ring spectrum (the six ratios in the code, times `ring`, with bar height from `metal`). Open adds a longer decay curve; the two windows look like siblings (F-S4, round 1).
- shaker: hero is a bandpass bell from `tone` and `q`, with an attack-and-decay silhouette.
- perc: hero is a pitch line from `pitch` down to `pitch × drop`, with a noise tick sized by `noise`.

**Bass family (violet): sub.** Smaller window: 320 × 220 px minimum. Hero: one amplitude silhouette (`attack`, `decay`, `glide`), with the harmonic as a knob. No filter section, since sub has none in the code. Sections: OSC (harmonic, glide) and AMP (attack, decay). About six controls in total.

**Keys family (sky): lead, pad.**
- lead: the bass layout (OSC | FILTER hero | AMP | DRIVE). Hero: a glide arrow between two pitches, with the filter response beside it. The lead's note editor is the System Editor's compact roll, not a part of the window.
- pad: wide and short, like stab. Hero: a slow attack-hold-release swell, with an LFO wave drawn from `lfo` (rate) and `depth` (cents). Knobs: attack, release, cutoff, detune. One filter curve. Seven parameters in total.

**Sweep and hit (gold): riser, impact.** No keyboard, no keys section. The window is a timeline.
- riser: hero is a bandpass sweep from `from` to `to` drawn across a 4 s timeline (4 s is the code's default `dur`). Knobs: from, to, q, tone (drone bar), level. The timeline is the only time axis in the window set that runs left to right over the whole sweep.
- impact: hero is a pitch line from the code's fixed 95 Hz down to `tune` over the first 0.12 s, with `decay` as the envelope. Wash is drawn as a grey cloud in a second small display. Knobs: tune, decay, wash, level.

## What a desktop app allows that the browser face did not

Each point is a difference in room and in what the shell can do. Most of them the browser face could have used, but had no room or no place to put them.

- **Real floating windows.** If the shell is a native app (see the question below), each instrument window is an OS window. A user can put the kick on one monitor and the bass on another. In the browser, the windows are in-page panels, which F-O1 and F-S1 ruled out for a laptop screen.
- **Bigger heroes.** A window hero can be 200 to 300 px tall. The chain face's hero, at about 80 px, had to show less. A bigger pitch curve or filter response shows more detail; a bigger stereo field shows the spread clearly.
- **A real-time spectrum of the instrument's own output.** The browser face could place an AnalyserNode on the output (F-O2, round 2), but at chain height the spectrum had nowhere to go. In a window it has room: a spectrum underneath the filter response for bass and stab, and a waveform for the kick. The analyser sees the instrument's output, not the master, so it is the instrument's own picture. The analyser read would use `getFloatFrequencyData` and an FFT of 4096 or more, which the browser face's 256 bins could not give (round 1, F-S2 and F-O2).
- **All controls visible at once.** Bass has eleven knobs and one select. The chain face needed a "more" drawer for the parameters that did not fit (F-S2, round 2); the window has room for all of them.
- **Keyboard and typing.** A window can take typed values and global shortcuts with no focus trap, and Shift-double-click works without a touch fallback.
- **Presets as files.** A desktop app can save a preset as a file and open it from a dialog. The browser could only keep presets in the page's data (`song.js` style) or in browser storage, which is lost when site data is cleared (round 1, F-S1's warning about openDAW).
- **Stem and MIDI import by file dialog.** Round 2's import path (F-S3, F-O2) becomes a native open dialog instead of an upload control. This does not change the windows, but it is one more reason the shell matters.

## ASCII sketches

Kick (420 × 340 default):

```
+------------------------------------------------------+
| (o) kick · drums [preset ▾] [Mute] [Editor|Ctrl] [Link: Off]  |
+------------------------------------------------------+
| PITCH                                 | CLICK        |
|  ·  punch                             |   (o) click  |
|  |\                                   |   spike |    |
|  | \___                                |              |
|  |     \_____ tail (decay, light)     |--------------|
|  |           ----------------         | BODY         |
|  +--------------------------- t       |   (o) decay  |
|   (o) punch   (o) tune   (o) sweep    |              |
|                                       | DRIVE        |
|                                       |   (o) drive  |
|                                       |   [transfer] |
+------------------------------------------------------+
| tune 45 Hz    mainA: set kick.level 1.00    Trim (o)  |
+------------------------------------------------------+
```

Bass (600 × 340 default):

```
+----------------------------------------------------------------------+
| (v) bass · bass  [preset ▾] [Mute] [Editor|Controls] [Link: Single]   |
+----------------------------------------------------------------------+
| OSC           | FILTER (hero)                   | AMP        | DRIVE  |
| [saw|sq|sin]  |  dB                             | /\__ hold  | (o)    |
|  /\/\ + sq    |   0 ____________                |  (o) att   | [xfer] |
|  (o) detune   |     /           \  ghost         |  (o) rel   |        |
|  (o) sub      | __/ lowpass      \____ 20 kHz   |            |        |
|  (o) glide    |  (o) cutoff (o) res (o) env (o) dec           |        |
+----------------------------------------------------------------------+
| detune 7 ct    mainA: ramp bass.cutoff 420→900    Trim (o)           |
+----------------------------------------------------------------------+
```

Stab (500 × 320 default):

```
+--------------------------------------------------------+
| (o) stab · keys  [preset ▾] [Mute] [Editor|Controls] [Link: Off] |
+--------------------------------------------------------+
| VOICE (hero)                    | FILTER     | HP   | AMP   |
|   L ----•-----------•---- R     |  lowpass   | high | (o)att|
|     -spread   +spread           |  [curve]   | pass | (o)rel|
|   (o) spread  (o) detune        | (o) cutoff | (o)hp|       |
|   chord: C4 E4 G4 B4            | (o) res    |      | DRIVE |
|                                 | (o) env    |      | (o)   |
|                                 | (o) decay  |      |       |
+--------------------------------------------------------+
| spread 0.70    chord C4 E4 G4 B4    Trim (o)              |
+--------------------------------------------------------+
```

## Questions

1. **What is the desktop shell?** The owner's direction says Mac or PC desktop, but not whether it is a native app or a web page inside a desktop window (for example, a wrapper around the existing HTML). The answer decides whether windows are real OS windows or in-page panels, and whether the "no build step" rule still holds. I have assumed real OS windows for this design, and the design works either way.
2. **Do instruments get a bypass?** `synths.js` has no bypass parameter on any instrument; only the processors do. The header uses the track's Mute, which is the same state as the M button on the lane. Should instruments gain a `bypass` (silence without a mute), which is an engine change and needs a self-check case, or should Mute stand in for it?
3. **Where do presets live?** In files the user saves (desktop), in the song's data (`song.js`), or both? The preset menu is in every window either way.
4. **Does the `wave` choices list go in before the windows?** Bass and lead need it for the segmented selector. Without it the selector shows only the default.
5. **Should the stab chord readout use the trigger events?** It is the one display that reads the sequencer rather than the instrument. It needs no engine change, only a small log of the last trigger's notes. Is that acceptable in a window, or should the readout be left to the chain?

## Sources

No new web searches this round. Facts about Ableton Live and Logic Pro come from my round-1 file (`round1-FH3-instrument-faces.md`) and from other agents' round-1 excerpts cited there.

- https://www.soundonsound.com/node/4903491 (Operator's panels; round 1, F-H3, search excerpt)
- https://musictech.com/tutorials/ableton-live-tutorial-operator/ (Operator's shells, round 1, search excerpt)
- https://violetrecording.com/how-to-use-operator-in-ableton/ (Operator's central display, round 1, search excerpt)
- https://splice.com/blog/how-to-use-ableton-wavetable/ (Wavetable's compressed and expanded view, round 1, search excerpt)
- https://www.ableton.com/en/live-manual/12/max-for-live-devices (DS Kick, DS Snare, DS Hat controls, round 1, search excerpt)
- https://warpacademy.com/?p=70273 (Drum Synths in Live, round 1, search excerpt)
- https://musictech.com/tutorials/ableton-live-tutorial-the-simpler-instrument/ (Simpler's Sample and Controls tabs, round 1, search excerpt)
- https://www.soundonsound.com/techniques/totally-retro (Retro Synth's engine tabs and shared layout, round 1, search excerpt)
- https://cdm.link/logic-pro-10-5-new-sampler-workflows/ (Retro Synth "widget-skinning", round 1, search excerpt)
- https://support.apple.com/HT210972 (Quick Sampler's mode buttons and root-key readout, round 1, search excerpt)
- https://support.apple.com/guide/logicpro-ipad/lpip5007ae10/ipados (Quick Sampler's Slice markers in yellow and blue, round 1, search excerpt, candidate page)
- https://support.apple.com/ar-qa/guide/logicpro/lgsia123e9f/mac (ES2's oscillator and filter areas, round 1, search excerpt, candidate page)
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpbc21a1fd.html (Logic plug-in window: Editor and Controls views, Controls view's numeric fields, round 1 of F-H2, search excerpt)
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpe9cc403a.html (Logic floating plug-in windows and the Link button, round 1 of F-O1 and F-H2, search excerpt)
- https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp2a07a994.html (Logic main window and editors, round 1 of F-H2, search excerpt)
- https://www.ableton.com/en/live-manual/12/working-with-instruments-and-effects/ (Ableton's Device View and fold, round 1 of F-H1, search excerpt)
- Repo: `studio/synths.js` (`BUILD.kick`, `BUILD.bass`, `BUILD.stab`, and the `spec` blocks), read in round 1.
