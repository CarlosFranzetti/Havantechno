#!/usr/bin/env python3
"""Stem separation for the analysis pipeline (L1, Lab Crew; batch 4's separator; A1, Selector Crew T1).

Models (--model):
  htdemucs  Demucs v4 HT-Demucs (Meta Platforms), run in this process through demucs.pretrained.get_model and
            demucs.apply.apply_model with the settings of `python -m demucs` (shifts 1, overlap 0.25, split, the model's
            own segment) and the CLI's input normalisation. Four stems: drums, bass, other, vocals.
  mdx       KUIELab MDX-Net (the MDX 2021 challenge models, leaderboard A) as ONNX files published in UVR's model
            repository (GitHub release TRvlvr/model_repo, tag all_public_uvr_models). Settings per file from UVR's
            published mdx_model_data/model_data.json, keyed by the MD5 of the file's last 10,000 KiB (UVR's own scheme):
            drums n_fft 4096, bass n_fft 16384, other n_fft 8192; dim_f 2048, dim_t 2^9, hop 1024, compensate 1.035.
            Input tensor [1, 4, 2048, 512] = (L re, L im, R re, R im) of the first 2048 STFT bins. 523,264-sample chunks
            with 50 % Hann-weighted overlap. Three stems: drums, bass, other.
  auto      (default) HT-Demucs when the demucs package and its weights work, else MDX-Net.
  stub      for checks only (tools/separate-check.js): no network, no weights, no torch. A deterministic FFT band split
            into drums, bass, other and vocals, each scaled by 0.9, so the residual is exactly 0.1 of the mix
            (-20 dB). It is not a separator; the desktop app never asks for it (app/shell/separation.js refuses it).

Output (A1, 2026-11-27): every stem is written as 32-bit float WAV at 44.1 kHz, stereo, with no clipping, clamping or
rescaling (Demucs' own CLI defaults to 16-bit with --clip-mode rescale, which divides a stem by its peak when the stem
would clip and so changes one stem's level against another's; that is why this file no longer calls the CLI). Beside the
stems:
  <name>-residual.wav  the mix minus the sum of the stems (float32), so stems + residual give back the mix to float
                       rounding. It is not a stem: the sidecar lists it under "residual", never under "stems", so the
                       app's four-stem contract (app/shell/separation.js, Project.importTrack) is unchanged.
  <name>-stems.json    the sidecar, written last: input, model, stems {name: path}, residual {path, rmsDbfs, relativeDb,
                       peak}, peaks per stem, sumCheck (the largest |mix - stems - residual| read back from the files),
                       format, settings, seed, weights [{file, sha256, bytes, url}] (the files actually loaded), licence
                       {code, weights}, attribution, timings.

Licences (read by L2 on 2026-11-11 through curl; quotes in docs/research/2026-11-09-lab-crew/transcripts/log-L2.md):
MDX-Net: the weights are the KUIELab authors' own upload to Zenodo, record 5717356 ("Uploaded files are trained
parameters for KUIELab-MDX-Net", Kim, Choi, Chung, Lee, Jung), licence CC BY 4.0. UVR's release files
kuielab_a_{drums,bass,other}.onnx are byte-identical to onnx_A/{drums,bass,other}.onnx in that record (full-file MD5
below), so the CC BY 4.0 terms apply. The kuielab/mdx-net and mdx-net-submission code is MIT; UVR's README asks third
parties using its models to credit UVR and its developers. Demucs is MIT (Meta Platforms); its weight files carry no
separate licence statement that L2 or S2 (Stem Crew, 2026-11-21) could find; the README says "Demucs is released under
the MIT license". The sidecar carries these strings as they are; they are not a legal opinion.

Scores (L2, 2026-11-11): on exact stems (16 bars of the V3 render, the twelve solos summed) HT-Demucs scored drums 24.0,
bass 17.7, other 19.4 dB SDR against MDX-Net's 9.7, 7.5, 15.9. tools/separate-check.js --full repeats that measurement.

Usage:
  python3 tools/separate.py <audio> [--out DIR] [--stems drums,bass,other] [--model auto|mdx|htdemucs|stub] [--models DIR]
                            [--seed N]
  python3 tools/separate.py --check [--model auto|mdx|htdemucs] [--models DIR]
--check (D3, 2026-11-11, for the desktop app's preflight) separates nothing: it prints one JSON object on stdout with the
Python version, the packages the chosen model needs (REQUIRES below), which of them are missing, whether ffmpeg is found,
which MDX-Net ONNX files are cached and whether the HT-Demucs weights are cached, and exits 0. It runs even when numpy or
scipy are missing.
Default out: tools/out/stems/ (git-ignored with the rest of tools/out). Exit 0 on success.
numpy and scipy always; torch and onnxruntime for MDX-Net; demucs and torch for HT-Demucs; ffmpeg only for non-WAV input.
"""
import argparse, hashlib, importlib.util, json, os, random, shutil, subprocess, sys, time, urllib.request

