import { describe, expect, it } from 'vitest'

import { CHAPTERS } from '@/lib/life/content/chapters'
import { LIFE_ROUTES, stageFlag } from '@/lib/life/routes'
import { eraFor } from '@/lib/life/content/era'
import { apply, emptyState } from '@/lib/life/events'
import type { LifeState, LocationId } from '@/lib/life/types'
import {
  CARRIED_PREFIXES,
  alwaysRaisedBefore,
  carryableBefore,
  chapterFlags,
  chaptersOn,
  closureFor,
  crossesChapter,
  seedFor,
  staleDayReads,
  STALE_BY_DESIGN,
  trappedRooms,
  TRAP_BY_DESIGN,
  neverRaised,
  type Worldline,
} from '@/lib/life/world/worldline'
import { TILL } from '@/lib/life/content/chapter2016collapse'

import { engineFlagsFromSource, raisedInSource } from '../scripts/life/engine-flags'

/**
 * המכשיר, לא הדוח.
 *
 * `scripts/life/worldline-audit.ts` הוא מה שקוראים; מה שנשבר הוא המודל שמתחתיו. אז כל
 * מה שנבדק כאן הוא `lib/life/world/worldline.ts` — שהסגור הוא נקודת שבת ולא לולאה,
 * שהוא מונוטוני, ושהוא עונה נכון על השאלה שמאור שאל ב-11.3.1991.
 *
 * הבדיקה על התוכן עצמו — "כל יעד שפרק מצביע עליו נמצא בסגור שלו" — נמצאת למטה, מדולגת
 * ועם נימוק, כי היום היא אדומה בצדק. ראה את ההערה שם.
 */

const IDENTITY = { name: 'פוגי', sex: 'boy', birthYear: 1978 } as const

const MINIMAL: Worldline = { id: 'minimal', labelHe: 'שום דבר אופציונלי', flags: {} }
const MAXIMAL: Worldline = {
  id: 'maximal',
  labelHe: 'הכול',
  flags: Object.fromEntries(
    CHAPTERS.filter((chapter) => chapter.playable !== false)
      .flatMap((chapter) => [...chapterFlags(chapter.id)])
      .filter(crossesChapter)
      .map((flag) => [flag, true]),
  ),
}

const PLAYABLE = CHAPTERS.filter((chapter) => chapter.playable !== false).map((chapter) => chapter.id)

describe('הסגור הוא נקודת שבת', () => {
  it('כל פרק מתייצב, ולא נגמר בתקרת הצעדים', () => {
    for (const chapter of PLAYABLE) {
      const closure = closureFor(chapter, {})
      expect(closure.steps).toBeGreaterThan(0)
      // the bound in the module is 200 and it throws when it is passed; a chapter that
      // needs more than a dozen rounds is a chapter whose geography grew a cycle
      expect(closure.steps).toBeLessThan(20)
      expect(closure.rooms.size).toBeGreaterThan(0)
    }
  })

  it('הריצה שנייה נותנת בדיוק את אותה תשובה — אין מצב פנימי שנשמר בין קריאות', () => {
    const once = closureFor('1991', {})
    const twice = closureFor('1991', {})
    expect([...twice.rooms].sort()).toEqual([...once.rooms].sort())
    expect([...twice.flags].sort()).toEqual([...once.flags].sort())
    expect(twice.steps).toBe(once.steps)
  })
})

describe('מונוטוניות — תוספת דגל לא מקטינה דבר', () => {
  /**
   * זו לא בדיקה יפה, היא הבדיקה שמחזיקה את הקובץ.
   *
   * העצירה של הלולאה נשענת על כך שהקבוצות רק גדלות, וזה נשען על כך ש-`couldHold`
   * מונוטוני בדגלים. ברגע שמישהו יוסיף שם בדיקה של `notFlag` או `none` — וזו התוספת
   * הכי טבעית בעולם — התכונה הזאת נשברת, הסגור יכול לנדנד, והבדיקה הזאת היא מה שיעצור
   * את זה לפני שמכשיר האבחון עצמו יהפוך למקור של באגים.
   */
  const seeds = ['life:knows:hall', 'life:a2:efi', 'knows:match', 'entry:granted', 'permission:yes']

  for (const chapter of PLAYABLE) {
    it(`${chapter}: כל דגל בודד ב-seed רק מרחיב`, () => {
      const base = closureFor(chapter, {})
      for (const flag of seeds) {
        const richer = closureFor(chapter, { [flag]: true })
        for (const room of base.rooms) expect(richer.rooms.has(room)).toBe(true)
        for (const raised of base.flags) expect(richer.flags.has(raised)).toBe(true)
      }
    })
  }

  it('ושני דגלים יחד מרחיבים לפחות כמו כל אחד לבדו', () => {
    const one = closureFor('1991', { 'life:knows:hall': true })
    const two = closureFor('1991', { 'life:knows:hall': true, 'permission:yes': true })
    for (const room of one.rooms) expect(two.rooms.has(room)).toBe(true)
    for (const flag of one.flags) expect(two.flags.has(flag)).toBe(true)
  })
})

