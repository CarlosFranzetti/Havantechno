/* File writing for the Electron shell (V3, Pressing Crew, 2026-11-27). Plain Node, no electron: main.js wires it to the
 * IPC channels, tools/shell-files-check.js tests it on a temporary folder.
 *
 * The page may write files only into folders the person chose in a folder dialog during this run (pickDirectory) and
 * into the app's data folder. Every path crosses the IPC boundary, so it is checked here:
 *   - a string, absolute, no NUL, no URL, no ".." segment, at most 4096 characters;
 *   - its parent folder exists and, once symbolic links are resolved, lies inside a granted folder (or is one);
 *   - the target itself is not a symbolic link and not a folder (a link inside a granted folder can point anywhere).
 * The write opens the file with O_NOFOLLOW where the platform has it, so a link planted after the check is refused too.
 * copyFile applies the same rule to the destination; the source must be an existing regular file of an audio or .sfz
 * type (the types readFile serves), so the page cannot use a copy to move other files into a folder it can then read.
 *
 * Errors are Error objects whose message starts with "[code] " (preload.js strips the prefix): bad-path, not-granted,
 * parent-missing, not-file, too-large, failed. */
'use strict';
var path = require('path');
var fs = require('fs');

var MAX_WRITE = 2 * 1024 * 1024 * 1024 - 1;
var SOURCE_EXT = /\.(wav|wave|mp3|ogg|oga|opus|flac|m4a|aac|aif|aiff|webm|sfz)$/i;

function fail(code, message) {
  var e = new Error('[' + code + '] ' + message);
  e.code = code;
  return e;
}

function toBuffer(data) {
  if (typeof data === 'string') return Buffer.from(data, 'utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  if (data && data.type === 'Buffer' && Array.isArray(data.data)) return Buffer.from(data.data);   // a Buffer after structured clone
  throw fail('bad-path', 'The data to write must be an ArrayBuffer, a typed array or a string.');
}

// The plain checks on a path string. Returns the normalised absolute path.
function checkPathString(p, what) {
  if (typeof p !== 'string' || !p) throw fail('bad-path', 'The ' + what + ' path is missing.');
  if (p.length > 4096 || p.indexOf('\0') >= 0) throw fail('bad-path', 'The ' + what + ' path is not valid.');
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(p)) throw fail('bad-path', 'The ' + what + ' must be a path on disk, not a URL.');
  if (!path.isAbsolute(p)) throw fail('bad-path', 'The ' + what + ' path must be absolute (it starts at the drive or the root folder): ' + p.slice(0, 120));
  if (p.split(/[\\/]+/).indexOf('..') >= 0) throw fail('bad-path', 'The ' + what + ' path may not contain "..": ' + p.slice(0, 120));
  return path.resolve(p);
}

function inside(child, root) {
  if (child === root) return true;
  var r = root.charAt(root.length - 1) === path.sep ? root : root + path.sep;
  return child.indexOf(r) === 0;
}

