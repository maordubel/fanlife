/**
 * התקרה — what the most greedy player alive could possibly have, chapter by chapter.
 *
 *   npx tsx scripts/life/budget-audit.ts           → the impossible, and the nearly-impossible
 *   VERBOSE=1 npx tsx scripts/life/budget-audit.ts → the whole table, every counter
 *
 * A whole class of bug in this game is invisible to every checker we have: a door, a
 * choice or a branch that asks for a number the game cannot produce. `deadend-audit` asks
 * whether a flag is ever raised; nothing asked whether ninety shekels can ever be in the
 * pocket at the moment Michel is standing there, or whether Efi's trust can reach
 * forty-five before the year that reads it. Those branches are not broken. They are
 * simply never taken, by anyone, ever, and they look perfectly healthy in the source: a
 * warm scene where a mother slips her son five shekels behind his father's back, written
 * and never once played.
 *
 * **The test is one-sided on purpose.** For every counter this walks the chapters in
 * order and adds up EVERY positive delta the chapter can declare, as if the player took
 * all of them, in one life, with no clock and no exclusivity between choices. That is a
 * wild over-estimate of what any real playthrough holds — which is exactly what makes it
 * useful: a threshold ABOVE this ceiling is unreachable by proof, not by suspicion. No
 * false positives; plenty of false negatives. A HOLE here is always real.
 *
 * A threshold just UNDER the ceiling is the second finding. The ceiling assumes a player
 * who took every single point available in nineteen chapters, so a gate at 66 against a
 * ceiling of 67 is not "tight", it is a gate one specific saint can open. Those are
 * printed as NARROW, with the margin, and are a judgement call rather than a defect.
 *
 * ------------------------------------------------------------------------------------
 * **שלוש פעמים המכשיר הזה מדד שדה מת לפני שהוא נכתב נכון, וזה מתועד כאן כדי שלא ירבע.**
 *
 * The first draft of this file reported ten impossible thresholds. Four of them were its
 * own fault, and each was a different way of measuring something the runtime does not
 * use:
 *
 *   1. It started every counter at zero. `emptyState` does not: Kobi and Rachel open at
 *      bond 50, impulsiveness at 30, footballLove at 20. A gate at 60 looked like a
 *      46-point hole and was a 10-point climb.
 *   2. It counted `bond.rachel` and `rel.rachel.bond` as two different numbers. They are
 *      one: `withRelationship` writes `bonds[who] = next.bond` on every relationship
 *      change, so the legacy surface and the axis are the same field seen twice.
 *   3. It ignored `{ e: 'trait' }`. `TRAIT_ROUTE` sends a trait shift to a personality
 *      key or a Red Heart dimension, so `streetSmarts` — which looked like it was never
 *      given at all — is given by every `trait` line in the game.
 *   4. It ignored the clamp. Nothing in a life goes above 100, so a ceiling of 140 is a
 *      ceiling of 100 and a gate at 120 would have passed unnoticed.
 *
 * The rule those four have in common is the one rule this file runs on: **read the
 * counter the way the reducer reads it, from the same tables, or do not report on it.**
 */
import { ACTIVITIES, activityCeiling, activityChapters } from '../../lib/life/activities'
import { CHAPTERS } from '../../lib/life/content/chapters'
import { DIALOGUE } from '../../lib/life/content/dialogue'
import { eraFor } from '../../lib/life/content/era'
import type { Effect } from '../../lib/life/content/script'
import { emptyState } from '../../lib/life/events'
import type { LifeState, PlayerIdentity } from '../../lib/life/types'
import { TRAIT_ROUTE } from '../../lib/life/types'
import { ALL_SCENES, inEra } from '../../lib/life/world/scenes'
import type { Condition } from '../../lib/life/world/types'

const ORDER = CHAPTERS.filter((c) => c.playable !== false).map((c) => c.id)
const IDENTITY = { birthYear: 1976, nameHe: 'פוגי' } as unknown as PlayerIdentity
const START: LifeState = emptyState(IDENTITY, 1984)

// ------------------------------------------------------------- which words belong to which year
/**
 * A chapter's conversations are not declared anywhere: they are whatever the rooms of
 * that year can start, plus everything those lead to. Three systems can start one — an
 * actor standing in the room, a hotspot on the wall, and the chapter's own beats — and
 * all three are filtered by era, which is why this cannot be computed once for the game.
 */
const rootsFor = (chapter: string): string[] => {
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
    if (Array.isArray(value)) {
      for (const item of value) scan(item, depth + 1)
      return
    }
    if (typeof value !== 'object') return
    const node = value as Record<string, unknown>
    for (const key of ['talk', 'node', 'act', 'conversation']) {
      if (typeof node[key] === 'string') roots.push(node[key] as string)
    }
    for (const child of Object.values(node)) scan(child, depth + 1)
  }
  for (const key of ['beats', 'opportunities', 'encounters', 'ambient']) scan(era[key])
  return roots
}