describe('11.3.1991 — הדלת לאוסישקין', () => {
  /**
   * המקרה הידוע־כתקין, והוא נשאר נכון גם אחרי שהתוכן יתוקן.
   *
   * זו טענה על **הדלת**: כשהילד יודע את הדרך, האולם בהישג יד. איך הוא יֵדע — אפי ב-1984,
   * מישהו ב-1991, או `GUIDED_TRAVEL` — זו שאלה אחרת ופתוחה, ואף תיקון שלה לא יהפוך את
   * השורה הזאת לאדומה.
   */
  it('עם `life:knows:hall` — האולם בסגור', () => {
    const closure = closureFor('1991', { 'life:knows:hall': true })
    expect(closure.rooms.has('ussishkin-hall' as LocationId)).toBe(true)
    expect(closure.rooms.has('ussishkin-outside' as LocationId)).toBe(true)
  })

  /**
   * ...ובלי הדגל — כי אופיר לוקח אותו. **וזו השורה שהשתנתה, וכלל 65 הוא הסיבה.**
   *
   * הבדיקה כאן נכתבה "דגל אחד, אגף אחד": הפרש החדרים בין הסגור עם `life:knows:hall`
   * לבין הסגור בלעדיו הוא בדיוק שלושת חדרי אוסישקין. היא הייתה נכונה, והיא נפלה ברגע
   * שהתוכן תוקן — כי עכשיו האגף בהישג יד **גם בלי הדגל**, וההפרש הוא אפס.
   *
   * זה לא ריכוך של שומר; זאת הטענה הנכונה שהחליפה טענה שהפכה לא-נכונה. מה שחשוב היום
   * אינו "הדגל פותח את האגף" אלא **"אי אפשר להיתקע"**: הפרק שכל תוכנו ערב אחד באולם
   * מגיע לאולם מכל מצב פתיחה. ומי שפותח אותו הוא מי שזרק את הפתק בבוקר, ולכן הבדיקה
   * שמה גם אותו: להסיר את ההצעה של אופיר מחזיר את החור בדיוק כפי שמאור מצא אותו.
   */
  it('ובלי שום דגל — האולם עדיין בסגור, כי אופיר לוקח אותו', () => {
    const closure = closureFor('1991', {})
    expect(closure.rooms.has('ussishkin-hall' as LocationId)).toBe(true)
    expect(closure.rooms.has('ussishkin-outside' as LocationId)).toBe(true)
    expect(chapterFlags('1991').has('guided:ofir')).toBe(true)
  })

  it('והדגל כבר לא מזיז חדרים — האגף פתוח משני הכיוונים', () => {
    const without = closureFor('1991', {})
    const with_ = closureFor('1991', { 'life:knows:hall': true })
    const gained = [...with_.rooms].filter((room) => !without.rooms.has(room)).sort()
    expect(gained).toEqual([])
  })
})

