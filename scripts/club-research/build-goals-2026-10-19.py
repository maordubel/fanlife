"""Offline, deterministic projection of the reviewed goal research into shared packs.

No network, inferred touches, roster writes or publication side effects. --check
compares the checked-in delivery with the reviewed ledger without writing it.
"""
import argparse
import datetime
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INPUT = ROOT / 'research-data/goal-recovery-2026-10-19/reviewed.json'
CLUBS = {'hapoel-petah-tikva', 'panathinaikos', 'aek-athens', 'celtic', 'st-pauli', 'zrinjski-mostar'}
ACTIONS = {'pass', 'throughBall', 'cross', 'dribble', 'shot', 'header', 'save'}
APPROVAL = 'owner-authorized: checked research integration, chat 2026-10-18; goal research instruction 2026-10-19; agent source review'


def deliveries(data):
    checked = data['checkedAt']
    datetime.date.fromisoformat(checked)
    sources = {s['id']: s for s in data['sources']}
    assert len(sources) == len(data['sources']), 'Duplicate source'
    for s in sources.values():
        assert s['access'] == 'available' and s['checkedAt'] == checked
        assert s['url'].startswith('https://') and s['publisher'] and s['locator']
    out = {c: dict(schemaVersion=1, clubId=c, contentLocale='en', sources=[], goals=[]) for c in CLUBS}
    seen, fixtures, display_ids = set(), set(), set()
    for g in data['goals']:
        club, gid, seq = g['clubId'], g['id'], g['sequence']
        assert club in out and re.fullmatch(r'[a-z0-9][a-z0-9_-]{0,100}', gid)
        assert (club, gid) not in seen, 'Duplicate goal id'
        seen.add((club, gid))
        datetime.date.fromisoformat(g['on'])
        assert g['on'] <= checked
        assert g['minute'] is None or (type(g['minute']) is int and 1 <= g['minute'] <= 130)
        assert re.fullmatch(r'\d+-\d+(?: \(aet\))?', g['score'])
        assert all(g[k] for k in ['scorer', 'opponent', 'competition', 'sourceIds'])
        assert set(g['sourceIds']) <= sources.keys()
        # Same scorer can score twice; only a non-null minute identifies an event.
        fixture = (club, g['on'], g['scorer'], g['minute'])
        assert g['minute'] is None or fixture not in fixtures, 'Duplicate scoring event'
        fixtures.add(fixture)
        assert 2 <= len(seq) <= 5, 'Need two to five contiguous contacts'
        for s in seq:
            assert s['action'] in ACTIONS and re.fullmatch(r'[A-E][1-4]', s['zone'])
            assert s['side'] in {'club', 'opponent', 'unnamed'}
            assert (s['actor'] is None) == (s['side'] == 'unnamed')
            assert s['position'].strip() and s['note'].strip()
        assert seq[-1]['side'] == 'club' and seq[-1]['actor'] == g['scorer']
        assert seq[-1]['action'] in {'shot', 'header'}
        subtitle = g['on'] + (f" · {g['minute']}'" if g['minute'] is not None else '')
        # The board displays the title, not the subtitle. A scorer can score
        # twice in one fixture, so put the documented event cue in that title.
        cue = f"{g['minute']}'" if g['minute'] is not None else g.get('eventLabel', '')
        title = f"{g['scorer']} v {g['opponent']}"
        if cue:
            title = f'{cue} · {title}'
        display_id = (club, g['on'], title)
        assert display_id not in display_ids, 'Ambiguous goal: needs a sourced event cue'
        display_ids.add(display_id)
        narrative = ' '.join(f"{s['actor'] or 'An unnamed defender'}: {s['note']}" for s in seq)
        value = dict(name=title, subtitle=subtitle,
                     on=g['on'], competition=g['competition'], opponent=g['opponent'],
                     score=g['score'], narrative=narrative, sequence=seq,
                     reconstructionScope='Final documented contacts; not the entire possession.',
                     spatialPolicy=data['spatialPolicy'])
        fact = dict(id=gid, value=value, sources=g['sourceIds'], confidence=2,
                    status='approved', researchedAt=checked, approvedAt=checked,
                    approvedBy=APPROVAL, notes=g['notes'])
        out[club]['goals'].append(fact)
    for pack in out.values():
        used = {s for g in pack['goals'] for s in g['sources']}
        pack['sources'] = [s for s in data['sources'] if s['id'] in used]
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = json.loads(INPUT.read_text())
    for club, pack in sorted(deliveries(data).items()):
        path = ROOT / f'club-packs/{club}/wave-goals-2026-10-19.json'
        text = json.dumps(pack, ensure_ascii=False, indent=2) + '\n'
        if args.check:
            assert path.exists() and path.read_text() == text, f'Stale delivery: {path.relative_to(ROOT)}'
        else:
            path.write_text(text)
        print(f"{club}: {len(pack['goals'])} goals")
    print(f"{len(data['held'])} held candidate groups remain outside the delivery")


if __name__ == '__main__':
    main()
