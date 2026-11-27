/* HVT-808 and HVT-909 solo pages (808.html, 909.html; Showroom Crew W3): the whole kit as tracks through the real Host and
 * Drums engine and the real machine panel (ui/panels.js), booted by the shared framework (solo.js). <body data-machine="808">
 * picks the machine.
 *
 * The song document is the pattern bank (the panel's machine functions read and write it): every kit track holds variants
 * A..P; pattern slot k (1..8) is variant LET[2(k-1)] (its A) and LET[2(k-1)+1] (its B). The song has two one-bar sections,
 * 'A' playing every track's slot-A variant and 'B' its slot-B variant; the play modes are the transport (A: loop A, B: loop B,
 * A then B: the song loops). Slots 1 to 6 start with six original grooves per machine, written for this page (electro, techno,
 * house; no record's pattern); 7 and 8 start empty. W1's Presets (kits and machine patterns, save, import and export as
 * text) shows in the bar when that global exists.
 *
 * Grooves: one 16-character line per voice, 'x' hit, 'X' accented hit, 'o' soft hit, '.' rest (SongDoc's pattern strings).
 */
(function () {
  'use strict';
  var root = window, doc = document;
  var M808 = (doc.body && doc.body.getAttribute('data-machine')) !== '909';
  var LET = 'ABCDEFGHIJKLMNOP', EMPTY = '................';

  var KIT808 = ['bd808', 'sd808', 'lt808', 'mt808', 'ht808', 'lc808', 'mc808', 'hc808', 'rs808', 'cl808', 'cp808', 'ma808', 'cb808', 'cy808', 'oh808', 'ch808'];
  var KIT909 = ['bd909', 'sd909', 'lt909', 'mt909', 'ht909', 'rs909', 'cp909', 'ch909', 'oh909', 'cr909', 'rd909'];
  // [name, A voices, B voices] (voice keys without the machine suffix)
  var G808 = [
    ['Freestyle', { bd: 'X..x......X..x..', sd: '....X.......X...', ch: 'x.xxx.x.x.xxx.x.', cp: '............X...', cb: '..........x.....' },
                  { bd: 'X..x......X...x.', sd: '....X.......X.X.', ch: 'x.xxx.x.x.xxx.xx', cp: '....X.......X...', ht: '..............x.', mt: '...............x' }],
    ['Robot walk', { bd: 'X.....X.X.......', sd: '....X.......X...', rs: '..x..x....x..x..', ch: 'x.x.x.x.x.x.x.x.', cl: '...x...x...x...x' },
                   { bd: 'X.....X.X...X...', sd: '....X.......X..x', rs: '..x..x....x..x..', ch: 'x.x.x.x.x.x.x.x.', cl: '...x...x...x....', oh: '...............x' }],
    ['Conga funk', { bd: 'X......xX.......', lc: '..x.......x..x..', mc: '.....x.x........', hc: 'x..x.....x...x..', ma: 'xoxoxoxoxoxoxoxo', cp: '....x.......x...' },
                   { bd: 'X......xX.....x.', lc: '..x.......x.xx..', mc: '.....x.x......x.', hc: 'x..x.....x......', ma: 'xoxoxoxoxoxoxoxo', cp: '....x.......x.x.', cb: '.x..............' }],
    ['Warehouse', { bd: 'X...X...X...X...', ch: 'x...x...x...x...', oh: '..x...x...x...x.', cp: '....x.......x...', cy: 'x...............', lt: '...........x..x.' },
                  { bd: 'X...X...X...X..x', ch: 'x...x...x...x.x.', oh: '..x...x...x.....', cp: '....x.......x.x.', mt: '..........x.x...', lt: '.............x.x' }],
    ['Deep house', { bd: 'X...x...X...x...', cp: '....x.......x...', ch: 'x...x...x...x...', oh: '..x...x...x...x.', rs: '.......x......x.' },
                   { bd: 'X...x...X...x.x.', cp: '....x.......x...', ch: 'x...x...x..xx...', oh: '..x...x...x...x.', rs: '.x.....x..x...x.', cb: '...........x....' }],
    ['Booty bass', { bd: 'X.....x.X.x.....', sd: '....X.......X...', ch: 'XxxxXxxxXxxxXxxx', cp: '....X.......X...' },
                   { bd: 'X.....x.X.x...x.', sd: '....X.......X.xx', ch: 'XxxxXxxxXxxxXx..', cp: '....X.......X...', oh: '..............x.', cy: 'x...............' }]
  ];
  var G909 = [
    ['Peak time', { bd: 'X...X...X...X...', oh: '..x...x...x...x.', ch: 'xx..xx..xx..xx..', cp: '....x.......x...', rd: 'x.x.x.x.x.x.x.x.' },
                  { bd: 'X...X...X...X.x.', oh: '..x...x...x...x.', ch: 'xx..xx..xx..xx.x', cp: '....x.......x...', sd: '.............xxX' }],
    ['Acid floor', { bd: 'X...X...X...X...', ch: 'x.xxx.xxx.xxx.xx', cp: '....X.......X...', lt: '...x......x.....' },
                   { bd: 'X...X...X...X...', ch: 'x.xxx.xxx.xxx...', oh: '..............x.', cp: '....X.......X...', lt: '...x......x.....', mt: '.......x.......x' }],
    ['Jacking', { bd: 'X...X...X...X...', cp: '....X.......X...', ch: 'x.x.x.x.x.x.x.x.', rs: '...x..x....x..x.' },
                { bd: 'X...X...X...X...', cp: '....X.......X..x', ch: 'x.x.x.x.x.x.x...', oh: '..............x.', rs: '...x..x....x.xx.' }],
    ['Ride house', { bd: 'X...X...X...X...', sd: '....x.......x...', rd: 'x.x.x.x.x.x.x.x.', oh: '..x...x...x...x.' },
                   { bd: 'X...X...X..xX...', sd: '....x.......x.xx', rd: 'x.x.x.x.x.x.x.x.', oh: '..x...x...x...x.', cr: 'X...............' }],
    ['Broken beat', { bd: 'X..x...x..x.....', sd: '....X.......X...', ch: 'x.x.x.x.x.x.x.x.', ht: '..............x.' },
                    { bd: 'X..x...x..x...x.', sd: '....X..x....X...', ch: 'x.x.x.x.x.x.x...', oh: '..............x.', lt: '...........xx...' }],
    ['Toms in the dark', { bd: 'X...X...X...X...', lt: '..x.....x.....x.', mt: '.....x.......x..', ht: '.......x........', ch: 'x.x.x.x.x.x.x.x.', cp: '....x.......x...' },
                         { bd: 'X...X...X...X...', lt: '..x.....x.......', mt: '.....x.......x..', ht: '.......x.....xx.', ch: 'x.x.x.x.x.x.x...', oh: '..............x.', cr: 'X...............' }]
  ];
  var KIT = M808 ? KIT808 : KIT909, GROOVES = M808 ? G808 : G909, SUF = M808 ? '808' : '909', MODEL = 'HVT-' + SUF;

  // ---- the document: the kit, the bank, sections A and B
  function song() {
    var tracks = KIT.map(function (t) {
      var vs = {}, k = t.slice(0, 2);
      GROOVES.forEach(function (g, i) { vs[LET.charAt(i * 2)] = g[1][k] || EMPTY; vs[LET.charAt(i * 2 + 1)] = g[2][k] || EMPTY; });
      return { name: t, type: t, inst: t, kind: 'drum', family: 'drums', gain: 0.8, variants: vs };
    });
    var pa = {}, pb = {};
    KIT.forEach(function (t) { pa[t] = 'A'; pb[t] = 'B'; });
    return { v: 1, name: MODEL, bpm: M808 ? 118 : 128, swing: 0, key: 'C', progression: [], sends: {}, tracks: tracks,
      sections: [{ name: 'A', bars: 1, play: pa }, { name: 'B', bars: 1, play: pb }] };
  }

  var help = (M808 ? 'Turn INSTRUMENT SELECT (or tap a voice\'s name tile) to choose the voice, then tap the sixteen keys: a lit key is a hit. '
                   : 'Tap a voice under the keys (INST) to choose it, then tap the sixteen keys: a lit key is a hit. ') +
    'Shift-click (or select AC) for accents. PTN 1 to 8 pick a pattern, A, B and A▸B pick the variation that plays (A▸B: A then B). ' +
    'CLR VOICE and CLR PTN clear what the keys show, COPY A▸B copies the pattern\'s A onto its B, MUTE silences a voice' + (M808 ? '' : ', SHUFFLE delays the off-beats') +
    '. Patterns 1 to 6: ' + GROOVES.map(function (g, i) { return (i + 1) + ' ' + g[0]; }).join(', ') + '; 7 and 8 start empty. Ctrl+Z undoes an edit.';

  var api = Solo.boot({
    title: MODEL, label: 'rhythm machine', device: KIT[0], key: 'C', bpm: M808 ? 118 : 128, swing: 0, section: 'A', global: 'HVT' + SUF,
    tracks: KIT.map(function (t) { return { name: t, type: t, inst: t, kind: 'drum', family: 'drums', gain: 0.8 }; }),
    patterns: [], presets: false, help: help,
    onStart: function () { var m = machine(); if (m) m.setMode(m.mode()); }       // the framework loops 'A' at start: back to the panel's mode
  });
  var host = api.host && api.host();
  if (!host) return;
  host.loadDocument(song());                         // two sections A and B (the framework builds one); before audio, so nothing plays yet
  function machine() { var p = api.panel && api.panel(); return p && p.kit ? p.kit.machine : null; }
  api.machine = machine;
  api.grooves = GROOVES;
  api.kit = KIT;
  api.modelName = MODEL;
  // the bar's Play loops the section the framework knows ('A'): put the panel's mode back after it
  if (api.el && api.el.play) api.el.play.addEventListener('click', function () { var m = machine(); if (m && host.transport.playing) m.setMode(m.mode()); });
  var pats = api.el && api.el.patterns; if (pats && pats.parentNode) pats.parentNode.removeChild(pats);   // the slots are on the panel

  // ---- kits and machine patterns through W1's Presets (feature-detected; absent: nothing shows)
  var PR = root.Presets;
  if (PR && typeof PR.menu === 'function' && typeof PR.list === 'function' && PR.patterns && api.el && api.el.bar) {
    var g = doc.createElement('div'); g.className = 'so-group so-menu'; g.setAttribute('aria-label', 'Kits and patterns');
    var b = doc.createElement('button'); b.type = 'button'; b.className = 'so-btn'; b.id = 'so-presets'; b.textContent = 'Kits & patterns';
    b.setAttribute('aria-label', 'Kits and patterns: load, save, copy as text, paste text');
    g.appendChild(b); api.el.bar.appendChild(g);
    var menuObj = null;
    try {
      menuObj = PR.menu(b, { host: host, device: host.device('track:' + KIT[0]), track: KIT[0], kits: true, patterns: true, tempo: true, container: doc.body,
        onApply: function () { if (api.paint) api.paint(); } });
    } catch (e) { menuObj = null; }
    if (!menuObj) g.parentNode.removeChild(g);
    api.presetsMenu = function () { return menuObj; };
  }
})();
