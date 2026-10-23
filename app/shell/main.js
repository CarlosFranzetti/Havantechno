/* Havantechno Electron main process.
 * - Serves app/ through the standard, secure custom scheme havantechno://app/ (stable origin, so
 *   localStorage persists and device child windows are same-origin with the main window).
 *   Set HAVANTECHNO_URL=http://localhost:8000/app/index.html to load the dev server instead.
 * - One main BrowserWindow. Device windows are real child windows (parent set), opened with
 *   window.open from the main window so that window.opener.HavantechnoBridge works (see app/ui/app.js).
 * - IPC: openFile, saveFile, appDataPath, readAppData, writeAppData, openDeviceWindow,
 *   closeDeviceWindow, setDeviceWindowsVisible. Bounds of the main window and of each device window
 *   are remembered in <userData>/window-state.json. */
'use strict';
var electron = require('electron');
var path = require('path');
var fs = require('fs');

var app = electron.app, BrowserWindow = electron.BrowserWindow, ipcMain = electron.ipcMain;
var dialog = electron.dialog, protocol = electron.protocol, screen = electron.screen, Menu = electron.Menu;

var SCHEME = 'havantechno';
var APP_DIR = path.resolve(__dirname, '..');
var DEV_URL = process.env.HAVANTECHNO_URL || '';
var MAIN_URL = DEV_URL || (SCHEME + '://app/index.html');

var MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.woff2': 'font/woff2', '.wasm': 'application/wasm'
};

protocol.registerSchemesAsPrivileged([{
  scheme: SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true }
}]);

var mainWin = null;
var deviceWins = {};          // device id -> BrowserWindow
var devicesHidden = false;
var state = { main: null, devices: {} };
var saveTimer = null;

