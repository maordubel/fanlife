#!/usr/bin/env python3
"""Writes content/manual/*.json from the verified research pass of 2026-08-31.

Every record here traces to a source URL that was actually read. Anything the
research could not source is absent, not guessed. Confidence:
  2 = two independent sources, or the club's own official page
  1 = one credible source
  0 = product taxonomy / calendar scaffold, carrying no historical claim
"""
import json
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "content" / "manual"
OUT.mkdir(parents=True, exist_ok=True)

WIKI_HTA = "https://en.wikipedia.org/wiki/Hapoel_Tel_Aviv_F.C."
OFFICIAL_HISTORY = "https://www.htafc.co.il/היסטוריה-והישגים/"
FKA = "https://www.footballkitarchive.com/hapoel-tel-aviv-kits/"
FKA_LOGOS = "https://www.footballkitarchive.com/hapoel-tel-aviv-logo-history/"
UEFA_MILAN = "https://www.uefa.com/uefaeuropaleague/news/0183-0eaa43ba228a-d6fe8d77e124-1000--clescenko-stuns-milan/"
UEFA_PARMA = "https://www.uefa.com/uefaeuropaleague/news/025a-0eab0ace3480-d3cf7a771c8b-1000--tel-aviv-fairy-tale-continues/"
UEFA_LOKO = "https://www.uefa.com/uefaeuropaleague/news/025a-0eab13c1f1d5-dab99f819385-1000--tel-aviv-triumph-in-russia"
UEFA_DOMB = "https://www.uefa.com/uefaeuropaleague/news/017f-0e6a31a02e21-58d549aa2129-1000--domb-gives-tel-aviv-the-advantage"
UEFA_CHELSEA = "https://www.uefa.com/uefaeuropaleague/match/68550--h-tel-aviv-vs-chelsea/"
SKY_BENFICA = "https://www.skysports.com/football/hap-tel-aviv-vs-benfica/report/227534"
WIKI_BLOOMFIELD = "https://en.wikipedia.org/wiki/Bloomfield_Stadium"
STADIUMDB = "https://stadiumdb.com/stadiums/isr/bloomfield_stadium"
WIKI_DERBY = "https://en.wikipedia.org/wiki/Tel_Aviv_derby"
WIKI_ASIAN = "https://en.wikipedia.org/wiki/1967_Asian_Champion_Club_Tournament"
ULTRAS = "http://www.ultrashapoel.com/history-ultras.html"
YNET_RESIGN = "https://www.ynet.co.il/articles/1,7340,L-4293753,00.html"
YNET_2012 = "https://www.ynet.co.il/articles/0,7340,L-4291776,00.html"
YNET_2013 = "https://www.ynet.co.il/article/4340044"
YNET_2007 = "https://www.ynet.co.il/articles/0,7340,L-3447054,00.html"
YNET_DEMOLITION = "https://www.ynet.co.il/articles/0,7340,L-3429531,00.html"
WALLA_NAME = "https://sports.walla.co.il/item/1713821"
WALLA_SHALEF = "https://sports.walla.co.il/item/2843036"
SPORT5_EINSTEIN = "https://www.sport5.co.il/articles.aspx?FolderID=4483&docID=158800"
WIKI_HTA_BC = "https://en.wikipedia.org/wiki/Hapoel_Tel_Aviv_B.C."
ONE_ARKIA = "https://www.one.co.il/Article/297584.html"
ONE_ARKIA_END = "https://www.one.co.il/Article/377561.html"
IBI_OFFICIAL = "https://www.htafc.co.il/ibi-בית-השקעות-חתמה-על-הסכם-חסות-ראשית-עם/"
KAN_TOTO_2025 = "https://www.kan.org.il/content/kan-news/sport/965001/"
SPORT1_1923 = "https://sport1.maariv.co.il/israeli-soccer/ligat-haal/Article-728080/"
WORLDFOOTBALL_EL = "https://www.worldfootball.net/competition/co132/europa-league/se1428/2009-2010/ro4730/group-c/results-and-standings/"
WIKI_CHAMPIONS = "https://en.wikipedia.org/wiki/List_of_Israeli_football_champions"

HTA = "הפועל-תל-אביב"
HTA_BC = "הפועל-תל-אביב-כדורסל"


def write(name, note, confidence, source, records, extra=None):
    payload = {"note": note, "confidence": confidence, "source": source, "records": records}
    if extra:
        payload.update(extra)
    (OUT / name).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


research = {"kind": "other", "title": "Verified research pass, 31 Aug 2026", "url": None}

# ------------------------------------------------------------------ clubs
write(
    "clubs.json",
    "Hapoel Tel Aviv is the club this product is about. Maccabi Tel Aviv is flagged as "
    "the derby rival — for this project a derby means Maccabi Tel Aviv and nothing else. "
    "Opponent clubs exist only to give verified matches something to point at.",
    2,
    research,
    [
        {"slug": HTA, "nameHe": "הפועל תל אביב", "nameEn": "Hapoel Tel Aviv", "city": "תל אביב",
         "sport": "football", "isUs": True,
         "aliases": ["הפועל תל אביב", "הפועל ת\"א", "הפועל תל אביב (כדורגל)", "Hapoel Tel Aviv"],
         "confidence": 3, "sourceTitle": "Maor Harel — project owner", "sourceKind": "manual"},
        {"slug": "מכבי-תל-אביב", "nameHe": "מכבי תל אביב", "nameEn": "Maccabi Tel Aviv",
         "city": "תל אביב", "sport": "football", "isDerbyRival": True,
         "aliases": ["מכבי תל אביב", "מכבי ת\"א", "Maccabi Tel Aviv"],
         "confidence": 2, "sourceUrl": WIKI_DERBY,
         "sourceTitle": "Tel Aviv derby — Wikipedia"},
        {"slug": HTA_BC, "nameHe": "הפועל תל אביב (כדורסל)", "nameEn": "Hapoel Tel Aviv B.C.",
         "city": "תל אביב", "sport": "basketball",
         "aliases": ["הפועל תל אביב כדורסל", "הפועל IBI תל אביב", "Hapoel Tel Aviv B.C."],
         "confidence": 2, "sourceUrl": WIKI_HTA_BC, "sourceTitle": "Hapoel Tel Aviv B.C. — Wikipedia"},
        {"slug": "צלסי", "nameHe": "צ'לסי", "nameEn": "Chelsea", "city": "לונדון",
         "sport": "football", "aliases": ["צ'לסי", "Chelsea"], "confidence": 2,
         "sourceUrl": UEFA_CHELSEA, "sourceTitle": "UEFA match centre"},
        {"slug": "לוקומוטיב-מוסקבה", "nameHe": "לוקומוטיב מוסקבה", "nameEn": "Lokomotiv Moscow",
         "city": "מוסקבה", "sport": "football", "aliases": ["לוקומוטיב מוסקבה", "Lokomotiv Moscow"],
         "confidence": 2, "sourceUrl": UEFA_LOKO, "sourceTitle": "UEFA report"},
        {"slug": "פארמה", "nameHe": "פארמה", "nameEn": "Parma", "city": "פארמה",
         "sport": "football", "aliases": ["פארמה", "Parma"], "confidence": 2,
         "sourceUrl": UEFA_PARMA, "sourceTitle": "UEFA report"},
        {"slug": "מילאן", "nameHe": "מילאן", "nameEn": "AC Milan", "city": "מילאנו",
         "sport": "football", "aliases": ["מילאן", "איי סי מילאן", "AC Milan"], "confidence": 2,
         "sourceUrl": UEFA_MILAN, "sourceTitle": "UEFA report"},
        {"slug": "בנפיקה", "nameHe": "בנפיקה", "nameEn": "Benfica", "city": "ליסבון",
         "sport": "football", "aliases": ["בנפיקה", "Benfica"], "confidence": 2,
         "sourceUrl": SKY_BENFICA, "sourceTitle": "Sky Sports match report"},
        {"slug": "שמשון-תל-אביב", "nameHe": "שמשון תל אביב", "nameEn": "Shimshon Tel Aviv",
         "city": "תל אביב", "sport": "football", "aliases": ["שמשון תל אביב", "Shimshon Tel Aviv"],
         "confidence": 2, "sourceUrl": WIKI_BLOOMFIELD, "sourceTitle": "Bloomfield Stadium — Wikipedia"},
        {"slug": "סלנגור", "nameHe": "סלנגור", "nameEn": "Selangor", "city": "סלנגור",
         "sport": "football", "aliases": ["סלנגור", "Selangor"], "confidence": 1,
         "sourceUrl": WIKI_ASIAN, "sourceTitle": "1967 Asian Champion Club Tournament — Wikipedia"},
    ],
)

