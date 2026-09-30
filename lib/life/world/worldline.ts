import { CHAPTERS, CHAPTER, chapterOpen, isWindow, windowFlagsOf, type ChapterDef } from '../content/chapters'
import { DIALOGUE } from '../content/dialogue'
import { eraFor } from '../content/era'
import type { Effect } from '../content/script'
import type { LocationId } from '../types'
import { TEACHES, guidedFlag, learnedOnArrival, routeFlag } from './areas'
import { ALL_SCENES, arrivalFor, exitInEra, inEra, needsFor, sceneIn, whenFor, type SceneDef } from './scenes'
import type { Condition } from './types'

/**
 * קו־חיים — מה באמת יכול לקרות בפרק הזה, לשחקן הזה.
 *
 * `deadend-audit` שואל אם דגל מורם **אי־פעם במשחק**. `budget-audit` שואל אם מספר ניתן
 * להשגה **אי־פעם בחיים**. שתיהן ירוקות על הריפו הזה, ובכל זאת מאור פתח את 11.3.1991,
 * המשחק שלח אותו לאולם אוסישקין, ולא הייתה דלת לאוסישקין בשום מקום.
 *
 * ההבדל הוא השאלה. דלת אוסישקין באלנבי נושאת `when: { flag: 'life:knows:hall' }`, והדגל
 * הזה מורם רק בתוך `a3-hall` — פרק שיש לו `when: ['life:a2:efi']`, כלומר פרק שילד שלא
 * עמד עם אפי באביב 1984 **לא משחק בכלל**. שתי הבדיקות הקיימות עונות "כן, הדגל מורם
 * במשחק" ו"כן, לחדר יש יציאה", ושתי התשובות נכונות ולא רלוונטיות: הן סטטיות, והשאלה
 * דינמית — **על קו החיים שהשחקן הזה נמצא עליו, אפשר לסיים את הפרק?**
 *
 * ── הסגור המונוטוני ───────────────────────────────────────────────────────────────
 *
 * חדרים ודגלים מזינים זה את זה: דלת נפתחת כי דגל עלה, ודגל עולה כי מישהו עמד בחדר.
 * לכן זו לא סריקה אחת אלא **נקודת שבת**: מתחילים מחדר הפתיחה של הפרק ומאוסף הדגלים
 * שהשחקן הגיע איתם, ומרחיבים עד שדבר לא משתנה.
 *
 *   rooms := { chapter.start.location }
 *   flags := seed
 *   חוזרים עד שאין שינוי:
 *     rooms += כל חדר שאפשר להגיע אליו דרך דלת שקיימת בפרק הזה ושהתנאים שלה מתקיימים
 *     flags += כל דגל שתוכן שעומד ב-rooms בפרק הזה יכול להרים
 *
 * ── שני כללי הכרעה, ולמה הם בכיוונים הפוכים ───────────────────────────────────────
 *
 * 1. **על דרישת דגל חיובית אנחנו קפדנים.** דלת שמבקשת דגל שלא עלה — סגורה. זו בדיוק
 *    הסמנטיקה של הישגוּת, והיא מה שהופך את החור של 1991 לנראה.
 * 2. **על כל השאר אנחנו מתירניים.** שעה, כסף, מערכת יחסים, `none`, `notFlag` — הכול
 *    נחשב בר־סיפוק. הסיבה היא כלל 66 בכיוון ההפוך: מכשיר שממציא חורים מאבד את סמכותו
 *    תוך שבוע. עדיף שלילית־שווא (חור אמיתי שלא נתפס) מאשר חיובית־שווא (דיווח על משחק
 *    עובד כשבור). `budget-audit` הוא המכשיר שאחראי על הספים המספריים; זה לא תפקידו.
 *
 * שני הכללים יחד שומרים על **מונוטוניות**: תוספת דגל ל-seed לעולם לא מקטינה לא את קבוצת
 * החדרים ולא את קבוצת הדגלים. `tests/life-worldline.test.ts` אוכף את זה, כי בלי
 * מונוטוניות אין ערובה שהלולאה עוצרת.
 *
 * ── מה עובר גבול של פרק ───────────────────────────────────────────────────────────
 *
 * `personFlags()` ב-`lib/life/events.ts` הוא מי שמכריע, ולא הערה. הוא מוחק כל דגל
 * ב-`day.entered` וב-`year.entered` חוץ מתשעה קידומות. הרשימה למטה היא העתק שלהן,
 * והבדיקה מוודאת את ההעתק מול הרדיוסר האמיתי — כי הפונקציה עצמה אינה מיוצאת, ושני
 * מקורות לאותו מושג זה בדיוק מה שכלל 59 אוסר.
 */

// ---------------------------------------------------------------------- קידומות ---

/**
 * הקידומות שיום חדש אינו מוחק — `personFlags()` ב-`events.ts`, מילה במילה.
 *
 * זה הרבה יותר מ-`life:` בלבד: `own:` הוא מה שהאדם מחזיק, `promise:` הבטחה,
 * `owe:` חוב, `went:` עם מי היית, `album:` האלבום. כולם חוצים פרק, וכולם רלוונטיים
 * לשאלה "עם מה הגעתי לפרק הזה".
 */
export const CARRIED_PREFIXES = [
  'life:',
  'onboard:',
  'cutscene:',
  'prologue:',
  'own:',
  'went:',
  'owe:',
  'promise:',
  'album:',
  'scarf:',
] as const

/** האם הדגל הזה שורד את חצות — כלומר האם פרק מוקדם יכול להוריש אותו */
export function crossesChapter(flag: string): boolean {
  return CARRIED_PREFIXES.some((prefix) => flag.startsWith(prefix))
}

