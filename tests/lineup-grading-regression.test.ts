import { describe, expect, it } from 'vitest'

import { dealChallenge, gradeLineup, playableLineups } from '@/lib/game/lineup'
import { XI_SIZE, lineOf, placeOn, takeOff, type Line, type Placement } from '@/lib/game/lineup-sheet'
import { submitLineup } from '@/app/lineup/actions'

/**
 * שער 3 — grading truth, fixtures built from a real dealt round (29.9.2026).
 *
 * The bug this file exists for: `starters` counts a starter placed in ANY band, and the
 * screen called eleven of them `perfect` and printed "11/11" while most sat in the wrong
 * band. A round is `seed + cursor`; a sheet is right only by band.
 */

type Fixture = {
  seed: number
  cursor: number
  matchId: string
  xi: Array<{ id: string; line: Line }>
  bench: string[]
}

function fixture(): Fixture {
  for (let seed = 1; seed < 400; seed += 1) {
    const deal = dealChallenge(seed, 0)
    if (!deal) continue
    const record = playableLineups().find((r) => r.matchRef === deal.matchId)
    if (!record?.xiIds) continue
    const xi = Object.entries(record.xiIds).map(([slot, id]) => ({ id, line: lineOf(slot) as Line }))
    const inXi = new Set(xi.map((m) => m.id))
    const bench = (record.decoys ?? []).map((d) => d.id).filter((id) => !inXi.has(id))
    if (bench.length >= 2 && xi.some((m) => m.line === 'D') && xi.some((m) => m.line === 'F')) {
      return { seed, cursor: 0, matchId: deal.matchId, xi, bench }
    }
  }
  throw new Error('no playable fixture')
}

const F = fixture()
const perfect = (): Placement[] => {
  const seen: Record<string, number> = {}
  return F.xi.map(({ id, line }) => ({ playerId: id, line, order: (seen[line] = (seen[line] ?? -1) + 1) }))
}
const grade = (board: unknown) => gradeLineup(F.seed, board as Placement[], F.cursor)!

describe('שער 3 — grading regression', () => {
  it('a perfect sheet is eleven correct and perfect', () => {
    const v = grade(perfect())
    expect(v.counts).toEqual({ correct: 11, wrongBand: 0, wrongPlayer: 0, missed: 0 })
    expect(v.perfect).toBe(true)
  })

  it('one man in the wrong band is ten correct, one wrongBand, NOT perfect', () => {
    const d = F.xi.find((m) => m.line === 'D')!
    const v = grade(placeOn(perfect(), d.id, 'F'))
    expect(v.counts).toEqual({ correct: 10, wrongBand: 1, wrongPlayer: 0, missed: 0 })
    expect(v.perfect).toBe(false)
    expect(v.starters).toBe(11)
  })

  it('eleven starters, every one in a wrong band, is found-anywhere but never perfect', () => {
    const rotated = perfect().map((row) => ({ ...row, line: (row.line === 'GK' ? 'D' : 'GK') as Line }))
    const v = grade(rotated)
    expect(v.starters).toBe(11)
    expect(v.perfect).toBe(false)
    expect(v.counts.correct + v.counts.wrongBand).toBe(11)
    expect(v.counts.correct).toBeLessThan(11)
  })

  it('a starter left in the locker room is missed, and named only in the verdict', () => {
    const d = F.xi.find((m) => m.line === 'D')!
    const v = grade(takeOff(perfect(), d.id))
    expect(v.counts).toMatchObject({ correct: 10, missed: 1, wrongPlayer: 0 })
    expect(v.missing.map((m) => m.playerId)).toEqual([d.id])
    expect(v.perfect).toBe(false)
  })

  it('a bench man put in a starter\'s place is wrongPlayer, and the starter is missed', () => {
    const d = F.xi.find((m) => m.line === 'D')!
    const board = placeOn(takeOff(perfect(), d.id), F.bench[0] as string, 'D')
    const v = grade(board)
    expect(v.counts).toEqual({ correct: 10, wrongBand: 0, wrongPlayer: 1, missed: 1 })
    expect(v.rows.find((r) => r.playerId === F.bench[0])?.status).toBe('not_in_xi')
    expect(v.perfect).toBe(false)
  })

  it('the right player in the wrong location is wrongBand with the true band revealed after grading', () => {
    const f = F.xi.find((m) => m.line === 'F')!
    const v = grade(placeOn(perfect(), f.id, 'M'))
    const row = v.rows.find((r) => r.playerId === f.id)!
    expect(row.status).toBe('wrong_line')
    expect(row.belongsToLine).toBe('F')
  })

  it('duplicate ids count once, the first placement wins', () => {
    const d = F.xi.find((m) => m.line === 'D')!
    const board = [{ playerId: d.id, line: 'D' as Line, order: 0 }, { playerId: d.id, line: 'F' as Line, order: 1 }]
    const v = grade(board)
    expect(v.rows).toHaveLength(1)
    expect(v.rows[0]?.status).toBe('exact')
  })

  it('unknown ids, invalid bands and malformed orders never grade', () => {
    const d = F.xi.find((m) => m.line === 'D')!
    const v = grade([
      { playerId: 'p_ffffffffff', line: 'D', order: 0 },
      { playerId: d.id, line: 'X', order: 0 },
      { playerId: 7, line: 'D', order: 0 },
      null,
      { playerId: d.id, line: 'D', order: Number.NaN },
    ])
    expect(v.rows).toHaveLength(1)
    expect(v.rows[0]).toMatchObject({ playerId: d.id, status: 'exact' })
  })

  it('a non-array board and an oversized board are handled, never thrown', () => {
    expect(grade(undefined).counts.missed).toBe(XI_SIZE)
    expect(grade('nope').counts.missed).toBe(XI_SIZE)
    const flood = [...perfect(), ...F.bench.map((id, i) => ({ playerId: id, line: 'M', order: 20 + i }))]
    expect(grade(flood).rows.length).toBeLessThanOrEqual(XI_SIZE)
  })

  it('the same seed and cursor always grade the same; another cursor deals another round', () => {
    expect(grade(perfect())).toEqual(grade(perfect()))
    expect(gradeLineup(F.seed, perfect(), F.cursor + 1)?.perfect).not.toBe(true)
  })

  it('the server action refuses a non-integer round and grades an integer one', async () => {
    expect(await submitLineup(1.5, perfect(), 0)).toBeNull()
    expect(await submitLineup(F.seed, perfect(), Number.NaN)).toBeNull()
    expect((await submitLineup(F.seed, perfect(), F.cursor))?.perfect).toBe(true)
  })

  it('the deal never carries the answer', () => {
    const deal = dealChallenge(F.seed, F.cursor)!
    expect(JSON.stringify(deal)).not.toMatch(/xiIds|"line"|belongsToLine/)
  })
})
