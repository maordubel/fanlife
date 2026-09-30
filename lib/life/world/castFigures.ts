import { LEGACY_POSE } from '../runtime/art'

/**
 * ------------------------------------------------ מי שמדבר — יש לו גוף ----
 *
 * מאור, 21.9.2026: *"שיהיה באמת ריקוד וסנכרון מלא בין הסיפור לבין הנראה על המסך."*
 *
 * סריקה של החדרים ב-2000–2026 מצאה שכמעט אף אחד מהאנשים שמדברים בהם לא עומד בהם: שני
 * קובי של 2000 בסלון, שני אנשים באלנבי, והשחקנים באוסישקין — וזהו. בכל שאר הפרקים שיחה
 * של ארבעה אנשים נפתחה בחדר ריק, והזנב של הבועה חיפש בין הקירות את מי שמדבר.
 *
 * הטבלה הזאת היא התשובה לשאלה *"איך נראה X בשנים האלה"*, פעם אחת לכל אדם. היא משרתת שני
 * דברים: אנשים שהוצבו בחדר (`rooms2000.ts`), ו**מלווים** — מי שמדבר בשיחה שנפתחה בלי שהוא
 * עומד בחדר, ונכנס אליו לצד פוגי לאורך השיחה (`WorldScene.summonSpeakers`).
 *
 * **תחליפים מסומנים.** לרבים מהאנשים של העשורים האלה אין עדיין גוף מצויר משלהם. הם עומדים
 * על גוף מגיליונות הקהל, תמיד אותו גוף לאותו אדם — כמו שלירון עומד על `adultB2` מאז 1996 —
 * ו-`standIn` אומר את זה, כדי שרשימת הגופים החסרים ב-ART-PROMPTS (§16) תיגזר מכאן ולא
 * תיכתב מהזיכרון.
 */

export type CastFigure = {
  /** the figure a person stands on in these years */
  figure: string
  /** a crowd-sheet body standing in for a person nobody has drawn yet */
  standIn?: boolean
  /** a person who grows up on screen: the body from this year on */
  fromYear?: Readonly<Record<number, string>>
  /**
   * ...and the face in the box from the same year (24.9.2026). Always the plate cut from
   * the body of that year (`ingest-characters-2026-09-24.py`), so the two keys move together
   * and `life:identity` checks that they do.
   */
  faceFromYear?: Readonly<Record<number, string>>
}

/**
 * ------------------------------------------------ הגיל בגוף — 2000–2026 (24.9.2026) ----
 *
 * `THE-WORKER-CHARACTERS-2000-2026-55` (README): פוגי 32 ל-2010–2013, 40 ל-2016–2021, 47
 * ל-2023–2026; קובי 62 ל-2010–2015, 72 ל-2017–2026; החברים בני 40 מ-2010. **כל גרסה מתחילה
 * בשנה הראשונה שה-README נותן לה ונמשכת עד הגרסה הבאה** — 2014–2015 הם פוגי בן 32,
 * 2016 הוא קובי בן 62, 2022 הוא פוגי בן 40. לא ניחוש של גיל: חור בין שתי גרסאות נסגר
 * תמיד בזו שכבר נראתה, כי קפיצה אחורה בגיל גרועה מעיכוב של שנה.
 *
 * **הצעיף של פוגי בן 40.** הסט נמסר עם צעיף בכל חמש התנוחות, והחלופה בלי צעיף לא נמסרה.
 * הנתונים של הסצנות לא יודעים "יום משחק" באופן שהגוף יכול לקרוא, ולכן ההכרעה: 2016–2022
 * הוא בצעיף תמיד — אוהד בן ארבעים שהצעיף הוא חלק ממנו. גרסה בלי צעיף מבוקשת (דוח 88).
 */
const POGI_BY_YEAR: ReadonlyArray<readonly [number, string]> = [
  [2010, 'pogi32'],
  [2016, 'pogi40'],
  [2023, 'pogi47'],
]

/** the shape `content/era.ts` gives its player — structural, so this file imports no content */
export type PlayerBody = {
  pose: { down: string; downSide: string; side: string; up: string }
  walk: readonly string[]
  scale?: number
}

/** the grown man's body in this year, or null — before 2010 he is `hero90`, as the era says */
export function pogiBodyIn(year: number): string | null {
  let body: string | null = null
  for (const [from, key] of POGI_BY_YEAR) if (year >= from) body = key
  return body
}

