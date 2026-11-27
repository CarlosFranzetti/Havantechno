# B1 (Opus): the sampler for batch 1

Box Crew, the Soundsystem. Opened 2026-11-08 23:24 EST (04:24 UTC). Brief: `docs/research/2026-11-09-box-crew/BRIEF.md`, batch 1 of `docs/plans/2026-11-09-roadmap.md`.

This transcript covers six things: what the reference samplers do, which features matter for recreating sounds from records, SFZ as the program format, auto-mapping, a Web Audio design written in the engine's own conventions, and the checks. It ends with the build specification for A7, A1 and A3, a verification plan for A9, and five decisions for the coordinator.

## 0. What I read, and limits on the research

- Engine: `app/CONTRACT.md` (Host, Sampler), `app/engine/synths.js` (`voice()`, `makeInst`, the envelopes, `BUILD.sampler`, `chokeGroups`), `app/engine/host.js` (`getBuffer`, `buildSong`, `loadAudio`, `store`, `reloadAudio`, `addSampler`, `usedBy`), `app/engine/songdoc.js` (`normSampler`, `normAudio`), `app/engine/core.js` (`defineParams`, `Kit.target`), `app/engine/sequencer.js` (locks, `ev.dur`, `ev.midi`, `ev.notes`) and the fake context in `app/engine/selfcheck.js`.
- **Network.** The session's network refused direct page fetches. Three hosts failed to resolve: `sfzformat.com`, `linuxsampler.org` and `decentsampler-developers-guide.readthedocs.io`. Web search worked, and I used all 12 searches. So each fact cited below comes from a search result's title and excerpt (the result pages in §11), not from reading the full page. Anything marked **(unverified)** is from my own knowledge, and someone should check it against the page once `sfzformat.com` is allowed. That matters most for the SFZ opcode defaults in §3.
- **Prototypes.** I wrote two throwaway Node scripts in the session scratchpad, outside the repo, and ran them (§4 and §5.4). One is a YIN pitch detector with a file-name parser; the other bakes a loop crossfade. I quote the numbers they printed.

## 1. What the reference samplers do

| Sampler | Model | What matters to us | Source |
|---|---|---|---|
| **Kontakt** (NI) | Instrument → Groups → Zones. On a note, it checks every group for zones matching the note number and velocity. Round robin is set per group ("cycle round robin" with a position in the chain). Release triggers are a group switch in the Source module. Auto-map reads tokens from file names into root key, single key, low/high key and min/max velocity, or takes the root from sample metadata. | Group-level round robin and release triggers. A token-based auto-map that fails on names like `D#-1` (the minus sign is read as a separator). Users script zone-level round robin because group-level isn't enough. | NI manual pages "The Group Editor" and "The Mapping Editor" (search excerpts); vi-control and NI community threads; adsrsounds tutorial |
| **TAL-Sampler** | Four sample layers, a modulation matrix, vintage DAC modes (Emu II, AM6070, S1000, Sample Hold, Linear, Clean), variable sample rate, a 96 dB/oct reconstruction low-pass, and a separate self-oscillating 24/12/6 dB low-pass. | The *character* of old samplers: rate and bit reduction plus a reconstruction filter. That is what makes a record's sample sound like an S1000 or an Emulator. | tal-software.com product page; Synthtopia; MusicRadar (search excerpts) |
| **Decent Sampler** | XML `.dspreset`: one `<groups>` element, `<group>`s of `<sample>`s. Each sample has `rootNote` (required), `loNote`/`hiNote` and `path`. `tags` lets one sample stop others. Round robin `seqMode` is one of `round_robin`, `random`, `true_random`, `always`; that list comes from a third-party tool's validator, not the guide. | The simplest well-documented multi-zone format. "Silence by tag" is the choke-group idea. I did not find loop crossfade attribute names. | the developer guide's "The `<groups>` element" page (search excerpt); glama.ai MCP tool page |
| **Sitala** (Decomposer) | 16 pads with six controls: shape (attack, length and sustain at constant volume), two-octave tuning, volume, compression, tone (mid boost or scoop) and pan. Beat slicing finds the start and end of each hit in a sample of several hits. MIDI learn. | The best model for the *drum-kit face*: few controls per pad, plus slicing. | rekkerd.org, KVR news, synthanatomy (search excerpts) |
| **Serato Sample** | Key detection, then Pitch 'n Time shifting (±24 semitones and 50 cents). "Find Samples" autoset places up to 16 cues. Each pad has key, BPM, filter, attack and release. A review lists as cons: no looping, no effects, no transient detection. | The *record-digging* workflow: open a record, auto-find hits, play them in key. We can match this with pitch detection plus slicing (§4); time-stretch is out of scope for batch 1. | serato.com blog and 1.0.0 notes; MusicRadar review (search excerpts) |
| **SFZ players** (sfizz, sforzando) | Plain-text programs: headers and `opcode=value`. sfizz supports SFZ v1 and part of v2, and publishes a status table of supported opcodes. Per its 0.5.0 notes it implements `loop_crossfade` with a sinusoidal default curve. A KVR post says sforzando does not implement `loop_crossfade`. | The open interchange format, with thousands of free instruments. §3. | newreleases.io (sfizz 0.5.0, 1.0.0), sfztools status and FAQ pages, KVR product page and forum (search excerpts). Sforzando's feature set: **(unverified)**, not searched. |

## 2. Which features matter for recreating sounds from records

The sample-based parts of an early-electro or minimal record are mostly one-shots. Typical examples are a drum hit from a sample CD or another record, a sampled stab or orchestra hit, a vocal chop or a break, played from a pad or a sequencer step at a few pitches. Multisampled acoustic instruments are rare. That sets the order of work:

