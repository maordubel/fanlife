#!/usr/bin/env python3 -I
"""research-staging/panathinaikos/lineups.json → club-packs/panathinaikos/wave-pao-lineups-2026-10-12.json

The Panathinaikos research package (pao.gr, staged 2026-10-06) holds 155 team sheets. The 10-08 import took its matches and
honours but not the sheets, so 50 Panathinaikos elevens sat in staging while their matches played without one. Owner approval,
chat 2026-10-12: "להצמיד את המחקרים שכן נאספו למועדונים, לשפר את מאגרי המידע שלנו, הכל מאושר".

What is attached, and nothing else:
  * Panathinaikos' OWN sheet only (the package also lists the opponent's — those are not ours to put on a pitch);
  * a complete listing with exactly eleven distinct starters, names as the club wrote them (an ALL-CAPS name is cased, nothing
    else changes — no canonical person is claimed, rule 7);
  * the match from the same staged record (date, sides, score as displayed). lib/clubs/euro-wave.ts fills the eleven into the
    pack's match of that day when that match has none, and adds the match when the pack has no match that day;
  * decoys: the other starters the SAME source lists for Panathinaikos in the SAME season — so a gate-3 round mixes names in one
    style instead of putting the club's surnames next to the roster's full names;
  * at least eight such decoys, or the sheet is held (the roster's full names would give the surnames away);
  * a sheet whose score disagrees with the pack's match of that day is held (reported), never attached.
Scorers stay out: the package's goal claims say "credited side unresolved", so whose goal it was is not known (rule 11).
Idempotent; a pure function of the staged package and the pack."""
import collections, glob, json, os, re, sys

QUOTE = 'להצמיד את המחקרים שכן נאספו למועדונים, לשפר את מאגרי המידע שלנו, הכל מאושר'
BY = f'Maor (owner, chat, 12.10.2026): "{QUOTE}"'
DAY = '2026-10-12'
D = 'research-staging/panathinaikos/'
OUT = 'club-packs/panathinaikos/wave-pao-lineups-2026-10-12.json'
MIN_DECOYS = 8
LAT = {"Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K", "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X"}
ACR = {"AEK", "AEL", "OFI", "PAOK", "PAS", "FC", "AC", "SC", "SK", "NK", "FK", "IF", "KV", "CF", "AZ", "AS", "RC", "TC", "BSC", "CSKA", "HJK", "GAS", "APOEL"}
ALIAS = {"olympiakos": "Olympiacos", "olympiacos": "Olympiacos", "aek": "AEK Athens", "aek athens": "AEK Athens", "paok": "PAOK", "panathinaikos": "Panathinaikos", "aris": "Aris"}
COMP = {"super league": "Super League", "greek cup": "Greek Cup", "europa league": "UEFA Europa League", "uefa champions league": "UEFA Champions League",
        "champions league": "UEFA Champions League", "european cup": "European Cup", "uefa cup": "UEFA Cup", "intercontinental cup": "Intercontinental Cup",
        "balkan cup": "Balkan Cup", "friendly matches": "Friendly"}

def latin(s):
    """Greek capitals that look like Latin ones, inside a word that is otherwise Latin — or a word made ONLY of look-alikes (ΑΕΚ)."""
    if not s: return s
    words = []
    for w in s.split(' '):
        lat = sum(c.isascii() and c.isalpha() for c in w)
        words.append(''.join(LAT.get(c, c) for c in w) if lat >= 1 or (w and all(c in LAT for c in w)) else w)
    return ' '.join(words)

def cased(n):
    n = latin(n).strip()
    if n.upper() != n: return n
    return ' '.join(w if w in ACR or re.search(r'\d', w) else w.capitalize() for w in n.split(' '))

def club(n):
    n = cased(n or '')
    return ALIAS.get(n.lower(), n)

def is_us(n): return club(n) == 'Panathinaikos'

