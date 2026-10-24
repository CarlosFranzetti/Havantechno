# Ear Crew: coordinator's log

## 2026-10-24 ~01:00 UTC — the owner's instruction and the first measurements

The owner listened to the app's first full render (the Render Room artifact) and the original, and said: "I want it to sound very close to the original. I don't think it does right now. I want all the sounds accounted for." The original was uploaded as a 192 kbps MP3 (387.99 s). It was copied to the coordinator's scratchpad only; it is not in the repository and will not be.

First measurements, before any brief, are in BRIEF.md: loudness-matched band deltas per section (render 6 to 13 dB above the reference from 300 Hz to 4 kHz, highs matching from mainA on), the reference's low-end peaks (59.2 Hz dominant, 35.0 Hz second), the render's intro dominated by a 123.8 Hz bass with a harmonic stack to 1.6 kHz that the reference does not have, and the solo renders' levels and centroids. Spectrograms of both full files and of four 16-bar windows were drawn with ffmpeg and inspected: the reference's intro is nearly all low end with faint 4-bar noise sweeps; its main sections have far less harmonic mid density than the render; its 1 to 2.5 kHz band is rhythmic.

## 2026-10-24 04:28:58 UTC — crew dispatched; two obstacles

E1 (Opus) low end, E2 mids, E3 drums top, E4 arrangement and samples, E5 mix and master (Sonnet) were dispatched at about 01:16 UTC. All five were stopped by the account's session limit within minutes ("resets 3:50am UTC"); their partial transcripts were committed as WIP and all five were resumed at 04:28 UTC.

Demucs (4.1.0) and torch (2.14.1, CUDA build from PyPI since the CPU index is blocked) installed, but the htdemucs weights download from dl.fbaipublicfiles.com is refused by the sandbox proxy (403 on the tunnel), as is huggingface.co directly. So there are no stems. The analysts work from the mixed reference, its cut windows, and the app's solo renders (which are exact stems of the recreation). If the owner can provide separated stems of the original, or the weights file, the per-stem comparison becomes possible; otherwise the inventory rests on mixed-signal analysis, which the transcripts must say.
