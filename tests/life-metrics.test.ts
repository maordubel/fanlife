import { describe, expect, it } from 'vitest'

import { apply, emptyState, fold, type LifeEvent } from '@/lib/life/events'
import { CHAPTERS } from '@/lib/life/content/chapters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { eraFor } from '@/lib/life/content/era'
import { PROOF_MISSIONS } from '@/lib/life/content/routes'
import { REPUTATION_AUDIENCES, SKILL_IDS, PERSONALITY_IDS, type LifeState } from '@/lib/life/types'

/**
 * מה שהעולם באמת עושה — every effect in every conversation, and every beat action.
 *
 * Read from the MODULES rather than from the source text, because a content file is
 * allowed to write `flag: HEARD_GATE.business` and a regular expression over the source
 * would then report a flag called "HEARD_GATE.business" that nothing raises. The two
 * guards below both turn on the difference between "a flag something writes" and "a flag
 * somebody typed", so they have to read it the way the runtime does.
 */
const EFFECTS = Object.values(DIALOGUE).flatMap((conversation) =>
  conversation.branches.flatMap((branch) => [
    ...(branch.then ?? []),
    ...(branch.choices ?? []).flatMap((choice) => choice.then),
  ]),
)

const BEAT_ACTIONS = CHAPTERS.flatMap((row) => (eraFor(row.id).beats ?? []).flatMap((beat) => [...beat.do]))

/** every flag the world can raise, from either layer */
const RAISED: ReadonlySet<string> = new Set<string>([
  ...EFFECTS.flatMap((effect) =>
    effect.e === 'flag' ? [effect.flag] : effect.e === 'flagValue' && effect.value !== false ? [effect.flag] : [],
  ),
  ...BEAT_ACTIONS.flatMap((action) => (action.a === 'flag' ? [action.flag] : [])),
])

/** every flag the world can put back DOWN — `flagValue` with a false is the only way */
const LOWERED: ReadonlySet<string> = new Set<string>(
  EFFECTS.flatMap((effect) => (effect.e === 'flagValue' && effect.value === false ? [effect.flag] : [])),
)

/**
 * שלושה עשר שדות שהמפרט ביקש, ושלושה כללים שהם קיימים בשביל.
 *
 * The life spec's closed list is thirty character metrics. Seventeen of them existed;
 * this suite guards the thirteen that landed on 16.9.2026 — five skills, five
 * reputations, `debt`, `honesty` and the proof ledger — and, much more importantly, the
 * three RULES that make them worth having:
 *
 *  1. **A skill improves when the thing is done. A reputation does not.** Reputation is
 *     not a property of him, it is a property of what a named group has heard, so it
 *     waits in `pending` until a knowledge event pays it out. This is the rule the spec
 *     states outright and the one the engine would quietly lose first.
 *  2. **The same deed pays once.** `proofId` is the key, in both directions.
 *  3. **Additive, as everything in this state has been since the systems pass.** A save
 *     written before these fields existed folds into the new shape and produces the
 *     identical old numbers, because the log always recorded what HAPPENED.
 */

const IDENTITY = { name: 'פוגי', sex: 'boy' as const, birthYear: 1978 }
const YEAR = CHAPTERS.find((row) => row.id === '1986')?.year ?? 1986

function run(events: readonly LifeEvent[]): LifeState {
  return events.reduce((state, event) => apply(state, event), emptyState(IDENTITY, YEAR))
}

