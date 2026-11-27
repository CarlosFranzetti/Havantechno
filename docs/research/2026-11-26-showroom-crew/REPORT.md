# Showroom Crew report: every instrument on its own page, with a sequencer, presets and pattern save and load

Scribe's report, written 27 November 2026 (ET) from the crew's written records only: `BRIEF.md` and `transcripts/log-W1.md`, `log-W2.md`, `log-W3.md`, `log-W4.md`, `log-G2.md` and `log-coordinator.md`. No check was run and nothing was measured for this report. What the coordinator ran itself is kept apart from what only an agent measured. Nobody has listened to any page, and no instrument has been compared with a real machine.

G2 worked for both this crew and the Pressing Crew in a second wave; its log is in this folder. The app was renamed Recut on 27 November; the instrument pages keep the HAVANTECHNO wordmark and their HVT names (log-coordinator.md, 02:02 EST). Names in the agents' logs predate the rename.

## 1. The question

The owner, as the brief quotes it: "make me a separate web artifact for each instrument as it is now ... each one should have a step sequencer like the behringer polyd or the drum machines should be like the actual machine so I can audition on the web add a save load for the sequencer and a presets engine as well in[c]or[po]rate that in the non artifact versions" (BRIEF.md).

Terms used below. A page (also called a solo page) is one instrument alone on the real engine and panel, under `app/solo/`. A bundle is the set of files a page is published from. A preset (a patch) is a stored set of an instrument's knob values; a kit is the same for a whole drum machine; a pattern is a stored sequence. A variant is one of a track's stored patterns, named by a letter.

## 2. Result in one paragraph

All five instruments (HVT-303, HVT-D, HVT-106, HVT-808, HVT-909) have their own page with a step sequencer, presets and pattern save and load, and the five were published privately to the owner; they were last rebuilt and republished at 02:02 EST (07:02 UTC) on 27 November, after the rename (log-coordinator.md). A presets and pattern engine with a factory bank of original patches, kits and patterns serves both the pages and the app's device windows (log-W1.md). The HVT-D has a monophonic sequencer of 16 or 32 steps with ratchets; the HVT-106 one chord of up to six notes per step; the drum machines eight pattern slots with A and B variations, an accent row, mutes and, on the 909, shuffle (log-W2.md, log-W3.md, log-coordinator.md). The 909 page carries the Rob Roy sample set and the owner's three ROM images and opens on them (log-coordinator.md). Flam and a pattern length shorter than a bar were not built because the song document cannot express them (log-W3.md). Every module check passed in the coordinator's own runs; nobody has listened, and nobody has opened the published pages inside the host's frame since the last build (log-coordinator.md).

## 3. What was built, per agent

**W1, presets and pattern bank (Opus).** `app/engine/presets.js` (global `Presets`), the live "Preset" menu in device windows (`app/ui/windows.js`), `tools/presets-check.js` (log-W1.md).
- The frozen interface plus a menu builder for the pages, `Presets.menu(button, {...})`, its signature recorded early for W2 and W3 (log-W1.md).
- Every value is checked against the instrument's specification on load, save and import; ids carry their type; loading a patch or pattern is one undo step; storage is the browser's localStorage under `hv.presets.v1` with a memory fallback, or `presets.json` in the app data folder in Electron (log-W1.md).
- Factory bank, original: patches tb303 8, modeld 8, juno 8; drum-voice presets four each for bd808, bd909, sd808, sd909 and three each for the other voices; kits hvt808 4, hvt909 4; patterns tb303 6, modeld 6, juno 6, hvt808 6, hvt909 6 (log-W1.md).
- Export and import as JSON text, never `eval`; Save as, Rename, Delete, Import and Export as forms inside the menu, since Electron has no `prompt()` (log-W1.md).

**W2, the page framework and the synth pages (Opus).** `app/solo/solo.js` as `Solo.boot`, page configurations `303.js`, `d.js`, `106.js`, the shared controls and the three synth definitions in `app/ui/panels.js` (log-W2.md).
- HVT-D sequencer: 16 or 32 steps; note, rest, tie, accent, glide and a ratchet of 2, 3 or 4 through the cell's repeat field, which the sequencer plays; record from the keyboard, transpose, clear (log-W2.md).
- HVT-106 sequencer: a chord of up to six notes a step, entered by tapping keys on and off, with chord names (Am, Cm7, Fm9, slash chords) and a copy to the next step (log-W2.md).
- Undo and Redo in the page bar; Patch and Pattern menus with Save, Copy as text and Paste text when `Presets` is loaded (log-W2.md).
- Original patterns: HVT-D Drive, Tied, Ratchet, Climb, Glider, Pulse; HVT-106 Offbeat, Pads, Garage, Pulse, Rise (log-W2.md).
- A LOW/LAST note-priority rocker on the HVT-D, added when E1 put a `priority` row in the engine (log-W2.md, log-coordinator.md).