const effectsOf = (id: string): Effect[] => {
  const conversation = DIALOGUE[id]
  if (!conversation) return []
  const out: Effect[] = []
  for (const branch of conversation.branches) {
    for (const effect of branch.then ?? []) out.push(effect)
    for (const choice of branch.choices ?? []) for (const effect of choice.then) out.push(effect)
  }
  return out
}

const conversationsIn = (chapter: string): Set<string> => {
  const seen = new Set<string>()
  const queue = rootsFor(chapter)
  while (queue.length) {
    const id = queue.shift() as string
    if (seen.has(id) || !DIALOGUE[id]) continue
    seen.add(id)
    for (const effect of effectsOf(id)) if (effect.e === 'goto') queue.push(effect.node)
  }
  return seen
}

// ------------------------------------------------------------------------------ the ceiling
type Ceiling = Map<string, number>

/**
 * Everything but money is clamped to 0..100 by `clamp()` in the reducer, so a ceiling is
 * never allowed above it either. Money is the one unbounded counter in a life.
 */
const CAP = 100
const bump = (into: Ceiling, key: string, delta: number) => {
  if (delta <= 0) return // the greedy player declines every cost
  const raw = (into.get(key) ?? 0) + delta
  into.set(key, key === 'agorot' ? raw : Math.min(CAP, raw))
}

/**
 * The opening numbers, read off `emptyState` rather than assumed. A person who is not in
 * `relationships` starts at `blankRelationship(0)` — bond 0, trust 0, distance 40 — and
 * the distance axis is the only one that opens above zero for a stranger.
 */
const seed = (): Ceiling => {
  const into: Ceiling = new Map()
  into.set('agorot', START.agorot)
  for (const [key, value] of Object.entries(START.personality)) into.set(`personality.${key}`, value)
  for (const [key, value] of Object.entries(START.redHeart)) into.set(`redHeart.${key}`, value)
  for (const [key, value] of Object.entries(START.wellbeing)) into.set(`wellbeing.${key}`, value)
  for (const [who, rel] of Object.entries(START.relationships)) {
    for (const [axis, value] of Object.entries(rel as Record<string, number>)) {
      into.set(`rel.${who}.${axis}`, value as number)
    }
  }
  /**
   * הצבא והמוסד — two gauge blocks that do NOT open at zero, and the sixth dead field
   * this file measured. `blankArmy()` starts `commanderTrust` at 50 and
   * `blankInstitution()` starts both ownership trusts at 50, because a soldier and a
   * supporter both begin trusting and spend it. Seeding them at zero made Liron's drive
   * to the cup — gated at 25 — look nine points out of reach when it is open on day one.
   */
  for (const [key, value] of Object.entries(START.army as Record<string, unknown>)) {
    if (typeof value === 'number') into.set(`army.${key}`, value)
  }
  for (const [key, value] of Object.entries(START.institution as Record<string, unknown>)) {
    if (typeof value === 'number') into.set(`institution.${key}`, value)
  }
  return into
}

/**
 * One effect, routed the way `apply()` routes it.
 *
 * Two routings here are not obvious from the effect's own name and are the whole reason
 * this function exists rather than a switch on `e`:
 *
 *  · `bond` and `rel …axis:'bond'` are ONE number. `withRelationship` mirrors the axis
 *    into `state.bonds`, so `condition.bond` and `condition.relationship` with axis bond
 *    read the same field. Counting them apart made Rachel's kitchen look dead.
 *  · `trait` is not a counter at all any more. `TRAIT_ROUTE` forwards it to a personality
 *    key or a Red Heart dimension, which is how `streetSmarts` gets its points.
 */
