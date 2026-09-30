import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  ACHIEVEMENTS,
  ACHIEVEMENT_IDS,
  ACH_FLAG_PREFIX,
  REWARD_KINDS,
  SHOW_ITEMS,
  SHOW_MEMORIES,
  achievementEvents,
  achievementFlag,
  achievementFor,
  earnedIds,
  earnedNow,
  isRecorded,
  phrasingsFor,
  reachable,
  recordedIds,
  routeApexFlag,
  showEvents,
  waiting,
} from '@/lib/life/achievements'
import { CHAPTERS } from '@/lib/life/content/chapters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { shirtFlag, wornFlag } from '@/lib/life/shirts'
import { LIFE_ROUTES, hasStage, stageFlag, type RouteId } from '@/lib/life/routes'
import { apply, emptyState, fold, type LifeEvent } from '@/lib/life/events'
import { MESSAGES } from '@/lib/i18n'
import type { LifeState, ProofRecord, RedBoxItem } from '@/lib/life/types'

/**
 * שלושים ההישגים — and the three sentences they all have to survive.
 *
 * The life spec opens the section with them and every describe below is one of them
 * turned into a question a test can ask:
 *
 *  1. *"הישג הוא זיהוי של משהו שעשית. הפרס הוא חפץ, זיכרון, גישה, תפקיד או תגובה
 *     בעולם."* — so every row names a reward, and all five kinds the spec lists appear.
 *  2. *"אין תשלום כפול בנקודות."* — so nothing in the layer carries a score, and nothing
 *     in it reads or writes the one counter rule 46 gives a single owner.
 *  3. *"אין פרס על שיתוף לרשת חברתית."* — so no row's condition can be satisfied by
 *     sharing, and the show says out loud that the picture is optional.
 *
 * Plus the one this project asks of anything it ships: **a row nothing can trigger is
 * dead content unless it is knowingly waiting for a chapter** (rule 66). `waitingHe` is
 * how a row says which it is, and this file fails if a row is neither reachable nor
 * honest about why not.
 *
 * Rule 45: no year is typed here. Every one comes out of `CHAPTERS`.
 */

const IDENTITY = { name: 'פוגי', sex: 'boy' as const, birthYear: 1978 }

/** the chapter registry is the only place a year lives (rule 45) */
const chapter = (id: string) => CHAPTERS.find((row) => row.id === id) ?? null
const SHIRT_CHAPTER = chapter('a4-shirt')
const LAST = CHAPTERS.find((row) => row.unit.toUpperCase() === 'B11B')
const YEAR = chapter('1986')?.year ?? CHAPTERS[0]!.year

const blank = (): LifeState => emptyState(IDENTITY, YEAR)

const run = (events: readonly LifeEvent[], from: LifeState = blank()): LifeState =>
  events.reduce((state, event) => apply(state, event), from)

const withFlags = (flags: Record<string, boolean | string | number>, over: Partial<LifeState> = {}): LifeState => {
  const base = blank()
  return { ...base, ...over, flags: { ...base.flags, ...flags } as LifeState['flags'] }
}

const proof = (kind: string, over: Partial<ProofRecord> = {}): ProofRecord => ({
  kind,
  proofId: `${kind}-1`,
  chapter: '1986',
  year: YEAR,
  ...over,
})

const withProofs = (proofs: ProofRecord[], over: Partial<LifeState> = {}): LifeState => ({
  ...blank(),
  ...over,
  proofs,
})

// ---------------------------------------------------------------------------------

