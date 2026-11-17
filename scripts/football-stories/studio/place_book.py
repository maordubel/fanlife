"""THE PLACE BOOK, rebuilt from open data (owner, 17.11.2026: "a city for every away ground in the archive, so every film
with away matches gets a route on the map").

Every opponent the archive names (content/generated/stories/<club>.json) is given the city it comes from, and every city
its coordinates — offline, from two open datasets, never geocoded at run time:

  clubs → city    openfootball/clubs (CC0, github.com/openfootball/clubs): ~170 country files, each club with its city
                  and its other spellings ("AEK Athen [de]", "Macc. Tel Aviv") — the archive's German-sourced names match
  city → lat/lon  GeoNames cities ≥1000 inhabitants (CC BY 4.0, geonames.org; read through the `all-the-cities` npm
                  package): the most populous place of that name in the club's country

The rows already in the book (Wikipedia coordinates, accessed 2.11.2026) are kept as they are and win. A club the
datasets cannot place stays out: no pin is better than a wrong one. Run (sources on disk, paths as arguments):

  python3 -m studio.place_book --clubs /path/to/openfootball/clubs --cities /path/to/cities.json [--dry]

`cities.json` is all-the-cities dumped as [[name, altName, country, population, lat, lon, admin], ...].
"""
from __future__ import annotations

import argparse
import glob
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

from .common import ROOT, STUDIO, read_json

BOOK = STUDIO / 'dossiers' / 'places.json'
STORIES = ROOT / 'content' / 'generated' / 'stories'

FOLDER_ISO = {'bosnia-n-herzegovina': 'BA', 'congo-dr': 'CD', 'czech-republic': 'CZ', 'england': 'GB', 'scotland': 'GB',
              'wales': 'GB', 'northern-ireland': 'GB', 'latvija': 'LV', 'macedonia': 'MK', 'kosovo': 'XK', 'russia': 'RU',
              'south-korea': 'KR', 'trinidad-n-tobago': 'TT', 'united-states': 'US', 'faroe-islands': 'FO', 'moldova': 'MD',
              'iran': 'IR', 'turkey': 'TR', 'puerto-rico': 'PR', 'south-africa': 'ZA', 'new-zealand': 'NZ', 'costa-rica': 'CR',
              'el-salvador': 'SV', 'saudi-arabia': 'SA', 'united-arab-emirates': 'AE', 'san-marino': 'SM', 'ireland': 'IE'}
BIG = ['GB', 'ES', 'DE', 'IT', 'FR', 'PT', 'NL', 'BE', 'TR', 'GR', 'AT', 'CH', 'SC', 'RU', 'UA', 'IL', 'EG', 'MA']
NOISE = {'fc', 'cf', 'sc', 'ac', 'afc', 'fk', 'sk', 'nk', 'ks', 'cd', 'sv', 'vfb', 'vfl', 'bk', 'if', 'ff', 'fbc', 'ssc', 'as',
         'us', 'club', 'football', 'de', 'calcio', 'kv', 'krc', 'rsc', 'pfc', 'ofk', 'gnk', 'hnk', 'csd', 'cs', 'sd', 'ud', 'rc',
         'rcd', 'ca', 'cp', 'scp', 'sl', 'tsg', 'bsc', 'fsv', '1', 'jk', 'pae', 'gss', 'ao', 'apo', 'mfk', 'fcsb', 'and', 'the'}


def fold(s: str) -> str:
    s = ''.join(ch for ch in unicodedata.normalize('NFKD', s or '') if not unicodedata.combining(ch)).lower()
    s = s.replace('ß', 'ss').replace('ø', 'o').replace('æ', 'ae').replace('ł', 'l').replace('đ', 'd').replace('ı', 'i')
    return re.sub(r'[^a-z0-9 ]+', ' ', s).strip()


def key(name: str) -> str:
    """A club name with its punctuation, its legal-form letters and its order removed: 'FC Porto' = 'Porto FC'."""
    toks = [t for t in fold(name).replace('-', ' ').split() if t not in NOISE and not re.fullmatch(r'(18|19|20)\d\d', t)]
    return ' '.join(sorted(toks))


def iso_of(folder: str) -> str | None:
    if folder in FOLDER_ISO:
        return FOLDER_ISO[folder]
    try:
        import pycountry
        c = pycountry.countries.lookup(folder.replace('-', ' '))
        return c.alpha_2
    except Exception:  # noqa: BLE001 — a folder that is not a country (0-world, wiki lists)
        return None


