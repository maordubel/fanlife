# THE WORKER — ONE RED WORLD
## תוכנית מוצר מלאה: שפה, רגש, שערים, LIFE, שיתוף, Daily, דו־קרב, "היציע שלי" וחיבור כל המערכות
**תאריך:** 27.09.2026  
**בסיס קוד שנבדק:** `maordubel/The-Worker` · `main` · SHA `ab56d3b09cb4a05113095dee31aa0feaaf794d22`

---

# 0. מטרת המסמך

המסמך הזה אינו מציע להוסיף "עוד שכבה חברתית" או להפוך את THE WORKER למשחק מובייל גנרי.

המטרה היא לחבר חכם את מה שכבר קיים למוצר אחד:

- 13 השערים.
- LIFE.
- הארכיון.
- Entity Graph.
- האוסף.
- כרטיס/פרופיל האוהד.
- Seeds / rotation / Daily / Duel / Live.
- שיתוף.
- היסטוריית משחק.
- הישגים.
- בחירות אישיות.
- זיכרונות.
- קבוצות חברים.

העיקרון:

> **THE WORKER הוא מקום שבו אוהד מספר לעצמו ולחברים שלו מי היא הפועל שלו.**

לא:
- "נצח חבר".
- "תביס".
- "תסתום לו".
- "Crush".
- Leaderboard אגרסיבי.
- Social mechanics שמכריחות משתמש להיות חברתי.

כן:
- "זאת הפועל שלי."
- "אתה עוד זוכר?"
- "מה אתה אומר?"
- "תראה לי את שלך."
- "שלח ליציע."
- "אצלכם זוכרים את זה אחרת?"
- "עוד אחד להפועל."
- "יש דברים שהראש שוכח לפני הלב."

THE WORKER חייב להיות מוצר שלם ומהנה בשני מצבים זהים בחשיבותם:

1. **סולו מוחלט** — ארבע דקות בטלפון, בלי חשבון, בלי חברים, בלי לחץ.
2. **חברתי** — אותו משחק בדיוק יכול להמשיך לדו־קרב, לדיון, לקבוצת WhatsApp או ל"היציע שלי".

ה-social לעולם לא יהיה תנאי להנאה.  
הוא יהיה **המשך טבעי של רגש שכבר נוצר בתוך המשחק**.

---

# 1. עקרונות־על

## 1.1 אהבה לפני תחרות

כל מערכת צריכה קודם לייצר:
- זיכרון.
- שייכות.
- גילוי.
- נוסטלגיה.
- גאווה אישית.
- סיפור.

ורק לאחר מכן, אם מתאים:
- השוואה.
- דו־קרב.
- קבוצה.
- Daily.
- ויכוח.

### מבחן קבלה

כל מסך תוצאה צריך לעבוד גם אם אין אפילו משתמש נוסף במערכת.

אם מסך תוצאה מרגיש חסר ללא "Share" — העיצוב שגוי.

---

## 1.2 תחרות של אוהדים, לא תחרות של eSports

לא תמיד צריך Winner.

לפעמים התוצאה המעניינת היא:

- "בחרתם 8 מאותם 11."
- "שניכם נפלתם על אותה שאלה."
- "אצלך הוא בהרכב, אצלו הוא השחקן ה־12."
- "כל הקבוצה הסכימה רק על שחקן אחד."
- "שלושה אוהדים זכרו את הספונסר; אף אחד לא זכר את היצרן."
- "את השער כולכם זוכרים. את המסירה הראשונה — כמעט אף אחד."

**Agreement / disagreement / memory pattern** חשובים לא פחות מציון.

---

## 1.3 אותו תוכן — הרבה שימושים

אסור לשכפל knowledge.

ישות אמיתית אחת יכולה להזין:

`Archive -> Trivia -> Lineup -> Goal -> Kit -> Timeline -> Red Thread -> LIFE -> Share`

למשל Match:
- Archive מחזיק את העובדות.
- Trivia שואל.
- Lineup משתמש בהרכב.
- Goal משתמש באירוע.
- Kit יודע איזו חולצה.
- Timeline ממקם אותו.
- Red Thread מחבר אותו לאנשים/עונות.
- LIFE יכול להכניס את השחקן לרגע העלילתי.
- Share card מציג מזכרת.

---

## 1.4 "חדש" אינו "אקראי"

המערכת חייבת לייצר תחושה חדשה בכל כניסה, אבל לא להפוך את הזהות של המשתמש לרולטה.

שלושה סוגי רוטציה:

### A. משחקי Run
Seed + cursor/deck:
- Trivia
- Lineup
- Kit Quiz
- Memory
- Goal
- Royal Rumble
- Hate Wall
- Archive
- Timeline / Red Thread

### B. זהות/יצירה
לא משנים את היצירה בכוח:
- XI
- Kit Collection
- Terrace identity
- Personal area

במקום random:
- challenge חדש.
- prompt חדש.
- objective חדש.
- lens חדש.

### C. Daily / History
- Blind Cow Daily.
- "היום בהפועל".
- On This Day.
- anniversary events.
- weekly chains.

---

# 2. שפת המוצר — RED VOICE

יש לבנות שכבת שפה מרכזית ולא לפזר copy עצמאי בכל קומפוננטה.

## 2.1 ארבעת המשפטים שמגדירים את המוצר

### "זאת הפועל שלי"
יצירה / זהות / בחירה:
- XI.
- חולצות.
- פתק הצבעה.
- manifesto.
- LIFE choices.

### "אתה עוד זוכר?"
ידע / זיכרון:
- Trivia.
- Lineup.
- Memory.
- Goal.
- Blind Cow.
- Timeline.

### "מה אתה אומר?"
דעה / ויכוח:
- Terrace Vote.
- Hate Wall.
- XI disagreements.
- historical debates.

### "שלח ליציע"
השיתוף האחיד.

לעולם לא "Share Result" כברירת מחדל.

---

## 2.2 טון

הטון צריך להיות:
- אוהד ותיק אבל לא מתנשא.
- משורר אבל לא קיטשי.
- מחוספס במידה.
- אוהב.
- זוכר.
- יודע לצחוק על עצמו.
- לפעמים עצוב.
- לא corporate.
- לא FIFA.
- לא "Gamification copy".

### כן

> יש דברים שהראש שוכח לפני הלב.

> עוד חולצה חזרה לארון.

> השם ברח לך. הרגע לא.

> את השער אתה מכיר. עכשיו בוא נראה אם אתה זוכר איך הוא נולד.

> על שמונה שמות אתם מסכימים. על שלושה כנראה לא תלכו לישון.

