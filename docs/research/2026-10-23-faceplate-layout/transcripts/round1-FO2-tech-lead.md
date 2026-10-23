# F-O2: Tech lead (feasibility and the build) — round 1
Agent model: Opus. Date: 2026-10-23.

## Scope

How the current page is built and what ties it to the audio code, an architecture for per-device faces with no build step, how meters get data without hurting the scheduler, performance limits, a migration path that keeps `node studio/selfcheck.js` green at every step, and rough costs for three layout concepts. My code findings come from reading the repo, so they are verified against the files themselves. Web facts are marked as the BRIEF asks.

Housekeeping: during this session, a folder `olde Havantechno dub studio/` appeared next to `studio/`, and CLAUDE.md now points to it. I compared them with `cmp`: all seven `.js` files are byte-identical, and both `index.html` files now carry the "olde Havantechno dub studio" title. Everything below applies to both folders. I use `studio/` as the BRIEF does.

## What I looked at

- `studio/studio.js` (206 lines), `studio/index.html` (82), `studio/core.js` (`defineParams`), `studio/selfcheck.js` (182), `studio/sequencer.js` (`setParam`/`getParam`, `tick`, events, sections), the `create`/`chain`/`channel`/`master` functions in `processors.js`, `makeInst`/`create` in `synths.js`, and `song.js`.
- The screenshots `docs/screenshots/studio-playing.png` (13 identical cards with a 4×4 grid of strips; the header still reads "aasssMaster STUDIO") and `docs/screenshots/studio-rack.png` (a "processors: sends and master" card holding 8 identical slider units).
- I ran `node studio/selfcheck.js`: `OK: 161 checks passed`. A node script dumped every spec: **137 parameters across the 23 device types**.
- 8 web searches (list in Sources). One page fetch, the MDN AnalyserNode page, failed on DNS, so every web fact here comes from a **search excerpt**.

## Findings

### 1. How the UI is generated today, and what couples it to the audio code

**Generation.** `start()` creates the `AudioContext`, then `Sequencer.create`, `Song.build(seq)`, `buildTracks()` and `buildRack()`. Its work breaks down like this:

- `buildTracks()` loops over `seq.order`, the 13 tracks. Each card gets a header (name, `inst.type`, M/S), a 16-cell step row, and fixed sliders: level = `tr.channel.gain`, pan, one send per `seq.sendOrder`, and duck depth = `tr.sc.depth`. Two `<details>` blocks follow, filled by `paramSliders(spec, params, setter, skip)`: "synth parameters" and "inserts".
- `paramSliders` is the only generic piece. It walks a spec object and makes one `<input type=range>` per **numeric** key. It guesses the step from the range and makes a slider logarithmic when `min > 0 && max/min > 50`.
- `buildRack()` gives each send and each master processor one "unit", the same slider list plus a bypass button.
- A `setInterval(meter, 60)` reads the single master `AnalyserNode`.
- `seq.on('step')` toggles the `now` class on 13×16 = 208 cells. `seq.on('section')` calls `refreshPatterns`, which recolours the cells and pushes the section's `set` values into the sliders.

**The spec is already the right seam.** `Kit.defineParams(obj, spec, onSet)` gives every synth, processor and channel `obj.spec` (`{min,max,value,unit}`), `obj.params` (live values), `obj.set` and `obj.get`. `Synths.create` and `Processors.create` deep-copy the spec, so `spec[k].value` stays the factory default and can serve as a reset target. Song values are applied through `set()` afterwards. A face that reads only `spec` and `params` and writes only through a setter has no audio dependency at all.

**Couplings, all in `studio.js`:**

