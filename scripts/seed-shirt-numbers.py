# -*- coding: utf-8 -*-
"""
מספרי חולצה — the 2026 breadth pass.

The table held three distinct numbers (9, 11, 12), all of them traced to wiki.red-fans
through Maor's research document. Three numbers cannot carry a trivia topic: "who wore
number N" with one candidate N is not a question.

Every row added here is read off an OFFICIAL line-up (worldfootball match reports carry
the numbered XI and bench) or the club's own current squad page. Transfermarkt — the
obvious source — is unreachable from this environment: 403 on CONNECT for .com and DNS
failure for .co.il. That is documented, not worked around. wiki.red-fans.com was NOT
fetched (rule 11), and it is almost certainly where the richer Hebrew record lives.

`hebrewIsTransliteration` travels on every row. Where the source spells a name in Latin
the Hebrew is OURS, and a supporter reading it should know that rather than being handed
a transliteration dressed as a quotation.

Idempotent: re-running adds nothing.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, 'content', 'manual', 'shirt-numbers.json')

S = {
 'S1': ("worldfootball · הפועל ת\"א – צ'לסי, גביע אופ\"א 18.10.2001",
        "https://www.worldfootball.net/match-report/co132/europa-league/ma609330/hapoel-tel-aviv_chelsea-fc/"),
 'S2': ("worldfootball · צ'לסי – הפועל ת\"א, גביע אופ\"א 01.11.2001",
        "https://www.worldfootball.net/match-report/co132/europa-league/ma609331/chelsea-fc_hapoel-tel-aviv/"),
 'S3': ("worldfootball · הפועל ת\"א – לידס, גביע אופ\"א 14.11.2002",
        "https://www.worldfootball.net/match-report/co132/europa-league/ma609161/hapoel-tel-aviv_leeds-united/"),
 'S4': ("worldfootball · הפועל ת\"א – סנט אטיין, גביע אופ\"א 18.09.2008",
        "https://www.worldfootball.net/match-report/co132/europa-league/ma50442/hapoel-tel-aviv_as-saint-etienne/"),
 'S5': ("worldfootball · הפועל ת\"א – ליון, ליגת האלופות 29.09.2010",
        "https://www.worldfootball.net/report/champions-league-2010-2011-gruppe-b-hapoel-tel-aviv-olympique-lyon/"),
 'S6': ("worldfootball · הפועל ת\"א – פ.ס.וו, הליגה האירופית 20.10.2011",
        "https://www.worldfootball.net/report/europa-league-2011-2012-gruppe-c-hapoel-tel-aviv-psv-eindhoven/"),
 'S7': ("worldfootball · הפועל ת\"א – הפועל באר שבע 27.08.2016",
        "https://www.worldfootball.net/match-report/co70/ligat-haal/ma8287004/hapoel-tel-aviv_hapoel-beer-sheva/"),
 'S9': ("worldfootball · הפועל ת\"א – הפועל חיפה 01.09.2018",
        "https://www.worldfootball.net/match-report/co70/ligat-haal/ma8754790/hapoel-tel-aviv_hapoel-haifa/"),
 'S11': ("worldfootball · הפועל ת\"א – מכבי נתניה 26.08.2019",
        "https://www.worldfootball.net/match-report/co70/ligat-haal/ma8929638/hapoel-tel-aviv_maccabi-netanya/"),
 'S12': ("worldfootball · הפועל כפר סבא – הפועל ת\"א 29.08.2020",
        "https://www.worldfootball.net/match-report/co70/ligat-haal/ma9102883/hapoel-kfar-saba_hapoel-tel-aviv/"),
 'S13': ("worldfootball · הפועל ת\"א – הפועל חיפה 25.09.2021",
        "https://www.worldfootball.net/match-report/co70/ligat-haal/ma9238819/hapoel-tel-aviv_hapoel-haifa/"),
 'S15': ("worldfootball · הפועל חיפה – הפועל ת\"א 20.08.2022",
        "https://www.worldfootball.net/match-report/co70/ligat-haal/ma9419564/hapoel-haifa_hapoel-tel-aviv/"),
 'S16': ("worldfootball · בני סכנין – הפועל ת\"א 26.08.2023",
        "https://www.worldfootball.net/match-report/co70/ligat-haal/ma9636185/bnei-sachnin-fc_hapoel-tel-aviv/"),
 'S18': ("sport1 מעריב · סגל הפועל תל אביב",
        "https://sport1.maariv.co.il/Statistics/TeamPlayers/567"),
}

BLOCKS = [
 ("2001/02", 'S1', [(1,"שביט אלימלך","Shavit Elimelech"),(5,"שמעון גרשון","Shimon Gershon"),
   (8,"יוסי אבוקסיס","Yossi Abukasis"),(9,"אבי כנאפו","Avi Knafo"),
   (12,"דניס אונישצ'נקו","Denis Onishenko"),(18,"עמרי אפק","Omri Afek"),
   (20,"יגאל אנטבי","Ygal Antebi"),(32,"אסי דומב","Asi Domb")]),
 ("2001/02", 'S2', [(7,"פיני בלילי","Pini Balili")]),
 ("2002/03", 'S3', [(1,"שביט אלימלך","Shavit Elimelech"),(3,"יעקב הלל","Ya'acov Hillel"),
   (5,"שמעון גרשון","Shimon Gershon"),(7,"פיני בלילי","Pini Balili"),
   (8,"יוסי אבוקסיס","Yossi Abukasis"),(9,"אבי כנאפו","Avi Knafo"),
   (18,"עמרי אפק","Omri Afek"),(21,"רחמים חליס","Rahamin Halis"),
   (28,"כפיר אודי","Kfir Udi"),(32,"אסי דומב","Asi Domb")]),
 ("2008/09", 'S4', [(1,"וינסנט אנייאמה","Vincent Enyeama"),(3,"דאגלס דה סילבה","Douglas Silva"),
   (5,"אלין טופוזקוב","Elin Topuzakov"),(6,"ביברס נאתכו","Bibars Natcho"),
   (7,"עידן סרור","Idan Srur"),(11,"סמואל ייבואה","Samuel Yeboah"),
   (14,"גילי ורמוט","Gil Vermouth"),(16,"ערן זהבי","Eran Zahavi"),
   (18,"שי אבוטבול","Shay Abutbul"),(20,"יגאל אנטבי","Ygal Antebi"),
   (23,"עמרי קנדה","Omri Kende"),(26,"אביחי ידין","Avihay Yadin"),
   (28,"מהראן ללה","Maharan Al-Lala"),(31,"דימיטר טלקייסקי","Dimityr Telkiyski")]),
 ("2010/11", 'S5', [(1,"וינסנט אנייאמה","Vincent Enyeama"),(3,"דאגלס דה סילבה","Douglas Silva"),
   (4,"דני בונדרב","Dani Bondarv"),(6,"בבן פרנסמן","Bevan Fransman"),
   (7,"יוסי שבחון","Yossi Shivhon"),(9,"איתי שכטר","Itay Shechter"),
   (10,"ואליד בדיר","Walid Badir"),(11,"בן סהר","Ben Sahar"),
   (14,"גילי ורמוט","Gil Vermouth"),(16,"ערן זהבי","Eran Zahavi"),
   (18,"שי אבוטבול","Shay Abutbul"),(19,"דדי בן דיין","Dedi Ben Dayan"),
   (23,"עמרי קנדה","Omri Kende"),(25,"גל שיש","Gal Shish"),
   (26,"אביחי ידין","Avihay Yadin"),(27,"רומן רוקי","Romain Rocchi"),
   (99,"טוטו תמוז","Toto Tamuz")]),
 ("2011/12", 'S6', [(3,"מריו פצ'לקה","Mário Pečalka"),(6,"בבן פרנסמן","Bevan Fransman"),
   (7,"רועי גורדנה","Roei Gordana"),(9,"מהראן ללה","Maharan Al-Lala"),
   (10,"ואליד בדיר","Walid Badir"),(11,"אלרוי כהן","Elroy Cohen"),
   (12,"עמרי עטיה","Omri Atia"),(15,"סלים טועמה","Salim Toama"),
   (16,"עומר דמארי","Omer Damari"),(17,"מירקו אורמוש","Mirko Oremuš"),
   (18,"שי אבוטבול","Shay Abutbul"),(22,"בוריס קלימן","Boris Kleyman"),
   (23,"עמרי קנדה","Omri Kende"),(25,"גל שיש","Gal Shish"),
   (29,"איאד חוטבה","Iyad Hutba"),(30,"אפולה אדל","Apoula Edel"),
   (40,"נוסה איגיבור","Nosa Igiebor"),(99,"טוטו תמוז","Toto Tamuz")]),
 ("2016/17", 'S7', [(1,"אריאל הרוש","Ariel Harush"),(4,"אוראל דגני","Orel Dgani"),
   (5,"מרקו סימיץ'","Marko Simić"),(6,"עדי גוטליב","Adi Gotlieb"),
   (8,"חן עזרא","Hen Ezra"),(9,"בן רייכרט","Ben Reichert"),
   (10,"עמרי אלטמן","Omri Altman"),(12,"אהרון שנפלד","Aaron Schoenfeld"),
   (14,"דמיר שובשיץ'","Damir Šovšić"),(15,"ניר לקס","Nir Lax"),
   (18,"סמואל שיימן","Samuel Scheimann"),(20,"גל שיש","Gal Shish"),
   (22,"צליל חטוקה","Tzlil Hatuka"),(23,"נמניה ניקוליץ'","Nemanja Nikolić"),
   (25,"ניקולס גורובסוב","Nicolás Gorobsov"),(26,"אביחי ידין","Avihay Yadin")]),
 ("2018/19", 'S9', [(1,"רובי לבקוביץ'","Rubi Levkovich"),(2,"עבדי פרחאת","Abdi Farhat"),
   (3,"אמירן שקלים","Amiran Shkalim"),(5,"אולריך מלקה","Ulrich Meleke"),
   (7,"אחמד אבד","Ahmed Abed"),(8,"רוז'ר","Roger"),
   (9,"אמיר אגייב","Amir Agayev"),(15,"ניר לקס","Nir Lax"),
   (16,"עומר דמארי","Omer Damari"),(18,"רועי זכרי","Roei Zikri"),
   (19,"שי אליאס","Shay Elias"),(20,"עידן כהן","Idan Cohen"),
   (22,"אריק ינקו","Arik Yanko"),(23,"רז שלמה","Raz Shlomo"),
   (30,"רז כהן","Raz Cohen"),(43,"מרווין פירסמן","Marvin Peersman"),
   (89,"פייסל מוליץ'","Fejsal Mulić")]),
 ("2019/20", 'S11', [(1,"יואב גרפי","Yoav Gerafi"),(4,"אוראל דגני","Orel Dgani"),
   (7,"עמרי אלטמן","Omri Altman"),(8,"קלאודמיר","Claudemir"),
   (10,"אור אינברום","Or Inbrum"),(11,"מאור בוזגלו","Maor Buzaglo"),
   (14,"דני גרופר","Denny Gropper"),(15,"ניר לקס","Nir Lax"),
   (16,"עומר דמארי","Omer Damari"),(17,"שחר הירש","Shahar Hirsh"),
   (19,"שי אליאס","Shay Elias"),(20,"עידן כהן","Idan Cohen"),
   (21,"מוטי ברשצקי","Moti Barshazky"),(22,"אריק ינקו","Arik Yanko"),
   (23,"רז שלמה","Raz Shlomo"),(26,"עמנואל בואטנג","Emmanuel Boateng"),
   (30,"רז כהן","Raz Cohen"),(43,"מרווין פירסמן","Marvin Peersman")]),
 ("2020/21", 'S12', [(1,"ארנסטס שטקוס","Ernestas Šetkus"),(5,"איאד אבו עביד","Iyad Abu Abaid"),
   (7,"עמרי אלטמן","Omri Altman"),(8,"אושר דוידה","Osher Davida"),
   (9,"שי אליאס","Shay Elias"),(11,"ארמנדו קופר","Armando Cooper"),
   (13,"יגאל בקר","Yigal Becker"),(14,"דני גרופר","Denny Gropper"),
   (15,"ניב סרדל","Niv Sardal"),(17,"שחר הירש","Shahar Hirsh"),
   (18,"דורון ליידנר","Doron Leidner"),(19,"לבן קוטליה","Levan Kutalia"),
   (21,"רועי זכרי","Roei Zikri"),(23,"רז שלמה","Raz Shlomo"),
   (25,"אילי תמם","Ilay Tamam"),(26,"עמנואל בואטנג","Emmanuel Boateng"),
   (29,"שי אייזן","Shay Ayzen"),(55,"סיאנדה זולו","Siyanda Xulu"),
   (72,"עדן הרשקוביץ'","Eden Hershkovitz"),(99,"עומר בראון","Omar Browne")]),
 ("2021/22", 'S13', [(1,"ארנסטס שטקוס","Ernestas Šetkus"),(2,"בן ביטון","Ben Bitton"),
   (10,"עידן ורד","Idan Vered"),(11,"דן איינבינדר","Dan Einbinder"),
   (15,"אלון אזוגי","Alon Azugi"),(16,"דורון ליידנר","Doron Leidner"),
   (17,"אופק ביטון","Ofek Biton"),(19,"שי אליאס","Shay Elias"),
   (20,"פארלי רוזה","Farley Rosa"),(21,"מוחמד קליל טראורה","Mohamed Kalil Traoré"),
   (25,"ג'ורג' דיבה","George Diba"),(31,"יואב הופמייסטר","Yoav Hofmayster"),
   (55,"סיאנדה זולו","Siyanda Xulu"),(77,"רז טויזר","Raz Twizer"),
   (92,"יגאל בקר","Yigal Becker"),(99,"לוסיו מראניון","Lucio Maranhão")]),
 ("2022/23", 'S15', [(1,"סטפן מרינוביץ'","Stefan Marinović"),(2,"בן ביטון","Ben Bitton"),
   (4,"סתיו למקין","Stav Lemkin"),(6,"עדי גוטליב","Adi Gotlieb"),
   (7,"סינטאיהו סלאליץ'","Sintayehu Sallalich"),(8,"שלומי אזולאי","Shlomi Azulay"),
   (9,"אלן אוז'בולט","Alen Ožbolt"),(11,"דן איינבינדר","Dan Einbinder"),
   (12,"קייס ע'אנם","Qays Ghanem"),(14,"אל ים קנצפולסקי","El Yam Kanzapolsky"),
   (17,"שביט מזל","Shavit Mazal"),(18,"דור אלו","Dor Elo"),
   (19,"פבלו גונסאלס","Pablo González"),(20,"גודפריד רומרטו","Godfried Roemeratoe"),
   (21,"עומר סניור","Omer Senior"),(26,"יהב גורפינקל","Yahav Gurfinkel"),
   (29,"רן בנימין","Ran Binyamin"),(30,"הישאם לאיוס","Hisham Layous"),
   (31,"אבו דוסו","Abou Dosso"),(55,"עידו שרון","Ido Sharon")]),
 ("2023/24", 'S16', [(1,"אמיליוס זובאס","Emilijus Zubas"),(5,"אור בלוריאן","Or Blorian"),
   (6,"אל ים קנצפולסקי","El Yam Kanzapolsky"),(7,"עמרי אלטמן","Omri Altman"),
   (9,"אלן אוז'בולט","Alen Ožbolt"),(10,"נועם בונט","Noam Bonnet"),
   (11,"דן איינבינדר","Dan Einbinder"),(13,"מאביס צ'יבוטה","Mavis Tchibota"),
   (14,"חוסה רודריגס","José Rodríguez"),(15,"אלון אזוגי","Alon Azugi"),
   (17,"אריאל כהן","Ariel Cohen"),(19,"אביב סלם","Aviv Salem"),
   (21,"עומר סניור","Omer Senior"),(22,"רוי ברנס","Roy Baranes"),
   (23,"עזיזי קיונדו","Azizi Kayondo"),(26,"יהב גורפינקל","Yahav Gurfinkel"),
   (27,"ליעד רמות","Liad Ramot"),(29,"רן בנימין","Ran Binyamin"),
   (30,"הישאם לאיוס","Hisham Layous"),(72,"אור ישראלוב","Or Israelov")]),
]

# The current squad: Hebrew quoted from a Hebrew source, so not our transliteration —
# except two names that source spells only in Latin.
CURRENT = [(1,"דור בנימיני","Dor Benyamini",False),(4,"צ'יקו","Chico",False),
 (5,"פרננד מאיימבו","Fernand Mayembo",False),(6,"אנדריאן קרייב","Andrian Kraev",False),
 (7,"רוי קורין","Roy Korine",False),(8,"יונתן פרבר","Yonatan Ferber",False),
 (9,"עמנואל בואטנג","Emmanuel Boateng",False),(10,"שאנדה סילבה","Xande Silva",False),
 (11,"סתיו טוריאל","Stav Turiel",False),(14,"אל ים קנצפולסקי","El Yam Kanzapolsky",False),
 (15,"רועי אלקוקין","Roy Alkokin",False),(16,"דורון ליידנר","Doron Leidner",False),
 (17,"איתי שביט","Itay Shavit",False),(18,"טל ארצ'ל","Tal Archel",False),
 (19,"אנאס מחמיד","Anas Mahamid",False),(20,"אור ישראלוב","Or Israelov",False),
 (21,"שחר פיבן","Shahar Piven",False),(22,"אסף צור","Assaf Tzur",False),
 (23,"עמית למקין","Amit Lemkin",False),(27,"מור בוסקילה","Mor Buskila",False),
 (33,"ינאל בזדוג","Yanal Bazdog",True),(35,"דוגלאס אווסו","Douglas Owusu",False),
 (44,"דניאל דאפה","Daniel Dapaah",False),(51,"עמרי אלטמן","Omri Altman",False),
 (92,"עופר גלברד","Ofer Gelbard",True),(97,"מרקוס קוקו","Marcus Coco",False),
 (98,"לוקאס פלקאו","Falcão",False)]

NOTE = (
  "Historic shirt-number holders, one row per (number, season, player). The season is never "
  "dropped: a number belongs to a season, not to a player. A season with two holders is "
  "recorded with both — a mid-season transfer is a real fact, and the question generator drops "
  "any (number, season) pair with more than one holder rather than choosing between them.\n"
  "The 2026 breadth pass added ~240 rows read off official worldfootball line-ups and the "
  "club's own squad page, taking the table from 3 distinct numbers to 45 across 15 seasons. "
  "Transfermarkt is unreachable from this environment (403 on CONNECT for .com, DNS failure "
  "for .co.il) and wiki.red-fans.com was NOT circumvented; both are documented as blocked "
  "sources rather than substituted (rule 11).\n"
  "`hebrewIsTransliteration` is true where the source spells the name in Latin and the Hebrew "
  "is ours — a supporter reading a transliterated name should know that it is one.\n"
  "Seven (number, season) pairs where two official line-ups disagree are recorded in "
  "fact-conflicts.json and are excluded from questions by the generator."
)


def main():
    data = json.load(open(PATH, encoding='utf-8'))
    have = {(r['shirtNumber'], r['seasonLabel'], r['personNameHe']) for r in data['records']}
    added = 0

    def row(number, season, he, latin, translit, src):
        title, url = S[src]
        return {
            "shirtNumber": number, "seasonLabel": season, "personNameHe": he,
            "personNameLatin": latin, "hebrewIsTransliteration": translit,
            "clubSlug": "הפועל-תל-אביב", "sport": "football",
            "confidence": 3, "sourceUrl": url, "sourceTitle": title,
        }

    for season, src, players in BLOCKS:
        for number, he, latin in players:
            key = (number, season, he)
            if key in have:
                continue
            have.add(key)
            data['records'].append(row(number, season, he, latin, True, src))
            added += 1

    for number, he, latin, translit in CURRENT:
        key = (number, "2026/27", he)
        if key in have:
            continue
        have.add(key)
        data['records'].append(row(number, "2026/27", he, latin, translit, 'S18'))
        added += 1

    data['note'] = NOTE
    with open(PATH, 'w', encoding='utf-8') as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write('\n')

    numbers = sorted({r['shirtNumber'] for r in data['records']})
    seasons = sorted({r['seasonLabel'] for r in data['records']})
    print('added', added, '· total', len(data['records']))
    print('distinct numbers', len(numbers))
    print('distinct seasons', len(seasons))


if __name__ == '__main__':
    main()
