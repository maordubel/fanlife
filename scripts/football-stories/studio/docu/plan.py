"""DOCU as the studio's engine (owner, 9.11.2026: "from now on this is the graphic minimum").

The pipeline's plan — every shot with its own start, length, narration, word timings, claims and the owner picture chosen for
it — drawn in the DOCU look instead of the paper board: the owner's art full frame with a slow move, the scoreboard with
both crests, chapter tickets, the ledger, rule cards, lead banners, the follow card and the channel card. The timing is the
plan's to the frame, so the pipeline's own narrator, crowd and music mix (audio.build_mix) lands where it always did; the
picture is silent and carries burned subtitles cut from the narrator's word timings.

Every figure on screen is read from a claim (score, date, competition, ground, scorer, minute) or written by the script the
claim check already passed. Nothing here invents a number.

    engine 'docu' — the default for a documentary film (STORIES_DOCU=0 or look 'vox' / 'vox-hf' / 'classic' keep the old ones)
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import time
from datetime import date as Date
from pathlib import Path

from ..common import FPS, Palette, StageError, read_json, write_json
from . import build as B

ENGINE = 'docu'
NAMED = {'tunnel': 'beat:common/tunnel-walk-out', 'terrace-crowd': 'beat:common/terrace-full-kr',
         'terrace-empty': 'beat:common/old-ground-wide-kr', 'supporter': 'beat:common/supporter-cap-old-ground'}
FOLLOW = ('follow-seat-kept-kr', 'follow-turnstile-welcome-kr', 'follow-away-end-gap-kr', 'follow-pub-door-kr')
WORDS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN']
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
NEUTRAL = '#2B2A33'   # an opponent with no recorded colour wears ink, never a guessed kit


def wanted(brief: dict | None) -> bool:
    b = brief or {}
    if os.environ.get('STORIES_DOCU', '1') == '0':
        return False
    look = b.get('look') or b.get('engine') or b.get('visual_style')
    return look in (None, '', 'docu', 'auto', 'archive', 'documentary')


def long_date(iso: str | None) -> str:
    if not iso:
        return ''
    try:
        d = Date.fromisoformat(str(iso)[:10])
    except ValueError:
        return ''
    return f'{d.day} {MONTHS[d.month - 1]} {d.year}'


def media(key: str | None) -> Path | None:
    from ..paper import beat_path, clip_path
    if not key:
        return None
    key = NAMED.get(key, key)
    return beat_path(key) or clip_path(key)


def crests(names: list[str]) -> dict[str, str | None]:
    """The marketing kit's crest finder (the owner's packs first, then the shared crest library), asked once for the film."""
    names = sorted({n for n in names if n})
    if not names:
        return {}
    vis = Path(__file__).resolve().parents[4] / 'scripts' / 'marketing' / 'kit' / 'visual.mjs'
    js = (f"const m=await import({json.dumps(vis.as_uri())});const o={{}};"
          f"for(const n of {json.dumps(names)}){{try{{o[n]=await m.crestPath(n)}}catch{{o[n]=null}}}}console.log(JSON.stringify(o))")
    try:
        r = subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True, timeout=90)
        return json.loads(r.stdout.strip().splitlines()[-1]) if r.returncode == 0 and r.stdout.strip() else {n: None for n in names}
    except Exception:
        return {n: None for n in names}


class Adapter:
    """plan + ledger + palette → DOCU beats at the plan's own times, and the pictures they need."""

    def __init__(self, job_dir: Path, plan: dict, palette: Palette, ledger: dict, script: dict):
        self.jd, self.plan, self.pal, self.led, self.script = job_dir, plan, palette, ledger, script
        self.by = {c['id']: c for c in ledger.get('claims', [])}
        self.files: dict[str, Path] = {}
        self.club = palette.club_name
        self.cues: dict[int, list] = {}
        names = [palette.club_name]
        for c in self.by.values():
            f = c.get('fact') or {}
            if f.get('kind') == 'match':
                names += [f.get('home'), f.get('away'), f.get('opponent')]
        self.crest = crests(names)

    # ── assets ──────────────────────────────────────────────────────────────────────────────────────────────────────
    def asset(self, p: Path | str | None, prefix: str = 'a') -> str | None:
        if not p:
            return None
        p = Path(p)
        if not p.exists():
            return None
        name = f'{prefix}-{hashlib.sha1(str(p).encode()).hexdigest()[:10]}{p.suffix.lower()}'
        self.files[name] = p
        return name

    def crest_of(self, name: str | None) -> str | None:
        if not name:
            return None
        own = Path(__file__).resolve().parents[4] / 'public' / 'crests' / f'{self.pal.club_id}.png'
        if name == self.club and own.exists():
            return self.asset(own, 'crest')
        return self.asset(self.crest.get(name), 'crest')

    def picture(self, s: dict) -> tuple[str | None, bool]:
        v = s['visual']
        for key in (s.get('required_asset'), v.get('art') if v['type'] == 'illustration' else None, v.get('backdrop'),
                    (s.get('cinema') or {}).get('broll')):
            p = media(key) if key and key != 'paper' else None
            if p:
                return self.asset(p, 'img'), p.suffix.lower() == '.mp4'
        if v['type'] == 'follow':
            p = media(f'beat:common/{FOLLOW[s["n"] % len(FOLLOW)]}')
            if p:
                return self.asset(p, 'img'), False
        p = media('beat:common/terrace-full-kr')
        return (self.asset(p, 'img'), False) if p else (None, False)

    def fact(self, cid) -> dict:
        return (self.by.get(cid) or {}).get('fact') or {}

    # ── pieces ──────────────────────────────────────────────────────────────────────────────────────────────────────
    def back(self, s, move='push', **kw) -> dict | None:
        src, is_video = self.picture(s)
        if not src:
            return None
        if is_video:
            return {'kind': 'video', 'src': src, **{k: v for k, v in kw.items() if k in ('lt',)}}
        return {'kind': 'image', 'src': src, 'move': move, **kw}

    def scoreline(self, f: dict) -> dict:
        us_home = f.get('side') != 'away'
        us, them = (f.get('home'), f.get('away')) if us_home else (f.get('away'), f.get('home'))
        ug, tg = (f.get('score_home'), f.get('score_away')) if us_home else (f.get('score_away'), f.get('score_home'))
        return {'us': us or self.club, 'them': them or f.get('opponent') or '', 'ug': ug, 'tg': tg, 'home': us_home}

    def cap(self, f: dict) -> str:
        bits = [long_date(f.get('date')), f.get('competition'), (f.get('stage') if f.get('stage') not in (None, 'League') else None),
                ((f.get('venue') or {}).get('name') if isinstance(f.get('venue'), dict) else None)]
        return ' · '.join(b for b in bits if b).upper()

    def cue(self, n: int, at: float, kind: str):
        self.cues.setdefault(n, []).append([round(at, 2), kind])

    def shots(self, s: dict, d: float) -> list[dict]:
        v, t = s['visual'], v_type(s)
        n = s['n']
        f = self.fact(v.get('claim') or (s.get('claim_ids') or [None])[0])
        out: list[dict] = []
        if t == 'open':
            b = self.back(s, 'pull')
            out += [b] if b else []
            head = v.get('headline') or ''
            out.append({'kind': 'question', 'text': head, 'small': v.get('kicker') or '', 'dt': 0.6})
            self.cue(n, 0.2, f'crowd-bed:{d:.1f}')
        elif t == 'chapter':
            out.append({'kind': 'ticket', 'small': f'CHAPTER {WORDS[(v.get("number") or 1) - 1] if 0 < (v.get("number") or 0) <= 10 else v.get("number")}',
                        'big': (v.get('title') or '').upper(), 'line': ''})
            self.cue(n, 0.1, 'paper')
        elif t in ('score', 'versus') and f.get('kind') == 'match':
            sc = self.scoreline(f)
            bg = self.picture(s)
            out.append({'kind': 'score', 'us': B.e(sc['us']), 'them': sc['them'], 'us_goals': sc['ug'], 'them_goals': sc['tg'],
                        'us_crest': self.crest_of(sc['us']), 'them_crest': self.crest_of(sc['them']),
                        'cap': self.cap(f), 'bg': None if bg[1] else bg[0]})
            if f.get('outcome') == 'win':
                self.cue(n, 0.6, 'crowd-goal' if (s.get('cinema') or {}).get('climax') else 'stamp')
            elif f.get('outcome') == 'loss':
                self.cue(n, 0.6, f'hush:{min(3.0, d):.1f}')
            else:
                self.cue(n, 0.6, 'stamp')
        elif t == 'goal' and f.get('kind') == 'match':
            sc = self.scoreline(f)
            sco = (f.get('scorers') or [])
            k = v.get('scorer') if isinstance(v.get('scorer'), int) else 0
            who = sco[k] if 0 <= k < len(sco) else {}
            b = self.back(s, 'slam', tag={'small': f"{who['minute']}'" if who.get('minute') is not None else 'GOAL', 'big': who.get('name') or ''},
                          mini={'home': f.get('home') or '', 'score': f'{f.get("score_home")}–{f.get("score_away")}', 'away': f.get('away') or '', 'at': 1.2})
            out += [b] if b else []
            self.cue(n, 0.3, 'crowd-goal')
        elif t == 'matchday' and f.get('kind') == 'match':
            sc = self.scoreline(f)
            b = self.back(s, 'panr', tag={'small': self.cap(f)[:60], 'big': f'{"v" if sc["home"] else "at"} {sc["them"]}'})
            out += [b] if b else []
            self.cue(n, 0.4, 'whoosh')
        elif t == 'ticket' and f.get('kind') == 'match':
            b = self.back(s, 'push', veil=0.5)
            out += [b] if b else []
            out.append({'kind': 'ticket', 'small': (f.get('competition') or '').upper(), 'big': f'{f.get("home", "")} v {f.get("away", "")}'.upper(),
                        'line': ' · '.join(x for x in (long_date(f.get('date')), ((f.get('venue') or {}).get('name') if isinstance(f.get('venue'), dict) else '')) if x).upper(),
                        'dt': 0.5, 'compact': True})
            self.cue(n, 0.5, 'stamp')
        elif t in ('timeline', 'form', 'run'):
            rows = []
            for cid in (v.get('claims') or s.get('claim_ids') or [])[:6]:
                g = self.fact(cid)
                if g.get('kind') != 'match':
                    continue
                sc = self.scoreline(g)
                d0 = long_date(g.get('date'))
                rows.append([f'{d0.rsplit(" ", 1)[0] if d0 else ""} · {"v" if sc["home"] else "at"} {sc["them"]}'.strip(' ·'), sc['ug'], sc['tg']])
            if rows:
                out.append({'kind': 'ledger', 'us': self.club.upper(), 'them': 'OPPONENTS', 'rows': rows, 'compact': True,
                            'title': (v.get('label') or '').upper(), 'row_at': [0.3 + 0.45 * i for i in range(len(rows))]})
                self.cue(n, 0.3, 'tick')
            else:
                b = self.back(s)
                out += [b] if b else []
        elif t == 'stat':
            b = self.back(s, 'push', veil=0.62)
            out += [b] if b else []
            out.append({'kind': 'stat', 'value': str(v.get('value') or ''), 'label': (v.get('label') or '').upper(), 'dt': 0.3})
            self.cue(n, 0.4, 'stamp')
        elif t == 'record':
            g = self.fact(v.get('claim'))
            vals = [(lab, g.get(k)) for lab, k in (('WON', 'won'), ('DRAWN', 'drawn'), ('LOST', 'lost'), ('SCORED', 'goals_for'), ('CONCEDED', 'goals_against')) if g.get(k) is not None]
            if vals:
                out.append({'kind': 'tally', 'title': (g.get('competition') or '').upper(), 'cells': vals})
                self.cue(n, 0.3, 'tick')
            else:
                b = self.back(s)
                out += [b] if b else []
        elif t == 'fact':
            b = self.back(s, 'push', veil=0.0)
            out += [b] if b else []
            out.append({'kind': 'card', 'small': (v.get('heading') or '').upper(), 'text': v.get('text') or '', 'dt': 0.5})
            self.cue(n, 0.5, 'paper')
        elif t == 'quote':
            out.append({'kind': 'quote', 'text': v.get('text') or '', 'who': v.get('who') or '', 'role': v.get('role') or ''})
            self.cue(n, 0.2, 'paper')
        elif t == 'press':
            out.append({'kind': 'card', 'small': ' · '.join(x for x in ((v.get('outlet') or '').upper(), long_date(v.get('date')).upper()) if x),
                        'text': v.get('headline') or '', 'sub': v.get('standfirst') or '', 'paper': True})
            self.cue(n, 0.2, 'paper')
        elif t == 'table':
            g = self.fact(v.get('claim'))
            rows = [[str(r.get('team') or r.get('club') or ''), r.get('position') or r.get('pos') or '', r.get('points') or r.get('pts') or '']
                    for r in (g.get('rows') or [])[:6]]
            if rows:
                out.append({'kind': 'ledger', 'us': 'POS', 'them': 'PTS', 'rows': rows, 'compact': True, 'title': (g.get('competition') or '').upper()})
            else:
                b = self.back(s)
                out += [b] if b else []
        elif t == 'turning':
            b = self.back(s, 'slam')
            out += [b] if b else []
            out.append({'kind': 'lead', 'text': (v.get('title') or '').upper(), 'sub': v.get('subtitle') or '', 'dt': 0.5})
            self.cue(n, 0.5, 'sting')
        elif t == 'race':
            b = self.back(s, 'panl')
            out += [b] if b else []
            if v.get('label'):
                out.append({'kind': 'lead', 'text': v['label'].upper(), 'dt': 0.6})
        elif t == 'trailer':
            b = self.back(s, 'slam', veil=0.5)
            out += [b] if b else []
            out.append({'kind': 'question', 'text': '|'.join(v.get('lines') or []), 'dt': 0.3})
            self.cue(n, 0.3, 'drum')
        elif t == 'map':
            pins = []
            for cid in (v.get('claims') or [])[:4]:
                g = self.fact(cid)
                ven = (g.get('venue') or {}).get('name') if isinstance(g.get('venue'), dict) else None
                if ven and ven not in pins:
                    pins.append(ven)
            b = self.back(s, 'panr', lt=[(v.get('label') or '').upper(), ' · '.join(pins)] if (v.get('label') or pins) else None)
            out += [b] if b else []
        elif t == 'follow':
            b = self.back(s, 'push', veil=0.45)
            out += [b] if b else []
            out.append({'kind': 'follow', 'club': self.club, 'dt': 0.4, 'press_at': max(0.8, d - 2.2)})
            self.cue(n, max(0.8, d - 2.2), 'pop')
        elif t == 'end':
            title = (self.script.get('title_candidates') or [{}])[self.script.get('selected', 0) or 0].get('title') if self.script.get('title_candidates') else ''
            out.append({'kind': 'end', 'title': title or self.club, 'line': 'YouTube · @FanLifeFootballStories'})
            self.cue(n, 0.2, 'end')
        else:   # an illustration, or a card whose claim is not a match: the owner's picture with its caption
            cap = v.get('caption')
            b = self.back(s, ('pull', 'push', 'panl', 'panr')[n % 4], **({'tag': {'small': '', 'big': cap}} if cap and len(cap) <= 28 else {}))
            out += [b] if b else []
        return [x for x in out if x]

    def beats(self) -> list[dict]:
        out = []
        for s in self.plan['shots']:
            t, d = s['start'], s['frames'] / FPS
            b = {'t': t, 'd': d, 'shots': self.shots(s, d)}
            if s.get('narration') and s.get('voice_at') is not None and v_type(s) != 'end':
                b['subs'] = subtitles(s)
            out.append(b)
        return out