describe('הכישורים', () => {
  it('פותחים באפס, בניגוד לאישיות', () => {
    const state = emptyState(IDENTITY, YEAR)
    for (const id of SKILL_IDS) expect(state.skills[id], id).toBe(0)
    // ...and the personality does not, because a disposition is already there at five.
    expect(state.personality.sociability).toBeGreaterThan(0)
  })

  it('משתפרים ברגע שהדבר נעשה — בלי עדים ובלי המתנה', () => {
    const state = run([{ t: 'skill.changed', skill: 'organization', delta: 12, why: 'סידר מפגש' }])
    expect(state.skills.organization).toBe(12)
    // and nothing in the world heard about it
    expect(state.reputation.standing.gate5).toBe(0)
    expect(state.reputation.pending).toHaveLength(0)
  })

  it('נחתכים ב-100 כמו כל מונה בחיים האלה', () => {
    const state = run([{ t: 'skill.changed', skill: 'business', delta: 400, why: 'בדיקה' }])
    expect(state.skills.business).toBe(100)
  })

  it('`knowledge` הוא הכניסה היחידה שמזינה גם אישיות וגם כישור', () => {
    const state = run([{ t: 'trait.shifted', trait: 'knowledge', delta: 9 }])
    expect(state.skills.knowledge, 'the skill leg').toBe(9)
    expect(state.traits.knowledge, 'the legacy writing surface').toBe(14)
    // curiosity opens at 5 and the same nine lands on it — the old behaviour, unchanged,
    // which is what lets a save from before this pass fold identically.
    expect(state.personality.curiosity, 'the personality leg').toBe(14)
  })

  it('שום תכונה אחרת לא מזינה כישור', () => {
    const state = run([
      { t: 'trait.shifted', trait: 'courage', delta: 20 },
      { t: 'trait.shifted', trait: 'streetSmarts', delta: 20 },
      { t: 'trait.shifted', trait: 'responsibility', delta: 20 },
      { t: 'trait.shifted', trait: 'independence', delta: 20 },
    ])
    expect(state.skills).toEqual({ knowledge: 0, communication: 0, organization: 0, business: 0, creativity: 0 })
  })
})

describe('המוניטין — מה שקהל שמע, לא מה שהוא עשה', () => {
  it('מעשה בלי עדים לא מזיז שום מונה', () => {
    const state = run([
      { t: 'reputation.earned', proofId: 'p1', audience: 'gate5', delta: 5, why: 'ארגן' },
    ])
    expect(state.reputation.standing.gate5).toBe(0)
    expect(state.reputation.pending).toHaveLength(1)
    expect(state.reputation.pending[0]?.audience).toBe('gate5')
  })

  it('אירוע ידיעה משלם — ומשלם פעם אחת', () => {
    const state = run([
      { t: 'reputation.earned', proofId: 'p1', audience: 'gate5', delta: 5, why: 'ארגן' },
      { t: 'reputation.heard', proofId: 'p1' },
      { t: 'reputation.heard', proofId: 'p1' },
      { t: 'reputation.heard', proofId: 'p1' },
    ])
    expect(state.reputation.standing.gate5).toBe(5)
    expect(state.reputation.pending).toHaveLength(0)
  })

  it('אותה ראיה אינה נכנסת לתור פעמיים', () => {
    const state = run([
      { t: 'reputation.earned', proofId: 'p1', audience: 'work', delta: 3, why: 'משמרת' },
      { t: 'reputation.earned', proofId: 'p1', audience: 'work', delta: 3, why: 'משמרת' },
      { t: 'reputation.earned', proofId: 'p1', audience: 'public', delta: 9, why: 'ניסיון לגנוב' },
    ])
    expect(state.reputation.pending).toHaveLength(1)
    expect(state.reputation.pending[0]?.delta).toBe(3)
  })

  it('ידיעה על ראיה שלא הורווחה אינה עושה כלום', () => {
    const state = run([{ t: 'reputation.heard', proofId: 'never-happened' }])
    for (const audience of REPUTATION_AUDIENCES) expect(state.reputation.standing[audience]).toBe(0)
  })

  it('חמישה קהלים נפרדים — מה ששער 5 יודע אינו מה שאוסישקין יודע', () => {
    const state = run([
      { t: 'reputation.earned', proofId: 'a', audience: 'gate5', delta: 20, why: '' },
      { t: 'reputation.heard', proofId: 'a' },
    ])
    expect(state.reputation.standing.gate5).toBe(20)
    expect(state.reputation.standing.ussishkin).toBe(0)
    expect(state.reputation.standing.public).toBe(0)
    expect(state.reputation.standing.work).toBe(0)
    expect(state.reputation.standing.gate7).toBe(0)
  })

  it('הפסד אינו ממתין לעד — הפרה שהתגלתה כבר ידועה', () => {
    const state = run([
      { t: 'reputation.earned', proofId: 'a', audience: 'public', delta: 30, why: '' },
      { t: 'reputation.heard', proofId: 'a' },
      { t: 'reputation.changed', audience: 'public', delta: -8, why: 'שמועה שהופרכה' },
    ])
    expect(state.reputation.standing.public).toBe(22)
  })

  /**
   * **ומי שממתין — מישהו חייב לבוא ולהגיד לו.** (16.9.2026)
   *
   * `witnessHe: null` is the content saying "nobody saw this", and it is the right answer
   * for a month of wages closed in an empty room and for a song handed over. What it costs
   * is a second scene, and for `PROOF_BUSINESS` and `PROOF_CREATE` that scene existed and
   * **nothing in the game opened it**: `route-word-gets-around` and `route-work-in-use`
   * had no hotspot, no actor and no `goto`, so `rep_work` and the public's opinion of a
   * creator could not move at all, in any life. A mechanism, dead, reading perfectly in
   * the source — rule 66 one layer above a number.
   *
   * Three things are asserted together because any one of them alone leaves it dead:
   * there is a conversation that pays the claim out, something in the world opens that
   * conversation, and the flag it gates on is one an effect actually raises. The last is
   * the part that had been wrong on its own merits — the branch asked for
   * `life:proof:business`, which nothing has ever written.
   */
  it('לכל משימה בלי עדים יש אירוע ידיעה, ומשהו בעולם פותח אותו', () => {
    const noWitness = PROOF_MISSIONS.filter((row) => row.witnessHe === null)
    expect(noWitness.length, 'a scan that matches nothing proves nothing').toBeGreaterThan(0)

    // every conversation a chapter's beats can open, and the gate each one is asked for
    const openedByBeats = new Set<string>()
    for (const row of CHAPTERS) {
      for (const beat of eraFor(row.id).beats ?? []) {
        for (const action of beat.do) if (action.a === 'talk') openedByBeats.add(action.conversation)
      }
    }
    for (const mission of noWitness) {
      const wanted = `${mission.kind}:{chapter}`
      const payer = Object.values(DIALOGUE).find((conversation) =>
        conversation.branches.some((branch) =>
          [...(branch.then ?? []), ...(branch.choices ?? []).flatMap((choice) => choice.then)].some(
            (effect) => effect.e === 'heard' && effect.proofId === wanted,
          ),
        ),
      )
      expect(payer, `${mission.id} earns a claim nothing can pay`).toBeTruthy()
      expect(openedByBeats, `${payer?.id} is a conversation nothing opens`).toContain(payer!.id)

      // and the branch that pays it asks for a flag something raises
      for (const branch of payer!.branches) {
        const gate = (branch.when as { flag?: string } | undefined)?.flag
        if (!gate) continue
        expect(RAISED, `${payer!.id} waits on "${gate}", which nothing raises`).toContain(gate)
      }
    }
  })
})

