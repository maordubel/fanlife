"""The emotional narrator: Gemini's speech model on the free tier (owner, 8.11.2026: "upgrade the narration — names said
right, far more emotion, stops and breaths in the right places, excitement, tension. Free only.").

Gemini TTS is directed in plain words — who is speaking, the scene, the pace — and it acts the line: it holds a breath
before a reveal, lifts on a goal and drops for a loss in a way a phoneme model cannot. Three guards keep it honest:

* **The words are checked.** It returns no timings and may slip a word, so the take is transcribed (faster-whisper) and
  matched word by word against the script. A take that does not say the script (under 85 % of its words, or a name
  missing) is thrown away and the free local voice (Kokoro) reads the line instead — nothing it did not say ever reaches
  a caption.
* **Names are given their sound.** Every name the pronunciation lexicon or the archive namebook knows goes into the
  director's notes as a respelling ("Giannakopoulos — yah-nah-ko-POO-los").
* **One voice a film.** The caller asks for the whole narration at once; if any part fails, the whole film is read by
  Kokoro, so a viewer never hears two narrators.

Free tier only: no billing is ever enabled by this file. A spent quota (429) is not a failure — the local voice reads it.
"""
from __future__ import annotations

import base64
import difflib
import json
import os
import re
import subprocess
import urllib.error
import urllib.request
import wave
from pathlib import Path

from . import pronounce
from .common import StageError

API = 'https://generativelanguage.googleapis.com/v1beta'
SR = 24000


def voice_name() -> str:
    # Charon ("informative"): a low, steady storyteller for the documentaries; the Shorts set STORIES_GEMINI_VOICE
    return os.environ.get('STORIES_GEMINI_VOICE', 'Charon')

PROFILE_SHORT = ('A British football storyteller on a YouTube Short: quick, bright and amused, like a mate telling you the '
                 'best story from the weekend. Punchy, but every word clear; the last line lands.')
PROFILE = ('A British football documentary narrator in his fifties: a warm, low voice with a little grain, telling a story '
           'he loves to people who love it too. Natural, never theatrical; he leans in for the tension and lets the '
           'big moments land.')
DELIVERY_NOTES = {
    'hush': 'Quiet and close, almost a whisper at the end of a line. Slow. Leave long silences after each sentence.',
    'tense': 'Low and taut. Unhurried, with held breaths before the key words; let every pause hang.',
    'normal': 'Warm and conversational, like telling a friend in the pub. Natural rhythm, small pauses at the commas.',
    'punch': 'Measured, then a clear beat of silence before the last line, which lands slower and firmer.',
    'excited': 'Rising excitement — faster, brighter, carried by the crowd — but every word still clear.',
}


def _key() -> str:
    from .gemini import api_key  # the key LIST: the one known to work first
    return api_key()


def available() -> bool:
    return bool(_key()) and os.environ.get('STORIES_GEMINI_TTS', '1') != '0'


def models(key: str) -> list[str]:
    """The speech models this key may call, flash first (the free tier's), STORIES_GEMINI_TTS_MODEL before all."""
    want = os.environ.get('STORIES_GEMINI_TTS_MODEL', '').strip()
    ids: list[str] = []
    try:
        req = urllib.request.Request(f'{API}/models?pageSize=200', headers={'x-goog-api-key': key})
        with urllib.request.urlopen(req, timeout=30) as r:
            ids = [m['name'].removeprefix('models/') for m in json.load(r).get('models') or []
                   if 'tts' in m.get('name', '') and 'generateContent' in (m.get('supportedGenerationMethods') or [])]
    except Exception:  # noqa: BLE001
        pass
    ids = ids or ['gemini-2.5-flash-preview-tts']

    def rank(mid: str):
        v = re.search(r'(\d+(?:\.\d+)?)', mid)
        return (0 if 'flash' in mid else 1, 'preview' in mid, -(float(v.group(1)) if v else 0))
    ids = sorted(set(ids), key=rank)
    return ([want] if want else []) + [m for m in ids if m != want]


