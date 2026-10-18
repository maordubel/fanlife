#!/usr/bin/env python3
"""Offline, reproducible conversion of the recovered season evidence into waves.

Unresolved dates, sides, names and administrative/abandoned results stay in the
review report. No player, lineup, scorer or play-by-play is inferred from a score.
"""
import collections
import datetime
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / 'research-data/history-recovery-2026-10-18'
DAY = '2026-10-18'
BY = 'owner: chat 2026-10-18 — תעלה , תאשר את כל המחקר שלך להיכנס ישירות לארכיונים ולפיצרים.'
MONTHS = {m: i for i, m in enumerate(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], 1)}
HPT_COMPS = {'ליגה': 'Israeli League', 'גביע המדינה': 'Israel State Cup', 'גביע הטוטו': 'Toto Cup', 'אלוף האלופים': 'Israel Super Cup', 'מגן ההתאחדות': 'Israel FA Shield', 'גביע העשור': 'Decade Cup', 'גביע סוכות': 'Sukkot Cup', 'גביע איגוד השופטים': 'Referees Association Cup', 'ליגת החרום': 'Emergency League', 'גביע הליגה': 'League Cup', 'אינטרטוטו': 'UEFA Intertoto Cup'}
HPT_COMPS.update({'גביע ה-20': '20th Anniversary Cup', 'גביע הכ"ה': '25th Anniversary Cup', 'גביע אופ"א': 'UEFA Cup', 'גביע המחזיקות': 'UEFA Cup Winners Cup', 'משחקי מבחן': 'Play-offs', 'גביע ליליאן': 'Lilian Cup'})
# Explicit review of annotations referring to an earlier/other fixture. These
# source IDs are completed games, not the abandoned matches they mention.
HPT_PLAYED_ANNOTATIONS = {1686, 2386, 2302, 3014, 1620, 1621, 699, 856, 1598, 1599, 964, 1747, 1388, 1672, 2262}
HPT_ARCHIVE_ONLY = {
    1727: 'abandoned fixture', 2854: 'abandoned fixture with an administrative ruling',
    2967: 'administratively awarded fixture', 2371: 'administratively awarded fixture',
    3010: 'administratively awarded fixture', 2298: 'administratively awarded fixture',
    2307: 'administratively awarded fixture', 2312: 'administratively awarded fixture',
    2310: 'administratively awarded fixture', 2313: 'administratively awarded fixture',
    1776: 'administratively awarded fixture', 2341: 'administratively awarded fixture',
    1387: 'abandoned fixture', 445: 'administratively awarded fixture',
    1452: 'administratively awarded fixture', 3022: 'administratively awarded fixture',
    2345: 'abandoned fixture', 2346: 'administratively awarded fixture',
    577: 'administratively awarded fixture', 2279: 'administratively awarded fixture',
    2738: 'fixture with disputed competition status', 1536: 'abandoned fixture',
    2774: 'abandoned fixture', 2249: 'fixture with an incomplete result record',
}


def fact(id, value, source, status='approved', notes=''):
    return {'id': id, 'value': value, 'sources': [source], 'confidence': 2, 'status': status,
            'researchedAt': DAY, 'approvedAt': DAY if status == 'approved' else None,
            'approvedBy': BY if status == 'approved' else None, 'notes': notes}


def source(id, url, title, publisher):
    return {'id': id, 'url': url, 'title': title, 'publisher': publisher, 'access': 'available', 'checkedAt': DAY}


def real_date(y, m, d):
    try:
        return datetime.date(y, m, d).isoformat()
    except (ValueError, TypeError):
        return None


