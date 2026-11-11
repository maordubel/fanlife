"""The owner's moving-art library ("Dynamic Football Fan Art", Drive folder DFFA): listed, downloaded once, classified by
the file's prefix, cut out of its paper, and handed to the cinema as pieces it can animate (owner, 4.11.2026: "make
the studio use the variety of graphics we have … real animation, items moving across the screen, arriving, leaving").

    python -m studio.cinema.library list --out listing.json            # the folder's listing (the cache key)
    python -m studio.cinema.library sync --listing listing.json --dest ~/cinema-lib   # download what is new, prepare it

The runner keeps `<dest>` in an actions/cache keyed by the listing, so a piece is downloaded and cut out once. The
render reads `<dest>/index.json` through `STORIES_CINEMA_LIB`; without it (tests, the sandbox, a failed listing) every
film renders exactly as before — the library only ever adds.

Naming (docs/fanlife/64 and 65): Drive saved the PNGs as JPEG, so a file is `pup-striker-kr.png_<hash>.jpg`. The stem
(`pup-striker-kr`) says what it is: the prefix the class, `-kr` ink + cream + ONE signal red that is repainted in the
club's colour, `-n` no colour. A piece on flat paper (white or cream) is keyed to alpha here; the flat background is
read off the border, and only paper CONNECTED to the border goes, so cream shorts inside a figure stay.

Nothing here invents: a file that does not list, download or decode is reported by name and left out.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import sys
import time
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image

FOLDER = '1DTRk1oHoCaqxrSHzqlGeHq8XTzKiECQn'   # "Dynamic Football Fan Art" (owner, 4.11.2026)
ENV = 'STORIES_CINEMA_LIB'
URL = 'https://drive.usercontent.google.com/download?id={id}&export=download&confirm=t'
VERSION = 1   # bump when the preparation changes: every piece is cut again

# prefix → class. A class the cinema does not use in documentaries is listed so the listing is complete, and skipped.
CLASSES = {
    'pup': 'puppet', 'ppl': 'person', 'sup': 'supporter', 'obj': 'object', 'era': 'object', 'doc': 'document',
    'ins': 'insert', 'layer': 'layer', 'sky': 'sky', 'ground': 'ground', 'city': 'city', 'tr': 'transition',
    'clip': 'clip', 'fx': 'fx',
    'thumb': 'thumb',   # thumbnail heroes (thumb-hero-*, thumb-classified-*): studio/thumbs only, never in a film's shot
}
SKIP = {'cl': 'CLASSIFIED panel', 'f01': 'CLASSIFIED panel', 'tex': 'texture', 'map': 'map plate',
        'chap': 'series plate', 'end': 'series plate', 'banner': 'channel banner', 'iwt': 'I WAS THERE scrapbook kit'}
CUT = {'puppet', 'person', 'supporter', 'object', 'document', 'insert', 'layer', 'transition'}   # keyed when on flat paper
PICTURE = re.compile(r'\.(png|jpe?g|webp)$', re.I)
PIECE_MAX = 1400     # a cut-out's long side after preparation (they are shown at most ~650 px tall)
SCENE_MAX = 2150     # a scene's long side (the canvas is 2150 × 1210)


# ------------------------------------------------------------------ names
def stem_of(title: str) -> str | None:
    """`pup-striker-kr.png_d0f7bcf2.jpg` → `pup-striker-kr`; None for a name that is not a library piece."""
    t = (title or '').strip().lower()
    m = re.fullmatch(r'(.+?)\.(png|jpe?g|webp|mp4|mov|webm)', t)
    if not m:
        return None
    base = m.group(1)
    base = re.sub(r'_[0-9a-f]{6,}$', '', base)           # Drive's hash after the original name
    base = re.sub(r'\.(png|jpe?g|webp|mp4)$', '', base)   # the original extension Drive kept in the name
    base = re.sub(r'[\s_]+', '-', base)
    return base if re.fullmatch(r'[a-z0-9][a-z0-9-]*', base) else None


def classify(stem: str) -> dict:
    """What a stem is: {cls, colour, words, …} — `cls` 'skip' (with `why`) for pieces the documentaries do not use."""
    pre = stem.split('-', 1)[0]
    colour = 'kr' if re.search(r'-kr(-|$)', stem) else 'n' if re.search(r'-n(-|$)', stem) else None
    words = [w for w in stem.split('-')[1:] if w not in ('kr', 'n')]
    if pre in SKIP:
        return {'cls': 'skip', 'why': SKIP[pre], 'colour': colour, 'words': words}
    cls = CLASSES.get(pre)
    if not cls:
        return {'cls': 'skip', 'why': 'unknown prefix', 'colour': colour, 'words': words}
    out = {'cls': cls, 'colour': colour, 'words': words}
    if cls == 'puppet':
        if 'pose' in words:
            out['figure'] = '-'.join(w for w in words if w != 'pose')
        else:
            out['cls'] = 'sheet'   # the cut-up sheet: a rig needs comic/rigs/<stem>.json (see rig_for)
            out['figure'] = '-'.join(words)
    if cls == 'layer':
        m = re.fullmatch(r'layer-(.+?)-(kr|n)(?:-(full|fg|mid|bg))?', stem)
        if m:
            out['group'] = f'layer-{m.group(1)}-{m.group(2)}'
            out['part'] = m.group(3) or 'full'
        else:
            out['group'], out['part'] = stem, 'full'
    if cls == 'ground':
        m = re.search(r'(1[89]\d0|20[0-2]0)s', stem)
        out['era'] = int(m.group(1)) if m else (2010 if 'modern' in words else None)
        out['side'] = 'int' if 'int' in words else 'ext' if 'ext' in words else None
    return out


# ------------------------------------------------------------------ cutting a piece out of its paper
def _shift_or(m: np.ndarray) -> np.ndarray:
    out = m.copy()
    out[1:] |= m[:-1]
    out[:-1] |= m[1:]
    out[:, 1:] |= m[:, :-1]
    out[:, :-1] |= m[:, 1:]
    return out


def flat_paper(rgb: np.ndarray, share: float = 0.72) -> np.ndarray | None:
    """The paper colour when the picture sits on flat paper (most of its border is one light colour), else None. A
    depth layer's foreground runs off the bottom edge by design, so it asks for less of the border (`share`)."""
    h, w = rgb.shape[:2]
    b = max(2, int(min(h, w) * 0.02))
    border = np.concatenate([rgb[:b].reshape(-1, 3), rgb[-b:].reshape(-1, 3), rgb[:, :b].reshape(-1, 3), rgb[:, -b:].reshape(-1, 3)]).astype('float32')
    bright = border[border.mean(1) > 170]
    if len(bright) < share * len(border):
        return None
    med = np.median(bright, 0)
    near = np.abs(border - med).max(1) < 30
    return med if (near.mean() > share and med.mean() > 185) else None


