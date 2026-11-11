/* Stem separation for the Electron shell (D3, Dubplate Crew, 2026-11-11). Plain Node, no electron: main.js wires it to
 * the IPC channel, tools/shell-separate-check.js tests it with a fake spawn.
 *
 * It runs tools/separate.py with the system's Python. The arguments are always an array (never a shell string). One
 * separation at a time; a second call rejects with [busy]. Output goes to <userData>/separation/<name>-<hash>/, not
 * next to the source file (which may be read-only or on a network drive) and not into tools/out (inside the install
 * when packaged): separate.py's own default is tools/out/stems/, which this module overrides with --out.
 *
 * Errors are Error objects whose message starts with "[code] " (the code survives Electron's IPC, which keeps only the
 * message; preload.js turns it back into err.code): python-missing, packages-missing, weights-missing, weights-bad,
 * ffmpeg-missing, bad-path, busy, cancelled, failed. */
'use strict';
var path = require('path');
var fs = require('fs');
var crypto = require('crypto');
var childProcess = require('child_process');

var AUDIO_EXT = /\.(wav|wave|mp3|ogg|oga|opus|flac|m4a|aac|aif|aiff|webm)$/i;
var MODELS = ['auto', 'mdx', 'htdemucs'];
var STEM_ORDER = ['drums', 'bass', 'other', 'vocals'];
var MAX_BYTES = 4 * 1024 * 1024 * 1024;
var MIN_PY = [3, 8];

function fail(code, message) {
  var e = new Error('[' + code + '] ' + message);
  e.code = code;
  return e;
}

// ------------------------------------------------------------------ input and arguments
// The path crosses the IPC boundary: absolute, an existing regular file, an audio extension, a sane size.
async function validateInput(p, fsp) {
  fsp = fsp || fs.promises;
  if (typeof p !== 'string' || !p || p.length > 4096 || p.indexOf('\0') >= 0) throw fail('bad-path', 'The file path is missing or not valid.');
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(p)) throw fail('bad-path', 'Only a file on disk can be separated, not a URL.');
  if (!path.isAbsolute(p)) throw fail('bad-path', 'The file path must be absolute.');
  if (!AUDIO_EXT.test(p)) throw fail('bad-path', 'Not an audio file (wav, mp3, ogg, opus, flac, m4a, aac, aiff or webm): ' + path.basename(p));
  var st;
  try { st = await fsp.stat(p); } catch (e) { throw fail('bad-path', 'The file does not exist or cannot be read: ' + path.basename(p)); }
  if (!st.isFile()) throw fail('bad-path', 'Not a file: ' + path.basename(p));
  if (!(st.size > 0)) throw fail('bad-path', 'The file is empty: ' + path.basename(p));
  if (st.size > MAX_BYTES) throw fail('bad-path', 'The file is larger than 4 GiB: ' + path.basename(p));
  return { path: p, size: st.size, mtimeMs: st.mtimeMs };
}

function normModel(m) {
  if (m == null || m === '') return 'auto';
  if (typeof m !== 'string' || MODELS.indexOf(m) < 0) throw fail('bad-path', 'Unknown model "' + String(m).slice(0, 40) + '"; use auto, mdx or htdemucs.');
  return m;
}

// <userData>/separation/<name>-<8 hex>: the hash covers path, size, mtime and model, so a changed file never reuses stems
function outDirFor(userData, input, model) {
  var h = crypto.createHash('sha1').update([input.path, input.size, Math.round(input.mtimeMs), model].join('\n')).digest('hex').slice(0, 8);
  var base = path.parse(input.path).name.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '').slice(0, 60) || 'audio';
  return path.join(userData, 'separation', base + '-' + h);
}

function buildArgs(o) {   // o: {script, input, out, model} -> the argument array after the python command
  var a = ['-u', o.script, o.input, '--out', o.out, '--model', o.model];
  return a;
}
function checkArgs(script, model) { return ['-u', script, '--check', '--model', model]; }

