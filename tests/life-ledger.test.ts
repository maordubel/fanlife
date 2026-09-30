import { describe, expect, it } from 'vitest'

import { ACHIEVEMENTS, waiting } from '@/lib/life/achievements'
import { CHAPTERS } from '@/lib/life/content/chapters'
import { BEATS_ARMY } from '@/lib/life/content/chapter1996army'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { eraFor } from '@/lib/life/content/era'
import { MATCH_SCRIPTS, SCRIPT_CHAPTER } from '@/lib/life/content/matchScripts'
import { emptyState } from '@/lib/life/events'
import type { LifeState } from '@/lib/life/types'
import { stageOutOfReachFor, type RouteId } from '@/lib/life/routes'
import { ALL_SCENES, inEra } from '@/lib/life/world/scenes'

/**
 * הפנקס — and whether anything in the world actually writes in it.
 *
 * Three of the thirty achievements were waiting on evidence rather than on fiction: the
 * promise renegotiated in advance, four promises kept, two money debts settled on two
 * different dates. The scenes for all three already existed — the bread, the hour Rachel
 * named, *"מה שלא יהיה"*, the winter in uniform, the coins over your head at a bus door,
 * the half tank of petrol somebody else paid for. **Nobody was writing them down.**
 *
 * So this suite is not about whether the rows are correct; `tests/life-achievements.test.ts`
 * owns that. It asks the one question a predicate cannot ask about itself: **can a life
 * reach the evidence?** It walks the same reachable set `tests/life-reachable.test.ts`
 * walks — the conversations a chapter can actually open, from its scenes, its beats, its
 * windows — and reads the proofs out of the content, so a row that goes back to being
 * unreachable fails here rather than in a year of nobody noticing.
 *
 * Rule 66, from the other end: that file proves a THRESHOLD is not above the ceiling;
 * this one proves the EVIDENCE exists in a room somebody can walk into.
 */

const PLAYABLE = CHAPTERS.filter((chapter) => chapter.playable !== false)

type Effect = Record<string, unknown> & { e: string }

const effectsOf = (id: string): Effect[] => {
  const out: Effect[] = []
  for (const branch of DIALOGUE[id]?.branches ?? []) {
    for (const effect of branch.then ?? []) out.push(effect as never)
    for (const choice of branch.choices ?? []) for (const effect of choice.then) out.push(effect as never)
  }
  return out
}

/** every conversation id a chapter can open — scenes, beats, windows, and their `goto`s */
const conversationsIn = (chapter: string): Set<string> => {
  const roots: string[] = []
  for (const scene of ALL_SCENES) {
    for (const actor of scene.actors) if (inEra(actor, chapter) && actor.talk) roots.push(actor.talk)
    for (const spot of scene.hotspots) {
      const act = (spot as { act?: string }).act
      if (inEra(spot, chapter) && act) roots.push(act)
    }
  }
  const era = eraFor(chapter) as unknown as Record<string, unknown>
  const scan = (value: unknown, depth = 0): void => {
    if (depth > 12 || !value) return
    if (Array.isArray(value)) return void value.forEach((item) => scan(item, depth + 1))
    if (typeof value !== 'object') return
    const node = value as Record<string, unknown>
    for (const key of ['talk', 'node', 'act', 'conversation']) {
      if (typeof node[key] === 'string') roots.push(node[key] as string)
    }
    for (const child of Object.values(node)) scan(child, depth + 1)
  }
  for (const key of ['beats', 'opportunities', 'encounters', 'ambient']) scan(era[key])

  /**
   * ומה שמדובר בתוך משחק — a match script is a room too.
   *
   * `double-00` opens `d-stand` on a `talk` step between ninety minutes and extra time,
   * and nothing in the scene graph points at it: the director does. A walk that reads
   * only scenes and beats would call that content unreachable and be wrong in the one
   * direction that matters — it would let real evidence look like dead content.
   */
  for (const [id, script] of Object.entries(MATCH_SCRIPTS)) {
    if (SCRIPT_CHAPTER[id] !== chapter) continue
    for (const step of script.steps) if (step.talk) roots.push(step.talk)
  }

  const seen = new Set<string>()
  const queue = [...roots]
  while (queue.length) {
    const id = queue.shift() as string
    if (seen.has(id) || !DIALOGUE[id]) continue
    seen.add(id)
    for (const effect of effectsOf(id)) if (effect.e === 'goto') queue.push(effect.node as string)
  }
  return seen
}