// ------------------------------------------------------------------ remembered bounds
function statePath() { return path.join(app.getPath('userData'), 'window-state.json'); }
function loadState() {
  try {
    var s = JSON.parse(fs.readFileSync(statePath(), 'utf8'));
    if (s && typeof s === 'object') {
      state.main = s.main || null;
      state.devices = (s.devices && typeof s.devices === 'object') ? s.devices : {};
    }
  } catch (e) { /* first run */ }
}
function saveStateSoon() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(function () {
    saveTimer = null;
    try { fs.mkdirSync(app.getPath('userData'), { recursive: true }); fs.writeFileSync(statePath(), JSON.stringify(state)); }
    catch (e) { /* ignore */ }
  }, 400);
}
function validBounds(b) {
  return b && isFinite(b.x) && isFinite(b.y) && isFinite(b.width) && isFinite(b.height) && b.width >= 120 && b.height >= 80;
}
// Keep a remembered window on a display that still exists.
function clampBounds(b) {
  if (!validBounds(b)) return null;
  try {
    var d = screen.getDisplayMatching(b).workArea;
    var w = Math.min(b.width, d.width), h = Math.min(b.height, d.height);
    var x = Math.min(Math.max(b.x, d.x), d.x + d.width - w);
    var y = Math.min(Math.max(b.y, d.y), d.y + d.height - h);
    return { x: x, y: y, width: w, height: h };
  } catch (e) { return null; }
}
function track(win, store, key) {
  win._hvKey = key;                                   // mutable: a retargeted window changes its device id
  function remember() {
    if (win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
    var b = win.getBounds();
    if (store === 'main') state.main = { x: b.x, y: b.y, width: b.width, height: b.height, maximized: win.isMaximized() };
    else state.devices[win._hvKey] = { x: b.x, y: b.y, width: b.width, height: b.height };
    saveStateSoon();
  }
  win.on('resize', remember);
  win.on('move', remember);
  win.on('close', remember);
}

// ------------------------------------------------------------------ custom scheme
function registerAppProtocol() {
  protocol.handle(SCHEME, function (request) {
    try {
      var u = new URL(request.url);
      var rel = decodeURIComponent(u.pathname);
      if (rel === '/' || rel === '') rel = '/index.html';
      var file = path.normalize(path.join(APP_DIR, rel));
      if (file !== APP_DIR && file.indexOf(APP_DIR + path.sep) !== 0) return new Response('Forbidden', { status: 403 });
      if (file.indexOf(path.sep + 'node_modules' + path.sep) >= 0) return new Response('Forbidden', { status: 403 });
      var data = fs.readFileSync(file);
      return new Response(data, {
        status: 200,
        headers: {
          'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Resource-Policy': 'same-origin'
        }
      });
    } catch (e) {
      return new Response('Not found', { status: 404 });
    }
  });
}

// ------------------------------------------------------------------ windows
function sameOrigin(url) {
  try { return new URL(url).origin === new URL(MAIN_URL).origin; } catch (e) { return false; }
}
function deviceIdFromUrl(url) {
  try { var id = new URL(url).searchParams.get('device'); return id || null; } catch (e) { return null; }
}
function deviceUrl(id) {
  var u = new URL(MAIN_URL);
  u.searchParams.set('device', id);
  return u.toString();
}
function webPrefs() {
  return { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false };
}

function createMainWindow() {
  var b = clampBounds(state.main);
  mainWin = new BrowserWindow({
    x: b ? b.x : undefined, y: b ? b.y : undefined,
    width: b ? b.width : 1440, height: b ? b.height : 900, minWidth: 900, minHeight: 600,
    backgroundColor: '#111114', title: 'Havantechno', autoHideMenuBar: true,
    webPreferences: webPrefs()
  });
  if (state.main && state.main.maximized) mainWin.maximize();
  track(mainWin, 'main');

  var wc = mainWin.webContents;
  // Only the main window may open windows, and only same-origin device windows.
  wc.setWindowOpenHandler(function (details) {
    var id = deviceIdFromUrl(details.url);
    if (!id || !sameOrigin(details.url)) return { action: 'deny' };
    var nb = clampBounds(state.devices[id]);
    var opts = {
      parent: mainWin, title: 'Havantechno', backgroundColor: '#111114', autoHideMenuBar: true,
      minimizable: false, show: true, webPreferences: webPrefs()
    };
    if (nb) { opts.x = nb.x; opts.y = nb.y; opts.width = nb.width; opts.height = nb.height; }
    else { opts.width = 560; opts.height = 420; }
    return { action: 'allow', overrideBrowserWindowOptions: opts };
  });
  wc.on('did-create-window', function (win, details) {
    var id = deviceIdFromUrl(details.url);
    if (!id) { win.destroy(); return; }
    deviceWins[id] = win;
    track(win, 'device', id);
    win.webContents.setWindowOpenHandler(function () { return { action: 'deny' }; });
    win.webContents.on('will-navigate', function (ev, url) { if (!sameOrigin(url)) ev.preventDefault(); });
    if (devicesHidden) win.hide();
    win.on('closed', function () {
      var cur = win._hvKey || id;
      if (deviceWins[cur] === win) delete deviceWins[cur];
      if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('shell:deviceClosed', cur);
    });
  });
  wc.on('will-navigate', function (ev, url) { if (!sameOrigin(url)) ev.preventDefault(); });

  mainWin.loadURL(MAIN_URL);
  mainWin.on('closed', function () {
    mainWin = null;
    Object.keys(deviceWins).forEach(function (k) { try { deviceWins[k].destroy(); } catch (e) {} });
    deviceWins = {};
  });
}

function buildMenu() {
  // No Undo/Redo roles, so Cmd/Ctrl+Z reaches the page (the app has its own undo). Same for Cmd/Ctrl+S, O.
  var isMac = process.platform === 'darwin';
  var tpl = [];
  if (isMac) tpl.push({ label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] });
  tpl.push({ label: 'Edit', submenu: [{ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] });
  tpl.push({ label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { role: 'togglefullscreen' }] });
  tpl.push({ label: 'Window', submenu: [{ role: 'minimize' }, { role: 'zoom' }] });
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}

