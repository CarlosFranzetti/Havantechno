# log-E1: engine builder (HVT-D note priority, HVT-106 bucket-brigade chorus, HVT-909 sample ROMs)

Started 2026-11-26 19:26 ET (00:26 UTC, 27 November); this log written 19:50 ET (00:50 UTC).

The owner's three decisions, as the coordinator's brief quotes them:

1. HVT-D note priority: "A switch: add a setting with both behaviours; default to lowest note like the hardware".
2. HVT-106 chorus: "Realistic, switchable: model the hiss and filtering, with a control to turn the hiss down or off".
3. HVT-909 hats and cymbals from a ROM file: "Yes, add it: the app checks the file's checksum and plays it; the file stays on your machine and never goes in the repository".

A later message from the coordinator: the owner has supplied the real ROMs in the git-ignored `local/roms/tr909/`,
wants them included by default (picked up without a file dialog), and asked for a comparison with the two sample packs.

Files changed: `app/engine/classics.js`, `app/engine/worklets/classics-processor.js`, `app/engine/drums.js`,
`tools/classics-check.js`, `tools/drums-check.js`, one row in `THIRD_PARTY.md`. New: `tools/juno-bench.js`,
`tools/rom909-check.js`, this log. Nothing was committed. No ROM byte, slice, hash-derived data or decoded audio is in any
tracked file. The only ROM-derived numbers are statistics in this log (bit percentages, addresses, RMS per block, timings).

## 1. HVT-D note priority

- New row `modeld.priority`: enumeration `'low' | 'last'`, default `'low'`, basis `source`. Its label cites P2 (sections 1,
  4 and 14: "low-note priority", "lowest-key priority by default"). `MAP.modeld.priority` writes nothing to the processor:
  the event planner reads it.
- `'last'` runs `planD`, which is unchanged. One line was added to it to keep the other planner's note list current.
- `'low'` runs the new `planLow`. The planner keeps every note it has been given (start, end, pitch, velocity) and computes
  the timeline from the new note's time onward:
  - the gate is up while any note is held;
  - the pitch is the lowest held note;
  - each start time gets one trig, with slide 1 when an older note is still held (single triggering: no contour
    retrigger). A chord event (`ev.notes`) holds every key and so sounds its lowest note on one trigger.
  - It cancels and rewrites gate, pitch, trig, slide and vel from that time on.
- Why rewrite rather than append: `Host.audition` triggers at `currentTime` while the sequencer has already written notes
  up to 120 ms ahead. A planner that only appends cancels those notes' events. Notes stay in the list until 1 s after they
  end, so a later call that falls earlier in time still sees them.
- Glide is unchanged: the processor glides between legato pitches when glideOn is set.
- The fallback (plain nodes) uses the same planner output (`legato`, `midi`, `returns`, `off`). It has no out-of-order
  rewrite.
