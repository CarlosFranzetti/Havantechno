# R2: views, settings, export, portability and distribution

Pressing Crew, researcher R2. Written 26 November 2026 (ET), fetched between 00:00 and 00:20 UTC on 27 November 2026.

## How to read this file

Tags: **READ** = I fetched the page and it says so (URL and quoted figure). **SNIPPET** = a search result's summary only (the search tool sometimes returns a long excerpt; I still tag it SNIPPET because I did not fetch the page). **MEMORY** = my recollection, unverified. Nothing is quoted from memory. Where I quote, the words are the page's.

Budget used: 10 Firecrawl searches, 11 Firecrawl page reads (3 of them were 404s on slugs I guessed, 1 a PDF over the 50 MiB limit), plus `curl` to raw.githubusercontent.com and developer.apple.com, which answered.

Hosts that refused (DNS or proxy refusal from this session, from both `curl` and WebFetch): www.electron.build, www.electronjs.org, docs.github.com, developer.mozilla.org, www.ableton.com (by curl and WebFetch; Firecrawl did read it), support.apple.com, learn.microsoft.com. Substitutes: the Electron, MDN and GitHub docs sources as markdown on raw.githubusercontent.com (READ as source text of the docs, so a few template macros are unresolved), and electron-builder's `scheme.json` from its master branch (the config schema with each option's description). That schema is **newer than the pinned `electron-builder 26.18.0`** in `app/package.json` may be; behaviour I cite from it must be re-checked against the pinned version.

I looked at `docs/screenshots/app-system-editor.png` and `app-ab.png`: toolbar `System Editor | Step View | Mixer (disabled)`, transport, BPM, swing, A/B (Song/Ref, REF level, Match), Save/Open/Import/Report/Export WAV/Windows; the arrangement has an overview strip, sections row, tracks grouped Drums/Bass/Other/FX with M/S and a level, pattern-variant letters (A, B, C, D, F, H, R) in each section cell, "stem lane: empty" rows, and below a pattern strip, a device window (kick) and returns/master chain. `app/package.json` already has `electron 45.0.0`, `electron-builder 26.18.0`, mac dmg+zip for arm64 and x64, nsis x64, AppImage+deb x64, `hardenedRuntime: true`, no identity set. `app/engine/host.js:323` creates `new AC({ latencyHint: 'interactive' })` with no sampleRate or sinkId (READ locally).

---

## 1. Views in established DAWs

### 1.1 Ableton Live (the model the owner named)

**READ**, https://www.ableton.com/en/live-manual/12/live-concepts/ (section 3.6 "Arrangement and Session"):
- "You can work with clips in two views: the Arrangement, which is a layout of clips along a musical and linear timeline; and the Session, which is a real-time-oriented 'launching base' for clips. Every Session clip has its own play button that allows launching the clip at any time and in any order."
- "when you switch between the views during playback or recording, only the UI is affected and not the currently playing clips."
- "One can, for instance, improvise with Session clips and record a log of the improvisation into the Arrangement for further refinement. This works because Arrangement and Session are connected via tracks."
- "In the Session View, the tracks are laid out in columns, while in the Arrangement View they are stacked vertically, with time moving from left to right."
- "one usually places clips that should play alternatively in the same Session View column, and spreads out clips that should play together across tracks in rows, or what we call scenes."
- The precedence rule: "At any one time, a track can be playing either a Session clip or an Arrangement clip, but never both. Session clips take precedence. When a Session clip is launched, the currently playing clip stops in favor of playing the newly-launched clip... The Arrangement clips in the track where the Session clip was launched will not resume playback until you manually restart it using the Back to Arrangement button."
- "The Back to Arrangement button can be found in the Main track in the Session View and at the top-right of the scrub area in the Arrangement View. This button lights up to indicate that one or more tracks are currently not playing the Arrangement, but are playing a clip from the Session instead... Each track in the Arrangement View also has its own Back to Arrangement button."

So "back to arrangement" means: some track has been taken over by a launched clip; the button is lit while any track diverges; pressing it hands every track (or one track) back to the timeline. Shared state across the two views: the tracks, their devices and mixer settings, the transport; the clips are not shared (the two clip sets are separate objects joined only by the track and by "record Session into Arrangement").

**READ** for the mixer, detail and browser: not fetched (no page read). **MEMORY**: Live has a Mixer section in each view (Session shows track columns with volume, pan, sends, cue, meters; Arrangement shows a collapsible mixer panel), a Detail View at the bottom of the window that shows the selected clip or the selected track's device chain (two tabs, Clip and Device), and a browser at left for devices, sounds, samples and places on disk. Tab, Shift-Tab and keys toggle Session/Arrangement (MEMORY, key not verified).

### 1.2 Logic Pro

