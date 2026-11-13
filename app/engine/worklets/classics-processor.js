/* Havantechno app engine - worklets/classics-processor.js (AudioWorkletGlobalScope)
 * Whole-voice processors for the classic monos (Patch Crew, P5): 'hvt-tb303' and 'hvt-modeld'.
 * Loaded by app/engine/worklets.js with audioWorklet.addModule; never loaded as a page script.
 *
 * Every note reaches the DSP as AudioParam automation written by app/engine/classics.js at the event time:
 *   pitch (MIDI note), gate (0/1), trig (a counter: a new value = a note event at that sample), slide (1 = the note
 *   at this trig is legato: no envelope retrigger), acc (accent, 303), vel. The knobs are AudioParams too.
 * Nothing travels on the MessagePort except 'stop' (dispose). So an OfflineAudioContext render is deterministic:
 * noise comes from a seeded LCG, never Math.random.
 *
 * Third-party code (see THIRD_PARTY.md):
 * - Open303 by Robin Schmidt (MIT, "Copyright (c) 2009 Robin Schmidt (www.rs-met.com)"): the TB-303 voice structure,
 *   the TeeBeeFilter TB_303 mode (the mystran and kunn diode-ladder approximation), the measured envelope-mod mapping,
 *   the envelope, slide and accent constants, the 303 square shaping and the 12th-order elliptic quarter-band
 *   decimation filter. Ported to JavaScript; the accent sweep is changed (see TB303 below).
 * - ImprovedMoog by Stefano D'Angelo (ISC, "Copyright 2012 Stefano D'Angelo <zanga.mail@gmail.com>", via
 *   ddiakopoulos/MoogLadders): the Model D ladder, after D'Angelo and Valimaki, ICASSP 2013.
 *
 * Permission notices of the ported sources:
 *   Open303 (MIT): Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 *   associated documentation files (the "Software"), to deal in the Software without restriction, including without
 *   limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 *   Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *   The above copyright notice and this permission notice shall be included in all copies or substantial portions of
 *   the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
 *   LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 *   THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 *   CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *   THE SOFTWARE.
 *   ImprovedMoog (ISC): Permission to use, copy, modify, and/or distribute this software for any purpose with or
 *   without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all
 *   copies. THIS SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE
 *   INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 *   SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR
 *   PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION
 *   WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
'use strict';

var OS = 4;                      // oversampling factor of the oscillators and ladders (Open303 uses 4)
var TWO_PI = 2 * Math.PI;

// ------------------------------------------------------------------ shared DSP
function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
function pv(arr, i) { return arr.length > 1 ? arr[i] : arr[0]; }

// deterministic white noise in [-1, 1): 32-bit LCG (Numerical Recipes constants)
function Lcg(seed) { this.s = seed >>> 0; }
Lcg.prototype.next = function () { this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0; return this.s / 2147483648 - 1; };

// PolyBLEP / PolyBLAMP residuals (t = phase in [0, 1), dt = phase increment)
function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
function blamp(t, dt) {
  if (t < dt) { t = t / dt - 1; return -t * t * t / 3; }
  if (t > 1 - dt) { t = (t - 1) / dt + 1; return t * t * t / 3; }
  return 0;
}
// tanh by a [7/6] Pade approximant, exact to about 1e-6 for |x| < 4.97 and clamped beyond (Math.tanh is the cost centre)
function th(x) {
  if (x > 4.97) return 1;
  if (x < -4.97) return -1;
  var x2 = x * x;
  return x * (135135 + x2 * (17325 + x2 * (378 + x2))) / (135135 + x2 * (62370 + x2 * (3150 + 28 * x2)));
}
// exp(-k / (tau fs)) recomputed only when tau changes
function Coef(k) { this.k = k; this.tau = -1; this.c = 0; }
Coef.prototype.of = function (tau) { if (tau !== this.tau) { this.tau = tau; this.c = Math.exp(-this.k / (tau * sampleRate)); } return this.c; };
function wrap(x) { return x - Math.floor(x); }
// band-limited shapes, amplitude about +-1
function saw(t, dt) { return 2 * t - 1 - blep(t, dt); }
function pulse(t, dt, d) { return (t < d ? 1 : -1) + blep(t, dt) - blep(wrap(t - d), dt) - (2 * d - 1); }
function tri(t, dt) {
  var y = t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
  return y + 4 * dt * (blamp(t, dt) - blamp(wrap(t + 0.5), dt));
}

// one-pole high-pass (dspguide form, as Open303's OnePoleFilter HIGHPASS) and all-pass (DAFX form)
function OnePole(mode, fc, fs) {
  this.x1 = 0; this.y1 = 0;
  if (mode === 'hp') { var x = Math.exp(-TWO_PI * fc / fs); this.b0 = 0.5 * (1 + x); this.b1 = -0.5 * (1 + x); this.a1 = x; }
  else { var t = Math.tan(Math.PI * fc / fs), a = (t - 1) / (t + 1); this.b0 = a; this.b1 = 1; this.a1 = -a; }
}
OnePole.prototype.run = function (x) { var y = this.b0 * x + this.b1 * this.x1 + this.a1 * this.y1; this.x1 = x; this.y1 = y; return y; };

// RBJ biquad low-pass (Open303's amp de-clicker: 200 Hz, 12 dB/oct)
function LowPass2(fc, q, gain, fs) {
  var w = TWO_PI * fc / fs, c = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al;
  this.b0 = gain * (1 - c) / 2 / a0; this.b1 = gain * (1 - c) / a0; this.b2 = this.b0;
  this.a1 = -2 * c / a0; this.a2 = (1 - al) / a0;
  this.x1 = this.x2 = this.y1 = this.y2 = 0;
}
LowPass2.prototype.run = function (x) {
  var y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
  this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y;
};

// Open303 EllipticQuarterBandFilter (MIT): 12th-order elliptic low-pass at a quarter of the band, the decimator of the
// 4x oversampled path. Direct form II, coefficients verbatim.
var EA = [-9.1891604652189471, 40.177553696870497, -110.11636661771178, 210.18506612078195, -293.84744771903240,
  308.16345558359234, -244.06786780384243, 144.81877911392738, -62.770692151724198, 18.867762095902137,
  -3.5327094230551848, 0.31183189275203149];
var EB = [0.00013671732099945628, -0.00055538501265606384, 0.0013681887636296387, -0.0022158566490711852,
  0.0028320091007278322, -0.0029776933151090413, 0.0030283628243514991, -0.0029776933151090413,
  0.0028320091007278331, -0.0022158566490711861, 0.0013681887636296393, -0.00055538501265606384,
  0.00013671732099945636];
function Elliptic() { this.w = new Float64Array(12); }
Elliptic.prototype.run = function (x) {
  var w = this.w, t = x + 1e-18, y, i;
  for (i = 0; i < 12; i++) t -= EA[i] * w[i];
  y = EB[0] * t;
  for (i = 0; i < 12; i++) y += EB[i + 1] * w[i];
  for (i = 11; i > 0; i--) w[i] = w[i - 1];
  w[0] = t;
  return y;
};

// ================================================================== TB-303
// Open303's voice (rosic_Open303.h getSample, MIT), with these changes:
// - the accent sweep RC (Open303 rc2, fixed 15 ms) takes a time constant that grows with the resonance knob, as the
//   303's second resonance gang sets the accent sweep capacitor's charge resistance; with a slow RC the sweep builds
//   over consecutive accents (Open303 value at resonance 0, 'prior' above it);
// - a soft clip inside the ladder's feedback path keeps the top of the resonance range screaming but bounded;
// - the band-limited oscillator is PolyBLEP at the 4x rate instead of mip-mapped tables; the square is Open303's
//   tanh-shaped saw reduced to its duty cycle (53 % low, 47 % high).
var T303 = {
  ampDecay: 1.23,                // s, amp envelope decay (Open303 ampEnv.setDecay(1230))
  normalRelease: 0.001,          // s, amp release (Open303 normalAmpRelease 1 ms)
  accentRelease: 0.05,           // s (Open303 accentAmpRelease 50 ms)
  accentDecay: 0.2,              // s, main envelope decay on accented notes (Open303 accentDecay 200 ms; the decay knob is ignored)
  ampByEnv: 0.45, ampByAccent: 4, // VCA gets 0.45 x MEG (+ 4 x accent x MEG) while the note is on (Open303)
  slewScale: 0.2,                // pitch slew time constant = 0.2 x slideTime (Open303)
  sweepTau0: 0.015, sweepTau1: 0.1, // s, accent sweep RC at resonance 0 (Open303 rc2) and 1 (prior)
  hp1: 44.486, hp2: 24.167, ap: 14.008, fbHp: 150, // Hz (Open303)
  cutFloor: 200, cutCeil: 20000, // Hz (Open303 TeeBeeFilter clamp)
  duty: 0.47,                    // square: Open303 -tanh(dB2amp(36.9) x saw + 4.37) is high for 47 % of a period
  outGain: 0.3                   // calibration: a resonance 0.8 / envMod 0.7 / accent 0.7 line with six accents peaks near 0.85 (P5, measured; was 0.5)
};
// Open303 calculateEnvModScalerAndOffset, measured mapping (useMeasuredMapping = true)
function envMap(cutoff, envMod) {
  var c0 = 313.8152786059267, c1 = 2394.411986817546;
  var e = clamp(envMod, 0, 1), c = Math.log(cutoff / c0) / Math.log(c1 / c0);
  var sLo = 3.773996325111173 * e + 0.736965594166206, sHi = 4.194548788411135 * e + 0.864344900642434;
  return { scaler: (1 - c) * sLo + c * sHi, offset: 0.048292930943553 * c + 0.294391201442418 };
}

class Tb303Processor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'pitch', defaultValue: 36, minValue: 0, maxValue: 127 },
      { name: 'gate', defaultValue: 0, minValue: 0, maxValue: 1 },
      { name: 'trig', defaultValue: 0, minValue: 0, maxValue: 1e9 },
      { name: 'slide', defaultValue: 0, minValue: 0, maxValue: 1 },
      { name: 'acc', defaultValue: 0, minValue: 0, maxValue: 1 },
      { name: 'vel', defaultValue: 0.85, minValue: 0, maxValue: 2 },
      { name: 'tune', defaultValue: 0, minValue: -1200, maxValue: 1200 },
      { name: 'wave', defaultValue: 0, minValue: 0, maxValue: 1 },
      { name: 'cutoff', defaultValue: 1000, minValue: 20, maxValue: 20000 },
      { name: 'resonance', defaultValue: 0.5, minValue: 0, maxValue: 1 },
      { name: 'envMod', defaultValue: 0.5, minValue: 0, maxValue: 1 },
      { name: 'decay', defaultValue: 400, minValue: 10, maxValue: 10000 },
      { name: 'accent', defaultValue: 0.6, minValue: 0, maxValue: 1 },
      { name: 'slideTime', defaultValue: 60, minValue: 0, maxValue: 2000 }
    ];
  }
  constructor(options) {
    super();
    var fs = sampleRate, fo = fs * OS;
    this.alive = true;
    // test probe (tools/tb303-bench.js only, not a parameter): a second output carries the instantaneous cutoff (Hz),
    // oscillator frequency (Hz) and VCA gain per sample
    this.probe = !!(options && options.processorOptions && options.processorOptions.probe);
    this.port.onmessage = (e) => { if (e.data === 'stop') this.alive = false; };
    this.lastTrig = 0; this.gateOn = false; this.idle = true; this.quiet = 0;
    this.freq = 65.4; this.phase = 0;
    this.env = 0; this.envC = Math.exp(-1 / (1 * fs));
    this.amp = 0; this.ampTarget = 0; this.ampC = Math.exp(-1 / (T303.ampDecay * fs)); this.noteOn = false;
    this.accentOn = false; this.accentGain = 0; this.sweep = 0; this.velL = 0.85;
    this.hp1 = new OnePole('hp', T303.hp1, fo); this.fbHp = new OnePole('hp', T303.fbHp, fo);
    this.ap = new OnePole('ap', T303.ap, fs); this.hp2 = new OnePole('hp', T303.hp2, fs);
    this.declick = new LowPass2(200, Math.SQRT1_2, 1, fs);   // gain 1: Open303's amp2dB(sqrt(0.5)) gain line is a bug (P1)
    this.dec = new Elliptic();
    this.y1 = this.y2 = this.y3 = this.y4 = 0;
    this.slewC = new Coef(1); this.sweepC = new Coef(1); this.resL = -1; this.rSk = 0;
  }
  reset() {
    this.phase = 0; this.y1 = this.y2 = this.y3 = this.y4 = 0;
    this.hp1 = new OnePole('hp', T303.hp1, sampleRate * OS); this.fbHp = new OnePole('hp', T303.fbHp, sampleRate * OS);
    this.dec = new Elliptic();
  }
  process(inputs, outputs, P) {
    var out = outputs[0] && outputs[0][0];
    if (!out) return this.alive;
    var n = out.length, fs = sampleRate, fo = fs * OS, i, k;
    var pr = this.probe && outputs[1] ? outputs[1] : null;
    var pP = P.pitch, pG = P.gate, pT = P.trig, pS = P.slide, pA = P.acc, pV = P.vel, pTu = P.tune, pW = P.wave,
        pC = P.cutoff, pR = P.resonance, pE = P.envMod, pD = P.decay, pAc = P.accent, pSt = P.slideTime;
    for (i = 0; i < n; i++) {
      var trig = pv(pT, i), gate = pv(pG, i) >= 0.5;
      if (trig !== this.lastTrig) {                         // a note event at this sample
        this.lastTrig = trig;
        var acc = pv(pA, i) >= 0.5, legato = pv(pS, i) >= 0.5 && this.gateOn;
        this.accentOn = acc;
        this.accentGain = acc ? pv(pAc, i) : 0;
        this.envC = Math.exp(-1 / ((acc ? T303.accentDecay : Math.max(0.01, pv(pD, i) / 1000)) * fs));
        this.releaseC = Math.exp(-1 / ((acc ? T303.accentRelease : T303.normalRelease) * fs));
        this.velL = pv(pV, i);
        if (!legato) {                                      // Open303 triggerNote
          if (this.idle) this.reset();
          this.freq = mtof(pv(pP, i) + pv(pTu, i) / 100);
          this.env = 1 / this.envC;
          this.amp = Math.max(this.amp, 0); this.noteOn = true; this.ampStage = 1;
        }                                                   // else Open303 slideToNote: pitch slews, nothing retriggers
        this.gateOn = true; this.idle = false; this.quiet = 0;
      } else if (!gate && this.gateOn) {                    // gate off: amp envelope release
        this.gateOn = false; this.noteOn = false;
      } else if (gate && !this.gateOn && this.noteOn) this.gateOn = true;
      if (this.idle) { out[i] = 0; continue; }
      // pitch slew (Open303 pitchSlewLimiter, a leaky integrator in Hz)
      var target = mtof(pv(pP, i) + pv(pTu, i) / 100), st = Math.max(0.0002, T303.slewScale * pv(pSt, i) / 1000);
      this.freq = target + this.slewC.of(st) * (this.freq - target);
      // main envelope (Open303 DecayEnvelope) and the accent sweep RC
      this.env *= this.envC;
      var res = pv(pR, i), tauS = T303.sweepTau0 + (T303.sweepTau1 - T303.sweepTau0) * res;
      var sIn = this.accentGain > 0 ? this.env : 0;
      this.sweep = sIn + this.sweepC.of(tauS) * (this.sweep - sIn);
      var cut = pv(pC, i), m = envMap(cut, pv(pE, i));
      var fc = clamp(cut * Math.pow(2, m.scaler * (this.env - m.offset) + this.accentGain * this.sweep), T303.cutFloor, T303.cutCeil);
      // amp envelope (Open303 AnalogEnvelope: attack 0, decay 1.23 s to 0, release 1 or 50 ms) plus the MEG while on
      if (this.ampStage === 1) { this.amp = 1; this.ampStage = 2; }
      else if (this.noteOn) this.amp *= this.ampC;
      else this.amp *= this.releaseC;
      var a = this.amp;
      if (this.noteOn) a += (T303.ampByEnv + this.accentGain * T303.ampByAccent) * this.env;
      a = this.declick.run(a);
      // TeeBeeFilter TB_303 coefficients (calculateCoefficientsApprox4, mode TB_303)
      var r = res === this.resL ? this.rSk : (this.resL = res, this.rSk = (1 - Math.exp(-3 * res)) / (1 - Math.exp(-3))), fx = fc / fo * Math.SQRT1_2;
      var b0 = (0.00045522346 + 6.1922189 * fx) / (1 + 12.358354 * fx + 4.4156345 * fx * fx);
      var kf = fx * (fx * (fx * (fx * (fx * (fx + 7198.6997) - 5837.7917) - 476.47308) + 614.95611) + 213.87126) + 16.998792;
      var g = ((kf / 17 - 1) * r + 1) * (1 + r);
      kf *= r;
      var dt = this.freq / fo, sq = pv(pW, i) >= 0.5, x = 0, y = 0;
      for (k = 0; k < OS; k++) {
        var ph = this.phase;
        x = sq ? pulse(ph, dt, T303.duty) : -saw(ph, dt);   // Open303 negates the oscillator (falling saw)
        this.phase = ph + dt; if (this.phase >= 1) this.phase -= 1;
        x = this.hp1.run(x);
        // diode ladder: y0 = in - HP(k y4) (Open303), the feedback soft-clipped (P5)
        var fb = this.fbHp.run(kf * this.y4);
        fb = fb / (1 + Math.abs(fb) * 0.15);
        var y0 = x - fb;
        this.y1 += 2 * b0 * (y0 - this.y1 + this.y2);
        this.y2 += b0 * (this.y1 - 2 * this.y2 + this.y3);
        this.y3 += b0 * (this.y2 - 2 * this.y3 + this.y4);
        this.y4 += b0 * (this.y3 - 2 * this.y4);
        y = this.dec.run(2 * g * this.y4);
      }
      y = this.hp2.run(this.ap.run(y));
      var o = y * a * this.velL * T303.outGain;
      out[i] = o;
      if (pr) { pr[0][i] = fc; if (pr[1]) pr[1][i] = this.freq; if (pr[2]) pr[2][i] = a; }
      // sleep when silent and released (state only; deterministic)
      if (!this.gateOn && this.amp < 1e-5 && Math.abs(o) < 1e-6) { if (++this.quiet > fs * 0.05) this.idle = true; } else this.quiet = 0;
    }
    return this.alive;
  }
}
registerProcessor('hvt-tb303', Tb303Processor);

// ================================================================== Model D
// Block list after P2 (transcripts/P2-modeld.md sections 10 and 14, the CA-72 measurements). The processor's params are
// PHYSICAL values; classics.js maps the panel marks of the spec (cutoff -5..+5, the 0..10 knobs) to them:
//   cutoff = the ladder's tuning frequency in Hz (where it sings: 1.578 x the panel corner, CA-72), emphasis = k,
//   contour = octaves at full contour, glide / glideDown = slide rates in octaves per second, mix* = linear gains,
//   fAttack / attack = attack RC time constants, fDecay / decay = decay RC time constants, fSustain / sustain = levels,
//   osc*Detune = semitones (osc3 free: the knob is widened x4.12 in the processor), tune = cents.
var MD = {
  rangeOct: [-6.74, -2, -1, 0, 1, 2],        // 'lo' (4.74 oct under 32'), '32', '16', '8', '4', '2' (CA-72, source)
  duty: [0.5, 0.3, 0.18],                     // square, wide, narrow (CA-72 light.rs, source)
  wTri: 0.895, wPulse: 1.057,                 // level weights against a saw of 1.0 (CA-72 light.rs, source)
  noiseGain: 0.447,                           // white RMS 0.258 = half the RMS of osc 1's triangle (-6 dB, service manual 5.8 via CA-72)
  pinkGain: 0.149, redGain: 5.12,             // pink and red scaled to the white noise's RMS 0.258 (P5, computed in Node)
  redPole: 106,                               // Hz, the red noise of the modulation path (CA-72)
  modInv: 0.838,                              // modulation mix amplifier gain (CA-72 board4, source)
  modPitchSt: 6.75 / 0.838,                   // modAmount 1, a full-level square: 13.5 st p-p on osc 1 and 2 (CA-72, source)
  modCutOct: 2 / 0.838,                       // ... and 4 oct p-p of cutoff (CA-72, source)
  free3: 198.8, free3Wide: 68.8 / 16.7,       // osc 3 free-running: 198.8 Hz at 8' centred; knob span x4.12 (CA-72, source)
  pivot: 36,                                  // keyboard tracking pivot C2 (CA-72 change 11)
  trackBoth: 0.967,                           // both keyboard switches (CA-72, source)
  drive: 0.6,                                 // ladder input scale: one osc at mark 4 linear within 0.5 dB, three at 10 saturate (P5)
  outScale: 2.2,                              // output calibration (P5, measured)
  tuneFix: 5.1,                               // ladder tuning correction for the one-sample feedback delay (P5, measured)
  tuneGain: 1.025,                            // the ladder sings 2.5 % flat at emphasis 10 (k 4.5): raise the tuning (P5, measured)
  seedNoise: 1e-6,                            // thermal noise at the ladder input, so it can sing with no source (P5)
  rFilter: 9.3 / 4.49, rLoud: 9.3 / 5.28,     // attack: RC toward 9.3 V cut at 4.49 V (filter) / 5.28 V (loudness) (CA-72 board2)
  dump: 0.00243,                              // s, release RC with the decay switch off: -6 to -40 dB in 9.5 ms (CA-72)
  offsetCt: 2, driftCt: 1.5, driftTau: 4,     // static offset, drift walk and its time constant per oscillator (P2 14.3, prior)
  cutDriftOct: 0.01,
  outGain: 0.56                               // calibration: the default patch's eighth-note bass line peaks near 0.85 (P5, measured; was 1)
};

class ModelDProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    var AR = { pitch: 1, gate: 1, trig: 1, slide: 1, vel: 1, cutoff: 1, emphasis: 1, contour: 1 };   // the rest are read once per block
    var d = function (name, def, min, max) { return { name: name, defaultValue: def, minValue: min, maxValue: max, automationRate: AR[name] ? 'a-rate' : 'k-rate' }; };
    return [
      d('pitch', 48, 0, 127), d('gate', 0, 0, 1), d('trig', 0, 0, 1e9), d('slide', 0, 0, 1), d('vel', 0.85, 0, 2),
      d('tune', 0, -100, 100), d('glide', 10, 0.01, 1e4), d('glideDown', 5, 0.01, 1e4), d('glideOn', 0, 0, 1),
      d('modMix', 0, 0, 1), d('modAmount', 0.5, 0, 1), d('oscMod', 0, 0, 1), d('filterMod', 0, 0, 1),
      d('osc1Range', 3, 0, 5), d('osc1Wave', 2, 0, 5), d('osc2Range', 3, 0, 5), d('osc2Wave', 2, 0, 5),
      d('osc2Detune', 0, -9, 9), d('osc3Range', 3, 0, 5), d('osc3Wave', 2, 0, 5), d('osc3Detune', 0, -9, 9),
      d('osc3Keys', 1, 0, 1), d('mixOsc1', 0.7, 0, 2), d('mixOsc2', 0.7, 0, 2), d('mixOsc3', 0.5, 0, 2),
      d('mixNoise', 0, 0, 2), d('noiseType', 0, 0, 1), d('mixFeedback', 0, 0, 2),
      d('cutoff', 1073, 5, 40000), d('emphasis', 0.3, 0, 6), d('contour', 4, 0, 12),
      d('keyTrack1', 1, 0, 1), d('keyTrack2', 0, 0, 1),
      d('fAttack', 0.005, 0.0001, 30), d('fDecay', 0.5, 0.0001, 30), d('fSustain', 0.16, 0, 1),
      d('attack', 0.003, 0.0001, 30), d('decay', 0.5, 0.0001, 30), d('sustain', 0.58, 0, 1), d('decaySwitch', 1, 0, 1)
    ];
  }
  constructor(options) {
    super();
    var seed = (options && options.processorOptions && options.processorOptions.seed) || 22051, j;
    this.alive = true;
    this.port.onmessage = (e) => { if (e.data === 'stop') this.alive = false; };
    this.rng = new Lcg(seed); this.drng = new Lcg(seed ^ 0x5bd1e995);
    this.lastTrig = 0; this.gateOn = false; this.started = false; this.idle = true; this.quiet = 0; this.glideNow = false;
    this.note = 48; this.ph = [0, 0, 0];
    this.offset = []; this.drift = [0, 0, 0, 0];
    for (j = 0; j < 3; j++) this.offset.push(this.drng.next() * MD.offsetCt / 100);
    this.eF = 0; this.eA = 0; this.stF = 0; this.stA = 0;   // levels; stage 0 off, 1 attack, 2 decay/sustain, 3 release
    this.pk = [0, 0, 0]; this.red = 0;
    this.fbLp = 0; this.prevOut = 0; this.ctl = 0;
    this.V = [0, 0, 0, 0]; this.dV = [0, 0, 0, 0]; this.tV = [0, 0, 0, 0];
    this.dec = new Elliptic();
    this.cC = [new Coef(1), new Coef(1), new Coef(1), new Coef(1), new Coef(1), new Coef(1)];
    this.fbC = 1 - Math.exp(-TWO_PI * 4000 / sampleRate); this.redC = 1 - Math.exp(-TWO_PI * MD.redPole / sampleRate);
    this.dC = Math.exp(-64 / (MD.driftTau * sampleRate));
    this.dt1 = this.dt2 = this.dt3 = 0; this.g = 0; this.src = 0;
  }
  osc(t, dt, w, three) {
    switch (w) {
      case 0: return MD.wTri * tri(t, dt);
      case 1: return three ? -saw(t, dt) : 0.5 * (MD.wTri * tri(t, dt) + saw(t, dt));   // osc 3: reverse saw; 1, 2: shark-fin (tri-saw mix, prior)
      case 2: return saw(t, dt);
      case 3: return MD.wPulse * pulse(t, dt, MD.duty[0]);
      case 4: return MD.wPulse * pulse(t, dt, MD.duty[1]);
      default: return MD.wPulse * pulse(t, dt, MD.duty[2]);
    }
  }
  naive(t, w) {                                              // modulation copy of osc 3, not band-limited (P2 block 2)
    switch (w) {
      case 0: return t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
      case 1: return 1 - 2 * t;
      case 2: return 2 * t - 1;
      case 3: return t < MD.duty[0] ? 1 : -1;
      case 4: return t < MD.duty[1] ? 1 : -1;
      default: return t < MD.duty[2] ? 1 : -1;
    }
  }
  process(inputs, outputs, P) {
    var out = outputs[0] && outputs[0][0];
    if (!out) return this.alive;
    var n = out.length, fs = sampleRate, fo = fs * OS, i, k, j;
    var VT2 = 2 * 0.312, h = 1 / (2 * fo), V = this.V, dV = this.dV, tV = this.tV;
    // k-rate knobs: read once per block
    var k0 = function (a) { return a[0]; };
    var tune = k0(P.tune) / 100, upR = k0(P.glide), dnR = k0(P.glideDown), glOn = k0(P.glideOn) >= 0.5;
    var mm = k0(P.modMix), mAmt = k0(P.modAmount), oscMod = k0(P.oscMod) >= 0.5, filtMod = k0(P.filterMod) >= 0.5;
    var g3m = MD.modInv * Math.min(1, 2 * (1 - mm)), gnm = MD.modInv * Math.min(1, 2 * mm);
    var w1 = Math.round(k0(P.osc1Wave)), w2 = Math.round(k0(P.osc2Wave)), w3 = Math.round(k0(P.osc3Wave));
    var r1 = MD.rangeOct[Math.round(k0(P.osc1Range))], r2 = MD.rangeOct[Math.round(k0(P.osc2Range))], r3 = MD.rangeOct[Math.round(k0(P.osc3Range))];
    var d2 = k0(P.osc2Detune), d3 = k0(P.osc3Detune), keys3 = k0(P.osc3Keys) >= 0.5;
    var g1 = k0(P.mixOsc1), g2 = k0(P.mixOsc2), g3 = k0(P.mixOsc3), gn = k0(P.mixNoise), gf = k0(P.mixFeedback), pink = k0(P.noiseType) >= 0.5;
    var kt1 = k0(P.keyTrack1) >= 0.5, kt2 = k0(P.keyTrack2) >= 0.5;
    var track = kt1 && kt2 ? MD.trackBoth : (kt1 ? 1 / 3 : 0) + (kt2 ? 2 / 3 : 0);
    var fA = k0(P.fAttack), fD = k0(P.fDecay), fS = k0(P.fSustain), aA = k0(P.attack), aD = k0(P.decay), aS = k0(P.sustain);
    var dsw = k0(P.decaySwitch) >= 0.5, fmax = Math.min(20000, 0.45 * fs);
    var free3 = MD.free3 * Math.pow(2, r3 + MD.free3Wide * d3 / 12);
    var pP = P.pitch, pG = P.gate, pT = P.trig, pS = P.slide, pV = P.vel, pC = P.cutoff, pE = P.emphasis, pK = P.contour;
    var dt1 = this.dt1, dt2 = this.dt2, dt3 = this.dt3, g = this.g, src = this.src, kres = 0;
    var upStep = upR / fs * 12, dnStep = dnR / fs * 12;      // semitones per sample
    for (i = 0; i < n; i++) {
      var trig = pv(pT, i), gate = pv(pG, i) >= 0.5;
      if (trig !== this.lastTrig) {
        this.lastTrig = trig;
        var legato = pv(pS, i) >= 0.5 && this.gateOn;
        if (!this.started) { this.note = pv(pP, i) + tune; this.started = true; }
        if (!legato) { this.stF = 1; this.stA = 1; }        // single triggering: contours restart only after a gap
        this.glideNow = legato;                              // glide only between held (overlapping or slid) notes (CA-72)
        this.vel = pv(pV, i);
        this.gateOn = true; this.idle = false; this.quiet = 0;
      } else if (!gate && this.gateOn) { this.gateOn = false; this.stF = 3; this.stA = 3; }
      if (this.idle) { out[i] = 0; continue; }
      // pitch CV in semitones; glide is a constant rate (octaves per second, up faster than down)
      var target = pv(pP, i) + tune;
      if (glOn && this.glideNow) {
        var dn = target - this.note;
        this.note = dn > 0 ? (dn > upStep ? this.note + upStep : target) : (-dn > dnStep ? this.note - dnStep : target);
      } else this.note = target;
      // contours: attack is an RC toward R x peak cut at the peak; decay and release are RCs
      this.eF = this.contour(this.eF, 'stF', fA, fD, fS, dsw, MD.rFilter, 0);
      this.eA = this.contour(this.eA, 'stA', aA, aD, aS, dsw, MD.rLoud, 3);
      // noise (base rate, held across the oversampled loop); modulation noise is one step redder
      var w = this.rng.next(), pk = this.pk;
      pk[0] = 0.99765 * pk[0] + w * 0.0990460; pk[1] = 0.96300 * pk[1] + w * 0.2965164; pk[2] = 0.57000 * pk[2] + w * 1.0526913;
      var pinkS = (pk[0] + pk[1] + pk[2] + w * 0.1848) * MD.pinkGain;
      this.red += this.redC * (w - this.red);
      var noise = pink ? pinkS : w * MD.noiseGain, mNoise = pink ? this.red * MD.redGain : pinkS;
      kres = pv(pE, i);
      // control rate (every 4 samples): drift, oscillator increments, modulation source, cutoff
      if ((this.ctl++ & 3) === 0) {
        if ((this.ctl & 63) === 1) for (j = 0; j < 4; j++) this.drift[j] = this.dC * this.drift[j] + (1 - this.dC) * 8 * this.drng.next();
        var nt = this.note, dr = MD.driftCt / 100;
        src = -(g3m * this.naive(this.ph[2], w3) + gnm * mNoise);
        var om = oscMod ? src * mAmt * MD.modPitchSt : 0;
        dt1 = mtof(nt + 12 * r1 + om + this.offset[0] + this.drift[0] * dr) / fo;
        dt2 = mtof(nt + 12 * r2 + d2 + om + this.offset[1] + this.drift[1] * dr) / fo;
        dt3 = (keys3 ? mtof(nt + 12 * r3 + d3 + this.offset[2] + this.drift[2] * dr) : free3) / fo;
        // cutoff CV in octaves: knob, keyboard (pivot C2), contour, modulation, drift
        var oct = track * (nt - MD.pivot) / 12 + pv(pK, i) * this.eF + (filtMod ? src * mAmt * MD.modCutOct : 0) + this.drift[3] * MD.cutDriftOct;
        var fc = clamp(pv(pC, i) * Math.pow(2, oct), 5, fmax);
        fc = MD.tuneGain * fc / Math.max(0.5, 1 - MD.tuneFix * fc / fo);
        var x = Math.min(Math.PI * fc / fo, 0.45 * Math.PI);
        g = 4 * Math.PI * 0.312 * fc * (1 - x) / (1 + x);
      }
      var y = 0;
      this.fbLp += this.fbC * (this.prevOut - this.fbLp);
      var ext = gn * noise + gf * this.fbLp + MD.seedNoise * w, ph = this.ph;
      for (k = 0; k < OS; k++) {
        var m = ext;
        if (g1 > 0) m += g1 * this.osc(ph[0], dt1, w1, false);
        if (g2 > 0) m += g2 * this.osc(ph[1], dt2, w2, false);
        if (g3 > 0) m += g3 * this.osc(ph[2], dt3, w3, true);
        ph[0] += dt1; if (ph[0] >= 1) ph[0] -= 1;
        ph[1] += dt2; if (ph[1] >= 1) ph[1] -= 1;
        ph[2] += dt3; if (ph[2] >= 1) ph[2] -= 1;
        // ImprovedMoog (D'Angelo, ISC): trapezoidal stages, tanh per stage, feedback from the previous V3. The input
        // pair's tanh is the mixer overdrive (CA-72 board4: no separate clipper)
        var dV0 = -g * (th((MD.drive * m + kres * V[3]) / VT2) + tV[0]);
        V[0] += (dV0 + dV[0]) * h; dV[0] = dV0; tV[0] = th(V[0] / VT2);
        var dV1 = g * (tV[0] - tV[1]);
        V[1] += (dV1 + dV[1]) * h; dV[1] = dV1; tV[1] = th(V[1] / VT2);
        var dV2 = g * (tV[1] - tV[2]);
        V[2] += (dV2 + dV[2]) * h; dV[2] = dV2; tV[2] = th(V[2] / VT2);
        var dV3 = g * (tV[2] - tV[3]);
        V[3] += (dV3 + dV[3]) * h; dV[3] = dV3; tV[3] = th(V[3] / VT2);
        y = this.dec.run(-V[3] * MD.outScale);
      }
      var o = y * this.eA * this.vel * MD.outGain;
      this.prevOut = o;
      out[i] = o;
      if (this.stA === 0 && Math.abs(o) < 1e-6) { if (++this.quiet > fs * 0.05) this.idle = true; } else this.quiet = 0;
    }
    this.dt1 = dt1; this.dt2 = dt2; this.dt3 = dt3; this.g = g; this.src = src;
    return this.alive;
  }
  // a: attack RC time constant, R: attack target / peak; d: decay RC time constant; s: sustain level
  contour(lv, key, a, d, s, dsw, R, c) {
    var st = this[key], C = this.cC;
    if (st === 1) {
      lv += (R - lv) * (1 - C[c].of(Math.max(a, 0.0001)));
      if (lv >= 1) { lv = 1; this[key] = 2; }
    } else if (st === 2) {
      lv = s + (lv - s) * C[c + 1].of(Math.max(d, 0.0001));
    } else if (st === 3) {
      lv *= C[c + 2].of(dsw ? Math.max(d, 0.0001) : MD.dump);
      if (lv < 1e-6) { lv = 0; this[key] = 0; }
    }
    return lv;
  }
}
registerProcessor('hvt-modeld', ModelDProcessor);

// ================================================================== Juno (six voices, one processor)
// After P3 (transcripts/P3-juno.md sections 1 to 11): Juno-60 measured tables (pendragon-andyh/Juno60, MIT) and Junox
// constants (pendragon-andyh/junox, GPL-3.0-or-later; numbers only, cited by file and line in log-P5.md); no Junox code
// is ported. Per voice: free-running PolyBLEP DCO (saw, pulse with PWM, sub one octave down, shared 5 kHz noise), the
// Junox mix compression, a 4-pole zero-delay (TPT) ladder with one tanh at the loop input, an ADSR with the Juno-60
// shapes, a gate envelope for VCA gate mode. Shared: the triangle LFO with delay and fade (auto or per-note trigger),
// the four-position HPF, the stereo two-line chorus (triangle LFO, lines in antiphase), optional chorus hiss.
// Voice allocation is on the main thread (classics.js); each voice has its own pitchN, gateN, trigN and glideN params.
// The processor's knob params are physical values; classics.js maps the 0..1 sliders.
var JU = {
  voices: 6,
  mixSaw: 0.2, mixPulse: 0.2, mixKnee: 0.26, mixAbove: 0.3,   // Junox junox.js 239-252 (source)
  mixNorm: 5,                                  // 1 / 0.2: a lone saw enters the filter at amplitude 1 (P5)
  noiseLp: 5000,                               // Hz, noise low-pass (Juno60 Noise README; Junox voice.js 126)
  subLp: 4200,                                 // Hz, the sub's passive RC (KR-106, via P3; source)
  gateA: 0.003, gateR: 0.006,                  // s, VCA gate mode (Juno60 Gate README; paper)
  attackTarget: 1 / 0.632,                     // attack is (1 - e^-x) / 0.632 (Juno60 Envelope README; paper)
  shortRelease: 0.01, shortBelow: 0.02,        // release 10 ms when sustain <= 0.02 (Junox juno60Envelope.js 214; source)
  hpfShelf: 65, hpfShelfGain: 2, hpf2: 225, hpf3: 720,   // HPF positions (P3 section 2; paper, sources disagree)
  chorusRate: [0, 0.513, 0.863],               // Hz, triangle (Juno60 Chorus README; paper)
  chorusMin: 0.00166, chorusMax: 0.00535,      // s, delay swing (Juno60 Chorus README; paper)
  chorusDry: 0.44, chorusWet: 0.56,            // Junox chorus.js (source)
  chorusPre: 7237, chorusPost: 10644,          // Hz, one-pole low-passes around the lines (Junox chorus.js 133-135; source)
  hiss: 0.004,                                 // chorus hiss level at chorusNoise 1 (P5, prior)
  unisonGain: 0.6,                             // per voice with six voices on one note (P5, prior: the hardware is louder in unison)
  phase: [0, 0.81, 0.29, 0.64, 0.89, 0.86],    // fixed start phases of the free-running DCOs (Youth106: arbitrary offsets); chosen so unison sums near sqrt(6) per harmonic (P5)
  seedNoise: 1e-6,                             // thermal seed so the ladder can self-oscillate (KR-106 idea)
  outGain: 0.32                                // calibration (P5, measured)
};

class JunoProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    var out = [], i, d = function (name, def, min, max, rate) { out.push({ name: name, defaultValue: def, minValue: min, maxValue: max, automationRate: rate || 'k-rate' }); };
    for (i = 0; i < JU.voices; i++) {
      d('pitch' + i, 60, 0, 127, 'a-rate'); d('gate' + i, 0, 0, 1, 'a-rate'); d('trig' + i, 0, 0, 1e9, 'a-rate'); d('glide' + i, 0, 0, 10, 'a-rate');
    }
    d('tune', 0, -100, 100); d('unison', 0, 0, 1);
    d('lfoRate', 1.9, 0.01, 50); d('lfoDelay', 0, 0, 10); d('lfoFade', 0, 0, 10); d('lfoAuto', 1, 0, 1);
    d('dcoLfo', 0, 0, 1200); d('pwm', 0.5, 0, 1); d('pwmMode', 0, 0, 2); d('pulse', 0, 0, 1); d('saw', 1, 0, 1);
    d('sub', 0, 0, 1); d('noise', 0, 0, 1); d('range', 1, 0.25, 4); d('hpf', 1, 0, 3);
    d('cutoff', 800, 1, 1e6, 'a-rate'); d('resonance', 0.6, 0, 5, 'a-rate'); d('envAmt', 4.8, -14, 14, 'a-rate');
    d('vcfLfo', 0, 0, 6); d('vcfKey', 0.5, 0, 1); d('vcaMode', 0, 0, 1);
    d('attack', 0.01, 0.0005, 30); d('decay', 0.98, 0.001, 30); d('sustain', 0.7, 0, 1); d('release', 0.3, 0.001, 30);
    d('chorus', 1, 0, 2); d('chorusNoise', 0, 0, 1);
    return out;
  }
  constructor(options) {
    super();
    var seed = (options && options.processorOptions && options.processorOptions.seed) || 106, i, fs = sampleRate;
    this.alive = true;
    this.port.onmessage = (e) => { if (e.data === 'stop') this.alive = false; };
    this.rng = new Lcg(seed);
    this.v = [];
    for (i = 0; i < JU.voices; i++) {
      this.v.push({ lastTrig: 0, on: false, note: 60, glide: 0, ph: JU.phase[i], sph: (JU.phase[i] * 1.618 + 0.11) % 1, subLp: 0,
                    env: 0, st: 0, genv: 0, gst: 0, s1: 0, s2: 0, s3: 0, s4: 0, active: false, quiet: 0 });
    }
    this.lfoPh = 0.25; this.lfoEnv = 1; this.lfoT = 1e9;
    this.nLp = 0; this.nC = 1 - Math.exp(-TWO_PI * JU.noiseLp / fs); this.subC = 1 - Math.exp(-TWO_PI * JU.subLp / fs);
    this.hp = { x1: 0, y1: 0, lp: 0 };
    this.hpC = [0, 0, Math.exp(-TWO_PI * JU.hpf2 / fs), Math.exp(-TWO_PI * JU.hpf3 / fs)];
    this.shelfC = 1 - Math.exp(-TWO_PI * JU.hpfShelf / fs);
    var n = Math.ceil(0.012 * fs) + 4;
    this.dl = new Float64Array(n); this.dn = n; this.dw = 0; this.chPh = 0.25; this.preLp = 0; this.postL = 0; this.postR = 0;
    this.preC = 1 - Math.exp(-TWO_PI * JU.chorusPre / fs); this.postC = 1 - Math.exp(-TWO_PI * JU.chorusPost / fs);
    this.cC = [new Coef(1), new Coef(3.5), new Coef(3.5), new Coef(1), new Coef(1)];
    this.ga = new Coef(1); this.gr = new Coef(1);
  }
  process(inputs, outputs, P) {
    var o = outputs[0];
    if (!o || !o[0]) return this.alive;
    var L = o[0], R = o[1] || null, n = L.length, fs = sampleRate, i, j, V = this.v, NV = JU.voices;
    var k0 = function (a) { return a[0]; };
    var tune = k0(P.tune) / 100, uni = k0(P.unison) >= 0.5, lfoRate = k0(P.lfoRate), lDel = k0(P.lfoDelay), lFade = k0(P.lfoFade), lAuto = k0(P.lfoAuto) >= 0.5;
    var vib = k0(P.dcoLfo) / 100, pwmS = k0(P.pwm), pwmMode = Math.round(k0(P.pwmMode)), pulseOn = k0(P.pulse) >= 0.5, sawOn = k0(P.saw) >= 0.5;
    var subS = k0(P.sub), noiS = k0(P.noise), range = k0(P.range), hpfPos = Math.round(k0(P.hpf));
    var vLfo = k0(P.vcfLfo), vKey = k0(P.vcfKey), gateMode = k0(P.vcaMode) >= 0.5;
    var aT = k0(P.attack), dT = k0(P.decay), sus = k0(P.sustain), rT = k0(P.release), chorus = Math.round(k0(P.chorus)), hissS = k0(P.chorusNoise);
    if (sus <= JU.shortBelow) rT = Math.min(rT, JU.shortRelease);
    // mix gains with the Junox compression rule
    var gS = sawOn ? JU.mixSaw : 0, gP = pulseOn ? JU.mixPulse : 0, gB = subS * 0.195, gN = noiS * 0.21, sum = gS + gP + gB + gN, comp = 1;
    if (sum > JU.mixKnee) comp = JU.mixKnee / (JU.mixKnee + (sum - JU.mixKnee) * JU.mixAbove);
    comp *= JU.mixNorm;
    var cA = this.cC[0].of(Math.max(aT, 0.0005)), cD = this.cC[1].of(Math.max(dT, 0.001)), cR = this.cC[2].of(Math.max(rT, 0.001));
    var gA = this.ga.of(JU.gateA / 3), gR = this.gr.of(JU.gateR / 3);
    var vGain = (uni ? JU.unisonGain : 1) * JU.outGain, maxF = 0.4 * fs, lfoInc = lfoRate / fs;
    var chInc = JU.chorusRate[chorus] / fs || 0, dn = this.dn, dl = this.dl, aT_ = [], aG = [], aP = [], aL = [];
    for (j = 0; j < NV; j++) { aT_.push(P['trig' + j]); aG.push(P['gate' + j]); aP.push(P['pitch' + j]); aL.push(P['glide' + j]); }
    var pC = P.cutoff, pR = P.resonance, pE = P.envAmt;
    for (i = 0; i < n; i++) {
      // note events per voice
      var anyOn = false;
      for (j = 0; j < NV; j++) if (V[j].on) { anyOn = true; break; }
      for (j = 0; j < NV; j++) {
        var v = V[j], tr = pv(aT_[j], i), g = pv(aG[j], i) >= 0.5;
        if (tr !== v.lastTrig) {
          v.lastTrig = tr;
          var target0 = pv(aP[j], i);
          v.glide = pv(aL[j], i);
          if (!(v.glide > 0) || !v.active) v.note = target0;
          v.st = 1; v.gst = 1; v.on = true; v.active = true; v.quiet = 0;
          if (!lAuto || !anyOn) this.lfoT = 0;            // LFO delay restarts: every note (manual) or the first after silence (auto)
          anyOn = true;
        } else if (!g && v.on) { v.on = false; v.st = 3; v.gst = 3; }
      }
      // LFO: triangle with delay then a linear fade-in
      this.lfoPh += lfoInc; if (this.lfoPh >= 1) this.lfoPh -= 1;
      var tri0 = this.lfoPh < 0.5 ? 4 * this.lfoPh - 1 : 3 - 4 * this.lfoPh;
      this.lfoT += 1 / fs;
      var le = this.lfoT < lDel ? 0 : (lFade > 0 ? Math.min(1, (this.lfoT - lDel) / lFade) : 1), lfo = tri0 * le;
      // shared noise, low-passed
      this.nLp += this.nC * (this.rng.next() - this.nLp);
      var noise = this.nLp * 1.7, mix = 0;
      for (j = 0; j < NV; j++) {
        var w = V[j];
        if (!w.active) continue;
        var tgt = pv(aP[j], i);
        if (w.glide > 0) { if (w.glide !== w.gT) { w.gT = w.glide; w.gC = Math.exp(-1 / (w.glide * fs)); } w.note = tgt + w.gC * (w.note - tgt); } else w.note = tgt;
        // ADSR (Juno-60 shapes): attack RC toward 1/0.632 cut at 1, decay and release RCs with tau = time / 3.5
        if (w.st === 1) { w.env += (JU.attackTarget - w.env) * (1 - cA); if (w.env >= 1) { w.env = 1; w.st = 2; } }
        else if (w.st === 2) w.env = sus + (w.env - sus) * cD;
        else if (w.st === 3) w.env *= cR;
        var vca;
        if (gateMode) {
          if (w.gst === 1) { w.genv += (1.0001 - w.genv) * (1 - gA); if (w.genv >= 1) { w.genv = 1; w.gst = 2; } }
          else if (w.gst === 3) w.genv *= gR;
          vca = w.genv;
        } else vca = w.env;
        if (w.st === 3 && w.env < 1e-5 && (!gateMode || w.genv < 1e-5)) { w.active = false; w.env = 0; w.genv = 0; continue; }
        // DCO
        var f = mtof(w.note + tune + vib * lfo) * range, dt = f / fs;
        var pw = pwmMode === 1 ? pwmS : (pwmMode === 2 ? pwmS * w.env : pwmS * (lfo + 1) * 0.5);
        var duty = 0.5 - 0.45 * clamp(pw, 0, 1), ph = w.ph, x = 0;
        if (gS > 0) x += gS * saw(ph, dt);
        if (gP > 0) x += gP * pulse(ph, dt, duty);
        if (gB > 0) { var sq = pulse(w.sph, dt * 0.5, 0.5); w.subLp += this.subC * (sq - w.subLp); x += gB * w.subLp; }
        x += gN * noise;
        x = x * comp + JU.seedNoise * noise;
        w.ph = ph + dt; if (w.ph >= 1) w.ph -= 1;
        w.sph += dt * 0.5; if (w.sph >= 1) w.sph -= 1;
        // VCF: cutoff law in octaves (Junox voice.js 180-192), TPT ladder
        var res = pv(pR, i);
        var oct = pv(pE, i) * w.env + vLfo * lfo + vKey * 5 * (w.note - 60) / 60 + 0.5 * res / 4.08;
        var fc = clamp(pv(pC, i) * Math.pow(2, oct), 20, maxF);
        var gg = Math.tan(Math.PI * fc / fs), G = gg / (1 + gg), iG = 1 - G;
        var S1 = w.s1 * iG, S2 = w.s2 * iG, S3 = w.s3 * iG, S4 = w.s4 * iG;
        var sig = G * G * G * S1 + G * G * S2 + G * S3 + S4;
        var u = th((x - res * sig) / (1 + res * G * G * G * G));
        var v1 = (u - w.s1) * G, y1 = v1 + w.s1; w.s1 = y1 + v1;
        var v2 = (y1 - w.s2) * G, y2 = v2 + w.s2; w.s2 = y2 + v2;
        var v3 = (y2 - w.s3) * G, y3 = v3 + w.s3; w.s3 = y3 + v3;
        var v4 = (y3 - w.s4) * G, y4 = v4 + w.s4; w.s4 = y4 + v4;
        mix += y4 * vca;
      }
      mix *= vGain;
      // HPF: 0 low shelf +6 dB under 65 Hz, 1 flat, 2 and 3 first-order high-pass
      var hp = this.hp, yh;
      if (hpfPos >= 2) { var a = this.hpC[hpfPos]; yh = 0.5 * (1 + a) * (mix - hp.x1) + a * hp.y1; hp.x1 = mix; hp.y1 = yh; }
      else if (hpfPos === 0) { hp.lp += this.shelfC * (mix - hp.lp); yh = mix + (JU.hpfShelfGain - 1) * hp.lp; }
      else yh = mix;
      // chorus: one triangle LFO, two lines in antiphase, dry 0.44 + wet 0.56
      if (chorus > 0) {
        this.preLp += this.preC * (yh - this.preLp);
        dl[this.dw] = this.preLp;
        this.chPh += chInc; if (this.chPh >= 1) this.chPh -= 1;
        var ct = this.chPh < 0.5 ? 4 * this.chPh - 1 : 3 - 4 * this.chPh;
        var mid = 0.5 * (JU.chorusMin + JU.chorusMax), span = 0.5 * (JU.chorusMax - JU.chorusMin);
        var dL = (mid + span * ct) * fs, dR = (mid - span * ct) * fs;
        var wl = this.tap(dL), wr = this.tap(dR);
        this.dw = this.dw + 1 === dn ? 0 : this.dw + 1;
        this.postL += this.postC * (wl - this.postL); this.postR += this.postC * (wr - this.postR);
        var hl = 0, hr = 0;
        if (hissS > 0) { var hz = this.rng.next() * JU.hiss * hissS; hl = hz * (1 + ct) * 0.5; hr = hz * (1 - ct) * 0.5; }   // louder on the slow-clocked (long) line
        L[i] = JU.chorusDry * yh + JU.chorusWet * this.postL + hl;
        if (R) R[i] = JU.chorusDry * yh + JU.chorusWet * this.postR + hr;
      } else { L[i] = yh; if (R) R[i] = yh; }
    }
    return this.alive;
  }
  tap(d) {                                       // linear interpolation d samples behind the write index
    var r = this.dw - d, dn = this.dn; while (r < 0) r += dn;
    var i0 = Math.floor(r), fr = r - i0, i1 = i0 + 1 === dn ? 0 : i0 + 1;
    return this.dl[i0] * (1 - fr) + this.dl[i1] * fr;
  }
}
registerProcessor('hvt-juno', JunoProcessor);
