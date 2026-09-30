import { ALL_CHARACTERS } from '../characters'
import type { Era } from '../content/era'
import {
  CLOSERS,
  FOLLOW_UPS,
  PRIVATE_FACTS,
  type FollowUp,
  type FollowUpClass,
} from '../content/followUps'
import type { Say } from '../content/script'
import type { CharacterId, LifeState } from '../types'
import { flagOn } from '../types'
import { offerNudge } from '../offers'
import { liveGraph, type LiveGraph } from './graph'
import { meets, type Condition } from './types'

/**
 * שיחה שנייה — the context-aware follow-up resolver (design pass v2 §20).
 *
 * `DialogueRunner.start` used to answer every heard, non-interactive branch with one of
 * five canned sentences ("כבר דיברתם על זה היום"). A friend who told you to go home and
 * ask your mother answered the next visit with "nothing new to add" while the "?" sheet
 * said "רשות מאמא". This file is the one seam that replaces that — and it is deliberately
 * small: authored lines (`content/followUps.ts`), keyed on the conversation that was
 * repeated and on the checklist step the live graph (`graph.ts`) says is the main action,
 * filtered by what that speaker could possibly know.
 *
 * The order is §20.2's, as a priority list:
 *
 *   1. a newly valid authored branch — handled BEFORE this file: `start()` only asks here
 *      when the branch it landed on was already sat through;
 *   2. REACTION — something changed since the last talk (heard once, then it is old news);
 *   3. DEADLINE — a real clock this person would mention;
 *   4. RECOVERY — the handoff was already given and the player is back: say it plainer;
 *   5. HANDOFF / CHECK-IN — point at the step the graph is on, or ask whether it happened;
 *   6. CLOSED — this conversation's own closing line, then this person's own;
 *   7. only then the generic pool.
 *
 * Nothing here writes a new objective: a follow-up that names a `step` is only eligible
 * while THAT step is the graph's main action, so a line can never point anywhere the
 * sheet, the flow layer and the map do not already point.
 */

export type FollowUpPick = {
  /** the follow-up's id, or `closer:<who>` / `generic` */
  id: string
  cls: FollowUpClass
  lines: Say[]
  /** raised when the box is read to the end; null for closers, which may repeat forever */
  flag: string | null
  generic: boolean
}

/** a follow-up that was read to its end — chapter-local, so a new day starts fresh */
export const followUpFlag = (id: string) => `fu:${id}`

/** the boy's own name in the content — his lines are never "the person being talked to" */
export const PLAYER_WHO = 'פוגי'

/** the character id behind a spoken name ("אופיר" → "ofir"), or null for narration / an unregistered role */
export function speakerIdOf(who: string | null | undefined): CharacterId | null {
  if (!who) return null
  const entry = ALL_CHARACTERS.find(
    (character) => character.id === who || character.displayNameHe === who || (character.aliases ?? []).includes(who),
  )
  return entry ? entry.id : null
}

/** the first person in these lines who is not the boy himself — the one being talked to */
export function speakerOf(lines: readonly Say[], fallback?: string | null): string | null {
  for (const line of lines) if (line.who && line.who !== PLAYER_WHO) return line.who
  return fallback ?? null
}

/** every flag a condition needs to be RAISED — what it asserts happened (none/notFlag assert nothing) */
export function assertedFlags(condition: Condition | undefined): string[] {
  if (!condition) return []
  const out: string[] = []
  if (condition.flag) out.push(condition.flag)
  if (condition.flagIs && condition.flagIs.value !== false) out.push(condition.flagIs.flag)
  for (const part of condition.all ?? []) out.push(...assertedFlags(part))
  for (const part of condition.any ?? []) out.push(...assertedFlags(part))
  return out
}

/**
 * NPCs are never psychic (§20.3). A follow-up that asserts a private fact — the mother's
 * answer, how the homework really went, a note left under a cup — is allowed only when the
 * speaker witnessed it, or when its `knows` holds (the world established that he heard).
 */
export function knowsEnough(state: LifeState, followUp: FollowUp, speaker: CharacterId | null): boolean {
  if (followUp.knows && !meets(state, followUp.knows)) return false
  // the boy says it himself in the first line: the speaker learns it from him, on screen
  if (followUp.knows || followUp.toldBy === 'player') return true
  for (const flag of assertedFlags(followUp.when)) {
    const witnesses = PRIVATE_FACTS[flag]
    if (!witnesses) continue
    if (!speaker || !witnesses.includes(speaker)) return false
  }
  return true
}

const inChapter = (followUp: FollowUp, chapter: string) =>
  typeof followUp.chapter === 'string' ? followUp.chapter === '*' || followUp.chapter === chapter : followUp.chapter.includes(chapter)

const onStep = (followUp: FollowUp, step: string | null) => {
  if (followUp.step === undefined) return true
  if (step === null) return false
  return typeof followUp.step === 'string' ? followUp.step === step : followUp.step.includes(step)
}

/** index once: conversation id → its follow-ups, and person → his, in authored order */
const BY_CONVERSATION = new Map<string, FollowUp[]>()
const BY_NPC = new Map<string, FollowUp[]>()
const push = (map: Map<string, FollowUp[]>, key: string, followUp: FollowUp) => {
  const list = map.get(key) ?? []
  list.push(followUp)
  map.set(key, list)
}
for (const followUp of FOLLOW_UPS) {
  for (const id of followUp.on ?? []) push(BY_CONVERSATION, id, followUp)
  const npcs = followUp.npc === undefined ? [] : typeof followUp.npc === 'string' ? [followUp.npc] : followUp.npc
  for (const npc of npcs) push(BY_NPC, npc, followUp)
}