> פעם ראינו את זה מהיציע. עכשיו אתה מסדר את הזיכרון.

> יש שחקנים שעוברים. יש שמות שנשארים.

### לא

- "Awesome!"
- "You crushed it!"
- "Beat your friends!"
- "Top player!"
- "Loser".
- "Destroy".
- "Prove you're a real fan".
- "אוהד אמיתי יודע".

המערכת לעולם לא בוחנת "אותנטיות אוהד".

---

# 3. שירים ושפת היציע

מקור תוכן מרכזי:
`https://wiki.red-fans.com/index.php?title=קטגוריה:שירים`

השירים צריכים להזין את המוצר **בהקשר**, לא כקישוט.

## 3.1 Song Context Registry

להוסיף שכבת data:

```ts
type SongContext = {
  id: string
  title: string
  sourceUrl: string

  eras?: string[]
  moods: Array<
    | 'love'
    | 'belonging'
    | 'nostalgia'
    | 'goal'
    | 'entrance'
    | 'pain'
    | 'away'
    | 'hope'
    | 'memory'
    | 'identity'
  >

  entities?: string[]
  matchIds?: string[]
  playerIds?: string[]
  seasonIds?: string[]

  surfaces: Array<
    | 'home'
    | 'result'
    | 'share'
    | 'archive'
    | 'life'
    | 'profile'
    | 'daily'
  >

  shortExcerpt?: string
  attribution: true
}
```

## 3.2 כלל זכויות ותוכן

אין להעתיק בתפזורת מילות שירים מלאות.

הגישה:
1. שם השיר.
2. attribution.
3. קטע קצר מאוד כאשר מותר/נכון.
4. ברוב המסכים — טקסט מקורי ברוח התרבות ולא העתקה.

המטרה איננה להפוך את THE WORKER למאגר lyrics; הוויקי נשאר המקור.

---

# 4. Context Voice Engine

מומלץ:

```text
lib/voice/
  contexts.ts
  messages.ts
  songs.ts
  select.ts
  types.ts
```

כל אירוע במוצר יוכל לבקש:

```ts
voice({
  gate: 8,
  moment: 'result',
  mood: 'memory',
  result: 'near-perfect',
  era: '1980s',
})
```

ולהחזיר:

```ts
{
  eyebrow: 'עוד רגע שחזר',
  title: 'את השער לא שכחת.',
  body: 'המסירה השנייה ברחה קצת — כל השאר היה שם.',
  ctaPrimary: 'עוד רגע',
  ctaShare: 'שלח ליציע',
  songContext?: ...
}
```

כך שפה עקבית תהיה חוק מערכת.

---

# 5. שכבת החיבור: RESULT CONTEXT

כל שער חייב להחזיר Result Context משותף.

```ts
type ResultContext = {
  gateId: number
  runId?: string

  playerIds?: string[]
  matchIds?: string[]
  goalIds?: string[]
  kitIds?: string[]
  seasonIds?: string[]
  archiveEntityIds?: string[]

  era?: string
  score?: number

  strengths?: string[]
  weakTopics?: string[]
  choices?: Record<string, string>

  lifeAnchors?: string[]
}
```

ה-context לא מחליף state של שער.

הוא רק אומר:
> "מה קרה עכשיו, ואילו ישויות היו משמעותיות?"

מכאן נוצרים:
- Next action.
- Archive links.
- LIFE links.
- Share.
- Challenge.
- Personal history.
- recommendation.

---

# 6. Universal Exit — מה קורה אחרי כל משחק

כל תוצאה צריכה להסתיים בשלוש שכבות.

## שכבה 1 — הרגש
תוצאה יפה וברורה.

## שכבה 2 — עוד משהו טבעי
CTA אחד, מקסימום שניים.

לדוגמה:
- "פתח את המשחק בארכיון"
- "נסה את ההרכב"
- "שחזר את השער"

## שכבה 3 — חברתי אופציונלי
"שלח ליציע"

לא לפתוח 8 כפתורים.

---

# 7. "היום בהפועל" — DAILY PRODUCT

לא לבנות Daily נפרד ומרעיש בכל שער.

לבנות Entry Point אחד:

# היום בהפועל

בכל יום:

## אחד לזכור
משחק קצר:
- Blind Cow.
- Trivia.
- Memory.
- Timeline.

## אחד לבחור
- Terrace Debate.
- XI mini prompt.
- Kit preference.

## אחד לגלות
- Archive.
- On This Day.
- LIFE memory.
- historical item.

זמן יעד:
**3–6 דקות.**

לא חובה לבצע את שלושתם.

---

## 7.1 Historical Daily

אם יש anchor אמין לאותו יום:

> היום לפני...

ה-Daily מקבל theme.

למשל:
- match.
- cup.
- championship.
- European night.
- club event.

ואז כל שלושת הפריטים נגזרים מאותו context.

אסור "להמציא anniversary" רק כדי למלא Daily.

---

## 7.2 Daily בסולו

בסיום:

> היום חזרת לשלושה רגעים.

בלי leaderboard.

אפשר:
- לשמור מזכרת.
- להמשיך לארכיון.
- לסגור.

## 7.3 Daily חברתי

כפתור:

**שלח ליציע**

מי שנכנס מקבל אותו Daily.

בסוף:
- agreement.
- score comparison.
- clues needed.
- shared memories.

---

# 8. "היציע שלי" — קבוצות חברים / WhatsApp

THE WORKER לא מחליף WhatsApp.

הוא מספק תוכן לשיחה שקורית שם.

## 8.1 יצירת יציע

משתמש יוצר:
- שם.
- optional nickname/logo.
- invite link.

ללא צורך בחיבור ל־WhatsApp API.

לדוגמה:

`/stand/7F4K`

הלינק נשלח לקבוצה.

---

## 8.2 Stand Home

תוכן:

### מה קורה היום
- Daily.
- active debate.
- pending challenge.

### מה היציע זוכר
- group stats.
- shared choices.
- surprising disagreement.

### מה חזר מהארכיון
- one relevant discovery.

### מי עוד לא ענה
ניסוח רך:
> עוד 3 מהיציע לא נכנסו לזה.

לא:
> 3 players inactive.

---

## 8.3 Group Result

לא טבלת "Winner" בלבד.

דוגמה:

> 8 מהיציע שיחקו.

> 5 זיהו את השחקן לפני רמז 4.

> כולכם זיהיתם את שנת 1999.

> אף אחד לא זכר מי בישל.

ואז אפשר להראות גם דירוג קטן אם הוא מוסיף עניין.

---

# 9. Challenge Layer