try:
    import numpy as np
    import scipy.io.wavfile as wavfile
    from scipy.signal import resample_poly
    _IMPORT_ERROR = None
except ImportError as _e:       # re-raised in main() unless --check asked what is missing
    np = wavfile = resample_poly = None
    _IMPORT_ERROR = _e

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 44100
RELEASE = 'https://github.com/TRvlvr/model_repo/releases/download/all_public_uvr_models/'
MODELS = {   # file, UVR model_data hash, n_fft, compensate, full-file MD5 of the Zenodo original (onnx_A/<stem>.onnx)
    'drums': ('kuielab_a_drums.onnx', 'dc41ede5961d50f277eb846db17f5319', 4096, 1.035, 'bfc170e3b60a700dc388dadf4a62d5b0'),
    'bass': ('kuielab_a_bass.onnx', '6703e39f36f18aa7855ee1047765621d', 16384, 1.035, '949791e2b24c41c03b6d90c770f03f62'),
    'other': ('kuielab_a_other.onnx', '26d308f91f3423a67dc69a6d12a8793d', 8192, 1.035, 'c2fa07e67d5a58ddd97d72c29bbe955b'),
}
ATTRIBUTION = ('Separation: KUIELab-MDX-Net (Kim, Choi, Chung, Lee, Jung), weights CC BY 4.0, Zenodo 10.5281/zenodo.5717356; '
               'files mirrored by Ultimate Vocal Remover (UVR).')
DEMUCS_ATTRIBUTION = 'Separation: Demucs v4 htdemucs (Meta Platforms), MIT.'
STUB_ATTRIBUTION = 'Test stub (tools/separate.py): a band split for checks, not a separator.'
LICENCE = {
    'mdx': {'code': 'MIT (kuielab/mdx-net, mdx-net-submission); this runner is part of Recut, AGPL-3.0-or-later',
            'weights': 'CC BY 4.0 (Zenodo record 5717356, the KUIELab authors\' upload; UVR\'s files are byte-identical, '
                       'checked by full-file MD5)'},
    'htdemucs': {'code': 'MIT, Copyright (c) Meta Platforms, Inc. and affiliates (facebookresearch/demucs LICENSE)',
                 'weights': 'no separate licence statement found for the weight files; the Demucs README says '
                            '"Demucs is released under the MIT license" (read by L2 2026-11-11 and S2 2026-11-21)'},
    'stub': {'code': 'Recut, AGPL-3.0-or-later', 'weights': 'none (no weights)'},
}
DIM_F, DIM_T, HOP = 2048, 512, 1024
DEMUCS_NAME = 'htdemucs'
DEMUCS_SETTINGS = {'shifts': 1, 'overlap': 0.25, 'split': True, 'segment': None}   # python -m demucs defaults (4.1.0)
STUB_BANDS = (('bass', 0.0, 150.0), ('other', 150.0, 2000.0), ('vocals', 2000.0, 6000.0), ('drums', 6000.0, None))
STUB_GAIN = 0.9
# pip package = module name, per model path. numpy and scipy are imported above for every model; the MDX-Net path adds
# torch (STFT) and onnxruntime; the HT-Demucs path adds demucs, which needs torch.
REQUIRES = {'common': ['numpy', 'scipy'], 'mdx': ['torch', 'onnxruntime'], 'htdemucs': ['demucs', 'torch']}


def have(mod):
    try:
        return importlib.util.find_spec(mod) is not None
    except (ImportError, ValueError):
        return False


def torch_hub_dir():
    """torch.hub.get_dir() without importing torch (slow, and --check must run without it)."""
    if os.environ.get('TORCH_HOME'):
        return os.path.join(os.path.expanduser(os.environ['TORCH_HOME']), 'hub')
    xdg = os.environ.get('XDG_CACHE_HOME') or os.path.join(os.path.expanduser('~'), '.cache')
    return os.path.join(xdg, 'torch', 'hub')


