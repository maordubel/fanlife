# -*- coding: utf-8 -*-
"""
ארכיון חולצות לכל מועדון — שלב הקידוד (העתק של המבנה של Hapoel TA, `build-archive.py`).

קלט:  תיקייה עם `meta.json` + קבצי JPG שהורדו מ-footballkitarchive.com בדפדפן של אדם
      (ראו docs/fanlife/kit-archive-playbook.md).
פלט:  public/kits/<club>/<slug>.webp  (760×760 שקוף, חתוך מהרקע, ממורכז)
      content/manual/kit-photos-<club>.json  (שורה לכל חולצה: עונה, סוג, יצרן, עיצוב, צבעים, מקור, צהוב)

כללים (כמו ב-Hapoel): הצהוב נמדד על הפענוח של הבייטים השמורים (כלל 61) ונרשם לכל קובץ;
לא מנקים אותו — הוא עובדה על החפץ (כלל 69). עונה לא ברורה נשארת `seasonAmbiguous`.
שימוש: python3 scripts/kits/ingest-club-photos.py <club-slug> <input-dir> <team-page-url> [--model isnet-general-use]
"""
import io, json, os, re, sys, collections
import numpy as np
from PIL import Image
from rembg import remove, new_session

SIZE = 760; PAD = 28

def yellow_mask(rgb):
    r = rgb[..., 0].astype(np.int16); g = rgb[..., 1].astype(np.int16); b = rgb[..., 2].astype(np.int16)
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b); d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1), 0.0); v = mx / 255.0
    h = np.zeros(d.shape, dtype=np.float32); nz = d > 0
    ri = (mx == r) & nz; gi = (mx == g) & nz & ~ri; bi = nz & ~ri & ~gi
    h[ri] = 60 * (((g[ri] - b[ri]) / d[ri] + 6) % 6)
    h[gi] = 60 * ((b[gi] - r[gi]) / d[gi] + 2)
    h[bi] = 60 * ((r[bi] - g[bi]) / d[bi] + 4)
    return (s >= 0.35) & (v >= 0.35) & (h >= 38) & (h <= 70) & nz

def season(raw):
    m = re.match(r'^(\d{2,4})[-/](\d{2,4})$', raw or '')
    if not m: return None
    a, b = m.groups()
    a = int(a) if len(a) == 4 else (1900 + int(a) if int(a) >= 30 else 2000 + int(a))
    return f"{a}/{b[-2:]}"

def palette(im, k=4):
    """Dominant colours of the cloth, measured on the cut-out's opaque pixels (never typed)."""
    a = np.array(im.resize((120, 120), Image.LANCZOS)); px = a[a[..., 3] > 200][:, :3]
    if len(px) < 50: return []
    q = Image.fromarray(px.reshape(1, -1, 3).astype(np.uint8)).quantize(colors=k, method=Image.MEDIANCUT)
    pal = q.getpalette()[:k * 3]; cnt = sorted(q.getcolors(), reverse=True)
    return ['#%02x%02x%02x' % tuple(pal[c[1] * 3:c[1] * 3 + 3]) for c in cnt if c[0] / len(px) > 0.06]

def skin_ratio(im):
    return 0.0  # face detection is not available in the headless OpenCV build; worn photos are listed by hand (--worn)

def variant(t):
    t = (t or '').lower()
    if t.startswith('gk') or 'goalkeeper' in t: return 'gk'
    for k in ('home', 'away', 'third', 'fourth', 'fifth'):
        if k in t: return k
    return 'special'

