import {describe,it,expect} from 'vitest'
import {clubTimeZone,dayKey,encodeChallenge,emptyHistory,isDayKey,ledger,newSeed,parseChallenge,pickIndex,previousDay,recordResult,shareText,standing,streak,validateHistory,verdictOf,SEED_MAX} from '@/lib/clubs/mystery-model'
import {weightedTimeMs} from '@/lib/game/blind-cow/scoring'

describe('gate 10 · the club day', () => {
 it('reads the day in the club zone, not the server zone', () => {
  const at = Date.parse('2026-10-08T22:30:00Z')
  expect(dayKey(at, 'UTC')).toBe('2026-10-08')
  expect(dayKey(at, clubTimeZone('Israel'))).toBe('2026-10-09')
  expect(dayKey(at, clubTimeZone('Greece'))).toBe('2026-10-09')
  expect(clubTimeZone('Atlantis')).toBe('UTC')
  expect(dayKey(at, 'Not/AZone')).toBe('2026-10-08')
 })
 it('walks back across month and year ends', () => {
  expect(previousDay('2026-03-01')).toBe('2026-02-28')
  expect(previousDay('2027-01-01')).toBe('2026-12-31')
  expect(isDayKey('2026-10-08')).toBe(true)
  expect(isDayKey('2026-1-8')).toBe(false)
  expect(isDayKey(20261008)).toBe(false)
 })
})

describe('gate 10 · a tag deals a mystery', () => {
 it('is stable for the same club, version and tag, and spreads across the pool', () => {
  expect(pickIndex('c', 'v1', '2026-10-08', 50)).toBe(pickIndex('c', 'v1', '2026-10-08', 50))
  const seen = new Set(Array.from({length: 60}, (_, i) => pickIndex('c', 'v1', `2026-10-${String(i).padStart(2, '0')}`, 40)))
  expect(seen.size).toBeGreaterThan(15)
  for (const i of seen) { expect(i).toBeGreaterThanOrEqual(0); expect(i).toBeLessThan(40) }
  expect(pickIndex('c', 'v1', 'x', 0)).toBe(-1)
 })
 it('differs between clubs and content versions', () => {
  const a = Array.from({length: 30}, (_, i) => pickIndex('a', 'v1', String(i), 1000))
  expect(a).not.toEqual(Array.from({length: 30}, (_, i) => pickIndex('b', 'v1', String(i), 1000)))
  expect(a).not.toEqual(Array.from({length: 30}, (_, i) => pickIndex('a', 'v2', String(i), 1000)))
 })
})

describe('gate 10 · the challenge link', () => {
 it('round-trips a bare seed, a solved run and a gave-up run', () => {
  expect(parseChallenge(encodeChallenge({seed: 482913, weightedMs: null, clues: null, solved: false}))).toEqual({seed: 482913, weightedMs: null, clues: null, solved: false})
  expect(parseChallenge(encodeChallenge({seed: 7, weightedMs: 41200, clues: 3, solved: true}))).toEqual({seed: 7, weightedMs: 41200, clues: 3, solved: true})
  expect(encodeChallenge({seed: 7, weightedMs: 41200, clues: 5, solved: false})).toBe('7.x.5')
  expect(parseChallenge('7.x.5')).toEqual({seed: 7, weightedMs: null, clues: 5, solved: false})
 })
 it('rejects anything that is not exactly the shape', () => {
  for (const bad of [undefined, null, 5, '', '0', '1000000', '-4', '1.2', '1.2.3', '1.400.3', '7.41200.0', '7.41200.99', '7.9999999999.3', 'abc', '7.x', '7..3', '<script>', '1'.repeat(41), ['7']]) expect(parseChallenge(bad)).toBeNull()
 })
 it('mints seeds inside the range', () => {
  expect(newSeed(0)).toBe(1)
  expect(newSeed(0.999999999)).toBeLessThanOrEqual(SEED_MAX)
 })
 it('judges you against a friend: solver beats non-solver, faster beats slower', () => {
  const t = (w: number | null, solved = true) => ({seed: 1, weightedMs: w, clues: 2, solved})
  expect(standing({solved: true, weightedMs: 30000}, t(40000))).toEqual({kind: 'win', marginMs: 10000})
  expect(standing({solved: true, weightedMs: 50000}, t(40000))).toEqual({kind: 'lose', marginMs: 10000})
  expect(standing({solved: true, weightedMs: 40000}, t(40000)).kind).toBe('tie')
  expect(standing({solved: true, weightedMs: 99000}, t(null, false)).kind).toBe('win')
  expect(standing({solved: false, weightedMs: 0}, t(40000)).kind).toBe('lose')
  expect(standing({solved: false, weightedMs: 0}, t(null, false)).kind).toBe('open')
 })
})

