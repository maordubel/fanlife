"""Narration stage: one audio file per beat, with word timings for captions.

Providers:
  elevenlabs  ELEVENLABS_API_KEY, voice STORIES_ELEVEN_VOICE (default "George", a warm British male narrator),
              model STORIES_ELEVEN_MODEL (default eleven_multilingual_v2). Uses /with-timestamps for real alignment.
  kokoro      free and local (Apache-2.0 model, CPU). British male voice STORIES_KOKORO_VOICE (default bm_george).
              Each SENTENCE is synthesised separately, so sentence timings are exact; words inside a sentence are spread
              by length, and captions say so in the QA report.
Paid calls are cached per beat by the hash of (provider, voice, model, spoken text): a resumed job never pays twice.
Pronunciation: `pronounce` maps a written name to what the voice should say; captions always keep the written name.
"""
from __future__ import annotations

import base64
import json
import os
import re
import subprocess
import urllib.error
import urllib.request
import wave
from pathlib import Path

from .common import ROOT, StageError, read_json, sha256_json, write_json

ELEVEN_GEORGE = 'JBFqnCBsd6RMkjVDRZzb'
KOKORO_DIR = Path(os.environ.get('KOKORO_DIR', str(Path.home() / 'models')))
SR = 24000

# Written → spoken. Only spellings a TTS voice reads wrongly; extend per club in dossiers/<club>-pronounce.json.
PRONOUNCE = {
    'Računica': 'Rachunitsa', 'Pisont': 'Pishont', 'Kashtan': 'Kash-tahn', 'Hapoel': 'Hap-o-el', 'Beitar': 'Bay-tar',
    'fanlife.dubelteam.com': 'fan life dot dubel team dot com', 'FanLife': 'Fan Life',
    'Bloomfield': 'Bloomfield', "Be'er Sheva": 'Beh-er Sheva', 'Yerevan': 'Yerevan', 'Herzliya': 'Hertz-lia',
}


def spoken(text: str, extra: dict | None = None) -> str:
    out = text
    for w, s in {**PRONOUNCE, **(extra or {})}.items():
        out = re.sub(rf'\b{re.escape(w)}\b', s, out)
    # Spoken scorelines: "2–1" → "two, one" reads oddly; a narrator says "two-one".
    out = re.sub(r'(\d+)[–-](\d+)', lambda m: f'{m.group(1)} {m.group(2)}' if m.group(2) != '0' else f'{m.group(1)} nil', out)
    return out


def provider() -> str:
    want = os.environ.get('STORIES_VOICE', '').strip()
    if want:
        return want
    return 'elevenlabs' if os.environ.get('ELEVENLABS_API_KEY', '').strip() else 'kokoro'


def _wav_write(path: Path, samples, sr: int = SR) -> None:
    import numpy as np
    a = np.clip(np.asarray(samples, dtype='float32'), -1, 1)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((a * 32767).astype('<i2').tobytes())


def _duration(path: Path) -> float:
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)], capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


_KOKORO = None


def _kokoro():
    global _KOKORO
    if _KOKORO is None:
        try:
            from kokoro_onnx import Kokoro
        except ImportError as e:
            raise StageError('VOICE_NOT_INSTALLED', 'kokoro-onnx is not installed (pip install kokoro-onnx soundfile)') from e
        m, v = KOKORO_DIR / 'kokoro-v1.0.onnx', KOKORO_DIR / 'voices-v1.0.bin'
        if not m.exists() or not v.exists():
            raise StageError('VOICE_MODEL_MISSING', f'Kokoro model files are missing in {KOKORO_DIR}')
        _KOKORO = Kokoro(str(m), str(v))
    return _KOKORO


def sentences(text: str) -> list[str]:
    parts = re.split(r'(?<=[.!?…])\s+(?=[A-Z0-9“"‘\'])', text.strip())
    return [p for p in parts if p.strip()]