describe('שלושים, ולכל אחד פרס', () => {
  /**
   * שלושים של המפרט, ועוד שישה של תסריט ההמשך (21.9.2026).
   *
   * הבדיקה ספרה **30** כי זה מה שמפרט החיים 1983–2026 הגדיר. תסריט ההמשך הוסיף שישה
   * בשמם — שלושה סיומים של `F04`, הראיון של `J03`, ושניים מענף הבעלות — ולכן המספר
   * הוא 36. הוא לא הוחלף ב-`.length > 0`: מספר מוקלד הוא מה שמפיל את הבדיקה כשמישהו
   * מוסיף שורה בלי לומר על מה (וזה בדיוק מה שקרה עכשיו, כמתוכנן).
   *
   * `keys_in_hand` מופיע פעמיים בתסריט — בשתי בחירות של `O04` — וזה **הישג אחד**.
   * לכן שש ולא שבע, וה-`Set` למטה הוא מה ששומר על זה.
   */
  it('holds the thirty the spec defines plus the six the screenplay added, each id once', () => {
    expect(ACHIEVEMENTS).toHaveLength(36)
    expect(new Set(ACHIEVEMENT_IDS).size).toBe(36)
    for (const id of ACHIEVEMENT_IDS) expect(id, id).toMatch(/^ACH_[A-Z_]+$/)
    for (const id of ['ACH_FORTY_YEARS', 'ACH_THREE_GENERATIONS', 'ACH_REUNION_EUROPE', 'ACH_ASKED', 'ACH_NOT_AT_ANY_PRICE', 'ACH_KEYS']) {
      expect(ACHIEVEMENT_IDS, id).toContain(id)
    }
  })

  it('gives every one a Hebrew name, a reward and a note a writer can build a scene from', () => {
    for (const row of ACHIEVEMENTS) {
      expect(row.titleHe.trim(), row.id).not.toBe('')
      expect(row.reward.titleHe.trim(), row.id).not.toBe('')
      expect(row.reward.noteHe.trim().length, row.id).toBeGreaterThan(20)
      expect(REWARD_KINDS, row.id).toContain(row.reward.kind)
    }
  })

  /**
   * *"חמישה סוגי פרס שחייבים להופיע בתסריט."* The spec lists them and says all five must
   * appear. A closed union plus this is what turns that sentence into something enforced.
   */
  it('uses all five kinds of reward, because the spec requires all five to appear', () => {
    const used = new Set(ACHIEVEMENTS.map((row) => row.reward.kind))
    for (const kind of REWARD_KINDS) expect(used, kind).toContain(kind)
  })

  it('answers for an id it knows and refuses one it does not', () => {
    expect(achievementFor('ACH_FIRST')?.titleHe).toBe('היד הראשונה')
    expect(achievementFor('ACH_NOT_A_THING')).toBeNull()
  })
})

describe('אין תשלום כפול — no score, anywhere in the layer', () => {
  const SOURCE = readFileSync(join(__dirname, '..', 'lib', 'life', 'achievements.ts'), 'utf8')

  it('prints no number, no percentage and no progress anywhere in its content', () => {
    const text = ACHIEVEMENTS.map((row) => `${row.titleHe} ${row.reward.titleHe} ${row.reward.noteHe}`).join(' ')
    for (const banned of ['ניקוד', 'נקודות', 'דירוג', '%']) {
      expect(text.includes(banned), `an achievement says "${banned}"`).toBe(false)
    }
    // "3 מתוך 30" and "3/30" are the same claim in two shapes, and both are a single score
    expect(/\d+\s*מתוך\s*\d+/.test(text)).toBe(false)
    expect(/\d+\s*\/\s*\d+/.test(text)).toBe(false)
  })

  /**
   * כלל 46 — PURE HAPOEL LOVE has one owner and this layer is not it. An achievement that
   * read it would immediately become a measure of who is a worthy supporter, which is the
   * exact thing that counter is locked against.
   */
  it('never reaches for the one counter rule 46 gives a single owner', () => {
    // The module is allowed to NAME the rule in a comment — that is how the next person
    // learns why it is not here. What it may not do is import it or read it off a state.
    expect(SOURCE.includes("from './pure-love'")).toBe(false)
    expect(SOURCE.includes('resolvePureLove')).toBe(false)
    expect(/\.\s*pureLove/.test(SOURCE)).toBe(false)
    expect(/\.\s*redHeart/.test(SOURCE)).toBe(false)
  })

  it('cannot be satisfied by sharing — no row reads a share flag', () => {
    expect(SOURCE.includes('shareHref')).toBe(false)
    expect(SOURCE.includes('shared:')).toBe(false)
  })
})

