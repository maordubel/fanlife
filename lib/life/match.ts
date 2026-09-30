import type { HistoricalAnchor } from './anchors'

/**
 * שעון המשחק — the ninety minutes, as a pure function of the day's clock.
 *
 * The chapter has one clock: minutes since midnight, folded from the event log. A match
 * has a different clock — nought to ninety with a quarter of an hour of nothing in the
 * middle — and until this pass the game did not have one at all. It ran the day clock
 * forward at twenty-six times speed until full time and called that a match, which is
 * fine for a scene the player watches from the street and useless for the scene this
 * chapter has been building towards since the first line of it.
 *
 * So: one function, no state, no engine. Give it the day's minute and it says which part
 * of the match is happening and what the scoreboard would read. That makes the whole
 * final testable without a browser — `tests/life-systems.test.ts` walks every minute of
 * the afternoon through it — and it means the SCENE never does arithmetic. The scene asks
 * what minute it is and draws that.
 *
 * The shape is deliberately the real one. A match is not ninety minutes long: it is
 * forty-five, then a break in which nothing happens and everybody talks, then forty-five
 * more. The break is why the second half starts at minute 45 on a clock that has already
 * run for an hour, and reproducing that is most of what makes a scoreboard feel real.
 */

export type MatchPhase = 'before' | 'first' | 'half' | 'second' | 'after'

export const HALF_LENGTH = 45
/** Fifteen minutes in which the match clock does not move. */
export const INTERVAL = 15

export type MatchClock = {
  phase: MatchPhase
  /** 0–90, the number a scoreboard shows */
  minute: number
  /** what the strip prints: a number, or the word for the break */
  labelHe: string
}

export function matchClock(dayMinute: number, kickoff: number): MatchClock {
  const since = dayMinute - kickoff
  if (since < 0) return { phase: 'before', minute: 0, labelHe: '' }
  if (since < HALF_LENGTH) return { phase: 'first', minute: Math.floor(since), labelHe: `${Math.floor(since)}'` }
  if (since < HALF_LENGTH + INTERVAL) return { phase: 'half', minute: HALF_LENGTH, labelHe: 'מחצית' }
  const second = since - INTERVAL
  if (second < HALF_LENGTH * 2) return { phase: 'second', minute: Math.floor(second), labelHe: `${Math.floor(second)}'` }
  return { phase: 'after', minute: HALF_LENGTH * 2, labelHe: 'סיום' }
}

/** The day-clock minute at which a given match minute happens. The inverse of the above. */
export function dayMinuteOf(matchMinute: number, kickoff: number): number {
  return kickoff + matchMinute + (matchMinute >= HALF_LENGTH ? INTERVAL : 0)
}

/**
 * How fast the afternoon should run, given where in the match it is.
 *
 * This is the whole pacing of the final and it is four numbers, because the alternative —
 * scattering `timeScale = n` through a scene class — is how a game ends up with a match
 * that is over before the player has looked up.
 *
 * Nothing interesting happens for eighty minutes, so eighty minutes cost about four
 * seconds. Then the game slows to something near a heartbeat for the six minutes before
 * the goal, which is the only part of the match anybody has ever described to anybody.
 * The goal itself is not on this scale at all: time stops, and the scene plays it.
 */
export function matchPace(matchMinute: number, goalMinute: number): number {
  if (matchMinute >= goalMinute) return 8
  if (matchMinute >= goalMinute - 6) return 1.2
  if (matchMinute >= goalMinute - 20) return 9
  return 26
}

/**
 * מה שאפשר לכתוב על הלוח — the scoreboard, built from the archive and nothing else.
 *
 * The club's own name is the one string in this file that is not canonical, and it is a
 * constant rather than a lookup for the same reason the crest is not fetched: this is a
 * product about one club and the day it stops being about that club is not a day a lookup
 * saves. Everything else — the opponent, the score, the minute of the goal, the name of
 * the person who scored it — comes off `anchor.match`, which came off `content/manual`.
 */
export const US_HE = 'הפועל תל אביב'

export type Scoreboard = {
  homeHe: string
  awayHe: string
  homeScore: number
  awayScore: number
}

export function scoreboardAt(anchor: HistoricalAnchor, goalScored: boolean): Scoreboard | null {
  const match = anchor.match
  if (!match) return null
  const ours = goalScored ? match.scoredFor : 0
  const theirs = goalScored ? match.scoredAgainst : 0
  return match.atHome
    ? { homeHe: US_HE, awayHe: match.opponentHe, homeScore: ours, awayScore: theirs }
    : { homeHe: match.opponentHe, awayHe: US_HE, homeScore: theirs, awayScore: ours }
}

/**
 * The minute the game holds its breath on.
 *
 * Falls back to full time when the archive holds a result but no scorer, which is the
 * truthful shape of "we know who won and not who scored" — the scene then plays a final
 * whistle rather than a goal, and states nothing it cannot back.
 */
export function decidingMinute(anchor: HistoricalAnchor): number | null {
  return anchor.match?.decidedBy?.minute ?? null
}
