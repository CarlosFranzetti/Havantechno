# Pressing Crew report: version 0.2 (audio in and out, views, settings, builds), the 909's sampled and ROM voices, and research for version 0.3

Scribe's report, written 27 November 2026 (ET) from the crew's written records only: `BRIEF.md` and `transcripts/log-V1.md`, `log-V2.md`, `log-V3.md`, `log-E1.md`, `log-K1.md`, `log-G1.md`, `R1-plugin-hosting.md`, `R2-views-settings-distribution.md`, `N1-naming.md` and `log-coordinator.md`. No check was run and nothing was measured for this report. What the coordinator ran itself is kept apart from what only an agent measured.

Stated plainly, as the records state it: nobody has listened to anything; no instrument has been compared with a real unit; nothing new was run in Electron; the macOS and Windows builds and the GitHub workflow have never run (log-coordinator.md, log-V3.md, log-E1.md, log-G1.md).

The app was renamed Recut at 01:58 EST (06:58 UTC) on 27 November, by the coordinator, at the owner's choice; Havantechno stays as the maker's mark on the instrument panels and pages (log-coordinator.md). The agents' logs predate the rename and use the old names (`HavantechnoShell`, `.havantechno.json`, the application id `io.github.carlosfranzetti.havantechno`).

## 1. The question

The owner, as the brief quotes it: "I want the next version to have save and load and import/export audio (entire arrangement track and individual tracks and the compiled Mac pc and Linux versions available for download the version after will allow for loading vst/au for instruments as well as for processing fx. We should also have multiple views like ableton does and some settings like [Native Instruments]/ableton/logic for the audio settings and view settings. Do everything in parralel for that next version with subagents. And do more research as well." (BRIEF.md)

During the work the owner added the 909's hats and cymbals from ROM images the owner supplies ("Yes, add it"), a note-priority switch on the HVT-D, a realistic switchable chorus on the HVT-106, and three uploaded TR-909 archives with the words "This isn't for commercial release so include the samples as well as a loading option for later in case I eventually do release." (log-coordinator.md)

Terms used below. A stem is one track (or one effect return) exported as its own file. Dither is low-level noise added when reducing bit depth. dBFS is level relative to digital full scale; LUFS (loudness units relative to full scale) is the ITU-R BS.1770 loudness measure. A bundle is a project folder holding the document and its audio. A ROM image is a copy of the bytes of one of the 909's sample memory chips. A sidecar is a separate program run beside the app.

## 2. Result in one paragraph

Version 0.2 is built in the web app: audio export of the mix, stems or chosen tracks over the song, a section or a bar range at 16, 24 or 32-bit float; audio tracks with clips (not time-stretched); project bundles with relative paths and content hashes; audio options on the Host; a Mixer view and a Sections grid beside the arrangement and Step View; a Settings dialog; and an export dialog (log-V1.md, log-V2.md, log-coordinator.md). Packaging is configured with electron-builder and a GitHub workflow; one Linux AppImage was built and run by an agent, nothing else has been built (log-V3.md). The 909 can play its synthesized voices, the Rob Roy sample set (now in the repository with its own terms) or, for hats and cymbals, the owner's ROM images, which stay in a folder git ignores (log-K1.md, log-E1.md, log-G1.md, log-coordinator.md). A render started mid-song now matches the same bars of a full render, after G1 traced two causes (log-G1.md). Research for version 0.3 recommends hosting plug-ins in a separate native process, in stages (R1-plugin-hosting.md). Every module check passed in the coordinator's own runs, and the drum scorer stayed at its recorded baseline (log-coordinator.md).

## 3. What was built, per agent

