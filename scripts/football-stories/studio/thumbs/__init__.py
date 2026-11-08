"""The thumbnail hook engine — one for every category (owner, 5.11.2026: "When a thumbnail image is created there must
be a HOOK tied to the club / the story / the event, to grab attention — for all categories").

    for_film(script, ledger, palette, out)          → thumbnail-1..3.jpg + thumbnail-short.jpg (documentary / VOX)
    for_classified(ep, panels, tone, tone_hex, out) → the same names, in the case-folder look
    for_vlog(ep, cut, frame, out)                   → thumbnail.jpg (+ -2, -3, -short) for I WAS THERE

Each film gets three variants with different hooks — the score, the emotion, the question — and a 1080×1920 cover for
its Shorts. `thumbnails.json` beside them says, per file, the hook, the claims it rests on, the picture it used and the
legibility measured at YouTube's smallest size (168×94). See docs/fanlife/68-thumbnail-hooks.md.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from PIL import Image

from . import art, compose, hooks
from .render import legibility

SHORT_NAME = 'thumbnail-short.jpg'


def _save(B, path: Path, bans: list[str] | None = None, size=None) -> Path:
    im = B.rgb()
    if bans:   # the picture's own colour can never print a rival's family (rule 95; yellow for Hapoel, rule 8)
        from ..cinema.library import families
        import numpy as np
        if families(np.asarray(im)) & set(bans):
            from ..paper import scrub
            im = scrub(im, bans)
    if size and im.size != size:
        im = im.resize(size, Image.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, quality=90, optimize=True)
    return path


def _director(script: dict | None) -> str | None:
    d = (script or {}).get('_director') or (script or {}).get('director_id')
    return d if d in ('broadcaster', 'terrace', 'trailer') else None


def _public(h: dict) -> dict:
    return {k: v for k, v in h.items() if k in ('kind', 'headline', 'chip', 'label', 'sub', 'kicker', 'claims', 'tag', 'source', 'lines',
                                                 'concept', 'opponent')}


def cutting(ledger: dict, h: dict) -> dict | None:
    """The newspaper cutting a documentary cover pins: a press claim the ledger holds (outlet, headline, date exactly as
    they ran), else the hook's own night as a dateline. Nothing is typed here."""
    by = {c['id']: c for c in ledger.get('claims') or []}
    press = [c['fact'] for c in ledger.get('claims') or [] if (c.get('fact') or {}).get('kind') == 'press' and c['fact'].get('headline')]
    want = [by.get(x) for x in (h.get('claims') or [])]
    for c in want:
        if c and c['fact'].get('kind') == 'press':
            return {k: c['fact'].get(k) for k in ('outlet', 'headline', 'date')}
    if press:
        f = press[0]
        return {k: f.get(k) for k in ('outlet', 'headline', 'date')}
    for c in want:
        f = (c or {}).get('fact') or {}
        if f.get('kind') == 'match' and f.get('date'):
            return {'outlet': 'MATCH REPORT', 'date': f"{f['date']} · {f.get('competition') or ''}".strip(' ·')}
    return None


