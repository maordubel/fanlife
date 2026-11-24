#!/usr/bin/env python3
"""
THE ALBUM — sticker production (18.11.2026). Runs in GitHub Actions (album-stickers.yml), where Wikidata and Commons answer.

For every sticker of the curated edition (content/generated/album-edition-1.json):
  1. the person's Wikidata item: the one the People Registry proved (a `same` link's evidence), else a search by name that
     must return ONE footballer item listing this club as a team (P54) — never a guess (rule 7);
  2. the item's image (P18) on Wikimedia Commons, accepted only under a free licence (CC0, public domain, CC BY, CC BY-SA, FAL);
  3. of all his free pictures (P18 + his Commons category) the one from his time at the club wins, then a clear frontal
     face; it is cut from its background with a thin even line, scaled so the eyes and the head sit at the same place on
     every sticker, and set into THE ALBUM frame: flat club colour, paper grain, faint dots, the FAN LIFE colour roundel,
     an ivory name plate, the code (AEK-05), club and years. A picture from outside his club years takes the archive frame
     (ink duotone, "Archive photo"). Credits and licence live on the back (the album's detail sheet), readable;
  4. written as public/album/stickers/<club>/<slot>.webp (480×660) and recorded in content/generated/album-stickers.json with
     its source, author and licence. A man with no free photo keeps the frame's silhouette until one is found — nothing is
     invented and nothing is copied from a card publisher.

Usage: python3 scripts/album/stickers.py [--club <id>] [--limit N] [--redo]
"""
import argparse, base64, io, json, math, os, re, sys, time, urllib.parse, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sources as SRC
import portrait as POR
import paint as PNT
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
UA = {'User-Agent': 'FANLIFE-album/1.0 (https://fanlife.dubelteam.com; fanlife@dubelteam.com)'}
FREE = re.compile(r'^(cc0|public domain|pd|cc by(-sa)? [0-9.]+( [a-z]{2})?|cc by(-sa)?|fal|free art license)', re.I)
OUT_DIR = ROOT / 'public/album/stickers'
LEDGER = ROOT / 'content/generated/album-stickers.json'
FACES_DIR = ROOT / 'content/generated/album-faces'  # painted portraits for men with no free photo (faces.py)
DRESSED_DIR = ROOT / 'content/generated/album-dressed'  # the painted man in his club's real shirt, worn, not laid over (dress.py)


def get_json(url, tries=5):
    for t in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return json.load(r)
        except Exception:
            time.sleep(1.5 * (t + 1))
    return None


def get_bytes(url, tries=4):
    for t in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except Exception:
            time.sleep(2 * (t + 1))
    return None


WD = 'https://www.wikidata.org/w/api.php?format=json&'
CM = 'https://commons.wikimedia.org/w/api.php?format=json&'


def claims(qids):
    j = get_json(WD + 'action=wbgetentities&props=claims&ids=' + '|'.join(qids))
    return (j or {}).get('entities', {})


def find_qid(name, club_q, year=None):
    """ONE footballer item named so that lists this club — else, ONE footballer item of that name born 15 to 45 years
    before his first season here — else nothing (rule 7: never a guess between two men)"""
    ids = []
    for lang in ('en', 'el', 'he', 'ar', 'hr', 'de', 'it'):
        s = get_json(WD + f'action=wbsearchentities&language={lang}&type=item&limit=8&search=' + urllib.parse.quote(name))
        ids += [x['id'] for x in (s or {}).get('search', [])]
        if len(ids) >= 8:
            break
    ids = list(dict.fromkeys(ids))[:20]
    if not ids:
        return None
    club_hits, born_hits = [], []
    for q, e in claims(ids).items():
        c = e.get('claims', {})
        occ = [x['mainsnak'].get('datavalue', {}).get('value', {}).get('id') for x in c.get('P106', [])]
        if 'Q937857' not in occ:
            continue
        teams = [x['mainsnak'].get('datavalue', {}).get('value', {}).get('id') for x in c.get('P54', [])]
        if club_q in teams:
            club_hits.append(q)
            continue
        born = [x['mainsnak'].get('datavalue', {}).get('value', {}).get('time', '') for x in c.get('P569', [])]
        by = next((int(b[1:5]) for b in born if re.match(r'^[+-]\d{4}', b)), None)
        if year and by and 15 <= year - by <= 45:
            born_hits.append(q)
    if len(club_hits) == 1:
        return club_hits[0]
    if not club_hits and len(born_hits) == 1:
        return born_hits[0]
    return None


