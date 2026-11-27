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
