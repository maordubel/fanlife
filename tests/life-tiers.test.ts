import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { DIALOGUE } from '@/lib/life/content/dialogue'
import { apply, emptyState, type LifeEvent } from '@/lib/life/events'
import {
  GIGS,
  gigChapters,
  gigConversations,
  gigFlag,
  gigId,
  gigPay,
  isPaid,
  isPlay,
  isWork,
  kindOf,
  offeredIn,
  workDoneFlag,
  type Gig,
} from '@/lib/life/gigs'
import { PITCH_GIG_ID, PITCH_SETTLEMENT } from '@/lib/life/football/door'
import {
  DISTANCE_RETURN,
  LIFE_ROUTES,
  ROUTE_COMBINATIONS,
  ROUTE_IDS,
  ROUTE_STAGES,
  ROUTE_TIERS,
  UNPLACED_ROUTES,
  acceptEvents,
  blocksCombination,
  combinationCostConversation,
  combinationFor,
  combinationOf,
  leftFlag,
  plainSupporter,
  routeAtLeast,
  stageFlag,
  tierOf,
  undecidedCombinations,
  type RouteId,
} from '@/lib/life/routes'
import { LIFE_TRACKS, trackAtLeast, trackStageFlag, trackStageOf, tracksOn, trackById } from '@/lib/life/tracks'
import { meets } from '@/lib/life/world/types'
import type { LifeState } from '@/lib/life/types'

/**
 * שלוש ההכרעות של 17.9.2026, והשאלה המשותפת לשלושתן.
 *
 * Maor decided three things in one sitting — a difficulty ORDER over the routes, a second
 * axis of life TRACKS beside them, and that routes COMBINE — and a fourth thing follows
 * from all three: a `Condition` had to learn to ask about a route, because until it did,
 * none of the three could ever change what a player sees in a room.
 *
 * What this suite guards is not the arithmetic (there is barely any) but the honesty of
 * the data, and every block below is one way the same lie could be told:
 *
 *  · a tier a man did not give a route, printed as though he had;
 *  · a pair of routes that combine because nobody said they do not;
 *  · a track that looks like a system and has no scene on the other side of it;
 *  · a ball that costs a boy the day's work because it happens to live in the job table.
 *
 * Not one year, age or threshold is typed here. `DISTANCE_RETURN.minAge` and the registry
 * are where those live (rule 45).
 */

const ROOT = join(__dirname, '..')
const source = (path: string) => readFileSync(join(ROOT, path), 'utf8')

const identity = { name: 'פוגי', sex: 'boy' as const, birthYear: 1978 }
const life = (): LifeState => emptyState(identity, 1978 + DISTANCE_RETURN.minAge + 4)
const raise = (state: LifeState, ...flags: string[]): LifeState =>
  flags.reduce((current, flag) => apply(current, { t: 'flag.raised', flag } as LifeEvent), state)

// ---------------------------------------------------------------------------------