/**
 * דגלים שהמודל הזה אינו מתיימר לדעת עליהם דבר, ולכן מתייחס אליהם כמסופקים.
 *
 * `own:` נכתב על ידי הרדיוסר מתוך אפקטים שלמים (`{ e: 'own' }`, `{ e: 'shirt' }`,
 * מסלולים, הישגים) ולא מתוך `{ e: 'flag' }`; `work:` שייך לג'ובים; `beat:` נכתב על ידי
 * מריץ הביטים עצמו; ודגל שהשם שלו מכיל `${` נבנה בזמן ריצה ואי אפשר להשוות אליו מחרוזת.
 * דלת שנשענת על אחד מאלה תיחשב פתוחה — כלל 2 למעלה: לא ממציאים חורים.
 */
export const OPAQUE_PREFIXES = ['own:', 'work:', 'beat:'] as const

function opaqueFlag(flag: string): boolean {
  return flag.includes('${') || OPAQUE_PREFIXES.some((prefix) => flag.startsWith(prefix))
}

/**
 * `EngineFlags` — הדגלים שהמנוע מרים ואף קובץ תוכן אינו מצהיר עליהם.
 *
 * `match:over`, `derby:over`, `onboard:street`, `curfew:now` — אף אחד מהם אינו
 * `{ e: 'flag' }` בשום שיחה; הם נכתבים בתוך `WorldScene` ובלולאת השעון. בלי הרשימה
 * הזאת המכשיר דיווח על 1986, 1990 ו-1991 כעל פרקים בלי שום סיום — הסיום שלהם תלוי
 * ב-`match:over`, והסגור לא ידע להרים אותו. זה היה הפגם הראשון של הטיוטה הזאת, והוא
 * מאותה משפחה בדיוק כמו ששת הפגמים שכלל 66 מתעד: **לקרוא דגל כמו שהרדיוסר קורא אותו,
 * או לא לדווח עליו.**
 *
 * הקבוצה מחושבת על ידי מי שקורא (הסקריפט סורק את המקור), ואינה יכולה להיות מחושבת כאן —
 * מודול טהור לא קורא מהדיסק. בדיקה שמעבירה קבוצה ריקה מקבלת את המודל הקפדני, וזה
 * המודל שהבדיקות אוכפות.
 *
 * **מה שהיא לא רשאית להכיל**: דגל שקובץ תוכן כלשהו מרים. `life:knows:hall` נכתב
 * ב-`chapterStageA.ts` ולכן אינו כאן, ולכן הדלת לאוסישקין נשארת סגורה — שאם לא כן
 * המכשיר היה מכסה בדיוק על החור שהוא נבנה בשבילו.
 */
export type EngineFlags = ReadonlySet<string>

const NO_ENGINE_FLAGS: EngineFlags = new Set<string>()

// ------------------------------------------------------------------ תנאים ---

/**
 * האם התנאי הזה **יכול** להתקיים עם אוסף הדגלים הזה.
 *
 * מונוטוני בדגלים, וזו התכונה שכל הקובץ נשען עליה: רק `flag` (ו-`flagIs` על ערך אמת)
 * מסוגלים להחזיר false, וכל אחד מהם הופך ל-true כשהדגל נוסף. `none` ו-`notFlag` אינם
 * נבדקים בכוונה — דגל שעולה מאוחר יותר לא סוגר ענף שכבר נלקח, ובדיקה שלהם הייתה
 * ממציאה חורים בדיוק בענפים ה"אחרי" של כל שיחה במשחק.
 */
export function couldHold(
  condition: Condition | undefined,
  flags: ReadonlySet<string>,
  engineFlags: EngineFlags = NO_ENGINE_FLAGS,
): boolean {
  if (!condition) return true
  const held = (flag: string) => flags.has(flag) || opaqueFlag(flag) || engineFlags.has(flag)
  if (condition.flag && !held(condition.flag)) return false
  if (condition.flagIs && condition.flagIs.value !== false && !held(condition.flagIs.flag)) return false
  if (condition.area && !areaFlags(condition.area).some(held)) return false
  if (condition.all && !condition.all.every((part) => couldHold(part, flags, engineFlags))) return false
  if (condition.any && condition.any.length > 0 && !condition.any.some((part) => couldHold(part, flags, engineFlags))) return false
  return true
}

/** כל דגל שתנאי **מתעקש** עליו — סעיפי `none` אינם דרישה, בדיוק כמו ב-`reach.ts` */
/**
 * כל הדגלים שסעיף `{ area }` מרוצה מאחד מהם — וזה מה שהופך גאוגרפיה לשאלה על דגלים.
 *
 * הפרדיקט `area` נולד ב-17.9.2026 בדיוק כדי שדלת לא תמנה בעצמה מי מלמד את הדרך, ולכן
 * המכשיר הזה הוא שצריך לדעת את הרשימה: הדגל הקנוני של האזור, ועוד דגל `guided:` לכל מי
 * ש-`TEACHES` אומר שהוא יכול לקחת לשם.
 *
 * **וזו הייתה תקלה אמיתית של המכשיר עצמו, שעה אחרי שנבנה.** `couldHold` הבין `flag`
 * ו-`flagIs` בלבד, אז סעיף בלי אף אחד משניהם חזר `true` — והדקה שבה הדלת לאוסישקין
 * עברה מ-`{ flag }` ל-`{ area }` היא הדקה שבה הביקורת הכריזה על 1991 כנקי בזמן
 * ש-`canPlayerReach` עדיין ענתה `AREA_NOT_KNOWN` על אותו מצב בדיוק. שומר שלא מכיר
 * פרדיקט **מאשר** אותו בשקט, וזה הכיוון המסוכן מבין השניים.
 */
export function areaFlags(area: string): string[] {
  const out = [routeFlag(area)]
  for (const [who, taught] of Object.entries(TEACHES)) if (taught === area) out.push(guidedFlag(who))
  return out
}

