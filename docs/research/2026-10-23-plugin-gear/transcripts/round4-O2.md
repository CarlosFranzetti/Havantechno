# O2: round 4 — final gear list, build order, pipeline contract, owner decisions, desktop options
Agent model: Opus. Date: 2026-10-23.

**What I read.**
- All ten round-3 files (H1–H5, S1–S5), O1's `round2-O1.md`, and the Faceplate `REPORT.md` (Strip Bench).
- `olde Havantechno dub studio/sequencer.js` (grep), to check how notes cycle and which sample rate is used.

**Verification this round.**
- Four WebSearch calls, all for the desktop section 6: JUCE tiers, a Node VST3 host addon, Tracktion Engine, and Tauri webviews.
- Two GitHub fetches: `ircam-ismm/node-web-audio-api` and `Tracktion/tracktion_engine`.
- One npm registry query for the licences of Electron, Tauri and `node-web-audio-api`.

**Grade marks in the tables:**
- **F**: the named agent fetched the page.
- **S**: search summary only.
- **U**: unverified, or recalled from memory.
- **M**: O1's measurement of the reference MP3.
- **C**: code read in the archived studio.

I give an agent id after each grade. "O2 npm" means the npm registry metadata, read by me.

**Direction change (owner, received during this round).** Havantechno is to become a Mac or PC **desktop DAW**. I folded this in as follows:
- Section 1 gains a "Desktop host" column.
- Real VST3/AU/CLAP plugins are listed as hosting candidates in table 1e.
- Section 6 compares desktop platforms.
- The desktop-shell choice is decision 1 in section 4.

The browser constraints in my rounds 1–2 (no plugin binaries, SharedArrayBuffer needs COOP/COEP, C1–C3) still hold for the archived studio and for any web build.

## 1. The gear list, final

**How to read the columns.**
- **Browser?**:
  - "yes": runs in a page today.
  - "native nodes": buildable from built-in Web Audio nodes.
  - "worklet": needs an AudioWorklet.
  - "WASM port": source exists and would need compiling.
  - "no": closed binary, hardware, or Python-only.
- **Desktop host?**:
  - "yes (formats)": a plugin binary a desktop host could load, with the formats the source agent reported.
  - "engine": our own code, which moves with whatever engine is chosen.
  - "no": hardware, a DAW built-in, Python, or a library.
- **Action**:
  - **adopt**: use as is.
  - **modify**: change our own device.
  - **port**: translate the source.
  - **reimplement**: write our own from a published algorithm.
  - **offline Python**: run in the analysis front end.
  - **host**: candidate for loading as a plugin in the desktop app.
  - **reference only**: listen, compare, or copy controls.

Prices are as the source agents saw them on 2026-10-23. All are approximate and may be out of date. Every GPL, AGPL or LGPL row that says port or adopt is conditional on decision 2 (repo licence).

### 1a. Instruments