# ----------------------------------------------------------------- venues
write(
    "venues.json",
    "Only venues a verified match points at. Ussishkin Hall is basketball and is marked as such.",
    2,
    research,
    [
        {"slug": "בלומפילד", "nameHe": "אצטדיון בלומפילד", "city": "תל אביב־יפו",
         "sport": "football", "aliases": ["בלומפילד", "אצטדיון בלומפילד", "Bloomfield Stadium"],
         "confidence": 2, "sourceUrl": WIKI_BLOOMFIELD, "sourceTitle": "Bloomfield Stadium — Wikipedia"},
        {"slug": "בסה", "nameHe": "אצטדיון בסה", "city": "תל אביב־יפו", "sport": "football",
         "aliases": ["בסה", "אצטדיון בסה", "Basa Stadium"], "confidence": 2,
         "sourceUrl": WIKI_BLOOMFIELD,
         "sourceTitle": "Bloomfield Stadium — Wikipedia (Basa was Hapoel's home from 1950, on the same site)"},
        {"slug": "גספ-ניקוסיה", "nameHe": "אצטדיון GSP ניקוסיה", "city": "ניקוסיה",
         "sport": "football", "aliases": ["GSP", "אצטדיון GSP", "GSP Stadium"], "confidence": 2,
         "sourceUrl": UEFA_MILAN, "sourceTitle": "UEFA report"},
        {"slug": "סן-סירו", "nameHe": "סן סירו", "city": "מילאנו", "sport": "football",
         "aliases": ["סן סירו", "San Siro"], "confidence": 2,
         "sourceUrl": "https://www.espn.com/soccer/match/_/gameId/38212/hapoel-tel-aviv-ac-milan",
         "sourceTitle": "ESPN match page"},
        {"slug": "היכל-אוסישקין", "nameHe": "היכל אוסישקין", "city": "תל אביב",
         "sport": "basketball", "aliases": ["היכל אוסישקין", "אוסישקין", "Ussishkin Hall"],
         "confidence": 1, "sourceUrl": YNET_DEMOLITION, "sourceTitle": "Ynet, 25.7.2007"},
    ],
)

# ----------------------------------------------------------- competitions
write(
    "competitions.json",
    "Competition names and types. Participation is a season-level fact and is asserted "
    "only through trophies and matches, never here.",
    2,
    research,
    [
        {"slug": "ליגת-העל", "nameHe": "ליגת העל", "type": "league", "tier": 1, "sport": "football",
         "aliases": ["ליגת העל", "הליגה הלאומית", "ליגת הבכירה", "Israeli Premier League"]},
        {"slug": "גביע-המדינה", "nameHe": "גביע המדינה", "type": "national_cup", "sport": "football",
         "aliases": ["גביע המדינה", "גביע המדינה בכדורגל", "Israel State Cup"]},
        {"slug": "גביע-הטוטו", "nameHe": "גביע הטוטו", "type": "league_cup", "sport": "football",
         "aliases": ["גביע הטוטו", "גביע הטוטו על", "Toto Cup"]},
        {"slug": "גביע-אופא", "nameHe": "גביע אופ\"א", "type": "europe", "sport": "football",
         "aliases": ["גביע אופא", "גביע אופ\"א", "UEFA Cup"]},
        {"slug": "הליגה-האירופית", "nameHe": "הליגה האירופית", "type": "europe", "sport": "football",
         "aliases": ["הליגה האירופית", "יורופה ליג", "Europa League"]},
        {"slug": "ליגת-האלופות", "nameHe": "ליגת האלופות", "type": "europe", "sport": "football",
         "aliases": ["ליגת האלופות", "Champions League"]},
        {"slug": "גביע-אלופות-אסיה", "nameHe": "גביע אלופות אסיה", "type": "other", "sport": "football",
         "aliases": ["גביע אלופות אסיה", "Asian Champion Club Tournament"]},
        {"slug": "ליגה-ב-כדורסל", "nameHe": "ליגה ב' בכדורסל", "type": "league", "tier": 5,
         "sport": "basketball", "aliases": ["ליגה ב' כדורסל"]},
        {"slug": "ליגה-א-כדורסל", "nameHe": "ליגה א' בכדורסל", "type": "league", "tier": 4,
         "sport": "basketball", "aliases": ["ליגה א' כדורסל"]},
        {"slug": "ליגה-ארצית-כדורסל", "nameHe": "ליגה ארצית בכדורסל", "type": "league", "tier": 3,
         "sport": "basketball", "aliases": ["ליגה ארצית כדורסל"]},
        {"slug": "ליגה-לאומית-כדורסל", "nameHe": "ליגה לאומית בכדורסל", "type": "league", "tier": 2,
         "sport": "basketball", "aliases": ["ליגה לאומית כדורסל"]},
    ],
)

