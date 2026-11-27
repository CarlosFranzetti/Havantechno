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

  // ---- the document: the kit, the bank, sections A and B. typeOf(voice) -> the track type (the 909's voice source)
  function kitTracks(typeOf) {
    return KIT.map(function (t) {
      var vs = {}, k = t.slice(0, 2), ty = typeOf ? typeOf(t) : t;
      GROOVES.forEach(function (g, i) { vs[LET.charAt(i * 2)] = g[1][k] || EMPTY; vs[LET.charAt(i * 2 + 1)] = g[2][k] || EMPTY; });
      return { name: t, type: ty, inst: ty, kind: 'drum', family: 'drums', gain: 0.8, variants: vs };
    });
  }
  var pa = {}, pb = {};
  KIT.forEach(function (t) { pa[t] = 'A'; pb[t] = 'B'; });
  var SECTIONS = [{ name: 'A', bars: 1, play: pa }, { name: 'B', bars: 1, play: pb }];
  function song(typeOf) {
    return { v: 1, name: MODEL, bpm: M808 ? 118 : 128, swing: 0, key: 'C', progression: [], sends: {}, tracks: kitTracks(typeOf), sections: SECTIONS };
  }

  var help = 'Choose a voice (' + (M808 ? 'INSTRUMENT SELECT or a name tile' : 'INST under the keys') + '; on a phone the voice buttons), then tap the sixteen keys: a lit key is a hit. ' +
    'Shift-click (or select AC) for accents. PTN 1 to 8 pick a pattern, A, B and A▸B pick the variation that plays (A▸B: A then B). ' +
    'CLR VOICE and CLR PTN clear what the keys show, COPY A▸B copies the pattern\'s A onto its B, MUTE silences a voice' + (M808 ? '' : ', SHUFFLE delays the off-beats') +
    '. Patterns 1 to 6: ' + GROOVES.map(function (g, i) { return (i + 1) + ' ' + g[0]; }).join(', ') + '; 7 and 8 start empty. Ctrl+Z undoes an edit.' +
    (M808 ? '' : ' VOICE SOURCE (top of the panel): SYNTH plays the synthesized voices; SAMPLE plays recordings of a real 909 drum machine (the free Rob Roy set of 1995); ' +
      'ROM plays the closed and open hat, crash and ride from images of the 909\u2019s own sample chips, which you load with LOAD ROM\u2026 (they are checked by checksum and stay on your computer). ' +
      'The page starts on the most real source it has for each voice; the panel says which source the drums and the hats and cymbals are using.');

  var api = Solo.boot({
    title: MODEL, label: 'rhythm machine', device: KIT[0], key: 'C', bpm: M808 ? 118 : 128, swing: 0, section: 'A', global: 'HVT' + SUF,
    tracks: kitTracks(), sections: SECTIONS,           // the bank song: two one-bar sections A and B (Solo.boot's sections option)
    patterns: [], presets: false, help: help,
    onStart: function () { var m = machine(); if (m) m.setMode(m.mode()); preload(); }   // the framework loops 'A' at start: back to the panel's mode
  });
  var host = api.host && api.host();
  if (!host) return;

  // ---- the HVT-909's voice source at start (Pressing Crew G2). The asset manifest (engine/assets.js, assets/manifest.json)
  // says which sets this copy of the page carries. Each voice starts on the most real source present: the ROM chip for the
  // closed and open hat, crash and ride when that chip's image is loaded (the synthesized voice with its rom row on, the
  // default), else the Rob Roy recording when the set is present, else the synthesized voice. The ROM images are loaded
  // here, before any tap (they need no audio context); the recordings are decoded on the context at start (Host.start
  // awaits Assets.ready for the document; preload() then decodes the other voices so SAMPLE switches without a gap).
  // This is the document the page opens with, so it takes no undo entry. SYNTH stays one tap away on the panel.
  var A = root.Assets, S9 = root.Sampled909, DR = root.Drums, CHIP = { ch909: 'hat', oh909: 'hat', cr909: 'crash', rd909: 'ride' };
  function defaultTypeOf(m) {
    var rob = !!(S9 && typeof S9.sampledOf === 'function' && m && m['tr909-robroy'] === true), chips = {};
    var st = DR && typeof DR.romStatus === 'function' ? DR.romStatus() : null;
    if (st && st.chips) Object.keys(st.chips).forEach(function (c) { if (st.chips[c].loaded) chips[c] = true; });
    return function (t) { return (CHIP[t] && chips[CHIP[t]]) ? t : (rob ? (S9.sampledOf(t) || t) : t); };
  }
  api.sourceReady = Promise.resolve(null);
  if (!M808 && A && typeof A.ready === 'function') {
    api.sourceReady = A.ready(null).then(function (r) {
      var m = r && r.manifest; if (!m) return r;
      var typeOf = defaultTypeOf(m);
      if (!KIT.some(function (t) { return typeOf(t) !== t; })) return r;
      // before audio only: once the owner has tapped start, the kit is theirs to switch on the panel
      if (!(typeof host.started === 'function' && host.started()) && !api.started()) host.loadDocument(song(typeOf));
      return r;
    }, function () { return null; });
  }
  function preload() {
    if (M808 || !A || typeof A.ready !== 'function' || typeof host.context !== 'function') return;
    var c = host.context(); if (c) A.ready(c);
  }
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
    var b = doc.createElement('button'); b.type = 'button'; b.className = 'so-btn'; b.setAttribute('id', 'so-presets'); b.textContent = 'Kits & patterns';
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
