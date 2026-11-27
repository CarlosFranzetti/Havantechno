/* electron-builder configuration (V3, Pressing Crew). Read automatically by `electron-builder` (npm run dist, dist:mac,
 * dist:win, dist:linux). A JS file rather than package.json's "build" key because the macOS signing choice depends on
 * the environment.
 *
 * Signing is never configured here with a secret. electron-builder reads the standard variables itself:
 *   macOS    CSC_LINK, CSC_KEY_PASSWORD (a Developer ID Application certificate); notarisation when APPLE_ID,
 *            APPLE_APP_SPECIFIC_PASSWORD and APPLE_TEAM_ID are set (or the APPLE_API_KEY trio)
 *   Windows  WIN_CSC_LINK, WIN_CSC_KEY_PASSWORD (or CSC_LINK, CSC_KEY_PASSWORD)
 * With no certificate in the environment the build is unsigned, with one exception: an arm64 Mac app must carry at
 * least an ad-hoc signature to launch at all, so without CSC_LINK or CSC_NAME the macOS build asks for the ad-hoc
 * identity "-" and leaves the hardened runtime off (ad-hoc signing and the hardened runtime's library validation do
 * not mix; electron-builder warns about it). The ad-hoc signature needs macOS's codesign, so only a Mac (or the
 * macOS runner) produces it. */
'use strict';
var hasCert = !!(process.env.CSC_LINK || process.env.CSC_NAME);

module.exports = {
  appId: 'io.github.carlosfranzetti.havantechno',
  productName: 'Havantechno',
  copyright: 'Copyright (c) Havantechno contributors. AGPL-3.0-or-later.',
  asar: true,
  publish: null,
  directories: { buildResources: 'build', output: 'dist' },
  files: ['package.json', 'index.html', 'engine/**/*', 'ui/**/*', 'analysis/**/*', 'solo/**/*', 'shell/**/*', '!engine/selfcheck.js'],
  extraResources: [
    { from: '../tools/separate.py', to: 'tools/separate.py' },
    { from: '../LICENSE', to: 'LICENSE.txt' },
    { from: '../THIRD_PARTY.md', to: 'THIRD_PARTY.md' }
  ],
  artifactName: 'Havantechno-${version}-${os}-${arch}.${ext}',
  mac: {
    category: 'public.app-category.music',
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }, { target: 'zip', arch: ['arm64', 'x64'] }],
    identity: hasCert ? undefined : '-',
    hardenedRuntime: hasCert,
    notarize: hasCert ? undefined : false,
    gatekeeperAssess: false
  },
  win: { target: [{ target: 'nsis', arch: ['x64'] }] },
  nsis: { oneClick: false, perMachine: false, allowToChangeInstallationDirectory: true },
  linux: {
    category: 'AudioVideo;Audio;Midi',
    maintainer: 'Havantechno contributors <noreply@example.invalid>',
    synopsis: 'A remix DAW',
    target: [{ target: 'AppImage', arch: ['x64'] }, { target: 'deb', arch: ['x64'] }]
  }
};
