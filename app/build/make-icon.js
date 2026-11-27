#!/usr/bin/env node
/* app/build/make-icon.js: draws the Havantechno app icon (original artwork, no third-party material) as a 1024 px PNG
 * with headless Chromium (Playwright). The mark is the initial H in the app's brand pink (#ff5fa2) on its dark ground
 * (#0b0b10): two stems and a crossbar made of four step-sequencer cells, one of them lit.
 * electron-builder derives the .icns, .ico and Linux sizes from build/icon.png.
 *
 * Usage: node app/build/make-icon.js [out.png]      (default: app/build/icon.png)
 * Env:   PLAYWRIGHT_PATH (default /opt/node22/lib/node_modules/playwright), CHROMIUM_PATH (default /opt/pw-browsers/chromium) */
'use strict';
var fs = require('fs'), path = require('path');
var OUT = path.resolve(process.argv[2] || path.join(__dirname, 'icon.png'));
var SIZE = 1024;

var HTML = '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}</style>' +
  '<canvas id="c" width="' + SIZE + '" height="' + SIZE + '"></canvas><script>' +
  'var c=document.getElementById("c"),x=c.getContext("2d");' +
  'function rr(a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath();}' +
  // ground: rounded square with the 10% margin the desktop platforms expect
  'rr(64,64,896,896,200);x.fillStyle="#0b0b10";x.fill();' +
  'rr(64,64,896,896,200);x.lineWidth=10;x.strokeStyle="#2a2a36";x.stroke();' +
  // H: stems and four crossbar cells
  'var P="#ff5fa2",D="#4a2a3c";' +
  'rr(268,262,134,500,28);x.fillStyle=P;x.fill();rr(622,262,134,500,28);x.fillStyle=P;x.fill();' +
  'for(var i=0;i<4;i++){rr(406+i*55,432,47,160,10);x.fillStyle=(i==2)?P:D;x.fill();}' +
  '</script>';

(async function () {
  var pw = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
  var exe = process.env.CHROMIUM_PATH || '';
  var opts = { headless: true };
  if (exe) { try { if (fs.statSync(exe).isFile()) opts.executablePath = exe; } catch (e) { /* a folder: let Playwright find its own */ } }
  var browser = await pw.chromium.launch(opts);
  try {
    var page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
    await page.setContent(HTML);
    var png = await page.locator('#c').screenshot({ omitBackground: true });
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, png);
    console.log('wrote ' + OUT + ' (' + png.length + ' bytes, ' + SIZE + 'x' + SIZE + ')');
  } finally { await browser.close(); }
})().catch(function (e) { console.error(e && e.stack || e); process.exit(1); });
