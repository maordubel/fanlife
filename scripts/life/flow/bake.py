#!/usr/bin/env python3
"""
Bake LIFE's Flow pictures (rule life-flow-art) into the static files the game reads.

Reads the private bucket `worker-stories/library/life/*.png` (service key, GitHub Actions only), downloads only what is
new or changed against `public/life/flow/manifest.json` (by size + etag), and writes per piece:
  facade   <stem>-1024.webp, <stem>-512.webp, and the derived material maps at 512:
           <stem>-n-512.webp (normal, mild, from luminance), <stem>-r-512.webp (roughness: glass and wet stone smoother),
           <stem>-e-512.webp (emissive: the picture's own lit warm windows, black elsewhere)
  stadium  <stem>-2048.webp, <stem>-1024.webp       (width)
  skyline  <stem>-2048.webp, <stem>-1024.webp       (width)
  story    <stem>-1600.webp                          (width)
  aerial   <stem>-1536.webp                          (width)
Metadata is stripped (Pillow writes no EXIF/XMP unless asked). A size is never upscaled: the real width/height of every
file is in the manifest. Human review fields (`use`, `note`) survive a re-bake; a new piece starts `use: true` with an
`auto` note unless the yellow scan fails it (rule 8, same hue test as lib/isYellow.ts).

  python3 -I scripts/life/flow/bake.py [--src DIR] [--out public/life/flow] [--force]
--src bakes local PNGs instead of the bucket (for a local check).
"""
import argparse, hashlib, io, json, os, sys, urllib.request
from datetime import datetime, timezone

import numpy as np
from PIL import Image, ImageFilter

BUCKET = 'worker-stories'
PREFIX = 'library/life'
SIZES = {'facade': [1024, 512], 'stadium': [2048, 1024], 'skyline': [2048, 1024], 'story': [1600], 'aerial': [1536], 'cast': [768, 384]}
CAST = ('boy', 'teen', 'man', 'father', 'mother', 'mate', 'kiosk', 'neighbour', 'grandfather')
PEOPLE = ('med', 'north', 'maghreb')
MAP_SIZE = 512
TOWNS = ['ath', 'tlv', 'mos', 'eur', 'gla', 'ham', 'bgo', 'cas', 'cai', 'hfa', 'ptk']
CLUB_TOWN = {
    'hapoel-tel-aviv': 'tlv', 'olympiacos': 'ath', 'panathinaikos': 'ath', 'aek-athens': 'ath', 'zrinjski-mostar': 'mos',
    'celtic': 'gla', 'st-pauli': 'ham', 'atalanta': 'bgo', 'raja-casablanca': 'cas', 'wydad-casablanca': 'cas',
    'al-ahly': 'cai', 'maccabi-haifa': 'hfa', 'hapoel-petah-tikva': 'ptk',
}
YELLOW_LIMIT = 0.04  # share of pixels; above it the piece is failed automatically


def parse(stem):
    """Mirror of parseLifeStem (lib/life/flowArtSpec.ts)."""
    import re
    if not re.match(r'^life-[a-z0-9-]{2,70}-fl\d$', stem):
        return None
    body = re.sub(r'-fl\d$', '', stem[len('life-'):])
    use, *rest = body.split('-')
    if use == 'facade' and len(rest) == 2 and rest[0] in TOWNS:
        return {'kind': use, 'town': rest[0], 'key': rest[1]}
    if use in ('skyline', 'aerial') and len(rest) == 1 and rest[0] in TOWNS:
        return {'kind': use, 'town': rest[0]}
    if use == 'stadium' and len(rest) >= 2:
        key, club = rest[-1], '-'.join(rest[:-1])
        if club in CLUB_TOWN:
            return {'kind': use, 'club': club, 'town': CLUB_TOWN[club], 'key': key}
    if use == 'story' and rest:
        return {'kind': use, 'key': '-'.join(rest)}
    if use == 'cast' and len(rest) == 2 and rest[0] in PEOPLE and rest[1] in CAST:
        return {'kind': use, 'people': rest[0], 'key': rest[1]}
    return None


# ---------- storage ----------
def _req(url, key, body=None):
    h = {'Authorization': f'Bearer {key}', 'apikey': key}
    if body is not None:
        h['Content-Type'] = 'application/json'
        body = json.dumps(body).encode()
    return urllib.request.urlopen(urllib.request.Request(url, data=body, headers=h, method='POST' if body else 'GET'), timeout=120)


def list_bucket(url, key):
    out, offset = [], 0
    while True:
        rows = json.load(_req(f'{url}/storage/v1/object/list/{BUCKET}', key,
                              {'prefix': PREFIX, 'limit': 100, 'offset': offset, 'sortBy': {'column': 'name', 'order': 'asc'}}))
        for r in rows:
            n = r.get('name') or ''
            if r.get('id') and n.endswith('.png') and '/' not in n:
                m = r.get('metadata') or {}
                out.append({'stem': n[:-4], 'size': m.get('size'), 'etag': (m.get('eTag') or '').strip('"'), 'updated': r.get('updated_at')})
        if len(rows) < 100:
            return out
        offset += 100