def hpt_rows(doc, names):
    accepted, held = [], []
    sid = f'history-hpt-{doc["seasonId"]}'
    for row in doc['games']:
        why = []
        on = real_date(row.get('year'), row.get('month'), row.get('day'))
        if not on or on > DAY:
            why.append('missing, invalid or future day')
        opp = names.get(row.get('opponent', ''))
        if not opp:
            why.append('unreviewed English opponent name')
        comp = HPT_COMPS.get(row.get('competition'))
        if not comp:
            why.append('unreviewed competition')
        if row.get('locationType') not in (1, 2, 3):
            why.append('home/away not documented')
        scores = [row.get('hapoelGoals'), row.get('opponentGoals')]
        if not all(type(x) is int and x >= 0 for x in scores):
            why.append('result not documented')
        remark = row.get('remark') or ''
        if row['id'] == 2249:
            why.append('source annotation identifies the score as half-time only')
        # Conservative: even a reference to an earlier abandoned game is held for
        # explicit review instead of assuming which result is official.
        if re.search('טכני|פוצץ|הופסק|בוטל|בוטלה|לא הופיעה|לא נערך|לא התקיים|משחק חוזר', remark) and row['id'] not in HPT_PLAYED_ANNOTATIONS:
            why.append('administrative, abandoned, cancelled or replay annotation')
        if why:
            held.append({'source': doc['sourceUrl'], 'sourceId': row['id'], 'reasons': why, 'record': row})
            continue
        us_home = row['locationType'] == 1
        us, them = scores
        home, away = ('Hapoel Petah Tikva', opp) if us_home else (opp, 'Hapoel Petah Tikva')
        hg, ag = (us, them) if us_home else (them, us)
        value = {'name': f'{home} {hg}-{ag} {away}', 'on': on, 'sport': 'football', 'competition': comp,
                 'season': doc['seasonLabel'], 'home': home, 'away': away, 'homeGoals': hg, 'awayGoals': ag,
                 'us': 'home' if us_home else 'away', 'score': f'{hg}-{ag}', 'round': row['round'],
                 'venue': None, 'sourceVenue': row.get('stadium') or None, 'sourceOpponent': row['opponent'],
                 'sourceMatchId': row['id'], 'sourceSeasonId': doc['seasonId'], 'sourceRemark': remark or None,
                 'penalties': {'us': row.get('hapoelPenaltyGoals'), 'them': row.get('opponentPenaltyGoals')},
                 'lineup': [], 'bench': [], 'scorers': [], 'resultStatus': 'finished'}
        if row['locationType'] == 3:
            # Neutral ground is documented; no home side is invented. The name
            # prints the club first, and typed scores retain that perspective.
            for k in ['home', 'away', 'homeGoals', 'awayGoals', 'us']:
                value.pop(k)
            value.update({'name': f'Hapoel Petah Tikva {us}-{them} {opp}', 'score': f'{us}-{them}',
                          'neutral': True, 'opponent': opp, 'clubGoals': us, 'opponentGoals': them})
        accepted.append(fact(f'history-hpt-{row["id"]}', value, sid,
                             notes='Museum season record. Shootout score is separate from the match result; original season label retained.'))
    return accepted, held


