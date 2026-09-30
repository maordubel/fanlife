/**
 * קווי חיים — האם אפשר לסיים את הפרק הזה, בחיים האלה.
 *
 *   npx tsx scripts/life/worldline-audit.ts
 *   VERBOSE=1 npx tsx scripts/life/worldline-audit.ts   → גם האזהרות
 *
 * מאור פתח את 11.3.1991, המשחק אמר לו ללכת לאולם אוסישקין, ולא הייתה דלת לאוסישקין
 * בשום מקום. שלוש הבדיקות הקיימות — `life:deadends`, `life:budget`, `life:flow` —
 * עוברות על המצב הזה, וכולן צודקות: הדגל `life:knows:hall` **כן** מורם במשחק, ולחדר
 * **כן** יש יציאה. הן שואלות שאלות סטטיות על המשחק כולו, והשאלה שנכשלה היא דינמית ועל
 * חיים אחד: `a3-hall` נושא `when: ['life:a2:efi']`, ילד שלא התיידד עם אפי באביב 1984
 * לא משחק אותו, אף פעם לא מקבל `life:knows:hall`, ומגיע ל-1991 כשהגיאוגרפיה של הפרק
 * עצמו מחוץ להישג ידו.
 *
 * אז הקובץ הזה עובר על **פרק × קו־חיים**. קו־חיים הוא היפותזה על אילו דגלים אופציונליים
 * דלוקים; `lib/life/world/worldline.ts` מחשב מזה נקודת־שבת של חדרים ודגלים, והחמש
 * הבדיקות למטה שואלות אותה את מה שאצבע של שחקן שואלת.
 *
 * ── הקווים, ולמה הם ליניאריים ולא אקספוננציאליים ─────────────────────────────────
 *
 *   `minimal`        — שום דגל אופציונלי. **זה הקו שמאור נמצא עליו.**
 *   `maximal`        — כל דגל נושא־חיים שפרק כלשהו יכול להרים.
 *   `only:<F>`       — F לבדו.
 *   `sans:<F>`       — הכול חוץ מ-F. **זה הטופס שתופס "הפרק עובד רק אם עשית את הדבר
 *                      האופציונלי"**, וזה בדיוק החור של 1991.
 *
 * F רץ על **דגלי הסתעפות** בלבד: דגל ששורד חצות ושמישהו קורא אותו כדי להחליט על פרק
 * (`ChapterDef.when`) או על דלת (`when`/`needs` על יציאה). זה 2 + 2×|F| קווים, ולא
 * 2^|F| — קומבינציה של שני דגלים אופציונליים היא חיים אמיתיים אבל היא לא מחלקת באגים
 * חדשה, ומכשיר שרץ דקה לא נדלק שוב.
 *
 * ── חמישה קודים, וכל ממצא נושא את שלו ────────────────────────────────────────────
 *
 * כי חור שאי אפשר לחפש אותו ב-grep הוא תלונה, לא רשימת עבודה.
 */
import { readFileSync, readdirSync } from 'node:fs'

import { CHAPTERS, CHAPTER } from '../../lib/life/content/chapters'
import { eraFor } from '../../lib/life/content/era'
import { emptyState } from '../../lib/life/events'
import type { LifeState, LocationId, PlayerIdentity } from '../../lib/life/types'
import { AREA_OF, TEACHES, canPlayerReach, routeFlag } from '../../lib/life/world/reach'
import { ALL_SCENES, exitInEra, needsFor, whenFor } from '../../lib/life/world/scenes'
import {
  areaFlags,
  beatRooms,
  couldHold,
  branchFlags,
  carryableBefore,
  chapterFlags,
  chaptersOn,
  closureFor,
  conditionAreas,
  conditionFlags,
  crossesChapter,
  engineOnly,
  staleDayReads,
  STALE_BY_DESIGN,
  trappedRooms,
  TRAP_BY_DESIGN,
  neverRaised,
  sceneFor,
  seedFor,
  type Closure,
  type Worldline,
} from '../../lib/life/world/worldline'

import { LIFE_ROUTES, stageFlag } from '../../lib/life/routes'

import { raisedInSource } from './engine-flags'

const ORDER = CHAPTERS.filter((chapter) => chapter.playable !== false).map((chapter) => chapter.id)