def cut(im, session):
    """Returns (RGBA crop, solidity). Solidity < 0.80 means a white shirt on a light ground lost
    pieces — it is kept, tagged `cutQuality: review`, never silently passed (rule 11)."""
    import cv2
    out = remove(im, session=session, alpha_matting=False, post_process_mask=True)
    a = np.array(out); al = a[..., 3]
    n, lab, st, _ = cv2.connectedComponentsWithStats((al > 128).astype(np.uint8), 8)
    if n > 1:
        k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); al = np.where(lab == k, al, 0).astype(np.uint8)
    m = (al > 128).astype(np.uint8)
    # small interior holes are cloth the model mistook for ground (white on white): fill those only —
    # a big enclosed region is real background (a sleeve gap) and stays transparent
    inv = (1 - m).astype(np.uint8)
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(inv, 4)
    H, W = m.shape; area = int(m.sum()); filled = m.copy()
    for k in range(1, n2):
        x, y, w_, h_, ar = st2[k]
        if x > 0 and y > 0 and x + w_ < W and y + h_ < H and ar < 0.06 * area: filled[lab2 == k] = 1
    al = np.maximum(al, (filled * 255).astype(np.uint8)); a[..., :3] = np.array(im.convert('RGB')); a[..., 3] = al
    cnts, _ = cv2.findContours(filled, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    sol = 1.0
    if cnts:
        c = max(cnts, key=cv2.contourArea); ha = cv2.contourArea(cv2.convexHull(c))
        sol = float(cv2.contourArea(c) / ha) if ha else 1.0
    out = Image.fromarray(a); bb = out.getbbox()
    return (out.crop(bb) if bb else out), round(sol, 3)

def place(cut_im):
    w, h = cut_im.size; s = (SIZE - 2 * PAD) / max(w, h)
    im = cut_im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    canvas.paste(im, ((SIZE - im.width) // 2, (SIZE - im.height) // 2), im)
    return canvas

def encode(im, path):
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=88, method=6); data = buf.getvalue()
    a = np.array(Image.open(io.BytesIO(data)).convert('RGBA')); vis = a[..., 3] > 128
    y = yellow_mask(a[..., :3]) & vis; open(path, 'wb').write(data)
    return {'bytes': len(data), 'yellowPx': int(y.sum()), 'yellowPct': round(float(y.sum()) / max(int(vis.sum()), 1) * 100, 3)}

WORN = set((sys.argv[sys.argv.index('--worn') + 1].split(',')) if '--worn' in sys.argv else [])

def main():
    club, indir, page = sys.argv[1:4]
    model = sys.argv[sys.argv.index('--model') + 1] if '--model' in sys.argv else 'isnet-general-use'
    sess = new_session(model)
    meta = json.load(open(os.path.join(indir, 'meta.json'), encoding='utf-8'))
    out_dir = f'public/kits/{club}'; os.makedirs(out_dir, exist_ok=True)
    seen = collections.Counter(); recs = []
    for m in sorted(meta, key=lambda x: x['file']):
        sl = season(m.get('Season')); v = variant(m.get('Type'))
        idx = re.search(r'(\d+)$', m.get('Type') or ''); idx = int(idx.group(1)) if (idx and v == 'gk') else None
        kid = re.search(r'-(\d+)\.jpg$', m['file']).group(1)
        base = f"fka-{(sl or 'x').replace('/', '-')}-{v}" + (f'-{idx}' if idx else '')
        seen[base] += 1; slug = base if seen[base] == 1 else f'{base}-{kid}'
        im = Image.open(os.path.join(indir, m['file'])).convert('RGB')
        cutim, sol = cut(im, sess); placed = place(cutim); sk = skin_ratio(im); pal = palette(placed)
        r = encode(placed, os.path.join(out_dir, slug + '.webp'))
        recs.append({'slug': slug, 'file': f'{club}/{slug}.webp', 'source': 'fka', 'sourceFile': m['file'],
            'sourcePage': 'https://www.footballkitarchive.com' + m['url'], 'seasonLabel': sl, 'seasonAmbiguous': sl is None,
            'variant': v, 'typeRaw': m.get('Type'), 'design': m.get('Design'), 'colors': m.get('Colors'),
            'manufacturer': m.get('Brand'), 'sponsor': m.get('Sponsor'), 'competitions': m.get('Competitions'),
            'photoCredit': m.get('Credits'), 'solidity': sol, 'cutQuality': 'review' if sol < 0.80 else 'ok', 'skinRatio': round(sk, 3),
            'photoKind': 'worn' if slug in WORN else 'flat', 'palette': pal,
            'parts': {'base': [c.strip() for c in (m.get('Colors') or '').split('/') if c.strip()] or None, 'pattern': m.get('Design'),
                      'sleeves': None, 'collar': None, 'crest': 'club-crest', 'maker': m.get('Brand'), 'sponsor': m.get('Sponsor'), 'nameset': None},
            'partsNote': 'base/pattern/maker are from the source page; palette is measured on the cut-out; sleeves/collar/sponsor/nameset are not in the source and stay null until someone reads the shirt',
            'usableInApp': False, 'sport': 'football', 'confidence': 2, **r})
        print(slug, r['yellowPct'], flush=True)
    for x in recs: x['usableInApp'] = (x['cutQuality'] == 'ok' and x['photoKind'] == 'flat')
    doc = {'club': club, 'sport': 'football', 'canvas': {'size': SIZE, 'format': 'webp', 'transparent': True},
           'sources': [{'key': 'fka', 'title': 'footballkitarchive.com — ' + (meta[0].get('Team') or club) + ' Kit History',
                        'url': page, 'readOn': '2026-10-08', 'kits': len(recs)}], 'records': recs}
    json.dump(doc, open(f'content/manual/kit-photos-{club}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('records', len(recs), 'bytes', sum(r['bytes'] for r in recs))
main()
