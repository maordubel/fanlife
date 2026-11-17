"""THE ATLAS — maps that move (owner, 17.11.2026: "take inspiration from the films I attached — the maps, the movement
between places, the graphics"; the references were two Search Party films by Sam Ellis, formerly of Vox Atlas).

What those films do with a map, and what this module does with one:
  * the map is a printed sheet, not a satellite: flat land, ink borders, a dotted sea, a faint graticule
  * the camera never cuts on a map — it flies: from the whole region down onto a city, or from one city across to
    another while the route is drawn between them and a marker travels it
  * places are pinned and named on paper tags with a leader line; the tags keep their size whatever the zoom
  * the country the story reaches is filled in the club's colour as the route arrives

Only places the narrator SAYS are printed (vox.accent 'place'), plus the club's own home city when the route starts
there; coordinates come from the place book (studio/dossiers/places.json, sourced) and from Natural Earth (public domain,
the `world-atlas` package) — nothing is geocoded at run time, no distance is printed (it would be a number nobody
sourced). A club's name ("Hapoel Tel Aviv") is never read as its city.
"""
from __future__ import annotations

import math
import re
import unicodedata

from .. import maps as M

W, H = 1920, 1080
MIN_SPAN = 7.0        # degrees of longitude across the frame on a single city
MIN_FIT = 7.0         # … and on a journey
ZOOM_FROM = 6.0       # a single city is reached from a view this many times wider


def _fold(s: str) -> str:
    return ''.join(ch for ch in unicodedata.normalize('NFKD', s) if not unicodedata.combining(ch)).lower()


_COUNTRY_ALIAS = {'United States of America': 'United States', 'Bosnia and Herz.': 'Bosnia', 'Czechia': 'Czech Republic'}
_GAZ: dict | None = None


def gazetteer() -> dict:
    """{'cities': {name: (lat, lon)}, 'countries': {name: (lat, lon, atlas name)}} — the places a line can name."""
    global _GAZ
    if _GAZ is None:
        cities = {k: tuple(v) for k, v in M.PLACES['cities'].items()}
        countries = {}
        try:
            for name, polys in M.countries('50m'):
                if not name or not polys:
                    continue
                ring = max((p[0] for p in polys), key=len)   # the largest landmass carries the label
                lon = sum(x for x, _ in ring) / len(ring)
                lat = sum(y for _, y in ring) / len(ring)
                countries[_COUNTRY_ALIAS.get(name, name)] = (lat, lon, name)
        except FileNotFoundError:
            pass
        _GAZ = {'cities': cities, 'countries': countries}
    return _GAZ


_GOING = re.compile(r'(?:\b(?:in|to|from|at|through|via|for|reach|reached|visit|visited|towards?)|,|\band)\s+(?:the\s+city\s+of\s+)?$', re.I)


def _club_spans(text: str) -> list[tuple[int, int]]:
    """Where the text names a club. A club called by its city's own name ("Basel", "Genk") is a place when the line is
    going somewhere ("to Basel", "Genk, Belgrade and Basel"), a club otherwise ("Basel scored")."""
    spans = []
    for club, city in (M.PLACES.get('clubs') or {}).items():
        for m in re.finditer(r'\b' + re.escape(club) + r'\b', text):
            if club == city and _GOING.search(text[:m.start()]):
                continue
            spans.append((m.start(), m.end()))
    return spans


def places_in(text: str) -> list[dict]:
    """The places a line names, in the order it names them: [{name, kind, ll, i}] (i = character index). A city inside
    a club's name does not count; a country counts only when no city of the line lies in it."""
    g = gazetteer()
    clubs = _club_spans(text)
    taken: list[tuple[int, int]] = []
    out = []
    for kind, book in (('city', g['cities']), ('country', g['countries'])):
        for name in sorted(book, key=len, reverse=True):
            for m in re.finditer(r'(?<![\w-])' + re.escape(name) + r'(?![\w-])', text):
                a, z = m.span()
                if any(a < cz and ca < z for ca, cz in clubs + taken):
                    continue
                if kind == 'country' and re.match(r'\s+(?:[A-Z][a-z]|national|league|cup|under|u-?\d)', text[z:]):
                    continue   # "the Israel State Cup", "the England national team": a name that has a country in it
                if kind == 'country' and name.lower() in ('jordan', 'georgia', 'chad', 'turkey'):   # names that are often not the country
                    if not re.search(r'\b(in|to|from|across|of)\s+$', text[:a]):
                        continue
                ll = book[name]
                taken.append((a, z))
                out.append({'name': name, 'kind': kind, 'll': (ll[0], ll[1]), 'atlas': ll[2] if kind == 'country' else None, 'i': a})
                break
    out.sort(key=lambda p: p['i'])
    seen, uniq = set(), []
    for p in out:
        if p['name'] not in seen:
            seen.add(p['name'])
            uniq.append(p)
    return uniq


