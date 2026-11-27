#!/usr/bin/env node
/* tools/shell-files-check.js (V3): the write rules of app/shell/files.js on a temporary folder, and the preload's
 * joinPath, appVersion and error handling run against a fake electron. No Electron needed. Exit 0 when all pass. */
'use strict';
var fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
var F = require('../app/shell/files.js');

var n = 0, bad = 0;
function ok(cond, name, extra) { n++; if (!cond) { bad++; console.log('FAIL ' + name + (extra ? ': ' + extra : '')); } }
function eq(a, b, name) { ok(JSON.stringify(a) === JSON.stringify(b), name, JSON.stringify(a) + ' != ' + JSON.stringify(b)); }
async function rejects(p, code, name, re) {
  try { await p; ok(false, name + ' (did not reject)'); }
  catch (e) {
    ok(e.code === code, name + ' code', e.code + ' / ' + e.message);
    ok(/^\[[a-z-]+\] /.test(e.message), name + ' prefix', e.message);
    if (re) ok(re.test(e.message), name + ' text', e.message);
  }
}

async function main() {
  var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hv-files-'));
  var granted = path.join(tmp, 'granted'), other = path.join(tmp, 'other'), appData = path.join(tmp, 'appdata'), notYet = path.join(tmp, 'later');
  [granted, path.join(granted, 'sub'), other, appData, notYet].forEach(function (d) { fs.mkdirSync(d, { recursive: true }); });
  fs.writeFileSync(path.join(other, 'secret.txt'), 'secret');
  fs.writeFileSync(path.join(other, 'a.wav'), Buffer.from([1, 2, 3, 4]));
  fs.writeFileSync(path.join(granted, 'in.wav'), Buffer.from([9, 8, 7]));
  var g = F.createGuard({ appData: function () { return appData; } });
  var gNoData = F.createGuard({ appData: function () { return path.join(tmp, 'never-created'); } });

  // nothing granted yet
  await rejects(g.writeFile(path.join(granted, 'x.wav'), new Uint8Array([1])), 'not-granted', 'before any grant', /folder dialog/);
  eq(g.granted(), [], 'no grants at start');
  // the app-data folder is always allowed
  ok((await g.writeFile(path.join(appData, 'a.bin'), new Uint8Array([1, 2, 3]))) === true, 'app data write returns true');
  eq(Array.from(fs.readFileSync(path.join(appData, 'a.bin'))), [1, 2, 3], 'app data content');
  await rejects(gNoData.writeFile(path.join(tmp, 'never-created', 'x'), 'x'), 'parent-missing', 'app data folder absent');

  // grant
  var real = await g.grant(granted);
  eq(g.granted(), [fs.realpathSync(granted)], 'granted list holds the realpath');
  ok(real === fs.realpathSync(granted), 'grant returns the realpath');
  await g.grant(granted); eq(g.granted().length, 1, 'granting twice keeps one entry');
  await rejects(g.grant(path.join(granted, 'in.wav')), 'bad-path', 'grant a file', /Not a folder/);
  await rejects(g.grant(path.join(tmp, 'nope')), 'parent-missing', 'grant a missing folder');
  await rejects(g.grant('relative/dir'), 'bad-path', 'grant a relative folder', /absolute/);

  // writes that work
  ok((await g.writeFile(path.join(granted, 'one.wav'), new Uint8Array([5, 6]).buffer)) === true, 'ArrayBuffer write');
  eq(Array.from(fs.readFileSync(path.join(granted, 'one.wav'))), [5, 6], 'ArrayBuffer content');
  await g.writeFile(path.join(granted, 'two.bin'), new Float32Array([1, -1]));
  eq(fs.readFileSync(path.join(granted, 'two.bin')).length, 8, 'typed array writes its bytes');
  await g.writeFile(path.join(granted, 'three.txt'), 'h\u00e9llo');
  eq(fs.readFileSync(path.join(granted, 'three.txt'), 'utf8'), 'h\u00e9llo', 'string writes UTF-8');
  var view = new Uint8Array([0, 1, 2, 3, 4, 5]).subarray(2, 5);
  await g.writeFile(path.join(granted, 'view.bin'), view);
  eq(Array.from(fs.readFileSync(path.join(granted, 'view.bin'))), [2, 3, 4], 'a subarray writes only its window');
  await g.writeFile(path.join(granted, 'one.wav'), new Uint8Array([7]));
  eq(Array.from(fs.readFileSync(path.join(granted, 'one.wav'))), [7], 'overwrite truncates');
  await g.writeFile(path.join(granted, 'sub', 'deep.wav'), new Uint8Array([1]));
  ok(fs.existsSync(path.join(granted, 'sub', 'deep.wav')), 'a subfolder of a granted folder is allowed');
  await g.writeFile(granted + path.sep + path.sep + 'dbl.wav', new Uint8Array([1]));
  ok(fs.existsSync(path.join(granted, 'dbl.wav')), 'doubled separator is fine');
  await g.writeFile(path.join(granted, 'empty.bin'), new Uint8Array(0));
  eq(fs.statSync(path.join(granted, 'empty.bin')).size, 0, 'an empty write makes an empty file');
  await g.writeFile(path.join(granted, 'node-buffer.bin'), Buffer.from([4, 4]));
  eq(fs.statSync(path.join(granted, 'node-buffer.bin')).size, 2, 'a Buffer is accepted');
  await g.writeFile(path.join(granted, 'cloned.bin'), { type: 'Buffer', data: [1, 2, 3] });
  eq(fs.statSync(path.join(granted, 'cloned.bin')).size, 3, 'a structured-cloned Buffer is accepted');

  // refusals: the path itself
  await rejects(g.writeFile('one.wav', new Uint8Array(1)), 'bad-path', 'relative path', /absolute/);
  await rejects(g.writeFile('./one.wav', new Uint8Array(1)), 'bad-path', 'dot-relative path');
  await rejects(g.writeFile('', new Uint8Array(1)), 'bad-path', 'empty path');
  await rejects(g.writeFile(null, new Uint8Array(1)), 'bad-path', 'null path');
  await rejects(g.writeFile(42, new Uint8Array(1)), 'bad-path', 'number path');
  await rejects(g.writeFile({ toString: function () { return granted + '/x'; } }, new Uint8Array(1)), 'bad-path', 'object path');
  await rejects(g.writeFile(path.join(granted, 'a\0b.wav'), new Uint8Array(1)), 'bad-path', 'NUL in the path');
  await rejects(g.writeFile('file://' + granted + '/x.wav', new Uint8Array(1)), 'bad-path', 'URL', /not a URL/);
  await rejects(g.writeFile(path.join(granted, 'x'.repeat(5000)), new Uint8Array(1)), 'bad-path', 'a 5000-character path');
  await rejects(g.writeFile(path.sep, new Uint8Array(1)), 'bad-path', 'the root folder', undefined);
  await rejects(g.writeFile(path.join(granted, 'x.wav'), { not: 'bytes' }), 'bad-path', 'data that is not bytes', /ArrayBuffer/);
  await rejects(g.writeFile(path.join(granted, 'x.wav'), undefined), 'bad-path', 'undefined data');

  // refusals: traversal
  await rejects(g.writeFile(granted + '/../other/evil.wav', new Uint8Array(1)), 'bad-path', 'traversal out of the granted folder', /"\.\."/);
  await rejects(g.writeFile(granted + '/sub/../one.wav', new Uint8Array(1)), 'bad-path', 'traversal that stays inside is refused too', /"\.\."/);
  await rejects(g.writeFile(granted + '/sub/..', new Uint8Array(1)), 'bad-path', 'a trailing ".."');
  await rejects(g.writeFile(granted + '\\..\\other\\evil.wav', new Uint8Array(1)), 'bad-path', 'backslash traversal');
  ok(!fs.existsSync(path.join(other, 'evil.wav')), 'no file appeared through the traversal');

  // refusals: parent missing, outside
  await rejects(g.writeFile(path.join(granted, 'nope', 'x.wav'), new Uint8Array(1)), 'parent-missing', 'parent folder missing', /does not exist/);
  ok(!fs.existsSync(path.join(granted, 'nope')), 'a missing parent is not created');
  await rejects(g.writeFile(path.join(granted, 'in.wav', 'x.wav'), new Uint8Array(1)), 'parent-missing', 'parent is a file');
  await rejects(g.writeFile(path.join(other, 'x.wav'), new Uint8Array(1)), 'not-granted', 'a folder never granted', /neither/);
  await rejects(g.writeFile(path.join(notYet, 'x.wav'), new Uint8Array(1)), 'not-granted', 'another existing folder');
  await rejects(g.writeFile(path.join(os.tmpdir(), 'hv-outside.wav'), new Uint8Array(1)), 'not-granted', 'the temp folder itself');
  await rejects(g.writeFile(path.join(tmp, 'sibling.wav'), new Uint8Array(1)), 'not-granted', 'the parent of a granted folder');
  fs.mkdirSync(path.join(tmp, 'granted-evil'));
  await rejects(g.writeFile(path.join(tmp, 'granted-evil', 'x.wav'), new Uint8Array(1)), 'not-granted', 'a sibling that shares the name prefix');
  await rejects(g.writeFile(granted, new Uint8Array(1)), 'not-granted', 'the granted folder itself as a file (its parent is not granted)');
  fs.mkdirSync(path.join(granted, 'adir'));
  await rejects(g.writeFile(path.join(granted, 'adir'), new Uint8Array(1)), 'not-file', 'a folder as the target', /not a file/);

  // refusals: symbolic links
  var canLink = true;
  try {
    fs.symlinkSync(other, path.join(granted, 'linkdir'), 'dir');
    fs.symlinkSync(path.join(other, 'secret.txt'), path.join(granted, 'linkfile.txt'));
    fs.symlinkSync(path.join(tmp, 'dangling-target'), path.join(granted, 'dangling.txt'));
    fs.symlinkSync(granted, path.join(other, 'back'), 'dir');
  } catch (e) { canLink = false; console.log('note: symlinks unavailable here, skipping those rows (' + e.code + ')'); }
  if (canLink) {
    await rejects(g.writeFile(path.join(granted, 'linkdir', 'x.wav'), new Uint8Array(1)), 'not-granted', 'a symlinked folder inside the granted folder that points out');
    ok(!fs.existsSync(path.join(other, 'x.wav')), 'nothing written through the folder link');
    await rejects(g.writeFile(path.join(granted, 'linkfile.txt'), new Uint8Array([0])), 'not-file', 'a symlinked file pointing out', /link/);
    eq(fs.readFileSync(path.join(other, 'secret.txt'), 'utf8'), 'secret', 'the file the link pointed at is untouched');
    await rejects(g.writeFile(path.join(granted, 'dangling.txt'), new Uint8Array([0])), 'not-file', 'a dangling symlink');
    ok(!fs.existsSync(path.join(tmp, 'dangling-target')), 'the dangling target was not created');
    // a link into the granted folder from outside is fine: the real location is what counts
    await g.writeFile(path.join(other, 'back', 'viaback.wav'), new Uint8Array([3]));
    ok(fs.existsSync(path.join(granted, 'viaback.wav')), 'a path that resolves into a granted folder through a link is allowed');
  }

  // a grant made later covers a folder that was refused before
  await g.grant(other);
  await g.writeFile(path.join(other, 'x.wav'), new Uint8Array([1]));
  ok(fs.existsSync(path.join(other, 'x.wav')), 'granting a folder opens it');
  await rejects(g.writeFile(path.join(notYet, 'x.wav'), new Uint8Array(1)), 'not-granted', 'a folder still not granted stays closed');
  // a second guard shares nothing (grants live for one run of one process)
  var g2 = F.createGuard({ appData: function () { return appData; } });
  await rejects(g2.writeFile(path.join(granted, 'y.wav'), new Uint8Array(1)), 'not-granted', 'a new guard starts with no grants');

  // copyFile
  var src = path.join(tmp, 'other', 'a.wav');
  ok((await g.copyFile(src, path.join(granted, 'copy.wav'))) === true, 'copyFile returns true');
  eq(Array.from(fs.readFileSync(path.join(granted, 'copy.wav'))), [1, 2, 3, 4], 'copy content');
  await g.copyFile(src, path.join(granted, 'copy.wav'));
  eq(fs.statSync(path.join(granted, 'copy.wav')).size, 4, 'copying over an existing file works');
  await g.copyFile(path.join(granted, 'in.wav'), path.join(appData, 'in.wav'));
  ok(fs.existsSync(path.join(appData, 'in.wav')), 'copy into the app data folder');
  var g3 = F.createGuard({ appData: function () { return appData; } }); await g3.grant(granted);
  await rejects(g3.copyFile(src, path.join(other, 'copy2.wav')), 'not-granted', 'copy to a folder not granted');
  await rejects(g3.copyFile(src, granted + '/../other/copy3.wav'), 'bad-path', 'copy destination with ".."');
  await rejects(g3.copyFile(src, 'copy.wav'), 'bad-path', 'copy to a relative path');
  await rejects(g3.copyFile('a.wav', path.join(granted, 'z.wav')), 'bad-path', 'copy from a relative path');
  await rejects(g3.copyFile(path.join(other, 'missing.wav'), path.join(granted, 'z.wav')), 'not-file', 'copy a source that does not exist', /does not exist/);
  await rejects(g3.copyFile(path.join(tmp, 'other'), path.join(granted, 'z.wav')), 'bad-path', 'copy a folder (no audio extension)');
  fs.mkdirSync(path.join(other, 'dir.wav'));
  await rejects(g3.copyFile(path.join(other, 'dir.wav'), path.join(granted, 'z.wav')), 'not-file', 'copy a folder named like audio', /regular file/);
  await rejects(g3.copyFile(path.join(other, 'secret.txt'), path.join(granted, 'z.wav')), 'bad-path', 'copy a non-audio file', /audio/);
  await rejects(g3.copyFile('/etc/passwd', path.join(granted, 'z.wav')), 'bad-path', 'copy /etc/passwd');
  await rejects(g3.copyFile(src, path.join(granted, 'nope', 'z.wav')), 'parent-missing', 'copy into a missing folder');
  await rejects(g3.copyFile(path.join(granted, 'in.wav'), path.join(granted, 'in.wav')), 'bad-path', 'copy a file onto itself', /same file/);
  await rejects(g3.copyFile('file://' + src, path.join(granted, 'z.wav')), 'bad-path', 'copy from a URL');
  if (canLink) {
    await rejects(g3.copyFile(src, path.join(granted, 'linkfile.txt')), 'not-file', 'copy onto a symlink');
    await rejects(g3.copyFile(src, path.join(granted, 'linkdir', 'z.wav')), 'not-granted', 'copy through a folder link that points out');
    fs.symlinkSync(src, path.join(granted, 'srclink.wav'));
    await g3.copyFile(path.join(granted, 'srclink.wav'), path.join(granted, 'fromlink.wav'));
    eq(fs.statSync(path.join(granted, 'fromlink.wav')).size, 4, 'a source that is a link to a regular file is read through (reading is not what is guarded)');
  }

  // joinPath, appVersion and the error text through the real preload run against a fake electron
  function loadPreload(platform) {
    var exposed = null, calls = [];
    var fakeElectron = {
      contextBridge: { exposeInMainWorld: function (k, v) { exposed = v; } },
      ipcRenderer: {
        on: function () {}, invoke: function (ch) { calls.push(Array.prototype.slice.call(arguments)); return Promise.reject(new Error("Error invoking remote method '" + ch + "': Error: [not-granted] Pick the folder first.")); },
        sendSync: function (ch) { calls.push([ch]); return '9.9.9'; }
      },
      webUtils: {}
    };
    var src = fs.readFileSync(path.join(__dirname, '..', 'app', 'shell', 'preload.js'), 'utf8');
    vm.runInNewContext(src, { require: function (m) { if (m !== 'electron') throw new Error('preload may only require electron: ' + m); return fakeElectron; }, process: { platform: platform }, Error: Error, String: String, Promise: Promise, Array: Array, console: console });
    return { shell: exposed, calls: calls };
  }
  var P = loadPreload('linux').shell, W = loadPreload('win32').shell, M = loadPreload('darwin').shell;
  eq(typeof P.pickDirectory + typeof P.writeFile + typeof P.copyFile + typeof P.joinPath + typeof P.appVersion, 'functionfunctionfunctionfunctionfunction', 'the five frozen calls are exposed');
  eq(P.joinPath('/home/a', 'x.wav'), '/home/a/x.wav', 'joinPath posix');
  eq(P.joinPath('/home/a/', 'x.wav'), '/home/a/x.wav', 'joinPath trailing slash');
  eq(P.joinPath('/home/a///', '/x.wav'), '/home/a/x.wav', 'joinPath repeated and leading separators');
  eq(P.joinPath('/', 'x.wav'), '/x.wav', 'joinPath at the root');
  eq(P.joinPath('/a b/c', 'sub/file one.wav'), '/a b/c/sub/file one.wav', 'joinPath relative name with a subfolder and spaces');
  eq(P.joinPath('/a', './x.wav'), '/a/x.wav', 'joinPath drops "."');
  eq(M.joinPath('/Users/me/Music', 'x.wav'), '/Users/me/Music/x.wav', 'joinPath macOS');
  eq(W.joinPath('C:\\Users\\me', 'x.wav'), 'C:\\Users\\me\\x.wav', 'joinPath windows');
  eq(W.joinPath('C:\\Users\\me\\', 'x.wav'), 'C:\\Users\\me\\x.wav', 'joinPath windows trailing backslash');
  eq(W.joinPath('C:\\', 'x.wav'), 'C:\\x.wav', 'joinPath windows drive root');
  eq(W.joinPath('C:', 'x.wav'), 'C:\\x.wav', 'joinPath windows bare drive');
  eq(W.joinPath('D:/Music/', 'sub/x.wav'), 'D:/Music\\sub\\x.wav', 'joinPath windows keeps the forward-slash base');
  var threw = 0;
  [['/a', '../x'], ['/a', 'sub/../../x'], ['/a', ''], ['', 'x'], ['/a', 'a\0b'], ['/a\0', 'x'], ['/a', '..']].forEach(function (a) { try { P.joinPath(a[0], a[1]); } catch (e) { threw++; } });
  eq(threw, 7, 'joinPath refuses "..", empty parts and NUL');
  try { W.joinPath('C:\\a', 'D:\\x'); ok(false, 'windows drive letter in the name'); } catch (e) { ok(/drive letter/.test(e.message), 'windows drive letter in the name is refused'); }
  var lp = loadPreload('linux');
  eq(lp.shell.appVersion(), '9.9.9', 'appVersion asks main once'); lp.shell.appVersion();
  eq(lp.calls.filter(function (c) { return c[0] === 'shell:appVersion'; }).length, 1, 'appVersion is cached');
  try { await lp.shell.writeFile('/x', new Uint8Array(1)); ok(false, 'preload error'); }
  catch (e) { eq(e.message, 'Pick the folder first.', 'the page sees the message alone, without the IPC wrapper or the code'); }
  try { await lp.shell.copyFile('/a.wav', '/b.wav'); ok(false, 'preload copy error'); } catch (e) { eq(e.message, 'Pick the folder first.', 'copyFile error text'); }
  try { await lp.shell.pickDirectory({ title: 'Choose' }); ok(false, 'pick error'); } catch (e) { eq(e.message, 'Pick the folder first.', 'pickDirectory error text'); }
  var pick = lp.calls.filter(function (c) { return c[0] === 'shell:pickDirectory'; })[0];
  eq(pick[1], { title: 'Choose' }, 'pickDirectory passes only the title');

  // main.js wires the three channels and refuses other windows (read as text: no Electron here)
  var mainSrc = fs.readFileSync(path.join(__dirname, '..', 'app', 'shell', 'main.js'), 'utf8');
  ['shell:pickDirectory', 'shell:writeFile', 'shell:copyFile', 'shell:appVersion'].forEach(function (ch) { ok(mainSrc.indexOf("'" + ch + "'") >= 0, 'main.js handles ' + ch); });
  ok(/shell:writeFile'[\s\S]{0,200}fromMain\(e\)/.test(mainSrc) && /shell:copyFile'[\s\S]{0,200}fromMain\(e\)/.test(mainSrc) && /shell:pickDirectory'[\s\S]{0,200}fromMain\(e\)/.test(mainSrc), 'the three handlers check the caller is the main window');

  var pm = /var ALLOWED_PERMISSIONS = (\[[^\]]*\]);/.exec(mainSrc);
  eq(pm ? JSON.parse(pm[1].replace(/'/g, '"')) : null, ['media', 'speaker-selection', 'midi', 'midiSysex'], 'main.js allows exactly four permissions');
  ok(/setPermissionRequestHandler/.test(mainSrc) && /setPermissionCheckHandler/.test(mainSrc) && /ownOrigin\(url\)/.test(mainSrc), 'both permission handlers test the origin');
  ok(/mediaTypes\.indexOf\('video'\)/.test(mainSrc) && /mediaType === 'video'/.test(mainSrc), 'video is refused in both handlers');

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(bad ? 'FAILED: ' + bad + ' of ' + n + ' checks' : 'OK: ' + n + ' checks passed');
  process.exit(bad ? 1 : 0);
}
main().catch(function (e) { console.log('ERROR ' + (e && e.stack || e)); process.exit(1); });
