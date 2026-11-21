# C1: the hardware (TB-303, TR-808, TR-909, Juno-106 and Juno-60, Minimoog Model D)

Agent C1, Circuit Crew, 21 November 2026 (ET). Question C1 of `BRIEF.md`.

## 0. How to read this file

Evidence tags, as the brief defines them, plus one I need:

- **READ** (url): I fetched the page or PDF this session through `firecrawl_scrape` or `curl` and the text said so. I quote the figure.
- **SNIPPET**: a search result summary only. I did not open the page.
- **MEMORY**: my own recollection, unverified. Do not build on it without a source.
- **PRIOR(Pn/Bn)**: a figure that an earlier transcript (P1 303, P2 Model D, P3 Juno, B2 808, B3 909) recorded as read. I did not re-fetch it. Treat as one step weaker than READ.

Important limit on what READ means for schematics. Firecrawl extracts the text layer of a PDF. The schematics are scanned drawings, so for every drawing I only received the annotations that survive as text (test-point notes, "selected" notes, IC labels), not the component values on the drawing. I could not look at the images. So "opened" below means "the document loaded and its text was read", and "legibility of the drawings" is **not assessed by me** unless I say a second source assessed it. The most legible drawings are probably the 300 dpi GIFs that the CA-72 project lists (section 9.1), but I did not open those.

Budget used: 17 searches (9 Firecrawl, 8 WebSearch), 14 page scrapes (12 Firecrawl pages and PDFs, 2 WebFetch that failed on DNS), plus `curl` to GitHub raw. The Firecrawl account ran out of credits after the 14th Firecrawl call (message: allowance resets 2026-11-22 06:40 UTC), so some planned reads did not happen (section 10).

Nothing was saved into the repository except this file. Scratch copies are in `/tmp/c1` only.

## 1. Hosts: what answered and what refused

`curl -sS -L` from this session (root URL, HTTP code):

- Answered: `www.firstpr.com.au` 200, `www.timstinchcombe.co.uk` 200, `cdn.inmusicbrands.com` 200 (root only; earlier crew P2 got 403 on the Minimoog PDF there; I did not retry the PDF), `raw.githubusercontent.com` 200 on every file I asked for.
- Refused or unresolvable (code 000, proxy tunnel refused): `archive.org`, `www.synthmanuals.com`, `manuals.fdiskc.com` (root), `electro-music.com`, `music.arts.uci.edu`, `www.synthfool.com`, `www.vintagesynth.com`, `www.sdiy.org`, `www.ti.com`, `www.beavisaudio.com`, `www.moogmusic.com`, `static.roland.com`.
- Bot-walled: `www.kvraudio.com` 403 (5311 bytes), `www.manualslib.com` 403 (5355 bytes). `github.com` root 400.
- Every specific service-note host in section 2 also returned 000 to `curl`; **Firecrawl** reached them (it fetches through its own network). So the only working route to scanned PDFs this session was `firecrawl_scrape`, and it is now out of credits until 22 November 06:40 UTC (01:40 ET).
- `WebFetch` failed on `roberttylman.github.io` and `www.dafx.de` (getaddrinfo ENOTFOUND). Those hosts "have to be allowed in the session's network settings". `WebSearch` works but returns summaries only (SNIPPET).

## 2. Where the documents can be read (the most valuable list)

Status key: OPENED = text loaded and read by me; SNIPPET = only a search summary.

### 2.1 TB-303

| Document | URL | Status | What it holds |
|---|---|---|---|
| TB-303 Service Notes, "Feb.19, 1982", First Edition, 8 text pages | `http://bee.mif.pg.gda.pl/ciasteczkowypotwor/%23pro_audio/Roland/Roland%20TB-303%20Bass%20Line%20Service%20Manual.pdf` | OPENED (READ) | Spec page; IC data pages (MC14001B, BA662, MC14174B, MC14556B, MC14066B, uPD650C-085 port table); block diagram; switch-board and main-board drawings (drawings not legible to me; text layer has notes); adjustment; "preliminary diagnosis"; the "VCF envelope modulation" explanation; parts list with Roland part numbers |
| TB-303 Service Notes, "Nov. 1984 E-2", "3rd Printing Sep.1986" (a later printing, 3 text pages) | `https://experimentalistsanonymous.com/diy/Schematics/Full%20Synths%20Drum%20Synths%20and%20Misc%20Synth/Roland%20TB-303.pdf` | OPENED (READ) | Main-board drawing annotations such as "TUNE : 110 Hz (SET TUNING CV OUT: 2.75 V (A KEY))", "R74-R90 200K MATCHED PAIR 1% SELECTED", "POSISTOR: R100", "DECAY VR MAX T=2.5 sec. MIN T=200ms", "5.333V connects to pin 7 of IC16", "IC16 AN6562"; spec page |
| Same notes (another scan, 535 KB) | `https://synthfool.com/docs/Roland/TB303/` | SNIPPET only (host refuses curl) | Also "See-Through 303" JPG and "TB-303 Main Board" JPG listed |
| Same notes | `https://www.autodafe.net/synth-manuals/123-roland-tb-303-schematics.html`; `http://www.dinsync.info/2010/02/roland-tb-303-service-manual.html`; `https://www.manualslib.com/manual/3378574/Roland-Tb-303.html` (403 per P1) | SNIPPET | Alternative copies |
| TB-303 Owner's Manual ("'81 DEC.") | `http://cdn.roland.com/assets/media/pdf/TB-303_OM.pdf` | SNIPPET (text of table pages shown) | User-level behaviour; useful for the accent and slide rules |
| Schematic image folder | `http://machines.hyperreal.org/manufacturers/Roland/TB-303/schematics/` | SNIPPET (title only; P1 got 000) | Hyperreal archive |

Read the **bee.mif.pg.gda.pl copy first**: its text layer carries the IC data pages and the VCF envelope description. It is the only 303 document in this list that I read to the end.

### 2.2 TR-808 (the owner already supplied these; listed so the crew can cross-check)

