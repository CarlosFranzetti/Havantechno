#!/usr/bin/env python3
"""Score a studio render, and optionally the reference, with the measures in tools/README.md.

  python3 tools/score.py <render.wav> [--ref <mp3|wav>] [--section name] [--bars a:b]
                         [--tail s] [--json] [--xcheck] [--selftest]

The render's sidecar (<render>.json, written by tools/render.js) gives the bar range, bpm, swing and
where bar `from` starts in the WAV. With --ref, both files are analysed over the same bar window, on
the reference's own grid (first kick onset T0 = 0.568 s, 126 BPM, straight; O1 M0).
Section windows use the archived arrangement (song.js GUIDANCE); see SECTIONS below.
"""
import argparse
import json
import math
import os
import re
import shutil
import signal
import subprocess
import sys

signal.signal(signal.SIGPIPE, signal.SIG_DFL)   # quiet exit when piped into head

import numpy as np
from scipy import signal
from scipy.optimize import curve_fit

SR = 44100                 # analysis rate; everything is decoded to this
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF_T0 = 0.568             # s, first kick onset of the reference (O1 M0)
REF_BPM = 126.0
REF_SWING = 0.0            # reference has no swing (O1 M0)
SWING_FRACTION = 0.33      # archived sequencer: odd 16ths are late by swing * stepSec * 0.33
STEPS = 16
STAB_STEPS_1IDX = (2, 6, 10, 14)   # O1 M7 stab steps, read as 1-indexed 16ths
OCT_BANDS = [(20, 60), (60, 150), (150, 300), (300, 600), (600, 1200), (1200, 2400),
             (2400, 4800), (4800, 9600), (9600, 16000)]   # S4 O2 Q12a
CORR_BAND = (300.0, 2000.0)  # contract: L/R correlation in 300 Hz to 2 kHz
ONSET_WIN = (0.0, 0.030)     # O1 M7 windows, seconds after each step
TAIL_WIN = (0.060, 0.115)
TIMES_MS = (0, 10, 20, 40, 60, 100, 150, 200)

# Song bars [start, end) of the archived arrangement (song.js GUIDANCE). The reference's section starts
# at bars 24, 40, 104, 136 and 184 agree with these; its 120 drop inside the break (O1) does not appear here.
SECTIONS = {
    'intro': (0, 16), 'intro2': (16, 24), 'build': (24, 40), 'mainA': (40, 72), 'mainA2': (72, 104),
    'break': (104, 128), 'breakEnd': (128, 136), 'mainB': (136, 184), 'outro': (184, 200),
}

FFMPEG_CANDIDATES = [os.environ.get('FFMPEG'), '/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux',
                     '/usr/bin/ffmpeg', shutil.which('ffmpeg')]


def die(msg):
    sys.stderr.write('score.py: ' + msg + '\n')
    sys.exit(2)


def warn(msg):
    sys.stderr.write('score.py: note: ' + msg + '\n')


def ffmpeg_candidates():
    seen, out = set(), []
    for c in FFMPEG_CANDIDATES:
        if c and c not in seen and os.path.isfile(c) and os.access(c, os.X_OK):
            seen.add(c)
            out.append(c)
    return out


