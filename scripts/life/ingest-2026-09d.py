#!/usr/bin/env python3
"""
המסירה הרביעית — the atmosphere plates from `THE-WORKER-COMPLETE-ART-MASTER-2026-09-04`.

  WORKER_ART=<master folder> python3 scripts/life/ingest-2026-09d.py

The master package Maor sent on 4.9.2026 merges three deliveries. Two of them are already
in this repo — `GENERAL-GAME-ART` and `USSISHKIN-FAITHFUL-RECONSTRUCTION` came in with
`ingest-2026-09c.py` — and the third, `BLOOMFIELD-2000-2019-PLUS`, is a stadium the game
does not reach yet: the ground as it was between 2000 and 2016 and as it was rebuilt in
2019, which belongs to the chapter about the championship of 2000 and to nothing that is
built today. Rule 43 lets art land before its scene; it does not ask for nineteen
megabytes of it to be uploaded by hand for rooms that do not exist. So that set stays in
the delivery folder, recorded in the art brief, and comes in with its chapter.

What DOES come in are the four overlays, because they are not a place — they are weather,
and the rooms this game already has are the ones that need them:

  · `overlaySmoke`    — red smoke, over the terrace and over the hall when it goes off
  · `overlayConfetti` — paper in the air at the moment a thing is won
  · `overlayHaze`     — the cone-light haze of a floodlit night, and of a tin roof's lamps
  · `overlayMist`     — the coastal air Jaffa has an hour before dark

They are alpha plates and are quantised WITH their alpha (`write_alpha_layer` from the
third delivery), because a 1.8MB true-colour wash over a room is the whole room's budget
spent on air.
"""
import json
import importlib.util
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public/life/art')
ART = os.environ.get('WORKER_ART', '/mnt/user-data/uploads/THE-WORKER-COMPLETE-ART-MASTER-2026-09-04')


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, filename))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ba = _load('ba', 'build-art.py')
ig = _load('ig', 'ingest-2026-09.py')
ib = _load('ib', 'ingest-2026-09b.py')
ic = _load('ic', 'ingest-2026-09c.py')

OVERLAYS = [
    ('overlaySmoke', 'BLOOMFIELD-2000-2019-PLUS/overlays/overlay-red-smoke.png'),
    ('overlayConfetti', 'BLOOMFIELD-2000-2019-PLUS/overlays/overlay-red-white-confetti.png'),
    ('overlayHaze', 'BLOOMFIELD-2000-2019-PLUS/overlays/overlay-cool-floodlight-haze.png'),
    ('overlayMist', 'BLOOMFIELD-2000-2019-PLUS/overlays/overlay-coastal-mist.png'),
]

def main():
    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf8'))

    print('--- overlays ---')
    for key, name in OVERLAYS:
        path = os.path.join(ART, name)
        if not os.path.exists(path):
            print(f'!! missing {path}')
            continue
        im = Image.open(path).convert('RGBA')
        # Half the delivered width: an overlay is air, and air does not need to be as
        # sharp as the wall behind it.
        if im.width > 1600:
            im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
        row = ic.write_alpha_layer(im, key, colors=120)
        row['source'] = '2026-09d'
        manifest.setdefault('layers', {})[key] = row

    json.dump(manifest, open(manifest_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('manifest written')


if __name__ == '__main__':
    main()