# ---------------------------------------------------------------- seasons
write(
    "seasons.json",
    "Calendar scaffold. A season label is arithmetic, not a claim that the club competed "
    "that season. A source that names a bare year (pre-state cups) is rendered YYYY/YY by "
    "the canonicaliser — a labelling convention, documented, not a claim about the calendar.",
    0,
    {"kind": "manual", "title": "Season calendar scaffold", "url": None},
    [],
    extra={"generate": {"from": "1923/24", "to": "2026/27"}},
)

# ----------------------------------------------------------------- people
write(
    "people.json",
    "Only people named in a verified source. Roles and relationships live in matches, "
    "events and association roles — not in prose here.",
    2,
    research,
    [
        {"slug": "סרגיי-קלשצנקו", "fullNameHe": "סרגיי קלשצ'נקו", "fullNameEn": "Serghey Clescenko",
         "aliases": ["סרגיי קלשצ'נקו", "Serghey Clescenko", "Sergei Kleschenko"],
         "confidence": 2, "sourceUrl": UEFA_MILAN, "sourceTitle": "UEFA report, 14.3.2002"},
        {"slug": "יוסי-אבוקסיס", "fullNameHe": "יוסי אבוקסיס", "fullNameEn": "Yossi Abuksis",
         "aliases": ["יוסי אבוקסיס", "Yossi Abuksis"], "confidence": 2,
         "sourceUrl": UEFA_MILAN, "sourceTitle": "UEFA report, 14.3.2002"},
        {"slug": "אסי-דומב", "fullNameHe": "אסי דומב", "fullNameEn": "Assi Domb",
         "aliases": ["אסי דומב", "Assi Domb"], "confidence": 1,
         "sourceUrl": UEFA_DOMB, "sourceTitle": "UEFA report, 20.11.2001"},
        {"slug": "מילאן-אוסטרץ", "fullNameHe": "מילאן אוסטרץ", "fullNameEn": "Milan Osterc",
         "aliases": ["מילאן אוסטרץ", "Milan Osterc"], "confidence": 1,
         "sourceUrl": UEFA_LOKO, "sourceTitle": "UEFA report, 4.12.2001"},
        {"slug": "ערן-זהבי", "fullNameHe": "ערן זהבי", "fullNameEn": "Eran Zahavi",
         "aliases": ["ערן זהבי", "Eran Zahavi"], "confidence": 2,
         "sourceUrl": SKY_BENFICA, "sourceTitle": "Sky Sports, 24.11.2010"},
        {"slug": "דאגלס-דה-סילבה", "fullNameHe": "דאגלס דה סילבה", "fullNameEn": "Douglas da Silva",
         "aliases": ["דאגלס דה סילבה", "Douglas da Silva"], "confidence": 2,
         "sourceUrl": SKY_BENFICA, "sourceTitle": "Sky Sports, 24.11.2010"},
        {"slug": "מאור-הראל", "fullNameHe": "מאור הראל", "fullNameEn": "Maor Harel",
         "aliases": ["מאור הראל", "Maor Harel"], "confidence": 2,
         "sourceUrl": YNET_2012, "sourceTitle": "Ynet, Yael Shahror, 14.10.2012"},
        {"slug": "אורי-שלף", "fullNameHe": "אורי שלף", "fullNameEn": "Uri Shalef",
         "aliases": ["אורי שלף", "Uri Shalef", "Uri Shlef"], "confidence": 2,
         "sourceUrl": WALLA_SHALEF, "sourceTitle": "Walla, Oren Yosifowitz, 2.4.2015"},
        {"slug": "נועה-סקלי", "fullNameHe": "נועה סקלי", "fullNameEn": "Noa Skali",
         "aliases": ["נועה סקלי", "Noa Skali"], "confidence": 1,
         "sourceUrl": YNET_2012, "sourceTitle": "Ynet, 14.10.2012"},
        {"slug": "יונתן-לרנר", "fullNameHe": "יונתן לרנר", "fullNameEn": "Yonatan Lerner",
         "aliases": ["יונתן לרנר", "Yonatan Lerner"], "confidence": 1,
         "sourceUrl": YNET_2012, "sourceTitle": "Ynet, 14.10.2012"},
        {"slug": "רמי-כהן", "fullNameHe": "רמי כהן", "fullNameEn": "Rami Cohen",
         "aliases": ["רמי כהן", "Rami Cohen"], "confidence": 1,
         "sourceUrl": YNET_2012, "sourceTitle": "Ynet, 14.10.2012"},
        {"slug": "גבי-כץ", "fullNameHe": "גבי כץ", "fullNameEn": "Gabi Katz",
         "aliases": ["גבי כץ", "Gabi Katz"], "confidence": 1,
         "sourceUrl": YNET_2012, "sourceTitle": "Ynet, 14.10.2012"},
        {"slug": "ארז-זייציק", "fullNameHe": "ארז זייצ'יק", "fullNameEn": "Erez Zeitchik",
         "aliases": ["ארז זייצ'יק", "Erez Zeitchik"], "confidence": 1,
         "sourceUrl": YNET_2013, "sourceTitle": "Ynet, 2.2.2013"},
        {"slug": "אריק-איינשטיין", "fullNameHe": "אריק איינשטיין", "fullNameEn": "Arik Einstein",
         "aliases": ["אריק איינשטיין", "Arik Einstein"], "confidence": 1,
         "sourceUrl": SPORT5_EINSTEIN, "sourceTitle": "Sport5, 27.11.2013"},
    ],
)

# ---------------------------------------------------------------- matches
def match(season, comp, stage, date, home, away, hs, aws, venue=None, url=None, title=None, conf=2):
    return {
        "seasonLabel": season, "competitionSlug": comp, "stage": stage, "playedOn": date,
        "homeClubSlug": home, "awayClubSlug": away, "homeScore": hs, "awayScore": aws,
        "venueSlug": venue, "status": "played", "confidence": conf,
        "sourceUrl": url, "sourceTitle": title,
    }