שכבה משותפת:

```text
lib/challenges/
  contract.ts
  create.ts
  resolve.ts
  score.ts
  compare.ts
  invite.ts
  expiry.ts
```

```ts
type Challenge = {
  id: string
  gate: number
  mode:
    | 'same-run'
    | 'duel'
    | 'group'
    | 'daily'
    | 'opinion'
    | 'creation'

  seed?: number
  cursor?: number

  entityIds?: string[]
  creatorId?: string
  standId?: string

  scoringVersion?: number
  expiresAt?: string
}
```

---

# 10. שער 1 — ALL-TIME XI

Route: `/xi`

## מטרת הרגש
"אלה האנשים שאני לוקח איתי."

## מסך פתיחה

לא לפתוח עם controls.

Headline:
> **תן את ההפועל שלך.**

Sub:
> 11, קפטן, והשחקן ה־12. אף אחד לא אמר שזה יהיה קל.

CTA:
> בחר עמדה ראשונה

## פעולה: בחירת עמדה

תגובה:
> מי עומד אצלך כאן?

לא:
> Select player.

## פעולה: בחירת שחקן

Micro feedback:
> נכנס להרכב.

אם זו גרסה/תקופה:
> איזה [Player] אתה לוקח איתך?

## Captain
> על מי הסרט?

## Player 12
> ומי עולה איתך מהיציע?

## Last Cut
> אחד נשאר בחוץ. זה הכואב.

## תוצאה

כותרת:
> **זאת הפועל שלך.**

לא score.

מזכרת:
- pitch.
- 11.
- captain.
- shirt.
- 12.
- last cut.

## replay / novelty

לא random XI.

### Manager Prompt מתחלף
- רק עד 1990.
- בלי זרים.
- שנות ה־2000 בלבד.
- גביעים בלבד.
- חמישה שכבר בחרת בעבר אסורים.
- XI "אם יש משחק אחד מחר".

ה-prompt הוא optional.

## Share

> **זאת הפועל שלי. תראה לי את שלך.**

Deep link פותח same prompt, לא מעתיק את הבחירות.

## Compare

לא:
> Maor wins.

כן:
- 7 משותפים.
- 4 מחלוקות.
- אותו קפטן / קפטן אחר.
- השחקן היחיד ששניהם לא ויתרו עליו.

## Cross-links
Player -> Archive.  
Era -> Timeline.  
Kit shown -> Gate 5.  
Match-linked player -> Blind Cow / Trivia.

## LIFE

LIFE יכול להשתמש ב-XI כ-memory payoff בלבד.

לדוגמה:
- אחרי פרק שבו השחקן פוגש/רואה דמות כדורגל:
  "השנים עברו. הוא נכנס להרכב שלך?"
- אין לקטוע סצנה לצורך mini-game.

אפשרות בתפריט LIFE:
> "מה נשאר איתי" -> שחקנים שנכנסו ל-XI אחרי שחווית פרקים שקשורים אליהם.

---

# 11. שער 2 — TRIVIA

Route: `/trivia`

## פתיחה
> **מה בא לך לזכור היום?**

ה-topic picker כבר מתאים.

## במהלך משחק

במקום feedback יבש:

Correct:
- "כן."
- "זה נשאר."
- "את זה לא שכחת."

Wrong:
- "ברח."
- "כמעט."
- "זה חוזר אליך עכשיו."

לא להשפיל.

## Reveal
מיד לאחר תשובה:
- answer.
- one-line context.
- archive option.

## Result

Headline לפי התוצאה:

High:
> **הרבה נשאר שם.**

Medium:
> **חלק בראש. חלק בלב.**

Low:
> **בשביל זה יש ארכיון.**

להימנע מ-"גרוע".

## "אותו משחק שוב"

הטקסט חייב להיות ברור:

- **נסה שוב את אותם 12**
- **תן לי 12 אחרים**

## Revenge

שינוי naming:
> **מה שברח לי**

במקום aggressive revenge כברירת מחדל.

אפשר לשמור "נקמה" כ-humorous secondary chip.

## Social same-run

> **אני זכרתי 9 מתוך 12. אתה עוד זוכר?**

כולם מקבלים אותו run.

## Group insight
- השאלה שכולם ידעו.
- השאלה שאף אחד לא ידע.
- decade strongest.
- same mistake.

## Cross-link
Wrong answer -> Archive entity.  
Kit question -> Gate 4/5.  
Lineup question -> Gate 3.  
Goal question -> Gate 8.

## LIFE

בסיום פרק LIFE עם historical anchor אמיתי:
- לא להקפיץ quiz.
- להציע בדף chapter recap:
  > "רוצה לבדוק מה נשאר מהשנה הזאת?"
  -> era-specific Trivia.

Trivia result יכול לפתוח:
> "הרגע הזה מופיע גם בסיפור"
אם chapter unlocked.

---

# 12. שער 3 — HISTORICAL LINEUP

Route: `/lineup`

## פתיחה
> **את המשחק אתה זוכר. מי עלה לדשא?**

## פעולות

בחר GK:
> מי פתח בשער?

Defense:
> מי היה מאחור?

Lock:
> זה שלך. נועל.

Hint:
> רמז מהספסל.

## Result
> **מצאת 9 מתוך 11.**

לא:
"82% Accuracy".

לאחר reveal:
- מי פספסת.
- מי הכנסת בטעות.
- visual actual XI.

## Share
> **מצאתי 9 מה־11. בלי לחפש.**

CTA:
> נסה את אותו משחק

## Group
> על שמונה שמות כל היציע הסכים.

## Cross-links
Match -> Archive.  
Player -> Archive.  
Goal -> Gate 8.  
Kit -> Gate 4/5.

## LIFE
כאשר LIFE מגיע למשחק הזה:
- `lifeAnchor -> matchId`.
- אחרי completion אפשר להציג:
  > "את הערב הזה כבר חיית. עכשיו נסה להרכיב מי עלה."
- Gate 3 לא משנה LIFE state.
- LIFE unlock יכול להוסיף "ראיתי את זה בסיפור" badge פנימי, לא יתרון משחקי.

---

# 13. שער 4 — KIT QUIZ

Route: `/kits/build`

## פתיחה
> **את החולצה אתה זוכר בלי לראות אותה?**

## שלב body
> איך היא ישבה בזיכרון?

## construction
> ומה עבר עליה?

## crest
> איזה סמל היה על הלב?

## maker
> מי ייצר אותה?

## sponsor
> ומה היה כתוב מקדימה?

## Review
> לפני שמרימים את הווילון.