def demucs_weight_urls(name=DEMUCS_NAME):
    """The URLs of the weight files the named Demucs model loads, read from the installed package's remote/ folder
    (files.txt and <name>.yaml), the same lists demucs.pretrained reads. Empty when demucs is not installed."""
    try:
        spec = importlib.util.find_spec('demucs')
    except (ImportError, ValueError):
        spec = None
    if spec is None or not spec.submodule_search_locations:
        return []
    remote = os.path.join(list(spec.submodule_search_locations)[0], 'remote')
    try:
        with open(os.path.join(remote, 'files.txt')) as f:
            lines = f.read().split('\n')
        with open(os.path.join(remote, name + '.yaml')) as f:
            yml = f.read()
    except OSError:
        return []
    root, files = '', {}
    for line in lines:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if line.startswith('root:'):
            root = line.split(':', 1)[1].strip()
        else:
            files[line.split('-', 1)[0]] = 'https://dl.fbaipublicfiles.com/demucs/' + root + line
    sigs, in_list = [], False
    for raw in yml.split('\n'):   # "models: ['955717e8']" (one line) or "models:" followed by "- 955717e8" items
        line = raw.strip()
        if line.startswith('models:'):
            sigs += [s.strip().strip('\'"') for s in line.split(':', 1)[1].strip().strip('[]').split(',') if s.strip()]
            in_list = not line.split(':', 1)[1].strip()
        elif in_list and line.startswith('- '):
            sigs.append(line[2:].strip().strip('\'"'))
        elif line:
            in_list = False
    return [files[s] for s in sigs if s in files]


def check(model, mdir):
    """What the chosen model needs and what is missing. auto prefers HT-Demucs, so it reports that path's packages."""
    want = list(REQUIRES['common'])
    if model == 'mdx':
        want += REQUIRES['mdx']
    elif model != 'stub':
        want += REQUIRES['htdemucs']
    present = {m: have(m) for m in sorted(set(want) | set(REQUIRES['mdx']) | set(REQUIRES['htdemucs']))}
    missing = [m for m in want if not present[m]]
    usable_fallback = model == 'auto' and present['numpy'] and present['scipy'] and present['torch'] and present['onnxruntime']
    ff = os.environ.get('FFMPEG') or shutil.which('ffmpeg') or ('/usr/bin/ffmpeg' if os.path.exists('/usr/bin/ffmpeg') else None)
    urls = demucs_weight_urls()
    ck = os.path.join(torch_hub_dir(), 'checkpoints')
    return {'python': '%d.%d.%d' % sys.version_info[:3], 'model': model, 'requires': REQUIRES, 'present': present,
            'missing': missing, 'mdxFallbackUsable': bool(usable_fallback), 'ffmpeg': ff,
            'modelsDir': mdir, 'mdxCached': {st: os.path.exists(os.path.join(mdir, MODELS[st][0])) for st in MODELS},
            'htdemucsCached': bool(urls) and all(os.path.exists(os.path.join(ck, os.path.basename(u))) for u in urls)}


def die(msg, code=2):
    print('separate.py: ' + msg, file=sys.stderr)
    sys.exit(code)


def uvr_hash(path):
    with open(path, 'rb') as f:
        try:
            f.seek(-10000 * 1024, 2)
        except OSError:
            f.seek(0)
        return hashlib.md5(f.read()).hexdigest()


def file_digest(path, algo='sha256'):
    h = hashlib.new(algo)
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''):
            h.update(block)
    return h.hexdigest()


def fetch_model(stem, mdir):
    name, h, _, _, full = MODELS[stem]
    path = os.path.join(mdir, name)
    if not os.path.exists(path):
        os.makedirs(mdir, exist_ok=True)
        print('downloading ' + name, file=sys.stderr)
        tmp = path + '.part'
        urllib.request.urlretrieve(RELEASE + name, tmp)
        os.replace(tmp, path)
    got = uvr_hash(path)
    if got != h:
        die('%s: hash %s does not match UVR model_data %s; settings would be wrong' % (name, got, h))
    whole = file_digest(path, 'md5')
    if whole != full:
        die('%s: MD5 %s is not the Zenodo original %s; its licence is unknown' % (name, whole, full))
    return path