| Document | URL | Status |
|---|---|---|
| TR-808 Service Notes "JUN. 15, 1981" | `https://manuals.fdiskc.com/flat/Roland%20TR-808%20Service%20Manual.pdf`; `https://www.florian-anwander.de/roland_tr808/roland_TR-808_service-manual.pdf`; `https://archive.org/details/synthmanual-roland-tr-808-service-notes` | SNIPPET (parts list and uPD650C-085 port table shown in the summary) |
| TR-808 Operation (owner's) Manual | `http://cdn.roland.com/assets/media/pdf/TR-808_OM.pdf` | SNIPPET (text shown: three trigger outputs +15 V 20 ms pulses for CB, CP, AC; six-oscillator cymbal) |

### 2.3 TR-909

| Document | URL | Status |
|---|---|---|
| TR-909 Service Notes "JUN. 15, 1984", First Edition, 16 pages | `https://www.polynominal.com/site/studio/gear/drum/roland-tr909/roland-tr909-service-manual.pdf` | OPENED (READ), full text. Parts list, block diagram, circuit descriptions (digital and analog voice generators), change information, fault guide, MIDI |
| Same notes | `https://schematicsforfree.com/files/_Errata%2C%20Corrections%2C%20Notes%2C%20Updates%2C%20etc/Roland%20TR-909%20Rhythm%20Composer%20Service%20Notes.pdf`; `http://www.dinsync.info/2010/02/roland-tr-909-service-manual.html` | SNIPPET |
| Per-voice 909 schematics (kick) | `https://www.scribd.com/document/396979075/Roland-TR909-Schematics` | SNIPPET |
| Owner's manual | `http://cdn.roland.com/assets/media/pdf/TR-909_OM.pdf` | SNIPPET |
| Colin Fraser's 808/909 clone pages (cymbal ROM details, schematic links) | `http://www.colinfraser.com/tr909/my909.htm`, `http://www.colinfraser.com/tr909/909cyms.htm` | OPENED (READ) |
| network-909.de/circuit.htm (circuit analysis, per B3) | not reachable (B3) | not read |

### 2.4 Juno-106 and Juno-60 (never read on this project before)

| Document | URL | Status | Notes |
|---|---|---|---|
| **JUNO-106 Service Notes, JUL. 31, 1984, First Edition, 13 pages** | `http://www.analoguerenaissance.com/D80017A/juno-serv.pdf` | **OPENED (READ), full text** | Specifications, block diagram (page marker 5), slave CPU port table, "OSC, DCO", D/A section, IC data (MC5534 wave generator), sub oscillator, sawtooth and PWM description, VCF/VCA one-liner, board layouts (page markers 11, 13, 15), 13-step adjustment procedure. Has no chorus circuit text beyond IC names in the layout and block diagram. The drawings themselves are not legible to me |
| Same, another copy | `https://www.vintagesynthparts.com/wp-content/uploads/2017/03/JUNO-106_SERVICE_NOTES.pdf` | SNIPPET | Snippet shows text on master CPU data routing, switch reading |
| Juno-106 service manual (2.6 MB, with schematics per thea.codes) | `https://storage.googleapis.com/files.thea.codes/juno-106-service-manual.pdf` (linked by the blog I read) | not opened | Blog author says it includes the schematics |
| Juno-106 / 106S / HS-60 service notes | `https://seriescircuits.com/wp-content/uploads/2024/07/Roland-Juno-106S-HS-60-Service-Manual.pdf` | SNIPPET | |
| Synthfool Juno series index (106 Owner's, 106 Service Notes 1.3 MB, 106 Service Manual 2.6 MB, memory battery bulletin) | `https://synthfool.com/docs/Roland/Juno_Series/` | SNIPPET (host refuses curl) | |
| **Juno-60 Service Notes, HI-RES** | `https://manuals.fdiskc.com/flat/Roland%20Juno-60%20Service%20Notes%20(%20HI-RES%20).pdf` | **OPENED (READ)**, 90 KB of text | Circuit description of the sound source (master oscillator, 8253 counters, sawtooth generator, variable pulse width, sub oscillator), parts list with Roland part numbers, adjustment, test mode |
| Juno-6 Service Manual | `https://electricdruid.net/wp-content/uploads/2025/05/Juno-6-Service-Manual.pdf` | SNIPPET (summary shows "1.902 MHz clock") | Same voice as the 60 |
| 80017A teardown with photographs and the 106 and 60 filter/VCA drawings | `https://obsoletetechnology.wordpress.com/projects/80017a-vcfvca-teardown/` | OPENED (READ) text; images not seen | States the 60 uses exactly the same parts as the 106 for filter and VCA except the hybrid packaging, so 60 values apply |

### 2.5 Minimoog Model D

| Document | URL | Status | Notes |
|---|---|---|---|
| **Mini-Moog Field Service Manual, R. J. Folkman, 7/73 RJF, 24 pages** | `https://www.synfo.nl/servicemanuals/Moog/MINIMOOG-D_SERVICE_MANUAL.pdf` | **OPENED (READ), full text** | Section II sub-assembly descriptions, block diagram, trouble guide, adjustment procedures, parts, modifications. **Section IX says "(The circuit schematics are not available at this time.)"** and Section X likewise. So this copy has no schematics |
| Minimoog Service Manual "new and old" with schematics (Figures 9-3, 9-7, 9-8, 9-11 and tables) | `https://synthfool.com/docs/Moog/minimoog/Minimoog_Service_Manual.pdf` | SNIPPET only (snippet shows "SCHEMATIC DIAGRAM (SERIAL NUMBERS BELOW 10175) NPN TRANSISTORS 2N3904, 2N3392 (ETC.)") | The CA-72 sources list (section 9.1) says "Table 7-5 ... synthfool PDF pp. 24-26" and "Figure 9-3 ... synthfool PDF p. 5" |
| Minimoog Service Manual, 82 pages | `https://manuals.fdiskc.com/tree/Moog/Moog%20Minimoog%20Service%20Manual.pdf` | SNIPPET | CA-72 says this is the complete Norlin manual, sections 1-9 |
| Scribd copy | `https://www.scribd.com/document/471763987/Moog-Minimoog-Service-Manual-pdf` | SNIPPET | |
| Moog-branded schematic PDF (Model D) | `https://experimentalistsanonymous.com/diy/Schematics/Full%20Synths%20Drum%20Synths%20and%20Misc%20Synth/Moog%20Minimoog.pdf` | SNIPPET ("ALL TRANSISTORS ARE 2N3392 (9901 IS SELECTED)") | |
| Model D reissue manual | `https://cdn.inmusicbrands.com/Moog/Model%20D/Minimoog_Model_D_Manual.pdf` | SNIPPET (2026 reissue user manual, not a service manual) | |

## 3. TB-303

### 3.1 Signal path, block by block

Block diagram as read from the service notes (READ, bee.mif.pg.gda.pl): tempo oscillator and divider (IC1, IC6) into a **uPD650C-133** CPU "MICRO PROCESSOR IC 8" with CMOS memory IC3, IC4, IC5 and a latch IC9. The CPU drives a **D/A converter built from resistors R74-R90** (annotation on the later printing: "R74-R90 200K MATCHED PAIR 1% SELECTED", READ experimentalistsanonymous). The D/A output is the pitch CV. Then VCO (Q24, Q25, Q27, waveform select S1, Q28), anti-log converter (Q26, Q8), VCF ("TR. C LADDER AMP", anti-log Q10, Q11), envelope generator (Q31, Q32), a "mono multi" envelope generator (Q40, Q41) with DECAY VR 6 and accent on/off, VCA, mixer (Q33, Q34), headphone amp IC14.

Parts, all READ unless marked:

| Block | Parts | Source |
|---|---|---|
| Transistor families | "ALL NPN TRANSISTORS ON THE MAIN BOARD ARE 2SC945(P); ALL PNP ... 2SA733(P)"; switch board NPN 2SC2021(R), PNP 2SA937(Q); adjustment checklist also lists 2SC536F | bee.mif.pg.gda.pl notes |
| CPU | uPD650C-133 (parts list: "15179126 uPCD650C-133 CMOS CPU"), 4-bit; clock from a coil, "12449217 IFT coil S74230 (yellow) CPU clock" | parts list, READ. MAME: clock 454545 Hz, 2.2 us, "LC circuit (TI S74230)" (READ, `roland_tb303.cpp`) |
| RAM | uPD444C CMOS RAM x3, battery backed (1.5 V x 4 = "CMOS MEMORY BACK UP" in block diagram) | READ |
| Logic | HD14001BP, HD14013BP or MN4013B, HD14050BP, MC14174B, MC14556B (decoder, selects RAM chip), MC14066B (analog switch), MC14001B | READ |
| Power | IC16 AN6562 (annotation on both notes), 5.333 V rail, MC102C DC-DC converter (parts list), 12 V gate-out | READ |
| VCO | "VCO / POSISTOR: R100 / MFR"; sawtooth then "WAVE FORM" switch S1; tune adjustments: TM4 for 110 Hz on the A key, TM5 "WIDTH" for a 2:1 octave ratio at Q28 source / S1 terminal; "Confirm 4:1 +-0.5%" | READ. The posistor (positive-temperature-coefficient thermistor) is the exponential converter's temperature compensation |
| VCF | "ladder" of transistor-connected diodes, driven by anti-log pair Q10/Q11; Q9 biases Q10/Q11 so the envelope modulation is centred (see 3.2) | READ (explanation text) |
| VCA | BA662 ("Vari-conductance amp." is how the 808 and 909 parts lists name BA662A); the 303 block diagram shows a VCA block and the IC data page lists "BA662" | READ (presence); BA662's role as the 303 VCA is the obsoletetechnology page's statement "pinout in the TB303 service manual" (READ) |
| Envelope generators | Q31/Q32 (VCF), Q40/Q41 "mono multi" (accent/decay); DECAY VR "MAX T=2.5 sec. MIN T=200 ms" ; "15 ms KEY C: see ADJ. VCF" note beside the envelope part | READ |
| Mixer and output | Q33, Q34 mixer, IC14 head-phone amp, output impedance 10 kOhm, headphone 8-30 Ohm, "MIX IN gain unity" | READ |
| CV/gate out | CV +1 to +5 V at 1 V per octave, gate 0 V off, +12 V on; tuning control about +-700 cents | READ spec page |

Trimmers (READ): TM1 tempo, TM2 internal clock, TM3 VCF, TM4 110 Hz, TM5 width, TM6 CV (CVL+1.000 V +-3 mV between low C and high C).

### 3.2 Special parts: role, datasheet location, behaviours an emulation must capture

- **uPD650C-133 (CPU, mask ROM 2 KB, 4-bit).** Role: sequencer, writes pitch to the D/A, gate, slide and accent flags. Datasheet: not found. Facts: "4-bit microcontroller by NEC, 96 nibbles of RAM, 2000 bytes of ROM" (SNIPPET `https://notebook.zoeblade.com/uPD650.html`). MAME: ROM `d650c-133.ic8` 0x800 bytes, CRC 268a8d8b, SHA1 7a4236b2bc9a5cd4c80c63ca1a193e03becfcb4c (READ `roland_tb303.cpp`). The CPU's step timing (interrupt clock 1.8 ms, 10 percent duty, per MAME) and gate timing fix when the gate drops before the next step; P1 already used Whittle's timing figures.
- **Pitch D/A (R74-R90, 200 kOhm, "matched pair 1% selected").** Roland selected resistors to 1 percent; the pitch CV scale is a resistor ladder, so a real unit's note-to-note tuning error is a few cents set by the trimmers TM4, TM5 and TM6. Emulation: optional fixed per-note detune table; the 2:1 and 4:1 trim notes show Roland expected the octave span to be adjusted.
- **VCO with posistor R100 and exponential converter Q26/Q8.** Role: sawtooth from a discharge-capacitor core, square derived from the saw by a transistor stage ("WAVEFORM" via S1 and Q28). Behaviours: saw and square amplitude vary with pitch (P1 found nothing in the pages it read on the square's shape or duty). I could not read the drawing values. Not captured by any open emulation I know of (MEMORY).
- **Diode ladder filter, Q10/Q11 anti-log pair, Q9 bias.** READ text: "In the conventional VCF configuration, envelope modulation voltages ... rise from a fixed potential ... Q9 has a key role in this arrangement. It develops bias for Q10 and Q11 to set initial cutoff point at the center of frequency range ... Rotating wiper 2 of VR5 closer to terminal 3 increases ENV MOD voltage being fed to base of Q10 while changing the bias which in turn lowers VCF cutoff frequency. This is equal to turning CUTOFF knob counterclockwise". Meaning for the model: raising ENV MOD also lowers the base cutoff, and the anti-log pair converts voltage to current exponentially, so the envelope sweep stays in the useful range. This is the "ENV MOD moves the resting cutoff" behaviour; whether Open303 captures it is C2's question.
  Behaviour list from Stinchcombe (PRIOR P1): 4-pole with transfer function `-1/(s^4 + 6.727 s^3 + 14.142 s^2 + 9.514 s + 1)` for the core; coupling-capacitor highpasses in the feedback loop make a nine to ten pole response with an extra low resonance near 8 Hz on a loaded clone; a1k0n measured the feedback highpass near 100 Hz.
- **BA662 (VCA) datasheet.** Not found. SNIPPET: Rohm datasheets for related parts (BA6110FS `https://manualmachine.com/rohm/ba6110fs/3963525-datasheet`, BA7655A) and Behringer's clone "CAV662A" (`https://cdn.mediavalet.com/aunsw/musictribe/MG0zPwOCgECHib5rnTL-rA/LXFVv3YzekKv8pRtNdQIzg/Original/Datasheet_CA_V662A_2020-10-12_Rev.0_Signed.pdf`, "dual low-noise, low-offset programmable operational amplifier ... control the forward propagation conductance (gm) using the control current"). The obsoletetechnology teardown says "BA662 ... I did not find too much information about it except a pinout in the TB303 service manual and a reference to the newer BA6110" (READ). Behaviour an emulation must capture (MEMORY): OTA-style gm set by control current, soft saturation of the input pair, and a control-current feedthrough thump (the TB-303's accent click). Treat as unverified.
- **Posistor R100 and matched pairs.** Parts Roland selected: "2SC945 selected" is not stated for the 303; the 808 list has "2SC828 (R) selected noise" (SNIPPET). For the 303 I read only the resistor selection note.
- **Coupling capacitors.** READ in P1 (Stinchcombe). I did not read capacitor values; none are in the text layers.

### 3.3 Firmware / ROM

- MAME `src/mame/roland/roland_tb303.cpp` (source licence header "BSD-3-Clause", copyright-holders hap), READ at `https://raw.githubusercontent.com/mamedev/mame/master/src/mame/roland/roland_tb303.cpp`: the ROM `d650c-133.ic8` is listed with CRC and SHA1 above. Driver status: MACHINE_NOT_WORKING, MACHINE_NO_SOUND (it models the CPU, RAM and switch matrix only; "todo..", "discrete..." comments for sound).
- A sequencer replacement exists: `https://github.com/djphazer/OS-303` ("Open Source TB-303 CPU firmware", Teensy++ 2.0) (SNIPPET). Michigan Synth Works open codebase for TB-303, TR-606, TR-808 processors (SNIPPET `https://cdm.link/michigan-synth-works-has-an-open-source-303-processor-and-a-new-kit/`).
- `ro-mono-303` runs the original sequencer program on an emulated CPU "from the user's own ROM image (d650c-133.ic8 from MAME's tb303 set)" (SNIPPET gearspace thread `https://gearspace.com/threads/lemus-releases-ro-mono-303-a-free-open-source-emulation-of-the-roland-tb-303-bass-line-beta.1469866/`). That project ships no ROM, which is the model to follow.
- Reading a mask ROM microcontroller: EEVblog thread (SNIPPET `https://www.eevblog.com/forum/microcontrollers/reading-firmware-out-of-a-mask-rom-microcontroller/50/`).
- Legal status: the code in the ROM is Roland's copyright (MEMORY; no document I read says otherwise). MAME's licence covers the emulator source, not the ROM images; the MAME file carries only hashes. Do not ship the ROM. The sequencer is not needed for the sound path: this app has its own sequencer.

### 3.4 Existing circuit analyses (303)

| Analysis | URL | Status |
|---|---|---|
| Stinchcombe, diode ladder pages (transfer function, coupling-cap model, SPICE gradients) | `https://www.timstinchcombe.co.uk/index.php?pge=diode`, `?pge=diode2`, `?pge=synth` | PRIOR(P1) READ; host answers curl 200 today |
| Whittle, accent sweep and slide/gate timing | `https://www.firstpr.com.au/rwi/dfish/303-unique.html`, `.../303-slide.html`, Devil Fish manual | PRIOR(P1) READ |
| a1k0n x0xb0x-based measurements | `https://github.com/a1k0n/303` | SNIPPET today (appears in WebSearch); PRIOR(P1) |
| Spice Music: `Basic/tb303_vco_normalized.asc`, 4-pole ladder 1-voice example (LTspice, Public Domain per `LICENSE`, README "Freeware") | `https://github.com/bjostarmark/spice-music` ; raw `instructions.md` READ | OPENED (READ `instructions.md`, `LICENSE`, `README.md`). It is a VCO and a generic ladder, not the 303 VCF with accent; WebSearch summary says "the characteristic sounds cannot be reproduced currently" (SNIPPET) |
| x0xb0x (Ladyada), open hardware TB-303 clone: schematic, BOM, gerbers; "An original TB-303 was disassembled and reverse-engineered to verify the schematic" | `https://ladyada.net/make/x0xb0x`, OSHWA `https://certification.oshwa.org/us002547.html` | SNIPPET (host `ladyada.net` refused to P1) |
| Patreon "Patch Ideas I Learned While Studying the TB-303" | `https://www.patreon.com/posts/patch-ideas-i-tb-41917616` | SNIPPET, not useful here |
| A builder's note that their simulation had "a fairly decent filter simulation but a pretty crummy envelope simulation and no accent simulation at all" | KVR, `https://www.kvraudio.com/forum/viewtopic.php?p=4878962` | SNIPPET (host 403) |

I found no published LTspice schematic of the full TB-303 filter with accent (WebSearch summary, SNIPPET).

### 3.5 TB-303 table

| Block | Parts | Best source read | Confidence | SPICE-level reference simulation feasible? |
|---|---|---|---|---|
| Pitch D/A | R74-R90 200 kOhm 1 percent, latch IC9 | 1984 notes annotations (READ) | medium | Yes, trivial, but low value |
| VCO | Q24, Q25, Q27, Q28, Q26, Q8 (2SC945, 2SA733), posistor R100 | block diagram (READ); values not read | low for values | Partly: needs the drawing; `tb303_vco_normalized.asc` (Public Domain) is a start |
| VCF | transistor/diode ladder, Q9, Q10, Q11 | VCF text (READ), Stinchcombe (PRIOR) | medium | Yes for the core and coupling caps (P1 already did a SPICE-class analysis from Stinchcombe); full drawing values still unread |
| Envelope and accent | Q31, Q32, Q40, Q41, DECAY VR 200 ms to 2.5 s | decay range (READ); accent network from Whittle (PRIOR) | medium | Possible once the drawing is read |
| VCA | BA662 | pinout only | low | Only as an OTA behavioural model (datasheet missing) |
| CPU and RAM | uPD650C-133, uPD444C x3 | parts list, MAME | high (identity) | Not needed |

## 4. TR-808

I did not read the 808 service notes myself this session (I have snippets only; the owner supplied them). Prior transcripts B2 (PRIOR) read the service manual tables and Werner's papers. This section lists what is certain from my sources and points to B2 for the rest.

### 4.1 Parts (SNIPPET from the service-notes parts list in a search result, `https://manuals.fdiskc.com/flat/Roland%20TR-808%20Service%20Manual.pdf`)

BA662A "Vari-conductance amp."; MC14001BCP quad NOR; TC4011BP quad NAND; TC4013BP dual D flip-flop; MC14051BCP analog multiplexer; HD14584B hex Schmitt trigger; AN6912 quad comparator; uA7805UC +5 V regulator; uPC4558C dual op amp; transistors 2SA733 (P) or (Q), 2SB596 (O), **2SC828 (R) "selected noise"**, 2SD880 (O); diodes 1S2473 (note "ALL DIODES ARE 1S2473" and "UNLESS OTHERWISE SPECIFIED ALL NPN TRANSISTORS ARE 2SC945(P)" in the switch/trigger board text); one resistor line "ERSC33G561 560 Ohm" (likely a temperature-coefficient part, MEMORY: Electric Druid's comments say the Jupiter-8's ERSB33G561 is "a 560 Ohm 3300ppm tempco", READ). Also note "C58 .027 to .056 C61 .0068 to .015" on the snare resonator (values vary by unit; READ in the snippet).

### 4.2 CPU

uPD650C-085 (IC4). MAME `roland_tr808.cpp` (READ): ROM `d650c-085.ic4` 0x800 bytes, CRC 06f0c405, SHA1 eddac7af6396c3f220914d9cad2c9e398872b034; clock 500000 Hz "2us according to schematics"; interrupt 1.9 ms, MACHINE_NO_SOUND, NOT_WORKING. The CPU runs the clock, step LEDs, scanning, RAM (trigger pulse output on port I2, "Trigger Pulse (INSTRUMENT) output") and stores instrument data in RAM (SNIPPET of the circuit description table).

### 4.3 Sound path (summary of B2, PRIOR)

- Kick and tom/conga: bridged-T resonators excited by a trigger pulse, pitch-bend envelope, output stage (the "swing-type VCA" in Roland's own words is MEMORY for me; B2 and Werner (PRIOR) describe an output VCA whose gain depends on the envelope; I did not verify the name). Werner, DAFx-14 `https://dafx14.fau.de/papers/dafx14_kurt_james_werner_a_physically_informed,_ci.pdf` (SNIPPET today; PRIOR(B2) READ via pdftotext).
- Snare: two bridged-T resonators 249.6 Hz and 499.0 Hz plus noise (B2 computed from R196 680, R197 820k, C58=C59=0.027u; R195 2.2k, R198 1M, C60=C61=0.0068u, PRIOR). Rim shot 452.5 Hz and claves 2526 Hz (PRIOR(B2)).
- Hats, cymbal and cowbell: six Schmitt-trigger square oscillators (HD14584B) mixed, band-passed and enveloped; Werner, Abel, Smith ICMC/SMC 2014 `https://speech.di.uoa.gr/ICMC-SMC-2014/images/VOL_2/1453.pdf` (SNIPPET today; PRIOR(B2)). Cowbell paper: AES `https://www.aes.org/e-lib/browse.cfm?elib=17530` (SNIPPET).
- Hand clap: noise through the band-pass IC21, parallel VCAs Q70, and IC22/Q71/Q72 with sawtooth envelope (PRIOR(B2)).
- Noise: **2SC828 selected for noise** (SNIPPET): a transistor junction avalanche noise source, selected by Roland, so its spectrum varies from unit to unit (MEMORY for the avalanche mechanism).
- Accent: Werner says the CPU combines timing and accent into one trigger whose ON voltage is the global accent level (PRIOR(B2)); the 808 has no per-voice accent D/A, unlike the 909 (section 5).

### 4.4 Behaviours an 808 emulation must capture

- Trigger pulse amplitude sets accent and drives the resonator hard; the kick's tail decays by the bridged-T's Q; tone filter after the resonator (PRIOR(B2)).
- Tuning drifts slightly with Decay and Tone knobs (SNIPPET quoted in B2).
- Component tolerances: C58 and C61 value ranges shown in the manual make unit-to-unit tuning differ (READ above).
- The output sums through level pots and a multi-out jack that removes the voice from the mix (owner's manual SNIPPET).

### 4.5 Analyses and SPICE

| Item | URL | Status |
|---|---|---|
| Werner et al. DAFx-14, bass drum | `https://dafx14.fau.de/papers/dafx14_kurt_james_werner_a_physically_informed,_ci.pdf`; also `https://ccrma.stanford.edu/papers/physically-informed-circuit-bendable-digital-model-of-roland-tr-808-bass-drum-circuit` | SNIPPET today; PRIOR(B2) read in full |
| Werner et al. cymbal | `https://speech.di.uoa.gr/ICMC-SMC-2014/images/VOL_2/1453.pdf` | as above |
| PoliKick: LTspice simulation of an Erica Synths kick drum "based on the 808" | `https://gh.r-mj.com/PoliTeK/PoliKick` (mirror of a GitHub project) | SNIPPET; licence unknown |
| TS-808 plugin page: author says he "used the TR-808 service-manual schematics to make SPICE simulations" | `https://filebay.altervista.org/ts-808/` | SNIPPET |
| Wolfram blog, drum modelling with System Modeler | `https://blog.wolfram.com/2021/12/29/digital-vintage-sound-modeling-analog-drums-with-the-wolfram-language-and-system-modeler/` | SNIPPET |
| Open firmware SuperOS-808 / Michigan Synth Works | `https://synthanatomy.com/2026/08/superos-808-open-source-firmware-for-the-roland-tr-808.html` (B2) | PRIOR |

### 4.6 TR-808 table

| Block | Parts | Best source read | Confidence | SPICE-level reference feasible? |
|---|---|---|---|---|
| Kick, toms, congas | bridged-T, 2SC945/2SA733 stages, BA662A swing VCA?, op amps uPC4558C | Werner DAFx-14 (PRIOR), service notes (owner) | high for the kick (paper + schematic) | Yes: Werner gives a block model; netlist from the drawing |
| Snare | two bridged-T, 2SC828 noise | B2 values (PRIOR) | medium | Yes |
| Hats, cymbal, cowbell | HD14584B Schmitt oscillators, band-pass, VCA | Werner ICMC 2014 (PRIOR) | high for oscillator frequencies | Yes, mostly digital-ish |
| Clap, rim, claves | band-pass, Q70, IC21 | B2 (PRIOR) | medium | Yes |
| CPU | uPD650C-085 | MAME driver (READ) | high (identity) | Not needed |

## 5. TR-909

I read the full service notes (`polynominal.com`, READ). Everything below is from that unless marked.

### 5.1 Parts list (READ, "IC", "TRANSISTOR", "DIODE" sections)

- **CPU**: "15179149 uPD7811G-033-036 NMOS CPU" (switch board IC604; port assignment table), 12.00 MHz crystal (parts list "CRYSTAL 12389717 12.00MHz"). MAME comments (READ, `roland_tr909.cpp`): "cpu is a D7811G 037 with 4096w of ROM, mode pins are both pulled to 5v", so MAME treats the CPU's internal ROM as unused and runs the external ROM.
- **Program ROM**: "15179645 M5M2764P-250NS-645 P-ROM" or "15179646 M5M2364P-250NS-646 MASK ROM" (IC609). Versions: Revision 0 for serials 360100 to 393899; Revision 1 and later; "Software revision 2 cures [MIDI glitches]" and the check "turn the power ON while holding down TRACK 1 key, and MAIN key 2 (BASS DRUM) will blink, if version 2" (READ).
- **Sample ROMs**: "15179633 HN61256P-PC42 CMOS MASK ROM Crash", "15179634 HN61256P-PC43 ... Hi-hat", "15179635 HN61256P-PC44 ... Ride" (READ). Each 32 KB (Fraser READ). Not a 27256 pinout (Fraser READ: chip enable pin 22 inverted on the hat ROM, pins 20 and 26 swapped, data and address lines "jumbled").
- **RAM**: TC5565PL-15 CMOS S-RAM battery backed (IC608). **Op amps**: M5218L (dual), AN6912 quad comparator, **BA662A "Vari-conductance Amp"**, PC-900 photo coupler, regulators UA7805, UA7815, UA7915, transistor arrays M54562 and M54516, logic HD14511BP, HD14006BP, TC4011UBP, TC4013BP, HD14040BP, TC4520BP, TC4069UBP, HD14070BP, HD14174BP, HD74LS00P, HD74LS138P, SN74LS244N, HD74LS373, HD74LS367AP, SN74LS245N.
- **Transistors**: 2SA798-G (PNP), 2SA1115-28-F, 2SC2603-28-F, 2SC2878-A or B, 2SD1469-R. Resistor arrays "RGSD8x102-720 1K x 8" and "RM-0621" (RA9, RA11 etc.: the DAC ladders).

### 5.2 Digital voices (hi-hat, crash, ride): the sampled-voice scheme (READ)

- Samples are "sampled from an actual instrument, modified to be useful as data and stored into the ROM by way of PCM" (circuit description). Fraser (READ): "The samples have 6 bit resolution ... heavily compressed to make maximum use of the bits, and the original envelope is then restored by the vcas."
- **Hi-hat**: TRIG resets address counters IC70, IC71. "IC72 c and d" gates form an oscillator of "about 60kHz, which is divided by two and shaped up by IC73 flip-flop (TIMING GEN), clocking the address counters": so a sample clock of about 30 kHz for the hats (Fraser: "32kHz ... pretty close to the rate used for the hats"). ROM IC69 holds both hats; the address window is set by logic: stop at `110 0000 0000 0000` in OPEN mode, `010 0000 0000 0000` in CLOSED mode (table: OPEN from 000 0000 0000 0000; COMMON ADDRESS 110 0000 0000 0000; CLOSED to 111 1111 1111 1111; so the two hats share the tail). Data are latched (IC6B) and pass a resistor-array DAC (RA9). Hat envelope: the DECAY control (VR21 closed, VR23 open) sets a capacitor C135 charged through R451 + VR21 ("this charging path is 1/tenth the total resistance of R452 and VR23"), so a closed hat's decay is about ten times faster at equal knob positions. The sound at the DAC "has an envelope somewhat different from that of actual Hi-Hat sound" because the data were compressed before PCM: the analog envelope restores it.
- **Crash and ride**: "Restoration of the envelops are made by the use of ROM addresses as the envelop data": the same addresses go through RA11 (another DAC), then are "anti-log tapered by IC52b and Q70, and applied to the base of Q71 (VCA) which is configured as a voltage controlled potentiometer to give the incoming voltage the CRASH decay curve". Fraser: "extra DACs on the address lines ... converted to an exponential decay with the same length as the sample regardless of tune setting". The tune knob (crash and ride) changes the oscillator clock, so pitch and length change together (B3 PRIOR, "Tune changes both pitch and length"; hats have fixed R493 33K and C150 470P, no tune).
- Block diagram: Hi-hat: Memory IC69 -> latch/D-A -> VCA -> amp; Crash/ride: Memory IC69 (printed label; the parts list names the three ROMs separately), address counters IC61, IC58, IC55, timing IC60, IC54. Change info: 415300 and later: hi-hat C134 changed from 10 uF to 0.01 uF "for rolling off unnecessary lower frequencies" (READ), so early units have more low end in the hats.
- Low-pass filter after the DAC removes the sample frequency (Fraser: "then a low pass filter to remove the sample frequency", READ).
- Dumps: Fraser read the three ROMs through wires soldered to a real 909 and published three WAVs (`http://www.colinfraser.com/tr909/r909hh.wav`, `r909cr.wav`, `r909rd.wav`): "Each sample is shifted by two bits to occupy eight bits (unsigned) ... arbitrary sample rate of 32kHz" (READ). The bytes have the data lines scrambled (READ).

### 5.3 Analog voices (READ)

- **Noise generator** (shared by snare, kick, toms): "quasi-random ... two shift registers (IC32, IC33) connected in cascade making up 32 stages ... Two Ex-OR gates of IC31 clock the shift registers at a higher frequency". It is a digital LFSR through filters: the noise is deterministic and periodic, not a transistor junction (unlike the 808).
- **Snare**: VCO-1 and VCO-2, each "hysteresis comparator IC37a, inverting buffers configured as voltage-dependent resistor (in IC36) and an integrator consisting of IC37b and C69 with Q44 switcher" generating a triangle; VCO-1 runs lower than VCO-2 (different C69 and C71). A trigger resets VCO-1 (via D62 and Q44) and starts VCO-2 so the two start in phase. Pitch bend: IC36's supply is 5 V / -5 V at 0 and 2 ms, 2 V / -2 V at 20 ms (table), so the charging rate changes for about 20 ms. VCA Q50 follows ENV 3 (accent through Q4). Snappy: ENV 5 on VCA Q47; "noises passing through a high pass filter (IC39a) are combined with noises from the low pass filter at IC39b".
- **Bass drum**: CV generator IC12, VCO IC13, VCA Q12, ENV3, pulse generator, noise gen IC31-33, ENV1 attack level, VCA Q6, low-pass and high-pass filters, VCA Q47/Q48, amp IC39b (block diagram). Change 381500: capacitor C9 from 0.22 uF to 0.33 uF "for expanding the TUNE range" (READ). Fraser: kick VCO is a multi-op-amp loop IC12/IC13 with R26 330K, R27 1.5M, C14 0.033u (PRIOR(B3)).
- **Toms**: CV generators IC41-43 with SYNC, ENV1/ENV2/ENV4, amp, VCA Q33, tom accent level; change 426700: C54 0.0022 to 0.0047 uF and R194 47k to 100k "will emphasize attack of TOM TOMs" (READ).
- **Hand clap**: band-pass filter, IC30 VCA, envelope generator IC29 with Q40, Q38, trig IC26 Q35, Q36 (block diagram text); B3 read C42=C43 0.0047u, R207 150K, C56 0.022u, R202 39K, corner 185 Hz (PRIOR).
- **Rim shot**: three band-pass filters IC48a (F1), IC49a (F2), IC49b (F3), a clipper, a VCA and a high-pass IC50b. Change 415300: R417 from 12k to 3.3k "for giving the voice more realistic sound" (READ). Trigger out is the rim shot output, +14 V 20 ms (spec page).
- **Accent**: "Accent data on the CPU bus is latched into one of ACCENT latches (IC2-IC9) ... converted to analog equivalent at the output of associated resistor array RM0621. The voltage is clamped to the level until it is replaced". TRIG: "5V positive going pulse ... for 2ms". So the 909 has a separate accent D/A per voice group, unlike the 808.
- **Tempo/tape/sync**: 1200/2400 Hz FSK, not sound-relevant.

### 5.4 Special parts: role, datasheet, behaviours to capture

- **HN61256P (Hitachi 32 KB x 8 mask ROM)**: role, sample store. Datasheet not found; "The 61256s are mask programmed ROMs" (Fraser, READ). Capture: 6-bit samples (4 steps shifted by 2 bits), companded data, DAC resistor-array mismatch (RA9, RA11), clock-rate hat and tunable crash/ride, aliasing (the filter after the DAC is the only anti-image protection), sample-and-hold stair-steps at about 30 kHz for hats.
- **RM-0621 / RGSD8x102-720 resistor arrays**: DAC and accent ladders (READ names; their tolerance is not in the notes).
- **BA662A**: VCA in the voices (listed; the circuit descriptions name VCAs by transistor: Q71 is a "voltage controlled potentiometer" made of discretes, so the BA662A appears on other voices; I did not map which).
- **uPD7811G-033-036**: sequencer CPU; MAME dumps the firmware only.
- **M54562 / M54516**: transistor arrays for LED and trigger drive (MEMORY).
- **PC-900 photo coupler**: MIDI input isolation (MEMORY).

### 5.5 ROMs and firmware dumped (READ, MAME `roland_tr909.cpp`, source licence BSD-3-Clause)

- Firmware: `tr909_v4.ic609` CRC a9b45f30 SHA1 b94374e2cd6b5a6c405da4fa7793c98c0a6015c4, `tr909_v1.ic609` CRC bfb9682b, 0x2000 bytes each ("version 0 and 1 firmware also exist").
- Samples: `hn61256p__c43.ic69` (hi-hat) 0x8000 CRC 2aaae11b SHA1 22a34d603e78673bb096f5e56a8971afe14d8fee; `hn61256p__c42.ic62` (crash) CRC dc61cf1a SHA1 bc730107b0c391f4879c9777a3e85f3e57f3aad6; `hn61256p__c44.ic54` (ride) CRC 01a9b435 SHA1 daa54c58c7e3ae3398f125568537ec82d5bd1dfd. The IC positions match the service notes' block diagram (IC69 memory).
- The MKS-7 driver in `juno106.cpp` has the same HN61256P parts (c42, c44, c71, c72) marked `NO_DUMP` (READ), so some Roland sample ROMs of the same family are not dumped.
- Status: MACHINE_NOT_WORKING, NO_SOUND (CPU and RAM only). Legal: copyrighted Roland data; MAME distributes source with hashes. A listing of eBay "Roland TR-909 sound eproms bundle for Oberheim DX" (SNIPPET `https://www.ebay.com/itm/274309736495`) shows replacement EPROMs are sold. Gearspace "Drum Machine ROM Sample" thread (SNIPPET `https://gearspace.com/threads/drum-machine-rom-sample.551087/`). Do not ship the sample data; the owner's own recordings or procedurally generated approximations are the safe route (B3 already reached this).

### 5.6 TR-909 table

| Block | Parts | Best source read | Confidence | SPICE-level reference feasible? |
|---|---|---|---|---|
| Hat/crash/ride sample path | HN61256P x3, TC4520BP counters, RA9/RA11 DACs, Q70/Q71 VCA, IC52b | Service notes text (READ) + Fraser (READ) | high for architecture and addressing; medium for values (drawing not read) | Digital part trivially; the DAC + VCA + low-pass chain: yes; samples must come from the owner |
| Snare VCOs | IC36, IC37, C69, C71, Q44, Q50 | READ description | medium-high | Yes (comparator + integrator) |
| Noise | IC31 EXOR, IC32 and IC33 shift registers | READ | high | Yes, bit-exact LFSR possible; tap positions need the drawing |
| Kick | IC12, IC13, Q12, Q6, C9 | block diagram (READ), B3 values | medium | Yes |
| Toms | IC41-43, Q33 | READ | medium | Yes |
| Clap, rim | IC26-30, IC48-50 | READ + B3 | medium | Yes |
| Accent | latches IC2-IC9 + RM-0621 | READ | high | Trivial |
| CPU | uPD7811G-033-036, M5M2764 | READ + MAME | high | Not needed |

## 6. Juno-106 (and Juno-60 where different)

### 6.1 Architecture (READ, Juno-106 Service Notes JUL. 31, 1984)

Six voice modules on one module board (the notes call them CH1 to CH6; adjustment tables run CH1 to CH6). Boards: CPU board (master), module board, panel board, jack board, MIDI board, bender board, power board, fuse board. Part numbers 76139140 (CPU), 76139170 (module), 76139320 (panel), 76139350 (jack), 76139380 (MIDI), 76139410 (bender), 76139121 / 76139124 (power).

- **Master CPU IC1** (CPU board) with ROM IC2, RAM IC3, address latch IC6, latch and decode IC7-9. The layout text: "MODE 0; GROUNDED MODE 1: PULLED UP when IC1 is HPD78116-101 and IC2 is absent" (a variant with an internal-ROM CPU). MAME `juno106.cpp` (READ) says "uPD7810G or uPD7811G-101-36" for the main CPU, "uPD7810G or uPD7811G-102-36" for the slave, 12 MHz crystal, "TC5517APL or MB8416-20L + battery" for RAM, two "M82C53" interval timers.
- **Slave CPU IC29** (module board), "Slave CPU uPD7810/7811", ROM IC37, address latch IC39, latch IC40; the notes: "12MHz CLOCK INPUT" on XTAL pin; "8253 LATCH WRITE TIMING PULSE" and "ROM READ TIMING PULSE" pins; Port F pins 6, 7 "RANGE SELECT". Serial data comes from the master CPU.
- **Master oscillator and DCOs**: "The oscillator consists of a master oscillator (8MHz) and a divider IC35. The IC35 divides 8MHz by two, four or eight according to a position of RANGE (4', 8', 16') on the panel and feeds it to DCOs IC33 and IC34 which are 16-bit Programmable Interval Timers" (READ). "Divide data is the sum of a key number and the outputs from LFO, Bender, Portamento and Tune for a particular note." Each 8253 holds three counters, so two 8253s give six voices. (IC38 is the second master-oscillator part named in the block diagram.) The counter output is a rectangle of audio frequency.
- **Waveform generator**: MC5534 (IC4, IC8, IC12, "three versions in MC5534 series; MC5534A is the latest containing two identical circuits"): "with a given rectangular at CLK IN, capable of generating three different waveforms; divided by two rectangular, sawtooth and variable-width rectangular". Each IC serves two voices, so three ICs for six.
- **Sawtooth**: "DCO CV is applied from the slave CPU in addition to DCO output. The DCO CV will keep the sawtooth and pulse amplitude nearly constant (approx. 12Vp-p) over the frequency range ... The DCO CV charges C54 through R85 (if 16') and discharges through transistor E on the positive going edges of DCO. If the RC time constant (C54 and R85, 86 or 87) remains unchanged, sawtooth amplitude becomes low at 4'. ... DCO CV is made to become higher in proportion to key number. RANGE data is seen at the output of 4052 (IC2, 6 or 10) which selects among R85, 86 and 87". So the amplitude compensation is an analog charge current set by a 12-bit D/A.
- **Pulse width**: "At IC8 input, sawtooth wave is compared with PWM CV that determines the pulse duration of IC8 output; duty ratio is 50% at +6V PWM CV and 95% at +0.6V. With PWM OFF, PWM CV is -0.8V" (the pulse is disabled when high).
- **Sub oscillator**: flip-flop divide-by-two, level set by collector supply (SUB LEVEL). **Noise**: generator IC14 (block diagram "NOISE GEN. IC14"); level adjusted for 4 Vp-p (adjustment 9).
- **D/A section**: "the slave CPU ... integrates some of parameters that are needed for a particular destination (DCO, VCF or VCA) and represents them as a 12-bit data (upper 6 bits at PB0-PB5 and lower 6 bits at PC2-PC7). The data is converted into an analog voltage ... routed to the destination module from the demultiplexer (IC23, 24 or 26)". D/A ICs IC28, 30, 31, 32; DMUX IC23, IC24, IC26 (the last runs from +-15 V, hence a level shifter IC25 type 7407); sample and hold ICs IC15-22 for DCO CV, VCF CV, VCA level, PWM CV, resonance CV, sub level.
- **VCF and VCA**: "A1QH80017A is a one-chip VCF and VCA. Both ... are individually controlled by the several parameters integrated into one voltage: VCF CV contains CUT OFF frequency, ENV, LFO, Key follow and Bender; VCA CV includes ENV and GATE." Block diagram: "VCF, VCA IC3,5,7,9,11,13" on the module board (one 80017A per voice), "SUM IC1".
- **HPF** IC3, IC4 and **VCA**/level IC5 (block diagram, jack board) and **chorus** "CHORUS IC8-11" with "LPO (CHORUS) IC1,2" (the chorus LFO, with M5218L op amps IC2 and IC7 visible in the layouts). The notes name no BBD part in the text I extracted; the 60 notes do (below).
- **Specifications** (READ): cutoff 5 Hz to 50 kHz; resonance 0 to self-oscillation; env mod +-14 octaves; LFO mod +-3.5 octaves; bender +-3.5 octaves; key follow +3/-2 octaves; envelope attack 1.5 ms to 3 s, decay 1.5 ms to 12 s, release 1.5 ms to 12 s; LFO rate 0.1 to 30 Hz, delay 0 to 3 s; DCO tune +-50 cents, LFO +-400 cents, bender +-1200 cents (the P3 argument 300 vs 400 cents is settled here: the notes say 400 for the LFO mod); outputs L -30 dBm, M -15 dBm, H 0 dBm.
- **Alignment targets** (READ, usable as validation data): VCA bias TP7 +0.25 to +0.27 V; resonance trimmers adjusted for a 4.8 Vp-p sine at C4 with the VCF self-oscillating; VCA gain 6 Vp-p; VCF frequency 248 Hz (B3) at C4 and 992 Hz (B5) at C6 ("procedures 7 and 8 interact ... within +-10 cents"); noise 4 Vp-p; PWM 50 percent (48-52), 95 percent (93-97); power rails -15 V, +5 V.

### 6.2 DCO circuit (thea.codes, READ; the author states which values are certain)

`https://blog.thea.codes/the-design-of-the-juno-dco/`: the Juno-106 ramp core is an op-amp integrator with a transistor discharge, reset by an RC-differentiated clock. Values for the 106: differentiator 10 kOhm x 270 pF (2.7 us), "5 Volts" clock, NPN switch on rising edge, discharge R 2.2 kOhm x 1 nF (2.2 us), integrator 200 kOhm x 1 nF (0.2 ms, "5 kHz" maximum frequency), the DAC output is inverted so the 106 ramps up; "the microcontroller can switch the integrator's resistor between 100 kOhm, 200 kOhm, and 399 kOhm" for more amplitude control at low pitches; clock from 8 MHz crystal through programmable timers. The author warns: "The component values chosen here are actually picked from the Juno-60's service manual with the exception of the integrator's resistor and capacitor. The Juno-106's oscillators are on separate voice card boards and the service manual doesn't list all of the values for the passives ... I'm fairly certain I'm at least very close." Treat the 106 passives as estimated, not read from a 106 drawing.

Juno-6 and 60 (READ same page and 60 notes): falling sawtooth 0 V to -12 V, PNP transistor (2SA1015), positive DAC voltage; master oscillator is an LC oscillator with a varactor (diode D18) "1MHz to 3.5MHz with the center frequency at approximately 1.9MHz ... +-1050 cents", output via TR63 to the 8253s IC54 and IC55; "Assume that the master oscillator runs at 1902810Hz and a divisor is 4305, the counter develops 442Hz rectangular signals". The 60 applies bend and LFO by modulating the master clock (so all voices move together, and the clock is not crystal-exact); the 106 computes it in the CPU (thea.codes, READ). Op amps TL08x (60 parts list: "uPC4082C or TL082CP"), noise transistor "2SC945 SELECTED FOR NOISE", wave transistors 2SA1015 (PNP), 2SC1815 (NPN).

### 6.3 Special parts and what they do to the sound

**IR3109 (Roland, in the 80017A module).** Role: filter core, a quad OTA with four high-impedance MOS buffers and an on-chip exponential CV converter (AMSynths, READ: "four variable transconductance amplifiers designed for VCF applications ... equipped with four high input impedance buffers, and anti-log circuitry (VIN to VOUT) which controls the conductance of four amps"; Roland's minimal datasheet in the Jupiter-4 service manual: "wide transconductance variable range (1 uU to 10 mU)", "low offset voltage (less than +-3 mV)", "high impedance MOS P channel buffer"). Datasheet location: the clone's datasheet `https://electricdruid.net/wp-content/uploads/2025/05/AS3109.pdf` (linked from the page I read; not opened); the original Roland datasheet is inside the Jupiter-4 service manual (AMSynths READ; manual not located). Behaviours to capture: (1) 4-pole, 24 dB/octave cascade of identical OTA-C integrators with buffers; (2) "CV can move the filter up or down over a fifteen octave range" (Electric Druid, READ), consistent with the notes' 5 Hz to 50 kHz; (3) no on-chip resonance: resonance is an external BA662 OTA feedback with two paths ("the signal from pin 15 goes to the OTA's inverting input" and the input to the non-inverting input = resonance compensation that raises input level as resonance rises); (4) OTA soft clipping limits the feedback: "This soft clipping acts to limit the amount of feedback that's possible and keeps the filter from driving the output hard to the rails when it starts to oscillate" (Electric Druid READ); (5) stage buffers differ: stages 1 and 3 supply up to 0.6 mA, stages 2 and 4 1 mA and 1.3 mA; (6) the exponential converter is tempco-compensated outside the chip in Roland's discrete designs (Jupiter-8 uses a 560 Ohm 3300 ppm part; the Juno hides it in the hybrid, MEMORY for the 106); (7) Juno-6 values: 68K resistors and 240 pF capacitors (Electric Druid READ for the Juno 6, and obsoletetechnology says the 60 and 106 use "exactly the same parts for filter and VCA", READ), so about 68K and 240 pF is the best-supported starting point for the 106 too; (8) ceramic-disc capacitors: "Roland only used [polystyrene] in the flagship SH-7 ... cheaper ceramic disc capacitors in nearly every IR3109 implementation. The Juno-106 uses SMD ceramic capacitors ... the Juno-60 which uses THD versions" (AMSynths READ): so stage-to-stage cutoff mismatch exists and differs between 60 and 106.

**BA662 / BA662A / BA662F.** Role in 80017A: one resonance VCA and one output VCA (obsoletetechnology READ: "One BA662 ... responsible for the resonance control of the filter, the other one is the VCA for amplitude control"). Datasheet: not found (section 3.2). Behaviours: nonlinear OTA; VCA gain follows an exponential-ish control law; the adjustment "VCA bias +0.25 to +0.27 V" and "VCA OFFSET adjusted for minimum thumps" (READ) show a control feedthrough that the trimmers null.

**D80017A module.** SMD IR3109 and two SMD BA662F on a ceramic carrier dipped in black resin with printed (not replaceable) resistors (AMSynths and obsoletetechnology, READ). The same schematic as the Juno 6 and 60 (24 dB low pass, Q compensation, self-oscillation). Because the resistors are printed and the capacitors SMD ceramic, 106 voices differ in cutoff (the VCF frequency and width trimmers VR4, 9, 14, 19, 24, 29 and VR3, 8, 13, 18, 23, 28 per voice, READ) and resonance (trimmers VR1, 6, 11, 16, 21, 26 per voice).

**MC5534 waveform IC.** Role: pulse, saw and sub generation from a clock; datasheet not found. Behaviour: 12 Vp-p saw amplitude is only approximately constant: one volt of variation across the range is acceptable (thea.codes READ).

**8253 / M82C53 (IC33, IC34 on the 106; IC54, IC55 on the 60).** Role: 16-bit divide-by-N counters, so pitch resolution is a quantisation error that grows with pitch (MEMORY: at 8 MHz divided by 2, a divisor near 4000 at C4 gives a fraction of a cent at low notes but several cents at the top: unverified, compute if needed). Datasheet: Intel 8253 (MEMORY; not located). MAME instantiates two PIT8253 for the 106 (READ).

**MN3009 (256-stage BBD) and MN3101 (clock driver).** Juno-60 parts list (READ): "15219213 MN3009" and "020-224 MN3101" (the MN3101 listed with its Roland code). Juno-60 chorus board: "CHORUS BOARD (pcb 052H412A)", block text "VCA CHORUS IC1-4", "CHORUS(OFF,1,1)" and the adjustment of "BIAS VR1 / VR2 ... so that top and bottom portions of waveform are not clipped" with a 6 Vp-p 1 kHz test signal (READ), i.e. two BBD lines each with a bias trimmer. Datasheet locations: MN3009 on RadioRadar `https://www.radioradar.net/en/datasheets_search/M/N/3/MN3009_Panasonic.pdf.html` (SNIPPET), MN3101 listed on `https://radiomuseum.org/tubes/tube_mn3101.html` ("Clock Generator-Driver CMOS LSI for BBD", Vdd -8 to -16 V, DIP-8, SNIPPET), Eventide: "MN3009 produces delays from 0.64 ms to 12.8 ms according to the datasheet" (SNIPPET). Behaviours an emulation must capture (MEMORY unless cited): delay = N stages / (2 x clock), so the 256-stage line gives 0.64 to 12.8 ms for clocks about 200 kHz down to 10 kHz; the delay's anti-aliasing and reconstruction lowpass filters sit on either side with corners tied to clock (P3 PRIOR: Junox 7237 Hz and 10644 Hz fixed, KR-106 bandwidth `256/(4 delay)`); BBD charge-transfer loss and noise grow at slow clocks; the companding is absent in the 60 and 106 chorus (the notes name no compander; MEMORY: no NE570 in the Juno chorus, so the hiss is audible and is part of the sound; P3 PRIOR notes the slowly swapping hiss); clock feedthrough or "clock noise" is filtered by the post-filter; two lines in antiphase from one triangle LFO; GroupDIY scope measurements of the 60 chorus LFO: modes I and II triangle cycle about 2.3 s and 1.4 s, I+II "a sine at a little over 8 Hz" (SNIPPET `https://groupdiy.com/threads/juno-60-chorus-lfo-frequency-too-fast.53861`, that poster thought the combined rate "roughly ten times" too fast; unconfirmed). P3's constants (0.513 and 0.863 Hz at Juno60 repo, 0.514 and 0.835 Hz Youth106) come from a measurement repository (PRIOR(P3)).

**uPD7810/7811 CPUs and firmware (MAME `juno106.cpp`, READ).** Dumps: `v5 a_5.ic2` (assigner, 0x2000) CRC 4818686b SHA1 4ab414a70281d382cb45478a62a6467e8dbb0a5d, `v2 b_2.ic37` (module, 0x2000) CRC e0dc721e SHA1 892b919a2476b269d916ba01dd5a81a25e044171. MAME status: skeleton, MACHINE_NO_SOUND, NOT_WORKING, with stub write handlers (BSD-3-Clause). Maps: master ROM 0x0000-0x1fff, RAM 0x2000-0x27ff; module ROM 0x0000-0x0fff mirrored, PIT writes 0x0000-0x2fff. The slave firmware contains the key-number-to-divisor table, the DCO CV amplitude law and the LFO/bender/portamento arithmetic, so a ROM disassembly would settle the open questions in P3 (DCO tune/LFO ranges, portamento law, envelope update rate). No disassembly is documented in the sources I read. A forum asks for the firmware (SNIPPET `https://forum.vintagesynth.com/viewtopic.php?t=96740`) and the synth ROM archive `https://dbwbp.com/index.php/9-misc/37-synth-eprom-dumps` lists other synths (SNIPPET; I did not see a Juno there).

**Envelope generators.** The 106 uses the slave CPU's D/A and S/H for the contour (the block diagram shows "S/H IC15, 18 ... VCA LEVEL" and per-voice ENV) while the 60 has analog ENV generator ICs (60 notes: "6 contour voltages developed at ENV generator run directly to mated VCAs", READ). So the 106's envelope is digitally generated and updated in steps, the 60's is analog RC (P3's "linear vs RC" question is a real difference between the two models; the notes I read do not state the update rate).

### 6.4 Juno-60 vs Juno-106 differences established from the notes (READ)

| Feature | Juno-60 | Juno-106 |
|---|---|---|
| Master clock | LC oscillator with varicap, 1 to 3.5 MHz, centre ~1.9 MHz; bend and LFO applied to the clock | 8 MHz crystal, divide by 2, 4, 8; bend and LFO computed in CPU |
| Counters | 8253 IC54, IC55 | 8253 IC33, IC34 (MAME: M82C53) |
| Sawtooth | falling, PNP discharge | rising, NPN discharge (thea.codes) |
| CPUs | uPD8049C-238 / -380 main, uPD80C49C panel; uPD444C-1 RAM | uPD7810/7811 master and slave; MIDI; HPD78116 option |
| Filter/VCA | discrete IR3109 + BA662A (parts list 15229801, 15229802) | D80017A hybrid with the same circuit |
| Chorus | MN3009 + MN3101 | same family (P3: MN3009; the 106 notes name only IC numbers) |
| DCB / MIDI | DCB interface | MIDI |
| Capacitors | through-hole | SMD ceramic |

### 6.5 Juno table

| Block | Parts | Best source read | Confidence | SPICE-level reference feasible? |
|---|---|---|---|---|
| DCO ramp core | 8253, NPN/PNP discharge, TL082, MC5534 | 106 notes + 60 notes + thea.codes (READ) | medium (106 passives estimated; 60 values on drawing not read) | Yes: the circuit is simple; thea.codes also publishes circuit.js simulations (`https://tinyurl.com/y7jwu75x` for the 106, `https://tinyurl.com/yadohf8d` for the 6 and 60, SNIPPET) |
| Pulse, sub, noise | op-amp comparator, flip-flop, IC14 noise | notes (READ) | medium-high | Yes |
| 12-bit D/A + S/H | IC28-32, IC23-26, IC15-22 | notes (READ) | high | Yes, but low sonic value |
| Filter | IR3109 4 OTA + exp converter, 68K and 240 pF (Juno-6 value) | Electric Druid, AMSynths, notes (READ); drawing values not read | medium | Needs a macromodel of the IR3109 and BA662; no public netlist found; feasible from a hand-built OTA-C model |
| Resonance VCA / output VCA | BA662A x2 | obsoletetechnology (READ) | low-medium | Behavioural only |
| Envelope | CPU D/A (106), analog (60) | block diagram (READ) | low-medium | Needs firmware knowledge for the 106 |
| Chorus | MN3009 x2, MN3101, M5218L, filters | parts lists (READ), measured values (PRIOR(P3), SNIPPET) | low-medium | BBD model feasible; the drawing values (filters, clock range) are unread |
| Bender/LFO | M5218L, panel | notes | low | Not worth it |

## 7. Minimoog Model D

### 7.1 Signal path (READ: Folkman 7/73 field manual, section II; CA-72 docs for the part numbers)

- **Board 1, 93-113 oscillator (three oscillators)**: "three tone oscillators, summing amplifiers, exponential current generators, waveshaping circuits and a -5 volt reference source ... independent and non-synchronous ... The basic sawtooth signal is processed to derive triangle and variable width rectangular waveforms." Per CA-72's reading of the service manual drawings (READ `https://raw.githubusercontent.com/idlefoundry/ca-72/main/docs/circuit/board1.md`): control summer IC1 (741, supplies GND and -10 V) with R20 "temperature compensating"; divider R9 33, R8 100 WW "scale", R19 1K giving 17.3 to 19.0 mV per octave (kT/q ln 2 is 17.8 mV at 25 C); exponential converter IC2 = CA3046 (or SG3821, drop-in) with Q1 reference and Q2 exponential transistor; IC3 (741) holds Q1's collector current at 99 uA via tail transistor Q5; **timing capacitor C1 0.01 uF polystyrene**, discharged linearly, reset by Q10 (2N4402); ramp 0 to -3.97 V; discrete buffer with an E402 JFET pair (Q7), 2N4058 pair (Q9, Q8) and a 2N3392 output; Schmitt reset Q5, Q6 (2N4402; the table says 2N3906); a -5 V reference from IC9 (741) with R177 and R173 10K 1 percent. Kit 94-001 (Folkman): R69/R105/R141 6.8K to 15K, R78/R106/R128 replaced by an RC network (part 65-032), R181 56K to 51K, R170 15K 1 percent metal film, R162 3.01K 1 percent metal film, C3/C5/C7 47 pF to 100 pF (READ manual section XII).
- **Board 2, 93-114 contour generators and keyboard**: "two identical contour or envelope generators, and the keyboard circuitry"; a constant-current source feeds a string of 43 keyboard resistors; a sample-hold holds the key voltage and "the glide feature is a function of the sample-hold circuit" (READ Folkman). Thump fix: 10 pF from pin 4B to 5B.
- **Board 3, 93-115 power supply**: +-10 V regulators (temperature-compensated zener reference; the minus supply tracks the plus), headphone amp (AC coupled emitter follower, push-pull), **noise generator: "uses a reverse biased transistor junction for a noise source ... processed through three filter circuits to derive the white, pink and red noise outputs"**, part "65-005 Noise Transistor", "Q15 on board 3" (READ Folkman), and the modulation mix amplifier. Noise level factory-set "-5dB maximum in the white position".
- **Board 4, 93-116 filter**: "voltage controlled low pass type which employs the Moog patented ladder network. It is capable of regenerating (oscillating) over a wide frequency range. The scale is adjustable so the filter can be set to track the keyboard", external input pre-amp (three transistors), overload Schmitt trigger and lamp driver, two VCAs "controlled by varying the voltage which supplies the current source transistors", a buffer, and "A-440 reference ... Wein Bridge oscillator ... produces a somewhat imperfect sinewave" (READ Folkman). CA-72's board 4 reading (READ `docs/circuit/board4.md`): mixer is a **current-summing node** (volume pot 25K, series 33K oscillators and external, 11K noise, so each channel arrives "about 70 times smaller than its wiper, so three oscillators at full volume drive the input pair into its nonlinear region ... the circuit's mixer overdrive"); control node sum (cutoff R11 5K, keyboard 1/3 R53 300K and 2/3 R54 150K, filter mod R52 33K, ext R51 100K, contour R74 47K, scale trim R49 500 ohm); exponential converter Q26 (TIS93 PNP) and Q28 (TIS92 NPN, emitter at ground), range trim R39 10K and R46 68K; input pair **Q29/Q30 (TIS97, matched)**: Q29 takes audio and Q30 takes emphasis feedback; **four stacked pairs Q23/24, Q19/20, Q10/11, Q2/3 with .068 uF across each pair's emitters**, bias chain R4 220, R16, R32, R41, R52 150, R67 200 from +10 V; gain recovery amplifier and differential pair Q7/Q5; VCAs Q16/Q15, Q14/Q13 (TIS97) with PNP output pair Q12/Q17 (2N4058); lamp driver Q25 (2N3392); Folkman filter-board modification: R2 47K to 160K, R8 and R28 27 to 4.7 ohm, R40 1K to 10K "to reduce intermodulation distortion" (READ manual).
- Note on service-manual copies: Folkman's 1973 manual and Table 7-5 differ from Figure 9-11 (CA-72 documents three states for R2, R8/R28 and R40). Which unit is "the" Model D matters.

### 7.2 Special parts and behaviours

- **Matched transistor pairs / arrays (TIS97, CA3046, SG3821).** Role: exponential converter and the ladder pairs. CA-72 models the matched pairs as identical and notes mismatch is a parameter. Behaviour to capture: temperature tracking of the exponential converter (R20 "temperature compensating", the 17.8 mV/octave slope), "Q28's reverse current", Early effect on Q26 (3 mV, "175 cents") (READ board4.md). Datasheets: Intersil CA3046 FN341.5 and RCA File 341 (listed in CA-72 sources, not opened); Central Semiconductor 2N3392 (MPS3392-95), 2N4058, 2N4402 data sheets (listed there).
- **Oscillator drift**: Folkman: "Oscillators drift and exhibit poor tracking: refer to Section XII - Modifications", and the 1 semitone per minute limit for the keyboard circuit (READ). CA-72: at 100 percent character each oscillator tuning offset up to 8 cents, mean-reverting drift walk 6 cents with 4 s time constant, waver 0.8 cent below 30 Hz, cutoff drift 0.03 octave (PRIOR(P2)). These are the CA-72 author's modelling choices, not measurements of a vintage unit.
- **Ladder filter overdrive**: input pair and ladder in high injection; CA-72 documents the passband change under overdrive (-0.43 to -0.54 dB) and the corner at 0.92 to 0.95 of the clean value (PRIOR(P2)); emphasis passband loss -2.25, -9.53, -12.50 dB at panel 2.5, 5, 7.5; Folkman's regeneration check: "Regeneration should start when the EMPHASIS control is between 7 and 8" with cutoff -1 (READ), consistent with CA-72's note that the reference oscillates at about 8.5.
- **Contour thump and VCA balance**: "VCA Balance" trimmers null the VCA feedthrough (READ); CA-72 models a thump of about 117 mV after C2 for a 5 V contour from the supply chain (C4 about 23 ms) (READ board4.md).
- **Keyboard/glide**: 43 resistors with constant-current source; sample/hold; glide as part of S/H; "pitch contact must occur before the trigger contact" (READ).

### 7.3 Where schematics can be read, and the best reuse

CA-72 (`https://github.com/idlefoundry/ca-72`, GPL-3.0-or-later, LICENSE text read at `.../main/LICENSE`) contains transcribed **SPICE netlists** of the real circuit: `circuits/boards/board1-vco.lib` (one oscillator, circuit No. ?), `board4-vcf.lib` (circuit No. 6), `board4-vca.lib` (No. 7), `board4-preamp.lib` (No. 12), `board4-a440.lib` (No. 13), with docs `docs/circuit/board1.md`, `board2.md`, `board4.md`, `sources.md`, `numerics.md`, `components.md`. `sources.md` states Board 3 (power supply and noise) was "to do" in the version I read and lists every scan URL with sha256, plus: "The files themselves are not in the repository: several sites ask that their scans not be re-hosted." The source scans it names (none opened by me): fantasyjackpalance.com GIFs at 300 dpi (`002/903-osc-print-schem-below.gif` 4422x3078, `002/907-cont-gen-key-schem.gif`, `002/908-power-print-circ-schem.gif`, `002/911-filt-print-circ-schem.gif`, `002/912-left-cont-circ-schem.gif`), the synthfool PDF (pp. 5 and 24-26 for Figure 9-3 and Table 7-5), manuals.fdiskc.com / archive.org `moog_Moog_Minimoog_Service_Manual` (82 pp.), Moog Music drawing 08-001 (4-10-72) and R. A. Moog Co. drawings 1436-1449 (S-RAM).

CA-72 states which drawings it used and which values conflict, so it is the best-documented circuit reference of the five instruments (verified by me only through its text, not by running it).

### 7.4 Minimoog table

| Block | Parts | Best source read | Confidence | SPICE-level reference feasible? |
|---|---|---|---|---|
| Oscillator core | CA3046/SG3821, 2N4402, E402, 2N4058, 2N3392, 741, C1 0.01 uF | CA-72 board1.md and netlist (READ), Folkman (READ) | high for topology and values (transcribed from two drawings) | Yes: netlist exists (GPL) |
| Exponential converter and tracking | IC2, IC3, R20 | board1.md (READ) | high | Yes |
| Mixer | 33K/11K series, 25K pots | board4.md (READ) | high | Yes |
| Ladder filter | TIS97 pairs, .068 uF | board4.md + `board4-vcf.lib` (READ text) | high | Yes: ngspice netlist exists; CA-72 itself uses it as its reference (PRIOR(P2), "validated against ngspice") |
| VCAs | TIS97 pairs, 2N4058 | board4.md | high | Yes |
| Noise | reverse-biased junction, filters | Folkman prose only (READ) | low | Board 3 netlist was "to do"; a behavioural model is enough |
| Contour generators and keyboard | board 2 | board2.md (not opened); Folkman prose | medium | Yes (CA-72 transcribed board 2 per sources.md) |
| Power supply | +-10 V regulators | Folkman prose | medium | Not needed |

## 8. Cross-cutting: ROMs, firmware and legal status

| Item | Dump documented where | Hash recorded | Notes on status |
|---|---|---|---|
| TB-303 uPD650C-133 mask ROM | MAME `roland_tb303.cpp` (READ) | CRC 268a8d8b | Roland copyright; MAME ships source not ROM; ro-mono-303 asks the user for their own ROM (SNIPPET) |
| TR-808 uPD650C-085 mask ROM | MAME `roland_tr808.cpp` (READ) | CRC 06f0c405 | same |
| TR-909 firmware v4 and v1, 3 sample ROMs | MAME `roland_tr909.cpp` (READ) | see 5.5 | sample data are Roland-copyrighted recordings; Fraser's WAV extractions are hosted on his personal site (READ) with no licence statement on the page |
| Juno-106 assigner and module firmware | MAME `juno106.cpp` (READ) | see 6.3 | skeleton driver |
| MKS-7 sample ROMs c42, c44, c71, c72 | MAME marks NO_DUMP (READ) | none | not dumped in MAME |
| Minimoog | no firmware | | analogue |

I found no document in my sources that states a licence or permission for any of these ROM images. MAME's BSD-3-Clause header covers MAME's own source (READ headers). MEMORY: Roland has not published these programs. The project rule in `CLAUDE.md` ("Reference audio, manuals and anything else under someone else's copyright stay out of the repository") already covers it: record the hashes, never the bytes.

## 9. Existing circuit analyses and open hardware (consolidated)

### 9.1 Netlists and simulations that exist

| Instrument | Item | URL | Licence | Status |
|---|---|---|---|---|
| Minimoog | CA-72 ngspice netlists of board 1, board 4 filter, VCA, preamp, A-440, board 2 docs | `https://github.com/idlefoundry/ca-72` | GPL-3.0-or-later (READ LICENSE head; P2 read README) | READ (docs and sizes); netlists themselves not opened |
| Minimoog | DAFx 2026 paper 29: five digital ladder implementations compared with a SPICE reference ("ngspice 46", netlist in the repository) | `https://www.dafx.de/paper-archive/2026/papers/DAFx26_paper_29.pdf` | unknown | SNIPPET only (WebFetch failed on DNS) |
| Minimoog | D'Angelo and Valimaki Generalized Moog ladder; All About Circuits small-signal series | `https://www.allaboutcircuits.com/technical-articles/analyzing-the-moog-filter/`, `.../small-signal-open-loop-transfer-function-moog-filter/` | | SNIPPET |
| Minimoog | Atosynth "Minimoog filter research" LTspice note | `https://atosynth.blogspot.com/2018/12/minimoog-filter-research-schmitzbits.html` | | SNIPPET |
| 303 | spice-music `tb303_vco_normalized.asc`, ladder examples | `https://github.com/bjostarmark/spice-music` | Public Domain (READ LICENSE); README "Freeware" | READ |
| 303 | x0xb0x open hardware (schematic, PCB, BOM) | `https://ladyada.net/make/x0xb0x` | open source hardware (OSHWA US002547, SNIPPET) | SNIPPET |
| 303 | Michigan Synth Works open firmware, OS-303 | links in 3.3 | | SNIPPET |
| 808 | Werner papers, PoliKick LTspice | links in 4.5 | | SNIPPET |
| 909 | Fraser's clone mods and ROM notes | `http://www.colinfraser.com/tr909/909mods/909mods.htm` | | not opened |
| Juno | thea.codes circuit.js simulations of 106 and 6/60 DCO | tinyurl links in 6.5 | | SNIPPET (links on the page I read) |
| Juno | Electric Druid, "Roland Juno DCOs" | `https://electricdruid.net/roland-juno-dcos/` | | listed on thea.codes page; not opened |
| Juno | synthnerd "Roland Juno 6: the DCO" | `https://synthnerd.wordpress.com/2015/10/31/roland-juno-6-the-dco/` | | listed; not opened |
| Juno chorus | Electric Druid "Investigations into what a BBD Chorus unit really does" and "Weird wiggles" (BBD clock modulation) | `https://electricdruid.net/investigations-into-what-a-bbd-chorus-unit-really-does/`, `https://electricdruid.net/weird-wiggles-bbd-clock-modulation/` | | SNIPPET: a sine-modulated clock does not give a sine pitch modulation; the three-level clock frequency effect |
| Juno chorus | "Understanding the Juno-60 Chorus" | `https://roberttylman.github.io/portfolio-site/tillysynth-chorus/index.html` | | not opened (DNS refused) |
| Juno chorus | GroupDIY "Juno Chorus" threads | `https://groupdiy.com/threads/juno-chorus.82336/page-3`, `.../juno-60-chorus-lfo-frequency-too-fast.53861` | | SNIPPET |
| Juno chorus | clone PCB (standalone Juno-60 chorus) | `https://www.tindie.com/products/synthdiy/standalone-juno-60-chorus-clone-pcb` | | SNIPPET |
| IR3109 / 80017A | AS3109 datasheet and Roland filter walk-through (Juno 6, SH-101, Jupiter-8, Jupiter-6 drawings redrawn) | `https://electricdruid.net/roland-filter-designs-with-the-ir3109-or-as3109/` | | READ (the redrawn schematics are images, not seen) |
| IR3109 | Florian Anwander's history of Roland filters | `https://www.florian-anwander.de/roland_filters/` | | linked; P1 got 000 |
| IR3109 | Modwiggler thread on IR3109 engineering | `https://modwiggler.com/forum/viewtopic.php?t=126397` | | linked from AMSynths; not opened |

I found **no public SPICE netlist** for: the 303 filter plus accent, the 808 or 909 voices, the IR3109 or BA662, the MN3009 chorus, or the 106 DCO (beyond circuit.js links).

## 10. What I could not find or could not do

1. **Component values on any Roland schematic drawing.** All service notes loaded as text with the drawings as images I could not see. Capacitor and resistor values for the 303 VCO and VCF, the 808 voices, the 106 chorus and DCO passives, and the 80017A are therefore unread by me. The owner-supplied 808 and 909 notes remain the only drawings this project has actually looked at.
2. **The Juno-106 chorus circuit.** The 106 notes (text) name chorus IC8-11 and LPO IC1, 2 but no BBD or clock part number; the BBD part numbers come from the 60's parts list and P3's sources. Clock frequency range, filter corners and companding are not read from any drawing.
3. **Datasheets**: BA662A (only clone/related parts found), IR3109 (only the AS3109 clone's datasheet link, not opened; original inside the Jupiter-4 service manual per AMSynths), MN3009 and MN3101 (links only), MC5534, uPD650 (no PDF), uPD7811, Intel 8253, HN61256P (none opened).
4. **The synthfool Minimoog "new and old" PDF and the archive.org 82-page manual**: both reachable only as snippets; the Folkman 1973 copy I read has no schematics ("not available at this time").
5. **TB-303 firmware disassembly or annotated source.** MAME records the ROM hash and CPU model; I found no document of a disassembly.
6. **Juno-106 firmware disassembly.** Only the MAME hashes and a forum request were found.
7. **Legal status**: none of the sources I read states permission to redistribute any of these ROMs.
8. **The 808's "swing-type VCA"**: no source I read this session names the circuit; B2 and Werner (PRIOR) describe the bass drum output stage. The everycircuit.com pages "roland swing type vca with envelope" are SNIPPET titles only.
9. **Searches I could not run** because Firecrawl credits ran out: dedicated searches for a TR-909 sample-ROM dump write-up beyond Fraser, for MAME-style disassemblies, for 808 hat circuits in LTspice, and a read of the Anwander filter history.
10. **WebFetch refused** `www.dafx.de` and `roberttylman.github.io`; the owner or coordinator can allow those hosts in the session network settings.

## 11. Ranked recommendation for this app (hardware view only; C2 and C3 decide the software)

1. **Minimoog Model D: start the reference simulation from CA-72's netlists** (GPL-3.0-or-later, compatible with the app's AGPL-3.0-or-later, needs a `THIRD_PARTY.md` entry). The oscillator, mixer, ladder and VCAs already exist as transcribed ngspice circuits tied to named service-manual figures. The best documented of the five.
2. **TR-909 sampled voices**: implement the documented architecture (ROM addresses -> 6-bit data -> resistor-array DAC -> VCA with address-derived anti-log envelope for crash and ride, DECAY RC for hats, about 30 kHz hat clock, clock-tied tuning, post-DAC lowpass) with the owner's own sample recordings. The service notes supply hat window addresses, change notes (C134, R417, C9, C54) and every part number needed; the sample bytes are not usable (Roland data).
3. **Juno-106 DCO, D/A and 80017A**: the notes give amplitude, PWM law (50 percent at +6 V, 95 percent at +0.6 V), 8 MHz / 2-4-8 clocking, 12-bit D/A and all alignment targets (248 Hz at C4 and 992 Hz at C6 for the VCF track, 4.8 Vp-p resonance sine). Build an OTA-C filter macromodel from the IR3109 description (68K, 240 pF Juno-6 values as a start) and validate against those targets.
4. **TB-303**: keep the Open303-based worklet; add the Q9/Q10/Q11 "ENV MOD moves the resting cutoff" behaviour from the service-note text, the 200 ms to 2.5 s decay range, and a note-to-note D/A tolerance option. A real reference simulation needs the drawing values.
5. **TR-808**: keep the circuit-fitted drums; the open-ended items are the noise transistor selection (2SC828) and the output VCA; use Werner's block models.
6. **Juno chorus**: needs a measurement or a read drawing before more modelling; do not invest beyond P3's constants until the chorus pages of the Juno-60 or 106 schematic are read (a person with the scanned drawings can transcribe the BBD filters and clock range in minutes).

## 12. Addendum after the coordinator's message (host checks by curl, 21 November 2026)

Firecrawl credits were already out when the message arrived. I checked the hosts the coordinator named with `curl -sS -L`:

- `https://emusic-diy.org/rolandmanuals`: HTTP 200, 37763 bytes (READ the page index only). It lists "Roland Juno 106 Service Manual", "Roland TB-303 Schematic", "Juno-106 User and Service Manuals", "Jupiter 6 and Juno-106 Calibration and other information", "TB-303 Operational Manual", with image links such as `https://emusic-diy.org/_media/rolandmanuals:tb303:tb303.gif` and `.../rolandmanuals:juno106:j106_05.gif`, `j106_13.gif` (Juno-106 service-note pages as GIFs). I did not download the images (rule: no schematics into the repository) and could not view them, so legibility is unknown; GIF scans of single pages are the likely best route to read drawing values by eye. Earlier P1 got 000 on this host; today it answers.
- Also linked from that page: `http://www.hinzen.de/midi/juno-106/manual/`, `http://www.artofcolor.com/tb303/` (not tried).
- `https://en.wikipedia.org/wiki/Roland_Juno-106`: 200, 182246 bytes (not read further).
- `https://ladyada.net/make/x0xb0x`: 404 (601 bytes); the x0xb0x page has moved, so section 3.4's URL for it is SNIPPET and may be stale.
- `https://support.roland.com/`: 403 (5400 bytes). `https://www.kvraudio.com/`: 403. `https://www.manualslib.com/`: 403.

Sections resting mainly on SNIPPET or MEMORY: 2.2 (808 notes), most of section 4 (the 808 parts list is one search snippet; voice values are PRIOR(B2)), 3.4 and 4.5 and 9.1 tables (links), the BBD behaviours in 6.3 (MEMORY and snippets), BA662 behaviour in 3.2 (MEMORY), the 8253 quantisation remark in 6.3 (MEMORY). Sections resting on READ: 2.1 first two rows, 2.3, 2.4 (106 notes, 60 notes), 2.5 (Folkman), 3.1, 5 (909 notes), 6.1 to 6.2, 7.1 to 7.3 (Folkman plus CA-72 docs), 8 (MAME sources).
