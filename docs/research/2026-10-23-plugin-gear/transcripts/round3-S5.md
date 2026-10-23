# S5: round 3 — answers, revisions, partner comments (stems and transcription)
Agent model: Sonnet. Date: 2026-10-23.

What I read: `round2-O1.md` and `round2-O2.md` in full (O2's long file via grep for every "S5" and every question addressed to me, then the question and decision sections in full), my own round-1 file, and H5's round-1 file. I also read `prd.md`, `future.md`, and the pattern and melody notation in `olde Havantechno dub studio/song.js` (`studio/` is a symlink to that folder) so the bundle below maps onto what the sequencer accepts.

Search budget this round: 4 searches, all used (librosa segmentation, librosa pyin, LarsNet, madmom downbeat output). I also fetched pages already named in round 1 or linked from fetched pages. Marks: `(verified: URL, fetched)` means I read the page this round or in round 1; `(verified: URL, search text)` means the search summary stated it and I did not read the page; `(unverified)` means no source showed it. I ran none of the pipeline below. It is a design built from documented tools and from O1's measurement method. Nothing here is a result.

The questions addressed to me: O1 Q1 and Q13; O2 Q2, Q13 and Q14 (O2's Q2 is the refined round-1 question about output formats). I answer them by those numbers. The question about the form boundaries is O1 Q13.

---

## 1. Answers

### O1 Q1: is a neural separator needed for the low end at all?

**Short answer: not for this track, and probably not for any track whose kick is a sample or a sample-exact synth hit on a known grid. It is still needed in the general case.**

Reasoning, using O1's numbers (M0–M4 in `round2-O1.md`; I did not re-measure them):

- The grid is sample-exact: at 126 BPM and 44.1 kHz one beat is 21,000 samples, and the kick onsets sit at a constant offset from the grid with no drift (O1 M0).
- The kick is phase-locked to that grid: averaging beats gives a correlation of 0.94 to 0.96 with the average (O1 M1). The sub drone is not: its coherence ratio is 0.03 (O1 M4). The kick sits at 50 to 260 Hz and the sub at 30 to 40 Hz.
- So the split is epoch folding, not source separation. Fold the low-passed signal at the beat period over the beats where the kick fires. The mean at each phase is the kick (coherent part). Subtract that mean from each beat. What is left is the incoherent part: the sub drone plus whatever else is free-running. This is a few lines of numpy and has no model, no licence and no download.
- I do not claim a neural model could not make this split. I found no source describing how Demucs or the other models label a kick tail versus a sub tone, so how a 4-stem model would divide this low-frequency energy is unknown to me. What the Demucs README does say is that the default stems are drums, bass, vocals and other (verified: https://github.com/facebookresearch/demucs, fetched). Folding needs no such assumption.

Where folding breaks (so the neural route stays in the pipeline for other songs):

- the kick is not identical from hit to hit (live drums, variable processing, a long reverb tail that overlaps the next hit);
- the tempo drifts, or the grid is not sample-exact after a lossy decode;
- other low-frequency content is also phase-locked to the grid (a bass note that always lands on the kick would be folded into the "kick").

Check for that last case: the folded residual must still contain the bass notes on steps 3, 7, 10 and 14, because the mid bass is also grid-locked (spec). In this pipeline the bass is taken from the Demucs bass stem, and the sub from the folded residual of the full mix below about 50 Hz. A mid bass that always lands on a fixed step would fold into the template too; the template is therefore built only from beats where the bass does not play (the "bass-free beats" test, step 3 of the pipeline).

**Which drum-split tool keeps a kick's 50 to 60 Hz tail in the kick stem?** Not found. What I can source:

- LarsNet separates a stereo drum mixture into five stems: kick, snare, toms, hi-hat, cymbals; it was trained on StemGMD, and the LARS plug-in README gives the weights licence as CC BY-NC 4.0 (non-commercial) (verified: https://github.com/EdoardoMor/LARS, search text; https://arxiv.org/html/2312.09663v1, search text). Nothing in the results says how it treats the sub-100 Hz tail of a kick.
- MDX23C DrumSep: the drum2midi README lists it (and LarsNet) as the separator whose job is velocity and articulation, and says the separator "does not improve note detection" (verified: https://github.com/mykolad/drum2midi, fetched). It documents no per-band result.
- So the only way to answer is a test: compare the 20 to 100 Hz energy of a kick stem with that of the drum stem it came from. I did not run it. This is a candidate measurement, listed under Still open.

**Lowest pitch each transcriber is documented to track (root is about 31 to 35 Hz):**

| Tool | Documented range | Covers C#1 (34.65 Hz) and B0 (30.9 Hz)? | Source |
|---|---|---|---|
| Basic Pitch | Base frequency 27.5 Hz (A0, MIDI 21), 88 semitones to about 4186 Hz, 1 note bin per semitone, 3 contour bins per semitone | Yes in range (MIDI 25 and 23). Accuracy at those pitches is not documented. | (verified: https://raw.githubusercontent.com/spotify/basic-pitch/main/basic_pitch/constants.py, fetched) |
| librosa pyin | `fmin` is required and keyword-only; the docs recommend C2 (about 65 Hz) "though lower values may be feasible" | Only if `fmin` is set at or below about 30 Hz. Whether it tracks well there is not documented. | (verified: https://librosa.org/doc/main/generated/librosa.pyin.html, search text) |
| Omnizart | Not found | Not found | not found |
| MT3 | Not found | Not found | not found |

Two practical risks that my own reasoning adds (unverified, not tested):

- Basic Pitch resamples to 22,050 Hz and works in 2 s windows with a hop of 256 samples (about 11.6 ms) (verified: constants.py above). A 34 Hz tone has a period of 29 ms, so a window of a few periods is very short for pitch resolution at that frequency. Whether the model copes is unknown.
- The kick's glide from about 190 Hz to 52 Hz passes through the same range and will be read as false notes in the bass stem. This is why the folded residual (kick removed) is a better input for the sub pitch than the Demucs bass stem. O1 got 34.47 Hz in every section from long-window carriers (M4); that method is simple enough that I would use it for the sub and not a note transcriber.

### O1 Q13: section detection

I found tools in librosa and none in the others.

- **librosa:** `librosa.segment.agglomerative` clusters a feature matrix such as chroma with a temporal constraint into `k` contiguous segments and returns the left-boundary frame numbers (it always includes 0). It needs `k` given. `librosa.segment.recurrence_matrix` builds a self-similarity matrix, and `librosa.segment.subsegment` splits intervals further. The search text did not show agglomerative being fed a recurrence matrix; its documented input is a feature matrix (verified: https://librosa.org/doc/main/generated/librosa.segment.agglomerative.html, search text; https://librosa.org/doc/dev/api/segment.html, search text).
- **madmom:** its README feature list (onset, beat and downbeat, tempo, chord, key, piano transcription) has no structure segmentation (verified: https://github.com/CPJKU/madmom, fetched).
- **Essentia.js:** not found. I did not find a segmentation algorithm in anything I read.

How I would do it here. This is a design, untested:

1. On the sample-exact bar grid, compute one feature vector per bar from the folded or stem signals: band energies in a few bands, onset count per element, and chroma. The element presence per bar is the strongest cue in this genre, because the spec's form is defined by which elements are in (kick only, then hats, then stabs, then the break without the full kick).
2. Run `agglomerative` with `k` = 9 (the studio has nine sections) or a larger `k`, then merge. Alternatively compute a checkerboard novelty curve over the bar-level self-similarity matrix (recalled, not verified in a source) and peak-pick.
3. Snap boundaries to a multiple of 8 bars (phrase length). That assumption is mine. Check it against the spec: with bar = 1.9048 s and my T0 of 0.568 s from O1, bar 40 is at 76.8 s (spec main 1:16: matches), bar 136 at 259.6 s (spec drop 4:20: matches), bar 184 at 351.1 s (spec outro 5:52: about 1 s off). But bar 24 is at 46.3 s (spec build 0:44: 2.3 s off, more than a bar) and bar 104 at 198.7 s (spec break 3:16: 2.7 s off). So either the reference's sections are not all on 8-bar boundaries or the spec's times are rough. A segmenter would settle this; nobody has run one. Open item.

### O2 Q2: exact output formats

First the tool table, then the answer to "which tool places notes on the bar grid".

| Tool | File or data type | Time unit | Velocity | Pitch bend | CC | Chords | Tempo map | Downbeats | Source |
|---|---|---|---|---|---|---|---|---|---|
| Demucs (CLI) | WAV (int16 default; `--float32`; `--int24`) or MP3; one file per stem; input any format torchaudio reads | Audio, 44.1 kHz stereo | n/a | n/a | n/a | n/a | none | none | (verified: https://github.com/facebookresearch/demucs, fetched) |
| demucs-web | Four `{left, right}` Float32Array pairs (drums, bass, other, vocals) from `separate(left, right)`; input must be 44.1 kHz stereo | Audio samples | n/a | n/a | n/a | n/a | none | none | (verified: https://github.com/timcsy/demucs-web, fetched) |
| Basic Pitch (Python) | MIDI file (pretty_midi); optional note-events CSV; optional raw model outputs NPZ; `predict()` returns `model_output`, `midi_data`, `note_events` | Note events in seconds: `(start_s, end_s, midi_pitch, amplitude, pitch_bends)`. MIDI ticks follow the file's declared tempo, default `midi_tempo` = 120. | `round(amplitude × 127)`, so 7-bit, derived from the model's confidence, not from loudness | Yes. Per-note list of ints; units of 1/3 semitone, scaled to MIDI ticks, clipped to −8192..8191, comment says up to ±2 semitones; spread evenly over the note; `include_pitch_bends` default True; `multiple_pitch_bends` default False (bends of overlapping notes are dropped) | none | none (note events only) | one constant tempo, default 120, set by `midi_tempo`; no tempo changes | none | (verified: https://raw.githubusercontent.com/spotify/basic-pitch/main/basic_pitch/note_creation.py, fetched; https://github.com/spotify/basic-pitch, fetched) |
| basic-pitch-ts | Note events through `outputToNotesPoly`, `noteFramesToTime`, `addPitchBendsToNoteEvents`; frames, onsets and contours as intermediate outputs. Whether it also writes a MIDI file is not stated on the fetched page. | Not stated (the page does not say seconds or frames) | Not stated | Yes, via `addPitchBendsToNoteEvents` | not stated | not stated | not stated | none | (verified: https://github.com/spotify/basic-pitch-ts, fetched) |
| adtof_plus_drum_transcription | One MIDI file with the drum parts combined; classes kick, snare, hi-hat, cymbals, toms; hi-hat open vs closed by sustain | Not stated | Estimated: audio energy mapped with per-drum curves (range and resolution not stated) | none stated | none stated | n/a | Not stated | Not stated | (verified: https://github.com/xavriley/adtof_plus_drum_transcription, fetched) |
| drum2midi | Standard MIDI file, GM numbers, PPQ 960, all on channel 10. Kick 36, snare 38, closed hat 42, pedal hat 44, open hat 46, toms 43/47/50, crash 49, ride 51. Open/closed/pedal are separate notes, not CC4. | Ticks, PPQ 960 | MIDI velocity exists (kick/snare from a formula, hats and cymbals from a learned model); range and resolution not shown in what I read | n/a | none (hats are notes, not CC) | n/a | The excerpt does not say whether a tempo event is written; librosa and pretty_midi are named for "tempo and export" | Not mentioned | (verified: https://github.com/mykolad/drum2midi, fetched; only characters 0 to 100000 and the section from offset 100000 were read, the rest not) |
| Omnizart | Output formats not specified on the page | not specified | not specified | not specified | not specified | Chord module exists; output not specified | Beat module exists; output not specified | Not specified | (verified: https://github.com/Music-and-Culture-Technology-Lab/omnizart, fetched) |
| librosa `beat_track` | tempo in BPM and beat frames (convert with `frames_to_time`) | Frames, then seconds | n/a | n/a | n/a | n/a | One tempo estimate, no changes | None; it does not find downbeats | (verified: https://librosa.org/doc/main/generated/librosa.beat.beat_track.html, search text) |
| madmom DBN downbeat tracker | Array of beat time and position in bar (position counts from 1); RNN activations at 100 fps | Seconds | n/a | n/a | n/a | n/a | beat times imply a tempo curve | Yes: position 1 is the downbeat | (verified: https://madmom.readthedocs.io/en/v0.16/modules/features/downbeats.html, search text) |
| madmom chords | Deep chroma + CRF, major and minor chords only | Not seen | n/a | n/a | n/a | Major/minor | n/a | n/a | (verified: https://madmom.readthedocs.io/en/v0.16/modules/features/chords.html, search text) |
| web-audio-beat-detector | `analyze(AudioBuffer)` gives a BPM number; `guess()` gives BPM plus the offset of the first beat | BPM, seconds | n/a | n/a | n/a | n/a | One tempo | No downbeat, only first-beat offset | (verified: https://cdn.jsdelivr.net/npm/web-audio-beat-detector@8.2.37/README.md, search text) |

Observations that matter for the bundle:

- No tool writes a bar grid. Every note-writing tool outputs seconds (or ticks at a declared tempo). Basic Pitch writes ticks at 120 BPM unless `midi_tempo` is changed, so the .mid bar lines will not match a 126 BPM song; use seconds and quantise yourself, or pass `midi_tempo=126`.
- **Which tool places imported notes on our bar grid with the first downbeat at 0.58 s?** None does. The step index is `round((t − t0) / (60 / bpm / 4))` with `bpm` and `t0` fitted by the pipeline from onset times (O1 fitted 126.0 BPM and T0 0.568 s; the spec has 0.58 s). The tempo needs a beat tracker only for a song whose tempo is unknown: librosa `beat_track` for tempo and beats, madmom (private use only, models are CC BY-NC-SA) or an unverified alternative for downbeats. For Guidance the clap on beats 2 and 4 plus the kick pattern fixes the downbeat phase, so no downbeat tracker is needed there.
- I found "Beat This!" (beat and downbeat tracking, ONNX, WebGPU) as a Hugging Face model title only. I did not read anything about its licence, accuracy or file size (verified title only: https://huggingface.co/musetric/beat-this-onnx, search text).
- Basic Pitch's default `min_note_length` is 11 frames at 256/22050 s per frame, which is 127.7 ms. A 16th note at 126 BPM is 119.0 ms. Both numbers are from fetched pages (note_creation.py and constants.py) and the multiplication is mine. So unless the minimum is lowered, 16th-note stabs and pad hits shorter than 128 ms are dropped.
- Basic Pitch needs `onset_thresh` and `frame_thresh` as arguments at the function level; I did not see the CLI defaults. Unverified.

### O2 Q13: can demucs-web load a user-picked file, and does the WASM path still need COOP/COEP?

- **Local model file: yes for a path or an ArrayBuffer, not shown for a File.** The signature is `loadModel(pathOrBuffer?: string | ArrayBuffer): Promise<void>`, and the README shows a URL, a local path (`./htdemucs_embedded.onnx`) and an ArrayBuffer from `fetch`. It does not mention `File` objects. A picked file would be turned into an ArrayBuffer first (`await file.arrayBuffer()` is standard browser API, recalled, not in the README). The default URL is a Hugging Face file, `https://huggingface.co/timcsy/demucs-web-onnx/resolve/main/htdemucs_embedded.onnx`, so under C2 the model has to be supplied by the user, not fetched by default (verified: https://github.com/timcsy/demucs-web, fetched).
- **COOP/COEP:** the README ties the two headers to SharedArrayBuffer ("ONNX Runtime Web needs SharedArrayBuffer", my translation of the Chinese) and does not say whether the non-threaded WASM path avoids them. The example sets `ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4`. The single-thread behaviour is not described. The EXPERIENCE_REPORT.md says only that the dev server `server.py` sends COOP/COEP (verified: https://github.com/timcsy/demucs-web/blob/main/EXPERIENCE_REPORT.md, fetched). **So whether a single-thread WASM run works without the headers is not found in these sources.** I recall that ONNX Runtime Web drops to one thread when the page is not cross-origin isolated; I did not see that in any source I read (unverified).
- **A C2 problem the README does not mention:** the page passes `ort` (ONNX Runtime Web) in as an argument, so the page must supply ONNX Runtime Web and its `.wasm` files. Where those files come from (CDN or vendored) is not shown. Under C2 they would have to be vendored. Not found in the sources.
- **Correction to my round 1 (see section 2):** the experience report says WebGPU has limited Conv1d support in ONNX Runtime Web, so the library currently falls back to WASM, the FFT runs on the CPU, and there is no Web Worker, so inference runs on the page's main thread.

### O2 Q14 (with H4): do the drum tools give open and closed hats as separate notes, with durations?

- **drum2midi: yes as separate notes; durations and choke not documented.** Closed is GM 42, pedal 44, open 46, written "as separate notes rather than CC4". The README does not describe note-off or note length, and does not mention choke handling (verified: https://github.com/mykolad/drum2midi, fetched).
- **adtof_plus_drum_transcription: open versus closed is distinguished "based on sustain patterns", but note numbers and durations are not stated** (verified: https://github.com/xavriley/adtof_plus_drum_transcription, fetched).
- **Can a choke rule be inferred from the reference using these tools?** Not from their output. The README of drum2midi gives a classification table in which open hats were correct 156 of 238 times, closed 1495 of 1747, pedal 19 of 230 (the excerpt did not make clear which system that table scores), and it states that decay time "does not reliably separate open from closed": the open/closed median ratio was 0.83× with a 95% interval of 0.66 to 1.38 (verified: https://github.com/mykolad/drum2midi, fetched). In this reference the open hats sit on the off-beat 8ths (steps 2, 6, 10, 14) and the closed hats on the 16th pickups (spec), so position and spectrum separate them better than duration. A choke relation (does the closed hat cut the open one?) would be read from the drums stem as a level drop in the open hat's band at the closed-hat step. That is a measurement I did not run.

---

## 2. Revisions to my round 1

### 2a. Corrections

1. **demucs-web is WASM in practice, not WebGPU first.** Round 1 said "WebGPU first, WASM fallback" (the README's design) and put WebGPU in the feasibility section as if it worked. The EXPERIENCE_REPORT.md says the WebGPU backend has limited Conv1d support so it currently falls back to WASM, the FFT stays on the CPU, and the speed is "about 0.1 to 0.3x real-time". That phrase is ambiguous. If it means processing runs at 0.1 to 0.3 times playback speed, a 388 s track takes about 22 to 65 minutes (388 / 0.3 and 388 / 0.1). If it means the time taken is 0.1 to 0.3 times the duration, it takes about 39 to 116 seconds. The more natural reading is the first. Either way the model is a 172 MB download, processes 343,980-sample segments with 25% overlap, and has no Web Worker (verified: https://github.com/timcsy/demucs-web/blob/main/EXPERIENCE_REPORT.md, fetched). This strengthens my recommendation to run Demucs offline first.
2. **"No model separates the sub from the kick" stays true, but the conclusion I drew from it was too pessimistic.** Round 1 pointed to a drum-kit split (MDX23C DrumSep) as the likely route. After O1's measurements, epoch folding on the sample-exact grid does it with no model (section 1, O1 Q1). I now rank folding first for this track and the drum-kit split as the general-case fallback.
3. **Basic Pitch details I missed in round 1:** velocity is `amplitude × 127`, bends are limited to ±2 semitones, the MIDI tempo default is 120, the default minimum note length is 11 frames (127.7 ms), the program is General MIDI Electric Piano 1, and the audio range starts at A0 (verified: note_creation.py and constants.py, fetched).
4. **Hat classification:** round 1 said ADTOF distinguishes open and closed hats and left it there. The note numbers are only documented for drum2midi (46, 42, 44), and the author's own table shows open-hat recall of about 66% (156 of 238, my division) and pedal hat recall of about 8% (19 of 230).
5. **LarsNet** is a five-stem drum splitter (kick, snare, toms, hi-hat, cymbals), weights CC BY-NC 4.0 per the LARS plug-in README (search text above). Round 1 only mentioned it by name through drum2midi.
6. **pyin** was "recalled" in round 1. It is now documented in search text (see the table above): `fmin` required, recommended C2.
7. Round 1 listed Essentia.js's key and beat functions as unconfirmed. They still are. I did not find the Essentia.js algorithm list.

### 2b. The concrete offline pipeline (Python) and the bundle

**Environment.** Python 3.10 to 3.12 (drum2midi supports 3.10 to 3.13 and says 3.12 is recommended; Basic Pitch supports 3.7 to 3.11 per its README, so use 3.11 to satisfy both). ffmpeg on the path. Demucs: needs about 3 GB of GPU memory at minimum, or runs on CPU at roughly 1.5 times the track length (verified: https://github.com/facebookresearch/demucs, fetched). Basic Pitch with TensorFlow only by default on Python 3.11 or later, ONNX on Windows (verified: https://github.com/spotify/basic-pitch, fetched). Two virtual environments (one for Demucs and librosa, one for ADTOF and drum2midi) is the safest route; I have not tested that these coexist.

**Steps.** Each step names the tool, why it is there and what it writes. Tools I verified are named; steps marked "own code" are small numpy or librosa scripts that I have not written or run.

| # | Step | Tool | Output | Notes |
|---|---|---|---|---|
| 0 | Decode once | ffmpeg to 44.1 kHz stereo float32 WAV | `source.wav` | All later times are relative to sample 0 of this file. Every stem must have the same length; the script should refuse to continue if not (assumption: Demucs output length equals input length; I did not check). |
| 1 | Grid | librosa `beat_track` for a coarse tempo (verified: https://librosa.org/doc/main/generated/librosa.beat.beat_track.html, search text), then own code: fit kick onset times to `t0 + k × 60 / bpm` by least squares; round `bpm` if within a hundredth of an integer | `tempo`: `bpm`, `t0_s`, `beat_samples`, fit residual | O1 got 126.0 BPM, T0 0.568 s, with no drift (M0). The fit residual per bar is reported so a drifting source is flagged and not silently quantised. Downbeat phase: for four-on-the-floor tracks, the beat group where the clap sits on beats 2 and 4; otherwise a downbeat tracker (madmom for private experiments only). |
| 2 | Stems | Demucs `htdemucs` (or `htdemucs_ft`, about 4× slower) with `--float32` | `stems/drums.wav`, `bass.wav`, `other.wav`, `vocals.wav` | 6-stem variant exists; the README calls its piano output weak. |
| 3 | Low-end split | own code: low-pass the source, epoch-fold at the beat period over beats where the kick fires and the bass is silent, subtract the template from every beat | `stems/kick_template.wav` (one hit, about 400 ms), `stems/sub_residual.wav`, plus fitted `pitch_env` of the kick (`f0`, `fT`, `tau_ms`) and the sub carrier per bar | This is O1's method (M1, M4, M6). The pitch-envelope fit uses zero-crossing instantaneous frequency. No model, no licence. |
| 4 | Drums | `adtof_plus_drum_transcription` (MIT wrapper, weights licence unverified) or `drum2midi`, run on `drums.wav` with `input_is_mix` off for the first; and in parallel own code that measures band energy at each grid step (the existing studio analysis) | `drums.mid` (GM) plus per-step onset table | Keep both. The step-energy table is the ground truth for pattern strings; the neural onsets are the cross-check. `--default_threshold` is the ADTOF wrapper's onset threshold (default −inf). |
| 5 | Sub and bass pitch | Sub: long-window FFT peak per bar on `sub_residual.wav` (own code). Mid bass: Basic Pitch on `bass.wav`, or `librosa.pyin` with `fmin` lowered to about 30 Hz | `notes` for the bass track | Basic Pitch needs a lower minimum note length than the 127.7 ms default for 16ths. Kick contamination of `bass.wav` is a risk (section 1). |
| 6 | Harmony and lead | Basic Pitch on `other.wav` (mono down-mix, 22,050 Hz inside the model); stereo width measured separately by per-band L/R correlation at onsets (own code, O1 M7) | `notes.mid`, `notes` for stab, pad, lead | The width cannot come from Basic Pitch because it down-mixes. Pass `midi_tempo` = measured bpm. |
| 7 | Chords and key | own code: group notes by onset step, match pitch-class sets to chord templates (the studio names chords like Bmaj9 and G#m7; madmom's chord module only outputs major and minor); key from chroma profile correlation (recalled, not verified) cross-checked against the sub root per bar | `chords` per bar, `key` | madmom chords: verified as major/minor only (search text). |
| 8 | Sections | librosa `segment.agglomerative` on bar-level features, boundaries snapped to 8 bars and reported with the snap distance | `sections` | Section 1 above. Mismatch with the spec times is flagged, not hidden. |
| 9 | Bundle | own code | folder below | Writes `manifest.json` with versions and parameters of every tool so the run is reproducible. |

**Bundle layout** (a folder the studio imports; names are my proposal):

```
bundle/<name>/
  manifest.json          schema version, tool versions, source file name and sha256, decode settings, all thresholds used
  analysis.json          tempo, key, sections, chords, tracks (below)
  stems/                 drums.wav bass.wav other.wav vocals.wav kick_template.wav sub_residual.wav   (44.1 kHz, float32, same length as source.wav)
  midi/                  notes.mid (pitched tracks, tempo meta = measured bpm) drums.mid (GM, channel 10)
```

`analysis.json` sketch. Times are given both as seconds and as `bar` / `step` / `offset_ms` so the studio can quantise to its 16-step grid and keep the micro-timing:

```
{
  "schema": "havantechno-bundle/0",
  "tempo":   { "bpm": 126.0, "t0_s": 0.568, "beat_samples": 21000, "swing": 0.0, "fit_rms_ms": null },
  "key":     { "name": null, "method": "chroma-profile", "sub_root_hz_by_bar": [] },
  "sections":[ { "name": "intro", "start_bar": 0, "bars": 16, "source": "agglomerative", "snap_bars": 0 } ],
  "chords":  [ { "bar": 0, "name": "Bmaj9", "notes": [59,63,66,70,73] } ],
  "tracks": {
    "kick": { "stem": "stems/kick_template.wav", "pitch_env": { "f0": 264, "fT": 51.2, "tau_ms": 23.9 },
              "onsets": [ { "bar": 0, "step": 0, "vel": 0.9, "offset_ms": -1.2 } ] },
    "hat_open": { "onsets": [ { "bar": 4, "step": 2, "vel": 0.6, "offset_ms": 0.4 } ] },
    "lead": { "notes": [ { "bar": 104, "step": 0, "len_steps": 1, "midi": 66, "vel": 0.7, "bend": [] } ] }
  },
  "patterns": { "kick": { "bars_0_15": "x...x...x...x..." } }
}
```

The numbers in the sketch are O1's measurements for the kick and placeholders elsewhere; the pipeline would fill in the rest.

**How the bundle maps onto what the studio already takes (verified by reading `song.js`):**

- per-step onsets to pattern strings of 16 characters per bar with `x`, `X`, `o`, `.`. Velocity cut-offs are my proposal: at or above 0.8 is `X`, at or above 0.4 is `x`, below that is `o`.
- pitched notes to melody lines of 8 or 16 tokens per bar (`F#4`, `-` for sustain, `.` for rest, as in `LEAD_BREAK`). Notes shorter than one token or off the 8th/16th grid are lost in this notation; `offset_ms` and `len_steps` keep them in the bundle.
- chords to the `progression` list of chord names.
- pitch bends and sub-step timing have no home in the current pattern and melody notation. The instrument event format is `{midi | notes, vel 0..1, dur, accent}` (design spec), so a bend or an offset needs a new field or is dropped. That is a decision for O2 and the engine owner.
- Stems and the .mid cannot be loaded at all today: the PRD lists loading songs and MIDI input as out of scope, and C1 says no audio files. O2's decisions 2, 3 and 5 govern this.

**What could later run in the browser (in order of effort):**

| Step | Browser route | Status |
|---|---|---|
| Parse `analysis.json`; build pattern strings and melody lines | plain JS | trivial |
| Decode a stem | `decodeAudioData` (recalled, not verified) | needs C1 relaxed for user-loaded audio |
| Grid fit, epoch folding, band energy per step, sub carrier | plain Float32Array code; Meyda (MIT) supplies features such as spectral centroid and chroma (verified: https://meyda.js.org/, search text) | reimplementation of O1's numpy method; feasible |
| Tempo / first beat | `web-audio-beat-detector` (verified: README, search text) | tempo only |
| Notes from a loaded stem | `basic-pitch-ts` (Apache 2.0); mono, 22,050 Hz | feasible; runtime not stated on the fetched page; bend and min-note-length options need checking |
| Sections | a small clustering routine over bar features | reimplement; no JS library found |
| Stems from a full mix | `demucs-web` with a user-supplied 172 MB model; WASM; main thread; needs COOP/COEP unless single-thread works (not found) | feasible but slow, see section 2a |
| Drum MIDI from ADTOF / drum2midi | none found | needs Python or a port (not found) |
| Beat/downbeat model | "Beat This!" ONNX exists (title only) | unverified |

---

## 3. On my partner's report (H5)

H5 covers the engines that would play back what I transcribe. Where the two must agree:

1. **Pitch convention.** The studio's chord helper counts C4 as MIDI 60 (comment in `core.js`: "C4 = 60"). Basic Pitch writes MIDI with `MIDI_OFFSET` 21 (A0 = 21), which makes C4 = 60 as well (verified: constants.py and note_creation.py, fetched). So a transcribed `midi` value can go straight into the studio's `ev.midi`. Any engine H5 lists must use the same convention; none of H5's fetched pages says (not found).
2. **Pitch bend range.** Basic Pitch's bends are limited to about ±2 semitones. An engine that takes MIDI pitch-wheel events must treat full scale as ±2 semitones. H5 verified that FaustWasm accepts `pitchWheel` messages; I did not find the default bend range in anything I read (I recall ±2 for Faust, unverified). H5 notes that Tone.js has no documented MIDI or parameter-get API in its README, so bends would have to be applied as frequency ramps through its own `rampTo`.
3. **Velocity.** Basic Pitch gives 0 to 127 derived from model confidence; the studio takes 0..1. Divide by 127. The velocity is a confidence proxy, not a loudness, so velocity should be re-estimated from the stem's level at the onset before it drives an engine's filter or amp envelope. I did not find a source that checks how well Basic Pitch's amplitude tracks loudness.
4. **Durations and legato.** Note length comes from `end_s − start_s`. The studio lead already has a `glide` parameter, and the melody notation uses `-` for held notes. A transcribed legato figure maps to a held token, and a short bend between two adjacent notes maps better to `glide` than to a pitch-wheel curve. This is my suggestion.
5. **Time base.** Every engine plays in AudioContext seconds, and the bundle gives both seconds and (bar, step, offset). For a null-test between a render and the reference, the render must run at 44,100 Hz (the stems and the grid are 44.1 kHz; 21,000 samples per beat at 126 BPM only holds at that rate). A browser context at 48 kHz would put the beat at 22,857.14 samples, off the integer grid. (Arithmetic mine.) That matters for any engine H5 lists that fixes its own sample rate, and for `OfflineAudioContext` export.
6. **Re-running the analysis on renders.** The same scripts must run on the reference and on a render so the two can be scored (O1 proposal P1). That requires the engine to render offline with every parameter set from code, which is O1 Q11 to H5. My side has no dependency on which engine wins, as long as the render is a WAV.
7. **Polyphony.** The lead in the breakdown is monophonic (4 pitches per the spec), so Basic Pitch is not needed for it; a per-8th FFT peak or pyin is enough. The stabs and pad are polyphonic chords, and that is where the voice count of a polysynth matters (Tone.js `PolySynth` per H5's verified README).

Corrections or caveats to H5:

- H5's recommendation 1 says Tone.js "fits the existing Web Audio architecture with no new runtime". It is a new vendored script, and H5's own finding that its README has no documented get/set parameter API means the pipeline would need an adapter to the studio's `set(name, v)` contract. I would soften "no new runtime" to "no new runtime concept, but a new file under C1 and C2". This is a judgement; I did not read Tone.js.
- H5 says the spec contains no riser or impact measurement. I checked the spec table: that is correct, and the transcription side cannot help with it either, since neither Basic Pitch nor the drum tools are designed for risers. O1's P3 (centroid per 16th) is the route.
- H5's open question to O2 about WAM parameter automation and preset format is not answered by anything on my side. A transcription bundle only needs note events and a few parameter curves; if the engine takes the studio's own `set` calls, no WAM API is needed.
- One agreement worth recording: H5 found no source that identifies the reference lead synth. Transcription cannot identify a synth either. It only gives the notes, bends and timing; the timbre has to be fitted by listening or by render-and-score (O1).

---

## 4. Still open

1. **Does Basic Pitch (or any listed transcriber) track a 31 to 35 Hz sub?** Range is covered (A0 up) but accuracy there is not documented. Test: run it on `sub_residual.wav` and compare with O1's long-window pitches (34.47 Hz, B0 31.0 Hz in one bar of eight).
2. **Does any drum splitter keep the kick's 50 to 60 Hz tail in the kick stem?** Not found. The test is described in section 1.
3. **Section boundaries versus the spec:** two of six spec times (0:44, 3:16) are 2 to 3 s away from an 8-bar grid by my arithmetic. Nobody has run a segmenter.
4. **demucs-web without COOP/COEP:** whether single-thread WASM works, and where the ONNX Runtime `.wasm` files come from under C2. Not found. Speed claim "0.1 to 0.3x real-time" is ambiguous.
5. **Licences still unread:** drum2midi (its page links a LICENSE file; the excerpt said the project's own port has no licence file, but it was unclear which project that referred to), ADTOF weights, free-music-demixer, MDX23C DrumSep weights, Spleeter weights, Open-Unmix official page, "Beat This!". The LarsNet weights are CC BY-NC 4.0 per search text.
6. **How general is folding?** It works on O1's measurements for this track. For a song with a live or variable kick it fails, and the neural route has to take over. I have no evidence for which of the two a given song needs, except the fold's own coherence ratio, which the pipeline should report.
7. **Basic Pitch CLI defaults** for onset and frame thresholds were not seen; the function-level API requires them as arguments.
8. **Chord naming** for extended chords (the studio's Bmaj9, G#m7, Emaj7 were a guess per the spec): no verified tool outputs extended chords; madmom is major/minor only. The template-matching step is my own design and untested.
9. **Samplab, MT3, Omnizart output formats:** unchanged from round 1 or not found.

## Sources

Fetched this round or in round 1 (page read):

- https://github.com/timcsy/demucs-web
- https://github.com/timcsy/demucs-web/blob/main/EXPERIENCE_REPORT.md
- https://github.com/facebookresearch/demucs
- https://github.com/spotify/basic-pitch
- https://github.com/spotify/basic-pitch-ts
- https://raw.githubusercontent.com/spotify/basic-pitch/main/basic_pitch/note_creation.py
- https://raw.githubusercontent.com/spotify/basic-pitch/main/basic_pitch/constants.py
- https://github.com/mykolad/drum2midi
- https://github.com/xavriley/adtof_plus_drum_transcription
- https://github.com/Music-and-Culture-Technology-Lab/omnizart
- https://github.com/CPJKU/madmom
- https://github.com/librosa/librosa

Seen in search results only (fact taken from the search summary):

- https://librosa.org/doc/main/generated/librosa.segment.agglomerative.html
- https://librosa.org/doc/dev/api/segment.html
- https://librosa.org/doc/main/generated/librosa.pyin.html
- https://librosa.org/doc/main/generated/librosa.beat.beat_track.html
- https://github.com/EdoardoMor/LARS
- https://arxiv.org/html/2312.09663v1
- https://madmom.readthedocs.io/en/v0.16/modules/features/downbeats.html
- https://madmom.readthedocs.io/en/v0.16/modules/features/chords.html
- https://huggingface.co/musetric/beat-this-onnx
- https://meyda.js.org/
- https://cdn.jsdelivr.net/npm/web-audio-beat-detector@8.2.37/README.md

Local files read: `docs/research/2026-10-23-plugin-gear/BRIEF.md`, `transcripts/round1-S5-stems-transcription.md`, `transcripts/round1-H5-lead-fx-browser-synths.md`, `transcripts/round2-O1.md`, `transcripts/round2-O2.md`, `docs/superpowers/specs/2026-10-21-guidance-studio-design.md`, `prd.md`, `future.md`, `olde Havantechno dub studio/song.js`, `olde Havantechno dub studio/sequencer.js` (grep only).
