"""Maps drawn from Natural Earth (public domain; the `world-atlas` package already in the project), printed as a
newsprint chart: cream land, a dotted sea, ink borders. Pins mark the home CITIES of the clubs a beat names.
Returns the base map plus the pixel position of every pin, so the editor can pop pins and labels on cue.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from .common import INK, NEWSPRINT, ROOT, STUDIO, hex_rgb, read_json
from .paper import CANVAS, crumpled

ATLAS = ROOT / 'node_modules' / 'world-atlas'
PLACES = read_json(STUDIO / 'dossiers' / 'places.json')
SEA = '#8C99A3'


def _topo(name: str) -> dict:
    p = ATLAS / name
    if not p.exists():
        raise FileNotFoundError(f'{p} (run npm ci: world-atlas provides Natural Earth)')
    return json.loads(p.read_text())


def _arcs(topo: dict) -> list[list[tuple[float, float]]]:
    tr = topo.get('transform')
    out = []
    for arc in topo['arcs']:
        x = y = 0
        pts = []
        for dx, dy in arc:
            if tr:
                x += dx
                y += dy
                pts.append((x * tr['scale'][0] + tr['translate'][0], y * tr['scale'][1] + tr['translate'][1]))
            else:
                pts.append((dx, dy))
        out.append(pts)
    return out


def _rings(arcs, geom) -> list[list[list[tuple[float, float]]]]:
    def ring(idx):
        pts = []
        for i in idx:
            a = arcs[i] if i >= 0 else arcs[~i][::-1]
            pts.extend(a if not pts else a[1:])
        return pts
    t = geom['type']
    if t == 'Polygon':
        return [[ring(r) for r in geom['arcs']]]
    if t == 'MultiPolygon':
        return [[ring(r) for r in poly] for poly in geom['arcs']]
    return []


_CACHE: dict = {}


def countries(res: str):
    if res not in _CACHE:
        topo = _topo(f'countries-{res}.json')
        arcs = _arcs(topo)
        geoms = topo['objects']['countries']['geometries']
        _CACHE[res] = [(g.get('properties', {}).get('name'), _rings(arcs, g)) for g in geoms]
    return _CACHE[res]


def city_of(club: str) -> tuple[str, tuple[float, float]] | None:
    c = PLACES['clubs'].get(club)
    if not c or c not in PLACES['cities']:
        return None
    return c, tuple(PLACES['cities'][c])


def _fold(s: str) -> str:
    import unicodedata
    return ''.join(ch for ch in unicodedata.normalize('NFKD', s) if not unicodedata.combining(ch)).lower()


def place_of(fact: dict, club: str) -> tuple[str, tuple[float, float]] | None:
    """Where a match was PLAYED, for a map: the venue's city when the record names one away from the club's own city (an
    away ground, a neutral venue, a final), otherwise the opponent's city (a home match pins where the visitors came from)."""
    home = city_of(club)
    venue = _fold(fact.get('venue') or '')
    if venue:
        for name, ll in PLACES['cities'].items():
            if _fold(name) in venue and (not home or name != home[0]):
                return name, tuple(ll)
    return city_of(fact.get('opponent') or '')


def frame_for(points: list[tuple[float, float]], focus: str) -> tuple[float, float, float]:
    """(center lat, center lon, degrees of longitude across the canvas)."""
    lats = [p[0] for p in points]
    lons = [p[1] for p in points]
    clat, clon = (min(lats) + max(lats)) / 2, (min(lons) + max(lons)) / 2
    k = math.cos(math.radians(clat))
    span = max((max(lons) - min(lons)) * 1.6, (max(lats) - min(lats)) * 1.7 * CANVAS[0] / (CANVAS[1] * k))
    span = max(span, {'home': 2.2, 'domestic': 2.6, 'europe': 14}.get(focus, 2.6))
    return clat, clon, span


def render(points: list[dict], focus: str, seed: int, highlight: str | None) -> tuple[Image.Image, list[dict]]:
    """points: [{name, lat, lon, kind}] → base image, pins [{name, x, y, kind}] in canvas pixels."""
    w, h = CANVAS
    clat, clon, span = frame_for([(p['lat'], p['lon']) for p in points], focus)
    k = math.cos(math.radians(clat))
    s_ = w / (span * k)

    def proj(lon, lat):  # equirectangular, longitude scaled by the cosine of the centre latitude
        return (w / 2 + (lon - clon) * k * s_, h / 2 - (lat - clat) * s_)

    res = '10m' if span < 8 else '50m'
    paper = crumpled(seed, CANVAS)
    sea = Image.new('RGBA', CANVAS, (0, 0, 0, 0))
    land = Image.new('L', CANVAS, 0)
    borders = Image.new('RGBA', CANVAS, (0, 0, 0, 0))
    dl, db = ImageDraw.Draw(land), ImageDraw.Draw(borders)
    hl = Image.new('L', CANVAS, 0)
    dh = ImageDraw.Draw(hl)
    for name, polys in countries(res):
        for poly in polys:
            for ri, r in enumerate(poly):
                xy = [proj(lo, la) for lo, la in r]
                if not any(-w < x < 2 * w and -h < y < 2 * h for x, y in xy):
                    continue
                dl.polygon(xy, fill=255 if ri == 0 else 0)
                if highlight and name == highlight and ri == 0:
                    dh.polygon(xy, fill=255)
                db.line(xy + [xy[0]], fill=hex_rgb(INK) + (200,), width=3 if span < 8 else 2)
    # sea: a dot screen in warm grey
    yy, xx = np.mgrid[0:h, 0:w]
    cell = 12
    dots = ((xx % cell - cell / 2) ** 2 + (yy % cell - cell / 2) ** 2) < 7.5
    seamask = (np.asarray(land) < 128)
    s_rgb = np.array(hex_rgb(SEA), 'float32')
    base = np.asarray(paper, 'float32')
    sea_col = base * 0.72 + s_rgb * 0.28
    sea_col[dots] = sea_col[dots] * 0.82
    out = np.where(seamask[..., None], sea_col, base)
    hlm = np.asarray(hl.filter(ImageFilter.GaussianBlur(1)), 'float32')[..., None] / 255
    out = out * (1 - 0.10 * hlm)
    img = Image.fromarray(np.clip(out, 0, 255).astype('uint8'), 'RGB')
    img.paste(borders, (0, 0), borders)
    # a coastline shadow for depth
    pins = []
    for p in points:
        x, y = proj(p['lon'], p['lat'])
        pins.append({**p, 'x': x, 'y': y})
    return img, pins


def pin_sprite(accent: str, home: bool) -> Image.Image:
    s = 64 if home else 46
    im = Image.new('RGBA', (s + 12, s + 12), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c = s // 2 + 2
    d.ellipse((c - s // 2 + 6, c - s // 2 + 6, c + s // 2 + 6, c + s // 2 + 6), fill=hex_rgb(INK) + (255,))
    d.ellipse((c - s // 2, c - s // 2, c + s // 2, c + s // 2), fill=hex_rgb(accent if home else NEWSPRINT) + (255,), outline=hex_rgb(INK) + (255,), width=5)
    d.ellipse((c - 8, c - 8, c + 8, c + 8), fill=hex_rgb(INK) + (255,))
    return im
