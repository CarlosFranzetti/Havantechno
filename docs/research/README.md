# Roundtable

Roundtable is the name for how research is done in this repo: a team of agents on different models researches a question in parallel, writes every finding to a transcript file, reads each other's work, argues about it in writing, and (when asked) votes. The coordinator (the Fable session) writes the brief, runs the rounds and writes the final referenced report. Nothing is reported that is not in a transcript.

Standing rules, repeated in every brief: cite only URLs actually seen, mark every claim verified or unverified, invent no names, give prices only with dates, say "not found" rather than guess.

## Groups

| Group | Date | Question | Folder | Status |
|-------|------|----------|--------|--------|
| Gear Crew | 2026-10-23 | What plugins, instruments, effects and analysis tools could recreate a source track inside Havantechno, and what runs in a browser? | `2026-10-23-plugin-gear/` | Complete: 12 reports, 2 critiques with measurements, 10 answers, 2 syntheses. See REPORT.md; the corrected measurement table is in transcripts/round4-O1.md. |
| Build Crew | 2026-10-23 | Build the web and desktop app from the reports: Host, widgets, faces, System Editor, Step View, windows, Electron shell, audio fixes, scoring loop. | `2026-10-23-build-crew/` | Complete (2026-10-24). Wave 1 built `app/`; wave 2 reviewed, fixed and added the sampler. `DISCUSSION.md` (compiled from the logs) and `REPORT.md`. |
| Ear Crew | 2026-10-24 | Make the recreation sound like the original, with every sound accounted for: five analysts measure the owner's file against the app, a cross-read settles disputes, a spec is built and scored in a render loop. | `2026-10-24-ear-crew/` | Round 3 paused after four scored passes (within 0.5 LU per section, 13 to 18 of 29 bands within 2 dB) for the owner to listen. `V3-SPEC.md`, `DISCUSSION.md` (35 threads), `REPORT.md`. |
| Faceplate | 2026-10-23 | How should the Havantechno DAW be laid out, and how does each device get its own look? Ableton Live and Logic Pro as references. | `2026-10-23-faceplate-layout/` | Complete: 12 reports, 12 discussion files, 12 ballots; Strip Bench won and is now the System Editor view. A round-5 follow-up (desktop, floating windows, Step View) is in transcripts/round5-*. See REPORT.md, DISCUSSION.md, VOTE.md and the canvas linked in the report. |

Each group folder holds `BRIEF.md`, `transcripts/` (one file per agent per round), and `REPORT.md` by the coordinator. Faceplate also has `DISCUSSION.md` and `VOTE.md`, the separate transcript of the group's debate and ballot.

## Names

- **Roundtable** is the process: agent teams on several models research in parallel, write every finding to a transcript, read each other, argue in writing, vote or settle disputes by measurement, and the coordinator writes the report.
- **The Soundsystem** is the whole company of agents across every group, named 2026-10-24 at the owner's request. In dub a sound system is the crew as a whole, from the selectors and the engineer to the box builders, and that is what these agents are to this studio. The coordinator (the Fable session) is its operator.
- Each group is a **crew** with its own name and roster: Gear Crew, Faceplate, Build Crew, Ear Crew. Inside a crew, agents carry a role id (H1, S3, O2; F-S4; A7; E1) and a model, not a personal name, so a reader can tell which model said what.
- Compilers of the discussion transcripts are "the scribe"; the coordinator appears in every log as "the coordinator".

## Transcript index

Every file an agent wrote, as a record. Line counts at the time of this index.

**`2026-10-23-build-crew/`**

- `2026-10-23-build-crew/BRIEF.md` (28 lines)
- `2026-10-23-build-crew/DISCUSSION.md` (815 lines)
- `2026-10-23-build-crew/REPORT.md` (99 lines)
- `2026-10-23-build-crew/transcripts/log-A1.md` (127 lines)
- `2026-10-23-build-crew/transcripts/log-A10.md` (106 lines)
- `2026-10-23-build-crew/transcripts/log-A11.md` (155 lines)
- `2026-10-23-build-crew/transcripts/log-A2.md` (55 lines)
- `2026-10-23-build-crew/transcripts/log-A3.md` (61 lines)
- `2026-10-23-build-crew/transcripts/log-A4.md` (97 lines)
- `2026-10-23-build-crew/transcripts/log-A5.md` (89 lines)
- `2026-10-23-build-crew/transcripts/log-A6.md` (95 lines)
- `2026-10-23-build-crew/transcripts/log-A7.md` (170 lines)
- `2026-10-23-build-crew/transcripts/log-A8.md` (192 lines)
- `2026-10-23-build-crew/transcripts/log-A9.md` (252 lines)
- `2026-10-23-build-crew/transcripts/log-coordinator.md` (207 lines)

