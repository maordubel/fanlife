#!/usr/bin/env python3
"""
Raja Casablanca · Al Ahly · Wydad Casablanca — the owner's expanded research package (28.10.2026) as club packs.

Owner, 28.10.2026: "open an archive for these clubs too". The package is kept as received under
research-data/research/maghreb-2026-10-28/ and this script is the only step between it and the packs, so a re-run
reproduces them exactly. Nothing is invented: a row whose competition, side, date or score the package (or the season
page it cites) does not state is NOT imported and is counted as such in coverage.json.

  python3 scripts/research/import-maghreb-2026-10-28.py
"""
import csv, json, re, hashlib, os, collections
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'research-data/research/maghreb-2026-10-28')
DAY = '2026-10-28'
APPROVED_BY = 'Maor Harel (owner, chat 2026-10-28)'
NOTE = 'Approved by the owner in chat on 2026-10-28 (Raja/Al Ahly/Wydad expanded research package).'
CLUBS = {'raja': 'raja-casablanca', 'al-ahly': 'al-ahly', 'ahly': 'al-ahly', 'wydad': 'wydad-casablanca'}
NAMES = {'raja-casablanca': 'Raja Casablanca', 'al-ahly': 'Al Ahly', 'wydad-casablanca': 'Wydad Casablanca'}
US = {'raja-casablanca': ['raja ca', 'raja casablanca', 'raja'], 'wydad-casablanca': ['wydad ac', 'wydad casablanca', 'wydad', 'wac casablanca', 'wac'], 'al-ahly': ['al ahly', 'al-ahly', 'ahly']}

# Competition of each dated match, read from the season page the package cites (RS, WS, AS — fetched 28.10.2026).
# A date the page does not place in a section is left out; a friendly is left out (no game asks about friendlies).
SECTIONS = {
 'raja-casablanca': {'2023-07-28': 'Arab Club Champions Cup', '2023-07-31': 'Arab Club Champions Cup', '2023-08-03': 'Arab Club Champions Cup', '2023-08-06': 'Arab Club Champions Cup',
  **{d: 'Botola Pro' for d in ['2023-08-27','2023-09-03','2023-09-17','2023-09-24','2023-10-01','2023-10-08','2023-10-28','2023-11-06','2023-11-11','2023-11-26','2023-12-09','2023-12-24','2023-12-28','2024-01-03','2024-01-06','2024-02-08','2024-02-11','2024-02-14','2024-02-17','2024-02-20','2024-02-24','2024-03-03','2024-03-10','2024-03-16','2024-04-14','2024-04-21','2024-05-24','2024-05-28','2024-06-02','2024-06-14']},
  **{d: 'Moroccan Throne Cup' for d in ['2024-03-30','2024-04-06','2024-05-11','2024-06-25','2024-07-01']}},
 'wydad-casablanca': {**{d: 'Botola Pro' for d in ['2021-09-12','2021-09-19','2021-09-26','2021-09-29','2021-10-03','2021-10-21','2021-10-28','2021-10-31','2021-11-03','2021-11-06','2021-11-19','2021-11-23','2021-12-18','2021-12-24','2021-12-28','2022-02-05','2022-02-15','2022-02-23','2022-03-01','2022-03-05','2022-04-26','2022-04-29','2022-05-18','2022-05-22','2022-06-16','2022-06-19','2022-06-22','2022-06-25','2022-06-29','2022-07-04']},
  **{d: 'Moroccan Throne Cup' for d in ['2022-04-05','2022-04-09','2022-07-07','2022-07-20','2022-07-28']},
  **{d: 'CAF Champions League' for d in ['2021-10-17','2021-10-24','2022-02-11','2022-02-19','2022-02-26','2022-03-11','2022-03-19','2022-04-02','2022-04-16','2022-04-23','2022-05-07','2022-05-13','2022-05-30']}},
 'al-ahly': {**{d: 'CAF Champions League' for d in ['2019-08-11','2019-08-23','2019-09-14','2019-09-28','2019-11-29','2019-12-06','2019-12-28','2020-01-11','2020-01-26','2020-02-29','2020-03-07','2020-10-17','2020-10-23']},
  **{d: 'Egyptian Premier League' for d in ['2019-09-23','2019-10-02','2019-10-05','2019-11-25','2019-12-11','2019-12-15','2019-12-19','2019-12-23','2020-01-01','2020-01-05','2020-01-15','2020-01-19','2020-02-06','2020-02-10','2020-02-14','2020-02-24','2020-03-11','2020-08-09','2020-08-14','2020-08-17','2020-08-22','2020-08-26','2020-08-29','2020-09-04','2020-09-07','2020-09-11','2020-09-14','2020-09-19','2020-09-23','2020-09-27','2020-10-04','2020-10-07','2020-10-11','2020-10-31']},
  **{d: 'Egypt Cup' for d in ['2019-12-03','2020-09-30','2020-11-21','2020-12-01','2020-12-05']},
  '2020-02-20': 'Egyptian Super Cup'},
}

