# Log A6 (box crew, batch 1 and 2)

- `app/index.html`: `engine/programs.js` loads before `synths.js`, `engine/drums.js` after it. `app/CONTRACT.md` load-order line updated to match (that one line only).
- Shell: `HavantechnoShell.readText(path, {base}) -> Promise<string|null>` (`main.js` `shell:readText`, `preload.js`). Same rules as `readFile`: main window only, absolute path or relative to `base`, no URLs, extensions `.sfz .txt .json`, cap 4 MiB, null when missing or refused.
- `tools/serve.js`: `.sfz` served as `text/plain; charset=utf-8`.
- Verified: `node --check` on main.js, preload.js, serve.js, app.js, windows.js (exit 0). Electron under Xvfb: absolute `.sfz` read, relative with `base` read, `.bin` null, missing null. `node tools/browser-check.js` exit 0, `RESULT: PASS (26 checks)` (loads programs.js and drums.js with no console errors).
- Not verified: the `.sfz` MIME header over HTTP (one-line map change, not curl-checked against a real `.sfz` file); `Project.importProgram` calling `readText` (A1's side).

## openFiles (A1's request)

- `HavantechnoShell.openFiles({directory, multiple, filters, binary, title}) -> Promise<[{name, path, relativePath, bytes?}] | null>` in `main.js` (`shell:openFiles`) and `preload.js`. `directory` uses an openDirectory dialog and walks the folder recursively (depth 8, 2000 files, no dotfiles, no symlinks) for the audio extensions `readFile` accepts plus `.sfz`; otherwise an openFile dialog, with multiSelections when `multiple`. `relativePath` is relative to the chosen folder with `/` separators (the file name for plain picks). `bytes` (Uint8Array) only when `binary`; 1 GiB per file, 2 GiB in total, larger files skipped. Main window only; cancel gives null.
- Verified under Xvfb (Electron, dialog stubbed in the main process because a native dialog cannot be driven): a temp folder with `a.wav`, `sub/b.wav`, `k.sfz`, `n.txt` and a hidden `.hid/c.wav` returned a.wav, k.sfz, sub/b.wav (txt and hidden skipped) with bytes 8864/22/8864 when binary and no `bytes` key otherwise; dialog properties were `openDirectory` and `openFile,multiSelections`; cancel returned null. `node --check` main.js and preload.js exit 0; `node tools/browser-check.js` exit 0, `RESULT: PASS (26 checks)`.
- Not verified: the real native dialogs, and `Project.pickFiles` calling it.