def image_of(qid):
    e = claims([qid]).get(qid, {})
    p18 = e.get('claims', {}).get('P18', [])
    return p18[0]['mainsnak']['datavalue']['value'] if p18 and 'datavalue' in p18[0]['mainsnak'] else None


def commons_file(title):
    j = get_json(CM + 'action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=900&titles=' + urllib.parse.quote('File:' + title))
    for p in (j or {}).get('query', {}).get('pages', {}).values():
        ii = (p.get('imageinfo') or [None])[0]
        if not ii:
            return None
        m = ii.get('extmetadata', {})
        lic = re.sub(r'<[^>]+>', '', m.get('LicenseShortName', {}).get('value', '')).strip()
        artist = re.sub(r'<[^>]+>', '', m.get('Artist', {}).get('value', '')).strip()[:60]
        return {'url': ii.get('thumburl') or ii['url'], 'page': ii.get('descriptionurl'), 'license': lic, 'artist': artist or 'unknown'}
    return None


# ------------------------------------------------------------------ choosing the photo (owner, 18.11.2026)
# Priority: a photo from his time at the club, in the club's kit, face clear, cut chest-up. Without one: another free
# archive photo, set in the archive frame (ink duotone, "Archive photo") so it never pretends to be a club-era picture.
def category_files(qid):
    e = claims([qid]).get(qid, {})
    p373 = e.get('claims', {}).get('P373', [])
    cat = p373[0]['mainsnak'].get('datavalue', {}).get('value') if p373 else None
    if not cat:
        return []
    j = get_json(CM + 'action=query&list=categorymembers&cmtype=file&cmlimit=60&cmtitle=' + urllib.parse.quote('Category:' + cat))
    return [m['title'][5:] for m in (j or {}).get('query', {}).get('categorymembers', []) if re.search(r'\.(jpe?g|png|tiff?)$', m['title'], re.I)]


def file_meta(title):
    j = get_json(CM + 'action=query&prop=imageinfo|categories&cllimit=50&iiprop=url|extmetadata|size&iiurlwidth=900&titles=' + urllib.parse.quote('File:' + title))
    for p in (j or {}).get('query', {}).get('pages', {}).values():
        ii = (p.get('imageinfo') or [None])[0]
        if not ii:
            return None
        m = ii.get('extmetadata', {})
        txt = lambda k: re.sub(r'<[^>]+>', '', m.get(k, {}).get('value', '')).strip()
        return {'title': title, 'url': ii.get('thumburl') or ii['url'], 'page': ii.get('descriptionurl'), 'license': txt('LicenseShortName'),
                'licenseUrl': txt('LicenseUrl'), 'artist': txt('Artist')[:80] or 'unknown', 'date': txt('DateTimeOriginal'),
                'own': (title + ' ' + txt('ImageDescription')).lower(),
                'text': ' '.join([title, txt('ImageDescription'), txt('Categories')] + [c['title'] for c in p.get('categories', [])]).lower()}
    return None


def era_score(meta, club_name, y0, y1):
    """how surely this picture is from his time at the club: its words name the club, its date sits in his years"""
    words = [w for w in re.split(r'[^a-z0-9]+', club_name.lower()) if len(w) > 2 and w not in ('the', 'club')]
    named = any(w in meta['text'] for w in words)
    years = [int(y) for y in re.findall(r'(?<!\d)(19[0-9]{2}|20[0-9]{2})(?!\d)', meta['date'] + ' ' + meta['title'])]
    dated = bool(y0 and y1 and any(y0 - 1 <= y <= y1 + 1 for y in years))
    # the club frame only for a picture that names the club AND is dated inside his years: an undated portrait from a
    # club category is often the man years later (a suit, a reunion), so it takes the archive frame instead
    return (4 if named else 0) + (3 if dated else 0), named and dated


_CASC = None
_EYES = None


