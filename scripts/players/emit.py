#!/usr/bin/env python3
"""
כותב את `content/manual/player-facts.json` מתוך תוצאת ההתאמה.

One row per player the archive can now place, with the three fields Maor asked for —
position, Israeli or foreign, and the years he wore the shirt — and, on every row, how
that row was arrived at. `matchedBy` is the part that matters in six months: `alias`
means the archive already held this man's Latin spelling and the source agreed;
`transliteration` means the two spellings were aligned consonant by consonant and the
result was unique across all 465 players the source knows. Both are recorded, so a
future reader can audit the weaker one without re-deriving it.

Confidence 2, deliberately, and here is the argument. Rule 2 keeps unproven rows out of
the trivia generator, and these rows do not feed it — they feed a filter. The evidence
is a named football database read season by season, cross-checked against the seasons
our own `shirt-numbers.json` already records, with ambiguous cases refused rather than
resolved. A thirty-row random sample was read by hand and every row was the right man.
What is NOT here is the 328 the source does not cover, and they stay unset.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MATCH = json.loads(Path('/tmp/match.json').read_text(encoding='utf8'))

SOURCE_TITLE = 'worldfootball.net — סגלי הפועל תל אביב, עונה אחר עונה'
SOURCE_URL = 'https://www.worldfootball.net/teams/te956/hapoel-tel-aviv/squad/'

records = []
for bucket in ('confirmed', 'proposed'):
    for he, row in MATCH[bucket].items():
        records.append({
            'personNameHe': he,
            'personNameLatin': row['nameLatin'],
            'position': row['position'],
            'nationalityEn': row['nationality'],
            'origin': row['origin'],
            'fromYear': row['fromYear'],
            'toYear': row['toYear'],
            'seasons': row['seasons'],
            'matchedBy': row['matchedBy'],
            'sport': 'football',
            'confidence': 2,
        })
# The roster carries four men under two Hebrew spellings each. Both spellings keep
# their row — a reader searching either one should find him — and each row DECLARES the
# other, so a count of rows is never mistaken for a count of players.
by_latin: dict[str, list[dict]] = {}
for row in records:
    by_latin.setdefault(row['personNameLatin'], []).append(row)
for group in by_latin.values():
    if len(group) < 2:
        continue
    for row in group:
        row['alsoSpelled'] = sorted(o['personNameHe'] for o in group if o is not row)

records.sort(key=lambda r: r['personNameHe'])

out = {
    'note': (
        'עמדה, מוצא ושנים לכל שחקן שהמקור מכסה. השדה matchedBy אומר איך הגענו לשורה: '
        'alias = האיות הלועזי כבר היה אצלנו והמקור הסכים; transliteration = שני השמות '
        'הותאמו עיצור-מול-עיצור וההתאמה הייתה יחידה מתוך 465 שחקנים במקור. '
        'מי שלא נמצא כאן פשוט לא נמצא — לא ניחשנו אף עמדה ואף שנה.'
    ),
    'sport': 'football',
    'confidence': 2,
    'source': {'title': SOURCE_TITLE, 'url': SOURCE_URL},
    'generator': 'scripts/players/match.py → scripts/players/emit.py',
    'seasonsRead': MATCH['source']['seasonsRead'],
    'playersInSource': MATCH['source']['playersInSource'],
    'records': records,
    'unknown': sorted(MATCH['unmatched']),
    'ambiguous': MATCH['ambiguous'],
}
path = ROOT / 'content' / 'manual' / 'player-facts.json'
path.write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf8')

by_pos: dict[str, int] = {}
for r in records:
    by_pos[r['position']] = by_pos.get(r['position'], 0) + 1
distinct = len({r['personNameLatin'] for r in records})
print(f"{len(records)} rows written ({distinct} distinct players)")
print('positions :', by_pos)
print('origin    :', {'israeli': sum(1 for r in records if r['origin'] == 'israeli'),
                      'foreign': sum(1 for r in records if r['origin'] == 'foreign')})
print('unknown   :', len(out['unknown']), '· ambiguous:', len(out['ambiguous']))
print('years     :', min(r['fromYear'] for r in records), '→', max(r['toYear'] for r in records))