write(
    "matches.json",
    "Every match here was verified against a named source this session. The 2001/02 UEFA "
    "Cup run is complete from the second round onwards; the first-round opponent could not "
    "be resolved and is therefore absent rather than guessed. Kickoff times are never "
    "asserted — only dates.",
    2,
    research,
    [
        match("2001/02", "גביע-אופא", "סיבוב 2 משחק 1", "2001-10-18", HTA, "צלסי", 2, 0,
              "בלומפילד", UEFA_CHELSEA, "UEFA match centre"),
        match("2001/02", "גביע-אופא", "סיבוב 2 משחק 2", "2001-11-01", "צלסי", HTA, 1, 1,
              None, UEFA_CHELSEA, "UEFA match centre"),
        match("2001/02", "גביע-אופא", "סיבוב 3 משחק 1", "2001-11-20", HTA, "לוקומוטיב-מוסקבה", 2, 1,
              "בלומפילד", UEFA_DOMB, "UEFA report — Domb 89'"),
        match("2001/02", "גביע-אופא", "סיבוב 3 משחק 2", "2001-12-04", "לוקומוטיב-מוסקבה", HTA, 0, 1,
              None, UEFA_LOKO, "UEFA report — Osterc"),
        match("2001/02", "גביע-אופא", "שמינית גמר משחק 1", "2002-02-21", HTA, "פארמה", 0, 0,
              "בלומפילד", UEFA_PARMA, "UEFA report"),
        match("2001/02", "גביע-אופא", "שמינית גמר משחק 2", "2002-02-28", "פארמה", HTA, 1, 2,
              None, UEFA_PARMA, "UEFA report"),
        match("2001/02", "גביע-אופא", "רבע גמר משחק 1", "2002-03-14", HTA, "מילאן", 1, 0,
              "גספ-ניקוסיה", UEFA_MILAN, "UEFA report — Clescenko 32'"),
        match("2001/02", "גביע-אופא", "רבע גמר משחק 2", "2002-03-21", "מילאן", HTA, 2, 0,
              "סן-סירו", "https://www.espn.com/soccer/match/_/gameId/38212/hapoel-tel-aviv-ac-milan",
              "ESPN match page"),
        match("2010/11", "ליגת-האלופות", "בית B מחזור 5", "2010-11-24", HTA, "בנפיקה", 3, 0,
              "בלומפילד", SKY_BENFICA, "Sky Sports match report"),
        match("1962/63", "ליגת-העל", "משחק הפתיחה של בלומפילד", "1962-10-13", HTA, "שמשון-תל-אביב",
              1, 1, "בלומפילד", WIKI_BLOOMFIELD,
              "Bloomfield Stadium — Wikipedia (StadiumDB agrees; golden-lotus.co.il says 0-0 — see fact-conflicts)",
              1),
        match("1927/28", "ליגת-העל", "מפגש ראשון (ידידות)", "1928-02-25", "מכבי-תל-אביב", HTA, 3, 0,
              None, WIKI_DERBY, "Tel Aviv derby — Wikipedia", 1),
        match("1967/68", "גביע-אלופות-אסיה", "גמר", "1967-12-19", HTA, "סלנגור", 2, 1,
              None, WIKI_ASIAN, "1967 Asian Champion Club Tournament — Wikipedia", 1),
    ],
)

write(
    "match-events.json",
    "Only goals a named source attributes to a named scorer with a minute.",
    2,
    research,
    [
        {"matchNaturalKey": "2001/02|גביע-אופא|" + HTA + "|מילאן|רבע גמר משחק 1", "seq": 1,
         "minute": 32, "type": "goal", "clubSlug": HTA, "personSlug": "סרגיי-קלשצנקו",
         "relatedPersonSlug": "יוסי-אבוקסיס", "confidence": 2,
         "sourceUrl": UEFA_MILAN, "sourceTitle": "UEFA report — Clescenko 32', assist Abuksis"},
        {"matchNaturalKey": "2001/02|גביע-אופא|" + HTA + "|לוקומוטיב-מוסקבה|סיבוב 3 משחק 1",
         "seq": 1, "minute": 89, "type": "goal", "clubSlug": HTA, "personSlug": "אסי-דומב",
         "confidence": 1, "sourceUrl": UEFA_DOMB, "sourceTitle": "UEFA report — Domb 89'"},
        {"matchNaturalKey": "2010/11|ליגת-האלופות|" + HTA + "|בנפיקה|בית B מחזור 5", "seq": 1,
         "minute": 24, "type": "goal", "clubSlug": HTA, "personSlug": "ערן-זהבי",
         "confidence": 2, "sourceUrl": SKY_BENFICA, "sourceTitle": "Sky Sports, 24.11.2010"},
        {"matchNaturalKey": "2010/11|ליגת-האלופות|" + HTA + "|בנפיקה|בית B מחזור 5", "seq": 2,
         "minute": 74, "type": "goal", "clubSlug": HTA, "personSlug": "דאגלס-דה-סילבה",
         "confidence": 2, "sourceUrl": SKY_BENFICA, "sourceTitle": "Sky Sports, 24.11.2010"},
        {"matchNaturalKey": "2010/11|ליגת-האלופות|" + HTA + "|בנפיקה|בית B מחזור 5", "seq": 3,
         "minute": 90, "minuteExtra": 2, "type": "goal", "clubSlug": HTA, "personSlug": "ערן-זהבי",
         "confidence": 2, "sourceUrl": SKY_BENFICA, "sourceTitle": "Sky Sports, 24.11.2010"},
    ],
)

# --------------------------------------------------------------- trophies
championships = ["1933/34", "1934/35", "1938/39", "1939/40", "1943/44", "1956/57", "1965/66",
                 "1968/69", "1980/81", "1985/86", "1987/88", "1999/00", "2009/10"]
cups = ["1928", "1934", "1937", "1938", "1939", "1944", "1960/61", "1971/72", "1982/83",
        "1998/99", "1999/00", "2005/06", "2006/07", "2009/10", "2010/11", "2011/12"]

trophies = []
for label in championships:
    trophies.append({"competitionSlug": "ליגת-העל", "seasonLabel": label, "clubSlug": HTA,
                     "result": "won", "sport": "football", "confidence": 2,
                     "sourceUrl": WIKI_HTA, "sourceTitle": "Hapoel Tel Aviv F.C. — Wikipedia (IFA/club count: 13)"})
for label in cups:
    trophies.append({"competitionSlug": "גביע-המדינה", "seasonLabel": label, "clubSlug": HTA,
                     "result": "won", "sport": "football", "confidence": 2,
                     "sourceUrl": WIKI_HTA, "sourceTitle": "Hapoel Tel Aviv F.C. — Wikipedia"})
trophies.append({"competitionSlug": "גביע-הטוטו", "seasonLabel": "2001/02", "clubSlug": HTA,
                 "result": "won", "sport": "football", "confidence": 2,
                 "noteHe": "גביע הטוטו על היחיד של המועדון",
                 "sourceUrl": WIKI_HTA, "sourceTitle": "Wikipedia + worldfootball Toto Cup Al winners"})
trophies.append({"competitionSlug": "גביע-הטוטו", "seasonLabel": "2025/26", "clubSlug": HTA,
                 "result": "runner_up", "sport": "football", "confidence": 2,
                 "noteHe": "הפסד 2:1 לבית\"ר ירושלים בגמר, 28.10.2025",
                 "sourceUrl": KAN_TOTO_2025, "sourceTitle": "כאן חדשות, 28.10.2025"})
