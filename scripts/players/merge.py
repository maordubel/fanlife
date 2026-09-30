# -*- coding: utf-8 -*-
"""
מיזוג חמשת המקורות לשורה אחת לכל שחקן — `content/manual/player-facts.json`.

המקורות, מהחזק לחלש, וכל שורה אומרת מאיזה מהם היא באה:

  squad     · `squads.json` — הגיליון שלנו, עמדה ולאום לכל שחקן בסגל הנוכחי.
  vikipoel  · **ויקיפועל** — האנציקלופדיה של המועדון, 638 שחקנים. מאור הצביע עליה
              ("יש לך ויקיפועל כמקור מידע מושלם"), והוא צדק: זה המקור שרשימת השמות
              שלנו נולדה ממנו, ולכן 637 מתוך 638 מתאימים בשם מדויק. היא החזקה
              ביותר לשתי שאלות: **"זר או ישראלי"**, כי הקטגוריה "שחקנים זרים
              (כדורגל)" היא ההגדרה של המועדון עצמו למי שתפס מקום של זר ולא ניחוש
              מאזרחות; ו**השנים**, כי כל ערך נושא קטגוריית "סגל" לכל עונה שהוא היה
              בה — 627 מתוך 638 שחקנים, עונה-עונה.
  wiki-he   · ויקיפדיה העברית, תיבת "אישיות כדורגל": העמדה היא עמדת הקריירה של
              האיש בערך שלו, והשנים הן השנים שבהן הוא רשום במועדון — לא העונות
              שבמקרה יש לנו עליהן מספר חולצה.
  wiki-en   · ויקיפדיה האנגלית, לשחקנים שאין להם ערך עברי (רובם זרים).
  wf-all    · טבלת כל-הזמנים של worldfootball: עמדה ולאום ל-552 שחקנים.
  wf-season · 73 עמודי עונה של worldfootball — המקור של הסבב הקודם. הוא החלש
              מבין הארבעה לעמדה (עמדה בסגל של עונה אחת), והחזק ביותר לשאלה
              **באילו עונות בדיוק** הוא היה בסגל.

**ועמדה היא רשימה, מ-17.9.2026.** `תפקיד` בוויקיפועל נושא כל תפקיד שהאיש מילא
(`מגן שמאלי, חלוץ, מאמן` — שייע פייגנבוים), ומשפט הפתיחה של הדף אומר מה הוא שיחק
**בהפועל**. `scripts/ingest/players-cli.ts` קורא את שניהם מהוויקיטקסט הגולמי וכותב
`positions`, `positionFrom` (`vikipoel` או `vikipoel-body`) ו-`positionSays`; כאן הם
נקראים כמות שהם. `vikipoel-body` הוא מקור שביעי בסולם והוא **החזק ביותר לעמדה**,
כי הוא הטענה היחידה שמדברת על העמדה במועדון הזה ולא על הקריירה.

שלוש החלטות שראוי לדעת עליהן:

1. **שנים מתאחדות, לא מכריעות.** "היה בסגל 2013/14" ו"רשום במועדון 2013–2020"
   שניהם נכונים, ולכן הטווח הוא האיחוד. אבל כששני מקורות אומרים טווחים שאינם
   נחתכים ורחוקים ביותר מחמש שנים — זה כבר לא שני ניסוחים של אותה עובדה אלא
   **שני אנשים**, והשורה נכנסת ל-`conflicts` במקום להתמזג.

2. **"יעקב כהן" תוקן.** בסבב הקודם הוא קיבל את Yuval Cohen, ומשם עמדה ושנים
   2022–2025. ויקיפדיה העברית אומרת שיעקב כהן נולד ב-1956, מגן שמאלי, ושיחק
   בהפועל 1985–86. זה לא אותו אדם. השורה הלועזית שוחררה, ו"יובל כהן" קיבל אותה.

3. **"דוד קופרמן" אינו סתירה.** worldfootball כותב קולומביה, ויקיפדיה כותבת
   ישראלי. הערך עצמו אומר "ישראלי–קולומביאני". לשאלה "זר או ישראלי" בסגל
   התשובה היא ישראלי, ושתי האזרחויות נרשמות ב-`conflicts`.
"""
import json, re, sys
from collections import defaultdict

sys.path.insert(0, 'scripts/players')
from wf_hand import BY_HAND as WF_HAND, REFUSED as WF_REFUSED

CONFIDENCE = 2
PAREN = re.compile(r'\s*\([^)]*\)\s*')

# שורות שהסבב הקודם ייצר והצלבה מול ויקיפדיה הראתה שהן על אדם אחר.
DROP_FROM_SEASONS = {'יעקב כהן'}
# והלועזי ששוחרר, עם מי שבאמת מגיע לו.
REASSIGN = {'יובל כהן': 'Yuval Cohen'}