# ---------- image work ----------
def hue_yellow_share(rgb):
    a = rgb.astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn
    sat = np.where(mx > 0, d / np.maximum(mx, 1), 0)
    val = mx / 255
    dd = np.maximum(d, 1e-6)
    hue = np.where(mx == r, 60 * (((g - b) / dd + 6) % 6), np.where(mx == g, 60 * ((b - r) / dd + 2), 60 * ((r - g) / dd + 4)))
    y = (d > 0) & (sat >= 0.35) & (val >= 0.35) & (hue >= 38) & (hue <= 70)
    return float(y.mean())


def families(rgb):
    """Share of clearly coloured pixels per colour family, the same families as rush-render/colour.ts (rival policy)."""
    a = rgb.astype(np.float32) / 255
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    dd = np.maximum(d, 1e-6)
    h = np.where(mx == r, 60 * (((g - b) / dd) % 6), np.where(mx == g, 60 * ((b - r) / dd + 2), 60 * ((r - g) / dd + 4))) % 360
    on = (s >= 0.4) & (mx >= 0.3)
    fam = {'red': (h <= 18) | (h >= 342), 'yellow': (h >= 38) & (h <= 70), 'green': (h >= 90) & (h <= 170), 'blue': (h >= 190) & (h <= 260)}
    return {k: round(float((on & v).mean()), 4) for k, v in fam.items()}


WORDS = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10}


def library_floors(path='scripts/life/flow/life-library.json'):
    """Storeys per facade stem, read from its prompt ('a three-storey ...'): the game sizes the picture from it (~3 m a floor)."""
    import re
    try:
        lib = json.load(open(path))
    except Exception:
        return {}
    out = {}
    for p in lib.get('pieces', []):
        m = re.search(r'\b(' + '|'.join(WORDS) + r')-storey', p.get('prompt', ''))
        if p.get('use') == 'facade' and m:
            out[p['stem']] = WORDS[m.group(1)]
    return out


def fit_width(im, w):
    if im.width <= w:
        return im.copy()
    return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)


def webp(im, path, q=80):
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=q, method=6)
    data = buf.getvalue()
    with open(path, 'wb') as f:
        f.write(data)
    return {'w': im.width, 'h': im.height, 'bytes': len(data), 'sha': hashlib.sha256(data).hexdigest()[:16]}


def material_maps(im):
    """Normal, roughness and emissive maps derived from a facade picture (square, MAP_SIZE)."""
    small = im.resize((MAP_SIZE, MAP_SIZE), Image.LANCZOS)
    a = np.asarray(small, dtype=np.float32) / 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    # normal: blurred luminance as height, Sobel, mild strength
    h = np.asarray(Image.fromarray((lum * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), dtype=np.float32) / 255
    gx = np.zeros_like(h); gy = np.zeros_like(h)
    gx[:, 1:-1] = h[:, 2:] - h[:, :-2]
    gy[1:-1, :] = h[2:, :] - h[:-2, :]
    k = 2.2
    nx, ny, nz = -gx * k, gy * k, np.ones_like(h)
    n = np.sqrt(nx * nx + ny * ny + nz * nz)
    nrm = np.stack([nx / n, ny / n, nz / n], -1) * 0.5 + 0.5
    # emissive: bright, warm pixels (the lit windows and shop fronts), softened
    warm = np.clip((r - b) * 4, 0, 1)
    bright = np.clip((lum - 0.42) / 0.28, 0, 1)
    mask = np.clip(bright * (0.35 + 0.65 * warm), 0, 1) ** 1.4
    mask = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)), dtype=np.float32) / 255
    emi = a * mask[..., None]
    # roughness: stone/plaster ~0.88; glass (cool, low-saturation, darker panes) and lit panes smoother;
    # the wet lowest tenth (pavement, plinth) smoother still
    mx, mn = a.max(-1), a.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-3), 0)
    cool = np.clip((b - r) * 5, 0, 1)
    glass = np.clip(cool * (1 - sat) * 1.6 + (lum < 0.18) * 0.35, 0, 1)
    ys = np.linspace(0, 1, MAP_SIZE)[:, None] * np.ones((1, MAP_SIZE))
    wet = np.clip((ys - 0.88) / 0.1, 0, 1)
    rough = np.clip(0.9 - 0.5 * glass - 0.45 * mask - 0.35 * wet, 0.12, 1)
    to8 = lambda x: Image.fromarray(np.clip(x * 255 + 0.5, 0, 255).astype(np.uint8))
    return to8(nrm), to8(rough).convert('RGB'), to8(emi), float(mask.mean())


