# Roundtable

Roundtable is the name for how research is done in this repo: a team of agents on different models researches a question in parallel, writes every finding to a transcript file, reads each other's work, argues about it in writing, and (when asked) votes. The coordinator (the Fable session) writes the brief, runs the rounds and writes the final referenced report. Nothing is reported that is not in a transcript.

Standing rules, repeated in every brief: cite only URLs actually seen, mark every claim verified or unverified, invent no names, give prices only with dates, say "not found" rather than guess.

## Groups

| Group | Date | Question | Folder | Status |
|-------|------|----------|--------|--------|
| Gear Crew | 2026-10-23 | What plugins, instruments, effects and analysis tools could recreate a source track inside Havantechno, and what runs in a browser? | `2026-10-23-plugin-gear/` | Complete: 12 reports, 2 critiques with measurements, 10 answers, 2 syntheses. See REPORT.md; the corrected measurement table is in transcripts/round4-O1.md. |
| Build Crew | 2026-10-23 | Build the web and desktop app from the reports: Host, widgets, faces, System Editor, Step View, windows, Electron shell, audio fixes, scoring loop. | `2026-10-23-build-crew/` | Wave 1 in progress. |
| Faceplate | 2026-10-23 | How should the Havantechno DAW be laid out, and how does each device get its own look? Ableton Live and Logic Pro as references. | `2026-10-23-faceplate-layout/` | Complete: 12 reports, 12 discussion files, 12 ballots; Strip Bench won and is now the System Editor view. A round-5 follow-up (desktop, floating windows, Step View) is in transcripts/round5-*. See REPORT.md, DISCUSSION.md, VOTE.md and the canvas linked in the report. |

Each group folder holds `BRIEF.md`, `transcripts/` (one file per agent per round), and `REPORT.md` by the coordinator. Faceplate also has `DISCUSSION.md` and `VOTE.md`, the separate transcript of the group's debate and ballot.

## Rosters

Both groups: five Haiku agents on narrow topics, five Sonnet agents on broader or technical topics, two Opus agents (one on the reasoning, one on the platform or build), coordinated by the Fable session. Ids: H1 to H5, S1 to S5, O1, O2 (Gear Crew) and F-H1 to F-H5, F-S1 to F-S5, F-O1, F-O2 (Faceplate). Each brief lists who covers what.

## Known limits of the sandbox

Page fetches often fail from the research container (DNS errors, proxy denials), so most "verified" marks rest on search-result excerpts rather than on the page itself. The transcripts say which. Web search has a shared per-turn budget, so late searches in a round can fail; the transcripts list what was not covered.

## Note on paths

On 2026-10-23 the `studio/` folder was moved to `olde Havantechno dub studio/`. Briefs and transcripts written before that refer to `studio/...`; read those paths against the new folder.
