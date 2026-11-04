"""Which seasons the studio can make a film about, per club: the seasons with approved, sourced match records the
research stage reads (the same reader, so the desk never offers a season that fails at Research).

  python3 -m studio.seasons        → content/generated/stories-seasons.json   (after npm run clubs:precompile)
"""
from __future__ import annotations

import json
import sys

from . import research
from .common import ROOT, StageError

OUT = ROOT / 'content' / 'generated' / 'stories-seasons.json'


def club_seasons(club_id: str) -> dict[str, int]:
    out: dict[str, int] = {}
    for y in range(1900, 2031):
        s = f'{y}/{str(y + 1)[2:]}'
        try:
            l = research.hapoel_ledger(s) if club_id == 'hapoel-tel-aviv' else research.compiled_ledger(club_id, s)
        except StageError:
            continue
        n = sum(1 for c in l['claims'] if c['fact'].get('kind') == 'match')
        if n:
            out[s] = n
    return out


def main() -> None:
    man = json.loads((ROOT / 'content' / 'compiled' / 'manifest.json').read_text())
    clubs = {c: club_seasons(c) for c in man['clubs']}
    data = {'note': 'Seasons a Football Stories film can be made about (matches the research stage can read). '
                    'Regenerate: npm run clubs:precompile, then python3 -m studio.seasons in scripts/football-stories.',
            'clubs': {c: dict(sorted(v.items(), reverse=True)) for c, v in clubs.items() if v}}
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n')
    for c, v in clubs.items():
        print(f'{c}: {len(v)} seasons, {sum(v.values())} matches', file=sys.stderr)


if __name__ == '__main__':
    main()
