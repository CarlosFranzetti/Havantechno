/* ImportView (global ImportView), Dubplate Crew D2: the import flow, the analysis report view, the A/B control for the
 * transport and the reference lane for the System Editor. Styles: ui/import-view.css (the lane reuses the System
 * Editor's band classes se-band, se-bandl, se-area, se-ph so it lines up with the section ruler).
 *
 *   ImportView.importTrack(host, {shell, toast, onDone(result)}) -> Promise<result|null>
 *       pick an audio file (Project.pickAudio), optionally stems (Electron: HavantechnoShell.separate; browser: drop or
 *       pick stem files, or skip), then Project.importTrack({file, stems, shell, host, onProgress, signal}) with staged
 *       progress and a cancel that restores the document as it was before the import.
 *   ImportView.mount(el, host, {onClose}) -> {el, update(), refresh(), dispose()}      the report view
 *   ImportView.abControl(host, {toast}) -> {el, update(), toggle()}                    A/B, level match, reference gain
 *   ImportView.lane(host) -> {el, update(frac), dispose()}                             reference lane (System Editor)
 *   ImportView.availability(host) -> {name: {ok, why}}                                 which frozen calls exist
 *
 * Talks only to Host and Project (BRIEF "Frozen interface"); every call is feature-detected: a missing call disables
 * its control with a visible reason and never throws. Design notes: docs/research/2026-11-11-dubplate-crew/transcripts/log-D2.md.
 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : this;
  var doc = root.document;

  // ------------------------------------------------------------------ helpers
  function isFn(f) { return typeof f === 'function'; }
  function has(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function safe(fn, dflt) { try { return fn(); } catch (e) { return dflt; } }
  function el(tag, cls, text, attrs) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = String(text);
    if (attrs) for (var k in attrs) if (has(attrs, k)) e.setAttribute(k, String(attrs[k]));
    return e;
  }
  function btn(cls, text, label) {
    var b = el('button', 'ap-btn iv-btn' + (cls ? ' ' + cls : ''), text);
    b.type = 'button'; b.setAttribute('type', 'button');
    if (label) { b.title = label; b.setAttribute('aria-label', label); }
    return b;
  }
  function on(e, t, fn) { if (e && isFn(e.addEventListener)) e.addEventListener(t, fn); }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }
  function msg(e) { return (e && e.message) ? e.message : String(e); }
  function r1(x) { return Math.round(x * 10) / 10; }
  function r2(x) { return Math.round(x * 100) / 100; }
  function lufs(x) { return typeof x === 'number' && isFinite(x) ? (x < 0 ? '\u2212' : '') + Math.abs(r1(x)).toFixed(1) : '?'; }
  function dbStr(x) { return (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(r1(x)).toFixed(1); }
  function toDb(g) { return g > 0 ? 20 * Math.log(g) / Math.LN10 : -Infinity; }
  function fromDb(d) { return Math.pow(10, d / 20); }
  function clockStr(s) { if (!(s >= 0)) return '?'; var m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); }
  function baseName(p) { return String(p || '').split(/[\\/]/).pop(); }
  function setDisabled(b, off, why) {
    // aria-disabled keeps the control focusable, so its reason can be read and activating it can say why
    if (off) { b.setAttribute('aria-disabled', 'true'); if (why) b.title = why; }
    else { if (b.removeAttribute) b.removeAttribute('aria-disabled'); }
    b._why = off ? (why || '') : '';
  }
  function isOff(b) { return !!b && b.getAttribute && b.getAttribute('aria-disabled') === 'true'; }
  function hostDoc(host) { return safe(function () { return host.document(); }, null); }
  function findTrack(d, name) {
    var ts = (d && d.tracks) || [];
    for (var i = 0; i < ts.length; i++) if (ts[i].name === name) return ts[i];
    return null;
  }

  // ------------------------------------------------------------------ availability (one place for every reason)
  function availability(host, shell) {
    var P = root.Project, sh = shell !== undefined ? shell : (root.HavantechnoShell || null), h = host || {};
    function a(ok, why) { return { ok: !!ok, why: ok ? '' : why }; }
    return {
      pickAudio: a(P && isFn(P.pickAudio), 'No audio file picker: Project.pickAudio is missing.'),
      importTrack: a(P && isFn(P.importTrack), 'Import is not available yet: Project.importTrack is missing (engine D1).'),
      separate: a(sh && isFn(sh.separate), 'Stem separation runs only in the desktop app.'),
      reference: a(isFn(h.reference), 'This engine has no reference track yet (host.reference is missing).'),
      ab: a(isFn(h.ab), 'This engine has no A/B yet (host.ab is missing).'),
      matchLevel: a(isFn(h.matchLevel), 'This engine cannot match levels yet (host.matchLevel is missing).'),
      setReferenceParam: a(isFn(h.setReferenceParam), 'This engine cannot set the reference gain yet (host.setReferenceParam is missing).'),
      analysis: a(isFn(h.analysis), 'This engine keeps no analysis yet (host.analysis is missing).'),
      applyRecreation: a(isFn(h.applyRecreation), 'This engine cannot change a recreation yet (host.applyRecreation is missing).')
    };
  }
  function refOf(host) { return isFn(host.reference) ? safe(function () { return host.reference(); }, null) : null; }
  function analysisOf(host) { return isFn(host.analysis) ? safe(function () { return host.analysis(); }, null) : null; }

  // ------------------------------------------------------------------ confidence: a word and a visual weight
  var CONF_RANK = { high: 3, medium: 2, low: 1, none: 0 };
  function confWord(c) {
    if (typeof c === 'number' && c === c) return c >= 0.75 ? 'high' : c >= 0.5 ? 'medium' : c > 0 ? 'low' : 'none';
    c = String(c == null ? 'none' : c).toLowerCase();
    return has(CONF_RANK, c) ? c : 'none';
  }
  function confBadge(c) {
    var w = confWord(c), n = CONF_RANK[w], b = el('span', 'iv-conf', null, { 'data-conf': w });
    var pips = el('span', 'iv-pips', null, { 'aria-hidden': 'true' });
    for (var i = 0; i < 3; i++) pips.appendChild(el('i', i < n ? 'on' : ''));
    b.appendChild(pips);
    b.appendChild(el('span', 'iv-cw', w === 'none' ? 'no call' : w + (typeof c === 'number' ? ' ' + r2(c) : '')));
    return b;
  }

  // ------------------------------------------------------------------ decisions
  var DEC_ORDER = ['synthOrSample', 'drumMachine', 'monoPoly', 'fmOrSubtractive', 'reverb', 'reverbShared'];
  var DEC_LABEL = { synthOrSample: 'Synth or sample', drumMachine: 'Drum machine', monoPoly: 'Mono or poly', fmOrSubtractive: 'FM or subtractive',
                    reverb: 'Reverb', reverbShared: 'Reverb shared or own' };
  function decValue(d) {
    var v = d ? d.value : null;
    if (v == null) return 'no call';
    if (typeof v === 'object') {
      if (v.present !== undefined) return v.present === true ? 'yes, RT60 ' + r2(v.rt60) + ' s' + (v.predelayMs != null ? ', pre-delay ' + Math.round(v.predelayMs) + ' ms' : '') : v.present === false ? 'no' : String(v.present);
      var s = (v.machine || '') + (v.voice ? ' ' + v.voice : '') + (v.source ? ' (' + v.source + ')' : '');
      return s || safe(function () { return JSON.stringify(v); }, '?');
    }
    return String(v);
  }
  function decKeys(decs) {
    var out = [], k;
    DEC_ORDER.forEach(function (x) { if (has(decs, x)) out.push(x); });
    for (k in decs) if (has(decs, k) && out.indexOf(k) < 0) out.push(k);
    return out;
  }
  function decisionChip(key, d) {
    var w = confWord(d && d.confidence), label = DEC_LABEL[key] || key, val = decValue(d);
    var c = el('div', 'iv-dc', null, { 'data-conf': w, role: 'group' });
    c.setAttribute('aria-label', label + ': ' + val + ', ' + (w === 'none' ? 'no call' : w + ' confidence'));
    c.appendChild(el('span', 'iv-dl', label));
    c.appendChild(el('span', 'iv-dv', val + (w === 'low' ? ' ?' : '')));
    c.appendChild(confBadge(d && d.confidence));
    return c;
  }
  function evidenceBlock(e) {
    var decs = e.decisions || {}, ks = decKeys(decs), rec = e.suggested || e.recreation, any = false;
    var det = el('details', 'iv-ev'), sum = el('summary', null, 'Evidence and alternatives');
    det.appendChild(sum);
    var dl = el('dl');
    ks.forEach(function (k) {
      var d = decs[k] || {}, ev = [].concat(d.evidence || []), alt = [].concat(d.alternatives || []);
      if (!ev.length && !alt.length) return;
      any = true;
      dl.appendChild(el('dt', null, (DEC_LABEL[k] || k) + (typeof d.p === 'number' ? ' (p ' + r2(d.p) + ')' : '')));
      ev.forEach(function (x) { dl.appendChild(el('dd', null, typeof x === 'string' ? x : safe(function () { return JSON.stringify(x); }, '?'))); });
      alt.forEach(function (x) { dl.appendChild(el('dd', 'alt', 'alternative: ' + (typeof x === 'string' ? x : decValue({ value: x.value !== undefined ? x.value : x }) + (x.confidence ? ' [' + x.confidence + ']' : '')))); });
    });
    if (rec && rec.why && rec.why.length) {
      any = true;
      dl.appendChild(el('dt', null, 'Recreation ' + rec.type));
      rec.why.forEach(function (x) { dl.appendChild(el('dd', null, String(x))); });
      if (rec.params) { var ps = Object.keys(rec.params); if (ps.length) dl.appendChild(el('dd', 'alt', 'starting params: ' + ps.map(function (p) { return p + ' ' + rec.params[p]; }).join(', '))); }
    }
    if (!any) dl.appendChild(el('dd', null, 'The report carries no evidence for this element.'));
    det.appendChild(dl);
    return det;
  }

  // ------------------------------------------------------------------ recreation choices
  var CLASSIC_LABELS = { tb303: 'HVT-303 bass line', modeld: 'HVT-D mono synth', juno: 'HVT-106 poly synth' };
  function typeList(G, skip) { var x = root[G]; return x && isFn(x.types) ? safe(function () { return x.types(); }, []).filter(function (t) { return !skip || skip.indexOf(t) < 0; }) : []; }
  function recreationGroups() {
    var drums = typeList('Drums'), classics = typeList('Classics');
    var synths = typeList('Synths', drums.concat(classics));
    return [
      { label: 'Drum machine voices', types: drums },
      { label: 'Classic synths', types: classics },
      { label: 'Engine synths', types: synths },
      { label: 'Sampler', types: ['sampler'] }
    ];
  }
  function typeLabel(t) { return CLASSIC_LABELS[t] ? t + ' · ' + CLASSIC_LABELS[t] : t === 'sampler' ? 'sampler (the stem’s own audio)' : t; }
  function trackType(t) { return t ? String(t.type === 'sampler' ? 'sampler' : (t.inst || t.type || '')) : ''; }

  // ------------------------------------------------------------------ report view
  function mount(container, host, o) {
    o = o || {};
    var disposed = false, suggested = {}, lastSig = '', status = null;
    var panel = el('section', 'iv-report', null, { role: 'region', 'aria-label': 'Analysis report', tabindex: '-1' });
    var head = el('div', 'iv-rhead');
    var title = el('h2', 'iv-title', 'Analysis report');
    var close = btn('', 'Close', 'Close the report (Esc)');
    on(close, 'click', function () { if (isFn(o.onClose)) o.onClose(); });
    head.appendChild(title);
    status = el('span', 'iv-status', '', { role: 'status', 'aria-live': 'polite' });
    head.appendChild(status);
    head.appendChild(el('span', 'iv-spacer'));
    head.appendChild(close);
    var body = el('div', 'iv-rbody');
    panel.appendChild(head); panel.appendChild(body);
    container.appendChild(panel);
    on(panel, 'keydown', function (ev) { if (ev.key === 'Escape' && !ev.defaultPrevented && isFn(o.onClose)) { ev.preventDefault(); o.onClose(); } });

    function say(t) { status.textContent = t || ''; }

    function headerInfo(an) {
      var box = el('div', 'iv-meta');
      var src = an.source || {};
      function item(k, v, conf) {
        var it = el('div', 'iv-mi'); it.appendChild(el('span', 'iv-mk', k));
        var vv = el('span', 'iv-mv', v); it.appendChild(vv);
        if (conf !== undefined) it.appendChild(confBadge(conf));
        box.appendChild(it);
      }
      item('Source', (src.name || 'unnamed') + (src.duration ? ' · ' + clockStr(src.duration) : '') + (src.sampleRate ? ' · ' + Math.round(src.sampleRate) + ' Hz' : ''));
      var bpm = an.bpm || {};
      item('Tempo', bpm.value ? r2(bpm.value) + ' BPM' + (confWord(bpm.confidence) === 'low' ? ' ?' : '') : 'not estimated', bpm.value ? bpm.confidence : undefined);
      var sp = an.separator, stemNames = [].concat(an.stems || []).map(function (x) { return x && (x.name || x); }).filter(function (x) { return x && x !== 'mix'; });
      var sepTxt;
      if (sp && sp.error) sepTxt = 'failed (' + sp.error + '): the mix was analysed';
      else if (sp) sepTxt = [sp.model || sp.name || 'separated', sp.stems ? (sp.stems.length || Object.keys(sp.stems).length) + ' stems' : ''].filter(Boolean).join(' · ');
      else if (stemNames.length) sepTxt = 'stems supplied: ' + stemNames.join(', ');
      else sepTxt = 'none: the mix was analysed in bands';
      item('Separation', sepTxt);
      var ref = refOf(host);
      item('Reference', ref ? (ref.name || ref.id) + (ref.ready === false ? ' (loading)' : '') : 'none');
      return box;
    }

    function unverifiedBox(list, title_) {
      var box = el('div', 'iv-unv', null, { role: 'note' });
      box.appendChild(el('h3', null, title_));
      var ul = el('ul');
      list.forEach(function (t) { ul.appendChild(el('li', null, String(t))); });
      box.appendChild(ul);
      return box;
    }

    function recControl(e, d) {
      var A = availability(host).applyRecreation;
      var wrap = el('div', 'iv-rec');
      var id = 'iv-rec-' + String(e.id).replace(/[^A-Za-z0-9_-]/g, '_');
      wrap.appendChild(el('label', 'iv-mk', 'Recreation', { 'for': id }));
      var sel = el('select', 'iv-sel', null, { id: id, 'data-el': String(e.id) });
      sel.id = id;
      var sug = suggested[e.id];
      var tr = e.track ? findTrack(d, e.track) : null, cur = tr ? ((e.loaded && e.loaded.type) || trackType(tr)) : '__none';
      if (sug && sug.type) {
        var og0 = el('optgroup'); og0.setAttribute('label', 'Suggested by the analysis');
        og0.appendChild(el('option', null, typeLabel(sug.type) + ' (' + confWord(sug.confidence) + ' confidence)', { value: sug.type }));
        sel.appendChild(og0);
      }
      recreationGroups().forEach(function (g) {
        var ts = g.types.filter(function (t) { return !sug || t !== sug.type; });
        if (!ts.length) return;
        var og = el('optgroup'); og.setAttribute('label', g.label);
        ts.forEach(function (t) { og.appendChild(el('option', null, typeLabel(t), { value: t })); });
        sel.appendChild(og);
      });
      var none = el('option', null, 'None (no track)', { value: '__none' });
      sel.appendChild(none);
      // a current type the lists do not hold (an older engine type) still shows as selected
      var values = ['__none'].concat(sug && sug.type ? [sug.type] : []);
      recreationGroups().forEach(function (g) { values = values.concat(g.types); });
      if (cur && values.indexOf(cur) < 0) {
        var oc = el('option', null, cur + ' (current)', { value: cur });
        if (isFn(sel.insertBefore) && sel.firstChild) sel.insertBefore(oc, sel.firstChild); else sel.appendChild(oc);
      }
      sel.value = cur;
      if (!A.ok) { sel.disabled = true; sel.title = A.why; }
      on(sel, 'change', function () {
        var v = sel.value, rec = v === '__none' ? null : (sug && v === sug.type ? sug : { type: v, params: {}, confidence: 'owner', why: ['chosen by the owner'] });
        var r;
        try { r = host.applyRecreation(e.id, rec); } catch (err) { r = false; say('Could not change ' + (e.name || e.id) + ': ' + msg(err)); }
        Promise.resolve(r).then(function (ok) {
          if (ok === false) { sel.value = cur; say('The engine refused that change for ' + (e.name || e.id) + '.'); return; }
          say(rec ? (e.name || e.id) + ': now ' + rec.type + ' (undo with Ctrl/Cmd+Z)' : (e.name || e.id) + ': track removed (undo with Ctrl/Cmd+Z)');
          refresh(true);
        }, function (err) { sel.value = cur; say('Could not change ' + (e.name || e.id) + ': ' + msg(err)); });
      });
      wrap.appendChild(sel);
      if (!A.ok) wrap.appendChild(el('span', 'iv-why', A.why));
      return wrap;
    }

    // band: D1 stores [lo, hi] in Hz; a string or {name|lo,hi} also reads
    function bandText(b) {
      if (!b) return '';
      if (typeof b === 'string') return b;
      var arr = Object.prototype.toString.call(b) === '[object Array]', lo = arr ? b[0] : b.lo, hi = arr ? b[1] : b.hi;
      if (b.name) return b.name;
      function hz(x) { return x >= 1000 ? r1(x / 1000) + ' kHz' : Math.round(x) + ' Hz'; }
      if (lo != null && hi != null) return (lo > 0 ? hz(lo) : '0') + '\u2013' + hz(hi) + ' band';
      return '';
    }
    function loadedText(e, d) {
      var tr = e.track ? findTrack(d, e.track) : null;
      if (!e.track) return { text: 'Nothing loaded', none: true };
      if (!tr) return { text: 'Track ' + e.track + ' (not in the song any more)', none: true };
      var ty = trackType(tr), extra = '';
      if (ty === 'sampler') {
        var p = tr.params || {};
        if (p.program) extra = ' · program ' + p.program;
        else if (p.buffer) { var au = d.audio && d.audio[p.buffer]; extra = ' · ' + (au && au.name ? au.name : p.buffer); }
      }
      var by = e.loaded && e.loaded.by === 'user' ? ' \u00b7 your choice' : e.loaded ? ' \u00b7 as suggested' : '';
      return { text: 'Track ' + tr.name + ' \u00b7 ' + (CLASSIC_LABELS[ty] ? ty + ' (' + CLASSIC_LABELS[ty] + ')' : ty || 'instrument') + extra + by, none: false };
    }

    function row(e, d) {
      var r = el('article', 'iv-el', null, { 'aria-label': 'Element ' + (e.name || e.id) });
      var c1 = el('div', 'iv-c1');
      c1.appendChild(el('h3', 'iv-ename', e.name || e.id));
      var stemTxt = [e.stem ? e.stem + ' stem' : '', bandText(e.band)].filter(Boolean).join(' \u00b7 ');
      c1.appendChild(el('div', 'iv-stem', stemTxt || 'whole mix'));
      var lt = loadedText(e, d);
      var ld = el('div', 'iv-loaded' + (lt.none ? ' none' : ''));
      ld.appendChild(el('span', 'iv-mk', 'Loaded'));
      ld.appendChild(el('span', null, lt.text));
      c1.appendChild(ld);
      r.appendChild(c1);

      var c2 = el('div', 'iv-c2');
      var chips = el('div', 'iv-decs');
      var decs = e.decisions || {}, ks = decKeys(decs);
      if (!ks.length) chips.appendChild(el('span', 'iv-why', 'No decisions in the report for this element.'));
      ks.forEach(function (k) { chips.appendChild(decisionChip(k, decs[k])); });
      c2.appendChild(chips);
      c2.appendChild(evidenceBlock(e));
      if (e.unverified && e.unverified.length) c2.appendChild(unverifiedBox(e.unverified, 'Not verified for this element'));
      r.appendChild(c2);

      var c3 = el('div', 'iv-c3');
      var sug = suggested[e.id];
      var sl = el('div', 'iv-sug');
      sl.appendChild(el('span', 'iv-mk', 'Suggested'));
      if (sug && sug.type) { sl.appendChild(el('span', 'iv-sv', typeLabel(sug.type))); sl.appendChild(confBadge(sug.confidence)); sl.setAttribute('data-conf', confWord(sug.confidence)); }
      else sl.appendChild(el('span', 'iv-why', 'no recreation suggested'));
      c3.appendChild(sl);
      c3.appendChild(recControl(e, d));
      r.appendChild(c3);
      return r;
    }

    function sig(an, d) {
      return safe(function () { return JSON.stringify(an) + '|' + JSON.stringify((d && d.tracks || []).map(function (t) { return [t.name, t.type, t.inst]; })) + '|' + JSON.stringify(refOf(host)); }, String(Math.random()));
    }

    function refresh(force) {
      if (disposed) return;
      var an = analysisOf(host), d = hostDoc(host), s = sig(an, d);
      if (!force && s === lastSig) return;
      lastSig = s;
      var focusedId = doc.activeElement && doc.activeElement.id && body.contains && body.contains(doc.activeElement) ? doc.activeElement.id : null;
      var scroll = body.scrollTop || 0;
      clear(body);
      var A = availability(host).analysis;
      if (!A.ok) { body.appendChild(el('p', 'iv-empty', A.why)); return; }
      if (!an) { body.appendChild(el('p', 'iv-empty', 'This song has no analysis. Use Import… to analyse an audio file.')); return; }
      title.textContent = 'Analysis report' + (an.source && an.source.name ? ': ' + an.source.name : '');
      body.appendChild(headerInfo(an));
      var unv = [].concat(an.unverified || []);
      body.appendChild(unverifiedBox(unv.length ? unv : ['The report lists no unverified points. That is not a validation: every score of the analysis is on the engine’s own renders.'], 'What this report has not verified'));
      var legend = el('p', 'iv-legend');
      legend.appendChild(el('span', null, 'Confidence: '));
      ['high', 'medium', 'low', 'none'].forEach(function (w) { legend.appendChild(confBadge(w)); });
      legend.appendChild(el('span', null, ' A low call is a guess, drawn dashed and faint.'));
      body.appendChild(legend);
      var els = [].concat(an.elements || []);
      els.forEach(function (e) { if (e && e.id != null && !has(suggested, e.id)) suggested[e.id] = e.suggested || e.recreation || null; });
      var list = el('div', 'iv-list', null, { role: 'list' });
      if (!els.length) list.appendChild(el('p', 'iv-empty', 'The analysis found no elements.'));
      els.forEach(function (e) { if (e) { var rr = row(e, d); rr.setAttribute('role', 'listitem'); list.appendChild(rr); } });
      body.appendChild(list);
      body.scrollTop = scroll;
      if (focusedId) { var f = doc.getElementById(focusedId); if (f && isFn(f.focus)) safe(function () { f.focus(); }); }
    }
    var onDoc = function () { refresh(false); };
    if (isFn(host.on)) safe(function () { host.on('document', onDoc); });
    refresh(true);
    return {
      el: panel,
      refresh: refresh,
      update: function () { /* the report changes only on 'document'; nothing per frame */ },
      focus: function () { safe(function () { (close).focus(); }); },
      dispose: function () {
        if (disposed) return; disposed = true;
        if (isFn(host.off)) safe(function () { host.off('document', onDoc); });
        if (panel.parentNode) panel.parentNode.removeChild(panel);
      }
    };
  }

  // ------------------------------------------------------------------ A/B control (transport)
  function abControl(host, o) {
    o = o || {};
    function toast(t, ms) { if (isFn(o.toast)) o.toast(t, ms || 4000); }
    var g = el('div', 'ap-grp iv-ab', null, { role: 'group', 'aria-label': 'A/B: compare the song with the reference' });
    var seg = el('div', 'ap-seg');
    var bSong = btn('iv-ab-side', 'Song', 'Hear the song (A toggles)');
    var bRef = btn('iv-ab-side', 'Ref', 'Hear the reference (A toggles)');
    bSong.setAttribute('aria-pressed', 'true'); bRef.setAttribute('aria-pressed', 'false');
    seg.appendChild(bSong); seg.appendChild(bRef);
    var match = btn('', 'Match', 'Level match: set the reference gain so both read the same loudness');
    var read = el('span', 'iv-read', '', { role: 'status', 'aria-live': 'polite' });
    var gl = el('label', 'ap-grp iv-gain');
    gl.appendChild(el('span', 'ap-lbl', 'Ref'));
    var gin = el('input', 'ap-in', null, { type: 'number', min: '-24', max: '12', step: '0.5', 'aria-label': 'Reference gain in dB' });
    gin.type = 'number';
    gl.appendChild(gin);
    gl.appendChild(el('span', 'ap-lbl iv-unit', 'dB'));
    g.appendChild(el('span', 'ap-lbl iv-ablbl', 'A/B'));
    g.appendChild(seg); g.appendChild(gl); g.appendChild(match); g.appendChild(read);
    var last = { state: null, why: null, gain: null };

    function reason() {
      var av = availability(host);
      if (!av.ab.ok) return av.ab.why;
      if (!av.reference.ok) return av.reference.why;
      var ref = refOf(host);
      if (!ref) return 'No reference: import a track (Import…) to compare against it.';
      if (ref.ready === false) return 'The reference file is still loading or missing.';
      return '';
    }
    function set(state) {
      var why = reason();
      if (why) { toast(why); return null; }
      var r = safe(function () { return host.ab(state); }, null);
      update(true);
      return r;
    }
    on(bSong, 'click', function () { set('song'); });
    on(bRef, 'click', function () { set('reference'); });
    on(match, 'click', function () {
      if (isOff(match)) { toast(match._why); return; }
      var p = safe(function () { return host.transport.pos(); }, null) || {}, loop = safe(function () { return host.transport.loopSection; }, null);
      var section = loop || p.sectionName || null;
      read.textContent = 'measuring…';
      match.setAttribute('aria-busy', 'true');
      Promise.resolve().then(function () { return host.matchLevel({ section: section }); }).then(function (r) {
        match.removeAttribute('aria-busy');
        if (!r) { read.textContent = 'could not measure'; read.title = 'The engine could not measure the loudness of both sides' + (section ? ' in ' + section : '') + '; the gain is unchanged.'; return; }
        read.title = 'Measured' + (section ? ' over section ' + section : ' over the whole song') + (r.seconds ? ' (' + r.seconds + ' s where both exist)' : '') + ': song ' + r1(r.songLufs) + ' LUFS, reference ' + r1(r.referenceLufs) + ' LUFS (before the change)' + (r.measure ? ', ' + r.measure : '') + '. Reference gain set to ' + dbStr(r.gainDb) + ' dB.';
        // the gain field beside shows the gain set; the readout shows what was measured
        read.textContent = 'song ' + lufs(r.songLufs) + ' \u00b7 ref ' + lufs(r.referenceLufs) + ' LUFS';
        last.gain = null; update(true);
      }, function (err) { match.removeAttribute('aria-busy'); read.textContent = 'could not measure'; read.title = msg(err); });
    });
    function pushGain() {
      if (gin.disabled) return;
      var v = parseFloat(gin.value);
      if (!(v === v)) return;
      v = Math.max(-24, Math.min(12, v));
      safe(function () { host.setReferenceParam('gain', fromDb(v)); });
      last.gain = null;
    }
    on(gin, 'change', pushGain);
    on(gin, 'keydown', function (ev) { if (ev.key === 'Enter') { pushGain(); if (isFn(gin.blur)) gin.blur(); } else if (ev.key === 'Escape' && isFn(gin.blur)) gin.blur(); });

    function update(force) {
      var why = reason(), av = availability(host);
      var state = why ? null : safe(function () { return host.ab(); }, 'song');
      if (force || why !== last.why || state !== last.state) {
        last.why = why; last.state = state;
        setDisabled(bSong, !!why, why); setDisabled(bRef, !!why, why);
        if (!why) { bSong.title = 'Hear the song (A toggles)'; bRef.title = 'Hear the reference (A toggles)'; }
        bSong.setAttribute('aria-pressed', state === 'song' ? 'true' : 'false');
        bRef.setAttribute('aria-pressed', state === 'reference' ? 'true' : 'false');
        g.setAttribute('data-ab', state || 'off');
        var mwhy = why || (av.matchLevel.ok ? '' : av.matchLevel.why);
        setDisabled(match, !!mwhy, mwhy);
        if (!mwhy) match.title = 'Level match: set the reference gain so both read the same loudness (measures the looped or current section)';
        var gwhy = why || (av.setReferenceParam.ok ? '' : av.setReferenceParam.why);
        gin.disabled = !!gwhy; gin.title = gwhy || 'Reference gain in dB (Enter applies)';
        if (why && !read.textContent) read.textContent = '';
      }
      if (!why && doc.activeElement !== gin) {
        var ref = refOf(host), gv = ref && typeof ref.gain === 'number' ? ref.gain : 1;
        if (gv !== last.gain) { last.gain = gv; var db = toDb(gv); gin.value = isFinite(db) ? String(r1(db)) : '-24'; }
      } else if (why && gin.value !== '') gin.value = '';
    }
    update(true);
    return { el: g, update: update, toggle: function () { return set('toggle'); }, buttons: { song: bSong, ref: bRef, match: match, gain: gin, read: read } };
  }

  // ------------------------------------------------------------------ reference lane (System Editor)
  var BLOCK = 256;
  var peakCache = null;   // {buf, mins, maxs}
  function peaksOf(buf) {
    if (peakCache && peakCache.buf === buf) return peakCache;
    var n = buf.length | 0, ch = Math.max(1, buf.numberOfChannels | 0), nb = Math.ceil(n / BLOCK) || 1;
    var mins = new Float32Array(nb), maxs = new Float32Array(nb), c, i, b, data, lo, hi, end, x;
    for (b = 0; b < nb; b++) { mins[b] = 1; maxs[b] = -1; }
    for (c = 0; c < ch; c++) {
      data = safe(function () { return buf.getChannelData(c); }, null);
      if (!data) continue;
      for (b = 0; b < nb; b++) {
        lo = mins[b]; hi = maxs[b]; end = Math.min(n, (b + 1) * BLOCK);
        for (i = b * BLOCK; i < end; i++) { x = data[i]; if (x < lo) lo = x; if (x > hi) hi = x; }
        mins[b] = lo; maxs[b] = hi;
      }
    }
    for (b = 0; b < nb; b++) if (mins[b] > maxs[b]) { mins[b] = 0; maxs[b] = 0; }
    peakCache = { buf: buf, mins: mins, maxs: maxs, sr: buf.sampleRate || 44100, nb: nb };
    return peakCache;
  }
  function totalBars(host) {
    var t = isFn(host.totalBars) ? safe(function () { return host.totalBars(); }, 0) : 0;
    if (t > 0) return t;
    var d = hostDoc(host), s = 0;
    ((d && d.sections) || []).forEach(function (x) { s += x.bars | 0; });
    return s || 1;
  }
  function cssVar(name, dflt) {
    var v = safe(function () { return root.getComputedStyle(doc.documentElement).getPropertyValue(name); }, '');
    v = v && String(v).trim();
    return v || dflt;
  }
  function lane(host) {
    var band = el('div', 'se-band iv-lane', null, { 'aria-label': 'Reference track' });
    var l = el('div', 'se-bandl iv-lane-l');
    var tag = el('span', 'iv-lane-tag', 'REFERENCE');
    var nm = el('span', 'iv-lane-name', '');
    var info = el('span', 'iv-lane-info', '');
    l.appendChild(tag); l.appendChild(nm); l.appendChild(info);
    var area = el('div', 'se-area iv-lane-a');
    var cv = el('canvas', 'iv-wave', null, { role: 'img', 'aria-label': 'Waveform of the reference' });
    var ph = el('div', 'se-ph');
    area.appendChild(cv); area.appendChild(ph);
    band.appendChild(l); band.appendChild(area);
    band.style.display = 'none';
    var key = '', lastPh = '', disposed = false;

    function draw(ref, buf, w, h, dpr, total, bpm, heard) {
      var ctx = isFn(cv.getContext) ? safe(function () { return cv.getContext('2d'); }, null) : null;
      if (!ctx) return false;
      var W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
      if (cv.width !== W) cv.width = W;
      if (cv.height !== H) cv.height = H;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var line = cssVar('--line', '#2a2a3a'), ink = heard ? cssVar('--fg', '#d8d8e6') : cssVar('--dim', '#8a8aa0');
      var mid = H / 2;
      ctx.fillStyle = line; ctx.fillRect(0, Math.floor(mid), W, Math.max(1, Math.round(dpr)));
      if (!buf) return true;
      var P = peaksOf(buf), spb = 240 / Math.max(1, bpm), off = +ref.offset || 0, gain = typeof ref.gain === 'number' ? ref.gain : 1;
      var dur = buf.duration || (buf.length / P.sr), amp = (H / 2 - dpr) * 0.96, x, t0, t1, i0, i1, lo, hi, k;
      ctx.fillStyle = ink;
      for (x = 0; x < W; x++) {
        t0 = off + (x / W) * total * spb; t1 = off + ((x + 1) / W) * total * spb;
        if (t1 <= 0 || t0 >= dur) continue;
        i0 = Math.max(0, Math.floor(t0 * P.sr / BLOCK)); i1 = Math.min(P.nb, Math.max(i0 + 1, Math.ceil(t1 * P.sr / BLOCK)));
        lo = 1; hi = -1;
        for (k = i0; k < i1; k++) { if (P.mins[k] < lo) lo = P.mins[k]; if (P.maxs[k] > hi) hi = P.maxs[k]; }
        if (hi < lo) continue;
        lo = Math.max(-1, lo * gain); hi = Math.min(1, hi * gain);
        var y0 = mid - hi * amp, y1 = mid - lo * amp;
        ctx.fillRect(x, y0, 1, Math.max(1, y1 - y0));
      }
      return true;
    }

    function update(fs) {
      if (disposed) return;
      var ref = refOf(host);
      if (!ref) { if (band.style.display !== 'none') { band.style.display = 'none'; key = ''; } return; }
      if (band.style.display === 'none') band.style.display = '';
      if (fs != null && fs !== lastPh) { lastPh = fs; ph.style.left = fs; }
      var buf = isFn(host.buffer) ? safe(function () { return host.buffer(ref.id); }, null) : null;
      var r = isFn(area.getBoundingClientRect) ? area.getBoundingClientRect() : { width: 0, height: 0 };
      var w = Math.round(r.width || area.clientWidth || 0), h = Math.round(r.height || area.clientHeight || 40);
      var dpr = root.devicePixelRatio || 1, total = totalBars(host), bpm = safe(function () { return host.bpm(); }, 120) || 120;
      var heard = isFn(host.ab) && safe(function () { return host.ab(); }, 'song') === 'reference';
      var k = [w, h, dpr, total, bpm, ref.offset, ref.gain, ref.id, !!buf, buf ? buf.length : 0, heard, ref.name].join('|');
      if (k === key) return;
      key = k;
      nm.textContent = ref.name || ref.id || 'reference';
      nm.title = (ref.name || ref.id || '') + (ref.duration ? ', ' + clockStr(ref.duration) : '');
      var gdb = toDb(typeof ref.gain === 'number' ? ref.gain : 1);
      info.textContent = (!buf ? (ref.ready === false ? 'loading…' : 'not loaded') + ' · ' : '') + (isFinite(gdb) ? dbStr(gdb) + ' dB' : 'muted') + (ref.offset ? ' · bar 1 at ' + r2(ref.offset) + ' s' : '') + (heard ? ' · heard' : '');
      band.setAttribute('data-heard', heard ? 'true' : 'false');
      cv.setAttribute('aria-label', 'Waveform of the reference ' + (ref.name || '') + ', aligned to the section ruler at ' + r2(bpm) + ' BPM' + (ref.offset ? ', bar 1 at ' + r2(ref.offset) + ' s' : ''));
      if (w > 0) draw(ref, buf, w, h, dpr, total, bpm, heard);
    }
    return {
      el: band,
      update: function (fs) { try { update(fs); } catch (e) { /* drawing must never break the editor */ } },
      redraw: function () { key = ''; update(lastPh || null); },
      dispose: function () { disposed = true; if (band.parentNode) band.parentNode.removeChild(band); }
    };
  }

  // ------------------------------------------------------------------ import flow
  var STAGES = [
    { id: 'decode', label: 'Decode the audio' },
    { id: 'separate', label: 'Separate stems' },
    { id: 'tempo', label: 'Estimate the tempo' },
    { id: 'analyse', label: 'Analyse each element' },
    { id: 'build', label: 'Build tracks' },
    { id: 'save', label: 'Save the project' }
  ];
  var STEM_ROLES = ['drums', 'bass', 'other', 'vocals'];
  function stemRole(name) {
    var n = String(name || '').toLowerCase();
    for (var i = 0; i < STEM_ROLES.length; i++) if (n.indexOf(STEM_ROLES[i]) >= 0) return STEM_ROLES[i];
    if (/kick|drum|perc|hat|snare/.test(n)) return 'drums';
    if (/vox|voc|voice/.test(n)) return 'vocals';
    if (/bass|sub/.test(n)) return 'bass';
    return 'other';
  }
  function isAudioName(n) { return /\.(wav|wave|mp3|ogg|oga|opus|flac|m4a|aac|aif|aiff|webm)$/i.test(String(n || '')); }

  var active = null;   // one import at a time

  function importTrack(host, o) {
    o = o || {};
    var shell = o.shell !== undefined ? o.shell : (root.HavantechnoShell || null);
    function toast(t, ms) { if (isFn(o.toast)) o.toast(t, ms); }
    var av = availability(host);
    if (active) { toast('An import is already running.'); if (active.focus) active.focus(); return Promise.resolve(null); }
    if (!av.pickAudio.ok) { toast(av.pickAudio.why); return Promise.resolve(null); }
    if (!av.importTrack.ok) { toast(av.importTrack.why, 6000); return Promise.resolve(null); }
    // pick first, inside the click's gesture (the web picker needs it)
    var picked;
    try { picked = root.Project.pickAudio({ shell: shell, title: 'Import a track to analyse' }); } catch (e) { toast('Could not open a file: ' + msg(e)); return Promise.resolve(null); }
    return Promise.resolve(picked).then(function (file) {
      if (!file) return null;
      return runDialog(host, file, shell, o);
    }, function (e) { toast('Could not open a file: ' + msg(e)); return null; });
  }

  function runDialog(host, file, shell, o) {
    function toast(t, ms) { if (isFn(o.toast)) o.toast(t, ms); }
    var fileName = file.name || baseName(file.path) || 'audio';
    var prevFocus = doc.activeElement;
    var overlay = el('div', 'iv-modal');
    var dlg = el('div', 'iv-dlg', null, { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'iv-dlg-title' });
    var h = el('h2', 'iv-title', 'Import ' + fileName, { id: 'iv-dlg-title' });
    var sub = el('p', 'iv-sub', 'The file becomes the reference track; the analysis builds a recreation beside it and the project is saved at once.');
    var content = el('div', 'iv-dlg-body');
    var foot = el('div', 'iv-dlg-foot');
    dlg.appendChild(h); dlg.appendChild(sub); dlg.appendChild(content); dlg.appendChild(foot);
    overlay.appendChild(dlg);
    (doc.body || doc.documentElement).appendChild(overlay);
    var R = { done: false, cancelled: false, running: false, abort: null, resolve: null, separating: false };
    active = { focus: function () { focusFirst(); } };

    function focusables() {
      var out = [];
      (function walk(n) {
        if (!n || !n.children) return;
        for (var i = 0; i < n.children.length; i++) {
          var c = n.children[i], t = c.tagName;
          if ((t === 'BUTTON' || t === 'SELECT' || t === 'INPUT' || t === 'SUMMARY' || (c.getAttribute && c.getAttribute('tabindex') === '0')) && !c.disabled && !c.hidden) out.push(c);
          walk(c);
        }
      })(dlg);
      return out;
    }
    function focusFirst() { var f = focusables(); if (f.length && isFn(f[0].focus)) safe(function () { f[0].focus(); }); }
    on(overlay, 'keydown', function (ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); if (ev.stopPropagation) ev.stopPropagation(); cancel(); return; }
      if (ev.key === 'Tab') {
        var f = focusables(); if (!f.length) return;
        var i = f.indexOf(doc.activeElement);
        if (ev.shiftKey && (i <= 0)) { ev.preventDefault(); f[f.length - 1].focus(); }
        else if (!ev.shiftKey && (i === f.length - 1 || i < 0)) { ev.preventDefault(); f[0].focus(); }
      }
      // the transport keys (Space, A, Tab view switch) must not act behind the dialog
      if (ev.stopPropagation) ev.stopPropagation();
    });
    // keep the app's document-level key handler out while the dialog is open
    on(overlay, 'keyup', function (ev) { if (ev.stopPropagation) ev.stopPropagation(); });

    function closeDlg() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      active = null;
      if (prevFocus && isFn(prevFocus.focus)) safe(function () { prevFocus.focus(); });
    }
    function setFoot(buttons) { clear(foot); buttons.forEach(function (b) { foot.appendChild(b); }); }

    var finished = new Promise(function (res) { R.resolve = res; });

    function cancel() {
      if (R.done) return;
      if (!R.running) { R.done = true; closeDlg(); toast('Import cancelled; nothing changed.'); R.resolve(null); return; }
      if (R.cancelled) return;
      R.cancelled = true;
      if (R.abort) safe(function () { R.abort.abort(); });
      say(R.separating ? 'Cancelling: separation in the desktop app runs to its end, then the result is dropped.' : 'Cancelling: waiting for the current stage to stop…');
      cancelBtn.textContent = 'Cancelling…';
      setDisabled(cancelBtn, true, 'Cancelling');
    }
    var cancelBtn = btn('', 'Cancel', 'Cancel the import (Esc); the current project stays as it is');
    on(cancelBtn, 'click', function () { if (!isOff(cancelBtn)) cancel(); });
    var statusEl = el('p', 'iv-runstatus', '', { role: 'status', 'aria-live': 'polite' });
    function say(t) { statusEl.textContent = t || ''; }

    // ---- step 2: stems
    function stemsStep() {
      clear(content);
      var sep = availability(host, shell).separate, hasPath = !!(file && file.path);
      if (sep.ok) {
        content.appendChild(el('h3', 'iv-step', 'Stems'));
        content.appendChild(el('p', null, hasPath ? 'Separate the file into drums, bass, other and vocals first (HT-Demucs, a few minutes), or analyse the mix as it is.' : 'This file has no path on disk, so it cannot be separated here; the mix will be analysed as one.'));
        var bSep = btn('iv-primary', 'Separate into stems', 'Run the separator on this file (HT-Demucs)');
        var bMix = btn('', 'Analyse the mix', 'Skip separation: analyse the whole mix');
        if (!hasPath) setDisabled(bSep, true, 'This file has no path on disk.');
        on(bSep, 'click', function () { if (isOff(bSep)) { say(bSep._why); return; } run('separate', null); });
        on(bMix, 'click', function () { run('mix', null); });
        setFoot([bSep, bMix, cancelBtn]);
      } else {
        content.appendChild(el('h3', 'iv-step', 'Stems (optional)'));
        content.appendChild(el('p', null, 'If you separated this track already, drop its stem files here or pick them. Each file’s role comes from its name (drums, bass, other, vocals); change it below. Or skip and analyse the mix.'));
        if (sep.why) content.appendChild(el('p', 'iv-why', sep.why + ' In the browser, separate with tools/separate.py and add the stems here.'));
        var stems = [];
        var zone = el('div', 'iv-drop', null, { tabindex: '0', role: 'button', 'aria-label': 'Drop stem files here, or press Enter to pick them' });
        zone.appendChild(el('span', null, 'Drop stem files here'));
        var list = el('div', 'iv-stems');
        var bPick = btn('', 'Pick stem files…', 'Pick the stem files of this track');
        var bUse = btn('iv-primary', 'Use these stems', 'Analyse the stems listed above');
        var bSkip = btn('', 'Skip: analyse the mix', 'Analyse the whole mix without stems');
        function renderStems() {
          clear(list);
          stems.forEach(function (s, i) {
            var r = el('div', 'iv-stemrow');
            r.appendChild(el('span', 'iv-stemname', s.file.name || baseName(s.file.path)));
            var sid = 'iv-stemrole-' + i;
            r.appendChild(el('label', 'ap-lbl', 'role', { 'for': sid }));
            var sel = el('select', 'iv-sel', null, { id: sid }); sel.id = sid;
            STEM_ROLES.forEach(function (x) { sel.appendChild(el('option', null, x, { value: x })); });
            sel.value = s.name;
            on(sel, 'change', function () { s.name = sel.value; });
            r.appendChild(sel);
            var rm = btn('', '×', 'Remove ' + (s.file.name || 'this stem'));
            on(rm, 'click', function () { stems.splice(i, 1); renderStems(); });
            r.appendChild(rm);
            list.appendChild(r);
          });
          setDisabled(bUse, !stems.length, 'Add at least one stem file, or skip.');
        }
        function addStemFiles(files) {
          var skipped = 0;
          [].concat(files || []).forEach(function (f) { if (isAudioName(f.name || f.path) || /^audio\//.test(String(f.type || ''))) stems.push({ name: stemRole(f.name || f.path), file: f }); else skipped++; });
          renderStems();
          say(skipped ? 'Skipped ' + skipped + ' file(s) that are not audio.' : '');
        }
        function pick() {
          var P = root.Project;
          if (!P || !isFn(P.pickFiles)) { say('No multi-file picker here (Project.pickFiles is missing); drop the files instead.'); return; }
          Promise.resolve(P.pickFiles({ shell: shell, multiple: true, accept: 'audio/*,.wav,.mp3,.flac,.ogg,.aif,.aiff,.m4a' })).then(function (fs) { if (fs) addStemFiles(fs); }, function (e) { say('Could not pick files: ' + msg(e)); });
        }
        on(bPick, 'click', pick);
        on(zone, 'click', pick);
        on(zone, 'keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(); } });
        on(zone, 'dragover', function (ev) { ev.preventDefault(); zone.classList.add('over'); });
        on(zone, 'dragleave', function () { zone.classList.remove('over'); });
        on(zone, 'drop', function (ev) { ev.preventDefault(); zone.classList.remove('over'); addStemFiles(Array.prototype.slice.call((ev.dataTransfer && ev.dataTransfer.files) || [])); });
        on(bUse, 'click', function () { if (isOff(bUse)) { say(bUse._why); return; } run('stems', stems.map(function (s) { return { name: s.name, source: s.file }; })); });
        on(bSkip, 'click', function () { run('mix', null); });
        content.appendChild(zone); content.appendChild(bPick); content.appendChild(list);
        renderStems();
        setFoot([bUse, bSkip, cancelBtn]);
      }
      content.appendChild(statusEl);
      focusFirst();
    }

    // ---- step 3: run
    var stageEls = {}, bar = null, barFill = null;
    function runView(mode) {
      clear(content);
      content.appendChild(el('h3', 'iv-step', 'Working'));
      bar = el('div', 'iv-bar', null, { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', 'aria-label': 'Import progress' });
      barFill = el('i'); bar.appendChild(barFill);
      content.appendChild(bar);
      var ol = el('ol', 'iv-stages');
      STAGES.forEach(function (s) {
        var li = el('li', null, null, { 'data-state': 'wait' });
        li.appendChild(el('span', 'iv-sdot', null, { 'aria-hidden': 'true' }));
        li.appendChild(el('span', 'iv-slabel', s.label));
        var note = el('span', 'iv-snote', 'waiting');
        li.appendChild(note);
        ol.appendChild(li);
        stageEls[s.id] = { li: li, note: note };
      });
      content.appendChild(ol);
      content.appendChild(statusEl);
      if (mode === 'mix') stage('separate', 'skip', 'skipped: the mix is analysed as one');
      else if (mode === 'stems') stage('separate', 'skip', 'stems supplied');
      setFoot([cancelBtn]);
      safe(function () { cancelBtn.focus(); });
    }
    var cur = -1;
    function stage(id, state, note) {
      var s = stageEls[id]; if (!s) return;
      s.li.setAttribute('data-state', state);
      s.note.textContent = note != null ? note : state === 'done' ? 'done' : state === 'run' ? 'working…' : state;
    }
    function progress(p) {
      if (!p) return;
      var idx = -1;
      for (var i = 0; i < STAGES.length; i++) if (STAGES[i].id === p.stage) idx = i;
      if (idx < 0) { if (p.note) say(String(p.note)); return; }
      for (var j = 0; j < idx; j++) { var st = stageEls[STAGES[j].id]; if (st && st.li.getAttribute('data-state') === 'run' || st && st.li.getAttribute('data-state') === 'wait') stage(STAGES[j].id, 'done'); }
      var frac = (p.total > 0 && p.done >= 0) ? Math.min(1, p.done / p.total) : 0;
      var complete = p.total > 0 && p.done >= p.total;
      stage(p.stage, complete ? 'done' : 'run', (p.total > 0 ? p.done + ' of ' + p.total : 'working…') + (p.note ? ' · ' + p.note : ''));
      cur = Math.max(cur, idx);
      var pct = Math.round(((idx + frac) / STAGES.length) * 100);
      bar.setAttribute('aria-valuenow', String(pct)); barFill.style.width = pct + '%';
    }

    function snapshot() { return safe(function () { return JSON.stringify(host.document()); }, null); }
    function restore(snap) {
      if (!snap) return false;
      var now = snapshot();
      if (now === snap) return false;
      try { host.loadDocument(JSON.parse(snap)); return true; } catch (e) { toast('Could not restore the project: ' + msg(e), 8000); return false; }
    }

    function run(mode, stems) {
      R.running = true;
      runView(mode);
      var snap = snapshot();
      if (root.AbortController) R.abort = safe(function () { return new root.AbortController(); }, null);
      // Project.importTrack (D1) separates by itself when it has a shell with separate() and no stems; it reads the mix
      // by the reference's id when it has neither. So: 'separate' passes the full shell and no stems; 'mix' passes a copy
      // of the shell without separate (saving still goes through the shell); 'stems' passes the owner's files.
      var useShell = shell, stemList = mode === 'stems' ? stems : undefined;
      if (mode === 'mix' && shell && isFn(shell.separate)) {
        useShell = {};
        for (var k in shell) if (k !== 'separate' && k !== 'onSeparateProgress') useShell[k] = shell[k];
      }
      if (mode === 'separate') { R.separating = true; stage('separate', 'run', 'starting the separator\u2026'); }
      var p = Promise.resolve(stemList);
      p.then(function () {
        if (R.cancelled) throw cancelErr();
        return root.Project.importTrack({
          file: file, stems: stemList, shell: useShell, host: host,
          signal: R.abort ? R.abort.signal : undefined,
          onProgress: function (ev) {
            if (ev && ev.stage && ev.stage !== 'separate') R.separating = false;
            if (R.cancelled) throw cancelErr();      // stops the pipeline at its next report if the engine lets it (log-D2)
            try { progress(ev); } catch (e) { /* display only */ }
          }
        });
      }).then(function (res) {
        R.done = true;
        if (R.cancelled) {
          var restored = restore(snap);
          closeDlg();
          toast('Import cancelled; ' + (restored ? 'the project is restored as it was' : 'the project is unchanged') + (res && res.saved && res.saved.name ? '. The file ' + res.saved.name + ' was already saved and stays on disk.' : '.'), 8000);
          R.resolve(null); return;
        }
        STAGES.forEach(function (s) { var st = stageEls[s.id]; if (st && st.li.getAttribute('data-state') !== 'skip') stage(s.id, 'done'); });
        bar.setAttribute('aria-valuenow', '100'); barFill.style.width = '100%';
        closeDlg();
        var nm = res && res.saved && res.saved.name;
        toast('Imported ' + fileName + (nm ? '; saved as ' + nm : '') + '. A toggles the reference.', 6000);
        if (isFn(o.onDone)) safe(function () { o.onDone(res); });
        R.resolve(res);
      }, function (err) {
        R.done = true;
        var restored = restore(snap);
        if (R.cancelled || (err && err.name === 'AbortError') || (err && err.ivCancel)) {
          closeDlg();
          toast('Import cancelled; ' + (restored ? 'the project is restored as it was.' : 'the project is unchanged.'), 6000);
          R.resolve(null); return;
        }
        // show the failure in the dialog, with the stage it stopped at
        for (var i = 0; i < STAGES.length; i++) { var st = stageEls[STAGES[i].id]; if (st && st.li.getAttribute('data-state') === 'run') stage(STAGES[i].id, 'fail', 'stopped here'); }
        say('The import failed: ' + msg(err) + (restored ? ' The project is restored as it was.' : ' The project is unchanged.'));
        statusEl.className = 'iv-runstatus iv-err';
        var bClose = btn('iv-primary', 'Close', 'Close this dialog');
        on(bClose, 'click', function () { closeDlg(); R.resolve(null); });
        setFoot([bClose]);
        safe(function () { bClose.focus(); });
      });
    }
    function cancelErr() { var e = new Error('cancelled'); e.ivCancel = true; e.name = 'AbortError'; return e; }

    stemsStep();
    return finished;
  }

  root.ImportView = {
    importTrack: importTrack,
    mount: mount,
    abControl: abControl,
    lane: lane,
    availability: availability,
    confWord: confWord,
    _stemRole: stemRole,
    busy: function () { return !!active; }
  };
})();
