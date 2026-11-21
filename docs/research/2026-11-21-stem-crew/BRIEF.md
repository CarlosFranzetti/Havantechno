# Stem Crew brief: separating a record into stems, and reading what is in them

Written by the coordinator, 21 November 2026 (ET). Research and reasoning first; no code in this round.

## The owner's words

"I want a bunch of research and reasoning on how to approach this further. Eventually I do want what I've been asking but I also want the app to separate the elements into audio stems and I want you research how isotope RX 12 does their analysis and what engines a izotope uses and look into as many RE'd or open source sound engines and stem handling audio. Etc." And: "Improved the audio detection engine."

## Where the app stands

- `tools/separate.py` runs HT-Demucs (default) or MDX-Net and writes four stems; the Electron shell can call it (`HavantechnoShell.separate`). The drums stem is then split by frequency band, not separated. On the engine's own 16-bar render HT-Demucs scored SDR 24.0 / 17.7 / 19.4 dB (drums, bass, other); nothing is validated on a real record.
- `app/analysis/` decides synth or sample, mono or poly, FM or subtractive, 808 or 909, reverb, and suggests a recreation by rule; `app/engine/importer.js` reads tempo, drum steps and mono notes. Known failures: pitched-part recreations wrong in the import test, hats misread, tempo from a bass line alone, no downbeat, poly parts read as mono, no parameter fitting.
- Reports: `docs/research/2026-11-09-lab-crew/REPORT.md`, `docs/research/2026-11-11-dubplate-crew/transcripts/log-coordinator.md`.

## Questions

- **S1, iZotope and the commercial field.** What RX (the current version; check whether RX 12 exists and what it added) does for analysis and separation, module by module, and what iZotope has said in public about the engines behind it (papers, patents, talks, documentation, interviews). The same, briefly, for the other commercial stem tools (SpectraLayers, RipX, Moises, LALAL.AI, AudioShake, Serato, Logic, Ableton, FL Studio). Separate what a source states from what is inferred.
- **S2, open-source separation and stem handling.** Every open or reverse-engineered separation engine worth knowing: model families, published scores, licences of code and of weights, what each separates (four stems, six, drum-kit pieces, arbitrary queries), how they are run in a desktop app or a browser, how stems are cascaded, stored and exchanged. A recommended pipeline for this app, with what it costs to run.
- **S3, the detection engine.** How to read what is in a stem: drum transcription, note transcription, beat and downbeat tracking, instrument and timbre identification, synth-parameter estimation (sound matching), effect and reverb estimation. Open tools, their licences and accuracy, and a proposed second version of the app's analysis with what runs in JavaScript and what in a Python sidecar.

## Rules for researchers

- Write one file each in `transcripts/` (S1-izotope.md, S2-separation.md, S3-detection.md). Touch nothing else; no commits; never git stash, checkout, reset or clean.
- Every claim carries how you know it: READ (you fetched the page and it says so; give the URL and quote the figure), SNIPPET (a search result's summary only), or MEMORY (your own recollection, unverified). Never invent a URL, a paper title, a figure or a quotation. If you cannot find it, say so.
- Fetching: use the Firecrawl tools (`firecrawl_search`, `firecrawl_scrape`; load them with ToolSearch if they are not listed) for pages; use `curl -sS -L` in Bash for github.com and raw.githubusercontent.com. Budget per researcher: at most 25 searches and 40 page scrapes. Never put the owner's name, e-mail or the project's name in a query.
- Dates matter: note each source's date; products and model rankings change.
- End with a ranked recommendation for this app and a list of what you could not find.
