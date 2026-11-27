# Log G2: interface and pages integrator (second wave)

Showroom and Pressing Crews, second wave, 27 November 2026. Times Eastern (UTC in parentheses). Files: app/ui/panels.js
(exact edits), app/solo/909.html, solo.js, drums-solo.js, app/index.html, app/ui/system-editor.js, app/ui/windows.js,
app/ui/app.js (the wrapper removed), tools/browser-check.js, tools/panels-check.js, tools/solo-check.js,
tools/system-editor-check.js, README.md, app/README.md, app/CONTRACT.md (the Presets, Settings, Views and Sampled909
sections and the load-order line), docs/screenshots/ (new: app-909-sampled.png, app-presets.png, app-track-menu.png;
replaced: solo-909-desktop.png, solo-909-phone.png). Nothing under local/ was read; no real ROM image was used; no
commits; no stash, checkout, reset or clean.

## 2026-11-27 01:40 EST (06:40 UTC): what is built

**1. The HVT-909's voice source** (panels.js, `source909()` and `sourceBlock()`, reachable as `panel.kit.source`).
- SYNTH / SAMPLE / ROM and LOAD ROM… at the top of the panel on both layouts (landscape: in the header, the orange
  stripe shortened to make room; portrait: a 110-unit band above the voice grid, `portraitMachine` takes `head`/`headH`).
  Under them: the source of each group ("DRUMS: SAMPLE", "HATS + CYMBALS: ROM"; a mixed group is spelled per voice),
  the chips present ("ROM chips: hat ✓ crash ✓ ride —"), the reasons for any unavailable source, and a help line
  (replaced by the last message: a switch, or the per-file ROM results).
- SYNTH: every 909 track back to its synthesized type; the rom row set to 0 where a loaded chip would otherwise play.
  SAMPLE: every 909 track's `type` and `inst` to `Sampled909.sampledOf(type)`; names, variants and params kept.
  ROM: the four ROM voices to their synthesized type with the rom row 1, for the chips that are loaded; the other seven
  keep their source. One undo entry per switch that changes the document: inside `ed.group`, one snapshot (the same
  push on `_undo` that host.js's `snapshot()` does: the editor has no type-change operation), then the fields, then
  `commit()` (a structural change, so the Host rebuilds and keeps the transport playing).
- Unavailable: SAMPLE when `Sampled909` is absent ("the sampled kit is not on this page"), the manifest says the set is
  absent ("the sample files are not installed") or nothing says it is there ("the sample files are not loaded"); ROM when
  no chip is loaded ("no ROM images loaded": drawn `aria-disabled`, dimmed, and a tap opens the picker) or the engine has
  no `loadRom` (disabled). The picker is an `<input type=file multiple accept=".ic62,.ic69,.ic54,.bin,.rom">` the panel
  owns (removed with it); each file's bytes go to `Drums.loadRom`; the message per file is "<name>: hat chip verified by
  checksum" or "<name>: refused: its checksum matches none of the three 909 sample ROMs" / "refused: N bytes, a 909
  sample ROM has 32768". Unverified images are never offered `allowUnverified`. A verified chip switches its voices to ROM
  (one undo entry, or none when the rom rows are already on).
- `voiceType(t)` (synthOf for a sampled type, else t) in `voice()`, the machine's `kit()` and selection, and the hvt909
  `match`, so a sampled track is drawn and edited in its synthesized column (knobs, bank, mutes, accent row). The machine
  rebuilds the selected voice's trims when its device type changes (otherwise the trim row kept the synthesized voice's
  extra knobs after a switch).
- No maker's mark on the panel: "909", never "TR-909" (solo-check's MARKS caught "a real TR-909" in the page help).

