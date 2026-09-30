#!/usr/bin/env python3
"""
חבילת ה־Production Clean — the assets Maor filtered by hand and approved, and only those.

    WORKER_APPROVED=<folder> python3 scripts/life/ingest-approved-2026-09-05.py [group ...]

Two rules from him, and they are the whole design of this script:

  · **An approved file OVERWRITES the key it replaces, under the same name.** No
    `foo2.png` beside `foo.png` — the way a game ends up drawing last month's art is that
    somebody left last month's art in the folder with a name close enough to reach for.
  · **What is not in the pack is not approved.** The pack's own README says never to fall
    back to a similarly named file in the old repo. Where it supplies a replacement, the
    replacement wins; where it does not, the key stays and is listed in ART-REQUIRED as
    still owing a redraw.

Groups: `tunnel`, `hall`, `pano`, `rooms`, `figures`, `props`, `ui`. No group = all of them.
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
ENV = os.environ.get(
    'WORKER_APPROVED_ENV',
    '/mnt/user-data/uploads/THE-WORKER-PRODUCTION-CLEAN-1-OF-2-ENVIRONMENTS (1)/THE-WORKER-PRODUCTION-CLEAN-1-OF-2-ENVIRONMENTS',
)
CHR = os.environ.get(
    'WORKER_APPROVED_CHR',
    '/mnt/user-data/uploads/THE-WORKER-PRODUCTION-CLEAN-2-OF-2-CHARACTERS (1)/THE-WORKER-PRODUCTION-CLEAN-2-OF-2-CHARACTERS',
)


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, filename))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ig = _load('ig', 'ingest-2026-09.py')
ib = _load('ib', 'ingest-2026-09b.py')

# group → [(file under the pack, manifest group, key, kwargs for write)]
JOBS = {
    'tunnel': [
        (f'{ENV}/TUNNEL/texWallFaded.png', 'textures', 'texTunnelWall', {}),
        (f'{ENV}/TUNNEL/texWallPoster.png', 'textures', 'texTunnelWallPoster', {}),
        (f'{ENV}/TUNNEL/texFloorWet.png', 'textures', 'texTunnelFloor', {}),
        (f'{ENV}/TUNNEL/texCeilingCable.png', 'textures', 'texTunnelCeiling', {}),
        (f'{ENV}/TUNNEL/texStairsRail.png', 'textures', 'texTunnelSteps', {}),
        (f'{ENV}/TUNNEL/texDoorRed.png', 'textures', 'texTunnelDoor', {}),
    ],
    'hall': [
        (f'{ENV}/STADIUMS/USSISHKIN/ussishkin-empty-main-stand.png', 'backdrops', 'ussHall', {'backdrop': True}),
        (f'{ENV}/STADIUMS/USSISHKIN/ussishkin-empty-high-corner.png', 'backdrops', 'ussHallPre', {'backdrop': True}),
    ],
    'pano': [
        (f'{ENV}/BACKGROUNDS/panoReveal-1986.png', 'panoramas', 'panoReveal', {}),
        (f'{ENV}/BACKGROUNDS/panoTerrace-1986.png', 'panoramas', 'panoTerrace1986', {}),
        (f'{ENV}/BACKGROUNDS/panoUssishkin-1986.png', 'panoramas', 'panoUssHall', {}),
        (f'{ENV}/BACKGROUNDS/panoUssishkinDerby.png', 'panoramas', 'panoUssDerby', {}),
        (f'{ENV}/BACKGROUNDS/panoKitchen-1990.png', 'panoramas', 'panoKitchen90', {}),
        (f'{ENV}/BACKGROUNDS/panoBedroom-1990.png', 'panoramas', 'panoBedroomMorning90', {}),
        (f'{ENV}/BACKGROUNDS/panoGate7-1986.png', 'panoramas', 'panoGate7', {}),
        (f'{ENV}/BACKGROUNDS/classroom-1991.png', 'panoramas', 'panoClassroom', {}),
    ],
    'rooms': [
        (f'{ENV}/BACKGROUNDS/gate5-empty-1994.png', 'backdrops', 'gate5', {'backdrop': True}),
    ],
    'ui': [
        (f'{CHR}/UI/titleWorker.png', 'ui', 'titleWorker', {'cutout': True}),
    ],
}

# The four characters the pack ships, and the repo keys they replace. A pose the pack does
# not carry is left as it is — and listed as owing a redraw, never quietly kept as new.
FIGURES = {
    'rachel': {
        'rachel-front.png': 'rachel',
        'rachel-three-quarter.png': 'rachel-3q',
        'rachel-side.png': 'rachel-side',
        'rachel-back.png': 'rachel-back',
        'rachel-speak.png': 'rachel-speak',
        'rachel-listen.png': 'rachel-listen',
        'rachel-concern.png': 'rachel-concern',
        'rachel-laugh.png': 'rachel-laugh',
    },
    'efi96': {
        'efi96-front.png': 'efi96',
        'efi96-three-quarter.png': 'efi96-3q',
        'efi96-side.png': 'efi96-side',
        'efi96-back.png': 'efi96-back',
        'efi96-speak.png': 'efi96-speak',
        'efi96-listen.png': 'efi96-listen',
        'efi96-concern.png': 'efi96-concern',
        'efi96-laugh.png': 'efi96-laugh',
    },
    'barry96': {
        'barry96-front.png': 'barry96',
        'barry96-three-quarter.png': 'barry96-3q',
        'barry96-side.png': 'barry96-side',
        'barry96-back.png': 'barry96-back',
        'barry96-speak.png': 'barry96-speak',
        'barry96-listen.png': 'barry96-listen',
        'barry96-concern.png': 'barry96-concern',
        'barry96-laugh.png': 'barry96-laugh',
    },
}
WALKS = {'barry96': 'barry96', 'efi96': 'efi96', 'michel96': 'michel96'}

PROPS = {
    'propBasketball.png': 'propBasketball',
    'propCassette.png': 'propCassette',
    'propChalkEraser.png': 'propChalkEraser',
    'propCrayonMap.png': 'propCrayonMap',
    'propNewspaperTable.png': 'propNewspaperTable',
    'propNotebookScrap.png': 'propNotebookScrap',
    'propPocketNote.png': 'propPocketNote',
    'propRedBox.png': 'propRedBox',
    'propSchoolBag.png': 'propSchoolBag',
    'propTicketBasketball.png': 'propTicketBasketball',
}

# A profile in this game faces RIGHT (see `WorldScene.ART_FACES`). This said LEFT on
# 5.9.2026 and it was wrong: `pogi-side`, `hero80-side` and every walk frame the earlier
# ingests cut face right, and the one file this flag actually mirrored — `barry96-side` —
# had to be mirrored back. A sheet that arrives facing left is mirrored here rather than
# at runtime, so the file on disk is the truth; `scripts/life/facing-check.py` says so.
FACE_RIGHT = True


def write(path, group, key, manifest, backdrop=False, cutout=False):
    im = Image.open(path)
    im = im.convert('RGBA') if (cutout or im.mode in ('RGBA', 'LA')) else im.convert('RGB')
    kw = {'dey': ib.deyellow_place, 'shift': False} if backdrop else {}
    if backdrop:
        kw['max_w'] = ib.MAX_BACKDROP_W
    row = ig.write(im, key, **kw)
    row['source'] = 'production-clean-2026-09-05'
    manifest.setdefault(group, {})[key] = row
    return row


def main():
    groups = sys.argv[1:] or ['tunnel', 'hall', 'pano', 'rooms', 'figures', 'props', 'ui']
    path = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(path, encoding='utf8'))
    touched = []
    for group in groups:
        for src, mgroup, key, kw in JOBS.get(group, []):
            if not os.path.exists(src):
                print('  missing', src)
                continue
            write(src, mgroup, key, manifest, **kw)
            touched.append(key)
            print(f'  {key:24s} ← {os.path.basename(src)}')
        if group == 'figures':
            for who, poses in FIGURES.items():
                for filename, key in poses.items():
                    src = f'{CHR}/CHARACTERS/{who}/{filename}'
                    if not os.path.exists(src):
                        print('  missing', src)
                        continue
                    write(src, 'figures', key, manifest, cutout=True)
                    touched.append(key)
                    print(f'  {key:24s} ← {who}/{filename}')
            for who, prefix in WALKS.items():
                for n in range(1, 9):
                    src = f'{CHR}/CHARACTERS/{who}/{who}-walk-{n}.png'
                    if not os.path.exists(src):
                        continue
                    key = f'{prefix}-walk{n}'
                    write(src, 'figures', key, manifest, cutout=True)
                    touched.append(key)
                print(f'  {prefix}-walk1..8')
        if group == 'props':
            for filename, key in PROPS.items():
                src = f'{CHR}/PROPS/{filename}'
                if not os.path.exists(src):
                    print('  missing', src)
                    continue
                write(src, 'props', key, manifest, cutout=True)
                touched.append(key)
                print(f'  {key:24s} ← {filename}')
    json.dump(manifest, open(path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    backdrops = [k for k in touched if manifest.get('backdrops', {}).get(k)]
    if backdrops:
        subprocess.run([sys.executable, os.path.join(HERE, 'finish-backdrops.py'), *backdrops], check=True)
    print(f'{len(touched)} keys overwritten from the approved pack')


if __name__ == '__main__':
    main()
