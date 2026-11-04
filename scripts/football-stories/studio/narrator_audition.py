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

LINES = [
    ('build', 'October. AEK, at the old Nikos Goumas in Nea Filadelfeia. Madrid brought Figo, Zidane, Raúl and Roberto Carlos.'),
    ('excited', 'After six minutes, Tsartas from a free kick. Zidane equalised. Then Maladenis and Nikolaidis, two headers in three minutes. AEK three, Madrid one.'),
    ('build', 'José Mourinho on the Madrid bench. Marko Nikolić for AEK, champions of Greece for the fourteenth time. And up front for AEK, Luka Jović. A former Real Madrid striker.'),
    ('build', 'March. Panathinaikos at Leoforos, their old ground on Alexandras Avenue. Madrid had already won the group, and Del Bosque sent a young team.'),
    ('normal', 'November 2025. Karaiskakis again. Xabi Alonso against José Luis Mendilibar, the man who had won Olympiacos their European trophy.'),
    ('tense', 'Three-two in Piraeus. Fortounis, Jovetić, Chiquinho. Then two Fenerbahçe goals that made the trip to Istanbul feel very long.'),
    ('hush', 'Bosnia and Herzegovina, round seven. Željezničar at home in Sarajevo. Zrinjski up the road from Mostar. Nine minutes in, Eran Zahavi.'),
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


def take_kokoro(out: Path, v: str) -> list[Path]:
    os.environ['STORIES_KOKORO_VOICE'] = v
    files = []
    for i, (dl, line) in enumerate(LINES):
        f = out / f'line-{i}.wav'
        voice.kokoro_beat(line, f, None, dl)
        files.append(f)
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


TAKES = [
    ('A', 'before', 'Kokoro · George — as the films sound today', take_before, False),
    ('B', 'george', 'Kokoro · George — names + human pacing + narrator chain', lambda o: take_kokoro(o, 'bm_george'), True),
    ('C', 'lewis', 'Kokoro · Lewis — names + human pacing + narrator chain', lambda o: take_kokoro(o, 'bm_lewis'), True),
    ('D', 'qwen', 'Qwen3-TTS — a designed British narrator', take_qwen, True),
]


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
                                'g2p': 'misaki' if letter in 'BC' and pronounce.misaki() is not None else ('respelled' if letter == 'D' else 'espeak'),
                                '_files': [str(f) for f in files]})
        print(f'take {letter}: {dur:.0f}s audio in {took:.0f}s', flush=True)
        (out_root / 'audition.json').write_text(json.dumps(report, indent=1, ensure_ascii=False))
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
                         'לנשימות ולהפסקות.\n\nA = איך שהסרטים נשמעים היום. B, C = Kokoro אחרי השיפור. '
                         'D = Qwen3-TTS, קריין בריטי שעוצב מתיאור.\n\nתשובה של אות אחת מספיקה (למשל: B).']}]
    for t in ([] if scores_only else report['takes']):
        if 'file' not in t:
            items.append({'before': [f"⚠️ Take {t['take']} ({t['title']}) נכשל ברנדור: <code>{t.get('error', '')[:200]}</code>"]})
            continue
        score = (f"\nשמות שזוהו (Whisper): {t['names_heard']}/{t['names_total']}" if 'names_total' in t else '')
        items.append({'video': {'url': f"{base}/{t['file'].replace('.wav', '.mp4')}", 'name': f"narrator-take-{t['take']}.mp4",
                                'width': 1080, 'height': 1080,
                                'caption': f"<b>Take {t['take']}</b> · {t['title']}{score}\nזמן רנדור: ×{t['realtime_factor']} מזמן אמת"}})
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
