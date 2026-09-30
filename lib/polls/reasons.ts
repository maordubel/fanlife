import type { MessageKey } from '@/lib/i18n'

import { BALLOT } from './ballot'

/**
 * שבבי ה"למה" — why you voted the way you voted.
 *
 * Gate 7 has no right answer, which leaves it with a problem the other gates do not
 * have: a ballot full of names is eight facts about your taste and nothing about YOU.
 * The reference solves it with one small control — after a pick, three or four chips
 * offering a reason — and it is the single best idea in that file, because the reason is
 * the part a supporter would actually say out loud.
 *
 * Three decisions here, and each is the reason this is a module rather than an array in
 * a component:
 *
 *  · **A reason is a KEY, never free text.** What is stored is `poll.why.striker.nerve`,
 *    not the Hebrew. A catalogue edit then reaches every saved slip instead of orphaning
 *    it, no typed sentence ever enters storage, and — the one that matters — a reason can
 *    never become a claim about a named person. "קור רוח" is a sentence about the voter's
 *    memory; a free field beside a footballer's name is a place for anything at all, and
 *    rule 18's line about never publishing an unsourced claim about a named person would
 *    have to be enforced by moderation rather than by construction.
 *  · **A reason is OPTIONAL and singular.** One chip per question, tapped again to clear
 *    it. A slip with no reasons is a finished slip and says so on the card.
 *  · **A reason is never counted.** It is not sent to `worker_poll_vote`, it is not tallied, and
 *    no screen prints a proportion of it. See the note in `lib/polls/store.ts` — the
 *    table holds `(device_id, question_id, pick)` and the count board would need a
 *    hundred ballots per reason before it could honestly print anything, which is a
 *    number this wing does not have and does not pretend to (rule 11).
 *
 * The wording is the voter's own voice about the voter — "מהילדות", "זה אני" — and never
 * about the player. That is what keeps eight opinions from turning into eight unsourced
 * assertions.
 */
export const REASONS: Record<string, readonly MessageKey[]> = {
  favourite: [
    'poll.why.favourite.childhood',
    'poll.why.favourite.moment',
    'poll.why.favourite.mostHapoel',
    'poll.why.favourite.howHePlayed',
  ],
  keeper: [
    'poll.why.keeper.calm',
    'poll.why.keeper.oneGame',
    'poll.why.keeper.character',
    'poll.why.keeper.nostalgia',
  ],
  centreback: [
    'poll.why.centreback.leader',
    'poll.why.centreback.hard',
    'poll.why.centreback.clever',
    'poll.why.centreback.childhood',
  ],
  midfield: [
    'poll.why.midfield.throughHim',
    'poll.why.midfield.heart',
    'poll.why.midfield.technique',
    'poll.why.midfield.bigNights',
  ],
  striker: [
    'poll.why.striker.oneGoal',
    'poll.why.striker.nerve',
    'poll.why.striker.style',
    'poll.why.striker.myMan',
  ],
  foreign: [
    'poll.why.foreign.neverForgot',
    'poll.why.foreign.different',
    'poll.why.foreign.europeanNight',
    'poll.why.foreign.fromTheStart',
  ],
  number: ['poll.why.number.childhood', 'poll.why.number.aPlayer', 'poll.why.number.justMine'],
  position: ['poll.why.position.thatIsMe', 'poll.why.position.alwaysPlayed', 'poll.why.position.wouldWant'],
}

/** questionId → the reason key marked for it. Absent means none, which is a finished answer. */
export type Reasons = Record<string, MessageKey>

export function reasonsFor(questionId: string): readonly MessageKey[] {
  return REASONS[questionId] ?? []
}

/**
 * Is this a reason this question actually offers?
 *
 * The gate on everything that comes back out of storage. A slip saved by an older build
 * can carry a key this build no longer offers — or a key belonging to a different
 * question — and printing it on the supporter's card would put a sentence under a name
 * that nothing on screen ever offered them.
 */
export function isReasonOf(questionId: string, key: string): key is MessageKey {
  return reasonsFor(questionId).some((reason) => reason === key)
}

/** Drop everything that is not a live question with a live reason on it. */
export function cleanReasons(raw: Record<string, unknown>): Reasons {
  const known = new Set(BALLOT.map((question) => question.id))
  const out: Reasons = {}
  for (const [id, value] of Object.entries(raw)) {
    if (!known.has(id)) continue
    if (typeof value !== 'string') continue
    if (!isReasonOf(id, value)) continue
    out[id] = value
  }
  return out
}

/** how many of the eight carry a reason */
export function reasonCount(reasons: Reasons): number {
  return BALLOT.filter((question) => reasons[question.id] !== undefined).length
}
