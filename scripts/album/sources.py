"""
THE ALBUM — more free photographs, and a likeness for the men without one (owner, 18.11.2026: "many more pictures;
and where there is none, a face drawn as close to the man as possible").

Free sources, every one with its own licence and credit kept:
  1. the person's Wikidata picture (P18) and his Commons category (stickers.py);
  2. Commons full-text search of the File namespace for his full name;
  3. the lead picture of his Wikipedia articles in every language Wikidata links (only when the file lives on Commons);
  4. Openverse (WordPress's open catalogue of CC-licensed images, Flickr among them), free and keyless.
A name-search result counts only when its own title, description or tags carry his full name — a face never proves
who a man is, his name next to it does.

The likeness: for a man with no free photo, his lead Wikipedia picture (whatever its licence) is read ONLY to measure
traits — skin tone, hair colour and length, beard, moustache. The picture is never stored or published; the drawing
is made from those measured facts, in the weekly's own manner.
"""
import io
import re
import unicodedata
import urllib.parse

WIKIS = ['en', 'el', 'he', 'ar', 'hr', 'bs', 'sr', 'de', 'it', 'fr', 'tr', 'nl', 'pt', 'es', 'arz', 'fa']
CM = 'https://commons.wikimedia.org/w/api.php?format=json&'
WD = 'https://www.wikidata.org/w/api.php?format=json&'
OV = 'https://api.openverse.org/v1/images/?'
OV_LICENSE = {'by': 'CC BY', 'by-sa': 'CC BY-SA', 'cc0': 'CC0', 'pdm': 'Public domain'}


def fold(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s or '') if unicodedata.category(c) != 'Mn').lower()


def names_in(text, name):
    """every part of the full name appears in the text (accents folded)"""
    t = fold(text)
    parts = [p for p in re.split(r'[\s\-]+', fold(name)) if len(p) > 1]
    return len(parts) >= 2 and all(re.search(r'(?<![a-z])' + re.escape(p) + r'(?![a-z])', t) for p in parts)


def sitelinks(get_json, qid):
    j = get_json(WD + 'action=wbgetentities&props=sitelinks&ids=' + qid)
    sl = ((j or {}).get('entities', {}).get(qid, {}) or {}).get('sitelinks', {}) or {}
    return [(w, sl[w + 'wiki']['title']) for w in WIKIS if (w + 'wiki') in sl]


def wiki_lead_images(get_json, qid):
    """[(wiki, file name)] — the lead picture of each of his Wikipedia articles"""
    out = []
    for w, title in sitelinks(get_json, qid):
        j = get_json(f'https://{w}.wikipedia.org/w/api.php?format=json&action=query&prop=pageimages&piprop=name&titles=' + urllib.parse.quote(title))
        for p in (j or {}).get('query', {}).get('pages', {}).values():
            if p.get('pageimage'):
                out.append((w, p['pageimage']))
    return out


def commons_search(get_json, name):
    j = get_json(CM + 'action=query&list=search&srnamespace=6&srlimit=20&srsearch=' + urllib.parse.quote(f'"{name}"'))
    return [h['title'][5:] for h in (j or {}).get('query', {}).get('search', [])
            if re.search(r'\.(jpe?g|png)$', h['title'], re.I) and names_in(h['title'] + ' ' + re.sub('<[^>]+>', '', h.get('snippet', '')), name)]


def labels(get_json, qid):
    """his name as Wikidata writes it in the languages of our clubs (Greek, Hebrew, Arabic, Croatian, Serbian…)"""
    j = get_json(WD + 'action=wbgetentities&props=labels|aliases&languages=en|el|he|ar|hr|bs|sr|de|it|tr|fr&ids=' + qid)
    e = ((j or {}).get('entities', {}).get(qid, {}) or {})
    out = [v['value'] for v in (e.get('labels') or {}).values()]
    for vs in (e.get('aliases') or {}).values():
        out += [v['value'] for v in vs][:2]
    return [n for n in dict.fromkeys(out) if 4 <= len(n) <= 40][:10]


CLUB_WORDS = {'hapoel-tel-aviv': ['הפועל תל אביב'], 'hapoel-petah-tikva': ['הפועל פתח תקווה'], 'maccabi-haifa': ['מכבי חיפה'],
              'panathinaikos': ['Παναθηναϊκός', 'Panathinaikos'], 'olympiacos': ['Ολυμπιακός', 'Olympiakos'], 'aek-athens': ['ΑΕΚ', 'AEK'],
              'al-ahly': ['الأهلي', 'Ahly'], 'raja-casablanca': ['الرجاء', 'Raja'], 'wydad-casablanca': ['الوداد', 'Wydad'],
              'zrinjski-mostar': ['Zrinjski'], 'celtic': ['Celtic'], 'st-pauli': ['St. Pauli', 'Sankt Pauli'], 'atalanta': ['Atalanta']}