## Reveal
להציג את החולצה האמיתית/המאומתת כ-moment.

Perfect:
> **לא שכחת פרט.**

Near:
> **הספונסר ברח. החולצה לא.**

## Modes
- Full: 5 shirts.
- Quick: 3 shirts.

rotation cursor חייב להתקדם לפי מספר הפריטים שנצרכו בפועל.

## Share
Share artefact = folded shirt / collector card.

> **את זאת עוד זכרתי.**

## Cross-links
Unlock -> Gate 5 collection.  
Season -> Archive.  
Players wearing it -> player archive.  
Relevant LIFE chapter -> "חזרת לשנה שבה לבשת אותה בסיפור".

## LIFE
חולצה שנרכשת/נלבשת בעלילה יכולה:
- להירשם כ-memory provenance.
- לא להיות "פרס" שמחליף collection truth.

ב-Gate 5:
> "פגשת אותה ב-LIFE · 1986"

כך LIFE מוסיף סיפור לאובייקט, לא data duplicate.

---

# 14. שער 5 — KIT WING / COLLECTION

Route: `/kits`

## מטרה
לא "קטלוג".

> **הארון שלך.**

## Landing
1. מה יש לי.
2. מה חסר לי.
3. מה אפשר לעשות עכשיו.

### Hero
> 14 מתוך 33 חזרו לארון.

### Objective
> נשארה אחת לסגור את שנות ה־90.

## Locked item
לא disabled grey.

> **עוד לא חזרה אליך.**

## Daily collection objective
- חולצת היום.
- finish decade.
- unseen photo.
- season connected to today's archive.

## Share
לא "14/33".

> **זה הארון שלי.**

או:
> **את זאת הייתי לוקח איתי גם היום.**

## Social
Comparison:
- shirts both own/unlocked.
- unique discoveries.
- decade affinities.

אין "better collector".

## LIFE
זה אחד החיבורים החזקים ביותר.

לכל Shirt Card:
- archive provenance.
- quiz unlock provenance.
- LIFE provenance.

למשל:

```text
1999/00 HOME

פתחת:
✓ שער 4
✓ LIFE · גמר הגביע
○ Archive photo
```

זה הופך את אותו asset לזיכרון רב-שכבתי.

---

# 15. שער 6 — MEMORY WALL

Route: `/memory`

## פתיחה
Darkness + flash.

Copy:
> **תסתכל טוב. עוד רגע זה נעלם.**

## match correct
> **חזר למקום.**

## miss
שום "wrong" צורח.
> **לא זה.**

## extra flash
> **עוד מבט אחד.**

## result
> **6 זיכרונות חזרו למקום.**

## Souvenir
> אחד מהם נשאר אצלך.

## Share
> **כמה מזה נשאר לך בראש?**

Same board.

## Group insight
- fewest moves.
- object everyone found first.
- object everyone struggled with.

## Archive
כל pair/souvenir -> archive deep link.

## LIFE
Memory pair יכול להופיע אם LIFE chapter unlocked context.

אבל:
- אין spoilers.
- item only enters pool אחרי LIFE chapter if it represents story-only reveal.
- historical public facts can remain independent.

אפשר:
> "את זה כבר ראית אצל אבא קובי."

---

# 16. שער 7 — TERRACE

Route: `/polls`

צריך לפצל תפיסתית, גם אם route נשאר אחד.

## A. הכרטיס שלי / Identity Ballot
שאלות יציבות:
- favourite.
- keeper.
- position.
- number.
- etc.

זה profile.

## B. הוויכוח של היציע
4–6 prompts rotating.

Examples:
- איזה שוער אתה לוקח למשחק אחד?
- איזה ערב היית רוצה לחוות שוב?
- איזה שחקן היית מחזיר לעונה אחת?
- איזה שער אתה רואה שוב?
- איזה גמר נשאר אצלך?

## פתיחה
> **אין פה תשובה נכונה. בגלל זה באנו.**

## Vote
לא להראות percentages לפני הבחירה.

אחרי:
> **זאת הבחירה שלך.**

ואז:
> **רוצה לראות מה היציע אמר?**

## Why
Reason chips:
- "ראיתי בעיניים"
- "אבא סיפר לי"
- "פשוט הוא"
- "הרגע הזה"
- custom optional.

## Result
> 12 אוהדים. 5 תשובות. אפס סיכוי שנסכים על הכול.

## Share
> **אני לקחתי את X. מה אתה אומר?**

## Group
זה ה-heart של Stand.

## LIFE
בחירות LIFE לא צריכות להיחשף אוטומטית לקבוצה.

אבל ניתן ליצור debates מתוך story:
> "אחרי הפרק הזה — מה היית עושה?"

בבירור label:
**שאלה מהסיפור**, לא עובדה היסטורית.

לא להשתמש באנשים אמיתיים כדי להמציא להם דיאלוג/מניע.

---

# 17. שער 8 — GOAL RECONSTRUCTION

Route: `/goal`

## Intro
> **את השער אתה מכיר. אבל אתה זוכר איך הוא נולד?**

## first play coach
Ghost gesture בלבד:
- גרור שחקן.
- העבר.
- בעט.

לא tutorial page.

## during
Crowd tension / clock / broadcast.

## result
במקום רק similarity %:

> **הרגע היה שם.**

ואז:
- player path.
- ball path.
- pass sequence.
- key mismatch.

Near:
> המסירה השנייה ברחה קצת.

Perfect:
> **ככה זה קרה.**

## Share
> **שחזרתי את הרגע. עכשיו אתה.**

Same goal.

## Compare
overlay:
- route A.
- route B.
- archive truth.

## Group
- average reconstruction.
- pass everyone missed.
- common route.

## Cross-links
Goal -> Match Archive.  
Match -> Lineup.  
Scorer -> player.  
Kit -> Kit wing.  
Europe -> Away Days.

## LIFE
זה חיבור טבעי לרגעי שיא.

LIFE scene:
- המשחק קורה בסיפור.
- אין חובה לשחק Gate 8 כדי להתקדם.

אחרי scene:
> **רוצה לחזור לשער?**
-> same historical goal reconstruction.

Gate 8 result יכול לפתוח:
> **חזור לרגע בתוך LIFE**
רק אם chapter כבר unlocked.

---

# 18. שער 9 — ROYAL RUMBLE

Route: `/royal-rumble`

## P0 טכני
ה-cursor חייב להשפיע על round seed.

אסור ש:
`seed=X&r=0`
ו-
`seed=X&r=1`
יחזירו אותו draft.

ליצור:

```ts
royalRumbleRoundSeed(seed, cursor)
```

