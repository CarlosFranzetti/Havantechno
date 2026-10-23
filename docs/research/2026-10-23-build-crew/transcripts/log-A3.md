# Log A3: faces (Build Crew, wave 1, 2026-10-23)

Files: `app/ui/faces.js` (global `Faces`), `app/ui/facedefs.js` (24 definitions), `tools/faces-check.js`. No commits.
Read at start: CONTRACT, BRIEF, FH3 and FH4 round 1 and round 5, FS4 (glyph and hero table), FS2 (data faces, generic fallback, "more" drawer), the engine specs. Other logs read at start (none then) and again before finishing (A1, A2, A4, A8 had items for A3; all answered below).

## Decisions

1. **24 definitions, not 23.** 13 instruments + 10 processor types (filter, saturator, delay, reverb, eq3, compressor, limiter, sidechain, widener, chorus) + channel = 24. The "23" in the brief counts 9 processor types.
2. **Faces are data.** `Faces.define(type, {glyph, hero, live, sections, strip, width, height, heroH, labels, options})`. Sections name parameters only; min, max, unit, default come from `device.spec` (F-S2). A param entry may be a string or `{p, widget, label, options}`; a section may give `match: '<regexp source>'` instead of `params` (the channel strip uses it for its `send.<name>` levels, which A1 puts in the channel spec).
3. **No param is unreachable.** Unplaced spec params go to a "more" drawer (open in `window`). The generic `Faces.fallback` renders every spec param as slider/toggle/select (no hero). A type with no definition falls back automatically. New engine params (A7, A8 added 15 this wave) therefore appear the same day; I then placed them in sections and the lint note count went to 0.
4. **Widget kinds are decided by the spec entry**, not the layout: numeric -> knob (or slider), boolean -> toggle, string -> select. Option lists: `layout.options` (e.g. sub `mode`), else global defaults for `wave`, `mode` (filter), `division` (has a labelled empty "free"), `algo`, `curve`. A string param with no list is a lint error.
5. **Writes.** Every control writes `host.setParam(device.pathPrefix + '.' + param, v)` and calls `host.hold(path)` on first change (A2's `onHold`; toggles and selects hold on each change). Release is only by the host's "re-enable arranged". Faces keep no drag state: A2's `set()` ignores values during a drag.
6. **update()** (cheap: 200 calls on the bass window took 14 to 22 ms in the fake DOM): pulls `host.getParam` per control, sets `setState('set'|'ramp'|'held'|null)` from the current section (`host.sections()` + `host.transport.pos()`; held via `host.isHeld(path)`, which A1 provides, with a local fallback); `setRamp(from,to)` on a ramp; `home` is a function returning the section's arranged value, `factory` and `setStock` are `spec.value` (A2's asks 1 to 3). `host.sections()` clones on every call, so Faces caches it for 250 ms per host and shares it across faces. Hero redraw only when a param changed, except `live` heroes (compressor, limiter, sidechain, widener, channel: `host.meter(id)` / the sidechain node) which redraw every update. Frame attributes: `data-bypass` (from `device.ref._bypassed`) and `data-mute` (`<track>.mute` for instrument and channel faces), the names theme.css uses.
7. **Markup follows theme.css (A2)**: `.face[data-fam][data-density]` > `.face-head` (`.face-glyph`, `.face-title`, `.face-sub`) + `.face-body` (`.face-hero`, `section.face-section` > `.face-section-title` + `.face-controls`, `details.face-more`). Head and title also carry `hv-head` / `hv-title` (A4 hooks a double-click on them). No stylesheet is injected from faces.js.
8. **Chip density** is inline glyph + name (`span.face-chip` with `.chip-glyph` and `.chip-name`), no border, so A4 can put it inside its own button; wrap it in `button.chip` for a standalone slot. `Faces.glyph(typeOrDevice, px)` returns just the glyph element.
9. **Heroes** are pure canvas drawing from parameters (RBJ-style biquad responses computed in JS, lowpass/highpass Q treated as dB as Web Audio does; reverb tail from `K.impulse`'s exponent; saturator from the engine's tanh shaper), in the colours `Widgets.curve` passes as its 4th argument (fallback: computed style, then the F-S4 table). Bypass draws dashed. Per device: kick pitch drop (tau or log ramp) + envelope (hold), sub envelope + sine (pluck or drone), bass and lead filter response over the waveform with the envelope ghost, stab stereo field + chord stack, clap flams + tail, hats envelope + six ring bars (open/closed siblings), shaker band + envelope, perc pitch + noise tick, pad swell + LFO, riser sweep ribbon on 4 s, impact pitch drop + wash, filter response, saturator transfer + tone corner, delay tap train (ping-pong sides, division via `Processors.divSeconds`), reverb tail with predelay and damp tilt, eq3 three-node curve, compressor and limiter transfer curve + GR bar + live dot, sidechain duck envelope (lin or dB release) + live gain bar, widener fan + correlation bar, chorus modulation sines (base, invert), channel level meter + gain and pan.
10. `Faces.render(...)` also returns `resize(w,h)` (uses `curve.resize`), `device`, `density`, `error()` (last hero exception; `Faces.strict = true` makes heroes rethrow, but A2's curve catches draw errors, so tests read `error()`).
11. `Faces.lint(host)` returns an array of problem strings (layout names a param not in the spec; placed twice; widget kind wrong for the spec entry; string param without an option list; default not in the option list; bad strip/label names; missing hero, glyph, sections or widths; spec param that cannot be shown; device type with no definition). The array has a `.notes` property listing params that fall to the "more" drawer (not a problem).

## Answers

- **From A3 to A2:** all four asks adopted (setState every update, `home` function, idempotent hold, colours from the 4th draw argument; bypass dashed). Thank you for `setRamp`/`setStock`, used.
- **From A3 to A4:** chip density is glyph + name with `.hv-head`/`.hv-title` on the face and strip heads, as you rely on. Chip has no border (wrap it).
- **From A3 to A1:** `host.isHeld` is used. A face holds a `device.ref` only for `_bypassed` and the sidechain node; the views re-render faces on `'document'` with `rebuilt: true`, so no refetch is needed inside Faces. Nothing requested.
- **From A3 to A8 and A7:** your new params are placed (delay loop, modRate, modDepth; reverb algo, seed; chorus base, invert; widener monoBelow; sidechain curve; kick tau, hold; sub mode, release; hats metalHp) and the heroes draw them. Option lists for `algo` and `curve` are in Faces' defaults; sub `mode` is `['pluck','drone']` in its layout. If you rename a param or add a string param, the lint says so.
- **To A6:** `Faces.fallback(d, 'window', host)` (Controls view) is a vertical slider list, no hero. `face.resize(w,h)` resizes the hero when the window is resized. Windows should call `face.update()` each frame, as A4 does.

## Verification (what I ran)

```
node --check app/ui/faces.js app/ui/facedefs.js tools/faces-check.js   -> no output
node tools/faces-check.js
  lint: 0 problem(s), 0 note(s)
  update() x200 on the bass window: 22 ms (fake DOM, no canvas cost)
  devices rendered: 49 real + chorus synthetic; heroes drawn: 72
  OK: 982 checks passed          (exit 0)
node tools/widgets-check.js -> OK: 134 checks passed;  node app/engine/selfcheck.js -> OK: 263 checks passed
```
The check uses the real engine, real `Host` (context-less), real `Widgets` and a fake DOM with a canvas context that counts calls. It renders every type at chip, strip, face and window, asserts each hero drew without error and painted, each real device has exactly one control per renderable spec param, writes and holds reach `kick.tune` and `send.delay.pingpong`, markers follow the host (set in `intro`, ramp in `intro2`, held beats ramp, cleared by `releaseAll`), bypass and mute attributes, resize, dispose, fallback, and negative lint tests (bad param, duplicate, wrong widget, missing hero, new spec param goes to the drawer).
Real browser (throwaway page in the scratchpad, Playwright chromium, theme.css + real widgets): all types rendered at strip, face and window with no console or page errors; the face and strip screenshots were inspected: heroes, glyphs, family inks, section layout, selects and toggles draw. The window screenshot was produced but not inspected.

## Unfinished / unverified

- Hero numbers are my reading of the engine (analog biquad prototype, reverb exponent, delay tap height `mix*fb^(n-1)`), not measured against rendered audio. The compressor live dot is approximate (output peak from the meter minus reduction and makeup).
- Live meters were exercised only with stubbed `host.meter` data in Node and with zeros in the browser (no audio started). Sidechain live bar reads `device.ref.node.gain.value`.
- No touch, keyboard-in-browser or screen-reader test of the faces themselves (widgets are A2's). Dragging the hero's end points (FH3 suggestion) is not built: heroes are display only.
- Stab hero shows a fixed example chord (63 66 70 73), not the last played chord.
- Window sizes in `width.window` are hints (hero width), the window may resize with `face.resize`.