def face_of(im):
    """the largest frontal face (x, y, w, h) in a PIL image, or None"""
    global _CASC, _EYES
    import cv2
    import numpy as np
    if _CASC is None:
        _CASC = cv2.CascadeClassifier(os.environ.get('ALBUM_FACE_CASCADE') or cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')  # OpenCV 4 ships it (the workflow pins <5)
    if _EYES is None:
        d = os.path.dirname(os.environ.get('ALBUM_FACE_CASCADE') or cv2.data.haarcascades + 'x')
        _EYES = cv2.CascadeClassifier(os.path.join(d, 'haarcascade_eye.xml'))
    g = cv2.cvtColor(np.array(im.convert('RGB')), cv2.COLOR_RGB2GRAY)
    fs = _CASC.detectMultiScale(g, 1.06, 9, minSize=(max(28, im.width // 12),) * 2)
    for x, y, w, h in sorted(fs, key=lambda f: -f[2] * f[3]):
        top = g[y:y + h * 6 // 10, x:x + w]
        if len(_EYES.detectMultiScale(top, 1.06, 3, minSize=(max(8, w // 10),) * 2)):
            return int(x), int(y), int(w), int(h)
    return None


def faces_in(im):
    import cv2
    import numpy as np
    face_of(im)  # loads the cascade
    g = cv2.cvtColor(np.array(im.convert('RGB')), cv2.COLOR_RGB2GRAY)
    return len(_CASC.detectMultiScale(g, 1.06, 9, minSize=(max(24, im.width // 16),) * 2))


def choose_photo(qid, name, club_name, y0, y1, names=None, club_words=None, blocked=()):
    """every free picture of the man, best first; returns (meta, raw, frame) or None.
    Sources: P18, his Commons category, the lead picture of each of his Wikipedia articles (Commons files only),
    Commons full-text search on his full name, Openverse (CC images, Flickr among them) — see sources.py"""
    from PIL import Image
    first = image_of(qid) if qid else None
    titles = []
    if qid:
        titles += ([first] if first else []) + category_files(qid) + [f for _, f in SRC.wiki_lead_images(get_json, qid)]
    trusted = set(titles)  # his own Wikidata picture, his own Commons category, the lead picture of his own article
    names = names or [name]
    for n in names[:6]:
        titles += SRC.commons_search(get_json, n)
    # a surname with the club: archive match pictures (Anefo, Dan Hadani, GPO...) — kept only with ONE face in frame
    crowd = set()
    for t in SRC.surname_club_search(get_json, name, club_words or [club_name]):
        if t not in titles:
            titles.append(t); crowd.add(t)
    titles = list(dict.fromkeys(t for t in titles if t))[:70]
    cands = []
    for t in titles:
        m = file_meta(t)
        if not m or not FREE.match(m['license'] or ''):
            continue
        if t in blocked:
            continue  # a reviewer found another man in this picture (content/manual/album-photo-block.json)
        if t not in trusted and not SRC.football_context(m['text'], club_words or [club_name]):
            continue  # found by a name search: a namesake (an actor, a politician) unless the picture is about football or his club
        if t not in trusted and t not in crowd and not any(SRC.names_in(m['own'], n) for n in names):
            continue  # the file's own title and caption must carry his whole name: a search hit on a page that mentions him is not his picture
        sc, club_era = era_score(m, club_name, y0, y1)
        cands.append((sc + (1 if t == first else 0) - (1 if t in crowd else 0), club_era, dict(m, crowd=t in crowd)))
    for m in SRC.openverse(get_json, name, club_name):
        if m.get('title') in blocked or not any(SRC.names_in(m.get('title') or '', n) for n in names):
            continue  # an Openverse picture must name him in its own title
        if FREE.match(m['license']) and SRC.football_context(m['text'], club_words or [club_name]):
            sc, club_era = era_score(m, club_name, y0, y1)
            cands.append((sc - 1, club_era, m))
    cands.sort(key=lambda c: -c[0])
    best = None
    for sc, club_era, m in cands[:10]:
        raw = get_bytes(m['url'])
        if not raw:
            continue
        try:
            im = Image.open(io.BytesIO(raw))
        except Exception:
            continue
        f = face_of(im)
        if not f or f[2] < im.width * (0.05 if m.get('crowd') else 0.08):
            continue  # head down, turned away or too small: not a sticker portrait
        if m.get('crowd') and faces_in(im) != 1:
            continue  # a match or team picture: only when he is the one face in it
        score = sc + 3 + min(2, f[2] / im.width * 6)
        if best is None or score > best[0]:
            best = (score, m, raw, 'club' if club_era else 'archive')
    return best[1:] if best else None


# ------------------------------------------------------------------ the frame (calm: club colour, paper, faint dots)
W, H = 240, 330
WIN = (16, 16, 208, 206)           # x, y, w, h of the photo window
EYE_Y, FACE_H = 0.40, 0.30          # eyes at 40% of the window, the face a third of its height: every sticker alike
FACES = [('Anton', 'anton-latin-400-normal', 400, False), ('Anton', 'anton-latin-ext-400-normal', 400, True),
         ('Archivo', 'archivo-latin-800-normal', 800, False), ('Archivo', 'archivo-latin-ext-800-normal', 800, True),
         ('Archivo', 'archivo-latin-600-normal', 600, False), ('Archivo', 'archivo-latin-ext-600-normal', 600, True)]
DASH = '–'


def font_css():
    f = ROOT / 'public/fonts'
    out = []
    for fam, file, w, ext in FACES:
        b = base64.b64encode((f / f'{file}.woff2').read_bytes()).decode()
        rng = 'U+0100-024F,U+1E00-1EFF' if ext else 'U+0000-00FF,U+2010-2027'
        out.append(f"@font-face{{font-family:'{fam}';font-weight:{w};src:url(data:font/woff2;base64,{b}) format('woff2');unicode-range:{rng}}}")
    return '\n'.join(out)


def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def years_of(st):
    a, b = st.get('from'), st.get('to')
    return f'{a}{DASH}{b}' if a and b and a != b else str(a or b or '')


def fit(text, width, size, ratio, floor):
    """a font size that keeps the line inside `width`; below `floor`, squeeze the letters instead"""
    need = max(1, len(text)) * ratio * size
    fs = size if need <= width else max(floor, width / (max(1, len(text)) * ratio))
    squeeze = len(text) * ratio * fs > width
    return fs, (f'textLength="{width:.0f}" lengthAdjust="spacingAndGlyphs"' if squeeze else '')


METAL = {'gold': ('#9C5A22', '#E39A57', '#F7D9BC'), 'silver': ('#6E7378', '#BFC4C8', '#EEF0F2')}


def kit_image(path):
    """the club's measured shirt drawing (rule club-shirt-only) as an embeddable image + its viewBox"""
    f = ROOT / 'public' / path.lstrip('/')
    if not path or not f.exists():
        return None
    src = f.read_text()
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', src).group(1).split()]
    return base64.b64encode(src.encode()).decode(), vb


def drawn_figure(st, x, y, w, h, traits=None, head_on=True, chin_at=None):
    """no free photo: a figure in the weekly's manner wearing the club's measured shirt of his years — the shirt is
    documented; the face is drawn from traits measured on his picture (skin, hair, beard — sources.traits), or the
    era's usual look when no picture of him exists at all (the ledger marks it unmeasured)"""
    ey = y + h * EYE_Y
    k = kit_image(st.get('kit'))
    sw = w * 1.04
    sc = sw / 336
    sx = x + w / 2 - 170 * sc
    t = traits or SRC.era_default(st.get('from'))
    sc_ = 27
    head = POR.portrait_svg(x + w / 2, ey, sc_, t, t.get('shape'), uid='p%d' % st['slot'])
    chin = chin_at if chin_at is not None else ey + max(y_ for _, y_ in (t.get('shape') or POR.MEAN)[6:11]) * sc_
    sy = chin + sc_ * 1.0 - (56 - 20) * sc
    if k:
        b64, (vx, vy, vw, vh) = k
        shirt = (f'<svg x="{sx:.1f}" y="{sy:.1f}" width="{sw:.1f}" height="{298*sc:.1f}" viewBox="0 20 336 298" overflow="visible">'
                 f'<image href="data:image/svg+xml;base64,{b64}" x="{vx}" y="{vy}" width="{vw}" height="{vh}"/></svg>')
    else:
        shirt = (f'<path d="M{x-4} {y+h+4} C{x} {ey+70:.0f} {x+30} {ey+56:.0f} {x+w/2-24:.0f} {ey+50:.0f} L{x+w/2+24:.0f} {ey+50:.0f} '
                 f'C{x+w-30} {ey+56:.0f} {x+w} {ey+70:.0f} {x+w+4} {y+h+4} Z" fill="#FBF6EA" stroke="#15130F" stroke-width="3"/>')
    return f'<g style="filter:drop-shadow(5px 4px 0 rgb(0 0 0 / .28))">{head if head_on else ""}{shirt}</g>'


FIG_PAD, FIG_SCALE = 12, 4


def painted_figure(pg, st, traits):
    """the drawn figure rendered alone (window + a margin, 4x), then painted like the photographs (paint.py)"""
    from PIL import Image
    x, y, w, h = WIN
    g = drawn_figure(st, x, y, w, h, traits).replace('style="filter:drop-shadow(5px 4px 0 rgb(0 0 0 / .28))"', '')
    W_ = H_ = max(w, h) + 2 * FIG_PAD
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W_*FIG_SCALE}" height="{H_*FIG_SCALE}" viewBox="{x + w / 2 - W_ / 2} {y + h / 2 - H_ / 2} {W_} {H_}">{g}</svg>'
    pg.set_viewport_size({'width': W_ * FIG_SCALE, 'height': H_ * FIG_SCALE})
    pg.set_content(f'<html><style>body{{margin:0;background:transparent}} svg{{display:block}}</style><body>{svg}</body></html>')
    pg.wait_for_timeout(120)
    png = pg.locator('body > svg').screenshot(omit_background=True)
    pg.set_viewport_size({'width': 240, 'height': 330})
    im = Image.open(io.BytesIO(png)).convert('RGBA')
    im = PNT.paint(im, bands=10, ink_k=45).resize((W_ * 2, H_ * 2), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'PNG')
    return base64.b64encode(b.getvalue()).decode()


def sticker_svg(st, club, photo_b64, photo_wh, frame, logo_b64, variant='base', traits=None, figure_b64=None, kit_over=False):
    c, on, code = club['primary'], club['on'], club['code']
    x, y, w, h = WIN
    parts = st['name'].split(' ')
    first, last = (' '.join(parts[:-1]), parts[-1]) if len(parts) > 1 else ('', parts[0])
    last = last.upper()
    fs, sq = fit(last, 176, 40, 0.5, 25)
    ffs, fsq = fit(first.upper(), 170, 10.5, 0.8, 7.5)
    archive = frame == 'archive' and bool(photo_b64)
    duo = ' filter="url(#duo)"' if archive else ''
    if photo_b64:
        pw, ph, fx, fy, fw, fh = photo_wh
        eye = fy + fh * 0.42
        sc = (FACE_H * h) / fh
        # the eyes always on the same line; a picture that ends above the window's foot grows (to a third more) until it
        # reaches it, so no man floats and none shrinks — same head, same place, every sticker
        sc = max(sc, min(sc * 1.35, (h * (1 - EYE_Y) + 2) / max(1, ph - eye)))
        dx = x + w / 2 - (fx + fw / 2) * sc
        dy = y + EYE_Y * h - eye * sc
        img = (f'<image href="data:image/png;base64,{photo_b64}" x="{dx:.1f}" y="{dy:.1f}" width="{pw*sc:.1f}" height="{ph*sc:.1f}" filter="url(#drop)"/>'
               f'<image href="data:image/png;base64,{photo_b64}" x="{dx:.1f}" y="{dy:.1f}" width="{pw*sc:.1f}" height="{ph*sc:.1f}"{duo}/>')
        if kit_over:
            # a painted portrait: his club's real shirt of his years laid over, its collar under the painted chin
            img += drawn_figure(st, x, y, w, h, traits, head_on=False, chin_at=dy + (fy + fh * 1.02) * sc)
    elif figure_b64:
        side = max(w, h) + 2 * FIG_PAD  # a square around the window's centre (painted_figure, faces.py)
        img = (f'<image href="data:image/png;base64,{figure_b64}" x="{x + w / 2 - side / 2:.1f}" y="{y + h / 2 - side / 2:.1f}" width="{side}" height="{side}" style="filter:drop-shadow(5px 4px 0 rgb(0 0 0 / .28))"/>')
    else:
        img = drawn_figure(st, x, y, w, h, traits)
    field = '#E9E0CC' if archive else c
    edge = f'url(#m{variant})' if variant != 'base' else '#FBF6EA'
    metal, stamp = '', ''
    if variant != 'base':
        d, m, l = METAL[variant]
        metal = (f'<linearGradient id="m{variant}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{l}"/><stop offset=".35" stop-color="{m}"/>'
                 f'<stop offset=".55" stop-color="{d}"/><stop offset=".75" stop-color="{m}"/><stop offset="1" stop-color="{l}"/></linearGradient>')
        stamp = (f'<g transform="translate({x+30} {y+h-30}) rotate(-12)"><circle r="21" fill="{m}" stroke="{d}" stroke-width="2"/>'
                 f'<circle r="17" fill="none" stroke="{l}" stroke-width="1" stroke-dasharray="2 2"/>'
                 f'<text y="-1" text-anchor="middle" font-family="Anton" font-size="10" letter-spacing=".8" fill="#15130F">{variant.upper()}</text>'
                 f'<text y="9" text-anchor="middle" font-family="Archivo" font-weight="800" font-size="5.6" letter-spacing="1" fill="#15130F">EDITION</text></g>'
                 f'<path d="M{x} {y+h*.18:.0f} L{x+w*.36:.0f} {y} L{x+w*.46:.0f} {y} L{x} {y+h*.34:.0f} Z" fill="#fff" opacity=".10"/>')
    tag = (f'<rect x="{x+w-74}" y="{y+h-20}" width="68" height="14" fill="#15130F"/><text x="{x+w-40}" y="{y+h-10}" text-anchor="middle" font-family="Archivo" '
           f'font-weight="800" font-size="6.5" letter-spacing="1" fill="#FBF6EA">ARCHIVE PHOTO</text>') if archive and photo_b64 else ''
    meta = esc(' · '.join(v for v in [club['name'].upper(), years_of(st)] if v))
    mfs, msq = fit(meta, 132, 8.4, 0.7, 6.2)
    plate_y = y + h + 8
    return f'''<svg viewBox="0 0 {W} {H}" width="{W}" xmlns="http://www.w3.org/2000/svg">
<defs>{metal}
<pattern id="dot" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="2.5" cy="2.5" r=".9" fill="#000" opacity=".07"/></pattern>
<filter id="paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .06 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="duo" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".30 .55 .15 0 0  .28 .52 .14 0 0  .24 .45 .12 0 0  0 0 0 1 0"/><feComponentTransfer><feFuncR type="table" tableValues=".08 .97"/><feFuncG type="table" tableValues=".07 .93"/><feFuncB type="table" tableValues=".06 .85"/></feComponentTransfer></filter>
<clipPath id="win"><rect x="{x}" y="{y}" width="{w}" height="{h}"/></clipPath>
<radialGradient id="lamp" cx=".5" cy="{EYE_Y-.04}" r=".62"><stop offset="0" stop-color="#FFF6E0" stop-opacity=".42"/><stop offset=".55" stop-color="#FFF6E0" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></radialGradient>
<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
<filter id="drop" x="-10%" y="-10%" width="130%" height="130%"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .38 0"/><feOffset dx="5" dy="4"/></filter>
</defs>
<rect width="{W}" height="{H}" rx="10" fill="{edge}"/>
<rect x="7" y="7" width="{W-14}" height="{H-14}" rx="3" fill="{c}"/>
<g clip-path="url(#win)"><rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{field}"/><rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#lamp)"/><rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#floor)"/><rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#dot)"/>{img}{tag}</g>
<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="none" stroke="#15130F" stroke-width="2"/>
<circle cx="{x+w-21}" cy="{y+21}" r="17" fill="#FBF6EA" stroke="#15130F" stroke-width="1.5"/>
<image href="data:image/png;base64,{logo_b64}" x="{x+w-36}" y="{y+6}" width="30" height="30"/>
{stamp}
<rect x="{x}" y="{plate_y}" width="{w}" height="72" fill="#FBF6EA" stroke="#15130F" stroke-width="2"/>
<text x="120" y="{plate_y+14}" text-anchor="middle" font-family="Archivo" font-weight="600" font-size="{ffs:.1f}" letter-spacing="2.4" fill="#4A4136" {fsq}>{esc(first.upper())}</text>
<text x="120" y="{plate_y+27+fs*0.8:.1f}" text-anchor="middle" font-family="Anton" font-size="{fs:.1f}" letter-spacing=".5" fill="#15130F" {sq}>{esc(last)}</text>
<rect x="{x}" y="{H-27}" width="60" height="18" fill="#15130F"/>
<text x="{x+30}" y="{H-13.6}" text-anchor="middle" font-family="Anton" font-size="12.5" letter-spacing="1" fill="#FBF6EA">{code}{DASH}{st['slot']:02d}</text>
<text x="{x+w}" y="{H-13.8}" text-anchor="end" font-family="Archivo" font-weight="800" font-size="{mfs:.1f}" letter-spacing=".6" fill="{on}" {msq}>{meta}</text>
<rect width="{W}" height="{H}" rx="10" fill="#000" filter="url(#paper)"/>
</svg>'''


def cutout(raw, session, frame, paint_it=True):
    """the man cut from his background with a thin even ivory line (no halo), and his face box for the alignment"""
    from PIL import Image, ImageEnhance, ImageFilter
    from rembg import remove
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    s = 900 / max(im.size)
    im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)
    f = face_of(im)
    if not f:
        return None
    out = remove(im, session=session[0]).convert('RGBA')
    a = out.split()[3]
    if len(session) > 1:
        from PIL import ImageChops
        a = ImageChops.multiply(a, remove(im, session=session[1], only_mask=True).convert('L'))
        out.putalpha(a)
    if a.getbbox() is None or sum(a.histogram()[128:]) < 0.06 * a.width * a.height:
        return None
    fx, fy, fw, fh = f
    if sum(a.crop((fx, fy, fx + fw, fy + fh)).histogram()[128:]) < 0.5 * fw * fh:
        return None  # the "face" is not on the person (an elbow, a crowd): no portrait here
    rgb = ImageEnhance.Contrast(out.convert('RGB')).enhance(1.06)
    if frame == 'archive':
        rgb = rgb.convert('L').convert('RGB')
    line = max(3, round(f[2] / 45) * 2 + 1)        # the same line weight relative to the face on every sticker
    rgb.putalpha(a)
    painted = PNT.paint(rgb, mono=frame == 'archive') if paint_it else rgb  # the painted look (owner, 22.11.2026)
    return PNT.contour(painted, line), f


def remove_mask(im, session):
    from rembg import remove
    return remove(im, session=session[0] if isinstance(session, tuple) else session, only_mask=True)


def face_shape(raw):
    """his face's proportions (68 landmarks, normalised and blended with the average face — portrait.py), or None"""
    import cv2
    import numpy as np
    from PIL import Image
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    s = 600 / max(im.size)
    im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))))
    f = face_of(im)
    if not f:
        return None
    lm = POR.landmarks(cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR), f, os.environ['ALBUM_LBF'])
    return POR.normalise(lm) if lm else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--club')
    ap.add_argument('--limit', type=int, default=999)
    ap.add_argument('--redo', action='store_true')
    ap.add_argument('--ids', help='comma-separated club:slot list: press only these stickers (implies --redo for them)')
    a = ap.parse_args()
    from PIL import Image
    from rembg import new_session
    from playwright.sync_api import sync_playwright

    edition = json.loads((ROOT / 'content/generated/album-edition-1.json').read_text())
    links = json.loads((ROOT / 'content/manual/people-links.json').read_text())['links']
    club_q = json.loads((ROOT / 'content/manual/club-wikidata.json').read_text())['clubs']
    clubs = json.loads((ROOT / 'content/generated/album-clubs.json').read_text())
    stint_qid = {}
    for l in links:
        if l['verdict'] == 'same' and l['basis'] == 'wikidata':
            stint_qid[l['a']] = l['evidence']; stint_qid[l['b']] = l['evidence']
    ledger = json.loads(LEDGER.read_text()) if LEDGER.exists() else {'note': '', 'stickers': {}}
    block_file = ROOT / 'content/manual/album-photo-block.json'
    block = json.loads(block_file.read_text())['blocked'] if block_file.exists() else {}
    ledger['note'] = 'THE ALBUM sticker photographs: every image is a Wikimedia Commons file under a free licence, from the person\u2019s Wikidata item (P18) or his Commons category, club-era first; credits are shown on the back of each sticker. Written by scripts/album/stickers.py.'
    logo = Image.open(ROOT / 'public/brand/fanlife/logo-512.png').convert('RGBA').resize((160, 160), Image.LANCZOS)
    b = io.BytesIO(); logo.save(b, 'PNG'); logo_b64 = base64.b64encode(b.getvalue()).decode()
    css = font_css()
    session = (new_session('u2net_human_seg'), new_session('isnet-general-use'))
    done = 0
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        pg = br.new_page(viewport={'width': 240, 'height': 330}, device_scale_factor=2)
        stints_all = json.loads((ROOT / 'content/generated/people-stints.json').read_text())['stints']
        alias_of = {f"{x['club']}:{x['eid']}": [n for n in (x.get('aliases') or []) if n and n != x['name']] for x in stints_all}
        for club, rows in edition['wings'].items():
            if a.club and club != a.club:
                continue
            (OUT_DIR / club).mkdir(parents=True, exist_ok=True)
            for st in rows:
                if done >= a.limit:
                    break
                sid = f'{club}:{st["slot"]}'
                prev = ledger['stickers'].get(sid)
                if a.ids and sid not in a.ids.split(','):
                    continue
                if prev and not a.redo and not a.ids and prev.get('person_id') == st['person_id'] and prev.get('status') == 'photo':
                    continue
                qid = stint_qid.get(f'{club}:{st["record_id"]}') or (find_qid(st['name'], club_q[club], st.get('from')) if club in club_q else None)
                photo, photo_wh, src, frame = None, None, None, 'club'
                names = [st['name']] + alias_of.get(f"{club}:{st['record_id']}", []) + (SRC.labels(get_json, qid) if qid else [])
                pick = choose_photo(qid, st['name'], clubs[club]['name'], st.get('from'), st.get('to'), names=list(dict.fromkeys(names)), club_words=[clubs[club]['name']] + SRC.club_names(club), blocked=set(block.get(sid, [])))
                if pick:
                    meta, raw, frame = pick
                    got = cutout(raw, session, frame)
                    if got:
                        cut, f = got
                        bb = io.BytesIO(); cut.save(bb, 'PNG'); photo = base64.b64encode(bb.getvalue()).decode(); photo_wh = (*cut.size, *f)
                        src = {'file': meta['title'], 'page': meta['page'], 'author': meta['artist'], 'license': meta['license'], 'licenseUrl': meta['licenseUrl'], 'date': meta['date'], 'via': meta.get('via', 'commons')}
                traits = None
                if not src:
                    ref = SRC.any_wiki_picture(get_json, get_bytes, qid) if qid else None
                    traits = (SRC.traits(ref, face_of, lambda im_: remove_mask(im_, session)) if ref else None) or SRC.era_default(st.get('from'))
                    traits.setdefault('measured', bool(ref))
                    if ref and traits.get('measured') and os.environ.get('ALBUM_LBF'):
                        traits['shape'] = face_shape(ref)
                face = FACES_DIR / club / f'{st["slot"]}.webp'
                worn = DRESSED_DIR / club / f'{st["slot"]}.webp'
                fig, kit_over, painted = None, False, False
                if not src and face.exists():
                    got = cutout((worn if worn.exists() else face).read_bytes(), session, 'club', paint_it=False)
                    if got:
                        cut, f = got
                        bb = io.BytesIO(); cut.save(bb, 'PNG'); photo = base64.b64encode(bb.getvalue()).decode(); photo_wh = (*cut.size, *f)
                        painted = True
                        kit_over = not worn.exists()  # an undressed painting still gets the shirt laid over
                        frame = 'club'  # a painted portrait is never an archive photograph
                if not src and not painted:
                    fig = painted_figure(pg, st, traits)
                svg = sticker_svg(st, clubs[club], photo, photo_wh, frame, logo_b64, traits=traits, figure_b64=fig, kit_over=kit_over)
                pg.set_content(f'<html><style>{css} body{{margin:0;background:transparent}} svg{{display:block}}</style><body>{svg}</body></html>')
                pg.wait_for_timeout(150)
                png = pg.locator('body > svg').screenshot(omit_background=True)
                Image.open(io.BytesIO(png)).convert('RGBA').save(OUT_DIR / club / f'{st["slot"]}.webp', 'WEBP', quality=84, method=6)
                ledger['stickers'][sid] = {'person_id': st['person_id'], 'name': st['name'], 'code': f"{clubs[club]['code']}{DASH}{st['slot']:02d}", 'status': 'photo' if src else 'silhouette', 'portrait': 'painted' if painted else None,
                                           'frame': frame if src else None, 'qid': qid, 'source': src, 'traits': traits, 'file': f'/album/stickers/{club}/{st["slot"]}.webp'}
                done += 1
                print(sid, 'photo' if src else 'silhouette', st['name'], flush=True)
                time.sleep(0.4)
        br.close()
    ledger['stickers'] = dict(sorted(ledger['stickers'].items(), key=lambda kv: (kv[0].split(':')[0], int(kv[0].split(':')[1]))))
    LEDGER.write_text(json.dumps(ledger, ensure_ascii=False, indent=1) + '\n')
    n = len(ledger['stickers']); ph = sum(1 for v in ledger['stickers'].values() if v['status'] == 'photo')
    print(f'album:stickers — {done} drawn now · {ph}/{n} with a free photo')


if __name__ == '__main__':
    main()
