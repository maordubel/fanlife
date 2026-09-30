#!/usr/bin/env python3
"""
המסירה של 5.9.2026 (ערב) — ten paintings Maor pasted into the chat with delta 21.

  WORKER_ART_2026_09_05=<folder> python3 scripts/life/ingest-2026-09-05-art.py

Nine rooms and one plate, every one of them a key the code already named in
`ART-REQUIRED.md`, so each lands without a scene changing its coordinates:

  busStation   the old central station at six in the morning, one bus, rain
  ramatGan     the lower stand at Ramat Gan, a final at night, the pylons lit
  hatikva      the neighbourhood ground at the Hatikva, balconies watching
  armyRoom     a room in the base: bunks, lockers, the payphone in the corridor
  lironCar     Liron's car from the back seat, night, the road, the radio
  gate5        under the Gate 5 stand: concrete, a step, the folded cloth, a bulb
  kioskNight   Rafi's kiosk at night, half shut, a crate upside down, neon
  alley        the alley with the improvised goal — Stage A's pitch
  cup83        the terrace from a child's height on his father's shoulders — the prologue
  tunnelReveal the boy at the tunnel mouth, the ground opening — the arrival plate (9:16)

Same pipeline as every backdrop before it: resample to 1600 wide, clear the yellow band the
place-way (saturation capped, hue kept), quantise, measure the FILE, write the manifest
row, then `finish-backdrops.py` for the sky/ground strips. The folder is looked up by env
so the script runs from Maor's desktop delivery folder as well as from the chat uploads.
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
SRC = os.environ.get('WORKER_ART_2026_09_05', '/root/.claude/uploads/1031bb6e-b609-5caf-8b3a-4b2f7101c0c4')


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, filename))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ba = _load('ba', 'build-art.py')
ig = _load('ig', 'ingest-2026-09.py')
ib = _load('ib', 'ingest-2026-09b.py')

# key → (file stem in the chat upload, file name in the desktop folder)
ROOMS = {
    'busStation': ('d9a6e15d-image.png', 'busStation.png'),
    'ramatGan': ('bdf0ba13-image.png', 'ramatGan.png'),
    'hatikva': ('139fc897-image.png', 'hatikva.png'),
    'armyRoom': ('62dc4970-image.png', 'armyRoom.png'),
    'lironCar': ('388c30db-image.png', 'lironCar.png'),
    'gate5': ('8c54cedb-image.png', 'gate5.png'),
    'kioskNight': ('d8aaa24c-image.png', 'kioskNight.png'),
    'alley': ('8b9317ad-image.png', 'alley.png'),
    'cup83': ('255083ce-image.png', 'cup83.png'),
}
PLATES = {
    'tunnelReveal': ('16759f3f-image.png', 'tunnelReveal.png'),
}

# The same evening, from the desktop folder `CURRENT-GRAPHICS-PART-2/generated_images`: of
# its 66 generator outputs, 62 were the sources of assets the game already had (matched by
# a 16px signature against `public/life/art`); these four were not in the game yet.
SRC2 = os.environ.get('WORKER_ART_PART2', '/mnt/user-data/uploads/CURRENT-GRAPHICS-PART-2/generated_images')
ROOMS2 = {
    # the 1990s street on a match day — bunting between the balconies, the car at the kerb
    'street90Flags': ('exec-0cf4fb96-b0f2-4802-b4c5-8e4bb8e310f4.png', 'street90Flags.png'),
    # Ussishkin at night, lit, empty — the two relegation nights
    'ussHallNight': ('exec-b261fc66-c509-4684-86b6-9761d0549d3c.png', 'ussHallNight.png'),
    # the classroom of 1998: a map on the wall, a radiator, a Sunday morning
    'classroom98': ('exec-4dc21599-3abc-482d-b900-bd53a8a1c34c.png', 'classroom98.png'),
}


def find(names, root=None):
    for base in ([root] if root else [SRC, SRC2]):
        for name in names:
            path = os.path.join(base, name)
            if os.path.exists(path):
                return path
    raise SystemExit(f'missing: {names} in {root or (SRC, SRC2)}')


def main():
    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf8'))
    for key, names in ROOMS.items():
        im = Image.open(find(names)).convert('RGB')
        row = ig.write(im, key, max_w=ib.MAX_BACKDROP_W, dey=ib.deyellow_place, shift=False)
        row['source'] = '2026-09-05'
        manifest.setdefault('backdrops', {})[key] = row
    for key, names in ROOMS2.items():
        im = Image.open(find(names, SRC2)).convert('RGB')
        row = ig.write(im, key, max_w=ib.MAX_BACKDROP_W, dey=ib.deyellow_place, shift=False)
        row['source'] = '2026-09-05'
        manifest.setdefault('backdrops', {})[key] = row
    for key, names in PLATES.items():
        im = Image.open(find(names)).convert('RGB')
        row = ig.write(im, key, max_h=1400, dey=ib.deyellow_place, shift=False)
        row['source'] = '2026-09-05'
        manifest.setdefault('plates', {})[key] = row
    json.dump(manifest, open(manifest_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    # the sky and ground strips, so a phone in portrait sees a room and not a bar
    subprocess.run([sys.executable, os.path.join(HERE, 'finish-backdrops.py'), *ROOMS.keys(), *ROOMS2.keys()], check=True)


if __name__ == '__main__':
    main()
