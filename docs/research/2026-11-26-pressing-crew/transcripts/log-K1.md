# K1 log: sampled TR-909 voices (Rob Roy set)

Pressing Crew, K1 (engine builder). 26 November 2026, 19:46 EST (27 November 00:46 UTC).

The owner: "This isn't for commercial release so include the samples as well as a loading option for later in case I eventually do release."

The set's terms (app/assets/tr909-robroy/TR909SET.TXT): "Please feel free to copy or distribute the set in any way. Please DO NOT change samples, add samples, delete samples, or modify this text file in any way. Respect the work. This sample set is FREE. You may not distribute these samples for profit!!"

Nothing in app/assets/tr909-robroy/ was written, renamed or added: the files are listed and read only. Nothing under local/ was read. No commits.

## What is built

- `app/engine/sampled909.js`, global `Sampled909`: `types()`, `has()`, `spec()`, `create(ctx, type, opts)`, `load(ctx, {types, base})` -> `{loaded, missing}`, `ready(ctx, types)`, `available()`, `loadFiles(ctx, files)` -> `{loaded, missing, unknown}`, plus `pick(type, params, ev)`, `parse(name)`, `typesIn(seqOrDoc)`, `sampledOf('bd909')`, `synthOf('bd909s')`, `buffer(ctx, file)`, `setBase`, `base`, `manifest()`, `GAIN`.
- Types: bd909s sd909s lt909s mt909s ht909s rs909s cp909s ch909s oh909s cr909s rd909s. None collides with a drums.js type.
- `tools/robroy-manifest.js` writes the folder listing into the module's MANIFEST block (`--check` exits 1 on a difference).
- `tools/sampled909-check.js` (Node, fake context; `--browser` adds the Chromium measurements).
- One line in `app/engine/synths.js`, after the Classics fallback: `Synths.create(ctx, 'bd909s')` reaches `Sampled909.create`.

## How a knob maps to a recording

Each parameter keeps the name, range, unit and default of the synthesized voice (bd909 tune/attack/decay, sd909 tune/tone/snappy, toms tune/decay, ch909 and oh909 decay, cr909 and rd909 tune, level). The value maps linearly over its range onto the panel's 0 to 10 scale (linear because drums.js's ranges are R + VR x C time constants or octave and dB scales of a linear pot). A hit plays the recorded combination nearest to the knob positions: Euclidean distance on the 0..10 scale over the voice's knobs, ties to the higher settings (so the knob moves in the recorded steps 0, 3, 7, 10, or 0, 2, 4, 6, 8, 10 on hats and cymbals). The constrained grids work the same way: bass drum attack 10 exists only at decay 0 and 10, snare snappy 0 only at tone 0, so attack 10 + decay 7 plays BT?AADA and tune 10 + tone 6 + snappy 0 plays STAT7S3. No interpolation, no time-stretch, no pitch shift. `between` (sd, toms, crash, ride; 0 by default, basis 'prior') bends the playback rate by the tune left over between steps on the synthesized voice's octave scale; the recordings span about 0.9 octave over the tom Tune knob (LT 68 -> 127 Hz by zero crossings), 0.83 on the snare (134 -> 238 Hz) and 1.04 on the crash by length (1.109 -> 0.540 s), close to drums.js's one octave. The bass drum Tune is the pitch-envelope depth (early pitch 109 -> 172 Hz, tail 55 -> 61 Hz), so no rate bend there.

Defaults play: bd BT0AAD0, sd ST7T3S7, lt/mt/ht ?7D3, rs RIM63, cp HANDCLP1, ch HHCD0, oh HHOD4, cr CSHD6, rd RIDED6 (snare tune, crash and ride tune and oh decay sit exactly on a boundary at their defaults and resolve upward).

Levels: ev.step 0 / 1 / 2 = -18 / -9 / 0 dB, else accent 1 and no accent 0.5, times ev.vel: drums.js's ampOf9. Rim shot and clap: step 2 (or ev.accent without a step) plays RIM127 / HANDCLP2, else RIM63 / HANDCLP1. That HANDCLP2 is the higher velocity is a prior read from the name order only: HANDCLP1 has the longer tail above -40 dB (0.45 against 0.37 s), which would fit a louder hit, so it could be the other way round. RIM63 and RIM127 differ in 1478 of 3538 bytes and have the same length.

