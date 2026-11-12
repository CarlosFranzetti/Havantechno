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

## 3. 15:23 (20:23): built, and what changed from the plan while testing on synthetic audio

Files: `app/engine/importer.js` (new), `app/engine/host.js`, `app/engine/project.js`, `app/engine/songdoc.js`,
`app/engine/selfcheck.js` (section 10), `tools/importer-check.js` (new), the Host and Project sections of
`app/CONTRACT.md`.

Changes found by testing (`tools/importer-check.js` Node mode, synthetic kick/snare/hat loops and a 303-like saw line
with exponential glides, all with known truth):
- Onset timing: the refine window first ended before the hit (flux frames were reported at the frame centre while the
  frame started at f*hop); flux frames are now centred on f*hop with zeros before the start, and the refine looks
  0.75 frame before and 1 frame after. Onset error on the synthetic hits: 0.0 to 0.3 ms.
- A kick's pitch sweep made a second flux peak 30 to 40 ms after the hit: a candidate now needs the level (or the
  level of the first difference, which a hat over a kick tail raises and a sweep does not) to rise by 1.3x (1.6x).
- Tempo: the fold alone left 0.03 BPM errors (126.03 for 126); tempo and phase are now a least-squares fit of the
  refined onset times on even sixteenths (swing moves the odd ones), three passes, then integer snapping when the
  integer's fit residual is within 1.15x. The prior is one octave wide (half an octave read 174 as 116, a 2/3 error).
- Beat phase: the fold's peak landed on off-beat hats; the beat is now the sixteenth of the four whose hits carry the
  most low-frequency (< 150 Hz) energy. Downbeat: low-band minus half the mid-band per beat of four; when two beats
  read within 0.1, the one the music starts on.
- Bars: a trailing part bar counts only when longer than 0.3 bar (a tail made a ninth, empty bar that stopped folding);
  fold ignores empty bars at the end.
- Known and kept: a 174 BPM break reads 87 (half tempo). A len-1 slide target after a slow glide (time constant
  20 ms) can read a semitone low because YIN's 46 ms window straddles the glide.

Node results (`node tools/importer-check.js`, OK 20 of 20): tempo exact at 120, 126, 93.5, 137, 100 and 128 BPM with
offsets 0, 0.05, 0.31, 1.1 and 2.0 s, offset error 0.1 ms; swing 0.6 at 124 BPM 128 of 128 hat steps; a syncopated
loop 80 of 80 steps, 0 extra; 303-like line (fast glide) 36 of 36 notes; BS.1770-4: -20.00 LUFS for a 997 Hz sine at
-20 dBFS on two channels (the standard's check), K-weighting coefficients at 48 kHz equal to the standard's.

Speed (Node, one core): tempo on 30 s of audio about 0.3 s; `Analysis.report.stem` on 15 s of a drums stem 11 s
(three bands), on a bass stem 3.7 s. So `host.analyze` reads the loudest 30 s of each stem for the classifier
(`maxSeconds`) and the whole stem for the patterns; a four-stem import costs about a minute of classification.

## 4. Request to D2 (index.html, owned by D2)

`host.analyze` needs the analysis scripts and the Importer in the page. Please add, after `engine/project.js`:

```html
<script src="analysis/dsp.js"></script>
<script src="analysis/features.js"></script>
<script src="analysis/decide.js"></script>
<script src="analysis/drumlib.js"></script>
<script src="analysis/report.js"></script>
<script src="engine/importer.js"></script>
```
(Order among the analysis files is fixed: dsp, features, decide, drumlib, report. `importer.js` needs none of them,
but `host.analyze` checks for both at call time.) Until then my harness (`tools/importer-check.js --truth`) serves its
own page with these tags.