def v_type(s: dict) -> str:
    return s['visual']['type']


def subtitles(s: dict, limit: int = 64) -> list[tuple[str, float, float]]:
    """The narrator's line in two-line pieces, each on screen from its first word to its last (the word timings the
    voice step measured), so a subtitle never runs ahead of the voice."""
    words = s.get('words') or []
    at0 = s['voice_at']
    parts = B.chunks(s['narration'], limit)
    if not words:
        total = sum(len(x) for x in parts) or 1
        out, at = [], at0
        for p in parts:
            dd = (s.get('voice_dur') or 2.0) * len(p) / total
            out.append((p, at, dd))
            at += dd
        return out
    out, i = [], 0
    for p in parts:
        k = len(p.split())
        ws = words[i:i + k] or words[-1:]
        i += k
        a, z = at0 + ws[0]['start'], at0 + ws[-1]['end']
        out.append((p, a, max(0.6, z - a + 0.15)))
    return out


def write_project(job_dir: Path, plan: dict, palette: Palette, root: Path) -> tuple[Path, float, dict]:
    ledger = read_json(job_dir / 'ledger.json')
    script = read_json(job_dir / 'script.json')
    ad = Adapter(job_dir, plan, palette, ledger, script)
    beats = ad.beats()
    if root.exists():
        shutil.rmtree(root)
    (root / 'assets' / 'img').mkdir(parents=True)
    (root / 'assets' / 'fonts').mkdir(parents=True)
    for name, p in ad.files.items():
        shutil.copyfile(p, root / 'assets' / 'img' / name)
    for _, f in B.FACES:
        shutil.copyfile(B.FONTS / f'{f}.woff2', root / 'assets' / 'fonts' / f'{f}.woff2')
    shutil.copyfile(B.GSAP, root / 'assets' / 'gsap.min.js')
    fl = Path(__file__).resolve().parents[4] / 'public' / 'brand' / 'fanlife' / 'logo-512.png'
    if fl.exists():
        shutil.copyfile(fl, root / 'assets' / 'img' / 'fanlife.png')
    them = NEUTRAL
    sb = {'palette': {'us': palette.accent, 'them': them}, 'silent': True}
    film = B.Film(sb, root)
    film.agg_moves = []
    D = film.build(beats)
    D = max(D, plan['duration'])
    (root / 'index.html').write_text(film.page(D), encoding='utf-8')
    (root / 'hyperframes.json').write_text(json.dumps({'name': 'docu', 'width': B.W, 'height': B.H, 'fps': FPS}) + '\n')
    return root / 'index.html', D, ad.cues