Choke: one hat channel as drums.js ('hat909s' group, per context): any new ch909s or oh909s hit fades the live ones over 5 ms and stops them. It is not shared with drums.js's 'hat909' group, so a sampled and a synthesized hat do not choke each other.

Combination files CLOP1-4 and OPCL1-4: left out as voices. Each is two hits at a fixed spacing (CLOP: closed then open after about 250, 80, 410, 40 ms; OPCL: open then closed after about 310, 220, 150, 480 ms by the 10 ms peak envelope); as a voice it would add a hat the pattern did not ask for at the recording's own tempo. The manifest knows them, no kit decodes them, and the browser check uses OPCL3 as a reference for the choke.

Set quirks the manifest found: BT0A0A7.WAV is the tune 0 / attack 0 / decay 7 bass drum with A for D in its name (the only missing grid cell), read through an alias table, file untouched. RIDED4.WAV and RIDED6.WAV are byte-identical; both are used as named and the ride Tune label says so.

GAIN (prior): the set was normalised per file, so the voice gains are the synthesized kit's step-2 peak at its defaults over the recording's peak, measured in Chromium:

| voice | synth peak dBFS | recording peak | GAIN | sampled peak |
|---|---|---|---|---|
| bd909s | -3.2 | -0.0 | 0.69 | -3.2 |
| sd909s | +0.1 | -0.0 | 1.00 | -0.0 |
| lt/mt/ht909s | -2.8 to -2.9 | -0.0 | 0.72 | -2.9 |
| rs909s | -7.1 | -0.0 | 0.44 | -7.1 |
| cp909s | -6.5 | -1.0 | 0.53 | -6.5 |
| ch909s | -3.6 | 0.0 | 0.66 | -3.6 |
| oh909s | -4.1 | -0.0 | 0.62 | -4.2 |
| cr909s | -2.1 | -0.0 | 0.78 | -2.2 |
| rd909s | -2.4 | -0.0 | 0.76 | -2.4 |

Peaks match by construction; the RMS does not (below), because the recordings' envelopes are the machine's, not drums.js's.

## Loading

- Base URL: `new URL('../assets/tr909-robroy/', <this script's folder>)`, from `document.currentScript` as worklets.js does; measured as `http://127.0.0.1:<port>/app/assets/tr909-robroy/` from both /app/ (script at engine/) and /app/solo/909.html (script at ../engine/). Electron's havantechno:// scheme: not measured (it needs fetch support on that scheme, as the worklet modules already do).
- Fetch once per page per URL, decode per context (a copy, as decoding detaches the ArrayBuffer). `create()` asks for its own voice's files only (52 for the snare, 6 for a hat); `load(ctx, {types})` for the voices given (all 11 by default). A hit whose recording is not decoded is silent and counted in `inst._missed`; later hits play once it arrives. A failed fetch is asked again by a later load.
- Absent folder (a commercial release): every fetch 404s or fetch is missing, `load` resolves `{loaded: [], missing: [152 files]}`, `available()` stays false, voices are silent, nothing throws; without the script tag nothing in the app changes (bd909s is then an unknown type, as before).
- `loadFiles(ctx, files)`: File / Blob with a name (FileList from an input with webkitdirectory works: the folder part of the name is dropped), `{name, data|buffer|arrayBuffer}`, or a map `{NAME: ArrayBuffer}`; names case-insensitive. The bytes are kept for the page, so a later OfflineAudioContext decodes them too (checked).

## Lines the owners of other files must add

V1 (host.js, sequencer.js; I did not edit them, and my measurements await `Sampled909.load` themselves):

- `app/engine/sequencer.js`, in `render`, directly after `var WL = root.Worklets, go = function () { try { build(); } catch (e) { reject(e); } };` (one line):
  `var S9 = root.Sampled909; if (S9 && typeof S9.load === 'function') { var g9 = go; go = function () { S9.load(octx, { types: S9.typesIn(dry) }).then(g9, g9); }; }`
  (the existing worklet line then calls the wrapped `go`: worklets, then the recordings the dry build uses, then the build).
