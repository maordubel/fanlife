"""The long Good Night lullaby (owner, 13.11.2026: "think of a lullaby, a bedtime story, calming sounds — nothing that
makes you jump"). The same original tune as make_lullaby, slower (58 bpm), told four ways so five minutes never feel
like a loop: the music box, then the tune an octave down on a softer harp, then only broken chords with a few far-off
celesta notes, then the music box again, quieter. Plus `night-ambience`: a slow sea breathing under it all.

python3 -m studio.kit.music.make_lullaby_long
writes cache/owner/fairytales-lullaby-long.mp3 and studio/fairytales/sfx/night-ambience.wav
"""
import subprocess
import wave
from pathlib import Path

import numpy as np

from studio.kit.music import make_lullaby as L

SR = L.SR
BEAT = 60 / 58
HERE = Path(__file__).parent


def harp(f: float, dur: float, amp: float) -> np.ndarray:
    t = np.arange(int(SR * dur)) / SR
    env = np.exp(-t / 1.8) * (1 - np.exp(-t / 0.008))
    return amp * env * (np.sin(2 * np.pi * f * t) + 0.18 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.6))


def section(kind: str, start: float, mix: np.ndarray) -> float:
    t = start
    if kind in ('box', 'harp', 'box-soft'):
        for name, beats in L.MEL:
            if name:
                f = L.hz(name)
                n = (L.pluck(f, 3.5, 0.30) if kind == 'box' else
                     L.pluck(f, 3.5, 0.18) if kind == 'box-soft' else harp(f / 2, 4.0, 0.30))
                s = int(t * SR)
                mix[s:s + len(n)] += n[:len(mix) - s]
            t += beats * BEAT
    for b, c in enumerate(L.CHORDS):
        s0 = start + b * 3 * BEAT
        notes = [L.hz(x) for x in L.TRIAD[c]]
        if kind == 'arp':                                       # broken chord, one note a beat, and a far celesta
            for i, f in enumerate([notes[0], notes[1], notes[2]]):
                n = harp(f, 3.6, 0.20)
                s = int((s0 + i * BEAT) * SR)
                mix[s:s + len(n)] += n[:len(mix) - s]
            if b % 4 == 3:
                n = L.pluck(notes[2] * 4, 3.0, 0.07)
                s = int((s0 + 1.5 * BEAT) * SR)
                mix[s:s + len(n)] += n[:len(mix) - s]
        root = L.TRIAD[c][0]
        n = L.pluck(L.hz(root[:-1] + str(int(root[-1]) + 1)) / 2, 3.0, 0.12)
        s = int(s0 * SR)
        mix[s:s + len(n)] += n[:len(mix) - s]
        pd = (0.075 if kind in ('arp', 'harp') else 0.05) * L.pad(notes, 3 * BEAT + 0.8)
        mix[s:s + len(pd)] += pd[:len(mix) - s]
    return start + len(L.CHORDS) * 3 * BEAT


def lullaby(out: Path) -> None:
    sec = len(L.CHORDS) * 3 * BEAT
    total = 4 * sec
    mix = np.zeros(int(SR * (total + 5)))
    t = 0.0
    for kind in ('box', 'harp', 'arp', 'box-soft'):
        t = section(kind, t, mix)
    tail = mix[int(total * SR):].copy()                         # ring-out wraps onto the start: the loop is seamless
    mix = mix[:int(total * SR)]
    mix[:len(tail)] += tail
    rng = np.random.default_rng(11)
    ir = rng.standard_normal(int(SR * 2.2)) * np.exp(-np.arange(int(SR * 2.2)) / (SR * 0.6))
    ir[0] = 1.0
    n = len(mix) + 2 * len(ir)
    wet = np.fft.irfft(np.fft.rfft(np.concatenate([mix, mix[:len(ir)]]), n=n) * np.fft.rfft(ir, n=n))[len(ir):len(ir) + len(mix)]
    y = 0.75 * mix + 0.06 * wet
    y = y / np.abs(y).max() * 0.75
    pcm = (y * 32767).astype(np.int16)
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'libmp3lame',
                    '-q:a', '2', str(out)], input=np.stack([pcm, pcm], 1).tobytes(), check=True)
    print(out, round(total, 1), 's')


def ambience(out: Path, dur: float = 64.0) -> None:
    """A slow sea: low-passed noise rising and falling every ~8 s, two channels a little apart. Loops seamlessly."""
    rng = np.random.default_rng(3)
    n = int(SR * dur)
    t = np.arange(n) / SR
    chans = []
    for c in range(2):
        x = np.fft.rfft(rng.standard_normal(n))
        f = np.fft.rfftfreq(n, 1 / SR)
        x *= 1 / (1 + (f / 420) ** 2) * (f > 40)                # a soft wash, nothing hissy
        x = np.fft.irfft(x, n)
        swell = 0.35 + 0.65 * (0.5 - 0.5 * np.cos(2 * np.pi * t / 8.0 + c * 0.9)) ** 1.6
        chans.append(x * swell)
    y = np.stack(chans, 1)
    y = y / np.abs(y).max() * 0.6
    with wave.open(str(out), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((y * 32767).astype(np.int16).tobytes())
    print(out)


if __name__ == '__main__':
    lullaby(HERE / 'cache/owner/fairytales-lullaby-long.mp3')
    ambience(HERE.parents[1] / 'fairytales/sfx/night-ambience.wav')
