import type { MessageKey } from '@/lib/i18n'

import type { ChallengeResult } from './contract'
import { figureOf, figureText } from './score'

/**
 * COMPARE — agreement, disagreement and memory patterns, not a winner (§1.2, §33).
 * Client-safe and pure.
 *
 * Both results are HASHED (`create.ts#hashResult`): the challenger's arrived that way and
 * the gate's own is hashed by `CompareCard` before it gets here. Names come back only
 * through `names` (hash → name) from the gate's own roster, never from the link.
 *
 * The rules this file keeps:
 *   · **Only what both actually did.** Two results of different shapes — another deck,
 *     another board, another variant — compare nothing and answer null.
 *   · **No winner headline.** Lines are patterns ("שניכם נפלתם על אותה שאלה"); the rows
 *     put the two figures side by side and let the reader do the rest. Gate 10 is the
 *     reference (§19): "אתה: 3 רמזים · הוא: 2 רמזים", and nothing above it.
 *   · **No invented statistic.** Every number here is counted from the two results.
 */

export type CompareLine = { key: MessageKey; vars?: Record<string, string> }
export type CompareRow = { label: CompareLine; mine: string; theirs: string }

export type CompareOut = {
  gate: ChallengeResult['gate']
  lines: CompareLine[]
  rows: CompareRow[]
  /** entity hashes, for a gate that wants to draw its own chips (XI, rumble) */
  ids?: { shared: string[]; onlyMine: string[]; onlyTheirs: string[] }
  /** gate 8: the two routes per goal, zones in the order they were played */
  overlay?: { mine: number[][]; theirs: number[][] }
}

const k = (key: string, vars?: Record<string, string>): CompareLine =>
  vars ? { key: key as MessageKey, vars } : { key: key as MessageKey }

function sets(mine: readonly string[], theirs: readonly string[]) {
  const a = new Set(mine)
  const b = new Set(theirs)
  return {
    shared: mine.filter((h) => b.has(h)),
    onlyMine: mine.filter((h) => !b.has(h)),
    onlyTheirs: theirs.filter((h) => !a.has(h)),
  }
}

/** Positions both got wrong / both right / only one of them right. */
function marksPattern(mine: readonly boolean[], theirs: readonly boolean[]) {
  const bothWrong: number[] = []
  let bothRight = 0
  let onlyMine = 0
  let onlyTheirs = 0
  mine.forEach((m, i) => {
    const t = theirs[i] as boolean
    if (!m && !t) bothWrong.push(i)
    else if (m && t) bothRight += 1
    else if (m) onlyMine += 1
    else onlyTheirs += 1
  })
  return { bothWrong, bothRight, onlyMine, onlyTheirs }
}

function figureRow(label: CompareLine, mine: ChallengeResult, theirs: ChallengeResult): CompareRow | null {
  const a = figureText(mine)
  const b = figureText(theirs)
  return a !== null && b !== null ? { label, mine: a, theirs: b } : null
}

function rowsOf(...rows: (CompareRow | null)[]): CompareRow[] {
  return rows.filter((row): row is CompareRow => row !== null)
}

/**
 * The comparison, or null when the two did not play the same thing. `names` maps an
 * entity hash to the name the gate prints for it.
 */