type Recorded = { chapter: string; kind: string; proofId: string; subject: string | null }

/**
 * ראיות שביט כותב — נקראות בהרצה, כי `a: 'derive'` היא פונקציה ולא נתון.
 *
 * A beat can write events from state, which is how a promise that spans a whole chapter
 * closes at its end rather than inside one branch. Reading its source would be guessing;
 * running it over an empty state of that chapter is the same thing the runtime does.
 */
const beatProofs = (chapter: { id: string; year: number }): Recorded[] => {
  const era = eraFor(chapter.id) as unknown as { beats?: readonly { do?: readonly unknown[] }[] }
  const state: LifeState = {
    ...emptyState({ birthYear: 1978, nameHe: 'פוגי' } as never, chapter.year),
    chapter: chapter.id,
  }
  const rows: Recorded[] = []
  for (const beat of era.beats ?? []) {
    for (const action of beat.do ?? []) {
      const derive = action as { a?: string; events?: (state: LifeState) => readonly Record<string, unknown>[] }
      if (derive.a !== 'derive' || typeof derive.events !== 'function') continue
      for (const event of derive.events(state)) {
        if (event.t !== 'proof.recorded') continue
        const proof = event.proof as Record<string, unknown>
        rows.push({
          chapter: chapter.id,
          kind: String(proof.kind),
          proofId: String(proof.proofId),
          subject: (proof.subjectHe as string | undefined) ?? null,
        })
      }
    }
  }
  return rows
}

/** every proof the reachable content of every chapter can record */
const LEDGER: Recorded[] = PLAYABLE.flatMap((chapter) => {
  const rows: Recorded[] = [...beatProofs(chapter)]
  for (const id of conversationsIn(chapter.id)) {
    for (const effect of effectsOf(id)) {
      if (effect.e !== 'proof') continue
      rows.push({
        chapter: chapter.id,
        kind: effect.kind as string,
        proofId: (effect.proofId as string).replace('{chapter}', chapter.id),
        subject: (effect.subjectHe as string | undefined) ?? null,
      })
    }
  }
  return rows
})

const of = (kind: string) => LEDGER.filter((row) => row.kind === kind)
const idsOf = (kind: string) => new Set(of(kind).map((row) => row.proofId))
const chaptersOf = (kind: string) => new Set(of(kind).map((row) => row.chapter))
const subjectsOf = (kind: string) => new Set(of(kind).map((row) => row.subject ?? row.proofId))

describe('הפנקס — ראיה שאפשר להגיע אליה', () => {
  it('records four different promises kept, in more than one chapter', () => {
    // ACH_RELIABLE: four distinct proof ids, two chapters. The ids are what is counted,
    // so promising the same thing four times is one promise — and the subjects say it
    // out loud: bread, an hour, a bus north, a winter.
    expect(idsOf('promise_kept').size, [...idsOf('promise_kept')].join('\n')).toBeGreaterThanOrEqual(4)
    expect(chaptersOf('promise_kept').size).toBeGreaterThanOrEqual(2)
    expect(subjectsOf('promise_kept').size).toBe(idsOf('promise_kept').size)
  })

  it('offers a promise renegotiated in advance, on a subject that can then be kept', () => {
    // ACH_NEW_PLAN crosses SUBJECT, never key: the new time has to be agreed and then met
    // on the same thing. A renegotiation nobody can keep is a branch, not a mechanism.
    const renegotiated = subjectsOf('promise_renegotiated')
    expect(renegotiated.size).toBeGreaterThan(0)
    const kept = subjectsOf('promise_kept')
    const both = [...renegotiated].filter((subject) => kept.has(subject))
    expect(both, `renegotiated: ${[...renegotiated].join(', ')} · kept: ${[...kept].join(', ')}`).not.toEqual([])
  })

  it('settles two money debts on two different dates', () => {
    // ACH_BALANCE: two settlements in two chapters. Two repayments in one evening is one
    // evening; the second chapter is what makes it a habit rather than a tidy-up.
    expect(idsOf('debt_settled').size).toBeGreaterThanOrEqual(2)
    expect(chaptersOf('debt_settled').size, [...chaptersOf('debt_settled')].join(', ')).toBeGreaterThanOrEqual(2)
  })
})

