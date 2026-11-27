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
      throw fail('not-granted', 'Havantechno may only write into a folder you chose in a folder dialog during this session, or into its own data folder. ' +
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

  return { grant: grant, granted: granted, checkTarget: checkTarget, writeFile: writeFile, copyFile: copyFile };
}

module.exports = { createGuard: createGuard, checkPathString: checkPathString, toBuffer: toBuffer, SOURCE_EXT: SOURCE_EXT };
