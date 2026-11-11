/* Havantechno analysis - report.js (L2, Lab Crew)
 * Global `Analysis.report`: one call that takes an element (a solo, a stem, or a band of a drum stem) and returns the
 * element report: every decision with its confidence and evidence, and the suggested recreation (an engine type with
 * starting parameters where they can be estimated, or "sampler"). Needs dsp.js, features.js, decide.js; drumlib.js is
 * optional (without it the drum decision says so). Load order: dsp.js -> features.js -> decide.js -> drumlib.js -> report.js.
 *
 *   Analysis.report.element(L, R, sr, {name, role: 'drums'|'bass'|'other'|'vocals'|'auto'}) -> report
 *   Analysis.report.stem(L, R, sr, {name, role}) -> {name, role, elements: [report], shared: sharedOrSpecific result}
 *     A drums stem is split into three bands (kick under 150 Hz, snare and claps 150 Hz to 5 kHz, hats and cymbals
 *     over 6 kHz), each reported as an element; other stems are one element.
 *   Analysis.report.table(stemResult) -> plain-text table
 * Built-in or outboard is never claimed (coordinator's ruling 5): reverbs are "shared (send or bus)" or
 * "element-specific".
 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var A = root.Analysis = root.Analysis || {};
  var D = A.dsp, F = A.features, X = A.decide;
  if (!D || !F || !X) throw new Error('Analysis.report: load dsp.js, features.js and decide.js first');

  function r2(x) { return typeof x === 'number' && x === x ? Math.round(x * 100) / 100 : null; }
  function midiOf(hz) { return Math.round(69 + 12 * Math.log(hz / 440) / Math.LN2); }

  // percussive or pitched: share of hits with a clear YIN pitch, and the decay of a typical hit
  function character(L, R, sr) {
    var h = F.hits(L, R, sr), hp = F.hitPitches(L, R, sr, { hits: h });
    return { hits: h, pitches: hp, pitchedShare: h.onsets.length ? hp.notes.length / Math.min(40, h.onsets.length) : 0 };
  }

  // the recreation for a pitched synth element: rules on decisions B and C (type level; parameter fitting by
  // synthesis is the next step, L1 transcript 8.2)
  function synthRecreation(mp, fs, fit, ch) {
    var f0s = ch.pitches.notes.map(function (n) { return n.f0; }), med = f0s.length ? D.median(f0s) : NaN, why = [], type, params = {};
    if (fs.value === 'fm') {
      type = 'fm';
      if (fit && fit.fm) { params.ratio = r2(fit.fm.ratio); params.index = r2(Math.max(fit.fm.indexStart, fit.fm.indexEnd)); params.indexEnv = fit.fm.indexStart > fit.fm.indexEnd * 1.3 ? 0.8 : 0; }
      why.push('decision C: FM' + (fit && fit.fm ? ' (carrier:modulator ' + fit.fm.pair.join(':') + ')' : ''));
    } else if (mp.value === 'poly') {
      type = 'juno'; why.push('poly and subtractive (or chords, where decision C is not attempted): the engine\'s poly synth');
    } else {
      // truth set (fm and poly sets): the engine's tb303 fits Q 3 (saw) and its modeld, bass and juno Q 0.7 to 1.5
      var sq = fit && fit.sub && fit.sub.wave === 'square', res = fit && fit.sub && fit.sub.q >= 3;
      if (sq || res) { type = 'tb303'; params.wave = sq ? 'square' : 'saw'; why.push('mono, ' + (sq ? 'square wave' : 'resonant filter (Q ' + fit.sub.q + ')') + ': a 303-class line'); }
      else { type = 'modeld'; why.push('mono, saw through a gentle lowpass: a Model D-class ' + (med < 130 ? 'bass' : 'lead')); }
      if (fit && fit.sub) params.resonanceQ = fit.sub.q;
    }
    if (med === med) why.push('median pitch ' + Math.round(med) + ' Hz (MIDI ' + midiOf(med) + ')');
    return { type: type, params: params, why: why };
  }

  function element(L, R, sr, o) {
    o = o || {};
    var role = o.role || 'auto', rep = { name: o.name || 'element', role: role, seconds: r2(L.length / sr), decisions: {}, recreation: null, unverified: [] };
    var id = F.identity(L, R, sr), A1 = X.synthOrSample(id), ch = character(L, R, sr);
    rep.hits = id.nHits;
    rep.decisions.synthOrSample = A1;
    var fd = F.freeDecay(L, R, sr), pd = F.predelay(L, R, sr);
    rep.decisions.reverb = X.reverb(fd, pd);
    rep._tail = F.tailSignature(L, R, sr);
    // drums or pitched: a drums stem is drums; otherwise run the polyphony and the drum match and decide. Chords defeat
    // YIN (pitchedShare 0 on the juno's triads), so polyphony >= 2 means pitched; a one-pitch part that sits close to a
    // Drums voice (an 808 kick, a tom) goes the drum route.
    var poly = role === 'drums' ? null : F.polyphony(L, R, sr), vec = ch.hits.onsets.length >= 3 ? F.drumVector(L, R, sr, { hits: ch.hits }) : null;
    var dm = vec ? X.drumMachine(vec, A1) : null, dmClose = dm && dm.value && dm.value.machine !== 'unknown' && dm.confidence !== 'low';
    var percussive = role === 'drums' || (role !== 'vocals' && ((ch.pitchedShare < 0.5 && !(poly && poly.median >= 2)) || (ch.pitches.distinct <= 1 && dmClose) || (dm && dm.confidence === 'high' && !(poly && poly.median >= 2))));
    if (role === 'bass' && ch.pitches.distinct > 1) percussive = false;
    if (percussive) {
      dm = dm || X.drumMachine(vec, A1);
      rep.decisions.drumMachine = dm;
      if (A1.value === 'sample' && A1.confidence !== 'low') rep.recreation = { type: 'sampler', params: { slice: 'one hit per onset' }, confidence: A1.confidence, why: ['the hits replay one recording (decision A)'].concat(dm.value && dm.value.voice ? ['alternative: the ' + dm.value.voice + ' recreation (' + (dm.value.machine || '') + ')'] : []) };
      else if (dm.value && dm.value.recreation) rep.recreation = { type: dm.value.recreation.type, params: dm.value.recreation.params, confidence: dm.confidence, why: ['nearest Drums voice and its knob settings (decision E)'] };
    } else {
      var mp = X.monoPoly(poly), fit = mp.value === 'poly' ? null : F.fmFit(L, R, sr), fs = X.fmOrSubtractive(fit, mp.value);
      rep.decisions.monoPoly = mp; rep.decisions.fmOrSubtractive = fs;
      if (A1.value === 'sample' && A1.confidence !== 'low') rep.recreation = { type: 'sampler', params: { root: ch.pitches.notes.length ? midiOf(D.median(ch.pitches.notes.map(function (n) { return n.f0; }))) : 60 }, confidence: A1.confidence, why: ['the notes are one recording replayed (decision A)'] };
      else { var sr2 = synthRecreation(mp, fs, fit, ch); rep.recreation = { type: sr2.type, params: sr2.params, confidence: 'low', why: sr2.why.concat(['type chosen by rules from decisions B and C; no parameter fit by synthesis yet']) }; }
    }
    if (role !== 'auto') rep.unverified.push('measured on a separated ' + role + ' stem: separation artefacts and leakage are not modelled; every confidence assumes a clean element');
    if (role === 'drums') rep.unverified.push('a band of a drum stem can hold several voices; the band split is not a source separation');
    return rep;
  }

  function stem(L, R, sr, o) {
    o = o || {};
    var res = { name: o.name || 'stem', role: o.role || 'auto', elements: [] };
    if (res.role === 'drums') {
      var B = [['kick band (< 150 Hz)', 0, 150], ['snare and clap band (150 Hz - 5 kHz)', 150, 5000], ['hat and cymbal band (> 6 kHz)', 6000, sr / 2]];
      B.forEach(function (b) {
        var l = D.band(L, b[1], b[2], sr, 4), r = R ? D.band(R, b[1], b[2], sr, 4) : null;
        res.elements.push(element(l, r, sr, { name: res.name + ': ' + b[0], role: 'drums' }));
      });
    } else res.elements.push(element(L, R, sr, { name: res.name, role: res.role }));
    return res;
  }

  // shared or element-specific over several elements (call after element()/stem() on all of them)
  function shared(reports) {
    var items = reports.map(function (r) { return { name: r.name, sig: r._tail }; }), s = X.sharedOrSpecific(items);
    reports.forEach(function (r) { r.decisions.reverbShared = s.elements[r.name] || { value: 'no reverb tail', confidence: 'none', p: 0.5, evidence: ['no long, decorrelated tail'], alternatives: [] }; });
    return s;
  }

  function cell(d) {
    if (!d) return '-';
    var v = d.value, txt;
    if (v && typeof v === 'object') txt = v.present !== undefined ? (v.present === true ? 'yes, RT60 ' + r2(v.rt60) + ' s' + (v.predelayMs != null ? ', pre ' + Math.round(v.predelayMs) + ' ms' : '') : v.present === false ? 'no' : String(v.present)) : (v.machine || '') + (v.voice ? ' ' + v.voice : '') + (v.source ? ' (' + v.source + ')' : '');
    else txt = String(v);
    return txt + ' [' + d.confidence + ']';
  }
  function table(results) {
    var rows = [['element', 'synth/sample', 'mono/poly', 'FM/subtr.', 'reverb', 'shared?', 'drum machine', 'recreation']];
    results.forEach(function (sr) { sr.elements.forEach(function (e) {
      var d = e.decisions;
      rows.push([e.name, cell(d.synthOrSample), cell(d.monoPoly), cell(d.fmOrSubtractive), cell(d.reverb), cell(d.reverbShared), cell(d.drumMachine),
                 e.recreation ? e.recreation.type + ' [' + e.recreation.confidence + ']' : '-']);
    }); });
    var w = rows[0].map(function (_, i) { return Math.min(44, Math.max.apply(null, rows.map(function (r) { return String(r[i]).length; }))); });
    return rows.map(function (r) { return r.map(function (c, i) { c = String(c); return (c.length > w[i] ? c.slice(0, w[i] - 1) + '~' : c + new Array(w[i] - c.length + 1).join(' ')); }).join(' | '); }).join('\n');
  }

  A.report = { element: element, stem: stem, shared: shared, table: table };
})();
