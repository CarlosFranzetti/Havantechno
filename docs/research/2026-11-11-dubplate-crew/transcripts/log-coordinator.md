# Dubplate Crew: coordinator's log

Times are Eastern Time with UTC in parentheses. Rulings given to agents in messages are copied here when they are given.

## 2026-11-11 14:55 EST (19:55 UTC) — crew formed, three agents dispatched

Batch 4 after the Lab Crew's analysis module and the Patch Crew's instruments landed. BRIEF.md fixes the interface (doc.reference, doc.analysis, the Host reference and A/B calls, Importer, Project.importTrack, the shell's separate) so the three can build at once. D1 (Opus): host.js, project.js, songdoc.js, the new importer.js, selfcheck additions, tools/importer-check.js. D2 (Opus): the new import-view.js and css, app.js, index.html, a reference lane and one menu entry in system-editor.js, tools/import-view-check.js. D3 (Sonnet): shell main.js and preload.js, render.js labels to L2's spec, tools/shell-separate-check.js.

Instructions given in the task messages beyond the brief: D1 measures tempo, steps and notes against truth renders in Chromium and reports the fraction recovered, and asks D2 (owner of index.html) for its script tag through its log; D2 feature-detects every Host call, tests on a stub first and re-tests against D1's files on disk before handing back, and saves two screenshots after looking at them; D3 never builds a shell string, validates the path crossing IPC, reports the exact host if a model download is refused, and keeps render.js unchanged for callers without the new flags.

Tree state at dispatch (coordinator's runs, exit 0): selfcheck 395, classics 110, panels 116, synths 169, drums 342, faces 2495, system-editor 97, processors 92, step-view 72, widgets 157, analysis 47, browser 26.

## 2026-11-11 15:18 EST (20:18 UTC) — D3 verified: separation from the shell, labels in render.js

D3's hand-back: HavantechnoShell.separate(path, {model}), cancelSeparate, onSeparateProgress in main.js and preload.js, with the logic in a new plain-Node file app/shell/separation.js so Node can test it; separate.py gains only --check (JSON: Python version, required packages per model, what is missing, ffmpeg, cached weights). Stems go to <userData>/separation/<name>-<hash of path, size, mtime, model>/; a repeat returns the earlier stems. One run at a time; cancel kills the process group; python-missing, packages-missing (with the pip command), weights-missing (with the host), weights-bad and ffmpeg-missing are named. tools/render.js writes per-track labels in every sidecar and takes --labels-only and --sampler-from <track>[:rr3|:pitched].

Run here: shell-separate-check OK: 92; analysis-check 47; browser-check PASS (26). The coordinator read the spawn calls (argument arrays, no shell string; the IPC handler is main-window only) and rendered two bars: 0.63 s render, 1.9 s wall, the sidecar carries labels for the four sounding tracks with element, type, family, machine, source and params. D3's Electron run under Xvfb (a real HT-Demucs separation of a 6.4 s render: 4 stems, 11 progress events, 241 s wall of which Demucs 58 s; a second call rejected; cancel left no stray process) was not repeated here.

Rulings: app/shell/separation.js is accepted as D3's file. L2's :<bars> form of --sampler-from stays unbuilt until something needs it. Note for D2 (sent): rejections cross the bridge as a plain Error with the message only, so the interface shows the message and does not branch on a code.

Not verified: the missing-Python, missing-package and missing-weights paths in a real Electron run (unit tests only); mp3 input through ffmpeg; any model download; macOS and Windows. selfcheck reads FAILED 6 of 445 at this moment: D1 is mid-edit in its files; D3 did not touch them.
