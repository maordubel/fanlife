"""A test of the Director's Cut on a real story, run by .github/workflows/stories-director-test.yml (temporary): write the
three directors' scripts once, then render each director's film and send its preview to the owner's Telegram."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from studio import pipeline  # noqa: E402
from studio.common import Palette, read_json  # noqa: E402

REQ = read_json(Path(__file__).with_name('director-test.json'))


def brief(choice: int | None) -> dict:
    b = {'club_id': REQ['club'], 'season': REQ['season'], 'duration': REQ['minutes'], 'kind': REQ.get('kind', 'season'),
         'topic': REQ.get('topic', ''), 'scripts': 3, 'crowd': 'soft', 'music': 'synth', 'look': 'clean', 'review': 'auto'}
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
    r = pipeline.run(job, brief(n), pal)
    s = read_json(job / f'script-option-{n}.json')
    prev = job / 'out' / 'preview.mp4'
    from matchday.vlog_auto import send_telegram
    from studio.script import selected_title
    cap = f'DIRECTOR\'S CUT TEST · {s.get("_angle")}\n{selected_title(s)}\n{REQ["club"]} {REQ["season"]} · QA {"ok" if r.get("qa", {}).get("ok") else "see report"}'
    send_telegram([(prev, cap)], print)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