// ------------------------------------------------------------------ IPC
function fromMain(e) { return mainWin && !mainWin.isDestroyed() && e.sender === mainWin.webContents; }
function parentFor(e) { return BrowserWindow.fromWebContents(e.sender) || mainWin; }
function cleanName(n) { return String(n || 'untitled').replace(/[\\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 120); }
function dialogFilters(f) {
  if (!Array.isArray(f)) return undefined;
  var out = [];
  f.forEach(function (x) { if (x && typeof x.name === 'string' && Array.isArray(x.extensions)) out.push({ name: x.name, extensions: x.extensions.map(String) }); });
  return out.length ? out : undefined;
}
function toBuffer(data) {
  if (typeof data === 'string') return Buffer.from(data, 'utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  if (data && data.type === 'Buffer' && Array.isArray(data.data)) return Buffer.from(data.data);
  throw new Error('saveFile: data must be a string, ArrayBuffer or typed array');
}
function appDataFile(name) {
  var n = String(name || '');
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(n) || n.charAt(0) === '.') throw new Error('bad app-data name');
  return path.join(app.getPath('userData'), n);
}

function registerIpc() {
  // openFile({filters, binary}) -> {name, path, text} | {name, path, bytes} | null
  ipcMain.handle('shell:openFile', async function (e, opts) {
    opts = opts || {};
    var r = await dialog.showOpenDialog(parentFor(e), { properties: ['openFile'], filters: dialogFilters(opts.filters), title: opts.title });
    if (r.canceled || !r.filePaths.length) return null;
    var p = r.filePaths[0];
    var buf = await fs.promises.readFile(p);
    var out = { name: path.basename(p), path: p };
    if (opts.binary) out.bytes = new Uint8Array(buf); else out.text = buf.toString('utf8');
    return out;
  });
  // saveFile({name, text|data, filters}) -> {name, path} | null   (string | ArrayBuffer | typed array)
  ipcMain.handle('shell:saveFile', async function (e, opts) {
    opts = opts || {};
    var buf = toBuffer(opts.data != null ? opts.data : opts.text);   // Project.save sends {name, text, filters}
    var r = await dialog.showSaveDialog(parentFor(e), { defaultPath: cleanName(opts.name), filters: dialogFilters(opts.filters), title: opts.title });
    if (r.canceled || !r.filePath) return null;
    await fs.promises.writeFile(r.filePath, buf);
    return { name: path.basename(r.filePath), path: r.filePath };
  });
  // readFile(path, {base}) -> Uint8Array | null. For audio files a song's `audio` map points at. Only the main
  // window may call it, only audio extensions are read, at most 1 GiB. A relative path resolves against opts.base
  // (a folder). Missing, unreadable or refused files give null, so the caller can list the sample as missing.
  ipcMain.handle('shell:readFile', async function (e, p, opts) {
    if (!fromMain(e)) return null;
    try {
      p = String(p || '');
      if (!p || p.length > 4096 || p.indexOf('\0') >= 0) return null;
      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(p)) return null;                    // URLs are the page's business
      var base = opts && typeof opts.base === 'string' && path.isAbsolute(opts.base) ? opts.base : null;
      var full = path.isAbsolute(p) ? p : (base ? path.resolve(base, p) : null);
      if (!full) return null;
      if (!/\.(wav|wave|mp3|ogg|oga|opus|flac|m4a|aac|aif|aiff|webm)$/i.test(full)) return null;
      var st = await fs.promises.stat(full);
      if (!st.isFile() || st.size > 1024 * 1024 * 1024) return null;
      var buf = await fs.promises.readFile(full);
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    } catch (err) { return null; }
  });
  ipcMain.handle('shell:appDataPath', function () { return app.getPath('userData'); });
  // Small named files in the app-data folder (autosave, preferences).
  ipcMain.handle('shell:readAppData', async function (e, name) {
    try { return await fs.promises.readFile(appDataFile(name), 'utf8'); } catch (err) { return null; }
  });
  ipcMain.handle('shell:writeAppData', async function (e, name, text) {
    var f = appDataFile(name);
    await fs.promises.mkdir(path.dirname(f), { recursive: true });
    await fs.promises.writeFile(f, String(text), 'utf8');
    return true;
  });

  ipcMain.handle('shell:openDeviceWindow', async function (e, id) {
    if (!fromMain(e)) return false;
    id = String(id || '');
    if (!id || id.length > 200) return false;
    var ex = deviceWins[id];
    if (ex && !ex.isDestroyed()) { devicesHidden = false; ex.show(); ex.focus(); return true; }
    // window.open from the main world keeps window.opener, which the bridge needs.
    var js = 'void window.open(' + JSON.stringify(deviceUrl(id)) + ',' + JSON.stringify('hv-device-' + id) + ')';
    await mainWin.webContents.executeJavaScript(js, true);
    return true;
  });
  // retargetDeviceWindow(newId): the calling child window now shows another device (Link: Single follows the
  // selection). Re-key it so openDeviceWindow(oldId) no longer finds it and its bounds are saved under the new id.
  ipcMain.handle('shell:retargetDeviceWindow', function (e, newId) {
    var win = BrowserWindow.fromWebContents(e.sender);
    newId = String(newId || '');
    if (!win || !newId || newId.length > 200) return false;
    var oldId = null;
    Object.keys(deviceWins).forEach(function (k) { if (deviceWins[k] === win) oldId = k; });
    if (oldId === null) return false;
    if (oldId === newId) return true;
    if (deviceWins[newId] && deviceWins[newId] !== win && !deviceWins[newId].isDestroyed()) return false;
    delete deviceWins[oldId];
    deviceWins[newId] = win;
    win._hvKey = newId;
    var b = win.getBounds();
    state.devices[newId] = { x: b.x, y: b.y, width: b.width, height: b.height };
    saveStateSoon();
    return true;
  });
  ipcMain.handle('shell:closeDeviceWindow', function (e, id) {
    if (!fromMain(e)) return false;
    var w = deviceWins[String(id)];
    if (w && !w.isDestroyed()) { w.close(); return true; }
    return false;
  });
  ipcMain.handle('shell:setDeviceWindowsVisible', function (e, visible) {
    if (!fromMain(e)) return false;
    devicesHidden = !visible;
    Object.keys(deviceWins).forEach(function (k) {
      var w = deviceWins[k];
      if (w.isDestroyed()) return;
      if (visible) w.showInactive(); else w.hide();
    });
    return true;
  });
  // arrangeDeviceWindows('tile'|'cascade'): lay the child windows out on the main window's display.
  ipcMain.handle('shell:arrangeDeviceWindows', function (e, mode) {
    if (!fromMain(e)) return false;
    var list = Object.keys(deviceWins).map(function (k) { return deviceWins[k]; }).filter(function (w) { return !w.isDestroyed(); });
    if (!list.length) return true;
    var wa = screen.getDisplayMatching(mainWin.getBounds()).workArea, gap = 8, n = list.length;
    if (mode === 'tile') {
      var cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
      var cw = Math.floor((wa.width - gap * (cols + 1)) / cols), ch = Math.floor((wa.height - gap * (rows + 1)) / rows);
      list.forEach(function (w, i) {
        w.setBounds({ x: wa.x + gap + (i % cols) * (cw + gap), y: wa.y + gap + Math.floor(i / cols) * (ch + gap), width: cw, height: ch });
      });
    } else {
      list.forEach(function (w, i) {
        var b = w.getBounds();
        w.setBounds({ x: wa.x + 40 + i * 32, y: wa.y + 40 + i * 32, width: b.width, height: b.height });
        w.moveTop();
      });
    }
    return true;
  });
  ipcMain.handle('shell:listDeviceWindows', function () { return Object.keys(deviceWins); });
}

// ------------------------------------------------------------------ lifecycle
var gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', function () {
    if (mainWin) { if (mainWin.isMinimized()) mainWin.restore(); mainWin.focus(); }
  });
  app.whenReady().then(function () {
    loadState();
    if (!DEV_URL) registerAppProtocol();
    registerIpc();
    buildMenu();
    createMainWindow();
    app.on('activate', function () { if (!BrowserWindow.getAllWindows().length) createMainWindow(); });
  });
  app.on('window-all-closed', function () { if (process.platform !== 'darwin') app.quit(); });
}