def name_notes(text: str, extra: dict | None = None) -> list[str]:
    """'Giannakopoulos — yah-nah-ko-POO-los' for every name the lexicons know in this text."""
    pr = pronounce.Pronouncer(extra)
    out, seen = [], set()
    for n in pr.names_in(text):
        if n in seen:
            continue
        seen.add(n)
        say = pr.respell.get(n) or pronounce.respell(pr.ipa[n])
        out.append(f'{n} — {say}')
    return out


def prompt(text: str, delivery: str, extra: dict | None = None, scene: str = '') -> str:
    names = name_notes(text, extra)
    return '\n'.join([
        '# AUDIO PROFILE', PROFILE_SHORT if os.environ.get('STORIES_GEMINI_STYLE') == 'short' else PROFILE, '',
        '## THE SCENE', scene or 'A football story: a real night, told by the people who were there.', '',
        "### DIRECTOR'S NOTES",
        f'Style: {DELIVERY_NOTES.get(delivery, DELIVERY_NOTES["normal"])}',
        'Accent: British English (Received Pronunciation). Foreign names are said the way their own people say them.',
        'Pauses: a beat of silence at every "…" and every " — ", a short breath between sentences.',
        'Read the transcript exactly, word for word: add nothing, skip nothing, do not read these notes.',
        *(['Pronunciation (stressed syllable in capitals):', *names] if names else []),
        '', '#### TRANSCRIPT', text])


