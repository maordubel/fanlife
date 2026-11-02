"""I WAS THERE — narration audition: the same lines read by every free, commercially usable engine, so the owner
chooses by ear and the choice is measured (speed on the runner's CPU is recorded with each take).

Engines (all free; licences allow a monetised channel):
  kokoro       Kokoro-82M via kokoro-onnx, Apache-2.0. The studio's current free voice. Preset voices.
  chatterbox   Resemble AI Chatterbox (500M), MIT. Default voice or a reference clip; `exaggeration` drives emotion.
  turbo        Chatterbox-Turbo (350M), MIT. Needs a reference clip — given a Kokoro voice, so the voice stays a
               licensed synthetic one and never a real person's.
Chatterbox output carries Resemble's inaudible PerTh watermark; the film is labelled synthetic narration anyway.

    python3 scripts/football-stories/matchday/voice_audition.py <out>

Writes <out>/<take>.mp3 (all at −16 LUFS so loudness does not bias the ear) and <out>/audition.json.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import traceback
import wave
from pathlib import Path

import numpy as np

LINES = (
    "Some nights you can feel before you see them. "
    "The tram is full an hour early, scarves hang out of the windows, and somewhere up ahead the first song has "
    "already started. "
    "We have never stood on this ground before. But we know this walk. "
    "Ticket in hand. The gate. The steps. "
    "And then the noise — all of it, at once."
)
KOKORO_DIR = Path(os.environ.get('KOKORO_DIR', str(Path.home() / 'models')))


def sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]


def write_wav(path: Path, a: np.ndarray, sr: int) -> None:
    a = np.clip(np.asarray(a, dtype=np.float32).reshape(-1), -1, 1)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((a * 32767).astype('<i2').tobytes())


def join(parts: list[np.ndarray], sr: int, gap: float = 0.28) -> np.ndarray:
    pause = np.zeros(int(sr * gap), dtype=np.float32)
    out = []
    for p in parts:
        out += [np.asarray(p, dtype=np.float32).reshape(-1), pause]
    return np.concatenate(out) if out else np.zeros(1, dtype=np.float32)


def to_mp3(wav: Path, mp3: Path) -> None:
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(wav), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
                    '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '160k', str(mp3)], check=True)


# ── engines ──────────────────────────────────────────────────────────────────────────────────────────────────────────
_K = None


def kokoro(voice: str, speed: float = 0.94):
    global _K
    if _K is None:
        from kokoro_onnx import Kokoro
        _K = Kokoro(str(KOKORO_DIR / 'kokoro-v1.0.onnx'), str(KOKORO_DIR / 'voices-v1.0.bin'))
    parts, sr = [], 24000
    for s in sentences(LINES):
        a, sr = _K.create(s, voice=voice, speed=speed, lang='en-gb' if voice.startswith('b') else 'en-us')
        parts.append(a)
    return join(parts, sr), sr


_CB = {}


def chatterbox(kind: str, ref: Path | None, exaggeration: float = 0.5, cfg: float = 0.5):
    if kind not in _CB:
        if kind == 'turbo':
            from chatterbox.tts_turbo import ChatterboxTurboTTS
            _CB[kind] = ChatterboxTurboTTS.from_pretrained(device='cpu')
        else:
            from chatterbox.tts import ChatterboxTTS
            _CB[kind] = ChatterboxTTS.from_pretrained(device='cpu')
    m = _CB[kind]
    parts = []
    for s in sentences(LINES):
        kw = {'audio_prompt_path': str(ref)} if ref else {}
        if kind != 'turbo':
            kw.update(exaggeration=exaggeration, cfg_weight=cfg)
        wav = m.generate(s, **kw)
        parts.append(wav.squeeze(0).detach().cpu().numpy())
    return join(parts, m.sr), m.sr


def main(out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    ref = out / '_ref-kokoro-bm_george.wav'
    takes = [
        ('A-kokoro-bm_george', lambda: kokoro('bm_george'), 'Kokoro · British male "George" (studio default)'),
        ('B-kokoro-bm_lewis', lambda: kokoro('bm_lewis'), 'Kokoro · British male "Lewis"'),
        ('C-kokoro-am_michael', lambda: kokoro('am_michael'), 'Kokoro · American male "Michael"'),
        ('D-chatterbox-default', lambda: chatterbox('base', None, 0.5, 0.5), 'Chatterbox · its own default voice, neutral'),
        ('E-chatterbox-default-drama', lambda: chatterbox('base', None, 0.75, 0.3), 'Chatterbox · default voice, more emotion, slower'),
        ('F-chatterbox-george', lambda: chatterbox('base', ref, 0.6, 0.4), 'Chatterbox · George\'s timbre, documentary emotion'),
        ('G-turbo-george', lambda: chatterbox('turbo', ref), 'Chatterbox-Turbo · George\'s timbre'),
    ]
    report = {'lines': LINES, 'cpu': os.cpu_count(), 'takes': []}
    for key, fn, label in takes:
        row = {'take': key, 'label': label}
        try:
            if key.startswith(('F', 'G')) and not ref.exists():
                a, sr = kokoro('bm_george')
                write_wav(ref, a[: sr * 12], sr)
            t0 = time.time()
            a, sr = fn()
            took = time.time() - t0
            wav = out / f'{key}.wav'
            write_wav(wav, a, sr)
            to_mp3(wav, out / f'{key}.mp3')
            wav.unlink()
            secs = len(a) / sr
            row.update(ok=True, seconds=round(secs, 1), render_seconds=round(took, 1),
                       realtime_factor=round(took / secs, 2), sample_rate=sr)
        except Exception as e:  # one engine failing never hides the others
            row.update(ok=False, error=f'{type(e).__name__}: {e}'[:400], trace=traceback.format_exc()[-1200:])
        print(json.dumps({k: v for k, v in row.items() if k != 'trace'}), flush=True)
        report['takes'].append(row)
    ref.unlink(missing_ok=True)
    (out / 'audition.json').write_text(json.dumps(report, indent=2))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]))
