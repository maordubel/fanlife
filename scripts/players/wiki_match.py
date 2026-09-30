# -*- coding: utf-8 -*-
"""
גשר עברי-עברי: 433 ערכי ויקיפדיה עברית מול 637 השמות בארכיון.

ההבדל בין זה לבין `match.py` הוא ההבדל בין שתי אלפביתות לאחת. `match.py` נאלץ
לגשר לועזית מול עברית, ולכן כל מנגנון הזהירות שלו נועד לשאלה "האם זה בכלל אותו
אדם". כאן שני הצדדים עבריים, והשאלה צנועה בהרבה: איזה איות. הארכיון כותב
"אפואלה אדל", ויקיפדיה כותבת "אפולה אדל". אותו שוער.

חמישה מעברים, מהצר לרחב. **כל אחד מהם חייב להיות יחיד בשני הכיוונים** — שם
בארכיון נתבע פעם אחת, וערך בוויקיפדיה נתבע פעם אחת:

  variant     — שוויון אחרי ניקוי סימנים, כשגם כינוי בסוגריים נחשב וריאנט
                ("אברהם (אבי) בנימין" מייצר גם "אבי בנימין").
  qualifier   — לארכיון יש שני אנשים באותו שם, והוא מבדיל ביניהם בעמדה
                ("עומר פרץ (חלוץ)" מול "עומר פרץ (קשר)"). ויקיפדיה אומרת
                לאיזה מהם היא מתכוונת — העמדה שלה מכריעה. זה לא ניחוש: שני
                מקורות מסכימים.
  matres      — אחרי השמטת אימות קריאה פנימיות (א ה ו י ע). "עומרי"/"עמרי",
                "אמידו באלדה"/"אמידו בלדה". כתיב מלא מול כתיב חסר.
  skeleton    — בנוסף, קיפול עיצורים שנשמעים זהה בעברית: ב/ו/וו · כ/ח · ק/כ ·
                ט/ת · ס/ש/צ. "מיכאי"/"מיחאי", "שיקו"/"צ'יקו", "בן שאנן"/"בן סנן".
  surname+1   — שם משפחה מקופל זהה ויחיד בשני הצדדים, והשם הפרטי רחוק מרחק
                עריכה אחד לכל היותר. "בוהדן סרנבסקי" מול "בוגדן סרנבסקי".

מה שאינו יחיד — לא נכנס, ונרשם ב-`ambiguous` עם המועמדים. מה שלא נמצא בכלל —
נרשם ב-`wikiUnmatched`, כי ערך ויקיפדיה בקטגוריה "כדורגלני הפועל תל אביב" שאין
לו שורה בארכיון הוא חור בארכיון, לא כישלון של ההתאמה.
"""
import json, re, unicodedata
from collections import defaultdict

FINALS = str.maketrans('םןץףך', 'מנצפכ')
NIQQUD = re.compile(r'[֑-ׇ]')
PAREN  = re.compile(r'\(([^)]*)\)')
JUNK   = re.compile(r"[`׳״.,]")
QUOTED = re.compile(r'"[^"]*"')
SILENT = set('אהועי')
# Hebrew letters that carry the same sound in modern speech and therefore the
# same risk of two spellings for one man.
FOLD = str.maketrans({'ב':'ו', 'כ':'ק', 'ח':'ק', 'ת':'ט', 'ש':'ס', 'צ':'ס', 'ז':'ס'})

# כינויים עבריים — עובדה לשונית, לא ניחוש. כל אחד מהם מופיע בארכיון בצד אחד
# ובוויקיפדיה בצד השני, ושניהם מדברים על אותו אדם. הרשימה קצרה בכוונה: היא
# נפתחת רק כששם המשפחה המקופל זהה ויחיד בשני הצדדים.
NICKNAME = {
    'קובי': 'יעקב', 'מיקי': 'מאיר', 'איצה': 'יצחק', 'אבי': 'אברהם',
    'דודו': 'דוד', 'מוטי': 'מרדכי', 'שייע': 'ישעיהו', 'בני': 'בנימין',
    'רפי': 'רפאל', 'צחי': 'יצחק', 'חיימק': 'חיים', 'שוקי': 'יהושע',
}
# שלושה זוגות שנבדקו אחד-אחד: אותו אדם, שני איותים, ואף אחד מהמעברים למעלה
# לא חוצה את המרחק ביניהם. הם כתובים כאן בשמם כדי שאפשר יהיה לחלוק עליהם.
CONFIRMED = {
    'אדבינאס גירדבאיניס': 'אדווינס גירדוואיניס',   # Edvinas Girdvainis, מגן ליטאי, 2018
    'אולריש מלקה':        'אולריך מלקה',           # Ulrich Meleke, מגן חוף-שנהבי, 2018
    'ניסים אביטן':        'ניסו אביטן',            # ניסו הוא ניסים; חלוץ, 1995–1997
    'קאווה':              'קאווה ססיליו דה סילבה',  # Cauê Cecilio da Silva, קשר ברזילאי, 2016
}