// ------------------------------------------------------------------ Python
function pythonCandidates(env, platform) {
  var list = [];
  if (env && env.HAVANTECHNO_PYTHON) list.push(env.HAVANTECHNO_PYTHON);
  if (platform === 'win32') list.push('py', 'python', 'python3');
  else list.push('python3', 'python');
  return list;
}
function run(spawn, cmd, args, o) {   // small helper: run to completion, collect output, never throws
  return new Promise(function (resolve) {
    var out = '', err = '', done = false, child;
    function end(r) { if (done) return; done = true; clearTimeout(timer); resolve(r); }
    var timer = setTimeout(function () { try { child.kill(); } catch (e) {} end({ code: null, out: out, err: err + 'timed out', timedOut: true }); }, (o && o.timeoutMs) || 30000);
    try { child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, env: (o && o.env) || process.env }); }
    catch (e) { return end({ code: null, out: '', err: String(e && e.message), spawnError: e }); }
    child.stdout.on('data', function (d) { out += d; });
    child.stderr.on('data', function (d) { err += d; });
    child.on('error', function (e) { end({ code: null, out: out, err: err + String(e && e.message), spawnError: e }); });
    child.on('close', function (code, signal) { end({ code: code, signal: signal, out: out, err: err }); });
  });
}
async function findPython(spawn, env, platform) {
  var cands = pythonCandidates(env, platform), tried = [], i;
  for (i = 0; i < cands.length; i++) {
    var r = await run(spawn, cands[i], ['-c', 'import sys;print("%d.%d.%d" % sys.version_info[:3])'], { timeoutMs: 10000 });
    var m = r.code === 0 && /^(\d+)\.(\d+)\.(\d+)/.exec(String(r.out).trim());
    if (m) {
      var v = [+m[1], +m[2]];
      if (v[0] > MIN_PY[0] || (v[0] === MIN_PY[0] && v[1] >= MIN_PY[1])) return { cmd: cands[i], version: m[0] };
      tried.push(cands[i] + ' ' + m[0] + ' (too old)');
    } else tried.push(cands[i]);
  }
  throw fail('python-missing', 'Python 3.8 or newer was not found (tried ' + tried.join(', ') + '). Install Python 3 from python.org, then run: python3 -m pip install numpy scipy demucs onnxruntime torch');
}

// ------------------------------------------------------------------ preflight and error mapping
function installCommand(py, missing) { return py + ' -m pip install ' + missing.join(' '); }

// info: the JSON separate.py --check printed; model: what was asked; ext: the input's extension
function preflightProblem(info, model, ext, py) {
  var missing = (info && info.missing) || [];
  if (missing.length) {
    // auto falls back to MDX-Net when demucs is the only gap and the MDX-Net packages are there
    if (model === 'auto' && info.mdxFallbackUsable && missing.every(function (m) { return m === 'demucs'; })) return null;
    return fail('packages-missing', 'Python package' + (missing.length > 1 ? 's' : '') + ' missing for ' + (model === 'mdx' ? 'MDX-Net' : model === 'htdemucs' ? 'HT-Demucs' : 'separation') + ': ' + missing.join(', ') + '. Install with: ' + installCommand(py, missing));
  }
  if (!/\.(wav|wave)$/i.test(ext) && info && !info.ffmpeg) {
    return fail('ffmpeg-missing', 'ffmpeg was not found (set FFMPEG or put it on PATH); it is needed to read ' + ext.replace(/^\./, '') + ' files. Convert the file to WAV, or install ffmpeg from ffmpeg.org.');
  }
  return null;
}

