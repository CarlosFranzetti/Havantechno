# Future work

Nothing in this file is committed. Items under **Open items** came from work already done and are known gaps. Items under
**Ideas** are proposals, and each needs a decision before it is built.

## Open items

1. **Studio mix, 300 Hz to 1 kHz.** Measured several dB hotter than the reference track in every section. Tune by ear on
   the studio page, then re-check the band energies against the reference.
2. **Transcribe the real lead melody and chord progression.** The current `Song` data is inspired, not copied. Replace it
   with a transcription of the reference track.
3. **An unidentified 404 in the browser console** on the studio page. Likely the favicon request. Confirm it, then either
   add a favicon or stop the request.
4. **Automated game test.** CONTRACT.md C8 describes a headless Playwright run that reaches the stage 2 mid-boss and the
   stage 1 boss kill. Nothing is committed for it. The checks were run by hand.
5. **Game controls in the README.** The controls and game details were removed from the README in `5c15f37`. The
   README rewrite restores them.
6. **Attribution on commit `546a2c6`.** It names a model in the co-author line, which the repo rules say not to do.
   Correcting it means rewriting a pushed branch, so it needs your go-ahead.
7. **Automatic context dumps.** The memory dumps are written by hand when asked. A scheduled or hook-driven dump has not
   been set up.

## Ideas

### Studio
- Save and load a song as JSON, so an edited arrangement survives a reload.
- A keyboard-driven pattern editor, so steps can be changed without the sliders.
- Per-track sidechain sources, so more than the kick can duck a track.
- A reference-analysis script that prints band energies and onset times for any WAV, so the comparison in item 1 is
  repeatable.
- Export stems (one WAV per track), not just the mixed song.

### Game
- More stages, reusing the `levels.js` data format.
- Replay or ghost of the last run.
- A touch-friendly settings screen for control sensitivity.
- Stage-select on a finished run, using `Game.skipTo` as the basis.

### Repo
- Move `team/` and `context.md` out of the product root once the design discussion is closed.
- Add a `CHANGELOG.md` once there are releases to describe.
