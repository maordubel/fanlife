import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { archiveShirts } from '@/lib/kit/archive'
import { goalYears } from '@/lib/game/goal'
import { lines, visual } from '@/lib/og/bidi'
import { blindCowHeadline } from '@/lib/og/cards'
import { blindCowCardQuery, goalCardQuery, parseBlindCowCard, parseGoalCard } from '@/lib/og/params'

/**
 * כרטיסי התוצאה (delta 89) — gate 10 and gate 8. The images are drawn by `next/og` in the
 * routes (`app/api/card/*`); this holds the parts that decide WHAT they may say.
 */
const ROOT = join(__dirname, '..')

describe('gate 10 card — how you did, never who he was', () => {
  it('round-trips, and carries no name and no player id', () => {
    const q = blindCowCardQuery({ mode: 'duel', status: 'solved', hints: 3, tenths: 184, weightedTenths: 534, duel: 'won', day: null })
    expect(q).toBe('bm=v&bs=s&bh=3&bt=184&bw=534&bd=w')
    expect(parseBlindCowCard(new URLSearchParams(q))).toEqual({ mode: 'duel', status: 'solved', hints: 3, tenths: 184, weightedTenths: 534, duel: 'won', day: null })
    expect(q).not.toMatch(/p_[0-9a-f]{10}|name/)
  })

  it('refuses anything outside the closed words and ranges', () => {
    expect(parseBlindCowCard(new URLSearchParams('bm=x&bs=s&bh=3&bt=10'))).toBeNull()
    expect(parseBlindCowCard(new URLSearchParams('bm=s&bs=s&bh=11&bt=10'))).toBeNull()
    expect(parseBlindCowCard(new URLSearchParams('bm=s&bs=s&bh=3&bt=-1'))).toBeNull()
    // a weighted time only for a solve, a duel outcome only for a duel, a date only for the daily
    expect(parseBlindCowCard(new URLSearchParams('bm=s&bs=g&bh=3&bt=10&bw=99&bd=w&by=2026-09-25'))).toMatchObject({ weightedTenths: null, duel: null, day: null })
  })

  it('the result screen builds the card from the numbers only', () => {
    const panel = readFileSync(join(ROOT, 'components/blind-cow/ResultPanel.tsx'), 'utf8')
    const block = panel.slice(panel.indexOf('const card: BlindCowCard = {'), panel.indexOf('const query = blindCowCardQuery(card)'))
    expect(block).not.toContain('nameHe')
    expect(block).not.toContain('playerId')
    expect(panel).toContain('<ShareCardChips')
    expect(panel).toContain('<CrossLinks links={r.links}')
  })

  it('headlines follow the outcome', () => {
    const base = { mode: 'solo' as const, hints: 2, tenths: 50, weightedTenths: 200, duel: null, day: null }
    expect(blindCowHeadline({ ...base, status: 'solved' })).toBe('זיהיתי אותו')
    expect(blindCowHeadline({ ...base, mode: 'duel', status: 'solved', duel: 'won' })).toBe('ניצחתי בדו-קרב')
    expect(blindCowHeadline({ ...base, status: 'timeout', weightedTenths: null })).toBe('נגמר לי הזמן')
  })
})

describe('gate 8 card — the goal, the accuracy, his real shirt', () => {
  it('round-trips and bounds', () => {
    const q = goalCardQuery({ goalId: 'benfica-2010-zahavi-24', avg: 72, best: 88, score: 2140 })
    expect(parseGoalCard(new URLSearchParams(q))).toEqual({ goalId: 'benfica-2010-zahavi-24', avg: 72, best: 88, score: 2140 })
    expect(parseGoalCard(new URLSearchParams('cg=../../etc&ca=1&cb=1&cs=1'))).toBeNull()
    expect(parseGoalCard(new URLSearchParams('cg=x&ca=101&cb=1&cs=1'))).toBeNull()
  })

  it('every kit photograph has its PNG twin for the renderer (scripts/og/kit-thumbs.py)', () => {
    const twins = new Set(readdirSync(join(ROOT, 'public/kits/og')))
    for (const shirt of archiveShirts()) {
      const name = shirt.src.replace('/kits/', '').replace(/\.webp$/, '.png')
      expect(twins.has(name), name).toBe(true)
    }
    expect(twins.size).toBe(archiveShirts().length)
  })

  it('the card route only draws a goal the gate deals', async () => {
    const { goalArt } = await import('@/lib/og/goal-art')
    expect(await goalArt({ goalId: 'not-a-goal', avg: 1, best: 1, score: 1 }, 'http://127.0.0.1:1')).toBeNull()
    expect(goalYears().length).toBeGreaterThan(10)
  })
})

describe('Hebrew in the image', () => {
  it('reverses Hebrew runs and keeps numbers and Latin readable', () => {
    expect(visual('שער 10')).toBe('10 רעש')
    expect(visual('ניצחתי בדו-קרב')).toBe('ברק-ודב יתחצינ')
    expect(visual('18.4″ שניות')).toBe('תוינש ″18.4')
    expect(visual('THE WORKER')).toBe('THE WORKER')
    expect(visual('(מחזור 24)')).toBe('(24 רוזחמ)')
  })
  it('breaks a title at spaces before the renderer can', () => {
    expect(lines('הנגיחה של זהבי מול בנפיקה', 17)).toEqual(['הנגיחה של זהבי', 'מול בנפיקה'])
    expect(lines('א ב ג ד ה ו ז', 1, 3)).toEqual(['א', 'ב', 'ג…'])
  })
  it('the house fonts are shipped as TrueType beside the renderer', () => {
    for (const f of ['frank-ruhl-libre-hebrew-900', 'heebo-hebrew-800', 'karantina-hebrew-700', 'archivo-latin-800']) {
      expect(existsSync(join(ROOT, `lib/og/fonts/${f}.ttf`)), f).toBe(true)
    }
  })
})