type Code = 'GOAL_UNREACHABLE' | 'NO_ENDING' | 'ROOM_ORPHANED' | 'FLAG_UNRAISABLE' | 'AREA_UNREACHABLE' | 'ENTRY_UNREACHABLE' | 'STALE_READ' | 'ROOM_TRAP' | 'NEVER_RAISED'
type Finding = {
  level: 'HOLE' | 'WARN'
  code: Code
  chapter: string
  worldline: string
  what: string
  /** משפט אחד שאומר מה יסגור את זה, כשהמכונה יודעת להציע */
  hintHe?: string
}

const findings: Finding[] = []
const seenFinding = new Set<string>()
const report = (finding: Finding): void => {
  const key = `${finding.level}|${finding.code}|${finding.chapter}|${finding.worldline}|${finding.what}`
  if (seenFinding.has(key)) return
  seenFinding.add(key)
  findings.push(finding)
}

// ------------------------------------------------------------------- דגלים מהמנוע ---
/**
 * דגלים שהמנוע מרים בעצמו, נאספים מהמקור — בדיוק כמו ב-`deadend-audit`, ומאותה סיבה.
 *
 * `FLAG_UNRAISABLE` שואל אם משהו יכול להרים את הדגל שדלת מבקשת. חצי מהתשובות אינן
 * בתוכן בכלל: `onboard:street` נכתב על ידי הלולאה, `album:seen` הוא קבוע ב-`stickers.ts`.
 * מכשיר שלא יודע את זה מדווח על דלת עובדת כמתה, וזה איך בודק מאבד את סמכותו.
 *
 * אותה סריקה עושה עבודה שנייה וחשובה יותר: מה שנסרק פה **פחות** מה שקבצי התוכן מרימים
 * הוא בדיוק מה שהמנוע מרים לבדו (`engineOnly`), והסגור מתייחס לזה כמסופק. בלי זה
 * 1986, 1990 ו-1991 מדווחים כפרקים בלי אף סיום, כי הסיום שלהם תלוי ב-`match:over`.
 */
const RAISED_IN_SOURCE = raisedInSource()
const ENGINE_FLAGS = engineOnly(RAISED_IN_SOURCE)

// ----------------------------------------------------------------------- הקווים ---

const CARRIED = (flags: Iterable<string>): Record<string, boolean> => {
  const out: Record<string, boolean> = {}
  for (const flag of flags) if (crossesChapter(flag)) out[flag] = true
  return out
}

/** every carried flag any playable chapter can raise — the ceiling of a life */
const EVERYTHING = CARRIED(ORDER.flatMap((chapter) => [...chapterFlags(chapter)]))

const BRANCH = [...branchFlags()].sort()

/**
 * תקרה על מספר הקווים.
 *
 * דגלי ההסתעפות הם שניים היום ולכן זה שישה קווים. אם מישהו יוסיף עשרים, הרשימה נחתכת
 * והחיתוך מודפס — מכשיר שרץ שלוש דקות הוא מכשיר שמכבים.
 */
const MAX_WORLDLINES = 40
const BRANCH_BUDGET = Math.floor((MAX_WORLDLINES - 2 - LIFE_ROUTES.length) / 2)
const BRANCH_USED = BRANCH.slice(0, BRANCH_BUDGET)
const BRANCH_CUT = BRANCH.length - BRANCH_USED.length

/**
 * ושבעת המסלולים, כל אחד לבדו — הכלל של מאור, נאכף על כל תשעה־עשר הפרקים.
 *
 * *"אם לא בחרתי במסלול הזה אז המשימה הזו מדולגת ולא מפריעה לי להתקדמות."* (17.9.2026)
 *
 * `route`/`notRoute` קיימים כפרדיקטים מאז 16.9.2026, כלומר **אפשר** לכתוב משימה ששייכת
 * למסלול. מה שלא היה קיים הוא מי שיבדוק שמשימה כזאת לא הפכה לחומה: פרק שתולה התקדמות
 * במסלול הופך את כל מי שבחר אחרת לתקוע, וזה בדיוק הצורה של 11.3.1991 — רק עם מסלול
 * במקום ידיעת־דרך.
 *
 * קו לכל מסלול, בדרגה הראשונה, **בנוסף** ל-`minimal` שהוא מי שלא בחר באף אחד. `minimal`
 * הוא הצד השני של אותו כלל ולכן הוא הקו הראשון ברשימה: מי שלא במסלול חייב לסיים כל פרק.
 */
