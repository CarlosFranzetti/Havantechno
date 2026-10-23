# Faceplate: how should Havantechno look? (Roundtable brief)

Date: 2026-10-23. Coordinator: the Fable session. Process: Roundtable (see `../README.md`). Read this whole file before searching.

## The product

Havantechno is a browser-only Web Audio studio in this repo (`studio/`): 13 synths (kick, sub, bass, stab, clap, hat_closed, hat_open, shaker, perc, lead, pad, riser, impact), 10 processors (filter, saturator, delay, reverb, eq3, compressor, limiter, sidechain, widener, chorus), a 16-step sequencer with a 200-bar, 9-section arrangement, per-track inserts and sends, a master chain and WAV export. Plain JS, no build step, no framework. The current page (`studio/index.html`, `studio/studio.js`) is a grid of identical "strips": each track is a card with a 16-step row and a list of sliders generated from a parameter spec. Screenshots: `../../screenshots/studio-playing.png` and `../../screenshots/studio-rack.png`. Look at them.

The owner's direction (recorded in `../../../prd.md`, D1 to D3): each device should have its own look, the way a DAW shows a different panel per instrument and effect; the source track should live in the DAW as separate, tweakable stems with MIDI; the app should grow into a remixing DAW (source song → stems → MIDI → recreation). A sister group, Gear Crew (`../2026-10-23-plugin-gear/`), is researching the audio gear. You research the layout and the look.

## The question

Using **Ableton Live** and **Apple Logic Pro** as the two references, what are the possibilities for the DAW layout of Havantechno, and how should each device get its own face? What can be built in plain HTML, CSS, SVG and JS with no build step? Each agent ends with **one concrete suggestion** for the layout; the group then discusses and votes.

## Roster

| Id | Model | Topic | Round-1 file |
|----|-------|-------|--------------|
| F-H1 | Haiku | Ableton Live's main layout: Session and Arrangement views, the Device View chain at the bottom, browser, mixer, what is always visible | `round1-FH1-ableton-layout.md` |
| F-H2 | Haiku | Logic Pro's main layout: Tracks area, Inspector, channel strips, Mixer, plugin windows, Live Loops, Smart Controls / the Controls view | `round1-FH2-logic-layout.md` |
| F-H3 | Haiku | Instrument faces: how Ableton's instruments (for example Operator, Wavetable, Drift, Drum Synths) and Logic's (for example Alchemy, Retro Synth, ES2, Drum Synth) are each given a distinct panel: layout, colour, controls | `round1-FH3-instrument-faces.md` |
| F-H4 | Haiku | Effect faces: how Ableton's effects (Echo, Hybrid Reverb, Glue Compressor, Saturator, EQ Eight) and Logic's (ChromaVerb, Compressor with its circuit skins, Channel EQ, Tape Delay) are each given a distinct panel | `round1-FH4-effect-faces.md` |
| F-H5 | Haiku | Mixer, transport and arrangement timeline: channel strips, sends, master, metering, section markers, locators, the time ruler; how both DAWs show a 200-bar arrangement | `round1-FH5-mixer-transport-arrangement.md` |
| F-S1 | Sonnet | Browser DAWs that exist today (for example Amped Studio, Soundtrap, BandLab, Audiotool, openDAW, Soundation) and how they lay out tracks, devices and plugin panels in HTML | `round1-FS1-browser-daws.md` |
| F-S2 | Sonnet | Implementation of per-device faces without a build step: knobs and sliders in SVG or Canvas, web components, CSS custom properties for theming, meters, touch and keyboard, accessibility; libraries with permissive licences | `round1-FS2-implementation.md` |
| F-S3 | Sonnet | Information architecture for a remix DAW: what views the pipeline needs (source stems lane, MIDI piano roll or step grid, A/B source vs recreation, section markers, device chain), and how Ableton and Logic handle stems and audio-to-MIDI in their UI | `round1-FS3-remix-ia.md` |
| F-S4 | Sonnet | Visual identity: a system so 13 synths and 10 processors each look distinct yet belong together (device families, colour, type, density, dark theme), with Ableton's flat theme and Logic's plugin skins as the two poles | `round1-FS4-visual-system.md` |
| F-S5 | Sonnet | Interaction: knob drag conventions, fine control, double-click reset, automation and modulation display, the step grid vs the piano roll, how Ableton's Clip View and Logic's Step Sequencer do it, touch support | `round1-FS5-interaction.md` |
| F-O1 | Opus | Design director: the principles behind both DAWs' layouts, why they differ, what a remix DAW should borrow, and three distinct layout concepts for Havantechno | `round1-FO1-design-director.md` |
| F-O2 | Opus | Tech lead: what each concept costs against the current `studio.js`/`index.html`, a migration path that keeps the self-check passing, performance of many SVG panels, and what to build first | `round1-FO2-tech-lead.md` |

## Rounds

1. **Research.** Each agent writes its round-1 file. Format below.
2. **Discussion.** Every agent reads all twelve round-1 files and writes `round2-<id>.md`: reactions to at least three other agents by id, one disagreement with reasons, and its **one suggestion** for the layout (a name, a one-paragraph description, what it borrows from Ableton, what from Logic, what is new). The coordinator compiles these into `DISCUSSION.md`.
3. **Vote.** Each agent reads `DISCUSSION.md` and writes `round3-<id>-ballot.md`: a ranked top three of the suggestions (not its own in first place), one sentence of reasoning per rank. The coordinator tallies into `VOTE.md`.
4. **Report.** The coordinator writes `REPORT.md` and builds artifacts showing the leading layouts.

## Rules

1. Cite only URLs you saw in a search result or fetched. Copy them exactly. Never compose a URL.
2. Mark each fact `(verified: <url>)` or `(unverified)`. Page fetches may fail in this sandbox; if your fact rests on a search excerpt only, write `(search excerpt: <url>)`.
3. No invented product names, versions, features or quotes.
4. Prices only with the date seen, marked approximate.
5. Say "not found" rather than guess.
6. Write only your own files. Do not commit.
7. Search budget: web search is shared across the team and can run out. Plan at most 12 searches, most important first. Say in your file what you did not get to.
8. Describe layouts in words and simple ASCII diagrams; do not paste images.

## Round-1 format

```
# <Id>: <topic> — round 1
Agent model: <model>. Date: 2026-10-23.

## Scope
## What I looked at
## Findings
   Concrete, sourced observations about layout, panels, controls, colour, hierarchy
## What Havantechno could borrow
## What would not fit (and why)
## Build notes (plain HTML/CSS/SVG/JS, no build step)
## Recalled, not verified
## Questions for the group
## Sources
```