var NET = /urlopen error|URLError|HTTPError|Name or service not known|Temporary failure in name resolution|getaddrinfo|Connection (refused|reset|aborted|timed out)|Max retries|Tunnel connection failed|ProxyError|SSLError|CERTIFICATE_VERIFY|HTTP Error \d+|Remote end closed|timed out/i;
// code/signal/stderr tail of a failed separate.py run -> an Error. py is the python command (for install hints).
function mapFailure(r, model, py) {
  var text = String(r.err || '') + '\n' + String(r.out || ''), lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
  var last = lines.length ? lines[lines.length - 1].slice(0, 300) : '';
  var mod = /No module named ['"]?([A-Za-z0-9_.]+)/.exec(text);
  if (mod) {
    var top = mod[1].split('.')[0];
    return fail('packages-missing', 'Python package missing: ' + top + '. Install with: ' + installCommand(py, [top]));
  }
  if (/hash [0-9a-f]+ does not match|is not the Zenodo original/.test(text)) {
    return fail('weights-bad', 'A downloaded MDX-Net model file failed its checksum (' + last + '). Delete the .onnx files in ~/.cache/havantechno/models (or $HAVANTECHNO_MODELS) and run again.');
  }
  if (NET.test(text) || (r.code === 3 && /demucs failed/.test(text))) {
    var host = /fbaipublicfiles/.test(text) || model === 'htdemucs' ? 'dl.fbaipublicfiles.com (HT-Demucs weights)' : /downloading kuielab|githubusercontent|github\.com/i.test(text) || model === 'mdx' ? 'github.com (MDX-Net model files from TRvlvr/model_repo)' : 'dl.fbaipublicfiles.com or github.com';
    return fail('weights-missing', 'The separation model is not on this computer and could not be downloaded from ' + host + '. The first run needs a network connection to that host; run once online, then it works offline.');
  }
  if (/ffmpeg/i.test(text) && /(FileNotFoundError|No such file|not found|returned non-zero)/i.test(text)) {
    return fail('ffmpeg-missing', 'ffmpeg failed or was not found while reading the file. Convert the file to WAV, or install ffmpeg from ffmpeg.org.');
  }
  if (/MemoryError|out of memory|Cannot allocate memory/i.test(text) || r.signal === 'SIGKILL') {
    return fail('failed', 'Separation ran out of memory. Close other programs or try a shorter file.');
  }
  return fail('failed', 'Separation failed' + (r.code != null ? ' (exit ' + r.code + ')' : r.signal ? ' (' + r.signal + ')' : '') + (last ? ': ' + last : '.'));
}

// ------------------------------------------------------------------ progress
// separate.py prints "downloading <file>" (stderr), "<stem>: 12.3 s" (stdout) and "stems written to ..."; Demucs prints a
// tqdm bar ("45%|...") separated by carriage returns. Returns events {stage, note, done?, total?, line}.
function parseLine(line, state) {
  line = String(line).replace(/\u001b\[[0-9;]*[A-Za-z]/g, '').trim();
  if (!line) return null;
  var m;
  if ((m = /(\d{1,3})%\|/.exec(line)) || (m = /^(\d{1,3})%/.exec(line))) {
    var pc = Math.min(100, +m[1]);
    if (state.lastPct === pc) return null;
    state.lastPct = pc;
    return { stage: 'separate', note: 'HT-Demucs ' + pc + '%', done: pc, total: 100, line: line };
  }
  if ((m = /^downloading (\S+)/.exec(line))) return { stage: 'download', note: 'downloading ' + m[1] + ' (first run only)', line: line };
  if ((m = /^(drums|bass|other|vocals): ([\d.]+) s$/.exec(line))) {
    state.stemsDone = (state.stemsDone || 0) + 1;
    return { stage: 'separate', note: m[1] + ' done in ' + m[2] + ' s', done: state.stemsDone, total: state.stemsTotal || 3, line: line };
  }
  if (/^stems written to/.test(line)) return { stage: 'separate', note: 'stems written', line: line };
  if (/^separate\.py:/.test(line)) return { stage: 'separate', note: line.slice(12), line: line };
  return { stage: 'separate', note: line.slice(0, 160), line: line };
}
function splitChunks(buf, chunk) {   // line splitting over \n and \r, keeping the unfinished tail
  var s = buf + chunk, parts = s.split(/[\r\n]+/);
  return { lines: parts.slice(0, -1), rest: parts[parts.length - 1] };
}

// ------------------------------------------------------------------ the runner
// deps: {userData, script, spawn?, platform?, env?, fsp?}. run(path, {model}, onProgress) -> {stems, model, log, ...}.
function createRunner(deps) {
  var spawn = deps.spawn || childProcess.spawn, platform = deps.platform || process.platform, env = deps.env || process.env, fsp = deps.fsp || fs.promises;
  var current = null;

  function emit(cb, ev) { try { cb && cb(ev); } catch (e) { /* a dead renderer must not stop the run */ } }

  function killTree(child) {
    if (!child || child.killed && child._hvKilled) return;
    child._hvKilled = true;
    try {
      if (platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
      else if (child.pid) process.kill(-child.pid, 'SIGTERM');          // the group: separate.py starts demucs as a child
    } catch (e) { try { child.kill('SIGTERM'); } catch (e2) { /* gone */ } }
  }

  async function readResult(outDir, input) {
    var name = path.parse(input).name, info = JSON.parse(await fsp.readFile(path.join(outDir, name + '-stems.json'), 'utf8')), stems = [];
    STEM_ORDER.concat(Object.keys(info.stems || {})).forEach(function (st) {
      if (info.stems && info.stems[st] && !stems.some(function (s) { return s.name === st; })) stems.push({ name: st, path: info.stems[st] });
    });
    for (var i = 0; i < stems.length; i++) await fsp.stat(stems[i].path);   // throws when a listed stem is gone
    if (!stems.length) throw new Error('no stems listed');
    return { stems: stems, model: info.model || 'unknown', folder: outDir, attribution: info.attribution || '', seconds: info.seconds || {} };
  }

  async function runIt(rawPath, opts, onProgress) {
    var input = await validateInput(rawPath, fsp), model = normModel(opts && opts.model);
    var outDir = outDirFor(deps.userData, input, model), tail = [];
    emit(onProgress, { stage: 'prepare', note: 'checking ' + path.basename(input.path) });
    // an earlier run of this exact file and model: the stems are already there (stems.json is written last)
    try {
      var cached = await readResult(outDir, input.path);
      emit(onProgress, { stage: 'done', note: 'reusing the stems separated earlier', done: 1, total: 1 });
      cached.log = 'reused ' + outDir; cached.cached = true;
      return cached;
    } catch (e) { /* not there: separate */ }
    var py = await findPython(spawn, env, platform);
    emit(onProgress, { stage: 'prepare', note: 'using Python ' + py.version + ' (' + py.cmd + ')' });
    var chk = await run(spawn, py.cmd, checkArgs(deps.script, model), { timeoutMs: 60000, env: env }), info = null;
    try { info = JSON.parse(chk.out); } catch (e) { /* an old Python or a broken install */ }
    if (!info) throw mapFailure(chk, model, py.cmd.indexOf('py') === 0 && py.cmd.length <= 2 ? 'python' : py.cmd);
    var problem = preflightProblem(info, model, path.extname(input.path), py.cmd);
    if (problem) throw problem;
    if (model === 'auto' && info.missing && info.missing.length) emit(onProgress, { stage: 'prepare', note: 'HT-Demucs is not installed; using MDX-Net (pip install demucs for the better separator)' });
    await fsp.mkdir(outDir, { recursive: true });
    var args = buildArgs({ script: deps.script, input: input.path, out: outDir, model: model });
    var state = { stemsTotal: 3 }, r = await new Promise(function (resolve) {
      var child, outBuf = '', errBuf = '', collected = { out: '', err: '' };
      try { child = spawn(py.cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, detached: platform !== 'win32', env: Object.assign({}, env, { PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8' }) }); }
      catch (e) { return resolve({ code: null, out: '', err: String(e && e.message), spawnError: e }); }
      current.child = child;
      function feed(which, chunk) {
        var s = splitChunks(which === 'out' ? outBuf : errBuf, chunk);
        if (which === 'out') outBuf = s.rest; else errBuf = s.rest;
        s.lines.forEach(function (l) {
          var ev = parseLine(l, state);
          if (!ev) return;
          tail.push(ev.line); if (tail.length > 60) tail.shift();
          emit(onProgress, ev);
        });
      }
      child.stdout.on('data', function (d) { var t = String(d); collected.out = (collected.out + t).slice(-8000); feed('out', t); });
      child.stderr.on('data', function (d) { var t = String(d); collected.err = (collected.err + t).slice(-8000); feed('err', t); });
      child.on('error', function (e) { resolve({ code: null, out: collected.out, err: collected.err + String(e && e.message), spawnError: e }); });
      child.on('close', function (code, signal) { resolve({ code: code, signal: signal, out: collected.out, err: collected.err }); });
    });
    if (current.cancelled) { fsp.rm && fsp.rm(outDir, { recursive: true, force: true }).catch(function () {}); throw fail('cancelled', 'Separation cancelled.'); }
    if (r.spawnError) throw fail('python-missing', 'Python could not be started (' + (r.spawnError.code || r.spawnError.message) + '). Install Python 3 from python.org, then run: ' + installCommand(py.cmd, ['numpy', 'scipy', 'demucs', 'onnxruntime', 'torch']));
    if (r.code !== 0) { fsp.rm && fsp.rm(outDir, { recursive: true, force: true }).catch(function () {}); throw mapFailure(r, model, py.cmd); }
    var res;
    try { res = await readResult(outDir, input.path); }
    catch (e) { throw fail('failed', 'Separation finished but its stems could not be read from ' + outDir + ' (' + (e && e.message) + ').'); }
    res.log = tail.join('\n');
    emit(onProgress, { stage: 'done', note: res.stems.length + ' stems · ' + res.model, done: 1, total: 1 });
    return res;
  }

  return {
    busy: function () { return !!current; },
    separate: function (rawPath, opts, onProgress) {
      if (current) return Promise.reject(fail('busy', 'A separation is already running. Wait for it to finish or cancel it.'));
      current = { child: null, cancelled: false };
      var cur = current;
      return runIt(rawPath, opts || {}, onProgress).then(function (v) { if (current === cur) current = null; return v; },
        function (e) { if (current === cur) current = null; throw e; });
    },
    // true when a run was cancelled; the pending separate() then rejects with [cancelled]
    cancel: function () {
      if (!current) return false;
      current.cancelled = true;
      killTree(current.child);
      return true;
    },
    dispose: function () { if (current) { current.cancelled = true; killTree(current.child); } }
  };
}

module.exports = {
  AUDIO_EXT: AUDIO_EXT, MODELS: MODELS, validateInput: validateInput, normModel: normModel, outDirFor: outDirFor,
  buildArgs: buildArgs, checkArgs: checkArgs, pythonCandidates: pythonCandidates, findPython: findPython,
  preflightProblem: preflightProblem, mapFailure: mapFailure, parseLine: parseLine, splitChunks: splitChunks,
  installCommand: installCommand, createRunner: createRunner, fail: fail
};