def _syllables(w: str) -> float:
    """How long a word takes to say, roughly: its vowel groups (numbers and names count as written)."""
    core = re.sub(r'[^a-zčćšžđ]', '', w.lower())
    n = len(re.findall(r'[aeiouyáéíóú]+', core)) or 1
    if core.endswith('e') and n > 1 and not core.endswith(('le', 'ee')):
        n -= 1
    return n + 0.35


def _words_spread(text: str, start: float, end: float) -> list[dict]:
    ws = text.split()
    total = sum(_syllables(w) for w in ws) or 1
    t, out = start, []
    for w in ws:
        d = (end - start) * _syllables(w) / total
        out.append({'w': w, 'start': round(t, 3), 'end': round(t + d, 3)})
        t += d
    return out


def _pauses(a, sr: int) -> list[tuple[float, float]]:
    """Silent stretches inside a sentence (the narrator's commas), as (start, end) seconds."""
    import numpy as np
    hop = int(sr * 0.01)
    n = len(a) // hop
    if n < 10:
        return []
    rms = np.sqrt(np.mean(a[: n * hop].reshape(n, hop) ** 2, axis=1))
    quiet = rms < max(0.004, np.percentile(rms, 90) * 0.06)
    out, i = [], 0
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]:
                j += 1
            if (j - i) >= 9 and i > 5 and j < n - 5:
                out.append((i * 0.01, j * 0.01))
            i = j
        else:
            i += 1
    return out


def _words_aligned(text: str, a, sr: int, offset: float) -> list[dict]:
    """Words timed against the audio: clauses are pinned to the pauses the model actually left, and words are spread
    by syllables inside each clause — closer than spreading the whole sentence, and the order can never change."""
    ws = text.split()
    cuts = [i + 1 for i, w in enumerate(ws[:-1]) if w.rstrip('"\'’”)').endswith((',', ';', ':', '—', '–'))]
    gaps = _pauses(a, sr)
    dur = len(a) / sr
    if cuts and len(gaps) >= len(cuts):
        chosen = sorted(sorted(gaps, key=lambda g: g[1] - g[0], reverse=True)[:len(cuts)])
        bounds = [0] + cuts + [len(ws)]
        spans, t0 = [], 0.0
        for k in range(len(bounds) - 1):
            t1 = chosen[k][0] if k < len(chosen) else dur
            spans.append((t0, t1))
            if k < len(chosen):
                t0 = chosen[k][1]
        out = []
        for k in range(len(bounds) - 1):
            chunk = ' '.join(ws[bounds[k]:bounds[k + 1]])
            out += _words_spread(chunk, offset + spans[k][0], offset + spans[k][1])
        return out
    return _words_spread(text, offset, offset + dur)


def kokoro_beat(text: str, out: Path, extra: dict | None) -> dict:
    import numpy as np
    k = _kokoro()
    voice = os.environ.get('STORIES_KOKORO_VOICE', 'bm_george')
    speed = float(os.environ.get('STORIES_KOKORO_SPEED', '0.94'))
    chunks, words, t = [], [], 0.0
    gap = np.zeros(int(SR * 0.28), dtype='float32')
    for i, s in enumerate(sentences(text)):
        a, sr = k.create(spoken(s, extra), voice=voice, speed=speed, lang='en-gb')
        a = np.asarray(a, dtype='float32')
        # trim leading/trailing near-silence so pacing is ours, not the model's
        nz = np.where(np.abs(a) > 0.006)[0]
        if len(nz):
            a = a[max(0, nz[0] - 240): nz[-1] + 1200]
        d = len(a) / SR
        words += _words_aligned(s, a, SR, t)
        chunks.append(a)
        t += d
        if i < len(sentences(text)) - 1:
            chunks.append(gap)
            t += len(gap) / SR
    _wav_write(out, np.concatenate(chunks) * 0.92)
    return {'words': words, 'alignment': 'sentence-exact, clauses pinned to pauses, words spread by syllables', 'voice': f'kokoro:{voice}'}


