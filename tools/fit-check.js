#!/usr/bin/env node
/* tools/fit-check.js (Selector Crew T3): checks for app/analysis/fit.js (fitting by synthesis, strategy step C1).
 *
 *   node tools/fit-check.js                 unit checks in Node (toy instruments, no browser), then the labelled runs
 *                                           in headless Chromium through tools/fit.js (sets "solo" and "lines"), judged
 *                                           against the plan's thresholds
 *   node tools/fit-check.js --unit          unit checks only (seconds)
 *   node tools/fit-check.js --from <dir>    judge saved results (results-solo.json, results-lines.json in <dir>) instead
 *                                           of running the browser
 * Thresholds (docs/plans/2026-11-21-strategy.md C1, and stated here for the parameters):
 *   - instrument right on at least 95 % of the app's own labelled solo renders;
 *   - tb303 slides: at least 19 of the 20 true slides found on the labelled lines, with fewer than 2 false slides;
 *   - parameters: every row searched reports an interval; at least 80 % of the searched rows of right-instrument items
 *     contain the true value (the rate stated by T3 before the run; measured rate printed);
 *   - run time per excerpt printed (median and maximum), not judged.
 * Prints "OK: N checks passed" and exits 0, or lists the failures and exits 1; 2 when the browser part could not run.
 * Every number is on the app's own renders: nothing here involves a real instrument.
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var ROOT = path.join(__dirname, '..');
['dsp.js', 'fit.js'].forEach(function (f) { var p = path.join(ROOT, 'app', 'analysis', f); vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: p }); });
var A = globalThis.Analysis, D = A.dsp, F = A.fit;
var passed = 0, failed = [];
function check(name, ok, info) { if (ok) passed++; else failed.push(name + (info ? ' (' + info + ')' : '')); console.log((ok ? 'pass ' : 'FAIL ') + name + (info ? '  ' + info : '')); }
var argv = process.argv.slice(2), UNIT = argv.indexOf('--unit') >= 0, FROM = argv.indexOf('--from') >= 0 ? argv[argv.indexOf('--from') + 1] : null;

// ------------------------------------------------------------------ toy instruments (Node, 8 kHz)
var SR = 8000;
var TOY = {
  toysaw: { cutoff: { min: 100, max: 3000, value: 800, unit: 'Hz' }, decay: { min: 0.02, max: 1, value: 0.2, unit: 's' }, wave: { value: 'saw', options: ['saw', 'square'] },
            bright: { value: false }, level: { min: 0, max: 1.5, value: 1 }, name: { value: 'x' } },
  toysine: { ratio: { min: 0.5, max: 4, value: 1 }, decay: { min: 0.02, max: 1, value: 0.3, unit: 's' }, level: { min: 0, max: 1.5, value: 1 } }
};
function toyRender(type, p, events, secs) {
  var n = Math.round(secs * SR), y = new Float32Array(n), sp = TOY[type], P = {}, k;
  for (k in sp) P[k] = p.hasOwnProperty(k) ? p[k] : sp[k].value;
  var f = 0, tf = 0, ph = 0, lp = 0, env = 0, j = 0, gate = -1, prevSlide = false, accent = 0;
  for (var i = 0; i < n; i++) {
    var t = i / SR;
    while (j < events.length && events[j].t <= t) {
      var e = events[j], hz = 440 * Math.pow(2, ((e.midi || 57) - 69) / 12);
      tf = hz; if (!prevSlide) { f = hz; env = (e.vel || 0.85); accent = e.accent ? 1 : 0; }
      prevSlide = !!e.slide; gate = t + (e.dur || 0.1) + (e.slide ? 0.2 : 0); j++;
    }
    f += (tf - f) * 0.01;
    env *= Math.exp(-1 / (P.decay * SR)); if (t > gate) env *= 0.995;
    ph += f / SR; ph -= Math.floor(ph);
    var s;
    if (type === 'toysaw') { s = P.wave === 'saw' ? 2 * ph - 1 : (ph < 0.5 ? 1 : -1); var a = Math.exp(-2 * Math.PI * P.cutoff * (P.bright ? 2 : 1) * (1 + accent) / SR); lp = (1 - a) * s + a * lp; s = lp; }
    else s = Math.sin(2 * Math.PI * ph + 2 * Math.sin(2 * Math.PI * ph * P.ratio));
    y[i] = s * env * (P.level || 1) * (1 + accent);
  }
  return Promise.resolve(y);
}
var toyEnv = { sr: SR, render: toyRender, spec: function (t) { return TOY[t]; },
               candidates: function () { return [{ type: 'toysaw', family: 'pitched', flags: ['slide', 'accent'] }, { type: 'toysine', family: 'pitched', flags: [] }]; } };
function line(flags) {
  var notes = [45, 48, 52, 45, 50, 43], sd = 0.125;
  return notes.map(function (m, k) { var e = { t: 0.02 + k * 2 * sd, midi: m, dur: 0.18, vel: 0.85, step: 2 * k }; if (flags && flags[k]) { if (flags[k].s) e.slide = true; if (flags[k].a) e.accent = true; } return e; });
}

async function unit() {
  // space: read from the spec
  var S = F.space(TOY.toysaw);
  check('space: numeric rows continuous, cutoff on a log scale, decay linear... (30x range is log)', S.cont.length === 2 && S.cont[0].name === 'cutoff' && S.cont[0].log === true && S.cont[1].log === true, JSON.stringify(S.cont.map(function (r) { return r.name + (r.log ? ' log' : ''); })));
  check('space: options and booleans enumerated', S.disc.length === 2 && S.disc[0].options.join() === 'saw,square' && S.disc[1].options.join() === 'false,true', JSON.stringify(S.disc));
  check('space: level and a string without options held', S.held.map(function (h) { return h.name; }).sort().join() === 'level,name');
  var r0 = S.cont[0], rt = [100, 800, 3000].every(function (v) { return Math.abs(F.fromU(r0, F.toU(r0, v)) - v) < 1e-6; });
  check('space: toU and fromU round trip', rt);
  // loss: zero on itself, level-blind, grows with a change
  var ev = line(), x = await toyRender('toysaw', {}, ev, 1.8), T = F.target(x, SR), half = x.map(function (v) { return 0.5 * v; });
  var l0 = F.loss(T, x), lh = F.loss(T, half), l1 = F.loss(T, await toyRender('toysaw', { cutoff: 1000 }, ev, 1.8)), l2 = F.loss(T, await toyRender('toysaw', { cutoff: 2500 }, ev, 1.8));
  check('loss: 0 against itself', l0 < 1e-9, l0.toExponential(2));
  check('loss: half level reads as the same sound', lh < 1e-6, lh.toExponential(2));
  check('loss: grows with the distance of the cutoff', l0 < l1 && l1 < l2, l1.toFixed(3) + ' < ' + l2.toFixed(3));
  // CMA-ES on a quadratic in [0,1]^4
  var goal = [0.2, 0.7, 0.45, 0.9];
  var cr = await F.cmaes(function (X) { return Promise.resolve(X.map(function (x) { var s = 0; for (var i = 0; i < 4; i++) s += (x[i] - goal[i]) * (x[i] - goal[i]); return s; })); }, [0.5, 0.5, 0.5, 0.5], { generations: 40, seed: 3 });
  check('cmaes: finds a quadratic\'s minimum within 0.02', cr.x.every(function (v, i) { return Math.abs(v - goal[i]) < 0.02; }), cr.x.map(function (v) { return v.toFixed(3); }).join(', ') + ' after ' + cr.evals);
  // the whole fit on toy instruments: instrument, switch, parameter within its interval, flags per step
  var truthFlags = [{}, { s: 1 }, {}, { a: 1 }, { s: 1, a: 1 }, {}], evT = line(truthFlags);
  var xt = await toyRender('toysaw', { cutoff: 1500, decay: 0.35, wave: 'square' }, evT, 1.8);
  var res = await F.fit(toyEnv, xt, evT.map(function (e) { var c = Object.assign({}, e); delete c.slide; delete c.accent; return c; }), { generations: 15, seed: 2 });
  check('fit (toy): the right instrument', res.instrument === 'toysaw', res.instrument + ' ' + res.distanceDb + ' dB');
  check('fit (toy): runner-up reported with its distance', res.runnerUp && res.runnerUp.instrument === 'toysine' && res.runnerUp.distanceDb > res.distanceDb, JSON.stringify(res.runnerUp));
  check('fit (toy): the switch enumerated right', res.params.wave && res.params.wave.value === 'square', res.params.wave && res.params.wave.value);
  var cu = res.params.cutoff, de = res.params.decay;
  check('fit (toy): every continuous row has an interval', cu && de && cu.lo <= cu.value && cu.value <= cu.hi && de.lo <= de.value && de.value <= de.hi);
  check('fit (toy): cutoff 1500 inside its interval', cu.lo <= 1500 && 1500 <= cu.hi, cu.value.toFixed(0) + ' [' + cu.lo.toFixed(0) + ', ' + cu.hi.toFixed(0) + ']');
  check('fit (toy): decay 0.35 inside its interval', de.lo <= 0.35 && 0.35 <= de.hi, de.value.toFixed(3) + ' [' + de.lo.toFixed(3) + ', ' + de.hi.toFixed(3) + ']');
  var fl = res.flags, okS = 0, okA = 0;
  truthFlags.forEach(function (t, i) { if (!!t.s === fl[i].slide) okS++; if (!!t.a === fl[i].accent) okA++; });
  check('fit (toy): slide and accent right on every step', okS === 6 && okA === 6, 'slide ' + okS + '/6, accent ' + okA + '/6');
}

// ------------------------------------------------------------------ the labelled runs (headless Chromium)
function judge(solo, lines) {
  var fit = require('./fit.js'), S = fit.summarize(solo.run), L = fit.summarize(lines.run);
  console.log('solo set (the app\'s own renders): ' + S.items + ' items, instrument right ' + S.right + '; wrong: ' + (S.wrong.join('; ') || 'none'));
  check('C1 instrument right on >= 95 % of the app\'s own labelled solos', S.items > 0 && S.right >= 0.95 * S.items, S.right + ' of ' + S.items + ' (' + (100 * S.right / Math.max(1, S.items)).toFixed(1) + ' %)');
  var sl = L.slides, ac = L.accents;
  console.log('lines (tb303, L303 line, four patches): instrument right ' + L.right + ' of ' + L.items + '; slides found ' + sl.found + ' of ' + sl.truth + ', false ' + sl.falsePos + ', steps right ' + sl.rightSteps + ' of ' + sl.steps +
              '; accents found ' + ac.found + ' of ' + ac.truth + ', false ' + ac.falsePos + ', steps right ' + ac.rightSteps + ' of ' + ac.steps);
  check('C1 lines: the instrument is tb303 on every line', L.items >= 4 && L.right === L.items, L.right + ' of ' + L.items);
  check('C1 303 slides: >= 19 of 20 true slides found, < 2 false', sl.truth >= 20 && sl.found >= 19 * sl.truth / 20 && sl.falsePos < 2, sl.found + ' of ' + sl.truth + ', false ' + sl.falsePos);
  var all = { n: 0, covered: 0 };
  [S, L].forEach(function (s) { all.n += s.searchedRows.n; all.covered += s.searchedRows.covered; });
  console.log('parameters, right-instrument items: searched rows ' + all.n + ', truth inside the interval ' + all.covered + ' (' + (100 * all.covered / Math.max(1, all.n)).toFixed(1) + ' %); solo perturbed rows ' + S.perturbedRows.n + ' (searched ' + S.perturbedSearched.n + ', covered ' + S.perturbedSearched.covered +
              ', median error ' + S.perturbedSearched.errUMedian + ' of the range in search coordinates, median width ' + S.perturbedSearched.widthUMedian + '; not searched ' + S.perturbedNotSearched + '); switches right ' + S.discrete.right + ' of ' + S.discrete.n + ' (perturbed ' + S.discrete.perturbedRight + ' of ' + S.discrete.perturbed + ')');
  check('C1 parameters: truth inside the stated interval on >= 80 % of searched rows', all.n > 0 && all.covered >= 0.8 * all.n, all.covered + ' of ' + all.n);
  console.log('run time per excerpt (ms): solo median ' + S.msMedian + ', max ' + S.msMax + '; lines median ' + L.msMedian + ', max ' + L.msMax);
}

(async function main() {
  try { await unit(); } catch (e) { check('unit checks ran', false, e && e.stack); }
  if (!UNIT) {
    var dir = FROM ? path.resolve(FROM) : path.join(ROOT, 'tools', 'out', 'fit');
    if (!FROM) {
      var cp = require('child_process');
      ['solo', 'lines'].forEach(function (set) {
        var r = cp.spawnSync(process.execPath, [path.join(__dirname, 'fit.js'), '--set', set, '--quiet', '--out', path.join(dir, 'results-' + set + '.json')], { stdio: ['ignore', 'ignore', 'inherit'] });
        if (r.status !== 0) { console.error('fit-check: tools/fit.js --set ' + set + ' exited ' + r.status); process.exit(2); }
      });
    }
    try {
      judge(JSON.parse(fs.readFileSync(path.join(dir, 'results-solo.json'), 'utf8')), JSON.parse(fs.readFileSync(path.join(dir, 'results-lines.json'), 'utf8')));
    } catch (e) { console.error('fit-check: cannot read results in ' + dir + ': ' + e.message); process.exit(2); }
  }
  if (failed.length) { console.log('FAILED ' + failed.length + ':\n  ' + failed.join('\n  ')); process.exit(1); }
  console.log('OK: ' + passed + ' checks passed');
  process.exit(0);
})();