export function compareResults(
  mine: ChallengeResult,
  theirs: ChallengeResult,
  names: Readonly<Record<string, string>> = {},
): CompareOut | null {
  if (mine.gate !== theirs.gate) return null

  switch (mine.gate) {
    case 1: {
      const t = theirs as Extract<ChallengeResult, { gate: 1 }>
      const ids = sets(mine.picks, t.picks)
      const lines: CompareLine[] = []
      if (ids.shared.length === 0) lines.push(k('compare.xi.none'))
      else {
        lines.push(k('compare.xi.shared', { n: String(ids.shared.length) }))
        const disputed = Math.max(ids.onlyMine.length, ids.onlyTheirs.length)
        if (disputed > 0) lines.push(k('compare.xi.disputed', { n: String(disputed) }))
      }
      if (ids.shared.length === 1) {
        const name = names[ids.shared[0] as string]
        lines.push(name ? k('compare.xi.onlyOne', { name }) : k('compare.xi.onlyOneUnnamed'))
      }
      if (mine.captain && t.captain) lines.push(k(mine.captain === t.captain ? 'compare.xi.sameCaptain' : 'compare.xi.otherCaptain'))
      if (mine.twelfth && t.twelfth && mine.twelfth === t.twelfth) lines.push(k('compare.xi.sameTwelfth'))
      return { gate: 1, lines, rows: [], ids }
    }

    case 2: {
      const t = theirs as Extract<ChallengeResult, { gate: 2 }>
      if (t.marks.length !== mine.marks.length) return null
      const p = marksPattern(mine.marks, t.marks)
      const lines: CompareLine[] = []
      if (p.bothWrong.length === 1) lines.push(k('compare.trivia.sameMiss.one', { n: String((p.bothWrong[0] as number) + 1) }))
      else if (p.bothWrong.length > 1) lines.push(k('compare.trivia.sameMiss.many', { n: String(p.bothWrong.length) }))
      else lines.push(k('compare.trivia.noSameMiss'))
      if (p.bothRight > 0) lines.push(k('compare.trivia.bothKnew', { n: String(p.bothRight) }))
      if (p.onlyMine > 0) lines.push(k('compare.trivia.onlyYou', { n: String(p.onlyMine) }))
      if (p.onlyTheirs > 0) lines.push(k('compare.trivia.onlyThem', { n: String(p.onlyTheirs) }))
      return { gate: 2, lines, rows: rowsOf(figureRow(k('compare.row.right'), mine, t)) }
    }

    case 3: {
      const t = theirs as Extract<ChallengeResult, { gate: 3 }>
      if (t.found.length !== mine.found.length) return null
      const p = marksPattern(mine.found, t.found)
      const total = String(mine.found.length)
      const lines: CompareLine[] = [
        p.bothRight > 0 ? k('compare.lineup.together', { n: String(p.bothRight), total }) : k('compare.lineup.noneTogether'),
      ]
      if (p.onlyMine > 0) lines.push(k('compare.lineup.onlyYou', { n: String(p.onlyMine) }))
      if (p.onlyTheirs > 0) lines.push(k('compare.lineup.onlyThem', { n: String(p.onlyTheirs) }))
      if (p.bothWrong.length > 0) lines.push(k('compare.lineup.bothMissed', { n: String(p.bothWrong.length) }))
      return { gate: 3, lines, rows: rowsOf(figureRow(k('compare.row.found'), mine, t)) }
    }

    case 6: {
      const t = theirs as Extract<ChallengeResult, { gate: 6 }>
      // the same board has the same pairs; a different set of pairs is a different board
      if ([...mine.order].sort().join() !== [...t.order].sort().join()) return null
      const lines: CompareLine[] = []
      if (mine.order[0] && mine.order[0] === t.order[0]) lines.push(k('compare.memory.sameFirst'))
      else lines.push(k('compare.memory.otherFirst'))
      const last = mine.order.length - 1
      if (last > 0 && mine.order[last] === t.order[last]) lines.push(k('compare.memory.sameLast'))
      const perfect = sets(mine.perfect, t.perfect).shared.length
      if (perfect > 0) lines.push(k('compare.memory.bothPerfect', { n: String(perfect) }))
      return {
        gate: 6,
        lines,
        rows: [
          { label: k('compare.row.moves'), mine: String(mine.moves), theirs: String(t.moves) },
          { label: k('compare.row.misses'), mine: String(mine.misses), theirs: String(t.misses) },
        ],
      }
    }

    case 8: {
      const t = theirs as Extract<ChallengeResult, { gate: 8 }>
      if (t.accuracy.length !== mine.accuracy.length) return null
      const lines: CompareLine[] = [k('compare.goal.overlay')]
      const starts = mine.routes.map((route, i) => route[0] !== undefined && route[0] === t.routes[i]?.[0])
      if (starts.every(Boolean)) lines.push(k('compare.goal.sameStart'))
      else if (starts.some(Boolean)) lines.push(k('compare.goal.someStart', { n: String(starts.filter(Boolean).length) }))
      else lines.push(k('compare.goal.otherStart'))
      const identical = mine.routes.filter((route, i) => route.length > 0 && route.join() === t.routes[i]?.join()).length
      if (identical > 0) lines.push(k('compare.goal.sameRoute', { n: String(identical) }))
      const rows: CompareRow[] = mine.accuracy.map((a, i) => ({
        label: k('compare.row.goal', { n: String(i + 1) }),
        mine: `${a}%`,
        theirs: `${t.accuracy[i] as number}%`,
      }))
      return { gate: 8, lines, rows, overlay: { mine: mine.routes, theirs: t.routes } }
    }

    case 9: {
      const t = theirs as Extract<ChallengeResult, { gate: 9 }>
      const ids = sets(mine.picks, t.picks)
      const lines: CompareLine[] = [
        ids.shared.length === 0
          ? k('compare.rumble.none')
          : ids.shared.length === mine.picks.length && ids.onlyTheirs.length === 0
            ? k('compare.rumble.all')
            : k('compare.rumble.shared', { n: String(ids.shared.length), total: String(mine.picks.length) }),
      ]
      return { gate: 9, lines, rows: [], ids }
    }

    case 10: {
      const t = theirs as Extract<ChallengeResult, { gate: 10 }>
      // §19: the two counts side by side, and no headline above them
      const lines: CompareLine[] = [k('compare.bc.hints', { mine: String(mine.hints), theirs: String(t.hints) })]
      const a = mine.status === 'solved'
      const b = t.status === 'solved'
      if (a && b && mine.hints === t.hints) lines.push(k('compare.bc.sameClue'))
      if (a && b) lines.push(k('compare.bc.bothCaught'))
      else if (a) lines.push(k('compare.bc.onlyYou'))
      else if (b) lines.push(k('compare.bc.onlyThem'))
      else lines.push(k('compare.bc.neither'))
      return {
        gate: 10,
        lines,
        rows: [
          { label: k('compare.row.hints'), mine: String(mine.hints), theirs: String(t.hints) },
          { label: k('compare.row.wrong'), mine: String(mine.wrong), theirs: String(t.wrong) },
        ],
      }
    }

    case 13: {
      const t = theirs as Extract<ChallengeResult, { gate: 13 }>
      if (mine.variant === 'order' && t.variant === 'order') {
        if (t.marks.length !== mine.marks.length) return null
        const p = marksPattern(mine.marks, t.marks)
        const lines: CompareLine[] = []
        if (p.bothWrong.length === 1) lines.push(k('compare.timeline.sameMiss.one'))
        else if (p.bothWrong.length > 1) lines.push(k('compare.timeline.sameMiss.many', { n: String(p.bothWrong.length) }))
        if (p.bothRight > 0) lines.push(k('compare.timeline.bothRight', { n: String(p.bothRight) }))
        if (lines.length === 0) lines.push(k('compare.timeline.apart'))
        return { gate: 13, lines, rows: rowsOf(figureRow(k('compare.row.placed'), mine, t)) }
      }
      if (mine.variant === 'thread' && t.variant === 'thread') {
        if (t.steps.length !== mine.steps.length) return null
        const mineSteps = figureOf(mine)?.value ?? 0
        const theirSteps = figureOf(t)?.value ?? 0
        const lines: CompareLine[] = [k('compare.thread.steps', { mine: String(mineSteps), theirs: String(theirSteps) })]
        // §22: different valid routes are interesting — never "the best route"
        const bothClosed = mine.solved.filter((s, i) => s && t.solved[i]).length
        const differentLength = mine.steps.filter((s, i) => mine.solved[i] && t.solved[i] && s !== t.steps[i]).length
        if (differentLength > 0) lines.push(k('compare.thread.different', { n: String(differentLength) }))
        else if (bothClosed > 0) lines.push(k('compare.thread.same'))
        return {
          gate: 13,
          lines,
          rows: [
            { label: k('compare.row.steps'), mine: String(mineSteps), theirs: String(theirSteps) },
            {
              label: k('compare.row.closed'),
              mine: `${mine.solved.filter(Boolean).length}/${mine.solved.length}`,
              theirs: `${t.solved.filter(Boolean).length}/${t.solved.length}`,
            },
          ],
        }
      }
      return null
    }
  }
}