/**
 * **עד השיא, ולא רק הדרגה הראשונה** (21.9.2026). חלונות CAREER ו-OWNER נפתחים ב-`practice`
 * וב-`apex` (`2024-terrace`, `2025-interview`, `2025-owner`), וקו שמחזיק רק `entry` לא פתח
 * אותם אף פעם — גם `maximal` לא, כי דגלי המסלול נכתבים במנוע ולא בתוכן, ולכן אינם
 * ב-`EVERYTHING`. שישה פרקים עברו את המכשיר הזה בלי שאף קו נכנס אליהם.
 */
const ROUTE_STAGE_FLAGS = (id: (typeof LIFE_ROUTES)[number]['id']): Record<string, true> =>
  Object.fromEntries((['entry', 'practice', 'apex'] as const).map((stage) => [stageFlag(id, stage), true]))

const ROUTE_LINES: Worldline[] = LIFE_ROUTES.map((route) => ({
  id: `route:${route.id}`,
  labelHe: `במסלול ${route.id}, עד השיא`,
  flags: ROUTE_STAGE_FLAGS(route.id),
}))
const EVERY_ROUTE_STAGE: Record<string, true> = Object.assign({}, ...LIFE_ROUTES.map((route) => ROUTE_STAGE_FLAGS(route.id)))

const WORLDLINES: Worldline[] = [
  { id: 'minimal', labelHe: 'שום דבר אופציונלי', flags: {} },
  { id: 'maximal', labelHe: 'הכול', flags: { ...EVERYTHING, ...EVERY_ROUTE_STAGE } },
  ...ROUTE_LINES,
  ...BRANCH_USED.flatMap((flag): Worldline[] => {
    const without = { ...EVERYTHING }
    delete without[flag]
    return [
      { id: `only:${flag}`, labelHe: `רק ${flag}`, flags: { [flag]: true } },
      { id: `sans:${flag}`, labelHe: `הכול חוץ מ-${flag}`, flags: without },
    ]
  }),
]

// ------------------------------------------------------------------------ מצבים ---

const IDENTITY: PlayerIdentity = { name: 'פוגי', sex: 'boy', birthYear: 1978 }

const stateWith = (chapter: string, flags: Iterable<string>): LifeState => {
  const def = CHAPTER[chapter]
  const base = emptyState(IDENTITY, def?.year ?? 1986)
  const record: Record<string, boolean> = {}
  for (const flag of flags) record[flag] = true
  return {
    ...base,
    chapter,
    minute: def?.minute ?? base.minute,
    location: (def?.start.location ?? base.location) as LocationId,
    flags: record,
  }
}

// ------------------------------------------------------------------- הרמזים ---

/**
 * רמז התאוששות — למה `canPlayerReach` קיים ואף אחד לא קרא לו.
 *
 * הפסק שלו כבר נושא סיבה, דרך התאוששות ומה בדיוק חוסם. `AREA_NOT_KNOWN` פירושו שהדרך
 * פתוחה והילד פשוט לא יודע אותה, ו-`TEACHES` כבר אומר מי יכול ללמד אותה. שתי השורות
 * האלה הופכות את הדוח מתלונה לרשימת עבודה, וזה כל ההבדל.
 */
const recoveryHint = (chapter: string, from: LocationId, to: LocationId, state: LifeState): string => {
  const verdict = canPlayerReach(state, chapter, from, to)
  const head = `${verdict.reason} · recovery=${verdict.recovery}`
  if (verdict.reason === 'AREA_NOT_KNOWN') {
    const area = verdict.blockingRequirement ?? AREA_OF[to] ?? '?'
    const teacher = Object.entries(TEACHES).find(([, taught]) => taught === area)?.[0]
    const who = teacher ? `«${teacher}» (TEACHES) יכול לקחת אותו` : 'אף אחד ב-TEACHES לא מלמד את האזור הזה'
    return `${head} — האזור «${area}» לא ידוע; הדגל הוא ${routeFlag(area)}; ${who}`
  }
  if (verdict.reason === 'DOOR_LOCKED') {
    return `${head} — הדלת «${verdict.blockingRequirement}» סגורה: ${verdict.whyHe ?? '—'}`
  }
  if (verdict.reason === 'NO_ROUTE') return `${head} — אין בכלל שרשרת דלתות לשם בפרק הזה`
  return head
}

