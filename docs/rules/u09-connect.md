## CONNECT — קישורים בין שערים, מדידה, כרטיסי שיתוף, דו-קרב חי (דלתא 89, 25.9.2026)

1. **קישור נפתר בשרת ונבדק.** `lib/links/index.ts` הוא המקום היחיד שבונה href לשער אחר: כרטיס ארכיון
   רק ל-id שה-Entity Graph מכיר, `/away-days?visit=<m_…>` רק לביקור VERIFIED, `/goal?g=` רק לשער
   שהשער מחלק. מסך מקבל `CrossLink[]` ומצייר `components/links/CrossLinks.tsx` (שורת שבבים אחת,
   גוללת הצידה). רמז של פרה עיוורת מצביע על משחק רק אם כל המקורות שלו הם אותו משחק. `tests/links.test.ts`
   מחזיר כל href דרך השער שמקבל אותו. AWAY DAYS קורא `?visit=`/`?venue=` בלקוח (הדף סטטי).
2. **המדידה היא שלנו.** `lib/analytics/*` + `app/api/track` + `worker_events_*`. אין מזהה, אין IP, אין
   צד שלישי; המכשיר נשמר כ-sha256 עם מלח יומי שנמחק אחרי יומיים. GPC/DNT = לא נספר. אין שורה בשער:
   `<GateMeter />` בשורש (כניסה, מגע ראשון, `tw:pickfx`, עזיבה ב-sendBeacon), הסיום מ-`emit()`.
   שער רשאי `markStep(n)` (פרה: הרמז; שער 8: השער). שם אירוע חדש = גם ב-`EVENT_NAMES` וגם ב-check
   של הטבלה (`tests/events-schema.test.ts`). `/qa/stats` — preview/dev, או `?key=` = `WORKER_STATS_KEY`.
3. **כרטיס שיתוף = `next/og` בלי bidi.** כל שורה עברית עוברת `visual()` (`lib/og/bidi.ts`) ולא נשברת
   ע"י המנוע (`lines()`). הגופנים ב-`lib/og/fonts/*.ttf` (satori לא קורא WOFF2); החולצה היא תאום
   ה-PNG של התצלום (`public/kits/og/`, `scripts/og/kit-thumbs.py` — satori לא קורא WebP). **כרטיס של
   שער 10 לא נושא שם ולא id** — רק מצב, רמזים, זמן, תוצאת דו-קרב (`lib/og/params.ts`).
4. **דו-קרב חי = אותו דו-קרב.** `20260925091000_worker_blind_cow_live.sql` מוסיף רק go_at/ready ושלוש
   פונקציות; הריצה נפתחת עם `started_at = go_at` לשני הצדדים, והשאר — שבע הפונקציות הקיימות.
   Realtime הוא פעמון בלבד (Broadcast/Presence), המצב תמיד מהמסד; בלעדיו החדר שואל כל 1.5 שניות.
5. **סדר הקבצים:** events (090000) ו-live (091000) רצים אחרי blind_cow; מריצים שוב את קובץ השוק או
   הדו-קרב → מריצים אחריהם גם אותם. `scripts/db/verify.sh` מריץ הכול פעמיים + 31/40.
