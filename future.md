# Future work

Nothing in this file is committed. Items under **Open items** are known gaps. Items under **Ideas** are proposals, and each needs a decision before it is built.

## Open items

1. **Studio mix, 300 Hz to 1 kHz.** Measured several dB hotter than the reference track in every section. Tune by ear on the studio page, then re-check the band energies against the reference.
2. **Transcribe the real lead melody and chord progression.** The current `Song` data is inspired, not copied. Replace it with a transcription of the reference track.
3. **An unidentified 404 in the browser console** on the studio page. Likely the favicon request. Confirm it, then either add a favicon or stop the request.
4. **Attribution on commit `546a2c6`.** It names a model in the co-author line, which the repo rules say not to do. Correcting it means rewriting a pushed branch, so it needs your go-ahead.
5. **Automatic context dumps.** The memory dumps are written by hand when asked. A scheduled or hook-driven dump has not been set up.

## Direction (set 2026-10-23)

- **Per-device looks (PRD D1).** Give each synth and processor its own panel design. The research report in `docs/research/2026-10-23-plugin-gear/` surveys how other DAWs do this.
- **The source track as stems (PRD D2).** Load the reference track's elements as separate, editable tracks with their own MIDI.
- **Remix pipeline (PRD D3).** Source song → stems → MIDI → recreation. Depends on the stem-separation and transcription findings in the research report.
- **Gear list (PRD D4).** Decide which plugins or open-source engines to adopt, port or reimplement, from the research report's recommendations.

## Ideas

- Save and load a song as JSON, so an edited arrangement survives a reload.
- A keyboard-driven pattern editor, so steps can be changed without the sliders.
- Per-track sidechain sources, so more than the kick can duck a track.
- A reference-analysis script that prints band energies and onset times for any WAV, so the comparison in item 1 is repeatable.
- Export stems (one WAV per track), not just the mixed song.
