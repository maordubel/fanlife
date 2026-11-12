## AWAY DAYS — תמונות מגרשים ו"הייתי שם" (דלתא 89, 25.9.2026)

מאור: "להוסיף תמונות אצטדיונים וכפתור 'הייתי שם'". מפרט חלק ב' §29–§30.

1. **תמונה רק דרך הלדג'ר.** `content/manual/away-media.json` (צורת §29 + `assetUrlTall`, `files[]`
   עם bytes/sha256/yellowPx לכל קובץ). אין URL של תמונה בקומפוננטה, אין hotlink. מגרש בלי שורה נשאר
   טיפוגרפיה (fallback). כל מגרש ברג'יסטרי — כולל אינטרטוטו — יכול לקבל שורה בלי לגעת בדף.
2. **הקבצים נכתבים רק ע"י `scripts/away-days/ingest-media.mjs <jobs.json>`** (דוגמה:
   `scripts/away-days/media-jobs/bloomfield.json`): 1600×900 + 900×1200 WebP ב-`public/away/`, צהוב
   נספר על הפענוח; נשאר צהוב → de-yellow (טוקן קיים) עד אפס, והקרדיט אומר "צבע מעובד". תמונת מגרש
   מודרנית אינה "חפץ אותנטי" — אין לה חריג צהוב. הסקריפט מעדכן גם את `asset-provenance.json`
   (`public/away` בביקורת, origin חדש `free-licence`).
3. **רישיון:** רק Wikimedia Commons תחת CC BY / CC BY-SA / CC0 / PD, `sourceUrl` = דף ה-File, מחבר
   ורישיון כפי שבדף. העלאה של מאור = `owner-upload` + `sourceTitle`. בלי שם הבעלים בשדה קרדיט.
4. **כל תמונה מודפסת עם השנה שבה צולמה** ("צילום מ-2019" / "צילום משנות ה-80") על התמונה עצמה, וקרדיט
   (מחבר · רישיון) מתחתיה עם קישור לדף המקור. לעולם לא כאילו כך נראה המגרש בערב המשחק.
5. **"הייתי שם"** — `lib/away-days/been.ts`: `{ [visitId]: { b, at } }` ב-`worker.away.been.v1`
   (try/catch). ביטול = שורה עם b=false, לא מחיקה; מיזוג = ה-at המאוחר מנצח, בשוויון "הייתי" מנצח.
   החשבון: `worker_away_been` + `worker_away_been_list/_set` (security definer, authenticated בלבד,
   אין grant לטבלה) — אותו מיזוג בדיוק. `been-sync.ts` בתבנית `marks-sync.ts`; סנכרון בכניסה לדף ובכל
   SIGNED_IN (אורח → חשבון בלי לאבד סימון). "המסע שלי" סופר רק ביקורים ציבוריים.
6. בדיקות: `tests/away-days-media.test.ts`, `supabase/tests/50-away-been.sql` (ב-`scripts/db/verify.sh`).