describe('תנאי הוא שאלה על החיים, ולא ווו בתסריט', () => {
  it('earns nothing at all on a life that has not happened yet', () => {
    expect(earnedIds(blank())).toEqual([])
  })

  it('never throws on any shape of state, which is what lets a card be shown mid-frame', () => {
    for (const row of ACHIEVEMENTS) expect(() => row.earned(blank()), row.id).not.toThrow()
  })

  /**
   * כלל 11 — ACH_FIRST fires on 1.6.1983, which is a real match in the archive, and the
   * only thing the row asserts about it is that his father had the tickets. `own:tickets-1983`
   * is written as a VALUE by the prologue for exactly this kind of question.
   */
  it('gives the first hand to a boy the prologue carried in, and to nobody else', () => {
    const carried = withFlags({ 'prologue:done': true, 'own:tickets-1983': 'kobi' })
    expect(earnedIds(carried)).toContain('ACH_FIRST')
    // the same afternoon with nobody named holding the tickets is not the same claim
    expect(earnedIds(withFlags({ 'prologue:done': true }))).not.toContain('ACH_FIRST')
  })

  it('reads the errand and the bread as one kept promise', () => {
    expect(earnedIds(withFlags({ 'a2:errand': true, 'a2:bread': true }))).toContain('ACH_BREAD')
    expect(earnedIds(withFlags({ 'a2:errand': true }))).not.toContain('ACH_BREAD')
  })

  it('accepts an hour of crates as the wage in the shirt', () => {
    expect(earnedIds(withFlags({ 'own:shirt85': true, 'a4:worked': true }))).toContain('ACH_SHIRT_WORK')
  })

  /**
   * המתנה — ולמה `a4:kobi` לבדו אינו ראיה לה.
   *
   * The flag was raised by both branches of the conversation with the father, so an
   * achievement that read it would hand "the first present" to a boy who refused one.
   * `kobi-a4` now raises `a4:kobi-gave` only where the five shekels change hands, and the
   * two halves of that are asserted together: a life that took the money earns it, and a
   * life that only TALKED to his father does not.
   */
  it('gives the first present only to the branch that took the five shekels', () => {
    expect(earnedIds(withFlags({ 'own:shirt85': true, 'a4:kobi-gave': true }))).toContain('ACH_SHIRT_GIFT')
    expect(earnedIds(withFlags({ 'own:shirt85': true, 'a4:kobi': true }))).not.toContain('ACH_SHIRT_GIFT')
    expect(earnedIds(withProofs([proof('first_shirt_bought'), proof('gift_received')]))).toContain('ACH_SHIRT_GIFT')
    // delta 93: the gift is the shirt itself, at the counter
    expect(earnedIds(withFlags({ 'own:shirt85': true, 'a4:kobi-gifted-shirt': true }))).toContain('ACH_SHIRT_GIFT')
    expect(earnedIds(withFlags({ 'own:shirt85': true, 'a4:kobi-knows': true }))).not.toContain('ACH_SHIRT_GIFT')
  })

  /**
   * ומה שעושה את שתי השורות האלה חיות הוא הפנקס, לא הפרדיקט.
   *
   * Both rows carried a `waitingHe` for one reason: the afternoon recorded no evidence at
   * all, so `first_shirt_bought`, `paid_shift` and `gift_received` were kinds nothing in
   * the game ever wrote. This reads the CONTENT — a predicate that can be satisfied only
   * by a test fixture is exactly the dead content rule 66 is about — and it is deliberately
   * a scan of the conversations rather than a list of ids, so the next person who moves the
   * purchase to another counter finds out here.
   */
  it('records the three kinds of evidence in the afternoon itself, not only in a fixture', () => {
    const kindsIn = (id: string): string[] => {
      const out: string[] = []
      for (const branch of DIALOGUE[id]?.branches ?? []) {
        for (const effect of [...(branch.then ?? []), ...(branch.choices ?? []).flatMap((choice) => choice.then)]) {
          if (effect.e === 'proof') out.push(effect.kind)
        }
      }
      return out
    }
    expect(kindsIn('rafi-a4'), 'the hour of crates').toContain('paid_shift')
    // (delta 93) the thirty reaches the counter, and the father pays: two ledger lines, two places
    expect(kindsIn('rafi-a4-counter'), 'the thirty on the counter').toContain('first_shirt_bought')
    expect(kindsIn('kobi-shirt-gift-a4'), 'the shirt from his father').toContain('gift_received')
    // and the talk at home records nothing and hands over nothing any more
    expect(kindsIn('kobi-a4')).toEqual([])
    const home = DIALOGUE['kobi-a4']?.branches.flatMap((branch) => [...(branch.then ?? []), ...(branch.choices ?? []).flatMap((choice) => choice.then)]) ?? []
    expect(home.some((effect) => effect.e === 'money' || (effect.e === 'flag' && effect.flag === 'a4:kobi-gave'))).toBe(false)
  })

  /**
   * הראיה השלילית. `a4:worked` proves a wage; NOTHING in the save proves the ABSENCE of
   * the five shekels from his father, so ACH_SHIRT_SELF may not be handed out on "we did
   * not see a gift". A missing achievement is a gap; a wrong one is a lie.
   */
  it('refuses the self-funded shirt on the absence of evidence', () => {
    expect(earnedIds(withFlags({ 'own:shirt85': true, 'a4:worked': true }))).not.toContain('ACH_SHIRT_SELF')
    const ledger = withProofs([proof('first_shirt_bought'), proof('paid_shift')])
    expect(earnedIds(ledger)).toContain('ACH_SHIRT_SELF')
    const withGift = withProofs([proof('first_shirt_bought'), proof('paid_shift'), proof('gift_received')])
    expect(earnedIds(withGift)).not.toContain('ACH_SHIRT_SELF')
    // delta 93: the shirt his father bought is not money — the thirty he saved is still his
    const shirtGift = withProofs([proof('first_shirt_bought'), proof('paid_shift'), proof('gift_received', { proofId: 'first_shirt_gift:a4-shirt' })])
    expect(earnedIds(shirtGift)).toContain('ACH_SHIRT_SELF')
  })

  it('counts the radio only when the repair was carried through', () => {
    expect(earnedIds(withFlags({ 'a6:end-liron': true }))).toContain('ACH_RADIO')
    expect(earnedIds(withFlags({ 'a6:radio-dead': true }))).not.toContain('ACH_RADIO')
  })

  it('needs both houses for the double page, and two different evenings', () => {
    const ground = { ...blank(), presence: { '1986': 'inside' as const } }
    expect(earnedIds(ground)).not.toContain('ACH_TWO_HOMES')
    const both = { ...ground, flags: { ...ground.flags, 'life:seen:ussishkin': true } }
    expect(earnedIds(both)).toContain('ACH_TWO_HOMES')
  })

  it('needs a ticket that was actually bought AND an arrival, for the first road', () => {
    expect(earnedIds(withFlags({ 'went:galil-bus': true }))).not.toContain('ACH_FIRST_AWAY')
    expect(earnedIds(withFlags({ 'went:galil-bus': true, 'life:galil:there': true }))).toContain('ACH_FIRST_AWAY')
  })

  it('wants four promises across two chapters, and will not take four in one', () => {
    const oneChapter = withProofs([
      proof('promise_kept', { proofId: 'p1' }),
      proof('promise_kept', { proofId: 'p2' }),
      proof('promise_kept', { proofId: 'p3' }),
      proof('promise_kept', { proofId: 'p4' }),
    ])
    expect(earnedIds(oneChapter)).not.toContain('ACH_RELIABLE')
    const two = withProofs([
      proof('promise_kept', { proofId: 'p1' }),
      proof('promise_kept', { proofId: 'p2' }),
      proof('promise_kept', { proofId: 'p3', chapter: '1990' }),
      proof('promise_kept', { proofId: 'p4', chapter: '1990' }),
    ])
    expect(earnedIds(two)).toContain('ACH_RELIABLE')
  })

  it('joins two proofs by their subject, not by their existence', () => {
    const apart = withProofs([
      proof('ticket_shared', { proofId: 't1', subjectHe: 'אופיר' }),
      proof('ticket_used', { proofId: 'u1', subjectHe: 'עמית' }),
    ])
    expect(earnedIds(apart)).not.toContain('ACH_GAVE')
    const same = withProofs([
      proof('ticket_shared', { proofId: 't1', subjectHe: 'אופיר' }),
      proof('ticket_used', { proofId: 'u1', subjectHe: 'אופיר' }),
    ])
    expect(earnedIds(same)).toContain('ACH_GAVE')
  })

  it('wants TWO non-identical sources behind one report before it calls it verified', () => {
    const one = withProofs([
      proof('verified_report', { proofId: 'v1', subjectHe: 'המעבר' }),
      proof('written_account', { proofId: 'w1', subjectHe: 'המעבר' }),
    ])
    expect(earnedIds(one)).not.toContain('ACH_VERIFY')
    const two = withProofs([
      proof('verified_report', { proofId: 'v1', subjectHe: 'המעבר' }),
      proof('verified_report', { proofId: 'v2', subjectHe: 'המעבר' }),
      proof('written_account', { proofId: 'w1', subjectHe: 'המעבר' }),
    ])
    expect(earnedIds(two)).toContain('ACH_VERIFY')
  })

  it('carries an object through three period transitions, counted on the chapter spine', () => {
    const kept: RedBoxItem = {
      id: 'k1',
      year: SHIRT_CHAPTER?.year ?? CHAPTERS[0]!.year,
      atMinute: 0,
      sourceEventId: 'e1',
      titleHe: 'חצי כרטיס',
      item: 'ticket-stub',
      rarity: 'rare',
    }
    // two chapters on is not three, however long the afternoon felt
    const soon = { ...blank(), redBox: [kept], chapter: 'a6-radio' }
    expect(earnedIds(soon)).not.toContain('ACH_KEEP_ITEM')
    const later = { ...blank(), redBox: [kept], chapter: '1993-cup' }
    expect(earnedIds(later)).toContain('ACH_KEEP_ITEM')
  })

  /**
   * אותה שאלה, דרך הארון — and the point is that no field was added to answer it.
   *
   * `state.clothing` is a list of ids with no acquisition year, which is what used to make
   * this row Red-Box-only. It did not need one: `own:worn:<id>:<chapter>` is written the
   * evening the shirt goes on, survives every year turn, and is therefore already a record
   * of when he HAD it. The three cases below are the whole claim — worn long ago and still
   * owned earns it; worn recently does not; and owning a shirt he has never once worn
   * proves nothing at all about when it arrived.
   */
  it('counts a shirt he wore three chapters ago and still has, without storing a year', () => {
    const wardrobe = (flags: Record<string, boolean>, chapter: string): LifeState => {
      const base = blank()
      return { ...base, chapter, flags: { ...base.flags, ...flags } as LifeState['flags'] }
    }
    const bought = { [shirtFlag('tveria85')]: true, [wornFlag('tveria85', 'a4-shirt')]: true }
    expect(earnedIds(wardrobe(bought, '1993-cup'))).toContain('ACH_KEEP_ITEM')
    expect(earnedIds(wardrobe(bought, 'a6-radio'))).not.toContain('ACH_KEEP_ITEM')
    expect(earnedIds(wardrobe({ [shirtFlag('tveria85')]: true }, '1993-cup'))).not.toContain('ACH_KEEP_ITEM')
  })

  it('closes the era on the chapter the registry calls B11B, never on a year typed here', () => {
    expect(LAST, 'the registry no longer has a B11B chapter').toBeTruthy()
    const done = { ...blank(), chapter: LAST!.id, chapterDone: true }
    expect(earnedIds(done)).toContain('ACH_FIRST_ERA')
    expect(earnedIds({ ...done, chapterDone: false })).not.toContain('ACH_FIRST_ERA')
  })
})

