"""Narrator audition (owner, 4.11.2026: "a narrator who sounds human and real, who says every name right").

The same name-heavy lines from the documentaries, read by every candidate:
  A · before           Kokoro bm_george as the films used it until now (espeak, hyphen respellings, no chain)
  B · after · George   Kokoro bm_george: misaki G2P + the pronunciation lexicon + human pacing + breaths + the narrator chain
  C · after · Lewis    the same with bm_lewis (the I WAS THERE voice)
  D · Qwen3-TTS        a voice designed from a description (a British documentary narrator), then cloned for every line
                       so it stays one person; names respelled from the lexicon (it takes text only)
Each take is checked by ear-proxy: Whisper transcribes it and the report counts the names it recognised.
The takes go to the owner's Telegram as short videos (a still card + the voice), then the scores.

  python3 -m studio.narrator_audition <out_dir> [--send]
"""
from __future__ import annotations

import difflib
import gc
import json
import os
import re
import subprocess
import sys
import time
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

from studio import pronounce, voice  # noqa: E402

LINES = [  # every club the narrator speaks for, the owner's worst first (8.11.2026), and the words of football
    ('build', 'Zrinjski at Pod Bijelim Brijegom, in Mostar. Krešimir Bandić, Matej Senić and Tomislav Barišić. The Premijer liga, and the derby against Velež.'),
    ('tense', "Hapoel Petah Tikva at HaMoshava. Zacharia Ratzabi, Elad Gabai, Hen Azriel and Nir Levin. Ligat Ha'Al, and the Toto Cup."),
    ('normal', 'Celtic at Parkhead. Billy McNeill, Danny McGrain, Paul McStay and Henrik Larsson. The Scottish Premiership, and Rangers at Ibrox.'),
    ('excited', 'Hapoel Tel Aviv at Bloomfield. Eran Zahavi, Barak Badash, Yitzhak Bibas and Eyal Meshumar. Then the derby against Maccabi Tel Aviv.'),
    ('build', 'St. Pauli at the Millerntor, off the Reeperbahn. Carsten Pröpper, Marc Rzatkowski and Yannick Deichmann, in the Bundesliga.'),
    ('normal', 'Al Ahly in Cairo. Ahmed Hegazi, Badr Banoun and Mahmoud Abou El-Saoud. The CAF Champions League, and the derby against Zamalek.'),
    ('tense', 'Raja against Wydad in Casablanca. Riyad Benayad, Yahya Jabrane and Abdelilah Saber.'),
    ('excited', 'After six minutes, Tsartas from a free kick. Zidane equalised. Then Maladenis and Nikolaidis, two headers in three minutes. AEK three, Madrid one.'),
    ('normal', 'November 2025. Karaiskakis again. Xabi Alonso against José Luis Mendilibar, the man who had won Olympiacos their European trophy.'),
    ('excited', "The UEFA Europa Conference League, the Cup Winners' Cup and the Intertoto. Extra time, penalties, and nil-nil."),
]

# The respellings the films used before this pass — kept here only so take A is what the owner heard until now.
BEFORE = {
    'Kashtan': 'Kash-tahn', 'Hapoel': 'Hap-o-el', 'Beitar': 'Bay-tar', 'Sevilla': 'Seh-vee-ya', 'Mourinho': 'Mo-reen-yo',
    'José': 'Ho-zay', 'Mendilibar': 'Men-dee-lee-bar', 'Fenerbahçe': 'Fener-bah-cheh', 'Tadić': 'Tah-ditch',
    'Jovetić': 'Yo-veh-titch', 'Fortounis': 'For-too-nis', 'Piraeus': 'Pie-ree-us', 'Karaiskakis': 'Kah-rice-kah-kis',
    'Chiquinho': 'Shee-keen-yo', 'Olympiacos': 'Oh-lim-pee-a-kos', 'Zahavi': 'Za-ha-vee',
}

QWEN_REF = ('Every club has a night it never forgets. This is the story of one of them, told by the people who were '
            'there, in the words they used at the time.')
QWEN_DESIGN = ('A British male documentary narrator in his fifties. A warm, low baritone with a slight rasp; calm, '
               'measured and intimate, like a late-night football documentary on the BBC. Natural pauses, quiet '
               'intensity, never theatrical. Received Pronunciation.')

SR = 24000


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, capture_output=True)


