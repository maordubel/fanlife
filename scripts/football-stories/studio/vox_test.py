"""A test of the VOX engine on a real story, run by .github/workflows/stories-vox-test.yml (temporary): the directors'
scripts (written once, or taken from an earlier run), each director's film rendered in VOX, its preview sent to the
owner's Telegram with the render time."""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from studio import pipeline  # noqa: E402
from studio.common import Palette, read_json  # noqa: E402

REQ = read_json(Path(__file__).with_name('vox-test.json'))


def brief(choice: int | None) -> dict:
    b = {'club_id': REQ['club'], 'season': REQ['season'], 'duration': REQ['minutes'], 'kind': REQ.get('kind', 'season'),
         'topic': REQ.get('topic', ''), 'scripts': 3, 'crowd': 'soft', 'music': 'synth', 'look': 'clean', 'review': 'auto',
         'engine': 'vox'}
    if choice:
        b['choice'] = choice
    return b


def main() -> int:
    mode, job = sys.argv[1], Path(sys.argv[2])
    pal = Palette.from_json(json.loads(Path(os.environ['PALETTES']).read_text())[REQ['club']])
    if mode == 'write':
        r = pipeline.run(job, brief(None), pal)
        print(json.dumps(r.get('options'), indent=1))
        return 0 if r.get('options') else 1
    n = int(mode)
    if not (job / f'script-option-{n}.json').exists():
        print(f'option {n} was not written'); return 0
    t0 = time.time()
    r = pipeline.run(job, brief(n), pal)
    mins = (time.time() - t0) / 60
    s = read_json(job / f'script-option-{n}.json')
    plan = read_json(job / 'plan.json')
    log = (job / 'log.txt').read_text() if (job / 'log.txt').exists() else ''
    vox_line = next((ln for ln in log.splitlines()[::-1] if 'ms a frame' in ln), '')
    print('VOX', vox_line, f'whole film {mins:.1f} min')
    prev = job / 'out' / 'preview.mp4'
    # a contact sheet of the master in the log (base64), so the engine's author can look at the real film's frames
    import base64
    import subprocess
    sheet = job / 'out' / 'sheet.jpg'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(job / 'out' / 'master.mp4'), '-vf',
                    f'fps={48 / max(30, plan["duration"]):.4f},scale=320:-2,tile=6x8', '-frames:v', '1', '-q:v', '6', str(sheet)])
    if sheet.exists():
        print('SHEET-BEGIN', base64.b64encode(sheet.read_bytes()).decode(), 'SHEET-END')
    from matchday.vlog_auto import send_telegram
    from studio.script import selected_title
    qa = r.get('qa', {})
    cap = (f'VOX TEST · {s.get("_angle") or s.get("director")} · {selected_title(s)}\n'
           f'{REQ["club"]} {REQ["season"]} · {plan["duration"] / 60:.1f} min film · rendered in {mins:.0f} min on 4 workers · '
           f'QA {"ok" if qa.get("ok") else "see report"}')
    send_telegram([(prev, cap)], print)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
