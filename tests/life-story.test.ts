import { describe, expect, it } from 'vitest'

import {
  ALL_INTENTS,
  EFI_USSISHKIN,
  GuidedWalk,
  KOBI_HOME,
  ROUTES,
  currentIntent,
  direct,
  guidanceLevel,
  guidedInChapter,
  intentsFor,
  justCompleted,
  nowLine,
  routeFor,
  withLeadHe,
} from '@/lib/life/story'
import { ACHIEVEMENTS } from '@/lib/life/achievements'
import { emptyState } from '@/lib/life/events'
import { ALL_SCENES, exitInEra } from '@/lib/life/world/scenes'
import { routeFlag } from '@/lib/life/world/reach'
import type { LifeState } from '@/lib/life/types'

/**
 * *"אני יודע מה לעשות רק כי אני כבר מכיר את התסריט."*
 *
 * זאת האבחנה שהמערכת הזאת נבנתה בשבילה, וזה מה שהבדיקות כאן שומרות עליו: שאפשר יהיה לדעת
 * מה קורה עכשיו בלי לקרוא את התסריט, שמי שאומר "בוא איתי" באמת ילך איתך, ושכל ביט ראשי
 * מייצר את הבא אחריו במקום להיגמר בשקט.
 */

const IDENTITY = { name: 'פוגי', sex: 'boy', birthYear: 1978 } as const
const life = (flags: Record<string, unknown> = {}, chapter = 'a3-hall'): LifeState => {
  const base = emptyState(IDENTITY, 1986)
  return { ...base, chapter, flags: { ...base.flags, ...flags } as LifeState['flags'] }
}
const input = (over: Partial<Parameters<typeof direct>[0]> = {}) => ({
  state: life(),
  chapter: 'a3-hall',
  quietFor: 0,
  busy: false,
  ...over,
})

describe('כל ביט ראשי מייצר את הבא אחריו', () => {
  it('gives every main intent a hook — a beat that ends in silence is a beat that failed', () => {
    for (const intent of ALL_INTENTS) {
      if (intent.priority !== 'main') continue
      expect(intent.hook, `${intent.id} ends and nothing happens next`).toBeTruthy()
    }
  })

  it('completes on something the world proves, never on a hotspot', () => {
    for (const intent of ALL_INTENTS) {
      const text = JSON.stringify(intent.completion)
      expect(text.includes('saw:'), `${intent.id} completes on a flavour hotspot`).toBe(false)
    }
  })

  it('lets the first visit to Ussishkin be satisfied more than one way', () => {
    const look = intentsFor('a3-hall').find((i) => i.id === 'a3:look-around')
    // the milestone itself is the OR of the parquet, the stand, and Efi showing him
    expect(JSON.stringify(look?.completion)).toContain('life:seen:ussishkin')
  })
})

describe('מי מוביל, ומתי השליטה חוזרת', () => {
  it('asks the player to go with Efi while nobody is leading yet', () => {
    const story = direct(input())
    expect(story.intent?.id).toBe('a3:go-with-efi')
    expect(story.control).toBe('GUIDED_FOLLOW')
    expect(story.nowHe).toBe(withLeadHe('אפי'))
  })

  it('shows a status and not an objective once the walk is running', () => {
    const story = direct(input({ guidedId: 'efi-to-ussishkin' }))
    expect(story.control).toBe('GUIDED_FOLLOW')
    expect(story.leadHe).toBe('אפי')
    // "OBJECTIVE: FOLLOW EFI" is a line the player can do nothing with
    expect(story.nowHe).toBe('עם אפי · בדרך')
  })

  it('hands control back inside the hall, and asks for an experience rather than a click', () => {
    const story = direct(input({ state: life({ 'a3:inside': true }) }))
    expect(story.intent?.id).toBe('a3:look-around')
    expect(story.control).toBe('FREE')
    expect(story.nowHe).toBe('תסתכל מסביב.')
  })

  it('says nothing at all once the evening is done', () => {
    const story = direct(input({ state: life({ 'a3:inside': true, 'a3:done': true, 'life:seen:ussishkin': true }) }))
    expect(story.intent).toBeNull()
    expect(story.nowHe).toBeNull()
  })

  it('never lets the father be walked out on', () => {
    expect(KOBI_HOME.interrupt).toBe('locked')
    expect(EFI_USSISHKIN.interrupt).toBe('free')
  })
})

