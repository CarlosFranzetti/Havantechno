#!/usr/bin/env python3
"""Stem separation for the analysis pipeline (L1, Lab Crew; batch 4's separator).

Default model: KUIELab MDX-Net (the MDX 2021 challenge models, leaderboard A) as ONNX files published in UVR's model
repository (GitHub release TRvlvr/model_repo, tag all_public_uvr_models). Settings per file from UVR's published
mdx_model_data/model_data.json, keyed by the MD5 of the file's last 10,000 KiB (UVR's own scheme):
  drums  n_fft 4096,  bass n_fft 16384,  other n_fft 8192;  dim_f 2048, dim_t 2^9, hop 1024, compensate 1.035.
Input tensor [1, 4, 2048, 512] = (L re, L im, R re, R im) of the first 2048 STFT bins. 523,264-sample chunks with
50 % Hann-weighted overlap.

Licences (read by L2 on 2026-11-11 through curl; quotes in docs/research/2026-11-09-lab-crew/transcripts/log-L2.md):
the weights are the KUIELab authors' own upload to Zenodo, record 5717356 ("Uploaded files are trained parameters for
KUIELab-MDX-Net", Kim, Choi, Chung, Lee, Jung), licence CC BY 4.0. UVR's release files kuielab_a_{drums,bass,other}.onnx
are byte-identical to onnx_A/{drums,bass,other}.onnx in that record (full-file MD5 below), so the CC BY 4.0 terms
apply: use, redistribution and commercial use are allowed with attribution. The kuielab/mdx-net and
mdx-net-submission code is MIT; UVR's README asks third parties using its models to credit UVR and its developers.
Attribution to show wherever the stems are used: "Separation: KUIELab-MDX-Net (Kim, Choi, Chung, Lee, Jung), weights
CC BY 4.0, Zenodo 10.5281/zenodo.5717356; files mirrored by Ultimate Vocal Remover (UVR)." Demucs (--model htdemucs)
is MIT (Meta Platforms); its weight files carry no separate licence statement that L2 could find.

Usage:
  python3 tools/separate.py <audio> [--out DIR] [--stems drums,bass,other] [--model mdx|htdemucs] [--models DIR]
Writes <out>/<name>-<stem>.wav (float32, 44.1 kHz stereo) and <out>/<name>-stems.json (model, settings, timings).
Default out: tools/out/stems/ (git-ignored with the rest of tools/out). Exit 0 on success.
numpy, scipy, torch (STFT) and onnxruntime; ffmpeg only for non-WAV input.
"""
import argparse, hashlib, json, os, shutil, subprocess, sys, time, urllib.request

import numpy as np
import scipy.io.wavfile as wavfile
from scipy.signal import resample_poly

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
DIM_F, DIM_T, HOP = 2048, 512, 1024


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
    with open(path, 'rb') as f:
        whole = hashlib.md5(f.read()).hexdigest()
    if whole != full:
        die('%s: MD5 %s is not the Zenodo original %s; its licence is unknown' % (name, whole, full))
    return path


def load(path):
    if path.lower().endswith('.wav'):
        sr, x = wavfile.read(path)
    else:
        ff = os.environ.get('FFMPEG') or shutil.which('ffmpeg') or '/usr/bin/ffmpeg'
        raw = subprocess.run([ff, '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                             check=True, capture_output=True).stdout
        sr, x = SR, np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
    if x.dtype == np.int16:
        x = x.astype(np.float32) / 32768.0
    elif x.dtype == np.int32:
        x = x.astype(np.float32) / 2147483648.0
    x = x.astype(np.float32)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    x = x[:, :2]
    if sr != SR:
        g = np.gcd(sr, SR)
        x = resample_poly(x, SR // g, sr // g, axis=0).astype(np.float32)
    return x.T.copy()


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
    return (out / np.maximum(wsum, 1e-6))[:, L:L + N] * comp


def htdemucs(src, out_dir, name):
    tmp = os.path.join(out_dir, '_demucs')
    r = subprocess.run([sys.executable, '-m', 'demucs', '-n', 'htdemucs', '-o', tmp, src])
    if r.returncode != 0:
        die('demucs failed (exit %d); are its weights reachable (dl.fbaipublicfiles.com)?' % r.returncode, 3)
    base = os.path.join(tmp, 'htdemucs', os.path.splitext(os.path.basename(src))[0])
    files = {}
    for st in ('drums', 'bass', 'other', 'vocals'):
        dst = os.path.join(out_dir, '%s-%s.wav' % (name, st))
        shutil.move(os.path.join(base, st + '.wav'), dst)
        files[st] = dst
    shutil.rmtree(tmp, ignore_errors=True)
    return files


def main():
    ap = argparse.ArgumentParser(description='Separate an audio file into stems (MDX-Net ONNX or HT-Demucs).')
    ap.add_argument('audio')
    ap.add_argument('--out', default=os.path.join(HERE, 'out', 'stems'))
    ap.add_argument('--stems', default='drums,bass,other', help='MDX-Net stems to compute (default all three)')
    ap.add_argument('--model', choices=['mdx', 'htdemucs'], default='mdx')
    ap.add_argument('--models', default=os.environ.get('HAVANTECHNO_MODELS', os.path.join(os.path.expanduser('~'), '.cache', 'havantechno', 'models')),
                    help='where the ONNX files are cached (never the repository)')
    a = ap.parse_args()
    if not os.path.exists(a.audio):
        die('no such file: ' + a.audio)
    os.makedirs(a.out, exist_ok=True)
    name = os.path.splitext(os.path.basename(a.audio))[0]
    info = {'input': a.audio, 'model': a.model, 'sampleRate': SR, 'stems': {}, 'seconds': {},
            'attribution': ATTRIBUTION if a.model == 'mdx' else 'Separation: Demucs v4 htdemucs (Meta Platforms), MIT.'}
    t0 = time.time()
    if a.model == 'htdemucs':
        info['stems'] = htdemucs(a.audio, a.out, name)
        info['seconds']['all'] = round(time.time() - t0, 1)
    else:
        x = load(a.audio)
        info['durationSeconds'] = round(x.shape[1] / SR, 2)
        for st in [s.strip() for s in a.stems.split(',') if s.strip()]:
            if st not in MODELS:
                die('unknown stem %s (drums, bass, other)' % st)
            t = time.time()
            y = mdx(x, st, a.models)
            p = os.path.join(a.out, '%s-%s.wav' % (name, st))
            wavfile.write(p, SR, y.T.astype(np.float32))
            info['stems'][st] = p
            info['seconds'][st] = round(time.time() - t, 1)
            info.setdefault('settings', {})[st] = {'file': MODELS[st][0], 'uvrHash': MODELS[st][1], 'n_fft': MODELS[st][2],
                                                  'dim_f': DIM_F, 'dim_t': DIM_T, 'hop': HOP, 'compensate': MODELS[st][3]}
            print('%s: %.1f s' % (st, info['seconds'][st]))
    with open(os.path.join(a.out, name + '-stems.json'), 'w') as f:
        json.dump(info, f, indent=2)
    print('stems written to ' + a.out)


if __name__ == '__main__':
    main()
