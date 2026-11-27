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