// createGuard({appData: () => folder, fsp?}) -> {grant, granted, checkTarget, writeFile, copyFile}
function createGuard(o) {
  o = o || {};
  var fsp = o.fsp || fs.promises;
  var roots = [];            // realpaths of the folders granted in dialogs during this run

  async function grant(dir) {
    var p = checkPathString(dir, 'folder');
    var st;
    try { st = await fsp.stat(p); } catch (e) { throw fail('parent-missing', 'The folder does not exist: ' + p); }
    if (!st.isDirectory()) throw fail('bad-path', 'Not a folder: ' + p);
    var real = await fsp.realpath(p);
    if (roots.indexOf(real) < 0) roots.push(real);
    return real;
  }
  function granted() { return roots.slice(); }

  async function allowedRoots() {
    var list = roots.slice();
    var ad = typeof o.appData === 'function' ? o.appData() : o.appData;
    if (ad) { try { list.push(await fsp.realpath(ad)); } catch (e) { /* not created yet: nothing to allow */ } }
    return list;
  }

  // Resolves the target for writing: returns {path, parent}. Throws a readable error when it may not be written.
  async function checkTarget(p, what) {
    what = what || 'file';
    var full = checkPathString(p, what);
    var name = path.basename(full);
    var parent = path.dirname(full);
    if (!name || full === parent) throw fail('bad-path', 'The ' + what + ' path has no file name: ' + p.slice(0, 120));
    var pst;
    try { pst = await fsp.stat(parent); } catch (e) { throw fail('parent-missing', 'The folder does not exist: ' + parent + '. Create it first or choose another folder.'); }
    if (!pst.isDirectory()) throw fail('parent-missing', 'The parent is not a folder: ' + parent);
    var realParent = await fsp.realpath(parent);
    var list = await allowedRoots();
    var ok = false;
    for (var i = 0; i < list.length; i++) if (inside(realParent, list[i])) { ok = true; break; }
    if (!ok) {
      throw fail('not-granted', 'Recut may only write into a folder you chose in a folder dialog during this session, or into its own data folder. ' +
        parent + ' is neither. Choose the folder again.');
    }
    var lst = null;
    try { lst = await fsp.lstat(full); } catch (e) { /* new file */ }
    if (lst) {
      if (lst.isSymbolicLink()) throw fail('not-file', 'Refusing to write through a link: ' + full);
      if (!lst.isFile()) throw fail('not-file', 'The target exists and is not a file: ' + full);
    }
    return { path: path.join(realParent, name), parent: realParent };
  }

  var NOFOLLOW = fs.constants.O_NOFOLLOW || 0;
  async function writeFile(p, data) {
    var buf = toBuffer(data);
    if (buf.length > MAX_WRITE) throw fail('too-large', 'The data is larger than 2 GiB.');
    var t = await checkTarget(p, 'file');
    var fh;
    try {
      fh = await fsp.open(t.path, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | NOFOLLOW, 438);
      await fh.writeFile(buf);
    } catch (e) {
      throw fail('failed', 'Could not write ' + path.basename(t.path) + ': ' + (e && e.code ? e.code + ' ' : '') + (e && e.message ? e.message : e));
    } finally {
      if (fh) { try { await fh.close(); } catch (e2) { /* ignore */ } }
    }
    return true;
  }

  async function copyFile(src, dst) {
    var s = checkPathString(src, 'source');
    if (!SOURCE_EXT.test(s)) throw fail('bad-path', 'Only audio files (wav, mp3, ogg, opus, flac, m4a, aac, aiff, webm) and .sfz files can be copied: ' + path.basename(s));
    var sst;
    try { sst = await fsp.stat(s); } catch (e) { throw fail('not-file', 'The source file does not exist or cannot be read: ' + path.basename(s)); }
    if (!sst.isFile()) throw fail('not-file', 'The source is not a regular file: ' + path.basename(s));
    var t = await checkTarget(dst, 'destination');
    var realSrc = await fsp.realpath(s);
    if (realSrc === t.path) throw fail('bad-path', 'The source and the destination are the same file.');
    try { await fsp.copyFile(realSrc, t.path); }
    catch (e) { throw fail('failed', 'Could not copy ' + path.basename(s) + ': ' + (e && e.code ? e.code + ' ' : '') + (e && e.message ? e.message : e)); }
    return true;
  }

  // makeDirectory(path) -> true (G1): one new folder whose parent lies inside a granted folder or the app-data folder,
  // the same rule as writeFile's target. An existing folder answers true (not a link: a link is refused); an existing
  // file is refused. Not recursive: the parent must exist.
  async function makeDirectory(p) {
    var full = checkPathString(p, 'folder');
    var name = path.basename(full), parent = path.dirname(full);
    if (!name || full === parent) throw fail('bad-path', 'The folder path has no name: ' + p.slice(0, 120));
    var pst;
    try { pst = await fsp.stat(parent); } catch (e) { throw fail('parent-missing', 'The folder does not exist: ' + parent + '. Create it first or choose another folder.'); }
    if (!pst.isDirectory()) throw fail('parent-missing', 'The parent is not a folder: ' + parent);
    var realParent = await fsp.realpath(parent), list = await allowedRoots(), ok = false;
    for (var i = 0; i < list.length; i++) if (inside(realParent, list[i])) { ok = true; break; }
    if (!ok) {
      throw fail('not-granted', 'Recut may only make folders inside a folder you chose in a folder dialog during this session, or inside its own data folder. ' +
        parent + ' is neither. Choose the folder again.');
    }
    var target = path.join(realParent, name), lst = null;
    try { lst = await fsp.lstat(target); } catch (e) { /* new folder */ }
    if (lst) {
      if (lst.isSymbolicLink()) throw fail('not-file', 'Refusing to use a link as a folder: ' + target);
      if (lst.isDirectory()) return true;
      throw fail('not-file', 'A file of that name exists: ' + target);
    }
    try { await fsp.mkdir(target); }
    catch (e) { if (!(e && e.code === 'EEXIST')) throw fail('failed', 'Could not make the folder ' + name + ': ' + (e && e.code ? e.code + ' ' : '') + (e && e.message ? e.message : e)); }
    return true;
  }

  return { grant: grant, granted: granted, checkTarget: checkTarget, writeFile: writeFile, copyFile: copyFile, makeDirectory: makeDirectory };
}