def bake_one(stem, meta, png, out):
    im = Image.open(io.BytesIO(png)).convert('RGB')
    files = {}
    if meta['kind'] == 'facade':
        side = min(im.width, im.height)
        sq = im.crop(((im.width - side) // 2, (im.height - side) // 2, (im.width - side) // 2 + side, (im.height - side) // 2 + side))
        for s in SIZES['facade']:
            files[str(s)] = webp(sq.resize((s, s), Image.LANCZOS) if side > s else sq.copy(), os.path.join(out, f'{stem}-{s}.webp'))
        n, r, e, glow = material_maps(sq)
        files[f'n-{MAP_SIZE}'] = webp(n, os.path.join(out, f'{stem}-n-{MAP_SIZE}.webp'), 88)
        files[f'r-{MAP_SIZE}'] = webp(r, os.path.join(out, f'{stem}-r-{MAP_SIZE}.webp'), 70)
        files[f'e-{MAP_SIZE}'] = webp(e, os.path.join(out, f'{stem}-e-{MAP_SIZE}.webp'), 75)
        extra = {'glow': round(glow, 4)}
    else:
        for s in SIZES[meta['kind']]:
            files[str(s)] = webp(fit_width(im, s), os.path.join(out, f'{stem}-{s}.webp'))
        extra = {}
    sm = np.asarray(im.resize((256, round(256 * im.height / im.width))), dtype=np.uint8)
    avg = sm.reshape(-1, 3).mean(0)
    return {**meta, 'stem': stem, 'src': {'w': im.width, 'h': im.height}, 'files': files,
            'yellow': round(hue_yellow_share(sm), 4), 'families': families(sm), 'avg': '#%02x%02x%02x' % tuple(int(x) for x in avg), **extra}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src')
    ap.add_argument('--out', default='public/life/flow')
    ap.add_argument('--force', action='store_true')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    mpath = os.path.join(a.out, 'manifest.json')
    man = json.load(open(mpath)) if os.path.exists(mpath) else {'version': 1, 'pieces': {}}
    pieces = man.setdefault('pieces', {})

    if a.src:
        listing = [{'stem': f[:-4], 'size': os.path.getsize(os.path.join(a.src, f)), 'etag': '', 'updated': None}
                   for f in sorted(os.listdir(a.src)) if f.endswith('.png')]
        fetch = lambda s: open(os.path.join(a.src, s + '.png'), 'rb').read()
    else:
        url, key = os.environ.get('SUPABASE_URL', '').rstrip('/'), os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
        if not url or not key:
            print('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing'); return 1
        listing = list_bucket(url, key)
        fetch = lambda s: _req(f'{url}/storage/v1/object/authenticated/{BUCKET}/{PREFIX}/{s}.png', key).read()

    print(f'{len(listing)} pictures in {PREFIX}')
    floors = library_floors()
    changed = 0
    for stem, rec in pieces.items():  # facts from the order itself, refreshed every run
        if stem in floors and rec.get('floors') != floors[stem]:
            rec['floors'] = floors[stem]; changed += 1
    for row in listing:
        stem, meta = row['stem'], parse(row['stem'])
        if not meta:
            print('skip (not a LIFE stem):', stem); continue
        old = pieces.get(stem)
        have = old and all(os.path.exists(os.path.join(a.out, f'{stem}-{k}.webp')) for k in old.get('files', {}))
        if have and not a.force and old.get('from', {}).get('size') == row['size'] and old.get('from', {}).get('etag') == row['etag']:
            continue
        try:
            png = fetch(stem)
        except Exception as e:  # fail soft per piece
            print('download failed:', stem, e); continue
        rec = bake_one(stem, meta, png, a.out)
        if stem in floors:
            rec['floors'] = floors[stem]
        rec['from'] = {'size': row['size'], 'etag': row['etag'], 'updated': row['updated']}
        if old and 'use' in old and not str(old.get('note', '')).startswith('auto'):
            rec['use'], rec['note'] = old['use'], old.get('note', '')
        elif rec['yellow'] > YELLOW_LIMIT:
            rec['use'], rec['note'] = False, f"auto: yellow {rec['yellow']:.1%} of pixels (rule 8)"
        else:
            rec['use'], rec['note'] = True, 'auto: baked, not yet reviewed'
        pieces[stem] = rec
        changed += 1
        print('baked', stem, {k: v['bytes'] for k, v in rec['files'].items()})
    if changed:
        man['baked'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        man['pieces'] = dict(sorted(pieces.items()))
        with open(mpath, 'w') as f:
            json.dump(man, f, indent=1, sort_keys=False)
            f.write('\n')
    print(f'{changed} baked, {len(pieces)} in manifest')
    return 0


if __name__ == '__main__':
    sys.exit(main())
