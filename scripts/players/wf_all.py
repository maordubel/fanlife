# -*- coding: utf-8 -*-
"""
552 השחקנים בטבלת כל-הזמנים של worldfootball מול 637 השמות בארכיון.

זה אותו גשר לועזי-עברי של `match.py`, אבל על מקור טוב יותר: לא 73 עמודי עונה
שצריך לאחות, אלא טבלה אחת של כל מי ששיחק אי-פעם — עמדה ולאום לכל שורה.

ההתאמה היא **צימוד יחיד דו-כיווני**: שם עברי נכנס רק אם הוא מתיישר עם בדיוק
שם לועזי אחד מתוך 552, ואותו שם לועזי מתיישר עם בדיוק שם עברי אחד מתוך 637.
שני "בדיוק אחד" — כי צד אחד לבדו הוא בדיוק מה שנתן ל"יעקב כהן" לקחת את
Yuval Cohen בסבב הקודם.
"""
import json, sys
sys.path.insert(0, 'scripts/players')
from match import skeletons_align
import re

PAREN = re.compile(r'\s*\([^)]*\)\s*')
POS = {'GK', 'DF', 'MF', 'FW'}


def main():
    roster = [r['fullNameHe'] for r in
              json.load(open('content/manual/players-roster.json', encoding='utf-8'))['records']]
    wf = [{'name': t['personNameLatin'],
           'position': t['position'] if t['position'] in POS else None,
           'nationality': t['nationalityEn'],
           'origin': 'israeli' if t['nationalityEn'] == 'Israel' else 'foreign'}
          for t in json.load(open('content/manual/player-facts-wiki.json',
                                  encoding='utf-8'))['wfAllPlayers']['table']]

    # a Latin name that appears twice in the table is two different men — it can
    # never be claimed, because we cannot tell which of them the archive means.
    seen = {}
    for w in wf:
        seen.setdefault(w['name'], []).append(w)
    dup = {k for k, v in seen.items() if len(v) > 1}

    he_to_la, la_to_he = {}, {}
    for he in roster:
        bare = PAREN.sub(' ', he).strip()
        for w in wf:
            if w['name'] in dup:
                continue
            if skeletons_align(bare, w['name']):
                he_to_la.setdefault(he, set()).add(w['name'])
                la_to_he.setdefault(w['name'], set()).add(he)

    rows, refused = [], {}
    for he, la in he_to_la.items():
        if len(la) != 1:
            refused[he] = sorted(la)
            continue
        name = next(iter(la))
        if len(la_to_he[name]) != 1:
            refused[he] = [name + ' (נתבע גם על ידי ' +
                           ', '.join(sorted(la_to_he[name] - {he})) + ')']
            continue
        w = seen[name][0]
        rows.append({'personNameHe': he, 'personNameLatin': name, 'matchedBy': 'wf-all-players',
                     'position': w['position'], 'origin': w['origin'],
                     'nationalityEn': w['nationality']})

    json.dump({'rows': rows, 'refused': refused, 'duplicateLatin': sorted(dup)},
              open('/tmp/claude-0/wiki/wfall-matched.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print(json.dumps({'roster': len(roster), 'source': len(wf), 'duplicateLatin': sorted(dup),
                      'matched': len(rows), 'refused': len(refused)}, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
