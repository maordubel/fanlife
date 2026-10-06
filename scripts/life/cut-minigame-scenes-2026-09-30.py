"""Scene-dressing derivatives for the Penalties and Hoops minigames (30.9.2026).

Crops of art that already ships — nothing is painted, nothing is edited in place.
Every output is de-yellowed with the shared helper and measured on the DECODED file
(rules 27, 61). Provenance is written to content/manual/asset-provenance.json's
sibling ledger: docs/life/LIFE-MINIGAME-ASSET-MAP.md.
"""
import importlib.util, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / 'public/life/art'
spec = importlib.util.spec_from_file_location('ba', ROOT / 'scripts/life/build-art.py')
ba = importlib.util.module_from_spec(spec); spec.loader.exec_module(ba)

JOBS = [
    # out, source, (x0,y0,x1,y1) as fractions
    ('life-scene-penalties-backdrop-01', 'alley', (0.22, 0.0, 0.74, 0.74)),
    ('life-scene-hoops-backdrop-01', 'hoop-building', (0.0, 0.03, 1.0, 0.5)),
]
for out, src, (x0, y0, x1, y1) in JOBS:
    im = Image.open(ART / f'{src}.webp').convert('RGB')
    w, h = im.size
    c = im.crop((int(x0*w), int(y0*h), int(x1*w), int(y1*h)))
    c, _ = ba.deyellow(c)
    p = ART / f'{out}.webp'
    c.save(p, 'WEBP', lossless=True, method=6)
    d = Image.open(p).convert('RGB')
    print(out, d.size, p.stat().st_size, 'yellow', ba.count_yellow(d))
