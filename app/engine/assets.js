/* Recut app engine - assets.js
 * Global `Assets`: the asset manifest and the one call a page or the Host awaits before starting, so that the 909's
 * recorded voices are in place from the first hit. Pressing Crew, G1.
 *
 *   Assets.ready(ctx, docOrSeq?).then(function (r) { ... });
 *     r = { manifest: {...} | null,
 *           robroy: null | { types: [...], loaded: n, missing: n },          // Sampled909.load on ctx
 *           rom: null | { source: 'assets' | 'shell', chips: ['hat', ...], status } }   // Drums.loadRomsFrom / loadRom
 *   Assets.manifest()     Promise of the parsed <assets>/manifest.json (fetched once per page; null when absent)
 *   Assets.base()         the assets folder URL ('../assets/' from this script's own URL, as worklets.js resolves)
 *   Assets.setBase(url)   another assets folder (a bundle laid out differently; tests)
 *   Assets.romWanted(x)   true when a SongDoc or a Sequencer has ch909, oh909, cr909 or rd909 with its rom row on
 *
 * The manifest (app/assets/manifest.json, tracked) says which optional sets are present: {"tr909-rom": bool,
 * "tr909-robroy": bool}. A set is fetched only when its entry is true, so no request ends in a 404 (a failed fetch
 * always logs a console error). One exception, kept from K1's lines: when the manifest itself cannot be read
 * (no fetch, a page without it), the Rob Roy set is still asked for (Sampled909 tolerates absence, as before this file);
 * the ROM images never are. In the Electron shell, when the manifest has no ROMs, the owner's copy in the app's data
 * folder is read through RecutShell.readRoms() (main.js; <userData>/roms/tr909/).
 * With a document (or a Sequencer), only what it uses is loaded: the sampled types it has (Sampled909.typesIn), the ROMs
 * when romWanted. Without one (an instrument page), every sampled voice and the ROMs. Never rejects; nothing throws when
 * Sampled909, Drums or fetch is absent. The ROMs are loaded once per page (Drums keeps them for every context); the
 * recordings are decoded per context.
 * Load order: after drums.js and sampled909.js (looked up when called, so either may be missing).
 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  var base = 'assets/';
  try {
    var cs = root.document && root.document.currentScript;
    if (cs && cs.src && typeof root.URL === 'function') base = new root.URL('../assets/', cs.src).href;
  } catch (e) {}
  function setBase(url) { if (typeof url === 'string' && url) { base = url.replace(/\/?$/, '/'); manifestP = null; } }
  function join(sub) { try { return new root.URL(sub, base).href; } catch (e) { return base + sub; } }

  var manifestP = null;
  function manifest() {
    if (manifestP) return manifestP;
    if (typeof root.fetch !== 'function') { manifestP = Promise.resolve(null); return manifestP; }
    var p;
    try { p = root.fetch(join('manifest.json')); } catch (e) { p = Promise.resolve(null); }
    manifestP = Promise.resolve(p).then(function (r) { return r && r.ok ? r.json() : null; }, function () { return null; })
      .then(function (m) { return (m && typeof m === 'object') ? m : null; }, function () { return null; });
    return manifestP;
  }

  var ROMTYPES = { ch909: 1, oh909: 1, cr909: 1, rd909: 1 };
  function romWanted(x) {
    try {
      if (!x) return false;
      var tr = x.tracks || x, k;
      for (k in tr) if (Object.prototype.hasOwnProperty.call(tr, k)) {
        var t = tr[k]; if (!t) continue;
        var inst = (t.inst && typeof t.inst === 'object') ? t.inst : null;
        var ty = inst ? inst.type : (ROMTYPES[t.type] ? t.type : t.inst);
        if (!ROMTYPES[ty]) continue;
        var p = inst ? inst.params : t.params, rom = p && p.rom;
        if (rom == null || Number(rom) >= 0.5) return true;          // the rom row is on by default
      }
    } catch (e) {}
    return false;
  }

  var romP = null;                                                    // once per page
  function loadRoms(m) {
    if (romP) return romP;
    var D = root.Drums;
    if (!D) return Promise.resolve(null);
    var chipsOf = function (st) { var out = []; if (st && st.chips) for (var c in st.chips) if (st.chips.hasOwnProperty(c) && st.chips[c].loaded) out.push(c); return out; };
    var shell = root.RecutShell;
    if (m && m['tr909-rom'] === true && typeof D.loadRomsFrom === 'function') {
      romP = Promise.resolve(D.loadRomsFrom(join('tr909-rom/'))).then(function (st) { return { source: 'assets', chips: chipsOf(st), status: st }; }, function () { return null; });
    } else if (shell && typeof shell.readRoms === 'function' && typeof D.loadRom === 'function') {
      romP = Promise.resolve().then(function () { return shell.readRoms(); }).then(function (list) {
        var bufs = (list || []).map(function (f) { return f && f.bytes ? f.bytes : f; }).filter(function (b) { return b && b.byteLength; });
        if (!bufs.length) return null;
        D.loadRom(bufs);
        var st = D.romStatus ? D.romStatus() : null;
        return { source: 'shell', chips: chipsOf(st), status: st };
      }).then(null, function () { return null; });
    } else return Promise.resolve(null);
    romP.then(function (r) { if (!r || !r.chips.length) romP = null; });   // nothing loaded: a later call may try again
    return romP;
  }

  function ready(ctx, x) {
    return manifest().then(function (m) {
      var S9 = root.Sampled909, jobs = [], out = { manifest: m, robroy: null, rom: null };
      var wantRob = !m || m['tr909-robroy'] === true;
      if (S9 && typeof S9.load === 'function' && ctx && wantRob) {
        var types = x ? S9.typesIn(x) : (S9.types ? S9.types() : []);
        if (types.length) {
          var o = { types: types }; if (m) o.base = join('tr909-robroy/');
          jobs.push(Promise.resolve(S9.load(ctx, o)).then(function (r) {
            out.robroy = { types: types, loaded: r && r.loaded ? r.loaded.length : 0, missing: r && r.missing ? r.missing.length : 0 };
          }, function () {}));
        }
      }
      if (!x || romWanted(x)) jobs.push(loadRoms(m).then(function (r) { out.rom = r; }, function () {}));
      return Promise.all(jobs).then(function () { return out; });
    }, function () { return { manifest: null, robroy: null, rom: null }; });
  }

  root.Assets = { ready: ready, manifest: manifest, base: function () { return base; }, setBase: setBase, romWanted: romWanted };
})();