describe('שישה מסלולים, ודגל אחד מוסכם', () => {
  const ROUTES: Array<[string, string]> = [
    ['ACH_LEAD', 'ULTRAS'],
    ['ACH_JOURNALIST', 'JOURNALIST'],
    ['ACH_OWNER', 'OWNER'],
    ['ACH_ARTIST', 'CREATOR'],
    ['ACH_FOUNDER', 'USSISHKIN_FOUNDER'],
    ['ACH_ROADS', 'TRAVELLER'],
  ]

  it('names the flag shape both sides agreed on', () => {
    expect(routeApexFlag('ULTRAS')).toBe('own:route:ULTRAS:apex')
    // `own:` is load-bearing: an apex accepted in 1996 has to still be true in 2000
    expect(routeApexFlag('ULTRAS').startsWith('own:')).toBe(true)
  })

  /**
   * ההצלבה, ולא ההבטחה.
   *
   * The six route achievements were written against an AGREED flag while `routes.ts` was
   * still being built beside them, which is the right way round — an achievement that
   * reached into a route's internals would break the next time that file was refactored.
   * But an agreement nobody checks is a comment. This is the check: the TEST imports the
   * routes module (the module under test still does not), and the two definitions of the
   * apex flag have to be the same string for every one of the six.
   */
  it('agrees with lib/life/routes.ts on the apex flag, for all six', () => {
    for (const [, route] of ROUTES) {
      expect(routeApexFlag(route), route).toBe(stageFlag(route as RouteId, 'apex'))
      expect(hasStage({ ...blank(), flags: { [routeApexFlag(route)]: true } }, route as RouteId, 'apex')).toBe(true)
    }
    expect(LIFE_ROUTES.map((route) => route.id).sort()).toEqual(ROUTES.map(([, route]) => route).sort())
  })

  it('does not import the routes module — the flag is the seam', () => {
    const source = readFileSync(join(__dirname, '..', 'lib', 'life', 'achievements.ts'), 'utf8')
    expect(source.includes("from './routes'")).toBe(false)
    expect(source.includes("from './content/routes'")).toBe(false)
  })

  it('fires each of the six on its own apex, and on nobody else’s', () => {
    for (const [id, route] of ROUTES) {
      const state = withFlags({ [routeApexFlag(route)]: true })
      const earned = earnedIds(state)
      if (id === 'ACH_LEAD' || id === 'ACH_JOURNALIST' || id === 'ACH_ROADS') {
        expect(earned, `${id} does not fire on ${route}`).toContain(id)
      }
      for (const [other] of ROUTES) {
        if (other === id) continue
        expect(earned, `${route} fired ${other}`).not.toContain(other)
      }
    }
  })

  it('asks the three with a second condition for that second condition too', () => {
    expect(earnedIds(withFlags({ [routeApexFlag('OWNER')]: true }))).not.toContain('ACH_OWNER')
    expect(
      earnedIds(withProofs([proof('ownership_contract')], { flags: { [routeApexFlag('OWNER')]: true } })),
    ).toContain('ACH_OWNER')

    expect(earnedIds(withFlags({ [routeApexFlag('CREATOR')]: true }))).not.toContain('ACH_ARTIST')
    expect(
      earnedIds(withProofs([proof('creation_proof')], { flags: { [routeApexFlag('CREATOR')]: true } })),
    ).toContain('ACH_ARTIST')

    const twoOfThree = withProofs(
      [proof('founder_contribution', { proofId: 'f1' }), proof('founder_contribution', { proofId: 'f2' })],
      { flags: { [routeApexFlag('USSISHKIN_FOUNDER')]: true } },
    )
    expect(earnedIds(twoOfThree)).not.toContain('ACH_FOUNDER')
    const three = withProofs(
      [
        proof('founder_contribution', { proofId: 'f1' }),
        proof('founder_contribution', { proofId: 'f2' }),
        proof('founder_contribution', { proofId: 'f3' }),
      ],
      { flags: { [routeApexFlag('USSISHKIN_FOUNDER')]: true } },
    )
    expect(earnedIds(three)).toContain('ACH_FOUNDER')
  })
})