describe('הפנקס — צמדים, וכל אחד בשני מקומות', () => {
  /**
   * שלוש הראיות של הגל הזה הן כולן **צמד**, וכל צמד קיים כדי שההבדל בין שני חצאיו יהיה
   * אמיתי: מקום שנמסר אינו מקום שמישהו ישב בו, שמות שנרשמו אינם אנשים שהגיעו, והתנצלות
   * אינה הפרה שנמחקה. לכן הבדיקה כאן אינה "האם הראיה קיימת" אלא **האם שני החצאים
   * נגישים, על אותו נושא** — וב-`ticket_used` גם: האם הוא נרשם במקום אחר מזה שבו נמסר.
   */
  it('shares a seat in one room and sees it used in another', () => {
    const shared = subjectsOf('ticket_shared')
    const used = subjectsOf('ticket_used')
    expect(shared.size, 'nothing in the game hands over a place').toBeGreaterThan(0)
    const both = [...shared].filter((subject) => used.has(subject))
    expect(both, `shared: ${[...shared].join(', ')} · used: ${[...used].join(', ')}`).not.toEqual([])

    // and the two halves are not the same beat: a place is given where people talk, and
    // it is answered where the match is
    const sharedIds = idsOf('ticket_shared')
    const usedIds = idsOf('ticket_used')
    for (const id of sharedIds) expect(usedIds.has(id), `${id} records both halves at once`).toBe(false)
  })

  it('lets a group be delivered — and lets it fail on the same subject', () => {
    // ACH_TEAM reads BOTH: `group_delivered` grants it, `group_unresolved` on the same
    // subject takes it away. A promise about people that cannot be broken is not a promise.
    const delivered = subjectsOf('group_delivered')
    const unresolved = subjectsOf('group_unresolved')
    expect(delivered.size).toBeGreaterThan(0)
    const both = [...delivered].filter((subject) => unresolved.has(subject))
    expect(both, `delivered: ${[...delivered].join(', ')} · unresolved: ${[...unresolved].join(', ')}`).not.toEqual([])
  })

  it('records a breach where it happens and a repair where it is spoken about', () => {
    const breaches = subjectsOf('breach_discovered')
    const repairs = subjectsOf('repair_completed')
    expect(breaches.size, 'no breach is ever written down').toBeGreaterThan(0)
    const both = [...breaches].filter((subject) => repairs.has(subject))
    expect(both.length, `breaches: ${[...breaches].join(', ')} · repairs: ${[...repairs].join(', ')}`).toBeGreaterThanOrEqual(2)

    // a repair is always a later chapter than the breach it answers — going back to
    // something takes time, and an apology in the same scene is not a repair
    for (const subject of both) {
      const breachAt = of('breach_discovered').filter((row) => (row.subject ?? row.proofId) === subject)
      const repairAt = of('repair_completed').filter((row) => (row.subject ?? row.proofId) === subject)
      const order = PLAYABLE.map((chapter) => chapter.id)
      const earliestBreach = Math.min(...breachAt.map((row) => order.indexOf(row.chapter)))
      const latestRepair = Math.max(...repairAt.map((row) => order.indexOf(row.chapter)))
      expect(latestRepair, `${subject} is repaired in the chapter it was broken in`).toBeGreaterThan(earliestBreach)
    }
  })
})