/**
 * הגוף של פוגי בשנה הזאת — the era's own player record, aged.
 *
 * Only the young man ages here: a chapter whose player is `hero90` (`YOUNG_MAN`) and whose
 * year has a later body gets that body, with the same scale (the same man, the same
 * height — `heights.ts` gives all four 1.78). Every other record (the child, the teen,
 * the soldier) comes back untouched, and so does the same object when nothing changes.
 */
export function playerFor<P extends PlayerBody>(year: number, player: P): P {
  if (player.pose.down !== 'hero90') return player
  const body = pogiBodyIn(year)
  if (!body) return player
  return {
    ...player,
    pose: { down: body, downSide: `${body}-3q`, side: `${body}-side`, up: `${body}-back` },
    walk: [`${body}-side`, `${body}-walk`],
  }
}

/** Pogi's plate in this year, from the same body */
export function pogiFaceIn(year: number): string | null {
  const body = pogiBodyIn(year)
  return body ? `face${body[0]!.toUpperCase()}${body.slice(1)}` : null
}

/**
 * Keyed by the name a line is spoken under (`Say.who`), after `PARTNER` resolves. Aliases
 * a writer uses (`אבא`) are keyed too, because the lookup is by what the box prints.
 */
export const CAST_2000: Readonly<Record<string, CastFigure>> = {
  // ---- המשפחה
  // 62 from 2010, 72 from 2017 — the body and the plate cut from it, together
  'קובי': { figure: 'kobi90-stand', fromYear: { 2010: 'kobi62-3q', 2017: 'kobi72-3q' }, faceFromYear: { 2010: 'faceKobi62', 2017: 'faceKobi72' } },
  'אבא': { figure: 'kobi90-stand', fromYear: { 2010: 'kobi62-3q', 2017: 'kobi72-3q' }, faceFromYear: { 2010: 'faceKobi62', 2017: 'faceKobi72' } },
  // Rachel at sixty is a PORTRAIT: the delivery drew no body for her (README, "לא התבקש גוף").
  // The face ages in the box from 2010 and she still stands on the 1990 body — the one
  // declared split in the cast (`PORTRAIT_ONLY`, below), and the first body on the art list
  'רחל': { figure: 'rachel90-3q', faceFromYear: { 2010: 'faceRachel60' } },
  'אמא': { figure: 'rachel90-3q', faceFromYear: { 2010: 'faceRachel60' } },
  // the child exists only when `life:child` does. Until 21.9.2026 he stood on his FATHER at
  // the same age — `pogi`, then `hero80` — and spoke with `facePogi`: the player looked at
  // the boy he had been playing for forty chapters and was told it was his son. Maor: "אתה
  // מציג את פוגי כילד — זו טעות." There is no photographed boy of eight in the art who is
  // not one of the named children of 1986, so until the son is drawn (ART-PROMPTS §16) he
  // is a child seen from behind — red shirt, jeans, no face — and speaks with a face that
  // is not Pogi's (`FACES_2000`)
  'הילד': { figure: 'pogi-back', standIn: true },

  // ---- החבורה
  // the friends at forty, from 2010 ("2010–2026 לפי סצנה" — and no scene asks for younger)
  'אופיר': { figure: 'ofir90-3q', fromYear: { 2010: 'ofir40-3q' }, faceFromYear: { 2010: 'faceOfir40' } },
  'עמית': { figure: 'amit90-3q', fromYear: { 2010: 'amit40-3q' }, faceFromYear: { 2010: 'faceAmit40' } },
  'אפי': { figure: 'efi96-3q', fromYear: { 2010: 'efi44-3q' }, faceFromYear: { 2010: 'faceEfi44' } },
  // Keren's 1990s sheet is cut at the hip, so from 2000 she stood on a crowd woman (`adultB3`)
  // with that woman's face. P0 of the graphics audit (23.9.2026): from 2000 she is Keren —
  // the only grown Keren there is, at forty, a few years early rather than a stranger
  'קרן': { figure: 'keren40-3q' },
  // the crowd sheets' `young*` bodies are boys of thirteen with the de-yellow pass in their
  // skin; a grown friend stands on a grown body, even a borrowed one
  'מתוקי': { figure: 'adultA4', standIn: true },
  // A2 went to Freddy (below), whose own sheet is cut at the knee; Roma never meets him
  'רומא': { figure: 'adultA6', standIn: true },

  // ---- אוסישקין והיציע
  'שחור': { figure: 'shachor' },
  'יוסף': { figure: 'yosef' },
  'אסף': { figure: 'asaf' },
  // `melamed*` are the same 2.4× upscale of a small ILLUSTRATED sheet as Freddy's: a drawn
  // man, posterised, in photographed rooms (21.9.2026). A clean stand-in until his sheet
  // is drawn whole (ART-PROMPTS-2000-2026, appendix ה׳), and his darbuka beside him
  'מלמד': { figure: 'adultA1', standIn: true },
  // `freddy` is a 2.4× upscale of a small ILLUSTRATED sheet cut at the knee: in a 2025 office
  // he floated, green, with no legs — a drawing in a photograph. From 1995 on he stands on a
  // clean adult until his sheet is drawn whole, and the box shows that adult's face
  'פרדי': { figure: 'adultA2', standIn: true },
  // Maor's canonical Barry (23.9.2026, `barry-3q-green`) is the slim man of `barryToday` —
  // not `barry96`, who is somebody else. The transistor version: its shirt is plain, so it
  // is not an anachronism in any year (`ingest-michel-2026-09-08.py`)
  'בארי': { figure: 'barryRadio-3q' },
  // the 1999 Michel — the red tracksuit his plate (`faceMichel`) was cut from — not the
  // 1996 walk cycle, which is a man crossing a street
  'מישל': { figure: 'michel99-3q' },
  'סוקו': { figure: 'soko' },
  // the bald man of Maor's reference (23.9.2026), overwritten under the old key: the
  // long-haired figure that stood here is gone. Tank top and jeans — every scene he is in
  // is the kiosk at night; the red basketball kit (`hermesh-ball`) waits for a hall scene
  'עומר': { figure: 'hermesh-3q' },
  'חרמש': { figure: 'hermesh-3q' },
  'ענבל': { figure: 'adultB7', standIn: true },
  'יבגני': { figure: 'adultB4', standIn: true },

  // ---- השכונה והעבודה
  'רפי': { figure: 'oldMan' },
  'רפי מהקיוסק': { figure: 'oldMan' },
  'לירון': { figure: 'adultB2', standIn: true },
  // Yaron served with him; he has stood on A4 since the kiosk of 1996 — the same body ten
  // years on, not the old man with the shopping bag (A7) this table first gave him
  'ירון': { figure: 'adultA4', standIn: true },
  'אילן': { figure: 'adultB1', standIn: true },
  'אילן השכן': { figure: 'adultB1', standIn: true },
  // בתיה עומדת על עצמה מ-27.9.2026: מאור, *"יש צילום שלה בתיקייה, ובמשחק היא עומדת על גוף
  // תחליפי. לחתוך אותה מהצילום? כן."* — `batya` + `faceBatya`, נחתכו מהצילום
  // (`scripts/life/ingest-batya-2026-09-27.py`). אישה בת ~60, ולכן רק מ-2000 (`activeEras`)
  'בתיה': { figure: 'batya' },
  'אולי': { figure: 'adultA6', standIn: true },

  // ---- אנשים שהחיים פוגשים
  'לינה': { figure: 'adultB5', standIn: true },
  'ניקו': { figure: 'adultA1', standIn: true },
  // the editor: glasses and a cardigan. The only drawn woman left once the three partners
  // and Keren each have a body of their own (see the note on PARTNER, below)
  'שני': { figure: 'teacher-3q', standIn: true },
  'מאיה': { figure: 'teacher', standIn: true },
  // Michal meets the partner in 2025-owner; `rooms2000.ts` swaps her body when the partner is Melanie
  'מיכל': { figure: 'adultB7', standIn: true },
  'אדם': { figure: 'adultA1', standIn: true },
  'מראיינת': { figure: 'teacher-3q', standIn: true },
  'גור': { figure: 'adultB4', standIn: true },
  'יונתן': { figure: 'adultA6', standIn: true },
  // `girlTeen` is a girl of twelve. Neta plays bass in a band in 2012; she stands on a woman
  'נטע': { figure: 'adultB7', standIn: true },
  'אלכס': { figure: 'adultB2', standIn: true },

  // ---- PARTNER — שלוש האפשרויות (`lib/life/partner.ts`), בשם שהתיבה מדפיסה
  //
  // 21.9.2026: דור עמדה על `girlTeen` — ילדה בת שתים-עשרה — כבת זוג. ותמר על הגוף של המורה
  // מ-1991. שלוש נשים שנפגשות באותו ערב (2011-people) חייבות שלושה גופים, ואף אחד מהם לא
  // של קרן, שחוזרת בכל חיים שבהם אין בן/בת זוג. יש בדיוק חמש נשים מצוירות בגיל הזה —
  // B3, B5, B6, B7 והמורה — וזה כל התקציב: קרן, מלאני, דור, תמר ושני. מי שנשאר (לינה,
  // ענבל, נטע, מיכל) חולק גוף עם מישהי שלא נפגשת איתה באותו פרק. (בתיה יצאה מהרשימה
  // ב-27.9.2026 — יש לה גוף משלה, מהצילום.)
  'מלאני': { figure: 'adultB7', standIn: true },
  'דור': { figure: 'adultB6', standIn: true },
  'תמר': { figure: 'adultB5', standIn: true },
}

