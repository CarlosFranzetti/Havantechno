#!/usr/bin/env node
/* Static server for the Recut repo root.
 * Sends Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp
 * so that SharedArrayBuffer is available. Usage: node tools/serve.js [port]   (PORT env also works)
 * Default port 8000. Prints the app URL.
 *
 * It also answers the app's separation requests, so a browser can split a file into stems on this computer without the
 * desktop shell (the browser cannot run Python). Loopback clients only, and only pages this server itself served:
 *   GET    /api/separate              -> {available: true, busy}
 *   POST   /api/separate?name=&model= -> the body is the audio file; {id, input: <url of the stored copy>}; 409 while one runs
 *   GET    /api/separate/<id>         -> {state: running|done|failed|cancelled, progress, error, model, log, stems: [{name, url}], residual}
 *   DELETE /api/separate/<id>         -> cancels a running job
 * The work is done by app/shell/separation.js (the runner the desktop shell uses) and tools/separate.py. Files go to
 * tools/out/separation/ (git-ignored), which this server also serves, so a stem's url keeps working after a restart. */
'use strict';
var http = require('http');
var fs = require('fs');
var path = require('path');

var crypto = require('crypto');

var ROOT = path.resolve(__dirname, '..');
var PORT = parseInt(process.argv[2] || process.env.PORT || '8000', 10);

var TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8', '.sfz': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.wasm': 'application/wasm'
};