// ------------------------------------------------------------------- הבדיקות ---

/**
 * 1 — הפרק מצביע על חדר שאי אפשר להגיע אליו.
 *
 * `goal` היא שרשרת `if` על דגלים, והיא **מקצרת**: `goal1991` פותחת ב-
 * `if (walked:home) return null`. לכן אי אפשר להעריך אותה רק על אוסף הדגלים המלא של
 * הסגור — האוסף הוא איחוד, הוא מכיל דגלים שסותרים זה את זה בחיים אחד, והשורה הראשונה
 * בולעת את כל השאר. **זה הפגם השני של הטיוטה הזאת**, והוא הסתיר בדיוק את החור של 1991
 * אחרי שהוא כבר נמצא פעם אחת.
 *
 * אז שני סוגי מצבים, ושניהם צריכים להיות כאן:
 *   · צילום אחרי כל צעד של נקודת השבת — ככה נראית התקדמות אמיתית;
 *   · ה-seed ועוד **דגל בודד**, לכל דגל בסגור — ככה עוברים על כל ענף של הפונקציה בלי
 *     לדעת איך היא כתובה. זו בדיוק השיטה של `tests/life-goals.test.ts`, ובכוונה: שתי
 *     בדיקות שמסתכלות על אותה פונקציה צריכות להסתכל עליה באותה דרך.
 *
 * הדגל שהוליד את הממצא מודפס איתו, כי ממצא שאפשר לשפוט אותו שווה יותר מממצא שסומכים
 * עליו: אם F לעולם אינו עומד לבדו בחיים אמיתיים, זה נראה בשורה.
 */
const checkGoal = (chapter: string, worldline: Worldline, closure: Closure, seed: Record<string, boolean>): void => {
  const era = eraFor(chapter)
  const def = CHAPTER[chapter]
  if (!era.goal || !def) return
  const from = def.start.location
  const carried = Object.keys(seed)

  const probes: Array<{ viaHe: string; flags: string[] }> = closure.trace.map((snapshot, step) => ({
    viaHe: `אחרי צעד ${step}`,
    flags: [...snapshot],
  }))
  for (const flag of closure.flags) probes.push({ viaHe: `עם «${flag}» בלבד`, flags: [...carried, flag] })

  for (const probe of probes) {
    const state = stateWith(chapter, probe.flags)
    let goal: LocationId | null = null
    try {
      goal = era.goal(state)
    } catch {
      // a goal that needs more of a life than a flag set is not this audit's business
      continue
    }
    if (!goal || closure.rooms.has(goal)) continue
    report({
      level: 'HOLE',
      code: 'GOAL_UNREACHABLE',
      chapter,
      worldline: worldline.id,
      what: `הפרק מצביע על «${goal}» (${probe.viaHe}), והוא לא בסגור של הקו הזה (מתחילים ב-«${from}»)`,
      hintHe: recoveryHint(chapter, from, goal, state),
    })
  }
}

/** 2 — לפרק אין אף סיום שאפשר להגיע אליו */
const checkEnding = (chapter: string, worldline: Worldline, closure: Closure): void => {
  const declared = Object.keys(eraFor(chapter).endings)
  if (declared.length === 0) return
  const attainable = declared.filter((id) => closure.endings.has(id))
  if (attainable.length > 0) return
  report({
    level: 'HOLE',
    code: 'NO_ENDING',
    chapter,
    worldline: worldline.id,
    what: `${declared.length} סיומים מוכרזים (${declared.join(', ')}) ואף אחד מהם לא מושג בקו הזה`,
    hintHe: 'הסיומים של הפרק נתלים בשיחות או בביטים שהסגור לא מגיע אליהם — תסתכל קודם על החדרים שחסרים',
  })
}