/** every follow-up that could answer this conversation in this person's mouth: his conversation's own first, then his */
export const followUpsFor = (conversationId: string, speaker: CharacterId | null = null): readonly FollowUp[] => [
  ...(BY_CONVERSATION.get(conversationId) ?? []),
  ...(speaker ? (BY_NPC.get(speaker) ?? []).filter((followUp) => !(followUp.on ?? []).includes(conversationId)) : []),
]

function hash(text: string): number {
  let value = 0
  for (let i = 0; i < text.length; i += 1) value = (value * 31 + text.charCodeAt(i)) | 0
  return Math.abs(value)
}

/**
 * The last resort, and the sentences it used to be the FIRST resort. A person gets the old
 * pool (the matrix fixture records every place it still fires); a thing gets a line that a
 * thing can say — a poster does not "nod at you".
 */
export const GENERIC_PERSON_HE: readonly string[] = [
  'כבר דיברתם על זה היום.',
  'אין חדש להוסיף — כבר סיפר לך.',
  'מהנהן לעברך. כבר עברתם על זה.',
  'מחייך אליך, בלי לחזור על עצמו.',
  'אותו דבר כמו קודם. ממשיכים הלאה.',
]
export const GENERIC_THING_HE: readonly string[] = [
  'שום דבר לא השתנה כאן מאז.',
  'אותו דבר כמו קודם.',
  'ראית את זה כבר. זה עדיין שם.',
]

/** what the player heard on a repeat before this resolver existed — the matrix's "today" column */
export function legacyRepeatLine(conversationId: string): string {
  return GENERIC_PERSON_HE[hash(conversationId) % GENERIC_PERSON_HE.length] as string
}

const ORDER: Record<FollowUpClass, number> = { REACTION: 0, DEADLINE: 1, RECOVERY: 2, HANDOFF: 3, 'CHECK-IN': 3, CLOSED: 4 }

/**
 * What a repeat of this conversation says now. Pure over the state: the same save, reloaded,
 * gets the same answer (the heard flags are in the log like everything else).
 */
export function resolveFollowUp(
  state: LifeState,
  era: Era,
  conversationId: string,
  who: string | null,
  graph: LiveGraph = liveGraph(state, era),
): FollowUpPick {
  const speaker = speakerIdOf(who)
  const heard = (followUp: FollowUp) => flagOn(state, followUpFlag(followUp.id))
  const candidates = followUpsFor(conversationId, speaker).filter(
    (followUp) =>
      inChapter(followUp, state.chapter) &&
      onStep(followUp, graph.mainStep) &&
      meets(state, followUp.when) &&
      knowsEnough(state, followUp, speakerIdOf(speakerOf(followUp.lines, who))),
  )

  const eligible = candidates.filter((followUp) => {
    // a reaction is news once; after that it is the old conversation again
    if (followUp.cls === 'REACTION') return !heard(followUp)
    // plainer words only for somebody who already got the handoff on this same step
    if (followUp.cls === 'RECOVERY') {
      return candidates.some((other) => (other.cls === 'HANDOFF' || other.cls === 'CHECK-IN') && heard(other))
    }
    return true
  })
  // by class; within a class the authored order stands (a conversation's own lines before the person's)
  eligible.sort((a, b) => ORDER[a.cls] - ORDER[b.cls])
  const best = eligible[0]
  if (best) {
    return { id: best.id, cls: best.cls, lines: [...best.lines], flag: best.cls === 'CLOSED' ? null : followUpFlag(best.id), generic: false }
  }

  /**
   * אם אתה מחפש כמה שקלים (delta 90, §22.4.2) — nothing authored applies and the story is
   * not waiting on the boy (no story step is the main action: the day is between beats), so
   * a person who has nothing new to say mentions today's work instead of "that's all": the
   * first open paid job in a place this life already knows, away from where he stands
   * (`offers.ts` — never a job the street does not have, never one in an unknown place).
   * Said once per job per chapter; after that he closes in his own voice again. Never on a
   * story step, so it can never mask a critical handoff (§26).
   */
  if (speaker && who && graph.mainStep === null) {
    const nudge = offerNudge(state, who)
    const flag = nudge ? followUpFlag(`offer:${nudge.id}`) : null
    if (nudge && flag && !flagOn(state, flag)) {
      return { id: `offer:${nudge.id}`, cls: 'HANDOFF', lines: [{ who, text: nudge.textHe }], flag, generic: false }
    }
  }

  // a person's own way of saying "that's all" — in his voice, the same one each time for this conversation
  const own = speaker ? CLOSERS[speaker] : undefined
  if (own && own.length && who) {
    const text = own[hash(conversationId) % own.length] as string
    return { id: `closer:${speaker}`, cls: 'CLOSED', lines: [{ who, text }], flag: null, generic: false }
  }

  const pool = who ? GENERIC_PERSON_HE : GENERIC_THING_HE
  const text = who ? legacyRepeatLine(conversationId) : (pool[hash(conversationId) % pool.length] as string)
  return { id: 'generic', cls: 'CLOSED', lines: [{ who, text }], flag: null, generic: true }
}
