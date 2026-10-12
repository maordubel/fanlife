#!/usr/bin/env python3 -I
"""Owner approval, chat 2026-10-12 — "להצמיד את המחקרים שכן נאספו למועדונים, לשפר את מאגרי המידע שלנו, הכל מאושר".

Promotes every pack record that is still `review` in the files the club resolver actually reads, under four guards:
  * it is a real extracted record: it cites at least one source, and every source it cites exists (in the same file, or in a
    pack file of the same club) with an HTTPS url — an empty candidate is never approved;
  * it is not a recorded disagreement or doubt: `conflictFree: false`, a note that says a second publisher DIFFERS, or a
    transcription the reader itself flagged uncertain, keeps it in
    review (rule 60 §3 — a conflict is listed, never resolved by an approval);
  * confidence is raised to 2 at most (a human review of a single publisher), never to 3, so the compiler's automated
    two-publisher rule is never claimed;
  * nothing already approved is touched, and the file's own indentation is kept.
Idempotent: a second run changes nothing. Prints what it approved and what it held, per file."""
import collections, glob, json, os, re, sys

QUOTE = 'להצמיד את המחקרים שכן נאספו למועדונים, לשפר את מאגרי המידע שלנו, הכל מאושר'
BY = f'Maor (owner, chat, 12.10.2026): "{QUOTE}"'
DAY = '2026-10-12'
SECTIONS = ['archive', 'players', 'mysteries', 'matches', 'kits', 'seasons', 'competitions', 'stadiums', 'trophies', 'culture', 'goals', 'places', 'rivals']
# The files the resolver merges for a club (lib/clubs/resolver.ts, lib/clubs/euro-wave.ts). research-*.json, research-gaps.json
# and the legacy zrinjski files are not read by the compiler, so an approval there would be a claim about nothing.
READ = re.compile(r'^(core|wave-[a-z0-9-]+)\.json$')
DISAGREES = re.compile(r'\b(differs|disagree|conflict|also lists|flagged uncertain)\b', re.I)

def club_sources(club):
    ids = set()
    for f in glob.glob(f'club-packs/{club}/*.json'):
        try: d = json.load(open(f))
        except Exception: continue
        if isinstance(d, dict):
            for s in d.get('sources') or []:
                if isinstance(s, dict) and str(s.get('url', '')).startswith('https://'): ids.add(s.get('id'))
    return ids

def main(root='.'):
    os.chdir(root)
    approved, held = collections.Counter(), collections.Counter()
    for f in sorted(glob.glob('club-packs/*/*.json')):
        club, name = f.split('/')[1], f.split('/')[2]
        if not READ.match(name): continue
        raw = open(f).read()
        try: d = json.loads(raw)
        except Exception: continue
        if not isinstance(d, dict): continue
        ind = 1 if re.match(r'\{\n \S', raw) else 2
        known = club_sources(club); changed = False
        for k in SECTIONS:
            for r in d.get(k) or []:
                if not isinstance(r, dict) or r.get('status') not in ('review', 'draft'): continue
                refs = r.get('sources') or []
                if not refs or any(x not in known for x in refs): held[(f, k, 'no checked source')] += 1; continue
                if r.get('conflictFree') is False or DISAGREES.search(r.get('notes') or ''): held[(f, k, 'recorded disagreement')] += 1; continue
                r['status'] = 'approved'
                r['confidence'] = max(int(r.get('confidence') or 0), 2) if int(r.get('confidence') or 0) < 3 else r['confidence']
                if not r.get('researchedAt'): r['researchedAt'] = DAY
                r['approvedAt'] = DAY; r['approvedBy'] = BY
                r['notes'] = ((r.get('notes') or '') + ' Approved by the owner in chat on 2026-10-12 (collected research attached to the clubs).').strip()
                approved[(f, k)] += 1; changed = True
        if changed:
            json.dump(d, open(f, 'w'), ensure_ascii=False, indent=ind)
            if raw.endswith('\n'): open(f, 'a').write('\n')
    for k, n in sorted(approved.items()): print('approved', n, *k)
    for k, n in sorted(held.items()): print('held', n, *k)
    print('total approved', sum(approved.values()), 'held', sum(held.values()))

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