NICK_BOTH = {}
for _k, _v in NICKNAME.items():
    NICK_BOTH[_k] = _v
    NICK_BOTH[_v] = _v

POSITION_WORD = {'שוער': 'GK', 'בלם': 'DF', 'מגן': 'DF', 'קשר': 'MF', 'חלוץ': 'FW'}


def _clean(s: str) -> str:
    s = unicodedata.normalize('NFKD', s)
    s = NIQQUD.sub('', s)
    s = JUNK.sub('', s)
    s = s.replace("'", '')
    s = s.replace('-', ' ').replace('–', ' ').replace('—', ' ')
    s = s.translate(FINALS)
    return re.sub(r'\s+', ' ', s).strip()


def qualifier(name: str):
    m = PAREN.search(name)
    return m.group(1).strip() if m else None


def variants(name: str):
    """Every spelling of this name a source might reasonably use."""
    inner = qualifier(name)
    stripped = PAREN.sub(' ', name)
    out = {_clean(stripped), _clean(QUOTED.sub(' ', stripped))}
    if inner and not inner.isdigit() and inner not in POSITION_WORD:
        words = _clean(QUOTED.sub(' ', stripped)).split(' ')
        if len(words) > 1:
            out.add(' '.join([_clean(inner)] + words[1:]))       # אברהם (אבי) בנימין
    for v in list(out):
        w = v.split(' ')
        if len(w) > 2:
            out.add(w[0] + ' ' + w[-1])                          # drop the middle name
            out.add(' '.join(w[1:]))                             # drop the first name
            out.add(' '.join(w[:-1]))                            # drop the last name
        if len(w) == 2:
            out.add(w[1] + ' ' + w[0])                           # reversed order
        if w and w[0] in NICK_BOTH:
            out.add(' '.join([NICK_BOTH[w[0]]] + w[1:]))         # קובי → יעקב
    return {v for v in out if v}


def matres(word: str) -> str:
    if len(word) <= 2:
        return word
    kept = word[0] + ''.join(c for c in word[1:-1] if c not in SILENT) + word[-1]
    return kept or word


def hush(word: str) -> str:
    """Silent at the edges too: לאלא/לאלה at the end, איימוס/עמוס at the start."""
    while len(word) > 2 and word[-1] in 'אה':
        word = word[:-1]
    while len(word) > 2 and word[0] in 'אעה':
        word = word[1:]
    return word


def skeleton(s: str) -> str:
    out = []
    for word in s.split(' '):
        w = word.replace('וו', 'ו')
        w = hush(matres(w)).translate(FOLD)
        w = re.sub(r'(.)\1+', r'\1', w)      # doubled letters collapse
        out.append(w)
    return ' '.join(out)


def edit1(a: str, b: str) -> bool:
    if abs(len(a) - len(b)) > 1:
        return False
    if a == b:
        return True
    if len(a) > len(b):
        a, b = b, a
    i = 0
    while i < len(a) and a[i] == b[i]:
        i += 1
    if len(a) == len(b):
        return a[i + 1:] == b[i + 1:]
    return a[i:] == b[i + 1:]