# ערכי ויקיפדיה שאינם בקטגוריית המועדון ולכן לא נסרקו עם השאר, אבל הערך עצמו
# אומר עמדה ומוצא. הם נכנסים עם `wiki-he` ובלי שנים — הערך אינו רושם את הפועל
# תל אביב ברשימת המועדונים שלו, וזו סתירה מול הארכיון שנרשמת ולא מוכרעת.
WIKI_HE_OUTSIDE_CATEGORY = {
    'לירון דיאמנט': {'position': 'FW', 'origin': 'israeli',
                     'wikiTitle': 'לירון דיאמנט',
                     'note': 'הערך מפרט שבע קבוצות ואין בהן הפועל תל אביב; '
                             'הארכיון אומר שכן. העמדה והמוצא נלקחים, השנים לא.'},
}


def load(path):
    return json.load(open(path, encoding='utf-8'))


def span_union(a, b):
    lo = min([x for x in (a[0], b[0]) if x is not None], default=None)
    hi = max([x for x in (a[1], b[1]) if x is not None], default=None)
    return (lo, hi)


def disjoint_far(a, b, gap=5):
    if None in a or None in b:
        return False
    if a[0] <= b[1] and b[0] <= a[1]:
        return False                      # they overlap
    return min(abs(a[0] - b[1]), abs(b[0] - a[1])) > gap