/**
 * האזורים שתנאי דורש להיכנס אליהם.
 *
 * נפרד מ-`conditionFlags` בכוונה: קבוצת דגלים שטוחה נקראת על ידי כל מי שמשתמש בה כ-**וגם**,
 * ואזור הוא **או** — הדגל הקנוני שלו, או אחד מדגלי ה-`guided:` של מי שמלמד אותו. לדחוף
 * אותם לאותה קבוצה הפך כל דלת אזור ל"מבקשת `guided:efi` **וגם** `guided:ofir`", כלומר
 * 254 חורים מדומים בתוך דקה. שאלה אחרת, פונקציה אחרת.
 */
export function conditionAreas(condition: Condition | undefined, out: Set<string> = new Set()): Set<string> {
  if (!condition) return out
  if (condition.area) out.add(condition.area)
  for (const part of condition.all ?? []) conditionAreas(part, out)
  for (const part of condition.any ?? []) conditionAreas(part, out)
  return out
}

export function conditionFlags(condition: Condition | undefined, out: Set<string> = new Set()): Set<string> {
  if (!condition) return out
  if (condition.flag) out.add(condition.flag)
  if (condition.flagIs && condition.flagIs.value !== false) out.add(condition.flagIs.flag)
  for (const part of condition.all ?? []) conditionFlags(part, out)
  for (const part of condition.any ?? []) conditionFlags(part, out)
  return out
}

// --------------------------------------------------------------- שיחות ואפקטים ---

const sceneById = new Map<string, SceneDef>(ALL_SCENES.map((scene) => [scene.id, scene]))

/** every scene the chapter's geography is drawn from, by id */
export function sceneFor(id: string): SceneDef | undefined {
  return sceneById.get(id)
}

/**
 * החדר **כפי שהוא עומד בפרק** (21.9.2026) — עם הצביעה מחדש שלו, הדלתות שעל הציור הזה,
 * הנקודות והאנשים שעברו אליו. עד היום הסגור קרא את החדר הבסיסי, כלומר ראה ב-2019 דלת
 * ליציע של 1986 שאין לה מקום על הרחבה החדשה; ברגע שחדרים שלמים עוברים לציור אחר
 * (הבית של פוגי, החדר של 2000, המגרש הסינתטי), קריאה כזו הייתה מדווחת על עולם שלא קיים.
 */
const ROOM_IN = new Map<string, SceneDef>()
export function roomIn(id: string, chapter: string): SceneDef | undefined {
  const key = `${id}@${chapter}`
  const cached = ROOM_IN.get(key)
  if (cached) return cached
  const base = sceneById.get(id)
  if (!base) return undefined
  const room = sceneIn(base, chapter)
  ROOM_IN.set(key, room)
  return room
}

type GatedEffect = { effect: Effect; gated: boolean }

/**
 * כל האפקטים של שיחה, עם הסימון אם הענף שלהם היה פתוח.
 *
 * `gated: false` פירושו "הענף הזה זמין עם הדגלים שיש עכשיו". `chapterFlags` מתעלם
 * מהסימון (הוא שואל מה הפרק יכול להרים אי־פעם), והסגור מכבד אותו.
 */
function effectsOf(id: string, flags: ReadonlySet<string> | null, engineFlags: EngineFlags = NO_ENGINE_FLAGS): GatedEffect[] {
  const conversation = DIALOGUE[id]
  if (!conversation) return []
  const out: GatedEffect[] = []
  for (const branch of conversation.branches) {
    const branchOpen = flags === null || couldHold(branch.when, flags, engineFlags)
    for (const effect of branch.then ?? []) out.push({ effect, gated: !branchOpen })
    for (const choice of branch.choices ?? []) {
      const choiceOpen = branchOpen && (flags === null || couldHold(choice.when, flags, engineFlags))
      for (const effect of choice.then) out.push({ effect, gated: !choiceOpen })
    }
  }
  return out
}

/**
 * כל השיחות שאפשר להגיע אליהן מרשימת שורשים, דרך `goto`.
 *
 * אותה הליכה בדיוק ש-`deadend-audit` ו-`budget-audit` עושות — היא משוכפלת כאן ולא
 * מיובאת משם כי סקריפט אינו מודול, ומכאן והלאה **זה** המקור: הסקריפט החדש קורא לפונקציה
 * הזאת ולא כותב שלישית משלו.
 */
function walkConversations(
  roots: readonly string[],
  flags: ReadonlySet<string> | null,
  engineFlags: EngineFlags = NO_ENGINE_FLAGS,
): Set<string> {
  const seen = new Set<string>()
  const queue = [...roots]
  while (queue.length) {
    const id = queue.shift() as string
    if (seen.has(id) || !DIALOGUE[id]) continue
    seen.add(id)
    for (const { effect, gated } of effectsOf(id, flags, engineFlags)) {
      if (gated) continue
      if (effect.e === 'goto') queue.push(effect.node)
    }
  }
  return seen
}

/** the beats a chapter runs by itself, as raw rows — `beats.ts` shapes, read defensively */
type BeatRow = {
  id?: string
  at?: LocationId | readonly LocationId[]
  when?: Condition
  do?: unknown
}

function beatsOf(chapter: string): readonly BeatRow[] {
  return (eraFor(chapter) as { beats?: readonly BeatRow[] }).beats ?? []
}

/** every room a beat says it fires in */
/**
 * החדרים של כל ביט, **ביט-ביט** (21.9.2026). עד היום זו הייתה קבוצה אחת שטוחה, והמכשיר
 * דיווח חור על כל חדר בה שאינו בסגור — כלומר ביט שיורה *"ברחוב או מחוץ לבלומפילד"*
 * נספר כיתום בשנים שבלומפילד סגור, אף שברחוב הוא יורה כרגיל. ביט הוא יתום רק כשאף אחד
 * מהחדרים שלו אינו בהישג יד — אותו כלל שהמפגשים כבר נבדקים בו (`encounter.locations.every`).
 */
