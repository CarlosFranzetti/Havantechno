# W1 log: presets and pattern bank

Times: Eastern Time (EST), UTC in parentheses.

## 2026-11-26 19:25 ET (2026-11-27 00:25 UTC): start, reading; menu builder signature (stable)

Read CLAUDE.md, the brief, CONTRACT.md (Host, Windows), host.js (public calls; editor `group`, `hold` = one undo snapshot,
`setParam` takes none), songdoc.js (editor, cells), classics.js and drums.js specs, windows.js, preload.js, solo.js, log-W2.md.

**Menu builder (in app/engine/presets.js, so solo pages need no windows.js):**

```js
var m = Presets.menu(button, {
  host: host,                 // required: the Host (or a bridge host; pattern rows hide without editor/commit)
  device: dev,                // a host.devices() entry (instrument); or give track (+ type)
  track: 'bass',              // optional when device is given (device.track)
  type: 'modeld',             // optional: the preset type; default device.type
  kits: true,                 // drum voices also list their machine's kits ('hvt808' | 'hvt909'); default true
  patterns: true,             // show the Patterns group (synth: the track's current variant; drum voice: the machine pattern)
  tempo: false,               // a machine pattern also sets bpm and swing (solo pages: true)
  container: document.body,   // where the popup goes (position: fixed under the button)
  onApply: function (what, id) {}   // what: 'patch' | 'kit' | 'pattern'; after a load
});
// -> {el (the popup), button, open(), close(), toggle(), isOpen(), refresh(), dispose()}
// button: any <button>; the builder wires click, ArrowDown/Enter/Space, aria-haspopup/expanded. null: it makes one (m.button).
```

Also outside the frozen interface, for pages: `Presets.patterns.apply(host, track, id, {tempo}) -> bool` (one undo step,
commits), `Presets.applyData(host, track, params)`, `Presets.current(host, track) -> id|null`, `Presets.machineOf(type)`,
`Presets.ready()` (Promise: the Electron file read in), `Presets.validate(type, params) -> {params, problems}`.
Ids carry their type: factory `tb303/rubber-bass`, user `tb303/u-<base36>`, so `Presets.apply(host, track, id)` needs no type.

## 2026-11-26 19:30 ET (2026-11-27 00:30 UTC): built, checked

### Files (mine only)
- `app/engine/presets.js` (new, global `Presets`): the frozen interface, factory bank, storage adapters, the menu builder.
- `app/ui/windows.js` (edit): the header's "Preset ▾" is live for instrument windows when `Presets` is loaded (`c.syncMenu`,
  rebuilt only when the device id or type changes; disposed with the window); hidden for inserts, sends, master, channel,
  and when presets.js is absent (so the app without the tag behaves as before).
- `tools/presets-check.js` (new): Node check, fake DOM, real engine, Host, Windows.

### Script tag (app/index.html belongs to V2: please add)
```html
<script src="engine/presets.js"></script>
```
right after `<script src="engine/importer.js"></script>` and before `<script src="ui/widgets.js"></script>` (after host.js;
before windows.js). Solo pages: after `../engine/host.js`, before `../ui/panels.js` / `solo.js`. For browser-check.js, add
`['Presets', 'app/engine/presets.js', 'W1']` to GLOBALS once the tag is in.

