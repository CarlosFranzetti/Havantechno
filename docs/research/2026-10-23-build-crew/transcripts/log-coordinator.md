# Coordinator log (Fable)

## Wave 1

- 2026-10-23 23:14:41 UTC: A7 handed back (synths.js, song.js, tools/synths-check.js). Verified: node --check, app/engine/selfcheck.js 193 OK, tools/synths-check.js 36 OK. Committed 19ce4ef.
- 2026-10-23 23:14:41 UTC: A4 handed back (system-editor.js, tools/system-editor-check.js). node --check OK. Committed 584a534 citing "43 checks", which was A4's run against a fake Windows. **Correction:** by the time I ran the check, A6's real windows.js existed and the check fails at "Windows.open called on head double-click" (exit 1). This is an interface mismatch between A4's double-click hook and A6's Windows.open, for wave 2: **To A4 and A6:** agree on how a device title double-click reaches Windows.open(deviceId, host) and make tools/system-editor-check.js pass against the real windows.js.
- Rule for the rest of wave 1: a check that prints a Node stack trace has failed even if a pipe hides the exit code; I will check exit codes directly from now on.