**`2026-10-23-faceplate-layout/`**

- `2026-10-23-faceplate-layout/BRIEF.md` (66 lines)
- `2026-10-23-faceplate-layout/DISCUSSION.md` (1160 lines)
- `2026-10-23-faceplate-layout/REPORT.md` (98 lines)
- `2026-10-23-faceplate-layout/VOTE.md` (281 lines)
- `2026-10-23-faceplate-layout/transcripts/round1-FH1-ableton-layout.md` (208 lines)
- `2026-10-23-faceplate-layout/transcripts/round1-FH2-logic-layout.md` (226 lines)
- `2026-10-23-faceplate-layout/transcripts/round1-FH3-instrument-faces.md` (239 lines)
- `2026-10-23-faceplate-layout/transcripts/round1-FH4-effect-faces.md` (185 lines)
- `2026-10-23-faceplate-layout/transcripts/round1-FH5-mixer-transport-arrangement.md` (225 lines)
- `2026-10-23-faceplate-layout/transcripts/round1-FO1-design-director.md` (335 lines)
- `2026-10-23-faceplate-layout/transcripts/round1-FO2-tech-lead.md` (331 lines)
- `2026-10-23-faceplate-layout/transcripts/round1-FS1-browser-daws.md` (196 lines)
- `2026-10-23-faceplate-layout/transcripts/round1-FS2-implementation.md` (222 lines)
- `2026-10-23-faceplate-layout/transcripts/round1-FS3-remix-ia.md` (264 lines)
- `2026-10-23-faceplate-layout/transcripts/round1-FS4-visual-system.md` (256 lines)
- `2026-10-23-faceplate-layout/transcripts/round1-FS5-interaction.md` (176 lines)
- `2026-10-23-faceplate-layout/transcripts/round2-FH1.md` (76 lines)
- `2026-10-23-faceplate-layout/transcripts/round2-FH2.md` (65 lines)
- `2026-10-23-faceplate-layout/transcripts/round2-FH3.md` (74 lines)
- `2026-10-23-faceplate-layout/transcripts/round2-FH4.md` (75 lines)
- `2026-10-23-faceplate-layout/transcripts/round2-FH5.md` (60 lines)
- `2026-10-23-faceplate-layout/transcripts/round2-FO1.md` (153 lines)
- `2026-10-23-faceplate-layout/transcripts/round2-FO2.md` (155 lines)
- `2026-10-23-faceplate-layout/transcripts/round2-FS1.md` (82 lines)
- `2026-10-23-faceplate-layout/transcripts/round2-FS2.md` (68 lines)
- `2026-10-23-faceplate-layout/transcripts/round2-FS3.md` (77 lines)
- `2026-10-23-faceplate-layout/transcripts/round2-FS4.md` (81 lines)
- `2026-10-23-faceplate-layout/transcripts/round2-FS5.md` (91 lines)
- `2026-10-23-faceplate-layout/transcripts/round3-FH1-ballot.md` (13 lines)
- `2026-10-23-faceplate-layout/transcripts/round3-FH2-ballot.md` (13 lines)
- `2026-10-23-faceplate-layout/transcripts/round3-FH3-ballot.md` (13 lines)
- `2026-10-23-faceplate-layout/transcripts/round3-FH4-ballot.md` (13 lines)
- `2026-10-23-faceplate-layout/transcripts/round3-FH5-ballot.md` (15 lines)
- `2026-10-23-faceplate-layout/transcripts/round3-FO1-ballot.md` (13 lines)
- `2026-10-23-faceplate-layout/transcripts/round3-FO2-ballot.md` (13 lines)
- `2026-10-23-faceplate-layout/transcripts/round3-FS1-ballot.md` (10 lines)
- `2026-10-23-faceplate-layout/transcripts/round3-FS2-ballot.md` (13 lines)
- `2026-10-23-faceplate-layout/transcripts/round3-FS3-ballot.md` (13 lines)
- `2026-10-23-faceplate-layout/transcripts/round3-FS4-ballot.md` (13 lines)
- `2026-10-23-faceplate-layout/transcripts/round3-FS5-ballot.md` (13 lines)
- `2026-10-23-faceplate-layout/transcripts/round5-FH2-floating-windows.md` (162 lines)
- `2026-10-23-faceplate-layout/transcripts/round5-FH3-instrument-windows.md` (237 lines)
- `2026-10-23-faceplate-layout/transcripts/round5-FH4-effect-windows.md` (228 lines)
- `2026-10-23-faceplate-layout/transcripts/round5-FO1-window-system.md` (302 lines)
- `2026-10-23-faceplate-layout/transcripts/round5-FO2-desktop-build.md` (238 lines)
- `2026-10-23-faceplate-layout/transcripts/round5-FS5-step-view.md` (197 lines)

**`2026-10-23-plugin-gear/`**