ולהשתמש בו ב:
- draft.
- shuffle.
- opponent.
- match.
- validation.
- share.

## Voice

Intro:
> **תן חמישייה.**

Budget:
> יש לך את הכסף. עכשיו תבחר.

Opponent reveal:
> **ממול עלו אלה.**

Match:
> יאללה.

Result:
> **זאת החמישייה שלך. זה מה שיצא.**

אפשר להיות תחרותיים כאן, אבל לא toxic.

## Async friend mode
אותו draft.

> **תן את החמישייה שלך לאותם קלפים.**

לאחר שניהם:
- compare selections.
- match simulation.
- common players.
- budget choices.

## Live
לשמור H2H.

## Share
כרטיס lineup/five:
> **אלה החמישה שלי. תן את שלך.**

## LIFE
LIFE יכול לפתוח themed draft:
- "השנים שחיית עד עכשיו".
- רק players from chapters already reached.

זה נותן ל-LIFE payoff בלי להשפיע על canonical Royal Rumble.

---

# 19. שער 10 — BLIND COW

Route: `/blind-cow`

זה מודל נכון ל-Solo + Daily + Duel.

## Lobby priority
1. **שחק עכשיו**
2. **האדום של היום**
3. filters.
4. duel.

## Intro
> **כמה רמזים אתה צריך כדי לזהות אחד משלנו?**

## clue
קצר, נקי.

## wrong guess
> עוד לא.

## success
> **השם כבר היה שם.**

Result:
> רמז 3.

לא "300 XP".

## Daily
> **האדום של היום**

Social warning:
> אל תגלו.

## Share
> **אני תפסתי בשלישי. אל תגלו.**

## Duel
אותו player.

Comparison:
> אתה: 3 רמזים  
> אפי: 2 רמזים

אין צורך headline "אפי ניצח".

## LIFE
אחרי chapter שמציג תקופה:
Daily/solo filter:
> "תן לי מישהו מהשנים שחיית עכשיו"

אופציונלי.

---

# 20. שער 11 — HATE WALL

Route: `/derby`

זה החריג הטונאלי המכוון.

THE WORKER כולו אהבה להפועל.  
השער הזה מרשה לעצמו להיות שחור, מחוספס, כועס.

אבל גם כאן:
- לא misinformation.
- לא defamation.
- context sourced.
- דעה כ"דעת יציע", לא fact.

## Intro
> **אחד נשאר על הקיר.**

## Choose
Poster stays.

## Black File
לכל entity:
- מי.
- מה קרה.
- מתי.
- source.
- why relevant.

## Result
> **זה מי שנשאר אצלך.**

לא "King".

## Share
> **זה הקיר שלי. מה נשאר אצלך?**

## Group
- agreement rate.
- most divisive matchup.
- survivor diversity.

## LIFE
לא לערבב Hate Wall לתוך דרמה עלילתית בלי סיבה.

אפשר link רק אם LIFE chapter historical context רלוונטי:
> "פתח את התיק בארכיון"

לא להפוך LIFE למכשיר שנאה.

---

# 21. שער 12 — LIVING ARCHIVE

Route: `/archive`

זה backbone.

## P0 date
`Today` חייב להשתמש ביום בישראל, לא UTC.

לשתף helper עם Blind Cow:
`todayInIsrael()`.

## Default landing
> **מה חזר היום?**

לא להציג מיד את כל ה-dock כמערכת כבדה.

## Today
> **היום לפני**

## Dig
> **תפתח קופסה. אולי משהו יחזור.**

First click:
Preview.

Second:
Open.

## Rabbit Hole
> **עוד צעד פנימה.**

## Trail
> **איך הגעת לכאן**

## Mine
> **מה ששמרת אצלך**

## Empty
> **היום הארכיון שקט.**

## Share
Archive artefact:
- clipping.
- ticket.
- photo.
- item card.

> **מצאתי את זה בארכיון.**

CTA:
> פתח את הסיפור

## Cross Gate Router

Archive entity knows available actions:

Match:
- Lineup.
- Goal.
- Trivia.
- Timeline.
- LIFE chapter.

Player:
- Blind Cow.
- XI.
- Rumble.
- Trivia.
- LIFE.

Season:
- Kit.
- Timeline.
- Trivia.

## LIFE
זה החיבור העיקרי.

LIFE chapter אינו צריך להחזיק עותק של כל היסטוריה.

הוא מחזיק `archiveEntityIds`.

בסוף scene/chapter:
> **מה באמת קרה**
-> Archive.

ב-Archive:
> **חווית את הרגע הזה ב-LIFE**
-> return to unlocked chapter/memory.

צריך להפריד ויזואלית:
- **הסיפור** — LIFE.
- **הארכיון** — sourced facts.

זה חשוב לאמינות.

---

# 22. שער 13 — RED THREAD + TIMELINE

Routes:
- `/timeline`
- `/timeline/order`

## RED THREAD

Intro:
> **בהפועל הכול מתחבר בסוף.**

Instruction:
> תגיע מכאן לשם. כל קלף חייב להתחבר באמת לקודם.

לא לפתוח עם:
- integrity.
- graph.
- edge types.

אלה progressive details.

### successful edge
ויזואל:
- thread.
- staple.
- knot.
- physical connection.

Feedback:
> יש חיבור.

### invalid
> החוט לא עובר כאן.

### result
> **מצאת דרך.**

ואז:
- length.
- alternate route.
- Archive trail.

### Share
> **אני חיברתי ביניהם ב־4 צעדים. איזה דרך אתה מוצא?**

Same anchors.

## TIMELINE ORDER

Intro:
> **תנסה לסדר את הזיכרון.**

Action:
> איפה זה קרה?

Feedback:
card lands in actual position.

Result:
> **הסיפור חזר לסדר.**

## Group
Red Thread:
- different valid routes are interesting.
- do not force one "best route" as sole value.

Timeline:
- same events.
- common historical confusion.

## LIFE
LIFE chapter completion can add eligible `lifeAnchor`.

Generated Red Thread:
> childhood scene -> player -> match -> cup -> modern moment.

אבל:
- fictional LIFE-only characters cannot be presented as historical archive entities.
- use explicit edge type `story-memory` for fictional/player-personal context.
- graph truth and narrative graph remain separate.

---

# 23. LIFE — החיבור המלא

LIFE אינו "שער 14".

זה הסיפור הארוך שמעניק לכל שאר המוצר משמעות אישית.

## 23.1 LIFE → GATES

לא לעצור סצנות לצורך mini-game.

החיבור קורה ב:
- chapter recap.
- free time.
- memory menu.
- result epilogue.
- optional interaction.