describe('החוב', () => {
  it('רצפה באפס — סליחה על יותר ממה שחייבים אינה יוצרת אשראי', () => {
    const state = run([
      { t: 'debt.changed', agorot: 4000, why: 'הלוואה' },
      { t: 'debt.changed', agorot: -9000, why: 'החזר' },
    ])
    expect(state.debt).toBe(0)
  })

  it('אינו כסף שלילי — ארנק ריק וחוב אפס אינם אותו מצב', () => {
    const owing = run([{ t: 'debt.changed', agorot: 2500, why: 'הלוואה' }])
    expect(owing.agorot).toBe(0)
    expect(owing.debt).toBe(2500)
  })

  /**
   * **וטובה שאי-אפשר להחזיר איננה חוב, היא עונש.** (16.9.2026)
   *
   * `owe:` is the other half of what `hasOverdueDebt` reads (`lib/life/routes.ts`): the
   * coins a stand collected so somebody could get on a bus. `personFlags` keeps those
   * flags on purpose, because a favour does not expire at midnight — and for three of
   * them nothing in the entire game ever set them back down. A boy of fifteen whose fare
   * was topped up was therefore locked out of the OWNER apex for the rest of his life,
   * for the crime of having been short of ninety shekels once.
   *
   * The guard is a scan and not a list, so the next `owe:` somebody raises has to come
   * with the scene that settles it. It says nothing about WHERE or at what price — that
   * is the writer's business — only that a way exists.
   */
  it('כל `owe:` שהתוכן מרים — התוכן גם נותן דרך לפרוע', () => {
    const owed = [...RAISED].filter((flag) => flag.startsWith('owe:'))
    expect(owed.length, 'a scan that matches nothing proves nothing').toBeGreaterThan(0)
    const stuck = owed.filter((flag) => !LOWERED.has(flag))
    expect(stuck, `a debt the game takes on and never lets the player pay:\n${stuck.join('\n')}`).toEqual([])
  })
})