export function beatRooms(chapter: string): Array<{ id: string; rooms: readonly LocationId[]; when?: Condition }> {
  const out: Array<{ id: string; rooms: readonly LocationId[]; when?: Condition }> = []
  for (const beat of beatsOf(chapter)) {
    if (!beat.at) continue
    const when = (beat as { when?: Condition }).when
    out.push({ id: beat.id ?? '?', rooms: Array.isArray(beat.at) ? (beat.at as readonly LocationId[]) : [beat.at as LocationId], ...(when ? { when } : {}) })
  }
  return out
}

type BeatAction = {
  a?: string
  flag?: string
  conversation?: string
  to?: LocationId
  id?: string
  /**
   * `a: 'derive'` carries a FUNCTION here, not a list — one beat action in the whole game
   * computes its events from the state at that moment. Every read of this field is
   * guarded, because the first draft of this file iterated it and crashed on 1993.
   */
  events?: unknown
}

/** the rows of an `a: 'events'` action, when there are rows rather than a function */
function beatEvents(action: BeatAction): ReadonlyArray<{ t?: string; flag?: string }> {
  return Array.isArray(action.events) ? (action.events as ReadonlyArray<{ t?: string; flag?: string }>) : []
}

function beatActions(chapter: string): BeatAction[] {
  const out: BeatAction[] = []
  for (const beat of beatsOf(chapter)) {
    const actions = beat.do
    for (const action of Array.isArray(actions) ? actions : []) out.push(action as BeatAction)
  }
  return out
}

// ------------------------------------------------------------ מה פרק יכול להרים ---

const CHAPTER_FLAGS = new Map<string, Set<string>>()

/**
 * `chapterFlags` — כל דגל שהפרק הזה **לבדו** יכול להרים, בלי קשר לחדר ובלי קשר ל-seed.
 *
 * הערכת־יתר בכוונה, בדיוק כמו התקרה של `budget-audit`: היא משמשת לחשב מה פרק מאוחר
 * *רשאי* לשאת איתו, ולכן חייבת להיות חסם עליון. פרק שלא יכול להרים דגל כאן לא יכול
 * להרים אותו בשום מסלול משחק.
 *
 * ארבעה מקורות — אותם ארבעה ש-`deadend-audit` מונה, מסוננים לפי עידן:
 *   א. שיחות שדמות או נקודת עניין בפרק הזה יכולה לפתוח, וכל מה שהן מובילות אליו;
 *   ב. הביטים של הפרק — `a: 'flag'` ו-`flag.raised` בתוך `a: 'events'`;
 *   ג. לוחיות ההגעה של החדרים בשנה הזאת;
 *   ד. ההזדמנויות והמפגשים של העידן, כשהם מצהירים על דגל סטטית.
 */
export function chapterFlags(chapter: string): Set<string> {
  const cached = CHAPTER_FLAGS.get(chapter)
  if (cached) return cached

  const out = new Set<string>()
  const roots: string[] = []
  for (const base of ALL_SCENES) {
    const scene = sceneIn(base, chapter)
    for (const actor of scene.actors) if (inEra(actor, chapter) && actor.talk) roots.push(actor.talk)
    for (const spot of scene.hotspots) if (inEra(spot, chapter) && spot.act) roots.push(spot.act)
    const arrival = arrivalFor(scene, chapter)
    if (arrival?.flag) out.add(arrival.flag)
  }
  for (const action of beatActions(chapter)) {
    if (action.a === 'flag' && action.flag) out.add(action.flag)
    if (action.a === 'talk' && action.conversation) roots.push(action.conversation)
    for (const event of beatEvents(action)) if (event.t === 'flag.raised' && event.flag) out.add(event.flag)
  }

  const era = eraFor(chapter)
  for (const opportunity of era.opportunities) {
    for (const outcome of opportunity.outcomes) for (const effect of outcome.effects) addEffectFlag(out, effect)
  }
  for (const encounter of era.encounters) for (const effect of encounter.effects) addEffectFlag(out, effect)

  for (const id of walkConversations(roots, null)) {
    for (const { effect } of effectsOf(id, null)) addEffectFlag(out, effect)
  }

  CHAPTER_FLAGS.set(chapter, out)
  return out
}

function addEffectFlag(into: Set<string>, effect: Effect): void {
  if (effect.e === 'flag') into.add(effect.flag)
  if (effect.e === 'flagValue' && effect.value !== false) into.add(effect.flag)
}

/**
 * כל דגל שתוכן כלשהו במשחק יכול להרים — איחוד `chapterFlags` על כל פרק מוכרז, והפרולוג.
 *
 * הפרולוג נכלל למרות ש-`playable` שלו אינו רלוונטי כאן: `life:a1:*` ו-`prologue:done`
 * נכתבים בשיחות שלו, והם תוכן לכל דבר.
 */
export function contentFlags(): Set<string> {
  const out = new Set<string>()
  for (const chapter of [...CHAPTERS.map((def) => def.id), 'prologue']) {
    for (const flag of chapterFlags(chapter)) out.add(flag)
  }
  return out
}

/**
 * מתוך רשימת דגלים שנסרקה מהמקור — אלה שאף קובץ תוכן אינו מרים, כלומר אלה שהמנוע מרים.
 *
 * ההפרש הוא ההגדרה, והוא גם השמירה: דגל שקובץ תוכן מרים לעולם לא ייכנס לכאן, ולכן
 * `life:knows:hall` נשאר תנאי אמיתי ולא הופך בשקט למסופק.
 */
export function engineOnly(raisedInSource: Iterable<string>): Set<string> {
  const content = contentFlags()
  const out = new Set<string>()
  for (const flag of raisedInSource) if (!content.has(flag)) out.add(flag)
  return out
}

// ------------------------------------------------------- דגל יום שנקרא בפרק אחר ---

