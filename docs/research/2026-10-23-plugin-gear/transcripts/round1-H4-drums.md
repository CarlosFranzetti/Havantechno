# H4: Hats, clap, shaker and percussion — round 1
Agent model: Haiku 5.5 (claude-haiku-5-5). Date: 2026-10-23.

**Read first: how this file is verified.** `(verified: <url>)` means a search excerpt from that URL supported the claim. No page was opened in full. All four WebFetch attempts failed (see Scope), so every "verified" tag rests on search-result text only. `(unverified)` means the claim came from an excerpt whose page I could not identify, from a forum or hobby page I did not check, from a vendor's marketing text I could not read in full, or from memory. Prices are as shown in excerpts seen on 2026-10-23. Page dates were usually missing, so treat every price as approximate.

## Scope

- Covered: closed and open hi-hats, clap, drum machines and drum synths. That includes 808 and 909 emulations, drum synths built into a DAW, dedicated drum-synth plugins, free drum synths, and browser projects.
- Not covered: shaker and the breakdown percussion line. The search budget ran out before I reached them, so the findings below say nothing about them.
- Research limits:
  1. WebSearch: I ran 15 searches. The per-turn budget of 200, shared by every agent in this turn, was used up before I could run the Behringer RD-8, Arturia DrumBrute Impact, EXD-80 and Cherry Audio price queries. Those topics are not in the findings. Korg Volca Drum, Logic's Drum Machine Designer and FL Studio's Sakura were not searched.
  2. WebFetch: four attempts failed. The Roland, Raygum and KraftMusic hosts returned `getaddrinfo ENOTFOUND`. The egress proxy returned 403 for docs.cherryaudio.com, which is a policy denial. I did not retry or route around it.

## What the reference track needs from this category

From the analysis table in `docs/superpowers/specs/2026-10-21-guidance-studio-design.md`:

- Clap on beats 2 and 4. Centroid about 2.7 kHz. Short body plus reverb tail.
- Open hat on off-beat 8ths (steps 2, 6, 10, 14). Centroid about 5.9 kHz, about 250 ms, metallic ring about 1.5 kHz.
- Closed hat as 16th pickups (steps 7 and 15 in the main groove, pairs in the build, busier in part two).
- Breakdown: 16th shaker and a percussion pattern.

What the studio already has (`studio/synths.js`, read for this report, not changed):

- `BUILD.clap`: three flams of bandpassed noise (bandpass default 1900 Hz, Q 0.8), body decay 0.16 s, and a 4.5 kHz lowpassed noise tail (tailDecay 0.35 s).
- `hatBuild(false)` and `hatBuild(true)`: highpassed noise (tone default 7200 Hz), plus six square waves at ratios [0.62, 0.78, 1.0, 1.21, 1.47, 1.73] times a ring frequency (default 1500 Hz), through a bandpass at Q 4 and a highpass at half the tone frequency. Closed decay 0.055 s. Open decay 0.26 s, with an attack-hold-release shape.
- `BUILD.shaker`: bandpassed noise (6500 Hz, Q 1.2), decay 0.07 s.
- `BUILD.perc`: a sine with a pitch drop (380 Hz, drop 0.5), plus a 2500 Hz bandpassed noise tick.

## Findings