### דוגמאות

1986:
> "את השער הזה כבר חיית."
-> Gate 8.

1999:
> "מי עלה באותו ערב?"
-> Gate 3.

חולצה:
> "היא עכשיו גם בארון שלך."
-> Gate 5.

Player:
> "הוא נכנס להפועל שלך?"
-> Gate 1.

Historical event:
> "מה באמת קרה?"
-> Archive.

---

## 23.2 GATES → LIFE

רק אם chapter unlocked.

Archive:
> חזור לרגע בסיפור.

Goal:
> חזור ליציע.

Kit:
> איפה פגשת אותה.

Trivia:
> התקופה הזאת מחכה לך בסיפור.

Never:
- reveal future LIFE content.
- spoil character outcome.
- force story progression.

---

## 23.3 LIFE Memory Passport

להוסיף ל-profile:

```ts
lifeMemory = {
  chapterId
  archiveEntityIds
  kitIds
  matchIds
  goalIds
  peopleIds
  unlockedAt
}
```

לא reward economy.

זה provenance.

כאשר אותו entity מופיע במקום אחר:
> **חיית את זה ב-LIFE.**

---

## 23.4 LIFE Share

שיתוף LIFE אינו score.

Artefacts:
- ticket.
- photo.
- postcard.
- diary page.
- old newspaper.
- match stub.

Examples:

> **1986. הייתי שם שוב.**

> **עוד פרק מהפועל שלי.**

> **יש זיכרונות שלא היו שלי — עד ששיחקתי אותם.**

Deep link:
- לאמצע chapter רק אם safe.
- אחרת LIFE landing + chapter reference.

---

# 24. Personal Area — "אני" מול "התיק שלי"

יש לבצע הפרדה תפיסתית.

## אני
- name.
- anonymity.
- fan since.
- shirt number.
- position.
- favourite.
- stand.
- identity ballot.

## התיק שלי
- XI.
- kits.
- saved archive.
- souvenirs.
- goal reconstructions.
- trivia history.
- timelines.
- LIFE memories.
- debates.
- challenges.

---

# 25. Profile אינו "rating"

לא לתת:
"Fan Score: 87".

במקום זה Skill / Memory Map.

## תחומים

### ידע
Trivia / Blind Cow.

### זיכרון
Memory / Kit.

### טקטיקה
XI / Lineup / Rumble.

### היסטוריה
Archive / Timeline / Red Thread.

### רגעים
Goal.

### זהות
Terrace / personal choices.

### אספנות
Kit Wing.

לא ranking של "מי אוהד טוב יותר".

---

# 26. Achievements כזיכרונות

לא generic badges.

דוגמאות:

## לא שכחת
100 תשובות נכונות.

## עוד חולצה חזרה
10 shirts.

## עמוק בארכיון
50 opens.

## אותו שם חוזר
אותו player נבחר ב-XI + Poll + Rumble.

## עוד שבת אחת
7 ימי "היום בהפועל".

## הייתי שם שוב
סיום LIFE chapter + archive return.

## החוט נסגר
Red Thread route.

---

# 27. SOCIAL SHARE SYSTEM

לכל share יש:

1. Artefact.
2. Personal statement.
3. Tiny context.
4. CTA.
5. Deep link.
6. No spoiler.

## Types

### Identity
XI / collection / manifesto.

### Memory
Trivia / Lineup / Memory / Goal / Timeline / Blind Cow.

### Opinion
Terrace / Hate Wall.

### Story
LIFE / Archive.

### Group
Stand recap / Daily.

---

# 28. Share Visual Language

לא template אחד.

## XI
team sheet / pitch card.

## Trivia
old score slip / quiz ticket.

## Lineup
match programme.

## Kit
folded shirt / collector card.

## Memory
photo/contact sheet.

## Terrace
ballot slip / terrace sticker.

## Goal
broadcast freeze frame.

## Rumble
five-player programme/poster.

## Blind Cow
silhouette / clue card.

## Hate Wall
black poster.

## Archive
press clipping/archive label.

## Timeline
paper strip/thread.

## LIFE
ticket/photo/diary/postcard.

כך הפיד עצמו נראה כמו ארכיון אוהדים.

---

# 29. WhatsApp copy

WhatsApp share צריך להיות קצר ואנושי.

לא marketing copy.

דוגמאות:

### Trivia
> זכרתי 9/12. קח את אותם 12.

### Blind Cow
> תפסתי בשלישי. אל תגלה בקבוצה.

### XI
> זאת ההפועל שלי. תן את שלך.

### Kit
> את זאת עוד זכרתי.

### Goal
> שחזרתי את הרגע. נראה איך אתה זוכר אותו.

### Terrace
> אני הלכתי עם X. מה אתם אומרים?

### LIFE
> חזרתי עכשיו ל־1986.

---

# 30. Group Competition בלי להרוס את האווירה

דירוגים מותרים כאשר הם טבעיים.

אבל headline בדרך כלל הוא group story.

במקום:

> מקום 1: X

אפשר:

> **היום היציע היה חזק בשנות ה־90.**

ולמטה compact ranking.

---

# 31. Weekly — "השבוע ביציע"

פעם בשבוע:
5 תחנות מהמערכות הקיימות.

לא חייבים לקרוא לזה Cup.

שם מוצע:
# השבוע ביציע

לדוגמה:
- Trivia.
- Blind Cow.
- Goal.
- Kit.
- Timeline.

כל אחד משחק בזמן שלו.

בסוף:
- best individual performances.
- group memory.
- disagreement.
- missed question.
- favourite moment.

כרטיס השיתוף:
> **ככה היציע שלנו זכר את השבוע.**

---

# 32. Group Cooperation

לא רק ranking.

דוגמאות:

- יחד לפתוח 20 Archive items.
- כל חבר לבחור ב-Terrace.
- לזהות 10 Blind Cow players יחד.
- להשלים decade collection coverage.
- חמישה אנשים שונים לשחק Daily.

Completion:
> **היציע סגר את זה ביחד.**

---

# 33. Rivalry — במינון

אם שני משתמשים חוזרים לשחק זה עם זה:

```text
אתה ואפי
Trivia · 7 משחקים
Goal · 3 רגעים
Blind Cow · 5 ימים
```

לא חייב overall W-L.

יותר מעניין:
- "אתה זוכר יותר שנות 90."
- "אפי תופס Blind Cow מוקדם יותר."
- "ב-XI אתם מסכימים על 6."

זה relationship, לא ladder.

---

# 34. Notifications / Return Hooks