describe('מה עובר גבול של פרק', () => {
  /**
   * (delta 92, upgrade plan §3 — rule 65/80, the guard turns rather than softens.) Until
   * 27.9.2026 the difference between the two lines was a whole CHAPTER: `a3-hall` was only
   * for a boy who had answered Efi in the A2 alley. Now A3 is where Efi is met, on every
   * line, and the hall's knowledge is a CHOICE inside it — with A4 as the second chance.
   * So both lines carry it into 1991, and the two chapters that can teach it are named.
   */
  it('`carryableBefore` נושא את ידיעת האולם על שני הקווים — הפגישה עם אפי היא בחירה בתוך A3, לא פרק מותנה', () => {
    expect(carryableBefore('1991', MINIMAL).has('life:knows:hall')).toBe(true)
    expect(carryableBefore('1991', MAXIMAL).has('life:knows:hall')).toBe(true)
  })

  it('`a3-hall` על כל קו, ומי שאמר "לא עכשיו" מקבל הזדמנות שנייה ב-`a4-shirt`', () => {
    const minimalChapters = chaptersOn(MINIMAL).map((chapter) => chapter.id)
    const maximalChapters = chaptersOn(MAXIMAL).map((chapter) => chapter.id)
    expect(minimalChapters).toContain('a3-hall')
    expect(maximalChapters).toContain('a3-hall')
    expect(chapterFlags('a3-hall').has('life:knows:hall')).toBe(true)
    expect(chapterFlags('a3-hall').has('life:efi:met')).toBe(true)
    expect(chapterFlags('a4-shirt').has('life:efi:met')).toBe(true)
    expect(chapterFlags('a4-shirt').has('life:knows:hall')).toBe(true)
  })

  it('`carryableBefore` נושא רק דגלים ששורדים חצות, ולעולם לא דגל של הפרק עצמו', () => {
    for (const flag of carryableBefore('2000-double', MAXIMAL)) expect(crossesChapter(flag)).toBe(true)
    // a chapter does not inherit from itself: `d:over` is 2000-double's own day flag
    expect(carryableBefore('2000-double', MAXIMAL).has('d:over')).toBe(false)
  })

  /**
   * ההעתק מול המקור — כלל 59 בקטן.
   *
   * `personFlags()` ב-`lib/life/events.ts` אינה מיוצאת, אז `CARRIED_PREFIXES` הוא העתק
   * שלה. העתק שאיש לא בודק אותו נסחף, ולכן הבדיקה כאן שואלת את **הרדיוסר עצמו**: היא
   * מרימה דגל אחד מכל קידומת (ועוד כמה שאמורים להימחק), מריצה `year.entered`, ומשווה
   * למה שהקובץ הזה טוען.
   */
  it('הקידומות שנושאות חיים הן בדיוק מה שהרדיוסר משאיר', () => {
    const probes = [
      ...CARRIED_PREFIXES.map((prefix) => `${prefix}probe`),
      'hw:done',
      'permission:yes',
      'saw:road',
      'beat:a3-open',
    ]
    let state: LifeState = emptyState(IDENTITY, 1990)
    for (const flag of probes) state = apply(state, { t: 'flag.raised', flag })
    const after = apply(state, { t: 'year.entered', year: 1991, weekday: 1, minute: 8 * 60 + 10 })

    for (const flag of probes) {
      expect(Boolean(after.flags[flag])).toBe(crossesChapter(flag))
    }
  })
})

describe('כל פרק פותח בחדר שהוא באמת חדר', () => {
  it('ולכל חדר פתיחה יש יציאה בשנה של הפרק', () => {
    for (const chapter of PLAYABLE) {
      const closure = closureFor(chapter, {})
      const start = CHAPTERS.find((entry) => entry.id === chapter)!.start.location
      expect(closure.rooms.has(start)).toBe(true)
      // one room and nothing else means the chapter opens into a sealed box
      expect(closure.rooms.size).toBeGreaterThan(1)
    }
  })
})