def wav_write(path: Path, a, sr: int = SR) -> None:
    voice._wav_write(path, a, sr)


def concat(parts: list[Path], out: Path, fx: bool) -> None:
    lst = out.with_suffix('.txt')
    lst.write_text(''.join(f"file '{p}'\n" for p in parts))
    raw = out.with_name(out.stem + '-raw.wav')
    run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(lst), '-ar', str(SR), '-ac', '1', str(raw)])
    from studio.audio import narrator_fx
    chain = narrator_fx(48000) if fx else 'highpass=f=70,acompressor=threshold=0.2:ratio=2.5:attack=5:release=120,aresample=48000'
    run(['ffmpeg', '-y', '-v', 'error', '-i', str(raw), '-af', f'{chain},loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', str(out)])


def silence(path: Path, s: float) -> Path:
    import numpy as np
    wav_write(path, np.zeros(int(SR * s), dtype='float32'))
    return path


# ── takes ────────────────────────────────────────────────────────────────────────────────────────────────────────────
def take_before(out: Path) -> list[Path]:
    import numpy as np
    k = voice._kokoro()
    files = []
    for i, (_, line) in enumerate(LINES):
        say = line
        for w, s in BEFORE.items():
            say = re.sub(rf'\b{re.escape(w)}\b', s, say)
        chunks = []
        for s in voice.sentences(say):
            a, _ = k.create(s, voice='bm_george', speed=1.0, lang='en-gb')
            chunks += [np.asarray(a, dtype='float32'), np.zeros(int(SR * 0.3), dtype='float32')]
        f = out / f'line-{i}.wav'
        wav_write(f, np.concatenate(chunks))
        files.append(f)
    return files


def take_kokoro(out: Path, v: str, research: bool = True) -> list[Path]:
    """`research=False` is the narrator as the owner heard it on 8.11.2026; True adds the researched names
    (kit/pronounce/researched.json) and researches what is left from its sentence, as a film does."""
    os.environ['STORIES_KOKORO_VOICE'] = v
    extra = None
    if research:
        os.environ.pop('STORIES_NO_RESEARCH', None)
        from studio import name_research
        extra = name_research.for_script([l for _, l in LINES], out / 'names', lambda m: print(m, flush=True))
    else:
        os.environ['STORIES_NO_RESEARCH'] = '1'
    files = []
    for i, (dl, line) in enumerate(LINES):
        f = out / f'line-{i}.wav'
        voice.kokoro_beat(line, f, extra, dl)
        files.append(f)
    os.environ.pop('STORIES_NO_RESEARCH', None)
    return files


def take_qwen(out: Path) -> list[Path]:
    import numpy as np
    import soundfile as sf
    import torch
    from qwen_tts import Qwen3TTSModel
    torch.set_num_threads(os.cpu_count() or 4)
    design = Qwen3TTSModel.from_pretrained('Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign', device_map='cpu', dtype=torch.float32)
    wavs, sr = design.generate_voice_design(text=QWEN_REF, language='English', instruct=QWEN_DESIGN)
    ref = out / 'reference.wav'
    sf.write(ref, np.asarray(wavs[0], dtype='float32'), sr)
    del design
    gc.collect()
    base = Qwen3TTSModel.from_pretrained('Qwen/Qwen3-TTS-12Hz-1.7B-Base', device_map='cpu', dtype=torch.float32)
    pr = pronounce.Pronouncer()
    files = []
    for i, (_, line) in enumerate(LINES):
        text = pr.respelled(voice.spoken(line))
        wavs, sr = base.generate_voice_clone(text=text, language='English', ref_audio=str(ref), ref_text=QWEN_REF)
        a = np.asarray(wavs[0], dtype='float32')
        f = out / f'line-{i}.wav'
        sf.write(f, a, sr)
        g = out / f'line-{i}-24k.wav'
        run(['ffmpeg', '-y', '-v', 'error', '-i', str(f), '-ar', str(SR), '-ac', '1', str(g)])
        files.append(g)
    return files


