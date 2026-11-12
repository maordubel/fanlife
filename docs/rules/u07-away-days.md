## AWAY DAYS — מסע לפי מגרש פיזי, רק מאומת (דלתא 88, 24.9.2026)

מפרט: GATE10-BLINDCOW-AWAYDAYS-SPEC חלק ב'. `/away-days`, הדלת היחידה היא הסטריפ בתחתית הקיר.

1. **הבחירה לפי מדינת המגרש, לעולם לא לפי HOME/AWAY.** "בית" בניקוסיה/לרנקה/מישקולץ הוא יום חוץ;
   משחק בלי מגרש ידוע לא ממוקם בשום מקום.
2. **שלוש שכבות:** Match Master (אמת המשחק) · `venue-registry.json` (זהות המגרש, VenueRecord §19,
   שם אחד לכל מגרש פיזי — כינויים ושמות היסטוריים מתאחדים, קואורדינטות מהעמוד הראשון ב-`sourceRefs`)
   · `match-venues.json` (שורה לכל משחק בינלאומי במאסטר, כולל `check` = מה שמקור המגרש אומר על
   התאריך/צד/תוצאה). `npm run away-days:build` → `content/generated/away-days-master.json`;
   `away-days:validate`, `away-days:report` (תור המחקר). משחק בינלאומי בלי שורה = שגיאת בנייה.
3. **ציבורי = VERIFIED בלבד.** claim/conflict במאסטר, `check` שלא מסכים, `venue` של המאסטר שסותר,
   walkover, מגרש/קואורדינטות חסרים → CONFLICT/BLOCKED בתור המחקר עם כל הסיבות. לא "משלימים מהיגיון".
4. **אסיה בקנון:** `asian-competition-matches.json` נקרא ע"י `keyedMatches` ומוזן למאסטר (אותם מפתחות —
   לא מנפיק). חצי גמר 1970 הוא walkover (RSSSF/Wikipedia/Wildstat) — claim במאסטר, לא ביקור.
5. **מפה בלי ספק:** `d3-geo` + `topojson-client` + `world-atlas` (110m) כ-SVG, נטען ב-`next/dynamic`
   רק ב-/away-days. אין tiles, אין geocoding. ים lamp-off, יבשה sign, מסלול red, שמות sheet.
6. **כובשים בכרטיס רק כשכל שער של הפועל הוא רשומה מזוהה (confidence ≥ 2).** אחרת השורה לא קיימת.
7. **קריאה שנייה בינלאומית — `intl-redfans-2026-09-24.json`** (העשרת ויקיפועל של מאור, מקוצצת): מוצמדת
   למשחק הקנוני בתאריך+מפעל(+יריבה), בלי המזהים שלה. רק `independentFields` (מה שדף ויקיפועל עצמו
   אומר) רשאי לחלוק על הארכיון; השאר הד של euro-ties. כובשים — שם דרך ה-Player Master בלבד; שני
   כתיבים של שם לא-מזוהה אינם מחלוקת, שני אנשים — כן (`scorers` claim + `scorersDisputed`); דקה שונה =
   `scorers.minute` (הכרטיס לא מדפיס דקות). walkover → `notPlayed`. מחלוקות שהקובץ שימר → claims.
