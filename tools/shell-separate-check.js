#!/usr/bin/env node
/* tools/shell-separate-check.js (D3): argument building, input validation, error mapping, progress parsing and the
 * single-flight runner of app/shell/separation.js, with a fake spawn. No Python, no Electron. Exit 0 when all pass. */
'use strict';
var fs = require('fs'), os = require('os'), path = require('path');
var EventEmitter = require('events');
var S = require('../app/shell/separation.js');

var n = 0, bad = 0;
function ok(cond, name, extra) { n++; if (!cond) { bad++; console.log('FAIL ' + name + (extra ? ': ' + extra : '')); } }
function eq(a, b, name) { ok(JSON.stringify(a) === JSON.stringify(b), name, JSON.stringify(a) + ' != ' + JSON.stringify(b)); }
async function rejects(p, code, name, re) {
  try { await p; ok(false, name + ' (did not reject)'); }
  catch (e) { ok(e.code === code, name + ' code', e.code + ' / ' + e.message); ok(/^\[[a-z-]+\] /.test(e.message), name + ' prefix'); if (re) ok(re.test(e.message), name + ' text', e.message); }
}

// fake child processes ------------------------------------------------------------------------------------------
function fakeChild(script) {   // script(child) schedules emits
  var c = new EventEmitter(); c.stdout = new EventEmitter(); c.stderr = new EventEmitter(); c.pid = 4242;
  c.kill = function () { c.killed = true; setImmediate(function () { c.emit('close', null, 'SIGTERM'); }); };
  setImmediate(function () { script(c); });
  return c;
}
function fakeSpawn(handlers) {   // handlers: list of {match(args), run(child)}; records calls
  var f = function (cmd, args, opts) {
    f.calls.push({ cmd: cmd, args: args, opts: opts });
    for (var i = 0; i < handlers.length; i++) if (handlers[i].match(cmd, args)) return fakeChild(handlers[i].run);
    throw Object.assign(new Error('spawn ' + cmd + ' ENOENT'), { code: 'ENOENT' });
  };
  f.calls = [];
  return f;
}
var isVersion = function (cmd, a) { return a[0] === '-c'; };
var isCheck = function (cmd, a) { return a.indexOf('--check') >= 0; };
var isRun = function (cmd, a) { return a.indexOf('--check') < 0 && a[0] === '-u'; };
function ver(v) { return { match: isVersion, run: function (c) { c.stdout.emit('data', v + '\n'); c.emit('close', 0, null); } }; }
function chk(info) { return { match: isCheck, run: function (c) { c.stdout.emit('data', JSON.stringify(info)); c.emit('close', 0, null); } }; }
var GOOD = { python: '3.12.0', missing: [], mdxFallbackUsable: true, ffmpeg: '/usr/bin/ffmpeg' };

