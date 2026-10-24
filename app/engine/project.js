/* Havantechno app engine - project.js
 * Global `Project`: song files. Contract: app/CONTRACT.md, "Project (A1)".
 *
 *   var json = Project.serialize(doc);  var doc = Project.parse(json);
 *   Project.save(doc, {shell, name}).then(function (r) { r.name, r.path });   // Electron dialog or a web download
 *   Project.open({shell}).then(function (doc) { if (doc) host.loadDocument(doc); });
 *   Project.autosave(doc);  var doc = Project.restore();                       // null when there is nothing saved
 *
 * File format (version 1): {app: 'havantechno', format: 1, savedAt: ISO time, song: <SongDoc v1>}.
 * parse() also accepts a bare SongDoc (v: 1). `shell` defaults to window.HavantechnoShell (Electron only);
 * the shell hooks are called only when present: saveFile, openFile, appDataPath, writeAppData, readAppData.
 * Audio files (sampler) are referenced in doc.audio, never embedded: Project.open({shell, host}) loads the song into the
 * Host and waits while it reloads them (HavantechnoShell.readFile for paths, fetch for URLs); unreadable ones are missing.
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var APP = 'havantechno', FORMAT = 1, EXT = '.havantechno.json', AUTOSAVE_KEY = 'havantechno.autosave', AUTOSAVE_FILE = 'autosave' + EXT;

  function SD() { if (!root.SongDoc) throw new Error('Project: SongDoc is not loaded'); return root.SongDoc; }
  function shellOf(o) { return (o && o.shell) || root.HavantechnoShell || null; }
  function fn(obj, name) { return obj && typeof obj[name] === 'function'; }
  function warn(msg) { try { if (typeof console !== 'undefined' && console.warn) console.warn('[Project] ' + msg); } catch (e) {} }
  function storage() { try { return root.localStorage || null; } catch (e) { return null; } }
  function asPromise(v) { return (v && typeof v.then === 'function') ? v : Promise.resolve(v); }

  // 'Guidance edit / v2' -> 'Guidance edit - v2' (safe on every file system)
  function fileName(name) {
    var base = String(name || 'song').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' - ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'song';
    return /\.havantechno\.json$/i.test(base) ? base : base + EXT;
  }

  function serialize(doc) {
    var song = JSON.parse(SD().save(doc));
    return JSON.stringify({ app: APP, format: FORMAT, savedAt: new Date().toISOString(), song: song });
  }
  function parse(json) {
    var o = typeof json === 'string' ? JSON.parse(json) : json;
    if (!o || typeof o !== 'object') throw new Error('Project: not a Havantechno project');
    if (o.app === APP) {
      if (o.format !== FORMAT) throw new Error('Project: unsupported file format ' + o.format);
      if (!o.song) throw new Error('Project: the file has no song');
      return SD().load(o.song);
    }
    if (o.v === 1 && o.tracks) return SD().load(o);
    throw new Error('Project: not a Havantechno project');
  }
  // when the file was saved, or null
  function savedAt(json) {
    try { var o = typeof json === 'string' ? JSON.parse(json) : json; return (o && o.app === APP && o.savedAt) || null; } catch (e) { return null; }
  }

  // ------------------------------------------------------------ save
  function webDownload(name, text) {
    var d = root.document;
    if (!d || !d.createElement || typeof root.Blob !== 'function' || !root.URL || !root.URL.createObjectURL) throw new Error('Project: no way to save here');
    var url = root.URL.createObjectURL(new root.Blob([text], { type: 'application/json' }));
    var a = d.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    (d.body || d.documentElement).appendChild(a);
    a.click();
    setTimeout(function () { try { a.parentNode.removeChild(a); root.URL.revokeObjectURL(url); } catch (e) {} }, 1000);
  }
  function save(doc, o) {
    o = o || {};
    return new Promise(function (resolve, reject) {
      try {
        var text = serialize(doc), name = fileName(o.name || (doc && doc.name)), sh = shellOf(o);
        if (fn(sh, 'saveFile')) {
          asPromise(sh.saveFile({ name: name, text: text, filters: [{ name: 'Havantechno project', extensions: ['json'] }] })).then(function (r) {
            if (r == null || r === false || (r && r.canceled)) { resolve(null); return; }      // the user cancelled the dialog
            var path = typeof r === 'string' ? r : (r.path || r.filePath || null);
            resolve({ name: path ? String(path).split(/[\\/]/).pop() : name, path: path });
          }, reject);
          return;
        }
        webDownload(name, text);
        resolve({ name: name });
      } catch (e) { reject(e); }
    });
  }

  // ------------------------------------------------------------ open
  function readFile(file) {
    if (file && typeof file.text === 'function') return file.text();
    return new Promise(function (resolve, reject) {
      var r = new root.FileReader();
      r.onload = function () { resolve(String(r.result)); };
      r.onerror = function () { reject(r.error || new Error('Project: could not read the file')); };
      r.readAsText(file);
    });
  }
  // a hidden <input type=file>: resolves the file's text (asText) or the File itself, null on cancel
  function webPick(accept, asFile) {
    return new Promise(function (resolve, reject) {
      var d = root.document;
      if (!d || !d.createElement) { reject(new Error('Project: no way to open a file here')); return; }
      var input = d.createElement('input'), done = false;
      input.type = 'file'; input.accept = accept || '.json,application/json'; input.style.display = 'none';
      function finish(v, err) {
        if (done) return; done = true;
        try { if (input.parentNode) input.parentNode.removeChild(input); } catch (e) {}
        if (err) reject(err); else resolve(v);
      }
      input.addEventListener('change', function () {
        var f = input.files && input.files[0];
        if (!f) { finish(null); return; }
        if (asFile) { finish(f); return; }
        readFile(f).then(function (text) { finish(text); }, function (e) { finish(null, e); });
      });
      input.addEventListener('cancel', function () { finish(null); });
      (d.body || d.documentElement).appendChild(input);
      input.click();
    });
  }
  function dirName(p) { p = String(p || ''); var i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\')); return i > 0 ? p.slice(0, i) : null; }
  // o.host: also load the song into that Host and wait for its audio files (sampler): sources the shell can read
  // (Electron, paths relative to the project's folder too) or URLs are reloaded, the rest are listed as missing
  // (host.audio() entries with missing: true; their tracks play silent). Resolves the document either way.
  function open(o) {
    o = o || {};
    var sh = shellOf(o), p, filePath = null;
    if (fn(sh, 'openFile')) {
      p = asPromise(sh.openFile({ filters: [{ name: 'Havantechno project', extensions: ['json'] }] })).then(function (r) {
        if (r == null || r === false || (r && r.canceled)) return null;
        if (typeof r === 'string') return r;
        if (typeof r.text === 'string') { filePath = r.path || null; return r.text; }
        throw new Error('Project: the shell returned no file contents');
      });
    } else {
      try { p = webPick(); } catch (e) { return Promise.reject(e); }
    }
    return p.then(function (text) {
      if (text == null) return null;
      var doc = parse(text);
      var host = o.host;
      if (!host || typeof host.loadDocument !== 'function') return doc;
      host.loadDocument(doc, { shell: sh, base: dirName(filePath) });
      var ready = typeof host.audioReady === 'function' ? host.audioReady() : Promise.resolve(null);
      return ready.then(function () { return host.document(); }, function () { return host.document(); });
    });
  }

  // pick one audio file (a sampler's sample, or re-adding a missing one): the web gives a File, Electron the shell's
  // {name, path, bytes} (a path that reloads with the project). host.loadAudio and host.addSampler take either.
  var AUDIO_EXT = ['wav', 'wave', 'mp3', 'ogg', 'oga', 'opus', 'flac', 'm4a', 'aac', 'aif', 'aiff', 'webm'];
  function pickAudio(o) {
    o = o || {};
    var sh = shellOf(o);
    if (fn(sh, 'openFile')) {
      return asPromise(sh.openFile({ binary: true, title: o.title, filters: [{ name: 'Audio', extensions: AUDIO_EXT }] })).then(function (r) {
        return (r == null || r === false || (r && r.canceled)) ? null : r;
      });
    }
    try { return webPick('audio/*,' + AUDIO_EXT.map(function (e) { return '.' + e; }).join(','), true); } catch (e) { return Promise.reject(e); }
  }

  // ------------------------------------------------------------ autosave
  // Synchronous to localStorage (web and Electron alike, so restore() can be synchronous); in Electron also mirrored
  // to the app-data folder when the shell offers writeAppData(fileName, text).
  function autosave(doc, o) {
    var text;
    try { text = serialize(doc); } catch (e) { warn('autosave: ' + (e && e.message)); return false; }
    var ok = false, ls = storage();
    if (ls) { try { ls.setItem(AUTOSAVE_KEY, text); ok = true; } catch (e) { warn('autosave: localStorage refused (' + (e && e.name) + ')'); } }
    var sh = shellOf(o);
    if (fn(sh, 'writeAppData')) { try { var r = sh.writeAppData(AUTOSAVE_FILE, text); if (r && r.catch) r.catch(function () {}); ok = true; } catch (e) {} }
    return ok;
  }
  function restore() {
    var ls = storage(), text = null;
    if (ls) { try { text = ls.getItem(AUTOSAVE_KEY); } catch (e) { text = null; } }
    if (!text) return null;
    try { return parse(text); } catch (e) { warn('restore: ' + (e && e.message)); return null; }
  }
  // Electron: read the app-data copy (resolves null when there is none or no shell); falls back to restore()
  function restoreAsync(o) {
    var sh = shellOf(o);
    if (!fn(sh, 'readAppData')) return Promise.resolve(restore());
    return asPromise(sh.readAppData(AUTOSAVE_FILE)).then(function (text) {
      if (!text) return restore();
      try { return parse(text); } catch (e) { return restore(); }
    }, function () { return restore(); });
  }
  function clearAutosave(o) {
    var ls = storage(); if (ls) { try { ls.removeItem(AUTOSAVE_KEY); } catch (e) {} }
    var sh = shellOf(o); if (fn(sh, 'writeAppData')) { try { var r = sh.writeAppData(AUTOSAVE_FILE, ''); if (r && r.catch) r.catch(function () {}); } catch (e) {} }
  }
  // the folder the shell keeps app data in (Electron), or null
  function appDataPath(o) {
    var sh = shellOf(o);
    if (!fn(sh, 'appDataPath')) return Promise.resolve(null);
    try { return asPromise(sh.appDataPath()).then(function (p) { return p || null; }, function () { return null; }); } catch (e) { return Promise.resolve(null); }
  }

  root.Project = { serialize: serialize, parse: parse, savedAt: savedAt, save: save, open: open, pickAudio: pickAudio, autosave: autosave, restore: restore,
                   restoreAsync: restoreAsync, clearAutosave: clearAutosave, appDataPath: appDataPath, fileName: fileName,
                   EXT: EXT, AUTOSAVE_KEY: AUTOSAVE_KEY, FORMAT: FORMAT };
})();