const addEffect = (into: Ceiling, effect: Effect): void => {
  const e = effect as Record<string, unknown> & { e: string }
  switch (e.e) {
    case 'money':
      bump(into, 'agorot', e.agorot as number)
      break
    /**
     * הפחית — the tin under the bed, and the fifth way this file measured a dead field.
     *
     * `savings` is a second pocket that no condition can read: the vocabulary has
     * `minAgorot` and nothing else, so money in the tin is invisible to every gate in
     * the game until `withdraw` moves it across. Counting the tin as spendable would
     * have hidden exactly the defect this audit went on to find in `a4-shirt`, and
     * ignoring the withdrawal would have invented one. So the tin has its own counter,
     * and only the withdrawal lifts the pocket.
     */
    case 'withdraw':
      bump(into, 'agorot', e.agorot as number)
      break
    case 'save':
      bump(into, 'savings', e.agorot as number)
      break
    case 'redheart':
      bump(into, `redHeart.${e.key as string}`, e.delta as number)
      break
    case 'rel':
      bump(into, `rel.${e.who as string}.${e.axis as string}`, e.delta as number)
      break
    case 'bond':
      // the legacy surface writes the very same axis
      bump(into, `rel.${e.who as string}.bond`, e.delta as number)
      break
    case 'personality':
      bump(into, `personality.${e.key as string}`, e.delta as number)
      break
    case 'wellbeing':
      bump(into, `wellbeing.${e.key as string}`, e.delta as number)
      break
    case 'trait': {
      const route = TRAIT_ROUTE[e.trait as keyof typeof TRAIT_ROUTE]
      if (route?.personality) bump(into, `personality.${route.personality}`, e.delta as number)
      if (route?.redHeart) bump(into, `redHeart.${route.redHeart}`, e.delta as number)
      break
    }
    case 'army':
      bump(into, `army.${e.key as string}`, e.delta as number)
      break
    case 'institution':
      bump(into, `institution.${e.key as string}`, e.delta as number)
      break
    default:
      break
  }
}

/**
 * Money arrives by three doors and only one of them is a conversation. A chapter's
 * `entry` hands over the month's pocket money before the first room is drawn, and a BEAT
 * can pay directly — `a4-open` puts twelve shekels in the tin and two in the pocket
 * before the boy has said a word to anyone. Read only the conversations and the whole
 * Stage-A economy reads as empty, which is a checker that cries wolf and gets switched
 * off within a week.
 */
const addRawEvents = (into: Ceiling, events: readonly unknown[]): void => {
  for (const event of events) {
    const ev = event as { t?: string; agorot?: number }
    if (typeof ev.agorot !== 'number') continue
    if (ev.t === 'money.gained' || ev.t === 'money.changed') bump(into, 'agorot', ev.agorot)
    if (ev.t === 'savings.changed') bump(into, 'savings', ev.agorot)
  }
}

const addEntry = (into: Ceiling, chapter: string): void => {
  const def = CHAPTERS.find((c) => c.id === chapter)
  if (!def?.entry) return
  try {
    addRawEvents(into, def.entry(START) ?? [])
  } catch {
    /* a chapter whose entry needs a real state is not a money source we can read */
  }
}

const addBeats = (into: Ceiling, chapter: string): void => {
  for (const beat of (eraFor(chapter) as { beats?: readonly unknown[] }).beats ?? []) {
    const actions = (beat as { do?: unknown }).do
    for (const action of Array.isArray(actions) ? actions : []) {
      const a = action as { a?: string; events?: readonly unknown[] }
      if (a.a === 'events' && Array.isArray(a.events)) addRawEvents(into, a.events)
    }
  }
}

/**
 * The fourth door (21.9.2026): the gate games played inside the life (`lib/life/activities.ts`).
 * Their money is settled at RUNTIME — a board reports a score, `settleActivity` prices it —
 * so no conversation declares it and a reader of effects would never see it. What the file
 * does declare is the most a chapter can pay: `activityCeiling` is the best paid job (or
 * bet) plus the best paid favour, the two slots a chapter has, in the chapter's own decade.
 * And every activity open in the chapter moves its person, its Red Heart pull and its trait
 * once a chapter on completion, which is also read here from the same table.
 */
const addActivities = (into: Ceiling, chapter: string): void => {
  bump(into, 'agorot', activityCeiling(chapter))
  for (const def of ACTIVITIES) {
    if (!activityChapters(def).includes(chapter)) continue
    if (def.rel) bump(into, `rel.${def.rel.who}.${def.rel.axis}`, def.rel.delta)
    if (def.redHeart) bump(into, `redHeart.${def.redHeart.key}`, def.redHeart.delta)
    if (def.personality) bump(into, `personality.${def.personality.key}`, def.personality.delta)
  }
}

// ------------------------------------------------------------------------- what is asked for
type Ask = { chapter: string; where: string; counter: string; min: number }
const asks: Ask[] = []