/**
 * **דגלי יום שקריאתם בפרק אחר היא ההחלטה** — כל אחד עם הסיבה. דלת שקיומה תלוי בדגל
 * שהפרק לא מרים היא דלת שלא קיימת השנה, וזה מותר כשזה נאמר; זה אסור כשזה קורה בשקט.
 */
export const STALE_BY_DESIGN: Readonly<Record<string, string>> = {
  'entry:granted': 'שער 7 פנימה נראה רק בפרקים שמשחק בפנים הוא חלק מהם (`whenByEra` של המנהרה); בשאר השנים המנהרה פשוט אינה דלת',
  'found:kobi': 'ב-a5-first הכניסה למנהרה סוגרת את הפרק (`a5-close`), ולכן הדרך החוצה מהיציע לא נדרשת; בכל פרק אחר שהמנהרה פתוחה בו — היא פתוחה (`whenByEra`)',
  'proof:business': '`HEARD_GATE` — דגל יום בכוונה, כדי שהשמועה לא תירה בפרק שבו המשימה לא נעשתה (`content/routes.ts`)',
  'proof:create': '`HEARD_GATE` — אותה סיבה',
  'knows:match': 'שלב A: לפני 1986 הילד לא הולך מזרחה בלי לדעת שיש משחק; הדלת נעולה ואומרת למה',
  'saw:road': 'שלב A בלבד: הקיצור לבלומפילד נפתח אחרי ההליכה הראשונה בדרך; משלב B הוא פתוח (`needsByEra: { B: null }`)',
  'r:reopen': 'בלומפילד בבנייה 2016–2018; הדלת נעולה ואומרת למה (כלל 82)',
}

export type StaleRead = { flag: string; where: string }

/**
 * `staleDayReads` — **תנאי שקורא דגל יום שהפרק הזה לא מרים** (21.9.2026).
 *
 * `p:tillKind` נכתב ב-P02 (`2016-crisis`) ונקרא ב-P05 (`2017-after`). בין שניהם רץ
 * `year.entered`, ו-`personFlags` מחק אותו — כלומר הענף שבו עמית שואל על הכסף שנלקח
 * **לא נפתח מעולם**, וההחזר שהתסריט בנה עליו את P05 היה תוכן מת. `deadend-audit` שאל
 * אם הדגל מורם במשחק (כן, בפרק הקודם); `life:worldlines` שאל אם אפשר לסיים את הפרק
 * (כן, בענף האחר). שניהם צדקו ושניהם לא ראו.
 *
 * השאלה כאן צרה ומכנית: לכל תנאי **חיובי** (`flag`, `flagIs`, בתוך `all`/`any` — לא
 * `none` ולא `notFlag`, שקריאה שלילית של דגל מת היא פשוט "תמיד נכון") של כל מה שהסגור
 * של הפרק פותח — ביטים, שיחות, ואנשים, נקודות חמות ודלתות בחדרים שלו — האם הדגל **שורד
 * חצות** (`crossesChapter`), או שהסגור **עצמו** מרים אותו? אם לא — והוא כן מורם במקום
 * אחר בתוכן, כלומר הוא לא דגל של המנוע — הוא נכתב בפרק אחר ונמחק בדרך.
 *
 * **הסגור, ולא `chapterFlags`.** הטיוטה הראשונה שאלה אם הפרק מרים את הדגל *איפשהו*,
 * ולא ראתה את P05: ה-`repay` של עמית כותב `p:tillKind = repaid` — בתוך הענף שנעול על
 * אותו דגל. הסגור (על `maximal`) מרים רק מה שאפשר להגיע אליו, ולכן ענף שננעל על עצמו
 * לא פותח את עצמו.
 *
 * שיחה משותפת לכמה פרקים (דמות שעומדת באותו חדר בכמה עשורים) יכולה לשאת ענף שנכון רק
 * לאחד מהם; זה מדווח גם כן, כי ענף שלא יכול להיפתח בפרק שבו השיחה רצה הוא בדיוק מה
 * שהמכשיר מחפש — והחריגים נקובים בשמם בבדיקה.
 */
export function staleDayReads(chapter: string, closure: Closure): StaleRead[] {
  const content = contentFlags()
  return chapterReads(chapter, closure).filter(
    ({ flag }) => !crossesChapter(flag) && !opaqueFlag(flag) && !closure.flags.has(flag) && content.has(flag),
  )
}

/**
 * כל קריאה **חיובית** של דגל בכל מה שהסגור של הפרק פותח — ביטים, שיחות (כל ענף וכל
 * בחירה, גם נעולים), ואנשים, נקודות חמות ודלתות בחדרים שלו. בלי כפילויות.
 */
export function chapterReads(chapter: string, closure: Closure): StaleRead[] {
  const out: StaleRead[] = []
  const seen = new Set<string>()
  const check = (condition: Condition | undefined, where: string): void => {
    for (const flag of conditionFlags(condition)) {
      const key = `${flag}@${where}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ flag, where })
    }
  }
  for (const room of closure.rooms) {
    const scene = roomIn(room, chapter)
    if (!scene) continue
    for (const actor of scene.actors) if (inEra(actor, chapter)) check(actor.when, `${scene.id}/${actor.id}`)
    for (const spot of scene.hotspots) if (inEra(spot, chapter)) check(spot.when, `${scene.id}/${spot.id}`)
    for (const exit of scene.exits) {
      if (!exitInEra(exit, chapter)) continue
      check(needsFor(exit, chapter), `${scene.id}→${exit.to}`)
      check(whenFor(exit, chapter), `${scene.id}→${exit.to}`)
    }
  }
  for (const beat of beatsOf(chapter)) check(beat.when, `beat:${beat.id ?? '?'}`)
  for (const id of closure.conversations) {
    const conversation = DIALOGUE[id]
    if (!conversation) continue
    conversation.branches.forEach((branch, index) => {
      check(branch.when, `${id}#${index}`)
      for (const choice of branch.choices ?? []) check(choice.when, `${id}/${choice.id}`)
    })
  }
  return out
}