def paper_surface(rgb: np.ndarray, near: np.ndarray) -> np.ndarray:
    """The paper as a smooth surface (a quadratic in x and y per channel, fitted on the paper already found): a sheet
    photographed with a vignette or a warm corner is still one paper."""
    h, w = near.shape
    ys, xs = np.nonzero(near[::4, ::4])
    if len(xs) < 50:
        return None
    ys, xs = ys * 4, xs * 4
    if len(xs) > 40000:
        sel = np.linspace(0, len(xs) - 1, 40000).astype(int)
        ys, xs = ys[sel], xs[sel]
    u, v = xs / w - 0.5, ys / h - 0.5
    A = np.stack([np.ones_like(u), u, v, u * u, v * v, u * v], 1)
    coef, *_ = np.linalg.lstsq(A, rgb[ys, xs].astype('float32'), rcond=None)
    gy, gx = np.mgrid[0:h, 0:w].astype('float32')
    U, V = gx / w - 0.5, gy / h - 0.5
    basis = np.stack([np.ones_like(U), U, V, U * U, V * V, U * V], -1)
    return basis @ coef


def key_paper(rgb: np.ndarray, paper: np.ndarray, tol: float = 24.0) -> np.ndarray:
    """Alpha (float 0..1) of whatever is not the paper: paper pixels connected to the border are background, a soft ramp
    at the edge, and enclosed paper holes the size of a gap between an arm and a body go too. The flood is a geodesic
    dilation in numpy (no OpenCV on the runner), at most a few hundred cheap passes."""
    d = np.abs(rgb.astype('float32') - paper[None, None]).max(-1)
    reach = _flood(d < tol)
    surf = paper_surface(rgb, reach)
    if surf is not None:   # second pass against the paper's own gradient
        d = np.abs(rgb.astype('float32') - surf).max(-1)
        reach = _flood(d < tol)
    return _alpha(d, reach, tol)