### How one undo step is made
`host.setParam` takes no undo snapshot; `host.hold(path)` takes one. `Presets.apply` calls `host.hold(firstPath)` then
`host.release(firstPath)` (unless the user already held that path, then it stays held), then `host.setParam` for every row:
one snapshot, nothing left held, values persisted in the document by the Host. Undo (`editor().undo()` + `commit()`) rebuilds
and restores the old values. Works before `host.start()` (the context-less engine and the document take the values) and on the
Electron bridge host (setParam/hold/release forwarded). Patterns: inside `editor().group(...)`, `setVariantBars(track,
letter, bars, 'empty')` takes the snapshot, then the cells are written into that variant in place; `commit()` applies it in
place (variants are not structural). If the section does not play the track yet, `setPlay` makes it play the variant (as the
panels' step keys do).

### Decisions
- A patch sets every spec row: a row it leaves out goes to the spec value, except `level`, which then keeps the mix's value.
  Factory drum-voice presets leave `level` out on purpose; synth presets set it (loudness matched by ear and by peak).
- A kit applies to every track whose instrument is that voice; voices with no track are skipped. A machine pattern replaces
  the current variant of every voice track of that machine and clears voice tracks the pattern leaves out; bpm and swing only
  with `{tempo: true}` (the menu in the DAW passes false; solo pages should pass true).
- Ids carry their type (`tb303/rubber-bass`, `hvt808/u-...`), so apply needs no type and ids never collide across types.
- Chords: juno patterns store `notes` + `note` = lowest (W2's convention). Today the sequencer plays `note` only.
- Electron: `presets.json` in the app data folder (`{app, format: 'presets-store', version, data: {key: text}}`); reads come
  from a cache filled at start (`Presets.ready()`), writes are serialised; the first run copies the web build's localStorage
  bank. Several Electron windows each hold a cache: the menu re-reads the file on open (`Presets.reload()`), but two windows
  saving at nearly the same time can still lose one save (last write wins). Not solved.
- Menu forms instead of `prompt()` (Electron has no prompt): Save as (synth, or for a drum voice: this voice or the whole kit),
  Rename and Delete (a select of user entries), Import (file input + text area; pasting a pattern under Presets imports it as a
  pattern and says so), Export (select, read-only text area, Copy as text, Download or Save file in Electron).

### Factory bank (original; values checked against each spec row by presets-check)
- Patches: tb303 8 (Round bass, Rubber bass, Squelch lead, Hollow square, Short pluck, Open sweep, Dark square sub, Screaming
  acid), modeld 8 (Fat saw bass, Plucked square bass, Hollow square lead, Brassy saws, Whistle lead, Noise snap, Slow filter pad,
  Wobble bass: osc 3 as a free LFO into the filter), juno 8 (Slow pad, Warm strings, Glass keys, Unison bass, Pulse brass, Chord
  stab, Noise wash, Square organ). Drum voices: bd808, bd909, sd808, sd909 four each; ch808, oh808, ch909, oh909, lt/mt/ht808,
  lc/mc/hc808, lt/mt/ht909 three each. Kits: hvt808 4, hvt909 4 (each has a "Default kit").
- Patterns: tb303 the six solo.js lines (Pump, Squelch, Climb, Hop, Space, Run); modeld 6 (one with ratchets, one with ties
  and glides, one two-bar); juno 6 (chords and an arpeggio; up to four bars); hvt808 6 (three electro, house, techno, congas)
  and hvt909 6 (four-to-the-floor, pounding and rolling techno with a two-bar tom fill, jack house, broken shuffle, toms),
  each with bpm and swing.

### Checks (run directly, exit codes read)
- `node tools/presets-check.js`: OK 1907 checks, exit 0 (interface, validation, adapters incl. throwing localStorage and the
  Electron file, export/import and 9 readable rejections, every factory row in range, every pattern well formed, apply and
  pattern load = one undo step, undo restores, kits on a partial kit, the menu in a window: lists, marks, loads, saves,
  renames, exports, imports, deletes, keyboard, a bridge host, dispose).
- Headless Chromium (script in my scratchpad, not in the repo; it adds the tag to index.html through `page.route`):
  17/17 at 1280x800 and 390x844 (phone): added a tb303 and a TR-808 kit from "+ track", opened both windows, loaded two
  factory presets (mouse, then keyboard), a 303 pattern, a kit and a machine pattern (one undo entry each), saved a user
  preset, reloaded the page and found it, exported and re-imported it (values equal), Copy as text present, menu on screen
  at 390 px, no page or console errors. Screenshots looked at (menu over the 303 and the 808 windows, the phone).
- Offline peaks, two bars, instrument output only (no channel, no master), AudioWorklet engine, 126 BPM, the type's first
  factory pattern (tb303 Pump, modeld Octave pump, juno Two-chord pad with the chord notes sent as `ev.notes`):
  tb303 0.38 to 0.67; modeld 0.26 (Noise snap) to 0.58; juno 0.28 to 0.68 (Square organ). Lowest 0.261, highest 0.678:
  none silent, none over 1.0. (Unison bass raised to level 0.9 and Whistle lead to 1.1 after a first pass at 0.18 and 0.29.)
- Existing checks after my changes (each run directly): selfcheck 448 exit 0; panels-check 149 exit 0; faces-check 2495
  exit 0; system-editor-check 97 exit 0; widgets-check 157 exit 0; step-view-check 72 exit 0; solo-check 115 exit 0;
  browser-check 26 exit 0. (One run at 19:31 ET caught panels-check and solo-check failing on "HVT-D: missing priority": a new
  `priority` row in classics.js from another agent before panels.js had its control; both passed again two minutes later.)

### Not verified
- Electron itself (the shell adapter is checked with a fake `HavantechnoShell` in Node, not in a real Electron window), the
  Download button (Chromium headless download not inspected), the clipboard write (Copy as text falls back to selecting).
- Chords on the juno play as the lowest note until the sequencer reads `cell.notes` (W2's request to the coordinator).
- Two Electron windows saving at the same moment (last write wins).

## A "Presets" section for app/CONTRACT.md (for the coordinator to merge)

### Presets (Showroom Crew W1) — `window.Presets` (`app/engine/presets.js`, after `engine/host.js`, before `ui/windows.js`)
```js
Presets.list(type) -> [{id, name, factory, kind: 'patch', machine?}]   // type: 'tb303' | 'bd808' | ... | 'hvt808' | 'hvt909'
Presets.get(type, id) -> {id, name, type, factory, params} | null      // a kit also has voices: {voiceType: params} (params = voices)
Presets.save(type, name, params, {id}) -> id | null                    // user only; factory ids refused; validated
Presets.rename(type, id, name) -> bool;  Presets.remove(type, id) -> bool
Presets.capture(host, track) -> params;  Presets.captureKit(host, machine) -> {voices}
Presets.apply(host, track, id) -> bool        // patch, voice preset or kit; host.setParam per row; one undo step; before start too
Presets.applyData(host, track, params) -> bool;  Presets.current(host, track, type?) -> id | null
Presets.exportText(type, id) -> string        // {app: 'havantechno', format: 'preset', version: 1, type, name, params | voices}
Presets.importText(text) -> {type, id, problems}   // throws Error with a readable message; JSON.parse only, never eval
Presets.patterns.list / get / save / rename / remove / exportText / importText     // format: 'pattern', {..., pattern}
Presets.patterns.capture(host, track) / apply(host, track, id, {tempo}) / current(host, track)
   // synth: the track's current variant {bars, cells}; drum voice: the machine pattern {voices: {type: {bars, cells}}, bpm, swing}
Presets.storage(adapter) / Presets.adapters.{memory, local, shell} / Presets.ready() / Presets.reload()
Presets.on('change', fn) / off      // fn({what: 'preset'|'pattern'|'storage', action, type, id, track?})
Presets.validate(type, params) -> {params, problems};  Presets.patterns.validate(type, pattern) -> {pattern, problems}
Presets.spec(type), Presets.machineOf(type), Presets.isMachine(type), Presets.problems(), Presets.types()
Presets.menu(button, {host, device, track, type, kits, patterns, tempo, container, onApply}) -> {el, button, open, close, toggle, isOpen, refresh, dispose}
```
- **Ids** carry their type: factory `<type>/<slug>`, user `<type>/u-<base36>`. Factory entries are read-only.
- **Validation** (load, save, import): unknown rows ignored and reported; numbers clamped to the spec row; string enumerations
  must be an option (else dropped), numeric options snap to the nearest; booleans take true/false/0/1. Patterns: 1 to 64 bars,
  cells padded to bars x 16, cell fields `vel acc len nudge note prob cond rep locks slide notes` clamped, others reported.
- **Apply**: a patch sets every spec row (a missing row = the spec value; a missing `level` keeps the mix's). One undo step:
  `host.hold(first) + host.release(first)` (kept held if it was), then `setParam` per row. Kits: every track of each voice.
  Patterns: `editor().group` + `setVariantBars(..., 'empty')` + the cells in place + `commit()`; a machine pattern clears the
  machine's voice tracks it leaves out; `{tempo: true}` also sets bpm and swing.
- **Storage**: key `hv.presets.v1` ({app, version: 1, presets: {type: [{id, name, params|voices}]}, patterns: {type: [{id, name, pattern}]}});
  web: localStorage in try/catch, memory after the first failure; Electron: `presets.json` through `readAppData`/`writeAppData`.
- **Windows**: an instrument window's "Preset ▾" opens `Presets.menu` (factory and user presets with the current one marked;
  a drum voice also lists its machine's kits; a Patterns group when the host has an editor and the track a pattern; Save as,
  Rename, Delete for user entries, Import (file or pasted text), Export (Copy as text, Download / Save file)). Keyboard:
  ArrowDown/Enter/Space on the button opens on the marked item; arrows, Home, End, type-ahead; Escape backs out of a form,
  then closes; Tab closes.
- **Check**: `node tools/presets-check.js`.