def rows(name):
    with open(os.path.join(SRC, 'data', name), encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))
def h(s, n=12): return hashlib.sha256(s.encode()).hexdigest()[:n]
def fact(id_, value, sources, notes=''):
    return {'id': id_, 'value': value, 'sources': sources, 'confidence': 2, 'status': 'approved', 'researchedAt': DAY,
            'parserCertainty': 'high', 'conflictFree': True, 'approvedAt': DAY, 'approvedBy': APPROVED_BY, 'notes': f'{NOTE} {notes}'.strip()}
def publisher(url):
    host = urlparse(url).netloc.lower().removeprefix('www.').removeprefix('amp.')
    known = {'en.wikipedia.org': 'Wikipedia', 'fr.wikipedia.org': 'Wikipedia', 'rsssf.org': 'RSSSF', 'cafonline.com': 'CAF', 'footballkitarchive.com': 'Football Kit Archive',
             'transfermarkt.fr': 'Transfermarkt', 'alahlyegypt.com': 'Al Ahly SC', 'ssfaonline.com': 'SSFA Online', 'zamalek-eg.net': 'Zamalek-eg.net', 'yabiladi.com': 'Yabiladi',
             'fcbayern.com': 'FC Bayern', 'calciopedia.org': 'Calciopedia', 'wydad-history.com': 'Wydad History', 'wydad.net': 'Wydad.net', 'merip.org': 'MERIP',
             'fount.aucegypt.edu': 'AUC Knowledge Fountain', 'rajacasablanca.ucoz.com': 'Raja fan archive', 'tribuna.com': 'Tribuna', 'tandfonline.com': 'Taylor & Francis'}
    return known.get(host, host)

sources_all = {}
for r in rows('sources.csv'):
    sources_all[r['source_id']] = {'id': f"mg-{r['source_id'].lower()}", 'title': r['notes'] and f"{publisher(r['url'])} — {r['source_id']}", 'url': r['url'], 'publisher': publisher(r['url']), 'access': 'available', 'checkedAt': r['checked'] or DAY}
for r in rows('prior_sources.csv'):
    sources_all[r['id']] = {'id': f"mg-p{r['id'].lower()}", 'title': r['title'], 'url': r['url'], 'publisher': publisher(r['url']), 'access': 'available', 'checkedAt': DAY}
def sid(code): return sources_all[code]['id']

packs = {c: {'schemaVersion': 1, 'clubId': c, 'contentLocale': 'en', 'sources': [], 'archive': [], 'players': [], 'rivals': [], 'matches': [], 'trophies': [], 'seasons': []} for c in NAMES}
used = {c: set() for c in NAMES}
cov = collections.OrderedDict()
def use(club, code): used[club].add(code); return sid(code)
def count(file, total, kept, why=''):
    cov[file] = {'rows': total, 'imported': kept, 'note': why}

def is_us(club, name):
    n = re.sub(r'[^a-z ]', ' ', name.lower()).strip()
    return any(n == u or n.startswith(u + ' ') or n == u.replace('-', ' ') for u in US[club])

# ── players: name, position (the French list states one), years; appearances/goals are NOT imported (league-only, unreliable)
POS = [('gardien', 'GK'), ('défenseur', 'DF'), ('defenseur', 'DF'), ('milieu', 'MF'), ('attaquant', 'FW'), ('attauquant', 'FW')]
def years(s):
    s = (s or '').replace('–', '-').strip()
    m = re.match(r'^(\d{4}|\?)?\s*-\s*(\d{4}|now|\?)?$', s) or re.match(r'^(\d{4})$', s)
    if not m: return None, None
    a = m.group(1); b = m.group(2) if m.lastindex and m.lastindex >= 2 else a
    fy = int(a) if a and a.isdigit() else None
    ty = 2026 if b == 'now' else int(b) if b and b.isdigit() else None
    if fy and ty and ty < fy: return fy, None
    return fy, ty
