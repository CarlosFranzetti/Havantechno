# T1 log: the separator's output (strategy step A1)

Builder T1 of the Selector Crew. Brief: `docs/research/2026-11-27-selector-crew/BRIEF.md`, row T1. Files owned:
`tools/separate.py`, `app/shell/separation.js`, `tools/shell-separate-check.js`, new `tools/separate-check.*`.

## 2026-11-27 02:13 EST (07:13 UTC): reading and environment

Read: the brief, memory.md "Now", CLAUDE.md, the strategy plan (A1), the Stem Crew REPORT and S2, and for the method
behind 24.0 / 17.7 / 19.4 dB the Lab Crew's `log-L2.md` section 5.3 and `L1-methods.md` section 2.2 (read in the
repository). The method, as those transcripts state it:

- Render: `node tools/render.js --page app --sections mainA3 --bars 16 --song v3`, plus the same with `--solo <track>`
  for each of the twelve tracks (kick, sub, bass, stab, pad, clap, hat_open, shaker, shaker_on, tick, burst, burst_r).
- Input to the separator: the linear sum of the twelve solos ("linmix"), so the truth is exact.
- Truth stems: drums = kick + clap + hat_open + shaker + shaker_on + tick + burst + burst_r; bass = sub + bass;
  other = stab + pad.
- Score: SDR = 10 log10(sum s^2 / sum (s - s_hat)^2) over the whole file, both channels (and SI-SDR in brackets).
  L2's script (`l2/s/sdr.py`) was in a scratch folder and is gone; I rewrite the formula from that definition.

Code read: `tools/separate.py` (HT-Demucs through `python -m demucs` with no `--float32`, so Demucs writes 16-bit
and its default `--clip-mode rescale` divides the whole stem by its peak when it would clip), `app/shell/separation.js`
(`readResult` lists every key of `stems` in the sidecar as a stem, so a residual must not go into `stems` or the
app would analyse it as a fifth stem), `app/engine/project.js` `importTrack` (uses `r.stems`, `r.model`, `r.log`
only), `tools/shell-separate-check.js`.

Environment: a venv in my scratch folder (`--system-site-packages`), outside the repository. The PyTorch CPU index
was refused by the network policy (403 from the proxy); `pip install torch` from PyPI worked (torch 2.15.0+cu132,
run on CPU), with demucs 4.1.0, scipy 1.18.1, soundfile and onnxruntime. The HT-Demucs weights downloaded from
dl.fbaipublicfiles.com (`955717e8-8726e21a.th`, 80.2 MB) into `~/.cache/torch/hub/checkpoints/` (outside the
repository).

## 2026-11-27 08:54 EST (13:54 UTC): built, measured, checks

Resumed after the usage limit. The coordinator asked for two things: finish the separator before the scoring, and keep
the residual out of `stems` under its own key `{path, rmsDbfs, relativeDb, peak}`.

**Built.**
- `tools/separate.py`: HT-Demucs now runs in this process (`demucs.pretrained.get_model('htdemucs')` and
  `demucs.apply.apply_model`), with the CLI's settings (shifts 1, overlap 0.25, split, the model's segment) and its
  normalisation. It does not use the CLI's 16-bit write or its `--clip-mode rescale`. The random shift is seeded
  (`--seed`, default 0). Every model path (htdemucs, mdx, and a new `stub` for checks) goes through one writer that
  writes float32 stems with no clip or rescale, writes `<name>-residual.wav` (the mix minus the sum of the stems, where
  the mix is the loaded float32 input), reads every file back and records `sumCheck.maxAbs`. Sidecar keys added:
  `residual {path, rmsDbfs, relativeDb, peak, note}`, `peaks`, `sumCheck`, `format {sampleFormat, sampleRate,
  channels, rescaled, clipped}`, `weights [{file, url, bytes, sha256}]` (plus `md5` for MDX-Net), `licence {code,
  weights}`, `requested`, `seed`, `inputFormat`, `inputSampleRate`, `resampled`. `stems` keeps four names for HT-Demucs
  (three for MDX-Net, as before). `--check` adds `htdemucsCached`. `--model stub` is a deterministic FFT band split
  scaled by 0.9, so its residual is exactly -20 dB.
