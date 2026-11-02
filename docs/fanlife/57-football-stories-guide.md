# FanLife: Football Stories — מדריך עבודה (2.11.2026)

הכל עובד בחינם: GitHub Actions (ריפו ציבורי), Supabase בחבילה החינמית, קול Kokoro, Gemini בחבילה החינמית, YouTube.
ספקים בתשלום כבויים, ונדלקים רק אם מגדירים במפורש (סעיף 6).

## 1 · הכנה חד-פעמית (3 צעדים, הכל בלחיצות)

1. **מקום לסרטים ב-Supabase**
   Supabase → פרויקט Football Master → SQL Editor → New query → מדביקים את התוכן של
   `supabase/migrations/20261102090000_worker_stories_bucket.sql` (ב-GitHub: פותחים את הקובץ → Raw → מעתיקים) → **Run**.
   בסוף אמורה להופיע שורה `worker-stories bucket · false · 52428800`.
2. **מפתח חינמי לכתיבת התסריט (Gemini)**
   aistudio.google.com/apikey → **Create API key** → מעתיקים.
   GitHub → maordubel/fanlife → Settings → Secrets and variables → Actions → **New repository secret** →
   Name: `GEMINI_API_KEY`, Secret: המפתח → Add secret.
3. **אימות הערוץ ב-YouTube** (מאפשר סרטים מעל 15 דקות ותמונה ממוזערת מותאמת)
   youtube.com/verify → מספר טלפון → קוד ב-SMS.

## 2 · הפקת סרט

1. fanlife.dubelteam.com/master/stories (נכנסים עם מפתח הבעלים).
2. בוחרים מועדון, עונה, נושא, אורך, חשיפה (מומלץ Private) → **Create**.
3. כל 10 דקות GitHub בודק אם יש עבודה ומתחיל. סרט של 12 דקות לוקח כ-2–3 שעות. ההתקדמות מופיעה בכרטיס.
4. אפשר לעצור (Pause), להמשיך, לבטל, או לנסות שוב אחרי תקלה.
5. כשהסרט מוכן: צופים בתצוגה המקדימה, בודקים את דף המגע ואת הבדיקות (QA), קוראים את התסריט.

## 3 · העלאה ל-YouTube

1. בכרטיס הסרט → **Mark upload started** → **Download master** (הקובץ נשמר אצלך).
2. studio.youtube.com → **Create → Upload videos** → גוררים את הקובץ.
3. מעתיקים מכרטיס הסרט: כותרת, תיאור (כולל פרקים ומקורות), תגיות. מעלים את התמונה הממוזערת ואת קובץ הכתוביות (SRT).
4. "Altered or synthetic content": **No** (איורים מסוגננים וקול סינתטי של אף אדם אמיתי — כך כתוב גם בתיאור).
5. Visibility: Private / Unlisted / Public / Schedule.
6. מעתיקים את מזהה הסרטון (11 תווים, מהכתובת) → בכרטיס הסרט → **Record**.
   המאסטר נמחק אוטומטית מהאחסון (כדי להישאר במסגרת ה-1GB החינמי). התצוגה המקדימה והחבילה נשארות.

## 4 · גרפיקה חדשה

- ספרי הפרומפטים: `docs/fanlife/55-football-stories-art-prompts.md`, `docs/fanlife/56-football-stories-art-round-2.md`.
- שולחים ZIP בשיחה עם Claude. הקבצים נכנסים לספרייה לפי השם (`-kr` = אדום שנצבע בצבע המועדון, `-n` = ללא צבע).
- כל מועדון מקבל וריאציות שונות של אותם ציורים, ואדום מוחלף בצבע המועדון. צבע יריבה נמחק אוטומטית.

## 5 · מה הסרט עושה לבד

תסריט שנבדק מול הארכיון (כל מספר צריך מקור) · קריינות · כתוביות צרובות מילה-במילה · תוצאות עם מבקיעים ·
מוזיקה לפי הרגע (מתח/שמחה/עצב/ניצחון) והקלטות קהל · שחקנים וקהל זזים · GOAL!/CHAMPIONS!/CUP! · קונפטי בתארים ·
סיום עם fanlife.dubelteam.com והפיצ'רים · פרקים, מקורות ותמונות ממוזערות ל-YouTube.

## 6 · אפשרויות בתשלום (כבויות)

GitHub → Settings → Secrets and variables → Actions → Variables:
- `STORIES_ALLOW_PAID` = `1` — מאפשר כתיבה עם Claude / OpenAI (צריך מפתח משלהם).
- `STORIES_VOICE` = `elevenlabs` — קול ElevenLabs (צריך `ELEVENLABS_API_KEY`; החבילה החינמית לא מספיקה לסרט מלא).

## 7 · תקלות נפוצות

| מה רואים | מה עושים |
|---|---|
| `WRITER_NOT_CONFIGURED` | חסר `GEMINI_API_KEY` (סעיף 1.2). |
| `WRITER_HTTP_429` | נגמרה המכסה היומית החינמית של Gemini — Retry מחר. |
| העבודה לא מתחילה | GitHub → Actions → "Football Stories worker" → Run workflow. |
| תקלה בהעלאת קבצים | המקום ב-Supabase לא נוצר (סעיף 1.1) או מלא — מוחקים סרטים ישנים אחרי ההעלאה. |
| סרט ארוך מ-15 דקות לא עולה | הערוץ לא מאומת (סעיף 1.3). |