- `app/engine/host.js`, in `host.start`, directly after `var W = root.Worklets, wl = (W && typeof W.load === 'function') ? W.load(ctx) : null;` (one line):
  `var S9 = root.Sampled909; if (S9 && typeof S9.load === 'function') wl = Promise.all([wl, S9.load(ctx, { types: S9.typesIn(ed.doc) })]);`
  The same line after the `W.load(c)` in the audio-options rebuild (host.js about line 1830, with `c` for `ctx`) avoids silent first hits on a new device. Live play does not depend on it: tracks added later load lazily on create.

Page owners (app/index.html and the solo pages): after drums.js, before or after worklets.js:
- app/index.html: `<script src="engine/sampled909.js"></script>`
- app/solo/909.html, 808.html, 303.html, d.html, 106.html: `<script src="../engine/sampled909.js"></script>` (909.html at least).
Leaving the tag out (or the folder out) is the commercial build.

system-editor.js ("+ track" menu): `drumTypes()` reads only `Drums.types()`, so add the sampled list: `function drumTypes() { var D = root.Drums, S = root.Sampled909; return (D && isFn(D.types) ? D.types() : []).concat(S && isFn(S.types) ? S.types() : []); }`, then a menu entry beside 'TR-909 kit':
`{ label: 'TR-909 kit (sampled)', disabled: !(root.Sampled909), run: function () { addDrumTracks(KITS['909'].map(function (v) { return v + '909s'; }), 'TR-909 kit (sampled)'); } }`.
A kit is one drums-family track per voice (type = inst = 'bd909s' and so on, the same as `addKit('909')`), so the HVT-909 panel, step levels and choke work unchanged. When `Sampled909.available()` is false the entry can say "(files not installed)" and offer `loadFiles` from a folder picker; `voiceLabel()` can use `Sampled909.nameOf(t) + ' (sampled)'`.

panels.js / facedefs.js (HVT-909 machine panel and its face): `V909` matches only the synthesized types, so the panel's `match` and the voice grid need the sampled types too (`Sampled909.synthOf(t)` maps a sampled track to its column). Every knob GRP909 shows exists on the sampled voice with the same name and range, so the knob code needs no change. A kit switch (SYNTH / SAMPLE / ROM) could sit by the model name: for each 909 track, set its type to `Sampled909.sampledOf(type)` or back with `Sampled909.synthOf(type)` and keep its params (names and ranges match; `between` and drums.js-only params such as start, hold, crush are kept by the document and ignored by the other voice). ROM voices (E1's ROM-driven hats and cymbals in drums.js) would be a third value of the same switch on ch/oh/cr/rd; if E1 keeps them as params of ch909 etc. (crush), the switch is simply "synth types" for those. The faces' drum heroes key on the type suffix `909`; sampled types end in `909s`, so facedefs would need `drumFace('bd909s', ...)` entries or a hero that draws the chosen recording's waveform (`Sampled909.buffer(ctx, inst._lastHit.file)`).

## Checks (exit codes read)

- `node tools/sampled909-check.js`: OK, 98 checks, exit 0 (manifest = folder and robroy-manifest --check; all 161 files parsed, none unknown, counts 24/52/16/16/16/2/2/6/6/6/6 + 8 combos + text; each grid as the text describes; spec parity with drums.js on every row; every panel knob present; every recording chosen at its own knobs; brute-force nearest over 41 positions per knob (68921 for bd and sd); step and accent gains; rim/clap velocity files; absence; 404; Synths.create fallback; catch-up; user files; choke both ways; sampled hats leave the synthesized hats alone; between).
- `node tools/sampled909-check.js --browser`: OK, 107 checks, exit 0.
- `node app/engine/selfcheck.js`: OK 469, exit 0 (one earlier run exited 1 at line 1284 while other agents were editing; reruns exit 0).
- `node tools/drums-check.js`: OK 342, exit 0. `node tools/synths-check.js`: OK 169, exit 0. `node tools/panels-check.js`: OK 183, exit 0. `node tools/browser-check.js`: PASS 26, exit 0.

## Measurements (headless Chromium, OfflineAudioContext 44.1 kHz, 27 November 00:40 UTC)

Load: 152 voice files decoded, 0 missing, 376 ms. Every rendered hit played the expected recording (step 2; length to -60 dB of the peak):

