# Crate Crew report: minimal tracks to recreate

Coordinator's report, 8 to 9 November 2026 (ET), from `transcripts/C1-electro.md` and `transcripts/C2-minimal.md` (first pass from search summaries, second pass from pages read through the proxy; each claim tagged [S] seen, [S2] snippet, [M] memory). The owner supplies the audio; nothing is committed.

## 1. The question

Tracks built from one synth and one drum machine, or close to it, so that recreating them needs few instruments: the targets for batches 1 to 4 after Guidance.

## 2. Result

38 candidates catalogued (20 electro, 18 minimal techno and acid), ranked by recreation difficulty. Ten have gear confirmed from a page read in full; the rest carry snippet or memory tags and are leads. Both agents' corrected first picks:

| Pick | Track | Why | Gear, as sourced |
|---|---|---|---|
| 1 | Robert Hood, "Rhythm of Vision" (Minimal Nation, 1994) | two to three instruments, the best-documented gear of any candidate, a real 909 | SH-101, Juno-2, TR-909, DX100, QY sequencer, 4-channel mixer; no reverb or compression in recording, a little reverb at mastering [S, RBMA interview] |
| 2 | 2 Live Crew, "Throw the D" (1986) | 808 and voice, no synth | TR-808 [S, Mr. Mixx interview] |
| 3 | Plastikman, "Spastik" (1993) | one drum machine carries the track | TR-808 percussion [S, Wikipedia]; sources earlier disagreed |
| 4 | Phuture, "Acid Tracks" (1987) | one 303 line; the drums are samples, so it exercises the sampler | TB-303 confirmed; TR-707/727 reported only [S/S2] |
| 5 | Newcleus, "Jam On It" (1984) | four named instruments, first-hand | TR-808, Pro-One bass, TB-303 sequence, RS-09 chords [S, Cozmo D via RBMA] |
| 6 | Cybotron, "Clear" (recorded 1982, single 1983) | early electro template | TR-808, MS-10, Pro-One [S2, Reverb summary; the Wikipedia page names no gear] |
| 7 | Jeff Mills, "The Bells" (1996) | 909 plus one delayed melody | TR-909 backbone [S2]; the synth unknown |
| 8 | Robert Hood, "Acrylic" (Minimal Nation) | acid on a Juno-106, no 303 | [S, RBMA] |
| 9 | Run-D.M.C., "Sucker M.C.'s" (1983) | drum machine and voice | drum machine unverified (a DMX is plausible) |
| 10 | Hashim, "Al-Naafiysh" (1983) | 808 and one synth line | no gear page reachable; synth unknown |

Reserve: Egyptian Lover "Egypt, Egypt" (TR-808, Jupiter-8, SH-101, SVC-350 vocoder as his general rig, not a per-track credit [S]), Afrika Bambaataa "Planet Rock" (808, hand-played Micromoog and Prophet-5, a Fairlight hit [S, Sound on Sound]), Mantronix "Needle to the Groove" (808, vocoder [S]), Basic Channel "Phylyps Trak" (gear undocumented; an effects test for later), Kraftwerk "Numbers" (not an 808: a Friendchip and a toy Mattel machine, which tests the unknown-drums path).

## 3. What this tells the build

- The first four picks need: a TR-808 (picks 2, 3), a TR-909 (1), a TB-303-class mono bass (4, and a 303 line in 5), the sampler for 707/727 hits (4), an SH-101-class mono synth and a Juno-class poly (1), a DX100-class FM synth (1, which is why the engine gains an `fm` instrument). That is batches 1 and 2 plus two or three synth types the engine partly has.
- Reverb is light or absent on the best-documented records (Hood recorded dry), which suits a classifier that reports "shared" or "element-specific" rather than built-in or outboard.
- Tempos are all from memory and are measured on import.

## 4. Limits

- Pages: reverb.com refuses automated clients, Equipboard shows a bot wall, Wikipedia rate-limited one page; Mixmag and GearNews are outside the allowed hosts. The RBMA archive, Wikipedia, Sound on Sound and Discogs were read.
- No per-track gear exists for Mills, Basic Channel, Maurizio, Green Velvet, Villalobos or Daft Punk's tracks; those stay leads.
- Nobody listened; instrument counts for the untagged rows are from memory.

## 5. For the owner

Supply the files for picks 1 to 5 (and 6 if you have it). The analysis pipeline (batch 4) opens each as a project and the Ear Crew method measures what the pages could not say.
