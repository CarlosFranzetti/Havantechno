/* HVT-303 solo page: one tb303 through the real Host, Sequencer, Classics engine and the real HVT-303 panel (ui/panels.js).
 * The song is one looping one-bar section 'loop' with the 303 (six stored patterns as variants A..F, a saturator insert
 * named 'drive', bypassed at 0) and a four-on-the-floor bd909, muted by default. Nothing here is engine or panel code. */
(function () {
  'use strict';
  var root = window, doc = document;
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  // Six original acid-style lines (written for this page): note name + octave, '!' accent, '~' slide into the next, '.' rest.
  var PATTERNS = [
    ['Pump',    'A1 . A1 A2! . A1 G1~ A1 A1 . C2 A1 . A2! E2~ D2'],
    ['Squelch', 'A1~ A1 A1! . C2~ D2 . A1 A1 A2! G2~ E2 . A1 C2! .'],
    ['Climb',   'E1 E1 E2! E1 G1 E1 A1~ B1 E1 . E2! D2~ B1 G1 A1! .'],
    ['Hop',     'C2 C3! C2 . C2~ C3 . A#1 C2 C3! . G2~ F2 D#2 C2 .'],
    ['Space',   'A1! . . A1 . . D2~ C2 . A1! . . G1~ A1 . .'],
    ['Run',     'D2 D2 F2 D2! A2~ D2 C3! D2 D2 F2 D2 A#1~ C2 D2! F2 E2~']
  ];
  var NAMES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function parse(line) {
    return line.trim().split(/\s+/).map(function (t) {
      if (t === '.') return null;
      var m = /^([A-G]#?)(-?\d)([!~]*)$/.exec(t);
      if (!m) return null;
      var c = { note: (parseInt(m[2], 10) + 1) * 12 + NAMES[m[1]], vel: 0.85, len: 1 };
      if (m[3].indexOf('!') >= 0) c.acc = true;
      if (m[3].indexOf('~') >= 0) c.slide = true;
      return c;
    });
  }
  function song() {
    var variants = {};
    PATTERNS.forEach(function (p, i) { variants[LETTERS[i]] = { bars: 1, cells: parse(p[1]) }; });
    return {
      v: 1, name: 'HVT-303', bpm: 126, swing: 0, key: 'A', progression: [], sends: {},
      tracks: [
        { name: 'tb303', type: 'tb303', inst: 'tb303', kind: 'melody', family: 'bass', gain: 0.9, params: {},
          chain: [{ type: 'saturator', name: 'drive', drive: 0.35, mix: 1, tone: 12000, trim: 0.8, bypass: true }], variants: variants },
        { name: 'bd909', type: 'bd909', inst: 'bd909', kind: 'drum', family: 'drums', gain: 0.75, variants: { A: 'x...x...x...x...' } }
      ],
      sections: [{ name: 'loop', bars: 1, play: { tb303: 'A', bd909: 'A' } }]
    };
  }

  var host = null, panel = null, layout = null, started = false, raf = 0;
  var el = function (id) { return doc.getElementById(id); };
  var S = { status: el('so-status'), play: el('so-play'), pats: el('so-patterns'), bpm: el('so-bpm'), drum: el('so-drum'), drive: el('so-drive'), box: el('so-panel'), gate: el('so-gate'), note: el('so-gate-note') };
  function status(t, kind) { S.status.textContent = t; S.status.setAttribute('data-kind', kind || ''); }

  try { host = root.Host.create({ doc: song() }); } catch (e) { status('The engine could not load: ' + (e && e.message ? e.message : e), 'fallback'); return; }
  root.HVT303 = { host: function () { return host; }, panel: function () { return panel; }, patterns: PATTERNS };
  try { host.mute('bd909', true); } catch (e) { /* ignore */ }

  // ---- panel: the real HVT-303, arranged for the screen (portrait under 720 px wide), fitted to the width
  function wantLayout() { return (root.innerWidth || 1024) < 720 ? 'portrait' : 'landscape'; }
  function mount() {
    var lay = wantLayout();
    if (panel && lay === layout) { fit(); return; }
    if (panel) { try { panel.dispose(); } catch (e) { /* ignore */ } panel = null; }
    layout = lay;
    var dev = host.device('track:tb303');
    panel = root.Panels.render(dev, host, { layout: lay });
    S.box.textContent = '';
    S.box.appendChild(panel.el);
    fit();
  }
  function fit() {
    if (!panel) return;
    var def = root.Panels.get('hvt303'), sz = def.layouts[layout];
    var w = Math.max(200, S.box.clientWidth - (layout === 'portrait' ? 8 : 16));
    var h = Math.round(w * sz.h / sz.w);
    if (layout === 'landscape') {                    // the desk: fit the width and the height left under the bar
      var top = S.box.getBoundingClientRect().top + (root.scrollY || 0), room = Math.max(320, (root.innerHeight || 800) - top - 40);
      if (h > room) { h = room; w = Math.round(h * sz.w / sz.h); }
    }
    panel.el.style.width = w + 'px'; panel.el.style.height = h + 'px';
    panel.resize(w, h);
    panel.el.style.width = w + 'px'; panel.el.style.height = h + 'px';
  }
  var rzT = 0;
  root.addEventListener('resize', function () { if (rzT) clearTimeout(rzT); rzT = setTimeout(function () { rzT = 0; mount(); }, 120); });

  // ---- bar: play, patterns, tempo, kick, drive
  function current() { var s = host.document().sections[0]; return (s.play && s.play.tb303) || 'A'; }
  var patBtns = PATTERNS.map(function (p, i) {
    var b = doc.createElement('button');
    b.type = 'button'; b.className = 'so-btn so-pat'; b.textContent = String(i + 1);
    b.setAttribute('role', 'radio'); b.setAttribute('aria-label', 'Pattern ' + (i + 1) + ': ' + p[0]); b.title = p[0];
    b.addEventListener('click', function () {
      var ed = host.editor();
      ed.setPlay('loop', 'tb303', LETTERS[i]);
      host.commit();
      paintBar();
    });
    S.pats.appendChild(b);
    return b;
  });
  function paintBar() {
    var cur = current(), playing = !!(host.transport && host.transport.playing);
    patBtns.forEach(function (b, i) { b.setAttribute('aria-checked', LETTERS[i] === cur ? 'true' : 'false'); });
    S.play.setAttribute('aria-pressed', playing ? 'true' : 'false');
    S.play.textContent = playing ? 'Stop' : 'Play';
    var muted = false;
    try { muted = !!host.getParam('bd909.mute'); } catch (e) { /* ignore */ }
    S.drum.setAttribute('aria-pressed', muted ? 'false' : 'true');
    S.drum.textContent = muted ? 'Kick off' : 'Kick on';
    var b = host.bpm();
    if (doc.activeElement !== S.bpm && String(Math.round(b)) !== S.bpm.value) S.bpm.value = String(Math.round(b));
  }
  S.play.addEventListener('click', function () {
    if (!started) return;
    if (host.transport.playing) host.transport.stop();
    else { host.transport.loop('loop'); host.transport.play(); }
    paintBar();
  });
  function setBpm(v) { v = Math.max(40, Math.min(300, Math.round(+v || 126))); host.setParam('bpm', v); paintBar(); }
  S.bpm.addEventListener('change', function () { setBpm(S.bpm.value); });
  el('so-slower').addEventListener('click', function () { setBpm(host.bpm() - 1); });
  el('so-faster').addEventListener('click', function () { setBpm(host.bpm() + 1); });
  S.drum.addEventListener('click', function () { var m = !!host.getParam('bd909.mute'); host.mute('bd909', !m); paintBar(); });
  S.drive.addEventListener('input', function () {
    var v = +S.drive.value;
    host.bypass('track:tb303:drive', v <= 0);
    if (v > 0) host.setParam('tb303.drive.drive', v);
  });

  // ---- start on a tap: AudioContext made and resumed inside the gesture (host.start), worklet module awaited there
  function engineKind() {
    try { var t = host.engine().tracks.tb303; return t && t.inst ? t.inst.engine : 'none'; } catch (e) { return 'none'; }
  }
  function start() {
    if (started) return;
    S.note.textContent = 'Starting…';
    host.start().then(function (ok) {
      if (!ok) { S.note.textContent = 'This browser could not start audio. Try another browser, or tap again.'; return; }
      started = true;
      S.gate.hidden = true;
      S.play.disabled = false;
      var kind = engineKind();
      if (kind === 'worklet') status('AudioWorklet engine', 'worklet');
      else status('Approximate fallback engine: the AudioWorklet did not load, so this is not the accurate 303 sound', 'fallback');
      root.HVT303.engine = kind;
      mount();
      host.transport.loop('loop');
      host.transport.play();
      paintBar();
    });
  }
  el('so-start').addEventListener('click', start);

  // ---- frame loop: the panel's update (cheap; it diffs) and the bar
  var lastBar = 0;
  function frame(ts) {
    raf = root.requestAnimationFrame(frame);
    if (panel) { try { panel.update(); } catch (e) { if (root.console) root.console.error(e); } }
    if (ts - lastBar > 250) { lastBar = ts; paintBar(); }
  }
  mount();
  paintBar();
  raf = root.requestAnimationFrame(frame);
})();