describe('זכייה היא אירוע, לא סקירה', () => {
  it('fires the moment the condition turns true, and names what turned', () => {
    const before = withFlags({ 'a2:errand': true })
    const after = withFlags({ 'a2:errand': true, 'a2:bread': true })
    expect(earnedNow(before, after).map((row) => row.id)).toEqual(['ACH_BREAD'])
  })

  it('never fires twice for one life, even when the whole log is folded again', () => {
    const after = withFlags({ 'a2:errand': true, 'a2:bread': true })
    const events = achievementEvents(earnedNow(withFlags({ 'a2:errand': true }), after), after)
    const recorded = run(events, after)
    expect(isRecorded(recorded, 'ACH_BREAD')).toBe(true)
    expect(earnedNow(after, recorded)).toEqual([])
    // and re-deriving from a state where it was already true announces nothing
    expect(earnedNow(recorded, recorded)).toEqual([])
  })

  it('writes the record under a prefix a year does not erase', () => {
    // The literal is pinned because the reducer's own patch spells it out rather than
    // importing it — `events.ts` cannot depend on this layer.
    expect(ACH_FLAG_PREFIX).toBe('own:ach:')
    expect(achievementFlag('ACH_BREAD')).toBe('own:ach:ACH_BREAD')

    const next = CHAPTERS.find((row) => row.id === '1990')
    const life = fold(IDENTITY, YEAR, [
      { t: 'life.started', identity: IDENTITY, year: YEAR, weekday: 6, minute: 0 },
      { t: 'flag.set', flag: achievementFlag('ACH_BREAD'), value: YEAR },
      { t: 'day.entered', dayId: 'a3', year: YEAR, weekday: 6, minute: 600 },
      { t: 'year.entered', year: next?.year ?? YEAR, weekday: next?.weekday ?? 6, minute: 600 },
    ])
    expect(isRecorded(life, 'ACH_BREAD'), 'recognition does not expire when a year turns').toBe(true)
    expect(recordedIds(life)).toEqual(['ACH_BREAD'])
  })

  /**
   * The OUTCOME is asserted, not the event's shape: `achievementEvents` writes `flag.set`
   * today and will write `achievement.earned` the moment the reducer's patch lands, and
   * that is a narrowing of how, never of what. A test that pinned `t` would turn a
   * one-line patch into a two-file one for no gain.
   */
  it('carries the year, so a card can say when without the layer holding a clock', () => {
    const after = withFlags({ 'a2:errand': true, 'a2:bread': true })
    const recorded = run(achievementEvents(earnedNow(blank(), after), after), after)
    expect(isRecorded(recorded, 'ACH_BREAD')).toBe(true)
    expect(recorded.flags[achievementFlag('ACH_BREAD')]).toBe(after.year)
  })
})

