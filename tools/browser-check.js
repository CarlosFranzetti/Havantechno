#!/usr/bin/env node
// tools/browser-check.js: headless Chromium smoke test of the web app (app/index.html).
//
// Serves the repo root on a random port (COOP/COEP headers), opens /app/index.html, then:
//   load -> missing globals -> click Start audio -> Play -> transport runs -> Step View (Tab)
//   -> open one device window (double-click its title) -> toggle one step -> Save
//   -> page errors and console errors -> report.
//
// Usage:   node tools/browser-check.js
// Env:     PLAYWRIGHT_PATH   default /opt/node22/lib/node_modules/playwright
//          CHROMIUM_PATH     default /opt/pw-browsers/chromium
//          BROWSER_CHECK_ROOT  serve another folder with the same app/index.html layout (for testing the check)
// Exit:    0 every check passed; 1 a failed check or a page/console error; 2 the harness could not run.
//
// Selectors and globals are the CONTRACT defaults. Each check prints the selector or global it tried,
// so a missing piece is named in the report and the owner (CONTRACT file table) can act on it.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.env.BROWSER_CHECK_ROOT || path.join(__dirname, '..'));
const APP_URL_PATH = '/app/index.html';
const PLAYWRIGHT_PATH = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

// Globals the app needs, with the file and the owner from CONTRACT.md's file table.
const GLOBALS = [
  ['Kit', 'app/engine/core.js', 'engine lead (existing)'],
  ['Synths', 'app/engine/synths.js', 'A7 (existing)'],
  ['Processors', 'app/engine/processors.js', 'A8 (existing)'],
  ['SongDoc', 'app/engine/songdoc.js', 'engine (existing)'],
  ['Sequencer', 'app/engine/sequencer.js', 'engine (existing)'],
  ['Song', 'app/engine/song.js', 'A7 (existing)'],
  ['Host', 'app/engine/host.js', 'A1'],
  ['Project', 'app/engine/project.js', 'A1'],
  ['Widgets', 'app/ui/widgets.js', 'A2'],
  ['Faces', 'app/ui/faces.js', 'A3'],
  ['SystemEditor', 'app/ui/system-editor.js', 'A4'],
  ['StepView', 'app/ui/step-view.js', 'A5'],
  ['Windows', 'app/ui/windows.js', 'A6'],
];

// Owner of each app file (CONTRACT.md file table), used to annotate HTTP 404s.
const FILE_OWNERS = {
  'ui/theme.css': 'A2', 'ui/widgets.js': 'A2', 'ui/faces.js': 'A3', 'ui/facedefs.js': 'A3',
  'ui/system-editor.js': 'A4', 'ui/step-view.js': 'A5', 'ui/windows.js': 'A6', 'ui/app.js': 'A6',
  'engine/host.js': 'A1', 'engine/project.js': 'A1', 'engine/selfcheck.js': 'A1',
  'engine/synths.js': 'A7', 'engine/song.js': 'A7', 'engine/processors.js': 'A8',
};

// Selector candidates, in order. The first visible match wins.
const SEL = {
  start: ['#start-audio', '#start-overlay button', '#start', '[data-action="start"]', '.start-overlay button',
    'button:text-is("Start audio")'],
  play: ['#frame [data-action="play"]', '#frame button[aria-label="Play"]', '#frame button:text-is("Play")',
    '#play', '[data-action="play"]', '[data-transport="play"]', 'button[aria-label="Play"]',
    'button[title="Play"]', 'button:text-is("Play")'],
  stepSwitch: ['[data-view-switch="step"]', '[data-view="step-switch"]', 'button:text-is("Step View")',
    'button:text-is("Step")'],
  stepMark: ['[data-view="step"]', '[data-view="step-view"]', '.step-grid', '[data-role="step-grid"]',
    '.step-view'],
  // A3's face title bar (hv-head) is used in both views; A4's System Editor title is the fallback.
  deviceTitle: ['.hv-head', '.se-dtitle[title^="Double-click"]', '[data-device-title]', '[data-role="device-title"]',
    '.device-title', '.dev-title', '.device-row .title'],
  stepCell: ['.step-grid button.hv-step', 'button.hv-step[aria-pressed]', '.step-grid [role="checkbox"]',
    '.step-grid [data-step]', '[data-step]', '.step-grid button', '.step-cell', '.steps button'],
  save: ['#save', '[data-action="save"]', 'button[aria-label="Save"]', 'button:text-is("Save")'],
};