**W3, the drum machine pages (Opus).** `app/solo/808.html`, `909.html`, `drums-solo.js`; in `panels.js` only the machine section, by exact edits (log-W3.md).
- Eight pattern slots; slot k's A and B are variant letters 2k−1 and 2k of every kit track, and two one-bar sections A and B; the play modes A, B and A then B are the transport's loop, so nothing is stored twice (log-W3.md, log-coordinator.md).
- An accent row, per-voice mute (the engine's mute, not stored in the document and with no undo entry), clear voice, clear pattern, copy A to B, tempo, and on the 909 shuffle in six positions (log-W3.md).
- Six original grooves per machine in slots 1 to 6, slots 7 and 8 empty; a phone layout with a voice grid and the sixteen keys in two rows of eight (log-W3.md).
- W3 found an engine fault: `drums.js` read the event's step number as the 909's weak, normal or accent level, while the sequencer puts the song's absolute step there, so sequenced 909 hits from step 2 on played at full level and an accent changed nothing (log-W3.md). The coordinator's log calls it "a bug the coordinator caused" with its round-robin edit of 9 November; E1 of the Pressing Crew fixed it (log-coordinator.md).

**W4, the bundler (Sonnet).** `tools/solo-bundle.js` turns a page into a publishable bundle and with `--test` opens it at 1280 by 800 and with an iPhone 13 profile (log-W4.md, log-coordinator.md).

**G2, second wave, interface and pages (Opus).** (log-G2.md)
- On the HVT-909 panel, a voice source switch, SYNTH, SAMPLE or ROM, and LOAD ROM…; one undo entry per switch; ROM images checked by checksum and refused when they match none of the three 909 sample chips; the panel shows which source each group uses.
- The 909 page opens on the most real source present (ROM chips for hats and cymbals if loaded, else the Rob Roy samples, else synthesized).
- "TR-909 kit (sampled)" in the app's track menu; `Solo.boot({sections})`; device windows read `Settings.get('view.deviceOpen')`; the `CONTRACT.md` sections for Presets, Settings, Views and Sampled909; `README.md` rewritten for the owner and `app/README.md` updated.

**The coordinator.** Made the one-line sequencer change so a step can carry a chord (a cell with more than one note in `notes` puts up to six on the event; the juno plays them, mono synths keep one note), because V1 held `sequencer.js` (log-coordinator.md, 19:17 EST). Changed the bundler three times: the drum pages may report the plain Web Audio engine; attributes on the page's body tag are carried into the bundle by an inline script (without it the 909 bundle ran as the 808); and `--rom-dir` carries the ROM images inside a script, because the hosting serves no file with a chip-image extension (log-coordinator.md).

## 4. What was checked, and by whom

**Run by the coordinator, exit codes read directly.**
- 26 November 19:52 EST (00:52 UTC), on one tree, all exit 0: selfcheck 469; presets-check 1907; panels-check 183; solo-check 143; classics-check 131; drums-check 363; synths 169; faces 2499; system-editor 97; step-view 72; widgets 157; processors 92; import-view 122; importer 20; analysis 26; views 144; shell-files 172; shell-separate 92; export-check 45; sampled909-check 98; browser-check PASS (26) (log-coordinator.md).
- The coordinator looked at `solo-d-desktop.png`, `solo-106-desktop.png`, `solo-909-desktop.png` and `solo-808-phone.png` (log-coordinator.md).
- 19:57 EST (00:57 UTC), `node tools/solo-bundle.js --all --test`: all five pass at both sizes; the worklet engine on the three synths and plain Web Audio on the drum machines; master peaks 0.47 to 0.53; no overflow, page errors, console errors or failed requests; the coordinator read each fragment's markup and checked the inlined styles for outside references (none) (log-coordinator.md).
- 27 November 01:50 EST (06:50 UTC), after G2: solo-check 151, panels-check 202, presets-check 1907, all exit 0; all five bundles pass `--test` at both sizes (log-coordinator.md).
- 02:02 EST (07:02 UTC), after the rename: all five pass `--test` at both sizes; the 909 bundle reports its three chips verified, the ROM source lit, no errors and no failed requests (log-coordinator.md).

**Measured only by the agents, not repeated by the coordinator.**
- W1: a Chromium run of 17 of 17 at 1280 by 800 and 390 by 844, and offline peaks of the synth factory patches from 0.261 to 0.678 at the instrument output (log-W1.md; log-coordinator.md says these were not repeated).
- W2: a Chromium run of the three synth pages, "ALL OK (44 rows)"; the 106 sounds six voices at once on chord steps (log-W2.md).
- W3: 45 of 46 in Chromium; 808 accent peak 0.337 to 0.499; the closed hat chokes the open hat on both machines; shuffle moves the off-beat onset from 0.196 s to 0.238 s on the 808 page. The one failure was the 909 accent, 0.527 to 0.510, from the engine fault above (log-W3.md).
- W4: only `303.html` existed when W4 finished, so W4 tested the bundler on that page alone (log-W4.md).
- G2: 71 of 72 in Chromium; the switch between sources keeps the machine playing with one undo entry; the verified ROM path ran end to end only with synthetic images and a checksum table patched by the test, never the real images (log-G2.md).

## 5. What changed in behaviour

- Instrument windows in the app have a working "Preset" menu (hidden for inserts, sends, master and channel windows) (log-W1.md).
- A sequenced step can carry a chord on the juno (log-coordinator.md).
- Told to the owner at 01:50 EST: 909 accents are 9 dB over a normal hit; the HVT-D takes the lowest note by default; the HVT-106's chorus has a little hiss and a darker top; the 909 has a source switch (log-coordinator.md).
- After the rename the pages write preset and pattern text that says `recut`; text that says `havantechno` still imports (log-coordinator.md).

## 6. What is open or unverified

- Nobody has listened to any page; checks used meters, offline renders, types and undo counts (log-coordinator.md, log-G2.md).
- Nobody has opened the published pages inside the host's frame since the last build; real phones and Safari were not tried, only Chromium's iPhone 13 emulation (log-coordinator.md, log-W2.md, log-W3.md).
- Not run in Electron: the presets storage file, two windows saving at the same moment (the last write wins, not solved), the taller HVT-D and HVT-106 panels in a device window, the machine bank row, the sampled set and manifest under the app's own scheme (log-W1.md, log-W2.md, log-W3.md, log-G2.md).
- Kits and patterns from the menu do nothing on a sampled 909 kit, because tracks are matched by synthesized type only (log-G2.md, log-coordinator.md).
- When the asset manifest cannot be read, the 909 page asks for the 152 Rob Roy files anyway, so a copy without them gets 153 failed requests instead of one (log-G2.md).
- The app itself overflows at phone width (726 px at 390); the pages do not (log-G2.md).
- Flam, a pattern shorter than 16 steps, and an accent on a step with no hit are not built; pattern changes take effect at once, not at the end of the bar (log-W3.md).
- The approximate fallback engine was checked only through its status text; the Download button and clipboard write were not inspected (log-W2.md, log-W1.md).
- Sharing the 909 page shares the samples and the ROM images; its foot says so (log-coordinator.md).

## 7. Where the records disagree

- Times. The coordinator dispatched the crew at 19:12 EST (00:12 UTC) and verified W4 at 19:17 EST and W1, W2 and W3 at 19:52 EST (log-coordinator.md). W2's log puts its build at 19:40 to 21:10 ET and its final runs at 21:25 ET, and says the coordinator added the chord line at 19:45 ET, where the coordinator's log has it at 19:17 EST (log-W2.md). W1's log at 19:30 ET still says the sequencer plays only one note per cell (log-W1.md). W4's only entry is dated 27 November about 00:40 ET (05:40 UTC) (log-W4.md). These times cannot all be right.
- The analysis check reads 26 rows in the coordinator's runs against 47 earlier; the coordinator's log calls the cause a presumption, not investigated (log-coordinator.md).
- Check counts differ between logs because they were taken at different moments of the same session (for example panels-check 149 in W1 and W2, 183 in W3 and at 19:52, 202 after G2); the coordinator's runs above are the ones on one tree (log-W1.md, log-W2.md, log-W3.md, log-coordinator.md).

## 8. Decisions for the owner

1. Listen to the five pages and say what is wrong in your own words; nothing has been heard.
2. Whether to share the 909 page, knowing that sharing it shares the Rob Roy samples and the ROM images (log-coordinator.md).
3. Whether kits and patterns should work on the sampled 909 kit; G2's request names the change (log-G2.md).
4. Whether flam and shorter patterns are wanted; they need a change to the song document's format (log-W3.md).
5. Whether the app (not the pages) should work at phone width (log-G2.md).

## 9. Files

`BRIEF.md`, `transcripts/log-W1.md`, `log-W2.md`, `log-W3.md`, `log-W4.md`, `log-G2.md`, `log-coordinator.md`, this report. Code named in the logs: `app/engine/presets.js`, `app/ui/windows.js`, `app/ui/panels.js`, `app/solo/solo.js`, `solo.css`, `303.js`, `d.js`, `106.js`, `303.html`, `d.html`, `106.html`, `808.html`, `909.html`, `drums-solo.js`, `app/ui/system-editor.js`, `tools/solo-bundle.js`, `tools/presets-check.js`, `panels-check.js`, `solo-check.js`; screenshots `docs/screenshots/solo-{303,d,106,808,909}-{desktop,phone}.png`, `app-909-sampled.png`, `app-presets.png`, `app-track-menu.png`.

## Coordinator's note (27 November 2026)

The scribe compiled this report from the crew's records and could not save files itself; the coordinator read it and saved it unchanged. The places where the records disagree are listed in the report as the scribe found them; the mismatched times come from agents writing clock times they did not read from the machine, and the coordinator's log is the one to trust for when something was verified.
