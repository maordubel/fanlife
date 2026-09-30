import { describe, expect, it } from 'vitest'

import { apply, emptyState } from '@/lib/life/events'
import type { LifeState, PlayerIdentity } from '@/lib/life/types'
import { CHAPTERS } from '@/lib/life/content/chapters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { eraFor } from '@/lib/life/content/era'
import { SHIRT_PRICE } from '@/lib/life/content/chapterStageA'
import { STORY_CHORES, STORY_CHORE_PREFIX } from '@/lib/life/content/storyChores'
import { GIGS, gigChapters, gigPay, isPaid, offeredIn } from '@/lib/life/gigs'
import { ALL_SCENES, inEra } from '@/lib/life/world/scenes'

/**
 * הארנק ממשיך איתו — Maor, 16.9.2026:
 *
 *   "כל הקטע בארנק זה שהכסף צריך להישמר ולהמשיך עם הדמות. והוא מחליט מתי ואיפה ועל מה
 *    להוציא. הארנק לא מתאפס בסיום משימה אלא ממשיך איתך."
 *
 * Before that sentence both `day.entered` and `year.entered` wrote `agorot: 0`, one word
 * away from a comment claiming the transition "keeps the till" — which was true of
 * `savings`, the tin under the bed, and false of the pocket beside it in the same object.
 *
 * This is a DESIGN decision, so it is tested as one. A guard on a design decision does not
 * stop the design changing; it stops it changing by accident, in a refactor, at three in
 * the morning, in a file whose comment already says the opposite of what its code does.
 */
const PLAYABLE = CHAPTERS.filter((chapter) => chapter.playable !== false)
/** rule 45: a life suite never types a year — it reads the one `CHAPTERS` declares */
const YEAR = (id: string): number => CHAPTERS.find((chapter) => chapter.id === id)?.year ?? 0
const IDENTITY = { birthYear: (PLAYABLE[0]?.year ?? 0) - 6, nameHe: 'פוגי' } as unknown as PlayerIdentity

const withMoney = (agorot: number): LifeState => ({
  ...emptyState(IDENTITY, PLAYABLE[0]?.year ?? 0),
  agorot,
  savings: 1200,
  inventory: { bottle: 3 },
})