trophies.append({"competitionSlug": "גביע-אלופות-אסיה", "seasonLabel": "1967/68", "clubSlug": HTA,
                 "result": "won", "sport": "football", "confidence": 1,
                 "noteHe": "ניצחון 1:2 על סלנגור בגמר בבנגקוק",
                 "sourceUrl": WIKI_ASIAN, "sourceTitle": "1967 Asian Champion Club Tournament — Wikipedia"})

write(
    "trophies.json",
    "13 championships is the IFA/club count; FIFA and UEFA recognise 12, because the "
    "abandoned 1934/35 and 1937/38 seasons are not universally counted — recorded as an "
    "open conflict rather than resolved here. Pre-state cups are named by bare year in the "
    "sources; the canonicaliser renders them YYYY/YY. The research document's claim of a "
    "2025 Toto Cup WIN is wrong and is entered here as the runner-up place it actually was.",
    2,
    research,
    trophies,
)

# ---------------------------------------------------------------- moments
write(
    "moments.json",
    "Story units. Each one is anchored to a verified match, date or event.",
    2,
    research,
    [
        {"slug": "מילאן-2002", "titleHe": "הלילה שבו הפועל ניצחה את מילאן",
         "happenedOn": "2002-03-14", "seasonLabel": "2001/02", "category": "europe",
         "matchNaturalKey": "2001/02|גביע-אופא|" + HTA + "|מילאן|רבע גמר משחק 1",
         "bodyHe": "ברבע גמר גביע אופ\"א, באצטדיון GSP בניקוסיה, סרגיי קלשצ'נקו הבקיע בדקה ה-32 מבישול של יוסי אבוקסיס — 0:1 להפועל תל אביב מול מילאן. במשחק הגומלין בסן סירו ניצחה מילאן 0:2 והעפילה 1:2 במצטבר.",
         "confidence": 2, "sourceUrl": UEFA_MILAN, "sourceTitle": "UEFA report"},
        {"slug": "בנפיקה-2010", "titleHe": "0:3 על בנפיקה בליגת האלופות",
         "happenedOn": "2010-11-24", "seasonLabel": "2010/11", "category": "europe",
         "matchNaturalKey": "2010/11|ליגת-האלופות|" + HTA + "|בנפיקה|בית B מחזור 5",
         "bodyHe": "בבית B של ליגת האלופות, מול שאלקה, ליון ובנפיקה, רשמה הפועל את ניצחונה הראשון בשלב הבתים: 0:3 על בנפיקה בבלומפילד, שערים של ערן זהבי (24, 90+2) ודאגלס דה סילבה (74).",
         "confidence": 2, "sourceUrl": SKY_BENFICA, "sourceTitle": "Sky Sports match report"},
        {"slug": "בלומפילד-נפתח", "titleHe": "בלומפילד נפתח",
         "happenedOn": "1962-10-13", "seasonLabel": "1962/63", "category": "stadium",
         "matchNaturalKey": "1962/63|ליגת-העל|" + HTA + "|שמשון-תל-אביב|משחק הפתיחה של בלומפילד",
         "bodyHe": "האצטדיון נבנה במזרח יפו, על הקרקע שעליה עמד אצטדיון בסה — ביתה של הפועל תל אביב מ-1950. המשחק הראשון נערך ב-13 באוקטובר 1962 מול שמשון תל אביב.",
         "confidence": 2, "sourceUrl": WIKI_BLOOMFIELD, "sourceTitle": "Wikipedia + StadiumDB"},
        {"slug": "היכל-אוסישקין-נהרס", "titleHe": "היכל אוסישקין נהרס",
         "happenedOn": "2007-07-25", "sport": "basketball", "category": "protest",
         "bodyHe": "ב-25 ביולי 2007, ב-06:39 בבוקר, החלה הריסת היכל אוסישקין. עיריית תל אביב החליטה כשנה וחצי קודם לכן שהמתחם אינו מתאים כמרכז ספורט; ראש העיר רון חולדאי אמר שהשטח יהפוך לגן, כחלק מפארק הירקון. האוהדים מחו לאורך יותר משנה וחצי.",
         "confidence": 2, "sourceUrl": YNET_DEMOLITION, "sourceTitle": "ynet, דנה סידי, 25.7.2007"},
        {"slug": "1923-שנת-ההיווסדות", "titleHe": "שנת ההיווסדות שונתה ל-1923",
         "happenedOn": "2015-06-12", "category": "club",
         "bodyHe": "מחקר של ד\"ר אייל גרטמן וכפיר פרנקל קבע שהמועדון נוסד ב-1923 ולא ב-1927 כפי שסברו קודם; בין הראיות כרטיס חבר מספר 2 של אברהם אשני מאוקטובר 1923. בעקבות זאת תוקן הסמל.",
         "confidence": 2, "sourceUrl": SPORT1_1923, "sourceTitle": "ספורט1/מעריב, 12.6.2015 + אתר המועדון"},
    ],
)

# -------------------------------------------------------- kit and sponsor
write(
    "manufacturers.json", "Kit suppliers named in Football Kit Archive.", 2, research,
    [{"slug": s.lower(), "nameHe": h, "nameEn": s} for s, h in [
        ("Umbro", "אמברו"), ("adidas", "אדידס"), ("Diadora", "דיאדורה"), ("Puma", "פומה"),
        ("Nike", "נייקי"), ("Kappa", "קאפה"), ("Macron", "מקרון"),
    ]],
)

supply = [
    ("umbro", "1980/81", "1980/81", False),
    ("adidas", "1982/83", "1988/89", False),
    ("diadora", "1989/90", "1991/92", False),
    ("puma", "1992/93", "1992/93", False),
    ("diadora", "1993/94", "1996/97", False),
    ("nike", "1997/98", "1999/00", False),
    ("diadora", "2000/01", "2002/03", False),
    ("kappa", "2004/05", "2005/06", False),
    ("umbro", "2006/07", "2010/11", False),
    ("kappa", "2011/12", "2013/14", False),
    ("umbro", "2014/15", "2014/15", False),
    ("puma", "2015/16", "2015/16", False),
    ("nike", "2016/17", "2016/17", False),
    ("macron", "2017/18", "2021/22", False),
    ("adidas", "2022/23", "2023/24", False),
    ("nike", "2024/25", None, True),
]
write(
    "kit-supply.json",
    "Supply spells, from Football Kit Archive season entries. Seasons FKA does not cover "
    "(1981/82, 2003/04) are gaps, not claims. Nike appears in three separate spells — that "
    "is the fact the kit game is built on. Pre-1980 kits carry no branded maker in FKA; "
    "'self-produced' is an inference and is deliberately absent.",
    2,
    {"kind": "other", "title": "Football Kit Archive — Hapoel Tel Aviv kit history", "url": FKA},
    [{"clubSlug": HTA, "manufacturerSlug": m, "fromLabel": f, "toLabel": t, "isCurrent": c,
      "sport": "football", "confidence": 2} for m, f, t, c in supply],
)