**SNIPPET** (Apple's Logic Pro guide, https://support.apple.com/guide/logicpro/bounce-a-project-to-an-audio-file-lgcp785a41c3/mac): refers to "the Logic Pro Tracks area or the Mixer", "Output 1-2 is the default output channel strip", the "Bnce" button on an output channel strip. That confirms two named windows (Tracks area, Mixer) and that the Mixer is where output strips live.
**MEMORY**: Tracks area (arrangement with regions) is the main window; the Inspector (left, channel strip and region parameters of the selected track), Library (patch browser), Browser (audio files, Project Audio), Mixer, Piano Roll, Step Sequencer, Score, Smart Controls and Editors at the bottom, toggled by keyboard shortcuts (X mixer, P piano roll, E editors; unverified). Live Loops is a grid of cells and scenes in the Tracks area, switched with a button at the top left of the Tracks area (unverified), and cells can be recorded to the Tracks area. State shared: one set of tracks and channel strips; the Mixer, Inspector and Tracks area show the same strips.

### 1.3 Bitwig Studio (clip launcher beside the arranger)

**READ**, https://www.bitwig.com/userguide/latest/the_clip_launcher: "The Clip Launcher Panel — also called the Launcher — is the logical Arranger's artistic brother. While the Arranger is an excellent way to lay out the fixed 'story' of a song, the Launcher allows you to freely improvise with your clips." "The key difference between Arranger clips and Launcher clips is their purpose. Arranger clips are played back precisely at the designated time. But Launcher clips must be available whenever you want them, either for section-based composition (verse, chorus, bridge), or as pieces for a live performance... Arranger clips must be rigid, and Launcher clips must follow your whim." "Each vertical column of clips is a group called a scene." The launcher can sit "within the Arranger Timeline Panel" or "inside the Mixer Panel of the Mix View". Also "Record on scene launch: Causes a scene launch to trigger recording into empty slots on all record-enabled tracks."
**SNIPPET** (https://www.bitwig.com/userguide/latest/arranger_clips_and_the_browser_panel/): "the context selected in the Arranger Timeline Panel is preserved if you switch to the Mixer Panel." That is a shared-selection rule between views. **MEMORY**: Bitwig has Arrange, Mix and Edit view buttons and a Panel layout; the Detail panel and Inspector sit at the bottom and right.

### 1.4 FL Studio (channel rack and playlist)

**READ**, https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/channelrack.htm: "The Channel Rack holds instruments that create sound... Every pattern has access to all instruments in the rack. In other words, all patterns play from the same set of instruments." "The note and automation data visible across all Channels is known as a 'pattern'. Patterns include Piano roll, Step Sequencer and Automation data. Patterns are designed to be arranged in the Playlist as Pattern Clips to create a song." Each row: "Mute, Pan, Volume, Mixer Track destination, Channel button... Step Sequencer buttons"; "Each button (step) in the grid represents a 16th note."
This is the nearest relative of the app's own model: tracks that hold named pattern variants (A, B, C) placed per section. **MEMORY**: the Playlist is the timeline where pattern clips, audio clips and automation clips live; Pattern mode and Song mode are switched by a transport button; the Mixer is a separate window to which each channel is routed by number.

### 1.5 Native Instruments: Maschine and Kontakt

**SNIPPET** (https://docs.native-instruments.com/online-guides/maschine-software-manual/en/basic-concepts): Preferences are pages: General, Audio, MIDI (and others). Maschine's browsing is a Browser with a library and a hardware-linked Pad and Group model. **MEMORY**: Maschine has an Arranger view (Scenes and Sections) and a Pattern view (Groups of Sounds with a Pattern editor), switched by a button; Ideas view is a launcher-like area for loops (names unverified). Kontakt: Browser panel at left (Libraries, Files, Database, Monitor, Modules, Auto), instrument rack of loaded instruments, Options dialog with Interface, Engine, Handling, Loader, Memory, Audio and MIDI Settings (unverified). I read no Kontakt page.

### 1.6 What a view is for, how users move, what is shared (summary across the products)

| Product | Views | Move by | Shared state |
|---|---|---|---|
| Live (READ) | Arrangement, Session; mixer in each; Detail, browser | View buttons; playing clips unaffected by the switch | tracks, devices, mixer, transport; clips are two separate sets |
| Bitwig (READ/SNIPPET) | Arranger beside Launcher; Mix view | panel toggles; Mix view | tracks; selected context preserved when switching to mixer |
| FL (READ) | Channel Rack, Playlist, Mixer, piano roll | windows | the channels and patterns; mixer routing by number |
| Logic (SNIPPET/MEMORY) | Tracks area, Mixer, Live Loops, editors, Inspector, Library | toggles | channel strips |

Pattern: **one project model, several lenses**. A view never owns data; it edits the same tracks. Selection (which track) is shared, and playback is unaffected by switching.

### 1.7 Which three or four views give a small DAW the most

Ranking by what the sources show a product needs and what this app lacks (the arrangement and step view exist):
1. **Mixer view** (all four products have one; Logic and FL treat it as a separate window; Bitwig and Live put it in the same window): strips with fader, pan, mute, solo, sends, meters, master. It is where output metering and export routing are legible.
2. **Clip (launcher) view**: the one the owner named ("like ableton does"); READ shows that the point is improvisation and section-based composition that follow "your whim" without destroying the arrangement.
3. **Arrangement** (exists): fixed story.
4. **Detail/editor dock** (exists in part: the pattern strip, device window and panel): selected track's pattern and device in one place, as Live's Detail View (MEMORY) and Bitwig's panels.
A browser (samples, projects, presets) is fifth: the app already has Import and drop-on-track.

### 1.8 What a "clip view" must do before it deserves the name

The present clip view only shows which pattern variant each track plays in each song section and launches sections. By the READ sources, that is a **section matrix**, close to a Scene list; it lacks the defining properties. Before it deserves the name it must:
1. Hold **clips as launchable cells independent of the timeline** (a cell = one pattern variant or one audio clip on a track), with empty cells, so one track can offer alternatives (Live: "clips that should play alternatively in the same ... column").
2. **Launch a single cell** on a quantisation (bar by default; the quantisation setting is a Live/Bitwig staple, MEMORY) and **stop** a track; show states: stopped, queued, playing.
3. **Launch a scene** (a row across tracks): the app's section launch is this.
4. Implement a **precedence rule**: a launched cell overrides the arrangement for that track until told otherwise, with a visible **back-to-arrangement** indicator, global and per track (READ).
5. **Capture** the performance into the arrangement (Live's "record a log of the improvisation into the Arrangement"; Bitwig's record on scene launch, READ).
6. Switching to or from the view must not change what is playing (READ, Live).
7. One undo entry per action, and the same Host document: clips are not a second copy of the song.
Open design question (not answered by any source): the app's arrangement already picks a variant per section; the clip view has to say whether a launched cell is a temporary override (Live) or an edit of the arrangement. Live's answer, READ above, is the override.

---

## 2. Audio and view settings as products present them, and what Web Audio inside Electron can offer

### 2.1 What the products present

**Live** (SNIPPET, https://help.ableton.com/hc/en-us/articles/209072289-How-to-reduce-latency and https://help.ableton.com/hc/en-us/articles/209071469-Optimizing-Windows-for-Audio): "Open Live's Preferences → Audio. The settings you change below will affect the Overall Latency field." Items named: Driver Type, Audio Device, Buffer Size ("We recommend using a buffer size of one of the following: 128, 256, 512 or 1024 samples"), Sample Rate ("The higher the sample rate, the lower the latency"), "Hardware Settings" button (greyed out when only the driver's control panel can change it), "Input Config" and "Output Config" buttons (SNIPPET from the Live manual chapter 38, https://www.ableton.com/en/manual/computer-audio-resources-and-strategies/), and Test Tone (SNIPPET, https://www.sweetwater.com/sweetcare/articles/ableton-live-quickstart-guide/: "click the Test Tone"). Live 12 calls the dialog "Settings" (help article: "Live's Settings → Audio"); Live 11 and earlier called it "Preferences". MIDI lives on a separate tab named Link/MIDI (SNIPPET, https://help.ableton.com/hc/en-us/articles/209774265-Using-hardware-synthesizers-with-Live: "Preferences → Link/MIDI... Enable the 'Track' switch for the corresponding Output MIDI port"; "Remote" is a second switch). Default values and exact order of the Audio tab: **not found** by reading. **MEMORY**: order is Driver Type, Audio Input Device, Audio Output Device, Channel Configuration (Input, Output), Sample Rate, Default SR & Pitch Conversion, Latency block (Buffer Size, Input Latency, Output Latency, Driver Error Compensation, Overall Latency), Test Tone (with Tone Volume and Tone Frequency), CPU Usage Simulator. I could not read the page to confirm. The Live 11 PDF manual was too large for Firecrawl (50 MiB limit).

**Maschine** (SNIPPET, https://docs.native-instruments.com/online-guides/maschine-software-manual/en/basic-concepts): "Preferences – Audio page ... Driver | Select your audio driver. Device | Select the available devices if you have more than one audio interface connected. Status | This confirms whether your audio interface is currently running. Sample Rate | This displays the selected sample rate of your audio interface. Restart Maschine after changing the sample rate. Latency | macOS: This slider allows you to adjust the latency of your audio interface in samples. Lower values result in a more immediate playing response but are heavier on both the CPU and the audio driver, and may result in audible clicks and pops... Windows: When using an ASIO driver... an ASIO Config button instead of the Latency slider. Output | ... the 16 stereo outputs of Maschine". MIDI page: "Clock Offset... compensates for delays that may occur during MIDI data transmission." That is the clearest order and wording I found: Driver, Device, Status, Sample Rate, Latency, Output.
**SNIPPET** (https://support.native-instruments.com/support/solutions/articles/69000879989-optimizing-the-settings-for-your-native-instruments-audio-interface): "Driver", "Device", "Sample Rate" ("A sample rate of 44100 Hz equals CD Quality. A sample rate of 48000 Hz is common for use with pro audio equipment"), "Buffer"; "This introduces a short delay between recording and playback, called latency."

**Logic Pro and Kontakt**: no page read. **MEMORY**: Logic Settings > Audio has Output Device, Input Device, I/O Buffer Size, Resolution (24-bit), Process Buffer Range, Multithreading, Recording Delay (wording unverified); the sample rate is a project setting. Kontakt's Options > Audio and MIDI Settings shows Driver, Device, Sample rate, Latency (ms) with a slider, and a Test Tone. Unverified.

**Pattern across products**: a settings dialog has tabs (Audio, MIDI, then library/file settings and look/feel); Audio shows device and driver first, then rate, then buffer/latency, then a readout of the resulting latency, then a test. Sample-rate changes may require restart (Maschine, READ-SNIPPET).

### 2.2 What a Web Audio app in Electron can really offer

**READ** from MDN source text (https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/audiocontext/audiocontext/index.md):
- `latencyHint`: "`balanced`", "`interactive`" ("The browser selects the lowest possible latency that doesn't cause glitches in the audio"), "`playback`", or a float "indicating the preferred maximum latency of the context in seconds"; "The user agent may or may not choose to meet this request; check the value of `AudioContext.baseLatency` to determine the true latency after creating the context." "If omitted, `latencyHint` defaults to `interactive`."
- `sampleRate`: "a float... from 3000 to 768000 Hz... If the `sampleRate` property is not included... the new context's output device's preferred sample rate is used by default." It is a constructor option; no setter exists, so a rate change means a new context (a rebuild of the graph; the Host already rebuilds on start).
- `sinkId` (experimental): a device id string or `{type: 'none'}` ("processed without being played through any audio output device").
- `renderSizeHint` (experimental): the render quantum (default 128 frames) "may not be honored exactly". This is not the device buffer.
- "The specification doesn't go into a lot of detail about things like how many audio contexts a user agent should support, or minimum or maximum latency requirements (if any), so these details can vary."

**READ**, `AudioContext.setSinkId()` (.../audiocontext/setsinkid/index.md): "If a sink ID is not explicitly set, the default system audio output device will be used." "To set the audio device to a device different than the default one, the developer needs permission to access to audio devices. If required, the user can be prompted to grant the required permission via a `MediaDevices.getUserMedia()` call." It "may be blocked by a `speaker-selection` Permissions Policy." Exceptions: `InvalidAccessError`, `NotAllowedError` ("the browser does not have permission to access audio devices"), `NotFoundError` ("does not match any audio device"). "The output device can be changed during audio playback, as well as before, or between plays." Status: experimental, secure context. There is a `sinkchange` event.
**READ**, `outputLatency` (.../audiocontext/outputlatency/index.md): "the time, in seconds, between the browser passing an audio buffer out of an audio graph over to the host system's audio subsystem to play, and the time at which the first sample in the buffer is actually processed by the audio output device. It varies depending on the platform and the available hardware." `baseLatency`: the property named in the latencyHint text above (its own page not read).
**READ**, `enumerateDevices()` (.../mediadevices/enumeratedevices/index.md): "Other than default devices, only devices for which permission has been granted are 'available'." The list omits devices blocked by Permissions Policy; "The method must be called in a secure context." (Labels are empty without permission: the page's own example prints "labels if available".) `selectAudioOutput()` (.../selectaudiooutput/index.md): "prompts the user to select an audio output device... If the user selects a device, the method grants user permission to use the selected device as an audio output sink" (experimental; may not exist in Chromium).
**READ**, Web MIDI (.../web_midi_api/index.md): `navigator.requestMIDIAccess()`; "must be called in a secure context"; "The user must explicitly grant permission to use the API through a user-agent specific mechanism"; `midi` permission with optional `sysex`.
**READ**, `getUserMedia()` (.../getusermedia/index.md): "If the user denies permission, or matching media is not available, then the promise is rejected with `NotAllowedError` or `NotFoundError`"; "`navigator.mediaDevices` is `undefined` in an insecure context".

**READ**, Electron session docs (https://raw.githubusercontent.com/electron/electron/main/docs/api/session.md): the permission names the shell can grant or deny include `media` ("camera, microphone and speakers"), `midi`, `midiSysex`, and `speaker-selection` ("enumerate and select audio output devices via the speaker-selection permissions policy"); handlers are `ses.setPermissionRequestHandler` and `ses.setPermissionCheckHandler`; `setDevicePermissionHandler` is for HID, USB and serial. The Electron security tutorial lists "Use `ses.setPermissionRequestHandler()` in all sessions that load remote content" (READ, security.md, item 5), so the shell should allow exactly these permissions for its own local origin and deny the rest.

**What cannot be set** (MEMORY unless stated; I found no page that states these):
- Buffer size in frames: no API; `latencyHint` and `renderSizeHint` are hints. Live and NI expose it only because they sit on ASIO and Core Audio directly.
- Exclusive mode, ASIO and WASAPI exclusive: not reachable from Chromium's AudioContext (MEMORY; Chromium uses WASAPI shared, Core Audio and Pulse or ALSA).
- Channel routing beyond the destination's channel count: `destination.maxChannelCount` exists (MEMORY) but a stereo pair is the realistic limit; no "Output Config" matrix.
- Input device with echo cancel off: `getUserMedia` constraints `echoCancellation: false` etc. (MEMORY).

**What it can offer, in the order Live and Maschine use**: Output device (list from `enumerateDevices`, `audiooutput`, plus "System default" and "None"), Sample rate (list; applies by rebuilding the context; say so as Maschine says "Restart Maschine after changing the sample rate"), Latency (hint: interactive, balanced, playback, or seconds), readout (Status = `state`; `baseLatency`, `outputLatency`, `sampleRate`), Test tone, Input device (permission), MIDI inputs (permission). This matches the frozen `host.audioOptions()` and `host.setAudioOptions()`.
**Gap I could not close**: whether Electron 45's Chromium has `AudioContext.setSinkId` enabled (MDN says "experimental"; Chromium shipped it in 110 per my MEMORY). Verify at runtime with `'setSinkId' in AudioContext.prototype` as MDN's own example does (READ).

### 2.3 View settings

No page read. **MEMORY** of what the products offer: Live Settings has "Look/Feel" (language, zoom, theme, colour), "Display zoom", and Arrangement options; Logic has Display settings; Bitwig has an overview "Display profiles" and a UI scale; typical items: default view at start, theme, zoom, meter ballistics and peak hold, show or hide track groups. The owner's V2 list (default view, density and zoom, meters) is consistent with this.

---

## 3. Exporting audio

### 3.1 What the dialogs offer

**READ**, Live manual (https://www.ableton.com/en/manual/managing-files-and-sets/ and the SNIPPET of the same chapter section 5.1.3 with the full prose):
- Command "Export Audio/Video", Ctrl-Shift-R / Cmd-Shift-R.
- "Rendered Track" chooser: "All Individual Tracks — The post-fader signal at the output of each individual track, including Group Tracks, return tracks and the Main track. With this option, Live creates a separate audio file for each track... only tracks that output audio are exported... All exported files will have the same length, which makes it easy to align them either in Live or another multitrack program."
- Render start and length in a "Selection" area.
- "Include Return and Main Effects — When exporting individual or selected tracks... also include the signal from any return tracks used by the tracks, as well as any effects used on the Main track. This can be useful when exporting stems for a live performance or remix."
- "Render as Loop — ... if there is a track with an effect tail that extends beyond the length of the last clip, the tail will not be included in the exported file when rendered normally. When rendered as a loop... two passes... the effect tail from the first pass is wrapped into the beginning of the rendered file."
- "Convert to Mono"; "Normalize — This adjusts the audio's gain so that the highest peak reaches the maximum available headroom."
- Option names read in sequence on the page: Create Analysis File, Sample Rate, Bit Depth, Dither Options (values not extracted), MP3 "render a CBR 320 kbps MP3 file" (and "it is not possible to render a video file on its own or with only an MP3 file; a PCM-based audio file must also be created").
- Real-time: "Rendering is usually an offline process, unless your Set contains an External Audio Effect or External Instrument that routes to a hardware effects device or instrument"; then "a dialog appears that starts a 10-second waiting period before the real-time rendering begins."

**SNIPPET** (Apple, Logic Pro bounce, https://support.apple.com/guide/logicpro/bounce-a-project-to-an-audio-file-lgcp785a41c3/mac): File > Bounce > Project or Section; "select one or more destination file types"; Start and End value sliders; "Mode: Automatic ... Offline ... Realtime" ("Bouncing offline can be faster than real time"; offline only for internal sources); "Bounce 2nd Cycle Pass"; "Include Audio Tail: The bounce file is extended as far as necessary to include any instrument release and effect tail" (and "should not be selected" with plug-ins that add noise because "the resulting bounce file would be too long"); "Include Tempo Information" (uncompressed only); "Normalize: Off | Overload Protection Only | On" ("Downward normalization takes place only for overloads... On: ... scanned for the highest amplitude peak, then the level is increased so that the peak is at the maximum possible level (without clipping)"); "Add to Project"; default folder "~/Music/Logic/Bounces"; with several destinations "All files have the same filename, but with the appropriate file extensions".

Dialog anatomy common to both (and a proposed checklist for the app's export dialog): what (mix, stems, selected), range (project, section, bars, cycle), format and bit depth, sample rate, dither, normalise, tail, mono, mode (offline or real-time), destination folder and filename, "add to project". The Host contract already has scope, what, bitDepth, sampleRate, tailSeconds.

### 3.2 Bit depth, dither, normalisation (no source read; MEMORY)

16-bit PCM, 24-bit PCM, 32-bit float WAV. Dither (TPDF is the common default; noise-shaped types such as POW-r in Live and Logic) belongs only to a reduction to 16 bit (or lower); 24-bit and float need none in practice. Normalise is peak-based in both products (READ above): the app should leave it off by default and report the peak. Float WAV can exceed 0 dBFS without clipping, which makes it the safe stem format.

### 3.3 Stems and naming between collaborators (MEMORY, no page read besides the Live line above)

Conventions as I know them: every stem the same length, starting at bar 1 or at sample 0 so they drop onto the same grid (Live READ line "same length ... easy to align"); 24-bit at the project's rate; name = track name, optionally with a leading index (`01_kick.wav`) so alphabetical equals mix order; avoid characters illegal on Windows and macOS (`/ \ : * ? " < > |`), trim length; state whether stems carry the master-bus chain (Live's "Include Return and Main Effects" is the switch, READ) and state the tempo and key in the project name. A test every export can run: stems summed equal the mix to within a stated tolerance (the brief already demands it).

### 3.4 Loudness targets people quote and where they come from

**READ**, Spotify for Artists (https://support.spotify.com/us/artists/article/loudness-normalization/): "We adjust tracks to -14 dB LUFS, according to the ITU 1770 standard." Premium listeners' levels: "Loud: -11dB LUFS", "Normal: -14dB LUFS", "Quiet: -19dB LUFS". "The limiter's set to engage at -1 dB (sample values), with a 5 ms attack time and a 100 ms decay time." Recommendation: "Target the loudness level of your master at -14dB integrated LUFS. Keep it below -1dB TP (True Peak) max. This is best for lossy formats (Ogg/Vorbis and AAC)... If your master is louder than -14dB integrated LUFS, keep True Peak below -2dB."
**MEMORY**: -23 LUFS is EBU R 128 for broadcast; Apple Music "Sound Check" targets about -16 LUFS; YouTube about -14 LUFS; none of these read here. ITU-R BS.1770 defines the K-weighted loudness measure behind all of them (named in the Spotify quote, READ). Club and dance masters are often louder than -14 and are turned down by streaming services, which is Spotify's "Loud" reasoning above.
**Use for the app**: show integrated LUFS and true peak on the export report (the app already shows a LUFS meter in the toolbar, screenshot) and mention -14 LUFS and -1 dBTP as one published target, not as a rule. Do not normalise to loudness inside the export.

### 3.5 Compressed formats: encoders a JavaScript app could use

**READ**, WebCodecs (MDN source, https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/audioencoder/index.md): `AudioEncoder` "encodes `AudioData` objects", secure context, available in dedicated workers; `AudioEncoder.isConfigSupported()` exists.
**READ**, W3C codec registry sources (https://raw.githubusercontent.com/w3c/webcodecs/main/*_codec_registration.src.html): FLAC and Opus registrations define `AudioEncoderConfig` extensions (`FlacEncoderConfig`, with `blockSize`; an Opus extension) while the MP3 and Vorbis registrations have no encoder-config extension; the registry says "Implementers of WebCodecs are not required to support the MP3 codec" (same wording for Vorbis and Opus) and "not intended to include any information on whether a codec format is encumbered by intellectual property claims".
So the spec leaves room for FLAC and Opus encoders but requires none. Whether Electron 45's Chromium implements any: **not found**; it is a runtime question (`AudioEncoder.isConfigSupported({codec:'opus'|'flac'|'mp3', ...})`). MEMORY: Chromium's AudioEncoder supports Opus and AAC (platform) and not FLAC or MP3; unverified.
**READ**, `MediaRecorder.isTypeSupported()` (MDN source): returns true "if the MIME media type specified is one the user agent should be able to successfully record"; its examples are `audio/webm;codecs=opus` and similar. MediaRecorder records a MediaStream (MEMORY), so it is real time and unsuitable for an offline bounce (needs the context's output piped to a `MediaStreamDestination` and played in real time).

JavaScript libraries (licence READ from each repo's LICENSE file unless stated):
| Format | Library | Licence | Notes |
|---|---|---|---|
| FLAC | libflac.js (mmig/libflac.js) | MIT ("The MIT License (MIT) Copyright (c) 2014-2020 DFKI GmbH, based on FLAC encoder: Copyright (C) 2000-2009 Josh Coalson, Copyright (C) 2011-2014 Xiph.Org Foundation") | README READ: "FLAC data stream encoder and decoder compiled to JavaScript using emscripten", encode all-at-once or chunk-by-chunk, WebWorker use. libFLAC itself is BSD-style (MEMORY). |
| MP3 | lamejs (zhuker/lamejs) | LICENSE file is the LAME FAQ: "Yes, you can [use LAME in a commercial program], under the restrictions of the LGPL." README READ: "a rewrite of jump3r-code which is a rewrite of libmp3lame" | LGPL; the file asks for linking as a separate file and acknowledgement. Compatibility with an AGPL-3.0-or-later app: MEMORY, likely fine (LGPL code may be used in a GPL-family program), not verified. MP3 patents expired (MEMORY, 2017). |
| Opus (Ogg) | opus-recorder (chris-rudmin) | MIT (LICENSE.md, "Opus Recorder License (MIT)") | README not read; MEMORY: libopus compiled to WebAssembly, oriented to recording rather than offline encode. |
| Container + codecs via WebCodecs | Mediabunny (Vanilagy) | MPL-2.0 (LICENSE starts "Mozilla Public License Version 2.0"); README: "read and write MP4, MOV, WebM, MKV, HLS, WAVE, MP3, Ogg, ADTS, FLAC, MPEG-TS"; "Built-in encoding & decoding: Supports 25+ video, audio, and subtitle codecs, hardware-accelerated using the WebCodecs API" | The codecs come from the browser's WebCodecs, so what it can encode is what Chromium can. Weak copyleft: modified MPL files must be published (README). |
| Any | ffmpeg.wasm (ffmpegwasm) | repo LICENSE MIT | The FFmpeg core it loads is LGPL or GPL depending on the build (MEMORY, not verified); large download. |
| Ogg Vorbis | no library read | | MEMORY: libvorbis is BSD, JS ports exist; not verified. |

Recommendation inference: WAV (16/24/32f) in-house is trivial and already there; FLAC is the one lossless format worth adding (MIT library, no patent worry); Opus via WebCodecs only if `isConfigSupported` says yes at runtime, else skip; MP3 is optional and LGPL. All of these run offline on an `AudioBuffer` in a worker; the real-time MediaRecorder path should not be used.

---

## 4. Project portability

**READ**, Live (https://www.ableton.com/en/live-manual/12/managing-files-and-sets/, via a query-extract, wording as extracted):
- "You can collect files via the Collect All and Save option in the File menu or by using the File Manager."
- "the Collect All and Save dialog lets you choose which files to copy into the Project based on their location. The files are then added to their corresponding subfolder in the Project's Samples folder (for audio files) or Presets folder (for devices)."
- "Live considers any files that are outside the Project folder as external — this includes files from Packs, other Projects, the User Library, and files located elsewhere on your computer."
- The Manage Files command opens a File Manager with tools for "Locating files that the Project is missing", "Collecting external files into the Project folder", "Listing unused files in the Project", "Packing a Project in Pack format" (an `.alp` file). Locating missing files offers "Search Folder", "Search Project", "Search Library" and "One candidate found" (automatic repair).
- What goes wrong: saving a Set outside its Project folder starts a new Project; "There is nothing wrong with this except for when the Tango Project is moved away or deleted; then 'Electro with Piano.als' will be missing samples."
- "if your Project contains external files, they are not automatically saved with the Pack, so it's a good idea to collect them first."
- Project folder subfolders named in the chapter: `Samples/Recorded` (and Imported, Processed), `Presets` (MEMORY for Imported and Processed; READ for Recorded and Presets).

**MEMORY**: other DAWs. Logic saves as a folder or a package with audio files copied in, with the option "Copy audio files into project"; Reaper offers "Save project as ... copy all media into project directory"; FL has "Export project data files"/zip; Bitwig saves a folder with a `.bwproject` file and a `samples` dir, and can "Collect and Save". None read.

**What typically goes wrong moving between machines** (MEMORY, from general experience, none read): absolute paths and drive letters; different path separators; case-sensitive filesystems (Linux) vs insensitive ones; Unicode normalisation of file names (macOS composes differently); files referenced but not copied; missing plug-ins or different plug-in versions (this is R1's territory); different sample rate or output device on the new machine; DAW version differences; cloud-sync partial files; long paths on Windows.

**Conventions for project folders** (the Live READ above plus MEMORY): one folder per project with the document at the top and media in subfolders (`audio/`, `samples/`, `renders/` or `bounces/`), relative paths stored in the document, an explicit "Collect" action that copies external files in, and a "missing files" dialog with search-by-folder and relink-by-name-and-size.
**For this app**: the `.havantechno.json` references audio by path today (BRIEF). A bundle should be a folder `Name.havantechno/` holding `project.json` plus `audio/`, relative paths only, each file with name, size and a content hash (MEMORY: my suggestion, not read) so relinking by hash works after renames; a zipped single-file variant for sending; and a "locate missing audio" dialog modelled on Live's three searches (folder, project, library). The frozen `Project.saveBundle/openBundle` matches this.

---

## 5. Distributing an Electron app without paying for certificates

### 5.1 What the platforms say

**READ**, Electron's code signing tutorial (https://raw.githubusercontent.com/electron/electron/main/docs/tutorial/code-signing.md): "Both Windows and macOS prevent users from running unsigned applications. It is possible to distribute applications without codesigning them - but in order to run them, users need to go through multiple advanced and manual steps." (The page shows a screenshot with alt text "macOS Sonoma Gatekeeper warning: The app is damaged".) macOS needs "Enroll in the Apple Developer Program (requires an annual fee)" plus Xcode, so a Mac. "A number of macOS APIs... only behave correctly once your app is code signed. When testing these APIs, keep in mind that an unsigned or ad-hoc signed app may behave inconsistently": `safeStorage` ("the Keychain to prompt the user for permission again after every update"), `setLoginItemSettings`, the `cookieEncryption` fuse, and "`autoUpdater` - `Squirrel.Mac` requires the app to be signed for automatic updates to work at all."
Windows (same page): "since June 2023, Microsoft requires software to be signed with an 'extended validation' certificate... simpler and cheaper certificate... no longer provide benefits: Windows will treat your app as completely unsigned and display the equivalent warning dialogs." EV certificates "are required to be stored on a hardware storage module compliant with FIPS 140 Level 2... the certificate cannot be simply downloaded onto a CI infrastructure"; resellers listed are DigiCert, GlobalSign, Sectigo and SSL.com; cloud signing is popular for CI. "Azure Artifact Signing (formerly known as Azure Trusted Signing) is Microsoft's modern cloud-based signing service. It is the cheapest option for code signing on Windows, and it gets rid of SmartScreen warnings. ... currently limited to developers in certain countries." No prices on the page.

**READ**, Apple notarisation (https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution, markdown version):
- "Beginning in macOS 10.15, all software built after June 1, 2019, and distributed with Developer ID must be notarized."
- Requirements: valid code signature; "Use a 'Developer ID' application... certificate (Don't use a Mac Distribution, ad hoc, Apple Developer, or local development certificate)"; Hardened Runtime; secure timestamp. So an ad-hoc signed build cannot be notarised.
- "In macOS 10.15 and later, apps can load quarantined plug-ins — those downloaded from the internet or transferred with AirDrop — only if the plug-in is notarized. For plug-ins that aren't notarized, the user must explicitly approve the plug-in by opening the System Preferences app and navigating to the General tab in Security & Privacy." and "a host app must include all the entitlements that prospective plug-ins require" (`com.apple.security.cs.allow-jit`, `...allow-unsigned-executable-memory`, `...disable-library-validation`). This bears directly on R1: an AU or VST3 host needs those entitlements and users must approve each non-notarised plug-in.
- "Starting November 1, 2023, the Apple notary service no longer accepts uploads from `altool`"; use `notarytool`.

**SNIPPET**, Apple support (https://support.apple.com/en-us/102445, "Safely open apps on your Mac"): "If you want to open an app that hasn't been notarized or is from an unidentified developer... Click Privacy & Security, scroll down, and click the Open Anyway button... The warning prompt reappears and... you can click Open." After that "The app is now saved as an exception."
**SNIPPET**, https://eclecticlight.co/2024/10/01/living-without-notarization/: "macOS Sequoia is the first version of macOS to expect apps delivered from outside the App Store to be notarized, but still to allow us to run apps that aren't. ... When an app is being launched for the first time on that Mac, if it has been put into quarantine with a quarantine extended attribute, Gatekeeper will check whether it has been notarized. If it hasn't been notarized, then macOS will warn you of that, and halt its launch... open Privacy & Security settings, where you can click the button to Open Anyway... then takes you to the third dialog, where you'll need to authenticate." SNIPPET (nektony.com): "Up to Sonoma, Open Anyway appeared in the dialog itself. From Sequoia onward it lives in System Settings → Privacy & Security." (a Reddit snippet claimed the old right-click Open route no longer works on Sequoia; unreliable, not used.)
**MEMORY**: the quarantine attribute `com.apple.quarantine` is set by browsers and some apps on download, not by `curl`; `xattr -dr com.apple.quarantine /Applications/Havantechno.app` removes it; Apple silicon refuses to run unsigned arm64 code, so at least an ad-hoc signature (`codesign --sign -`) is required (not read from Apple; electron-builder text below supports the ad-hoc path).

**SNIPPET**, Windows (https://stackoverflow.com/questions/48946680/..., an answer): "This warning is shown if you distribute your app outside the Microsoft Store and it doesn't have enough reputation with Microsoft SmartScreen yet... SmartScreen evaluates both the certificate reputation and the file reputation." The dialog wording from the question: "Windows protected your PC. Windows Defender SmartScreen prevented an unrecognized app from starting. Running this app might put your PC at risk." MEMORY: user clicks "More info" then "Run anyway"; an unsigned installer from a new publisher gets it every time until reputation builds; Smart App Control (Windows 11) may block unsigned apps outright without a "Run anyway" button, if switched on (not verified, important to test). I could not read the Microsoft page.

**READ**, electron-builder (config schema `scheme.json` from master, https://raw.githubusercontent.com/electron-userland/electron-builder/master/packages/app-builder-lib/scheme.json; newer than the pinned version possibly):
- mac `identity`: "Not set (default): electron-builder searches the keychain for a valid certificate. `null`: skip signing entirely. `"-"`: ad-hoc signing (requires disabling library validation — see `hardenedRuntime`)."
- mac `sign`: "Not set (default): electron-builder auto-discovers a valid certificate in the keychain. If none is found, signing is skipped."
- mac `notarize`: "unset (the default): notarize when notarization credentials are set, otherwise skip it with a warning... `false`: never notarize (for an ad-hoc or development-signed app, or one notarized in an afterSign hook)." Credentials are env sets: `APPLE_API_KEY`+`APPLE_API_KEY_ID`+`APPLE_API_ISSUER`, or `APPLE_ID`+`APPLE_APP_SPECIFIC_PASSWORD`+`APPLE_TEAM_ID`, or keychain profile.
- mac `hardenedRuntime`: "Defaults to `true` for `darwin` builds".
- mac `entitlements`: default bundled one "grants only `com.apple.security.cs.allow-jit` (ad-hoc builds use a bundled ad-hoc template...)".
- `resetAdHocDarwinSignature`: "Re-applies the ad-hoc codesignature on macOS after fuses are flipped... electron-builder already re-signs the app after flipping fuses, so this flag is generally not needed."
- `forceCodeSigning`: "Whether to throw an error and abort the build if the app could not be code-signed, notarized, or have its auto-update manifests signed... When `false` (the default), missing signing credentials produce a w[arning]".
- **Trap for the auto-update path**: `updateManifest`: "Ed25519 signing of the auto-update manifest (`latest*.yml`)... **Signing is required.** Publishing a build that emits auto-update metadata fails unless a signing key resolves. Generate one once with `electron-builder create-update-key`, then supply it via `ELECTRON_BUILDER_UPDATE_SIGN_KEY`... Set to `false`, the only opt-out, to ship unsigned manifests." "The requirement is enforced when a publish policy is in effect (`--publish`) or `forceCodeSigning` is set; any other build warns instead." So a V3 workflow that runs `electron-builder --publish` would fail on this schema unless a key is supplied or `updateManifest: false`. It costs nothing to generate the key. Check against 26.18.0.
- Windows `sign` and `verifyUpdateCodeSignature`: "Code signing stamps every installer and executable electron-builder produces with an Authenticode signature, so that Windows (SmartScreen / UAC) and your auto-updater can verify the publisher"; "When enabled (the default), the resolved publisher name is embedded into `app-update.yml`... electron-updater inspects the certificate that signed the downloaded update" (so Windows auto-update by electron-updater of an unsigned build needs this verification disabled: MEMORY/inference, not read).
- Linux targets: "list of `AppImage`, `flatpak`, `snap`, `deb`, `rpm`, `freebsd`, `pacman`..."; AppImage: "a portable application format that bundles the app and its runtime dependencies into a single self-contained executable that runs on most Linux distributions without installation. The produced `.AppImage` file is executable after `chmod +x`." The schema mentions a "FUSE2 toolset" (MEMORY: AppImage needs FUSE 2 on the user's machine, which recent Ubuntu does not install by default; not verified). Docker image for Linux targets: named in the schema.
- Pitfall on Linux in Electron (MEMORY, not read): `chrome-sandbox` SUID or user-namespace restrictions on newer Ubuntu may stop an AppImage from starting without `--no-sandbox`; test on Ubuntu 24.04.

### 5.2 Cost and requirements today

READ: Apple Developer Program "requires an annual fee" (no figure on the page); Windows EV certificates on hardware, since June 2023; Azure Artifact Signing is "the cheapest" Windows option and restricted by country. Figures: **not found** by reading. MEMORY: Apple Developer Program US$99 per year; Azure Artifact Signing about US$10 per month (Basic); EV certificates typically a few hundred US$ per year; OV certificates no longer help (READ above). The owner has said unsigned unless identities are supplied, so none of this is required for the next version.

### 5.3 What users meet on first launch, unsigned (the install page should say this)

- macOS, Sequoia and later (SNIPPET): the downloaded app (quarantined) is blocked once; the user opens System Settings, Privacy & Security, scrolls to Security, clicks Open Anyway, authenticates, then Open. The Electron doc READ shows the Sonoma version of the dialog reads "The app is damaged". arm64 builds must at least be ad-hoc signed (MEMORY; electron-builder produces an ad-hoc signature by default when no identity is found, per the READ `sign` and `identity` text and the "ad-hoc builds use a bundled ad-hoc template" entitlement line).
- Windows (SNIPPET + MEMORY): SmartScreen "Windows protected your PC", More info, Run anyway. NSIS installer unsigned; a portable build has the same prompt.
- Linux: AppImage: `chmod +x` then run; `.deb`: `sudo dpkg -i` or `apt install ./file.deb`; no signature prompt (MEMORY).

### 5.4 Auto-update options and what they require

**READ**, Electron updates tutorial (https://raw.githubusercontent.com/electron/electron/main/docs/tutorial/updates.md) and API (auto-updater.md):
- "The easiest and officially supported one is taking advantage of the built-in Squirrel framework and Electron's autoUpdater module."
- Static storage: publish `RELEASES.json` (mac) and the `RELEASES` plus `.nupkg` (Windows) beside the build; `update-electron-app` with `UpdateSourceType.StaticStorage`.
- update.electronjs.org: "The service is designed for Electron apps that meet the following criteria: App runs on macOS or Windows; App has a public GitHub repository; Builds are published to GitHub Releases; Builds are code-signed (macOS only)". "By default, this module will check for updates at app startup, then every ten minutes."
- auto-updater.md: "Currently, only macOS and Windows are supported. There is no built-in support for auto-updater on Linux, so it is recommended to use the distribution's package manager to update your app." "Your application must be signed for automatic updates on macOS. This is a requirement of Squirrel.Mac." Windows uses Squirrel.Windows or MSIX.
- electron-builder's `electron-updater` (schema READ): GitHub provider (`protocol` "supports only `https`"), `token` "to support auto-update from private github repositories. Never specify it in the configuration files", differential downloads through blockmaps, `S3`, `R2` and generic providers; manifests signed with Ed25519 (see the trap above). Mac requirements for electron-updater: MEMORY, also a signed app.
**Consequence**: an unsigned mac build cannot auto-update by either route (READ: Squirrel.Mac). The workable pattern without certificates is a **notify-only updater**: on launch or on a button, fetch the latest release from GitHub's public API (MEMORY: `https://api.github.com/repos/OWNER/REPO/releases/latest`, a public repo needs no token) and show "version X is available" with a link to the Releases page; Linux is by hand anyway (READ). For Windows unsigned, electron-updater can work only with signature verification turned off (inference; unverified).

### 5.5 Hosting downloads on GitHub Releases

**READ** (GitHub docs source, https://raw.githubusercontent.com/github/docs/main/content/repositories/releasing-projects-on-github/about-releases.md; data values from `data/variables/releases.yml` and `large_files.yml`): "Up to 1000 release assets may be associated with a single release. Each file included in a release must be under 2 GiB. There is no limit on the total size of a release, nor bandwidth usage." Files in the git tree: warning at 50 MiB, blocked at 100 MiB (so binaries belong in releases, not the repo). "We recommend repositories remain small, ideally less than 1 GB".
**READ** (managing-releases-in-a-repository.md): prereleases exist (`gh release create v1.3.2 --title ... --prerelease`); drafts exist; "If you have enabled immutable releases for your repository, it's recommended to create releases as drafts first, attach all assets, and then publish"; with immutable releases "you cannot add, replace, or delete assets after a release is published, and you cannot move or delete its tag". Releases need a tag; the permission "Repository collaborators and people with write access to a repository can create, edit, and delete a release."
**Private repositories**: READ only that update.electronjs.org needs a public repo and electron-updater needs a `token` for private ones. MEMORY: assets of a private repo's releases are visible only to people with access, so a private repo cannot serve public downloads. Whether GitHub Actions storage or release quotas differ for private repos: not found. The V3 brief already forbids pushing tags or publishing; the draft-then-publish route above fits.

---

## 6. Ranked recommendations (next version, then the one after)

Each is tied to a source above.

**Next version (V1 to V3 as briefed)**

1. **Make stems the same length, start at bar 1, offline, with an explicit tail, and report peak and LUFS.** Live READ: all individual tracks "have the same length, which makes it easy to align them"; Logic SNIPPET: "Include Audio Tail ... as far as necessary to include any instrument release and effect tail"; Live READ: tails cut off unless rendered as a loop. Defaults: 24-bit, normalise off, dither only when reducing to 16-bit, offline mode only (nothing in the app routes to hardware, so Live's real-time wait does not arise). Show integrated LUFS and true peak; quote Spotify's -14 LUFS and -1 dBTP (READ) as one reference, no loudness normalising.
2. **Project bundle with relative paths, content hashes, and a Collect and Locate flow** modelled on Live's Collect All and Save (READ): external files copied into the project's own folder (`audio/`), missing files found by search of a chosen folder, the project folder, and a library folder. Moving the project folder must not break it (Live READ on what breaks).
3. **Ship unsigned builds honestly.** macOS arm64 and x64 (ad-hoc), Windows NSIS, Linux AppImage and deb, built by the workflow, created as a **draft** release and published by the owner (GitHub READ on drafts, prereleases and immutable releases). Set `notarize: false` explicitly and keep `hardenedRuntime` as is; **turn off or supply a key for `updateManifest`** because the schema READ says publishing otherwise fails. An install page with the first-launch steps (5.3): Open Anyway on Sequoia (SNIPPET), More info then Run anyway on Windows (SNIPPET), `chmod +x` for AppImage (READ). No auto-update on unsigned mac (READ: Squirrel.Mac); a **notify-only update check** against the public Releases API instead (MEMORY). Check Smart App Control on Windows 11 and AppImage FUSE and sandbox on Ubuntu 24.04 by actually running (not found by reading).
4. **Audio settings dialog on exactly what Web Audio gives**, in Maschine's order (READ-SNIPPET): Output device (System default, enumerated devices, None), Sample rate (rebuild the context, say so as Maschine does), Latency (interactive, balanced, playback; show the hint beside the numbers), then readouts of `state`, `sampleRate`, `baseLatency`, `outputLatency` (READ definitions), a Test tone, then Input device and MIDI inputs behind a permission button. Detect support with `'setSinkId' in AudioContext.prototype` (READ). Do not draw a buffer-size control: no API (MEMORY, no source found); say "set by your system" instead, as the MDN text says the user agent may not meet the hint. In the Electron shell, handle `media`, `midi` and `speaker-selection` in `setPermissionRequestHandler` and `setPermissionCheckHandler` for the app's own origin only (READ, session.md and security.md).
5. **Clip view that earns the name.** Add per-cell launch (a track's pattern variant or an audio clip), queue and stop states, scene launch (the present section launch), the Ableton precedence rule and a lit back-to-arrangement control, global and per track (READ), and "capture to arrangement" later. Switching views must not change playback (READ). Keep the arrangement as the single document.
6. **Mixer view over the same Host tracks**, with selection shared across views (Bitwig SNIPPET), strips with fader, pan, M, S, sends and meters, plus master. The toolbar button is already there, disabled.
7. **Settings: tabs Audio, MIDI, Display; Audio first**; remember choices; a "default view" and zoom/density in Display (MEMORY of the products; no page read). Wording copies the products: "Settings" (Live 12 SNIPPET), "Driver" is replaced by "Output device".

**The version after**

8. **FLAC export** with libflac.js (MIT, READ) in a worker; **Opus** only if `AudioEncoder.isConfigSupported` is true in the shipped Chromium; **MP3** optional through lamejs (LGPL, READ the file; check AGPL fit). The WebCodecs registry READ makes none of them mandatory. Do not use MediaRecorder for bounces (real time).
9. **Plug-in hosting and the platform rules** (for R1's file): Apple READ says quarantined plug-ins load only if notarised, otherwise the user must approve them in System Settings; a host must carry the entitlements its plug-ins need (`allow-jit`, `allow-unsigned-executable-memory`, `disable-library-validation`). An ad-hoc signed unsigned host with hardened runtime and the default entitlements (only `allow-jit`, schema READ) will refuse to load some plug-ins until those entitlements are added.
10. **Real signing, when the owner chooses**: Apple Developer Program + notarisation (READ: annual fee, Developer ID certificate, hardened runtime, timestamp); Windows via Azure Artifact Signing if the owner's country is eligible (READ: cheapest, removes SmartScreen warnings, limited countries) else an EV certificate on hardware or a cloud signer (READ). Then auto-update through update.electronjs.org (READ: public repo, GitHub Releases, signed on macOS) or electron-updater.
11. **MIDI input tab** and clock offset (Maschine SNIPPET names "Clock Offset" for MIDI clock); Web MIDI needs a secure context and a user grant (READ).

## 7. What I could not find

- Live's Audio settings page and its field order, defaults and wording (the Live 11 PDF is over Firecrawl's 50 MiB limit; two guessed slugs 404'd). I have only help-centre snippets and my memory.
- Logic Pro's audio settings, Mixer, Live Loops, Inspector and Library pages; Kontakt's Options pages; Ableton's Detail View and browser pages; Live's Dither Options values and sample-rate list.
- Microsoft's SmartScreen page (host refused); a primary source for EBU R 128 -23 LUFS, Apple Music's and YouTube's targets.
- Whether Electron 45's Chromium implements `AudioEncoder` for FLAC, Opus, MP3 or Vorbis, and whether `AudioContext.setSinkId` is on by default there: both must be tested at runtime.
- Any source on buffer size, exclusive mode or device-channel routing from Web Audio (absence of an API is MEMORY).
- The electron-builder docs site (host refused); I used the master `scheme.json`, which may differ from 26.18.0.
- Current prices for Apple's program, Azure Artifact Signing and EV certificates; GitHub quotas for private repositories; the Squirrel/electron-updater behaviour of an unsigned Windows build.
- Behaviour of Smart App Control, AppImage with FUSE absent, and Chromium's sandbox on current Ubuntu: need a real run.
- Maschine and Kontakt view models beyond the preferences page.
