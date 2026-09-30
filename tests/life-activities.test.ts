import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  ACTIVITIES,
  ACTIVITY,
  ACTIVITY_CONVERSATIONS,
  activityBase,
  activityCeiling,
  activityChapters,
  activityForGig,
  favourFlag,
  isStageA,
  pickContent,
  settleActivity,
  tierOf,
  windowFor,
  type ActivityId,
} from '@/lib/life/activities'
import { CHAPTERS } from '@/lib/life/content/chapters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { apply, emptyState, fold, type LifeEvent } from '@/lib/life/events'
import { GIGS, gigActivity, gigChapters, gigId, isPaid, offeredIn, workDoneFlag } from '@/lib/life/gigs'
import { SHOP_ORDER_CONVERSATIONS } from '@/lib/life/shirts'
import { WAGE, decadeOf } from '@/lib/life/prices'
import { eraUpTo } from '@/lib/game/hate'
import { PAPERS_STOPS, paperStops, routeScore, shortestRound, roundLength } from '@/lib/life/papers'
import type { LifeState, PlayerIdentity } from '@/lib/life/types'
import { levelForAge, type ActivityResult, type MechanicCatalog } from '@/lib/mechanics/types'

/**
 * פעילויות — the gate games inside the life, and the economy they may not break (21.9.2026).
 *
 * Maor's file asks for two things at once and this suite holds both: *"לא כסף אינסופי"* and
 * *"לא softlock"*. The first is two money slots a chapter and a row paid once per life; the
 * second is that nothing here can ever take money away, so no ticket that was affordable
 * before an activity is unaffordable after it. And the tested 1984–86 economy of the shirt
 * does not move at all (owner, 21.9.2026).
 *
 * A life suite never types a year (rule 45): every year below is read off `CHAPTERS`.
 */

const PLAYABLE = CHAPTERS.filter((chapter) => chapter.playable !== false)
const IDENTITY = { birthYear: (PLAYABLE[0]?.year ?? 0) - 6, name: 'פוגי', sex: 'boy' } as PlayerIdentity
const YEAR = (id: string) => CHAPTERS.find((chapter) => chapter.id === id)?.year ?? 0

/** a life standing in `chapter`, of the right age, with a seed and nothing else */
function lifeIn(chapter: string, extra: Partial<LifeState> = {}): LifeState {
  const year = YEAR(chapter)
  return {
    ...emptyState(IDENTITY, year),
    chapter,
    year,
    age: year - IDENTITY.birthYear,
    rng: { seed: `test-${chapter}`, cursor: 0 },
    ...extra,
  }
}

const settle = (state: LifeState, events: readonly LifeEvent[]) => events.reduce(apply, state)
const full: ActivityResult = { completed: true, score: 1, pay: 1 }