describe('הדרכה מסלימה, ולא מתחילה בחץ', () => {
  it('starts at the world telling the player, and nothing else', () => {
    expect(direct(input()).guidance).toBe(0)
  })

  it('climbs only with minutes in which nothing moved', () => {
    const intent = intentsFor('a3-hall')[0]!
    expect(guidanceLevel(intent, 0)).toBe(0)
    expect(guidanceLevel(intent, 8)).toBe(1)
    expect(guidanceLevel(intent, 24)).toBe(3)
    expect(guidanceLevel(intent, 400)).toBe(4)
  })

  /**
   * התקרה היא הכלל שמגן על הרגעים ההיסטוריים: אסור שחץ יופיע באמצע יום כמו 2.5.1998.
   */
  it('refuses to raise an arrow over a historical moment, however long the player stands still', () => {
    const quiet = ALL_INTENTS.find((i) => i.guidance?.ceiling === 1)
    expect(quiet, 'no intent protects its own moment').toBeTruthy()
    expect(guidanceLevel(quiet!, 600)).toBe(1)
  })

  it('stops guiding entirely while somebody is leading — the feet are already moving', () => {
    expect(direct(input({ quietFor: 90, guidedId: 'efi-to-ussishkin' })).guidance).toBe(0)
  })
})

describe('ההליכה עצמה', () => {
  it('walks the doors that actually exist in the chapter', () => {
    const byId = new Map(ALL_SCENES.map((s) => [s.id, s]))
    for (const route of Object.values(ROUTES)) {
      const chapter = route.id === 'efi-to-ussishkin' ? 'a3-hall' : '1986'
      for (let i = 1; i < route.waypoints.length; i += 1) {
        const from = route.waypoints[i - 1]!.at
        const to = route.waypoints[i]!.at
        const scene = byId.get(from)
        const open = (scene?.exits ?? []).some((exit) => exitInEra(exit, chapter) && exit.to === to)
        expect(open, `${route.id}: there is no door from ${from} to ${to} in ${chapter}`).toBe(true)
      }
    }
  })

  it('takes Efi through Allenby, which is the way he says he goes', () => {
    expect(routeFor('efi-to-ussishkin')?.waypoints.map((w) => w.at)).toEqual([
      'street',
      'allenby',
      'ussishkin-outside',
      'ussishkin-hall',
    ])
  })

  it('teaches the city by arriving, using the flag the chapter already had', () => {
    const walk = new GuidedWalk(EFI_USSISHKIN)
    const signals = [walk.advance(), walk.advance(), walk.advance(), walk.advance()].flat()
    expect(signals.some((s) => s.k === 'teach' && s.area === 'ussishkin')).toBe(true)
    expect(routeFlag('ussishkin')).toBe('life:knows:hall')
  })

  it('hands control back at the hall, with the line Efi says', () => {
    const walk = new GuidedWalk(EFI_USSISHKIN)
    let last: ReturnType<GuidedWalk['advance']> = []
    while (!walk.done()) last = walk.advance()
    const release = last.find((s) => s.k === 'release')
    expect(release).toEqual({ k: 'release', at: 'ussishkin-hall', mode: 'FREE', sayHe: 'זה פה.' })
  })

  /**
   * טעינה מחדש באמצע אלנבי — אף אחד לא הולך את אותו רחוב פעמיים.
   */
  it('resumes mid-route instead of walking it again', () => {
    const first = new GuidedWalk(EFI_USSISHKIN)
    first.advance()
    first.advance()
    const snap = first.snapshot()

    const second = new GuidedWalk(EFI_USSISHKIN)
    second.restore(snap)
    expect(second.where()).toBe('ussishkin-outside')
    const rest: string[] = []
    while (!second.done()) for (const s of second.advance()) if (s.k === 'walk') rest.push(s.to)
    expect(rest).toEqual(['ussishkin-outside', 'ussishkin-hall'])
  })

  it('refuses a skip the first time, and allows it once the walk is familiar', () => {
    expect(new GuidedWalk(EFI_USSISHKIN).skip(false)).toEqual([])
    expect(new GuidedWalk(EFI_USSISHKIN).skip(true).some((s) => s.k === 'teach')).toBe(true)
    // the walk home with an angry father is never skippable
    expect(new GuidedWalk(KOBI_HOME).skip(true)).toEqual([])
  })

  /**
   * המבחן האמיתי של הארכיטקטורה: אותו קוד, שתי חוויות שאסור שיהיו דומות.
   */
  it('makes the father feel nothing like the friend, out of the same machine', () => {
    const efi = routeFor(EFI_USSISHKIN.routeId)!
    const kobi = routeFor(KOBI_HOME.routeId)!
    // Efi talks and shows the city; Kobi walks
    expect(efi.waypoints.filter((w) => w.sayHe).length).toBeGreaterThan(kobi.waypoints.filter((w) => w.sayHe).length)
    expect(efi.waypoints.some((w) => w.revealHe)).toBe(true)
    expect(kobi.waypoints.some((w) => w.revealHe)).toBe(false)
    // and he sets the pace
    expect(Math.min(...kobi.waypoints.map((w) => w.pace ?? 1))).toBeLessThan(1)
    expect(EFI_USSISHKIN.teaches?.length).toBeGreaterThan(0)
    expect(KOBI_HOME.teaches ?? []).toEqual([])
  })
})

