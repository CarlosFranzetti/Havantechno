#!/usr/bin/env node
/* tools/solo-bundle.js: turn a single-instrument page under app/solo/ into a publishable bundle, lint it, and
 * (with --test) run it in headless Chromium. See tools/README.md ("solo-bundle.js").
 *
 *   node tools/solo-bundle.js <page.html> [--out tools/out/bundles/<name>] [--note "text"] [--test]
 *   node tools/solo-bundle.js --all [--test]
 *   --start-selector "<css>"   tried first when --test looks for the start control
 *   --keep-going               with --all: continue after a failure (default already does; exit code is still 1)
 *   --asset-dir <pub>=<src>    copy every file of folder <src> into the bundle under <pub> (sample sets); repeatable
 *   --write-file <pub>=<text>  write a small generated file into the bundle (an asset manifest); repeatable
 *
 * No dependencies beyond Node and Playwright (found by require('playwright'), then /opt/node-tools).
 * Output (tools/out/ is git-ignored build output): <bundle>/<page>.html (the fragment), copied files,
 * files.json, test.html, and with --test one screenshot per size.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'app');
const SOLO = path.join(APP, 'solo');
const GATE_META = '<meta name="claude:viewport-fit-sides" content="cover">';
const SIDE_L = 'max(16px, env(safe-area-inset-left, 0px))';
const SIDE_R = 'max(16px, env(safe-area-inset-right, 0px))';
const START_SELECTORS = ['#so-start', '[data-solo-start]', '#start', 'button.so-start', '.so-start'];

// ------------------------------------------------------------------ small helpers
function die(msg) { throw new Error(msg); }
function rel(p) { return path.relative(ROOT, p) || '.'; }
function isAbsUrl(u) { return /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(u) && !/^data:/i.test(u); }
function attr(tag, name) {
  const m = new RegExp('\\s' + name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i').exec(tag);
  return m ? (m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4]) : null;
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// ------------------------------------------------------------------ HTML pieces
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

function parsePage(html) {
  const out = { title: '', links: [], scripts: [], body: '' };
  const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  out.title = t ? t[1].trim() : '';
  const head = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(html);
  const bodyM = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  if (!bodyM) die('page has no <body>');
  let body = bodyM[1].replace(/<!--[\s\S]*?-->/g, '');
  const headTxt = head ? head[1].replace(/<!--[\s\S]*?-->/g, '') : '';
  // stylesheets (head or body), in order; inline <style> kept in order too
  const sheets = [];
  const reSheet = /<link\b[^>]*>|<style\b[^>]*>[\s\S]*?<\/style>/gi;
  for (const src of [headTxt, body]) {
    let m;
    while ((m = reSheet.exec(src))) {
      if (/^<link/i.test(m[0])) {
        if (/rel\s*=\s*["']?stylesheet/i.test(m[0])) sheets.push({ href: attr(m[0], 'href') });
        else if (/rel\s*=\s*["']?(icon|manifest|preload|modulepreload)/i.test(m[0])) { /* dropped: nothing to load */ }
      } else sheets.push({ inline: m[0].replace(/^<style[^>]*>|<\/style>$/gi, '') });
    }
  }
  out.sheets = sheets;
  body = body.replace(reSheet, '');
  // scripts (kept in order, moved to the end)
  body = body.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (all, a, inner) => {
    const src = attr('<s ' + a + '>', 'src');
    out.scripts.push(src ? { src, type: attr('<s ' + a + '>', 'type') } : { inline: inner, type: attr('<s ' + a + '>', 'type') });
    return '';
  });
  out.body = body.replace(/\n{3,}/g, '\n\n').trim();
  // scripts in <head> too
  for (const m of headTxt.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const src = attr('<s ' + m[1] + '>', 'src');
    out.scripts.unshift(src ? { src } : { inline: m[2] });
  }
  // the host wraps the fragment in its own <body>, so attributes on the page's <body> (data-machine on the drum pages)
  // are set by a first inline script instead
  const bodyAttrs = (/<body\b([^>]*)>/i.exec(html) || [0, ''])[1];
  const sets = [];
  for (const m of bodyAttrs.matchAll(/([a-zA-Z_:][-\w:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    sets.push('document.body.setAttribute(' + JSON.stringify(m[1]) + ', ' + JSON.stringify(m[2] != null ? m[2] : m[3]) + ');');
  }
  if (sets.length) out.scripts.unshift({ inline: sets.join(' ') });
  return out;
}

// top-level elements of the body markup: [{tag, id, classes}]
function topLevel(markup) {
  const res = [], re = /<(\/?)([a-z][a-z0-9-]*)\b([^>]*?)(\/?)>/gi;
  let depth = 0, m;
  while ((m = re.exec(markup))) {
    const closing = !!m[1], tag = m[2].toLowerCase(), self = !!m[4] || VOID.has(tag);
    if (closing) { depth--; continue; }
    if (depth === 0) {
      const cls = attr('<x ' + m[3] + '>', 'class');
      res.push({ tag, id: attr('<x ' + m[3] + '>', 'id'), classes: cls ? cls.split(/\s+/).filter(Boolean) : [] });
    }
    if (!self) depth++;
  }
  return res;
}

// ------------------------------------------------------------------ CSS
// Minimal parser: top-level nodes {sel, body} | {at, inner:[nodes]} | {raw}. Comments dropped.
function parseCss(text) {
  text = text.replace(/\/\*[\s\S]*?\*\//g, '');
  let i = 0;
  function block() {
    const nodes = [];
    while (i < text.length) {
      while (i < text.length && /\s/.test(text[i])) i++;
      if (i >= text.length || text[i] === '}') break;
      let j = i, q = null;
      while (j < text.length && (q || (text[j] !== '{' && text[j] !== ';' && text[j] !== '}'))) {
        if (q) { if (text[j] === q) q = null; } else if (text[j] === '"' || text[j] === "'") q = text[j];
        j++;
      }
      const head = text.slice(i, j).trim();
      if (text[j] === ';') { nodes.push({ raw: head + ';' }); i = j + 1; continue; }
      if (text[j] !== '{') { i = j; continue; }
      i = j + 1;
      if (/^@(media|supports|layer|container)/i.test(head)) {
        const inner = block();
        i++; // closing }
        nodes.push({ at: head, inner });
      } else {
        let depth = 1, s = i, q2 = null;
        while (i < text.length && depth) {
          const c = text[i];
          if (q2) { if (c === q2) q2 = null; } else if (c === '"' || c === "'") q2 = c;
          else if (c === '{') depth++; else if (c === '}') depth--;
          i++;
        }
        const body = text.slice(s, i - 1);
        if (head.startsWith('@')) nodes.push({ raw: head + '{' + body + '}' });
        else nodes.push({ sel: head, body });
      }
    }
    return nodes;
  }
  return block();
}
function parseDecls(body) {
  const out = []; let cur = '', depth = 0, q = null;
  for (const c of body) {
    if (q) { cur += c; if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '(') depth++; if (c === ')') depth--;
    if (c === ';' && !depth) { push(cur); cur = ''; } else cur += c;
  }
  push(cur);
  function push(s) { s = s.trim(); if (!s) return; const k = s.indexOf(':'); if (k < 0) return; out.push([s.slice(0, k).trim(), s.slice(k + 1).trim()]); }
  return out;
}
function splitSpaces(v) {   // top-level space split (keeps parentheses together)
  const out = []; let cur = '', d = 0;
  for (const c of v) { if (c === '(') d++; if (c === ')') d--; if (/\s/.test(c) && !d) { if (cur) out.push(cur); cur = ''; } else cur += c; }
  if (cur) out.push(cur);
  return out;
}
function sidesOf(v) {
  const p = splitSpaces(v);
  if (p.length === 1) return [p[0], p[0], p[0], p[0]];
  if (p.length === 2) return [p[0], p[1], p[0], p[1]];
  if (p.length === 3) return [p[0], p[1], p[2], p[1]];
  return p.slice(0, 4);
}
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\([^)]*\)/g;
function normColor(c) { return c.toLowerCase().replace(/\s+/g, ''); }

function processCss(text, info) {
  // info: {own:bool, wrappers:[{tag,id,classes}], rootVars: Map (shared), colors: Map(norm -> token name), errors:[]}
  const nodes = parseCss(text);
  function isWrapper(sel) {
    sel = sel.trim();
    if (/[\s>+~[:]/.test(sel)) return false;
    return info.wrappers.some(w => (sel[0] === '.' && w.classes.includes(sel.slice(1))) || (sel[0] === '#' && w.id === sel.slice(1)) || (/^[a-z]/i.test(sel) && w.tag === sel.toLowerCase()));
  }
  function tokenise(v) {
    if (!info.own) return v;
    return v.replace(COLOR_RE, c => {
      const n = normColor(c);
      let tok = info.colors.get(n);
      if (!tok) { tok = '--c-' + n.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); info.colors.set(n, tok); info.rootVars.set(tok, c); }
      return 'var(' + tok + ')';
    });
  }
  function ruleOut(sel, decls) {
    return decls.length ? sel + ' { ' + decls.map(d => d[0] + ': ' + d[1] + ';').join(' ') + ' }' : '';
  }
  function walk(list) {
    const out = [];
    for (const n of list) {
      if (n.raw) { out.push(n.raw); continue; }
      if (n.at) { const inner = walk(n.inner).filter(Boolean); if (inner.length) out.push(n.at + ' {\n' + inner.join('\n') + '\n}'); continue; }
      const sels = n.sel.split(',').map(s => s.trim());
      let decls = parseDecls(n.body);
      // :root: collect tokens, drop the rule (one bare :root is written at the top)
      if (sels.every(s => s === ':root')) {
        for (const [k, v] of decls) if (/^--/.test(k)) { info.rootVars.set(k, v); const nc = normColor(v); if (COLOR_RE.test(v) && v.match(COLOR_RE).length === 1 && v.trim().length === v.match(COLOR_RE)[0].length) { if (!info.colors.has(nc)) info.colors.set(nc, k); } COLOR_RE.lastIndex = 0; }
        continue;
      }
      if (info.own) {
        if (sels.every(s => s === 'html' || s === 'body')) {
          decls = decls.filter(([k]) => !/^(margin|min-height|padding)(-|$)/.test(k));
        } else if (sels.length === 1 && isWrapper(sels[0])) {
          const get = k => (decls.find(d => d[0] === k) || [])[1];
          const fixed = /^fixed$/.test(get('position') || '') && /^(0|0px)$/.test(get('inset') || '');
          const pad = get('padding');
          if (fixed) {
            const p = pad ? sidesOf(pad) : ['0px', '0px', '0px', '0px'];
            const np = ['top', 'right', 'bottom', 'left'].map((s, k) => 'calc(' + p[k] + ' + env(safe-area-inset-' + s + ', 0px))').join(' ');
            decls = decls.filter(([k]) => k !== 'padding'); decls.push(['padding', np]);
          } else {
            decls = decls.filter(([k]) => !/^padding-(left|right|inline)/.test(k));
            if (pad) { const p = sidesOf(pad); p[1] = '0'; p[3] = '0'; decls = decls.map(d => d[0] === 'padding' ? ['padding', p.join(' ')] : d); }
          }
        }
        decls = decls.map(([k, v]) => [k, tokenise(v)]);
      }
      out.push(ruleOut(n.sel, decls));
    }
    return out;
  }
  const css = walk(nodes).filter(Boolean).join('\n');
  // url() references that are not data: are a problem once the CSS is inlined
  for (const m of css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
    if (/^data:/i.test(m[2]) || m[2][0] === '#') continue;
    info.errors.push('CSS url(' + m[2] + ') is not supported in an inlined stylesheet');
  }
  if (/@import/i.test(css)) info.errors.push('CSS @import is not supported');
  return css;
}

// ------------------------------------------------------------------ build
function resolvePublished(pageDir, src) {
  const clean = src.replace(/[?#].*$/, '');
  const abs = path.resolve(pageDir, clean);
  let pub;
  if (abs.startsWith(pageDir + path.sep)) pub = path.relative(pageDir, abs);
  else if (abs.startsWith(APP + path.sep)) pub = path.relative(APP, abs);
  else die('reference outside app/: ' + src);
  return { abs, pub: pub.split(path.sep).join('/') };
}

// the module files the engine loads at run time (worklets.js's FILES), read from its own source
function workletFiles(workletsAbs) {
  const src = fs.readFileSync(workletsAbs, 'utf8');
  let files = null;
  try {
    const sb = { console, document: { currentScript: { src: 'http://x/engine/worklets.js' } } };
    sb.window = sb; sb.globalThis = sb;
    vm.runInNewContext(src, sb, { timeout: 2000 });
    if (sb.Worklets && Array.isArray(sb.Worklets.files)) files = sb.Worklets.files;
  } catch (e) { /* fall through to the regex */ }
  if (!files) { const m = /FILES\s*=\s*\[([^\]]*)\]/.exec(src); if (m) files = [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map(x => x[1]); }
  if (!files || !files.length) die('could not read the worklet file list from ' + rel(workletsAbs));
  return files;
}

function build(pageArg, opts) {
  const pageAbs = path.resolve(pageArg);
  if (!fs.existsSync(pageAbs)) die('no such page: ' + pageArg);
  const pageDir = path.dirname(pageAbs);
  const name = path.basename(pageAbs).replace(/\.html?$/i, '');
  const outDir = path.resolve(opts.out || path.join(ROOT, 'tools', 'out', 'bundles', name));
  const html = fs.readFileSync(pageAbs, 'utf8');
  const pg = parsePage(html);
  const warnings = [], copy = new Map();   // published path -> source abs
  function need(src, what) {
    if (isAbsUrl(src)) die(what + ' loads from another host: ' + src);
    const r = resolvePublished(pageDir, src);
    if (!fs.existsSync(r.abs)) die(what + ' not found: ' + src);
    if (copy.has(r.pub) && copy.get(r.pub) !== r.abs) die('two different files publish as ' + r.pub);
    copy.set(r.pub, r.abs);
    return r;
  }
  const title = pg.title || name;
  // markup: no absolute URLs in src/href
  for (const m of pg.body.matchAll(/\s(?:src|href|action|poster)\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
    const u = m[2] !== undefined ? m[2] : m[3];
    if (isAbsUrl(u)) die('markup loads from another host: ' + u);
    if (/\.\./.test(u)) die('markup has ".." in a URL: ' + u);
    if (u[0] !== '#' && !/^data:/i.test(u)) warnings.push('markup references ' + u + ' (not copied)');
  }
  // stylesheets
  // solo.js builds its header, bar, panel box, help and gate into <body> when the page has none, so those classes count too
  const info = { wrappers: topLevel(pg.body).concat(['so-head', 'so-bar', 'so-panel', 'so-help', 'so-gate'].map(c => ({ tag: '', id: null, classes: [c] }))), rootVars: new Map(), colors: new Map(), errors: [] };
  const cssParts = [];
  for (const s of pg.sheets) {
    let text, own = true;
    if (s.href) { const r = need(s.href, 'stylesheet'); text = fs.readFileSync(r.abs, 'utf8'); own = !r.abs.startsWith(path.join(APP, 'ui') + path.sep); copy.delete(r.pub); }
    else text = s.inline;
    // seed colour map with this sheet's :root first so tokens are reused by value
    const i2 = Object.assign({}, info, { own });
    cssParts.push(processCss(text, i2));
  }
  if (info.errors.length) die(info.errors.join('; '));
  // body colours from tokens
  const hasBg = info.rootVars.has('--bg'), hasFg = info.rootVars.has('--fg');
  if (!hasBg) info.rootVars.set('--bg', '#111114');
  if (!hasFg) info.rootVars.set('--fg', '#ecebe6');
  if (!info.rootVars.has('--dim')) info.rootVars.set('--dim', '#9a9aa4');
  const rootCss = ':root {\n  color-scheme: dark;\n' + [...info.rootVars].map(([k, v]) => '  ' + k + ': ' + v + ';').join('\n') + '\n}';
  const bundleCss = [
    'body { background: var(--bg); color: var(--fg); padding-block: 8px; padding-left: ' + SIDE_L + '; padding-right: ' + SIDE_R + '; overflow-x: hidden; }',
    '.bundle-note { color: var(--dim); font-size: 12px; margin: 0; padding: 4px 0 16px; max-width: 900px; }'
  ].join('\n');
  const css = [rootCss, ...cssParts, bundleCss].join('\n');

  // scripts
  const scriptTags = [], own = [];
  let workletsAbs = null;
  for (const s of pg.scripts) {
    if (s.inline !== undefined) {
      if (/<\/script/i.test(s.inline)) die('inline script contains </script');
      scriptTags.push('<script' + (s.type ? ' type="' + s.type + '"' : '') + '>' + s.inline + '</script>');
      own.push({ name: '(inline)', text: s.inline });
    } else {
      const r = need(s.src, 'script');
      if (/\.\./.test(r.pub)) die('".." left in ' + r.pub);
      scriptTags.push('<script' + (s.type ? ' type="' + s.type + '"' : '') + ' src="' + r.pub + '"></script>');
      if (path.basename(r.abs) === 'worklets.js') workletsAbs = r.abs;
    }
  }
  if (workletsAbs) {
    const dir = path.dirname(workletsAbs);
    for (const f of workletFiles(workletsAbs)) {
      const abs = path.join(dir, 'worklets', f);
      if (!fs.existsSync(abs)) die('worklet module missing: ' + rel(abs));
      copy.set(path.relative(APP, abs).split(path.sep).join('/'), abs);
    }
  }
  const note = opts.note ? '\n<p class="bundle-note">' + esc(opts.note) + '</p>' : '';
  const fragment = '<title>' + esc(title) + '</title>\n' + GATE_META + '\n<style>\n' + css + '\n</style>\n' + pg.body + note + '\n' + scriptTags.join('\n') + '\n';

  // code scans (warnings and hard failures)
  const errors = [];
  for (const [pub, abs] of copy) {
    if (!/\.js$/.test(pub) || /\/worklets\//.test(pub)) continue;
    const t = fs.readFileSync(abs, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    if (/(^|[^.\w$])(?:window\.)?(?:alert|confirm|prompt)\s*\(/.test(t)) errors.push(pub + ': uses alert, confirm or prompt');
    if (/createObjectURL|\.download\s*=|setAttribute\(\s*['"]download['"]/.test(t)) warnings.push(pub + ': can start a download (the hosted page should offer "Copy as text" instead)');
    if (/\.style\.display\s*=/.test(t)) warnings.push(pub + ': sets style.display (hide with the hidden attribute)');
  }
  for (const o of own) {
    if (/(^|[^.\w$])(?:alert|confirm|prompt)\s*\(/.test(o.text)) errors.push('inline script uses alert, confirm or prompt');
  }
  if (errors.length) die(errors.join('; '));

  // write
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const fragName = name + '.html';
  fs.writeFileSync(path.join(outDir, fragName), fragment);
  const filesMap = {};
  let total = Buffer.byteLength(fragment);
  for (const [pub, abs] of [...copy].sort()) {
    const dest = path.join(outDir, pub);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(abs, dest);
    filesMap[pub] = dest;
    total += fs.statSync(dest).size;
  }
  // extra assets the page loads at run time (sample sets, a manifest): copied as they are, never transformed
  for (const [pubDir, srcDir] of (opts && opts.assetDirs) || []) {
    const srcAbs = path.resolve(srcDir);
    if (!fs.existsSync(srcAbs) || !fs.statSync(srcAbs).isDirectory()) die('--asset-dir source is not a folder: ' + srcDir);
    if (/(^|\/)\.\.(\/|$)/.test(pubDir)) die('--asset-dir published dir must not contain ..');
    for (const f of fs.readdirSync(srcAbs).sort()) {
      const from = path.join(srcAbs, f);
      if (!fs.statSync(from).isFile()) continue;
      const pub = pubDir + '/' + f, dest = path.join(outDir, pub);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(from, dest);
      filesMap[pub] = dest;
      total += fs.statSync(dest).size;
    }
  }
  for (const [pub, text] of (opts && opts.writeFiles) || []) {
    if (/(^|\/)\.\.(\/|$)/.test(pub)) die('--write-file path must not contain ..');
    const dest = path.join(outDir, pub);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, text);
    filesMap[pub] = dest;
    total += Buffer.byteLength(text);
  }
  fs.writeFileSync(path.join(outDir, 'files.json'), JSON.stringify(filesMap, null, 2) + '\n');
  const skeleton = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
    '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}' +
    'body{margin:0;font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>\n' +
    '</head><body>\n' + fragment + '</body></html>\n';
  fs.writeFileSync(path.join(outDir, 'test.html'), skeleton);
  total += Buffer.byteLength(skeleton);
  return { name, title, outDir, fragName, fragment, files: Object.keys(filesMap), total, warnings };
}

// ------------------------------------------------------------------ lint (on what was written)
function lint(b) {
  const fails = [];
  const f = fs.readFileSync(path.join(b.outDir, b.fragName), 'utf8');
  const noScript = f.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, m => m.replace(/[^<>\s]/g, ''));
  for (const t of ['!doctype', 'html', 'head', 'body']) if (new RegExp('<' + t + '[\\s>]', 'i').test(noScript)) fails.push('fragment contains <' + t + '>');
  if (!/^<title>[^<]+<\/title>\n/.test(f)) fails.push('fragment does not begin with <title>');
  if (!f.includes('<title>' + esc(b.title) + '</title>\n' + GATE_META + '\n<style>')) fails.push('title, claude:viewport-fit-sides meta and <style> are not in order');
  const nStyle = (noScript.match(/<style[\s>]/gi) || []).length;
  if (nStyle !== 1) fails.push('expected exactly one <style>, found ' + nStyle);
  if (/<link\b/i.test(noScript)) fails.push('fragment has a <link>');
  const style = (/<style>([\s\S]*?)<\/style>/.exec(f) || [, ''])[1];
  if (!/:root\s*\{\s*color-scheme:\s*dark;/.test(style)) fails.push('bare :root with color-scheme: dark missing');
  if (!/body\s*\{[^}]*padding-left:\s*max\(16px, env\(safe-area-inset-left, 0px\)\);\s*padding-right:\s*max\(16px, env\(safe-area-inset-right, 0px\)\)/.test(style)) fails.push('body side padding rule missing');
  if (/(^|\n)\s*(html|body)[^{}]*\{[^}]*\b(margin|min-height)\b/.test(style)) fails.push('html/body rule still sets margin or min-height');
  if (/(^|\n)\s*body\s*\{[^}]*[^-]padding:/.test(style)) fails.push('body uses a padding shorthand');
  for (const m of f.matchAll(/\s(?:src|href)\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
    const u = m[2] !== undefined ? m[2] : m[3];
    if (/\.\./.test(u)) fails.push('".." in ' + u);
    if (isAbsUrl(u)) fails.push('absolute URL ' + u);
    if (u[0] === '#' || /^data:/i.test(u)) continue;
    if (!fs.existsSync(path.join(b.outDir, u))) fails.push('referenced file missing from the bundle: ' + u);
  }
  const map = JSON.parse(fs.readFileSync(path.join(b.outDir, 'files.json'), 'utf8'));
  for (const [pub, abs] of Object.entries(map)) if (!fs.existsSync(abs)) fails.push('files.json entry missing: ' + pub);
  return fails;
}

// ------------------------------------------------------------------ --test
function loadPlaywright() {
  for (const p of ['playwright', '/opt/node-tools/node_modules/playwright', 'playwright-core', '/opt/node-tools/node_modules/playwright-core']) {
    try { return require(p); } catch (e) { /* next */ }
  }
  die('Playwright not found (tried require("playwright") and /opt/node-tools)');
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
function serve(dir) {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      const abs = path.join(dir, p);
      if (!abs.startsWith(dir) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(abs).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

// runs in the page: find the solo framework's handle and read engine kind + master level
function pageProbe() {
  const w = window;
  function handle() {
    const names = ['Solo', 'HVTSolo', 'SoloPage', 'HVT303'];
    for (const n of names) if (w[n] && typeof w[n].host === 'function') return { name: n, h: w[n] };
    for (const k of Object.keys(w)) { try { const v = w[k]; if (/^HVT|^Solo/i.test(k) && v && typeof v.host === 'function') return { name: k, h: v }; } catch (e) { /* ignore */ } }
    return null;
  }
  const hh = handle();
  if (!hh) return { handle: null };
  let host = null, engine = null;
  try { host = hh.h.host(); } catch (e) { /* ignore */ }
  try {
    engine = hh.h.engine;
    if (typeof engine === 'function') engine = engine();
    if (typeof engine !== 'string' && host && host.engine) {
      const tr = host.engine().tracks, kinds = [];
      for (const id in tr) if (tr[id] && tr[id].inst && tr[id].inst.engine) kinds.push(tr[id].inst.engine);
      engine = kinds.includes('worklet') ? 'worklet' : (kinds.length ? kinds[0] : null);
    }
  } catch (e) { /* ignore */ }
  return { handle: hh.name, engine: typeof engine === 'string' ? engine : null, hasHost: !!host };
}
function readLevel() {
  const w = window;
  for (const k of ['Solo', 'HVTSolo', 'SoloPage', 'HVT303'].concat(Object.keys(w).filter(x => /^HVT|^Solo/i.test(x)))) {
    try { if (w[k] && typeof w[k].host === 'function') { const m = w[k].host().meter('master'); return Math.max(m.peak || 0, m.level || 0); } } catch (e) { /* next */ }
  }
  return -1;
}

async function testBundle(b, opts) {
  const pw = loadPlaywright();
  const { srv, port } = await serve(b.outDir);
  const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const sizes = [
    { id: 'desktop-1280x800', ctx: { viewport: { width: 1280, height: 800 } } },
    { id: 'iphone13', ctx: Object.assign({}, pw.devices['iPhone 13']) }
  ];
  const results = [];
  try {
    for (const sz of sizes) {
      const r = { size: sz.id, problems: [], info: {} };
      const context = await browser.newContext(sz.ctx);
      const page = await context.newPage();
      const pageErrors = [], consoleErrors = [], failed = [], external = [];
      page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('requestfailed', q => failed.push(q.url() + ' ' + (q.failure() && q.failure().errorText)));
      page.on('response', q => { if (q.status() >= 400) failed.push(q.url() + ' HTTP ' + q.status()); });
      page.on('request', q => { const u = q.url(); if (!/^(http:\/\/127\.0\.0\.1:|data:|blob:|about:)/.test(u)) external.push(u); });
      try {
        await page.goto('http://127.0.0.1:' + port + '/test.html', { waitUntil: 'load' });
        await page.waitForTimeout(400);
        const sels = (opts.startSelector ? [opts.startSelector] : []).concat(START_SELECTORS);
        let used = null;
        for (const s of sels) { const el = await page.$(s); if (el && await el.isVisible()) { used = s; break; } }
        if (!used) r.problems.push('no start control found (tried ' + sels.join(', ') + ')');
        else {
          r.info.start = used;
          if (sz.ctx.hasTouch) await page.tap(used); else await page.click(used);
        }
        await page.waitForTimeout(2500);
        const pr = await page.evaluate(pageProbe);
        r.info.handle = pr.handle; r.info.engine = pr.engine;
        if (!pr.handle) r.problems.push('no framework global with host() found on window (HVT303 today)');
        else if (pr.engine === 'worklet' || pr.engine === 'webaudio') { /* good: 'webaudio' is a page whose instruments are plain nodes by design (the drum machines) */ }
        else if (pr.engine === 'fallback' || pr.engine === 'approx') r.problems.push('engine is the approximate fallback (' + pr.engine + ')');
        else r.problems.push('engine kind unreadable or not worklet: ' + pr.engine);
        // sound: several meter reads over two seconds (the first read attaches the analyser and returns 0)
        const levels = [];
        for (let i = 0; i < 9; i++) { levels.push(await page.evaluate(readLevel)); await page.waitForTimeout(250); }
        r.info.levels = levels.map(x => +x.toFixed(4)).join(' ');
        r.info.peak = Math.max.apply(null, levels);
        if (r.info.peak <= 0.001) r.problems.push('no sound: master meter stayed at ' + r.info.peak);
        const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        r.info.overflow = ov;
        if (ov !== 0) r.problems.push('horizontal overflow of ' + ov + 'px');
        const shot = path.join(b.outDir, 'shot-' + sz.id + '.png');
        await page.screenshot({ path: shot });
        r.info.shot = shot;
      } catch (e) { r.problems.push('test error: ' + e.message); }
      if (pageErrors.length) r.problems.push('page errors: ' + pageErrors.join(' | '));
      if (consoleErrors.length) r.problems.push('console errors: ' + consoleErrors.join(' | '));
      if (failed.length) r.problems.push('failed requests: ' + failed.join(' | '));
      if (external.length) r.problems.push('requests to another host: ' + external.join(' | '));
      await context.close();
      results.push(r);
    }
  } finally { await browser.close(); srv.close(); }
  return results;
}

// ------------------------------------------------------------------ main
function parseArgs(argv) {
  const o = { pages: [], all: false, test: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') o.all = true;
    else if (a === '--test') o.test = true;
    else if (a === '--out') o.out = argv[++i];
    else if (a === '--note') o.note = argv[++i];
    else if (a === '--start-selector') o.startSelector = argv[++i];
    else if (a === '--asset-dir') {                       // --asset-dir <published dir>=<source dir>: every file in it travels with the page
      const v = argv[++i] || '', k = v.indexOf('=');
      if (k < 1) die('--asset-dir takes <published dir>=<source dir>');
      (o.assetDirs = o.assetDirs || []).push([v.slice(0, k).replace(/^\/+|\/+$/g, ''), v.slice(k + 1)]);
    }
    else if (a === '--write-file') {                      // --write-file <published path>=<text>: a small generated file (a manifest)
      const v = argv[++i] || '', k = v.indexOf('=');
      if (k < 1) die('--write-file takes <published path>=<text>');
      (o.writeFiles = o.writeFiles || []).push([v.slice(0, k).replace(/^\/+/, ''), v.slice(k + 1)]);
    }
    else if (a === '--keep-going') { /* default */ }
    else if (a === '-h' || a === '--help') o.help = true;
    else if (a[0] === '-') die('unknown option ' + a);
    else o.pages.push(a);
  }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help || (!o.all && !o.pages.length)) {
    console.log('usage: node tools/solo-bundle.js <page.html> [--out dir] [--note "text"] [--test] [--start-selector css]\n       node tools/solo-bundle.js --all [--test]');
    process.exit(o.help ? 0 : 2);
  }
  let pages = o.pages;
  if (o.all) pages = fs.readdirSync(SOLO).filter(f => /\.html$/i.test(f)).sort().map(f => path.join(SOLO, f));
  if (o.out && pages.length > 1) die('--out takes one page');
  let bad = 0;
  for (const p of pages) {
    console.log('== ' + rel(path.resolve(p)));
    try {
      const b = build(p, o);
      const lf = lint(b);
      console.log('  title: ' + b.title + '   files: ' + (b.files.length + 1) + ' (+ files.json, test.html)   bytes: ' + b.total + '   out: ' + rel(b.outDir));
      b.warnings.forEach(w => console.log('  warning: ' + w));
      lf.forEach(f => console.log('  LINT FAIL: ' + f));
      if (!lf.length) console.log('  lint: ok');
      let failed = lf.length > 0;
      if (o.test) {
        const res = await testBundle(b, o);
        for (const r of res) {
          console.log('  [' + r.size + '] engine=' + r.info.engine + ' (' + r.info.handle + ')  peak=' + r.info.peak + '  overflow=' + r.info.overflow + '  start=' + r.info.start);
          console.log('     meter: ' + r.info.levels);
          console.log('     shot: ' + (r.info.shot ? rel(r.info.shot) : 'none'));
          r.problems.forEach(x => console.log('     FAIL: ' + x));
          if (r.problems.length) failed = true; else console.log('     ok');
        }
      }
      if (failed) bad++;
    } catch (e) { console.log('  ERROR: ' + e.message); bad++; }
  }
  console.log(bad ? bad + ' of ' + pages.length + ' failed' : 'all ' + pages.length + ' ok');
  process.exit(bad ? 1 : 0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