/**
 * **דגלים שנכתבים בזמן ריצה בשם מחושב** — `gig:<id>` מ-`gigConversations`, `life:family:<…>`
 * מ-`derive` של 2000, `a6:end-<…>`, `spot:held|lost` בבמאי של 1991, `book:<id>` מאפקט
 * הספר, `life:seen:<…>` מאבני הדרך, `pitch:result` מההסדר של המגרש. הסורק של המקור
 * מחפש מחרוזות מילוליות ולא יכול לראות אותם; כל שורה כאן היא שם מחושב שנבדק ביד.
 *
 * ומ-21.9.2026 גם הפעילויות (`lib/life/activities.ts`): `act:<id>:tier|done|era` ו-`act:<id>:…`
 * נכתבים ב-`settleActivity` ובתיאום של `WorldScene.rollWorkOffers`, `favour:paid:<chapter>`
 * הוא משבצת הטובה של הפרק, ו-`chore:order` הוא התשובה על סדר העבודה באוסישקין
 * (`CHORE_ORDER_FLAG` ב-`gigs.ts`, נכתב ב-`flagValue` מתוך השיחה של הג׳וב).
 */
export const COMPUTED_FLAG = /^(gig:|life:family:|a6:end-|spot:|book:|life:seen:|pitch:result$|act:|favour:paid:|chore:order$|mission:|cb:|tifo:crew$|career:)/

/**
 * `neverRaised` — תנאי שמבקש דגל ש**שום דבר** במקור לא כותב: לא תוכן, לא מנוע, לא שם
 * מחושב. `d:stadium` היה כזה: הביט של הצעיף ב-2000 חיכה לו מאז שנכתב.
 */
export function neverRaised(chapter: string, closure: Closure, raisedAnywhere: ReadonlySet<string>): StaleRead[] {
  const content = contentFlags()
  return chapterReads(chapter, closure).filter(
    ({ flag }) =>
      !raisedAnywhere.has(flag) && !content.has(flag) && !opaqueFlag(flag) && !COMPUTED_FLAG.test(flag) && !closure.flags.has(flag),
  )
}

// ----------------------------------------------------------- חדר בלי דרך החוצה ---

/**
 * `trappedRooms` — חדר שהסגור נכנס אליו ושאין בו אף יציאה פתוחה (21.9.2026).
 *
 * הסגור מונוטוני: הוא שואל *לאן אפשר להגיע*, אף פעם לא *מאיפה אפשר לחזור*. לכן
 * `2010-anthem` עבר אותו נקי בזמן שמי שנכנס ליציע לבנפיקה (C06) לא יכול היה לצאת ממנו
 * לליון (C07) בבית — הדלת החוצה נשאה את `found:kobi` של 1986. הבדיקה כאן שמרנית בכיוון
 * הנכון: היא משתמשת בדגלים הסופיים של הסגור (הכי הרבה שאפשר), ולכן חדר שהיא מדווחת
 * עליו סגור גם בסוף היום.
 */
export function trappedRooms(chapter: string, closure: Closure, engineFlags: EngineFlags = NO_ENGINE_FLAGS): LocationId[] {
  const out: LocationId[] = []
  for (const room of closure.rooms) {
    const scene = roomIn(room, chapter)
    if (!scene) continue
    const open = scene.exits.some(
      (exit) =>
        exitInEra(exit, chapter) &&
        couldHold(whenFor(exit, chapter), closure.flags, engineFlags) &&
        couldHold(needsFor(exit, chapter), closure.flags, engineFlags),
    )
    if (!open) out.push(room)
  }
  return out
}

/** חדרים שהפרק נגמר בהם, ולכן אין צורך לצאת מהם — כל אחד עם הסיבה */
export const TRAP_BY_DESIGN: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'a5-first': { 'bloomfield-inside': 'הכניסה למנהרה מריצה את `a5-close`, שסוגר את הפרק — היציע הוא סוף היום' },
}

// ------------------------------------------------------------------ קווי חיים ---

export type Worldline = {
  id: string
  labelHe: string
  flags: Record<string, boolean>
}

/** the chain the registry declares, first chapter first — `next`, not array order */
function chapterChain(): ChapterDef[] {
  const out: ChapterDef[] = []
  const seen = new Set<string>()
  let cursor: string | null = CHAPTERS[0]?.id ?? null
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor)
    const def: ChapterDef | undefined = CHAPTER[cursor]
    if (!def) break
    out.push(def)
    cursor = def.next
  }
  // a chapter the chain never reaches is still declared, and still playable
  for (const def of CHAPTERS) if (!seen.has(def.id)) out.push(def)
  return out
}

/**
 * הפרקים שבאמת רצים על קו החיים הזה, לפי הסדר.
 *
 * `chapterOpen` הוא ההכרעה, כי הוא ההכרעה של המשחק (`nextPlayable` קורא לו). פרק
 * שה-`when` שלו לא מסופק על הקו הזה פשוט אינו חלק מהחיים האלה — ולכן גם לא מוריש דבר.
 */
export function chaptersOn(worldline: Worldline): readonly ChapterDef[] {
  return chapterChain().filter((def) => chapterOpen(def, worldline.flags))
}

/**
 * `carryableBefore` — איחוד `chapterFlags` על כל פרק שרץ **לפני** הפרק הזה על הקו הזה,
 * מסונן לקידומות ששורדות חצות.
 *
 * זה החסם העליון על "עם מה הגעתי לכאן". על `minimal` הוא ריק כמעט לגמרי; על `maximal`
 * הוא כולל את `life:knows:hall`, כי `a3-hall` רץ שם.
 */
