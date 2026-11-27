# Building and installing Havantechno

Written by V3 (Pressing Crew), 27 November 2026 ET. Version 0.2.0.

Havantechno ships as an Electron app. The installers are unsigned unless the owner supplies signing identities (section 5). **What was run:** the Linux AppImage and deb were built and the AppImage was run in this repository's sandbox (section 7). **What was not run:** any macOS or Windows build, and the GitHub workflow. Statements about macOS and Windows behaviour are marked "from memory" where they were not read in the vendor's current documentation.

## 1. macOS on Apple silicon: installing and first launch of the unsigned dmg

The file is `Havantechno-0.2.0-mac-arm64.dmg` (Intel Macs: `...-mac-x64.dmg`; the `.zip` files hold the same app).

**Is the build signed at all?** Not with a developer certificate, but it is built to carry an ad-hoc signature, which an Apple-silicon Mac needs in order to run any code. How this was checked: in the pinned electron-builder (26.18.0) I read `app-builder-lib/out/mac/MacTargetHelper.js`. With no certificate and no `identity` setting it finds no identity and *skips signing* (a warning, unless `forceCodeSigning` is on). With `identity: "-"` it builds an ad-hoc identity and signs with it. So `app/electron-builder.config.js` sets `identity: "-"` whenever neither `CSC_LINK` nor `CSC_NAME` is in the environment, switches the hardened runtime and notarisation off in that case (electron-builder warns that ad-hoc signing and the hardened runtime's library validation do not mix), and leaves everything to electron-builder's normal certificate handling when a certificate is supplied. The signing itself needs Apple's `codesign`, which exists only on a Mac, so it has not been run: after the first workflow run, check on a Mac with `codesign -dv --verbose=2 /Applications/Havantechno.app` (it should print `Signature=adhoc`) and `codesign --verify --deep --strict /Applications/Havantechno.app`.

**Steps** (from memory, with the Sequoia route confirmed by two articles quoted in `docs/research/2026-11-26-pressing-crew/transcripts/R2-views-settings-distribution.md` section 5.1; not checked against Apple's page on a Mac):

1. Download the dmg in a browser. Browsers put a quarantine mark on the file; that mark is what makes macOS check the app.
2. Open the dmg and drag Havantechno into Applications.
3. Open Havantechno from Applications. macOS stops it. The window says it could not verify that the app is free of malware (Sequoia wording from memory: "“Havantechno” Not Opened"), with Done and Move to Trash. On some versions a damaged ad-hoc signature shows "“Havantechno” is damaged and can't be opened" instead; see step 7. Press **Done**, not Move to Trash.
4. Open **System Settings, Privacy & Security** and scroll to the **Security** section. It says Havantechno was blocked. Press **Open Anyway**.
5. Authenticate with your password or Touch ID, then press **Open** in the dialog that follows.
6. From then on the app opens like any other; macOS keeps the exception.
7. If the message says the app is damaged, or Open Anyway does not appear, remove the quarantine mark in Terminal and open the app again: `xattr -dr com.apple.quarantine /Applications/Havantechno.app`. A file fetched with `curl` carries no quarantine mark and needs none of this (from memory).
8. The old route of right-clicking the app and choosing Open no longer bypasses the block on recent macOS (a snippet in R2, not verified). Use steps 4 and 5.

The first time the page asks for audio device names, macOS may ask for microphone access. Havantechno only lists output devices by name and never records; the usage text in `Info.plist` says so. Allow it, or refuse and the device list shows no names.

## 2. Windows (x64): installing the unsigned installer

The file is `Havantechno-0.2.0-win-x64.exe` (NSIS, installs per user, lets you pick the folder).

From memory (R2 read only a snippet; not checked on Windows or against Microsoft's page): Windows SmartScreen shows "Windows protected your PC". Press **More info**, then **Run anyway**. An unsigned installer from a new publisher gets this every time. Windows 11 with Smart App Control switched on may refuse an unsigned installer with no Run anyway button; turning Smart App Control off is a Windows setting that cannot be undone, so the safe choice there is to wait for a signed build.

## 3. Linux (x64)

- **AppImage:** `chmod +x Havantechno-0.2.0-linux-x86_64.AppImage`, then run it. It needs FUSE 2 (on Ubuntu 22.04 and later: `sudo apt install libfuse2`, from memory). Without FUSE: `./Havantechno-0.2.0-linux-x86_64.AppImage --appimage-extract-and-run` (run here, section 7).
- **deb:** `sudo apt install ./Havantechno-0.2.0-linux-amd64.deb`. It installs to `/opt/Havantechno` with a menu entry and the `chrome-sandbox` helper set-uid.
- On Ubuntu 24.04 and later a policy that restricts unprivileged user namespaces can stop the AppImage's sandbox; the symptom is the window not opening and a sandbox error in the terminal. Workaround: add `--no-sandbox` (less safe), or use the deb, whose installer ships an AppArmor profile (from memory; not tried here).

## 4. Building locally

Needs Node 22.12 or later (22 is what the workflow uses) and, for the first build, network access to GitHub's release downloads (Electron, and electron-builder's helper tools, are fetched once and cached).

```
cd app
npm ci                  # exact versions from package-lock.json (electron 45.0.0, electron-builder 26.18.0)
npm run dist:linux      # AppImage and deb, x64        (build on Linux)
npm run dist:mac        # dmg and zip, arm64 and x64   (build on macOS)
npm run dist:win        # NSIS installer, x64          (build on Windows; Wine on Linux is untested)
npm run pack            # an unpacked app in dist/ only, quick check
```

Output goes to `app/dist/` (git-ignored, never commit it). Names: `Havantechno-<version>-<mac|win|linux>-<arch>.<ext>`. A Mac builds both macOS architectures (the Intel one on an Apple-silicon Mac works because Electron's x64 binary is downloaded, from memory; first run to confirm). `npm run icon` redraws `app/build/icon.png` (1024 px, original artwork, headless Chromium through Playwright); electron-builder derives the `.icns`, `.ico` and Linux sizes from it.

What goes into the app: `app/index.html`, `engine/`, `ui/`, `analysis/`, `solo/`, `shell/` and `package.json`, in `app.asar`, minus `engine/selfcheck.js`. Beside it, in the resources folder: `tools/separate.py` (the stem-separation script; Python reads it, so it must not sit inside the asar), `LICENSE.txt` and `THIRD_PARTY.md`. The shell finds `separate.py` at `tools/separate.py` beside `app/` when run from the repository and in `resources/tools/` when packaged (`app.isPackaged`).

The custom scheme `havantechno://app/` and the AudioWorklet module work from inside `app.asar`: Electron's patched `fs` reads the asar, so the scheme handler needed no change and nothing is unpacked. Verified on Linux (section 7). The same code path serves all platforms, but the macOS and Windows packages were not run.

## 5. The GitHub workflow

File: `.github/workflows/build.yml`. Triggers: **Run workflow** on the Actions tab (workflow_dispatch) and a pushed tag beginning `v`. It does not run on ordinary pushes.

Per OS (macos-latest, windows-latest, ubuntu-latest; `fail-fast` off so one failing OS does not hide the others): check out, Node 22, `npm ci` in `app/`, the Node checks, the installer build, upload as the workflow artifact `installers-<os>` (kept 14 days). The Node checks are `app/engine/selfcheck.js` and every `tools/*-check.js` except `browser-check.js`, `export-check.js` and `importer-check.js`, which start headless Chromium (run those locally). `drums-score.js` is not a `-check` and is not run (it exits 1 while its rows fail).

On a tag `vX.Y.Z` a last job downloads the three artifacts, writes `SHA256SUMS.txt` and creates a **draft** release named "Havantechno X.Y.Z" with the installers attached. A draft is visible only to people with write access to the repository; nothing is public until you press **Publish release** on the Releases page. The build stops if the tag does not equal `v` plus the `version` in `app/package.json`. Only that last job holds `contents: write`; the rest of the workflow has `contents: read`. Every action is pinned to a full commit SHA with its version in a comment: checkout v7.0.1, setup-node v7.1.0, upload-artifact v7.0.2, download-artifact v8.0.2 (SHAs read with `git ls-remote` on 27 November 2026; they are GitHub's own actions); the release is made with the `gh` CLI on the runner, so no other third-party action is used.

**Downloads:** the draft release's assets (after publishing: the Releases page), and for any run the "Artifacts" section at the bottom of the run's page.

**Status:** linted with actionlint 1.7.12 (no findings; shellcheck was not installed, so the shell blocks were not shell-linted) and parsed as YAML. It has **never run on real runners**. Likely first-run trouble: a Windows or macOS runner failing a Node check that has only run on Linux (`tools/shell-files-check.js` skips its symlink rows when the OS refuses symlinks; the other checks have not run on Windows), electron-builder's first download on each runner, and the macOS runner's x64 build. The first run should be a manual one (workflow_dispatch), not a tag.

Limits (read by R2): GitHub Releases allow 2 GiB per file and 1000 assets per release. The Linux installers built here are 126 MB (AppImage) and 101 MB (deb), about 6 % of the file limit; the macOS and Windows installers are expected to be of the same order and have not been built.

## 6. Signing, notarisation and updates

Unsigned is the default: with none of the variables below set, the build makes unsigned (macOS: ad-hoc signed) installers and says so in its log. Nothing is hard-coded; electron-builder reads standard environment variables, which the workflow passes from repository secrets and drops when empty.

| Platform | Needs | Variables / secrets |
|---|---|---|
| macOS | An Apple Developer Program membership (annual fee), a "Developer ID Application" certificate exported as `.p12`; notarisation with an app-specific password or an API key. An ad-hoc build cannot be notarised. | `CSC_LINK` (base64 `.p12` or file path), `CSC_KEY_PASSWORD`, then `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` (or `APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`) |
| Windows | A code-signing certificate that Windows trusts. Since June 2023 only extended-validation certificates (hardware-bound) or a cloud service such as Azure Artifact Signing remove SmartScreen warnings; ordinary certificates no longer do (READ by R2 in Electron's tutorial). | `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD` for a file certificate; a cloud service needs configuration in `electron-builder.config.js` (`win.azureSignOptions`), not just a secret |
| Linux | Nothing. | none |

With a certificate present, `electron-builder.config.js` turns the hardened runtime on and uses `app/build/entitlements.mac.plist` (JIT, unsigned executable memory, audio input). That file has not been tried on a Mac; a signed hardened build that opens but has no sound or no device list means an entitlement is missing. Hosting plug-ins (a later version) will need `com.apple.security.cs.disable-library-validation` as well. Prices were not read; R2 gives them from memory only.

**Auto-update is off and not configured** (`publish: null`; no update manifest is written, no `app-update.yml` is in the package, checked in the built tree). R2 reported that newer electron-builder schemas require an Ed25519 key for update manifests when publishing. In the pinned 26.18.0 there is no `updateManifest` option at all (searched its `scheme.json` and `out/`) and nothing publishes, so it does not apply; if auto-update is added later, look again at the then-current version. Electron's own auto-updater also needs a signed app on macOS.

## 7. What was run in the sandbox (27 November 2026)

- `npm install` of electron-builder 26.18.0 (exact), `electron-builder --linux AppImage deb --x64`: downloads from GitHub releases were allowed; no network refusal. Built: `Havantechno-0.2.0-linux-x86_64.AppImage` 126,120,538 bytes, `Havantechno-0.2.0-linux-amd64.deb` 101,406,592 bytes (control file read with `dpkg-deb -I`).
- The AppImage under Xvfb with `--appimage-extract-and-run --no-sandbox`: one window titled "Havantechno" at `havantechno://app/index.html`, cross-origin isolated, `classics-processor.js` fetched from inside the asar (status 200, correct type), no page or console errors. Start audio clicked, a `tb303` track added: its engine reports `worklet`, `Host.audition` returns true. The extracted AppImage also ran under Playwright's CDP attach (Playwright's own `_electron` launcher hung on the packaged binary; the cause was not chased).
- Shell calls in that run: `appVersion()` "0.2.0", `joinPath`, `writeFile` into the app-data folder true, and readable refusals for a relative path, a folder never chosen, a `..` path, and copying a non-audio file. **`pickDirectory` was not run**: it opens a native dialog that nothing can answer under Xvfb; the guard it feeds is covered by `tools/shell-files-check.js`.
- Permissions (see `app/shell/main.js`): only the app's own origin is granted `media` (audio only; a video request is refused), `speaker-selection`, `midi` and `midiSysex` (Electron 45 delivers even a plain `requestMIDIAccess()` as `midiSysex`, observed; without it MIDI was refused). Everything else, for every origin, is denied. In the sandbox `getUserMedia({audio})` got past the permission (then failed for lack of a device) and MIDI got past it (then failed with no ALSA); nothing was heard or measured on real hardware.

## 8. The version number

`app/package.json` `version` is the one source: the installer file names and `HavantechnoShell.appVersion()` come from it, and the workflow refuses a tag that differs. It is now **0.2.0** (was 0.1.0). To release: change `version` in `app/package.json`, run `npm install --package-lock-only` in `app/` so the lock file agrees, commit, then tag `v<version>` and push the tag (the owner's step).
