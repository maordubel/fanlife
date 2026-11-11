"""Football Fairy Tales — the episode's narration, one take per shot per language (owner chose Leda for all, 11.11.2026).

  python3 -m studio.fairytales.narrate <episode.json> <out_dir>

Every take is checked by ear before it is kept: Whisper hears it, and a take that skips words or reads the line twice
(the audition's Leda did, in English) is thrown away and asked for again — up to four times, over the two newest
free speech models. English is checked word by word against the script (gemini_tts.align); Hebrew and Greek letter
by letter, vowel marks and punctuation removed. out_dir gets <shot>-<lang>.wav and narration.json (seconds, model,
check, and for English the word times the captions use).
"""
from __future__ import annotations

import difflib
import json
import os
import re
import sys
import time
import unicodedata
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE))

from studio import gemini_tts  # noqa: E402

SR = 24000
PROFILE = ('A young storyteller in her twenties who knows this club by heart, telling its best story to a family on a '
           'Saturday morning: bright, curious and warm, with a grin in the voice. She lowers her voice for a secret and '
           'lets a surprise land. Clear and natural — never babyish, never a cartoon, never shouting.')
DELIVERY = {
    'secret': 'Quick and lively, then slow and almost whispered before the last two words; let the "…" hang.',
    'bright': 'Bright and quick, smiling; a small pause at every " — ".',
    'warm': 'Warm and unhurried, like turning an old photograph over in your hands.',
    'adventure': 'Building like a journey: each place a little more excited than the last, then a soft drop on the last sentence.',
    'build': 'Holding the breath: slower and slower through the dashes, then the last sentence bursts with joy.',
    'close': 'Warm and smiling; a held beat at the "…", then the last words land gently, like the last page of a book.',
}
ACCENT = {'en': 'Accent: neutral British English.',
          'he': 'Language: Modern Hebrew, native Israeli pronunciation.',
          'el': 'Language: Modern Greek, native Athenian pronunciation.'}
WHISPER_LANG = {'he': 'he', 'el': 'el'}
_W = None


def prompt(text: str, lang: str, delivery: str) -> str:
    return '\n'.join(['# AUDIO PROFILE', PROFILE, '', '## THE SCENE',
                      'A family football story told over the pages of a pop-up book.', '',
                      "### DIRECTOR'S NOTES", ACCENT[lang], f'Style: {DELIVERY.get(delivery, DELIVERY["warm"])}',
                      'Read the transcript exactly once, word for word: add nothing, skip nothing, never repeat a line, '
                      'do not read these notes.', '', '#### TRANSCRIPT', text])


def letters(s: str) -> str:
    s = unicodedata.normalize('NFD', s.lower())
    return ''.join(c for c in s if unicodedata.category(c)[0] == 'L')


def check_local(text: str, wav: Path, lang: str) -> dict:
    global _W
    import subprocess
    import numpy as np
    from faster_whisper import WhisperModel
    if _W is None:
        _W = WhisperModel(os.environ.get('FT_WHISPER_MODEL', 'small'), device='cpu', compute_type='int8')
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(wav), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    segs, _ = _W.transcribe(np.frombuffer(raw, dtype='float32'), language=WHISPER_LANG[lang], beam_size=5)
    heard = ' '.join(s.text for s in segs)
    a, b = letters(text), letters(heard)
    ratio = difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()
    length = len(b) / max(1, len(a))
    return {'ok': ratio >= 0.72 and length <= 1.3, 'ratio': round(ratio, 3), 'length': round(length, 3), 'heard': heard[:400]}


def seconds(p: Path) -> float:
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()


def take(key: str, models: list[str], text: str, lang: str, delivery: str, voice: str, out: Path) -> dict:
    os.environ['STORIES_GEMINI_VOICE'] = voice
    tried = []
    for attempt in range(4):
        model = models[attempt % min(2, len(models))]
        try:
            pcm = gemini_tts._call(key, model, prompt(text, lang, delivery))
        except Exception as e:  # noqa: BLE001
            tried.append({'model': model, 'error': f'{type(e).__name__}: {e}'[:200]})
            time.sleep(65 if '429' in str(e) else 20)   # the free tier counts requests per minute
            continue
        with wave.open(str(out), 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm)
        if lang == 'en':
            words, chk = gemini_tts.align(text, out)
            if chk['ok'] and chk.get('trim'):
                t0, t1 = chk['trim']
                gemini_tts._cut(out, t0, t1)
                words = [{**w, 'start': round(max(0.0, w['start'] - t0), 3), 'end': round(max(0.0, w['end'] - t0), 3)} for w in words]
            # a number the narrator said is heard as digits ("103"), so a whole take can match only ~0.75 of the words;
            # what was said outside the script (a second reading, the notes aloud) has already been cut by the trim
            chk = {k: chk[k] for k in ('matched', 'added', 'heard')} | {'ok': chk['matched'] >= 0.7 and chk['added'] <= 0.15}
            if chk['ok'] and seconds(out) > words[-1]['end'] + 0.6:
                gemini_tts._cut(out, 0.0, words[-1]['end'] + 0.4)          # a second reading after the last word goes
        else:
            words, chk = None, check_local(text, out, lang)
        tried.append({'model': model, **chk})
        if chk['ok']:
            return {'model': model, 'seconds': round(seconds(out), 2), 'check': chk, 'words': words, 'tries': tried}
        time.sleep(7)
    out.unlink(missing_ok=True)
    return {'error': 'no take said the line once and whole', 'tries': tried}


def main() -> None:
    ep = json.loads(Path(sys.argv[1]).read_text())
    out = Path(sys.argv[2]).resolve()
    out.mkdir(parents=True, exist_ok=True)
    key = os.environ['GEMINI_API_KEY'].strip()
    models = gemini_tts.models(key)
    langs = [l for l in os.environ.get('FT_LANGS', ','.join(ep['voice'].keys() - {'chosen'})).split(',') if l]
    report = {'episode': ep['id'], 'models': models[:2], 'takes': []}
    only = {x.strip() for x in os.environ.get('FT_ONLY', '').split(',') if x.strip()}   # 'shot:lang' retakes
    for shot in ep['shots']:
        for lang in langs:
            if lang not in shot or (only and f"{shot['id']}:{lang}" not in only):
                continue
            row = {'shot': shot['id'], 'lang': lang, 'voice': ep['voice'][lang], 'file': f"{shot['id']}-{lang}.wav"}
            row.update(take(key, models, shot[lang], lang, shot.get('delivery', 'warm'), ep['voice'][lang], out / row['file']))
            report['takes'].append(row)
            print(json.dumps({k: v for k, v in row.items() if k != 'words'}, ensure_ascii=False), flush=True)
            time.sleep(7)
    (out / 'narration.json').write_text(json.dumps(report, ensure_ascii=False, indent=1))
    bad = [t for t in report['takes'] if 'error' in t]
    print(f"{len(report['takes']) - len(bad)}/{len(report['takes'])} takes kept")


if __name__ == '__main__':
    main()
