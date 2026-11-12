## LIFE — זהות חזותית: האדם הנכון, בגיל הנכון (דלתא 88, 24.9.2026)

1. **גוף ופנים זזים יחד, לפי שנה.** `castFigures.ts`: `fromYear` לגוף ו-`faceFromYear` לפנים,
   תמיד לוח שנחתך מאותו גוף (`scripts/life/ingest-characters-2026-09-24.py`). פוגי הבוגר:
   `playerFor`/`pogiBodyIn` — hero90 עד 2009, pogi32 מ-2010, pogi40 מ-2016, pogi47 מ-2023
   (`era.ts` קורא ל-`playerFor` ול-`facesFor`). כל גרסה מתחילה בשנה הראשונה שה-README נותן לה.
2. **`row.figure` הוא תנוחה של אותו אדם.** `allowedFigure` (משפחה = המפתח עד המקף הראשון,
   `barryRadio`≡`barryToday`); `cast()` ב-`rooms2000.ts` זורק על חריגה. חריג מוצהר בלבד:
   `POSE_FALLBACK` (קובי 62/72 יושב בכורסה על `kobi90-sitA/B` — אין ישיבה בסט), `ALT_BODY`,
   `PORTRAIT_ONLY` (רחל 60 — דיוקן בלי גוף; הבן — מאחור, פנים שאינן של פוגי).
3. **`LEGACY_POSE` = אדם אחר תחת אותו שם** (ofir90-smoke/-crouch/-point/-sitB/-scarf,
   michel96-walk*, barry96*, hermesh-back). מחוץ ל-`FIGURE`, בתוך `RETIRED_FIGURE`.
   בארי הקנוני = `barryToday`/`barryRadio`; מישל = `michel99`; חרמש = הקירח (`hermesh*`).
4. **`npm run life:identity`** נופל על: תחליף קהל כשיש גוף משלו, שני אנשים על גוף קנוני אחד
   באותה שנה, פנים שנחתכו מגוף אחר, תנוחה של אדם אחר, פוגי על hero90 אחרי 2009.
   `npm run life:cast-art` = הדוח לכל אדם ועידן. `tests/life-identity.test.ts` מחזיק את שניהם.
5. **תצלומי בלומפילד (bloom80Goal/bloom90Side/bloom90Corner) הם יציע ריק** — החדר רק ביום בלי
   משחק (`STAND_80S`, `STAND_90S`); ביום משחק נשאר `stand` עם הקהל. השלטים הצהובים עברו
   de-yellow רגיל: חריג צהוב לצילום נותן רק מאור, על קובץ, אחרי מדידה.