def eleven_beat(text: str, out: Path, extra: dict | None) -> dict:
    key = os.environ['ELEVENLABS_API_KEY'].strip()
    voice = os.environ.get('STORIES_ELEVEN_VOICE', ELEVEN_GEORGE)
    model = os.environ.get('STORIES_ELEVEN_MODEL', 'eleven_multilingual_v2')
    say = spoken(text, extra)
    body = {'text': say, 'model_id': model, 'voice_settings': {'stability': 0.55, 'similarity_boost': 0.8, 'style': 0.25, 'use_speaker_boost': True}}
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128',
                                 data=json.dumps(body).encode(), headers={'xi-api-key': key, 'Content-Type': 'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        raise StageError('VOICE_HTTP_' + str(e.code), f'ElevenLabs answered {e.code}: {e.read()[:300].decode("utf-8", "replace")}', retryable=e.code in (429, 500, 502, 503)) from e
    except (urllib.error.URLError, TimeoutError) as e:
        # An interrupted paid request is UNCERTAIN: it may have been charged. The beat is retried once by the caller only.
        raise StageError('VOICE_UNCERTAIN', f'ElevenLabs request interrupted: {e}', retryable=True) from e
    mp3 = out.with_suffix('.mp3')
    mp3.write_bytes(base64.b64decode(data['audio_base64']))
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(mp3), '-ac', '1', '-ar', str(SR), str(out)], check=True)
    al = data.get('alignment') or {}
    chars, st, en = al.get('characters') or [], al.get('character_start_times_seconds') or [], al.get('character_end_times_seconds') or []
    words = []
    spoken_text = ''.join(chars)
    written = text.split()
    for i, m in enumerate(re.finditer(r'\S+', spoken_text)):
        w = written[i] if i < len(written) else m.group()
        words.append({'w': w, 'start': round(st[m.start()], 3), 'end': round(en[m.end() - 1], 3)})
    if len(words) != len(written):
        # A respelling changed the word count; fall back to spreading the written words over the measured span.
        words = _words_spread(text, st[0] if st else 0.0, en[-1] if en else _duration(out))
    return {'words': words, 'alignment': 'provider character timestamps', 'voice': f'elevenlabs:{voice}:{model}'}


def voice_script(script: dict, out_dir: Path, cache_dir: Path, log, extra: dict | None = None) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    cache_dir.mkdir(parents=True, exist_ok=True)
    prov = provider()
    beats, n = [], 0
    for ci, ch in enumerate(script['chapters']):
        for bi, b in enumerate(ch['beats']):
            n += 1
            text = b['narration'].strip()
            key = sha256_json({'p': prov, 'v': os.environ.get('STORIES_ELEVEN_VOICE' if prov == 'elevenlabs' else 'STORIES_KOKORO_VOICE'), 't': spoken(text, extra), 'r': 3})[:24]
            wav = cache_dir / f'{key}.wav'
            meta_p = cache_dir / f'{key}.json'
            if not (wav.exists() and meta_p.exists()):
                try:
                    meta = (eleven_beat if prov == 'elevenlabs' else kokoro_beat)(text, wav, extra)
                except StageError as e:
                    if e.retryable and prov == 'elevenlabs':
                        log(f'Voice: beat {n} retry after {e.code}')
                        meta = eleven_beat(text, wav, extra)
                    else:
                        raise
                write_json(meta_p, meta)
            meta = read_json(meta_p)
            dst = out_dir / f'beat-{n:03d}.wav'
            dst.write_bytes(wav.read_bytes())
            beats.append({'n': n, 'chapter': ci, 'beat': bi, 'file': dst.name, 'duration': round(_duration(dst), 3), **meta})
            if n % 10 == 0:
                log(f'Voice: {n} beats')
    total = sum(b['duration'] for b in beats)
    log(f'Voice: {len(beats)} beats, {total / 60:.1f} minutes of narration ({prov})')
    return {'provider': prov, 'beats': beats, 'narration_seconds': round(total, 2)}
