/**
 * החריג הראשון לחוק הצהוב — ומה שקובע אם מותר להוסיף שני.
 *
 * Rule 8 forbids yellow absolutely, and the reason is not aesthetic: yellow is the
 * other club's colour, and a Hapoel product that prints it has said something. That is
 * why the rule survived four attempts to smuggle it back in through JPEG chroma, h.264
 * decode and Next's WebP re-encode (rules 8, 27).
 *
 * On 1.9.2026 Maor approved one, in writing, when the exact yellow was put to him with
 * the frame it appears in: **"הצהוב הזה מאושר"**. It is the opposition's shirt in the
 * opening animation — `#f2c500` on the player Hapoel goes past. The yellow is the point
 * of the shot. It is on the OTHER team, and it is losing.
 *
 * The rule is not relaxed; a single asset is named. That distinction is the whole file:
 *
 *  · **The exemption is a path, not a colour.** `#f2c500` anywhere else — a component,
 *    a token, another asset — still fails. Nothing here whitelists a hue.
 *  · **It carries who approved it and when**, because the next person to read the
 *    scanner's output will ask, and "somebody decided this once" is not an answer.
 *  · **The list is asserted to be exactly this long.** `tests/brand.test.ts` fails if
 *    an entry is added, so widening it is a decision somebody has to make out loud
 *    rather than a line that slips into a delta. It grew from one to four on 17.9.2026,
 *    and that is what "out loud" looks like: a failing test, a measurement in the entry,
 *    and the owner's own sentence beside it.
 *
 * Owner-granted, asset-scoped, and never a precedent.
 */
export type YellowExemption = {
  /** the file, relative to the repo root — matched exactly, never as a prefix */
  path: string
  /** who allowed it, in their own words, and when */
  approvedBy: string
  approvedOn: string
  why: string
}

/**
 * ...ושלושה קבצים שנוספו ב-17.9.2026, אחרי שהמדידה הוצגה והתשובה חזרה במשפט אחד.
 *
 * `opening-2026-09-17.mov` הוא סרט הפתיחה של משחק החיים — 21.4 שניות בשחקנים חיים, עם
 * הכתוביות צרובות בתמונה. הוא **נמדד ב-16.9 ולא נשלח**, וזה כתוב במלואו
 * ב-`docs/life/OPENING-FILM-2026-09-17.md`: הפס הקנוני של `lib/isYellow.ts`, נמדד על
 * הפענוח (כלל 61), על **כל** 642 הפריימים.
 *
 * הסיבה שהוא לא נשלח אז הייתה נכונה, והיא נכונה גם היום: **אין קידוד שפותר את זה.** הצהוב
 * הוא שעת הזהב בסצנת העריסה — אור שמש חם על וילון, על טיח ועל שמיכה — ו-4.53% מפריים הם
 * שטח ולא שוליים. לנקות אותו פירושו לצבוע מחדש את התאורה של הסרט, כלומר לשלוח גרסה אחרת
 * שלו. ושני הקידודים נושאים אותו ב**יותר** פריימים מהמקור, שזה כלל 27 בדיוק.
 *
 * מה שהשתנה הוא לא המספר אלא מי הכריע. כלל 8: *"Only the owner grants one, in his own
 * words, about a specific asset."* מאור ראה את המדידה, ואז כתב, על הקובץ הזה:
 *
 *   **"הסרטון מאושר כפי שהוא."**
 *
 * זה הסדר שכלל 69 דורש — מודדים, מראים, מבקשים — והוא רץ במלואו לפני שנכתבה כאן שורה.
 * שלושה נתיבים ולא תיקייה: שני הקידודים שכלל 30 דורש, והפוסטר. הפוסטר נמדד **0** ובכל
 * זאת רשום, כי הוא פריים של אותו סרט ואי אפשר להסתמך על כך שהחיתוך לא יזוז.
 *
 * **25.9.2026 — הגרסה השנייה, ואישור שני.** הקובץ שעלה ב-23.9 אינו הסרט של 17.9: 25.84 ש׳
 * עם פסקול (775 פריימים) במקום 21.4 ש׳ (642). ה-WebM של אותה העלאה נחתך ב-7.95 ש׳, קודד
 * מחדש מה-MP4, ושני הקידודים נמדדו מחדש על כל 775 הפריימים המפוענחים. המדידה הוצגה עם
 * השאלה "האם אתה מאשר את הגרסה **הזאת**", והתשובה, על הקובץ הזה:
 *
 *   **"מאשר את הגרסא החדשה, עם הצהוב."**
 *
 * `approvedBy` מצטט את המשפט של היום; המשפט של 17.9 והמספרים של 642 הפריימים נשארים
 * בכניסה, כי אישור הוא היסטוריה ולא ערך שדורסים.
 */
