# D1 log: engine (reference, A/B, level match, Importer, Project.importTrack)

Dubplate Crew, 11 November 2026. Times are Eastern Time (EST) with UTC in parentheses.

## 1. 14:55 (19:55): read

Read CLAUDE.md, BRIEF.md, app/CONTRACT.md (Host, Project, Sampler), the Lab Crew REPORT, host.js, project.js,
songdoc.js, sequencer.js (scheduling, chase, render), song.js (build), app/analysis/report.js and decide.js,
tools/analyze.js, tools/analysis-truth.js, selfcheck.js (fakes).

Facts that shape the design:
- `Sequencer.render` starts bar `from` at t0 = 0.05 s of the rendered buffer, and the 303 gate is `len - 0.5` steps.
- `seq.out` (a gain after the master chain) connects to `ctx.destination`; nothing else reaches the destination.
- `tick` handles a loop wrap with `seq.chase(step, seq._next)`, `jump` while playing with `seq.chase(step, seq._next)`;
  `play` sets `seq._next` and emits 'play' before scheduling; `pause` emits 'stop'. `seq.chase` is read through the
  property, so wrapping it per instance sees every discontinuity of the playhead.
- `SongDoc.save/load` clone unknown top-level keys, so `doc.reference` and `doc.analysis` survive; `normAudio` keeps
  only known audio keys (fine: nothing new goes there).
- `app/index.html` does not load `app/analysis/`. `host.analyze` needs `Analysis` (dsp, features, decide, drumlib,
  report) and `Importer`. D2 owns index.html: tags requested in section 9.

## 2. 15:05 (20:05): design decisions (before code)

**Reference player (host.js).** Graph on a live context: `seq.out -> abSong -> destination` (the Host re-routes
`seq.out` after each rebuild: `disconnect()`, reconnect the analyser, connect `abSong`) and
`AudioBufferSourceNode -> srcGain (4 ms fades) -> refGain (doc.reference.gain) -> abRef -> destination`. The reference
never enters the master chain, and `host.render` builds its own sequencer on an OfflineAudioContext, so an export can
never contain it. Sync: reference time at song step s is `offset + s * stepSec` (no swing; the reference is a
continuous recording). Hooks per sequencer instance: 'play' starts the source at `seq._next` for `seq._step`; a wrapped
`seq.chase(step, t)` (loop wrap, jump while playing, loopAll wrap) schedules the old source's 4 ms fade-out and the new
source's start at the same audio time t; 'stop' (pause, stop, rewind, end of song) fades it out. A bpm change while
playing re-seeks at the next unscheduled step. A position before the file starts the source late; past its end, none.
**A/B** ramps `abSong` and `abRef` linearly over 10 ms (cancel, set the current value, ramp), so the switch has no
step; the reference runs whenever the transport runs (gain 0 while 'song' is heard), so switching is instant and does
not touch the playhead. `host.ab('reference')` without a loaded reference stays on 'song' (returns 'song').
**Level match** renders the song (or one section, or a bar span) with `host.render`, measures the rendered span from
t0 = 0.05 s, and the same span of the reference (`offset + bar * barSec`), clipped to where both exist. Measure:
ITU-R BS.1770-4 integrated loudness (K-weighting from the standard's two biquads, recomputed for the sample rate as
libebur128 does; 400 ms blocks, 75 % overlap; absolute gate -70 LUFS, relative gate -10 LU). `gain = 10^(dB/20)`,
stored in `doc.reference.gain`, one undo step. Result names the measure.

**Importer (importer.js, pure: runs in Node and the page).** Inputs: an AudioBuffer, or `{L, R, sr}`, or
`{data, sampleRate}`; mixed to mono.
- *Tempo*: spectral-flux onset envelope (log magnitude, 2048-point Hann, hop 512), mean removed; autocorrelation over
  60-200 BPM with harmonic support (lags L, 2L, 4L) and a log-normal prior around 120 BPM (half an octave), then
  refined by folding the envelope on the beat period over the whole file (96 phase bins; the sharpest fold wins), in
  0.01 then 0.001 BPM steps. Snapped to the integer when it is within 0.05 BPM and the integer's fold scores at least
  98 % of the best. Phase from the fold, then refined to ms by the median residual of refined onset times against the
  sixteenth grid. Downbeat: the beat of four with the most low-band (< 150 Hz) onset energy; offset is that downbeat's
  time moved to the first bar at or after the music starts. Confidence: fold peak over fold mean, mapped to 0..1, and a
  separate `downbeatConfidence`.
- *Steps*: spectral flux (1024, hop 256) peaks over an adaptive threshold, each refined in time on the rectified
  signal (first crossing of a quarter of the local peak), quantised to the nearest sixteenth from `offset`; a hit more
  than 0.4 of a step from its grid line is dropped and counted. Velocity: the hit's peak over the loudest hit's peak.
- *Notes*: decimate to about 11 kHz, YIN (W 512 at 11 kHz, threshold 0.15) at 0.3 and 0.7 of each step, rms per step,
  flux onsets per step. A note starts on a voiced step with an onset, after an unvoiced step, or on a pitch change of
  half a semitone or more; a pitch change with no onset is a slide (the previous cell gets `slide: true`). `len` counts
  the following steps that stay voiced on the same pitch with no onset. Accent: a note's level 1.4 times the median.
- *Build*: one track per element, its pattern from steps (drums) or notes (pitched), a sampler track for a sample
  element (the stem's audio, start and end set to its loudest isolated hit) or for an element with no recreation
  (the stem played from bar 1). The analysis's decisions and confidences ride on `track.analysis`. Patterns are folded
  to the shortest repeat of 1, 2, 4, 8 or 16 bars when at least 90 % of the bars agree; otherwise kept whole. One
  section spans the file.
- *Loudness*: `Importer.loudness(buffer, {start, end})` (BS.1770-4), shared with matchLevel.