/** 3 — חדר שהתוכן של הפרק מדבר עליו ושאי אפשר לעמוד בו */
const checkOrphans = (chapter: string, worldline: Worldline, closure: Closure): void => {
  const era = eraFor(chapter)
  const orphan = (where: LocationId, level: Finding['level'], source: string, hintHe?: string): void => {
    if (closure.rooms.has(where)) return
    report({ level, code: 'ROOM_ORPHANED', chapter, worldline: worldline.id, what: `«${where}» — ${source}`, hintHe })
  }
  /**
   * יעד של `goal` נבדק ב-`GOAL_UNREACHABLE` ולא כאן, בכוונה. אותו פגם בשני קודים הוא
   * רעש: הקוד הראשון נושא גם את הפסק של `canPlayerReach` ואת הרמז, וזה הדיווח השימושי.
   */
  for (const beat of beatRooms(chapter)) {
    if (beat.rooms.some((where) => closure.rooms.has(where))) continue
    // (27.9.2026) a beat this worldline could never arm is not an orphan here — it belongs to
    // another life (the away evenings of 2010 fire only for whoever chose that city); the
    // same monotone test the doors, actors and spots of the closure already pass through
    if (!couldHold(beat.when, closure.flags, ENGINE_FLAGS)) continue
    report({
      level: 'HOLE',
      code: 'ROOM_ORPHANED',
      chapter,
      worldline: worldline.id,
      what: `«${beat.rooms.join(', ')}» — הביט «${beat.id}» יורה רק שם`,
      hintHe: 'ביט בחדר שאי אפשר להגיע אליו לא ירוץ לעולם — או שהחדר חסום או שה-`at` שגוי',
    })
  }
  /**
   * שורת לוח־זמנים היא אזהרה ולא חור, וזה הבדל אמיתי: דמות שעומדת איפה שהשחקן לא הולך
   * היא רקע, וכל רחוב במשחק מלא בהן. חור זה כשהפרק **צריך** את המקום.
   */
  for (const row of era.schedule) orphan(row.location, 'WARN', `${row.characterId} עומד שם לפי לוח הזמנים`)
  for (const opportunity of era.opportunities) {
    if (opportunity.location) orphan(opportunity.location, 'WARN', `חלון ההזדמנות «${opportunity.id}» נפתח שם`)
  }
  for (const encounter of era.encounters) {
    if (encounter.locations.every((where) => !closure.rooms.has(where))) {
      report({
        level: 'WARN',
        code: 'ROOM_ORPHANED',
        chapter,
        worldline: worldline.id,
        what: `«${encounter.locations.join(', ')}» — המפגש «${encounter.id}» יכול לקרות רק שם`,
      })
    }
  }
}

/** 4 — דלת בחדר שבסגור שמבקשת דגל שאיש לא יכול להרים בקו הזה */
const checkFlags = (chapter: string, worldline: Worldline, closure: Closure): void => {
  const raisable = new Set<string>([
    ...closure.flags,
    ...chapterFlags(chapter),
    ...carryableBefore(chapter, worldline),
    ...RAISED_IN_SOURCE,
  ])
  for (const room of closure.rooms) {
    const scene = sceneFor(room)
    if (!scene) continue
    for (const exit of scene.exits) {
      if (!exitInEra(exit, chapter)) continue
      const wanted = new Set<string>([
        ...conditionFlags(whenFor(exit, chapter)),
        ...conditionFlags(needsFor(exit, chapter)),
      ])
      /**
       * אזור הוא **או**, ולכן נשאל בנפרד.
       *
       * `{ area: 'ussishkin' }` מרוצה מהדגל הקנוני של האזור **או** מדגל `guided:` של כל
       * מי ש-`TEACHES` אומר שיכול לקחת לשם. אם אף אחד מהם לא ניתן להרמה על הקו הזה — אין
       * דרך לאזור, וזה בדיוק החור שמאור פתח.
       */
      for (const area of new Set([...conditionAreas(whenFor(exit, chapter)), ...conditionAreas(needsFor(exit, chapter))])) {
        const ways = areaFlags(area)
        if (ways.some((flag) => raisable.has(flag))) continue
        report({
          level: 'HOLE',
          code: 'AREA_UNREACHABLE',
          chapter,
          worldline: worldline.id,
          what: `«${room}» → דלת «${exit.id}» מובילה לאזור «${area}», ואין בקו הזה לא ידיעת־דרך ולא מי שייקח`,
          hintHe: `מה שהיה סוגר: ${ways.join(' / ')} — ${Object.entries(TEACHES)
            .filter(([, taught]) => taught === area)
            .map(([who]) => who)
            .join(', ') || 'איש אינו רשום כמלמד את האזור'}`,
        })
      }
      for (const flag of wanted) {
        if (raisable.has(flag)) continue
        report({
          level: 'HOLE',
          code: 'FLAG_UNRAISABLE',
          chapter,
          worldline: worldline.id,
          what: `«${room}» → דלת «${exit.id}» מבקשת «${flag}», ושום דבר בקו הזה לא מרים אותו`,
          hintHe: crossesChapter(flag)
            ? 'דגל נושא־חיים: מי שמרים אותו הוא פרק מוקדם שלא רץ על הקו הזה'
            : 'דגל של יום: מי שאמור להרים אותו נמצא בפרק אחר, וחצות מוחק אותו',
        })
      }
    }
  }
}