/**
 * ------------------------------------------------------------------------------------
 * הטענה שהמכשיר הזה נבנה בשבילה. היא הייתה אדומה כשנכתבה, והיא ירוקה מאותו יום.
 *
 * **למה היא נכתבה מדולגת ולא רוככה.** אפשר היה לכתוב כאן
 * `expect(closureFor('1991', {}).rooms.has('ussishkin-hall')).toBe(false)`, וזה היה
 * ירוק, וזה היה הופך את הבאג לחוזה: ביום שהתוכן יתוקן הבדיקה הייתה נכשלת ומישהו היה
 * מוחק אותה כדי להוריד אדום. זה בדיוק ההפך מכלל 65 — *"כשבדיקה נופלת אחרי שינוי נתונים,
 * השאלה הראשונה היא לא איך מרפים אותה אלא מה היא ידעה שהקוד לא"*. אז הטענה נכתבה כפי
 * שהיא אמורה להיות **אחרי** התיקון, עם `skip` וסיבה, ומי שתיקן את התוכן הוריד את ה-skip.
 *
 * **מה היה אדום (17.9.2026), ומה סגר את זה:**
 *  · `1991` — `goal1991` מחזיר `ussishkin-hall` כש-`permission:yes` או `sneak:ready`
 *    דלוקים, והדלת מאלנבי נשאה `when: { flag: 'life:knows:hall' }`. הדגל מורם רק
 *    ב-`a3-hall`, ול-`a3-hall` יש `when: ['life:a2:efi']` — כלומר חצי מהשחקנים.
 *    נסגר על ידי `{ area: 'ussishkin' }` על הדלת, `guided:ofir` בשתי השיחות של אופיר,
 *    ו-`learnedOnArrival` ברדיוסר.
 *  · `1993-cup` — אותה דלת, פרק אחד מאוחר יותר. נסגר כי "בא איתך" מרים עכשיו גם
 *    `guided:efi`, וכי מי שהיה באוסישקין ב-1991 יודע את הדרך ב-1993.
 * ------------------------------------------------------------------------------------
 */
describe('כל יעד שפרק מצביע עליו נמצא בתוך הסגור של אותו פרק', () => {
  const stateWith = (chapter: string, flags: Iterable<string>): LifeState => {
    const def = CHAPTERS.find((entry) => entry.id === chapter)!
    const base = emptyState(IDENTITY, def.year)
    const record: Record<string, boolean> = {}
    for (const flag of flags) record[flag] = true
    return { ...base, chapter, minute: def.minute, location: def.start.location, flags: record }
  }

  /**
   * הזרעים: מי שלא בחר כלום, ומי שבחר מסלול אחד ותו לא.
   *
   * *"אם לא בחרתי במסלול הזה אז המשימה הזו מדולגת ולא מפריעה לי להתקדמות."* (מאור,
   * 17.9.2026). הצורה הנבדקת של המשפט הזה היא שתי הקצוות: הריק — מי שלא במסלול חייב
   * לסיים כל פרק — ושבעת המסלולים לבדם, כי משימה ששייכת למסלול ונהייתה חומה מכשילה
   * דווקא את מי שכן בחר, רק מסלול אחר.
   */
  const SEEDS: Array<[string, Record<string, boolean>]> = [
    ['ריק', {}],
    ...LIFE_ROUTES.map((route): [string, Record<string, boolean>] => [route.id, { [stageFlag(route.id, 'entry')]: true }]),
  ]

  /**
   * ...ועל הקו הריק יש דבר אחד שהוא **לא** ריק: מה שפרק קודם מרים בלי תנאי.
   *
   * `alwaysRaisedBefore` נוסף ל-`worldline.ts` ב-21.9.2026, ובלעדיו הבדיקה הזאת טוענת
   * שפוגי הגיע ל-2007 בלי לדעת איפה אוסישקין — אחרי ש-`2006-home` פתח **בתוך האולם**.
   * זו אינה הרפיה של הקו הריק: הוא נשאר פסימי בכל מה שהוא באמת בחירה, והתוספת היא
   * בדיוק מה שאין חיים בלעדיו. (כלל 77 — שומר שווה משהו כל עוד הוא מודד את הדבר הנכון.)
   */
  const seedOn = (chapter: string, seed: Record<string, boolean>): Record<string, boolean> => {
    const out = { ...seed }
    const line = { id: 'test', labelHe: 'test', flags: seed } as unknown as Parameters<typeof alwaysRaisedBefore>[1]
    for (const flag of alwaysRaisedBefore(chapter, line)) out[flag] = true
    return out
  }

  it('שום פרק לא מצביע על חדר שאי אפשר להגיע אליו — בשום קו חיים', () => {
    const stranded: string[] = []
    for (const chapter of PLAYABLE) {
      const era = eraFor(chapter)
      if (!era.goal) continue
      for (const [label, rawSeed] of SEEDS) {
        const seed = seedOn(chapter, rawSeed)
        const closure = closureFor(chapter, seed)
        for (const flag of ['', ...closure.flags]) {
          const state = stateWith(chapter, [...Object.keys(seed), ...(flag ? [flag] : [])])
          const goal = era.goal(state)
          if (goal && !closure.rooms.has(goal)) stranded.push(`${chapter} [${label}] → ${goal} (${flag || 'seed'})`)
        }
      }
    }
    expect([...new Set(stranded)]).toEqual([])
  })
})