בשלב הראשון בתוך האפליקציה בלבד.

- "האדום של היום מחכה."
- "4 מהיציע כבר ענו."
- "אפי עשה את אותו Goal."
- "היום חזר פריט מהארכיון ששמרת."
- "השבוע נשארה לך תחנה אחת."

לא:
- FOMO אגרסיבי.
- "You're falling behind".
- streak punishment.

---

# 35. Privacy / Anonymity

משתמש רשום יכול להופיע באנונימיות מלאה.

להפריד:

```ts
accountIdentity
publicSupporterIdentity
```

אפשר:
- account = Google.
- public = nickname / anonymous.

קבוצה יכולה לראות:
"אדום #7"
בלי לדעת email/name.

---

# 36. Data Model מוצע

```text
supporter
├── identity
├── privacy
├── preferences
├── gate_progress
├── knowledge_profile
├── collections
├── creations
├── votes
├── archive_history
├── life_memory
├── challenges
├── stands
└── share_history
```

Guest:
local-first.

Signed-in:
Supabase sync.

---

# 37. Event Taxonomy

במקום events שונים בכל feature:

```text
gate_open
run_start
run_complete
result_view
archive_open
entity_follow
life_chapter_complete

share_open
share_created
share_joined

challenge_created
challenge_joined
challenge_complete

stand_created
stand_joined
stand_daily_complete

daily_open
daily_item_complete
daily_complete
```

Properties:
- gate.
- runId.
- entityIds.
- source surface.
- solo/social.
- signed/guest.
- anonymous public flag.

אין לשלוח PII מיותר.

---

# 38. Recommendation Engine — בלי AI

Deterministic.

```ts
if (result.goalIds?.length)
  suggest('/archive/match...')

if (weakTopics.includes('kits'))
  suggest('/kits/build')

if (matchIds && lineupAvailable)
  suggest('/lineup')

if (archiveEntity has lifeAnchor && unlocked)
  suggest('/life/...')

if (lifeChapterComplete && goalAvailable)
  suggest('/goal?...')
```

אחד primary.

אחד secondary.

לא carousel אינסופי.

---

# 39. Implementation — Phase 0: CLEAN TRUTH

לפני social.

## P0.1
לתקן Royal Rumble round cursor.

## P0.2
לתקן Archive Israel date.

## P0.3
להפריד Gate 7 Identity Ballot / rotating Debate.

## P0.4
לייצר product map אמיתי:
Gate -> route -> state -> seed -> persistence -> share -> archive -> LIFE -> tests.

## P0.5
לתקן comments/docs stale ב-`lib/gates.ts`.

הקוד כרגע עדיין מכיל תיעוד היסטורי שמדבר על "nine gates", Gate 9 under construction ו-Gate 10 personal area אף שה-array הפעיל כבר מכיל 13 שערים ו-Gate 10 הוא Blind Cow.

---

# 40. Implementation — Phase 1: VOICE

## 1. ליצור
`lib/voice/*`

## 2. להעביר copy מרכזי מכל שער ל-context messages.

## 3. להגדיר forbidden language:
- beat.
- crush.
- loser.
- real fan.
- prove yourself.

## 4. Song Context Registry.

## 5. visual/copy snapshot tests.

---

# 41. Implementation — Phase 2: RESULT CONTEXT

## 1.
`lib/results/context.ts`

## 2.
Adapter לכל שער.

## 3.
Universal result actions.

## 4.
Archive entity linking.

## 5.
LIFE anchor linking.

זה שלב קריטי לפני social.

---

# 42. Implementation — Phase 3: "היום בהפועל"

## 1.
Daily resolver.

## 2.
Israel-date helper shared.

## 3.
select:
- remember.
- choose.
- discover.

## 4.
anniversary resolver.

## 5.
guest persistence.

## 6.
daily recap.

אין צורך בקבוצות עדיין.

---

# 43. Implementation — Phase 4: SHARE V2

## 1.
Share contract.

## 2.
Gate-specific artefact renderer.

## 3.
deep links.

## 4.
same-run invitations.

## 5.
WhatsApp optimized text.

## 6.
OpenGraph render.

## 7.
No spoiler rule.

---

# 44. Implementation — Phase 5: ASYNC CHALLENGE

להתחיל רק מהשערים שכבר מתאימים:

1. Blind Cow.
2. Trivia.
3. Goal.
4. Memory.
5. Lineup.
6. Timeline.
7. Royal Rumble.

לא לפתוח את כל 13 ביום אחד.

Challenge חייב להיות playable כ-guest.

---

# 45. Implementation — Phase 6: "היציע שלי"

## MVP
- create.
- invite.
- join.
- member public identity.
- Daily progress.
- active debate.
- challenge feed.

## לא ב-MVP
- chat.
- direct messaging.
- notification spam.
- moderation-heavy social network.
- followers.

WhatsApp נשאר chat.

---

# 46. Implementation — Phase 7: PERSONAL AREA

להפריד:
- אני.
- התיק שלי.

להכניס:
- memory map.
- creations.
- saved archive.
- LIFE memories.
- challenges.
- stand.
- privacy.

---

# 47. Implementation — Phase 8: LIFE BRIDGE

ליצור registry:

```ts
type LifeArchiveBridge = {
  chapterId: string
  entityIds: string[]
  matchIds?: string[]
  kitIds?: string[]
  goalIds?: string[]
  playerIds?: string[]
  safeReturnPoint?: string
}
```

לא hard-code links ב-UI.

---

# 48. Implementation — Phase 9: WEEKLY

רק אחרי Daily + Challenge + Stand יציבים.

`weekly program` מורכב ממשחקים קיימים.

אין mechanic חדש.

---

# 49. QA — Rotation

לבנות automated acceptance:

עבור כל seeded gate:
- 500 entries.
- no premature repeat לפני exhaustion.
- same seed+cursor = same run.
- different cursor = expected progression.
- share reproduces exact run.
- challenge reproduces exact run.

Royal Rumble במיוחד.

---

# 50. QA — Social/Solo Parity

לכל שער לבדוק:

### Guest solo
יכול להתחיל ולסיים?

### Signed solo
מקבל persistence בלי social clutter?

### Shared link guest
נכנס ישר לאתגר?

### Stand user
תוצאה נספרת נכון?

### Anonymous registered
אף public surface לא חושף account identity?

---

# 51. QA — Copy

בדיקה אוטומטית/ידנית שאין:

- "Beat"
- "Crush"
- "Loser"
- "Real fan"
- guilt streak.
- generic "Awesome".

לבדוק שכל result:
1. אומר משהו אנושי.
2. מסביר מה קרה.
3. מציע המשך.
4. share אינו primary בכוח.

