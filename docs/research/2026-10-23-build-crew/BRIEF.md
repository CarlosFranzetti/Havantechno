# Build Crew (Roundtable, coding round)

Date: 2026-10-23. Coordinator: the Fable session. The research groups (Gear Crew, Faceplate) produced reports and a plan; this group builds. Contract: `app/CONTRACT.md` (read it first; it names your files, your interface and your dependencies). Decisions: `prd.md` 6b (Electron shell, AGPL-3.0-or-later, version 1 edits and saves, audio files allowed). Plan: `docs/plans/2026-10-23-desktop-build-plan.md`.

## Roster

| Id | Model | Role | Files (see CONTRACT) |
|----|-------|------|------|
| A1 | Opus | Engine lead: Host, Project, self-check | `app/engine/host.js`, `project.js`, `selfcheck.js` |
| A2 | Sonnet | Widgets and theme | `app/ui/widgets.js`, `theme.css` |
| A3 | Sonnet | Faces registry and the 23 face definitions | `app/ui/faces.js`, `facedefs.js` |
| A4 | Sonnet | System Editor view | `app/ui/system-editor.js` |
| A5 | Sonnet | Step View | `app/ui/step-view.js` |
| A6 | Sonnet | Windows, app frame, web server, Electron shell | `app/ui/windows.js`, `app.js`, `app/index.html`, `app/shell/*`, `app/package.json`, `tools/serve.js` |
| A7 | Haiku | Audio fixes: instruments and GUIDANCE_V2 | `app/engine/synths.js`, `song.js` |
| A8 | Haiku | Audio fixes: processors | `app/engine/processors.js` |
| A9 | Haiku | Scoring loop | `tools/render.js`, `score.py`, `tools/README.md` |
| A10 | Haiku | Browser check and docs | `tools/browser-check.js`, `app/README.md`, plan status |
| A11 | Opus | Integration review (wave 2) | reads everything, writes `review-A11.md` |

## Waves

1. **Build.** Everyone codes their files against the contract, logging as they go. The coordinator commits and runs the self-check and the browser check.
2. **Integrate.** A11 reviews all modules against the contract and each other, lists mismatches by owner. Each owner reads the review and the other logs, fixes their own files, logs what changed. The coordinator commits, runs the checks, compiles `DISCUSSION.md` from all logs, and writes `REPORT.md`.

## Rules

Same as the research rounds: write only your own files and log; no commits; verify before you report and say what you ran; mark anything unverified. Prefer the research transcripts over memory for design facts, and cite them in your log when you take one. Web search is allowed for API facts (MDN, Electron, Playwright docs), at most 6 searches each.