def read_clubs(root: Path) -> list[dict]:
    """[{names, city, iso, file}] from openfootball's *.clubs.txt files."""
    out = []
    for f in sorted(glob.glob(str(root / '**' / '*.clubs.txt'), recursive=True)):
        iso = iso_of(Path(f).parent.name)
        if not iso:
            continue
        cur = None
        for raw in Path(f).read_text(encoding='utf-8').splitlines():
            line = raw.split('#')[0].rstrip()
            if not line.strip() or line.startswith('=') or line.lstrip().startswith('['):
                continue
            if line.startswith(' ') or line.startswith('\t'):
                if cur is not None and line.strip().startswith('|'):
                    cur['names'] += [re.sub(r'\[\w+\]', '', a).strip() for a in line.strip().strip('|').split('|') if a.strip()]
                continue
            parts = [p.strip() for p in line.split(',')]
            name, rest = parts[0], [p for p in parts[1:] if p and not re.fullmatch(r'\d{4}', p) and not p.startswith('@')]
            city = re.sub(r'\s*\(.*?\)', '', rest[0].split('›')[0]).strip() if rest else None   # 'London (Highbury)' → London
            cur = {'names': [name], 'city': city, 'iso': iso, 'file': str(Path(f).relative_to(root))}
            out.append(cur)
    return out


def city_index(rows: list) -> dict:
    """fold(name) → [(population, lat, lon, name, iso)] for every name and alternative name GeoNames gives."""
    idx: dict = defaultdict(list)
    for name, alt, iso, pop, lat, lon, _adm in rows:
        for n in {name, *[a for a in (alt or '').split(',') if a]}:
            idx[fold(n)].append((pop or 0, round(lat, 2), round(lon, 2), name, iso))
    return idx


# the local name openfootball writes → the name GeoNames files the city under (its English one)
ENDONYM = {'milano': 'milan', 'firenze': 'florence', 'torino': 'turin', 'napoli': 'naples', 'genova': 'genoa', 'roma': 'rome',
           'venezia': 'venice', 'lisboa': 'lisbon', 'praha': 'prague', 'wien': 'vienna', 'kobenhavn': 'copenhagen',
           'bruxelles': 'brussels', 'brussel': 'brussels', 'beograd': 'belgrade', 'athina': 'athens', 'thessaloniki': 'thessaloniki',
           'larissa': 'larisa', 'munchen': 'munich', 'koln': 'cologne', 'nurnberg': 'nuremberg', 'hannover': 'hanover',
           'bucuresti': 'bucharest', 'kyiv': 'kiev', 'kiev': 'kyiv', 'moskva': 'moscow', 'sevilla': 'seville', 'a coruna': 'a coruna',
           'warszawa': 'warsaw', 'krakow': 'krakow', 'goteborg': 'gothenburg', 'antwerpen': 'antwerp', 'gent': 'ghent',
           'liege': 'liege', 'den haag': 'the hague', 'tbilisi': 'tbilisi', 'chisinau': 'chisinau', 'skopje': 'skopje',
           'tel aviv': 'tel aviv', 'tel aviv yafo': 'tel aviv', 'beer sheva': 'beersheba', "be er sheva": 'beersheba',
           'piraeus': 'piraeus', 'pireas': 'piraeus', 'irakleio': 'heraklion', 'iraklio': 'heraklion', 'volos': 'volos',
           'istanbul': 'istanbul', 'aarhus': 'arhus', 'cluj': 'cluj napoca', 'reineh': 'reina', 'al ain': 'al ain city', 'sankt peterburg': 'saint petersburg', 'zurich': 'zurich', 'geneve': 'geneva'}


def place(city: str, iso: str, idx: dict) -> tuple[str, float, float] | None:
    f = fold(city)
    c = [r for r in idx.get(f, []) if r[4] == iso] or [r for r in idx.get(ENDONYM.get(f, ''), []) if r[4] == iso]
    if not c and len(f) >= 5:   # one letter apart ('Larissa' / 'Larisa'), a city of 20,000 or more only
        import difflib
        near = difflib.get_close_matches(f, [k for k in idx if k[:2] == f[:2]], n=4, cutoff=0.86)
        c = [r for k in near for r in idx[k] if r[4] == iso and r[0] >= 20000]
    if not c:
        return None
    pop, lat, lon, name, _ = max(c)
    return name, lat, lon


def city_in_name(name: str, iso: str, idx: dict) -> tuple[str, float, float] | None:
    """For a club whose file gives no city ('Maccabi Haifa FC'): the longest run of its words that is a place of its country
    with at least 5,000 people."""
    toks = fold(name).split()
    for n in range(min(3, len(toks)), 0, -1):
        for i in range(len(toks) - n + 1):
            frag = ' '.join(toks[i:i + n])
            if frag in NOISE or len(frag) < 4:
                continue
            c = [r for r in idx.get(frag, []) + idx.get(ENDONYM.get(frag, ''), []) if r[4] == iso and r[0] >= 5000]
            if c:
                pop, lat, lon, nm, _ = max(c)
                return nm, lat, lon
    return None


WORLD = re.compile(r'intercontinental|club world|libertadores', re.I)


def archive_names(comps: dict | None = None) -> dict[str, set[str]]:
    """opponent name → the archive clubs that played it (the home club's country decides a domestic opponent's)."""
    out: dict = defaultdict(set)
    for f in sorted(STORIES.glob('*.json')):
        d = read_json(f)
        for m in d.get('matches') or []:
            out[m['opponent']].add(d.get('club_id') or f.stem)
            if comps is not None:
                comps.setdefault(m['opponent'], set()).add(str(m.get('competition') or ''))
            for side in ('home', 'away'):
                if m.get(side):
                    out[m[side]].add(d.get('club_id') or f.stem)
    return out