def take_gemini(out: Path, voice_name: str, style: str = '') -> list[Path]:
    """Gemini's speech model on the free tier, directed per line, with the lexicons' respellings in its notes. A take
    that does not say the script fails here as it would in a film (the film then falls back to Kokoro)."""
    from studio import gemini_tts
    os.environ['STORIES_GEMINI_VOICE'] = voice_name
    if style:
        os.environ['STORIES_GEMINI_STYLE'] = style
    else:
        os.environ.pop('STORIES_GEMINI_STYLE', None)
    files = []
    for i, (dl, line) in enumerate(LINES):
        f = out / f'line-{i}.wav'
        meta = gemini_tts.speak(voice.spoken(line), f, dl, None, '', lambda m: print(m, flush=True))
        print(f"  line {i}: {meta['check']['matched']:.0%} of the words heard", flush=True)
        files.append(f)
        time.sleep(21)  # the free tier's few requests a minute
    return files


TAKES = [
    ('A', 'before', 'Kokoro · George — as you heard it (B of 8.11)', lambda o: take_kokoro(o, 'bm_george', False), True),
    ('B', 'george', 'Kokoro · George — every name researched (club, country, native spelling)', lambda o: take_kokoro(o, 'bm_george'), True),
    ('C', 'lewis', 'Kokoro · Lewis — names + human pacing + narrator chain', lambda o: take_kokoro(o, 'bm_lewis'), True),
    ('D', 'qwen', 'Qwen3-TTS — a designed British narrator', take_qwen, True),
    ('E', 'gemini-charon', 'Gemini (free) · Charon — the documentary narrator, directed', lambda o: take_gemini(o, 'Charon'), True),
    ('F', 'gemini-puck', 'Gemini (free) · Puck — the Shorts storyteller', lambda o: take_gemini(o, 'Puck', 'short'), True),
]


# ── the name check (owner, 8.11.2026: "Petah Tikva, St. Pauli and the Arabic names are still not right") ───────────────
# The names the owner flagged, each said three ways. He answers with a number; the chosen way goes into the hand lexicon
# (a person's check wins over everything).
NAME_CHECK = [
    ('Petah Tikva', ['ˈpɛtax ˈtikva', 'ˈpɛtak ˈtikva', 'ˈpɛta ˈtikva']),
    ('Hapoel Petah Tikva', ['hapɒˈɛl ˈpɛtax ˈtikva', 'haˈpɒɛl ˈpɛtax tikˈva', 'hapɒˈɛl pɛˈtax tikˈva']),
    ('St. Pauli', ['zaŋkt ˈpaʊli', 'saŋkt ˈpaʊli', 'sənt ˈpɔːli']),
    ('Ahmed', ['ˈaxmɛd', 'ˈahmɛd', 'ˈaːmɛd']),
    ('Mohamed', ['muˈhamad', 'mɒˈhamɛd', 'muˈhammad']),
    ('Mahmoud', ['maxˈmuːd', 'mahˈmuːd', 'maˈmuːd']),
    ('Abdelilah', ['abdɛliˈlaː', 'abˈdɛlila', 'ˌabdɛlˈilə']),
    ('Aboutrika', ['abuˈtrika', 'abuːˈtriːka', 'ˌabuːtˈrɪkə']),
]


def name_check(out: Path) -> Path:
    """One clip: for each flagged name, "Petah Tikva — one: …, two: …, three: …", in the narrator's voice."""
    import numpy as np
    os.environ['STORIES_KOKORO_VOICE'] = 'bm_george'
    parts = []
    for k, (name, ways) in enumerate(NAME_CHECK):
        extra = {f'Qv{i}x': '/' + w + '/' for i, w in enumerate(ways)}
        text = ' '.join(f'{n}: Qv{i}x.' for i, n in enumerate(('One', 'Two', 'Three')))
        f = out / f'check-{k}.wav'
        voice.kokoro_beat(text, f, extra, 'normal')
        parts += [f, silence(out / f'check-gap-{k}.wav', 1.2)]
    mix = out / 'name-check.wav'
    concat(parts[:-1], mix, True)
    return mix


# ── the ear-proxy ────────────────────────────────────────────────────────────────────────────────────────────────────
def fold(s: str) -> str:
    s = unicodedata.normalize('NFKD', s)
    return re.sub(r'[^a-z ]', '', ''.join(c for c in s if not unicodedata.combining(c)).lower())


