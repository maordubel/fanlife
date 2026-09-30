# ניקיון השורש — מה נמחק, מה נשאר, ולמה

> עודכן 7.9.2026, אחרי שמאור שאל את השאלה הנכונה: *"תכל'ס אני יכול למחוק כל מה שלא בתיקייה חוץ מהקבצים האלו?"*

## הכלל, בשורה אחת

**בשורש של הריפו נשארים 12 קבצים בלבד. אם קובץ בשורש הוא לא אחד מהשנים־עשר — הוא מת.**

## שנים־עשר הקבצים שנשארים

| קובץ | למה |
|---|---|
| `package.json` | בלעדיו אין פרויקט — לא build, לא deploy |
| `package-lock.json` | נועל את גרסאות הספריות; מחיקה שוברת build בלי סיבה נראית |
| `CLAUDE.md` | ספר החוקים של הפרויקט |
| `README.md` | דף הפתיחה של הריפו |
| `tsconfig.json` | הגדרות TypeScript |
| `tsconfig.all.json` | אותן הגדרות, כולל `scripts/` ו-`tests/` |
| `next.config.mjs` | הגדרות Next.js |
| `next-env.d.ts` | טיפוסים ש-Next מייצר |
| `postcss.config.mjs` | העיצוב |
| `tailwind.config.ts` | העיצוב |
| `vitest.config.ts` | הבדיקות |
| `vercel.json` | ה-deploy |

וכל התיקיות: `app` · `brand` · `claude` · `components` · `content` · `data` · `docs` · `lib` · `messages` · `public` · `scripts` · `supabase` · `tests` · `types`.

## מה נמחק — כ-140 קבצים, בחמש קבוצות

**1 · 51 קבצי קוד** (`.ts` / `.tsx` / `.mjs`). כל אחד מהם עותק מת של קובץ שחי בתיקייה:

| בשורש | הקובץ האמיתי |
|---|---|
| `LifeStage.tsx` | `app/life/LifeStage.tsx` |
| `WorldScene.ts` · `PrologueScene.ts` | `lib/life/runtime/scenes/` |
| `art.ts` `audio.ts` `bus.ts` `context.ts` `game.ts` `input.ts` `matchDirector.ts` | `lib/life/runtime/` |
| 18 קבצי `chapter*` `dialogue*` `encounters*` `beats.ts` `script.ts` `matchScripts.ts` | `lib/life/content/` |
| `scenes.ts` | `lib/life/world/` |
| `checklist.ts` `consequence.ts` `money.ts` | `lib/life/` |
| `DebugPanel` `DialogueBox` `HelpSheet` `LifeHud` `ScoreStrip` `Stamp` | `components/life/` |
| 9 קבצי `*.test.ts` | `tests/` |
| `chapter-probe.mjs` `match-shots.mjs` `playthrough.mjs` | `scripts/life/` |
| `dialogue (1).ts` | אין מקבילה — עותק כפול של הורדה |

**2 · כ-40 תמונות וקבצי סאונד.** `alley.png`, `gate5.png`, `hatikva.png`, `classroom98.png`, `crowd-real-*.m4a/.ogg`, `amb-park.*`, `soccer-crowd.mp3`, `urban-park-ambience.mp3` וכל השאר. נבדקו אחד־אחד: המקור חי ב-`public/life/art/` וב-`public/life/sfx/`.

**3 · קבצי נתונים כפולים.** `he.json` (המקור: `messages/he.json`), `manifest.json` (המקור: `public/life/art/manifest.json`), ושלושה קבצים בלי סיומת בכלל — `dialogue`, `download`, `manifest`.

**4 · סקריפטים ושאריות.** `serve.sh`, `deliver-d21.sh`, `ingest-2026-09-05-art.py`, `ingest-audio-2026-09-05.py`, `tsconfig.all.tsbuildinfo`, ו-`eslintrc.json` — שימו לב לנקודה החסרה: הקובץ האמיתי הוא `.eslintrc.json` והוא במקום אחר; זה שבשורש לא עושה כלום.

**5 · כל קבצי ה-`.md` וה-`.txt` הישנים.** `APPLY*.md` ×9, `READ-ME-FIRST.md/.txt`, `README-SOURCE.md`, `README-UPLOAD.md`, `DELETE-THESE.txt`, `DELETE-FROM-GIT.txt`, `DELETED.txt`, `FIX.txt`, `NOTES.md`, `ART-REQUIRED.md`, `GRAPHICS-REQUESTS*.md`, `STATUS-2026-09-05-DELTA-21.md`. כולם כבר מאורכבים תחת `docs/implementation-history/`.

## איך מוחקים — קליקים בלבד

1. פתח את הריפו ב-GitHub, במסך הראשי.
2. לחץ על שם הקובץ.
3. בפינה הימנית־עליונה — כפתור פח האשפה (**Delete this file**).
4. גלול למטה → **Commit changes**.
5. חזור. אפשר לצבור כמה מחיקות ל-commit אחד.

## למה זה לא ייגמר בטפיחה על השכם

עד שהמחיקה לא בוצעה, ה-CI נשאר אדום: `npm run repo:hygiene` נופל בדיוק על הקבצים האלה, וזה מכוון. כלל 59
ב-`CLAUDE.md` אומר את זה במילים — מושג אחד = קובץ קנוני אחד — והבדיקה היא מה שהופך את הכלל לאכיף. אחרי
המחיקה ה-CI יורק ירוק וכל ניסיון עתידי להעלות קובץ קוד לשורש ייחסם בפיתוח, לא בזיכרון.
