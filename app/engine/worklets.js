/* Havantechno app engine - worklets.js
 * Global `Worklets`: AudioWorklet module loading per context, shared by classics.js (tb303, modeld; later juno).
 *
 *   Worklets.load(ctx).then(function (ok) {});   // adds the processor module(s) once per context; ok false = fallback
 *   Worklets.ready(ctx)                          // true once the modules resolved on that context (synchronous)
 *   Worklets.node(ctx, 'hvt-tb303', opts)        // an AudioWorkletNode, or null when not ready / it fails
 *   Worklets.modules                             // the module URLs (resolved next to this file: engine/worklets/)
 *
 * Load order: after core.js, before classics.js. The Host awaits load(ctx) before building on a live context and
 * Sequencer.render awaits it on its OfflineAudioContext, so instruments are built only after the module resolved.
 * A context without audioWorklet (the Node checks' fake context, old browsers) or a failed load resolves false;
 * instruments then use their plain-node fallback, and the console says so once. Nothing here throws.
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var FILES = ['classics-processor.js'];

  // resolve engine/worklets/ from this script's own URL (works over http and Electron's havantechno:// scheme)
  var baseUrl = 'engine/worklets/';
  try {
    var cs = root.document && root.document.currentScript;
    if (cs && cs.src) baseUrl = cs.src.replace(/[^\/]*([?#].*)?$/, '') + 'worklets/';
  } catch (e) {}

  var STATE = (typeof WeakMap === 'function') ? new WeakMap() : null;   // ctx -> {promise, ok}
  var warned = false;
  function warnOnce(msg) {
    if (warned) return;
    warned = true;
    try { if (typeof console !== 'undefined' && console.warn) console.warn('[Worklets] ' + msg); } catch (e) {}
  }
  function stateOf(ctx) { return (STATE && ctx && typeof ctx === 'object') ? STATE.get(ctx) : null; }

  function modules() { return FILES.map(function (f) { return baseUrl + f; }); }

  function load(ctx) {
    var st = stateOf(ctx);
    if (st) return st.promise;
    st = { ok: false, promise: null };
    var wl = null;
    try { wl = ctx && ctx.audioWorklet; } catch (e) { wl = null; }
    var AWN = root.AudioWorkletNode;
    if (!wl || typeof wl.addModule !== 'function' || typeof AWN !== 'function') {
      st.promise = Promise.resolve(false);
      if (ctx) warnOnce('AudioWorklet unavailable on this context: the classic synths use their approximate fallback');
    } else {
      var p;
      try { p = Promise.all(modules().map(function (u) { return wl.addModule(u); })); }
      catch (e) { p = Promise.reject(e); }
      st.promise = p.then(function () { st.ok = true; return true; }, function (e) {
        warnOnce('worklet module failed to load (' + (e && e.message) + '): the classic synths use their approximate fallback');
        return false;
      });
    }
    if (STATE && ctx && typeof ctx === 'object') STATE.set(ctx, st);
    return st.promise;
  }

  function ready(ctx) { var st = stateOf(ctx); return !!(st && st.ok); }

  // opts: AudioWorkletNodeOptions. Mono out by default.
  function node(ctx, name, opts) {
    if (!ready(ctx)) return null;
    try {
      var o = { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] };
      if (opts) for (var k in opts) if (opts.hasOwnProperty(k)) o[k] = opts[k];
      return new root.AudioWorkletNode(ctx, name, o);
    } catch (e) {
      warnOnce('AudioWorkletNode "' + name + '" failed (' + (e && e.message) + '): fallback in use');
      return null;
    }
  }

  // tests and the shell may point the module folder elsewhere (before the first load)
  function setBase(url) { if (typeof url === 'string' && url) baseUrl = url.replace(/\/?$/, '/'); }

  root.Worklets = { load: load, ready: ready, node: node, setBase: setBase, files: FILES.slice(),
                    get modules() { return modules(); } };
})();