**V1, audio in and out, engine (Opus)** (log-V1.md).
- `host.exportAudio`: one offline render per file; every file starts at the span's first bar with the same length and tail; 16-bit with TPDF dither (on by default at 16 bits only), 24-bit by default, 32-bit float; any sample rate; peak and LUFS per file. Stems are taken after each track's own strip with the master chain off by default, each send return as its own file.
- During an export the random numbers are seeded, and in `Sequencer.render` node disconnects are deferred to the next bar boundary, so stems and mix share the same noise.
- `app/engine/audiotrack.js`: audio tracks with clips on the arrangement, played at the file's own speed; clip editing operations, one undo step each.
- Audio options on the Host (output device, latency hint, sample rate; the last two rebuild the audio context).
- `Project.exportAudio`, `saveBundle` and `openBundle`: paths relative to the project file and a content hash per audio file.

**V2, views and settings, interface (Opus)** (log-V2.md).
- A view switcher with System Editor, Step View, Mixer and Sections; Tab switches within a pair, Ctrl or Cmd (or Alt) with 1 to 4 picks a view, Ctrl or Cmd with comma opens Settings, with Shift and E opens Export.
- Mixer: a strip per track with fader, pan, sends, mute, solo and peak meter, returns, and a master strip that says the engine has no master volume. Sections: tracks against sections, each cell the pattern variant played there, a launch per section, and a printed note that it is not free clip launching. The coordinator named it "Sections" on R2's advice.
- Settings with Audio, View and About tabs, remembered between runs; no buffer-size control, with a line saying a page cannot set the device buffer (the coordinator's ruling).
- An export dialog (24-bit default, the dither and equal-length statements, peak and LUFS per file) and an "Audio…" button that imports audio files as audio tracks.
- A written list of the Host calls real clip launching would need, for the version after.

**V3, builds and shell file calls (Sonnet)** (log-V3.md).
- `app/shell/files.js`: pickDirectory, writeFile, copyFile, joinPath, appVersion; writes only inside a folder granted in this run or the app's data folder; copyFile only from audio and `.sfz` files, stricter than briefed.
- Permission handlers for the app's own origin only: `media`, `speaker-selection`, `midi` and `midiSysex` (V3 found a plain MIDI request arrives as `midiSysex` under Electron 45).
- electron-builder 26.18.0 with `app/electron-builder.config.js`; ad-hoc signing on macOS when no identity is present, notarisation off; an icon drawn by a committed script; `.github/workflows/build.yml` with actions pinned to commit SHAs (actionlint found nothing); `docs/BUILD.md`.

**E1, engine instruments (Opus)** (log-E1.md).
- HVT-D: a `priority` row, lowest note by default or last note, the hardware's lowest-note behaviour taken from P2's research.
- HVT-106: the chorus as 256-stage bucket-brigade delay lines after Holters and Parker, with filter constants ported from BBDDelay (BSD-3-Clause, a `THIRD_PARTY.md` row); hiss on by default at `chorusNoise` 0.1, about 59 dB below one voice. E1 did not read the paper itself.
- HVT-909: `Drums.loadRom` and related calls; an image is accepted only when its CRC32 and SHA-1 match the three known chips; loading is opt-in. E1 settled the data format from the owner's images (data bits D2 to D7, offset binary, silence at code 32) and found the hat chip holds two separate recordings, open then closed, which contradicts the earlier reading B3.
- The 909 accent fault W3 found: accent 0 dB, normal −9 dB, a velocity under 0.5 −18 dB, so an accent is 9 dB over a normal hit through the real Sequencer.

**K1, sampled 909 (engine builder; its model and the time it was dispatched are not recorded)** (log-K1.md). `app/engine/sampled909.js`: eleven sampled voices playing the Rob Roy set, each knob choosing the nearest recorded setting, no interpolation; absent files leave the voices silent; `loadFiles` for a folder the user picks. `tools/robroy-manifest.js` found one misnamed file (read through an alias, the file untouched) and two byte-identical ones.

**G1, second wave, engine and shell integration (Opus)** (log-G1.md, log-coordinator.md).
- Sampled909 takes the same level rule as drums.js (+9.00 dB on accented steps through a real Host and Sequencer); start, context rebuild and render wait for the sampled voices.
- `app/assets/manifest.json` (tracked: ROM false, Rob Roy true) and `app/engine/assets.js` (`Assets.ready`); a set marked false is never fetched.
- Shell calls readRoms, importRoms and makeDirectory under the granted-folder rule; the packaged file list now includes `assets/` and excludes `local/` and `assets/tr909-rom/`.
- The mid-song render mismatch: trigger times that sat exactly on a sample frame landed one frame late about half the time, and the render used one random stream; G1 snaps such times and seeds the random draws per track and step.

**G2, second wave, interface and pages (Opus).** The 909's voice source switch and ROM loader, the sampled kit in the track menu, the Settings read in device windows, contract sections and the README. Its log is in the Showroom Crew's folder; the details are in that crew's report (log-coordinator.md).

**R1, R2 and N1, research (Sonnet).** R1 on plug-in hosting, R2 on views, settings, export formats and distribution, N1 on a new name; section 6 below.

**The coordinator.** Identified the uploads and computed CRC32 and SHA-1 of the five ROM files, which match the values recorded from MAME's source; ruled that the Rob Roy set goes into the repository whole with its text file and a `THIRD_PARTY.md` row, and that the ROM images and the 14-file sample pack go to the git-ignored `local/` folder until the owner says the repository is private. It also added `--rom-dir` to the bundler and did the rename as one scripted change over 62 tracked files, then edits by hand (log-coordinator.md).

## 4. What was checked, and by whom

**Run by the coordinator, exit codes read directly** (log-coordinator.md).
- 26 November 20:01 EST (01:01 UTC), all exit 0: selfcheck 469; analysis 26; browser-check PASS (26); classics 131; drums 372; export 45; faces 2499; import-view 122; importer 20; panels 183; presets 1907; processors 92; rom909 12; sampled909 98; shell-files 172; shell-separate 92; solo 143; step-view 72; synths 169; system-editor 97; views 144; widgets 157. drums-score 86 pass, 19 fail (exit 1, unchanged). The coordinator also ran `tools/juno-bench.js`: left and right correlation 1.00 with the chorus off, 0.28 and 0.31 in modes I and II.
- 27 November 01:50 EST (06:50 UTC), after G1 and G2: selfcheck 473, browser-check PASS (30), export 51, panels 202, sampled909 116, shell-files 227, solo 151, system-editor 105, the rest as before; drums-score unchanged. The coordinator checked by its own script that, in the 909 bundle built with the Rob Roy set and the owner's images, the three chips report verified and the ROM source is lit after start.
- 01:58 EST (06:58 UTC), after the rename: selfcheck 475, presets 1908, export 51, browser-check PASS (30), the rest unchanged; the app opened in headless Chromium titled "Recut" with no errors, and the coordinator looked at the screenshot.
- The coordinator looked at `app-mixer.png` and `app-settings-audio.png`, and checked that `git ls-files` lists nothing under `local/` and no file named `tr909-rom-images.js`.

**Measured only by the agents, not repeated by the coordinator** (log-coordinator.md says so for V1, V2, V3 and G1's figures).
- V1, in headless Chromium: export lengths exact to the frame at 44.1, 48 and 96 kHz; 16-bit undithered and 24-bit files equal to the render rounded; the 16-bit dither error 1.498 least significant bits peak; stems summed against the mix with the master off 6.2e-6 peak (−104.2 dBFS); a clip on bar 3 starting on frame 252 000 exactly; the whole 200-bar song 112.4 s for the mix and 463.4 s for all 15 stems; Chromium's memory peaked at 5.5 GB over the long run (log-V1.md).
- V2, against V1's calls: a fader drag with one undo entry; a section launch; an export of bars 33 to 34 at 24-bit giving a 5.81 s mix at −5.3 dBFS and −11.8 LUFS; no horizontal page scroll at 1280 by 800, 1440 by 900 and 1512 by 982 (log-V2.md).
- V3: a Linux AppImage of 126,120,538 bytes and a deb of 101,406,592 bytes, built here; the AppImage under a virtual display opened, served the worklet from the archive and reported the worklet engine for a tb303 (log-V3.md).
- E1: chorus filter responses, delay sweeps of 1.70 to 5.32 ms in mode I and 1.66 to 5.35 ms in mode II, a hiss floor of −80.9 dBFS at the default, a CPU cost of about 3 to 5 % of one core, and a table of the ROM voices beside the Rob Roy recordings: the ROM hats are about 0.4 octave darker than the recordings (log-E1.md).
- K1: 152 voice files decoded in 376 ms, every hit the expected recording, and a groove rendered sampled against synthesized (log-K1.md).
- G1: the section render against the same bars of a full render, master off, after the first bar, from −23.9 dB to −124.9 dB; per track after the fix, from −107 to −206 dB (log-G1.md).

## 5. What changed in behaviour

- Told to the owner: sequenced 909 accents are 9 dB over a normal hit; the HVT-D defaults to the lowest note; the HVT-106's chorus has a little hiss by default and a darker top (log-coordinator.md).
- Renders differ slightly from earlier ones: on-frame onsets up to 22.7 µs earlier and noise drawn per hit, about −24 dB relative on the stock song's first four bars; nobody has listened (log-G1.md, log-coordinator.md).
- A direct 909 trigger without accent or level now plays at −9 dB instead of −6 dB (log-E1.md).
- The toolbar's Export WAV becomes "Export…", with Mixer, Sections, Audio… and Settings beside it (log-V2.md).
- After the rename: the title and toolbar read RECUT; projects save as `<name>.recut.json`; the shell bridge is `RecutShell`; the application id is `io.github.carlosfranzetti.recut`; files and text that say `havantechno` are still read (log-coordinator.md).

## 6. Research for version 0.3 and the name

- R1 recommends a separate native host process slaved to the page's audio clock, with no audio device of its own, owning the plug-ins' editor windows; no native Node addon and no rewrite of the engine. Stages: an offline bounce through a plug-in with Pedalboard from the system's Python; a C++ sidecar that scans and bakes; live effects; instruments; editor windows; then CLAP and LV2. Not to attempt: VST2, hosting inside the app's own process, editors embedded in the page. Licences R1 read: the VST3 SDK is MIT, and "VST" may not be used in a product name; JUCE AGPLv3 or commercial. R1 loaded no plug-in and measured no latency (R1-plugin-hosting.md).
- R2 recommends equal-length stems from the span's first bar, 24-bit by default, dither only at 16 bits; bundles with relative paths and hashes; unsigned builds on a draft release with notarisation off and no auto-update; audio settings limited to what Web Audio offers. It read that Windows and macOS block unsigned apps unless the user takes manual steps, and that GitHub release files may be up to 2 GiB with up to 1000 per release (R2-views-settings-distribution.md).
- N1 proposed thirty names, ran one web search on each of fourteen, and shortlisted Recut, Stemma, Facsimile, Trazo and Retrace; trademarks and domains were not checked (N1-naming.md). The owner chose Recut (log-coordinator.md).

## 7. What is open or unverified

- Nothing new was run in Electron: the folder export, settings file, readRoms, importRoms, makeDirectory and a packaged build's file list (log-V2.md, log-G1.md, log-coordinator.md). The AppImage was built and run under the old name; the new scheme, application id and file names have never been in a packaged app (log-coordinator.md).
- macOS and Windows builds, the ad-hoc signature, the first-launch steps (from memory, not tested) and the GitHub workflow have never run (log-V3.md, log-coordinator.md).
- No ROM voice has been compared with a real TR-909; the only references are the Rob Roy recordings of one unit through one sampler. The hat clock, the reconstruction filter (a 12 kHz prior), the cymbal envelope and clock are fitted or assumed (log-E1.md).
- The juno's hiss level, charge loss and stage count are priors; no comparison with a real Juno (log-E1.md).
- Which of the two clap recordings is the louder hit is taken from the file names only (log-K1.md).
- LUFS figures come from V2's run only; V1 did not load the loudness code on its measuring page (log-V1.md, log-V2.md).
- Two renders of the same song still differ by about 2e-7 to 1e-5 inside Chromium, untraced (log-V1.md). The sampler's round robin still counts from a render's start (log-G1.md).
- Real output-device switching, the test tone and audio import into a real track in the browser were not tried (log-V1.md, log-V2.md).
- Research claims were not checked against their sources by the coordinator (log-coordinator.md).

## 8. Where the records disagree

- Times. The coordinator dispatched V1 to V3, R1 and R2 at 19:12 EST (00:12 UTC) on 26 November and verified V3 at 19:52 EST (00:52 UTC); V3's log dates its work 27 November 00:00 to 00:50 ET (05:00 to 05:50 UTC) (log-coordinator.md, log-V3.md). E1's log says it was revised at 20:15 ET after a coordinator message of 20:05 ET, while the coordinator verified E1 at 20:01 EST (log-E1.md, log-coordinator.md). R2 says its pages were fetched between 00:00 and 00:20 UTC, partly before the 00:12 UTC dispatch (R2-views-settings-distribution.md). These times cannot all be right.
- Hardened runtime on macOS: R2 read `hardenedRuntime: true` in `app/package.json` and recommended keeping it; V3's configuration sets it false with ad-hoc signing. No ruling on this is recorded (R2-views-settings-distribution.md, log-V3.md).
- The 909 accent: the earlier reading B3 gave about 6 dB by eye; E1 uses 9 dB from the step ladder and changed the check row from 6 to 9 dB (log-E1.md).
- The owner's second sample pack: the coordinator's log describes 14 WAV one-shots; E1 names four files from it and found them to be Rob Roy material; whether the other ten were compared is not recorded (log-coordinator.md, log-E1.md).
- Naming: N1 suggested the prefix RCT and the extension `.recut`; the coordinator kept the HVT model names and used `.recut.json` (N1-naming.md, log-coordinator.md).
- V3 wrote that V1 should be told copyFile is limited to audio and `.sfz` files; no record says V1 was told (log-V3.md).

## 9. Decisions for the owner

1. The first run of the GitHub workflow; the coordinator asks before it (log-coordinator.md).
2. Say when the repository is private, so the ROM images can be committed and included in builds (log-coordinator.md).
3. A Mac to confirm the ad-hoc signature and the Open Anyway steps; the deb's maintainer address is a placeholder (log-V3.md).
4. Whether version 0.3 starts with R1's stage 0, an offline bounce through a plug-in using Pedalboard, and whether "VST3 only" is acceptable (R1-plugin-hosting.md).
5. Whether to buy signing later; R2 found no current prices (R2-views-settings-distribution.md).
6. Renaming the GitHub repository is the owner's to do (log-coordinator.md).
7. Listen: the 909's three sources, the new chorus, the HVT-D priority and the changed renders.

## 10. Files

`BRIEF.md`, `transcripts/log-V1.md`, `log-V2.md`, `log-V3.md`, `log-E1.md`, `log-K1.md`, `log-G1.md`, `R1-plugin-hosting.md`, `R2-views-settings-distribution.md`, `N1-naming.md`, `log-coordinator.md`, this report; G2's log is in `docs/research/2026-11-26-showroom-crew/transcripts/`.

## Coordinator's note (27 November 2026)

The scribe compiled this report from the crew's records and could not save files itself; the coordinator read it and saved it unchanged. Three things to add.

- Decision 1 has moved on. The owner approved automatic builds on 26 November. The coordinator tried to start the first run on 27 November and GitHub refused the call; the run is the owner's to start (the Selector Crew's coordinator log, 02:15 EST, has the record).
- Hardened runtime: the configuration in force is `app/electron-builder.config.js`, which turns the hardened runtime on only when a signing certificate is present (`hardenedRuntime: hasCert`), so the unsigned builds are ad-hoc signed without it; `app/package.json` holds no build settings today. R2 read an earlier state of the tree. No Mac has run the result.
- The mismatched times come from agents writing clock times they did not read from the machine; the coordinator's log is the one to trust for when something was verified.