| # | Coupling | Why it matters for faces |
|---|----------|--------------------------|
| C1 | It reads engine internals directly: `tr.channel`, `tr.sc`, `tr.inst.spec/params`, `tr.chain.procs`, `p._bypassed`, `seq.sends[sn]`, `seq.master.procs`, `tr.patterns`, `tr.melodies`, `tr.kind`, `sec.play`, `sec.set`, `seq.analyser`. | Every face would copy this reach-in. There is no list of "devices" anywhere. |
| C2 | It has two write paths. The page calls `obj.set(k, v)` directly, while the arrangement uses `seq.setParam('path', v, {at})`. | Undo, automation recording and remote control all need one path. `setParam` already resolves `track.key`, `track.insert.key`, `send.name.key` and `master.name.key`. |
| C3 | UI updates are event-driven, and the events fire **inside the scheduler's tick**. `tick()` → `flushEvents()` → `emit('step')` → `onStep`, all in the same 25 ms `setInterval` callback, before scheduling continues. | Any heavy face work hung on `step` delays note scheduling. |
| C4 | Sliders do not follow automation. `refreshPatterns` applies `sec.set` only to **instrument** params and only at section start. `ramp` (stab.cutoff, master.hp.cutoff, master.lp.cutoff) is never shown, and the master rack never refreshes. | Faces need value sync by polling, not by events. |
| C5 | There are two "levels". Sections set `kick.level` and `clap.level`, the instrument output, but the UI hides the instrument `level` (`skip {level:1}`) and its "level" slider is the channel gain. | Face specs must say which level is "the fader". |
| C6 | String and boolean params are invisible: `bass.wave`, `lead.wave`, `filter.mode`, `delay.division`, `delay.pingpong`. `paramSliders` skips them, and `defineParams` accepts any string, so there is no list of allowed values. | Selector widgets need a `choices` list. |
| C7 | Range and curve are guessed: step by range, log by ratio. No spec uses `label`, `curve` or `step`, although the `defineParams` comment mentions `label?`. | Faces want explicit hints, at least for the cases the guess gets wrong. |
| C8 | The meter misses most of the signal. `fftSize = 256` (sequencer line 99) is read every 60 ms, so it sees 256/2646 ≈ 10% of samples at 44.1 kHz. It uses byte data, which floors at about −42 dBFS (1/128). It also allocates a new `Uint8Array` every call. | Kick transients can fall between reads. |
| C9 | Compressor and limiter gain reduction is not reachable. The `DynamicsCompressorNode` is a local `c` inside `BUILD.compressor/limiter.build`. | A GR meter needs a small accessor in `processors.js`. |
| C10 | Writes land early. `set()` stores `params[k]` immediately, even when `opts.at` is up to 120 ms in the future (the lookahead). | A polled face shows automation ≤120 ms early. That is acceptable and needs no fix. |

**Important for the migration:** `selfcheck.js` loads only `core, synths, processors, sequencer, song` (its `load()`). It **never loads `studio.js`**. UI work therefore cannot break the self-check, and the self-check also tests none of it. Engine changes, such as a device list or a tap API, do run in it, and the fake `createAnalyser` stub has only `fftSize` and `getByteTimeDomainData`.

**Device count:** 13 synths, 2 inserts (bass `eq:eq3`, stab `width:widener`), 2 sends (delay, reverb) and 6 master processors (`eq, hp, lp, glue, sat, limiter`) make **23 panels**. Live controls across those panels number 141. Each track also has 3 channel params and 4 sidechain params, 91 more, so about 232 controls if everything is shown.

### 2. Architecture: per-device faces with no build step

The design in two lines: **the engine gets a flat device list, and each device is drawn by a face that is chosen from a registry by `type`, built from layout data plus the device's own `spec`.** Unregistered types fall back to a generic face that lays out every spec key.

```
 engine (unchanged audio)        UI layer (new files, globals)
 ----------------------------    ---------------------------------------------
 seq.devices() -> [Device]  -->  Faces.build(device, host) -> Face {el, sync(), destroy()}
 seq.setParam(path, v)      <--  Widgets.knob/fader/switch/select (SVG + HTML)
 seq.getParam(path)         -->  UILoop (one requestAnimationFrame: sync, meters, displays)
 seq.tap(id) -> AudioNode   -->  Meters (AnalyserNode per tap, created by the UI)
```

**Device adapter (engine, ~30 lines in `sequencer.js`).** `seq.devices()` returns plain records:
`{id:'stab', path:'stab', kind:'synth', type:'stab', track:'stab', obj: tr.inst}`, `{id:'stab.width', path:'stab.width', kind:'insert', type:'widener', obj:p}`, `{id:'send.delay', kind:'send', ...}`, `{id:'master.hp', kind:'master', type:'filter', ...}`. `path + '.' + key` is always a valid `setParam` path. I checked this against `setParam`/`getParam`: 2-part paths go to the instrument first, 3-part to `chain.get(name)`, and `send.`/`master.` have their own branches. This fixes C1 and C2 without touching audio code.

