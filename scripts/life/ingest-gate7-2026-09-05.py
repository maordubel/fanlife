#!/usr/bin/env python3
"""
שער 7, מהדשא — the terrace Maor painted to the prompt in `PROMPT-GATE7-STAND-1986.md`.

    WORKER_GATE7=<file.jpg|png> python3 scripts/life/ingest-gate7-2026-09-05.py

It replaces `stand.png`, and it is the only backdrop in the game whose geometry was
MEASURED off the painting rather than asked for in advance: the tread lines, the top of
the railing and the mouth of the entrance were read out of the file (see
`docs/life/GATE7-GEOMETRY.md`) and `scenes.ts` was set to them. So the file must not be
cropped or padded after this — a scene that stands people on step edges cannot survive
its picture being re-framed by a pixel.

Native size is kept (no upscale to 1600): the engine takes the world's size from the
texture, so a 1458-wide painting is a 1458-wide room and nothing is stretched.
"""
import importlib.util
import json
import os
import subprocess
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public/life/art')
SRC = os.environ.get('WORKER_GATE7', '')


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, filename))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ig = _load('ig', 'ingest-2026-09.py')
ib = _load('ib', 'ingest-2026-09b.py')


def main():
    if not SRC or not os.path.exists(SRC):
        raise SystemExit('set WORKER_GATE7 to the painting')
    im = Image.open(SRC).convert('RGB')
    print('source', im.size)
    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf8'))
    row = ig.write(im, 'stand', max_w=im.size[0], dey=ib.deyellow_place, shift=False)
    row['source'] = '2026-09-05-gate7'
    manifest.setdefault('backdrops', {})['stand'] = row
    json.dump(manifest, open(manifest_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('stand', row)
    subprocess.run([sys.executable, os.path.join(HERE, 'finish-backdrops.py'), 'stand'], check=True)


if __name__ == '__main__':
    main()