- Known and kept: in `'last'` mode an audition arriving under an already scheduled pattern note still cancels that note's
  pitch and gate (today's behaviour, unchanged by rule). I reasoned this from the code; no check runs it.
- Checks (classics-check section 5 and the end of section 7):
  - one held note under a higher one, a lower one taking over, the return to the next lowest held;
  - three overlapping notes with the return to the lowest of the remaining two;
  - a chord on one trigger;
  - two out-of-order merges on the stub node;
  - on a started `Host` (worklet stub context) with a modeld pattern track, after `scheduleAll`, two `host.audition` calls
    (one under and one over the pattern). The pattern notes keep their triggers and are merged legato.
  - The existing last-note-priority rows now create the instrument with `priority: 'last'` and pass unchanged.

**Request to the panel owner (panels.js, via the coordinator):** the HVT-D panel needs a two-way switch for `priority`
('low' / 'last'). Suggested caption: `KEY PRIORITY` with the positions `LOW` and `LAST`. Default `LOW`.

## 2. HVT-106 chorus: bucket-brigade lines

### What is built (classics-processor.js, `BBDF`, `BbdInput`, `BbdLine`)

- Each line is a model after Holters and Parker (DAFx-18):
  - 256 stages (MN3009; the KR-106 figure, via C2), so the store holds 128 samples;
  - a clock period Tb = (delay - filter group delay) / (N - 0.5), from the existing triangle LFO;
  - lines in antiphase, the delay ranges and rates unchanged;
  - an input anti-aliasing filter, evaluated exactly at each write instant. Its state is shared by both lines: it is one
    analogue filter;
  - an output reconstruction filter, which integrates the zero-order-held BBD output analytically from each read instant;
  - a charge-transfer loss per stage: a first-order FIR (1 - a) + a z^-1 at the BBD rate, a = N x 4e-4 = 0.1 (prior);
  - hiss: white noise from a seeded generator, added at each read, with an independent generator per line.
- The hiss passes through the output filter. At a slow clock its power falls more into the audio band, so the long line
  hisses more and the hiss swaps sides with the sweep. This is the effect Youth106 describes.
- The wet path is normalised to unity at DC. Dry 0.44, wet 0.56, modes off, I and II are kept. Renders are deterministic.
- Removed: the ideal linear-interpolated delay and the Junox 7237 / 10644 Hz one-poles (their `JU` constants are gone; no
  other file read them).
- Not modelled: clock feedthrough, the input soft clip, any compander (C3: the Juno-60 has none, from memory).
- Ported from BBDDelay by Jatin Chowdhury, BSD-3-Clause; the LICENSE was read on 2026-11-27 from raw.githubusercontent and
  a clone. I copied the five residues and poles of each filter (`src/BBDFilters.h` FilterSpec) and the structure of
  `BBDDelayLine` (even ticks write, odd ticks read, H0 = -sum r/p on the held value). I re-derived the time factors: BBDDelay
  raises exp(p Ts) to powers in seconds, which mixes units. Here every factor is exp(p dt) with dt in seconds, and the
  conjugate pairs are folded. The BSD notice is quoted in full in the processor; `THIRD_PARTY.md` has a new row.
- **Not read:** the Holters-Parker paper itself (C3 had only its abstract; I did not fetch it). The statement "the
  residues and poles are the Juno-60's" rests on BBDDelay's comment ("Root/Pole analysis borrowed from the above paper").
  I also did not read the MN3009 datasheet (stages, charge loss) or Raffel and Smith (DAFx-10).
- The delay target: Juno60's measured 1.66 to 5.35 ms is taken as the whole wet path. The filters' DC group delay (68 µs
  in, 21 µs out) comes off the BBD's share.

### Spec changes (juno)

- `chorusNoise`:
  - default 0 -> **0.1**; basis paper -> **prior**; label rewritten.
  - 0 turns the hiss off; the level is linear.
  - At the default the hiss is about -59 dB re one voice's dry RMS (A2, default patch, chorus off: -22.3 dBFS RMS), that
    is -81 dBFS. At 1 it is -39 dB re one voice (-61 dBFS).
  - Nobody has measured a unit. The default is a guess that the hiss is audible in a quiet passage and masked in a mix.
- `chorus`: the label is extended to name the BBD model. Value and options are unchanged.
- The processor's `chorusNoise` descriptor default is also 0.1 (classics.js writes the spec value in any case).
- A bench-only input: with `Classics.create(ctx, 'juno', {_probe: true})` the node gets one input summed into the voice bus
  before the HPF. It is not a parameter and not used elsewhere. tb303 already uses the same pattern.

### Bench (`node tools/juno-bench.js`, Chromium worklet path, 44.1 kHz)

- `--proc` serves an older processor in place of the current one, so before and after are measured by one bench. The
  "before" snapshot was the processor with the bench input added and nothing else changed. It was kept in the scratchpad
  only: `tools/out/juno-bench-before.json`, `tools/out/juno-bench-after.json`.
- Chorus filters, analytic (dB re DC), in / out / pair:
  - 5 kHz: -1.3 / -1.0 / -2.2
  - 10 kHz: -5.9 / -2.1 / -8.0
  - 12 kHz: -10.1 / -3.7 / -13.9
  - 15 kHz: -17.1 / -6.9 / -24.0
  - 18 kHz: -23.1 / -9.6 / -32.7
  - Before (two one-poles): 5 kHz -2.6, 10 kHz -7.4, 15 kHz -12.0, 18 kHz -14.4.
- Measured wet / input with noise, mode I, dB:
  - 5 kHz: -2.7
  - 10 kHz: -9.7 (before -7.4)
  - 12 kHz: -16.0
  - 15 kHz: -25.0 (before -11.9)
  - 18 kHz: -28.0
  - Mode II is the same within 0.7 dB. The passband gain is -0.06 dB.
- Delay sweep, impulse every 25 ms, wet peak lag:
  - I: L 1.70 to 5.32 ms, R 1.70 to 5.32 ms at 0.513 Hz.
  - II: L 1.68 to 5.34, R 1.66 to 5.35 ms at 0.861 Hz.
  - The left and right lags correlate at -1.00 (antiphase).
  - Before: 1.71 to 5.33 and 1.68 to 5.34 ms, at the same rates. The 40 µs short of 1.66 ms at the low end is the 25 ms
    sampling of the triangle's tip.
- Left/right correlation:
  - held A3: off 1.000, I 0.283, II 0.311 (before 1.000, 0.334, 0.362);
  - the chord progression: off 1.000, I 0.370, II 0.379 (before 1.000, 0.338, 0.346).
- Noise floor, no signal, chorus I:
  - chorusNoise 0: digital silence;
  - default 0.1: -80.9 dBFS (-58.6 dB re one voice);
  - 1: -60.9 dBFS (-38.6 dB). Mode II is within 0.2 dB.
  - Hiss level per 50 ms frame, left against right: correlation -0.93, so it swaps sides.
- CPU: render time of 16 s of the progression, best of three. The machine was shared with seven agents, so the figures are
  noisy.
  - Chorus off: 846 before, 859 to 1052 after (the voice is unchanged; this spread is the noise).
  - Chorus I: 1038 before, 1372 to 1721 after.
  - Chorus II: 1061 before, 1597 to 1655 after.
  - The chorus's own cost rose from about 0.19 s to about 0.5 to 0.8 s per 16 s, about 3 to 5 % of one core in realtime.
- Demos, 8 bars of Am F G Em, PWM pad, chorus II:
  - `tools/out/juno-chorus-demo-before.wav` (old engine at its default, hiss 0)
  - `tools/out/juno-chorus-demo-after.wav` (BBD at the default hiss 0.1)
  - `tools/out/juno-chorus-demo-hiss1-before.wav`, `tools/out/juno-chorus-demo-hiss1-after.wav` (hiss 1)
  - Left RMS 0.108 before, 0.110 after; peak 0.51 / 0.46.

### Not verified

- No comparison with a real Juno-60 or 106.
- The hiss level, the charge loss and the stage count are priors.
- The paper's own equations were not read.
- The 106's chorus depth per mode, which P3 lists as a conflict, is unchanged: both modes sweep 1.66 to 5.35 ms, the 60's
  measured figure.

## 3. HVT-909 hats and cymbals from the owner's sample ROMs

### API (drums.js)

- `Drums.loadRom(bytes, opts) -> {chip, verified, voices, ok, error, crc32, sha1}`.
  - `bytes` is an ArrayBuffer or typed array of one chip, a concatenation of 32 KB chips, or an array of them. For several
    chips it returns `{chips: [...], chip: 'a,b', verified, voices, ok, error}`. It never throws.
  - Identification by size: 32768 bytes. Anything else is refused, the 8192-byte firmware included.
  - Then by CRC32 and SHA-1 against C1's MAME values: `hat` HN61256P-PC43 (IC69) 2aaae11b / 22a34d60…; `crash` PC42 (IC62)
    dc61cf1a / bc730107…; `ride` PC44 (IC54) 01a9b435 / daa54c58….
  - C1 recorded all three, so no chip is accepted by size alone. An unknown image is refused unless
    `{allowUnverified: true, chip: 'hat'|'crash'|'ride'}` is passed (the size cannot tell the chips apart); it then plays
    flagged `verified: false`.
- `Drums.romStatus()` returns, per chip: loaded, verified, part, ic, file, expected and actual hashes, voices, source; plus
  `auto` ('off', 'loading', 'loaded' or 'none').
- `Drums.unloadRom(chip?)` is the way back to the synthesized buffers.
- `Drums.loadRomFrom(baseUrl)` returns a Promise.
- `Drums.romReady()` returns the auto-load's Promise.
- `Drums.romHash(bytes)`, `Drums.decodeRom(bytes)`, and the tables `Drums.ROMCHIPS` and `Drums.ROMWIN`.
- New spec row `rom` on ch909, oh909, cr909 and rd909: P(0, 1, 1), basis manual. 1 plays the ROM when its chip is
  loaded; 0 plays the synthesized buffer. With no ROM loaded the synthesized buffer plays either way, so the default sound
  of a machine without ROMs is unchanged.
- Auto-load: in a page, drums.js takes its own script URL and fetches `../../local/roms/tr909/<MAME file name>`, which is
  `local/roms/tr909/` at the repository root.
  - It asks for the hat chip first and the other two only if the hat chip is there.
  - A missing file is silent in code, and so is an empty 204 answer.
  - `window.HVT_NO_ROM_AUTOLOAD = true`, set before the script loads, turns it off.

### What the owner's ROMs show (`node tools/rom909-check.js`; it prints numbers only)

- Identification: all three chips match MAME's CRC32 and SHA-1. Both firmware files are refused by size.
- Decoding, settled from the data:
  - On the crash and ride chips D0 and D1 are 0 on every byte, and D2 to D7 are each 1 about half the time.
  - On the hat chip D0 and D1 are set only in the open hat's quiet tail (5015 bytes, from 0x3fc1). The six-bit latch IC68
    (B3, service notes) feeds the DAC six lines, so those two bits are dropped.
  - Mean step between neighbouring samples, in codes. D2..D7 offset binary is the smoothest by a factor of three to five:

    | Chip | D2..D7 offset binary | D2..D7 two's complement | D0..D5 offset binary | D0..D5 two's complement |
    |---|---|---|---|---|
    | Hat | 4.87 | 27.3 | 23.0 | 13.8 |
    | Crash | 5.42 | 24.7 | 21.5 | 18.0 |
    | Ride | 4.48 | 24.5 | 21.6 | 14.3 |

  - Every chip idles at byte 0x80, which is code 32. All of the last 256 bytes are 0x80 on the hat and crash chips, and
    222 of 256 on the ride chip. So silence is code 32.
  - Mapping used: code = byte >> 2, x = (code - 32) / 32, in -1 to +0.97. This matches Fraser's "6 bit ... shifted by two
    bits to occupy eight bits (unsigned)" (C1).
- Where the sounds are, measured as samples at least 2 codes from silence:
  - Open hat: window 0x0000 to 0x5FFF, sound 0x0003 to 0x5F18 (0.811 s at 30 kHz), decaying from RMS 9.4 to 1.4 codes.
  - Closed hat: window 0x6000 to 0x7FFF, silent at 0x6000, sound 0x6041 to 0x76B7 (0.192 s). It is a second recording
    with its own attack (RMS 11.5 codes in its first 1 K, against 1.4 at the open hat's end). The hat chip is therefore not
    one recording with two gates. It holds the two hats one after the other, in the address windows the service notes give
    (open stops at 0x6000; closed has the top bits forced, so it runs 0x6000 to 0x7FFF). B3's reading "the two hats share
    the tail" does not fit the data.
  - Crash: 0x0001 to 0x7E73 (1.079 s at 30 kHz). Ride: 0x0001 to 0x7ECC (1.082 s). Both decay through the chip.

### Playback

- Hats:
  - the window above;
  - read clock 30 kHz ("about 60 kHz divided by two", service notes; B3; no Tune on the hats);
  - stair steps (zero-order hold) at 4x the context rate, then a reconstruction low-pass. The notes name the filter
    without values; two 2nd-order sections at 12 kHz are a prior. The result is decimated into one buffer per context.
  - The VCA envelope is the existing hold + decay rows (unchanged defaults), and so is the choke (one hat channel). Gain
    0.9 on the decoded value, clamped at 0.98.
- Crash and ride:
  - the whole chip;
  - an address-derived exponential envelope (RA11, anti-log taper, Q71), CYM_ENV dB down at the last address;
  - the Tune row is the read clock: rate 30 kHz x 2^(tune + 0.5). Tune min is 30 kHz, Tune 0 (panel centre) 42.4 kHz,
    Tune max 60 kHz. Pitch and length move together.
  - Neither the cymbal clock nor the envelope depth is in C1 or B3. Both are fitted to the Rob Roy set (basis prior):
    - At Tune 0 the recordings last 1105 ms (CSHD0) and 1160 ms (RIDED0). The full chip at 30 kHz lasts 1092 ms.
    - At Tune 10 both last 535 ms, half that: one octave of travel, the spec's ±0.5 oct.
    - Peak to -20 dB: 845 / 430 ms (crash) and 695 / 380 ms (ride). These gave CYM_ENV 15 dB (crash) and 13 dB (ride).

Engine voices at their defaults (accent step, vel 1) beside the packs. Both packs are recordings of one unit through one
sampler: a reference, not the truth. `local/samples/tr909-pack/` turned out to be four of the Rob Roy files: Hat_closed =
HHCDA, Hat_open = HHODA, Crash = CSHD4, Ride = RIDED4; the measures are identical.

| Voice | Spectral centroid, Hz | Strongest line > 1 kHz, Hz | Peak to -20 dB, ms | Length to -60 dB, ms |
|---|---|---|---|---|
| ROM ch909 (decay 8 ms) | 5674 | 5534 | 20 | 60 |
| ROM ch909 decay max | 6108 | 4737 | 110 | 220 |
| Rob Roy HHCD0 / HHCD4 / HHCDA | 7752 / 8068 / 8127 | | 25 / 75 / 95 | 40 / 110 / 140 |
| ROM oh909 (decay 69 ms) | 6218 | 6804 | 125 | 420 |
| ROM oh909 decay max | 6068 | 6804 | 235 | 805 |
| Rob Roy HHOD0 / HHOD4 / HHODA | 8406 / 8232 / 8128 | 8032 | 145 / 185 / 260 | 250 / 395 / 515 |
| ROM cr909 Tune min / 0 / max | 5015 / 6849 / 10036 | 5513 / 7773 / 11003 | 860 / 575 / 435 | 1085 / 770 / 545 |
| Rob Roy CSHD0 / CSHD4 / CSHDA | 5813 / 6459 / 10156 | 5060 / 6180 / 10228 | 845 / 715 / 430 | 1105 / 900 / 535 |
| ROM rd909 Tune min / 0 / max | 6441 / 8626 / 12518 | 6202 / 4694 / 6632 | 795 / 695 / 490 | 1095 / 775 / 550 |
| Rob Roy RIDED0 / RIDED4 / RIDEDA | 7527 / 9274 / 12514 | 5534 / 7989 / 11477 | 695 / 480 / 380 | 1160 / 790 / 535 |
| synth ch909 / oh909 / cr909 / rd909 (for reference) | 6392 / 6282 / 6553 / 5193 | | 20 / 150 / 780 / 800 | 65 / 485 / 1090 / 1090 |

- Lengths and decays agree with the recordings across the knob ranges.
- The ROM hats are about 0.4 octave darker than the recordings (centroid 5.7 to 6.2 against 7.8 to 8.4 kHz).
- The ROM crash at Tune min is 0.2 octave darker (5.0 against 5.8 kHz), and its Tune max matches.
- A clock error would move pitch and length together. The crash's length matches while its centroid does not, so the gap
  is spectral shaping: my 12 kHz reconstruction prior, the real output filter and EQ, and the sampler. It is not the
  clock. I kept 30 kHz for the hats (service notes; Fraser's 32 kHz is close) rather than fitting it. A brighter
  reconstruction filter is the first thing to try if the owner hears the hats as dull.

### Checks

- `tools/drums-check.js` section 9 runs on SYNTHETIC images only: a 6-bit ramp in the open-hat window, decaying noise
  bursts elsewhere. It covers:
  - the CRC and SHA-1 test vectors;
  - refusal by size (1000 bytes, 8192 bytes, not bytes);
  - refusal by checksum, and refusal of allowUnverified without a chip; loading unverified with a chip, and the status;
  - exact decoding on every byte;
  - buffer lengths 24576 / 8192 / 32768 ROM samples at 30 kHz into 44.1 kHz buffers; rate 1 on the hats;
  - the crash at 2^0.5, 1 and 2 for Tune 0, min and max, with the stop time duration / rate;
  - the choke from a ROM closed hat;
  - peaks under 1.0, the ramp surviving the DAC model, the crash envelope;
  - `rom: 0` playing the synthesized buffer, an unloaded chip staying synthesized, an array with one bad image;
  - `unloadRom` as the way back.
- `tools/rom909-check.js` is OPTIONAL. It skips with a note when `local/roms/tr909/` is absent. With the owner's files it
  checks identification, the decoding evidence, the regions, the page's own auto-load (`romStatus().auto === 'loaded'`),
  the voices' peaks under 1.0, and prints the table above. 12 checks, exit 0.

### For the interface owner (a file menu; via the coordinator)

- Exact call, given the chosen file's bytes:
  `var r = Drums.loadRom(arrayBuffer); if (!r.ok && /checksum/.test(r.error)) { /* ask */ r = Drums.loadRom(arrayBuffer, {allowUnverified: true, chip: choice}); }`
  Several files: `Drums.loadRom([ab1, ab2, ab3])`.
  Status line: `Drums.romStatus()`. Back to synthesized: `Drums.unloadRom()`, or per voice the `rom` row set to 0.
- Suggested menu wording:
  - "Devices > TR-909 sample ROMs > Load ROM files… (hn61256p__c42.ic62, __c43.ic69, __c44.ic54; 32 KB each)"
  - "… > Use synthesized hats and cymbals"
  - Status text: "TR-909 ROMs: hat ✓ verified, crash ✓ verified, ride ✓ verified" or "… unverified (checksum unknown)".
- The files stay where the owner keeps them. Nothing is copied into a song or the repository. The song document needs no
  field: the `rom` rows are ordinary parameters.

### For the shell owner (Electron)

The page fetch works when the app is served over http(s) from the repository. From `file://` or the packaged app it does
not: `/^https?:/` is tested, so the auto-load stays off there. The shell needs to:

1. Read the three files from the app's data folder (suggested: `app.getPath('userData')/roms/tr909/`, plus the
   repository's `local/roms/tr909/` in a development run).
2. Pass their bytes to the page: preload `ipcRenderer.invoke('roms:tr909')` returning `[ArrayBuffer, …]`, then
   `Drums.loadRom(list)` after drums.js has loaded. No hashing is needed in the shell; drums.js checks.
3. Never bundle the files into the build. Build tooling must exclude `local/` (it is git-ignored already).

### For the owners of tools/serve.js and tools/browser-check.js

On a machine WITHOUT the ROMs, the auto-load's one request for `local/roms/tr909/hn61256p__c43.ic69` gets a 404. Chromium
logs that as a console error ("Failed to load resource"), which code cannot suppress.

- With `node -r <a preload that answers 404 for /local/>`, `tools/browser-check.js` fails 2 checks ("no console errors",
  "all app files load"). On this machine, with the ROMs present, it passes 26 of 26.
- Requested: both servers answer an empty `204` for a missing path under `/local/`. drums.js treats an empty body as
  "absent", so the probe is then silent everywhere.
- Until then, a page can set `window.HVT_NO_ROM_AUTOLOAD = true`.

### drums-score

- With the ROMs present (this machine): PASS 80, FAIL 25, exit 1.
- With /local/ hidden (the same preload): PASS 86, FAIL 19, exit 1, the recorded baseline.
- The 6 extra failures are rows written for the synthesized buffers, run on the ROM voices:
  - "sample clock from fold-over (30 kHz)" for ch909, oh909, cr909 and rd909. The ROM path's reconstruction filter removes
    the fold-over the row looks for. The row reads 38.5 to 40 kHz.
  - "decay time constant at min / max" for ch909 and "at max" for oh909. The recordings carry their own decay under the
    VCA.
- The score's owner may want to set `rom: 0` for those rows, or add ROM rows.

### Not verified, plainly

- The ROM-driven voices have not been compared with a real TR-909 by ear or by measurement. The only references are the
  Rob Roy recordings, one unit through one sampler.
- Unknown: the hat clock's exact value, the reconstruction filter's values, the address-envelope law (exponential, by
  depth fitted), and the cymbal clock range (fitted to two recordings).
- The ROMs' address and data lines are taken in MAME's order. The data's continuity under D2..D7 says the bit order is
  right; the addresses were not checked beyond the smoothness of each window.
- What the owner must supply: the three sample ROMs, `hn61256p__c42.ic62` (crash), `hn61256p__c43.ic69` (hi-hat),
  `hn61256p__c44.ic54` (ride), 32768 bytes each, in `local/roms/tr909/`. They are already there on this machine. The
  firmware (`tr909_v1/v4.ic609`, 8192 bytes) is not needed.

## Checks run (exit codes read directly)

| Command | Result | Exit |
|---|---|---|
| `node tools/classics-check.js` | OK, 131 checks (was 110 at P5) | 0 |
| `node tools/drums-check.js` | OK, 363 checks (was 342) | 0 |
| `node app/engine/selfcheck.js` | OK, 469 checks | 0 |
| `node tools/panels-check.js` | OK, 183 checks | 0 |
| `node tools/solo-check.js` | OK, 143 checks | 0 |
| `node tools/presets-check.js` | OK, 1907 checks | 0 |
| `node tools/tb303-bench.js` | written | 0 |
| `node tools/browser-check.js` | PASS, 26 checks | 0 |
| `node tools/drums-score.js` | 80 pass, 25 fail with the ROMs; 86 / 19 with /local/ hidden | 1 |
| `node tools/rom909-check.js` | OK, 12 checks | 0 |
| `node tools/juno-bench.js` | written | 0 |

Every Chromium run used its own server on a free port and closed it on exit.