**Files and load order (no build step).** After `song.js`, before `studio.js`:
`widgets.js → faces.js → faces-drums.js → faces-synths.js → faces-fx.js → meters.js → studio.js`.
Each file is an IIFE that sets one global (`Widgets`, `Faces`, `Meters`), like `core.js`. `faces*.js` hold **data and pure functions only** and do not touch `document` at load time, so `selfcheck.js` can load them in its vm sandbox.

**Face definition: data, not code.** A face says which spec keys go where. Drawing is done by shared widget code and optional named displays.

```js
/* faces.js - global Faces: registry of per-device panels. Data at load, DOM only in build(). */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  var REG = {}, DISPLAYS = {};

  function define(type, face) { REG[type] = face; return face; }
  function display(name, fn) { DISPLAYS[name] = fn; }          // fn(canvas2d, w, h, params, data)
  function get(type) { return REG[type] || null; }

  // generic fallback: every spec key, numbers as knobs, strings as selects, booleans as switches
  function generic(spec) {
    var keys = [], k;
    for (k in spec) if (spec.hasOwnProperty(k)) keys.push(k);
    var rows = [];
    for (var i = 0; i < keys.length; i += 4) rows.push({ controls: keys.slice(i, i + 4) });
    return { family: 'generic', size: Math.min(4, Math.ceil(keys.length / 4) + 1), rows: rows };
  }

  // keys a face shows; used by build() and by selfcheck's coverage test
  function placed(face) {
    var out = {}, r, c;
    for (r = 0; r < (face.rows || []).length; r++) for (c = 0; c < face.rows[r].controls.length; c++) out[face.rows[r].controls[c]] = 1;
    if (face.hero) out[face.hero] = 1;
    return out;
  }

  // dev = one record from seq.devices(); host = {setParam, getParam}
  function build(dev, host) {
    var face = REG[dev.type] || generic(dev.obj.spec), spec = dev.obj.spec, ctl = {}, r, c, key;
    var el = document.createElement('section');
    el.className = 'face fam-' + face.family + ' w' + (face.size || 2);
    el.setAttribute('data-device', dev.id);
    el.appendChild(Widgets.header(dev, face));
    if (face.display && DISPLAYS[face.display]) el.appendChild(Widgets.display(face.display));
    for (r = 0; r < (face.rows || []).length; r++) {
      var row = Widgets.row(face.rows[r].label);
      for (c = 0; c < face.rows[r].controls.length; c++) {
        key = face.rows[r].controls[c];
        if (!spec.hasOwnProperty(key)) continue;                  // stale layout: skip, selfcheck reports it
        ctl[key] = Widgets.control(spec[key], key, hint(face, key), (function (k) {
          return function (v) { host.setParam(dev.path + '.' + k, v); };
        })(key));
        row.appendChild(ctl[key].el);
      }
      el.appendChild(row);
    }
    var shown = {};
    return {
      el: el, dev: dev, visible: true,
      sync: function () {                                        // called by UILoop; cheap when nothing changed
        for (var k in ctl) if (ctl.hasOwnProperty(k)) {
          var v = dev.obj.params[k];
          if (v !== shown[k]) { shown[k] = v; ctl[k].show(v); }
        }
      },
      destroy: function () { if (el.parentNode) el.parentNode.removeChild(el); }
    };
  }
  function hint(face, key) { return (face.hints && face.hints[key]) || null; }

  root.Faces = { define: define, display: display, get: get, generic: generic, placed: placed, build: build, displays: DISPLAYS };
})();
```

```js
/* faces-drums.js - layout data only */
Faces.define('kick', {
  family: 'drum', size: 2, hero: 'tune', display: 'pitchEnv',
  rows: [ { label: 'pitch', controls: ['tune', 'punch', 'sweep'] },
          { label: 'amp',   controls: ['decay', 'click', 'drive'] } ],
  hide: ['level'],                                   // the channel fader owns loudness (C5)
  hints: { tune: { curve: 'lin', label: 'TUNE' } }
});
Faces.define('eq3', {
  family: 'fx-tone', size: 3, display: 'eqCurve',     // curve drawn from params, not from audio
  rows: [ { label: 'low',  controls: ['low', 'lowFreq'] },
          { label: 'mid',  controls: ['mid', 'midFreq', 'midQ'] },
          { label: 'high', controls: ['high', 'highFreq'] } ]
});
```

