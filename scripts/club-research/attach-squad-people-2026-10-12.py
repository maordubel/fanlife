#!/usr/bin/env python3 -I
"""Staged squad people → a players wave the club resolver merges (owner approval, chat 2026-10-12:
"להצמיד את המחקרים שכן נאספו למועדונים, לשפר את מאגרי המידע שלנו, הכל מאושר").

    attach-squad-people-2026-10-12.py st-pauli        → research-staging/st-pauli/players-ready-2026-10-12.json
    attach-squad-people-2026-10-12.py zrinjski-mostar → research-staging/zrinjski-mostar/players-ready-2026-10-12.json

HELD, NOT WIRED (12.10.2026). Each row is an approved, source-checked pack player record (its sources inline), but the
resolver does not read it yet: every man added to a club changes its Royal Rumble ladder. The economy-v2 quotas are
percentages of the club's size (tests/clubs/rumble-xi.test.ts asserts them exactly), so 78 new St. Pauli men at €1M
(`rumble:prices -- migrate`) leave the €2–€4 rungs short and the ladder can only be restored by promoting men already
priced — a repricing rule 103 says a new man must not cause. Wiring it is one line in lib/clubs/resolver.ts plus a
ladder decision by the owner; until then it is listed in docs/fanlife/50-research-attach-2026-10-12.md as stranded.

The existing-archive package of 2026-10-09 read these people from the national association's data centre (DFB, St. Pauli) and
from National Football Teams (Zrinjski): a provider id, the name as written, a full birth date, a position and the seasons of
the competition squads they were registered in. It was attached as matches and seasons only; the people stayed in staging as
`unresolved`. This pass adds ONLY the men the club does not already hold:
  * players only (coaches are kept out — no game deals a coach);
  * a man whose name (or an alias) is already in any pack file of the club is not added — that is the same record (rule 7,
    exact name after case and diacritics, never fuzzy);
  * a man who shares a SURNAME with a man already in the pack whose years overlap his is held, not added — it may be one man
    under two spellings, and only a person can say so;
  * years are the first and last season of the squads the source lists (a squad is not an appearance — the note says so);
  * one position, mapped from the source's own word; an unmapped word leaves positions empty (rule 11).
New men reach the Royal Rumble at €1M through `npm run rumble:prices -- migrate` (rule 103 §1). Idempotent."""
import collections, glob, json, os, re, sys, unicodedata

QUOTE = 'להצמיד את המחקרים שכן נאספו למועדונים, לשפר את מאגרי המידע שלנו, הכל מאושר'
BY = f'Maor (owner, chat, 12.10.2026): "{QUOTE}"'
DAY = '2026-10-12'
CFG = {
    'st-pauli': {'out': 'players-ready-2026-10-12.json', 'prefix': 'dfb', 'scope': 'DFB data centre: first-team competition squads (a squad is not an appearance).'},
    'zrinjski-mostar': {'out': 'players-ready-2026-10-12.json', 'prefix': 'nft', 'scope': 'National Football Teams: a partial directory of national-team players by club season (a listing is not an appearance, and not a full squad).'},
}
POS = {'gk': 'GK', 'goalkeeper': 'GK', 'df': 'DF', 'defender': 'DF', 'centre back': 'DF', 'center back': 'DF', 'right back': 'DF', 'left back': 'DF',
       'mf': 'MF', 'midfielder': 'MF', 'midfield': 'MF', 'defensive midfield': 'MF', 'central midfield': 'MF', 'attacking midfield': 'MF', 'right midfield': 'MF', 'left midfield': 'MF',
       'fw': 'FW', 'forward': 'FW', 'striker': 'FW', 'centre forward': 'FW', 'center forward': 'FW', 'right winger': 'FW', 'left winger': 'FW', 'winger': 'FW',
       'centre midfielder': 'MF', 'center midfielder': 'MF', 'attacking midfielder': 'MF', 'defensive midfielder': 'MF', 'right midfielder': 'MF', 'left midfielder': 'MF', 'secondary striker': 'FW'}

def display(n):
    """'Tomić, Tomislav' → 'Tomislav Tomić' (the source's own surname-first form, reordered — no letter changes)."""
    n = n.strip()
    if ', ' in n and n.count(',') == 1:
        a, b = n.split(', ', 1); return f'{b} {a}'
    return n
