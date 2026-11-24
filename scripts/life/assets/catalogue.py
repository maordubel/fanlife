#!/usr/bin/env python3
"""
LIFE character assets: what is in the MakeHuman packs, written down so a choice can be made by looking.

  python3 catalogue.py <unpacked data dir> <zips dir> <out dir> <vendor dir>

Writes <out>/listing.txt (every asset: files, sizes, the licence and author lines of its own .mhclo/.mhmat),
<out>/<kind>.jpg (the packs' own thumbnails on one sheet, named) and copies the two tiny functional packs
(face units, visemes) into <vendor> so the face does not depend on a download.
"""
import os, re, shutil, sys
from pathlib import Path
from PIL import Image, ImageDraw

data, zips, out, vendor = map(Path, sys.argv[1:5])
out.mkdir(parents=True, exist_ok=True); vendor.mkdir(parents=True, exist_ok=True)
lines = []
for kind in sorted(p.name for p in data.iterdir() if p.is_dir()):
    cells = []
    for f in sorted((data / kind).rglob('*')):
        if f.suffix not in ('.mhclo', '.mhmat', '.proxy', '.target', '.bvh', '.json', '.txt', '.md'): continue
        head = f.read_text(errors='replace')[:6000] if f.suffix in ('.mhclo', '.mhmat', '.proxy', '.txt', '.md') else ''
        meta = ' | '.join(sorted(set(m.strip() for m in re.findall(r'(?im)^\s*(?:#\s*)?((?:license|licence|author|copyright|homepage)\b.*)$', head))))[:300]
        size = sum(x.stat().st_size for x in f.parent.iterdir() if x.is_file()) if f.suffix in ('.mhclo', '.proxy') else f.stat().st_size
        nv = head.count('\n') if f.suffix == '.mhclo' else 0
        extra = ''
        if f.suffix == '.mhclo':
            obj = next(iter(f.parent.glob('*.obj')), None)
            if obj: extra = f" verts={sum(1 for l in open(obj, errors='replace') if l.startswith('v '))}"
            extra += ' files=' + ','.join(sorted(x.name for x in f.parent.iterdir() if x.suffix in ('.png', '.jpg', '.mhmat')))[:400]
        lines.append(f"{kind}\t{f.relative_to(data)}\t{size // 1024}KB\t{meta}{extra}")
        th = f.with_suffix('.thumb')
        if f.suffix in ('.mhclo', '.mhmat', '.proxy') and th.exists(): cells.append((f.stem, th))
    if cells:
        cols = 8; rows = (len(cells) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * 160, rows * 176), (245, 245, 245)); d = ImageDraw.Draw(sheet)
        for i, (name, th) in enumerate(cells):
            x, y = (i % cols) * 160, (i // cols) * 176
            try:
                im = Image.open(th).convert('RGBA').resize((152, 152)); bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
                sheet.paste(bg.convert('RGB'), (x + 4, y + 2))
            except Exception as e: d.text((x + 4, y + 60), 'no thumb', fill=(200, 0, 0))
            d.text((x + 4, y + 158), name[:26], fill=(0, 0, 0))
        sheet.save(out / f'{kind}.jpg', quality=82)
for z in sorted(zips.glob('*.zip')):
    lines.append(f"zip\t{z.name}\t{z.stat().st_size // 1024}KB")
    if z.stat().st_size < 2_000_000: shutil.copy(z, vendor / z.name)
for f in sorted(data.rglob('*')):
    if f.is_file() and re.search(r'(?i)licen[sc]e|readme', f.name): lines.append(f"doc\t{f.relative_to(data)}\t{f.read_text(errors='replace')[:800]!r}")
(out / 'listing.txt').write_text('\n'.join(lines) + '\n')
print(len(lines), 'entries')
