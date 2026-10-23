/* Exposes window.HavantechnoShell to the page (present only in Electron). Sandboxed preload: electron APIs only. */
'use strict';
var electron = require('electron');
var contextBridge = electron.contextBridge, ipcRenderer = electron.ipcRenderer;

var closedHandlers = [];
ipcRenderer.on('shell:deviceClosed', function (e, id) {
  for (var i = 0; i < closedHandlers.length; i++) { try { closedHandlers[i](id); } catch (err) {} }
});

contextBridge.exposeInMainWorld('HavantechnoShell', {
  isElectron: true,
  platform: process.platform,
  openFile: function (opts) { return ipcRenderer.invoke('shell:openFile', opts || {}); },
  // saveFile({name, text|data, filters}) or saveFile(name, data, filters)
  saveFile: function (a, b, c) {
    var opts = (a && typeof a === 'object' && !(a instanceof ArrayBuffer) && !ArrayBuffer.isView(a)) ? a : { name: a, data: b, filters: c };
    return ipcRenderer.invoke('shell:saveFile', opts);
  },
  appDataPath: function () { return ipcRenderer.invoke('shell:appDataPath'); },
  readAppData: function (name) { return ipcRenderer.invoke('shell:readAppData', name); },
  writeAppData: function (name, text) { return ipcRenderer.invoke('shell:writeAppData', name, text); },
  openDeviceWindow: function (id) { return ipcRenderer.invoke('shell:openDeviceWindow', id); },
  closeDeviceWindow: function (id) { return ipcRenderer.invoke('shell:closeDeviceWindow', id); },
  setDeviceWindowsVisible: function (v) { return ipcRenderer.invoke('shell:setDeviceWindowsVisible', !!v); },
  arrangeDeviceWindows: function (mode) { return ipcRenderer.invoke('shell:arrangeDeviceWindows', mode === 'tile' ? 'tile' : 'cascade'); },
  listDeviceWindows: function () { return ipcRenderer.invoke('shell:listDeviceWindows'); },
  onDeviceWindowClosed: function (fn) { if (typeof fn === 'function') closedHandlers.push(fn); }
});
