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
 'tender': 'Soft and slow, close to the listener, full of warmth; a small catch in the voice at the hard part, then hope.',
    'proud': 'Proud and warm, a little slower on the names, letting each achievement land.',
    'playful': 'Playful and amused, a smile you can hear, a quick comic beat at the "…".',
    'wry': 'A knowing, gently amused tone — a little sigh at the "…", then the last lines dry and light, a wink, never bitter.',
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


class QuotaGone(Exception):
    """The free tier said no three times in a row: the day's requests are spent; stop and publish what we have."""


def call(key: str, models: list[str], text: str) -> tuple[bytes, str]:
    misses = 0
    for attempt in range(6):
        model = models[attempt % min(2, len(models))]
        try:
            return gemini_tts._call(key, model, text), model
        except Exception as e:  # noqa: BLE001
            if '429' in str(e):
                misses += 1
                if misses >= 4:
                    raise QuotaGone(str(e)[:200]) from e
                time.sleep(65)
            else:
                time.sleep(15)
    raise RuntimeError('no speech model answered')


def silences(wav: Path) -> list[tuple[float, float]]:
    import subprocess
    err = subprocess.run(['ffmpeg', '-v', 'info', '-i', str(wav), '-af', 'silencedetect=n=-40dB:d=0.45', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', err)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', err)]
    return list(zip(starts, ends))


def cut(src: Path, dst: Path, t0: float, t1: float) -> None:
    with wave.open(str(src)) as w:
        w.setpos(int(t0 * SR))
        data = w.readframes(max(0, int((t1 - t0) * SR)))
    with wave.open(str(dst), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data)


def chunk_prompt(texts: list[str], lang: str) -> str:
    body = '\n\n'.join(texts)
    return '\n'.join(['# AUDIO PROFILE', PROFILE, '', '## THE SCENE',
                      'A family football story told over the pages of a pop-up book; each paragraph is a new page.', '',
                      "### DIRECTOR'S NOTES", ACCENT[lang],
                      'Style: warm, bright and storytelling, with a grin; slow down and lower the voice at every "…"; let '
                      'surprises land. Each paragraph has its own mood: tender for a hard beginning, proud for the names, '
                      'joyful for the goals.',
                      'Between paragraphs leave a long silence of two full seconds — the page turns.',
                      'Read the transcript exactly once, word for word, paragraph by paragraph: add nothing, skip nothing, '
                      'never repeat a paragraph, do not read these notes.', '', '#### TRANSCRIPT', body])


def chunk(key: str, models: list[str], rows: list[dict], lang: str, out: Path) -> list[dict]:
    """Several shots in one request (the free tier counts requests, not seconds), cut apart at the page-turn silences
    and checked one by one. A paragraph that fails its check comes back as an error for a later retake."""
    texts = [r['text'] for r in rows]
    for attempt in range(2):
        pcm, model = call(key, models, chunk_prompt(texts, lang))
        whole = out / f'_chunk-{lang}.wav'
        with wave.open(str(whole), 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm)
        dur = seconds(whole)
        sil = sorted(silences(whole), key=lambda x: -(x[1] - x[0]))[:len(rows) - 1]
        if len(sil) < len(rows) - 1:
            continue
        bounds = [0.0] + sorted((a + b) / 2 for a, b in sil) + [dur]
        res = []
        for k, r in enumerate(rows):
            seg = out / r['file']
            cut(whole, seg, bounds[k], bounds[k + 1])
            ss = silences(seg)
            t0 = ss[0][1] - 0.12 if ss and ss[0][0] < 0.05 else 0.0
            t1 = ss[-1][0] + 0.25 if ss and ss[-1][1] > seconds(seg) - 0.05 else seconds(seg)
            tmp = out / f'_t.wav'
            cut(seg, tmp, max(0.0, t0), max(t1, t0 + 0.5))
            tmp.replace(seg)
            if lang == 'en':
                words, chk = gemini_tts.align(r['text'], seg)
                chk = {k2: chk[k2] for k2 in ('matched', 'added', 'heard')} | {'ok': chk['matched'] >= 0.7 and chk['added'] <= 0.15}
            else:
                words, chk = None, check_local(r['text'], seg, lang)
            row = {k2: v for k2, v in r.items() if k2 != 'text'} | {'model': model, 'seconds': round(seconds(seg), 2),
                                                                      'check': chk, 'words': words, 'chunked': True}
            if not chk['ok']:
                row['error'] = 'the paragraph cut from the chunk did not say the line'
                seg.unlink(missing_ok=True)
            res.append(row)
        whole.unlink(missing_ok=True)
        if sum('error' not in x for x in res) >= len(rows) - 1 or attempt == 1:
            return res
        time.sleep(20)
    return [{k2: v for k2, v in r.items() if k2 != 'text'} | {'error': 'the chunk had too few page-turn silences'} for r in rows]


def main() -> None:
    ep = json.loads(Path(sys.argv[1]).read_text())
    out = Path(sys.argv[2]).resolve()
    out.mkdir(parents=True, exist_ok=True)
    key = os.environ['GEMINI_API_KEY'].strip()
    models = gemini_tts.models(key)
    langs = [l for l in os.environ.get('FT_LANGS', ','.join(sorted(ep['voice'].keys() - {'chosen'}))).split(',') if l]
    report = {'episode': ep['id'], 'models': models[:2], 'takes': []}
    only = {x.strip() for x in os.environ.get('FT_ONLY', '').split(',') if x.strip()}   # 'shot:lang' retakes
    size = int(os.environ.get('FT_CHUNK', '5'))

    def save():
        (out / 'narration.json').write_text(json.dumps(report, ensure_ascii=False, indent=1))
    try:
        for lang in langs:
            todo = [{'shot': s['id'], 'lang': lang, 'voice': ep['voice'][lang], 'file': f"{s['id']}-{lang}.wav", 'text': s[lang]}
                    for s in ep['shots'] if lang in s and (not only or f"{s['id']}:{lang}" in only)]
            for i in range(0, len(todo), size):
                rows = chunk(key, models, todo[i:i + size], lang, out)
                report['takes'] += rows
                for r in rows:
                    print(json.dumps({k: v for k, v in r.items() if k != 'words'}, ensure_ascii=False)[:600], flush=True)
                save()
                time.sleep(20)
    except QuotaGone as e:
        report['stopped'] = f'free-tier quota spent: {e}'
        print(report['stopped'], flush=True)
    save()
    bad = [t for t in report['takes'] if 'error' in t]
    print(f"{len(report['takes']) - len(bad)}/{len(report['takes'])} takes kept")


if __name__ == '__main__':
    main()