def _call(key: str, model: str, text: str) -> bytes:
    body = {'contents': [{'parts': [{'text': text}]}],
            'generationConfig': {'responseModalities': ['AUDIO'],
                                 'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': voice_name()}}}}}
    req = urllib.request.Request(f'{API}/models/{model}:generateContent', data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json', 'x-goog-api-key': key}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            out = json.load(r)
    except urllib.error.HTTPError as e:
        raise StageError(f'GEMINI_TTS_{e.code}', e.read()[:300].decode('utf-8', 'replace'), retryable=e.code in (429, 500, 503)) from e
    except (urllib.error.URLError, TimeoutError) as e:
        raise StageError('GEMINI_TTS_NET', str(e), retryable=True) from e
    for c in out.get('candidates') or []:
        for p in (c.get('content') or {}).get('parts') or []:
            data = (p.get('inlineData') or {}).get('data')
            if data:
                return base64.b64decode(data)
    raise StageError('GEMINI_TTS_EMPTY', json.dumps(out)[:300], retryable=True)


def speak(text: str, out: Path, delivery: str = 'normal', extra: dict | None = None, scene: str = '', log=print) -> dict:
    """One take → `out` (24 kHz mono WAV) and its meta {words, voice, check}. Raises StageError if no take passes."""
    key = _key()
    if not key:
        raise StageError('GEMINI_TTS_NO_KEY', 'GEMINI_API_KEY is not set')
    last: StageError | None = None
    for model in models(key)[:2]:
        try:
            pcm = _call(key, model, prompt(text, delivery, extra, scene))
        except StageError as e:
            last = e
            log(f'Voice: {model} — {e.code}')
            continue
        with wave.open(str(out), 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm)
        words, check = align(text, out)
        if check['ok'] and check.get('trim'):
            t0, t1 = check['trim']
            log(f"Voice: cut away what was said outside the script: {check['outside']!r}")
            _cut(out, t0, t1)
            words = [{**w, 'start': round(max(0.0, w['start'] - t0), 3), 'end': round(max(0.0, w['end'] - t0), 3)} for w in words]
        if check['ok']:
            return {'words': words, 'voice': f'gemini:{model}:{voice_name()}', 'alignment': 'whisper word timestamps matched to the script',
                    'delivery': delivery, 'check': check}
        last = StageError('GEMINI_TTS_WORDS', f"the take did not say the script ({check['matched']:.0%} of the words, "
                                              f"{check['added']:.0%} added; heard: {check['heard'][:240]!r})")
        log(f'Voice: {model} — {last}')
    raise last or StageError('GEMINI_TTS_FAILED', 'no speech model answered')


_WHISPER = None


def _norm(w: str) -> str:
    import unicodedata
    s = ''.join(c for c in unicodedata.normalize('NFD', w.lower()) if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]', '', s)


def align(text: str, wav: Path) -> tuple[list[dict], dict]:
    """The script's words with the times the take said them. Whisper hears the take; each script word takes the time of
    the heard word it matches; a word it did not hear is spread between its neighbours. `check` says whether the take
    really says the script."""
    global _WHISPER
    import numpy as np
    if _WHISPER is None:
        try:
            from faster_whisper import WhisperModel
        except ImportError as e:
            raise StageError('GEMINI_TTS_NO_WHISPER', 'faster-whisper is not installed: the take cannot be checked') from e
        _WHISPER = WhisperModel(os.environ.get('STORIES_WHISPER_MODEL', 'small.en'), device='cpu', compute_type='int8')
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(wav), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    segs, _ = _WHISPER.transcribe(np.frombuffer(raw, dtype='float32'), language='en', beam_size=5, word_timestamps=True)
    heard = [(w.word.strip(), float(w.start), float(w.end)) for s in segs for w in (s.words or [])]
    script = text.split()
    a, b = [_norm(w) for w in script], [_norm(h[0]) for h in heard]
    times: list[tuple[float, float] | None] = [None] * len(script)
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    ops = sm.get_opcodes()
    # words heard before the script starts or after it ends (the model saying a note aloud, "Transcript", a sigh):
    # cut away, never captioned; only words added INSIDE the script count against the take
    first_j = ops[0][4] if ops and ops[0][0] == 'insert' and ops[0][1] == 0 else 0
    last_j = ops[-1][3] if ops and ops[-1][0] == 'insert' and ops[-1][1] == len(a) else len(b)
    outside = first_j + (len(b) - last_j)
    trim = (max(0.0, heard[first_j][1] - 0.15), heard[last_j - 1][2] + 0.35) if outside and last_j > first_j else None
    matched = 0
    for tag, i1, i2, j1, j2 in ops:
        if tag == 'equal':
            for k in range(i2 - i1):
                times[i1 + k] = (heard[j1 + k][1], heard[j1 + k][2])
            matched += i2 - i1
        elif tag == 'replace' and j2 > j1:
            # a name heard as other words, or a number said as words: the span keeps the heard span's time
            t0, t1 = heard[j1][1], heard[j2 - 1][2]
            n = i2 - i1
            for k in range(n):
                times[i1 + k] = (t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n)
            # a replaced word counts as said when it is close in sound (names, numbers as words)
            matched += sum(1 for k in range(min(n, j2 - j1)) if difflib.SequenceMatcher(None, a[i1 + k], b[j1 + k]).ratio() >= 0.5)
    dur = _wav_seconds(wav)
    # fill the words never heard, between the neighbours that were
    for i in range(len(script)):
        if times[i] is None:
            prev = next((times[k][1] for k in range(i - 1, -1, -1) if times[k]), 0.0)
            nxt = next((times[k][0] for k in range(i + 1, len(script)) if times[k]), dur)
            times[i] = (prev, max(prev + 0.05, (prev + nxt) / 2))
    words = [{'w': w, 'start': round(t[0], 3), 'end': round(t[1], 3)} for w, t in zip(script, times)]
    names = pronounce.Pronouncer().names_in(text)
    heard_text = ' '.join(b)
    missing = [n for n in names if not any(difflib.SequenceMatcher(None, _norm(p), h).ratio() >= 0.6
                                           for p in n.split() for h in b)]
    share = matched / max(1, len(script))
    added = max(0, (last_j - first_j) - len(a)) / max(1, len(a))
    # names are not required to be HEARD (Whisper mishears a foreign name the narrator said right); the words around them are
    ok = share >= 0.85 and added <= 0.15
    return words, {'ok': ok, 'matched': share, 'added': added, 'missing': missing, 'heard': heard_text[:600], 'trim': trim,
                   'outside': ' '.join(h[0] for h in heard[:first_j] + heard[last_j:])[:200]}


def _cut(p: Path, t0: float, t1: float) -> None:
    with wave.open(str(p)) as w:
        sr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
        w.setpos(int(t0 * sr))
        data = w.readframes(max(0, int((t1 - t0) * sr)))
    with wave.open(str(p), 'wb') as w:
        w.setnchannels(ch)
        w.setsampwidth(sw)
        w.setframerate(sr)
        w.writeframes(data)


def _wav_seconds(p: Path) -> float:
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()
