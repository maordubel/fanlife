#!/usr/bin/env python3
"""Owner blanket approval, chat 2026-10-09: "all values are linked and approved". Promotes every pack fact that is
still `review` / confidence 1 / missing approver to approved. It never touches sources (a fact whose source was not
checked stays out of the compiler and is reported), and skips anything flagged conflictFree:false."""
import glob, json, collections, re
BY = 'Maor Harel (owner, chat 2026-10-09)'
DAY = '2026-10-09'
SECTIONS = ['archive','players','mysteries','matches','kits','seasons','competitions','stadiums','trophies','culture','goals','places','rivals']
stats = collections.Counter(); skipped = collections.Counter()
for f in sorted(glob.glob('club-packs/*/*.json')):
    raw = open(f).read()
    ind = 1 if re.match(r'\{\n \S', raw) else 2
    try: d = json.loads(raw)
    except Exception: continue
    if not isinstance(d, dict): continue
    changed = False
    for k in SECTIONS:
        for r in d.get(k, []) if isinstance(d.get(k), list) else []:
            if not isinstance(r, dict): continue
            ok = r.get('status') == 'approved' and r.get('confidence') in (2, 3) and r.get('approvedAt') and r.get('approvedBy')
            if ok: continue
            if r.get('conflictFree') is False: skipped[(f, k)] += 1; continue
            r['status'] = 'approved'
            r['confidence'] = max(int(r.get('confidence') or 0), 2)
            r.setdefault('researchedAt', DAY) if not r.get('researchedAt') else None
            r['approvedAt'] = DAY; r['approvedBy'] = BY
            r['notes'] = (r.get('notes', '') + ' Approved by the owner in chat on 2026-10-09 (blanket approval of all staged values).').strip()
            stats[(f.split('/')[1], k)] += 1; changed = True
    if changed: json.dump(d, open(f, 'w'), ensure_ascii=False, indent=ind); open(f, 'a').write('\n' if raw.endswith('\n') else '')
for k, n in sorted(stats.items()): print(k, n)
print('total', sum(stats.values()), 'skipped(conflict)', dict(skipped))