write(
    "sponsors.json", "Shirt sponsors that a source actually shows on the shirt.", 2, research,
    [
        {"slug": "כתר", "nameHe": "כתר", "nameEn": "Keter Group", "industry": "פלסטיק"},
        {"slug": "ניו-דרייב", "nameHe": "ניו דרייב", "nameEn": "New Drive", "industry": "ליסינג"},
        {"slug": "ארקיע", "nameHe": "ארקיע", "nameEn": "Arkia", "industry": "תעופה"},
        {"slug": "הכשרה", "nameHe": "הכשרה חברה לביטוח", "nameEn": "Hachshara Insurance",
         "industry": "ביטוח"},
        {"slug": "איביאיי", "nameHe": "IBI בית השקעות", "nameEn": "IBI Investment House",
         "industry": "פיננסים"},
    ],
)

write(
    "sponsor-deals.json",
    "Only deals with a source. Everything the research document listed before 2010 — Ata, "
    "Visa, Club Hotel Tiberias, Suzuki, Shikun Ovdim, both Subaru spells — could not be "
    "sourced from any accessible archive and is deliberately absent. Fujitsu likewise.",
    2,
    research,
    [
        {"clubSlug": HTA, "sponsorSlug": "כתר", "fromLabel": "2010/11", "toLabel": "2010/11",
         "sport": "football", "confidence": 2,
         "sourceUrl": "https://www.footballkitarchive.com/hapoel-tel-aviv-2010-11-home-kit-20115/",
         "sourceTitle": "Football Kit Archive — 2010-11 home kit"},
        {"clubSlug": HTA, "sponsorSlug": "ניו-דרייב", "toLabel": "2016/17", "sport": "football",
         "confidence": 1, "noteHe": "החסות שקדמה לארקיע; מועד ההתחלה לא אומת",
         "sourceUrl": ONE_ARKIA, "sourceTitle": "ONE"},
        {"clubSlug": HTA, "sponsorSlug": "ארקיע", "fromLabel": "2017/18", "toLabel": "2019/20",
         "sport": "football", "endedEarly": True, "confidence": 2,
         "noteHe": "חוזה לשלוש עונות עם אופציה; ארקיע פעלה לביטולו אחרי אירועי הדרבי בדצמבר 2019",
         "sourceUrl": ONE_ARKIA_END, "sourceTitle": "ONE"},
        {"clubSlug": HTA, "sponsorSlug": "הכשרה", "fromLabel": "2019/20", "toLabel": "2023/24",
         "sport": "football", "confidence": 2,
         "noteHe": "נכנסה כבר בפלייאוף העליון של 2019/20, לפני ההודעה הרשמית ביוני 2020",
         "sourceUrl": ONE_ARKIA_END, "sourceTitle": "ONE + Ynet, 11.6.2020"},
        {"clubSlug": HTA, "sponsorSlug": "איביאיי", "fromLabel": "2024/25", "sport": "football",
         "confidence": 2,
         "noteHe": "נחתם בספטמבר 2024; הוארך במרץ 2026 לשלוש עונות נוספות מ-2026/27",
         "sourceUrl": IBI_OFFICIAL, "sourceTitle": "אתר המועדון הרשמי, 24.9.2024"},
    ],
)

crests = [
    (1923, 1991, "הסמל המקורי", None),
    (1992, 1997, "כדור במרכז", "כדור נוסף במרכז הסמל המקורי"),
    (1997, 2000, "עיצוב מחדש", "עיצוב מחדש ועדכון צבעים"),
    (2001, 2007, "תקופת כתר", "השם \"כתר\" שולב בשם המועדון ובסמל, בתקופת הבעלות של כתר פלסטיק"),
    (2007, 2008, "עדכון צורה", "שינוי צורני בלבד"),
    (2008, 2015, "צבעי המועדון", "צבעי הסמל הותאמו לצבעי המועדון"),
    (2015, 2022, "בלי כתר", "\"כתר\" הוסר מהסמל; שנת ההיווסדות תוקנה ל-1923"),
    (2022, 2023, "מאה שנה", "כיתוב מיוחד לציון 100 שנה למועדון"),
    (2023, None, "חזרה לקלאסי", "הסמל חזר לצורתו הקלאסית"),
]
write(
    "crest-versions.json",
    "Stages as the club's own history page tells them. Football Kit Archive omits the "
    "2008-2015 stage and the centenary stage — recorded as a conflict, not silently merged. "
    "The May 2023 design that removed the hammer and sickle was made for a US tournament to "
    "gauge reaction and was never an official crest; it is not listed here.",
    2,
    {"kind": "official", "title": "הפועל תל אביב — היסטוריה והישגים", "url": OFFICIAL_HISTORY},
    [{"clubSlug": HTA, "fromYear": f, "toYear": t, "nameHe": n, "changeHe": c, "confidence": 2}
     for f, t, n, c in crests],
)

# ------------------------------------------------------------ fan culture
write(
    "fan-groups.json", "Supporter organisations with a sourced founding.", 2, research,
    [{"slug": "אולטראס-הפועל", "nameHe": "אולטראס הפועל", "formerNameHe": "היצורים",
      "foundedYear": 1999, "standHe": "שער 5", "clubSlug": HTA, "sport": "football",
      "noteHe": "התארגנה ב-1999 תחת השם \"היצורים\"; ביתה ביציע שער 5 בבלומפילד",
      "confidence": 2, "sourceUrl": ULTRAS,
      "sourceTitle": "אתר אולטראס הפועל + schwatzgelb.de interview (Gate 5)"}],
)

write(
    "songs.json",
    "EMPTY BY DESIGN. The research document lists melodies and seasons for several chants "
    "(Suavemente, Enola Gay, Fito Paez, Aviv Geffen, Attaque 77). None could be verified "
    "against a citable source this pass, and an unverified melody attribution is exactly the "
    "kind of fact that would embarrass the game. Fill from the Red Fans song archive once "
    "access is granted, or from Maor with confidence 3.",
    1,
    {"kind": "manual", "title": "Song archive — pending verification", "url": None},
    [],
)