- `2026-10-23-plugin-gear/BRIEF.md` (84 lines)
- `2026-10-23-plugin-gear/REPORT.md` (104 lines)
- `2026-10-23-plugin-gear/transcripts/round1-H1-kick-sub.md` (139 lines)
- `2026-10-23-plugin-gear/transcripts/round1-H2-bass.md` (130 lines)
- `2026-10-23-plugin-gear/transcripts/round1-H3-stab-pad.md` (132 lines)
- `2026-10-23-plugin-gear/transcripts/round1-H4-drums.md` (138 lines)
- `2026-10-23-plugin-gear/transcripts/round1-H5-lead-fx-browser-synths.md` (138 lines)
- `2026-10-23-plugin-gear/transcripts/round1-O1-whys-and-hows.md` (359 lines)
- `2026-10-23-plugin-gear/transcripts/round1-O2-daw-possibilities.md` (368 lines)
- `2026-10-23-plugin-gear/transcripts/round1-S1-sidechain-compression.md` (162 lines)
- `2026-10-23-plugin-gear/transcripts/round1-S2-delay-reverb.md` (148 lines)
- `2026-10-23-plugin-gear/transcripts/round1-S3-saturation-eq-filter.md` (207 lines)
- `2026-10-23-plugin-gear/transcripts/round1-S4-limiter-width-modulation.md` (154 lines)
- `2026-10-23-plugin-gear/transcripts/round1-S5-stems-transcription.md` (278 lines)
- `2026-10-23-plugin-gear/transcripts/round2-O1.md` (226 lines)
- `2026-10-23-plugin-gear/transcripts/round2-O2.md` (340 lines)
- `2026-10-23-plugin-gear/transcripts/round3-H1.md` (131 lines)
- `2026-10-23-plugin-gear/transcripts/round3-H2.md` (155 lines)
- `2026-10-23-plugin-gear/transcripts/round3-H3.md` (155 lines)
- `2026-10-23-plugin-gear/transcripts/round3-H4.md` (200 lines)
- `2026-10-23-plugin-gear/transcripts/round3-H5.md` (124 lines)
- `2026-10-23-plugin-gear/transcripts/round3-S1.md` (216 lines)
- `2026-10-23-plugin-gear/transcripts/round3-S2.md` (133 lines)
- `2026-10-23-plugin-gear/transcripts/round3-S3.md` (170 lines)
- `2026-10-23-plugin-gear/transcripts/round3-S4.md` (183 lines)
- `2026-10-23-plugin-gear/transcripts/round3-S5.md` (258 lines)
- `2026-10-23-plugin-gear/transcripts/round4-O1.md` (296 lines)
- `2026-10-23-plugin-gear/transcripts/round4-O2.md` (400 lines)

**`2026-10-24-ear-crew/`**

- `2026-10-24-ear-crew/BRIEF.md` (50 lines)
- `2026-10-24-ear-crew/DISCUSSION.md` (779 lines)
- `2026-10-24-ear-crew/REPORT.md` (98 lines)
- `2026-10-24-ear-crew/V3-SPEC.md` (706 lines)
- `2026-10-24-ear-crew/transcripts/E1-low-end.md` (545 lines)
- `2026-10-24-ear-crew/transcripts/E2-mids.md` (193 lines)
- `2026-10-24-ear-crew/transcripts/E3-drums-top.md` (299 lines)
- `2026-10-24-ear-crew/transcripts/E4-arrangement-samples.md` (273 lines)
- `2026-10-24-ear-crew/transcripts/E5-mix.md` (474 lines)
- `2026-10-24-ear-crew/transcripts/log-A7.md` (299 lines)
- `2026-10-24-ear-crew/transcripts/log-A8.md` (141 lines)
- `2026-10-24-ear-crew/transcripts/log-A9.md` (1073 lines)
- `2026-10-24-ear-crew/transcripts/log-coordinator.md` (158 lines)

## Rosters

Both groups: five Haiku agents on narrow topics, five Sonnet agents on broader or technical topics, two Opus agents (one on the reasoning, one on the platform or build), coordinated by the Fable session. Ids: H1 to H5, S1 to S5, O1, O2 (Gear Crew) and F-H1 to F-H5, F-S1 to F-S5, F-O1, F-O2 (Faceplate). Each brief lists who covers what.

## Known limits of the sandbox

Page fetches often fail from the research container (DNS errors, proxy denials), so most "verified" marks rest on search-result excerpts rather than on the page itself. The transcripts say which. Web search has a shared per-turn budget, so late searches in a round can fail; the transcripts list what was not covered.

## Note on paths

On 2026-10-23 the `studio/` folder was moved to `olde Havantechno dub studio/`. Briefs and transcripts written before that refer to `studio/...`; read those paths against the new folder.
