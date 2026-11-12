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

## 5. 20:20 (01:20, 12 November): after the usage-limit stop; the coordinator's message and ruling

Received from the coordinator (quoted in short): "you were stopped by the account's usage limit mid-edit ... node
app/engine/selfcheck.js FAILED 1 of 445, exit 1: your own row 'steps: velocity from the hit level (kick and snare
together loudest) (kick 0.6, hat 0.3)'. Fix the code or the row, whichever is wrong ... index.html already loads the
analysis scripts before host.js and importer.js after project.js, so you need no tag. One request from D2, now a
ruling: Project.importTrack takes opts.signal (an AbortSignal); check it between stages and immediately before the
save; when aborted, reject with an error whose name is 'AbortError', save nothing, and leave the host's current
document as it was ... stop swallowing a throw from onProgress silently ... HavantechnoShell.separate(path, {model})
-> {stems:[{name, path}], model, log, folder, cached?}; ... honour the signal by calling shell.cancelSeparate()."

- **The velocity row was wrong, not the code.** It asked for the kick-and-snare step to read exactly 1.0; the noise in
  the synthetic snare differs per hit, so only the loudest of the eight bars reads 1.0 and the others 0.95. The row
  now asks for that step at 0.9 or more and above the kick alone. Section 4 (the tag request) is withdrawn: D2 added
  the tags.
- **Abort (ruling).** `Project.importTrack` takes `signal`; checked after decode, after separation, before analysis,
  after analysis, before the level match and immediately before the save; `host.analyze` also checks it at each
  progress step before it edits. Aborted: rejects with `name === 'AbortError'`, nothing saved; during a separation
  `shell.cancelSeparate()` is called from the signal's abort event. The host gets back the document it had (the
  document is serialised before the import and reloaded on any rejection, abort or error). A throw from `onProgress`
  is logged once (`console.warn`) and ignored, in both `Project.importTrack` and `host.analyze`. Selfcheck rows added:
  cancel during separation (cancelSeparate called, AbortError, no save, previous document back), a throwing
  onProgress, cancel just before the save.
- **Master-chain latency (found while measuring).** Every engine render's first audible sample is at 69.3 ms for a bar
  scheduled at 50 ms: the master chain delays the song by 19.3 ms in Chromium (two DynamicsCompressorNodes with
  look-ahead). The reference played at the scheduled time would run 19 ms ahead of the song in A/B. `host.start` now
  measures the latency once per context (a click through a fresh `Processors.master` on an OfflineAudioContext, first
  sample over 1 % of the peak) and the reference starts that much later; `host.reference().latency` reports it.
  Measured in the browser by the truth harness's renders; the live measurement itself runs only on `host.start` in a
  page and is not exercised by a Node check (the fake context has no OfflineAudioContext, so latency stays 0 there).

## 6. 20:50 (01:50, 12 November): measurements against truth, and what changed to get them

How: `node tools/importer-check.js --truth` serves the repo with its own page (engine, analysis, importer scripts),
opens it in headless Chromium (Playwright, `chromium.launch()`), renders SongDocs with `Sequencer.render` (44.1 kHz,
the master chain on, bar 1 scheduled at 0.05 s, AudioWorklet classics), runs the Importer in the page and scores
against the documents' cells. Renders and `results.json` go to `tools/out/importer-truth/` (ignored). Offsets are
scored against the audible start of bar 1 (first sample over 1 % of the peak: 69.3 to 69.4 ms) because of the latency
above. "Read grid" = the Importer's own tempo and offset; "true grid" = the known tempo and the audible start.

First run (before the changes below): tempo right on every drum case, but the offset two beats or half a beat off on
both kits (wrong downbeat, wrong beat sixteenth), so read-grid step recall was 0.57 to 0.94 per voice while the
true-grid recall was 1.00. Changes:
- Downbeat read at the grid's beat times (low band weighted by its share of the low+mid energy, 80 ms after each beat),
  not on detected hits: a 909 kick a sixteenth after another kick was not detected as a new hit and its beat scored 0.