FOOTBALL = ['football', 'footballer', 'soccer', 'fußball', 'fussball', 'fußballspieler', 'calcio', 'calciatore', 'fudbal', 'nogomet', 'futbol', 'futebol', 'fútbol',
            'voetbal', 'ποδόσφαιρ', 'ποδοσφαιρ', 'כדורגל', 'כדורגלן', 'كرة القدم', 'لاعب', 'association football', 'stadium', 'fc ', ' f.c.']


def football_context(text, club_words):
    """the picture's own words speak of football or of his club"""
    t = fold(text)
    return any(fold(w) in t for w in FOOTBALL) or any(len(w) > 2 and fold(w) in t for cw in club_words for w in [cw])


def club_names(club):
    return CLUB_WORDS.get(club, [])


def surname_club_search(get_json, name, club_words):
    """Commons files whose title names his surname AND his club (archive match pictures)"""
    parts = [p for p in re.split(r'\s+', name.strip()) if len(p) > 2]
    if not parts:
        return []
    sur = parts[-1]
    out = []
    for cw in club_words[:3]:
        j = get_json(CM + 'action=query&list=search&srnamespace=6&srlimit=15&srsearch=' + urllib.parse.quote(f'"{sur}" "{cw}"'))
        for h in (j or {}).get('query', {}).get('search', []):
            t = h['title']
            if re.search(r'\.(jpe?g|png|tiff?)$', t, re.I) and fold(sur) in fold(t):
                out.append(t[5:])
    return list(dict.fromkeys(out))


def openverse(get_json, name, club):
    """free-licence images from Openverse whose own words carry his full name; shaped like stickers.file_meta"""
    q = urllib.parse.urlencode({'q': f'{name} {club}', 'license': 'by,by-sa,cc0,pdm', 'page_size': 20, 'mature': 'false'})
    j = get_json(OV + q)
    out = []
    for r in (j or {}).get('results', []):
        text = ' '.join([r.get('title') or '', ' '.join(t.get('name', '') for t in r.get('tags') or [])])
        if not names_in(text, name):
            continue
        lic = OV_LICENSE.get(r.get('license', ''), '')
        ver = r.get('license_version') or ''
        license = f'{lic} {ver}'.strip() if lic.startswith('CC BY') else lic
        if not license:
            continue
        out.append({'title': r.get('title') or name, 'url': r.get('url'), 'page': r.get('foreign_landing_url') or r.get('url'),
                    'license': license, 'licenseUrl': r.get('license_url') or '', 'artist': (r.get('creator') or 'unknown')[:80],
                    'date': '', 'text': fold(text + ' ' + (r.get('source') or '')), 'via': 'openverse:' + (r.get('source') or '')})
    return out


def any_wiki_picture(get_json, get_bytes, qid):
    """bytes of his lead Wikipedia picture, whatever its licence — for measuring traits only, never stored"""
    for w, f in wiki_lead_images(get_json, qid):
        for host in (f'https://{w}.wikipedia.org', 'https://commons.wikimedia.org'):
            j = get_json(f'{host}/w/api.php?format=json&action=query&prop=imageinfo&iiprop=url&iiurlwidth=500&titles=' + urllib.parse.quote('File:' + f))
            for p in (j or {}).get('query', {}).get('pages', {}).values():
                ii = (p.get('imageinfo') or [None])[0]
                if ii:
                    raw = get_bytes(ii.get('thumburl') or ii['url'])
                    if raw:
                        return raw
    return None


# ------------------------------------------------------------------ the measured traits
SKIN = ['#F3D9C4', '#E8C2A0', '#D7A57E', '#BF8862', '#9C6745', '#7A4C32', '#5A3524']
HAIR = {'black': '#1C1714', 'dark': '#3B2A20', 'brown': '#6B4630', 'light': '#A07A4E', 'blond': '#C9A86A', 'red': '#9A4A2A', 'grey': '#9A9794', 'white': '#D9D6D0'}


def _near(rgb, table):
    def d(h):
        r, g, b = int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)
        return (r - rgb[0]) ** 2 + (g - rgb[1]) ** 2 + (b - rgb[2]) ** 2
    return min(table, key=d)