def render_film(job_dir: Path, plan: dict, palette: Palette, log, workers: int | None = None, tick=None) -> Path:
    """The pipeline's render contract: shot cue files for the mix, one silent picture.mp4 back."""
    from ..hyperframes.render import hf_render
    t0 = time.time()
    proj = job_dir / 'docu'
    _, D, cues = write_project(job_dir, plan, palette, proj)
    sd = job_dir / 'shots'
    sd.mkdir(parents=True, exist_ok=True)
    for s in plan['shots']:
        write_json(sd / f'shot-{s["n"]:04d}.cues.json', {'cues': cues.get(s['n'], []), 'kind': s['visual']['type'], 'engine': ENGINE,
                                                        'required_asset': s.get('required_asset')})
    log(f'DOCU: {len(plan["shots"])} shots composed in {time.time() - t0:.1f}s ({D / 60:.2f} min)')
    if tick:
        tick(1, 3)
    raw = job_dir / 'docu.mp4'
    hf_render(proj, raw, FPS, log, workers=workers)
    if tick:
        tick(2, 3)
    pic = job_dir / 'picture.mp4'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(raw), '-an', '-r', str(FPS), '-c:v', 'libx264', '-preset', 'veryfast',
                    '-crf', '19', '-pix_fmt', 'yuv420p', '-g', str(FPS * 2), str(pic)], check=True)
    if not pic.exists():
        raise StageError('DOCU_RENDER_FAILED', 'The DOCU render left no picture.', retryable=True)
    if tick:
        tick(3, 3)
    log(f'DOCU: rendered in {(time.time() - t0) / 60:.1f} min')
    return pic