---

# 52. QA — LIFE / ARCHIVE Truth

כל LIFE-to-Archive:
- points to actual sourced entity.
- does not present fictional dialogue as fact.
- no spoiler.
- real people remain governed by current real-person dialogue rules.
- story and sourced history visually labelled differently.

---

# 53. סדר עדיפויות מוצרי

## P0 — עכשיו
1. Royal Rumble cursor.
2. Archive local date.
3. Gate 7 rotating Debate.
4. stale gate docs/comments.
5. result context contract.

## P1 — הלב החדש
6. Red Voice.
7. Archive cross-links.
8. LIFE bridge registry.
9. "היום בהפועל".
10. Share V2.

## P2 — social
11. same-run challenges.
12. comparison results.
13. "היציע שלי".
14. group Daily.
15. personal area.

## P3 — retention
16. weekly.
17. rivalry history.
18. achievements as memories.
19. richer song-context integration.

---

# 54. Definition of Done לכל שער

שער אינו "מוכן" רק אם המשחק עובד.

הוא מוכן כאשר:

- [ ] first action ברור תוך 3 שניות.
- [ ] mobile first.
- [ ] solo result מספק.
- [ ] copy תואם Red Voice.
- [ ] replay נותן תוכן חדש/יעד חדש.
- [ ] אין premature repeat.
- [ ] result מחזיר Result Context.
- [ ] יש Archive connection כשקיים.
- [ ] יש LIFE connection כשקיים.
- [ ] share artefact מותאם לשער.
- [ ] shared challenge משחזר run אם מתאים.
- [ ] anonymous registered user נשאר אנונימי.
- [ ] analytics אחיד.
- [ ] אין fake stats.
- [ ] אין fake history.
- [ ] אין duplicated historical truth.

---

# 55. מסך הבית החדש — לא לבטל את קיר השערים

קיר השערים נשאר זהות חשובה.

אבל מעל/לפניו אפשר שכבת "עכשיו":

```text
ערב טוב.

היום בהפועל
אחד לזכור · אחד לבחור · אחד לגלות

מהיציע שלך
7 כבר ענו על הוויכוח

חזר מהארכיון
פריט אחד ששמרת

המשך LIFE
1989 · ...
```

ואז:

> **כל השערים**

כך:
- משתמש חדש עדיין רואה את הקונספט.
- משתמש חוזר מקבל סיבה מיידית לעשות משהו.

---

# 56. North Star

לא:
Daily Active Users בלבד.

מדדים שמספרים את הסיפור הנכון:

### Return
כמה חוזרים ליום נוסף.

### Memory Continuation
כמה משחק -> Archive / LIFE / Gate נוסף.

### Voluntary Share
כמה משתפים בלי prompt אגרסיבי.

### Shared Completion
כמה מקבלי לינק באמת משחקים.

### Stand Participation
כמה מחברי היציע משתתפים באותו item.

### Personal Accumulation
כמה משתמשים בונים תיק שמכיל כמה סוגי זיכרון.

### Cross-Gate Depth
כמה users עוברים באופן טבעי בין 2+ surfaces מאותו historical context.

---

# 57. התמונה הסופית

משתמש פותח THE WORKER לבד.

הוא לא רואה "SOCIAL NETWORK".

הוא רואה:

> **היום בהפועל**

נכנס ל-Blind Cow.

מזהה בשלושה רמזים.

המערכת אומרת:

> **השם כבר היה שם.**

הוא יכול לסגור את הטלפון.  
החוויה שלמה.

אם בא לו:

> **שלח ליציע**

החבר מקבל בדיוק את אותו שחקן.

בערב שלושה אנשים כבר שיחקו.

THE WORKER לא צועק:
> "WINNER!"

הוא אומר:

> **שלושה אוהדים. אותו שם. שלוש דרכים להגיע אליו.**

מחר הוא נכנס ל-LIFE.

הוא מגיע למשחק היסטורי.

בסיום הפרק:

> **מה באמת קרה**
> פתח בארכיון.

בארכיון הוא רואה Goal.

> **שחזר את הרגע.**

אחרי השחזור:

> **החולצה הזאת נמצאת גם בארון שלך.**

הוא פותח Gate 5.

פתאום אין יותר:
- LIFE.
- Archive.
- Kit game.
- Goal game.

יש עולם אחד.

# זאת הפועל שלו.

---

# 58. הוראת ביצוע לצוות / Claude

יש לבצע את התוכנית **כשדרוג של המוצר הקיים**, לא כ-rewrite.

חוקים:

1. לשמר routes קיימים אלא אם יש סיבה טכנית מוכחת לשינוי.
2. לשמר historical data engine.
3. לשמר server authority.
4. לשמר RTL/mobile conventions.
5. לשמר visual identity.
6. לא לשכפל entity truth.
7. לבנות shared primitives.
8. לעשות migrations הדרגתיים.
9. כל שלב צריך להיות deployable בפני עצמו.
10. לא להכניס social dependency למסלול solo.
11. לא להכניס auth wall לפני משחק.
12. לא להכניס fake user counts.
13. לא להכניס fake votes.
14. לא להמציא quotes.
15. שירים — source attribution ושימוש קצר/הקשרי.
16. LIFE fictional narrative ו-Archive factual truth נשארים מובחנים.
17. כל שינוי משמעותי יקבל tests.
18. אחרי כל phase לעדכן Product Map ו-current architecture docs.

---

# 59. סדר עבודה מעשי

### Sprint A — Foundation
- Fix P0 bugs.
- Product Map.
- Voice contract.
- Result Context.
- Israel date helper.

### Sprint B — Connect
- Archive links.
- LIFE bridge.
- Gate 7 debate bank.
- Gate 1/5 rotating objectives.

### Sprint C — Return
- היום בהפועל.
- Daily recap.
- personal history.

### Sprint D — Share
- artefact templates.
- deep links.
- same-run links.
- WhatsApp copy.

### Sprint E — Play Together
- async challenges.
- compare results.
- rivalry context.

### Sprint F — My Stand
- create/join.
- group Daily.
- debate.
- group recap.

### Sprint G — Identity
- אני / התיק שלי.
- memory map.
- achievements.
- LIFE memory passport.

### Sprint H — Weekly
- weekly programme.
- historical themed weeks.
- group cooperative objectives.

---

# 60. משפט מסכם למוצר

**THE WORKER לא צריך לגרום לאוהד להוכיח כמה הוא אוהב את הפועל.  
הוא צריך לתת לו מקום להיזכר למה.**