| voice | min knobs | default | max knobs |
|---|---|---|---|
| bd909s | BT0A0D0 0.112 s | BT0AAD0 0.118 s | BTAAADA 0.496 s |
| sd909s | ST0T0S0 0.188 s | ST7T3S7 0.191 s | STATASA 0.301 s |
| lt909s | LT0D0 0.366 s | LT7D3 0.486 s | LTADA 0.731 s |
| mt909s | MT0D0 0.230 s | MT7D3 0.314 s | MTADA 0.479 s |
| ht909s | HT0D0 0.245 s | HT7D3 0.307 s | HTADA 0.465 s |
| ch909s | HHCD0 0.053 s | HHCD0 0.053 s | HHCDA 0.155 s |
| oh909s | HHOD0 0.263 s | HHOD4 0.409 s | HHODA 0.527 s |
| cr909s | CSHD0 1.119 s | CSHD6 0.742 s | CSHDA 0.550 s |
| rd909s | RIDED0 1.176 s | RIDED6 0.804 s | RIDEDA 0.550 s |
| rs909s step 0/1/2 | RIM63 -26.4 dB | RIM63 -17.4 dB | RIM127 -8.4 dB (0.050 s) |
| cp909s step 0/1/2 | HANDCLP1 -26.3 dB | HANDCLP1 -17.3 dB | HANDCLP2 -9.0 dB (0.46 / 0.38 s) |

(the rs/cp step-2 peaks above are from the first run, before GAIN was set from the table; with GAIN they peak at -7.1 and -6.5 dBFS.)

16-step groove, 125 BPM, steps on the beats at level 2, others 1 (bd 0 4 8 12, sd 4 12, ch 12 hits, oh 2 6 10 14, cp 12, rs 7, lt 13, mt 14, ht 15, cr 0, rd 3 11). Peak / RMS dBFS, sampled | synthesized:

| | sampled | synthesized |
|---|---|---|
| mix | +6.4 / -17.2 | +6.6 / -15.6 |
| bd | -3.2 / -22.7 | -1.7 / -17.6 |
| sd | -0.0 / -22.0 | +0.7 / -24.6 |
| lt | -11.9 / -33.0 | -11.5 / -31.1 |
| mt | -11.9 / -34.8 | -11.3 / -31.0 |
| ht | -11.9 / -36.3 | -11.5 / -31.0 |
| rs | -16.1 / -46.4 | -15.5 / -55.4 |
| cp | -6.5 / -43.6 | -6.5 / -38.9 |
| cr | -2.2 / -23.9 | -2.1 / -25.7 |
| rd | -11.4 / -33.2 | -11.4 / -33.7 |
| ch+oh | -3.5 / -27.3 | -3.6 / -30.5 |

The mixes sum over full scale in both kits (no master chain here); in the app the track gains (0.8) and the master limiter apply. The sampled kick at its default (decay knob 0.6 -> D0, 0.118 s) is 5 dB lower in RMS than the synthesized default kick: the synthesized decay default (35 ms time constant) is longer than the machine at decay 0.

Choke by measurement (oh at max decay, HHODA, at 50 ms; ch at 150 ms; RMS in 160..400 ms): oh alone -25.4, ch alone -33.5, both -33.5 dBFS: after the closed hit only the closed hat sounds. Before the closed hit (100..149 ms) oh alone and both are both -18.2: untouched. The set's OPCL3 (closed onset at 0.155 s) has -31.5 dBFS RMS 60..140 ms after the closed onset, against -23.2 for the unchoked HHODA at that time and -26.3 / -21.0 for the closed hats HHCD4 / HHCD8 alone (HHCD0 is over by then): consistent with the machine cutting the open hat, with the closed hat in that recording set somewhere above decay 0. The per-file normalising makes this a consistency check, not a level match.

## Not verified

- The Electron havantechno:// scheme (fetch of the WAVs there) and the solo pages playing a sampled kit (only the base URL was measured from /app/solo/).
- Live AudioContext playback through Host.start (needs V1's lines); only OfflineAudioContext renders were measured.
- Which HANDCLP file is the higher velocity (named order taken; the tails suggest it may be the reverse).
- Whether a real 909's knob scale is linear in drums.js's units: the mapping is linear over the synthesized range, so a preset written for the synthesized voice lands on the nearest recording by panel position, not by matched sound.
- `between` on the cymbals uses the drums.js octave scale; the recordings' crash span (about 1.04 octave by length) supports it, the ride's (1.166 -> 0.540 s, about 1.1 octave) too, but neither was measured by pitch.
