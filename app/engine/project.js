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
 * Sampler programs (doc.programs) reload with their region samples; Project.missing(host) lists what is still missing.
 * Project.importTrack({file, stems, shell, host, onProgress}) makes a project from an audio file (Dubplate Crew).
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

  // pick several files or a whole folder (A4: "Sampler track from folder...", "Import SFZ..."). o: {shell, directory,
  // multiple, accept}. The web resolves [File] (folder picks carry webkitRelativePath); Electron resolves the shell's
  // [{name, path, bytes, relativePath}] through HavantechnoShell.openFiles({directory, multiple, filters, binary}) when
  // A6 provides it, else openFile({multiple, directory, ...}) if that returns an array, else one file. null on cancel.
  function pickFiles(o) {
    o = o || {};
    var sh = shellOf(o), acc = o.accept || null;
    var exts = acc ? acc.split(',').map(function (x) { return x.trim().replace(/^\./, ''); }).filter(function (x) { return x && x.indexOf('/') < 0; }) : null;
    var filters = exts && exts.length ? [{ name: 'Files', extensions: exts }] : undefined;
    function norm(r) {
      if (r == null || r === false || (r && r.canceled)) return null;
      if (Object.prototype.toString.call(r) === '[object Array]') return r.length ? r : null;
      if (r.files && r.files.length) return r.files;
      return [r];
    }
    if (fn(sh, 'openFiles')) return asPromise(sh.openFiles({ directory: !!o.directory, multiple: o.multiple !== false, filters: filters, binary: true })).then(norm);
    if (fn(sh, 'openFile')) return asPromise(sh.openFile({ directory: !!o.directory, multiple: o.multiple !== false, filters: filters, binary: true })).then(norm);
    return new Promise(function (resolve, reject) {
      var d = root.document;
      if (!d || !d.createElement) { reject(new Error('Project: no way to pick files here')); return; }
      var input = d.createElement('input'), done = false;
      input.type = 'file'; input.style.display = 'none';
      if (o.multiple !== false) input.multiple = true;
      if (o.directory) { input.webkitdirectory = true; try { input.setAttribute && input.setAttribute('webkitdirectory', ''); } catch (e) {} }
      if (acc) input.accept = acc;
      function finish(v) { if (done) return; done = true; try { if (input.parentNode) input.parentNode.removeChild(input); } catch (e) {} resolve(v); }
      input.addEventListener('change', function () {
        var fl = input.files, out = [];
        for (var i = 0; fl && i < fl.length; i++) out.push(fl[i]);
        finish(out.length ? out : null);
      });
      input.addEventListener('cancel', function () { finish(null); });
      (d.body || d.documentElement).appendChild(input);
      input.click();
    });
  }
  // pick an .sfz (or a folder holding one) and import it into the host with its samples and #include files
  function importProgram(o) {
    o = o || {};
    var host = o.host;
    if (!host || typeof host.importProgram !== 'function') return Promise.reject(new Error('Project.importProgram: a host is required'));
    var sh = shellOf(o);
    var pick = o.files ? Promise.resolve(o.files) : (fn(sh, 'openFile') && !o.directory
      ? asPromise(sh.openFile({ filters: [{ name: 'SFZ', extensions: ['sfz'] }] })).then(function (r) { return (r == null || r === false || r.canceled) ? null : [r]; })
      : pickFiles({ shell: sh, directory: o.directory !== false, multiple: true }));
    return pick.then(function (list) {
      if (!list || !list.length) return null;
      // the root .sfz: the least deep one (included files usually sit in subfolders), then by name
      var sfz = null, best = null;
      for (var i = 0; i < list.length; i++) {
        var rp = String(list[i].webkitRelativePath || list[i].relativePath || list[i].path || list[i].name);
        if (!/\.sfz$/i.test(rp)) continue;
        var depth = rp.split(/[\\/]/).length;
        if (!sfz || depth < best.d || (depth === best.d && rp < best.p)) { sfz = list[i]; best = { d: depth, p: rp }; }
      }
      if (!sfz) throw new Error('Project.importProgram: no .sfz file in the selection');
      var io = { shell: sh, id: o.id, base: o.base };
      if (list.length > 1) io.files = list;
      return host.importProgram(sfz, io);
    });
  }

  // what a loaded project could not find (batch 1): audio entries without a buffer, with who uses them, and the programs
  // with silent regions. Programs reload with the project through their region samples, which are doc.audio entries.
  function missing(host) {
    var out = { audio: [], programs: [] };
    if (!host) return out;
    try {
      (host.audio ? host.audio() : []).forEach(function (a) { if (a.missing) out.audio.push({ id: a.id, name: a.name, src: a.src, usedBy: a.usedBy }); });
      (host.programs ? host.programs() : []).forEach(function (p) { if (p.missing) out.programs.push({ id: p.id, name: p.name, missing: p.missing, regions: p.regions }); });
    } catch (e) {}
    return out;
  }

  // ------------------------------------------------------------ import a track (Dubplate Crew, D1)
  // o: {file, stems, shell, host, onProgress, name, model, matchLevel, maxSeconds (the classifier's excerpt, default 30)}. file: as host.loadAudio takes (a File, the
  // shell's {name, path, bytes}, bytes, a URL). stems: [{name, source}] or [File] (names read from the file names:
  // drums, bass, other, vocals). Without stems, Electron's HavantechnoShell.separate(path) splits the file when the
  // shell has it; else the analysis reads the mix in bands. Then: a new document, the file as its reference (offset =
  // the first downbeat), host.analyze, a level match over at most 32 bars (o.matchLevel !== false and the context can
  // render), and Project.save at once. Resolves {doc, saved: {name, path?} | null (cancelled), analysis, level}.
  var STEM_RE = /(drums|bass|other|vocals)/i;
  function stemName(src, i) {
    var n = String((src && (src.name || src.path)) || '').split(/[\\/]/).pop().toLowerCase(), m = n.match(STEM_RE);
    return m ? m[1].toLowerCase() : (n.replace(/\.[a-z0-9]{1,5}$/, '').replace(/[^a-z0-9_-]+/g, '_') || 'stem' + (i + 1));
  }
  function importTrack(o) {
    o = o || {};
    var host = o.host, sh = shellOf(o), file = o.file;
    if (!host || typeof host.analyze !== 'function' || typeof host.loadAudio !== 'function') return Promise.reject(new Error('Project.importTrack: a host is required'));
    if (!file) return Promise.reject(new Error('Project.importTrack: no file'));
    function prog(stage, done, total, note) { if (typeof o.onProgress === 'function') { try { o.onProgress({ stage: stage, done: done, total: total, note: note }); } catch (e) {} } }
    var fname = String(file.name || (typeof file === 'string' ? file : '') || file.path || 'import').split(/[\\/]/).pop();
    var name = o.name || fname.replace(/\.[A-Za-z0-9]{1,5}$/, '') || 'import';
    var doc = { v: 1, name: name, bpm: 120, swing: 0, key: null, progression: [], sends: {}, tracks: [], sections: [{ name: 'import', bars: 1, play: {} }] };
    var refId = null, separator = null, unverified = [], analysis = null, level = null;
    try { host.loadDocument(doc); } catch (e) { return Promise.reject(e); }
    prog('decode', 0, 1, fname);
    return host.loadAudio(file, { analyze: false }).then(function (id) {
      refId = id;
      prog('decode', 1, 1, fname);
      if (o.stems && o.stems.length) {
        return o.stems.map(function (s, i) {
          if (s && s.source != null) return { name: String(s.name || stemName(s.source, i)).toLowerCase(), source: s.source };
          return { name: stemName(s, i), source: s };
        });
      }
      var path = file && typeof file === 'object' ? (file.path || (sh && typeof sh.pathForFile === 'function' ? (function () { try { return sh.pathForFile(file); } catch (e) { return null; } })() : null)) : null;
      if (!fn(sh, 'separate') || !path) {
        if (fn(sh, 'separate') && !path) unverified.push('separation needs the file\'s path: the analysis read the mix');
        return null;
      }
      prog('separate', 0, 1, 'separating ' + fname);
      var off = null;
      if (fn(sh, 'onSeparateProgress')) { try { off = sh.onSeparateProgress(function (p) { p = p || {}; prog('separate', p.done == null ? 0 : p.done, p.total == null ? 1 : p.total, p.note || p.message || ''); }); } catch (e) { off = null; } }
      return asPromise(sh.separate(path, { model: o.model })).then(function (r) {
        if (typeof off === 'function') { try { off(); } catch (e) {} }
        var list = (r && r.stems) || [];
        separator = { model: (r && r.model) || o.model || null, stems: list.map(function (s) { return s.name; }), log: String((r && r.log) || '').slice(-4000) };
        prog('separate', 1, 1, list.length + ' stems');
        return Promise.all(list.map(function (s, i) {
          if (!fn(sh, 'readFile')) return null;
          return asPromise(sh.readFile(s.path, {})).then(function (bytes) {
            return bytes ? { name: String(s.name || stemName(s, i)).toLowerCase(), source: { name: String(s.path).split(/[\\/]/).pop(), path: s.path, bytes: bytes } } : null;
          }, function () { return null; });
        })).then(function (st) { return st.filter(Boolean); });
      }, function (e) {
        if (typeof off === 'function') { try { off(); } catch (x) {} }
        separator = { error: String((e && e.message) || e) };
        unverified.push('separation failed (' + separator.error + '): the analysis read the mix');
        return null;
      });
    }).then(function (stems) {
      var list = stems && stems.length ? stems : [{ name: 'mix', id: refId }];
      var b = host.buffer(refId);
      return host.analyze(list, { onProgress: o.onProgress, separator: separator, unverified: unverified, maxSeconds: o.maxSeconds,
                                 source: { name: fname, duration: b ? b.duration : null, sampleRate: b ? b.sampleRate : null } });
    }).then(function (an) {
      analysis = an;
      return host.setReference(refId, { gain: 1, offset: an.bpm.offset });
    }).then(function () {
      if (o.matchLevel === false || typeof host.matchLevel !== 'function') return null;
      prog('build', 0, 1, 'level match');
      return host.matchLevel({ maxBars: 32 }).then(function (r) { level = r; prog('build', 1, 1, r ? 'level match ' + r.gainDb + ' dB' : 'level match not available'); }, function (e) { warn('importTrack: level match failed: ' + (e && e.message)); });
    }).then(function () {
      prog('save', 0, 1, name);
      return save(host.document(), { shell: sh, name: name });
    }).then(function (saved) {
      prog('save', 1, 1, saved ? saved.name : 'not saved');
      return { doc: host.document(), saved: saved, analysis: analysis, level: level };
    });
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

  root.Project = { serialize: serialize, parse: parse, savedAt: savedAt, save: save, open: open, pickAudio: pickAudio, pickFiles: pickFiles, importProgram: importProgram, importTrack: importTrack, missing: missing, autosave: autosave, restore: restore,
                   restoreAsync: restoreAsync, clearAutosave: clearAutosave, appDataPath: appDataPath, fileName: fileName,
                   EXT: EXT, AUTOSAVE_KEY: AUTOSAVE_KEY, FORMAT: FORMAT };
})();