describe('השואו האישי — מה שהוא בחר, ולא מה שהמשחק ספר', () => {
  it('needs three things and two days before it is a show', () => {
    const partial = run(showEvents({ items: ['a', 'b'], memories: ['x', 'y'], lineHe: 'הייתי שם.' }))
    expect(earnedIds(partial)).not.toContain('ACH_SHOW')
    const full = run(showEvents({ items: ['a', 'b', 'c'], memories: ['x', 'y'], lineHe: 'הייתי שם.' }))
    expect(earnedIds(full)).toContain('ACH_SHOW')
    expect(SHOW_ITEMS).toBe(3)
    expect(SHOW_MEMORIES).toBe(2)
  })

  /**
   * *"זיכרון מאירוע שהחמצת יכול להיות ׳אופיר סיפר לי׳, ולא ׳הייתי שם׳."* The phrasings are
   * generated from the save for exactly this reason: the player is the author of the
   * sentence, and the save is what decides which sentences he is allowed to author.
   */
  it('offers only sentences the life can stand behind', () => {
    const heard = phrasingsFor(blank(), {
      items: [],
      memories: [{ id: '1986', titleHe: 'הגביע', mode: 'radio', wasThere: false }],
    })
    expect(heard).toEqual(['את הגביע שמעתי מהסלון.'])
    expect(heard.join(' ')).not.toContain('הייתי שם')

    const missed = phrasingsFor(blank(), {
      items: [],
      memories: [{ id: '1990', titleHe: 'העלייה', mode: null, wasThere: false }],
    })
    expect(missed).toEqual(['העלייה — לא הייתי שם.'])
  })

  it('offers the spec’s own second example when the save holds it', () => {
    const state = withProofs([proof('ticket_shared', { subjectHe: 'אופיר' })])
    expect(phrasingsFor(state, { items: [], memories: [] })).toContain('הכרטיס שלי הגיע לאופיר.')
  })

  it('writes only existing event types — nothing here invents a row in the log', () => {
    for (const event of showEvents({ items: ['a'], memories: ['x'], lineHe: 'כן.' })) {
      expect(event.t).toBe('flag.set')
    }
  })
})

