# Research brief: what gear would recreate a source track inside Havantechno?

Date: 2026-10-23. Coordinator: the Fable session. This file is the shared context for every research agent. Read it fully before searching.

## What Havantechno is today

Havantechno is a browser-only Web Audio studio in this repo (`studio/`). No build step, no audio files, no plugin hosting. It recreates one reference track, "Guidance (Original Mix)" by havantepe (electro, 126 BPM, key B, 6:28), with:

- 13 hand-written synths (`studio/synths.js`): kick, sub, bass, stab, clap, hat_closed, hat_open, shaker, perc, lead, pad, riser, impact. Each has a small parameter spec, e.g. kick {tune, punch, sweep, decay, click, drive}; bass {cutoff, env, res, decay, drive, sub}.
- 10 processors (`studio/processors.js`): filter (lowpass/highpass/bandpass, cutoff, q, gain), saturator (drive, mix, tone), delay (tempo-synced ping-pong: time or division, feedback, mix, tone, hp), reverb (generated impulse: size, decay, damp, predelay, mix, hp), eq3 (low/mid/high bands with freq and Q), compressor (threshold, ratio, attack, release, knee, makeup), limiter (threshold, release, ceiling), sidechain ducker (depth, attack, hold, release), widener (width), chorus (rate, depth, mix).
- A 16-step sequencer with swing, a 200-bar arrangement in 9 sections, per-track inserts and sends, a master chain (eq3 → highpass → lowpass → glue compressor → saturator → limiter), and offline WAV export.
- A self-check: `node studio/selfcheck.js`.

The design spec with the measured analysis of the reference track is `docs/superpowers/specs/2026-10-21-guidance-studio-design.md`. Read it; the table of findings there is what you are trying to recreate.

## What the owner wants it to become

1. **Each device has its own look**, the way a DAW shows a different panel per instrument and per effect, instead of identical slider lists.
2. **The source track lives in the DAW as a modifiable track**, with every element separate and tweakable (the stems and the MIDI that drives them).
3. **A remixing DAW pipeline:** take a source song → separate it into stems → transcribe the stems into MIDI and parameter data → load that into Havantechno → recreate the source song, either with the synths and processors that are already in the DAW, by modifying one of them, or by creating a new synth or processor when nothing fits.

The first attempt uses the Guidance track as the guide to what "recreating" means.

## The research question

What plugins, instruments, effects and analysis tools (commercial, free or open source; desktop or browser-capable) could achieve these recreations, element by element and stage by stage? Which of them could run in, or be reimplemented in, a browser DAW? What would a realistic gear list look like, and what would it cost or what licence would it carry?

## Roster

Round 1 agents, each with a file in `transcripts/`:

| Id | Model | Topic | File |
|----|-------|-------|------|
| H1 | Haiku | Kick and sub-bass synthesis | `round1-H1-kick-sub.md` |
| H2 | Haiku | Mid bass synths (the syncopated saw/square bass) | `round1-H2-bass.md` |
| H3 | Haiku | Chord stab and pad polysynths | `round1-H3-stab-pad.md` |
| H4 | Haiku | Hats, clap, shaker and percussion (drum machines and drum synths) | `round1-H4-drums.md` |
| H5 | Haiku | Lead, riser, impact synths, and synth engines that run in a browser | `round1-H5-lead-fx-browser-synths.md` |
| S1 | Sonnet | Sidechain, compression and glue | `round1-S1-sidechain-compression.md` |
| S2 | Sonnet | Delay and reverb | `round1-S2-delay-reverb.md` |
| S3 | Sonnet | Saturation, EQ and filters | `round1-S3-saturation-eq-filter.md` |
| S4 | Sonnet | Limiting, mastering, stereo width, chorus and modulation | `round1-S4-limiter-width-modulation.md` |
| S5 | Sonnet | Stem separation and audio-to-MIDI transcription tools | `round1-S5-stems-transcription.md` |
| O1 | Opus | The whys and hows: what makes each element sound as it does, how recreation can be automated, what the research says | `round1-O1-whys-and-hows.md` |
| O2 | Opus | The DAW and its possibilities: plugin hosting in a browser, MIDI in and out, audio capabilities, other DAWs' stem and remix features, per-device UI | `round1-O2-daw-possibilities.md` |

Later rounds: O1 and O2 read every round-1 file and reply with critiques and numbered questions addressed to named agents (`round2-O1.md`, `round2-O2.md`). The round-1 agents answer in `round3-<id>.md` and also comment on one partner's report (pairs: H1–S1, H2–S3, H3–S2, H4–S4, H5–S5). O1 and O2 then write `round4-O1.md` and `round4-O2.md`. The coordinator writes `../REPORT.md`.

## Rules for every agent

Accuracy comes first. The owner has asked for honesty over completeness.

1. **Cite only what you saw.** Every URL you give must come from a search result you received or a page you fetched. Copy it exactly. Never compose a URL from memory.
2. **Mark verification.** After each product fact write `(verified: <url>)` or `(unverified)`. An unverified claim is allowed, but it must be labelled.
3. **No invented names.** Do not name a plugin, version, feature or company unless a source showed it. If you remember something but cannot find it, write it under "Recalled, not verified".
4. **Prices and dates.** Give a price only if a page showed it, with the date you saw it, and call it approximate. Say when a page may be out of date.
5. **Quotes.** Do not quote a person unless the source shows the exact words.
6. **Say "not found".** If a search turns up nothing, say so. Do not fill the gap with a guess.
7. **Write only your own file.** Do not edit any other file in the repo. Do not commit.
8. **Stay in scope.** Your topic only. Put anything out of scope under "Handoffs to other agents" with the agent id.

## Output format for a round-1 file

```
# <Id>: <topic> — round 1
Agent model: <model>. Date: 2026-10-23.

## Scope
## What the reference track needs from this category
   (use the analysis table in the design spec)
## Findings
   A table: Name | Vendor | Licence (commercial / free / open source) | Formats (VST3, AU, CLAP, AAX, hardware, web) | Relevance to the element | Verified source
## Recommended gear list
   Ranked, with one line each on why, and the approximate cost or licence
## Browser feasibility
   What here can run in a browser, what has a Web Audio equivalent, what would need reimplementing
## Recalled, not verified
## Handoffs to other agents
## Questions for the Opus agents
## Sources
   Every URL used, as a list
```

Aim for depth over breadth: eight to fifteen well-verified entries beat forty names. Use extended search mode when a standard search is thin.