describe('הארנק', () => {
  it('שורד יום חדש', () => {
    const after = apply(withMoney(1850), {
      t: 'day.entered',
      dayId: 'a4-shirt',
      year: YEAR('a4-shirt'),
      weekday: 4,
      minute: 900,
    })
    expect(after.agorot).toBe(1850)
  })

  it('שורד מעבר שנים', () => {
    const after = apply(withMoney(2400), { t: 'year.entered', year: YEAR('1990'), weekday: 6, minute: 800 })
    expect(after.agorot).toBe(2400)
  })

  it('והפחית לא נוגעים בה בשני המקרים', () => {
    for (const event of [
      { t: 'day.entered', dayId: 'a5-first', year: YEAR('a5-first'), weekday: 6, minute: 780 } as const,
      { t: 'year.entered', year: YEAR('1996-army'), weekday: 6, minute: 780 } as const,
    ]) {
      expect(apply(withMoney(500), event).savings).toBe(1200)
    }
  })

  /**
   * ומה שכן מתאפס, ובכוונה. Bottles for deposit and a loaf of bread are an afternoon's
   * props, not possessions. What he OWNS survives by its own route — `own:` flags and
   * `clothing` — which is why a shirt bought in 1985 is still in the wardrobe in 2000.
   */
  it('החפצים של אחר הצהריים כן מתאפסים, והבגדים לא', () => {
    const before = { ...withMoney(700), clothing: ['shirt:1985'], flags: { 'own:shirt85': true } }
    const after = apply(before, { t: 'year.entered', year: YEAR('1991'), weekday: 1, minute: 480 })
    expect(after.inventory).toEqual({})
    expect(after.clothing).toContain('shirt:1985')
    expect(after.flags['own:shirt85']).toBe(true)
  })

  /**
   * ולמה זה לא ניואנס: **החולצה הייתה בלתי-אפשרית מתמטית.**
   *
   * `a4-shirt` is named after a thirty-shekel shirt and its whole afternoon — the tin,
   * the pocket money, the bottles, the boxes at Rafi's — yielded twenty-seven. With the
   * pocket emptied at every `day.entered` that was the entire budget, so `own:shirt85`
   * could not be raised by anybody, ever; and with it went the A6 echo that reads that
   * flag, the `tveria85` shirt in the wardrobe, and the chapter's own `shirt` ending.
   *
   * **The day this comment foresaw came on 25.9.2026.** The owner was told the afternoon
   * reaches 29 against the 30 and that the shirt therefore hangs on the week's street job,
   * and answered **"לאפשר להרוויח יותר."** So the afternoon was re-balanced in fiction —
   * Rafi's eight crates are all counted (`crates-85`, 5 → 8) and the run upstairs pays
   * from the favour slot (`favour:paid:a4-shirt`, 4 ₪) — and the assertion FLIPS rather than
   * disappears (rule 65): the afternoon alone now covers the shirt, with a little over, and
   * this test says by how much. The carried wallet (rule 68) is unchanged and still tested
   * above; it is no longer what makes the shirt possible.
   */
  it('הפרק לבדו מגיע למחיר החולצה ועוד קצת — מאור, 25.9.2026: "לאפשר להרוויח יותר."', () => {
    const effectsOf = (id: string) => {
      const out: Array<Record<string, unknown> & { e: string }> = []
      for (const branch of DIALOGUE[id]?.branches ?? []) {
        for (const effect of branch.then ?? []) out.push(effect as never)
        for (const choice of branch.choices ?? []) for (const effect of choice.then) out.push(effect as never)
      }
      return out
    }
    const roots: string[] = []
    for (const scene of ALL_SCENES) {
      for (const actor of scene.actors) if (inEra(actor, 'a4-shirt') && actor.talk) roots.push(actor.talk)
      for (const spot of scene.hotspots) {
        const act = (spot as { act?: string }).act
        if (inEra(spot, 'a4-shirt') && act) roots.push(act)
      }
    }
    const era = eraFor('a4-shirt') as { beats?: readonly unknown[] }
    const seen = new Set<string>()
    while (roots.length) {
      const id = roots.shift() as string
      if (seen.has(id) || !DIALOGUE[id]) continue
      seen.add(id)
      for (const effect of effectsOf(id)) if (effect.e === 'goto') roots.push(effect.node as string)
    }
    let pocket = 0
    for (const id of seen) {
      for (const effect of effectsOf(id)) {
        const agorot = effect.agorot as number
        if ((effect.e === 'money' || effect.e === 'withdraw') && agorot > 0) pocket += agorot
        // the crates are carried in the chore scene and paid from its own finish — counted at a full pile
        if (effect.e === 'minigame' && String(effect.id).startsWith(`chore:${STORY_CHORE_PREFIX}`)) {
          const chore = STORY_CHORES[String(effect.id).slice(`chore:${STORY_CHORE_PREFIX}`.length)]
          for (const event of chore?.finish(chore.shape.target, chore.shape.target) ?? []) {
            if (event.t === 'money.changed' && event.agorot > 0) pocket += event.agorot
          }
        }
      }
    }
    for (const beat of era.beats ?? []) {
      const actions = (beat as { do?: unknown }).do
      for (const action of Array.isArray(actions) ? actions : []) {
        const a = action as { a?: string; events?: readonly { t?: string; agorot?: number }[] }
        if (a.a !== 'events') continue
        for (const event of a.events ?? []) {
          if ((event.t === 'money.gained' || event.t === 'money.changed') && (event.agorot ?? 0) > 0) {
            pocket += event.agorot as number
          }
        }
      }
    }
    // 31 ₪ for a boy who does everything the afternoon offers: the tin (12), the pocket (2),
    // five bottles (5), eight crates (8), the run upstairs (4). Kobi's five are gone (delta
    // 93) — he pays for the shirt at the counter instead, and the thirty stays in the pocket.
    expect(pocket).toBeGreaterThanOrEqual(SHIRT_PRICE)
    expect(pocket).toBeLessThanOrEqual(SHIRT_PRICE + 1000)
    expect(pocket).toBe(3100)
  })

  /**
   * **ו"הכסף שחסכתי" חייב להיות דרך שקיימת, ולא רק שורה בקובץ הישגים.** (16.9.2026)
   *
   * `ACH_SHIRT_SELF` asks for a shirt bought with a wage and NO present — which means the
   * thirty has to be reachable without the five shekels his father takes out of his
   * pocket. That is one subtraction away from being impossible, and nothing checked it:
   * the achievement was written, marked as waiting for a ledger, and the ledger it was
   * waiting for turned out to be the easy half.
   *
   * The sum below is the ceiling in the shape rule 66 asks for — every positive line the
   * chapters up to and including `a4-shirt` can pay, minus the money that arrives beside a
   * `gift_received` proof (the ledger is what says which money is a present: no list of
   * conversation ids is kept here), plus the most a day's work can be worth in this
   * chapter. `lib/life/gigs.ts` guarantees at least one paid job is offered, so a route
   * exists.
   *
   * **וזה נמדד, ואז תוקן.** The first version of this test asserted only that the BEST
   * day's work closes the gap, and recorded in this comment that a week offering nothing
   * but the bottle round leaves the boy *a shekel short* — filed as the rotation working
   * as designed. It was not. A gig rotation is a week that plays differently; an
   * achievement named for the chapter it sits in, made unwinnable by which jobs the seed
   * dealt, is rule 66 in its purest form — a threshold above the reachable ceiling, on
   * some ceilings and not others, which is the version nobody ever notices.
   *
   * The fix cost the fiction two bottles: the alley batch went from three to five (`bottles-a4`
   * in `chapterStageA.ts`, and Rafi counts five). Nothing else moved — no wage, no price, no
   * rotation.
   *
   * **והמדד עצמו היה השאלה הקשה.** "The worst job in the pool" is the wrong bar and picking
   * it was instructive: the cheapest paid row in this chapter is `alley-coin`, which is a
   * WAGER — a shekel to enter, five if the coin lands — and a boy offered a coin toss has
   * not been offered work. "The best job in the pool" is the wrong bar in the other
   * direction, because no week offers the whole pool. `offeredIn` deals five of ten from
   * the save's own seed, so the honest number is the one below: across every week this game
   * can deal, the BEST paid offer in the thinnest of them. Rule 31's shape — sweep the
   * seeds, do not pick four by hand.
   */
  it('אפשר להגיע למחיר החולצה בלי החמישה שקל של אבא — אחרת "הכסף שחסכתי" הוא שורה מתה', () => {
    const CHAPTER = 'a4-shirt'
    const upToTheShirt = PLAYABLE.map((row) => row.id).slice(0, PLAYABLE.findIndex((row) => row.id === CHAPTER) + 1)

    /** every effect a conversation can run, each marked as present or not present */
    const linesOf = (id: string): Array<{ effect: Record<string, unknown> & { e: string }; present: boolean }> => {
      const out: Array<{ effect: Record<string, unknown> & { e: string }; present: boolean }> = []
      for (const branch of DIALOGUE[id]?.branches ?? []) {
        for (const effect of branch.then ?? []) out.push({ effect: effect as never, present: false })
        for (const choice of branch.choices ?? []) {
          // the ledger decides what a present is, not a list of ids kept in a test
          const present = choice.then.some((effect) => effect.e === 'proof' && effect.kind === 'gift_received')
          for (const effect of choice.then) out.push({ effect: effect as never, present })
        }
      }
      return out
    }

    const reachedIn = (chapter: string): Set<string> => {
      const roots: string[] = []
      for (const scene of ALL_SCENES) {
        for (const actor of scene.actors) if (inEra(actor, chapter) && actor.talk) roots.push(actor.talk)
        for (const spot of scene.hotspots) {
          const act = (spot as { act?: string }).act
          if (inEra(spot, chapter) && act) roots.push(act)
        }
      }
      const seen = new Set<string>()
      while (roots.length) {
        const id = roots.shift() as string
        if (seen.has(id) || !DIALOGUE[id]) continue
        seen.add(id)
        for (const { effect } of linesOf(id)) if (effect.e === 'goto') roots.push(effect.node as string)
      }
      return seen
    }

    let earned = 0
    for (const chapter of upToTheShirt) {
      for (const id of reachedIn(chapter)) {
        for (const { effect, present } of linesOf(id)) {
          const agorot = effect.agorot as number
          // (Director V3 §12, 25.9.2026) a job done with the hands pays from the chore's own
          // finish — counted at a full afternoon's work, the most the hands can bring in
          if (effect.e === 'minigame' && String(effect.id).startsWith(`chore:${STORY_CHORE_PREFIX}`)) {
            const chore = STORY_CHORES[String(effect.id).slice(`chore:${STORY_CHORE_PREFIX}`.length)]
            for (const event of chore?.finish(chore.shape.target, chore.shape.target) ?? []) {
              if (event.t === 'money.changed' && event.agorot > 0) earned += event.agorot
            }
            continue
          }
          if (present || (effect.e !== 'money' && effect.e !== 'withdraw') || !(agorot > 0)) continue
          earned += agorot
        }
      }
      for (const beat of (eraFor(chapter) as { beats?: readonly unknown[] }).beats ?? []) {
        const actions = (beat as { do?: unknown }).do
        for (const action of Array.isArray(actions) ? actions : []) {
          const a = action as { a?: string; events?: readonly { t?: string; agorot?: number }[] }
          if (a.a !== 'events') continue
          for (const event of a.events ?? []) {
            if ((event.t === 'money.gained' || event.t === 'money.changed') && (event.agorot ?? 0) > 0) {
              earned += event.agorot as number
            }
          }
        }
      }
    }

    const offered = GIGS.filter((gig) => isPaid(gig) && gigChapters(gig).includes(CHAPTER))
    expect(offered.length, 'a chapter with no paid work cannot be played by a boy who needs money').toBeGreaterThan(0)
    /** the best paid offer in the thinnest week the rotation can deal, over 400 seeds */
    let thinnestWeek = Infinity
    let thinnestSeed = ''
    for (let i = 0; i < 400; i += 1) {
      const seed = `wallet-sweep-${i}`
      const week = offeredIn(CHAPTER, seed)
      const best = Math.max(0, ...offered.filter((gig) => week.has(gig.id)).map((gig) => gigPay(gig, CHAPTER) * 100))
      if (best < thinnestWeek) {
        thinnestWeek = best
        thinnestSeed = seed
      }
    }

    // 25.9.2026 — "לאפשר להרוויח יותר.": since the eight crates and the run upstairs, the
    // afternoon covers the shirt WITHOUT the present and without the street job (34 ₪ with
    // A2's three; 31 on the day). The assertion flipped rather than vanished (rule 65); the
    // thinnest-week sweep below still holds so a poor rotation can never take the shirt away.
    expect(earned, 'the afternoon covers it on its own since 25.9.2026').toBeGreaterThanOrEqual(SHIRT_PRICE)
    expect(thinnestWeek, 'every week has to offer some paid work').toBeGreaterThan(0)
    expect(
      earned + thinnestWeek,
      `seed ${thinnestSeed} deals the thinnest week in this chapter, and it still has to reach the shirt`,
    ).toBeGreaterThanOrEqual(SHIRT_PRICE)
  })
})