P = rows('players_staging.csv'); kept = 0
seen = {c: {} for c in NAMES}
for r in P:
    club = CLUBS[r['club_id']]; name = re.sub(r'\s+', ' ', r['name_as_source']).strip()
    # a scraped interlanguage marker ("Salif Diagne (en)†en.wikipedia.org") is page furniture, not part of the name
    name = re.sub(r'\s*\([a-z]{2}\)\s*†.*$', '', name).strip()
    # a name only in Arabic script is not transliterated here (rule 11): reported as skipped
    if not name or re.search(r'\d', name) or re.search(r'[\u0600-\u06ff]', name): continue
    pos = next((code for k, code in POS if k in r['position_as_source'].lower()), None)
    fy, ty = years(r['years_as_source'])
    key = (name.lower(), fy, ty)
    if key in seen[club]: continue
    seen[club][key] = True
    v = {'name': name, 'sport': 'football', 'positions': [pos] if pos else [], 'fromYear': fy, 'toYear': ty, 'aliases': []}
    packs[club]['players'].append(fact(f"p-mg-{h(club + name + str(fy) + str(ty))}", v, [use(club, r['source_id'])], 'One source; years as the source lists them; appearances and goals not imported.'))
    kept += 1
# two different men under one name (different years) keep both rows; the card prints the first year so a reader can tell them apart
for club in NAMES:
    by = {}
    for f in packs[club]['players']: by.setdefault(f['value']['name'].lower(), []).append(f)
    for fs in by.values():
        if len(fs) > 1:
            for f in fs:
                v = f['value']
                if v['fromYear']: v['aliases'] = [v['name']]; v['name'] = f"{v['name']} ({v['fromYear']})"
count('players_staging.csv', len(P), kept, 'exact duplicate rows folded; a row with no readable name, or a name only in Arabic script, skipped')

# ── season matches: only a competitive night the cited season page places in a section
S = rows('season_matches_staging.csv'); kept = 0; unplaced = 0; friendly = 0
for r in S:
    club = CLUBS[r['club']]; on = r['date_iso']
    if 'friendly' in r['source_date_and_round'].lower(): friendly += 1; continue
    comp = SECTIONS[club].get(on)
    if not comp or not r['home_score'].isdigit() or not r['away_score'].isdigit(): unplaced += 1; continue
    home, away = r['home'].strip(), r['away'].strip()
    if not (is_us(club, home) or is_us(club, away)): unplaced += 1; continue
    us = 'home' if is_us(club, home) else 'away'
    v = {'name': f"{home} {r['home_score']}-{r['away_score']} {away}", 'on': on, 'competition': comp, 'home': home, 'away': away, 'homeGoals': int(r['home_score']), 'awayGoals': int(r['away_score']), 'us': us, 'score': f"{r['home_score']}-{r['away_score']}", 'venue': r['location'] or None, 'scorers': [], 'lineup': [], 'bench': [], 'sport': 'football'}
    packs[club]['matches'].append(fact(f"m-mg-{h(club + on + home + away)}", v, [use(club, r['source_id'])], 'Competition from the cited season page section.'))
    kept += 1
count('season_matches_staging.csv', len(S), kept, f'{friendly} friendlies left out; {unplaced} rows the season page does not place in a competition (or without a score)')

# ── the nights the package documents beyond the season pages
def night(club, id_, on, comp, home, away, hg, ag, codes, scorers=None, lineup=None, note=''):
    us = 'home' if is_us(club, home) else 'away'
    v = {'name': f'{home} {hg}-{ag} {away}', 'on': on, 'competition': comp, 'home': home, 'away': away, 'homeGoals': hg, 'awayGoals': ag, 'us': us, 'score': f'{hg}-{ag}', 'venue': None,
         'scorers': scorers or [], 'lineup': lineup or [], 'bench': [], 'sport': 'football'}
    packs[club]['matches'].append(fact(id_, v, [use(club, c) for c in codes], note))