def _flood(near: np.ndarray) -> np.ndarray:
    reach = np.zeros_like(near)
    reach[0], reach[-1], reach[:, 0], reach[:, -1] = near[0], near[-1], near[:, 0], near[:, -1]
    for _ in range(4000):
        grown = _shift_or(reach) & near
        # several steps per check: the comparison is the slow part
        for _ in range(7):
            grown = _shift_or(grown) & near
        if (grown == reach).all():
            break
        reach = grown
    return reach


def _alpha(d: np.ndarray, reach: np.ndarray, tol: float) -> np.ndarray:
    # enclosed holes of almost exactly the paper colour (a gap between an arm and the body)
    tight = (d < tol * 0.45) & ~reach
    if tight.any():
        reach = reach | _holes(tight, min_px=max(60, int(d.size * 0.0012)))
    alpha = np.clip((d - 6.0) / (tol + 10.0 - 6.0), 0, 1)
    ring = _shift_or(_shift_or(reach)) & ~reach
    a = np.where(reach, 0.0, np.where(ring, alpha, 1.0))
    return a.astype('float32')


def _holes(m: np.ndarray, min_px: int) -> np.ndarray:
    """The large connected regions of a mask (4-connected), found by labelling a downscaled copy row-run by row-run."""
    h, w = m.shape
    step = 2 if h * w > 600_000 else 1
    sm = m[::step, ::step]
    lab = np.zeros(sm.shape, np.int32)
    parent = [0]

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    nxt = 1
    for y in range(sm.shape[0]):
        row = sm[y]
        x = 0
        while x < row.size:
            if not row[x]:
                x += 1
                continue
            x0 = x
            while x < row.size and row[x]:
                x += 1
            above = set(int(v) for v in lab[y - 1, x0:x] if v) if y else set()
            if above:
                roots = sorted({find(v) for v in above})
                r = roots[0]
                for o in roots[1:]:
                    parent[o] = r
            else:
                parent.append(nxt)
                r, nxt = nxt, nxt + 1
            lab[y, x0:x] = r
    roots = np.array([find(i) for i in range(nxt)], np.int32)
    lab = roots[lab]
    ids, counts = np.unique(lab[lab > 0], return_counts=True)
    keep = ids[counts * step * step >= min_px]
    big = np.isin(lab, keep)
    if step > 1:
        big = np.repeat(np.repeat(big, step, 0), step, 1)[:h, :w]
    return big & m


def unmix(rgb: np.ndarray, alpha: np.ndarray, paper: np.ndarray) -> np.ndarray:
    """c = a·fg + (1 − a)·paper → fg: an edge pixel carries no paper-coloured fringe once it moves over another picture."""
    a = np.maximum(alpha[..., None], 1e-3)
    fg = (rgb.astype('float32') - (1 - a) * paper[None, None]) / a
    return np.clip(np.where(alpha[..., None] > 0.02, fg, rgb), 0, 255).astype('uint8')


