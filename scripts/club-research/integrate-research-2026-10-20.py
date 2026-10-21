#!/usr/bin/env python3
"""Offline conversion of FANLIFE-ARCHIVE-RESEARCH-2026-10-20 into waves (owner approval: chat 2026-10-20).

Open clubs (they have a pack): candidates become club-packs/<club>/wave-history-2026-10-20.json, approved at
confidence 2, display names cleaned of country suffixes, club side set only when exactly one side names the club.
Unopened clubs have no pack: their candidates are staged in research-staging/<club>/ and wired to nothing.
Records the bundle could not place on a side stay `review` in the same file (mergeHistorical skips them).
Usage: integrate-research-2026-10-20.py <unzipped bundle dir>
"""
import json, re, sys, collections
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUNDLE = Path(sys.argv[1])
DAY = '2026-10-20'
BY = 'owner: chat 2026-10-20 — החדר וסדר את המידע, הכל מאושר לעבוד מיידית. להחדיר לכל הפיצרים הרלוונטים.'
OPEN = {'hapoel-tel-aviv', 'hapoel-petah-tikva', 'zrinjski-mostar', 'olympiacos', 'panathinaikos', 'aek-athens', 'celtic', 'st-pauli'}
TOKEN = {'celtic': ['celtic'], 'olympiacos': ['olympiacos', 'olympiakos'], 'panathinaikos': ['panathinaikos'], 'aek-athens': ['aek'],
         'st-pauli': ['pauli'], 'zrinjski-mostar': ['zrinjski'], 'hapoel-tel-aviv': ['hapoel tel aviv'], 'hapoel-petah-tikva': ['petah']}
SUFFIX = re.compile(r'\s*\((?:[A-Z]{3})\)\s*$')
clean = lambda s: SUFFIX.sub('', s).strip()
norm = lambda s: re.sub(r'[^a-z0-9 ]', '', s.lower())

def side(club, v):
    t = TOKEN.get(club, [club.split('-')[0]])
    h = any(x in norm(v['home']) for x in t); a = any(x in norm(v['away']) for x in t)
    return 'home' if h and not a else 'away' if a and not h else None

report = {}
for f in sorted((BUNDLE / 'integration-candidates').glob('*/wave-matches-2026-10-20.json')):
    d = json.load(open(f)); club = d['clubId']; ms = d['matches']
    if not ms: continue
    used = {s for m in ms for s in m['sources']}
    out, held = [], 0
    for m in ms:
        v = dict(m['value']); v['home'], v['away'] = clean(v['home']), clean(v['away'])
        v['name'] = f"{v['home']} {v['homeGoals']}-{v['awayGoals']} {v['away']}"
        v['score'] = f"{v['homeGoals']}-{v['awayGoals']}"
        sd = side(club, v) if club in OPEN else None
        if sd: v['us'] = sd
        ok = club in OPEN and sd is not None
        if not ok: held += 1
        out.append({**m, 'value': v, 'status': 'approved' if ok else 'review',
                    'approvedAt': DAY if ok else None, 'approvedBy': BY if ok else None})
    wave = {'schemaVersion': 1, 'clubId': club, 'contentLocale': 'en', 'sources': [s for s in d['sources'] if s['id'] in used], 'matches': out, 'archive': []}
    if club in OPEN:
        dest = ROOT / 'club-packs' / club / 'wave-history-2026-10-20.json'
    else:
        dest = ROOT / 'research-staging' / club / 'wave-history-2026-10-20.json'
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(wave, ensure_ascii=False, indent=1) + '\n')
    report[club] = {'matches': len(ms), 'approved': len(ms) - held, 'held': held, 'file': str(dest.relative_to(ROOT)), 'wired': club in OPEN}
(ROOT / 'research-staging' / 'integration-report-2026-10-20.json').write_text(json.dumps(report, ensure_ascii=False, indent=1) + '\n')
for k, r in report.items(): print(k, r)