/** 5 — הפרק מתחיל בחדר שאינו חדר, או בחדר בלי דלת בשנה הזאת */
const checkEntry = (chapter: string, worldline: Worldline): void => {
  const def = CHAPTER[chapter]
  if (!def) return
  const where = def.start.location
  const scene = sceneFor(where)
  if (!scene) {
    report({
      level: 'HOLE',
      code: 'ENTRY_UNREACHABLE',
      chapter,
      worldline: worldline.id,
      what: `הפרק נפתח ב-«${where}», ואין חדר בשם הזה`,
    })
    return
  }
  const exits = scene.exits.filter((exit) => exitInEra(exit, chapter))
  if (exits.length === 0) {
    report({
      level: 'HOLE',
      code: 'ENTRY_UNREACHABLE',
      chapter,
      worldline: worldline.id,
      what: `הפרק נפתח ב-«${where}», ולחדר הזה אין אף יציאה שקיימת בפרק הזה`,
    })
  }
}

/**
 * **דגל יום שנקרא אחרי שנמחק** (21.9.2026) — `staleDayReads`, על הקו המקסימלי בלבד:
 * זה הקו שבו כל מה שיכול לעבור חצות עבר, ולכן מה שחסר בו חסר בכל חיים. `STALE_BY_DESIGN`
 * נוקב בשמם בדגלים שהקריאה שלהם בפרק אחר היא ההחלטה ("הדלת הזאת לא קיימת השנה").
 */
function checkStale(chapter: string, worldline: Worldline, closure: Closure): void {
  for (const stale of staleDayReads(chapter, closure)) {
    if (stale.flag in STALE_BY_DESIGN) continue
    report({
      level: 'HOLE',
      code: 'STALE_READ',
      chapter,
      worldline: worldline.id,
      what: `«${stale.where}» קורא את \`${stale.flag}\` — דגל יום שהפרק הזה לא מרים, ושנמחק במעבר הפרק`,
      hintHe: 'לכתוב אותו בקידומת שחוצה פרק (`life:`/`own:`/`owe:`/`promise:`), או לקרוא משהו שהפרק הזה כן יודע',
    })
  }
}

/** תנאי על דגל ששום דבר במקור לא כותב — `neverRaised` */
function checkNeverRaised(chapter: string, worldline: Worldline, closure: Closure): void {
  for (const read of neverRaised(chapter, closure, RAISED_IN_SOURCE)) {
    report({
      level: 'HOLE',
      code: 'NEVER_RAISED',
      chapter,
      worldline: worldline.id,
      what: `«${read.where}» קורא את \`${read.flag}\` — ושום דבר במשחק לא כותב אותו`,
    })
  }
}

/** חדר שנכנסים אליו ואין ממנו אף דלת פתוחה — `trappedRooms` */
function checkTraps(chapter: string, worldline: Worldline, closure: Closure): void {
  for (const room of trappedRooms(chapter, closure, ENGINE_FLAGS)) {
    if (TRAP_BY_DESIGN[chapter]?.[room]) continue
    report({
      level: 'HOLE',
      code: 'ROOM_TRAP',
      chapter,
      worldline: worldline.id,
      what: `«${room}» — אפשר להיכנס, ואין אף יציאה פתוחה גם בסוף היום`,
      hintHe: 'דלת יציאה שנושאת תנאי של שנה אחרת — `whenByEra`/`needsByEra` לפרק הזה',
    })
  }
}

// -------------------------------------------------------------------- הסריקה ---

type Cell = { holes: number; warns: number }
const grid = new Map<string, Cell>()
const cellKey = (chapter: string, worldline: string) => `${chapter}|${worldline}`

