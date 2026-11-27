/* ExportDialog (global ExportDialog), Pressing Crew V2: the Export… dialog and the Import audio… flow.
 *
 *   ExportDialog.available(host) -> {ok, why}            ok when Project.exportAudio or host.exportAudio exists
 *   ExportDialog.open(host, {shell, toast}) -> Promise<[{name, path?, seconds?, peak?}] | null>
 *       what: the mix, stems for all tracks, or chosen tracks; span: the whole song, one section, or a bar range;
 *       bit depth (16, 24, 32 float), sample rate, tail, master chain on stems; staged progress with Cancel; the result
 *       lists each file with its length and peak. Runs Project.exportAudio({host, shell, ...}) when present (it writes
 *       the files), else host.exportAudio(...) with onFile saving each file as it is rendered: Electron writes them into
 *       one folder chosen first (pickDirectory + writeFile + joinPath) or asks per file (saveFile); the web downloads them.
 *   ExportDialog.importAudio(host, {shell, toast}) -> Promise<[trackName]>
 *       picks audio files (Project.pickFiles, else Project.pickAudio) and calls host.addAudioTrack(file, {name, bar})
 *       at the playhead's bar, one file after another (each is one undo step in the Host).
 *   ExportDialog.isOpen(), ExportDialog.close()
 *
 * Bars in the dialog are 1-based and inclusive; the Host gets {from: first - 1, to: last} (0-based, `to` exclusive,
 * as host.render takes them). Every call is feature-detected. Defaults come from Settings 'export.*'.
 * Design notes: docs/research/2026-11-26-pressing-crew/transcripts/log-V2.md.
 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : this;
  var doc = root.document;

  var RATES = [0, 44100, 48000, 88200, 96000];

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
  function setting(key, d) { var S = root.Settings; var v = S && isFn(S.get) ? safe(function () { return S.get(key); }, undefined) : undefined; return v === undefined || v === null ? d : v; }
  function cleanName(s) { return String(s || '').replace(/[\\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function fileName(song, name) {
    var n = cleanName(name) || 'export';
    if (/\.wav$/i.test(n)) return n;
    return (song ? song + ' - ' : '') + n + '.wav';
  }
  function dbfs(p) { return typeof p === 'number' && isFinite(p) ? (p > 1e-6 ? (20 * Math.log(p) / Math.LN10).toFixed(1) + ' dBFS' : '-inf') : '—'; }
  function secs(s) { return typeof s === 'number' && isFinite(s) ? s.toFixed(2) + ' s' : '—'; }
  function download(name, bytes) {
    var blob = new root.Blob([bytes], { type: 'audio/wav' });
    var url = root.URL.createObjectURL(blob);
    var a = el('a');
    a.href = url; a.download = name; a.style.display = 'none';
    doc.body.appendChild(a); a.click();
    setTimeout(function () { try { doc.body.removeChild(a); root.URL.revokeObjectURL(url); } catch (e) { /* ignore */ } }, 2000);
  }

  function available(host) {
    if (root.Project && isFn(root.Project.exportAudio)) return { ok: true, why: '', via: 'project' };
    if (host && isFn(host.exportAudio)) return { ok: true, why: '', via: 'host' };
    return { ok: false, why: 'This engine has no multi-file export yet (host.exportAudio is missing): Export renders the whole song to one 16-bit WAV.' };
  }

  // ------------------------------------------------------------------ a writer for the files host.exportAudio hands over
  // Each file is saved as it arrives (host.exportAudio's onFile) and its bytes dropped, so one file is held at a time.
  // Electron: one folder chosen before the render (pickDirectory + joinPath + writeFile), else a save dialog per file;
  // web: a download per file. prepare() resolves false when no folder was chosen.
  function writer(song, shell) {
    var sh = shell, dir = null, mode = 'download';
    if (sh && isFn(sh.pickDirectory) && isFn(sh.writeFile) && isFn(sh.joinPath)) mode = 'folder';
    else if (sh && isFn(sh.saveFile)) mode = 'dialog';
    var w = {
      mode: mode, files: [], dir: null,
      prepare: function () {
        if (mode !== 'folder') return Promise.resolve(true);
        return Promise.resolve(sh.pickDirectory({ title: 'Export to a folder' })).then(function (d) { dir = d || null; w.dir = dir; return !!dir; });
      },
      onFile: function (f) {
        var rec = { name: fileName(song, f.name), seconds: f.seconds, peak: f.peak, lufs: f.lufs != null ? f.lufs : f.loudness, path: null };
        w.files.push(rec);
        var bytes = f.bytes;
        if (mode === 'folder') {
          rec.path = sh.joinPath(dir, rec.name);
          return Promise.resolve(sh.writeFile(rec.path, bytes)).then(function () { f.bytes = null; });
        }
        if (mode === 'dialog') {
          return Promise.resolve(sh.saveFile({ name: rec.name, data: bytes, filters: [{ name: 'WAV audio', extensions: ['wav'] }] })).then(function (r) {
            if (r) { rec.path = r.path || null; rec.name = r.name || rec.name; } else rec.skipped = true;
            f.bytes = null;
          });
        }
        download(rec.name, bytes);
        f.bytes = null;
        return null;
      }
    };
    return w;
  }

  // ------------------------------------------------------------------ the dialog
  var D = null;
  function isOpen() { return !!D; }
  function close() { if (D) D.close(); }

  function open(host, o) {
    o = o || {};
    var shell = o.shell !== undefined ? o.shell : (root.HavantechnoShell || null);
    function toast(t, ms) { if (isFn(o.toast)) o.toast(t, ms); }
    var av = available(host);
    if (!av.ok) { toast(av.why, 6000); return Promise.resolve(null); }
    if (D) { D.focus(); return D.promise; }

    var tracks = isFn(host.tracks) ? (safe(function () { return host.tracks(); }, []) || []) : [];
    var sections = isFn(host.sections) ? (safe(function () { return host.sections(); }, []) || []) : [];
    var total = isFn(host.totalBars) ? safe(function () { return host.totalBars(); }, 0) : 0;
    if (!total) sections.forEach(function (s) { total = Math.max(total, (s.start || 0) + (s.bars || 0)); });
    var song = cleanName(safe(function () { return host.document().name; }, '')) || 'havantechno';

    var prev = doc.activeElement;
    var overlay = el('div', 'hvs-modal');
    var dlg = el('div', 'hvs-dlg xd-dlg', null, { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'xd-title' });
    var head = el('div', 'hvs-head');
    head.appendChild(el('h2', 'hvs-title', 'Export audio', { id: 'xd-title' }));
    var body = el('div', 'hvs-body xd-body');
    var foot = el('div', 'hvs-foot');
    dlg.appendChild(head); dlg.appendChild(body); dlg.appendChild(foot);
    overlay.appendChild(dlg);
    var R = { running: false, cancelled: false, done: false, abort: null, resolve: null };
    var promise = new Promise(function (res) { R.resolve = res; });

    function focusables() {
      var out = [];
      (function walk(n) {
        if (!n || !n.children) return;
        for (var i = 0; i < n.children.length; i++) {
          var c = n.children[i], t = c.tagName;
          if (c.hidden) continue;
          if ((t === 'BUTTON' || t === 'SELECT' || t === 'INPUT') && !c.disabled) out.push(c);
          walk(c);
        }
      })(dlg);
      return out;
    }
    function finish(result) {
      if (R.done) return;
      R.done = true;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      D = null;
      if (prev && isFn(prev.focus)) safe(function () { prev.focus(); });
      R.resolve(result);
    }
    function cancel() {
      if (!R.running) { finish(R.result || null); return; }
      if (R.cancelled) return;
      R.cancelled = true;
      if (R.abort) safe(function () { R.abort.abort(); });
      say('Cancelled. Nothing is saved; the engine may finish its current render in the background.');
      setFoot([btn('xd-close', 'Close', 'Close')]);
      foot.firstChild.addEventListener('click', function () { R.running = false; finish(null); });
      safe(function () { foot.firstChild.focus(); });
    }
    on(overlay, 'keydown', function (ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); if (ev.stopPropagation) ev.stopPropagation(); cancel(); return; }
      if (ev.key === 'Tab') {
        var f = focusables(); if (!f.length) return;
        var i = f.indexOf(doc.activeElement);
        if (ev.shiftKey && i <= 0) { ev.preventDefault(); f[f.length - 1].focus(); }
        else if (!ev.shiftKey && (i === f.length - 1 || i < 0)) { ev.preventDefault(); f[0].focus(); }
      }
      if (ev.stopPropagation) ev.stopPropagation();
    });
    on(overlay, 'keyup', function (ev) { if (ev.stopPropagation) ev.stopPropagation(); });
    function setFoot(list) { clear(foot); list.forEach(function (b) { foot.appendChild(b); }); }
    var status = el('p', 'hvs-status', '', { role: 'status', 'aria-live': 'polite' });
    function say(t) { status.textContent = t || ''; }

    // ---- the form
    var uid = 0;
    function radio(group, value, label, checked) {
      var id = 'xd-' + group + '-' + (++uid);
      var w = el('label', 'xd-opt', null, { 'for': id });
      var r = el('input', null, null, { type: 'radio', name: 'xd-' + group, id: id, value: value });
      r.checked = !!checked; if (checked) r.setAttribute('checked', 'checked');
      w.appendChild(r); w.appendChild(el('span', null, label));
      return { el: w, input: r };
    }
    function fieldset(legend) { var f = el('fieldset', 'xd-fs'); f.appendChild(el('legend', 'hvs-h', legend)); return f; }
    function sel(options, value, label) {
      var s = el('select', 'hvs-select', null, { 'aria-label': label });
      options.forEach(function (op, i) { s.appendChild(el('option', null, op.label, { value: String(i) })); });
      for (var i = 0; i < options.length; i++) if (String(options[i].value) === String(value)) s.value = String(i);
      s._val = function () { return options[parseInt(s.value, 10) || 0].value; };
      return s;
    }

    // what
    var fsWhat = fieldset('What');
    var wMix = radio('what', 'mix', 'The mix (one file)', true);
    var wStems = radio('what', 'stems', 'Stems: one file per track (' + tracks.length + '), plus each return', false);
    var wPick = radio('what', 'pick', 'Chosen tracks', false);
    [wMix, wStems, wPick].forEach(function (r) { fsWhat.appendChild(r.el); });
    var pickBox = el('div', 'xd-picks', null, { role: 'group', 'aria-label': 'Tracks to export' });
    var picks = tracks.map(function (t) {
      var id = 'xd-t-' + (++uid);
      var w = el('label', 'xd-opt xd-chk', null, { 'for': id, 'data-fam': t.family || 'utility' });
      var c = el('input', null, null, { type: 'checkbox', id: id, value: t.name });
      c.value = t.name;
      w.appendChild(c); w.appendChild(el('span', null, t.name));
      pickBox.appendChild(w);
      return c;
    });
    fsWhat.appendChild(pickBox);
    var master = el('input', null, null, { type: 'checkbox', id: 'xd-master' });
    master.checked = false;
    var masterW = el('label', 'xd-opt xd-chk', null, { 'for': 'xd-master' });
    masterW.appendChild(master); masterW.appendChild(el('span', null, 'Stems through the master chain (EQ, glue, limiter)'));
    var masterHint = el('p', 'hvs-hint', '');
    fsWhat.appendChild(masterW); fsWhat.appendChild(masterHint);
    body.appendChild(fsWhat);

    // span
    var fsSpan = fieldset('Span');
    var sSong = radio('span', 'song', 'The whole song (' + total + ' bars)', true);
    var sSec = radio('span', 'section', 'One section', false);
    var sBars = radio('span', 'bars', 'Bars', false);
    var secSel = sel(sections.map(function (s) { return { value: s.name, label: s.name + ' (bars ' + ((s.start || 0) + 1) + '–' + ((s.start || 0) + (s.bars || 0)) + ')' }; }), sections[0] ? sections[0].name : '', 'Section');
    var fromIn = el('input', 'hvs-num', null, { type: 'number', min: '1', max: String(Math.max(1, total)), step: '1', 'aria-label': 'First bar' });
    var toIn = el('input', 'hvs-num', null, { type: 'number', min: '1', max: String(Math.max(1, total)), step: '1', 'aria-label': 'Last bar (included)' });
    var pb = safe(function () { return host.transport.pos().bar; }, 0) || 0;
    fromIn.value = String(pb + 1); toIn.value = String(Math.min(Math.max(1, total), pb + 2));
    fsSpan.appendChild(sSong.el);
    var secRow = el('div', 'xd-line'); secRow.appendChild(sSec.el); secRow.appendChild(secSel); fsSpan.appendChild(secRow);
    var barRow = el('div', 'xd-line'); barRow.appendChild(sBars.el); barRow.appendChild(fromIn); barRow.appendChild(el('span', 'hvs-hint', 'to')); barRow.appendChild(toIn); fsSpan.appendChild(barRow);
    if (!sections.length) { sSec.input.disabled = true; secSel.disabled = true; }
    body.appendChild(fsSpan);

    // format
    var fsFmt = fieldset('Format');
    var bitSel = sel([{ value: 16, label: '16-bit' }, { value: 24, label: '24-bit' }, { value: 32, label: '32-bit float' }], setting('export.bitDepth', 24), 'Bit depth');
    var rateSel = sel(RATES.map(function (r) { return { value: r, label: r ? (r / 1000) + ' kHz' : 'Engine rate' }; }), setting('export.sampleRate', 0), 'Sample rate');
    var tailIn = el('input', 'hvs-num', null, { type: 'number', min: '0', max: '30', step: '0.5', 'aria-label': 'Tail in seconds' });
    tailIn.value = String(setting('export.tail', 2));
    function labeled(text, c) { var w = el('label', 'xd-f'); w.appendChild(el('span', 'hvs-lbl', text)); w.appendChild(c); return w; }
    var fmtRow = el('div', 'xd-line');
    fmtRow.appendChild(labeled('Bit depth', bitSel)); fmtRow.appendChild(labeled('Sample rate', rateSel)); fmtRow.appendChild(labeled('Tail (s)', tailIn));
    fsFmt.appendChild(fmtRow);
    fsFmt.appendChild(el('p', 'hvs-hint', 'Dither (TPDF) applies at 16-bit only. 32-bit float keeps peaks above 0 dBFS. Every file has the same length and starts at the span’s first bar, so stems line up on the grid. The reference track is never exported.'));
    body.appendChild(fsFmt);
    body.appendChild(status);

    function what() { return wMix.input.checked ? 'mix' : wStems.input.checked ? 'stems' : 'pick'; }
    function sync() {
      var w = what();
      picks.forEach(function (c) { c.disabled = w !== 'pick'; });
      pickBox.hidden = w !== 'pick';
      master.disabled = w === 'mix';
      masterHint.textContent = w === 'mix' ? 'The mix always goes through the master chain.' : 'Off: each stem is the track’s channel output, and the stems add up to the mix before the master chain.';
      secSel.disabled = !sSec.input.checked || !sections.length;
      fromIn.disabled = toIn.disabled = !sBars.input.checked;
    }
    [wMix, wStems, wPick, sSong, sSec, sBars].forEach(function (r) { on(r.input, 'change', sync); on(r.input, 'click', sync); });
    sync();

    function options() {
      var w = what(), err = '';
      var whatOpt = w === 'pick' ? picks.filter(function (c) { return c.checked; }).map(function (c) { return c.value; }) : w;
      if (w === 'pick' && !whatOpt.length) err = 'Choose at least one track.';
      var scope = 'song';
      if (sSec.input.checked) scope = { section: secSel._val() };
      else if (sBars.input.checked) {
        var a = parseInt(fromIn.value, 10), b = parseInt(toIn.value, 10);
        if (!(a >= 1) || !(b >= a) || (total && b > total)) err = 'Bars: the first must be 1 or more and the last between the first and ' + total + '.';
        scope = { from: a - 1, to: b };
      }
      var tail = Number(tailIn.value); if (!(tail >= 0)) tail = 0; tail = Math.min(30, tail);
      var sr = Number(rateSel._val()) || undefined;
      return { err: err, opts: { scope: scope, what: whatOpt, bitDepth: Number(bitSel._val()), sampleRate: sr, tailSeconds: tail, master: w === 'mix' ? true : !!master.checked } };
    }

    // ---- run
    var bar = el('div', 'xd-bar', null, { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', 'aria-label': 'Export progress' });
    var fill = el('i'); bar.appendChild(fill);
    function progress(p) {
      if (R.cancelled) return;
      var f = null, text = '';
      if (typeof p === 'number') f = p;
      else if (p && typeof p === 'object') {
        f = typeof p.fraction === 'number' ? p.fraction : typeof p.progress === 'number' ? p.progress : (p.total > 0 && p.done != null ? p.done / p.total : null);
        if (p.index != null && p.total > 0 && f != null) f = (p.index + Math.max(0, Math.min(1, f))) / p.total;     // host.exportAudio: per file
        var stage = p.stage === 'render' ? 'Rendering' : p.stage === 'encode' ? 'Encoding' : p.stage === 'done' ? 'Saved' : p.stage === 'skipped' ? 'Skipped (silent)' : p.stage;
        text = [stage, p.name || p.track].filter(Boolean).join(': ');
        if (p.index != null && p.total) text += ' (' + (p.index + 1) + ' of ' + p.total + ')';
      }
      if (f != null && isFinite(f)) { var pc = Math.round(Math.max(0, Math.min(1, f)) * 100); fill.style.width = pc + '%'; bar.setAttribute('aria-valuenow', String(pc)); }
      if (text) say(text + '…');
    }
    function run() {
      var o2 = options();
      if (o2.err) { say(o2.err); return; }
      var opts = o2.opts;
      R.running = true; R.cancelled = false;
      var AC = root.AbortController;
      R.abort = isFn(AC) ? new AC() : null;
      if (R.abort) opts.signal = R.abort.signal;
      opts.onProgress = progress;
      Array.prototype.forEach.call(body.children, function (c) { if (c !== status) c.hidden = true; });
      body.insertBefore(bar, status);
      say('Rendering…');
      var cancelBtn = btn('', 'Cancel', 'Cancel the export (Esc)');
      on(cancelBtn, 'click', cancel);
      setFoot([cancelBtn]);
      safe(function () { cancelBtn.focus(); });
      var p, wr = null;
      try {
        if (av.via === 'project') {
          // Project.exportAudio writes the files and resolves [{name, path?}]; its onFile hook (called after each write)
          // gives the length, peak and any loudness the Host measured, merged into the result by name
          var meta = {};
          opts.onFile = function (f) { meta[f.name] = { seconds: f.seconds, peak: f.peak, lufs: f.lufs != null ? f.lufs : f.loudness }; };
          p = Promise.resolve(root.Project.exportAudio(Object.assign({ host: host, shell: shell }, opts))).then(function (list) {
            return (list || []).map(function (f) { var m = meta[f.name] || {}; return { name: f.name, path: f.path || null, seconds: f.seconds != null ? f.seconds : m.seconds, peak: f.peak != null ? f.peak : m.peak, lufs: m.lufs }; });
          });
        }
        else {
          wr = writer(song, shell);
          p = wr.prepare().then(function (ok) {
            if (!ok) return null;
            if (R.cancelled) return null;
            say('Rendering…');
            opts.onFile = function (f) { if (R.cancelled) return null; return wr.onFile(f); };
            return Promise.resolve(host.exportAudio(opts)).then(function (files) {
              if (!Array.isArray(files) || !files.length) throw new Error('the engine returned no files');
              return wr.files.filter(function (f) { return !f.skipped; });
            });
          });
        }
      } catch (e) { p = Promise.reject(e); }
      Promise.resolve(p).then(function (res) {
        if (R.cancelled) return;
        R.running = false;
        if (!res || !res.length) { say('Not saved: no folder or file was chosen.'); showResult(null); return; }
        R.result = res.map(function (f) { return { name: f.name, path: f.path || null, seconds: f.seconds, peak: f.peak, lufs: f.lufs != null ? f.lufs : f.loudness }; });
        showResult(R.result);
        toast('Exported ' + R.result.length + ' file' + (R.result.length === 1 ? '' : 's'));
      }, function (e) {
        if (R.cancelled) return;
        R.running = false;
        var aborted = e && e.name === 'AbortError';
        say(aborted ? 'Cancelled.' : 'Export failed: ' + msg(e));
        if (root.console && !aborted) root.console.warn('[ExportDialog] ' + msg(e));
        showResult(null);
      });
    }
    function showResult(list) {
      if (bar.parentNode) bar.parentNode.removeChild(bar);
      if (list) {
        var t = el('table', 'xd-res');
        var cap = el('caption', null, list.length + ' file' + (list.length === 1 ? '' : 's'));
        t.appendChild(cap);
        // loudness only when the engine measured it (integrated LUFS, as read; no target is implied)
        var hasL = list.some(function (f) { return typeof f.lufs === 'number' && isFinite(f.lufs); });
        var hr = el('tr'); ['File', 'Length', 'Peak'].concat(hasL ? ['Loudness'] : []).forEach(function (h) { hr.appendChild(el('th', null, h, { scope: 'col' })); }); t.appendChild(hr);
        list.forEach(function (f) {
          var r = el('tr');
          var c0 = el('td', null, f.name); if (f.path) c0.title = f.path;
          r.appendChild(c0); r.appendChild(el('td', null, secs(f.seconds))); r.appendChild(el('td', null, dbfs(f.peak)));
          if (hasL) r.appendChild(el('td', null, typeof f.lufs === 'number' && isFinite(f.lufs) ? f.lufs.toFixed(1) + ' LUFS' : '—'));
          t.appendChild(r);
        });
        body.insertBefore(t, status);
        var where = list[0] && list[0].path ? 'Saved beside ' + String(list[0].path).replace(/[^\\\/]*$/, '') : 'Saved to your downloads.';
        say(where);
      }
      var again = btn('', 'Export again', 'Back to the export options');
      on(again, 'click', function () {
        Array.prototype.slice.call(body.children).forEach(function (c) { if (c.tagName === 'TABLE') body.removeChild(c); else c.hidden = false; });
        say(''); setFoot([cancelForm, go]); sync(); safe(function () { go.focus(); });
      });
      var done = btn('hvs-done', 'Close', 'Close (Esc)');
      on(done, 'click', function () { finish(R.result || null); });
      setFoot([again, done]);
      safe(function () { done.focus(); });
    }

    var go = btn('hvs-done xd-go', 'Export', 'Render and save the files');
    var cancelForm = btn('', 'Cancel', 'Close without exporting (Esc)');
    on(go, 'click', run);
    on(cancelForm, 'click', cancel);
    setFoot([cancelForm, go]);
    (doc.body || doc.documentElement).appendChild(overlay);
    D = { close: function () { cancel(); if (!R.done) finish(null); }, focus: function () { var f = focusables(); if (f.length) safe(function () { f[0].focus(); }); }, promise: promise, run: run, el: dlg };
    safe(function () { wMix.input.focus(); });
    return promise;
  }

  // ------------------------------------------------------------------ import audio files as audio tracks
  function importAudio(host, o) {
    o = o || {};
    var shell = o.shell !== undefined ? o.shell : (root.HavantechnoShell || null);
    function toast(t, ms) { if (isFn(o.toast)) o.toast(t, ms); }
    if (!host || !isFn(host.addAudioTrack)) { toast('Audio tracks are not available in this engine yet (host.addAudioTrack is missing).', 6000); return Promise.resolve([]); }
    var P = root.Project;
    var pick;
    try {
      if (P && isFn(P.pickFiles)) pick = P.pickFiles({ shell: shell, multiple: true, accept: 'audio/*' });
      else if (P && isFn(P.pickAudio)) pick = Promise.resolve(P.pickAudio({ shell: shell })).then(function (f) { return f ? [f] : null; });
      else { toast('Picking files is not available (Project.pickFiles is missing).'); return Promise.resolve([]); }
    } catch (e) { toast('Could not open a file: ' + msg(e)); return Promise.resolve([]); }
    return Promise.resolve(pick).then(function (files) {
      files = (files || []).filter(function (f) { return f && /\.(wav|wave|mp3|ogg|oga|opus|flac|aif|aiff|m4a|aac|webm)$/i.test(f.name || f.path || ''); });
      if (!files.length) return [];
      var bar = safe(function () { return host.transport.pos().bar; }, 0) || 0;
      var names = [], q = Promise.resolve();
      files.forEach(function (f) {
        q = q.then(function () {
          var nm = String(f.name || String(f.path || '').replace(/^.*[\\\/]/, '') || 'audio').replace(/\.[^.]+$/, '');
          return Promise.resolve(host.addAudioTrack(f, { name: nm, bar: bar })).then(function (t) { if (t) names.push(t); },
            function (e) { toast('Could not add ' + (f.name || 'a file') + ': ' + msg(e), 6000); });
        });
      });
      return q.then(function () {
        if (names.length) toast('Added ' + names.length + ' audio track' + (names.length === 1 ? '' : 's') + ' at bar ' + (bar + 1) + ': ' + names.join(', '), 5000);
        return names;
      });
    }, function (e) { toast('Could not open a file: ' + msg(e)); return []; });
  }

  root.ExportDialog = { open: open, available: available, importAudio: importAudio, isOpen: isOpen, close: close, fileName: fileName };
})();
