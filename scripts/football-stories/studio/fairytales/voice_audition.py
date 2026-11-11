"""Football Fairy Tales — narrator audition (owner, 11.11.2026: phase 0 of the series).

The series is told by a young, wide-eyed storyteller in English plus the club's own language, as two audio tracks of one
video. The house narrator (Kokoro) has no Hebrew, no Greek and no young voice, so this audition asks Gemini's free speech
model — the same one the documentaries use (studio/gemini_tts.py) — for each cold-open line in several of its brighter
voices. Every take goes to the owner's Telegram as a short card video; he chooses by ear.

  python3 -m studio.fairytales.voice_audition <out_dir> [--send]
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE))

from studio import gemini_tts  # noqa: E402

SR = 24000
VOICES = [v.strip() for v in os.environ.get('FT_VOICES', 'Leda,Puck,Zephyr,Laomedeia').split(',') if v.strip()]

PROFILE = ('A bright, curious eleven-year-old football fan telling his family the best story he knows. Wide-eyed and '
           'delighted; he lowers his voice for the secret, then bursts out with the surprise. Young, warm and clear — '
           'never babyish, never shouting.')

LINES = [
    ('en', 'hapoel-tel-aviv', 'English', 'For almost a hundred years, everyone believed Hapoel Tel Aviv was born in 1927. '
                                         'Everyone… was wrong.'),
    ('he', 'hapoel-tel-aviv', 'Hebrew', 'כִּמְעַט מֵאָה שָׁנָה, כּוּלָּם הָיוּ בְּטוּחִים שֶׁהַפּוֹעֵל תֵּל אָבִיב נוֹלְדָה בְּאֶלֶף תְּשַׁע מֵאוֹת '
                                        'עֶשְׂרִים וָשֶׁבַע. כּוּלָּם… טָעוּ.'),
    ('el', 'aek-athens', 'Greek', 'Τον Απρίλιο του 1999, ενώ έπεφταν βόμβες στο Βελιγράδι, μια ομάδα ποδοσφαίρου ανέβηκε σε '
                                  'ένα λεωφορείο και ταξίδεψε ως εκεί… για να παίξει.'),
]


def prompt(text: str, lang: str) -> str:
    accent = {'en': 'Accent: neutral British English.',
              'he': 'Language: Modern Hebrew, native Israeli pronunciation. The vowel marks are a reading aid only.',
              'el': 'Language: Modern Greek, native Athenian pronunciation.'}[lang]
    return '\n'.join(['# AUDIO PROFILE', PROFILE, '', '## THE SCENE',
                      'The opening of a family football story — a pop-up book has just burst open.', '',
                      "### DIRECTOR'S NOTES", accent,
                      'Pace: quick and lively, then slow down and almost whisper before the last two words; let the "…" hang.',
                      'Read the transcript exactly, word for word: add nothing, skip nothing, do not read these notes.',
                      '', '#### TRANSCRIPT', text])


def write_wav(pcm: bytes, out: Path) -> float:
    with wave.open(str(out), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm)
    return len(pcm) / 2 / SR


def card(audio: Path, out: Path, top: str, sub: str) -> None:
    font = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
    vf = (f"drawtext=fontfile={font}:text='{top}':fontsize=96:fontcolor=0xF6EEDC:x=(w-tw)/2:y=380,"
          f"drawtext=fontfile={font}:text='{sub}':fontsize=40:fontcolor=0xE2553A:x=(w-tw)/2:y=540,"
          f"drawtext=fontfile={font}:text='Football Fairy Tales · narrator audition':fontsize=28:fontcolor=0x9A8F7C:x=(w-tw)/2:y=900")
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=0x1B1712:s=1080x1080:r=12', '-i', str(audio),
                    '-vf', vf, '-shortest', '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
                    '-b:a', '160k', '-movflags', '+faststart', str(out)], check=True)


def main() -> None:
    out = Path(sys.argv[1]).resolve()
    out.mkdir(parents=True, exist_ok=True)
    key = os.environ.get('GEMINI_API_KEY', '').strip()
    report = {'voices': VOICES, 'takes': []}
    models = gemini_tts.models(key) if key else []
    for lang, club, label, text in LINES:
        for voice in VOICES:
            name = f'{lang}-{voice.lower()}'
            os.environ['STORIES_GEMINI_VOICE'] = voice
            row = {'lang': lang, 'club': club, 'voice': voice, 'file': f'{name}.wav'}
            last = None
            for model in models[:2]:
                try:
                    pcm = gemini_tts._call(key, model, prompt(text, lang))
                    row['seconds'] = round(write_wav(pcm, out / row['file']), 2)
                    row['model'] = model
                    card(out / row['file'], out / f'{name}.mp4', f'{label} · {voice}', club.replace('-', ' ').title())
                    last = None
                    break
                except Exception as e:  # noqa: BLE001 — one voice failing must not cost the owner the others
                    last = f'{type(e).__name__}: {e}'[:300]
                    time.sleep(8)
            if last or not models:
                row['error'] = last or 'no GEMINI_API_KEY'
            report['takes'].append(row)
            print(json.dumps(row, ensure_ascii=False), flush=True)
            time.sleep(7)  # the free tier counts requests per minute
    (out / 'audition.json').write_text(json.dumps(report, ensure_ascii=False, indent=1))
    if '--send' in sys.argv:
        base = os.environ['AUDITION_RAW_BASE'].rstrip('/')
        items = [{'before': ['🎙 <b>Football Fairy Tales · אודישן קריין</b>\n\nשורת הפתיחה של הפרק, בכמה קולות צעירים של Gemini: '
                             'אנגלית ועברית (הפועל ת"א), ויוונית (AEK). כתוב לי איזה קול בוחרים לכל שפה.']}]
        for t in report['takes']:
            if 'error' in t:
                items.append({'before': [f"⚠️ {t['lang']} · {t['voice']}: <code>{t['error'][:160]}</code>"]})
                continue
            items.append({'video': {'url': f"{base}/{t['file'].replace('.wav', '.mp4')}", 'name': t['file'].replace('.wav', '.mp4'),
                                    'width': 1080, 'height': 1080, 'caption': f"<b>{t['lang'].upper()} · {t['voice']}</b>"}})
        (out / 'delivery.json').write_text(json.dumps({'items': items}, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