for (const chapter of ORDER) {
  for (const worldline of WORLDLINES) {
    const before = findings.length
    const seed = seedFor(chapter, worldline)
    const closure = closureFor(chapter, seed, ENGINE_FLAGS)
    checkEntry(chapter, worldline)
    checkGoal(chapter, worldline, closure, seed)
    checkEnding(chapter, worldline, closure)
    checkOrphans(chapter, worldline, closure)
    checkFlags(chapter, worldline, closure)
    if (worldline.id === 'maximal') checkStale(chapter, worldline, closure)
    if (worldline.id === 'maximal') checkNeverRaised(chapter, worldline, closure)
    checkTraps(chapter, worldline, closure)
    const fresh = findings.slice(before)
    grid.set(cellKey(chapter, worldline.id), {
      holes: fresh.filter((f) => f.level === 'HOLE').length,
      warns: fresh.filter((f) => f.level === 'WARN').length,
    })
  }
}

// --------------------------------------------------------------------- הדוח ---

const holes = findings.filter((f) => f.level === 'HOLE')
const warns = findings.filter((f) => f.level === 'WARN')

const byChapter = new Map<string, Finding[]>()
for (const finding of holes) byChapter.set(finding.chapter, [...(byChapter.get(finding.chapter) ?? []), finding])

console.log(`\n=== חורים (${holes.length}) ===`)
for (const chapter of ORDER) {
  const list = byChapter.get(chapter)
  if (!list) continue
  console.log(`\n--- ${chapter} ---`)
  for (const finding of list) {
    console.log(`  [${finding.code}] ${finding.worldline}`)
    console.log(`      ${finding.what}`)
    if (finding.hintHe) console.log(`      ↳ ${finding.hintHe}`)
  }
}

if (process.env.VERBOSE) {
  console.log(`\n=== אזהרות (${warns.length}) ===`)
  for (const finding of warns) {
    console.log(`  [${finding.code}] ${finding.chapter} · ${finding.worldline}: ${finding.what}`)
  }
} else {
  console.log(`\n(${warns.length} warnings — VERBOSE=1 to list)`)
}

// --------------------------------------------------------------- טבלת הסיכום ---
/**
 * הטבלה היא מה שקוראים ראשון, ולכן היא ממוספרת ולא מקוננת בשמות: מזהה של קו־חיים הוא
 * `sans:life:knows:hall`, ועמודה ברוחב הזה הופכת טבלה של תשע־עשרה שורות לקיר.
 */
console.log('\n=== סיכום — פרק × קו חיים ===')
WORLDLINES.forEach((worldline, index) => {
  /**
   * כמה פרקים בכלל רצים על הקו — וזה לא קישוט.
   *
   * `only:life:knows:hall` נראה בטבלה כמו `minimal`, וזאת התשובה הנכונה: `a3-hall` נושא
   * `when: ['life:a2:efi']`, אז חיים שמכריזים על ידיעת האולם בלי החברות שקדמה לה אינם
   * חיים שהמרשם מתיר, ו-`seedFor` חותך את הדגל. המספר הזה הוא מה שאומר את זה בשורה
   * אחת, במקום לתת לקורא לחשוב שהמכשיר התעלם מהקו.
   */
  const runs = chaptersOn(worldline).filter((def) => def.playable).length
  console.log(`  ${String(index + 1).padStart(2)}. ${worldline.id.padEnd(30)} ${String(runs).padStart(2)}/${ORDER.length} פרקים · ${worldline.labelHe}`)
})
if (BRANCH_CUT > 0) {
  console.log(`  (נחתכו ${BRANCH_CUT} דגלי הסתעפות — התקרה היא ${MAX_WORLDLINES} קווים)`)
}

const width = Math.max(...ORDER.map((chapter) => chapter.length), 'chapter'.length)
console.log(`\n  ${'chapter'.padEnd(width)}  ${WORLDLINES.map((_, index) => String(index + 1).padStart(3)).join('')}`)
for (const chapter of ORDER) {
  const cells = WORLDLINES.map((worldline) => {
    const cell = grid.get(cellKey(chapter, worldline.id))
    return (cell && cell.holes > 0 ? String(cell.holes) : '·').padStart(3)
  })
  console.log(`  ${chapter.padEnd(width)}  ${cells.join('')}`)
}

console.log(
  holes.length
    ? `\nFAIL — ${holes.length} holes across ${ORDER.length} chapters × ${WORLDLINES.length} worldlines`
    : `\nPASS — every chapter can be finished on every worldline tested (${WORLDLINES.length})`,
)
process.exit(holes.length ? 1 : 0)