/**
 * הפנים בתיבה — אותו אדם שעומד על הרצפה (21.9.2026, כלל 67).
 *
 * `ownFace` ב-`era.ts` מלביש את המפה הזאת על כל פרק מ-2000, כך שמי שמדבר בתיבה נראה
 * כמו מי שעומד בחדר. ללוחות של התחליפים — חיתוך מהגוף שבטבלה למעלה
 * (`scripts/life/cast-faces-2026-09-21.py`). מי שיש לו פנים משלו (רחל, אופיר, עמית, שחור,
 * יוסף, אסף, מלמד, פרדי, מישל...) לא מופיע כאן: הפרקים שלו כבר נושאים את הלוח שלו,
 * ו-`ownFace` מגדל את הפנים של 1986 (`GROWN_PLATE` — קובי, אופיר, עמית, קרן). אפי כאן כי
 * הגוף של 1996 שלו חדש יותר מכל מפה.
 */
export const FACES_2000: Readonly<Record<string, string>> = {
  // a boy who is not Pogi (the classroom sheet of 1991); see `CAST_2000`
  'הילד': 'faceKid',
  'אפי': 'faceEfi96',
  'קרן': 'faceKeren40',
  // (24.9.2026) two people with a body in this table and no plate in any adult map: Barry
  // (`faceBarry`, re-cut from the canonical Barry) and Omer Hermesh (re-cut from the bald man)
  'בארי': 'faceBarry',
  'חרמש': 'faceHermesh',
  'עומר': 'faceHermesh',
  'מתוקי': 'faceStandA4',
  'רומא': 'faceStandA6',
  'פרדי': 'faceStandA2',
  'מלמד': 'faceStandA1',
  'ירון': 'faceStandA4',
  'אולי': 'faceStandA6',
  'יונתן': 'faceStandA6',
  'ניקו': 'faceStandA1',
  'אדם': 'faceStandA1',
  'אילן': 'faceStandB1',
  'אילן השכן': 'faceStandB1',
  'לירון': 'faceLiron',
  'אלכס': 'faceStandB2',
  'גור': 'faceStandB4',
  'יבגני': 'faceStandB4',
  'תמר': 'faceStandB5',
  'לינה': 'faceStandB5',
  'דור': 'faceStandB6',
  'בתיה': 'faceBatya',
  'מלאני': 'faceStandB7',
  'ענבל': 'faceStandB7',
  'נטע': 'faceStandB7',
  'מיכל': 'faceStandB7',
  // the teacher's own plate, because the body is hers
  'שני': 'faceTeacher',
  'מאיה': 'faceTeacher',
  'מראיינת': 'faceTeacher',
}

