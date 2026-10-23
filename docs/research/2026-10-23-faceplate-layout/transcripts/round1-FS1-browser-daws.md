# F-S1: browser DAWs that exist today — round 1
Agent model: Sonnet. Date: 2026-10-23.

## Scope

Which browser DAWs exist now, how each lays out tracks, devices and plugin panels in HTML, how they draw controls (DOM, SVG or Canvas), how they give a device its own look, what they do badly, and which of them host Web Audio Modules (WAM) plugins. Open-source browser DAWs are listed with their licences. Ableton Live and Logic Pro are covered by other agents and are not repeated here.

Evidence quality is low for layout. Only github.com pages could be fetched in this sandbox (every other host failed with a DNS error), so almost everything below rests on search excerpts. I could not see any DAW's actual screen. I say "not found" wherever the excerpts were silent.

## What I looked at

- Both screenshots named in the BRIEF. `studio-playing.png` shows 13 identical track cards in a 4-column grid under a header bar and a section-chip row; each card has a 16-step row, 5 sliders (level, pan, send delay, send reverb, duck depth) and a collapsed "synth parameters" disclosure. `studio-rack.png` shows the processors (send delay, send reverb, master eq/hp/lp/glue/sat/limiter) as the same kind of card: title, optional bypass button, then a plain slider list. Every device looks the same, which is the problem the owner wants solved.
- 12 web searches (the full budget). Topics: openDAW (twice, the second returned nothing useful), Audiotool (twice), Amped Studio, WAM hosts, GridSound, BandLab/Soundtrap/Soundation comparison, WAM-Studio, open-source browser DAWs, BandLab effects, Soundation/Soundtrap layout.
- Page fetches that worked: `https://github.com/f15u/opendaw` only. Fetches that failed (DNS): audiotool.com and help.audiotool.com manuals, bedroomproducersblog.com, de.github.com, en.wikipedia.org, sonicstate.com, documentarytube.com, ampedstudio.com, help.bandlab.com, blog.bandlab.com.
- Not got to: Soundtrap on its own (no result mentioned its layout at all), Soundation's panel placement, Amped Studio's own interface page (its URL appeared in a result but the fetch failed), any screenshot of any product, the GridSound and WAM-Studio repositories themselves, Signal/other piano-roll apps, Bitwig-style web projects.

## Findings

