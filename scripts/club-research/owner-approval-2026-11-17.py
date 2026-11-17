#!/usr/bin/env python3
"""
Owner approval, 17.11.2026 — "go through the whole archive of every club; players with a single source are approved,
put all the data into action; another source is approved too" (rule archive-single-source).

Every held record in the club packs becomes an owner-approved record. (The research desk's staged clubs are left to
the desk: its batch approvals are pinned to file content, and opening a club stays the owner's own click.)

  * status review / draft / deep_research          -> approved
  * approved by the automated reviewer but held by the compiler (one publisher, medium certainty, confidence 2,
    an already-settled conflict)                    -> re-stamped as the owner's approval
  * approved with confidence 1 (the roster waves)   -> confidence 2, so trivia, Blind Cow and the archive deal them

Never touched: a REJECTED record, a sensitive record, and a line-up whose second publisher shares fewer than 6 of the
11 surnames (that eleven is probably the opponent's: the match is approved without that eleven).

Idempotent. Usage:  python3 scripts/club-research/owner-approval-2026-11-17.py [--dry-run]
"""
import json, glob, os, re, sys, collections

DAY = '2026-11-17'
BY = 'Maor Harel (owner, chat 2026-11-17: every single-source record approved)'
NOTE = 'Approved by the owner in chat on 2026-11-17 (single source approved; all research put into action).'
HELD = {'review', 'draft', 'deep_research'}
DRY = '--dry-run' in sys.argv
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AGREE = re.compile(r'\((\d+)/11 surnames agree\)')


def facts(o):
    if isinstance(o, dict):
        if 'status' in o and 'sources' in o and ('value' in o or 'clues' in o or 'playerId' in o):
            yield o
        for k, v in o.items():
            if k != 'value':
                yield from facts(v)
    elif isinstance(o, list):
        for x in o:
            yield from facts(x)


def conf(v):
    return {'A_PRIMARY': 3, 'B_SECONDARY': 2, 'C_UNVERIFIED': 1}.get(v, v) if isinstance(v, str) else v


def sensitive(f):
    v = f.get('value')
    return isinstance(v, dict) and v.get('sensitive') is True


def stamp(f, counts, why):
    f['status'] = 'approved'
    f['approvedBy'] = BY
    f['approvedAt'] = DAY
    if not f.get('researchedAt'):
        f['researchedAt'] = DAY
    c = conf(f.get('confidence'))
    f['confidence'] = c if isinstance(c, int) and c >= 2 else 2
    notes = f.get('notes') or ''
    if NOTE not in notes:
        f['notes'] = (notes + ' ' + NOTE).strip()
    counts[why] += 1


def run(path, totals):
    try:
        with open(path, encoding='utf-8') as fh:
            raw = fh.read()
        data = json.loads(raw)
    except (OSError, ValueError):
        return
    counts = collections.Counter()
    for f in facts(data):
        st = f.get('status')
        if st == 'rejected' or sensitive(f):
            continue
        by = str(f.get('approvedBy') or '')
        notes = str(f.get('notes') or '')
        m = AGREE.search(notes)
        if m and int(m.group(1)) < 6 and isinstance(f.get('value'), dict) and f['value'].get('lineup'):
            # the second publisher's eleven barely overlaps: keep the result, drop the doubtful eleven
            f['value']['lineup'] = []
            f['value']['bench'] = []
            f['notes'] = notes + ' Eleven withheld (second publisher agrees on fewer than 6 of 11 surnames).'
            counts['eleven-withheld'] += 1
        if st in HELD:
            stamp(f, counts, 'held->approved')
        elif st == 'approved' and by.startswith('automated:'):
            ok = (conf(f.get('confidence')) == 3 and f.get('parserCertainty') == 'high' and f.get('conflictFree') is True
                  and len(f.get('sources') or []) >= 2)
            if not ok:
                stamp(f, counts, 'automated-held->owner')
        elif st == 'approved' and not (isinstance(conf(f.get('confidence')), int) and conf(f.get('confidence')) >= 2):
            stamp(f, counts, 'confidence1->2')
    if counts:
        rel = os.path.relpath(path, ROOT)
        totals[rel] = dict(counts)
        if not DRY:
            m2 = re.match(r'[\[{]\n( +)', raw)
            indent = len(m2.group(1)) if m2 else None
            seps = None if indent else ((',', ':') if '","' in raw[:2000] or '":' in raw[:2000] and '": ' not in raw[:2000] else (', ', ': '))
            with open(path, 'w', encoding='utf-8') as fh:
                json.dump(data, fh, ensure_ascii=False, indent=indent, separators=seps)
                if raw.endswith('\n'):
                    fh.write('\n')


def main():
    totals = {}
    paths = sorted(glob.glob(os.path.join(ROOT, 'club-packs', '*', '*.json')))
    for p in paths:
        if os.path.basename(p) in ('world.json', 'ingest.json', 'identity.json'):
            continue
        run(p, totals)
    agg = collections.Counter()
    for v in totals.values():
        agg.update(v)
    print(json.dumps({'files': totals, 'total': dict(agg)}, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