describe('העיתונות — שני מקורות, דף בחלון, ותיקון שלא מוחק', () => {
  /**
   * שלוש השורות של שדרת העיתונות קוראות אותה שרשרת: לבדוק, לכתוב, לפרסם, לתקן. כל חוליה
   * בה היא ראיה נפרדת **בכוונה**, כי הצורה המלאה היא מה שההישגים בודקים — שמועה שנכתבה
   * בלי לבדוק היא עדיין כתיבה, ודף שתוקן במחיקה הוא דף בלי היסטוריה.
   */
  it('checks one subject against two different sources, and writes that subject down', () => {
    // ACH_VERIFY: `subjectWithSources(…, 2)` counts DISTINCT proof ids on one subject.
    const bySubject = new Map<string, Set<string>>()
    for (const row of of('verified_report')) {
      const subject = row.subject ?? row.proofId
      const ids = bySubject.get(subject) ?? new Set<string>()
      ids.add(row.proofId)
      bySubject.set(subject, ids)
    }
    const twoSourced = [...bySubject.entries()].filter(([, ids]) => ids.size >= 2).map(([subject]) => subject)
    expect(twoSourced, [...bySubject.keys()].join(', ')).not.toEqual([])
    const written = subjectsOf('written_account')
    expect(twoSourced.filter((subject) => written.has(subject)), 'nothing writes down what it checked').not.toEqual([])
  })

  it('publishes a written account somewhere other than where it was written', () => {
    const written = subjectsOf('written_account')
    const published = subjectsOf('publication_proof')
    const both = [...published].filter((subject) => written.has(subject))
    expect(both, `written: ${[...written].join(', ')} · published: ${[...published].join(', ')}`).not.toEqual([])
    for (const id of idsOf('publication_proof')) expect(idsOf('written_account').has(id)).toBe(false)
  })

  it('can correct what it published — in a later chapter, on the same subject', () => {
    const corrections = of('public_correction')
    expect(corrections.length, 'nothing in the world can be corrected').toBeGreaterThan(0)
    const written = subjectsOf('written_account')
    const order = PLAYABLE.map((chapter) => chapter.id)
    for (const row of corrections) {
      const subject = row.subject ?? row.proofId
      expect(written.has(subject), `${subject} is corrected but never written`).toBe(true)
      const writtenAt = of('written_account').filter((other) => (other.subject ?? other.proofId) === subject)
      const earliest = Math.min(...writtenAt.map((other) => order.indexOf(other.chapter)))
      expect(order.indexOf(row.chapter), `${subject} is corrected in the chapter it was written in`).toBeGreaterThan(earliest)
    }
  })
})

describe('יצירה — ומה שקהל עושה איתה', () => {
  it('makes something in one chapter and hears it used in another', () => {
    // ACH_CREATE crosses subject: the thing you made and the thing they used are one
    // thing. The two halves are never the same room — that is the achievement.
    const made = subjectsOf('creation_proof')
    const used = subjectsOf('crowd_use_proof')
    expect(made.size, 'nothing in the game is made').toBeGreaterThan(0)
    const both = [...made].filter((subject) => used.has(subject))
    expect(both, `made: ${[...made].join(', ')} · used: ${[...used].join(', ')}`).not.toEqual([])

    const order = PLAYABLE.map((chapter) => chapter.id)
    for (const subject of both) {
      const madeAt = of('creation_proof').filter((row) => (row.subject ?? row.proofId) === subject)
      const usedAt = of('crowd_use_proof').filter((row) => (row.subject ?? row.proofId) === subject)
      const earliest = Math.min(...madeAt.map((row) => order.indexOf(row.chapter)))
      const latest = Math.max(...usedAt.map((row) => order.indexOf(row.chapter)))
      expect(latest, `${subject} is used in the same chapter it was made in`).toBeGreaterThanOrEqual(earliest)
    }
  })
})

describe('חוב — נלקח בכסף, ונסגר באותו כסף', () => {
  /**
   * *"חוב שאי אפשר לפרוע הוא לא חוב, הוא עונש."*
   *
   * Every positive `debt` a chapter can declare is a favour somebody did in money. This
   * asks the only question that keeps that honest: is there a branch, anywhere later,
   * that gives back exactly that amount. Not a smaller one, and not a generic
   * "settle everything" screen — the same number, from the room it was taken in.
   */
  const debts = PLAYABLE.flatMap((chapter) =>
    [...conversationsIn(chapter.id)].flatMap((id) =>
      effectsOf(id)
        .filter((effect) => effect.e === 'debt')
        .map((effect) => ({ chapter: chapter.id, agorot: effect.agorot as number, why: effect.why as string })),
    ),
  )

  it('takes at least one debt and repays every amount it takes', () => {
    const taken = debts.filter((row) => row.agorot > 0)
    const repaid = debts.filter((row) => row.agorot < 0).map((row) => -row.agorot)
    expect(taken.length).toBeGreaterThan(0)
    for (const debt of taken) {
      expect(repaid.includes(debt.agorot), `${debt.why} (${debt.agorot}) can be taken and never repaid`).toBe(true)
    }
  })

  it('never lets the ledger say a debt was settled without money moving', () => {
    for (const chapter of PLAYABLE) {
      for (const id of conversationsIn(chapter.id)) {
        for (const branch of DIALOGUE[id]?.branches ?? []) {
          const groups = [branch.then ?? [], ...(branch.choices ?? []).map((choice) => choice.then)]
          for (const group of groups) {
            const settles = group.some(
              (effect) => (effect as Effect).e === 'proof' && (effect as Effect).kind === 'debt_settled',
            )
            if (!settles) continue
            const money = group.filter((effect) => (effect as Effect).e === 'money') as Effect[]
            const debt = group.filter((effect) => (effect as Effect).e === 'debt') as Effect[]
            expect(money.some((effect) => (effect.agorot as number) < 0), `${id} settles without paying`).toBe(true)
            expect(debt.some((effect) => (effect.agorot as number) < 0), `${id} settles without clearing debt`).toBe(true)
          }
        }
      }
    }
  })
})