def ink_box(alpha: np.ndarray, pad: int = 6) -> tuple[int, int, int, int] | None:
    """The box of a piece's ink: rows and columns that hold a few solid pixels (a speck of dust does not widen it)."""
    solid = alpha > 128
    h, w = solid.shape
    cols = np.nonzero(solid.sum(0) >= max(3, int(0.004 * h)))[0]
    rows = np.nonzero(solid.sum(1) >= max(3, int(0.004 * w)))[0]
    if not len(cols) or not len(rows):
        return None
    return max(0, cols[0] - pad), max(0, rows[0] - pad), min(w, cols[-1] + 1 + pad), min(h, rows[-1] + 1 + pad)


def cut_out(im: Image.Image, share: float = 0.72, crop: bool = True) -> tuple[Image.Image, bool]:
    """(RGBA piece cropped to its ink, True) for a piece on flat paper; (RGB picture, False) for a full scene. A depth
    layer is not cropped: its parts must stay registered on one another."""
    if im.mode == 'RGBA' and np.asarray(im.getchannel('A')).min() < 250:
        box = ink_box(np.asarray(im.getchannel('A'))) if crop else None
        return (im.crop(box) if box else im), True
    rgb = np.asarray(im.convert('RGB'))
    paper = flat_paper(rgb, share)
    if paper is None:
        return im.convert('RGB'), False
    a = key_paper(rgb, paper)
    if not 0.004 <= (a > 0.5).mean() <= 0.9:   # nothing on the paper, or the "paper" was a bright scene
        return im.convert('RGB'), False
    out = np.dstack([unmix(rgb, a, paper), (a * 255).astype('uint8')])
    piece = Image.fromarray(out, 'RGBA')
    box = ink_box(out[..., 3]) if crop else None
    return (piece.crop(box) if box else piece), True


def _fit(im: Image.Image, long_side: int) -> Image.Image:
    s = long_side / max(im.size)
    return im if s >= 1 else im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)


def prepare(data: bytes, stem: str, info: dict, out_dir: Path) -> dict:
    """Decode, cut out (when on paper), shrink and save one piece. Returns its index row (without the drive id)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    if info['cls'] == 'clip':
        p = out_dir / f'{stem}.mp4'
        p.write_bytes(data)
        return {'stem': stem, **info, 'file': p.name, 'keyed': False}
    with Image.open(io.BytesIO(data)) as im:
        im.load()
        im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
    keyed = False
    if info['cls'] in CUT and not (info['cls'] == 'layer' and info.get('part') in ('full', 'bg')):
        layer = info['cls'] == 'layer'
        im, keyed = cut_out(im, 0.45 if layer else 0.72, crop=not layer)
    im = _fit(im, PIECE_MAX if keyed else SCENE_MAX)
    p = out_dir / f'{stem}.webp'
    tmp = p.with_suffix('.part.webp')
    im.save(tmp, 'WEBP', quality=90, method=4)
    tmp.replace(p)
    return {'stem': stem, **info, 'file': p.name, 'keyed': keyed, 'w': im.width, 'h': im.height}


# ------------------------------------------------------------------ listing and syncing (the runner)
def list_folder(fid: str = FOLDER) -> list[dict]:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    from matchday.drive_fetch import listing  # the one Drive reader (no key, no login)
    out = []
    for eid, title, is_folder in listing(fid):
        if is_folder:
            for sub in list_folder(eid):
                out.append(sub)
            continue
        out.append({'id': eid, 'name': title})
    return out


def fetch(fid: str, tries: int = 3) -> bytes:
    import urllib.request
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(URL.format(id=fid), headers={'User-Agent': 'Mozilla/5.0 (FAN LIFE cinema library)'})
            with urllib.request.urlopen(req, timeout=180) as r:
                data = r.read()
            if data[:64].lstrip().lower().startswith((b'<!doctype html', b'<html')):
                raise OSError('Drive answered with a page, not the file')
            return data
        except OSError as e:
            last = e
            time.sleep(2 * (attempt + 1))
    raise OSError(str(last))


def fetch_url(url: str, tries: int = 3) -> bytes:
    """A Flow-made piece from the studio's private bucket (a signed url, studio/cinema/flow_library.py)."""
    import urllib.request
    last = None
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                return r.read()
        except OSError as e:
            last = e
            time.sleep(2 * (attempt + 1))
    raise OSError(str(last))