function send(res, code, body, type) {
  res.writeHead(code, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

// ------------------------------------------------------------------ separation for the browser
var SEP_DIR = path.join(ROOT, 'tools', 'out', 'separation');
var AUDIO_EXT = /\.(wav|wave|mp3|ogg|oga|opus|flac|m4a|aac|aif|aiff|webm)$/i;
var MAX_UPLOAD = 2 * 1024 * 1024 * 1024;
var jobs = {}, runner = null;
function json(res, code, obj) { send(res, code, JSON.stringify(obj), 'application/json; charset=utf-8'); }
function getRunner() {
  if (!runner) runner = require(path.join(ROOT, 'app', 'shell', 'separation.js')).createRunner({ userData: SEP_DIR, script: path.join(ROOT, 'tools', 'separate.py') });
  return runner;
}
function urlOf(file) {
  var rel = path.relative(ROOT, file);
  if (!rel || rel.indexOf('..') === 0 || path.isAbsolute(rel)) return null;
  return '/' + rel.split(path.sep).map(encodeURIComponent).join('/');
}
function loopback(req) {
  var a = String((req.socket && req.socket.remoteAddress) || '');
  return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
}
// a page from another site must not start work here: when the browser names an origin, it has to be this server
function sameOrigin(req) {
  var o = req.headers.origin;
  if (!o) return true;
  return o === 'http://localhost:' + PORT || o === 'http://127.0.0.1:' + PORT || o === 'http://[::1]:' + PORT;
}
function jobView(j) {
  return { id: j.id, state: j.state, progress: j.progress, error: j.error, model: j.model, log: j.log, stems: j.stems, residual: j.residual, input: j.input };
}
function api(req, res, pathname) {
  if (!loopback(req)) return json(res, 403, { error: 'separation is offered to this computer only' });
  if (!sameOrigin(req)) return json(res, 403, { error: 'separation is offered to pages from this server only' });
  var parts = pathname.split('/').filter(Boolean);            // ['api', 'separate', id?]
  if (parts.length === 2 && req.method === 'GET') return json(res, 200, { available: true, busy: !!(runner && runner.busy()) });
  if (parts.length === 2 && req.method === 'POST') {
    var q = {};
    String(req.url.split('?')[1] || '').split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) { try { q[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); } catch (e) {} } });
    var base = path.basename(String(q.name || 'audio.wav')).replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '').slice(-80) || 'audio.wav';
    if (!AUDIO_EXT.test(base)) return json(res, 400, { error: 'not an audio file name: ' + base });
    if (getRunner().busy()) return json(res, 409, { error: 'a separation is already running' });
    var len = parseInt(req.headers['content-length'] || '0', 10);
    if (len > MAX_UPLOAD) return json(res, 413, { error: 'the file is larger than 2 GiB' });
    var id = crypto.randomBytes(8).toString('hex'), dir = path.join(SEP_DIR, 'uploads', id), file = path.join(dir, base);
    fs.mkdirSync(dir, { recursive: true });
    var out = fs.createWriteStream(file), got = 0, dead = false;
    var stop = function (code, msg) { if (dead) return; dead = true; try { out.destroy(); } catch (e) {} try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} json(res, code, { error: msg }); };
    req.on('data', function (c) { got += c.length; if (got > MAX_UPLOAD) { stop(413, 'the file is larger than 2 GiB'); req.destroy(); } });
    req.on('error', function () { stop(400, 'the upload was interrupted'); });
    out.on('error', function (e) { stop(500, 'could not store the upload: ' + e.message); });
    req.pipe(out);
    out.on('finish', function () {
      if (dead) return;
      if (!got) return stop(400, 'the upload was empty');
      var j = jobs[id] = { id: id, state: 'running', progress: { stage: 'start', done: 0, total: 1, note: '' }, error: null, model: null, log: '', stems: [], residual: null, input: urlOf(file) };
      var r;
      try { r = getRunner().separate(file, { model: q.model || 'auto' }, function (ev) { j.progress = ev || j.progress; }); }
      catch (e) { r = Promise.reject(e); }
      Promise.resolve(r).then(function (v) {
        j.state = 'done'; j.model = (v && v.model) || null; j.log = String((v && v.log) || '').slice(-4000);
        j.stems = ((v && v.stems) || []).map(function (st) { return { name: st.name, url: urlOf(st.path) }; }).filter(function (st) { return st.url; });
        var rs = v && v.residual;
        if (rs && rs.path && urlOf(rs.path)) j.residual = { url: urlOf(rs.path), rmsDbfs: rs.rmsDbfs == null ? null : rs.rmsDbfs, relativeDb: rs.relativeDb == null ? null : rs.relativeDb, peak: rs.peak == null ? null : rs.peak };
      }, function (e) {
        j.state = /^\[cancelled\]/.test(String(e && e.message)) ? 'cancelled' : 'failed';
        j.error = String((e && e.message) || e);
      });
      json(res, 200, { id: id, input: j.input });
    });
    return;
  }
  if (parts.length === 3 && /^[0-9a-f]{16}$/.test(parts[2]) && jobs[parts[2]]) {
    var job = jobs[parts[2]];
    if (req.method === 'GET') return json(res, 200, jobView(job));
    if (req.method === 'DELETE') { if (job.state === 'running') getRunner().cancel(); return json(res, 200, jobView(job)); }
  }
  return json(res, 404, { error: 'no such separation request' });
}

var server = http.createServer(function (req, res) {
  var pathname;
  try { pathname = decodeURIComponent(req.url.split('?')[0].split('#')[0]); }
  catch (e) { return send(res, 400, 'Bad request'); }
  if (pathname.indexOf('\0') >= 0) return send(res, 400, 'Bad request');
  if (pathname === '/api/separate' || pathname.indexOf('/api/separate/') === 0) return api(req, res, pathname);
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
  var file = path.normalize(path.join(ROOT, pathname));
  if (file !== ROOT && file.indexOf(ROOT + path.sep) !== 0) return send(res, 403, 'Forbidden');
  fs.stat(file, function (err, st) {
    if (!err && st.isDirectory()) {
      if (pathname.charAt(pathname.length - 1) !== '/') {
        res.writeHead(301, { Location: pathname + '/' });
        return res.end();
      }
      file = path.join(file, 'index.html');
    }
    fs.readFile(file, function (err2, data) {
      if (err2) return send(res, 404, 'Not found: ' + pathname);
      var type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
      send(res, 200, req.method === 'HEAD' ? '' : data, type);
    });
  });
});

server.on('error', function (e) {
  console.error('serve.js: ' + e.message);
  process.exit(1);
});

server.listen(PORT, function () {
  console.log('Recut static server, root ' + ROOT);
  console.log('App: http://localhost:' + PORT + '/app/index.html');
});
