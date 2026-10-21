## The studio (synths, sequencer, processors)

`studio/index.html` is a separate page that recreates a Guidance-style electro track
(126 BPM, B) entirely with Web Audio: one synth per element (kick, sub, bass, chord stab,
clap, open and closed hats, shaker, percussion, lead, pad, riser, impact), a 16-step
sequencer with a 200-bar arrangement, and a processor rack (sidechain ducking, filters,
saturation, tempo-synced ping-pong delay, reverb, EQ, compressor, limiter, stereo width).

Serve the folder over HTTP and open http://localhost:8000/studio/ . Press Play, click a
section to jump to it, tweak any synth or processor parameter live, and export a section
or the whole song as a WAV file. The design notes and the analysis of the reference track
are in `docs/superpowers/specs/2026-10-21-guidance-studio-design.md`.

Self-check (no browser needed): `node studio/selfcheck.js`.

## File layout

```
index.html        page shell, loads the scripts in order
CONTRACT.md       the module contract between the source files (v2)
team/             the four-role design discussion (PROTOCOL.md, DIRECTOR-RULINGS.md, round files)
studio/
  index.html      the studio page (transport, sections, channel strips, processor rack, WAV export)
  core.js         shared helpers: AudioParam scheduling, notes and chords, noise, impulse responses
  synths.js       global Synths: one instrument per element of the track
  processors.js   global Processors: effect units, chain(), channel strips, the master chain
  sequencer.js    global Sequencer: transport, patterns, arrangement, mixer, offline render
  song.js         global Song: the Guidance-style patterns, chords, melody and arrangement
  studio.js       the page logic
  selfcheck.js    node smoke test with a fake AudioContext
js/
  sprites.js      pixel art, every sprite drawn procedurally from character grids
  sfx.js          sound effects and chiptune music, synthesised with Web Audio
  levels.js       stage data: enemy catalogue, wave scripts, boss and mid-boss phases,
                  loop modifiers, power-up drops, checkpoints and validate()
  render.js       backdrop, raster effects, HUD, title and overlays
  game.js         the engine: loop, input, collision, bosses, scoring, checkpoints
```

## Everything is generated

There are no image, audio or font files in this project. All the pixel art is
built in code, all the sounds and music are synthesised in the browser, and the
levels are plain data. Clone it, poke at it, change a number in `levels.js` and
reload. `Levels.validate()` tells you if the change broke a stage.