**Rendering choices:**

- **Knobs and faders are SVG, one small `<svg>` per control**, with a background arc, a value arc and a pointer. An update is one `setAttribute('d')` or a `transform`, done only when the value changed. Static SVG costs nothing per frame. The SVG-vs-canvas sources say SVG cost grows with object count, so it is fine for a few hundred mostly static elements (search excerpt: https://news.ycombinator.com/item?id=2575219; https://gsap.com/community/forums/topic/17587-over-400-svg-elements-performance/). 141 knobs × about 3 shapes is about 420 nodes.
- **Anything redrawn every frame uses Canvas 2D**: scopes, spectra, gain-reduction history, the playhead over a long arrangement. One canvas per display, sized once on resize with `devicePixelRatio` capped at 2.
- **Meters are plain `<div>`s animated with `transform: scaleY()`.** web.dev advises animating only `transform` and `opacity` so the browser can skip layout and paint (search excerpt: https://web.dev/articles/animations-and-performance). A meter bridge for the mixer can be one canvas instead.
- **Theming uses CSS custom properties per family** (`.fam-drum { --face-bg; --face-accent }`), with no image files, matching how the repo works today. Visual design belongs to F-S4.
- **Interaction:** `pointerdown` → `setPointerCapture` → vertical drag. Capture keeps the moves coming when the pointer leaves the knob (search excerpt, MDN mirror: https://ligm.univ-eiffel.fr/~forax/MDN/developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture.html). Do not combine it with the HTML `draggable` attribute: Chrome and Safari stop capture when native drag-and-drop starts (search excerpt: https://lists.w3.org/Archives/Public/public-pointer-events/2020OctDec/0013.html). Each knob also gets `role="slider"`, `tabindex=0` and arrow keys. Drag conventions are F-S5's topic.
- **Spec hints (C6, C7).** Add `choices: ['saw','square',...]` to the string params **in the engine specs**, because the engine should validate them, and `defineParams` can reject values not in `choices`. Keep `curve`, `label` and `step` in face `hints`, which are UI-only, with today's log/step guess as the default. The audio files then change only for `choices`.

**Displays computed from parameters, not audio** (EQ curve, filter curve, ADSR, kick pitch envelope) are pure functions of `params`. They are redrawn only when a param changed. The EQ and filter curves use the standard biquad magnitude formulas in JS, so they work without an `AudioContext` and can be tested in node. The alternative, `BiquadFilterNode.getFrequencyResponse`, would mean reaching into engine nodes again.

### 3. Meters and displays from AnalyserNodes without hurting the scheduler

**The scheduler's real constraint.** The scheduler runs on the main thread: `setInterval(tick, 25)` with 120 ms lookahead. If a main-thread task runs longer than about 95 ms (120 − 25), notes are scheduled in the past and play late, which sounds like flams. Stalls over 300 ms trip the `_next < now - 0.3` guard, which skips ahead. Every UI rule below follows from keeping each main-thread task well under about 50 ms and every animation frame under 16 ms.

**Rules:**

1. **One `requestAnimationFrame` loop owns all drawing.** `seq.on('step')` and `seq.on('section')` only store the latest event, an O(1) assignment, and set a dirty flag. This fixes C3: today `onStep` does 208 `classList.toggle` calls inside `tick()`.
2. **Taps are created by the UI and kept out of the render path.** The engine exposes `seq.tap(id)`, which returns an existing node to listen on (`tr.channel.output`, a processor's `output`, `seq.out`), or `null` without a live context. `Meters.attach(seq)` creates the `AnalyserNode`s and connects them **from** those nodes as a fan-out. Nothing is connected downstream of an analyser. `Sequencer.render` builds its own `seq` for offline export, so offline renders never carry analysers.
3. **Read with `getFloatTimeDomainData` into a preallocated `Float32Array`.** The method writes the current waveform into a `Float32Array` of length `fftSize` (search excerpt: https://developer.mozilla.org/docs/Web/API/AnalyserNode/getFloatTimeDomainData). Use `fftSize = 1024` for track meters (23 ms at 44.1 kHz) and 2048 for the master. Read once per rAF (16.7 ms) and the windows overlap, so every sample is seen at 60 fps. Today only about 10% is seen (C8). Compute peak and RMS in one pass, and keep peak-hold and decay in JS.
4. **Spectra (`getFloatFrequencyData`)** run only for a face that is visible and has a spectrum display, at 30 fps.
5. **Gain reduction** comes from a new accessor `p.reduction()` on compressor and limiter, returning the `DynamicsCompressorNode`'s reduction value (C9). Sidechain ducking can be drawn from the duck's own params and trigger times, with no audio read.
6. **Playhead sync.** Draw the step from `ctx.currentTime` against the step time in the last event. Later, correct for output latency: `outputLatency` is the time from the graph handing a buffer to the system until the device plays it, and it varies by platform (search excerpt: https://www-igm.univ-mlv.fr/~forax/MDN/developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency.html). `getOutputTimestamp()` returns a context time and a performance time (search excerpt: https://ligm.univ-eiffel.fr/~forax/MDN/developer.mozilla.org/en-US/docs/Web/API/AudioContext.html). One developer reports iOS 15.1 returning wrong values (search excerpt: https://developer.apple.com/forums/thread/696356), so read it behind a sanity check.

**AnalyserNode vs AudioWorklet.** Start with AnalyserNode. The case for a worklet, later and only if needed:

| | AnalyserNode per tap (recommended first) | One AudioWorklet "meter bank" |
|---|---|---|
| Accuracy | Sees every sample if read every frame with fftSize ≥ frame length. Misses everything while the tab is hidden, which is fine. | Sees every sample; peak, RMS and clip counts are computed in `process()`. |
| Main-thread cost | One copy of 1024–2048 floats per tap per frame. For about 37 taps that is about 50–75k floats per frame (my estimate, not measured). | Only receives messages. The pattern is to post results about every 25–32 ms (search excerpt: https://huggingface.co/spaces/Docfile/gemini-realtime-console/blob/main/src/lib/worklets/vol-meter.ts; https://git.srizan.dev/srizan/archived-vdo.ninja/src/branch/master/podcast/audio-metering.md). |
| Audio-thread risk | Small (recalled). | Custom JS on the audio thread. A slow `process()` is an audible glitch. |
| Plumbing | Works today. The selfcheck stub already has `createAnalyser`. | Needs `audioWorklet.addModule('meter-worklet.js')` (async, served file). The fake context has no `audioWorklet`, so everything must stay optional. One node can take many inputs: `numberOfInputs` is a constructor option, defaulting to 1 (search excerpt: https://developer.mozilla.org/docs/Web/API/AudioWorkletNode/AudioWorkletNode), so one node could meter every track and post one `Float32Array`. |

### 4. Performance budget: 23 panels plus meters at 60 fps

Rough budget for one frame at 60 fps (16.7 ms). These are my estimates to be checked with DevTools, not measurements:

| Work | Frequency | Rough cost | Rule |
|------|-----------|-----------|------|
| Poll ~232 param values, update changed knobs | 60 fps, visible faces only | Microseconds for comparisons; one `setAttribute` per changed knob | Dirty compare against the last shown value. During a ramp, only the 1–3 ramped knobs change. |
| ~37 meters (13 tracks + 23 devices + master) | 60 fps while playing | Analyser copies plus 37 `transform` writes | No layout reads in the loop. `scaleY` only. Stop when stopped and decayed. |
| Spectrum or scope displays | 30 fps, visible only | One FFT read plus one canvas path each | At most about 3 open at once. |
| EQ, filter or envelope curves | On param change | One path of about 200 points | Redraw only when dirty. |
| Step grid playhead | Per step (~119 ms at 126 BPM) | 2 class changes per track (old cell off, new cell on) | Today all 16 cells are toggled per track per step. |
| Building 23 faces | Once | Tens of ms (estimate) | Build before the first Play, or spread across frames if rebuilt while playing (layout switch). |

**What to throttle, in priority order:**

1. **Hidden faces do nothing.** Faces off-screen, collapsed or not in the current view are skipped. `IntersectionObserver` is the natural tool; I did not search it, so it is recalled. The chain-style layouts (Ableton) show only one device chain, a large saving.
2. **Spectra and scopes run at 30 fps**, and only on the focused device.
3. **Meter work pauses when stopped**, after decay.
4. **Background tabs.** rAF stops in a hidden tab, which is what we want. Chrome's background timer throttling exempts pages playing audible audio, with a grace period after audio stops (search excerpt: https://developer.chrome.com/blog/background_tabs, a 2017 page). The scheduler is therefore safe while sound plays. Re-check this, because the source is old.
5. **No forced layout.** Never call `getBoundingClientRect` or `offsetWidth` inside the loop; cache sizes on `resize`.
6. **No allocation per frame.** Use preallocated typed arrays and reuse path strings where possible. GC pauses are the most likely cause of a 95 ms stall.

Conclusion: 23 SVG panels plus about 37 meters is well within budget if only visible panels animate and meters touch only `transform`. The risk is not the panel count. It is doing layout or heavy work inside the scheduler's event callbacks.

### 5. Migration path that keeps `node studio/selfcheck.js` passing

`selfcheck.js` does not load `studio.js`, so I add tests where the new code is testable (engine API, face data) and change the UI behind them. Each step ends with `node studio/selfcheck.js` → `OK`.

| Step | Change | Files | Selfcheck at this step |
|------|--------|-------|------------------------|
| 0 | Baseline. | none | 161 checks pass (run today). |
| 1 | Engine device list: `seq.devices()`, `seq.tap(id)` (returns `null` without ctx), `p.reduction()` on compressor and limiter (returns 0 when no node). Add `choices` to the 5 string specs. Make `defineParams` reject strings not in `choices`. | `sequencer.js`, `processors.js`, `synths.js`, `core.js` | New checks: 23 devices on the song; for every device and key, `setParam(path+'.'+k, spec.max)` then `getParam` round-trips; `tap` is `null` dry and a node on the fake ctx; `set('mode','banana') === false`. The fake ctx needs no new node type, because analysers are created in the UI. |
| 2 | Face registry plus a **generic face that reproduces today's sliders** through the device list. One rAF `UILoop` with polling `sync()` fixes C3 and C4 (ramps now move the sliders). `studio.js` shrinks to layout and transport. | new `faces.js`, `widgets.js`; `studio.js`, `index.html` | Selfcheck adds `faces.js` to its vm load list. A check that `Faces.generic(spec)` places every key of every type passes without any DOM. |
| 3 | Knob, fader, switch and select widgets (SVG, pointer capture, keyboard, double-click reset to `spec.value`). The generic face switches to knobs. | `widgets.js` | Unchanged: widgets are DOM-only and not loaded in the vm. |
| 4 | Meters: `meters.js` with analysers on `seq.tap()`, float reads, peak hold; the master meter fixed (C8); a GR meter on `glue` and `limiter`. | `meters.js`, `studio.js` | Unchanged. The selfcheck stub only needs `getFloat*` if engine code ever calls it, and it should not. |
| 5 | First two bespoke faces as templates: **`eq3`** (a param-driven curve display; used three times: bass insert, master eq, any future insert) and **`kick`** (hero knob, pitch-envelope drawing). | `faces-fx.js`, `faces-drums.js` | New **coverage check**: for every `Faces.define`d type, every placed key exists in that type's spec, and every spec key is either placed or listed in `hide`. This catches layout and spec drift when Gear Crew adds or renames params. |
| 6 | Layout shell for the concept that wins the vote. Faces are self-contained, so the shell only decides where `face.el` goes and which faces are visible. | `studio.js`, `index.html`, maybe `layout.js` | Unchanged. |
| 7 | The remaining 18 faces in family batches (drums; tonal synths; time FX; dynamics; tone and space). | `faces-*.js` | The coverage check grows with each batch. |

**Build first: steps 1 and 2.** These are the device list plus a face registry with a generic face and one UI loop. They are layout-neutral, so every concept in the vote needs them. They fix three visible bugs (ramps not shown, the master rack never refreshing, step work inside the scheduler tick) and add the first UI-related checks to the self-check. About 2–3 days (rough estimate).

### 6. Cost of the likely layout concepts (rough estimates, labelled as such)

All numbers are **rough estimates in developer-days** for one person who knows this codebase. They are not measured and carry ±50% uncertainty. Shared base work is counted once.

**Shared base (any concept): about 12–19 days**
- Steps 1–4 (device list, registry and generic face, widgets, meters): 5–7 days.
- Bespoke faces: with about 5 family templates plus per-device layout data, 7–12 days. Simple devices (hats, shaker, widener) take about 0.25 day each. Devices with a display (eq3, filter, compressor or limiter, delay, reverb, bass and lead with an envelope) take about 1–1.5 days each.

**A. Single window with a device chain (Ableton-like): base + 7–10 days**
```
+--------------------------------------------------------------+
| transport | sections: intro intro2 build mainA ... outro      |
+--------------------------------------------------------------+
| track list | arrangement lanes (9 sections x 13 tracks:       |
|  kick  M S |  which variation plays, ramps as lines)          |
|  sub   M S |                                                  |
+--------------------------------------------------------------+
| [kick face] -> [inserts...] -> [duck] -> [channel] | master  |
+--------------------------------------------------------------+
```
- Arrangement lanes drawn from `seq.sections[].play` on one canvas: 3–4 days. The data already exists, so this is read-only at first.
- A selection model and a bottom chain strip with horizontal scroll: 2–3 days.
- A small mixer toggle: 2–3 days.
- It is the cheapest to make fast, because only one chain is visible at a time.

**B. Inspector plus editors (Logic-like): base + 10–14 days**
- An inspector with two channel strips (selected track, its destination): 3 days.
- A full mixer with 13 tracks, 2 sends and master: 3–4 days.
- Floating plugin windows (drag, z-order, open and close, remembered positions): 2–3 days.
- A bottom editor pane: 2–4 days.
- More panels can be visible at once, so the hidden-face throttling matters more.

**C. Stems-first remix view: base + 12–18 days for the UI alone, and the pipeline is not estimable yet**
- Stem lanes with waveform overviews precomputed once, as min and max per pixel: 3–4 days. A 6:21 stereo stem at 44.1 kHz is about 16.8M samples per channel, so peaks must be precomputed, never drawn from raw samples.
- A/B between the source and the recreation, started on the same clock (`AudioBufferSourceNode.start(t)` at a sequencer time): 2–3 days.
- An editable step grid or piano roll writing back into `tr.patterns[v]` / `tr.melodies[v]`: 4–6 days. The scheduler reads those arrays on every step, so in-place edits play live, but there is no save or serialisation back to `Song` data yet.
- Import UI: 2–3 days.
- The stems, the audio-to-MIDI step and the parameter extraction (prd D2 and D3) do not exist in the repo. Their cost depends on Gear Crew's findings, so I give no number.
- The fake context has `createBufferSource` but no `decodeAudioData`. Engine-side stem loading needs a stub.

**Ranking by cost:** A < B < C. Concept C's UI can sit on top of A or B later as one more view, because the face layer does not care which shell holds it.

## What Havantechno could borrow

- From both DAWs: a device is a self-contained panel addressed by a stable id, and the shell decides where it appears. That is the registry plus `seq.devices()` design above.
- From the Ableton-style chain: only the selected chain is live, which is also the cheapest rendering model.
- From Logic-style windows: one device's face can be opened bigger. A `size` field in the face data allows a "large" variant without a second face.

## What would not fit (and why)

- **A framework or web components that need a build step:** this is ruled out by the repo's no-build rule. Custom elements do work without a build step (recalled), but they add little over a plain `build()` function here.
- **Animating every panel every frame:** cost scales with the number of visible panels, and the scheduler shares the main thread.
- **Images or bitmap skins for faces:** the repo ships no image files, and CSS plus SVG covers the look.
- **Drawing displays from engine nodes** (`getFrequencyResponse` on internal biquads): it brings back C1. Compute curves from params instead.

## Build notes (plain HTML/CSS/SVG/JS, no build step)

- New files load as `<script>` tags in `index.html` between `song.js` and `studio.js`. Keep ES5 style: IIFEs, `var`, `function`, `hasOwnProperty`.
- `faces*.js` must not touch `document` at load time, so they stay loadable in the selfcheck vm.
- One write path: `seq.setParam(path, v)`. One read path: `dev.obj.params`, polled.
- If the engine ever uses a new node type (for example `AudioWorkletNode` for the meter bank), add a stub to `FakeContext` in `selfcheck.js`, as CLAUDE.md says.

## Recalled, not verified

- An `AnalyserNode` keeps analysing with its output unconnected. The fan-out tap design relies on this. Test it in Chrome, Firefox and Safari.
- `AnalyserNode` copies input on the audio thread and computes the FFT when `get*FrequencyData` is called on the main thread. The audio-thread cost is small.
- `DynamicsCompressorNode.reduction` gives the current gain reduction in dB as a plain number.
- `IntersectionObserver` is the usual way to skip off-screen panels.
- Custom elements (`customElements.define`) work in current browsers without a build step.
- `AudioParam.value` read during automation returns the current computed value in Chrome. I did not rely on this.
- AudioWorklet support in Safari started around version 14.1. Version not checked.
- The `fftSize` range is a power of two from 32 to 32768. This comes from a non-MDN excerpt in my search, not MDN itself.

## Questions for the group

1. **Most important:** does the layout show **one device chain at a time** (Ableton-style bottom panel) or **many device faces at once** (a rack or mixer of open faces)? This sets the performance budget, the cost (A vs B) and whether faces need a compact variant.
2. Is the "channel level" or the "instrument level" the fader users see (C5)? Sections automate `kick.level`, the instrument level, today.
3. Should double-click reset go to the factory default (`spec.value`) or to the song's value (`Song.GUIDANCE.tracks[].params`)? The second needs the song value kept somewhere.
4. F-S2: do you know a permissively licensed knob or meter library small enough to vendor as one file? If not, I would hand-write the four widgets, about 2–3 days.
5. F-S3: does the remix view need a writable pattern model (save and load) in round one, or is a read-only lane view enough at first?
6. F-S4: how many families? I assumed about 5 templates (drum, tonal synth, time FX, dynamics, tone and space). The face cost scales with that number.

What I did not get to: IntersectionObserver, OffscreenCanvas, `DynamicsCompressorNode.reduction`, whether an analyser works with its output unconnected, and AudioWorklet support in Safari. The search budget went to the eight topics listed below.

## Sources

Every web fact above rests on a search excerpt. The one fetch I tried (MDN getFloatTimeDomainData) failed with a DNS error. Code facts come from reading the repo files named in "What I looked at".

- https://developer.mozilla.org/docs/Web/API/AnalyserNode/getFloatTimeDomainData (search excerpt; fetch failed)
- https://huggingface.co/spaces/Docfile/gemini-realtime-console/blob/main/src/lib/worklets/vol-meter.ts (search excerpt)
- https://git.srizan.dev/srizan/archived-vdo.ninja/src/branch/master/podcast/audio-metering.md (search excerpt)
- https://developer.mozilla.org/docs/Web/API/AudioWorkletNode/AudioWorkletNode (search excerpt)
- https://news.ycombinator.com/item?id=2575219 (search excerpt)
- https://gsap.com/community/forums/topic/17587-over-400-svg-elements-performance/ (search excerpt)
- https://ligm.univ-eiffel.fr/~forax/MDN/developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture.html (search excerpt, MDN mirror)
- https://lists.w3.org/Archives/Public/public-pointer-events/2020OctDec/0013.html (search excerpt)
- https://www-igm.univ-mlv.fr/~forax/MDN/developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency.html (search excerpt, MDN mirror)
- https://ligm.univ-eiffel.fr/~forax/MDN/developer.mozilla.org/en-US/docs/Web/API/AudioContext.html (search excerpt, MDN mirror)
- https://developer.apple.com/forums/thread/696356 (search excerpt)
- https://developer.chrome.com/blog/background_tabs (search excerpt; 2017 page)
- https://web.dev/articles/animations-and-performance (search excerpt)

Searches run (8 of 8 planned): AnalyserNode getFloatTimeDomainData; AudioWorklet meter postMessage; SVG vs canvas element counts; setPointerCapture; getOutputTimestamp/outputLatency; Chrome background throttling and audio; compositor-only animation; AudioWorkletNode numberOfInputs.
