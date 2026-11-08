"""What the studio KNOWS about each match, and which matches it should make (owner, 8.11.2026: "the studio should mark
the matches it has more information about and recommend producing them").

Every catalog match gets an evidence record:
    {"score": 0–100, "level": "rich|good|thin", "story": 0–30, "has": ["two sources", "scorers with minutes", …],
     "formats": ["documentary", "short"]}
read from what is really in the repository — nothing guessed:
  * the club pack (content/compiled/<club>.json): the match's own sources, scorers with minutes, its line-up, a goal
    described move by move, archive entries and timeline entries on that day, the season's documented kits;
  * for Hapoel Tel Aviv also the Match Master (events, line-up, moments, sources) and the press columns of the next days;
  * the studio's own research dossiers for that club and season;
  * the owner's Drive library: a folder named for this club and this opponent or year.
`story` is the night's own weight (a final, a derby, Europe, a big score, penalties) — what makes a viewer click.
A match is RECOMMENDED when the archive can carry a film about it: rich evidence, or good evidence on a big night.
`formats` says what it can carry: a documentary needs many facts; an animated Short needs one described moment or one
big night.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

from .common import ROOT

COMPILED = ROOT / 'content' / 'compiled'
DOSSIERS = Path(__file__).resolve().parent / 'dossiers'
STORY = {'final': 10, 'derby': 6, 'europe': 6, 'big-score': 4, 'penalties': 4, 'extra-time': 3, 'goals': 2}
RICH, GOOD = 45, 25


def _pack(club_id: str) -> dict:
    p = COMPILED / f'{club_id}.json'
    if not p.exists():
        return {}
    d = json.loads(p.read_text(encoding='utf-8'))
    return d.get('data') or d


def _val(row: dict) -> dict:
    return row.get('value') if isinstance(row.get('value'), dict) else row


def _day(s) -> str | None:
    s = str(s or '')
    return s[:10] if re.fullmatch(r'\d{4}-\d{2}-\d{2}.*', s) else None


class ClubEvidence:
    """Everything the archive holds about one club, indexed by day, read once."""

    def __init__(self, club_id: str, club_name: str = ''):
        self.club_id = club_id
        data = _pack(club_id)
        self.by_day: dict[str, dict] = defaultdict(lambda: {'sources': set(), 'minutes': 0, 'scorers': 0, 'lineup': 0,
                                                            'goals': 0, 'archive': 0, 'timeline': 0, 'events': 0,
                                                            'moments': 0, 'press': 0})
        for r in data.get('matches') or []:
            v, d = _val(r), _day(_val(r).get('on'))
            if not d:
                continue
            e = self.by_day[d]
            e['sources'].update(str(s) for s in (r.get('sources') or []))
            sc = v.get('scorers') or []
            e['scorers'] = max(e['scorers'], len(sc))
            e['minutes'] = max(e['minutes'], sum(1 for s in sc if isinstance(s, dict) and s.get('minute') is not None))
            e['lineup'] = max(e['lineup'], len(v.get('lineup') or []))
        for k in ('goals', 'archive', 'timeline'):
            for r in data.get(k) or []:
                d = _day(_val(r).get('on'))
                if d:
                    self.by_day[d][k] += 1
        n_matches = max(1, len(data.get('matches') or []))
        # a signal the club's archive carries on almost every match says little about any one of them
        self.timeline_common = sum(1 for e in self.by_day.values() if e['timeline']) > 0.5 * n_matches
        self.kit_seasons = {str(_val(r).get('season')) for r in data.get('kits') or [] if _val(r).get('season')}
        if club_id == 'hapoel-tel-aviv':
            self._hapoel()
        self.dossiers = {p.stem for p in DOSSIERS.glob('*.json')} if DOSSIERS.exists() else set()
        self.club_name = club_name or (data.get('identity') or {}).get('name') or club_id
        try:
            from .drive_scan import static_tree
            self.tree = static_tree()
        except Exception:  # noqa: BLE001 — no listing, no Drive signal; never a failed catalog
            self.tree = {'folders': []}

    def _hapoel(self) -> None:
        mm = ROOT / 'content' / 'generated' / 'match-master.json'
        self.mm: dict[str, dict] = {}
        if mm.exists():
            for m in json.loads(mm.read_text(encoding='utf-8')).get('matches') or []:
                self.mm[m['matchId']] = m
        pc = ROOT / 'content' / 'manual' / 'press-columns.json'
        if pc.exists():
            for r in json.loads(pc.read_text(encoding='utf-8')).get('records') or []:
                if r.get('sport', 'football') == 'football' and _day(r.get('publishedOn')):
                    self.by_day[r['publishedOn']]['press'] += 1

    def _dossier(self, season: str) -> bool:
        s = season.replace('/', '-')
        return any(n.startswith(f'{self.club_id}-{s}') for n in self.dossiers)

    def _drive(self, opponent: str, season: str) -> bool:
        key = (opponent, season)
        memo = self.__dict__.setdefault('_drive_memo', {})
        if key not in memo:
            memo[key] = self._drive_now(opponent, season)
        return memo[key]

    def _drive_now(self, opponent: str, season: str) -> bool:
        from .drive_scan import TARGET_BAR, score, story_terms
        terms = story_terms({'club_name': self.club_name, 'opponent': opponent, 'season': season})
        return any(score(f['path'].split('/')[-1], terms) + 0.5 * score(f['path'], terms) >= TARGET_BAR + 2
                   for f in self.tree.get('folders') or [])

    def of(self, m: dict) -> dict:
        d = m['date']
        e = self.by_day.get(d) or {'sources': set(), 'minutes': 0, 'scorers': 0, 'lineup': 0, 'goals': 0, 'archive': 0,
                                   'timeline': 0, 'events': 0, 'moments': 0, 'press': 0}
        has: list[str] = []
        pts = 0
        n_src = len(e['sources'])
        if getattr(self, 'mm', None) and m['id'] in self.mm:
            r = self.mm[m['id']]
            n_src = max(n_src, len(r.get('sourceIds') or []))
            if r.get('events'):
                pts += min(15, 3 * len(r['events']))
                has.append(f"{len(r['events'])} match events")
            if r.get('lineupRef'):
                pts += 10
                has.append('line-up')
            if r.get('momentIds'):
                pts += 15
                has.append('a described moment')
        if n_src >= 2:
            pts += min(20, 5 * n_src)
            has.append(f'{n_src} sources')
        if e['minutes']:
            pts += 10
            has.append('scorers with minutes')
        elif e['scorers'] or m.get('scorers'):
            pts += 5
            has.append('scorers')
        if e['lineup'] >= 11:
            pts += 10
            has.append('line-up')
        if e['goals']:
            pts += 15
            has.append('a goal described move by move')
        if e['archive']:
            pts += min(16, 8 * e['archive'])
            has.append('archive entry')
        if e['timeline'] and not self.timeline_common:
            pts += min(12, 6 * e['timeline'])
            has.append('on the club timeline')
        press = sum((self.by_day.get(str(date.fromisoformat(d) + timedelta(days=k))) or {}).get('press', 0) for k in range(0, 3))
        if press:
            pts += min(12, 6 * press)
            has.append('press column')
        if self._dossier(m['season']):
            pts += 12
            has.append('research dossier')
        if self._drive(m['opponent'], m['season']):
            pts += 10
            has.append('your Drive pack')
        if m['season'] in self.kit_seasons:
            pts += 4
            has.append("the season's kits")
        story = sum(STORY.get(t, 0) for t in m.get('tags') or [])
        score = min(100, pts)
        level = 'rich' if score >= RICH else 'good' if score >= GOOD else 'thin'
        formats = []
        if score >= GOOD:
            formats.append('documentary')
        if e['goals'] or 'a described moment' in has or {'final', 'derby', 'penalties'} & set(m.get('tags') or []):
            formats.append('short')
        return {'score': score, 'level': level, 'story': story, 'has': list(dict.fromkeys(has)), 'formats': formats}


def recommended(catalogs: dict[str, dict], limit_per_club: int = 12, limit: int = 60) -> list[dict]:
    """The matches to make next, across every club: rich evidence first, a big night breaking ties."""
    out = []
    for club_id, cat in catalogs.items():
        rows = [m for m in cat['matches'] if (m.get('evidence') or {}).get('level') == 'rich'
                or ((m.get('evidence') or {}).get('level') == 'good' and m['evidence']['story'] >= 6)]
        rows.sort(key=lambda m: -(m['evidence']['score'] + 1.5 * m['evidence']['story']))
        out += [{**m, 'club_id': club_id} for m in rows[:limit_per_club]]
    out.sort(key=lambda m: -(m['evidence']['score'] + 1.5 * m['evidence']['story']))
    return out[:limit]