// ---------------------------------------------------------------- the owner's TR-909 ROM images (G1)
// Kept in <userData>/roms/tr909/ under their MAME names; drums.js (Drums.loadRom) checks the hashes, the shell checks
// only the name and the size (every HN61256P sample ROM is 32768 bytes). Nothing else is read or copied.
var ROM_FILES = ['hn61256p__c42.ic62', 'hn61256p__c43.ic69', 'hn61256p__c44.ic54'];
var ROM_SIZE = 32768;
function romName(p) {
  var b = path.basename(String(p || '')).toLowerCase();
  return ROM_FILES.indexOf(b) >= 0 ? b : null;
}
// readRoms(dir) -> [{name, bytes: Buffer}] for the known files present there (regular files, not links, 32768 bytes)
async function readRoms(dir, fsp) {
  fsp = fsp || fs.promises;
  var out = [];
  for (var i = 0; i < ROM_FILES.length; i++) {
    var f = path.join(dir, ROM_FILES[i]), st;
    try { st = await fsp.lstat(f); } catch (e) { continue; }
    if (!st.isFile() || st.size !== ROM_SIZE) continue;
    try { out.push({ name: ROM_FILES[i], bytes: await fsp.readFile(f) }); } catch (e) { /* unreadable: skipped */ }
  }
  return out;
}
// importRoms(paths, dir) -> {copied: [names], refused: [{name, reason}]}: copies the user's files into dir (made when
// missing) under the canonical lower-case name. Each source: an absolute path, a known name, a regular file of 32768 bytes.
async function importRoms(paths, dir, fsp) {
  fsp = fsp || fs.promises;
  if (!Array.isArray(paths) || !paths.length || paths.length > 8) throw fail('bad-path', 'Give one to three ROM files.');
  var res = { copied: [], refused: [] };
  await fsp.mkdir(dir, { recursive: true });
  for (var i = 0; i < paths.length; i++) {
    var shown = path.basename(String(paths[i] || '')).slice(0, 80), s, n, st;
    try { s = checkPathString(paths[i], 'ROM file'); } catch (e) { res.refused.push({ name: shown, reason: e.message.replace(/^\[[a-z-]+\] /, '') }); continue; }
    n = romName(s);
    if (!n) { res.refused.push({ name: shown, reason: 'not a TR-909 sample ROM name (' + ROM_FILES.join(', ') + ')' }); continue; }
    try { st = await fsp.stat(s); } catch (e) { res.refused.push({ name: shown, reason: 'cannot be read' }); continue; }
    if (!st.isFile()) { res.refused.push({ name: shown, reason: 'not a regular file' }); continue; }
    if (st.size !== ROM_SIZE) { res.refused.push({ name: shown, reason: 'size ' + st.size + ' bytes; a TR-909 sample ROM is ' + ROM_SIZE }); continue; }
    var dst = path.join(dir, n), lst = null;
    try { lst = await fsp.lstat(dst); } catch (e) { /* new */ }
    if (lst && !lst.isFile()) { res.refused.push({ name: shown, reason: 'the target in the data folder is not a file' }); continue; }
    try { await fsp.copyFile(await fsp.realpath(s), dst); res.copied.push(n); }
    catch (e) { res.refused.push({ name: shown, reason: 'copy failed: ' + (e && e.code || e) }); }
  }
  return res;
}

module.exports = { createGuard: createGuard, checkPathString: checkPathString, toBuffer: toBuffer, SOURCE_EXT: SOURCE_EXT,
                   ROM_FILES: ROM_FILES, ROM_SIZE: ROM_SIZE, readRoms: readRoms, importRoms: importRoms };
