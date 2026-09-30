# THE WORKER LIFE — FULL DYNAMIC SCREENPLAY / PRODUCTION BIBLE
## תסריט מלא למשחק · Narrative + Quest Design + Game Flow + Technical Direction
### מהדורת הפקה · 27.09.2026 · **מהדורה 2 — מושלמת ומאומתת**

> **מה נוסף במהדורה 2** (27.9.2026, אחרי השוואה מלאה מול הקוד והארכיון)
>
> 1. **§7 אומת שורה-שורה** מול `content/manual/*` ומול מקורות חיצוניים. שלוש טעויות תוקנו:
>    - "2.1.2015, טקס עם כ־2,000 אוהדים" אינו מאומת. **העירייה חנכה את האולם ב־24.12.2014, ונציגי הפועל לא היו שם. משחק הבית הראשון היה ב־4.1.2015: 81:67 על הפועל ירושלים.**
>    - "העמותה הצביעה ברוב גדול בעד המעבר" אינו מאומת. מה שכן מאומת: ב־10.12.2024 כ־400 מנויי אולטראס לא העבירו את המנוי למנורה; בוררות נקבעה ל־18.12.2024; המשחק הראשון במנורה היה ב־11.1.2025.
>    - בינאי 2023 חסר צד שלישי: **51% ינאי · 30% אבי זיידנברג · 19% העמותה.**
>
>    נוספו עוגנים שהיו חסרים: הקפאת ההליכים (12.12.2016), הירידה של 2017 והעלייה של 2018, שער 92 של זהבי, ספרא ב־12.7.2024 וב־15.8.2024, והארכה ב־7.5.2026.
> 2. **§7A — מפת פרקים.** כל סעיף כאן מקבל את מזהה הפרק בקוד ואת הסטטוס שלו. 62 פרקים ב־`CHAPTERS` ועוד פרולוג 1983.
> 3. **חמישה פרקים שכבר בנויים בקוד ולא הופיעו בתנ"ך** נכתבו לתוכו: `2012-terrace`, `2021-suitcase`, `2023-visit`, `2024-terrace`, `2024-lina`.
> 4. **שבעת הפרקים ה"חדשים" (§24) נכתבו עד רמת סצנה**, לפי ההגדרה של §28. הם לא נכתבו כשבעה פרקים נפרדים:
>    - **פרק ראשי חדש אחד:** `2024-home`.
>    - **חמש הרחבות** לפרקים קיימים: `2015-newhall`, `2023-tournament`, `2023-quiet`, `2025-eurocup` ו־`2026-plan`.
>
>    הנימוק כתוב ב־§24.
> 5. **אנשים אמיתיים (עופר ינאי, אדמונד ספרא) לא מדברים במשחק.** הדיאלוג שיוחס לינאי ב־§12 הוסר. במקומו מדברת דמות בדיונית, **"נציג הבעלים"**. הכלל כתוב ב־§29.
> 6. **§21 יושר מול הקוד.** מוסכמות הדגלים שהתנ"ך הציע (`life:q:*`) נכתבו מחדש לפי מה שהמנוע כבר כותב. ההתאמה כתובה ב־§21.
> 7. **§23 הוא רישום אמיתי:** כרטיס Story Brief לכל Major Quest, עם מזהה פרק.
> 8. **§31–§33 חדשים:** מטריצת חוטים (callbacks) לאורך 43 שנה, רשימת החלטות פתוחות למאור, ומקורות.

> **מטרת המסמך**  
> זהו מסמך עבודה לבמאי, מפיק, Narrative Designer, Game Designer ומתכנת.  
> הוא לוקח את הקוד הקיים, התסריט המאוחד, מסלולי החיים, מערכות ה־Director, המפה, ה־callbacks, הכסף, היחסים, העבודה, המשפחה, ה־Wardrobe, ה־HistoricalCutscenes, ה־mini-games, ה־Red Box, ה־Supergoal, ה־Performed Missions וכל המערכות שכבר קיימות — ומרכיב מהם משחק חיים אחד.
>
> **הכלל המרכזי:**  
> ההיסטוריה האמיתית אינה משתנה.  
> הדרך של פוגי להגיע אליה, מי איתו, מה הוא מקריב, מה הוא מרוויח, מה הוא מפספס, ומה העולם זוכר — משתנים.

---

# 0. למה המשחק צריך להרגיש

THE WORKER אינו:
- ארכיון עם דיאלוגים;
- מצגת של אירועים;
- רצף “לך למקום / דבר עם אדם”;
- טריוויה מחופשת למשחק.

THE WORKER צריך להרגיש כמו:

**חיים של אוהד בתוך היסטוריה אמיתית.**

השחקן צריך כל הזמן לחוות:
- דאגה;
- לחץ זמן;
- רצון להספיק;
- כסף שלא מספיק;
- אנשים שמחכים;
- חברים שדוחפים לכיוון אחר;
- אבא שמופיע בזמן הנכון או בזמן הלא נכון;
- הבטחות שחוזרות;
- חפצים מהעבר;
- מקומות שנפתחים ונעלמים;
- רגעים אמיתיים שלא מחכים לו.

המשחק לא שואל:
> “אתה יודע מה קרה?”

אלא:
> “איפה היית כשזה קרה, ומה שילמת כדי להיות שם?”

---

# 1. שפת ה־Quest

כל Major Quest בנוי כך:

## 1.1 TRIGGER
מי מתחיל את היום.

לא תמיד פוגי.

דוגמאות:
- רחל קוראת מהמטבח.
- אפי עוצר עם הכדור.
- אולי מתקשר.
- קובי מגיע לקיוסק.
- חבר שולח הודעה.
- העבודה מתקשרת.
- הילד שואל.
- החדשות קופצות.

## 1.2 NEED
מה פוגי חושב שהוא רוצה.

## 1.3 COLLISION
מה עוד רוצה אותו באותו זמן.

## 1.4 APPROACHES
לפחות 2–4 דרכים משמעותיות.

## 1.5 COMPLICATION
משהו משתנה:
- מאחרים;
- הכסף יורד;
- אדם נעלב;
- מישהו נעלם;
- מקור מידע סותר מקור אחר;
- רכב מתמלא;
- המשמרת מתארכת;
- הילד חולה;
- הכרטיס לא אצל מי שחשבנו.

## 1.6 CONVERGENCE
הרגע ההיסטורי/הדרמטי שאליו מגיעים כולם.

## 1.7 AFTERMATH
המשחק זוכר.

לפחות אחד:
`TIME / MONEY / PERSON / PROMISE / MEMORY / ROUTE / PRESENCE / KNOWLEDGE / REPUTATION / RELATIONSHIP / WORK / FAMILY`

---

# 2. כלים קיימים — אין להמציא מערכות מיותרות

המשחק כבר מחזיק כמעט כל מה שנחוץ:

- `StoryDirector`
- `opportunityResolver`
- `Beat`
- `Conversation`
- `actorCue`
- `remember`
- `missReason`
- relationship axes
- Red Heart
- money / savings / income
- work/career
- promises
- route proofs
- performed missions
- map / reveal / lifecycle
- Wardrobe / Match Ritual
- shirt history
- Supergoal / sticker album
- HistoricalCutscene
- Red Box
- callbacks
- Free Time
- craft / confetti / banners
- football mini-game
- basketball / hoops
- penalty / moment puzzle
- Gate mechanics
- archive facts / anchors
- presence
- achievements

העבודה היא לחבר.

---

# 3. דרגות משימה

## MAJOR QUEST
3–5 approaches, conflict, cost, callback ארוך, route impact.

## DYNAMIC QUEST
2–3 approaches, local consequence, לפחות memory/callback אחד.

## STORY BEAT
קצר, אבל לא פסיבי: reaction, object, person, promise או emotional decision.

---

# 4. מערכת Story Brief — “פוסטר חי” לפני משימה

כל משימה גדולה מקבלת 2.5–4 שניות, בלי artwork חדש.

### משתמשים במה שכבר יש:
- background;
- cutout;
- map pin;
- shirt;
- ticket;
- newspaper;
- phone;
- Supergoal;
- red line;
- grain;
- existing typography.

### מבנה
1. שנה / מקום.
2. שורת רגש או הומור.
3. הדמות/האובייקט שמניעים את הסצנה.
4. objective.
5. reveal במפה.

### tone
`warm / dry / funny / tense / loss / memory / crisis`

לא כל דבר מצחיק.  
באוסישקין 2007, במשבר 2016, באובדנים וב־2026 — לא “מכניסים בדיחה כי צריך”.

---

# 5. דמויות — תפקיד דרמטי

## קובי
לא NPC של “אבא”.
הוא השעון האנושי של הילדות:
- כרטיסים;
- דרך;
- גב;
- “נו, הולכים”;
- הפתעות קטנות;
- later: מי שזקוק לפוגי.

## רחל
היא “החיים מחוץ להפועל”.
- לחם;
- כסף בבית;
- דאגה;
- ציפיות;
- later: household mirror.

## אפי
הוא “הבית השני”.
- אוסישקין;
- אנשים;
- מפתחות;
- פרקט;
- עבודה בלי תהילה.

## אופיר / עמית
הם “החיים של החבר’ה”.
- כדור;
- שטויות;
- נסיעות;
- excuses;
- adulthood callbacks.

## קרן / מלאני / דור
לא “בחירת רומנטיקה”.
לכל אחת/אחד:
- schedule;
- גבולות;
- רצונות;
- יכולת לסרב לפוגי;
- זיכרון של promises.

## אולי
מנוע תנועה.
- טרמפ;
- טדי;
- החלטות מהירות.

## יונתן
מורכבות זהות:
- חבר;
- מוזיקה;
- מכבי;
- עולם מחוץ לבועה;
- conflict without cartoon rivalry.

---

# 6. מערכות יחסים

לא למדוד רק bond.

לשמור אירועים:
- `showed_up`
- `left_early`
- `kept_promise`
- `broke_promise`
- `came_back`
- `asked_for_help`
- `helped_me`
- `declined_me`
- `remembered`
- `called_first`

ה־bond אומר כמה קרובים.
ה־memory אומר **למה**.

---

# 7. עוגנים היסטוריים — קנון הפקה (מאומת, 27.9.2026)

**כלל העבודה:** מה שמודפס במשחק כעובדה חייב שורה בארכיון (`content/manual/*`) ב־`confidence ≥ 2`, או שני מקורות בלתי־תלויים (כלל 77).
מה שלא עומד בזה נשאר אווירה, בלי מספר ובלי תאריך, או שהוא נכנס לתור המחקר.

עמודת ה"מצב":
- ✅ **מאומת** — יש שורה בארכיון או שני מקורות, ואפשר להדפיס.
- ⚠️ **חלקי** — חלק מהטענה מאומת וחלק לא. מדפיסים רק את החלק המאומת.
- ❌ **לא מאומת** — אסור להדפיס כעובדה.