/** the two people of the nineties whose own sheets are illustrations (see `CAST_2000`) */
export const STANDIN_FACES: Readonly<Record<string, string>> = {
  'פרדי': 'faceStandA2',
  'מלמד': 'faceStandA1',
}

/**
 * הפנים בתיבה בשנה הזאת — `FACES_2000`, ומעליו הלוח של כל מי שהגוף שלו מזדקן.
 *
 * `ownFace` ב-`content/era.ts` מלביש את זה על כל פרק מ-2000. מה שמתווסף כאן הוא רק מה
 * שמשתנה עם השנה: פוגי (`pogiFaceIn`), וכל שורה ב-`CAST_2000` שיש לה `faceFromYear`.
 */
export function facesFor(year: number): Readonly<Record<string, string>> {
  const out: Record<string, string> = { ...FACES_2000 }
  const pogi = pogiFaceIn(year)
  if (pogi) out['פוגי'] = pogi
  for (const [who, row] of Object.entries(CAST_2000)) {
    if (!row.faceFromYear) continue
    let plate: string | null = null
    for (const [from, key] of Object.entries(row.faceFromYear)) if (year >= Number(from)) plate = key
    if (plate) out[who] = plate
  }
  return out
}

/** the plate this person speaks with in this year, when the cast table decides it */
export function castFace(who: string, year: number): string | null {
  return facesFor(year)[who] ?? null
}