def country_of(ll: tuple[float, float]) -> str | None:
    """The atlas country a point lies in (ray casting on the 50m outlines)."""
    lat, lon = ll
    try:
        cs = M.countries('50m')
    except FileNotFoundError:
        return None
    for name, polys in cs:
        for poly in polys:
            ring = poly[0]
            inside = False
            for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
                if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / ((y2 - y1) or 1e-12) + x1:
                    inside = not inside
            if inside:
                return name
    return None


# ── the plate: the map drawn once, in the pixel units of the journey's fitted frame ─────────────────────────────────

class Plate:
    def __init__(self, stops: list[dict]):
        lls = [s['ll'] for s in stops]
        lats, lons = [a for a, _ in lls], [b for _, b in lls]
        self.clat = (min(lats) + max(lats)) / 2
        self.clon = (min(lons) + max(lons)) / 2
        self.k = math.cos(math.radians(self.clat))
        span = max((max(lons) - min(lons)) * 1.7, (max(lats) - min(lats)) * 1.9 * W / (H * self.k),
                   MIN_SPAN if len(stops) == 1 else MIN_FIT)
        self.s = W / (span * self.k)   # px per degree of latitude

    def xy(self, ll) -> tuple[float, float]:
        lat, lon = ll
        return (W / 2 + (lon - self.clon) * self.k * self.s, H / 2 - (lat - self.clat) * self.s)

    @staticmethod
    def view(cx: float, cy: float, w: float) -> tuple[float, float, float, float]:
        h = w * H / W
        return (cx - w / 2, cy - h / 2, w, h)


def _path(xy: list[tuple[float, float]], tol: float) -> str:
    out = [xy[0]]
    for p in xy[1:]:
        if abs(p[0] - out[-1][0]) + abs(p[1] - out[-1][1]) >= tol:
            out.append(p)
    if len(out) < 3:
        return ''
    return 'M' + 'L'.join(f'{x:.0f} {y:.0f}' for x, y in out) + 'Z'


def land(plate: Plate, box: tuple[float, float, float, float], fine: bool, highlight: set[str]) -> tuple[str, str]:
    """(land paths, highlight paths) inside `box` (x0, y0, x1, y1 in plate px)."""
    x0, y0, x1, y1 = box
    tol = max(1.2, (x1 - x0) / W * 1.4)   # one screen pixel and a half at the widest view
    lp, hp = [], []
    for name, polys in M.countries('10m' if fine else '50m'):
        for poly in polys:
            for ri, r in enumerate(poly):
                if ri:
                    continue
                lo = [p[0] for p in r]
                la = [p[1] for p in r]
                a = plate.xy((max(la), min(lo)))
                b = plate.xy((min(la), max(lo)))
                if b[0] < x0 or a[0] > x1 or b[1] < y0 or a[1] > y1:
                    continue
                d = _path([plate.xy((y, x)) for x, y in r], tol)
                if d:
                    (hp if name in highlight else lp).append(d)
    return ''.join(f'<path d="{d}"/>' for d in lp), ''.join(f'<path d="{d}"/>' for d in hp)


def graticule(plate: Plate, box) -> str:
    x0, y0, x1, y1 = box
    out = []
    lon0 = plate.clon + (x0 - W / 2) / (plate.k * plate.s)
    lon1 = plate.clon + (x1 - W / 2) / (plate.k * plate.s)
    lat1 = plate.clat - (y0 - H / 2) / plate.s
    lat0 = plate.clat - (y1 - H / 2) / plate.s
    step = 5 if lon1 - lon0 < 60 else 10
    for lon in range(int(math.floor(lon0 / step)) * step, int(lon1) + step, step):
        x = plate.xy((0, lon))[0]
        out.append(f'M{x:.0f} {y0:.0f}V{y1:.0f}')
    for lat in range(int(math.floor(lat0 / step)) * step, int(lat1) + step, step):
        y = plate.xy((lat, 0))[1]
        out.append(f'M{x0:.0f} {y:.0f}H{x1:.0f}')
    return ''.join(out)


def arc(a: tuple[float, float], b: tuple[float, float], n: int = 24) -> list[tuple[float, float]]:
    """The route: a quadratic bow from a to b (it bends to the north, as a flight path reads on a flat map)."""
    mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / L, dx / L
    if ny > 0:
        nx, ny = -nx, -ny
    c = (mx + nx * L * 0.22, my + ny * L * 0.22)
    return [((1 - u) ** 2 * a[0] + 2 * u * (1 - u) * c[0] + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * u * (1 - u) * c[1] + u * u * b[1])
            for u in (i / n for i in range(n + 1))]