def load(path):
    """The input as float32 [2, N] at 44.1 kHz. This array is the mix the residual is measured against."""
    info = {}
    if path.lower().endswith(('.wav', '.wave')):
        sr, x = wavfile.read(path)
        info['inputFormat'] = str(x.dtype)
    else:
        ff = os.environ.get('FFMPEG') or shutil.which('ffmpeg') or '/usr/bin/ffmpeg'
        raw = subprocess.run([ff, '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                             check=True, capture_output=True).stdout
        sr, x = SR, np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
        info['inputFormat'] = 'ffmpeg f32le'
    if x.dtype == np.int16:
        x = x.astype(np.float32) / 32768.0
    elif x.dtype == np.int32:
        x = x.astype(np.float32) / 2147483648.0
    elif x.dtype == np.uint8:
        x = (x.astype(np.float32) - 128.0) / 128.0
    x = x.astype(np.float32)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    x = x[:, :2]
    if x.shape[1] == 1:
        x = np.concatenate([x, x], 1)
    info['inputSampleRate'] = int(sr)
    info['resampled'] = sr != SR
    if sr != SR:
        g = np.gcd(sr, SR)
        x = resample_poly(x, SR // g, sr // g, axis=0).astype(np.float32)
    return x.T.copy(), info


def mdx(x, stem, mdir):
    import torch, onnxruntime as ort
    path = fetch_model(stem, mdir)
    _, _, n_fft, comp, _ = MODELS[stem]
    sess = ort.InferenceSession(path, providers=['CPUExecutionProvider'])
    win = torch.hann_window(n_fft)

    def spec(seg):
        s = torch.stft(torch.from_numpy(seg), n_fft, HOP, window=win, center=True, return_complex=True)[:, :DIM_F, :]
        return torch.stack([s[0].real, s[0].imag, s[1].real, s[1].imag])[None].numpy().astype(np.float32)

    def wave(y, length):
        y = torch.from_numpy(y[0])
        c = torch.zeros(2, n_fft // 2 + 1, y.shape[-1], dtype=torch.complex64)
        c[0, :DIM_F] = torch.complex(y[0], y[1])
        c[1, :DIM_F] = torch.complex(y[2], y[3])
        return torch.istft(c, n_fft, HOP, window=win, center=True, length=length).numpy()

    L = HOP * (DIM_T - 1)
    step, N = L // 2, x.shape[1]
    pad = np.zeros((2, N + 2 * L), np.float32)
    pad[:, L:L + N] = x
    out = np.zeros_like(pad)
    wsum = np.zeros(pad.shape[1], np.float32)
    w = np.hanning(L).astype(np.float32) + 1e-3
    for s0 in range(0, pad.shape[1] - L + 1, step):
        y = sess.run(None, {'input': spec(pad[:, s0:s0 + L])})[0]
        out[:, s0:s0 + L] += wave(y, L) * w
        wsum[s0:s0 + L] += w
    return (out / np.maximum(wsum, 1e-6))[:, L:L + N] * comp, {'file': MODELS[stem][0], 'path': path}


class DemucsUnavailable(Exception):
    pass


def htdemucs(x, seed):
    """HT-Demucs on the loaded mix x [2, N], in this process. Returns ({stem: float32 [2, N]}, weights list).
    Same normalisation and apply_model settings as `python -m demucs` 4.1.0, minus its 16-bit write and clip rescale.
    shifts=1 draws one random time offset (Python's random module), so the run is seeded for repeatable output."""
    try:
        import torch
        from demucs.pretrained import get_model
        from demucs.apply import apply_model
    except Exception as e:   # the package or torch is missing or broken
        raise DemucsUnavailable('demucs could not be imported (%s: %s)' % (type(e).__name__, e))
    try:
        model = get_model(DEMUCS_NAME)
    except Exception as e:   # weights not cached and the download failed, or a bad file
        print('%s: %s' % (type(e).__name__, e), file=sys.stderr)
        raise DemucsUnavailable('demucs failed (weights); are its weights reachable (dl.fbaipublicfiles.com)?')
    model.cpu().eval()
    ck = os.path.join(torch.hub.get_dir(), 'checkpoints')
    weights = []
    for u in demucs_weight_urls():
        p = os.path.join(ck, os.path.basename(u))
        if os.path.exists(p):
            weights.append({'file': os.path.basename(u), 'url': u, 'bytes': os.path.getsize(p), 'sha256': file_digest(p)})
    if not weights:
        die('HT-Demucs loaded but its weight file was not found under %s; cannot record which weights were used' % ck, 1)
    random.seed(seed)
    torch.manual_seed(seed)
    wav = torch.from_numpy(x)
    ref = wav.mean(0)
    mean, std = ref.mean(), ref.std()
    with torch.no_grad():
        out = apply_model(model, ((wav - mean) / std)[None], device='cpu', shifts=DEMUCS_SETTINGS['shifts'],
                          split=DEMUCS_SETTINGS['split'], overlap=DEMUCS_SETTINGS['overlap'],
                          segment=DEMUCS_SETTINGS['segment'], progress=True, num_workers=0)[0]
    out = out * std + mean
    return {name: out[i].numpy().astype(np.float32) for i, name in enumerate(model.sources)}, weights


def stub(x):
    """Test stub: brick-wall FFT bands per stem, each times STUB_GAIN. Bands tile the spectrum, so the stems sum to
    STUB_GAIN times the mix and the residual is (1 - STUB_GAIN) times the mix."""
    N = x.shape[1]
    X = np.fft.rfft(x.astype(np.float64), axis=1)
    f = np.fft.rfftfreq(N, 1.0 / SR)
    out = {}
    for name, lo, hi in STUB_BANDS:
        m = (f >= lo) & (f < hi if hi is not None else True)
        out[name] = (np.fft.irfft(X * m, N, axis=1) * STUB_GAIN).astype(np.float32)
    return out


def write_f32(path, y):
    """y [2, N] float32 -> a WAVE_FORMAT_IEEE_FLOAT file, values as they are (no clip, no rescale)."""
    wavfile.write(path, SR, np.ascontiguousarray(y.T.astype(np.float32)))


def db(v):
    return round(float(10 * np.log10(v)), 3) if v > 0 else None


def finish(x, stems, out_dir, name, info):
    """Write the stems and the residual as float32, read them back, and record levels and the sum check."""
    order = [s for s in ('drums', 'bass', 'other', 'vocals') if s in stems] + sorted(s for s in stems if s not in ('drums', 'bass', 'other', 'vocals'))
    total = np.zeros(x.shape, np.float64)
    info['peaks'] = {}
    for st in order:
        y = stems[st].astype(np.float32)
        if y.shape != x.shape:
            die('stem %s has shape %s, the mix %s' % (st, y.shape, x.shape), 1)
        p = os.path.join(out_dir, '%s-%s.wav' % (name, st))
        write_f32(p, y)
        info['stems'][st] = p
        info['peaks'][st] = round(float(np.abs(y).max()), 6)
        total += y
    res = (x.astype(np.float64) - total).astype(np.float32)
    rp = os.path.join(out_dir, '%s-residual.wav' % name)
    write_f32(rp, res)
    e_mix, e_res = float(np.sum(x.astype(np.float64) ** 2)), float(np.sum(res.astype(np.float64) ** 2))
    info['residual'] = {'path': rp, 'rmsDbfs': db(e_res / res.size), 'relativeDb': db(e_res / e_mix) if e_mix > 0 else None,
                        'peak': round(float(np.abs(res).max()), 6),
                        'note': 'mix minus the sum of the stems; not a stem, not analysed as one'}
    # read back what is on disk: the files must give back the mix to float rounding
    back = np.zeros(x.shape, np.float64)
    for st in order + ['residual']:
        sr, y = wavfile.read(info['stems'][st] if st != 'residual' else rp)
        if y.dtype != np.float32 or sr != SR:
            die('%s was written as %s at %d Hz, not float32 at %d' % (st, y.dtype, sr, SR), 1)
        back += y.T.astype(np.float64)
    err = np.abs(back - x.astype(np.float64))
    info['sumCheck'] = {'maxAbs': float(err.max()), 'mixPeak': round(float(np.abs(x).max()), 6),
                        'what': 'max |mix - (sum of stem files + residual file)| over samples, as read back from disk'}
    info['format'] = {'sampleFormat': 'float32', 'sampleRate': SR, 'channels': 2, 'rescaled': False, 'clipped': False}
    for st in order:
        print('%s: peak %.4f' % (st, info['peaks'][st]))   # not "<stem>: <n> s": separation.js counts those as progress
    print('residual: %s dB against the mix' % info['residual']['relativeDb'])


def main():
    ap = argparse.ArgumentParser(description='Separate an audio file into stems (HT-Demucs or MDX-Net), float32, with a residual.')
    ap.add_argument('audio', nargs='?')
    ap.add_argument('--check', action='store_true', help='print what the model needs and what is missing, as JSON; separate nothing')
    ap.add_argument('--out', default=os.path.join(HERE, 'out', 'stems'))
    ap.add_argument('--stems', default='drums,bass,other', help='MDX-Net stems to compute (default all three)')
    ap.add_argument('--model', choices=['auto', 'mdx', 'htdemucs', 'stub'], default='auto',
                    help='auto (default): HT-Demucs when the demucs package runs, else MDX-Net (L2 comparison, log-L2.md); '
                         'stub: a band split for tests only')
    ap.add_argument('--models', default=os.environ.get('RECUT_MODELS', os.path.join(os.path.expanduser('~'), '.cache', 'recut', 'models')),
                    help='where the ONNX files are cached (never the repository)')
    ap.add_argument('--seed', type=int, default=0, help='seed for HT-Demucs\'s random shift (default 0)')
    a = ap.parse_args()
    if a.check:
        print(json.dumps(check(a.model, a.models)))
        return
    if not a.audio:
        ap.error('the following arguments are required: audio')
    if _IMPORT_ERROR is not None:
        raise _IMPORT_ERROR
    if not os.path.exists(a.audio):
        die('no such file: ' + a.audio)
    os.makedirs(a.out, exist_ok=True)
    name = os.path.splitext(os.path.basename(a.audio))[0]
    t0 = time.time()
    x, linfo = load(a.audio)
    info = {'input': a.audio, 'model': a.model, 'requested': a.model, 'sampleRate': SR, 'stems': {}, 'seconds': {},
            'durationSeconds': round(x.shape[1] / SR, 2)}
    info.update(linfo)
    stems, weights = None, []
    if a.model in ('auto', 'htdemucs'):
        try:
            stems, weights = htdemucs(x, a.seed)
            a.model = 'htdemucs'
            info['settings'] = dict(DEMUCS_SETTINGS, name=DEMUCS_NAME, normalise='(x - mean) / std of the mono mix, as python -m demucs')
            info['seed'] = a.seed
            info['seconds']['all'] = round(time.time() - t0, 1)
        except DemucsUnavailable as e:
            if a.model == 'htdemucs':
                die(str(e), 3)
            print('separate.py: %s; falling back to MDX-Net' % e, file=sys.stderr)
            a.model = 'mdx'
    if a.model == 'stub':
        stems = stub(x)
        info['settings'] = {'bands': [[n, lo, hi] for n, lo, hi in STUB_BANDS], 'gain': STUB_GAIN}
        info['seconds']['all'] = round(time.time() - t0, 3)
    elif a.model == 'mdx':
        stems = {}
        for st in [s.strip() for s in a.stems.split(',') if s.strip()]:
            if st not in MODELS:
                die('unknown stem %s (drums, bass, other)' % st)
            t = time.time()
            stems[st], used = mdx(x, st, a.models)
            weights.append({'file': used['file'], 'bytes': os.path.getsize(used['path']), 'sha256': file_digest(used['path']),
                            'md5': MODELS[st][4], 'url': RELEASE + used['file']})
            info['seconds'][st] = round(time.time() - t, 1)
            info.setdefault('settings', {})[st] = {'file': MODELS[st][0], 'uvrHash': MODELS[st][1], 'n_fft': MODELS[st][2],
                                                  'dim_f': DIM_F, 'dim_t': DIM_T, 'hop': HOP, 'compensate': MODELS[st][3]}
            print('%s: %.1f s' % (st, info['seconds'][st]))
    info['model'] = a.model
    info['weights'] = weights
    info['licence'] = LICENCE[a.model]
    info['attribution'] = {'mdx': ATTRIBUTION, 'htdemucs': DEMUCS_ATTRIBUTION, 'stub': STUB_ATTRIBUTION}[a.model]
    finish(x, stems, a.out, name, info)
    with open(os.path.join(a.out, name + '-stems.json'), 'w') as f:   # last: its presence means the run is complete
        json.dump(info, f, indent=2)
    print('stems written to ' + a.out)


if __name__ == '__main__':
    main()