def traits(raw, face_of, mask_of=None):
    """skin, hair colour and length, beard and moustache, from a face photograph. `mask_of(im)` (the press's person cut)
    keeps the background out of every measurement."""
    import numpy as np
    from PIL import Image
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    s = 600 / max(im.size)
    im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))))
    f = face_of(im)
    if not f:
        return None
    x, y, w, h = f
    a = np.asarray(im).astype(int)
    H_, W_ = a.shape[:2]
    m = np.asarray(mask_of(im)) > 128 if mask_of else np.ones((H_, W_), bool)

    def box(x0, y0, x1, y1):
        x0, y0, x1, y1 = [int(max(0, min(v, lim))) for v, lim in ((x0, W_), (y0, H_), (x1, W_), (y1, H_))]
        if x1 <= x0 or y1 <= y0:
            return np.zeros((0, 3), int)
        px, mk = a[y0:y1, x0:x1].reshape(-1, 3), m[y0:y1, x0:x1].reshape(-1)
        return px[mk]
    lum = lambda px: px @ np.array([0.299, 0.587, 0.114]) if len(px) else np.zeros(0)
    dist = lambda px, c: np.abs(px - c).sum(axis=1) if len(px) else np.zeros(0)
    cheek = box(x + w * .22, y + h * .48, x + w * .78, y + h * .66)
    if len(cheek) < 20:
        return None
    skin = np.median(cheek, axis=0)
    sl = float(lum(skin[None])[0])
    top = box(x + w * .15, y - h * .32, x + w * .85, y + h * .08)
    # hair is darker than the skin (a shining scalp is not hair); very fair hair on dark skin is the one case missed
    not_skin = top[(dist(top, skin) > 70) & (lum(top) < sl - 12)] if len(top) else top
    bald = len(top) < 30 or len(not_skin) < 0.3 * len(top)
    hair = np.median(not_skin, axis=0) if len(not_skin) else skin * 0.55
    hl = float(lum(hair[None])[0])
    sat = float(max(hair) - min(hair))
    is_hair = lambda px: (dist(px, hair) < 75) & (dist(px, skin) > 60) if len(px) else np.zeros(0, bool)
    sides = np.concatenate([box(x - w * .2, y + h * .5, x + w * .04, y + h * .98), box(x + w * .96, y + h * .5, x + w * 1.2, y + h * .98)])
    side = float(is_hair(sides).mean()) if len(sides) > 30 else 0
    jaw = box(x + w * .18, y + h * .80, x + w * .82, y + h * 1.0)
    lip = box(x + w * .36, y + h * .69, x + w * .64, y + h * .77)
    darkish = lambda px: (dist(px, skin) > 75) & (lum(px) < sl - 35) if len(px) else np.zeros(0, bool)
    beard = len(jaw) > 30 and float(darkish(jaw).mean()) > 0.66  # stubble and jaw shadow stay below this
    tache = len(lip) > 15 and float(darkish(lip).mean()) > 0.5
    if hl > 170 and sat < 30:
        hc = 'white'
    elif sat < 22 and hl > 110:
        hc = 'grey'
    elif hair[0] > hair[1] * 1.35 and hl > 70:
        hc = 'red'
    elif hl > 135:
        hc = 'blond'
    elif hl > 100:
        hc = 'light'
    elif hl > 65:
        hc = 'brown'
    elif hl > 40:
        hc = 'dark'
    else:
        hc = 'black'
    return {'skin': _near(tuple(int(v) for v in skin), SKIN), 'hair': HAIR[hc], 'hairName': hc,
            'length': 'bald' if bald else 'long' if side > 0.35 else 'medium' if side > 0.15 else 'short',
            'beard': bool(beard), 'moustache': bool(tache and not beard), 'measured': True}


def era_default(year):
    """no picture at all: the era's usual cut, dark hair, a neutral tone — and the ledger says it is not measured"""
    return {'skin': SKIN[2], 'hair': HAIR['dark'], 'hairName': 'dark', 'length': 'short' if not year or year < 1968 or year > 1992 else 'medium',
            'beard': False, 'moustache': bool(year and 1972 <= year <= 1988), 'measured': False}