def main():
    roster = [r['fullNameHe'] for r in
              json.load(open('content/manual/players-roster.json', encoding='utf-8'))['records']]

    wiki = [{'title': r['wikiTitle'], 'position': r['position'], 'origin': r['origin'],
             'fromYear': r['fromYear'], 'toYear': r['toYear'],
             'spells': r['spells'], 'positionFrom': r['positionFrom']}
            for r in json.load(open('content/manual/player-facts-wiki.json',
                                    encoding='utf-8'))['wikiHe']['table']]
    wby = {w['title']: w for w in wiki}

    matched, ambiguous = {}, {}
    took_r, took_w = set(), set()

    def take(rname, wtitle, how):
        if rname in took_r or wtitle in took_w:
            return
        matched[rname] = (wtitle, how)
        took_r.add(rname); took_w.add(wtitle)

    def sole(names, key):
        """key -> the ONE name producing it; collisions are returned separately."""
        by = defaultdict(list)
        for n in names:
            for k in (key(n) if isinstance(key(n), set) else {key(n)}):
                by[k].append(n)
        return ({k: v[0] for k, v in by.items() if len(v) == 1},
                {k: v for k, v in by.items() if len(v) > 1})

    def pass_(how, key):
        rleft = [n for n in roster if n not in took_r]
        wleft = [w['title'] for w in wiki if w['title'] not in took_w]
        rIdx, rDup = sole(rleft, key)
        wIdx, wDup = sole(wleft, key)
        for k, rname in rIdx.items():
            if k in wIdx:
                take(rname, wIdx[k], how)
            elif k in wDup:
                ambiguous.setdefault(rname, wDup[k])
        for k, rlist in rDup.items():
            cands = wDup.get(k) or ([wIdx[k]] if k in wIdx else None)
            if not cands:
                continue
            # ויקיפדיה כתבה שם בלי סוגריים; בארכיון יש אחד בלי ואחד עם. הראשון
            # הוא זה שהיא מתכוונת אליו — הסוגריים בארכיון הן ההבחנה, לא השם.
            plain_r = [n for n in rlist if qualifier(n) is None]
            plain_w = [t for t in cands if qualifier(t) is None]
            if len(plain_r) == 1 and len(plain_w) == 1:
                take(plain_r[0], plain_w[0], how + '/plain')
                continue
            for rname in rlist:
                ambiguous.setdefault(rname, cands)

    # 0 · three pairs checked one by one, written down where they can be argued with.
    for rname, wtitle in CONFIRMED.items():
        if rname in roster and wtitle in wby:
            take(rname, wtitle, 'confirmed')

    # 1 · the archive says WHICH of two men it means, by naming his position.
    wbase = defaultdict(list)
    for w in wiki:
        wbase[_clean(PAREN.sub(' ', w['title']))].append(w)
    for rname in roster:
        q = qualifier(rname)
        want = POSITION_WORD.get(q or '')
        if not want:
            continue
        agree = [w for w in wbase.get(_clean(PAREN.sub(' ', rname)), []) if w['position'] == want]
        if len(agree) == 1:
            take(rname, agree[0]['title'], 'qualifier')

    pass_('variant',  variants)
    pass_('matres',   lambda n: {' '.join(matres(w) for w in v.split(' ')) for v in variants(n)})
    pass_('skeleton', lambda n: {skeleton(v) for v in variants(n)})

    # 5 · same folded surname, unique on both sides, given name one edit away.
    def surname(n):
        parts = skeleton(sorted(variants(n))[0]).split(' ')
        return ' '.join(parts[1:]) if len(parts) > 1 else parts[0]

    def given(n):
        return skeleton(sorted(variants(n))[0]).split(' ')[0]

    rleft = [n for n in roster if n not in took_r]
    wleft = [w['title'] for w in wiki if w['title'] not in took_w]
    rS, _ = sole(rleft, surname)
    wS, _ = sole(wleft, surname)
    for k, rname in rS.items():
        if k in wS and edit1(given(rname), given(wS[k])):
            take(rname, wS[k], 'surname+1')

    rows = []
    for rname, (wtitle, how) in sorted(matched.items()):
        w = dict(wby[wtitle])
        rows.append({'personNameHe': rname, 'wikiTitle': wtitle, 'matchedBy': how, **w})
    del_ = [w['title'] for w in wiki if w['title'] not in took_w]

    summary = {
        'matched': len(rows),
        'byHow': {h: sum(1 for r in rows if r['matchedBy'] == h)
                  for h in sorted({r['matchedBy'] for r in rows})},
        'ambiguous': len(ambiguous),
        'wikiUnmatched': sorted(del_),
        'rosterUnmatched': sum(1 for n in roster if n not in took_r),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=1))
    json.dump({'rows': rows, 'ambiguous': ambiguous, 'wikiUnmatched': sorted(del_)},
              open('/tmp/claude-0/wiki/matched.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