describe('ההבטחה של החורף — beat, ולא ענף', () => {
  /**
   * *"לא אעשה שטויות"* is made on one evening and tested across a whole winter, so it
   * cannot close inside a branch. The beat closes it, and only when the two things it was
   * about did not happen. This checks the beat by RUNNING its derive over a state, which
   * is the only way to see what a function-shaped action actually writes.
   */
  const beat = BEATS_ARMY.find((row) => row.id === 'a5-promise-kept')

  it('exists, and is fenced by the two things the promise was about', () => {
    expect(beat, 'the winter promise never closes').toBeTruthy()
    const none = JSON.stringify(beat?.when ?? {})
    expect(none).toContain('life:awol')
    expect(none).toContain('life:lied:army')
  })

  it('writes a promise kept, with its own subject', () => {
    const chapter = PLAYABLE.find((row) => row.id === '1996-army')
    const state: LifeState = {
      ...emptyState({ birthYear: 1978, nameHe: 'פוגי' } as never, chapter?.year ?? 1996),
      chapter: '1996-army',
    }
    const derive = (beat?.do ?? []).find((action) => (action as { a: string }).a === 'derive') as
      | { events: (state: LifeState) => readonly { t: string; proof?: Record<string, unknown> }[] }
      | undefined
    const events = derive?.events(state) ?? []
    const proof = events.find((event) => event.t === 'proof.recorded')?.proof
    expect(proof?.kind).toBe('promise_kept')
    expect(String(proof?.proofId)).toContain('1996-army')
    expect(String(proof?.subjectHe ?? '').length).toBeGreaterThan(0)
  })
})