const readCondition = (condition: Condition | undefined, chapter: string, where: string): void => {
  if (!condition) return
  const c = condition as Record<string, unknown>
  for (const key of ['all', 'any', 'none'] as const) {
    const parts = c[key]
    if (Array.isArray(parts)) for (const part of parts) readCondition(part as Condition, chapter, where)
  }
  const want = (counter: string, min: unknown) => {
    if (typeof min === 'number') asks.push({ chapter, where, counter, min })
  }
  want('agorot', c.minAgorot)
  const rh = c.redHeartAbove as { key?: string; min?: number } | undefined
  if (rh?.key) want(`redHeart.${rh.key}`, rh.min)
  const rel = c.relationship as { who?: string; axis?: string; min?: number } | undefined
  if (rel?.who && rel.axis) want(`rel.${rel.who}.${rel.axis}`, rel.min)
  const bond = c.bond as { who?: string; min?: number } | undefined
  if (bond?.who) want(`rel.${bond.who}.bond`, bond.min)
  const pa = c.personalityAbove as { key?: string; min?: number } | undefined
  if (pa?.key) want(`personality.${pa.key}`, pa.min)
  const wa = c.wellbeingAbove as { key?: string; min?: number } | undefined
  if (wa?.key) want(`wellbeing.${wa.key}`, wa.min)
  const aa = c.armyAbove as { key?: string; min?: number } | undefined
  if (aa?.key) want(`army.${aa.key}`, aa.min)
  const ia = c.institutionAbove as { key?: string; min?: number } | undefined
  if (ia?.key) want(`institution.${ia.key}`, ia.min)
}

// ------------------------------------------------------------------------------- the sweep
const running = seed()
const rows: Array<{ chapter: string; snapshot: Ceiling }> = []

for (const chapter of ORDER) {
  addEntry(running, chapter)
  addBeats(running, chapter)
  addActivities(running, chapter)
  for (const id of conversationsIn(chapter)) {
    for (const effect of effectsOf(id)) addEffect(running, effect)
    for (const branch of DIALOGUE[id]?.branches ?? []) {
      readCondition(branch.when, chapter, `dialogue:${id}`)
      for (const choice of branch.choices ?? []) readCondition(choice.when, chapter, `dialogue:${id}/${choice.id}`)
    }
  }
  for (const scene of ALL_SCENES) {
    for (const exit of scene.exits) {
      const byEra = (exit as { needsByEra?: Record<string, Condition | null> }).needsByEra ?? {}
      const needs = chapter in byEra ? byEra[chapter] : (exit as { needs?: Condition }).needs
      readCondition(needs ?? undefined, chapter, `${scene.id}/exit:${exit.id}`)
    }
    for (const spot of scene.hotspots) {
      if (inEra(spot, chapter)) readCondition((spot as { when?: Condition }).when, chapter, `${scene.id}/hotspot:${spot.id}`)
    }
  }
  rows.push({ chapter, snapshot: new Map(running) })
}

// ------------------------------------------------------------------------------- the report
const ceilingAt = (chapter: string, counter: string): number =>
  rows.find((r) => r.chapter === chapter)?.snapshot.get(counter) ?? 0

/** how much of the whole life's available points a gate demands before it opens */
const NARROW = Number(process.env.NARROW ?? 0.9)

type Finding = Ask & { ceiling: number }
const impossible: Finding[] = []
const narrow: Finding[] = []
const seenAsk = new Set<string>()
for (const ask of asks) {
  const key = `${ask.chapter}|${ask.where}|${ask.counter}|${ask.min}`
  if (seenAsk.has(key)) continue
  seenAsk.add(key)
  const ceiling = ceilingAt(ask.chapter, ask.counter)
  if (ask.min > ceiling) impossible.push({ ...ask, ceiling })
  else if (ceiling > 0 && ask.min >= ceiling * NARROW) narrow.push({ ...ask, ceiling })
}

if (process.env.VERBOSE) {
  console.log('\n=== תקרות מצטברות ===')
  for (const row of rows) {
    console.log(`\n--- ${row.chapter} ---`)
    for (const [counter, value] of [...row.snapshot].sort(([a], [b]) => a.localeCompare(b))) {
      console.log(`  ${counter.padEnd(34)} ≤ ${value}`)
    }
  }
}

console.log(`\n=== מה שאי אפשר להשיג (${impossible.length}) ===`)
for (const f of impossible.sort((a, b) => b.min - b.ceiling - (a.min - a.ceiling))) {
  console.log(`  [${f.chapter}] ${f.where}`)
  console.log(`      wants ${f.counter} ≥ ${f.min}, ceiling is ${f.ceiling} (short by ${f.min - f.ceiling})`)
}

console.log(`\n=== צר מאוד — פתוח רק למי שלקח הכל (${narrow.length}) ===`)
for (const f of narrow.sort((a, b) => b.min / b.ceiling - a.min / a.ceiling)) {
  console.log(`  [${f.chapter}] ${f.where}`)
  console.log(`      wants ${f.counter} ≥ ${f.min}, ceiling is ${f.ceiling} (${Math.round((f.min / f.ceiling) * 100)}% of everything)`)
}

console.log(
  impossible.length
    ? `\nFAIL — ${impossible.length} thresholds above the ceiling`
    : `\nPASS — every numeric threshold in the game is reachable (${narrow.length} narrow)`,
)
process.exit(impossible.length ? 1 : 0)