export const YELLOW_EXEMPTIONS: readonly YellowExemption[] = [
  {
    path: 'public/video/intro.mp4',
    approvedBy: 'מאור הראל — "הצהוב הזה מאושר"',
    approvedOn: '2026-09-01',
    why: 'חולצת היריבה באנימציית הפתיחה — הצהוב הוא על הקבוצה השנייה, והיא מפסידה',
  },
  {
    path: 'public/life/opening/opening-film.webm',
    approvedBy: 'מאור הראל — "מאשר את הגרסא החדשה, עם הצהוב."',
    approvedOn: '2026-09-25',
    why:
      'סרט הפתיחה של משחק החיים, VP9. שעת הזהב בסצנת העריסה — 367 מתוך 642 פריימים, ' +
      'הגרוע 4.4756%. אין קידוד שמוריד את זה; ניקוי פירושו לצבוע מחדש את התאורה של הסרט. ' +
      '25.9.2026: הגרסה שעלתה ב-23.9 (25.84 ש׳, 775 פריימים) קודדה מחדש מה-MP4, כי ה-WebM שעלה ' +
      'נחתך ב-7.95 ש׳; נמדד מחדש על כל הפריימים המפוענחים: 633 מתוך 775, הגרוע 2.3180%. ' +
      'היסטוריה: הגרסה של 17.9 (21.4 ש׳, 642 פריימים) אושרה ב-17.9.2026 — "הסרטון מאושר כפי שהוא."; ' +
      'הגרסה הזאת (25.8 ש׳, עם פסקול) אושרה ב-25.9.2026 אחרי שהמדידה שלמעלה הוצגה',
  },
  {
    path: 'public/life/opening/opening-film.mp4',
    approvedBy: 'מאור הראל — "מאשר את הגרסא החדשה, עם הצהוב."',
    approvedOn: '2026-09-25',
    why:
      'אותו סרט, h.264 — הקידוד השני שכלל 30 דורש. 378 מתוך 642 פריימים, הגרוע 4.5682% — ' +
      'יותר פריימים מהמקור (352), וזה בדיוק מה שכלל 27 מתאר: הפענוח ממציא צהוב. ' +
      '25.9.2026: הקובץ שעלה ב-23.9 הוא גרסה של 25.84 ש׳ עם פסקול; נמדד מחדש על כל 775 ' +
      'הפריימים: 622 עם צהוב, הגרוע 2.4150%. ' +
      'היסטוריה: הגרסה של 17.9 (21.4 ש׳, 642 פריימים) אושרה ב-17.9.2026 — "הסרטון מאושר כפי שהוא."; ' +
      'הגרסה הזאת (25.8 ש׳, עם פסקול) אושרה ב-25.9.2026 אחרי שהמדידה שלמעלה הוצגה',
  },
  {
    path: 'public/life/opening/opening-film-poster.png',
    approvedBy: 'מאור הראל — "מאשר את הגרסא החדשה, עם הצהוב."',
    approvedOn: '2026-09-25',
    why:
      'הפריים הראשון של אותו סרט — כרטיס הכותרת "1978" על שחור. נמדד אפס פיקסלים צהובים, ' +
      'ורשום בכל זאת: הוא פריים של הסרט, ואסור שהחלטה תישען על כך שהחיתוך לא יזוז. ' +
      'היסטוריה: רשום עם הגרסה של 17.9 ("הסרטון מאושר כפי שהוא.", 17.9.2026); ' +
      'האישור של הגרסה החדשה (25.9.2026) חל גם עליו, כפריים של אותו סרט',
  },
  /*
   * הסמל של 1997–2000 (22.9.2026). ב-1.9.2026 הקובץ הזה לא נכתב בכלל — `scripts/brand/crests.py`
   * דילג עליו בכוונה, כי כלל 8 לא מכיר חריג לאמנות. מאור שלח אותו שוב עם המשפט שלמטה, על
   * הסמל הזה בלבד. נמדד על הקובץ ששולח (`scripts/brand/crests-2026-09-22.py`): 11,747 פיקסלים
   * בפס הקנוני, 545×560, PNG פלטה — כלומר אין קידוד שיכול להוסיף עליהם.
   */
  {
    path: 'public/brand/crests/keter-color.png',
    approvedBy: 'מאור הראל — "שהיה עם צהוב. וזה מאושר! זה ההיסטוריה"',
    approvedOn: '2026-09-22',
    why:
      'סמל המועדון של 1997–2000: "כתר KETER" בצהוב ובכתום על רצועה כחולה. הצהוב הוא הסמל ' +
      'עצמו באותן שנים, לא בחירה עיצובית שלנו; 11,747 פיקסלים בפס הקנוני בקובץ ששולח',
  },
] as const

/**
 * The exempt FILES as the browser asks for them (`/brand/crests/keter-color.png`) — what the QA
 * sweeps hide before they count, so an approved asset is not reported and nothing else is hidden.
 */
