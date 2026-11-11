# Third-party code and material

Havantechno is licensed under the GNU Affero General Public License v3.0 or later (see `LICENSE`). Code ported from other projects is listed here with its origin and licence. Add a row before porting anything.

| Component in this repo | Origin | Licence | Notes |
|---|---|---|---|
| `app/engine/drums.js`: TR-909 voice constants (kick pitch endpoints and hold, envelope time-constant ranges, hat holds and decays, step levels) | andremichelle/tr-909 (`bassdrum.ts`, `preset.ts`, `channel.ts`, `processor.ts`) | AGPL-3.0-or-later | Constants read and cited by file and line in `docs/research/2026-11-09-box-crew/transcripts/B3-909.md`; no code and none of its recorded samples are copied. |
| `app/engine/drums.js`: TR-808 metal-oscillator bank, filter centres and kick model values | K. J. Werner, J. S. Abel, J. O. Smith, "The TR-808 Cymbal: a Physically-Informed, Circuit-Bendable, Digital Model" (ICMC/SMC 2014); K. J. Werner et al., "A Physically-Informed, Circuit-Bendable, Digital Model of the Roland TR-808 Bass Drum Circuit" (DAFx-14) | CC BY (3.0 on the PDF, 4.0 on Zenodo) | Published values cited in `B2-808.md`; attribution required by the licence. |
| `app/engine/drums.js`, `app/engine/programs.js` and others: values from manufacturer documents | Roland TR-808 service notes and owner's manual, TR-909 service notes (the owner's copies) | Roland's copyright | Facts (frequencies, time constants, ranges) derived by reading; the documents are not in this repository. |

Material that stays under its own terms regardless of this repo's licence: models released CC BY-NC (for example madmom's models) are non-commercial; third-party plugins hosted by the app carry their own EULAs.