(async function main() {
  var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hvsep-'));
  var wavp = path.join(tmp, 'My Track.wav'); fs.writeFileSync(wavp, Buffer.alloc(100, 1));
  var txt = path.join(tmp, 'a.txt'); fs.writeFileSync(txt, 'x');
  var empty = path.join(tmp, 'empty.wav'); fs.writeFileSync(empty, '');

  // --- argument building: an array, the path passed whole, no shell quoting needed
  var a = S.buildArgs({ script: '/x/tools/separate.py', input: '/m/My Track; rm -rf x.wav', out: '/o', model: 'auto' });
  eq(a, ['-u', '/x/tools/separate.py', '/m/My Track; rm -rf x.wav', '--out', '/o', '--model', 'auto'], 'buildArgs keeps a hostile name as one argument');
  eq(S.checkArgs('/s.py', 'mdx'), ['-u', '/s.py', '--check', '--model', 'mdx'], 'checkArgs');
  eq(S.pythonCandidates({}, 'linux'), ['python3', 'python'], 'candidates linux');
  eq(S.pythonCandidates({ HAVANTECHNO_PYTHON: '/p/py' }, 'win32'), ['/p/py', 'py', 'python', 'python3'], 'candidates win with override');
  eq(S.installCommand('python3', ['torch', 'demucs']), 'python3 -m pip install torch demucs', 'installCommand');

  // --- input validation (the path crosses IPC)
  var v = await S.validateInput(wavp); ok(v.path === wavp && v.size === 100, 'valid file');
  await rejects(S.validateInput(undefined), 'bad-path', 'undefined path');
  await rejects(S.validateInput(42), 'bad-path', 'number path');
  await rejects(S.validateInput('relative/x.wav'), 'bad-path', 'relative path', /absolute/);
  await rejects(S.validateInput('https://x.example/a.wav'), 'bad-path', 'url', /URL/);
  await rejects(S.validateInput(wavp + '\0.txt'), 'bad-path', 'nul byte');
  await rejects(S.validateInput(txt), 'bad-path', 'not audio', /Not an audio file/);
  await rejects(S.validateInput(path.join(tmp, 'nope.wav')), 'bad-path', 'missing', /does not exist/);
  await rejects(S.validateInput(tmp + '.wav'), 'bad-path', 'missing 2');
  await rejects(S.validateInput(empty), 'bad-path', 'empty file', /empty/);
  fs.mkdirSync(path.join(tmp, 'dir.wav'));
  await rejects(S.validateInput(path.join(tmp, 'dir.wav')), 'bad-path', 'directory named .wav', /Not a file/);
  eq(S.normModel(undefined), 'auto', 'model default'); eq(S.normModel('mdx'), 'mdx', 'model mdx');
  try { S.normModel('rm -rf'); ok(false, 'bad model'); } catch (e) { ok(e.code === 'bad-path', 'bad model code'); }

  // --- output folder: under userData, per file and model, never beside the source
  var o1 = S.outDirFor('/ud', { path: wavp, size: 100, mtimeMs: 5 }, 'auto'), o2 = S.outDirFor('/ud', { path: wavp, size: 101, mtimeMs: 5 }, 'auto');
  ok(o1.indexOf('/ud/separation/My_Track-') === 0 && o1 !== o2 && o1.indexOf(tmp) < 0, 'outDirFor', o1);

  // --- error mapping
  var m = S.mapFailure({ code: 1, err: "ModuleNotFoundError: No module named 'torch'" }, 'mdx', 'python3');
  ok(m.code === 'packages-missing' && /pip install torch$/.test(m.message), 'map module missing', m.message);
  m = S.mapFailure({ code: 3, err: 'separate.py: demucs failed (exit 1); are its weights reachable (dl.fbaipublicfiles.com)?' }, 'htdemucs', 'python3');
  ok(m.code === 'weights-missing' && /dl\.fbaipublicfiles\.com/.test(m.message), 'map demucs weights', m.message);
  m = S.mapFailure({ code: 1, err: 'downloading kuielab_a_drums.onnx\nurllib.error.URLError: <urlopen error [Errno -3] Temporary failure in name resolution>' }, 'mdx', 'python3');
  ok(m.code === 'weights-missing' && /github\.com/.test(m.message), 'map mdx download', m.message);
  m = S.mapFailure({ code: 2, err: 'separate.py: kuielab_a_bass.onnx: MD5 abc is not the Zenodo original def; its licence is unknown' }, 'mdx', 'python3');
  ok(m.code === 'weights-bad', 'map bad weights', m.message);
  m = S.mapFailure({ code: 1, err: 'FileNotFoundError: [Errno 2] No such file or directory: ffmpeg' }, 'mdx', 'python3');
  ok(m.code === 'ffmpeg-missing', 'map ffmpeg', m.message);
  m = S.mapFailure({ code: null, signal: 'SIGKILL', err: '' }, 'mdx', 'python3');
  ok(m.code === 'failed' && /memory/.test(m.message), 'map oom');
  m = S.mapFailure({ code: 7, err: 'something odd\nlast words' }, 'mdx', 'python3');
  ok(m.code === 'failed' && /exit 7\): last words/.test(m.message), 'map generic', m.message);

  // --- preflight
  var p = S.preflightProblem({ missing: ['demucs', 'torch'] }, 'auto', '.wav', 'python3');
  ok(p && p.code === 'packages-missing' && /python3 -m pip install demucs torch/.test(p.message), 'preflight packages', p && p.message);
  eq(S.preflightProblem({ missing: ['demucs'], mdxFallbackUsable: true }, 'auto', '.wav', 'python3'), null, 'preflight auto falls back to MDX-Net');
  p = S.preflightProblem({ missing: ['demucs'], mdxFallbackUsable: true }, 'htdemucs', '.wav', 'python3');
  ok(p && p.code === 'packages-missing', 'preflight htdemucs needs demucs');
  p = S.preflightProblem({ missing: [], ffmpeg: null }, 'auto', '.mp3', 'python3'); ok(p && p.code === 'ffmpeg-missing', 'preflight ffmpeg for mp3');
  eq(S.preflightProblem({ missing: [], ffmpeg: null }, 'auto', '.wav', 'python3'), null, 'preflight wav needs no ffmpeg');

  // --- progress parsing
  var st = {}, ev = S.parseLine('downloading kuielab_a_drums.onnx', st);
  ok(ev.stage === 'download' && /kuielab_a_drums/.test(ev.note), 'progress download');
  ev = S.parseLine('drums: 45.4 s', st); ok(ev.done === 1 && ev.total === 3, 'progress stem 1');
  ev = S.parseLine('bass: 25.0 s', st); ok(ev.done === 2, 'progress stem 2');
  ev = S.parseLine('\u001b[A 45%|████▌     | 12.3/27.3 [00:10<00:12]', st); ok(ev.done === 45 && ev.total === 100, 'progress demucs bar');
  eq(S.parseLine(' 45%|██', st), null, 'progress repeated percent is dropped');
  eq(S.parseLine('   ', st), null, 'progress blank');
  var sp = S.splitChunks('', 'a\rb\nc'); eq(sp, { lines: ['a', 'b'], rest: 'c' }, 'splitChunks');

  // --- findPython
  var sp1 = fakeSpawn([{ match: function (c, a) { return c === 'python' && isVersion(c, a); }, run: function (c) { c.stdout.emit('data', '3.11.2\n'); c.emit('close', 0, null); } }]);
  var py = await S.findPython(sp1, {}, 'linux'); ok(py.cmd === 'python' && py.version === '3.11.2' && sp1.calls.length === 2, 'findPython falls through to python');
  sp1 = fakeSpawn([{ match: isVersion, run: function (c) { c.stdout.emit('data', '3.6.9\n'); c.emit('close', 0, null); } }]);
  await rejects(S.findPython(sp1, {}, 'linux'), 'python-missing', 'findPython too old', /too old/);
  await rejects(S.findPython(fakeSpawn([]), {}, 'linux'), 'python-missing', 'findPython none', /pip install numpy scipy demucs onnxruntime torch/);
  ok(sp1.calls.every(function (c) { return Array.isArray(c.args) && !c.opts.shell; }), 'findPython never uses a shell');

  // --- runner: success, cache hit, busy, cancel, failure
  var ud = path.join(tmp, 'ud'), script = '/repo/tools/separate.py';
  function successRun(c) {
    var args = fakeSpawn.last, out = args[args.indexOf('--out') + 1], name = 'My Track', stems = {};
    fs.mkdirSync(out, { recursive: true });
    ['drums', 'bass', 'other', 'vocals'].forEach(function (s) { stems[s] = path.join(out, name + '-' + s + '.wav'); fs.writeFileSync(stems[s], 'x'); });
    c.stderr.emit('data', ' 10%|█ | 1/10\r 50%|█████ | 5/10\r');
    c.stdout.emit('data', 'stems written to ' + out + '\n');
    fs.writeFileSync(path.join(out, name + '-stems.json'), JSON.stringify({ model: 'htdemucs', stems: stems, attribution: 'MIT' }));
    c.emit('close', 0, null);
  }
  var sp2 = fakeSpawn([ver('3.12.0'), chk(GOOD), { match: function (c, a) { fakeSpawn.last = a; return isRun(c, a); }, run: successRun }]);
  var r = S.createRunner({ userData: ud, script: script, spawn: sp2, platform: 'linux', env: {} }), events = [];
  var res = await r.separate(wavp, { model: 'auto' }, function (e) { events.push(e); });
  eq(res.stems.map(function (s) { return s.name; }), ['drums', 'bass', 'other', 'vocals'], 'runner stems in order');
  ok(res.model === 'htdemucs' && res.folder.indexOf(ud) === 0 && /stems written/.test(res.log), 'runner result', JSON.stringify(res).slice(0, 200));
  ok(events.some(function (e) { return e.done === 50 && e.total === 100; }) && events[events.length - 1].stage === 'done', 'runner progress events');
  var runCall = sp2.calls.filter(function (c) { return isRun(c.cmd, c.args); })[0];
  ok(runCall.args[1] === script && runCall.args[2] === wavp && !runCall.opts.shell && runCall.opts.env.PYTHONUNBUFFERED === '1', 'runner spawn args');
  ok(!r.busy(), 'runner idle after success');
  var before = sp2.calls.length;
  res = await r.separate(wavp, {}, null); ok(res.cached === true && sp2.calls.length === before, 'runner cache hit spawns nothing');

  // busy and cancel: a run that hangs until killed
  fs.writeFileSync(wavp, Buffer.alloc(200, 2));   // new size: new folder, no cache hit
  var killed = [], realKill = process.kill;
  process.kill = function (pid, sig) { killed.push([pid, sig]); };
  var hang = fakeSpawn([ver('3.12.0'), chk(GOOD), { match: isRun, run: function (c) { c.stderr.emit('data', 'downloading kuielab_a_drums.onnx\n'); hang.child = c; } }]);
  var r2 = S.createRunner({ userData: ud, script: script, spawn: hang, platform: 'linux', env: {} });
  var first = r2.separate(wavp, {}, null);
  await rejects(r2.separate(wavp, {}, null), 'busy', 'second call while running', /already running/);
  while (!hang.child) await new Promise(function (res2) { setTimeout(res2, 5); });
  ok(r2.cancel() === true, 'cancel returns true');
  ok(killed.length === 1 && killed[0][0] === -4242 && killed[0][1] === 'SIGTERM', 'cancel kills the process group', JSON.stringify(killed));
  hang.child.emit('close', null, 'SIGTERM');
  await rejects(first, 'cancelled', 'cancelled run rejects');
  process.kill = realKill;
  ok(r2.cancel() === false && !r2.busy(), 'cancel with nothing running');

  // failures end to end
  async function runWith(handlers, file, opts) { return S.createRunner({ userData: ud, script: script, spawn: fakeSpawn(handlers), platform: 'linux', env: {} }).separate(file || wavp, opts || {}, null); }
  fs.writeFileSync(wavp, Buffer.alloc(300, 3));
  await rejects(runWith([], 42), 'bad-path', 'runner non-string path');
  await rejects(runWith([]), 'python-missing', 'runner no python');
  await rejects(runWith([ver('3.12.0'), chk({ missing: ['numpy', 'scipy'], mdxFallbackUsable: false })]), 'packages-missing', 'runner packages', /pip install numpy scipy/);
  await rejects(runWith([ver('3.12.0'), { match: isCheck, run: function (c) { c.stderr.emit('data', 'SyntaxError: invalid syntax\n'); c.emit('close', 1, null); } }]), 'failed', 'runner broken check');
  await rejects(runWith([ver('3.12.0'), chk(GOOD), { match: isRun, run: function (c) { c.stderr.emit('data', 'separate.py: demucs failed (exit 1); are its weights reachable (dl.fbaipublicfiles.com)?\n'); c.emit('close', 3, null); } }], null, { model: 'htdemucs' }), 'weights-missing', 'runner weights missing', /dl\.fbaipublicfiles\.com/);
  fs.writeFileSync(wavp, Buffer.alloc(301, 3));
  await rejects(runWith([ver('3.12.0'), chk(GOOD), { match: isRun, run: function (c) { c.emit('close', 0, null); } }]), 'failed', 'runner exit 0 but no stems.json', /could not be read/);

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(bad ? 'FAILED: ' + bad + ' of ' + n + ' checks' : 'OK: ' + n + ' checks passed');
  process.exit(bad ? 1 : 0);
})().catch(function (e) { console.log('ERROR ' + (e && e.stack || e)); process.exit(2); });