def rsssf_rows(doc):
    """Read exact date headings and result lines, stopping before lower divisions.

    A range such as [Aug 3,4] invalidates the date; the next row must not inherit
    the previous heading. Likewise every round resets the date unless explicit.
    """
    accepted, held = [], []
    end = doc['seasonEnd']
    sid = f'history-rsssf-bih-{end}'
    section, on, rnd = 'league', None, None
    in_results = False
    lines = doc['text'].splitlines()
    for i, line in enumerate(lines):
        s = line.strip()
        if re.match(r'^(?:Prva Liga|Druga Liga|First League|Second League)\b', s, re.I) and in_results:
            break
        # RSSSF's contents at the top says 'Kup' too; only switch after results.
        if re.match(r'^(?:Cup(?: Tournaments| 20)|BOSNIA.HERCEGOVINA CUP)', s, re.I) or (in_results and re.match(r'^Kup(?: Bosne| BiH| 20|$)', s, re.I)):
            section, on = 'cup', None
        if re.match(r'^1/\d+ Finals', s, re.I):
            section, on = 'cup', None
        if re.match(r'^(?:Round\b|First Legs?\b|Second Legs?\b|Quarterfinal|Semifinal|Final\b|1/\d+ Finals)', s, re.I):
            if s.startswith('Final Table'):
                on = None
                continue
            in_results = True
            on = None
            rnd = s.split('[')[0].strip()
        # An explicit bracket containing a month is a date context (including
        # unreadable ranges): never let the last valid day leak through it.
        heading = re.search(r'\[((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[^\]]*)\]', s)
        if heading:
            on = None
            dm = re.fullmatch(r'([A-Z][a-z]{2})\s+(\d{1,2})(?:,?\s+(\d{4}))?', heading[1])
            if dm:
                month = MONTHS[dm[1]]
                year = int(dm[3]) if dm[3] else end - 1 if month >= 7 else end
                on = real_date(year, month, int(dm[2]))
        if not in_results or 'Zrinjski' not in s:
            continue
        if re.match(r'^\d+\.', s):
            continue  # league-table aggregates are not match results
        # A result is a score bounded by spaced team columns, never a table's
        # aggregate goals (e.g. 74-17), scorer line or two-leg aggregate.
        m = re.match(r'^(.+?)\s+(\d{1,2})\s*[-:]\s*(\d{1,2})\s+(.+?)\s*$', line.strip())
        if not m:
            if re.search(r'\bZrinjski\b.*(?:awd|abd|can|ppd|w/o)', s, re.I) or re.search(r'(?:awd|abd|can|ppd|w/o).*\bZrinjski\b', s, re.I):
                held.append({'source': doc['sourceUrl'], 'line': i + 1, 'record': s, 'reasons': ['non-played or non-final result']})
            continue
        a, ga, gb, b = m[1].strip(), int(m[2]), int(m[3]), m[4].strip()
        annotation = re.search(r'\s{2,}|\s+\[', b)
        if annotation:
            b = b[:annotation.start()].strip()
        following = lines[i + 1].strip() if i + 1 < len(lines) else ''
        following = following if following.startswith('[') and not re.match(r'\[(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)', following) else ''
        why = []
        if not on or on > DAY:
            why.append('no unambiguous exact day')
        if re.search(r'\d\s*-\s*\d', b):
            why.append('combined two-leg row; individual dates not resolved')
        if '\ufffd' in a + b:
            why.append('unreadable source encoding')
        if re.search(r'\b(?:awd|abd|abandoned|awarded|cancelled|replay|w/o|annulled)\b', s + ' ' + following, re.I):
            why.append('administrative or non-final annotation')
        if bool(re.search('Zrinjski', a)) == bool(re.search('Zrinjski', b)):
            why.append('club side unclear')
        if why:
            held.append({'source': doc['sourceUrl'], 'line': i + 1, 'record': s, 'reasons': why})
            continue
        home = 'Zrinjski Mostar' if 'Zrinjski' in a else a
        away = 'Zrinjski Mostar' if 'Zrinjski' in b else b
        home = re.sub(r',\s*\d+\)', ')', home)
        away = re.sub(r',\s*\d+\)', ')', away)
        stable = hashlib.sha256(f'{end}|{section}|{on}|{a}|{b}'.encode()).hexdigest()[:16]
        value = {'name': f'{home} {ga}-{gb} {away}', 'on': on, 'sport': 'football',
                 'competition': 'Bosnia and Herzegovina Cup' if section == 'cup' else 'Bosnia and Herzegovina League',
                 'season': f'{end - 1}/{str(end)[-2:]}', 'home': home, 'away': away,
                 'homeGoals': ga, 'awayGoals': gb, 'us': 'home' if 'Zrinjski' in a else 'away',
                 'score': f'{ga}-{gb}', 'round': rnd, 'venue': None, 'lineup': [], 'bench': [], 'scorers': [],
                 'sourceLine': i + 1, 'sourceResult': s, 'resultStatus': 'finished',
                 'resultPeriod': 'after-extra-time' if re.search(r'\baet\b', s, re.I) else None}
        pens = re.search(r'\[(\d+)-(\d+) pen', s)
        if pens:
            value['penalties'] = {'home': int(pens[1]), 'away': int(pens[2])}
        accepted.append(fact(f'history-rsssf-{stable}', value, sid,
                             notes='RSSSF season results, exact date heading and result row. No lineup or scorer inferred.'))
    return accepted, held


