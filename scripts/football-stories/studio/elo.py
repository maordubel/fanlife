"""THE ODDS BEFORE KICK-OFF (owner, 17.11.2026: "every upgrade that gives us more content, more information, more
documentary, more story material").

A result means more when we know who was expected to win. ClubElo (clubelo.com, free, by Lars Schiefler) rates every
European club on every day since the 1940s from results alone. For every match in the archive this module stores both
sides' rating on the day, and from the two the chance the ratings gave the club — the underdog night, the upset of a
season, the strongest side met all year become sayable facts (studio/drama_facts.py → the house writer).

The fetch runs in GitHub Actions (stories-elo.yml: this machine cannot reach clubelo.com) and commits one small file:

  content/generated/elo/match-elo.json   {club_id: {date: [club_elo, opponent_elo]}}

Clubs outside ClubElo's countries (Egypt, Morocco) and names that do not match one ClubElo club are left out — never
guessed. Run: python3 -m studio.elo fetch [--limit N]
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import time
import urllib.request
from collections import defaultdict

from .common import ROOT, read_json
from .place_book import key

API = 'http://api.clubelo.com'
OUT = ROOT / 'content' / 'generated' / 'elo' / 'match-elo.json'
STORIES = ROOT / 'content' / 'generated' / 'stories'
SOURCE = {'title': 'ClubElo — football club Elo ratings', 'url': 'https://clubelo.com/'}
# the archive's own clubs, as ClubElo writes them (checked against its club list by the fetch)
OWN = {'hapoel-tel-aviv': 'Hapoel Tel Aviv', 'hapoel-petah-tikva': 'Hapoel Petah Tikva', 'maccabi-haifa': 'Maccabi Haifa',
       'celtic': 'Celtic', 'olympiacos': 'Olympiakos', 'panathinaikos': 'Panathinaikos', 'aek-athens': 'AEK',
       'st-pauli': 'St Pauli', 'atalanta': 'Atalanta', 'zrinjski-mostar': 'Zrinjski'}


def _get(path: str, tries: int = 3) -> list[dict]:
    for k in range(tries):
        try:
            with urllib.request.urlopen(f'{API}/{path}', timeout=30) as r:
                return list(csv.DictReader(io.StringIO(r.read().decode('utf-8'))))
        except Exception:  # noqa: BLE001 — a busy free API: wait and try again, then give up on this name
            time.sleep(2 + 3 * k)
    return []


def chance(club: float, opp: float, home: bool | None) -> float:
    """The chance of a win-equivalent the ratings give the club (ClubElo's own expectation formula, a home side ~65 points)."""
    dr = club - opp + (65 if home is True else -65 if home is False else 0)
    return 1 / (10 ** (-dr / 400) + 1)


def universe(years: list[int]) -> dict[str, str]:
    """Every club ClubElo rated on 15 September of these years: name → country."""
    out = {}
    for y in years:
        for row in _get(f'{y}-09-15'):
            out[row['Club']] = row.get('Country', '')
        time.sleep(0.3)
    return out


def resolve(names: set[str], known: dict[str, str]) -> dict[str, str]:
    """archive name → ClubElo name: the same name with its legal-form letters and order removed, or the one ClubElo name
    whose words all appear in it ('Olympiacos Piraeus' ← 'Olympiakos' fails; 'FC Basel 1893' → 'Basel'). One match only."""
    by_key = defaultdict(list)
    for n in known:
        by_key[key(n)].append(n)
    out = {}
    for n in names:
        k = key(n)
        if len(by_key.get(k, [])) == 1:
            out[n] = by_key[k][0]
            continue
        toks = set(k.split())
        cand = [c for c in known if key(c) and set(key(c).split()) <= toks and max(len(t) for t in key(c).split()) >= 4]
        if len(cand) == 1:
            out[n] = cand[0]
    return out


def fetch(limit: int | None = None) -> dict:
    archive = {p.stem: read_json(p).get('matches') or [] for p in sorted(STORIES.glob('*.json'))}
    years = sorted({int(m['date'][:4]) for ms in archive.values() for m in ms if m.get('date', '0000') >= '1946'})
    known = universe(years)
    names = {m['opponent'] for ms in archive.values() for m in ms}
    names_map = resolve(names, known)
    for cid, nm in OWN.items():
        if nm in known:
            names_map[f'__{cid}'] = nm
    need = sorted(set(names_map.values()))[:limit] if limit else sorted(set(names_map.values()))
    hist: dict[str, list[tuple[str, str, float]]] = {}
    for nm in need:
        rows = _get(nm.replace(' ', ''))
        hist[nm] = [(r['From'], r['To'], float(r['Elo'])) for r in rows if r.get('Elo')]
        time.sleep(0.3)

    def on(nm: str, day: str) -> float | None:
        for a, z, e in hist.get(nm) or []:
            if a <= day <= z:
                return e
        return None
    out = {}
    for cid, ms in archive.items():
        own = names_map.get(f'__{cid}')
        if not own:
            continue
        rows = {}
        for m in ms:
            opp = names_map.get(m['opponent'])
            a, b = on(own, m['date']), on(opp, m['date']) if opp else None
            if a and b:
                rows[m['date']] = [round(a), round(b)]
        out[cid] = rows
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = {'source': SOURCE, 'note': 'Both sides\' ClubElo rating on the day of each archive match (studio/elo.py).',
           'names': {k: v for k, v in sorted(names_map.items()) if not k.startswith('__')}, 'matches': out}
    OUT.write_text(json.dumps(doc, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    return {'clubs_rated': len(known), 'names_matched': len(names_map), 'histories': len(hist),
            'matches': {k: len(v) for k, v in out.items()}}


def lookup() -> dict:
    return read_json(OUT) if OUT.exists() else {}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['fetch'])
    ap.add_argument('--limit', type=int)
    a = ap.parse_args()
    print(json.dumps(fetch(a.limit), indent=1))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