describe('הראיות', () => {
  it('נרשמות פעם אחת לכל מזהה', () => {
    const proof = { kind: 'leadership_proof', proofId: 'lead-1', chapter: '1996-army', year: 1996 }
    const state = run([
      { t: 'proof.recorded', proof },
      { t: 'proof.recorded', proof },
      { t: 'proof.recorded', proof: { ...proof, noteHe: 'ניסיון שני' } },
    ])
    expect(state.proofs).toHaveLength(1)
    expect(state.proofs[0]?.noteHe).toBeUndefined()
  })
})

describe('כנות', () => {
  it('היא ציר האישיות השנים־עשר, ופותחת גבוה כי היא נשרפת', () => {
    expect(PERSONALITY_IDS).toContain('honesty')
    expect(emptyState(IDENTITY, YEAR).personality.honesty).toBeGreaterThanOrEqual(70)
  })

  it('אינה אמינות — שני צירים נפרדים שנעים בנפרד', () => {
    const state = run([{ t: 'personality.shifted', key: 'honesty', delta: -20 }])
    expect(state.personality.honesty).toBe(60)
    expect(state.personality.reliability).toBe(emptyState(IDENTITY, YEAR).personality.reliability)
  })
})

describe('תוספתי — שמירה מלפני הפאס מתקפלת לצורה החדשה', () => {
  /**
   * הבדיקה הזאת היא הסיבה שהיומן הוא append-only.
   *
   * A log written before any of these fields existed is replayed here through the new
   * reducer. Every OLD number has to come out identical — that is what "additive" means
   * and it is the promise `SAVE_VERSION` is kept at 3 on — and every NEW field has to be
   * present and blank rather than undefined, because a screen reading `state.skills.x`
   * on a save from last week must not throw.
   */
  const OLD_LOG: LifeEvent[] = [
    { t: 'life.started', identity: IDENTITY, year: YEAR, weekday: 6, minute: 0 },
    { t: 'trait.shifted', trait: 'courage', delta: 10 },
    { t: 'trait.shifted', trait: 'footballAffinity', delta: 15 },
    { t: 'money.changed', agorot: 700, why: 'דמי כיס' },
    { t: 'bond.shifted', who: 'ofir', delta: 8 },
    { t: 'flag.raised', flag: 'life:a2:efi' },
  ]

  it('כל מספר ישן יוצא זהה', () => {
    const state = fold(IDENTITY, YEAR, OLD_LOG)
    expect(state.personality.courage).toBe(20)
    expect(state.redHeart.footballLove).toBe(35)
    expect(state.agorot).toBe(700)
    expect(state.bonds.ofir).toBe(8)
    expect(state.flags['life:a2:efi']).toBe(true)
  })

  it('כל שדה חדש קיים וריק, ולא undefined', () => {
    const state = fold(IDENTITY, YEAR, OLD_LOG)
    expect(state.debt).toBe(0)
    expect(state.proofs).toEqual([])
    expect(state.reputation.pending).toEqual([])
    for (const id of SKILL_IDS) expect(state.skills[id], id).toBe(0)
    for (const audience of REPUTATION_AUDIENCES) expect(state.reputation.standing[audience], audience).toBe(0)
  })

  it('כישור, מוניטין וראיה שורדים יום ושנה', () => {
    const chapter = CHAPTERS.find((row) => row.id === '1990')
    const state = fold(IDENTITY, YEAR, [
      ...OLD_LOG,
      { t: 'skill.changed', skill: 'organization', delta: 30, why: '' },
      { t: 'reputation.earned', proofId: 'x', audience: 'gate5', delta: 10, why: '' },
      { t: 'reputation.heard', proofId: 'x' },
      { t: 'proof.recorded', proof: { kind: 'group_delivered', proofId: 'g1', chapter: '1986', year: YEAR } },
      { t: 'debt.changed', agorot: 1500, why: '' },
      { t: 'day.entered', dayId: 'a3', year: YEAR, weekday: 6, minute: 600 },
      { t: 'year.entered', year: chapter?.year ?? 1990, weekday: chapter?.weekday ?? 6, minute: 600 },
    ])
    expect(state.skills.organization, 'a skill is not forgotten overnight').toBe(30)
    expect(state.reputation.standing.gate5, 'what a gate knows is not forgotten overnight').toBe(10)
    expect(state.proofs, 'evidence outlives the day it was made in').toHaveLength(1)
    expect(state.debt, 'a debt does not lapse because a year turned').toBe(1500)
  })
})