describe('הדרגות — הסדר של מאור, ומה שהוא לא אמר', () => {
  /**
   * A second copy of his list, on purpose — the same device the spec tables get.
   *
   * If somebody re-ranks a route in a delta, exactly one of the two moves and this says
   * which. Written as his six lines, in his order, hardest first.
   */
  const HIS_LIST: readonly (readonly [number, string, readonly RouteId[]])[] = [
    [1, 'בעלי הקבוצה', ['OWNER']],
    [2, 'מייסד כדורסל', ['USSISHKIN_FOUNDER']],
    [3, 'מנהיג אוהדים', ['ULTRAS']],
    [4, 'עיתונאי · קשרים בינלאומיים · מעבר לגור בחו״ל', ['JOURNALIST', 'TRAVELLER']],
    [5, 'אוהד רגיל', []],
    [6, 'אוהד כורסא · אוהד שנעלם וחוזר', ['DISTANCE_RETURN']],
  ]

  it('is his six lines, in his order, hardest first', () => {
    expect(ROUTE_TIERS.map((row) => [row.tier, row.nameHe, [...row.routes]])).toEqual(
      HIS_LIST.map((row) => [row[0], row[1], [...row[2]]]),
    )
  })

  /**
   * דרגה 5 היא היעדר מסלול, ולא סולם שביעי — והבדיקה היא על ההיעדר עצמו.
   *
   * *"אוהד רגיל"* is the boy who took nothing. Modelled as an empty `routes` array rather
   * than as a seventh `RouteId`, because a seventh id would have to be accepted, stored,
   * offered and combined — a whole ladder for the one rung whose content is that there is
   * no ladder. So: no id is invented, nothing can be accepted on it, and the runtime form
   * of the question is an absence.
   */
  it('models tier five as the absence of a route and not as a seventh ladder', () => {
    const five = ROUTE_TIERS.find((row) => row.tier === 5)
    expect(five?.routes).toEqual([])
    expect(ROUTE_IDS).not.toContain('REGULAR')
    expect(ROUTE_IDS.length, 'a tier row must never add a route id').toBe(LIFE_ROUTES.length + 1)

    const nobody = life()
    expect(plainSupporter(nobody), 'a man who took nothing is the plain supporter').toBe(true)
    expect(plainSupporter(raise(nobody, stageFlag('ULTRAS', 'entry')))).toBe(false)
    // and the sixth tier is not the fifth: taking the distance is taking something
    expect(plainSupporter(raise(nobody, stageFlag('DISTANCE_RETURN', 'entry')))).toBe(false)
  })

  /**
   * `CREATOR` אינו ברשימה שלו, ולכן אין לו דרגה — והכרטיס אומר את זה בקול.
   *
   * A tier the owner did not give a route is a number we made up, and in a difficulty
   * ordering an invented entry is worse than a blank one: the blank asks him a question
   * and the invention answers it for him, permanently and quietly.
   */
  it('leaves CREATOR without a tier, and says so on the card instead of guessing one', () => {
    expect(UNPLACED_ROUTES).toEqual(['CREATOR'])
    expect(tierOf('CREATOR')).toBeNull()
    // it is still a route in every other respect — unplaced is not retired
    expect(LIFE_ROUTES.some((route) => route.id === 'CREATOR')).toBe(true)

    const card = source('components/life/RouteCard.tsx')
    expect(card, 'the card must be able to say a tier is unset').toContain('life.route.tier.unplaced')
    expect(card).toContain('tierOf')
    // and it must print his WORD for the rung, never a position: "one of six" is a ranking
    expect(card).toContain('tier.nameHe')
    expect(/life\.route\.tier\.\{|out-of-six|מתוך שש/.test(card)).toBe(false)
  })

  it('places every other route exactly once, so no route can sit on two rungs', () => {
    const placed = ROUTE_TIERS.flatMap((row) => row.routes)
    expect(new Set(placed).size).toBe(placed.length)
    for (const id of ROUTE_IDS) {
      if (UNPLACED_ROUTES.includes(id)) continue
      expect(tierOf(id), id).not.toBeNull()
    }
  })

  it('decides nothing — no threshold, offer or gap has ever heard of a tier', () => {
    /**
     * הדרגה היא סדר קושי שמאור הצהיר עליו, לא מנגנון. The moment a tier gates an offer it
     * becomes a level requirement, and a route whose entry needs "tier 3 first" is the
     * promotion ladder this whole system was built to refuse.
     */
    const routes = source('lib/life/routes.ts')
    const gaps = routes.slice(routes.indexOf('export function gapsFor'), routes.indexOf('export const meetsStage'))
    expect(gaps).not.toContain('tier')
    const eligible = routes.slice(routes.indexOf('export function eligibleFor'), routes.indexOf('export function acceptEvents'))
    expect(eligible).not.toContain('tier')
  })
})

// ---------------------------------------------------------------------------------

describe('השילובים — כל זוג, ובמפורש', () => {
  const pairs = () => {
    const out: [RouteId, RouteId][] = []
    for (let i = 0; i < ROUTE_IDS.length; i += 1) {
      for (let j = i + 1; j < ROUTE_IDS.length; j += 1) out.push([ROUTE_IDS[i] as RouteId, ROUTE_IDS[j] as RouteId])
    }
    return out
  }

  /**
   * *"A pair with no stated relation must default to the safe reading."* — so the default
   * exists, and no pair is allowed to rely on it. Twenty-one rows for seven routes.
   */
  it('has a row for every unordered pair, exactly once', () => {
    const all = pairs()
    expect(ROUTE_COMBINATIONS).toHaveLength(all.length)
    for (const [a, b] of all) {
      const rows = ROUTE_COMBINATIONS.filter(
        (row) => (row.pair[0] === a && row.pair[1] === b) || (row.pair[0] === b && row.pair[1] === a),
      )
      expect(rows.length, `${a} + ${b}`).toBe(1)
    }
  })

  it('answers the same whichever way round it is asked, and never for a route against itself', () => {
    for (const [a, b] of pairs()) expect(combinationOf(a, b), `${a}/${b}`).toBe(combinationOf(b, a))
    for (const id of ROUTE_IDS) expect(combinationOf(id, id), id).toBe('free')
  })

  it('carries the two Maor named, in his words', () => {
    expect(combinationOf('USSISHKIN_FOUNDER', 'ULTRAS')).toBe('free')
    expect(combinationOf('ULTRAS', 'DISTANCE_RETURN')).toBe('free')
    for (const pair of [['USSISHKIN_FOUNDER', 'ULTRAS'], ['ULTRAS', 'DISTANCE_RETURN']] as const) {
      expect(combinationFor(pair[0], pair[1])?.sourceHe, pair.join('+')).toContain('מאור')
    }
  })

  /**
   * הזוג היחיד שהיה קיים לפני הטבלה — ומשמעותו לא זזה.
   *
   * Owner-and-journalist is `cost`, not `exclusive`: *"שלוש דלתות, ואף אחת מהן היא לא
   * 'אסור לך'"*. It still routes to the same conversation, that conversation still exists,
   * and `acceptEvents` still hands the title over — the price is paid in a scene.
   */
  it('keeps the journalist-and-owner pair meaning exactly what it meant', () => {
    expect(combinationOf('JOURNALIST', 'OWNER')).toBe('cost')
    const conversation = combinationCostConversation('JOURNALIST', 'OWNER')
    expect(conversation).toBe('route-conflict-of-interest')
    expect(DIALOGUE[conversation as string], 'the price is a conversation that must exist').toBeTruthy()
    expect(blocksCombination('JOURNALIST', 'OWNER'), 'a cost is not a wall').toBe(false)
  })

  it('names who decided every single row, so nobody is quoted who did not speak', () => {
    for (const row of ROUTE_COMBINATIONS) {
      expect(row.sourceHe.trim().length, row.pair.join('+')).toBeGreaterThan(0)
      if (row.relation === 'undecided') expect(row.sourceHe, row.pair.join('+')).not.toContain('מאור')
      // only a priced pair may carry a conversation; a free or undecided one charging
      // something would be a cost nobody declared
      if (row.relation !== 'cost') expect(row.conversationId, row.pair.join('+')).toBeUndefined()
      else expect(row.conversationId, row.pair.join('+')).toBeTruthy()
    }
  })

  /**
   * `undecided` היא ברירת המחדל הבטוחה — והיא לא חוסמת, בכוונה.
   *
   * Blocking an undecided pair would delete branches the game can walk today on the
   * strength of nobody having spoken, which is a decision taken by silence. So silence is
   * LISTED, not enforced: `undecidedCombinations()` is what a delivery note prints.
   */
  it('lists what nobody ruled on instead of ruling on it', () => {
    const undecided = undecidedCombinations()
    expect(undecided.length, 'every pair was decided, which nobody has done').toBeGreaterThan(0)
    for (const row of undecided) {
      expect(blocksCombination(row.pair[0], row.pair[1]), row.pair.join('+')).toBe(false)
      expect(combinationCostConversation(row.pair[0], row.pair[1]), row.pair.join('+')).toBeNull()
    }
  })

  /**
   * `exclusive` קיים כמילה ואין לו חברים — ואסור להמציא לו אחד.
   *
   * Maor said such pairs exist and named none. The kind is in the vocabulary so the day he
   * names one it is a word in a row, and `acceptEvents` already refuses. This test does NOT
   * assert the set is empty — it asserts the mechanism works — so the day a pair is
   * declared, nothing here has to be relaxed.
   */
  it('refuses the second title of a pair that IS declared exclusive', () => {
    const excluded = ROUTE_COMBINATIONS.filter((row) => row.relation === 'exclusive')
    for (const row of excluded) {
      const held = raise(life(), stageFlag(row.pair[0], 'entry'))
      expect(acceptEvents(held, row.pair[1], 'entry'), row.pair.join('+')).toEqual([])
    }
    // the mechanism itself, on a pair that is not exclusive: nothing is refused today
    const ultras = raise(life(), stageFlag('ULTRAS', 'entry'))
    expect(acceptEvents(ultras, 'DISTANCE_RETURN', 'entry').length).toBeGreaterThan(0)
  })

  it('keeps the distance route s own list of partners in step with the table', () => {
    for (const id of DISTANCE_RETURN.coexistsWith) {
      expect(combinationOf('DISTANCE_RETURN', id), id).toBe('free')
    }
  })
})

// ---------------------------------------------------------------------------------

describe('מסלולי חיים נפרדים — התפר, ולא התוכן', () => {
  it('registers the three Maor named, and does not invent a fourth', () => {
    expect(LIFE_TRACKS.map((track) => track.id)).toEqual(['PARTNERSHIP', 'WORK', 'PARENTHOOD'])
    for (const track of LIFE_TRACKS) {
      expect(track.titleHe.trim().length, track.id).toBeGreaterThan(0)
      expect(track.stages.length, track.id).toBeGreaterThan(0)
      expect(new Set(track.stages.map((stage) => stage.id)).size, track.id).toBe(track.stages.length)
      for (const stage of track.stages) expect(stage.titleHe.trim().length, `${track.id}/${stage.id}`).toBeGreaterThan(0)
    }
  })

  /**
   * אין ספים, ואין להם ספים במקרה — זה סירוב.
   *
   * `routes.ts` can point at the spec line every one of its numbers came from. Nobody has
   * written a table for these three, so a `minAge` here would read exactly as
   * authoritative as OWNER's `minAge: 21` and a reader would have no way to tell them
   * apart. The seam holds the shape; the content decides the substance.
   */
  it('declares no threshold of any kind, because nobody has decided one', () => {
    /**
     * Asserted on the DATA and not on the source text, deliberately: `tracks.ts` names
     * `minAge: 21` in its own prose as the example of what it refuses to carry, and a
     * grep cannot tell a refusal from a field. The shape can: four keys on a track, two on
     * a stage, and not one number anywhere in the registry.
     */
    for (const track of LIFE_TRACKS) {
      expect(Object.keys(track).sort(), track.id).toEqual(['id', 'needsHe', 'stages', 'titleHe'])
      for (const stage of track.stages) {
        expect(Object.keys(stage).sort(), `${track.id}/${stage.id}`).toEqual(['id', 'titleHe'])
      }
    }
    expect(JSON.stringify(LIFE_TRACKS), 'a number appeared in the seam').not.toMatch(/:\s*-?\d/)
  })

  it('says out loud what a content author still has to write for each of them', () => {
    for (const track of LIFE_TRACKS) {
      expect(track.needsHe.length, track.id).toBeGreaterThan(0)
      for (const line of track.needsHe) expect(line.trim().length, track.id).toBeGreaterThan(0)
    }
  })

  /**
   * הדגל הוא `own:`, ולכן הוא שורד חיתוך יום וחיתוך שנה — וזו כל ההבטחה של התפר.
   *
   * A track whose whole subject is the decade between chapters would be worthless as an
   * ordinary flag: `personFlags` erases those at the first cut. This is the same contract
   * `own:route:` signed, tested the same way — through the reducer, not by reading a
   * prefix off a string.
   */
  it('survives a day and a year, because a partnership is not an afternoon', () => {
    const flag = trackStageFlag('PARTNERSHIP', 'together')
    expect(flag.startsWith('own:')).toBe(true)
    // the control, so the assertion below is a proof and not a coincidence: an ordinary
    // flag raised in the same breath is gone at the first cut
    let state = raise(life(), flag, 'track:control')
    expect(trackAtLeast(state, 'PARTNERSHIP', 'together')).toBe(true)
    state = apply(state, {
      t: 'day.entered',
      dayId: 'next',
      year: state.year,
      weekday: 6,
      minute: 600,
    } as LifeEvent)
    expect(trackAtLeast(state, 'PARTNERSHIP', 'together'), 'a day cut forgot it').toBe(true)
    expect(state.flags['track:control'], 'the control survived, so this proves nothing').toBeFalsy()
    state = apply(state, { t: 'year.entered', year: state.year + 1, weekday: 6, minute: 600 } as LifeEvent)
    expect(trackAtLeast(state, 'PARTNERSHIP', 'together'), 'a year cut forgot it').toBe(true)
  })

  it('reads stages as an order and never as a score', () => {
    const track = trackById('PARENTHOOD')
    const [first, second, third] = track!.stages
    const state = raise(life(), trackStageFlag('PARENTHOOD', second!.id))
    expect(trackStageOf(state, 'PARENTHOOD')?.id).toBe(second!.id)
    expect(trackAtLeast(state, 'PARENTHOOD', first!.id)).toBe(true)
    expect(trackAtLeast(state, 'PARENTHOOD', third!.id)).toBe(false)
    expect(trackAtLeast(state, 'PARENTHOOD')).toBe(true)
    expect(tracksOn(state)).toEqual(['PARENTHOOD'])
    expect(tracksOn(life())).toEqual([])
  })

  /**
   * ואין תוכן — וזה נאמר, לא מוסתר.
   *
   * No conversation, beat, scene row or offer reaches a track today. That is the opposite
   * of the defect rule 66 is about: a threshold nothing can reach looks healthy in the
   * source, while a registry with nothing behind it states its own emptiness in `needsHe`.
   * The day a 2007 scene raises one of these flags, this assertion is what has to be
   * deliberately removed — which is the point of it.
   */
  it('has no chapter content behind it yet, and the registry is the only thing that knows', () => {
    const everywhere = JSON.stringify(Object.values(DIALOGUE))
    expect(everywhere).not.toContain('own:track:')
  })
})

// ---------------------------------------------------------------------------------

describe('התנאי למד לשאול על מסלול', () => {
  /**
   * *"אני רוצה שיהיו משימות שיופיעו רק במסלולים מסויימים, משימות שלא יופיעו כלל בגלל
   * מסלולים מסויימים."* Both halves, and the ladder in between.
   */
  it('appears only on a route, and only from the stage the condition names', () => {
    const nobody = life()
    expect(meets(nobody, { route: { id: 'ULTRAS' } })).toBe(false)
    const entry = raise(nobody, stageFlag('ULTRAS', 'entry'))
    expect(meets(entry, { route: { id: 'ULTRAS' } }), 'minStage defaults to the first rung').toBe(true)
    expect(meets(entry, { route: { id: 'ULTRAS', minStage: 'apex' } })).toBe(false)
    const apex = raise(entry, stageFlag('ULTRAS', 'practice'), stageFlag('ULTRAS', 'apex'))
    for (const stage of ROUTE_STAGES) expect(meets(apex, { route: { id: 'ULTRAS', minStage: stage } }), stage).toBe(true)
  })

  it('disappears because of a route, which is the other half of the sentence', () => {
    const nobody = life()
    expect(meets(nobody, { notRoute: { id: 'OWNER' } })).toBe(true)
    const owner = raise(nobody, stageFlag('OWNER', 'entry'))
    expect(meets(owner, { notRoute: { id: 'OWNER' } })).toBe(false)
    expect(meets(owner, { notRoute: { id: 'OWNER', minStage: 'practice' } }), 'entry is not practice').toBe(true)
  })

  /**
   * הקריאה היא פעילה — ומי שעזב, עזב.
   *
   * A task that exists for whoever holds the terrace should not follow a man who handed it
   * over. The HISTORY question is not given a second predicate, because it already has one:
   * the stage flag itself, which `heldStage` reads and nothing erases.
   */
  it('stops following a man who stood down, while the history stays askable', () => {
    const left = raise(life(), stageFlag('ULTRAS', 'entry'), leftFlag('ULTRAS'))
    expect(routeAtLeast(left, 'ULTRAS')).toBe(false)
    expect(meets(left, { route: { id: 'ULTRAS' } })).toBe(false)
    expect(meets(left, { flag: stageFlag('ULTRAS', 'entry') }), 'the history is still askable').toBe(true)
  })

  it('asks the same two questions of a life track, in one vocabulary and not two', () => {
    const dad = raise(life(), trackStageFlag('PARENTHOOD', 'born'))
    expect(meets(dad, { track: { id: 'PARENTHOOD' } })).toBe(true)
    expect(meets(dad, { track: { id: 'PARENTHOOD', minStage: 'raising' } })).toBe(false)
    expect(meets(dad, { notTrack: { id: 'PARENTHOOD' } })).toBe(false)
    expect(meets(life(), { notTrack: { id: 'PARENTHOOD' } })).toBe(true)
  })

  it('composes with everything else, because it is a predicate and not a special case', () => {
    const state = raise(life(), stageFlag('ULTRAS', 'entry'), trackStageFlag('WORK', 'trade'))
    expect(meets(state, { all: [{ route: { id: 'ULTRAS' } }, { track: { id: 'WORK', minStage: 'trade' } }] })).toBe(true)
    expect(meets(state, { any: [{ route: { id: 'OWNER' } }, { route: { id: 'ULTRAS' } }] })).toBe(true)
    expect(meets(state, { none: [{ route: { id: 'ULTRAS' } }] })).toBe(false)
  })
})

// ---------------------------------------------------------------------------------

describe('פנדלים אינם עבודה — משחק העברת זמן', () => {
  const play = () => GIGS.filter(isPlay)
  const pitch = GIGS.find((row) => row.id === PITCH_GIG_ID) as Gig

  it('names the three kinds the table has always had, and the sign for each', () => {
    expect(kindOf(pitch)).toBe('play')
    expect(kindOf(GIGS.find((row) => row.id === 'penalty-contest') as Gig)).toBe('play')
    expect(kindOf(GIGS.find((row) => row.id === 'hoops-contest') as Gig)).toBe('play')
    // rule 72: a coin toss is not a job, and `opens` is how this file already marked it
    expect(kindOf(GIGS.find((row) => row.id === 'alley-coin') as Gig)).toBe('wager')
    expect(kindOf(GIGS.find((row) => row.id === 'toto-slip') as Gig)).toBe('wager')
    expect(kindOf(GIGS.find((row) => row.id === 'crates-kiosk') as Gig)).toBe('work')
    // the three are a partition, and `isPaid` keeps its old meaning exactly
    for (const gig of GIGS) {
      expect([isWork(gig), kindOf(gig) === 'wager', isPlay(gig)].filter(Boolean).length, gig.id).toBe(1)
      expect(isPaid(gig), gig.id).toBe(!isPlay(gig))
    }
  })

  it('pays nothing, in any chapter, for anything that is play', () => {
    for (const gig of play()) {
      for (const chapter of gigChapters(gig)) expect(gigPay(gig, chapter), `${gig.id}/${chapter}`).toBe(0)
    }
  })

  /**
   * *"אפשר לקחת גם עבודה וגם לשחק פנדלים באותו יום."* — ארבעה חצאים לאותו משפט.
   *
   * The work slot is a chapter-scoped flag (`work:paid:<chapter>`), and play must not
   * raise it, must not be refused by it, must not be dealt away by the week's rotation and
   * must not need the rotation's offer flag to be drawn. Miss any one and the sentence is
   * false in a way nobody notices until a boy stands on his own pitch and is told to come
   * back tomorrow.
   */
  it('never spends the day s job, in either order', () => {
    for (const gig of play()) {
      for (const chapter of gigChapters(gig)) {
        const conversation = gigConversations().find((row) => row.id === gigId(gig, chapter))
        const json = JSON.stringify(conversation)
        expect(json, `${gig.id}/${chapter} raises the work flag`).not.toContain(workDoneFlag(chapter))
        expect(json, `${gig.id}/${chapter} is refused by the work flag`).not.toContain('work:paid')
        expect(offeredIn(chapter, 'any-seed').has(gig.id), `${gig.id} was dealt by the rotation`).toBe(false)
      }
    }
    // and the settlement path agrees: the street match charges time and never the job
    expect(PITCH_SETTLEMENT.flag).toBe(gigFlag(pitch))
    expect(PITCH_SETTLEMENT.flag.startsWith('gig:'), 'a once-a-day flag, not a once-a-chapter one').toBe(true)
    expect(Object.keys(PITCH_SETTLEMENT)).not.toContain('agorot')
    const ledger = source('app/life/stage/useLifeLedger.ts')
    const settle = ledger.slice(ledger.indexOf('settlePitch('), ledger.indexOf('settleHoops('))
    expect(settle, 'the pitch paid a wage').not.toContain('money.changed')
    expect(settle).not.toContain('work:paid')
  })

  /**
   * והכדור תמיד שם — a week that could deal away the street match would make "אני הפועל" a
   * thing the seed decides, which is the opposite of a boy choosing to go and play.
   */
  it('is in every week of every seed, because a ball in a yard needs nobody s permission', () => {
    const chapters = [...new Set(GIGS.flatMap((gig) => gigChapters(gig)))]
    for (const seed of ['s1', 's2', 's3', 's4']) {
      for (const chapter of chapters) {
        for (const gig of play()) expect(offeredIn(chapter, seed).has(gig.id), `${gig.id}/${chapter}/${seed}`).toBe(false)
      }
    }
  })
})