describe('פעילויות — the table', () => {
  it('names every conversation in full, and DIALOGUE agrees in both directions (rule 71)', () => {
    for (const [id, row] of Object.entries(ACTIVITY_CONVERSATIONS)) {
      if (row.ask) expect(DIALOGUE[row.ask], `${id} ask`).toBeDefined()
      if (row.after) expect(DIALOGUE[row.after], `${id} after`).toBeDefined()
    }
    const named = new Set(Object.values(ACTIVITY_CONVERSATIONS).flatMap((row) => [row.ask, row.after]).filter(Boolean))
    for (const id of Object.keys(DIALOGUE).filter((key) => key.startsWith('act-'))) {
      expect(named.has(id), `${id} is written and not in ACTIVITY_CONVERSATIONS`).toBe(true)
    }
  })

  it('points every job or bet at a GIGS row, and never plays a row outside its own door', () => {
    for (const def of ACTIVITIES) {
      if (!def.gig) continue
      const gig = GIGS.find((row) => row.id === def.gig)
      expect(gig, def.id).toBeDefined()
      expect(gig?.activity, `${def.gig} does not point back at ${def.id}`).toBe(def.id)
      for (const chapter of gigChapters(gig!)) {
        const act = gigActivity(gig!, chapter)
        if (act) expect(activityChapters(def), `${def.id} in ${chapter}`).toContain(chapter)
      }
    }
  })

  it('asks the shop order at the counter in exactly the chapters the order exists, by its full name', () => {
    const gig = GIGS.find((row) => row.id === 'order-shop')!
    expect(Object.keys(SHOP_ORDER_CONVERSATIONS).sort()).toEqual([...activityChapters(ACTIVITY['shop-order'])].sort())
    for (const [chapter, id] of Object.entries(SHOP_ORDER_CONVERSATIONS)) {
      expect(id).toBe(gigId(gig, chapter))
      expect(DIALOGUE[id], id).toBeDefined()
    }
  })

  it('names no gate number and no gate route — the life knows mechanics, not the wall', () => {
    for (const path of ['lib/life/activities.ts', 'lib/mechanics/types.ts', 'lib/mechanics/registry.ts', 'lib/life/content/dialogueActivities.ts']) {
      // `gate7` as a reputation AUDIENCE is the life's own word for the away terrace (rule 79), never shown;
      // `gate5` as a ROOM is Bloomfield's own curva under the stand (a `LocationId`, rule 9), not a gate on the wall
      const text = readFileSync(path, 'utf8').replace(/audience: 'gate7'/g, '').replace(/where: 'gate5'/g, '')
      expect(/gate\s?\d|שער\s?\d|'\/(trivia|lineup|kits|memory|goal|polls|xi|derby|archive|timeline)/.test(text), path).toBe(false)
    }
  })

  it('gives every mechanic three ages, off the life and never chosen', () => {
    expect(levelForAge(8)).toBe('child')
    expect(levelForAge(15)).toBe('teen')
    expect(levelForAge(30)).toBe('adult')
  })
})

describe('פעילויות — money in the decade it is earned in', () => {
  it('B is an hour of that decade, and every activity pays inside its own range of it', () => {
    for (const def of ACTIVITIES) {
      for (const chapter of activityChapters(def)) {
        const b = activityBase(chapter)
        expect(b, chapter).toBe(WAGE[decadeOf(chapter)])
        if (!def.pay || isStageA(chapter)) continue
        const [min, max] = def.pay
        const top = ACTIVITY[def.id] === def ? Math.round(b * max) : 0
        const state = lifeIn(chapter)
        const paidTop = settleActivity(state, def.id, full).paid
        // a spent-anything state can only pay less; a fresh one pays the top of the range
        if (def.id !== 'neighbour') expect(paidTop, `${def.id} in ${chapter}`).toBe(top * 100)
        const low = settleActivity(state, def.id, { completed: true, score: 0, pay: 0 }).paid
        // the neighbour's thanks is seeded — money, a plate of food, or a favour owed — so its floor is nothing
        if (def.id === 'neighbour') {
          expect(low).toBeLessThanOrEqual(Math.round(b * max) * 100)
          continue
        }
        expect(low, `${def.id} floor in ${chapter}`).toBe(Math.round(b * min) > 0 ? Math.max(1, Math.round(b * min)) * 100 : 0)
      }
    }
  })

  it('never takes money away — whatever the result, in every chapter (no softlock can get worse)', () => {
    const results: ActivityResult[] = [
      full,
      { completed: true, score: 0 },
      { completed: false, score: 0 },
      { completed: true, score: 0.5, won: false },
      { completed: true, score: 1, won: true, pay: 0 },
    ]
    for (const def of ACTIVITIES) {
      for (const chapter of activityChapters(def)) {
        for (const result of results) {
          for (const event of settleActivity(lifeIn(chapter), def.id, result).events) {
            if (event.t === 'money.changed') expect(event.agorot, `${def.id} ${chapter}`).toBeGreaterThan(0)
            expect(event.t, `${def.id} ${chapter}`).not.toBe('savings.changed')
            expect(event.t, `${def.id} ${chapter}`).not.toBe('debt.changed')
          }
        }
      }
    }
  })

  it('leaves the tested 1984–86 economy exactly where it was', () => {
    for (const chapter of PLAYABLE.map((c) => c.id).filter(isStageA)) {
      for (const def of ACTIVITIES) {
        if (!activityChapters(def).includes(chapter)) continue
        const paid = settleActivity(lifeIn(chapter), def.id, full).paid
        if (def.id === 'kiosk-trivia') expect(paid, chapter).toBe(10 * 100) // Maor's two shekels, five answers
        else expect(paid, `${def.id} pays in Stage A`).toBe(0)
      }
      expect(activityCeiling(chapter), chapter).toBeLessThanOrEqual(10 * 100)
    }
  })

  it('pays at most one job or bet and one favour a chapter, in any order — and still plays after', () => {
    const chapters = [...new Set(ACTIVITIES.flatMap((def) => activityChapters(def)))].filter((c) => !isStageA(c))
    for (const chapter of chapters) {
      const here = ACTIVITIES.filter((def) => activityChapters(def).includes(chapter) && def.pay)
      for (let shuffle = 0; shuffle < 12; shuffle += 1) {
        const order = [...here].sort((a, b) => ((a.id.charCodeAt(shuffle % a.id.length) * 31 + shuffle) % 17) - ((b.id.charCodeAt(shuffle % b.id.length) * 31 + shuffle) % 17))
        let state = lifeIn(chapter)
        let work = 0
        let favour = 0
        for (const def of order) {
          // a job or a bet is refused at its door once the chapter's work is taken (the gig's own branch)
          if (def.slot === 'work' && state.flags[workDoneFlag(chapter)]) continue
          // the slip's handshake claims the day's work before the slip is played (the gig's own branch)
          if (def.claimsAtHandshake) state = { ...state, flags: { ...state.flags, [workDoneFlag(chapter)]: true } }
          const settled = settleActivity(state, def.id, full)
          if (settled.paid > 0 && def.slot === 'work') work += 1
          if (settled.paid > 0 && def.slot === 'favour') favour += 1
          state = settle(state, settled.events)
        }
        expect(work, `${chapter}: work`).toBeLessThanOrEqual(1)
        expect(favour, `${chapter}: favour`).toBeLessThanOrEqual(1)
        expect(state.agorot, chapter).toBeLessThanOrEqual(activityCeiling(chapter))
      }
    }
  })

  it('pays for an archive row once per life, and keeps playing it', () => {
    const def = ACTIVITY['cafe-shift']
    const [first, second] = activityChapters(def)
    const paidFirst = settleActivity(lifeIn(first!), 'cafe-shift', { ...full, contentId: 'm_row' })
    let state = settle(lifeIn(first!), paidFirst.events)
    state = { ...state, chapter: second!, year: YEAR(second!), flags: {} }
    const again = settleActivity(state, 'cafe-shift', { ...full, contentId: 'm_row' })
    expect(paidFirst.paid).toBeGreaterThan(0)
    expect(again.paid).toBe(0)
    expect(again.tier).toBe('high')
  })

  it('keeps a paid job in every chapter a boy can earn in (the rotation guarantee is untouched)', () => {
    const childhood = PLAYABLE.map((c) => c.id).slice(0, PLAYABLE.findIndex((c) => c.id === '2000-double') + 1)
    for (const chapter of childhood) {
      const eligible = GIGS.filter((gig) => isPaid(gig) && gig.rotates !== false && gigChapters(gig).includes(chapter))
      if (eligible.length === 0) continue
      for (let i = 0; i < 40; i += 1) expect(offeredIn(chapter, `seed-${i}`).size, chapter).toBeGreaterThan(0)
    }
  })

  it('never deals a friend’s dare or the bottles through the week’s rotation (rule 72)', () => {
    for (const gig of GIGS.filter((row) => row.rotates === false)) {
      for (const chapter of gigChapters(gig)) {
        for (let i = 0; i < 20; i += 1) expect(offeredIn(chapter, `seed-${i}`).has(gig.id)).toBe(false)
      }
    }
  })
})

describe('פעילויות — the save', () => {
  it('folds a completed activity into the life, and an old save folds to none', () => {
    const chapter = activityChapters(ACTIVITY['ticket-poll'])[0]!
    const settled = settleActivity(lifeIn(chapter), 'ticket-poll', { ...full, contentId: 'keeper', answer: 'p_0000000001' })
    const state = settle(lifeIn(chapter), settled.events)
    expect(state.activities['ticket-poll']?.runs).toBe(1)
    expect(state.activities['ticket-poll']?.answers.keeper).toBe('p_0000000001')
    expect(state.activities['ticket-poll']?.seen).toContain('keeper')
    expect(fold(IDENTITY, YEAR(chapter), []).activities).toEqual({})
    // an event this build has never met is a no-op, as the log promises (rule 39)
    const unknown = { t: 'activity.renamed', id: 'x' } as unknown as LifeEvent
    expect(apply(state, unknown)).toBe(state)
  })

  it('writes the tier the room reacts to, and walking away is its own tier', () => {
    expect(tierOf({ completed: false, score: 1 })).toBe('away')
    expect(tierOf({ completed: true, score: 0.8 })).toBe('high')
    expect(tierOf({ completed: true, score: 0.5 })).toBe('mid')
    expect(tierOf({ completed: true, score: 0.1 })).toBe('low')
    const chapter = activityChapters(ACTIVITY.parliament)[0]!
    const flags = settle(lifeIn(chapter), settleActivity(lifeIn(chapter), 'parliament', full).events).flags
    expect(flags['act:parliament:tier']).toBe('high')
  })
})

describe('פעילויות — what the room deals', () => {
  const catalog: MechanicCatalog = {
    items: {
      lineupQuiz: [
        { id: 'm_early', year: YEAR(PLAYABLE[0]!.id) },
        { id: 'm_late', year: YEAR(PLAYABLE[PLAYABLE.length - 1]!.id) + 1 },
      ],
      goalReconstruction: [{ id: 'goal:late', year: YEAR(PLAYABLE[PLAYABLE.length - 1]!.id) + 1 }],
      poll: [{ id: 'favourite', year: 0 }, { id: 'keeper', year: 0 }],
    },
    ready: { memoryChallenge: YEAR(PLAYABLE[0]!.id) },
  }

  it('never pins a row dated in or after the life’s own year (rules 45, 88)', () => {
    for (const id of ['cafe-shift', 'yard-lineup', 'parliament'] as ActivityId[]) {
      for (const chapter of activityChapters(ACTIVITY[id])) {
        const pick = pickContent(lifeIn(chapter), id, catalog)
        if (pick?.contentId) expect(pick.contentId, `${id} ${chapter}`).toBe('m_early')
        if (id === 'parliament') expect(pick, chapter).toBeNull()
      }
    }
  })

  it('asks the poll’s questions in order, once each, and then says the survey is over', () => {
    const chapter = activityChapters(ACTIVITY['ticket-poll'])[0]!
    let state = lifeIn(chapter)
    const asked: string[] = []
    for (let i = 0; i < 3; i += 1) {
      const pick = pickContent(state, 'ticket-poll', catalog)
      if (!pick) break
      asked.push(pick.contentId as string)
      state = settle(state, settleActivity(state, 'ticket-poll', { ...full, contentId: pick.contentId, answer: 'x' }).events)
    }
    expect(asked).toEqual(['favourite', 'keeper'])
    expect(pickContent(state, 'ticket-poll', catalog)).toBeNull()
  })

  it('cuts the old fan’s memories at the boy’s birth in the eighties, and at the year after', () => {
    const early = activityChapters(ACTIVITY['busstop-memory'])[0]!
    expect(windowFor(lifeIn(early), ACTIVITY['busstop-memory']).before).toBe(IDENTITY.birthYear)
    const later = activityChapters(ACTIVITY['busstop-memory']).find((c) => YEAR(c) >= YEAR('1990'))!
    expect(windowFor(lifeIn(later), ACTIVITY['busstop-memory']).before).toBe(YEAR(later))
  })

  it('pays no favour twice in a chapter, and the favour slot is its own flag', () => {
    const chapter = activityChapters(ACTIVITY['shachor-lesson'])[0]!
    const first = settleActivity(lifeIn(chapter), 'shachor-lesson', full)
    const state = settle(lifeIn(chapter), first.events)
    expect(state.flags[favourFlag(chapter)]).toBe(true)
    expect(settleActivity(state, 'parliament', full).paid).toBe(0)
  })

  it('plays a job that became an activity as the activity only from its own chapter', () => {
    expect(activityForGig('papers-round', 'a4-shirt')).toBeNull()
    expect(activityForGig('papers-round', '1990')?.id).toBe('papers')
    expect(activityForGig('shopping-neighbour', '1990')?.id).toBe('neighbour')
  })
})

describe('סיבוב העיתונים — a plan scored against the shortest way round', () => {
  const year = YEAR('1993-cup')

  it('deals the life\u2019s own doors, as many as the age carries, the same every time', () => {
    for (const level of ['child', 'teen', 'adult'] as const) {
      const stops = paperStops(year, level, 7)
      expect(stops).toHaveLength(PAPERS_STOPS[level])
      expect(new Set(stops.map((stop) => stop.id)).size).toBe(stops.length)
      expect(paperStops(year, level, 7)).toEqual(stops)
    }
  })

  it('scores the shortest round 1, any other round less, and a round that skips a door 0', () => {
    for (let seed = 1; seed < 30; seed += 1) {
      const stops = paperStops(year, 'teen', seed)
      const mine = routeScore(stops, stops)
      expect(mine).toBeGreaterThan(0)
      expect(mine).toBeLessThanOrEqual(1)
      expect(roundLength(stops)).toBeGreaterThanOrEqual(shortestRound(stops) - 1e-9)
      expect(routeScore(stops.slice(1), stops)).toBe(0)
    }
    const stops = paperStops(year, 'child', 3)
    // the reversed round is the same length — a round has no direction
    expect(routeScore([...stops].reverse(), stops)).toBeCloseTo(routeScore(stops, stops), 9)
  })
})

describe('מה שעוד לא קרה — a span printed from inside the life stops at the life\u2019s year', () => {
  it('prints a career that runs past the year as still running, and leaves a finished one alone', () => {
    const late = YEAR('1993-cup')
    expect(eraUpTo('מכבי ת״א · 1985—1996', late)).toBe('מכבי ת״א · 1985—')
    expect(eraUpTo('1971–1988', late)).toBe('1971–1988')
    expect(eraUpTo('בלי שנים', late)).toBe('בלי שנים')
  })
})

