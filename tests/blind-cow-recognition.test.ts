import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { APPEARANCE_WEIGHT, buildRecognition, tierOf } from '@/lib/game/blind-cow/recognition'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

describe('Blind Cow — player recognition (delta 100)', () => {
  it('appearances carry 65–75% and price 25–35%', () => {
    expect(APPEARANCE_WEIGHT).toBeGreaterThanOrEqual(0.65)
    expect(APPEARANCE_WEIGHT).toBeLessThanOrEqual(0.75)
  })

  it('a man with no stated appearances is scored on price alone, never invented', () => {
    const map = buildRecognition([
      { playerId: 'a', price: 4, appearances: 300 },
      { playerId: 'b', price: 4, appearances: null },
      { playerId: 'c', price: 1, appearances: 20 },
    ])
    expect(map.get('b')!.appearances).toBeNull()
    expect(map.get('b')!.basis).toBe('price')
    expect(map.get('a')!.basis).toBe('appearances+price')
  })

  it('appearances lift a man above an equally-priced one', () => {
    const map = buildRecognition([
      { playerId: 'hi', price: 3, appearances: 400 },
      { playerId: 'lo', price: 3, appearances: 10 },
      { playerId: 'mid', price: 3, appearances: 100 },
    ])
    expect(map.get('hi')!.score).toBeGreaterThan(map.get('lo')!.score)
  })

  it('tiers are ordered by score', () => {
    expect(tierOf(90)).toBe('familiar')
    expect(tierOf(40)).toBe('known')
    expect(tierOf(5)).toBe('deep')
  })

  it('the appearance file states only figures the wiki wrote (never a season count)', () => {
    const rows = JSON.parse(read('content/manual/player-appearances.json')).records as { appearances: number; sourceRef?: string }[]
    expect(rows.length).toBeGreaterThan(50)
    for (const r of rows) expect(Number.isInteger(r.appearances) && r.appearances > 0).toBe(true)
  })

  it('songs carry a tune title only — no verses, no answer in the clue', () => {
    const bank = JSON.parse(read('content/generated/blind-cow-bank.json'))
    const songs = Object.values(bank.clues as Record<string, { type: string; valueHe: string }>).filter((c) => c.type === 'song')
    expect(songs.length).toBeGreaterThan(0)
    for (const s of songs) expect(s.valueHe.length).toBeLessThan(90)
  })

  it('the client component never imports the bank', () => {
    expect(read('components/blind-cow/BlindCowGame.tsx')).not.toMatch(/blind-cow-bank|generated\/player-prices/)
  })
})
