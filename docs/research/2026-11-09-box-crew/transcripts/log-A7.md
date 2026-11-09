# log-A7: sampler program path (batch 1, B1)

Owner files: app/engine/synths.js, app/engine/programs.js (new), tools/synths-check.js. Nothing committed.

## Built
- programs.js (standalone, pure; loaded before synths.js in app/index.html, no dependency on other engine files):
  SFZ parse/write (round trip exact for regions), name parser, autoMap, slice, YIN detectPitch, WAV meta reader.
- Corrections (B1 section 14): SFZ import always sets global.gate = 1; loop_continuous without loop points takes the file's first smpl loop (opts.meta); fil_type defaults to lowpass (lpf_2p) when only cutoff is given; lpf_4p/hpf_4p map to lp24/hp24; pitch_keycenter=sample sets region.rootFile and takes the root from opts.meta (0 with a warning when none); lokey -1 kept (never plays from keys); WAV smpl/acid offsets are named constants marked UNVERIFIED in programs.js.
- synths.js sampler: dB-linear envelope model (DB_FLOOR 90 dB, linear attack, decay stops at sustain, release falls 90 dB); program trigger (keys from notes/midi/note/params.key + shift, velocity layers, lorand/hirand, seq round robin, pitch from key/root/keytrack/tune/transpose/fine, veltrack squared curve with -1..1, pan only when non-zero, filter with key/vel tracking and cents envelope, LFOs, vibrato, polyphony steal, note_polyphony, off_by/off_mode fast and normal). Registry keys 'off:<name>' for off_by. The single-buffer path is unchanged (program '' takes it).
- Wiring: create() takes opts.getProgram and opts.getMeta; panic() resets round-robin and seed state. Host passes getProgram (host.js line 217).
- Hold/decay/sustain/choke params on the sampler spec as B3 asked (attack max 10 s, release max 20 s).

## Decisions and open items
- DB_FLOOR = -90 dB is an assumption (named constant).
- Centre pan adds no StereoPanner (avoids a -3 dB law on centred hits).
- detectPitch onset changed to the first sample above half the peak (the loudest-sample onset found no window on a steady tone that peaks late).
- Open: WAV smpl/acid offsets not verified against a sampler-written file.
- Open: R8 (realtime smoke in the app) not attempted; needs the app page (A1/A6).
- Open: NOT checked - sequencer locks on sampler keys (B1 check 3) and the choke fade via registry across instances are covered only on the Node side.

## Verification (exit codes read directly)
- node --check app/engine/programs.js: 0
- node --check app/engine/synths.js: 0
- node --check tools/synths-check.js: 0
- node tools/synths-check.js: 0, OK: 161 checks passed (109 prior + 52 new in section 10)
- node app/engine/selfcheck.js: 0, OK: 375 checks passed (the brief said 340; the file has grown with A1's sections; not changed by A7)
- Chromium (Playwright, /opt/pw-browsers/chromium, offline render, scratch script outside the repo): R1 identity -240 dB, R2 880.17 Hz and 830.75 Hz (+-0.35 ct), R3 seam 23 dB without xfade and <0.1 dB with, R4 choke drop below -230 dB within 10 ms, R5 brightness proxy ratio 3.6, R6 levels 0.1 0.2 0.3 0.1 0.2 0.3 exact, R7 peak sum 0.089 (limit 0.09), page errors: none. R8 not attempted.

## Later change
- ev.hit (sequencer, per track hit index) now counts the sequential round robin when present; ev.step seeds the lorand/hirand draw. Without them the per-instrument counters are used. Checked: synths-check 161 (ev.hit case added), selfcheck 375, Chromium R1-R7 still pass with no page errors.

## Drums fallback (coordinator request)
- app/engine/synths.js, Synths.create: before the unknown-type branch, a type that Drums.has() is created by root.Drums.create(ctx, type, opts), so song tracks can use bd808, sd909 and the rest.
- app/engine/selfcheck.js (A1's file): one line changed, the load() list now includes 'drums' after 'synths'. This is the only change to A1's file.
- Checks after the change: synths-check exit 0 (161 passed); selfcheck exit 0 (375 passed).
