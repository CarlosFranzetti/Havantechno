# D3 log: shell separation, truth on a mix

Dubplate Crew, D3 (Sonnet). Times are Eastern Time with UTC in parentheses.

## 11 November 2026, 14:58 ET (19:58 UTC): read-in

Read CLAUDE.md, BRIEF.md, tools/README.md, tools/separate.py, log-L2.md sections 5 and 10, app/shell/main.js and preload.js,
tools/render.js, and the parts of app/engine (host.js, sequencer.js, song.js, synths.js sampler, programs) that Task B needs.
Environment: python3 with numpy, scipy, torch 2.14.1, demucs and onnxruntime present; the HT-Demucs checkpoint
(955717e8-8726e21a.th) is in ~/.cache/torch/hub/checkpoints; app/node_modules/electron present; Xvfb present.

Decisions before code:
- render.js labels are computed in the page from a dry Sequencer built from the same document the render used
  (`host.document()` for the app page), with each track's `inst.trigger` replaced by a recorder and the arrangement
  scheduled over the rendered bars. So the events are the engine's own, not a re-derivation.
- `--sampler-from track[:rr3|:pitched]`: the captured hits come from ONE instance of the track's instrument in one
  OfflineAudioContext (hits spaced apart), so a per-hit noise counter advances as in the song. The WAV handed to the
  sampler is float32 (lossless). L2's `:<bars>` form is not built: the task text lists only rr3 and pitched.

## 15:05 to 15:40 ET (20:05 to 20:40 UTC): Task B built and measured

`tools/render.js`: `labels` in every sidecar, `--labels-only`, `--sampler-from <track>[:rr3|:pitched]` (spec and limits in
tools/README.md, new section). Measured (this sandbox, app page, mainA, 2 bars, seed 1):
- plain render 0.56 s render + 1.6 s wall (intro); labels cost 0.01 s; `--labels-only` 0.8 s wall, no WAV.
- sampler swap renders: kick 0.87 s, kick:rr3 0.84 s, bass:pitched 0.95 s, hat_open:rr3 0.82 s (render time only; each run about 2 s wall).
- Sidecar diff with and without `--sampler-from kick`: only `name`, `wav`, `samplerFrom` and `labels.kick.*` (type, family,
  source, params, sample* fields) differ; the other seven tracks' labels are identical. Same for kick:rr3, bass:pitched, hat_open:rr3.
- WAV without the new flags: two runs of the same command differ by up to 14 LSB (the known noise in tools/README.md); the sidecar
  gains only `labels`.
- Not sample-exact: solo kick replaced by its own first-hit capture has a residual of +1.4 dB re the synth render, because the
  plain kick's hit 0 and hit 1 already differ (residual -7 dB). Onsets coincide to 1 sample. Open hat rr3: -17 dB in the full mix.
- rr3 `meanAbsDiffRatio`: kick 0.164, hat_open 1.413 (the noise-based hat gives really different captures).
Errors checked: unknown track, :pitched on a track without MIDI, --sampler-from on the studio page: readable messages, exit 1 or 2.

## 15:40 ET (20:40 UTC): Task A built

- `tools/separate.py`: only `--check` added (prints JSON: Python version, REQUIRES per model, missing packages, ffmpeg, cached MDX
  files); numpy/scipy imports guarded so --check runs when they are missing; any other call re-raises the original ImportError.
- `app/shell/separation.js` (new, plain Node): validation, args, Python discovery, preflight, error mapping, progress parsing, runner
  (one at a time, cancel kills the process group, cache by path+size+mtime+model).
- `main.js`: `shell:separate`, `shell:cancelSeparate`, before-quit kill. `preload.js`: `separate`, `cancelSeparate`, `onSeparateProgress`;
  rejections carry `err.code`.
- Output folder: `<userData>/separation/<name>-<hash>/`. separate.py's own default is tools/out/stems/ (inside the install when
  packaged, not writable); a folder beside the source file may be read-only or a network drive.
- `tools/shell-separate-check.js`: 92 checks, exit 0.

## 15:14 ET (20:14 UTC): Electron under Xvfb (Playwright `_electron`, Electron 45, `--no-sandbox`, temp user-data-dir)

- Bridge exposes separate, cancelSeparate, onSeparateProgress. Refusals: `/etc/passwd` ("Not an audio file"), a relative path, model "zzz": readable messages.
- Real run on a 6.4 s WAV rendered by the engine (tools/out/d3/short.wav): HT-Demucs (auto), 4 stems drums/bass/other/vocals,
  model `htdemucs`, 241 s wall in a cold sandbox under load (Demucs itself 58 s), 11 progress events (prepare, percent from the tqdm bar, done),
  stems in `<userData>/separation/short-f5532a7a/`. The weights were cached; no download was attempted. A second call during the run was rejected.
- Cancel after 8 s: the pending call rejected "Separation cancelled.", no demucs or separate.py process was left.
- Found: contextBridge delivers rejections as plain `Error` with the message only, so `err.code` set in the preload does not reach the page. Messages stand alone.
- Not run in Electron: python-missing, packages-missing and weights-missing paths (unit-tested with a fake spawn only); mp3 input and the ffmpeg path; macOS and Windows.
- Other checks (same day): `node app/engine/selfcheck.js` exit 1, "section 5 threw ... reading 'vel'" at selfcheck.js:1071 (D1's file, in progress, not from my files);
  `node tools/browser-check.js` exit 0, 26 checks; `node tools/analysis-check.js` exit 0, 47 checks; `node tools/shell-separate-check.js` exit 0, 92 checks.