// The Host instance: app.js must expose it on one of these (see app/README.md, "Checks").
const HOST_EXPR = '(window.HavantechnoHost || (window.HavantechnoApp && window.HavantechnoApp.host) || window.host || null)';

const report = [];
let checkCount = 0;
let failCount = 0;
const pageErrors = [];
const consoleErrors = [];
const consoleWarnings = [];
const badResponses = [];

function pass(name, detail) {
  checkCount++;
  report.push('[PASS] ' + name + (detail ? ' - ' + detail : ''));
}
function fail(name, detail) {
  checkCount++;
  failCount++;
  report.push('[FAIL] ' + name + (detail ? ' - ' + detail : ''));
}
function note(line) {
  report.push('       ' + line);
}

function serve(root) {
  return http.createServer((req, res) => {
    const headers = {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cache-Control': 'no-store',
    };
    let urlPath;
    try {
      urlPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    } catch (e) {
      res.writeHead(400, headers);
      res.end('bad url');
      return;
    }
    if (urlPath === '/favicon.ico') {
      res.writeHead(204, headers); // no icon in the repo; avoid a console 404 on every run
      res.end();
      return;
    }
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const file = path.join(root, urlPath);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, headers);
      res.end('not found');
      return;
    }
    headers['Content-Type'] = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, headers);
    res.end(fs.readFileSync(file));
  });
}

// First visible element among the candidate selectors, or null.
async function firstVisible(page, selectors) {
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    try {
      if ((await loc.count()) > 0 && (await loc.isVisible())) return { sel, loc };
    } catch (e) {
      // an invalid or unsupported selector on this page: try the next candidate
    }
  }
  return null;
}

async function localStorageSnapshot(page) {
  return page.evaluate(() => {
    const out = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        out[k] = localStorage.getItem(k);
      }
    } catch (e) {
      out.__error = String(e);
    }
    return out;
  }).catch(() => ({}));
}

async function hostState(page) {
  return page.evaluate(`(() => {
    const h = ${HOST_EXPR};
    if (!h || !h.transport) return null;
    return {
      playing: !!h.transport.playing,
      pos: typeof h.transport.pos === 'function' ? JSON.stringify(h.transport.pos()) : null,
      doc: typeof h.document === 'function' ? JSON.stringify(h.document()) : null,
      devices: typeof h.devices === 'function' ? h.devices().length : null,
    };
  })()`).catch((e) => ({ error: String(e) }));
}