def build():
    names = json.loads((ROOT / 'content/manual/names-en/clubs-he.json').read_text())['names']
    # These are spelling equivalents, not new club identities.
    names.update({k.replace('תקווה', 'תקוה'): v for k, v in list(names.items())})
    report = {'checkedAt': DAY, 'approval': BY, 'completeArchiveClaim': False, 'clubs': {}}
    for club, glob, parse, publisher in [
        ('hapoel-petah-tikva', 'hpt-*.json', lambda d: hpt_rows(d, names), 'Hapoel Petah Tikva Museum'),
        ('zrinjski-mostar', 'rsssf-*.json', rsssf_rows, 'RSSSF')]:
        wave = {'schemaVersion': 1, 'clubId': club, 'contentLocale': 'en', 'sources': [], 'matches': [], 'archive': []}
        held, seen = [], set()
        for p in sorted(EVIDENCE.glob(glob)):
            doc = json.loads(p.read_text())
            good, pending = parse(doc)
            sid = f'history-hpt-{doc["seasonId"]}' if club.startswith('hapoel') else f'history-rsssf-bih-{doc["seasonEnd"]}'
            if club.startswith('hapoel'):
                for h in pending:
                    row = h['record']
                    kind = HPT_ARCHIVE_ONLY.get(row['id'])
                    on = real_date(row.get('year'), row.get('month'), row.get('day'))
                    if kind and on and row['opponent'] in names:
                        # The exact date identifies the fixture, never the date
                        # on which a tribunal made its later decision.
                        value = {'name': f'Hapoel Petah Tikva v {names[row["opponent"]]} — {kind}',
                                 'on': on, 'precision': 'day', 'sport': 'football', 'sensitive': False,
                                 'hint': f'{HPT_COMPS[row["competition"]]} · {doc["seasonLabel"]}. Fixture date from the museum. The score row is not used as a played final result.'}
                        wave['archive'].append(fact(f'history-hpt-{row["id"]}-context', value, sid,
                                                   notes='Reviewed source annotation. Archive context only; excluded from match-score, scorer and lineup generators.'))
                        h['disposition'] = 'approved contextual archive record; excluded from final-result matches'
            held.extend(pending)
            label = doc.get('seasonLabel') or f'{doc["seasonEnd"] - 1}/{str(doc["seasonEnd"])[-2:]}'
            if good or any(sid in f['sources'] for f in wave['archive']):
                wave['sources'].append(source(sid, doc['sourceUrl'], f'{publisher} — {label}', publisher))
            for f in good:
                if f['id'] in seen:
                    raise ValueError(f'duplicate result {f["id"]}')
                seen.add(f['id'])
                wave['matches'].append(f)
        wave['matches'].sort(key=lambda f: (f['value']['on'], f['id']))
        # Archive moments are made by the runtime merge only after collision checks,
        # so a conflicting score cannot sneak into timeline/date questions.
        out = ROOT / 'club-packs' / club / 'wave-history-2026-10-18.json'
        out.write_text(json.dumps(wave, ensure_ascii=False, separators=(',', ':')) + '\n')
        report['clubs'][club] = {'sourceDocuments': len(wave['sources']), 'approvedCandidates': len(wave['matches']),
                                'archiveOnly': len(wave['archive']),
                                'byCompetition': dict(collections.Counter(f['value']['competition'] for f in wave['matches'])),
                                'held': held}
    (EVIDENCE / 'validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=1) + '\n')
    print(json.dumps({k: {a: b for a, b in v.items() if a != 'held'} | {'held': len(v['held'])} for k, v in report['clubs'].items()}, indent=1))


if __name__ == '__main__':
    build()
