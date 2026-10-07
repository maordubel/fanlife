import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {isYellowHex} from '@/lib/isYellow'
import {BOARD, buildIso, centreOf, isoKey, screenOf} from '@/lib/life/universal/iso'

const SRC = readFileSync('lib/life/universal/iso.ts', 'utf8')

describe('the isometric city (universal LIFE map)', () => {
  it('draws no yellow — every literal colour is checked against the house hue test', () => {
    for (const hex of new Set(SRC.match(/#[0-9a-f]{6}\b/gi) ?? [])) expect(isYellowHex(hex), hex).toBe(false)
  })
  it('stands every district on the board exactly once per slot and gives each a fog bank and objects', () => {
    const iso = buildIso('#c8452d')
    for (const b of BOARD) {
      const key = b.k + b.bi + b.bj
      expect(iso.html, key).toContain(`class="fog" data-k="${key}"`)
      expect(iso.html, key).toContain(`class="obj" data-k="${key}"`)
    }
    expect(new Set(BOARD.map(b => b.bi + ':' + b.bj)).size).toBe(BOARD.length)
  })
  it('is deterministic for a seed, and different for another club colour', () => {
    expect(buildIso('#c8452d', 3).html).toBe(buildIso('#c8452d', 3).html)
    expect(buildIso('#2f6fb3', 3).html).not.toBe(buildIso('#c8452d', 3).html)
  })
  it('keeps the story districts unambiguous and draws roads between their centres', () => {
    const story = ['home', 'street', 'school', 'pitch', 'bus', 'stadium', 'away', 'abroad', 'work'] as const
    for (const k of story) { expect(BOARD.filter(b => b.k === k)).toHaveLength(1); expect(isoKey(k)).toMatch(/^[a-z]+\d\d$/); expect(centreOf(k)).toHaveLength(2); expect(screenOf(k)[0]).toBeGreaterThan(0) }
    expect(buildIso('#c8452d').road('home', 'stadium')).toMatch(/^M[\d.,\s L]+$/)
  })
})