**2. Tags and loading.** `engine/sampled909.js` then `engine/assets.js` after drums.js in app/index.html and
app/solo/909.html (G1's log, 01:06 EST). The 909 page (drums-solo.js) calls `Assets.ready(null)` at load: the manifest,
and the ROM images when it lists them (no context needed); before the first tap it reloads its opening document with the
most real source present per voice (ROM chips loaded → ch/oh/cr/rd synthesized with the rom row on; else the Rob Roy set
listed → sampled; else synthesized): the page's opening document, no undo entry. `Host.start` awaits `Assets.ready` for
the document's types; at start the page also calls `Assets.ready(ctx)` so every sampled voice is decoded and SAMPLE
switches without a gap. The "Load ROM files…" picker stays for a copy without ROMs. Requests made by the repository's
909 page with the tracked manifest: `../assets/manifest.json`, then at start the 152 voice files of `../assets/tr909-robroy/`
(no ROM request, nothing under local/).

**3. Track menu** (system-editor.js): "TR-909 kit (sampled)" after "TR-909 kit" (the eleven `*909s` voices, one undo
entry; disabled with "— not on this page" without sampled909.js, "— sample files not installed" when the manifest says
so); `drumTypes()` includes the sampled types, so "Drum voice…" lists them ("bd909s · Bass drum 909 (sampled)") and
Remove track works on them.

**4. Small integrations.** `Solo.boot({sections})` uses the given sections as they are (the tracks carry their variants);
drums-solo.js passes its bank song through it and no longer calls `host.loadDocument` behind the framework (same end
state: two one-bar sections A and B, no undo entry). windows.js: `firstView()` reads `Settings.get('view.deviceOpen')`
when a device has no remembered view ('controls' → Controls, else the panel); V2's `wrapWindows` and its call removed
from app.js (nothing else touched there). browser-check GLOBALS: Presets, Settings, Sampled909, Assets. CONTRACT.md:
W1's Presets section as written in log-W1.md, a Settings section, a Views section (Mixer, Sections, Export), a Sampled909
and voice-source section, and sampled909.js and assets.js in the load-order line.

**5. Documentation.** README.md rewritten for the owner (what it is, the five pages and how to run them, the quick start
with its numbered steps and the main-branch note, the four views, import and A/B, export, presets and patterns,
settings, desktop builds with macOS and Windows untested, the instruments and what was checked, the 909's three sources
and their terms, checks, layout, crews, licence). app/README.md: a current status, folder layout, keys, a check table of
this run, the sampled kit and the sources, module map rows, in progress, unverified items. Screenshots looked at:
solo-909-desktop/phone (source row readable, no overlap with the group titles at 1280 and at 390), app-909-sampled (the
panel in a device window with SAMPLE lit), app-presets (the Preset menu over a 303 window), app-track-menu.

## Verification (headless Chromium, scratch script, tools/serve.js on a random port, killed after)

1280×800 and devices['iPhone 13']: 71 of 72 pass.
- 909 page, tracked manifest: opens on SAMPLE (kick `bd909s`); ROM `aria-disabled` with "no ROM images loaded" drawn on
  the panel; started and playing (master peak 0.50); SYNTH → kick `bd909`, one undo entry, still playing, peak 0.50;
  SAMPLE → `bd909s`, one undo entry, peak 0.51; Undo brings SYNTH back. ROM tap opens a multi-file chooser; a synthetic
  32 KB image of random bytes and a 1000-byte file: "bad.bin: refused: its checksum matches none of the three 909 sample
  ROMs | short.bin: refused: 1000 bytes, a 909 sample ROM has 32768"; ROM stays unavailable. No overflow; no page or
  console errors; no failed request; no ROM or local/ request.
- "Present" layout (Playwright routes: a temporary manifest `{"tr909-rom": true, "tr909-robroy": true}` and SYNTHETIC
  chip images generated by the script in the scratchpad, never the real ones): the three ROM files are requested at load,
  before a tap; refused (their checksums are not Roland's), so the page opens on SAMPLE and shows the chips as absent; no
  errors. Then the same with the test patching `Drums.ROMCHIPS` (through a setter on `window.Drums`, test only) to the
  synthetic images' CRC32 and SHA-1, so the verified path runs end to end: drums SAMPLE, ch/oh/cr/rd ROM, ROM lit,
  "HATS + CYMBALS: ROM", "hat ✓ crash ✓ ride ✓"; plays (peak 0.49); SYNTH sets the rom rows to 0, one undo entry.
- App: "+ track" → "TR-909 kit (sampled)" adds the eleven tracks; the sampled kick plays (track meter 0.139, no missed
  hits); Remove track removes `bd909s` (10 left). No errors. **The one failure:** the app on the iPhone 13 profile has
  horizontal overflow (scrollWidth 726 at 390): the toolbar (`ap-right` group) is wider than a phone before anything is
  added. Not mine to change (app.js beyond the wrapper); the app is not laid out for phones; the instrument pages are.

Checks (run directly, exit codes read): see the hand-back; panels-check 202 (19 new rows), solo-check 151 (8 new),
system-editor-check 105 (8 new), browser-check PASS 30.

Bundler: `node tools/solo-bundle.js --all --test` passes the 303, HVT-D, HVT-106 and HVT-808 pages and fails the 909
page: its bundle has no `assets/manifest.json`, so that request 404s and assets.js then asks for the Rob Roy set (G1's
rule when the manifest cannot be read), 152 more 404s. With the set and a manifest, `node tools/solo-bundle.js
app/solo/909.html --test --asset-dir assets/tr909-robroy=app/assets/tr909-robroy --write-file
'assets/manifest.json={"tr909-rom":false,"tr909-robroy":true}'` passes at both sizes (178 files, 5,604,868 bytes); in
that bundle the page opened on `bd909s` and requested the manifest and 152 WAVs, nothing failed.

## Requests

- **To W1's owner (engine/presets.js), via the coordinator:** `Presets.machineOf` and the kit and pattern code match
  tracks by synthesized type only, so on a sampled kit the "Kits & patterns" menu lists the 909's entries but a kit or
  a machine pattern changes nothing (checked: no error, no change). Mapping a type through `Sampled909.synthOf` where
  tracks are matched would make kits and patterns work on either kit.
- **To G1 (engine/assets.js), via the coordinator:** when the manifest cannot be read, assets.js still asks for the Rob
  Roy set (152 requests that 404 in a bundle without it). Now that every page that loads assets.js has a manifest, not
  asking would leave a missing manifest as one 404 instead of 153.
- **To the owner of app.js / views.css (V2):** the toolbar overflows at phone width (726 px at 390).

## Not verified

- Nobody listened: the switch was checked by type, undo count and master meter only.
- The real ROM images were not used (rule); the verified ROM path ran with synthetic images and a patched checksum table.
- The Electron havantechno:// scheme with the sampled set and the manifest; the panel in an Electron child window.
- Kits & patterns on a sampled kit (above).