def name_hits(line: str, heard: str) -> tuple[int, int, list[str]]:
    pr = pronounce.Pronouncer()
    names = list(dict.fromkeys(pr.names_in(line)))
    words = fold(heard).split()
    missed = []
    for n in names:
        target = fold(n).split()
        k = len(target)
        best = max((difflib.SequenceMatcher(None, ' '.join(target), ' '.join(words[i:i + k])).ratio()
                    for i in range(max(1, len(words) - k + 1))), default=0)
        if best < 0.72:
            missed.append(n)
    return len(names) - len(missed), len(names), missed


def listen(files: list[Path]):
    from faster_whisper import WhisperModel
    m = WhisperModel('small.en', device='cpu', compute_type='int8')
    out = []
    import numpy as np
    for f, (_, line) in zip(files, LINES):
        # decoded by ffmpeg, not by faster-whisper: its PyAV call breaks on PyAV 14 (metadata_errors)
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(f), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                             capture_output=True, check=True).stdout
        segs, _ = m.transcribe(np.frombuffer(raw, dtype='float32'), language='en', beam_size=5)
        out.append(' '.join(s.text.strip() for s in segs))
    return out


# ── delivery ─────────────────────────────────────────────────────────────────────────────────────────────────────────
def card_video(audio: Path, out: Path, letter: str, title: str) -> None:
    font = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
    head, _, sub = title.partition(' — ')
    esc = lambda s: s.replace('\\', '\\\\').replace(':', '\\:').replace("'", "’")  # noqa: E731
    vf = (f"drawtext=fontfile={font}:text='TAKE {letter}':fontsize=150:fontcolor=0xF2EBDD:x=(w-tw)/2:y=360,"
          f"drawtext=fontfile={font}:text='{esc(head)}':fontsize=44:fontcolor=0xD9442B:x=(w-tw)/2:y=590,"
          f"drawtext=fontfile={font}:text='{esc(sub)}':fontsize=30:fontcolor=0xF2EBDD:x=(w-tw)/2:y=660,"
          f"drawtext=fontfile={font}:text='FAN LIFE · Football Stories · narrator audition':fontsize=26:fontcolor=0x8C8577:x=(w-tw)/2:y=900")
    run(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=0x14110F:s=1080x1080:r=12', '-i', str(audio),
         '-vf', vf, '-shortest', '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
         '-movflags', '+faststart', str(out)])


def main() -> None:
    out_root = Path(sys.argv[1]).resolve()
    out_root.mkdir(parents=True, exist_ok=True)
    report = {'lines': [l for _, l in LINES], 'takes': []}
    only = os.environ.get('AUDITION_TAKES', '').split(',') if os.environ.get('AUDITION_TAKES') else None
    for letter, key, title, fn, fx in TAKES:
        if only and letter not in only:
            continue
        d = out_root / key
        d.mkdir(exist_ok=True)
        t0 = time.time()
        try:
            files = fn(d)
        except Exception as e:  # noqa: BLE001 — one engine failing must not cost the owner the others
            report['takes'].append({'take': letter, 'key': key, 'title': title, 'error': f'{type(e).__name__}: {e}'[:400]})
            print(f'take {letter} failed: {e}', flush=True)
            continue
        took = time.time() - t0
        gap = silence(d / 'gap.wav', 0.9)
        seq = []
        for f in files:
            seq += [f, gap]
        mix = out_root / f'take-{letter}-{key}.wav'
        concat(seq[:-1], mix, fx)
        dur = voice._duration(mix)
        report['takes'].append({'take': letter, 'key': key, 'title': title, 'file': mix.name, 'seconds': round(dur, 1),
                                'render_seconds': round(took, 1), 'realtime_factor': round(took / max(dur, 1), 2),
                                'g2p': 'misaki' if letter in 'BC' and pronounce.misaki() is not None else ('respelled' if letter in 'DEF' else 'espeak'),
                                '_files': [str(f) for f in files]})
        print(f'take {letter}: {dur:.0f}s audio in {took:.0f}s', flush=True)
        (out_root / 'audition.json').write_text(json.dumps(report, indent=1, ensure_ascii=False))
    try:
        (out_root / 'check').mkdir(exist_ok=True)
        nc = name_check(out_root / 'check')
        card_video(nc, out_root / 'name-check.mp4', '?', 'Name check — one, two or three')
        report['name_check'] = [{'name': n, 'ways': w} for n, w in NAME_CHECK]
    except Exception as e:  # noqa: BLE001
        report['name_check_error'] = f'{type(e).__name__}: {e}'[:300]
    try:
        for t in report['takes']:
            if 'error' in t:
                continue
            heard = listen([Path(f) for f in t['_files']])
            hits = [name_hits(l, h) for (_, l), h in zip(LINES, heard)]
            t['heard'] = heard
            t['names_heard'] = sum(h[0] for h in hits)
            t['names_total'] = sum(h[1] for h in hits)
            t['names_missed'] = sorted({n for h in hits for n in h[2]})
    except Exception as e:  # noqa: BLE001
        report['whisper_error'] = f'{type(e).__name__}: {e}'[:300]
    for t in report['takes']:
        t.pop('_files', None)
        if 'file' in t:
            card_video(out_root / t['file'], out_root / t['file'].replace('.wav', '.mp4'), t['take'], t['title'])
    (out_root / 'audition.json').write_text(json.dumps(report, indent=1, ensure_ascii=False))
    if '--send' in sys.argv:
        delivery(out_root, report)


