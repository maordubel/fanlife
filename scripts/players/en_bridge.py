# -*- coding: utf-8 -*-
"""
58 הערכים באנגלית שאין להם ערך עברי — מול 152 השמות שנשארו בארכיון.

זה המעבר האחרון, והוא חוזר לגשר הלועזי-עברי של `match.py` כי אין ברירה: לשחקנים
האלה אין ערך בוויקיפדיה העברית, ולכן אין מהיכן לקחת את השם בעברית. ההגנה היא
אותה הגנה — שלד עיצורים, והתאמה נכנסת רק אם היא **יחידה בשני הכיוונים** מתוך
כל 152 מול כל 58.

מה שנשאר בלי התאמה נשאר בלי התאמה, ונרשם.
"""
import json, re, sys
sys.path.insert(0, 'scripts/players')
from match import latin_skeleton, hebrew_skeleton, skeletons_align

PAREN = re.compile(r'\s*\([^)]*\)\s*')

# 21 זוגות שנקראו אחד-אחד מול משפט הפתיחה של הערך האנגלי, כי שלד העיצורים לא
# חצה את המרחק ביניהם. ליד כל אחד — הראיה שהכריעה. מה שאין לו ראיה אינו כאן.
BY_HAND = {
    'אומיט גונזלס':        'Umut Güzelses',                            # הערך עצמו כותב Omit Gonzales — כך כתבה ONE
    'אורי כהן':            'Uri Cohen',                                # מגן ישראלי, 2014–15
    'ארתור אטצזיאנוב':     'Arthur Atzianov',                          # Atzianov ⇄ אטצזיאנוב
    'אברהם צ\'קול':        'Avraham Chekol',                           # Chekol ⇄ צ'קול
    'בן אלגרבלי':          'Ben Grabli',                               # Grabli ⇄ (אל)גרבלי
    'נועם בונה':           'Noam Bonnet',                              # Bonnet ⇄ בונה
    'יניב בן ניסן':        'Yaniv Ben-Nissan',                         # מקף מול רווח
    'דנילו לופז':          'Danilo (footballer, born April 1991)',     # Danilo Lopes Cezario
    'וולינגטון דה אוליברה': 'Wellington (footballer, born September 1981)',  # Wellington Katzor de Oliveira
    'אוגנין לאקיץ\'':      'Ognjen Lakić',                             # Lakić; ל-Lekić אין שורה בארכיון
    'דוד רוצ\'לה':         'David Rochela',                            # David Rochela Calvo
    'דנוץ מויססקו':        'Dănuț Moisescu',                           # Dănuț ⇄ דנוץ
    'קונסטנטין מרקו':      'Ioan Marcu',                               # Ioan **Constantin** Marcu
    'אנריקה ג\'וקו':       'Henrique Jocú',                            # Jocú ⇄ ג'וקו
    'סבסטיאן הרננדז':      'Sabastian Hernandez',                      # Sebastian Isai Hernandez Lanus
    'מיגל אנחלס הויוס':    'Miguel Ángel Hoyos',                       # Ángel ⇄ אנחלס
    'הרוויה איליץ\'':      'Hrvoje Ilić',                              # Hrvoje ⇄ הרוויה
    'מריוס ניביידומסקי':   'Mariusz Niewiadomski',                     # Niewiadomski ⇄ ניביידומסקי
    'גבריאל דוס סנטוס':    'Gabriel Santos (footballer, born 1983)',   # Santos ⇄ דוס סנטוס
    'פליקס אובוקה':        'Felix Ogbuke',                             # Felix Onyedika Ogbuke
}

# מה שסורב, ולמה. שתי שורות, ושתיהן היו נכנסות אילו ויתרתי על הדרישה לראיה.
REFUSED_BY_HAND = {
    "אבדג'י": "Abedi הוא Robson Vicente Gonçalves, ברזילאי, 2007–08. "
              "'אבדג'י' אינו תעתיק שלו ואין מקור שקושר ביניהם — לא ניחשנו.",
    'עומר פרץ (קשר)': "Omer Peretz (born 1990) הוא חלוץ, והארכיון מבדיל בין "
                      "'עומר פרץ (קשר)' ל'עומר פרץ (חלוץ)'. העמדה סותרת את ההבחנה.",
}

def main():
    raw = json.load(open('content/manual/player-facts-wiki.json', encoding='utf-8'))
    roster = [r['fullNameHe'] for r in
              json.load(open('content/manual/players-roster.json', encoding='utf-8'))['records']]
    taken = {r['personNameHe'] for r in raw['wikiHe']['matched']}
    taken |= {r['personNameHe'] for r in
              json.load(open('content/manual/player-facts-seasons.json',
                             encoding='utf-8'))['records']}
    taken |= {r['personName'] for r in
              json.load(open('content/manual/squads.json', encoding='utf-8'))['records']
              if r.get('position')}
    rest = [n for n in roster if n not in taken]
    en = [{'title': r['enTitle'], 'name': PAREN.sub(' ', r['enTitle']).strip(),
           'position': r['position'], 'origin': r['origin'],
           'fromYear': r['fromYear'], 'toYear': r['toYear'], 'spells': r['spells'],
           'positionRaw': r['positionRaw'], 'originEvidence': r['originEvidence']}
          for r in raw['wikiEn']['table']]

    by_title = {w['title']: w for w in en}
    pairs = []
    for he in rest:
        if he in REFUSED_BY_HAND:
            continue
        if he in BY_HAND:
            pairs.append((he, [by_title[BY_HAND[he]]]))
            continue
        he_bare = PAREN.sub(' ', he).strip()
        hits = [w for w in en if skeletons_align(he_bare, w['name'])]
        pairs.append((he, hits))

    # one claim per Latin name, one per Hebrew name
    claimed_latin = {}
    for he, hits in pairs:
        if len(hits) == 1:
            claimed_latin.setdefault(hits[0]['title'], []).append(he)

    rows, refused = [], {}
    for he, hits in pairs:
        if len(hits) != 1:
            if hits:
                refused[he] = [h['title'] for h in hits]
            continue
        w = hits[0]
        if len(claimed_latin[w['title']]) != 1:
            refused[he] = [w['title'] + ' (נתבע גם על ידי ' + ', '.join(
                n for n in claimed_latin[w['title']] if n != he) + ')']
            continue
        rows.append({'personNameHe': he, 'enTitle': w['title'],
                     'matchedBy': 'en-by-hand' if he in BY_HAND else 'en-transliteration',
                     'position': w['position'], 'origin': w['origin'],
                     'fromYear': w['fromYear'], 'toYear': w['toYear'],
                     'spells': w['spells'], 'positionFrom': 'en-infobox',
                     'positionRaw': w['positionRaw'], 'originEvidence': w['originEvidence']})

    json.dump({'rows': rows, 'refused': refused,
               'enUnmatched': sorted({w['title'] for w in en} - {r['enTitle'] for r in rows})},
              open('/tmp/claude-0/wiki/en-matched.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    for he, why in REFUSED_BY_HAND.items():
        refused[he] = [why]
    print(json.dumps({'matched': len(rows), 'refused': len(refused),
                      'enUnmatched': sorted({w['title'] for w in en} - {r['enTitle'] for r in rows})},
                     ensure_ascii=False, indent=1))
    for r in rows:
        print(f"  {r['personNameHe']:28s} ← {r['enTitle']:48s} {r['position']} {r['origin']} {r['fromYear']}-{r['toYear']}")

if __name__ == '__main__':
    main()
