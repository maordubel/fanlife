"""
LIFE · TOWN — the designer's graffiti sheets for Athens, cut and placed per club.

Three sheets (owner, 22.10.2026): a CITY sheet that belongs to every Athens club, and one sheet
each for AEK and Panathinaikos. The white paper becomes alpha, every piece is found as a connected
blob and saved alone (`<sheet>-<i>.webp`); `rects.js` lists them.

Which piece goes on which club's walls is decided HERE, once, from the clubs' approved
rival-colour policies (`club-packs/<id>/identity.json`): a city piece that carries a banned
colour (Olympiacos bans green, Panathinaikos bans red) is never offered to that club. A club
never sees another club's own sheet.

    python3 -I scripts/life/cut-graffiti.py <street> <tags> <athens> <aek> <pao> <olympiacos> <zrinjski>
    python3 -I scripts/life/cut-graffiti.py --assign     # re-decide who carries what from the pieces on disk

Every club the portal knows gets a list, not only the clubs with a pack: a club with no LIFE file still has a
street (Maccabi Haifa, PAOK), and its walls carry the street and tag sheets until it has a sheet of its own.
"""
import colorsys, json, os, re, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'public', 'life', 'town', 'tex', 'graffiti')
JOIN = {'panathinaikos', 'zrinjski-mostar'}
# sheets drawn tight together: a smaller bridge so two pieces stay two
GAP = {'olympiacos': 2, 'street': 2}
GREECE = ['aek-athens', 'panathinaikos', 'olympiacos']
# sheet → who may carry it: 'all' clubs, a city's clubs, or one club
SHEETS = [
    ('street', 'all'), ('tags', 'all'), ('athens', GREECE),
    ('aek-athens', ['aek-athens']), ('panathinaikos', ['panathinaikos']), ('olympiacos', ['olympiacos']),
    ('zrinjski-mostar', ['zrinjski-mostar']),
]
# pieces that stay off every wall, each with its reason (decided by look, 22.10.2026)
HOLD = {
    ('street', 0): 'a protected cartoon character, painted into the pop-art kiss beside it',
    ('street', 5): 'the lettering falls apart when cut: only "IS CRIME" survives',
    ('street', 7): 'a stray splatter, not a piece',
    ('zrinjski-mostar', 2): 'a protected cartoon character',
    ('zrinjski-mostar', 7): 'rifles: no weapons anywhere in LIFE',
    ('zrinjski-mostar', 8): 'the crest\'s ribbon, cut off the crest',
}
# pieces of a shared sheet that belong to one club only
ONLY = {('street', 3): 'st-pauli'}


def clubs_all():
    packs = {d for d in os.listdir(os.path.join(ROOT, 'club-packs')) if os.path.isdir(os.path.join(ROOT, 'club-packs', d))}
    reg = open(os.path.join(ROOT, 'lib', 'master', 'registry.ts'), encoding='utf-8').read()
    return sorted(packs | set(re.findall(r"^\s*c\('([a-z0-9-]+)'", reg, re.M)))