/**
 * **דגל יום שנקרא בפרק אחר, וחדר שאין ממנו יציאה** (21.9.2026) — שתי המחלקות שהסגור
 * המונוטוני לא ראה: הוא שואל לאן אפשר להגיע, ולא מה נמחק בדרך ומאיפה אפשר לחזור.
 *
 * הן מצאו ביום אחד: P05 מתה (`p:tillKind` נמחק לפני שעמית שאל עליו), הצעיף שמאור ביקש
 * עובר בשלושה רגעים עצר אחרי הראשון (`scarf:` לא הייתה קידומת נושאת), רחל של 1998 דיברה
 * את הערב של 1993 עם שמונה שקלים מהארנק, הקיצור לבלומפילד היה נעול לגבר בן ארבעים עם
 * *"אתה עוד לא יודע את הדרך"*, ומי שנכנס ליציע ב-2010 לא יכול היה לצאת.
 */
describe('מה שנמחק בחצות, ומה שאין ממנו דרך החוצה', () => {
  const ENGINE = engineFlagsFromSource()
  it('שום פרק לא קורא דגל יום שנכתב בפרק אחר — חוץ מאלה שנקובים בשמם', () => {
    const stale: string[] = []
    for (const chapter of PLAYABLE) {
      const closure = closureFor(chapter, seedFor(chapter, MAXIMAL), ENGINE)
      for (const read of staleDayReads(chapter, closure)) {
        if (!(read.flag in STALE_BY_DESIGN)) stale.push(`${chapter}: ${read.where} ← ${read.flag}`)
      }
    }
    expect(stale).toEqual([])
  })

  it('כל שורה ב-STALE_BY_DESIGN עדיין מסתירה משהו — שורה שהתיקון ייתר יורדת', () => {
    const seen = new Set<string>()
    for (const chapter of PLAYABLE) {
      for (const read of staleDayReads(chapter, closureFor(chapter, seedFor(chapter, MAXIMAL), ENGINE))) seen.add(read.flag)
    }
    for (const flag of Object.keys(STALE_BY_DESIGN)) expect(seen.has(flag), flag).toBe(true)
  })

  it('אין חדר שנכנסים אליו ואין ממנו אף דלת פתוחה', () => {
    const traps: string[] = []
    for (const chapter of PLAYABLE) {
      for (const line of [MINIMAL, MAXIMAL]) {
        for (const room of trappedRooms(chapter, closureFor(chapter, seedFor(chapter, line), ENGINE), ENGINE)) {
          if (!TRAP_BY_DESIGN[chapter]?.[room]) traps.push(`${chapter} [${line.id}]: ${room}`)
        }
      }
    }
    expect([...new Set(traps)]).toEqual([])
  })

  it('שום תנאי לא מחכה לדגל ששום דבר במשחק לא כותב', () => {
    const raised = raisedInSource()
    const dead: string[] = []
    for (const chapter of PLAYABLE) {
      for (const read of neverRaised(chapter, closureFor(chapter, seedFor(chapter, MAXIMAL), ENGINE), raised)) {
        dead.push(`${chapter}: ${read.where} ← ${read.flag}`)
      }
    }
    expect(dead).toEqual([])
  })

  it('P05 קוראת את מה ש-P02 כתב — והוא שורד את המעבר ל-2017', () => {
    expect(crossesChapter(TILL)).toBe(true)
  })

  it('הצעיף עובר עשור: `scarf:` נושא חיים', () => {
    expect(crossesChapter('scarf:given')).toBe(true)
    let state: LifeState = emptyState(IDENTITY, 1986)
    state = apply(state, { t: 'flag.raised', flag: 'scarf:given' })
    state = apply(state, { t: 'year.entered', year: 1998, weekday: 6, minute: 9 * 60 })
    expect(state.flags['scarf:given']).toBe(true)
  })
})