def main(root='.'):
    os.chdir(root)
    lineups = json.load(open(D + 'lineups.json'))
    matches = {m['id']: m for m in json.load(open(D + 'matches.json'))}
    staged_src = {s['id']: s for s in json.load(open(D + 'sources.json'))}
    pack_day = collections.defaultdict(list)
    for f in glob.glob('club-packs/panathinaikos/*.json'):
        if f.endswith(os.path.basename(OUT)): continue
        d = json.load(open(f))
        if not isinstance(d, dict): continue
        for m in d.get('matches') or []:
            if isinstance(m, dict) and m.get('status') == 'approved' and (m.get('value') or {}).get('on'): pack_day[m['value']['on']].append(m)
    ours = [l for l in lineups if is_us(l['teamNameAsReported'])]
    by_season = collections.defaultdict(set)
    for l in ours:
        m = matches.get(l['matchId'])
        if m and m.get('season'):
            for s in l['startersAsReported']: by_season[m['season']].add(cased(s['nameAsReported']))
    out, used, report = [], set(), collections.Counter()
    seen_day = set()
    for l in ours:
        m = matches.get(l['matchId'])
        if not m: report['no staged match'] += 1; continue
        starters = [cased(s['nameAsReported']) for s in l['startersAsReported'] if (s.get('nameAsReported') or '').strip()]
        if l.get('coverageStatus') != 'complete_listing': report['partial or malformed listing'] += 1; continue
        if len(starters) != 11 or len(set(starters)) != 11: report[f'{len(set(starters))} distinct starters, not 11'] += 1; continue
        on, sc = m.get('playedOn'), m.get('scoreAsReported') or {}
        if m.get('datePrecision') != 'day' or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', on or ''): report['no exact day'] += 1; continue
        if sc.get('home') is None or sc.get('away') is None: report['no score'] += 1; continue
        if on in seen_day: report['second sheet for the same day'] += 1; continue
        pair = sorted([int(sc['home']), int(sc['away'])])
        clash = [p for p in pack_day.get(on, []) if re.fullmatch(r'\d+[-–]\d+', str(p['value'].get('score') or '')) and sorted(int(x) for x in re.split(r'[-–]', p['value']['score'])) != pair]
        if clash: report['score differs from the pack match of that day (held)'] += 1; continue
        refs = [s for s in (l.get('sourceIds') or []) + (m.get('sourceIds') or []) if s in staged_src and staged_src[s]['url'].startswith('https://')]
        refs = list(dict.fromkeys(refs))
        if not refs: report['no checked source'] += 1; continue
        home, away = club(m['homeName']), club(m['awayName'])
        if not (is_us(m['homeName']) or is_us(m['awayName'])): report['club side not readable'] += 1; continue
        comp = COMP.get((m.get('competitionAsReported') or '').strip().lower(), m.get('competitionAsReported'))
        decoys = sorted(by_season.get(m.get('season'), set()) - set(starters))
        # gate 3 deals the eleven plus eleven decoys; with fewer than eight from the same sheet style the roster's full names fill
        # the rest and give the answer away (surnames vs full names) — such a sheet is held, not attached
        if len(decoys) < MIN_DECOYS: report[f'fewer than {MIN_DECOYS} same-source decoys that season (held)'] += 1; continue
        seen_day.add(on); used.update(refs)
        report['attached'] += 1
        out.append({'id': 'pl-' + l['id'][-12:], 'value': {'name': f"{home} {sc['home']}-{sc['away']} {away}", 'on': on, 'competition': comp, 'score': f"{sc['home']}-{sc['away']}",
                    'venue': None, 'lineup': starters, 'bench': [], 'decoys': decoys, 'scorers': [], 'sport': 'football'},
                    'sources': refs, 'researchedAt': '2026-10-06', 'parserCertainty': 'high', 'conflictFree': True, 'confidence': 2, 'status': 'approved',
                    'approvedAt': DAY, 'approvedBy': BY,
                    'notes': "Panathinaikos' own team sheet (pao.gr), names as the club wrote them; decoys are the same source's other starters that season. Scorers not attached: the source leaves the credited side unresolved."})
    sources = [{'id': s, 'title': staged_src[s]['title'], 'url': staged_src[s]['url'], 'publisher': staged_src[s].get('publisher') or staged_src[s].get('sourceFamilyId'),
                'access': staged_src[s].get('access') or 'unknown', 'checkedAt': staged_src[s].get('checkedAt')} for s in sorted(used)]
    out.sort(key=lambda f: f['value']['on'])
    json.dump({'sources': sources, 'matches': out}, open(OUT, 'w'), ensure_ascii=False, indent=1); open(OUT, 'a').write('\n')
    print('our sheets', len(ours), dict(report))

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