describe('נרשם בזיכרון — ולא "משימה הושלמה"', () => {
  it('fires exactly at the moment the world proves the experience happened', () => {
    const before = life({ 'a3:inside': true })
    const after = life({ 'a3:inside': true, 'life:seen:ussishkin': true })
    const done = justCompleted(before, after, 'a3-hall')
    expect(done?.memory?.titleHe).toBe('אוסישקין בפעם הראשונה')
  })

  it('does not fire twice for the same life', () => {
    const seen = life({ 'a3:inside': true, 'life:seen:ussishkin': true })
    expect(justCompleted(seen, seen, 'a3-hall')).toBeNull()
  })

  /**
   * **16.9.2026 — השומר הזה הצטמצם, לפי כלל 63ב, ורק הוא.**
   *
   * מאור הכריע ב-15.9.2026, והכלל מצטט את ההכרעה במילים שלה:
   *
   *   > ב · הישגים — מותרים. האיסור הגורף בוטל. […] כשהישגים ייבנו, השומר הראשון
   *   > **מצטמצם** לכדי איסור על **ציון יחיד** — שהמפרט עצמו דורש ("אין ציון יחיד שמגדיר
   *   > מי אוהד ראוי"). השני **נשאר כפי שהוא**: הוא על פרטיות בכרטיס משותף, לא על הישגים,
   *   > ואין לו קשר להכרעה הזאת.
   *
   * ההישגים נבנו היום (`lib/life/achievements.ts` — שלושים שורות, כל אחת עם פרס שהוא חפץ,
   * גישה, הכרה, יצירה נראית או רגע אישי). זה התנאי שהכלל תלה בו את הצמצום, ולכן הוא קורה
   * עכשיו ולא קודם: *"עד שהישגים נבנים, הבדיקות לא זזות."*
   *
   * **מה יצא מאוצר המילים.** `'הישג'` — כי הישג שקורא לעצמו בשמו הוא בדיוק מה שהותר.
   * `'תג '` ו-`'רצף'` — כי תג ורצף אינם ציון יחיד; הם נאסרו מלכתחילה על כרטיס שיתוף,
   * ושם הם נשארים אסורים. `tests/life-share.test.ts` לא נגעו בו באף תו.
   *
   * **מה נשאר, ובשלוש הצורות שהוא לובש:** מילה (`ניקוד`, `דירוג`), אחוז, וקידמה בצורת
   * "N מתוך M" או "N/M" — שהיא אותה טענה בדיוק, רק בלי המילה.
   *
   * **ומה התרחב.** זה הצד השני של כלל 65: שומר שאיבד חצי מאוצר המילים שלו ולא הרוויח שטח
   * הוא שומר שנחלש. אז הוא סורק עכשיו גם את שכבת ההישגים עצמה — הכותרות, הפרסים וההסברים
   * למה פרס ממתין לפרק — כי זאת השכבה שבה ציון יחיד היה מופיע אילו מישהו החליק אותו פנימה.
   * `JSON.stringify` משמיט את הפרדיקטים, וזה בסדר: הוא בודק את מה שהשחקן קורא.
   */
  it('carries no single score — not in the story layer and not in the achievements', () => {
    const text = JSON.stringify([ALL_INTENTS, ACHIEVEMENTS])
    for (const banned of ['ניקוד', 'נקודות', 'דירוג', '%']) {
      expect(text.includes(banned), `the layer says "${banned}"`).toBe(false)
    }
    expect(/\d+\s*מתוך\s*\d+/.test(text), 'a progress count, spelled out').toBe(false)
    expect(/(?<!\d)\d{1,3}\s*\/\s*\d{1,3}(?!\d)/.test(text), 'a progress count, as a fraction').toBe(false)
  })
})

describe('כל הליכה מודרכת שייכת לפרק שיש בו', () => {
  it('names a chapter that exists, and a route that exists', () => {
    for (const memory of [...guidedInChapter('a3-hall'), ...guidedInChapter('1986')]) {
      expect(routeFor(memory.routeId), `${memory.id} has no route`).toBeTruthy()
      expect(intentsFor(memory.chapter).length, `${memory.chapter} has no intents`).toBeGreaterThan(0)
    }
  })

  it('releases the player in the room the route actually ends in', () => {
    for (const memory of Object.values({ EFI_USSISHKIN, KOBI_HOME })) {
      const last = routeFor(memory.routeId)?.waypoints.at(-1)?.at
      expect(memory.release.at, `${memory.id} releases somewhere the walk never reaches`).toBe(last)
    }
  })
})