export function exemptWebPaths(): string[] {
  return YELLOW_EXEMPTIONS.filter((e) => e.path.startsWith('public/')).map((e) => e.path.slice('public'.length))
}

/** Is this file allowed to contain yellow? Exact path match only — no prefixes. */
export function yellowAllowed(path: string): boolean {
  return YELLOW_EXEMPTIONS.some((exemption) => exemption.path === path)
}

/**
 * החריג השני — הצהוב על היריבה, ורק עליה.
 *
 * A file exemption cannot cover a 3D scene, because a 3D scene has no file: it builds its
 * colour at runtime and the pixel scanner never sees a PNG to count. So the football
 * engine needed a second kind of entry, and it needed to be the same shape as the first —
 * a NAMED SURFACE, an approver, a date, and a reason — rather than a relaxed rule.
 *
 * On 7.9.2026 Maor granted exactly that, in writing and with the limit inside the grant:
 * **"במשחק הזה יש אישור להשתמש בצהוב על מנת לסמן יריבים בצהוב. אך על יריבים בלבד."**
 *
 * So: one surface, the away side's kit, and the code that produces it refuses to produce
 * it for the player's own side — `awayMarkColour` throws rather than returns. A yellow
 * Hapoel shirt is not a bug to be caught in review; it is not reachable.
 *
 *  · **The colour lives HERE, not in the runtime palette.** `tests/life.test.ts` asserts
 *    that no value in `LIFE_PALETTE` is yellow and that no six-digit hex literal appears
 *    anywhere under `lib/life/`. Both of those stay true, and the one approved yellow in
 *    the product sits in the file that explains why it exists.
 *  · **The list is asserted to be exactly this long**, like the file list above, so
 *    widening it stays a decision somebody makes out loud.
 */
export type RuntimeYellowSurface = {
  /** the surface id, matched exactly — never a prefix, never a folder */
  surface: string
  /** `#RRGGBB`; a string rather than a numeric literal so the runtime guard stays absolute */
  colour: string
  approvedBy: string
  approvedOn: string
  why: string
}

export const RUNTIME_YELLOW_SURFACES: readonly RuntimeYellowSurface[] = [
  {
    surface: 'football/away-kit',
    colour: '#f2c500',
    approvedBy: 'מאור הראל — "יש אישור להשתמש בצהוב על מנת לסמן יריבים בצהוב. אך על יריבים בלבד."',
    approvedOn: '2026-09-07',
    why: 'חולצת היריבה בשחזור התלת-מימד — הצהוב מסמן את הקבוצה השנייה בלבד, ולעולם לא את הפועל',
  },
] as const

/** Is this named runtime surface allowed to be yellow? Exact match only. */
export function yellowSurfaceAllowed(surface: string): boolean {
  return RUNTIME_YELLOW_SURFACES.some((entry) => entry.surface === surface)
}

/**
 * The one approved yellow, for the one approved surface.
 *
 * Throws for anything else — including, deliberately, for the player's own side. The
 * grant was "on opponents only", and a function that can only be called correctly is a
 * better guardrail than a rule somebody has to remember.
 */
export function runtimeYellow(surface: string): string {
  const entry = RUNTIME_YELLOW_SURFACES.find((row) => row.surface === surface)
  if (!entry) throw new Error(`runtimeYellow: "${surface}" is not an approved yellow surface`)
  return entry.colour
}


/**
 * החריג השלישי — צהוב שהוא עובדה על החפץ, לא בחירה של מעצב.
 *
 * The first two entries are about something we DREW: a frame of an animation, a kit in a
 * 3D scene. Both are choices, and both were granted as a single named thing. Archive
 * photographs are a third kind, and the difference is not a matter of degree:
 *
 *   **nobody chose this yellow.** It is the Europa League badge stitched on the sleeve,
 *   the gold band Visa printed across the 1985 away shirt, an orange goalkeeper jersey.
 *   The shirt is what it is. Editing the yellow out of a photograph of a real garment
 *   does not enforce rule 8 — it falsifies the archive, which is the worse failure of
 *   the two.
 *
 * On 16.9.2026 the measurement was put to Maor before the ask, and it was remeasured on
 * the finished folder: **71 of 168 photographs carry pixels in `lib/isYellow.ts`'s band,
 * the largest 5.214% on the 1985 away shirt with Visa's gold band across it, most under
 * 0.3% and all of them a badge, a trim or an orange keeper's jersey.** He chose this over
 * removing it and over dropping the photographs.
 *
 * The shape of the grant is deliberately NOT "photographs may be yellow":
 *
 *  · **It is a folder, and the folder has exactly one kind of thing in it.** Only
 *    `public/kits/` — cut-out archive shirts, one garment per file, nothing drawn.
 *    Anything we design still fails, including in the same page.
 *  · **Every file carries its own measurement.** `content/manual/kit-photos.json` stores
 *    `yellowPx` and `yellowPct` per shirt, counted on the DECODED bytes (rule 61). The
 *    exemption is not a place yellow goes unmeasured; it is a place it goes RECORDED.
 *  · **The page is still scanned.** `qa:sweep` visits `/kits/archive` like any other
 *    route and counts yellow with the photographs hidden, so the chrome, the type and
 *    the background are held to rule 8 exactly as before.
 */
