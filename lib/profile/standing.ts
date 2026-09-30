import { PLAYABLE_GATES } from '@/lib/gates'
import { wallStat } from '@/lib/profile/gate-id'
import {
  gatesTouched,
  streak,
  totalCorrect,
  totalPlays,
  type Profile,
} from '@/lib/profile/store'
import type { MessageKey } from '@/lib/i18n'

/**
 * המעמד — a supporter's standing, and the only ladder in this product.
 *
 * `lib/game/member.ts` says it and it still holds: **the profile is not a scoreboard**,
 * and nothing on the card can be bought. So the ladder is not points. It is made of the
 * three things that actually describe somebody who keeps coming back:
 *
 *   · **days** you turned up — worth the most, because turning up is the whole thing;
 *   · **gates** you have been through — breadth, so the ladder cannot be climbed by
 *     grinding one quiz;
 *   · **rounds** you finished — volume, worth the least.
 *
 * The rungs are a season ticket's own vocabulary rather than bronze/silver/gold, and
 * the top one is the terrace. None of them unlocks anything: a rank that gates content
 * turns a supporter's history into a paywall with extra steps, and the banned-mechanics
 * list this project already keeps (no energy, no timers, no daily-login pressure) is
 * the same instinct.
 *
 * Which is exactly why the rank is the right thing to put next to "save your card": the
 * pull to register is *this is mine and I do not want to lose it*, not *pay to advance*.
 */

export type Rank = {
  id: 'visitor' | 'single' | 'member' | 'regular' | 'seat' | 'terrace'
  key: MessageKey
  at: number
}

export const RANKS: Rank[] = [
  { id: 'visitor', key: 'member.rank.visitor', at: 0 },
  { id: 'single', key: 'member.rank.single', at: 1 },
  { id: 'member', key: 'member.rank.member', at: 12 },
  { id: 'regular', key: 'member.rank.regular', at: 35 },
  { id: 'seat', key: 'member.rank.seat', at: 80 },
  { id: 'terrace', key: 'member.rank.terrace', at: 160 },
]

export function standingScore(profile: Profile): number {
  return profile.days.length * 3 + gatesTouched(profile) * 2 + totalPlays(profile)
}

export function rankOf(profile: Profile): { now: Rank; next: Rank | null; toGo: number } {
  const score = standingScore(profile)
  let now = RANKS[0] as Rank
  for (const rank of RANKS) if (score >= rank.at) now = rank
  const next = RANKS.find((rank) => rank.at > score) ?? null
  return { now, next, toGo: next ? next.at - score : 0 }
}

/**
 * The card's five figures, worked out in one place so no screen computes its own.
 * `correct` leads, because it is the only one of the five that is about the archive
 * rather than about the app.
 */
export function cardFigures(profile: Profile) {
  return {
    correct: totalCorrect(profile),
    plays: totalPlays(profile),
    days: profile.days.length,
    streak: streak(profile),
    // Counted over the PLAYABLE gates only, and both halves of the fraction come from
    // the same list. `gatesTouched` used to count every key in `profile.gates` — which
    // included `/derby/file`, a screen that is not on the wall — so a device could print
    // "8 מתוך 11" with seven plates lit. Both numbers now answer the same question.
    //
    // And each plate is read through `wallStat`, which folds every id that rolls up to
    // it: `/trivia/europe` lights gate 2, and the Royal Rumble's old slash-less ids light
    // gate 9 — which until 21.9.2026 nothing did, so the wall topped out at 11 of 12.
    gates: PLAYABLE_GATES.filter((gate) => wallStat(profile, gate.href).plays > 0).length,
    ofGates: PLAYABLE_GATES.length,
  }
}

/**
 * מה הלאה — three things this device has not done, newest ground first.
 *
 * Not a quest log and not a daily task list: those are the retention mechanics this
 * project bans by name. It is a reading of what is simply still unopened, which is the
 * honest version of the same idea — a wall with three plates still dark on it says what
 * is left without asking anybody to come back at six o'clock.
 */
export function stillToDo(profile: Profile, limit = 3) {
  return PLAYABLE_GATES.filter((gate) => wallStat(profile, gate.href).plays === 0).slice(0, limit)
}

/**
 * `gateId` lives in `lib/profile/gate-id.ts` now, beside `wallGate` and the aliases,
 * because `lib/profile/store.ts` needs it too and this file imports the store.
 * Re-exported so every existing import keeps working.
 */
export { gateId } from '@/lib/profile/gate-id'