def decode(path):
    """Decode to 44.1 kHz stereo float32. Returns (array[N,2], decoder path).

    The bundled ffmpeg-1011 has no MP3 decoder, so the first candidate that succeeds is used.
    """
    errors = []
    for ff in ffmpeg_candidates():
        p = subprocess.run([ff, '-hide_banner', '-loglevel', 'error', '-i', path, '-f', 'f32le',
                            '-acodec', 'pcm_f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True)
        if p.returncode == 0 and len(p.stdout) >= 8:
            x = np.frombuffer(p.stdout, dtype='<f4').reshape(-1, 2)
            return x, ff
        errors.append(ff + ': ' + p.stderr.decode(errors='replace').strip()[:200])
    die('no ffmpeg could decode ' + path + ' (' + ' | '.join(errors) + ')')


def load_sidecar(render_path):
    side_path = os.path.splitext(render_path)[0] + '.json'
    if os.path.isfile(side_path):
        with open(side_path) as f:
            return json.load(f)
    return None


def parse_bars(v):
    if ':' not in v:
        return (0, int(v))
    a, b = v.split(':')
    return (int(a), int(b))


class Track:
    def __init__(self, label, path, x, decoder, grid0, bpm, swing, from_bar=None, to_bar=None):
        self.label, self.path, self.x, self.decoder = label, path, x, decoder
        self.grid0 = float(grid0)          # sample index of song bar 0
        self.bpm, self.swing = float(bpm), float(swing)
        self.barS = 4 * 60.0 / self.bpm * SR
        self.stepS = self.barS / STEPS
        self.beatS = self.barS / 4
        self.from_bar, self.to_bar = from_bar, to_bar

    def swing_offset(self, step):
        """Seconds that odd 16ths are late in the archived sequencer (0 for straight tracks)."""
        return self.swing * SWING_FRACTION * self.stepS / SR if step % 2 else 0.0


def load_track(path, side, is_render):
    x, ff = decode(path)
    if is_render:
        if side:
            bpm, swing = float(side['bpm']), float(side['swing'])
            barS = 4 * 60.0 / bpm * SR
            grid0 = float(side['gridStartSample']) - side['from'] * barS
            return Track('render', path, x, ff, grid0, bpm, swing, side['from'], side['to'])
        warn('no sidecar json next to ' + path + ': assuming bar 0 at sample 0, 126 BPM, no swing')
        return Track('render', path, x, ff, 0.0, REF_BPM, 0.0)
    return Track('reference', path, x, ff, REF_T0 * SR, REF_BPM, REF_SWING)


def window_bars(args, side):
    """Song-bar window (a, b) or None for the whole file."""
    if args.section:
        if args.section not in SECTIONS:
            die('unknown section ' + args.section + '; known: ' + ', '.join(SECTIONS))
        a0, a1 = SECTIONS[args.section]
        if args.bars:
            return (a0 + args.bars[0], min(a0 + args.bars[1], a1))
        return (a0, a1)
    if args.bars:
        return args.bars
    if side:
        return (side['from'], side['to'])
    return None


def sample_range(tr, win, tail_s):
    n = len(tr.x)
    if win is None:
        return 0, n
    wa, wb = win
    if tr.from_bar is not None and (wa < tr.from_bar or wb > tr.to_bar):
        die('the render covers bars %d..%d; window %d..%d is outside it' % (tr.from_bar, tr.to_bar - 1, wa, wb - 1))
    s0 = int(round(tr.grid0 + wa * tr.barS))
    s1 = int(round(tr.grid0 + wb * tr.barS + tail_s * SR))
    s0, s1 = max(0, s0), min(n, s1)
    if s1 - s0 < SR // 2:
        die('window too short for ' + tr.label)
    return s0, s1


# ----------------------------------------------------------------- measures

def tempo(seg):
    """Onset-flux autocorrelation. 2 ms hop, 10 ms RMS frames, half-wave-rectified dB flux smoothed with a
    14 ms Gaussian. Lags for 60 to 200 BPM. Octave guard (a choice, not from a source): the shortest-lag
    local peak whose autocorrelation is at least 50 % of the maximum wins, so a 2-beat clap pattern does
    not replace a 1-beat kick. Parabolic refinement of the peak."""
    mono = seg.mean(axis=1).astype(np.float64)
    hop, frame = int(0.002 * SR), int(0.010 * SR)
    hop_s = hop / SR                       # the actual hop (88 samples = 1.9955 ms), not 2 ms
    n = (len(mono) - frame) // hop
    if n < 400:
        return (float('nan'), float('nan'), [])
    win = np.lib.stride_tricks.sliding_window_view(mono, frame)[::hop][:n]
    rms = np.sqrt(np.mean(win ** 2, axis=1))
    env = 20 * np.log10(rms + 1e-7)
    flux = np.maximum(0.0, np.diff(env))
    g = np.exp(-0.5 * (np.arange(-21, 22) / 7.0) ** 2)
    flux = np.convolve(flux, g / g.sum(), mode='same')
    flux = flux - flux.mean()
    ac = np.correlate(flux, flux, 'full')[len(flux) - 1:]
    if ac[0] <= 0:
        return (float('nan'), float('nan'), [])
    ac = ac / ac[0]
    lo = int(round(60.0 / 200.0 / hop_s))
    hi = min(int(round(60.0 / 60.0 / hop_s)), len(ac) - 2)
    seg_ac = ac[lo:hi + 1]
    m = float(seg_ac.max())
    peaks = [i for i in range(1, len(seg_ac) - 1)
             if seg_ac[i] >= seg_ac[i - 1] and seg_ac[i] >= seg_ac[i + 1]]
    cands = [i for i in peaks if seg_ac[i] >= 0.5 * m]
    best = lo + (cands[0] if cands else int(np.argmax(seg_ac)))

    def refine(b):
        y0, y1, y2 = ac[b - 1], ac[b], ac[b + 1]
        d = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2) if (y0 - 2 * y1 + y2) != 0 else 0.0
        return 60.0 / ((b + d) * hop_s)

    bpm = refine(best)
    top = sorted(peaks, key=lambda i: -seg_ac[i])[:3]
    cands = [(round(refine(lo + i), 2), round(float(seg_ac[i]), 3)) for i in top]
    return bpm, float(ac[best]), cands


def band_levels(seg):
    """Welch PSD (Hann, 8192, 50 % overlap), both channels summed. Band power = sum(PSD) * df, i.e.
    mean-square units; only the dB differences are meaningful."""
    x = seg.astype(np.float64)
    nper = min(8192, len(x))
    tot, f = None, None
    for ch in range(2):
        f, P = signal.welch(x[:, ch], fs=SR, window='hann', nperseg=nper, noverlap=nper // 2, scaling='density')
        tot = P if tot is None else tot + P
    df = f[1] - f[0]

    def power(lo, hi):
        m = (f >= lo) & (f < hi)
        return float(tot[m].sum() * df)

    e_low = power(20, 300)
    e_mid = power(300, 1000)
    return {
        'R_300_1k_db': 10 * math.log10(e_mid / e_low),
        'db_1k_4k': 10 * math.log10(power(1000, 4000) / e_low),
        'db_4k_16k': 10 * math.log10(power(4000, 16000) / e_low),
        'abs_300_1k_db': 10 * math.log10(e_mid),
        'abs_20_300_db': 10 * math.log10(e_low),
    }


def kweight_coeffs(fs):
    """BS.1770 K-weighting as given in S4 (libebur128 constants, computed for the sample rate)."""
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    K = math.tan(math.pi * f0 / fs)
    Vh = 10 ** (G / 20.0)
    Vb = Vh ** 0.4996667741545416
    a0 = 1 + K / Q + K * K
    b = np.array([(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0])
    a = np.array([1.0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0])
    f0b, Qb = 38.13547087602444, 0.5003270373238773
    K2 = math.tan(math.pi * f0b / fs)
    a0b = 1 + K2 / Qb + K2 * K2
    b2 = np.array([1.0, -2.0, 1.0])
    a2 = np.array([1.0, 2 * (K2 * K2 - 1) / a0b, (1 - K2 / Qb + K2 * K2) / a0b])
    return (b, a), (b2, a2)


def loudness(seg):
    """Integrated loudness (BS.1770-4 gating, 400 ms blocks, 100 ms hop, -70 LKFS absolute and -10 LU
    relative gates), resampled to 48 kHz before K-weighting. Approximate: see tools/README.md."""
    x48 = signal.resample_poly(seg.astype(np.float64), 160, 147, axis=0)
    (b, a), (b2, a2) = kweight_coeffs(48000.0)
    y = signal.lfilter(b2, a2, signal.lfilter(b, a, x48, axis=0), axis=0)
    p = (y ** 2).sum(axis=1)
    blk, hop = 19200, 4800
    if len(p) < blk:
        return {'lufs_integrated': float('nan'), 'blocks_used': 0}
    cs = np.concatenate([[0.0], np.cumsum(p)])
    starts = np.arange(0, len(p) - blk + 1, hop)
    z = (cs[starts + blk] - cs[starts]) / blk
    lj = -0.691 + 10 * np.log10(np.maximum(z, 1e-300))
    above_abs = lj > -70.0
    gamma_r = -0.691 + 10 * math.log10(z[above_abs].mean()) - 10.0
    keep = above_abs & (lj > gamma_r)
    return {'lufs_integrated': float(-0.691 + 10 * math.log10(z[keep].mean())), 'blocks_used': int(keep.sum())}


def sample_peak_db(seg):
    m = float(np.max(np.abs(seg)))
    return 20 * math.log10(m) if m > 0 else float('-inf')


def true_peak_db(x, s0, s1, up=4, chunk=1 << 19, pad=512):
    """4x polyphase oversampling (scipy resample_poly), processed in chunks. Not the BS.1770 Annex 2 filter."""
    peak = 0.0
    for ch in range(2):
        for c0 in range(s0, s1, chunk):
            c1 = min(s1, c0 + chunk)
            a, b = max(0, c0 - pad), min(len(x), c1 + pad)
            up_seg = signal.resample_poly(x[a:b, ch].astype(np.float64), up, 1)
            peak = max(peak, float(np.max(np.abs(up_seg[(c0 - a) * up:(c1 - a) * up]))))
    return 20 * math.log10(peak) if peak > 0 else float('-inf')


def padded(tr, s0, s1, pad_s=0.2):
    p0, p1 = max(0, s0 - int(pad_s * SR)), min(len(tr.x), s1 + int(pad_s * SR))
    return p0, p1


def corr_profile(tr, s0, s1, bands):
    """Per-step L/R correlation: rho = sum(L R) / sqrt(sum(L^2) sum(R^2)), sums accumulated over all
    hits of each 16th-step index before dividing (S4 procedure). Zero-phase 4th-order Butterworth bands."""
    p0, p1 = padded(tr, s0, s1)
    out = {}
    k_lo = int(math.ceil((s0 - tr.grid0) / tr.stepS))
    k_hi = int(math.floor((s1 - tr.grid0) / tr.stepS))
    for band in bands:
        sos = signal.butter(4, list(band), btype='bandpass', fs=SR, output='sos')
        f = signal.sosfiltfilt(sos, tr.x[p0:p1].astype(np.float64), axis=0)
        acc = {'onset': np.zeros((STEPS, 3)), 'tail': np.zeros((STEPS, 3))}
        for k in range(k_lo, k_hi):
            step = k % STEPS
            p = tr.grid0 + k * tr.stepS + tr.swing_offset(step) * SR
            if p < s0 or p + TAIL_WIN[1] * SR > s1:
                continue
            for name, (wa, wb) in (('onset', ONSET_WIN), ('tail', TAIL_WIN)):
                i0 = int(round(p + wa * SR)) - p0
                i1 = int(round(p + wb * SR)) - p0
                if i0 < 0 or i1 > len(f):
                    continue
                L, R = f[i0:i1, 0], f[i0:i1, 1]
                acc[name][step] += (L @ L, R @ R, L @ R)

        def rho(s):
            return float(s[2] / math.sqrt(s[0] * s[1])) if s[0] > 0 and s[1] > 0 else float('nan')
        key = '%g-%g' % band
        stab = [s - 1 for s in STAB_STEPS_1IDX]
        r = {}
        for name in ('onset', 'tail'):
            per = [rho(acc[name][i]) for i in range(STEPS)]
            allsum = acc[name].sum(axis=0)
            r[name + '_all'] = rho(allsum)
            r[name + '_stab'] = rho(acc[name][stab].sum(axis=0))
            r[name + '_steps'] = per
        out[key] = r
    return out


def kick_glide(tr, s0, s1, lp_hz=400.0, pre=0.005, post=0.170, t_lo=0.002, t_hi=0.150):
    """Instantaneous frequency of the low band (4th-order Butterworth low-pass, zero-phase) after each
    beat, from the analytic signal. Two estimates: the aligned mean over beats (primary; incoherent
    sub averages out) and the per-beat median. Both fitted with f(t) = fT + (f0 - fT) exp(-t/tau)."""
    p0, p1 = padded(tr, s0, s1)
    sos = signal.butter(4, lp_hz, btype='lowpass', fs=SR, output='sos')
    f = signal.sosfiltfilt(sos, tr.x[p0:p1].astype(np.float64).mean(axis=1))
    segn = int(round((pre + post) * SR))
    j_lo = int(math.ceil((s0 - tr.grid0) / tr.beatS))
    j_hi = int(math.floor((s1 - tr.grid0) / tr.beatS))
    segs = []
    for j in range(j_lo, j_hi):
        p = tr.grid0 + j * tr.beatS
        a = int(round(p - pre * SR)) - p0
        if a < 0 or a + segn > len(f) or p + post * SR > s1:
            continue
        segs.append(f[a:a + segn])
    if len(segs) < 2:
        return {'n_hits': len(segs), 'error': 'fewer than 2 beats in window'}
    M = np.array(segs)
    t = (np.arange(segn - 1) + 0.5) / SR - pre

    def inst_f(v):
        an = signal.hilbert(v, axis=-1)
        return np.diff(np.unwrap(np.angle(an), axis=-1), axis=-1) * SR / (2 * math.pi)

    mean_f = inst_f(M.mean(axis=0))
    med_f = np.median(inst_f(M), axis=0)
    sel = (t >= t_lo) & (t <= t_hi)
    res = {'n_hits': len(segs), 'lowpass_hz': lp_hz}
    for name, fc in (('coherent', mean_f), ('median_per_beat', med_f)):
        res[name] = fit_glide(t[sel], fc[sel])
    return res


def fit_glide(t, fv):
    def model(tt, f0, fT, tau):
        return fT + (f0 - fT) * np.exp(-tt / tau)
    p0 = [float(np.max(fv[t < 0.010])) if np.any(t < 0.010) else float(fv[0]), 50.0, 0.025]
    try:
        popt, _ = curve_fit(model, t, fv, p0=p0, bounds=([20.0, 5.0, 0.001], [5000.0, 500.0, 1.0]), maxfev=20000)
    except (RuntimeError, ValueError) as e:
        return {'error': str(e)}
    rms = float(np.sqrt(np.mean((fv - model(t, *popt)) ** 2)))
    at_bound = bool(popt[0] >= 4999 or popt[1] <= 5.01 or popt[1] >= 499 or popt[2] <= 0.0011 or popt[2] >= 0.99)
    # a choice, not from a source: the fit is flagged when it sits on a bound or the residual exceeds 50 Hz
    unreliable = at_bound or rms > 50.0
    return {'f0_hz': float(popt[0]), 'fT_hz': float(popt[1]), 'tau_ms': float(popt[2] * 1000),
            'rms_resid_hz': rms, 'unreliable': unreliable}


def sub_duck(tr, s0, s1, lo=30.0, hi=40.0, pre=0.010, span=0.480, smooth_ms=5.0, plateau=(0.300, 0.450)):
    """Fold the 30 to 40 Hz band at the beat period. The aligned mean over beats (the kick template) is
    subtracted per beat, the residual power is averaged over beats and smoothed (5 ms), and the result is
    given in dB relative to the mean over 300 to 450 ms (O1 M4, R1)."""
    p0, p1 = padded(tr, s0, s1)
    sos = signal.butter(4, [lo, hi], btype='bandpass', fs=SR, output='sos')
    f = signal.sosfiltfilt(sos, tr.x[p0:p1].astype(np.float64).mean(axis=1))
    segn = int(round((pre + span) * SR))
    j_lo = int(math.ceil((s0 - tr.grid0) / tr.beatS))
    j_hi = int(math.floor((s1 - tr.grid0) / tr.beatS))
    segs = []
    for j in range(j_lo, j_hi):
        p = tr.grid0 + j * tr.beatS
        a = int(round(p - pre * SR)) - p0
        if a < 0 or a + segn > len(f) or p + span * SR > s1:
            continue
        segs.append(f[a:a + segn])
    if len(segs) < 2:
        return {'n_hits': len(segs), 'error': 'fewer than 2 beats in window'}
    M = np.array(segs)
    M = M - M.mean(axis=0)          # kick template (aligned mean over beats) removed per beat
    P = (M ** 2).mean(axis=0)
    w = int(round(smooth_ms * 1e-3 * SR)) | 1
    Ps = np.convolve(P, np.ones(w) / w, mode='same')
    i_pl0, i_pl1 = int(round((pre + plateau[0]) * SR)), int(round((pre + plateau[1]) * SR))
    pl = Ps[i_pl0:i_pl1].mean()
    prof = {}
    for tm in TIMES_MS:
        i = int(round((pre + tm * 1e-3) * SR))
        prof[str(tm)] = float(10 * math.log10(Ps[i] / pl)) if Ps[i] > 0 and pl > 0 else float('nan')
    return {'n_hits': len(segs), 'db_rel_plateau': prof, 'band_hz': [lo, hi], 'kick_subtracted': True}


def measure(tr, s0, s1):
    seg = tr.x[s0:s1]
    r = {'window_seconds': (s1 - s0) / SR, 'bpm_assumed': tr.bpm, 'swing': tr.swing,
         'decoder': tr.decoder}
    r['tempo_bpm'], r['tempo_strength'], r['tempo_candidates'] = tempo(seg)
    r['beat_samples'] = tr.beatS
    r.update(band_levels(seg))
    ld = loudness(seg)
    r['lufs_integrated'] = ld['lufs_integrated']
    r['loudness_blocks_used'] = ld['blocks_used']
    r['sample_peak_dbfs'] = sample_peak_db(seg)
    r['true_peak_dbtp'] = true_peak_db(tr.x, s0, s1)
    r['corr'] = corr_profile(tr, s0, s1, [CORR_BAND] + OCT_BANDS)
    r['kick_glide'] = kick_glide(tr, s0, s1)
    r['sub_duck'] = sub_duck(tr, s0, s1)
    return r


def ffmpeg_ebur(path, s0, s1):
    """Cross-check: ffmpeg's ebur128 filter (libebur128) on the same window."""
    ff = next((c for c in ffmpeg_candidates() if 'ebur128' in subprocess.run(
        [c, '-hide_banner', '-filters'], capture_output=True, text=True).stdout), None)
    if ff is None:
        return {'error': 'no ffmpeg with the ebur128 filter found'}
    cmd = [ff, '-hide_banner', '-nostats', '-ss', '%.6f' % (s0 / SR), '-t', '%.6f' % ((s1 - s0) / SR), '-i', path,
           '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-']
    txt = subprocess.run(cmd, capture_output=True, text=True).stderr
    mi = re.search(r'Integrated loudness:\s*I:\s*(-?[\d.]+) LUFS', txt)
    mt = re.search(r'True peak:\s*Peak:\s*(-?[\d.]+) dBFS', txt)
    return {'ffmpeg': ff, 'lufs_integrated': float(mi.group(1)) if mi else None,
            'true_peak_dbtp': float(mt.group(1)) if mt else None}


# ----------------------------------------------------------------- output

ROWS = [
    ('tempo_bpm', 'tempo, onset-flux autocorrelation (BPM)', '%.2f'),
    ('R_300_1k_db', 'R: 300 Hz-1 kHz vs 20-300 Hz (dB)', '%.2f'),
    ('db_1k_4k', '1-4 kHz vs 20-300 Hz (dB)', '%.2f'),
    ('db_4k_16k', '4-16 kHz vs 20-300 Hz (dB)', '%.2f'),
    ('A_matched_db', 'A: 300 Hz-1 kHz power, matched to ref loudness (dB)', '%.2f'),
    ('lufs_integrated', 'integrated loudness (LUFS, approx.)', '%.2f'),
    ('sample_peak_dbfs', 'sample peak (dBFS)', '%.2f'),
    ('true_peak_dbtp', 'true peak, 4x (dBTP, approx.)', '%.2f'),
    ('corr_onset_all', 'L/R corr 300 Hz-2 kHz, onset 0-30 ms, all steps', '%.3f'),
    ('corr_tail_all', 'L/R corr 300 Hz-2 kHz, tail 60-115 ms, all steps', '%.3f'),
    ('corr_onset_stab', 'L/R corr 300 Hz-2 kHz, onset, steps 2,6,10,14', '%.3f'),
    ('corr_tail_stab', 'L/R corr 300 Hz-2 kHz, tail, steps 2,6,10,14', '%.3f'),
    ('glide_f0', 'kick glide, coherent: f0 (Hz, at t=0)', '%.1f'),
    ('glide_fT', 'kick glide, coherent: fT (Hz)', '%.1f'),
    ('glide_tau', 'kick glide, coherent: tau (ms)', '%.2f'),
    ('glide_rms', 'kick glide, coherent: fit residual (Hz rms)', '%.2f'),
    ('glide_med_f0', 'kick glide, per-beat median: f0 (Hz)', '%.1f'),
    ('glide_med_fT', 'kick glide, per-beat median: fT (Hz)', '%.1f'),
    ('glide_med_tau', 'kick glide, per-beat median: tau (ms)', '%.2f'),
]


def flat(r, ref_lufs):
    d = {}
    for k in ('tempo_bpm', 'R_300_1k_db', 'db_1k_4k', 'db_4k_16k', 'lufs_integrated', 'sample_peak_dbfs',
              'true_peak_dbtp', 'abs_300_1k_db'):
        d[k] = r.get(k)
    d['A_matched_db'] = (r['abs_300_1k_db'] + (ref_lufs - r['lufs_integrated'])) if ref_lufs is not None else None
    for name in ('onset', 'tail'):
        d['corr_%s_all' % name] = r['corr']['300-2000'][name + '_all']
        d['corr_%s_stab' % name] = r['corr']['300-2000'][name + '_stab']
    g = r['kick_glide']
    c, m = g.get('coherent', {}), g.get('median_per_beat', {})
    d['glide_f0'], d['glide_fT'], d['glide_tau'], d['glide_rms'] = c.get('f0_hz'), c.get('fT_hz'), c.get('tau_ms'), c.get('rms_resid_hz')
    d['glide_med_f0'], d['glide_med_fT'], d['glide_med_tau'] = m.get('f0_hz'), m.get('fT_hz'), m.get('tau_ms')
    return d


def fmt(v, f):
    if v is None:
        return 'n/a'
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return str(v)
    return f % v


def print_report(out, labels):
    w = out['window']
    print('window: %s' % ('whole file' if w is None else 'song bars %d..%d%s' % (
        w['bars'][0], w['bars'][1] - 1, (' (section %s)' % w['section']) if w.get('section') else '')))
    for lab in labels:
        t = out['tracks'][lab]
        print('%s: %s (decoder %s), %.2f s measured' % (lab, t['path'], t['decoder'], t['window_seconds']))
    print()
    has_ref = len(labels) > 1
    head = '%-62s %12s' % ('measure', labels[0])
    if has_ref:
        head += ' %12s %12s' % ('reference', 'diff')
    print(head)
    flats = {lab: out['tracks'][lab]['flat'] for lab in labels}
    for key, label, f in ROWS:
        row = '%-62s' % label
        vals = [flats[lab].get(key) for lab in labels]
        row += ' %12s' % fmt(vals[0], f)
        if has_ref:
            row += ' %12s' % fmt(vals[1], f)
            if vals[0] is not None and vals[1] is not None:
                row += ' %12s' % fmt(vals[0] - vals[1], f.replace('%', '%+') if '%' in f else f)
        print(row)
    print()
    print('loudness, true peak and correlation are for the window; see tools/README.md for limits.')
    for lab in labels:
        t = out['tracks'][lab]
        if t.get('ffmpeg_ebur128'):
            e = t['ffmpeg_ebur128']
            print('xcheck %s: ffmpeg ebur128 on the same window: I %s LUFS, true peak %s dBTP (%s)' % (
                lab, e.get('lufs_integrated'), e.get('true_peak_dbtp'), e.get('ffmpeg')))
    print()
    print('kick glide, fit range 2-150 ms (coherent | per-beat median):')
    for lab in labels:
        g = out['tracks'][lab]['kick_glide']
        if 'coherent' in g:
            c, m = g['coherent'], g['median_per_beat']
            flag = ''
            if c.get('unreliable') or m.get('unreliable'):
                flag = '  UNRELIABLE (fit on a bound or residual > 50 Hz: low-band content other than the kick)'
            print('  %-10s beats %3d  coherent f0 %s fT %s tau %s ms rms %s Hz | median f0 %s fT %s tau %s ms%s' % (
                lab, g['n_hits'], fmt(c.get('f0_hz'), '%.1f'), fmt(c.get('fT_hz'), '%.1f'), fmt(c.get('tau_ms'), '%.2f'),
                fmt(c.get('rms_resid_hz'), '%.2f'), fmt(m.get('f0_hz'), '%.1f'), fmt(m.get('fT_hz'), '%.1f'), fmt(m.get('tau_ms'), '%.2f'), flag))
        else:
            print('  %-10s %s' % (lab, g.get('error')))
    print()
    print('sub duck, 30-40 Hz, kick template removed, dB power relative to 300-450 ms (%s):' % (
        'folded at the beat'))
    print('  %8s %s' % ('t (ms)', '  '.join('%12s' % lab for lab in labels) + ('       diff' if has_ref else '')))
    for tm in TIMES_MS:
        vals = [out['tracks'][lab]['sub_duck'].get('db_rel_plateau', {}).get(str(tm)) for lab in labels]
        line = '  %8d ' % tm + '  '.join('%12s' % fmt(v, '%.2f') for v in vals)
        if has_ref and None not in vals:
            line += '  %+10.2f' % (vals[0] - vals[1])
        print(line)
    print()
    print('per-step L/R correlation, 300 Hz-2 kHz (steps 1 to 16, step 1 = downbeat):')
    for lab in labels:
        c = out['tracks'][lab]['corr']['300-2000']
        print('  %-10s onset %s' % (lab, ' '.join('%5.2f' % v for v in c['onset_steps'])))
        print('  %-10s tail  %s' % (lab, ' '.join('%5.2f' % v for v in c['tail_steps'])))
    print()
    print('per-band L/R correlation, octave bands (all steps), onset | tail:')
    for band in OCT_BANDS:
        key = '%g-%g' % band
        line = '  %6s-%-6s' % (band[0], band[1])
        for lab in labels:
            v = out['tracks'][lab]['corr'][key]
            line += '   %-9s %5.2f | %5.2f' % (lab, v['onset_all'], v['tail_all'])
        print(line)


def selftest():
    ok_all = True

    def check(name, cond, detail=''):
        nonlocal ok_all
        ok_all = ok_all and bool(cond)
        print(('PASS ' if cond else 'FAIL ') + name + ((' (' + detail + ')') if detail else ''))

    (b, a), (b2, a2) = kweight_coeffs(48000.0)
    ref1 = [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585]
    got1 = [b[0], b[1], b[2], a[1], a[2]]
    check('K-weight stage 1 at 48 kHz matches BS.1770-4 Table 1', np.allclose(got1, ref1, atol=1e-6),
          'max diff %.2e' % np.max(np.abs(np.array(got1) - ref1)))
    check('K-weight stage 2 at 48 kHz matches BS.1770-4 Table 2', np.allclose([a2[1], a2[2]], [-1.99004745, 0.99007225], atol=1e-7),
          'a1 %.8f a2 %.8f' % (a2[1], a2[2]))
    t = np.arange(SR * 20) / SR
    sine = 0.1 * np.sin(2 * math.pi * 1000 * t)
    x = np.stack([sine, sine], axis=1).astype(np.float32)
    lufs = loudness(x)['lufs_integrated']
    _, H = signal.freqz(*kweight_coeffs(48000.0)[0], worN=[1000], fs=48000)
    _, H2 = signal.freqz(*kweight_coeffs(48000.0)[1], worN=[1000], fs=48000)
    gain_db = 20 * math.log10(abs(H[0] * H2[0]))
    expect = -0.691 + 10 * math.log10(0.01) + gain_db
    check('loudness of a stereo 1 kHz sine (0.1 amplitude) equals -0.691 + power + K gain at 1 kHz',
          abs(lufs - expect) < 0.05, 'measured %.3f, expected %.3f (K gain %.3f dB)' % (lufs, expect, gain_db))

    rng = np.random.default_rng(1)
    n = SR * 4
    nz = rng.standard_normal(n).astype(np.float32)
    same = np.stack([nz, nz], axis=1)
    indep = np.stack([nz, rng.standard_normal(n).astype(np.float32)], axis=1)
    tr_same = Track('t', '', same, '', 0, 120.0, 0.0)
    tr_ind = Track('t', '', indep, '', 0, 120.0, 0.0)
    r1 = corr_profile(tr_same, 0, n, [CORR_BAND])['300-2000']['onset_all']
    r2 = corr_profile(tr_ind, 0, n, [CORR_BAND])['300-2000']['onset_all']
    check('correlation: identical noise gives 1, independent noise gives about 0', r1 > 0.999 and abs(r2) < 0.05,
          'identical %.4f, independent %.4f' % (r1, r2))

    bpm_true = 126.0
    spb = 60.0 / bpm_true * SR
    clicks = np.zeros((int(SR * 40), 2), dtype=np.float32)
    burst = (rng.standard_normal(int(0.01 * SR)) * np.exp(-np.arange(int(0.01 * SR)) / 200.0)).astype(np.float32)
    for i in range(int(40 * bpm_true / 60)):
        p = int(round(i * spb))
        if p + len(burst) < len(clicks):
            clicks[p:p + len(burst), 0] += burst
            clicks[p:p + len(burst), 1] += burst
    bpm_est = tempo(clicks)[0]
    check('tempo estimate on a synthetic 126 BPM click track', abs(bpm_est - bpm_true) < 0.5, 'estimated %.2f' % bpm_est)

    # synthetic kick: f(t) = 51 + 213 exp(-t/24 ms), amplitude exp(-t/80 ms), plus an incoherent 34.47 Hz
    # drone at 0.2 (the reference's intro has 84 beats; the drone is about kick-tail level after 150 ms)
    f0_t, fT_t, tau_t = 264.0, 51.2, 0.0239
    nb = 84
    bar_s = int(round(4 * spb))
    total = nb * int(round(spb)) + SR
    y = np.zeros(total)
    tt = np.arange(total) / SR
    for j in range(nb):
        p = int(round(j * spb))
        u = np.arange(int(0.25 * SR)) / SR
        ph = 2 * math.pi * (fT_t * u + (f0_t - fT_t) * tau_t * (1 - np.exp(-u / tau_t)))
        y[p:p + len(u)] += np.sin(ph) * np.exp(-u / 0.08)
    drone = np.zeros(total)
    for j in range(nb):
        p0 = int(round(j * spb))
        seg_t = np.arange(int(round(spb))) / SR
        drone[p0:p0 + len(seg_t)] = 0.2 * np.sin(2 * math.pi * 34.47 * seg_t + rng.uniform(0, 2 * math.pi))
    mono = (y * 0.5 + drone).astype(np.float32)   # kick at 0.5, drone at 0.2
    kick = np.stack([mono, mono], axis=1)
    tr_k = Track('t', '', kick, '', 0, 126.0, 0.0)
    g = kick_glide(tr_k, 0, 4 * bar_s, lp_hz=400.0)
    c = g['coherent']
    check('kick glide fit recovers f0, fT, tau on a synthetic 264/51/24 ms kick',
          abs(c['f0_hz'] - f0_t) < 25 and abs(c['fT_hz'] - fT_t) < 6 and abs(c['tau_ms'] - tau_t * 1000) < 4,
          'f0 %.1f fT %.1f tau %.2f ms' % (c['f0_hz'], c['fT_hz'], c['tau_ms']))

    # sub duck: an incoherent 34.47 Hz drone (random phase per beat) ducked by 0.8 with a 50 ms decay
    nb_s = int(round(spb))
    dd = np.zeros(nb * nb_s + SR)
    for j in range(nb):
        p = j * nb_s
        u = np.arange(nb_s) / SR
        gain_j = 1 - 0.8 * np.exp(-u / 0.05)
        dd[p:p + nb_s] = 0.8 * gain_j * np.sin(2 * math.pi * 34.47 * u + rng.uniform(0, 2 * math.pi))
    dd = np.stack([dd, dd], axis=1).astype(np.float32)
    tr_d = Track('t', '', dd, '', 0, 126.0, 0.0)
    sd = sub_duck(tr_d, 0, 4 * bar_s)
    d20 = sd['db_rel_plateau']['20']
    d200 = sd['db_rel_plateau']['200']
    expect20 = 10 * math.log10((1 - 0.8 * math.exp(-0.02 / 0.05)) ** 2)
    check('sub duck: 20 ms is ducked by the expected amount, 200 ms is back near 0 dB',
          abs(d20 - expect20) < 1.5 and abs(d200) < 1.0,
          '20 ms %.2f dB (expect %.2f), 200 ms %.2f dB' % (d20, expect20, d200))

    print('OK: all selftest checks passed' if ok_all else 'FAILED: see FAIL lines above')
    return 0 if ok_all else 1


def json_default(o):
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, np.floating):
        return float(o)
    return str(o)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('render', nargs='?', help='render WAV (from tools/render.js); omit to score --ref alone')
    ap.add_argument('--ref', help='reference audio (MP3 or WAV), decoded with ffmpeg')
    ap.add_argument('--section', help='archived section name; compares its bars (SECTIONS table)')
    ap.add_argument('--bars', type=parse_bars, help='a:b bars relative to --section, or absolute song bars')
    ap.add_argument('--tail', type=float, default=0.0, help='seconds of tail appended to the window (default 0)')
    ap.add_argument('--json', action='store_true', help='print JSON instead of the table')
    ap.add_argument('--xcheck', action='store_true', help='also run ffmpeg ebur128 on the same window')
    ap.add_argument('--selftest', action='store_true', help='run synthetic checks of the measures and exit')
    args = ap.parse_args()
    if args.selftest:
        sys.exit(selftest())
    if not args.render and not args.ref:
        ap.error('a render WAV or --ref is required')
    side = None
    if args.render:
        if not os.path.isfile(args.render):
            die('no such file ' + args.render)
        side = load_sidecar(args.render)
    win = window_bars(args, side)
    tracks = []
    if args.render:
        tracks.append(load_track(args.render, side, True))
    if args.ref:
        tracks.append(load_track(args.ref, None, False))
    ranges = {tr.label: sample_range(tr, win, args.tail) for tr in tracks}

    out = {'window': None if win is None else {'bars': list(win), 'section': args.section, 'tail_s': args.tail},
           'tracks': {}}
    ref_lufs = None
    if not args.render:
        # reference alone: its own loudness is the A reference
        pass
    for tr in tracks:
        s0, s1 = ranges[tr.label]
        m = measure(tr, s0, s1)
        ap = os.path.abspath(tr.path)
        rp = os.path.relpath(ap, REPO)
        m['path'] = ap if rp.startswith('..') else rp
        m['start_sample'], m['end_sample'] = s0, s1
        if tr.label == 'reference':
            ref_lufs = m['lufs_integrated']
        if args.xcheck:
            m['ffmpeg_ebur128'] = ffmpeg_ebur(tr.path, s0, s1)
        out['tracks'][tr.label] = m
    for tr in tracks:
        m = out['tracks'][tr.label]
        m['flat'] = flat(m, ref_lufs)
    if args.json:
        print(json.dumps(out, indent=2, default=json_default))
    else:
        print_report(out, [tr.label for tr in tracks])


if __name__ == '__main__':
    main()
