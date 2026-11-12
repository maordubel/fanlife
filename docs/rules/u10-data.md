## DATA — הכרעות, לוחות ויקיפועל ומגרשים (דלתא 89, 25.9.2026)

1. **הכרעה היא שורה ב-`fact-conflicts.json`, לא עריכה של השורה המפסידה.** `resolution` (עברית, מתחיל
   ב"הוכרע") + `resolvedBy` + `decisions: [{matchId, field, value, winningSourceUrl, winningSourceTitle,
   decidedOn}]`. שדות: playedOn · home · result · venue · stage · scorers (value = קובץ הקריאה) · opponent
   (כתיב בלבד). המאסטר מעביר את ה-claim ל-`decided` עם כל הקריאות (`overruled`) — הפרובננס נשאר.
   הכרעה בלי resolution = שגיאת בנייה. סדר ראיות: אתר המפעל (UEFA `match.uefa.com/v5/matches?matchId=`)
   > עיתונות בת-זמנה > RSSSF > ויקיפועל > ויקיפדיה.
2. **הטריוויה קוראת את `matches.json` הגולמי**, ולכן הכרעה שמשנה ערך משאירה את השורה מחוץ לבנק
   (`lib/game/questions/conflicts.ts`); הכרעת כתיב (`opponent`) משחררת. אחרי הכרעה: `canon:ids -- --write-ids`
   (מפתח conflict חדש = dialect), ואז השרשרת + `trivia:master`.
3. **לוחות המשחקים של ויקיפועל הם טבלת Games** (`{{שליפת לוח משחקים פשוטה}}`). `npm run
   ingest:vikipoel-schedules` → `content/manual/matches-vikipoel-2026-09-25.json` (95 משחקים): `1955` →
   1954/55; `1966-68` מפוצל ב-1.8.1967, התווית המקורית ב-`sourceSeasonLabel`. `keyedMatches` קורא אותו;
   כובשים מעמודת comments כקריאה. יריבה רק דרך clubs.json — `ס.כ נס ציונה` מועדון חדש (confidence 1).
4. **מגרש ממקור שנוקב בו בלבד** — UEFA API נותן שם + קואורדינטות לכל משחק מ-1995 (לא לאינטרטוטו 1996);
   עמודת `stadium` של Games מספיקה כדי לומר "בישראל" (`in-israel`). קבוצה = מגרש הבית שלה אינו ראיה.
5. **ויקיפועל חוסם API אחרי פרץ קריאות** ("Performing security verification"). לא עוברים אימות — מבקשים
   מהבעלים לפתוח דף, וקוראים במנות קטנות.
