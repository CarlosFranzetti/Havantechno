# Log A6 (box crew, batch 1 and 2)

- `app/index.html`: `engine/programs.js` loads before `synths.js`, `engine/drums.js` after it. `app/CONTRACT.md` load-order line updated to match (that one line only).
- Shell: `HavantechnoShell.readText(path, {base}) -> Promise<string|null>` (`main.js` `shell:readText`, `preload.js`). Same rules as `readFile`: main window only, absolute path or relative to `base`, no URLs, extensions `.sfz .txt .json`, cap 4 MiB, null when missing or refused.
- `tools/serve.js`: `.sfz` served as `text/plain; charset=utf-8`.
- Verified: `node --check` on main.js, preload.js, serve.js, app.js, windows.js (exit 0). Electron under Xvfb: absolute `.sfz` read, relative with `base` read, `.bin` null, missing null. `node tools/browser-check.js` exit 0, `RESULT: PASS (26 checks)` (loads programs.js and drums.js with no console errors).
- Not verified: the `.sfz` MIME header over HTTP (one-line map change, not curl-checked against a real `.sfz` file); `Project.importProgram` calling `readText` (A1's side).