def delivery(out_root: Path, report: dict) -> None:
    """The delivery file deliver.mjs sends: an intro, one video per take, then the scores."""
    base = os.environ['AUDITION_RAW_BASE'].rstrip('/')
    scores_only = os.environ.get('AUDITION_SEND') == 'scores'
    items = [] if scores_only else [{'before': ['🎙 <b>אודישן קריין · Football Stories</b>\n\n'
                         'אותן 7 שורות מהסרטים, בכל קול. שימו לב לשמות (Mbappé, Panathinaikos, Željezničar, Mourinho), '
                         'לנשימות ולהפסקות.\n\nשורה לכל מועדון: זרינסקי, הפועל פתח תקווה, סלטיק, הפועל ת"א, סנט פאולי, אל אהלי, '
                         'ראג\'ה/וידאד, היוונים, ומונחי כדורגל.\nA = הקריין כפי ששמעת (B של הסבב הקודם). '
                         'B = אותו קריין, וכל שם נחקר: מועדון, מדינה, כתיב מקורי.\n\nכתוב לי איזה שם עדיין לא נכון — אני מתקן אותו ביד.']}]
    for t in ([] if scores_only else report['takes']):
        if 'file' not in t:
            items.append({'before': [f"⚠️ Take {t['take']} ({t['title']}) נכשל ברנדור: <code>{t.get('error', '')[:200]}</code>"]})
            continue
        score = (f"\nשמות שזוהו (Whisper): {t['names_heard']}/{t['names_total']}" if 'names_total' in t else '')
        items.append({'video': {'url': f"{base}/{t['file'].replace('.wav', '.mp4')}", 'name': f"narrator-take-{t['take']}.mp4",
                                'width': 1080, 'height': 1080,
                                'caption': f"<b>Take {t['take']}</b> · {t['title']}{score}\nזמן רנדור: ×{t['realtime_factor']} מזמן אמת"}})
    if report.get('name_check') and not scores_only:
        order = '\n'.join(f'{i + 1}. {n["name"]}' for i, n in enumerate(report['name_check']))
        items.append({'video': {'url': f"{base}/name-check.mp4", 'name': 'name-check.mp4', 'width': 1080, 'height': 1080,
                                'caption': '<b>בדיקת שמות</b> — כל שם בשלוש דרכים (One / Two / Three), בסדר הזה:\n' + order +
                                           '\n\nענה למשל: פתח תקווה 1, סנט פאולי 2, אחמד 2 — ואני נועל את זה במילון.'}})
    lines = []
    for t in report['takes']:
        if 'names_total' in t:
            miss = ', '.join(t['names_missed'][:8]) or '—'
            lines.append(f"<b>{t['take']}</b> · {t['names_heard']}/{t['names_total']} שמות · ×{t['realtime_factor']} · לא זוהו: {miss}")
    if lines:
        items.append({'messages': ['📊 <b>מבחן אוזן אוטומטי</b> (Whisper מתמלל כל טייק ובודק אם השם נשמע נכון)\n\n' + '\n'.join(lines)
                                   + ('\n\n(D רונדר מחדש למדידה; Qwen לא דטרמיניסטי, אז זה טייק אחות של מה ששמעת.)' if scores_only else '')
                                   + '\n\nהמדד עוזר, האוזן שלך מחליטה.']})
    (out_root / 'delivery.json').write_text(json.dumps({'items': items}, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