- Beat sixteenth and downbeat both carry a **start prior**: the music is taken to start on beat 1 of bar 1 unless
  another sixteenth reads 1.6 times more like a beat, or another beat leads by 0.5 in the kick score. On the 909 kit
  and the song mix the kick score alone picked beat 3 or 4 (bass and clap energy); the prior decided, and
  `downbeatConfidence` is 0 in that case so the report says it was not measured. A file that opens on a pickup will get
  bar 1 wrong: stated in the analysis's `unverified` when the downbeat confidence is under 0.3.
- Onset level checks use 25 ms windows (a 12 ms window is shorter than one period of a 65 Hz note and its first
  difference spikes once per saw period, which split held bass notes into several); a section ends at the last bar a
  read pattern plays in (a render's 1 s tail had made a 17th bar).

Results (final run, 01:50 UTC; selfcheck and every check green, section 7):

| Case | Tempo read | Offset vs audible bar 1 | Steps / notes (read grid) |
|---|---|---|---|
| 909 kit, 126 BPM, 8 bars, accents | 126.000 | +2.0 ms | bd909 40/40, sd909 22/24, ch909 72/72, cp909 16/16; 0 extra; whole mix 0.82 recall 0.98 precision |
| 808 kit, 98 BPM, swing 0.4, syncopated | 98.000 | +3.4 ms | bd808 40/40, sd808 24/24, ch808 128/128, cb808 24/24; 0 extra; whole mix 1.00 / 1.00 |
| tb303 line alone, 128 BPM | 64 (half): FAILS | n/a | true grid: notes 72/72, len 64/72, slides 12/20 (0 false), accents 60/72 |
| modeld line alone, 122 BPM | 122.000 | wrong bar | true grid: notes 70/72, len 42/72, slides 20/20 but 27 false, accents 50/72 |
| song import, 16 bars, 124 BPM, stems drums/bass/other | 124.000 | +4.2 ms | see below |

Velocity: median error of the read velocity against the truth (both scaled to their loudest) 0 to 0.2 per voice.
Tempo from a bass line alone is not reliable (a 303 line read at half tempo, a modeld line with the wrong bar): the
import reads the tempo from the drums stem (else the mix), which is how these numbers were meant to be used.

Song import (`Project.importTrack` in the page with the mix as the file and three solo-group renders as stems, fake
shell saving): 34.5 s; saved once; reference set with offset 0.0713 s; level match -9.78 LUFS song against -11.84
reference, gain +2.06 dB (BS.1770-4, bars 0 to 16, 31 s). Built: kick bd909 (suggested bd909, high), snare cp909
(suggested cp909, low), hats ma808 (truth ch909; suggested ma808, medium), bass modeld (truth tb303; suggested modeld,
low), other modeld (truth fm; suggested modeld, low); one section of 16 bars. Patterns against truth: kick steps
recall 1.00 precision 1.00 (folded to 1 bar); snare band recall 1.00 precision 0.22 (the 150 Hz to 5 kHz band of the
drums stem also holds the kick's click and the hats: a band is not a separation); hats band 1.00 / 0.71; bass notes
144/144, slides 32/40, 0 extra (folded to 2 bars); other 16/16. So: tempo, offset and the patterns hold on the
engine's own material; the recreation types for the pitched parts are wrong in 2 of 2 (the Lab Crew's rules, not
changed here: `app/analysis/` is not mine) and the hat voice is the wrong machine.

## 7. Checks run at 20:52 (01:52 UTC, 12 November), each directly, exit codes read

`node app/engine/selfcheck.js` OK 448, exit 0; `node tools/importer-check.js` OK 20, exit 0; synths 169, drums 342,
classics 110, panels 116, faces 2495, system-editor 97, step-view 72, widgets 157, processors 92, analysis 47, all
exit 0; `node tools/browser-check.js` PASS 26, exit 0; `node tools/importer-check.js --truth` exit 0 (measurements,
no pass line).

## 8. Not verified

- Nothing here has been run on a real record or on separated stems; every number is the engine's own renders.
- The live reference player (sync on loop wrap and jump, the latency compensation, the 10 ms A/B ramps) is checked
  on the fake context only (schedule calls, node graph), not listened to or measured in a running AudioContext.
- A tempo change inside a track, a non-4/4 bar, a pickup before bar 1 and a 174 BPM break (reads 87) are not handled.
- Juno and other poly parts are read as a mono line (said in the track's `analysis.unverified`).
