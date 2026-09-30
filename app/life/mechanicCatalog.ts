import 'server-only'

import { lifeBox } from '@/lib/archive/wing'
import { rosterIndex } from '@/lib/game/allTimeXI'
import { goalYears } from '@/lib/game/goal'
import { wallPool } from '@/lib/game/hate'
import { kitYears } from '@/lib/game/kitBuild'
import { lineupYears } from '@/lib/game/lineup'
import { buildRound } from '@/lib/game/memory'
import { rumbleDepth } from '@/lib/game/royal-rumble'
import { windowedQuestionCount } from '@/lib/game/trivia'
import type { MechanicCatalog } from '@/lib/mechanics/types'
import { BALLOT } from '@/lib/polls/ballot'

/**
 * מה יש בארכיון לפני כל שנה — resolved once on the server, handed to the life as a plain
 * object, like the anchors (rule 39: the life never reads the archive itself).
 *
 * Two kinds of fact, and neither is an answer:
 *
 *  · `items` — the rows a pinned mechanic can be about, as an id and a year: a lineup's
 *    match (`m_…`), a goal (`/goal?g=` carries the same id), a shirt (`kit-…`), a poll
 *    question. The life picks one dated before its own year and the gate deals it.
 *  · `ready` — for a pooled mechanic, the first year at which a windowed deal holds a full
 *    round. Before it the room offers the ordinary afternoon, never an empty board.
 *
 * Computed by asking the engines themselves (the same window functions the deals use), so
 * this file can never disagree with what a deal would do.
 */

const FIRST = 1930
const LAST = 2027

/** the first `before` at which `holds` says a round exists — scanning the years once */
function firstYear(holds: (before: number) => boolean): number | undefined {
  for (let year = FIRST; year <= LAST; year += 1) if (holds(year)) return year
  return undefined
}

let cached: MechanicCatalog | null = null

export function resolveMechanicCatalog(): MechanicCatalog {
  if (cached) return cached
  const ready: MechanicCatalog['ready'] = {}
  const put = (key: keyof MechanicCatalog['ready'], year: number | undefined) => {
    if (year !== undefined) ready[key] = year
  }
  put('trivia', firstYear((before) => windowedQuestionCount({ before, maxDifficulty: 2 }) >= 5))
  put('memoryChallenge', firstYear((before) => buildRound(1, 4, 0, { before }).pairs.length >= 4))
  put('royalRumble', firstYear((before) => rumbleDepth({ before }) >= 6))
  put('hateHistory', firstYear((before) => wallPool({ before, sport: 'basketball' }).length >= 3))
  put('allTimeXI', firstYear((before) => rosterIndex({ before }).all.length >= 22))
  put('poll', firstYear((before) => rosterIndex({ before }).all.length >= 22))
  put('archive', firstYear((before) => lifeBox(1, before).length >= 3))

  cached = {
    items: {
      lineupQuiz: lineupYears(),
      goalReconstruction: goalYears(),
      shirtDesigner: kitYears(),
      poll: BALLOT.map((question) => ({ id: question.id, year: 0 })),
    },
    ready,
  }
  return cached
}