def build(clubs_root: Path, cities_json: Path, dry: bool = False) -> dict:
    book = read_json(BOOK)
    rows = json.loads(cities_json.read_text())
    idx = city_index(rows)
    clubs = read_clubs(clubs_root)
    by_key: dict = defaultdict(list)
    for c in clubs:
        for n in c['names']:
            if key(n):
                by_key[key(n)].append(c)
    comps: dict = {}
    names = archive_names(comps)
    # the archive clubs' own countries, from their own rows
    home_iso = {}
    for cid in {x for v in names.values() for x in v}:
        hit = by_key.get(key(cid.replace('-', ' ')))
        if hit:
            home_iso[cid] = hit[0]['iso']
    placed, missing = {}, []
    for opp, who in sorted(names.items()):
        if opp in book['clubs']:
            continue
        cand = by_key.get(key(opp)) or []
        isos = {home_iso.get(w) for w in who} - {None}
        if len(cand) > 1:   # the same short name in two countries ('Olympiakos'): the one where the archive club plays at home,
            # then a European club (every archive club plays in UEFA or CAF competitions), then the bigger football country
            world = any(WORLD.search(c_) for c_ in comps.get(opp, ()))   # the Intercontinental Cup: a South American club
            cand = ([c for c in cand if c['iso'] in isos] or [c for c in cand if c['file'].startswith('south-america/' if world else 'europe/')] or cand)
            if len({(c['city'], c['iso']) for c in cand}) > 1:
                top = [c for c in cand if c['iso'] in BIG[:6]]   # one club of that name in the six big leagues: that one
                if len({(c['city'], c['iso']) for c in top}) == 1:
                    cand = top[:1]
                else:
                    missing.append((opp, 'ambiguous'))
                    continue
        if not cand:   # a longer or shorter spelling of a club the files hold, in the archive club's own country
            kt = set(key(opp).split())
            near = [c for c in clubs if c['iso'] in isos and any(
                kt <= set(key(n).split()) and max((len(t) for t in set(key(n).split()) & kt), default=0) >= 5
                for n in c['names'] if key(n))]
            near = [c for c in near if any(kt <= set(key(n).split()) for n in c['names'] if key(n))]   # a shortening only: never a longer, other club
            if len({(c['city'], c['iso']) for c in near}) == 1:
                cand = near
        if not cand:
            where = next((w for w in (city_in_name(opp, i, idx) for i in sorted(isos)) if w), None)
            if where:   # a domestic opponent named after its town ('Hapoel Kfar Saba'): the town in the archive club's country
                placed[opp] = (''.join(ch for ch in unicodedata.normalize('NFKD', where[0]) if not unicodedata.combining(ch)), where[1], where[2], 'name')
                continue
            missing.append((opp, 'not in openfootball'))
            continue
        c = cand[0]
        where = place(c['city'], c['iso'], idx) if c['city'] else city_in_name(c['names'][0], c['iso'], idx)
        if not where:
            missing.append((opp, f'no GeoNames place for {c["city"]!r} ({c["iso"]})'))
            continue
        nm, lat, lon = where
        city = ''.join(ch for ch in unicodedata.normalize('NFKD', nm) if not unicodedata.combining(ch))   # GeoNames' own name for it (its English one where it has one: Munich, Turin, Lisbon)
        placed[opp] = (city, lat, lon, c['file'])
    cities = dict(book['cities'])
    for opp, (city, lat, lon, _f) in placed.items():
        cities.setdefault(city, [lat, lon])
    clubs_out = {**{k: v for k, v in placed.items()}, **{}}
    new = {**book, 'cities': cities, 'clubs': {**book['clubs'], **{k: v[0] for k, v in clubs_out.items()}}}
    new['note'] = (book.get('note', '') + ' Rows added 17.11.2026 by studio/place_book.py: the club\'s city from openfootball/clubs '
                   '(CC0) and its coordinates from GeoNames (CC BY 4.0, the most populous place of that name in the club\'s '
                   'country, rounded to 0.01°). A club neither dataset places has no row.') if 'place_book.py' not in book.get('note', '') else book['note']
    new['sources'] = [{'title': 'openfootball/clubs (CC0)', 'url': 'https://github.com/openfootball/clubs'},
                      {'title': 'GeoNames cities1000 (CC BY 4.0) via all-the-cities', 'url': 'https://www.geonames.org/'}]
    report = {'archive_names': len(names), 'placed_new': len(placed), 'kept': len(book['clubs']), 'missing': len(missing),
              'cities': len(cities), 'missing_sample': missing[:60]}
    if not dry:
        BOOK.write_text(json.dumps(new, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        (STUDIO / 'dossiers' / 'places-missing.json').write_text(json.dumps(sorted(missing), ensure_ascii=False, indent=0) + '\n', encoding='utf-8')
    return report


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--clubs', required=True)
    ap.add_argument('--cities', required=True)
    ap.add_argument('--dry', action='store_true')
    a = ap.parse_args()
    r = build(Path(a.clubs), Path(a.cities), a.dry)
    print(json.dumps(r, ensure_ascii=False, indent=1))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