/**
 * ------------------------------------------------ זהות — מי מותר לעמוד על מה (24.9.2026) ----
 *
 * `rooms2000.ts` מקבל `row.figure` — תנוחה אחרת מהעמידה — וזה היה פתח עקיפה: סצנה יכלה
 * לתת לאדם בעל שם גוף של מישהו אחר. מעכשיו תנוחה של אדם בעל שם חייבת להיות מ**אותה
 * משפחת גופים** כמו הגוף שלו באותה שנה (`familyOf`: המפתח עד המקף הראשון — `kobi72-3q`
 * ו-`kobi72-walk` הם משפחה אחת, `kobi90-sitA` היא משפחה אחרת), או ברשימה המוצהרת למטה.
 * `cast()` זורק על כל חריגה, ו-`tests/life-identity.test.ts` בודק את כל החדרים.
 */
export function familyOf(figure: string): string {
  const head = figure.split('-')[0]!
  return FAMILY_ALIAS[head] ?? head
}

/** two keys, one shoot of one man: Barry with and without the transistor (8.9.2026) */
const FAMILY_ALIAS: Readonly<Record<string, string>> = { barryRadio: 'barryToday' }

/**
 * תנוחה של גיל קודם, בשמה ובסיבה שלה — the pose the age's own set does not have yet.
 *
 * The 2000–2026 delivery drew five poses per age: front, 3q, side, back, a stride. Nobody
 * sits. Kobi in his armchair (2012–2026) is therefore still the man of 1990 SEATED — the
 * alternative is a seventy-year-old standing where the chair is, and "יושב — יושב על
 * משהו" (rule 88) forbids that one. Listed, so the art request can be cut from it.
 */
export const POSE_FALLBACK: ReadonlyArray<{ who: string; figures: readonly string[]; from: number; to: number; why: string }> = [
  { who: 'קובי', figures: ['kobi90-sitA', 'kobi90-sitB'], from: 2010, to: 2026, why: 'בכורסה — לקובי 62/72 אין תנוחת ישיבה (kobi62-sit, kobi72-sit במבוקש)' },
]

/** a stand-in whose scene swaps her body on purpose (see `rooms2000.ts`, 2025-owner) */
export const ALT_BODY: ReadonlyArray<{ who: string; family: string; why: string }> = [
  { who: 'מיכל', family: 'adultB5', why: 'כשבת הזוג היא מלאני (B7), מיכל עוברת ל-B5 כדי ששתיהן לא יעמדו על גוף אחד' },
]

/** the face without a body of its age: declared, never inferred */
export const PORTRAIT_ONLY: ReadonlyArray<{ who: string; face: string; body: string; why: string }> = [
  { who: 'רחל', face: 'faceRachel60', body: 'rachel90', why: 'README: דיוקן בלבד, "לא התבקש גוף" — rachel60 במבוקש' },
  { who: 'אמא', face: 'faceRachel60', body: 'rachel90', why: 'כמו רחל' },
  // the son, seen from behind until he is drawn: his face may never be Pogi's (rule 88), and
  // his body is the one back view of a boy of eight there is
  { who: 'הילד', face: 'faceKid', body: 'pogi', why: 'הבן מאחור עד שיצויר (child8/child12 במבוקש); פנים של ילד שאינו פוגי' },
]

/** may this person, in this year, stand on this figure? */
export function allowedFigure(who: string, year: number, figure: string): boolean {
  // a pose documented as a different person stands for nobody (`LEGACY_POSE`, `art.ts`)
  if ((LEGACY_POSE as readonly string[]).includes(figure)) return false
  const body = castFigure(who, year)
  if (!body) return true // not a cast person: an extra, a guest
  const family = familyOf(figure)
  if (family === familyOf(body.figure)) return true
  if (POSE_FALLBACK.some((f) => f.who === who && f.figures.includes(figure) && year >= f.from && year <= f.to)) return true
  if (ALT_BODY.some((a) => a.who === who && a.family === family)) return true
  return false
}

/** the body this person has in the adult life, or null — narration, the player, a voice */
export function castFigure(who: string | null | undefined, year?: number): CastFigure | null {
  if (!who) return null
  const body = CAST_2000[who]
  if (!body) return null
  if (year === undefined || !body.fromYear) return body
  let figure = body.figure
  for (const [from, key] of Object.entries(body.fromYear)) if (year >= Number(from)) figure = key
  return { ...body, figure }
}