def list_flow() -> list[dict]:
    """The pieces the Flow operator made, from the studio (worker door, cron secret): {id: flow:<stem>, name, url}.
    The id and name are stable (the cache key); the url is a fresh one-hour link used only to download."""
    base, secret = os.environ.get('STORIES_URL', ''), os.environ.get('FAN_LIFE_CRON_SECRET', '')
    if not base or len(secret) < 32:
        return []
    import urllib.request
    req = urllib.request.Request(base.rstrip('/') + '/api/master/stories/worker', method='POST',
                                 data=json.dumps({'op': 'library_flow', 'worker': 'library-list'}).encode(),
                                 headers={'Authorization': 'Bearer ' + secret, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; FanLife-Studio/1.0; +https://fanlife.dubelteam.com)'})
    with urllib.request.urlopen(req, timeout=60) as r:
        rows = json.load(r).get('pieces') or []
    return [{'id': f"flow:{p['stem']}", 'name': f"{p['stem']}.png", 'url': p['url']} for p in rows
            if re.fullmatch(r'[a-z0-9-]{4,90}', str(p.get('stem') or '')) and str(p.get('url') or '').startswith('https://')]


def sync(listing: list[dict], dest: Path, log=print, getter=fetch, budget_s: float = 1500.0) -> dict:
    """Download what is new in the listing, prepare it, write `dest/index.json`. Idempotent: a piece already prepared
    from the same Drive file (and the same VERSION) is kept as it is."""
    dest = Path(dest)
    ready = dest / 'ready'
    ready.mkdir(parents=True, exist_ok=True)
    old = {}
    ip = dest / 'index.json'
    if ip.exists():
        try:
            j = json.loads(ip.read_text())
            if j.get('version') == VERSION:
                old = {p['drive_id']: p for p in j.get('pieces') or [] if p.get('drive_id')}
        except ValueError:
            pass
    pieces, report, seen, t0 = [], {'new': [], 'kept': 0, 'skipped': [], 'failed': []}, set(), time.time()
    for f in sorted(listing, key=lambda f: f['name']):
        stem = stem_of(f['name'])
        if not stem:
            report['skipped'].append({'name': f['name'], 'why': 'not a picture or a clip'})
            continue
        info = classify(stem)
        if info['cls'] == 'skip':
            report['skipped'].append({'name': f['name'], 'why': info['why']})
            continue
        if stem in seen:
            report['skipped'].append({'name': f['name'], 'why': f'a second file named {stem}'})
            continue
        seen.add(stem)
        row = old.get(f['id'])
        if row and (ready / row['file']).exists():
            pieces.append(row)
            report['kept'] += 1
            continue
        if time.time() - t0 > budget_s:
            report['failed'].append({'name': f['name'], 'why': 'time budget (the next run carries on)'})
            continue
        try:
            data = fetch_url(f['url']) if f.get('url') else getter(f['id'])
            row = {**prepare(data, stem, info, ready), 'drive_id': f['id']}
        except Exception as e:  # noqa: BLE001 — reported by name, never guessed
            report['failed'].append({'name': f['name'], 'why': f'{type(e).__name__}: {str(e)[:120]}'})
            log(f'Cinema library: {f["name"]} — {type(e).__name__}')
            continue
        pieces.append(row)
        report['new'].append(stem)
    tmp = ip.with_suffix('.part')
    tmp.write_text(json.dumps({'version': VERSION, 'folder': FOLDER, 'pieces': pieces}, ensure_ascii=False))
    tmp.replace(ip)
    log(f"Cinema library: {len(pieces)} pieces ({len(report['new'])} new, {report['kept']} kept, "
        f"{len(report['skipped'])} not for documentaries, {len(report['failed'])} failed)")
    return report


# ------------------------------------------------------------------ the render side
class Library:
    def __init__(self, root: Path, pieces: list[dict]):
        self.root = Path(root)
        self.pieces = [p for p in pieces if (self.root / 'ready' / p['file']).exists()]
        self.by = {p['stem']: p for p in self.pieces}

    def __len__(self):
        return len(self.pieces)

    def path(self, stem: str) -> Path | None:
        p = self.by.get(stem)
        return self.root / 'ready' / p['file'] if p else None

    def of(self, cls: str) -> list[dict]:
        return [p for p in self.pieces if p['cls'] == cls]

    def group(self, group: str) -> dict[str, dict]:
        return {p['part']: p for p in self.pieces if p.get('group') == group}


@lru_cache(maxsize=4)
def _load(root: str, mtime: float) -> Library | None:
    try:
        j = json.loads((Path(root) / 'index.json').read_text())
    except (OSError, ValueError):
        return None
    if j.get('version') != VERSION:
        return None
    lib = Library(Path(root), j.get('pieces') or [])
    return lib if len(lib) else None


def load(root: str | Path | None = None) -> Library | None:
    """The prepared library, or None (no library: the film renders as before)."""
    root = root or os.environ.get(ENV, '')
    if not root:
        return None
    ip = Path(root) / 'index.json'
    if not ip.exists():
        return None
    return _load(str(Path(root)), ip.stat().st_mtime)


def families(rgb: np.ndarray, min_share: float = 0.004) -> set[str]:
    """The saturated colour families a picture prints (the QA's bands)."""
    a = rgb.astype('float32') / 255
    mx, mn = a.max(-1), a.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1e-6)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    d = np.maximum(mx - mn, 1e-6)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    ok = (sat >= 0.35) & (mx >= 0.35)
    fam = {'red': (h <= 18) | (h >= 342), 'yellow': (h >= 38) & (h <= 70), 'green': (h >= 90) & (h <= 170),
           'blue': (h >= 190) & (h <= 260)}
    return {k for k, m in fam.items() if (m & ok).mean() >= min_share}


def paint(im: Image.Image, colour: str | None, accent: str | None, bans: list[str]) -> Image.Image:
    """A `-kr` piece's signal red becomes the club's colour; then every banned family is scrubbed (rule 95). Alpha kept."""
    from ..paper import recolor, scrub
    alpha = im.getchannel('A') if im.mode == 'RGBA' else None
    rgb = im.convert('RGB')
    if colour == 'kr' and accent:
        rgb = recolor(rgb, accent)
    rgb = scrub(rgb, bans)
    if alpha is not None:
        rgb = rgb.convert('RGBA')
        rgb.putalpha(alpha)
    return rgb


@lru_cache(maxsize=8)
def _lut(colour: str | None, accent: str | None, bans: tuple[str, ...]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """`paint` over a 64-level colour cube: the painted colour of each cell, the cells deep inside the painted region
    (they and all their neighbours change), and the cells at its edge (some neighbour changes, so a pixel there could
    fall either way)."""
    v = (np.arange(64, dtype=np.uint16) << 2) + 2
    cube = np.stack(np.meshgrid(v, v, v, indexing='ij'), -1).reshape(512, 512, 3).astype('uint8')
    out = np.asarray(paint(Image.fromarray(cube, 'RGB'), colour, accent, list(bans)).convert('RGB'))
    ch = (np.abs(out.astype('int16') - cube.astype('int16')).max(-1) > 0).reshape(64, 64, 64)
    grown, inner = ch.copy(), ch.copy()
    for ax in range(3):
        for sh in (1, -1):
            r = np.roll(ch, sh, axis=ax)
            grown |= r
            inner &= r
    c = cube.reshape(-1, 3).astype('float32')
    sat = (c.max(1) - c.min(1)) / np.maximum(c.max(1), 1)
    # at the edge only a saturated cell needs the exact painting: a pale pixel the scrub might or might not have touched
    # (saturation near its 0.18 line) stays far below the 0.35 at which the QA counts a colour, either way
    edge = (grown & ~inner).reshape(-1) & (sat >= 0.26)
    return out.reshape(-1, 3), inner.reshape(-1), edge


def paint_fast(rgb: np.ndarray, colour: str | None, accent: str | None, bans: list[str]) -> np.ndarray:
    """`paint` for a moving picture (a clip, every frame). A pixel deep inside the painted region takes its cell's
    painted colour (plus its own offset inside the cell, so gradients stay smooth); a pixel at the region's edge is
    painted exactly by `paint` itself; every other pixel keeps its value. Several times faster than converting every
    frame to HSV, and the banned families are held to the same zero (the edge is always painted exactly)."""
    if not bans and not (colour == 'kr' and accent):
        return rgb
    lut, inner, edge = _lut(colour, accent, tuple(sorted(bans)))
    q = rgb >> 2
    idx = (q[..., 0].astype(np.int32) << 12) | (q[..., 1].astype(np.int32) << 6) | q[..., 2]
    hin, hedge = inner[idx], edge[idx]
    out = rgb.copy()
    if hin.any():
        off = rgb[hin].astype(np.int16) - ((q[hin].astype(np.int16) << 2) + 2)
        out[hin] = np.clip(lut[idx[hin]].astype(np.int16) + off, 0, 255).astype(np.uint8)
    if hedge.any():
        px = rgb[hedge]
        out[hedge] = np.asarray(paint(Image.fromarray(px.reshape(1, -1, 3), 'RGB'), colour, accent, bans).convert('RGB')).reshape(-1, 3)
    return out


def rig_for(stem: str) -> Path | None:
    """A puppet SHEET is pinned into a rig only from a written rig (comic/rigs/<stem>.json, rig.py's format): the joints
    of an owner's sheet are not guessed. Without one the `-pose` picture performs as one piece."""
    p = Path(__file__).resolve().parents[2] / 'comic' / 'rigs' / f'{stem}.json'
    return p if p.exists() else None


def listing_key(listing: list[dict]) -> str:
    """The cache key of a listing: the ids and names, sorted (a renamed or added file changes it)."""
    s = '\n'.join(sorted(f"{f['id']}\t{f['name']}" for f in listing))
    return hashlib.sha256(f'v{VERSION}\n{s}'.encode()).hexdigest()[:20]


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    a1 = sub.add_parser('list')
    a1.add_argument('--out', type=Path, required=True)
    a1.add_argument('--folder', default=FOLDER)
    a2 = sub.add_parser('sync')
    a2.add_argument('--listing', type=Path, required=True)
    a2.add_argument('--dest', type=Path, required=True)
    a2.add_argument('--report', type=Path)
    a = ap.parse_args(argv)
    if a.cmd == 'list':
        try:
            items = list_folder(a.folder)
        except Exception as e:  # noqa: BLE001 — the film renders without the library
            print(f'Cinema library: the folder did not list ({type(e).__name__}: {e})')
            items = []
        try:
            flow = list_flow()
            items += flow
            print(f'Cinema library: {len(flow)} Flow-made pieces')
        except Exception as e:  # noqa: BLE001 — the owner's drawings still make the film
            print(f'Cinema library: the Flow pieces did not list ({type(e).__name__})')
        a.out.write_text(json.dumps({'key': listing_key(items), 'files': items}, ensure_ascii=False))
        print(f'Cinema library: {len(items)} files listed · key {listing_key(items)}')
        return 0
    items = json.loads(a.listing.read_text()).get('files') or []
    if not items:
        print('Cinema library: an empty listing — the cached library (if any) is kept as it is')
        return 0
    rep = sync(items, a.dest)
    if a.report:
        a.report.write_text(json.dumps(rep, indent=1, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