/**
 * ביקורת הישגוּת — the same question rule 66 asks of a threshold, asked of a reward.
 *
 * A row nothing in the game can trigger is dead content. A row that says WHY it cannot be
 * triggered yet is a chapter's worth of work, written down where the person who writes
 * that chapter will find it. This describe is the difference between the two.
 */
describe('מה אפשר להשיג היום, ומה ממתין לפרק', () => {
  it('has every row either reachable or honest about why it is not', () => {
    for (const row of ACHIEVEMENTS) {
      if (row.waitingHe === null) continue
      expect(row.waitingHe.trim().length, `${row.id} waits without saying why`).toBeGreaterThan(30)
    }
    expect(waiting().length + reachable().length).toBe(ACHIEVEMENTS.length)
  })

  /**
   * ...וארבע מתוך השש **הפסיקו להמתין** ב-21.9.2026.
   *
   * הבדיקה נכתבה כששש פסגות המסלולים היו סגורות, וקראה לזה "routes.ts is not wired
   * yet" — שכבר לא היה מדויק מאז שהמסלולים חוברו, ונהיה שגוי לגמרי כשנבנו
   * `2002-europe` ו-`2006-home`: תקרת הגיל עלתה מ-22 ל-28 וארבעה קירות נפלו לבד.
   *
   * השומר לא נמחק ולא רוכך — הוא **התהפך ונהיה צר יותר**: שניים ממתינים ובשמם,
   * `ACH_OWNER` (פסגה בגיל 30, וענף הבעלות הוא 2025 בתסריט) ו-`ACH_FOUNDER` (חלון
   * 2007, שזה משפט אחר לגמרי — כלל 71), וארבעת האחרים **חייבים לשתוק**. משפט המתנה
   * על הישג פתוח הוא שקר לשחקן.
   */
  it('leaves only the two route achievements that really are still shut, and by name', () => {
    for (const id of ['ACH_OWNER', 'ACH_FOUNDER']) {
      expect(achievementFor(id)?.waitingHe, id).toBeTruthy()
    }
    for (const id of ['ACH_LEAD', 'ACH_JOURNALIST', 'ACH_ARTIST', 'ACH_ROADS']) {
      expect(achievementFor(id)?.waitingHe, `${id} is reachable since 2006 and still claims it waits`).toBeNull()
    }
  })

  it('leaves the rows past the year the game ends in waiting, and says so', () => {
    for (const id of ['ACH_TEN_AWAY', 'ACH_RETURN', 'ACH_KOBI']) {
      expect(achievementFor(id)?.waitingHe, id).toBeTruthy()
    }
  })

  it('still leaves a real set a life played today can reach', () => {
    const ids = reachable().map((row) => row.id)
    expect(ids.length).toBeGreaterThanOrEqual(9)
    for (const id of ['ACH_FIRST', 'ACH_BREAD', 'ACH_RADIO', 'ACH_FIRST_AWAY', 'ACH_FIRST_ERA']) {
      expect(ids, id).toContain(id)
    }
  })
})