| Device or tool | Role | Licence (grade) | Browser? | Desktop host? | Action | Why | Source agents |
|---|---|---|---|---|---|---|---|
| In-house `kick` | kick voice | own; repo has no LICENSE (C, H3, O2) | yes | engine | modify | Pitch must approach a target, `setTargetAtTime(51, t, 0.024)` from ~264 Hz, not ramp to 44 Hz. Needs a hold plus a multi-point amp curve, click 0, and less drive. | H1 (C), O1 (M1, M2), S3 |
| In-house `sub` → ducked drone | sub drone | own | yes | engine | modify | The reference has no plucked B1 sub. It has a free-running drone at 34.47 Hz (C#1, −9 cents), B0 in one bar of eight, ducked about −13 dB after each kick. | O1 (M3, M4, M6), H1, S1 |
| In-house `bass` | mid bass | own | yes | engine | modify | Levers in order: filter envelope and post-filter drive (S3 sim: both off −20.7 dB; plus cutoff 160 Hz gives −24.2 dB, the intro target), then drive before the filter, then slope. Pitch is unsettled (M5 is kick-contaminated, H2). | S3, H2, O1 |
| Open303 TeeBee filter | 4-pole ladder for the bass | MIT (F, H2: `License.txt`) | WASM port or worklet | no (DSP code) | port, later | The only MIT-clean ladder. The 24 dB reading comes from its code and is untested. H2's model says slope is worth ~9 dB, S3's says ~2.7 dB with resonance split. | H2, S3 |
| jc303 | 303 reference | GPL-3.0 (F, H2) | no | yes (CLAP, VST3, LV2, AU; F, H2) | host candidate / reference | Same Open303 engine in a plugin. | H2 |
| Mz101 | SH-101 reference | AGPL-3.0 (F, H2) | no | yes (VST3, AU, LV2; F, H2) | host candidate / reference | Accuracy not checked. | H2 |
| TAL-BassLine | bass A/B | freeware (U/S, H2) | no | yes (VST, VST3, AAX, CLAP; S, H2) | host candidate / reference | Listing facts unverified. Slope unknown. | H2 |
| In-house `stab` + Juno-style chorus | chord stab, width | own; Juno-60 analysis (F, H3; its licence unread) | native nodes | engine | modify / reimplement | Model: pan spread cannot give ~0.5 at onset. A mono voice plus a stereo BBD-style chorus (base 3.5 ms, ±1.85 ms, 0.513 Hz, right channel inverted) gives 0.44–0.61. | H3 (model), S4 (derivation) |
| junox | Juno-60 in the browser | GPL-3.0 (F, H3) | yes (AudioWorklet) | no | reference only | Read for method unless the repo goes GPL. | H3 |
| Youth106 | Juno-106 | GPL-3.0-or-later (F, H3; "non-commercial" was a snippet only) | no | yes (VST3, AU, CLAP; F, H3) | host candidate / reference | Chorus rates 0.514 / 0.835 Hz. | H3 |
| webOBXD / OB-Xd | OB-X poly | GPL-3.0 (F, H3, H5); OB-Xd upstream freeware after 2.11 (S, H3) | yes (WAM; version unsettled, H3) | OB-Xd forks: yes (VST2/VST3/AU/LV2/CLAP; S, H3) | host candidate / reference | Offline render unverified (H5). | H3, H5 |
| webdx7 / Dexed | FM poly | webdx7 MIT, MSFA Apache-2.0 (F, O2, H3, H5); Dexed GPL-3.0 (F, H3) | webdx7 yes (WAM; version unsettled) | Dexed yes (VST3, CLAP; F, H3) | reference / host candidate | Not needed for Guidance. | H3, H5, O2 |
| Surge XT | hybrid synth + effects | GPL-3.0 (F, H2, H3, S4) | no (PR #8597 closed unmerged; F, H5, O2) | yes (VST3, AU, LV2 opt.; CLAP per S) | host candidate / reference | The broadest free desktop palette. | H2, H3, H5, S4 |
| Vital | wavetable | GPLv3 + commercial; free presets not redistributable (F, H2, H3); paid tiers $25 / $80 (S, H3) | no | yes (desktop plugin; formats S) | host candidate / reference | Preset ecosystem. | H2, H3 |
| Pro-54 (Cmajor patch) | Prophet-style poly | patch licence not found (F, H3) | yes (Cmajor export; S) | no | reference only | No control list in its README. | H3 |
| In-house hats, clap | drums | own | yes | engine | modify | Make `ring` and the metal high-pass parameters. `hp2` cuts the 1.5 kHz ring by roughly 15 dB (H4 arithmetic). Add a choke rule. Test whether the clap tail is in-voice or a send. | H4, O1, S2 |
| In-house shaker, perc | breakdown percussion | own | yes | engine | modify after measurement | Shaker decay 70 ms vs a forum 150–200 ms (U). Perc has no resonant body. The 808 cowbell model (two squares ~540 / 800 Hz; S/U, H4) is a candidate. | H4 |
| Werner, Abel, Smith, DAFx-14 808 BD | kick model | paper (S, H1) | native nodes / worklet | no | reimplement only if needed | Only matters if an attack frequency jump is found in 0–10 ms (unmeasured). | H1 |
| Tone.js (MembraneSynth, MetalSynth, PolySynth, Chorus) | parameter reference | MIT (F, H5) | yes (`Tone.Offline` exists; S, H5) | no (library) | reference only | MembraneSynth ramps, so it is the wrong kick shape (H1). It would be a new vendored file. | H1, H4, H5, S5 |
| KICK 2 / 3, Chow Kick, Synsonic BD-808, SubKick | kick references | commercial (KICK 2/3, SubKick; price not found, S, H1); Chow Kick free and open source (S); BD-808 freeware (S) | no | yes for desktop: BD-808 VST/AU (S); Chow Kick platforms S; KICK formats unconfirmed | host candidate / reference | Listening references. | H1 |
| KickCrafter, Kickmess | kick code | AGPL-3.0 (S, H1) | WASM port | KickCrafter VST3/AU (S) | reference only | Kickmess's "exponential slope" is the best lead for the approach shape (S). | H1 |
| Roland TR-909 (Roland Cloud) | 909 reference | commercial, ~$149 or ~$19.95/month (S, H4) | no | format not verified | reference | Whether the 909 hat is synthesised or sampled is disputed in the sources. | H4 |
| Drumatic 3, Microtonic | drum synths | Drumatic free donationware, 32-bit Windows VST (S); Microtonic ~$99 (U) | no | Drumatic: 32-bit only (impractical); Microtonic VST/AU (U) | reference | — | H4 |
| AIR The Riser, liftFX | riser references | commercial, price not found (S, H5) | no | yes (AU, VST; S) | host candidate / reference | The riser shape is unmeasured (O1's P3 not run). | H5 |

### 1b. Processors

| Device or tool | Role | Licence (grade) | Browser? | Desktop host? | Action | Why | Source agents |
|---|---|---|---|---|---|---|---|
| In-house `sidechain` | ducker | own | native nodes | engine | modify | Fit to M4: depth 0.74, attack 4 ms, hold 30 ms, release 265 ms linear; or a dB-linear `exponentialRampToValueAtTime` to 1 at +275 ms. Add `curve`, a retrigger fix (no step to the trough) and `offset`; later `keyFrom`. | S1 (fit), H1, O1 (M4) |
| sndfilter `compressor.c` (Chromium-derived) | keyed glue compressor DSP | MIT (F, S1) | worklet | no | port | Same family as the native node, so the current tuning carries over. Adds `scHp`, `key` input, `mix`, `hold`, and a GR message. | S1 |
| Giannoulis, Massberg, Reiss (JAES 2012) | compressor design | paper (S, S1) | worklet | no | reimplement (alternative) | Log-domain detector. Only the abstract has been seen. | S1 |
| Airwindows (compressors, limiters, Density/Console saturation, reverbs) | DSP sources | MIT per repo link text (F, S1, S4); some headers once read "All rights reserved" (S, S3) | worklet; static curves native | yes (AU/VST; S, S3) | port / reimplement | Check each file's header before porting. | S1, S3, S4 |
| Kickstart 2, Duck / Duck 2, ShaperBox 3, LFOTool | ducker references | commercial; ~€14 / ~$16 (Kickstart 2), ~$27 (Duck), $99 (ShaperBox 3), $49.95 (LFOTool) (S, S1) | no | yes (Kickstart 2 VST3; Duck VST2/VST3/AU/AAX; S, S1) | host candidate / reference | Control lists only. | S1 |
| The Glue, FabFilter Pro-C 2, TDR Kotelnikov, SSL G emulations | bus compressor references | The Glue ~$99, Pro-C 2 $179 at 2015 launch, Kotelnikov free (S, S1) | no | yes (The Glue VST2/VST3/AU/AAX; Pro-C 2 VST/AU/AAX; Kotelnikov VST/AU/AAX; S, S1) | host candidate / reference | The Glue spec (sidechain HP 0–2 kHz, ratios 2/4/10) is the design target. | S1 |
| LSP Plugins | dynamics suite | LGPLv3 (F, S1) | no | yes (CLAP, LV2, VST2, VST3; F, S1) | host candidate / reference | Free sidechain compressors. | S1 |
| Freeverb | reverb | public domain (S, S2: `tuning.h`) | native nodes (~80 nodes; every loop ≥128 samples) | engine | reimplement | RT60-driven comb gains `g = 10^(−3L/(sr·RT60))`, seeded, smoothly automatable. Replaces the polynomial-envelope random IR, which cannot match the reference's constant −9.4 dB/s tail. | S2, H3, O2 (spec) |
| `K.impulse` convolver | IR reverb mode | own | native nodes | engine | modify | Seed the RNG (every render gets a new IR today) and use an exponential envelope. Keep as an optional mode. | S2 |
| Dattorro plate (JAES 1997) | plate reverb | paper (S, S2); khoin's worklet licence "other" | worklet (multi-tap reads) | no | reimplement later | Delay lengths not found. | S2 |
| Dragonfly Reverb, Valhalla (Supermassive free; VintageVerb, Room, Delay ~$50), Pro-R 2 (~$199), EchoBoy, Timeless 3 (~$149) | reverb and delay references | Dragonfly GPL-3.0; the rest commercial or freeware (S, S2) | no | yes (Dragonfly LV2/VST/CLAP/VST3; Supermassive VST2/VST3/AAX/AU; others not confirmed; S, S2) | host candidate / reference | A/B references. | S2 |
| In-house `delay` | ping-pong delay | own | native nodes | engine | modify | Move `lp`/`hp` into the feedback loop behind a `loop` switch (default off). Add `modRate`, `modDepth`, `drive`. No worklet needed. Delay time stays an untested 3/16. | S2, H3 |
| Voxengo Tempo Delay, WSTD DLAY, ChowMatrix | delay references | free (Voxengo closed; WSTD GPL-3.0; ChowMatrix open source) (S, S2) | no | yes (Voxengo VST3/AU; WSTD CLAP/VST3; S) | host candidate / reference | — | S2 |
| OpenAIR, EchoThief IRs | convolution IRs | per-item CC / custom (S, S2) | yes, but audio files | yes (as files) | reference unless audio files are allowed | Licence tracking per item. | S2 |
| `peq` N-band EQ (Audio EQ Cookbook) | correction EQ | W3C note (S, S3) | native nodes | engine | reimplement | Six bands, names `bNtype`, `bNfreq`, `bNgain`, `bNq`, `bNon`, so a path stays within 3 segments (`bass.peq.b2gain`). Converts Q to dB for LP/HP. | S3 |
| Saturator `curve` (tanh, sine, asin, asym) | saturation | Airwindows MIT (S, S3) | native WaveShaper | engine | reimplement | The shaper is symmetric, odd harmonics only. Drive placement (post-filter) is the bigger issue. | S3, H2 |
| ADAA (Parker et al.; Bilbao et al.; chowdsp `ADAASineClipper`) | antialiased saturation | papers (S); chowdsp licence not found | worklet | no | reimplement later | Not needed for the 300 Hz–1 kHz fix (S3). | S3 |
| Chow Tape Model | tape saturation | GPL-3.0 (S, S3) | worklet | yes (VST3, AU, AAX, CLAP, LV2; S, S3) | host candidate / reference | — | S3 |
| Decapitator, Saturn 2, Pro-Q 4 (~$199), Ozone Match EQ, Spectrum Thief (free), TDR Nova (free), IVGI (free), Saturation Knob (free), ZL EQ (AGPL), FreeEQ8 (GPL) | saturation and EQ references | as listed (S/F, S3) | no | yes (Pro-Q 4, Spectrum Thief VST3/AU, ZL EQ VST3/LV2, IVGI VST/VST3/AU/AAX, Saturation Knob AU/VST/VST3/AAX, Nova; S/F, S3) | host candidate / reference (method) | The match-EQ *method* becomes an offline script. | S3 |
| Band-limited widener (`monoBelow`) | width | own | native nodes | engine | modify | Highpass the side signal at ~150 Hz before `width` (M7: correlation 1.00 below 150 Hz). Use Q −3.01 dB for Butterworth, since Q is in dB. Per track, not on the master (H4). | S4, H3, H4 |
| `chorus` with `base`, `invert` | stab onset width | own | native nodes | engine | modify | The current 14/21 ms delays are wrong for a Juno-style decorrelator. Needs a 3.5 ms base. | H3, S4 |
| Lookahead true-peak limiter | master limiter | own design; references LoudMax (free), Limiter No6 (free, unsupported), TDR Limiter 6 GE (~$50–60), Pro-L 2 (S, S4) | worklet | yes for references (LoudMax VST/VST3/AU; S) | reimplement | Add a `drive` input gain. Two profiles: fitting (−10.7 LUFS, ~−0.2 dBFS sample peak) and release (−1 dBTP). Set it after the kick fix. | S4, H4 |
| Loudness / true-peak / correlation meter | measurement device | libebur128 MIT (F, S4); K-weighting constants from a tool summary of `ebur128.c` (F, S4) | worklet | no | port / reimplement | K-weighting and gating fit a worklet. True peak needs a 4× polyphase filter designed and checked against libebur128. Build it before the limiter. | S4, O1 (M9) |
| Ozone Imager docs, Voxengo MSED / Correlometer, Youlean, TAL-Chorus-LX, MicroShift (~$99), Waves S1 (~$129), bx_digital V3 | width and meter references | free or commercial (F/S, S4) | no | yes (MSED / Correlometer VST/VST3/AU/AAX; Imager free VST2/VST3/AAX/AU; S, S4) | host candidate / reference | Copy the Focus and mono-below ideas. | S4 |

### 1c. Analysis and transcription

| Tool | Role | Licence (grade) | Browser? | Desktop host? | Action | Why | Source agents |
|---|---|---|---|---|---|---|---|
| Epoch folding on the sample-exact grid | kick/sub split, kick pitch envelope, sub pitch | own code (O1 method) | yes (plain JS possible) | no | offline Python first | 21,000 samples per beat at 44.1 kHz, no drift. Kick coherent (0.94–0.96), drone incoherent (0.03). No model needed for this track. | O1 (M0–M6), S5 |
| Demucs v4 (htdemucs) | stems | MIT, archived 2025 (F, S5) | no | no | offline Python | WAV out, same rate. CPU ~1.5× track length. | S5 |
| demucs-web | in-page stems | MIT (F, S5) | WASM in practice, main thread, 172 MB model, COOP/COEP, "0.1 to 0.3x real-time" (ambiguous) | no | reference / later | WebGPU falls back to WASM. The default model URL is remote, which conflicts with C2. | S5 |
| Basic Pitch | pitched notes | Apache-2.0 (F, S5) | basic-pitch-ts (F, S5) | no | offline Python | Range from A0. Velocity = confidence × 127. Bends ±2 st. MIDI tempo defaults to 120. Minimum note 127.7 ms drops 16ths unless lowered. | S5, H5 |
| drum2midi | drum MIDI | licence unread (F, S5) | no | no | offline Python, once the licence is read | GM 42/44/46 as separate notes, PPQ 960. Open-hat recall ~66% in its own table. | S5, H4 |
| adtof_plus_drum_transcription | drum MIDI | wrapper MIT; weights unknown (F, S5) | no | no | offline Python | Open/closed by sustain. | S5 |
| LarsNet | drum-kit split | weights CC BY-NC 4.0 (S, S5) | no | no | private experiments only | — | S5 |
| librosa (beat_track, pyin, segment) | grid, sub/bass pitch, sections | ISC (F, S5) | no | no | offline Python | pyin `fmin` must be ~30 Hz. `agglomerative` needs `k`. | S5 |
| madmom | downbeats, major/minor chords | code BSD, models CC BY-NC-SA (F, S5) | no | no | private experiments only | Not needed for Guidance: clap on 2 and 4 fixes the downbeat. | S5 |
| Meyda, web-audio-beat-detector | in-page features, tempo | Meyda MIT (O2 npm, S5); detector licence not stated | yes | no | adopt later (in-page scoring) | — | S5 |
| Essentia.js | MIR | AGPL-3.0 (O2 npm, S5) | yes | no | reference only | — | S5 |
| Omnizart, "Beat This!" ONNX | transcription, beats | MIT (F); Beat This title only (S) | no / unknown | no | not adopted | Output formats unspecified. | S5 |
| iZotope RX 11 Music Rebalance, Ableton Live 12.3 stems + Convert-to-MIDI | DAW stem features | commercial (S, S5; Ableton manual via Context7, O2) | no | RX: ARA plugin (S, S5) | reference (ground-truth comparison) | GUI features, not pipeline parts. | S5, O2 |

### 1d. Platform libraries

| Library | Role | Licence (grade) | Browser? | Desktop? | Action | Why | Source agents |
|---|---|---|---|---|---|---|---|
| FaustWasm (+ faust2wam) | "create a new device" route | LGPL-3.0 (O2 npm, F H5); faust2wam licence not found | yes; precompiled = `index.js` + `dsp-module.wasm` + `dsp-meta.json`, no compiler (F, H5) | Faust also targets native plugins (U) | adopt when a new device is needed | `createOfflineProcessor` and sample-accurate `setParamValue` (F, H5). | H5, O2 |
| Cmajor export | "create" route | GPLv3/commercial; generated code yours (F, O2, H5) | yes (`--target=webaudio` and `webaudio-html` both appear in its PatchFormat docs; O2 round 1 via Context7) | CLAP and JUCE targets (S, O2 round 1) | candidate | About half native speed in WASM (its docs). | H5, O2 |
| WAM 2 API + SDK | browser plugin contract | MIT (O2 npm) | yes; SharedArrayBuffer optional | no | defer | No device needed for Guidance requires it. Make face mounting `(device) → Element`, as WAM `createGui` does. | O2, H5 |
| @tonejs/midi (or midi-file, midi-writer-js, jzz) | .mid read/write | MIT (O2 npm; README F) | yes | yes (JS) | adopt (vendored) | For .mid interchange. `analysis.json` is the main contract (section 3). | O2 |
| DAWproject | export to desktop DAWs | MIT (F, O2) | n/a | n/a | later | Bitwig, Studio One, Cubase and others read it (F, O2). | O2 |
| webaudio-pianoroll | lead roll face | Apache-2.0 (F, O2) | yes (custom element) | yes (inside a webview) | candidate for the compact roll | Faceplate F-S2 found no permissive knob library. This is a roll, not knobs. | O2 |
| Tone.js | optional synth/effect library | MIT (F, H5) | yes | yes (inside a webview) | not adopted | No `set`/`get` contract (H5, S5). | H5, S5 |

### 1e. Desktop-hostable plugins (new, for the desktop direction)

These are the round-1 plugins that a desktop host could actually load, picked as the best per role. Formats are as the source agent reported them (grade in brackets). "Price" is as seen and approximate.

| Role | Free / open candidates | Commercial candidates | Note |
|---|---|---|---|
| Bass | jc303 (GPL-3.0; CLAP/VST3/LV2/AU, F); Mz101 (AGPL-3.0; VST3/AU/LV2, F); TAL-BassLine (freeware; VST3/AAX/CLAP, S) | Softube Model 82, TAL-BassLine-101 (price not found, S) | — |
| Poly / stab / pad | Surge XT (GPL-3.0, F); Youth106 (GPL-3.0+; VST3/AU/CLAP, F); Dexed (GPL-3.0; VST3/CLAP, F); OB-Xd (S); Vital (GPLv3 + commercial, F) | Arturia Jun-6 V, Cherry Mercury-8 (price not found, S) | — |
| Kick | Chow Kick (open source, S); Synsonic BD-808 (freeware VST/AU, S) | KICK 2/3 (price not found, S) | — |
| Drums | — | Microtonic (~$99, U); Roland Cloud TR-909 (S) | — |
| Ducking | — | Kickstart 2 (~€14, VST3, S); Duck (~$27, VST2/VST3/AU/AAX, S) | — |
| Compression | LSP (LGPLv3; CLAP/VST3/LV2, F); TDR Kotelnikov (free, S) | The Glue (~$99, S); Pro-C 2 (S) | — |
| Reverb / delay | Dragonfly (GPL-3.0; CLAP/VST3, S); Valhalla Supermassive (free, S); Voxengo Tempo Delay (free, S); WSTD DLAY (GPL-3.0; CLAP/VST3, S) | Valhalla VintageVerb / Room / Delay (~$50, S); Pro-R 2 (~$199, S); EchoBoy, Timeless 3 (S) | — |
| Saturation / EQ | Chow Tape (GPL-3.0, S); IVGI (free, S); TDR Nova (free, S); Spectrum Thief (free, VST3/AU, S); ZL EQ (AGPL, F) | Decapitator, Saturn 2, Pro-Q 4 (~$199, S) | — |
| Limiting, width, metering | LoudMax (free, S); Voxengo MSED and Correlometer (free, S); Youlean free tier (S); TAL-Chorus-LX (free, S) | TDR Limiter 6 GE (~$50–60, S); Pro-L 2, Ozone, MicroShift (~$99), Waves S1 (~$129) (S) | — |

**One caveat on all of 1e.** Hosting a plugin does not put it into the recreation loop by itself. Two things are also needed:
- The render-and-score loop (O1 P1) needs the host to render plugins **offline** and set every parameter from code. Native hosts generally can; it is not checked for any listed plugin.
- A song that uses commercial plugins can only be rendered on a machine that has them licensed.

That is why the in-house devices stay the default and plugins become optional inserts.

## 2. What to build, in order

**How this lines up with Faceplate.** Faceplate's order is:
1. Shared base, 12–19 days: device list, face registry with a generic fallback, one drawing loop, the `held` set, select and toggle widgets.
2. Strip Bench on top, 7–10 days.
3. All of it in a new folder.

The audio work below runs in the **same new folder** and on the same rule: **faces write through `seq.setParam(path)`**.

**Contract rules every step below keeps** (my synthesis of Faceplate §4 and S3's code check):
1. Every new parameter is addressable in at most three path segments (`track.unit.param`). `setParam` drops a fourth (S3, code read). Hence `bass.peq.b2gain`, not `bass.peq.b2.gain`.
2. New non-numeric parameters (`curve`, `loop`, `bNtype`, `slope`) are strings or booleans in the spec, so Faceplate's select and toggle widgets cover them.
3. Every new default reproduces today's sound. The archived render stays the regression baseline, until a deliberate "reference preset" changes it.
4. Faceplate's meters read `p.node` (compressor, limiter, sidechain). A worklet replacement must expose the same reading through a `reduction` getter fed by its port message, so faces need no change.

**Sizes are my judgement:** small = up to ~2 days, medium = ~3–7 days, large = more than a week. They assume the JS engine is kept (desktop shell, section 6a); a native rewrite (6b) multiplies them.

| # | Step | Agents behind it | Size | Depends on |
|---|---|---|---|---|
| 0 | **Scoring loop.** Export section WAVs (exists, at 44.1 kHz) and run O1's M0–M9 plus S4's per-band correlation procedure as an offline Python script on render and reference. Seed `K.impulse` so renders are repeatable. | O1 (P1), S4, S2 (seed), S3 (mute renders) | medium | decision 4 (audio files) for keeping the reference outside the repo |
| 1 | **Kick envelope.** `setValueAtTime(punch)` then `setTargetAtTime(tune, t, tau)`. New `tau` (0.005–0.1 s), `hold` and a two-point amp curve on `BUILD.kick`. Reference preset: punch ~264, tune ~51, tau 0.024, click 0, drive re-tested. Face: the pitch-drop curve (Faceplate's kick hero graph). | H1, O1 (M1, M2), S3 | small | 0 |
| 2 | **Sub as a ducked drone.** A continuous voice whose pitch follows a per-bar note list (C#1 with B0 once per eight bars), written as melody tokens with whole-bar sustains. Add `sub` to the kick's `duck` list. Note: a track's `notes` list cycles per hit across the whole song (`tr.noteIdx`, C), so per-bar pitch must use melody notation, not `notes`. | O1 (M4, M6), H1, S1 | medium | 1, 3 |
| 3 | **Sidechain extension.** `curve` (linear / dB-linear), retrigger without a step (ramp from the current value), `offset`. Fitted preset on the drone. `keyFrom` comes later with stems. | S1, H1 | small | — |
| 4 | **Bass placement and levers.** Per S3's order: lower `env`, set `drive` 0 or move the shaper before the filter (node order), tune the cutoff. Then a `slope` option (12/24, resonance split across stages), then `keytrack`. Score each step in the intro band. | S3, H2, O1 | small (params) + medium (reorder, slope) | 0 |
| 5 | **Delay filters in the loop.** `loop` switch (default off), `modRate`, `modDepth`, `drive`. | S2, H3 | small | — |
| 6 | **Freeverb on native nodes.** RT60 `size`, `damp` (Q ≈ −3 dB), `spread` in samples scaled by `sampleRate/44100`, `predelay`, `hp`. Acceptance: −60 dB within 15% of `size`, a constant dB slope, and a printed L/R correlation. Keep the seeded IR mode. Two sends (short and long) if the clap and the outro need both. | S2, H3 | medium | 0 |
| 7 | **Width.** `monoBelow` on the widener (side highpass), and `base` / `invert` on the chorus. Test stab `spread` ~0.73, or chorus mix 0.5–0.55, against the onset/tail profile. Exclude the hat-coincident steps when scoring (H4's confound). | S4, H3, H4 | small | 0 |
| 8 | **Hats and choke.** Parameters for `ring` and the metal high-pass. A sequencer choke rule: a closed-hat onset steals the open-hat voice (release ~5 ms, H4's unsourced choice). Clap tail in-voice vs send, by measured tail correlation. | H4, O1, S2 | small–medium | 0 |
| 9 | **`peq` device + offline match script.** Fit per element first, then per section on the master, written into section `set`. | S3 | medium | 0, 4 |
| 10 | **AudioWorklet infrastructure.** Module loading (file, or Blob URL under C2 for a web build); `addModule` per context, including in `Sequencer.render`; `selfcheck.js` stubs; the `reduction` getter convention (rule 4). | O2, S1, S4 | medium | decision 5 |
| 11 | **Meter device** (LUFS, true peak, multiband correlation, vectorscope). A worklet plus a canvas face, pinned in Faceplate's MASTER block. | S4, O1 (M9) | medium | 10 |
| 12 | **Keyed glue compressor** (sndfilter port). First A/B it against the native node at matched settings, then enable `scHp`. | S1 | large | 10, 11 |
| 13 | **True-peak lookahead limiter** with `drive` and the two profiles. Tune it after step 1 (kick crest) and step 12. | S4, H4 | large | 10, 11, 1 |
| 14 | **Bundle import** (section 3): patterns, melodies, progression, section `set` values. Stems as audio tracks only if decision 4 allows audio. | S5, H5, O2 | medium–large | decisions 4, 6 |
| later | Open303 port, Dattorro, ADAA, Faust "create" route, WAM or native plugin hosting (decision 1) | H2, S2, S3, H5 | large each | 10; decision 1 |

**Steps that can run beside Faceplate's base.** Steps 1–9 use only node types the studio already has, so they need no new `selfcheck.js` stubs (S2 checked this for Freeverb). They can run beside Faceplate's 12–19-day base. Their faces arrive with Strip Bench, and until then the generic fallback face covers them.

**Steps that wait for decisions.** Steps 10–13 are gated by decision 5. Step 14 is gated by decisions 4 and 6.

**Automation granularity.** The reports agree that section `set` plus `ramp` with `curve: 'expo'` covers ducking, filter sweeps, width and limiter (S1, S3, S4). The one exception is reverb or delay "throws", which are per event (S2). So per-point automation lanes are not on this list. Faceplate's `held` set is the only automation-related engine change needed now.

## 3. The offline pipeline

S5's bundle (`round3-S5.md`, §2b) is the **contract** between the Python front end and the page. The page never runs Python. It reads a folder:

```
bundle/<name>/manifest.json   tool versions, source sha256, thresholds   (display only)
bundle/<name>/analysis.json   the contract (below)
bundle/<name>/stems/*.wav     44.1 kHz float32, same length as source.wav  (only if decision 4 allows)
bundle/<name>/midi/*.mid      notes.mid (tempo meta = measured bpm), drums.mid (GM ch 10)  (interchange, not required)
```

**Fields the page needs from `analysis.json`, and where each one lands.** The page-side mapping is my design. It follows S5's notation mapping and checks it against `sequencer.js`.

| `analysis.json` field | Page target | Rule |
|---|---|---|
| `schema` | import guard | Refuse unknown major versions. |
| `tempo.bpm`, `tempo.swing` | `Song.bpm`, `Song.swing` → `seq.bpm`, `seq.swing` | O1: swing 0.06 is effectively straight. Import 0 unless measured. |
| `tempo.t0_s` | stem offset only | Bar 0 starts at `t0_s` in the source (0.568 s, O1 M0). An audio track plays its stem from `t0_s` at bar 0. Patterns ignore it. |
| `tempo.beat_samples` | sample-rate check | 21,000 holds only at 44.1 kHz (S5). Refuse, or resample, if the scoring render rate differs (decision 8). |
| `sections[] {name, start_bar, bars}` | `Song.sections[] {name, bars}` | Must be contiguous from bar 0. Keep `snap_bars` as a warning, since two spec boundaries sit 2–3 s off an 8-bar grid (S5). |
| `chords[] {bar, name, notes}` | per-section `progression` (chord names parsed by `Kit.chordNotes`) | Use `name` when it parses; otherwise the voicing is lost. Explicit `notes` would need a new field. The chord set is unsettled: C#m9/C#m11 vs Bmaj9 (H3; O1 P6 not run). |
| `tracks.<drum>.onsets[] {bar, step, vel, offset_ms}` | pattern strings, 16 chars per bar | `vel` ≥ 0.8 → `X`, ≥ 0.4 → `x`, else `o` (S5). Identical bars collapse into variants A, B, C…; `sections[].play[track]` gets the letter. `offset_ms` is dropped (no field in the event format). |
| `tracks.<pitched>.notes[] {bar, step, len_steps, midi, vel, bend}` | `melody` tokens (16 per bar; note name; `-` sustain; `.` rest; `!` accent when vel ≥ 0.8) | Use for lead, bass and sub (per-bar pitch; see step 2). Bends are dropped; a short bend between adjacent notes → `glide` (S5, H5). `midi` uses C4 = 60, the same as `Kit` (S5). |
| `tracks.kick.pitch_env {f0, fT, tau_ms}` | `seq.setParam('kick.punch', f0)`, `('kick.tune', fT)`, `('kick.tau', tau_ms/1000)` | Needs build step 1 (`tau`). |
| `tracks.<t>.duck {depth, attack, hold, release, curve}` (new field, from S1's fit) | `'sub.sc.depth'`, `'sub.sc.attack'`, `'sub.sc.hold'`, `'sub.sc.release'`, `'sub.sc.curve'` | `sc` is the per-track sidechain unit `setParam` already routes. |
| `sections[].set {path: value}`, `sections[].ramp [{param, from, to, bars:[a,b], curve}]` (new fields) | the section's `set` and `ramp` | Filter sweeps (S3's per-bar method), send levels, and peq fits (`bass.peq.b2gain`). Every path at most 3 segments. |
| `targets {lufs_i, tp_dbtp, band_ratio_by_section, corr_profile}` (new field) | scoring only (meter device, limiter profile) | From M9 and S4's procedure. It never drives parameters directly. |
| `stems.*` | audio tracks (new instrument type: `AudioBufferSourceNode` scheduled at bar times; decoded into each context, including the offline one) | Only under decision 4, options b or c. |

**What the page does not take from the bundle:** micro-timing, pitch bends, velocity-as-loudness (Basic Pitch velocity is confidence, S5), and the .mid files. The .mid files are for opening the transcription in a desktop DAW. `@tonejs/midi` is enough if the page ever reads them. The bundle's `analysis.json` already holds bar and step positions, so the page needs no tempo-map logic.

**Grid caveat.** Basic Pitch writes MIDI at 120 BPM unless `midi_tempo` is set, and its 127.7 ms minimum note drops 16ths (S5). The front end must pass `midi_tempo` = the measured BPM and lower the minimum, or quantise from seconds itself.

## 4. Decisions the owner must make

Ordered so that each decision is made before the ones it gates.

1. **Desktop shell (new; gates the rest).** Details in section 6.
   - **(a) Electron or Tauri around the existing JS engine.**
     - Rules in: reuse of all code, the Faceplate UI and the build order above.
     - Removes C1–C3 friction in the app: local files, project save, a Python sidecar, headers.
     - Plugin hosting needs a native bridge, which is the hard part.
   - **(b) Native rewrite (JUCE C++, or Swift/AU on Mac).**
     - Rules in: first-class VST3/AU (and LV2) hosting and low-latency drivers.
     - Rules out: reusing the JS engine and the web UI, unless the UI stays web inside the native app.
   - **(c) Hybrid: native audio engine, web UI.**
     - Rules in: hosting, plus reuse of the UI.
     - Rules out: reusing the JS DSP. The engine is rewritten, or run through `node-web-audio-api` (coverage unverified).
   - **(d) Stay browser-only.** Rules out hosting real plugins.
2. **Repo licence** (no LICENSE today).
   - **Permissive (MIT etc.).**
     - Rules in: MIT, BSD, ISC, Apache and public-domain sources (Open303, Airwindows, sndfilter, libebur128, Freeverb, Basic Pitch, Meyda, Tone.js, webdx7).
     - Rules out: porting GPL/AGPL code (junox, Surge, Mz101, ZL EQ, Essentia.js).
     - With 1b or 1c it also requires a **commercial JUCE licence** (JUCE is AGPLv3 or commercial).
   - **GPL-3.0.** Rules in the GPL projects. Tracktion Engine's GPLv3+ option fits; JUCE's AGPL modules then bring the AGPL network clause.
   - **AGPL-3.0.** Rules in everything listed, including JUCE without a commercial licence. Anyone distributing or serving the app must offer its source.
   - **Unlicensed / private.** Keeps every option for personal use, including CC BY-NC models (madmom, LarsNet). Nothing can be shared as open source.
   - **Plugins.** Hosted third-party plugins are separate products under their own EULAs. Hosting them does not change the repo licence, but songs that use them carry their licensing.
3. **Where analysis runs.**
   - **Offline Python front end + bundle** (S5's pipeline). Rules in Demucs, epoch folding, Basic Pitch, drum2midi/ADTOF, librosa. In a desktop shell it can be a bundled sidecar process.
   - **In the browser or webview** (demucs-web, basic-pitch-ts, Meyda). Rules out drum transcription (no JS tool). The 172 MB model, main-thread WASM and ambiguous speed (S5) make it the slow path.
   - **Hybrid.** Python now; JS later for light features. **Recommended.**
4. **Audio files.**
   - **None anywhere.** Rules out stems as tracks, IR reverbs, sample devices, and keeping the reference next to the project.
   - **User-loaded at runtime, none in the repo.** Rules in stems, A/B, and O1's sample-device fallback. In a desktop app this is plain file access. **Recommended.**
   - **Audio in the repo.** Rules in bundled IRs (per-item CC tracking) and test fixtures, and makes the repo heavy.
5. **AudioWorklet (custom audio processors)**, for the JS engine (1a, 1d).
   - **No.** Steps 10–13 are dropped: no keyed glue, no true-peak limiter, no meter device, no Dattorro, ADAA or Open303.
   - **Yes.** Steps 10–13 proceed.
   - Tauri on macOS uses WKWebView; AudioWorklet there needs testing. A 2020–21 WebKit bug reported its absence in WKWebView (S, WebKit bug 182506). Electron uses Chromium, so the BCD Chrome figures apply.
6. **Song save/load scope.** The PRD lists it as out of scope. Faceplate's decision 1 (does v1 edit?) is the same question.
   - **In scope.** Rules in a song JSON (the in-page form of the bundle mapping above) and bundle import (step 14).
   - **Out of scope.** D2 and D3 stay blocked.
7. **Hosting headers and runtime network** (now only for a web build).
   - **Keep `http.server` + C2.** No SharedArrayBuffer, so no demucs-web threads; everything vendored.
   - **Small server with COOP/COEP.** SharedArrayBuffer tools work.
   - **Relax C2.** CDN and remote models are allowed, with trust issues.
   - In a desktop shell the app controls its own origin and files, so this mostly falls away (Electron header control is recalled, not verified).
8. **Sample rate.**
   - **44.1 kHz everywhere** (`new AudioContext({sampleRate: 44100})`, offline renders already 44.1 kHz in `studio.js`, C).
     - Integer grid (21,000 samples per beat), stems at native rate, Freeverb lengths canonical.
     - The device may resample. The spec warns that latency "may be affected, possibly by a large amount" (verified via Context7, round 1: https://webaudio.github.io/web-audio-api/).
   - **Device rate (often 48 kHz).** Lowest latency. The grid becomes 22,857.14 samples per beat, so scoring must resample.
   - **Live at device rate, scoring and export at 44.1 kHz.** **Recommended.** It needs Freeverb and delay lengths scaled by `sampleRate`.

## 5. What I was wrong about

1. **The kick figure in my round-2 Q4.** I wrote that "O1's simulation shows the swept kick alone peaking in the 30–80 Hz band at about 41–46 ms". That was O1's round-1 simulation of the *studio* kick, not the reference. The reference's 30–80 Hz peak is at 70–83 ms (M3). H1 read my sentence as a conflation with M2's broadband peak. My wording caused that.
2. **"Ask H1 about a single kick-bass voice."** My Q4 leaned toward merging kick and sub. The measurements say two objects: the drone is free-running, ducked and pitched per bar (H1, S1, O1 M4).
3. **The path `bass.peq.b2.gain`.** `setParam` routes at most three segments, so the fourth would be dropped. The right form is `bass.peq.b2gain` (S3, code read).
4. **Filter slope as "the" platform need for the bass.** My round-2 H2 critique asked for a 12/24 `slope` parameter as the fix. S3's simulation puts the filter envelope and post-filter drive first; a naive cascade made the band 4.4 dB *hotter*. H2's own model gives slope ~9 dB. The two models disagree. Slope is a third lever until a render settles it.
5. **The widener "widens the sub".** In my round-2 S4 critique I repeated this as today's fault. In the current song the widener sits only on the stab, which has a 180 Hz highpass, at width 1.1 (S4 round 3). It is a hazard of the processor, not today's problem.
6. **"More than half of the reimplement and port rows depend on AudioWorklet"** (round 2, decision 6). Too broad.
   - Freeverb, the tape-style delay, the band-limited widener, the chorus changes, `peq`, the saturator curves and the whole 300 Hz–1 kHz fix are native-node work (S2, S3, S4).
   - Worklets gate the keyed compressor, the true-peak limiter, the meter, Dattorro, ADAA and Open303.
7. **demucs-web as "WebGPU/WASM".** In practice it falls back to WASM on the main thread (S5 from the repo's experience report).
8. **The spec facts I passed on in round 1 as platform needs:**
   - "B1 sub", "first downbeat 0.58 s" and "L/R correlation 0.41" were all overtaken.
   - There is no B1 sub (M4). The grid offset is 0.568 s (M0).
   - 0.41 is a mid-band, step-dependent figure, and it is confounded with hats at the stab steps (O1 M7, H4).
9. **Round 1's "DAWproject-shaped JSON as the canonical project format".** For import, S5's bundle is the contract. DAWproject stays useful for *export* to desktop DAWs.
10. **Cmajor target name.** My round-2 question used `--target=webaudio` and H5 found `webaudio-html`. Both are right: the PatchFormat docs I read in round 1 list both.
11. **Scope, not error.** My rounds 1–2 placed every commercial or binary plugin under "reference only", because the platform was a browser. The owner's desktop direction makes many of them hostable (section 1e). The browser statements remain true for the web build.

## 6. Desktop platform options

All size and latency statements here are **my judgement** unless a grade is given. Search budget: 4 calls, all used.

**(a) Desktop shell around the existing JS / Web Audio engine.**

- **Frameworks.**
  - Electron: MIT, 45.0.0 published 2026-10-21 (O2 npm). It bundles Chromium, so the Web Audio behaviour is Chrome's and the BCD Chrome figures from round 1 apply.
  - Tauri: Apache-2.0 OR MIT, 2.12.4 (O2 npm). It uses the system webview: WebView2 (Chromium) on Windows, WKWebView on macOS, webkit2gtk on Linux (S: https://v2.tauri.app/de/reference/webview-versions/). AudioWorklet in WKWebView is unconfirmed: a 2020–21 WebKit bug reported its absence (S: https://bugs.webkit.org/show_bug.cgi?id=182506). Electron is the lower-risk shell for audio.
- **Plugin hosting** needs a **native bridge**.
  - Electron loads Node-API native addons (S: https://electronjs.org/ja/docs/latest/tutorial/native-code-and-electron).
  - Existing VST3 addons: `nvst3-host`, a Node-API addon with `Host` / `PluginInstance` classes and bundled VST3 SDK 3.8.0 (S: https://raw.githubusercontent.com/Henley04/nvst3-host/HEAD/docs/API.md; licence and maintenance not found). `vst.js` is experimental and macOS-only at the time (S: https://www.npmjs.com/package/vstjs).
  - The hard part is not loading the plugin. Audio produced in native code must get into Chromium's Web Audio graph and back:
    - in real time, through a shared-memory ring buffer read by an AudioWorklet (that needs SharedArrayBuffer, so cross-origin isolation in the app);
    - offline, through a synchronous native render that `Sequencer.render` can call per block.
  - Two clocks (Chromium's output and the plugin's process) add at least one buffer of latency and can drift.
  - AU and CLAP need their own bridges.
- **Latency.** Chromium's output path. `baseLatency` and `outputLatency` are exposed (BCD, round 1). Driver choice such as ASIO is not under app control (U). The bridge adds at least one block.
- **Licensing.** Electron or Tauri are permissive. The VST3 SDK is MIT from 3.8 (F, O2 round 1). Plugins carry their own EULAs.
- **Reuse.** Nearly 100% of the engine, the Faceplate UI, and section 2's order.
- **Cost (judgement):**
  - Shell plus local file access, save/load and a Python sidecar: small to medium (about 1–2 weeks).
  - A VST3 bridge with real-time and offline paths: large (months) and risky.
  - AU and CLAP: more on top.

**(b) Native app with the engine rewritten.**

- **JUCE (C++).**
  - Licence: AGPLv3 or commercial (F, O2 round 1). The current LICENSE.md names the "JUCE 9 End User Licence Agreement" (F, O2 round 1).
  - The JUCE 8 tiers seen in a forum summary (S: https://forum.juce.com/t/amendments-to-the-juce-end-user-licence-agreement-for-juce-8/61265):
    - Starter: free, ≤ $20k annual revenue.
    - Indie: $40/user/month or $800 perpetual, ≤ $300k.
    - Pro: $175/user/month or $3,500 perpetual.
    - JUCE 9 terms may differ; check before relying on these.
  - JUCE builds "VST, VST3, AU, AUv3, AAX and LV2 audio plug-ins **and plug-in hosts**" (F, O2 round 1). CLAP is not in that list.
- **Tracktion Engine.**
  - A JUCE module giving a DAW edit model and examples.
  - Licence: "GPL/Commercial", with commercial terms bespoke and priced per developer seat. A JUCE licence is still needed separately (F: https://github.com/Tracktion/tracktion_engine/; S: forum summary).
  - Its plugin formats are not named on the page.
  - It would supply arrangement, clips and automation, so less would be written from scratch.
- **Swift / AU on Mac.** AVAudioEngine with AUv3 hosting (U, recalled). Mac-only, so it fails "Mac or PC".
- **Plugin hosting:** first class for VST3/AU/LV2 through JUCE. CLAP would need the CLAP C API directly (MIT, F, O2 round 1).
- **Latency:** native drivers (CoreAudio, ASIO, WASAPI) with buffer-size control (U, recalled). The best of the four options.
- **Reuse.** The DSP *designs* carry over: every algorithm in sections 1–2 is published or ours. The JS code does not. The 13 synths, 10 processors, sequencer, render and Faceplate UI are rewritten, unless the UI stays web (option c).
- **Cost (judgement):** large. Several months to parity with today's studio before any new feature. Tracktion Engine shortens the DAW-model part.

**(c) Hybrid: native audio engine, web UI.**

- **Variants:**
  - **c1.** JUCE app with a web UI. JUCE's SPDX bill lists a "webview package", QuickJS and CHOC among its components (F, O2 round 1, from `JUCE.spdx.json`). What they enable was not read.
  - **c2.** Electron or Tauri UI talking over IPC to a native engine process (JUCE, Tracktion, or a Rust engine).
  - **c3.** Keep the JS engine but run it **natively** under `node-web-audio-api`.
    - BSD-3-Clause; Node bindings to the Rust `web-audio-api-rs`; prebuilt for Windows, macOS and Linux (F: https://github.com/ircam-ismm/node-web-audio-api; O2 npm 2.2.0).
    - Its README does not list support for AudioWorklet, OfflineAudioContext, WaveShaper, Convolver or DynamicsCompressor. The engine uses all but AudioWorklet today, so coverage must be checked against its web-platform-tests before relying on it.
    - In c3 a plugin bridge sits in the same native process family, which is simpler than crossing into Chromium.
- **Plugin hosting:** native (c1, c2), or a bridge on the engine side (c3).
- **Latency:** native engine latency (c1, c2). c3 depends on that implementation's backends; its README recommends JACK for low latency on Linux (F).
- **Licensing:** JUCE as in (b) for c1 and c2-with-JUCE. c3 is BSD-3 plus Electron MIT.
- **Reuse:** the Faceplate UI and the song and bundle formats in all variants. The JS DSP only in c3.
- **Cost (judgement):** c1/c2 large (engine rewrite, with the UI kept). c3 medium to large, but it hinges on unverified node coverage.

**My recommendation, staged.**
1. Ship **(a) Electron** first. It is the shortest path to a desktop app with file access, save/load and a bundled Python front end. It keeps every line of the engine and Faceplate, and section 2 proceeds unchanged.
2. Treat **plugin hosting as a separate, later decision**, taken once the render-and-score loop works with in-house devices.
3. If hosting is wanted, prefer **(c)** with a native engine (JUCE, or Tracktion Engine if its licence suits decision 2) over bolting a VST3 bridge onto Chromium's audio graph.
4. Spike **c3** for a week first: if `node-web-audio-api` runs `Sequencer.render` unchanged, the JS engine survives the move to native.

None of this is tested. It is ordering by cost and risk.

## Sources

Read this round (local): `transcripts/round3-H1.md` … `round3-H5.md`, `round3-S1.md` … `round3-S5.md`, `transcripts/round2-O1.md`, `docs/research/2026-10-23-faceplate-layout/REPORT.md`, `olde Havantechno dub studio/sequencer.js` (grep: `noteIdx`, `sampleRate`), `olde Havantechno dub studio/studio.js` (grep).

Fetched this round:
- https://github.com/ircam-ismm/node-web-audio-api
- https://github.com/Tracktion/tracktion_engine/
- https://registry.npmjs.org/electron, https://registry.npmjs.org/@tauri-apps%2Fcli, https://registry.npmjs.org/@tauri-apps%2Fapi, https://registry.npmjs.org/node-web-audio-api (registry metadata; URLs built from package names, each returned the package's metadata)

Search results this round (summaries only):
- https://forum.juce.com/t/amendments-to-the-juce-end-user-licence-agreement-for-juce-8/61265
- https://www.soundonsound.com/news/juce-8-development-platform-released
- https://raw.githubusercontent.com/Henley04/nvst3-host/HEAD/docs/API.md
- https://www.npmjs.com/package/vstjs
- https://electronjs.org/ja/docs/latest/tutorial/native-code-and-electron
- https://forum.juce.com/t/tracktion-engine-commercial-license-terms/35785
- https://v2.tauri.app/de/reference/webview-versions/
- https://bugs.webkit.org/show_bug.cgi?id=182506

Carried from my rounds 1–2 and cited above: https://webaudio.github.io/web-audio-api/ (Context7), https://github.com/juce-framework/JUCE/tree/master, https://github.com/juce-framework/JUCE/blob/master/LICENSE.md, https://github.com/juce-framework/JUCE/blob/master/JUCE.spdx.json, https://github.com/steinbergmedia/vst3sdk, https://github.com/free-audio/clap, https://github.com/bitwig/dawproject, https://github.com/Tonejs/Midi, https://github.com/g200kg/webaudio-pianoroll, https://github.com/webaudiomodules/webdx7, https://registry.npmjs.org/@mdn%2Fbrowser-compat-data.

All other facts are taken from the named agents' files at the grade they gave, and their URLs are in those files.