describe('gate 10 · the ledger shows the sum the server sealed', () => {
 it('adds up to the server total and refuses when it does not', () => {
  const total = weightedTimeMs({rawElapsedMs: 20000, hintsUsed: 3, wrongGuesses: 2})
  const l = ledger(20000, 3, 2, total)
  expect(l).not.toBeNull()
  expect(l!.rawMs + l!.clueMs + l!.wrongMs).toBe(total)
  expect(l!.extraClues).toBe(2)
  expect(ledger(20000, 3, 2, total + 1)).toBeNull()
  expect(ledger(20000, 1, 0, 20000)!.clueMs).toBe(0)
 })
 it('words the verdict from clues used', () => {
  expect(verdictOf(false, 4, 8)).toBe('missed')
  expect(verdictOf(true, 1, 8)).toBe('first')
  expect(verdictOf(true, 2, 8)).toBe('sharp')
  expect(verdictOf(true, 5, 8)).toBe('steady')
  expect(verdictOf(true, 8, 8)).toBe('long')
 })
})

describe('gate 10 · the share text never names the man', () => {
 const strip = ['G', 'Y', '.']
 it('prints clues, seconds, a bar and the link', () => {
  const t = shareText({club: 'Hapoel Tel Aviv', title: 'Blind Cow', mode: 'daily', day: '2026-10-08', solved: true, clues: 3, total: 6, weightedMs: 41200, url: 'https://x/y', strip})
  expect(t.split('\n')[0]).toContain('2026-10-08')
  expect(t).toContain('3/6')
  expect(t).toContain('YYG...')
  expect(t.endsWith('https://x/y')).toBe(true)
 })
 it('marks a miss without a score', () => {
  const t = shareText({club: 'C', title: 'T', mode: 'solo', solved: false, clues: 6, total: 6, weightedMs: 99000, url: 'u', strip})
  expect(t).toContain('— /6')
  expect(t).not.toContain('99')
 })
})

describe('gate 10 · the device history is untrusted', () => {
 it('falls back to empty on junk and drops malformed days', () => {
  expect(validateHistory(null)).toEqual(emptyHistory())
  expect(validateHistory('x')).toEqual(emptyHistory())
  const h = validateHistory({v: 1, played: 3, solved: 99, best: {weightedMs: -4, clues: 2}, days: {'2026-10-08': {solved: true, clues: 2, wrong: 0, weightedMs: 9000}, 'nope': {solved: true, clues: 1, wrong: 0, weightedMs: 1}, '2026-10-07': {solved: 'yes', clues: 1, wrong: 0, weightedMs: 1}}})
  expect(h.solved).toBe(3)
  expect(h.best).toBeNull()
  expect(Object.keys(h.days)).toEqual(['2026-10-08'])
 })
 it('records a result, keeps the best time and the first run of a day', () => {
  let h = recordResult(emptyHistory(), {solved: true, clues: 3, wrong: 1, weightedMs: 50000, daily: '2026-10-08'})
  h = recordResult(h, {solved: true, clues: 2, wrong: 0, weightedMs: 30000})
  h = recordResult(h, {solved: false, clues: 6, wrong: 2, weightedMs: 90000, daily: '2026-10-08'})
  expect(h.played).toBe(3); expect(h.solved).toBe(2)
  expect(h.best).toEqual({weightedMs: 30000, clues: 2})
  expect(h.days['2026-10-08']).toMatchObject({solved: true, weightedMs: 50000})
 })
 it('counts a streak of solved dailies, alive until the day is over', () => {
  const day = (solved: boolean) => ({solved, clues: 2, wrong: 0, weightedMs: 1000})
  const h = {...emptyHistory(), days: {'2026-10-06': day(true), '2026-10-07': day(true)}}
  expect(streak(h, '2026-10-08')).toBe(2)
  expect(streak({...h, days: {...h.days, '2026-10-08': day(true)}}, '2026-10-08')).toBe(3)
  expect(streak({...h, days: {...h.days, '2026-10-07': day(false)}}, '2026-10-08')).toBe(0)
  expect(streak(emptyHistory(), '2026-10-08')).toBe(0)
 })
})