def head_svg(cx, ey, t, ink='#15130F'):
    """the drawn head: proportions fixed (eye line ey, the same size on every sticker), traits from the measurements"""
    skin, hair = t['skin'], t['hair']
    if t['length'] == 'bald' and t['hairName'] in ('red', 'blond', 'light'):
        hair = HAIR['brown']  # a shaved head shows its stubble line, not a highlight
    L = t['length']
    hair_back = ''
    if L == 'long':
        hair_back = (f'<path d="M{cx-30} {ey-8} C{cx-38} {ey+22} {cx-38} {ey+42} {cx-30} {ey+50} C{cx-24} {ey+44} {cx-20} {ey+28} {cx-18} {ey+16} Z" fill="{hair}"/>'
                     f'<path d="M{cx+30} {ey-8} C{cx+38} {ey+22} {cx+38} {ey+42} {cx+30} {ey+50} C{cx+24} {ey+44} {cx+20} {ey+28} {cx+18} {ey+16} Z" fill="{hair}"/>')
    elif L == 'medium':
        hair_back = (f'<path d="M{cx-30} {ey-6} C{cx-35} {ey+12} {cx-33} {ey+22} {cx-27} {ey+26} C{cx-24} {ey+18} {cx-22} {ey+10} {cx-20} {ey+4} Z" fill="{hair}"/>'
                     f'<path d="M{cx+30} {ey-6} C{cx+35} {ey+12} {cx+33} {ey+22} {cx+27} {ey+26} C{cx+24} {ey+18} {cx+22} {ey+10} {cx+20} {ey+4} Z" fill="{hair}"/>')
    top = {'bald': f'<path d="M{cx-26} {ey-4} C{cx-26} {ey-14} {cx-24} {ey-20} {cx-22} {ey-20}" fill="none" stroke="{hair}" stroke-width="3"/>'
           f'<path d="M{cx+26} {ey-4} C{cx+26} {ey-14} {cx+24} {ey-20} {cx+22} {ey-20}" fill="none" stroke="{hair}" stroke-width="3"/>',
           'short': f'<path d="M{cx-27} {ey-2} C{cx-30} {ey-40} {cx+30} {ey-40} {cx+27} {ey-2} C{cx+22} {ey-20} {cx-6} {ey-24} {cx-20} {ey-16} C{cx-23} {ey-12} {cx-26} {ey-7} {cx-27} {ey-2} Z" fill="{hair}"/>',
           'medium': f'<path d="M{cx-29} {ey+2} C{cx-33} {ey-42} {cx+33} {ey-42} {cx+29} {ey+2} C{cx+25} {ey-16} {cx-2} {ey-26} {cx-22} {ey-12} Z" fill="{hair}"/>',
           'long': f'<path d="M{cx-30} {ey+4} C{cx-34} {ey-42} {cx+34} {ey-42} {cx+30} {ey+4} C{cx+26} {ey-18} {cx+4} {ey-24} {cx-2} {ey-22} C{cx-10} {ey-20} {cx-26} {ey-14} {cx-30} {ey+4} Z" fill="{hair}"/>'}[L]
    beard = f'<path d="M{cx-25} {ey+8} C{cx-24} {ey+34} {cx-10} {ey+40} {cx} {ey+40} C{cx+10} {ey+40} {cx+24} {ey+34} {cx+25} {ey+8} C{cx+18} {ey+24} {cx+8} {ey+22} {cx} {ey+22} C{cx-8} {ey+22} {cx-18} {ey+24} {cx-25} {ey+8} Z" fill="{hair}" opacity=".92"/>' if t['beard'] else ''
    tache = f'<path d="M{cx-10} {ey+19} C{cx-5} {ey+15} {cx+5} {ey+15} {cx+10} {ey+19} C{cx+5} {ey+18} {cx-5} {ey+18} {cx-10} {ey+19} Z" fill="{hair}" stroke="{hair}" stroke-width="2"/>' if t['moustache'] else ''
    brow = hair if t['length'] != 'bald' or t['hairName'] not in ('white', 'grey') else ink
    face = (f'<path d="M{cx-14} {ey-6} q6 -4 11 -1 M{cx+3} {ey-7} q5 -3 11 1" fill="none" stroke="{brow}" stroke-width="3" stroke-linecap="round"/>'
            f'<ellipse cx="{cx-9}" cy="{ey+1}" rx="2.6" ry="2.2" fill="{ink}"/><ellipse cx="{cx+9}" cy="{ey+1}" rx="2.6" ry="2.2" fill="{ink}"/>'
            f'<path d="M{cx} {ey+3} q-3 8 2 9" fill="none" stroke="{ink}" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>'
            f'<path d="M{cx-7} {ey+22} q7 4 14 0" fill="none" stroke="{ink}" stroke-width="2" stroke-linecap="round"/>')
    return (f'<g stroke="{ink}" stroke-width="2.6" stroke-linejoin="round">{hair_back}'
            f'<rect x="{cx-12}" y="{ey+24}" width="24" height="30" fill="{skin}"/>'
            f'<ellipse cx="{cx-26}" cy="{ey+4}" rx="5" ry="8" fill="{skin}"/><ellipse cx="{cx+26}" cy="{ey+4}" rx="5" ry="8" fill="{skin}"/>'
            f'<ellipse cx="{cx}" cy="{ey+3}" rx="26" ry="33" fill="{skin}"/></g>'
            f'<g stroke="{ink}" stroke-width="2.2" stroke-linejoin="round">{beard}{top}</g>{tache}{face}')