### openDAW (open source, by André Michelle)
- Licence: AGPL v3 or later, copyright 2025 André Michelle; a separate commercial licence exists for closed-source or incompatible use. (verified: https://github.com/f15u/opendaw) Note: this is the repo copy I could fetch; whether it is the upstream or a fork was not stated on the page.
- Stack: README says it "tries to avoid external libraries and frameworks"; it lists jszip, markdown-it, d3-force, soundfont2, zod and ffmpeg.wasm; build needs Node.js 23+, TypeScript, Sass. (verified: https://github.com/f15u/opendaw) So the project itself needs a build step; Havantechno cannot reuse its source directly in a no-build repo.
- Stock devices (README list): Vaporisateur (subtractive synth), Playfield (sample drum computer), Nano (sampler), Tape, Soundfont, MIDI Output, Stereo Tool, Delay, Crusher, Cheap Reverb, Revamp (EQ with spectrum analyser), Arpeggio, Pitch, Zeitgeist, Velocity, Fold, Tidal, Dattorro Reverb, plus a ported Compressor excluded from the commercial licence. (verified: https://github.com/f15u/opendaw) Device names are short, distinctive and jokey; the set maps closely onto Havantechno's synths and processors (kick/clap/hat versus Playfield; delay, reverb, compressor, EQ, saturation-like Crusher/Fold).
- Layout: reviewers say the timeline and device panel feel familiar to anyone who has used Ableton or Bitwig; it records and arranges audio and MIDI, mixes, and lets users write custom audio effects and MIDI processors in JavaScript. (search excerpt: https://bedroomproducersblog.com/2026/08/22/opendaw-review/ ; the same excerpt set also listed https://midnightrebels.com/no-signup-no-subscription-opendaws-browser-daw-model/ and https://create.routenote.com/blog/?p=18385, and I cannot tell which of them said which part)
- Maturity: one source calls it a prototype ahead of a September 2026 launch with an event in Cologne on 3 October; another calls it early development. Projects are saved in the browser, so clearing site data loses them. (search excerpt: https://bedroomproducersblog.com/2026/08/22/opendaw-review/)
- Rendering technology (DOM, SVG or Canvas): the README does not say; a search for it returned nothing about openDAW. Not found.
- WAM hosting: README does not mention WAM or third-party plugins. (verified: https://github.com/f15u/opendaw)
- Per-device look and weaknesses: not found. The screenshot file named in the README ("studio-teaser.png") exists but I could not view it.

### Audiotool
- The desktop is a free-form modular workspace: devices can be added anywhere on it and cables are dragged from outputs to inputs, "mirroring the workflow of early electronic musicians". (search excerpt: https://www.audiotool.com/compare/audiotool-vs-bandlab ; this page is written by Audiotool, so it is promotional)
- A device browser lists synthesizers, drum machines, effects and utilities, in grid or list view with categories such as Drums and Synthesizers. (search excerpt: https://www.audiotool.com/help/manuals/library/devices.html)
- Named devices: Pulverisateur (virtual-analog synth, three oscillators, dual filters, full modulation), Heisenberg (four-operator phase-modulation synth with a modulation matrix), Machiniste, Beatbox 8, Beatbox 9, Space. (search excerpt: https://www.audiotool.com/devices/pulverisateur and https://www.audiotool.com/devices/heisenberg)
- Every knob or slider can be controlled from real hardware, per the MIDI page. (search excerpt, as summarised from the search results; no single URL was shown for that sentence beyond the device manual above)
- Appearance of the devices (skeuomorphic or not), rendering technology, WAM hosting, weaknesses: not found. The search tool said explicitly that no source describes the visual design.
- Lineage: the openDAW author previously built Audiotool. (search excerpt: https://bedroomproducersblog.com/2026/08/22/opendaw-review/ , one of the listed results)

### Amped Studio
- Its instruments and effects use the Web Audio Module format; bundled OBXD and DEXED instruments are based on classic analogue and FM synths; three free guitar-amp WAM simulators (Clean Machine, Metal Machine, Distortion Machine) were added later. (search excerpt: https://www.kvraudio.com/news-print.php?id=43058 and https://www.sonicstate.com/news/2020/07/06/amped-studio-connect-vsts-to-browser-based-daw/)
- A separate VST/Remote host gives experimental support for 64-bit VST2 plugins only, one active VST per project, no VST parameter automation. (search excerpt: https://www.sonicstate.com/news/2020/07/06/amped-studio-connect-vsts-to-browser-based-daw/)
- Version 2.0 added volume and pan automation and a "Content Editor". (search excerpt: https://www.audiomasterclass.com/blog/announcing-amped-studio-2-0-a-revolution-in-online-music-making)
- Later became a PWA that works offline once assets load. (search excerpt: https://www.kvraudio.com/news-print.php?id=47451)
- Price: premium tier about USD 4.99 per month or 49.99 per year, approximate, seen in a search excerpt on 2026-10-23 whose sources date from 2020, so it may be out of date. (search excerpt: https://www.sonicstate.com/news/2020/07/06/amped-studio-connect-vsts-to-browser-based-daw/)
- Layout, mixer view, panel placement, rendering technology: not found. Its manual page "1.4 Interface Overview" at https://ampedstudio.com/manual/interface-overview appeared in a search result, but the fetch failed, so I know nothing of its content.
- Hosts WAM: yes (see above).

### BandLab
- Workspace is called Studio (the help centre says "Studio" or "Arrange View"; one third-party guide says "Mix Editor"). (search excerpt: https://help.bandlab.com/hc/en-us/articles/115002945473-Adding-Effects and https://www.audeobox.com/learn/bandlab/bandlab-using-effects/)
- Effects: select a track, click Effects at the bottom left (or the +Fx control under the track name), choose a Preset or Add Effect. Effects form a chain of at most 10 per track (20 with a Membership); reorder by dragging; a power toggle bypasses an effect. A third-party guide places the effects panel on the right instead, so the position differs by source and probably by version. (search excerpt: https://help.bandlab.com/hc/en-us/articles/115002945473-Adding-Effects and https://www.audeobox.com/learn/bandlab/bandlab-using-effects/)
- Presets are the main entry point: more than 50 vocal, 40 guitar and 20 bass presets; users can save and share their own. (search excerpt: https://help.bandlab.com/hc/en-us/articles/115002945473-Adding-Effects)
- "One Knob" effects need a Membership. (search excerpt: same URL)
- Knob layout per effect, rendering technology, WAM hosting: not found.
- Reviewers call its arrangement view and mixer windows familiar. (search excerpt: https://www.musicianwave.com/?p=602101 ; secondary source, some of that results page looks like ranking filler)

### Soundtrap
- Owned by Spotify, aimed at education and podcasts, described as cleaner than BandLab with multitrack audio and MIDI plus built-in instruments and effects; advanced features and sound libraries are tiered by plan. (search excerpt: https://www.techjockey.com/compare/bandlab-vs-soundtrap and https://gitnux.org/best/online-daw-software/ ; secondary sources)
- Layout, panel style, rendering, WAM: not found. No result described Soundtrap's screen.

### Soundation
- Described as feature-rich, browser-based, with an integrated mixer; effects are EQ, compression, delay and reverb. A press clipping calls the effects basic, with "very rudimentary controls, often only one or two dials", and lists a clean, clear interface as a pro. Audio samples can be converted to MIDI by drag-and-drop. (search excerpt: https://soundation.rockpaperscissors.biz/artist/19187/press_clips/29516/white and https://appmus.com/software/soundation-studio)
- Panel placement, rendering, WAM: not found.

### GridSound (open source)
- Browser DAW on the Web Audio API with a piano roll, a basic synthesizer, a drum-loop editor, WAV export, save and reopen; the mixer had only one effect (a filter) at the time of the text. (search excerpt: https://www.patreon.com/gridsound/about)
- Licence: one secondary article says the main repository displays AGPL-3.0 and describes the project as "half open-source"; I could not confirm on GitHub. (search excerpt: https://www.documentarytube.com/blog/gridsound-an-audio-workstation-in-your-browser-what-it-can-do-today/ ; the repo is at https://de.github.com/gridsound/daw per the results, but that fetch failed)
- The organisation also publishes UI components and a Web Audio library as separate repos. (search excerpt: https://www.patreon.com/gridsound/about)
- Status: free, explicitly work in progress, a version said not to be ready for Firefox. (search excerpt: documentarytube URL above)
- Rendering technology and layout: not found.

### WAM-Studio and the Web Audio Modules standard
- WAM-Studio is an open-source DAW built on Web Audio, Web MIDI, WebAssembly and Web Components plus the WAM plugin standard, developed since 2022 and positioned as a technology demonstrator; its fork is called Attune. Licence and repository URL: not found. (search excerpt: https://ieeexplore.ieee.org/document/10704163)
- WAM 2.0: started in 2015, reached 2.0 in 2021; a plugin's GUI is a web component, a plugin can be loaded in a single HTML page, and a host may run plugins headless without their GUI. (search excerpt: https://aes2.org/publications/elibrary-page/?id=23110 and https://faustdoc.grame.fr/manual/deploying)
- The `wam-plugin` npm package is a web component that loads a WAM plugin and can be a child of a "WAM Host" web component. (search excerpt: https://www.npmjs.com/package/wam-plugin)
- Most WAM plugins are written in Faust and exported with faust2wam. (search excerpt: https://faustdoc.grame.fr/manual/deploying and https://faust.grame.fr/community/ifc/2024/FAUST-based_Web-Audio_Modules.pdf)
- The IEEE excerpt says most online DAWs are closed source. (search excerpt: https://ieeexplore.ieee.org/document/10704163)

### Other open-source projects seen in results (not examined)
- ComposeYogi: listed as MIT, Tone.js instruments, piano roll, per-track volume/pan/mute/solo mixer. The licence claim is from a directory site; unconfirmed. (search excerpt: https://alternativeto.net/software/composeyogi/about)
- Futureboard (native Rust core with a React web UI) and AUDIAW: open-source DAWs, not primarily browser-based, licences not stated. (search excerpt: https://awesome.ecosyste.ms/projects/github.com%2Ffutureboard%2FFutureboard and https://lablab.ai/ai-hackathons/ibm-bob-hackathon/aloofgarage/audiaw)

### Summary table (what I could establish)

| DAW | Device area | Device faces | Draws controls with | Hosts WAM | Licence |
|-----|-------------|--------------|---------------------|-----------|---------|
| openDAW | "device panel" (reviewers) | not found | not found | not mentioned in README | AGPL v3+ (verified) |
| Audiotool | free desktop plus cables | not found | not found | not found | closed (unverified) |
| Amped Studio | not found | WAM GUIs (web components) | not found | yes | closed (unverified) |
| BandLab | effects chain on selected track, bottom-left or right | presets first | not found | not found | closed (unverified) |
| Soundtrap | not found | not found | not found | not found | closed (unverified) |
| Soundation | not found | one or two dials per effect | not found | not found | closed (unverified) |
| GridSound | mixer, one effect | not found | not found | not found | AGPL-3.0 (one secondary source) |
| WAM-Studio | not found | WAM web components | web components | yes | not found |

### Two ASCII sketches of what the evidence supports

Selected-track chain (BandLab, and what reviewers say of openDAW):

    +-----------------------------------------------+
    | transport                                     |
    +----------+------------------------------------+
    | track    | timeline / arrangement             |
    | list     |                                    |
    +----------+------------------------------------+
    | [Synth face] -> [FX 1] -> [FX 2] -> ... (max) |   <- selected track only
    +-----------------------------------------------+

Free desktop with cables (Audiotool, per its own marketing):

    +-----------------------------------------------+
    |  [Device] ~~cable~~> [Device] ~~> [Mixer]     |
    |      \__cable__> [Device]                     |
    +-----------------------------------------------+

## What Havantechno could borrow

1. Selected-track device chain, shown in one strip: instrument face first, then that track's inserts, each with a bypass toggle (BandLab's chain with power toggle and drag-to-reorder; the same shape reviewers describe for openDAW). It fits Havantechno's data directly (one instrument plus per-track inserts and sends) and replaces 13 always-open slider lists with one open chain.
2. Each device as its own web component (custom element) with its own face, because that is exactly how WAM plugin GUIs are shipped. It gives per-device looks now and leaves a path for WAM plugins later without a host rewrite. The `wam-plugin` and "WAM Host" element pair is the existing precedent.
3. Presets as the entry point, not parameters (BandLab's preset-first effects). For a remix DAW, "load source stem settings" can live in the same preset slot.
4. A device browser with grid and list views and category groups (Audiotool), if Havantechno ever lets users add inserts beyond the fixed 10 processors.
5. Short, memorable device names with a character (openDAW's Vaporisateur, Playfield, Tidal, Fold). They help each face carry an identity.
6. A spectrum or curve inside the EQ face (openDAW's Revamp is described as EQ with a spectrum analyser), which is the cheapest way to make one processor visibly different from the others.
7. A hard cap on chain length (BandLab: 10) to keep the chain strip readable.
8. Keep project state in the browser but offer export, since browser-only storage loses work when site data is cleared (openDAW warning). Havantechno already has WAV export; project save/export is the missing piece.

## What would not fit (and why)

- Audiotool's free desktop with cables. Havantechno has a fixed signal flow (instrument, channel strip, sends, master), so cabling adds work and no musical choice. Also not verified how it looks.
- Copying openDAW code. AGPL v3+ would extend to Havantechno if code were reused, and its build needs Node 23, TypeScript and Sass; Havantechno has no build step. Borrowing ideas and device vocabulary is fine; borrowing source is a licence decision for the owner.
- GridSound code, same reasoning (AGPL-3.0 per one secondary source).
- "One Knob" or one-to-two-dial effects (Soundation, BandLab's One Knob) as the whole interface. Soundation's effects are called rudimentary for exactly this reason; Havantechno's processors have 3 to 7 parameters each and the owner wants distinct faces, not simplified ones.
- Membership-style gating of features (BandLab, Soundtrap, Amped Studio). Not relevant to a repo-hosted studio.
- A VST remote bridge (Amped Studio): needs a native helper, which contradicts browser-only.

## Build notes (plain HTML/CSS/SVG/JS, no build step)

- A custom element per device (`customElements.define('hv-kick', ...)`) can be plain JS loaded with script tags, in the same load-as-globals style as the repo. Each element reads the same spec objects that `defineParams` already builds, so the data layer does not change.
- Theming through CSS custom properties on the host element lets each device family carry its own palette while sharing one set of tokens (sizes, spacing, type). Inside a shadow root the host's custom properties still inherit. (general web-platform knowledge, not sourced here)
- SVG for knobs, curves and the EQ display is possible without libraries; Canvas is better for a spectrum analyser or a long arrangement. I found no evidence of which approach any browser DAW uses, so the choice is open. F-S2 owns this.
- Hosting WAM later: a device element could implement the same contract that WAM host elements use (create an audio node, mount a GUI element). I did not read the WAM 2.0 API, so the exact interface is not claimed.
- Keep `selfcheck.js` in mind: its fake AudioContext must stub any new node type; custom elements themselves do not touch audio nodes and should not break it, but a DOM-less node run never loads them. (this follows from the repo CLAUDE.md, not from research)
- The chain strip is a horizontally scrolling flex row of fixed-height device elements; at 13 tracks only one chain is mounted at a time, so the number of live SVG panels stays small. (design inference, unverified)

## Recalled, not verified

- That Audiotool devices look like hardware rack units (skeuomorphic) and that the tool grew out of the older Hobnox site, which was Flash-based. The search surfaced a Hobnox Wikipedia URL (https://wikipedia.com/wiki/Hobnox) but I never read it, and the search tool said no result described the look.
- That Soundtrap, BandLab and Amped Studio put the mixer at the bottom or side and show instrument settings in a panel beside the track list. I have no source for any of it.
- That openDAW's own UI is hand-built with its own JSX-like layer rather than a mainstream framework. The README's "avoids external libraries and frameworks" supports only the general direction.
- That Amped Studio's WAM plugins open in floating windows. Not found.

## Questions for the group

1. If the repo's own licence is not AGPL-compatible, we must treat openDAW and GridSound as look-only references. What is Havantechno's licence, or is it undecided? (F-O2 or the coordinator may know.)
2. Is "selected-track chain at the bottom, one instrument face plus its inserts" acceptable as the main stage, given it hides 12 of 13 tracks' parameters at any moment? It trades overview for per-device faces.
3. Should the face contract be written now so a WAM host could slot in later (F-S2, F-O2)?
4. Can anyone with working page fetches get a real screenshot description of openDAW's device panel, Audiotool's desktop and Amped Studio's interface? I could not.

## Concrete suggestion (one)

"Selected-track rack": keep the header, transport and section chips. Replace the 13-card grid with a compact track list (name, M/S, level, 16-step row) on the left and, at the bottom, a chain strip for the selected track: instrument face, then its inserts, then a send/duck mini-section, each device a custom element with its own face and a bypass toggle (BandLab's chain, openDAW's device-panel shape as reviewers describe it). Master and sends sit in a second, toggled chain strip. Keep presets first and the parameter list one disclosure away.

## Sources

Verified (fetched):
- https://github.com/f15u/opendaw

Search excerpts only:
- https://bedroomproducersblog.com/2026/08/22/opendaw-review/
- https://midnightrebels.com/no-signup-no-subscription-opendaws-browser-daw-model/
- https://create.routenote.com/blog/?p=18385
- https://www.audiotool.com/compare/audiotool-vs-bandlab
- https://www.audiotool.com/help/manuals/library/devices.html
- https://www.audiotool.com/devices/pulverisateur
- https://www.audiotool.com/devices/heisenberg
- https://wikipedia.com/wiki/Hobnox (listed, not read)
- https://www.kvraudio.com/news-print.php?id=43058
- https://www.kvraudio.com/news-print.php?id=47451
- https://www.sonicstate.com/news/2020/07/06/amped-studio-connect-vsts-to-browser-based-daw/
- https://www.audiomasterclass.com/blog/announcing-amped-studio-2-0-a-revolution-in-online-music-making
- https://ampedstudio.com/manual/interface-overview (listed, fetch failed)
- https://help.bandlab.com/hc/en-us/articles/115002945473-Adding-Effects
- https://www.audeobox.com/learn/bandlab/bandlab-using-effects/
- https://www.musicianwave.com/?p=602101
- https://www.techjockey.com/compare/bandlab-vs-soundtrap
- https://gitnux.org/best/online-daw-software/
- https://soundation.rockpaperscissors.biz/artist/19187/press_clips/29516/white
- https://appmus.com/software/soundation-studio
- https://www.patreon.com/gridsound/about
- https://www.documentarytube.com/blog/gridsound-an-audio-workstation-in-your-browser-what-it-can-do-today/
- https://de.github.com/gridsound/daw (listed, fetch failed)
- https://ieeexplore.ieee.org/document/10704163
- https://aes2.org/publications/elibrary-page/?id=23110
- https://faustdoc.grame.fr/manual/deploying
- https://faust.grame.fr/community/ifc/2024/FAUST-based_Web-Audio_Modules.pdf
- https://www.npmjs.com/package/wam-plugin
- https://alternativeto.net/software/composeyogi/about
- https://awesome.ecosyste.ms/projects/github.com%2Ffutureboard%2FFutureboard
- https://lablab.ai/ai-hackathons/ibm-bob-hackathon/aloofgarage/audiaw
