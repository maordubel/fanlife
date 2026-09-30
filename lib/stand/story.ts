import type { MessageKey } from '@/lib/i18n'

import { publicName, type PairFacts, type StandHome } from './contract'
import type { Station } from './week'

/**
 * The stand's words — every line composed from a count the database answered, never from
 * a guess (§58.12: no fake counts). Client-safe and pure, so the tests can hold it to that.
 *
 * The headline is a GROUP story (§8.3, §30): "8 מהיציע שיחקו", "כולכם זיהיתם". A ranking,
 * when there is one, sits underneath and is compact; there is no winner line at all.
 */

export type Line = { key: MessageKey; vars?: Record<string, string> }

const n = (value: number) => String(value)

/** The group result of the day, strongest line first. Empty only when nobody played. */
export function groupStory(home: StandHome): Line[] {
  const out: Line[] = []
  const { played, all3 } = home.today
  if (played === 0) return [{ key: 'stand.story.quiet' }]
  out.push(played === 1 ? { key: 'stand.story.playedOne' } : { key: 'stand.story.played', vars: { n: n(played) } })
  const bc = home.blindCow
  if (bc.mine) {
    if (bc.finished >= 2 && bc.solved === bc.finished) out.push({ key: 'stand.story.bcAll' })
    else if (bc.solved === 0) out.push({ key: 'stand.story.bcNone' })
    else out.push({ key: 'stand.story.bcSolved', vars: { n: n(bc.solved), m: n(bc.finished) } })
    if (bc.early > 0) out.push({ key: 'stand.story.bcEarly', vars: { n: n(bc.early) } })
  }
  if (all3 >= 2) out.push({ key: 'stand.story.all3', vars: { n: n(all3) } })
  if (home.debate.mine && home.debate.voters >= 2) {
    out.push(home.debate.tally.length === 1 ? { key: 'stand.debate.agree' } : { key: 'stand.debate.split' })
  }
  return out
}

/** "עוד N מהיציע לא נכנסו לזה" — soft, and silent when everybody is in. */
export function notYetLine(home: StandHome): Line | null {
  const rest = home.members - home.today.played
  if (home.members < 2) return null
  if (rest <= 0) return { key: 'stand.today.allIn' }
  return rest === 1 ? { key: 'stand.today.notYetOne' } : { key: 'stand.today.notYet', vars: { n: n(rest) } }
}

export type Objective = { key: MessageKey; have: number; need: number; done: boolean }

/** §32 — group objectives built from real actions only. */
export function objectives(home: StandHome, program: readonly Station[]): Objective[] {
  const need5 = Math.min(5, Math.max(2, home.members))
  const covered = program.filter((s) => (home.week.stations[s.id] ?? 0) > 0).length
  const voters = home.debate.voters
  const list: Objective[] = [
    { key: 'stand.coop.five', have: Math.min(home.week.players, need5), need: need5, done: home.week.players >= need5 },
    { key: 'stand.coop.stations', have: covered, need: program.length, done: program.length > 0 && covered === program.length },
    { key: 'stand.coop.cow', have: Math.min(home.week.solved, 10), need: 10, done: home.week.solved >= 10 },
  ]
  if (home.members >= 2) {
    list.push({ key: 'stand.coop.debate', have: Math.min(voters, home.members), need: home.members, done: voters >= home.members })
  }
  return list
}

/** §33 — what two people share, said as facts about them. Never a win-loss line. */
export function pairLines(pair: PairFacts): Line[] {
  const name = publicName(pair.no, pair.nick)
  const out: Line[] = []
  if (pair.sameRuns > 0) out.push({ key: 'stand.pairs.same', vars: { n: n(pair.sameRuns) } })
  if (pair.daysBoth > 0) out.push({ key: 'stand.pairs.days', vars: { n: n(pair.daysBoth) } })
  if (pair.theyEarlier > pair.youEarlier && pair.theyEarlier > 0) {
    out.push({ key: 'stand.pairs.theyEarlier', vars: { name, n: n(pair.theyEarlier) } })
  } else if (pair.youEarlier > pair.theyEarlier) {
    out.push({ key: 'stand.pairs.youEarlier', vars: { n: n(pair.youEarlier) } })
  } else if (pair.bcBoth > 0) {
    out.push({ key: 'stand.pairs.bcEven', vars: { n: n(pair.bcBoth) } })
  }
  if (pair.debatesBoth > 0) out.push({ key: 'stand.pairs.agree', vars: { n: n(pair.debatesAgree), m: n(pair.debatesBoth) } })
  return out
}

/** The week's recap line: the stand's own, or the solo one (§31 works alone too). */
export function weekRecap(home: StandHome | null, mine: number, total: number): Line[] {
  const out: Line[] = [{ key: home && home.members >= 2 ? 'stand.week.recap' : 'stand.week.recapSolo' }]
  const left = total - mine
  if (left === 0 && total > 0) out.push({ key: 'stand.week.allMine' })
  else if (left === 1) out.push({ key: 'stand.week.leftOne' })
  else if (left > 1) out.push({ key: 'stand.week.left', vars: { n: n(left) } })
  if (home && home.week.closedAll > 0 && home.members >= 2) out.push({ key: 'stand.week.closedAll', vars: { n: n(home.week.closedAll) } })
  return out
}