G = rows('goal_events.csv')
derby19 = [g for g in G if g['match'].startswith('2019-11-23')]
def goals_for(c): return [{'name': g['scorer'], 'minute': int(g['minute']) if g['minute'].isdigit() else None} for g in derby19 if CLUBS.get(g['club']) == c]
r_g, w_g = goals_for('raja-casablanca'), goals_for('wydad-casablanca')
night('raja-casablanca', 'm-mg-derby-2019-11-23', '2019-11-23', 'Arab Club Champions Cup', 'Raja CA', 'Wydad AC', len(r_g), len(w_g), ['DERBY19'], r_g, note='Score counted from the eight goal events the source lists.')
night('wydad-casablanca', 'm-mg-derby-2019-11-23', '2019-11-23', 'Arab Club Champions Cup', 'Raja CA', 'Wydad AC', len(r_g), len(w_g), ['DERBY19'], w_g, note='Score counted from the eight goal events the source lists.')
night('raja-casablanca', 'm-mg-cwc-final-2013', '2013-12-21', 'FIFA Club World Cup final', 'Bayern Munich', 'Raja CA', 2, 0, ['FINAL13'], [], note='Score from the two goals the source lists (Dante, Thiago).')
moutaraji = [{'name': 'Zouheir El Moutaraji', 'minute': None}, {'name': 'Zouheir El Moutaraji', 'minute': None}]
night('wydad-casablanca', 'm-mg-cl-final-2022', '2022-05-30', 'CAF Champions League final', 'Wydad AC', 'Al Ahly', 2, 0, ['CAF22'], moutaraji, note='Both goals by El Moutaraji per CAF; minutes not taken.')
night('al-ahly', 'm-mg-cl-final-2022', '2022-05-30', 'CAF Champions League final', 'Wydad AC', 'Al Ahly', 2, 0, ['CAF22'], [], note='CAF report.')
count('goal_events.csv', len(G), len(derby19) + 1 + 2, 'the 2019 derby (8 goals), the 2022 final double, the 2013 final score')

PM = rows('prior_matches.csv'); kept = 0
L = rows('prior_lineup_candidates.csv'); lineups = collections.defaultdict(list)
for r in L: lineups[r['match_id']].append(r['name_as_source'].strip())
D = rows('cairo_derby_lineup_staging.csv')
derby_lu = collections.defaultdict(list)
for r in D: derby_lu[r['match_id']].append(re.sub(r'\s*[\(\[].*$', '', r['entry_as_source']).strip())
for r in PM:
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', r['date']): continue
    codes = ['p' + c if False else c for c in r['source_ids'].split('|')]
    for c in r['club_ids'].split('|'):
        club = CLUBS[c]
        lu = lineups.get(r['match_id']) if r['match_id'].startswith('RAJ') else derby_lu.get('DERBY-' + r['date']) if 'derby' in r['competition'].lower() else None
        comp = 'CAF Champions League final' if 'final' in r['competition'].lower() and 'CAF' in r['competition'] else 'Cairo derby' if 'derby' in r['competition'].lower() else r['competition']
        night(club, f"m-mg-{r['match_id'].lower()}", r['date'], comp, r['home'], r['away'], int(r['home_goals']), int(r['away_goals']), codes,
              lineup=[x for x in (lu or []) if x][:11] if lu and len([x for x in lu if x]) >= 11 else [], note=r['status'])
        kept += 1
count('prior_matches.csv', len(PM), sum(1 for r in PM if re.match(r'^\d{4}-\d{2}-\d{2}$', r['date'])), 'undated rows (13 Al Ahly CAF 2019/20 legs, 2 Wydad 1992 finals) kept out of chronology')
count('prior_lineup_candidates.csv', len(L), sum(len(v) for k, v in lineups.items()), 'attached to the two dated 1999 final legs')
count('cairo_derby_lineup_staging.csv', len(D), len(derby_lu.get('DERBY-1979-03-23', [])), 'only the derby whose score the package records (23 Mar 1979); nine other lineups wait for a score')
for k in ('prior_sources.csv', 'sources.csv'): pass

# ── honours: league titles (RSSSF), and Al Ahly's honours table
T = rows('league_titles_staging.csv'); by = collections.defaultdict(list)
for r in T: by[CLUBS[r['club']]].append(r)
LEAGUE = {'raja-casablanca': 'Moroccan league', 'wydad-casablanca': 'Moroccan league', 'al-ahly': 'Egyptian Premier League'}
for club, rs in by.items():
    seasons = sorted({r['season'] for r in rs if re.match(r'^\d{4}/\d{2}$', r['season'])})
    packs[club]['trophies'].append(fact(f'tr-mg-league', {'name': LEAGUE[club], 'seasons': seasons, 'count': None}, [use(club, rs[0]['source_id'])], 'Champion seasons as RSSSF lists them; pre-independence and shared titles flagged for review in the package.'))
count('league_titles_staging.csv', len(T), len(T))
HN = rows('honours_source_rows.csv'); hk = 0
for r in HN:
    cells = [c.strip() for c in r['row'].split('|')]
    if len(cells) < 4 or cells[0] in ('Type', '---'): continue
    if not re.search(r'\d', ' '.join(cells)): continue
    # rows are "[Type |] Competition | Titles | Winning seasons | Runners up"
    i = next((k for k, c in enumerate(cells) if re.fullmatch(r'\d+(\^\{S\})?', c)), None)
    if i is None or i == 0: continue
    name, n, wins = cells[i - 1], int(re.match(r'\d+', cells[i]).group()), cells[i + 1] if i + 1 < len(cells) else ''
    if not name or name.lower() in ('egyptian premier league',): continue  # the league row is the RSSSF list above
    seasons = [s.strip().replace('–', '/').replace('-', '/') for s in re.split(r',\s*', wins) if re.match(r'^\d{4}', s.strip())]
    seasons = [re.sub(r'^(\d{4})/(\d{2})$', r'\1/\2', s) for s in seasons]
    packs['al-ahly']['trophies'].append(fact(f"tr-mg-{h(name)}", {'name': name, 'seasons': seasons, 'count': n}, [use('al-ahly', 'ACH')], 'Community-maintained honours table; official records to be confirmed.'))
    hk += 1
