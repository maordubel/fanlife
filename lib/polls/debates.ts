import bank from '@/content/manual/terrace-debates.json'
import type { MessageKey } from '@/lib/i18n'
import type { RosterFilter } from '@/lib/game/roster-search'
import {debateDeck as engineDeck,debateRound as engineRound} from './debate-engine'

/**
 * שער 7 · ב׳ — הוויכוח של היציע (ONE RED WORLD §16, P0.3, 28.9.2026).
 *
 * The wing is two things that were one screen: **הכרטיס שלי**, the eight stable
 * questions that ARE the supporter (`lib/polls/ballot.ts`, untouched), and this — a
 * rotating handful of debates that exist to be argued about. The first is a profile and
 * must never change under you; the second is the reason to come back, and must.
 *
 * The bank is `content/manual/terrace-debates.json`: opinion questions only. No prompt
 * states a fact, a number or a date, and no real person is given a line — the answer is
 * the supporter's, and the question is the terrace's. A `roster` prompt is answered from
 * the WHOLE roster through the shared `RosterSheet` (with an optional filter chip the voter
 * can remove, the same rule `QUESTION_FILTER` keeps); a `match` / `season` prompt names an
 * option SOURCE, and the options are read from the masters on the server
 * (`lib/polls/debates-server.ts`) — never typed here.
 *
 * Rotation is the house engine (`lib/rotation/deck.ts`): one seeded shuffle of the bank is
 * a deck, the cursor walks it in slices of `DEBATE_ROUND`, and nothing repeats until the
 * bank is used up. Client-safe on purpose: the screen needs the same arithmetic to say
 * which slice it is on.
 */

export type DebateKind = 'roster' | 'match' | 'season'

/** where a non-roster prompt's options come from — each one is a read of a master */
export type DebateOptionSource = 'cup-finals' | 'europe-wins' | 'derby-wins' | 'league-titles' | 'state-cups'

export type Debate = {
  id: string
  promptHe: string
  kind: DebateKind
  filter?: Partial<Pick<RosterFilter, 'position' | 'origin'>>
  options?: DebateOptionSource
}

/** one answer on a fixed list — an id the master minted and a label it printed */
export type DebateOption = { id: string; labelHe: string; subHe: string | null }

/** what the screen receives: the prompt, and for a list prompt its resolved options */
export type DebateView = Debate & { choices: DebateOption[] | null }

/** prompts per rotation — the spec asks for four to six */
export const DEBATE_ROUND = 5

export const DEBATES: readonly Debate[] = (bank as { debates: Debate[] }).debates

/** the key a debate vote is cast under in the shared tally (`worker_poll_vote.question_id`) */
export function debateQuestionId(id: string): string {
  return `debate:${id}`
}

/** the four "why" chips (§16) — the voter's own, never sent anywhere */
export const DEBATE_REASONS: readonly { id: string; he: MessageKey }[] = [
  // the words are the Red Voice's (ONE RED WORLD §16), one home for gate 7's lines
  { id: 'saw', he: 'voice.g7.act.why.saw' },
  { id: 'father', he: 'voice.g7.act.why.dad' },
  { id: 'just-him', he: 'voice.g7.act.why.him' },
  { id: 'moment', he: 'voice.g7.act.why.moment' },
]

export function isDebateReason(value: string): boolean {
  return DEBATE_REASONS.some((reason) => reason.id === value)
}

export type {DebateRound} from './debate-engine'
export function debateDeck(seed:number,pool:readonly Debate[]=DEBATES){return engineDeck(seed,pool)}
export function debateRound(seed:number,cursor:number,pool:readonly Debate[]=DEBATES){return engineRound(seed,cursor,pool)}
