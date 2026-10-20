import { describe, expect, it } from 'vitest'

import { buildEdition, clubDay, ROUND_POINTS } from '@/lib/terrace/edition'
import { finished, newLedger, openRound, step, total } from '@/lib/terrace/ledger'
import type { ClubData } from '@/lib/clubs/contract'

const fact = (id: string, value: unknown) => ({ id, value, sources: ['s'], confidence: 2, status: 'approved', researchedAt: null, approvedAt: null, approvedBy: null, notes: '' })
const data = {
  version: 'v1',
  identity: { id: 'aek-athens', name: 'AEK', city: 'Athens', country: 'Greece', sport: 'football' },
  archive: [1, 2, 3, 4].map((i) => fact(`a${i}`, { id: `a${i}`, name: `Moment ${i}`, on: `19${50 + i * 5}-01-01`, precision: 'year', year: 1950 + i * 5, hint: '', sport: 'football', sensitive: false })),
  timeline: [1, 2, 3, 4].map((i) => fact(`t${i}`, { id: `t${i}`, title: `Card ${i}`, hint: '', on: `19${60 + i * 7}-03-0${i}` })),
  trivia: { pools: {}, questions: [{ id: 'q1', type: 'mcq', prompt: 'Who?', answer: 'A', distractors: ['A', 'B', 'C', 'D'], source: { title: 'S', url: null, confidence: 2 } }] },
} as unknown as ClubData

describe('Daily Terrace', () => {
  it('is deterministic per club and day, and differs across days', () => {
    expect(buildEdition(data, '2026-10-20')).toEqual(buildEdition(data, '2026-10-20'))
    expect(buildEdition(data, '2026-10-20')!.edition.id).not.toBe(buildEdition(data, '2026-10-21')!.edition.id)
  })
  it('holds four distinct options per round and a valid answer', () => {
    const e = buildEdition(data, '2026-10-20')!
    e.edition.rounds.forEach((r, i) => {
      expect(new Set(r.options).size).toBe(r.kind === 'rewind' ? 3 : 4)
      expect(e.answers[i]).toBeGreaterThanOrEqual(0)
      expect(e.answers[i]).toBeLessThan(r.options.length)
    })
    expect(JSON.stringify(e.edition)).not.toContain('answers')
  })
  it('refuses a padded round', () => {
    expect(buildEdition({ ...data, timeline: data.timeline.slice(0, 2) } as ClubData, '2026-10-20')).toBeNull()
    expect(buildEdition({ ...data, archive: [], timeline: data.timeline.slice(0, 2) } as ClubData, '2026-10-20')).toBeNull()
    // a club with no dated archive moments remembers from its timeline
    expect(buildEdition({ ...data, archive: [] } as ClubData, '2026-10-20')).not.toBeNull()
  })
  it('scores 100/70/40/0 and plays rounds in order, once', () => {
    const e = buildEdition(data, '2026-10-20')!
    let l = newLedger('aek-athens', '2026-10-20', e.edition.id)
    const wrong = (i: number) => (e.answers[i]! + 1) % e.edition.rounds[i]!.options.length
    // round 0: 2nd try right -> 70
    let s = step(l, 0, wrong(0), e.answers, 4)
    expect(s.ok && s.correct).toBe(false)
    if (s.ok) l = s.ledger
    s = step(l, 0, e.answers[0]!, e.answers, 4)
    expect(s.ok && s.points).toBe(70)
    if (s.ok) l = s.ledger
    expect(step(l, 0, 0, e.answers, 4).ok).toBe(false)
    expect(step(l, 2, 0, e.answers, 4).ok).toBe(false)
    expect(openRound(l)).toBe(1)
    // round 1: right first -> 100
    s = step(l, 1, e.answers[1]!, e.answers, 3)
    if (s.ok) l = s.ledger
    // round 2: three wrong -> 0
    const bad = [0, 1, 2, 3].filter((o) => o !== e.answers[2])
    for (const o of bad) { const t = step(l, 2, o, e.answers, 4); if (t.ok) l = t.ledger }
    expect(finished(l)).toBe(true)
    expect(total(l)).toBe(170)
    expect(ROUND_POINTS).toEqual([100, 70, 40, 0])
  })
  it("reads a club's own calendar day", () => {
    expect(clubDay('Greece', new Date('2026-10-20T22:30:00Z'))).toBe('2026-10-21')
    expect(clubDay('Unknown', new Date('2026-10-20T22:30:00Z'))).toBe('2026-10-20')
  })
})

import { readFileSync } from 'node:fs'
describe('Daily Terrace — the answers stay on the server', () => {
  it('the client component never imports the edition builder or the ledger', () => {
    const c = readFileSync('components/clubs/terrace/DailyTerrace.tsx', 'utf8')
    expect(c).not.toMatch(/terrace\/(edition|ledger|server)/)
    expect(c).toContain("from '@/app/clubs/[slug]/daily/actions'")
  })
  it('the public edition type carries no answers', () => {
    expect(readFileSync('lib/terrace/server.ts', 'utf8')).toMatch(/reveal: \(number \| null\)\[\]/)
  })
})
