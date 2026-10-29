"""LIFE · RUSH — loom's ground tiles into what ships: colour as lossy WebP, height and roughness as grey WebP
(a grey image has no chroma for the encoder to subsample). The normal is rebuilt from the height in the browser.
    python3 scripts/life/rush/pack-surfaces.py <loom out dir>
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

src, dst = Path(sys.argv[1]), Path('public/life/rush/tex')
dst.mkdir(parents=True, exist_ok=True)
for name in ('asphalt', 'slabs', 'concrete'):
    d = src / name
    Image.open(d / f'{name}_albedo.png').convert('RGB').save(dst / f'{name}-albedo.webp', 'WEBP', quality=86, method=6)
    h = np.asarray(Image.open(d / f'{name}_height.png')).astype(np.float64)
    h = (h - h.min()) / max(1e-9, h.max() - h.min())
    Image.fromarray((h * 255 + 0.5).astype(np.uint8), 'L').save(dst / f'{name}-height.webp', 'WEBP', quality=92, method=6)
    Image.open(d / f'{name}_roughness.png').convert('L').save(dst / f'{name}-rough.webp', 'WEBP', quality=88, method=6)
    sizes = {p.name: p.stat().st_size // 1024 for p in sorted(dst.glob(f'{name}-*.webp'))}
    print(name, sizes)
