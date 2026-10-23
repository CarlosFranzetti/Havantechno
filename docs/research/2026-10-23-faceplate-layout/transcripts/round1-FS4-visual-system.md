# F-S4: visual identity system — round 1
Agent model: Sonnet. Date: 2026-10-23.

## Scope

A visual-identity system so that Havantechno's 13 synths and 10 processors each look distinct yet read as one product. It covers: device families, an accent hue per family, typography, panel materials (flat vs subtle depth), spacing and density, and how a track colour and a device colour coexist. Ableton's flat theme and Logic's skinned plugin windows are the two poles. Layout (F-H1, F-H2, F-H5), per-device panel contents (F-H3, F-H4), implementation (F-S2) and interaction (F-S5) belong to other agents. I touch them only where colour or type decides something.

## What I looked at

- BRIEF.md in full.
- `docs/screenshots/studio-playing.png` and `docs/screenshots/studio-rack.png`, and the CSS block at the top of `studio/index.html`.
- 12 web searches (the whole budget). Two page fetches (support.apple.com, www.ableton.com) failed with `getaddrinfo ENOTFOUND`, so every web fact below rests on a search excerpt and is marked `(search excerpt: ...)`.
- Numbers marked "computed" come from a small Python script of mine (OKLCH to sRGB, WCAG relative-luminance contrast against the current panel colour `#15151e`). They are my arithmetic, not a source. The script is in the session scratchpad, not in the repo.
- Not searched, for lack of budget: the Live 12 theme file format; screenshots of Logic's Compressor circuit skins (the visual detail is not in any excerpt I got); formal audio-plugin UI style guides; colour-blind-safe palette guidance; third-party plugin design precedents (FabFilter, Arturia, Native Instruments).

## Findings

### A. What the current page does with colour (read from the two screenshots and the CSS)

