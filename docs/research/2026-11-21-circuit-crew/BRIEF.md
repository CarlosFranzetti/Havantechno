# Circuit Crew brief: chips, schematics, open emulations, and how the best emulations are made

Written by the coordinator, 21 November 2026 (ET). Research and reasoning first; no code in this round.

## The owner's words

"Separately I want you to hunt down the chips and schematics for the different soft synths and see if there are also open source emus if so let's use that. If not let's start reverses engineeering some of it. ... improve my synths so they're closer to arturias methods."

## Where the app stands

Five instruments in `app/engine/`: 27 TR-808 and TR-909 voices (`drums.js`, plain Web Audio nodes, fitted to the service manuals' tables), and three AudioWorklet synths (`classics.js`, `worklets/classics-processor.js`): `tb303` (ported from Open303, MIT, with an accent network and timings from Whittle's and Stinchcombe's analyses), `modeld` (ImprovedMoog ladder, ISC, with CA-72's measured knob laws), `juno` (six voices and a chorus, numbers from Junox and Juno60). Reports: `docs/research/2026-11-11-patch-crew/REPORT.md` and `transcripts/P1-303-second-pass.md`, `P2-modeld.md`, `P3-juno.md`; `docs/research/2026-11-09-box-crew/REPORT.md`. Nobody has compared any of them with a real unit. The app is AGPL-3.0-or-later and for the owner and a few friends, not for sale.

## Questions

- **C1, the hardware.** For the TB-303, TR-808, TR-909, Juno-106 (and Juno-60 where it differs) and Minimoog Model D: the signal path part by part (every IC, transistor array and special part: filter and VCA chips, BBDs, counters, CPUs, sample ROMs), where service notes and schematics can be read, datasheets for the special parts, which ROMs have been dumped and where that is documented, and what each part does to the sound.
- **C2, open emulations and reverse-engineering projects.** For each instrument: every open-source emulation, clone, firmware or ROM project and circuit-level simulation (software and open hardware), with licence, what it models and how deeply, how it was validated, and whether it can be ported or run in an AudioWorklet (JavaScript or WebAssembly). A verdict per instrument: use it, port part of it, or reverse-engineer from the schematic.
- **C3, methods.** How Arturia, Roland, u-he, Cytomic, Softube and others describe their analogue modelling in public, and the published toolkit behind such work (zero-delay-feedback and topology-preserving filters, wave digital filters, state-space and nodal methods, nonlinear solvers, antialiased oscillators, oversampling, bucket-brigade models, component tolerance and drift, neural grey-box models). Open tools that could be used here (circuit simulators, WDF libraries, Faust). A concrete workflow for this project: from a schematic to a reference simulation to a real-time model checked by a bench, and where WebAssembly is needed.

## Rules for researchers

- Write one file each in `transcripts/` (C1-hardware.md, C2-open-emulations.md, C3-methods.md). Touch nothing else; no commits; never git stash, checkout, reset or clean.
- Every claim carries how you know it: READ (you fetched the page and it says so; give the URL and quote the figure), SNIPPET (a search result's summary only), or MEMORY (your own recollection, unverified). Never invent a URL, a part number, a figure or a quotation. If you cannot find it, say so.
- Fetching: use the Firecrawl tools (`firecrawl_search`, `firecrawl_scrape`; load them with ToolSearch if they are not listed) for pages; use `curl -sS -L` in Bash for github.com and raw.githubusercontent.com (read LICENSE files and source directly). Budget per researcher: at most 25 searches and 40 page scrapes. Never put the owner's name, e-mail or the project's name in a query.
- Do not download ROM images, manuals or schematics into the repository; record where they are and what their status is.
- End with a ranked recommendation for this app and a list of what you could not find.
