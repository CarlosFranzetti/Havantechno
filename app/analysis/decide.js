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
  function f2(x) { return typeof x === 'number' && x === x ? x.toFixed(2) : 'n/a'; }

  // ------------------------------------------------------------ decision A: synth or sample
  // id = Analysis.features.identity(...); o.formantSlope (from features.formantSlope) and o.libraryMatch (best NCC
  // against a known sample library, 0..1) are optional supporting evidence.
  // The cap (transcript 3.4): replayed hits with no noise content cannot be told from deterministic synthesis
  // (the engine's kick, bass and stab read twin 1.00), so "sample" is low confidence unless supported.
  var T = { fresh: 0.5, same: 0.97, noiseFlat: 0.25, bandShare: -10 };
  function synthOrSample(id, o) {
    o = o || {};
    if (o.formantSlope == null && id && id.formantSlope === id.formantSlope && id.formantSlope != null) o = { formantSlope: id.formantSlope, libraryMatch: o.libraryMatch };
    if (!id || id.nHits < 3) return out('unknown', 'none', 0.5, ['fewer than 3 hits']);
    var ev = ['hits ' + id.nHits, 'twin (300 Hz-16 kHz) ' + f2(id.twin), 'pitch-normalised twin ' + f2(id.pitchTwin), 'residual ' + (id.residualDb === id.residualDb ? id.residualDb.toFixed(1) + ' dB' : 'n/a')];
    var fresh = id.bands.filter(function (b) { return b.shareDb > T.bandShare && b.twin === b.twin && b.twin < T.fresh; });
    fresh.forEach(function (b) { ev.push('fresh content in ' + b.lo + '-' + b.hi + ' Hz (twin ' + f2(b.twin) + ', ' + b.shareDb.toFixed(1) + ' dB of the energy)'); });
    var tw = Math.max(id.twin, id.pitchTwin || -1);
    if (fresh.length && id.twin < 0.6) return out('synth', 'high', 0.95, ev.concat(['each hit is a new waveform: noise or free-running oscillators']), [{ value: 'sample', p: 0.05 }]);
    if (tw >= T.same) {
      var noisy = id.hfShareDb > -25 && id.hfFlatness > T.noiseFlat;
      // L2: high -> medium. A digital voice that restarts one stored noise table at every hit replays identically too:
      // this engine's Drums do (drums.js noiseBuf, a 2 s seeded buffer started at offset 0), and every one of their noise
      // voices read twin 1.00. Analogue noise never repeats, so "not analogue noise" stays certain; "a sample" is not.
      var rrBand = id.bands.filter(function (b) { return b.shareDb > T.bandShare && b.pairs === b.pairs && b.pairs < 0.9 && b.twin >= T.same; });
      if (noisy && rrBand.length) return out('sample', 'high', 0.95, ev.concat(['noise content replays identically, and from a small set of different recordings (pairs ' + f2(rrBand[0].pairs) + ', twin ' + f2(rrBand[0].twin) + ' in ' + rrBand[0].lo + '-' + rrBand[0].hi + ' Hz): round robins, velocity layers or transposition']), [{ value: 'synth', p: 0.05 }]);
      // back to high after the coordinator's drums.js fix (per-hit noise offset, 2026-11-11): in the truth set only the
      // sampler now replays noise identically. The caveat stays in the evidence for other digital machines.
      if (noisy) return out('sample', 'high', 0.9, ev.concat(['noise content (3-16 kHz flatness ' + f2(id.hfFlatness) + ') replays identically: a recording (a digital voice that restarts one noise table at every hit would read the same)']), [{ value: 'synth (digital, frozen noise)', p: 0.1 }]);
      var support = [];
      // L2: the formant score is features.formantSlope's alignment ratio. Above 0.9 the harmonic profile and its time
      // course both scale with pitch, as a transposed recording's do; an FM synth's profile also scales but its
      // envelopes run in seconds (the engine's fm read 0.74 over a fifth), so only > 0.9 counts as support.
      if (o.formantSlope === o.formantSlope && o.formantSlope != null && o.formantSlope > 0.9) support.push('harmonic profile and its time course scale with pitch (formant score ' + f2(o.formantSlope) + '), as a transposed recording does');
      if (o.libraryMatch != null && o.libraryMatch >= 0.9) support.push('matches a library sample (NCC ' + f2(o.libraryMatch) + ')');
      if (o.formantSlope != null && o.formantSlope === o.formantSlope && o.formantSlope < 0.3) return out('synth', 'medium', 0.75, ev.concat(['identical replays but the spectral envelope stays put across pitches (slope ' + f2(o.formantSlope) + '): a fixed filter']), [{ value: 'sample', p: 0.25 }]);
      if (support.length) return out('sample', support.length > 1 ? 'high' : 'medium', support.length > 1 ? 0.9 : 0.8, ev.concat(support), [{ value: 'synth', p: support.length > 1 ? 0.1 : 0.2 }]);
      return out('sample', 'low', 0.55, ev.concat(['identical replays with no noise content: a sample or a deterministic one-shot synth (capped)']), [{ value: 'synth', p: 0.45 }]);
    }
    if (tw < 0.6) return out('synth', 'medium', 0.8, ev.concat(['hits differ but no band carries clear fresh noise']), [{ value: 'sample', p: 0.2 }]);
    // L2: the residual after the best scaled, aligned twin. Replays (any sampler) leave -30 dB or less, deterministic
    // synthesis -19 to -46 dB, free-running oscillators and fresh noise -2 to -7 dB (truth set, 2026-11-11: Drums noise
    // voices after the per-hit noise offset, juno, modeld). A sampler with sample-start or filter modulation would also
    // leave a large residual, so this is medium, not high.
    if (id.residualDb === id.residualDb && id.residualDb > -10) return out('synth', 'medium', 0.8, ev.concat(['no hit has a close replay (residual ' + id.residualDb.toFixed(1) + ' dB after the best aligned, scaled twin): free-running oscillators or fresh noise; a sampler with per-hit modulation would read the same']), [{ value: 'sample', p: 0.2 }]);
    return out('undecided', 'low', 0.5, ev.concat(['partial similarity: modulation, velocity layers or effects']), [{ value: 'synth', p: 0.5 }, { value: 'sample', p: 0.5 }]);
  }

  // ------------------------------------------------------------ decision B: mono or poly (L2)
  // p = features.polyphony. The question answered is the owner's: can the instrument sound more than one pitch at once?
  // Counts are pitch classes per frame (octave layers and sub oscillators are one voice). A poly synth that plays one
  // note at a time with no overlapping release cannot be told from a mono synth: that is said, not guessed.
  function monoPoly(p) {
    if (!p || p.frameCount < 5) return out('unknown', 'none', 0.5, ['fewer than 5 sounding frames']);
    var ev = ['frames ' + p.frameCount + ', median pitch classes ' + p.median + ', 90th percentile ' + p.p90 + ', one pitch in ' + Math.round(100 * p.single) + ' %, two or more in ' + Math.round(100 * p.multi) + ' %'];
    if (p.octaveLayered > 0.3) ev.push('octave layering in ' + Math.round(100 * p.octaveLayered) + ' % of frames: a sub or octave oscillator, or octave doubling');
    var top = Object.keys(p.notes).sort(function (a, b) { return p.notes[b] - p.notes[a]; }).slice(0, 6);
    ev.push('commonest notes (MIDI): ' + top.join(', '));
    if (p.median >= 2) return out('poly', p.multi > 0.6 ? 'high' : 'medium', p.multi > 0.6 ? 0.9 : 0.75, ev.concat(['several pitches sound together: chords or overlapping notes']), [{ value: 'mono', p: p.multi > 0.6 ? 0.1 : 0.25 }]);
    if (p.multi > 0.3) return out('poly', 'medium', 0.7, ev.concat(['mostly one pitch, but in ' + Math.round(100 * p.multi) + ' % of frames a second pitch rings on: releases overlapping the next note, which a mono synth cuts']), [{ value: 'mono', p: 0.3 }]);
    return out('mono', p.frameCount >= 10 ? 'medium' : 'low', p.frameCount >= 10 ? 0.75 : 0.6, ev.concat(['one pitch at a time; a poly synth played one note at a time, with no overlapping release, would read the same']), [{ value: 'poly', p: 0.25 }]);
  }

  // ------------------------------------------------------------ decision C: FM or subtractive (L2, L1's method)
  // fit = features.fmFit; poly = decide.monoPoly's value (chords are not attempted: partials of different notes collide)
  function fmOrSubtractive(fit, poly) {
    if (poly === 'poly') return out('not attempted', 'none', 0.5, ['several pitches at once: the per-note fit needs one note at a time']);
    if (!fit || !fit.fm || !fit.sub) return out('unknown', 'none', 0.5, ['no clearly pitched notes with 3 or more frames of 4 or more harmonics' + (fit ? ' (' + fit.notes + ' notes, ' + fit.frames + ' frames' + (fit.sineFrames ? ', ' + fit.sineFrames + ' near-sine frames: a sine, low-index FM or a heavily filtered wave cannot be told apart' : '') + ')' : '')]);
    var ev = ['notes ' + fit.notes + ' (' + (fit.f0s || []).join(', ') + ' Hz), frames ' + fit.frames,
              'FM fit ' + f2(fit.fm.err) + ' dB (carrier:modulator ' + fit.fm.pair.join(':') + ', index ' + f2(fit.fm.indexStart) + ' -> ' + f2(fit.fm.indexEnd) + ')',
              'subtractive fit ' + f2(fit.sub.err) + ' dB (' + fit.sub.wave + ' through a 2-pole lowpass, Q ' + fit.sub.q + ')',
              'inharmonicity ' + f2(fit.inharmonicCents) + ' cents'];
    if (fit.inharmonicCents > 15 && fit.sub.err - fit.fm.err > -1) return out('fm', 'medium', 0.75, ev.concat(['partials off the harmonic series: FM with a non-integer ratio, ring modulation, or a bell or metal sound']), [{ value: 'subtractive', p: 0.25 }]);
    var gap = fit.sub.err - fit.fm.err;
    if (gap > 2) return out('fm', 'high', 0.9, ev, [{ value: 'subtractive', p: 0.1 }]);
    if (gap > 1) return out('fm', 'medium', 0.75, ev, [{ value: 'subtractive', p: 0.25 }]);
    if (gap < -2) return out('subtractive', 'high', 0.9, ev, [{ value: 'fm', p: 0.1 }]);
    if (gap < -1) return out('subtractive', 'medium', 0.75, ev, [{ value: 'fm', p: 0.25 }]);
    return out('undecided', 'low', 0.5, ev.concat(['the two families fit within 1 dB of each other (e.g. FM 1:2 and a filtered square both give odd harmonics)']), [{ value: 'fm', p: 0.5 }, { value: 'subtractive', p: 0.5 }]);
  }

  // ------------------------------------------------------------ decision D: reverb present, RT60, pre-delay
  // fd = features.freeDecay, pd = features.predelay (optional)
  function reverb(fd, pd) {
    if (!fd || !(fd.lastOnset >= 0)) return out({ present: 'unknown' }, 'none', 0.5, ['no onset found']);
    var ev = ['free decay after the last hit at ' + fd.lastOnset.toFixed(2) + ' s: early slope ' + f2(fd.early) + ' s, late slope ' + f2(fd.late) + ' s (EDC -25..-45 dB)'];
    var late = fd.late, long = late === late && late >= 0.5 && (!(fd.to60 === fd.to60) || fd.to60 >= 0.4), present = long, monoTail = false;
    // L2: a long decay is a reverb only if it is decorrelated (stereo) or broadband (mono files). Engine truth: the 808
    // kick's ring read late 0.90 s and the 808 clap's built-in tail 0.53 s, both with L = R (correlation 1); the engine's reverb send read -0.00 to 0.71 in the -25..-45 dB window (clap, hat, pad, stab), so only > 0.99 counts as mono.
    if (long && fd.stereo && fd.tailCorr === fd.tailCorr && fd.tailCorr > 0.99) { present = false; monoTail = true; }
    var wideBands = (fd.bands || []).filter(function (b) { return b.late >= 0.3; }).length;
    if (long && !fd.stereo && wideBands < 2) present = false;
    var v = { present: present, rt60: present ? late : null, method: 'Schroeder EDC, -25..-45 dB, free decay', bands: fd.bands, predelayMs: null,
              tailCorr: fd.tailCorr === fd.tailCorr ? fd.tailCorr : null, sideRt60: fd.sideLate === fd.sideLate ? fd.sideLate : null };
    if (fd.tailCorr === fd.tailCorr) ev.push('tail L/R correlation ' + f2(fd.tailCorr));
    if (monoTail) ev.push('the long decay (' + f2(late) + ' s) is identical in both channels: the element\'s own decay (a resonator, or a built-in mono tail), not a stereo reverb; a mono reverb would read the same');
    if (long && !fd.stereo) ev.push('mono file: reverb told from the element\'s own decay only by bandwidth (' + wideBands + ' of 3 bands decay slowly)');
    if (present && v.sideRt60 != null) ev.push('side-channel decay ' + f2(v.sideRt60) + ' s (wet only for a centred source); if the element decays more slowly than the reverb, both values are the element\'s decay and bound the reverb\'s RT60 from above');
    if (pd) { if (pd.ms != null && present) { v.predelayMs = pd.ms; ev.push('pre-delay ' + pd.ms.toFixed(1) + ' ms (side-channel onset)'); } else if (pd.reason) ev.push('pre-delay not measured: ' + pd.reason); }
    if (!fd.reached45) { ev.push('the decay did not reach -45 dB before the end'); return out(v, 'low', 0.6, ev); }
    if (long && !fd.stereo) return out(v, 'low', 0.6, ev);
    if (monoTail) return out(v, 'medium', 0.75, ev);
    if (present) return out(v, late > 1 ? 'high' : 'medium', late > 1 ? 0.95 : 0.75, ev);
    return out(v, (late === late && late < 0.25) ? 'high' : 'medium', (late === late && late < 0.25) ? 0.95 : 0.7, ev.concat(['no long tail']));
  }

  // ------------------------------------------------------------ shared send against element-specific reverb
  // items = [{name, sig}] with sig = features.tailSignature; only items with a reverb (late slope >= 0.5 s) take part.
  // The report says "shared (send or bus)" or "element-specific" and never "built-in" or "outboard" (coordinator's
  // ruling 5, 2026-11-08): the two cannot be told apart from audio.
  function quadFit(x, y) {
    // least-squares y ~ c0 + c1 x + c2 x^2, returns the fitted values (normal equations, 3x3 Cramer)
    var S = [0, 0, 0, 0, 0], T = [0, 0, 0], i, n = x.length;
    for (i = 0; i < n; i++) { var p = 1; for (var k = 0; k < 5; k++) { S[k] += p; if (k < 3) T[k] += p * y[i]; p *= x[i]; } }
    function det(m) { return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]); }
    var M = [[S[0], S[1], S[2]], [S[1], S[2], S[3]], [S[2], S[3], S[4]]], dm = det(M), c = [];
    for (var j = 0; j < 3; j++) { var Mj = M.map(function (r, ri) { return r.map(function (v, ci) { return ci === j ? T[ri] : v; }); }); c.push(dm ? det(Mj) / dm : 0); }
    return x.map(function (v) { return c[0] + c[1] * v + c[2] * v * v; });
  }
  function sameReverb(a, b) {
    var i, idx = [], ma = -Infinity, mb = -Infinity, dc = NaN, dr = 0;
    for (i = 0; i < a.headDb.length; i++) { ma = Math.max(ma, a.headDb[i]); mb = Math.max(mb, b.headDb[i]); }
    // compare colour only where both sources excite the band (head within 30 dB of its own loudest band)
    for (i = 0; i < a.colour.length && i < b.colour.length; i++) if (a.headDb[i] > ma - 30 && b.headDb[i] > mb - 30) idx.push(i);
    if (idx.length >= 4) {
      // the broad shape of the difference: a quadratic in band index, least squares. A tonal source puts one or two
      // partials in a low band, so single bands scatter by +-5 dB around a shared reverb (L1 check); reverb colour
      // differences (damping, bandwidth) are broad. The level offset is removed: send amounts differ.
      var d = idx.map(function (k) { return a.colour[k] - b.colour[k]; }), fit = quadFit(idx, d), m = 0, s2 = 0;
      fit.forEach(function (v) { m += v / fit.length; }); fit.forEach(function (v) { s2 += (v - m) * (v - m); });
      dc = Math.sqrt(s2 / fit.length);
    }
    for (i = 0; i < a.rt.length; i++) if (a.rt[i] > 0 && b.rt[i] > 0) dr = Math.max(dr, Math.abs(Math.log(a.rt[i] / b.rt[i])));
    return { colourDb: dc, bandsCompared: idx.length, rtLogRatio: dr, same: dr < 0.25 && (dc !== dc || dc < 4) };
  }
  function sharedOrSpecific(items) {
    // L2: the same gate as reverb(): a mono tail in a stereo file, or a narrow-band decay in a mono file, is the element's
    // own decay and takes no part (an 808 kick's ring was grouped as a reverb before).
    var wet = items.filter(function (it) {
      var g = it.sig; if (!g || !(g.late >= 0.5)) return false;
      if (g.stereo && g.tailCorr === g.tailCorr && g.tailCorr > 0.99) return false;
      if (g.stereo === false && g.wideBands != null && g.wideBands < 2) return false;
      return true;
    }), parent = {}, i, j, pairs = [];
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

  A.decide = { THRESHOLDS: T, synthOrSample: synthOrSample, monoPoly: monoPoly, fmOrSubtractive: fmOrSubtractive, reverb: reverb, sameReverb: sameReverb, sharedOrSpecific: sharedOrSpecific };
})();