async function run() {
  let playwright;
  try {
    playwright = require(PLAYWRIGHT_PATH);
  } catch (e) {
    console.error('browser-check: cannot load Playwright from ' + PLAYWRIGHT_PATH + ' (set PLAYWRIGHT_PATH)');
    console.error(String(e));
    return 2;
  }
  if (!fs.existsSync(path.join(ROOT, APP_URL_PATH))) {
    fail('app present', 'missing ' + APP_URL_PATH + ' (owner A6)');
  }

  const server = serve(ROOT);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const url = 'http://127.0.0.1:' + port + APP_URL_PATH;
  report.push('browser-check: ' + url);

  let browser;
  try {
    browser = await playwright.chromium.launch({
      executablePath: CHROMIUM_PATH,
      headless: true,
      args: ['--autoplay-policy=no-user-gesture-required'],
    });
  } catch (e) {
    server.close();
    console.error('browser-check: Chromium did not launch from ' + CHROMIUM_PATH);
    console.error(String(e).split('\n').slice(0, 5).join('\n'));
    return 2;
  }

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.on('pageerror', (err) => pageErrors.push(String(err && err.stack ? err.stack.split('\n')[0] : err)));
    page.on('console', (msg) => {
      const where = msg.location() && msg.location().url ? ' (' + msg.location().url + ')' : '';
      if (msg.type() === 'error') consoleErrors.push(msg.text() + where);
      else if (msg.type() === 'warning') consoleWarnings.push(msg.text() + where);
    });
    page.on('response', (r) => {
      if (r.status() >= 400 && r.url().startsWith('http://127.0.0.1:' + port)) {
        const rel = r.url().replace('http://127.0.0.1:' + port + '/app/', '');
        const owner = FILE_OWNERS[rel] ? ' (owner ' + FILE_OWNERS[rel] + ')' : '';
        badResponses.push(r.status() + ' ' + r.url().replace('http://127.0.0.1:' + port, '') + owner);
      }
    });

    // 1. Load and globals
    try {
      const resp = await page.goto(url, { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(800);
      if (resp && resp.status() >= 400) fail('page loads', 'HTTP ' + resp.status() + ' for ' + APP_URL_PATH);
      else pass('page loads', url);
    } catch (e) {
      fail('page loads', String(e).split('\n')[0]);
    }

    const present = await page.evaluate((names) => names.map((n) => [n, typeof window[n] !== 'undefined']),
      GLOBALS.map((g) => g[0])).catch(() => []);
    for (const [name, ok] of present) {
      const entry = GLOBALS.find((g) => g[0] === name);
      if (ok) pass('global ' + name, entry[1]);
      else fail('global ' + name + ' missing', 'defined by ' + entry[1] + ' (owner ' + entry[2] + '); not loaded or not published by app/index.html');
    }
    const hostOk = await page.evaluate(`!!${HOST_EXPR}`).catch(() => false);
    if (hostOk) pass('host handle exposed', 'window.HavantechnoHost or window.HavantechnoApp.host');
    else fail('host handle not exposed', 'app.js (A6) should set window.HavantechnoApp = {host} or window.HavantechnoHost; transport and step checks are weaker without it');

    // 2. Start audio
    const start = await firstVisible(page, SEL.start);
    if (!start) {
      fail('start overlay button', 'not found; tried ' + SEL.start.join(', ') + ' (owner A6, ui/app.js)');
    } else {
      try {
        await start.loc.click({ timeout: 5000 });
        await page.waitForTimeout(500);
        pass('start audio clicked', start.sel);
      } catch (e) {
        fail('start audio clicked', String(e).split('\n')[0]);
      }
    }

    // 3. Play
    const hostBeforePlay = await hostState(page);
    if (hostBeforePlay && hostBeforePlay.playing) {
      note('transport already playing after Start audio; Play not clicked');
    } else {
      const play = await firstVisible(page, SEL.play);
      if (!play) {
        fail('play button', 'not found; tried ' + SEL.play.join(', ') + ' (owner A6, ui/app.js or system-editor.js)');
      } else {
        try {
          await play.loc.click({ timeout: 5000 });
          pass('play clicked', play.sel);
        } catch (e) {
          fail('play clicked', String(e).split('\n')[0]);
        }
      }
    }

    // 4. Transport runs for 2 s
    await page.waitForTimeout(2000);
    const hostPlaying = await hostState(page);
    const viewChildren = await page.evaluate(() => {
      const v = document.querySelector('#view');
      return v ? v.children.length : -1;
    });
    if (viewChildren > 0) pass('#view has children', viewChildren + ' top-level elements');
    else fail('#view has children', viewChildren === -1 ? 'no #view element (owner A6, app.js)' : 'empty #view (no view mounted)');

    if (hostPlaying && !hostPlaying.error) {
      if (hostPlaying.playing) {
        const pos1 = hostPlaying.pos;
        await page.waitForTimeout(700);
        const pos2 = (await hostState(page)).pos;
        if (pos1 !== pos2) pass('transport playing', 'pos ' + pos1 + ' -> ' + pos2);
        else fail('transport playing', 'transport.playing is true but pos() did not advance (' + pos1 + ')');
      } else {
        fail('transport playing', 'host.transport.playing is false 2 s after Play');
      }
      note('devices: ' + hostPlaying.devices + ' (host.devices().length)');
    } else {
      fail('transport playing', 'cannot read host.transport (' + (hostPlaying && hostPlaying.error ? hostPlaying.error : 'no host handle') + ')');
    }

    // Helpers for the view switch
    async function inStepView() {
      return !!(await firstVisible(page, SEL.stepMark));
    }
    async function goStepView() {
      if (await inStepView()) return true;
      await page.keyboard.press('Tab');
      await page.waitForTimeout(400);
      if (await inStepView()) return true;
      const sw = await firstVisible(page, SEL.stepSwitch);
      if (sw) {
        await sw.loc.click();
        await page.waitForTimeout(400);
      }
      return inStepView();
    }

    // 5. Step View
    const stepOk = await goStepView();
    if (stepOk) pass('switch to Step View', 'Tab key (or view switch button); marker ' + (await firstVisible(page, SEL.stepMark)).sel);
    else fail('switch to Step View', 'no Step View marker after Tab or the view switch; tried ' + SEL.stepMark.join(', ') + ' (owners A5, A6)');

    // 6. Open one device window by double-clicking its title
    const winsBefore = await page.evaluate(() => {
      const w = document.querySelector('#windows');
      return w ? w.children.length : -1;
    });
    if (winsBefore === -1) {
      fail('#windows element', 'missing (owner A6, app.js or windows.js)');
    }
    let title = await firstVisible(page, SEL.deviceTitle);
    if (!title && (await inStepView())) {
      // try the System Editor, where device titles open windows, then return to the Step View
      await page.keyboard.press('Tab');
      await page.waitForTimeout(400);
      title = await firstVisible(page, SEL.deviceTitle);
      await goStepView();
    }
    if (!title) {
      fail('device title', 'not found; tried ' + SEL.deviceTitle.join(', ') + ' (owners A4, A5, A6)');
    } else {
      try {
        // count Windows.open calls, so the check sees the call as well as the panel
        await page.evaluate(() => {
          window.__bcOpenCalls = 0;
          const W = window.Windows;
          if (W && typeof W.open === 'function' && !W.__bcWrapped) {
            const orig = W.open;
            W.open = function () { window.__bcOpenCalls++; return orig.apply(this, arguments); };
            W.__bcWrapped = true;
          }
        }).catch(() => {});
        await title.loc.dblclick({ timeout: 5000 });
        await page.waitForTimeout(600);
        const winsAfter = await page.evaluate(() => {
          const w = document.querySelector('#windows');
          return w ? w.children.length : -1;
        });
        const openCalls = await page.evaluate(() => window.__bcOpenCalls || 0).catch(() => 0);
        const panel = winsAfter > Math.max(winsBefore, 0);
        if (panel && openCalls > 0) pass('device window opens on double-click', title.sel + ', Windows.open called ' + openCalls + 'x, #windows children ' + winsBefore + ' -> ' + winsAfter);
        else if (panel) pass('device window opens on double-click', title.sel + ', #windows children ' + winsBefore + ' -> ' + winsAfter + ' (Windows.open not spied: Windows.open is not a writable property)');
        else fail('device window opens on double-click', 'double-click on ' + title.sel + ' did not reach Windows.open (' + openCalls + ' calls) or put a panel in #windows (' + winsBefore + ' -> ' + winsAfter + ')');
      } catch (e) {
        fail('device window opens on double-click', String(e).split('\n')[0]);
      }
    }

    // 7. Toggle one step in the Step View grid
    await goStepView();
    const cell = await firstVisible(page, SEL.stepCell);
    if (!cell) {
      fail('step cell', 'no step cell in the Step View; tried ' + SEL.stepCell.join(', ') + ' (owner A5)');
    } else {
      const before = await hostState(page);
      const gridBefore = await page.evaluate(() => {
        const g = document.querySelector('.step-grid') || document.querySelector('#view');
        return g ? g.innerHTML.length + ':' + g.innerHTML.slice(0, 4000).replace(/\s+/g, '') : '';
      });
      try {
        await cell.loc.click({ timeout: 5000 });
        await page.waitForTimeout(400);
        const after = await hostState(page);
        const gridAfter = await page.evaluate(() => {
          const g = document.querySelector('.step-grid') || document.querySelector('#view');
          return g ? g.innerHTML.length + ':' + g.innerHTML.slice(0, 4000).replace(/\s+/g, '') : '';
        });
        if (before && after && before.doc && after.doc) {
          if (before.doc !== after.doc) pass('step toggled', cell.sel + ' changed host.document()');
          else fail('step toggled', 'host.document() unchanged after clicking ' + cell.sel + ' (owner A5 or A4 write path)');
        } else if (gridBefore !== gridAfter) {
          pass('step toggled', cell.sel + ' changed the grid DOM (no host handle to compare the document)');
        } else {
          fail('step toggled', 'no change after clicking ' + cell.sel);
        }
      } catch (e) {
        fail('step toggled', String(e).split('\n')[0]);
      }
    }

    // 8. Save: a download or an autosave written to localStorage
    const lsBefore = await localStorageSnapshot(page);
    const downloadPromise = page.waitForEvent('download', { timeout: 4000 }).catch(() => null);
    const save = await firstVisible(page, SEL.save);
    if (save) {
      await save.loc.click({ timeout: 5000 }).catch(() => {});
    } else {
      note('no Save button found (tried ' + SEL.save.join(', ') + '); using Ctrl+S');
      await page.keyboard.press('Control+s');
    }
    const download = await downloadPromise;
    await page.waitForTimeout(2500); // autosave is debounced 1.5 s after edits
    const lsAfter = await localStorageSnapshot(page);
    const changedKeys = Object.keys(lsAfter).filter((k) => lsAfter[k] !== lsBefore[k]);
    const appKeys = changedKeys.filter((k) => /havantechno/.test(lsAfter[k] || ''));
    let saved = false;
    if (download) {
      const dlPath = await download.path().catch(() => null);
      const dlText = dlPath ? fs.readFileSync(dlPath, 'utf8') : '';
      const name = download.suggestedFilename();
      if (/havantechno/.test(dlText) && dlText.length > 0) {
        saved = true;
        pass('save downloads a song file', name + ' (' + dlText.length + ' bytes, contains "havantechno")');
      } else {
        fail('save downloads a song file', name + ' downloaded but does not contain "havantechno" (Project.serialize adds app:"havantechno")');
      }
    }
    if (appKeys.length) {
      saved = true;
      pass('autosave written', 'localStorage key ' + appKeys.join(', ') + ' contains "havantechno"');
    }
    if (!saved) {
      fail('save', (save ? 'clicked ' + save.sel : 'Ctrl+S') + ': no download and no localStorage autosave containing "havantechno" (changed keys: ' + (changedKeys.join(', ') || 'none') + ')');
    }

    // 9. Errors
    if (pageErrors.length) fail('no page errors', pageErrors.length + ' error(s)');
    else pass('no page errors');
    if (consoleErrors.length) fail('no console errors', consoleErrors.length + ' error(s)');
    else pass('no console errors');
    if (badResponses.length) fail('all app files load', badResponses.join('; '));
    else pass('all app files load', 'no HTTP 4xx/5xx from the local server');
    for (const e of pageErrors) note('page error: ' + e);
    for (const e of consoleErrors) note('console error: ' + e);
    for (const r of badResponses) note('HTTP error: ' + r);
    if (consoleWarnings.length) note('console warnings (not failing): ' + consoleWarnings.length);

    await context.close();
  } catch (e) {
    fail('harness', String(e).split('\n')[0]);
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }
  return failCount || pageErrors.length || consoleErrors.length ? 1 : 0;
}

run().then(
  (code) => {
    console.log(report.join('\n'));
    console.log('');
    console.log(code === 0
      ? 'RESULT: PASS (' + checkCount + ' checks)'
      : 'RESULT: FAIL (' + failCount + ' failed check(s), ' + pageErrors.length + ' page error(s), ' + consoleErrors.length + ' console error(s))');
    process.exit(code);
  },
  (e) => {
    console.error('browser-check: harness error', e);
    process.exit(2);
  }
);
