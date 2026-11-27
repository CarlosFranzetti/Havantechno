/* Settings (global Settings), Pressing Crew V2: values remembered between runs and the settings dialog.
 *
 *   Settings.get(key) -> value (the default when unset); Settings.get() -> a copy of every value
 *   Settings.set(key, value) -> bool          (validated; stored; emits 'change' {key, value, old})
 *   Settings.open(tab)                         ('audio' | 'view' | 'about'; the dialog, modal, Escape closes)
 *   Settings.on('change', fn) / Settings.off('change', fn)
 *   Settings.close(), Settings.isOpen(), Settings.defaults(), Settings.keys()
 *   Settings.attach(host, {shell, toast})      (the Host the Audio tab reports on; app.js calls it at boot)
 *   Settings.apply()                           (density and zoom on <html>; called at load and on every change)
 *
 * Storage: localStorage 'hv.settings' (JSON, every access in try/catch) and, in Electron, the app-data file
 * 'settings.json' through HavantechnoShell.readAppData / writeAppData (read once at load: the file wins).
 * The Audio tab feature-detects V1's Host calls (outputDevices, audioOptions, setAudioOptions); a missing call
 * disables its control with a visible reason. Design notes: docs/research/2026-11-26-pressing-crew/transcripts/log-V2.md.
 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : this;
  var doc = root.document;

  var LS_KEY = 'hv.settings', FILE = 'settings.json';
  var RATES = [0, 44100, 48000, 88200, 96000];
  var DEFAULTS = {
    'audio.sinkId': '',
    'audio.latencyHint': 'interactive',
    'audio.sampleRate': 0,
    'export.bitDepth': 24,
    'export.sampleRate': 0,
    'export.tail': 2,
    'view.default': 'last',
    'view.density': 'normal',
    'view.zoom': 100,
    'view.meterDecay': 20,
    'view.peakHold': 1.5,
    'view.deviceOpen': 'panel'
  };
  var ONE_OF = {
    'audio.latencyHint': ['interactive', 'balanced', 'playback'],
    'audio.sampleRate': RATES,
    'export.bitDepth': [16, 24, 32],
    'export.sampleRate': RATES,
    'view.default': ['last', 'system', 'step', 'mixer', 'clips'],
    'view.density': ['compact', 'normal', 'large'],
    'view.deviceOpen': ['panel', 'controls']
  };
  var RANGE = { 'export.tail': [0, 30], 'view.zoom': [80, 150], 'view.meterDecay': [3, 96], 'view.peakHold': [-1, 10] };

  function isFn(f) { return typeof f === 'function'; }
  function has(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function safe(fn, d) { try { return fn(); } catch (e) { return d; } }
  function msg(e) { return e && e.message ? e.message : String(e); }
  function el(tag, cls, text, attrs) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = String(text);
    if (attrs) for (var k in attrs) if (has(attrs, k)) e.setAttribute(k, String(attrs[k]));
    return e;
  }
  function on(e, t, fn) { if (e && isFn(e.addEventListener)) e.addEventListener(t, fn); }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }
  function btn(cls, text, label) {
    var b = el('button', 'ap-btn' + (cls ? ' ' + cls : ''), text);
    b.type = 'button'; b.setAttribute('type', 'button');
    if (label) { b.title = label; b.setAttribute('aria-label', label); }
    return b;
  }
  // aria-disabled keeps a control focusable so its reason can be read; the reason is also shown as text
  function setOff(c, off, why) {
    c._off = !!off; c._why = off ? why : '';
    if (off) { c.setAttribute('aria-disabled', 'true'); if (why) c.title = why; }
    else c.removeAttribute('aria-disabled');
    if (c.tagName === 'SELECT' || c.tagName === 'INPUT') c.disabled = !!off;
  }

  // ------------------------------------------------------------------ values
  function validate(key, v) {
    if (!has(DEFAULTS, key)) return undefined;
    if (key === 'audio.sinkId') return v == null ? '' : String(v);
    if (has(ONE_OF, key)) {
      var list = ONE_OF[key];
      for (var i = 0; i < list.length; i++) if (list[i] === v || String(list[i]) === String(v)) return list[i];
      return undefined;
    }
    if (has(RANGE, key)) {
      var n = Number(v);
      if (!isFinite(n)) return undefined;
      var r = RANGE[key];
      if (key === 'view.peakHold' && n < 0) return -1;
      return Math.min(r[1], Math.max(r[0], n));
    }
    return undefined;
  }
  var values = {};
  var listeners = [];
  function readStore() {
    var t = null;
    try { t = root.localStorage ? root.localStorage.getItem(LS_KEY) : null; } catch (e) { t = null; }
    if (!t) return {};
    try { var o = JSON.parse(t); return o && typeof o === 'object' ? o : {}; } catch (e2) { return {}; }
  }
  function merge(o, quiet) {
    for (var k in o) if (has(o, k)) {
      var v = validate(k, o[k]);
      if (v === undefined) continue;
      var old = get(k);
      values[k] = v;
      if (!quiet && old !== v) emit({ key: k, value: v, old: old });
    }
  }
  var fileTimer = 0;
  function shell() { return root.HavantechnoShell || null; }
  function persist() {
    var text = JSON.stringify(values);
    try { if (root.localStorage) root.localStorage.setItem(LS_KEY, text); } catch (e) { /* storage blocked */ }
    var sh = shell();
    if (sh && isFn(sh.writeAppData)) {
      if (fileTimer) clearTimeout(fileTimer);
      fileTimer = setTimeout(function () {
        fileTimer = 0;
        try { var p = sh.writeAppData(FILE, JSON.stringify(values, null, 2)); if (p && p.catch) p.catch(function () {}); } catch (e) { /* ignore */ }
      }, 300);
    }
  }
  function get(key) {
    if (key == null) { var all = {}, k; for (k in DEFAULTS) if (has(DEFAULTS, k)) all[k] = get(k); return all; }
    return has(values, key) ? values[key] : DEFAULTS[key];
  }
  function set(key, value) {
    var v = validate(key, value);
    if (v === undefined) return false;
    var old = get(key);
    values[key] = v;
    persist();
    if (old !== v) emit({ key: key, value: v, old: old });
    return true;
  }
  function emit(e) {
    if (/^view\.(density|zoom)$/.test(e.key)) apply();
    listeners.slice().forEach(function (fn) { try { fn(e); } catch (x) { if (root.console) root.console.error('[Settings] listener', x); } });
  }
  function onFn(type, fn) { if (type === 'change' && isFn(fn)) listeners.push(fn); return Settings; }
  function offFn(type, fn) { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); return Settings; }

  // density: data-density on <html> (views.css); zoom: CSS zoom on <html> (the toolbar wraps, so nothing is cut off)
  function apply() {
    var de = doc && doc.documentElement;
    if (!de) return;
    safe(function () { de.setAttribute('data-density', get('view.density')); });
    var z = get('view.zoom');
    safe(function () { if (de.style) de.style.zoom = z === 100 ? '' : String(z / 100); });
  }

  // ------------------------------------------------------------------ attach and the host's audio calls
  var H = { host: null, shell: null, toast: null };
  function attach(host, o) { H.host = host || null; o = o || {}; H.shell = o.shell !== undefined ? o.shell : shell(); H.toast = o.toast || null; return Settings; }
  function availability(host) {
    var h = host || H.host;
    function cap(name, why) { return h && isFn(h[name]) ? { ok: true, why: '' } : { ok: false, why: why }; }
    return {
      outputDevices: cap('outputDevices', 'This engine cannot list output devices yet (host.outputDevices is missing), so the default output is used.'),
      setAudioOptions: cap('setAudioOptions', 'This engine cannot change its audio options yet (host.setAudioOptions is missing); the values are remembered for when it can.'),
      audioOptions: cap('audioOptions', '')
    };
  }
  function engineReport(host) {
    var h = host || H.host, r = { sampleRate: null, baseLatency: null, outputLatency: null, state: 'not started', sinkId: '', latencyHint: null, worklets: null, source: 'none' };
    if (!h) return r;
    var o = null;
    if (isFn(h.audioOptions)) { o = safe(function () { return h.audioOptions(); }, null); if (o) r.source = 'audioOptions'; }
    var ctx = isFn(h.context) ? safe(function () { return h.context(); }, null) : null;
    if (o) {
      ['sampleRate', 'baseLatency', 'outputLatency', 'state', 'sinkId', 'latencyHint'].forEach(function (k) { if (o[k] != null) r[k] = o[k]; });
    } else if (ctx) {
      r.source = 'context';
      r.sampleRate = ctx.sampleRate || null;
      r.baseLatency = typeof ctx.baseLatency === 'number' ? ctx.baseLatency : null;
      r.outputLatency = typeof ctx.outputLatency === 'number' ? ctx.outputLatency : null;
      r.state = ctx.state || 'unknown';
      r.sinkId = typeof ctx.sinkId === 'string' ? ctx.sinkId : '';
    }
    var W = root.Worklets;
    if (ctx && W && isFn(W.ready)) r.worklets = !!safe(function () { return W.ready(ctx); }, false);
    return r;
  }
  function ms(s) { return typeof s === 'number' && isFinite(s) ? (s * 1000).toFixed(1) + ' ms' : 'not reported'; }
  // the test tone: host.testTone when the engine has one; otherwise a 1 kHz sine at -18 dBFS for one second on the
  // Host's own context (the only place the interface reads host.context(): a diagnostic, never the song)
  function testTone(host) {
    var h = host || H.host;
    if (!h) return Promise.resolve({ ok: false, why: 'No engine.' });
    if (isFn(h.testTone)) return Promise.resolve(safe(function () { return h.testTone({ hz: 1000, db: -18, seconds: 1 }); }, false)).then(function (x) { return { ok: x !== false, why: x === false ? 'The engine refused the test tone.' : '' }; });
    var ctx = isFn(h.context) ? safe(function () { return h.context(); }, null) : null;
    if (!ctx || !isFn(ctx.createOscillator)) return Promise.resolve({ ok: false, why: 'Audio has not started: click Start audio first.' });
    try {
      if (ctx.state === 'suspended' && isFn(ctx.resume)) { var rp = ctx.resume(); if (rp && rp.catch) rp.catch(function () {}); }
      var t = ctx.currentTime + 0.02, osc = ctx.createOscillator(), g = ctx.createGain(), a = Math.pow(10, -18 / 20);
      osc.frequency.value = 1000;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.01); g.gain.setValueAtTime(a, t + 0.99); g.gain.linearRampToValueAtTime(0, t + 1);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 1.02);
      osc.onended = function () { try { osc.disconnect(); g.disconnect(); } catch (e) { /* ignore */ } };
      return Promise.resolve({ ok: true, why: '' });
    } catch (e) { return Promise.resolve({ ok: false, why: 'Could not play a tone: ' + msg(e) }); }
  }

  // ------------------------------------------------------------------ the dialog
  var D = null;            // {overlay, dlg, tabs, panels, prevFocus, timer, tab}
  var TABS = [{ id: 'audio', label: 'Audio' }, { id: 'view', label: 'View' }, { id: 'about', label: 'About' }];
  var uid = 0;

  function field(label, control, hint) {
    var id = control.id || ('sv-f' + (++uid));
    control.id = id; control.setAttribute('id', id);
    var row = el('div', 'sv-row');
    row.appendChild(el('label', 'sv-lbl', label, { 'for': id }));
    var c = el('div', 'sv-ctl');
    c.appendChild(control);
    if (hint) { var hn = el('p', 'sv-hint', hint); hn.id = id + '-hint'; hn.setAttribute('id', id + '-hint'); control.setAttribute('aria-describedby', id + '-hint'); c.appendChild(hn); row._hint = hn; }
    row.appendChild(c);
    row._control = control;
    return row;
  }
  function selectOf(options, value, onChange) {
    var s = el('select', 'sv-select');
    options.forEach(function (o, i) { var op = el('option', null, o.label, { value: String(i) }); s.appendChild(op); });
    function paint(v) { for (var i = 0; i < options.length; i++) if (options[i].value === v || String(options[i].value) === String(v)) { s.value = String(i); return; } }
    paint(value);
    on(s, 'change', function () { var o = options[parseInt(s.value, 10)]; if (o && !s._off) onChange(o.value); });
    s._paint = paint;
    s._options = options;
    return s;
  }
  function settingSelect(key, options, label, hint, after) {
    var s = selectOf(options, get(key), function (v) { set(key, v); if (after) after(v); });
    var r = field(label, s, hint);
    return r;
  }
  function rateOptions(zeroLabel) {
    return RATES.map(function (r) { return { value: r, label: r ? (r / 1000) + ' kHz' : zeroLabel }; });
  }

  function buildAudio(panel) {
    var h = H.host, av = availability(h);
    var status = el('p', 'sv-status', '', { role: 'status', 'aria-live': 'polite' });
    function say(t) { status.textContent = t || ''; }
    function applyAudio() {
      var a = availability(H.host).setAudioOptions;
      if (!a.ok) { say(a.why); return Promise.resolve(false); }
      say('Applying…');
      var opts = { sinkId: get('audio.sinkId'), latencyHint: get('audio.latencyHint'), sampleRate: get('audio.sampleRate') || undefined };
      var p;
      try { p = H.host.setAudioOptions(opts); } catch (e) { say('The engine refused: ' + msg(e)); return Promise.resolve(false); }
      return Promise.resolve(p).then(function (ok) {
        say(ok === false ? 'The engine could not apply these options; it keeps the ones it had.' : 'Applied.');
        refreshReport();
        return ok !== false;
      }, function (e) { say('The engine refused: ' + msg(e)); return false; });
    }

    panel.appendChild(el('h3', 'sv-h', 'Output'));
    // output device
    var devOpts = [{ value: '', label: 'Default output' }];
    var cur = get('audio.sinkId');
    if (cur) devOpts.push({ value: cur, label: 'Saved device (' + cur.slice(0, 8) + '…)' });
    var devSel = selectOf(devOpts, cur, function (v) { set('audio.sinkId', v); applyAudio(); });
    var devRow = field('Output device', devSel, '');
    panel.appendChild(devRow);
    function devHint(t) { hint.textContent = t; }
    var hint = el('p', 'sv-hint', '', { id: 'sv-devhint' });
    devSel.setAttribute('aria-describedby', 'sv-devhint');
    devSel.parentNode.appendChild(hint);
    if (!av.outputDevices.ok) { setOff(devSel, true, av.outputDevices.why); devHint(av.outputDevices.why); }
    else {
      devHint('Listing devices…');
      Promise.resolve(safe(function () { return h.outputDevices(); }, null)).then(function (list) {
        list = Array.isArray(list) ? list : [];
        var named = list.filter(function (d) { return d && d.id && d.id !== 'default' && d.label; });
        var hidden = list.filter(function (d) { return d && d.id && d.id !== 'default' && !d.label; }).length;
        var opts = [{ value: '', label: 'Default output' }].concat(named.map(function (d) { return { value: String(d.id), label: String(d.label) }; }));
        var keep = get('audio.sinkId');
        if (keep && !opts.some(function (o) { return o.value === keep; })) opts.push({ value: keep, label: 'Saved device (not found now)' });
        clear(devSel);
        opts.forEach(function (o, i) { devSel.appendChild(el('option', null, o.label, { value: String(i) })); });
        devSel._options.length = 0; Array.prototype.push.apply(devSel._options, opts);
        devSel._paint(keep);
        if (!named.length && hidden) devHint('The browser hides the names of ' + hidden + ' output device' + (hidden === 1 ? '' : 's') + ' until this page is allowed to use a microphone, so only the default output can be chosen here. Choose the device in your system settings, or use the desktop app.');
        else if (!list.length) devHint('The engine reported no output devices; the default output is used.');
        else devHint(named.length + ' device' + (named.length === 1 ? '' : 's') + ' found.');
      }, function (e) { devHint('Could not list devices: ' + msg(e) + '. The default output is used.'); });
    }
    panel.appendChild(settingSelect('audio.sampleRate', rateOptions('Device rate'), 'Sample rate',
      'The rate the audio engine runs at. Changing it restarts the engine’s audio context.', applyAudio));
    panel.appendChild(settingSelect('audio.latencyHint', [
      { value: 'interactive', label: 'Interactive (lowest latency)' },
      { value: 'balanced', label: 'Balanced' },
      { value: 'playback', label: 'Playback (most stable, highest latency)' }
    ], 'Latency', 'Lower latency answers knobs and keys faster; higher latency is safer against dropouts on a busy machine.', applyAudio));
    if (!av.setAudioOptions.ok) {
      var note = el('p', 'sv-note', av.setAudioOptions.why, { role: 'note' });
      panel.appendChild(note);
    }
    panel.appendChild(status);

    panel.appendChild(el('h3', 'sv-h', 'What the engine reports'));
    var dl = el('dl', 'sv-report');
    var cells = {};
    [['sampleRate', 'Sample rate'], ['baseLatency', 'Base latency'], ['outputLatency', 'Output latency'], ['state', 'State'], ['sinkId', 'Output'], ['worklets', 'Synth engine']].forEach(function (p) {
      dl.appendChild(el('dt', null, p[1]));
      cells[p[0]] = el('dd', null, '…');
      dl.appendChild(cells[p[0]]);
    });
    panel.appendChild(dl);
    function refreshReport() {
      var r = engineReport(H.host);
      cells.sampleRate.textContent = r.sampleRate ? r.sampleRate + ' Hz' : 'not started';
      cells.baseLatency.textContent = ms(r.baseLatency);
      cells.outputLatency.textContent = ms(r.outputLatency);
      cells.state.textContent = String(r.state || 'unknown') + (r.latencyHint ? ' (' + r.latencyHint + ')' : '');
      cells.sinkId.textContent = r.sinkId ? String(r.sinkId) : 'default';
      cells.worklets.textContent = r.worklets == null ? 'not started' : r.worklets ? 'AudioWorklet (the classic synths run in the worklet)' : 'fallback (plain Web Audio nodes; the classic synths are approximations)';
    }
    refreshReport();
    D.timer = setInterval(function () { if (D && D.tab === 'audio') refreshReport(); }, 700);

    var tone = btn('', 'Play test tone', 'Play a 1 kHz tone at -18 dBFS for one second');
    var toneSay = el('span', 'sv-hint', '', { role: 'status', 'aria-live': 'polite' });
    on(tone, 'click', function () { testTone(H.host).then(function (r) { toneSay.textContent = r.ok ? '1 kHz at -18 dBFS, one second.' : r.why; }); });
    var tr = el('div', 'sv-row sv-inline'); tr.appendChild(tone); tr.appendChild(toneSay);
    panel.appendChild(tr);

    panel.appendChild(el('h3', 'sv-h', 'Export defaults'));
    panel.appendChild(settingSelect('export.bitDepth', [{ value: 16, label: '16-bit' }, { value: 24, label: '24-bit' }, { value: 32, label: '32-bit float' }], 'Bit depth', null));
    panel.appendChild(settingSelect('export.sampleRate', rateOptions('Engine rate'), 'Sample rate', null));
    var tail = el('input', 'sv-num', null, { type: 'number', min: '0', max: '30', step: '0.5' });
    tail.value = String(get('export.tail'));
    on(tail, 'change', function () { if (!set('export.tail', tail.value)) tail.value = String(get('export.tail')); else tail.value = String(get('export.tail')); });
    panel.appendChild(field('Tail (seconds)', tail, 'Rendered after the last bar so reverb and delay can ring out.'));
  }

  function buildView(panel) {
    panel.appendChild(el('h3', 'sv-h', 'Views'));
    panel.appendChild(settingSelect('view.default', [
      { value: 'last', label: 'The last view used' }, { value: 'system', label: 'System Editor' }, { value: 'step', label: 'Step View' },
      { value: 'mixer', label: 'Mixer' }, { value: 'clips', label: 'Clips' }
    ], 'View on start', null));
    panel.appendChild(settingSelect('view.density', [{ value: 'compact', label: 'Compact' }, { value: 'normal', label: 'Normal' }, { value: 'large', label: 'Large' }],
      'Density', 'Control size and spacing in the toolbar, the mixer, the clip view and the dialogs.'));
    panel.appendChild(settingSelect('view.zoom', [80, 90, 100, 110, 125, 150].map(function (z) { return { value: z, label: z + ' %' }; }),
      'Interface zoom', 'Scales the whole window. The toolbar wraps instead of cutting anything off.'));
    panel.appendChild(el('h3', 'sv-h', 'Meters'));
    panel.appendChild(settingSelect('view.meterDecay', [{ value: 6, label: 'Slow (6 dB/s)' }, { value: 12, label: 'Medium (12 dB/s)' }, { value: 20, label: 'Normal (20 dB/s)' }, { value: 48, label: 'Fast (48 dB/s)' }],
      'Meter fall', 'How fast a meter falls after a peak.'));
    panel.appendChild(settingSelect('view.peakHold', [{ value: 0, label: 'Off' }, { value: 1, label: '1 s' }, { value: 1.5, label: '1.5 s' }, { value: 3, label: '3 s' }, { value: -1, label: 'Until clicked' }],
      'Peak hold', 'How long the peak marker and the peak readout stay before they fall.'));
    panel.appendChild(el('h3', 'sv-h', 'Device windows'));
    panel.appendChild(settingSelect('view.deviceOpen', [{ value: 'panel', label: 'The panel (when the device has one)' }, { value: 'controls', label: 'The controls' }],
      'Open on', 'Applies to devices you have not opened before; a window remembers the view you last chose for it.'));
  }

  function buildAbout(panel) {
    var sh = H.shell || shell();
    var ver = el('dd', null, '…');
    var dl = el('dl', 'sv-report');
    dl.appendChild(el('dt', null, 'Version')); dl.appendChild(ver);
    dl.appendChild(el('dt', null, 'Runs as')); dl.appendChild(el('dd', null, sh ? 'desktop app (Electron)' : 'web page'));
    dl.appendChild(el('dt', null, 'Licence')); dl.appendChild(el('dd', null, 'GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)'));
    dl.appendChild(el('dt', null, 'Source')); dl.appendChild(el('dd', null, 'LICENSE and THIRD_PARTY.md sit at the top of the source folder.'));
    panel.appendChild(el('h3', 'sv-h', 'Havantechno'));
    panel.appendChild(dl);
    function setVer(v) { ver.textContent = v; }
    var got = sh && isFn(sh.appVersion) ? safe(function () { return sh.appVersion(); }, null) : null;
    if (got) Promise.resolve(got).then(function (v) { setVer(v ? String(v) : 'unknown'); }, function () { setVer('unknown'); });
    else if (isFn(root.fetch)) {
      root.fetch('package.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { setVer(j && j.version ? j.version + ' (web build)' : 'web build'); }, function () { setVer('web build'); });
    } else setVer('web build');
    var third = btn('', 'Show third-party notices', 'Show THIRD_PARTY.md: code and data from other projects and their licences');
    var pre = el('pre', 'sv-pre', '');
    pre.hidden = true;
    on(third, 'click', function () {
      if (!pre.hidden) { pre.hidden = true; third.textContent = 'Show third-party notices'; return; }
      third.textContent = 'Hide third-party notices';
      pre.hidden = false; pre.textContent = 'Loading…';
      var read = isFn(root.fetch) ? root.fetch('../THIRD_PARTY.md').then(function (r) { return r.ok ? r.text() : null; }, function () { return null; }) : Promise.resolve(null);
      read.then(function (t) { pre.textContent = t || 'THIRD_PARTY.md could not be read from here; it is at the top of the source folder.'; },
              function () { pre.textContent = 'THIRD_PARTY.md could not be read from here; it is at the top of the source folder.'; });
    });
    panel.appendChild(third);
    panel.appendChild(pre);
  }

  function focusables(n) {
    var out = [];
    (function walk(x) {
      if (!x || !x.children) return;
      for (var i = 0; i < x.children.length; i++) {
        var c = x.children[i], t = c.tagName;
        if (c.hidden) continue;
        var ti = c.getAttribute && c.getAttribute('tabindex');
        if (((t === 'BUTTON' || t === 'SELECT' || t === 'INPUT' || t === 'A' || t === 'TEXTAREA') && !c.disabled && ti !== '-1') || ti === '0') out.push(c);
        walk(c);
      }
    })(n);
    return out;
  }

  function showTab(id) {
    if (!D) return;
    var found = false;
    TABS.forEach(function (t) { if (t.id === id) found = true; });
    if (!found) id = 'audio';
    D.tab = id;
    TABS.forEach(function (t) {
      var b = D.tabs[t.id], p = D.panels[t.id], sel = t.id === id;
      b.setAttribute('aria-selected', sel ? 'true' : 'false');
      b.setAttribute('tabindex', sel ? '0' : '-1');
      p.hidden = !sel;
      if (sel && !p._built) { p._built = true; (t.id === 'audio' ? buildAudio : t.id === 'view' ? buildView : buildAbout)(p); }
    });
  }

  function open(tab) {
    if (!doc) return false;
    if (D) { showTab(tab || D.tab); safe(function () { D.tabs[D.tab].focus(); }); return true; }
    var prev = doc.activeElement;
    var overlay = el('div', 'sv-modal');
    var dlg = el('div', 'sv-dlg', null, { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sv-title' });
    var head = el('div', 'sv-head');
    head.appendChild(el('h2', 'sv-title', 'Settings', { id: 'sv-title' }));
    var x = btn('sv-x', 'Close', 'Close settings (Esc)');
    head.appendChild(x);
    var list = el('div', 'sv-tabs', null, { role: 'tablist', 'aria-label': 'Settings sections' });
    var body = el('div', 'sv-body');
    D = { overlay: overlay, dlg: dlg, tabs: {}, panels: {}, prevFocus: prev, timer: 0, tab: null };
    TABS.forEach(function (t) {
      var b = el('button', 'sv-tab', t.label, { role: 'tab', id: 'sv-tab-' + t.id, 'aria-controls': 'sv-panel-' + t.id, type: 'button' });
      b.type = 'button';
      on(b, 'click', function () { showTab(t.id); });
      list.appendChild(b);
      var p = el('div', 'sv-panel', null, { role: 'tabpanel', id: 'sv-panel-' + t.id, 'aria-labelledby': 'sv-tab-' + t.id });
      D.tabs[t.id] = b; D.panels[t.id] = p;
      body.appendChild(p);
    });
    on(list, 'keydown', function (ev) {
      var ids = TABS.map(function (t) { return t.id; }), i = ids.indexOf(D.tab);
      var n = ev.key === 'ArrowRight' ? i + 1 : ev.key === 'ArrowLeft' ? i - 1 : ev.key === 'Home' ? 0 : ev.key === 'End' ? ids.length - 1 : null;
      if (n == null) return;
      ev.preventDefault();
      n = (n + ids.length) % ids.length;
      showTab(ids[n]); D.tabs[ids[n]].focus();
    });
    var foot = el('div', 'sv-foot');
    foot.appendChild(el('span', 'sv-hint', 'Changes are saved as you make them.'));
    var done = btn('sv-done', 'Done', 'Close settings (Esc)');
    foot.appendChild(done);
    dlg.appendChild(head); dlg.appendChild(list); dlg.appendChild(body); dlg.appendChild(foot);
    overlay.appendChild(dlg);
    on(x, 'click', close); on(done, 'click', close);
    on(overlay, 'pointerdown', function (ev) { if (ev.target === overlay) close(); });
    on(overlay, 'keydown', function (ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); if (ev.stopPropagation) ev.stopPropagation(); close(); return; }
      if (ev.key === 'Tab') {
        var f = focusables(dlg); if (!f.length) return;
        var i = f.indexOf(doc.activeElement);
        if (ev.shiftKey && i <= 0) { ev.preventDefault(); f[f.length - 1].focus(); }
        else if (!ev.shiftKey && (i === f.length - 1 || i < 0)) { ev.preventDefault(); f[0].focus(); }
      }
      if (ev.stopPropagation) ev.stopPropagation();       // Space, Tab view switch and the other app keys stay out
    });
    on(overlay, 'keyup', function (ev) { if (ev.stopPropagation) ev.stopPropagation(); });
    (doc.body || doc.documentElement).appendChild(overlay);
    showTab(tab || 'audio');
    safe(function () { D.tabs[D.tab].focus(); });
    return true;
  }
  function close() {
    if (!D) return false;
    var d = D; D = null;
    if (d.timer) clearInterval(d.timer);
    if (d.overlay.parentNode) d.overlay.parentNode.removeChild(d.overlay);
    if (d.prevFocus && isFn(d.prevFocus.focus)) safe(function () { d.prevFocus.focus(); });
    return true;
  }

  // ------------------------------------------------------------------ load
  merge(readStore(), true);
  apply();
  (function readFile() {
    var sh = shell();
    if (!sh || !isFn(sh.readAppData)) return;
    try {
      Promise.resolve(sh.readAppData(FILE)).then(function (t) {
        if (!t) return;
        var o = null; try { o = JSON.parse(t); } catch (e) { o = null; }
        if (o && typeof o === 'object') { merge(o, false); try { if (root.localStorage) root.localStorage.setItem(LS_KEY, JSON.stringify(values)); } catch (e2) { /* ignore */ } }
      }, function () {});
    } catch (e) { /* no app data */ }
  })();

  var Settings = {
    get: get, set: set, open: open, close: close, on: onFn, off: offFn,
    isOpen: function () { return !!D; },
    tab: function () { return D ? D.tab : null; },
    defaults: function () { var o = {}; for (var k in DEFAULTS) if (has(DEFAULTS, k)) o[k] = DEFAULTS[k]; return o; },
    keys: function () { return Object.keys(DEFAULTS); },
    attach: attach, apply: apply, availability: availability, engineReport: engineReport, testTone: testTone
  };
  root.Settings = Settings;
})();
