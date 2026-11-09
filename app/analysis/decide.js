/* Havantechno analysis - decide.js
 * Global `Analysis.decide`: one function per classification decision. Each returns
 *   { value, confidence: 'high'|'medium'|'low'|'none', p: 0..1, evidence: [strings], alternatives: [{value, p}] }
 * Thresholds are the L1 transcript's (docs/research/2026-11-09-lab-crew/transcripts/L1-methods.md); they are starting
 * values to be calibrated by the scoring plan (section 10). Needs Analysis.features.
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var A = root.Analysis = root.Analysis || {};
  var F = A.features, D = A.dsp;
  if (!F || !D) throw new Error('Analysis.decide: load dsp.js and features.js first');

  function out(value, conf, p, ev, alt) { return { value: value, confidence: conf, p: p, evidence: ev, alternatives: alt || [] }; }
  function f2(x) { return x === x ? x.toFixed(2) : 'n/a'; }

  // ------------------------------------------------------------ decision A: synth or sample
  // id = Analysis.features.identity(...); o.formantSlope (from features.formantSlope) and o.libraryMatch (best NCC
  // against a known sample library, 0..1) are optional supporting evidence.
  // The cap (transcript 3.4): replayed hits with no noise content cannot be told from deterministic synthesis
  // (the engine's kick, bass and stab read twin 1.00), so "sample" is low confidence unless supported.
  var T = { fresh: 0.5, same: 0.97, noiseFlat: 0.25, bandShare: -10 };
  function synthOrSample(id, o) {
    o = o || {};
    if (!id || id.nHits < 3) return out('unknown', 'none', 0.5, ['fewer than 3 hits']);
    var ev = ['hits ' + id.nHits, 'twin (300 Hz-16 kHz) ' + f2(id.twin), 'pitch-normalised twin ' + f2(id.pitchTwin), 'residual ' + (id.residualDb === id.residualDb ? id.residualDb.toFixed(1) + ' dB' : 'n/a')];
    var fresh = id.bands.filter(function (b) { return b.shareDb > T.bandShare && b.twin === b.twin && b.twin < T.fresh; });
    fresh.forEach(function (b) { ev.push('fresh content in ' + b.lo + '-' + b.hi + ' Hz (twin ' + f2(b.twin) + ', ' + b.shareDb.toFixed(1) + ' dB of the energy)'); });
    var tw = Math.max(id.twin, id.pitchTwin || -1);
    if (fresh.length && id.twin < 0.6) return out('synth', 'high', 0.95, ev.concat(['each hit is a new waveform: noise or free-running oscillators']), [{ value: 'sample', p: 0.05 }]);
    if (tw >= T.same) {
      var noisy = id.hfShareDb > -25 && id.hfFlatness > T.noiseFlat;
      if (noisy) return out('sample', 'high', 0.95, ev.concat(['noise content (3-16 kHz flatness ' + f2(id.hfFlatness) + ') replays identically: frozen noise is a recording']), [{ value: 'synth', p: 0.05 }]);
      var support = [];
      if (o.formantSlope === o.formantSlope && o.formantSlope != null && o.formantSlope > 0.7) support.push('spectral envelope moves with pitch (slope ' + f2(o.formantSlope) + ')');
      if (o.libraryMatch != null && o.libraryMatch >= 0.9) support.push('matches a library sample (NCC ' + f2(o.libraryMatch) + ')');
      if (o.formantSlope != null && o.formantSlope === o.formantSlope && o.formantSlope < 0.3) return out('synth', 'medium', 0.75, ev.concat(['identical replays but the spectral envelope stays put across pitches (slope ' + f2(o.formantSlope) + '): a fixed filter']), [{ value: 'sample', p: 0.25 }]);
      if (support.length) return out('sample', support.length > 1 ? 'high' : 'medium', support.length > 1 ? 0.9 : 0.8, ev.concat(support), [{ value: 'synth', p: support.length > 1 ? 0.1 : 0.2 }]);
      return out('sample', 'low', 0.55, ev.concat(['identical replays with no noise content: a sample or a deterministic one-shot synth (capped)']), [{ value: 'synth', p: 0.45 }]);
    }
    if (tw < 0.6) return out('synth', 'medium', 0.8, ev.concat(['hits differ but no band carries clear fresh noise']), [{ value: 'sample', p: 0.2 }]);
    return out('undecided', 'low', 0.5, ev.concat(['partial similarity: modulation, velocity layers or effects']), [{ value: 'synth', p: 0.5 }, { value: 'sample', p: 0.5 }]);
  }

  // ------------------------------------------------------------ decision D: reverb present, RT60, pre-delay
  // fd = features.freeDecay, pd = features.predelay (optional)
  function reverb(fd, pd) {
    if (!fd || !(fd.lastOnset >= 0)) return out({ present: 'unknown' }, 'none', 0.5, ['no onset found']);
    var ev = ['free decay after the last hit at ' + fd.lastOnset.toFixed(2) + ' s: early slope ' + f2(fd.early) + ' s, late slope ' + f2(fd.late) + ' s (EDC -25..-45 dB)'];
    var late = fd.late, present = late === late && late >= 0.5 && (!(fd.to60 === fd.to60) || fd.to60 >= 0.4);
    var v = { present: present, rt60: present ? late : null, method: 'Schroeder EDC, -25..-45 dB, free decay', bands: fd.bands, predelayMs: null };
    if (pd) { if (pd.ms != null && present) { v.predelayMs = pd.ms; ev.push('pre-delay ' + pd.ms.toFixed(1) + ' ms (side-channel onset)'); } else if (pd.reason) ev.push('pre-delay not measured: ' + pd.reason); }
    if (!fd.reached45) { ev.push('the decay did not reach -45 dB before the end'); return out(v, 'low', 0.6, ev); }
    if (present) return out(v, late > 1 ? 'high' : 'medium', late > 1 ? 0.95 : 0.75, ev);
    return out(v, (late === late && late < 0.25) ? 'high' : 'medium', (late === late && late < 0.25) ? 0.95 : 0.7, ev.concat(['no long tail']));
  }

  // ------------------------------------------------------------ shared send against element-specific reverb
  // items = [{name, sig}] with sig = features.tailSignature; only items with a reverb (late slope >= 0.5 s) take part.
  // The report says "shared (send or bus)" or "element-specific" and never "built-in" or "outboard" (coordinator's
  // ruling 5, 2026-11-08): the two cannot be told apart from audio.
  function sameReverb(a, b) {
    var dc = 0, n = 0, i, dr = 0;
    for (i = 0; i < a.colour.length && i < b.colour.length; i++) if (a.colour[i] === a.colour[i] && b.colour[i] === b.colour[i]) { dc += (a.colour[i] - b.colour[i]) * (a.colour[i] - b.colour[i]); n++; }
    dc = n ? Math.sqrt(dc / n) : NaN;
    for (i = 0; i < a.rt.length; i++) if (a.rt[i] > 0 && b.rt[i] > 0) dr = Math.max(dr, Math.abs(Math.log(a.rt[i] / b.rt[i])));
    return { colourDb: dc, rtLogRatio: dr, same: dc < 4 && dr < 0.25 };
  }
  function sharedOrSpecific(items) {
    var wet = items.filter(function (it) { return it.sig && it.sig.late >= 0.5; }), parent = {}, i, j, pairs = [];
    function find(x) { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; }
    wet.forEach(function (it) { parent[it.name] = it.name; });
    for (i = 0; i < wet.length; i++) for (j = i + 1; j < wet.length; j++) {
      var s = sameReverb(wet[i].sig, wet[j].sig); pairs.push({ a: wet[i].name, b: wet[j].name, colourDb: s.colourDb, rtLogRatio: s.rtLogRatio, same: s.same });
      if (s.same) parent[find(wet[i].name)] = find(wet[j].name);
    }
    var groups = {}; wet.forEach(function (it) { var r = find(it.name); (groups[r] = groups[r] || []).push(it.name); });
    var result = {};
    Object.keys(groups).forEach(function (g) {
      var names = groups[g];
      names.forEach(function (nm) {
        result[nm] = wet.length < 2 ? out('unknown', 'none', 0.5, ['only one element with a reverb tail: nothing to compare'])
          : names.length > 1 ? out('shared (send or bus)', 'medium', 0.8, ['same tail as ' + names.filter(function (x) { return x !== nm; }).join(', ')])
          : out('element-specific', 'medium', 0.75, ['tail differs from every other reverberant element']);
      });
    });
    return { elements: result, groups: Object.keys(groups).map(function (g) { return groups[g]; }), pairs: pairs };
  }

  A.decide = { THRESHOLDS: T, synthOrSample: synthOrSample, reverb: reverb, sameReverb: sameReverb, sharedOrSpecific: sharedOrSpecific };
})();