export function carryableBefore(chapter: string, worldline: Worldline): Set<string> {
  const out = new Set<string>()
  for (const def of chaptersOn(worldline)) {
    if (def.id === chapter) break
    for (const flag of chapterFlags(def.id)) if (crossesChapter(flag)) out.add(flag)
  }
  return out
}

/**
 * הדגלים שהשחקן הזה באמת פותח איתו את הפרק: מה שקו החיים מצהיר עליו, חתוך במה שפרק
 * מוקדם באמת יכול היה להוריש.
 *
 * החיתוך הוא מה שהופך קו חיים מרשימת משאלות לטענה: קו שמכריז על דגל שרק 1998 מרים אינו
 * מזכה את 1991 בדבר.
 */
/**
 * דגל שפרק קודם מרים **בלי תנאי** — ומה שהמודל פספס עד 21.9.2026.
 *
 * `seedFor` חותך את קו החיים במה שפרק מוקדם יכול היה להוריש, וזה נכון. אבל הוא גם
 * הניח שכל דגל שפרק מוריש הוא **אופציונלי**, כלומר שהקו הריק לא מקבל אף אחד מהם —
 * וזה לא נכון לדגל שביט בלי `when` מרים בפרק שרץ תמיד. `2006-home` מתחיל בתוך אולם
 * אוסישקין, והביט הראשון שלו מרים `life:knows:hall` ברגע שנכנסים; אין חיים שבהם
 * הוא לא מורם, ובכל זאת `2007-registered` דווח כבלתי-אפשרי בתשעה קווים.
 *
 * ההבחנה היא בין "אפשר להרים" ל"בהכרח מורם", ושתי הדרישות נבדקות:
 * · הפרק שמרים אותו אינו מותנה (`when` ריק), ולכן הוא על **כל** קו חיים; ו
 * · הביט עצמו אינו מותנה, ולכן אין בתוכו הסתעפות.
 *
 * זו הידוק של המודל ולא ריכוך שלו: הוא מפסיק לדווח על חור שאינו קיים, והקו הריק
 * נשאר פסימי בכל מקום אחר — דגל שביט מותנה מרים עדיין לא נכנס לכאן (כלל 77).
 */
export function alwaysRaisedBefore(chapter: string, worldline: Worldline): Set<string> {
  const out = new Set<string>()
  for (const def of chaptersOn(worldline)) {
    if (def.id === chapter) break
    if (isWindow(def)) continue
    const own = chapterFlags(def.id)
    for (const beat of beatsOf(def.id)) {
      /**
       * `when` שמדבר רק על הדגלים של הפרק עצמו אינו הסתעפות — הוא **שומר-פעם-אחת**.
       *
       * הניסיון הראשון פסל כל ביט שיש לו `when`, וקיבל רשימה ריקה: כמעט כל ביט
       * במשחק נושא `none: [{ flag: '<own>' }]` כדי לא לירות פעמיים. ההבחנה הנכונה
       * היא מאיפה הדגל בא — דגל של הפרק עצמו הוא התקדמות בתוכו, ודגל מבחוץ הוא
       * התלות שבגללה השורה הזאת קיימת.
       */
      const gate = (beat as { when?: Condition }).when
      if (gate && [...conditionFlags(gate)].some((flag) => !own.has(flag))) continue
      const actions = (beat as { do?: unknown }).do
      for (const action of Array.isArray(actions) ? (actions as BeatAction[]) : []) {
        if (action.a === 'flag' && action.flag && crossesChapter(action.flag)) out.add(action.flag)
      }
    }
  }
  return out
}

export function seedFor(chapter: string, worldline: Worldline): Record<string, boolean> {
  const carryable = carryableBefore(chapter, worldline)
  const seed: Record<string, boolean> = {}
  for (const [flag, on] of Object.entries(worldline.flags)) {
    if (on && carryable.has(flag)) seed[flag] = true
  }
  // ...ומה שאין חיים בלעדיו, גם על הקו הריק
  for (const flag of alwaysRaisedBefore(chapter, worldline)) seed[flag] = true
  return seed
}

/**
 * דגלי הסתעפות — דגל שנושא חיים ושמישהו **קורא** אותו כדי להחליט על פרק או על דלת.
 *
 * אלה הצירים שעליהם שתי חיים נפרדות. כל דגל כזה מקבל שני קווי חיים: הוא לבדו, ו-הכול
 * חוץ ממנו. השני הוא זה שתופס "הפרק הזה עובד רק אם עשית את הדבר האופציונלי".
 */
export function branchFlags(): Set<string> {
  const out = new Set<string>()
  for (const def of CHAPTERS) for (const flag of windowFlagsOf(def)) out.add(flag)
  for (const base of ALL_SCENES) {
    for (const chapter of CHAPTERS) {
      for (const exit of sceneIn(base, chapter.id).exits) {
        if (!exitInEra(exit, chapter.id)) continue
        for (const flag of conditionFlags(whenFor(exit, chapter.id))) out.add(flag)
        for (const flag of conditionFlags(needsFor(exit, chapter.id))) out.add(flag)
      }
    }
  }
  for (const flag of [...out]) if (!crossesChapter(flag) || opaqueFlag(flag)) out.delete(flag)
  return out
}

// -------------------------------------------------------------------- הסגור ---

export type Closure = {
  rooms: Set<LocationId>
  flags: Set<string>
  /** how many times the fixpoint had to go round; 1 means nothing grew after the seed */
  steps: number
  /**
   * The flag set as it stood at the seed and after each step. `goals.ts` reads flags and
   * nothing else, so evaluating a chapter's `goal` once per entry here walks every branch
   * of it the closure can actually reach — without the audit knowing how it is written.
   */
  trace: ReadonlyArray<ReadonlySet<string>>
  /** every conversation the closure can open, directly or through a `goto` */
  conversations: Set<string>
  /** every ending id the closure can attain — from a conversation or from a beat */
  endings: Set<string>
}