write(
    "quotes.json", "Quotes reproduced from the reporting that carries them.", 2, research,
    [{"textHe": "אין לי יותר כוח להמשיך ולתרום",
      "personSlug": "מאור-הראל", "personNameHe": "מאור הראל", "saidOn": "2012-10-17",
      "contextHe": "בהודעת ההתפטרות מהנהלת עמותת הפועל אוסישקין, אחרי כחמש וחצי שנים",
      "confidence": 1, "sourceUrl": YNET_RESIGN, "sourceTitle": "ynet, יעל שחרור, 17.10.2012"}],
)

# --------------------------------------------------------- fan ownership
write(
    "associations.json", "The supporter-owned association behind the basketball club.", 2, research,
    [{"slug": "הפועל-אוסישקין", "nameHe": "הפועל אוסישקין תל אביב (ע\"ר)",
      "registryId": "580482040", "foundedYear": 2007, "clubSlug": HTA_BC, "sport": "basketball",
      "purposeHe": "הקמת מועדון כדורסל בניהול אוהדים, ואכסניה חלופית להיכל אוסישקין",
      "confidence": 2, "sourceUrl": "https://www.guidestar.org.il/he/organization/580482040",
      "sourceTitle": "GuideStar + ynet, 7.9.2007"}],
)

write(
    "association-events.json",
    "The fan-ownership story as documented. Dates are marked confirmed only where a source "
    "gives the day. The research document's 25 June 2007 registration date, the fifth game of "
    "14 November 2007, the 2008 election vote counts, the separate 413/10/18 association vote "
    "and the 2015 founders' ceremony could NOT be sourced and are absent.",
    2,
    research,
    [
        {"associationSlug": "הפועל-אוסישקין", "kind": "founding", "happenedOn": None,
         "dateConfirmed": False, "titleHe": "הקמת הפועל אוסישקין ורישומה לליגה ב'",
         "bodyHe": "העמותה הוקמה ב-2007 בידי קבוצת אוהדים, אחרי הריסת היכל אוסישקין. מאור הראל היה הראשון לרשום את הקבוצה במשרד הליגה עם הקמת העמותה.",
         "confidence": 2, "sourceUrl": YNET_2012, "sourceTitle": "ynet, 14.10.2012 + Wikipedia"},
        {"associationSlug": "הפועל-אוסישקין", "kind": "promotion", "happenedOn": None,
         "dateConfirmed": False, "titleHe": "עונה ראשונה: 0-22 ועלייה לליגה א'",
         "bodyHe": "בעונת 2007/08 סיימה הקבוצה 0-22 בליגה ב', זכתה בגביע איגוד הליגות ועלתה לליגה א'. המאמן היה אורי שלף, ממייסדי העמותה ועורך דינה.",
         "confidence": 2, "sourceUrl": "https://www.one.co.il/Article/136776.html",
         "sourceTitle": "ONE + Walla"},
        {"associationSlug": "הפועל-אוסישקין", "kind": "promotion", "happenedOn": None,
         "dateConfirmed": False, "titleHe": "עונה שנייה ללא הפסד ועלייה לליגה ארצית",
         "bodyHe": "עונה שנייה ברציפות ללא הפסד בליגה — 0-44 בשתי העונות הראשונות יחד — זכייה נוספת בגביע איגוד הליגות ועלייה לליגה ארצית.",
         "confidence": 2, "sourceUrl": WALLA_SHALEF, "sourceTitle": "Walla, 2.4.2015 + ONE"},
        {"associationSlug": "הפועל-אוסישקין", "kind": "vote", "happenedOn": "2010-07-23",
         "dateConfirmed": True, "titleHe": "ההצבעה על שם הקבוצה",
         "bodyHe": "מתוך 439 חברי עמותה שהצביעו: 315 בעד \"הפועל תל אביב\" ו-124 בעד \"הפועל אוסישקין תל אביב\". השם שונה באותו ערב. העמותה עצמה נותרה רשומה בשם הפועל אוסישקין תל אביב.",
         "votesFor": 315, "votesAgainst": 124, "turnout": 439, "confidence": 2,
         "sourceUrl": WALLA_NAME, "sourceTitle": "Walla, 23.7.2010"},
        {"associationSlug": "הפועל-אוסישקין", "kind": "resignation", "happenedOn": "2012-10-17",
         "dateConfirmed": True, "titleHe": "מאור הראל מתפטר מההנהלה",
         "bodyHe": "אחרי כחמש וחצי שנים בהנהלה — מאז הקמת העמותה — הודיע מאור הראל על התפטרותו.",
         "confidence": 2, "sourceUrl": YNET_RESIGN, "sourceTitle": "ynet, 17.10.2012"},
        {"associationSlug": "הפועל-אוסישקין", "kind": "election", "happenedOn": "2013-02-02",
         "dateConfirmed": True, "titleHe": "ארז זייצ'יק נבחר למקום שהתפנה",
         "bodyHe": "ארז זייצ'יק, שחקן לשעבר ומנהל השיווק של המועדון, נבחר ביותר מ-80% מהקולות למקום שהתפנה בהנהלה.",
         "confidence": 1, "sourceUrl": YNET_2013, "sourceTitle": "ynet, 2.2.2013"},
    ],
)

write(
    "association-roles.json",
    "Roles as contemporary reporting records them. The ordering of the 2008 election results "
    "and the audit-committee names could not be sourced and are absent.",
    2,
    research,
    [
        {"associationSlug": "הפועל-אוסישקין", "personSlug": "מאור-הראל", "personNameHe": "מאור הראל",
         "roleHe": "מייסד", "fromDate": "2007-01-01", "confidence": 2,
         "sourceUrl": YNET_2012, "sourceTitle": "ynet, 14.10.2012 — \"הראשון שרשם את הקבוצה\""},
        {"associationSlug": "הפועל-אוסישקין", "personSlug": "מאור-הראל", "personNameHe": "מאור הראל",
         "roleHe": "חבר הנהלה", "fromDate": "2007-01-01", "toDate": "2012-10-17",
         "endReasonHe": "התפטרות", "replacedByNameHe": "ארז זייצ'יק", "confidence": 2,
         "sourceUrl": YNET_RESIGN, "sourceTitle": "ynet, 17.10.2012"},
        {"associationSlug": "הפועל-אוסישקין", "personSlug": "נועה-סקלי", "personNameHe": "נועה סקלי",
         "roleHe": "יו\"ר ראשונה", "confidence": 1, "sourceUrl": YNET_2012, "sourceTitle": "ynet"},
        {"associationSlug": "הפועל-אוסישקין", "personSlug": "יונתן-לרנר", "personNameHe": "יונתן לרנר",
         "roleHe": "חבר הנהלה", "confidence": 1, "sourceUrl": YNET_2012, "sourceTitle": "ynet"},
        {"associationSlug": "הפועל-אוסישקין", "personSlug": "רמי-כהן", "personNameHe": "רמי כהן",
         "roleHe": "חבר הנהלה", "confidence": 1, "sourceUrl": YNET_2012, "sourceTitle": "ynet"},
        {"associationSlug": "הפועל-אוסישקין", "personSlug": "גבי-כץ", "personNameHe": "גבי כץ",
         "roleHe": "חבר הנהלה", "confidence": 1, "sourceUrl": YNET_2012, "sourceTitle": "ynet"},
        {"associationSlug": "הפועל-אוסישקין", "personSlug": "אורי-שלף", "personNameHe": "אורי שלף",
         "roleHe": "מייסד, עורך דין העמותה ומאמן", "fromDate": "2007-01-01", "confidence": 2,
         "sourceUrl": WALLA_SHALEF, "sourceTitle": "Walla, 2.4.2015"},
        {"associationSlug": "הפועל-אוסישקין", "personSlug": "ארז-זייציק", "personNameHe": "ארז זייצ'יק",
         "roleHe": "חבר הנהלה", "fromDate": "2013-02-02", "votes": None, "confidence": 1,
         "sourceUrl": YNET_2013, "sourceTitle": "ynet, 2.2.2013"},
    ],
)