def for_film(script: dict | None, ledger: dict, palette, out: Path, director: str | None = None) -> list[dict]:
    """A documentary's three thumbnails and its Shorts cover. Returns the rows youtube.json lists."""
    out = Path(out)
    hs = hooks.film_hooks(script, ledger)
    if not hs:   # a ledger with no match the story can read: the club's own name is the one thing it can always say
        hs = [{'kind': 'emotion', 'headline': hooks.short_name(ledger.get('club_name'), 22) or 'FOOTBALL STORIES',
               'kicker': hooks.kicker(ledger, None, False), 'claims': [], 'tag': 'terrace', 'target': 'headline'}]
    director = director if director in ('broadcaster', 'terrace', 'trailer') else _director(script)
    crest = art.crest(ledger.get('club_id'))
    rows, avoid = [], set()
    pics = []
    for i, h in enumerate(hs, 1):
        pic = art.documentary_picture(ledger, h, palette, salt=i, avoid=avoid)
        avoid.add(art.base_key(pic.key))
        if pic.figure_key:
            avoid.add(pic.figure_key)
        pics.append(pic)
        B = compose.documentary(h, pic, palette, crest, director, seed=i, cut=cutting(ledger, h))
        p = _save(B, out / f'thumbnail-{i}.jpg', palette.render_bans)
        rows.append({'file': p.name, 'size': [1280, 720], **_public(h), 'picture': {'key': pic.key, 'kind': pic.kind, 'figure': pic.figure_key},
                     'director': director, 'legibility': legibility(B)})
    S = compose.documentary_short(hs[0], pics[0], palette, crest, director, seed=1)
    sp = _save(S, out / SHORT_NAME, palette.render_bans)
    rows.append({'file': sp.name, 'size': [1080, 1920], 'shorts_cover': True, **_public(hs[0]),
                 'picture': {'key': pics[0].key, 'kind': pics[0].kind}, 'legibility': legibility(S, small=(94, 168))})
    (out / 'thumbnails.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    return rows


def for_classified(ep: dict, panels: dict, tone: str, tone_hex: str, out: Path) -> list[Path]:
    """A CLASSIFIED FILE's thumbnails (thumbnail-<k>.jpg, k from 1, in the approved package's order) and its Shorts
    cover. `panels` maps a panel name to its file (or None when the panel is missing)."""
    out = Path(out)
    backdrop = art.classified_backdrop(tone)
    made, rows = [], []
    hs = hooks.classified_hooks(ep)
    for k, h in enumerate(hs, 1):
        src = panels.get(h.get('panel'))
        panel = None
        if src and Path(src).exists():
            with Image.open(src) as im:
                panel = im.convert('RGB')
        B = compose.classified(h, panel, backdrop, ep.get('number', '00'), ep.get('title', ''), tone, tone_hex, seed=k)
        p = _save(B, out / f'thumbnail-{k}.jpg')
        made.append(p)
        rows.append({'file': p.name, 'size': [1280, 720], **_public(h), 'panel': h.get('panel'), 'legibility': legibility(B)})
        if k == 1:
            S = compose.classified_short(h, panel, backdrop, ep.get('number', '00'), ep.get('title', ''), tone, tone_hex, seed=k)
            sp = _save(S, out / SHORT_NAME)
            rows.append({'file': sp.name, 'size': [1080, 1920], 'shorts_cover': True, **_public(h), 'legibility': legibility(S, small=(94, 168))})
    (out / 'thumbnails.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    yt = out / 'youtube.json'
    if yt.exists():   # the package lists the thumbnails and their hooks beside the title it goes with
        try:
            meta = json.loads(yt.read_text(encoding='utf-8'))
            meta['thumbnails'] = rows
            yt.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        except ValueError:
            pass
    return made


def _club_of(ep: dict) -> str | None:
    cid = (ep.get('auto') or {}).get('club_id') or ep.get('club_id')
    if cid:
        return cid
    fx = ep.get('fixture') or {}
    for n in (fx.get('home'), fx.get('away')):
        slug = re.sub(r'[^a-z0-9]+', '-', (n or '').lower()).strip('-')
        if slug and art.crest(slug):
            return slug
    return None


def for_vlog(ep: dict, cut: str, frame: Path, out: Path, bans: list[str] | None = None) -> list[dict]:
    """I WAS THERE: thumbnail.jpg (the episode's own line on the score), thumbnail-2/-3 (the other hooks) and
    thumbnail-short.jpg, from one frame of the owner's footage."""
    from ..common import Palette, PAPER
    out = Path(out)
    bans = list(bans if bans is not None else (ep.get('auto') or {}).get('bans') or [])
    try:
        pal = Palette(_club_of(ep) or 'iwt', 'I WAS THERE', ep.get('accent') or '#D71920', PAPER, bans)
    except ValueError:      # an accent in a banned family: the Weekly's own ink takes over (Palette.accent)
        pal = Palette(_club_of(ep) or 'iwt', 'I WAS THERE', '#15130F', PAPER, bans)
    crest = art.crest(_club_of(ep))
    with Image.open(frame) as im:
        fr = im.convert('RGB')
    place = (ep.get('fixture') or {}).get('ground') or (ep.get('fixture') or {}).get('city') or ''
    number = re.match(r'iwt-(\d+)', ep.get('id') or '')
    episode = str(int(number.group(1))) if number else ''
    hs = [h for h in hooks.vlog_hooks(ep, cut) if not hooks.vlog_numbers_ok(h, ep)]
    rows = []
    names = ['thumbnail.jpg', 'thumbnail-2.jpg', 'thumbnail-3.jpg']
    for i, h in enumerate(hs):
        B = compose.vlog(h, fr, pal, crest, episode, place, seed=i + 1)
        p = _save(B, out / names[i], bans)
        rows.append({'file': p.name, 'size': [1280, 720], **_public(h), 'legibility': legibility(B)})
    if hs:
        S = compose.vlog_short(hs[0], fr, pal, crest, episode, place, seed=1)
        sp = _save(S, out / SHORT_NAME, bans)
        rows.append({'file': sp.name, 'size': [1080, 1920], 'shorts_cover': True, **_public(hs[0]), 'legibility': legibility(S, small=(94, 168))})
    (out / 'thumbnails.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    return rows