1. All 13 strips are identical cards. Only a lowercase name distinguishes kick from riser; the strip header also repeats the name as the type ("kick kick", "bass bass"). Colour carries no identity at all.
2. Three accent colours are in play, each with one job today: pink `--acc #ff5fa2` for the wordmark and the active Play button; cyan `--acc2 #5fd8ff` for slider fills, value read-outs, `solo.on`, and every processor-unit title (`.unit h3`); green `--on #7cff8a` for the playhead, the "now" step and the current section.
3. Cyan is overloaded: it means "a value", "a control", "solo" and "this is an effect" at once. The processors screenshot is one hue of cyan titles on identical boxes, so delay, reverb, EQ, hp, lp, glue, sat and limiter differ only in text.
4. Borders (`--line #2a2a3a`) against the panel (`#15151e`) are about 1.3:1 (computed). That is fine for hairline separators. It means nothing but the label and the controls separate one card from the next, and that is why the grid reads as a wall.
5. Step cells use three greys (`#1e1e2a`, `#3b3b55`, `#55557a`) for off, hit and accent. Hit vs accent is a lightness step of a few percent. The playhead is the only vivid thing in the row.
6. The mute state is `opacity:.45` on the whole strip; the controls inside still look live.
7. Sliders are native `input[type=range]` tinted by `accent-color`, so they cannot carry a per-device look without replacement (F-S2's area).
8. Type is one stack for everything: `ui-monospace, Menlo, Consolas, monospace` at 13px, 11px for labels. Titles, labels and values differ only in size and colour.

### B. Ableton Live: theme and colour

1. Live is the flat pole. A Cubase-forum commenter describes Live at launch as "Simple colors and flat looking objects compared to mostly skeuomorphic design", with a GUI that has barely changed in about 24 years. (search excerpt: https://forums.steinberg.net/t/cubase-14-gui-design-regressions/953624?page=20) This is one user's opinion, not Ableton's.
2. The same results show the usual Live complaint: some users find the flat grey look dull and ask for skins, and one 2009 poster wanted track colours so as to make "optical groups" for faster recognition. (search excerpt: https://forum.ableton.com/viewtopic.php?p=1680435) That thread is a forum opinion. The excerpt does not say which of the Ableton forum URLs held which remark, so treat the attribution to this URL as approximate.
3. Live 12 introduced new themes. CDM reports "entirely new Themes, with a new approach to contrast and complimentary color that's easier on the eyes", and the default theme can follow the system light/dark setting. (search excerpt: https://cdm.link/ableton-live-12-everything-new/)
4. The Live 12 manual has, per the search excerpt, a Theme & Colors section in Settings, where the older Look/Feel preferences were split into Display & Input and Theme & Colors. Its Theme part sets the theme, light/dark/follow-OS, a warm/cool/neutral tone, high contrast, and a Customization tab for grid-line opacity, brightness and colour intensity and hue. It also has automatic track colouring on/off, a default track colour and fewer auto-assigned colours. (search excerpt: https://www.ableton.com/en/live-manual/12/ — the excerpt did not name the exact sub-page, and I could not fetch the manual to confirm.) The useful idea for Havantechno is that theming is parameterised (tone, contrast, intensity, hue), not a fixed palette.
5. Live's themes expose named colour tokens. The Max documentation says colour names are tokens that "reference specific colors across Live themes" and adapt to the active theme. (search excerpt: https://docs.cycling74.com/max8/refpages/live.colors) This is the same shape as CSS custom properties: components name a role, the theme supplies the value.
6. A third-party Live 12 theme tool describes "semantic colors" adjusted with OKLCH controls. (search excerpt: https://deafmanskwx.gumroad.com/landing/embed) It supports using OKLCH for a family palette, but it is a product page, not Ableton documentation.
7. Track colours in Live are a palette index; one community tool documents indices 0-69, and says so itself. (search excerpt: https://glama.ai/mcp/servers/rephlex187/Ableton-Live-MCP/tools/set_clip_color; community documentation, not Ableton's.)
8. Not found: any source on how Live colours its device title bars, or whether device colour follows track colour. Both are in "Recalled, not verified" below.

### C. Logic Pro: plugin look

1. Logic's classic plugins lean skeuomorphic. A 2013 piece argues Apple accepts skeuomorphism "as long as it is functional" (search excerpt: https://512pixels.net/2013/07/skeuomorphism-logic-pro-x/). It predates later Logic versions.
2. A Splice post calls Logic's built-in Compressor highly skeuomorphic: rotary knobs, analog-style meters, colour palettes, and a layout meant to resemble outboard gear. It contrasts it with Space Designer, which relies more on waveforms and plain text fields. (search excerpt: https://splice.com/blog/?p=16766)
3. The Compressor has circuit-type buttons and "the interface updates when you choose a model". Apple's list (Mac guide excerpt) is Platinum Digital, Studio VCA and Studio FET, Classic VCA, and Vintage VCA, FET and Opto. (search excerpt: https://support.apple.com/guide/logicpro/compressor-main-parameters-lgcead9636ef/mac) The iPad guide lists Studio/Classic/Vintage VCA, Studio FET, Vintage FET and Vintage Opto. (search excerpt: https://support.apple.com/guide/logicpro-ipad/lpip25f51558/ipados) The two excerpts word the list slightly differently, so I give no definitive count.
4. The models are tied to named hardware: the Studio FET to the UREI 1176 Blackface, the Vintage FET to the Bluestripe, the Vintage VCA to the SSL bus compressor, the Studio VCA to the Focusrite Red 3, the Classic VCA to the dbx 160, and the Vintage Opto to the Teletronix LA-2A. (search excerpt: https://www.musictech.net/tutorials/logic-pro/understanding-compressor-circuit-types-in-logic/) That is the point of the skin: the face announces which machine it imitates, so the look encodes a sonic character.
5. Not found: what each skin looks like (colours, textures, knob styles). The excerpts say only that the interface changes. I will not describe the skins.
6. Not found: any statement that each Logic plugin has its own colour. One search explicitly returned nothing on a per-plugin colour scheme.

### D. Published guidance for dark UIs (generic, not audio-specific)

1. Material's dark theme guidance: desaturate accents ("Saturated colors also produce optical vibrations against a dark background, which can cause eye strain"), start surfaces from `#121212`, express elevation by lightening surfaces with a white overlay (shadows work poorly on dark), and meet 4.5:1 for body text on every elevation. The official page also cites 15.8:1 for 100% white body text on dark surfaces. (search excerpt: https://m2.material.io/design/color/dark-theme) The excerpt covers Material Design 2 only.
2. WCAG 1.4.11 Non-text Contrast: UI components and graphical objects need 3:1 against adjacent colours, including state indicators such as focus and selected; inactive components are exempt. (search excerpt: https://www.yatil.net/blog/non-text-contrast-in-detail-ui-components and https://tabnav.com/academy/wcag/success-criterion-1.4.11) Secondary sources; I did not read the W3C text. This is the rule for knob arcs and slider fills against a panel.
3. Audio-plugin practitioners, on forums: a reviewer praised a dark panel where "bright rulers, pointers, and labels" separate the controls, so that lightness, not hue, does the work, and warned that red on grey blends for colour-blind users. (search excerpt: one of https://forum.image-line.com/viewtopic.php?p=1391191 or https://forum.image-line.com/viewtopic.php?p=1393079; the excerpt did not say which.) Another developer argued a dark theme can be readable if designed well, with heavier type and a background that is not pure black. (search excerpt: https://lists.linuxaudio.org/archives/linux-audio-dev/2022-June/038377.html or https://lists.linuxaudio.org/archives/linux-audio-user/2016-April/104781.html; the excerpt did not say which.) These are opinions, not guidance.
4. Not found: any published rule about identity colour vs state colour, or about control density, for audio software. The state-vs-identity rules in the design below are my own proposal, built from the dark-UI points above and from the three-accent split already in the current CSS.

### E. Computed facts about the proposed palette (arithmetic, not sourced)

- Accent "ink" at OKLCH L 0.78 / C 0.13 gives 8.6 to 9.5 : 1 against `#15151e` for all eight families (computed). Everything clears 4.5:1 for text and 3:1 for graphics with a wide margin.
- A "dim" tone (inactive / bypassed / arc background) at L 0.50 fell to 2.9 to 3.2:1, borderline against the 3:1 rule. At L 0.54 it measures 3.4 to 3.7:1 (computed), so the table below uses L 0.54.
- The tone family at hue 270 is slightly outside sRGB at C 0.13 and clips; `#9cb4fe` (C 0.11) is a safe in-gamut value, and I use it.

### F. The proposal: a token system

#### 1. Principle: neutral chassis, one hue per family, state by fill

- The chassis (page, rack, panel, controls' resting state) is neutral and slightly blue-black, as now. Roughly 90% of pixels stay neutral. This is Ableton's pole: flat and quiet.
- Identity is carried by (a) a family hue used only as thin line and ink (header underline, knob arc, slider fill, glyph, hero-graph stroke), and (b) a per-device motif (a glyph and a hero visualisation, section 6). This is the Logic pole in miniature: you recognise the face before you read the label. It is not skeuomorphic; it is a flat "skin".
- State is carried by fill, never by family hue. A control that is on, armed, soloed or playing is a filled shape; an identity element is an outline or a stroke. A colour-blind user, or anyone looking at greyscale, can still separate the two because the shapes differ, which also answers the red-on-grey warning in D3.
- Redundancy order: position and label first, then lightness, then hue. Hue is the weakest cue, so no meaning may rest on hue alone.

#### 2. Families (eight), mapping the 13 synths and 10 processors

Synths: drums (6), bass (2), keys (3), fx (2). Processors: dynamics (3), time (3), tone (3), utility (1). The "fx" family means the two transition synths (riser, impact), not effects in general. In the UI I would label it "sweeps and hits" to avoid the clash with "effects".

#### 3. Colour tokens (OKLCH source, hex computed, ink L 0.78 C 0.13, dim L 0.54, wash L 0.24)

| Family | Hue (deg) | `--fam-ink` | `--fam-dim` | `--fam-wash` (header tint) |
|---|---|---|---|---|
| drums | 45 (orange) | `#fc9b6f` | `#9a5d40` | `#31180c` |
| fx (sweeps and hits) | 90 (gold) | `#d8b349` | `#836c28` | `#281e02` |
| time-based | 190 (teal) | `#21d1ca` | `#0c7f7a` | `#002624` |
| keys | 235 (sky blue) | `#55c4fe` | `#30779c` | `#042232` |
| tone | 270 (periwinkle) | `#9cb4fe` | `#5a6ca4` | `#171e35` |
| bass | 300 (violet) | `#c4a4fe` | `#77629c` | `#231a32` |
| dynamics | 335 (magenta) | `#ea97d8` | `#8f5a84` | `#2c1628` |
| utility | neutral (C 0.02) | `#b0b8c5` | `#6a6f77` | `#1d1f23` |

State tokens (fixed hue, higher chroma than any identity colour; contrast vs panel, computed): `--on` green `#75f97f` (13.5:1; today's `#7cff8a` is equivalent, keep it); `--arm` red `#ff4c4d` (5.5:1); `--solo` near-white `#eeeeee` (15.6:1); mute and bypass have no hue (see below). Hue gaps: identity hues keep 20 degrees or more from the state hues (green 145, red 25). Note drums at 45 is only 20 degrees from red, which is the tightest gap and the first thing to check by eye.

Brand pink `#ff5fa2` (hue about 355) stays on the wordmark and the main transport button only, as now. It is 20 degrees from the dynamics magenta (335), so I would restrict the brand to those two places. If that proves confusing, move dynamics to another hue (the group's call).

Seven chromatic families on a colour wheel is the practical limit. Neighbouring hues (teal 190 and sky 235, periwinkle 270 and violet 300) are 35 to 45 degrees apart; they separate as families only with the label, glyph and motif beside them. This is why section 6 gives every device its own motif and why the table states that hue alone never identifies a device. I did not test colour-blind separation of the palette. That is unverified.

Neutrals (keep the current values as the base): `--bg #0b0b10`, `--panel #15151e`, `--panel-raised` about `#1b1b26`, `--line #2a2a3a`, `--fg #d8d8e6` (12.9:1), `--dim #8a8aa0` (5.4:1). Use the Material rule (D1): raise a surface by lightening it, not by a drop shadow.

#### 4. State rules (colour for state, not identity)

| State | Treatment | Why |
|---|---|---|
| playing / on | filled `--on` (playhead, now-step, current section), as now | already the one vivid green on the page |
| armed / record | filled `--arm` | rare state; red |
| solo | filled `--solo`, dark text | a light fill cannot be mistaken for any family |
| mute | strip desaturated to neutral, ink replaced by `--dim`, a diagonal hatch on the header, and the M button lit (not opacity .45 on everything) | readable in greyscale |
| bypass (all 10 processors) | header underline switches from `--fam-ink` to `--fam-dim` with a hatch; hero graph drawn dashed | the device keeps its family but looks "off" |
| focus | 2px outline in `--fg`, never a family colour | must work on every family at 3:1 or better |
| selected step / accent step | lightness step of `--fam-ink` (dim, mid, full), the playhead overlay stays `--on` | the step row takes its family's hue, so a kick row and a hat row differ without reading labels |

#### 5. Type

- Two roles only. Labels and titles: the system UI sans stack (`system-ui, -apple-system, "Segoe UI", sans-serif`), 10 to 11px, uppercase with 0.06 to 0.08em letter-spacing, weight 600. Values and numerals: the existing mono stack with `font-variant-numeric: tabular-nums`, 11px, so a changing number never jitters. Panel titles: sans 13px, weight 700, in `--fg`; the family colour goes on the underline and glyph, not on the text (text in family ink would make seven different text colours on one screen).
- No web-font files. The repo's rule is "no build step", and a system stack keeps the page offline. Cost: the look differs slightly by OS. Unverified: how the stack renders on the owner's machine.
- Dark-theme legibility (D3): keep weight at 500 or above for small text and do not go below 10px.

#### 6. Per-device identity inside a family: glyph and hero visualisation

Hue separates families. Within a family (six drums share one orange) devices must differ by motif. Every device gets (i) a 16px glyph in its header, drawn in inline SVG from the family ink, and (ii) a hero visualisation, the one picture a user looks at, drawn in family ink on a `--fam-wash` ground. This is the replacement for Logic's per-model skin: instead of a different painted panel, a different live graph.

| Device | Family | Accent | Glyph and hero visualisation (my design proposals) |
|---|---|---|---|
| kick | drums | orange `#fc9b6f` | circle; pitch-drop curve plus amp envelope |
| clap | drums | orange | three short bursts; burst-spacing diagram |
| hat_closed | drums | orange | short tick; very short envelope |
| hat_open | drums | orange | long tick; long decay envelope (same graph as hat_closed, different length, so the pair reads as siblings) |
| shaker | drums | orange | wavy line; noise burst with filter band |
| perc | drums | orange | diamond; pitch-and-decay pad |
| sub | bass | violet `#c4a4fe` | sine; one slow sine with level meter |
| bass | bass | violet | saw; waveform plus filter cutoff curve |
| stab | keys | sky `#55c4fe` | stacked bars; chord-note stack with envelope |
| lead | keys | sky | single rising line; waveform plus glide |
| pad | keys | sky | wide hill; slow attack/release envelope |
| riser | fx | gold `#d8b349` | upward ramp; rising sweep curve |
| impact | fx | gold | starburst; fast-decay hit curve |
| compressor | dynamics | magenta `#ea97d8` | gain-reduction needle; transfer curve with live GR meter |
| limiter | dynamics | magenta | ceiling line; level vs ceiling meter |
| sidechain | dynamics | magenta | dip in a line; duck envelope (shared with the "duck depth" slider on every track) |
| delay | time | teal `#21d1ca` | decaying taps; tap-train graph (time, feedback) |
| reverb | time | teal | tail curve; decay-time and pre-delay graph |
| chorus | time | teal | wobbling line; modulation sine |
| filter | tone | periwinkle `#9cb4fe` | response curve; filter shape (mode, cutoff, q) |
| eq3 | tone | periwinkle | three-band curve; 3-point EQ curve (low, mid, high) |
| saturator | tone | periwinkle | S-curve; transfer curve (drive, tone) |
| widener | utility | neutral `#b0b8c5` | two arcs; stereo-width fan (or a goniometer if F-S2/F-H4 find it cheap) |

The master chain (EQ, hp, lp, glue, sat, limiter) reuses the processors' families, so the master's glue compressor is magenta and its hp/lp are periwinkle. No new colours are needed for the master; the master and send strips themselves are neutral (see section 8).

#### 7. Panel materials: flat by default, depth earned

Three tiers, selected by a `data-skin` attribute so a device can move between them without touching colour:

- **flat** (default for all 23): `--panel` fill, 1px `--line` border, 4px radius, header with `--fam-wash` ground and a 2px `--fam-ink` underline. This is Ableton's pole, and it is what a 200-bar, 13-track screen needs: no per-pixel cost, no noise.
- **plate** (optional): flat plus a faint top highlight (`linear-gradient(180deg, rgba(255,255,255,.04), transparent 40%)`) and a 1px inner top edge. CSS only. This is the subtle depth Material recommends for a dark UI (D1: lighten, don't shadow). Use it for the focused or expanded device, so depth means "this is the one you are editing".
- **skin** (at most four hero devices, only if the group wants a Logic-like moment): a distinct panel ground (an SVG `<pattern>` or a gradient) and a different knob rendering. Candidates: compressor, reverb, kick, bass. This tier costs more per device and must be justified, because the skin must still pass the 3:1 contrast rule for controls (D2). Logic uses the skin tier to tell you which hardware a plug-in imitates (C4). Havantechno's compressor has no model selector, so I would not invent circuit types; a skin without a meaning would be decoration. (Unverified: whether the group wants any skin tier at all.)

I recommend shipping flat and plate only at first, and adding skin per device only when a device earns it.

#### 8. Spacing, density and the 4px grid

- 4px base unit. Gaps: 4 (control to label), 8 (control to control), 12 (module padding), 16 (between modules). Radius 4px on modules, 2px on controls.
- Three density levels, one per zoom, all using the same tokens: (1) chip, a 28px-high insert slot showing only glyph, name and bypass; (2) strip, the collapsed module with header, mini hero graph and 3 to 5 key controls; (3) faceplate, the full module with every parameter. The current spec objects have 3 to 9 controls per device (`eq3` has 9), so the faceplate fits in about 4 control columns of 3 rows without scrolling. This density figure is my own estimate from the screenshots.
- Minimum hit target of 24px for any control (a WCAG 2.2 figure I recall, not verified in this session). The current 14px step cells are below that, so touch use needs a taller step row (F-S5's area).
- Tabular figures for every value readout, fixed-width value columns (the current `.v` already has `min-width:52px`).

#### 9. How a track colour and a device colour coexist

Two colours, two jobs, two positions, never competing for the same pixels:

- **Track colour** answers "which track is this?". It is a 4px rail on the left edge of the strip, the clip/lane tint in the arrangement and the stem lane, and the fader cap in the mixer. It is drawn muted (L 0.70, C 0.09) so it is always quieter than a device ink.
- **Device colour (family ink)** answers "what kind of device is this?". It lives inside the module: header underline, glyph, knob arcs, slider fills, hero graph.
- Default: a track's colour is its instrument's family hue at the muted level. That means zero setup, and a kick track is orange without anyone choosing it. A user may override the track colour (a free palette of about 12 muted swatches, same L and C). When the override changes the rail, the device inside still shows its family ink, so a pink-railed kick still reads as drums by its glyph and orange underline.
- Inserts: a processor sitting on a track keeps its own family ink even though it sits under the track's rail. Sends and master are neutral: a grey rail and utility ink, so the tracks stay the only coloured rails.
- Collision rule: when track colour and device ink are within about 30 degrees of hue (for example a user paints a drum track orange, or a keys track sky blue, and that track's own device is already that hue), the rail is the track's job and the ink is the device's job, and the position cue still separates them. If it bothers the owner, the fallback is to draw the rail as a 4px outline-only bracket instead of a fill. I have not tested this by eye. (unverified)
- A single `--track` variable and a single `--fam-*` set are set per element in CSS, so the same component works in the strip, the mixer and the arrangement with no per-device stylesheet.

#### 10. Token plumbing (CSS custom properties, no build step)

```
:root { --bg:#0b0b10; --panel:#15151e; --line:#2a2a3a; --fg:#d8d8e6; --dim:#8a8aa0;
        --on:#75f97f; --arm:#ff4c4d; --solo:#eeeeee; --brand:#ff5fa2; }
[data-fam="drums"]    { --fam-ink:#fc9b6f; --fam-dim:#9a5d40; --fam-wash:#31180c; }
[data-fam="fx"]       { --fam-ink:#d8b349; --fam-dim:#836c28; --fam-wash:#281e02; }
[data-fam="time"]     { --fam-ink:#21d1ca; --fam-dim:#0c7f7a; --fam-wash:#002624; }
[data-fam="keys"]     { --fam-ink:#55c4fe; --fam-dim:#30779c; --fam-wash:#042232; }
[data-fam="tone"]     { --fam-ink:#9cb4fe; --fam-dim:#5a6ca4; --fam-wash:#171e35; }
[data-fam="bass"]     { --fam-ink:#c4a4fe; --fam-dim:#77629c; --fam-wash:#231a32; }
[data-fam="dynamics"] { --fam-ink:#ea97d8; --fam-dim:#8f5a84; --fam-wash:#2c1628; }
[data-fam="utility"]  { --fam-ink:#b0b8c5; --fam-dim:#6a6f77; --fam-wash:#1d1f23; }
```

The device registry (name to family) can sit in one plain object next to the parameter specs, so adding a 24th device means one row. The hex values are computed approximations from OKLCH (E), not hand-tuned.

## What Havantechno could borrow

- From Ableton: a flat, quiet chassis; theming as parameters (tone, contrast, intensity) over named colour tokens, not a fixed palette (B4, B5); a muted track colour that never shouts over the content.
- From Logic: the face announces what the device is before you read the label (C2, C4). I reproduce that with a per-device glyph and live hero graph, not with painted skins; the optional skin tier is there if the group wants the fuller version.
- From the dark-UI guidance: lighten surfaces instead of using shadows, desaturate accents, keep graphics at 3:1 or better, keep the page off pure black (D1, D2, D3).
- From the current page: keep the neutrals, the green "on" and the pink brand as they are. Only the cyan changes meaning, from "everything" to "keys family and value text". Value text should move to `--fg`/neutral so that cyan means one thing.

## What would not fit (and why)

- Full skeuomorphic skins for all 23 devices. Twenty-three painted panels is a big art budget with no source for how Logic does it; Logic's compressor skins carry meaning (a hardware model) that Havantechno's devices do not have (C3, C4).
- A free per-device colour picker. It would erase the family signal. Only the track colour is user-editable.
- Hue as the only cue. Seven chromatic hues on one wheel cannot give 23 distinct colours, and they cannot survive colour-blindness or greyscale. Glyph, label and hero graph carry the rest.
- Pure Ableton-style grey with no hue. It is what the current page nearly is, and it is the problem the owner's direction (D1 to D3 in `prd.md`) wants solved.
- Colour-coding bypass or mute by hue. Both need a non-hue treatment (hatch, dash, desaturation) to work in greyscale.

## Build notes (plain HTML/CSS/SVG/JS, no build step)

- All colour is CSS custom properties. A module root gets `data-fam="..."` and, per track, `style="--track:..."`. Components read `var(--fam-ink)`. This works in every current browser and needs no JS beyond setting attributes. (Browser support not checked this session.)
- Authoring the palette in OKLCH is a design-time convenience; the shipped CSS can carry hex (as above) so nothing depends on `oklch()` support. If `oklch()` is acceptable, `color-mix` and relative colours could derive dim and wash from ink; I did not verify support, so the hex table is the safe default.
- Glyphs are small inline SVG symbols (`<symbol>` plus `<use>`), stroke `currentColor`, so one glyph recolours by family for free. Hero graphs are SVG paths redrawn from the parameter values, which is cheap for 3 to 9 parameters per device.
- The `data-skin` attribute selects flat, plate or skin through CSS selectors only. The plate gradient and inset edge are plain CSS; skins would be inline SVG patterns.
- Dark-only to start. Live 12 follows the system light/dark setting (B3), but a light theme doubles the palette work and nothing in the brief asks for it. If added later, tokens make it a second `:root` block; the dim and wash values would need redoing.
- `studio/selfcheck.js` fakes the AudioContext only, so visual tokens do not touch the check. The only coupling is that the device-to-family registry should reuse the type names already in `Synths` and `Processors`.

## Recalled, not verified

- That Live's device title bars are one neutral grey regardless of device type, and that Live's browser uses coloured category markers. I recall this from using Live; no source here confirmed it. Search B8 found nothing.
- That Live clips take their track's colour by default and that track colours are chosen from a fixed palette. The community tool in B7 and the Max Palette device suggest a palette, but I did not read Ableton's text.
- That Logic colours tracks and regions with a fixed palette, and that the Compressor skins differ in panel colour and meter style. The excerpts say only "the interface updates" (C3).
- The WCAG 2.2 minimum target size of 24px. I did not search it.
- That separate light and dark Live 12 themes both exist in the default theme (B3 says the default follows the system).

## Questions for the group

1. Does the owner want any "skin" tier (painted, Logic-like hero panels), or is flat plus plate, with the glyph and hero graph carrying identity, enough? Gear Crew (the sister group) may decide this by what devices turn out to have meaningful models.
2. Should a track default to its family hue, or should every track start neutral and acquire colour only when the user paints it? My default is family hue for zero setup.
3. For F-H4: can the effect faces agree on one hero graph per device from section 6? If a device can't draw one cheaply, say so and I will give it a different identity cue.
4. For F-S2: can the knob and slider replacement take `var(--fam-ink)` for arc and fill, and a 24px minimum target?
5. Brand pink (hue 355) is 20 degrees from the proposed dynamics magenta (335) and drums (45) is 20 degrees from `--arm` red. Should the brand be restricted to the wordmark and Play button, or should dynamics move?

## Sources

All pages below appeared in search results; none could be fetched (the two fetch attempts failed with `getaddrinfo ENOTFOUND`). Every web claim above rests on a search excerpt.

- https://forums.steinberg.net/t/cubase-14-gui-design-regressions/953624?page=20
- https://forum.ableton.com/viewtopic.php?p=1680435
- https://cdm.link/ableton-live-12-everything-new/
- https://cdm.link/2023/11/ableton-live-12-everything-new/
- https://www.ableton.com/en/live-manual/12/
- https://docs.cycling74.com/max8/refpages/live.colors
- https://deafmanskwx.gumroad.com/landing/embed
- https://glama.ai/mcp/servers/rephlex187/Ableton-Live-MCP/tools/set_clip_color
- https://512pixels.net/2013/07/skeuomorphism-logic-pro-x/
- https://splice.com/blog/?p=16766
- https://support.apple.com/guide/logicpro/compressor-main-parameters-lgcead9636ef/mac
- https://support.apple.com/guide/logicpro-ipad/lpip25f51558/ipados
- https://www.musictech.net/tutorials/logic-pro/understanding-compressor-circuit-types-in-logic/
- https://m2.material.io/design/color/dark-theme
- https://www.yatil.net/blog/non-text-contrast-in-detail-ui-components
- https://tabnav.com/academy/wcag/success-criterion-1.4.11
- https://forum.image-line.com/viewtopic.php?p=1391191
- https://forum.image-line.com/viewtopic.php?p=1393079
- https://lists.linuxaudio.org/archives/linux-audio-dev/2022-June/038377.html
- https://lists.linuxaudio.org/archives/linux-audio-user/2016-April/104781.html

Local files read: `docs/research/2026-10-23-faceplate-layout/BRIEF.md`, `docs/screenshots/studio-playing.png`, `docs/screenshots/studio-rack.png`, `studio/index.html` (CSS block), `studio/synths.js` and `studio/processors.js` (type names and parameter-spec counts only).
