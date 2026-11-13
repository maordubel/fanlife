"""An original music-box lullaby for the Good Night episodes, made here so no licence is involved.

python3 -m studio.kit.music.make_lullaby [out.mp3]
A slow 3/4 waltz (66 bpm) in F major: a plucked music-box comb (a few inharmonic partials, quick attack, long
decay), a soft low pad under it, and a small room. 16 bars that loop seamlessly — the build loops the bed."""
import subprocess
import sys
from pathlib import Path

import numpy as np

SR = 44100
BPM = 66
BEAT = 60 / BPM
NOTE = {n: 440 * 2 ** ((i - 9) / 12) for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}


def hz(name: str) -> float:
    n, o = name[:-1], int(name[-1])
    return NOTE[n] * 2 ** (o - 4)


# melody: (note, beats) — an original tune, four phrases of four bars
MEL = [
    ('C5', 1), ('A4', 1), ('F4', 1), ('A4', 2), ('C5', 1), ('D5', 1), ('C5', 1), ('A4', 1), ('G4', 3),
    ('A4', 1), ('G4', 1), ('F4', 1), ('G4', 2), ('A4', 1), ('C5', 1), ('A4', 1), ('G4', 1), ('F4', 3),
    ('F5', 1), ('E5', 1), ('D5', 1), ('C5', 2), ('A4', 1), ('D5', 1), ('C5', 1), ('A4', 1), ('G4', 3),
    ('A4', 1), ('C5', 1), ('A4', 1), ('G4', 1), ('E4', 1), ('G4', 1), ('F4', 3), (None, 3),
]
# one chord per bar (root, third, fifth)
CHORDS = ['F', 'F', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C', 'Dm', 'Bb', 'F', 'C', 'F', 'C', 'F', 'F']
TRIAD = {'F': ['F3', 'A3', 'C4'], 'Bb': ['A#2', 'D3', 'F3'], 'C': ['C3', 'E3', 'G3'], 'Dm': ['D3', 'F3', 'A3']}


def pluck(f: float, dur: float, amp: float) -> np.ndarray:
    t = np.arange(int(SR * dur)) / SR
    env = np.exp(-t / 1.1) * (1 - np.exp(-t / 0.002))
    w = (np.sin(2 * np.pi * f * t) + 0.32 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / 0.4)
         + 0.16 * np.sin(2 * np.pi * f * 3.98 * t) * np.exp(-t / 0.18) + 0.05 * np.sin(2 * np.pi * f * 6.3 * t) * np.exp(-t / 0.08))
    return amp * env * w


def pad(fs: list[float], dur: float) -> np.ndarray:
    t = np.arange(int(SR * dur)) / SR
    env = np.minimum(1, t / 0.9) * np.minimum(1, (dur - t) / 0.9)
    return env * sum(np.sin(2 * np.pi * f * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.2 * t + k)) for k, f in enumerate(fs)) / len(fs)


def main(out: Path) -> None:
    bars = 16
    total = bars * 3 * BEAT
    mix = np.zeros(int(SR * (total + 4)))
    t = 0.0
    for name, beats in MEL:
        if name:
            s = int(t * SR)
            p = pluck(hz(name), 3.5, 0.32)
            mix[s:s + len(p)] += p
        t += beats * BEAT
    for b, c in enumerate(CHORDS):                       # the comb also plays the bass note on each downbeat
        s = int(b * 3 * BEAT * SR)
        root = TRIAD[c][0]
        p = pluck(hz(root[:-1] + str(int(root[-1]) + 1)) / 2, 3.0, 0.14)
        mix[s:s + len(p)] += p
        pd = 0.05 * pad([hz(n) for n in TRIAD[c]], 3 * BEAT + 0.6)
        mix[s:s + len(pd)] += pd
    tail = mix[int(total * SR):].copy()                  # the ring-out wraps onto the start, so the loop is seamless
    mix = mix[:int(total * SR)]
    mix[:len(tail)] += tail
    rng = np.random.default_rng(7)                       # a small room
    ir = rng.standard_normal(int(SR * 1.4)) * np.exp(-np.arange(int(SR * 1.4)) / (SR * 0.35))
    ir[0] = 1.0
    wet = np.fft.irfft(np.fft.rfft(np.concatenate([mix, mix[:len(ir)]]), n=len(mix) + 2 * len(ir))
                       * np.fft.rfft(ir, n=len(mix) + 2 * len(ir)))[len(ir):len(ir) + len(mix)]
    y = 0.8 * mix + 0.05 * wet
    y = y / np.abs(y).max() * 0.8
    pcm = (y * 32767).astype(np.int16)
    st = np.stack([pcm, pcm], 1).tobytes()
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-',
                    '-c:a', 'libmp3lame', '-q:a', '2', str(out)], input=st, check=True)
    print(out, round(total, 1), 's')


if __name__ == '__main__':
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / 'cache/owner/fairytales-lullaby-hapoel.mp3')