/**
 * המפתחות — the guard that replaces the one the runtime-key pattern steps around.
 *
 * `tests/i18n.test.ts` resolves LITERAL `t('…')` keys, and rule 32 is explicit that a key
 * built at runtime cannot be checked statically and is not pretended to be. The two
 * screens in this feature build their keys from one prefix (the same shape
 * `uss.cat.${card.cat}` already uses), so the static resolver cannot see them — and a
 * guard that is bypassed has to be replaced, not dropped. This reads the two components,
 * extracts every key they can ask for, and resolves it.
 *
 * **It is RED until the delivered key map is merged into `messages/he.life.json`**, which
 * is where every `life.*` string lives since the catalogue was split. It names exactly
 * which keys are missing when it fails, which is the whole reason it exists.
 */
describe('כל מפתח שהמסכים מבקשים — קיים', () => {
  const catalogue = MESSAGES
  const read = (path: string) => readFileSync(join(__dirname, '..', 'components', 'life', path), 'utf8')

  function keysIn(source: string, call: string, prefix: string): string[] {
    const found = new Set<string>()
    for (const match of source.matchAll(new RegExp(`\\b${call}\\('([a-zA-Z0-9_]+)'\\)`, 'g'))) {
      found.add(`${prefix}.${match[1] as string}`)
    }
    return [...found]
  }

  it('finds the keys at all — a scan that matches nothing proves nothing', () => {
    expect(keysIn(read('AchievementCard.tsx'), 'ach', 'life.ach').length).toBeGreaterThan(0)
    expect(keysIn(read('LifeShow.tsx'), 'show', 'life.show').length).toBeGreaterThan(0)
  })

  it('resolves every one of them in the catalogue', () => {
    const wanted = [
      ...keysIn(read('AchievementCard.tsx'), 'ach', 'life.ach'),
      ...keysIn(read('LifeShow.tsx'), 'show', 'life.show'),
    ]
    const missing = wanted.filter((key) => !(key in catalogue))
    expect(missing, `missing from messages/he.life.json:\n${missing.join('\n')}`).toEqual([])
  })
})