**Batch 1, must have** (each one is used to rebuild a record's sample):
1. One-shot playback with sample start and end, locked per step. This already exists, and step locks already apply.
2. Pitch per step: a lockable `key` and `pitch`, and chromatic play on note tracks.
3. Choke groups (open hat cut by closed hat) and per-key mono (`note_polyphony=1`). Choke already exists across instances.
4. Multi-zone programs: key ranges, so one track plays a whole kit through step locks on `key`, plus velocity layers.
5. Round robin, sequential and random, deterministic from the transport start.
6. A filter with its own envelope, key tracking and velocity tracking. The classic sampler move on breaks and stabs.
7. An amp ADSR (with delay and hold), velocity tracking, and reverse (already a param, not built).
8. Loops: loop points, sustain and continuous modes, and a crossfade (pads and tones sampled from records).
9. Two LFOs: one for vibrato to pitch, one to cutoff and amp.
10. SFZ import and export, auto-mapping a dropped folder, and pitch detection with cents correction.
11. Slicing one file into regions, either by transients or by an equal grid, placed on consecutive keys from 36 (Sitala's and Serato's workflow).

**Batch 1 could defer** (marked as later in the spec):
- Release triggers (`trigger=release`).
- Velocity and key crossfades (`xfin_*` and `xfout_*`).
- A pitch envelope.
- Glide and legato.
- Keyswitches.
- Per-region effect sends.
- Generic v2 modulation (`lfoN_*`, `egN_*`).
- Curves.

**Separate work, worth flagging:**
- **Vintage-sampler character** (TAL's DAC modes): bit depth, sample-rate reduction with aliasing, and a reconstruction filter. This is a *processor* (A8, AudioWorklet or a WaveShaper quantiser plus sample-and-hold) that any track can use, not a sampler feature. It matters for recreations: an SP-1200 or S950 hit sounds wrong without it.
- **Time-stretch** (Serato): only needed for loops at the wrong tempo. That belongs to batch 4 or 6.

## 3. SFZ as the program format

**Recommendation:** store programs as JSON in the document (`doc.programs`), and use SFZ only for import and export, not as the stored form.

Why:
- The document is JSON and goes through `SongDoc` normalisation, undo and save. Region edits from the face are editor operations on JSON.
- SFZ text would need a parse on every edit, and SFZ's inheritance (control → global → master → group → region) has no place for per-region UI state.

The import flattens the inheritance into fully resolved regions. Any opcode we don't support is kept verbatim in `region.extra` and written back on export. A round trip therefore keeps the meaning of every tier-1 opcode and loses nothing else, though the text layout changes.

### 3.1 What SFZ gives us (cited)

- `loop_mode` values: `no_loop`, `one_shot`, `loop_continuous`, `loop_sustain`. With the opcode unset, the sample's own loop metadata decides.
- `loop_sustain` loops while the key or pedal is held; "no looping during the release phase".
- `one_shot` plays to the end and ignores note-off.
- `loop_crossfade` (v2, seconds) adds a crossfade the audio doesn't have baked in. Most players don't implement it, though sfizz and OpenMPT do. The common advice is to bake it into the sample.
- Round robin: `seq_length`/`seq_position` with "an internal counter for each region"; players differ on whether counters are shared. `lorand`/`hirand` split the 0..1 random range and can be combined with `seq_*`.
- Choke: `group` with `off_by`/`off_mode`; `fast` is the default `off_mode` according to a third-party reference.

### 3.2 Opcode subset (tier 1: build now)

Defaults marked **(u)** are from my own knowledge **(unverified)**. Check them on sfzformat.com before A7 freezes them.

| Area | Opcodes | Our region field | Notes |
|---|---|---|---|
| Structure | `<control>`, `<global>`, `<master>`, `<group>`, `<region>`; `#define $X`, `#include "f"`; `default_path`, `note_offset`, `octave_offset` | (flattened) | Inheritance: control → global → master → group → region **(u)**. `#include` needs the folder's file map (§7.3). |
| Sample | `sample`, `offset`, `end`, `direction=reverse` | `buffer` (an audio id), `offset`, `end` (frames of the file), `reverse` | The `sample` value may contain spaces. It ends where the next `opcode=` begins **(u)**. Paths use `/` or `\` relative to the .sfz file plus `default_path`. |
| Key and velocity | `lokey`, `hikey`, `key`, `pitch_keycenter`, `lovel`, `hivel` | `lokey`, `hikey`, `root`, `lovel`, `hivel` | Note names (`c4`, `c#4`, `db4`) with C4 = 60 **(u)**. Defaults: 0..127, 1..127, keycenter 60 **(u)**. |
| Pitch | `tune` (cents), `transpose` (st), `pitch_keytrack` (cents per key, default 100 **(u)**) | `tune`, `transpose`, `keytrack` | |
| Level | `volume` (dB), `pan` (−100..100), `amp_veltrack` (%, default 100 **(u)**) | `gain`, `pan` (−1..1), `veltrack` (0..1) | |
| Loop | `loop_mode`, `loop_start`, `loop_end`, `loop_crossfade` | `loop` ('none'\|'oneshot'\|'continuous'\|'sustain'), `loopStart`, `loopEnd` (frames), `xfade` (s) | No `loop_mode`: use the file's `smpl` loop if present (§7.4), else 'none'. |
| Round robin | `seq_length`, `seq_position`, `lorand`, `hirand` | `seqLen`, `seq`, `lorand`, `hirand` | |
| Choke and voices | `group`, `off_by`, `off_mode` (`fast`\|`normal`), `polyphony`, `note_polyphony` | `group`, `offBy`, `offMode`, `poly`, `notePoly` | Groups are local to the instrument; the global `choke` param is the cross-instrument group (§5.6). |
| Amp env | `ampeg_delay`, `_attack`, `_hold`, `_decay`, `_sustain` (%), `_release` | `env: {delay, attack, hold, decay, sustain (0..1), release}` | Hoisted to instrument params when every region shares the values (§3.3). |
| Filter | `fil_type` (`lpf_1p`, `lpf_2p`, `hpf_2p`, `bpf_2p`, `brf_2p`, `lpf_4p`, `hpf_4p`), `cutoff`, `resonance` (dB), `fil_keytrack`, `fil_keycenter`, `fil_veltrack` | `filter: {type, cutoff, reso, key, keyCenter, vel}` | `lpf_4p`/`hpf_4p` become two biquads in series. `lpf_1p` becomes a biquad lowpass with Q −3 dB (approximation). `fil_type` names **(u)**. |
| Filter env | `fileg_delay`/`_attack`/`_hold`/`_decay`/`_sustain`/`_release`, `fileg_depth` (cents) | `fenv: {…, depth}` | |
| LFOs (v1) | `pitchlfo_freq`/`_depth`/`_delay`/`_fade`; `fillfo_*`; `amplfo_*` (depth in dB) | `vib: {rate, depth, delay, fade}`; `lfo: {rate, cutoff, amp, delay, fade}` | We have one shared rate for filter and amp. If `fillfo_freq` and `amplfo_freq` differ, import keeps `fillfo_freq` and warns. |

**Tier 2 (parsed, kept in `extra`, not played):**
- `trigger=release|first|legato`;
- `xfin_*`/`xfout_*`, `amp_velcurve_N`;
- `pitcheg_*`;
- `sw_*` keyswitches;
- `locc`/`hicc`/`on_locc` (the engine has no CC stream);
- `effect1`/`effect2`;
- `eq*`;
- v2 `lfoN_*`/`egN_*`;
- `<curve>`, `<effect>`, `<midi>`, `<sample>` (embedded data);
- `*sine`/`*noise` generators;
- `count`;
- ARIA `label_cc*`.

The importer returns `{program, warnings: [{line, opcode, why}]}`. The face shows how many warnings there are.

### 3.3 Hoisting

On import, any tier-1 envelope, filter or LFO value that is identical in every region moves to `program.global`, named after the instrument parameter (`attack`, `cutoff`, …). Only values that differ stay on the regions.

When a program is assigned to a track, the Host copies `program.global` into the track's params. From then on the face knobs *are* the program's envelope for the common case, and a knob changes the whole program. A region value, when present, overrides the track param for that region; the zone panel shows it as an override with a "clear" button.

Export writes the track params as `<global>` and each region with its overrides.

### 3.4 Licence and code

The parser and writer are new code; nothing is ported. I believe sfizz is BSD-2-Clause **(unverified)**. I recommend reading it only as a behaviour reference, so `THIRD_PARTY.md` gets no entry.

## 4. Auto-mapping

### 4.1 By file name (prototype run)

The prototype parser applies these rules in order:
- A note token `[A-G](#|b|s)?-?[0-9]` bounded by non-alphanumerics. C4 = 60. `s` is sharp, as in `Fs2`. A minus belongs to the octave when it directly follows the note letter, which avoids Kontakt's `D#-1` failure.
- Velocity `v100` or `vel64`, or the dynamics words `ppp pp p mp mf f ff fff`.
- Round robin `rr2`.
- A bare 2–3 digit number ≤ 127 as a MIDI-number guess.
- Drum words for GM keys: kick/bd 36, rim/rs 37, snare/sd 38, clap/cp 39, closed hat/ch/hh 42, open hat/oh 46, low tom 41, mid tom 45/47, high tom 48/50, crash 49, ride 51, cowbell/cb 56, clave/cl 75, maracas/shaker 70, conga 62–64. The GM map is from my own knowledge **(unverified)**.

Output of the run:

```
Piano_C4_v100_rr2.wav {"key":60,"vel":100,"rr":2}     Bass A#1.wav {"key":34}
pad_Eb3_vel64.flac {"key":51,"vel":64}                Kick_036.wav {"keyGuess":36}
alphapad_D#-1.wav {"key":3}                           Snare rr3.wav {"rr":3}
bell c5.aif {"key":72}                                Strings_Fs2.wav {"key":42}
```

### 4.2 By pitch detection (YIN, prototype run)

YIN (de Cheveigné and Kawahara 2002) steps:
1. Squared difference function.
2. Cumulative-mean normalisation (CMNDF, which starts at 1).
3. First lag below an absolute threshold, else the global minimum.
4. Parabolic interpolation around that lag.

The `pitch-detection` npm package and a Rust crate both describe it this way (§11).

YIN is plain array arithmetic on `getChannelData`, so it runs in Node on the fake context (`createBuffer` returns real `Float32Array`s) and on the browser main thread, with no worklet needed.

In the prototype run (8192-sample window, 44.1 kHz, decaying saw and two-partial tones, fmin 30 Hz, threshold 0.12), errors were at most 3 cents:

```
41.2 saw -> 41.20 Hz -0.0 cents   55 saw -> 54.99 Hz -0.4   110 -> 110.00 Hz 0.0   261.63 saw -> 261.51 Hz -0.8
440 -> 440.02 Hz 0.1               1046.5 saw -> 1048.25 Hz +2.9 (clarity 0.98)   white noise -> hz 0, clarity 0.04
```

Each window took 11–17 ms with the direct O(N·maxLag) loop. That is fine at load time; an FFT version is not needed.

Method for a real sample (`Programs.detectPitch(buffer, o)`):
1. Mix to mono.
2. Skip the onset: take the first point after the peak where the 10 ms RMS has fallen below 80 % of the peak, plus 30 ms.
3. Analyse three windows at 0 %, 25 % and 50 % of the remaining length, capped at 1.5 s, and take the median frequency.
4. Accept the result if the median clarity is at least 0.8. Then `root = round(midi)`, and `tune = −cents` so the region plays in tune.
5. Otherwise mark the sample unpitched.
6. Octave guard: if CMNDF at twice the lag is within 0.05 of the chosen minimum, prefer the longer lag, unless that falls below fmin.

The result is stored in `doc.audio[id].analysis = {hz, root, cents, clarity}`, so it isn't recomputed on load (decision 5).

### 4.3 Folder drop: the mapping algorithm (`Programs.autoMap(entries, o)`)

`entries` are `{id, name, analysis}`. The steps:

1. Parse each name (§4.1). Without a note token, use `analysis.root` if the sample is pitched. If it is unpitched, use the drum-word key; failing that, give it the next free pad key from 36 upwards (16 pads: 36–51).
2. Group by root and velocity token. Within a group, distinct `rr` tokens (or files that are otherwise identical) become `seqLen = n` with `seq = 1..n`, ordered by rr number, then by name.
3. **Velocity layers:** sort the distinct velocity values (dynamics words map to 16, 32, 48, 64, 80, 96, 112, 127). Each layer gets `hivel = value` and `lovel = previous + 1`, with the top layer's `hivel` set to 127.
4. **Key ranges** for pitched roots, in sorted order. Mode `'mid'` (default) runs each region from the midpoint below to the midpoint above. Mode `'below'` uses `lokey = previous root + 1` and `hikey = root`, which is the DeHaan advice: only transpose down. Drum and pad regions get `lokey = hikey = root`.
5. **Loop:** a file with a `smpl` loop gets `loop: 'sustain'` on a pitched program and `'oneshot'` on a drum program. Otherwise it gets `'oneshot'` (drum program) or `'none'` (pitched).
6. **Program kind:** `'drums'` if most samples are unpitched or carry drum words, else `'pitched'`. A drum program sets `global.gate = 0`; a pitched program sets `gate = 1` (§5.3).

`Programs.slice(buffer, {mode: 'transient'|'grid', n, threshold})` handles one-file slicing:
- `'transient'`: spectral-flux onsets on 1024-sample hops with a median-adaptive threshold, a minimum gap of 50 ms, and each slice ending at the next onset.
- `'grid'`: n equal parts.

It returns regions on keys 36 upwards, all using the same `buffer` with different `offset`/`end`. No new audio entry is created.

## 5. Web Audio design

### 5.1 Two paths, one instrument

`BUILD.sampler` stays the only sampler type, so the contract's name and the existing tests hold.

- **Single-buffer path:** `params.program === ''`. This is today's code, unchanged: the same `samplerEnv`, the `ev.midi − 48` rule, and loop 0|1. A7's 74 sampler checks and selfcheck section 6 keep passing.
- **Program path:** `params.program` names an entry in `doc.programs`, resolved through `opts.getProgram(id)`, exactly like `getBuffer`. Nothing is rebuilt when a program is edited: the trigger reads the program each time, as it already reads the buffer.

### 5.2 Choosing what to play: `trigger(t, ev)`, program path

1. **Keys.** `ev.notes` (chord tracks) gives one pass per note. Otherwise `ev.midi`, used as an SFZ key directly (C4 = 60). Otherwise `params.key`; drum tracks send no midi. `key` is lockable, so a step lock on `key` plays a different pad of the kit from one track (decision 3). Then `key += params.shift` (the transpose of the incoming note, which moves *which* region plays).
2. **Velocity for lookup:** `v127 = clamp(round(vel(ev) / 1.0 * 127), 1, 127)`. Accent (vel up to 1.5) clamps to 127 for lookup but keeps the boost in level.
3. **Candidates:** every region with `lokey ≤ key ≤ hikey`, `lovel ≤ v127 ≤ hivel` and `trigger` either absent or `'attack'`.
4. **Round robin.**
   - Each candidate with `seqLen > 1` advances its own counter, `c = c % seqLen + 1` (SFZ's per-region counter), and plays only if `c === seq`.
   - Then one random draw `r ∈ [0,1)` per note; regions play when `lorand ≤ r < hirand`.
   - The draw comes from a seeded generator (mulberry32) held on the instrument. `panic()` resets the counters and the seed. The sequencer calls `panic()` on stop and jump, so a render from bar 1 matches live play from bar 1 (§5.8 has the limit).
5. **Choke.**
   - For each region about to play with `group = g`, every live voice of this instrument with `offBy === g` is stopped at `t`. `offMode 'fast'` fades over 6 ms; `'normal'` uses that voice's own release.
   - The instrument's `choke` param still uses the cross-instance registry (`Synths.chokeGroups(ctx)`), unchanged.
   - `notePoly = n`: voices on the same key beyond n are stopped the same way. `notePoly = 1` is the self-choke an open hat needs.
6. **Polyphony.**
   - Count this instrument's voices alive at *t*, not at `currentTime`. The scheduler runs up to 120 ms ahead, so each voice records `t0` and `tEnd`, and a voice counts while `t0 ≤ t < tEnd`.
   - If the count is at least `poly` (or the region's own `poly`), steal: first the voice in release with the lowest level at `t`, then the oldest by `t0`. The stolen voice fades over 6 ms (§5.6).

### 5.3 The voice graph (one per region played)

```
AudioBufferSourceNode (buffer | baked-loop buffer; playbackRate = static pitch; detune <- vib LFO)
  -> [BiquadFilter f1 -> BiquadFilter f2 (4-pole only)]   (only when filter != 'off'; frequency static, detune <- fenv + filter LFO)
  -> GainNode amp     (ADSR on .gain; peak = velocity curve x region gain)
  -> [GainNode trem]  (only when lfoAmp > 0: base 1 - d/2, + LFO x d/2)
  -> [StereoPanner]   (only when region pan != 0)
  -> inst.pre
```

The optional nodes are created only when used, so a plain drum hit costs what it costs today: one source and one gain. Every node goes through `v.track()` and the source through the `v.src` bookkeeping, so `inst._live`, `panic()` and `dispose()` work unchanged.

- **Pitch.**
  - `semis = (key − root) × keytrack/100 + transpose + tune/100 + params.pitch + params.fine/100`, and `playbackRate = 2^(semis/12)`.
  - Positions are in seconds of the *file*: `sec = frames / fileRate`, where `fileRate` comes from `doc.audio[id].meta.rate`, or `buffer.sampleRate` when unknown. This matters because `decodeAudioData` resamples to the decoding context's rate, so SFZ frame numbers have to be converted with the file's original rate (§7.4).
  - `start`/`end` params (0..1) narrow each region's `[offset, end]` span proportionally, so the existing per-step start lock works on programs too.
- **Gate.** `params.gate` (0|1) decides whether a region with `loop: 'none'` stops at the note's end. `oneshot` regions always ignore the note length.
  - Sustained mode (`gate = 1`, or a looping region): release starts at `tRel = t + ev.dur`; with no `ev.dur`, at the sample's end.
  - Played-to-end mode (`gate = 0` and not looping): release is placed so it ends at the slice's end, as `samplerEnv` does today.
  - Drum tracks need `gate = 0`: their `ev.dur` is the short drum gate, and SFZ's default `no_loop` would cut every hit (decision 3).
- **Amp envelope** (seconds, `sustain` 0..1; the same function serves the filter):
  ```
  0 .. delay            : 0
  delay .. +attack      : linear 0 -> peak
  .. +hold              : peak
  .. decay              : setTargetAtTime(peak*sustain, tc = decay / 6.91)   // ~-60 dB of the step after `decay`
  tRel                  : setValueAtTime(adsrAt(env, tRel - t) , tRel); setTargetAtTime(0.0001, tRel, release / 6.91)
  stop                  : src.stop(tRel + release + 0.03)
  ```
  `adsrAt(env, dt)` is a pure function that returns the envelope's value at `dt` from the same formulas. Release, choke and stealing all start from that value instead of reading `gain.value`, which gives the value at `currentTime`, up to 120 ms before `t`. The existing `chokeVoice` reads `g.gain.value` and can jump; this fixes it in the program path. `cancelAndHoldAtTime` would do the same job, but caniuse lists Firefox as unsupported (§11), so the analytic value is the portable choice; a browser that has it may use it. The decay/release shape (exponential approach) is my choice; I could not confirm SFZ's stage shapes **(unverified)**.
- **Velocity curve:** `peak = ((1 − vt) + vt × vel) × 10^(gain/20)`, with `vt = params.veltrack × region.veltrack`. That is linear, the same as today's sampler when `vt = 1`. A squared curve is a later option.
- **Filter.**
  - `type`: 'lowpass'|'highpass'|'bandpass'|'notch'|'lp24'|'hp24'|'off'.
  - `frequency = cutoff × 2^((fKey × (key − 60) + fVel × vel) / 1200)`, clamped to 20..min(20000, 0.45 × sampleRate).
  - Web Audio's lowpass and highpass Q is in dB, like SFZ `resonance`, so `Q = reso`. A 24 dB/oct type uses two biquads with `Q = reso/2` each, an approximation (A9 measures the peak).
  - The filter envelope drives `biquad.detune` in cents: 0 → `fEnv` at the peak, then `fSustain × fEnv`, then 0 on release. Same `adsrAt` shape.
- **LFOs** (per voice, only when their depth is above 0):
  - `vib`: OscillatorNode (sine) → GainNode(cents) → `src.detune`. The depth gain ramps from 0 at `t + vibDelay` to `vibDepth` over `vibFade`, so a delayed vibrato needs no extra node.
  - `lfo`: OscillatorNode(`lfoWave`) → GainNode(`lfoCutoff` cents) → `f1.detune` (and `f2.detune`), plus GainNode(`lfoAmp/2`) → `trem.gain`.
  - Key-synced: each voice's oscillator starts at `t`. The rate is static per voice. `AudioBufferSourceNode.detune` is k-rate, so the vibrato steps every 128 frames (2.7–2.9 ms), which can't be heard at vibrato rates.

### 5.4 Loops and the crossfade (prototype run)

`AudioBufferSourceNode.loop` with `loopStart`/`loopEnd` jumps hard at the seam. The design bakes the crossfade instead, the way the advice reported in §3.1 suggests:

`Synths.bakeLoop(ctx, buffer, ls, le, xf, curve)` returns a new AudioBuffer, cached in a WeakMap by buffer and key `'ls:le:xf:curve'`. In it, the `xf` frames before `le` are blended with the `xf` frames before `ls`: out = in·cos + pre·sin for equal power, or linear. The jump from `le` to `ls` is then continuous. `xf` is clamped to `min(xf, ls, le − ls)`. The voice plays the baked buffer with the same loop points.

Prototype run (1 s test tone, loop 0.25 s → 0.75 s, crossfade 50 ms, equal power): seam discontinuity 0.399 raw, 0.0003 baked, against a typical sample-to-sample step of 0.00005. That is about −62 dB relative to the raw click.

Costs and choices:
- Memory: one extra copy per looped buffer that has `xfade > 0`. It is never saved; it is derived from the buffer.
- Default curve: equal power, which suits uncorrelated material (sfizz defaults to a sinusoidal curve, as cited). Linear is offered for material that is the same waveform on both sides of the seam.
- Fake context: `createBuffer` already returns real `Float32Array`s, so Node can test the baking numerically.

**`loop_sustain` release** (looping while held, then playing past the loop end):
- At `tRel`, compute the playhead analytically: `pos = off + (tRel − t)·rate`. If `pos > le`, then `pos = ls + ((pos − ls) mod (le − ls))`.
- Start a second, non-looping source at `tRel` from offset `pos`. Crossfade the two over 5 ms with two small gains: the looping one fades out and stops, the tail fades in.
- This only works with a static rate, which holds unless the vib LFO is on. With `vibDepth > 0` the voice falls back to `continuous`, which keeps looping through the release, and the face says so.
- The handoff is scheduled at trigger time, so it works offline.

### 5.5 Reverse

`reverse = 1` (param or region): play `Synths.reversed(ctx, buffer)`, a reversed copy cached like `bakeLoop`, with offsets mirrored (`off' = D − end`). This finishes the contract's "reverse (0|1, later)".

### 5.6 Choke, steal and fade

Every early stop goes through one function, `fadeVoice(v, t, ms)`:
- `level = adsrAt(v.env, t − v.t0)` × peak (from the voice's stored model);
- `cancelScheduledValues(t)`, then `setValueAtTime(level, t)`, then `linearRamp(0.0001, t + ms/1000)`;
- stop every source of the voice at `t + ms/1000 + 0.001`;
- set `v.tEnd = t + ms/1000`, so polyphony counting at later trigger times ignores it.

The cross-instance `choke` registry stays as written, but should call `fadeVoice` instead of reading `g.gain.value`. That is A7's change in the single-buffer path too; it fixes a latent click, and the existing tests only check that the voice stops.

### 5.7 Parameters (the spec; flat names, so every path stays `<track>.<param>`)

Existing names and meanings are kept. The ranges of `attack` and `release` widen, which is backward compatible because values only clamp.

| Param | min | max | default | unit | Path | Notes |
|---|---|---|---|---|---|---|
| `buffer` | | | `''` | | both | string; single-buffer path |
| `program` | | | `''` | | program | string, a `doc.programs` id; '' = single-buffer path |
| `key` | 0 | 127 | 60 | | program | key played when the event has no midi; lockable |
| `shift` | −48 | 48 | 0 | st | program | moves the incoming key before region lookup |
| `start` | 0 | 1 | 0 | | both | fraction of the slice or region span |
| `end` | 0 | 1 | 0 | | both | 0 = to the end |
| `pitch` | −24 | 24 | 0 | st | both | after lookup |
| `fine` | −100 | 100 | 0 | ct | both | |
| `reverse` | 0 | 1 | 0 | | both | now built (§5.5) |
| `loop` | 0 | 1 | 0 | | single | unchanged; programs use region `loop` |
| `gate` | 0 | 1 | 0 | | program | 1 = note-off releases `loop: 'none'` regions |
| `delay` | 0 | 10 | 0 | s | program | amp env |
| `attack` | 0.0005 | 10 | 0.002 | s | both | max was 1 |
| `hold` | 0 | 10 | 0 | s | program | |
| `decay` | 0.001 | 20 | 1 | s | program | |
| `sustain` | 0 | 1 | 1 | | program | 1 = today's attack, sustain, release shape |
| `release` | 0.001 | 20 | 0.02 | s | both | max was 2 |
| `veltrack` | 0 | 1 | 1 | | program | |
| `filter` | | | `'off'` | | program | string: off, lowpass, highpass, bandpass, notch, lp24, hp24 |
| `cutoff` | 20 | 20000 | 20000 | Hz | program | |
| `reso` | 0 | 24 | 0 | dB | program | Q in dB |
| `fEnv` | −9600 | 9600 | 0 | ct | program | |
| `fAttack` | 0.0005 | 10 | 0.002 | s | program | |
| `fDecay` | 0.001 | 20 | 0.5 | s | program | |
| `fSustain` | 0 | 1 | 0 | | program | |
| `fRelease` | 0.001 | 20 | 0.1 | s | program | |
| `fKey` | 0 | 1200 | 0 | ct | program | per key from 60 |
| `fVel` | −9600 | 9600 | 0 | ct | program | at full velocity |
| `vibRate` | 0.05 | 20 | 5 | Hz | program | |
| `vibDepth` | 0 | 1200 | 0 | ct | program | |
| `vibDelay` | 0 | 10 | 0 | s | program | the fade-in ends at delay + 0.25 s, or the region's `vib.fade` |
| `lfoWave` | | | `'triangle'` | | program | string: sine, triangle, square, sawtooth |
| `lfoRate` | 0.05 | 40 | 2 | Hz | program | |
| `lfoCutoff` | 0 | 9600 | 0 | ct | program | |
| `lfoAmp` | 0 | 1 | 0 | | program | tremolo depth |
| `poly` | 1 | 64 | 32 | | program | |
| `choke` | | | `''` | | both | cross-instance group, unchanged |
| `level` | 0 | 1.5 | 1 | | both | the common instrument level, unchanged |

That is 38 params. The face's "more" drawer takes what the layout doesn't place.

Lockable per step: every numeric one except `level`, which the sequencer already excludes. String locks (`filter`, `program`) are assigned as-is by the sequencer. A lock on `program` switches kits per step. That works, but I suggest the face not offer it.

### 5.8 Determinism and limits

- **Round robin across renders.** Counters and the random seed reset on `panic()`. A render from bar 1 and live play from bar 1 match. A render from bar *n* starts the counters fresh, so the round robin can differ from what live play would have reached by bar *n*.
  - An exact fix needs the sequencer's per-track hit count on the event (`ev.hit = seq._hitCount[name]`): then `c = ev.hit % seqLen` and `r = hash(seed, ev.hit)`.
  - That is a one-line change in the unowned `sequencer.js`. I list it as a request to A1, not a requirement.
- **Interpolation.** `AudioBufferSourceNode`'s resampling quality is up to the browser. Pitching a sample down by two octaves sounds like the browser's resampler, not like an Akai's. The character processor in §2 is the place to deal with that.

## 6. The program object (JSON, stored in `doc.programs[id]`)

```json
{
  "name": "Electro kit 1",
  "kind": "drums",
  "source": {"format": "sfz", "path": "kits/electro1/electro1.sfz"},
  "global": {"gate": 0, "attack": 0.001, "release": 0.05, "filter": "off"},
  "regions": [
    {"buffer": "bd_01", "lokey": 36, "hikey": 36, "root": 36, "lovel": 1, "hivel": 127,
     "tune": 0, "transpose": 0, "keytrack": 100, "gain": 0, "pan": 0, "veltrack": 1,
     "offset": 0, "end": 0, "loop": "oneshot", "loopStart": 0, "loopEnd": 0, "xfade": 0, "xfCurve": "power",
     "seq": 1, "seqLen": 1, "lorand": 0, "hirand": 1, "group": "", "offBy": "", "offMode": "fast", "notePoly": 0,
     "env": null, "filter": null, "fenv": null, "vib": null, "lfo": null, "reverse": 0, "extra": {}}
  ]
}
```

Rules:
- Every field is optional except `buffer`. The normaliser fills defaults. `group` and `offBy` are strings, because SFZ uses integers and Decent Sampler uses tags, and a string covers both.
- `offset`, `end`, `loopStart` and `loopEnd` are frames of the original file. `end` 0 means to the end.
- `env`, `filter`, `fenv`, `vib` and `lfo` are null when the region follows the track params, or a partial object of overrides.
- `extra` holds unsupported opcodes, written back verbatim on export.
- Limits: at most 2048 regions per program, enforced by the normaliser.

**Export** (`Programs.toSfz(program, params, audio)`):
- `<control> default_path=` (the common folder of the sources);
- `<global>` from the track params that differ from the spec defaults;
- one `<region>` per region (no regrouping), with the sample path from `doc.audio[buffer].src` relative to the .sfz.

**Import** (`Programs.parseSfz(text, {resolve(path) -> audioId | null, include(path) -> text | null})`) returns `{program, samples: [paths], warnings}`. The Host loads the samples first (§7.2), then resolves them.

## 7. Host and document

### 7.1 Document

- `doc.programs = {id: program}`, normalised by `SongDoc` (`normPrograms`, in the unowned `songdoc.js`; decision 4 asks A1 to take it). It is carried by `save`/`load`/`fromLegacy`/`toLegacy` like `audio`.
- A sampler track's `params.program` names one entry. Several tracks may share a program, for example one kit on a kick track with `key` 36 and a snare track with `key` 38.
- `usedBy(id)` in host.js must also count program regions. Without that, `unloadAudio` would drop the reference of a sample that a program still uses. This is a required fix.
- `removeTrack` leaves programs alone. `host.removeProgram(id)` refuses while a track uses the program.
- New editor operations, each one undo step: `setRegion(programId, index, patch)`, `addRegions(programId, regions)`, `removeRegion(programId, index)`, `setProgram(programId, patch)` for name and global. After an edit, `host.commit()` applies it in place (`rebuilt: false`), because the instrument reads the program at trigger time.

### 7.2 Host API additions (A1)

```js
host.programs() -> [{id, name, kind, regions, missing, usedBy}]   // missing: count of regions whose buffer is not loaded
host.program(id) -> program | null                                 // the normalised JSON (read-only copy)
host.addProgram(program, {id}) -> id                               // stores in doc.programs; one undo step
host.removeProgram(id) -> bool
host.importProgram(source, {files, base, shell}) -> Promise<{id, warnings}>
    // source: .sfz text | File | {name, path, bytes} | URL. `files`: {relativePath: File|bytes} from a folder drop, or the shell
    // reads paths relative to `base`. Loads each sample with loadAudio (src = resolved path), then stores the program.
host.mapFiles(sources, {mode: 'auto'|'drums'|'pitched', keys: 'mid'|'below'}) -> Promise<id>  // auto-map (§4.3)
host.sliceToProgram(bufferId, {mode, n, threshold}) -> id
host.exportProgram(id | trackName, {shell}) -> Promise<{text, files: [{id, src}]}>  // Electron: writes .sfz next to samples
host.assignProgram(track, id)                                      // sets params.program and copies program.global into params; commits
host.addSampler(source, {name, family, pattern, program})          // as now; an array of sources or a folder -> mapFiles, then assign
```

- Each sampler the Host builds gets `getProgram` next to `getBuffer`. `refreshSamplers` also runs when a program's region buffer loads.
- Event `'program'` `{id, status: 'added'|'changed'|'removed'}`.
- Missing samples: the regions whose buffer is missing stay silent and the rest play. `host.programs()` reports the count, and the face's zone map shows those regions hatched.

### 7.3 Folder drop and `#include`

- **Web:** a dropped directory arrives as `DataTransferItem.webkitGetAsEntry()` entries (A4's drop code). They are walked into `{relativePath: File}` and passed as `files`.
- **Electron:** the shell needs `readDir(path, {recursive, filter: audio|sfz})` and `writeFile(path, bytes)` for export. That is a request to A6.
- `#include` and `sample=` paths resolve against the .sfz file's folder plus `default_path`. Lookups are case-insensitive on a miss, because SFZ libraries made on Windows often differ in case. **(unverified as a convention; a defensive choice)**

### 7.4 File metadata (decoding loses it)

`decodeAudioData` returns PCM only, at the decoding context's rate. Before decoding, the Host reads the RIFF/WAVE header from the bytes (`Programs.readWavMeta(arrayBuffer)`, pure, Node-testable). It keeps:
- `fmt `: the file's original rate;
- `smpl`: the MIDI unity note, the pitch fraction, and the loops with their type, start and end;
- `acid`: the root note, if present.

The chunk layouts are from my own knowledge **(unverified)**. These become `doc.audio[id].meta = {rate, root, fraction, loops: [[start, end]]}`. The `AUDIO_KEYS` normaliser in songdoc.js has to accept `meta` and `analysis` as objects (decision 5).

AIFF `MARK`/`INST` and FLAC application blocks are later work. Without metadata, `rate` is `buffer.sampleRate`.

## 8. The face (A3; layout for `Faces.define('sampler', …)`)

- **Hero (exists, extended):** the waveform of the selected region's buffer, with start and end handles (existing), loop start and end handles, and the crossfade drawn as a shaded wedge. A thin playhead shows the last triggered voice of the selected region, read from `inst._lastHit = {region, t0, rate}`, which A7 sets; no engine call is needed.
- **Zone map (program path, window density only):** a 128-key by 127-velocity canvas.
  - Regions are rectangles in the family ink. Round-robin siblings are drawn stacked and offset by 2 px. Missing buffers are hatched. The regions that just played flash.
  - Clicking selects a region. Shift-click adds to the selection.
  - Dragging an edge sets `lokey`/`hikey`/`lovel`/`hivel` through `setRegion`, one undo step per gesture.
  - A key strip below shows each region's root.
- **Region panel** (selection; document edits, not `setParam`): `root`, `lokey`/`hikey`, `lovel`/`hivel`, `tune`, `gain`, `pan`, `loop`, `xfade`, `group`, `offBy`, `seq`/`seqLen`, `reverse`, and "overrides: clear".
- **Sections** (`setParam`, lockable):
  - SOURCE: `program` (select of `host.programs()` plus "single sample"), `key`, `shift`, `pitch`, `fine`, `start`, `end`, `reverse`.
  - AMP: `delay`, `attack`, `hold`, `decay`, `sustain`, `release`, `veltrack`.
  - FILTER: `filter`, `cutoff`, `reso`, `fEnv`, `fAttack`, `fDecay`, `fSustain`, `fRelease`, `fKey`, `fVel`.
  - LFO: `vibRate`, `vibDepth`, `vibDelay`, `lfoWave`, `lfoRate`, `lfoCutoff`, `lfoAmp`.
  - VOICE: `gate`, `poly`, `choke`, `loop`.
- **Strip and face densities:** hero, then Sitala's six-control set as the "quick" view: `pitch`, `attack` + `release` (shape), `level`, `cutoff` (tone), and `key`.
- **Buttons:** Load SFZ…, Map folder…, Slice…, Export SFZ…, Re-detect pitch. The import warnings count links to a list.
- **Lint:** the layout names only spec params. Region fields are not params, so `Faces.lint` must skip the region panel.

## 9. Checks

### 9.1 Node, fake context (A7 in `tools/synths-check.js`; A1 in selfcheck for Host and document)

The fake context needs no new stubs: gain, biquad (with `detune`), oscillator, panner, buffer source (with `detune`) and `createBuffer` with real arrays are already there.

A trick makes region identity visible: give each test buffer a constant fill (region A = 0.1, B = 0.2, …), so `src.buffer.getChannelData(0)[0]` says which region a hit chose.

1. `program: ''` reproduces today's behaviour: the existing 74 sampler cases pass unchanged.
2. Region lookup by key: regions 36, 38 and 42; `trigger(t, {midi: 38})` starts one source whose buffer is region 38's.
3. No midi uses `params.key`; a `locks: {key: 42}` event (through a sequencer step) plays region 42; after the step, `params.key` is restored.
4. Velocity layers: `vel` 0.3 and 0.9 pick the lower and upper layers; accent (vel 1.2) picks the top layer and its peak gain is above 1.0×.
5. `ev.notes` [60, 64, 67] on a pitched program starts three sources with `playbackRate` 2^((n − root)/12) (±1e-9).
6. Pitch formula: root 60, key 72, `tune` −50, `pitch` 1, `fine` 25 → rate = 2^((12 − 0.5 + 1 + 0.25)/12).
7. Frame positions use `meta.rate`: offset 22050 frames at `meta.rate` 22050 → `src.start(t, 1.0)` even though the decoded buffer's rate is 44100.
8. Sequential round robin, 3 regions: six hits play A B C A B C; `panic()` resets to A.
9. Random round robin is repeatable: two fresh instruments give the same sequence for 20 hits; `lorand`/`hirand` halves give both regions in 20 hits.
10. `seq` combined with `rand` selects only within the matching subset.
11. `offBy` fade start: an open-hat voice (`offBy 'ch'`) is faded when a closed-hat region (`group 'ch'`) plays. The fade starts at the trigger *t*, and its `setValueAtTime` value equals `adsrAt` at *t*, not `gain.value`.
12. `offBy` direction: the closed hat (`group 'ch'`) stops voices whose `offBy === 'ch'`, and leaves voices with another or empty `offBy` alone.
13. `notePoly 1`: a second hit on the same key fades the first; a different key does not.
14. `poly 4`: the fifth overlapping hit steals exactly one voice, the oldest; a voice whose `tEnd ≤ t` is not counted (scheduled ahead: t = 10.0, 10.05, …, with `currentTime` 0).
15. Stealing prefers a voice in release over an older held one.
16. The cross-instance `choke` param still works across two instruments (existing case) and now fades from the analytic level.
17. `gate 0` + `loop 'none'`: the release ends at the slice end, whatever `ev.dur` says; `gate 1`: release starts at `t + ev.dur`.
18. `loop 'oneshot'` ignores `ev.dur` even with `gate 1`.
19. `loop 'continuous'`: `src.loop` true, `loopStart`/`loopEnd` in seconds of the file; stop = t + dur + release + 0.03.
20. `bakeLoop`: a 1 s sine with a non-integer number of cycles in the loop; baked seam discontinuity < 0.01 × raw; the cache returns the same object for the same key; `xf` clamps to `ls`.
21. `loop 'sustain'` with a static rate: at `tRel` a second source starts at the analytic offset (checked against a hand computation); with `vibDepth > 0`, no second source.
22. `adsrAt`: values at 0, mid-attack, end of hold, decay at 1τ, and sustain; monotone during release; never ≤ 0.
23. Filter `'off'` creates no biquad; `'lowpass'` creates one with `Q = reso`; `'lp24'` creates two; `fKey`/`fVel` set the frequency per the formula; `fEnv` schedules on `detune`.
24. Vib/LFO depth 0 creates no oscillator; depth > 0 creates one oscillator per voice, connected to `src.detune` or `f1.detune`, and it is stopped with the voice.
25. `reverse 1`: the buffer is the reversed copy (first sample = last of the original); offsets are mirrored.
26. A missing region buffer (`getBuffer` returns null) is silent; the other regions of the same program still play; nothing throws.
27. `getProgram` throws or returns null → silent, no throw; `ctx = null` → silent instrument with the same spec.
28. `panic()` stops every voice, including tail and LFO sources; `dispose()` leaves `_live` empty.
29. Spec: all §5.7 params exist with these ranges and defaults; `Synths.types()` still excludes 'sampler'.
30. `Programs.parseSfz`: inheritance (a group value is overridden by the region), `#define`, `#include` via callback, note names, `default_path`, comments (`//` and `/* */`), a `sample=` path with spaces, an unknown opcode kept in `extra` with a warning, hoisting into `global`.
31. Round trip: `parseSfz(toSfz(p))` gives deep-equal regions for a 12-region test program.
32. `Programs.readWavMeta` on hand-built RIFF bytes with `fmt ` + `smpl` (one loop) + `acid` returns rate, root and loop; a truncated chunk returns what it could and no throw.
33. `Programs.detectPitch` on synthetic buffers: 41.2, 110, 440 and 1046.5 Hz within ±5 cents, clarity ≥ 0.9; white noise → unpitched.
34. `Programs.parseName` on the eight names in §4.1 gives the shown results; `autoMap` on {C2, C3, C4 × v64/v127 × rr1/rr2} gives 12 regions with the expected key, velocity and round-robin layout in both key modes.
35. Host and document (selfcheck, A1): save/load round trip keeps `doc.programs`, `meta` and `analysis`; `usedBy` counts program regions; `unloadAudio` keeps the reference while a program uses it; `assignProgram` copies `global` into params; a region edit commits with `rebuilt: false`; undo reverts a `setRegion`.

### 9.2 Chromium render test (A7 or A10, Playwright through `Host.render` or a page that builds an OfflineAudioContext)

Use generated buffers so nothing needs a licence:
- R1 **Identity:** a 1 s noise buffer as a single region with root = key, no envelope (attack 0.0005, sustain 1, release 0.001), `level` 1, at the context's rate. The output nulls against the input to below −80 dB over the body, excluding the first and last 2 ms.
- R2 **Pitch:** a 440 Hz sine region with root 69, played at key 81. YIN on the output reads 880 Hz ± 2 cents. With `tune` −100 it reads 830.6 ± 2 cents.
- R3 **Loop seam:** a 220.37 Hz sine looped over 0.25..0.75 s with xfade 0.05 s, held for 3 s. The high-passed (8 kHz) energy around each seam is within 3 dB of the energy between seams; without xfade it is more than 20 dB above.
- R4 **Choke:** open hat (white noise, oneshot 1 s, `group oh`), then closed hat (`group ch`, `offBy` on the open hat = `ch`) 0.25 s later. The open hat's RMS 10 ms after the choke is more than 40 dB below its value before.
- R5 **Filter envelope:** sawtooth at 110 Hz, lowpass at 200 Hz, `fEnv` +4800, `fDecay` 0.3. The spectral centroid in the first 50 ms is more than 3 times the centroid at 600 ms.
- R6 **Round robin:** a DC-region program (0.1/0.2/0.3) with six hits; per-hit levels read 0.1 0.2 0.3 0.1 0.2 0.3 (± 1e-3).
- R7 **Polyphony:** 40 overlapping long hits with `poly` 8. No more than 8 sources are audible at any 10 ms frame (DC regions of 0.01 each, so the sum is at most 0.08 + fade slack), and there is no page error.
- R8 **Realtime smoke:** in the live app, `addSampler` with a mapped program, play 4 bars, no console error (extends `tools/browser-check.js`).

## 10. Build specification and verification plan

### 10.1 Build (who does what)

- **A7** (`synths.js`):
  - The program path of `BUILD.sampler` per §5.2–5.6.
  - The new spec entries (§5.7), with `getProgram` taken from `opts` like `getBuffer`.
  - `adsrAt`, `fadeVoice`, `Synths.bakeLoop` and `Synths.reversed` exported for the checks.
  - Moving `chokeVoice` onto `fadeVoice`.
  - Checks 1–29 in `tools/synths-check.js`.
- **New pure module `app/engine/programs.js`** (global `Programs`, loaded after `synths.js` and before `host.js`; owner to be assigned, I suggest A7): `parseSfz`, `toSfz`, `normalize`, `parseName`, `autoMap`, `slice`, `detectPitch`, `readWavMeta`. Checks 30–34. It needs no AudioContext and runs in Node on arrays.
- **A1** (`host.js`, `project.js`, selfcheck, plus `songdoc.js` for `normPrograms` and the editor operations, if the coordinator rules so): §7, plus check 35, plus the load-order line in selfcheck's `load()`.
- **A6:** add `engine/programs.js` to `index.html`; shell `readDir` and `writeFile`.
- **A3:** the face (§8). **A4:** folder drop into `host.addSampler([...])`.
- **A8 (later):** a `crush` processor (bits, rate, reconstruction lowpass) for sampler character.

### 10.2 Verification plan for A9 (against reference samples the owner provides)

For each sample-based element the owner isolates from a record, the recreation is the owner's chosen sample or slice loaded in a program, then tuned. A9 scores:

1. **Pitch:** YIN median over the sustained part. Pass if within ±5 cents of the reference.
2. **Envelope:** 5 ms RMS envelopes, aligned at onset. Pass if Pearson r ≥ 0.95 over the first 1 s and the decay time to −20 dB is within 10 %.
3. **Spectrum over time:** the spectral centroid trajectory (20 ms frames, first 500 ms). Pass if the mean absolute log2 ratio is ≤ 0.15 (about a semitone of brightness). This tests the filter envelope.
4. **Loops:** spectral flux at the loop seams against the median flux. Pass if the ratio is ≤ 2.
5. **Identity:** when the recreation *is* the reference sample played at its root with no envelope, the null residual is ≤ −60 dB. This catches level, offset and rate-conversion mistakes (§7.4).
6. **Kit timing:** the onset times of a rendered pattern against the sequence. Pass if they are within ±1 ms (sample start offsets correct).

`tools/score.py` already has the framework for these measures, and A9 adds them as `--sampler` measures.

## 11. Sources (search result pages seen; full pages could not be fetched)

- sfzformat.com: opcodes `loop_crossfade`, `loopmode`, `loopstart`, `seq_length`, `seq_position`, `lorand`/`hirand`, the opcode index, `sample`, the drum-basics tutorial, players. https://sfzformat.com/opcodes/loop_crossfade · https://sfzformat.com/opcodes/loopmode · https://sfzformat.com/opcodes/seq_length · https://sfzformat.com/opcodes/seq_position · https://sfzformat.com/opcodes/lorand · https://sfzformat.com/tutorials/drum_basics · https://sfzformat.com/software/players
- LinuxSampler SFZ opcode table (support status, `off_by`/`off_mode`). https://linuxsampler.org/sfz · https://svn.linuxsampler.org/svn/web/trunk/www.linuxsampler.org/sfz/index.php
- sofiza crate (`one_shot` description). https://docs.rs/crate/sofiza/latest/source/src/sfz/types.rs
- KVR "SFZ format documentation" thread (sforzando and `loop_crossfade`; `loop_sustain` with `ampeg_release`). https://www.kvraudio.com/forum/viewtopic.php?p=8481429
- sfizz release notes 0.5.0 (`loop_crossfade`) and 1.0.0; status table; FAQ; KVR product page (v1, partial v2). https://newreleases.io/project/github/sfztools/sfizz/release/0.5.0 · https://newreleases.io/project/github/sfztools/sfizz/release/1.0.0 · https://sfztools.github.io/sfizz-juce/status · https://sfztools.github.io/sfizz/faq · https://www.kvraudio.com/product/sfizz-by-sfztools
- Decent Sampler developer guide, "The `<groups>` element". https://decentsampler-developers-guide.readthedocs.io/en/stable/the-groups-element.html · seqMode values via https://glama.ai/mcp/servers/@dandeliongold/mcp-decent-sampler-drums/tools/configure_round_robin
- Kontakt manual: The Group Editor, The Mapping Editor. https://native-instruments.com/ni-tech-manuals/kontakt-manual/en/the-group-editor · https://native-instruments.com/ni-tech-manuals/kontakt-manual/en/the-mapping-editor · round-robin and release-trigger threads: https://vi-control.net/community/threads/stupid-question-about-groups-and-round-robin.146898/ · https://vi-control.net/community/threads/beginner-question-release-triggers-dependent-on-group-how-to-script.155293/
- Auto-map: https://www.adsrsounds.com/kontakt-tutorials/how-to-auto-map-samples-in-kontakt/ · https://danielrdehaan-website.pages.dev/garden/knowledge/sampling-instruments/kontakt/kontakt-building-the-ccc-c-piano/ · https://community.native-instruments.com/discussion/comment/61016 · https://www.orangetreesamples.com/blog/easy-sample-library-mapping-method
- TAL-Sampler: https://tal-software.com/products/tal-sampler · https://www.synthtopia.com/content/2015/06/29/tal-sampler-an-analog-modeling-synth-with-sampling-sound-engine/ · https://musicradar.com/news/tech/tal-sampler-plugin-goes-back-to-the-old-school-624045
- Sitala: https://rekkerd.org/decomposer-releases-sitala-v1-0-free-16-pad-drum-sampler-instrument/ · https://www.kvraudio.com/news/43608 · https://kvraudio.com/news/decomposer-release-free-drum-sampler-sitala-1-0---adds-sample-trim-beat-slicing-aax-plug-in-50495
- Serato Sample: https://serato.com/latest/blog/20242/introducing-serato-sample · https://serato.com/sample/downloads/1.0.0 · https://www.musicradar.com/reviews/serato-sample
- Loop crossfade curves (other products): https://expert-sleepers.co.uk/xfadelooper/manual/ref_sample.html · https://www.manualslib.com/manual/1573562/Akai-Force.html?page=198
- YIN and McLeod: https://www.pkgstats.com/pkg:pitch-detection · https://docs.rs/crate/pitch-detection/latest/source/src/detector/yin.rs
- `cancelAndHoldAtTime` support: https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/cancelAndHoldAtTime · https://caniuse.com/mdn-api_audioparam_cancelandholdattime

**Not verified, from my own knowledge:**
- SFZ opcode defaults, the header inheritance order, `fil_type` names and note-name octave convention;
- sforzando's feature set and sfizz's licence;
- the GM drum key map;
- the RIFF `smpl`/`acid` chunk layouts;
- SFZ envelope stage shapes.

Ask for `sfzformat.com` to be allowed in the session's network settings to check them.

## 12. Requests to other owners (for the coordinator to relay)

- **To A1:**
  - `doc.programs` and `normPrograms`, plus the editor region operations (`songdoc.js` is unowned: decision 4).
  - `usedBy` counting program regions (required).
  - `getProgram` for samplers, and `readWavMeta` before decode.
  - Accept `meta`/`analysis` objects in `doc.audio`.
  - Optional: `ev.hit` on events in `sequencer.js` for render-exact round robin (§5.8).
- **To A6:** load `engine/programs.js`; shell `readDir` and `writeFile`.
- **To A3:** the face per §8; `Faces.lint` skips region fields.
- **To A4:** folder drop (webkitGetAsEntry walk) into `host.addSampler(array)`.
- **To A8:** a later `crush` processor for vintage-sampler character.

## 13. Decisions needed from the coordinator

1. **Program format:** store programs as normalised JSON in `doc.programs` (shared by tracks, referenced by a `program` string param), with SFZ as import and export only (tier-1 opcodes played, the rest kept in `extra`), rather than SFZ text or Decent Sampler XML as the stored form.
2. **Key convention:** in the program path, `ev.midi` is the SFZ key (C4 = 60, keycenter default 60). Drum tracks play `params.key`, which is lockable, so one track can play a whole kit. The single-buffer path keeps `midi − 48` unchanged.
3. **Gate default:** a new `gate` param, default 0 (every hit plays to its end or its loop, as today's sampler does). Auto-map and import of pitched programs set `gate 1`, so that drum tracks' short gates don't cut SFZ `no_loop` regions.
4. **Contract change and ownership:**
   - Grow the sampler spec to the 38 params in §5.7 (with `attack` max 10 and `release` max 20).
   - Add a new pure module `app/engine/programs.js` (owner: A7 suggested).
   - Give A1 `songdoc.js` for `normPrograms` and the region editor operations.
5. **Audio metadata:** `doc.audio[id]` gains `meta` (file rate, `smpl` root and loops) and `analysis` (detected pitch). Derived buffers (baked loops, reversed copies) are cached in the engine and never saved. Sample files stay references; there is no copy into the project folder in batch 1.

## 14. Second pass (2026-11-08 ET, after the coordinator's note that sfzformat.com is reachable)

How I checked: the `WebFetch` tool still could not resolve `sfzformat.com`, but `curl` through the session proxy reached it. I used 10 fetches. Two went to raw GitHub URLs for sfzformat's opcode data file and returned 404. The other eight were sfzformat.com pages, saved to the scratchpad and stripped to text:
- `/opcodes/fil_type/`
- `/opcodes/loop_mode/`
- `/headers/`
- `/modulations/envelope_generators/`
- `/opcodes/off_mode/`
- `/opcodes/pitch_keycenter/`
- `/opcodes/amp_veltrack/`
- `/opcodes/lokey/`

I fetched no primary source for the WAV `smpl` chunk, so §7.4 stays unverified. A7 should test `readWavMeta` against a file written by a known tool (for example, sox or a DAW export with loop points) before relying on the field offsets.

### 14.1 Results, item by item

| # | Item (where in this transcript) | Status | What sfzformat.com says | Change for A7 |
|---|---|---|---|---|
| 1 | `fil_type` names (§3.2) | **Corrected** | SFZ v1: `lpf_1p, hpf_1p, lpf_2p, hpf_2p, bpf_2p, brf_2p`. SFZ v2 adds `bpf_1p, brf_1p, apf_1p, lpf_2p_sv, hpf_2p_sv, bpf_2p_sv, brf_2p_sv, pkf_2p, lpf_4p, hpf_4p, lpf_6p, hpf_6p, comb, pink`. ARIA adds `lsh, hsh, peq`. **Default `lpf_2p`**: a region with `cutoff` but no `fil_type` is a 2-pole low-pass. | **Yes.** Add `hpf_1p` to tier 1. `lpf_4p`/`hpf_4p` are v2, still tier 1. Import mapping: `lpf_2p`/`lpf_2p_sv` → `lowpass`, `hpf_2p*` → `highpass`, `bpf_2p*` → `bandpass`, `brf_2p*` → `notch`, `lpf_4p` → `lp24`, `hpf_4p` → `hp24`. `lpf_1p`/`hpf_1p` → biquad low-pass/high-pass with Q −3.01 dB (Butterworth; still 12 dB/oct, an approximation), with an import warning. `lpf_6p`/`hpf_6p`, `pkf_2p`, `apf_1p`, `comb`, `pink`, `lsh`/`hsh`/`peq` → `extra` with a warning. Any region with `cutoff` and no `fil_type` → `lowpass`. |
| 2 | Header inheritance (§3.2, "control → global → master → group → region") | **Corrected** | `<region>` and `<group>` are SFZ v1. `<control>`, `<global>`, `<curve>`, `<effect>` and `<sample>` are SFZ v2. `<master>` and `<midi>` are ARIA. The hierarchy that defines playback is **global → master → group → region** ("the global/group/region or global/master/group/region hierarchy"). `<control>` sits at the file start and sets up MIDI CCs (and, from my knowledge, `default_path`, `note_offset`, `octave_offset`). | **Yes (small).** The parser must not inherit `<control>` opcodes into regions. It applies `<control>`'s directives (`default_path`, offsets) to what follows, and inherits global → master → group → region. |
| 3 | `loop_mode` values and default (§3.1, §3.2) | **Confirmed values; default corrected** | `no_loop`: start to end, or until note-off, whichever comes first. `one_shot`: start to end, ignoring note-off ("commonly used for drums"; also engaged by `count`). `loop_continuous`: loops until note expiry, including during the release. `loop_sustain`: loops while held; no looping in the release. Release length is `ampeg_release` in every mode except `one_shot`. **Default: `no_loop` for samples without a loop defined, `loop_continuous` for samples with defined loop(s)**, using the first loop in the file metadata. ARIA and Cakewalk ignore file loops under `one_shot`. ARIA loops the whole file when the mode is continuous or sustain and no `loop_end` or file loop exists. | **Yes.** On import with no `loop_mode`, a file whose `smpl` chunk has a loop gets `loop: 'continuous'` with that loop's points, not 'sustain'. `oneshot` ignores file loops. `continuous`/`sustain` with neither `loop_end` nor a file loop loops the whole region. My auto-map choice (§4.3 step 5: 'sustain' for pitched folders) is our own choice, not SFZ's default, and can stay. |
| 4 | `no_loop` and note-off; the `gate` param (§5.3, decision 3) | **Corrected** | `no_loop` stops at note-off (plus `ampeg_release`). That is plain SFZ behaviour for every region that isn't `one_shot`. | **Yes.** `Programs.parseSfz` sets `global.gate = 1` for **every** SFZ import, drum kits included, because SFZ kits rely on `one_shot` where they need it. `gate = 0` stays the default for the single-buffer path and for auto-mapped drum folders, whose regions are `oneshot` anyway. This narrows decision 3: imported SFZ always uses `gate 1`. |
| 5 | `off_mode` (§3.2, §5.6) | **Confirmed** | `fast` (default): "turned off immediately. Release settings will not have any effect." `normal`: all envelopes enter their release stage. ARIA adds `off_mode=time` with `off_time` (default 6 ms), and "6 ms is also the fadeout time for off_mode=fast". | **No.** The 6 ms fade in `fadeVoice` matches. Optional: parse ARIA `off_mode=time` + `off_time` into `offMode: 'time'`, `offTime` (s), and use that as the fade length. |
| 6 | `pitch_keycenter` default (§3.2) | **Confirmed, one addition** | Default 60, range 0..127, integer, SFZ v1. SFZ v2 allows `pitch_keycenter=sample`: the root comes from the file metadata, and is **0** when the file has none. | **Yes (small).** Support `pitch_keycenter=sample`: take `root` from `doc.audio[id].meta.root`, else 0 (the documented fallback; the importer warns, since 0 is rarely what the author meant). |
| 7 | `lokey`/`hikey`, note names (§3.2, §4.1) | **Partly confirmed** | `lokey` default 0, range 0..127 (v1). SFZ v2 allows `lokey=-1 hikey=-1`, meaning the region is never triggered by keys (used for CC-triggered pedal noises). Note names (`c3`, `D#4`) are allowed, but "the same note names can be mapped to note numbers an octave or even two apart in different DAWs", so numbers are recommended. The page does not state C4 = 60. | **Yes (small).** `lokey = -1` → the region never plays from keys (kept, but it can't be reached until CCs exist). Note names stay parsed with C4 = 60 plus `octave_offset`; that convention is **still unverified**. The importer counts regions keyed by name and shows "keys given as note names: check the octave" when there are any. `hikey`'s default (127) was not fetched. |
| 8 | Velocity curve, `amp_veltrack` (§5.3, §5.7) | **Corrected** | Default 100, range **−100 to 100** %. At 100: Gain(v) = 20·log10((v/127)²) dB, a **squared** amplitude curve, not linear. | **Yes.** In the program path, `peak = (1 − |vt| + |vt|·c) × 10^(gain/20)` with `c = (v/127)²` for vt ≥ 0, or `c = (1 − v/127)²` for vt < 0. The page gives the formula only at 100; the blend for other values is **my choice, unverified**. Spec change: `veltrack` min −1, max 1, default 1; region `veltrack` −1..1. The single-buffer path keeps today's linear velocity. Check 4 changes: the expected peak at vel 0.85 is 0.85² ≈ 0.72. |
| 9 | Envelope stage shapes and decay (§5.3, the `adsrAt` pseudo-code) | **Corrected** | For SFZ 1 envelopes (ARIA and sfizz): attack is linear; decay and release are "convex (linear in dB)". `ampeg_decay` sets a *rate*: "The level in the decay phase descends at the rate determined by ampeg_decay but stops once it hits the sustain level" (decay 1 s with sustain 50 % reaches the sustain level before 1 s). The stages are delay, attack, hold, decay, sustain, release. The same shapes apply to `fileg` and `pitcheg`. | **Yes.** Replace the decay and release lines of §5.3 with linear-in-dB ramps against a fixed floor `F` (−90 dB; the floor value is **unverified**, and A9 can fit it against sfizz renders). **Decay:** the level falls linearly in dB from peak toward `F`, at a rate that would cover peak → `F` in `decay` seconds, and stops at the sustain level. In Web Audio, `expo(g, peak·s, t_d0 + decay × (−20·log10 s)/90)` then hold; for `s = 0`, `expo` to `peak·10^(−90/20)` over `decay`. **Release:** linear in dB from the level `L` at `tRel` to `L·10^(−90/20)` over `release` (constant duration from wherever the level is), then stop. That the release time is constant rather than rate-based is **unverified**. `adsrAt` must use the same formulas (checks 22, 11, 15). The filter envelope uses the same shapes on `detune`, in cents: the decay is linear in cents toward `fSustain × fEnv`, an approximation, because cents are already logarithmic. |
| 10 | EG opcode set (§3.2) | **Confirmed, extras noted** | The SFZ 1 EG opcodes per destination (`ampeg`, `fileg`, `pitcheg`) include `_delay, _attack, _hold, _decay, _sustain, _release, _depth`, plus `_start`, `_vel2delay`/`_vel2attack`/`_vel2hold`/`_vel2decay`/`_vel2sustain`/`_vel2release`, `_dynamic` and `_*_oncc`. | **No change to tier 1.** `_start`, `_vel2*` and `_dynamic` go to tier 2 (kept in `extra`). |

### 14.2 Still unverified after this pass

Not fetched (out of the fetch budget):
- the defaults of `ampeg_*`/`fileg_*`, and the sustain unit (percent);
- `pitch_keytrack` (100), `tune`, `transpose`, `volume`, `pan`;
- `seq_length`/`seq_position` defaults (1/1) and `lorand`/`hirand` (0/1);
- `resonance` (dB, range), `fil_keytrack`/`fil_keycenter`/`fil_veltrack`;
- the v1 LFO opcodes (`pitchlfo_*`, `fillfo_*`, `amplfo_*`) and their units;
- `loop_crossfade` (taken from the first pass's search excerpt);
- `hikey`'s default and the note-name octave convention;
- the `sample=` value-with-spaces rule, `#define`/`#include` syntax, and `default_path`.

Also unverified: the RIFF `smpl` and `acid` layouts. A7 should keep these values as named constants in `programs.js` with a comment marking them unverified, so a later pass can fix them in one place.

### 14.3 Effect on decisions (§13)

- Decision 3 narrows: imported SFZ always gets `gate 1`. Only auto-mapped drum folders and the single-buffer path use `gate 0`.
- Decision 4 changes one range: `veltrack` is −1..1.
- The other decisions are unaffected.
