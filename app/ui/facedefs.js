/* Havantechno app - ui/facedefs.js
 * The 23 face definitions for Faces.define: 13 instruments, 10 processor types (filter, saturator, delay, reverb, eq3,
 * compressor, limiter, sidechain, widener, chorus) and the channel strip. Data plus one hero-graph function each.
 * A definition names parameters only; min, max, unit and default come from device.spec at render time.
 * Hero graphs are pure canvas drawing from parameter values (RBJ-style responses are computed here, no AudioContext),
 * in the family colours that Faces.palette supplies. compressor, limiter, sidechain, widener and channel also read
 * host.meter(device.id) / the live node, so they are marked live and redrawn every update().
 * Design sources: faceplate-layout round 1 and 5 transcripts (FH3, FH4), FS4 table of glyph and hero per device.
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var Faces = root.Faces;
  if (!Faces) { try { console.warn('[facedefs] Faces is not loaded; load ui/faces.js first'); } catch (e) {} return; }

  // ------------------------------------------------------------------ drawing helpers
  var LN = Math.log, TAU = Math.PI * 2;
  function pal() { return Faces.palette || { ink: '#b0b8c5', dim: '#6a6f77', wash: '#1d1f23', fg: '#d8d8e6', line: '#2a2a3a', bg: '#15151e', on: '#75f97f', dashed: false }; }
  function P(d, host, n) { return Faces.param(d, host, n); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lx(v, lo, hi) { return clamp((LN(Math.max(v, 1e-9)) - LN(lo)) / (LN(hi) - LN(lo)), 0, 1); }
  function plot(w, h, small) {
    var l = small ? 3 : 6, r = small ? 3 : 6, t = small ? 3 : 6, b = small ? 3 : 13;
    return { x0: l, y0: t, x1: w - r, y1: h - b, w: w - l - r, h: h - t - b, small: !!small };
  }
  function region(g, fx0, fx1) { var w = g.w; return { x0: g.x0 + w * fx0, x1: g.x0 + w * fx1, w: w * (fx1 - fx0), y0: g.y0, y1: g.y1, h: g.h, small: g.small }; }
  function dash(c, on) { if (c.setLineDash) c.setLineDash(on ? [4, 3] : []); }
  function path(c, pts, color, lw, dashed) {
    if (!pts.length) return;
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.strokeStyle = color; c.lineWidth = lw || 1.5; c.lineJoin = 'round';
    dash(c, dashed || pal().dashed); c.stroke(); dash(c, false);
  }
  function area(c, pts, baseY, color, alpha) {
    if (pts.length < 2) return;
    c.beginPath(); c.moveTo(pts[0][0], baseY);
    for (var i = 0; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.lineTo(pts[pts.length - 1][0], baseY); c.closePath();
    c.globalAlpha = alpha == null ? 0.2 : alpha; c.fillStyle = color; c.fill(); c.globalAlpha = 1;
  }
  function line(c, x0, y0, x1, y1, color, lw, dashed) {
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.strokeStyle = color; c.lineWidth = lw || 1; dash(c, dashed); c.stroke(); dash(c, false);
  }
  function dot(c, x, y, r, color, ring) {
    c.beginPath(); c.arc(x, y, r, 0, TAU);
    if (ring) { c.strokeStyle = color; c.lineWidth = 1.5; c.stroke(); } else { c.fillStyle = color; c.fill(); }
  }
  function txt(c, s, x, y, align, color) {
    c.font = '9px system-ui, sans-serif'; c.textAlign = align || 'left'; c.fillStyle = color || pal().dim; c.textBaseline = 'alphabetic'; c.fillText(String(s), x, y);
  }
  function sample(n, fn) { var a = [], i; for (i = 0; i <= n; i++) a.push(fn(i / n, i)); return a; }
  function fhz(f) { return f >= 1000 ? (Math.round(f / 100) / 10) + 'k' : String(Math.round(f)); }
  function box(c, g, color) { c.strokeStyle = color || pal().line; c.lineWidth = 1; dash(c, false); c.strokeRect(g.x0 + 0.5, g.y0 + 0.5, g.w, g.h); }

  // Web Audio biquad magnitude in dB (analog prototype). lowpass and highpass Q is in dB in Web Audio, the others are linear.
  function resp(type, f0, q, gdb, f) {
    var r = f / f0, r2 = r * r, A = Math.pow(10, gdb / 40), sA = Math.sqrt(A), m, ql;
    ql = (type === 'lowpass' || type === 'highpass') ? Math.pow(10, q / 20) : Math.max(q, 0.05);
    var d0 = (1 - r2) * (1 - r2) + r2 / (ql * ql);
    switch (type) {
      case 'highpass': m = r2 / Math.sqrt(d0); break;
      case 'bandpass': m = (r / ql) / Math.sqrt(d0); break;
      case 'notch': m = Math.abs(1 - r2) / Math.sqrt(d0); break;
      case 'allpass': m = 1; break;
      case 'peaking': m = Math.sqrt(((1 - r2) * (1 - r2) + Math.pow(A * r / ql, 2)) / ((1 - r2) * (1 - r2) + Math.pow(r / (A * ql), 2))); break;
      case 'lowshelf': m = A * Math.sqrt((Math.pow(A - r2, 2) + Math.pow(sA * r / ql, 2)) / (Math.pow(1 - A * r2, 2) + Math.pow(sA * r / ql, 2))); break;
      case 'highshelf': m = A * Math.sqrt((Math.pow(1 - A * r2, 2) + Math.pow(sA * r / ql, 2)) / (Math.pow(A - r2, 2) + Math.pow(sA * r / ql, 2))); break;
      default: m = 1 / Math.sqrt(d0);
    }
    return 20 * Math.log10(Math.max(m, 1e-6));
  }
  // frequency-response plot into region g (log Hz 20..20k, dB lo..hi). fn(f) -> dB. Returns point list.
  function freqPts(g, lo, hi, fn, n) {
    return sample(n || 72, function (u) {
      var f = 20 * Math.pow(1000, u), db = clamp(fn(f), lo, hi);
      return [g.x0 + u * g.w, g.y1 - (db - lo) / (hi - lo) * g.h];
    });
  }
  function freqGrid(c, g, lo, hi, zero) {
    var p = pal(), fs = [100, 1000, 10000], i;
    for (i = 0; i < fs.length; i++) { var x = g.x0 + lx(fs[i], 20, 20000) * g.w; line(c, x, g.y0, x, g.y1, p.line, 1); if (!g.small) txt(c, fhz(fs[i]), x + 2, g.y1 + 10); }
    if (zero != null) { var y = g.y1 - (zero - lo) / (hi - lo) * g.h; line(c, g.x0, y, g.x1, y, p.line, 1); }
  }
  function wave(c, kind, g, cycles, amp, color, alpha) {
    var pts = sample(96, function (u) {
      var ph = (u * cycles) % 1, y;
      if (kind === 'square') y = ph < 0.5 ? 1 : -1; else if (kind === 'triangle') y = 1 - 4 * Math.abs(ph - 0.5); else if (kind === 'sine') y = Math.sin(ph * TAU); else y = 1 - 2 * ph;
      return [g.x0 + u * g.w, g.y0 + g.h / 2 - y * amp * g.h / 2];
    });
    c.globalAlpha = alpha == null ? 0.35 : alpha; path(c, pts, color, 1, false); c.globalAlpha = 1;
  }
  function envT(fn, g, T, amp, n) { return sample(n || 80, function (u) { return [g.x0 + u * g.w, g.y1 - clamp(fn(u * T), 0, 1.2) * amp * g.h]; }); }
  var DB1000 = 6.9078;                                         // ln(1000): exponential decay to -60 dB over the decay time

  // ------------------------------------------------------------------ instruments: heroes
  function heroKick(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), tune = P(d, host, 'tune'), punch = P(d, host, 'punch'), sweep = P(d, host, 'sweep'), decay = P(d, host, 'decay'), click = P(d, host, 'click');
    var tau = P(d, host, 'tau') || 0, hold = P(d, host, 'hold') || 0;
    var T = Math.max(decay * 1.1 + hold, tau > 0 ? tau * 5 : sweep * 3, 0.1), i, ff = [50, 100, 200];
    function X(t) { return g.x0 + t / T * g.w; } function Y(f) { return g.y1 - lx(f, 30, 400) * g.h; }
    if (!g.small) for (i = 0; i < ff.length; i++) { line(c, g.x0, Y(ff[i]), g.x1, Y(ff[i]), p.line, 1); txt(c, ff[i], g.x1 - 2, Y(ff[i]) - 2, 'right'); }
    var amp = sample(80, function (u) { var t = u * T; return [X(t), g.y1 - (t < 0.0015 ? t / 0.0015 : (t < 0.0015 + hold ? 1 : Math.exp(-(t - 0.0015 - hold) / decay * DB1000))) * g.h * 0.45]; });
    area(c, amp, g.y1, p.ink, 0.18); path(c, amp, p.dim, 1);
    path(c, sample(80, function (u) { var t = u * T; return [X(t), Y(tau > 0 ? tune + (punch - tune) * Math.exp(-t / tau) : (t < sweep ? punch * Math.pow(tune / punch, t / sweep) : tune))]; }), p.ink, 2);
    if (click > 0) line(c, g.x0 + 1, g.y1, g.x0 + 1, g.y1 - click * g.h * 0.6, p.fg, 2);
    if (!g.small) { txt(c, 'punch ' + Math.round(punch), g.x0 + 4, Y(punch) - 3); txt(c, 'tune ' + Math.round(tune), X(Math.min(T, (tau > 0 ? tau * 2 : sweep * 1.6))), Y(tune) - 3); txt(c, Math.round(decay * 1000) + ' ms', g.x1, g.y1 + 10, 'right'); }
  }
  function heroSub(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), att = P(d, host, 'attack'), dec = P(d, host, 'decay'), har = P(d, host, 'harmonic'), glide = P(d, host, 'glide');
    var drone = P(d, host, 'mode') === 'drone', rel = P(d, host, 'release') || 0.03, HOLD = 1;
    var T = drone ? att + HOLD + rel * 1.5 : att + dec * 1.2;
    function env(t, k) {
      if (drone) return t < att ? t / att : (t < att + HOLD ? 1 : Math.max(0, 1 - (t - att - HOLD) / rel));
      return t < att ? t / att : Math.exp(-(t - att) / (dec * k) * DB1000);
    }
    var e = envT(function (t) { return env(t, 1); }, g, T, 0.5, 90);
    var mirror = e.map(function (q) { return [q[0], g.y0 + g.h / 2 - (g.y1 - q[1])]; });
    area(c, e, g.y0 + g.h / 2, p.ink, 0.15); path(c, e, p.dim, 1); path(c, mirror, p.dim, 1);
    path(c, sample(240, function (u) { var t = u * T; return [g.x0 + u * g.w, g.y0 + g.h / 2 - env(t, 1) * Math.sin(u * 14 * TAU) * g.h * 0.5]; }), p.ink, 1.5);
    if (har > 0) path(c, sample(240, function (u) { var t = u * T; return [g.x0 + u * g.w, g.y0 + g.h / 2 - env(t, 0.6) * har * Math.sin(u * 28 * TAU) * g.h * 0.5]; }), p.dim, 1);
    if (!g.small) { txt(c, (drone ? 'drone' : 'pluck') + '  harmonic ' + Math.round(har * 100) + '%', g.x0 + 3, g.y1 + 10); if (glide > 0) txt(c, 'glide ' + Math.round(glide * 1000) + ' ms', g.x1, g.y1 + 10, 'right'); }
  }
  function filterPlot(c, g, d, host, withWave) {
    var p = pal(), cut = P(d, host, 'cutoff'), env = P(d, host, 'env'), res = P(d, host, 'res'), lo = -36, hi = 24;
    freqGrid(c, g, lo, hi, 0);
    if (withWave) wave(c, P(d, host, 'wave') || 'sawtooth', g, 3, 0.5, p.fg, 0.18);
    var peak = clamp(cut + env, 20, 18000);
    if (env > 0) path(c, freqPts(g, lo, hi, function (f) { return resp('lowpass', peak, res, 0, f); }), p.dim, 1, true);
    var pts = freqPts(g, lo, hi, function (f) { return resp('lowpass', cut, res, 0, f); });
    area(c, pts, g.y1, p.ink, 0.15); path(c, pts, p.ink, 2);
    var cx = g.x0 + lx(cut, 20, 20000) * g.w; line(c, cx, g.y0, cx, g.y1, p.dim, 1, true);
    if (!g.small) txt(c, 'cutoff ' + fhz(cut), cx + 3, g.y0 + 9);
  }
  function heroBass(c, w, hh, d, host) { filterPlot(c, plot(w, hh, hh < 64), d, host, true); }
  var CHORD = [63, 66, 70, 73];
  function heroStab(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), spread = P(d, host, 'spread'), det = P(d, host, 'detune'), hp = P(d, host, 'hp'), cut = P(d, host, 'cutoff');
    var cx = g.x0 + g.w / 2, side = spread * g.w * 0.46, i, off = det / 50 * Math.max(2, g.h * 0.09);
    line(c, g.x0, g.y1, g.x1, g.y1, p.line, 1); line(c, cx, g.y0, cx, g.y1, p.line, 1, true);
    for (i = 0; i < CHORD.length; i++) {
      var y = g.y1 - 3 - (CHORD[i] - 60) / 16 * (g.h - 8), s = (i % 2 ? -1 : 1) * side;
      line(c, cx - side, y, cx + side, y, p.dim, 1);
      dot(c, cx + s, y - off, 3, p.ink); dot(c, cx - s, y + off, 3, p.ink);
    }
    if (!g.small) {
      txt(c, 'L', g.x0 + 2, g.y0 + 9); txt(c, 'R', g.x1 - 2, g.y0 + 9, 'right');
      txt(c, 'spread ' + Math.round(spread * 100) + '%  detune ' + Math.round(det) + ' ct', cx, g.y1 + 10, 'center');
      var hx = g.x0 + lx(hp, 20, 2000) * g.w * 0.25; c.globalAlpha = 0.25; c.fillStyle = p.fg; c.fillRect(g.x0, g.y0, hx - g.x0, g.h); c.globalAlpha = 1;
      txt(c, 'cutoff ' + fhz(cut), g.x1 - 2, g.y1 - 4, 'right');
    }
  }
  function heroClap(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), fl = Math.round(P(d, host, 'flams')), flam = P(d, host, 'flam'), dec = P(d, host, 'decay'), tail = P(d, host, 'tail'), td = P(d, host, 'tailDecay');
    var tb = fl * flam, T = tb + Math.max(dec, td) * 1.15 + 0.01, i;
    function X(t) { return g.x0 + t / T * g.w; }
    for (i = 0; i < fl; i++) {
      var pts = [[X(i * flam), g.y1 - g.h * 0.7], [X((i + 1) * flam - 0.001), g.y1 - g.h * 0.12]];
      path(c, pts, p.ink, 2);
    }
    var main = sample(60, function (u) { var t = u * dec; return [X(tb + t), g.y1 - Math.exp(-t / dec * DB1000) * g.h * 0.95]; });
    area(c, main, g.y1, p.ink, 0.2); path(c, main, p.ink, 2);
    if (tail > 0) { var tl = sample(60, function (u) { var t = u * td; return [X(tb + t), g.y1 - Math.exp(-t / td * DB1000) * tail * g.h * 0.5]; }); area(c, tl, g.y1, p.dim, 0.4); path(c, tl, p.dim, 1); }
    line(c, g.x0, g.y1, g.x1, g.y1, p.line, 1);
    if (!g.small) txt(c, fl + ' flams x ' + (Math.round(flam * 10000) / 10) + ' ms', g.x0 + 2, g.y1 + 10);
  }
  var RING = [0.62, 0.78, 1.0, 1.21, 1.47, 1.73];
  function heroHat(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), dec = P(d, host, 'decay'), ring = P(d, host, 'ring'), metal = P(d, host, 'metal'), tone = P(d, host, 'tone'), open = d.type === 'hat_open';
    var L = region(g, 0, 0.62), Rg = region(g, 0.68, 1), T = 0.6, i;
    function env(t) { if (!open) return Math.exp(-t / dec * DB1000); return t < 0.05 ? 0.6 - 8 * t : 0.2 * Math.exp(-(t - 0.05) / Math.max(0.01, dec - 0.05) * DB1000); }
    var e = sample(90, function (u) { var t = u * T; return [L.x0 + u * L.w, L.y1 - clamp(env(t) / 0.6, 0, 1) * L.h * 0.95]; });
    area(c, e, L.y1, p.ink, 0.2); path(c, e, p.ink, 2); line(c, L.x0, L.y1, L.x1, L.y1, p.line, 1);
    for (i = 0; i < RING.length; i++) {
      var bx = Rg.x0 + lx(ring * RING[i], 300, 14000) * Rg.w, bh = (0.2 + 0.75 * metal) * Rg.h;
      line(c, bx, Rg.y1, bx, Rg.y1 - bh, p.ink, 2);
    }
    var tx = Rg.x0 + lx(tone, 300, 14000) * Rg.w; line(c, tx, Rg.y0, tx, Rg.y1, p.dim, 1, true);
    var mh = P(d, host, 'metalHp') || 0;
    if (mh > 0) { var mx = Rg.x0 + lx(Math.max(mh, 300), 300, 14000) * Rg.w; c.globalAlpha = 0.25; c.fillStyle = p.fg; c.fillRect(Rg.x0, Rg.y0, mx - Rg.x0, Rg.h); c.globalAlpha = 1; }
    line(c, Rg.x0, Rg.y1, Rg.x1, Rg.y1, p.line, 1);
    if (!g.small) { txt(c, Math.round(dec * 1000) + ' ms', L.x0 + 2, g.y1 + 10); txt(c, 'ring ' + fhz(ring), Rg.x0, g.y1 + 10); }
  }
  function heroShaker(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), tone = P(d, host, 'tone'), q = P(d, host, 'q'), att = P(d, host, 'attack'), dec = P(d, host, 'decay');
    var L = region(g, 0, 0.5), Rg = region(g, 0.56, 1), T = att + dec * 1.3, lo = -30, hi = 6;
    var bell = sample(72, function (u) { var f = 500 * Math.pow(32, u), db = clamp(resp('bandpass', tone, q, 0, f), lo, hi); return [L.x0 + u * L.w, L.y1 - (db - lo) / (hi - lo) * L.h]; });
    area(c, bell, L.y1, p.ink, 0.18); path(c, bell, p.ink, 2);
    var e = sample(80, function (u) { var t = u * T; return [Rg.x0 + u * Rg.w, Rg.y1 - (t < att ? t / att : Math.exp(-(t - att) / dec * DB1000)) * Rg.h * 0.95]; });
    area(c, e, Rg.y1, p.ink, 0.2); path(c, e, p.ink, 2);
    if (!g.small) { txt(c, fhz(tone) + ' Hz  q ' + (Math.round(q * 10) / 10), L.x0, g.y1 + 10); txt(c, Math.round(dec * 1000) + ' ms', Rg.x0, g.y1 + 10); }
  }
  function heroPerc(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), pitch = P(d, host, 'pitch'), drop = P(d, host, 'drop'), dec = P(d, host, 'decay'), noise = P(d, host, 'noise');
    var T = Math.max(dec * 1.3, 0.1);
    function X(t) { return g.x0 + t / T * g.w; } function Y(f) { return g.y1 - lx(f, 60, 2200) * g.h; }
    var amp = sample(70, function (u) { var t = u * T; return [X(t), g.y1 - Math.exp(-t / dec * DB1000) * g.h * 0.4]; });
    area(c, amp, g.y1, p.ink, 0.18); path(c, amp, p.dim, 1);
    path(c, sample(70, function (u) { var t = u * T; return [X(t), Y(t < 0.04 ? pitch * Math.pow(drop, t / 0.04) : pitch * drop)]; }), p.ink, 2);
    if (noise > 0) line(c, g.x0 + 1, g.y1, g.x0 + 1, g.y1 - noise * g.h * 0.7, p.fg, 2);
    if (!g.small) { txt(c, Math.round(pitch) + ' Hz', g.x0 + 5, Y(pitch) - 3); txt(c, 'drop x' + (Math.round(drop * 100) / 100), g.x1, g.y1 + 10, 'right'); }
  }
  function heroLead(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), L = region(g, 0, 0.42), Rg = region(g, 0.5, 1), glide = P(d, host, 'glide');
    var T = 0.4, a = 1, b = 1.5;
    function Y(f) { return L.y1 - (LN(f) - LN(0.8)) / (LN(1.8) - LN(0.8)) * L.h; }
    line(c, L.x0, Y(a), L.x1, Y(a), p.line, 1); line(c, L.x0, Y(b), L.x1, Y(b), p.line, 1);
    path(c, sample(70, function (u) { var t = u * T, f = t < 0.1 ? a : (glide > 0 ? (t - 0.1 >= glide ? b : a * Math.pow(b / a, (t - 0.1) / glide)) : b); return [L.x0 + u * L.w, Y(f)]; }), p.ink, 2);
    var ax = L.x0 + L.w * (0.1 / T + glide / T * 0.5); dot(c, ax, Y(a), 2.5, p.ink); dot(c, L.x0 + L.w * clamp((0.1 + glide) / T, 0, 1), Y(b), 2.5, p.ink);
    filterPlot(c, Rg, d, host, true);
    if (!g.small) txt(c, 'glide ' + Math.round(glide * 1000) + ' ms', L.x0, g.y1 + 10);
  }
  function heroPad(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), att = P(d, host, 'attack'), rel = P(d, host, 'release'), lfo = P(d, host, 'lfo'), depth = P(d, host, 'depth'), HOLD = 1.5;
    var T = att + HOLD + rel;
    var e = sample(120, function (u) { var t = u * T, v = t < att ? t / att : (t < att + HOLD ? 1 : Math.max(0, 1 - (t - att - HOLD) / rel)); return [g.x0 + u * g.w, g.y1 - v * g.h * 0.8]; });
    area(c, e, g.y1, p.ink, 0.2); path(c, e, p.ink, 2);
    if (lfo > 0 && depth > 0) path(c, sample(160, function (u) { return [g.x0 + u * g.w, g.y0 + g.h * 0.12 - Math.sin(u * T * lfo * TAU) * (depth / 50) * g.h * 0.12]; }), p.dim, 1);
    if (!g.small) { txt(c, 'attack ' + (Math.round(att * 100) / 100) + ' s', g.x0 + 2, g.y1 + 10); txt(c, 'release ' + (Math.round(rel * 100) / 100) + ' s', g.x1, g.y1 + 10, 'right'); }
  }
  function heroRiser(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), from = P(d, host, 'from'), to = P(d, host, 'to'), q = P(d, host, 'q'), tone = P(d, host, 'tone');
    function X(u) { return g.x0 + u * g.w; } function Y(f) { return g.y1 - lx(f, 40, 20000) * g.h; }
    if (tone > 0) { c.globalAlpha = 0.25 + 0.6 * tone; path(c, sample(40, function (u) { return [X(u), Y(55 * Math.pow(2, u))]; }), p.dim, 1.5, false); c.globalAlpha = 1; }
    var bw = 0.5 / Math.max(q, 0.2), up = sample(60, function (u) { return [X(u), Y(from * Math.pow(to / from, u) * Math.pow(2, bw))]; }), dn = sample(60, function (u) { return [X(u), Y(from * Math.pow(to / from, u) * Math.pow(2, -bw))]; });
    var ribbon = up.concat(dn.slice().reverse());
    c.beginPath(); c.moveTo(ribbon[0][0], ribbon[0][1]); for (var i = 1; i < ribbon.length; i++) c.lineTo(ribbon[i][0], ribbon[i][1]); c.closePath();
    c.globalAlpha = 0.2; c.fillStyle = p.ink; c.fill(); c.globalAlpha = 1;
    path(c, sample(60, function (u) { return [X(u), Y(from * Math.pow(to / from, u))]; }), p.ink, 2);
    if (!g.small) { txt(c, fhz(from), g.x0 + 2, Y(from) + 10); txt(c, fhz(to), g.x1 - 2, Y(to) - 3, 'right'); txt(c, '4 s', g.x1, g.y1 + 10, 'right'); }
  }
  function heroImpact(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), tune = P(d, host, 'tune'), dec = P(d, host, 'decay'), wash = P(d, host, 'wash');
    var T = Math.max(dec * 1.1, 0.3);
    function X(t) { return g.x0 + t / T * g.w; } function Y(f) { return g.y1 - lx(f, 18, 110) * g.h; }
    if (wash > 0) { var cl = sample(60, function (u) { var t = u * 0.6; return [X(t), g.y1 - Math.exp(-t / 0.6 * 4) * wash * g.h * 0.5]; }); area(c, cl, g.y1, p.dim, 0.45); }
    var amp = sample(70, function (u) { var t = u * T; return [X(t), g.y1 - Math.exp(-t / dec * DB1000) * g.h * 0.4]; });
    area(c, amp, g.y1, p.ink, 0.18); path(c, amp, p.dim, 1);
    path(c, sample(70, function (u) { var t = u * T; return [X(t), Y(t < 0.12 ? 95 * Math.pow(tune / 95, t / 0.12) : tune)]; }), p.ink, 2);
    if (!g.small) { txt(c, 'tune ' + Math.round(tune) + ' Hz', g.x1, Y(tune) - 3, 'right'); txt(c, (Math.round(dec * 100) / 100) + ' s', g.x1, g.y1 + 10, 'right'); }
  }

  // ------------------------------------------------------------------ processors: heroes
  function heroFilter(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), mode = P(d, host, 'mode') || 'lowpass', cut = P(d, host, 'cutoff'), q = P(d, host, 'q'), gain = P(d, host, 'gain'), lo = -36, hi = 30;
    var gdb = (mode === 'peaking' || mode === 'lowshelf' || mode === 'highshelf') ? gain : 0;
    freqGrid(c, g, lo, hi, 0);
    var pts = freqPts(g, lo, hi, function (f) { return resp(mode, cut, q, gdb, f); });
    var zeroY = g.y1 - (0 - lo) / (hi - lo) * g.h;
    area(c, pts, zeroY, p.ink, 0.15); path(c, pts, p.ink, 2);
    var cx = g.x0 + lx(cut, 20, 20000) * g.w;
    line(c, cx, g.y0, cx, g.y1, p.dim, 1, true);
    dot(c, cx, clamp(g.y1 - (clamp(resp(mode, cut, q, gdb, cut), lo, hi) - lo) / (hi - lo) * g.h, g.y0, g.y1), 3.5, p.ink);
    if (!g.small) txt(c, mode + ' ' + fhz(cut) + ' Hz', g.x0 + 3, g.y0 + 9);
  }
  function heroSat(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), drive = P(d, host, 'drive'), mix = P(d, host, 'mix'), tone = P(d, host, 'tone'), trim = P(d, host, 'trim');
    var side = Math.min(g.h, g.w), sq = { x0: g.x0 + 2, y0: g.y0, w: side, h: side }, k = 1 + drive * 40, tk = Math.tanh(k);
    function X(v) { return sq.x0 + (v + 1) / 2 * sq.w; } function Y(v) { return sq.y0 + sq.h - (clamp(v, -1, 1) + 1) / 2 * sq.h; }
    c.strokeStyle = p.line; c.lineWidth = 1; dash(c, false); c.strokeRect(sq.x0 + 0.5, sq.y0 + 0.5, sq.w, sq.h);
    line(c, X(-1), Y(0), X(1), Y(0), p.line, 1); line(c, X(0), Y(-1), X(0), Y(1), p.line, 1);
    line(c, X(-1), Y(-1), X(1), Y(1), p.dim, 1, true);
    path(c, sample(80, function (u) { var x = u * 2 - 1; return [X(x), Y(((Math.tanh(x * k) / tk) * mix + x * (1 - mix)) * trim)]; }), p.ink, 2);
    var cx = sq.x0 + sq.w + 14, cw = Math.max(20, g.x1 - cx);
    if (cw > 24 && !g.small) {
      var lg = { x0: cx, y0: g.y0 + 2, w: cw, h: Math.min(g.h * 0.5, 40), y1: g.y0 + 2 + Math.min(g.h * 0.5, 40), small: true };
      var pts = sample(50, function (u) { var f = 500 * Math.pow(40, u), db = clamp(resp('lowpass', tone, 0, 0, f), -30, 3); return [lg.x0 + u * lg.w, lg.y1 - (db + 30) / 33 * lg.h]; });
      path(c, pts, p.dim, 1.5); txt(c, 'tone ' + fhz(tone), lg.x0, lg.y1 + 10);
      txt(c, 'drive ' + Math.round(drive * 100) + '%  mix ' + Math.round(mix * 100) + '%', cx, g.y1 - 2);
    }
  }
  function effTime(d, host) {
    var div = P(d, host, 'division'), bpm = P(d, host, 'bpm'), t = P(d, host, 'time'), Pr = root.Processors;
    if (div && Pr && Pr.divSeconds) { var s = Pr.divSeconds(div, bpm); if (s != null) t = clamp(s, 0.01, 2); }
    return t;
  }
  function heroDelay(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), t = effTime(d, host), fb = P(d, host, 'feedback'), mix = P(d, host, 'mix'), pp = !!P(d, host, 'pingpong'), tone = P(d, host, 'tone'), hp = P(d, host, 'hp');
    var T = 4, mid = pp ? g.y0 + g.h / 2 : g.y1, half = pp ? g.h / 2 : g.h, n, x, last = -9;
    line(c, g.x0, mid, g.x1, mid, p.line, 1);
    line(c, g.x0 + 1, mid, g.x0 + 1, mid - half * 0.95, p.dim, 3);
    for (n = 1; n * t < T; n++) {
      x = g.x0 + n * t / T * g.w;
      if (x - last < 2) break; last = x;
      var amp = mix * Math.pow(fb, n - 1) * 0.95 * half, dir = pp ? (n % 2 ? -1 : 1) : -1;
      line(c, x, mid, x, mid + dir * amp, p.ink, 3);
    }
    if (!g.small) {
      var fx = g.x1 - 58, fy = g.y0 + 2;
      var pts = sample(40, function (u) { var f = 20 * Math.pow(1000, u), db = clamp(resp('highpass', hp, 0, 0, f) + resp('lowpass', tone, 0, 0, f), -30, 3); return [fx + u * 54, fy + 24 - (db + 30) / 33 * 24]; });
      path(c, pts, p.dim, 1);
      txt(c, (Math.round(t * 1000)) + ' ms' + (pp ? '  ping-pong' : ''), g.x0 + 3, g.y1 + 10); txt(c, 'fb ' + Math.round(fb * 100) + '%', g.x1 - 60, g.y1 + 10, 'left');
    }
  }
  function heroReverb(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), size = P(d, host, 'size'), dec = P(d, host, 'decay'), damp = P(d, host, 'damp'), pre = P(d, host, 'predelay'), mix = P(d, host, 'mix');
    var T = Math.max(1, size * 1.2), k = 2.5 + 6 * (1 - dec), hf = 1 + 3 * (1 - lx(damp, 500, 20000));
    function X(t) { return g.x0 + t / T * g.w; }
    function lvl(t, m) { var u = (t - pre) / size; if (u < 0) return 0; if (u >= 1) return 0; var db = Math.max(-60, 20 * Math.log10(Math.max(Math.pow(1 - u, k * m), 1e-4))); return (db + 60) / 60; }
    var main = sample(100, function (u) { var t = u * T; return [X(t), g.y1 - lvl(t, 1) * g.h * 0.92]; });
    var hi = sample(100, function (u) { var t = u * T; return [X(t), g.y1 - lvl(t, hf) * g.h * 0.92]; });
    area(c, main, g.y1, p.ink, 0.18); path(c, main, p.ink, 2); path(c, hi, p.dim, 1, true);
    var px = X(pre); line(c, px, g.y0, px, g.y1, p.dim, 1, true);
    c.globalAlpha = 0.12 + mix * 0.5; c.fillStyle = p.fg; c.fillRect(g.x1 - 6, g.y1 - mix * g.h, 4, mix * g.h); c.globalAlpha = 1;
    if (!g.small) { txt(c, (Math.round(size * 10) / 10) + ' s', g.x1 - 10, g.y0 + 9, 'right'); txt(c, 'pre ' + Math.round(pre * 1000) + ' ms  damp ' + fhz(damp), g.x0 + 2, g.y1 + 10); }
  }
  function heroEq(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), lo = -26, hi = 26, lg = P(d, host, 'low'), lf = P(d, host, 'lowFreq'), mg = P(d, host, 'mid'), mf = P(d, host, 'midFreq'), mq = P(d, host, 'midQ'), hg = P(d, host, 'high'), hf = P(d, host, 'highFreq');
    freqGrid(c, g, lo, hi, 0);
    var pts = freqPts(g, lo, hi, function (f) { return resp('lowshelf', lf, 0.707, lg, f) + resp('peaking', mf, mq, mg, f) + resp('highshelf', hf, 0.707, hg, f); }, 90);
    var zeroY = g.y1 - (0 - lo) / (hi - lo) * g.h;
    area(c, pts, zeroY, p.ink, 0.15); path(c, pts, p.ink, 2);
    var nodes = [[lf, lg], [mf, mg], [hf, hg]], i;
    for (i = 0; i < 3; i++) dot(c, g.x0 + lx(nodes[i][0], 20, 20000) * g.w, g.y1 - (clamp(nodes[i][1], lo, hi) - lo) / (hi - lo) * g.h, 4, p.ink, i === 1 ? false : false);
    if (!g.small) txt(c, '+/-24 dB', g.x1 - 2, g.y0 + 9, 'right');
  }
  function meterOf(d, host) { return safe(function () { return host.meter(d.id); }, null) || {}; }
  function safe(fn, dflt) { try { var v = fn(); return v === undefined ? dflt : v; } catch (e) { return dflt; } }
  function grBar(c, x, y0, y1, gr, color, w) {
    var bw = w || 8, lim = 20, v = clamp(-(gr || 0), 0, lim);
    c.strokeStyle = pal().line; c.lineWidth = 1; dash(c, false); c.strokeRect(x + 0.5, y0 + 0.5, bw, y1 - y0);
    c.fillStyle = color; c.fillRect(x + 1, y0 + 1, bw - 1, (y1 - y0 - 1) * v / lim);
  }
  function compOut(x, T, R, K) {
    if (K <= 0) return x <= T ? x : T + (x - T) / R;
    if (2 * (x - T) < -K) return x;
    if (2 * (x - T) > K) return T + (x - T) / R;
    var t = x - T + K / 2; return x + (1 / R - 1) * t * t / (2 * K);
  }
  function dynPlot(c, w, hh, d, host, kind) {
    var p = pal(), g = plot(w, hh, hh < 64), lo = kind === 'lim' ? -36 : -60, side = Math.min(g.h, g.w), sq = { x0: g.x0 + 2, y0: g.y0, w: side, h: side };
    var T = P(d, host, 'threshold'), R = kind === 'lim' ? 20 : P(d, host, 'ratio'), K = kind === 'lim' ? 1 : P(d, host, 'knee'), mk = kind === 'lim' ? P(d, host, 'ceiling') : P(d, host, 'makeup');
    function X(db) { return sq.x0 + (clamp(db, lo, 0) - lo) / -lo * sq.w; } function Y(db) { return sq.y0 + sq.h - (clamp(db, lo, 0) - lo) / -lo * sq.h; }
    c.strokeStyle = p.line; c.lineWidth = 1; dash(c, false); c.strokeRect(sq.x0 + 0.5, sq.y0 + 0.5, sq.w, sq.h);
    line(c, X(lo), Y(lo), X(0), Y(0), p.dim, 1, true);
    line(c, X(T), sq.y0 + sq.h, X(T), sq.y0, p.line, 1);
    if (kind === 'lim') line(c, sq.x0, Y(mk), sq.x0 + sq.w, Y(mk), p.dim, 1, true);
    var pts = sample(80, function (u) { var x = lo + u * -lo; return [X(x), Y(compOut(x, T, R, K) + mk)]; });
    path(c, pts, p.ink, 2);
    var m = meterOf(d, host), gr = (typeof m.reduction === 'number') ? m.reduction : null;
    if (typeof m.level === 'number' && m.level > 0.001 && gr !== null) {
      var out = 20 * Math.log10(m.level);
      dot(c, X(out - gr - mk), Y(out), 3.5, p.on);
    }
    var bx = sq.x0 + sq.w + 10;
    grBar(c, bx, sq.y0, sq.y0 + sq.h, gr, p.ink, 8);
    if (!g.small) {
      txt(c, 'GR', bx + 4, sq.y0 + sq.h + 10, 'center');
      var tx = bx + 22;
      if (g.x1 - tx > 50) {
        txt(c, kind === 'lim' ? 'threshold ' + Math.round(T * 10) / 10 + ' dB' : 'T ' + Math.round(T * 10) / 10 + ' dB   R ' + (Math.round(R * 10) / 10) + ':1', tx, sq.y0 + 10);
        txt(c, kind === 'lim' ? 'ceiling ' + Math.round(mk * 10) / 10 + ' dB' : 'knee ' + Math.round(K) + ' dB   makeup ' + Math.round(mk * 10) / 10 + ' dB', tx, sq.y0 + 22);
        if (gr !== null) txt(c, 'GR ' + (Math.round(gr * 10) / 10) + ' dB', tx, sq.y0 + 34, 'left', p.fg);
      }
    }
    if (kind === 'lim' && !g.small) {
      var ly = sq.y0 + sq.h - 4, lx0 = bx + 22, lw = g.x1 - lx0;
      if (lw > 40 && typeof m.level === 'number') {
        var ldb = m.level > 0.0001 ? 20 * Math.log10(m.level) : -60;
        c.strokeStyle = p.line; c.lineWidth = 1; c.strokeRect(lx0 + 0.5, ly - 6.5, lw, 7);
        c.fillStyle = p.ink; c.fillRect(lx0 + 1, ly - 6, Math.max(0, (clamp(ldb, -36, 0) + 36) / 36 * (lw - 1)), 6);
        line(c, lx0 + (clamp(mk, -36, 0) + 36) / 36 * lw, ly - 10, lx0 + (clamp(mk, -36, 0) + 36) / 36 * lw, ly + 2, p.fg, 1);
      }
    }
  }
  function heroComp(c, w, hh, d, host) { dynPlot(c, w, hh, d, host, 'comp'); }
  function heroLimiter(c, w, hh, d, host) { dynPlot(c, w, hh, d, host, 'lim'); }
  function heroDuck(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), depth = P(d, host, 'depth'), att = P(d, host, 'attack'), hold = P(d, host, 'hold'), rel = P(d, host, 'release');
    var len = att + hold + rel, T = len * 1.5, t0 = len * 0.15, barW = 10;
    var gw = g.w - barW - 6;
    function X(t) { return g.x0 + t / T * gw; } function Y(v) { return g.y1 - v * g.h * 0.9 - g.h * 0.05; }
    var lo = 1 - depth, db = P(d, host, 'curve') === 'db' && lo > 0;
    var pts = [[X(0), Y(1)], [X(t0), Y(1)], [X(t0 + att), Y(lo)], [X(t0 + att + hold), Y(lo)]];
    if (db) for (var ri = 1; ri < 24; ri++) pts.push([X(t0 + att + hold + rel * ri / 24), Y(lo * Math.pow(1 / lo, ri / 24))]);
    pts.push([X(t0 + len), Y(1)], [X(T), Y(1)]);
    line(c, g.x0, Y(1), g.x0 + gw, Y(1), p.line, 1, true);
    var fillPts = pts.slice(); area(c, fillPts, Y(1), p.ink, 0.2); path(c, pts, p.ink, 2);
    var live = safe(function () { return d.ref.node.gain.value; }, null);
    if (typeof live !== 'number') { var m = meterOf(d, host); live = (typeof m.reduction === 'number') ? Math.pow(10, m.reduction / 20) : null; }
    var bx = g.x1 - barW;
    c.strokeStyle = p.line; c.lineWidth = 1; dash(c, false); c.strokeRect(bx + 0.5, g.y0 + 0.5, barW, g.h);
    if (typeof live === 'number') { c.fillStyle = p.ink; c.fillRect(bx + 1, g.y1 - clamp(live, 0, 1) * g.h, barW - 1, clamp(live, 0, 1) * g.h); }
    if (!g.small) {
      txt(c, 'depth ' + Math.round(depth * 100) + '%', X(t0 + att + hold / 2), Y(1 - depth) + 11, 'center');
      txt(c, 'trigger: kick  release ' + (db ? 'in dB' : 'linear'), g.x0 + 2, g.y1 + 10); txt(c, Math.round(att * 1000) + ' / ' + Math.round(hold * 1000) + ' / ' + Math.round(rel * 1000) + ' ms', g.x0 + gw, g.y1 + 10, 'right');
    }
  }
  function heroWidener(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), width = P(d, host, 'width'), cx = g.x0 + g.w / 2, by = g.y1, R = Math.min(g.h * 0.95, g.w * 0.3);
    var th = Math.min(width, 3) / 3 * (Math.PI / 2) * 0.95, i;
    for (i = 1; i <= 2; i++) { c.beginPath(); c.arc(cx, by, R * i / 2, Math.PI * 1.08, Math.PI * 1.92); c.strokeStyle = p.line; c.lineWidth = 1; dash(c, false); c.stroke(); }
    var a0 = -Math.PI / 2 - th, a1 = -Math.PI / 2 + th;
    c.beginPath(); c.moveTo(cx, by); c.arc(cx, by, R, a0, a1); c.closePath(); c.globalAlpha = 0.2; c.fillStyle = p.ink; c.fill(); c.globalAlpha = 1;
    line(c, cx, by, cx, by - R, p.dim, 1.5);
    line(c, cx, by, cx + Math.cos(a0) * R, by + Math.sin(a0) * R, p.ink, 2); line(c, cx, by, cx + Math.cos(a1) * R, by + Math.sin(a1) * R, p.ink, 2);
    var m = meterOf(d, host);
    if (typeof m.correlation === 'number') {
      var cw = Math.min(g.w * 0.3, 120), bx = g.x1 - cw, y = g.y1 - 4;
      line(c, bx, y, bx + cw, y, p.line, 3); dot(c, bx + (m.correlation + 1) / 2 * cw, y, 3, p.on);
      if (!g.small) txt(c, 'corr', bx, y - 6);
    }
    var mb = P(d, host, 'monoBelow') || 0;
    if (!g.small) txt(c, (width === 0 ? 'mono' : 'width ' + (Math.round(width * 100) / 100)) + (mb > 0 ? '  mono below ' + Math.round(mb) + ' Hz' : ''), cx, g.y1 + 10, 'center');
  }
  function heroChorus(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), rate = P(d, host, 'rate'), depth = P(d, host, 'depth') * 1000, mix = P(d, host, 'mix'), T = Math.min(2 / rate, 4);
    var base = P(d, host, 'base') || 14, inv = !!P(d, host, 'invert'), lo = Math.max(0, base - 8), hi = base * 1.5 + 8, bar = g.small ? 0 : 6, gh = g.h - bar;
    function Y(ms) { return g.y0 + gh - (ms - lo) / (hi - lo) * gh; }
    path(c, sample(100, function (u) { return [g.x0 + u * g.w, Y(base + depth * Math.sin(u * T * rate * TAU))]; }), p.ink, 2);
    path(c, sample(100, function (u) { return [g.x0 + u * g.w, Y(base * 1.5 - depth * Math.sin(u * T * rate * TAU))]; }), p.dim, 2, inv ? true : undefined);
    if (bar) { c.strokeStyle = p.line; c.lineWidth = 1; c.strokeRect(g.x0 + 0.5, g.y1 - 3.5, g.w, 5); c.fillStyle = p.ink; c.fillRect(g.x0 + 1, g.y1 - 3, g.w * mix, 4); }
    if (!g.small) txt(c, (Math.round(rate * 100) / 100) + ' Hz   depth ' + (Math.round(depth * 10) / 10) + ' ms   base ' + (Math.round(base * 10) / 10) + ' ms   mix ' + Math.round(mix * 100) + '%' + (inv ? '   inverted' : ''), g.x0 + 2, g.y1 + 10);
  }
  function heroChannel(c, w, hh, d, host) {
    var p = pal(), g = plot(w, hh, hh < 64), gain = P(d, host, 'gain'), pan = P(d, host, 'pan'), mute = !!P(d, host, 'mute'), m = meterOf(d, host);
    var lvl = typeof m.level === 'number' ? clamp(m.level, 0, 1) : 0, ldb = lvl > 0.0006 ? 20 * Math.log10(lvl) : -60;
    var mh = Math.max(6, g.h * 0.32), y = g.y0 + 2;
    c.strokeStyle = p.line; c.lineWidth = 1; dash(c, false); c.strokeRect(g.x0 + 0.5, y + 0.5, g.w, mh);
    c.fillStyle = mute ? p.dim : p.ink; c.fillRect(g.x0 + 1, y + 1, (clamp(ldb, -60, 0) + 60) / 60 * (g.w - 1), mh - 1);
    var gx = g.x0 + clamp(gain / 2, 0, 1) * g.w, gy = y + mh + 6 + (g.small ? 0 : 2);
    line(c, g.x0, gy, g.x1, gy, p.line, 2); line(c, g.x0 + g.w / 2, gy - 4, g.x0 + g.w / 2, gy + 4, p.dim, 1); dot(c, gx, gy, 3.5, p.ink);
    var py = gy + (g.small ? 9 : 14);
    line(c, g.x0, py, g.x1, py, p.line, 2); line(c, g.x0 + g.w / 2, py - 4, g.x0 + g.w / 2, py + 4, p.dim, 1); dot(c, g.x0 + (pan + 1) / 2 * g.w, py, 3.5, p.fg);
    if (!g.small) { txt(c, 'gain ' + (Math.round(gain * 100) / 100) + (mute ? '  muted' : ''), g.x0, g.y1 + 10); txt(c, 'pan ' + (Math.round(pan * 100) / 100), g.x1, g.y1 + 10, 'right'); }
  }

  // ------------------------------------------------------------------ definitions
  function W(s, f, w) { return { strip: s, face: f, window: w }; }
  function sec(title, params, widget) { var o = { title: title, params: params }; if (widget) o.widget = widget; return o; }
  var OUT = sec('out', ['level']);

  var G = {   // glyphs, 16x16, stroke currentColor
    kick: '<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3"/>', clap: '<path d="M3 5l1 3M8 3v5M13 5l-1 3M4 13h8"/>',
    hat_closed: '<path d="M3 12h10M8 6v6"/>', hat_open: '<path d="M3 13h10M8 3v10"/>',
    shaker: '<path d="M1 8q2-5 4 0t4 0t4 0"/>', perc: '<path d="M8 2l6 6-6 6-6-6z"/>',
    sub: '<path d="M1 8q3.5-8 7 0t7 0"/>', bass: '<path d="M2 12L7 4v8l6-8v8"/>',
    stab: '<path d="M3 4h10M3 8h7M3 12h10"/>', lead: '<path d="M2 13L7 8l2 2 5-7"/>', pad: '<path d="M1 13Q8-4 15 13"/>',
    riser: '<path d="M2 13L14 3M9 3h5v5"/>', impact: '<path d="M8 1v14M1 8h14M3 3l10 10M13 3L3 13"/>',
    compressor: '<path d="M3 13a7 7 0 0 1 10 0M8 12L11 6"/>', limiter: '<path d="M2 4h12M4 13V8h3v5M9 13V6h3v7"/>',
    sidechain: '<path d="M1 4h4l2 8h2l2-8h4"/>', delay: '<path d="M3 13V3M7 13V5M10.5 13V8M13.5 13v-2.5"/>',
    reverb: '<path d="M2 3v10M2 5Q6 5 14 13"/>', chorus: '<path d="M1 8c2-6 4-6 5 0s3 6 5 0 3-3 4 0"/>',
    filter: '<path d="M1 6h8Q12 6 15 14"/>', eq3: '<path d="M1 10Q4 4 8 9T15 6"/><circle cx="3" cy="8" r="1"/><circle cx="8" cy="9" r="1"/><circle cx="13" cy="7" r="1"/>',
    saturator: '<path d="M2 13C7 13 5 3 14 3"/>', widener: '<path d="M3 3Q-1 8 3 13M13 3Q17 8 13 13M8 4v8"/>',
    channel: '<path d="M5 2v12M11 2v12M3 6h4M9 10h4"/>'
  };

  Faces.define('kick', { glyph: G.kick, hero: heroKick, width: W(176, 440, 560),
    sections: [sec('pitch', ['punch', 'tune', 'sweep', 'tau']), sec('body', ['hold', 'decay']), sec('click', ['click']), sec('drive', ['drive']), OUT],
    strip: ['punch', 'tune', 'decay', 'drive'] });
  Faces.define('sub', { glyph: G.sub, hero: heroSub, width: W(176, 320, 440),
    options: { mode: ['pluck', 'drone'] },
    sections: [sec('osc', ['mode', 'harmonic', 'glide']), sec('amp', ['attack', 'decay', 'release']), OUT], strip: ['mode', 'decay', 'harmonic', 'level'] });
  Faces.define('bass', { glyph: G.bass, hero: heroBass, width: W(176, 560, 640),
    sections: [sec('osc', ['wave', 'detune', 'sub', 'glide']), sec('filter', ['cutoff', 'res', 'env', 'decay']), sec('amp', ['attack', 'release']), sec('drive', ['drive']), OUT],
    strip: ['cutoff', 'res', 'env', 'drive'] });
  Faces.define('stab', { glyph: G.stab, hero: heroStab, width: W(176, 540, 620),
    sections: [sec('voice', ['spread', 'detune']), sec('filter', ['cutoff', 'res', 'env', 'decay']), sec('hp', ['hp']), sec('amp', ['attack', 'release']), sec('drive', ['drive']), OUT],
    strip: ['cutoff', 'res', 'spread', 'drive'] });
  Faces.define('clap', { glyph: G.clap, hero: heroClap, width: W(176, 400, 520),
    sections: [sec('burst', ['flams', 'flam', 'decay']), sec('tone', ['tone', 'q']), sec('tail', ['tail', 'tailDecay']), OUT], strip: ['tone', 'decay', 'tail'] });
  var HAT = function (glyph) { return { glyph: glyph, hero: heroHat, width: W(176, 360, 480),
    sections: [sec('env', ['decay']), sec('tone', ['tone']), sec('ring', ['ring', 'metal', 'metalHp']), OUT], strip: ['decay', 'tone', 'metal'] }; };
  Faces.define('hat_closed', HAT(G.hat_closed));
  Faces.define('hat_open', HAT(G.hat_open));
  Faces.define('shaker', { glyph: G.shaker, hero: heroShaker, width: W(176, 340, 460),
    sections: [sec('band', ['tone', 'q']), sec('env', ['attack', 'decay']), OUT], strip: ['tone', 'q', 'decay'] });
  Faces.define('perc', { glyph: G.perc, hero: heroPerc, width: W(176, 340, 460),
    sections: [sec('pitch', ['pitch', 'drop']), sec('body', ['decay']), sec('noise', ['noise']), OUT], strip: ['pitch', 'drop', 'decay'] });
  Faces.define('lead', { glyph: G.lead, hero: heroLead, width: W(176, 560, 640),
    sections: [sec('osc', ['wave', 'detune', 'sub', 'glide']), sec('filter', ['cutoff', 'res', 'env', 'decay']), sec('amp', ['attack', 'release']), sec('drive', ['drive']), OUT],
    strip: ['cutoff', 'res', 'glide', 'drive'] });
  Faces.define('pad', { glyph: G.pad, hero: heroPad, width: W(176, 440, 560),
    sections: [sec('amp', ['attack', 'release']), sec('osc', ['detune']), sec('lfo', ['lfo', 'depth']), sec('filter', ['cutoff']), OUT], strip: ['attack', 'release', 'cutoff'] });
  Faces.define('riser', { glyph: G.riser, hero: heroRiser, width: W(176, 360, 480),
    sections: [sec('sweep', ['from', 'to']), sec('band', ['q']), sec('drone', ['tone']), OUT], strip: ['from', 'to', 'q'] });
  Faces.define('impact', { glyph: G.impact, hero: heroImpact, width: W(176, 340, 460),
    sections: [sec('boom', ['tune', 'decay']), sec('wash', ['wash']), OUT], strip: ['tune', 'decay', 'wash'] });

  Faces.define('filter', { glyph: G.filter, hero: heroFilter, width: W(176, 340, 480), heroH: { strip: 40, face: 84, window: 190 },
    sections: [sec('type', ['mode']), sec('response', ['cutoff', 'q', 'gain'])], strip: ['mode', 'cutoff', 'q'] });
  Faces.define('saturator', { glyph: G.saturator, hero: heroSat, width: W(176, 340, 460), heroH: { strip: 40, face: 90, window: 190 },
    sections: [sec('drive', ['drive', 'tone']), sec('blend', ['mix', 'trim'])], strip: ['drive', 'mix', 'tone'] });
  Faces.define('delay', { glyph: G.delay, hero: heroDelay, width: W(176, 460, 600),
    sections: [sec('time', ['division', 'time', 'bpm']), sec('feedback', ['feedback', 'pingpong', 'loop']), sec('tone', ['tone', 'hp']), sec('mod', ['modRate', 'modDepth']), sec('mix', ['mix'])], strip: ['time', 'feedback', 'mix'] });
  Faces.define('reverb', { glyph: G.reverb, hero: heroReverb, width: W(176, 420, 560),
    sections: [sec('space', ['algo', 'size', 'decay', 'predelay', 'seed']), sec('tone', ['damp', 'hp']), sec('mix', ['mix'])], strip: ['size', 'decay', 'mix'] });
  Faces.define('eq3', { glyph: G.eq3, hero: heroEq, width: W(176, 460, 640), heroH: { strip: 40, face: 96, window: 200 },
    sections: [sec('low', ['low', 'lowFreq']), sec('mid', ['mid', 'midFreq', 'midQ']), sec('high', ['high', 'highFreq'])], strip: ['low', 'mid', 'high'] });
  Faces.define('compressor', { glyph: G.compressor, hero: heroComp, live: true, width: W(176, 420, 520), heroH: { strip: 44, face: 100, window: 200 },
    sections: [sec('threshold', ['threshold', 'ratio', 'knee']), sec('timing', ['attack', 'release']), sec('out', ['makeup'])], strip: ['threshold', 'ratio', 'makeup'] });
  Faces.define('limiter', { glyph: G.limiter, hero: heroLimiter, live: true, width: W(176, 360, 480), heroH: { strip: 44, face: 100, window: 200 },
    sections: [sec('level', ['threshold', 'ceiling']), sec('timing', ['release'])], strip: ['threshold', 'ceiling', 'release'] });
  Faces.define('sidechain', { glyph: G.sidechain, hero: heroDuck, live: true, width: W(176, 360, 480),
    sections: [sec('duck', ['depth']), sec('envelope', ['attack', 'hold', 'release', 'curve'])], strip: ['depth', 'release'] });
  Faces.define('widener', { glyph: G.widener, hero: heroWidener, live: true, width: W(176, 260, 360),
    sections: [sec('width', ['width', 'monoBelow'])], strip: ['width'] });
  Faces.define('chorus', { glyph: G.chorus, hero: heroChorus, width: W(176, 340, 460),
    sections: [sec('modulation', ['rate', 'depth']), sec('voices', ['base', 'invert']), sec('mix', ['mix'])], strip: ['rate', 'depth', 'mix'] });
  Faces.define('channel', { glyph: G.channel, hero: heroChannel, live: true, width: W(176, 280, 400), heroH: { strip: 44, face: 70, window: 110 },
    labels: { gain: 'level' }, sections: [sec('level', ['gain']), sec('pan', ['pan']), sec('mute', ['mute']), { title: 'sends', match: '^send\\.' }], strip: ['gain', 'pan', 'mute'] });
})();
