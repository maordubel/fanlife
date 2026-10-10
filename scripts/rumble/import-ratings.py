#!/usr/bin/env python3
"""FAN LIFE player ratings (owner file, 2026-10-10) → content/manual/player-ratings.json.

The workbook is FAN LIFE's OWN estimate of in-game strength (1–99) — not Football Manager, not FIFA/EA FC.
Nothing here is relabelled: every row keeps its confidence ('medium' = a hand anchor from a player's known career,
'low' = a club-and-position baseline with a small deterministic spread) and the file's own ± uncertainty.
`baselines` is what the low-confidence rows say a club's ordinary man at each position is worth; the game uses it
(never as a fact about a person) to give an unlisted squad member a derived estimate — see lib/clubs/ratings.ts.
Run: python3 scripts/rumble/import-ratings.py
"""
import json, statistics, openpyxl
SRC = 'content/raw/ratings/fanlife-eight-clubs-estimated-scores-2026-10-10.xlsx'
OUT = 'content/manual/player-ratings.json'
wb = openpyxl.load_workbook(SRC, read_only=True)
rows = list(wb['מאגר שחקנים'].iter_rows(values_only=True)); head = rows[0]
clubs, base = {}, {}
for r in rows[1:]:
    d = dict(zip(head, r))
    if not d['ID'] or d['ציון משחק משוער (1-99)'] is None: continue
    pos = (d['עמדה'] or '').split('/')[0] or None
    indiv = 'פרטנית' in (d['בסיס הערכה'] or '')
    row = {'name': d['שם שחקן'], 'pos': pos, 'score': int(d['ציון משחק משוער (1-99)']), 'ca': d['FANLIFE CA משוער בשיא (1-200)'],
           'conf': 'medium' if d['רמת ביטחון'] == 'בינונית' else 'low', 'unc': d['סטיית אי ודאות ±'], 'basis': 'individual' if indiv else 'club-baseline',
           'from': d['שנת התחלה'], 'to': d['שנת סיום']}
    clubs.setdefault(d['מזהה מועדון'], []).append(row)
    if not indiv and pos: base.setdefault(d['מזהה מועדון'], {}).setdefault(pos, []).append(row['score'])
allpos = {}
for c, ps in base.items():
    for p, v in ps.items(): allpos.setdefault(p, []).extend(v)
baselines = {c: {p: round(statistics.median(v)) for p, v in ps.items()} for c, ps in base.items()}
fallback = {p: round(statistics.median(v)) for p, v in allpos.items()}
doc = {'schemaVersion': 1, 'kind': 'FAN LIFE estimate — not Football Manager, not FIFA/EA FC', 'source': 'owner workbook 2026-10-10 (content/raw/ratings)',
       'scale': '1–99 game score; ca = FAN LIFE peak ability estimate 1–200', 'uncertainty': '±9 individual, ±14 baseline (game use only)',
       'baselines': baselines, 'fallbackBaseline': fallback, 'clubs': clubs}
json.dump(doc, open(OUT, 'w'), ensure_ascii=False, indent=1); open(OUT, 'a').write('\n')
print({c: len(v) for c, v in clubs.items()}); print(baselines); print(fallback)
