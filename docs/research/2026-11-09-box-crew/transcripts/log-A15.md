# Log A15: app/README.md update (Box Crew, documentation)

Times Eastern (EST/EDT as shown by the coordinator's log). Writer A15, 2026-11-11. Files written: `app/README.md`, this log. Nothing committed. No git stash, checkout, reset or clean.

## Interruption

The 5-hour limit stopped this run after the reading below. The coordinator's message said the limit had reset, to continue per the brief, write early, and re-run any failing drum or face check once because the second drum fitting pass is still editing `drums.js`, `drums-check.js` and `drums-score.js`. The run resumed from this log.

## Read (sources for each claim in the README)

- `app/README.md` as it stood (status at 55f205d, 2026-10-24).
- `docs/research/2026-11-09-box-crew/REPORT.md` (coordinator's report).
- `transcripts/log-A1.md`, `log-A3.md`, `log-A4.md`, `log-A6.md`, `log-A7.md`, `log-A9.md`, `log-A12.md`, and `log-coordinator.md` (the whole file's index, its 2026-11-09 entries from 04:12 to 04:48 ET, and the last entries). `log-coordinator.md` was read through the tool result file, and its entries were read in full from 04:12 onward.
- `app/CONTRACT.md`: Host section (lines 49 to 95) and Sampler and "Sampler programs" sections (lines 164 to 212).
- `docs/plans/2026-11-09-roadmap.md` (batches 1 to 6, status 2026-11-09, batch 2b added 2026-11-11).
- Headers of `app/analysis/decide.js`, `dsp.js`, `features.js`; `app/engine/programs.js`; `app/engine/drums.js`; `tools/drums-score.js`.
- `THIRD_PARTY.md`, `app/engine/drums.js` attribution comments (grep).
- `docs/research/2026-11-11-patch-crew/BRIEF.md` existence only (not read).

I did not read `B1-sampler.md`, `B2-808.md`, `B3-909.md`, `log-A12`'s full verification detail beyond the log's own text, or `app/analysis/*` bodies. Claims about the analysis module come from its headers and the roadmap's status line only.

## Checks run (directly, exit codes read; working tree at 9ade5c2 with uncommitted edits, see below)

| Command | Output | Exit |
|---|---|---|
| `node app/engine/selfcheck.js` | `OK: 392 checks passed` | 0 |
| `node tools/synths-check.js` | `OK: 169 checks passed` | 0 |
| `node tools/drums-check.js` | `OK: 342 checks passed` | 0 |
| `node tools/system-editor-check.js` | `OK: 97 checks passed` | 0 |
| `node tools/faces-check.js` | `OK: 2495 checks passed` | 0 |
| `node tools/step-view-check.js` | `OK: 72 checks passed` | 0 |
| `node tools/processors-check.js` | `OK: 92 checks passed` | 0 |
| `node tools/widgets-check.js` | `OK: 157 checks passed` | 0 |
| `node tools/analysis-check.js` | `OK: 36 checks passed` | 0 |
| `node tools/browser-check.js` | `RESULT: PASS (26 checks)` | 0 |

Expected values from the coordinator's last run: 392, 169, 341, 97, 2495, 72, 92, 157, 36, 26. Only drums differs: 342 against 341. The drums check exited 0, so no re-run was needed under the coordinator's rule. The difference is consistent with the second fitting pass in progress; I did not investigate it.

Not run by me this pass: `python3 tools/score.py --selftest`, `node tools/render.js ...`, `node tools/drums-score.js`. The README says so.

## Tree state at the time of the checks

`git rev-parse --short HEAD` gave `9ade5c2` (2026-11-11 17:59:09 +0000, "Patch Crew P1"). `git status --short` showed uncommitted changes: `app/engine/drums.js`, `app/index.html`, `app/ui/windows.js` (modified); untracked `app/engine/worklets/`, `app/ui/panels.css`, `app/ui/panels.js`, `docs/research/2026-11-09-lab-crew/transcripts/log-L2.md`. The checks therefore ran on the working tree, not on a commit. The README states this.

## Claims in the README and where each comes from

- Sampler adding paths, menu entries, folder and SFZ drops, single file as a plain sampler: log-A4.md (batch 1); single-file behaviour from log-A4.md "What changed".
- Program contents (zones, round robins, loops with baked crossfade, dB-linear envelopes, filter, LFOs, choke, polyphony): log-A7.md; CONTRACT.md "Sampler programs".
- Auto-mapping by name, then pitch detection: log-A7.md (`parseName`, `autoMap`, YIN `detectPitch`); synths-check cases in section 10 (pitch and name parser). YIN within 3 cents on a prototype: REPORT.md section 3 (B1 prototype, not re-run).
- Storage as references, never bytes: CONTRACT.md Sampler section; log-A1.md decisions 1 and 2.
- Sampler face (zone map, region panel, quick view, waveform hero, buttons): log-A3.md batch 1.
- Unverified sampler items: REPORT.md section 5; log-A3.md "Not verified"; log-A4.md "Not verified"; log-A6.md (dialogs stubbed under Xvfb).
- Drum kits, single voices, 27 voices: log-A4.md batch 2 (menu and kit contents); voice list from the `tools/faces-check.js` output I ran this pass (it prints the 27 type names); log-A12.md.
- Synthesis basis (manual, paper, source, prior) and the dotted ring: log-A12.md ("Third pass applied"); log-A3.md batch 2 (dotted ring).
- Manuals: the REPORT says the service manuals were unreachable. log-coordinator.md 04:32 says the owner uploaded the TR-808 service manual, owner's manual and TR-909 document, and 04:36 and 04:37 record the third passes. The README follows the coordinator log and says that REPORT.md section 5 predates it.
- First score: log-A9.md, "Table (run 3, current app/engine/drums.js)": PASS 61, FAIL 44, INFO 12, ERR 0, 117 rows; commit 9cbb0dc. A15 did not re-run the scorer.
- Second fitting pass in progress: log-coordinator.md 04:48 (A12 iteration 2 paused by the owner) and the coordinator's message to A15 this session.
- fm: log-A7.md "fm instrument"; log-A3.md batch 2 (face); synths-check section 11 (ran this pass, 169 passed).
- Module map rows: `engine/programs.js` (header of the file, log-A7.md), `engine/drums.js` (header of the file, log-A12.md), `app/analysis/` (headers of the three files; roadmap batch 3 status line "in progress").
- Patch Crew line: roadmap batch 2b (added 2026-11-11) and the brief path. Not read in full.

## Discrepancies and open items for the coordinator

1. `THIRD_PARTY.md` still lists "(none yet)". `app/engine/drums.js` cites andremichelle/tr-909 (AGPL-3.0-or-later) constants by file and line (lines 18, 22, 64, 617). CLAUDE.md says to keep one `THIRD_PARTY.md` row per ported item. REPORT.md section 5 does not list this. The README lists it as unverified. A15 did not edit `THIRD_PARTY.md`: outside the write list.
2. REPORT.md section 5 says the service manuals were unreachable. The later coordinator entries (04:32 to 04:37) and log-A12's third pass show they were read. The README uses the later account.
3. The status table in `app/README.md` is still the 2026-10-24 table, which predates batches 1 and 2. The README says so and does not re-audit it.
4. `tools/drums-check.js` reported 342 against the expected 341. The second pass is editing that file, so the number may change again.
5. The checks ran on uncommitted work, as stated above.

## Verification of this document

- The README was written once with `Write` and not re-read after writing; claims were checked against the sources above when written.
- No file other than `app/README.md` and this log was written.