write(
    "membership-milestones.json",
    "Arik Einstein as member #1,000 is attested by a founder in a Sport5 interview. The "
    "research document's January 2010 date is NOT sourced — and Walla reported Einstein "
    "joining in August 2007 — so the date is left unconfirmed rather than picked.",
    1,
    research,
    [{"associationSlug": "הפועל-אוסישקין", "number": 1000, "personNameHe": "אריק איינשטיין",
      "personSlug": "אריק-איינשטיין", "happenedOn": None, "dateConfirmed": False,
      "contextHe": "יונתן לרנר, ממייסדי העמותה, בריאיון לערוץ הספורט: איינשטיין היה החבר ה-1,000 בעמותה",
      "confidence": 1, "sourceUrl": SPORT5_EINSTEIN, "sourceTitle": "ערוץ הספורט, 27.11.2013"}],
)

write(
    "fact-conflicts.json",
    "Sources disagree. Recorded and displayed, never resolved by quietly picking one.",
    2,
    research,
    [
        {"entityTable": "trophy", "entityKey": "ליגת-העל", "field": "championship_count",
         "claimA": "13 — ההתאחדות והמועדון", "claimB": "12 — פיפ\"א ואופ\"א, שאינן מכירות בעונות 1934/35 ו-1937/38 שננטשו",
         "sourceAUrl": WIKI_HTA, "sourceBUrl": WIKI_CHAMPIONS,
         "noteHe": "worldfootball.net מונה 14 ומוסיף 1936 ו-1943 — עוד גרסה שלישית"},
        {"entityTable": "match", "entityKey": "1962/63 בלומפילד — שמשון", "field": "score",
         "claimA": "1:1", "claimB": "0:0",
         "sourceAUrl": WIKI_BLOOMFIELD, "sourceBUrl": "https://golden-lotus.co.il/bloomfield/",
         "noteHe": "ויקיפדיה ו-StadiumDB אומרים 1:1; golden-lotus אומר 0:0"},
        {"entityTable": "venue", "entityKey": "בלומפילד", "field": "opening_match_date",
         "claimA": "13.12.1962", "claimB": "12.12.1962",
         "sourceAUrl": WIKI_BLOOMFIELD, "sourceBUrl": "https://www.stadiumguide.com/bloomfield-stadium/",
         "noteHe": "משחק החנוכה הרשמי מול SC Enschede, 1:1 — התאריך במחלוקת"},
        {"entityTable": "crest_version", "entityKey": HTA, "field": "stages",
         "claimA": "אתר המועדון: תשעה שלבים, כולל 2008-2015 וכיתוב המאה",
         "claimB": "Football Kit Archive: מדלג על 2008-2015 ועל שלב המאה",
         "sourceAUrl": OFFICIAL_HISTORY, "sourceBUrl": FKA_LOGOS,
         "noteHe": "אתר המועדון עדיף כמקור ראשוני; הפער נשמר"},
        {"entityTable": "membership_milestone", "entityKey": "1000", "field": "date",
         "claimA": "ינואר 2010 (מסמך המחקר, ללא מקור)",
         "claimB": "ואלה דיווחה על הצטרפות איינשטיין לעמותה ב-13.8.2007",
         "sourceAUrl": None, "sourceBUrl": "https://sports.walla.co.il/item/1153094",
         "noteHe": "לא הוכרע; ייתכן שמדובר בשתי פעולות שונות"},
        {"entityTable": "association_event", "entityKey": "name_change", "field": "date",
         "claimA": "24.7.2010 (מסמך המחקר)", "claimB": "23.7.2010 (ואלה, מהערב עצמו)",
         "sourceAUrl": None, "sourceBUrl": WALLA_NAME,
         "noteHe": "נבחר 23.7.2010 — דיווח בן־זמן מאותו ערב"},
    ],
)

# ------------------------------------------------------------------ eras
write(
    "eras.json",
    "PROPOSED product taxonomy for navigation and progression — not a historical claim. "
    "Names and boundaries await Maor's answers to docs/02-data-questions.md section 1. "
    "Loaded at confidence 0 so nothing here can reach question generation.",
    0,
    {"kind": "manual", "title": "Proposed era taxonomy (awaiting confirmation)", "url": None},
    [
        {"slug": "era-1", "nameHe": "תקופה 1", "startYear": 1923, "endYear": 1955, "sortOrder": 1},
        {"slug": "era-2", "nameHe": "תקופה 2", "startYear": 1956, "endYear": 1969, "sortOrder": 2},
        {"slug": "era-3", "nameHe": "תקופה 3", "startYear": 1970, "endYear": 1998, "sortOrder": 3},
        {"slug": "era-4", "nameHe": "תקופה 4", "startYear": 1999, "endYear": 2003, "sortOrder": 4},
        {"slug": "era-5", "nameHe": "תקופה 5", "startYear": 2004, "endYear": 2012, "sortOrder": 5},
        {"slug": "era-6", "nameHe": "תקופה 6", "startYear": 2013, "endYear": None, "sortOrder": 6},
    ],
)

write(
    "squads.json",
    "EMPTY BY DESIGN. Per-season squads and shirt numbers need the Red Fans squad "
    "categories, which are still behind bot protection. Fill from Maor with confidence 3, "
    "or from the wiki once access is granted.",
    1,
    {"kind": "manual", "title": "Squad data — pending", "url": None},
    [],
)

print(f"wrote {len(list(OUT.glob('*.json')))} files to {OUT}")