| # | תאריך | עוגן | מצב | מקור / שורה | עוגן בקוד |
|---|---|---|---|---|---|
| 1 | 1.6.1983 | גמר גביע המדינה: הפועל ת"א 3:2 מכבי ת"א | ✅ | `matches.json` (ynet) | פרולוג |
| 2 | 24.5.1986 | 1:0 על מכבי חיפה בבלומפילד, לנדאו בדקה 86, האליפות העשירית | ✅ | `matches.json` · `goals.json` · `trophies.json` | `1986` |
| 3 | 19.5.1999 | גמר הגביע מול בית"ר, 1:1 ברמת גן, זכייה בפנדלים | ✅ תוצאה · ⚠️ יחס הפנדלים לא בשורה | `matches.json` · `trophies.json` 1998/99 | `1999-cup` |
| 4 | 13.5.2000 | בני יהודה 1:1 הפועל בשכונת התקווה, האליפות הוכרעה | ✅ | `matches.json` (Wikipedia) | `2000-title` |
| 5 | 17.5.2000 | גמר הגביע מול בית"ר, 2:2 ברמת גן, 4:2 בפנדלים — דאבל | ✅ · ⚠️ | `matches.json`; יחס הפנדלים רק ב־Wikipedia (`fact-conflicts.json` — סתירת כתיב יריבה פתוחה, לא סתירת תוצאה) | `2000-double` |
| 6 | 2001/02 | גביע אופ"א עד רבע הגמר: צ'לסי, לוקומוטיב, פארמה, מילאן | ✅ | `matches.json` (UEFA) | `2002-europe` |
| 7 | 25.6.2007 | רישום הפועל אוסישקין לליגה ב' | ✅ | `association-events.json` (אתר המועדון + ONE 2012) | `2007-registered` |
| 8 | 25.7.2007, 6:39 | תחילת הריסת אולם אוסישקין | ✅ | `ussishkin.json` (הארץ, ynet 25.7.2007) | `2007-registered` |
| 9 | 2007/08–2008/09 | שתי עונות בלי הפסד, 44 ניצחונות, עלייה לליגה ארצית | ✅ (בלי ערב) | `association-events.json` | `2009-up` |
| 10 | 15.5.2010 | בית"ר 1:2 הפועל בטדי, **זהבי בדקה 92**, אליפות ודאבל | ✅ | `matches.json` · `goals.json` | `2010-teddy` |
| 11 | 23.7.2010 | הצבעת השם: 315 בעד "הפועל תל אביב", 124 בעד "הפועל אוסישקין תל אביב" | ✅ | `association-events.json` | חוט ל־`2010-friends`/`2011-people` |
| 12 | 2010/11 | ליגת האלופות: זלצבורג, בנפיקה, ליון, שאלקה. **24.11.2010 — 3:0 על בנפיקה** | ✅ | `matches.json` | `2010-qualify`, `2010-anthem` |
| 13 | 24.12.2014 | העירייה חונכת את הדרייב אין (3,400 מקומות), בלי נציגי הפועל | ✅ | ישראל היום, וואלה (24.12.2014) | `2015-newhall` (רקע) |
| 14 | 4.1.2015 | משחק הבית הראשון בדרייב אין: 81:67 על הפועל ירושלים | ✅ | וואלה 5.1.2015; ynet 22.11.2014 (התאריך מראש) | `2015-newhall` |
| — | 2.1.2015 | "טקס עם כ־2,000 אוהדים ומשחק ותיקים" | ❌ | לא נמצא מקור. ynet 11/2014 מזכיר רק "אירוע פתיחה מרשים לפני משחק הבכורה" | אסור להדפיס |
| 15 | 12.6.2015 | שנת הייסוד שונתה ל־1923 | ✅ | `moments.json` | חוט אפשרי ל־`2015-newhall` |
| 16 | 12.12.2016 | צו הקפאת הליכים לחברה של מועדון הכדורגל; חוב של כ־100 מיליון ₪ | ✅ | `moments.json` (גלובס) | `2016-crisis` |
| 17 | 10.1.2017 | הפחתה של תשע נקודות | ✅ | `moments.json` (וואלה + RSSSF) | `2017-after` |
| 18 | 2016/17 | ירידה לליגה הלאומית | ✅ (בלי ערב) | `moments.json` | `2017-after`, `2017-distance` |
| 19 | 2017/18 | אלופת הלאומית ועלייה | ✅ (בלי ערב) | `moments.json` (RSSSF) | `2018-return` |
| 20 | 19.7.2023 | כדורסל: עופר ינאי 51%, אבי זיידנברג 30%, העמותה 19%. השקעה של כ־30 מיליון ₪ בחתימה. העמותה שומרת נציגות בדירקטוריון, מחלקת נוער ונשים, פעילות קהילה | ✅ | הארץ, ערוץ הספורט, ישראל היום (19.7.2023) | `2023-tournament` Z03b |
| — | אוגוסט 2023 | אספת חברים והצבעה דיגיטלית על העסקה | ⚠️ **התוצאה לא אומתה** | ישראל היום 19.7.2023 מודיע רק על האספה | המשחק מראה את האספה, לא מספרים |
| 21 | 11.5.2024 | הפועל 0:2 מ.ס. אשדוד, והקבוצה יורדת לליגה הלאומית (פעם שלישית בתולדותיה) | ✅ | `matches.json` (ויקיפועל) + הארץ, וואלה, ONE, N12 מ־11.5.2024 | `2023-quiet` Z05 — **העוגן `2024-relegation` יכול לקבל ערב** |
| — | 11.5.2024 | "26 אלף בקהל" | ❌ | לא נמצא מקור | אווירה בלי מספר |
| 22 | 12.7.2024 | המועדון מודיע: סוכמה רכישה בידי אדמונד ספרא | ✅ | הארץ, וואלה (12.7.2024) | `2024-home` חלק א' |
| 23 | 15.8.2024 | ועדת העברת הזכויות בהתאחדות מאשרת את ההעברה לספרא | ✅ | וואלה, ספורט1 (15.8.2024) | `2024-home` חלק א' |
| 24 | 9.10.2024 | העמותה תצביע על מעבר זמני ליד אליהו, בכפוף לשני תנאים: מכרז השיפוץ, והסדרת מחלוקת הזכויות מול הבעלים | ✅ | וואלה, ספורט1 (9.10.2024) | `2024-home` חלק ב' |
| 25 | 10.12.2024 | כ־400 מנויי אולטראס לא העבירו מנוי למנורה, והארגון קרא להנהלה "לבטל מיד". הבעלים חולק על זכות הווטו | ✅ | ynet 10.12.2024 | `2024-home` חלק ב' |
| 26 | 18–20.12.2024 | הבורר מחייב ערבות של 25 מיליון ₪ לשיפוץ היכל שלמה; זכות הווטו של העמותה על משחקים במנורה חלה רק מהעונה הבאה | ✅ | וואלה 20.12.2024 | `2024-home` חלק ב' |
| 27 | 11.1.2025 | משחק הבית הראשון בהיכל מנורה: מול הפועל ירושלים, קופות סגורות | ✅ | ynet 10.1.2025 | `2024-home` חלק ב' (הסוף) |
| — | נוב' 2024 | "מחאה עם שקט, כסף וסושי" | ❌ | לא נמצא מקור | אסור כפרט; מותר מחאה כללית במילים של המשחק |
| — | ינו' 2025 | "קריאה רשמית של האולטראס לחרם על יד אליהו" | ⚠️ | יש מקור רק לאי־העברת המנויים ולקריאה לבטל את המעבר | מדפיסים את מה שמאומת |
| 28 | 11.4.2025 | גמר היורוקאפ, משחק 2: גראן קנאריה 94:103 הפועל, 2:0 בסדרה | ✅ | `basketball-matches.json` (EuroCup + ynet) | `2025-eurocup` Z06 |
| 29 | 2024/25 | אלופת הלאומית ועלייה (עם הפועל פ"ת) | ✅ (בלי ערב) | `moments.json` (RSSSF); שורות המחזורים ב־`matches.json` | `2025-eurocup` Z07 · `2026-plan` |
| 30 | 7.5.2026 | רבע גמר היורוליג, משחק 4, בוטבגרד (בולגריה): הפועל 81:87 ריאל מדריד **בהארכה**. ריאל עולה 3:1 לפיינל פור | ✅ | `basketball-matches.json` (Eurohoops + מקור שני); realmadrid.com; Wikipedia 2026 EuroLeague Playoffs | `2026-finale` |
| 31 | 28.8.2026 | ינאי מוכר 20% ויורד ל־40%. רנן, מלכה והווארד מחזיקים 20% כל אחד | ✅ · מחוץ לטווח העלילה | וואלה, הארץ (28.8.2026). **האחוזים הם של חברת הבעלות; חלק העמותה לא נאמר במקור** | לא נכנס למשחק — העלילה נגמרת ב־7.5.2026 |

**שלוש הערות שמחייבות את הכותבים:**
- **7.5.2026 הסתיים בהפסד בהארכה.** §12 מבטיח שהסוף האישי אינו תלוי בתוצאה, וזה נשאר נכון. אבל הסצנה לא רשאית להסתיר את ההפסד או לרמוז על ניצחון. קובי ופוגי יוצאים מאולם שהפסיד בהארכה. זה לא חוסר מזל של הסוף — זה מה שהופך את "היום אתה אחריי" לאמיתי.
- **הירידה של 2024 קיבלה ערב.** `moments.json` אומר "הארכיון אינו נוקב בערב", אבל השורה של 11.5.2024 כבר ב־`matches.json`, ושלושה מקורות קובעים שבו נחתמה הירידה.
  - לפי כלל 49 זו החלטה של סוכן DATA: לקשור את `ירידה-2024` ל־`matchNaturalKey`. אחרי הקישור `2023-quiet` מקבל ערב.
  - עד אז Z05 נכתב בלי ציון.
- **ספרא וינאי אינם דמויות.** הם שמות בחדשות, בעיתון, בטלפון ובלוח ההודעות. הם לא מדברים (§29).

---

# 7A. מפת הפרקים — מהתנ"ך לקוד

כל שורה היא פרק ב־`lib/life/content/chapters.ts` (`CHAPTERS`), לפי סדר ההופעה.

**מקרא — הדרגה (§3):**
- **M** — Major Quest
- **D** — Dynamic Quest
- **B** — Story Beat

**מקרא — הסטטוס:**
- **בנוי** — יש תוכן, ביטים ושיחות, וה־QA עובר.
- **להרחיב** — הפרק קיים, ומהדורה 2 מוסיפה לו חלק.
- **חדש** — עוד אין קוד.

**חלון** הוא פרק שנפתח רק מתוך החיים (כלל 87), לפי `when`.

| סעיף בתנ"ך | מזהה בקוד | מתי | חלון (`when`) | דרגה | סטטוס |
|---|---|---|---|---|---|
| A1 | פרולוג (`PrologueScene`) | 1.6.1983 | — | B | בנוי |
| A2 | `a2-alley` | אביב 1984 | — | D | בנוי |
| A3 | `a3-hall` | סתיו 1984 | — | D | בנוי |
| A4 | `a4-shirt` | ספטמבר 1985 | — | M | בנוי (דלתא 93: המתנה) |
| A5 | `a5-first` | 28.9.1985 | — | D | בנוי |
| A6 | `a6-radio` | חורף 1985/86 | — | B | בנוי |
| A7 | `a7-week` | 17.5.1986 | — | D | בנוי |
| A8 | `1986` | 24.5.1986 | — | M | בנוי |
| B1 | `1990` | 12.5.1990 | — | M | בנוי |
| B2 | `1991` | 11.3.1991 | — | M | בנוי |
| B3 | `1993-cup` | 19.4.1993 | — | D | בנוי |
| B4 | `1993-galil` | 9–19.5.1993 | — | D | בנוי |
| B5 | `1995-sinai` | 1994–1995 | — | D | בנוי |
| B6 | `1996-army` | 1996 – אביב 1997 | — | M | בנוי |
| B7 | `1997-basket` | 1996/97–1997/98 | — | D | בנוי |
| B8 | `1998-laces` | 2.5.1998 | — | D | בנוי |
| B9 | `1999-basket` | 1998/99 | — | D | בנוי |
| B10 | `1999-cup` | 19.5.1999 | — | M | בנוי |
| B11a | `2000-title` | 13.5.2000 | — | D | בנוי |
| B11b | `2000-double` | 17.5.2000 | — | M | בנוי |
| C00 | `2000-bridge` | 17.5.2000 בלילה | — | B | בנוי |
| C01 | `2000-team` | קיץ 2000 | `life:team` | D | בנוי |
| C02 | `2001-terrace` | 2001 | `ULTRAS:entry` + `life:terrace:exploring` | D | בנוי |
| C03 | `2002-europe` | 2001–2002 | — | M | בנוי |
| C04 | `2002-desk` | 2002 | `JOURNALIST:entry` | D | בנוי |
| C05 | `2006-home` | 2004–2006 | — | D | בנוי |
| C06 | `2006-desk` | 2006 | `life:desk` | D | בנוי |
| C07 | `2007-table` | אביב 2007 | — | M | בנוי |
| C08 | `2007-registered` | 25.6–25.7.2007 | — | M | בנוי (דלתא 92–93: הריסה בשבעה ביטים) |
| C09 | `2007-key` | סתיו 2007 | — | D | בנוי |
| C10 | `2009-up` | 2009 | — | D | בנוי |
| C11 | `2010-cup` | חורף–אביב 2010 | — | D | בנוי |
| C12 | `2010-teddy` | 15.5.2010 | — | M | בנוי |
| C13 | `2010-qualify` | קיץ 2010 | — | D | בנוי |
| C14 | `2010-friends` | סתיו 2010 | `life:international` | D | בנוי |
| C15 | `2010-anthem` | סתיו 2010 | — | B | בנוי |
| L01 | `2011-people` | 2011 | — | D | בנוי |
| L02 | `2012-cups` | 15.5.2012 | — | D | בנוי |
| L03 | `2012-five` | קיץ 2012 | — | D | בנוי |
| **T02 (חדש בתנ"ך)** | `2012-terrace` | 2012 | `ULTRAS:entry` + `life:terrace:role` | D | בנוי — §11.T02 |
| L04 | `2013-household` | 2013 | — | M | בנוי |
| N05–N06 | `2015-newhall` | 2015–2016 | — | M | **בנוי 27.9** — החנוכה בלעדינו + `life:drivein:first-night` |
| P01 | `2016-crisis` | דצמבר 2016 | — | M | בנוי |
| P02–P03 | `2017-after` | 2017 | — | D | בנוי (הירידה נוספה ל־P02) |
| K01–K03 | `2017-distance` | 2017–2018 | `life:distance` | D | בנוי |
| R01 | `2018-return` | 2018–2019 | — | D | בנוי |
| A01–A03 | `2019-armchair` | 2019 | `life:armchair` | D | בנוי |
| R03 | `2021-losses` | 2020–2022 | — | B | בנוי |
| L07–L09 | `2021-promises` | 2021 | — | M | בנוי |
| **X01 (חדש בתנ"ך)** | `2021-suitcase` | קיץ 2021 | `life:distance` | D | בנוי — §11.X01 |
| Z01 | `2023-tournament` | 2023 | — | D | **בנוי 27.9** — Z03b (`z-owner`) |
| X02 | `2023-abroad` | יוני 2023 | `life:abroad` | D | בנוי |
| Z04 | `2023-quiet` | 2023–2024 | — | B→D | **בנוי 27.9** — Z05 (`z-where`), העוגן קורא את 11.5.2024 |
| **X04 (חדש בתנ"ך)** | `2023-visit` | 2023 | `life:abroad` | D | בנוי — §12.X04 |
| **T03 (חדש בתנ"ך)** | `2024-terrace` | 2024 | `ULTRAS:practice` | D | בנוי — §12.T03 |
| **I04 (חדש בתנ"ך)** | `2024-lina` | 2024 | `life:international` + `life:intl:met` | D | בנוי — §12.I04 |
| **FOOTBALL/BASKET 2024** | **`2024-home`** | יולי 2024 – ינואר 2025 | — (ציר ראשי) | M | **בנוי 27.9** — `chapter2024home.ts` |
| BASKET 2025 · FOOTBALL 2025 | `2025-eurocup` | אביב 2025 | — | M | **בנוי 27.9** — `z-glad`, `z-safra` |
| J03 | `2025-interview` | 2025 | `JOURNALIST:apex` | D | בנוי — **לתקן** לפי §29 |
| OWNER | `2025-owner` | קיץ 2025 | `OWNER:practice` | D | בנוי |
| 2025 Abroad | `2025-abroad` | סתיו 2025 | `life:abroad` | D | בנוי |
| F00–F01 | `2026-plan` | 2025–2026 | — | M | בנוי (עוגן `2025-promotion`) |
| F02–F04 | `2026-finale` | 7.5.2026 | — | M | בנוי |

**הסדר החדש של 2023–2025 בציר הראשי:**
`2023-tournament` → `2023-quiet` → [`2023-visit`] → [`2024-terrace`] → [`2024-lina`] → **`2024-home`** → `2025-eurocup` → [`2025-interview`] → [`2025-owner`] → [`2025-abroad`] → `2026-plan`.

השינוי היחיד ברישום: `2024-lina.next` מצביע על `2024-home`, ו־`2024-home.next` על `2025-eurocup`.

---

# 8. STAGE A — 1983–1986



## A1 — 1983 · “הזיכרון הראשון”

### Story Brief
**1983**  
“את המשחק אתה כמעט לא זוכר.”  
“את הכתפיים של אבא — כן.”

### Scene A1.1 — כתפיים
**מקום:** קהל / יציע.  
**מטרה:** אין objective טקסטואלי.

קובי מחזיק את פוגי כדי שלא ייעלם בתוך הקהל.

#### אינטראקציות
- להסתכל על קובי.
- להסתכל על הדגל.
- לגעת בצעיף.
- לכסות אוזניים.
- להרים ספח/נייר מהרצפה.

כל פעולה מייצרת memory קטן.  
אין “נכון”.

### Scene A1.2 — הקהל קופץ
מיקרו־אנימציה, לא QTE.

השחקן בוחר:
- לקפוץ;
- לקפוא;
- לצחוק;
- להיצמד לקובי.

### Technical
- `memory.kept`
- `relationship:kobi`
- `firstMemoryObject`
- no fail
- no objective spam

### סוף
Fade → map.
רק **הבית** נחשף.

---

## A2 — אביב 1984 · “שתי סיבות לצאת”

### Story Brief
**אמא רוצה לחם. החבר’ה רוצים שוער.**  
*באופן מפתיע, שניהם משוכנעים שהם יותר דחופים.*

### Trigger
רחל קוראת מהמטבח.

### Need
לחם.

### Collision
אופיר ועמית מחכים במגרש.

### Scene A2.1 — המטבח
רחל:
> “לחם מרפי. לפני שהוא סוגר את המשלוח.”

אופיר נשמע מבחוץ:
> “פוגי! אנחנו כבר בוחרים!”

### Clickable objectives
- **לך לקיוסק**
- **לך למגרש**

לחיצה → map focus → reveal.

### Route A — קיוסק קודם
רפי:
> “לחם אחד. ותגיד לאמא שלך שהחוב מאתמול הוא לא חוב, היא שילמה.”

פוגי מגיע למגרש מאוחר.
עמית:
> “יפה שבאת. חסר לנו בדיוק מישהו שיעמוד בשער.”

**Result:** Rachel trust +; friends teasing; reliability +.

### Route B — מגרש קודם
Mini-game: 45–60 שניות כדור.
אם נשאר יותר מדי:
clock advances.

רפי:
> “עכשיו נזכרת בלחם?”

**Result:** footballLove +; Rachel tension +.

### Route C — Promise Route
פוגי אומר:
> “אני מביא עד חמש.”

המשחק פותח timed promise.

אם עומד:
`kept_promise`
אם לא:
`broke_promise`

### Route D — distraction
Flavor interaction יכול לגזול 3–5 דקות, אבל לא לנעול.

### Design lesson
העולם מלמד:
**זמן הוא משאב. אנשים הם משאב.**

---

## A3 — סתיו 1984 · “הבית האדום השני”

### Story Brief
**אפי אומר שיש עוד בית אדום.**  
*הבעיה היחידה: הוא בצד השני של העיר.*

### Trigger
אפי עם כדור.

### Scene A3.1 — הרחוב
אפי:
> “אתה מכיר אוסישקין?”

אפשר:
- “לא.”
- “שמעתי.”
- “מה יש שם?”
- “לא עכשיו.”

### Route A — עם אפי
אפי מוביל.
Map reveal: Ussishkin Known.

### Route B — סקרן
פוגי שואל שלוש שאלות.
Knowledge +.
אפי:
> “אם אתה ממשיך לשאול, אנחנו נפספס.”

### Route C — לא עכשיו
אפי:
> “סבבה. יהיה עוד.”

Flag:
`efi:deferred`

### Route D — להגיע לבד
אם שמע מספיק:
מפה מציגה Known pin.
Navigation challenge קטן.
Wrong turn = time cost, לא fail.

### Hall intro
- ריח גריל.
- רעש פרקט.
- חדר הלבשה מתחת לקהל.
- סדרן.
- אנשים מכירים אנשים.

### Choice
להגיד את השם לסדרן / לשתוק.

### Callback
2007:
אפי יזכיר:
> “פעם לא ידעת בכלל איפה זה.”

---

## A4 — ספטמבר 1985 · “החולצה הראשונה שלי”

### Story Brief
**30 שקל.**  
*יש לך פחות. הרבה פחות.*

### Trigger
חולצה בחלון אצל רפי.

### Need
להגיע ל־30.

### Systems
- savings
- cash
- chores
- paid favour
- Supergoal temptation
- family wallet
- time
- energy

### Scene A4.1 — הפחית
לספור / לא לספור.
אם לא:
השחקן עדיין יודע “לא מספיק”, אבל לא מספר.

### Scene A4.2 — דרכים להרוויח
1. בקבוקים.
2. ארגזים אצל רפי.
3. משלוח.
4. משימה קטנה לשכן.
5. לשמור כסף.
6. להוציא 1 ₪ על Supergoal.

### Mini-game: crate carry
קצר.
לא “grind”.

### Supergoal temptation
רפי:
> “מעטפה שקל.”

השחקן יכול לקנות.
אין moral judgment.
פשוט נשאר פחות.

### Family Collision
רחל והארנק.

Choices:
- לשמור כסף.
- לתת.
- לתת חלק.
- להגיד “אני אחזיר”.

### Scene A4.3 — הדלפק
רק אם 30 בפועל.

פוגי מניח מטבעות.
רפי סופר.

קובי נכנס גרפית.

רפי:
> “שלושים. יש לו.”

קובי:
> “אני יודע.”

פוגי:
> “מה אתה עושה פה?”

קובי:
> “עובר ברחוב.”

קובי:
> “תן לו.”

פוגי:
> “אבל יש לי.”

קובי:
> “ראיתי.”

### Payoff
החולצה = `visa86`.
הכסף נשאר.

### Memory
**“החולצה הראשונה שלי, שאבא קנה לי במתנה.”**

### Long callbacks
1999 / 2010 / 2026.

---

## A5 — 28.9.1985 · “בחולצה שלך”

### Story Brief
**שבת. חולצה משלך.**  
*היא עדיין גדולה עליך. זה זמני.*

### Match Ritual
לבחור חולצה.

### Dynamic setup
- עם קובי.
- עם חבר.
- לצאת לבד ולפגוש בדרך.
- לחזור כי שכחת כרטיס/צעיף.

### NPC reactions
קובי:
> “אל תכניס אותה למכנסיים.”

אופיר:
> “גדול עליך.”

פוגי:
> “עוד מעט לא.”

### System
Wardrobe memories.
No buffs.

---

## A6 — חורף 1985/86 · “אכזבה רגילה”

### Purpose
לא כל שבת היא cinematic.

### Routes
- רדיו עם קובי.
- לבד בחדר.
- לכבות.
- להתקשר לעמית.
- להמשיך להקשיב למרות שאין מה לחגוג.

### Emotional payoff
footballLove יכול לעלות גם באכזבה.

### No reward screen
רק memory.

---

## A7 — 17.5.1986 · “השבוע שלפני”

### Trigger
דיבור על המשחק הבא.

### Need
להגיע.

### Routes
1. לבקש מקובי.
2. לבקש דרך רחל.
3. להבטיח מטלה.
4. להכין plan B עם אופיר/עמית.
5. לשקר כאופציה מסוכנת.

### Outputs
- permission
- promised
- refused
- backup
- lied

כל אחד משנה את A8.

---

## A8 — 24.5.1986 · “להגיע לבלומפילד”

### Story Brief
**המשחק כבר יודע איך הוא ייגמר.**  
*אתה עדיין צריך להיכנס.*

### Phase 1 — Ritual
בחר חולצה.

### Phase 2 — route selection
#### Family
קובי/כרטיסים.

#### Friends
פוגי פוגש אופיר/עמית.

#### Street
דרך חלופית.

#### Risk
התגנבות.

#### Late
הבטחה/עיכוב מהעבר.

### Phase 3 — Gate challenge
לא “מצא pixel”.
3 פתרונות:
- אדם.
- ידע.
- תזמון.

### Phase 4 — inside/outside
המשחק מאפשר:
- להגיע מוקדם.
- להיכנס מאוחר.
- לשמוע מבחוץ.
- להשלים דרך historical film.

### Historical Beat
השער של גילי לנדאו קבוע.

### After
קובי יוזם חיפוש אחר פוגי / פוגי מחפש קובי לפי route.

### Ending variants
- “הייתי שם.”
- “נכנסתי בזמן.”
- “שמעתי לפני שראיתי.”
- “מצאתי את אבא אחרי.”

### 2026 callback
הדרך מתהפכת.



# 9. STAGE B — 1990–2000

## B1 — 1990 · “כמה צריך?”

### Story Brief
**ארבע שנים עברו. הפועל ירדה. עכשיו צריך לעלות.**  
*מתברר שגם לאהוד צריך לדעת חשבון.*

### Quest type
Knowledge Quest.

### Sources inside world
- עיתון.
- רפי.
- קובי.
- רדיו.
- אוהד מבוגר.
- שמועה.

### Mechanic
השחקן אוסף 2–3 pieces:
`KNOWN / RUMOR / VERIFIED`

### Routes
- Verify before leaving.
- Trust Kobi.
- Trust terrace rumor.
- Calculate yourself.

### Journalist seed
שני מקורות עצמאיים → `journalist:seed`.

### Fun
לא lecture: פוגי ממש בונה על פתק:
“אם אנחנו... ואם הם...”

---

## B2 — 1991 · “יש עוד בית”

### Collision
בית ספר / אוסישקין / חברים.

### Routes
- אפי מחכה.
- לצאת לבד.
- להביא חבר.
- לאחר ולהיכנס אחרי תחילת המשחק.

### Mini-task
לעזור לסדרן/קiosk בהיכל.
קהילה לפני תוצאה.

### Efi role
הוא מכיר אנשים.
הוא לא exposition.

---

## B3 — 1993 Cup · “הגביע אדום”

### Quest
להגיע לגמר.

### Routes
- אוטובוס אוהדים.
- משפחה.
- חברים.
- עצמאית.

### Costs
money / time / seat / memorabilia.

### Optional side objective
להשיג תוכנייה/כרטיס.
Collector memory.

### Historical film
רק אחרי playable arrival and emotional setup.

---

## B4 — 1993 Galil · “הבית נשבר”

### Theme
אפשר לזכות בגביע ועדיין להרגיש שהבית מתפרק.

### Scene
אפי קורא לפוגי.

### Choices
- להישאר איתו.
- לעזור practical.
- לדבר עם אנשים.
- ללכת כי “אין לי כוח לזה”.

### Consequences
basketballLove / community / Efi memory.

---

## B5 — 1994/95 · “המספר שבע על הקיר”

### Quest
Supporter identity conflict.

### Rule
לא להציג טענה שנויה במחלוקת כעובדה.
דמויות אומרות מה הן מאמינות.

### Routes
- protest.
- observe.
- ask older fans.
- defend person.
- leave.

### Reputation
terrace / club / public.

### Visual mechanic
Banner/stencil craft יכול לשמש אם השחקן בוחר ליצור.
לא חובה.

---

## B6 — 1996 · “אין מקום אחד לעמוד בו”

### MAJOR QUEST

### Trigger
צבא / משמרת / שבת.

### Collision
- duty
- match
- friends
- transport

### Routes

#### Legal
לבקש.
Risk: denied.

#### Swap
למצוא חייל אחר.
Relationship/debt.

#### Lie
Short-term win, legal risk.

#### Late return
match first, base later.

#### Refuse bus
אירוע אישי rare authored:
הסעה שלא מתאימה לפוגי → הוא מסרב → צריך טרמפ → מאחר לבסיס.

#### Hitchhike
money saved, risk/time.

#### Stay
missed game due duty.

### Systems
- `missReason`
- legal
- fatigue
- money
- promise
- friendships

### Callback
2017/2023:
> “פעם איחרת לבסיס בשביל שבת.”

---

## B7 — 1997 · “גם האולם יכול לרדת”

### Dynamic presence
inside / outside / late / Efi / alone.

### Aftermath choices
- לעזור לפרק.
- להישאר.
- להתווכח.
- ללכת.

### Founder seed
מי שנשאר אחרי הפסד מקבל יותר “community proof” ממי שמגיע רק לחגיגות.

---

## B8 — 2.5.1998 · “השרוכים”

### Quest
Observation / truth.

### Mechanic
Moment Puzzle:
- מי נגע בכדור;
- לאן הכדור הלך;
- מה ראית;
- מה אחרים אומרים.

### Critical distinction
**Observation ≠ motive.**

### Routes
- watch live.
- TV.
- radio.
- arrive late.
- replay in archive.

### Output
`knowledge:observed`
`belief:*` separated.

---

## B9 — 1999 Basketball · “זה לא נגמר כשעולים”

### Theme
Success creates work.

### Tasks
- celebrate.
- count.
- clean.
- organize next day.
- help fan get home.

### Founder route
Small proofs.

---

## B10 — 19.5.1999 · “שש־עשרה שנה”

### Memory callbacks
- 1983.
- first shirt.
- Kobi.

### Routes
family / friends / collector / terrace.

### Emotional beat
קובי יכול לזהות first shirt:
> “עוד יש לך את הדבר הזה?”

---

## B11a — 13.5.2000 · “ארבעה ימים”

### Quest
Parallel result pressure.

### Tools
phone / radio / rumor / crowd.

### Challenge
information arrives asynchronously.

### Choice
מי אתה מאמין לפני אישור.

### After
who gets first hug/call.

---

## B11b — 17.5.2000 · “הדאבל”

### Fatigue
השחקן מגיע עם states מהאליפות.

### Routes
- family.
- terrace.
- work obligation.
- ticket help.
- memorabilia.

### Historical Beat
penalties fixed.

### Transition
לא credits.
לילה בבית.



# 10. STAGE C — 2000–2010

## C00 — לילה אחרי הדאבל · “מה שאחרי”

### Scene 1 — הבית
רחל:
> “אל תשאיר את הנעליים באמצע. גם אלופים נופלים.”

### Choice of person
- קובי.
- רחל.
- חברים.
- לישון.

### Mechanical meaning
מי מקבל `bridge_contact`.

### Scene 2 — Red Box
החפצים של שני העשורים הראשונים מופיעים.

### Scene 3 — kiosk / work seed
רפי יכול להציע עבודה קבועה קטנה.

### Route outputs
work / team / journalist / terrace curiosity.

---

## C01 — קיץ 2000 · “צריך שם עד מחר”

### Quest
Five-a-side tournament.

### Team building
אפי / עמית / אופיר + rotating friend.

### Choices
- talent vs reliability.
- position.
- captain.
- team name.
- who pays.

### Mini-games
reuse football.
max 60s per highlight.

### Humor
שם קבוצה רע נשמר callback.

---

## C02 — 2001 · “לא מי שצועק הכי חזק”

### Ultras route
משימה לוגיסטית.

### Tasks
- בד.
- צבע.
- מישהו לא הגיע.
- זמן לפני פתיחת שערים.

### Craft
banner/stencil system.

### Leadership test
לקחת credit / לתת credit / להאשים.

---

## C03 — 2001/02 · “העולם שמע עלינו”

### HISTORICAL ARC
UEFA run.

### Design
לא לשחק כל משחק.

### 5 episodes
1. “זה נהיה רציני.”
2. Chelsea.
3. Lokomotiv.
4. Parma.
5. Milan.

### Dynamic travel layer
לכל episode:
- travel.
- money.
- work.
- who joins.
- remote alternative.

### Milan Major Quest
#### Option A — save money
work history matters.

#### B — friends cheap route
risk/comfort.

#### C — journalist
access, but professional obligation.

#### D — international contact
social debt.

#### E — stay home
full narrative alternative, not punishment.

### Life impact
Traveller / Abroad / Journalist / Normal fan.

---

## C04 — 2002 Desk · “לכתוב או להיות צודק”

### Quest
first article.

### Mechanic
choose evidence cards.
FACT / HEARD / OPINION.

### Routes
publish fast / verify / call / kill.

### 2006 callback
correction.

---

## C05 — 2004–2006 · “ריח של בית”

### Purpose
לתת לאוסישקין רגע חיים לפני האובדן.

### Mini-quests
- לעזור בקיוסק.
- להרים קונפטי.
- לסדר banner.
- לדבר עם שחקן/אוהד.
- לצפות.

### Confetti mechanic
כאן להשתמש ב־cutting/craft:
השחקן גוזר קונפטי עם אפי/חברים.
הפריט יכול לחזור בהריסה:
פיסה נשארת בכיס/Red Box.

---

## C06 — 2006 Desk · “התיקון”

### Consequence quest
2002 choice pays.

### If rushed
affected person confronts.

### If verified
different professional temptation.

### Choices
- prominent correction.
- small correction.
- call.
- defend.

---

## C07 — אביב 2007 · “הדף מהקיוסק”

### MAJOR FOUNDER QUEST

### Trigger
אפי מגיע עם דף.

### Need
להקים משהו.

### Work packages
השחקן לא יכול לעשות הכול.
בוחר 2–3:
- טלפונים;
- רשימות;
- כסף;
- אולם;
- שחקנים;
- רישום;
- הסברה.

### NPC agency
אפי מביא contact.
רומא יכול להביא קשר.
מתוקי יכול לפתור logistics.
יעל יכולה לסדר מסמך/מידע.

### Route roles
Founder / Journalist / Regular / International.

### Objective
לא “הקם מועדון”.
**“תגרום למחר לקרות.”**

---

## C08 — 25.6–25.7.2007 · “חודש אחד”

### Part A — Registered
קטע קצר של שמחה.

### Part B — phone call
מישהו מודיע על אוסישקין.

### Part C — walk
אין Fast Travel.
ההליכה עצמה היא beat.

### Part D — outside
דמויות שונות לפי past:
אפי / חבר / older supporter.

### Part E — demolition
HUD off.
No humor.

### Actions
- לעמוד.
- לצלם.
- לדבר.
- לעזור למישהו.
- לקחת חפץ קטן.
- לא לקחת כלום.

### Memory object
חתיכת בד / כרטיס / נייר / קונפטי ישן.
לא לקחת “שבר מהבניין” אם אין הצדקה.

### World
Ussishkin hall → demolished.
Map:
**אוסישקין הי"ד**
“המקום כבר איננו.”

---

## C09 — סתיו 2007 · “מי פותח מחר”

### Scene
אולם חדש וריק.

אפי:
> “פה יהיה לנו מקום.”

פוגי:
> “זה לא אוסישקין.”

אפי:
> “לא אמרתי שזה אוסישקין.”

### Key choice
take / share / refuse / hand to Efi.

### Meaning
האם אתה צריך להיות “הבעלים” של האחריות.

---

## C10 — 2009 · “עלינו. יש מי שיסגור?”

### Celebration vs duty

### Quest after crowd leaves
- lock.
- clean.
- help child.
- delegate.

### Founder apex test
מי שבנה מערכת לא חייב להישאר אחרון.

---

## C11 — 2010 Cup · “אל תתחיל לחשב”

### Pre-Match
Wardrobe + work collision.

### Personal collision
partner / job / friends.

### Quest
לבחור מה מבטלים.

### No fake choice
אם הבטחת בבית — זו באמת הבטחה.

---

## C12 — 15.5.2010 Teddy · “עד שהטלפון נופל”

### Trigger
אולי:
> “יש מקום באוטו. אני יוצא עוד עשרים דקות.”

### Routes
- take seat.
- own route.
- work first.
- partner first.
- refuse.
- late join.

### Car mini-beat
music / phone / arguments.

### Parallel score
phone + crowd.

### Historical convergence
late Zahavi goal.

### Aftermath
phone falls / hug / who do you call.

### Memory
`came_to_teddy / missed_teddy_reason`

---

## C13 — קיץ 2010 · “עוד לא הוגרלה עיר”

### Quest
Champions League logistics.

### Tasks
passport / leave / budget / host.

### Minigame
packing / choose memory item.

### Route
International can host visitors instead of travel.

---

## C14 — International · “לא כל צעיף הוא אותה עמדה”

### People
Roma + Lina + Nico.

### Scene
Allenby.

### Conflicts
politics/culture/boundaries.

### No quiz
הבחירה היא איך לדבר.

---

## C15 — Autumn 2010 · “המנגינה הזאת”

### Three vignettes only
1. anthem.
2. Benfica 3:0.
3. Lyon 2:2.

### Personal layer
who watches with you / where / shirt.

### Historical film
optional after match.




# 11. 2011–2021 — החיים האישיים הופכים לציר משחק

## L01 — 2011 · “לא תמונה שלך”

### Goal
להכניס אנשים לחיים בלי להפוך אותם ל־romance menu.

### Locations
Allenby / work / university / rehearsal.

### Characters
קרן, מלאני, דור, יונתן.

### Player agency
- friendship.
- interest.
- keep distance.
- choose work.

### NPC agency
אחד מהם יכול לסרב.

### Technical
relationships separate:
bond / trust / romance-intent.

---

## L02 — 2012 · “אותה הבטחה”

### Collision
Cup night vs promise.

### Three honest solutions
1. Keep promise, miss part of match.
2. Renegotiate before.
3. Break.

### Dishonest
lie.

### Game principle
Renegotiation ≠ breaking.

---

## L03 — 2012 · “חמש שנים וכמה מפתחות”

### Growth montage becomes gameplay
choose one responsibility:
- Ussishkin/basket.
- terrace.
- journalism.
- work.
- creative.

### Other systems keep moving without you.
This is important:
the world does not wait.

---

## T02 — 2012 · “מי פותח כשאתה לא בא” · `2012-terrace`

### **נוסף במהדורה 2 — בנוי בקוד, חסר בתנ"ך**

### חלון
נפתח רק למי שלקח תפקיד ביציע ב־2001: `own:route:ULTRAS:entry` + `life:terrace:role`.
מי שלא לקח תפקיד לא יודע שהפרק הזה קיים (כלל 87).

### Story Brief
**שער 5 · 2012**
“אחת־עשרה שנה אתה פותח את הבד.”
*היום מישהו אחר רוצה.*
tone: `dry`

### Trigger
יבגני, צעיר מהיציע, מחכה לו בשער 5. הוא לא מבקש עזרה. הוא מבקש את התפקיד.

### Need
פוגי רוצה שהיציע ימשיך לעבוד בלעדיו, ועדיין להרגיש שהוא שלו.

### Collision
להאציל פירושו לוותר על שליטה. `2013-household` כבר מחכה בפרק הבא, ובו אין לו ערבי שבת פנויים.

### Approaches (שיחה `t-hand`)
- **לתת סמכות, ולסכם גבולות מראש.** יבגני: “עכשיו אני יודע מתי להחליט ומתי להתקשר.”
- **לנהל יחד תפקיד מצומצם יותר.** אסף: “קטן ומבוצע עדיף מגדול שמחכה לך.”
- **לוותר על האחריות, ולמסור אותה לפני האירוע.** יבגני: “אני לוקח. תעביר את המידע.”

### מה המשחק זוכר
- הדגל `t:hand` והוכחת `leadership_proof` מסוג המסלול.
- ב־T03 (2024) אסף עומד לידו ואומר “היום אני עוזר לך”. זה התשלום של מי שהאציל ב־2012.

### גרסת אוהד רגיל
לאוהד רגיל אין את הפרק הזה. זה לא חיסרון: היציע הוא מסלול, לא זכות (§27).

---

## L04 — 2013 · “היומן שעל המקרר”

### MAJOR PERSONAL QUEST

### Situation
One week:
- match.
- work.
- partner.
- family.
- possible child discussion.

### UI
calendar, not dialogue tree.

### Player assigns limited evenings.

### Consequences
You cannot “win all”.

### Parenthood
If relationship and intent align:
child route can begin.
Never automatic.

---

## N05 — 24.12.2014 → 4.1.2015 · “פותחים בית חדש” · `2015-newhall` (הרחבה)

### **תוקן במהדורה 2**
הכותרת הקודמת, "2–4.1.2015, טקס עם כ־2,000 אוהדים", אינה מאומתת (§7).

מה שקרה בפועל, ומה שהסצנה בנויה עליו:
- **24.12.2014** — העירייה חנכה את האולם: ראש העירייה, מזוזה, סיור עיתונאים. **נציגי הפועל לא היו שם.**
- **4.1.2015** — משחק הבית הראשון: 81:67 על הפועל ירושלים.

הפער בין שני התאריכים הוא הסצנה: האולם נפתח **בלעדיהם**, והם פותחים אותו שוב **בעצמם**.

### מה כבר בנוי
`2015-newhall` מתחיל בתוך הדרייב אין (`nr:hall`), עם אפי ומתוקי והשלט בתחנה (`nr-check`). העוגן הוא `2015-drivein`.
ההרחבה מוסיפה **שני ביטים לפני** מה שקיים ו**ביט אחד אחריו**. שום דבר קיים לא זז.

### Story Brief
**שבע שנים וחצי אחרי אוסישקין.**
**יש שוב דלת.**
*הפעם מישהו אחר חתך את הסרט.*
tone: `warm` → `memory`

### Phase 0 — 24.12.2014, בבית (`n0-news`, ביט `enter` ב־`home`)
הטלפון על השולחן. כותרת: “האולם החדש נחנך רשמית.” תמונה של אנשים בחליפות, מזוזה, מספריים.

פוגי מחפש בתמונה פרצוף מוכר. אין.

**בחירה (לא תפריט — שלושה חפצים בחדר):**
- **הטלפון** — לשלוח לאפי “ראית?”. אפי: “ראיתי. אנחנו פותחים ב־4. זה מה שנחשב.” (`n0:asked-efi`)
- **הקופסה** — להוציא את הפיסה מאוסישקין (הזיכרון של `2007-registered`). בלי שורה. הקופסה נפתחת ונסגרת. (`n0:box`)
- **לסגור את המסך** — שום דבר. זה לגיטימי. (`n0:closed`)

שום בחירה לא נכשלת. כל אחת נותנת לאפי ב־Phase 2 שורה אחרת.

### Phase 1 — הזמנה (`actorCue`: אפי)
בבוקר של 4.1 הטלפון מצלצל. זה אפי שמתקשר, לא פוגי (§22):
> “בוא מוקדם. לפני שהכול נהיה אנשים.”

אם פוגי ענה ב־Phase 0 בטלפון:
> “ואל תביא פרצוף של תמונה של עירייה.”

### Phase 2 — אולם ריק (הקיים: `nr-hall`)
פוגי נכנס כשהכיסאות עוד ריקים. ארבעה דברים לעשות, לכל היותר שניים לפני שהקהל נכנס (`TIME`):
1. **לעמוד על הפרקט.** בלי שורה. הצליל של נעל על פרקט חדש (`sound: step`, ambience `hall`).
2. **לחפש את “שלנו”.** הוא הולך ליציע וסופר שורות. אפי מאחוריו: “שורה שבע. אל תשאל למה. ככה הצבענו.”
3. **לשים חפץ מאוסישקין** מתחת לכיסא, או בכיס של הכיסא. רק למי שנשא אותו (`n0:box`, או `life:uss:there`).
4. **לעזור.** זה Phase 3.

### Phase 3 — עבודה לפני הבכורה (שימוש חוזר, בלי מערכת חדשה)
אפי: “יש שלושה דברים ואנחנו שניים.”
- **הבד** — `chore:story:banner-15`, מסוג `carry`: לסחוב את הבד הגדול לקצה היציע. בלי שכר. אפשר לעצור באמצע, והבד נתלה עד איפה שהגעת.
- **הקונפטי** — מיני־גיים קונפטי (2004–06). מה שהכנת הוא מה שעף בפתיחה.
- **הילדים** — להכניס משפחות לפני הזמן. `serve`: ילד שואל “איפה הבית?”. פוגי מצביע על הפרקט.
- **לא לעזור.** לשבת. אפי לא נעלב: “גם לשבת צריך מישהו.”

### Phase 4 — הדיאלוג
> פוגי: “זה לא אוסישקין.”
> אפי: “לא.”
> *(שתיקה)*
> אפי: “אבל הוא גם לא ביקש להיות.”

אם `n0:closed`:
> אפי: “ראיתי שלא ענית על התמונה.”
> פוגי: “לא היה מה.”
> אפי: “בדיוק.”

### Phase 5 — המשחק
- הקהל נכנס. המצלמה לא עוזבת את פוגי.
- משחק כדורסל קצר (hoops, עד 60 שניות): זריקה אחת מהיציע בזמן ההפסקה, לא בזמן המשחק.
- בסוף: לוח התוצאות מראה **81:67** (שורת ארכיון — כלל 11; בלי שורה אין מספר).
- משפט אחרון, אפי: “עכשיו זה בית. אמרתי לך שזה לא עניין של קירות.” (מי שעבד ב־Phase 3)
  או: “נו. עכשיו תגיד שזה לא אוסישקין.” (מי שישב)

### אחרי
N06 כפי שהוא.
**ביט צד ביוני 2015 (בלי משימה):** “שנת הייסוד שונתה ל־1923” (§7 #15).
- מתוקי: “שמונה שנים יותר זקנים. באותו יום.”
- פוגי: “הרגשתי.”

### State
- `n0:asked-efi` | `n0:box` | `n0:closed` — דגלי יום.
- `nr:banner` / `nr:confetti` / `nr:kids` / `nr:sat`
- `life:drivein:first-night` — שורד.
- `remember: efi · first-night-2015` — זיכרון של אפי (`relationshipMemory`, לא דגל).

### Callbacks
- `2024-home` Phase B3 — אפי: “שורה שבע. עשר שנים. ועכשיו אומרים לי שהיא קטנה.”
- `2025-eurocup` — מי שתלה את הבד: “הבד מ־2015 עוד אצלך?”

### גרסת אוהד רגיל
- Phase 3 אופציונלי, Phase 5 מלא.
- אפי הוא מי שמזמין. זה מספיק כדי שהערב יהיה של פוגי.

### QA
- [ ] אין "2.1.2015" ואין "2,000" בשום מחרוזת.
- [ ] "81:67" מודפס רק מתוך שורת ארכיון.
- [ ] Phase 0 אינו נחסם: שלושת החפצים נגישים, ושום אחד מהם אינו חובה.
- [ ] `life:worldlines` — הקו הריק מגיע לסוף.

---

## N06 — 2015/16 · “בית עם כתובת אחרת”

### Dynamic
מי שקיבל את האולם:
- adopter.
- nostalgic.
- detached.

### Challenge
make it “home” through people:
same row / same vendor / same person.

---

## P01 — דצמבר 2016 · “מה בעצם קרה”

### Major Investigation Quest

### Trigger
phones explode with rumors.

### Board
FACT / CLAIM / UNKNOWN.

### Sources
- supporter.
- journalist.
- official document.
- friend.
- business route.

### Player action
decide what to forward.

### Consequence
public trust / journalism / relationships.

---

## P02 — ינואר 2017 · “תשע”

### Historical beat
הפחתה של תשע נקודות (10.1.2017, §7 #17). **והיה לה המשך: בסוף העונה הקבוצה ירדה לליגה הלאומית** (§7 #18).
במהדורה הראשונה הירידה נעלמה בין P02 ל־R01. בלעדיה "עלינו, לא חזרנו אחורה" של 2018 עונה על שאלה שאף אחד לא שאל.

הירידה לא מקבלת סצנה משלה, כי לארכיון אין ערב שבו היא נחתמה. היא מקבלת **שורה אחת בסוף P02**, בפה של מי שפוגי פוגש:
> "אז זהו. לאומית."
> "עונה."
> "אמרו את זה גם על ההפחתה."

אותה מילה — **"עונה"** — חוזרת ב־2024 (Z05) ובעלייה של 2025 (Z07). זה חוט, לא שורה (§31).

### Quest
not “watch news”.
Who do you meet after?

### Routes
- terrace.
- father.
- work.
- distance.

### Pugi personal life
If partner:
they ask:
> “אתה איתי הערב או עם הטלפון?”

No moral winner.

---

## P03 — 2017 · “את המשפט הזה כבר שמעתי”

### Route hinge
- stay.
- regular.
- armchair.
- distance.
- journalist.
- owner curiosity.

### Dynamic
the choice is not menu-only.
It is enacted through:
what invitation you accept next.

---

## K01–K03 — Distance

### Game language changes
less map, more phone / notifications / memories.

### Choices
answer / ignore / visit / mute.

### Personal
work/relationship can grow because football shrinks.
That is not punishment.

---

## R01 — 2018 Return · “עלינו, לא חזרנו אחורה”

### Quest
re-enter.

### Social friction
old group does not instantly restore position.

### Regular supporter route
buy ticket, sit, watch.
That alone must feel complete.

---

## A01–A03 — 2019 Armchair · “השלט אצל אבא”

### Kobi chapter
TV, snacks, old arguments.

### Choices
watch / half-watch / leave.

### Human beat
Kobi notices phone:
> “אתה איתי או איתם?”

---

## R03 — 2021 Cup Loss

### No failure UI
Historical loss.

### After
choose person:
Kobi / partner / child / friend / alone.

### system
grief/energy/mood.
No reward.

---

## L07–L09 — 2021 Promises

### Payoff to 2013.

### Variants
- with child.
- no child.
- partner.
- alone.

### Main choice
keep / renegotiate / break.

### Child route
first match planning:
shirt, noise, food, exit plan.

### Mirror
Pugi becomes Kobi.



## X01 — קיץ 2021 · “מה נכנס למזוודה” · `2021-suitcase`

### **נוסף במהדורה 2 — בנוי בקוד, חסר בתנ"ך**

### חלון
`life:distance` — רק מי שהתרחק ב־2017.

### Story Brief
**2021 · הבית של ההורים**
“מזוודה על המיטה שלך, בחדר שכבר לא שלך.”
tone: `memory`

### Trigger
רחל פותחת את הארון ושואלת מה לוקחים. קובי שותק ומחזיק צעיף.

### Need
לסגור תוכנית מעבר, או להחליט שלא.

### Approaches (שיחה `x-suitcase`)
- **לנסוע.** פוגי לוקח מזכרת שכבר הייתה לו. מה שלא נכנס “נשאר עם כתובת ולא נזרק”. סוף `move`; בקופסה: הצעיף.
- **להתכונן עוד.** פוגי חוסך כדי לא לנסוע בחוב. קובי: “אז עוד לא נפרדים.” סוף `prepare`.
- **להישאר.** רחל: “זו ההחלטה שלך?” פוגי: “כן — כרגע.” סוף `stay`.

### מה המשחק זוכר
- `life:abroad` נפתח רק בסוף `move`. זו הדלת לשלושת פרקי החו״ל (X02, X04, 2025).
- הצעיף במזוודה הוא אותו חפץ שנכנס לקופסה ב־1986 (חוט `scarf:`, §31).

---

# 12. 2023–2026 — שני מועדונים, כסף גדול, קהילה, דור חדש

## Z01 — 2023 Tournament · “הילדים על הקו”

### Generational mirror
reuse five-a-side.

### Roles
coach / play / help / observe.

### Humor
פוגי מנסה לעשות ספרינט.
המשחק לא צריך להסביר שהגיל הגיע.

### Callback
same team-name system from 2000.

---

## X02 — 2023 Abroad · “אצלכם כבר התחיל”

### Kobi initiates call.

### Collision
match stream + someone at door + time zone.

### Choice
watch with Kobi remotely / call later / ignore.

### Memory
`kobi:called-first-abroad`

---

## Z03b — יולי–אוגוסט 2023 · “מי בעל הבית עכשיו?” · `2023-tournament` (הרחבה)

### **כתוב מחדש במהדורה 2 — כניסת עופר ינאי**

### Historical anchor (§7 #20)
- **19.7.2023** — הוכרזה העסקה: ינאי 51%, אבי זיידנברג 30%, עמותת הפועל אוסישקין 19%. כ־30 מיליון ₪ בחתימה.
- **מה העמותה שומרת:** נציגות בדירקטוריון, מחלקות הנוער והנשים, פעילות קהילה, וייצוג באיגוד.
- **הועד אישר להביא את העסקה לאספת חברים ולהצבעה דיגיטלית.** תוצאת ההצבעה לא אומתה, ולכן המשחק **לא מדפיס מספר קולות**.

### למה כאן ולא בפרק חדש
`2023-tournament` כבר נגמר בחדר הקהילה (`community-room`), בשיחה `z-grow`: **“מי מחליט כשגדלים.”**
זו אותה שאלה בדיוק, שבועות אחר כך, באותו חדר. פרק נפרד היה מפרק אותה לשתיים.

### Story Brief
**קיץ 2023 · חדר הקהילה**
“הקבוצה שהקמתם בחדר הזה.”
*עכשיו יש לה בעלים.*
tone: `tense` — בלי בדיחה

### Trigger (`actorCue`)
על לוח המודעות תלוי דף, שנכנס עם הביט `z-owner-notice`, ב־`enter`, אחרי `z:grow`.
הדף לא מצוטט. הוא **סיכום בלשון המשחק** של מה שהועד הודיע:
> **51 · 30 · 19**
> אספת חברים. הצבעה אחריה.

מישהו מאחוריו, **גל** — חבר עמותה צעיר, דמות חדשה אחת (`gal`, `supporter`, `composite`, עשור 2020; שורה ב־`characters.ts` לפני פנים — כלל 58):
> “קראת? אני לא הבנתי אם זה טוב או רע.”
> פוגי: “גם אני לא.”
> גל: “יופי. אז אנחנו שניים שיודעים משהו.”

### Need
פוגי רוצה לדעת **מה נשאר של מה שבנו.**

### Collision
- הקבוצה צריכה כסף כדי לגדול. זה לא שנוי במחלוקת.
- מה שבמחלוקת הוא **מה נותנים תמורתו**.
- ובאותו ערב יש משהו אחר, לפי החיים:
  - ילד (`life:child`) עם חום;
  - בן/בת זוג (`life:partner`) עם תוכנית לערב;
  - משמרת (`work`).

### Approaches — ארבע דרכים, וכולן “נכונות”

**1 · לקרוא את ההצעה** (מיני־גיים Moment Puzzle, שימוש חוזר)
- הדף בחדר נפתח לתצוגה מלאה, ושישה משפטים מודגשים בו.
- פוגי מסמן **שלושה**: מה חשוב לו לשמור.
  - האפשרויות: הדירקטוריון, הנוער, הנשים, הקהילה, השם והצבעים, האולם.
  - "השם והצבעים" ו"האולם" **לא כתובים בהודעה**, ומי שמסמן אותם מקבל שורה: “זה לא כתוב פה.”
- אין תשובה נכונה. הבחירה נשמרת כ־`life:ownership:basket:kept` (רשימה).

**2 · לשאול באספה** (ביט `z-assembly`, בחדר, בערב)
פוגי יכול לקום עם שאלה אחת:
- “מה קורה אם הבעלים רוצה להעביר אולם?” *(זה בדיוק מה שיקרה ב־2024. השחקן לא יודע, הקוד כן.)*
- “מה העמותה יכולה לעצור?”
- “מה קורה אם הכסף נגמר?”
- “איך נשמע קול של חבר קטן?”

על כל שאלה עונה **נציג העמותה**, דמות בדיונית מהוועד — לא אדם אמיתי (§29), תשובה עניינית בשתי שורות.
- **השאלה על האולם** מקבלת: “זה נושא שנדבר עליו כשיגיע.”
- מי ששאל אותה מקבל `life:assembly:asked-venue`, והמשפט חוזר ב־2024.

**3 · להצביע** (רק למי שחבר: `life:founding:role` או `own:route:USSISHKIN_FOUNDER:*`)
- הטלפון, הצבעה דיגיטלית: **בעד / נגד / נמנע**.
- הקול נשמר ב־`life:ownership:basket:vote`.
- **המשחק לא מראה תוצאה.** פוגי רואה רק “הצבעת.” — כי אין לנו מספר.

**4 · לא להיות שם**
- החיים לוקחים את הערב (ילד, זוגיות, משמרת).
- בבוקר, הודעה של גל: “פספסת. היו צעקות. אף אחד לא נפל.”
- `life:miss:z-assembly` = `family` / `work` / `choice`.

### Route variants
- **Founder** — אפי עומד ליד הלוח (actorCue `approach`):
  > “ב־2007 הכסף היה 2,000 שקל במעטפה. לא התגעגעתי לזה.”
  > “גם אני לא.”
  > “אז למה אתה נראה ככה?”
- **Owner route** — פוגי מבין את השורה של 30 מיליון, ורואה בה תקציב ולא איום. הוא מקבל שאלה חמישית: “מה החזר ההשקעה של מי שמשקיע בקבוצת אוהדים?” (`business` +).
- **Journalist** — הדף נכנס ללוח העובדות: FACT / CLAIM / UNKNOWN (§P01, שימוש חוזר):
  - "51" → FACT
  - "תוצאות ההצבעה" → UNKNOWN
- **Regular** — אין לו קול, יש לו שאלה. אפשרויות 1 ו־2 פתוחות לו במלואן.

### Output
- `life:ownership:basket` = `kept-list` | `trust` | `wary` | `absent` — **לא** pro/anti.
- `life:ownership:basket:vote` = `for` | `against` | `abstain` | ריק.
- זיכרון: `remember: efi · owner-talk-2023` (רק למי שדיבר עם אפי).

### Callbacks
- `2024-home` חלק ב': מי ששאל על האולם שומע את המשפט של נציג העמותה חוזר.
- `2025-eurocup` Z06: מי שהצביע נגד ומי שהצביע בעד מקבלים שורות שונות מאפי.

### QA
- [ ] אין שורה בפה של “ינאי” או של “זיידנברג”.
- [ ] אין אחוז הצבעה.
- [ ] מי שאינו חבר לא רואה את כפתור ההצבעה ולא מקבל עליו הסבר.
- [ ] `life:ownership:basket` נכתב בכל ארבע הדרכים, כולל "לא להיות שם".

---

## Z04 — 2023/24 · “אין משימה לזה” · `2023-quiet`

### Intentionally quiet.
Sit / call / walk / archive / do nothing.

הקוד כבר מכבד את זה (`z-aid`, מאיה):
- אין הישג שכול;
- אין דיאלוג חדש בפי מי שנפל;
- "לא עכשיו" לא עולה ולא מקנה דבר.

**מהדורה 2 לא נוגעת ב־Z04.**

### Life
partner/child/work can take center.

---

## Z05 — 11.5.2024 · “עונה” · `2023-quiet` (הרחבה)

### **כתוב מחדש במהדורה 2 — ירידת הכדורגל**
מחליף את "FOOTBALL 2024 — 26 אלף והאדמה יורדת". **המספר 26 אלף אינו מאומת והוצא.**

### Historical anchor (§7 #21)
**11.5.2024** — הפועל 0:2 מ.ס. אשדוד, וירידה לליגה הלאומית. זו הפעם השלישית בתולדות המועדון.
- **שורה בארכיון:** `matches.json`.
- **הירידה עצמה:** שלושה מקורות מאותו ערב — הארץ, וואלה ו־ONE.
- **מה צריך מסוכן DATA:** לקשור את `ירידה-2024` בקובץ `moments.json` לשורת המשחק (§7).
  - עד שזה קורה, הסצנה רצה על `placeholder` בלי ציון, כמו 1986 לפני שהשורה נחתה (כלל 49).

### Story Brief
**מאי 2024**
“היית פה ב־2017.”
*אתה יודע איך זה נגמר, ואיך זה ממשיך.*
tone: `loss` — בלי בדיחה

### Trigger (NPC initiative)
תלוי בחיים:
- **קובי** (actorCue `enter`, בסלון): “אני בא איתך. אם זה נגמר, אני לא רוצה לשמוע את זה בטלפון.”
- **הילד** (`life:child`): “אבא, אנחנו יורדים?”
- **יבגני / אסף** (`ULTRAS`): “הבד בשער. מי מחזיק אותו היום?”
- **חו"ל** (`life:abroad`): שעון על הקיר, והפרש שעות.

### Need
להיות איפה שצריך להיות כשזה קורה. ולא להיות לבד אחרי.

### Collision
**אין "להציל את הקבוצה."** (§19)
- המחיר היחיד הוא **איפה** פוגי עומד, **ועם מי**.
- ההתנגשות האמיתית: קובי בן 70 במדרגות של בלומפילד, מול הבד בשער. אי אפשר גם וגם.

### Approaches
| דרך | מקום | מה עושים | מחיר |
|---|---|---|---|
| **עם קובי** | בלומפילד, יציע רגיל | ללכת בקצב שלו, והמדרגות לאט (שימוש חוזר בקצב של 2026) | היציע של החבר'ה בלי פוגי |
| **עם הילד** | בלומפילד | להסביר לילד מה זה לרדת — בלי נאום (§29): לבחור מה לענות על "למה כולם שקטים?" | — |
| **בשער** | שער 5 | להחזיק את הבד עד הסוף; לבחור מתי לקפל | קובי רואה בבית |
| **בכורסה** | בבית | עם קובי (`life:armchair`) — השלט אצלו | — |
| **בחו"ל** | דירה | סטרים עם השהיה; הודעה מאופיר מגיעה לפני התמונה (שימוש חוזר במנגנון ההשהיה של 1990) | — |

### Convergence
השריקה. אין סרט ואין מספר על המסך: **הלוח מראה את מה שהארכיון נותן, או כלום.**

### Aftermath — אין נאום
- המפה פתוחה, והשחקן בוחר לאן ללכת (§19). שלוש דלתות מוארות:
  - **הקיוסק** — מתוקי סוגר מוקדם: “עונה.”
  - **הבית** — רחל: “אכלת?”
  - **שער 5** — מקפלים.
- מי שהיה ב־2017 (`2017-after` נגמר עם `life:terrace:*` או בבלומפילד) שומע מאופיר:
  > “אז זהו. לאומית.”
  > “עונה.”
  > “אמרת את זה גם ב־17.”
  > “וצדקתי.”

### State
- `life:relegation:2024:where` = `kobi` / `child` / `gate` / `armchair` / `abroad`
- `life:relegation:2024:with` = שם
- `life:miss:z05` — למי שלא ראה בכלל (עבודה, משפחה, בחירה)

### Callbacks
- `2024-home` חלק א' — השמועה על ספרא מגיעה בקיוסק, **ב־`where` שבו פוגי עמד**.
- `2025-eurocup` Z07 — העלייה: “אמרת עונה.”

### QA
- [ ] בשום מקום אין "26" ואין "אלף".
- [ ] בכל חמש הדרכים מגיעים לשריקה (`life-confused-player`).
- [ ] אין "Game Over" ואין הישג.

---

## X04 — 2023 · “יש לך יומיים, לא עשור” · `2023-visit`

### **נוסף במהדורה 2 — בנוי בקוד**
**חלון:** `life:abroad`.

**Story Brief:** “שבע קבוצות וואטסאפ, יומיים בארץ.” tone: `funny` → `warm`

**Trigger:** בקיוסק. עמית: “שלחת ‘מי באזור’ לשבע קבוצות.”

**Need:** להספיק את כולם.

**Collision:** אי אפשר.
> אופיר: “אז למה חילקת הבטחות לשבוע?”
> קרן: “תנסה להיות איפה שאתה נמצא.”

**Approaches (`x-visit`):**
- **ערב משפחה**, ולהודיע לחברים מראש — סוף `family`.
- **ערב חברים**, ולתאם עם המשפחה — סוף `friends`.
- **להבטיח שני ערבים חופפים** — סוף `overbooked`. קרן: “זאת בדיוק הבעיה.” (`broke_promise`)

**Callback:** `2025-abroad`, “הפעם אני מחכה לך”. קובי זוכר איזה ערב קיבל.

---

## T03 — 2024 · “הם מסתכלים אליך” · `2024-terrace`

### **נוסף במהדורה 2 — בנוי בקוד**
**חלון:** `own:route:ULTRAS:practice`.

**Story Brief:** “שער 5 נבנה מחדש. גם אתה.” tone: `tense`

**Trigger:** ביציע של בלומפילד המחודש. אסף:
> “תראה אותם.”
> “מה?”
> “מחכים שתסביר מה עושים.”
> “חשבתי שאתה מסביר.”
> “היום אני עוזר לך.”

**Approaches (`t-lead`):**
- **לחלק תפקידים**, לשאול מי יכול, ולבצע — `leadership_proof`.
- **לבקש חניכה** בתפקיד אחד, במקום להעמיד פנים — `mentored`.
- **ליציאה** — `exit`, בלי עונש.

**שעה במשחק:** 2024 בלי תאריך. **מהדורה 2 ממליצה** להצמיד את T03 לעונה 2024/25 בלאומית:
- "הם מסתכלים אליך" נאמר ביציע של קבוצה שירדה;
- ומי שמוביל ביציע בעונה כזאת מוביל משהו אחר ממה שמובילים בעונה רגילה.

שורה אחת נוספת, מאסף: “בלאומית שומעים אותך יותר טוב. פחות אנשים.”

**Callback:** T02 (2012) — מי שהאציל ליבגני מוצא אותו פה, עם בד משלו.

---

## I04 — 2024 · “כשלא מסכימים” · `2024-lina`

### **נוסף במהדורה 2 — בנוי בקוד**
**חלון:** `life:international` + `life:intl:met` (לינה וניקו מ־2010, C14).

**Story Brief:** “ארבע־עשרה שנה אחרי, בטלפון.” tone: `tense`

**Trigger:** לינה מתקשרת: “קראתי מה כתבת, ולא הבנתי למה התכוונת.”

**Need:** לשמור על חברות גם כשהעולם צועק.

**כלל הכתיבה:** הפרק **לא נוקב בנושא**, ולא צריך. זו שיחה על **איך** חברים לא מסכימים, לא על מה.

**Approaches (`i-call`):**
- **להסביר, ולשאול מה היא שמעה** — “עכשיו אני מבין למה.”
- **להגדיר גבול** ולעצור — “נדבר כשנוכל להקשיב.”
- **להמשיך סביב תחום אחר** — “בלי להעמיד פנים שהכול נפתר.”

**Callback:** `2026-plan` — מי שנשאר בקשר עם לינה מקבל ממנה הודעה ביום הנסיעה: “תגיד לאבא שלך שלום מאיתנו. מכל היציעים.”

---

## 2024–2025 · “איפה הבית?” · `2024-home` — פרק ראשי חדש

### **חדש במהדורה 2**
הפרק מאחד שלושה סעיפים מהמהדורה הראשונה:
- "FOOTBALL 2024 — מי קונה קבוצה שירדה?"
- "BASKET 2024 — יד אליהו"
- חלק מ־§25

### למה פרק אחד
§25 אומר שהמשחק צריך להראות **שני סיפורי בעלות במקביל**. שני פרקים נפרדים מראים אותם **בזה אחר זה**.

פרק אחד, שנה אחת, בעיר אחת, מראה אותם כמו שאוהד חווה אותם: **באותה קבוצת וואטסאפ.**

### רישום
```
id: '2024-home', stage: 'C', unit: 'H24a–H24c'
titleHe: 'איפה הבית?'
dateHe: 'יולי 2024 – ינואר 2025', year: 2024
start: { location: 'kiosk', spawn: 'start' }
anchorKey: '2024-safra' (חדש) · שני עוגנים נוספים ב־anchor-server: '2025-menora'
next: '2025-eurocup'
matchRitual: 'none' לחלק א' · MATCH_RITUALS['2024-home'] לחלק ג' (המשחק הראשון במנורה, למי שהולך)
```

### Story Brief
**2024**
**ירדנו. ואז הופיע עוד בעלים.**
**הקבוצה השנייה גדלה. האולם קטן.**
*שני מועדונים, צבע אחד, ושאלה אחת:*
*מה קונים כשקונים קבוצה?*
tone: `dry` → `tense`

---

### חלק א' · יולי–אוגוסט 2024 · הכדורגל — “חתום? מאושר?”

**Historical anchor:** 12.7.2024 — הודעה על סיכום. 15.8.2024 — אישור ועדת העברת הזכויות בהתאחדות (§7 #22–23).

**Scene A1 — הקיוסק (Trigger: מתוקי)**
מתוקי מגלגל עיתון:
> “ספרא קונה.”
> פוגי: “מי זה ספרא?”
> מתוקי: “זה בדיוק השאלה ששאלו על כל הקודמים.”

אם `life:relegation:2024:where` = `gate`:
> “ראיתי אותך מקפל את הבד. תשמור אותו, אולי נצטרך אותו שוב.”

**Scene A2 — לוח העובדות (Journalist mechanic, פתוח לכולם בגרסה קלה)**
על הקיר בקיוסק, לוח שעם. ארבעה כרטיסים מגיעים לאורך הקיץ, כל אחד בביט `clock` משלו:
1. “שמועה: משקיע יהודי מחו"ל.” — CLAIM
2. “12.7 — המועדון: סוכמה רכישה.” — ANNOUNCED
3. “חוזה נחתם.” — SIGNED (בלי תאריך יום, כי המקור מקורב ולא מדויק)
4. “15.8 — ההתאחדות אישרה.” — APPROVED

**המשחק:** לתלות כל כרטיס בעמודה הנכונה: שמועה / הודעה / חתום / מאושר.
- **אין טעות שמכשילה.** כרטיס בעמודה הלא נכונה מקבל מאופיר: “תלית את זה לפני שזה קרה.”
- מי שעוקב עד "מאושר" מקבל `knowledge +`. עיתונאי מקבל גם `journalism_proof`.

**Scene A3 — הבחירה הרגשית (לא “אתה בעד?”)**
בסוף הקיץ, עמית בקיוסק: “נו, מה אתה אומר?”
- **“אני מקווה. בזהירות.”** → `life:ownership:football` = `hope-careful`
- **“לא מתאהב במסיבות עיתונאים.”** → `refuse-hope`
- **“מה שמעניין אותי זה ההרכב.”** → `football-first`
- **“רוצה לראות מה כתוב במבנה.”** → `structure`

**Fail-forward:** מי שלא נכנס לקיוסק כל הקיץ שומע את זה מקובי בטלפון, בשורה אחת: “קנו את הקבוצה. תגיד לי אם זה טוב.” (`absent`)

---

### חלק ב' · אוקטובר–דצמבר 2024 · הכדורסל — “עד אז מה?”

**Historical anchor (§7 #24–26):**
- 9.10 — העמותה תצביע, בתנאים.
- 10.12 — כ־400 מנויי אולטראס לא מעבירים מנוי.
- 18–20.12 — הבורר: ערבות של 25 מיליון לשיפוץ; ווטו רק מהעונה הבאה.

**כלל הכתיבה (נשמר מהמהדורה הראשונה, וחוזק):** אף צד אינו “האמת”. המשחק מציג ארבעה טיעונים, כל אחד **בפה של דמות בדיונית שאכפת לה**:

| טיעון | מי אומר | השורה |
|---|---|---|
| **צמיחה** | **נציג הבעלים** — בדיוני, מנהל קשרי אוהדים | “האולם הזה נבנה לקבוצה בליגה א'. אנחנו כבר לא שם.” |
| **זהות / קהילה** | **יבגני** (ULTRAS) או **גל** | “היכל שכל השנים שרנו נגדו. זה לא אולם, זה משפט.” |
| **נוהל / זכויות** | **נציג העמותה** (מ־Z03b) | “השאלה היא לא אם לעבור. השאלה היא מי מחליט.” |
| **אוהד שנתקע באמצע** | **מתוקי** | “אני רוצה לראות כדורסל. תגידו לי איפה ואני מגיע.” |

**Scene B1 — הדרייב אין, אחרי משחק (Trigger: אפי, `actorCue approach`)**
> אפי: “אנחנו באמת לא נכנסים פה.”
> מישהו מאחור: “אז מרחיבים.”
> אחר: “עד אז מה?”

אם `life:drivein:first-night`:
> אפי: “שורה שבע. עשר שנים. ועכשיו אומרים לי שהיא קטנה.”

**Scene B2 — פגישה פתוחה, על הפרקט של הדרייב אין** *(בקוד: באולם עצמו ולא בחדר הקהילה — לשני החדרים אותה דלת צבועה ברחוב, ובאותה שנה אסור ששתי דלתות יחלקו אותה)*
פוגי בוחר **דאגה אחת** להעלות:
- מקומות
- זהות
- זכויות
- ערבות לשיפוץ
- מקומות לקבוצה האורחת
- כסף

נציג הבעלים עונה על כל דאגה בשורה עניינית אחת. הוא לא נבל ולא קדוש.

**מי ששאל על האולם ב־2023** (`life:assembly:asked-venue`) שומע מנציג העמותה:
> “ביולי שאלת אותי מה קורה אם רוצים להעביר אולם.”
> “ואמרת שנדבר כשזה יגיע.”
> “הגיע.”

**Scene B3 — המנוי (המכניקה המרכזית, מבוססת על #25)**
- הטלפון: “העבר את המנוי שלך למנורה” — כפתור.
- מסביב פוגי, בחדר ובוואטסאפ, כל אחד מחליט.
- **שלוש דרכים ודרך רביעית:**
  - **להעביר** — `h24:ticket=moved`. יבגני לא אומר כלום, וזה מה שמכאיב.
  - **לא להעביר** — `h24:ticket=held`. נציג הבעלים, בשורה פומבית בקבוצה: “מי שלא מעביר — מקומו שמור. אבל לא לעולם.” (בדיוני)
  - **לחכות לבוררות** — `h24:ticket=waiting`. הביט `h24-ruling` (clock, 20.12) מגיע עם כרטיס עובדה: **ערבות 25 מיליון; ווטו מהעונה הבאה.** ואז שואל שוב.
  - **(למי שאין מנוי)** — השאלה היא אם לקנות כרטיס בודד למשחק הראשון. פחות דרמה, אותה החלטה.

**Scene B4 — המחאה (אופציונלי, רק ל־ULTRAS / מי ש־`held`)**
הכנת שלט: מיני־גיים באנר/סטנסיל (1995/2001), שימוש חוזר.
- **הטקסט נבחר מתוך שלוש שורות של המשחק.** אין כתב חופשי ואין ציטוט של שלט אמיתי:
  - “הבית זה אנחנו”
  - “לא למכירה”
  - “עד שנחזור”
- מי שלא רוצה מחזיק את הצד השני של הבד. זה גם תפקיד.

---

### חלק ג' · 11.1.2025 · “קופות סגורות” (Convergence)

**Historical anchor (§7 #27):** משחק הבית הראשון בהיכל מנורה, מול הפועל ירושלים. קופות סגורות.

**Match Ritual:** רק למי שהולך. הארון שואל מה ללבוש. **חולצת 2007 של אוסישקין** (אם יש) מקבלת שורה: “לשם? בזאת?”

**Approaches:**
| דרך | מה קורה |
|---|---|
| **הולך** (`moved` / כרטיס) | היכל ענק בצבע אדום. פוגי עומד בכניסה ומסתכל על הכיסא בשורה הראשונה, שהיה של מישהו אחר כל השנים. **שורה אחת, בלי שם:** “פעם ישבו פה אחרים.” |
| **נשאר בחוץ** (`held`) | יבגני/אפי באולם ריק בדרייב אין, או בבר עם מסך. השקט הוא הסצנה. |
| **בבית** | עם קובי: “אני הלכתי ליד אליהו ב־93. גמר. עם מישל.” (חוט `1993-cup`) |
| **חו"ל / עבודה** | הודעה מגל: “מלא. אני לא יודע אם לשמוח.” |
| **מתלבט עד הרגע** | הביט `h24-door`: פוגי בכניסה, והכרטיס בטלפון. **נכנס / מסתובב.** בלי עונש לשום צד. |

**Aftermath — Relationship (לא עם אדם אמיתי, §29):**
- `communityTrust` — העמותה
- `terraceReputation` — היציע (ULTRAS)
- `clubOwnershipTrust` — המועדון כמוסד
- `publicReputation` — ציבור

כל דרך מזיזה **שניים** מהם בכיוונים הפוכים. אין דרך שמזיזה את כולם למעלה.

### State
- `life:ownership:football` (חלק א')
- `h24:concern` (חלק ב')
- `h24:ticket` → `life:menora:2025` = `went` / `outside` / `home` / `abroad` / `turned`
- `remember: yevgeny · menora-2025` · `remember: efi · menora-2025` (עם `eventId` לפי הדרך)
- `life:miss:h24-c` — למי שלא היה בשום צד

### Personal-life variant
- **ילד:** “למה זה גדול כל כך?” — ואז “איפה נשב?” (הילד לא יודע שיש ויכוח; הוא שומע את זה מפוגי או לא).
- **בן/בת זוג:** “ביקשת שנלך למשחק ראשון. זה הוא?”
- **עבודה:** משמרת 11.1, ו־`favour` מהבוס (כלל 72: משבצת טובה, לא ברז).

### Regular-supporter version
- חלקים א' ו־ג' מלאים.
- חלק ב' מצטמצם ל־B1 ול־B3 (למי שיש מנוי, או שאלת הכרטיס הבודד).
- זה מספיק כדי שההחלטה תהיה שלו.

### Fail-forward
- מי שפספס הכול מקבל ב־`2025-eurocup` את השורה של אפי: “לא היית בשום צד. גם זה צד.”

### QA
- [ ] **אין שורת דיאלוג** עם `who: 'ינאי'`, `who: 'ספרא'` או `who: 'זיידנברג'`. בדיקה חדשה ב־`tests/life-real-people.test.ts` (§29).
- [ ] אין "סושי", אין "91%", אין "הצבעה ברוב גדול".
- [ ] "25 מיליון" מודפס רק בכרטיס העובדה של 20.12.
- [ ] כל חמש הדרכים בחלק ג' מגיעות ל־`2025-eurocup`.
- [ ] `life:worldlines` — הקו הריק מגיע לסוף; ULTRAS ו־Founder מגיעים לסוף.
- [ ] `life:orphans` — כל שיחה חדשה נקראת.

---

## Z06–Z07 — אביב 2025 · “מהאולם הקטן לאירופה” · `2025-eurocup` (הרחבה)

### Historical anchors
- **Z06:** 11.4.2025 — גמר היורוקאפ, משחק 2: גראן קנאריה 94:103 הפועל, 2:0 בסדרה (§7 #28).
- **Z07:** 2024/25 — אלופת הלאומית ועלייה (§7 #29), בלי ערב.

### מה כבר בנוי
`z-euro` בבית, ואחריו `z-up` בקיוסק.

מהדורה 2 מוסיפה **גרסאות לפי `life:menora:2025`** ו**חוט של ספרא**. לא נוסף מבנה.

### Emotional convergence
1984/1991 אוסישקין → 2007 הריסה → 2015 דרייב אין → 2023 בעלים → 2024 מנורה → 2025 אירופה.

### Z06 — מי מקבל את הרגע?
| `life:menora:2025` | איפה פוגי | מה משתנה |
|---|---|---|
| `went` | בבית, מול מסך (הגמר בחוץ) | הילד/קובי לידו. |
| `outside` | בר עם מסך, עם יבגני/גל | **הבחירה הקריטית:** לשמוח בקול / לשמוח בשקט / לצאת רגע החוצה. |
| `home` | עם קובי | קובי: “אוסישקין לא היה נכנס לאירופה.” — “הוא לא היה צריך.” |
| `abroad` | דירה, סטרים | אפי מתקשר בשריקה, לא פוגי (actorCue). |
| — (ילד) | מה שהילד בוחר | אם הילד נרדם, פוגי מחליט אם להעיר אותו. |

**הדיאלוג עם אפי — הלב של הפרק (נשמר מהמהדורה הראשונה):**
> אפי: “אתה שמח?”
> פוגי: “כן.”
> אפי: “אז למה אתה נראה כאילו אתה מתנצל?”

תשובות:
- “כי אני עדיין כועס.” → `life:eurocup:feeling=angry`
- “כי התגעגעתי.” → `missed`
- “כי שניהם נכונים.” → `both`

**גרסת 2023:** מי שהצביע נגד (`life:ownership:basket:vote=against`) שומע מאפי:
> “הצבעת נגד.”
> “כן.”
> “ועכשיו?”
> “עכשיו אני שמח נגד.”

### Z07 — העלייה (הכדורגל), בקיוסק
הקיוסק, בלי ערב (כלל 11). מתוקי תולה דף: **“לאומית 2024/25 — מקום 1.”**

**חוט ספרא (`life:ownership:football`):**
| ערך | השורה של עמית |
|---|---|
| `hope-careful` | “נו, מותר כבר לשמוח?” — “בזהירות.” — “זה מה שאמרת בקיץ.” |
| `refuse-hope` | “אמרת לא להתאהב.” — “לא התאהבתי. עלינו.” |
| `football-first` | “אמרת שמעניין אותך רק ההרכב.” — “והיה צודק.” |
| `structure` | “קראת בסוף מה כתוב במבנה?” — “עדיין קורא.” |
| `absent` | קובי בטלפון: “אמרתי לך שתגיד לי אם זה טוב. אז?” |

וחוט **"עונה"** (§P02, Z05):
> “אמרת עונה.”
> “אמרתי.”

### State
- `life:eurocup:feeling`
- `life:promotion:2025:heard` = `kiosk` / `phone`

### QA
- [ ] אין ציון ליגה ואין תאריך לעלייה.
- [ ] "94:103" רק מתוך שורת הארכיון.
- [ ] כל ערך של `life:menora:2025` מקבל גרסה, כולל ריק.

---

## J03 — 2025 Interview · `2025-interview` — **תוקן במהדורה 2**

### Journalist apex
**מה השתנה:** המהדורה הראשונה הציעה “ראיון עם דמות ציבורית אמיתית בדיאלוג בדיוני מסומן”. זה נפסל (§29).

**הראיון הוא עם מנכ"ל בדיוני של מועדון בדיוני בליגה**, או עם נציג בעלים בדיוני. השאלות על העולם האמיתי מגיעות מהעיתונאי. התשובות מגיעות מדמות שהמשחק ממציא, **והמשחק אומר את זה בקרדיט**.

### השאלות
צמיחה / קהילה / כסף / אולם / זהות.

### Challenge
- **שאלת המשך, לא ציון.**
- מי שהחזיק את הלוח של `2024-home` (FACT/CLAIM/SIGNED/APPROVED) מקבל שאלת המשך חמישית: **“מי אישר, ומתי?”**

---

## OWNER branch — 2025 · `2025-owner`

**Alternate-fiction מוצהר.** תקציב / קשרי אוהדים / ספורט / צוות.

### Strong connection
- **תקופת ספרא/ינאי היא הרקע**, כי ב־2024 פוגי **ראה** שני מודלים של בעלות.
- ב־`2025-owner` הוא מנהל מועדון **בדיוני**, והבחירות שלו מהדהדות את מה שהוא סימן ב־Z03b.
- **חוט:** מה שסימן בדף של 2023 (`life:ownership:basket:kept`) הופך לשלושה סעיפים בטיוטת "אמנת האוהדים" שלו. הוא יכול לשמור אותם או למחוק.

---

## 2025 Abroad — “הפעם אני מחכה לך”

### Kobi
The invitation reverses.

### Pugi personal state
work/partner/child may complicate planning.

---

## F00–F01 — 2026 Plan · “לא מבטיחים לפני שסוגרים”

> **מהדורה 2:** הפרק נפתח על העוגן `2025-promotion` (הכדורגל חזר לליגת העל, §7 #29), אבל הכדורגל הוא רקע.
> מה שמניע את התוכנית הוא הכדורסל. שורה אחת בקיוסק מחברת בין השניים. מתוקי:
> “הכדורגל חזר, הכדורסל נוסע. תחליט אחרי מי אתה רץ.”
> זו לא בחירה במשחק. זו בדיחה על החיים שלו.

### Major Quest
- travel dates.
- tickets.
- Kobi comfort.
- money.
- passport.
- work leave.
- child/partner.

### Mini-game
Packing list as memory-object selection.

### Callback items
- first shirt;
- ticket;
- scarf;
- Supergoal;
- Ussishkin memory;
- photo.

---

## F02–F04 — 7.5.2026 · “היום אתה אחריי”

### Opening
Pugi:
> “כרטיסים אצלי.”

Kobi:
> “בדקת?”

Pugi:
> “שלוש פעמים.”

Kobi:
> “אז פעם אחת יותר מדי.”

### Movement
Pugi leads route.
Kobi follows.

### Final choices
- slow down.
- keep walking.
- offer arm.
- joke.
- say nothing.

### Old callback
Kobi:
> “אתה יודע לאן הולכים?”

Pugi:
> “כן.”

Pause.

> “הפעם כן.”

### Ending
No score-dependent ending.

The emotional ending:
1983 — child behind father.  
2026 — father behind child.

### **תוספת מהדורה 2 — הערב נגמר בהפסד בהארכה (§7 #30)**
81:87 לריאל מדריד בהארכה. ריאל עולה לפיינל פור 3:1 בסדרה. זה העוגן, והוא לא משתנה (§19).

**הסוף לא תלוי בתוצאה, אבל הוא יודע אותה.** מה שקורה ביציאה מהאולם:
- קובי, בחוץ, בלילה של בולגריה: “הארכה.”
- פוגי: “הארכה.”
- קובי: “ב־86 חיכינו עד דקה 86. היום חיכינו עד אחרי ה־40.”
- *(שתיקה)*
- קובי: “אתה יודע לאן הולכים?”
- פוגי: “כן.”
- “הפעם כן.”

**למה זה עובד:** שני המשחקים של החיים של קובי ופוגי יחד — 1986 ו־2026 — נגמרים ברגע שבו חיכו יותר ממה שחשבו.
- ב־1986 זה הלך לכיוון אחד, ב־2026 לכיוון השני.
- **היד היא אותה יד.**

**QA:** אין "ניצחון", "עלינו" או "פיינל פור שלנו" בשום מחרוזת של `2026-finale`. `81:87` רק מתוך `basketball-matches.json`.




# 13. החיים האישיים של פוגי — ציר מלא

החיים האישיים אינם Side Quest.
הם המערכת שמייצרת מחיר למשחקים.

## Teen years
- friends;
- first independence;
- money;
- army.

## 2000s
- work identity;
- travel;
- possible studies;
- friendships.

## 2011–2013
- relationship candidates;
- work vs football;
- household;
- child intent.

## 2015–2018
- work responsibility;
- relationship fatigue;
- possibility of separation/rebuild;
- distance route.

## 2021
- promises;
- child first match;
- home rituals.

## 2023+
- aging parent;
- own child;
- abroad;
- work stability;
- nostalgia.

---

# 14. Work system as drama

לא “עבודה = כסף אוטומטי”.

בפרקים חשובים:
- shift collision;
- boss favour;
- leave request;
- promise to colleague;
- career opportunity.

## Work-first player
must get unique scenes, not penalty:
- colleague helps;
- money is easier;
- attendance harder;
- professional callbacks stronger.

---

# 15. Parenthood

## Before child
choice must require mutual intent, not click.

## First years
matches become:
- noise;
- bedtime;
- babysitting;
- partner workload.

## First match
reuse Kobi/Pugi mirror:
- shirt;
- snack;
- exit;
- child may want to leave early.

Do not force child to love Hapoel.

That is important.

---

# 16. Friendship system

Friends can:
- invite;
- refuse;
- be busy;
- grow apart;
- return.

No friend should exist only when quest needs them.

At least 2 callbacks per decade for core friends.

---

# 17. Reusing mini-games intelligently

## Football highlight
Use only when moment benefits from physical agency.
≤60 sec.

## Hoops
1991 / 2015 / 2025.

## Penalty
1999/2000 if appropriate; historical outcome cannot fail.

## Moment puzzle
1998 shoelaces / historical observation.

## Confetti craft
2004–06 / 2015 Drive In / celebration prep.

## Banner/stencil
1995 terrace / 2001 Ultras / 2024 protest.

## Supergoal
1985 temptation; later nostalgic callback.

## Wardrobe
every attended match.

## Map reveal
childhood and major life moves.

## Red Box
period transitions / memory payoffs.

---

# 18. Difficulty without frustration

THE WORKER should be challenging in **priorities**, not in pixel hunting.

Good challenge:
- choose 2 of 4;
- limited money;
- limited time;
- conflicting promises;
- incomplete information;
- people with own schedules.

Bad challenge:
- hidden hotspot;
- wait 20 min;
- random failure;
- “guess what writer wanted”.

---

# 19. Failure philosophy

No Game Over for life choice.

Failure:
- miss match;
- arrive late;
- relationship hurt;
- money gone;
- route closes;
- someone else takes role;
- promise broken.

Then story continues.

Historical failure:
never changes recorded result.

---

# 20. Technical implementation principle

## Do not build Quest Engine v2.

Add metadata only:

```ts
type QuestDef = {
  id: string
  chapter: string
  tier: 'major' | 'dynamic' | 'beat'
  trigger?: string
  needHe: string
  approaches: QuestApproach[]
  collisionIds?: string[]
  convergence?: string
  callbacks?: string[]
  storyBrief?: StoryBriefDef
}
```

Execution stays:
- Beat
- Conversation
- Events
- Director
- Map
- callbacks

---

# 21. Story state conventions — מיושר מול המנוע (מהדורה 2)

המהדורה הראשונה הציעה `life:q:<quest>:*` ו־`life:npc:<who>:<memory>`. **שתיהן מתנגשות במה שהמנוע כבר עושה**, ולכן אינן בשימוש.

**מה שורד מעבר פרק** (`personFlags` ב־`lib/life/events.ts`) הוא רק מה שמתחיל ב־:
- `life:`
- `onboard:`
- `cutscene:`
- `prologue:`
- `own:`
- `went:`
- `owe:`
- `promise:`
- `album:`
- `scarf:`

**כל השאר הוא דגל יום, והוא נמחק ב־`year.entered`.**
- `life:worldlines` מדווח `STALE_READ` על קריאה של דגל יום בפרק אחר (כלל 84).
- `npc:` אינו ברשימה. `life:npc:` היה שורד, אבל היה יוצר מערכת זיכרון שנייה.

| צורך | הצורה הנכונה | דוגמה |
|---|---|---|
| מצב בתוך הפרק | קידומת קצרה של הפרק | `z:role`, `d10:mode`, `h24:ticket` |
| החלטה שהחיים זוכרים | `life:<נושא>` (+ `flagValue`) | `life:ownership:football = hope-careful` |
| איפה היית כשזה קרה | `life:<אירוע>:where` | `life:relegation:2024:where` |
| מה אדם זוכר עליך | `{ e: 'remember', who, eventId: '<מה>-<שנה>' }`, נקרא ב־`relationshipMemory` | `efi · menora-2025` |
| למה פספסת | `life:miss:<id>` = סיבה (`lib/life/missReason.ts`) | `life:miss:z-assembly = work` |
| הבטחה | `promise:<id>` | `promise:kobi-2026` |
| משהו שבבעלותך | `own:<id>` | `own:outfit:2024-home` |
| מקום שנסגר | `life:place:<id>` (`placeLifecycle.ts`) | `life:place:ussishkin = demolished` |

**אין שישה כינויים לאותה עובדה.** כשדגל ישן משנה משמעות, הוא עובר דרך `LEGACY_FLAG_ALIASES` ב־`events.ts`, כמו `life:a2:efi` → `life:efi:met`.

---

# 22. Active NPC rules

Use `actorCue` only for authored moments:
- Kobi shirt.
- Efi invitation.
- Oli car.
- partner interruption.
- Kobi 2023 call.
- fan argument 2024.

No general AI.

---

# 23. Story Brief registry — כל Major Quest

Story Brief הוא ה־`bridge` הקיים ב־`ChapterDef` (`titleHe`, `subHe`, `ms`), מורחב. אין מערכת סרטים שנייה.

| פרק | כותרת | שורה | חזותי קיים | יעד | tone | מ"ש |
|---|---|---|---|---|---|---|
| `a4-shirt` | החולצה הראשונה | “שלושים שקל. יש לך שש.” | `shirtVisa86`, הפחית | הקיוסק | warm | 3.0 |
| `1986` | להגיע לבלומפילד | “אבא יצא לפני עשר דקות.” | שער 7, כרטיס | בלומפילד | tense | 3.5 |
| `1990` | כמה צריך? | “שלושה מקורות, ואף אחד לא מסכים.” | רדיו, עיתון | הרחוב | tense | 3.0 |
| `1991` | יש עוד בית | “אמא אמרה לא.” | פתק “היום אוסישקין?” | אוסישקין | warm | 3.0 |
| `1996-army` | אין מקום אחד לעמוד בו | “האוטובוס כבר ברציף.” | תחנה | שער 5 | tense | 3.5 |
| `1999-cup` | שש־עשרה שנה | “1983. אבא. עכשיו אתה.” | כרטיס 1983 | רמת גן | memory | 3.5 |
| `2000-double` | הדאבל | “ארבעה ימים אחרי.” | צעיף | רמת גן | warm | 3.0 |
| `2002-europe` | העולם שמע עלינו | “מילאנו. כמה זה עולה?” | מפה | הבית | funny | 3.0 |
| `2007-table` | הדף מהקיוסק | “קבוצה. מאפס.” | הדף | חדר הקהילה | warm | 3.0 |
| `2007-registered` | חודש אחד | *(בלי שורה)* | אבק | אוסישקין | loss | 4.0 |
| `2010-teddy` | עד שהטלפון נופל | “דקה 92.” *(רק אחרי)* | רכב של אולי | טדי | tense | 3.0 |
| `2013-household` | היומן שעל המקרר | “שבעה ערבים. ארבעה כבר תפוסים.” | יומן | הבית | dry | 3.0 |
| `2015-newhall` | פותחים בית חדש | “הפעם מישהו אחר חתך את הסרט.” | `drive-in` | הדרייב אין | warm | 3.0 |
| `2016-crisis` | מה בעצם קרה | “הטלפון לא מפסיק.” | לוח עובדות | הקיוסק | crisis | 3.0 |
| `2021-promises` | אמרת שתחזור | “הבטחת לו ב־2013.” | היומן | הבית | memory | 3.0 |
| `2023-quiet` Z05 | עונה | “היית פה ב־2017.” | בלומפילד החדש | בלומפילד | loss | 3.0 |
| **`2024-home`** | איפה הבית? | “ירדנו. ואז הופיע עוד בעלים.” | לוח שעם, הטלפון | הקיוסק | dry→tense | 4.0 |
| `2025-eurocup` | מהאולם הקטן לאירופה | “שמונה־עשרה שנה אחרי האבק.” | מסך, הבד של 2015 | הבית | warm | 3.0 |
| `2026-plan` | לא מבטיחים לפני שסוגרים | “הכדורגל חזר. הכדורסל נוסע.” | הקופה | הקיוסק | funny | 3.0 |
| `2026-finale` | היום אתה אחריי | “כרטיסים אצלי.” | הרציף | בוטבגרד | memory | 3.5 |

---

# 24. New required chapters — ההכרעה (מהדורה 2)

המהדורה הראשונה מנתה שבעה פרקים חסרים והשאירה פתוח אם להוסיף שבעה פרקים לרישום. **ההכרעה:**

| # | מה נדרש | איפה הוא גר | למה |
|---|---|---|---|
| 1 | פתיחת הדרייב אין | `2015-newhall` — Phase 0–5 (§11.N05) | הפרק כבר מתחיל בתוך האולם. חסר לו רק הערב הראשון. |
| 2 | כניסת הבעלים לכדורסל | `2023-tournament` — Z03b | אותו חדר ואותה שאלה כמו `z-grow`. |
| 3 | ירידת הכדורגל | `2023-quiet` — Z05 | העוגן של הפרק הוא כבר `2024-relegation`. |
| 4 | רכישת ספרא | **`2024-home`** חלק א' | אין פרק ראשי ב־2024. כל פרקי 2024 הם חלונות. |
| 5 | מנורה / יד אליהו | **`2024-home`** חלקים ב'–ג' | באותו חורף, ובאותה קבוצת וואטסאפ (§25). |
| 6 | עליית הכדורגל | `2025-eurocup` — Z07 | `z-up` בקיוסק כבר אומר “לעלות זה להתחיל שוב”. |
| 7 | יורוקאפ, חרם, תשלום | `2025-eurocup` — Z06 | הבסיס כבר קיים. נוספות גרסאות לפי `life:menora:2025`. |

**פרק רישום חדש אחד** (`2024-home`) ו**חמש הרחבות.** הקצב של הציר הראשי נשמר: פרק ראשי אחד לכל שנה, מ־2023 עד 2026.

---

# 25. Safra vs Yannay — narrative contrast, not political/editorial verdict

The game can show two simultaneous ownership stories:

## Football
- relegation;
- uncertainty;
- Safra acquisition;
- quiet rebuilding;
- promotion.

## Basketball
- fan-owned legacy;
- Yannay investment;
- ambition;
- arena move dispute;
- supporter split;
- EuroCup success.

The game must not say:
“this owner is good / this owner is bad.”

It should ask:
**What does an ordinary supporter do when success, money, identity and ownership pull in different directions?**

---

# 26. Historical research notes for writers — מאומת (מהדורה 2)

## הדרייב אין
- **24.12.2014** — חנוכה עירונית, 3,400 מקומות. נציגי הפועל לא היו שם, ואוהד שצעק לעבר ראש העירייה הוצא.
  - **במשחק:** "אוהד צעק" מותר כאווירה, בלי שם ובלי ציטוט.
- **4.1.2015** — המשחק הראשון: 81:67 על הפועל ירושלים.
- **שם האולם.** אוהדים קיוו לשם שמנציח את אריק איינשטיין; בוויקיפועל יש ערך "אולם אריק איינשטיין". בפועל ניתנה חסות, והאולם נקרא היום "היכל קבוצת שלמה".
  - **לא לתארך את מתן החסות** — לא נמצא תאריך מאומת.

## עופר ינאי
- **19.7.2023** — 51% ינאי, 30% זיידנברג, 19% העמותה.
  - **כסף:** כ־30 מיליון ₪ בחתימה.
  - **מה נשאר לעמותה:** דירקטוריון, נוער, נשים, קהילה.
- **אוגוסט 2023** — אספת חברים והצבעה. **התוצאה לא אומתה.**
- **9.10.2024 → 11.1.2025** — מסלול המעבר למנורה: הצבעה מותנית, ~400 מנויים שלא הועברו, בוררות, ערבות של 25 מיליון, משחק ראשון.
- **28.8.2026** — ירידה ל־40% בחברת הבעלות. **מחוץ לטווח העלילה.**

## ספרא
- **12.7.2024** — הודעה על סיכום.
- **~10.8.2024** — חתימה (לפי מקור אחד; בלי יום במשחק).
- **15.8.2024** — אישור ועדת העברת הזכויות.
- **2024/25** — אלופת הלאומית ועלייה.

## מה לא נמצא, ולכן לא נכנס
- טקס 2.1.2015 עם 2,000 אוהדים.
- 26 אלף בירידה.
- מחאת "שקט / סושי / כסף" בנובמבר 2024.
- "רוב גדול" בהצבעת העמותה.
- קריאה רשמית לחרם בינואר 2025.

כל אחד מהם נכנס **רק** אם שורה בארכיון תביא אותו (כלל 11).

---

# 27. QA — full-life test matrix

Run:
- regular supporter;
- Ultras;
- Founder;
- Journalist;
- Owner;
- Traveller;
- Abroad;
- Distance-return;
- Parent;
- no-child;
- Work-first;
- Relationship-first;
- Low-money;
- High-money;
- broken-promises;
- minimal-interaction;
- boycott;
- anti-boycott/attend;
- Safra-cautious;
- Safra-hopeful.

Fail if:
- quest has only one meaningful action;
- route is “easy win”;
- regular supporter gets less story;
- real figure dialogue reads like real quotation without attribution;
- historical event changes based on player;
- player waits passively;
- callback disappears;
- promise never closes;
- map reveals future knowledge;
- repeated mini-game becomes grind.

---

# 28. Definition of “production ready chapter”

A chapter is ready only if it contains:

- Story Brief.
- Trigger.
- Need.
- Collision.
- 2–5 approaches where appropriate.
- NPC initiative.
- at least one system used meaningfully.
- historical anchor.
- route variants.
- personal-life variant.
- regular-supporter version.
- fail-forward.
- memory.
- callback target.
- technical state list.
- QA cases.
- no passive wait.
- no fake choice.

---

# 29. Final tone bible

## Humor
Dry, human, specific.

Good:
> “גם אלופים נופלים. תזיז את הנעליים.”

Bad:
> “חחח איזה אוהדים משוגעים!”

## Emotion
Objects and people, not speeches.

Good:
Kobi pushes coins back.

Bad:
> “אני גאה בך על האחריות שלמדת.”

## History
Facts are facts. Motives are attributed.

## Real people
Public actions can be represented.

**מהדורה 2 מחמירה את הכלל:** אדם אמיתי בחיים **לא מקבל שורת דיאלוג במשחק**, גם לא בדיונית ומסומנת. זה חל על בעלים, מנהלים, שחקנים ופוליטיקאים.
- **מה כן מותר:**
  - שמו בכותרת עיתון, בכרטיס עובדה או בפי דמות בדיונית;
  - מעשה ציבורי מתועד;
  - ציטוט מתועד עם מקור, בארכיון.
- **במקום הדובר האמיתי מדברת דמות בדיונית עם תפקיד:** "נציג הבעלים", "נציג העמותה", "מנכ"ל בדיוני".
- **הסיבה:** ציטוט מומצא של אדם אמיתי הוא טענה על אדם בשם (כלל 18). סימון בהערות הפקה לא מגיע לשחקן, ששומע אותו מדבר.
- **חריג אחד, שכבר קיים:** מי שמאור אישר בשמו — עומר חרמש ב־Z04 — וגם שם, בלי דיאלוג חדש מפיו.
- **בדיקה:** `tests/life-real-people.test.ts` עובר על כל `who` בכל השיחות מול רשימה ידנית של בעלים, מנהלים ונבחרי ציבור, ונופל על התאמה. שחקני הארכיון אינם ברשימה, כי חלקם דמויות שמאור אישר בשמן (כלל 67).

---

# 30. The game in one sentence

**THE WORKER הוא משחק על אדם שמנסה להיות בכל מקום שבו הפועל קורית — ואז מגלה שהחיים קורים בדיוק באותו זמן.**

---

# 31. מטריצת חוטים — מה חוזר, ומתי

חוט הוא חפץ, מילה או אדם שנכנס בפרק אחד וחוזר בפרק אחר **עם משמעות אחרת**. כל חוט חייב לפחות שתי חזרות, ובכל חזרה — קורא אמיתי בקוד (`life:worldlines` / `STALE_READ`).

| חוט | נכנס | חוזר | חוזר | סוגר | דגל / זיכרון |
|---|---|---|---|---|---|
| **הכתפיים של קובי** | 1983 (פרולוג) | 1986 — היד | 2010 טדי — הטלפון | 2026 — "הפעם כן" | `prologue:*`, `found:kobi` |
| **החולצה הראשונה** | A4 — מתנה / קנייה | A5 — הטקס הראשון | 2024 מנורה — "לשם? בזאת?" | 2026 — במזוודה | `life:first-shirt:gift`, `own:shirt:*` |
| **הצעיף** | 1986 | 1998 | 2000 | X01 — במזוודה | `scarf:*` |
| **אוסישקין** | A3 — "הבית השני" | 1991 — הערב | 2007 — אבק | 2015 → 2024 → 2025 | `life:uss:there`, `life:place:ussishkin` |
| **אפי** | A3 | 2007 — המפתח | 2015 — "גם לא ביקש להיות" | 2025 — "למה אתה מתנצל?" | `life:efi:*`, `remember: efi · *` |
| **"עונה"** | P02 — 2017 | Z05 — 2024 | Z07 — 2025 | — | שורה, בלי דגל |
| **שורה שבע** | N05 — 2015 | 2024-home B1 | 2025 — הבד מ־2015 | — | `life:drivein:first-night` |
| **שאלת האולם** | Z03b — 2023 | 2024-home B2 | 2025-owner — האמנה | — | `life:assembly:asked-venue`, `life:ownership:basket:kept` |
| **הזהירות בספרא** | 2024-home A3 | Z07 — "מותר כבר לשמוח?" | — | — | `life:ownership:football` |
| **יד אליהו** | 1993-cup — "גמר, עם מישל" | 2024-home ג' — קובי: "אני הלכתי ב־93" | — | — | `went:*` |
| **היומן** | 2013 | 2021 — ההבטחה | 2026-plan — יום חופש מהעבודה | — | `promise:*` |
| **דקה 86** | 1986 | 2026 — "היום חיכינו עד אחרי ה־40" | — | — | עוגן, לא דגל |

---

# 32. החלטות פתוחות למאור

| # | שאלה | ברירת המחדל עד שתענה |
|---|---|---|
| 1 | הפס של VISA על החולצה הראשונה: להשאיר זהב (חריג צהוב, במילים שלך) או חום? | חום (כלל 8) |
| 2 | 11.5.2024: לקשור את `ירידה-2024` לשורת המשחק, ולתת לסצנה ערב? | **בוצע 27.9** — אפשר להחזיר אם תעדיף |
| 3 | 4.1.2015, 81:67: להוסיף שורה ל־`basketball-matches.json` (שני מקורות: וואלה 5.1.2015 + ynet 11/2014) | **בוצע 27.9** |
| 4 | תוצאת הצבעת העמותה ב־2023 — יש לך מקור, או זיכרון שאפשר לצטט (כלל 18)? | המשחק לא מדפיס מספר |
| 5 | "גל", חבר עמותה צעיר — דמות חדשה אחת, או להשתמש במישהו קיים? | בקוד בינתיים בלי גל: יוסף (העמותה), אפי ויבגני נושאים את השורות |
| 6 | T03 — להצמיד לעונת הלאומית 2024/25? | כן |
| 7 | אווירת המחאה של נובמבר 2024 — אם היית שם, אתה המקור (כלל 18), וזה נכנס | בלי פרטים |

---

# 33. מקורות (נבדקו 27.9.2026)

**שורות בארכיון** (`content/manual`):
- `matches.json`
- `basketball-matches.json`
- `moments.json`
- `goals.json`
- `trophies.json`
- `association-events.json`
- `ussishkin.json`
- `fact-conflicts.json`

**מקורות חיצוניים:**
- [ישראל היום — אולם הדרייב־אין נחנך (24.12.2014)](https://www.israelhayom.co.il/article/244353)
- [וואלה — היכל הדרייב אין נחנך באופן רשמי](https://sports.walla.co.il/item/2813500)
- [ynet — נעים להכיר: האולם החדש של הפועל ת"א (22.11.2014)](https://www.ynet.co.il/articles/0,7340,L-4594709,00.html)
- [וואלה — אני ואתה נשנה את האולם (5.1.2015, 81:67)](https://sports.walla.co.il/item/2816724)
- [ערוץ הספורט — עופר ינאי רכש 51% (19.7.2023)](https://www.sport5.co.il/articles.aspx?FolderID=274&docID=443282)
- [ישראל היום — ינאי יהפוך לבעלים העיקרי (19.7.2023)](https://www.israelhayom.co.il/sport/israeli-basketball/article/14407045)
- [הארץ — הפועל ת"א ירדה לליגה השנייה אחרי 2:0 לאשדוד (11.5.2024)](https://www.haaretz.co.il/sport/israel-soccer/2024-05-11/ty-article/0000018f-684d-d9a0-a38f-ec6f06380000)
- [וואלה — הפועל ת"א ירדה לליגה הלאומית](https://sports.walla.co.il/item/3663330)
- [הארץ — סוכמה רכישת המועדון על ידי ספרא (12.7.2024)](https://www.haaretz.co.il/sport/israel-soccer/2024-07-12/ty-article/00000190-a730-d9bb-a3d5-ef3a68450000)
- [וואלה — אושרה העברת הזכויות לספרא (15.8.2024)](https://sports.walla.co.il/item/3684875)
- [וואלה — העמותה תצביע: מעבר ליד אליהו או דחייה (9.10.2024)](https://sports.walla.co.il/item/3696863)
- [ONE — אולטראס הפועל מנסה למנוע מעבר ליד אליהו](https://www.one.co.il/Article/474640.html)
- [ynet — ארגון אוהדים לא העביר את המנוי למנורה (10.12.2024)](https://www.ynet.co.il/sport/israelibasketball/article/hk36we8eje)
- [וואלה — רשמית: הפועל ת"א תעבור להיכל מנורה (20.12.2024)](https://sports.walla.co.il/item/3713203)
- [ynet — רגע לפני הבכורה ביד אליהו (10.1.2025)](https://www.ynet.co.il/sport/israelibasketball/article/rjryipr8jl)
- [Real Madrid — Onto the EuroLeague Final Four (7.5.2026)](https://www.realmadrid.com/en-US/news/basket/first-team/reports/cronica-hapoel-real-madrid-partido-4-playoff-07-05-2026)
- [Wikipedia — 2026 EuroLeague Playoffs](https://en.wikipedia.org/wiki/2026_EuroLeague_Playoffs)
- [וואלה — ינאי ירד ל־40 אחוז (28.8.2026)](https://sports.walla.co.il/item/3863838)
