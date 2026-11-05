"""A test of VOX on HyperFrames on a real story (temporary; run by .github/workflows/stories-hf-test.yml): one chapter of
a real film — its claims, the narrator's Kokoro voice and timings, the club palette — rendered by HyperFrames and by the
PIL VOX engine, both timed, the HyperFrames cut mixed and sent to the owner's Telegram."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from studio.common import FPS, STUDIO, Palette, read_json, write_json  # noqa: E402

REQ = {'club': 'hapoel-tel-aviv', 'season': '1999/00', 'dossier': 'hapoel-tel-aviv-1999-00.json',
       'script': 'pilot-hapoel-1999-00.script.json', 'chapter': 3, 'fps': 30, 'pil': True}


def log(m):
    print(time.strftime('%H:%M:%S'), m, flush=True)


def prepare(job: Path, pal: Palette) -> dict:
    from studio import director, edit, research, voice
    job.mkdir(parents=True, exist_ok=True)
    if not (job / 'ledger.json').exists():
        dos = read_json(STUDIO / 'dossiers' / REQ['dossier'])
        led = research.build_ledger(REQ['club'], REQ['season'], dos['claims'])
        led['art_sets'] = dos.get('art_sets') or []
        director.attach(led)
        write_json(job / 'ledger.json', led)
    led = read_json(job / 'ledger.json')
    full = read_json(STUDIO / 'dossiers' / REQ['script'])
    s = {**full, 'chapters': [full['chapters'][REQ['chapter']]]}
    write_json(job / 'script.json', s)
    if not (job / 'voice.json').exists():
        write_json(job / 'voice.json', voice.voice_script(s, job / 'voice', job / 'cache' / 'voice', log))
    ed = edit.Editor(job, led, s, read_json(job / 'voice.json'), pal, job / 'art')
    plan = ed.plan()
    plan['shots'] = [x for x in plan['shots'] if x['visual']['type'] not in ('end', 'follow')]
    plan['duration'] = round(plan['shots'][-1]['start'] + plan['shots'][-1]['frames'] / FPS, 3)
    plan['engine'] = 'vox'
    write_json(job / 'plan.json', plan)
    return plan


def mux(picture: Path, mix: Path, out: Path) -> Path:
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(picture), '-i', str(mix), '-map', '0:v', '-map', '1:a', '-c:v', 'libx264',
                    '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest',
                    '-movflags', '+faststart', str(out)], check=True)
    return out


def main() -> int:
    job = Path(sys.argv[1])
    pal = Palette.from_json(json.loads(Path(os.environ['PALETTES']).read_text())[REQ['club']])
    plan = prepare(job, pal)
    from studio import audio
    from studio.hyperframes.render import render_chapter
    out = job / 'out'
    out.mkdir(exist_ok=True)
    shots = plan['shots']
    hf_raw = job / 'hf' / 'chapter.mp4'
    t0 = time.time()
    r = render_chapter(job, plan, pal, shots, hf_raw, log, REQ['fps'], int(os.environ.get('HF_WORKERS', '0')) or None)
    hf_s = time.time() - t0
    shutil.rmtree(job / 'mix', ignore_errors=True)
    mix = audio.build_mix(job, plan, log, 'soft', 'synth')
    hf = mux(hf_raw, mix, out / 'hyperframes.mp4')
    pil_line = ''
    if REQ.get('pil'):
        from studio.vox.render import render_film
        t1 = time.time()
        render_film(job, plan, pal, log, workers=int(os.environ.get('STORIES_WORKERS', '0')) or None)
        pil_s = time.time() - t1
        pil_line = f' · PIL VOX {pil_s / plan["duration"]:.2f}s per film second ({pil_s:.0f}s, 25 fps)'
        mux(job / 'picture.mp4', mix, out / 'pil.mp4')
    dur = r['duration']
    line = (f'HyperFrames {hf_s / dur:.2f}s per film second ({hf_s:.0f}s incl. compose {r["compose_s"]}s, {REQ["fps"]} fps)'
            + pil_line)
    print('TIMING', line)
    write_json(out / 'timing.json', {'hf_s': round(hf_s, 1), 'film_s': dur, **r})
    from matchday.vlog_auto import send_telegram, telegram_size
    chap = read_json(job / 'script.json')['chapters'][0]['title']
    cap = (f'HYPERFRAMES TEST · {REQ["club"]} {REQ["season"]} · chapter {REQ["chapter"] + 1} ("{chap}")\n'
           f'{dur:.0f}s · rendered on a GitHub runner · {line}\nPrototype (look vox-hf), not the default.')
    send_telegram([(telegram_size(hf, out / 'hyperframes-tg.mp4'), cap)], log)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
