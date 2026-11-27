/* MixerView (global MixerView), Pressing Crew V2: one channel strip per track, the send returns and the master.
 *
 *   var view = MixerView.mount(el, host);   // el = the view area below the control bar (app.js mounts one view at a time)
 *   view.update();                          // every animation frame: meters (decay and peak hold from Settings), values
 *   view.select('bass');                    // marks and scrolls to a strip
 *   view.dispose();
 *
 * A track strip, top to bottom: family rail and name (the name opens the track's device window), pan, one knob per send,
 * M and S, the fader on the channel's gain (dB scale, -inf to +6 dB, double-click = 0 dB) beside a peak meter of the
 * channel's output, and the held peak in dBFS (click to clear). Strips are grouped by family. Returns: one strip per
 * send unit (meter, return level on the unit's `mix`, bypass, open). Master (pinned right): the master meter, the glue
 * compressor's and the limiter's gain reduction, the correlation. The strip row scrolls sideways inside the view.
 *
 * Reads: host.tracks(), host.sends(), host.devices(), host.getParam, host.meter. Writes: host.hold(path) once per
 * gesture (the Host's undo snapshot: one undo entry per fader or knob move), host.setParam (stored in the document),
 * host.mute / host.solo (session state, as in the System Editor), host.bypass; Windows.open for device windows.
 * Every call is feature-detected. Design notes: docs/research/2026-11-26-pressing-crew/transcripts/log-V2.md.
 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : this;
  var doc = root.document;

  var FAM_ORDER = ['drums', 'bass', 'keys', 'fx'];
  var FAM_LABEL = { drums: 'DRUMS', bass: 'BASS', keys: 'KEYS', fx: 'FX', dynamics: 'DYNAMICS', time: 'TIME', tone: 'TONE', utility: 'OTHER' };
  var DB_MIN = -60, DB_MAX = 6, FADER_LEN = 168;

  function isFn(f) { return typeof f === 'function'; }
  function has(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function safe(fn, d) { try { return fn(); } catch (e) { return d; } }
  function el(tag, cls, text, attrs) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = String(text);
    if (attrs) for (var k in attrs) if (has(attrs, k)) e.setAttribute(k, String(attrs[k]));
    return e;
  }
  function on(e, t, fn) { if (e && isFn(e.addEventListener)) e.addEventListener(t, fn); }
  function btn(cls, text, label) {
    var b = el('button', 'ap-btn mx-btn' + (cls ? ' ' + cls : ''), text);
    b.type = 'button'; b.setAttribute('type', 'button');
    if (label) { b.title = label; b.setAttribute('aria-label', label); }
    return b;
  }
  function setOff(b, off, why) {
    b._off = !!off;
    if (off) { b.setAttribute('aria-disabled', 'true'); if (why) b.title = why; } else b.removeAttribute('aria-disabled');
  }
  function now() { return Date.now(); }

  // dB <-> linear gain (the engine's channel gain is linear, 0..2)
  function dbToGain(db) { return db <= DB_MIN ? 0 : Math.min(2, Math.pow(10, db / 20)); }
  function gainToDb(g) { return !(g > 0.001) ? DB_MIN : Math.max(DB_MIN, Math.min(DB_MAX, 20 * Math.log(g) / Math.LN10)); }
  function fmtDb(db) { return db <= DB_MIN ? '-inf' : (db > 0.05 ? '+' : '') + db.toFixed(1) + ' dB'; }
  function fmtPan(v) { var p = Math.round(v * 100); return p === 0 ? 'C' : p < 0 ? 'L' + (-p) : 'R' + p; }
  function linToDb(l) { return l > 1e-6 ? 20 * Math.log(l) / Math.LN10 : -120; }
  function dbToLin(d) { return d <= -119 ? 0 : Math.pow(10, d / 20); }

  function setting(key, dflt) {
    var S = root.Settings;
    if (S && isFn(S.get)) { var v = safe(function () { return S.get(key); }, undefined); if (v !== undefined && v !== null) return v; }
    return dflt;
  }

  // ------------------------------------------------------------------ a meter with decay and peak hold
  function makeMeter(label, length) {
    var W = root.Widgets, m = null;
    if (W && isFn(W.meter)) m = safe(function () { return W.meter({ orientation: 'v', size: 'strip', length: length, label: label }); }, null);
    if (!m) {
      var box = el('div', 'mx-mfb', null, { role: 'meter', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': '1' });
      var fill = el('i'); box.appendChild(fill);
      m = { el: box, set: function (l) { fill.style.height = Math.round(Math.max(0, Math.min(1, (linToDb(l) + 60) / 60)) * 100) + '%'; } };
    }
    var st = { disp: -120, peak: -120, until: 0, last: 0 };
    var readout = btn('mx-peak', '-inf', label + ': held peak in dBFS; click to clear');
    on(readout, 'click', function () { st.peak = -120; st.until = 0; paintReadout(); });
    function paintReadout() {
      var t = st.peak <= -60 ? '-inf' : (st.peak > 0 ? '+' : '') + st.peak.toFixed(1);
      if (readout.textContent !== t) readout.textContent = t;
      var over = st.peak > -0.1 ? 'true' : 'false';
      if (readout.getAttribute('data-over') !== over) readout.setAttribute('data-over', over);
    }
    return {
      el: m.el, readout: readout, state: st,
      feed: function (level) {
        var t = now(), dt = st.last ? Math.min(0.25, (t - st.last) / 1000) : 0;
        st.last = t;
        var decay = Number(setting('view.meterDecay', 20)) || 20, hold = Number(setting('view.peakHold', 1.5));
        var d = linToDb(level);
        st.disp = d >= st.disp ? d : Math.max(d, st.disp - decay * dt);
        if (d >= st.peak) { st.peak = d; st.until = t + Math.max(0, hold) * 1000; }
        else if (hold === 0) st.peak = st.disp;
        else if (hold > 0 && t > st.until) st.peak = Math.max(st.disp, st.peak - decay * dt);
        m.set(dbToLin(st.disp), dbToLin(st.peak));
        paintReadout();
      }
    };
  }

  // ------------------------------------------------------------------ the view
  function mount(container, host) {
    var W = root.Widgets;
    var S = { strips: [], byTrack: {}, frame: 0, sig: '', selected: null, disposed: false };
    var rootEl = el('section', 'mx-view', null, { role: 'region', 'aria-label': 'Mixer' });
    var head = el('div', 'mx-head');
    head.appendChild(el('h2', 'mx-title', 'Mixer'));
    head.appendChild(el('p', 'mx-help', 'Faders and knobs: drag, arrow keys (Shift = fine), double-click resets. Each move is one undo step. M and S are not saved with the song.'));
    var body = el('div', 'mx-body');
    var scroll = el('div', 'mx-scroll', null, { role: 'group', 'aria-label': 'Track strips' });
    var masterBox = el('div', 'mx-masterbox', null, { role: 'group', 'aria-label': 'Returns and master' });
    body.appendChild(scroll); body.appendChild(masterBox);
    rootEl.appendChild(head); rootEl.appendChild(body);
    container.appendChild(rootEl);

    function openDevice(id) {
      var Wn = root.Windows;
      if (!Wn || !isFn(Wn.open)) return false;
      safe(function () { if (isFn(Wn.onSelect)) Wn.onSelect(id); });
      return !!safe(function () { return Wn.open(id, host) || true; }, false);
    }
    function deviceExists(id) { return isFn(host.device) ? !!safe(function () { return host.device(id); }, null) : true; }

    // a knob or fader bound to a parameter path: hold once per gesture (one undo entry), setParam per value
    function bound(kind, o) {
      var path = o.path, toUi = o.toUi || function (v) { return v; }, toEngine = o.toEngine || function (v) { return v; };
      var start = safe(function () { return host.getParam(path); }, undefined);
      var ok = start !== undefined && start !== null && isFinite(Number(start));
      var w = null;
      var opts = {
        label: o.label, min: o.min, max: o.max, value: ok ? toUi(Number(start)) : o.home, step: o.step, home: o.home,
        size: o.size || 'strip', format: o.format, bipolar: o.bipolar, orientation: o.orientation, length: o.length,
        onHold: function () { safe(function () { host.hold(path); }); },
        onInput: function (v) { safe(function () { host.setParam(path, toEngine(v)); }); }
      };
      if (W && isFn(W[kind])) w = safe(function () { return W[kind](opts); }, null);
      if (!w) {
        // fallback: a native range input (Widgets did not load)
        var inp = el('input', 'mx-range', null, { type: 'range', min: String(o.min), max: String(o.max), step: String(o.step || 0.01), 'aria-label': o.label });
        inp.value = String(opts.value);
        var held = false;
        on(inp, 'input', function () { if (!held) { held = true; safe(function () { host.hold(path); }); } safe(function () { host.setParam(path, toEngine(Number(inp.value))); }); });
        on(inp, 'change', function () { held = false; });
        w = { el: inp, set: function (v) { inp.value = String(v); } };
      }
      if (!ok) { w.el.setAttribute('aria-disabled', 'true'); w.el.title = 'The engine has no ' + path + ' here.'; if (isFn(w.setDisabled)) safe(function () { w.setDisabled(true); }); }
      return {
        el: w.el, path: path,
        pull: function () {
          if (doc.activeElement === w.el || (w.el.contains && doc.activeElement && w.el.contains(doc.activeElement))) return;
          var v = safe(function () { return host.getParam(path); }, undefined);
          if (v === undefined || v === null || !isFinite(Number(v))) return;
          var u = toUi(Number(v));
          if (u !== this._last) { this._last = u; safe(function () { w.set(u); }); }
        }
      };
    }

    function fader(path, label) {
      return bound('slider', {
        path: path, label: label, min: DB_MIN, max: DB_MAX, step: 0.1, home: 0, orientation: 'v', length: FADER_LEN, size: 'strip',
        format: fmtDb, toUi: gainToDb, toEngine: dbToGain
      });
    }

    function trackStrip(t, sends) {
      var strip = el('div', 'mx-strip', null, { 'data-fam': t.family || 'utility', 'data-track': t.name, role: 'group', 'aria-label': 'Track ' + t.name });
      var s = { name: t.name, el: strip, controls: [], meter: null, mute: null, solo: null, kind: 'track' };
      var nb = btn('mx-name', t.name, 'Open the device window of ' + t.name);
      on(nb, 'click', function () { select(t.name); if (!openDevice('track:' + t.name)) say('Device windows are not available.'); });
      strip.appendChild(nb);
      strip.appendChild(el('span', 'mx-type', t.type && t.type !== t.name ? t.type : '\u00A0'));
      var pan = bound('knob', { path: t.name + '.pan', label: t.name + ' pan', min: -1, max: 1, step: 0.01, home: 0, size: 'strip', format: fmtPan, bipolar: true });
      var pw = el('div', 'mx-knob'); pw.appendChild(pan.el); pw.appendChild(el('span', 'mx-kl', 'Pan', { 'aria-hidden': 'true' }));
      strip.appendChild(pw); s.controls.push(pan);
      var sw = el('div', 'mx-sends');
      sends.forEach(function (sd) {
        var k = bound('knob', { path: t.name + '.send.' + sd.name, label: t.name + ' send to ' + sd.name, min: 0, max: 1.5, step: 0.01, home: 0, size: 'strip', format: function (v) { return v.toFixed(2); } });
        var kw = el('div', 'mx-knob', null, { 'data-fam': sd.family || 'time' }); kw.appendChild(k.el); kw.appendChild(el('span', 'mx-kl', sd.name, { 'aria-hidden': 'true' }));
        sw.appendChild(kw); s.controls.push(k);
      });
      strip.appendChild(sw);
      var ms = el('div', 'mx-ms');
      s.mute = btn('mx-m', 'M', 'Mute ' + t.name);
      s.solo = btn('mx-s', 'S', 'Solo ' + t.name);
      s.mute.setAttribute('aria-pressed', t.muted ? 'true' : 'false');
      s.solo.setAttribute('aria-pressed', t.solo ? 'true' : 'false');
      on(s.mute, 'click', function () {
        var v = s.mute.getAttribute('aria-pressed') !== 'true';
        if (isFn(host.mute)) safe(function () { host.mute(t.name, v); }); else safe(function () { host.setParam(t.name + '.mute', v); });
        s.mute.setAttribute('aria-pressed', v ? 'true' : 'false');
        refreshStates(true);
      });
      if (!isFn(host.solo)) setOff(s.solo, true, 'Solo is not available in this engine (host.solo is missing).');
      on(s.solo, 'click', function () {
        if (s.solo._off) { say(s.solo.title); return; }
        var v = s.solo.getAttribute('aria-pressed') !== 'true';
        safe(function () { host.solo(t.name, v); });
        s.solo.setAttribute('aria-pressed', v ? 'true' : 'false');
        refreshStates(true);
      });
      ms.appendChild(s.mute); ms.appendChild(s.solo);
      strip.appendChild(ms);
      var fm = el('div', 'mx-fm');
      var f = fader(t.name + '.gain', t.name + ' level');
      s.controls.push(f);
      s.meter = makeMeter(t.name + ' meter', FADER_LEN);
      s.meterId = deviceExists('track:' + t.name + ':channel') ? 'track:' + t.name + ':channel' : 'track:' + t.name;
      fm.appendChild(f.el); fm.appendChild(s.meter.el);
      strip.appendChild(fm);
      strip.appendChild(s.meter.readout);
      return s;
    }

    function returnStrip(sd) {
      var strip = el('div', 'mx-strip mx-return', null, { 'data-fam': sd.family || 'time', role: 'group', 'aria-label': 'Return ' + sd.name });
      var s = { name: 'send:' + sd.name, el: strip, controls: [], kind: 'return', id: 'send:' + sd.name };
      var nb = btn('mx-name', sd.name, 'Open the device window of the ' + sd.name + ' return');
      on(nb, 'click', function () { if (!openDevice(s.id)) say('Device windows are not available.'); });
      strip.appendChild(nb);
      strip.appendChild(el('span', 'mx-type', 'return · ' + (sd.type || '')));
      var dev = isFn(host.device) ? safe(function () { return host.device(s.id); }, null) : null;
      s.byp = btn('mx-byp', 'Bypass', 'Bypass the ' + sd.name + ' return');
      if (!isFn(host.bypass)) setOff(s.byp, true, 'Bypass is not available in this engine (host.bypass is missing).');
      on(s.byp, 'click', function () {
        if (s.byp._off) { say(s.byp.title); return; }
        var v = s.byp.getAttribute('aria-pressed') !== 'true';
        safe(function () { host.bypass(s.id, v); });
        s.byp.setAttribute('aria-pressed', v ? 'true' : 'false');
      });
      s.byp.setAttribute('aria-pressed', isFn(host.isBypassed) && safe(function () { return host.isBypassed(s.id); }, false) ? 'true' : 'false');
      var ms = el('div', 'mx-ms'); ms.appendChild(s.byp); strip.appendChild(ms);
      var fm = el('div', 'mx-fm');
      if (dev && dev.spec && has(dev.spec, 'mix')) {
        var f = bound('slider', { path: 'send.' + sd.name + '.mix', label: sd.name + ' return level (wet mix)', min: DB_MIN, max: 0, step: 0.1, home: gainToDb(dev.spec.mix.value || 0.25),
                                  orientation: 'v', length: FADER_LEN, size: 'strip', format: fmtDb, toUi: function (g) { return Math.min(0, gainToDb(g)); }, toEngine: function (db) { return Math.min(1, dbToGain(db)); } });
        s.controls.push(f); fm.appendChild(f.el);
      } else fm.appendChild(el('span', 'mx-none', 'no level'));
      s.meter = makeMeter(sd.name + ' return meter', FADER_LEN);
      s.meterId = s.id;
      fm.appendChild(s.meter.el);
      strip.appendChild(fm);
      strip.appendChild(s.meter.readout);
      return s;
    }

    function masterStrip() {
      var strip = el('div', 'mx-strip mx-master', null, { 'data-fam': 'dynamics', role: 'group', 'aria-label': 'Master' });
      var s = { name: 'master', el: strip, controls: [], kind: 'master' };
      var nb = btn('mx-name', 'Master', 'Open the master limiter');
      on(nb, 'click', function () { if (!openDevice('master:limiter')) say('Device windows are not available.'); });
      strip.appendChild(nb);
      strip.appendChild(el('span', 'mx-type', 'after the master chain'));
      var gr = el('dl', 'mx-gr');
      s.gr = {};
      [['glue', 'Glue GR'], ['limiter', 'Limiter GR'], ['corr', 'Correlation']].forEach(function (p) {
        gr.appendChild(el('dt', null, p[1]));
        s.gr[p[0]] = el('dd', null, '—'); gr.appendChild(s.gr[p[0]]);
      });
      strip.appendChild(gr);
      var fm = el('div', 'mx-fm');
      s.meter = makeMeter('Master meter', FADER_LEN);
      s.meterId = 'master';
      fm.appendChild(s.meter.el);
      fm.appendChild(el('span', 'mx-none', 'The engine has no master volume: set track faders, or the limiter’s ceiling in its window.'));
      strip.appendChild(fm);
      strip.appendChild(s.meter.readout);
      return s;
    }

    var live = el('p', 'mx-live', '', { role: 'status', 'aria-live': 'polite' });
    rootEl.appendChild(live);
    function say(t) { live.textContent = t || ''; }

    function signature(tracks, sends) {
      return tracks.map(function (t) { return t.name + '/' + t.family; }).join(',') + '|' + sends.map(function (x) { return x.name; }).join(',');
    }
    function build() {
      var tracks = isFn(host.tracks) ? safe(function () { return host.tracks(); }, []) : [];
      var sends = isFn(host.sends) ? safe(function () { return host.sends(); }, []) : [];
      tracks = tracks || []; sends = sends || [];
      S.sig = signature(tracks, sends);
      var keepScroll = scroll.scrollLeft || 0;
      while (scroll.firstChild) scroll.removeChild(scroll.firstChild);
      while (masterBox.firstChild) masterBox.removeChild(masterBox.firstChild);
      S.strips = []; S.byTrack = {};
      var groups = {}, order = [];
      tracks.forEach(function (t) {
        var f = t.family || 'utility';
        if (!groups[f]) { groups[f] = []; order.push(f); }
        groups[f].push(t);
      });
      order.sort(function (a, b) {
        var ia = FAM_ORDER.indexOf(a), ib = FAM_ORDER.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
      if (!tracks.length) scroll.appendChild(el('p', 'mx-empty', 'This song has no tracks yet.'));
      order.forEach(function (f) {
        var g = el('div', 'mx-group', null, { 'data-fam': f });
        g.appendChild(el('div', 'mx-ghead', (FAM_LABEL[f] || f.toUpperCase()) + ' (' + groups[f].length + ')'));
        var row = el('div', 'mx-grow');
        groups[f].forEach(function (t) { var s = trackStrip(t, sends); S.strips.push(s); S.byTrack[t.name] = s; row.appendChild(s.el); });
        g.appendChild(row);
        scroll.appendChild(g);
      });
      if (sends.length) {
        var g = el('div', 'mx-group mx-returns', null, { 'data-fam': 'time' });
        g.appendChild(el('div', 'mx-ghead', 'RETURNS (' + sends.length + ')'));
        var row = el('div', 'mx-grow');
        sends.forEach(function (sd) { var s = returnStrip(sd); S.strips.push(s); row.appendChild(s.el); });
        g.appendChild(row);
        masterBox.appendChild(g);
      }
      var m = masterStrip();
      S.strips.push(m); S.master = m;
      var mg = el('div', 'mx-group', null, { 'data-fam': 'dynamics' });
      mg.appendChild(el('div', 'mx-ghead', 'MASTER'));
      mg.appendChild(m.el);
      masterBox.appendChild(mg);
      scroll.scrollLeft = keepScroll;
      if (S.selected) mark(S.selected);
      refreshStates(true);
    }

    function refreshStates(force) {
      if (!isFn(host.tracks)) return;
      var tracks = safe(function () { return host.tracks(); }, null);
      if (!tracks) return;
      var anySolo = tracks.some(function (t) { return t.solo; });
      tracks.forEach(function (t) {
        var s = S.byTrack[t.name]; if (!s) return;
        var m = t.muted ? 'true' : 'false', so = t.solo ? 'true' : 'false';
        if (force || s.mute.getAttribute('aria-pressed') !== m) s.mute.setAttribute('aria-pressed', m);
        if (force || s.solo.getAttribute('aria-pressed') !== so) s.solo.setAttribute('aria-pressed', so);
        var silent = t.muted || (anySolo && !t.solo) ? 'true' : 'false';
        if (s.el.getAttribute('data-silent') !== silent) s.el.setAttribute('data-silent', silent);
      });
    }

    function mark(name) {
      S.strips.forEach(function (s) { if (s.kind === 'track') s.el.setAttribute('data-selected', s.name === name ? 'true' : 'false'); });
    }
    function select(name) {
      S.selected = name;
      mark(name);
      var s = S.byTrack[name];
      if (s && isFn(s.el.scrollIntoView)) safe(function () { s.el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
      safe(function () { if (root.Windows && isFn(root.Windows.onSelect)) root.Windows.onSelect('track:' + name); });
    }

    function onDocument(e) {
      if (S.disposed) return;
      var tracks = isFn(host.tracks) ? safe(function () { return host.tracks(); }, []) : [];
      var sends = isFn(host.sends) ? safe(function () { return host.sends(); }, []) : [];
      if (signature(tracks || [], sends || []) !== S.sig || (e && e.reason === 'load')) build();
    }
    function onBypass() { S.strips.forEach(function (s) { if (s.kind === 'return' && isFn(host.isBypassed)) s.byp.setAttribute('aria-pressed', safe(function () { return host.isBypassed(s.id); }, false) ? 'true' : 'false'); }); }

    function update() {
      if (S.disposed) return;
      S.frame++;
      for (var i = 0; i < S.strips.length; i++) {
        var s = S.strips[i];
        if (s.meter && isFn(host.meter)) {
          var m = safe(function () { return host.meter(s.meterId); }, null);
          s.meter.feed(m ? (m.peak != null ? m.peak : m.level || 0) : 0);
        }
      }
      if (S.master && isFn(host.meter) && S.frame % 3 === 0) {
        var g = safe(function () { return host.meter('master:glue'); }, null), l = safe(function () { return host.meter('master:limiter'); }, null), mm = safe(function () { return host.meter('master'); }, null);
        function grText(x) { return x && typeof x.reduction === 'number' ? (-Math.abs(x.reduction)).toFixed(1) + ' dB' : '—'; }
        var gt = grText(g), lt = grText(l), ct = mm && typeof mm.correlation === 'number' ? mm.correlation.toFixed(2) : '—';
        if (S.master.gr.glue.textContent !== gt) S.master.gr.glue.textContent = gt;
        if (S.master.gr.limiter.textContent !== lt) S.master.gr.limiter.textContent = lt;
        if (S.master.gr.corr.textContent !== ct) S.master.gr.corr.textContent = ct;
      }
      if (S.frame % 6 === 0) {
        S.strips.forEach(function (s) { s.controls.forEach(function (c) { c.pull(); }); });
        refreshStates(false);
      }
    }

    build();
    if (isFn(host.on)) { host.on('document', onDocument); host.on('bypass', onBypass); }
    return {
      el: rootEl,
      update: update,
      select: select,
      refresh: build,
      strips: function () { return S.strips; },
      dispose: function () {
        S.disposed = true;
        if (isFn(host.off)) { safe(function () { host.off('document', onDocument); host.off('bypass', onBypass); }); }
        if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
      }
    };
  }

  root.MixerView = { mount: mount, dbToGain: dbToGain, gainToDb: gainToDb, fmtDb: fmtDb };
})();