def norm(s):
    """The resolver's own name key (lib/fixtures/names.ts norm): decompose, drop marks, lower case, every non-letter/digit run → one space."""
    return re.sub(r'[\W_]+', ' ', ''.join(c for c in unicodedata.normalize('NFD', s) if not unicodedata.combining(c)).lower()).strip()
def years(seasons):
    ys = []
    for s in re.findall(r'(\d{4})/(\d{2,4})', seasons or ''):
        a = int(s[0]); b = int(s[1]) if len(s[1]) == 4 else (a // 100) * 100 + int(s[1])
        if b < a: b += 100
        ys += [a, b]
    return (min(ys), max(ys)) if ys else (None, None)

def main(club, root='.'):
    os.chdir(root); cfg = CFG[club]
    out_path = f'research-staging/{club}/{cfg["out"]}'
    names, surnames = set(), collections.defaultdict(list)
    for f in glob.glob(f'club-packs/{club}/*.json'):
        if f == out_path: continue
        try: d = json.load(open(f))
        except Exception: continue
        if not isinstance(d, dict): continue
        for p in d.get('players') or []:
            if not isinstance(p, dict) or 'value' not in p: continue
            v = p['value']
            for n in [v.get('name')] + list(v.get('aliases') or []):
                if n: names.add(norm(n)); surnames[norm(n).split(' ')[-1]].append((v.get('name'), v.get('fromYear'), v.get('toYear')))
    D = f'research-staging/{club}/'
    src = {s['id']: s for s in json.load(open(D + 'sources.json'))}
    people = json.load(open(D + 'archive-players.json'))
    players, used, rep, held = [], set(), collections.Counter(), []
    for a in people:
        if a.get('role') != 'player': rep['coach (kept out)'] += 1; continue
        name = display(a.get('nameAsReported') or '')
        if not name: rep['no name'] += 1; continue
        if norm(name) in names: rep['already in the pack'] += 1; continue
        refs = [s for s in a.get('sourceIds') or [] if s in src and str(src[s].get('url', '')).startswith('https://')]
        if not refs: rep['no checked source'] += 1; continue
        fy, ty = years(a.get('seasonsAsReported'))
        clash = [s for s in surnames.get(norm(name).split(' ')[-1], []) if fy and (s[1] is None or s[2] is None or not (s[2] < fy or s[1] > ty))]
        if clash:
            rep['same surname, overlapping years (held)'] += 1; held.append(f'{name} ({a.get("seasonsAsReported")}) ~ {clash[0][0]}'); continue
        pos = sorted({POS[x.strip().lower()] for x in a.get('positionsAsReported') or [] if x.strip().lower() in POS})
        pid = f'{cfg["prefix"]}-{a["providerPersonId"].split(":")[-1]}'
        used.update(refs); rep['ready (held from the resolver — see the docstring)'] += 1
        players.append({'id': pid, 'value': {'name': name, 'sport': 'football', 'positions': pos[:1] if len(pos) > 1 else pos, 'fromYear': fy, 'toYear': ty, 'aliases': []},
                        'sources': refs, 'confidence': 2, 'status': 'approved', 'researchedAt': a.get('researchedAt') or '2026-10-09', 'parserCertainty': 'high', 'conflictFree': True,
                        'approvedAt': DAY, 'approvedBy': BY,
                        'notes': f'{cfg["scope"]} Seasons as listed: {a.get("seasonsAsReported")}. Provider id {a["providerPersonId"]}.'})
    srcrec = lambda s: {'id': s, 'title': src[s].get('title') or src[s].get('url'), 'url': src[s]['url'], 'publisher': src[s].get('publisher') or src[s].get('sourceFamilyId'),
                        'access': src[s].get('access') or 'available', 'checkedAt': (src[s].get('checkedAt') or src[s].get('retrievedAt') or '2026-10-09')[:10]}
    for p in players: p['sourceRecords'] = [srcrec(s) for s in p['sources']]
    players.sort(key=lambda p: p['id'])
    # a staging file is a list of rows with unique ids (tests/research/existing-archives.test.ts); each row carries its own
    # source records, so wiring it is `{sources: unique(rows.flatMap(r => r.sourceRecords)), players: rows}`
    json.dump(players, open(out_path, 'w'), ensure_ascii=False, indent=1); open(out_path, 'a').write('\n')
    print(club, dict(rep))
    for h in held: print('  held:', h)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else '.')
