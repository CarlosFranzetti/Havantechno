#!/usr/bin/env node
/* Static server for the Havantechno repo root.
 * Sends Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp
 * so that SharedArrayBuffer is available. Usage: node tools/serve.js [port]   (PORT env also works)
 * Default port 8000. Prints the app URL. */
'use strict';
var http = require('http');
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var PORT = parseInt(process.argv[2] || process.env.PORT || '8000', 10);

var TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8',
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

var server = http.createServer(function (req, res) {
  var pathname;
  try { pathname = decodeURIComponent(req.url.split('?')[0].split('#')[0]); }
  catch (e) { return send(res, 400, 'Bad request'); }
  if (pathname.indexOf('\0') >= 0) return send(res, 400, 'Bad request');
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
  console.log('Havantechno static server, root ' + ROOT);
  console.log('App: http://localhost:' + PORT + '/app/index.html');
});
