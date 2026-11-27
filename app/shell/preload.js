/* Exposes window.HavantechnoShell to the page (present only in Electron). Sandboxed preload: electron APIs only. */
'use strict';
var electron = require('electron');
var contextBridge = electron.contextBridge, ipcRenderer = electron.ipcRenderer, webUtils = electron.webUtils;

var closedHandlers = [];
ipcRenderer.on('shell:deviceClosed', function (e, id) {
  for (var i = 0; i < closedHandlers.length; i++) { try { closedHandlers[i](id); } catch (err) {} }
});

var separateHandlers = [];
ipcRenderer.on('shell:separateProgress', function (e, ev) {
  for (var i = 0; i < separateHandlers.length; i++) { try { separateHandlers[i](ev); } catch (err) {} }
});
// main rejects with "[code] message"; Electron wraps it as "Error invoking remote method '...': Error: [code] message"
function separateError(err) {
  var m = /\[([a-z-]+)\]\s*([\s\S]*)$/.exec(String(err && err.message || err)), e = new Error(m ? m[2] : String(err && err.message || err));
  if (m) e.code = m[1];   // set for code in the preload; contextBridge delivers the page an Error with message only (checked under Electron 45), so the message must stand alone
  return e;
}

// file calls reject with "[code] message" too (shell/files.js); the page gets the message alone
function fileError(err) {
  var m = /\[([a-z-]+)\]\s*([\s\S]*)$/.exec(String(err && err.message || err));
  return new Error(m ? m[2] : String(err && err.message || err));
}
// joinPath(dir, name): string join with the platform's separator (a sandboxed preload has no path module). A ".." segment, NUL, an empty name
// and (on Windows) a drive letter in the name throw; a name is a file name or a relative path below dir, and a leading separator is dropped.
var IS_WIN = process.platform === 'win32';
function joinPath(dir, name) {
  dir = String(dir == null ? '' : dir); name = String(name == null ? '' : name);
  if (!dir) throw new Error('joinPath: the folder is empty.');
  if (dir.indexOf('\0') >= 0 || name.indexOf('\0') >= 0) throw new Error('joinPath: a path may not contain NUL.');
  var parts = name.split(/[\\/]+/).filter(function (x) { return x !== '' && x !== '.'; });
  if (!parts.length) throw new Error('joinPath: the name is empty.');
  if (parts.indexOf('..') >= 0) throw new Error('joinPath: the name may not contain "..".');
  if (IS_WIN ? /^[A-Za-z]:/.test(parts[0]) : false) throw new Error('joinPath: the name may not start with a drive letter.');
  var sep = IS_WIN ? '\\' : '/';
  var base = dir.replace(IS_WIN ? /[\\/]+$/ : /\/+$/, '');
  if (!base) base = sep;                                   // the root folder "/"
  else if (IS_WIN && /^[A-Za-z]:$/.test(base)) base += sep;  // "C:" -> "C:\"
  return (base.charAt(base.length - 1) === sep ? base : base + sep) + parts.join(sep);
}
var appVersionCache = null;

