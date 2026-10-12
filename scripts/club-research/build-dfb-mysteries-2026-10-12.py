#!/usr/bin/env python3 -I
"""St. Pauli Blind Cow from the DFB squad registrations the existing-archive package read (staged 2026-10-09)
→ club-packs/st-pauli/wave-mysteries-dfb-2026-10-12.json. Owner approval, chat 2026-10-12:
"להצמיד את המחקרים שכן נאספו למועדונים, לשפר את מאגרי המידע שלנו, הכל מאושר".

St. Pauli plays no UEFA football, so gate 10 had no mystery at all (the UEFA builder, scripts/ingest/clubs/uefa-mysteries.ts,
had nothing to read). The national association's data centre states, for every man it registered in a St. Pauli first-team
competition squad: his position, his full birth date, the season and competition of each squad and, mostly, his shirt number.
Each mystery is built from those rows only, in the UEFA builder's shape:
  Position · Born (month and year) · First squad (season + competition) · Last squad (season + competition) · Shirt number (with its season)
  — a clue the source does not state is left out, a mystery under five clues is not written, the name is never in a clue,
    no count or total is printed (the DFB record of St. Pauli is not complete — regional seasons are missing — so "N squads"
    would be a total without a complete source, BC-R03);
  — the target is the pack player whose name matches the DFB name exactly after case and diacritics, and only when exactly ONE
    pack player does (rule 7). Men added only by the roster wave are not targets: that wave joins after compilation.
Idempotent; a pure function of the staged package and the pack."""
import collections, glob, json, os, re, sys, unicodedata

QUOTE = 'להצמיד את המחקרים שכן נאספו למועדונים, לשפר את מאגרי המידע שלנו, הכל מאושר'
BY = f'Maor (owner, chat, 12.10.2026): "{QUOTE}"'
DAY = '2026-10-12'
CLUB = 'st-pauli'
OUT = f'club-packs/{CLUB}/wave-mysteries-dfb-2026-10-12.json'
D = f'research-staging/{CLUB}/'
POS = {'GK': 'A goalkeeper.', 'DF': 'A defender.', 'MF': 'A midfielder.', 'FW': 'A forward.'}
COMP = {'bundesliga': 'Bundesliga', '2-bundesliga': '2. Bundesliga'}
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
def norm(s):
    """The resolver's own name key (lib/fixtures/names.ts norm): decompose, drop marks, lower case, every non-letter/digit run → one space."""
    return re.sub(r'[\W_]+', ' ', ''.join(c for c in unicodedata.normalize('NFD', s) if not unicodedata.combining(c)).lower()).strip()
def season_key(s): return int(s[:4])

def main(root='.'):
    os.chdir(root)
    by_name = collections.defaultdict(set)
    for f in glob.glob(f'club-packs/{CLUB}/*.json'):
        if f == OUT or os.path.basename(f).startswith('wave-roster-'): continue
        try: d = json.load(open(f))
        except Exception: continue
        if not isinstance(d, dict): continue
        for p in d.get('players') or []:
            if isinstance(p, dict) and 'value' in p and p.get('status') == 'approved':
                for n in [p['value'].get('name')] + list(p['value'].get('aliases') or []):
                    if n: by_name[norm(n)].add(p['id'])
    src = {s['id']: s for s in json.load(open(D + 'sources.json'))}
    rows = collections.defaultdict(list)
    for m in json.load(open(D + 'squad-memberships.json')):
        if m.get('role') == 'player' and m.get('season') and m.get('competition') in COMP: rows[m['providerPersonId']].append(m)
    people = {a['providerPersonId']: a for a in json.load(open(D + 'archive-players.json')) if a.get('role') == 'player'}
    out, used, rep = [], set(), collections.Counter()
    for pid, a in sorted(people.items()):
        ids = by_name.get(norm(a.get('nameAsReported') or ''), set())
        if len(ids) != 1: rep['no single pack player' if not ids else 'two pack players share the name'] += 1; continue
        target = next(iter(ids))
        ms = sorted(rows.get(pid, []), key=lambda m: season_key(m['season']))
        if not ms: rep['no squad row'] += 1; continue
        refs = lambda m: [s for s in m.get('sourceIds') or [] if s in src and str(src[s].get('url', '')).startswith('https://')]
        clues = []
        pos = {m.get('position') for m in ms if m.get('position')}
        if len(pos) == 1: clues.append({'label': 'Position', 'value': POS[pos.pop()], 'sources': refs(ms[-1])})
        bd = {m.get('birthDate') for m in ms if m.get('birthDate')}
        if len(bd) == 1:
            y, mo = re.match(r'(\d{4})-(\d{2})-', bd.pop()).groups()
            clues.append({'label': 'Born', 'value': f'Born in {MONTHS[int(mo) - 1]} {y}.', 'sources': refs(ms[0])})
        first, last = ms[0], ms[-1]
        clues.append({'label': 'First squad', 'value': f'First registered in a {COMP[first["competition"]]} squad of the club in the {first["season"]} season.', 'sources': refs(first),
                      'scope': {'season': first['season'], 'competition': COMP[first['competition']]}})
        if last['season'] != first['season']:
            clues.append({'label': 'Last squad', 'value': f'Last registered in a {COMP[last["competition"]]} squad of the club in the {last["season"]} season.', 'sources': refs(last),
                          'scope': {'season': last['season'], 'competition': COMP[last['competition']]}})
        numbered = [m for m in reversed(ms) if str(m.get('shirtNumberAsReported') or '').isdigit() and int(m['shirtNumberAsReported']) > 0]
        if numbered:
            m = numbered[0]
            clues.append({'label': 'Shirt number', 'value': f'Wore number {int(m["shirtNumberAsReported"])} in the {m["season"]} season.', 'sources': refs(m), 'type': 'shirt_number',
                          'scope': {'season': m['season'], 'competition': COMP[m['competition']]}})
        clues = [c for c in clues if c['sources']]
        if len(clues) < 5: rep['under five clues'] += 1; continue
        for i, c in enumerate(clues): c['id'] = f'c{i + 1}'
        clues = [{'id': c['id'], **{k: v for k, v in c.items() if k != 'id'}} for c in clues]
        all_refs = sorted({s for c in clues for s in c['sources']}); used.update(all_refs)
        rep['written'] += 1
        out.append({'id': f'dfb-m-{pid.split(":")[-1]}', 'value': {'targetPlayerId': target, 'clues': clues}, 'sources': all_refs, 'confidence': 2, 'status': 'approved',
                    'researchedAt': '2026-10-09', 'approvedAt': DAY, 'approvedBy': BY, 'parserCertainty': 'high', 'conflictFree': True,
                    'notes': "Every clue is stated by the DFB data centre's St. Pauli squad registrations (a squad is not an appearance); the target is the one pack player with that exact name."})
    sources = [{'id': s, 'title': src[s].get('title') or src[s]['url'], 'url': src[s]['url'], 'publisher': src[s].get('publisher') or 'Deutscher Fußball-Bund',
                'access': src[s].get('access') or 'available', 'checkedAt': (src[s].get('checkedAt') or '2026-10-09')[:10]} for s in sorted(used)]
    json.dump({'sources': sources, 'mysteries': out}, open(OUT, 'w'), ensure_ascii=False, indent=1); open(OUT, 'a').write('\n')
    print(CLUB, dict(rep))

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