| Name | Vendor | Licence (commercial / free / open source) | Formats | Relevance to the element | Verified source |
|---|---|---|---|---|---|
| TR-909 (Roland Cloud plugin) | Roland | Commercial. Roland Cloud from $19.95/month or $215.40/year, per a MusicRadar excerpt (verified: https://musicradar.com/news/rolands-tr-909-plugin-is-now-available-in-the-cloud). Standalone listed near $149 (verified: https://www.pluginboutique.com/product/1-Instruments/7-Drum-Machine/15284-TR-909) | Roland Cloud plugin. Plugin format not verified | Reference for the target sound. Roland's own circuit description is contested for the hi-hat (see below) | Roland's 2018 press release excerpt lists the hi-hat among analog voices, with only cymbals sampled (verified: https://www.roland.com/us/company/press_releases/2018/ROLAND-VIRTUAL-SONICS-ANNOUNCES-THE-RELEASE-OF-THE/). A second excerpt of Roland's description omits the hi-hat (verified: https://www.gearnews.com/?p=259080, which gives a different list). A third source says the hats, crash and ride are three 6-bit, 18 kHz PCM samples, with analog stages after them (verified: https://www.polynominal.com/m/roland-tr-909.htm). **Conflict, not settled.** |
| TR-8S (hardware) | Roland | Commercial hardware. Price not found | Hardware | Reviews say it models the 808, 606 and 909 with Analog Circuit Behavior (ACB), plus samples and FM. One excerpt gives 5 ACB clap tones and 8 ACB hat tones. Attribution of that count to a page is unclear (unverified) | Product title (verified: https://www.guitarguitar.co.uk/product/180305323927008--roland-tr-8s-sampling-drum-machine). ACB and tone-count claims (unverified: https://www.zzounds.com/item--ROLTR8S/adid--lp_169_sku_20 appeared in the results, but the excerpt does not tie the claims to it) |
| Ableton Drum Synths: DS Clap and DS HH | Ableton | Bundled with Live. Live edition and price not checked | Ableton Live devices. Not a plugin format | DS HH: Noise (white or pink), Tone (high-pass cutoff), Decay, Volume. DS Clap: Tone, Tune, Decay, Volume, and Tail, which adds filtered noise to the impulse. The parameter set is a useful template for our specs. Per-pad choke groups exist in Drum Racks | Manual pages (verified: https://www.ableton.com/en/live-manual/12/max-for-live-devices). Drum Synth Rack holding all eight Drum Synths, described in a July 2025 article (verified: https://www.soundonsound.com/techniques/live-12-drum-racks-revisited). Choke groups (verified: https://unison.audio/ableton-drum-rack/) |
| Elektron Analog Rytm MKII | Elektron | Commercial hardware. Price not found | Hardware | Analog hats and clap with a sample layer. 12 tracks share 8 voices. The clap shares a voice with the rimshot. Closed and open hats share one voice, so they never sound at the same moment. That is a useful constraint for choke behaviour. The sample layer is from a used-gear listing (unverified) | Voice sharing and analog hats (verified: https://www.perfectcircuit.com/m2e/elektron-analog-rytm-mkii.html). MK2 changes (verified: https://www.long-mcquade.com/GearHunter/931964/Elektron-ANALOG-RYTM-MK2.htm) |
| Tone.js MetalSynth | Tone.js project | Open source per the project's package. Licence not found in this session | JavaScript, browser and Node | Metallic, inharmonic source built from FM oscillators with harmonicity and modulation index. A highpass follows the envelope, and resonance sets its lower limit. This is the closest browser-native cymbal and hat option found. The fixed ratios [1.0, 1.483, 1.932, 2.546, 2.63, 3.897], described as TR-808-based, appear in a fork's source. Not confirmed for the official release (unverified) | Options and envelope (verified: https://app.unpkg.com/tone@15.1.8/files/build/esm/instrument/MetalSynth.d.ts; see also https://tessl.io/registry/tessl/npm-tone/15.3.0/files/docs/instruments.md). Fixed ratios (unverified: excerpt of a fork's source; the page I saw may be https://app.unpkg.com/@azgaar/tone@14.8.7/files/build/esm/Tone/instrument/MetalSynth.js) |
| Mutable Instruments Plaits | Mutable Instruments (Eurorack) | Firmware open source. Reported as MIT for STM32 code, GPL-3.0 for AVR code and CC-BY-SA 3.0 for hardware. The source page for that is not identified (unverified). Module price not found | Eurorack module. Open DSP code | Percussion engines include analog kick, snare and hi-hat emulations, two flavours each. Open DSP for a drum-voice family, which could be ported to JavaScript in principle. A naming rule for derived works ("Mutable Instruments" may not be used) is reported (unverified) | Percussion engines (verified: https://clockfacemodular.com/en/products/mutable-instruments-plaits). Models based on classic drum machines (verified: https://www.musicradar.com/reviews/mutable-instruments-plaits) |
| Tiptop Audio HATS808 and HATS909 (Eurorack) | Tiptop Audio | Commercial hardware. Price not found | Eurorack | HATS808: vendor says six square-wave oscillators through a bandpass give the 808's metallic character. Vendor manual reports unscaled, uncompensated oscillators, with frequencies that varied across measured original 808s (vendor claims, unverified). HATS909: 6-bit samples through analog envelope and filter stages (vendor claim) | Product pages (verified: https://kraftmusic.com/tiptop-audio-hats808-analog-hi-hats-drum-module.html; verified: https://kraftmusic.com/products/tiptop-audio-hats909-hi-hats-drum-module; also https://rubadub.co.uk/products/tiptop-audio-hats808-tr-808-hi-hat-eurorack-drum-module). Vendor design claims are unverified because they come from excerpts I could not tie to a specific page |
| Cherry Audio "Transistor 808 Hats" documentation | Cherry Audio | Licence and price not found. Product format not found | Not found | Describes the 808 cymbal as four or six pure square waves at irregular intervals (roughly 200 to 800 Hz), mixed and passed through a steep high-pass. Also says the 808 hat oscillators are built around a single hex inverter chip (this is secondary documentation, not Roland) | verified: https://docs.cherryaudio.com/misfit-audio/transistor-808-hats. Excerpt only, because the egress policy blocked the page |
| Drumatic 3 (E-Phonic) | E-Phonic | Free donationware, Windows. KVR lists "Free (Donationware)" with no copy protection (verified: https://www.kvraudio.com/product/drumatic-3-by-e-phonic/reviews) | VST, Windows. Equipboard says 32-bit only (verified: https://equipboard.com/items/drumatic-3) | A clap, and closed, pedal and open hats. Subtractive synthesis with no samples, per a KVR user review (verified: https://www.kvraudio.com/product/drumatic-3-by-e-phonic/reviews). Drumatic 4 is a separate paid product, listed at 29.99 EUR intro (regular 49.99 EUR, excl. VAT). Date and source page not identified (unverified) | As listed in the Licence column |
| Microtonic (Sonic Charge) | Sonic Charge | Commercial. $99 USD plus VAT for the VST/AU version, per a release-note excerpt (unverified: page not identified). Three-week trial (unverified) | VST/AU (per the same excerpt, unverified) | Described as a 100% synthetic eight-channel drum and percussion synth with a pattern machine. No clap-specific claim found | Product page exists (verified: https://cdn.soniccharge.com/microtonic). Price is unverified |
| Free drum synths: MiniSpillage (AudioSpillage) and EXD-80 | AudioSpillage; EXD-80 developer not recorded | Free, per roundup excerpts. Licence not checked | MiniSpillage: one source says Mac only, others conflict (unverified). EXD-80: 32-bit VST, Windows (unverified) | MiniSpillage has BassDrum, WoodDrum and ElectroHiHat models. Its hi-hat is a six-oscillator closed and open generator with noise and dual resonant filters. EXD-80 is a virtual-analog kick, snare, open and closed hat and percussion synth. Both are unverified | Roundup page seen in results (unverified: https://bedroomproducersblog.com/free-vst-plugins/drums/). Exact source for each claim not identified |
| Browser TR-808 projects (Web Audio) | Community projects on GitHub | Licence not found for any of them. Do not copy code until checked | Browser (Web Audio). React, Redux, TypeScript or plain JavaScript | Working 808-style hats and clap in the browser. gsspdev/TR_808_Emulator is sample-free plain JS with 8 synthesised voices, including closed and open hats. vincentriemer/io-808 says its cymbal and rimshot still need work. ewanders1-web/tr-808 is 808-inspired DSP, not ROM samples. jeco123/beatcraftery has several hat variants | verified: https://github.com/gsspdev/TR_808_Emulator; verified: https://github.com/vincentriemer/io-808; verified: https://github.com/ewanders1-web/tr-808; verified: https://github.com/jeco123/beatcraftery. A fork is at https://github.com/TheoGal/io-808 (verified as a search result, not opened). A project named "driftbox" was mentioned with no URL seen, so it is not listed as a source |

### Circuit descriptions (not products)

- **808 hats and cymbal:** A 2014 ICMC paper says the 808's cowbell, cymbal, open hat and closed hat voices all filter and envelope rectangular waves from one shared bank of six oscillators (verified: https://speech.di.uoa.gr/ICMC-SMC-2014/images/VOL_2/1453.pdf). The hex-inverter detail comes from Cherry's documentation, not from a schematic (unverified).
- **808 clap:** A First Principles modification guide describes the clap as a dense cluster of filtered, distorted noise pulses, plus a softer decaying "reverb" pulse that can be switched off. A Density control sets how tightly the pulses pack (verified: https://www.firstpr.com.au/rwi/tr-808/). The same page is a modification guide, so this is its description of the stock clap, read as such.
- **808 noise:** Secret Life of Synthesizers says the 808's noise comes from a reverse-biased transistor junction, feeding the clap and snare. Swapping that transistor audibly changes the clap (verified: https://secretlifeofsynthesizers.com/the-strange-heart-of-the-roland-tr-808/).
- **808 clap tail and retrigger:** Forum posters say the reverb tail is set by a capacitor-charged envelope, so some units need several triggers before the VCA fully opens. One explanation is speculation (verified as a forum claim only: https://www.modwiggler.com/forum/viewtopic.php?p=1337524). A hobbyist recipe is white noise, bandpass, then VCAs shaped by an LFO and an envelope (forum; verified as a claim only: https://www.kvraudio.com/forum/viewtopic.php?t=336866).

## Recommended gear list

Ranked. Costs are approximate and dated 2026-10-23. Nothing here is a purchase I can recommend without the open questions answered.

1. **Keep our own hat and clap DSP as the base.** The excerpts describe the 808 hat as six square waves into a bandpass, and the 808 and 909 clap as noise bursts plus a tail. `synths.js` already implements both (see "What the studio already has"). Cost: none. Licence: the project's own. The sensible change is to add a noise-colour switch and a choke rule, not to replace the voices.
2. **Use the Ableton Drum Synths parameter set as a naming template.** Noise colour, Tone as high-pass cutoff, and Tail as clap noise are all useful. Cost: bundled with Live; Live edition price not checked.
3. **Read the browser TR-808 repos as references, not as code to copy.** gsspdev/TR_808_Emulator is sample-free and has closed and open hats. Cost: free. Licence not found, so copying is not allowed until it is checked.
4. **Tone.js MetalSynth as a browser-native cymbal or hat option**, if its licence is confirmed. Cost: free (licence not found this session).
5. **Roland TR-909 (Roland Cloud) as a listening reference for the target sound.** About $149 standalone, or about $19.95/month on Roland Cloud (approximate, excerpts seen 2026-10-23). Not a porting target.
6. **Plaits DSP as an open-source reference for percussion voices**, if its licence is confirmed. Module price not found.
7. **Drumatic 3 as a free listening reference for subtractive claps and hats.** Windows only (32-bit per Equipboard).

## Browser feasibility

- **Already in the browser:** `clap`, `hat_closed`, `hat_open`, `shaker` and `perc` are all Web Audio in `studio/synths.js`.
- **Browser code available to read:** the TR-808 repos above (Web Audio, JS or React) and Tone.js MetalSynth (JS). Licences not found for the repos.
- **Desktop or hardware only:** Roland Cloud TR-909, TR-8S, Ableton Drum Synths, Elektron Analog Rytm, Microtonic, Drumatic 3, MiniSpillage, EXD-80, Tiptop modules, and Plaits hardware. For the DSP, the open-source code (Plaits firmware, if licensed) is the only realistic port source.
- **Would need reimplementing:**
  - A 909-style hat, if the sample account is right. Roland says the hat is analog, but the Polynominal excerpt says it is 6-bit PCM. The studio has no audio files (CLAUDE.md), so a 6-bit path would have to be generated in code.
  - The 808 choke, where open and closed hats cut each other off. This is a sequencer rule, not a voice property. It is not in `synths.js`. The choke is mentioned in one excerpt with no source attributed, so it is listed as unverified below.
  - Hat unit-to-unit drift, if the recreation should copy real hardware (vendor claim, unverified).
- **Shaker and percussion:** not researched.

## Recalled, not verified

- The 808 closed and open hats choke each other when triggered together. One excerpt says so, but no page is attributed. Unverified.
- The 909 clap is built from several noise bursts, which is what our flam structure imitates. Recalled from general knowledge. Not verified in this session.
- Tone.js and Plaits are MIT-licensed. Both are recalled, and the Plaits claim comes from an excerpt whose page I could not identify.
- The Mutable Instruments naming rule for derived works. Reported in an excerpt, not checked against the source.

## Handoffs to other agents

- **S3 (filters):** the bandpass Q of about 4 on the hat's metal part, and the highpass at half the tone frequency. The MetalSynth highpass follows the envelope, which is a different design choice.
- **S2 (reverb):** the clap tail is a short noise tail, not a full reverb. Check whether it should be a shared reverb send instead. The 808 "reverb pulse" is short and decaying, so it is closer to a tail than a reverb.
- **S5 (stems and transcription):** check the reference's hat and clap onsets on the stems. Confirm the step map (open hats on 2, 6, 10, 14; closed pickups on 7 and 15) and whether the closed hat cuts the open hat.
- **O2 (DAW):** choke groups and per-step drum triggers in a browser DAW. Ableton's Drum Rack choke groups are the reference (verified: https://unison.audio/ableton-drum-rack/).
- **O1 (whys and hows):** whether the recreation should aim at one ideal unit or at the unit-to-unit variation of real 808s (vendor claim, unverified).

## Questions for the Opus agents

1. **O1:** Is the reference's hi-hat synthesised or sampled? The sources conflict on the 909, and the answer decides whether a sample-like path is needed in a project with no audio files. This is my most important open question.
2. **O1:** Should the recreation aim at a 1980s hardware character (unit variation, RC drift, choke behaviour) or at a clean ideal?
3. **O2:** Can the browser DAW expose choke groups and per-step drum triggers, so that open and closed hat behaviour can be written into step data?
4. **S5 (round 3):** Do the reference's open and closed hats overlap in time (choke) or not?

## Sources

Every URL below appeared in a search result or was read directly. No page was opened in full. Each is listed here once.

- https://www.roland.com/us/company/press_releases/2018/ROLAND-VIRTUAL-SONICS-ANNOUNCES-THE-RELEASE-OF-THE/
- https://www.gearnews.com/?p=259080
- https://www.polynominal.com/m/roland-tr-909.htm
- https://musicradar.com/news/rolands-tr-909-plugin-is-now-available-in-the-cloud
- https://www.pluginboutique.com/product/1-Instruments/7-Drum-Machine/15284-TR-909
- https://www.guitarguitar.co.uk/product/180305323927008--roland-tr-8s-sampling-drum-machine
- https://www.zzounds.com/item--ROLTR8S/adid--lp_169_sku_20
- https://www.ableton.com/en/live-manual/12/max-for-live-devices
- https://www.soundonsound.com/techniques/live-12-drum-racks-revisited
- https://unison.audio/ableton-drum-rack/
- https://www.perfectcircuit.com/m2e/elektron-analog-rytm-mkii.html
- https://www.long-mcquade.com/GearHunter/931964/Elektron-ANALOG-RYTM-MK2.htm
- https://tessl.io/registry/tessl/npm-tone/15.3.0/files/docs/instruments.md
- https://app.unpkg.com/tone@15.1.8/files/build/esm/instrument/MetalSynth.d.ts
- https://app.unpkg.com/@azgaar/tone@14.8.7/files/build/esm/Tone/instrument/MetalSynth.js
- https://clockfacemodular.com/en/products/mutable-instruments-plaits
- https://www.musicradar.com/reviews/mutable-instruments-plaits
- https://kraftmusic.com/tiptop-audio-hats808-analog-hi-hats-drum-module.html
- https://kraftmusic.com/products/tiptop-audio-hats909-hi-hats-drum-module
- https://rubadub.co.uk/products/tiptop-audio-hats808-tr-808-hi-hat-eurorack-drum-module
- https://equipboard.com/items/tiptop-audio-hats808
- https://docs.cherryaudio.com/misfit-audio/transistor-808-hats
- https://www.kvraudio.com/product/drumatic-3-by-e-phonic/reviews
- https://equipboard.com/items/drumatic-3
- https://cdn.soniccharge.com/microtonic
- https://bedroomproducersblog.com/free-vst-plugins/drums/
- https://github.com/gsspdev/TR_808_Emulator
- https://github.com/vincentriemer/io-808
- https://github.com/TheoGal/io-808
- https://github.com/ewanders1-web/tr-808
- https://github.com/jeco123/beatcraftery
- https://speech.di.uoa.gr/ICMC-SMC-2014/images/VOL_2/1453.pdf
- https://www.firstpr.com.au/rwi/tr-808/
- https://secretlifeofsynthesizers.com/the-strange-heart-of-the-roland-tr-808/
- https://www.kvraudio.com/forum/viewtopic.php?t=336866
- https://www.modwiggler.com/forum/viewtopic.php?p=1337524