def banned_hues(club):
    """Hue bands (degrees) this club's town never paints: the owner-approved rival colours, ±22°, and for
    Hapoel Tel Aviv the whole yellow-to-amber band (rule 8 has no exception for a wall)."""
    out = [(33.5, 80.0)] if club == 'hapoel-tel-aviv' else []
    p = os.path.join(ROOT, 'club-packs', club, 'identity.json')
    if not os.path.exists(p):
        return out
    pol = json.load(open(p)).get('colorPolicy') or {}
    for h in pol.get('rivalIdentityColors', []):
        r, g, b = (int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
        hue = colorsys.rgb_to_hsv(r, g, b)[0] * 360
        out.append((hue - 22, hue + 22))
    return out


def cut(path, name):
    """Each piece becomes its own file (`<sheet>-<i>.webp`), holding only its own blob, so a
    neighbour's corner never rides along onto a wall."""
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(np.float32) / 255
    white = (a.min(axis=2) > 0.9) & ((a.max(axis=2) - a.min(axis=2)) < 0.08)
    ink = ~white
    H, W = ink.shape
    # pieces: blobs of ink, joined across small gaps (drips, splashes)
    lab, n = ndimage.label(ndimage.binary_dilation(ink, iterations=GAP.get(name, 5)))
    blobs = []
    for i, sl in enumerate(ndimage.find_objects(lab), start=1):
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        if (y1 - y0) * (x1 - x0) >= 0.01 * H * W:
            blobs.append({'ids': {i}, 'b': [x0, y0, x1, y1]})
    # one word painted in two blobs ("GATE" "13") is one piece: same line, a narrow gap. Only on the
    # sheet where it happens — on the city sheet the Parthenon and ATHENA line up the same way and are two
    merged = name in JOIN
    while merged:
        merged = False
        for p in blobs:
            for q in blobs:
                if p is q:
                    continue
                (ax0, ay0, ax1, ay1), (bx0, by0, bx1, by1) = p['b'], q['b']
                ov = min(ay1, by1) - max(ay0, by0)
                gap = max(bx0 - ax1, ax0 - bx1)
                h = max(ay1 - ay0, by1 - by0)
                if ov > 0 and gap < 0.03 * W and abs(ay0 - by0) < 0.08 * h and abs(ay1 - by1) < 0.08 * h:
                    p['ids'] |= q['ids']; p['b'] = [min(ax0, bx0), min(ay0, by0), max(ax1, bx1), max(ay1, by1)]
                    blobs.remove(q); merged = True; break
            if merged:
                break
    # soft alpha from distance to white, so the paper edge does not ring
    dist = np.clip((1 - a.min(axis=2)) / 0.12, 0, 1)
    sat = a.max(axis=2) - a.min(axis=2)
    alpha = np.maximum(dist, np.clip(sat / 0.1, 0, 1))
    rgb = np.asarray(im)
    hsv = np.asarray(im.convert('HSV')).astype(np.float32)
    pieces = []
    for k, p in enumerate(sorted(blobs, key=lambda b: (b['b'][1] // 120, b['b'][0]))):
        x0, y0, x1, y1 = p['b']
        own = np.isin(lab[y0:y1, x0:x1], list(p['ids']))
        al = (alpha[y0:y1, x0:x1] * own * 255).astype(np.uint8)
        Image.fromarray(np.dstack([rgb[y0:y1, x0:x1], al]), 'RGBA').save(os.path.join(OUT, f'{name}-{k}.webp'), 'WEBP', quality=88, method=6)
        sub = hsv[y0:y1, x0:x1]
        m = own & ink[y0:y1, x0:x1] & (sub[..., 1] > 90) & (sub[..., 2] > 60)
        pieces.append({'f': f'{name}-{k}', 'wh': [x1 - x0, y1 - y0], 'hues': sub[..., 0][m] * 360 / 255, 'n': int((own & ink[y0:y1, x0:x1]).sum())})
    return pieces


def carries(piece, band):
    if not len(piece['hues']):
        return False
    lo, hi = band
    h = piece['hues']
    inside = ((h >= lo) & (h <= hi)) | ((h + 360 >= lo) & (h + 360 <= hi)) | ((h - 360 >= lo) & (h - 360 <= hi))
    return inside.sum() / max(1, piece['n']) > 0.01


def on_disk():
    """The pieces already cut, measured again from their own files: the same pixels the cutter measured."""
    sets = {}
    for name, _ in SHEETS:
        k = 0
        while os.path.exists(os.path.join(OUT, f'{name}-{k}.webp')):
            im = Image.open(os.path.join(OUT, f'{name}-{k}.webp')).convert('RGBA')
            a = np.asarray(im)
            ink = a[..., 3] > 128
            hsv = np.asarray(im.convert('RGB').convert('HSV')).astype(np.float32)
            m = ink & (hsv[..., 1] > 90) & (hsv[..., 2] > 60)
            sets.setdefault(name, []).append({'f': f'{name}-{k}', 'wh': [im.width, im.height], 'hues': hsv[..., 0][m] * 360 / 255, 'n': int(ink.sum())})
            k += 1
    return sets


def main(*files):
    os.makedirs(OUT, exist_ok=True)
    sets = on_disk() if files == ('--assign',) else {name: cut(f, name) for (name, _), f in zip(SHEETS, files)}
    clubs = {}
    for club in clubs_all():
        bans = banned_hues(club)
        lst, held = [], []
        for name, who in SHEETS:
            if name not in sets or (who != 'all' and club not in who):
                continue
            for i, p in enumerate(sets[name]):
                if (name, i) in HOLD or ((name, i) in ONLY and ONLY[(name, i)] != club):
                    continue
                if any(carries(p, b) for b in bans):
                    held.append(f'{name}-{i}')
                else:
                    lst.append([name, i])
        clubs[club] = lst
        print(club, len(lst), 'pieces; held for colour:', held)
    for f in os.listdir(OUT):
        if f.endswith('.webp') and not any(f == p['f'] + '.webp' for v in sets.values() for p in v):
            os.remove(os.path.join(OUT, f))
    rects = {k: [[p['f'], *p['wh']] for p in v] for k, v in sets.items()}
    with open(os.path.join(OUT, 'rects.js'), 'w') as f:
        f.write('/* the designer\'s graffiti (owner, 22.10.2026) — cut by scripts/life/cut-graffiti.py.\n'
                '   pieces: [file, width, height] per sheet; clubs: which pieces each club\'s walls may carry, with\n'
                '   pieces that carry the club\'s banned colours, and held pieces, already left out. */\n')
        f.write('window.__GRAFFITI=' + json.dumps({'rects': rects, 'clubs': clubs}, separators=(',', ':')) + ';\n')


if __name__ == '__main__':
    main(*sys.argv[1:])