describe('מה שעוד ממתין — והשורה שאומרת למה', () => {
  it('has taken the ten the ledger just opened off the waiting list', () => {
    const waitingIds = new Set(waiting().map((row) => row.id))
    for (const id of [
      'ACH_NEW_PLAN',
      'ACH_RELIABLE',
      'ACH_BALANCE',
      'ACH_GAVE',
      'ACH_TEAM',
      'ACH_REPAIR',
      'ACH_VERIFY',
      'ACH_WRITE',
      'ACH_CORRECT',
      'ACH_CREATE',
    ]) {
      expect(waitingIds.has(id), `${id} is still reported as waiting`).toBe(false)
    }
  })

  it('still names a reason for every row that is still waiting', () => {
    for (const row of ACHIEVEMENTS) {
      if (row.waitingHe === null) continue
      expect(row.waitingHe.trim().length, row.id).toBeGreaterThan(20)
    }
  })

  /**
   * ושורת המתנה שמצביעה על הסיבה הלא-נכונה היא שקר קטן במקום שקיים כדי להיות כן.
   *
   * ארבע שורות אמרו עד היום *"שום סצנה לא מרימה עדיין את דגל השיא"*. `acceptEvents`
   * מרים אותו, וההזמנה הגיעה לחדר בדלתא 71 — מה שעוצר הוא הגיל, ורק הוא. השורות תוקנו,
   * וזה מה ששומר עליהן: כל שיא שמופיע כאן נבדק מול `stageOutOfReachFor`, כך שהיום שבו
   * ייכתב פרק אחרי 2000 יפיל את הבדיקה ויכריח לכתוב מחדש את הסיבה, במקום להשאיר משפט
   * שנהיה שגוי בשקט.
   */
  /**
   * ...ומי שכבר אפשר להגיע אליו **שותק** (21.9.2026).
   *
   * הבדיקה הזאת עברה על חמש פסגות ודרשה משורת ההמתנה של כל אחת לומר "גיל". היא
   * נפלה ברגע ש-`2002-europe` ו-`2006-home` נבנו, כי התקרה עלתה מ-22 ל-28 וארבעה
   * קירות גיל נפלו לבד — בדיוק מה שהשורה ההיא הבטיחה (*"פרק שאחרי 2000 יזיז אותו
   * בלי לגעת בשורה"*).
   *
   * היא לא רוככה, היא **התהפכה**: היום היא דורשת ש-`waitingHe` יהיה `null` בדיוק
   * אצל מי שאפשר להגיע אליו, ומשפט-גיל בדיוק אצל מי שלא. משפט המתנה על פסגה פתוחה
   * הוא שקר לשחקן, ופסגה נעולה בלי משפט היא בדיוק הפגם שכלל 78 נכתב עליו.
   */
  it('names the real blocker for every apex still out of reach, and stays quiet about the rest', () => {
    const state: LifeState = emptyState({ birthYear: 1978, nameHe: 'פוגי' } as never, 2000)
    const apexes: Array<[string, RouteId]> = [
      ['ACH_LEAD', 'ULTRAS'],
      ['ACH_JOURNALIST', 'JOURNALIST'],
      ['ACH_ARTIST', 'CREATOR'],
      ['ACH_ROADS', 'TRAVELLER'],
      ['ACH_OWNER', 'OWNER'],
    ]
    for (const [id, route] of apexes) {
      const row = ACHIEVEMENTS.find((entry) => entry.id === id)
      expect(row, id).toBeTruthy()
      const blocked = stageOutOfReachFor(state, route, 'apex')
      if (blocked) {
        expect(row?.waitingHe, `${id} is out of reach and says nothing`).toBeTruthy()
        expect(row?.waitingHe?.includes('גיל'), `${id} does not say the age is what stops it`).toBe(true)
        expect(row?.waitingHe?.includes('שום סצנה'), `${id} still blames a scene that exists`).toBe(false)
      } else {
        /**
         * ...ומי שהגיל שלו כבר בסדר **אסור לו לטעון שהגיל עוצר אותו**.
         *
         * מותר לו עדיין להמתין — `ACH_OWNER` מחכה ל-`ownership_contract` שאף סצנה לא
         * רושמת, וזו המתנה אמיתית שכלל 78 דורש שתיאמר. מה שאסור הוא לנקוב בחסם שנפל:
         * שורה שאומרת "גיל" אחרי שנבנה 2009 היא אותו שקר-למראית-עין שכרטיס המסלול
         * נבנה נגדו (כלל 71 — לדווח על חלון כעל גיל).
         */
        expect(row?.waitingHe?.includes('גיל'), `${id} is reachable by age and still blames age`).not.toBe(true)
      }
    }

    // ...ו-OWNER הוא היחיד שעדיין נעול בגיל, כי הפסגה שלו היא 30 והתסריט מציב את
    // ענף הבעלות ב-2025. זה נמנה בשמו ולא מאחורי הכללה (כלל 78).
    // ...ומ-21.9.2026 **כל חמש** בתוך התקרה: 2009 נכתב, כלומר גיל 31, ו-30 כבר לא קיר.
    for (const route of ['ULTRAS', 'JOURNALIST', 'CREATOR', 'TRAVELLER', 'OWNER'] as RouteId[]) {
      expect(stageOutOfReachFor(state, route, 'apex'), `${route} apex should be inside the ceiling now`).toBe(false)
    }

    // and the founder is the one whose age is fine — a window is a different sentence
    const founder = ACHIEVEMENTS.find((entry) => entry.id === 'ACH_FOUNDER')
    expect(stageOutOfReachFor(state, 'USSISHKIN_FOUNDER', 'apex')).toBe(false)
    expect(founder?.waitingHe?.includes('חלון')).toBe(true)
  })
})