- `app/shell/separation.js`: `readResult` returns `residual: {path, rmsDbfs, relativeDb, peak}` (null for a pre-A1
  sidecar or when the file is gone), plus `format`, `weights`, `licence` and `sumCheck`. `stems` is unchanged. The
  shell still accepts only auto, mdx and htdemucs, so `stub` is refused.
- `tools/shell-separate-check.js`: 92 -> 97 checks (the residual key, the residual is not a stem, format, weights and
  licence pass through, stub refused, and a pre-A1 sidecar reads with residual null).
- `tools/separate-check.js` (new): 25 checks by default with the stub, `--full` for the HT-Demucs scoring.

**The check can fail.** In a scratch copy, a demucs-style rescale added to the writer
(`y / max(1.01 * peak, 1)`) made `node tools/separate-check.js` exit 1 with 3 failures (residual -10.48 dB instead of
-20, largest stem peak 0.990, the residual level read through separation.js).

**Scores (`RECUT_PYTHON=<venv> node tools/separate-check.js --full`, exit 1, 38 of 39 pass).** Renders:
`node tools/render.js --page app --sections mainA3 --bars 16 --song v3 [--solo <t>] --out tools/out/sepcheck`, 13
renders, all exit 0, every sidecar gridStartSample 2663 and latencySamples 458. Linear mix of the twelve solos, HT-Demucs
through the new path, 365 s wall on this shared CPU:

| stem | SDR (SI-SDR), new float path | Demucs' own CLI, same file (16-bit, rescale) | 11 Nov (L2) |
|---|---|---|---|
| drums | 25.45 (25.44) | 25.19 (25.36) | 24.0 |
| bass | 12.67 (12.45) | 12.48 (12.26) | 17.7 |
| other | 18.59 (18.53) | 18.50 (18.44) | 19.4 |

The CLI run was `python -m demucs -n htdemucs -o <scratch>/cli tools/out/sepcheck/linmix.wav`, exit 0, 6 m 48 s, scored
by a scratch Python script with the same formula, which reproduced the JS figures for the float path to 0.01 dB. Residual
-38.70 dB against the mix (-49.95 dBFS rms). Stems + residual against the mix: largest error 1.8e-9. Weights:
`955717e8-8726e21a.th`, sha256 8726e21a993978c7ba086d3872e7608d7d5bfca646ca4aca459ffda844faa8b4.

Reading: the bass row fails the 1 dB tolerance I set before the run. Demucs' own CLI gives the same 12.5 dB on the same
file, so the drop belongs to today's render, not to the new code path. The song's tracks have changed since 11 November
(commits to the engine since then); I did not render the 11 November tree to confirm. The CLI wrote the drums stem
rescaled (peak 0.990, against 1.009 in float). That is the defect A1 removes, and here it cost drums 0.26 dB SDR. I left
the 17.7 baseline and the tolerance as they were, and did not move them after the result.

**All checks** (RECUT_PYTHON set to the venv): selfcheck 481 exit 0; analysis 26, browser 30, classics 151, drums 372,
export 51, faces 2499, import-view 122, importer 20, panels 202, presets 1908, processors 92, rom909 12, sampled909 116,
separate 25, shell-files 227, shell-separate 97, solo 151, step-view 72, synths 169, system-editor 105, views 144,
widgets 157, all exit 0. fit-check (T3's, unfinished) was started by my loop before the coordinator's message and exited 2
at once ("tools/fit.js --set solo exited 2"); not counted. drums-score: 86 pass, 19 fail, exit 1 (the baseline).
`node tools/separate-check.js` with the system python3 (no scipy) exits 1 with "set RECUT_PYTHON".

**Not verified.** The MDX-Net path after this change: its ONNX files are not cached here, so I did not download or run
them (the shared writer is exercised by the stub). Determinism of two HT-Demucs runs with the same seed. A real record.
Rendering the 11 November tree to explain the bass drop. Electron end to end.