def main():
    roster = load('content/manual/players-roster.json')['records']
    names = [r['fullNameHe'] for r in roster]
    qualifier = {r['fullNameHe']: (PAREN.search(r['fullNameHe']).group(0).strip(' ()')
                                   if PAREN.search(r['fullNameHe']) else None)
                 for r in roster}

    raw = load('content/manual/player-facts-wiki.json')
    he = {r['personNameHe']: r for r in raw['wikiHe']['matched']}
    en = {r['personNameHe']: r for r in raw['wikiEn']['matched']}
    wfa = {r['personNameHe']: r for r in raw['wfAllPlayers']['matched']}
    vraw = load('content/manual/player-facts-vikipoel.json')
    alias = vraw['confirmedSpelling']
    vikipoel = {alias.get(r['personNameHe'], r['personNameHe']): r for r in vraw['table']}

    seasons = {r['personNameHe']: r for r in
               load('content/manual/player-facts-seasons.json')['records']
               if r['personNameHe'] not in DROP_FROM_SEASONS}
    squads = {}
    for r in load('content/manual/squads.json')['records']:
        if (r.get('confidence') or 0) < CONFIDENCE:
            continue
        squads[r['personName']] = r

    wf_table = {}
    for t in raw['wfAllPlayers']['table']:
        wf_table.setdefault(t['personNameLatin'], []).append({
            'position': t['position'], 'nationality': t['nationalityEn'],
            'origin': 'israeli' if t['nationalityEn'] == 'Israel' else 'foreign'})

    def hand_row(he_name):
        key = WF_HAND.get(he_name)
        if not key:
            return None
        if '#' in key:
            latin, pos = key.split('#')
            cands = [c for c in wf_table.get(latin, []) if c['position'] == pos]
            return dict(cands[0], personNameLatin=latin) if len(cands) == 1 else None
        cands = wf_table.get(key, [])
        return dict(cands[0], personNameLatin=key) if len(cands) == 1 else None

    records, conflicts, unknown = [], [], []

    for name in names:
        sources, pos, pos_from, org, org_from = [], None, None, None, None
        spans = {}

        v = vikipoel.get(name)

        s = seasons.get(name)
        if s:
            sources.append('wf-season')
            if s.get('position'):
                pos, pos_from = s['position'], 'wf-season'
            if s.get('origin'):
                org, org_from = s['origin'], 'wf-season'
            if s.get('fromYear'):
                spans['wf-season'] = (s['fromYear'], s.get('toYear') or s['fromYear'])

        w = wfa.get(name) or hand_row(name)
        if w:
            sources.append('wf-all')
            if w.get('position'):
                pos, pos_from = w['position'], 'wf-all'
            if w.get('origin'):
                org, org_from = w['origin'], 'wf-all'

        e = en.get(name)
        if e:
            sources.append('wiki-en')
            if e.get('position'):
                pos, pos_from = e['position'], 'wiki-en'
            if e.get('origin'):
                org, org_from = e['origin'], 'wiki-en'
            if e.get('fromYear'):
                spans['wiki-en'] = (e['fromYear'], e.get('toYear') or e['fromYear'])

        outside = WIKI_HE_OUTSIDE_CATEGORY.get(name)
        if outside and not he.get(name):
            sources.append('wiki-he')
            pos, pos_from = outside['position'], 'wiki-he'
            org, org_from = outside['origin'], 'wiki-he'
            conflicts.append({'personNameHe': name, 'field': 'club',
                              'says': {'wiki-he': outside['note']}, 'took': 'archive'})

        h = he.get(name)
        if h:
            sources.append('wiki-he')
            if h.get('position'):
                pos, pos_from = h['position'], 'wiki-he'
            if h.get('origin'):
                org, org_from = h['origin'], 'wiki-he'
            if h.get('fromYear'):
                spans['wiki-he'] = (h['fromYear'], h.get('toYear') or h['fromYear'])

        q = qualifier.get(name)
        if q in ('שוער', 'בלם', 'מגן', 'קשר', 'חלוץ'):
            want = {'שוער': 'GK', 'בלם': 'DF', 'מגן': 'DF', 'קשר': 'MF', 'חלוץ': 'FW'}[q]
            if pos and pos != want:
                conflicts.append({'personNameHe': name, 'field': 'position',
                                  'archiveQualifier': q, 'sourceSays': pos, 'from': pos_from})
            pos, pos_from = want, 'archive-qualifier'
            sources.append('archive-qualifier')

        if v:
            sources.append('vikipoel')
            if v.get('position'):
                # `positionFrom` says which half of the page decided: the infobox field
                # (`vikipoel`) or the page's own lead sentence (`vikipoel-body`). Both
                # are ויקיפועל and they are not the same claim, so they are not the same
                # source key.
                pos, pos_from = v['position'], v.get('positionFrom') or 'vikipoel'
                if pos_from == 'vikipoel-body':
                    sources.append('vikipoel-body')
            if v.get('origin'):
                org, org_from = v['origin'], 'vikipoel'
            if v.get('fromYear'):
                spans['vikipoel'] = (v['fromYear'], v.get('toYear') or v['fromYear'])

        sq = squads.get(name)
        if sq:
            sources.append('squad')
            if sq.get('position') in ('GK', 'DF', 'MF', 'FW'):
                pos, pos_from = sq['position'], 'squad'
            if sq.get('nationalityHe'):
                org, org_from = ('israeli' if sq['nationalityHe'] == 'ישראל' else 'foreign'), 'squad'

        # --- disagreements worth printing, decided by the precedence above ---
        # הדף של ויקיפועל יכול להיות חלוק עם עצמו — התיבה אומרת קריירה, הפתיחה אומרת
        # מה הוא שיחק בהפועל. `positionSays` מחזיק את שני הצדדים, ושניהם נכנסים
        # לסתירות בשמם: סתירה נשמרת, לא מוכרעת (כלל 60 §3).
        says = (v or {}).get('positionSays') or {}
        poss = {k: val for k, val in (('wf-season', s and s.get('position')),
                                  ('wf-all', w and w.get('position')),
                                  ('wiki-en', e and e.get('position')),
                                  ('wiki-he', h and h.get('position')),
                                  ('vikipoel', says.get('vikipoel') or (v and v.get('position'))),
                                  ('vikipoel-body', says.get('vikipoel-body')),
                                  ('squad', sq and sq.get('position'))) if val}
        if len(set(poss.values())) > 1:
            conflicts.append({'personNameHe': name, 'field': 'position', 'says': poss, 'took': pos})
        orgs = {k: val for k, val in (('wf-season', s and s.get('origin')),
                                  ('wf-all', w and w.get('origin')),
                                  ('wiki-en', e and e.get('origin')),
                                  ('wiki-he', h and h.get('origin')),
                                  ('vikipoel', v and v.get('origin')),
                                  ('squad', sq and ('israeli' if sq.get('nationalityHe') == 'ישראל'
                                                    else 'foreign' if sq.get('nationalityHe') else None))) if val}
        if len(set(orgs.values())) > 1:
            conflicts.append({'personNameHe': name, 'field': 'origin', 'says': orgs, 'took': org})

        from_year = to_year = None
        if spans:
            keys = list(spans)
            bad = [(a, b) for i, a in enumerate(keys) for b in keys[i + 1:]
                   if disjoint_far(spans[a], spans[b])]
            if bad:
                pick = next((k for k in ('vikipoel', 'wiki-he') if k in spans), keys[0])
                conflicts.append({'personNameHe': name, 'field': 'years',
                                  'says': {k: list(val) for k, val in spans.items()},
                                  'took': pick})
                from_year, to_year = spans[pick]
            elif 'vikipoel' in spans:
                # ויקיפועל סופרת עונות, לא חוזים: קטגוריית "סגל" לכל עונה שהוא היה
                # בסגל. זה בדיוק מה שנשאל, ולכן היא נלקחת כמות שהיא ולא מורחבת.
                from_year, to_year = spans['vikipoel']
            else:
                acc = (None, None)
                for val in spans.values():
                    acc = span_union(acc, val)
                from_year, to_year = acc

        if not (pos or org or from_year):
            unknown.append(name)
            continue

        row = {'personNameHe': name, 'position': pos, 'positionFrom': pos_from,
               'origin': org, 'originFrom': org_from,
               'fromYear': from_year, 'toYear': to_year,
               'sources': sorted(set(sources)), 'sport': 'football', 'confidence': CONFIDENCE}
        # שחקן ששיחק ביותר מעמדה אחת נושא את כולן. `position` נשאר ערך התצוגה היחיד,
        # ו-`positions` הוא מה שלא נזרק: מגן שמאלי שהפך לחלוץ הוא שניהם.
        if v and len(v.get('positions') or []) > 1 and pos_from in ('vikipoel', 'vikipoel-body'):
            row['positions'] = v['positions']
        if s and s.get('personNameLatin'):
            row['personNameLatin'] = s['personNameLatin']
        elif w and w.get('personNameLatin'):
            row['personNameLatin'] = w['personNameLatin']
        elif e:
            row['personNameLatin'] = PAREN.sub(' ', e['enTitle']).strip()
        if s and s.get('seasons'):
            row['seasons'] = s['seasons']
        records.append(row)

    out = {
        'note': ('עמדה, מוצא ושנים לכל שחקן שאחד מחמשת המקורות מכסה. השדה sources אומר מי '
                 'ראה אותו, positionFrom ו-originFrom אומרים מי הכריע. מי שאינו כאן — אינו '
                 'באף מקור שהגענו אליו, ולא ניחשנו לו עמדה, מוצא או שנה.'),
        'sport': 'football',
        'confidence': CONFIDENCE,
        'generator': 'scripts/players/{match,wiki_match,en_bridge,wf_all,merge}.py',
        'sources': [
            {'key': 'wiki-he', 'title': 'ויקיפדיה העברית — קטגוריה:כדורגלני הפועל תל אביב',
             'url': 'https://he.wikipedia.org/wiki/%D7%A7%D7%98%D7%92%D7%95%D7%A8%D7%99%D7%94:%D7%9B%D7%93%D7%95%D7%A8%D7%92%D7%9C%D7%A0%D7%99_%D7%94%D7%A4%D7%95%D7%A2%D7%9C_%D7%AA%D7%9C_%D7%90%D7%91%D7%99%D7%91',
             'read': 433},
            {'key': 'wiki-en', 'title': 'English Wikipedia — Category:Hapoel Tel Aviv F.C. players',
             'url': 'https://en.wikipedia.org/wiki/Category:Hapoel_Tel_Aviv_F.C._players', 'read': 418},
            {'key': 'wf-all', 'title': 'worldfootball.net — כל השחקנים בהיסטוריה של המועדון',
             'url': 'https://www.worldfootball.net/teams/te956/hapoel-tel-aviv/all-players/', 'read': 552},
            {'key': 'wf-season', 'title': 'worldfootball.net — 73 סגלי עונה, 1933/34 → 2025/26',
             'url': 'https://www.worldfootball.net/teams/te956/hapoel-tel-aviv/squad/', 'read': 465},
            {'key': 'vikipoel', 'title': vraw['source']['title'],
             'url': vraw['source']['url'], 'read': vraw['source']['read']},
            {'key': 'vikipoel-body',
             'title': 'ויקיפועל — פסקת הפתיחה בדף השחקן (Special:Export), נקרא 17.9.2026',
             'url': 'https://wiki.red-fans.com/index.php?title=Special:Export',
             'read': sum(1 for r in vraw['table'] if r.get('positionFrom') == 'vikipoel-body')},
            {'key': 'squad', 'title': 'content/manual/squads.json — גיליון הסגל שלנו'},
        ],
        'records': sorted(records, key=lambda r: r['personNameHe']),
        'conflicts': conflicts,
        'unknown': sorted(unknown),
        # סירובים: לא "אין לנו כלום על האיש", אלא "המקור הזה לא נקשר אליו".
        # שורה שלו עדיין יכולה להתקיים ממקור אחר — או מהארכיון עצמו, כשהוא מבדיל
        # בין שני אנשים בשם זהה על ידי ציון העמדה.
        'refusedMatches': [{'personNameHe': k, 'source': 'wf-all', 'reason': v}
                           for k, v in WF_REFUSED.items()],
    }
    json.dump(out, open('content/manual/player-facts.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)

    have = lambda f: sum(1 for r in records if r[f])
    print(json.dumps({
        'roster': len(names), 'records': len(records), 'unknown': len(unknown),
        'position': have('position'), 'origin': have('origin'),
        'years': sum(1 for r in records if r['fromYear']),
        'allThree': sum(1 for r in records if r['position'] and r['origin'] and r['fromYear']),
        'conflicts': len(conflicts),
        'positionFrom': dict(sorted(
            ((k, sum(1 for r in records if r['positionFrom'] == k)) for k in
             {r['positionFrom'] for r in records if r['positionFrom']}), key=lambda x: -x[1])),
    }, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