export type YellowPhotoFolder = {
  /** repo-relative folder, matched as a prefix — the ONLY prefix match in this file */
  folder: string
  approvedBy: string
  approvedOn: string
  why: string
  /** what was measured when it was granted, so the next reader is not asked to trust */
  measuredOn: string
  filesWithYellow: number
  filesTotal: number
  maxPercent: number
}

/**
 * ...ושתי תיקיות, מ-17.9.2026, כי ההכרעה הורחבה במפורש ולא בדרך אגב.
 *
 * The kit folder was granted for one sentence's worth of reasoning — a photograph of a
 * real garment is not a thing anybody designed. On 17.9.2026 Maor was shown the same
 * measurement for a folder of scanned PAPER and answered with the general form of it:
 *
 *   **"בתמונות מקור ושל דברים אותנטים הצהוב מאושר להישאר."**
 *
 * That is wider than the first grant and it is still not "photographs may be yellow": it
 * names ORIGINALS and AUTHENTIC OBJECTS, which is a property of the subject rather than of
 * the file. So the shape is unchanged — a folder that holds exactly one kind of thing, a
 * per-file measurement, and a test that re-derives the declaration — and the list is two
 * entries long instead of one, which is a thing somebody has to notice.
 */
export const YELLOW_PHOTO_FOLDERS: readonly YellowPhotoFolder[] = [
  {
    folder: 'public/kits/',
    approvedBy: 'מאור הראל — בחר "חריג שלישי — תצלומים תיעודיים" כשהמדידה הוצגה לו',
    approvedOn: '2026-09-16',
    why: 'תצלומי ארכיון של חולצות אמיתיות — סמל היורופה ליג על השרוול, פס הזהב של ויזה 1985, וחולצות שוער כתומות. הצהוב הוא תכונה של החפץ, וניקוי שלו מזייף את הארכיון',
    measuredOn: '2026-09-16',
    // Counted on pixels, not on the rounded percentage — four of the 71 carry a single
    // yellow pixel and round to 0.000%. Both numbers are re-derived from
    // content/manual/kit-photos.json by tests/brand.test.ts, so they cannot drift.
    filesWithYellow: 71,
    filesTotal: 168,
    maxPercent: 5.214,
  },
  {
    folder: 'public/life/artefacts/',
    approvedBy: 'מאור הראל — "בתמונות מקור ושל דברים אותנטים הצהוב מאושר להישאר."',
    approvedOn: '2026-09-17',
    why:
      'עשרה חפצים אמיתיים שנסרקו מהארכיון שלו — המסכה של פנדל, ה-X של הזהב שמישהו ניקב בכרטיסיית ' +
      'נוער, נייר שהצהיב בארבעים שנה. אף אחד לא בחר בצהוב הזה, וניקוי שלו מזייף את הסריקה. ' +
      'הציורים באותה מסירה עברו de-yellow רגיל — סביבה מצוירת אינה מסמך',
    measuredOn: '2026-09-17',
    /**
     * **וזה מספר גדול בהרבה מהראשון, וזו הנקודה ולא תופעת לוואי.**
     *
     * 5.214% בתיקיית החולצות הוא פס זהב על שרוול. 21.185% כאן הוא **המסכה של פנדל**: לוחית
     * צהובה ברוחב השער, מעל נייר שהצהיב, מעל רצועת יציע מודפסת. אין דרך להוריד את המספר
     * הזה בלי לצייר מחדש את השער — כלומר בלי לזייף את החפץ — ולכן הוא נמדד, מוצג ונרשם.
     * העשרה כולם נושאים צהוב; חמישה מהם מתחת ל-0.05%, וארבעה מהם הם ארבעת שערי פנדל.
     *
     * שני המספרים נגזרים מחדש ב-`tests/brand.test.ts` מתוך `content/manual/life-artefacts.json`,
     * כמו בתיקייה הראשונה: אישור שמצטט מדידה שכבר אינה נכונה הוא אישור למשהו אחר.
     */
    filesWithYellow: 10,
    filesTotal: 10,
    maxPercent: 21.185,
  },
] as const

/** Is this file inside a folder where photographed yellow is allowed? */
export function yellowPhotoAllowed(path: string): boolean {
  return YELLOW_PHOTO_FOLDERS.some((entry) => path.startsWith(entry.folder))
}