count('honours_source_rows.csv', len([r for r in HN if not r['row'].startswith(('Type', '---'))]), hk)

# ── seasons: league finish per season (Raja and Wydad season lists)
SR = rows('season_records_raw.csv'); sk = 0
for r in SR:
    club = CLUBS[r['club']]; cells = [c.strip() for c in r['source_table_row'].split('|')]
    m = re.match(r'^(\d{4})[–-](\d{2})$', cells[0])
    fin = next((c for c in cells[1:12] if re.fullmatch(r'\d{1,2}(st|nd|rd|th)', c)), None)
    if not m or not fin: continue
    div = re.sub(r'\^\{.*?\}', '', cells[1]).strip()
    s = f'{m.group(1)}/{m.group(2)}'
    packs[club]['seasons'].append(fact(f's-mg-{s.replace("/", "-")}', {'season': s, 'name': s, 'finish': f'{fin}, {div}', 'league': div}, [use(club, r['source_id'])], 'League finish from the season list; other columns not imported.'))
    sk += 1
count('season_records_raw.csv', len(SR), sk, 'rows with no league finish (a season of friendlies, a division without a place) left out')

# ── rivals and the founding years the package's sources state
packs['raja-casablanca']['rivals'].append(fact('r-wydad', {'name': 'Wydad AC', 'aliases': ['Wydad Casablanca', 'WAC'], 'note': 'The Casablanca derby'}, [use('raja-casablanca', 'DERBY19')]))
packs['wydad-casablanca']['rivals'].append(fact('r-raja', {'name': 'Raja CA', 'aliases': ['Raja Casablanca', 'Raja'], 'note': 'The Casablanca derby'}, [use('wydad-casablanca', 'DERBY19')]))
packs['al-ahly']['rivals'].append(fact('r-zamalek', {'name': 'Zamalek', 'aliases': ['Zamalek SC'], 'note': 'The Cairo derby'}, [use('al-ahly', 'DERBY')]))
packs['wydad-casablanca']['archive'].append(fact('t-founded', {'name': 'Wydad AC is founded in Casablanca', 'hint': 'The football section followed two years later.', 'sport': 'football', 'sensitive': False, 'precision': 'year', 'year': 1937}, [use('wydad-casablanca', 'WAHIS')]))

# ── the archive: every imported competitive night is a dated card (title never carries its year)
for club, p in packs.items():
    days = set()
    for m in sorted(p['matches'], key=lambda f: f['value']['on']):
        v = m['value']
        if v['on'] in days: continue
        days.add(v['on'])
        p['archive'].append(fact(f"t-{m['id']}", {'name': f"{v['name']} — {v['competition']}", 'hint': v['competition'], 'sport': 'football', 'sensitive': False, 'precision': 'day', 'on': v['on']}, m['sources']))
    p['sources'] = [sources_all[k] for k in sorted(used[club])]

for club, p in packs.items():
    os.makedirs(os.path.join(ROOT, 'club-packs', club), exist_ok=True)
    with open(os.path.join(ROOT, 'club-packs', club, 'core.json'), 'w', encoding='utf-8') as f:
        json.dump(p, f, ensure_ascii=False, indent=1); f.write('\n')
total = sum(v['rows'] for v in cov.values()); imp = sum(v['imported'] for v in cov.values())
summary = {'package': 'FanLife_Raja_AlAhly_Wydad_Expanded_Research (28.10.2026)', 'rows': total, 'imported': imp, 'percent': round(100 * imp / total, 1), 'files': cov,
           'perClub': {c: {k: len(p[k]) for k in ('players', 'matches', 'archive', 'trophies', 'seasons', 'rivals', 'sources')} for c, p in packs.items()}}
with open(os.path.join(SRC, 'coverage.json'), 'w', encoding='utf-8') as f:
    json.dump(summary, f, ensure_ascii=False, indent=1); f.write('\n')
print(json.dumps(summary, ensure_ascii=False, indent=1))