contextBridge.exposeInMainWorld('HavantechnoShell', {
  isElectron: true,
  platform: process.platform,
  openFile: function (opts) { return ipcRenderer.invoke('shell:openFile', opts || {}); },
  // saveFile({name, text|data, filters}) or saveFile(name, data, filters)
  saveFile: function (a, b, c) {
    var opts = (a && typeof a === 'object' && !(a instanceof ArrayBuffer) && !ArrayBuffer.isView(a)) ? a : { name: a, data: b, filters: c };
    return ipcRenderer.invoke('shell:saveFile', opts);
  },
  // readFile(path, {base}) -> Promise<ArrayBuffer | null> (audio files only; null when missing or refused)
  readFile: function (p, opts) {
    return ipcRenderer.invoke('shell:readFile', p, opts || {}).then(function (u) {
      if (!u) return null;
      return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength);
    });
  },
  // pathForFile(file) -> the file's path on disk, '' when unknown (Electron 32+ removed File.path). For dropped or picked samples.
  pathForFile: function (file) {
    try { return (webUtils && webUtils.getPathForFile) ? (webUtils.getPathForFile(file) || '') : ''; } catch (e) { return ''; }
  },
  // readText(path, {base}) -> Promise<string | null> (.sfz, .txt, .json only)
  readText: function (p, opts) { return ipcRenderer.invoke('shell:readText', p, opts || {}); },
  // openFiles({directory, multiple, filters, binary}) -> Promise<[{name, path, relativePath, bytes?}] | null>
  openFiles: function (opts) { return ipcRenderer.invoke('shell:openFiles', opts || {}); },
  // separate(path, {model: 'auto'|'mdx'|'htdemucs'}) -> Promise<{stems:[{name, path}], model, log, folder, cached?}>.
  // Rejects with an Error whose message is readable on its own (the page sees the message only; the code, kept here for tests, is python-missing, packages-missing, weights-missing,
  // weights-bad, ffmpeg-missing, bad-path, busy, cancelled or failed). One run at a time.
  separate: function (p, opts) {
    return ipcRenderer.invoke('shell:separate', p, opts && typeof opts === 'object' ? { model: opts.model } : {}).catch(function (err) { throw separateError(err); });
  },
  cancelSeparate: function () { return ipcRenderer.invoke('shell:cancelSeparate'); },
  // onSeparateProgress(fn) -> unsubscribe. fn({stage: 'prepare'|'download'|'separate'|'done', note, done?, total?, line?})
  onSeparateProgress: function (fn) {
    if (typeof fn !== 'function') return function () {};
    separateHandlers.push(fn);
    return function () { var i = separateHandlers.indexOf(fn); if (i >= 0) separateHandlers.splice(i, 1); };
  },
  // pickDirectory({title}) -> Promise<path | null>: a folder dialog. The folder is then writable for this run.
  pickDirectory: function (opts) {
    return ipcRenderer.invoke('shell:pickDirectory', opts && typeof opts === 'object' ? { title: opts.title } : {}).catch(function (err) { throw fileError(err); });
  },
  // writeFile(path, bytes) -> Promise<true>: bytes is an ArrayBuffer, a typed array or a string. Only inside a folder
  // chosen with pickDirectory during this run or the app-data folder; anything else rejects with a readable message.
  writeFile: function (p, bytes) {
    return ipcRenderer.invoke('shell:writeFile', p, bytes).catch(function (err) { throw fileError(err); });
  },
  // copyFile(src, dst) -> Promise<true>: src an existing audio or .sfz file, dst under the same rule as writeFile.
  copyFile: function (src, dst) {
    return ipcRenderer.invoke('shell:copyFile', src, dst).catch(function (err) { throw fileError(err); });
  },
  joinPath: joinPath,
  appVersion: function () {
    if (appVersionCache === null) { try { appVersionCache = String(ipcRenderer.sendSync('shell:appVersion') || ''); } catch (e) { appVersionCache = ''; } }
    return appVersionCache;
  },
  appDataPath: function () { return ipcRenderer.invoke('shell:appDataPath'); },
  readAppData: function (name) { return ipcRenderer.invoke('shell:readAppData', name); },
  writeAppData: function (name, text) { return ipcRenderer.invoke('shell:writeAppData', name, text); },
  openDeviceWindow: function (id) { return ipcRenderer.invoke('shell:openDeviceWindow', id); },
  retargetDeviceWindow: function (id) { return ipcRenderer.invoke('shell:retargetDeviceWindow', id); },
  closeDeviceWindow: function (id) { return ipcRenderer.invoke('shell:closeDeviceWindow', id); },
  setDeviceWindowsVisible: function (v) { return ipcRenderer.invoke('shell:setDeviceWindowsVisible', !!v); },
  arrangeDeviceWindows: function (mode) { return ipcRenderer.invoke('shell:arrangeDeviceWindows', mode === 'tile' ? 'tile' : 'cascade'); },
  listDeviceWindows: function () { return ipcRenderer.invoke('shell:listDeviceWindows'); },
  onDeviceWindowClosed: function (fn) { if (typeof fn === 'function') closedHandlers.push(fn); }
});