/** a generous bound; the sets only grow, so hitting it means the model is not monotone */
const MAX_STEPS = 200

/**
 * `closureFor` — נקודת השבת של חדרים ודגלים, לפרק אחד, מ-seed אחד.
 *
 * הפרטים ששווה לדעת עליהם, כי בלעדיהם המכשיר מדווח על משחק עובד כשבור:
 *
 *  · **`travel` הוא דלת.** גם `{ e: 'travel' }` בשיחה וגם `{ a: 'travel' }` בביט מזיזים
 *    את השחקן לחדר בלי לעבור ביציאה. 1993 שולח ככה לאולם. חדר שהגיעו אליו רק כך אינו
 *    חור.
 *  · **ביטים אינם מסוננים לפי חדר.** ביט יורה על פי `when` ו-`at` שלו, והמכשיר אינו
 *    מכריע בשבילו; הוא מדווח בנפרד (`ROOM_ORPHANED`) על ביט שה-`at` שלו מחוץ לסגור,
 *    וזה הדיווח הנכון — לא דגל שנבלע בשקט.
 *  · **הזדמנות או מפגש נספרים כשהם עומדים בחדר שבסגור** (או שאין להם חדר בכלל).
 */
export function closureFor(
  chapter: string,
  seed: Record<string, boolean>,
  engineFlags: EngineFlags = NO_ENGINE_FLAGS,
): Closure {
  const def = CHAPTER[chapter]
  const era = eraFor(chapter)

  const rooms = new Set<LocationId>()
  if (def) rooms.add(def.start.location)

  const flags = new Set<string>()
  for (const [flag, on] of Object.entries(seed)) if (on) flags.add(flag)

  const conversations = new Set<string>()
  const endings = new Set<string>()
  const trace: Array<ReadonlySet<string>> = [new Set(flags)]

  // a beat can raise a flag, open a conversation and move the player, and it does so on
  // the chapter's own terms rather than on the room's — read once, outside the loop
  const beatRoots: string[] = []
  for (const action of beatActions(chapter)) {
    if (action.a === 'flag' && action.flag) flags.add(action.flag)
    if (action.a === 'talk' && action.conversation) beatRoots.push(action.conversation)
    if (action.a === 'travel' && action.to) rooms.add(action.to)
    if (action.a === 'ending' && action.id) endings.add(action.id)
    for (const event of beatEvents(action)) if (event.t === 'flag.raised' && event.flag) flags.add(event.flag)
  }

  let steps = 0
  for (;;) {
    steps += 1
    if (steps > MAX_STEPS) throw new Error(`worldline: closure for '${chapter}' did not settle — the model is not monotone`)
    const before = rooms.size + flags.size

    // --- rooms: every door that exists in this chapter and is not asking for a flag we
    //     do not have. `whenFor` decides whether it is DRAWN, `needsFor` whether it opens.
    for (const room of [...rooms]) {
      const scene = roomIn(room, chapter)
      if (!scene) continue
      for (const exit of scene.exits) {
        if (!exitInEra(exit, chapter)) continue
        if (!couldHold(whenFor(exit, chapter), flags, engineFlags)) continue
        if (!couldHold(needsFor(exit, chapter), flags, engineFlags)) continue
        rooms.add(exit.to)
      }
    }

    /**
     * --- מה שהחדר עצמו מלמד.
     *
     * הרדיוסר מרים `learnedOnArrival(to)` בכל `moved` — מי שהיה באוסישקין פעם אחת יודע
     * את הדרך לתמיד. זה קורה ב-`events.ts` ולא בשום קובץ תוכן, ולכן מכשיר שקורא רק
     * תוכן לא יראה אותו; בלי השורה הזאת הביקורת הייתה מכריזה על 1993 כשבור בגלל ידע
     * שהמשחק מחלק בעצמו שנתיים קודם. מודל שאינו מדמה את הרדיוסר מדווח על המודל שלו.
     */
    for (const room of rooms) {
      const learned = learnedOnArrival(room)
      if (learned) flags.add(learned)
    }

    // --- flags: everything content standing in those rooms can raise
    const roots = [...beatRoots]
    for (const room of rooms) {
      const scene = roomIn(room, chapter)
      if (!scene) continue
      for (const actor of scene.actors) {
        if (!inEra(actor, chapter) || !actor.talk) continue
        if (!couldHold(actor.when, flags, engineFlags)) continue
        roots.push(actor.talk)
      }
      for (const spot of scene.hotspots) {
        if (!inEra(spot, chapter) || !spot.act) continue
        if (!couldHold(spot.when, flags, engineFlags)) continue
        roots.push(spot.act)
      }
      const arrival = arrivalFor(scene, chapter)
      if (arrival?.flag) flags.add(arrival.flag)
    }

    for (const id of walkConversations(roots, flags, engineFlags)) {
      conversations.add(id)
      for (const { effect, gated } of effectsOf(id, flags, engineFlags)) {
        if (gated) continue
        addEffectFlag(flags, effect)
        if (effect.e === 'travel') rooms.add(effect.to)
        if (effect.e === 'ending') endings.add(effect.id)
      }
    }

    for (const opportunity of era.opportunities) {
      if (opportunity.location && !rooms.has(opportunity.location)) continue
      for (const outcome of opportunity.outcomes) for (const effect of outcome.effects) addEffectFlag(flags, effect)
    }
    for (const encounter of era.encounters) {
      if (encounter.locations.length > 0 && !encounter.locations.some((where) => rooms.has(where))) continue
      for (const effect of encounter.effects) addEffectFlag(flags, effect)
    }

    trace.push(new Set(flags))
    if (rooms.size + flags.size === before) break
  }

  return { rooms, flags, steps, trace, conversations, endings }
}
